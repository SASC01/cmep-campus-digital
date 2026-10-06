# Revisión del Manager — FIX-CLASES · lecturas con relaciones anidadas en una sola instantánea — plan
Veredicto: APROBADO
Verificación propia: no aplica: revisión de plan. `plan.md` revisado con SHA-256 `9ceb1ca3c348684f8a66baf9807ca24c34ed554c1d1d0baff10ae5b8487ad23e` (el de `aprobacion.md`), en la rama `fix/clases`, con `HEAD` = `ad070b9` y el árbol limpio salvo la carpeta del encargo.

Resumen: el plan cubre lo que pidió el humano (la lista del admin en una sola instantánea, los hermanos revisados y la reescritura de C-1 en la ronda 0), sin nada de más. Verifiqué contra el código y las dependencias instaladas lo que afirma del remedio, del inventario y de la prueba determinista, y es cierto. No hay problemas que bloqueen.

## Problemas que bloquean
Ninguno.

## Lo que verifiqué, punto por punto

### 1. El remedio (REPEATABLE READ dentro de `enTransaccion`)
- **Las relaciones anidadas van por la conexión de la transacción.** En `node_modules/@prisma/client/runtime/client.mjs`, el nodo `case"join"` resuelve los hijos con el mismo contexto `r` del padre (`this.interpretNode(s.child, r)`). Dentro de una transacción interactiva, ese contexto lleva `queryable` = la transacción, así que el padre, los hijos y los nietos van por la misma conexión. Fuera de una transacción, cada sentencia sale al pool por su cuenta: así se explica el defecto.
- **El aislamiento se aplica en esa misma conexión.** `@prisma/adapter-pg`, `startTransaction(isolationLevel)` (`dist/index.mjs:702-727`), toma una conexión del pool y ejecuta `BEGIN` y después `SET TRANSACTION ISOLATION LEVEL …` antes de cualquier consulta. El runtime traduce `"RepeatableRead"` a `"REPEATABLE READ"` (lo encontré en `client.mjs`). `Prisma.TransactionIsolationLevel.RepeatableRead` existe en el cliente generado (`prismaNamespace.ts:1573-1578`). En REPEATABLE READ la instantánea se toma en la primera sentencia y todas las siguientes la comparten. En READ COMMITTED, cada sentencia toma la suya, y el plan lo dice bien: no basta con meter las lecturas en una transacción.
- **`40001`:** en PostgreSQL, una transacción REPEATABLE READ que solo hace `SELECT` (sin `FOR UPDATE` ni escrituras) no puede fallar por serialización. La regla "dentro no se escribe" de §D-2 (comentario, `adapters/README.md`, V-04 y PA-21) lo protege.
- **Pool y `503`:** hoy `Promise.all` toma dos conexiones a la vez durante poco tiempo; con el remedio, una sola desde `BEGIN` hasta `COMMIT`, y el uso máximo por petición no sube. El camino nuevo de `503` (R-01) es el que ESSENTIALS exige para toda transacción: `P2028` se traduce a `503 SERVICIO_OCUPADO` en `traducirErrorDeTransaccion`, que no cambia. Encaja con "Toda transacción se abre con `enTransaccion`" y con la regla de `P2028`. Los `servicio-ocupado*` existentes siguen protegiendo el mecanismo, y el ataque 4 lo cubre para las cuatro lecturas.
- **Sin cambio para lo existente:** sin opciones, la llamada a Prisma queda idéntica a la de hoy. El protocolo de bloqueo por usuario sigue en READ COMMITTED, y PR-FX-01 lo comprueba con un control.

### 2. Hermanos
Mi propio `grep` de `include:`, `_count`, `select` anidados y relaciones (`maestros`, `clase`, `usuario`, `autor`, `inscripciones`, `maestro`) en `backend/src/adapters/db/*.ts`, sin `generated/`, da exactamente las lecturas de §D-3. No falta ninguna. Las razones de cada "no aplica" son verificables:
- **`listarPersonas`** (`inscripciones.ts:104-131`): con la clase borrada en medio, `clase === null` o `maestro === undefined` devuelven `null` y la ruta responde `403`. No hay `500`.
- **`buscarDatosDePertenencia`** (`clases.ts:25-39`): falla cerrado (`esMaestro: false`, `inscrito: false`).
- **`leerMaestros`:** corre dentro de una transacción con la fila de la clase bloqueada.
- **Las relaciones hacia `usuarios`:** las FK son `RESTRICT` y no hay bajas físicas (S-03).
- **`buscarCandidatos`:** su relación a muchos admite vacío.
- **`listarEnlacesRegistro`:** un `groupBy` aparte, con conteo que admite 0.
- **Sesiones y tokens:** relación a `usuarios`, y además son AUTH.
- **`editarClase`** (`clases.ts:175-189`): hace su `updateMany` sin transacción y relee con `leerClase(claseId, ejecutor)` usando el cliente, así que la relectura abre su propia instantánea con el remedio de `leerClase`. No queda un segundo camino: los únicos que llaman a las cuatro funciones son `handlers/clases/clases.ts` (líneas 59, 72 y 94), `handlers/clases/gestion.ts` (líneas 42 y 76) y la relectura de `editarClase`.

### 3. La prueba determinista (§D-4)
- **Cumple "Bloqueos en las pruebas" de `AGENTS.md`:**
  - `LOCK TABLE … NOWAIT` con un reintento acotado (presupuesto de 60 s, espera aleatoria de 20 a 50 ms), con el precedente de `cuentas-r1.ataque.test.ts:152-182`.
  - `timeout: 15_000` explícito, mayor que su espera más larga (4 s para formarse, más el borrado).
  - Una operación se da por formada solo cuando un proceso **de este archivo** (`application_name` propio) espera **esa tabla** (`relname`, `NOT granted`) detrás de **esta** retenedora (`pg_blocking_pids`). Es la misma idea que `formadasDetrasDe`, llevada a un bloqueo de tabla. Los procesos de otros archivos formados detrás no cuentan.
- **No forma cola:** con `NOWAIT`, la retenedora nunca espera en la cola de la tabla. La retención dura milisegundos y su tope de 4 s queda debajo del `timeout` de 5 s de las transacciones de otros archivos (R-03, PA-12).
- **No hay bloqueo mutuo dentro del archivo:** con el remedio, el lector conserva el `ACCESS SHARE` de las tablas que ya leyó hasta su `COMMIT`. El borrado de la retenedora pide `ROW EXCLUSIVE` en esas tablas, que es compatible, y la cascada solo toca las filas de la clase del caso.
- **`higiene-de-pruebas.integracion` no la rechaza:** PR-CH-01c pide `NOWAIT` en toda sentencia de bloqueo de tabla, y PR-CH-04h limita `$transaction` a `backend/src`, así que una prueba puede abrir transacciones, como hace `cuentas-r1`.
- **La marca `application_name`** (S-05) funciona:
  - `vitest.config.ts` no cambia `pool` ni `isolate`, así que cada archivo tiene su propio grafo de módulos y su propio `inicializarDb` (la primera URL gana).
  - `construirApp({ env })` llama a `inicializarDb({ connectionString: env.DATABASE_URL })` (`app.ts:43`).
  - `pg` acepta `application_name` como parámetro de la URL.
  - `setup.ts` ya validó la base desechable antes, y la URL marcada sigue apuntando a ella.
  - La precondición del punto 1 detecta si otra llamada inicializó antes el cliente.
- **Falla antes del remedio por la causa correcta:** el paso 3 corre las pruebas solas contra `<R>` y exige el rojo por el defecto, no por una precondición (PA-20). Las precondiciones "se formó en 4 s" y "no terminó antes de formarse" impiden un falso verde. PR-FX-02 va por HTTP para reproducir el `500` exacto. Las demás van por el adaptador, y el plan explica bien por qué (el sexto paso y los bloqueos de `usuarios` de otros archivos se formarían primero).

### 4. C-1 y conteos sobre toda la base
- **La acotación** a `{ autorId: admin.id, publicacion: { claseId: clase.id } }` conserva lo que protege. Todos los intentos del caso (el id de clase en minúsculas y en mayúsculas, con barra final, `PUT`, `PATCH` y `mis-comentarios`) van a publicaciones de `clase.id`, así que ningún comentario que pudiera crear el admin queda fuera de la cuenta. `expect(fallas).toEqual([])` y la cuenta del comentario de la alumna se quedan igual.
- **Mi búsqueda de hermanas** (`count` o `findMany` con `autorId`, `subidoPor`, `actorId`, `maestroId` o `usuarioId` del admin sin acotar, y `count()` sin `where`) da solo:
  - el caso de C-1;
  - `cuentas-r1:790` (`usuario.count() > 0`, que no puede fallar por otros archivos);
  - las dos cotas de `clase.count()` (`gestion-clases.integracion:353-367` y `gestion-02a-r1:793-799`).
- **De acuerdo con O-3:** las cotas por mínimo y máximo de los dos conteos solo fallarían si dentro de una sola petición otro archivo crea una clase y otro la borra. No se ha observado. Además, con el remedio, el `total` sale de la misma instantánea que la página. Reescribirlas sería una corrección que nadie pidió. Queda con destino "solo si aparece".

### 5. Carril
**Normal es correcto.** `adapters/db/cliente.ts` no es `adapters/auth`. El encargo no toca `middleware/`, sesiones ni contraseñas, migraciones (V-03: `backend/prisma` sin cambios), `infra/`, estado de pago ni restricción de acceso. El cambio en `enTransaccion` es aditivo: sin opciones, la llamada a Prisma queda idéntica, y PR-FX-01 lo comprueba (las transacciones de sesiones y contraseñas siguen en READ COMMITTED).

### 6. Pasos, lista cerrada, "No se toca" y PARADAS
- **Pasos:** son del tamaño adecuado para el programador (`sonnet`): primero las pruebas con su rojo registrado, después `cliente.ts`, después las cuatro funciones, con el cuerpo exacto de cada una y el orden de las sentencias.
- **Lista cerrada de pruebas:** solo el archivo nuevo para el programador; solo la línea 391 de `admin-muro-02b-r1` para el tester en la ronda 0.
- **"No se toca":** está completa (todo `src/` salvo los tres archivos, y nada de `shared/`, `frontend/` ni `infra/`).
- **PARADAS:** PA-19 (si Prisma no aplica `isolationLevel`), PA-20 (si el diagnóstico no se cumple), PA-21 (si hay que escribir dentro de la transacción) y PA-12 (rojo intermitente) cubren los riesgos propios del encargo.
- **Cierre:** un solo commit, con sus rutas listadas, y el PR propio que pidió el humano.

## Problemas que no bloquean
- **N-01:** el comentario de `buscarDatosDePertenencia` (`clases.ts:22-24`) dice "una sola consulta", y Prisma la resuelve con varias sentencias. Es inocuo (falla cerrado), pero confunde a quien vuelva a correr el inventario. Como el plan dice "nada más del archivo cambia", no se toca aquí. Va a ESTADO §3 junto con O-1, para el encargo que agregue la baja de clases.
- **N-02:** las pruebas nuevas retienen `clases` y `maestros_de_clase`, tablas que casi todos los archivos leen, en especial el sexto paso de cada ruta de clase. Con `NOWAIT` es seguro, pero en una corrida completa la retenedora puede necesitar muchos reintentos para tomar `ACCESS EXCLUSIVE` sobre una tabla tan concurrida. El presupuesto de 60 s y el límite de 75 s por caso son los de `cuentas-r1`, que retiene `usuarios`, una tabla aún más concurrida, y funciona. Si el programador ve más de unos segundos de reintentos en la corrida completa, lo reporta en su resumen (no es una PARADA).

## Detalles menores
- R-02 menciona `SET TRANSACTION READ ONLY` como alternativa no incluida. Está bien no incluirla: obligaría a SQL crudo, que V-04 prohíbe, y la regla "dentro no se escribe" más V-04 bastan.

## Desacuerdos arbitrados
Ninguno.

## Documentos a actualizar
Los que lista el plan bastan y están bien redactados:
- `adapters/README.md` (programador);
- ESSENTIALS, "Reglas de datos", y `ARCHITECTURE.md` §14 (orquestador, con A-1);
- ESTADO: cerrar los dos pendientes, agregar O-1, O-2 y O-3, y la nota para TAREAS-01b sobre las lecturas de temas y categorías.

Agrego N-01 a ESTADO §3. El ajuste de ESSENTIALS sobre `claveDeNombre` va en TAREAS-01b, como decidió el orquestador, para no provocar un conflicto al fusionar.

## Para el humano
- **A-1 (recomiendo autorizarla):** que el orquestador aplique al cerrar la regla nueva de ESSENTIALS, "Reglas de datos" ("una lectura de varias sentencias cuya respuesta exige una relación obligatoria o una cardinalidad mínima se hace en una sola instantánea: `enTransaccion` con `instantaneaUnica`…"), y la viñeta de `ARCHITECTURE.md` §14. Es una regla nueva de ESSENTIALS: sin A-1, el código se entrega igual y los textos quedan pendientes.
- **`relationJoins` (recomiendo no activarlo, igual que el arquitecto, S-01):** en Prisma 7.10 sigue siendo vista previa y cambiaría el SQL de todas las consultas con relaciones del backend. Para un `fix`, la instantánea única corrige la familia afectada sin tocar nada más. Si algún día se quiere, que sea un `chore` aparte con su corrida completa (R-04).
- **Sin comprobación humana** (S-06): no cambia ni la interfaz ni las respuestas.

## Verificación del resumen — FIX-CLASES — implementación
Veredicto: **resumen ACEPTADO**. El tester puede atacar.
Corrida propia del 2026-10-06, una suite a la vez, en `fix/clases` con base `ad070b9`. `resumen-programador.md`: SHA-256 `546da537…e833`.
PA-01: la red activa es ahora `IZZI-F281-5G` (Pública). El humano la declaró red de su casa y de confianza (ESTADO §5, desde CLASES-b), no solo para la sesión. La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public).

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd backend; npm run lint` | código 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0; misma última línea |
| `cd backend; npm test` | `Test Files 148 passed (148)` · `Tests 1755 passed (1755)` (78.72 s) | `Test Files 148 passed (148)` · `Tests 1755 passed (1755)` (79.35 s) |
| `cd backend; npx vitest list` | 1755 casos, 148 archivos, 9 de `lecturas-consistentes` | 1755 y 148; los 9 títulos de PR-FX existen literalmente |
| `npm run build` (raíz) | código 0; `✓ built in 760ms` | código 0; `✓ built in 690ms` |
| `npm run lint` (raíz) | código 0; `> tsc -b` | código 0; `> tsc -b` |

- **PA-07**, sin excepción para el `ZodError too_small` de `GET /api/admin/clases`:
  - `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `Unable to start a transaction` y `timed out`: 0 cada uno.
  - `too_small` 0 y `TypeError` 0.
  - `"Error no controlado"`: 10, exactamente I-1.
  - `"code":"P2028"`: 5, los permitidos (`tx.sesion.create`, `tx.tokenCuenta.updateMany`, `tx.sesion.findFirst`, `tx.sesion.updateMany` y `$queryRawUnsafe`), con control positivo.
  - `nombres-tokens-r2` y `admin-muro-02b-r1` en verde. **Limpia.**
- **V-01:** las 141 `*.ataque` coinciden con la tabla de la ronda 0 (`diff` vacío). Respecto de `ad070b9` solo cambió `admin-muro-02b-r1.ataque.test.ts` (el tester, C-1).
- **"No se toca":** respecto de `ad070b9` cambiaron solo `adapters/README.md`, `adapters/db/clases.ts`, `adapters/db/cliente.ts`, `admin-muro-02b-r1.ataque.test.ts` (el tester) y el archivo nuevo `lecturas-consistentes.integracion.test.ts`. `backend/prisma`, `shared/`, `frontend/`, `infra/` y los `package.json` siguen iguales.

**Punto 2, reproducido (no solo leído):** guardé copia y SHA-256 de `cliente.ts` y `clases.ts`, puse sus versiones de `ad070b9` y corrí solo `npx vitest run test/lecturas-consistentes.integracion.test.ts`. Resultado: `Tests 6 failed | 3 passed (9)`, y las seis fallan por el defecto:
- PR-FX-01: `expected 'read committed' to be 'repeatable read'`.
- PR-FX-02: `500`, con el log del `ZodError too_small` en `clases[0].maestros` (`gestion.ts:44`).
- PR-FX-03a: `TypeError … (reading 'id')`.
- PR-FX-04: `TypeError … (reading 'nombre')`.
- PR-FX-03b y PR-FX-05: `expected [] to deeply equal [...]`.

Ninguna cayó por una precondición (0 mensajes "Precondición" en la salida). Restauré las copias y comprobé que el árbol quedó exactamente como estaba: `sha256sum -c` OK en los dos archivos, y `git status --porcelain` y `git diff --stat` idénticos a los de antes.

**Punto 3, contrastado con el código:**
- **`enTransaccion`** (`git diff` de `cliente.ts`): arma el objeto de opciones solo con las claves presentes. Si queda vacío, llama `ejecutor.$transaction(fn)` sin segundo argumento, idéntico a antes; con solo `maxWait`, `{ maxWait }`, igual que antes. `isolationLevel: "RepeatableRead"` se agrega solo con `instantaneaUnica: true`. Anidada, corre `fn` como antes. El `.catch(traducirErrorDeTransaccion)` no cambió.
- **Las cuatro lecturas** (`git diff -w` de `clases.ts`): el único cambio es envolverlas en `enTransaccion(…, { instantaneaUnica: true })`, con `tx` y las sentencias en serie (`Promise.all` desaparece). Los `select`, el orden, `paginar` y el mapeo no cambian. Las escrituras del archivo (`create` en la línea 157, `updateMany` en las 183 y 227, `createMany` en la 444) quedan fuera de las cuatro transacciones (líneas 197-206, 255-296, 311-358 y 384-422).
- **`editarClase`:** no cambió y relee con `leerClase(claseId, ejecutor)`, así que hereda el remedio.
- **V-04:** `instantaneaUnica` e `isolationLevel` solo aparecen donde dice el plan.
- **La prueba cumple "Bloqueos en las pruebas":**
  - `LOCK TABLE clases` o `maestros_de_clase IN ACCESS EXCLUSIVE MODE NOWAIT`, con la tabla escrita literal en dos ramas.
  - Reintento ante `55P03`, con espera de 20 a 50 ms y un presupuesto de 60 s.
  - `timeout: 15_000` y `maxWait: 5_000` explícitos.
  - Da por formada la lectura solo cuando un proceso con el `application_name` del archivo espera esa tabla (`relname`, esquema `public`, `NOT granted`) detrás del pid de la retenedora (`pg_blocking_pids`).
  - La promesa de la lectura nunca se devuelve desde la transacción.
  - La marca se comprueba en `beforeAll` como precondición.
  - `higiene-de-pruebas.integracion` (PR-CH-01c y PR-CH-04h) pasa en mi corrida completa.

### Arbitraje del punto 5
- **(a) `nombres-tokens-r2.ataque` › "frontera de vigencia: iat hace 899 s → 200; iat hace 900 s → 401": confirmo la decisión provisional del orquestador, con una precisión del remedio.**
  - La causa es la que leyó: `firmarTokenAcceso` trunca al segundo (`tokens.ts:21`, `exp = floor(ahora/1000) + 900`) y jose rechaza `exp <= now`. Con `iat = now − 899 s`, la truncación se come hasta 999 ms, así que el margen real del caso "899 → 200" queda entre 0 y 1 s; si la verificación cruza el segundo, sale 401.
  - El lado "900 → 401" es estable: `exp` queda siempre en el segundo actual o antes.
  - No es un defecto del dominio: la API cumple los 15 minutos con la granularidad de segundos de los JWT, y el archivo es de AUTH-01, intacto. Tampoco es de FIX-CLASES.
  - **Destino:** ESTADO §3, para una reescritura por el tester con autorización, en el próximo encargo que toque AUTH o en un `chore` de aislamiento de pruebas.
  - **El remedio recomendado es `iat` hace 898 s** (margen de al menos 1 s), conservando el caso de 900 s. Alinear la firma al inicio del segundo **no basta**: el margen sigue siendo menor que un segundo.
  - Mientras tanto, si reaparece exactamente ese caso se reporta con su hora y no bloquea; cualquier otro rojo sí.
- **(b) Las dos repeticiones de corrida: aceptables, y ninguna cuenta como repetición "para limpiar".**
  - **Ronda 0:** 14 suites cayeron en `beforeAll` por tiempos límite de arranque, con una transformación e importación de 3 a 10 veces lo normal, así que la corrida no llegó a ejecutar la mitad de las suites. Los 5 "Error no controlado" fuera de I-1 ("Connection terminated unexpectedly") son de esa misma carga. Es una corrida inválida por el entorno, no un rojo intermitente del código.
  - **Programador:** `global-setup` falló al levantar Testcontainers (500 de Docker) y no ejecutó ninguna prueba.
  - PA-12 prohíbe repetir para borrar un rojo de una corrida que sí se ejecutó, no reponer una que no llegó a correr. Las dos repeticiones están declaradas con su motivo, quedan las dos corridas en el reporte, y el orquestador comprobó el equipo antes de autorizar la de la ronda 0. Mi corrida, la tercera independiente, sale limpia.
  - Que no cuenten contra el programador ni contra el tester. Si una caída por carga o por Docker vuelve a pasar en este encargo, que se anote en ESTADO §5 (entorno), junto a M-02 de DESIGN-01b (tiempos de las suites), para decidir con datos si hace falta un `chore`.

Sin M-nn.

## Revisión de la Enmienda 1 — FIX-CLASES
Veredicto: **APROBADO, condicionado a A-2 del humano** (texto exacto abajo). Sin A-2 no se programa nada de la enmienda y el encargo no puede cerrar con la ronda 1 en ROTO.
Verificación propia: no aplica: revisión de plan. `plan.md` con la Enmienda 1: 455 líneas, SHA-256 `a60fbf76e09cdf2b25f003a959f0fe5680a91d2f6867d18d07e819785dfd2be8`. Contrasté cada cambio con su sección y con el código del árbol de trabajo (`publicaciones.ts` sigue igual que en `ad070b9`).

**Responsabilidad del manager:** en la revisión del plan di por buena la fila 10 de §D-3 ("no aplica, sin `500`"). Revisé solo lo que el inventario evaluaba (el borrado de la clase) y no el estado vecino propio de toda lectura con cursor: que la fila del cursor desaparezca entre su comprobación y la página. El tester tenía razón al atacarlo. Para los próximos inventarios de hermanos, una lectura paginada con el `cursor` de Prisma cuenta siempre con la frontera cursor→página como estado vecino.

### 1. El remedio es correcto y suficiente
- **El cursor borrado después de comprobarlo ya no vacía la página.** En `listarComentarios`, la primera sentencia es la comprobación de la publicación; en `listarPublicaciones`, la del cursor (o la página, sin cursor). Con REPEATABLE READ, la instantánea se fija en esa primera sentencia (`BEGIN` y `SET TRANSACTION` no toman instantánea), y la página que Prisma ancla en la fila del cursor la sigue viendo aunque otra conexión la haya borrado y confirmado. El resultado son las filas que siguen. Un cursor que no existía antes de la primera sentencia da `null` en `findFirst` y sigue respondiendo `400 VALIDACION` (`errorCursorInvalido()`). La regla T-18/T-29 se cumple tal como se escribió ("`400` o las que siguen; nunca una página vacía con filas detrás").
- **De paso, cubre los estados vecinos del mismo mecanismo:** página→conteo de comentarios, página→adjuntos y publicación→comentarios, y cada uno tiene su caso (PR-FX-06b y PR-FX-07b).
- **No hay escrituras dentro ni cambia el contrato:** las dos funciones solo leen (`findFirst`, `findMany` y `groupBy`). PA-21 y V-04 lo vigilan. Firma, errores, `select`, orden y mapeo no cambian, y las dos rutas del muro siguen igual (handlers en "No se toca").
- **Costo en el pool, aceptable:** hoy, las 2 a 4 sentencias de cada lectura toman y sueltan una conexión cada una, en serie. Con el remedio, una conexión queda ocupada de `BEGIN` a `COMMIT`, más 3 viajes (`BEGIN`, `SET` y `COMMIT`). El uso máximo por petición sigue siendo 1, y cada lectura va por índice con `take ≤ 101`: unos milisegundos. Con 10 conexiones por proceso, el riesgo es la saturación, y ahí la lectura responde `503` a los 2 s en lugar de esperar sin límite.
- **R-01 ampliado lo cubre bien,** con una precisión que el tester midió: por HTTP, un pool lleno detiene antes la petición en `withProfile`, que espera sin límite. El `503` de la lectura solo aparece si el pool se vuelve a llenar entre el middleware y la lectura. El ataque 8 pide comprobar el `503` en el adaptador, que es lo correcto.

### 2. El ejecutor externo
- **`grep` propio en `backend/src`:** `listarPublicaciones(` y `listarComentarios(` solo aparecen en `handlers/clases/muro.ts:126` y `:203`, sin segundo argumento. Abren su propia instantánea, así que hoy no queda ningún camino sin protección.
- **En las pruebas:** `muro-c-r1.ataque` las ejerce por HTTP; `lecturas-fx-r1.ataque` y las PR-FX nuevas les pasan el doble.
- **La regla "anidada, manda la de afuera"** (ya probada en PR-FX-01) solo dejaría un hueco si alguien les pasara una transacción en READ COMMITTED. V-04 lo vigila ("solo desde `muro.ts`, sin segundo argumento") y el comentario de cada función y el `adapters/README.md` lo dicen.

### 3. Las pruebas nuevas y el doble del ejecutor
- **El doble ejerce el código de producción.** `enTransaccion` decide con `"$transaction" in ejecutor` (`cliente.ts`). Sobre un `Proxy` sin trampa `has`, el operador `in` llega al cliente real y da `true`. La trampa `get` de `$transaction` llama a la transacción real con las mismas `opciones`, así que se abre REPEATABLE READ de verdad. Lo comprobé en el doble del tester (`lecturas-fx-r1.ataque.test.ts:259-296`), que el programador debe reescribir igual.
- **El gancho no espera bloqueos:** borra por otra conexión (`obtenerDb()` sin envolver) con la función real del adaptador (`borrarPublicacion` o `borrarComentario`, con el autor como actor). Como la lectura en instantánea no toma bloqueos de fila, el borrado no espera y nadie retiene nada (fuera del alcance de "Bloqueos en las pruebas").
- **Fallan antes del remedio por el defecto (PA-20):** sin la transacción, la sentencia siguiente al gancho lee datos frescos. PR-FX-06 y 07 dan `[]` (igual que T-01 y T-02 del tester, que ya fallan hoy así). PR-FX-06b da `comentarios: 0` y `adjuntos: []`, porque `borrarPublicacion` descarta el archivo y borra los comentarios en cascada. PR-FX-07b da `[]` por la cascada. Cada caso tiene su control sin gancho, y E-3 exige registrar los rojos antes del remedio.

### 4. "No se toca", V-05 y A-2
- **`publicaciones.ts` sale de la lista solo en las dos funciones,** con A-2. "Cambios por capa" enumera lo que no cambia (tipos, constantes, las cinco escrituras y los comentarios de cabecera), y PA-22 detiene cualquier cambio fuera de ellas.
- **V-05 saca el archivo de la comprobación mecánica y obliga al manager a revisar su `git diff <R>` bloque por bloque,** con el diff completo en el resumen (E-8). Es suficiente.
- **El texto de A-2 es exacto y suficiente.** La primera frase acota el archivo y las dos funciones. La segunda autoriza la redacción ampliada de los dos textos de A-1, que es una regla nueva de ESSENTIALS y por eso necesita autorización propia. El resto (el comentario de `cliente.ts`, `adapters/README.md` y los casos nuevos del archivo de pruebas del programador) ya estaba permitido por el plan y la lista cerrada.

### 5. El inventario corregido
- **`grep "cursor: {"` y `cursor === undefined` en `adapters/db`** da exactamente las filas de la nota nueva de §D-3: tres en `clases.ts` (protegidas), dos en `publicaciones.ts` (aplican), dos en `enlaces-registro.ts` (O-4) y el conjunto de claves de `inscripciones.ts` (inmune, porque la clave sale de `usuarios`, que no se borra). No queda otra frontera de dos sentencias sin cubrir en las lecturas con cursor.
- **Las fronteras sin cursor** ya estaban en §D-3: las mezclas inocuas de `listarPersonas` y del sexto paso fallan cerrado.
- **O-4 tiene razón suficiente:** hoy ninguna ruta, limpieza ni prueba borra enlaces (se revocan), y no hay bajas físicas de usuarios. Su defecto latente (un cursor inexistente da página vacía en lugar de `400`) es anterior a la regla T-18 y está en un archivo de cuentas protegido. El destino es el encargo que agregue esos borrados o reabra los enlaces en ADMIN.

### 6. Pasos y commit
- **E-1 a E-8 son ejecutables por `sonnet` sin adivinar:** el doble descrito con su comportamiento exacto, cuatro títulos exactos, el rojo registrado antes (E-3), el remedio acotado (E-4), el archivo nuevo aislado tres veces y `lecturas-fx-r1` en verde sin tocarlo (E-5), y el resumen con hermanos, estados vecinos y el diff de `publicaciones.ts` (E-8).
- **El commit único sigue valiendo:** las rutas previstas ya incluyen `publicaciones.ts` y las `*.ataque` nuevas del tester.

### Detalles menores (no bloquean; los corrige el orquestador al aplicar los textos, o el arquitecto si vuelve a tocar el plan)
- **O-2** todavía lista `listarPublicaciones` y `listarComentarios` entre las "mezclas de instantáneas inocuas que quedan". Con la enmienda ya no quedan: al pasar O-2 a ESTADO §3, el orquestador las quita.
- **R-02** dice "la opción solo aparece en las cuatro lecturas"; con la enmienda son seis (V-04 ya dice 6).
- **El paréntesis de V-01** sigue citando la tabla de la ronda 0; E-1 dice bien que la base es la tabla de la ronda 1 (142). Manda E-1.
- **El mensaje del commit** habla solo de las lecturas de clases. Sugerencia para el orquestador: "fix(clases): lecturas de clases y del muro en una sola instantánea y aislamiento de una prueba de ataque".

### Para el humano
**Autorizar A-2, con este texto tal cual** (el del plan, sin corrección):
"Autorizo A-2 de FIX-CLASES: el programador modifica `backend/src/adapters/db/publicaciones.ts` solo en las funciones `listarPublicaciones` y `listarComentarios`, para que sus sentencias corran dentro de `enTransaccion(…, { instantaneaUnica: true })` como dice la Enmienda 1 (T-01 y T-02); el resto de ese archivo sigue en «No se toca». Autorizo también que los textos de A-1 para `ARCHITECTURE-ESSENTIALS.md` y `ARCHITECTURE.md` se apliquen con la redacción de la Enmienda 1 (agregan las lecturas que comprueban el cursor antes de leer la página)."

## Verificación del resumen — FIX-CLASES — corrección de la ronda 1
Veredicto: **resumen ACEPTADO**. El tester puede atacar la ronda 2.
Corrida propia del 2026-10-06, una suite a la vez, en `fix/clases` (base `ad070b9`). PA-01: red `IZZI-F281-5G`, de confianza permanente (ESTADO §5), con la regla del firewall habilitada (Inbound, Block, Public).

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd backend; npm run lint` | código 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0; misma última línea |
| `cd backend; npm test` | `Test Files 149 passed (149)` · `Tests 1783 passed (1783)` (86.70 s) | `Test Files 149 passed (149)` · `Tests 1783 passed (1783)` (87.81 s) |
| `cd backend; npx vitest list` | 1783 casos, 149 archivos; 13 de `lecturas-consistentes` y 24 de `lecturas-fx-r1` | 1783, 149, 13 y 24; los diez IDs de PR-FX están, y los cuatro títulos nuevos existen literalmente |
| `npm run build` (raíz) | código 0; `✓ built in 731ms` | código 0; `✓ built in 810ms` |
| `npm run lint` (raíz) | código 0; `> tsc -b` | código 0 |

- **PA-07**, sin excepción para `GET /api/admin/clases`:
  - `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `Unable to start a transaction` y `timed out`: 0 cada uno.
  - `too_small` 0 y `TypeError` 0.
  - `"Error no controlado"`: 10, exactamente I-1.
  - `"code":"P2028"`: 5, los permitidos, con control positivo.
  - La excepción arbitrada de `nombres-tokens-r2` no hizo falta: pasó. **Limpia.**
- **V-01:** las 142 `*.ataque` coinciden con la tabla de "C-2 (Enmienda 1)" del tester (`diff` vacío).
- **C-2:** conserva lo que protegía y solo cambia la expectativa de los usos, ahora ordenada. Sigue comprobando que nadie fuera de `adapters/db` nombra `enTransaccion`, `instantaneaUnica`, `isolationLevel` ni `RepeatableRead`; que `index.ts` no reexporta `enTransaccion`; y que los niveles de aislamiento solo viven en `cliente.ts`. Mi `grep` lo confirma: 0 archivos de código fuera de `adapters/db` (solo la prosa del `README.md`), y `instantaneaUnica: true` aparece 4 veces en `clases.ts` y 2 en `publicaciones.ts`, los usos reales.

**V-05, bloque por bloque** (`git diff ad070b9 -- backend/src/adapters/db/publicaciones.ts`, 4 bloques):
1. `@@ -152` (contexto `crearPublicacion`): solo el comentario anterior a `listarPublicaciones` y su firma (`async` → devuelve la promesa).
2. `@@ -160`: el cuerpo de `listarPublicaciones` dentro de `enTransaccion(…, { instantaneaUnica: true })`.
3. `@@ -241` (contexto `borrarPublicacion`, por su cierre): solo el comentario anterior a `listarComentarios` y su firma. El cuerpo de `borrarPublicacion` no cambia.
4. `@@ -256`: el cuerpo de `listarComentarios` dentro de la envoltura.

Todo cae dentro de las dos funciones o en su comentario inmediato: **no hay PA-22**. Con `git diff -w`, el orden de las sentencias es idéntico al original: en el muro, cursor, página, conteo y adjuntos; en el hilo, publicación, cursor y página. Solo cambia `ejecutor.` por `tx.`. Ninguna escritura entra en las dos instantáneas. El ejecutor externo se trata como dice §D-5: el comentario de cada función lo explica, y solo `muro.ts` las llama, sin ejecutor (V-04). `cliente.ts` solo cambia en el comentario respecto de la implementación anterior (el código es el que ya verifiqué). El resto de `adapters/db` no cambió: `git diff --name-only ad070b9` da solo `README.md`, `clases.ts`, `cliente.ts`, `publicaciones.ts` y `admin-muro-02b-r1` (el tester).

**Hermanos y estados vecinos, contrastados con el código** (todo lo que dice el resumen es cierto):
- **Lecturas con `cursor:` en `adapters/db`** (mi `grep`):
  - las tres de `clases.ts` (líneas 280, 340 y 404), protegidas desde la implementación;
  - las dos de `publicaciones.ts`, protegidas ahora;
  - las dos de `enlaces-registro.ts` (líneas 52 y 156), sin cambio y con razón: sin disparador hoy, O-4;
  - `inscripciones.ts` pagina por conjunto de claves (`condicionesDePagina`, línea 78) sin el `cursor` de Prisma: inmune.
- **Estados vecinos de las dos envolturas:**
  - cursor→página: PR-FX-06 y PR-FX-07;
  - página→conteo y página→adjuntos: PR-FX-06b;
  - publicación→comentarios: PR-FX-07b;
  - ejecutor externo: el doble pasa como cliente y abre la instantánea; con un `TransactionClient`, manda la transacción de afuera (PR-FX-01, caso anidado);
  - cursor inexistente antes de la primera sentencia: `400`, con las pruebas del muro existentes y la rama `400` del caso del tester.

  Ninguno queda como "no aplica" sin razón.

**Punto 5, reproducido (no solo leído):** guardé copia y SHA-256 de `publicaciones.ts`, puse su versión de `ad070b9` y corrí solo `npx vitest run test/lecturas-consistentes.integracion.test.ts`. Resultado: `Tests 4 failed | 9 passed (13)`. Las cuatro nuevas fallan en la aserción posterior al gancho, con la precondición "el gancho corrió" ya cumplida: PR-FX-06, PR-FX-07 y PR-FX-07b con `expected [] to deeply equal [ …(2) ]`, y PR-FX-06b con `expected +0 to be 1` (el conteo de comentarios). PR-FX-01 a PR-FX-05 siguen en verde. Restauré el archivo y comprobé que el árbol quedó exactamente como estaba: `sha256sum -c` OK, y `git status --porcelain` y `git diff --stat` idénticos.

Sin M-nn.

## Revisión final — FIX-CLASES
Veredicto: **APROBADO CON OBSERVACIONES**. Nada bloquea: el encargo se puede cerrar con un solo commit. Las observaciones son pendientes con destino para ESTADO.
Verificación propia del 2026-10-06, una suite a la vez, en `fix/clases` con base `<R>` = `ad070b9`. PA-01: red `IZZI-F281-5G` (de confianza permanente, ESTADO §5), regla del firewall habilitada (Inbound, Block, Public).
- **Backend:** `npm run lint` código 0. `npm test` código 0: `Test Files 150 passed (150)` · `Tests 1802 passed (1802)` (89.05 s), lo esperado. `npx vitest list`: 1802 casos y 150 archivos.
- **Raíz:** `npm run build` código 0 (`✓ built in 729ms`); `npm run lint` código 0.
- **Prisma:** `npx prisma validate`, válido; `git diff --name-only ad070b9 -- backend/prisma` vacío.
- `git diff --quiet ad070b9 -- shared frontend infra` da código 0: sus suites no se corren.

### 1. Lo planeado, solo lo planeado y todo lo planeado
`git diff ad070b9 --stat`: 5 archivos versionados (289 inserciones, 213 borrados), más 3 archivos de pruebas nuevos y la carpeta del encargo. Contra el plan con la Enmienda 1:
- **`cliente.ts`:** la opción `instantaneaUnica?: true` (REPEATABLE READ solo cuando se pide; sin opciones, la llamada a Prisma es idéntica a la de antes) y su comentario con la regla ampliada de §D-5.
- **`clases.ts`:** las cuatro lecturas dentro de la instantánea, con las sentencias en serie y sin `Promise.all`. El resto del archivo no cambió (`git diff -w`).
- **`publicaciones.ts`:** solo `listarPublicaciones` y `listarComentarios`, con el orden de sentencias idéntico. Revisado bloque por bloque en la verificación de la corrección (4 bloques, sin PA-22) y sin cambios desde entonces.
- **`adapters/README.md`:** los tres textos (el párrafo de `enTransaccion` con la oración de la Enmienda 1, y una oración en cada sección: `clases.ts` y `publicaciones.ts`).
- **Pruebas:**
  - `lecturas-consistentes.integracion.test.ts`, del programador: PR-FX-01 a PR-FX-07b, 13 casos.
  - `admin-muro-02b-r1.ataque`: C-1 del tester.
  - `lecturas-fx-r1.ataque`: la del tester, con C-2.
  - `lecturas-fx-r2.ataque`: del tester, ronda 2.
- **Nada fuera del plan:** el resto de `src/` no cambió, ni `handlers/`, `middleware/`, `shared/`, `frontend/`, `infra/`, `prisma/` o los `package.json`. **Nada de lo planeado faltó.**

### 2 y 3. PA-07 y V-01
- **PA-07**, sin excepción para `GET /api/admin/clases`:
  - `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `Unable to start a transaction` y `timed out`: 0 cada uno.
  - `too_small` 0 y `TypeError` 0.
  - `"Error no controlado"`: 10, exactamente I-1.
  - `"code":"P2028"`: 5, los permitidos (`tx.sesion.create`, `tx.tokenCuenta.updateMany`, `tx.sesion.findFirst`, `tx.sesion.updateMany` y `$queryRawUnsafe`), con control positivo.
  - `nombres-tokens-r2` pasó: la excepción arbitrada no hizo falta. **Limpia.**
- **V-01:** las 143 `*.ataque` coinciden en SHA-256 con la tabla de la ronda 2 (`diff` vacío).
  - `git diff ad070b9 --name-only` sobre `*.ataque` da solo `admin-muro-02b-r1` (C-1).
  - Las nuevas son `lecturas-fx-r1`, con C-2, y `lecturas-fx-r2`.
  - No hay borradas ni casos saltados (ningún `.skip`, `.only`, `.todo`, `xit` ni `xdescribe`).
  - **El programador no tocó ninguna `*.ataque`.**

### 4. Definición de terminado (`AGENTS.md`)
- **Cumple el requisito:** RN-06 ("una clase nunca queda sin maestro") ya no se rompe en las respuestas por una lectura inconsistente, y vuelven a cumplirse los contratos de `claseAdminSchema`, `claseInscritaSchema`, `claseImpartidaSchema` y `claseDetalleSchema`. Además, la regla T-18/T-29 del cursor en el muro y el hilo de comentarios.
- **Capas y middleware:** el cambio vive solo en `adapters/db`, el único lugar con Prisma. Los handlers y el middleware no cambiaron, y `$transaction` sigue solo en `enTransaccion`.
- **`lint`, `build` y `test`:** en verde (corrida propia).
- **Pruebas de autorización:** no hay endpoint nuevo ni cambia ninguna cadena. Las de autorización existentes de las siete rutas (las cinco de clases y las dos del muro) están en verde en la corrida completa.
- **Migración:** no hay. `backend/prisma` no cambió.
- **`infra/` y `.env.example`:** sin cambios, y no hacía falta tocarlos (el tamaño del pool no cambia).
- **Documentos:** `adapters/README.md` (programador) describe lo que hay. Los textos de A-1, con la redacción de la Enmienda 1 (autorizada con A-2), los aplica el orquestador (punto 7).

### 5. Reglas que no se rompen y estilo
- **Consultas sanas:** las mismas consultas e índices que antes, la misma paginación, ninguna consulta por fila y ningún SQL crudo nuevo (`$queryRawUnsafe` sigue siendo uno solo).
- **Transacciones:** toda transacción va por `enTransaccion`, `P2028` sigue siendo `503`, y las lecturas en REPEATABLE READ no escriben ni toman bloqueos (V-04).
- **Estado de pago:** ninguna de las seis lecturas lo selecciona.
- **Lo que no aplica o no cambió:** cola, archivos, UTC, trabajos diferidos, secretos, proveedores, `notifier` y autenticación.
- **Estilo (`CLAUDE.md`):** los cambios conservan los retornos tempranos y los `AppError` (`errorCursorInvalido()`), y los comentarios explican el porqué. En las pruebas, toda prueba tiene aserciones y las precondiciones fallan con mensaje. El bloqueo de tabla usa `NOWAIT` con reintento acotado, `timeout` explícito y la detección de que la lectura quedó formada contra esa tabla ("Bloqueos en las pruebas"; `higiene-de-pruebas.integracion` pasa).

### 6. Hallazgos, observaciones y repeticiones
- **T-01 y T-02:** corregidos con la Enmienda 1. Los verifiqué reproduciendo sus cuatro pruebas en rojo sin el remedio. La ronda 2 los atacó por todos los caminos de borrado y resistieron.
- **O-1, O-2 (sin las dos funciones del muro), O-3 y O-4:** a ESTADO §3 (abajo).
- **N-01:** a ESTADO §3, junto con O-1.
- **N-02** (reintentos de la retención en la corrida completa): no se observó ningún efecto en cinco corridas completas. Se cierra sin fila.
- **Las dos repeticiones de corrida** (ronda 0 por carga del equipo; programador por fallo de Docker en `global-setup`) ya están arbitradas como aceptables y van a ESTADO §5.

### 7. Documentos
**Textos que el orquestador aplica con A-1, en la redacción de la Enmienda 1 (A-2), tal cual:**
- `docs/ARCHITECTURE-ESSENTIALS.md`, "Reglas de datos", viñeta nueva después de la que empieza "Toda transacción se abre con `enTransaccion`" (hoy la línea 64). Texto en `plan.md`, línea 345:
  > - Una lectura de varias sentencias (Prisma resuelve cada relación anidada con otra sentencia) cuya respuesta exige una relación obligatoria o una cardinalidad mínima, o que comprueba la fila del cursor antes de leer la página, se hace en una sola instantánea: `enTransaccion` con `instantaneaUnica` (REPEATABLE READ, solo lecturas). Las transacciones que escriben siguen en READ COMMITTED (FIX-CLASES).
- `docs/ARCHITECTURE.md` §14, "Reglas de acceso a datos", viñeta nueva después de la de "**Transacción que expira (`P2028`).**" (hoy la línea 418). Texto en `plan.md`, línea 349, empieza: "- **Lecturas en una sola instantánea.** Sin la vista previa `relationJoins`…" y termina en "…§D-3 (FIX-CLASES)." Se copia completo, tal cual.

**`adapters/README.md`:** describe lo que hay: la opción, para qué sirve y su regla ampliada, las seis lecturas que la usan, las dos secciones por archivo y el ejecutor externo.

**Filas para `docs/ESTADO.md` §3:**
- **Se cierran:** el `500` de `GET /api/admin/clases` y la `*.ataque` intermitente de `admin-muro-02b-r1` (CLASES-02b).
- **O-1:** "comprobar y después actuar" con una clase (`POST /api/clases/unirse` con `buscarClasePorCodigo` y después `inscribir`; `editarClase` actualiza y relee), más **N-01** (el comentario de `buscarDatosDePertenencia` en `clases.ts` dice "una sola consulta" y Prisma la resuelve con varias). Destino: el encargo que agregue la baja de clases (ADMIN), que vuelve a correr el inventario de §D-3.
- **O-2:** mezclas de instantáneas inocuas que quedan (`listarPersonas` y el sexto paso; **ya no** `listarPublicaciones` ni `listarComentarios`) y S-03 (no hay bajas físicas de usuarios). Destino: el encargo que agregue bajas físicas de usuarios, si llega.
- **O-3:** las cotas de `clase.count()` del `total` en `gestion-clases.integracion` PR-2A12 y `gestion-02a-r1.ataque:793-799` (riesgo teórico de que otro archivo cree y borre clases dentro de una sola petición). Destino: aislamiento de pruebas, solo si aparece.
- **O-4:** `listarEnlacesRegistro` y `listarRegistradosPorEnlace` (`enlaces-registro.ts`) paginan con el `cursor` de Prisma sin comprobar antes el cursor y fuera de una instantánea; hoy no hay disparador (los enlaces se revocan, no se borran; no hay bajas físicas de usuarios). Destino: el encargo que agregue el borrado de enlaces o las bajas físicas, o el que reabra los enlaces en ADMIN.
- **`nombres-tokens-r2.ataque`** › "frontera de vigencia: iat hace 899 s → 200; iat hace 900 s → 401": intermitente por truncación al segundo (`firmarTokenAcceso`, `exp = floor(ms/1000) + 900`; jose rechaza `exp <= now`), con un margen real de 0 a 1 s. No es defecto del dominio. Destino: reescritura por el tester con autorización (C-n con **898 s**, conservando el caso de 900 s), en el próximo encargo que toque AUTH o en un `chore` de aislamiento de pruebas. Mientras tanto, si reaparece exactamente ese caso, se reporta con su hora y no bloquea.
- **Para TAREAS-01b** (ya lo trae el plan): revisar las lecturas con relaciones anidadas y con cursor de temas y categorías contra la regla de la instantánea única, frontera cursor→página incluida.

**Fila para `docs/ESTADO.md` §5 (entorno):** dos corridas completas del backend cayeron por el entorno durante FIX-CLASES, el 2026-10-06:
- la primera de la ronda 0: 14 suites en `beforeAll` por tiempos límite, con el equipo cargado y transformación e importación de 3 a 10 veces lo normal;
- la primera del programador: `global-setup` no levantó Testcontainers, con un "HTTP code 500" de Docker.

Las dos se repitieron una sola vez, declaradas. Anotar junto a M-02 de DESIGN-01b (tiempos de las suites) para decidir con datos si hace falta un `chore`.

### 8. Medición del programador
- **Rondas del tester:** 2, más la ronda 0. Ronda 1 ROTO (T-01 y T-02), ronda 2 RESISTE.
- **Rondas extra por hermanos:** 0. T-01 y T-02 vinieron de un error del inventario del plan, que también dejé pasar en la revisión del plan, no de un remedio que el programador no extendió.
- **Resúmenes devueltos:** 0 de 2.
- **PARADAS:** 1, correcta (PA-22/PA-05 por una expectativa de `lecturas-fx-r1` contradicha por la enmienda; resuelta con C-2).
- **Umbral de 2:** no se alcanzó.

### 9. Commit
**Mensaje propuesto:**
```
fix(clases): lecturas de clases y del muro en una sola instantánea y aislamiento de una prueba de ataque
```
(más las líneas de atribución que corresponda).

**Rutas exactas para `git add`:**
```
backend/src/adapters/db/cliente.ts
backend/src/adapters/db/clases.ts
backend/src/adapters/db/publicaciones.ts
backend/src/adapters/README.md
backend/test/lecturas-consistentes.integracion.test.ts
backend/test/admin-muro-02b-r1.ataque.test.ts
backend/test/lecturas-fx-r1.ataque.test.ts
backend/test/lecturas-fx-r2.ataque.test.ts
docs/trabajo/FIX-CLASES-lista-de-clases-del-admin/
docs/ESTADO.md
docs/ARCHITECTURE-ESSENTIALS.md
docs/ARCHITECTURE.md
```
Las tres últimas solo después de que el orquestador aplique los textos (A-1 con la redacción de A-2) y las filas de ESTADO. El SHA-256 resultante de ESSENTIALS y de `ARCHITECTURE.md` se anota en `aprobacion.md`.

### Problemas que bloquean
Ninguno.
