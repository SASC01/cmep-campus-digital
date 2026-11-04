# Reporte del Tester — CALIFICACIONES-02 · exportar a Excel

> **Nota de transcripción (orquestador, 2026-11-04).** El arnés rechazó la escritura de este archivo por el tester en la ronda 0 de 02a. Por la regla de transcripción con cotejo (`AGENTS.md`, "Reglas del equipo"), el orquestador lo aplica tal cual desde el texto que entregó el tester, sin cambiar contenido. Cotejo: el `git diff --stat ff09e69 -- backend shared frontend` reproduce lo que declara el tester (2 archivos, 7 inserciones y 2 borrados: `backend/test/lecturas-fx-r1.ataque.test.ts` y `backend/test/sesiones-y-cadena.ataque.test.ts`). SHA-256 de este archivo en `aprobacion.md`.

## Ronda 0 — 02a
Veredicto: **PARADA (PA-01), solo para las corridas.** Apliqué C-1 y C-2 tal como las describe §D-R0. El recorrido de las `*.ataque` no encontró ninguna otra que rompa con el diseño, así que no hay PARADA de diseño. No corrí ninguna prueba del backend porque Docker Desktop está apagado y la red activa es `uacam5 2`, que nadie declaró de confianza para esta sesión.
Verificación propia: lint del backend **en verde** · test **sin ejecutar** (PA-01).

Fecha: 2026-11-04. Rama `feat/calificaciones-02`, base `ff09e69`. Plan: `plan.md`, SHA-256 `a25ccc638bea591b23cab7ff89e12e72c4a773f1d1d8bbf5265755ad4f2d09db`, que comprobé con `sha256sum`.

### PA-01
- `Get-NetConnectionProfile`: `uacam5 2`, categoría **Private**, con Internet.
- `ESTADO.md` (línea 480) la declara no confiable, con permiso solo para el 2026-10-05 y el 2026-10-06 ("En otra sesión, PA-01 vuelve a aplicar tal cual"). El `aprobacion.md` de este encargo no trae ninguna declaración para hoy.
- La regla del firewall "Campus: bloquear entrada a Docker en redes publicas" está habilitada solo en el perfil Público, así que no cubre esta red, que está en el perfil Privado.
- `docker info`: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
- Decide el humano: (a) declarar `uacam5 2` de confianza para la sesión y encender Docker, o (b) cambiar a `IZZI-F281` o `IZZI-F281-5G` con Docker encendido.

### C-1 y C-2 (lo único que cambié)
`git diff -U0` contra `ff09e69`: 2 archivos, 7 inserciones y 2 borrados. Se conservan los saltos de línea CRLF.
- **C-1**, `backend/test/sesiones-y-cadena.ataque.test.ts`, caso "bajo /api solo existen las rutas de …":
  - Comentario antes del `it`: "C-1 de CALIFICACIONES-02a (§D-R0): se agregan exactamente GET y HEAD de …/calificaciones/exportacion. No crea cuentas ni cambia roles y no es pública."
  - Título: "…, CLASES-03a y CLASES-03b: …" pasa a "…, CLASES-03a, CLASES-03b y CALIFICACIONES-02a: …".
  - Lista esperada: se agregan exactamente `"GET /api/clases/:claseId/calificaciones/exportacion"` y `"HEAD /api/clases/:claseId/calificaciones/exportacion"`, después de `…/alumnos/candidatos` y antes de `…/categorias` ("cal" < "cat").
- **C-2**, `backend/test/lecturas-fx-r1.ataque.test.ts`, caso "la opción solo se puede activar dentro de adapters/db: …":
  - Título: "dieciocho lecturas (… dos de recursos y dos de dudas)" pasa a "diecinueve lecturas (… dos de recursos, dos de dudas y una de la exportación)".
  - En `usos` se agrega `"adapters/db/exportacion-de-calificaciones.ts:1"` con el comentario "CALIFICACIONES-02a, C-2 (§D-R0; §D-2): leerExportacionDeCalificaciones corre en la instantánea única.", entre `entregas.ts:4` y `publicaciones.ts:2`.
  - Lo demás del caso no cambió.

### Estado esperado de C-1 y C-2 antes del programador (sin ejecutar, PA-01)
Las dos deben quedar en rojo hasta §D-2 y §D-3:
- **C-1:** al árbol de rutas le faltan GET y HEAD de `…/calificaciones/exportacion`.
- **C-2:** el adaptador nuevo no existe y `usos` no trae `exportacion-de-calificaciones.ts:1`.

No lo comprobé con una corrida. Lo confirmo cuando se levante PA-01 con `cd backend; npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts`, en una sola corrida. Espero un caso rojo por archivo y el resto en verde.

### Recorrido de las `*.ataque` del backend contra §D-0.6, §D-1, §D-2 y §D-3
Son 93 archivos: 87 en `backend/test/` y 6 en `backend/src/`. Busqué las que leen código o rutas (`readFileSync`, `readdirSync`, `import.meta.glob`, `printRoutes`, `onRoute`) y las que nombran el gradebook, `handlers/calificaciones.ts`, `adapters/db/index.ts`, `SIN_ACCESO_A_LA_CLASE`, `ERROR_INTERNO` o `email` en una revisión estática. Si el programador cumple §D-0.6, ninguna otra rompe:

| Prueba | Qué lee | Por qué no rompe |
|---|---|---|
| `calificaciones-estatico-01b-r1` CAL-T-68 | el código de `adapters/db/calificaciones.ts` | el archivo solo gana `export`; el correo vive en el archivo nuevo (§D-0.4) |
| `calificaciones-estatico-01b-r1` CAL-T-69 | `handlers/calificaciones.ts` desde el gradebook hasta el final, sin comentarios | §D-3 no tiene `inscripcion`, `maestros`, `maestroId`, `esDueno`, `propietario`, `accesoRestringido`, `.rol`, `try {`, `request.query.<x>` ni `request.(query\|params) as`; `validarParametros(…, request.query)` no casa |
| `calificaciones-estatico-01a-r1` CAL-T-20 y CAL-T-21 | `colas.ts` y `respuestas-de-entrega.ts` | 02a no toca esos archivos |
| `lecturas-fx-r1`: el resto del caso de C-2 | el texto crudo de `src/` | fuera de `adapters/db/` no aparecen `enTransaccion`, `instantaneaUnica`, `isolationLevel` ni `RepeatableRead`; `REPEATABLE READ` y `Serializable` están prohibidos por §D-0.6 |
| `lecturas-fx-r2` (O-4 y las llamadas de `listarPublicaciones`) | el texto crudo de `src/` | no hay borrados, `DELETE FROM` ni `TRUNCATE` (§D-0.6; §D-2 es solo lectura) |
| `muro-c-r1` (colas) | el texto crudo de `src/` | no aparecen `COLA_*`, `colaDePublicacion` ni los nombres de cola (§D-0.6) |
| `muro-c-r1` (visibles) y `muro-c-r2` (T-31) | `backend/src` y `frontend/src` | el diseño no trae `Default_Ignorable_Code_Point`, U+2800, U+1D159 ni `normalizarTextoLargo =` |
| `hilo-01c-r1`, `entregas-01b-r1`, `instantanea-01b-r1` y `tareas-01a-r1` | `FOR KEY SHARE`, `entregas.ts`, `tareas.ts`, `temas.ts` y `shared/src/entregas.ts` | §D-2 no bloquea ni usa SQL crudo, y 02a no toca esos archivos |
| `temas-01a-r1` y `temas-01a-r3` | las listas cerradas de `handlers/tareas/`, de `core/tareas/` y de cuatro archivos de `adapters/db` | el archivo nuevo no entra en esos prefijos |
| `tareas-01b-r1` | quién escribe en `notificaciones` | §D-2 no escribe |
| `arquitectura-cuentas-r1` | las capas, `obtenerDb` en los handlers y los `package.json` | §D-3 no obtiene el cliente y no hay dependencias nuevas |
| `alumnos-b-r1` | `inscripciones.ts` y `alumnos.ts` | 02a no toca esos archivos |
| `migracion-01a-r1`, `migracion-clases03a-r1` y `sexto-paso-02a-r1` | las migraciones | 02a no tiene migración |
| `guarda-*` y `nombres-guarda-r3` | la guarda `onRoute`, con apps propias | la cadena está completa y `:claseId` va en el tercer segmento (§D-0.2) |
| `intentos-r2` | `vi.mock` de `adapters/db/index.js` con `importOriginal` | reexportar más nombres no lo cambia |
| `gradebook-01b-r1`, `mis-calificaciones-01b-r1` y `calificaciones-instantanea-01b-r1` | el gradebook por la API y por `leerGradebook` | el contrato y `leerGradebook` no cambian |

**Fuera del backend:** `frontend/src/lib/errores-ch3-r2.ataque.test.ts` (T-01) lee `shared/src/*.ts` y `backend/src/{core,handlers,middleware,adapters}/**`. No rompe: §D-1, §D-2 y §D-3 no tienen literales `"<nombre>: <resto>"`, y `"/clases/:claseId/…"` no casa porque el nombre no admite `/`. Ninguna otra `*.ataque` del frontend lee `shared/src` ni `backend/src`, ni importa `@campus/shared` como espacio de nombres.

### Pendiente para cerrar la ronda 0
1. La corrida de los dos archivos, para mostrar los dos rojos.
2. La suite completa con PA-07 la corren el programador y la ronda 1.

### Comandos y última línea
- `cd backend; npm run lint`: código de salida 0. "All matched files use Prettier code style!" y los dos `tsc` sin errores.
- `npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts`: sin ejecutar (PA-01).
- La suite del backend y PA-07: sin ejecutar; no aplican en la ronda 0.

### SHA-256 de las `*.ataque` del backend (base de V-01 de 02a)
Sobre el árbol de trabajo (CRLF, `core.autocrlf=true`), con `find backend -name "*.ataque.test.ts" -not -path "*/node_modules/*" | sort | xargs sha256sum`, después de C-1 y C-2.
- Las otras 91 tenían el mismo hash antes de los cambios.
- Antes de los cambios, `sesiones-y-cadena` tenía `1920263a7207aa2655b6588f25592cb87366fa8a49539d79b8ef5eacaeb32558` y `lecturas-fx-r1` tenía `287b224cbaf468e3891c13e4f38a09d5a860d6cfe29ad35541c71076d7aae28c`.

Frontend: 153 `*.ataque`, sin cambios desde `ff09e69`. SHA-256 de la salida ordenada de `sha256sum` de las 153: `afb2c1023e0f0ebbd2f4544c306dc83666a428661f765ca596428161455abdb2`.

| Archivo | SHA-256 |
|---|---|
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` |
| `backend/src/config/env.ataque.test.ts` | `dcb78d222544e8dc4fbece59468f555b04abe971b70016e9bb17fcae3e958580` |
| `backend/src/config/logger.ataque.test.ts` | `71e7f049447d2d1ecedd897c55ea0b6d31221753f0a7e7473c7ac6e8667f0a95` |
| `backend/src/core/clases/codigo-r1.ataque.test.ts` | `91f620c1a27778eebc2bed5eec1bc9b0e3fe1199b32ed00f9dd910011d6a1805` |
| `backend/src/core/clases/codigo-r2.ataque.test.ts` | `262691f5786ad63b2393d0ba5ff97538f6dacf43343bed019ad23c12a07d8686` |
| `backend/src/workers/ritmo-03c-r1.ataque.test.ts` | `e769cbfcc3a83a64b51c6437f80684640a7c928ad6b8c5c1671fdff005d7b734` |
| `backend/test/admin-muro-02b-r1.ataque.test.ts` | `294be1af0bf69d6c05f54e2f0d8e587c78a5527d0b64d1a224c058e31ce013d0` |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` |
| `backend/test/alumnos-b-r1.ataque.test.ts` | `d2cc28b62bf988ae14ba975a9bc8d534aec0eebce30da93d7ded9a26026b0857` |
| `backend/test/alumnos-b-r2.ataque.test.ts` | `00346d471355abc7971b921649e7192b8987fe27912c00cb7e41aef2065369e9` |
| `backend/test/alumnos-b-r3.ataque.test.ts` | `fc11ab4b914d4a88612953f82db354e2b9cea9bef86e24321ef7e031f3ac3837` |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` |
| `backend/test/archivos-d-r1.ataque.test.ts` | `d9e1de5b1bd43f54cf3a4dcf153d1eeabdc36b4dec02fbeb9d8a0239f298dfe9` |
| `backend/test/archivos-d-r2.ataque.test.ts` | `1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9` |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` |
| `backend/test/arranque-r1.ataque.test.ts` | `38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716` |
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` |
| `backend/test/autoria-02b-r1.ataque.test.ts` | `6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713` |
| `backend/test/calificaciones-01a-r1.ataque.test.ts` | `5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9` |
| `backend/test/calificaciones-01a-r2.ataque.test.ts` | `afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc` |
| `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` | `dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416` |
| `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` | `b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07` |
| `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` | `29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869` |
| `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` | `6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e` |
| `backend/test/categorias-01a-r1.ataque.test.ts` | `6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db` |
| `backend/test/clases-r1.ataque.test.ts` | `95bba9bac44366ad5a361e93dd2f278cb0a1cc889fa479049acc7b45a9a5e71b` |
| `backend/test/clases-r2.ataque.test.ts` | `a87817d56c236c0ba3597214cac23b10483bbc28ae44800c592ed5ce2ef97f38` |
| `backend/test/clases-r3.ataque.test.ts` | `72de7d8af3d3f772abc19db065f6e418f6eb76ce78d87fe6ebb51335fc99825a` |
| `backend/test/clases-r4.ataque.test.ts` | `be97c4e48ac9551bed1d01552e90ab8cdf085cf928ae6c8c3d81809e35f7ce62` |
| `backend/test/concurrencia-02a-r1.ataque.test.ts` | `000ec9008c73d25121c82a46f5ea0f67e6c8c387cb04e361ef82812b57956098` |
| `backend/test/cuentas-03a-r1.ataque.test.ts` | `530546b4d70a2b9ad36f98f37e2af45480e81a1101ee3516d15426f78350bf82` |
| `backend/test/cuentas-r1.ataque.test.ts` | `6303ddc170545f616c66773c3f5475cb3be1fea9347d8059354d6ade8d676c16` |
| `backend/test/cuentas-r2.ataque.test.ts` | `3a4e81c111b8eeb7df065804aa85062fa3fc607f0147149b71ac21c14e7818d9` |
| `backend/test/cuentas-r3.ataque.test.ts` | `f54f79f7b2a83e95fe440053ccaf15cb3ebb01ce5dfd4c6655e22159a5fd7e6b` |
| `backend/test/cuerpos-02a-r2.ataque.test.ts` | `a2f9bff596330a7d55d1ca9d47197fc831eb132f52c759610e2d667895c3332f` |
| `backend/test/dudas-clases03b-r1.ataque.test.ts` | `4ea45eaa95c5ea2e1ec91e04d2bba32689a30bd341ade16625b28aabdb96d6d9` |
| `backend/test/enlaces-03b-r1.ataque.test.ts` | `d7a9da854ce8ab8ad8d2437db2e8c2a642a777ea3261a6b038da28be022df848` |
| `backend/test/enlaces-03b-r2.ataque.test.ts` | `dc1b7ee7ea58966f5db33ccb4581885a9669dea2263954ae46d17a83e1ef6eaf` |
| `backend/test/enlaces-ch-r2.ataque.test.ts` | `b051b1986496e35e3e306c4c6bc306a763542bca4b350574d0c02e2c484deb35` |
| `backend/test/entorno-ch-r1.ataque.test.ts` | `d28cc4de621a680e6b54b2bff889700300d558ec7849717584518d2f03ec8cae` |
| `backend/test/entregas-01b-r1.ataque.test.ts` | `47b02c6d3916713bf9236a619fdb59a641d2e805f1f0b7e9b2c161fe719ddc3a` |
| `backend/test/entregas-01b-r2.ataque.test.ts` | `5baaf6f8fb76320620ed4a84efaca2b2d473460f62360e0d48738b97a0ac584a` |
| `backend/test/formada-ch-r1.ataque.test.ts` | `ba1ac9b17cc9bf747522bd4ec8b87df436008482e643b18eea8e9a8c041c59b3` |
| `backend/test/gestion-02a-r1.ataque.test.ts` | `ec9602d5f109b45a6d428e708d9b6cdd37a7509a6ff9031fa6fd8a2da0e25e9b` |
| `backend/test/gradebook-01b-r1.ataque.test.ts` | `e4e9365ea010f3f670b6c1194d1a592e95db43bff0496d4ea1646fc5225ca8b4` |
| `backend/test/guarda-ch-r1.ataque.test.ts` | `5f4133f949d2f337a8f63b75cf82cb77114db7812d67c1960105f5000c31a326` |
| `backend/test/guarda-ch-r2.ataque.test.ts` | `7a7dac6d87edf81059fcff9c07471aaf49d690ec159be4b9fd4aa32b0909a215` |
| `backend/test/guarda-ch-r3.ataque.test.ts` | `610ee44e5d0bcea46eb4e3645f9adf1998a76947a25af7e3f8248ea3a633df79` |
| `backend/test/guarda-clase-r1.ataque.test.ts` | `e5d149f3ac52b726e1fe08908249706341330f88eaa6674b9a9ac67b98b1e864` |
| `backend/test/guarda-clase-r2.ataque.test.ts` | `c979d2c9c420a2177fa6ebddb78eb2ce84d5f043b94270f690916a6fc75d6f8f` |
| `backend/test/guarda-r2.ataque.test.ts` | `20982e2b98f1b162146a211923f3d5ec19d4e170c4aa3a5bfc6f82c3b6173aad` |
| `backend/test/hilo-01c-r1.ataque.test.ts` | `2649f3d357dcb806361ac101c57fcb504b9c798b631048f0b3e200f63da7dc30` |
| `backend/test/instantanea-01b-r1.ataque.test.ts` | `2d2216ee9db290b318825a6f73c346d4767cacc12d95f5ca76457a78b63fedc3` |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` |
| `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` | `2619b44eea3370494c95ac128fcfd9e3ffc20d1581a19f549bf371f603a11d7d` |
| `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` | `704155928183aec193ae7e157b86b3e9361d2b63c7a47be1ed859605fab4ffa6` |
| `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` | `dd9b7454e8786bf0b833d265900ccaecf595808cebc8e9a77c9aef15298a1038` |
| `backend/test/lecturas-fx-r1.ataque.test.ts` | `849134d1af25c6f4bae7225030dc123421d770cc253237ee8ec47b9fdc948529` |
| `backend/test/lecturas-fx-r2.ataque.test.ts` | `4090a21f3b389a24bc67d5f585440a55c39c8387112bdb35116863c5e609662c` |
| `backend/test/logs-02a-r1.ataque.test.ts` | `f9f9ec59ec8d1a5ccb180522798140c45604440f48edcd68a3e02863d90ae347` |
| `backend/test/logs-02b-r1.ataque.test.ts` | `a2006c163d9e6cd3e4a2a773d1501826daf3c8e7bb184d205bfc6442318fb59c` |
| `backend/test/logs-03a-r1.ataque.test.ts` | `bd8b303c434efec0785e0691d31d6f6e87dbf3305f50fa27cce0f78cbb251e3a` |
| `backend/test/logs-03b-r1.ataque.test.ts` | `b58d5d013658433fe5839634e2db5a31b8d2b8f69587bc36958752d3cd33bbf7` |
| `backend/test/logs-03c-r1.ataque.test.ts` | `0e4abf3bc5d92fa0c380805453190703862567930dd74b9e7fcc1809564d181f` |
| `backend/test/logs-archivos-d-r1.ataque.test.ts` | `1e775a19682f3a5995d7c035bcc810a36bf50c22045b6ffbfc5a98b821255db0` |
| `backend/test/logs-archivos-d-r3.ataque.test.ts` | `e9ce866d511e3ee6029015b74e20b4d342a60be99b3aac97e86f00283a3c77f1` |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `e008935b107752d203f6423b2f1c9e0f5a4339f0a77154746bf262cecb90351a` |
| `backend/test/logs-muro-c-r1.ataque.test.ts` | `690e30ed39111c0a074fc159015967cd9f0fdc24d9a340e6a0d7be4b980a9d45` |
| `backend/test/logs-muro-c-r2.ataque.test.ts` | `0809c60700e26183e7771b4b1a40b05cbf554c2ed7929190cf4d89a52722e551` |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` |
| `backend/test/migracion-01a-r1.ataque.test.ts` | `d6b9adaf1c14a61fe369f510774ef702cfa20f28f3cb19b0eb7357440dcb0783` |
| `backend/test/migracion-clases03a-r1.ataque.test.ts` | `2afd58e1ead0a293aa7bd58c639f3e5126d153a418f9a26450228468e12b2bed` |
| `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` | `bc6d49f9fc1f5eb20e305945fef57caeebeb108bff5d5cf4ba10b8040687d69c` |
| `backend/test/muro-c-r1.ataque.test.ts` | `d23bf1312777bdc000810e403a5b4d99c9c0e12998e4cc11be5ef5a2253f6935` |
| `backend/test/muro-c-r2.ataque.test.ts` | `7825cfc9b484df740fa0e9562a195d1bbcaf4caf72ea55fa847b5394ab96c125` |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `8b733b86fc6d54ece008389a59793fae4ec4a65146eb37215e900e50a5337d46` |
| `backend/test/nombres-ids-01a-r2.ataque.test.ts` | `3fd2583a4de7cd432b2e09a5130c23d6a59fa475e5e0aa69f23739351acbf9cf` |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` |
| `backend/test/nowait-ch-r1.ataque.test.ts` | `80b5a848f69b429e7dadec86c07bec1d3e3eed8a042efba41ce912ded39e7bab` |
| `backend/test/recursos-clases03a-r1.ataque.test.ts` | `42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d` |
| `backend/test/recursos-clases03a-r2.ataque.test.ts` | `ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516` |
| `backend/test/referencias-01b-r1.ataque.test.ts` | `ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21` |
| `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` | `6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5` |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `78680f5e046af46ed8e1b403dd5c2e81a1492eb1aa99e132fb26e4e6d92f0446` |
| `backend/test/sexto-paso-02a-r1.ataque.test.ts` | `70ac720f2e7fcadee5bbcb6414887ab08129dea7cd91df012046953b1584e8b6` |
| `backend/test/tareas-01a-r1.ataque.test.ts` | `c89c30851e6b409cd045017181147bf674df947762a8dea3f3fb981bd9b36e09` |
| `backend/test/tareas-01b-r1.ataque.test.ts` | `79bc7aafc11676d36129610a4b5cd5fe5d8234d0d748487fd2f3e48c5f772c79` |
| `backend/test/temas-01a-r1.ataque.test.ts` | `ae60c11cff5c82df4954db48582df4bd5a64957ff9afaf9712aa43a038f8e189` |
| `backend/test/temas-01a-r3.ataque.test.ts` | `dc7b86a621062ed671c1e7174a745019133fbd410c7a2e78114b2a2c50affe95` |
| `backend/test/worker-03c-r1.ataque.test.ts` | `f09e9a0038c47d1a2223376a0af260baf573f0c45bf770201c48c9e30296f04b` |
| `backend/test/worker-r1.ataque.test.ts` | `9f60f9d65d52d2021a1eb04e9f01d3cc68f22744c845bf93d6621aa4fe9713a8` |
| `backend/test/worker-r2.ataque.test.ts` | `77d11bd85f202a9eec92a363df82e63fb9a784ca9d368d49f62e61c1a2aa967b` |

### Cierre de la ronda 0 (tras levantar PA-01)
> Transcrito por el orquestador tal cual desde el texto del tester (2026-11-04), con la misma regla de la nota del inicio.

**Veredicto final de la ronda 0 de 02a: lista para el programador.** Apliqué C-1 y C-2 y quedaron en rojo por la razón que se esperaba. Ninguna otra `*.ataque` rompe con el diseño, así que no hay PARADA.

**PA-01, resuelta por el humano el 2026-11-04.** Su decisión literal fue "uacam es de confianza". Con eso, `uacam5 2` (categoría Privada) queda de confianza solo para esta sesión, y el humano acepta el riesgo residual de Ryuk. Está registrado en `aprobacion.md`. Docker Desktop está encendido: `docker info` devuelve `28.5.1`.

**Carga del equipo antes de correr (ESTADO §5).** Medí con `Get-CimInstance Win32_Processor` (LoadPercentage) y `Win32_OperatingSystem` (memoria libre):
- Primeras lecturas: 24 %, 32 %, 17 %, 27 %, 30 % y 30 %. No hubo dos seguidas en 25 % o menos.
- Serie dentro de un mismo proceso, cada 4 s: 32 %, 40 %, 20 %, 2 % y 21 %. Las últimas tres sí están en 25 % o menos.
- Memoria libre en todas las lecturas: 14 GB.
- Arranqué la corrida después de esa serie.

**Corrida única, sin nada en paralelo:**
```
cd backend; npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts
```
Código de salida: 1. Últimas líneas:
```
 Test Files  2 failed (2)
      Tests  2 failed | 57 passed (59)
   Start at  08:21:01
   Duration  48.51s (transform 3.03s, setup 146ms, import 9.86s, tests 22.27s, environment 0ms)
```

**Los dos rojos, uno por archivo, ambos los esperados:**
- **C-1, `test/sesiones-y-cadena.ataque.test.ts:579`**, en el caso "bajo /api solo existen las rutas de …, CLASES-03b y CALIFICACIONES-02a: …":
  - Falla con `AssertionError: expected [ …(115) ] to deeply equal [ …(117) ]`.
  - El diff solo marca como faltantes las dos rutas nuevas: `"GET /api/clases/:claseId/calificaciones/exportacion"` y `"HEAD /api/clases/:claseId/calificaciones/exportacion"`.
  - Motivo: la ruta de §D-3 todavía no existe.
- **C-2, `test/lecturas-fx-r1.ataque.test.ts:805`**, en el caso "… diecinueve lecturas (… dos de dudas y una de la exportación)":
  - Falla con `AssertionError: expected [ …(7) ] to deeply equal [ …(8) ]`.
  - El diff solo marca como faltante `"adapters/db/exportacion-de-calificaciones.ts:1"`.
  - Motivo: el adaptador de §D-2 todavía no existe.
  - Las aserciones anteriores del caso pasaron, porque la de la línea 805 es la que falla: nadie fuera de `adapters/db` nombra la opción, `index.ts` no reexporta `enTransaccion`, los niveles solo viven en `cliente.ts` y los dos usos de `tareas.ts` están en código.

Los otros 57 casos de los dos archivos están en verde. En la salida no aparece ninguna vez `40P01`, `deadlock detected`, `could not serialize` ni `too many clients`. No es una corrida completa, así que PA-07 no aplica.

**Integridad.** `sha256sum` después de la corrida:
- `backend/test/sesiones-y-cadena.ataque.test.ts`: `78680f5e046af46ed8e1b403dd5c2e81a1492eb1aa99e132fb26e4e6d92f0446`
- `backend/test/lecturas-fx-r1.ataque.test.ts`: `849134d1af25c6f4bae7225030dc123421d770cc253237ee8ec47b9fdc948529`

Son los mismos de la tabla de V-01. `git status --short backend shared frontend` solo muestra esos dos archivos como modificados.

## Ronda 1 — 02a
Veredicto: **RESISTE.** No hay hallazgos: 0 críticos, 0 altos, 0 medios y 0 bajos.
Verificación propia: lint del backend y del frontend en verde · test del backend 234/2806 y del frontend 272/5953 en verde · build de shared, del backend y del frontend en verde · PA-07 limpia.

Fecha: 2026-11-04. Rama `feat/calificaciones-02`, base `ff09e69`, sin commit. Plan `a25ccc63…`. Resumen del programador `8bf1b597…`, aceptado por el manager.
Entorno: `uacam5 2` de confianza solo para esta sesión (decisión del humano, en `aprobacion.md`) y Docker `28.5.1`. Corrí una suite a la vez.

### V-01
Comparé las 93 `*.ataque` del backend con la tabla de la ronda 0 (`find backend -name "*.ataque.test.ts" -not -path "*/node_modules/*" | sort | xargs sha256sum`). Las 93 son idénticas, C-1 y C-2 incluidas (`78680f5e…` y `849134d1…`). La única diferencia es mi archivo nuevo, `backend/test/exportacion-02a-r1.ataque.test.ts`.
Frontend: las 153 `*.ataque` no cambiaron. El SHA-256 de la lista ordenada sigue siendo `afb2c1023e0f0ebbd2f4544c306dc83666a428661f765ca596428161455abdb2`, y `git status` no muestra cambios en `frontend/`.

### Pruebas nuevas
Archivo: `backend/test/exportacion-02a-r1.ataque.test.ts`, con 10 casos, todos en verde. La app registra en nivel `error`, así que mis `P2028` provocados no entran en el conteo de PA-07. Las fechas límite son fijas (`2026-12-01T12:00:00Z`).

| Caso | Qué ataca | Resultado |
|---|---|---|
| CAL2-T-01 | Con el pool lleno (10 de 10), `leerExportacionDeCalificaciones` rechaza con `AppError` 503 `SERVICIO_OCUPADO` (causa `P2028`) en menos de 4.5 s, y responde al soltar el pool | resiste |
| CAL2-T-02 | La transacción vence entre dos sentencias: un gancho espera 5.5 s después de `clase.findUnique`. Rechaza con 503 `SERVICIO_OCUPADO` (causa `P2028`), nunca con 500 ni con una respuesta a medias | resiste |
| CAL2-T-03 | GET y HEAD de la ruta lanzados con el pool lleno y liberados a los 2.5 s: responden 200 o 503, nunca 500 | resiste |
| CAL2-T-04 | La instantánea cubre la cuarta sentencia (los correos). Otra conexión cambia el correo de un alumno y desactiva a otro justo después de `inscripcion.count`. Esa respuesta trae los correos viejos y a los tres alumnos, sin 500; la siguiente lectura ve el correo nuevo y ya no trae a la desactivada | resiste |
| CAL2-T-05 | `cursor` con el id de alguien que existe pero no es alumno de la clase: un alumno de otra clase, la maestra, el comaestro o el admin. Responde 200 solo con alumnos de la clase, sigue desde la clave del cursor (el de "beto" da `[carlos, elena]`), `totalAlumnos` sigue en 3 y no aparece el correo de ningún maestro ni del alumno de fuera | resiste |
| CAL2-T-06 | Bordes de la consulta en GET y HEAD. Responden 400 `VALIDACION` (HEAD sin cuerpo): `100.5`, `-1`, `Infinity`, repetidos, vacío y `101` en `limite` y en `limiteTareas`; un `cursor` que es una tarea; un `cursorTareas` que es un material o un usuario; cursores que no son UUID. Los campos de más (`estadoPago`, `rol`) no cambian la respuesta | resiste |
| CAL2-T-07 | `claseId` en mayúsculas responde lo mismo que en minúsculas, para el maestro y para el admin, en GET y en HEAD | resiste |
| CAL2-T-08 | El comaestro retirado entre dos ventanas recibe 403 `SIN_ACCESO_A_LA_CLASE` en la segunda (GET y HEAD), sin correos; una maestra desactivada recibe 401 | resiste |
| CAL2-T-09 | Clase de 101 alumnos × 101 tareas con los límites por omisión. La primera respuesta trae 100 × 100 con los dos cursores y llega en menos de 15 s. Las cuatro ventanas dan cada alumno, cada tarea y cada celda (10,201) una sola vez, con totales de 101 en todas y las dos calificadas en su lugar (las de las esquinas, en ventanas distintas) | resiste |
| CAL2-T-10 | La autorización va antes que la consulta. Con límites y cursores inválidos: el maestro ajeno y una clase inexistente (maestro o admin) responden 403 `SIN_ACCESO_A_LA_CLASE`, y la del ajeno es idéntica a la de la clase inexistente; el alumno inscrito responde 403 `ROL_NO_PERMITIDO`. Nunca 400 | resiste |

El punto que el manager me dejó, el `503 SERVICIO_OCUPADO` por `P2028`, queda cubierto así:
- **Determinista en el adaptador**, por sus dos caminos: el `maxWait` con el pool lleno (T-01) y el `timeout` de la transacción (T-02).
- **En la ruta, sin determinismo**: T-03 solo afirma que la respuesta es "200 o 503, nunca 500". En la ruta no hay forma determinista de forzar el `P2028` sin retener una tabla compartida por las demás pruebas de la corrida. Las consultas de la cadena (autenticación y sexto paso) esperan conexión fuera de una transacción, así que con el pool lleno el resultado depende del orden. La traducción de `P2028` a 503 vive en `enTransaccion` y en el envoltorio único de errores, que ya probaba CHORE-02.

### Atacado sin hallazgos (además de lo anterior)
- **Revisión estática** de `adapters/db/exportacion-de-calificaciones.ts` y de la ruta nueva:
  - sin `console.`, `$queryRawUnsafe` ni `Promise.all`;
  - sin `obtenerDb`, `@prisma` ni `.rol` en el handler;
  - la cadena es exactamente `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`;
  - el adaptador solo selecciona `nombre` (clase) y `id` y `email` (usuarios);
  - `calificaciones.ts` solo gana `export`.
- **Puntos de las tareas congelados** una vez calificadas (`exigirRubricaCongelada`). Un porcentaje por encima de 100 no puede romper el `parse` estricto: no es un camino.
- **Inscribir a un maestro como alumno** no es posible por la API: alta manual solo de `rol: "estudiante"` y unirse solo como estudiante. Por eso la exportación no puede traer el correo de un maestro como fila.
- **Lo que ya cubren las pruebas requeridas** no lo dupliqué: P-13 (CAL2-A02), quién aparece (A03), mismo cálculo que el gradebook (A04), ventanas 2 × 2 (A05), vacíos (A06), instantánea de celdas, inscripciones y tareas (A07), N+1 (A10). Las leí y cubren lo que dicen.

### Observación (no es hallazgo)
- **O-r1-1.** `z.coerce.number()` de `exportacionQuerySchema` acepta `limite=0x64`, `1e2` y ` 100 ` como 100. Lo comprobé con `node` sobre `@campus/shared`. `gradebookQuerySchema` hace lo mismo (`0x32` da 50): es el patrón de todo el proyecto, no viola ningún requisito y no permite pasar del tope de 100.

### No atacado y por qué
- **El `P2028` determinista en la ruta**: por lo explicado en el apartado de CAL2-T-03 (retener una tabla compartida contaminaría la corrida completa).
- **Frontend**: 02a no lo toca. Solo corrí su lint, sus pruebas y su build porque `shared/` cambió.

### PA-07 (`cd backend; npm run test`, salida en el scratchpad `r1-backend-test.txt`)
| Término | Conteo |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente el inventario |
| `"code":"P2028"` | 5, todos permitidos |

- **Control positivo, completo.** Los tres de `servicio-ocupado.integracion.test.ts`, nivel 40, `pid` 12296:
  - `POST /api/auth/cambiar-contrasena` (`req-1`) › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` (`req-3`) › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` (`req-5`) › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3.ataque`**, `pid` 5016:
  - `POST /api/auth/login` (`req-1m`) › `tx.sesion.create()`;
  - `POST /api/auth/restablecer` (`req-20`) › `tx.tokenCuenta.updateMany()`.
- **Ningún `P2028` fuera de la lista.**
- **Los 10 "Error no controlado", iguales al inventario:**
  - 6 de `intentos-r2.ataque` (`pid` 4376, `POST /api/auth/login`): 5 "fallo simulado de la base en la búsqueda" y 1 "… al crear la sesión";
  - 3 `ZodError` de `archivos-d-r2.ataque` (`pid` 10260, rutas de archivos);
  - 1 `boom` de `salud.integracion` (`pid` 10192, `GET /api/prueba/error-comun`).
- **Atribución por app**, por `pid` y `requestId`.

### Comandos y última línea
Antes de cada corrida medí la carga (ESTADO §5). Las dos lecturas seguidas quedaron en 25 % o menos:
- antes del archivo de ataque: 12 % y 11 %;
- antes de la suite del backend: 2 % y 4 %;
- antes de la del frontend: 4 % y 9 %.

| Comando | Salida | Última línea |
|---|---|---|
| `cd backend; npx vitest run test/exportacion-02a-r1.ataque.test.ts` | 0 | `Tests  10 passed (10)` · `Duration  27.03s` |
| `cd shared; npm run build` | 0 | `> tsc -p tsconfig.json` |
| `cd backend; npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| `cd backend; npm run test` | 0 | `Test Files  234 passed (234)` · `Tests  2806 passed (2806)` · `Duration  161.70s` |
| `cd backend; npm run build` | 0 | `> tsc -p tsconfig.json` |
| `cd frontend; npm run lint` | 0 | (sin errores) |
| `cd frontend; npm run test` | 0 | `Test Files  272 passed (272)` · `Tests  5953 passed (5953)` · `Duration  251.01s` |
| `cd frontend; npm run build` | 0 | `✓ built in 785ms` (solo el aviso de siempre sobre el tamaño de los chunks) |

Las cifras cuadran con las del manager:
- Backend: 233 archivos y 2796 pruebas, más mi archivo con 10 casos, dan 234 y 2806.
- Frontend: 272 archivos y 5953 pruebas, sin cambio.

### SHA-256 de las `*.ataque` del backend al cierre de la ronda 1 de 02a (base de V-01 de la ronda siguiente)
Son 94: las 93 de la tabla de la ronda 0, sin cambios, y una nueva. Comando: el de V-01, sobre el árbol de trabajo (CRLF).

| Archivo | SHA-256 | Nota |
|---|---|---|
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` |  |
| `backend/src/config/env.ataque.test.ts` | `dcb78d222544e8dc4fbece59468f555b04abe971b70016e9bb17fcae3e958580` |  |
| `backend/src/config/logger.ataque.test.ts` | `71e7f049447d2d1ecedd897c55ea0b6d31221753f0a7e7473c7ac6e8667f0a95` |  |
| `backend/src/core/clases/codigo-r1.ataque.test.ts` | `91f620c1a27778eebc2bed5eec1bc9b0e3fe1199b32ed00f9dd910011d6a1805` |  |
| `backend/src/core/clases/codigo-r2.ataque.test.ts` | `262691f5786ad63b2393d0ba5ff97538f6dacf43343bed019ad23c12a07d8686` |  |
| `backend/src/workers/ritmo-03c-r1.ataque.test.ts` | `e769cbfcc3a83a64b51c6437f80684640a7c928ad6b8c5c1671fdff005d7b734` |  |
| `backend/test/admin-muro-02b-r1.ataque.test.ts` | `294be1af0bf69d6c05f54e2f0d8e587c78a5527d0b64d1a224c058e31ce013d0` |  |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` |  |
| `backend/test/alumnos-b-r1.ataque.test.ts` | `d2cc28b62bf988ae14ba975a9bc8d534aec0eebce30da93d7ded9a26026b0857` |  |
| `backend/test/alumnos-b-r2.ataque.test.ts` | `00346d471355abc7971b921649e7192b8987fe27912c00cb7e41aef2065369e9` |  |
| `backend/test/alumnos-b-r3.ataque.test.ts` | `fc11ab4b914d4a88612953f82db354e2b9cea9bef86e24321ef7e031f3ac3837` |  |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` |  |
| `backend/test/archivos-d-r1.ataque.test.ts` | `d9e1de5b1bd43f54cf3a4dcf153d1eeabdc36b4dec02fbeb9d8a0239f298dfe9` |  |
| `backend/test/archivos-d-r2.ataque.test.ts` | `1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9` |  |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` |  |
| `backend/test/arranque-r1.ataque.test.ts` | `38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716` |  |
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` |  |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` |  |
| `backend/test/autoria-02b-r1.ataque.test.ts` | `6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713` |  |
| `backend/test/calificaciones-01a-r1.ataque.test.ts` | `5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9` |  |
| `backend/test/calificaciones-01a-r2.ataque.test.ts` | `afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc` |  |
| `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` | `dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416` |  |
| `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` | `b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07` |  |
| `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` | `29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869` |  |
| `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` | `6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e` |  |
| `backend/test/categorias-01a-r1.ataque.test.ts` | `6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db` |  |
| `backend/test/clases-r1.ataque.test.ts` | `95bba9bac44366ad5a361e93dd2f278cb0a1cc889fa479049acc7b45a9a5e71b` |  |
| `backend/test/clases-r2.ataque.test.ts` | `a87817d56c236c0ba3597214cac23b10483bbc28ae44800c592ed5ce2ef97f38` |  |
| `backend/test/clases-r3.ataque.test.ts` | `72de7d8af3d3f772abc19db065f6e418f6eb76ce78d87fe6ebb51335fc99825a` |  |
| `backend/test/clases-r4.ataque.test.ts` | `be97c4e48ac9551bed1d01552e90ab8cdf085cf928ae6c8c3d81809e35f7ce62` |  |
| `backend/test/concurrencia-02a-r1.ataque.test.ts` | `000ec9008c73d25121c82a46f5ea0f67e6c8c387cb04e361ef82812b57956098` |  |
| `backend/test/cuentas-03a-r1.ataque.test.ts` | `530546b4d70a2b9ad36f98f37e2af45480e81a1101ee3516d15426f78350bf82` |  |
| `backend/test/cuentas-r1.ataque.test.ts` | `6303ddc170545f616c66773c3f5475cb3be1fea9347d8059354d6ade8d676c16` |  |
| `backend/test/cuentas-r2.ataque.test.ts` | `3a4e81c111b8eeb7df065804aa85062fa3fc607f0147149b71ac21c14e7818d9` |  |
| `backend/test/cuentas-r3.ataque.test.ts` | `f54f79f7b2a83e95fe440053ccaf15cb3ebb01ce5dfd4c6655e22159a5fd7e6b` |  |
| `backend/test/cuerpos-02a-r2.ataque.test.ts` | `a2f9bff596330a7d55d1ca9d47197fc831eb132f52c759610e2d667895c3332f` |  |
| `backend/test/dudas-clases03b-r1.ataque.test.ts` | `4ea45eaa95c5ea2e1ec91e04d2bba32689a30bd341ade16625b28aabdb96d6d9` |  |
| `backend/test/enlaces-03b-r1.ataque.test.ts` | `d7a9da854ce8ab8ad8d2437db2e8c2a642a777ea3261a6b038da28be022df848` |  |
| `backend/test/enlaces-03b-r2.ataque.test.ts` | `dc1b7ee7ea58966f5db33ccb4581885a9669dea2263954ae46d17a83e1ef6eaf` |  |
| `backend/test/enlaces-ch-r2.ataque.test.ts` | `b051b1986496e35e3e306c4c6bc306a763542bca4b350574d0c02e2c484deb35` |  |
| `backend/test/entorno-ch-r1.ataque.test.ts` | `d28cc4de621a680e6b54b2bff889700300d558ec7849717584518d2f03ec8cae` |  |
| `backend/test/entregas-01b-r1.ataque.test.ts` | `47b02c6d3916713bf9236a619fdb59a641d2e805f1f0b7e9b2c161fe719ddc3a` |  |
| `backend/test/entregas-01b-r2.ataque.test.ts` | `5baaf6f8fb76320620ed4a84efaca2b2d473460f62360e0d48738b97a0ac584a` |  |
| `backend/test/exportacion-02a-r1.ataque.test.ts` | `885668a621af11f17b4ac706db705aef33231b7773e4783147d21b318bdd0f9a` | Nueva (CALIFICACIONES-02a r1) |
| `backend/test/formada-ch-r1.ataque.test.ts` | `ba1ac9b17cc9bf747522bd4ec8b87df436008482e643b18eea8e9a8c041c59b3` |  |
| `backend/test/gestion-02a-r1.ataque.test.ts` | `ec9602d5f109b45a6d428e708d9b6cdd37a7509a6ff9031fa6fd8a2da0e25e9b` |  |
| `backend/test/gradebook-01b-r1.ataque.test.ts` | `e4e9365ea010f3f670b6c1194d1a592e95db43bff0496d4ea1646fc5225ca8b4` |  |
| `backend/test/guarda-ch-r1.ataque.test.ts` | `5f4133f949d2f337a8f63b75cf82cb77114db7812d67c1960105f5000c31a326` |  |
| `backend/test/guarda-ch-r2.ataque.test.ts` | `7a7dac6d87edf81059fcff9c07471aaf49d690ec159be4b9fd4aa32b0909a215` |  |
| `backend/test/guarda-ch-r3.ataque.test.ts` | `610ee44e5d0bcea46eb4e3645f9adf1998a76947a25af7e3f8248ea3a633df79` |  |
| `backend/test/guarda-clase-r1.ataque.test.ts` | `e5d149f3ac52b726e1fe08908249706341330f88eaa6674b9a9ac67b98b1e864` |  |
| `backend/test/guarda-clase-r2.ataque.test.ts` | `c979d2c9c420a2177fa6ebddb78eb2ce84d5f043b94270f690916a6fc75d6f8f` |  |
| `backend/test/guarda-r2.ataque.test.ts` | `20982e2b98f1b162146a211923f3d5ec19d4e170c4aa3a5bfc6f82c3b6173aad` |  |
| `backend/test/hilo-01c-r1.ataque.test.ts` | `2649f3d357dcb806361ac101c57fcb504b9c798b631048f0b3e200f63da7dc30` |  |
| `backend/test/instantanea-01b-r1.ataque.test.ts` | `2d2216ee9db290b318825a6f73c346d4767cacc12d95f5ca76457a78b63fedc3` |  |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` |  |
| `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` | `2619b44eea3370494c95ac128fcfd9e3ffc20d1581a19f549bf371f603a11d7d` |  |
| `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` | `704155928183aec193ae7e157b86b3e9361d2b63c7a47be1ed859605fab4ffa6` |  |
| `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` | `dd9b7454e8786bf0b833d265900ccaecf595808cebc8e9a77c9aef15298a1038` |  |
| `backend/test/lecturas-fx-r1.ataque.test.ts` | `849134d1af25c6f4bae7225030dc123421d770cc253237ee8ec47b9fdc948529` |  |
| `backend/test/lecturas-fx-r2.ataque.test.ts` | `4090a21f3b389a24bc67d5f585440a55c39c8387112bdb35116863c5e609662c` |  |
| `backend/test/logs-02a-r1.ataque.test.ts` | `f9f9ec59ec8d1a5ccb180522798140c45604440f48edcd68a3e02863d90ae347` |  |
| `backend/test/logs-02b-r1.ataque.test.ts` | `a2006c163d9e6cd3e4a2a773d1501826daf3c8e7bb184d205bfc6442318fb59c` |  |
| `backend/test/logs-03a-r1.ataque.test.ts` | `bd8b303c434efec0785e0691d31d6f6e87dbf3305f50fa27cce0f78cbb251e3a` |  |
| `backend/test/logs-03b-r1.ataque.test.ts` | `b58d5d013658433fe5839634e2db5a31b8d2b8f69587bc36958752d3cd33bbf7` |  |
| `backend/test/logs-03c-r1.ataque.test.ts` | `0e4abf3bc5d92fa0c380805453190703862567930dd74b9e7fcc1809564d181f` |  |
| `backend/test/logs-archivos-d-r1.ataque.test.ts` | `1e775a19682f3a5995d7c035bcc810a36bf50c22045b6ffbfc5a98b821255db0` |  |
| `backend/test/logs-archivos-d-r3.ataque.test.ts` | `e9ce866d511e3ee6029015b74e20b4d342a60be99b3aac97e86f00283a3c77f1` |  |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `e008935b107752d203f6423b2f1c9e0f5a4339f0a77154746bf262cecb90351a` |  |
| `backend/test/logs-muro-c-r1.ataque.test.ts` | `690e30ed39111c0a074fc159015967cd9f0fdc24d9a340e6a0d7be4b980a9d45` |  |
| `backend/test/logs-muro-c-r2.ataque.test.ts` | `0809c60700e26183e7771b4b1a40b05cbf554c2ed7929190cf4d89a52722e551` |  |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` |  |
| `backend/test/migracion-01a-r1.ataque.test.ts` | `d6b9adaf1c14a61fe369f510774ef702cfa20f28f3cb19b0eb7357440dcb0783` |  |
| `backend/test/migracion-clases03a-r1.ataque.test.ts` | `2afd58e1ead0a293aa7bd58c639f3e5126d153a418f9a26450228468e12b2bed` |  |
| `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` | `bc6d49f9fc1f5eb20e305945fef57caeebeb108bff5d5cf4ba10b8040687d69c` |  |
| `backend/test/muro-c-r1.ataque.test.ts` | `d23bf1312777bdc000810e403a5b4d99c9c0e12998e4cc11be5ef5a2253f6935` |  |
| `backend/test/muro-c-r2.ataque.test.ts` | `7825cfc9b484df740fa0e9562a195d1bbcaf4caf72ea55fa847b5394ab96c125` |  |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `8b733b86fc6d54ece008389a59793fae4ec4a65146eb37215e900e50a5337d46` |  |
| `backend/test/nombres-ids-01a-r2.ataque.test.ts` | `3fd2583a4de7cd432b2e09a5130c23d6a59fa475e5e0aa69f23739351acbf9cf` |  |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` |  |
| `backend/test/nowait-ch-r1.ataque.test.ts` | `80b5a848f69b429e7dadec86c07bec1d3e3eed8a042efba41ce912ded39e7bab` |  |
| `backend/test/recursos-clases03a-r1.ataque.test.ts` | `42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d` |  |
| `backend/test/recursos-clases03a-r2.ataque.test.ts` | `ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516` |  |
| `backend/test/referencias-01b-r1.ataque.test.ts` | `ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21` |  |
| `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` | `6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5` |  |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `78680f5e046af46ed8e1b403dd5c2e81a1492eb1aa99e132fb26e4e6d92f0446` |  |
| `backend/test/sexto-paso-02a-r1.ataque.test.ts` | `70ac720f2e7fcadee5bbcb6414887ab08129dea7cd91df012046953b1584e8b6` |  |
| `backend/test/tareas-01a-r1.ataque.test.ts` | `c89c30851e6b409cd045017181147bf674df947762a8dea3f3fb981bd9b36e09` |  |
| `backend/test/tareas-01b-r1.ataque.test.ts` | `79bc7aafc11676d36129610a4b5cd5fe5d8234d0d748487fd2f3e48c5f772c79` |  |
| `backend/test/temas-01a-r1.ataque.test.ts` | `ae60c11cff5c82df4954db48582df4bd5a64957ff9afaf9712aa43a038f8e189` |  |
| `backend/test/temas-01a-r3.ataque.test.ts` | `dc7b86a621062ed671c1e7174a745019133fbd410c7a2e78114b2a2c50affe95` |  |
| `backend/test/worker-03c-r1.ataque.test.ts` | `f09e9a0038c47d1a2223376a0af260baf573f0c45bf770201c48c9e30296f04b` |  |
| `backend/test/worker-r1.ataque.test.ts` | `9f60f9d65d52d2021a1eb04e9f01d3cc68f22744c845bf93d6621aa4fe9713a8` |  |
| `backend/test/worker-r2.ataque.test.ts` | `77d11bd85f202a9eec92a363df82e63fb9a784ca9d368d49f62e61c1a2aa967b` |  |

## Ronda 0 — 02b
Veredicto: **lista para el programador.** Apliqué C-3 y C-4 tal como las fija §D-R0. Las dos quedan en rojo por el motivo esperado y ninguna otra `*.ataque` del frontend ni del backend rompe con el diseño, así que no hay PARADA.

Fecha: 2026-11-04. Rama `feat/calificaciones-02`. Base de 02b dentro de los paquetes: `<K2a>` = `57192e2`, y `git diff --quiet 57192e2 -- frontend shared backend` estaba limpio antes de mis cambios. Plan `a25ccc63…`, sin cambios. DH-01 en (a), el escritor propio de `lib/xlsx.ts`, con el control H-0 a mitad de 02b; el paso a `write-excel-file` está autorizado de antemano.

### C-3 y C-4 (lo único que cambié)
`git diff -U0 -- frontend`: 2 archivos, 5 inserciones y 3 borrados. Las dos usan saltos LF, como en `57192e2`, y pasan `prettier --check` y `eslint`.
- **C-3** · `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts:47` (CAL-T-182): `expect(MODULO.length).toBe(11)` pasa a `toBe(12)`. Nada más.
- **C-4** · `frontend/src/styles/clases-r1.ataque.test.ts` (V-06):
  - el título "… 71 enEspera" pasa a "… 72 enEspera";
  - `expect(usos).toHaveLength(71)` pasa a `toHaveLength(72)` (línea 177);
  - `fijos` suma `"/src/features/calificaciones/components/exportar-a-excel.tsx": 1`, al final de la lista, con el comentario literal del plan: "C-4 de CALIFICACIONES-02b (§D-R0; §D-7): de 71 a 72, «Exportar a Excel». Sigue protegiendo que el número y el lugar de los botones con espera cambien solo con el plan."
  - Lo demás del caso no cambió (los `disabled`, `aria-busy` y los restos de admin y clases).

### Corrida de los dos archivos (rojo esperado hasta el programador)
Carga antes de correr (ESTADO §5): la primera serie dio 63, 35, 43 y 40 %, con aplicaciones del humano abiertas y sin ningún `vitest` en marcha. Esperé, y la segunda serie dio 43, **25, 23 y 25**, y 36 %. Corrí con tres lecturas seguidas en 25 % o menos, sin nada en paralelo.
```
cd frontend; npx vitest run src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/styles/clases-r1.ataque.test.ts
```
Código de salida 1. Últimas líneas:
```
 Test Files  2 failed (2)
      Tests  2 failed | 19 passed (21)
   Start at  10:04:16
   Duration  11.69s (transform 11.05s, setup 1.75s, import 14.01s, tests 395ms, environment 6.02s)
```
Hay exactamente un rojo por archivo, y los dos son los esperados:
- **C-3, CAL-T-182** (`estatico-01d-r1.ataque.test.ts:47`): `expected 11 to be 12`, porque `components/exportar-a-excel.tsx` todavía no existe.
- **C-4, V-06** (`clases-r1.ataque.test.ts:177`): `expected [ …(71) ] to have a length of 72 but got 71`, por la misma razón.

Los otros 19 casos de los dos archivos están en verde.

### Recorrido de las `*.ataque` del frontend (153) contra §D-0.6, §D-5.1, §D-5.2, §D-6, §D-7 y §D-8
Busqué las que leen código en crudo: 29 con `import.meta.glob` o `readFileSync`, 33 con `?raw`. También busqué las que pintan el gradebook y cuentan botones, avisos o foco. Si el programador cumple §D-0.6, ninguna rompe:

| Prueba | Qué vigila | Por qué no rompe |
|---|---|---|
| `styles/clases-r1` V-02 a V-05 | colores de la paleta, escalas anuladas, `#hex`, `rgb(`, `-[` de tipografía, `ring-`, `focus:`, en todo `src/` de producción, por línea | probé los literales de §D-5.1 contra las expresiones: no tienen `#`, `rgb(` ni `fill-gray` (`patternType="gray125"` no lleva guion); `String(` no casa con `\bring-` |
| `styles/clases-r1` V-06 (fuera de C-4), V-07, V-13 y el Toaster | `disabled` en JSX, `aria-busy=` solo en `button.tsx`, vidrio, texto rojo, `components/ui/sonner` solo en `providers.tsx` | el botón usa `Button` con `enEspera`, sin `disabled` (§D-0.6, comentarios incluidos), sin vidrio ni rojo; `toast` viene de `sonner`, no de `components/ui/sonner` |
| `components/layout/estatico-r1`: valores arbitrarios | `-[…]` en cualquier línea de producción `.ts`/`.tsx` fuera de `components/ui/` (lista cerrada) | los literales y expresiones del plan (`/[\\/:*?"<>|]/g`, `/_(?=x[0-9A-Fa-f]{4}_)/g`) no tienen `-[`. Ver V-r0b-1 |
| `components/layout/estatico-r1`: `href` y V-15/V-16 | `href="#"`, `javascript:`, `<a … href="…">` en cualquier línea (comentarios incluidos en la tercera), `fixed`, `animate-`, `@keyframes` | `descargaService.ts` asigna `enlace.href = url` en TS, sin `#` ni `<a` literal. Ver V-r0b-1 |
| `features/calificaciones/estatico-01d-r1` CAL-T-185 a 192 | emojis, `primary`, textos sueltos, `fixed`, `-[…]`, `text-danger`, avisos solo donde toca, reloj fijo, sin `return` temprano | §D-7: `outline`, textos en `data.ts`, avisos en `exportar-a-excel.tsx` (CAL-T-189 solo mira `gradebook-view.tsx`, `hooks.ts` y `mis-calificaciones-view.tsx`), emojis con `\u{…}` (CAL2-B06). CAL-T-191 cubre **toda** prueba de `features/calificaciones/` que tenga `new Date(` o una fecha ISO: le exige `useFakeTimers(` y `setSystemTime(`. `\bfixed\b` no casa con `toFixed` |
| `features/calificaciones/gradebook-01d-r1` a `r3`, `secciones-01d-r3`/`r4`, `app/rutas-01d-r1` | botones de la vista en espera mientras llega una ventana (CAL-T-149), `[aria-busy]` nulo al llegar, avisos y conteo de peticiones | `enEspera={exportar.isPending \|\| pidiendoLaVentana}` cumple CAL-T-149. Las consultas por nombre (`/Alumnos\|Tareas/`, "Alumnos siguientes") no ven "Exportar a Excel". La exportación no pide nada sin un clic. Ninguna cuenta todos los botones de la página ni recorre el orden con Tab |
| `features/clases/errores-ch3-r1` O-05 (alcance `features/clases` y `features/calificaciones`, crudo) | `/^[…]+:`, `\w`, `\S`, `[^:]`, `.+?`, `\p{L}`, `new RegExp(`, `.split(":")`, `.indexOf(":")`, y `.message` fuera de dos formas permitidas | §D-0.6 y §D-6, punto 4. §D-7 no lee `.message`: usa `esErrorDeCursorDeCalificaciones` y `mensajeDeErrorCalificaciones` |
| `lib/estatico-ch3-r1` y `r2` | `.message` solo en tres archivos aprobados (toda la producción); muestras crudas del mensaje; invisibles literales en producción; `reset()` condicionado a `isError` | `lib/xlsx.ts` lanza `new Error(…)` sin leer `.message`; `lib/lector-xlsx-de-prueba.ts` es producción por su nombre y no lo lee (§D-0.6); los de control y dirección van por punto de código, no literales; §D-7 no reinicia la mutación |
| `lib/errores-ch3-r1` | `esErrorDeCursor` nunca pasada como referencia | §D-7 la llama directo |
| `services/apiClient-ch3-r1` | `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` solo importada en los `lib.ts` de tareas, calificaciones y clases | §D-7 usa `errorQueRedirigeElCliente`, que ya vive en `features/calificaciones/lib.ts` |
| `features/tareas/entregas-01d-r1` (toda la producción) | `fetch(` solo en `apiClient.ts` y `almacenService.ts`; `_blank` solo en `lista-de-enlaces.tsx` | `descargaService.ts` usa un `Blob` y `click()`, sin red y sin `target` (§D-5.3, §D-0.6, comentarios incluidos) |
| `features/clases/refactor-01c-r1` | `components/`, `lib/` y `services/` no importan de `features/` | `lib/xlsx.ts` y `descargaService.ts` son genéricos (§D-5.1, §D-5.3) |
| `features/tareas/estatico-01c-r1` CAL-T-99 | copias de la regla de visibles o de `normalizarTextoLargo` en producción (`\\u2800`, `\\u{1D159}`, `\\r\\n\|\\r`) | el escritor conserva los saltos y los retornos de carro (§D-5.1); quita U+0000 a U+001F por punto de código, nunca U+2800 ni U+1D159. Ver V-r0b-1 |
| `features/clases/estatico-02c-r1` | `perspectivaDeRuta(` y `pathname.startsWith(` fuera de su lista | el botón no lee la ruta |
| `features/clases/reloj-01e-r4` | textos "Vence hoy/mañana/en" en pruebas sin reloj | la hoja escribe estados ("Sin entregar"), no textos de vencimiento |
| Las de `features/tareas`, `features/admin`, `features/auth` y `estatico-03c1-r1` con alcance propio | listas `NUEVOS`, `RUTAS_01D` o `DEL_MODULO` | 02b no toca esos archivos |

**Del lado del backend, sobre el texto del frontend:**
- `backend/test/muro-c-r1.ataque` (U+2800, U+1D159, `Default_Ignorable_Code_Point`) y `backend/test/muro-c-r2.ataque` (`\\r\\n\|\\r` y `normalizarTextoLargo =` en `frontend/src` de producción) aplican igual. Ver V-r0b-1.
- `backend/test/arquitectura-cuentas-r1.ataque` revisa `frontend/package.json`. Con DH-01 (b), `write-excel-file` no casa con su lista de proveedores prohibidos.
- Las 94 `*.ataque` del backend no cambiaron desde la ronda 1 de 02a.

### V-r0b-1 · Para el programador (no es PARADA; son reglas que ya existen)
Tres reglas leen el texto crudo de toda la producción. Las cumple el diseño, pero un detalle de implementación fuera de los literales del plan las rompería:
1. **Ninguna línea de producción fuera de `components/ui/`, ni siquiera en un comentario, puede tener `-[…]` sin comillas dentro.** Un ejemplo que rompería: `LETRAS[n -[…]]` o una clase de caracteres escrita `-[`. Lo vigila `components/layout/estatico-r1`.
2. **Ninguna línea de producción, ni en un comentario, puede escribir `<a … href="…">`.** Un comentario de `descargaService.ts` que diga `<a href="…">` rompería esa misma prueba.
3. **Ningún archivo de producción del frontend puede tener el texto `\r\n|\r`.** Normalizar saltos con esa expresión en `lib/xlsx.ts` o en el lector rompería `backend/test/muro-c-r2.ataque` y CAL-T-99. El plan pide conservarlos.

### SHA-256 de las `*.ataque` del frontend (base de V-01 de 02b)
Son 153, calculadas sobre el árbol de trabajo (LF) **después** de C-3 y C-4, con `find frontend/src -name "*.ataque.test.ts*" | sort | xargs sha256sum`.
- El SHA-256 de esa salida es `81e3fa122248aaf926d249c8084ba3a9eb5c5adde7ebb3d66f3d636c75508378`. Antes de C-3 y C-4 era `afb2c102…`.
- Antes de los cambios, `estatico-01d-r1` tenía `f0cba6f9b6c4cf1d74ed52ad89943088661370f5a784502f851cd6230912f606` y `styles/clases-r1` tenía `87da1cf759ac639bb168ab352cd28814b5c6c85b46b86a033fc22f147d6e6d15`.
- Las otras 151 no cambiaron.

| Archivo | SHA-256 | Nota |
|---|---|---|
| `frontend/src/app/barra-02d-r1.ataque.test.tsx` | `0e49b62b73b2ef55e8c0b2ba26e1d136a3adb674761fda2c11453eb5c2faf7cc` |  |
| `frontend/src/app/cache-03a-r1.ataque.test.tsx` | `b89ede0f6aed45dfcb5e64c8909a822156ce43fd80948e72419cdce9d4541a87` |  |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `e85743c0fbb8e476874a2c67334342d8d69d14153579fc1e4cce0ae6e2b29616` |  |
| `frontend/src/app/contrasena-r1.ataque.test.tsx` | `bc2be5541006887e2a5a4a89b33046180f607d54474b0f96a73d615afbcac385` |  |
| `frontend/src/app/contrasena-r2.ataque.test.tsx` | `f38bcacb716d8a39acdb3535a95603cd0d8ab02572ca57a7df5268b01ceb6eac` |  |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `68fb5d092c0c8ecfcf282477ef023aaae26f6b869656e05109dc3efa276d842a` |  |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `41930017715d3d6869dc7acefd75de8ec3684f1f035b845abdf8ec0f6b734dee` |  |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `1506c27e5f7418b5e087fd30f8809645a2fc3e2761c7249de78f02e24aa6c7a5` |  |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `db48dad405c27062621a44d3744c84cc5903892a51e5a8df18f41383cb9c88a3` |  |
| `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` | `0e1d93e4dd3cbc7b5e9475a17b5ca66f0df056ba25cb117249f4c2e2f5887a51` |  |
| `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` | `2154b5c15f696a0c7f884bff774cf4e2a4208a5281db9076653f8253e2385ab9` |  |
| `frontend/src/app/fondo-r1.ataque.test.tsx` | `f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4` |  |
| `frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx` | `29782507d18ff96315e4030e890b21fdf1eb1c5550c3d1cfe5c92664d30b64dd` |  |
| `frontend/src/app/marco-r1.ataque.test.tsx` | `57cb54afd3b79464f0df01b88fc388cebbeac5657d936c4c204cbae6034b0834` |  |
| `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | `c8a9812f21cb24db50cc2afd945b7b38abacb468fbf4f4df16c07a52c48426ac` |  |
| `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | `d7608d7fc7767f53db3971672fc99fdb8bbd33f303f41e321bcc48ad25f511fd` |  |
| `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` | `2f8056a770397c1601647277944555a48afc4b9a2babeb75e5898f0cc92562bb` |  |
| `frontend/src/app/personas-03c1-r1.ataque.test.tsx` | `6acc49a2e3b649868ccf9a9337143f991b655dafbcff2e5916bca0269bd23a7c` |  |
| `frontend/src/app/personas-03c1-r2.ataque.test.tsx` | `a3e3dadd35c40e9a11a0bdef8cd716daceeb254e5307a837c6598213ba803a7b` |  |
| `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` | `0eefed2c05d76b0790a437e9465a898a9076083b1f046f8785145cfaad0da379` |  |
| `frontend/src/app/router.ataque.test.tsx` | `053e867a904afa3c09eef92ca2e03e929d9f9c93f714040856f40c7418721bbe` |  |
| `frontend/src/app/rutas-01d-r1.ataque.test.tsx` | `fc820217bc3baa3749c077fe16a4abd7ae10e92c84494ffb2a215133c19df36a` |  |
| `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | `f0657fb91f7b3accf64726292f9324c6742c1ac537c6c4a1985ec4e32ae09c83` |  |
| `frontend/src/app/rutas-clases-r1.ataque.test.tsx` | `c7946f5f5d5d16d36b395adc2ad9928acc7fd9839875fb64532b51489756730b` |  |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `f090cbd8e8c9b0af52d4fc19547b07e9b6413f5414cc4b10862f01e29818dddc` |  |
| `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` | `11c6d9c55be91aa41e8525345e3795e34b8e1e661ff7cdd901f729760a033cfd` |  |
| `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` | `48f5ff8fef35faa6d8500fae4a53ca953d7f661100a5c4879ba58e68972ab2de` |  |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | `36d605f79169e16a5afadc7e07fc3781472dd393406430277ceb147fc2da1fa5` |  |
| `frontend/src/components/layout/pie-r1.ataque.test.tsx` | `0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c` |  |
| `frontend/src/components/layout/pie-r2.ataque.test.tsx` | `00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21` |  |
| `frontend/src/components/layout/pie-r3.ataque.test.tsx` | `472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76` |  |
| `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` | `a1814d281dafd8243989c9f9a462a4f33a86b1fb70eeebf29e99bcb0f340d82a` |  |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `7d080037d9a64eebcebb789d1dfd94b787652103e6f9c84f968f9c9f64c3b30c` |  |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` |  |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` |  |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` |  |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` |  |
| `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` | `c21edb5a06b43808ce2be23058409b7ff887e66d60e842c500a3714a90ebcb25` |  |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` |  |
| `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` | `30f45bba30d9348ec1587b42e84ca370274e1bf0af0f310b8a6bbd79fa982669` |  |
| `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` | `d477a809e55e603d3ef6c02ca43b21372b75d0947fa303f1539d48bdf32841f8` |  |
| `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | `761f54f183540d8ae222f97940fa6c2355ff33e515771e627f8efde49261eda2` |  |
| `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` | `14ead3dce027b433d51a9d635b0fa35718ee3875bffc3e1949f96ecb8d2f7135` |  |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `3ceda51db8f67f40c26615fbc4cd7d082035b00f38713c6ca4c7db58e47926c8` |  |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `1f5d1147637c09daa6fdf1384e4395edd69dfdab84aae5d602a362dabd3295bd` |  |
| `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` | `af3f0d474f8052b402c8959a64acf9e730f9ae60f09d90996a6306e9c2440f08` |  |
| `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` | `991b115524d8dade8d6ea2c51fb753dc8832ee410db2161a0ce761d011cfca4a` |  |
| `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | `96b6ab55f0a7bf9b66f8edbcb5ceffa7e4fe35935c6cb12ecab93fc04bc02856` |  |
| `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` | `0ce580976ea894ee4bd9c4adbe3d7d1d524354a8ff22fc7e7cc6acf89057aa53` |  |
| `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | `4bcd3e34b62726fea718efb9c482d8c1f504bbe85ef32427bdf4d65a6832d8f1` |  |
| `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` | `812ee5f1b04a1218e2b96cdb97fb5a964a4a21b0d81b95bb4889beaa4a3894bb` | Cambiada en la ronda 0 de 02b (C-3 o C-4) |
| `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` | `5991d8e3d4e694973309f178e5341a2285584cf9ed6006fbb658d7f5a61de5dd` |  |
| `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` | `c744fb831fa9992c2a9ed0729f9ec3cc089f3167ca19133c6eee0133382607a1` |  |
| `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` | `8dea1c2adc5d228e166ce6037a1a1a827d26e2bdc6d7c8534f146517ebc1ac44` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` | `6f7496ca7652e7b4441a7eb9822e74270d50127ac40ba27b86c83edfcd5cc3fa` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` | `24751f358fc5ecd485c475e7025dd881b87fe892f025459a6ff29f615fc5cc66` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` | `c504d0ad3690781275a6ffb78638a6148550b2fd4ee1ed25a4b154054fc4f80d` |  |
| `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` | `6ac36ce1eb4df953626415b3ed431a8f4809dc29cf259f755f1f8509dd54b7ef` |  |
| `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` | `fb33f2a27bfcca906549a12610977478ba72e6e7ed8afd5c5a0a962deb3eb802` |  |
| `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` | `932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872` |  |
| `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` | `55dc274eca96da4360848b88f9f2a839ac815031490ab57ff38de074512d632c` |  |
| `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` | `371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183` |  |
| `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` | `266d088dd727f18af8c8a106b8d9c4dbed75753e4b1b4abb12f3a4df870ecb7f` |  |
| `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` | `856cffbd9c743f9815daf731487e29dc5f5272545dc15820a70baf86ecfa6527` |  |
| `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` | `a9dc00d9cf6e8684113eeb824658c7fb2f3077ee8a54deb0cce47ac802c74f44` |  |
| `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` | `98e645df89c9736ee33f440c1d83f342be84f30caabec0310b1b5185e538fbd6` |  |
| `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` | `f1b2b7d3c2a2bfbc2c2aa31cce4b120e306681c0cc9efb85ac2a954c8f8f8afe` |  |
| `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` | `c6c85ac2f6e7418e81d7817f9c455c0e0973025a15ae2a5378e00c9a71c45620` |  |
| `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` | `a3880b67ffaa0d15763d1c761cef1ff8472029c77bfb2211ab079eadb1685325` |  |
| `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` | `66c0b873bc8b9d8e9e01ac871bd6aaab4328508beb5ec9371d69463d7c12430d` |  |
| `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` | `87dae1927669b46bb52aad94db5107a5284f772fa9b29e225aace19c1a1e8def` |  |
| `frontend/src/features/clases/clases-r1.ataque.test.tsx` | `5f0679d8cfacc8bce01989c04a415dc5b546625eb7dec92f03959de5a0f89815` |  |
| `frontend/src/features/clases/clases-r2.ataque.test.tsx` | `c7ad5edc733e374117a9277f1c2987e84cc2930c77eb4c720ccf15cc9f5fab45` |  |
| `frontend/src/features/clases/clases-r3.ataque.test.tsx` | `a835a11d29aedb8f77f91e826a22c2b7cf5322fced3f6bed0c1acbf7c75a4e61` |  |
| `frontend/src/features/clases/clases-r4.ataque.test.tsx` | `86b04d234527eceefca35b07ce89e6b7ce0b6afe5ccdee2f005e6a4219f0495a` |  |
| `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` | `dce7fd019a6e32b8e4df37dd0728e265f5e9449e9ee2723f372ea174fe312464` |  |
| `frontend/src/features/clases/dudas-03e-r1.ataque.test.tsx` | `3b5a9fac5cd20a881bf6b38597b752725a7f6bbfddcf103b7bf1239a76353dfc` |  |
| `frontend/src/features/clases/dudas-03e-r2.ataque.test.tsx` | `fec2ffc2691bd297dca5f90233d498d10dfd689a5d9a8819bc30e757c6f67c26` |  |
| `frontend/src/features/clases/dudas-03e-r3.ataque.test.tsx` | `18edcffc8e48073362b98c784d5bf64e3335709ae6e1c6425b32aa3310e24b56` |  |
| `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | `ddc9dfaccc8230ec612126fdf29939a8e4311188566e5cfcaa724bd119e959e8` |  |
| `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | `5e20eefe0104b510a3002de084b6162162b5bf20797622c8d92b350853494b53` |  |
| `frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts` | `3cb8e0d7bb13b57638d65aa74ec5ff0f9306f024cf6996b7737232243a0b82f8` |  |
| `frontend/src/features/clases/estatico-r1.ataque.test.ts` | `cdd1ed8890859ae3e884822fc7074852a2173105114745d83fe9a15c1c47c626` |  |
| `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` | `de23d395dfe7a6f3d6d15eb48cb574599dc9d8204e5a90b255c0c10d25a186fa` |  |
| `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` | `46383e1f3ede03cb204dbf602373d0a07e513d8dac7ec4179a203ea6ee270fa3` |  |
| `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | `1d2bfe93db13219086246e21307223229a89416484a09ac69da14460e54e47bb` |  |
| `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` | `8b8ea2d21597bc0444709a9d26fd795d05bc964ef7b5094240628c63018c091b` |  |
| `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` | `b819d6bbde4bd47e3ec724fcdea5e77eb66b12076b8a9a083691b52ef0bdd182` |  |
| `frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx` | `ab006dc1711e9a652643930a7010c25f442d1ffdd137adbb093eb5bd98da90d6` |  |
| `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | `5224976752a14c3e003b246fa97abf25356e370cb46da1cdff9526bf3be86b4e` |  |
| `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | `7f4a935de29c3c519aad697edb1470c4cfcead600f5c1516c5fff948995d4434` |  |
| `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` | `8bc578ef17d2731f388c14ca19bc719a2b8d04d8a41009fadee15227379047bc` |  |
| `frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx` | `479430b848cf3d21a0187138944deec46bb36653071bbd2790ed57620f012976` |  |
| `frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx` | `4d94ccbe786a46ca1d82a280956f1146d5c302a9f83dfac45f39b3b2f94b753f` |  |
| `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` | `0f60f1582fce6e5efaf9bf6856133dc30f1dc4eb9c3b7fea19f90a330f8335b3` |  |
| `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` | `7c434a0e54e70b12d4b2a3de22ffb4dbf5f28a1cfbd2290c22e8a2b59edf0e16` |  |
| `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` | `99df138b24d4aba97b9f714c32ba226e82c7403cf73aa2e9e2b0b028b28e283e` |  |
| `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` | `4817262ef6e4dadff56857e50bab2e06ec479e62d5eaf45b34d70d683736b637` |  |
| `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | `8da38dbcb605ce3d90ace8117ce2cc5c838d71eb24bdd76fad3a53b82da93901` |  |
| `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | `d0acb3527aafa6f687e3eb00563e37be93768e7d7f742694a4d5ce05b75b7e28` |  |
| `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | `d08e51d451ebaeb2d7086c75dc1f73d52c5b4a6b8dfb979932828bed5f5d459d` |  |
| `frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx` | `558212b46641de0794d0ce90e3944a99cb5baa7fab4b09bbac5ea7cac41eaa34` |  |
| `frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx` | `aec8c4131e5dc733246b33e8189e2dc595387324bdd2081d1d245641c20c380a` |  |
| `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` | `67b60a9a5363f88e6ceba210c27452b8d639f6df798aa4e506dc54bb2312249a` |  |
| `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | `7677e0571587c89de1cb76788d499ac545255ca64c8afcb38a8ad6e39c02e2c6` |  |
| `frontend/src/features/clases/recursos-03d-r1.ataque.test.tsx` | `60541290248812cfce5591ddf33d01125d60c33257743a7ec48a445013d3d8c1` |  |
| `frontend/src/features/clases/recursos-03d-r2.ataque.test.tsx` | `4aafaa73980ba1bc29be043623a030c9eaa730825eb61a403bf54f9ac700b42d` |  |
| `frontend/src/features/clases/recursos-03d-r3.ataque.test.tsx` | `70b1a49a6a0e471422be987466228e5beb87e25baee2906790651c94ed214a3a` |  |
| `frontend/src/features/clases/recursos-03e-r1.ataque.test.tsx` | `29a3125cc70969f2fc2bb1f012beeb81840e1a00ea08d5b588b10d190342ae7f` |  |
| `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | `85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511` |  |
| `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` | `4303eac77b98e8978495d9e68fd7725ac436f9db757dbc0c02c59051436908fa` |  |
| `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` | `09435abbb9a26dd71c52b4d95487c6d38594f1ba062aefb60f73b7eb7308f991` |  |
| `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` | `d899c19ba982fbde2208bbc7fa009869556c84bd4650586dbd9ee90b22234e47` |  |
| `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` | `97af503e763f7dff9fcfbdc72862cd21de6af8e51d3ec41134f8475d98ae2df6` |  |
| `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` | `db42c88d5b0bfb1125bf122c03a2e019d6f5365c128ac4bfadd413a26a934845` |  |
| `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` | `f6924bc272a5240cf97d35729c797cc10960ed7cf94fe1be1b69ca2df6c1cf8f` |  |
| `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | `9866ef34167061e2715b65a352c55d08c7e9268033e879ae633c7fd568e4d49f` |  |
| `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` | `ea58eb11c3157a33c5730f87f2cf562ae178589b30264902b165c4439cebc2ee` |  |
| `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` | `2ef258e946084f17e33936e8fa257551a90323b589859dd2e1f70aabeaf711bf` |  |
| `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` | `e2fefd7d744f77c7bdd2ba73a08cc51076d0f6130bf4d0a225e0e972a1dce111` |  |
| `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` | `11bb5433fb30f268b6d93e1e7814d826bbab8fb1f173e574faf52f5a96b5a41e` |  |
| `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` | `d8daccb56c8de8d9f1b0f8d1b0907c110e327f4f55b016fc0fe7fc0f25ccc79c` |  |
| `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` | `ef86c46708f0682bca5a023e85794639c396ec94d207cac23ceb13585ab39e75` |  |
| `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` | `5ff367edba10c9ba9c7e50f8ed874032654fa2abdc0dd8f4a122a000355472ab` |  |
| `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` | `2938ae2f1c00f63a0372997c7ba68bdc0ab097895769bf9060072a4ac2674c5a` |  |
| `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` | `0963f14f4842d6d57288876c932496ac09d44b872fc049492ee6e8ba539f3235` |  |
| `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` | `4f486ca37d2a2bb6cc26754281d2adce086a9d8d4485a069de7ae5d54e360acf` |  |
| `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` | `93a5a0a648669e9c96494a62b2b16082b07296f279e2892bf2c8d47834ee2fc1` |  |
| `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | `08a5e1a5642e7fc7553632dd5cf4e07f0ea35c3ef1e7293d010bbc49b09465aa` |  |
| `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | `172be3efd919c0d3948eca17c7e808968e2370afe1f9c2a28cef7d2ded584b81` |  |
| `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` | `496652bc59817166f53e00cb828f2119c857c2834063a31764d7876dc150c930` |  |
| `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | `4e6950f0fe571d6ae41a78380c59c20459fdf19f34c57e9777e4e34a6bc61c58` |  |
| `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` | `94d6e6253b266c7f21099aa593aac7b2600edca22ab403aa365dcd789b1c6a97` |  |
| `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` | `f614e7369f8c47c40a87ad1f8867fb8edf7ebc76e94d0ba6c5c59c92cb6347f0` |  |
| `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` | `fb387ecbb7e5272d2ffb53d626b51ffd9c57b409d10c560e6a5ecbfa6a2a8c19` |  |
| `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | `7a7c7ba922f77da22d0f765ed5ea9ccf9216d1900e4b5f18365da9d46437495f` |  |
| `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` | `bfded7507bc684ea9858cd76517ef0e4c23cbc69e5a19f381e6ec522fd6156e6` |  |
| `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | `b778fc2e6bb0a8f8715a56877b3b781439ca214c8a9c8ae126f610c95229882a` |  |
| `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | `bf3c999033195cac778a82a579e44729fb07a405f5cdb41d8e7dc932cb71f942` |  |
| `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | `3567d7c23d2cf6a2fd538cd6822ef60ac3cffeac036394ed1e3559debe492c57` |  |
| `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | `6bbe2bd85e2b5500fbab4d0f51630c0c8e9d65b1a63045ad1fa906298a92a435` |  |
| `frontend/src/lib/errores-ch3-r1.ataque.test.ts` | `72b19b6a00b4ade43b06829bb5bef1a5cdecf5a7d2af57369f1e857a1d4a17f5` |  |
| `frontend/src/lib/errores-ch3-r2.ataque.test.ts` | `5d41a2af073dcaa2b8b016d835d36d5ebae9278863db048484a192a88bb31a30` |  |
| `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` | `66513d957e524af5e336a2c7e656df37f51106507a3984b691df47cd825d4d10` |  |
| `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` | `a9529cefbd27cbb94376a6548ef1b8b247fb1f4155938298ae5d10eaee81008a` |  |
| `frontend/src/lib/format-01c-r1.ataque.test.ts` | `60bc1fc7011e9a0fe5a4c4aa45420f2c7d38adb9ee2f8d235d09847dbe13ac3a` |  |
| `frontend/src/lib/format-d-r1.ataque.test.ts` | `c71cba65dd284d7af11cbc812b6bcf75baa373939edb8318e731858d9c50173f` |  |
| `frontend/src/lib/format-d-r2.ataque.test.ts` | `89dbbb70d5dc404c3d74db5391d10855c8cb1d6b4c643b6147b3ce6ffb2637af` |  |
| `frontend/src/lib/format-d-r3.ataque.test.ts` | `bfa7ded62f7a1402590d438a1cc51060a63fa019ad47d3eb5740e43383064a2a` |  |
| `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | `b6265bf6eec25b7f2c34dcd93dd4d8b23d07ca6214576921a50a66ff16346ffb` |  |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` |  |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `8d8aaf8f82b0f63ad879537a3858438fe2079f9820fb7eb19eff6718b22f802a` | Cambiada en la ronda 0 de 02b (C-3 o C-4) |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582` |  |

## Ronda 1 — 02b
Veredicto: **ROTO.** Hay 2 hallazgos, los dos de gravedad **baja**: 0 críticos, 0 altos, 0 medios y 2 bajos. Lo central de 02b resiste: el recorrido de las ventanas, P-13, los avisos, el aborto, el doble clic, el texto del servidor y el escape del XML.
Verificación propia:
- lint del frontend en verde;
- test del frontend 280 archivos / 6045 pruebas, con 2 en rojo, que son mis dos hallazgos;
- build del frontend en verde.

Fecha: 2026-11-04. Rama `feat/calificaciones-02`, base `<K2a>` = `57192e2`. Resumen del programador `7c035686…`, aceptado por el manager (`revision.md`, "## Verificación del resumen — 02b"). DH-01 en (a); H-0 dio bien. No abrí Excel ni ningún navegador.

### V-01
Comparé las 153 `*.ataque` del frontend con la tabla de la ronda 0 de 02b (`find frontend/src -name "*.ataque.test.ts*" | sort | xargs sha256sum`):
- las 153 son idénticas, C-3 y C-4 incluidas (`812ee5f1…` y `8d8aaf8f…`);
- la única diferencia es mi archivo nuevo.

`git diff --quiet 57192e2 -- backend shared` está limpio: 02b no tocó ni el backend ni `shared/`.

### Hallazgos
#### T-01 — El nombre del archivo parte un emoji de varios puntos de código en el borde de 80
Gravedad: baja
Prueba: `frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx`, «CAL2-T-18: en el borde de 80 puntos de código no queda un emoji partido (DH-03: «hasta 80 caracteres, sin partir un emoji»): ni una bandera a medias, ni una unión ZWJ colgando, ni un modificador o selector suelto»
Reproducción: `nombreDelArchivoDeExportacion(clase, ahora)` con cada una de estas clases:
- `"a".repeat(79) + "\u{1F1F2}\u{1F1FD}z"` (la bandera de México en el borde);
- `"a".repeat(78) + "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}z"` (una familia con ZWJ);
- `"a".repeat(79) + "1\u{FE0F}\u{20E3}z"` (una tecla con número).

Esperado / Obtenido:
- Esperado: la clase termina en el último carácter completo; aquí, la «a».
- Obtenido: la bandera queda en un indicador regional suelto (U+1F1F2, que se ve como una «M» en un recuadro); la familia termina en un U+200D (ZWJ) colgando, un carácter invisible justo antes de « - 2030-01-10.xlsx»; la tecla queda como el dígito «1» solo.
- La causa es que el recorte es por puntos de código (`Array.from(…).slice(0, 80)`): no parte un par sustituto, pero sí parte un grafema.

Requisito o regla violada: DH-03 (a), decisión del humano: «hasta 80 caracteres (sin partir un emoji)». El código sigue al pie de la letra §D-6, punto 2 («80 puntos de código … sin partir un par sustituto»), que es más débil que DH-03. Es una contradicción del plan. CAL2-B06 no lo caza: prueba un emoji de un solo punto de código en el borde, no los grafemas de varios puntos.

#### T-02 — Una clase con más de 16,381 tareas cabe en el tope de 200 peticiones, pero da una hoja con columnas después de la XFD
Gravedad: baja
Prueba: el mismo archivo, «CAL2-T-20: una clase de 1 alumno y 16,382 tareas cabe en el tope de 200 peticiones (164 ventanas), pero su hoja tendría 16,385 columnas: el archivo no debe pasar de la XFD, la última columna de Excel»
Reproducción:
1. Una matriz de 1 alumno y 16,382 columnas pasa por `hojaDeExportacion` y `armarLibroXlsx`. Es lo que arma la mutación cuando `combinarVentanasDeExportacion` da `matriz`.
2. El recorrido lo permite: `ventanasDeLaExportacion(1, 16382, 100) = 1 × 164 = 164`, menos que el tope de 200, así que no dice «demasiadas».
3. La hoja tiene `Alumno`, `Correo`, 16,382 tareas y `Promedio`: 16,385 columnas.

Esperado / Obtenido:
- Esperado: ninguna referencia pasa de `XFD`, la columna 16,384, el tope de Excel y de LibreOffice. O la exportación se detiene con un aviso, como ya lo hace con «demasiadas».
- Obtenido: `sheet1.xml` escribe celdas `XFE1` y `XFE4` (el encabezado «Promedio (%)» y el «—» del alumno). `armarLibroXlsx` lanza ante los otros límites de Excel (31 caracteres del nombre, 32,767 del texto), pero no ante este.
- No abrí el archivo en Excel (ningún agente lo hace). Por especificación, una referencia fuera de la hoja hace que Excel no abra el archivo o pida repararlo.

Requisito o regla violada: RF-65 (un archivo de Excel) y §D-4, Enmienda 1, M-03. El plan dice que una clase de más de 1,000 tareas «no es inalcanzable (no hay tope de tareas por clase)» y le da a «demasiado» el papel de detener lo que no se puede exportar. El límite de columnas de la hoja no está en esa cuenta.
Nota: es muy poco realista (16,382 tareas en una clase). Lo reporto porque el tope de 200 lo deja pasar en silencio, con un archivo roto, en lugar de avisar.

### Atacado sin hallazgos (casos en verde de `exportacion-02b-r1.ataque.test.tsx`)
| Caso | Qué ataca | Resultado |
|---|---|---|
| CAL2-T-11 | Salir de Calificaciones **entre dos ventanas**, con la primera ya recibida: la segunda viaja con la misma señal y queda abortada, no se pide una tercera y no hay aviso ni descarga aunque la segunda llegue después | resiste |
| CAL2-T-12 | Un cursor de alumnos que vuelve a uno ya visto (A → B → A) y un `cursorTareas` repetido: aviso de cambio, sin descarga, 3 y 2 peticiones, sin ciclo | resiste |
| CAL2-T-13 | **Exactamente 200 ventanas** necesarias (20,000 alumnos × 1 tarea): hace las 200 peticiones, descarga y el archivo trae las 20,000 filas (hasta `A20003`); no dice «demasiadas». Es el borde que B10 no cubre (B10 prueba 201 y el corte en la petición 200) | resiste |
| CAL2-T-14 | El texto del servidor, con un correo dentro, en 7 respuestas: 403 `SIN_ACCESO`, 400 de `cursor` y de `cursorTareas`, 400 de `limite`, 400 sin ruta, 409 desconocido y 503. La persona solo lee los textos fijos (sin acceso, cambio o genérico) y la página nunca contiene el mensaje | resiste |
| CAL2-T-15 | P-13 fuera de la hoja. Tras exportar, ni el DOM ni los avisos ni la caché de mutaciones (`getMutationCache()`, `state` completo) contienen un correo, una calificación de la hoja (8.5 y 42.5) ni «estadoPago». Una respuesta con `estadoPago` y `accesoRestringido` de más da el genérico, no descarga y no los deja en ninguna parte | resiste |
| CAL2-T-16 | Tres clics en «Exportar a Excel» con «Alumnos siguientes» en vuelo a la mitad: un solo recorrido, una descarga y un aviso; al final ningún `aria-busy` | resiste |
| CAL2-T-17 | De punta a punta, con la clase `=HYPERLINK("…";"…")`, títulos con `<b>]]>&amp;</b>` y `Tarea_x0041_`, una categoría con U+2028 y U+2029, y nombres con U+0007, U+FFFE y U+202E. Cada texto llega como `inlineStr` a su celda, sin `<f>`; los controles se quitan; el XML es bien formado; el nombre del archivo pasa los reservados a espacio | resiste |
| CAL2-T-19 | La fecha del nombre en la medianoche local: 23:59:59.999 da ese día y 00:00:00.000 el siguiente | resiste |
| CAL2-T-21 | **N-07.** 3,000 combinaciones aleatorias con semilla fija (mulberry32), con 0 a 2 cambios que quitan, repiten o reordenan celdas, filas o tareas. Toda matriz aceptada (más de 500) tiene en cada fila exactamente una celda por columna y en su orden | resiste |

**N-07 (observación, no es hallazgo).** No encontré cómo alcanzarla. Las reglas 3 (celdas alineadas por respuesta), 4 (mismas filas y mismo orden en cada ventana de tareas) y 5 (ninguna tarea en dos ventanas) garantizan que cada fila trae una celda por columna. CAL2-T-21 lo confirma con 3,000 casos. El respaldo `celda === undefined ? [] : [celda]` sigue siendo silencioso; que lance como la fila es el detalle que el manager ya dejó para la revisión final.

**Otras revisiones sin hallazgo:**
- **Revisión estática del código nuevo:**
  - `lib/xlsx.ts` no importa de `features/`; `descargaService.ts` no tiene `fetch(`, `target` ni `href` con `#`;
  - `exportar-a-excel.tsx` no usa `disabled` y su variante es `outline`;
  - los avisos solo viven en el componente, con `id` fijo y `toast.dismiss` al empezar;
  - `hooks.ts` no usa `toast` ni `onError`; el resultado de la mutación solo lleva `{ tipo, nombre }`.
- **Las tres reglas crudas de V-r0b-1** se cumplen: no hay `-[…]`, ni `<a … href=`, ni `\r\n|\r` (la suite completa las corre en verde).
- **Las frases de recuperación** con el router real: CAL2-B13 recorre repetir el control, ir a otra sección y volver, pulsar la sección activa, atrás y adelante del historial, y tres intentos seguidos. Los leí y cubren lo que dicen. «Inténtalo de nuevo» sí se cumple porque la exportación es una mutación sin caché.
- **El foco:** CAL2-B08 a B12 comprueban que se queda en el botón y que, si la vista se reemplaza, va a la raíz. No encontré otro camino.

### Observaciones (no son hallazgos)
- **O-r1b-1 · R-02 es más ancho de lo que dice el plan.**
  - Qué pasa: en una clase de más de 100 alumnos y hasta 100 tareas (una sola ventana de tareas), una baja y un alta que se compensan entre la página 1 y la página 2 de alumnos no se detectan. Ejemplo: el maestro quita a X (en la página 1, ya leída) y entra Y, que también se ordena en la página 1, antes de que llegue la página 2.
  - Por qué pasa: los totales no cambian (`totalAlumnos` igual en las dos respuestas) y la regla 4 solo compara entre ventanas de tareas. El archivo trae a X, ya dado de baja, y le falta Y.
  - Por qué no lo reporto como hallazgo: DH-02 promete rechazar «si entre dos ventanas cambió algo que se ve (alumnos, actividades, totales o promedios)», y R-02 solo nombra los cambios que no mueven alumnos. Pero con los datos que da la API el navegador no tiene forma de verlo, y el código cumple las reglas 1 a 6 al pie de la letra.
  - Lo dejo para el manager y el humano, como riesgo residual que el texto de R-02 debería nombrar. Duplicar a un alumno entre dos páginas no es alcanzable: el nombre de un estudiante no cambia por la API.
- **O-r1b-2 · Retornos de carro.** El escritor conserva el U+000D en el texto, como pide §D-5.1, pero todo lector de XML (Excel incluido) lo normaliza a U+000A al abrir. Hoy no se alcanza: el servidor normaliza los saltos (`normalizarTextoLargo`). Si alguna vez se quisiera conservar, sería con `&#13;`.

### No atacado y por qué
- **La compatibilidad real con Excel, LibreOffice y Numbers:** la resolvió H-0 y queda para H-2 y H-3 (ningún agente abre Excel ni navegadores).
- **La memoria del navegador en el peor caso** (200 ventanas de 100 × 100, unos 2 millones de celdas): jsdom no mide la memoria de una pestaña real. CAL2-T-13 (20,000 filas) pasa dentro de los 17.6 s que tardan las pruebas del archivo.

### Comandos y última línea
Antes de las corridas medí la carga, sin nada en paralelo:
- antes del archivo de ataque: 15, 7, 7 y 13 %;
- antes de la suite completa: 27, **13, 21** y 27 %.

| Comando | Salida | Última línea |
|---|---|---|
| `cd frontend; npx prettier --check` y `npx eslint` sobre mi archivo | 0 | `All matched files use Prettier code style!` |
| `cd frontend; npx vitest run src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx src/features/calificaciones/estatico-01d-r1.ataque.test.ts` | 1 | `Tests  2 failed \| 19 passed (21)` (los dos hallazgos; CAL-T-182 a 192 en verde con mi archivo dentro) |
| `cd frontend; npm run lint` | 0 | `> tsc -b` |
| `cd frontend; npm run test` | 1 | `Test Files  1 failed \| 279 passed (280)` · `Tests  2 failed \| 6043 passed (6045)` · `Duration  421.35s` |
| `cd frontend; npm run build` | 0 | `✓ built in 2.26s` |

Las cifras cuadran con las del manager: 279 archivos y 6034 pruebas, más mi archivo con 11 casos, dan 280 y 6045. Los dos rojos de la suite completa son exactamente CAL2-T-18 y CAL2-T-20; no hay otro.

### SHA-256 de las `*.ataque` del frontend al cierre de la ronda 1 de 02b (base de V-01 de la ronda siguiente)
Son 154: las 153 de la tabla de la ronda 0 de 02b, sin cambios, y una nueva. Comando: el de V-01, sobre el árbol de trabajo (LF). El SHA-256 de la lista ordenada es `cf1bb3ece8447e2d9be498283eb8ff88e7a9147868193870976a3219f8b87c72`. Las 94 del backend no cambiaron.

| Archivo | SHA-256 | Nota |
|---|---|---|
| `frontend/src/app/barra-02d-r1.ataque.test.tsx` | `0e49b62b73b2ef55e8c0b2ba26e1d136a3adb674761fda2c11453eb5c2faf7cc` |  |
| `frontend/src/app/cache-03a-r1.ataque.test.tsx` | `b89ede0f6aed45dfcb5e64c8909a822156ce43fd80948e72419cdce9d4541a87` |  |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `e85743c0fbb8e476874a2c67334342d8d69d14153579fc1e4cce0ae6e2b29616` |  |
| `frontend/src/app/contrasena-r1.ataque.test.tsx` | `bc2be5541006887e2a5a4a89b33046180f607d54474b0f96a73d615afbcac385` |  |
| `frontend/src/app/contrasena-r2.ataque.test.tsx` | `f38bcacb716d8a39acdb3535a95603cd0d8ab02572ca57a7df5268b01ceb6eac` |  |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `68fb5d092c0c8ecfcf282477ef023aaae26f6b869656e05109dc3efa276d842a` |  |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `41930017715d3d6869dc7acefd75de8ec3684f1f035b845abdf8ec0f6b734dee` |  |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `1506c27e5f7418b5e087fd30f8809645a2fc3e2761c7249de78f02e24aa6c7a5` |  |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `db48dad405c27062621a44d3744c84cc5903892a51e5a8df18f41383cb9c88a3` |  |
| `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` | `0e1d93e4dd3cbc7b5e9475a17b5ca66f0df056ba25cb117249f4c2e2f5887a51` |  |
| `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` | `2154b5c15f696a0c7f884bff774cf4e2a4208a5281db9076653f8253e2385ab9` |  |
| `frontend/src/app/fondo-r1.ataque.test.tsx` | `f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4` |  |
| `frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx` | `29782507d18ff96315e4030e890b21fdf1eb1c5550c3d1cfe5c92664d30b64dd` |  |
| `frontend/src/app/marco-r1.ataque.test.tsx` | `57cb54afd3b79464f0df01b88fc388cebbeac5657d936c4c204cbae6034b0834` |  |
| `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | `c8a9812f21cb24db50cc2afd945b7b38abacb468fbf4f4df16c07a52c48426ac` |  |
| `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | `d7608d7fc7767f53db3971672fc99fdb8bbd33f303f41e321bcc48ad25f511fd` |  |
| `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` | `2f8056a770397c1601647277944555a48afc4b9a2babeb75e5898f0cc92562bb` |  |
| `frontend/src/app/personas-03c1-r1.ataque.test.tsx` | `6acc49a2e3b649868ccf9a9337143f991b655dafbcff2e5916bca0269bd23a7c` |  |
| `frontend/src/app/personas-03c1-r2.ataque.test.tsx` | `a3e3dadd35c40e9a11a0bdef8cd716daceeb254e5307a837c6598213ba803a7b` |  |
| `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` | `0eefed2c05d76b0790a437e9465a898a9076083b1f046f8785145cfaad0da379` |  |
| `frontend/src/app/router.ataque.test.tsx` | `053e867a904afa3c09eef92ca2e03e929d9f9c93f714040856f40c7418721bbe` |  |
| `frontend/src/app/rutas-01d-r1.ataque.test.tsx` | `fc820217bc3baa3749c077fe16a4abd7ae10e92c84494ffb2a215133c19df36a` |  |
| `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | `f0657fb91f7b3accf64726292f9324c6742c1ac537c6c4a1985ec4e32ae09c83` |  |
| `frontend/src/app/rutas-clases-r1.ataque.test.tsx` | `c7946f5f5d5d16d36b395adc2ad9928acc7fd9839875fb64532b51489756730b` |  |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `f090cbd8e8c9b0af52d4fc19547b07e9b6413f5414cc4b10862f01e29818dddc` |  |
| `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` | `11c6d9c55be91aa41e8525345e3795e34b8e1e661ff7cdd901f729760a033cfd` |  |
| `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` | `48f5ff8fef35faa6d8500fae4a53ca953d7f661100a5c4879ba58e68972ab2de` |  |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | `36d605f79169e16a5afadc7e07fc3781472dd393406430277ceb147fc2da1fa5` |  |
| `frontend/src/components/layout/pie-r1.ataque.test.tsx` | `0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c` |  |
| `frontend/src/components/layout/pie-r2.ataque.test.tsx` | `00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21` |  |
| `frontend/src/components/layout/pie-r3.ataque.test.tsx` | `472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76` |  |
| `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` | `a1814d281dafd8243989c9f9a462a4f33a86b1fb70eeebf29e99bcb0f340d82a` |  |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `7d080037d9a64eebcebb789d1dfd94b787652103e6f9c84f968f9c9f64c3b30c` |  |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` |  |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` |  |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` |  |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` |  |
| `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` | `c21edb5a06b43808ce2be23058409b7ff887e66d60e842c500a3714a90ebcb25` |  |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` |  |
| `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` | `30f45bba30d9348ec1587b42e84ca370274e1bf0af0f310b8a6bbd79fa982669` |  |
| `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` | `d477a809e55e603d3ef6c02ca43b21372b75d0947fa303f1539d48bdf32841f8` |  |
| `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | `761f54f183540d8ae222f97940fa6c2355ff33e515771e627f8efde49261eda2` |  |
| `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` | `14ead3dce027b433d51a9d635b0fa35718ee3875bffc3e1949f96ecb8d2f7135` |  |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `3ceda51db8f67f40c26615fbc4cd7d082035b00f38713c6ca4c7db58e47926c8` |  |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `1f5d1147637c09daa6fdf1384e4395edd69dfdab84aae5d602a362dabd3295bd` |  |
| `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` | `af3f0d474f8052b402c8959a64acf9e730f9ae60f09d90996a6306e9c2440f08` |  |
| `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` | `991b115524d8dade8d6ea2c51fb753dc8832ee410db2161a0ce761d011cfca4a` |  |
| `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | `96b6ab55f0a7bf9b66f8edbcb5ceffa7e4fe35935c6cb12ecab93fc04bc02856` |  |
| `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` | `0ce580976ea894ee4bd9c4adbe3d7d1d524354a8ff22fc7e7cc6acf89057aa53` |  |
| `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | `4bcd3e34b62726fea718efb9c482d8c1f504bbe85ef32427bdf4d65a6832d8f1` |  |
| `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` | `812ee5f1b04a1218e2b96cdb97fb5a964a4a21b0d81b95bb4889beaa4a3894bb` |  |
| `frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx` | `0cab4d2b15a6d4a78c5653af87f0335f1df8d4a03aaa2ad52e5ce5d505199063` | Nueva (CALIFICACIONES-02b r1) |
| `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` | `5991d8e3d4e694973309f178e5341a2285584cf9ed6006fbb658d7f5a61de5dd` |  |
| `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` | `c744fb831fa9992c2a9ed0729f9ec3cc089f3167ca19133c6eee0133382607a1` |  |
| `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` | `8dea1c2adc5d228e166ce6037a1a1a827d26e2bdc6d7c8534f146517ebc1ac44` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` | `6f7496ca7652e7b4441a7eb9822e74270d50127ac40ba27b86c83edfcd5cc3fa` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` | `24751f358fc5ecd485c475e7025dd881b87fe892f025459a6ff29f615fc5cc66` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` | `c504d0ad3690781275a6ffb78638a6148550b2fd4ee1ed25a4b154054fc4f80d` |  |
| `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` | `6ac36ce1eb4df953626415b3ed431a8f4809dc29cf259f755f1f8509dd54b7ef` |  |
| `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` | `fb33f2a27bfcca906549a12610977478ba72e6e7ed8afd5c5a0a962deb3eb802` |  |
| `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` | `932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872` |  |
| `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` | `55dc274eca96da4360848b88f9f2a839ac815031490ab57ff38de074512d632c` |  |
| `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` | `371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183` |  |
| `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` | `266d088dd727f18af8c8a106b8d9c4dbed75753e4b1b4abb12f3a4df870ecb7f` |  |
| `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` | `856cffbd9c743f9815daf731487e29dc5f5272545dc15820a70baf86ecfa6527` |  |
| `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` | `a9dc00d9cf6e8684113eeb824658c7fb2f3077ee8a54deb0cce47ac802c74f44` |  |
| `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` | `98e645df89c9736ee33f440c1d83f342be84f30caabec0310b1b5185e538fbd6` |  |
| `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` | `f1b2b7d3c2a2bfbc2c2aa31cce4b120e306681c0cc9efb85ac2a954c8f8f8afe` |  |
| `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` | `c6c85ac2f6e7418e81d7817f9c455c0e0973025a15ae2a5378e00c9a71c45620` |  |
| `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` | `a3880b67ffaa0d15763d1c761cef1ff8472029c77bfb2211ab079eadb1685325` |  |
| `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` | `66c0b873bc8b9d8e9e01ac871bd6aaab4328508beb5ec9371d69463d7c12430d` |  |
| `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` | `87dae1927669b46bb52aad94db5107a5284f772fa9b29e225aace19c1a1e8def` |  |
| `frontend/src/features/clases/clases-r1.ataque.test.tsx` | `5f0679d8cfacc8bce01989c04a415dc5b546625eb7dec92f03959de5a0f89815` |  |
| `frontend/src/features/clases/clases-r2.ataque.test.tsx` | `c7ad5edc733e374117a9277f1c2987e84cc2930c77eb4c720ccf15cc9f5fab45` |  |
| `frontend/src/features/clases/clases-r3.ataque.test.tsx` | `a835a11d29aedb8f77f91e826a22c2b7cf5322fced3f6bed0c1acbf7c75a4e61` |  |
| `frontend/src/features/clases/clases-r4.ataque.test.tsx` | `86b04d234527eceefca35b07ce89e6b7ce0b6afe5ccdee2f005e6a4219f0495a` |  |
| `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` | `dce7fd019a6e32b8e4df37dd0728e265f5e9449e9ee2723f372ea174fe312464` |  |
| `frontend/src/features/clases/dudas-03e-r1.ataque.test.tsx` | `3b5a9fac5cd20a881bf6b38597b752725a7f6bbfddcf103b7bf1239a76353dfc` |  |
| `frontend/src/features/clases/dudas-03e-r2.ataque.test.tsx` | `fec2ffc2691bd297dca5f90233d498d10dfd689a5d9a8819bc30e757c6f67c26` |  |
| `frontend/src/features/clases/dudas-03e-r3.ataque.test.tsx` | `18edcffc8e48073362b98c784d5bf64e3335709ae6e1c6425b32aa3310e24b56` |  |
| `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | `ddc9dfaccc8230ec612126fdf29939a8e4311188566e5cfcaa724bd119e959e8` |  |
| `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | `5e20eefe0104b510a3002de084b6162162b5bf20797622c8d92b350853494b53` |  |
| `frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts` | `3cb8e0d7bb13b57638d65aa74ec5ff0f9306f024cf6996b7737232243a0b82f8` |  |
| `frontend/src/features/clases/estatico-r1.ataque.test.ts` | `cdd1ed8890859ae3e884822fc7074852a2173105114745d83fe9a15c1c47c626` |  |
| `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` | `de23d395dfe7a6f3d6d15eb48cb574599dc9d8204e5a90b255c0c10d25a186fa` |  |
| `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` | `46383e1f3ede03cb204dbf602373d0a07e513d8dac7ec4179a203ea6ee270fa3` |  |
| `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | `1d2bfe93db13219086246e21307223229a89416484a09ac69da14460e54e47bb` |  |
| `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` | `8b8ea2d21597bc0444709a9d26fd795d05bc964ef7b5094240628c63018c091b` |  |
| `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` | `b819d6bbde4bd47e3ec724fcdea5e77eb66b12076b8a9a083691b52ef0bdd182` |  |
| `frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx` | `ab006dc1711e9a652643930a7010c25f442d1ffdd137adbb093eb5bd98da90d6` |  |
| `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | `5224976752a14c3e003b246fa97abf25356e370cb46da1cdff9526bf3be86b4e` |  |
| `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | `7f4a935de29c3c519aad697edb1470c4cfcead600f5c1516c5fff948995d4434` |  |
| `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` | `8bc578ef17d2731f388c14ca19bc719a2b8d04d8a41009fadee15227379047bc` |  |
| `frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx` | `479430b848cf3d21a0187138944deec46bb36653071bbd2790ed57620f012976` |  |
| `frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx` | `4d94ccbe786a46ca1d82a280956f1146d5c302a9f83dfac45f39b3b2f94b753f` |  |
| `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` | `0f60f1582fce6e5efaf9bf6856133dc30f1dc4eb9c3b7fea19f90a330f8335b3` |  |
| `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` | `7c434a0e54e70b12d4b2a3de22ffb4dbf5f28a1cfbd2290c22e8a2b59edf0e16` |  |
| `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` | `99df138b24d4aba97b9f714c32ba226e82c7403cf73aa2e9e2b0b028b28e283e` |  |
| `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` | `4817262ef6e4dadff56857e50bab2e06ec479e62d5eaf45b34d70d683736b637` |  |
| `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | `8da38dbcb605ce3d90ace8117ce2cc5c838d71eb24bdd76fad3a53b82da93901` |  |
| `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | `d0acb3527aafa6f687e3eb00563e37be93768e7d7f742694a4d5ce05b75b7e28` |  |
| `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | `d08e51d451ebaeb2d7086c75dc1f73d52c5b4a6b8dfb979932828bed5f5d459d` |  |
| `frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx` | `558212b46641de0794d0ce90e3944a99cb5baa7fab4b09bbac5ea7cac41eaa34` |  |
| `frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx` | `aec8c4131e5dc733246b33e8189e2dc595387324bdd2081d1d245641c20c380a` |  |
| `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` | `67b60a9a5363f88e6ceba210c27452b8d639f6df798aa4e506dc54bb2312249a` |  |
| `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | `7677e0571587c89de1cb76788d499ac545255ca64c8afcb38a8ad6e39c02e2c6` |  |
| `frontend/src/features/clases/recursos-03d-r1.ataque.test.tsx` | `60541290248812cfce5591ddf33d01125d60c33257743a7ec48a445013d3d8c1` |  |
| `frontend/src/features/clases/recursos-03d-r2.ataque.test.tsx` | `4aafaa73980ba1bc29be043623a030c9eaa730825eb61a403bf54f9ac700b42d` |  |
| `frontend/src/features/clases/recursos-03d-r3.ataque.test.tsx` | `70b1a49a6a0e471422be987466228e5beb87e25baee2906790651c94ed214a3a` |  |
| `frontend/src/features/clases/recursos-03e-r1.ataque.test.tsx` | `29a3125cc70969f2fc2bb1f012beeb81840e1a00ea08d5b588b10d190342ae7f` |  |
| `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | `85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511` |  |
| `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` | `4303eac77b98e8978495d9e68fd7725ac436f9db757dbc0c02c59051436908fa` |  |
| `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` | `09435abbb9a26dd71c52b4d95487c6d38594f1ba062aefb60f73b7eb7308f991` |  |
| `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` | `d899c19ba982fbde2208bbc7fa009869556c84bd4650586dbd9ee90b22234e47` |  |
| `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` | `97af503e763f7dff9fcfbdc72862cd21de6af8e51d3ec41134f8475d98ae2df6` |  |
| `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` | `db42c88d5b0bfb1125bf122c03a2e019d6f5365c128ac4bfadd413a26a934845` |  |
| `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` | `f6924bc272a5240cf97d35729c797cc10960ed7cf94fe1be1b69ca2df6c1cf8f` |  |
| `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | `9866ef34167061e2715b65a352c55d08c7e9268033e879ae633c7fd568e4d49f` |  |
| `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` | `ea58eb11c3157a33c5730f87f2cf562ae178589b30264902b165c4439cebc2ee` |  |
| `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` | `2ef258e946084f17e33936e8fa257551a90323b589859dd2e1f70aabeaf711bf` |  |
| `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` | `e2fefd7d744f77c7bdd2ba73a08cc51076d0f6130bf4d0a225e0e972a1dce111` |  |
| `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` | `11bb5433fb30f268b6d93e1e7814d826bbab8fb1f173e574faf52f5a96b5a41e` |  |
| `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` | `d8daccb56c8de8d9f1b0f8d1b0907c110e327f4f55b016fc0fe7fc0f25ccc79c` |  |
| `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` | `ef86c46708f0682bca5a023e85794639c396ec94d207cac23ceb13585ab39e75` |  |
| `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` | `5ff367edba10c9ba9c7e50f8ed874032654fa2abdc0dd8f4a122a000355472ab` |  |
| `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` | `2938ae2f1c00f63a0372997c7ba68bdc0ab097895769bf9060072a4ac2674c5a` |  |
| `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` | `0963f14f4842d6d57288876c932496ac09d44b872fc049492ee6e8ba539f3235` |  |
| `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` | `4f486ca37d2a2bb6cc26754281d2adce086a9d8d4485a069de7ae5d54e360acf` |  |
| `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` | `93a5a0a648669e9c96494a62b2b16082b07296f279e2892bf2c8d47834ee2fc1` |  |
| `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | `08a5e1a5642e7fc7553632dd5cf4e07f0ea35c3ef1e7293d010bbc49b09465aa` |  |
| `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | `172be3efd919c0d3948eca17c7e808968e2370afe1f9c2a28cef7d2ded584b81` |  |
| `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` | `496652bc59817166f53e00cb828f2119c857c2834063a31764d7876dc150c930` |  |
| `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | `4e6950f0fe571d6ae41a78380c59c20459fdf19f34c57e9777e4e34a6bc61c58` |  |
| `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` | `94d6e6253b266c7f21099aa593aac7b2600edca22ab403aa365dcd789b1c6a97` |  |
| `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` | `f614e7369f8c47c40a87ad1f8867fb8edf7ebc76e94d0ba6c5c59c92cb6347f0` |  |
| `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` | `fb387ecbb7e5272d2ffb53d626b51ffd9c57b409d10c560e6a5ecbfa6a2a8c19` |  |
| `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | `7a7c7ba922f77da22d0f765ed5ea9ccf9216d1900e4b5f18365da9d46437495f` |  |
| `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` | `bfded7507bc684ea9858cd76517ef0e4c23cbc69e5a19f381e6ec522fd6156e6` |  |
| `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | `b778fc2e6bb0a8f8715a56877b3b781439ca214c8a9c8ae126f610c95229882a` |  |
| `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | `bf3c999033195cac778a82a579e44729fb07a405f5cdb41d8e7dc932cb71f942` |  |
| `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | `3567d7c23d2cf6a2fd538cd6822ef60ac3cffeac036394ed1e3559debe492c57` |  |
| `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | `6bbe2bd85e2b5500fbab4d0f51630c0c8e9d65b1a63045ad1fa906298a92a435` |  |
| `frontend/src/lib/errores-ch3-r1.ataque.test.ts` | `72b19b6a00b4ade43b06829bb5bef1a5cdecf5a7d2af57369f1e857a1d4a17f5` |  |
| `frontend/src/lib/errores-ch3-r2.ataque.test.ts` | `5d41a2af073dcaa2b8b016d835d36d5ebae9278863db048484a192a88bb31a30` |  |
| `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` | `66513d957e524af5e336a2c7e656df37f51106507a3984b691df47cd825d4d10` |  |
| `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` | `a9529cefbd27cbb94376a6548ef1b8b247fb1f4155938298ae5d10eaee81008a` |  |
| `frontend/src/lib/format-01c-r1.ataque.test.ts` | `60bc1fc7011e9a0fe5a4c4aa45420f2c7d38adb9ee2f8d235d09847dbe13ac3a` |  |
| `frontend/src/lib/format-d-r1.ataque.test.ts` | `c71cba65dd284d7af11cbc812b6bcf75baa373939edb8318e731858d9c50173f` |  |
| `frontend/src/lib/format-d-r2.ataque.test.ts` | `89dbbb70d5dc404c3d74db5391d10855c8cb1d6b4c643b6147b3ce6ffb2637af` |  |
| `frontend/src/lib/format-d-r3.ataque.test.ts` | `bfa7ded62f7a1402590d438a1cc51060a63fa019ad47d3eb5740e43383064a2a` |  |
| `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | `b6265bf6eec25b7f2c34dcd93dd4d8b23d07ca6214576921a50a66ff16346ffb` |  |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` |  |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `8d8aaf8f82b0f63ad879537a3858438fe2079f9820fb7eb19eff6718b22f802a` |  |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582` |  |

### Reescritura de CAL2-T-20 (arbitraje)
Reescribí CAL2-T-20 por el arbitraje del manager (`revision.md`, "## Arbitraje de la ronda 1 — 02b", SHA-256 `01ad573c3e6d6a8d20fcf4ceea1870c9ab0256b3876c9be90c41852031f7c7f2`). No cuenta como ronda. La versión anterior era incorrecta: solo pasaba si se quitaban columnas en silencio, y eso pierde calificaciones sin avisar.

**El cambio**, en `frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx`; nada más del archivo cambió:
- Sumé la constante `DEMASIADO` con el texto de M-03 y un comentario que explica la reescritura.
- **CAL2-T-20 (a):** «con 1 alumno y 16,382 tareas (16,385 columnas), armarLibroXlsx(hojaDeExportacion(…)) lanza un Error y nunca devuelve una hoja que pase de la XFD». Afirma tres cosas: que no hay ninguna referencia después de `XFD` en una hoja devuelta, que no se devuelve libro y que se lanza un `Error`.
- **CAL2-T-20 (b), nuevo:** «por la vista, una primera respuesta con 1 alumno y 16,382 tareas da una sola petición y el aviso de demasiadas (M-03), sin descarga y con el botón fuera de la espera».
  - El servidor de prueba pagina de verdad las 16,382 tareas, de 100 en 100.
  - Afirma 1 petición, el aviso de M-03 como único aviso, ninguna descarga y ningún `aria-busy`.

**Comprobación de CAL2-T-18 contra el remedio de T-01** (máximo 80 puntos de código sin partir nunca un grafema): mi caso lo exige y no hace falta cambiarlo.
- En los tres casos, el emoji del borde cruza el punto de código 80:
  - la bandera: 79 + 2 = 81;
  - la familia con ZWJ: 78 + 5 = 83;
  - la tecla: 79 + 3 = 82.
- Por eso, con el remedio se descarta entero y la clase termina en «a», que es justo lo que afirma.
- El caso "el emoji que termina exactamente en el 80 se conserva" lo cubren los casos nuevos de CAL2-B06 del programador. Mi prueba no lo contradice: su comentario ya admite que la clase termine en el emoji completo.

**Corrida.** Medí la carga antes: 22 % y 6 % seguidas, nada en paralelo.
```
cd frontend; npx vitest run src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx
```
Código de salida 1. Última línea: `Tests  3 failed | 9 passed (12)` (`Duration  19.85s`).

Los tres rojos son los esperados hasta la corrección:
- **CAL2-T-18:** `expected { bandera: '1f1f2', … } to deeply equal { bandera: '61', … }`.
- **CAL2-T-20 (a):** `una hoja con columnas después de XFD: expected [ 'XFE' ] to deeply equal []`.
- **CAL2-T-20 (b):** `expected [ Array(164) ] to have a length of 1 but got 164`. Hoy el recorrido hace las 164 peticiones y descarga, lo que confirma que T-02 se alcanza por la vista.

Los otros 9 casos siguen en verde. Antes de correr, `prettier --write` acotado a mi archivo, `eslint` y `tsc -b` salieron sin errores.

**SHA-256 nuevo** de `frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx`: `bef8aa53d338fde15e251d53756b76e3381ef9f6de4943c4db83c8e2b3d258dd` (antes, `0cab4d2b15a6d4a78c5653af87f0335f1df8d4a03aaa2ad52e5ce5d505199063`). Es la base de V-01 de la ronda 2 de 02b para ese archivo; las otras 153 `*.ataque` del frontend no cambian.

## Ronda 2 — 02b
Veredicto: **RESISTE.** No hay hallazgos: 0 críticos, 0 altos, 0 medios y 0 bajos. T-01, T-02 y N-07 quedan corregidos, sin regresiones en lo que resistió en la ronda 1.
Verificación propia: lint del frontend en verde · test del frontend 281 archivos / 6062 pruebas en verde · build del frontend en verde.

Fecha: 2026-11-04. Rama `feat/calificaciones-02`, base `<K2a>` = `57192e2`.
- Corrección del programador: "Corrección de la ronda 1 — 02b" en `resumen-programador.md` (`f10e5658…`).
- La aceptó el manager: `revision.md`, "## Verificación de la corrección de la ronda 1 — 02b".
- O-r1b-1 lo aceptó el humano como ampliación de R-02 (opción A, en `aprobacion.md`), así que no lo ataqué.

### V-01
Comparé las 154 `*.ataque` del frontend con la tabla de la ronda 1 de 02b, con CAL2-T-20 reescrita en `bef8aa53…`:
- las 154 son idénticas;
- la única nueva es `exportacion-02b-r2.ataque.test.tsx`.

`git diff --quiet 57192e2 -- backend shared` está limpio.

### Regresión de la ronda 1
`exportacion-02b-r1.ataque.test.tsx` queda en verde completo, con 12 casos:
- **CAL2-T-18 (T-01):** la bandera, la familia y la tecla se quitan enteras y la clase termina en «a».
- **CAL2-T-20 (a) (T-02):** `hojaDeExportacion` lanza antes de armar la hoja.
- **CAL2-T-20 (b) (T-02):** 1 petición, el aviso de demasiadas y ninguna descarga.
- **CAL2-T-11 a T-17, T-19 y T-21:** siguen resistiendo. Entre ellas, el aborto entre ventanas, los cursores repetidos, las 200 ventanas exactas, el texto del servidor, P-13 fuera de la hoja, el triple clic, el escape de punta a punta y N-07 con 3,000 combinaciones.

### Ataques nuevos: `frontend/src/features/calificaciones/exportacion-02b-r2.ataque.test.tsx` (8 casos, todos en verde)
| Caso | Qué ataca | Resultado |
|---|---|---|
| CAL2-T-22 | T-01 con `Intl.Segmenter`, en el borde exacto de 80. Seis grafemas de varios puntos de código: tono de piel (2), bandera (2), familia con ZWJ (5), subdivisión con etiquetas U+E0067…U+E007F (7), «e» con U+0301 (2) y hangul en jamo L+V+T (3). Cada uno se conserva entero si termina en el punto 80 y se quita entero si lo cruza. El largo nunca pasa de 80 | resiste |
| CAL2-T-23 | Un solo grafema de 101 puntos («a» con 100 marcas) da `Calificaciones - AAAA-MM-DD.xlsx`. Tras el recorte, los puntos y espacios que quedan al final se quitan (`aaa. ` y `aaa .. `) | resiste |
| CAL2-T-24 | Sin `Intl.Segmenter` (la propiedad sustituida y restaurada en `finally`): no lanza; recorta a 80 puntos de código sin partir un par sustituto (el U+1F600 en el punto 80 se conserva); quita los puntos y espacios del final. Con el `Segmenter` restaurado vuelve a cortar por grafemas | resiste (el respaldo parte un tono de piel en el borde, como aceptó el arbitraje) |
| CAL2-T-25 | `cabeEnUnaHoja`: 16,381 y 16,382 tareas con 0, 1 y 20,000 alumnos; 1,048,573 y 1,048,574 alumnos con 0 tareas; las dos condiciones a la vez | resiste |
| CAL2-T-26 | El borde que sí cabe, por la vista: 1 alumno y 16,381 tareas hacen 164 peticiones y una descarga; «Promedio (%)» queda en `XFD1` y el promedio del alumno en `XFD4` | resiste |
| CAL2-T-27 | Una clase que crece a mitad del recorrido: la primera respuesta dice 16,381 tareas y las siguientes 16,382, con la tarea nueva. Da el aviso de cambio (regla 1 de §D-4), sin descarga y nunca el genérico | resiste |
| CAL2-T-28 | Las dos condiciones a la vez en la primera respuesta (101 alumnos × 16,382 tareas = 328 ventanas): una sola petición y el aviso de demasiadas | resiste |
| CAL2-T-29 | El escritor: una fila de 16,384 celdas con 16,384 anchos termina en `XFD1`. Lanzan un `Error`: 16,385 celdas en una sola fila (con la primera corta), 16,385 anchos (con filas cortas) y 1,048,577 filas vacías | resiste |

**N-07.** La celda que falta en la regla 8 ahora lanza, y los respaldos `respuestas[0]?.tareas ?? …` y `porVentana[0]?.filas ?? …` ya no existen (`lib.ts`, la combinación). CAL2-T-21 (3,000 combinaciones) sigue en verde: no se alcanza.

**Los `??` que quedan en el código nuevo de 02b**, revisados uno por uno; ninguno oculta un dato:
- `lib/xlsx.ts`:
  - `ENTIDADES[c] ?? c`: la expresión solo casa los cinco caracteres de la tabla;
  - `tabla[(crc ^ byte) & 0xff] ?? 0`: el índice siempre está entre 0 y 255;
  - `desplazamientos[i] ?? 0`: hay un desplazamiento por cada parte.
- `features/calificaciones/lib.ts`: `columna.categoria?.nombre ?? TEXTOS_EXPORTACION.sinCategoria` es el «Sin categoría» de DH-04 para una tarea sin categoría, que es un valor válido.

**Invisibles literales en 02b.** Recorrí con un script de `node` los 19 archivos de producción y de prueba de 02b (después de las correcciones), incluidas mis dos `*.ataque`. Busqué `\p{Cf}`, `\p{Co}`, `\p{Cn}`, `\p{Zl}`, `\p{Zp}`, los espacios Unicode, los rellenos de hangul, U+2800, U+1D159, los controles C0 y C1, `\p{Extended_Pictographic}`, los indicadores regionales, las etiquetas y las marcas combinantes U+0300…U+036F. Hay **0** literales: el U+202E y el U+2066 que vio el manager ya no están.

### Atacado sin hallazgos (resumen)
- **T-01:** los seis tipos de grafema compuesto en los dos lados del borde, el grafema más largo que el tope, el recorte seguido de puntos y espacios, y el navegador sin `Intl.Segmenter`.
- **T-02:** la función pura en los dos bordes, el recorrido con los totales de la primera respuesta (cabe, no cabe, las dos condiciones y la clase que crece) y las tres validaciones del escritor.
- **N-07 y los `??`:** como arriba.
- **La ronda 1:** sin regresiones.

### No atacado y por qué
- **La compatibilidad real con Excel:** la cubrieron H-0 y queda para H-2 y H-3. Ningún agente abre Excel ni navegadores.
- **El navegador sin `Intl.Segmenter` en uno real** (Firefox anterior a 125): solo lo simulé en jsdom, quitando la propiedad.

### Comandos y última línea
Antes de las corridas medí la carga, una suite cada vez y nada en paralelo:
- antes de mis archivos: 16, 11 y 17 %;
- antes de la suite completa: 21, 17, 0 y 0 %.

| Comando | Salida | Última línea |
|---|---|---|
| `cd frontend; npx prettier --write` (solo mi archivo), `npx eslint` y `npx tsc -b` | 0 | sin errores |
| `cd frontend; npx vitest run src/features/calificaciones/exportacion-02b-r2.ataque.test.tsx src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx src/features/calificaciones/estatico-01d-r1.ataque.test.ts` | 0 | `Tests  30 passed (30)` |
| `cd frontend; npm run lint` | 0 | `> tsc -b` |
| `cd frontend; npm run test` | 0 | `Test Files  281 passed (281)` · `Tests  6062 passed (6062)` · `Duration  264.01s` |
| `cd frontend; npm run build` | 0 | `✓ built in 805ms` |

Las cifras cuadran con las del manager: 280 archivos y 6054 pruebas, más mi archivo con 8 casos, dan 281 y 6062.

### SHA-256 de las `*.ataque` del frontend al cierre de la ronda 2 de 02b
Son 155: las 154 de la ronda 1 (con CAL2-T-20 reescrita) y una nueva. Comando: el de V-01, sobre el árbol de trabajo (LF). El SHA-256 de la lista ordenada es `a2f8282929a69aa29e60f8b4f39fe92057c17a524ceb6882c356752416caf674`. Las 94 del backend no cambiaron.

| Archivo | SHA-256 | Nota |
|---|---|---|
| `frontend/src/app/barra-02d-r1.ataque.test.tsx` | `0e49b62b73b2ef55e8c0b2ba26e1d136a3adb674761fda2c11453eb5c2faf7cc` |  |
| `frontend/src/app/cache-03a-r1.ataque.test.tsx` | `b89ede0f6aed45dfcb5e64c8909a822156ce43fd80948e72419cdce9d4541a87` |  |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `e85743c0fbb8e476874a2c67334342d8d69d14153579fc1e4cce0ae6e2b29616` |  |
| `frontend/src/app/contrasena-r1.ataque.test.tsx` | `bc2be5541006887e2a5a4a89b33046180f607d54474b0f96a73d615afbcac385` |  |
| `frontend/src/app/contrasena-r2.ataque.test.tsx` | `f38bcacb716d8a39acdb3535a95603cd0d8ab02572ca57a7df5268b01ceb6eac` |  |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `68fb5d092c0c8ecfcf282477ef023aaae26f6b869656e05109dc3efa276d842a` |  |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `41930017715d3d6869dc7acefd75de8ec3684f1f035b845abdf8ec0f6b734dee` |  |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `1506c27e5f7418b5e087fd30f8809645a2fc3e2761c7249de78f02e24aa6c7a5` |  |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `db48dad405c27062621a44d3744c84cc5903892a51e5a8df18f41383cb9c88a3` |  |
| `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` | `0e1d93e4dd3cbc7b5e9475a17b5ca66f0df056ba25cb117249f4c2e2f5887a51` |  |
| `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` | `2154b5c15f696a0c7f884bff774cf4e2a4208a5281db9076653f8253e2385ab9` |  |
| `frontend/src/app/fondo-r1.ataque.test.tsx` | `f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4` |  |
| `frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx` | `29782507d18ff96315e4030e890b21fdf1eb1c5550c3d1cfe5c92664d30b64dd` |  |
| `frontend/src/app/marco-r1.ataque.test.tsx` | `57cb54afd3b79464f0df01b88fc388cebbeac5657d936c4c204cbae6034b0834` |  |
| `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | `c8a9812f21cb24db50cc2afd945b7b38abacb468fbf4f4df16c07a52c48426ac` |  |
| `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | `d7608d7fc7767f53db3971672fc99fdb8bbd33f303f41e321bcc48ad25f511fd` |  |
| `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` | `2f8056a770397c1601647277944555a48afc4b9a2babeb75e5898f0cc92562bb` |  |
| `frontend/src/app/personas-03c1-r1.ataque.test.tsx` | `6acc49a2e3b649868ccf9a9337143f991b655dafbcff2e5916bca0269bd23a7c` |  |
| `frontend/src/app/personas-03c1-r2.ataque.test.tsx` | `a3e3dadd35c40e9a11a0bdef8cd716daceeb254e5307a837c6598213ba803a7b` |  |
| `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` | `0eefed2c05d76b0790a437e9465a898a9076083b1f046f8785145cfaad0da379` |  |
| `frontend/src/app/router.ataque.test.tsx` | `053e867a904afa3c09eef92ca2e03e929d9f9c93f714040856f40c7418721bbe` |  |
| `frontend/src/app/rutas-01d-r1.ataque.test.tsx` | `fc820217bc3baa3749c077fe16a4abd7ae10e92c84494ffb2a215133c19df36a` |  |
| `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | `f0657fb91f7b3accf64726292f9324c6742c1ac537c6c4a1985ec4e32ae09c83` |  |
| `frontend/src/app/rutas-clases-r1.ataque.test.tsx` | `c7946f5f5d5d16d36b395adc2ad9928acc7fd9839875fb64532b51489756730b` |  |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `f090cbd8e8c9b0af52d4fc19547b07e9b6413f5414cc4b10862f01e29818dddc` |  |
| `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` | `11c6d9c55be91aa41e8525345e3795e34b8e1e661ff7cdd901f729760a033cfd` |  |
| `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` | `48f5ff8fef35faa6d8500fae4a53ca953d7f661100a5c4879ba58e68972ab2de` |  |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | `36d605f79169e16a5afadc7e07fc3781472dd393406430277ceb147fc2da1fa5` |  |
| `frontend/src/components/layout/pie-r1.ataque.test.tsx` | `0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c` |  |
| `frontend/src/components/layout/pie-r2.ataque.test.tsx` | `00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21` |  |
| `frontend/src/components/layout/pie-r3.ataque.test.tsx` | `472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76` |  |
| `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` | `a1814d281dafd8243989c9f9a462a4f33a86b1fb70eeebf29e99bcb0f340d82a` |  |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `7d080037d9a64eebcebb789d1dfd94b787652103e6f9c84f968f9c9f64c3b30c` |  |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` |  |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` |  |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` |  |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` |  |
| `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` | `c21edb5a06b43808ce2be23058409b7ff887e66d60e842c500a3714a90ebcb25` |  |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` |  |
| `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` | `30f45bba30d9348ec1587b42e84ca370274e1bf0af0f310b8a6bbd79fa982669` |  |
| `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` | `d477a809e55e603d3ef6c02ca43b21372b75d0947fa303f1539d48bdf32841f8` |  |
| `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | `761f54f183540d8ae222f97940fa6c2355ff33e515771e627f8efde49261eda2` |  |
| `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` | `14ead3dce027b433d51a9d635b0fa35718ee3875bffc3e1949f96ecb8d2f7135` |  |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `3ceda51db8f67f40c26615fbc4cd7d082035b00f38713c6ca4c7db58e47926c8` |  |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `1f5d1147637c09daa6fdf1384e4395edd69dfdab84aae5d602a362dabd3295bd` |  |
| `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` | `af3f0d474f8052b402c8959a64acf9e730f9ae60f09d90996a6306e9c2440f08` |  |
| `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` | `991b115524d8dade8d6ea2c51fb753dc8832ee410db2161a0ce761d011cfca4a` |  |
| `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | `96b6ab55f0a7bf9b66f8edbcb5ceffa7e4fe35935c6cb12ecab93fc04bc02856` |  |
| `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` | `0ce580976ea894ee4bd9c4adbe3d7d1d524354a8ff22fc7e7cc6acf89057aa53` |  |
| `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | `4bcd3e34b62726fea718efb9c482d8c1f504bbe85ef32427bdf4d65a6832d8f1` |  |
| `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` | `812ee5f1b04a1218e2b96cdb97fb5a964a4a21b0d81b95bb4889beaa4a3894bb` |  |
| `frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx` | `bef8aa53d338fde15e251d53756b76e3381ef9f6de4943c4db83c8e2b3d258dd` | CAL2-T-20 reescrita por el arbitraje |
| `frontend/src/features/calificaciones/exportacion-02b-r2.ataque.test.tsx` | `d15e821c212bb268c65bd9dee36293b02f5bde4dedd4bf9926dbbf99b9971f57` | Nueva (CALIFICACIONES-02b r2) |
| `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` | `5991d8e3d4e694973309f178e5341a2285584cf9ed6006fbb658d7f5a61de5dd` |  |
| `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` | `c744fb831fa9992c2a9ed0729f9ec3cc089f3167ca19133c6eee0133382607a1` |  |
| `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` | `8dea1c2adc5d228e166ce6037a1a1a827d26e2bdc6d7c8534f146517ebc1ac44` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` | `6f7496ca7652e7b4441a7eb9822e74270d50127ac40ba27b86c83edfcd5cc3fa` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` | `24751f358fc5ecd485c475e7025dd881b87fe892f025459a6ff29f615fc5cc66` |  |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` | `c504d0ad3690781275a6ffb78638a6148550b2fd4ee1ed25a4b154054fc4f80d` |  |
| `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` | `6ac36ce1eb4df953626415b3ed431a8f4809dc29cf259f755f1f8509dd54b7ef` |  |
| `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` | `fb33f2a27bfcca906549a12610977478ba72e6e7ed8afd5c5a0a962deb3eb802` |  |
| `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` | `932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872` |  |
| `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` | `55dc274eca96da4360848b88f9f2a839ac815031490ab57ff38de074512d632c` |  |
| `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` | `371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183` |  |
| `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` | `266d088dd727f18af8c8a106b8d9c4dbed75753e4b1b4abb12f3a4df870ecb7f` |  |
| `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` | `856cffbd9c743f9815daf731487e29dc5f5272545dc15820a70baf86ecfa6527` |  |
| `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` | `a9dc00d9cf6e8684113eeb824658c7fb2f3077ee8a54deb0cce47ac802c74f44` |  |
| `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` | `98e645df89c9736ee33f440c1d83f342be84f30caabec0310b1b5185e538fbd6` |  |
| `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` | `f1b2b7d3c2a2bfbc2c2aa31cce4b120e306681c0cc9efb85ac2a954c8f8f8afe` |  |
| `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` | `c6c85ac2f6e7418e81d7817f9c455c0e0973025a15ae2a5378e00c9a71c45620` |  |
| `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` | `a3880b67ffaa0d15763d1c761cef1ff8472029c77bfb2211ab079eadb1685325` |  |
| `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` | `66c0b873bc8b9d8e9e01ac871bd6aaab4328508beb5ec9371d69463d7c12430d` |  |
| `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` | `87dae1927669b46bb52aad94db5107a5284f772fa9b29e225aace19c1a1e8def` |  |
| `frontend/src/features/clases/clases-r1.ataque.test.tsx` | `5f0679d8cfacc8bce01989c04a415dc5b546625eb7dec92f03959de5a0f89815` |  |
| `frontend/src/features/clases/clases-r2.ataque.test.tsx` | `c7ad5edc733e374117a9277f1c2987e84cc2930c77eb4c720ccf15cc9f5fab45` |  |
| `frontend/src/features/clases/clases-r3.ataque.test.tsx` | `a835a11d29aedb8f77f91e826a22c2b7cf5322fced3f6bed0c1acbf7c75a4e61` |  |
| `frontend/src/features/clases/clases-r4.ataque.test.tsx` | `86b04d234527eceefca35b07ce89e6b7ce0b6afe5ccdee2f005e6a4219f0495a` |  |
| `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` | `dce7fd019a6e32b8e4df37dd0728e265f5e9449e9ee2723f372ea174fe312464` |  |
| `frontend/src/features/clases/dudas-03e-r1.ataque.test.tsx` | `3b5a9fac5cd20a881bf6b38597b752725a7f6bbfddcf103b7bf1239a76353dfc` |  |
| `frontend/src/features/clases/dudas-03e-r2.ataque.test.tsx` | `fec2ffc2691bd297dca5f90233d498d10dfd689a5d9a8819bc30e757c6f67c26` |  |
| `frontend/src/features/clases/dudas-03e-r3.ataque.test.tsx` | `18edcffc8e48073362b98c784d5bf64e3335709ae6e1c6425b32aa3310e24b56` |  |
| `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | `ddc9dfaccc8230ec612126fdf29939a8e4311188566e5cfcaa724bd119e959e8` |  |
| `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | `5e20eefe0104b510a3002de084b6162162b5bf20797622c8d92b350853494b53` |  |
| `frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts` | `3cb8e0d7bb13b57638d65aa74ec5ff0f9306f024cf6996b7737232243a0b82f8` |  |
| `frontend/src/features/clases/estatico-r1.ataque.test.ts` | `cdd1ed8890859ae3e884822fc7074852a2173105114745d83fe9a15c1c47c626` |  |
| `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` | `de23d395dfe7a6f3d6d15eb48cb574599dc9d8204e5a90b255c0c10d25a186fa` |  |
| `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` | `46383e1f3ede03cb204dbf602373d0a07e513d8dac7ec4179a203ea6ee270fa3` |  |
| `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | `1d2bfe93db13219086246e21307223229a89416484a09ac69da14460e54e47bb` |  |
| `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` | `8b8ea2d21597bc0444709a9d26fd795d05bc964ef7b5094240628c63018c091b` |  |
| `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` | `b819d6bbde4bd47e3ec724fcdea5e77eb66b12076b8a9a083691b52ef0bdd182` |  |
| `frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx` | `ab006dc1711e9a652643930a7010c25f442d1ffdd137adbb093eb5bd98da90d6` |  |
| `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | `5224976752a14c3e003b246fa97abf25356e370cb46da1cdff9526bf3be86b4e` |  |
| `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | `7f4a935de29c3c519aad697edb1470c4cfcead600f5c1516c5fff948995d4434` |  |
| `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` | `8bc578ef17d2731f388c14ca19bc719a2b8d04d8a41009fadee15227379047bc` |  |
| `frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx` | `479430b848cf3d21a0187138944deec46bb36653071bbd2790ed57620f012976` |  |
| `frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx` | `4d94ccbe786a46ca1d82a280956f1146d5c302a9f83dfac45f39b3b2f94b753f` |  |
| `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` | `0f60f1582fce6e5efaf9bf6856133dc30f1dc4eb9c3b7fea19f90a330f8335b3` |  |
| `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` | `7c434a0e54e70b12d4b2a3de22ffb4dbf5f28a1cfbd2290c22e8a2b59edf0e16` |  |
| `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` | `99df138b24d4aba97b9f714c32ba226e82c7403cf73aa2e9e2b0b028b28e283e` |  |
| `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` | `4817262ef6e4dadff56857e50bab2e06ec479e62d5eaf45b34d70d683736b637` |  |
| `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | `8da38dbcb605ce3d90ace8117ce2cc5c838d71eb24bdd76fad3a53b82da93901` |  |
| `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | `d0acb3527aafa6f687e3eb00563e37be93768e7d7f742694a4d5ce05b75b7e28` |  |
| `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | `d08e51d451ebaeb2d7086c75dc1f73d52c5b4a6b8dfb979932828bed5f5d459d` |  |
| `frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx` | `558212b46641de0794d0ce90e3944a99cb5baa7fab4b09bbac5ea7cac41eaa34` |  |
| `frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx` | `aec8c4131e5dc733246b33e8189e2dc595387324bdd2081d1d245641c20c380a` |  |
| `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` | `67b60a9a5363f88e6ceba210c27452b8d639f6df798aa4e506dc54bb2312249a` |  |
| `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | `7677e0571587c89de1cb76788d499ac545255ca64c8afcb38a8ad6e39c02e2c6` |  |
| `frontend/src/features/clases/recursos-03d-r1.ataque.test.tsx` | `60541290248812cfce5591ddf33d01125d60c33257743a7ec48a445013d3d8c1` |  |
| `frontend/src/features/clases/recursos-03d-r2.ataque.test.tsx` | `4aafaa73980ba1bc29be043623a030c9eaa730825eb61a403bf54f9ac700b42d` |  |
| `frontend/src/features/clases/recursos-03d-r3.ataque.test.tsx` | `70b1a49a6a0e471422be987466228e5beb87e25baee2906790651c94ed214a3a` |  |
| `frontend/src/features/clases/recursos-03e-r1.ataque.test.tsx` | `29a3125cc70969f2fc2bb1f012beeb81840e1a00ea08d5b588b10d190342ae7f` |  |
| `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | `85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511` |  |
| `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` | `4303eac77b98e8978495d9e68fd7725ac436f9db757dbc0c02c59051436908fa` |  |
| `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` | `09435abbb9a26dd71c52b4d95487c6d38594f1ba062aefb60f73b7eb7308f991` |  |
| `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` | `d899c19ba982fbde2208bbc7fa009869556c84bd4650586dbd9ee90b22234e47` |  |
| `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` | `97af503e763f7dff9fcfbdc72862cd21de6af8e51d3ec41134f8475d98ae2df6` |  |
| `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` | `db42c88d5b0bfb1125bf122c03a2e019d6f5365c128ac4bfadd413a26a934845` |  |
| `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` | `f6924bc272a5240cf97d35729c797cc10960ed7cf94fe1be1b69ca2df6c1cf8f` |  |
| `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | `9866ef34167061e2715b65a352c55d08c7e9268033e879ae633c7fd568e4d49f` |  |
| `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` | `ea58eb11c3157a33c5730f87f2cf562ae178589b30264902b165c4439cebc2ee` |  |
| `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` | `2ef258e946084f17e33936e8fa257551a90323b589859dd2e1f70aabeaf711bf` |  |
| `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` | `e2fefd7d744f77c7bdd2ba73a08cc51076d0f6130bf4d0a225e0e972a1dce111` |  |
| `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` | `11bb5433fb30f268b6d93e1e7814d826bbab8fb1f173e574faf52f5a96b5a41e` |  |
| `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` | `d8daccb56c8de8d9f1b0f8d1b0907c110e327f4f55b016fc0fe7fc0f25ccc79c` |  |
| `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` | `ef86c46708f0682bca5a023e85794639c396ec94d207cac23ceb13585ab39e75` |  |
| `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` | `5ff367edba10c9ba9c7e50f8ed874032654fa2abdc0dd8f4a122a000355472ab` |  |
| `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` | `2938ae2f1c00f63a0372997c7ba68bdc0ab097895769bf9060072a4ac2674c5a` |  |
| `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` | `0963f14f4842d6d57288876c932496ac09d44b872fc049492ee6e8ba539f3235` |  |
| `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` | `4f486ca37d2a2bb6cc26754281d2adce086a9d8d4485a069de7ae5d54e360acf` |  |
| `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` | `93a5a0a648669e9c96494a62b2b16082b07296f279e2892bf2c8d47834ee2fc1` |  |
| `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | `08a5e1a5642e7fc7553632dd5cf4e07f0ea35c3ef1e7293d010bbc49b09465aa` |  |
| `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | `172be3efd919c0d3948eca17c7e808968e2370afe1f9c2a28cef7d2ded584b81` |  |
| `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` | `496652bc59817166f53e00cb828f2119c857c2834063a31764d7876dc150c930` |  |
| `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | `4e6950f0fe571d6ae41a78380c59c20459fdf19f34c57e9777e4e34a6bc61c58` |  |
| `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` | `94d6e6253b266c7f21099aa593aac7b2600edca22ab403aa365dcd789b1c6a97` |  |
| `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` | `f614e7369f8c47c40a87ad1f8867fb8edf7ebc76e94d0ba6c5c59c92cb6347f0` |  |
| `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` | `fb387ecbb7e5272d2ffb53d626b51ffd9c57b409d10c560e6a5ecbfa6a2a8c19` |  |
| `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | `7a7c7ba922f77da22d0f765ed5ea9ccf9216d1900e4b5f18365da9d46437495f` |  |
| `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` | `bfded7507bc684ea9858cd76517ef0e4c23cbc69e5a19f381e6ec522fd6156e6` |  |
| `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | `b778fc2e6bb0a8f8715a56877b3b781439ca214c8a9c8ae126f610c95229882a` |  |
| `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | `bf3c999033195cac778a82a579e44729fb07a405f5cdb41d8e7dc932cb71f942` |  |
| `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | `3567d7c23d2cf6a2fd538cd6822ef60ac3cffeac036394ed1e3559debe492c57` |  |
| `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | `6bbe2bd85e2b5500fbab4d0f51630c0c8e9d65b1a63045ad1fa906298a92a435` |  |
| `frontend/src/lib/errores-ch3-r1.ataque.test.ts` | `72b19b6a00b4ade43b06829bb5bef1a5cdecf5a7d2af57369f1e857a1d4a17f5` |  |
| `frontend/src/lib/errores-ch3-r2.ataque.test.ts` | `5d41a2af073dcaa2b8b016d835d36d5ebae9278863db048484a192a88bb31a30` |  |
| `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` | `66513d957e524af5e336a2c7e656df37f51106507a3984b691df47cd825d4d10` |  |
| `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` | `a9529cefbd27cbb94376a6548ef1b8b247fb1f4155938298ae5d10eaee81008a` |  |
| `frontend/src/lib/format-01c-r1.ataque.test.ts` | `60bc1fc7011e9a0fe5a4c4aa45420f2c7d38adb9ee2f8d235d09847dbe13ac3a` |  |
| `frontend/src/lib/format-d-r1.ataque.test.ts` | `c71cba65dd284d7af11cbc812b6bcf75baa373939edb8318e731858d9c50173f` |  |
| `frontend/src/lib/format-d-r2.ataque.test.ts` | `89dbbb70d5dc404c3d74db5391d10855c8cb1d6b4c643b6147b3ce6ffb2637af` |  |
| `frontend/src/lib/format-d-r3.ataque.test.ts` | `bfa7ded62f7a1402590d438a1cc51060a63fa019ad47d3eb5740e43383064a2a` |  |
| `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | `b6265bf6eec25b7f2c34dcd93dd4d8b23d07ca6214576921a50a66ff16346ffb` |  |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` |  |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `8d8aaf8f82b0f63ad879537a3858438fe2079f9820fb7eb19eff6718b22f802a` |  |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582` |  |
