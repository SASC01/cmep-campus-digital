# Reporte del Tester — N-19 · texto de `409 TAREA_CON_ENTREGAS` — Ronda 0

> Nota de transcripción (orquestador, 2026-10-26): el tester entregó este reporte como texto porque la herramienta le rechazó escribir el archivo ("Subagents should return findings as text, not write report files"). El orquestador lo transcribió tal cual, sin cambiar contenido (regla de respaldo "Transcripción con cotejo", `AGENTS.md`); la tabla de SHA-256 se copió del archivo `tabla.md` del scratchpad del tester. El SHA-256 del archivo resultante queda en `aprobacion.md`.

## Ronda 0
Veredicto: **RONDA 0 CERRADA**
Verificación propia: lint backend `0` (`tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) · lint frontend `0` (`tsc -b`) · test backend `Tests  3 failed | 2614 passed (2617)` en 216 archivos (los 3 rojos, los esperados) · test frontend `Tests  3318 passed (3318)` en 197 archivos

Carril trivial (decisión del humano, 2026-10-26). Ronda 0, la única del tester en este encargo: reescribir las `*.ataque` que fijan el texto viejo para que fijen el nuevo de `aprobacion.md`, antes de que el programador cambie el código. Solo toqué tres `*.ataque`. Este reporte lo entrega el tester como texto porque la herramienta rechazó escribir el archivo, y lo transcribe el orquestador (regla de respaldo de AGENTS.md). Sin código de producción, sin pruebas normales, sin otras `*.ataque`, sin navegadores, sin commit, sin procesos ajenos, sin `.env`. Docker Desktop encendido (`docker info` → `28.5.1`).

### V-01
- Comando: `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, normalizado (sin el `*` de modo binario, en minúsculas) y con `diff` contra la tabla "204 `*.ataque` al cierre de la ronda 4 cerrada de 01d" de `docs/trabajo/CALIFICACIONES-01-calificaciones-y-gradebook/reporte-tester.md`.
- Resultado, antes de tocar nada: **204 de 204 iguales**, ninguna de más ni de menos. Sin PARADA.

### Inventario por grep
Comandos (desde la raíz): `grep -rnE "Esta tarea tiene|1 entrega|entregas\. Si la borras|pídelo a administración|se borrarán la entrega|se borrarán las entregas|mensajeTareaConEntregas|no se puede borrar" backend/test backend/src frontend/src shared/src`; `grep -rlE "TAREA_CON_ENTREGAS"` en los mismos cuatro árboles, con revisión de cada aserción sobre `mensaje` en esos archivos; `grep -rnE "[0-9]+ entregas?\b|comentarios privados|deshacer"` para las formas débiles (`toContain`, regex); y el grep de los literales en `docs/` (fuera de `docs/trabajo/`).

| Lugar | Qué fija | Tipo | Quién |
|---|---|---|---|
| `backend/test/entregas-01b-r1.ataque.test.ts:921` | maestro, 2, literal completo (`toEqual`) | `*.ataque` | **Reescrita** (tester) |
| `backend/test/entregas-01b-r1.ataque.test.ts:943` | admin, 1, literal completo (`toEqual`) | `*.ataque` | **Reescrita** (tester) |
| `backend/test/calificaciones-01a-r2.ataque.test.ts:608` | maestro, 2 calificadas sin entrega, `toContain("2 entregas")` (la forma débil; es justo el caso de N-19) | `*.ataque` | **Reescrita** (tester) |
| `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx:36,38` | `MENSAJE_MAESTRO` y `MENSAJE_ADMIN` (2, plural): el cuerpo del doble del `409` y lo que la vista debe mostrar tal cual | `*.ataque` | **Reescrita** (tester), para que el doble coincida con el contrato; sigue en verde con cualquier texto |
| `backend/src/core/tareas/tareas.ts:49-58` | `mensajeTareaConEntregas` (el texto) | código | programador |
| `backend/src/core/tareas/tareas.test.ts:105,108,111,113` | `mensajeEsperado` de PR-1B27 (los cuatro textos) | prueba normal | programador (lista cerrada) |
| `backend/src/core/tareas/tareas.test.ts:159-176` | PR-1B27: seis `toBe` (admin 1, 2, 30; maestro 1, 2; estudiante 30) | prueba normal | programador (lista cerrada) |
| `backend/test/tareas-borrar-con-entregas.integracion.test.ts:228-235` | `MENSAJE_MAESTRO_1`, `mensajeMaestro(n)`, `MENSAJE_ADMIN_1`, `mensajeAdmin(n)` (los usan PR-1B22 a, b, c y los de las líneas 316, 365 y 366) | prueba normal | programador (lista cerrada) |
| `backend/test/entregas-concurrencia.integracion.test.ts:320-322` | maestro, 1, literal completo (`toBe`) | prueba normal | programador (lista cerrada) |
| `frontend/src/features/tareas/entregas-01e.test.tsx:34-37` | `MENSAJE_MAESTRO` y `MENSAJE_ADMIN` (2, plural), doble del `409` | prueba normal | programador (lista cerrada; en verde con o sin el cambio, va por coherencia con su hermana `*.ataque`) |

Revisados y **sin cambio**:
- `backend/test/tareas-borrar-con-entregas.integracion.test.ts:378` (`not.toMatch(/entrega|\b2\b/i)`): mira el cuerpo del `403 BORRADO_NO_PERMITIDO` del maestro ajeno, no el del `409`; el texto nuevo no le llega.
- Títulos de casos que dicen "1 entrega" o "2 entregas" (`tareas-borrar-con-entregas.integracion.test.ts:253,261,267`; los de `entregas-01b-r1.ataque` y `calificaciones-01a-r2.ataque`): describen el escenario, no fijan el texto.
- `calificaciones-concurrencia.integracion.test.ts:309` y `hilo-privado-concurrencia.integracion.test.ts:204`: solo el código `TAREA_CON_ENTREGAS`, no el mensaje.
- Frontend de producción (`acciones-de-la-tarea.tsx`, `data.ts`, `hooks.ts`, `lib.ts`) y `shared/src/tareas.ts:307`: solo el código; el mensaje viene del servidor y se muestra tal cual.
- Documentos: ningún literal del texto en `docs/` fuera de `docs/trabajo/`. `ARCHITECTURE-ESSENTIALS.md:116`, `ARCHITECTURE.md:235`, `DESIGN.md:720` y `backend/src/handlers/README.md:137` dicen "con el conteo", que sigue siendo cierto con el texto nuevo.

#### Lista cerrada para el programador (pruebas normales, cambio exacto)
Textos nuevos, literales de `aprobacion.md` (con `N` = el número):
- maestro (y estudiante), 1: `Esta tarea tiene 1 alumno con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.`
- maestro (y estudiante), N: `Esta tarea tiene N alumnos con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.`
- admin, 1: `Esta tarea tiene 1 alumno con entrega o calificación. Si la borras, también se borrarán su entrega, su calificación y los comentarios privados, y no se puede deshacer.`
- admin, N: `Esta tarea tiene N alumnos con entrega o calificación. Si la borras, también se borrarán sus entregas, sus calificaciones y los comentarios privados, y no se puede deshacer.`

1. `backend/src/core/tareas/tareas.test.ts:105` → admin, 1; `:108` → admin, N (`${String(entregas)}`); `:111` → maestro, 1; `:113` → maestro, N.
2. `backend/src/core/tareas/tareas.test.ts:160` → admin, 1; `:163` → admin, 2; `:166` → admin, 30; `:169` → maestro, 1; `:172` → maestro, 2; `:175` → maestro, 30 (rol `estudiante`).
3. `backend/test/tareas-borrar-con-entregas.integracion.test.ts:229` → maestro, 1; `:231` → maestro, N (`${String(n)}`); `:233` → admin, 1; `:235` → admin, N.
4. `backend/test/entregas-concurrencia.integracion.test.ts:321` → maestro, 1.
5. `frontend/src/features/tareas/entregas-01e.test.tsx:35` → maestro, 2; `:37` → admin, 2.

Ninguna otra prueba normal fija el texto. El título de PR-1B27 ("los mensajes exactos de §D-3.8…") no necesita cambiar.

### Reescrituras (diff resumido)
Cada una lleva encima el comentario `N-19 (carril trivial, 2026-10-26): el 409 cuenta alumnos con entrega o calificación`. Los literales nuevos se cotejaron byte a byte con los de `aprobacion.md` (`grep -F`).
- `backend/test/entregas-01b-r1.ataque.test.ts` (2 comentarios, 2 líneas cambiadas):
  - `:922` (antes 921), caso "consultas raras (…): … el maestro con el parámetro recibe 409 con el conteo exacto": `"Esta tarea tiene 2 entregas y no se puede borrar. …"` → `"Esta tarea tiene 2 alumnos con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración."`
  - `:945` (antes 943), caso "admin con ?confirmar=entregas y archivos confirmados en entregas, una entrega asignada y un hilo privado: 204, …": `"Esta tarea tiene 1 entrega. Si la borras, también se borrarán la entrega y los comentarios privados, …"` → `"Esta tarea tiene 1 alumno con entrega o calificación. Si la borras, también se borrarán su entrega, su calificación y los comentarios privados, y no se puede deshacer."`
- `backend/test/calificaciones-01a-r2.ataque.test.ts` (1 comentario, 1 línea cambiada), caso CAL-T-29: `toContain("2 entregas")` → `toContain("2 alumnos con entrega o calificación")`.
- `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` (1 comentario, 2 líneas cambiadas): `MENSAJE_MAESTRO` → maestro, 2; `MENSAJE_ADMIN` → admin, 2 (`sus entregas, sus calificaciones`).

`git diff --stat -- backend frontend`: 3 archivos, 11 inserciones, 5 eliminaciones.

### Rojos esperados (y obtenidos)
Backend, exactamente tres, los tres por el texto (lo recibido es el texto viejo):
- `test/entregas-01b-r1.ataque.test.ts` > "consultas raras (…)": recibido `"Esta tarea tiene 2 entregas y no se puede borrar. …"`.
- `test/entregas-01b-r1.ataque.test.ts` > "admin con ?confirmar=entregas y archivos confirmados en entregas, …": recibido `"Esta tarea tiene 1 entrega. Si la borras, también se borrarán la entrega y …"`.
- `test/calificaciones-01a-r2.ataque.test.ts` > "CAL-T-29: …": recibido `"Esta tarea tiene 2 entregas y no se puede borrar. …"`, que no contiene `"2 alumnos con entrega o calificación"`.

Ningún otro rojo. Frontend: sin rojos, como se esperaba. La `*.ataque` reescrita usa el texto como doble del servidor y comprueba que la vista lo muestra tal cual (`npx vitest run src/features/tareas/entregas-01e-r1.ataque.test.tsx` → `Tests  29 passed (29)`). Cuando el programador cambie `core/tareas/tareas.ts`, los tres rojos del backend deben pasar a verde sin tocar estos archivos.

### PA-07 (corrida completa del backend)
Comando: `cd backend; npm run test` (14:50:26Z a 14:53:17Z). La salida completa se guardó en un archivo del scratchpad y se contó por término:

| Término | Conteo |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente el inventario |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` (`maxWait`) | 0 |
| (aparte) `Test timed out` | 0 |

Atribución por `pid` y `requestId` dentro de cada app (la línea de petición más cercana con el mismo `pid` y `requestId`):
- **Control positivo, completo:** los tres `P2028` de `servicio-ocupado.integracion.test.ts`, nivel 40, mismo `pid` (14216): `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`; `POST /api/auth/refrescar` › `tx.sesion.updateMany()`; `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3.ataque.test.ts`** (`pid` 20548, nivel 40): `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`. Ningún `P2028` fuera de la lista.
- **Los diez `"Error no controlado"`** (nivel 50), iguales al inventario:
  - 1 a 6: `POST /api/auth/login` (`pid` 18088), de `intentos-r2.ataque`: cinco "fallo simulado de la base en la búsqueda" y uno "… al crear la sesión".
  - 7 a 9: `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones` (`pid` 15528), de `archivos-d-r2.ataque` T-39: `ZodError` `invalid_format` `url`.
  - 10: `GET /api/prueba/error-comun` › `boom` (`pid` 20836), de `salud.integracion`.
- Mis reescrituras no provocan ningún `"Error no controlado"` ni `P2028`.
- **PA-07: limpia. PA-12:** ningún tiempo límite ni rojo intermitente; no repetí ninguna corrida.

### Comandos y última línea (una suite a la vez: backend, luego frontend)
| Comando | Código | Última línea |
|---|---|---|
| `docker info --format '{{.ServerVersion}}'` | 0 | `28.5.1` |
| V-01 (`git ls-files … \| xargs sha256sum` y `diff`) | 0 | `IGUALES` (204 de 204) |
| `cd backend; npm run lint` | 0 | `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (antes: `All matched files use Prettier code style!`) |
| `cd backend; npm run test` | 1 | `Test Files  2 failed \| 214 passed (216)` · `Tests  3 failed \| 2614 passed (2617)` · `Duration  162.00s` (los 3 rojos esperados) |
| `cd frontend; npm run test` (14:53:59Z a 14:57:10Z) | 0 | `Test Files  197 passed (197)` · `Tests  3318 passed (3318)` · `Duration  187.21s`; `grep -c "Test timed out"` = 0 |
| `cd frontend; npx vitest run src/features/tareas/entregas-01e-r1.ataque.test.tsx` | 0 | `Tests  29 passed (29)` |
| `cd frontend; npm run lint` | 0 | `> tsc -b` |

### Tabla de SHA-256 de las 204 `*.ataque` al cierre de la ronda 0 de N-19 (base de V-01 del programador y del manager)
Tres cambian respecto a la tabla de la ronda 4 cerrada de 01d (marcadas "Reescrita (N-19)"); las 201 restantes son iguales.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` | Reescrita (N-19) |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` | Reescrita (N-19) |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | Reescrita (N-19) |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |
