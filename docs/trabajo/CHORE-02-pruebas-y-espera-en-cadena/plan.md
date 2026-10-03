> **Nota de transcripción (orquestador, 2026-10-02).** El arquitecto escribió este plan en modo plan de Claude Code, que solo le permitió escribir en `C:/Users/Carlos/.claude/plans/deep-knitting-sun-agent-ae534d5c8824a9089.md`. El orquestador lo copió aquí sin cambiar contenido (regla de respaldo de `AGENTS.md`, "Transcripción con cotejo"): el cuerpo que sigue a esta nota es byte a byte el archivo de origen (finales de línea LF). SHA-256 del origen y de este archivo en `aprobacion.md`.

# Plan — CHORE-02 · pruebas y espera en cadena
Estado: LISTO
Carril: sensible
Requisitos: sin `RF` propio (encargo de robustez). Reglas que cumple o refuerza: `AGENTS.md` reglas 1, 2 y 4, y "Pruebas"; ESSENTIALS "Autorización", "Reglas de datos" y "Operación > Errores de API". Pendientes de `docs/ESTADO.md` §3 con destino CHORE-02 o "el primer `chore` de pruebas".

Rama: `feat/chore-02`, creada desde `main` = `ee21252` (fusión del PR #16). Base de "No se toca": `ee21252`. Una sola subentrega y un solo commit.

Enmiendas: **Enmienda 1 (2026-10-02)**, respuesta a la revisión del plan del manager (M-01 a M-06 y detalles menores); al final del plan. Las secciones que cambia llevan la marca "Enmienda 1". **Enmienda 2 (2026-10-02)**, respuesta a M-07 de la revisión de la Enmienda 1; también al final. **Enmienda 3 (2026-10-02)**, T-01 de la ronda 1 del tester, O-1 a O-3 y M-08; también al final. **Enmienda 4 (2026-10-02)**, T-02 a T-05 de la ronda 2 del tester y el arbitraje del manager; también al final.

**Por qué es carril sensible:** toca `middleware/` (la guarda `onRoute`), el comportamiento de todas las transacciones de `adapters/db`, incluidas las de sesiones y contraseñas (`cambiarContrasenaPropia`, `rotarSesion`, `crearSesion`, `usarTokenYCambiarContrasena`), y pruebas `*.ataque` existentes. No hay migración, ni `infra/`, ni dependencias nuevas.

## Preguntas bloqueantes
Ninguna. Las decisiones que pidió el orquestador (código HTTP, `codigo`, mensaje, dónde vive la traducción del `P2028`, quién cambia `cuentas-r1.ataque.test.ts`) se toman en "Diseño" con su motivo.

### Preguntas no bloqueantes (se avanza con la opción recomendada si el humano no dice otra cosa)
- **P-01. ¿Acotar la espera de bloqueo en producción con `lock_timeout`?** El plan traduce el `P2028` a `503`, pero no acota la espera: una petición detrás de un bloqueo largo sigue esperando hasta que lo obtiene, y solo entonces responde `503`.
  - (a) **Recomendada: no acotar en CHORE-02.** En producción ningún flujo retiene la fila de un usuario más de unos milisegundos; las esperas largas solo las provocaban las pruebas. Un `lock_timeout` por conexión cambia el tiempo de todas las consultas y aumenta la intermitencia de las pruebas de retención deliberada (cuyo primer proceso espera mientras se forman los siguientes). Queda como pendiente para DEPLOY, con datos reales de contención en los logs (`warn` "Error controlado del servidor").
  - (b) Acotar a 4 s con `lock_timeout` en la configuración del pool (`new PrismaPg({ connectionString, lock_timeout: 4000 })`) y traducir también `55P03` a `503 SERVICIO_OCUPADO`. Cambia las pruebas de retención (habría que revisarlas una por una) y se agregan dos casos.
- **P-02. ¿Entra M-02 de DESIGN-01b (`testTimeout` del frontend)?** (a) **Recomendada: no.** CHORE-02 es solo del backend; esas pruebas no han fallado (tardan de 2 a 2.6 s contra 5 s) y meterlas obliga a correr y verificar el frontend como paquete afectado. Sigue en `ESTADO.md` §3 con destino "un `chore` del frontend". (b) Sí: `testTimeout: 10000` en `frontend/vitest.config.ts`.
- **P-03. ¿Entran las "Opcionales" de CHORE-01?** (a) **Recomendada: no.** Separar las unitarias del backend en un proyecto de Vitest sin `globalSetup` cambia cómo arranca la suite (proyectos, `provide` por proyecto) y no resuelve nada de lo que hoy falla; la regla de ESLint contra `@testcontainers/*` en `backend/src/**` exige tocar cuatro bloques de `no-restricted-imports` de `eslint.config.mjs` (el último bloque que coincide reemplaza las opciones). (b) Sí, solo la regla de ESLint.

## Autorizaciones que este plan pide por escrito (carril sensible)
Se registran en `aprobacion.md` al aprobar el plan.
- **A-1. Ronda 0 del tester: cambios en `*.ataque` existentes** (el programador nunca los toca). Detalle y criterio en "Ronda 0 del tester": C-1 (`cuentas-r1.ataque.test.ts`, caso de la línea 125), C-2 (`guarda-r2.ataque.test.ts`, caso de la línea 148), C-3 (la consulta de "formada" en `cuentas-r2`, `cuentas-r3` y `cuentas-03a-r1`) y C-4 (solo errores de tipos que revela `tsconfig.test.json`, en los cinco `*.ataque` que midió el manager: `backend/src/config/logger.ataque.test.ts`, `backend/test/invitacion-masiva-03c-r1.ataque.test.ts`, `backend/test/worker-03c-r1.ataque.test.ts`, `backend/test/worker-r1.ataque.test.ts` y `backend/test/worker-r2.ataque.test.ts`; Enmienda 1, M-01). Ninguna aserción cambia salvo la de C-2, que se endurece.
- **A-2. `backend/src/middleware/guarda-de-rutas.ts`**: la guarda cubre toda ruta (M-15) y rechaza parámetros o comodines en los dos primeros segmentos.
- **A-3. `adapters/db/cliente.ts`, `adapters/db/errores.ts`, `core/errores.ts` y `handlers/errores.ts`**: traducción del `P2028` y su registro en el log.
- **A-4. Pruebas normales existentes** que el programador adapta (lista cerrada en "Cambios por capa"):
  - **Con cambios de comportamiento de la prueba:** `ayudas-concurrencia.ts`, `entorno-de-pruebas.ts`, `entorno-de-pruebas.test.ts`, `salud.integracion.test.ts`, `invitacion-masiva.integracion.test.ts`, `enlaces-registro.integracion.test.ts` y `core/errores.test.ts`.
  - **Solo tipos, para que compilen con `tsconfig.test.json`** (Enmienda 1, M-01; regla de "solo tipos" en el paso 3), los 15 archivos de `backend/test/` que midió el manager: `alumnos-autorizacion.integracion.test.ts`, `alumnos.integracion.test.ts`, `archivos-autorizacion.integracion.test.ts`, `archivos.integracion.test.ts`, `bloqueo-usuario.integracion.test.ts`, `cambiar-contrasena.integracion.test.ts`, `clases-autorizacion.integracion.test.ts`, `clases.integracion.test.ts`, `cola.integracion.test.ts`, `movimientos-inscripcion.integracion.test.ts`, `muro-autorizacion.integracion.test.ts`, `muro.integracion.test.ts`, `restablecer.integracion.test.ts`, `worker-consumidor.integracion.test.ts` y `worker-correo-de-cuenta.integracion.test.ts`. Los errores de tipos de `enlaces-registro.integracion` e `invitacion-masiva.integracion` (ya en la lista anterior) se corrigen con la misma regla.
  - **Solo un comentario:** `middleware-orden.integracion.test.ts:36` ("Fuera de /api: la guarda onRoute no aplica" deja de ser cierto con M-15; sus rutas no cambian).
- **A-5. `backend/package.json`** (solo el script `typecheck`) y el archivo nuevo `backend/tsconfig.test.json`. Sin dependencias nuevas.
- **Autorizaciones de las enmiendas posteriores** (A-6 a A-8 ya dadas por el humano; detalle en cada enmienda): A-6 (`ritmo-03c-r1`, tolerancias), A-8 (i) (`adapters/db/enlaces-registro.ts`, M-08). **Pedidas por la Enmienda 4:** A-9 (tester, `cuentas-r1.ataque.test.ts`, presupuesto de C-1), A-10 (programador, PR-B05 en `alumnos.integracion.test.ts`), A-13 (tester, 5 casos de `nombres-guarda-r3.ataque.test.ts`) y A-14 (tester, 2 casos de `guarda-ch-r2.ataque.test.ts`). A-7, A-11 y A-12 no se usan (§E4-0).

## Suposiciones
- **S-1. Forma del `P2028`.** Con Prisma 7 y `@prisma/adapter-pg`, una transacción interactiva que pasa su `timeout` (5 s por defecto) o que no obtiene conexión en su `maxWait` (2 s por defecto) llega como `Prisma.PrismaClientKnownRequestError` con `code === "P2028"`, en la primera llamada después de la expiración o en el `COMMIT` (así lo registró el tester: `usuarios.ts:293`, `sesiones.ts:39`, `cliente.ts:60`). En los dos casos Prisma revierte la transacción: nada se escribe. PR-CH-04c lo comprueba contra la base; si la forma es otra, PA-03.
- **S-2. El `503` no cambia el frontend.** `services/apiClient.ts` (`errorDeRespuesta`, líneas 130-139) conserva el `codigo` y el `mensaje` de cualquier respuesta con el JSON del proyecto, también en `503` (lo fija `apiClient.ataque.test.ts`, "un 503 con el JSON del proyecto conserva su código"). En `/auth/refrescar`, cualquier respuesta que no sea `200` ya limpia el token hoy (`pedirRefresco`, línea 83), con `500` o con `503`: no cambia nada. Mejorarlo es un pendiente (R-3).
- **S-3. Ningún código de producción toma bloqueos de tabla sobre `usuarios`.** Los únicos bloqueos explícitos de `backend/src` son `FOR SHARE`/`FOR NO KEY UPDATE` de `bloqueo-usuario.ts`, `FOR NO KEY UPDATE` sobre `enlaces_registro`, `FOR SHARE` sobre `publicaciones` y el consultivo de la invitación masiva (arbitraje del manager, "Arbitraje de PA-07 — ronda 0 de CLASES-d"). El único `LOCK TABLE` del repositorio está en `cuentas-r1.ataque.test.ts:130`.
- **S-4. PR-B05 no choca con nadie salvo con ese `LOCK TABLE`.** Retiene `RowExclusiveLock` (por los `INSERT`) y `ShareUpdateExclusiveLock` (por `ANALYZE`) sobre `usuarios`. Ninguno choca con lo que toma la aplicación (`AccessShareLock`, `RowShareLock`, `RowExclusiveLock` y bloqueos de fila); solo con `ACCESS EXCLUSIVE`, con otro `ANALYZE`/`VACUUM` (el automático se cancela solo) y con DDL, que ninguna prueba corre.
- **S-5. Las rutas internas de Fastify no disparan `onRoute`.** El manejador de 404 (`setNotFoundHandler`) vive en un enrutador aparte y se registra antes que la guarda (`app.ts:61` contra `app.ts:65`). Si al invertir la guarda (M-15) alguna ruta que no registra nuestro código la hace fallar, PA-04.
- **S-6. El log del `P2028` no expone datos.** El mensaje de Prisma solo dice que la transacción expiró y cuánto tardó. Hoy ya se registra completo como "Error no controlado"; el plan solo cambia el nivel (`warn`) y el texto del mensaje del log.
- **S-7. Cifras de partida** (cierre de CLASES-01, `ESTADO.md` §1): backend 120 archivos / 1300 pruebas; frontend 104 / 1396; 107 `*.ataque`, con su tabla de SHA-256 en `docs/trabajo/CLASES-01-clases-y-muro/reporte-tester.md`, "Tabla de SHA-256 de las 107 `*.ataque` después de C-28" (línea 4989): es la base de V-01.

## Alcance
### Entra
| # | Pendiente (`ESTADO.md` §3 o encargo) | Qué se hace | Quién |
|---|---|---|---|
| 1 | Espera en cadena de `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE` (`cuentas-r1.ataque:130`) | El `LOCK TABLE` pasa a `NOWAIT` con reintento acotado: nunca se forma en la cola de `usuarios` (§D-1). Regla nueva y prueba estática para que no vuelva | Tester (C-1, ronda 0) y programador (PR-CH-01c) |
| 2 | PR-B05 retiene `usuarios` unos 5 s | Sin cambio de código: con el punto 1 sus bloqueos ya no alargan ninguna cola (§D-2). Se comprueba en las corridas de verificación | — |
| 3 | A3 de `bloqueo-usuario.integracion`, intermitente | `conFilaRetenida` da por formada una operación solo si hay un proceso esperando **esa fila** (§D-3). Lo mismo en las tres copias de `*.ataque` que retienen filas de `usuarios` | Programador (`ayudas-concurrencia.ts`) y tester (C-3) |
| 4 | **Prioridad alta, AUTH:** `POST /api/auth/cambiar-contrasena` responde `500` por `P2028` | `503 SERVICIO_OCUPADO`, sin escribir nada (§D-4) | Programador |
| 5 | `P2028` de `invitarMaestrosEnLote`, `rotarSesion` y `crearComentario` | La misma traducción, general, en `enTransaccion` (único `$transaction` de `backend/src`) (§D-4) | Programador |
| 6 | Comodines generales `/api/*` y `/api/:seccion/*`, y M-15 (guarda sobre todas las rutas) | La guarda revisa toda ruta y rechaza parámetros o comodines en los dos primeros segmentos (§D-5) | Programador; tester (C-2) |
| 7 | N-01 y N-03 de CHORE-01 | La guarda de la base de pruebas rechaza cualquier URL con parámetros de consulta; `tsconfig.test.json` dentro de `npm run lint`, con los 41 errores de tipos que destapa en 22 archivos corregidos solo en tipos (§D-6; Enmienda 1, M-01) | Programador (17 pruebas normales de A-4); tester (los 5 `*.ataque` de C-4) |
| 8 | Observaciones (e) y (f) de AUTH-03c | `timeout` explícito en la transacción retenedora; el token de 2100 se borra al terminar el caso (§D-7) | Programador |
| 9 | "Dos pruebas previas a CLASES fallan con el equipo cargado" (la fila de §3 que llevó a la causa raíz) | La paginación de `enlaces-registro.integracion` deja de depender de la lista global, en sus dos páginas (§D-7; Enmienda 1, M-06). `ritmo-03c-r1.ataque` y las esperas de los `worker-*`: ver "No entra" | Programador |
| 10 | PA-07 | Nueva definición, válida desde este encargo (§D-8) | Plan |

### No entra
| Qué | Motivo | Destino |
|---|---|---|
| Acotar la espera con `lock_timeout` | P-01 (a) | DEPLOY, con datos de contención |
| Traducir `40P01` (deadlock) a un error controlado | No se ha visto en ninguna corrida; el único caso conocido (E2-03, `corregirCorreo` cruzado) es un riesgo aceptado de ADMIN | ADMIN (fila existente de §3) |
| Que el frontend conserve la sesión ante un `503` de `/auth/refrescar` | CHORE-02 no toca el frontend; hoy pasa lo mismo con `500` (S-2) | Pendiente nuevo en §3: el próximo encargo que toque `services/apiClient.ts` |
| Encabezado `Retry-After` en el `503` | El mensaje ya dice qué hacer; agregarlo exige cambiar el envoltorio para un solo caso | — |
| `ritmo-03c-r1.ataque` (mide milisegundos con reloj real) y las esperas `esperarHasta` de `worker-consumidor` y `worker-r2` | El manager atribuyó sus fallos a la espera en cadena y a la carga; con el equipo libre pasan. Son del tester o dependen de la cadena. Si alguno falla en las corridas de verificación, es un hallazgo de la ronda del tester (PA-12) | Ronda del tester, solo si fallan |
| Grupo secuencial de Vitest (proyecto aparte con `sequence.groupOrder`) | Alternativa descartada en §D-1 | — |
| M-02 de DESIGN-01b | P-02 (a) | Un `chore` del frontend |
| "Opcionales" de CHORE-01 | P-03 (a) | Sin encargo |
| `tw-animate-css` sin uso (R-09 de DESIGN-01) | Es una dependencia del frontend, no una prueba | Un `chore` del frontend |
| U+202E literal en `docs/trabajo/AUTH-03-ajustes-de-cuentas/plan.md:946` | Es de documentos | Un `chore` de documentos |
| "Volver a cargar" en `MensajeError` | Es del frontend | El próximo encargo que toque `components/mensaje-error.tsx` |
| Cifras viejas en `README.md` §7 ("82 archivos con 933 pruebas") | Fuera del encargo (M-17 de AUTH-01) | Mini-ronda de documentos |
| Todo lo de CLASES-02 y TAREAS | Lo fijó el humano | Sus encargos |

## Diseño

### §D-1 · La espera en cadena y cómo se corta
**Mecanismo (leído en el código):**
1. Una transacción retenedora R (por ejemplo, `conFilaRetenida` de `cuentas-r3`) toma `SELECT … FOR UPDATE` sobre la fila de un usuario: eso deja en la tabla un `RowShareLock` hasta su `COMMIT`.
2. `cuentas-r1:130` pide `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE`, que choca con ese `RowShareLock`: queda **formado** detrás de R.
3. Mientras L (ese `LOCK TABLE`) espera, PostgreSQL forma detrás de L a **toda** petición nueva sobre `usuarios`, incluso un `SELECT` simple (`AccessShareLock`), porque choca con el modo que L pide.
4. R necesita, para soltar la fila, que terminen operaciones de su mismo proceso (sus consultas de sondeo y, en `cuentas-r3` "login formado detrás de una fila retenida más de 5 s", 12 logins en paralelo). Esas operaciones usan conexiones del pool del proceso y consultan `usuarios`: quedan detrás de L. Con el pool agotado o con R esperando su `Promise.all`, R no avanza.
5. Ciclo: R espera a la aplicación, la aplicación espera a L y L espera a R. PostgreSQL no lo ve como interbloqueo (una parte está fuera de la base). Solo lo deshacen los tiempos límite de 15 s, y caen de 10 a 12 archivos. Todo `P2028` visto en corridas caídas (`cambiar-contrasena`, `rotarSesion`, `invitarMaestrosEnLote`, `crearComentario`) es una transacción de otro archivo formada detrás de L.

**Remedio (C-1, del tester, ronda 0):** el caso "con la tabla usuarios bloqueada por otra transacción, recuperar responde igual y a tiempo" toma el bloqueo con `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE NOWAIT`. Si no se concede de inmediato, PostgreSQL responde `55P03` (`lock_not_available`) sin formarse, la transacción se revierte y el caso reintenta con una transacción nueva tras una pausa corta. Así L **nunca** queda en la cola de `usuarios`: no puede formar el paso 3 y el ciclo no existe. Cuando L obtiene el bloqueo, lo retiene a lo más 1.5 s (la carrera con `recuperar` que ya tiene el caso), sin esperar a nadie que lo necesite: los demás esperan como mucho ese tiempo.

Criterio exacto para C-1 (el tester elige la forma del código):
- `NOWAIT` en el `LOCK TABLE`; nunca `lock_timeout` con espera, nunca sin `NOWAIT`.
- Reintenta **solo** ante el error de bloqueo no disponible (`55P03`, o el texto `could not obtain lock on relation` si el código no viaja en el error de Prisma); cualquier otro error se propaga.
- Pausa entre intentos de 20 a 50 ms; presupuesto total de 30 s. Si se agota, el caso falla con un mensaje que lo diga ("no se obtuvo el bloqueo de la tabla usuarios en 30 s") y con el número de intentos. El tiempo límite del caso sube a 45 s.
- La petición a `recuperar` se lanza solo después de obtener el bloqueo, dentro de la transacción que lo tiene (como hoy). Las aserciones no cambian.

**Por qué no las otras dos mitigaciones que propuso el manager:**
- **`lock_timeout` en ese `LOCK TABLE`, sin `NOWAIT`:** L seguiría formándose mientras dura cada intento, y en esa ventana aparecería en `pg_blocking_pids` de las retenedoras. Con `lock_timeout` cada copia de la consulta de "formada" (§D-3) tendría que filtrarlo, incluidas las de `enlaces-03b`, `muro-c` y `archivos-d`. Con `NOWAIT`, L no aparece detrás de nadie.
- **Grupo secuencial de Vitest:** exige `projects` y `sequence.groupOrder` en `vitest.config.ts`, y con proyectos el `globalSetup` y el `provide` pasan a ser por proyecto (dos contenedores o una configuración que hay que probar). Alarga la suite y no protege contra el siguiente `LOCK TABLE` que alguien escriba. La regla nueva de "Pruebas" y PR-CH-01c sí lo hacen.

**Riesgo del remedio (R-1):** con `NOWAIT`, L solo obtiene el bloqueo en un instante en que nadie tiene ningún bloqueo sobre `usuarios`. Con la suite completa eso pasa en una fracción alta de los intentos (cada sentencia fuera de transacción retiene `AccessShareLock` solo lo que dura), salvo mientras una retención deliberada sostiene la fila (hasta unos 6.5 s en `cuentas-r3`, unos 5 s en PR-B05). El presupuesto de 30 s cubre varias seguidas; si se agota, falla un solo caso con un mensaje claro, no diez archivos en cascada.

**R-1 materializado (Enmienda 4, T-04):** en la ronda 2 del tester el caso agotó sus 30 s (540 intentos) solo, sin arrastrar a nadie, porque las retenciones de filas de `usuarios` que sumó CHORE-02 (`servicio-ocupado`, `servicio-ocupado-ch-r1`) quedaron seguidas de las de `cuentas-r3`, `cuentas-03a-r1` y PR-B05. El presupuesto pasa a **60 s** y el tiempo límite del caso a **75 s** (el tester, con A-9), y dos retenciones salen de `usuarios`: PR-CH-04c (inserta en `enlaces_registro`) y PR-B05 (tabla temporal, §E4-3). El umbral para revisar el presupuesto pasa de 20 s a 40 s.

### §D-2 · PR-B05
`alumnos.integracion.test.ts`, "PR-B05: con SET LOCAL enable_seqscan = off…": inserta 40,000 filas en `usuarios` y corre `ANALYZE` en una transacción que se revierte (unos 5 s). Sus bloqueos (S-4) solo chocaban con el `ACCESS EXCLUSIVE` de L: L esperaba detrás de PR-B05 y todo lo demás detrás de L, así que PR-B05 alargaba la ventana de la cola sin cerrar el ciclo (revisión del manager, M-07). Con C-1, L ya no se forma: PR-B05 retiene `usuarios` sin que nadie lo espere. **No cambia su código**, porque la única vía para acortarlo (sembrar un `nombre_busqueda` constante) mueve la estimación del planificador y su determinismo costó dos rondas (M-07). La comprobación es de ejecución: PR-B05 en verde y el caso de C-1 sin agotar su presupuesto en todas las corridas de verificación (PR-CH-02).

### §D-3 · "Formada" quiere decir "esperando esta fila" (A3)
`conFilaRetenida` (`backend/test/ayudas-concurrencia.ts:55-67`) cuenta, de forma recursiva, todo proceso que `pg_blocking_pids` pone detrás de la retenedora. L, mientras espera a R, cuenta; también cualquier proceso que espera a L. Así una operación puede darse por formada antes de llegar a la fila, la siguiente se lanza antes y el orden se invierte: A3 recibe `401` en lugar de `204` (revisión del manager, AUTH-03c, "Hallazgo nuevo, ajeno al cambio").

**Remedio (programador, en `ayudas-concurrencia.ts`):** una función exportada `formadasDetrasDe(pid: number): Promise<number>` que cuenta solo los procesos que esperan un bloqueo de fila: `wait_event_type = 'Lock'` y `wait_event IN ('transactionid', 'tuple')`, en los dos niveles de la recursión. El primero espera el identificador de transacción de la retenedora (`transactionid`); los siguientes esperan el bloqueo de la tupla que tiene el primero (`tuple`) y se alcanzan por la recursión. Un proceso que espera un bloqueo de **tabla** (`wait_event = 'relation'`, como L) o uno consultivo (`advisory`) no cuenta, ni nada que esté detrás de él. Forma de la consulta:
```sql
WITH RECURSIVE bloqueados(pid) AS (
  SELECT a.pid FROM pg_stat_activity a
  WHERE $1::int = ANY(pg_blocking_pids(a.pid))
    AND a.wait_event_type = 'Lock' AND a.wait_event IN ('transactionid', 'tuple')
  UNION
  SELECT a.pid FROM pg_stat_activity a
  JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
  WHERE a.wait_event_type = 'Lock' AND a.wait_event IN ('transactionid', 'tuple')
)
SELECT count(*)::int AS n FROM bloqueados
```
(parametrizada con `$queryRaw` etiquetado, como hoy). `conFilaRetenida` la usa en lugar de su `detrasDeLaFila`. Su firma y su `timeout` de 30 s no cambian; el tiempo límite de 10 s por operación, tampoco.

**Condición del filtro (Enmienda 1, M-02):** una espera de fila (`transactionid` o `tuple`) solo existe si la fila retenida ya estaba **confirmada** cuando la operación la pide: en READ COMMITTED, una fila que nace dentro de la retenedora no es visible para otra transacción, que la "busca", no la encuentra y no espera. Todas las retenedoras actuales retienen filas creadas antes, fuera de su transacción; PR-CH-03a (que comprueba el filtro) monta la suya igual.

**Hermanos (regla de "Resúmenes verificables"):** el mismo patrón vive en nueve sitios.
| Sitio | Retiene | ¿Le aplica el remedio? | Quién |
|---|---|---|---|
| `test/ayudas-concurrencia.ts` (A1 a A5, B, C, D de `bloqueo-usuario`) | fila de `usuarios`, `sesiones` o `enlaces_registro` | Sí | Programador |
| `cuentas-r2.ataque.test.ts:92-136` | `usuarios` o `sesiones` | Sí: retiene `usuarios`, L lo contaba | Tester (C-3) |
| `cuentas-r3.ataque.test.ts:146-200` | `usuarios` o `sesiones` | Sí, por la misma razón | Tester (C-3) |
| `cuentas-03a-r1.ataque.test.ts:165-209` | `usuarios` o `sesiones` | Sí, por la misma razón | Tester (C-3) |
| `enlaces-03b-r1.ataque.test.ts:121`, `enlaces-03b-r2.ataque.test.ts:73-83` | fila de `enlaces_registro` | No hace falta: la retenedora no bloquea `usuarios`, y con C-1 L nunca espera a nadie | — |
| `muro-c-r1.ataque.test.ts:133` | fila de `comentarios` | No hace falta, por la misma razón | — |
| `archivos-d-r1.ataque.test.ts:283` | filas de `archivos` | No hace falta, por la misma razón | — |
| `invitacion-masiva.integracion.test.ts:370-376` | bloqueo consultivo | No aplica (su espera es `advisory`). Puede contar a otro archivo formado en el mismo bloqueo, pero su aserción no depende del orden: la llamada real siempre cuenta después de obtener el bloqueo | — |

### §D-4 · Un `P2028` responde `503 SERVICIO_OCUPADO`, nunca `500`
**Qué responde** (decisión que pidió el orquestador):
- **Estado `503`.** Es una condición transitoria del servidor; repetir la petición en unos segundos puede funcionar. No es `409` (no hay conflicto con el estado del recurso: nada se escribió) ni `500` (no es un defecto). Es coherente con `503 BASE_DE_DATOS_NO_DISPONIBLE` y `503 ALMACEN_NO_DISPONIBLE`.
- **`codigo`: `SERVICIO_OCUPADO`.** Describe la condición sin nombrar la infraestructura, que va solo en el log.
- **`mensaje`: "El servicio está ocupado en este momento. Inténtalo de nuevo en unos segundos."** El frontend lo muestra tal cual (S-2).

**Dónde vive:** la traducción es **general**, en `adapters/db/errores.ts` (`traducirErrorDeTransaccion`), y se aplica en un solo punto: `enTransaccion` de `adapters/db/cliente.ts`, que es hoy el **único** `$transaction` de `backend/src` (lo comprobé: las 19 llamadas a `enTransaccion` de `usuarios.ts`, `sesiones.ts`, `tokens-cuenta.ts`, `invitaciones.ts`, `enlaces-registro.ts`, `inscripciones.ts` y `publicaciones.ts` pasan por él). Una prueba estática (PR-CH-04h) impide que aparezca otro. No es por operación porque el mecanismo es el mismo en todas, y la traducción por operación dejaría fuera a la siguiente transacción que alguien escriba.
- Un `P2028` que salta dentro de la función (en una sentencia) se propaga por el `$transaction` y lo traduce el mismo `.catch`. Un `traducirErrorPrisma` intermedio lo relanza tal cual (solo traduce `P2002` y `22021`).
- Un `AppError` que la función lance a propósito (por ejemplo, `CUPO_DIARIO_INSUFICIENTE` o `ARCHIVO_INVALIDO`) pasa intacto: el traductor relanza todo lo que no es `P2028`.
- Un `enTransaccion` anidado (recibe un `TransactionClient`) no traduce: lo hace el de afuera.

**Qué se escribe:** nada. Prisma revierte la transacción expirada (S-1); el evento encolado en ella tampoco existe, porque pg-boss encola con la misma conexión (`ejecutorSqlDe`). Las pruebas PR-CH-04c a 04f lo comprueban dato por dato.

**Lo que se conserva para operación y para PA-07:** el `AppError` lleva el error original como `cause` (cambio en `core/errores.ts`), y el envoltorio de `handlers/errores.ts` registra **todo `AppError` con estado ≥ 500 que traiga causa** en nivel `warn`, con `{ err: <la causa>, codigo }` y el mensaje "Error controlado del servidor". Hoy ningún `AppError` lleva causa, así que el único que se registra es el nuevo; los demás `AppError` siguen sin registro, como hoy. La causa serializada conserva `"code":"P2028"`, así que el conteo de PA-07 sigue funcionando con el mismo `grep`.

**Los workers:** un `AppError 503` se propaga igual que el `P2028` de antes y pg-boss reintenta (3 veces con espera exponencial). Nada se traga.

**Riesgo (R-2):** un `P2028` por un error de programación (usar `tx` después de que la transacción terminó) también saldría como `503`. Es determinista, así que lo atrapan las pruebas del flujo (esperan `2xx`), y el log lo registra con su causa.

### §D-5 · La guarda revisa toda ruta (M-15) y cierra los comodines generales
Hoy `puedeAtenderApi` (`guarda-de-rutas.ts:117-121`) solo revisa las rutas que empiezan por `/api` o cuyo primer segmento es un parámetro o un comodín (M-15 de AUTH-01: `/API/x`, `//api/x` o `/interno` quedan públicas sin que la guarda lo note). Y la regla de `:claseId` no ve `/api/*` ni `/api/:seccion/*`, que con `protegido()` y sin una ruta más específica atenderían `/api/clases/<id>/…` sin pertenencia (observación del tester, CLASES-a, ronda 2).

**Regla nueva** (en `motivoDeRechazo`, para toda ruta que no esté en `RUTAS_PUBLICAS` con su método):
1. **Toda ruta, con cualquier URL**, empieza por la cadena completa de `protegido()`. `puedeAtenderApi` desaparece. Mensaje sin cambios: `… no pasa por protegido() (AGENTS.md, regla 2)`.
2. Las reglas de `:claseId` y de los comodines bajo `/clases` siguen igual y en el mismo orden (primero la cadena, después el nombre del parámetro de clase, después el sexto paso, después los hooks anteriores).
3. **Nueva, la última:** ninguna ruta tiene un parámetro (`:`) ni un comodín (`*`) en sus **dos primeros segmentos** (los de la URL completa, ya con el prefijo, separados por `/`; un segmento con `:` o `*` en cualquier posición cuenta). Motivo: `tiene un parámetro o un comodín en sus dos primeros segmentos`, con el mensaje completo `La ruta <METODO> <url> tiene un parámetro o un comodín en sus dos primeros segmentos (AGENTS.md, regla 2)`.

**Por qué dos segmentos bastan:** para atender `/api/clases/<id>/…`, una ruta necesita que su primer segmento pueda valer `api` y el segundo `clases`. Si los dos son literales, solo puede ser `/api/clases/…`, que ya cubren las reglas de CLASES-a. Si alguno es un parámetro o un comodín, podría atender esa familia sin `:claseId`: se rechaza. Es una sobreaproximación deliberada (rechaza también `/:idioma/x`, que no llega a `/api/clases/<id>`), igual que `\w` en `TIENE_CLASE_ID`: el lado seguro.

**Efecto en las rutas que existen:** ninguno en producción (todas son `/api/<literal>/…`; lo comprueba PR-CH-05d). En las pruebas: `/api/clases*` con pertenencia, que hoy arrancaría, pasa a rechazarse (ninguna prueba lo espera arrancando); `/api/clases/*` con pertenencia sigue arrancando. Las rutas de prueba fuera de `/api` sin `protegido()` dejan de arrancar: `salud.integracion.test.ts` (normal, la adapta el programador) y el caso de `guarda-r2.ataque.test.ts:148` (C-2).

**Para CLASES-02:** las rutas del admin sobre clases (`/api/admin/clases/:claseId…`) tienen dos primeros segmentos literales; la regla 3 no las toca. La excepción de la guarda que ese plan agregue no puede relajar las reglas 1 y 3.

### §D-6 · Guarda de la base de pruebas (N-01) y tipos de las pruebas (N-03)
- **N-01.** `pg-connection-string` toma `host` (y cualquier otro parámetro de conexión) de la query de la URL, así que `postgresql://u:p@127.0.0.1:5432/campus_pruebas?host=db.remota` pasa la guarda y conecta a otro host (revisión de CHORE-01). Remedio: `validarUrlDePruebas` (`backend/test/entorno-de-pruebas.ts`) rechaza **toda** URL con parámetros de consulta (`destino.search !== ""`), con el motivo `la URL lleva parámetros de consulta, que pueden cambiar el destino de la conexión` (sin la URL, el host ni la contraseña). Va **después** de las comprobaciones actuales, para no cambiar el motivo de los casos existentes (por ejemplo, `campus_dev?schema=public` sigue respondiendo "la base es campus_dev…"). La URL que arma `global-setup.ts` no lleva query: no cambia. `setup.ts`, `global-setup.ts` y `preparar-cola.ts` ya llaman a esa función: no se tocan.
- **N-03.** Archivo nuevo `backend/tsconfig.test.json`:
  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": { "noEmit": true, "rootDir": "." },
    "include": ["src", "test", "vitest.config.ts"],
    "exclude": []
  }
  ```
  y en `backend/package.json`: `"typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json"`. `lint` ya llama a `typecheck`; `build` no cambia.
- **Medición (manager, `revision.md`, M-01; Enmienda 1):** con ese `tsconfig`, hoy hay **41 errores en 22 archivos**: 17 pruebas normales (los 15 de A-4 "solo tipos" más `enlaces-registro.integracion:62` e `invitacion-masiva.integracion:459`) y 5 `*.ataque` (los de C-4). Los patrones: el `payload` de `inject` tipado como `unknown`, `Chain` contra `Response` en `inject`, `exactOptionalPropertyTypes` (por ejemplo, `cookies` con un valor posiblemente `undefined` en `cambiar-contrasena.integracion`, 11 errores), `possibly null/undefined` y `deadLetter` en las opciones de `asegurarCola` (tipadas como `QueueOptions` de pg-boss). Las pruebas normales las corrige el programador en el paso 3 y los `*.ataque` el tester en la ronda 0 (C-4), siempre con la regla de "solo tipos" del paso 3. Un error en un archivo fuera de esos 22 activa PA-05 (normal) o PA-02 (`*.ataque`).
- **Alternativa (b), si el humano la elige en lugar de (a):** N-03 sale de CHORE-02 (sin `tsconfig.test.json`, sin cambio en `typecheck`, sin los 15 archivos de A-4 "solo tipos" ni C-4, y PR-CH-06b se retira) y queda como fila de `ESTADO.md` §3 con la medición de M-01.

### §D-7 · (e), (f) y la paginación de `enlaces-registro`
- **(e)** `invitacion-masiva.integracion.test.ts:344`: la transacción retenedora espera hasta 10 s a que se forme la llamada real, dentro del `timeout` por defecto de 5 s. Se le pasa `{ timeout: 20_000, maxWait: 5_000 }`. Hermanos revisados: todas las demás retenedoras de `backend/test` ya pasan un `timeout` explícito mayor que su espera (`ayudas-concurrencia` 30 s, `cuentas-r1:335` 15 s, `cuentas-r2`/`enlaces-03b-*` 30 s, `cuentas-r3`/`cuentas-03a-r1` 40 s, `archivos-d-r1`/`muro-c-r1`/`muro.integracion`/`restablecer.integracion` 15 s, PR-B05 15 s); las de `auth-registro.integracion:161`, `invitacion-masiva.integracion:451` y `cuentas-r1:731/743` no esperan a nadie, y la de `alumnos-b-r1.ataque:947` (tabla temporal, `timeout: 20000`) tampoco (Enmienda 1, detalle menor del manager). Solo aplica a `:344`.
- **(f)** El token con `creadoEn` en 2100 de ese caso suma 1 a todo conteo de invitaciones de las últimas 24 h mientras existe (hasta el `afterAll`). Se guarda su `id` y se borra en un `finally` del propio caso, después de las aserciones. Queda una ventana de milisegundos, aceptada en AUTH-03c.
- **Paginación de `enlaces-registro.integracion.test.ts:100`** ("lista en orden creado_en DESC, id DESC y pagina con cursor"; texto de la Enmienda 1, M-06, corregido por la Enmienda 2, M-07): hoy las dos páginas se pueden invadir. La segunda espera encontrar A entre los 2 siguientes, pero un enlace que otro archivo cree en ese instante cae entre B y A; y si entre `base` y la primera consulta pasa más de 1 s (equipo cargado), un enlace ajeno cae entre C y B y `[C, B]` falla. Remedio, con el método que ya usa `enlaces-03b-r1.ataque` ("enlaces con el mismo creado_en…", ventana de 1990), en una ventana que **no queda por debajo** del ancla de esa prueba:
  - el caso crea cuatro enlaces y les fija `creado_en` en una **ventana propia entre 1990 y "ahora"**, `2000-01-01T00:00:00.000Z` (ninguna otra prueba fija `creado_en` de un enlace en 2000; ver la evidencia de la Enmienda 2): A en `base`, B en `base + 1 s`, C en `base + 2 s` y un ancla D en `base + 3 s`;
  - la primera página se pide **con `cursor` = id de D** y `limite=2`: debe ser exactamente `[C, B]`, con `siguienteCursor` no nulo (entre D y A solo están los enlaces del caso);
  - la segunda, con ese cursor: **su primer elemento es A**, y B, C y D no aparecen. No se exige la lista exacta: por debajo de 2000 viven los enlaces de 1990 de `enlaces-03b-r1` (y cualquier otro más viejo), que pueden estar o no según el orden de los archivos;
  - lo que prueba el caso no cambia (orden `creado_en DESC, id DESC` y el corte por cursor); solo deja de depender de lo que otros archivos crean en paralelo. Las filas de 2000 quedan por debajo de todo enlace creado "ahora", así que no afectan a "registrados correcto…" (`:165`, que busca su enlace recién creado en los primeros 100) ni a ninguna prueba que lea la primera página; y quedan **por encima** del ancla de 1990, así que tampoco entran en el recorrido de `enlaces-03b-r1:593-614`, que empieza en ese ancla y baja hasta el final.

### §D-8 · PA-07 desde CHORE-02
Hasta hoy, PA-07 excluía dos `P2028` de `cuentas-r3` y, por arbitraje, los de corridas caídas por la cadena. Con este plan los `P2028` dejan de producir `500`, pero siguen siendo la señal de contención, y el log los conserva (§D-4). Nueva definición, para este encargo y los siguientes:

> **PA-07.** En la salida completa de `cd backend; npm test` se cuentan, por término: `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `"Error no controlado"` y `"code":"P2028"`. Te detienes y reportas si: (a) cualquiera de los cuatro primeros es mayor que 0; (b) aparece un `"Error no controlado"` fuera del inventario I-1 de la ronda 0 (los que provocan a propósito pruebas existentes, como la ruta de error de `salud.integracion`, identificados por ruta); (c) aparece un `P2028` fuera de los provocados a propósito, que son exactamente: los dos del bloque `describe("ataque: transacciones que Prisma cierra por tiempo (P2028) a mitad de una espera de bloqueo")` de `cuentas-r3.ataque.test.ts` (`POST /api/auth/login` sobre `tx.sesion.create`, `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`) y los tres de `servicio-ocupado.integracion.test.ts` (PR-CH-04d, `POST /api/auth/cambiar-contrasena`; PR-CH-04e, `POST /api/auth/refrescar`; PR-CH-04f, `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios`), identificados por ruta y llamada, no por línea. Ya **no** hay excepción por "corrida caída por la espera en cadena": una corrida completa que cae por tiempos límite es un hallazgo (PA-12). **Control positivo (Enmienda 1, M-03):** el conteo solo vale si en esa misma salida aparecen los tres `P2028` deterministas de `servicio-ocupado.integracion.test.ts` (PR-CH-04d, 04e y 04f), cada uno con su ruta; si falta alguno (por ejemplo, porque el log de la corrida quedó en `error` o más alto y las líneas `warn` no salen), el conteo no vale: no se declara PA-07 limpia, se reporta la corrida con lo que falta y te detienes. Si faltan los dos de `cuentas-r3`, no se activa la parada, pero se reporta (como hasta hoy). Todo reporte de PA-07 trae el comando, el conteo por término, la comprobación del control positivo y, para cada `P2028`, su ruta y su llamada. **M-08 (Enmienda 3, §E3-2):** los `P2028` de `maxWait` ("Unable to start a transaction in the given time") en `POST /api/auth/registro-maestro` siguen la regla transitoria de §E3-2.

## Cambios por capa
Lista cerrada. Todo archivo que no aparezca aquí ni en "Ronda 0 del tester" está en "No se toca".

### shared/
Sin cambios.

### backend/core/
- **`backend/src/core/errores.ts`**: `AppError` acepta una causa opcional.
  ```ts
  export interface OpcionesDeAppError {
    causa?: unknown
  }

  export class AppError extends Error {
    readonly codigo: string
    readonly estado: number

    constructor(codigo: string, mensaje: string, estado = 400, opciones: OpcionesDeAppError = {}) {
      super(mensaje, opciones.causa === undefined ? undefined : { cause: opciones.causa })
      // name, codigo y estado: sin cambios
    }
  }
  ```
  `esAppError` no cambia. Las llamadas existentes (tres argumentos) no cambian.
- **`backend/src/core/errores.test.ts`**: dos casos nuevos (PR-CH-04b).

### backend/adapters/
- **`backend/src/adapters/db/errores.ts`**: función nueva, exportada.
  ```ts
  export const MENSAJE_SERVICIO_OCUPADO =
    "El servicio está ocupado en este momento. Inténtalo de nuevo en unos segundos."

  // P2028: la transacción interactiva expiró (pasó su timeout, por ejemplo esperando un bloqueo de
  // fila) o no obtuvo conexión dentro de su maxWait. Prisma ya la revirtió: nada se escribió. Es
  // transitorio, así que responde 503, nunca 500 (CHORE-02). Cualquier otro error se relanza tal cual.
  export const traducirErrorDeTransaccion = (error: unknown): never => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028") {
      throw new AppError("SERVICIO_OCUPADO", MENSAJE_SERVICIO_OCUPADO, 503, { causa: error })
    }
    throw error
  }
  ```
  `traducirErrorPrisma` no cambia. El comentario de la línea 43 ("Único lugar del backend que conoce los códigos P2xxx") sigue siendo cierto.
- **`backend/src/adapters/db/cliente.ts`**: `enTransaccion` traduce al abrir la transacción.
  ```ts
  export const enTransaccion = <T>(
    ejecutor: Ejecutor,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> => {
    if ("$transaction" in ejecutor) {
      return ejecutor.$transaction(fn).catch(traducirErrorDeTransaccion)
    }
    return fn(ejecutor)
  }
  ```
  Con el comentario de por qué (único `$transaction` de `backend/src`; CHORE-02). `obtenerDb`, `inicializarDb` y `ejecutorSqlDe` no cambian. No se agrega SQL (E6 de `bloqueo-usuario.integracion` sigue con su lista).
- **`backend/src/adapters/db/errores.test.ts`** (nuevo; único lugar de las pruebas donde se puede construir un `PrismaClientKnownRequestError`, porque ESLint prohíbe importar el cliente generado fuera de `adapters/db`): PR-CH-04a.
- **`backend/src/adapters/README.md`**: texto propuesto (lo aplica el orquestador).

### backend/handlers/
- **`backend/src/handlers/errores.ts`** (envoltorio único): solo la rama de `AppError`.
  ```ts
  if (esAppError(error)) {
    // CHORE-02: un AppError de servidor con causa (hoy, solo SERVICIO_OCUPADO por P2028) se registra
    // con su error original, para no perder la señal de contención. Los demás AppError, como hoy.
    if (error.estado >= 500 && error.cause !== undefined) {
      request.log.warn({ err: error.cause, codigo: error.codigo }, "Error controlado del servidor")
    }
    return responder(reply, error.estado, error.codigo, error.message)
  }
  ```
  Ninguna ruta, ningún handler de dominio, ninguna cadena de middleware cambia.

### backend/middleware/
- **`backend/src/middleware/guarda-de-rutas.ts`**:
  - Se elimina `puedeAtenderApi` y su llamada en `registrarGuardaDeRutas`: el `onRoute` evalúa toda ruta.
  - Función pura nueva, no exportada:
    ```ts
    // CHORE-02: un parámetro o un comodín en los dos primeros segmentos podría atender
    // /api/clases/<id>/… sin la regla de :claseId (/api/*, /api/:seccion/*, /:seccion/*, *).
    const comodinEnLosPrimerosSegmentos = (url: string): boolean =>
      url
        .replace(/^\//, "")
        .split("/")
        .slice(0, 2)
        .some((segmento) => segmento.includes(":") || segmento.includes("*"))
    ```
  - En `motivoDeRechazo`, después de la comprobación de hooks anteriores (es decir, como última regla; el orden de las demás no cambia): `if (comodinEnLosPrimerosSegmentos(url)) return "tiene un parámetro o un comodín en sus dos primeros segmentos"`. Ojo: hoy la función devuelve `null` en cuanto no hay hooks declarados; la regla nueva va antes de ese `return null` y después del cálculo de `declarados`, de modo que un `declara …` siga ganando si coinciden.
  - Comentarios de cabecera de la guarda actualizados (M-15, CHORE-02).
- **`backend/src/middleware/rutas-publicas.ts`**: solo el comentario de la línea 1 ("Única lista de rutas bajo /api que no pasan por protegido()" pasa a "Única lista de rutas que no pasan por protegido(), en cualquier URL (M-15, CHORE-02)"). El conjunto no cambia.
- **`backend/src/middleware/README.md`**: texto propuesto (lo aplica el orquestador).
- `protegido()`, `index.ts`, los pasos de la cadena y sus marcas: sin cambios.

### backend/workers/
Sin cambios (§D-4: un `AppError 503` se reintenta igual que antes el `P2028`).

### backend/prisma/
Sin migración.

### infra/ y .env.example
Sin cambios. Ninguna variable nueva (P-01 (a)).

### backend/ (configuración y pruebas)
- **`backend/tsconfig.test.json`** (nuevo) y **`backend/package.json`** (solo `typecheck`): §D-6.
- **`backend/test/ayudas-concurrencia.ts`**: `formadasDetrasDe` exportada (§D-3) y usada por `conFilaRetenida`. El comentario de cabecera explica el filtro.
- **`backend/test/entorno-de-pruebas.ts`** y **`entorno-de-pruebas.test.ts`**: N-01 (§D-6) y PR-CH-06a.
- **`backend/test/salud.integracion.test.ts`**: sus dos rutas de prueba pasan a `/api/prueba/app-error` y `/api/prueba/error-comun`, con `protegido()`, y los dos casos que las llaman envían el token del admin de la base (`firmarTokenDePrueba` con el id del admin, como en `cuentas-r1`). Las aserciones no cambian.
- **`backend/test/invitacion-masiva.integracion.test.ts`**: (e) y (f) del caso de la línea 316 (§D-7). Las aserciones no cambian; se agrega la de PR-CH-07b.
- **`backend/test/enlaces-registro.integracion.test.ts`**: el caso de la línea 100, con la ventana de 2000 y el ancla (§D-7, PR-CH-08; Enmienda 2), y su error de tipos de la línea 62 (paso 3).
- **Las 15 pruebas normales de A-4 "solo tipos"** (lista en A-4): solo los errores de `tsconfig.test.json`, con la regla del paso 3. Nada más de esos archivos cambia.
- **`backend/test/middleware-orden.integracion.test.ts`**: solo el comentario de la línea 36.
- **Nuevos:**
  - `backend/test/servicio-ocupado.integracion.test.ts`: PR-CH-04c a 04g.
  - `backend/test/guarda-todas-las-rutas.integracion.test.ts`: PR-CH-05a a 05e.
  - `backend/test/higiene-de-pruebas.integracion.test.ts`: PR-CH-01c, PR-CH-03a y PR-CH-04h.

### frontend/features/<modulo>/
Sin cambios. CHORE-02 no toca `frontend/`.

## Acceso a datos
- **Producción:** ninguna consulta nueva ni cambiada. `enTransaccion` solo agrega un `.catch` a la promesa de `$transaction`. Sin N+1, sin índices nuevos.
- **Pruebas:** las consultas nuevas son sobre vistas del sistema (`pg_stat_activity`, `pg_blocking_pids`, `pg_locks`), con `$queryRaw` etiquetado y parametrizado, sondeadas con un límite de 10 s y una pausa de 25 ms, fuera de cualquier ciclo de consultas de dominio. Las de verificación de datos (hash, sesiones vivas, tokens vivos, comentarios, trabajos de la cola) filtran por llave primaria o por columnas ya indexadas (`usuario_id`, `publicacion_id`), una consulta por aserción.
- **Transacciones de las pruebas:** toda retenedora nueva pasa un `timeout` explícito mayor que su espera más larga (regla nueva de "Pruebas").

## Autorización
- **Ningún endpoint nuevo ni cambiado.** Quién puede y quién no, en cada ruta, queda igual; ningún campo nuevo en ninguna respuesta; el estado de pago no se toca.
- **La guarda se endurece:** toda ruta no pública, con cualquier URL, empieza por la cadena completa, y ninguna tiene un parámetro o un comodín en sus dos primeros segmentos. Si una ruta no cumple, la API no arranca (no hay un estado intermedio en que responda).
- **El `503` no revela nada:** el mensaje es el mismo para cualquier operación y no dice si la cuenta, la sesión o la publicación existen. Un `503` solo puede salir después de pasar la cadena (o, en las rutas públicas, después de las mismas validaciones que hoy dan `401`/`400`), así que no abre un oráculo nuevo: en `cambiar-contrasena` y en `refrescar` el `503` aparece en el mismo punto donde hoy aparece el `500`.

## Pruebas requeridas
Cada viñeta es un caso (o un grupo con `it.each`) con su criterio. El resumen del programador asocia cada ID con su archivo y el título exacto del caso.

