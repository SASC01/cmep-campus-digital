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
