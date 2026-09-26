# Revisión del Manager — AUTH-02: cuentas y correo — plan
Veredicto: CAMBIOS REQUERIDOS
Verificación propia: lint no ejecutado · test no ejecutado · build no ejecutado (modo plan, por instrucción). Sí verifiqué, leyendo el código publicado de `pg-boss@12.34.0` y `resend@6.29.0` (bajados con `npm pack` al scratchpad y borrados después), las suposiciones S-02 y S-03 de las que depende el diseño. Los hallazgos están abajo, con archivo y línea del paquete.

El plan es sólido: cubre RF-03, RF-04, RF-04a, RF-04b y RF-04d; no agrega nada fuera del alcance que fijó el humano; sigue el orden de capas de `CLAUDE.md`; la carrera de dos usos del mismo token está resuelta con un `updateMany` condicional en orden fijo; la migración solo crea objetos; cada endpoint declara su cadena completa y los campos omitidos; el handler nunca llama a `notifier` y ESLint lo impide. Hay **un** problema que bloquea, y es de redacción: la compuerta del encargo (PA-06 y DEC-07) describe mal el SQL real de pg-boss. Se corrige en minutos. Si el humano lo prefiere, el arquitecto puede registrarlo como enmienda antes de programar, como se hizo en AUTH-01, sin otra ronda del Manager.

## Problemas que bloquean

### M-01 — DEC-07 y PA-06 no describen el SQL real de pg-boss 12, y PA-06 queda ambigua justo en la compuerta del encargo
Dónde: `plan.md` DEC-07 ("el texto es el SQL constante de pg-boss con marcadores `$1…$n` […]; nunca se concatena nada"), PA-06 ("su SQL de `send` no es una sola sentencia parametrizada (`$1…$n`)"), PA-07 (la adaptación de `JSON.stringify`) y R-01.

Por qué importa: esto es lo que hace pg-boss 12.34.0:
- `createJob` (`dist/manager.js:1150-1161`) ejecuta `db.executeSql(sql, [JSON.stringify([job])])`. Es **un solo parámetro**, `$1`, con todo el trabajo (id, datos, opciones) serializado como JSON.
- `plans.insertJobs` (`dist/plans.js:2018-2141`) arma **una sola sentencia** (`INSERT … SELECT … FROM json_to_recordset($1::text::json) … ON CONFLICT DO NOTHING RETURNING id`, o un único `WITH …` si la cola tiene `notify`). Pero **interpola en el texto** el esquema, la tabla y el nombre de la cola (`'${name}' as name`, `JOIN ${schema}.queue q ON q.name = '${name}'`). pg-boss valida ese nombre con `^[\w.\-/]+$` (`dist/attorney.js:88`).

Leída al pie de la letra, PA-06 se activa: el texto no es "solo marcadores". El Programador tendría que detenerse sin necesidad o resolverlo por su cuenta, que es justo la desviación que prohíbe `AGENTS.md`. Además, la frase "nunca se concatena nada" de DEC-07 es falsa respecto del texto de pg-boss. Es el argumento que el plan da para cumplir la regla 4, y es lo que el humano va a aprobar en un carril sensible.

Qué se espera:
- DEC-07 y PA-06 dicen lo que realmente pasa, y PA-06 se activa solo por lo que de verdad pone en riesgo la regla 4:
  - **Se sigue** si ningún dato del trabajo ni de la petición entra al texto (todo viaja en parámetros) y si lo único interpolado son el esquema, la tabla y el nombre de la cola. Esos valores salen de constantes nuestras (`COLA_CORREO_DE_CUENTA`, `COLA_CORREO_DE_CUENTA_FALLIDO`) y pg-boss los valida.
  - **Se detiene** si algún dato de la petición o del trabajo llega al texto, o si hace falta más de una sentencia.
- Se quita la contingencia de `JSON.stringify` de DEC-07 y de PA-07: pg-boss ya serializa y manda texto (`manager.js:1160`).
- R-01 y V-05 citan la evidencia que baja el riesgo: pg-boss 12 publica su propio adaptador para Prisma, `fromPrisma` (`dist/adapters/prisma.js`, exportado en `dist/index.d.ts:117`). Es literalmente el mismo código que `ejecutorSqlDe`: `executeSql(text, values) → tx.$queryRawUnsafe(text, ...values)`. Y pg-boss lo prueba contra `@prisma/client` y `@prisma/adapter-pg` 7.10 (sus `devDependencies`).
- Se agrega una defensa que conviene dejar escrita. Con parámetros, `$queryRawUnsafe` usa el protocolo extendido de PostgreSQL, que rechaza varias sentencias en una sola llamada ("cannot insert multiple commands into a prepared statement"). Si una versión futura de pg-boss cambiara a varias sentencias, fallaría de forma visible, no en silencio.

## Problemas que no bloquean

### N-01 — Contener la capacidad `executeSql` y conciliarla con la revisión estática de AUTH-01
Dónde: DEC-07, V-13. La capacidad `EjecutorSql` llega a los handlers como argumento de `alGuardar(sql)`: un handler podría llamar `sql.executeSql("…" + dato)`. No lo impide ninguna regla de ESLint.

Qué se espera:
- V-13 añade una búsqueda de `executeSql` en `backend/src`. Solo puede aparecer donde se define (`adapters/db/cliente.ts`) y en `adapters/queue/`; en `handlers/` y `workers/` solo se pasa, nunca se invoca.
- Opcional: un bloque de ESLint con `no-restricted-syntax` sobre `MemberExpression[property.name='executeSql']` fuera de `adapters/`.
- Ver el arbitraje de "ningún `Unsafe`" abajo.

### N-02 — `POST /auth/recuperar` permite a cualquiera llenar la cola; conviene acotar la retención de la cola
Dónde: DEC-04, DEC-05, DEC-06, S-14, R-12.
- El límite es por IP + correo, así que una sola IP puede encolar trabajos sin límite con correos distintos. Cada trabajo es barato para el worker (una lectura por índice único y "omitido"). Pero cada uno deja una fila en `pgboss.job`. Por defecto pg-boss la retiene 14 días en espera y la borra 7 días después de completarla (`QUEUE_DEFAULTS`, `dist/plans.js:83-92`), con el correo como dato personal.
- Es el mismo tipo de exposición que ya tiene `/auth/registro` sin límite global. El humano aceptó por escrito en AUTH-01 que el límite de `/auth/*` llegue con DEPLOY. Por eso no bloquea.
- Pero `recuperar` es mucho más barato por petición que `login`: sin argon2, más peticiones por segundo.

Qué se espera:
- `OPCIONES_DE_COLAS` fija para `CORREO_DE_CUENTA` y su cola de fallidos un `deleteAfterSeconds` corto (por ejemplo 1 día) y un `retentionSeconds` acorde. Acota el crecimiento y el tiempo que el correo vive en la cola (S-14).
- Un límite por IP sola **no** lo recomiendo ahora: sin `trustProxy` (DEPLOY), todas las peticiones llegan con la IP de Caddy y ese límite se volvería global, un bloqueo de la recuperación para todos. Basta con que §18 diga explícitamente que el límite de tasa de DEPLOY cubre `recuperar` (el plan ya lo propone).

### N-03 — La API deja de arrancar si la base no responde
Dónde: DEC-16, `app.ts`. Hoy `construirApp` no se conecta al arrancar: `/api/salud` existe para responder `503 BASE_DE_DATOS_NO_DISPONIBLE` cuando la base cae. Con `await iniciarCola()` dentro de `construirApp`, `pg-boss.start()` falla sin base y la API no arranca. Con `restart` en Compose entraría en un ciclo de reinicios. Es un cambio de comportamiento que el plan no declara.

Qué se espera: declararlo como decisión (aceptable: en Compose, `depends_on` con `healthcheck`), anotarlo para DEPLOY y documentarlo en el README. La alternativa es que un fallo de `iniciarCola` en la API se registre y deje la API en pie, con `encolar` respondiendo `503`.

### N-04 — `prepararTokenDeRecuperacion`: "un `P2002` se ignora" dentro de una transacción de PostgreSQL
Dónde: tabla de `adapters/db/tokens-cuenta.ts`. Si el Programador atrapa el `P2002` **dentro** del callback de la transacción, la transacción queda abortada y el `COMMIT` falla (25P02). Se recupera solo con el reintento de pg-boss, pero de forma accidental.

Qué se espera: decir cómo:
- insertar con `createMany({ data: [fila], skipDuplicates: true })`, que genera `ON CONFLICT DO NOTHING` y no aborta;
- o atrapar el `P2002` **fuera** de `enTransaccion`.

### N-05 — Configuración de correo en `production`: rechazar el remitente de ejemplo y separar el entorno de la API y el del worker
Dónde: DEC-12, `backend/.env.example`.
- `CORREO_REMITENTE=… <notificaciones@campus.local>` pasa la validación de `production`. Un despliegue que copie el ejemplo arrancaría y Resend rechazaría cada correo.
- Aplica el mismo criterio que `JWT_SECRET_DE_EJEMPLO`: en `production`, rechazar un remitente con dominio `campus.local`, con una prueba en `correo.test.ts`.
- El argumento de mínimo privilegio (S-13: solo el worker tiene la llave) solo se cumple si DEPLOY da a la API y al worker archivos de entorno distintos: son la misma imagen. Anotarlo en §18.

### N-06 — Pasos que el Programador tendría que adivinar
- **Cómo encuentran las pruebas el trabajo de una recuperación.** `recuperar.integracion` ("encola un trabajo con el correo normalizado") y el caso de punta a punta de `restablecer.integracion` no conocen el id: el handler no lo devuelve y `buscarTrabajo` pide el id. Hay que fijarlo: por ejemplo, una ayuda de prueba en `ayudas-cuentas.ts` con `$queryRaw` etiquetado sobre `pgboss.job`, filtrando por `name` y `data->>'correo'`. Es solo de pruebas, no pasa por índice y queda declarada como tal.
- **DEC-16 dice `iniciarCola({ …, log: app.log })` "tras `inicializarAuth`"**, pero en `app.ts` `inicializarAuth` corre **antes** de `Fastify()`, cuando `app.log` todavía no existe. Hay que decir que va después de crear `app` y antes de registrar los handlers.
- **`test/preparar-cola.ts`** debería aplicar `validarUrlDePruebas` antes de conectarse. Si alguien lo corre a mano con su `backend/.env`, instalaría `pgboss` en `campus_dev`. Es defensa en profundidad, igual que `setup.ts`.

## Detalles menores
- **Evidencia de V-05 que ya verifiqué, para que el Programador la confirme en `node_modules`:**
  - `send(nombre, datos, { id, db })`, con `db` de tipo `IDatabase { executeSql(text, values?) → { rows } }` (`dist/types.d.ts:17`).
  - Un id repetido devuelve `null` (`ON CONFLICT DO NOTHING`).
  - `createQueue` es idempotente (`ON CONFLICT DO NOTHING` en `create_queue`), **pero no actualiza** las opciones de una cola que ya existe: un cambio futuro de política pide `updateQueue`. Hay que anotarlo en `adapters/README.md`.
  - `createQueue` exige que la cola de fallidos exista antes (`manager.js:1888-1892`); el orden de `OPCIONES_DE_COLAS` ya es el correcto.
  - `getJobById(nombre, id)` existe (`index.d.ts:64`) y `stop({ graceful, timeout, close })` también (`types.d.ts:1094`).
  - `pollingIntervalSeconds` tiene un mínimo de 0.5 s (`attorney.js:585`).
  - Un trabajo fallido guarda el error serializado en `pgboss.job.output`.
- **Resend 6.29.0:**
  - Un fallo de red **no lanza**: devuelve `{ error: { name: "application_error", statusCode: null } }` (`dist/index.mjs:1352-1362`). DEC-13 ya lo trata como transitorio; conviene decirlo.
  - `new Resend(llaveVacía)` toma `process.env.RESEND_API_KEY` (`index.mjs:1278-1280`). `resend.ts` debe exigir una llave no vacía antes de construir el cliente.
  - La librería lee `RESEND_BASE_URL` del entorno (`index.mjs:1253`). Hay que anotarlo en el README del notifier.
  - Un `403` por dominio no verificado o por llave inválida se trata como transitorio: tres reintentos y después la cola de fallidos. Es aceptable, pero hay que decirlo en C-04.
- **Tipo `TipoTokenCuenta`:** replicar la comprobación en compilación `rolesCoinciden` de `adapters/db/usuarios.ts` entre el tipo de `core/` y el enum generado.
- **PA-14 y V-17:** buscar `re_` en los logs puede dar falsos positivos, y en V-17 no hay llave configurada. Es mejor buscar el valor exacto de la llave de V-16 (`re_llave_falsa_de_v16`), que es donde sí existe.
- **"Qué autoriza":**
  - Marcar explícitamente como "Modificar" `backend/.env.example`, `README.md` y los archivos de prueba del frontend que llevan "(+ …)". Hoy se infieren de la prosa, y la lista es cerrada.
  - Decir que la excepción FE-01 **expira** cuando el Tester actualiza la prueba: en las rondas siguientes del Programador, la suite completa va en verde.
- **S-05:** la temporal no caduca. Es aceptable (el PRD no lo pide), pero conviene que el humano lo sepa: una temporal sin usar sigue sirviendo indefinidamente.
- **`cambiar-contrasena` para un restringido sin la bandera** responde `409 CAMBIO_NO_REQUERIDO`, no `403 ACCESO_RESTRINGIDO`. No abre nada; basta con documentarlo en el README de `middleware/`.

## Desacuerdos arbitrados
- **FE-01 (`sesiones-y-cadena.ataque.test.ts:423`).** Como árbitro de las pruebas del Tester (`AGENTS.md`, "Reglas del equipo"), resuelvo que esa prueba es obsoleta por diseño. Fija la superficie de AUTH-01, y RF-04b exige una ruta que crea maestros.
  - Queda así: el Programador **no** la toca ni adapta el código para esquivarla, y reporta la salida literal. El Tester la actualiza como primera tarea de su ronda 1, conservando la intención ("ninguna ruta crea administradores; solo `POST /api/admin/maestros` crea maestros y exige admin"), y publica el hash nuevo.
  - PA-11 está bien definida: cualquier diferencia con la lista esperada detiene. La lista de 16 rutas del plan es correcta: las nuevas son `POST` o `PUT`, así que no generan `HEAD`.
  - Como `AGENTS.md` dice "No marques nada como terminado con pruebas en rojo", el humano debe **autorizar la excepción por escrito en la aprobación** (hay precedente en CHORE-01).
- **"Ningún `Unsafe`" (revisión estática del Tester en AUTH-01, `reporte-tester.md:247`).** Era una observación del estado del código, no una regla.
  - Se permite exactamente **un** `$queryRawUnsafe` en `backend/src`: dentro de `ejecutorSqlDe`, en `adapters/db/cliente.ts`, con texto que solo produce pg-boss y valores siempre como parámetros. Solo lo consume `adapters/queue`.
  - Esto cumple la regla 1: `adapters/db` no importa `pg-boss`, y `adapters/queue` no importa Prisma ni el cliente generado.
  - Cumple la regla 4: ningún dato viaja en el texto (M-01).
  - La alternativa de usar `fromPrisma` de pg-boss dentro de `adapters/queue` sacaría el `Unsafe` de nuestro código, pero obligaría a entregar la transacción de Prisma, completa, al callback del handler. Es peor para la regla 1. Me quedo con la opción del plan más N-01.

## Documentos a actualizar
Estoy de acuerdo con todas las propuestas del plan: `AGENTS.md` "Comandos" (`dev:worker`); `CLAUDE.md`, fila `admin`; ESSENTIALS "Autorización" (C-01, si el humano la aprueba) y "Autenticación"; `ARCHITECTURE.md` §6 (C-06), §7 (C-05), §8 (C-02), §9 (C-04), §14 (C-03), §18 y la fila D-27 de §20. Añado:
- **ESSENTIALS "Reglas de datos"** (o §14 "Reglas de acceso a datos"): "El único SQL con texto no literal es el de pg-boss, ejecutado dentro de la transacción de Prisma por `ejecutorSqlDe` (`adapters/db`); todos sus datos viajan como parámetros". Así, la próxima revisión estática no lo marca como violación.
- **§8:** junto a C-02, que el ejecutor equivale al `fromPrisma` de pg-boss y que `createQueue` no actualiza la política de una cola existente.
- **§18 "Requisitos previos"**, además de lo propuesto:
  - archivos de entorno separados para la API y el worker (N-05);
  - la API necesita la base para arrancar (N-03);
  - rechazo del remitente de ejemplo en `production` (si no entra en este encargo);
  - retención de la cola de correos (N-02).
- **D-27:** añadir al motivo que el id del token no es secreto (sale en los logs como `trabajoId`) y que la seguridad descansa en la clave. Filtrar `JWT_SECRET` ya es un compromiso total.
- **`aprobacion.md`** de este encargo: registrar la decisión sobre P-01 a P-05, C-01, la excepción FE-01 y la partición, si se elige.

## Para el humano
- **P-01, tamaño: recomiendo partir.** AUTH-02a = pasos 1 a 15 más el README del backend y FE-01. AUTH-02b = pasos 16 a 22. Mismo plan aprobado, sin otra ronda del arquitecto; cada parte con su Tester y su Manager final. Razones:
  - son unos 95 archivos y unas 200 pruebas en un carril sensible, y tú revisas el diff a mano antes del commit;
  - el programador `sonnet` está a prueba, y el plan tiene 24 pasos y 23 verificaciones;
  - con un máximo de 3 rondas, un fallo de interfaz obligaría a repetir también la ronda del backend (AUTH-01 necesitó una cuarta ronda extraordinaria);
  - el backend se verifica completo por su cuenta (V-17 con `curl`), y el frontend depende solo de los esquemas de `shared/`, que entran en 02a.

  Costo: dos pasadas más de Tester y Manager. Condición: 02a no se despliega sola (hoy no hay despliegue), porque una cuenta con cambio obligatorio no tendría pantalla.
- **P-02, token derivado: recomiendo el valor por defecto (HMAC con clave HKDF de `JWT_SECRET`).** Un secreto propio (`TOKENS_CUENTA_SECRET`) no reduce el riesgo: quien filtra `JWT_SECRET` ya puede firmar sesiones de cualquiera. Además, la API también lo necesitaría (calcula el hash de la invitación), sería otra variable obligatoria en `production` y chocaría con `env.ataque.test.ts:15`. Rotar `JWT_SECRET` invalida los enlaces pendientes (máximo 72 h): es aceptable y queda en el README. El argumento de la cola es correcto y suficiente: `pgboss.job` y los respaldos solo guardan el id, y `tokens_cuenta` solo el SHA-256 de un valor de 256 bits. Queda un riesgo residual inevitable: el enlace existe en claro en el correo mismo y en el historial de envíos de Resend.
- **P-03, límites de recuperación: recomiendo el valor por defecto (los dos límites)**, más la retención corta de N-02. La igualdad de tiempo es real: el handler no toca `usuarios`, y el `429` depende solo de IP + correo. El tope durable en el worker es el lugar correcto, porque es donde se conoce la cuenta sin revelarla. No agregaría un límite por IP sola hasta que DEPLOY traiga `trustProxy`.
- **P-04, búsqueda: recomiendo el valor por defecto.** `POST /admin/usuarios/buscar` es el mínimo para usar RF-04a en el navegador: sin ella, el admin necesitaría un uuid que no tiene. Busca por el índice único y devuelve una fila. Es `POST` para que el correo no quede en la URL ni en los logs. No es alcance de más; ADMIN puede sustituirla por la lista paginada. Lo mismo vale para `POST /admin/maestros` y `PUT /admin/usuarios/{id}/correo`: son las rutas que exigen RF-04b y RF-04a, que §7 no nombraba.
- **P-05, cambio de contraseña: recomiendo el valor por defecto (solo el obligatorio).** El PRD no pide un cambio voluntario.
- **C-01, restringido con contraseña temporal: es tu decisión** (te apartas del texto de ESSENTIALS, `AGENTS.md` "Pide confirmación"). **Recomiendo aprobarla como la propone el plan.** Las dos reglas de ESSENTIALS se bloquean entre sí: la puerta de cambio va antes que la de acceso, así que un restringido con temporal no podría salir nunca.
  - Las alternativas son peores. Prohibir el restablecimiento a restringidos obligaría a levantar la restricción. No activar la bandera violaría RF-04d.
  - `permitirRestringido` en esa única ruta no abre contenido: después del cambio solo pasan `GET /me` y la pantalla de restricción. Hay una prueba para eso, y el Tester lo ataca.
- **FE-01:** si apruebas, incluye en tu texto que el Programador entrega con esa única prueba en rojo y que el Tester la actualiza en su ronda 1.
- **Rama:** tu `main` local está atrás de `origin/main`, que ya tiene DOCS-02a (`6044b54`), y la sesión está en `docs/docs-02a-envivo-y-modelos`. Antes de programar, actualiza `main` y crea `feat/auth-02-…` (o `feat/auth-02a-…` si partes el encargo). PA-02 exige un árbol limpio salvo esta carpeta.
- **N-03:** confirma que aceptas que la API no arranque sin base, o pide la variante tolerante.

---

# Revisión del Manager — AUTH-02 — verificación de la Enmienda 1
Veredicto: APROBADO
Verificación propia: lint no ejecutado · test no ejecutado · build no ejecutado (verificación acotada de un plan, sin código nuevo, por instrucción). Solo lectura: `aprobacion.md`, esta revisión, `plan.md` completo y, para contrastar tres precisiones, `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/adapters/db/{usuarios,cliente}.ts`, `backend/test/salud-sin-base.integracion.test.ts` y `backend/test/entorno-de-pruebas.ts`. `npm view pg-boss@12 version` y `npm view resend@6 version` (solo lectura del registro): hoy las últimas son exactamente `12.34.0` y `6.29.0`.

Alcance: el humano pidió por escrito que solo verifique que la enmienda cubra sus decisiones. No revisé de nuevo el diseño que ya aprobé en modo plan.

La enmienda cubre cada decisión de `aprobacion.md` y cada detalle menor de la revisión en modo plan. Lo hace **dentro** de las secciones que corresponden, no solo en el bloque "Enmienda 1". Las referencias cruzadas y los conteos cuadran. Hay dos observaciones que no bloquean (E-01 y E-02); la segunda pide una confirmación de una línea al humano.

## Cobertura: decisión → sección del plan → cubierta
| Decisión (`aprobacion.md` / `revision.md`) | Dónde quedó en `plan.md` | ¿Cubierta? |
|---|---|---|
| P-01: partición 02a / 02b | "Partición" (tabla y viñetas), "Qué autoriza" (común, 02a, 02b), "Alcance", "Cambios por capa" (marcas por parte), "Conteos esperados", "Verificaciones" (qué V por parte), "Pasos" (1–15, 22a–24a / 1b, 16–21, 22b–24b), "Puntos de revisión" | Sí |
| P-01: 02a sin `frontend/` | "Partición" ("En AUTH-02a no se toca nada bajo `frontend/`"), "Qué autoriza 02a" ("Nada bajo `frontend/`"), V-22 (`git diff --quiet -- frontend` y `git status -- frontend` vacío) | Sí |
| P-01: PA-02, V-01 y V-22 admiten solo `docs/ESTADO.md` además de la carpeta | PA-02 ("nada más se admite"), V-01 (resultado esperado), V-22 (02a y 02b); `docs/ESTADO.md` además en "No autoriza" (lo mantiene el orquestador) | Sí |
| P-01: 02a no se despliega sola | "Partición" | Sí |
| M-01: PA-06 con los dos criterios | PA-06: "se detiene" si un dato llega al texto o hay más de una sentencia; "no es parada, y se sigue" si todo va en parámetros y solo se interpolan esquema, tabla y nombre de la cola (constantes nuestras validadas con `^[\w.\-/]+$`) | Sí |
| M-01: sin contingencia de `JSON.stringify` | DEC-07 (tachada y marcada "retirada"), PA-07 ("No hay ninguna adaptación autorizada") | Sí |
| M-01: `fromPrisma` y defensa del protocolo extendido | DEC-07 ("Evidencia que baja el riesgo" y "Defensa"), R-01, V-05 (punto a reportar) | Sí |
| M-01: DEC-07 describe el SQL real | DEC-07 "Qué SQL recibe" (`createJob`, `insertJobs`, qué se interpola) | Sí |
| N-01: búsqueda de `executeSql` en V-13 | V-13 (patrones y resultados esperados) | Sí |
| N-01: ESLint `no-restricted-syntax` fuera de `adapters/` | Tabla `backend/config/` (Bloque 2), V-14 (b) y (d), "Alcance" | Sí |
| N-01: exactamente un `$queryRawUnsafe`, en `ejecutorSqlDe` | DEC-07, tabla `adapters/`, V-13 ("exactamente una coincidencia") | Sí |
| N-02: retención ≈ 1 día en las dos colas | DEC-06, `adapters/queue/colas.ts`, prueba nueva en `cola.integracion`, V-10, S-14, R-12, R-17 | Sí |
| N-02: §18 dice que el límite de DEPLOY cubre `/auth/recuperar` | "Propuestas", §18 | Sí |
| N-03: opción (a) declarada | DEC-16, R-16, "Alcance" (no entra), §18 (`depends_on` con `healthcheck`), README §6 y §9 | Sí |
| N-04: nunca atrapar `P2002` dentro de la transacción; `createMany` con `skipDuplicates` | DEC-15 paso 3, regla de `adapters/db` y detalle de `prepararTokenDeRecuperacion`, "Acceso a datos", prueba concurrente, "Puntos de revisión". Ver E-02 | Sí |
| N-05: rechazo del remitente de ejemplo en `production`, con prueba | DEC-12, `config/correo.ts`, `correo.test` (+2), `.env.example`, V-16, README §3 y §9 | Sí |
| N-05: archivos de entorno separados, a §18 | S-13, "Alcance", §18 | Sí |
| N-06 (1): ayuda de prueba sobre `pgboss.job` | `buscarTrabajosPorCorreo` en `ayudas-cuentas.ts`, "Acceso a datos" (marcada solo de pruebas) | Sí |
| N-06 (2): `iniciarCola` después de crear `app` y antes de los handlers | DEC-16 y fila de `app.ts` (coincide con el orden real de `app.ts:18-30`) | Sí |
| N-06 (3): `validarUrlDePruebas` en `test/preparar-cola.ts` | DEC-16, tabla `backend/test/` (la función existe en `test/entorno-de-pruebas.ts:30`) | Sí |
| P-02 token derivado | "Preguntas resueltas", DEC-03 | Sí |
| P-03 dos límites y retención corta | "Preguntas resueltas", DEC-05, DEC-06 | Sí |
| P-04 con búsqueda y respaldo de `POST /admin/maestros` y `PUT …/correo` | "Preguntas resueltas", C-05, DEC-10, DEC-11 | Sí |
| P-05 solo el obligatorio | "Preguntas resueltas", DEC-09 | Sí |
| C-01 aprobada, con texto para ESSENTIALS | C-01, DEC-09, "Propuestas" (ESSENTIALS "Autorización") | Sí |
| C-02 a C-06, textos autorizados | "Contradicciones" y "Propuestas" (§6, §7, §8, §9, §14) | Sí |
| FE-01 solo en 02a y solo hasta la ronda 1 del Tester | Bloque FE-01, PA-11, PA-13, V-12, V-20, "Criterio de cierre", "Pruebas en rojo aceptadas", "Tareas heredadas" 1 y 3, R-11 | Sí |
| Temporal sin caducidad → pendiente de ADMIN | S-05 y "Pendientes" (ADMIN), con la indicación de que el orquestador lo lleva a `docs/ESTADO.md` | Sí |
| Autorizado: `pg-boss` 12.34.0 y `resend` 6.29.0 | "Qué autoriza 02a" y "Dependencias". Ver E-01 | Sí, con la salvedad de E-01 |
| Autorizado: migración `tokens_cuenta`, `rutas-publicas.ts`, esquema `pgboss` y V-17 en `campus_dev` | "Qué autoriza 02a" (migración y escrituras en `campus_dev`), tabla `backend/middleware/`, V-17, V-18 | Sí |
| Autorizado: el orquestador aplica los textos (C-01 a C-06 y §18) | "Propuestas" (con la parte en que se aplica cada uno), "Fuera de este encargo" | Sí |
| Red y firewall | S-01, Enmienda punto 3; PA-01 y V-01 sin cambios | Sí |
| Flujo y "sin commit" | "Flujo" y "No autoriza" | Sí |
| Detalles menores de la revisión (evidencia de V-05; Resend: fallo de red, llave vacía, `RESEND_BASE_URL`, `403` transitorio; comprobación de `TipoTokenCuenta`; valor exacto `re_llave_falsa_de_v16`; "Modificar" explícito; expiración de FE-01; S-05; `409` del restringido en el README de `middleware/`) | S-02, S-03, V-05, DEC-13, C-04, `fallos.test` (+1), `notifier-resend` (+1), tabla `adapters/` y `adapters/README.md`, PA-14, V-16, V-17, "Qué autoriza", PA-11, S-05, tabla `backend/middleware/` | Sí, todos |
| "Documentos a actualizar" de la revisión (ESSENTIALS "Reglas de datos", §14, §8, §18, D-27) | "Propuestas" | Sí |

## Precisiones que añadió el arquitecto
- **N-04 bis (`P2025` solo fuera de la transacción o con `updateMany` + `count`):** coherente. Aplica a un caso análogo la misma condición del humano. No amplía el alcance.
- **Segundo selector `MemberExpression[property.value='executeSql']`:** coherente. Cierra el acceso con corchetes que el primer selector no cubría, y la desestructuración queda para V-13. No amplía el alcance.
- **`describirCola` en `adapters/queue`:** coherente. Es la única forma de probar N-02 sin SQL propio sobre `pgboss.queue`. Tiene el mismo carácter que `asegurarCola` (función del adaptador que solo usan las pruebas), va por PK y está declarada en "Acceso a datos". Ampliación mínima y justificada.
- **Prueba concurrente nueva en `worker-correo-de-cuenta.integracion`:** coherente. Es la prueba que demuestra N-04 (la exclusión por id y `skipDuplicates`). Los conteos ya la incluyen.
- **Rechazo de Resend sin copiar el `message` del proveedor:** coherente con la regla 13 y con "Logs". Además evita que el mensaje del proveedor quede en `pgboss.job.output`. No amplía el alcance.
- **Nota de `RESEND_BASE_URL` en la sección `notifier` de `adapters/README.md`:** coherente. No existe un README propio del notifier, y mi detalle menor lo suponía. "No se define en ningún entorno" es una nota, no una validación nueva.
- **`salud-sin-base` sin tocar y en verde:** coherente. La prueba simula solo `adapters/db` (`salud-sin-base.integracion.test.ts:9-13`) y `cargarEnv()` apunta a la base desechable, así que pg-boss arranca. Lo confirma V-12. Si fallara, sería una prueba del Programador en rojo, y aplica PA-13 o el criterio de cierre, no una edición silenciosa.
- **`server.ts` en "No se toca":** coherente con N-03. Hoy `server.ts:7` hace `await construirApp(...)` en el nivel superior: si lanza, el proceso termina con código distinto de 0 sin cambiar el archivo.
- **`docs/ESTADO.md` en "No autoriza":** coherente con `aprobacion.md` ("el orquestador … actualiza `docs/ESTADO.md`") y con PA-02, V-01 y V-22.
- **(Declarada en el punto 5 de la Enmienda) El bloque `no-restricted-syntax` no alcanza a `backend/test/`:** coherente. N-01 y V-13 se refieren a `backend/src`, y los ataques del Tester necesitan invocar el ejecutor para probar la defensa del protocolo extendido.

## Coherencia interna (solo lo que tocó la enmienda)
- **Conteos:** cuadran.
  - `core/`: 11+6+5+4+3+3+6+6+4 = 48. `config/`: 11. `tokens-de-cuenta` + `notifier-*`: 5+4+6 = 15. `cola`: 8. Integración: 8+10+9+9+10+10+21+12+3 = 92.
  - Total del backend: 174 pruebas nuevas en 23 archivos, 330 + 174 = 504, y con el frontend 504 + 69 = 573.
  - Los +6 de la Enmienda (2+1+1+1+1) llevan de 168 a 174.
- **V-10:** espera 8 casos, que coinciden con `cola.integracion`.
- **V-14:** sus tres temporales coinciden con los de "Qué autoriza 02a > Crear" y "Borrar".
- **Verificaciones por parte:** "V-01 a V-18, V-20 a V-23" en 02a coincide con el contenido de 24a.
- **FE-01:** la excepción se redacta igual en PA-11, PA-13, V-12, V-20, el bloque FE-01 y "Pruebas en rojo aceptadas".
- **Hashes:** la tabla de V-02 tiene 14 filas, como dicen el texto y la tarea heredada 3.
- **Pasos:** la numeración 22a/23a/24a y 1b/22b/23b/24b no deja pasos sin dueño.
- **Sin referencias rotas:** no encontré ninguna PA, V o DEC que apunte a algo retirado o renumerado.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### E-01: PA-03 admite una versión menor más nueva; el humano autorizó versiones exactas
- **Dónde:** PA-03 ("una versión mayor dentro del mismo mayor se usa y se reporta"), V-03 y V-04, y los rangos `^12.34.0` y `^6.29.0` de "Qué autoriza 02a".
- **Por qué importa:** `aprobacion.md` autoriza "instalar pg-boss 12.34.0 y resend 6.29.0". `AGENTS.md` pide confirmación antes de agregar una dependencia. Además, la evidencia de M-01 (archivo y línea del SQL) es de 12.34.0. Con `^`, `npm install` resolvería una 12.35 si saliera antes del paso 3. El plan mismo dice que `aprobacion.md` "manda sobre todo lo demás" (línea 6), así que la versión literal prevalece. Hoy el riesgo es nulo: las últimas publicadas son exactamente las autorizadas.
- **Qué se espera:** al invocar al Programador, el orquestador le indica que cualquier versión instalada distinta de `12.34.0` o `6.29.0` (`npm ls` de V-04) se trata como PA-03 y detiene. No hace falta otra ronda del arquitecto.

### E-02: la condición de N-04 se generaliza como "atrapar **para seguir**"
- **Dónde:** "Regla de `adapters/db` (N-04)" y la Enmienda, punto 8.
- **Qué pasa:** el plan prohíbe atrapar un error de Prisma dentro de la transacción **para seguir**, pero mantiene que `crearMaestroInvitado` reutilice `crearUsuario`. Ese patrón, aprobado en AUTH-01 (`usuarios.ts:57-65`, usado dentro de `crearUsuarioConSesion`), atrapa el `P2002` dentro de la transacción, lo traduce y lo **relanza**. `corregirCorreo` hace lo mismo.
- **Por qué no bloquea:** técnicamente es correcto. Al relanzar, Prisma revierte y nunca se intenta el `COMMIT` sobre una transacción abortada (25P02), que era el riesgo de N-04. En `prepararTokenDeRecuperacion`, el caso que motivó la condición, no hay ningún `try/catch`.
- **Por qué se lo señalo al humano:** su texto literal dice "nunca atrapar P2002 dentro de la transacción", y el plan declara que `aprobacion.md` manda. Lo registro para que el Programador o el Tester no lo lean después como una contradicción (ver "Para el humano").

## Detalles menores
Ninguno que valga la pena anotar.

## Desacuerdos arbitrados
Ninguno nuevo.

## Documentos a actualizar
Sin cambios respecto de la revisión en modo plan. La sección "Propuestas" del plan ya recoge todo lo que pedí, con la parte (02a o 02b) en que se aplica cada texto.

## Para el humano
- **E-02 (una línea):** ¿confirmas que tu condición de N-04 significa "nunca atrapar `P2002` dentro de la transacción **para continuar**"?
  - **Si confirmas:** se conserva la traducción y el relanzamiento que ya usa AUTH-01 en `crearUsuario`, dentro de `crearMaestroInvitado` y `corregirCorreo`.
  - **Si la quieres literal:** esas dos funciones tendrían que traducir el `P2002` fuera de `enTransaccion`. Es un cambio pequeño, pero lo tendría que fijar el arquitecto antes de programar.
- **E-01:** no pide decisión, solo que el orquestador transmita la condición de versión exacta al Programador.

---

# Revisión del Manager — AUTH-02 — verificación de la Enmienda 2
Veredicto: APROBADO
Verificación propia: lint no ejecutado · test no ejecutado · build no ejecutado (verificación acotada de un plan, por instrucción). Solo lectura: `aprobacion.md` (sección "Enmienda 2"), `reporte-tester.md` (rondas 1 y 2), `plan.md` completo, el código del que parte la ronda 3 (`backend/src/adapters/db/{sesiones,usuarios,tokens-cuenta,cliente}.ts`, `backend/src/handlers/auth/{index,cuentas}.ts`, `backend/src/scripts/reset-admin.ts`, `backend/src/core/auth/sesiones.ts`), las migraciones de `usuarios`, `sesiones` y `tokens_cuenta` (índices y FK), `backend/test/intentos-r2.ataque.test.ts` y la ayuda `conFilaRetenida` de `backend/test/cuentas-r2.ataque.test.ts`.

Alcance: verifico que la Enmienda 2 cubra Q-E2-1 a Q-E2-5, que el protocolo de bloqueo cierre T-07, T-08 y T-09 sin reabrir T-01 ni crear un deadlock nuevo, y que las referencias cruzadas cuadren. No reviso otra vez el diseño que ya aprobé.

**Resumen.** La enmienda cubre las cinco decisiones dentro de las secciones que corresponden. El protocolo es correcto con los modos de fila de PostgreSQL y READ COMMITTED: cierra los tres hallazgos, conserva T-01 y no introduce ciclos entre transacciones de un mismo usuario. No hay nada que bloquee. Hay dos observaciones que no bloquean y el orquestador las puede transmitir al Programador sin otra ronda del arquitecto (E2-01 y E2-02). Además, hay un deadlock preexistente entre dos usuarios que conviene que el humano acepte o rechace antes de la última ronda del Tester (E2-03).

## Cobertura: decisión → sección del plan → cubierta
| Decisión (`aprobacion.md`) | Dónde quedó en `plan.md` | ¿Cubierta? |
|---|---|---|
| Q-E2-1 (a): corregir T-07, T-08 y T-09 en la ronda 3, la última | "Flujo" (párrafo Enmienda 2), Enmienda 2 punto 1, tabla "Preguntas de la Enmienda 2", "AUTH-02a — ronda 3 (Enmienda 2; la última)", R-18 | Sí |
| Q-E2-1: antes, el Manager verifica de forma acotada | "Flujo", "Pasos > ronda 3 > Precondición", "Puntos de revisión para el Manager" | Sí |
| Q-E2-1: un `ROTO` en la ronda 3 se escala al humano | "Flujo", Enmienda 2 punto 1, R-18, tabla de preguntas. PA-18 a PA-21 detienen sin remedios fuera del plan | Sí |
| Q-E2-2: `sesiones.ts`, solo `crearSesion`, `rotarSesion` y `revocarTodasLasSesiones` | "Qué autoriza 02a > Modificar", tabla `backend/adapters/` (fila `sesiones.ts`: las otras tres funciones no cambian, PB-7), código de `sesiones.ts`, PA-20 (firmas de `rotarSesion` y `revocarTodasLasSesiones` fijas) | Sí |
| Q-E2-2: `handlers/auth/index.ts`, **solo el bloque de `POST /login`** | "No autoriza" (excepción explícita), "Qué autoriza 02a > Modificar" ("ni `registro`, ni `refrescar`, ni `logout`"), "Alcance", DEC-02, tabla `backend/handlers/` (fila "Modificar" y fila "No se toca"), bloque de código del login, PA-20, "Puntos de ataque", "Puntos de revisión" | Sí |
| Q-E2-2: V-22 deja de exigir que `index.ts` no cambie, y comprueba el bloque | V-22: `index.ts` sale de la lista de `git diff --quiet` (lo confirmé en el comando) y se añade `git diff -U0` con "todos sus fragmentos caen dentro del manejador de `POST /login`". El bloque de código propuesto solo toca líneas entre `intentos.delete(llave)` y `return responderConSesion(...)` (hoy `index.ts:132-140`). No necesita importaciones nuevas: `crearSesion` y `credencialesInvalidas` ya existen | Sí |
| Q-E2-3: `actualizarContrasenaYRevocarSesiones` con 2 pruebas | Tabla `backend/adapters/` (fila `usuarios.ts`), detalle de `usuarios.ts`, bloque "`reset:admin` (Q-E2-3)", "Acceso a datos", combinaciones 5 y 8, pruebas **B2** y **C3** | Sí |
| Q-E2-3: `scripts/` no cambia | "No autoriza" (`backend/src/scripts/**`), "Qué no cambia", PA-20, V-22 (`backend/src/scripts` sigue en `git diff --quiet`). `reset-admin.ts:36` llama a `actualizarContrasenaYRevocarSesiones(id, hash)`, y la firma no cambia | Sí |
| Q-E2-4: `401 CREDENCIALES_INVALIDAS` sin sumar un fallo | Bloque del login (`intentos.delete(llave)` **antes** de `crearSesion`; `if (!creada) throw credencialesInvalidas()`), viñetas debajo del bloque, C1 (cuerpo idéntico al de una contraseña incorrecta) | Sí |
| Q-E2-4: se conserva `intentos-r2.ataque` | "Efecto sobre las `*.ataque`". Lo comprobé en la prueba: el doble (`intentos-r2.ataque.test.ts:27-30`) sustituye `crearSesion` **por nombre** y reenvía los argumentos tal cual, así que el `hashVerificado` llega al original. Su caso "si falla la creación de la sesión…" (línea 138) exige que la llave se borre antes de `crearSesion`, y el plan lo conserva | Sí |
| Q-E2-5: textos para ESSENTIALS "Reglas de datos" y §14 | "Propuestas > Al cerrar AUTH-02a": dos viñetas marcadas "Enmienda 2, Q-E2-5, aprobado por el humano" | Sí |

## Valoración del protocolo
Base técnica (PostgreSQL, bloqueos de fila):
- Conflictos: `KEY SHARE` solo choca con `UPDATE`. `SHARE` choca con `NO KEY UPDATE` y `UPDATE`. `NO KEY UPDATE` choca con `SHARE`, `NO KEY UPDATE` y `UPDATE`. `UPDATE` choca con todos. La tabla de modos del plan es correcta.
- Un `UPDATE` que no cambia columnas con índice único utilizable por una FK toma `NO KEY UPDATE`. `usuarios_email_key` es un índice único simple sobre `email` (migración `20260923143021`, línea 45), así que cambiar `email` toma `FOR UPDATE`. Los índices parciales, como el de un solo admin, no cuentan.
- `heap_lock_tuple` concede sin esperar un modo que la propia transacción ya cubre con uno igual o más fuerte. Lo hace a propósito para no bloquearse contra quien espera un modo más fuerte. Por eso el `KEY SHARE` que pide la verificación de la FK, al insertar en `sesiones` o en `tokens_cuenta`, no espera cuando la transacción ya tiene `SHARE` o `NO KEY UPDATE` sobre esa fila, aunque sea parte de un MultiXact con otros `SHARE`.
- En READ COMMITTED, un `SELECT … FOR SHARE/NO KEY UPDATE` que esperó sigue la cadena de actualización y devuelve la versión confirmada más reciente. Cada sentencia posterior toma una instantánea nueva. En eso descansan el cierre de T-08 y el de T-09.
- La fila de una sesión que se revoca (`UPDATE sesiones SET revocada_en/reemplazada_por`) no cambia `usuario_id`: no dispara la verificación de la FK y no pide nada sobre `usuarios`. `reemplazada_por` no tiene FK (migración `20260923143021`).

| # | Combinación | Qué pasa con el protocolo | Valoración |
|---|---|---|---|
| 1 | `restablecer`/`establecer-contrasena` × `refrescar` (T-07) | `usarTokenYCambiarContrasena` toma `NO KEY UPDATE` sobre U. `rotarSesion` pide `SHARE` sobre U **antes** de tocar S, así que espera sin retener nada. El ciclo de la ronda 2 era: sesión, luego `KEY SHARE` de la FK, frente a U con `FOR UPDATE`, luego sesiones. Desaparece porque ya nadie retiene una sesión mientras espera a U. Si gana el escritor, la rotación ve S revocada (`count = 0`), devuelve `null` y el handler responde `401`. Si gana la rotación, el escritor ve S' y la revoca | Cierra T-07 |
| 2 | Restablecimiento del admin × `refrescar` (T-08) | `SHARE` de la rotación frente a `NO KEY UPDATE` de `restablecerConTemporal`: quedan en serie, y el `UPDATE sesiones` del escritor empieza con una instantánea posterior al `COMMIT` de S' | Cierra T-08 |
| 3 | `cambiar-contrasena` × `refrescar` de otra sesión (T-08) | Igual que 2. Con `conservarSesionId`, una S' que venga de rotar la sesión conservada tiene otro id y también se revoca. El usuario pierde la sesión, pero el fallo es hacia el lado seguro | Cierra T-08 |
| 4 | `reset:admin` × `refrescar` | Igual que 2 (`actualizarContrasenaYRevocarSesiones` bloquea primero). La llamada explícita no es estrictamente necesaria, porque su `UPDATE usuarios` ya toma `NO KEY UPDATE`, que choca con `SHARE`. Como dice el plan, sirve para uniformidad y auditoría | Correcto |
| 5 | Rama de reutilización (`revocarTodasLasSesiones`) × rotación de otra sesión | `revocarTodasLasSesiones` pasa a ser una transacción con `NO KEY UPDATE` primero, en serie con la rotación. En `refrescar`, cuando `rotarSesion` devuelve `null`, la llamada a `revocarTodasLasSesiones` es **otra** transacción: la de la rotación ya confirmó, así que no hay subida de `SHARE` a `NO KEY UPDATE` dentro de una misma transacción. Si alguien la metiera dentro de la transacción de `rotarSesion`, dos detecciones concurrentes se bloquearían entre sí. PB-3 lo prohíbe, y PA-20 impide cambiar la firma de `rotarSesion` o de `refrescar` | Correcto |
| 6 | Dos rotaciones de la misma sesión; login + refresco del mismo usuario | Los `SHARE` son compatibles entre sí. La que pierde espera la fila S retenida por la otra, que no espera nada suyo: su `KEY SHARE` lo cubre su propio `SHARE`. Sin ciclo. La semántica de reutilización de AUTH-01 queda igual | Correcto |
| 7 | Login con la contraseña vieja × cualquier escritor (T-09) | `crearSesion` lee `hash_contrasena` y `activo` con `FOR SHARE` y compara con el hash verificado. Si el escritor confirmó antes, la lectura con bloqueo devuelve la versión nueva: argon2id con otra sal, `null`, `401`. Si el login confirmó antes, el escritor ve la sesión y la revoca | Cierra T-09, también frente al admin, `cambiar-contrasena` y `reset:admin` (C1 a C4) |
| 8 | Escritores entre sí (T-01): dos enlaces; enlace × admin; enlace × `cambiar-contrasena`; worker × enlace; `cambiar-contrasena` × admin | Todos toman `NO KEY UPDATE` sobre U como primera sentencia, así que quedan en serie. Las filas de `tokens_cuenta` y de `sesiones` de U solo se bloquean después de tener U, y ninguna transacción fuera del protocolo retiene una de esas filas mientras espera otra | No reabre T-01 |
| 9 | `KEY SHARE` implícito de las FK | Solo lo piden los `INSERT` en `sesiones` o `tokens_cuenta`. Dentro del protocolo (`crearSesion`, `rotarSesion`, `prepararTokenDeRecuperacion`) lo cubre el bloqueo propio. Fuera del protocolo solo lo piden las inserciones sobre un usuario nuevo (`crearUsuarioConSesion`, `crearMaestroInvitado`), que nadie más ve. Como `NO KEY UPDATE` no choca con `KEY SHARE`, las tablas hijas futuras no esperan a los escritores de credenciales | Correcto; es la razón de bajar de `FOR UPDATE` a `NO KEY UPDATE` |
| 10 | `corregirCorreo` × cualquiera | Su primera sentencia, `UPDATE usuarios SET email`, toma `FOR UPDATE` porque `email` tiene un índice único. Llamar antes a `bloquearUsuarioParaEscribir` sería una subida de `NO KEY UPDATE` a `UPDATE`: esperaría a los `KEY SHARE` ajenos (hoy ninguno; mañana, inserciones de tablas hijas) mientras retiene la fila. Tomar el modo fuerte primero evita la subida. Si el correo nuevo es igual al actual, PostgreSQL toma `NO KEY UPDATE`, que también queda en serie con todo el protocolo. Es correcto que sea "la excepción" | Correcto |
| 11 | `logout`, `revocarSesion`, `revocarSesionPorHash` | Sentencia única sobre una fila de `sesiones`, sin tocar `usuarios`. Retienen una fila y no esperan teniendo otra, así que no cierran un ciclo. Un `logout` que coincide con la rotación de la misma cookie no revoca S'. No es una carrera nueva: con la cookie ya rotada pasa lo mismo sin concurrencia, porque el diseño de AUTH-01 revoca solo la sesión exacta | Fuera del protocolo, bien justificado (PB-7) |
| 12 | `registro` y `crearMaestroInvitado` | Crean el usuario en la misma transacción: nadie puede bloquear esa fila antes del `COMMIT`. Su única espera posible es la verificación de unicidad de `email` frente a otra transacción en curso con el mismo correo, y en ese momento no retienen ninguna fila de un usuario existente | Fuera del protocolo, bien justificado (PB-7) |
| 13 | ¿Alguna transacción del protocolo toma dos filas de `usuarios`? | Ninguna bloquea dos filas: cada una recibe un solo `usuarioId`, y en `rotarSesion` el `nueva.usuarioId` es el `sesion.usuarioId` de la sesión que rota (`index.ts:180`). La única espera sobre **otro** usuario es la de unicidad de `email` en `corregirCorreo`. Ver E2-03 | Sin hueco en T-07/T-08/T-09; el caso preexistente queda en E2-03 |

Las pruebas nuevas (A1 a E7) ejercitan cada combinación del protocolo, y con el protocolo sus resultados esperados son los correctos. El criterio de "formada" de `conFilaRetenida` (conteo recursivo con `pg_blocking_pids`) sigue funcionando aunque la espera pase de la fila de la sesión a la del usuario. Lo mismo vale para las 4 pruebas de `cuentas-r2`, cuya ayuda usa un criterio genérico.

## Coherencia interna
- **Conteos:** `bloqueo-usuario.integracion` tiene 19 pruebas (A 4 + B 3 + C 4 + D 1 + E 7). 616 + 19 = 635 y 63 + 1 = 64. Cuadran en la Enmienda 2 punto 12 y en "Conteos esperados". La tabla de hashes vigente es la de la ronda 2 del Tester, con 23 archivos, como dicen "Qué no cambia", V-02 y el paso 1 de la ronda 3.
- **Referencias:** PA-18 a PA-21 existen y se citan bien ("PARADAS", pasos 10 y 14). R-18 a R-23 existen. V-13 (patrón y resultado), V-20 (búsqueda de bloqueos, PA-19) y V-22 (`-U0`) están actualizadas. Los tres archivos de "Crear en la ronda 3" están marcados "Crear" en sus tablas. La lista de Prettier del paso 11 solo nombra archivos autorizados. DEC-08 tiene el paso 0, DEC-09 los pasos 5 y 8 y DEC-10 el bloqueo previo, como anuncian los puntos 4, 5 y 8 de la enmienda.
- **Enmienda 1 y secciones no tocadas:** no pude compararlas de forma mecánica. La carpeta no está en git y no encontré ninguna copia anterior de `plan.md`. En la lectura completa, el bloque "Enmienda 1" (sus 19 puntos y "Qué no cambia") coincide con lo que registré al verificarla (por ejemplo, los +6 de 168 a 174, N-04 bis y el punto 5 sobre `backend/test/`). No vi texto alterado en las secciones que la Enmienda 2 no dice tocar. Los únicos cambios fuera de su lista son precisiones que ella misma anuncia ("Alcance", DEC-02, "Qué autoriza").
- **Etiquetas de la propuesta:** `aprobacion.md` cita "E2-1 a E2-11", "E2-9" y "E2-10", pero `plan.md` ya no usa esas etiquetas: la versión aprobada numera los cambios del 1 al 17 y reproduce las opciones en la tabla Q-E2. No hay ambigüedad de contenido (ver "Detalles menores").

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### E2-01 — PA-18 no distingue el vencimiento de la transacción interactiva de Prisma de un fallo del protocolo
- **Dónde:** PA-18, PA-19 y "`test/ayudas-concurrencia.ts`".
- **Qué pasa:**
  - `crearSesion`, `rotarSesion` y `revocarTodasLasSesiones` pasan a ser transacciones interactivas que pueden esperar un bloqueo. Por defecto, Prisma las cierra a los 5 s (`timeout`) y espera como máximo 2 s una conexión (`maxWait`). Un cierre por tiempo sale como `P2028` y el cliente recibe un `500`.
  - En producción, la espera está acotada por transacciones de milisegundos (PB-6).
  - En las pruebas, la primera operación de `conFilaRetenida` espera hasta que las siguientes se formen detrás, con un límite de 10 s por operación. El plan solo da 30 s a la transacción retenedora. Con dos operaciones y argon2 fuera, la espera real queda muy por debajo de 5 s, y las pruebas de la ronda 2 del Tester usan el mismo patrón sin problemas. Por eso el riesgo es bajo, pero en la última ronda una lentitud del equipo aparecería como PA-18.
- **Qué se espera:** el orquestador indica al Programador que, si PA-18 se activa, el resumen diga si el error es `P2028` (tiempo de la transacción) o `40P01`/`could not serialize` (protocolo). No se cambia ninguna opción de Prisma: sigue valiendo "nada de remedios fuera del plan". Con esa distinción, el humano sabe si el problema es de diseño o del equipo. No hace falta otra ronda del arquitecto.

### E2-02 — V-13 y E6 deben excluir el cliente generado y los `.md`
- **Dónde:** V-13 ("`$queryRaw` etiquetado… solo en `salud.ts` y `bloqueo-usuario.ts`") y E6.
- **Qué pasa:**
  - `backend/src/adapters/db/generated/internal/{class,prismaNamespace}.ts` contienen `$queryRaw`, y `adapters/README.md` va a describir el protocolo. Leída al pie de la letra sobre `backend/src`, la búsqueda nunca da lo esperado.
  - En la ronda 1, el Programador ya excluyó `generated/` para `$queryRawUnsafe` y lo declaró, así que lo más probable es que lo repita.
  - E6 dice `adapters/db/*.ts`, sin recursión, y así no alcanza `generated/`. Pero si la prueba se escribe recursiva, falla.
- **Qué se espera:** el orquestador precisa al Programador que V-13 y E6 cuentan solo el código propio. Es decir: `.ts` fuera de `adapters/db/generated/` y sin `*.md`. Así ni la verificación ni la prueba dependen de cómo se interprete. No hace falta otra ronda del arquitecto.

### E2-03 — Deadlock preexistente entre dos cuentas en `corregirCorreo` (intercambio de correos)
- **Dónde:** `corregirCorreo` (`usuarios.ts:231-250`), "Por qué no hay deadlock" (el argumento es por usuario) y "Puntos de ataque > Carreras…" ("corrección de correo… nunca un `5xx`").
- **Qué pasa:**
  - Dos correcciones concurrentes cruzadas: A pasa a `b@…` mientras B pasa a `a@…`.
  - Cada `UPDATE` tiene ya su fila y, al insertar la entrada nueva en `usuarios_email_key`, espera a la transacción que está borrando la entrada vieja del otro. Eso forma un ciclo `40P01`: `500` en una de las dos, con los datos consistentes.
  - Existe desde la ronda 1, no lo introduce la Enmienda 2 y no tiene relación con T-07, T-08 ni T-09.
  - Exige que el único admin mande a la vez dos correcciones cruzadas. En serie, la primera ya respondería `409 CORREO_EN_USO`.
  - Registro e invitación frente a `corregirCorreo` no forman ciclo: no retienen ninguna fila de un usuario existente.
- **Por qué lo señalo ahora:** en la ronda 3, el Tester ataca "cualquier combinación… con corrección de correo: nunca un `5xx`". Si lo encuentra, sería `ROTO` en la última ronda y se escalaría por algo que el protocolo no pretende cubrir.
- **Qué se espera:** decisión del humano ("Para el humano"). Mi recomendación es aceptarlo como riesgo residual en este encargo y anotarlo para ADMIN, donde la gestión de usuarios puede serializar las correcciones o traducir el `40P01` a un `409`.

## Detalles menores
- `aprobacion.md` cita las etiquetas de la propuesta ("E2-1 a E2-11", "E2-9", "E2-10"), que no existen en `plan.md`. El orquestador puede añadir una nota: "E2-9 = la pregunta Q-E2-1; E2-10 = los textos de Q-E2-5".
- DEC-09 no dice si un `false` de `cambiarContrasenaPropia` (D1) cuenta como fallo del límite. En el paso 6 la llave ya se borró. Es inocuo: quien llega ahí probó la temporal vigente en ese momento. No hace falta precisarlo.
- `handlers/auth/cuentas.ts` y `adapters/db/tokens-cuenta.ts` siguen marcados "Crear" en sus tablas, pero en la ronda 3 se modifican. Los pasos 3 y 6 lo dicen explícitamente, así que no hay ambigüedad.
- Las importaciones nuevas de `sesiones.ts` y `usuarios.ts` (`bloqueo-usuario.js`) quedan implícitas en "solo `crearSesion`, `rotarSesion` y `revocarTodasLasSesiones`". Son necesarias y no violan PA-20.

## Desacuerdos arbitrados
Ninguno.

## Documentos a actualizar
Sin cambios respecto de lo que ya dice el plan. Los dos textos de Q-E2-5 (ESSENTIALS "Reglas de datos" y §14) se aplican al cerrar AUTH-02a. La sección del protocolo en `backend/src/adapters/README.md` la escribe el Programador en el paso 8. Si el humano acepta E2-03, conviene añadir una línea a los pendientes de ADMIN en `docs/ESTADO.md`.

## Para el humano
- **E2-03 (opcional, una línea):** ¿aceptas como riesgo residual de AUTH-02a que dos correcciones de correo **concurrentes y cruzadas** entre dos cuentas puedan responder `500` en una de ellas, sin dañar datos, y que quede pendiente para ADMIN? Si lo aceptas, el orquestador se lo indica al Tester antes de la ronda 3 para que no cuente como `ROTO`. Si no, hace falta una ronda del arquitecto, porque tocaría `corregirCorreo` fuera de lo que autoriza la Enmienda 2.

---

# Revisión del Manager — AUTH-02a — final
Veredicto: APROBADO
Verificación propia (2026-09-25, rama `feat/auth-02a-cuentas-backend`, una corrida completa desde la raíz): lint `código 0` · build `código 0` · test `backend 65 archivos / 657 de 657; frontend 11 / 69 de 69`.

**Precondición del backend, comprobada antes de correr nada:**
- La regla del firewall "Campus: bloquear entrada a Docker en redes publicas" está `True` / `Inbound` / `Block` / `Public`.
- La red es `IZZI-F281` / `Public`, declarada de confianza por el humano.
- Docker `28.5.1`, sin contenedores de Testcontainers al empezar.

**Salidas reales:**
- **`npm run lint`:** código 0. ESLint, `prettier --check` ("All matched files use Prettier code style!" en los tres workspaces) y `tsc`.
- **`npm run build`:** código 0.
  - Queda el aviso de Vite de un chunk de más de 500 kB. Ya existía y es del frontend, que no cambió.
- **`npm test`:** código 0.
  - Backend: `Test Files 65 passed (65)`, `Tests 657 passed (657)`, `Duration 32.25s`.
  - Frontend: `Test Files 11 passed (11)`, `Tests 69 passed (69)`, `Duration 6.63s`.
  - En el log de la corrida, 0 coincidencias de `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` y `could not serialize`.
- **Contenedores:** unos 10 s después de terminar, `docker ps -a --filter "label=org.testcontainers=true"` salió vacío.
- **Hashes:** `sha256sum -c` de las 24 `*.ataque` de la tabla de la ronda 3 del Tester dio 24/24 `OK`. En disco hay exactamente 24 archivos `*.ataque.test.ts(x)`.
- **Pruebas desactivadas:** busqué `.skip`, `.only`, `.todo`, `.fails`, `skipIf(`, `runIf(`, `xit(`, `xdescribe(` y `xtest(` en todos los `*.test.ts(x)` de `backend/`, `frontend/` y `shared/`. Sin coincidencias.
- **Archivos protegidos:** `git diff --quiet` dio `codigo=0` sobre esta lista:
  - `infra`, `frontend`, `AGENTS.md`, `CLAUDE.md`, `.claude`;
  - `docs/ARCHITECTURE*.md`, `docs/PRD.md`;
  - `handlers/auth/cookie.ts`, `server.ts`, `scripts/`, `middleware/authenticate.ts`;
  - las dos migraciones anteriores;
  - `tsconfig*`, `vitest.config.ts`, `prisma.config.ts`, `.prettier*`, `.git*`.

  `git status` no muestra nada nuevo bajo `frontend/`, `infra/`, `backend/src/scripts/` ni `.claude/`.
- **Finales de línea:** los 65 archivos nuevos de `backend/` y `shared/` están en `w/lf`.

**Alcance:** corrí una sola corrida completa. El Programador y el Tester corrieron tres cada uno en la ronda 3, con el mismo resultado. No arranqué la API ni el worker contra `campus_dev`, no escribí en ninguna base y no toqué código.

**Resumen.** AUTH-02a hace lo que se pidió y como se acordó:
- los ocho endpoints tienen su cadena de middleware completa;
- la migración solo crea objetos;
- el encolado va en la misma transacción que el dato;
- el correo sale solo por `notifier` y nunca es real fuera de `prod`;
- el protocolo de bloqueo de la Enmienda 2 está aplicado en todas las transacciones de su alcance;
- el diff de `handlers/auth/index.ts` se limita al bloque de `POST /login`.

Lo verifiqué leyendo el código, no solo los resúmenes. Nada bloquea. Quedan cuatro puntos que no bloquean:
- **MF-01 y MF-02:** son de texto y conviene corregirlos **antes del commit**.
- **MF-03:** es una desviación de alcance que el humano ratifica en su revisión del diff.
- **MF-04:** son pendientes para ADMIN y DEPLOY, a partir de las observaciones de la ronda 3 del Tester.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### MF-01 — Dato personal en un archivo de traspaso que se va a versionar
- **Dónde:** `docs/trabajo/AUTH-02-cuentas-y-correo/resumen-programador.md:68` (V-17 de la ronda 1).
- **Qué hay:** la "huella" copia en claro el correo de la cuenta de desarrollo del humano y los prefijos de los UUID de las dos cuentas de `campus_dev`. [Valores retirados de este archivo y de `resumen-programador.md` por el orquestador el 2026-09-26, por decisión del humano (MF-01).]
- **Por qué importa:**
  - `docs/trabajo/` se versiona (`AGENTS.md`, "Reglas del equipo").
  - Ese correo no aparece en ningún archivo rastreado hoy (`git grep` vacío).
  - Las rondas 2 y 3 hicieron bien lo mismo: capturaron la huella en un archivo de `tmp/` y no la imprimieron.
- **Lo demás está limpio:**
  - `re_llave_falsa_de_v16` es la llave falsa del plan, a propósito.
  - `admin@campus.local` es el valor de `.env.example`.
  - Los PID son locales.
  - No hay tokens, JWT, hashes de argon2 ni `#token=` en ninguno de los cinco archivos.
- **Qué se espera:** antes del commit, el orquestador sustituye esa línea por "huella capturada en `tmp/` (no impresa); idéntica antes y después". No hace falta otra ronda del Programador.

### MF-02 — README: una frase invertida y conteos que ya no valen
- **Dónde:** `README.md:145` (§3) y `README.md:228` (§7).
- **Qué hay:**
  - **§3** dice "Fuera de `development`, `test` no hace falta tocarlas". Dice lo contrario de lo que quiere decir: son `development` y `test` los entornos donde no hace falta tocarlas, porque tienen valores por defecto.
  - **§7** conserva los números de la ronda 1: "54 archivos con 509 pruebas", "192" adversarias y "entre 17 y 25 segundos". Hoy son 65 archivos y 657 pruebas, 24 archivos `*.ataque` en total y unos 32 s en mi corrida (entre 24 y 32 s en las de la ronda 3). La cifra de 192 era la de AUTH-01.
- **Por qué importa:** la definición de terminado pide los documentos al día, y §3 puede confundir justo en la regla 12.
- **Qué se espera:** antes del commit, corregir las dos frases, sin tocar código. Es un cambio del carril trivial. Lo aplica el orquestador junto con los textos de documentos, o el Programador en una pasada acotada a `README.md`. Formateo solo con la ruta explícita.

### MF-03 — `handlers/errores.ts` cambió aunque el plan lo marca "No se toca"
- **Dónde:**
  - `plan.md:845`: la fila "No se toca" de `backend/handlers/` incluye `handlers/errores.ts`.
  - El cambio: `backend/src/handlers/errores.ts` (`erroresDeEnrutamiento`, código `SOLICITUD_INVALIDA`) y `backend/src/app.ts` (`frameworkErrors`). Es la corrección de T-05 en la ronda 2.
- **Qué pasa:**
  - El Programador lo registra como "no es una desviación porque el hallazgo la autoriza por escrito" y cita "Resuélvelo en `app.ts` o en `handlers/errores.ts`…".
  - Ese texto **no está** en `reporte-tester.md`. Probablemente venía en la invocación del orquestador.
  - Aun con esa autorización, un Tester no puede ampliar el alcance de un plan aprobado por el carril sensible: eso es del humano.
- **Por qué no bloquea:**
  - `frameworkErrors` solo puede ir en el constructor de `Fastify` (`app.ts`, autorizado).
  - Poner su manejador en `errores.ts` es el lugar natural y no toca `manejoDeErrores`.
  - El cambio es mínimo, no repite el valor recibido y sale con el formato de la API.
  - El Tester lo atacó en la ronda 2 sin regresiones: `404`, `413`, `415` y JSON mal formado siguen igual.
  - Queda una observación sin efecto: `FST_ERR_ASYNC_CONSTRAINT` respondería `400`, pero hoy no se puede alcanzar.
- **Qué se espera:** el humano lo ratifica al revisar el diff (ver "Para el humano"). Como práctica, un cambio a un archivo marcado "No se toca" se declara como desviación, venga de donde venga la sugerencia.

### MF-04 — Tres observaciones de la ronda 3 del Tester que conviene dejar escritas como pendientes
No son defectos de AUTH-02a: el diseño de este encargo las cubre. Pero un encargo futuro puede reabrirlas sin darse cuenta.

- **ADMIN: la baja o desactivación debe cumplir PB-8.**
  - `refrescar` (`buscarSesionPorHash`) y `restablecer` / `establecer-contrasena` (`decidirUsoDeToken`) leen `activo` **antes** del bloqueo.
  - `rotarSesion` y `usarTokenYCambiarContrasena` no lo vuelven a comprobar.
  - Hoy ninguna ruta desactiva cuentas.
  - Una baja que bloquee la fila, ponga `activo = false` y revoque sesiones y enlaces en la misma transacción cierra las dos ventanas; la ronda 3 del Tester lo probó.
  - Una desactivación que no revoque las reabre.
- **ADMIN: cambios masivos sobre `usuarios` en lotes cortos.**
  - Es el caso del cambio masivo de estado de pago o de la restricción.
  - Todo `UPDATE usuarios` toma `FOR NO KEY UPDATE`, que choca con el `FOR SHARE` del login y del refresco.
  - Si una transacción retiene filas de usuarios más de 5 s (el límite de las transacciones interactivas de Prisma), los logins y refrescos de esos usuarios responden `500` por `P2028`. El Tester lo reprodujo y el estado queda consistente.
  - Es la otra cara de PB-6 y R-21.
- **DEPLOY: una sola instancia del worker.**
  - El tope durable de 3 recuperaciones por hora (`contarRecuperacionesRecientes`) se lee fuera del bloqueo.
  - Con un consumidor y `batchSize: 1` es exacto. Con varios workers podría excederse.
  - Se suma a los límites en memoria de la API, que también suponen una instancia (S-12).

**Qué se espera:** el orquestador añade las dos primeras a los pendientes de ADMIN y la tercera a los de DEPLOY, en `aprobacion.md` y `docs/ESTADO.md`. La tercera va también como viñeta de §18 (abajo).

## Detalles menores
- **`adapters/db/index.ts` reexporta `ejecutorSqlDe`** y nadie fuera de `adapters/db` lo usa. No abre nada, porque exige un `Prisma.TransactionClient` que ningún handler tiene. Aun así, sobra superficie. Se puede quitar en el próximo encargo que toque ese índice.
- **`iniciarCola` hace dos `createQueue` dentro de un `for`.** Son dos consultas fijas al arrancar y tienen que ir en orden, porque la cola de fallidos va primero. No es N+1 ni ocurre por petición. Lo acepto.
- **Comentario de FE-01 en `sesiones-y-cadena.ataque.test.ts:426`:** dice "las 14 de AUTH-01 + AUTH-02a", pero la lista tiene 16 entradas (incluye los `HEAD`). Es un archivo del Tester y no cambia lo que protege; no se toca ahora.
- **Cola de fallidos:** ni `workers/README.md` ni `adapters/README.md` dicen que un trabajo que pasa a esa cola recibe **otro id**, y que el original llega en `sourceId` con `includeMetadata: true` (desviación 5 de la ronda 1 y T-02). Lo propongo para §8, abajo.
- **`describirCola` rellena con `?? 0` / `?? false`.** Solo lo usan las pruebas, y un valor que faltara igual haría fallar la aserción de 86 400. No oculta nada relevante.
- **`actualizarContrasenaYRevocarSesiones` (`reset:admin`)** se probó solo como función (B2 y C3), no como script. `scripts/` no cambió y llama exactamente a esa función. Es aceptable.

## Desacuerdos arbitrados
- **Las dos desviaciones declaradas: las acepto.**
  - **`cuentas.ts` sin `env` (ronda 1).** Ninguna de sus cuatro rutas lee configuración. `NOMBRE_COOKIE_REFRESCO` es fijo, y un parámetro sin usar lo rechazaría el estilo del proyecto. No cambia ningún comportamiento ni ninguna prueba.
  - **El paso 0 de bloqueo en DEC-08 (ronda 2).** La Enmienda 2 lo formalizó (punto 4, "DEC-08 gana el paso 0") y lo bajó a `FOR NO KEY UPDATE`. Ya no es una desviación. En el código, el paso 0 no escribe nada, y los pasos 1 a 3 quedan tal como los describe DEC-08.
- **Desviaciones no declaradas:** solo MF-03. Revisé también:
  - `trabajarFallidos` (T-02): archivo autorizado.
  - `prisma format` sin ejecutar y el formato hecho a mano: declarado, y `--check` pasa.
  - El consumidor único en `worker-consumidor` y `buscarTrabajosPorCorreo` sin usar en `invitacion`: declarados, y solo afectan pruebas.

  Ninguno sale del plan.
- **Cambios del Tester en `*.ataque` existentes (ronda 1, tareas heredadas): los ratifico.** Revisé el diff:
  - FE-01 conserva la lista exacta y **refuerza** lo que protege, con dos casos nuevos: `POST /admin/maestros` exige admin, e invitar con `rol: "admin"` crea un maestro y sigue habiendo un solo admin.
  - Los `if (!admin) return` pasan a ser precondiciones que fallan con mensaje (`expect` + `throw`), sin debilitar ninguna aserción.
  - `admin-unico` exige ahora `P2002` concreto.
- **P2028 → `500` (observación del Tester):** estoy de acuerdo en que no es un hallazgo. Solo se alcanza reteniendo la fila del usuario más de 5 s, y ninguna transacción del sistema lo hace. Es el dato que pedía E2-01, y el estado queda atómico. Queda como pendiente para ADMIN (MF-04).
- **E2-03:** el humano lo aceptó como riesgo residual. El Tester no lo contó como ROTO, y `corregirCorreo` no se tocó más allá de documentarlo como la excepción de PB-2. Es correcto.
- **Entre el Programador y el Tester no quedó ningún desacuerdo:** el Programador no impugnó ninguna prueba en ninguna ronda.

## Reglas que no se rompen (`AGENTS.md` 1–13)
| # | Regla | Resultado |
|---|---|---|
| 1 | Capas | Cumple. `pg-boss` solo en `adapters/queue/index.ts` y `resend` solo en `adapters/notifier/resend.ts`: lo exige ESLint y lo confirma el grep del Tester. `core/` es puro. Handlers sin `obtenerDb` ni `adapters/db/cliente` (T-03 resuelto). `bloqueo-usuario.ts` no se reexporta |
| 2 | Cadena de middleware | Cumple. Las 4 rutas de admin llevan `protegido({ roles: ["admin"] })`. `cambiar-contrasena` lleva `protegido({ permitirCambioPendiente, permitirRestringido })` (C-01). Las 3 públicas están en `rutas-publicas.ts`. No hay ninguna verificación de rol en los handlers. 21 pruebas de autorización más las del Tester |
| 3 | Estado de pago | Cumple. `usuarioAdminSchema` no lo tiene, los `select` de `adapters/db` no lo piden y las respuestas pasan por `.parse` de `shared/` |
| 4 | Consultas sanas | Cumple. Todas por PK, `email` único, `hash_token` único o `(usuario_id)`. No hay listas y la búsqueda devuelve una fila. `$queryRaw` etiquetado solo en `salud.ts` y `bloqueo-usuario.ts`. Un único `$queryRawUnsafe` (`ejecutorSqlDe`), con los datos de pg-boss siempre como parámetros |
| 5 | Lo lento por cola | Cumple. Ningún handler llama a `notifier`, y ESLint lo impide. La invitación encola dentro de su transacción (`alGuardar(ejecutorSqlDe(tx))`). `recuperar` encola sin transacción porque no escribe ningún dato (DEC-04, T-03) |
| 6 | Archivos | No aplica |
| 7 | UTC | Cumple (`TIMESTAMPTZ(3)`, `Date`) |
| 8 | Trabajos diferidos | No aplica |
| 9 | Secretos | Cumple. La llave de Resend solo la lee el worker (`config/correo.ts`). Los mensajes de error no repiten valores. El `.env.example` trae la llave vacía |
| 10 | Infraestructura y esquema | Cumple. `infra/` sin cambios. Una sola migración nueva, `20260924230513_tokens_cuenta`, que **solo crea**: `CREATE TYPE`, `CREATE TABLE`, dos índices y la FK con cascada. Revertir el código no rompe la base |
| 11 | Proveedores | Cumple. Solo `pg-boss` 12.34.0 y `resend` 6.29.0, las versiones autorizadas. Sin paquetes nuevos de AWS, Firebase, Supabase ni Vercel (V-04). `@react-email/render` no está instalado |
| 12 | Correo solo por `notifier`, nunca real fuera de `prod` | Cumple, con doble defensa: `opcionesDeCorreo` elige `resend` solo con `NODE_ENV=production` y llave, y `crearNotifier` lanza si recibe `resend` fuera de `production`. `crearCanalResend` rechaza una llave vacía antes de construir el cliente. Canal `registro` en `dev` y pruebas. V-16 lo confirmó con una llave falsa |
| 13 | Autenticación sin atajos | Cumple. La temporal se genera con muestreo por rechazo sin sesgo, se guarda solo su argon2id, se muestra una vez con `Cache-Control: no-store` y activa la bandera. El token se deriva por HKDF + HMAC y la base guarda solo su SHA-256. `recuperar` no mira `usuarios`. `redact` cubre las 9 rutas del plan. La sesión del login solo nace si el hash verificado sigue vigente bajo el bloqueo (T-09) |

## Definición de terminado (`AGENTS.md`)
- [x] **Cumple el `RF-xx` / `RN-xx` correspondiente** (alcance de 02a):
  - **RF-03:** enlace de un solo uso de 30 min, guardado solo como hash, misma respuesta exista o no el correo, 3 por hora, revoca sesiones al usarse.
  - **RF-04 y RF-04a:** restablecimiento por el admin con temporal y corrección de correo, con búsqueda.
  - **RF-04b:** invitación de maestros con enlace de 72 h.
  - **RF-04d:** cambio obligatorio.
  - **RN-03:** interacción con C-01.
  - **Todas las decisiones del humano están implementadas:** partición, M-01, N-01 a N-06, P-01 a P-05, C-01, FE-01, E-01 (versiones exactas), E-02, Q-E2-1 a Q-E2-5 y E2-01 a E2-03.
  - El frontend es de 02b, así que 02a no se despliega sola.
- [x] **Respeta las capas y pasa por el middleware.**
- [x] **`lint`, `build` y `test` en verde:** en mi corrida, y en las tres del Programador y las tres del Tester de la ronda 3.
- [x] **Pruebas de autorización incluidas:** `autorizacion-cuentas.integracion` (21) y las de `cuentas-r1`. Cubren rol incorrecto, restringido y cambio pendiente, y que no se filtre el estado de pago. "Clase ajena" no aplica.
- [x] **Migración de Prisma incluida y compatible hacia atrás.**
- [x] **`infra/` y `.env.example` actualizados:** `backend/.env.example` tiene el bloque de correo. `infra/` no cambia; el `depends_on` es de DEPLOY (N-03) y queda en §18.
- [ ] **Documentos actualizados:** falta el README (MF-02) y los textos que el orquestador aplica al cerrar AUTH-02a (abajo). Se cumple cuando se apliquen.

## Documentos a actualizar
**Textos del plan para cerrar AUTH-02a** (`plan.md`, "Propuestas…", "Al cerrar AUTH-02a"). Los contrasté con lo implementado y son correctos:
- `AGENTS.md`, "Comandos" (`dev:worker`).
- ESSENTIALS, "Autorización" (C-01) y "Autenticación" (C-06, DEC-03, DEC-05, DEC-14).
- `ARCHITECTURE.md`:
  - §6, §7 (C-05), §8 (C-02, M-01, N-02) y §9 (C-04);
  - §14: la fila `tokens_cuenta` (C-03, que coincide con la migración) y las dos reglas de acceso a datos;
  - §18: sus siete viñetas;
  - §20: la fila D-27 (el número está libre; la última es D-26).
- La fila `admin` de `CLAUDE.md` es de 02b y no se aplica ahora.

**Dos precisiones de redacción,** que no cambian ninguna decisión:
- **ESSENTIALS, "Reglas de datos" (M-01).** "El único SQL con texto no literal es el de pg-boss, ejecutado dentro de la transacción de Prisma por `ejecutorSqlDe`" puede leerse como que *todo* el SQL de pg-boss pasa por Prisma. No es así: pg-boss usa su propio pool para `recuperar`, para el sondeo del worker y para el resto. Propongo:
  "El único SQL con texto no literal que pasa por Prisma es el de pg-boss al encolar dentro de una transacción (`ejecutorSqlDe` en `adapters/db`, único `$queryRawUnsafe`): todos sus datos viajan como parámetros y el texto solo interpola el esquema, la tabla y el nombre de la cola (constantes del código)."
- **ESSENTIALS, "Reglas de datos" (Enmienda 2).** Cambiar "revocan sesiones" por "**revocan sesiones en bloque**". Así coincide con el texto de §14 y con PB-7: `logout` y `revocarSesion` quedan fuera del protocolo.

**Añadidos** (la decisión de aplicarlos es del humano; ver "Para el humano"):
- **§8.** Añadir: "Un trabajo que pasa a la cola de fallidos recibe otro id; el consumidor lee el original en `sourceId` (pg-boss 12, `includeMetadata: true`) y lo registra como `trabajoId`."
- **§18.** Añadir la viñeta: "Una sola instancia del worker: el tope de recuperaciones por cuenta y el consumo con `batchSize: 1` lo suponen, igual que los límites en memoria de la API (AUTH-02)." (MF-04)

**Además:**
- **`README.md` §3 y §7:** MF-02, antes del commit.
- **`resumen-programador.md:68`:** MF-01, antes del commit.
- **`aprobacion.md` y `docs/ESTADO.md`:**
  - los pendientes de MF-04;
  - el cierre de AUTH-02a con este veredicto;
  - la suite al cierre: backend 65 / 657 y frontend 11 / 69;
  - la tabla vigente de hashes: la de la ronda 3 del Tester, con 24 archivos, que vale para AUTH-02b.

## Para el humano
1. **Ratificar MF-03.** `backend/src/handlers/errores.ts` estaba en "No se toca" y cambió para corregir T-05: añade `erroresDeEnrutamiento` y `app.ts` le pasa `frameworkErrors`. Lo considero correcto y mínimo. La autorización que cita el Programador no está en el reporte del Tester, así que la decisión es tuya. Si no lo aceptas, T-05 vuelve a quedar abierto: una URL con un `:id` gigante o mal codificado respondería fuera del formato de la API, repitiendo el valor.
2. **MF-01.** Tu correo de la cuenta de `campus_dev` aparece en claro en `resumen-programador.md:68`. Recomiendo que el orquestador lo quite antes del commit. Si prefieres dejarlo, es tu decisión: es tu propio dato.
3. **MF-04.** Confirma que los tres pendientes van a ADMIN (dos) y a DEPLOY (uno), y que la viñeta de §18 sobre una sola instancia del worker se aplica con los demás textos.
4. **Revisión del diff (carril sensible).** Lo que más conviene mirar a mano:
   - `backend/src/adapters/db/sesiones.ts`: `crearSesion`, `rotarSesion` y `revocarTodasLasSesiones`, de AUTH-01;
   - el bloque de `POST /login` en `backend/src/handlers/auth/index.ts`: 1 fragmento, `const creada`, `hashVerificado` e `if (!creada) throw credencialesInvalidas()`;
   - `backend/src/adapters/db/bloqueo-usuario.ts`;
   - `backend/src/adapters/db/usuarios.ts`;
   - la migración `20260924230513_tokens_cuenta/migration.sql`;
   - `eslint.config.mjs`.
5. **AUTH-02a no se despliega sola:** una cuenta con cambio obligatorio no tiene pantalla hasta AUTH-02b. Sin commit ni push de ningún agente: el commit lo decides tú, después de MF-01 y MF-02.

# Revisión del Manager — AUTH-02b — final
Veredicto: ESCALAR AL HUMANO
Verificación propia (2026-09-26, rama `feat/auth-02b-cuentas-frontend`, una corrida completa desde la raíz): lint `código 0` · build `código 0` · test `código 1`: backend 65 archivos / 657 de 657; frontend 24 archivos / 241 de 244, con exactamente las 3 pruebas en rojo de T-12 y T-13.

**Por qué escalo.** Se agotaron las 3 rondas y la suite no está en verde. El código cumple lo pedido y lo acordado: no encontré ningún problema de seguridad, de alcance ni de reglas. Lo que queda abierto son dos defectos de foco de severidad baja (T-12 y T-13) y sus 3 pruebas en rojo. Con pruebas en rojo no se puede declarar terminado (`AGENTS.md`, "Pruebas" y "Definición de terminado"). Además, una `*.ataque` en rojo fusionada en `main` activaría PA-11 en el primer paso de cualquier encargo siguiente. Salir de aquí exige una decisión que solo tú puedes tomar: una ronda 4 fuera del máximo o aceptar el riesgo por escrito.

**Precondición del backend, comprobada antes de correr nada:**
- La regla del firewall "Campus: bloquear entrada a Docker en redes publicas" está `True` / `Inbound` / `Block` / `Public`.
- La red es `IZZI-F281` / `Public`, declarada de confianza por el humano.
- Docker `28.5.1`, sin contenedores de Testcontainers al empezar.

**Salidas reales:**
- **`npm run lint`:** código 0. ESLint, `prettier --check` ("All matched files use Prettier code style!") y `tsc -b`, en los tres workspaces.
- **`npm run build`:** código 0 (`✓ built in 1.48s`). Queda el aviso de Vite del chunk de más de 500 kB, que ya existía.
- **`npm test`:** código 1.
  - Backend: `Test Files 65 passed (65)`, `Tests 657 passed (657)`, `Duration 46.52s`.
  - Frontend: `Test Files 1 failed | 23 passed (24)`, `Tests 3 failed | 241 passed (244)`, `Duration 23.09s`. Las tres en rojo, todas de `features/admin/cuentas-r3.ataque.test.tsx`:
    - "con <StrictMode> (como en main.tsx), la ficha que aparece no le quita el foco al campo de búsqueda" (T-13);
    - "el admin confirma y no se mueve: al llegar la temporal, el foco llega a 'Copiar'" (T-12);
    - "el admin confirma y el servidor responde 500: el foco no queda en <body>" (T-12).
  - Son las mismas que reporta el Tester. Ninguna otra prueba falla.
  - En el log, 0 coincidencias de `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` y `could not serialize`.
- **Contenedores:** al terminar, `docker ps -a --filter "label=org.testcontainers=true"` salió vacío.
- **Hashes:** `sha256sum -c` de las 31 `*.ataque` de la tabla de la ronda 3 del Tester dio 31/31 `OK`. En disco hay exactamente 31 archivos `*.ataque.test.ts(x)`. El Programador no tocó ninguna.
- **Pruebas desactivadas:** busqué `.skip`, `.only`, `.todo`, `.fails`, `skipIf`, `runIf`, `xit(`, `xtest(` y `xdescribe` en los `*.test.ts(x)` de `frontend/src`, `backend/` y `shared/`. Sin coincidencias.
- **Alcance:**
  - `git status --untracked-files=all -- backend shared eslint.config.mjs` sale vacío.
  - `git diff --quiet` da código 0 sobre `backend`, `shared`, `eslint.config.mjs`, `infra`, `AGENTS.md`, `CLAUDE.md`, `.claude`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `frontend/vite.config.ts`, `frontend/package.json`, `package.json` y `package-lock.json`.
  - `README.md` tiene un solo fragmento, dentro de "Frontend en local" §3.
  - Fuera de `frontend/` solo cambian `README.md`, `docs/ESTADO.md` (orquestador) y los archivos de traspaso de esta carpeta.
  - Los 32 archivos nuevos y los modificados de `frontend/` están en `w/lf`.
  - `git status` tenía las mismas 51 entradas antes y después de mi corrida.
- **Revisión estática** (hecha por mí, no copiada de los reportes):
  - `fetch(` solo en `services/apiClient.ts`.
  - `localStorage` y `sessionStorage` solo en comentarios.
  - `features/admin` no importa de `features/auth`, ni al revés.
  - Sin `dialog` en `admin`, `auth` ni `app`.
  - Sin `?? []`, `any` ni `console.` en producción.
  - Sin colores, `px`, sombras ni `font-mono` sueltos.
  - Sin emojis ni palabras prohibidas.
  - Sin ternarios anidados.

**Alcance de mi revisión:** una corrida completa; el Programador y el Tester corrieron tres cada uno en la ronda 3, con el mismo resultado. No arranqué Vite, la API ni el worker, no abrí ningún navegador y no toqué código.

**Resumen.** AUTH-02b cubre la parte de interfaz de RF-03, RF-04, RF-04a, RF-04b y RF-04d, y sigue DEC-17, DEC-18 y DEC-19. Lo contrasté con el código:
- `apiClient` trata `403 CAMBIO_DE_CONTRASENA_REQUERIDO` de forma simétrica a `ACCESO_RESTRINGIDO`, sin bucle. Solo `/api/auth/cambiar-contrasena` refresca bajo `/api/auth/`.
- Las tres guardas envían a `/cambiar-contrasena`, y `RequireCambioDeContrasena` vive fuera de `RequireSesion`.
- El token del enlace:
  - se lee una vez del fragmento, con el patrón exacto de 43 caracteres base64url;
  - sale de la URL y del historial con `replace`;
  - vive solo en el estado de React;
  - la mutación se retira de la caché al asentarse (T-01).
- La temporal se muestra una vez, con `gcTime: 0`, y desaparece al buscar otra cuenta. La confirmación es en línea y el foco inicial va a "Cancelar" (T-09).
- La ficha de una cuenta admin no ofrece "Restablecer", y el backend lo niega igual.
- Textos del plan, uno por uno, en `data.ts`.

Lo único que falla es la gestión del foco en `AccionRestablecer`. Cada corrección de foco abrió un defecto nuevo: T-07 → T-09/T-10/T-11 → T-12/T-13. Las rondas no han convergido en ese punto, y esa es la razón de fondo para acotar mucho la salida.

## Problemas que bloquean

### MF-01 (02b) — La suite no está en verde: 3 pruebas del Tester en rojo (T-12 y T-13)
- **Dónde:** `frontend/src/features/admin/components/ficha-de-cuenta.tsx` (efecto de foco con `esPrimerRenderRef`; `disabled={restablecer.isPending}` en "Sí, restablecer"; `tieneFocoRef` por `onBlurCapture`) y `frontend/src/features/admin/cuentas-r3.ataque.test.tsx`.
- **Por qué importa:** la definición de terminado y el "Criterio de cierre" del plan exigen la suite completa en verde. Fusionar con 3 `*.ataque` en rojo dispararía PA-11 en cualquier encargo siguiente, y desactivarlas está prohibido sin tu autorización (`AGENTS.md`, "Pruebas").
- **Los defectos de fondo son de severidad baja** (valoración en "Hallazgos abiertos de la ronda 3", abajo): no fugan datos, no saltan autorización y no restablecen sin confirmar.
- **Qué se espera:** tu decisión entre las opciones de "Para el humano", punto 1.

## Hallazgos abiertos de la ronda 3, uno por uno

### T-12 — En Chromium, "Copiar" no recibe el foco tras confirmar, y tras un error el foco queda en `<body>`
- **¿Es válido?** Sí.
  - La sonda del Tester en Chrome 153 muestra lo que dice el HTML ("corrección del foco"): un botón con el foco que pasa a `disabled` lo pierde con `blur`/`focusout`.
  - `manejarDesenfoque` no distingue ese `blur` de un admin que se fue a otro campo, así que `tieneFocoRef` queda en `false` antes de la respuesta.
  - La emulación en jsdom (quitar `disabled` un instante, `blur()`, reponerlo) deja el DOM igual que React y reproduce el efecto real. Arbitro la prueba como correcta.
- **Impacto real:** bajo.
  - La temporal sigue anunciándose por `role="status"`, así que un lector de pantalla la lee.
  - Quien usa teclado tiene que volver a tabular desde el principio para llegar a "Copiar".
  - No hay riesgo de restablecer sin confirmar ni de que se vea la temporal de otra cuenta.
  - Es una regresión frente a la ronda 2 solo en ese camino. La ronda 3 es mejor en conjunto, porque cerró T-09 (media).
- **¿Bloquea el cierre?** Por sí mismo, no. Bloquea por su prueba en rojo (MF-01).
- **Recomendación:** ronda 4 extraordinaria y acotada (ver "Para el humano"). Resultado esperado, no implementación:
  - con el admin quieto en la confirmación, "Copiar" recibe el foco en Chromium al llegar la temporal;
  - tras un error, el foco queda en un control de la confirmación;
  - T-03 (una sola petición), T-09, T-10 y T-11 siguen en verde.
  Si no se autoriza la ronda, destino: ADMIN, que sustituye esta pantalla provisional.

### T-13 — Solo en desarrollo, `<StrictMode>` hace que la ficha le quite el foco al buscador
- **¿Es válido?** Sí.
  - `main.tsx` monta la aplicación en `<StrictMode>`. React 19 vuelve a ejecutar el efecto en el montaje simulado y `esPrimerRenderRef` ya no lo protege.
  - La prueba reproduce exactamente el entorno en que se usa la pantalla en `dev`.
- **Impacto real:** muy bajo.
  - No afecta a `prod`.
  - Si el admin encadena Enter, el foco va a "Cancelar" y no restablece.
- **¿Bloquea el cierre?** Por sí mismo, no. Bloquea por su prueba en rojo (MF-01).
- **Recomendación:** entra en la misma ronda 4, con este resultado esperado: el foco solo se mueve ante un cambio real de `confirmando` provocado por el admin, y el doble montaje de `<StrictMode>` no lo mueve. Sin ronda, destino ADMIN.

## Problemas que no bloquean

### MF-02 (02b) — La pantalla de admin construye tarjetas a mano y duplica la validación por campo
- **Dónde:**
  - `formulario-invitar-maestro.tsx`, `buscador-de-cuenta.tsx` y `ficha-de-cuenta.tsx` usan `rounded-lg border border-border bg-surface p-4` en lugar de `Card` de `components/ui/`. `tarjeta-de-cuenta.tsx` de `auth` sí usa `Card`.
  - `features/admin/lib.ts` (`erroresPorCampoAdmin`) y `types.ts` (`IncidenciaValidacion`) duplican `erroresPorCampo` de `features/auth` (desviación 2 declarada en la ronda 1).
- **Por qué importa:**
  - `CLAUDE.md`, "Componentes": "NO construyas a mano … tarjetas".
  - Regla 5: "El código usado por 2 o más módulos sube a … `lib/`".
- **Por qué no bloquea:**
  - Usa solo tokens, así que no hay valores sueltos.
  - Duplicar era lo único posible dentro de lo autorizado: el plan no permitía crear archivos en `frontend/src/lib/` ni tocar `auth/lib.ts` para eso.
  - La pantalla es provisional.
- **Qué se espera:** pendiente escrito para ADMIN: usar `Card` en la gestión de usuarios definitiva y subir la conversión de incidencias de zod a `frontend/src/lib/` (refactor propio, sin mezclar con funcionalidad). **No lo metería en la ronda 4**, para mantenerla mínima.

### MF-03 (02b) — Documentos desfasados o con un error pequeño
- **`README.md` §3 (Frontend en local), dentro del alcance de 02b.** El texto se lee "Desde `frontend`", pero propone `Invoke-Item backend\tmp\correos`, que desde ahí no existe (sería `..\backend\tmp\correos`). Además abre la carpeta, no "el HTML más reciente" que dice la frase. El §8 del backend ya tiene la forma correcta, así que basta con remitir a ella o usar esa misma línea.
- **`README.md` §7 y §8 (Backend en local), fuera del alcance de 02b:**
  - §7 dice "El frontend tiene 11 archivos con 69 pruebas (32 adversarias)". Hoy son 24 archivos y 244 pruebas, unas 170 de ellas adversarias en 10 archivos (32 de antes más 95, 25 y 18 de las tres rondas del Tester).
  - §8 dice que la pantalla que recibe el enlace "llega con AUTH-02b". Ya llegó.
- **`CLAUDE.md`, "Ubicaciones compartidas":** la línea de `services/navegacion.ts` dice que `apiClient` la usa "al perder la sesión o ante `403 ACCESO_RESTRINGIDO`". Falta `403 CAMBIO_DE_CONTRASENA_REQUERIDO` (DEC-17).
- **Qué se espera:** carril trivial, antes del commit. Lo aplica el orquestador con tu autorización (`CLAUDE.md` y README fuera de §3), o el Programador en una pasada acotada a `README.md` §3. Cifra exacta de adversarias: confirmar con `npx vitest list` si se quiere precisión.

### MF-04 (02b) — Incidencia de la ronda 3: el Tester lanzó navegadores sin autorización
- **Qué pasó:**
  - El Tester lanzó Chrome sin interfaz, con un perfil desechable en el scratchpad, para medir T-12.
  - Después intentó lo mismo con Edge, que se enganchó a la sesión abierta del humano ("Se está abriendo en una sesión de navegador existente") y pudo abrir una pestaña con la sonda local.
  - Lo declaró con transparencia y comprobó que no quedó ningún proceso suyo vivo.
- **Por qué importa:**
  - La lista "Ejecutar (lista cerrada)" del plan no incluye navegadores ni aplicaciones gráficas, y el de 02b solo autoriza lo común.
  - Es una desviación de proceso, de la misma familia que "no termines procesos que no arrancaste". Tocar la sesión personal del navegador del humano es justo lo que las reglas intentan evitar: su perfil tiene sesiones, cookies y extensiones.
  - No hubo daño aparente: la sonda era HTML suelto, sin código del proyecto ni datos.
  - El Programador sí se contuvo en el caso equivalente (`Invoke-Item`, V-23).
- **Por qué hace falta una regla:** `.claude/agents/tester.md` no dice nada de navegadores. La prohibición solo se deduce de la "lista cerrada" del plan, y el Tester no la leyó así.
- **Qué se espera:** tu decisión sobre el texto de la regla ("Para el humano", punto 4).

### MF-05 (02b) — Observaciones sin severidad del Tester que deben quedar escritas como pendientes
Ninguna merece ser hallazgo de 02b: no violan un requisito del plan ni una regla. Pero si no se escriben, se pierden.

| Observación | Valoración | Destino propuesto |
|---|---|---|
| La contraseña del login (y la del registro: `useRegistro` tiene el mismo patrón) queda 5 min en la caché de mutaciones | Mismo defecto que T-01, en código de AUTH-01. El riesgo es bajo (exige ejecutar código en la página o abrir las DevTools), pero contradice la intención de DEC-18 y de la regla 13. El camino de la temporal no se ve afectado, porque `irA` recarga | Pendiente escrito. Un cambio corto de frontend (carril normal: cambia comportamiento) que aplique a `useLogin` y `useRegistro` el mismo `sacarDeLaCacheAlAsentar`, **antes de DEPLOY** |
| La temporal se pierde si el admin busca otra cuenta con el restablecimiento en vuelo: la cuenta queda restablecida y sus sesiones revocadas sin que el admin lo sepa | Coherente con DEC-19, pero el admin no recibe ninguna señal. Es recuperable: se restablece otra vez | ADMIN: la gestión definitiva no debe ocultar un restablecimiento que sí ocurrió (bloquear la búsqueda mientras está en vuelo, o avisar) |
| Texto genérico ante un fallo de red en admin ("No pudimos completar la operación…") | `MENSAJES_ERROR_ADMIN` no tiene `SIN_CONEXION`; `auth` sí lo tiene. El plan no fija ese texto | ADMIN |
| El foco de los botones que se deshabilitan en vuelo cae a `<body>` en todos los formularios (mismo mecanismo que T-12) | Viene de la ronda 1 y ningún requisito lo cubre. Es transversal: `Button` de `components/ui/` | Pendiente del sistema de diseño: decidir un patrón único (por ejemplo, `aria-disabled` con guarda en lugar de `disabled` mientras la petición está en vuelo) cuando se fije la dirección visual, y verificarlo en un navegador real. Si la ronda 4 resuelve T-12 sin `disabled`, ese es el candidato |
| La alerta de error persiste al cancelar y al reabrir la confirmación | Detalle de estado. No confunde de cuenta, porque la ficha se remonta por `key` | ADMIN |
| `role="status"` envuelve también el botón "Copiar" | Posible anuncio redundante. No verificado con NVDA ni VoiceOver | ADMIN, con la verificación en un lector de pantalla |

**Qué se espera:** el orquestador los lleva a `aprobacion.md` y a `docs/ESTADO.md`, sección 3, con su destino.

## Detalles menores
- `features/auth/data.ts`: el comentario de `TEXTOS_NUEVA_CONTRASENA` cita "DEC-17, DEC-19". Debería citar DEC-18 y "Textos de interfaz".
- `RequireCambioDeContrasena` comprueba `isPending` antes que `isError`. `CLAUDE.md` pide el orden error → cargando. Con TanStack Query son estados excluyentes, así que el comportamiento no cambia.
- `features/auth/lib.ts`, `avisoDeLogin`: la aserción en línea `estado as { aviso: unknown }` va después de comprobar `"aviso" in estado`, así que es segura. Aun así, `esAvisoDeLogin` ya valida el valor.
- `USUARIO_NO_ENCONTRADO` → "No hay ninguna cuenta con ese correo." aparece también en un `404` de restablecer o corregir (por `id`, cuenta borrada entre medias). Hoy no se puede alcanzar, porque no hay bajas.
- Los mensajes de éxito "Invitación creada…" y "Correo actualizado…" van sin icono. No violan "el estado nunca solo con color", porque el texto es el estado, y el plan solo pedía icono en "Cuenta inactiva".
- `useCambiarContrasena` hace `.catch(() => undefined)` en el camino del `409`. Está justificado en el comentario: el usuario se queda con el mensaje propio de `CAMBIO_NO_REQUERIDO`.
- `formulario-cambiar-contrasena.tsx`: "Cerrar sesión" no se deshabilita con el cambio en vuelo. Es inocuo, porque `useCerrarSesion` navega y vacía la caché.

## Desacuerdos arbitrados
- **`formulario-cambiar-contrasena.tsx`, modificado sin declarar en la ronda 2.** Lo leí completo. Coincido con el Tester: el contenido corresponde al plan (DEC-09, DEC-17 y los textos de `/cambiar-contrasena`), valida con `cambiarContrasenaSchema`, la confirmación no viaja al servidor, tiene la misma defensa de doble envío que su gemelo y no relaja nada.
  - Como el archivo nunca estuvo en git, nadie puede reconstruir qué cambió. La hora coincide con la corrección de T-01/T-02 en `hooks.ts`.
  - **No bloquea y no requiere acción.** La falta es de declaración: como en MF-03 de 02a, todo archivo que se toca en una ronda va en su lista, aunque el cambio parezca de formato.
  - El Programador de la ronda 3 no podía subsanarlo (otra instancia, sin memoria), y lo dijo bien.
- **Desviaciones declaradas: las acepto todas.**
  - Ronda 1:
    - `TextosNuevaContrasena` en `types.ts`;
    - `erroresPorCampoAdmin` duplicado (con el pendiente de MF-02);
    - 2 pruebas de refuerzo;
    - `descripcion?: string | undefined` por `exactOptionalPropertyTypes`.
  - Ronda 2: la retirada explícita de la caché de mutaciones con `onSettled` va más allá del `gcTime: 0` del plan y es más determinista, sin relajar nada. El `autoFocus` en "Copiar" quedó sustituido en la ronda 3.
  - Ronda 3: el ref se lee en `onSuccess` y no en el render, como exige `react-hooks/refs`.
  - Ninguna toca `backend/`, `shared/`, `eslint.config.mjs` ni pruebas del Tester, y ninguna relaja una validación, un permiso o un tipo.
- **T-12 como "regresión":** lo es solo en el camino "confirmar sin moverse → Copiar". La ronda 2 lo resolvía con un `autoFocus` que a la vez causaba T-09 (media) y T-11. El balance de la ronda 3 es positivo.
- **Pruebas del Tester de la ronda 3:** las tres son legítimas. La emulación de Chromium se apoya en una medición real, y `<StrictMode>` es la configuración de `main.tsx`. El Programador no impugnó ninguna prueba en ninguna ronda.

## Reglas (encargo de frontend)
| Regla | Resultado |
|---|---|
| Token de acceso solo en memoria | Cumple. Sin `localStorage` ni `sessionStorage`. El token del enlace, solo en el estado de React (DEC-18) |
| Ningún `fetch` fuera de `apiClient` | Cumple (dos `fetch`, los dos en `services/apiClient.ts`: `enviar` y el refresco) |
| `features/admin` no importa de `features/auth` | Cumple. Tampoco al revés. Lo común va por `services/` y `components/` |
| Tipos en `types.ts`; sin tipos a mano que existan en `shared/` | Cumple. Los tipos de la API se reexportan de `@campus/shared`. `CorregirCorreoVariables` salió de `hooks.ts` (T-08). En los componentes solo hay interfaces de Props |
| Solo tokens y `components/ui/` | Cumple en tokens, con `Button` e `Input` de `ui/`. **Excepción:** tarjetas hechas a mano en admin (MF-02) |
| Una acción principal por vista | Cumple. `/admin`: solo "Enviar invitación" es `primary`. Cada pantalla de cuenta tiene un solo `primary` |
| Estado con icono y texto | Cumple. "Cuenta inactiva" con `CircleAlert` (T-06); el aviso del login con `CircleCheck` |
| Retornos tempranos, sin ternarios anidados, sin `?? []` | Cumple |
| Sin modales | Cumple. Confirmación en línea, sin `role="dialog"` |
| Textos es-MX, sin palabras prohibidas ni emojis | Cumple. Coinciden con "Textos de interfaz" del plan |
| Errores del frontend | Cumple. `throw` solo dentro de hooks de TanStack Query. "Copiar" con `try/catch/finally` y toast |
| Seguridad no solo en la interfaz | Cumple. Ocultar "Restablecer" para el admin es cosmético: el backend responde `403 OPERACION_NO_PERMITIDA` |
| Sin valores por defecto en `rol`, banderas o estado de pago | Cumple. La ficha no recibe ni muestra `estadoPago` |

## Definición de terminado (`AGENTS.md`)
- [x] **Cumple el `RF-xx` / `RN-xx` correspondiente** (parte de interfaz de RF-03, RF-04, RF-04a, RF-04b y RF-04d; DEC-17 a DEC-19). Con una salvedad: **nadie recorrió el flujo real en un navegador** (API + worker + Vite). 02b no lo autorizaba, así que queda para tu revisión (ver "Para el humano", punto 3).
- [x] **Respeta las capas y pasa por el middleware:** 02b es solo frontend, sin endpoints nuevos, y no mueve ninguna seguridad al cliente.
- [ ] **`lint`, `build` y `test` en verde:** lint y build sí; **test no** (3 en rojo, MF-01).
- [x] **Pruebas de autorización:** no hay endpoint nuevo en 02b. Las de los 8 endpoints son de 02a.
- [x] **Migración:** no aplica.
- [x] **`infra/` y `.env.example`:** no aplica. `frontend/.env.example` no cambia.
- [ ] **Documentos actualizados:** faltan la fila `admin` de `CLAUDE.md`, la línea de `navegacion.ts` y el README (MF-03).

## Documentos a actualizar
- **`CLAUDE.md`, tabla de módulos, fila `admin`** (texto del plan, "Al cerrar AUTH-02b"). Lo contrasté con lo implementado y **es correcto**: invitar maestro, buscar una cuenta por correo, restablecer su contraseña y corregir su correo, en el índice de `/admin`, de forma provisional.
- **`CLAUDE.md`, "Ubicaciones compartidas", `services/navegacion.ts`** (MF-03). Texto propuesto:
  "`services/navegacion.ts` — `irA` y `rutaActual`: único punto de redirección fuera del router (lo usa `apiClient` al perder la sesión o ante `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`)"
- **`CLAUDE.md`, fila `auth` (opcional, recomendado):** "bienvenida post-login (provisional hasta los dashboards)" → "bienvenida post-login de estudiante y maestro (provisional hasta los dashboards)". Desde 02b el admin ya no la ve.
- **`README.md`:** §3 del frontend (`Invoke-Item`), §7 del backend (conteos del frontend) y §8 del backend ("llega con AUTH-02b"), según MF-03.
- **`aprobacion.md` y `docs/ESTADO.md`:**
  - tu decisión sobre MF-01 y la regla de MF-04;
  - los pendientes de MF-02 y MF-05, con su destino;
  - la suite al cierre;
  - la tabla vigente de hashes: la de la ronda 3 del Tester, con 31 archivos, o la que se publique si hay ronda 4.
- **`AGENTS.md` y `.claude/agents/tester.md`:** la regla de MF-04, si la apruebas.
- **ESSENTIALS, `ARCHITECTURE.md` y `PRD.md`:** sin cambios. 02b no altera ninguna decisión.
- **Datos personales o secretos en los traspasos:** revisé las secciones de 02b de `resumen-programador.md`, `reporte-tester.md`, `aprobacion.md` y el diff de `docs/ESTADO.md`. No hay correos reales, identificadores de `campus_dev`, tokens, temporales ni rutas personales. Los correos de las pruebas son ficticios (`@ejemplo.mx`, `@pruebas.local`), y la regla de MF-01 de 02a se cumple.

## Para el humano
1. **Qué hacer con T-12, T-13 y sus 3 pruebas en rojo (MF-01).** Opciones:
   - **(A) Ronda 4 extraordinaria, única y acotada, como en AUTH-01. La recomiendo.**
     - **Programador:** solo `features/admin/components/ficha-de-cuenta.tsx` y `contrasena-temporal.tsx`, con los dos resultados esperados de T-12 y T-13 (arriba) y T-03, T-09, T-10 y T-11 en verde. Nada de MF-02 ni MF-05.
     - **Tester:** vuelve a correr todas sus pruebas y ataca solo esos dos archivos, **sin lanzar navegadores**.
     - **Manager:** repite lint, build, test y hashes, y aprueba si todo sale en verde.
     - **Si algo vuelve a fallar, se detiene y te consulta. No hay ronda 5:** se pasa automáticamente a (B).
     - Por qué la recomiendo: los dos arreglos son locales, las causas están identificadas con precisión, y así evitas el precedente de desactivar pruebas adversarias.
     - Su riesgo: el historial de este punto (cada corrección de foco abrió otra). Por eso la acoto a resultados comprobables y a dos archivos.
   - **(B) Aceptar T-12 y T-13 como riesgo residual, con destino ADMIN** (esa pantalla se sustituye con la gestión de usuarios). Exige que autorices por escrito que el Tester convierta **exactamente esas 3 pruebas** en `it.fails(...)`, con un comentario que cite T-12, T-13 y el pendiente de ADMIN, y que publique los hashes nuevos. Así la suite queda en verde y avisará cuando alguien las arregle. No recomiendo `.skip`.
   - **(C) Cerrar sin tocar nada y fusionar con la suite en rojo:** no lo recomiendo, porque bloquea PA-11 en todos los encargos siguientes.
2. **MF-03, antes del commit:** autoriza los textos de `CLAUDE.md` (fila `admin`, `navegacion.ts` y, si quieres, la fila `auth`) y la corrección del README (§3, §7 y §8), por el carril trivial.
3. **Revisión del diff (carril sensible) y comprobación en navegador real.** Nadie ha recorrido los flujos de verdad. Te recomiendo hacerlo tú, con API, worker y Vite en local, siguiendo "Frontend en local" §3:
   - recuperación;
   - invitación;
   - restablecimiento con la temporal y `/cambiar-contrasena`;
   - `/admin` a 360 px;
   - Tab y Enter en "Restablecer contraseña" → "Cancelar" → "Sí, restablecer", para ver T-12 con tus propios ojos.

   Lo que más conviene leer a mano:
   - `frontend/src/services/apiClient.ts` (el `403` nuevo y la excepción de refresco);
   - `frontend/src/app/require-cambio-de-contrasena.tsx`;
   - `frontend/src/features/auth/hooks.ts` (`useTokenDelEnlace`, `useCambiarContrasena` y la limpieza de la caché);
   - `frontend/src/features/admin/components/ficha-de-cuenta.tsx`.
4. **Regla nueva por la incidencia de los navegadores (MF-04).** Propongo añadir a `AGENTS.md`, "Reglas del equipo", y a `.claude/agents/tester.md`:
   "Ningún agente abre navegadores (con o sin interfaz) ni otras aplicaciones gráficas salvo que el plan lo autorice de forma expresa, y nunca con el perfil ni la sesión del humano. Si una comprobación exige un navegador, se reporta como no verificada y la decide el humano."
5. **MF-05:** confirma los destinos de las observaciones del Tester. En especial, si la contraseña del login y del registro en la caché de mutaciones va como requisito previo a DEPLOY (mi recomendación) o a otro encargo.
6. **Sin commit ni push de ningún agente:** el commit lo decides tú, después de resolver el punto 1 y aplicar MF-03.

---

# Revisión del Manager — AUTH-02b — cierre
Veredicto: APROBADO
Verificación propia (2026-09-26, rama `feat/auth-02b-cuentas-frontend`, una corrida de cada comando desde la raíz): lint `código 0` · build `código 0` · test `código 0`: backend 65 archivos / 657 de 657; frontend 25 archivos / 257 pruebas, 253 en verde y 4 fallos esperados (`it.fails` de T-14).

Esta verificación se limita a lo que cambió desde "AUTH-02b — final": la ronda 4 del Programador y del Tester, la opción B sobre T-14, `README.md`, `CLAUDE.md`, la regla de navegadores y `docs/ESTADO.md`. El resto de 02b ya lo revisé en "AUTH-02b — final" y sigue igual: ningún otro archivo de producción cambió después de la ronda 3.

## Verificación propia, con la salida real
- **Precondición del backend, comprobada antes de correr nada:**
  - Regla del firewall "Campus: bloquear entrada a Docker en redes publicas": `Enabled True` · `Direction Inbound` · `Action Block` · `Profile Public`.
  - Red `IZZI-F281`, `NetworkCategory Public`.
  - Docker `28.5.1`. `docker ps -a --filter "label=org.testcontainers=true"` vacío al empezar.
- **`npm run lint`:** código 0. ESLint, `prettier --check` ("All matched files use Prettier code style!", en los tres workspaces) y `tsc -b`.
- **`npm run build`:** código 0 (`✓ built in 700ms`). Sigue el aviso de Vite del chunk de más de 500 kB, que ya existía.
- **`npm test`:** código 0.
  - Backend: `Test Files 65 passed (65)`, `Tests 657 passed (657)`, `Duration 32.26s`.
  - Frontend: `Test Files 25 passed (25)`, `Tests 253 passed | 4 expected fail (257)`, `Duration 14.34s`.
  - En el log, 0 coincidencias de `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` y `could not serialize`.
- **Contenedores:** al terminar, `docker ps -a --filter "label=org.testcontainers=true"` salió vacío.
- **Hashes:** `sha256sum -c` sobre la tabla vigente de 32 archivos (`reporte-tester.md`, "Aplicación de la opción B a T-14") → 32/32 `OK`. En disco hay exactamente 32 `*.ataque.test.ts(x)`.
- **`git status --short`:** idéntico antes y después de mis corridas.
- No abrí navegadores ni arranqué Vite, la API o el worker. No toqué código.

## Lo que verifiqué, punto por punto

### 1. Ronda 4 del Programador
- **Alcance:** busqué con `find -newer` los archivos posteriores a `cuentas-r3.ataque.test.tsx`, la última escritura de la ronda 3.
  - En `frontend/src` solo cambiaron `features/admin/components/ficha-de-cuenta.tsx` (Programador) y `features/admin/cuentas-r4.ataque.test.tsx` (Tester).
  - `contrasena-temporal.tsx` conserva su fecha de la ronda 3.
  - En `backend/` solo aparece `src/adapters/db/generated/`. Lo regenera `prisma generate` dentro de lint y build, y git lo ignora: `git status` sobre `backend/` sale vacío.
  - Coincide con lo declarado.
- **T-12: la corrección es razonable.**
  - `manejarDesenfoque` ignora el `blur` sin destino (`relatedTarget` nulo). Es el que produce Chromium al corregir el foco cuando deshabilita "Sí, restablecer". Así `tieneFocoRef` sigue en `true` y el `onSuccess` enfoca "Copiar".
  - El `onError` devuelve el foco a "Cancelar" solo si el admin no se había ido, y lo hace después de la respuesta.
  - Es el arreglo mínimo para el resultado que pedí en "AUTH-02b — final". El precio es T-14 (ver abajo).
- **T-13: la corrección es correcta y robusta.**
  - El ref se inicializa con `confirmandoAnteriorRef = useRef(confirmando)`, y el efecto sale si el valor no cambió.
  - No depende de cuántas veces corra el efecto, que es justo lo que rompe `<StrictMode>`.
  - Cada ficha nueva (por `key`) empieza en `false`.
- **`CLAUDE.md`:** se cumple.
  - Retornos tempranos en el efecto y en `manejarDesenfoque`.
  - Sin `else`, ternarios anidados, `any` ni `?? []`.
  - Solo interfaces de Props en el archivo, y `type FocusEvent` importado de `react`.
  - Los refs se leen solo en el efecto y en los manejadores, nunca en el render.
  - Los comentarios explican el porqué.
- **T-07, T-09 y T-10 se siguen cumpliendo:**
  - Sus pruebas de las rondas 1, 2 y 3 pasan en mi corrida.
  - El Tester añadió en la ronda 4 casos con `<StrictMode>`, y también pasan: abrir y cancelar tres veces, Enter mantenido con 0 peticiones y el remontaje de la vista.
  - T-07 se cumple ahora también en la emulación de Chromium; antes era T-12.
- **T-11:** se cumple en jsdom, pero en Chromium vuelve a romperse. Es T-14, riesgo aceptado por el humano.

### 2. Opción B sobre T-14 (`frontend/src/features/admin/cuentas-r4.ataque.test.tsx`)
- **Exactamente 4 `it.fails`, las de T-14** (líneas 208, 232, 256 y 284).
  - Cada una lleva el comentario "Riesgo aceptado por el humano el 2026-09-26 (T-14): pasa al encargo del sistema de diseño".
  - Las otras 9 pruebas del archivo son `it` normales y pasan.
- **Las aserciones no se debilitaron. Lo comprobé de forma independiente:**
  - Tomé el archivo actual, borré las 4 líneas del comentario y cambié `it.fails(` por `it(`.
  - Lo pasé por Prettier por `stdin`, sin escribir en el repositorio.
  - El resultado tiene el SHA-256 `0de25798c050bdc7b71ae525d0bd98d287c33d8c87822097b625a38aafdc57db`, **idéntico** al que publicó el Tester para la versión sin `it.fails`.
  - Lo único que cambió son la marca y el comentario.
- **Ninguna otra prueba está desactivada.** Busqué `.fails`, `.skip`, `.only`, `.todo`, `skipIf`, `runIf`, `xit(`, `xtest(` y `xdescribe(` en los `*.test.ts(x)` de `frontend/src`, `backend/src`, `backend/test` y `shared/src`. Solo aparecen esas 4.
- **La advertencia del Tester es correcta:** una `it.fails` también pasa si falla una aserción de preparación. Hoy el riesgo es bajo, por tres razones:
  - las ayudas de preparación de esas 4 pruebas (`confirmarConClic`, `emularCorreccionDelFocoDeChromium` y `escribirEn`) se ejercitan en pruebas verdes de las rondas 3 y 4, así que si se rompieran lo delataría otra prueba en rojo;
  - la única ayuda exclusiva de las `it.fails` es `clicEnZonaNoEnfocable`, que es trivial (`blur()` y comprobar `<body>`);
  - el Tester vio fallar las 4 en la aserción final del foco, con sus mensajes, en tres corridas antes de marcarlas.

  Aun así, conviene dejar escrito el procedimiento para quien las retome (N-01, abajo).

### 3. Documentos
- **`README.md` (MF-03, carril trivial): correcto.**
  - **Frontend §3:**
    - Ya no propone `Invoke-Item backend\tmp\correos` desde `frontend`. Remite a "Backend en local", paso 8, que tiene la línea correcta para abrir el HTML más reciente.
    - Los tres flujos citan rutas y textos que existen en el código: `/restablecer`, `/establecer-contrasena` y `/cambiar-contrasena` en `router.tsx`; "¿Olvidaste tu contraseña?" en `auth/data.ts`; "Invitar a un maestro" en `admin/data.ts`.
    - Los enlaces `…/restablecer#token=` y `…/establecer-contrasena#token=` coinciden con `backend/src/core/auth/enlaces.ts`.
  - **Backend §7:** dice "25 archivos con 257 pruebas: 183 adversarias, en 11 archivos". Lo confirmé con `npx vitest list` en `frontend/`: 257 pruebas, 183 en `*.ataque`, repartidas en 11 archivos. Los números del backend (65 / 657, con 319 adversarias en 21 archivos) siguen valiendo.
  - **Backend §8:** dice "la pantalla que lo recibe es `/restablecer` o `/establecer-contrasena`, según el flujo". Es correcto.
  - **El resto del README quedó igual.** El diff contra `main` tiene solo cuatro fragmentos: §7 y §8 del backend y dos en §3 del frontend. Los de §3 son de la ronda 1, dentro del alcance de 02b.
- **`CLAUDE.md`, aplicado por el orquestador: correcto.**
  - La línea de `services/navegacion.ts` añade `403 CAMBIO_DE_CONTRASENA_REQUERIDO` (DEC-17), y coincide con lo que hace `apiClient.ts`.
  - La fila `admin` añade literalmente el texto del plan ("Al cerrar AUTH-02b", línea 1577), y coincide con lo implementado.
  - No hay otros cambios en `CLAUDE.md`. La precisión opcional de la fila `auth` no se aplicó: el humano no la autorizó y no hace falta.
- **Regla de navegadores: correcta.**
  - Aparece con el texto literal aprobado en `AGENTS.md`, como última viñeta de "Reglas del equipo".
  - También en `.claude/agents/arquitecto.md`, `manager.md`, `programador.md` y `tester.md`.
  - En cada uno de esos cinco archivos, el diff es exactamente esa línea. En `manager.md` va además una línea en blanco, porque la regla es un párrafo propio tras "Antes de empezar". Nada más cambió en ellos.
- **Destinos en `docs/ESTADO.md`: coinciden con la decisión del humano**, con una omisión menor (N-02):
  - CHORE-02 (no DEPLOY): la contraseña del login y del registro en la caché de mutaciones. Correcto.
  - ADMIN: correcto. Incluye:
    - la temporal perdida al buscar otra cuenta con la petición en vuelo;
    - el texto genérico ante un fallo de red;
    - la alerta que persiste al reabrir la confirmación;
    - las tarjetas hechas a mano y `erroresPorCampo` duplicado.
  - Sistema de diseño: correcto. Incluye el foco de los botones que se deshabilitan en vuelo, y T-14 como riesgo aceptado, con la nota de quitar las marcas al corregirlo.

### 4. Alcance global de AUTH-02b
- **Vacío** el `git status --short --untracked-files=all` sobre:
  - `backend`, `shared`, `eslint.config.mjs` e `infra`;
  - `package.json`, `package-lock.json`, `frontend/package.json` y `frontend/vite.config.ts`;
  - `docs/ARCHITECTURE*.md` y `docs/PRD.md`.
- Fuera de `frontend/` solo cambian estos archivos, todos autorizados:
  - `README.md`, `CLAUDE.md` y `AGENTS.md`;
  - los cuatro `.claude/agents/*.md`;
  - `docs/ESTADO.md`;
  - los cuatro archivos de traspaso de esta carpeta.
- Los archivos nuevos de `features/admin` están en `w/lf`.
- **Datos personales en los traspasos:** busqué correos, UUID de `campus_dev` y rutas personales en las líneas añadidas de `docs/`, `README.md`, `AGENTS.md`, `CLAUDE.md` y `.claude/`. Solo aparece `carla@ejemplo.mx`, que es ficticio.

## Definición de terminado (`AGENTS.md`), para AUTH-02b
- [x] **Cumple el `RF-xx` / `RN-xx`:** la parte de interfaz de RF-03, RF-04, RF-04a, RF-04b y RF-04d, y DEC-17 a DEC-19. El recorrido en navegador real lo hace el humano (su decisión 3).
- [x] **Respeta las capas y pasa por el middleware:** es solo frontend, sin endpoints nuevos, y ninguna seguridad se mueve al cliente.
- [x] **`lint`, `build` y `test` en verde:** sí.
  - Las 4 `it.fails` de T-14 las autorizó el humano por escrito (`aprobacion.md`, "Resultado de la ronda 4 y decisión del humano sobre T-14").
  - No ocultan nada: si alguien corrige T-14, pasarán a rojo.
- [x] **Pruebas de autorización:** no aplica; 02b no tiene endpoints nuevos.
- [x] **Migración:** no aplica.
- [x] **`infra/` y `.env.example`:** no aplica.
- [x] **Documentos actualizados:** `CLAUDE.md`, `README.md`, `AGENTS.md` y los agentes están al día. Quedan dos anotaciones menores (N-01 y N-02) y el cierre de `ESTADO.md`, que le toca al orquestador.

**Riesgos aceptados por el humano que se cierran con este encargo:**
- T-14, con destino al sistema de diseño.
- Los pendientes de MF-02 y MF-05, con sus destinos.

Ninguno toca datos ni autorización, y ninguno deja ver la temporal de otra cuenta.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### N-01 — Anotar cómo retirar las `it.fails` de T-14
- **Dónde:** `docs/ESTADO.md`, fila de T-14 en la sección 3.
- **Por qué importa:**
  - Una `it.fails` pasa aunque falle una aserción de preparación.
  - El encargo del sistema de diseño puede cambiar la confirmación, por ejemplo con `aria-disabled` en lugar de `disabled`. Entonces las ayudas de estas pruebas podrían dejar de aplicar, y las 4 seguirían en verde sin probar nada.
- **Qué se espera:** que el orquestador añada a la fila una frase como esta: "Al retomarlo: quitar las cuatro `it.fails`, comprobar que fallan en la aserción final del foco con el mensaje '…le llevó el foco a…', y solo entonces corregir".

### N-02 — Falta un destino de MF-05: el `role="status"` que envuelve también "Copiar"
- **Dónde:** `aprobacion.md` ("Cómo lo aplica el orquestador", destinos) y `docs/ESTADO.md`, sección 3.
- **Por qué importa:**
  - El humano aceptó "los de ADMIN … como propone el manager".
  - Mi propuesta incluía esta observación para ADMIN, con la verificación en un lector de pantalla.
  - No quedó anotada, así que se perdería.
- **Qué se espera:** añadirla a la fila de ADMIN de MF-05, en `ESTADO.md` y en `aprobacion.md`: "`role="status"` envuelve también el botón 'Copiar' (posible anuncio redundante); verificarlo con NVDA o VoiceOver".

## Detalles menores
- **`ficha-de-cuenta.tsx`:** ninguno de estos dos detalles merece otra ronda; quedan para cuando ADMIN rehaga la pantalla.
  - El comentario de `tieneFocoRef` (líneas 30-32) dice que se lee "solo en manejadores o en el propio onSuccess". Desde la ronda 4 también se lee en `onError`.
  - La comparación `destino === document.body` no se cumple nunca en la práctica, aunque es inofensiva.
- **`aprobacion.md`, "Pendientes para encargos posteriores":** dice "AUTH-02b: pasos 16 a 22 del plan", pero el plan (línea 1580) y `ESTADO.md` dicen 16 a 21. Viene del cierre de 02a. Al cerrar 02b esa viñeta deja de tener sentido y se puede retirar.
- **`ESTADO.md`:** todavía dice "En curso: verificación final de cierre del manager". El orquestador la actualiza con este veredicto.

## Desacuerdos arbitrados
- **T-14 frente a lo que afirma el Programador sobre T-11.**
  - El resumen de la ronda 4 dice que `onBlurCapture` "sigue apagando `tieneFocoRef` cuando el admin se mueve a un control real".
  - El Tester demuestra otra cosa: si el foco ya estaba en `<body>` (por el salto de Chromium o por un clic en una zona no enfocable), ningún `blur` sale del contenedor y el ref no se apaga.
  - **Tiene razón el Tester:** la afirmación del Programador solo vale en jsdom.
  - No lo trato como falta de honestidad. El Programador no podía verlo sin navegador, y lo declaró como no verificado. El humano ya decidió aceptarlo como riesgo.
- **La historia de este punto respalda la decisión del humano de no abrir una ronda 5.**
  - Cada corrección del foco en `AccionRestablecer` abrió otro caso: T-07 → T-09/T-10/T-11 → T-12/T-13 → T-14.
  - La causa de fondo es un botón que se deshabilita con el foco puesto. Eso pertenece al sistema de diseño, no a esta pantalla provisional.

## Documentos a actualizar
- **`docs/ESTADO.md`** (orquestador):
  - el cierre de AUTH-02b con este veredicto;
  - la suite final: backend 65 / 657; frontend 25 / 257, con 4 fallos esperados; 32 `*.ataque` con hashes en `reporte-tester.md`, "Aplicación de la opción B a T-14";
  - N-01 y N-02.
- **`aprobacion.md`** (orquestador): N-02, y retirar o marcar como hecha la viñeta "AUTH-02b" de "Pendientes para encargos posteriores".
- **ESSENTIALS, `ARCHITECTURE.md` y `PRD.md`:** sin cambios.

## Para el humano
1. **Revisión del diff antes del commit (carril sensible).** Lo que más conviene leer a mano es lo mismo que en "AUTH-02b — final":
   - `frontend/src/services/apiClient.ts`;
   - `frontend/src/app/require-cambio-de-contrasena.tsx`;
   - `frontend/src/features/auth/hooks.ts`;
   - `frontend/src/features/admin/components/ficha-de-cuenta.tsx`.

   Revisa también la línea nueva de `AGENTS.md`, las de los cuatro `.claude/agents/*.md` y las dos de `CLAUDE.md`.
2. **Recorrido en navegador real (tu decisión 3).** Nadie lo ha hecho todavía. Con la API, el worker y Vite en local, y siguiendo "Frontend en local" §3 del README:
   - recuperación, invitación y restablecimiento con la temporal y `/cambiar-contrasena`;
   - `/admin` a 360 px;
   - con teclado: "Restablecer contraseña" → "Cancelar" → "Sí, restablecer", y que el foco llegue a "Copiar" (T-12);
   - si quieres ver T-14:
     - confirma con el ratón;
     - antes de que responda la API, haz clic en "Nombre completo" de "Invitar a un maestro" y escribe.

     Si la respuesta es rápida, no lo verás. Es el riesgo que aceptaste.
3. **N-01 y N-02:** son dos anotaciones cortas en `ESTADO.md` y `aprobacion.md`. Las puede aplicar el orquestador antes del commit.
4. **Commit y PR:** los decides tú. Ningún agente hace commit ni push.

---

# Revisión del Manager — AUTH-02b — verificación de autoComplete
Veredicto: APROBADO
Verificación propia (2026-09-26, rama `feat/auth-02b-cuentas-frontend`, una corrida de cada comando desde la raíz): build `código 0` · test `código 0`: backend 65 archivos / 657 de 657; frontend 25 archivos / 258 pruebas, 254 en verde y 4 fallos esperados (`it.fails` de T-14) · lint `código 1`, **solo** por dos HTML de `backend/tmp/correos/` que git ignora (N-01). Sin esos dos archivos, el lint de los tres paquetes pasa.

Verificación acotada, por instrucción del humano (decisión A de "Nombre ajeno en la invitación de un maestro"): el cambio y la suite. Sin ronda del Tester.

## Verificación propia, con la salida real
- **Precondición del backend, comprobada antes de correr nada:**
  - Regla "Campus: bloquear entrada a Docker en redes publicas": `Enabled True` · `Direction Inbound` · `Action Block` · `Profile Public`.
  - Red `IZZI-F281`, `NetworkCategory Public`.
  - Docker `28.5.1`. `docker ps -a --filter "label=org.testcontainers=true"` vacío al empezar.
- **`npm run lint`:** código 1.
  - `shared`: ESLint y Prettier en verde.
  - `backend`: ESLint en verde. `prettier --check` marca 2 archivos: `tmp/correos/2026-09-26T18-28-47-792Z-….html` y `tmp/correos/2026-09-26T18-34-55-014Z-….html`. Por el `&&`, el `typecheck` del backend no llegó a correr.
  - `frontend`: ESLint, Prettier ("All matched files use Prettier code style!") y `tsc -b` en verde.
  - Para cerrar el hueco, corrí aparte en `backend/`: `prettier --check . --ignore-path ../.prettierignore --ignore-path ../.gitignore` → "All matched files use Prettier code style!", código 0; `npm run typecheck` → código 0.
- **`npm run build`:** código 0 (`✓ built in 669ms`). Sigue el aviso de Vite del chunk de más de 500 kB, que ya existía.
- **`npm test`:** código 0.
  - Backend: `Test Files 65 passed (65)`, `Tests 657 passed (657)`, `Duration 34.39s`.
  - Frontend: `Test Files 25 passed (25)`, `Tests 254 passed | 4 expected fail (258)`, `Duration 14.71s`. Frente al cierre (253 + 4 = 257), la única prueba nueva es la de este cambio.
  - En el log, 0 coincidencias de `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` y `could not serialize`.
- **Contenedores:** al terminar, `docker ps -a --filter "label=org.testcontainers=true"` salió vacío.
- **Hashes:** `sha256sum -c` sobre la tabla vigente de 32 archivos (`reporte-tester.md`, "Aplicación de la opción B a T-14") → 32/32 `OK`. En disco hay exactamente 32 `*.ataque.test.ts(x)`. Las únicas marcas de prueba desactivada en todo el repositorio siguen siendo las 4 `it.fails` de T-14.
- **`git status --short --untracked-files=all`:** idéntico antes y después de mis corridas.
- No abrí navegadores ni arranqué Vite, la API o el worker. No toqué código.

## Lo que verifiqué, punto por punto

### 1. `formulario-invitar-maestro.tsx`
- "Nombre completo" (línea 61) y "Correo" (línea 80) tienen `autoComplete="off"`.
- **No cambió nada más.** El archivo no está en git, así que no hay `git diff`. Lo comprobé en la transcripción del Programador: hizo exactamente dos `Edit`, `autoComplete="name"` → `"off"` y `autoComplete="email"` → `"off"`, y un `prettier --write` acotado a los dos archivos del encargo, desde `frontend/`.

### 2. `cuentas-view.test.tsx`
- La prueba nueva, "el formulario de invitación no autocompleta con los datos de quien lo llena", tiene dos aserciones: `toHaveAttribute("autocomplete", "off")` sobre "Nombre completo" y sobre "Correo".
- Compara el valor del atributo: con `name` o `email` fallaría. `getByLabelText("Correo")` es coincidencia exacta y, al montar, no hay otro campo con esa etiqueta.
- No usa `return` temprano.
- **Ninguna otra prueba cambió:** el único `Edit` del Programador en el archivo inserta el bloque nuevo antes de "con 409 muestra…", sin tocar el resto. El archivo pasa de 6 a 7 casos, como consta en `resumen-programador.md`.

### 3. Regla "Formularios" de `CLAUDE.md` en el resto del frontend
- **`features/admin`: se cumple en todo.** Los otros dos campos donde el admin escribe datos ajenos ya tenían `autoComplete="off"`: `buscador-de-cuenta.tsx:62` y `formulario-corregir-correo.tsx:62`. No hay más campos de texto en el módulo.
- **`features/auth`: correcto.** En todos sus formularios la persona escribe sus propios datos, así que `name`, `email`, `current-password` y `new-password` están bien usados. Son login, registro, recuperar, nueva contraseña y cambiar contraseña.
- No hay `<input>`, `<select>` ni `<textarea>` sueltos fuera de `components/ui/`.

### 4. Alcance desde mi revisión de cierre
Busqué con `find -newer revision.md` los archivos posteriores a mi cierre.
- **Código:** solo `frontend/src/features/admin/components/formulario-invitar-maestro.tsx` y `frontend/src/features/admin/cuentas-view.test.tsx`.
- **Documentos del orquestador:** `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/ESTADO.md` y `aprobacion.md`. No son parte de esta verificación.
- **Además:** `backend/src/adapters/db/generated/`, que `prisma generate` regenera dentro de lint y test y que git ignora. Y los dos HTML de `backend/tmp/correos/` de N-01, también ignorados por git.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### N-01 — `npm run lint` desde la raíz sale en rojo por correos locales del worker
- **Dónde:** `backend/tmp/correos/` (dos HTML de las 12:28 y las 12:34, escritos por `dev:worker` durante la investigación de este defecto) y `.prettierignore`, que no excluye `backend/tmp/`.
- **Por qué importa:**
  - Nada de esto entra en el commit, porque `.gitignore` ya excluye `backend/tmp/`. En un checkout limpio, el lint pasa.
  - Aun así, cualquier agente que corra el lint en este equipo lo verá en rojo mientras existan esos archivos, y el `typecheck` del backend no llega a correr.
  - El Programador no lo detectó porque solo corrió el lint de `frontend/`.
  - Le pasará a cualquiera que use el worker en local, así que se va a repetir.
- **Qué se espera (lo decide el humano):**
  - o borrar los dos HTML (borrar archivos requiere tu confirmación);
  - o, mejor, añadir `backend/tmp` a `.prettierignore` en un chore del carril trivial, fuera de este commit o dentro, como prefieras.

### N-02 — El efecto real en el navegador no está verificado
- `autoComplete="off"` es una indicación para el navegador. Algunos gestores de autorrelleno la ignoran y se guían por la etiqueta o el `name` del campo.
- jsdom solo prueba que el atributo está puesto. Que Chrome deje de rellenar "Nombre completo" con tus datos se confirma en tu recorrido en navegador real, el punto 2 de "Para el humano" del cierre.
- Si el navegador lo sigue rellenando, se reabre como defecto. No es motivo para detener el commit.

## Detalles menores
- La prueba nueva está declarada `async` sin ningún `await`. Es inofensivo.

## Desacuerdos arbitrados
Ninguno: no hubo ronda del Tester.

## Documentos a actualizar
- **`docs/ESTADO.md`** (orquestador): la suite al cierre pasa a frontend 25 / 258, con 254 en verde y 4 fallos esperados. Backend sigue en 65 / 657. Si se aplica N-01, anotarlo.
- **`README.md`, backend §7:** dice "25 archivos con 257 pruebas". Ahora son 258; las adversarias siguen en 183. Es un cambio de una cifra que puede hacer el orquestador.

## Para el humano
1. **N-01:** decide si borras los dos HTML de `backend/tmp/correos/` o si se añade `backend/tmp` a `.prettierignore`.
2. **N-02:** en tu recorrido en navegador, abre "Invitar a un maestro" y comprueba que Chrome ya no te ofrece tu nombre ni tu correo.
3. **Commit y PR:** los decides tú. Ningún agente hace commit ni push.