**Punto 1 · espera en cadena**
- **PR-CH-01a** (tester, C-1): el caso de `cuentas-r1` con `NOWAIT` y reintento (criterio en §D-1). Pasa aislado y en la suite completa.
- **PR-CH-01b** (verificación, no es un caso): el protocolo de "Verificación de la espera en cadena" (abajo).
- **PR-CH-01c** (programador, `higiene-de-pruebas.integracion.test.ts`): prueba estática, por **sentencia**, no por línea (texto de la Enmienda 1, M-05).
  - **Qué recorre:** `backend/test/**/*.ts` y `backend/src/**/*.test.ts`, sin el propio archivo. De cada archivo se quitan las líneas que son puro comentario (`//` al principio, como en E6) y el resto se analiza **como un solo texto**, con sus saltos de línea.
  - **Qué busca:** toda sentencia `LOCK` de PostgreSQL, con o sin `TABLE` y con o sin `ONLY`: la expresión, sin distinguir mayúsculas, `\bLOCK\s+(?:TABLE\s+)?(?:ONLY\s+)?["\w.]` (los `\s` cubren saltos de línea). `\b` evita contar `pg_advisory_xact_lock` o `lock_timeout`.
  - **Qué exige:** la sentencia completa, desde `LOCK` hasta su primer terminador (`;`, o el cierre de la cadena que la contiene: `` ` ``, `"` o `'`), contiene `NOWAIT` (sin distinguir mayúsculas), aunque esté en otra línea.
  - **Control de la propia regla** (casos del mismo archivo, sobre textos de ejemplo pasados a la función que evalúa un texto): rechaza `LOCK usuarios IN ACCESS EXCLUSIVE MODE`, `LOCK TABLE ONLY usuarios IN ACCESS EXCLUSIVE MODE` y `LOCK TABLE usuarios` con `IN ACCESS EXCLUSIVE MODE` en la línea siguiente sin `NOWAIT`; acepta `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE NOWAIT` y la misma sentencia partida en dos líneas con `NOWAIT` en la segunda; no cuenta `pg_advisory_xact_lock(` ni `lock_timeout`.
  - El propio archivo arma las palabras clave sin escribirlas juntas cuando hace falta (por ejemplo, `["LOCK", "TABLE"].join(" ")`), y de todos modos se excluye de su recorrido. El mensaje del fallo lista archivo y línea donde empieza la sentencia.
  - Lo demás que forma colas (`TRUNCATE`, `ALTER TABLE`, `REINDEX`, `VACUUM FULL`…) no entra en esta prueba: sigue en el punto de ataque 1 del tester.

**Punto 2 · PR-B05**
- **PR-CH-02** (verificación): en cada corrida del protocolo, PR-B05 en verde y el caso de C-1 sin agotar su presupuesto. Se reporta la duración de los dos (del reporte JSON de Vitest o de la salida con `--reporter=verbose`).

**Punto 3 · "formada"**
- **PR-CH-03a** (programador, `higiene-de-pruebas.integracion.test.ts`): `formadasDetrasDe` solo cuenta esperas de fila. Montaje determinista sobre **una fila propia de `usuarios`** (texto de la Enmienda 1, M-02; retenerla está bien: con C-1, el `LOCK TABLE … NOWAIT` de `cuentas-r1` solo reintenta):
  0. **antes de abrir T1**, el caso crea su usuario con `crearUsuarioDePrueba(ids)`, fuera de toda transacción, así que la fila ya está confirmada y T3 la ve (en READ COMMITTED, una fila que nace dentro de T1 no es visible para T3, que devolvería 0 filas sin esperar);
  1. la transacción T1 toma `pg_advisory_xact_lock(k)` con una llave `k` aleatoria propia del caso (un `bigint` al azar; nadie más la usa) y `SELECT … FOR UPDATE` sobre la fila de ese usuario;
  2. T2 (otra transacción, otra conexión) pide `pg_advisory_xact_lock(k)`: espera con `wait_event = 'advisory'`;
  3. T3 pide `SELECT … FOR UPDATE` sobre la misma fila: espera con `wait_event = 'transactionid'`;
  4. con las dos formadas (sondeo de `pg_stat_activity` con límite de 10 s), `formadasDetrasDe(pid de T1)` es **1**, y la consulta recursiva sin filtro (la de hoy, copiada en el caso como control) da **2**;
  5. T1 confirma; T2 y T3 terminan; las tres con `timeout` explícito.
- **PR-CH-03b** (verificación): A3 de `bloqueo-usuario.integracion` sin cambios en sus aserciones, en verde en todas las corridas del protocolo.

**Puntos 4 y 5 · `P2028` → `503`**
- **PR-CH-04a** (`adapters/db/errores.test.ts`, unitaria): `traducirErrorDeTransaccion`:
  - con un `Prisma.PrismaClientKnownRequestError` de código `P2028` lanza un `AppError` con `codigo: "SERVICIO_OCUPADO"`, `estado: 503`, `message` igual a `MENSAJE_SERVICIO_OCUPADO` y `cause` igual (`toBe`) al error original;
  - con un `P2002`, con un error conocido de otro código, con un `Error` común y con un `AppError` (por ejemplo, `CUPO_DIARIO_INSUFICIENTE`) relanza **el mismo objeto** (`toBe`).
- **PR-CH-04b** (`core/errores.test.ts`): un `AppError` con `{ causa }` conserva `cause`; sin opciones, `cause` es `undefined` y `codigo`, `estado` y `message` no cambian.
- **PR-CH-04c** (`servicio-ocupado.integracion.test.ts`): `enTransaccion(obtenerDb(), …)` cuya función inserta una fila de prueba (un usuario `@pruebas.local`), espera 5.3 s y hace otra consulta: rechaza con `AppError` `SERVICIO_OCUPADO` 503 y la fila **no existe** después. Comprueba S-1 contra la base real (si el error no es el esperado, PA-03).
- **PR-CH-04d** (el remedio pedido para AUTH, prioridad alta): un usuario con `debeCambiarContrasena: true`, dos sesiones vivas y un token de recuperación vivo; `POST /api/auth/cambiar-contrasena` con la cookie de una de sus sesiones, formado detrás de la fila retenida de su usuario (`conFilaRetenida` con `antesDeSoltar` que espera 5.5 s):
  - responde **503**, `codigo` `SERVICIO_OCUPADO` y el mensaje exacto, con el formato de `errorApiSchema`; **nunca 500**;
  - nada se escribió: `hash_contrasena` igual al de antes y `debe_cambiar_contrasena` sigue en `true`; las dos sesiones siguen vivas (por id) y el token de recuperación sigue vivo;
  - el pool sigue sano y el intento no se consumió como fallo: la misma petición, repetida sin retención, responde **204** y apaga la bandera.
- **PR-CH-04e**: `POST /api/auth/refrescar` formado detrás de la fila retenida de su usuario más de 5 s (`rotarSesion` toma `FOR SHARE`, que choca con el `FOR UPDATE` de la retenedora): **503 SERVICIO_OCUPADO**, sin cookie nueva en la respuesta; la sesión no rotó (sigue viva, sin `reemplazada_por`), y un refresco posterior con la misma cookie responde **200** (no cuenta como reutilización).
- **PR-CH-04f**: `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` de un alumno inscrito, con la fila de `usuarios` del autor retenida más de 5 s (la llave foránea `autor_id` toma `FOR KEY SHARE`, que choca con `FOR UPDATE`): **503 SERVICIO_OCUPADO**; ningún comentario en esa publicación y ningún trabajo en la cola `COMENTARIO_CREADO` para ella (la misma consulta de la cola que ya usan las pruebas del muro).
- **PR-CH-04g** (log): una app de Fastify suelta con `manejoDeErrores` y un `logger` con un flujo en memoria (sin la base):
  - una ruta que lanza `new AppError("SERVICIO_OCUPADO", MENSAJE_SERVICIO_OCUPADO, 503, { causa })`, con una causa `Error` que lleva `code: "P2028"`, produce **una** línea de nivel 40 (`warn`) con `"code":"P2028"`, `"codigo":"SERVICIO_OCUPADO"` y `"msg":"Error controlado del servidor"`;
  - un `AppError` 503 **sin** causa y un `AppError` 4xx con causa no producen ninguna línea (comportamiento de hoy);
  - un `Error` común sigue produciendo "Error no controlado" y `500 ERROR_INTERNO`.
- **PR-CH-04h** (estático, `higiene-de-pruebas.integracion.test.ts`): en `backend/src/**/*.ts`, sin `adapters/db/generated/` ni `*.test.ts`, el único archivo con `.$transaction(` en una línea de código es `adapters/db/cliente.ts`.
- **Por qué no hay prueba HTTP para `invitarMaestrosEnLote`:** forzar su `P2028` exige retener el bloqueo consultivo de la invitación masiva más de 5 s, y ese bloqueo es global: haría fallar a las pruebas de lotes de otros archivos que corren en paralelo. Lo cubren PR-CH-04c (el mecanismo, con la misma `enTransaccion`) y PR-CH-04h (no hay otra vía).

**Punto 6 · guarda**
- **PR-CH-05a** (M-15): sin `protegido()`, no arrancan y el error dice `no pasa por protegido() (AGENTS.md, regla 2)`: `GET /interno`, `GET /prueba/x`, la ruta `/x` bajo el prefijo `//api` y bajo `/API`, `GET /` en la raíz. Con `protegido()`, `GET /interno` arranca y sin token responde **401**.
- **PR-CH-05b** (comodines): no arrancan y el error dice `tiene un parámetro o un comodín en sus dos primeros segmentos (AGENTS.md, regla 2)`:
  - con `protegido()`, con `protegido({ pertenencia: "inscripcion" })` y con `protegido({ pertenencia: "propiedad" })`: `/api/*`, `/api/:seccion/*`, `/api/:seccion`, `/:seccion/*`, `/*`, `*`, `/api*` y `/ap:resto/x`;
  - solo con pertenencia (sin ella, gana por orden el mensaje de CLASES-a, `… no pasa por requireMembership ni requireOwnership`, que el caso también comprueba): `/:seccion/clases/:claseId`, `/api/cla:resto/:claseId` y `/api/clases*`.
- **PR-CH-05c** (lo legítimo sigue arrancando): `/api/clases/*` y `/api/x/:claseId` con pertenencia; `/api/me/*` y `/prueba-ataque/x` con `protegido()`; las rutas públicas de la lista (con `HEAD` explícito de `/api/salud`).
- **PR-CH-05d**: `construirApp` real arranca y `GET /api/me` sin token responde **401** (todas las rutas de producción pasan la regla nueva).
- **PR-CH-05e**: `HEAD` hereda la decisión de su `GET` también para la regla nueva (`HEAD` explícito de `/api/*` con `protegido()` no arranca).

**Punto 7 · N-01 y N-03**
- **PR-CH-06a** (`entorno-de-pruebas.test.ts`): `validarUrlDePruebas` rechaza, con el motivo exacto de §D-6 y sin la contraseña ni el host del parámetro, `…/campus_pruebas?host=db.remota`, `?hostaddr=10.0.0.1`, `?port=5999`, `?options=-c%20search_path%3Dotra` y `?sslmode=disable`; los cuatro casos de hoy no cambian.
- **PR-CH-06b** (verificación): `cd backend; npx tsc -p tsconfig.test.json` **sin ningún error** (los 41 de M-01 corregidos); `cd backend; npm run lint` en 0, con `tsc -p tsconfig.test.json` en la salida; y `npx tsc -p tsconfig.test.json --listFilesOnly` lista archivos de `backend/test/` y de `backend/src/**/*.test.ts` (el resumen trae el conteo de cada uno).

**Punto 8 · (e) y (f)**
- **PR-CH-07a**: la retenedora de `invitacion-masiva.integracion:344` pasa `{ timeout: 20_000, maxWait: 5_000 }` (lo verifica el manager en el diff; el caso sigue en verde).
- **PR-CH-07b**: al terminar ese caso, el token de 2100 ya no existe (`count` por su `id` igual a 0, en el mismo caso, después del `finally`).

**Punto 9 · paginación de `enlaces-registro`**
- **PR-CH-08** (texto de la Enmienda 1, M-06, corregido por la Enmienda 2, M-07): el caso de la línea 100, con la ventana de 2000 y el ancla D de §D-7: desde el cursor de D, la primera página es exactamente `[C, B]` con `siguienteCursor` no nulo; en la segunda, el primer elemento es A y no aparecen B, C ni D.

**Punto 10 · T-01, manejadores de 404 y de errores fuera de la raíz (Enmienda 3)**
- **PR-CH-09a** (tester, ya escrita): los dos casos de `guarda-ch-r1.ataque.test.ts` "…setNotFoundHandler propio: o no arranca, o sin token responde 401" pasan a verde por "no arranca", sin cambiar el archivo.
- **PR-CH-09b** (programador, `guarda-todas-las-rutas.integracion.test.ts`): después de `registrarMiddleware`, `setNotFoundHandler` impide el arranque con el mensaje exacto de §E3-1, en: un plugin con prefijo `/api/clases`, con prefijo `/api`, con prefijo `/otro`, sin prefijo, dentro de un plugin anidado, y en un plugin envuelto con `fastify-plugin` (contexto de la raíz). Asignar `hijo.setNotFoundHandler = …` dentro de un plugin también impide el arranque.
- **PR-CH-09c** (ídem): lo mismo con `setErrorHandler` (hermano de T-01): un plugin con prefijo `/api/clases` que registra una ruta con `protegido()` y un `setErrorHandler` propio no arranca (sin el bloqueo, ese manejador convertiría el `401` de `authenticate` en cualquier respuesta), y tampoco en un plugin con `fastify-plugin`.
- **PR-CH-09d** (ídem): el orden de la raíz queda fijado: registrar `manejoDeErrores` **después** de `registrarMiddleware` impide el arranque; registrado antes (como `app.ts`), arranca. Con `construirApp` real: `GET /api/no-existe` responde `404 NO_ENCONTRADO` y `GET /api/me` sin token responde `401` con el formato de `errorApiSchema` (el manejador de errores de la raíz sigue activo).
- **PR-CH-09e** (programador, `higiene-de-pruebas.integracion.test.ts`, estático): en `backend/src/**/*.ts`, sin `adapters/db/generated/` ni `*.test.ts`, las únicas líneas de código con `setNotFoundHandler(` o `setErrorHandler(` están en `handlers/errores.ts`.
- **PR-CH-05f** (O-2, `guarda-todas-las-rutas.integracion.test.ts`): con `protegido()`, `//api/*`, `//api/:seccion/*`, `/api//*`, `/api//:seccion/*` y `///*` no arrancan, con el motivo de los dos primeros segmentos. Las rutas de producción siguen arrancando (PR-CH-05d). Los casos "segmentos vacíos delante del comodín" de `guarda-ch-r1` siguen en verde (aceptan "no arranca").

**Punto 11 · M-08, registros simultáneos del mismo enlace (Enmienda 3; solo si el humano elige la opción (i))**
- **PR-CH-10a** (programador, `servicio-ocupado.integracion.test.ts`): `enTransaccion(obtenerDb(), fn, { maxWait: 8_000 })` con las 10 conexiones del pool ocupadas por transacciones que el caso suelta a los 3 s: no rechaza, ejecuta `fn` y resuelve después de soltarlas. Sin la opción, el mismo montaje rechaza con `503 SERVICIO_OCUPADO` (control, como el caso del tester).
- **PR-CH-10b** (ídem): con un enlace vivo creado **antes** y el pool ocupado igual, una llamada directa al adaptador `registrarMaestroConEnlace` (usuario y sesión de prueba ya preparados, argon2 fuera) resuelve con `{ usuarioId }` después de soltar el pool, y una llamada directa a `revocarEnlaceRegistro` sobre otro enlace resuelve con el enlace revocado; ninguna rechaza con `503`. Se llama al adaptador y no a la ruta porque las consultas sin transacción que el handler hace antes esperan conexión sin límite (`pg-pool` sin `connectionTimeoutMillis`): por HTTP, la transacción encontraría el pool ya libre y el caso no distinguiría el `maxWait`. Cada caso retiene solo conexiones propias del proceso del archivo, con `timeout` explícito.
- **PR-CH-10c** (verificación): `enlaces-03b-r2.ataque`, "40 registros simultáneos con el mismo enlace: 40 × 201, 40 cuentas y ningún 5xx", en verde **sin cambios** en las 11 corridas de PR-CH-01b, sin ningún `P2028` de `maxWait` en `POST /api/auth/registro-maestro`. Los dos casos de T-07 de ese archivo (fila retenida con `FOR NO KEY UPDATE` y `FOR SHARE`) siguen en verde.

**Punto 12 · T-02, opciones de ruta (Enmienda 4, §E4-1)** — todos en `guarda-todas-las-rutas.integracion.test.ts` (programador), con apps sueltas en el orden de `app.ts` (`manejoDeErrores` y después `registrarMiddleware`), salvo que se diga otra cosa:
- **PR-CH-11a** (prohibidas): bajo `/api`, con `protegido()` y con `protegido({ pertenencia: "inscripcion" })` sobre `/clases/:claseId/x`, no arrancan y el error trae el motivo exacto de su grupo (tabla de §E4-1): `errorHandler`; `onSend` (función y arreglo; en `GET` y en un `HEAD` explícito); `preSerialization` (función y arreglo); `onError` (función y arreglo); `schema` con cada una de `body`, `querystring`, `params`, `headers` y `response`; `validatorCompiler`; `serializerCompiler`; `schemaErrorFormatter`; `childLoggerFactory`; `logSerializers`. Con `app.route` y con los atajos (`get`, `post`, `all`).
- **PR-CH-11b** (permitidas): `onResponse`, `onTimeout` y `onRequestAbort` (función y arreglo), `config`, `constraints: { version: "1.0.0" }`, `bodyLimit`, `logLevel`, `exposeHeadRoute: false`, `prefixTrailingSlash`, `handlerTimeout` y `attachValidation`: arrancan y, sin token, responden el `401` del envoltorio (`errorApiSchema`).
- **PR-CH-11c** (`HEAD` automático): un `GET` protegido con `exposeHeadRoute` por defecto arranca; `HEAD` de esa URL sin token responde `401`. El `onSend` interno que Fastify pone en ese `HEAD` es el único `onSend` que la guarda acepta (sonda de §E4-1).
- **PR-CH-11d** (mutación después de la guarda): `const opciones = protegido(); hijo.get(url, opciones, handler); opciones.preHandler.splice(0)` (y, aparte, `opciones.preHandler.push(…)`, y la misma mutación sobre el arreglo de `onResponse`): la app arranca y, sin token, la ruta responde `401` sin ejecutar el handler; la ruta usa la copia congelada que dejó la guarda.
- **PR-CH-11e** (públicas): las rutas de `RUTAS_PUBLICAS` con `onSend` o `errorHandler` propio siguen arrancando (exentas, como con T-12).
- **PR-CH-11f** (tester, ya escritos): los tres casos de `guarda-ch-r2.ataque`, "…y %s propio: o no arranca, o sin token responde el 401 del envoltorio", pasan a verde por "no arranca", sin cambiar el archivo; y los 5 casos de `nombres-guarda-r3.ataque` adaptados con A-13 (`onSend` ×2, `preSerialization` ×2, `onError` ×1: "no arranca"; los de `onResponse`, `onTimeout` y `onRequestAbort` siguen "arranca y 401").

**Punto 13 · T-03 y la familia de métodos de la instancia (Enmienda 4, §E4-2)** — en `guarda-todas-las-rutas.integracion.test.ts`:
- **PR-CH-12a**: después de `registrarMiddleware`, `addHook` con cada uno de `onRequest`, `preParsing`, `preValidation`, `preHandler`, `preSerialization`, `onSend`, `onError` y `onRoute` impide el arranque con el mensaje exacto de §E4-2, en un plugin con prefijo `/api`, en uno sin prefijo, en uno anidado y en uno con `fastify-plugin`.
- **PR-CH-12b**: después de `registrarMiddleware`, `addHook` con `onResponse`, `onTimeout`, `onRequestAbort`, `onReady`, `onListen`, `preClose`, `onClose` y `onRegister` arranca y las rutas protegidas siguen respondiendo `401` sin token; `onReady`, `onRegister` y `onResponse` corren de verdad (se comprueba con una marca; los demás solo corren al escuchar, al cerrar o ante un tiempo agotado o una petición abortada, y basta con que se registren sin error). Un nombre que Fastify no admite sigue dando el error de Fastify (`FST_ERR_HOOK_NOT_SUPPORTED`).
- **PR-CH-12c**: después de `registrarMiddleware`, cada uno de `setReplySerializer`, `setValidatorCompiler`, `setSerializerCompiler`, `setSchemaController`, `setSchemaErrorFormatter`, `setGenReqId`, `setChildLoggerFactory`, `addContentTypeParser` y `addConstraintStrategy` impide el arranque con el mensaje exacto; y `register(plugin, { logSerializers })` también.
- **PR-CH-12d** (lo permitido sigue): `decorate`, `decorateRequest`, `decorateReply`, `addSchema`, `addHttpMethod`, `removeContentTypeParser`, `register` con `prefix` y `logLevel`, y las rutas: arrancan. Con `construirApp` real: arranca, `@fastify/cookie` sigue leyendo y escribiendo la cookie de refresco (las pruebas de `auth-refresco.integracion` en verde) y `GET /api/me` sin token responde `401`.
- **PR-CH-12e** (estático, `higiene-de-pruebas.integracion.test.ts`): en `backend/src/**/*.ts`, sin `generated/` ni `*.test.ts`, las únicas líneas de código con `.addHook(` son `app.ts` (`onClose`) y `middleware/guarda-de-rutas.ts`; y ninguna llama a los métodos de PR-CH-12c.
- **PR-CH-12g** (estático, `higiene-de-pruebas.integracion.test.ts`; hermano H-8 de §E4-2): en `backend/src/**/*.ts`, sin `generated/` ni `*.test.ts`, la fábrica de Fastify (importación por defecto de `"fastify"`, `{ fastify }`, `import * as … from "fastify"`, `require("fastify")`, `import("fastify")`) solo aparece en `app.ts`; de `"fastify"` los demás archivos importan solo tipos, `errorCodes` y `LogController`; y `createRequire(…)("fastify/lib/…")` solo aparece en `middleware/guarda-de-rutas.ts`. El caso se controla con textos de ejemplo (formas que rechaza y que acepta), como PR-CH-01c.
- **PR-CH-12f** (tester, A-14): los dos casos de `guarda-ch-r2.ataque` ("setReplySerializer en un plugin…" y "addHook('onSend') en un plugin…") pasan a verde con la expectativa adaptada (`ACEPTABLE`: no arranca, o el `401` del envoltorio).

**Punto 14 · T-04 y T-05 (Enmienda 4, §E4-3)**
- **PR-CH-13a** (tester, A-9): el caso de C-1 con presupuesto de 60 s y tiempo límite de 75 s; nada más del archivo cambia.
- **PR-CH-13b** (programador): PR-CH-04c inserta su fila de prueba en `enlaces_registro` (un enlace con hash aleatorio) en lugar de `usuarios`, y comprueba que no existe después; su título y su criterio no cambian.
- **PR-CH-13c** (verificación): en cada corrida de la verificación, la duración del caso de C-1 (debe quedar por debajo de 60 s; si pasa de 40 s, se reporta).
- **PR-CH-14a** (programador, A-10; reemplaza el cuerpo de PR-B05 en `alumnos.integracion.test.ts`, mismo título): primero, fuera de toda transacción, `pg_indexes` de `public.usuarios` trae `usuarios_nombre_busqueda_idx` con una definición que contiene `USING gin (nombre_busqueda gin_trgm_ops)` y `usuarios_rol_idx` sobre `(rol)`. Después, en una transacción que se revierte (`timeout: 15000`), una tabla temporal `pr_b05_usuarios` (`ON COMMIT DROP`) con las columnas que lee la consulta (`id uuid`, `nombre text`, `email text`, `rol rol_usuario`, `activo boolean`, `nombre_busqueda text`), los dos índices con la **misma** definición (`USING gin (nombre_busqueda gin_trgm_ops)` y `(rol)`), 20,000 filas de `estudiante` activos con `nombre_busqueda` `'alumno ' || g`, `ANALYZE pr_b05_usuarios`, `SET LOCAL enable_seqscan = off` y `EXPLAIN (FORMAT JSON)` de la consulta con la forma de Prisma sobre esa tabla: el plan menciona el índice de trigramas de la tabla temporal. El mensaje del fallo imprime el plan. No se usa `CREATE TABLE … (LIKE usuarios …)`, porque retendría `AccessShareLock` sobre `usuarios` toda la transacción.
- **PR-CH-14b** (verificación): PR-B05 en verde en todas las corridas, sin insertar en `usuarios` (lo comprueba la lectura del diff por el manager).

**Pruebas de autorización por endpoint:** no hay endpoint nuevo. La guarda está cubierta por PR-CH-05; las rutas existentes siguen cubiertas por sus `*-autorizacion.integracion` y `*.ataque`, que deben quedar en verde.

## Ronda 0 del tester (antes del programador; autorización A-1)
Base: V-01 contra la tabla de 107 hashes de CLASES-01 (S-7). El tester entrega la tabla nueva (107 archivos) como base de V-01 del programador. Solo cambia lo que dice cada C-n; ninguna otra línea de esos archivos.

| # | Archivo y caso | Cambio | Resultado esperado tras la ronda 0 |
|---|---|---|---|
| C-1 | `backend/test/cuentas-r1.ataque.test.ts`, "con la tabla usuarios bloqueada por otra transacción, recuperar responde igual y a tiempo" (líneas 125-139) | `NOWAIT` y reintento acotado, con el criterio exacto de §D-1. Aserciones iguales; tiempo límite del caso 45 s | Verde |
| C-2 | `backend/test/guarda-r2.ataque.test.ts`, "prefijos //api o /API (errores de tecleo) no atienden /api/*: sin bypass efectivo" (líneas 148-155) | Con M-15 esas dos rutas ya no arrancan. La propiedad se endurece: registrar `/x` sin `protegido()` bajo `//api` o bajo `/API` impide el arranque con `no pasa por protegido() (AGENTS.md, regla 2)`. El título cambia a uno que lo diga | **Rojo esperado** hasta el paso 9 del programador |
| C-3 | `cuentas-r2.ataque.test.ts:92-136`, `cuentas-r3.ataque.test.ts:146-200` y `cuentas-03a-r1.ataque.test.ts:165-209`: la consulta de "formada" de su `conFilaRetenida` | El mismo filtro de §D-3 (`wait_event_type = 'Lock'` y `wait_event IN ('transactionid', 'tuple')`, en los dos niveles). Nada más del archivo cambia | Verde |
| C-4 | Los cinco `*.ataque` con errores de tipos que midió el manager (M-01): `backend/src/config/logger.ataque.test.ts` (`pino.Logger`), `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` (TS7024), `backend/test/worker-03c-r1.ataque.test.ts`, `backend/test/worker-r1.ataque.test.ts` y `backend/test/worker-r2.ataque.test.ts` (los tres por `deadLetter` en las opciones de `asegurarCola`) | Solo tipos, con la regla del paso 3 (anotaciones, genéricos, precondiciones `expect` + `throw`, `as` solo con su comentario); ni aserciones, ni valores, ni lógica. Se mide antes y después con un `tsconfig` provisional fuera del repositorio (en el scratchpad, equivalente al de §D-6, con rutas absolutas y `typeRoots` explícitos). Si apareciera un `*.ataque` con errores fuera de estos cinco (PA-02), el tester vuelve a esta fila y lo reporta | Verde; el `tsconfig` provisional sin errores en ningún `*.ataque` |

Además, en la ronda 0:
- **I-1, inventario de "Error no controlado":** en la **corrida completa final de la ronda 0**, ya con C-1, C-3 y C-4 aplicados y con C-2 como único rojo esperado (Enmienda 1, M-04: antes de C-1 la cadena tumba 2 de cada 3 corridas), y siempre antes de cualquier cambio del programador, cada línea `"Error no controlado"` con su ruta y su llamada. Se separan las que son `P2028` (pasarán a `warn`) de las que provocan a propósito pruebas existentes (por ejemplo, `GET /prueba/error-comun` de `salud.integracion`, que pasará a `/api/prueba/error-comun`). El inventario resultante es la lista cerrada de (b) en PA-07.
- **PA-07 y PA-12** como en §D-8 y "PARADAS".

## Verificación de la espera en cadena (PR-CH-01b)
**Nunca se corren dos suites a la vez** (`AGENTS.md`, "Pruebas"). Cada corrida empieza cuando terminó la anterior y no hay otra corrida del frontend ni del backend en marcha.
- **Comando:** `cd backend; npm test > <scratchpad>/chore02-back-N.txt 2>&1`, una tras otra. Antes de la primera, la regla del firewall de Ryuk (PA-01).
- **Quién y cuántas:** el programador, **5 corridas completas seguidas** al terminar; el manager, **3 seguidas** al verificar el resumen; el tester, **al menos 3 seguidas** en cada ronda. Ninguna se descarta ni se repite "por la cadena".
- **Criterio de cada corrida:**
  - `Test Files  <F> passed (<F>)` y `Tests  <T> passed (<T>)`, sin `failed` ni `timed out`;
  - `F` = **124** (120 de partida, más `adapters/db/errores.test.ts`, `servicio-ocupado.integracion.test.ts`, `guarda-todas-las-rutas.integracion.test.ts` y `higiene-de-pruebas.integracion.test.ts`);
  - `T` = 1300 más las pruebas nuevas, con la cifra exacta de `cd backend; npx vitest list`, contada como en los resúmenes de CLASES-01 (el resumen trae el comando y la cifra; ninguna se calcula a mano);
  - PA-07 limpia con el conteo por término;
  - la duración de PR-B05 y del caso de C-1 (PR-CH-02).
- **Cuenta de las 11 (Enmienda 4, arbitraje del manager de la ronda 2):** una corrida con cualquier rojo (`failed` o `timed out`) **no cuenta** como limpia, aunque el rojo sea de un ataque nuevo o de una prueba ajena. Toda enmienda que cambie código de producción **reinicia la cuenta** sobre el código final: las 9 corridas limpias anteriores a la Enmienda 4 se cierran ahí, y la serie vuelve a empezar con las 5 del programador (paso 15), las 3 del manager y al menos 3 del tester en la ronda 3, todas sobre el mismo código.
- **Por qué 5 + 3 + 3:** antes, la cadena tumbaba 2 de cada 3 corridas. Con 11 corridas limpias seguidas, la probabilidad de no verla si siguiera ahí es menor que 1 en 100,000.
- **Frontend:** una corrida, `cd frontend; npm test`, después de las del backend: debe dar **104 / 1396** sin cambios (ningún archivo del frontend cambió). `npm run lint` y `npm run build` desde la raíz, con código 0.

## PARADAS (para el programador; el tester y el manager las aplican en lo que les toca)
| ID | Te detienes y reportas si… |
|---|---|
| PA-01 | La regla del firewall de Ryuk no está aplicada en el perfil de la red actual (`Get-NetFirewallRule` y `Get-NetConnectionProfile`), antes de cualquier corrida del backend |
| PA-02 | `tsc -p tsconfig.test.json` da errores en algún `*.ataque`. No lo tocas: lo corrige el tester (C-4) |
| PA-03 | PR-CH-04c muestra que la expiración no llega como `PrismaClientKnownRequestError` con `P2028` (otra clase, otro código, o un error del adaptador). Reportas la forma exacta (clase, `code`, `meta` sin datos) y esperas al arquitecto |
| PA-04 | Al invertir la guarda, falla el arranque por una ruta que no registra nuestro código (Fastify o un plugin) |
| PA-05 | Se rompe una prueba normal fuera de la lista de A-4 (por ejemplo, una con una lista cerrada como E6 de `bloqueo-usuario`), o cualquier `*.ataque` fuera de las de C-1 a C-4 |
| PA-06 | Necesitas tocar un archivo que no está en "Cambios por capa", agregar una dependencia, cambiar `vitest.config.ts`, `global-setup.ts` o `setup.ts`, o cambiar el `timeout` de una prueba existente para que pase |
| PA-07 | §D-8 |
| PA-08 | Ibas a correr dos suites a la vez |
| PA-09 | Una prueba nueva tuya da resultados distintos en dos corridas (aislada y completa) |
| PA-10 | El cambio de `handlers/errores.ts` produce una línea de log con una contraseña, un token o un valor del cuerpo de la petición (lo comprueban los `logs-*.ataque` y PR-CH-04g) |
| PA-11 | Un proceso de larga vida que no arrancaste ocupa un puerto que necesitas |
| PA-12 | Una corrida completa del backend cae por tiempos límite, o sale un rojo intermitente en cualquier archivo: no repites la corrida para "limpiarla"; la reportas completa (archivo, caso, duración, PA-07) |

## Puntos de ataque para el Tester
### Exigen cambiar `*.ataque` existentes (ronda 0)
C-1 a C-4 de "Ronda 0 del tester". Nada más de los 107 archivos cambia en la ronda 0.

### Para las rondas (archivos nuevos `*.ataque`)
1. **La cadena, de verdad:** corridas completas seguidas (al menos 3, PR-CH-01b), con el equipo cargado si es posible, y con las retenciones más largas de la suite activas. Buscar cualquier otra prueba que forme una cola delante de las demás: bloqueos de tabla por otras vías (`TRUNCATE`, `ALTER TABLE`, `VACUUM FULL`, `REINDEX`, `CLUSTER`, `CREATE INDEX` sin `CONCURRENTLY`) sobre tablas compartidas; retenciones sin `timeout` explícito; retenedoras que esperan a la aplicación con el pool agotado (12 o más peticiones en paralelo).
2. **El reintento de C-1:** que no se forme nunca (un sondeo de `pg_locks` durante el caso no debe mostrarlo con `granted = false`), que el presupuesto no se agote en la suite completa, y que no esconda un `recuperar` que sí toque `usuarios` (si recuperar leyera `usuarios`, el caso debe seguir fallando por tiempo).
3. **"Formada":** formas de esperar una fila que el filtro no reconozca (una espera por llave foránea, por índice único, por `FOR KEY SHARE`, por la tupla de un segundo o tercer proceso) y que dejarían una prueba de `bloqueo-usuario` esperando 10 s y fallando su precondición.
4. **`P2028` → `503` en todas las transacciones:** login, refrescar, restablecer, establecer-contraseña, registro, registro de maestro, cambiar-contraseña, restablecimiento y corrección de correo del admin, enlaces de registro (crear, revocar, registrarse), invitación individual y en lote, alta y baja de alumnos, crear y borrar publicaciones, comentar y borrar comentarios, confirmar archivos, y el worker de recuperación. En cada una: nunca `500`, el cuerpo con el formato de la API, nada escrito ni encolado, el pool sano después. Ojo con la invitación en lote: retener su bloqueo consultivo afecta a otros archivos (ver PR-CH-04).
5. **La otra cara del `P2028`:** el `maxWait` (pool agotado, la transacción no empieza) también debe dar `503`; que un `503` no se pueda distinguir por tiempo o por cuerpo de otro (no es un oráculo de existencia de la cuenta o de la sesión); que un `AppError` lanzado a propósito dentro de la transacción no se convierta en `503`; que un `enTransaccion` anidado no traduzca dos veces.
6. **El log:** que el `P2028` se registre en `warn` con `"code":"P2028"` y el `codigo`, sin contraseñas, tokens, correos ni el cuerpo; que los `AppError` sin causa sigan sin registro; que un `500` común siga en "Error no controlado".
7. **La guarda:** rutas fuera de `/api` sin `protegido()` con cualquier forma (`//`, mayúsculas, `ignoreTrailingSlash`, prefijos partidos, `app.route` con `method` en arreglo, `all`, `HEAD` explícito, la raíz `/`), parámetros con expresión en los dos primeros segmentos, comodines pegados, y cualquier forma de registrar una ruta que atienda `/api/clases/<id>/…` sin `:claseId` y arranque. Que todas las rutas de producción sigan arrancando y respondiendo igual.
8. **N-01:** variantes de la query (`?HOST=`, `&host=`, `%68ost=`, un `?` vacío, `#` en lugar de `?`), y hosts locales escritos de otra forma que el motivo no deba aceptar o rechazar por error.
9. **N-03:** que `npm run lint` falle de verdad con un error de tipos en `backend/test/` (comprobarlo sobre una copia fuera del repositorio, nunca editando un archivo real).

## Riesgos y desacuerdos
- **R-1. `NOWAIT` puede tardar en obtener el bloqueo** con la suite cargada (§D-1). Mitigación: presupuesto de 30 s y un fallo de un solo caso con mensaje claro. Si en las 11 corridas de verificación el caso tarda más de 10 s alguna vez, el tester lo reporta y se revisa el presupuesto.
- **R-2. Un `P2028` por error de programación también da `503`** (§D-4). Queda en el log con su causa y lo atrapan las pruebas del flujo.
- **R-3. Un `503` de `/auth/refrescar` cierra la sesión en el frontend**, igual que hoy con `500` (S-2). Pendiente con destino para `services/apiClient.ts`.
- **R-4. La guarda nueva obliga a los plugins transversales** a declarar sus rutas en `RUTAS_PUBLICAS` (`OPTIONS *` de `@fastify/cors`), como ya dice `middleware/README.md`. Ahora vale también fuera de `/api`.
- **R-5. La regla de los dos primeros segmentos prohíbe para siempre rutas como `/api/:recurso`.** Ninguna está planeada; ADMIN y CLASES-02 usan segmentos literales. Si un encargo la necesitara, se discute con la regla de `:claseId` delante.
- **R-6. `tsconfig.test.json` destapa 41 errores de tipos en 22 archivos** (medido por el manager, M-01). Con la opción (a), el diff crece en 17 pruebas normales y 5 `*.ataque`, todos solo en tipos; el riesgo es que un "arreglo de tipos" cambie lo que prueba un caso. Lo acotan la regla de "solo tipos" del paso 3, la revisión del manager sobre el diff de esos archivos y, para los `*.ataque`, la ronda 0. Si el humano prefiere no asumirlo, la alternativa (b) de §D-6.
- **R-7. Las pruebas de `P2028` agregan unos 18 s a la suite** (PR-CH-04c a 04f, de unos 6 s cada una). Retienen solo filas propias.
- **R-8. Sin `lock_timeout`, una espera de bloqueo en producción no tiene tope** (P-01). Hoy ningún flujo la produce.
- **Desacuerdos con ESSENTIALS:** ninguno. El plan agrega dos reglas (textos propuestos), no cambia ninguna.

## No se toca
Base `ee21252`. Nadie modifica en este encargo:
- `frontend/**`, `shared/**`, `infra/**`, `backend/prisma/**`, `backend/.env.example`.
- `backend/src/**`, salvo: `core/errores.ts`, `core/errores.test.ts`, `adapters/db/errores.ts`, `adapters/db/errores.test.ts` (nuevo), `adapters/db/cliente.ts`, `handlers/errores.ts`, `middleware/guarda-de-rutas.ts`, `middleware/rutas-publicas.ts` (solo el comentario) y, por el orquestador, `adapters/README.md` y `middleware/README.md`.
- `backend/test/**`, salvo los archivos de A-4 (las tres sublistas, cada una con su alcance: cambios de la prueba, solo tipos, solo el comentario) y los tres nuevos de "Cambios por capa", y los `*.ataque` de C-1 a C-4 (solo el tester, en la ronda 0; en C-4, solo tipos). En `bloqueo-usuario.integracion.test.ts`, la lista cerrada de E6 no se toca. **Enmienda 4:** además, con A-10, el cuerpo del caso PR-B05 de `alumnos.integracion.test.ts` (programador; nada más del archivo); con A-9, el presupuesto y el tiempo límite del caso de C-1 de `cuentas-r1.ataque.test.ts`; con A-13, los 5 casos de `nombres-guarda-r3.ataque.test.ts`; y con A-14, los 2 casos de `guarda-ch-r2.ataque.test.ts` (los tres, solo el tester).
- `backend/src/**/*.test.ts`, salvo `core/errores.test.ts`, el nuevo `adapters/db/errores.test.ts` y, solo el tester en C-4, `config/logger.ataque.test.ts`.
- `backend/vitest.config.ts`, `backend/test/global-setup.ts`, `backend/test/setup.ts`, `backend/test/preparar-cola.ts`, `backend/tsconfig.json`.
- `backend/package.json`, salvo el script `typecheck`. `package.json` de la raíz y `package-lock.json`.
- `eslint.config.mjs`, `tsconfig.base.json`, `.prettierignore`.
- `CLAUDE.md`, `.claude/agents/**`, `docs/PRD.md`, `docs/DESIGN.md`, `README.md`.
- `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md` y `AGENTS.md`, salvo los textos propuestos, que aplica el orquestador con autorización del humano y registra con su SHA-256 en `aprobacion.md`.
- Fuera de la verificación: `docs/trabajo/CHORE-02-pruebas-y-espera-en-cadena/**` y `docs/ESTADO.md`.

## Textos propuestos
Los aplica el orquestador, con autorización del humano, al cerrar el encargo (después del APROBADO del manager), y anota el SHA-256 de cada archivo resultante en `aprobacion.md`. Cada uno lleva su ancla literal.

### T-1 · `docs/ARCHITECTURE.md` §6 (viñeta de la guarda de `:claseId`, línea 221)
Reemplazar la última frase de la viñeta:
> Los comodines generales (`/api/*`, `/api/:seccion/*`) quedan para la guarda sobre todas las rutas (CHORE-02).

por:
> Desde CHORE-02, la guarda revisa **toda** ruta, con cualquier URL, no solo las que pueden atender `/api/*` (M-15): fuera de la lista pública, ninguna arranca sin la cadena completa, y ninguna puede tener un parámetro o un comodín en sus dos primeros segmentos (`/api/*`, `/api/:seccion/*`, `/:seccion/*`, `*`), porque atendería `/api/clases/…` sin la regla de `:claseId`.

### T-2 · `docs/ARCHITECTURE.md` §14, "Reglas de acceso a datos"
Insertar, justo después de la viñeta que empieza con `- **Protocolo de bloqueo por usuario.**`, esta viñeta:
> - **Transacción que expira (`P2028`).** Toda transacción interactiva se abre con `enTransaccion` (`adapters/db/cliente.ts`), el único `$transaction` de `backend/src`. Si expira esperando un bloqueo (pasa su límite de 5 s) o no obtiene una conexión a tiempo, Prisma la revierte y `enTransaccion` lanza `503 SERVICIO_OCUPADO` ("El servicio está ocupado en este momento. Inténtalo de nuevo en unos segundos."), nunca `500`: nada se escribió ni se encoló. El envoltorio de errores lo registra en `warn` con el error original. La espera no se acota con `lock_timeout` (CHORE-02).

### T-3 · `docs/ARCHITECTURE-ESSENTIALS.md`
- En "Autorización (orden fijo, siempre en backend)", al final de la lista de viñetas (después de la que empieza con ``- `requireMembership`: estudiante inscrito``), agregar:
  > - Una guarda `onRoute` no deja arrancar la API si una ruta no pública, con cualquier URL, no empieza por la cadena completa o tiene un parámetro o un comodín en sus dos primeros segmentos (CHORE-02).
- En "Reglas de datos", después de la viñeta que empieza con `- Transacciones que crean, rotan o revocan sesiones en bloque`, agregar:
  > - Toda transacción se abre con `enTransaccion` (`adapters/db`). Si expira esperando un bloqueo o una conexión (`P2028`), responde `503 SERVICIO_OCUPADO`, nunca `500`.

### T-4 · `AGENTS.md`
- **"Comandos"**, bloque del backend. Ancla:
  ```
  npm run build
  npm run lint
  npm run test             # Vitest:
  ```
  La línea `npm run lint` pasa a: `npm run lint             # ESLint, Prettier y tsc de src/ y de las pruebas (tsconfig.test.json)`.
- **"Pruebas"**, la viñeta que empieza con `- **Nunca se corren dos suites a la vez**`: reemplazar ``la carga tumba el backend por la espera en cadena de `LOCK TABLE usuarios` (CHORE-02) y la corrida deja de ser verificable`` por ``la carga deja la corrida sin verificar (antes de CHORE-02, además tumbaba el backend por la espera en cadena de `LOCK TABLE usuarios`)``. El resto de la viñeta no cambia.
- **"Pruebas"**, viñeta nueva, justo antes de la que empieza con `- **Nunca se corren dos suites a la vez**`:
  > - **Bloqueos en las pruebas (CHORE-02).** Ninguna prueba pide un bloqueo de tabla (`LOCK TABLE`) que pueda esperar: solo con `NOWAIT` y un reintento acotado, para no formar una cola delante de las demás pruebas (lo comprueba `higiene-de-pruebas.integracion.test.ts`). Una retención deliberada de una fila da por formada una operación solo cuando un proceso espera **esa fila** (`wait_event` `transactionid` o `tuple`), nunca por cualquier proceso bloqueado detrás (`formadasDetrasDe` de `backend/test/ayudas-concurrencia.ts`). Toda transacción de una prueba que retiene filas o bloqueos pasa un `timeout` explícito mayor que su espera más larga.

### T-5 · `backend/src/adapters/README.md`
Insertar, justo antes de la línea ``## `db/clases.ts` (CLASES-a, §D-0.1 y §D-A2)``, esta sección:
> ## `db/cliente.ts`: `enTransaccion` y el `P2028` (CHORE-02)
>
> `enTransaccion` es el único `$transaction` de `backend/src` (lo comprueba
> `higiene-de-pruebas.integracion.test.ts`). Al abrir la transacción le agrega
> `.catch(traducirErrorDeTransaccion)` (`db/errores.ts`): un `P2028` (la transacción expiró, por
> ejemplo esperando la fila de un usuario detrás de otra transacción, o no obtuvo conexión dentro de
> su `maxWait`) se lanza como `AppError 503 SERVICIO_OCUPADO` con el error original como `cause`.
> Prisma ya revirtió la transacción, así que nada se escribió ni se encoló. Cualquier otro error,
> incluido un `AppError` que la función lance a propósito, se relanza tal cual. Un `enTransaccion`
> anidado no traduce: lo hace el de afuera. El envoltorio de `handlers/errores.ts` registra ese
> `AppError` en `warn` con su causa ("Error controlado del servidor"). La espera de bloqueo no se
> acota con `lock_timeout`: en producción ningún flujo retiene la fila de un usuario más que unas
> pocas sentencias.

### T-6 · `backend/src/middleware/README.md`
- En "Guarda `onRoute` (`guarda-de-rutas.ts`)", reemplazar
  > Toda ruta que
  > pueda atender `/api/*` (su `url` empieza por `/api`, o su primer segmento es un parámetro como
  > `/:seccion/...` o un comodín) y no esté en `RUTAS_PUBLICAS` debe empezar por la **cadena completa**

  por
  > Toda ruta, con
  > cualquier URL y no solo bajo `/api` (M-15, CHORE-02), que no esté en `RUTAS_PUBLICAS` debe empezar por la **cadena completa**
- En "Ampliación de DEC-16", reemplazar la viñeta
  > - también en las rutas cuyo primer segmento es un parámetro o un comodín, porque pueden atender
  >   `/api/*`;

  por
  > - en toda ruta, con cualquier URL, no solo en las que pueden atender `/api/*` (M-15, CHORE-02);
- En "Regla de `:claseId`", reemplazar ``Toda ruta que pueda atender `/api/*` y no sea pública debe llevar el sexto paso`` por `Toda ruta no pública debe llevar el sexto paso`.
- Insertar, justo antes de `### Límite: hooks de plugin`, esta subsección:
  > ### Parámetros y comodines en los dos primeros segmentos (CHORE-02)
  >
  > Ninguna ruta no pública puede tener un parámetro (`:`) o un comodín (`*`) en sus dos primeros
  > segmentos (`/api/*`, `/api/:seccion/*`, `/:seccion/*`, `*`, `/api*`): con `protegido()` y sin
  > una ruta más específica, atendería `/api/clases/<id>/…` sin la regla de `:claseId`. Es la última
  > regla de la guarda; si falta la cadena o el sexto paso, gana ese motivo. El arranque falla con
  > `La ruta <METODO> <url> tiene un parámetro o un comodín en sus dos primeros segmentos (AGENTS.md, regla 2)`.
- En "Orden de los plugins transversales", en la viñeta de `@fastify/cors`, reemplazar ``que la guarda trata como ruta que puede atender `/api/*`:`` por `que la guarda revisa como cualquier otra ruta:`.

### T-6 ter · `backend/src/middleware/README.md` (Enmienda 4, T-02 y T-03; lo aplica el orquestador junto a T-6 y T-6 bis)
- En "Guarda `onRoute` (`guarda-de-rutas.ts`)", reemplazar
  > Esas rutas
  > tampoco pueden declarar hooks de ruta que Fastify ejecuta antes que `preHandler` (`onRequest`,
  > `preParsing`, `preValidation`), porque podrían responder sin pasar por la cadena; los hooks
  > posteriores (`preSerialization`, `onSend`, `onResponse`) sí se permiten.

  por
  > Esas rutas
  > tampoco pueden declarar las opciones de ruta que pueden responder o rehacer la respuesta fuera de
  > la cadena, o que corren con la petición antes que ella (lista cerrada en "Opciones de ruta",
  > abajo); solo se permiten `onResponse`, `onTimeout` y `onRequestAbort`, que corren cuando la
  > respuesta ya salió o ya no puede salir (CHORE-02, T-02).

  (El corte de línea del texto actual puede variar: el ancla es la frase completa desde "Esas rutas tampoco pueden declarar" hasta "sí se permiten.".)
- Reemplazar la sección completa `### Límite: hooks de plugin` (desde ese encabezado hasta antes de `### Orden de los plugins transversales`) por:
  > ### Opciones de ruta (CHORE-02, T-02)
  >
  > Prohibidas, con su motivo:
  > - `onRequest`, `preParsing`, `preValidation`: corren antes de `protegido()` y podrían responder
  >   (T-12).
  > - `errorHandler`, `onSend` (salvo el que Fastify agrega a la ruta `HEAD` automática para vaciar el
  >   cuerpo), `preSerialization`, `onError`: corren después de la cadena y pueden cambiar el estado,
  >   el cuerpo o los encabezados de su `401`/`403`.
  > - `schema`, `validatorCompiler`, `serializerCompiler`, `schemaErrorFormatter`: validan antes de
  >   `preHandler` o serializan la respuesta fuera de la cadena (los handlers validan con zod).
  > - `childLoggerFactory`, `logSerializers`: corren con la petición antes de la cadena.
  >
  > Permitidas: `method`, `url`, `handler`, `preHandler` (la cadena primero), `config`,
  > `constraints`, `bodyLimit`, `handlerTimeout`, `logLevel`, `exposeHeadRoute`,
  > `prefixTrailingSlash`, `attachValidation` (sin `schema` no hace nada), `onResponse`,
  > `onTimeout` y `onRequestAbort`. La guarda reemplaza las listas de hooks de la ruta por una copia
  > congelada, así que mutar después el arreglo de `protegido()` no cambia la ruta. Las rutas
  > públicas están exentas, como con T-12.
  >
  > ### Hooks y métodos de la instancia (CHORE-02, T-01 y T-03)
  >
  > `registrarMiddleware` reemplaza en la instancia raíz, y todos los contextos lo heredan:
  > - `addHook` de `onRequest`, `preParsing`, `preValidation`, `preHandler`, `preSerialization`,
  >   `onSend`, `onError` (pueden responder o rehacer la respuesta) y `onRoute` (podría cambiar una
  >   ruta después de que la guarda la revisó). Se siguen permitiendo `onResponse`, `onTimeout`,
  >   `onRequestAbort`, `onReady`, `onListen`, `preClose`, `onClose` y `onRegister`.
  > - `setNotFoundHandler` y `setErrorHandler` (T-01), `setReplySerializer`, `setValidatorCompiler`,
  >   `setSerializerCompiler`, `setSchemaController`, `setSchemaErrorFormatter`, `setGenReqId`,
  >   `setChildLoggerFactory`, `addContentTypeParser` y `addConstraintStrategy`; y `register` con
  >   la opción `logSerializers`.
  >
  > Cualquiera de ellos, llamado después, impide el arranque. Un plugin transversal que los necesite
  > (`@fastify/cookie` hoy; `@fastify/cors`, `@fastify/rate-limit` o compresión después) se registra
  > **antes** de `registrarMiddleware`, como `manejoDeErrores`: sus hooks quedan en la raíz y la
  > guarda revisa sus efectos sobre cada ruta.
  >
  > ### Límite (riesgo aceptado)
  >
  > La guarda solo ve la API de Fastify. Quedan a la revisión de código: escribir directo en el
  > servidor HTTP de Node (`app.server.on("request" …)`, `"checkContinue"`, `"upgrade"`) o en el
  > socket de una petición, y usar los símbolos privados de Fastify.
- En "Orden de los plugins transversales", reemplazar ``- `@fastify/rate-limit` se registra con `hook: "preHandler"`, no con su `onRequest` por defecto;`` por ``- `@fastify/rate-limit` se registra antes de `registrarMiddleware` y con `hook: "preHandler"`, no con su `onRequest` por defecto (no está instalado: el encargo que lo agregue comprueba cómo añade su hook a las rutas y que la guarda lo acepta);``.

### T-7 · `README.md`
Sin cambios: ningún comando cambia (el de `lint` es el mismo; T-4 documenta lo que comprueba).

## Pendientes para `docs/ESTADO.md` (los registra el orquestador al cerrar)
- **Se cierran** las filas de §3 con destino CHORE-02: N-01, N-03, (e) y (f), A3, "Dos pruebas previas a CLASES fallan con el equipo cargado" (con la nota de que `ritmo-03c-r1` y las esperas `worker-*` quedan a observación por PA-12), el `500` de `cambiar-contrasena`, los otros `P2028` y los comodines generales con M-15. También se retira "guarda sobre todas las rutas" de la fila "`pagos`, `admin`, `clases`, `LIMPIEZA_DIARIA`, guarda sobre todas las rutas…".
- **Filas nuevas:**
  | Pendiente | Destino |
  |---|---|
  | Un `503` de `/auth/refrescar` cierra la sesión en el frontend (`pedirRefresco` limpia el token ante cualquier respuesta que no sea `200`); con `SERVICIO_OCUPADO` convendría conservarla y reintentar (R-3) | El próximo encargo que toque `services/apiClient.ts` |
  | Acotar la espera de bloqueo en producción (`lock_timeout`), con los datos de contención del log (`warn` "Error controlado del servidor") (P-01) | DEPLOY |
  | PA-07 con la definición de §D-8 en todo plan futuro | Todo encargo con backend |
  | CLASES-02: la excepción de la guarda para el admin no puede relajar la cobertura de toda ruta ni la regla de los dos primeros segmentos (§D-5) | CLASES-02 |
- **Siguen con su destino:** M-02 de DESIGN-01b (si P-02 queda en (a)) y las "Opcionales" de CHORE-01 (si P-03 queda en (a)).
- **Filas nuevas de la Enmienda 1 (detalles menores del manager):**
  | Pendiente | Destino |
  |---|---|
  | El comentario "Fuera de /api: la guarda onRoute no aplica" de `sesiones-y-cadena.ataque.test.ts:87` deja de ser cierto con M-15 (sus rutas llevan `protegido()` y siguen pasando); es `*.ataque`, así que es del tester | La próxima ronda 0 que toque ese archivo |
  | Otros `AppError` de servidor que traducen un error de proveedor (`CORREO_NO_ENVIADO` 502, `BASE_DE_DATOS_NO_DISPONIBLE` 503) podrían llevar `causa` y registrarse con la misma regla de log de §D-4 | Sin encargo asignado (opcional) |
  | La definición de PA-07 de §D-8, con su control positivo, como regla permanente en `.claude/agents/tester.md` (hoy solo vive en este plan y en esta fila) | Decisión del humano; si la acepta, un cambio de documentos del orquestador |
- **Si el humano elige (b) en M-01:** fila nueva de N-03 con la medición de `revision.md` (41 errores en 22 archivos), destino "el primer `chore` de pruebas".
- **Filas nuevas de la Enmienda 3:**
  | Pendiente | Destino |
  |---|---|
  | O-1 de la ronda 1 del tester: la regla de PR-CH-01c no ve un comentario SQL entre `LOCK` y `TABLE` ni un `NOWAIT` que solo está dentro de un comentario SQL, y marca como "sin NOWAIT" una sentencia con la tabla entre comillas dobles dentro de un literal de plantilla (la `"` se toma como terminador). Hoy ninguna prueba cae en esos casos. Remedio propuesto: analizar los literales con el analizador de TypeScript (como las `*.ataque` que ya usan ESLint desde `backend/test/`), quitar los comentarios SQL del literal y cortar la sentencia en `;` o en el fin del literal | El primer `chore` de pruebas, o antes si una prueba nueva escribe un `LOCK` con la tabla entre comillas |
  | Pool de conexiones bajo una ráfaga (M-08, riesgo (b) de la ronda 1 del tester): mientras una ráfaga de transacciones en serie sobre una misma fila ocupa el pool (10 conexiones por defecto), las transacciones de **otras** rutas esperan conexión hasta su `maxWait` (2 s) y pueden recibir `503`, y las consultas sin transacción esperan sin límite (`pg-pool` sin `connectionTimeoutMillis`). Decidir el tamaño del pool, un `connectionTimeoutMillis` y si la API necesita un límite de concurrencia por ruta, con datos de producción | DEPLOY |
  | Los plugins transversales que llamen a `setErrorHandler` o `setNotFoundHandler` (ninguno de los previstos lo hace) se registran **antes** de `registrarMiddleware`, como `manejoDeErrores`; si no, la API no arranca (§E3-1) | Encargos de despliegue y CORS (ya avisados en `middleware/README.md`) |
  | La guarda no impide que un plugin restaure el comportamiento interno de Fastify por sus símbolos privados (`kFourOhFour`) ni que añada hooks con `addHook`; los dos quedan a la revisión de código, como ya dice "Límite: hooks de plugin" (**la parte de `addHook` la cierra la Enmienda 4, §E4-2; queda solo la de los símbolos privados**) | Sin encargo (riesgo aceptado, documentado) |
- **Filas nuevas de la Enmienda 4:**
  | Pendiente | Destino |
  |---|---|
  | Límite aceptado de la guarda (§E4-4): código que escribe directo en el servidor HTTP de Node (`app.server.on("request" …)`, `"checkContinue"`, `"upgrade"`) o en el socket de una petición (`request.raw.socket.write`) desde una función que corre antes de la cadena y que la guarda no bloquea; y los símbolos privados de Fastify. Ninguno pasa por la API de Fastify; quedan a la revisión de código | Sin encargo (riesgo aceptado, documentado en `middleware/README.md`) |
  | Plugins transversales previstos (`@fastify/cors`, `@fastify/rate-limit`, compresión): se registran **antes** de `registrarMiddleware`, como `manejoDeErrores` y `@fastify/cookie`; después, `addHook` de un hook de petición, `onRoute` o los métodos de §E4-2 no dejan arrancar la API. Al registrarlos, comprobar que la ruta `HEAD` automática y el `OPTIONS *` de CORS pasan la guarda | DEPLOY y el encargo de CORS |

## Pasos de implementación
Orden de `CLAUDE.md` (sin `shared/`, sin migración, sin `workers/` ni `features/`). Formateadores y comandos con `--write`/`--fix` solo desde `backend/` o con rutas concretas, nunca desde la raíz. Ningún commit: lo hace el humano al cerrar.

**Antes del programador**
0. **Orquestador:** registra en `aprobacion.md` la aprobación por escrito del plan, con A-1 a A-5 y las respuestas a P-01, P-02 y P-03.
1. **Tester, ronda 0:** V-01 contra la tabla de 107 hashes (S-7); PA-01; C-1, C-2, C-3 y C-4 (los cinco `*.ataque` de tipos, con el `tsconfig` provisional antes y después); corrida completa final del backend con C-2 como único rojo esperado, y de **esa** corrida, I-1 (Enmienda 1, M-04); tabla nueva de 107 hashes en `reporte-tester.md` (incluye los cinco de C-4). El manager la verifica antes del paso 2.

**Programador** (resumen verificable al final, con PR-CH-xx → archivo y título exacto, conteos de `npx vitest list`, y la última línea de `lint`, `test` y `build`)
2. **Base:** `git log -1 --oneline` en `feat/chore-02`; V-01 contra la tabla de la ronda 0; PA-01.
3. **N-03:** `backend/tsconfig.test.json` y el script `typecheck` (§D-6). `cd backend; npx tsc -p tsconfig.test.json`. Corrige los errores de las 17 pruebas normales de M-01 (las 15 de A-4 "solo tipos", más `enlaces-registro.integracion` e `invitacion-masiva.integracion`) con esta **regla de "solo tipos"** (Enmienda 1, M-01):
   - **se permite:** anotar tipos o genéricos (por ejemplo, `respuesta.json<T>()`, el tipo del `payload` o del resultado de `inject`); construir un objeto opcional sin la propiedad cuando su valor es `undefined` (`...(valor === undefined ? {} : { cookies: { … } })`) para cumplir `exactOptionalPropertyTypes`; resolver un `possibly null/undefined` con una **precondición** (`expect(x, "Precondición: …").not.toBeNull()` o `toBeDefined()`, seguida de `if (!x) throw new Error("Precondición: …")`); un `as` con un comentario que diga por qué es seguro;
   - **no se permite:** `!` sin comentario, `as any` o `as unknown as`, `@ts-ignore`/`@ts-expect-error`, un `return` temprano, cambiar una aserción, un valor esperado, una entrada o el orden de las operaciones, ni borrar o saltar un caso;
   - en `bloqueo-usuario.integracion.test.ts` (por ejemplo, el `possibly null` de la línea 277), la lista cerrada de E6 no se toca;
   - un error en un archivo fuera de los 22 de M-01: PA-05 (normal) o PA-02 (`*.ataque`). Los cinco `*.ataque` ya llegan corregidos de la ronda 0; si siguen con errores, PA-02.
   - Al terminar, `npx tsc -p tsconfig.test.json` sin errores (PR-CH-06b). En el mismo paso, el comentario de `middleware-orden.integracion.test.ts:36` (A-4) pasa a decir que sus rutas de prueba fuera de `/api` llevan `protegido()` porque la guarda revisa toda ruta (M-15).
4. **N-01:** `validarUrlDePruebas` y PR-CH-06a. `cd backend; npx vitest run test/entorno-de-pruebas.test.ts`.
5. **`core/errores.ts`:** la causa opcional y PR-CH-04b.
6. **`adapters/db/errores.ts`:** `traducirErrorDeTransaccion`, `MENSAJE_SERVICIO_OCUPADO` y PR-CH-04a (`adapters/db/errores.test.ts`).
7. **`adapters/db/cliente.ts`:** `enTransaccion` con el `.catch` (§D-4).
8. **`handlers/errores.ts`:** el registro en `warn` y PR-CH-04g.
9. **`middleware/guarda-de-rutas.ts`:** M-15 y la regla de los dos primeros segmentos (§D-5); el comentario de `rutas-publicas.ts`; adapta `salud.integracion.test.ts` (sus rutas a `/api/prueba/…` con `protegido()` y el token del admin); `guarda-todas-las-rutas.integracion.test.ts` (PR-CH-05a a 05e). Con esto, C-2 pasa a verde. Si falla el arranque por una ruta ajena: PA-04.
10. **`ayudas-concurrencia.ts`:** `formadasDetrasDe` (§D-3) y su uso en `conFilaRetenida`.
11. **`higiene-de-pruebas.integracion.test.ts`:** PR-CH-01c, PR-CH-03a y PR-CH-04h.
12. **`servicio-ocupado.integracion.test.ts`:** PR-CH-04c a 04f. Cada caso retiene solo filas propias, con `timeout` explícito, y su tiempo límite de Vitest cubre la retención (30 s). Si PR-CH-04c no ve un `P2028`: PA-03.
13. **(e), (f) y la paginación:** `invitacion-masiva.integracion.test.ts` (PR-CH-07a y 07b) y `enlaces-registro.integracion.test.ts` (PR-CH-08, con la ventana de 2000 y el ancla de §D-7; Enmienda 2). No uses una ventana por debajo de 1990 ni escribas en `enlaces-03b-r1.ataque.test.ts`.
13a. **Corrección de T-01 (Enmienda 3, §E3-1; A-2):** en `middleware/guarda-de-rutas.ts`, el bloqueo de `setNotFoundHandler` y `setErrorHandler` después de `registrarMiddleware`, y O-2 (segmentos vacíos); PR-CH-09b a 09e y PR-CH-05f; el texto T-6 bis para `middleware/README.md` lo aplica el orquestador. `cd backend; npx vitest run test/guarda-ch-r1.ataque.test.ts test/guarda-todas-las-rutas.integracion.test.ts test/higiene-de-pruebas.integracion.test.ts`: los dos casos de T-01 pasan a verde sin tocar el `*.ataque`.
13b. **M-08, solo si el humano eligió (i) (Enmienda 3, §E3-2; A-8 (i)):** `enTransaccion` con `{ maxWait }` opcional (`adapters/db/cliente.ts`, A-3) y `ESPERA_DE_CONEXION_DEL_ENLACE_MS = 10_000` en `registrarMaestroConEnlace` y `revocarEnlaceRegistro` (`adapters/db/enlaces-registro.ts`); PR-CH-10a y 10b. Si el humano eligió (ii), este paso no existe: el tester cambia el `*.ataque` con A-8 (ii) antes del paso 14.
13c. **Antes del programador, el tester (A-9, A-13 y A-14; Enmienda 4):** el presupuesto de C-1 en `cuentas-r1.ataque.test.ts` (PR-CH-13a); los 5 casos de `nombres-guarda-r3.ataque.test.ts` (PR-CH-11f); los 2 casos de `guarda-ch-r2.ataque.test.ts` (PR-CH-12f); tabla nueva de hashes de las 114 `*.ataque` en `reporte-tester.md`, base de V-01. Nada más de esos archivos cambia.
13d. **Corrección de T-02 y T-03 (Enmienda 4, §E4-1 y §E4-2; A-2):** en `middleware/guarda-de-rutas.ts`, la sonda del `onSend` interno de `HEAD`, la clasificación cerrada de opciones de ruta con su copia congelada, y el bloqueo de `addHook` (por nombre) y de los métodos de la instancia de §E4-2; PR-CH-11a a 11e y PR-CH-12a a 12e. El texto T-6 ter para `middleware/README.md` lo aplica el orquestador. `cd backend; npx vitest run test/guarda-ch-r1.ataque.test.ts test/guarda-ch-r2.ataque.test.ts test/nombres-guarda-r3.ataque.test.ts test/guarda-todas-las-rutas.integracion.test.ts test/higiene-de-pruebas.integracion.test.ts`: todo en verde.
13e. **T-04 y T-05 (Enmienda 4, §E4-3; A-10):** PR-CH-04c en `enlaces_registro` (PR-CH-13b) y PR-B05 sobre la tabla temporal (PR-CH-14a). `cd backend; npx vitest run test/servicio-ocupado.integracion.test.ts test/alumnos.integracion.test.ts`, tres veces aisladas.
14. **Por paquete:** `cd backend; npm run lint` y `cd backend; npm test` (una corrida). Si algo cae, se corrige antes de seguir; un rojo intermitente es PA-09 o PA-12.
15. **Verificación de la cadena:** las 5 corridas completas seguidas del backend de PR-CH-01b (con las cifras nuevas: 129 archivos de la ronda 1 del tester, más los casos de 13a y 13b; la cifra exacta, de `npx vitest list`), con PR-CH-10c si aplica, con su tabla (corrida, `Test Files`, `Tests`, duración, PA-07 por término y por sitio de cada `P2028`, el control positivo de §D-8 con los tres `P2028` de `servicio-ocupado`, duración de PR-B05 y del caso de C-1).
16. **Frontend y raíz:** `cd frontend; npm test` (104 / 1396, una vez y después del backend); `npm run lint` y `npm run build` desde la raíz.
17. **Resumen** en `docs/trabajo/CHORE-02-pruebas-y-espera-en-cadena/resumen-programador.md`, con los **hermanos** de cada remedio (la tabla de §D-3, la de (e) en §D-7 y los 17 archivos de tipos de M-01 con el patrón que corrigió en cada uno, una fila por sitio con "aplica / no aplica" y "aplicado / no aplicado"), las PARADAS una por una ("no se activó" o "se activó y me detuve") y la lista de archivos tocados contra "Cambios por capa".

**Después del programador**
18. **Manager:** verificación del resumen (sus 3 corridas seguidas del backend, una del frontend, `lint` y `build`; contrasta cada cifra); revisa el diff contra "No se toca" con base `ee21252` (fuera de `docs/trabajo/` y `docs/ESTADO.md`).
19. **Tester:** rondas de ataque con los puntos de arriba, al menos 3 corridas completas seguidas por ronda; PA-07 de §D-8. Máximo 3 rondas.
20. **Manager:** revisión final.
21. **Orquestador:** aplica T-1 a T-6 con autorización del humano, anota sus SHA-256 en `aprobacion.md`, actualiza `docs/ESTADO.md` con los pendientes de arriba y entrega al humano el bloque de `git status`, `git add` (rutas) y `git commit` con el mensaje `chore(pruebas): corta la espera en cadena, traduce P2028 a 503 y extiende la guarda a toda ruta (CHORE-02)`.

## Enmienda 1 (2026-10-02)
Respuesta a `revision.md`, "Revisión del Manager — CHORE-02 · pruebas y espera en cadena — plan" (CAMBIOS REQUERIDOS). Escrita por el arquitecto con `Edit` sobre el plan transcrito. No cambia nada de lo que el manager dio por bueno: `NOWAIT` (§D-1), la verificación con 11 corridas, `503 SERVICIO_OCUPADO` (§D-4), la guarda (§D-5, S-5), T-1 a T-6, A-2, A-3, A-5 ni la opción (a) de P-01, P-02 y P-03. Estado del plan: **LISTO**, pendiente de la confirmación del humano sobre M-01 (a).

| ID | Respuesta | Dónde cambió el plan |
|---|---|---|
| **M-01** (bloquea) | **Se planea con (a), que recomienda el manager; el humano la confirma al aprobar.** N-03 se queda: A-4 nombra los 15 archivos normales de la medición ("solo tipos") y suma el comentario de `middleware-orden.integracion:36`; C-4 nombra los 5 `*.ataque`; el paso 3 fija la regla de "solo tipos" (qué se permite y qué no; precondición `expect` + `throw`, nunca `!` sin comentario ni `return` temprano; E6 intacta); PR-CH-06b exige `tsc -p tsconfig.test.json` sin errores; V-01 y la tabla de la ronda 0 cuentan los cinco `*.ataque` de C-4. **Alternativa (b), en una línea:** sacar N-03 de CHORE-02 y dejarlo en `ESTADO.md` §3 con la medición (§D-6, último párrafo) | A-1, A-4, Alcance (fila 7), §D-6, "Cambios por capa" (`backend/`), PR-CH-06b, C-4, R-6, "No se toca", paso 1, paso 3, paso 17, "Pendientes" |
| **M-02** | Corregido. La fila retenida se crea y se confirma **antes** de abrir T1 (`crearUsuarioDePrueba` fuera de toda transacción); se quita "sin tocar `usuarios`": el caso retiene una fila propia de `usuarios`, que con C-1 solo hace reintentar al `NOWAIT`. §D-3 deja escrita la condición (una espera de fila solo existe sobre una fila ya confirmada) | PR-CH-03a, §D-3 |
| **M-03** | Aceptado. PA-07 tiene control positivo: el conteo solo vale si aparecen los tres `P2028` deterministas de `servicio-ocupado.integracion` (PR-CH-04d, 04e y 04f); si falta alguno, no se declara limpia, se reporta y se detiene. PR-CH-04c no cuenta, porque llama a `enTransaccion` sin pasar por HTTP y no deja línea de log | §D-8, paso 15 |
| **M-04** | Aceptado. I-1 sale de la corrida final de la ronda 0, con C-1, C-3 y C-4 aplicados y C-2 como único rojo esperado; sigue siendo anterior a todo cambio del programador | "Ronda 0 del tester" (I-1), paso 1 |
| **M-05** | Corregido. PR-CH-01c evalúa sentencias, no líneas: busca `LOCK` con o sin `TABLE` y con o sin `ONLY` sobre el texto del archivo sin comentarios, y exige `NOWAIT` dentro de la sentencia hasta su terminador, aunque esté en otra línea. La propia prueba se controla con textos de ejemplo (las formas que rechaza y las que acepta) | PR-CH-01c |
| **M-06** | Corregido, sin aceptar riesgo. Las dos páginas son deterministas: los cuatro enlaces del caso viven en una ventana propia de 1980 (la del tester es 1990) y la paginación arranca con el cursor de un ancla D; primera página exactamente `[C, B]`, segunda exactamente `[A]`. Las filas del pasado quedan al fondo de la lista global y no afectan a otras pruebas | §D-7, PR-CH-08, Alcance (fila 9), "Cambios por capa", paso 13 |
| Detalle menor: `alumnos-b-r1.ataque:947` | Agregado a los hermanos de (e): no espera a nadie, la conclusión no cambia | §D-7 (e) |
| Detalle menor: comentarios "Fuera de /api…" | `middleware-orden.integracion:36` entra en A-4 (solo el comentario, paso 3); `sesiones-y-cadena.ataque:87` queda como pendiente del tester | A-4, "Cambios por capa", "Pendientes" |
| Detalle menor: `causa` en otros `AppError` de proveedor | Fuera de alcance; pendiente opcional sin encargo | "Pendientes" |
| Detalle menor: PA-07 permanente | Pendiente para decisión del humano (moverla a `.claude/agents/tester.md`); no bloquea el encargo | "Pendientes" |

**Para el humano:** la única decisión nueva es confirmar M-01 (a) (N-03 dentro del encargo, con 17 pruebas normales y 5 `*.ataque` corregidas solo en tipos) o elegir (b). La fila de PA-07 permanente es opcional y puede decidirse al cerrar.

## Enmienda 2 (2026-10-02)
Respuesta a `revision.md`, "## Revisión de la Enmienda 1" (M-01 a M-06 resueltos; M-07 nuevo, bloquea). Escrita por el arquitecto con `Edit`. Solo cambia la ventana de fechas del caso de paginación de `enlaces-registro.integracion` y su criterio. Nada más del plan cambia. Estado del plan: **LISTO**, con la misma confirmación pendiente de M-01 (a).

### M-07 — La ventana de 1980 rompía `enlaces-03b-r1.ataque:593-614`
**Acepto el hallazgo.** El caso "enlaces con el mismo creado_en: recorrer la lista de 2 en 2 los devuelve todos…" pagina desde su ancla de `1990-01-01T00:00:00.001Z` hasta el final de la lista global (hasta 20 vueltas, hasta `siguienteCursor` nulo) y exige ver exactamente sus 6 enlaces de `1990-01-01T00:00:00.000Z`. Todo enlace con `creado_en` anterior a ese ancla entra en su recorrido. Los 4 de 1980 de la Enmienda 1 vivían hasta el `afterAll` de `enlaces-registro.integracion`; con los dos archivos en paralelo, el `*.ataque` veía 4 filas de más. Ese archivo no se toca en este encargo.

**Remedio:** la ventana pasa a `2000-01-01T00:00:00.000Z` (A en `base`, B en `+1 s`, C en `+2 s` y el ancla D en `+3 s`). Queda por encima del ancla de 1990, así que no entra en ese recorrido, y por debajo de todo enlace creado "ahora". La primera página (desde el cursor de D) sigue siendo exacta, `[C, B]`, porque entre D y A solo hay enlaces del caso. La segunda solo exige que su primer elemento sea A y que no aparezcan B, C ni D: debajo de 2000 pueden estar o no los enlaces de 1990 del tester, según el orden de los archivos.

**Dónde cambió:** §D-7 (viñeta de la paginación), PR-CH-08 y el paso 13. Por coherencia, también la viñeta de `enlaces-registro.integracion.test.ts` en "Cambios por capa" (solo decía "ventana de 1980"; ahora dice "ventana de 2000"). La fila M-06 de la tabla de la Enmienda 1 queda como registro histórico; la sustituye esta enmienda.

### Evidencia: pruebas que leen la lista global de `enlaces_registro`
Busqué en `backend/` (`*.test.ts`, normales y `*.ataque`) toda petición a `GET /api/admin/enlaces-registro` y toda lectura directa de la tabla (`enlaceRegistro.findMany`, `count`, `groupBy`, `aggregate` o `FROM enlaces_registro`). Las lecturas directas solo están en producción (`listarEnlacesRegistro`, `adapters/db/enlaces-registro.ts:41`) y en pruebas que leen o bloquean **una** fila por id (`enlaces-03b-r1:365`, `enlaces-03b-r2:111/113`, `ayudas-concurrencia.ts:48`). Ninguna prueba frontend toca la base.

| Prueba | Qué lee | ¿Choca con la ventana de 2000? |
|---|---|---|
| `enlaces-03b-r1.ataque:593-614` ("enlaces con el mismo creado_en…") | Desde el ancla de 1990 **hasta el final**; exige exactamente sus 6 | No: 2000 queda por encima del ancla. Con 1980 sí chocaba (M-07) |
| `enlaces-03b-r1.ataque:585-591` ("un cursor inexistente o que es el id de un usuario…") | Primera página con un cursor que no existe | No: solo exige estado `< 500` y ningún dato de usuario |
| `enlaces-03b-r1.ataque:568-583` (`it.each` de consultas inválidas) | Nada: todas responden `400` antes de consultar | No |
| `enlaces-03b-r1.ataque:450` ("se crea con 201 y no-store…") | Primeros 100 (`limite=100`) | No: solo exige `200` y que el cuerpo no traiga token, hash ni `estadoPago` |
| `enlaces-03b-r1.ataque:524-564` (autorización) | `GET` sin permiso | No: responde `401`/`403` sin listar |
| `logs-03b-r1.ataque:172-178` ("listar enlaces") | Primeros 5 | No: solo revisa los logs, no el contenido |
| `sesiones-y-cadena.ataque:523/536` | Inventario de rutas, sin token | No: no lista enlaces |
| `enlaces-registro.integracion:165-188` ("registrados correcto…") | Primeros 100 | No: busca su enlace creado "ahora", que queda por encima de 2000 |
| `enlaces-registro.integracion:147-163` (`limite` 0 y 101) | Nada: `400` | No |
| `enlaces-registro.integracion:317-318` (autorización) | `GET` sin permiso o con permiso, sin aserción de contenido | No |
| `enlaces-registro.integracion:100` (el propio caso) | Desde su ancla D, dos páginas | Es el caso que cambia |

**Otras fechas fijas en `creado_en` de un enlace:** solo la ventana de 1990 de `enlaces-03b-r1:594-597`. Las demás fechas fijas del backend no son de enlaces (`creadoEn` de `archivos` en `archivos-d-r1:391` y `archivos.integracion:384`, `creadoEn` de un `usuario` en `enlaces-registro.integracion:242`, el token de 2100 de `invitacion-masiva.integracion`). Los años que aparecen en cuerpos de petición (`"2099-01-01…"`, `"2000-01-01…"` en `enlaces-03b-r1:483-484`) son `expiraEn` y `revocadoEn` que el servidor ignora (el caso lo comprueba), no `creado_en`.

### Pendiente para `docs/ESTADO.md` (lo registra el orquestador al cerrar)
| Pendiente | Destino |
|---|---|
| Ventanas de fecha propias para las pruebas que paginan la lista global de enlaces: 1990 (`enlaces-03b-r1`, recorre hasta el final desde su ancla) y 2000 (`enlaces-registro.integracion`, CHORE-02). Una prueba nueva que fije `creado_en` de un enlace usa otra ventana posterior a 1990 y no recorre hasta el final; o, si necesita recorrer hasta el final, una ventana anterior a todas, sin filas de nadie más por debajo | Todo encargo que agregue pruebas de `enlaces_registro` (ADMIN) |

## Enmienda 3 (2026-10-02)
Responde a `reporte-tester.md`, "CHORE-02 — Ronda 1" (ROTO por T-01; O-1 a O-3; confirmación y cifras de M-08), y a `revision.md`, "Verificación del resumen — CHORE-02 — implementación" (M-08 y los arbitrajes del manager). Escrita por el arquitecto con `Edit`. Punto de partida: pasos 2 a 13 hechos y aceptados (124 archivos / 1369 casos); ronda 1 del tester con 5 `*.ataque` nuevos (129 / 1414) y A-6 aplicada en `ritmo-03c-r1`. Cambian "Pruebas requeridas" (puntos 10 y 11), los pasos 13a, 13b y 15, una línea de §D-8 y "Pendientes". Nada más de lo aprobado cambia. Estado del plan: **LISTO**, con una decisión nueva del humano (M-08, §E3-2) además de la confirmación de M-01 (a).

### §E3-1 · T-01: `setNotFoundHandler` (y su hermano `setErrorHandler`) fuera de la raíz
**Causa (leída en Fastify 5.12.5):** `setNotFoundHandler` registra sus rutas con `router.all(prefijo + "/*")` en el enrutador de 404 (`lib/four-oh-four.js:156-157`), que no dispara `onRoute`. Un plugin con prefijo `/api/clases` o `/api` puede así atender `/api/clases/<id>/…` sin pasar por ninguna parte de la cadena. **Hermano:** `setErrorHandler` en un contexto encapsulado (`fastify.js:767-783`; cada hijo empieza con `kErrorHandlerAlreadySet = false`, `lib/plugin-override.js:61`). Una ruta con `protegido()` y un manejador de errores propio en su plugin convertiría el `401` de `authenticate` (o el `403` de cualquier paso) en cualquier respuesta. La guarda tampoco lo ve.

**Remedio (dentro de la guarda; A-2 lo cubre; no hace falta A-7):** al final de `registrarGuardaDeRutas(app)` (`middleware/guarda-de-rutas.ts`), los dos métodos de la instancia raíz se reemplazan por una función que lanza, con una propiedad no escribible ni configurable:
```ts
// CHORE-02, T-01: setNotFoundHandler y setErrorHandler no disparan onRoute, así que un plugin
// podría atender /api/… o rehacer la respuesta de la cadena sin que la guarda lo vea. Los dos
// únicos manejadores son los de handlers/errores.ts, que app.ts registra ANTES de
// registrarMiddleware. Desde aquí, cualquier instancia (la raíz, un plugin con fastify-plugin o un
// hijo encapsulado, que Fastify crea con Object.create del padre) hereda esta propiedad.
const MANEJADORES_DE_LA_RAIZ = ["setNotFoundHandler", "setErrorHandler"] as const

const bloquearManejadoresPropios = (app: FastifyInstance): void => {
  for (const metodo of MANEJADORES_DE_LA_RAIZ) {
    Object.defineProperty(app, metodo, {
      value: (): never => {
        throw new Error(
          `La instancia llama a ${metodo} después de registrarMiddleware: el único es el de handlers/errores.ts, registrado antes (AGENTS.md, regla 2)`,
        )
      },
      writable: false,
      configurable: false,
      enumerable: true,
    })
  }
}
```
- **Por qué cubre todos los contextos:** cada contexto encapsulado se crea con `Object.create(padre)` (`lib/plugin-override.js:38`), así que hereda la propiedad de la raíz; un plugin con `fastify-plugin` usa la misma instancia del padre (`plugin-override.js:32-35`). La llamada lanza dentro del cuerpo del plugin, el `register` rechaza y `ready()` falla: la API no arranca (mismo comportamiento que el resto de la guarda). Asignar `hijo.setNotFoundHandler = …` sobre una propiedad heredada no escribible lanza `TypeError` en módulos ES (modo estricto): tampoco arranca. La función original es privada del cierre de `fastify.js`; ningún plugin puede recuperarla por la API pública (por los símbolos privados sí: pendiente aceptado en "Pendientes").
- **Por qué no `onRegister`:** ese hook no corre para los plugins con `fastify-plugin` (`plugin-override.js:32-35` regresa antes de la línea 71), que comparten el contexto de la raíz; el reemplazo en la raíz los cubre a todos con un solo punto.
- **Por qué la raíz de `app.ts:61` sigue permitida:** `await app.register(manejoDeErrores)` (un `fastify-plugin`, contexto de la raíz) corre **antes** de `registrarMiddleware(app)` (`app.ts:65`), así que sus llamadas a `setErrorHandler` y `setNotFoundHandler` ocurren antes del bloqueo. Esos dos manejadores no sirven datos: el de 404 responde siempre `404 NO_ENCONTRADO` con un cuerpo fijo, y el de errores es el formato único de la API (DEC-05), el que pinta los `401`/`403` de la cadena. El 404 por defecto de Fastify (`fastify.js:440`) se fija al construir la instancia y `manejoDeErrores` lo reemplaza. Desde CHORE-02 ese orden queda fijado por construcción: si alguien registrara `manejoDeErrores` después de la guarda, la API no arrancaría (PR-CH-09d).
- **Lo que no cambia:** `registrarMiddleware` (`middleware/index.ts`), `app.ts`, `handlers/errores.ts` y `eslint.config.mjs`. Ningún archivo de "No se toca" se abre. Las pruebas que montan apps sueltas registran `manejoDeErrores` antes de `registrarMiddleware` o no lo registran (revisado: `guarda-r2`, `nombres-guarda-r3`, `guarda-ch-r1`, `sesiones-y-cadena`, `clases-r3`, `middleware-orden`, `guarda-clase*`, `guarda-todas-las-rutas`); ninguna llama a esos métodos después de la guarda.
- **Pruebas:** PR-CH-09a a 09e (punto 10 de "Pruebas requeridas").

**Texto propuesto T-6 bis (`backend/src/middleware/README.md`; lo aplica el orquestador junto a T-6).** Insertar, justo antes de `### Límite: hooks de plugin`:
> ### Manejadores de 404 y de errores (CHORE-02, T-01)
>
> `setNotFoundHandler` y `setErrorHandler` no disparan `onRoute`: un plugin con prefijo `/api` podría
> atender `/api/clases/<id>/…`, o rehacer la respuesta de la cadena, sin que la guarda lo viera.
> `registrarMiddleware` reemplaza los dos métodos de la instancia raíz por uno que lanza; todos los
> contextos lo heredan. Los únicos manejadores son los de `handlers/errores.ts`, que `app.ts`
> registra **antes** de `registrarMiddleware`. Un plugin transversal que necesite cualquiera de los
> dos se registra también antes; si no, la API no arranca con
> `La instancia llama a <método> después de registrarMiddleware: el único es el de handlers/errores.ts, registrado antes (AGENTS.md, regla 2)`.

### O-1 a O-3 (observaciones de la ronda 1)
| ID | Decisión | Dónde |
|---|---|---|
| **O-1** (PR-CH-01c no ve un comentario SQL entre `LOCK` y `TABLE`, ni distingue un `NOWAIT` dentro de un comentario; falso positivo con la tabla entre comillas dobles en un literal de plantilla) | **No entra.** Las dos primeras exigen intención y la tercera solo falla de forma visible (con archivo y línea) si alguien escribe esa forma; hoy ninguna prueba cae en ellas. Corregirlo bien exige analizar los literales con el analizador de TypeScript, un cambio mayor que el problema | "Pendientes", destino el primer `chore` de pruebas |
| **O-2** (segmentos vacíos: `//api/*`, `/api//:seccion/*`, `///*` arrancan con `protegido()`) | **Entra**, por ser barato y cerrar el día en que alguien active `ignoreDuplicateSlashes` o un proxy normalice `//`. `comodinEnLosPrimerosSegmentos` descarta los segmentos vacíos antes de tomar los dos primeros (`.split("/").filter((segmento) => segmento !== "").slice(0, 2)`); el motivo no cambia. Ninguna ruta de producción tiene segmentos vacíos | §E3-1 (paso 13a), PR-CH-05f |
| **O-3** (con `…/campus_pruebas&host=…`, sin `?`, el motivo repite la base) | **Sin cambio.** Es el diseño de CHORE-01: el motivo nombra la base y el host, nunca la URL ni la contraseña | — |

### §E3-2 · M-08: 40 registros simultáneos del mismo enlace
**Qué pasa (cifras del tester y del manager):** los registros de un mismo enlace van en serie sobre su fila (`FOR NO KEY UPDATE`, Enmienda 6 de AUTH-03b). Cada transacción toma una conexión del pool **antes** de pedir la fila y la retiene mientras espera: durante la ráfaga, 8 de las 10 conexiones esperan la fila. Las transacciones que no obtienen conexión en el `maxWait` de Prisma (2 s) reciben `P2028` "Unable to start a transaction in the given time", que CHORE-02 ya traduce a `503 SERVICIO_OCUPADO` (antes, `500`). Sin carga, la sección en serie cuesta unos 14 ms por registro y 160 simultáneos terminan en `201`. Con la suite lenta (166 s), 5 de 40 recibieron `503` en 1 de 5 corridas conocidas. En producción, con 30 registros esperando conexión, basta con que cada uno tarde más de unos 65 ms.

**Opciones para el humano:**
- **(i) Recomendada: que los 40 terminen en `201`, dándole a las dos transacciones del enlace una espera de conexión de 10 s.**
  - **Diseño:** `enTransaccion` (`adapters/db/cliente.ts`, A-3) acepta un tercer parámetro opcional, `{ maxWait?: number }`, y solo si llega lo pasa a `$transaction(fn, { maxWait })`; el `timeout` (5 s) y la traducción del `P2028` no cambian, y un `enTransaccion` anidado lo ignora. En `adapters/db/enlaces-registro.ts`, una constante `ESPERA_DE_CONEXION_DEL_ENLACE_MS = 10_000`, con su comentario (serie sobre la fila del enlace; M-08), que pasan `registrarMaestroConEnlace` y `revocarEnlaceRegistro` (la revocación espera en la misma cola: es el hermano). Ningún otro cambio: ni SQL nuevo (E6 sin cambios), ni `core/`, ni handlers.
  - **Por qué 10 s:** con 30 registros esperando conexión, aguanta unos 330 ms por registro, cinco veces el umbral medido de 65 ms. Más allá, un registro que espera más de 10 s es una sobrecarga real y el `503` es la respuesta correcta.
  - **Qué conserva:** el orden y la cola justa de la Enmienda 6 de AUTH-03b (las transacciones siguen formándose en la fila del enlace, en PostgreSQL), así que los casos de T-07 de `enlaces-03b-r2` y `enlaces-03b-r1` no cambian; el `*.ataque` de los 40 queda **sin cambios** y su propiedad ("ningún 5xx") se cumple con margen.
  - **Costo y riesgo:** dos archivos de producción (uno ya autorizado). La ráfaga dura lo mismo; mientras dura, las transacciones de **otras** rutas siguen compitiendo por las mismas 10 conexiones con su `maxWait` de 2 s (riesgo (b) del tester, que existía antes de CHORE-02): va a DEPLOY como pendiente (tamaño del pool, `connectionTimeoutMillis`).
  - **Alternativas descartadas:** una cola en memoria por enlace antes de tomar la conexión rompería las precondiciones de los casos de T-07 de `enlaces-03b-r2` y `enlaces-03b-r1` (los registros 2 a N esperarían en memoria y nunca quedarían "formados" detrás de la fila); `NOWAIT` con reintento sobre la fila del enlace rompe el argumento de la cola justa de la Enmienda 6 (una revocación podría no obtener nunca la fila); un pool más grande es configuración de DEPLOY y no garantiza nada; acortar la sección en serie no es posible (ya son dos `INSERT`, con argon2 fuera).
  - **Hermanos revisados:** `revocarEnlaceRegistro` (misma fila y misma cola) → aplica; `crearComentario` (`FOR SHARE`, compatible entre comentarios) → no; `invitarMaestrosEnLote` (bloqueo consultivo global, solo el admin, sin ráfagas) → no; el protocolo por usuario (una fila por cuenta, sin ráfagas de muchos clientes sobre la misma) → no.
  - **Autorización A-8 (i):** el programador modifica `backend/src/adapters/db/enlaces-registro.ts` (la constante y las dos llamadas a `enTransaccion`), además de `cliente.ts` (A-3). Pruebas PR-CH-10a a 10c; paso 13b. Texto T-5 bis abajo.
- **(ii) Aceptar el `503` bajo esa contención.** Sin cambio de código. El tester cambia, con la **autorización A-8 (ii)**, el caso "40 registros simultáneos con el mismo enlace: 40 × 201, 40 cuentas y ningún 5xx" de `enlaces-03b-r2.ataque.test.ts`: cada estado es `201` o `503` con el cuerpo exacto de `SERVICIO_OCUPADO`; el número de cuentas es igual al de `201`; ninguno es `500` ni otro `5xx`; al menos uno es `201`. Costo: en una junta de 40 maestros con el mismo enlace, alguno puede ver "El servicio está ocupado en este momento. Inténtalo de nuevo en unos segundos." y repetir; los datos quedan correctos. Mismo riesgo de pool a DEPLOY.

**¿Entra en CHORE-02?** Sí, con cualquiera de las dos: está en el alcance ("los demás `P2028`", punto 5) y, sin resolverlo, las 11 corridas seguidas de PR-CH-01b pueden caer en PA-12 por ese caso.

**PA-07 (c) mientras tanto:** hasta que se aplique la opción elegida (paso 13b, o el cambio del tester con A-8 (ii)), un `P2028` de `maxWait` en `POST /api/auth/registro-maestro` que el `requestId` atribuya al caso "40 registros simultáneos…" de `enlaces-03b-r2` es **M-08 conocido**: se reporta con su conteo y no es un hallazgo nuevo, y el rojo de ese caso en esa corrida se atribuye a M-08, no a PA-12. Cualquier otro `P2028` de `maxWait` (otra ruta u otro caso) activa PA-07 (c). Después:
- con **(i)**, ese `P2028` vuelve a activar PA-07 (c) como cualquier otro (PR-CH-10c);
- con **(ii)**, la lista cerrada de §D-8 (c) suma "de 0 a 40 `P2028` de `maxWait` en `POST /api/auth/registro-maestro`, solo desde ese caso y siempre con `503 SERVICIO_OCUPADO`"; un `500` de esa ruta sigue siendo hallazgo.

**Texto propuesto T-5 bis (`backend/src/adapters/README.md`, solo con (i); lo aplica el orquestador junto a T-5).** Agregar, al final de la sección "`db/cliente.ts`: `enTransaccion` y el `P2028` (CHORE-02)":
> `enTransaccion` acepta `{ maxWait }` para las transacciones que van en serie sobre una fila con
> muchos clientes a la vez. Hoy solo la usan `registrarMaestroConEnlace` y `revocarEnlaceRegistro`
> (10 s, M-08): cada registro del mismo enlace toma una conexión antes de formarse en la fila, y con
> el `maxWait` por defecto (2 s) los últimos de una ráfaga recibían `503`.

### Ronda siguiente del tester
Después de 13a (y 13b, o del cambio con A-8 (ii)) y de las verificaciones del programador y del manager: regresión completa con al menos 3 corridas seguidas, los 112 `*.ataque` en verde (V-01 contra la tabla de la ronda 1), y ataque de §E3-1 (cualquier otra forma de responder sin pasar por la cadena: `setNotFoundHandler` por las opciones de una ruta, `onRequest` en `register`, `decorate` sobre `setNotFoundHandler`, un hijo que redefine la propiedad) y de la opción de M-08 elegida.

## Enmienda 4 (2026-10-02)
Responde a `reporte-tester.md`, "CHORE-02 — Ronda 2" (ROTO: T-02 a T-05; O-4 a O-7), y a `revision.md`, "## Arbitraje — ronda 2". Escrita por el arquitecto con `Edit`. Cambian: §D-1 (una línea, R-1), la lista de autorizaciones, "Pruebas requeridas" (puntos 12 a 14), "Verificación de la espera en cadena" (cuenta de las 11), los pasos 13c a 13e, "No se toca", T-6 ter y "Pendientes". Nada más de lo aprobado cambia. **La ronda 3 del tester es la última antes de escalar al humano.** Estado del plan: **LISTO**, pendiente de que el humano apruebe esta enmienda y A-9, A-10, A-13 y A-14.

### §E4-0 · Decisiones y lo que verifiqué en Fastify 5.12.5 instalado
| Hallazgo | Decisión | Quién | Autorización |
|---|---|---|---|
| **T-02** (opciones de ruta `errorHandler`, `onSend`, `preSerialization`) | Se corrige en la guarda con una **clasificación cerrada** de todas las opciones de ruta que Fastify lee (§E4-1) | Programador, `guarda-de-rutas.ts` | A-2 vigente. Hace falta además **A-13** (tester): 5 casos de `nombres-guarda-r3.ataque` esperan hoy que `onSend`, `preSerialization` y `onError` arranquen (decisión de T-12 que esta enmienda revierte) |
| **T-03** (`addHook("onSend")` en un plugin) | **Va por la guarda, no como límite.** El mismo mecanismo de §E3-1 sobre `addHook` (por nombre) y sobre los demás métodos de la instancia que pueden responder, rehacer la respuesta o correr con la petición antes de la cadena (§E4-2) | Programador, `guarda-de-rutas.ts` | A-2 vigente. Hace falta además **A-14** (tester): los casos "setReplySerializer en un plugin…" y "addHook('onSend') en un plugin…" de `guarda-ch-r2` exigen hoy `startsWith("responde 401 ")`; con el bloqueo, la app no arranca, que es el desenlace aceptable del resto del archivo (`ACEPTABLE`). **A-11 y A-12 no se usan** (eran la alternativa de dejarlo como límite); **A-7 tampoco** |
| **T-04** (C-1 agota 30 s) | Presupuesto 60 s y tiempo límite 75 s; PR-CH-04c y PR-B05 dejan de retener `usuarios` (§E4-3) | Tester (C-1); programador (04c y PR-B05) | **A-9** (tester, `cuentas-r1.ataque`); 04c ya lo cubre "Cambios por capa" |
| **T-05** (PR-B05 elige `usuarios_rol_idx`) | PR-B05 sobre una tabla temporal con la misma definición de índices, más una comprobación del catálogo de `usuarios` (§E4-3) | Programador | **A-10** (`alumnos.integracion.test.ts`, solo PR-B05) |

**Verificado contra `node_modules/fastify` 5.12.5:**
- **Opciones de ruta que Fastify lee** (`lib/route.js:204-457`, `lib/hooks.js:3-22`): `method`, `url`/`path`, `handler`, `schema`, `attachValidation`, `exposeHeadRoute`, `prefixTrailingSlash`, `bodyLimit`, `handlerTimeout`, `logLevel`, `logSerializers`, `config`, `constraints`, `errorHandler`, `childLoggerFactory`, `schemaErrorFormatter`, `validatorCompiler`, `serializerCompiler` y los diez hooks del ciclo de vida (`onTimeout`, `onRequest`, `preParsing`, `preValidation`, `preSerialization`, `preHandler`, `onSend`, `onResponse`, `onError`, `onRequestAbort`). Cualquier otra clave se ignora. §E4-1 clasifica todas.
- **Los hooks de la ruta se leen de `opts` en `preReady`** (`route.js:390-396`: `this[kHooks][hook].concat(opts[hook])`), no al registrar: un arreglo que el autor conserva y muta después de `onRoute` cambia la ruta. Por eso la guarda deja una copia congelada (§E4-1).
- **Los hooks de la instancia corren antes que los de la ruta** (la misma línea): un `preHandler` de instancia corre **antes** de la cadena de `protegido()`.
- **`onRoute` de un hijo corre después del de la guarda** (los hooks del hijo se copian del padre al crearlo y se le agregan los propios), así que podría cambiar `opts` cuando la guarda ya la revisó. Por eso `onRoute` entra en la lista de §E4-2.
- **Ruta `HEAD` automática:** Fastify la registra con un `onSend` propio que vacía el cuerpo (`route.js:453-455`, `lib/head-route.js:2-41`; `parseHeadOnSendHandlers(null)` devuelve esa función). La guarda la reconoce por identidad.
- **`addHook`** (`fastify.js:577-622`): `onClose` llama a `this.onClose`; `onReady`, `onListen`, `onRoute` y `preClose` se agregan al momento; los demás se difieren con `this.after`. **Nada interno llama a `addHook`**: en `fastify.js` solo aparece su definición (líneas 229 y 577-622), en `lib/` ninguna llamada, y tampoco en `avvio` ni en `fastify-plugin`. `@fastify/cookie` lo llama (`index.js:173` y `:177`: `onRequest`/`preParsing` y `onSend`) **dentro de su plugin**, que `app.ts:63` registra con `await` **antes** de `registrarMiddleware` (`app.ts:65`): queda permitido. `app.ts:81` agrega `onClose` después de la guarda: permitido. En `backend/src` no hay otro `addHook` que el `onRoute` de la guarda.
- **Métodos de la instancia** (`fastify.js:180-290`): clasificados uno por uno en §E4-2.
- **`decorate`** (`lib/decorate.js:19-35`) solo comprueba propiedades **propias**: en un hijo, `decorate("addHook", fn)` intenta asignar sobre la propiedad heredada no escribible y lanza; con `{ getter }` define una propiedad propia, pero no alcanza la función original (hermano H-9 de §E4-2).
- **`@fastify/rate-limit`, CORS y compresión no están instalados**; lo que se dice de ellos es una regla de orden, no algo verificado (pendiente de DEPLOY y CORS).

### §E4-1 · T-02: clasificación cerrada de las opciones de ruta
En `motivoDeRechazo`, para toda ruta no pública, **después** de la comprobación actual de `onRequest`/`preParsing`/`preValidation` (su mensaje no cambia) y **antes** de la regla de los dos primeros segmentos. Una opción cuenta como declarada si su valor no es `undefined` y, en los hooks, si su lista (`comoLista`) no queda vacía. Mensajes, con el mismo formato de T-12: ``La ruta <METODO> <url> declara <opciones separadas por coma>, que <motivo> (AGENTS.md, regla 2)``.

| Opción | Clase | Motivo en el mensaje | Por qué |
|---|---|---|---|
| `onRequest`, `preParsing`, `preValidation` | Prohibida (ya, T-12) | `se ejecuta antes de protegido()` (sin cambios) | Corren antes de la cadena y pueden responder |
| `errorHandler` | **Prohibida** | `puede rehacer la respuesta de protegido()` | Atiende el error de la cadena (`401`/`403`) y puede enviar cualquier cosa (T-02) |
| `onSend` | **Prohibida**, salvo el `onSend` interno de la ruta `HEAD` automática | ídem | Cambia estado y cuerpo (T-02) |
| `preSerialization` | **Prohibida** | ídem | Cambia estado y cuerpo antes de serializar (T-02) |
| `onError` | **Prohibida** | ídem | Corre con el error de la cadena y puede agregar encabezados (por ejemplo, datos) a su `401` |
| `schema` (cualquier parte), `validatorCompiler`, `schemaErrorFormatter` | **Prohibida** | `valida o serializa fuera de protegido()` | La validación de Fastify corre **antes** de `preHandler`, es decir, antes de la cadena; el formateador puede poner cualquier texto en el error que el envoltorio responde. Los handlers validan con zod (`handlers/validacion.ts`); ninguna ruta usa `schema` |
| `serializerCompiler` (y `schema.response`) | **Prohibida** | ídem | Compila el serializador de la respuesta, que da forma también al `401` |
| `childLoggerFactory`, `logSerializers` | **Prohibida** | `corre con la petición antes de protegido()` | Reciben la petición (y su `raw`) al entrar, antes de la cadena |
| `preHandler` | Permitida, con la cadena primero (regla actual) | — | Lo que va después de la cadena corre solo si la cadena pasó |
| `onResponse`, `onTimeout`, `onRequestAbort` | Permitida | — | Corren cuando la respuesta ya salió o ya no puede salir |
| `method`, `url`, `path`, `handler`, `config`, `constraints`, `bodyLimit`, `handlerTimeout`, `logLevel`, `exposeHeadRoute`, `prefixTrailingSlash`, `attachValidation` | Permitida | — | No responden ni tocan la respuesta (`bodyLimit` y `handlerTimeout` producen errores que formatea el envoltorio de la raíz, sin datos; `attachValidation` no hace nada sin `schema`) |

- **El `onSend` interno de `HEAD`:** la guarda obtiene una sola vez la función con `createRequire(import.meta.url)("fastify/lib/head-route.js").parseHeadOnSendHandlers(null)` y comprueba que sea una función (si no, `registrarGuardaDeRutas` lanza "No se encontró el onSend interno de las rutas HEAD de Fastify": la API no arranca y todas las pruebas lo muestran; es la señal de que una versión nueva de Fastify lo movió). Al contar `onSend`, se descartan los elementos que son esa misma función (identidad). El tipo se declara en el mismo archivo con un comentario que diga por qué (`lib/` de Fastify no publica tipos). Es la única importación de una ruta interna de Fastify en `backend/src`.
- **Copia congelada (hermano H-3):** si la ruta pasa la guarda, para cada uno de los diez hooks del ciclo de vida presentes en las opciones, la guarda asigna `ruta[hook] = Object.freeze([...comoLista(ruta[hook])])`. La revisión se hace sobre esa misma copia (copiar, revisar, asignar). Así, mutar después el arreglo que devolvió `protegido()` (vaciarlo, o meterle un `onSend`) no cambia la ruta. Las rutas públicas quedan exentas de la clasificación, como con T-12.
- **Las rutas de producción** no usan ninguna opción prohibida (`grep` del tester y mío: 0 coincidencias en `backend/src`): nada cambia para ellas (PR-CH-05d y PR-CH-12d).

### §E4-2 · T-03: hooks y métodos de la instancia
Al final de `registrarGuardaDeRutas(app)`, después de registrar sus propios `onRoute` y `onRegister` con el `addHook` original y después de `bloquearManejadoresPropios` (§E3-1):
```ts
// CHORE-02, T-03: los hooks de la instancia corren en cada ruta del contexto (los de petición,
// incluso antes que preHandler) y pueden responder o rehacer la respuesta de la cadena; un onRoute
// posterior podría cambiar una ruta ya revisada. Después de registrarMiddleware solo se admiten los
// que no tocan la respuesta. Los plugins que necesiten los demás se registran antes, como
// manejoDeErrores y @fastify/cookie (app.ts).
const HOOKS_DE_LA_RAIZ = new Map<string, string>([
  ["onRequest", MOTIVO_REHACE], ["preParsing", MOTIVO_REHACE], ["preValidation", MOTIVO_REHACE],
  ["preHandler", MOTIVO_REHACE], ["preSerialization", MOTIVO_REHACE], ["onSend", MOTIVO_REHACE],
  ["onError", MOTIVO_REHACE], ["onRoute", "podría cambiar una ruta después de que la guarda la revisó"],
])
```
- `addHook` se reemplaza en la raíz con `Object.defineProperty` (no escribible, no configurable) por una función que, si el nombre está en el mapa, lanza ``La instancia agrega el hook <nombre> después de registrarMiddleware: <motivo>; un plugin que lo necesite se registra antes (AGENTS.md, regla 2)``, y si no, llama al original con su `this` y sus dos argumentos y devuelve lo que este devuelva. `MOTIVO_REHACE` = `puede responder o rehacer la respuesta fuera de protegido()`. Quedan permitidos `onResponse`, `onTimeout`, `onRequestAbort`, `onReady`, `onListen`, `preClose`, `onClose` y `onRegister`; un nombre que Fastify no admite sigue dando el error de Fastify.
- Los métodos siguientes se reemplazan igual, por una función que lanza ``La instancia llama a <método> después de registrarMiddleware: <motivo>; un plugin que lo necesite se registra antes (AGENTS.md, regla 2)``:

| Método (`fastify.js:180-290`) | Clase | Motivo |
|---|---|---|
| `setNotFoundHandler`, `setErrorHandler` | Bloqueado (§E3-1; su mensaje no cambia) | — |
| `setReplySerializer`, `setSerializerCompiler` | **Bloqueado** | `puede rehacer el cuerpo de la respuesta de protegido()` (el serializador de respuestas también serializa el `401`; O-4 solo comprobó el estado) |
| `setValidatorCompiler`, `setSchemaController`, `setSchemaErrorFormatter` | **Bloqueado** | `valida fuera de protegido()` |
| `setGenReqId`, `setChildLoggerFactory`, `addContentTypeParser`, `addConstraintStrategy` | **Bloqueado** | `corre con la petición antes de protegido()` (el analizador del cuerpo puede lanzar un `AppError` con cualquier mensaje, que el envoltorio responde tal cual) |
| `addHook` | Por nombre (arriba) | — |
| `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `trace`, `query`, `all`, `route` | Permitido | Pasan por `onRoute` (la guarda) |
| `register`, `after`, `ready`, `listen`, `close`, `onClose`, `inject` | Permitido | Ciclo de vida; `register` con `logSerializers` se rechaza en el `onRegister` de la guarda: ``Un plugin se registra con logSerializers después de registrarMiddleware: corre con la petición antes de protegido() (AGENTS.md, regla 2)`` |
| `decorate`, `decorateRequest`, `decorateReply`, `getDecorator`, `hasDecorator`, `hasRequestDecorator`, `hasReplyDecorator` | Permitido | No pueden reemplazar algo que ya existe en la petición o la respuesta (`FST_ERR_DEC_ALREADY_PRESENT`); ver H-9 |
| `addSchema`, `getSchema`, `getSchemas`, `addHttpMethod`, `hasRoute`, `findRoute`, `printRoutes`, `printPlugins`, `hasPlugin`, `hasContentTypeParser`, `getDefaultJsonParser`, `defaultTextParser`, `removeContentTypeParser`, `removeAllContentTypeParsers`, `hasConstraintStrategy`, `withTypeProvider`, `addresses`, `log`, `server`, `initialConfig` | Permitido | Consultas o configuración que no responde (quitar un analizador solo produce un `415` antes de la cadena, sin datos). `server` es el límite H-10 |

- **Por qué funciona en todos los contextos y no rompe nada:** lo mismo que §E3-1 (herencia por `Object.create`, `fastify-plugin` comparte la instancia). La llamada lanza en el cuerpo del plugin y `ready()` falla. Una llamada dentro de `after()` deja la excepción sin manejar y `ready()` cae por `pluginTimeout` (O-5): la API tampoco arranca, sin el mensaje de la guarda.
- **Hermano H-8, préstamo de métodos de otra instancia:** `Fastify().addHook.call(hijo, "onSend", fn)` (o `setErrorHandler`, `setReplySerializer`) funcionaría, porque esos métodos escriben en los símbolos de `this` y solo consultan el estado de la instancia que los presta. La guarda no lo puede impedir en ejecución. Se cierra con una comprobación estática (PR-CH-12g): en `backend/src`, la fábrica de Fastify (importación por defecto de `"fastify"`, `{ fastify }`, `import * as … from "fastify"`, `require("fastify")` o `import("fastify")`) solo aparece en `app.ts`. Lo demás importa de `"fastify"` solo tipos y `errorCodes` o `LogController`.
- **PR-CH-12g** (`higiene-de-pruebas.integracion.test.ts`, estático): esa regla, sobre `backend/src/**/*.ts` sin `*.test.ts` ni `generated/`; y `createRequire(…)("fastify/lib/…")` solo en `middleware/guarda-de-rutas.ts`.

### Hermanos revisados (T-02 y T-03)
| ID | Hermano | Decisión |
|---|---|---|
| H-1 | Opción de ruta `errorHandler`, `onSend`, `preSerialization` | Prohibidas (§E4-1; T-02) |
| H-2 | Opción de ruta `onError` (encabezados en el `401`) | Prohibida (§E4-1) |
| H-3 | Mutar después de la guarda un arreglo de hooks que el autor conserva (`protegido().preHandler`) | Copia congelada (§E4-1; PR-CH-11d) |
| H-4 | `schema`, `validatorCompiler`, `serializerCompiler`, `schemaErrorFormatter` (corren antes de la cadena o serializan su `401`) | Prohibidas (§E4-1) |
| H-5 | `childLoggerFactory`, `logSerializers` por ruta y `logSerializers` en `register` | Prohibidas (§E4-1 y §E4-2) |
| H-6 | `addHook` de un hook de petición o de `onRoute` en cualquier contexto (T-03) | Bloqueado (§E4-2) |
| H-7 | Métodos de instancia `setReplySerializer`, compiladores, controlador y formateador de esquemas, `setGenReqId`, `setChildLoggerFactory`, `addContentTypeParser`, `addConstraintStrategy` | Bloqueados (§E4-2) |
| H-8 | Préstamo de un método de otra instancia de Fastify | Estático: la fábrica solo en `app.ts` (PR-CH-12g) |
| H-9 | `decorate*` sobre un método o una propiedad existente | Fastify lo rechaza (`FST_ERR_DEC_ALREADY_PRESENT` o la asignación sobre la propiedad no escribible); con `{ getter }` en un hijo define una propiedad propia, pero sin la función original no responde nada (O-5 lo comprobó para `setNotFoundHandler`); queda cubierto por H-8 |
| H-10 | Escribir en el servidor HTTP de Node (`app.server.on("request" …)`, `"checkContinue"`, `"upgrade"`) o en el socket de una petición desde código que corre antes de la cadena, y los símbolos privados de Fastify | **Límite aceptado** (§E4-4); fuera de la API de Fastify |
| H-11 | `onResponse`, `onTimeout`, `onRequestAbort` (ruta e instancia) | Permitidos: la respuesta ya salió o ya no puede salir |
| H-12 | `setNotFoundHandler`/`setErrorHandler` por otras vías (O-5) | Ya cubiertos por §E3-1; sin cambios |
| H-13 | Rutas registradas después de `ready()` | Fastify las rechaza (`Cannot add route!`; `clases-r3.ataque` lo comprueba) |

### §E4-3 · T-04 y T-05
- **T-04 (A-9, tester):** en `cuentas-r1.ataque.test.ts`, caso "con la tabla usuarios bloqueada por otra transacción…", el presupuesto del reintento pasa de 30 s a **60 s** y el tiempo límite del caso de 45 s a **75 s**; el mensaje de agotamiento dice "60 s". Nada más cambia. Con eso y las dos retenciones menos, la próxima prueba que retenga `usuarios` tiene margen; si un caso de C-1 pasa de 40 s en alguna corrida, se reporta (PR-CH-13c).
- **PR-CH-04c fuera de `usuarios` (programador):** el caso inserta, dentro de `enTransaccion`, un enlace de registro propio (hash aleatorio) en `enlaces_registro`, espera 5.3 s y comprueba el `503` y que el enlace no existe después. Una fila sin confirmar no es visible para nadie (READ COMMITTED) y `enlaces_registro` no tiene llaves foráneas: no retiene `usuarios` ni interfiere con las pruebas que recorren la lista de enlaces (Enmienda 2).
- **T-05 (A-10, programador):** PR-B05 deja de sembrar `usuarios` y de depender de su estadística. Dos partes, mismo título (PR-CH-14a):
  1. **Catálogo de la base migrada**, fuera de toda transacción: `pg_indexes` de `public.usuarios` trae `usuarios_nombre_busqueda_idx` con `USING gin (nombre_busqueda gin_trgm_ops)` (la definición de la migración `20260929232924_clases_e_inscripciones`) y `usuarios_rol_idx` sobre `(rol)` (`20260923143021_usuarios_y_sesiones`).
  2. **El plan, en una tabla temporal** (`pr_b05_usuarios`, `ON COMMIT DROP`, en una transacción que se revierte, `timeout: 15000`) con las columnas que lee la consulta y los **mismos dos índices**, 20,000 estudiantes activos, `ANALYZE`, `SET LOCAL enable_seqscan = off` y `EXPLAIN` con la forma de Prisma: el plan usa el índice de trigramas. Es determinista porque la estadística es solo la de esa tabla, sin escritores concurrentes, y todas sus filas son estudiantes (el índice de `rol` no filtra nada). Sin `LIKE usuarios`, que dejaría `AccessShareLock` sobre `usuarios` toda la transacción.
  - Lo que demuestra no cambia (R-20 de CLASES-b: la consulta con esa forma puede resolverse con ese índice); deja de demostrarlo sobre la tabla compartida, que era la fuente de la intermitencia (M-07 de CLASES-b y T-05).

### §E4-4 · Límite aceptado de la guarda
La guarda cubre la API de Fastify. No cubre, y queda a la revisión de código (texto en T-6 ter y fila en "Pendientes"): escribir directo en el servidor HTTP de Node o en el socket de una petición, el préstamo de métodos fuera de lo que detecta PR-CH-12g (código que no está en `backend/src`), y los símbolos privados de Fastify.

### Criterio de las 11 corridas
Escrito en "Verificación de la espera en cadena": una corrida con un rojo no cuenta; con esta enmienda la cuenta reinicia sobre el código final (5 del programador, 3 del manager y al menos 3 del tester en la ronda 3).

### PARADA nueva para el programador
| ID | Te detienes y reportas si… |
|---|---|
| PA-13 | Algún bloqueo de §E4-1 o §E4-2 no hace fallar el arranque (la app llega a `ready()` y responde), o hace fallar el arranque de `construirApp` real, o rompe una prueba fuera de las adaptadas por A-13 y A-14. También si `parseHeadOnSendHandlers(null)` no devuelve una función |

### Ronda 3 del tester (la última)
Antes del programador, el paso 13c (A-9, A-13, A-14). Después de las verificaciones del programador y del manager: V-01 contra la tabla del paso 13c (114 `*.ataque`), al menos 3 corridas completas seguidas sobre el código final, y ataque de §E4-1 y §E4-2 (cualquier otra forma, por la API de Fastify, de responder o rehacer la respuesta sin la cadena; la copia congelada; el préstamo de métodos dentro de `backend/src`), de T-04 (duración de C-1) y de T-05 (PR-B05).
