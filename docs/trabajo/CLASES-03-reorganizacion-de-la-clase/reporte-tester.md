# Reporte del Tester — CLASES-03 · reorganización de la clase

> **Nota de transcripción (orquestador, 2026-10-28).** La herramienta del tester rechazó crear este archivo ("Subagents should return findings as text"), así que el tester entregó el reporte como texto y el orquestador lo transcribió tal cual, sin cambiar contenido, según la regla "Transcripción con cotejo" de `AGENTS.md`. La tabla de SHA-256 se pegó desde el archivo `tabla.md` que el tester dejó en el scratchpad de la sesión (226 filas). El SHA-256 de este archivo queda en `aprobacion.md`.

## CLASES-03a — Ronda 0

Fecha: 2026-10-28. Rama `feat/clases-03`, base `<R>` = `689c636`. Plan aprobado: `plan.md`, SHA-256 `c9efaac17f4e3873764997f48714af63459ff945ce6ff08251822aa31e1a1518`; lo reproduje con `sha256sum` (966 líneas). Todavía no hay código de 03a.

Veredicto: no aplica (ronda 0). **La reescritura está hecha; la corrida de la suite del backend quedó PENDIENTE.**
Verificación propia:
- lint: `npm run lint` del backend da exit 0. Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`. Prettier: `All matched files use Prettier code style!`.
- test: **no corrida**, porque Docker Desktop está apagado y no lo abrí (es una aplicación gráfica).

### V-01: las `*.ataque` de la base antes de tocar nada
- **Comando:** `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.(ts|tsx)$'` y `sha256sum` de cada archivo. Comparé contra la "Tabla de SHA-256 de las 226 `*.ataque` al cierre de la ronda 2 de CHORE-03 03c" de `docs/trabajo/CHORE-03-errores-api/reporte-tester.md`, que ya trae lo de N-19.
- **Resultado:** 226 archivos en el árbol y 226 en la tabla (89 del backend y 137 del frontend), sin archivos de más ni de menos. 221 son iguales y 5 distintos.
- **Los 5 distintos** los cambió el commit `60f1a28` (cierre de CHORE-03, O-25, hecho por el orquestador por instrucción del humano y registrado en el `aprobacion.md` de CHORE-03). Cada uno tiene una sola línea cambiada, `}, 30_000)` → `})`. Están explicados; no es regresión.
  - `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx`
  - `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx`
  - `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx`
  - `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx`
  - `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx`
- `git diff --stat 689c636 -- backend frontend shared` salió vacío antes de la reescritura.

### Decisión por fila de §D-R0 (03a)
| Fila | Prueba | Decisión | Motivo |
|---|---|---|---|
| C-1 | `backend/test/sesiones-y-cadena.ataque.test.ts:543-680` (inventario exacto de rutas bajo `/api`) | **Cambiada** | §D-3.5 a §D-3.7 crean `GET …/recursos`, `GET …/recursos/:recursoId` y `PUT …/recursos/:recursoId`, y Fastify agrega el `HEAD` de cada `GET`. Se suman exactamente esas 5 entradas en su lugar del orden. Ninguna es pública ni crea cuentas. Las 9 de dudas (03b) todavía no. |
| C-2 | `backend/test/lecturas-fx-r1.ataque.test.ts:758-816` (usos de `instantaneaUnica: true` por archivo) | **Cambiada** | §D-0.4, §D-3.5 y §D-3.6 piden `listarRecursos` y `leerRecurso` en la instantánea única. Se suma `"adapters/db/recursos.ts:2"` y el título pasa de "catorce" a "dieciséis lecturas (…, dos de calificaciones y dos de recursos)". `publicaciones.ts`, `tareas.ts` y `temas.ts` conservan su cuenta: los filtros viven en las funciones de hoy y `listarTemasDeLaSeccion` va sin transacción. `dudas.ts` (03b) todavía no. |
| C-4 | `backend/test/tareas-01a-r1.ataque.test.ts:738` (cuerpo de `moverATema`) | **Sin cambio** | §D-3.9 conserva el orden: primero `tx.tarea.updateMany`, después `bloquearTemaParaUsar` y al final el único `tx.publicacion.updateMany`, que también sube la versión del material. La lectura del autor y del bloque es Prisma (`SELECT_AUTOR`), sin SQL crudo ni ciclos. |
| C-5 | `backend/test/temas-01a-r1.ataque.test.ts:1035` y `:985-1031` | **Sin cambio** | `handlers/clases/recursos.ts` va en `handlers/clases/`, no en `handlers/tareas/`. `listarTemasDeLaSeccion` es un `groupBy` sin ciclo. `handlers/tareas/temas.ts` pasa `perfilDe(request)` sin leer `.rol`. No hay ningún `FOR KEY SHARE` nuevo. |
| C-5 | `backend/test/temas-01a-r3.ataque.test.ts:440-470` | **Sin cambio** | `core/recursos.ts`, `adapters/db/recursos.ts` y `handlers/clases/recursos.ts` no caen en los prefijos de la lista cerrada. |
| C-6 | `backend/test/instantanea-01b-r1.ataque.test.ts:553` | **Sin cambio** | No es una lista cerrada de todas las lecturas: solo fija `adapters/db/tareas.ts`. `listarTrabajo` con `seccion?` conserva la opción, y el `export` de `confirmarArchivos` no mueve los cortes (`\n(export )?const `). Las lecturas nuevas las cuenta C-2. |
| Diseño | `temas-01a-r3.ataque:474-481` (sin `.rol` ni rol comparado fuera de `core/`) | **Sin cambio** | Por §D-2 (M-02), `core/recursos.ts` recibe `ParticipanteDeAutoria`. Un `select` con `rol: true` no casa con `\.rol\b`. |
| Diseño | Las 5 llamadas directas a `crearPublicacion(` | **Sin cambio** | Por §D-3.1, `bloque?` es opcional con `null` por defecto: las llamadas compilan y crean, como hoy, publicaciones sin bloque. |
| Diseño | `hilo-01c-r1.ataque:718` | **Sin cambio** | Por §D-0.5 no hay `FOR KEY SHARE` nuevo, y `entregas.ts` no se toca. |
| Diseño | `muro-c-r1.ataque:628` (quién nombra las colas) | **Sin cambio** | Publicar un recurso sigue en `muro.ts`, y `recursos.ts` no nombra colas. |
| Diseño | `lecturas-fx-r2.ataque:918-952` | **Sin cambio** | `muro.ts` sigue pasando un solo objeto, que gana `tipo`. Los recursos cuentan los comentarios con un `groupBy`. |
| Diseño | Migración y `CHECK`: `migracion-01a-r1.ataque`, `sexto-paso-02a-r1.ataque` y las normales `migracion-tareas` y `calificaciones-migracion` | **Sin cambio** | Cada una fija su propia migración: `migracion-01a-r1` por nombre exacto (`20261012035613_…`) y nombra sus siete `CHECK` con `= ANY`; las otras buscan por sufijo (`*_clases_administradas`, `*_calificaciones`). `bloque` admite nulo y `version` tiene valor por defecto, así que las inserciones a mano siguen valiendo. |

#### Búsqueda de `*.ataque` no listadas: ninguna rompe con el diseño de 03a (sin PARADAS)
- **Rutas:** solo `sesiones-y-cadena` tiene un inventario exacto.
- **Inventarios de archivos con `readdirSync`:** ninguno cambia con los archivos nuevos. 03a no borra ningún modelo nuevo; los archivos que salen al editar pasan a `descartado` con un `update`.
- **Pruebas que mueven materiales:** usan siempre materiales de un maestro (bloque `docente`), así que cualquier maestro de la clase los sigue moviendo. Son `temas-01a-r1`, `temas-01a-r3`, `nombres-ids-01a-r2`, `instantanea-01b-r1`, `referencias-01b-r1`, `tareas-01b-r1` y `gradebook-01b-r1`.
- **Pruebas que borran materiales:** usan materiales de maestros, donde `puedeBorrarRecurso` coincide con `puedeBorrar`.
- **"Mover lo ajeno por la clase propia"** (404) sigue valiendo, porque la publicación se busca por `id` y `claseId` antes de leer el bloque.
- **Parámetros nuevos:** ninguna `*.ataque` manda hoy `?tipo=`, `?seccion=` ni `?bloque=`.
- **Esquemas de `shared/`:** ninguna `*.ataque` enumera sus exportaciones.
- **Filas completas de `publicaciones`:** las pruebas las comparan antes y después de una operación fallida, así que las columnas nuevas tienen el mismo valor en las dos fotos.

### Archivos tocados (solo `*.ataque`)
`git diff --stat`: 2 archivos, 13 inserciones y 2 borrados.

- **`backend/test/sesiones-y-cadena.ataque.test.ts` (C-1):**
  - Tres líneas de comentario con el motivo (CLASES-03a, C-1).
  - El título suma "CLASES-03a" a la lista de encargos.
  - La lista suma `GET /api/clases/:claseId/recursos`, `GET /api/clases/:claseId/recursos/:recursoId`, `HEAD /api/clases/:claseId/recursos`, `HEAD /api/clases/:claseId/recursos/:recursoId` y `PUT /api/clases/:claseId/recursos/:recursoId`, cada una en su lugar del orden.
- **`backend/test/lecturas-fx-r1.ataque.test.ts` (C-2):**
  - El título pasa de "catorce" a "dieciséis lecturas".
  - La lista suma `"adapters/db/recursos.ts:2"` entre `publicaciones.ts` y `tareas.ts`, con dos líneas de comentario con el motivo (CLASES-03a, C-2).

### Cifras antes y después
- **No disponibles.** `npx vitest list` desde `backend/` da exit 1 con `No se pudo levantar PostgreSQL de pruebas con Testcontainers…` (causa: `Could not find a working container runtime strategy`). `docker info` responde `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
- Probé un listado sin `globalSetup` solo para orientarme; 21 archivos fallan al recolectarse, así que no vale como cifra.
- Última cifra registrada del backend, no verificada en esta ronda: 216 archivos y 2617 pruebas (cierre de N-19).
- **Pendiente:** con Docker Desktop encendido, `npx vitest list` y `npm run test`, con PA-07 completo (comando, conteo por término y el control positivo de los tres `P2028` de `servicio-ocupado.integracion.test.ts`).

### Rojas esperadas tras la ronda 0
| Fila | Caso | Por qué | Pasa a verde en |
|---|---|---|---|
| C-1 | `sesiones-y-cadena.ataque.test.ts` › "bajo /api solo existen las rutas de AUTH-01, …, CALIFICACIONES-01a, CALIFICACIONES-01b y CLASES-03a: …" | Todavía no existen las 5 rutas de recursos | Paso 6 de 03a |
| C-2 | `lecturas-fx-r1.ataque.test.ts` › "la opción solo se puede activar dentro de adapters/db: … las dieciséis lecturas (…, dos de calificaciones y dos de recursos)" | Todavía no existe `adapters/db/recursos.ts` | Paso 5 de 03a |

C-4, C-5 y C-6 no cambiaron, así que no hay más rojas permitidas.

### Riesgos para el programador (sin prueba roja)
- **Tres cuentas textuales leen también los comentarios:**
  - C-2: debe haber exactamente 2 `instantaneaUnica: true` en `recursos.ts`.
  - `muro-c-r1.ataque:628`: busca nombres de colas como `COLA_MATERIAL_CREADO` o `"MATERIAL_CREADO"`.
  - `lecturas-fx-r2.ataque:918`: busca `listarPublicaciones(` y `listarComentarios(` por subcadena.

  Un comentario que los nombre en un archivo nuevo pone roja la prueba.
- **C-4 depende del orden textual del cuerpo de `moverATema`:** primero `tx.tarea.updateMany`; un solo `tx.publicacion.updateMany`, después de `bloquearTemaParaUsar`; y en el cuerpo nada de `$queryRaw`, `for`, `while` ni `.forEach(`.
- **Sin roles a mano en temas:** nada de `.rol`, `relacion ===` ni `=== "maestro"` en `adapters/db/temas.ts` ni en `handlers/tareas/*.ts` (`temas-01a-r3:474-481` y `temas-01a-r1:1007-1011`).

### Tabla de SHA-256 de las 226 `*.ataque` al cierre de la ronda 0 de CLASES-03a (base de V-01)
- **Contenido:** 2 reescritas en esta ronda y 5 cambiadas en `60f1a28`, todas marcadas; las 219 restantes son iguales a la tabla de la ronda 2 de CHORE-03 03c.
- **Comando:** el de V-01. Los hash van en mayúsculas.

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
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
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
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
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
| `B06BCB5D1B3915A9770450BBF7FF258C2BAC15845CCECEC704E6B70C1023E438` | `backend/test/lecturas-fx-r1.ataque.test.ts` | Reescrita (CLASES-03a r0, C-2) |
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
| `126CD5CB00B15ACCC07C046CA14CC85861AC7C4345E10C41FBE7B9506F3B71F5` | `backend/test/sesiones-y-cadena.ataque.test.ts` | Reescrita (CLASES-03a r0, C-1) |
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
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `7D080037D9A64EEBCEBB789D1DFD94B787652103E6F9C84F968F9C9F64C3B30C` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `C21EDB5A06B43808CE2BE23058409B7FF887E66D60E842C500A3714A90EBCB25` | `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `761F54F183540D8AE222F97940FA6C2355FF33E515771E627F8EFDE49261EDA2` | `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25: sin `30_000` en el `beforeAll`) |
| `14EAD3DCE027B433D51A9D635B0FA35718EE3875BFFC3E1949F96ECB8D2F7135` | `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `AF3F0D474F8052B402C8959A64ACF9E730F9AE60F09D90996A6306E9C2440F08` | `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `96B6AB55F0A7BF9B66F8EDBCB5CEFFA7E4FE35935C6CB12ECAB93FC04BC02856` | `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25: sin `30_000` en el `beforeAll`) |
| `0CE580976EA894EE4BD9C4ADBE3D7D1D524354A8FF22FC7E7CC6ACF89057AA53` | `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` |  |
| `4BCD3E34B62726FEA718EFB9C482D8C1F504BBE85EF32427BDF4D65A6832D8F1` | `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` |  |
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
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` |  |
| `DDC9DFACCC8230EC612126FDF29939A8E4311188566E5CFCAA724BD119E959E8` | `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `9ADE89B7B54F15CA9B64639469DAE1D9B79C24D5AC5E6FC17857384642FAF0FC` | `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` |  |
| `6E03C504C9B6A6058E0C0AA8D7A297086DD8F6F935F4F681E361699A6887CE62` | `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25: sin `30_000` en el `beforeAll`) |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `6144958ED59E1F14D4DDE52AB82892DE377FCE10504B3B5AF171ADC95292D2F1` | `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25: sin `30_000` en el `beforeAll`) |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
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
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` |  |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E662437641E2634539E09C674A84D353477E3BD05E31A1C11DC96ADC8B863B18` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25: sin `30_000` en el `beforeAll`) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` |  |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` |  |
| `66513D957E524AF5E336A2C7E656DF37F51106507A3984B691DF47CD825D4D10` | `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` |  |
| `A9529CEFBD27CBB94376A6548EF1B8B247FB1F4155938298AE5D10EAEE81008A` | `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `8BD0E034D4372D34BF145235372EFA27A150A38FD9A04EADB69FD48AC4E06D6C` | `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-03a — Ronda 1

Fecha: 2026-10-28. Plan `plan.md` SHA-256 `ba4bd5ec2a93314475d2e20495b4fb1d3bca6fdfb5d77ad5c580939812a5cb8b` (1000 líneas; reproducido). Código de 03a sin commit sobre `<R>` = `689c636`, aceptado por el manager (`revision.md`, "Verificación del resumen — 03a — implementación").

Veredicto: **ROTO**
Verificación propia:
- **lint:** `npm run lint` (backend) → exit 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `npm run test` (backend) → `Test Files  1 failed | 222 passed (223)` · `Tests  4 failed | 2709 passed (2713)` · `Duration  147.92s (transform 15.15s, setup 6.94s, import 276.77s, tests 1145.30s, environment 54ms)`; `timed out` 0. Los 4 rojos son míos (T-01 a T-04).
- **vitest list:** `npx vitest list` → 2713 casos en 223 archivos (+2 archivos y +23 casos sobre los 221 / 2690 del manager).

### V-01
- **Base:** la tabla de SHA-256 de la ronda 0 de 03a (226 filas, `reporte-tester.md`).
- **Comando:** `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.(ts|tsx)
` y `sha256sum` de cada archivo.
- **Resultado:** 226 de 226 iguales antes de escribir nada, sin archivos de más ni de menos.
- **Al cierre:** 228 archivos; las 226 anteriores siguen iguales y se suman las dos nuevas de esta ronda.

### Archivos nuevos (solo `*.ataque`; nada de producción ni pruebas normales)
- `backend/test/recursos-clases03a-r1.ataque.test.ts`: 21 casos, CL3a-r1-01 a CL3a-r1-20 y CL3a-r1-23.
- `backend/test/migracion-clases03a-r1.ataque.test.ts`: 2 casos, CL3a-r1-21 y CL3a-r1-22.

Reglas de pruebas que se respetan:
- No hay `LOCK TABLE`.
- Las retenciones usan `SELECT … FOR UPDATE` de la fila del recurso, con `formadasDetrasDe` y el `pid` propio, y llevan `timeout: 30_000` (mayor que la espera más larga, 10 s por operación).
- Ninguna prueba compara fechas relativas al reloj: las fechas de orden son instantes fijos y la fecha límite es fija (`2030-01-15`).
- Ninguna localiza elementos por estilo, todas ejecutan aserciones y ninguna termina con un `return` temprano.

### Hallazgos

#### T-01 — Editar un recurso quitándole un adjunto mientras otra persona lo borra: deadlock y 500
**Severidad:** alta
**Prueba:** `backend/test/recursos-clases03a-r1.ataque.test.ts` › "CL3a-r1-01: la edición que quita un adjunto y el borrado del recurso, formados en ese orden, quedan en serie: la edición responde 200 y el borrado 204 (ni 500 ni deadlock)"

**Esperado:** "Acceso a datos" del plan dice: "Editar contra borrar: el borrado toma la fila; la edición espera y, al confirmar el borrado, no la encuentra (404), o el borrado espera a la edición". Es decir, las dos quedan en serie y la edición formada primero da `200` y el borrado `204`.

**Obtenido:** `["500 ERROR_INTERNO", "204"]` en la corrida dirigida y `["200", "500 ERROR_INTERNO"]` en las demás: la víctima cambia de una corrida a otra. Siempre hay un 500. En el log:
- `"code":"P2034"` con `originalCode: "40P01"` y `"deadlock detected"`.
- `"Error no controlado"` en `tx.archivo.updateMany()` (`adapters/db/recursos.ts:262`, si muere la edición) o en `tx.publicacion.deleteMany()` (`adapters/db/publicaciones.ts:304`, si muere el borrado).

En 4 corridas, 4 rojas.

**Reproducción:**
1. Un recurso del docente con un adjunto confirmado `A`.
2. Se retiene su fila. Se lanza `PUT …/recursos/:id` del autor con `archivoIds: []` (quita `A`); queda esperando la fila.
3. Se lanza `DELETE …/publicaciones/:id` del admin.
4. Se suelta la fila.

**Mecanismo:**
- `borrarPublicacion` no bloquea la fila de la publicación antes de tocar sus archivos: hace `findFirst` sin bloqueo, después `archivo.updateMany` (bloquea `A`) y al final el `DELETE`, que espera la fila que tiene la edición.
- La edición, ya con la fila (`FOR NO KEY UPDATE`), ve `A` todavía adjunto y quiere pasarlo a `descartado`, así que espera `A`.
- Resultado: espera circular.
- Contraste: `borrarTarea` sí toma primero la fila (`FOR UPDATE OF t`, `adapters/db/tareas.ts`) antes de tocar archivos.

**Requisito o regla violada:** "Acceso a datos" › "Bloqueos y concurrencia" del plan (editar contra borrar en serie) y §D-3.7/§D-3.8; S-02 (editar un recurso). Además PA-07: un `40P01`/`deadlock detected` en la suite.

#### T-02 — Editar un recurso agregándole un adjunto mientras otra persona lo borra: el borrado responde 500 y el recurso no se borra
**Severidad:** alta (mismo mecanismo que T-01)
**Prueba:** `backend/test/recursos-clases03a-r1.ataque.test.ts` › "CL3a-r1-02: la edición que agrega un adjunto y el borrado del recurso, formados en ese orden, quedan en serie: la edición responde 200 y el borrado 204 (ni 500 ni el recurso a medio borrar)"

**Esperado:** `["200", "204"]`, el recurso borrado y sus dos archivos en `descartado`.

**Obtenido:** `["200", "500 ERROR_INTERNO"]` en todas las corridas (4 de 4). En el log:
- `"code":"P2003"`.
- `Foreign key constraint violated on the constraint: archivos_publicacion_id_fkey` en `tx.publicacion.deleteMany()` (`adapters/db/publicaciones.ts:304`), con `"Error no controlado"`.

El recurso sigue existiendo, con el adjunto nuevo confirmado.

**Reproducción:** como T-01, pero el `PUT` conserva `A` y agrega un archivo pendiente `X`, ya subido al almacén doble.

**Mecanismo:**
1. El borrado pasa a `descartado` los archivos que ve adjuntos y se forma detrás de la edición.
2. La edición confirma `X` en la publicación y confirma su transacción.
3. El `DELETE` encuentra `X`, que ya apunta a la publicación (FK `NO ACTION`), y falla sin traducirse.

**Requisito o regla violada:** la misma que T-01, más "Manejo de errores en el backend" (un error de Prisma sale como 500). RN-07 (el borrado que la regla permite no se cumple).

**Hermanos de T-01 y T-02 (para el programador):**
- `borrarPublicacion` es la ruta de borrar de anuncios y materiales.
- Lo que la vuelve sensible es que una escritura nueva (`editarRecurso`) mueve archivos de la publicación mientras tiene la fila bloqueada.
- Controles que pasan:
  - **CL3a-r1-03:** conservar los adjuntos y borrar dan `200` y `204`.
  - **CL3a-r1-04:** con el borrado formado primero, la edición responde `404 RECURSO_NO_ENCONTRADO`.
  - Editar contra mover y contra comentar quedan en serie (CL3a-r1-05 a 07).

#### T-03 — "Trabajo de clase" (sin `?seccion`) ofrece mover al maestro un recurso de aprendizaje que la ruta de mover le niega
**Severidad:** media
**Prueba:** `backend/test/recursos-clases03a-r1.ataque.test.ts` › "CL3a-r1-12: «Trabajo de clase» (sin sección, DH-02 b) no ofrece mover al maestro un recurso de aprendizaje que la ruta de mover le niega"

**Esperado:** que la bandera coincida con la regla. Para un material del admin (bloque `aprendizaje`), `GET …/trabajo?tema=sin-tema` debe dar al maestro de la clase `puedeMover: false`, ya que `PUT …/publicaciones/:id/tema` le responde `403 MOVER_NO_PERMITIDO`.

**Obtenido:** `{ puedeMover: true, mover: "403 MOVER_NO_PERMITIDO" }`. `handlers/tareas/tareas.ts` sigue calculando `puedeMover` solo con la relación (`puedeMoverElemento(relacion)`), sin la regla del bloque de §D-3.9.

**Impacto:** la vista "Trabajo de clase" que hoy usa el frontend (hasta 03c, por la compatibilidad de DH-02 b) muestra "Mover" en los materiales del admin y el servidor lo niega.

**Requisito o regla violada:** S-03 y P-05 (mover un recurso de aprendizaje, solo el admin). §D-0.1: los permisos por elemento los decide `core/` con el actor; aquí la bandera no lo hace. CLAUDE.md: el frontend solo lee las banderas que decide el servidor.

#### T-04 — Un adjunto que el recurso ya tiene, repetido con otra capitalización, pasa la validación "No repitas un archivo adjunto"
**Severidad:** baja
**Prueba:** `backend/test/recursos-clases03a-r1.ataque.test.ts` › "CL3a-r1-15: un adjunto que ya tiene, repetido con otra capitalización, responde 400 VALIDACION «No repitas un archivo adjunto» como cualquier otro repetido"

**Esperado:** `archivoIds: [A, A]` y `archivoIds: [A, A en mayúsculas]` responden los dos `400 VALIDACION`.

**Obtenido:** `["400 VALIDACION", "200"]`. El segundo guarda y sube la versión.

**Mecanismo:** `editarRecursoSchema.archivoIds` es `archivoIdsSchema.transform(minúsculas)`. El `refine` de repetidos corre antes de pasar a minúsculas, y en el handler los dos ids iguales salen de la lista de nuevos porque ya son del recurso.

**Impacto:** ninguno en los datos (el archivo queda una sola vez), pero la regla del esquema no se cumple. Con un archivo **nuevo** repetido así, la respuesta es `400 ARCHIVO_INVALIDO` (CL3a-r1-14 pasa).

**Requisito o regla violada:** §D-3.7 (`archivoIdsSchema` con minúsculas; la regla de repetidos de los materiales).

### Atacado sin hallazgos
- **Carreras (CL3a-r1-03 a 07):**
  - Editar conservando adjuntos contra borrar: `200`/`204`.
  - Borrar formado antes que editar: `204`/`404 RECURSO_NO_ENCONTRADO`.
  - Mover antes que editar con la versión 0: `200`/`409 RECURSO_MODIFICADO`, versión 1.
  - Editar antes que mover: los dos `200`, versión 2.
  - Comentar mientras se edita: `200`/`201`, el comentario queda.
- **La versión que sube al mover (CL3a-r1-08):** mover a "Sin tema" dos veces sube la versión dos veces y un formulario con la versión vieja recibe `409`. Es lo que pide S-03; ver la observación O-r1-1.
- **Bloque nulo de autor admin (CL3a-r1-09):**
  - El detalle dice `aprendizaje` con las tres banderas en `false`.
  - El maestro recibe `403` al editar, al mover (`MOVER_NO_PERMITIDO`) y al borrar, sin cambios.
  - El admin lo edita, y no sale en ninguna lista de Recursos.
- **Bloque nulo de autor maestro (CL3a-r1-10):** otro maestro solo lo mueve, el admin solo lo borra y el autor lo edita.
- **Maestro retirado autor de un recurso del docente (CL3a-r1-11):**
  - La lista da `puedeEditar: false`, `puedeBorrar: false` y `puedeMover: true`.
  - El retirado recibe `403 SIN_ACCESO_A_LA_CLASE`.
  - El otro maestro recibe `403` al editar y al borrar, pero lo mueve.
  - El admin recibe `403` al editar y lo borra.
- **Archivos al editar (CL3a-r1-13, 14):** responden `400 ARCHIVO_INVALIDO` sin cambiar la fila ni los archivos:
  - el de otro recurso;
  - el de una tarea;
  - uno con clave `entregas/…`;
  - uno descartado;
  - uno pendiente de otro usuario;
  - uno pendiente de otra clase.

  Un nuevo repetido igual da `400 VALIDACION`; con otra capitalización, `400`. Uno nuevo en mayúsculas se confirma.
- **`?tipo=anuncio` (CL3a-r1-16):** con `limite=1` y cursores en mayúsculas, como alumno, recorre solo los 3 anuncios entre 9 materiales, uno sin bloque y 2 tareas. Un cursor de material, de tarea, sin bloque o de anuncio de otra clase da `400`.
- **`?seccion=actividades` (CL3a-r1-17):** en "Sin tema" y en un tema, solo las 2 tareas; con un material como cursor, `400`.
- **Conteos por sección (CL3a-r1-18):** actividades + aprendizaje + docente + los materiales sin bloque igualan el total, tema por tema y en "Sin tema" (8 y 4).
- **Cursores de Recursos (CL3a-r1-19):** de otro bloque, de otro tema, de anuncio, de tarea, sin bloque, de otra clase o inexistente: `400` con el mismo texto "cursor: no es válido". `?bloque=` repetido, mezclado o en mayúsculas: `400 VALIDACION`.
- **Fugas (CL3a-r1-20):** lista (2 bloques × 3 roles) y detalle (maestro y admin), con un alumno `deudor` inscrito. Ningún cuerpo lleva `email`, `correo`, `estadoPago`, `accesoRestringido`, `rol`, `motivoRestriccion`, "deudor", `@` ni el correo del admin; la lista nunca lleva `version`, y la firma del admin no lleva su nombre real.
- **Migración con datos raros (CL3a-r1-21, 22):**
  - 36 materiales de admin, maestro y estudiante, en dos clases y con tema, más anuncios y tareas del admin y de otros autores.
  - Cada fila recibe el bloque que da `bloqueEfectivo` (el material de estudiante va a `docente`); anuncios y tareas quedan nulos y ningún material queda sin bloque.
  - Después, los `CHECK` rechazan un anuncio con bloque y una versión negativa, y aceptan quitar el bloque a un material (DH-02 a).
- **Compatibilidad DH-02 (b) (CL3a-r1-23):**
  - Sin parámetros, el muro y "Trabajo de clase" siguen dando materiales con y sin bloque y tareas, sin claves nuevas (`bloque`, `version`).
  - `GET …/temas?otro=1` responde `200` con el total.

### No atacado y por qué
- **Frontend:** 03a no lo toca.
- **Concurrencia de mover contra borrar:** mover no toca archivos y sus permisos no cambian con el borrado.
- **Rendimiento de los índices nuevos (`EXPLAIN`):** no se pide en el plan; los índices los verifica CL3-A03 por nombre y columnas.
- **La HEAD de las rutas nuevas:** la cubren C-1 y CL3-A18.

### Observaciones (sin prueba roja)
- **O-r1-1:** mover un recurso a su mismo tema (o a "Sin tema" estando ahí) sube la versión y deja con `409` a quien tenía el formulario abierto, aunque nada cambió. S-03 dice que mover sube la versión, sin excepción; lo dejo anotado.
- **O-r1-2:** en el muro (`GET …/publicaciones`), `puedeBorrar` de un material sale de `puedeBorrar` (`core/autoria.ts`), no de `puedeBorrarRecurso`. Solo difieren con datos imposibles por la API, como un material con bloque `aprendizaje` de autor maestro o uno de autor estudiante, así que no lo cuento como hallazgo. Es hermano de T-03 si el remedio de T-03 se extiende a las banderas de las listas de compatibilidad.

### PA-07 (corrida completa de `npm run test`, salida en el scratchpad `r1-test.txt`)
| Término | Conteo |
|---|---|
| `40P01` | 1 |
| `deadlock detected` | 1 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 12 (10 del inventario + 2 de mis rojas) |
| `"code":"P2028"` | 5, todos permitidos |

- **Control positivo, completo:** los tres `P2028` de `servicio-ocupado.integracion.test.ts`, nivel 40, en un mismo `pid` (17172):
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`
- **Los dos de `cuentas-r3.ataque.test.ts`** (`pid` 18216, nivel 40): `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`. Ningún `P2028` fuera de la lista.
- **Los 10 `"Error no controlado"` del inventario** (igual a la ronda 0 de 03a: `r0-03a-test.txt` y `test-03a-manager.txt` dan 10, con 0 `40P01` y 5 `P2028`):
  - Seis de `intentos-r2.ataque` (`pid` 19388): cinco "fallo simulado de la base en la búsqueda" y uno "… al crear la sesión", en `POST /api/auth/login`.
  - Tres `ZodError` de la URL del almacén de `archivos-d-r2.ataque` (`pid` 21576).
  - Un `boom` de `salud.integracion` (`pid` 29148).
- **Fuera del inventario, provocados a propósito por mis pruebas rojas** (`pid` 30952, `recursos-clases03a-r1.ataque`):
  - `req-2`: `DELETE …/publicaciones/:publicacionId` › `tx.publicacion.deleteMany()` con `P2034`/`40P01`. Es T-01; es el único `40P01` y el único `deadlock detected` de la corrida.
  - `req-4`: el mismo `DELETE` con `P2003`. Es T-02.
- No son de la suite existente: desaparecen cuando se corrijan T-01 y T-02. Las condiciones (a) y (b) de PA-07 se cumplen solo por estas dos pruebas: me detengo y lo reporto como hallazgo.

### Comandos de la verificación propia (una suite a la vez; ninguna otra suite en marcha)
| Comando | Salida | Última línea |
|---|---|---|
| `npx prettier --write` sobre mis 2 archivos (solo esos) | 0 | — |
| `npx vitest run` de mis 2 archivos (dirigida) | 1 | `Tests  4 failed \| 18 passed (22)` (antes de sumar CL3a-r1-23) |
| `npx vitest run … -t "CL3a-r1-0[1-4]"` × 3 | 1 | `Tests  2 failed \| 2 passed \| 16 skipped (20)` las tres veces (T-01 y T-02 deterministas) |
| `npm run lint` (backend) | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| `npx vitest list` (backend) | 0 | 2713 casos, 223 archivos, 23 con "CL3a-r1" |
| `npm run test` (backend) | 1 | `Test Files  1 failed \| 222 passed (223)` · `Tests  4 failed \| 2709 passed (2713)` · `Duration  147.92s` |

### Tabla de SHA-256 de las 228 `*.ataque` al cierre de la ronda 1 de CLASES-03a (base de V-01 de la ronda 2)
- **Contenido:** dos nuevas, marcadas "Nueva (CLASES-03a r1)"; las 226 restantes son iguales a la tabla de la ronda 0 de 03a, con sus notas.
- **Comando:** el de V-01. Los hash van en mayúsculas; compárense sin distinguir mayúsculas.

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
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
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
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
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
| `B06BCB5D1B3915A9770450BBF7FF258C2BAC15845CCECEC704E6B70C1023E438` | `backend/test/lecturas-fx-r1.ataque.test.ts` | Reescrita (CLASES-03a r0, C-2) |
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
| `2AFD58E1EAD0A293AA7BD58C639F3E5126D153A418F9A26450228468E12B2BED` | `backend/test/migracion-clases03a-r1.ataque.test.ts` | Nueva (CLASES-03a r1) |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `42F4E113762EF26459E95642FF4B814613353D64D462AB2B01ECDEEF4B9E160D` | `backend/test/recursos-clases03a-r1.ataque.test.ts` | Nueva (CLASES-03a r1) |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `126CD5CB00B15ACCC07C046CA14CC85861AC7C4345E10C41FBE7B9506F3B71F5` | `backend/test/sesiones-y-cadena.ataque.test.ts` | Reescrita (CLASES-03a r0, C-1) |
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
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `7D080037D9A64EEBCEBB789D1DFD94B787652103E6F9C84F968F9C9F64C3B30C` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `C21EDB5A06B43808CE2BE23058409B7FF887E66D60E842C500A3714A90EBCB25` | `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `761F54F183540D8AE222F97940FA6C2355FF33E515771E627F8EFDE49261EDA2` | `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `14EAD3DCE027B433D51A9D635B0FA35718EE3875BFFC3E1949F96ECB8D2F7135` | `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `AF3F0D474F8052B402C8959A64ACF9E730F9AE60F09D90996A6306E9C2440F08` | `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `96B6AB55F0A7BF9B66F8EDBCB5CEFFA7E4FE35935C6CB12ECAB93FC04BC02856` | `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `0CE580976EA894EE4BD9C4ADBE3D7D1D524354A8FF22FC7E7CC6ACF89057AA53` | `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` |  |
| `4BCD3E34B62726FEA718EFB9C482D8C1F504BBE85EF32427BDF4D65A6832D8F1` | `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` |  |
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
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` |  |
| `DDC9DFACCC8230EC612126FDF29939A8E4311188566E5CFCAA724BD119E959E8` | `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `9ADE89B7B54F15CA9B64639469DAE1D9B79C24D5AC5E6FC17857384642FAF0FC` | `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` |  |
| `6E03C504C9B6A6058E0C0AA8D7A297086DD8F6F935F4F681E361699A6887CE62` | `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `6144958ED59E1F14D4DDE52AB82892DE377FCE10504B3B5AF171ADC95292D2F1` | `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
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
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` |  |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E662437641E2634539E09C674A84D353477E3BD05E31A1C11DC96ADC8B863B18` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` |  |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` |  |
| `66513D957E524AF5E336A2C7E656DF37F51106507A3984B691DF47CD825D4D10` | `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` |  |
| `A9529CEFBD27CBB94376A6548EF1B8B247FB1F4155938298AE5D10EAEE81008A` | `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `8BD0E034D4372D34BF145235372EFA27A150A38FD9A04EADB69FD48AC4E06D6C` | `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-03a — Ronda 2

Fecha: 2026-10-28. Plan `plan.md`, SHA-256 `204515a6604c786ae27376d87d5e6c5fd9543b50e0834e3780a41b6791a85971` (1027 líneas; Enmiendas 1 a 3). Corrección de la ronda 1 aceptada por el manager ("Verificación de la corrección de la ronda 1 de 03a y de la Enmienda 3").

Veredicto: **RESISTE**

Verificación propia (una suite a la vez, el backend completo antes del frontend):
- **Backend:**
  - `npm run test` → `Test Files  224 passed (224)` · `Tests  2721 passed (2721)` · `Duration  146.82s`; `timed out` 0.
  - `npm run lint` → exit 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
  - `npx vitest list` → 2721 casos, 224 archivos (`grep -a`).
- **Frontend:**
  - `npm run test` → `Test Files  237 passed (237)` · `Tests  5310 passed (5310)` · `Duration  182.53s`; `timed out` 0.
  - `npm run lint` → exit 0, `> tsc -b`.
  - `npx vitest list` → 5310 casos, 237 archivos (`grep -a`).

### V-01
- Base: la tabla de la ronda 1 (228 `*.ataque`), con el comando de siempre.
- Antes de tocar nada: 228 de 228 iguales, ninguna de más ni de menos.
- Al cierre hay 229. Difieren solo las dos de los ajustes arbitrados (abajo) y se suma una nueva, `backend/test/recursos-clases03a-r2.ataque.test.ts`. Las otras 226 no cambian.

### Ajustes previos a la ronda (no cuentan como ronda; Arbitrajes 1 y 2 del manager)
1. **`backend/test/muro-c-r1.ataque.test.ts`** › "el FOR SHARE del comentario va primero y el DELETE de la publicación espera…". Solo cambia el sondeo; las aserciones son las mismas.
   - Antes: `wait_event_type = 'Lock' AND query ILIKE '%DELETE%' AND query ILIKE '%publicaciones%'`.
   - Ahora: `wait_event_type = 'Lock' AND wait_event IN ('transactionid', 'tuple') AND query ILIKE '%publicaciones%' AND (query ILIKE '%DELETE%' OR query ILIKE '%FOR UPDATE%')`, más tres líneas de comentario con el motivo. El motivo: `borrarPublicacion` ahora espera en el `SELECT … FOR UPDATE` (remedio de T-01 y T-02), y el criterio es el de CHORE-02.
   - Verde, aislada y en la suite.
2. **`frontend/src/lib/errores-ch3-r2.ataque.test.ts`:** el `INVENTARIO` suma `"tipo"`, `"bloque"`, `"recursoId"` y `"seccion"`, con dos líneas de comentario con el motivo. No cambia nada más; el archivo pasa con sus 84 casos.

### Remedios de la ronda 1
CL3a-r1-01, -02, -12 y -15 están en verde: `recursos-clases03a-r1.ataque.test.ts` pasa con sus 21 casos en la corrida dirigida y en la completa. Ninguna regresión en las 229 `*.ataque`.

### Ataques nuevos (`backend/test/recursos-clases03a-r2.ataque.test.ts`, 8 casos, todos verdes)
Retienen una fila con `FOR UPDATE` y lanzan cada operación con `formadasDetrasDe` (`pid` propio) y `timeout: 40_000`. No usan `LOCK TABLE` ni comparan fechas con el reloj; todas tienen aserciones.

- **CL3a-r2-01, anuncio:** comentar formado antes que borrar → `201` y `204`. El comentario cae en cascada y no queda nada huérfano.
- **CL3a-r2-02, anuncio con adjunto:** borrar antes que comentar → `204` y `404`. Sin comentario escrito y el archivo en `descartado`.
- **CL3a-r2-03, recurso y mover:**
  - mover antes que borrar → `200` y `204`;
  - borrar antes que mover → `204` y `404 PUBLICACION_NO_ENCONTRADA`.
- **CL3a-r2-04:** dos borrados del mismo recurso con adjunto (admin y autor) → `204` y `404 PUBLICACION_NO_ENCONTRADA`.
- **CL3a-r2-05:** editar agregando un adjunto, comentar y borrar, formados en ese orden → `200`, `201` y `204`, sin deadlock. El adjunto nuevo queda en `descartado` sin publicación.
- **CL3a-r2-06, borrar un comentario contra borrar su recurso:** por la ruta de la publicación y por "mis comentarios", en los dos órdenes, con la fila del comentario retenida.
  - El borrado de la publicación responde `204` en los cuatro casos.
  - El del comentario responde `204` si va primero y `404` si va después.
  - Ningún `500` ni huérfano.
- **CL3a-r2-07, `puedeMover` de `GET …/trabajo` (T-03):** con y sin `?seccion=actividades`, para estudiante, maestro de la clase y admin.
  - Elementos: material de aprendizaje del admin, del docente del maestro y de otro maestro; material con bloque nulo de autor admin y de autor maestro; tareas del admin y del maestro.
  - La bandera coincide siempre con lo que responde mover de verdad (`200` contra `403 MOVER_NO_PERMITIDO` o `ROL_NO_PERMITIDO`) y no cambia con `?seccion`.
  - Ninguna respuesta lleva `"bloque"`.
- **CL3a-r2-08, `archivoIds` repetido con otra capitalización (T-04 y sus hermanos):** todos responden `400 VALIDACION` "No repitas un archivo adjunto" sin escribir nada.
  - Rutas: publicar anuncio, publicar material, crear tarea, editar tarea (con un adjunto que ya tiene), editar recurso (ídem) y entregar.
  - Se comprobó que no cambian el número de publicaciones, los archivos, las versiones, la versión de la tarea ni las entregas.

### Hallazgos
Ninguno.

### Atacado sin hallazgos
Todo lo de la lista de arriba. Además revisé `borrarComentario` y `borrarMiComentario`: no toman la fila de la publicación, así que no hay ciclo con el `FOR UPDATE` nuevo. Lo confirma CL3a-r2-06.

### No atacado y por qué
- Borrar un tema contra borrar una publicación: el borrado no bloquea temas, y borrar un tema no toca archivos. No hay recurso compartido que pueda formar un ciclo con el orden nuevo.
- Frontend: 03a no cambia la interfaz; sí corrí su suite completa porque cambió `shared/src`.

### Observaciones (sin prueba roja)
- O-r1-1 (mover al mismo tema sube la versión) y O-r1-2 (el `puedeBorrar` del muro para un material usa `puedeBorrar`, y solo difiere con datos imposibles por la API) siguen como en la ronda 1.
- El `puntajes` de `calificarEntregaSchema` tiene la misma forma de chequeo de repetidos, pero cada `criterioId` ya pasa a minúsculas antes del `refine` del arreglo, así que no es hermano de T-04.

### PA-07 (`npm run test` del backend, salida en el scratchpad `r2-test.txt`)
| Término | Conteo |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente el inventario |
| `"code":"P2028"` | 5, todos permitidos |

- **Control positivo, completo:** los tres de `servicio-ocupado.integracion.test.ts`, nivel 40, en un mismo `pid` (8264):
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`
- **Los dos de `cuentas-r3.ataque.test.ts`** (`pid` 24732, nivel 40): `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`. Ningún `P2028` fuera de la lista.
- **Los 10 "Error no controlado", iguales al inventario de la ronda 0:**
  - seis de `intentos-r2.ataque` (`pid` 12480), en `POST /api/auth/login`: cinco "fallo simulado de la base en la búsqueda" y uno "… al crear la sesión";
  - tres `ZodError` "Invalid URL format" de `archivos-d-r2.ataque` (`pid` 7496);
  - un `boom` de `salud.integracion` (`pid` 16184).
- Mis pruebas no provocan a propósito ningún "Error no controlado" ni `P2028`. En la corrida dirigida de los archivos r1 y r2, los términos dan 0.

### Comandos de la verificación propia
| Comando | Salida | Última línea |
|---|---|---|
| `npx prettier --check` de los dos archivos ajustados y `npx prettier --write` del nuevo | 0 | — |
| `npx vitest run` de `muro-c-r1` (`-t "FOR SHARE del comentario"`) y de `errores-ch3-r2` | 0 | `Tests  1 passed \| 24 skipped (25)` · `Tests  84 passed (84)` |
| `npx vitest run` de `recursos-clases03a-r1` y `-r2` | 0 | `Tests  29 passed (29)` |
| `npx vitest list` (backend) | 0 | 2721 casos, 224 archivos |
| `npm run test` (backend) | 0 | `Test Files  224 passed (224)` · `Tests  2721 passed (2721)` · `Duration  146.82s` |
| `npm run lint` (backend) | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| `npx vitest list` (frontend) | 0 | 5310 casos, 237 archivos |
| `npm run test` (frontend) | 0 | `Test Files  237 passed (237)` · `Tests  5310 passed (5310)` · `Duration  182.53s` |
| `npm run lint` (frontend) | 0 | `> tsc -b` |

**Incidente:** un comando mío dejó un `python -` esperando en la entrada estándar (`PID 20608`, hijo de mi propio `bash`, verificado con `Get-CimInstance`). Lo terminé yo. No toqué ningún otro proceso.

### Tabla de SHA-256 de las 229 `*.ataque` al cierre de la ronda 2 de CLASES-03a (base de V-01 de la ronda siguiente)
- Una nueva, marcada "Nueva (CLASES-03a r2)".
- Dos ajustadas por los arbitrajes, marcadas.
- Las 226 restantes son iguales a la tabla de la ronda 1.

Comando: el de V-01. Los hash van en mayúsculas.

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
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
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
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
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
| `B06BCB5D1B3915A9770450BBF7FF258C2BAC15845CCECEC704E6B70C1023E438` | `backend/test/lecturas-fx-r1.ataque.test.ts` | Reescrita (CLASES-03a r0, C-2) |
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
| `2AFD58E1EAD0A293AA7BD58C639F3E5126D153A418F9A26450228468E12B2BED` | `backend/test/migracion-clases03a-r1.ataque.test.ts` | Nueva (CLASES-03a r1) |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D23BF1312777BDC000810E403A5B4D99C9C0E12998E4CC11BE5EF5A2253F6935` | `backend/test/muro-c-r1.ataque.test.ts` | Ajustada (CLASES-03a r2, Arbitraje 1: sondeo de la espera) |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `42F4E113762EF26459E95642FF4B814613353D64D462AB2B01ECDEEF4B9E160D` | `backend/test/recursos-clases03a-r1.ataque.test.ts` | Nueva (CLASES-03a r1) |
| `FF4D112AFF8685FCD9C5CA933A0B359E2B4E9BEDAD8F1B5D3D787CFDEC711516` | `backend/test/recursos-clases03a-r2.ataque.test.ts` | Nueva (CLASES-03a r2) |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `126CD5CB00B15ACCC07C046CA14CC85861AC7C4345E10C41FBE7B9506F3B71F5` | `backend/test/sesiones-y-cadena.ataque.test.ts` | Reescrita (CLASES-03a r0, C-1) |
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
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `7D080037D9A64EEBCEBB789D1DFD94B787652103E6F9C84F968F9C9F64C3B30C` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `C21EDB5A06B43808CE2BE23058409B7FF887E66D60E842C500A3714A90EBCB25` | `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `761F54F183540D8AE222F97940FA6C2355FF33E515771E627F8EFDE49261EDA2` | `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `14EAD3DCE027B433D51A9D635B0FA35718EE3875BFFC3E1949F96ECB8D2F7135` | `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `AF3F0D474F8052B402C8959A64ACF9E730F9AE60F09D90996A6306E9C2440F08` | `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `96B6AB55F0A7BF9B66F8EDBCB5CEFFA7E4FE35935C6CB12ECAB93FC04BC02856` | `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `0CE580976EA894EE4BD9C4ADBE3D7D1D524354A8FF22FC7E7CC6ACF89057AA53` | `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` |  |
| `4BCD3E34B62726FEA718EFB9C482D8C1F504BBE85EF32427BDF4D65A6832D8F1` | `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` |  |
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
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` |  |
| `DDC9DFACCC8230EC612126FDF29939A8E4311188566E5CFCAA724BD119E959E8` | `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `9ADE89B7B54F15CA9B64639469DAE1D9B79C24D5AC5E6FC17857384642FAF0FC` | `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` |  |
| `6E03C504C9B6A6058E0C0AA8D7A297086DD8F6F935F4F681E361699A6887CE62` | `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `6144958ED59E1F14D4DDE52AB82892DE377FCE10504B3B5AF171ADC95292D2F1` | `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
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
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` |  |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E662437641E2634539E09C674A84D353477E3BD05E31A1C11DC96ADC8B863B18` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | Cambiada en 60f1a28 (cierre de CHORE-03, O-25) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` |  |
| `DF08E12B2BA4C42CD58C0F1F2C09CD07D67B493C6E4FF27008CC5B1F4C796D36` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` | Ajustada (CLASES-03a r2, Arbitraje 2: INVENTARIO) |
| `66513D957E524AF5E336A2C7E656DF37F51106507A3984B691DF47CD825D4D10` | `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` |  |
| `A9529CEFBD27CBB94376A6548EF1B8B247FB1F4155938298AE5D10EAEE81008A` | `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `8BD0E034D4372D34BF145235372EFA27A150A38FD9A04EADB69FD48AC4E06D6C` | `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |
