> **Nota de transcripción (orquestador, 2026-10-02).** La herramienta de escritura rechazó al tester este archivo ("Subagents should return findings as text"). El tester entregó el reporte como texto en su respuesta final y el orquestador lo transcribió aquí tal cual, sin cambiar contenido (regla de respaldo de `AGENTS.md`, "Transcripción con cotejo"). Cotejo mecánico del orquestador: `git diff --stat -- backend/` da exactamente los 10 archivos de A-1; la tabla de SHA-256 de abajo se tomó del archivo `tabla.md` que dejó el tester en el scratchpad y sus 107 hashes coinciden uno por uno con los calculados sobre los archivos rastreados (`git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'`), sin archivos faltantes. Registro en `aprobacion.md`.

# Reporte del Tester — CHORE-02 · pruebas y espera en cadena

## CHORE-02 — Ronda 0
Veredicto de la ronda 0: **cambios aplicados; C-2 es el único rojo, como se esperaba**. Sin hallazgos y sin PARADAS activadas.
Verificación propia:
- lint: `cd backend; npm run lint` → código 0.
- test: `cd backend; npm test` → `Test Files  1 failed | 119 passed (120)` · `Tests  1 failed | 1299 passed (1300)`. El rojo es C-2.

Fecha: 2026-10-02. Rama `feat/chore-02`, en `ee21252`. Autorización A-1 del humano registrada en `aprobacion.md`. SHA-256 de `plan.md` = `02ed23962492a7100c1b0f314463b3d2404f71fbcf342130907f7a7df2e1c4c5`, el mismo que se le presentó al humano.

### Comprobaciones previas
- **V-01:** las 107 `*.ataque` (`git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'`) coinciden una por una con la "Tabla de SHA-256 de las 107 `*.ataque` después de C-28" de `docs/trabajo/CLASES-01-clases-y-muro/reporte-tester.md` (línea 4989). `diff` sin diferencias y ningún `*.ataque` sin rastrear.
- **PA-01 (no se activó):**
  - `Get-NetConnectionProfile`: red `IZZI-F281-5G`, categoría **Public**.
  - `Get-NetFirewallRule`: la regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada, es de entrada, con acción **Block**, perfil **Public** y programa `C:\Program Files\Docker\Docker\resources\com.docker.backend.exe`.
  - Las dos reglas de permiso "Docker Desktop Backend" del mismo perfil no la anulan: en el firewall de Windows prevalece el bloqueo.
- **Docker:** responde (servidor 28.5.1). Están en marcha `campus-dev-postgres-1`, `campus-dev-minio-1` y `campus-dev-livekit-1` de `infra/`; no los arranqué ni los toqué. Al terminar la corrida no quedó ningún contenedor de Testcontainers.
- **Base de tipos de C-4, antes de los cambios:**
  - Usé un `tsconfig` provisional en el scratchpad, equivalente al de §D-6: `extends` de `backend/tsconfig.json`, `noEmit`, `rootDir` en `backend/`, `include` de `src`, `test` y `vitest.config.ts`, `exclude: []`, rutas absolutas y `typeRoots` explícitos.
  - Resultado: **41 errores en 22 archivos**, los mismos de M-01. 5 están en `*.ataque` y 36 en las 17 pruebas normales.

### Cambios C-1 a C-4
- Solo cambian los 10 archivos que nombra A-1, y en ellos solo lo que dice cada C-n.
- `git diff --stat` sobre `backend/`: 10 archivos.
- No agregué caracteres invisibles ni inversores de dirección:
  - Busqué U+200B a U+200F, U+202A a U+202E, U+2060 a U+2069, U+FEFF y U+00A0 en las líneas agregadas: 0.
  - Fuera de ASCII solo hay acentos y `§`.

**C-1 — `backend/test/cuentas-r1.ataque.test.ts`, líneas 125-182** (caso "con la tabla usuarios bloqueada por otra transacción, recuperar responde igual y a tiempo")
- **Comentario del porqué:** líneas 125-128.
- **Bloqueo:** `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE NOWAIT`, dentro de `intentarConElBloqueo`. Cada intento abre una transacción nueva con las mismas opciones de antes (`timeout: 10_000`, `maxWait: 5_000`).
- **Reintento solo si el bloqueo no está disponible** (`esBloqueoNoDisponible`). Lo reconoce por cualquiera de estas tres señales:
  - `code === "55P03"`;
  - `meta.driverAdapterError.cause.originalCode === "55P03"`;
  - el texto `could not obtain lock on relation`.

  Cualquier otro error se propaga.
- **Forma del error comprobada en el código de Prisma 7.10** con `@prisma/adapter-pg`:
  - `adapter-pg`, `convertDriverError`: un error de PostgreSQL sin mapeo propio sale como `kind: "postgres"`, con `originalCode` y `originalMessage`.
  - El runtime de `@prisma/client` (`client.js`) lo convierte en `PrismaClientKnownRequestError` `P2010`, con el mensaje ``Raw query failed. Code: `55P03`. Message: `could not obtain lock on relation "usuarios"` `` y el error del adaptador en `meta.driverAdapterError`.
- **Pausa entre intentos:** de 20 a 50 ms (`20 + Math.floor(Math.random() * 31)`).
- **Presupuesto:** 30 s desde el inicio del caso. Si se agota, el caso falla con `Error("no se obtuvo el bloqueo de la tabla usuarios en 30 s (<n> intentos)", { cause: error })`. El `cause` lo exige la regla `preserve-caught-error` de ESLint.
- **Orden:** `recuperar` se lanza solo después de obtener el bloqueo, dentro de la transacción que lo tiene, con la misma carrera de 1.5 s de antes.
- **Aserciones:** las dos de siempre, sin cambios.
- **Tiempo límite del caso:** 45 s.

**C-2 — `backend/test/guarda-r2.ataque.test.ts`, líneas 148-158**
- **Título nuevo:** "prefijos //api o /API (errores de tecleo) sin protegido(): la API no arranca (M-15)".
- **Qué comprueba:** con el ayudante `arranca` del archivo, registrar `GET /x` sin `protegido()` bajo el prefijo `//api`, y aparte bajo `/API`, debe impedir el arranque con un error que contenga `no pasa por protegido() (AGENTS.md, regla 2)`.
- **Antes** solo comprobaba que esas rutas no atendieran `/api/x` ni `/api/y` (404). Sigue siendo un solo caso, así que el conteo no cambia.
- **Rojo esperado hoy:** `expected 'arranca' to contain 'no pasa por protegido() (AGENTS.md, regla 2)'`, en `test/guarda-r2.ataque.test.ts:152:60`. La guarda actual deja arrancar `//api/x` porque no empieza por `/api`. La segunda aserción (`/API`) no llega a evaluarse porque la primera ya falla. Pasa a verde con el paso 9 del programador.

**C-3 — consulta de "formada" en `conFilaRetenida`**
- **Sitios:**
  - `backend/test/cuentas-r2.ataque.test.ts`, líneas 103-115;
  - `backend/test/cuentas-r3.ataque.test.ts`, líneas 163-176;
  - `backend/test/cuentas-03a-r1.ataque.test.ts`, líneas 175-188.
- **Cambio:** en los tres, la consulta recursiva de `detrasDeLaFila` cuenta solo procesos con `wait_event_type = 'Lock'` y `wait_event IN ('transactionid', 'tuple')`, en el caso base y en el recursivo, con la forma de §D-3. Cada sitio lleva un comentario de dos líneas.
- **No cambian:** el nombre de la función, la espera de 10 s por operación, el sondeo de 25 ms, las precondiciones ni los `timeout` de las retenedoras.
- **El filtro no les quita ninguna espera legítima:**
  - las operaciones de esos tres archivos esperan filas de `usuarios` o `sesiones` (por `FOR UPDATE`, `FOR SHARE`, `FOR NO KEY UPDATE` o una llave foránea);
  - el único `alRetener` (`cuentas-r3:699`) hace `UPDATE` de una fila de `usuarios`;
  - ninguna operación espera un bloqueo consultivo ni de tabla.

**C-4 — solo tipos, con la regla del paso 3**
- **`backend/src/config/logger.ataque.test.ts`, líneas 3 y 15:** `import { type Logger, pino } from "pino"` y `registrar: (log: Logger) => void`. Antes era `pino.Logger`, que no existe en el espacio de nombres del import nombrado.
- **`backend/test/invitacion-masiva-03c-r1.ataque.test.ts`, línea 504 (TS7024):** `async (): Promise<string> => ""` en la fila "sin token" del `it.each`. Nada más de la tabla cambia.
- **`backend/test/worker-03c-r1.ataque.test.ts` (líneas 50-66), `worker-r1.ataque.test.ts` (73-89) y `worker-r2.ataque.test.ts` (72-90):**
  - El problema: `asegurarCola` tipa sus opciones como `QueueOptions` de pg-boss, que no tiene `deadLetter`. El tipo `Queue` sí lo tiene, y `createQueue` lo recibe.
  - En cada archivo agregué un alias local, con su comentario: `type PoliticaConFallidos = NonNullable<Parameters<typeof asegurarCola>[1]> & { deadLetter: string }`.
  - El mismo objeto literal, con las mismas propiedades y valores en el mismo orden, pasa a una constante anotada, `const politica: PoliticaConFallidos = { … }`, justo antes de `await asegurarCola(COLA, politica)`.
  - No uso `as` ni `!`, y no importo pg-boss (lo prohíbe `arquitectura-cuentas-r1.ataque`).
  - El orden de `beforeAll` no cambia, porque la constante no tiene efectos.
  - **Para que lo revise el manager en el diff:** elegí esta forma porque mantiene la comprobación de las demás propiedades. Un `as QueueOptions` también callaría un error de tecleo en, por ejemplo, `retryLimit`.
- **Después de los cambios**, con el mismo `tsconfig` provisional:
  - **36 errores en 17 archivos, ninguno en un `*.ataque`.**
  - Son exactamente los de las 17 pruebas normales de A-4: las 15 de "solo tipos", `enlaces-registro.integracion:62` e `invitacion-masiva.integracion:459`.
  - PA-02 no se activó: ningún `*.ataque` fuera de los cinco tenía errores.

### Lint
- `cd backend; npm run lint` → código 0. Últimas líneas: `All matched files use Prettier code style!` y `> tsc -p tsconfig.json --noEmit`, sin errores.
- El primer intento falló por `preserve-caught-error` en mi propio C-1. Lo corregí con `{ cause: error }` antes de seguir.

### Conteos
- `cd backend; npx vitest list`, después de C-1 a C-4: **1300 casos en 120 archivos**. De ellos, 608 casos están en los 51 `*.ataque` del backend.
- Son las mismas cifras de partida (S-7).

### Corridas
1. **Aislada, una sola vez:** los 10 archivos tocados (`npx vitest run` con sus rutas) → `Test Files  1 failed | 9 passed (10)` · `Tests  1 failed | 186 passed (187)`. El rojo es C-2.
2. **Completa final de la ronda 0:**
   - Comando: `cd backend; npm test > <scratchpad>/chore02-r0-final.txt 2>&1`. Arrancó a las 20:11:18 y terminó a las 20:13:18, sin ninguna otra suite en marcha. No corrí el frontend.
   - Últimas líneas literales:
     ```
      Test Files  1 failed | 119 passed (120)
           Tests  1 failed | 1299 passed (1300)
        Start at  20:11:26
        Duration  111.59s (transform 23.05s, setup 5.20s, import 173.25s, tests 865.97s, environment 41ms)
     ```
   - **Único rojo:** `FAIL test/guarda-r2.ataque.test.ts > ataque (ronda 2): la guarda rechaza lo ilegítimo > prefijos //api o /API (errores de tecleo) sin protegido(): la API no arranca (M-15)`, con `Expected: "no pasa por protegido() (AGENTS.md, regla 2)"` y `Received: "arranca"`. Es el rojo esperado de C-2.
   - 0 `timed out`. El caso de C-1 y PR-B05 pasaron.
   - El reporter por defecto no imprime la duración por caso. Para PR-CH-02 hará falta `--reporter=verbose` o el reporte JSON.
   - No aparece `55P03` en la salida; es lo esperado, porque los errores de las transacciones de la prueba no se registran.

### PA-07 sobre la corrida final (conteo con `grep -c` por término)
| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 12 |
| `"code":"P2028"` | 2 |

- **(a)** no se activa.
- **(b)** las 12 líneas forman el inventario I-1 de abajo.
- **(c)** los dos `P2028` son exactamente los permitidos del bloque `describe("ataque: transacciones que Prisma cierra por tiempo (P2028) a mitad de una espera de bloqueo")` de `cuentas-r3`.
- El control positivo de §D-8 (los tres `P2028` de `servicio-ocupado.integracion`) todavía no aplica: ese archivo es del programador. Los dos de `cuentas-r3` sí aparecen.
- Hoy hay 0 líneas "Error controlado del servidor"; ese mensaje nace con el paso 8.

### Inventario I-1 (lista cerrada de (b) en PA-07)
Cada línea "Error no controlado" la asocié a su ruta con la línea "incoming request" del mismo `pid` y `requestId`, y a su llamada con la pila.

**Son `P2028` (pasarán a `warn` "Error controlado del servidor" con el paso 8): 2**
| # | Ruta | Llamada | Origen |
|---|---|---|---|
| 1 | `POST /api/auth/login` | `tx.sesion.create()` (`src/adapters/db/sesiones.ts:39` ← `src/handlers/auth/index.ts:134`) | `cuentas-r3.ataque`, bloque P2028, "login formado detrás de una fila retenida más de 5 s…" |
| 2 | `POST /api/auth/restablecer` | `tx.tokenCuenta.updateMany()` (`src/adapters/db/tokens-cuenta.ts:116` ← `src/handlers/auth/cuentas.ts:106`) | `cuentas-r3.ataque`, mismo bloque |

**Las provocan a propósito pruebas existentes (siguen como "Error no controlado"): 10**
| # | Ruta | Llamada o error | Prueba que lo provoca |
|---|---|---|---|
| 3-7 | `POST /api/auth/login` (5 veces) | `Error "fallo simulado de la base en la búsqueda"` (`test/intentos-r2.ataque.test.ts:24` ← `src/handlers/auth/index.ts:125`) | `intentos-r2.ataque`, "un error de la base a mitad del login responde 500 sin detalles, cuenta como intento y se libera al vencer la ventana" (ciclo de 5) |
| 8 | `POST /api/auth/login` | `Error "fallo simulado de la base al crear la sesión"` (`test/intentos-r2.ataque.test.ts:28` ← `src/handlers/auth/index.ts:134`) | `intentos-r2.ataque`, "si falla la creación de la sesión tras una contraseña correcta, el siguiente intento no está bloqueado" |
| 9 | `POST /api/clases/:claseId/archivos` | `ZodError` (URL inválida en `subida`; `src/handlers/archivos.ts:61`) | `archivos-d-r2.ataque`, "si el almacén firmara una URL que no es http(s), ni solicitar, ni la descarga, ni el muro la entregan" |
| 10 | `POST /api/clases/:claseId/archivos/:archivoId/descarga` | `ZodError` (URL inválida en `url`; `src/handlers/archivos.ts:90`) | el mismo caso |
| 11 | `GET /api/clases/:claseId/publicaciones` | `ZodError` (URL inválida en `publicaciones`; `src/handlers/clases/muro.ts:140`) | el mismo caso |
| 12 | `GET /prueba/error-comun` | `Error "boom"` (`test/salud.integracion.test.ts:24`) | `salud.integracion`, "responde 500 ERROR_INTERNO sin filtrar el mensaje original". Pasará a `/api/prueba/error-comun` con el paso 9 |

## Hallazgos
Ninguno. La ronda 0 es de adaptación (A-1).

## Para el programador, antes de empezar
- **Lo que le toca en tipos:** con el `tsconfig` provisional quedan 36 errores de tipos en sus 17 pruebas normales (paso 3).
- **Hermanos de C-4:** `worker-consumidor.integracion:71` y `worker-correo-de-cuenta.integracion:299` tienen el mismo error de `deadLetter`. El patrón de C-4 (alias `PoliticaConFallidos` y constante anotada, sin `as`) les aplica si quiere mantener la coherencia.
- **Duraciones para PR-CH-02:** `npm test` con el reporter por defecto no imprime la duración de PR-B05 ni la del caso de C-1. Para la tabla de PR-CH-02 necesita `--reporter=verbose` o el reporte JSON de Vitest, como dice el plan.
- **El 503 ya aparece en la salida:** las respuestas con estado 503 que se ven son de pruebas que ya existían (`BASE_DE_DATOS_NO_DISPONIBLE` y otras). Todavía no hay ninguna `SERVICIO_OCUPADO`.

## No atacado y por qué
- Es la ronda 0: los puntos de ataque 1 a 9 quedan para las rondas posteriores al programador.
- En particular, el sondeo de `pg_locks` durante el caso de C-1 (punto 2) y las 3 corridas seguidas por ronda.

### Tabla de SHA-256 de las 107 `*.ataque` después de la ronda 0 de CHORE-02 (base de V-01 del programador; cambian 10, marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `85A9B9654F81079B1F318C8BFC940E688F3FB714062B34E8686CEB238AE1AED5` | `backend/test/cuentas-r1.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` (cambia: ronda 0 de CHORE-02) |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CHORE-02 — Ronda 1
Veredicto: **ROTO** (1 hallazgo, severidad media).
Verificación propia (2026-10-02, rama `feat/chore-02`):
- lint: `cd backend; npm run lint` → código 0; últimas líneas `All matched files use Prettier code style!` y `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- test: 3 corridas completas seguidas; las tres con `Test Files  1 failed | 128 passed (129)` · `Tests  2 failed | 1412 passed (1414)`. Los dos rojos son los casos de T-01, en todas.

### Comprobaciones previas
- **V-01 al empezar:** las 107 `*.ataque` rastreadas coinciden una por una con la tabla de la ronda 0; ningún `*.ataque` sin rastrear.
- **PA-01 (no se activó):** red `IZZI-F281-5G`, perfil Public; regla "Campus: bloquear entrada a Docker en redes publicas" habilitada, de entrada, Block, Public.
- **Docker:** responde (servidor 28.5.1). `campus-dev-*` de `infra/` en marcha; no los toqué. Al terminar cada corrida no quedó ningún contenedor de Testcontainers.
- Una sola suite a la vez; no corrí el frontend. No arranqué la API ni el worker. No abrí navegadores.

### Hallazgos

#### T-01 — Un manejador de 404 de un plugin atiende `/api/clases/<id>/…` sin ninguna parte de la cadena, y la API arranca
Severidad: media
Prueba: `backend/test/guarda-ch-r1.ataque.test.ts`:
- "un plugin con prefijo /api/clases y setNotFoundHandler propio: o no arranca, o sin token responde 401";
- "un plugin con prefijo /api y setNotFoundHandler propio: o no arranca, o sin token responde 401".

Pasos para reproducir:
1. App de Fastify con `manejoDeErrores` y `registrarMiddleware` (la guarda), como `construirApp`.
2. Registrar un plugin con `{ prefix: "/api/clases" }` (o `"/api"`) que solo llama `hijo.setNotFoundHandler(async () => ({ secreto: "contenido de la clase" }))`.
3. `app.ready()`: **arranca**.
4. `GET /api/clases/<uuid>/publicaciones` **sin token** → `200 {"secreto":"contenido de la clase"}`.

Esperado / Obtenido:
- Esperado: la API no arranca, o la petición sin token responde 401 sin llegar al manejador (§D-5: "ninguna forma de atender `/api/clases/<id>/…` sin `:claseId` arranca"; punto de ataque 7).
- Obtenido: arranca y responde 200 con el contenido, sin `authenticate`, sin rol y sin pertenencia. Rojo en las 3 corridas (`AssertionError: expected 'responde 200 {"secreto":"contenido de…' to match /^(no arranca: |responde 401 )/`).

Por qué pasa:
- `setNotFoundHandler` no dispara `onRoute`, así que la guarda no lo ve. Tampoco lo detecta otra barrera: la regla de ESLint de `backend/src/handlers/**` (M-14) prohíbe `addHook`, pero no `setNotFoundHandler`. `middleware/README.md`, "Límite: hooks de plugin", no lo menciona.
- El único uso de producción es el de `handlers/errores.ts:61` (raíz, antes de la guarda, responde 404). Hoy ningún handler de dominio lo usa: no hay exposición en producción. Es un hueco de la guarda estructural, que el plan presenta como cobertura de "toda ruta" (M-15).

Requisito o regla violada: `AGENTS.md`, regla 2 (por construcción, DEC-16); plan §D-5 y punto de ataque 7.

### Observaciones (sin hallazgo)
- **O-1. Regla de PR-CH-01c (`higiene-de-pruebas`), formas que no ve y un falso positivo.** Lo comprobé con una réplica literal del algoritmo (`<scratchpad>/regla-lock.mjs`).
  - **No reconoce:** `LOCK /* x */ TABLE usuarios IN ACCESS EXCLUSIVE MODE` (un comentario SQL entre `LOCK` y `TABLE`) ni `… MODE -- sin NOWAIT` (`NOWAIT` solo dentro de un comentario SQL).
  - **Sí reconoce:** `LOCK TABLE ${Prisma.raw(tabla)} …`, sin `NOWAIT`.
  - **Falso positivo:** `` `LOCK TABLE "usuarios" IN ACCESS EXCLUSIVE MODE NOWAIT` ``, con la tabla entre comillas dobles, se marca como "sin NOWAIT": la `"` de la tabla se toma como terminador.
  - Las dos primeras exigen intención y la tercera solo estorba (empuja a escribir la tabla sin comillas). Baja; no lo cuento como hallazgo. Hoy ninguna prueba cae en ninguno de los tres casos.
- **O-2. Segmentos vacíos en la regla de los dos primeros segmentos.** `//api/*`, `//api/:seccion/*`, `/api//*`, `/api//:seccion/*` y `///*` con `protegido()` **sí arrancan**: el segmento vacío ocupa uno de los dos lugares.
  - Comprobé que no atienden `/api/clases/<id>/…` (404 sin token): solo atienden URL con la doble barra (`//api/clases/1/x`, `/api//clases/1/x`), con las opciones de enrutador por defecto de `construirApp`.
  - El razonamiento de §D-5 se sostiene: dos segmentos literales, aunque uno esté vacío, no pueden ser `api` + `clases`.
  - Casos en `guarda-ch-r1.ataque.test.ts`, "segmentos vacíos delante del comodín" (verdes, aceptan "no arranca" o "404").
  - Si un día se activa `ignoreDuplicateSlashes`, o Caddy o Cloudflare empiezan a normalizar `//`, esas rutas sí atenderían `/api/clases/<id>/…` con la cadena y sin pertenencia.
- **O-3. El motivo de N-01 repite la base cuando el parámetro va en la ruta.** Con `…/campus_pruebas&host=db.remota` (sin `?`), la guarda lo rechaza por la base (`la base es "campus_pruebas&host=db.remota"…`). Es el diseño de CHORE-01: repite el host y la base, nunca la URL ni la contraseña. Sin hallazgo.

### M-08 (hallazgo del manager) — confirmación y cifras
**En mis 3 corridas completas: no se reprodujo.** `enlaces-03b-r2.ataque`, caso "40 registros simultáneos con el mismo enlace: 40 × 201, 40 cuentas y ningún 5xx", quedó en verde en las tres, con 0 `503` y 0 `P2028` de `maxWait`. Lo que sí muestran las tres es lo cerca que queda del límite.

| Corrida | Duración de la suite | Duración del caso (JSON de Vitest) | `POST /api/auth/registro-maestro` en toda la corrida (104 peticiones; `responseTime` del log): mediana / p90 / máximo | `503` |
|---|---|---|---|---|
| 1 | 87.46 s | 729.9 ms | 376 / 678 / 1035 ms | 0 |
| 2 | 87.37 s | 1894.2 ms | 356 / 1559 / 1865 ms | 0 |
| 3 | 86.87 s | 2077.4 ms | 526 / 1664 / 2054 ms | 0 |
| Manager (`revision.md`) | 166.59 s | — | — | **5 de 40** |
| Programador (paso 14) | 165.90 s | — | — | 0 |

- **Contexto de la frecuencia:** mis corridas tardaron 87 s y las del programador y el manager, 166 s; el equipo estaba menos cargado esta vez. Con ese dato, M-08 sale en 1 de 5 corridas completas conocidas (la del manager) y solo con la suite lenta. Las corridas 2 y 3 ya llevan peticiones de más de 1.8 s, cerca del `maxWait` de 2 s.
- **Aislado** (`npx vitest run test/enlaces-03b-r2.ataque.test.ts -t "40 registros"`, 3 veces): 3 de 3 en verde, 40 × `201`. Máximo `responseTime` de las 40: 1368, 822 y 874 ms.

**Mecanismo: el `503` es el `maxWait` del pool; lo que llena el pool son las transacciones formadas en el `FOR NO KEY UPDATE` del enlace.**
- Medición aislada, fuera del repositorio: un archivo de Vitest en el scratchpad con una configuración propia (`root` = `backend/`, el mismo `globalSetup` y el mismo `setupFiles`) y la app con `LOG_LEVEL=error`. Lanza N registros simultáneos con el mismo enlace y sondea `pg_stat_activity` cada 15 ms. A mitad de la ráfaga (a los 400 ms) lanza un `POST /api/auth/registro` ajeno (otra cuenta, otra ruta transaccional).

  | N | Estados | Último `201` desde el inicio | Hueco mediano / p90 entre `201` consecutivos | Máximo de procesos esperando la fila (`transactionid`/`tuple`) | Petición ajena |
  |---|---|---|---|---|---|
  | 40 | 40 × 201 | 731 ms | 7 / 10 ms | 8 | 201 en 260 ms |
  | 40 | 40 × 201 | 623 ms | 0 / 11 ms | 8 | 201 en 161 ms |
  | 80 | 80 × 201 | 1116 ms | 0 / 7 ms | 8 | 201 en 657 ms |
  | 120 | 120 × 201 | 1658 ms | 0 / 7 ms | 8 | 201 en 1192 ms |
  | 160 | 160 × 201 | 2335 ms | 0 / 8 ms | 8 | 201 en **1866 ms** |

- **Lectura:**
  - La sección en serie cuesta unos **14 ms por registro** sin carga (160 registros en unos 2.2 s después del primero).
  - Durante la ráfaga, **8 de las 10 conexiones del pool** están ocupadas por transacciones que esperan la fila del enlace. Las otras dos son la titular y el sondeo.
  - Cualquier otra transacción del mismo proceso espera conexión. Los registros que llegan después, y también **peticiones de otros usuarios en otras rutas**, aunque no toquen el enlace (la petición ajena llegó a 1.87 s con N = 160), reciben `P2028` "Unable to start a transaction in the given time" cuando esa espera pasa de 2 s.
  - Lo que limita es el `maxWait` (2 s), no el `timeout` (5 s): ningún registro pasa 5 s dentro de su transacción.
  - Lo confirma el log del manager: los 5 `P2028` de su corrida son de `maxWait`.
- **Por qué los 40 casi nunca fallan:** argon2 corre fuera de la transacción, en el pool de hilos de libuv (4 hilos por defecto), y espacía la llegada. Las transacciones entran más o menos al ritmo al que salen.
- **Cuándo falla:** cuando la sección en serie se alarga por carga de la base o de la CPU. Con unos 30 registros en cola detrás de 10 conexiones, basta con que cada registro tarde más de unos 65 ms (2000 / 30) para que los últimos pasen de 2 s.
- **En producción, con 40 registros simultáneos de un mismo enlace:**
  - con un proceso de API, el pool por defecto (10) y la base sin la carga de la suite, lo esperable es 40 × `201` (aislado aguantó hasta 160);
  - el riesgo real es doble:
    - **(a)** si la base tarda más de unos 50 a 65 ms por transacción (disco lento, `fsync`, otra carga), salen `503`;
    - **(b)** mientras dura la ráfaga, **todo el resto de la API** comparte esas 10 conexiones: cada transacción ajena espera conexión (hasta 1.87 s medido) y puede recibir `503`. Las consultas sin transacción también esperan, sin límite, porque `pg.Pool` no tiene `connectionTimeoutMillis` por defecto (no lo medí aparte; lo leí en el código: `pg-pool/index.js` toma `max = 10` y, sin `connectionTimeoutMillis`, no arma temporizador; `@prisma/adapter-pg` crea `new pg.Pool(this.config)` con solo el `connectionString` de `adapters/db/cliente.ts`).
  - Es un dato para el arquitecto, no una propuesta.
- **No cambié** `enlaces-03b-r2.ataque.test.ts`.

### `ritmo-03c-r1.ataque` (A-6, autorizada por el humano el 2026-10-02)
**Fallos registrados antes del cambio:** ninguno en esta ronda, porque apliqué A-6 antes de mi primera corrida. Los fallos conocidos son los del programador (paso 14: "si ya pasaron más de 250 ms…", `expected 30 to be less than 30`, 416.3 ms) y el del manager ("cinco trabajos seguidos…", `[261,265,270,315]: expected 315 to be less than 310`).

**Cambio**, solo en `backend/src/workers/ritmo-03c-r1.ataque.test.ts` (lo demás del archivo, sin cambios):

| Líneas (después) | Antes | Después | Motivo |
|---|---|---|---|
| 49-53 (comentario) y 55 | `TOLERANCIA_ARRIBA = 60` | `TOLERANCIA_ARRIBA = 150` | Con 124 archivos en paralelo, `setTimeout` se retrasó 65 ms (manager). El límite de un hueco pasa de 310 a 400 ms: una espera doble (unos 500 ms) sigue fallando. Afecta las líneas 129 (cinco trabajos), 167 (omitido) y 191 (reloj hacia atrás). |
| 56-59 (nueva constante con su comentario) | — | `TOLERANCIA_SIN_ESPERA = 150` | Sustituye al literal `30` de "sin espera": el programador midió exactamente 30. 150 ms queda por debajo de los 250 ms de una espera indebida, que sigue fallando. |
| 122 | `toBeLessThan(inicio + 30)` | `toBeLessThan(inicio + TOLERANCIA_SIN_ESPERA)` | El primer trabajo no espera. |
| 132 | `toBeLessThan(30)` | `toBeLessThan(TOLERANCIA_SIN_ESPERA)` | Nada después del último. |
| 164 | `toBeLessThan(30)` | `toBeLessThan(TOLERANCIA_SIN_ESPERA)` | Tras un omitido, el envío no espera otra vez. |
| 177 | `toBeLessThan(30)` | `toBeLessThan(TOLERANCIA_SIN_ESPERA)` | Pasados más de 250 ms, el siguiente no espera. |

- `TOLERANCIA_ABAJO = 2` no cambia: los fallos fueron todos por arriba.
- **Por qué sigue distinguiendo un defecto real:**
  - una espera indebida mide al menos unos 250 ms, más que 150;
  - la falta de una espera debida da un hueco cercano a 0, menos que el mínimo de 248 ms;
  - una espera doble da unos 500 ms, más que el límite de 400.
- No cambié el método (reloj real) ni ningún caso, entrada o aserción, salvo los valores de la tabla.
- **Después del cambio:** `npx vitest run src/workers/ritmo-03c-r1.ataque.test.ts` → 6/6, y en verde en las 3 corridas completas. Duraciones de los seis casos en las corridas 1, 2 y 3 (ms):

  | Caso | Corrida 1 | Corrida 2 | Corrida 3 |
  |---|---|---|---|
  | cinco trabajos | 1112.2 | 1058.3 | 1054.1 |
  | M-09 | 287.4 | 270.5 | 261.2 |
  | rechazado | 289.4 | 265.6 | 266.9 |
  | omitido | 306.5 | 278.9 | 279.4 |
  | "más de 250 ms" | 342.1 | 340.3 | 360.2 |
  | reloj hacia atrás | 266.6 | 254.7 | 266.0 |

### Corridas completas del backend (3 seguidas, nunca dos a la vez)
- **Comando:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/chore02-tester-r1-N.json > <scratchpad>/chore02-tester-r1-N.txt 2>&1`, con N = 1, 2 y 3. El reporte JSON da las duraciones por caso; la salida de la consola es la de siempre.
- **Últimas líneas literales:**
  - Corrida 1: `Test Files  1 failed | 128 passed (129)` · `Tests  2 failed | 1412 passed (1414)` · `Duration  87.46s (transform 11.20s, setup 5.12s, import 161.92s, tests 637.07s, environment 52ms)`
  - Corrida 2: `Test Files  1 failed | 128 passed (129)` · `Tests  2 failed | 1412 passed (1414)` · `Duration  87.37s (transform 9.90s, setup 4.87s, import 160.29s, tests 635.72s, environment 38ms)`
  - Corrida 3: `Test Files  1 failed | 128 passed (129)` · `Tests  2 failed | 1412 passed (1414)` · `Duration  86.87s (transform 11.11s, setup 4.89s, import 161.02s, tests 637.60s, environment 49ms)`
- **Rojos:** en las tres, solo los dos casos de T-01 (`test/guarda-ch-r1.ataque.test.ts`), de 572 a 649 ms el primero y de 9 a 10 ms el segundo, con el mismo mensaje. Ningún `timed out`. Ningún rojo intermitente: PA-12 no se activó.
- **Sin rojos en:** `ritmo-03c-r1` (con A-6), `enlaces-03b-r2` (M-08), A3 de `bloqueo-usuario` (555 a 694 ms) ni en ninguno de los míos fuera de T-01.

| Corrida | Caso de C-1 (`cuentas-r1`) | PR-B05 (`alumnos.integracion`) |
|---|---|---|
| 1 | 8636.5 ms | 4219.1 ms |
| 2 | 5023.4 ms | 4530.2 ms |
| 3 | 8604.7 ms | 3950.8 ms |

- **R-1:** el caso de C-1 se quedó por debajo de 10 s en las tres corridas (máximo 8.6 s), lejos de los 20 s que el manager fijó para revisar el presupuesto. El programador midió 12.4 s con la suite a 166 s.

**PA-07** (conteo con `grep` por línea sobre cada salida completa, más una asociación de cada línea a su ruta por `pid` + `requestId` de "incoming request"):

| Término | Corrida 1 | Corrida 2 | Corrida 3 |
|---|---|---|---|
| `40P01` | 0 | 0 | 0 |
| `deadlock detected` | 0 | 0 | 0 |
| `could not serialize` | 0 | 0 | 0 |
| `too many clients` | 0 | 0 | 0 |
| `"Error no controlado"` | 10 | 10 | 10 |
| `"code":"P2028"` | 5 | 5 | 5 |
| (`Error controlado del servidor`) | 5 | 5 | 5 |

- **(a)** no se activa en ninguna corrida.
- **(b)** las 10 líneas de "Error no controlado" son, en las tres, exactamente el inventario I-1:
  - 5 × `POST /api/auth/login` "fallo simulado de la base en la búsqueda" y 1 × "… al crear la sesión" (`intentos-r2`);
  - los 3 `ZodError` de `archivos-d-r2` (`POST /api/clases/:id/archivos`, `POST /api/clases/:id/archivos/:id/descarga` y `GET /api/clases/:id/publicaciones`);
  - `GET /api/prueba/error-comun` "boom" (`salud.integracion`).
- **(c)** los 5 `P2028` son, en las tres, exactamente los permitidos, todos de `timeout` y en nivel 40 (`warn`):
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()` (PR-CH-04d);
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()` (PR-CH-04e);
  - `POST /api/clases/:id/publicaciones/:id/comentarios` › `prisma.$queryRawUnsafe()` (PR-CH-04f);
  - `POST /api/auth/login` › `tx.sesion.create()` (`cuentas-r3`);
  - `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()` (`cuentas-r3`).
- **Control positivo:** presentes en las tres corridas los tres de `servicio-ocupado` (04d, 04e, 04f), cada uno con su ruta. **PA-07 limpia en las tres.**
- **Mis `P2028` deliberados no salen en el conteo:** los ocho casos de `servicio-ocupado-ch-r1` provocan `P2028` a propósito, pero su app registra en nivel `error`, así que sus líneas `warn` no aparecen en la salida y la lista cerrada de §D-8 no cambia. Un `500` de esos casos sí saldría, como "Error no controlado" (nivel error), y además haría fallar el caso.
- **Punto 6 (el log):** revisé las 5 líneas `warn` de la corrida 1. Llevan el `err` de Prisma con el fragmento del código fuente (nombres de variables, sin valores) y `codigo`. 0 apariciones de `argon2id`, `contrasena-nueva`, `campus_refresco=`, `Bearer `, `@pruebas.local`, `clave-de-prueba` y `authorization`. PA-10 no se activa.

**Sondeo de `pg_locks` durante las corridas (punto 2).**
- **Método:** un proceso aparte (`<scratchpad>/sondeo-pglocks.sh`) espera al contenedor de Testcontainers de la corrida. Dentro de él, con `docker exec … psql` (solo lectura), repite con `\watch 0.01` una consulta de `pg_locks` sobre `public.usuarios`. No toca la suite ni la base.
- **Corrida 1, inválida para esta pregunta:** la consulta no filtraba `locktype`. Salieron 686 filas, 26 con `granted = f`, pero incluían bloqueos de **tupla** (los de quien espera una fila retenida, que PostgreSQL toma en modo `AccessExclusiveLock`; por ejemplo, un `pid` "retuvo" 5.7 s, que es una espera de fila de `servicio-ocupado` o `cuentas-r3`). No la cuento.
- **Corridas 2 y 3**, con `locktype = 'relation'` y los modos `AccessExclusiveLock`, `ExclusiveLock`, `ShareRowExclusiveLock` y `ShareLock`:
  - 34 y 30 muestras con bloqueo de tabla, todas `AccessExclusiveLock` con **`granted = t`**, de dos procesos por corrida (uno de unos 10 ms y otro de unos 310 ms; por la duración atribuyo el de 310 ms a mi `nowait-ch-r1`, que retiene 300 ms, y el otro al caso de C-1, sin haberlos identificado por `pid`);
  - **0 muestras con `granted = false`**: el `LOCK TABLE … NOWAIT` nunca quedó formado.

### Atacado sin hallazgos
- **Punto 1 (la cadena, de verdad):**
  - 3 corridas sin caídas y con la definición nueva de PA-07 limpia.
  - Revisión estática de `backend/test/**` y de `backend/src/**/*.test.ts`: el único bloqueo de tabla fuera del mío es el `LOCK … NOWAIT` de C-1. No hay `TRUNCATE`, `ALTER TABLE`, `VACUUM`, `REINDEX`, `CLUSTER` ni `DROP` que se ejecuten: los `DROP TABLE` que aparecen son cadenas de inyección en cuerpos de petición. `CREATE INDEX` y `ANALYZE` solo corren sobre la tabla temporal de `alumnos-b-r1:951-952`. Queda el `ANALYZE "usuarios"` de PR-B05 (S-4: `ShareUpdateExclusiveLock`, no choca con la aplicación).
  - No hay archivos que no sean `.ts` bajo `backend/test`.
- **Punto 2 (el reintento de C-1):** `backend/test/nowait-ch-r1.ataque.test.ts`, "con una fila retenida, el reintento nunca aparece formado ni frena lecturas; obtenido, bloquea a quien lea usuarios", en verde aislado y en las 3 corridas. Con una fila de `usuarios` retenida 1.2 s:
  - todos los `NOWAIT` fallan con `55P03`;
  - el sondeo propio de `pg_locks` no ve ningún `AccessExclusiveLock` de tabla en espera;
  - una lectura de `usuarios` desde otra conexión nunca tarda 1 s.

  Ya obtenido el bloqueo, una lectura de `usuarios` pierde la carrera de 300 ms ("tiempo"). Es decir: si `recuperar` leyera `usuarios`, el caso de C-1 seguiría fallando; el reintento no lo esconde. Se suma el sondeo externo de las corridas 2 y 3 (arriba).
- **Punto 3 ("formada"):** `backend/test/formada-ch-r1.ataque.test.ts`. `formadasDetrasDe` cuenta 1, 2 y 3 con una espera por llave foránea (`INSERT` de una sesión: `FOR KEY SHARE` implícito), un `UPDATE` de la fila y un `FOR KEY SHARE` explícito detrás de un `FOR UPDATE`. Las esperas directas son todas `transactionid` o `tuple`.
- **Puntos 4 y 5 (`P2028` → `503`):** `backend/test/servicio-ocupado-ch-r1.ataque.test.ts`, 8 casos en verde aislados y en las 3 corridas.
  - **`maxWait` (punto 5):**
    - con las 10 conexiones ocupadas, `enTransaccion` rechaza con `AppError` 503 `SERVICIO_OCUPADO`, causa `P2028`, sin ejecutar la función y en menos de 4.5 s;
    - `POST /api/auth/registro` responde 503 con el cuerpo exacto, sin cookie y sin cuenta, y después 201;
    - en los dos casos, una barrera de 10 transacciones simultáneas comprueba que el pool no pierde conexiones después del `maxWait`.
  - **`timeout` (punto 4)**, en rutas que el programador no cubría: `POST /api/auth/registro-maestro` (fila del enlace), `POST /api/admin/enlaces-registro/:id/revocar`, `POST /api/admin/usuarios/:id/restablecer-contrasena`, `PUT /api/admin/usuarios/:id/correo`, `POST /api/auth/establecer-contrasena` y `POST /api/clases/:claseId/alumnos`. En cada una:
    - `503` con `{ error: { codigo: "SERVICIO_OCUPADO", mensaje } }` exacto, nunca 500;
    - nada escrito: sin cuenta ni cookie; enlace sin revocar; sin contraseña temporal en el cuerpo, `hash_contrasena` y `debe_cambiar_contrasena` iguales y la sesión viva; correo y token sin cambios; invitación sin usar; sin inscripción ni movimiento;
    - la misma petición, repetida, responde `2xx`.
  - **Estático:** ningún `try/catch` de `adapters/db` dentro de una transacción convierte un `P2028` en otra cosa (`traducirErrorPrisma` relanza todo lo que no es `P2002`/`22021`; `conReintentoDeCodigo` de `clases.ts` relanza lo que no es `CODIGO_NO_DISPONIBLE`). Tampoco hay `try/catch` en `handlers/` ni en `workers/`. El `503` es el mismo cuerpo para toda ruta: no distingue cuentas ni sesiones.
  - **Fuera del alcance del `P2028`, sin transacción:** `POST /api/clases/unirse` (`inscribir`, `createMany` sin transacción) espera la fila sin límite, como antes de CHORE-02.
- **Punto 7 (la guarda):** `guarda-ch-r1`, 12 casos verdes además de los 2 de T-01. Se rechazan:
  - `app.all("/api/*")`;
  - `route` con `method` en arreglo sobre `/api/:seccion/*`;
  - un parámetro con expresión regular en el primer segmento y en el segundo;
  - el comodín pegado `/api/c*`;
  - un prefijo `/:seccion` con ruta literal `/clases/:claseId/x`;
  - una ruta fuera de `/api` con método en minúsculas y sin cadena.

  Los segmentos vacíos van en O-2. PR-CH-05d (la API real arranca) sigue en verde.
- **Punto 8 (N-01):** `backend/test/entorno-ch-r1.ataque.test.ts`, 21 variantes, todas verdes. Para cada URL que la guarda **acepta**, `pg-connection-string` (el que usa `pg`) la lee con host local, base `campus_pruebas` y ningún parámetro extra.
  - **Variantes:** `?HOST=`, `?host=`, `?%68ost=`, `&host=`, `?` vacío, `#host=`, `#?host=`, `# ?host=` (el espacio activa el `encodeURI` de `pg-connection-string`), `?user=`, una contraseña con espacio o con `%zz`, `[::1]`, `[0:0:0:0:0:0:0:1]`, `LOCALHOST`, `localhost.`, `127.1`, `u:p@db.remota@127.0.0.1`, `/../campus_dev`, `campus%5Fpruebas`, varios hosts con coma y `postgres://`.
  - Ningún motivo de rechazo repite la contraseña.
- **Punto 9 (N-03):** sobre una copia fuera del repositorio (`src`, `test`, `package.json`, `tsconfig*.json` y `vitest.config.ts` de `backend`, más `tsconfig.base.json`, con `node_modules` enlazado por unión de directorio y retirado al terminar), `npm run typecheck` da código 0 sin cambios. Con un archivo `test/error-de-tipos-ch-r1.ts` (`const x: number = "texto"`) da **código 2** y `error TS2322`. `lint` lo llama con `&&`, así que también falla.
- **PR-CH-08:** la ventana de 2000 se sostuvo en las 3 corridas.

### No atacado y por qué
- **El punto 4 en el worker de recuperación, en `crear` y `borrar` publicaciones y comentarios, en la baja de alumnos, en confirmar archivos y en la invitación individual y en lote.** Comparten `enTransaccion`, y PR-CH-04h impide otra vía. La invitación en lote retiene un bloqueo consultivo global (PR-CH-04, "Por qué no hay prueba HTTP").
- **Un `503` como oráculo por tiempo** (forzar contención sobre la fila de una cuenta para distinguir si existe). Necesitaría retener la fila de una cuenta ajena desde fuera, y el mismo efecto ya existía con `500` antes de CHORE-02: no es nuevo.
- **El frontend** (CHORE-02 no lo toca) y cualquier comprobación en navegador.
- **"Con el equipo cargado".** No tenía cómo cargar el equipo sin correr dos suites a la vez: mis corridas fueron de 87 s, contra 166 s de las del programador y del manager.

### Conteos
- `cd backend; npx vitest list --filesOnly | grep -c .` → **129** archivos (124 + 5 míos).
- `cd backend; npx vitest list | grep -c .` → **1414** casos (1369 + 45 míos: `guarda-ch-r1` 14, `servicio-ocupado-ch-r1` 8, `formada-ch-r1` 1, `nowait-ch-r1` 1, `entorno-ch-r1` 21).
- `*.ataque` del repositorio: 112 (107 + 5 nuevos).

### Archivos de esta ronda
- **Nuevos, todos en `backend/test/`:** `guarda-ch-r1.ataque.test.ts`, `servicio-ocupado-ch-r1.ataque.test.ts`, `formada-ch-r1.ataque.test.ts`, `nowait-ch-r1.ataque.test.ts` y `entorno-ch-r1.ataque.test.ts`.
- **Cambiado con A-6:** `backend/src/workers/ritmo-03c-r1.ataque.test.ts`.
- Nada más del repositorio, salvo este reporte. Prettier solo se corrió sobre esos archivos, desde `backend/`.
- **Fuera del repositorio**, en el scratchpad: la medición de M-08, la réplica de la regla, el sondeo y la copia de N-03, ya borrada.


### Tabla de SHA-256 de las 112 `*.ataque` al cierre de la ronda 1 de CHORE-02 (107 de la ronda 0, una cambiada por A-6 y 5 nuevas; marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` (cambia: A-6, ronda 1 de CHORE-02) |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `85A9B9654F81079B1F318C8BFC940E688F3FB714062B34E8686CEB238AE1AED5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` (nuevo: ronda 1 de CHORE-02) |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` (nuevo: ronda 1 de CHORE-02) |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` (nuevo: ronda 1 de CHORE-02) |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` (nuevo: ronda 1 de CHORE-02) |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` (nuevo: ronda 1 de CHORE-02) |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CHORE-02 — Ronda 2
Veredicto: **ROTO** (4 hallazgos: 3 de severidad media y 1 baja). **PA-12 se activó**: en las corridas 1 y 2 salió un rojo intermitente fuera de mis archivos. Las reporto completas y me detuve; no repetí ninguna corrida.

Verificación propia (2026-10-02, rama `feat/chore-02`, sobre el código que aceptó el manager):
- lint: `cd backend; npm run lint` → código 0; últimas líneas `> @campus/backend@0.0.0 typecheck` y `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- test: 3 corridas completas seguidas, ninguna limpia (detalle abajo).

### Comprobaciones previas
- **V-01:** las 112 `*.ataque`, rastreadas y no rastreadas, coinciden una por una con la tabla de la ronda 1 (`diff` vacío). Al cierre solo se suman mis 2 nuevas; ninguna otra cambió.
- **PA-01 (no se activó):** perfil de red Public; la regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada.
- **Docker:** responde. Al terminar no quedó ningún contenedor de Testcontainers.
- Una sola suite a la vez; no corrí el frontend. No arranqué la API ni el worker. No abrí navegadores.

### Hallazgos

#### T-02 — Las opciones de ruta `errorHandler`, `onSend` y `preSerialization` rehacen el `401` de la cadena, y la API arranca
Severidad: media
Prueba: `backend/test/guarda-ch-r2.ataque.test.ts`, `describe` "opciones de ruta que corren después de la cadena y rehacen su 401", los tres casos del `it.each` (`errorHandler`, `onSend`, `preSerialization`). Rojos en las 3 corridas.

Pasos para reproducir:
1. App suelta con el orden de `app.ts`: `manejoDeErrores` y después `registrarMiddleware`.
2. En un plugin con prefijo `/api`, registrar `hijo.route({ method: "GET", url: "/clases/:claseId/publicaciones", ...protegido({ pertenencia: "inscripcion" }), handler })` con una de estas opciones de ruta:
   - `errorHandler: async (_e, _r, reply) => reply.code(200).send({ secreto })`;
   - `onSend: async (_r, reply) => { reply.code(200); return SECRETO }`;
   - `preSerialization: async (_r, reply) => { reply.code(200); return { secreto } }`.
3. `ready()`: **arranca**.
4. `GET /api/clases/<uuid>/publicaciones` **sin token** → `200 {"secreto":"contenido de la clase"}`. El handler no corre: `authenticate` cortó con `401`, pero la opción de la ruta reescribió el estado y el cuerpo.

Esperado / Obtenido:
- Esperado: la API no arranca, o la petición sin token responde el `401` del envoltorio (`{"error":{"codigo","mensaje"}}`). Es la propiedad de §D-5, del punto 7 y de §E3-1 para `setErrorHandler`: la respuesta de la cadena no se puede rehacer.
- Obtenido: arranca y responde `200` con un cuerpo arbitrario. Cada opción es una función asíncrona, así que podría ir a buscar datos protegidos.

Por qué pasa:
- La guarda revisa `preHandler` y los hooks de ruta que corren antes (`onRequest`, `preParsing` y `preValidation`; T-12), no los que corren después.
- §E3-1 cerró `setErrorHandler` a nivel de instancia, pero no su hermano por ruta: la opción `errorHandler` (`fastify/lib/route.js:216` y `:378`).
- La regla de ESLint M-14 solo reconoce `addHook(...)`, y estas son propiedades de un objeto: tampoco las ve.
- Hoy ningún archivo de `backend/src` las usa (`grep` de `errorHandler`, `onSend`, `preSerialization`, `onResponse`, `onError` y `setReplySerializer`: 0 coincidencias). No hay exposición en producción; es un hueco de la guarda estructural, de la misma familia que T-01.

Requisito o regla violada: `AGENTS.md`, regla 2 (por construcción, DEC-16); plan §D-5, punto de ataque 7 y §E3-1 ("hermano: `setErrorHandler`").

#### T-03 — `addHook("onSend")` en un plugin convierte el `401` de la cadena en `200` con otro cuerpo
Severidad: baja
Prueba: `backend/test/guarda-ch-r2.ataque.test.ts`, "addHook('onSend') en un plugin: el 401 sigue siendo 401 y el handler no corre". Rojo en las 3 corridas (`AssertionError: responde 200 {"secreto":"contenido de la clase"}`).

Pasos para reproducir: como en T-02, pero con `hijo.addHook("onSend", async (_r, reply) => { reply.code(200); return SECRETO })` a nivel del plugin y la ruta con `protegido({ pertenencia })` sin opciones extra.

Esperado / Obtenido:
- Esperado: el manager dio por hecho en `revision.md` ("Hermanos de T-01") que un `onSend` "solo [puede] dar otra forma al cuerpo… No ejecutan el handler ni cambian el estado HTTP". Pedí comprobarlo, con el `401` intacto como expectativa.
- Obtenido: **sí cambia el estado** (`401` a `200`). El handler no corre.

Por qué es baja:
- Está dentro del "Límite: hooks de plugin" de `middleware/README.md`.
- ESLint M-14 prohíbe `addHook` en `backend/src/handlers/**`.
- Queda abierto fuera de `handlers/`: `middleware/`, `adapters/`, `app.ts` o un plugin transversal. La premisa de la revisión sobre el estado HTTP no se sostiene, y el texto del límite solo habla de hooks que corren antes de `protegido()`.

Requisito o regla violada: `middleware/README.md`, "Límite: hooks de plugin" (el texto subestima el alcance); `revision.md`, hermanos de T-01.

#### T-04 — PA-12: el caso de C-1 agotó su presupuesto de 30 s (corrida 1)
Severidad: media
Prueba: `backend/test/cuentas-r1.ataque.test.ts`, "con la tabla usuarios bloqueada por otra transacción, recuperar responde igual y a tiempo", en la corrida 1. No es una prueba mía: es la de C-1.

Obtenido: `failed, 30136.6 ms :: Error: no se obtuvo el bloqueo de la tabla usuarios en 30 s (540 intentos)`. Ninguna otra caída por tiempo (0 `timed out`); la corrida no se tumbó en cascada, como preveía R-1.

Evidencia del cruce de archivos (`startTime` y `endTime` del JSON de Vitest, segundos desde el inicio de la corrida): `cuentas-r1` corrió de 13.1 a 51.3. En ese tramo corrían, con retenciones casi continuas de filas de `usuarios` (cada `FOR UPDATE` deja un `RowShareLock` en la tabla, y eso basta para que `NOWAIT` falle):
- `servicio-ocupado.integracion` (10.3 a 43.3);
- `servicio-ocupado-ch-r1.ataque` (10.6 a 51.0; **mío, de la ronda 1**: seis retenciones de 5.5 s seguidas);
- `cuentas-r3` (10.3 a 34.9);
- `cuentas-03a-r1` (10.3 a 21.1);
- PR-B05 de `alumnos.integracion` (29.2 a 40.9).

Mis archivos de la ronda 2 no se cruzaron: `enlaces-ch-r2` corrió de 71.4 a 78.4 y `guarda-ch-r2` no toca la base.

Lectura: es R-1 materializado. Con `NOWAIT`, el caso solo obtiene el bloqueo en un instante en que nadie tiene ninguna fila de `usuarios` retenida. Si varias retenciones de 5 a 6.5 s se encadenan durante 30 s, no lo obtiene. La probabilidad depende de qué archivos coincidan.
- Las 9 corridas del programador y del manager ya incluían los archivos de mi ronda 1 y no fallaron: máximo 12.2 s.
- Las mías de la ronda 1 tampoco (máximo 8.6 s). En las corridas 2 y 3 de esta ronda tardó 4.6 y 1.0 s.

Esperado: PR-CH-01b y R-1 piden que el presupuesto no se agote en ninguna de las 11 corridas. El remedio es del arquitecto, no mío.

Requisito o regla violada: plan §D-1 (R-1), PR-CH-01b y PR-CH-02; PA-12.

#### T-05 — PA-12: PR-B05 eligió `usuarios_rol_idx` (corrida 2)
Severidad: media
Prueba: `backend/test/alumnos.integracion.test.ts`, "PR-B05: con SET LOCAL enable_seqscan = off, EXPLAIN de la consulta con la forma de Prisma menciona usuarios_nombre_busqueda_idx", en la corrida 2. Es una prueba normal: no la toco.

Obtenido: `failed, 4916.4 ms`. El plan elegido fue `Index Scan` sobre **`usuarios_rol_idx`** con `"Plan Rows":4`, `Total Cost 1874.54` y `Filter: (activo AND (nombre_busqueda ~~ '%jose%'::text))`. Esperaba `usuarios_nombre_busqueda_idx`.
- Verde en las corridas 1 y 3 (2.8 y 4.6 s), en las 3 de la ronda 1 y en las 9 del programador y del manager.

Contexto: `alumnos.integracion` corrió de 23.5 a 39.6, en paralelo con `servicio-ocupado`, `servicio-ocupado-ch-r1`, `cuentas-r3`, `cuentas-03a-r1` y `cuentas-r1`. `enlaces-ch-r2` (mío) no se cruzó: corrió de 46.8 a 54.6.

Hipótesis, sin verificar porque PA-12 me detuvo: el estimador vio pocas filas (`Plan Rows 4`) aunque el caso insertó 40,000 y corrió `ANALYZE` dentro de su transacción. `vac_update_relstats` escribe `reltuples` y `relpages` en `pg_class` en el sitio (fuera de la transacción). Un auto-`ANALYZE` de `usuarios` lanzado por otro proceso, en mitad del caso, puede dejar la estadística sin esas filas, que aún no están confirmadas. Es la determinación que costó dos rondas en M-07 (CLASES-b).

Esperado: PR-CH-02 pide PR-B05 en verde en todas las corridas de verificación.

Requisito o regla violada: plan §D-2 y PR-CH-02; PA-12.

### Observaciones (sin hallazgo)
- **O-4. `setReplySerializer` en un plugin:** el `401` sigue siendo `401` y el handler no corre (verde en las 3 corridas). No comprobé el cuerpo: la prueba solo afirma el estado.
- **O-5. Las variantes de `setNotFoundHandler` y `setErrorHandler` de §E3-1 que ataqué no arrancan** (verdes en las 3 corridas): un plugin anidado en tres niveles con prefijo `/api/clases`, `fastify-plugin` dentro de un plugin con prefijo, `setErrorHandler` en un plugin con una ruta protegida, `decorate("setNotFoundHandler")` y la reasignación del método.
  - Redefinir la propiedad en un hijo con `Object.defineProperty` crea una propiedad propia, pero no recupera el manejador original: la petición no entrega el contenido ni ejecuta el handler.
  - Llamar `setNotFoundHandler` dentro de `hijo.after(() => …)` deja una excepción sin manejar y `ready()` cae a los 10 s (`pluginTimeout`). La API no arranca, pero el error no sale como motivo de la guarda. Quité ese caso porque la excepción sin manejar tumba la corrida de Vitest.
  - Queda el camino por símbolos internos (`app[Symbol(fastify.404)]`), aceptado en "Pendientes".
- **O-6. O-2 cerrado:** `//api//*`, `/api///:seccion/*`, `////*` y `//:seccion/clases/:claseId/x`, con `protegido({ pertenencia })`, no arrancan por el motivo del comodín.
- **O-7. El 404 global y el envoltorio de la raíz siguen intactos.** No los ataqué aparte: los cubre PR-CH-09d, verde en las 3 corridas. En `guarda-ch-r2`, el `401` de la cadena sigue saliendo con el cuerpo `{"error":{"codigo","mensaje"}}` en los casos sin hooks.

### M-08 (opción (i), A-8 (i)), con cifras
`backend/test/enlaces-ch-r2.ataque.test.ts`, 3 casos. Verdes aislados (3 veces) y en las 3 corridas completas. La medición viaja en `task.meta.medicion` del reporte JSON.

**1. Otras rutas durante la ráfaga de 40 registros simultáneos del mismo enlace.** A los 300 ms de empezar, un `POST /api/auth/login` de otra cuenta y un `GET /api/me` con token.

| Dónde | Duración de la ráfaga | Registros | Login: desenlace y latencia | `GET /api/me`: desenlace y latencia |
|---|---|---|---|---|
| Aislado 1 | 674 ms | 40 × 2xx | 2xx, 311 ms | 2xx, 217 ms |
| Aislado 2 | 657 ms | 40 × 2xx | 2xx, 287 ms | 2xx, 189 ms |
| Aislado 3 | 640 ms | 40 × 2xx | 2xx, 268 ms | 2xx, 178 ms |
| Corrida 1 | 2026 ms | 40 × 2xx | 2xx, 914 ms | 2xx, 741 ms |
| Corrida 2 | 2357 ms | 40 × 2xx | 2xx, 904 ms | 2xx, 135 ms |
| Corrida 3 | 2331 ms | 40 × 2xx | 2xx, 1134 ms | 2xx, 298 ms |

Nunca hubo `500` ni `503` en estas mediciones. Con la suite completa, el login de otra cuenta tardó hasta 1.13 s, a 0.87 s del `maxWait` de 2 s de su transacción (`crearSesion`). Es el riesgo (b) que va a DEPLOY: el margen es estrecho.

**2. Los 10 s solo valen para el enlace.** Con las 10 conexiones del pool ocupadas 3.5 s:

| Dónde | `POST /api/auth/registro` (2 s por defecto) | `POST /api/auth/registro-maestro` (10 s) | `POST /api/admin/enlaces-registro/:id/revocar` (10 s) |
|---|---|---|---|
| Aislado 1 a 3 | 503 `SERVICIO_OCUPADO` en 2035, 2035 y 2032 ms | 201 en 3542, 3549 y 3553 ms | 200 en 3518, 3524 y 3525 ms |
| Corridas 1 a 3 | 503 `SERVICIO_OCUPADO` en 2111, 2112 y 2099 ms | 201 en 3691, 3703 y 3647 ms | 200 en 3641, 3632 y 3631 ms |

Revisión estática: `maxWait` solo aparece en `adapters/db/cliente.ts` (el parámetro) y en las dos llamadas de `adapters/db/enlaces-registro.ts` (líneas 128 y 204). Ninguna otra transacción de `backend/src` lo pasa.

**3. Revocación en medio de la ráfaga:** 20 registros, la revocación a los 150 ms y otros 20 registros.
- La revocación responde `200` (nunca `500`).
- Los demás responden solo `201` o `400`.
- Ninguna cuenta tiene `creado_en` posterior a `revocado_en`, y el número de cuentas es igual al de `201`.
- Verde aislado y en las 3 corridas (de 446 a 472 ms aislado).

**Caso de los 40 de `enlaces-03b-r2`** (PR-CH-10c), en verde en las 3: 1972.5, 2349.1 y 2568.8 ms. **0 `P2028` de `maxWait`** ("Unable to start a transaction") en las 3 salidas completas.
- `POST /api/auth/registro-maestro` en toda la corrida (`responseTime` del log, sin mis peticiones porque mi app registra en nivel `error`), mediana / p90 / máximo:
  - corrida 1: 523 / 1679 / 1951 ms;
  - corrida 2: 618 / 1917 / 2330 ms;
  - corrida 3: 410 / 2101 / 2525 ms.
- Ningún `5xx` en esas peticiones. Ya hay registros de más de 2 s que con el `maxWait` anterior habrían sido candidatos a `503`.

### Corridas completas del backend (3 seguidas, nunca dos a la vez)
- **Comando:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/chore02-tester-r2-N.json > <scratchpad>/chore02-tester-r2-N.txt 2>&1`, con N = 1, 2 y 3, en un solo ciclo, una tras otra.
- **Últimas líneas literales:**
  - Corrida 1: `Test Files  2 failed | 129 passed (131)` · `Tests  5 failed | 1447 passed (1452)` · `Duration  89.79s (transform 9.98s, setup 4.87s, import 164.67s, tests 665.35s, environment 42ms)`
  - Corrida 2: `Test Files  2 failed | 129 passed (131)` · `Tests  5 failed | 1447 passed (1452)` · `Duration  95.33s (transform 10.63s, setup 5.07s, import 177.43s, tests 711.42s, environment 54ms)`
  - Corrida 3: `Test Files  1 failed | 130 passed (131)` · `Tests  4 failed | 1448 passed (1452)` · `Duration  98.68s (transform 11.48s, setup 5.26s, import 180.67s, tests 733.09s, environment 59ms)`
- **Rojos:**
  - en las tres, los 4 casos de T-02 y T-03 (`guarda-ch-r2`, de 8 a 33 ms cada uno);
  - en la corrida 1, además, el caso de C-1 (T-04);
  - en la corrida 2, además, PR-B05 (T-05).
  
  Ningún `timed out` en ninguna.
- **En verde en las tres:** `ritmo-03c-r1` (6/6, de 256 a 1072 ms), `enlaces-03b-r2` completo, A3 de `bloqueo-usuario` (647, 1013 y 573 ms), `guarda-ch-r1` (los dos de T-01, ya corregido) y todos mis casos de la ronda 1.

| Corrida | Caso de C-1 | PR-B05 | Caso de los 40 (`enlaces-03b-r2`) |
|---|---|---|---|
| 1 | **30136.6 ms, rojo** (T-04) | 2826.6 ms | 1972.5 ms |
| 2 | 4623.5 ms | **4916.4 ms, rojo** (T-05) | 2349.1 ms |
| 3 | 1018.8 ms | 4646.4 ms | 2568.8 ms |

**PA-07** (conteo con `grep` por línea; cada línea se atribuye a la última "incoming request" con el mismo `pid` + `requestId` que aparece antes en la salida). Ojo: los `requestId` se repiten entre apps del mismo proceso, y un mapa global los atribuía mal. Lo corregí y repasé las tres corridas así.

| Término | Corrida 1 | Corrida 2 | Corrida 3 |
|---|---|---|---|
| `40P01` | 0 | 0 | 0 |
| `deadlock detected` | 0 | 0 | 0 |
| `could not serialize` | 0 | 0 | 0 |
| `too many clients` | 0 | 0 | 0 |
| `"Error no controlado"` | 10 | 10 | 10 |
| `"code":"P2028"` | 5 | 5 | 5 |
| `Unable to start a transaction` (`maxWait`) | 0 | 0 | 0 |

- **(a)** no se activa.
- **(b)** las 10 líneas son, en las tres corridas, exactamente I-1:
  - 5 × `POST /api/auth/login` "fallo simulado de la base en la búsqueda" y 1 × "… al crear la sesión";
  - `POST /api/clases/:id/archivos`, `POST /api/clases/:id/archivos/:id/descarga` y `GET /api/clases/:id/publicaciones` (`ZodError`);
  - `GET /api/prueba/error-comun` "boom".
- **(c)** los 5 `P2028` son, en las tres corridas, exactamente los permitidos, todos de `timeout` y en nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:id/publicaciones/:id/comentarios` › `prisma.$queryRawUnsafe()`;
  - `POST /api/auth/login` › `tx.sesion.create()`;
  - `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Control positivo** (04d, 04e, 04f) presente en las tres.
- **Regla transitoria de M-08:** 0 `P2028` de `maxWait` en `registro-maestro`. Ya no aplica: con (i), uno así activaría (c).
- **PA-07 limpia en las tres.** Los `P2028` y `503` que provocan a propósito `servicio-ocupado-ch-r1` y `enlaces-ch-r2` no salen, porque sus apps registran en nivel `error`.

**PA-12 se activó** (T-04 en la corrida 1 y T-05 en la corrida 2). Hice las tres corridas en un mismo ciclo y vi los rojos al analizarlas. No repetí ninguna ni hice diagnósticos aparte: me detuve después del análisis de las salidas que ya tenía.

**Cuenta de PR-CH-01b:** ninguna de mis 3 corridas está limpia, por los rojos de T-02 y T-03, que son ataques nuevos. Sin contarlos, la corrida 3 sería la única limpia de las tres. La serie del código actual queda en 9 corridas limpias (programador y manager) más 2 corridas con rojos intermitentes de pruebas ajenas a mis archivos de esta ronda.

### Atacado sin hallazgos
- **§E3-1, `setNotFoundHandler` y `setErrorHandler`:** O-5 (11 casos verdes de `guarda-ch-r2`, sin contar los 4 rojos).
- **O-2 y sus variantes:** O-6.
- **M-08 (i):** los 3 casos de `enlaces-ch-r2`. Nunca hubo `500`; el `maxWait` de 10 s solo vale para las dos transacciones del enlace; la revocación bajo contención responde `200`.
- **Regresión:** las 112 `*.ataque` de la ronda 1 en verde en las tres corridas, salvo el caso de C-1 en la corrida 1 (T-04). V-01 sin cambios.

### No atacado y por qué
- **`setNotFoundHandler` por las opciones de una ruta** (sugerido en la Enmienda 3): Fastify no tiene esa opción. Su equivalente por ruta es `errorHandler`, que es T-02.
- **`onRequest` en las opciones de `register`:** `register` no acepta hooks en sus opciones. `onRequest` como hook de ruta ya lo rechaza la guarda (T-12, CLASES-a).
- **El camino por símbolos internos de Fastify:** aceptado en "Pendientes" del plan.
- **El diagnóstico de T-04 y T-05** (repetir con un sondeo de `pg_class.reltuples` o de autovacuum, o aislar los cruces de archivos): PA-12 me detuvo.
- **El frontend:** no cambió, y no se abrieron navegadores.

### Conteos
- `cd backend; npx vitest list --filesOnly | grep -c .` → **131** archivos (129 + 2 míos).
- `cd backend; npx vitest list | grep -c .` → **1452** casos (1434 + 18 míos: `guarda-ch-r2` 15 y `enlaces-ch-r2` 3).
- `*.ataque` del repositorio: 114 (112 + 2 nuevos).

### Archivos de esta ronda
- **Nuevos:** `backend/test/guarda-ch-r2.ataque.test.ts` y `backend/test/enlaces-ch-r2.ataque.test.ts`.
- Nada más del repositorio, salvo este reporte. Prettier solo se corrió sobre esos dos archivos, desde `backend/`.
- **En el scratchpad:** `p2028.mjs` (atribución de PA-07), las salidas `chore02-tester-r2-N.txt` y `.json`, `enl-r2-N.json` y `tabla-r2.md`.

### Tabla de SHA-256 de las 114 `*.ataque` al cierre de la ronda 2 de CHORE-02 (las 112 de la ronda 1 sin cambios y 2 nuevas, marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `85A9B9654F81079B1F318C8BFC940E688F3FB714062B34E8686CEB238AE1AED5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` (nuevo: ronda 2 de CHORE-02) |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |
| `99067619BBA1AE3BF6BA488E4D91F44F7ACABA46EAB974AF1FAF18167B437964` | `backend/test/guarda-ch-r2.ataque.test.ts` (nuevo: ronda 2 de CHORE-02) |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CHORE-02 — Paso 13c (A-9, A-13, A-14)
Fecha: 2026-10-03. Rama `feat/chore-02`. Autorizaciones A-9, A-13 y A-14 aprobadas por escrito por el humano (`aprobacion.md`, última sección); Enmienda 4 de `plan.md` (PR-CH-13a, PR-CH-11f y PR-CH-12f; paso 13c).

### Antes de cambiar
- **V-01:** las 114 `*.ataque` coinciden una por una con la tabla de la ronda 2 (`diff` vacío).
- Copié los tres archivos al scratchpad antes de tocarlos (`cuentas-r1-antes.ts`, `nombres-antes.ts` y `guarda-ch-r2-antes.ts`). Los diffs de abajo son contra esas copias, no contra `ee21252`.
- No cambió ningún otro archivo del repositorio, salvo este reporte.

### Cambios
**A-9 (PR-CH-13a): `backend/test/cuentas-r1.ataque.test.ts`**, caso "con la tabla usuarios bloqueada por otra transacción, recuperar responde igual y a tiempo". Tres líneas; nada más del archivo cambia.

| Línea | Antes | Después |
|---|---|---|
| 132 | `const presupuestoMs = 30_000` | `const presupuestoMs = 60_000` |
| 170 | ``…usuarios en 30 s (${String(intentos)} intentos)`` | ``…usuarios en 60 s (${String(intentos)} intentos)`` |
| 182 | `}, 45_000)` | `}, 75_000)` |

**A-13 (PR-CH-11f): `backend/test/nombres-guarda-r3.ataque.test.ts`**, `describe` "ataque (ronda 3): hooks anteriores a preHandler (T-12)". Antes había un solo `it.each` de 9 filas, "una ruta protegida con %s como %s arranca y sigue exigiendo token". Queda en dos:
- **Líneas 128-148 (nuevas):** un comentario que declara que esto **revierte la decisión T-12 de AUTH-01** ("los hooks posteriores sí se permiten") para `onSend`, `preSerialization` y `onError`, por T-02 de CHORE-02.
  - Le sigue un `it.each` de 5 filas: `onSend` como función y como arreglo, `preSerialization` como función y como arreglo, y `onError` como función.
  - Título: "una ruta protegida con %s como %s no arranca".
  - Usa el ayudante `arranca` del archivo (prefijo `/api`) y exige que el error contenga ``declara ${hook}, que puede rehacer la respuesta de protegido() (AGENTS.md, regla 2)``, el mensaje fijado en §E4-1.
- **Líneas 150 en adelante:** el `it.each` original queda solo con las filas permitidas (`onResponse` como función y como arreglo, `onTimeout` y `onRequestAbort`). El título y el cuerpo no cambian: siguen exigiendo que arranque y responda `401` sin token.
- **Conteo de casos del archivo:** igual. Las 9 filas se reparten en 5 + 4.
- `git diff --no-index --stat` contra la copia: `1 file changed, 19 insertions(+), 2 deletions(-)`.

**A-14 (PR-CH-12f): `backend/test/guarda-ch-r2.ataque.test.ts`**, `describe` "hooks y serializador de un plugin sobre el 401 de la cadena".

| Línea | Antes | Después |
|---|---|---|
| 222-224 (comentario) | "Fuera del alcance declarado de la guarda… se comprueba." | Remite a §E4-2 y A-14: la guarda bloquea `addHook` y `setReplySerializer`, así que el desenlace aceptable es `ACEPTABLE`; antes se exigía el `401` (T-03). |
| 225 (título) | "setReplySerializer en un plugin: el 401 sigue siendo 401 y el handler no corre" | "setReplySerializer en un plugin: o no arranca, o sin token responde el 401 del envoltorio, y el handler no corre" |
| 240 | `expect(resultado.startsWith("responde 401 "), resultado).toBe(true)` | `expect(resultado).toMatch(ACEPTABLE)` |
| 244 (título) | "addHook('onSend') en un plugin: el 401 sigue siendo 401 y el handler no corre" | "addHook('onSend') en un plugin: o no arranca, o sin token responde el 401 del envoltorio, y el handler no corre" |
| 262 | `expect(resultado.startsWith("responde 401 "), resultado).toBe(true)` | `expect(resultado).toMatch(ACEPTABLE)` |

- `expect(resultado).not.toContain("(handler ejecutado)")` se queda en los dos casos.
- `git diff --no-index --stat` contra la copia: `1 file changed, 7 insertions(+), 7 deletions(-)`.

**`git diff --stat` de los tres archivos.**
- Contra las copias previas al paso 13c:
  - `cuentas-r1.ataque.test.ts`: 3 inserciones y 3 borrados;
  - `nombres-guarda-r3.ataque.test.ts`: 19 inserciones y 2 borrados;
  - `guarda-ch-r2.ataque.test.ts`: 7 inserciones y 7 borrados.
- Contra `HEAD`, que suma lo de la ronda 0 (C-1): `git diff --stat -- backend/test/cuentas-r1.ataque.test.ts backend/test/nombres-guarda-r3.ataque.test.ts` da `cuentas-r1.ataque.test.ts | 61 +++++++++++++++++++++++----` y `nombres-guarda-r3.ataque.test.ts | 21 ++++++++-`; `2 files changed, 71 insertions(+), 11 deletions(-)`.
- `guarda-ch-r2.ataque.test.ts` no está rastreado (es nuevo de la ronda 2).

### Verificación acotada (sin la suite completa)
- **`cd backend; npm run lint`:** código 0. Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`. Antes de verificar corrí `prettier --write` sobre esos tres archivos.
- **`cd backend; npx vitest run test/cuentas-r1.ataque.test.ts test/nombres-guarda-r3.ataque.test.ts test/guarda-ch-r2.ataque.test.ts --reporter=verbose`**, con código 1. Últimas líneas:
  ```
   Test Files  2 failed | 1 passed (3)
        Tests  10 failed | 95 passed (105)
     Duration  45.37s (transform 1.27s, setup 134ms, import 3.33s, tests 5.67s, environment 0ms)
  ```
- **Los 10 rojos son los esperados hasta el paso 13d del programador:**
  - **5 de A-13** (`nombres-guarda-r3`): "una ruta protegida con onSend como función / onSend como arreglo / preSerialization como función / preSerialization como arreglo / onError como función no arranca" → `expected 'arranca' to contain 'declara <hook>, que puede rehacer la…'`.
  - **2 de A-14** (`guarda-ch-r2`):
    - "setReplySerializer en un plugin…" → `expected 'responde 401 {"secreto":"contenido de…' to match ACEPTABLE`. Esto confirma también lo que O-4 dejó sin comprobar: el serializador conserva el `401`, pero reemplaza el cuerpo.
    - "addHook('onSend') en un plugin…" → `expected 'responde 200 {"secreto"…' to match ACEPTABLE`.
  - **3 de PR-CH-11f que ya estaban en rojo**, sin cambios en el archivo (T-02): "…y errorHandler / onSend / preSerialization propio: o no arranca, o sin token responde el 401 del envoltorio".
- **Verde:** el caso de C-1 con presupuesto de 60 s (52 ms; aislado no hay contención) y el resto de los tres archivos (95 casos).

### Tabla de SHA-256 de las 114 `*.ataque` después del paso 13c (base de V-01 del programador y de la ronda 3; cambian 3, marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` (cambia: paso 13c, A-9/A-13/A-14) |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` (cambia: paso 13c, A-9/A-13/A-14) |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` (cambia: paso 13c, A-9/A-13/A-14) |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CHORE-02 — Ronda 3
Veredicto: **ROTO**, solo por **T-06** (severidad baja), que no exige cambiar código de producción. **Las 3 corridas completas salieron limpias**, sin ningún rojo: sumadas a las 9 del programador y del manager, son 12 seguidas sobre el código final y cumplen el criterio de 11 de PR-CH-01b.
Verificación propia (2026-10-03, rama `feat/chore-02`):
- lint: `cd backend; npm run lint` → código 0.
- test: 3 corridas completas seguidas, las tres `Test Files  132 passed (132)` · `Tests  1621 passed (1621)`.

### Comprobaciones previas
- **V-01:** las 114 `*.ataque` coinciden una por una con la tabla del paso 13c (`diff` vacío). Al cierre solo se suma la nueva de esta ronda.
- **PA-01 (no se activó):** perfil de red Public; la regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada.
- **Docker:** responde. Al terminar no quedó ningún contenedor de Testcontainers.
- Una sola suite a la vez; no corrí el frontend. No arranqué la API ni el worker. No abrí navegadores.

### Hallazgos

#### T-06 — PR-CH-12g, el único cierre de H-8 dentro de `backend/src`, no ve dos formas de obtener la fábrica de Fastify; con cualquiera de las dos, un método prestado salta la guarda
Severidad: baja

**Prueba:** no se puede automatizar sin tocar `backend/src`, porque la regla solo recorre ese código y la función que la evalúa no se exporta. Reproducción paso a paso, verificada en el scratchpad:
1. **Réplica literal de `usosDeLaFabricaDeFastify`** (`higiene-de-pruebas.integracion.test.ts:320-351`), en `<scratchpad>/regla-fastify.mjs`. Devuelve `[]` (no detectada), y `RUTAS_INTERNAS_DE_FASTIFY` tampoco la marca, para:
   - `import Fastify from "fastify/fastify.js"`: el paquete `fastify` 5.12.5 no tiene mapa `exports`, así que la ruta del archivo principal se puede importar;
   - `const f = createRequire(import.meta.url)("fastify")`: el mismo patrón que ya usa `guarda-de-rutas.ts` para `fastify/lib/head-route.js`;
   - `await import(\`fastify\`)`, con comillas invertidas;
   - `export { default as F } from "fastify"`.
2. **Efecto en ejecución.** Una prueba de Vitest **fuera del repositorio** (`<scratchpad>/medicion3/prestamo.medicion.ts`, con su configuración apuntando a `backend/`):
   - con una app con el orden de `app.ts`, un plugin con prefijo `/api` hace `fab().addHook.call(hijo, "onSend", reescribir)` y registra `GET /clases/:claseId/x` con `protegido({ pertenencia: "inscripcion" })`;
   - `fab` se obtiene de cada una de las dos fuentes no detectadas;
   - con las dos, la app **arranca** y `GET /api/clases/<uuid>/x` sin token responde **`200 {"secreto":1}`** (resultado en `<scratchpad>/prestamo-resultado.json`).

**Esperado / Obtenido:**
- Esperado (§E4-2, H-8 y PR-CH-12g): en `backend/src`, la fábrica de Fastify solo aparece en `app.ts`, por cualquier vía. Es lo único que impide el préstamo de métodos dentro del código propio.
- Obtenido: dos vías plausibles y dos menos plausibles quedan fuera de la regla. Hoy ningún archivo de `backend/src` usa ninguna (la regla pasa).

**Por qué es baja:** exige escribir esa importación en `backend/src` y luego el préstamo, igual que las formas de O-1. Pero `createRequire(import.meta.url)("…")` ya es un patrón del propio repositorio, y H-8 no tiene otro cierre.

**El remedio es solo de pruebas** (la regla de `higiene-de-pruebas`), no de producción. Lo decide el manager.

Requisito o regla violada: plan, §E4-2 (H-8) y PR-CH-12g; `AGENTS.md`, regla 2.

### Observaciones (sin hallazgo)
- **O-8. `register` con opciones como función.** Fastify resuelve la función en avvio (`avvio/lib/plugin.js:79`) **después** de `override` (`fastify/lib/plugin-override.js`). Por eso ni `prefix` ni `logSerializers` de esas opciones se aplican, y el `onRegister` de la guarda tampoco los ve.
  - Es inofensivo: el caso "opciones como función: Fastify no aplica sus logSerializers…" comprueba que el serializador no corre.
  - El control "sin la guarda, logSerializers en las opciones de register sí corre con la petición" demuestra que el método de medición detecta cuando sí corre.
- **O-9. H-10, límite documentado:** no lo ataqué (servidor HTTP de Node, socket, símbolos privados). El préstamo de T-06 no es H-10: usa solo la API pública de Fastify.
- **O-10. Riesgo (b) de M-08**, a DEPLOY: en la corrida 3, el login de otra cuenta durante la ráfaga de 40 tardó **1588 ms** y el registro de alumno con el pool ocupado respondió 503 a los 2454 ms. Sigue en 2xx, pero cerca del `maxWait` de 2 s.

### Atacado sin hallazgos (`backend/test/guarda-ch-r3.ataque.test.ts`, 74 casos, verdes aislados y en las 3 corridas)
- **`addHook` de los 8 nombres bloqueados** (`onRequest`, `preParsing`, `preValidation`, `preHandler`, `preSerialization`, `onSend`, `onError`, `onRoute`), en un plugin encapsulado, uno anidado en tres niveles y uno con `fastify-plugin` (24 casos): ninguno arranca ni ejecuta el handler.
  - El nombre como `new String("onSend")` o como objeto con `toString` tampoco se cuela: Fastify lo rechaza.
- **Los 9 métodos bloqueados** (`setReplySerializer`, `setSerializerCompiler`, `setValidatorCompiler`, `setSchemaController`, `setSchemaErrorFormatter`, `setGenReqId`, `setChildLoggerFactory`, `addContentTypeParser` y `addConstraintStrategy`), encapsulados y con `fastify-plugin` (18 casos): no arrancan, con el mensaje "La instancia llama a <método> después de registrarMiddleware".
- **`register` con `logSerializers`**, con las opciones como objeto y anidado: no arranca, con el mensaje de la guarda. Como función: O-8.
- **Opciones de ruta de la lista cerrada** (12 casos): no arrancan, cada una con su motivo:
  - `onError` como función y como arreglo, `errorHandler` y `onSend`: "puede rehacer la respuesta de protegido()";
  - `schema` (`params`, `response` y un `{}` vacío), `validatorCompiler`, `serializerCompiler` y `schemaErrorFormatter`: "valida o serializa fuera de protegido()";
  - `childLoggerFactory` y `logSerializers`: "corre con la petición antes de protegido()".
- **Opciones permitidas** (6 casos): arrancan y responden el 401 del envoltorio. Son `onSend: []`, `onError: []`, `onResponse`, `onTimeout`, `onRequestAbort`, y `config` con `logLevel` y `bodyLimit`.
- **Copia congelada (H-3):**
  - vaciar después el arreglo de `protegido()` y meterle un hook que responde 200 no cambia la ruta (401);
  - meter un `onSend` en un arreglo `onResponse` conservado tampoco;
  - un `preHandler` que es un `Proxy` de la cadena y devuelve otra cosa en la segunda lectura no se cuela: la guarda lo copia en el `onRoute` y Fastify lee la copia.
- **HEAD:**
  - el `HEAD` automático de una ruta protegida responde 401 sin ejecutar el handler;
  - `exposeHeadRoute: true` con `onSend` propio no arranca;
  - un `HEAD` explícito con la cadena y `onSend` propio no arranca.
- **Lo permitido sigue funcionando:** los 8 hooks permitidos (`onResponse`, `onTimeout`, `onRequestAbort`, `onReady`, `onListen`, `preClose`, `onClose` y `onRegister`), agregados en un plugin, arrancan; corren `onRegister`, `onReady` y `onResponse`, y la ruta sigue en 401. `construirApp` real:
  - arranca;
  - `GET /api/no-existe-<uuid>` da 404 `NO_ENCONTRADO`;
  - `GET /api/me` da 401 con el formato de la API;
  - `HEAD /api/me` da 401 con el cuerpo vacío.
- **Revisión estática de Fastify 5.12.5:**
  - `findRoute` no expone el contexto de la ruta (`lib/route.js:180-198` solo devuelve `handler`, `params` y `searchParams`), así que un `onReady` permitido no puede reescribir el `errorHandler` ni los hooks de una ruta ya revisada;
  - `route()` copia las opciones al entrar (`:207`), así que las propiedades heredadas o no enumerables de las opciones no llegan a la ruta.
- **Regresión de T-04 y T-05** (abajo): el caso de C-1 con 60 s y PR-B05 sobre la tabla temporal salieron en verde en las 3 corridas.
- **M-08 (i) y otras rutas durante la ráfaga** (`enlaces-ch-r2`, verde en las 3):

  | Corrida | Duración de la ráfaga | Registros | Login de otra cuenta | `GET /api/me` | Pool ocupado 3.5 s: alumno / maestro / revocar |
  |---|---|---|---|---|---|
  | 1 | 1413 ms | 40 × 2xx | 2xx, 807 ms | 2xx, 700 ms | 503 en 2070 ms / 201 en 3579 ms / 200 en 3533 ms |
  | 2 | 1566 ms | 40 × 2xx | 2xx, 1138 ms | 2xx, 1038 ms | 503 en 2097 ms / 201 en 3605 ms / 200 en 3549 ms |
  | 3 | 2715 ms | 40 × 2xx | 2xx, 1588 ms | 2xx, 340 ms | 503 en 2454 ms / 201 en 3697 ms / 200 en 3621 ms |

### Corridas completas del backend (3 seguidas, nunca dos a la vez)
- **Comando:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/chore02-tester-r3-N.json > <scratchpad>/chore02-tester-r3-N.txt 2>&1`, con N = 1, 2 y 3, en un solo ciclo, una tras otra. Antes corrí la de `guarda-ch-r3` aislada y `npm run lint` (código 0).
- **Últimas líneas literales:**
  - Corrida 1: `Test Files  132 passed (132)` · `Tests  1621 passed (1621)` · `Duration  89.75s (transform 11.77s, setup 5.03s, import 164.11s, tests 667.65s, environment 48ms)`
  - Corrida 2: `Test Files  132 passed (132)` · `Tests  1621 passed (1621)` · `Duration  95.88s (transform 30.32s, setup 7.49s, import 199.46s, tests 624.15s, environment 53ms)`
  - Corrida 3: `Test Files  132 passed (132)` · `Tests  1621 passed (1621)` · `Duration  184.24s (transform 52.59s, setup 11.70s, import 427.77s, tests 1308.26s, environment 75ms)`. El equipo estaba más cargado en esta: la duración casi se duplicó sin que yo corriera otra cosa. Aun así, ningún rojo.
- **Rojos:** ninguno en las tres. 0 `timed out`. PA-12 no se activó.

| Corrida | Caso de C-1 (60 s; PR-CH-13c reporta si pasa de 40 s) | PR-B05 (tabla temporal) | Caso de los 40 | A3 |
|---|---|---|---|---|
| 1 | 6603.8 ms | 855.8 ms | 1909.8 ms | 922.2 ms |
| 2 | 77.6 ms | 801.8 ms | 1342.4 ms | 649.3 ms |
| 3 | 585.4 ms | 1165.4 ms | 1832.0 ms | 901.5 ms |

El caso de C-1 nunca pasó de 40 s.

**PA-07** (con la atribución por la última "incoming request" con el mismo `pid` + `requestId`, como en la ronda 2):

| Término | Corrida 1 | Corrida 2 | Corrida 3 |
|---|---|---|---|
| `40P01` | 0 | 0 | 0 |
| `deadlock detected` | 0 | 0 | 0 |
| `could not serialize` | 0 | 0 | 0 |
| `too many clients` | 0 | 0 | 0 |
| `"Error no controlado"` | 10 | 10 | 10 |
| `"code":"P2028"` | 5 | 5 | 5 |
| `Unable to start a transaction` (`maxWait`) | 0 | 0 | 0 |

- **(a)** no se activa.
- **(b)** las 10 líneas son exactamente I-1, en las tres corridas.
- **(c)** los 5 `P2028` son los permitidos, todos de `timeout` y en nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:id/publicaciones/:id/comentarios` › `prisma.$queryRawUnsafe()`;
  - `POST /api/auth/login` › `tx.sesion.create()`;
  - `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Control positivo** de `servicio-ocupado` (04d, 04e y 04f) presente en las tres. **PA-07 limpia en las tres.**

**PR-CH-01b:** 3 corridas limpias. Con las 9 del programador y del manager, **12 seguidas sobre el código final**: el criterio de 11 se cumple.

### No atacado y por qué
- **H-10** (servidor HTTP de Node, socket, símbolos privados): límite aceptado (§E4-4).
- **El préstamo de métodos dentro de `backend/src`, en una prueba del repositorio:** exige escribir en `backend/src`. Va como reproducción fuera del repositorio (T-06).
- **El frontend:** no cambió, y no se abrieron navegadores.

### Conteos
- `cd backend; npx vitest list --filesOnly | grep -c .` → **132** archivos (131 del resumen del programador + 1 mío).
- `cd backend; npx vitest list | grep -c .` → **1621** casos (1547 del resumen del programador + 74 de `guarda-ch-r3`).
- `*.ataque` del repositorio: 115 (114 + 1 nuevo).

### Archivos de esta ronda
- **Nuevo:** `backend/test/guarda-ch-r3.ataque.test.ts`.
- Nada más del repositorio, salvo este reporte. Prettier solo se corrió sobre ese archivo, desde `backend/`.
- **Fuera del repositorio**, en el scratchpad: `regla-fastify.mjs`, `medicion3/` (la prueba del préstamo y su configuración), `prestamo-resultado.json`, `p2028.mjs`, las salidas `chore02-tester-r3-N.*` y `tabla-r3.md`.

### Tabla de SHA-256 de las 115 `*.ataque` al cierre de la ronda 3 de CHORE-02 (las 114 del paso 13c sin cambios y 1 nueva, marcada; base de V-01 del siguiente encargo)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` (nuevo: ronda 3 de CHORE-02) |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CHORE-02 — Ronda 4 (cerrada, T-06)
Veredicto: **ROTO**, por **T-07** (severidad baja), que no exige cambiar código de producción.
- Las cuatro vías de T-06 quedan cubiertas.
- La regla endurecida tiene tres formas no cubiertas por texto, todas automatizables con una regla estática razonable.
- La corrida completa salió limpia.

Fecha: 2026-10-03. Rama `feat/chore-02`. Acotada a T-06, como pidió el orquestador: no abrí ataques nuevos fuera de PR-CH-12g.

### Comprobaciones previas
- **V-01:** las 115 `*.ataque` coinciden una por una con la tabla de la ronda 3, al empezar y al terminar. No agregué ni cambié ningún archivo del repositorio, salvo este reporte.
- **Docker:** responde. Al terminar no quedó ningún contenedor de Testcontainers.
- Una sola suite a la vez; no corrí el frontend. No arranqué la API ni el worker. No abrí navegadores.

### Qué probé
**1. Réplica literal de `referenciasAFastify`** (la regla endurecida de `higiene-de-pruebas.integracion.test.ts`), en `<scratchpad>/regla-fastify-r4.mjs`.

| Texto | Referencias que encuentra | ¿Cubierto? |
|---|---|---|
| `import Fastify from "fastify/fastify.js"` (T-06) | `"fastify/fastify.js"` | Sí |
| `createRequire(import.meta.url)("fastify")` (T-06) | `"fastify"` | Sí |
| ``await import(`fastify`)`` (T-06) | `` `fastify` `` | Sí |
| `export { default as F } from "fastify"` (T-06) | `"fastify"` | Sí |
| `import { fastify } from "fastify"` | `"fastify"` | Sí |
| `import fastify, { type FastifyInstance } from "fastify"` | `"fastify"` | Sí |
| `import type, { type FastifyInstance } from "fastify"` | `"fastify"` | Sí |
| `import { "default" as F } from "fastify"` | `"fastify"` | Sí |
| `import.meta.resolve("fastify")` y `require.resolve("fastify")` | `"fastify"` | Sí: todo literal `"fastify"` cuenta |
| `import(` con saltos de línea, un comentario de bloque delante | `"fastify"` | Sí |
| **`import type from "fastify"`** (también con un salto de línea antes de `from`) | **ninguna** | **No (T-07 a)** |
| **`import Fastify from "../../node_modules/fastify/fastify.js"`** o `"file:///…/node_modules/fastify/fastify.js"` | **ninguna** | **No (T-07 c)** |
| `import { type default as F } from "fastify"` | ninguna | No hace falta: TS lo trata como solo de tipos y lo elimina al compilar |
| `import Fastify from "FASTIFY"` | ninguna | O-11 |
| `const m = "fast" + "ify"; await import(m)` y ``import(`fast${""}ify`)`` | ninguna | O-12 (límite) |

**2. Recorrido de la regla:** `archivosDe("src", …)` solo toma archivos que terminan en **`.ts`**. Un `.mts` o un `.cts` dentro de `backend/src` no se revisa (T-07 b).

**3. Comprobación en una copia fuera del repositorio** (`<scratchpad>/n07`): `package.json`, `tsconfig.json` de `backend` y `tsconfig.base.json`, con `node_modules` enlazado por unión de directorio y retirado al terminar.
- `src/a.ts`: `import type from "fastify"`, luego `const app = type()` y `app.addHook("onSend", …)`.
- `src/b.mts`: `import Fastify from "fastify"`, luego `Fastify()`.
- `npx tsc -p tsconfig.json --noEmit` da **código 0**: TypeScript acepta las dos.
- `tsc -p tsconfig.json --outDir …` las emite (`a.js` y `b.mjs`). `a.js` conserva `import type from "fastify"`, que en JavaScript es una importación por defecto con el nombre `type`.
- En ejecución (Vitest fuera del repositorio, `<scratchpad>/t07/tipo.medicion.ts`), `typeof type === "function"` y `type().addHook` existe: **es la fábrica**.
- Con la fábrica, el préstamo de `addHook("onSend")` sobre la instancia de un plugin deja la ruta en `200` sin token. Lo demostré en la ronda 3 (`prestamo-resultado.json`), y la especificación por ruta absoluta a `node_modules/fastify/fastify.js` de esa prueba es la misma forma de T-07 c.

### Hallazgos
#### T-07 — PR-CH-12g endurecida no ve tres formas de obtener la fábrica de Fastify
Severidad: baja
Prueba: no se puede automatizar sin escribir en `backend/src`. Va como reproducción (arriba): la réplica literal, la copia con `tsc` y la ejecución en Vitest fuera del repositorio.

Esperado / Obtenido:
- **(a) `import type from "fastify"`.** Parece una importación de tipos, pero TypeScript la analiza como una importación por defecto **con valor**, con el nombre `type` (con `verbatimModuleSyntax` también: `tsc` en 0 y el JavaScript emitido la conserva). `IMPORTACION_DE_TIPOS` (`\b(?:import|export)\s+type\s+[^"'\`;]*?\s*from\s+…`) la quita del texto como "tipos" y la regla no la ve.
  - Esperado: marcarla.
  - Obtenido: `[]`.
- **(b) Archivos `.mts` y `.cts` en `backend/src`.** `tsc` los incluye y los emite (`.mjs`/`.cjs`), y ESLint los cubre (`backend/src/**/*.{ts,mts,cts,js,mjs,cjs}`). Pero el recorrido de la regla solo toma `.ts`.
  - Esperado: revisar también esas extensiones.
  - Obtenido: no se leen.
- **(c) Una ruta al archivo del paquete** (`"../../node_modules/fastify/fastify.js"`, una ruta absoluta o `file://`). Resuelve al mismo módulo y no empieza por `fastify`.
  - Esperado: marcar todo especificador que apunte a `node_modules/fastify/`.
  - Obtenido: `[]`.

Hoy ningún archivo de `backend/src` usa ninguna de las tres: la regla pasa.

Por qué es baja: igual que T-06. Exige escribir esa importación en `backend/src` y luego el préstamo. La (a) es la más fácil de escribir sin intención, porque se lee como "solo tipos".

Requisito o regla violada: plan, §E4-2 (H-8) y PR-CH-12g (endurecida en la ronda 4); `AGENTS.md`, regla 2.

### Observaciones (sin hallazgo)
- **O-11. Mayúsculas en el especificador** (`"FASTIFY"`): en Windows (NTFS sin distinguir mayúsculas) `node_modules/FASTIFY` resuelve a `fastify`; en el Droplet (Linux) no. La regla distingue mayúsculas. No lo probé en ejecución. Se cubriría con la bandera `i`.
- **O-12. Propuesta de límite documentado:** el especificador armado en ejecución, por concatenación (`"fast" + "ify"`), con una plantilla con expresión o con una variable pasada a `import()`, `require()` o `createRequire(…)()`, no se puede cubrir con una regla de texto razonable. Propongo agregarlo al límite de §E4-4 (H-10) con esa redacción: "un especificador del paquete `fastify` armado en ejecución". Igual que con los símbolos privados, queda a la revisión de código.

### Regresión acotada
- **Archivos de la guarda:** `cd backend; npx vitest run test/higiene-de-pruebas.integracion.test.ts test/guarda-r2.ataque.test.ts test/guarda-ch-r1.ataque.test.ts test/guarda-ch-r2.ataque.test.ts test/guarda-ch-r3.ataque.test.ts test/nombres-guarda-r3.ataque.test.ts`, con código 0: `Test Files  6 passed (6)` · `Tests  183 passed (183)` · `Duration  16.75s (transform 4.73s, setup 508ms, import 15.97s, tests 8.35s, environment 2ms)`.
- **Una corrida completa:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/chore02-tester-r4-1.json > <scratchpad>/chore02-tester-r4-1.txt 2>&1`, con código 0. Últimas líneas:
  ```
   Test Files  132 passed (132)
        Tests  1621 passed (1621)
     Duration  180.47s (transform 25.29s, setup 8.95s, import 359.82s, tests 1303.37s, environment 95ms)
  ```
  - Ningún rojo; 0 `timed out`; PA-12 no se activó.
  - Con el equipo cargado (180 s, como la corrida 3 de la ronda 3).
  - Duraciones: caso de C-1 en 426.2 ms; PR-B05 en 1255.6 ms; caso de los 40 en 4689.7 ms (verde: 40 × 201); A3 en 1184.3 ms.
- **PA-07** sobre esa corrida:
  - `40P01`, `deadlock detected`, `could not serialize` y `too many clients`: 0, 0, 0 y 0.
  - `"Error no controlado"`: 10, exactamente I-1 (6 × `POST /api/auth/login`, los 3 `ZodError` de archivos y del muro, y `GET /api/prueba/error-comun`).
  - `"code":"P2028"`: 5, los permitidos, todos de `timeout`, en nivel 40: `cambiar-contrasena` › `tx.sesion.findFirst()`, `refrescar` › `tx.sesion.updateMany()`, comentarios › `prisma.$queryRawUnsafe()`, `login` › `tx.sesion.create()` y `restablecer` › `tx.tokenCuenta.updateMany()`.
  - `maxWait`: 0.
  - **Control positivo** (04d, 04e y 04f) presente. **PA-07 limpia.**

### Tabla de SHA-256
No agregué ni cambié ningún `*.ataque`. **Sigue vigente la tabla de las 115 `*.ataque` de la ronda 3** (sección "CHORE-02 — Ronda 3", al final), que es la base de V-01 del siguiente encargo. V-01 al terminar esta ronda: sin diferencias.

### Archivos
- En el repositorio: solo este reporte.
- Fuera, en el scratchpad: `regla-fastify-r4.mjs`, `t07/` (la prueba de `import type from` y su configuración), `n07/` (la copia para `tsc`, con la unión de directorio ya retirada), `r4-acotada.txt` y `chore02-tester-r4-1.*`.

## CHORE-02 — Ronda 5 (cerrada, T-07)
Veredicto: **ROTO**, por **T-08**: un rojo intermitente (PA-12) en la corrida completa, **ajeno a la regla estática y a T-07**. En lo que pedía esta ronda, la corrección **resiste**:
- T-07 (a), (b) y (c) y O-11 quedan cubiertos;
- las formas de tipos permitidas no abren hueco;
- en `backend/src` solo quedan marcados `app.ts` y la sonda de la guarda.

En la regla apareció un hueco más (O-13). Por la decisión del humano para esta ronda va como observación con destino, no como hallazgo.

Fecha: 2026-10-03. Rama `feat/chore-02`. Acotada a T-07 y O-11.

### Comprobaciones previas
- **V-01:** las 115 `*.ataque` coinciden una por una con la tabla de la ronda 3 (`diff` vacío). No agregué ni cambié ningún archivo del repositorio, salvo este reporte.
- **Docker:** responde. Al terminar no quedó ningún contenedor de Testcontainers.
- Una sola suite a la vez; no corrí el frontend. No arranqué la API ni el worker. No abrí navegadores.

### Qué probé
**Réplica literal** de `referenciasAFastify`, `IMPORTACION_DE_TIPOS` y `archivosDeCodigoEn` de la regla corregida (`<scratchpad>/regla-fastify-r5.mjs`).

| Texto | Referencias | Resultado |
|---|---|---|
| `import type from "fastify"` (T-07 a), también con `type\nfrom` | `"fastify"` | Marcado |
| `import type, { type FastifyInstance } from "fastify"` (T-07 a) | `"fastify"` | Marcado |
| `"../../node_modules/fastify/fastify.js"`, la misma con barras invertidas, `file:///C:/repo/node_modules/fastify/fastify.js`, `C:/repo/node_modules/fastify/fastify.js` y `/opt/app/fastify/lib/route.js` (T-07 c) | la ruta | Marcadas |
| `"FASTIFY"`, `"Fastify/fastify.js"` y `"../NODE_MODULES/FASTIFY/fastify.js"` (O-11) | el especificador | Marcados |
| `import type F from "FASTIFY"` (grafía distinta en una forma de tipos) | `"FASTIFY"` | Marcado |
| `Import type F from "fastify"` (mayúscula en `import`) | `"fastify"` | Marcado |
| `import type { X }, Fastify from "fastify"` | `"fastify"` | Marcado |
| `import { type FastifyInstance, default as F } from "fastify"` | `"fastify"` | Marcado |
| `import type { X } from "fastify"` y, en la misma línea, `import F from "fastify"` | `"fastify"` (el segundo) | Marcado |
| `import type { "}" as X } from "fastify"` (una llave dentro de una cadena) | `"fastify"` | Marcado (falso positivo inofensivo) |
| `import type F from "fastify"`, `import type * as F`, `import type { X }`, `export type { X } from`, `export type * as F from`, `declare module "fastify"` e `import { errorCodes }` | ninguna | Aceptadas. Son de solo tipos (con `verbatimModuleSyntax`, `tsc` las elimina) o permitidas por el plan |
| `@fastify/cookie`, `fastify-plugin`, `./fastify/otro.js` y `../lib/fastify.js` | ninguna | Aceptadas, como dice la corrección |

- **(T-07 b) Recorrido real de `backend/src`** con la réplica: 94 archivos de código (`.ts`, `.mts`, `.cts`, `.js`, `.mjs` y `.cjs`, sin pruebas ni `generated/`).
  - Solo quedan marcados `app.ts` (`"fastify"`) y `middleware/guarda-de-rutas.ts` (`"fastify/lib/head-route.js"`, la sonda).
  - El caso del archivo, "el recorrido lee .ts, .mts, .cts, .js, .mjs y .cjs, no las pruebas, y rechaza un .mts de ejemplo (T-07 b)", lo comprueba con un `.mts` de ejemplo.

### Observaciones (sin hallazgo)
- **O-13 (en la regla; por la decisión del humano, límite documentado).**
  - `sinLineasDeComentario` vacía toda línea que empieza con `//`, aunque esté dentro de una plantilla de texto. En `` const fab = `\n// ${(await import("fastify")).default}\n` ``, la expresión `${…}` es código real, pero su línea empieza con `//` y la regla no la ve (réplica: `[]`).
  - Es el mismo mecanismo que O-1: exige intención.
  - **Destino:** el texto T-6 ter, junto a O-12 (lo que una regla de texto no cubre), y el primer `chore` de pruebas, junto a O-1, si se quiere cerrar con el analizador de TypeScript en lugar de expresiones regulares.

### Hallazgos
#### T-08 — PA-12: los dos casos "control" de ESLint de `guarda-clase-r1` y `guarda-clase-r2` pasaron su tiempo límite de 15 s
Severidad: media (rojo intermitente; no es la regla estática ni T-07; sin cambio de producción).
Prueba (no es mía, de CLASES-a):
- `backend/test/guarda-clase-r1.ataque.test.ts` › "control: app.addHook(...) se rechaza" → `Error: Test timed out in 15000ms.` (`:104`); el archivo tardó 48.3 s.
- `backend/test/guarda-clase-r2.ataque.test.ts` › "control: app.addHook, app['addHook'] y app?.addHook se rechazan" → `Error: Test timed out in 15000ms.` (`:183`), 46653.8 ms en el JSON; el archivo tardó 48.5 s.

Contexto:
- Cada uno es el primer caso de su archivo que llama a ESLint con la configuración del repositorio, así que paga la carga en frío de ESLint y `typescript-eslint`. En la corrida corrieron en paralelo.
- Tardó mucho en mis corridas anteriores, y la tendencia sube con la carga del equipo. Duración del primer caso de `guarda-clase-r2` y duración de la suite:

  | Corrida | Primer caso de `guarda-clase-r2` | Suite |
  |---|---|---|
  | Ronda 1, corrida 1 | 3.9 s | 87 s |
  | Ronda 2, corrida 1 | 4.4 s | 90 s |
  | Ronda 3, corrida 1 | 4.2 s | 90 s |
  | Ronda 3, corrida 2 | 5.2 s | 96 s |
  | Ronda 3, corrida 3 | 10.1 s | 184 s |
  | Ronda 4 | 11.1 s | 181 s |
  | Esta ronda | **46.7 s, rojo** | 117 s |

- El equipo estaba muy cargado: `npx vitest run test/higiene-de-pruebas.integracion.test.ts` sola tardó **91.31 s** de reloj para 0.77 s de pruebas, y yo no corría nada más.
- Ninguno de los dos archivos ni `eslint.config.mjs` cambió en CHORE-02 (V-01; `eslint.config.mjs` está en "No se toca").

Esperado: PR-CH-01b y PA-12, ningún rojo intermitente en una corrida completa.

PA-12: no repetí la corrida. La reporto completa y me detengo. El remedio es del arquitecto: por ejemplo, el tiempo límite de esos casos, o calentar ESLint en un `beforeAll`. Es un `*.ataque` de CLASES-a y haría falta una autorización.

### Regresión acotada
- **Prueba de higiene:** `cd backend; npx vitest run test/higiene-de-pruebas.integracion.test.ts`, con código 0: `Test Files  1 passed (1)` · `Tests  14 passed (14)` · `Duration  91.31s (transform 203ms, setup 45ms, import 424ms, tests 770ms, environment 0ms)`.
- **Una corrida completa:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/chore02-tester-r5-1.json > <scratchpad>/chore02-tester-r5-1.txt 2>&1`, con código 1. Últimas líneas:
  ```
   Test Files  2 failed | 130 passed (132)
        Tests  2 failed | 1621 passed (1623)
     Duration  116.83s (transform 11.24s, setup 4.68s, import 172.66s, tests 751.04s, environment 48ms)
  ```
  - Los únicos rojos son los dos de T-08 (`timed out`: 2).
  - Duraciones: caso de C-1 en 9114.9 ms; PR-B05 en 438.6 ms; caso de los 40 en 1906.1 ms; A3 en 427.9 ms.
- **PA-07** sobre esa corrida:
  - `40P01`, `deadlock detected`, `could not serialize` y `too many clients`: 0, 0, 0 y 0.
  - `"Error no controlado"`: 10, exactamente I-1.
  - `"code":"P2028"`: 5, los permitidos, todos de `timeout`, en nivel 40 (`cambiar-contrasena`, `refrescar`, comentarios, `login` y `restablecer`).
  - `maxWait`: 0.
  - **Control positivo** (04d, 04e y 04f) presente. **PA-07 limpia**, aunque la corrida no cuenta como limpia para PR-CH-01b por T-08.

### Tabla de SHA-256
No agregué ni cambié ningún `*.ataque`. **Sigue vigente la tabla de las 115 `*.ataque` de la ronda 3** (sección "CHORE-02 — Ronda 3"), base de V-01 del siguiente encargo; V-01 sin diferencias.

### Archivos
- En el repositorio: solo este reporte.
- Fuera, en el scratchpad: `regla-fastify-r5.mjs`, `regla-r5-t08.mjs` (O-13), `r5-higiene.txt` y `chore02-tester-r5-1.*`.

## CHORE-02 — Ronda 6 (cerrada, T-08, A-15)
Veredicto: **RESISTE**. La corrida completa salió limpia: sin rojos, sin `timed out` y con PA-07 limpia y su control positivo.
Fecha: 2026-10-03. Rama `feat/chore-02`. Autorización A-15 del humano: "Sexta ronda cerrada: subir el límite de esos dos casos".

### Comprobaciones previas
- **V-01 al empezar:** las 115 `*.ataque` coinciden una por una con la tabla de la ronda 3.
- Copié los dos archivos al scratchpad antes de tocarlos (`gc-r1-antes.ts` y `gc-r2-antes.ts`). Los diffs de abajo son contra esas copias.
- **Docker:** responde. Al terminar no quedó ningún contenedor de Testcontainers. Una sola suite a la vez; no corrí el frontend. No arranqué la API ni el worker. No abrí navegadores.

### El cambio (A-15)
**Elegí subir el límite de los dos casos, no calentar ESLint en un `beforeAll`.**
- Cada llamada a `erroresDe` crea su propio `new ESLint(...)`, así que el costo en frío lo paga la primera llamada del archivo, que es justo ese caso. Con la suite liviana tarda de 4 a 11 s, y con carga llegó a 46.7 s (T-08).
- Un `beforeAll` cambiaría la estructura del archivo, que A-15 limita a esos dos casos.
- Lo que prueban los casos no cambia: misma entrada, misma aserción. Nada más de los archivos cambia.

| Archivo | Líneas (después) | Antes | Después |
|---|---|---|---|
| `backend/test/guarda-clase-r1.ataque.test.ts`, "control: app.addHook(...) se rechaza" | 104-105 (nuevas) | — | Comentario: `// A-15 (CHORE-02, ronda 6): primer caso del archivo que llama a ESLint; paga la carga en frío de` / `// ESLint y typescript-eslint, que con la suite cargada llegó a 46.7 s (T-08). Límite propio de 60 s.` |
| ídem | 109 | `  })` (límite global de 15 s) | `  }, 60_000)` |
| `backend/test/guarda-clase-r2.ataque.test.ts`, "control: app.addHook, app['addHook'] y app?.addHook se rechazan" | 183-184 (nuevas) | — | El mismo comentario |
| ídem | 197 | `  })` (límite global de 15 s) | `  }, 60_000)` |

- `git diff --no-index --stat` contra las copias: 3 inserciones y 1 borrado en cada archivo.

### Verificación
- **`cd backend; npm run lint`:** código 0.
- **`npx vitest run test/guarda-clase-r1.ataque.test.ts test/guarda-clase-r2.ataque.test.ts`**, con código 0: `Test Files  2 passed (2)` · `Tests  18 passed (18)` · `Duration  9.56s (transform 1.31s, setup 71ms, import 3.13s, tests 3.67s, environment 0ms)`.
- **Una corrida completa:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/chore02-tester-r6-1.json > <scratchpad>/chore02-tester-r6-1.txt 2>&1`, con código 0. Últimas líneas:
  ```
   Test Files  132 passed (132)
        Tests  1623 passed (1623)
     Duration  88.88s (transform 11.16s, setup 4.71s, import 165.79s, tests 662.07s, environment 38ms)
  ```
  - Ningún rojo; 0 `timed out`; PA-12 no se activó.

| Caso | Duración |
|---|---|
| `guarda-clase-r1` › "control: app.addHook(...) se rechaza" | 4365 ms (límite: 60 s) |
| `guarda-clase-r2` › "control: app.addHook, app['addHook'] y app?.addHook se rechazan" | 4374 ms (límite: 60 s) |
| Caso de C-1 (`cuentas-r1`, presupuesto de 60 s) | 10102.7 ms |
| PR-B05 (tabla temporal) | 919.9 ms |
| Caso de los 40 (`enlaces-03b-r2`) | 1688.7 ms |
| A3 (`bloqueo-usuario`) | 581.7 ms |

- **PA-07** (atribución por la última "incoming request" con el mismo `pid` + `requestId`):
  - `40P01`, `deadlock detected`, `could not serialize` y `too many clients`: 0, 0, 0 y 0.
  - `"Error no controlado"`: 10, exactamente I-1 (6 × `POST /api/auth/login`, los 3 `ZodError` de archivos y del muro, y `GET /api/prueba/error-comun`).
  - `"code":"P2028"`: 5, los permitidos, todos de `timeout`, en nivel 40: `cambiar-contrasena` › `tx.sesion.findFirst()`, `refrescar` › `tx.sesion.updateMany()`, comentarios › `prisma.$queryRawUnsafe()`, `login` › `tx.sesion.create()` y `restablecer` › `tx.tokenCuenta.updateMany()`.
  - `maxWait` ("Unable to start a transaction"): 0.
  - **Control positivo** (04d, 04e y 04f) presente. **PA-07 limpia.**

### Archivos
- En el repositorio: los dos `*.ataque` de A-15 y este reporte.
- En el scratchpad: las copias previas, `r6-acotada.txt`, `chore02-tester-r6-1.*` y `tabla-r6.md`.
- Prettier solo se corrió sobre esos dos archivos, desde `backend/`.

### Tabla de SHA-256 de las 115 `*.ataque` al cierre de la ronda 6 de CHORE-02 (base de V-01 del siguiente encargo; cambian 2, marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` (cambia: A-15, ronda 6 de CHORE-02) |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` (cambia: A-15, ronda 6 de CHORE-02) |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |
