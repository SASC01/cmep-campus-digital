> **Nota de transcripción (orquestador, 2026-10-06):** la herramienta `Write` del tester rechazó crear este archivo ("Subagents should return findings as text"). El tester entregó el texto de esta sección en su respuesta y el orquestador lo transcribió aquí tal cual, sin cambiar contenido (`AGENTS.md`, "Transcripción con cotejo"). Las secciones siguientes las anexa el tester con `cat >>`.

# Reporte del Tester — TAREAS-01 · tareas, temas y categorías ponderadas

## TAREAS-01a — Ronda 0
Estado: DETENIDA por PA-01 (2026-10-06). No se corrió ninguna prueba del backend ni del frontend, no se reescribió ninguna *.ataque, no hay inventario I-1 ni I-2 todavía.

### Precondiciones
- Rama feat/tareas; base ad070b9 existe; HEAD = ad070b9d6545afe125d52fd5f1839699015ba8a2.
- Árbol limpio en shared/, backend/ y frontend/ contra ad070b9 (git diff --name-only y git status --porcelain vacíos). Fuera de los paquetes solo cambian docs/ARCHITECTURE-ESSENTIALS.md, docs/ESTADO.md y la carpeta del encargo.
- PA-02, ESSENTIALS: SHA-256 21896847350e5e562c33ad4f58a1dd5860145cb209bf6cefff9ea3d855e72558, igual al de aprobacion.md.
- V-01: 141 *.ataque (67 backend, 74 frontend); 141 de 141 hashes iguales a la tabla de la ronda 3 de CLASES-02d.
- PA-01: regla del firewall correcta (Enabled, Inbound, Block, Public); red activa "uacam5 2" (Pública), no declarada de confianza hoy (ESTADO §5: solo lo fue el 2026-10-05). PA-01 activa: no se corre ninguna prueba del backend.

### Qué falta para seguir
Que el humano se conecte a IZZI-F281 o IZZI-F281-5G, o declare por escrito "uacam5 2" de confianza para hoy.

### Reanudación (2026-10-06)
- **PA-01 resuelta por el humano para la sesión de hoy** (texto literal en `aprobacion.md`: "Opción 2: declaro la red uacam5 2 de confianza para la sesión de hoy (2026-10-06). La regla 'Campus: bloquear entrada a Docker en redes publicas' está habilitada. Retoma la ronda 0 de 01a."). Lo comprobé antes de correr: la red activa sigue siendo `uacam5 2` (Pública) y la regla sigue `Enabled: True`, `Inbound`, `Block`, perfil `Public`. PA-01 cumplida. El estado "DETENIDA por PA-01" de arriba queda reemplazado por esta sección: la ronda 0 siguió y terminó.
- **V-01 y PA-02 no se repitieron:** `HEAD` sigue en `ad070b9d6545afe125d52fd5f1839699015ba8a2` y `git status --porcelain -- shared backend frontend` salió vacío al reanudar.
- Docker Desktop encendido (`docker info`: motor 28.5.1). No arranqué la API, Vite ni el worker, ni abrí navegadores.

### Búsqueda de casos contradichos (C-1 a C-4)
Busqué en `backend/test/**` y en `backend/src/**/*.test.ts`: `information_schema`, `pg_indexes`, `pg_constraint`, `pg_enum`, `enum_range`, `pg_tables`, `pg_class`, `_prisma_migrations`, `prisma/migrations`, `schema.prisma`, `printRoutes`, `bloquearClase`, `maestros-de-clase`, `publicaciones_titulo_segun_tipo`, `'tarea'` y `"tarea"`, recorridos de fuentes (`readdirSync`, `readdir(`), listas cerradas de archivos de `adapters/`, `handlers/` y `core/`, `Object.keys` sobre módulos (`import * as`), `FOR KEY SHARE`, `FOR UPDATE` y `unnest`, `temaId`, `/temas` y `categorias`. No hace falta buscar en el frontend: en 01a no cambia, y ninguna prueba del frontend lee `shared/src` ni el backend.

| C-n | Casos encontrados | Qué hice |
|---|---|---|
| C-1 (migraciones, tablas, enum, índices, `CHECK`) | Ninguno cerrado. `migracion-maestros-de-clase.integracion` (PR-2A07 y PR-2A08) y `sexto-paso-02a-r1.ataque` (punto 5) buscan la migración por el sufijo `_clases_administradas` y los índices y restricciones por nombre. `alumnos.integracion` (PR-B05) lee los índices de `usuarios` por nombre. Ninguna cuenta migraciones, tablas, índices ni valores de enum | Sin cambios |
| C-2 (ocho rutas y dos `HEAD`, V-06) | `sesiones-y-cadena.ataque` › "bajo /api solo existen las rutas de …": lista cerrada de `printRoutes`. Las demás listas de rutas son abiertas: `gestion-clases-autorizacion` PR-2A24 comprueba que ciertas rutas existan (`rutas.has`) y `RUTAS_PUBLICAS.size === 10`; `movimientos-inscripcion` PR-B16g solo busca la palabra "movimiento" | **Reescrito** (abajo) |
| C-3 (`CHECK` de título por tipo; `'tarea'` en el enum) | `muro.integracion` PR-C02c (anuncio con título y material sin título, por Prisma, fallan con `publicaciones_titulo_segun_tipo`) sigue siendo válida con el `CHECK` nuevo, si conserva el nombre (§D-1 dice "se reemplaza"). `muro.integracion` PR-C16 y `muro-c-r1.ataque` › "tipo desconocido" mandan `tipo: "tarea"` a `POST …/publicaciones`, y el `400` sigue, porque `crearPublicacionSchema` no gana `tarea` (§D-0.2). Ninguna lee la definición del `CHECK` ni comprueba los valores del enum | Sin cambios |
| C-4 (`bloquearClase` cambia de archivo) | Ninguna prueba importa `bloquearClase`: no se exporta en `maestros-de-clase.ts` ni en `index.ts`, y ninguna prueba lee `maestros-de-clase.ts`. `bloquearClase` usa `updateMany`, sin SQL crudo, así que moverlo no cambia la lista de E6 (I-2) | Sin cambios |

**Casos fuera del inventario:** ninguno. Ninguna `*.ataque` del backend queda contradicha por 01a fuera de C-2. Revisé en especial estas reglas estáticas:
- `muro-c-r1` › "ningún consumidor…": las colas de avisos cambian en 01b (C-6), no en 01a.
- `arquitectura-cuentas-r1`: pg-boss, resend, `$queryRawUnsafe`, `obtenerDb` en `handlers/` y la lista de archivos de AUTH-02a. Sigue valiendo con el diseño de 01a.
- `higiene-de-pruebas`: `.$transaction(` solo en `cliente.ts`, `addHook` solo en `app.ts` y la guarda. Sigue valiendo con el diseño de 01a.

### Diff de lo reescrito (1 archivo, 1 caso; C-2)
`backend/test/sesiones-y-cadena.ataque.test.ts` › "ataque: superficie de rutas" › el caso de la lista cerrada de rutas:
- Comentario nuevo "TAREAS-01a ronda 0 (C-2 …)", como los de las rondas 0 anteriores. Explica que entran 8 rutas más 2 `HEAD` (10 entradas), que ninguna crea cuentas ni cambia roles, que ninguna es pública, y cómo anida `printRoutes`.
- El título suma "y TAREAS-01a". Queda: "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a, CLASES-b, CLASES-c, CLASES-d, CLASES-02a y TAREAS-01a: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros".
- La lista pasa de 62 a **72** entradas, ordenada igual que `.sort()` y sin repetidos (lo comprobé con un script). Entran exactamente las de V-06:
  - `DELETE /api/clases/:claseId/temas/:temaId`
  - `GET` y `HEAD /api/clases/:claseId/categorias`
  - `GET` y `HEAD /api/clases/:claseId/temas`
  - `POST /api/clases/:claseId/temas`
  - `PUT /api/clases/:claseId/categorias`
  - `PUT /api/clases/:claseId/publicaciones/:publicacionId/tema`
  - `PUT /api/clases/:claseId/temas/:temaId`
  - `PUT /api/clases/:claseId/temas/orden`
- **Lo que protege no cambia:** cualquier línea del árbol que no se reconozca falla; cualquier ruta de más o de menos falla; ninguna ruta crea administradores; solo crean maestros las tres de hoy. El análisis por sangría no se tocó.
- Ninguna otra línea cambia (`git diff ad070b9 -- backend/test/sesiones-y-cadena.ataque.test.ts`: un hunk de comentario y título, y cuatro hunks de solo inserciones en la lista).

### Rojos esperados (lista exacta; PA-05 del programador)
| # | Archivo | Caso | Por qué | Se pone en verde cuando |
|---|---|---|---|---|
| 1 | `backend/test/sesiones-y-cadena.ataque.test.ts` | "ataque: superficie de rutas" › "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a, CLASES-b, CLASES-c, CLASES-d, CLASES-02a y TAREAS-01a: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros" | C-2: espera las 10 entradas nuevas de V-06, que todavía no existen. Recibe las 62 de hoy y faltan exactamente las 10, nada más (lo comprobé en la corrida completa y en una corrida aislada del archivo ya en su versión final: `Tests  1 failed \| 34 passed (35)`) | `app.ts` registra `temasHandler` y `categoriasHandler` con exactamente esas rutas (A-10) |

No hay más rojos: las otras 66 `*.ataque` del backend pasan en la corrida completa.

### I-2 (pruebas normales con listas cerradas que caen con 01a; las cambia el programador con A-3)
1. **`backend/test/bloqueo-usuario.integracion.test.ts`** › "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts y publicaciones.ts usan SQL etiquetado en adapters/db".
   - **Lista cerrada:** los archivos de `src/adapters/db/` que contienen `$queryRaw` o `$executeRaw`.
   - **Por qué cae:** con 01a, `referencias.ts` (los dos `FOR KEY SHARE`), `temas.ts` (el `UPDATE … FROM unnest` del orden) y `categorias.ts` (el `FOR UPDATE` de las que se quitan y el `UPDATE … FROM unnest`) usan SQL etiquetado (§D-2, §D-3, §D-7; V-04 los nombra).
   - **Lo que cambia:** se agregan esos tres nombres. `bloqueo-clase.ts` no entra (`bloquearClase` es un `updateMany`). En 01b se sumará `tareas.ts`.
   - Hoy pasa: caerá cuando existan esos archivos.

No encontré otras. Las abiertas, que no caen:
- `gestion-clases-autorizacion` PR-2A24 y `movimientos-inscripcion` PR-B16g y PR-B16h.
- `migracion-maestros-de-clase` PR-2A07 y PR-2A08.
- `alumnos.integracion` PR-B05.
- `muro.integracion` PR-C02c y PR-C16, si el `CHECK` conserva su nombre.
- `higiene-de-pruebas`.

### Corrida completa del backend
- **Comando:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/back-01a-r0.json > <scratchpad>/back-01a-r0.txt 2>&1`, de 15:02:14Z a 15:05:23Z, código 1 (el rojo esperado).
- **Resultado:** `Test Files  1 failed | 146 passed (147)` · `Tests  1 failed | 1745 passed (1746)`. Según el JSON: 1746 casos, 1 fallido, 0 omitidos.
- **Última línea de Vitest:** `   Duration  174.06s (transform 15.61s, setup 6.77s, import 259.05s, tests 849.29s, environment 53ms)`. La última línea de la salida es el error de npm por el código 1: `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run --reporter=default --reporter=json --outputFile.json=…/back-01a-r0.json`.
- **Único rojo:** el rojo esperado número 1. No hubo tiempos límite ni rojos intermitentes (PA-12 no aplica).
- **Antes y después:** el comentario del caso reescrito cambió una vez después de la corrida completa ("11 entradas" pasó a "10 entradas"; solo comentario). El archivo, ya en su versión final, se corrió aislado (`npx vitest run test/sesiones-y-cadena.ataque.test.ts`), con el mismo resultado: `Tests  1 failed | 34 passed (35)`, y el mismo caso en rojo.

### I-1 (PA-07 b), lista cerrada de la corrida final de la ronda 0 de 01a (base de PA-07 para 01a; 01b saca la suya)
Atribución por la última "incoming request" con el mismo `pid` y `reqId` antes de la línea del error (por app, no con un mapa global), más el mensaje y la pila.

| # | Ruta | Llamada | Origen |
|---|---|---|---|
| 1-5 | `POST /api/auth/login` | "fallo simulado de la base en la búsqueda" (`buscarCredencialesPorEmail` del doble, desde `handlers/auth/index.ts`) | `backend/test/intentos-r2.ataque.test.ts` |
| 6 | `POST /api/auth/login` | "fallo simulado de la base al crear la sesión" (`crearSesion` del doble) | `intentos-r2.ataque.test.ts` |
| 7 | `POST /api/clases/:claseId/archivos` | `ZodError` (`invalid_format` de `subida.url`, "La URL del almacén debe ser http o https") al armar la respuesta | `backend/test/archivos-d-r2.ataque.test.ts` › "ataque d-r2: T-39 del lado del servidor" |
| 8 | `POST /api/clases/:claseId/archivos/:archivoId/descarga` | `ZodError` (`invalid_format` de `url`) al armar la respuesta | `archivos-d-r2` › T-39 |
| 9 | `GET /api/clases/:claseId/publicaciones` | `ZodError` (`invalid_format` de `publicaciones[0].adjuntos[0].vistaPrevia.url`) al armar la respuesta del muro | `archivos-d-r2` › T-39 |
| 10 | `GET /api/prueba/error-comun` | `Error: boom` (`test/salud.integracion.test.ts`) | `backend/test/salud.integracion.test.ts` |

Es igual al I-1 de CLASES-02b, 02c y 02d: 10 líneas, mismas rutas y mismas llamadas.

### PA-07
Contado en `<scratchpad>/back-01a-r0.txt` (la salida completa de la corrida de arriba), con `grep -o -F` por término:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` (`maxWait`) | 0 |

**Control positivo:** sí. Los tres `P2028` deterministas de `servicio-ocupado.integracion` aparecen, cada uno con su ruta. Son de `timeout`, nivel 40 y `SERVICIO_OCUPADO`:
- `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()` (`adapters/db/usuarios.ts`, `sesionViva`).
- `POST /api/auth/refrescar` › `tx.sesion.updateMany()` (`adapters/db/sesiones.ts`).
- `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()` ("A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms…").

Los dos de `cuentas-r3.ataque` también aparecen, nivel 40 y `SERVICIO_OCUPADO`:
- `POST /api/auth/login` › `tx.sesion.create()` (`adapters/db/sesiones.ts`).
- `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()` (`adapters/db/tokens-cuenta.ts`).

Ningún `P2028` es de una ruta de TAREAS-01: todavía no existen.

**PA-07: limpia.**

### Lint del backend
- **Comando:** `cd backend; npm run lint > <scratchpad>/lint-01a-r0-b.txt 2>&1`, código 0. Lo corrí otra vez después del último cambio de comentario.
- ESLint, sin errores; Prettier: "All matched files use Prettier code style!"; `tsc` de `src/` y de las pruebas, sin errores.
- **Última línea:** `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`. Es el eco del comando: `tsc` no imprime nada cuando pasa.

### Conteos
- Corrida completa: 147 archivos y 1746 casos del backend (de la línea `Test Files` y del JSON).
- `*.ataque`: **141** (67 del backend y 74 del frontend; `git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'`). Ninguna nueva y 1 cambiada.
- El frontend no se corrió: en 01a no cambia y no reescribí nada suyo.

### Tabla de SHA-256 de las 141 `*.ataque` al cierre de la ronda 0 de 01a (base de V-01 del programador y del manager; 1 cambiada, ninguna nueva)
Comando: `git ls-files '*.ataque.test.ts' '*.ataque.test.tsx' | xargs sha256sum`, comparado contra la tabla de la ronda 3 de CLASES-02d. Mismos valores que `Get-FileHash -Algorithm SHA256`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `2C8CB4D784AA042ABD9F46AFF965FA9CE64D7BEBF7F3856EF5B04F3D366445C8` | `backend/test/sesiones-y-cadena.ataque.test.ts` | reescrita: C-2 (ronda 0 de 01a) |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
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
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `09E0FDB71E8862F37D681D2A9CB74434227FFEA81E71EF34B87C4AC8BDAB4E47` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `90AF141297CD9309D7E6316833B2BD222347BD25292AF890A55F98126093522C` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `5A856883D032B3ECB2F766BAD450C28D79FD761788C01C1DED16B0EB6F95371D` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01a — Ronda 1
Veredicto: **ROTO**. La corrida completa quedó **detenida por PA-07 (b) y PA-12**; los detalles están en "Corrida completa y PA-07".
Verificación propia: lint código 0 · test `Test Files  3 failed | 153 passed (156)` · `Tests  8 failed | 1905 passed (1913)`. Son 7 rojos de mis `*.ataque` nuevas (los hallazgos) y 1 rojo intermitente en una prueba normal (PA-12).

### Precondiciones
- **PA-01:** red activa `uacam5 2` (Pública), declarada de confianza por el humano para hoy (`aprobacion.md`). La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public). Docker 28.5.1, encendido.
- **Rama:** `feat/tareas`, con `HEAD` en `ad070b9` y el árbol de 01a sin commit (el que aceptó el manager).
- **V-01:** las 141 `*.ataque` de la tabla de la ronda 0 de 01a siguen idénticas (`diff` contra esa tabla: solo se agregan las 2 nuevas de esta ronda). No modifiqué ninguna `*.ataque` existente ni ninguna prueba del programador.
- **Regresión:** `npx vitest run test/sesiones-y-cadena.ataque.test.ts` da `Tests  35 passed (35)`: el caso reescrito en la ronda 0 ya está en verde. También pasa en la corrida completa.

### Hallazgos

#### T-01: renombrar un tema con el `temaId` de la ruta en mayúsculas responde 404 TEMA_NO_ENCONTRADO
Severidad: media
Prueba: `backend/test/temas-01a-r1.ataque.test.ts`, dos casos:
- "ataque TAREAS-01a r1: identificadores en mayúsculas (§D-2, «Un id de otra clase…»)" › "renombrar con el temaId de la ruta en mayúsculas responde 200 y renombra, igual que en minúsculas".
- "… › renombrar a su mismo nombre (otra capitalización) con el temaId en mayúsculas responde 200: no se cuenta a sí mismo".

Esperado: `200` y el tema renombrado, igual que con el id en minúsculas. Es el mismo tema: un UUID no distingue mayúsculas.
Obtenido: `404 {"error":{"codigo":"TEMA_NO_ENCONTRADO","mensaje":"Ese tema ya no existe."}}`; el nombre no cambia.

Causa (lectura del código):
- `temaIdParamSchema` no pasa el id a minúsculas.
- `validarRenombre` (`core/tareas/temas.ts`) compara `tema.id === temaId` contra los ids que devuelve la base, siempre en minúsculas.
- La segunda condición ("no se cuenta a sí mismo", `tema.id !== temaId`) tiene la misma comparación, así que el remedio debe cubrir las dos.
- En el mismo archivo, `validarOrdenDeTemas` sí compara en minúsculas.

Requisito o regla: §D-2, `PUT …/temas/:temaId`. "Puntos de ataque para el Tester" → 01a, punto 1 ("ids en mayúsculas"). Es un caso borde mal resuelto: la misma ruta responde `204` a `DELETE` con ese id y `404` a `PUT`.

Hermanos (las seis rutas de temas y mover, y las referencias por id del cuerpo), comprobados en "hermanos: borrar, ordenar y publicar un material aceptan ids en mayúsculas", que **pasa**:
- `DELETE …/temas/:temaId` en mayúsculas: `204`.
- `PUT …/temas/orden` con ids y `claseId` en mayúsculas: `200`, en el orden pedido.
- `POST …/publicaciones` con `temaId` en mayúsculas: `201`, y el tema queda guardado.
- `PUT …/publicaciones/:publicacionId/tema` en mayúsculas: `200`, y el tema queda guardado (ver T-04 por la respuesta).
- `GET` y `POST …/temas` no llevan `temaId`.
- Ids de categoría en mayúsculas en el cuerpo de `PUT …/categorias`: se actualiza la misma fila y la respuesta los da en minúsculas (`categorias-01a-r1` › "ids en mayúsculas actualizan la misma fila…", pasa).

#### T-02: un carácter invisible dentro del nombre evade "nombre repetido" en temas y categorías
Severidad: baja
Prueba:
- `backend/test/temas-01a-r1.ataque.test.ts` › "ataque TAREAS-01a r1: nombres repetidos (S-05)" › "un carácter invisible dentro del nombre (U+200B, U+00AD, U+200D, U+2060, U+FEFF) no lo vuelve otro: 409 TEMA_REPETIDO al crear y al renombrar".
- `backend/test/categorias-01a-r1.ataque.test.ts` › "ataque TAREAS-01a r1: nombres (S-05)" › "un carácter invisible dentro del nombre (U+200B, U+00AD, U+200D, U+2060, U+FEFF) no lo vuelve otro: 400 «No repitas el nombre de una categoría»".

Esperado: con "Unidad 1" en la clase, "Uni" + U+200B + "dad 1" (y lo mismo con U+00AD, U+200D, U+2060 y U+FEFF en el interior) es el mismo nombre: `409 TEMA_REPETIDO`. Dos categorías "Exámenes" y "Exá" + U+200B + "menes" en un mismo guardado dan `400`.
Obtenido: en temas, `201` al crear y `200` al renombrar con las cinco variantes; en categorías, `200` con las cinco. Quedan dos temas, o dos categorías, que se ven idénticos en la interfaz.

Causa: `normalizarTerminoDeBusqueda` (`shared/src/clases.ts`) quita marcas y colapsa espacios, pero no quita los caracteres `Default_Ignorable_Code_Point`. `textoConContenidoSchema` los admite a propósito, porque forman emojis.
Requisito o regla: S-05 ("Nombres de tema y de categoría no se repiten en la clase"). "Puntos de ataque" → 01a, puntos 2 y 5.
Hermanos: crear y renombrar tema fallan los dos, y también el guardado de categorías; en 01a nada más compara nombres. El resto de las variantes de S-05 **sí** cuenta como repetido en temas y en categorías (casos que pasan): mayúsculas, acentos, espacios internos y de los extremos, NBSP, U+3000, tabulador y NFD.

#### T-03: las formas de compatibilidad Unicode evaden "nombre repetido" en temas y categorías
Severidad: baja
Prueba:
- `backend/test/temas-01a-r1.ataque.test.ts` › "… nombres repetidos (S-05)" › "las formas de compatibilidad (ancho completo, ligaduras) no lo vuelven otro: 409 TEMA_REPETIDO".
- `backend/test/categorias-01a-r1.ataque.test.ts` › "… nombres (S-05)" › "las formas de compatibilidad (ancho completo) no lo vuelven otro: 400 «No repitas el nombre de una categoría»".

Esperado: "Unidad 1 final" en letras de ancho completo (U+FF35…), con la ligadura U+FB01 ("ﬁnal") o con el dígito encerrado U+2460 en lugar de "1" es el mismo nombre que "Unidad 1 final". Lo mismo en categorías: "Tareas" en ancho completo frente a "Tareas".
Obtenido: `201` en los tres temas y `200` en las categorías.
Causa: la normalización es NFD, no NFKD.
Requisito o regla: "Puntos de ataque para el Tester" → 01a, punto 2 ("ancho completo"). S-05 solo nombra mayúsculas y acentos, así que el manager decide si el plan lo exige. Lo separo de T-02 para que se arbitre aparte: aquí los nombres sí se distinguen a la vista.
Hermanos: los mismos de T-02.

#### T-04: mover con el `publicacionId` de la ruta en mayúsculas lo devuelve en mayúsculas y el `temaId` en minúsculas
Severidad: baja
Prueba: `backend/test/temas-01a-r1.ataque.test.ts` › "ataque TAREAS-01a r1: identificadores en mayúsculas (§D-2, «Un id de otra clase…»)" › "mover con temaId y publicacionId en mayúsculas responde 200 y los dos ids en minúsculas (decisión 6 del resumen: el criterio de los ids de toda la API)".
Esperado: `{ publicacionId: <minúsculas>, temaId: <minúsculas> }`. La decisión 6 del resumen, aceptada por el manager, pasa `temaId` a minúsculas "por el criterio de los ids de toda la API".
Obtenido: `{"publicacionId":"D4B4…866E","temaId":"6b52…1e8e"}`. El movimiento sí se guarda: `200`, y la publicación queda en el tema.
Requisito o regla: la decisión 6 aceptada en `revision.md`. Es un detalle: una misma respuesta con dos criterios, y un cliente que compare con el id de su caché no encuentra el elemento.
Hermanos: el mismo mecanismo de T-01 (ids de la ruta que no se pasan a minúsculas). Ninguna otra respuesta de 01a repite un id de la ruta.

### Atacado sin hallazgos
Todo lo de abajo pasa en la corrida completa, cada punto con su caso en las dos `*.ataque` nuevas.

**Referencias cruzadas**, con el mismo maestro en las dos clases: el sexto paso pasa en ambas y solo el filtro por la clase de la ruta las separa.
- Renombrar el tema ajeno: `404 TEMA_NO_ENCONTRADO`. Borrarlo: `404 TEMA_NO_ENCONTRADO`.
- Mover lo propio al tema ajeno: `404 TEMA_NO_ENCONTRADO`. Mover lo ajeno, a un tema o a `null`: `404 PUBLICACION_NO_ENCONTRADA`.
- Ordenar con el tema ajeno: `409 ORDEN_DESACTUALIZADO`.
- Publicar un material con el tema ajeno: `404`, sin publicación.
- Guardar categorías con el id de una categoría de la otra clase: `404 CATEGORIA_NO_ENCONTRADA`.
- Ninguna de las dos clases cambia. El mismo nombre de tema en dos clases no es repetido.

**Ids malformados:** con espacios, sufijos, llaves, sin guiones, con `%00` o con una letra fuera de rango, en la ruta y en el cuerpo de las cinco rutas que los reciben, y en el cuerpo de categorías (también `null` y números). Todos responden `400 VALIDACION` y nada cambia.

**"orden" como `:temaId`:** `DELETE …/temas/orden` y `…/ORDEN` dan `400`; `PUT …/temas/orden` con cuerpo de orden reordena.

**Topes en carrera:**
- Con 28 temas, cinco creaciones simultáneas: dos `201` y tres `409 TOPE_DE_TEMAS`; quedan 30 temas con 30 órdenes distintos.
- Un reordenamiento y tres creaciones simultáneas: nunca `500`; el orden responde `200` o `409` y al final no se repite ningún orden.
- Dos borrados simultáneos del mismo tema: `204` y `404 TEMA_NO_ENCONTRADO`.
- Diez categorías de 10 pasan; once dan `400`.

**§D-7, los tres bloqueos.** En cada caso la espera se comprobó con `formadasDetrasDe` (la fila, no cualquier bloqueo) y la transacción lleva su `timeout` de 30 s.
- Clase: cinco guardados de categorías simultáneos, con conjuntos y sumas distintas y uno inválido. Ninguno da `500`, el inválido da `400` y al final queda exactamente uno de los conjuntos válidos, que suma 100 o está vacío.
- Tema (`FOR KEY SHARE`) contra un borrado retenido: publicar un material con ese tema espera y responde `404`, sin publicación ni trabajo `MATERIAL_CREADO`. Mover a ese tema espera y responde `404`, y el material sigue en su tema.
- Categoría, al revés: con el borrado de la categoría retenido, `bloquearCategoriaParaUsar` espera y devuelve `false`.

**Orden de temas.** Responden `400`: un id repetido en otra capitalización, 31 ids, la lista vacía, un valor que no es lista, el cuerpo sin la clave y una lista con `null`. Responden `409`: un tema borrado en medio y uno faltante. El orden no cambia en ningún caso.

**Pesos.**
- Responden `400` sin cambios: `33.3` + `66.7`, `50.5` + `49.5`, negativos, `"50"`, `null`, `true`, 0, 101, `100.0000001`, `MAX_SAFE_INTEGER + 2`, `1e309`, `-0` y `"1e2"`.
- Pasan: `1e2` y `100.0` como número JSON (valen 100), 33 + 33 + 34, y una sola categoría de 100.
- El id de una categoría recién quitada: `404`.

**Quitar categorías con tareas.**
- Mensaje exacto en singular: "«Quiz «A»» tiene 1 tarea. Muévelas a otra categoría antes de quitarla."; en plural: "«Proyecto» tiene 2 tareas. …".
- Con dos categorías con tareas, con la lista vacía o con una lista que solo crea, responde `409` y nada cambia.
- Renombrar y cambiar los pesos de categorías con tareas pasa, y los conteos se conservan.

**Textos.**
- Responden `400` sin crear nada: `\n`, `\r`, U+2028, U+2029, U+0085, VT, FF, NUL, U+202E, los aislantes U+2066 a U+2069, solo invisibles, solo espacios, vacío, y cuerpos que no son objeto o no traen texto.
- Temas: 80 puntos de código (16 emojis de familia de 5 puntos) pasan y 81 no. Categorías: 60 emojis pasan y 61 caracteres no.
- Un nombre con SQL se guarda literal.
- Los nombres de categoría se guardan recortados, e intercambiar dos nombres en un mismo guardado pasa.

**Borrar un tema y los anuncios.**
- Borrar un tema pasa a "Sin tema" sus materiales y sus tareas sembradas; los demás temas no cambian, y el alumno ve `{ temas, sinTema }` con los conteos correctos, sin contar anuncios.
- Mover un anuncio a un tema o a `null` da `409 ANUNCIO_SIN_TEMA`.
- Un anuncio publicado con un `temaId` de otra clase, con basura o con un número se publica sin tema.

**Autorización y fugas.**
- Estudiante inscrito: `403 ROL_NO_PERMITIDO` en las cinco escrituras de temas y mover y en `GET`, `HEAD` y `PUT …/categorias`.
- Restringido: `403 ACCESO_RESTRINGIDO`. Maestro de otra clase: `403 SIN_ACCESO_A_LA_CLASE`.
- `HEAD …/temas`: `200` sin cuerpo para el alumno; `403` para el restringido y para el maestro de otra clase.
- Maestro retirado de `maestros_de_clase`: `403 SIN_ACCESO_A_LA_CLASE`.
- El admin en una clase inexistente recibe exactamente la misma respuesta (estado y cuerpo) que un maestro en una clase ajena.
- Ninguna respuesta de éxito (alumno, maestro, admin) lleva `estadoPago`, `accesoRestringido`, `email`, `correo`, `"rol"` ni `@`.

**Arquitectura (estática).**
- `FOR KEY SHARE` aparece solo en `adapters/db/referencias.ts`.
- `bloquearClase` se define solo en `bloqueo-clase.ts`.
- `handlers/tareas/` tiene exactamente `temas.ts` y `categorias.ts`, sin SQL, sin el cliente de Prisma, sin comparaciones de rol, sin `notifier` y sin `encolar`.
- Ninguna consulta de `temas.ts`, `categorias.ts` ni `referencias.ts` vive dentro de un ciclo.
- Revisé a mano los `$queryRaw` y `$executeRaw` nuevos: todos son etiquetados, con `::uuid[]`, `::int[]` o `::text[]`.

### Observaciones (no son hallazgos; las decide el manager)
- **O-01:** la normalización iguala "ñ" y "n" ("Año 1" y "Ano 1" son `TEMA_REPETIDO`), porque NFD separa la tilde y se quita como marca. Es el criterio de `nombre_busqueda` de ESSENTIALS; no lo marco como defecto.
- **O-02:** la base no garantiza que `publicaciones.tema_id` ni `tareas.categoria_id` sean de la misma clase (no hay FK compuesta). Solo lo cuida la aplicación (§D-0.1, filtro por la clase de la ruta). Lo ataqué por la API sin encontrar fuga; lo anoto para 01b.
- **O-03:** si existiera una publicación de tipo `tarea` (hoy solo la siembra `ayudas-tareas`), `GET …/publicaciones` daría `500`, porque `publicacionSchema.tipo` no la conoce. Por la API de 01a no se llega; C-5 de 01b lo cubre.

### No atacado y por qué
- **Frontend:** no cambia en 01a.
- **Paginación:** las listas de temas y categorías no se paginan (S-14), y la lista de clases del admin no es de 01a.
- **Más de 10 operaciones simultáneas sobre una clase:** no lo corrí, para no fabricar `P2028` por el pool de conexiones dentro de la suite. El programador declara 40 sin errores; no lo verifiqué.

### Corrida completa y PA-07
- **Comando:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/back-01a-r1.json > <scratchpad>/back-01a-r1.txt 2>&1`, de 16:11:59Z a 16:13:37Z, código 1.
- **Resultado:** `Test Files  3 failed | 153 passed (156)` · `Tests  8 failed | 1905 passed (1913)` · `Duration  93.05s (transform 12.16s, setup 4.50s, import 163.64s, tests 719.06s, environment 51ms)`.
- **Rojos:** 7 de mis `*.ataque` nuevas (los casos de T-01 a T-04) y 1 de una prueba normal:
  - `backend/test/gestion-clases.integracion.test.ts` › "GET /api/admin/clases" › "PR-2A12: ordena por creado_en DESC, id DESC, pagina sin repetidos ni huecos, trae maestros (1 o 2) y alumnos activos, y total".
  - Duró 961 ms; el archivo, 9072 ms (de 16:12:39Z a 16:12:48Z).
  - Recibió `500 ERROR_INTERNO` en una página de `GET /api/admin/clases?limite=2&cursor=…`.
  - El programador y el manager la corrieron en verde. **No repetí la corrida para limpiarla (PA-12).**

Conteo por término (`grep -o -F` sobre la salida completa):

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | **11** (I-1 = 10) |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` | 0 |

**Control positivo:** completo.
- Los tres `P2028` de `servicio-ocupado.integracion`, cada uno con su ruta:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`.
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`.
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- Los dos de `cuentas-r3`: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- Ningún `P2028` sale de una ruta de TAREAS-01.

**PA-07 (b) ACTIVADA.** Aparecen los 10 de I-1 y **uno fuera de I-1**:
- `GET /api/admin/clases?limite=2&cursor=<id>` › `ZodError` `too_small` en `clases[1].maestros` ("expected array to have >=1 items"), al armar la respuesta de la lista de clases del admin. Nivel 50, a las 16:12:42.475Z, proceso 5800.
- Es el `500` de PR-2A12: una clase de la página salió sin maestros.
- Mis dos `*.ataque` terminaron antes del error (16:12:17Z `categorias-01a-r1` y 16:12:20Z `temas-01a-r1`): ni sus casos ni su limpieza estaban corriendo.
- **Hipótesis, sin verificar:** la lista del admin es global y lee las clases y sus maestros en consultas separadas. Si otro archivo borra sus clases de prueba entre las dos lecturas (`borrarMovimientosYClasesDePrueba` en su `afterAll`; la cascada borra `maestros_de_clase`), la página trae una clase con cero maestros. En producción ninguna ruta borra clases y `core/` no deja una clase sin maestro, así que sería una interferencia entre archivos de la suite, no de 01a. No lo atribuyo a ningún archivo concreto.

**Me detuve aquí**, como piden PA-07 y PA-12: no repetí la corrida ni seguí atacando. Lo decide el orquestador o el manager. Si no se acepta como intermitente ajeno a 01a, el veredicto de esta ronda queda condicionado a una corrida limpia.

### Lint del backend
`cd backend; npm run lint > <scratchpad>/lint-01a-r1.txt 2>&1`, código 0. ESLint sin errores, Prettier "All matched files use Prettier code style!" y `tsc` de `src/` y de las pruebas sin errores. Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.

### Conteos
- `*.ataque` nuevas: **2**, con **41 casos** (`npx vitest list` de las dos: 26 en `temas-01a-r1` y 15 en `categorias-01a-r1`); **7** de ellos en rojo (los hallazgos).
- `*.ataque` en total: **143** (69 del backend y 74 del frontend). Ninguna existente cambió.
- **Nota:** la herramienta de escritura convirtió los escapes `\uXXXX` en caracteres literales. Un script los devolvió a escapes en las dos `*.ataque` nuevas (el código fuente lleva `​` y similares). Después pasé `prettier --check`, `eslint` y `tsc`.

### Tabla de SHA-256 de las 143 `*.ataque` al cierre de la ronda 1 de 01a (base de V-01 de la corrección; 2 nuevas, ninguna existente cambia)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` | nueva: ronda 1 de 01a |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `2C8CB4D784AA042ABD9F46AFF965FA9CE64D7BEBF7F3856EF5B04F3D366445C8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `8CF9FAB8BDC0C8816C00271F7BF0699316ACB92C1EB4A8DFE59677DF5330D99C` | `backend/test/temas-01a-r1.ataque.test.ts` | nueva: ronda 1 de 01a |
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
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `09E0FDB71E8862F37D681D2A9CB74434227FFEA81E71EF34B87C4AC8BDAB4E47` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `90AF141297CD9309D7E6316833B2BD222347BD25292AF890A55F98126093522C` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `5A856883D032B3ECB2F766BAD450C28D79FD761788C01C1DED16B0EB6F95371D` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01a — Ronda 2
Veredicto: **ROTO**, por un hallazgo de severidad baja (T-05). Fuera de ese hallazgo, el remedio de T-01 a T-04 resiste. PA-07 queda limpia.
Verificación propia: lint código 0 · test `Test Files  1 failed | 156 passed (157)` · `Tests  2 failed | 1929 passed (1931)`. Los dos rojos son los casos de T-05.

### Precondiciones
- **PA-01:** red activa `uacam5 2` (Pública), declarada de confianza por el humano para hoy. La regla "Campus: bloquear entrada a Docker en redes publicas" sigue habilitada (Inbound, Block, Public). Docker 28.5.1, encendido.
- **V-01:** las 143 `*.ataque` de la tabla de la ronda 1 siguen idénticas; el `diff` solo muestra la nueva de esta ronda. No modifiqué ninguna `*.ataque` existente ni ninguna prueba del programador.

### Regresión
- `npx vitest run test/temas-01a-r1.ataque.test.ts test/categorias-01a-r1.ataque.test.ts test/sesiones-y-cadena.ataque.test.ts test/alumnos-b-r1.ataque.test.ts test/alumnos-b-r2.ataque.test.ts test/alumnos-b-r3.ataque.test.ts`: `Test Files  6 passed (6)` · `Tests  106 passed (106)`.
- En la corrida completa también pasan, sin rojos:
  - `temas-01a-r1` (26 casos) y `categorias-01a-r1` (15), con los 7 rojos de la ronda 1 ya en verde.
  - `sesiones-y-cadena` (35).
  - `alumnos-b-r1`, `r2` y `r3`: protegen la búsqueda de alumnos con `nombre_busqueda` y `normalizarTerminoDeBusqueda`.

### Hallazgos

#### T-05: claveDeNombre no quita U+2800 ni U+1D159, que shared/ ya define como «se ve vacío»
Severidad: baja

Prueba: `backend/test/nombres-ids-01a-r2.ataque.test.ts`, describe "ataque TAREAS-01a r2: lo que la regla de shared/ llama «se ve vacío» y claveDeNombre no quita":
- "crear y renombrar un tema con U+2800 (blanco braille) o U+1D159 en lugar del espacio o al final de «Unidad 1»: 409 TEMA_REPETIDO".
- "guardar dos categorías «Unidad 1» y su variante con U+2800 o U+1D159: 400 «No repitas el nombre de una categoría»".

Esperado: con "Unidad 1" en la clase, estas tres variantes son el mismo nombre:
- "Unidad 1" seguido de U+2800 (blanco braille).
- "Unidad" + U+2800 + "1" (el blanco braille en lugar del espacio).
- "Unidad 1" seguido de U+1D159.

Se ven idénticas a "Unidad 1", o con el espacio cambiado por otro blanco. Deberían dar `409 TEMA_REPETIDO` al crear y al renombrar, y `400` en el guardado de categorías.

Obtenido: `201` al crear y `200` al renombrar con las tres variantes; `200` en categorías con las tres. Quedan nombres duplicados que se ven iguales.

Causa (lectura del código):
- `claveDeNombre` (`shared/src/tareas.ts`) quita solo `\p{Default_Ignorable_Code_Point}`.
- El mismo `shared/` define en `clases.ts` lo que "se ve vacío" como `CARACTER_QUE_SE_VE_VACIO = Default_Ignorable + U+2800 + U+1D159`. Con esa definición, `contarCaracteresVisibles` no cuenta esos caracteres.
- U+2800 tampoco es `\s` para `normalizarTerminoDeBusqueda`, así que ni se colapsa como espacio ni se recorta en los extremos.

Requisito o regla: S-05 ("los nombres no se repiten") y el arbitraje de T-02 en la ronda 1 ("dos nombres que se ven idénticos son el mismo nombre"). Es un hermano de T-02 que el remedio no alcanzó: usó una lista de "invisibles" más corta que la que `shared/` ya tiene.

Hermanos (los cuatro sitios que comparan nombres): fallan todos, porque los cuatro usan `claveDeNombre`.
- `validarNuevoTema` y `validarRenombre`: el primer caso.
- El refine de `reemplazarCategoriasSchema` y `planearReemplazoDeCategorias`: el segundo caso; el refine es el que responde primero.
- Lo que sí resiste en los mismos cuatro sitios: la combinación de invisible, ancho completo, NFD, mayúsculas y espacios internos (casos de abajo); también, en el sondeo, U+3164 y U+115F al final (son `Default_Ignorable`), letras matemáticas en negrita, letras encerradas, superíndices y números romanos.

### Atacado sin hallazgos
- **`claveDeNombre` en combinación, en los cuatro sitios.** El nombre combinado es "Unidad 1" con la U de ancho completo, ZWSP, mayúsculas, una D con acento combinante, dos espacios y el 1 de ancho completo. Su clave es la de "Unidad 1".
  - Crear el tema: `409 TEMA_REPETIDO`. Renombrar otro tema: `409 TEMA_REPETIDO`.
  - Guardar categorías con los dos nombres en el mismo cuerpo, y frente a una categoría existente: `400 VALIDACION`. Nada cambia.
- **Renombrar a su propio nombre agregando solo un invisible**, con el id en mayúsculas: `200`. El tema no se cuenta a sí mismo, y el nombre se guarda tal como llegó, con el ZWSP.
- **Solo cambia la comparación.**
  - Un tema con ancho completo, acento, emoji con selector de variante y familia con ZWJ sale idéntico en la respuesta, en `GET …/temas` del alumno y en la base. Lo mismo una categoría con ancho completo y ZWJ.
  - `normalizarTerminoDeBusqueda` no cambió: conserva el ancho completo y el ZWSP.
- **Ids.**
  - Mayúsculas alternadas en `:temaId` (`PUT` responde `200` con el id en minúsculas; `DELETE`, `204`), en `:publicacionId` y en el `temaId` del cuerpo de mover. Mover responde `{ publicacionId, temaId }` en minúsculas, también con `temaId: null`.
  - UUID no canónicos dan `400 VALIDACION` en `:temaId` (`PUT` y `DELETE`), en `:publicacionId` y en el cuerpo de mover: llaves, `urn:uuid:`, sin guiones, salto o espacio final codificado, y mayúsculas con sufijo.
  - El UUID nulo y el máximo en minúsculas dan `404`, nunca `500`.
- **Ráfaga de 15 operaciones simultáneas sobre una clase** (lo que la ronda 1 dejó en "No atacado"): 5 creaciones de tema, 2 renombres, 1 borrado, 1 reordenamiento, 2 movimientos, 3 guardados de categorías (uno inválido) y 1 `GET`.
  - Ninguna respuesta 5xx; las 5 creaciones dan `201`, el orden da `200` o `409` y el guardado inválido da `400`.
  - Al final hay 10 temas con 10 órdenes distintos y categorías que suman 100.
  - Pasó aislada dos veces más (`-t "ráfaga"`) y en la corrida completa, sin `P2028`.
- **Las seis rutas de temas y mover:**
  - `GET …/temas` responde íntegro al alumno.
  - `POST …/temas` y `PUT …/temas/:temaId` usan la clave nueva (casos de arriba).
  - `PUT` y `DELETE …/temas/:temaId` aceptan mayúsculas mezcladas y rechazan las formas no canónicas.
  - `PUT …/temas/orden` resiste en la ráfaga y en los casos de la ronda 1.
  - `PUT …/publicaciones/:publicacionId/tema` resiste con las dos fuentes de id.

### Observaciones (no son hallazgos; las decide el manager)
- **O-04:** el UUID máximo en mayúsculas (`FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF`) da `400 VALIDACION`, mientras que en minúsculas da `404`. La expresión de `z.uuid` acepta el literal `ffff…` solo en minúsculas. Pasa en todas las rutas con ids, incluidas las anteriores a 01a (por ejemplo, `:claseId`), y es un id que nunca existe. No lo marco como defecto de 01a.
- **O-05:** U+3164 (relleno Hangul, de la lista `Default_Ignorable`) en lugar del espacio se quita en vez de contar como espacio. Así, "Unidad" + U+3164 + "1" tiene la clave de "Unidad1", no la de "Unidad 1", y cómo se dibuja depende de la fuente. Lo dejo para el remedio de T-05, que también decide si U+2800 se quita o cuenta como espacio.
- **O-06:** los dos signos de sonido de katakana de medio ancho, U+FF9E y U+FF9F (`\p{Lm}`, cuentan como visibles), quedan con clave vacía después de NFKC y de quitar marcas. Como nombres de un solo carácter chocan entre sí aunque se ven distintos. Es un caso extremo.
- **O-07:** la comparación de mayúsculas usa `toLowerCase`, no plegado de mayúsculas Unicode: "Straße" y "STRASSE" son distintos. Tampoco se cubren los homoglifos de otros alfabetos (una "а" cirílica). Ninguna de las dos cosas la pide S-05.

### No atacado y por qué
- **Frontend:** no cambia en 01a.
- **Más de 15 operaciones simultáneas:** no las corrí, para no fabricar un `P2028` del pool (10 conexiones por proceso) dentro de la suite. Con 15 no hubo ninguno.

### Corrida completa y PA-07
- **Comando:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/back-01a-r2.json > <scratchpad>/back-01a-r2.txt 2>&1`, de 16:53:56Z a 16:56:21Z, código 1.
- **Resultado:** `Test Files  1 failed | 156 passed (157)` · `Tests  2 failed | 1929 passed (1931)` · `Duration  135.16s (transform 18.45s, setup 6.76s, import 259.90s, tests 971.87s, environment 121ms)`.
- **Rojos:** solo los dos casos de T-05 (876 ms y 511 ms). Ningún rojo en pruebas normales ni en otras `*.ataque`.

Conteo por término (`grep -o -F` sobre la salida completa):

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` | 0 |
| (aparte) `too_small` | 0 |

- **I-1:** los 10 de siempre. Son 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "…al crear la sesión"; los `ZodError` de URL del almacén en `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`; y `GET /api/prueba/error-comun` con "boom".
- **Control positivo:** completo. Los tres `P2028` de `servicio-ocupado.integracion` están, cada uno con su ruta:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`.
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`.
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`** también están: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`. Ningún `P2028` sale de una ruta de TAREAS-01.
- **Excepciones arbitradas:**
  - (a) El `ZodError too_small` de `GET /api/admin/clases` (PR-2A12) **no apareció**.
  - (b) El rojo de `admin-muro-02b-r1` › "el admin no comenta" **no apareció**.
- **PA-07: limpia.**

### Lint del backend
- **Comando:** `cd backend; npm run lint > <scratchpad>/lint-01a-r2.txt 2>&1`, código 0.
- ESLint no da errores; Prettier dice "All matched files use Prettier code style!"; `tsc` de `src/` y de las pruebas no da errores.
- **Última línea:** `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.

### Conteos
- **`*.ataque` nuevas:** 1, `backend/test/nombres-ids-01a-r2.ataque.test.ts`, con **13 casos** según el JSON de la corrida; 2 de ellos en rojo (T-05).
- **`*.ataque` en total:** **144**, 70 del backend y 74 del frontend. Ninguna existente cambió.
- **Escapes:** como en la ronda 1, los escapes `\uXXXX` se devolvieron con un script después de escribir el archivo; luego pasé `prettier --check`, `eslint` y `tsc`.

### Tabla de SHA-256 de las 144 `*.ataque` al cierre de la ronda 2 de 01a (base de V-01 de la corrección; 1 nueva, ninguna existente cambia)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` | nueva: ronda 2 de 01a |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `2C8CB4D784AA042ABD9F46AFF965FA9CE64D7BEBF7F3856EF5B04F3D366445C8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `8CF9FAB8BDC0C8816C00271F7BF0699316ACB92C1EB4A8DFE59677DF5330D99C` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
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
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `09E0FDB71E8862F37D681D2A9CB74434227FFEA81E71EF34B87C4AC8BDAB4E47` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `90AF141297CD9309D7E6316833B2BD222347BD25292AF890A55F98126093522C` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `5A856883D032B3ECB2F766BAD450C28D79FD761788C01C1DED16B0EB6F95371D` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01a — Ronda 3
Veredicto: **RESISTE**. No hay hallazgos nuevos. Los 5 hallazgos de las rondas 1 y 2 (T-01 a T-05) siguen corregidos, y PA-07 queda limpia.
Verificación propia: lint código 0 · test `Test Files  158 passed (158)` · `Tests  1949 passed (1949)`, código 0.

### Precondiciones
- **PA-01:** la red activa es `uacam5 2` (Pública), declarada de confianza por el humano para hoy. La regla "Campus: bloquear entrada a Docker en redes publicas" sigue habilitada (Inbound, Block, Public). Docker 28.5.1 está encendido.
- **V-01:** las 144 `*.ataque` de la tabla de la ronda 2 siguen idénticas (`diff` vacío antes de escribir la nueva). No modifiqué ninguna `*.ataque` existente ni ninguna prueba del programador.
- **Arbitraje de la ronda 2:** lo respeté. No repetí casos sobre el relleno Hangul, U+FF9E/U+FF9F, homoglifos, plegado de mayúsculas Unicode ni el UUID máximo en mayúsculas (O-04 a O-07 tienen destino en ESTADO §3).

### Regresión
- **Corrida aislada:** `npx vitest run test/temas-01a-r1.ataque.test.ts test/categorias-01a-r1.ataque.test.ts test/nombres-ids-01a-r2.ataque.test.ts test/sesiones-y-cadena.ataque.test.ts` da `Test Files  4 passed (4)` · `Tests  89 passed (89)`. Son mis 54 casos (26 + 15 + 13) más los 35 de `sesiones-y-cadena`, con el caso de la ronda 0.
- **Corrida completa:** también pasan los mismos archivos, más `admin-muro-02b-r1` (10) y `gestion-clases.integracion` (21).

### Hallazgos
Ninguno.

### Atacado sin hallazgos
Todo está en `backend/test/temas-01a-r3.ataque.test.ts`: 11 casos, verdes aislados en dos corridas y en la completa.

**T-05 en sus bordes, dentro de lo arbitrado** (U+2800 y U+1D159 cuentan como espacio; los `Default_Ignorable` se quitan). Probé siete variantes de "Unidad 1":
- U+2800 al inicio.
- U+1D159 al inicio.
- U+2800 repetido en lugar del espacio.
- U+2800 junto a un espacio real.
- Dos espacios reales y U+1D159 repetido al final.
- U+2800 entre invisibles (ZWSP, FEFF, U+2060) al inicio y al final.
- NFD, ancho completo, ZWSP y U+2800 juntos.

Resultados:
- **Clave:** la de las siete es la de "Unidad 1"; colapsa y recorta.
- **Crear y renombrar otro tema:** `409 TEMA_REPETIDO` con cada una, y los nombres no cambian.
- **Renombrar "Unidad 1" a cada variante (a sí mismo):** `200`. El nombre se guarda en la base y lo devuelve `GET …/temas` (vista del alumno) tal como llegó, con sus blancos U+2800 y U+1D159; solo se recortan los espacios de los extremos, como en todo texto.
- **Categorías:** "Unidad 1" junto a cada variante en un mismo guardado da `400 VALIDACION`. Renombrar una categoría a su propia variante pasa.
- **Nombre que tras la clave queda vacío** (solo U+2800, U+1D159, espacios e invisibles): `400 VALIDACION` en temas y en categorías.

**SET NULL en carrera:** borré un tema que tenía dos materiales mientras se publicaban cinco materiales con ese tema, todo a la vez.
- El borrado dio `204`. Cada publicación dio `201` o `404 TEMA_NO_ENCONTRADO`, nunca `500`.
- Toda publicación creada y los dos materiales previos quedaron sin tema, y el tema ya no existe.
- El alumno ve `{ temas: [], sinTema: <previos + creadas> }`.

**Conteos de `GET …/temas` tras mover:**
- Siguen cada movimiento: material a otro tema, tarea a "Sin tema". `sinTema` sube y los anuncios no cuentan.
- Una query extra con valores hostiles (`?limite=-1&cursor=x'%3B--&orden=nombre`) responde `200` con la misma lista y en el mismo orden.

**Idempotencia del orden:** `PUT …/temas/orden` repetido con el mismo cuerpo da `200` las dos veces, con la misma respuesta y el mismo orden en la base. Tres envíos simultáneos dan `200` los tres.

**Doble envío:**
- Dos guardados idénticos de categorías sin ids a la vez dan `200` los dos y dejan un solo juego, sin duplicados.
- Dos movimientos simultáneos del mismo material a temas distintos dan `200` los dos, y el material queda en uno de los dos.

**Revisión estática final** (código de producción, sin comentarios ni el cliente generado):
- `$queryRawUnsafe` y `$executeRawUnsafe` solo aparecen en `adapters/db/cliente.ts`.
- `@prisma/client`, `@prisma/adapter-pg`, `pg` y el cliente generado solo se importan en `adapters/`.
- Los 8 archivos nuevos de 01a (`core/tareas/*`, `handlers/tareas/*` y `adapters/db/{temas,categorias,referencias,bloqueo-clase}.ts`) no tienen `console.` ni `estadoPago`.
- Fuera de `core/`, ninguno compara roles ni la relación a mano.
- `shared/src/tareas.ts` no tiene `console.`.
- Con las rondas 1 y 2, eso completa la revisión estática de 01a: `FOR KEY SHARE` solo en `referencias.ts`; `bloquearClase` solo en `bloqueo-clase.ts`; ninguna consulta en ciclos en esos archivos; los handlers de tareas sin SQL, sin Prisma, sin `notifier` y sin `encolar`.

### No atacado y por qué
- **Frontend:** no cambia en 01a.
- **Más de 15 operaciones simultáneas sobre una clase:** las mismas razones de la ronda 2 (no fabricar un `P2028` del pool dentro de la suite). Con 15 no hubo ninguno.
- **El `CHECK` `publicaciones_anuncio_sin_tema` desde la API:** no se alcanza. Ninguna ruta puede escribir un anuncio con tema: publicar descarta la clave y mover responde `409` antes de escribir, lo que probé en la ronda 1. El `CHECK` en la base lo prueba PR-1A08 por SQL.

### Corrida completa y PA-07
- **Comando:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/back-01a-r3.json > <scratchpad>/back-01a-r3.txt 2>&1`, de 17:27:49Z a 17:29:30Z, código 0.
- **Resultado:** `Test Files  158 passed (158)` · `Tests  1949 passed (1949)` · `Duration  96.63s (transform 12.76s, setup 4.83s, import 168.35s, tests 747.55s, environment 37ms)`.
- **Última línea:** `JSON report written to …/back-01a-r3.json`.
- **Rojos:** ninguno.

Conteo por término (`grep -o -F` sobre la salida completa):

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` | 0 |
| (aparte) `too_small` | 0 |

- **I-1:** los 10 de siempre.
  - 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "…al crear la sesión".
  - Los tres `ZodError` de URL del almacén: `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`.
  - `GET /api/prueba/error-comun` con "boom".
- **Control positivo:** completo.
  - Los tres `P2028` de `servicio-ocupado.integracion`: `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`; `POST /api/auth/refrescar` › `tx.sesion.updateMany()`; `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
  - Los dos de `cuentas-r3`: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
  - Ningún `P2028` sale de una ruta de TAREAS-01.
- **Excepciones arbitradas:**
  - (a) El `ZodError too_small` de `GET /api/admin/clases` **no apareció**; `gestion-clases.integracion` pasó con sus 21 casos.
  - (b) El rojo de `admin-muro-02b-r1` › "el admin no comenta" **no apareció**; ese archivo pasó con sus 10 casos.
- **PA-07: limpia.**

### Lint del backend
- **Comando:** `cd backend; npm run lint > <scratchpad>/lint-01a-r3.txt 2>&1`, código 0.
- ESLint no da errores, Prettier dice "All matched files use Prettier code style!" y `tsc` de `src/` y de las pruebas no da errores.
- **Última línea con texto:** `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.

### Conteos
- **`*.ataque` nuevas:** 1, `backend/test/temas-01a-r3.ataque.test.ts`, con **11 casos** (todos en verde).
- **`*.ataque` de 01a del tester:** 4 nuevas en las rondas 1 a 3 (`temas-01a-r1`, `categorias-01a-r1`, `nombres-ids-01a-r2` y `temas-01a-r3`), con 65 casos, más el caso reescrito en la ronda 0 (`sesiones-y-cadena`).
- **`*.ataque` en total:** **145** (71 del backend y 74 del frontend). Ninguna existente cambió en esta ronda.
- **Escapes:** como en las rondas anteriores, los escapes `\uXXXX` del archivo nuevo se devolvieron con un script; después pasé `prettier --check`, `eslint` y `tsc`.

### Tabla de SHA-256 de las 145 `*.ataque` al cierre de la ronda 3 de 01a (base de V-01 del cierre de 01a y de la ronda 0 de 01b; 1 nueva, ninguna existente cambia)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `2C8CB4D784AA042ABD9F46AFF965FA9CE64D7BEBF7F3856EF5B04F3D366445C8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `8CF9FAB8BDC0C8816C00271F7BF0699316ACB92C1EB4A8DFE59677DF5330D99C` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `4C1DEC75435E36C77776253B895C17BFBD5545D0EAF7F686D7E36BDB24FF0AB0` | `backend/test/temas-01a-r3.ataque.test.ts` | nueva: ronda 3 de 01a |
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
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `09E0FDB71E8862F37D681D2A9CB74434227FFEA81E71EF34B87C4AC8BDAB4E47` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `90AF141297CD9309D7E6316833B2BD222347BD25292AF890A55F98126093522C` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `5A856883D032B3ECB2F766BAD450C28D79FD761788C01C1DED16B0EB6F95371D` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01b — Ronda 0
Estado: **lista para la implementación de 01b**. Reescribí 19 `*.ataque`: 16 del frontend por C-5, y del backend 2 por C-7 y 1 caso fuera del inventario (el C-n más cercano es C-7). Quedan 3 rojos esperados en el backend y 1 error de `tsc` esperado en el frontend. PA-07 queda limpia. Hay una decisión pendiente (D-1) sobre la instantánea única.

### Precondiciones
- **Rama:** `feat/tareas`. `HEAD` = `07e4ab7` (`<M1>`, "Merge branch 'main' into feat/tareas (FIX-CLASES, PR #19)"), con padres `9237ecd` (`<K1a>`) y `1057ad5` (PR #19).
- **Árbol:** `git status --porcelain -- shared backend frontend` salió vacío al arrancar. Fuera de los paquetes solo estaban sin preparar `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/ESTADO.md` y `aprobacion.md`; los tres están permitidos.
- **PA-02, archivos protegidos (`sha256sum`), los tres coinciden con `aprobacion.md`:**
  - `docs/ARCHITECTURE-ESSENTIALS.md` = `0020981696ede6adbfaeb02ebfc157a369b16d9a5c90e21c3ea814782f7c2aef`
  - `docs/ARCHITECTURE.md` = `88a01a2e854ac2709397e2a110d22c20bfa5bc4b8a40b77b0d0711b48a9e26da`
  - `docs/PRD.md` = `8f7cf71a2c536924e4a7452ea1eef3dbec04718acb3f20f9b42c485109bde5f5`
- **PA-01:** red activa `IZZI-F281-5G` (Pública, de confianza permanente). La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public). Docker 28.5.1 encendido.
- **V-01 unificada: 147 de 147.** La base es la tabla de 145 de la ronda 3 de 01a, sin `admin-muro-02b-r1`, más estos tres hashes de la tabla de la ronda 2 de FIX-CLASES (`docs/trabajo/FIX-CLASES-lista-de-clases-del-admin/reporte-tester.md`):
  - `admin-muro-02b-r1` = `294BE1AF…13D0`, cambiado por C-1 de FIX-CLASES.
  - `lecturas-fx-r1` = `CDCF742A…C638`.
  - `lecturas-fx-r2` = `E025FA82…A65D`.
  - El `diff` contra las 147 `*.ataque` del repositorio salió vacío. Las 74 del frontend no cambian respecto de la ronda 3 de 01a.
- **Carga del equipo antes de la corrida del backend:** CPU al 31 %, RAM libre 15 963 de 32 436 MB, 3 procesos `node`, y los contenedores `campus-dev` (postgres, minio, livekit) arriba y sanos desde hace 10 horas.
- **`shared/dist` desactualizado tras el merge.** No exportaba `MAXIMO_TEMAS_POR_CLASE`, y `seed:admin` fallaba en el `global-setup` con `SyntaxError: The requested module '@campus/shared' does not provide an export named 'MAXIMO_TEMAS_POR_CLASE'`. Lo reconstruí con `cd shared; npm run build` (código 0, `> tsc -p tsconfig.json`). `dist/` está en `.gitignore`, así que no cambia nada versionado. Quien corra el backend en `<M1>` sin reconstruir `shared` verá el mismo error.

### Búsqueda de casos contradichos
Busqué en las `*.ataque` del backend y del frontend:
- dobles de publicación con forma completa (`adjuntos:`, `comentarios:`, `puedeBorrar`) y tipos de la API sobre esos dobles;
- expectativas de que el muro solo devuelva `anuncio` o `material`;
- `OPCIONES_DE_COLAS`, `pgboss.queue` y listas de nombres de cola;
- lecturas estáticas de `handlers/` y de `backend/src` (`readFileSync`, `readdirSync`);
- `adjuntosParaResponder` y `archivosParaPublicar`;
- usos de `instantaneaUnica` y de `listarPublicaciones` o `listarComentarios`.

| C-n | Casos encontrados | Qué hice |
|---|---|---|
| C-5 | **Frontend:** 22 dobles de publicación en 16 `*.ataque`. El frontend valida el muro con `listaPublicacionesRespuestaSchema`, así que, cuando `publicacionSchema` exija la clave `tarea`, un doble sin ella deja la vista en error. **Backend:** ninguna `*.ataque` arma dobles de publicación ni compara la forma completa de una respuesta del muro. Las que la validan con `listaPublicacionesRespuestaSchema` (`archivos-d-r1`, `logs-archivos-d-r1`) seguirán pasando, porque el servidor mandará `tarea: null`. Ninguna espera que el muro devuelva solo dos tipos; `muro-c-r1` › "tipo desconocido" manda `tipo: "tarea"` a `POST …/publicaciones` y el `400` sigue, porque `crearPublicacionSchema` no cambia (§D-0.2) | **Reescritos** los 16 del frontend (abajo) |
| C-6 | Ninguna `*.ataque` enumera las colas. `muro-c-r1` › "ningún consumidor…" busca solo los nombres de las colas del muro y `colaDePublicacion`. En 01b, `TAREA_CREADA` y `RECORDATORIO_24H` viven en `core/eventos/avisos-de-clase.ts` y `adapters/queue/colas.ts`, que ya están en su lista, y `handlers/tareas/tareas.ts` no nombra las colas del muro. Las del worker no listan colas | Sin cambios |
| C-7 | `temas-01a-r1` › "revisión estática de 01a": lista cerrada de `handlers/tareas/` y prohibición de `encolar(` en esos handlers. `temas-01a-r3` › "revisión estática final": lista cerrada de los archivos nuevos de `core/tareas/` y `handlers/tareas/`. Ninguna `*.ataque` lee `handlers/clases/muro.ts` ni nombra `adjuntosParaResponder` o `archivosParaPublicar` | **Reescritos** los 2 (abajo) |
| Fuera del inventario (C-7 es el más cercano) | `lecturas-fx-r2` › "O-4: en backend/src solo se borran…": lista cerrada de los modelos con `.delete` o `.deleteMany` en `backend/src`. Nació en FIX-CLASES sobre `main`, sin TAREAS-01a. **Ya está en rojo en `<M1>`**: lo comprobé antes de tocar nada, y faltan `categoria` y `tema`, que llegaron con 01a. 01b agrega `criterioRubrica.deleteMany` (§D-4, S-04) | **Reescrito** (abajo) |

**`lecturas-fx-r1` y `lecturas-fx-r2` frente a 01b**, sin contar "O-4":
- No las contradice el plan tal como está escrito. "Cambios por capa" de 01b no pide `instantaneaUnica` en ninguna lectura nueva, `handlers/tareas/tareas.ts` no llama a `listarPublicaciones` ni a `listarComentarios`, y las dos lecturas del muro siguen en la instantánea aunque cambien.
- Hay una condición pendiente, en **D-1** abajo.

### D-1 (decisión pendiente para el orquestador; no es un hallazgo ni una reescritura)
- **Qué choca.** ESSENTIALS, "Reglas de datos" (texto de FIX-CLASES), pide una sola instantánea (`enTransaccion` con `instantaneaUnica`) en toda lectura de varias sentencias cuya respuesta exija una relación obligatoria o una cardinalidad mínima, o que compruebe la fila del cursor antes de leer la página. El plan de 01b, escrito antes de FIX-CLASES, no lo dice. Las dos lecturas de 01b que encajan en esa regla:
  - `leerTarea`, con autor, categoría, tema, criterios, adjuntos y maestros en varias sentencias;
  - `listarTrabajo`, que comprueba el cursor contra la misma lista antes de la página (§D-6).
- **Qué prueba se contradice si se aplica.** Si el programador aplica la regla de ESSENTIALS (que manda sobre el plan), `lecturas-fx-r1` › "la opción solo se puede activar dentro de adapters/db: … la opción solo se pide en las seis lecturas (cuatro de clases y dos del muro)" queda contradicho: su lista cerrada de usos es `["adapters/db/clases.ts:4", "adapters/db/publicaciones.ts:2"]`. No lo reescribo, porque ningún C-n lo cubre ni el plan lo pide.
- **Qué se decide.** Hace falta decidir, con una enmienda o un C-n nuevo, si las lecturas de 01b usan la opción. Si se decide que sí, el caso se reescribe en una ronda 0 corta, sumando `adapters/db/tareas.ts:<n>` a la lista de usos. Si se decide que no, la diferencia con ESSENTIALS va a ESTADO §3.
- **Lo que ya revisé.** El pendiente de ESTADO §3 sobre las lecturas de temas y categorías de 01a: `listarTemas` y `listarCategorias` no tienen cursor ni una relación obligatoria en la respuesta (las cuentas por `groupBy` admiten 0), así que no encajan en la regla.

### Diff de lo reescrito (19 `*.ataque`; `git diff --stat -- backend frontend`: 74 inserciones y 4 borrados)

**C-5, frontend (16 archivos, 22 dobles).** Delante de la línea `adjuntos:` de cada doble de publicación entra `tarea: null,`, o `tarea: null` en las dos interfaces `PublicacionFalsa` de `muro-c-r1` y `muro-c-r2`. Antes de la primera inserción de cada archivo va una línea de comentario: "TAREAS-01b ronda 0 (C-5, §D-R0): publicacionSchema gana la clave obligatoria tarea, null en anuncios y materiales." Ninguna aserción cambia. Dobles por archivo:
- `frontend/src/app/`: `muro-recuperar-c-r3` (1) y `muro-recuperar-c-r4` (1).
- `frontend/src/features/clases/`:
  - `archivos-d-r1` (2), `archivos-d-r2` (3) y `archivos-d-r3` (2);
  - `cargar-mas-02c-r2` (1);
  - `foco-02c-r3`, `foco-02c-r4` y `foco-02c-r5` (1 cada uno);
  - `heredados-02d-r1` (1) y `muro-02c-r1` (1);
  - `muro-c-r1` (2: la interfaz y el constructor), `muro-c-r2` (2: igual) y `muro-c-r3` (1);
  - `segmentado-02d-r1` (1) y `ventana-02c-r2` (1).
- **Archivos que nombran el muro y no se tocaron**, porque solo simulan listas vacías o no tienen dobles con forma completa: `barra-02d-r1`, `muro-rutas-c-r1`, `rutas-02c-r1`, `clases-admin-02c-r1`, `estatico-02c-r1` y `styles/clases-r1`.

**C-7, backend:**
- `backend/test/temas-01a-r1.ataque.test.ts` › "ataque TAREAS-01a r1: revisión estática de 01a" › el caso de `FOR KEY SHARE` y los handlers. El título queda: "FOR KEY SHARE solo en adapters/db/referencias.ts; bloquearClase se define solo en bloqueo-clase.ts; los handlers de tareas no usan SQL, Prisma, roles ni notifier, y los de temas y categorías tampoco encolan".
  - La lista cerrada de `handlers/tareas/` suma `handlers/tareas/tareas.ts`.
  - `encolar(` sale de la expresión común, y `encolar(` y `cancelar(` quedan prohibidos en `temas.ts` y `categorias.ts`. El handler de tareas encola y cancela por diseño, dentro de los callbacks que pasa al adaptador (§D-0.4, §D-4, §D-5), como el muro.
  - Lo demás que protege sigue igual y vale para los tres handlers: nada de SQL, del cliente de Prisma, de roles ni de `notifier`.
- `backend/test/temas-01a-r3.ataque.test.ts` › "ataque TAREAS-01a r3: revisión estática final" › el caso de los archivos nuevos. El título queda: "ningún archivo nuevo de 01a ni de 01b usa console., menciona estadoPago o compara un rol a mano; shared/src/tareas.ts tampoco usa console.".
  - La lista cerrada suma `core/tareas/recordatorio.ts`, `core/tareas/tareas.ts`, `core/tareas/texto.ts` y `handlers/tareas/tareas.ts`, con los nombres de "Cambios por capa" de 01b.
  - Las prohibiciones no cambian y valen también para ellos.

**Fuera del inventario (C-7 como el más cercano), backend:**
- `backend/test/lecturas-fx-r2.ataque.test.ts` › "ataque FIX-CLASES r2: las lecturas con cursor que quedan fuera (O-4 y conjunto de claves)" › "O-4".
  - El título queda: "O-4: en backend/src solo se borran inscripciones, asignaciones de maestro, publicaciones, comentarios, temas, categorías y criterios de rúbrica; nada borra enlaces_registro ni usuarios".
  - La lista pasa de 4 a 7 entradas: `categoria`, `comentario`, `criterioRubrica`, `inscripcion`, `maestroDeClase`, `publicacion` y `tema`.
  - Lleva un comentario que explica el origen: el merge, §D-2 y §D-3 de 01a, y §D-4 (S-04) de 01b.
  - **Lo que protege no cambia:** nada borra `enlaces_registro` ni `usuarios`, no hay `DELETE FROM` ni `TRUNCATE` crudos, y cualquier otro borrado vuelve a ponerla en rojo.

### Rojos esperados (lista exacta; PA-05 del programador)
| # | Archivo | Caso | C-n | Por qué | Se pone en verde cuando |
|---|---|---|---|---|---|
| 1 | `backend/test/lecturas-fx-r2.ataque.test.ts` | "O-4: en backend/src solo se borran inscripciones, asignaciones de maestro, publicaciones, comentarios, temas, categorías y criterios de rúbrica; nada borra enlaces_registro ni usuarios" | fuera del inventario (C-7) | Falta solo `criterioRubrica` (salida: `- "criterioRubrica"`) | `editarTarea` reemplaza los criterios con `criterioRubrica.deleteMany` (§D-4, S-04) |
| 2 | `backend/test/temas-01a-r1.ataque.test.ts` | "FOR KEY SHARE solo en adapters/db/referencias.ts; bloquearClase se define solo en bloqueo-clase.ts; los handlers de tareas no usan SQL, Prisma, roles ni notifier, y los de temas y categorías tampoco encolan" | C-7 | Falta solo `handlers/tareas/tareas.ts` | Existe `handlers/tareas/tareas.ts` |
| 3 | `backend/test/temas-01a-r3.ataque.test.ts` | "ningún archivo nuevo de 01a ni de 01b usa console., menciona estadoPago o compara un rol a mano; shared/src/tareas.ts tampoco usa console." | C-7 | Faltan solo `core/tareas/recordatorio.ts`, `core/tareas/tareas.ts`, `core/tareas/texto.ts` y `handlers/tareas/tareas.ts` | Existen los cuatro archivos |
| 4 | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` (`tsc -b` de `cd frontend; npm run lint`, no Vitest) | El doble de la línea 486 | C-5 | `error TS2353: Object literal may only specify known properties, and 'tarea' does not exist in type …`. Es el único doble tipado con un tipo de la API (`PaginaDelMuro`), así que la propiedad de más se rechaza hasta que exista la clave (mismo precedente que `puedeBorrar` en la ronda 0 de CLASES-02b) | `publicacionSchema` gana `tarea: resumenDeTareaSchema.nullable()` en `shared/src/clases.ts` (paso 12) |

- **Ningún rojo en Vitest del frontend:** `Test Files  127 passed (127)` · `Tests  1852 passed (1852)`, porque el esquema de hoy descarta la clave de más.
- **Cuando `shared/` exija `tarea`**, las 16 `*.ataque` del frontend ya la traen. Las pruebas normales del frontend con dobles de publicación (`app/marco.test.tsx` y, en `features/clases/`, `formulario-publicacion.test.tsx`, `lib.test.ts`, `muro-view.test.tsx` y `publicacion-del-muro.test.tsx`) las completa el programador, según la lista cerrada de 01b.

### I-1 (PA-07 b), lista cerrada de la corrida final de la ronda 0 de 01b (base de PA-07 para 01b, 01c, 01d y 01e)
Atribuí cada error a la última "incoming request" con el mismo `pid` y `reqId`, por app, más el mensaje y la pila.

| # | Ruta | Llamada | Origen |
|---|---|---|---|
| 1-5 | `POST /api/auth/login` | "fallo simulado de la base en la búsqueda" (`buscarCredencialesPorEmail` del doble) | `backend/test/intentos-r2.ataque.test.ts` |
| 6 | `POST /api/auth/login` | "fallo simulado de la base al crear la sesión" (`crearSesion` del doble) | `intentos-r2.ataque.test.ts` |
| 7 | `POST /api/clases/:claseId/archivos` | `ZodError` (`invalid_format` de `subida.url`) al armar la respuesta | `backend/test/archivos-d-r2.ataque.test.ts` › T-39 |
| 8 | `POST /api/clases/:claseId/archivos/:archivoId/descarga` | `ZodError` (`invalid_format` de `url`) al armar la respuesta | `archivos-d-r2` › T-39 |
| 9 | `GET /api/clases/:claseId/publicaciones` | `ZodError` (`invalid_format` de `vistaPrevia.url`) al armar la respuesta del muro | `archivos-d-r2` › T-39 |
| 10 | `GET /api/prueba/error-comun` | `Error: boom` | `backend/test/salud.integracion.test.ts` |

Es igual al I-1 de 01a: FIX-CLASES no lo cambió.

### I-2 (pruebas normales con listas cerradas que caerán con 01b, fuera de la lista cerrada de 01b; las cambia el programador con A-3)
1. **`backend/test/bloqueo-usuario.integracion.test.ts`** › "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts, publicaciones.ts, referencias.ts, temas.ts y categorias.ts usan SQL etiquetado en adapters/db".
   - **Lista cerrada:** los archivos de `src/adapters/db/` que contienen `$queryRaw` o `$executeRaw`.
   - **Por qué cae:** `adapters/db/tareas.ts` bloquea la tarea con un `SELECT … FOR NO KEY UPDATE OF t` / `FOR UPDATE OF t` etiquetado (§D-4, §D-7; V-04 lo nombra).
   - **Qué hay que cambiar:** se suma `tareas.ts`. `publicaciones.ts` ya está en la lista.

**No encontré otras.** Revisé, y siguen bien:
- `cola.integracion.test.ts` y `core/autoria.test.ts`: ya están en la lista cerrada de 01b.
- `core/eventos/avisos-de-clase.test.ts`: no enumera colas.
- `muro.integracion.test.ts`: no compara la forma completa de una publicación. PR-C16, con `tipo: "tarea"`, sigue en `400`. PR-C07 describe solo las tres colas del muro.
- `lecturas-consistentes.integracion.test.ts`: no tiene una lista cerrada de usos de la opción.
- `higiene-de-pruebas`: `.$transaction(` solo en `cliente.ts`; `addHook` solo en `app.ts` y la guarda.

En el frontend, las cinco normales con dobles están en la lista cerrada de 01b (arriba).

### Corridas (una suite a la vez)
- **Frontend (reescribí 16 `*.ataque`):**
  - **lint:** `cd frontend; npm run lint > <scratchpad>/front-lint-01b-r0.txt 2>&1`, código 2. ESLint pasa y Prettier dice "All matched files use Prettier code style!". `tsc -b` da exactamente un error, el rojo esperado número 4 (`archivos-d-r2.ataque.test.tsx(486,7): error TS2353 …`). La última línea es el error de npm: `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c eslint --config ../eslint.config.mjs . && prettier --check . --ignore-path ../.prettierignore && npm run typecheck`.
  - **test:** `cd frontend; npm test > <scratchpad>/front-test-01b-r0.txt 2>&1`, de 22:55:27Z a 22:56:47Z, código 0: `Test Files  127 passed (127)` · `Tests  1852 passed (1852)` · `Duration  76.72s (transform 17.15s, setup 51.72s, import 147.34s, tests 345.55s, environment 241.64s)`.
- **Backend:**
  - **lint:** `cd backend; npm run lint > <scratchpad>/lint-01b-r0.txt 2>&1`, código 0. ESLint sin errores, Prettier "All matched files use Prettier code style!" y `tsc` de `src/` y de las pruebas sin errores. La última línea con texto es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
  - **test:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/back-01b-r0.json > <scratchpad>/back-01b-r0.txt 2>&1`, de 22:57:22Z a 22:59:03Z, código 1: `Test Files  3 failed | 158 passed (161)` · `Tests  3 failed | 2002 passed (2005)` · `Duration  95.52s (transform 10.67s, setup 4.60s, import 163.83s, tests 751.61s, environment 39ms)`.
    - Los 3 rojos son exactamente los esperados 1, 2 y 3, y cada uno falla solo por lo que 01b todavía no crea (la salida muestra únicamente las entradas que faltan).
    - No hubo tiempos límite ni rojos intermitentes. PA-12 no aplica.

### PA-07
Conté sobre `<scratchpad>/back-01b-r0.txt`, la salida completa, con `grep -o -F` por término:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` | 0 |
| (aparte) `too_small` | 0 |

- **Control positivo:** completo. Los tres `P2028` de `servicio-ocupado.integracion` aparecen, cada uno con su ruta:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`** también aparecen: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **`GET /api/admin/clases`** (ya corregido por FIX-CLASES) no dio ningún error.
- **Excepción arbitrada:** `nombres-tokens-r2` pasó en 3.8 s, así que no se usó.
- **PA-07: limpia.**

### Conteos
- **Backend:** 161 archivos y 2005 casos. Son 158 + 3 frente a los 158 archivos de la ronda 3 de 01a, que con FIX-CLASES suman `lecturas-consistentes.integracion`, `lecturas-fx-r1` y `lecturas-fx-r2`. Los números salen del JSON de la corrida.
- **`*.ataque`:** 147 en total (73 del backend y 74 del frontend). Ninguna es nueva y 19 cambian: 3 del backend y 16 del frontend.

### Tabla unificada de SHA-256 de las 147 `*.ataque` al cierre de la ronda 0 de 01b (base de V-01 del programador de 01b; 19 cambiadas, marcadas)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas. La columna "Cambio" marca lo que difiere de la base unificada de las precondiciones.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `CDCF742A5C2CADFEF43D8FBEA9D993D19594D7EFC203F5972489DBB76A8BC638` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` | reescrita: fuera del inventario, C-7 el más cercano (ronda 0 de 01b) |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `2C8CB4D784AA042ABD9F46AFF965FA9CE64D7BEBF7F3856EF5B04F3D366445C8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` | reescrita: C-7 (ronda 0 de 01b) |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` | reescrita: C-7 (ronda 0 de 01b) |
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
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

### Complementaria: C-2 (01b) y C-8b
**Origen.** Mi ronda 0 de 01b dejó fuera C-2 para 01b: la lista cerrada de rutas de `sesiones-y-cadena.ataque`. El programador se detuvo por PA-05 en el paso 17 (`resumen-programador.md`, "TAREAS-01b — Parada PA-05"). El orquestador adelantó C-8b de la Enmienda 2 a esta misma ronda (registrado en `aprobacion.md`).

**Lo que no toqué.** Ningún archivo de producción ni ninguna prueba del programador.

**Precondiciones:**
- PA-01: red `IZZI-F281-5G`; la regla del firewall sigue habilitada (Inbound, Block, Public).
- R-17: `shared/dist` existe, reconstruido por el programador en el paso 12.

**Rutas contra el plan.** `handlers/tareas/tareas.ts` registra exactamente `app.post("/clases/:claseId/tareas")`, `app.get`, `app.put` y `app.delete("/clases/:claseId/tareas/:tareaId")` y `app.get("/clases/:claseId/trabajo")`. Son las cinco rutas de "Cambios por capa" de 01b; con los dos `HEAD`, son las 7 entradas de V-06. Ninguna sobra ni falta, así que no hay hallazgo.

#### Diff 1: C-2 (01b)
**Archivo:** `backend/test/sesiones-y-cadena.ataque.test.ts` › "ataque: superficie de rutas" › el caso de la lista cerrada de `printRoutes`.
- **Comentario nuevo:** "TAREAS-01b ronda 0 complementaria (C-2, §D-R0; §D-4, §D-6 y V-06 …)". Dice que entran 5 rutas más 2 `HEAD`, que ninguna crea cuentas ni cambia roles, que ninguna es pública (`RUTAS_PUBLICAS` sigue con 10) y cómo las anida `printRoutes`.
- **Título:** suma "TAREAS-01a y TAREAS-01b".
- **Lista:** pasa de 72 a **79** entradas, ordenada como `.sort()` y sin repetidos (lo comprobé con un script). Entran exactamente:
  - `DELETE /api/clases/:claseId/tareas/:tareaId`;
  - `GET /api/clases/:claseId/tareas/:tareaId` y `GET /api/clases/:claseId/trabajo`;
  - `HEAD /api/clases/:claseId/tareas/:tareaId` y `HEAD /api/clases/:claseId/trabajo`;
  - `POST /api/clases/:claseId/tareas`;
  - `PUT /api/clases/:claseId/tareas/:tareaId`.
- **Lo que protege no cambia:** una línea del árbol que no se reconoce, o una ruta de más o de menos, hace fallar la prueba; ninguna ruta crea administradores; solo las tres de hoy crean maestros. El análisis por sangría no cambió.
- **Cómo lo apliqué:** partí de la versión de `HEAD` del archivo. En un primer intento, el script de escapes había tocado los caracteres de dibujo de cajas de la expresión del árbol; deshice ese cambio y solo cambian las líneas descritas. `git diff --stat`: 18 inserciones y 1 borrado.

#### Diff 2: C-8b, Enmienda 2 de TAREAS-01
**Archivo:** `backend/test/lecturas-fx-r1.ataque.test.ts` › "la opción solo se puede activar dentro de adapters/db: …".
- **Título:** termina en "…y la opción solo se pide en las ocho lecturas (cuatro de clases, dos del muro y dos de tareas)".
- **Lista de usos:** pasa a `["adapters/db/clases.ts:4", "adapters/db/publicaciones.ts:2", "adapters/db/tareas.ts:2"]`.
- **Aserciones nuevas sobre `adapters/db/tareas.ts`:**
  - exactamente 2 líneas de código con `instantaneaUnica: true`;
  - ninguna línea de comentario que nombre `instantaneaUnica`.
- **Comentario:** cita "C-8b, Enmienda 2 de TAREAS-01" y ESSENTIALS, "Reglas de datos".
- **Lo demás que protege sigue intacto:**
  - nadie fuera de `adapters/db` nombra `enTransaccion`, `instantaneaUnica`, `isolationLevel` ni `RepeatableRead`;
  - `index.ts` no reexporta `enTransaccion`;
  - los niveles de aislamiento solo viven en `cliente.ts`.
- **Conteo:** `git diff --stat`, 22 inserciones y 2 borrados.
- **Producción:** en `tareas.ts`, `instantaneaUnica: true` aparece en las líneas 170 (`leerTarea`) y 586 (`listarTrabajo`), las dos en código.

#### Corrida aislada
`cd backend; npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts`, código 0: `Test Files  2 passed (2)` · `Tests  59 passed (59)`. Última línea: `Duration  20.72s (transform 1.24s, setup 52ms, import 2.65s, tests 15.85s, environment 0ms)`.
- `prettier --check` y `eslint` de los dos archivos pasan sin errores, igual que `tsc -p tsconfig.test.json`.
- No corrí la suite completa: la corre el programador en el paso 19.

#### Hashes nuevos
- `backend/test/sesiones-y-cadena.ataque.test.ts`: `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` (antes `2C8CB4D7…45C8`).
- `backend/test/lecturas-fx-r1.ataque.test.ts`: `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` (antes `CDCF742A…C638`).

#### Rojos esperados de 01b, actualizados
- Quedan los cuatro de la ronda 0 de 01b (los números 1 a 4 de la tabla de arriba). Según el resumen del programador, los tres del backend ya están en verde con el paso 17; el de `tsc` del frontend depende del paso 12, ya hecho, y no lo corrí.
- No se agrega ninguno. El "rojo esperado 5" del resumen del programador (`lecturas-fx-r1`, la opción en `tareas.ts`) deja de existir con C-8b, y el caso de la lista de rutas queda en verde con C-2.

#### Tabla unificada de SHA-256 de las 147 `*.ataque` después de la complementaria (base de V-01 del programador para retomar; 21 cambiadas frente a la base unificada, marcadas)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas. Solo cambian estos dos archivos frente a la tabla de la ronda 0 de 01b.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` | reescrita: C-8b (complementaria) |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` | reescrita: fuera del inventario, C-7 el más cercano (ronda 0 de 01b) |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` | reescrita: C-2 de 01b (complementaria) |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` | reescrita: C-7 (ronda 0 de 01b) |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` | reescrita: C-7 (ronda 0 de 01b) |
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
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | reescrita: C-5 (ronda 0 de 01b) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01b — Ronda 1
Veredicto: **DETENIDA por PA-09, sin hallazgos en el código de 01b (RESISTE, provisional).**
- Todo lo que ataqué del código resiste.
- Uno de mis casos nuevos dio resultados distintos aislado y en la corrida completa. La causa es un error mío en la expectativa de la prueba, no un defecto del producto (detalle abajo).
- Por PA-09 me detuve sin corregirla. El orquestador decide; el arreglo es de una línea.

Verificación propia:
- **lint:** código 0.
- **test:** `Test Files  1 failed | 171 passed (172)` · `Tests  1 failed | 2158 passed (2159)`. El único rojo es mi caso de PA-09.
- **PA-07:** limpia.

### Precondiciones
- **PA-01:** red `IZZI-F281-5G`, de confianza permanente. La regla del firewall está habilitada (Inbound, Block, Public). Docker 28.5.1, encendido.
- **R-17:** `cd shared; npm run build` dio código 0 antes del backend.
- **V-01:** las 147 `*.ataque` coinciden con la tabla unificada de la complementaria de la ronda 0 de 01b (`diff` vacío). Ninguna existente cambió en esta ronda.
- **Carga antes de la corrida completa:** CPU al 20 %, RAM libre 15 233 de 32 436 MB, 3 procesos `node`.

### Regresión
`npx vitest run` de mis `*.ataque` de TAREAS-01 (`temas-01a-r1`, `categorias-01a-r1`, `nombres-ids-01a-r2`, `temas-01a-r3`, `sesiones-y-cadena`) y de las de FIX-CLASES (`lecturas-fx-r1`, `lecturas-fx-r2`, `admin-muro-02b-r1`): `Test Files  8 passed (8)` · `Tests  153 passed (153)`. También pasan en la corrida completa.

### Hallazgos
Ninguno en el código.

### PA-09 (activada): mi caso con una expectativa que depende de quién gana la carrera
**Caso:** `backend/test/referencias-01b-r1.ataque.test.ts` › "ataque TAREAS-01b r1: el mismo archivo pendiente en dos escrituras a la vez" › "dos creaciones y, aparte, dos ediciones que reclaman el mismo pendiente: una gana, la otra responde 400, y la que pierde no deja tarea, trabajos ni cambios".

**Resultados:**
- Aislado, a las 00:24Z aproximadamente, pasó: `Tests  5 passed (5)`.
- En la corrida completa falló en la última aserción (archivo de 7460 ms, desde 00:29:27Z): `expected 'Segunda' to be 'Primera'`, en la línea 414.

**Lo que sí comprobó la corrida, y es correcto:**
- De las dos creaciones simultáneas con el mismo pendiente, una dio `201` y la otra `400`.
- Quedó una sola publicación, y el archivo quedó en la tarea ganadora.
- Hubo un solo `TAREA_CREADA`.
- De las dos ediciones simultáneas, una dio `200` y la otra `400`, y el archivo quedó en una de las dos tareas.

**Causa: error mío en la prueba, no del producto.** La última aserción supone que la creación ganadora es la de título "Primera". En la corrida completa ganó "Segunda", y la tarea que conservó su título era la ganadora. El arreglo es comparar con el título de la creación que respondió `201`, no con un literal. No toqué la prueba: espero la decisión. Si se corrige, es mi archivo, y la tabla de hashes de abajo cambia en esa línea.

### Atacado sin hallazgos
Probé, en `tareas-01b-r1` (18 casos), `instantanea-01b-r1` (13) y `referencias-01b-r1` (5):

**Autoría (punto 1).** La matriz que faltaba contra la API:
- **Maestro retirado y vuelto a asignar:**
  - Mientras A está en la clase, B recibe `403 EDICION_NO_PERMITIDA` y `403 BORRADO_NO_PERMITIDO`, y sus banderas son `false`.
  - Con A retirado, B la edita y sus banderas son `true`.
  - Con A de vuelta, B recibe `403` otra vez y A la edita.
- **La tarea del admin:** el maestro recibe `403` al editar y al borrar, y sus banderas son `false`, tanto en el detalle como en el muro.
- **El admin:** edita la suya, recibe `403 EDICION_NO_PERMITIDA` al editar la de un maestro y la borra con `204`.
- **Maestro de otra clase:** `403 SIN_ACCESO_A_LA_CLASE` en las cinco rutas, nunca `EDICION_NO_PERMITIDA`.
- **El alumno:** `403 ROL_NO_PERMITIDO` en las escrituras, y banderas `false` al leer.

**Trabajos diferidos (punto 2):**
- **Seis ediciones de fecha simultáneas:** las seis dan `200`. Queda exactamente un `RECORDATORIO_24H` vivo, el de `trabajo_id`, con `start_after` en fecha − 24 h. Hay 7 recordatorios en total y un solo `TAREA_CREADA`.
- **Editar y borrar a la vez, tres veces:** el borrado da `204` y la edición `200` o `404`. Nunca queda un trabajo vivo.
- **Fecha a 24 h:**
  - A 24 h + 3 s se programa a fecha − 24 h exacta.
  - A 24 h − 1 s no hay recordatorio y `trabajo_id` es nulo.
  - Al editar pasa lo mismo, en los dos sentidos.
- **Límite de 365 días:** 5 s antes pasa; 5 s después da `400 FECHA_LIMITE_INVALIDA`, al crear y al editar.
- **Fechas pasadas:**
  - Al crear, y una nueva al editar, dan `400`.
  - Conservar la ya vencida al editar pasa, sin recordatorio.
- **Zonas:** `-06:00`, `+05:45` y `+14:00` se guardan como el mismo instante en UTC.
- **Fracciones:** `.5` se guarda como `.500Z` y `.123456789` como `.123Z`. `start_after` queda al milisegundo.
- **Fechas mal formadas:** dan `400` sin escribir ni encolar: sin zona, 30 de febrero, segundo 60, hora 25, un número, texto y `null`.

**Archivos al editar (punto 3):**
- **Conservar un archivo de otra tarea, de otra clase, de otro usuario, uno descartado o un pendiente de más de 24 h:** `400`, y nada cambia; el archivo de la otra tarea sigue en ella.
- **Seis archivos o el mismo id dos veces:** `400 VALIDACION`.
- **El id conservado en mayúsculas** se reconoce (decisión 3).
- **Quitar todos** deja el archivo en `descartado`, sin publicación.
- **El mismo pendiente en dos creaciones o en dos ediciones simultáneas:** una gana y la otra da `400`, sin tarea ni trabajo de más. Es la parte correcta del caso de PA-09.

**El muro y los comentarios frente a una tarea (punto 4):**
- Borrarla por la ruta del muro, comentarla y listar sus comentarios dan `404 PUBLICACION_NO_ENCONTRADA`. La tarea y sus dos trabajos siguen igual.
- **Su id como cursor del muro** trae lo que sigue (material y anuncio).
- **Su id como cursor de "Trabajo de clase"**, también en mayúsculas, trae lo que sigue. En el tema equivocado da `400`.
- **El muro la muestra** con `tipo: "tarea"`, su resumen, 0 comentarios y `puedeBorrar: false` para el alumno.

**Fugas (punto 5):**
- En las cinco rutas, en las respuestas de éxito y de error (`403`, `404`), para el alumno, el maestro y el admin, ninguna clave se llama `trabajoId`, `trabajo_id`, `rol`, `email`, `correo`, `estadoPago`, `accesoRestringido`, `claveObjeto` ni `hashContrasena`, en ninguna profundidad.
- Tampoco aparece `@`, "deudor" ni "al_corriente".
- Los datos de los trabajos de las dos colas son exactamente `{ tareaId, claseId }`.

**Validación (punto 6):**
- **Puntos y puntos máximos:** `"100"`, `-0`, `1001`, `1.5`, `null` y `true` dan `400`. `1.0` vale 1 y `1e3` vale 1000.
- **Cuerpos que dan `400` sin crear ni encolar:**
  - `rubrica` como objeto o `null`, 21 criterios, un criterio vacío o de invisibles;
  - `categoriaId` o `temaId` vacíos;
  - un título de dos líneas o de 201 caracteres;
  - `aceptaTardias` como texto;
  - `instrucciones` `null` o de 10 001;
  - un cuerpo `null`, `[]`, texto o número.
- **"Trabajo de clase":** límite 0, -1, 101 o texto, `tema` ausente o `Sin-Tema` y un cursor con SQL dan `400`. Un `tareaId` que no es uuid también da `400`.

**Instantánea única (punto 7):**
- **`leerTarea` con la tarea borrada por `DELETE …/tareas/:tareaId`** después de `tarea.findFirst`, de `archivo.findMany` y de `maestroDeClase.findMany`: devuelve la tarea completa de ese momento (título, autor, rúbrica, adjunto y banderas).
- **`leerTarea` con una edición en medio** que cambia el título, reemplaza la rúbrica y quita el adjunto: devuelve la tarea de antes, entera.
- **`leerTarea` con el autor retirado** después de leer los adjuntos: las banderas del otro maestro salen de la misma instantánea (`false`, `false`).
- **`listarTrabajo`**, cuando entre la comprobación del cursor y la página pasa una de estas cosas, devuelve la página de ese momento (e3 y e4, con el resumen de la tarea), nunca vacía:
  - el material del cursor se borra por la ruta del muro;
  - la tarea del cursor se borra por su ruta;
  - el elemento del cursor se mueve de tema;
  - el cursor se borra y, a la vez, una tarea de la página se mueve a "Sin tema" y otra fila se borra.
- **El muro**, con la tarea borrada y su autor retirado justo después de la página, la devuelve con su resumen, y `puedeBorrar` del otro maestro sale `false`, de ese momento.
- **Pool lleno (10 conexiones):**
  - `leerTarea` y `listarTrabajo` rechazan con `AppError 503 SERVICIO_OCUPADO` y, liberadas, responden.
  - `GET …/tareas/:tareaId` y `GET …/trabajo`, liberadas a los 2.5 s, respondieron `200`; los dos casos aceptan `200` o `503`. Ningún `P2028` en el registro.
- **Revisión estática de `tareas.ts`:** las tres escrituras no usan la opción; las dos lecturas no escriben, no bloquean ni usan SQL crudo; la opción está exactamente en `leerTarea` y `listarTrabajo`.

**Referencias por id al editar:**
- **La categoría o el tema de otra clase, o inexistentes:** `404`. Nada cambia, ni la fecha ni el recordatorio, aunque la fecha del cuerpo fuera otra.
- **Sin categoría en una clase con categorías:** `409 CATEGORIA_REQUERIDA`.
- **Conteos:** los de temas (`elementos`, `sinTema`) y los de categorías (`tareas`) siguen a las tareas que se crean, se editan y se borran por la API.
- **Quitar una categoría con tareas:** `409`, con el mensaje "«Exámenes» tiene 2 tareas. …".

**Los "Ver más":** recorrer el muro y "Trabajo de clase" (por tema y "Sin tema") de 1 en 1, con tareas, materiales y anuncios mezclados, trae cada elemento una sola vez y en orden. Los comentarios de una tarea dan `404`, como en el punto 4.

**La cadena en las cinco rutas, más los `HEAD`:**
- Sin token: `401`.
- Con cambio de contraseña pendiente: `403 CAMBIO_DE_CONTRASENA_REQUERIDO`.
- Alumno restringido: `403 ACCESO_RESTRINGIDO`, también en `HEAD`.
- El admin en una clase inexistente recibe exactamente el mismo estado y cuerpo que un maestro en una clase ajena.
- Nada se escribe.

**Asíncrono:**
- Crear, editar y borrar solo dejan en la cola los trabajos de sus dos colas para esa tarea.
- La tabla `notificaciones` todavía no existe (llega con NOTIFICACIONES).
- Fuera de `adapters/notifier`, nada en `backend/src` escribe en notificaciones (ni `notificacion.create` o similares, ni `INSERT INTO notificaciones`).

**Hermanos** (los que pide el encargo):
- Las tres escrituras de tareas (crear, editar y borrar), en autoría, cola, archivos y referencias.
- Las tres referencias por id del cuerpo (categoría, tema y archivos).
- Los tres bloqueos de §D-7: la edición contra la edición, la edición contra el borrado, y el pendiente reclamado dos veces.
- Las dos colas, en sus datos y en un solo trabajo vivo.
- Las ocho lecturas con la opción: lo vigila `lecturas-fx-r1`, que pasa, y la revisión estática de `tareas.ts`.
- Los tres "Ver más": el muro, los comentarios y cada tema.

### No atacado y por qué
- **Frontend:** 01b no cambia el código de producción del frontend.
- **Consumidores de `TAREA_CREADA` y `RECORDATORIO_24H`:** no existen hasta NOTIFICACIONES.
- **El borrado de la tarea entre la fila de `tareas` y su publicación, dentro de una misma llamada de Prisma:** mi doble actúa entre llamadas, no entre las sentencias internas de una sola llamada. Esa frontera la cubre PR-1B15 del programador. Yo la ataqué después de cada llamada.

### Corrida completa y PA-07
- **Comando:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/back-01b-r1.json > <scratchpad>/back-01b-r1.txt 2>&1`, de 00:27:45Z a 00:29:36Z, código 1.
- **Resultado:** `Test Files  1 failed | 171 passed (172)` · `Tests  1 failed | 2158 passed (2159)` · `Duration  105.67s (transform 11.83s, setup 4.88s, import 184.05s, tests 832.71s, environment 45ms)`.
- **Único rojo:** el caso de PA-09. No hubo tiempos límite ni otros rojos, y no repetí la corrida.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` | 0 |
| (aparte) `too_small` | 0 |
| (aparte) `timed out` | 0 |

- **Control positivo:** completo. Están los tres `P2028` de `servicio-ocupado.integracion`, cada uno con su ruta: `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()` y `POST …/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`** también están: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Rutas de TAREAS-01 y `GET /api/admin/clases`:** ningún `P2028` ni ningún error sale de ellas.
- **Excepción arbitrada:** `nombres-tokens-r2` pasó en 3.7 s (desde 00:29:00Z), así que no se usó.
- **PA-07: limpia.**

### Lint del backend
`cd backend; npm run lint > <scratchpad>/lint-01b-r1.txt 2>&1`, código 0. ESLint sin errores; Prettier, "All matched files use Prettier code style!"; `tsc` de `src/` y de las pruebas, sin errores. La última línea con texto es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.

### Conteos
- `*.ataque` nuevas: 3, con 36 casos según el JSON de la corrida:
  - `backend/test/tareas-01b-r1.ataque.test.ts` (18);
  - `backend/test/instantanea-01b-r1.ataque.test.ts` (13);
  - `backend/test/referencias-01b-r1.ataque.test.ts` (5, uno de ellos el de PA-09).
- `*.ataque` en total: 150 (76 del backend y 74 del frontend).

### Tabla de SHA-256 de las 150 `*.ataque` al cierre de la ronda 1 de 01b (3 nuevas, ninguna existente cambia; si se corrige el caso de PA-09, cambia la fila de `referencias-01b-r1`)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` | nueva: ronda 1 de 01b |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `E9C04A6CC06C96D548ECB63A89ADBF02DC68BAFFFFF63E391E96002D50BAD022` | `backend/test/referencias-01b-r1.ataque.test.ts` | nueva: ronda 1 de 01b |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` | nueva: ronda 1 de 01b |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

### Cierre de PA-09 y veredicto
El orquestador autorizó corregir la aserción del caso de PA-09.

**Diff** (`backend/test/referencias-01b-r1.ataque.test.ts` › "ataque TAREAS-01b r1: el mismo archivo pendiente en dos escrituras a la vez" › "dos creaciones y, aparte, dos ediciones que reclaman el mismo pendiente: …"):
- La respuesta `201` de la creación ganadora queda en `creada`, y de ella sale `ganadora` (su id). Se agregan:
  - `tituloGanador = tareaRespuestaSchema.parse(creada.json()).tarea.titulo`;
  - `expect(["Primera", "Segunda"]).toContain(tituloGanador)`;
  - un comentario que dice que cuál de las dos gana no está definido.
- La última aserción pasa de `toBe(perdedora === ganadora ? "Primera" : "Otra")` a `toBe(perdedora === ganadora ? tituloGanador : "Otra")`.
- No cambia nada más de lo que el caso protege:
  - una creación `201` y otra `400`;
  - una sola publicación, con el archivo en la ganadora;
  - un solo `TAREA_CREADA`;
  - una edición `200` y otra `400`, con el archivo en una sola de las dos tareas;
  - la tarea que pierde la edición conserva su título.
- Formateé solo ese archivo desde `backend/`. `prettier --check`, `eslint` y `tsc -p tsconfig.test.json` pasan sin errores.

**Corridas:**
- **Aislada, dos veces:** `cd backend; npx vitest run test/referencias-01b-r1.ataque.test.ts`, código 0 las dos veces: `Tests  5 passed (5)`.
- **Precondiciones de la completa:**
  - PA-01: red `IZZI-F281-5G`; la regla del firewall sigue habilitada (Inbound, Block, Public); Docker 28.5.1.
  - R-17: `cd shared; npm run build`, código 0.
  - Carga previa: CPU al 16 %, RAM libre 15 231 de 32 436 MB, 3 procesos `node`.
- **Completa:** `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/back-01b-r1b.json > <scratchpad>/back-01b-r1b.txt 2>&1`, de 00:33:19Z a 00:35:13Z, código 0.
  - Pie: `Test Files  172 passed (172)` · `Tests  2159 passed (2159)` · `Duration  109.70s (transform 12.10s, setup 4.94s, import 182.27s, tests 863.09s, environment 57ms)`.
  - Última línea: `JSON report written to …/back-01b-r1b.json`.
  - `referencias-01b-r1` pasó sus 5 casos (7466 ms, desde 00:35:05Z). Sin rojos, sin tiempos límite.
- **PA-09: cerrada.** El caso pasa aislado y en la corrida completa.

**PA-07 sobre la salida completa (limpia):**
- `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `Unable to start a transaction`, `too_small` y `timed out`: 0 cada uno.
- `"Error no controlado"`: 10, exactamente I-1.
- `"code":"P2028"`: 5, los permitidos.
- Control positivo completo:
  - los tres de `servicio-ocupado.integracion`, cada uno con su ruta (`POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()`, `POST …/comentarios` › `prisma.$queryRawUnsafe()`);
  - los dos de `cuentas-r3` (`POST /api/auth/login` › `tx.sesion.create()`, `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`).
- Ningún error ni `P2028` en las rutas de TAREAS-01 ni en `GET /api/admin/clases`.
- La excepción de `nombres-tokens-r2` no se usó: pasó en 4.2 s.

**Veredicto final de la ronda 1 de 01b: RESISTE.** No hay hallazgos en el código de 01b.
- `*.ataque` nuevas de la ronda: 3, con 36 casos, todos verdes.
- `*.ataque` en total: 150 (76 del backend y 74 del frontend).
- La tabla de abajo es la base de V-01 del cierre de 01b.

#### Tabla de SHA-256 de las 150 `*.ataque` tras el cierre de PA-09 (solo cambia `referencias-01b-r1`)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` | nueva: ronda 1 de 01b |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` | nueva: ronda 1 de 01b; corregida al cerrar PA-09 |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` | nueva: ronda 1 de 01b |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01c — Ronda 0
Estado: **lista para el refactor, con un posible PA-20 por decidir antes de programar.**
- Reescribí 2 `*.ataque` del frontend por C-8, y en las dos solo cambian rutas de archivo.
- No reescribí nada por C-10: ninguna `*.ataque` simula `useSolicitarSubida` ni `useUrlDeDescarga`.
- Quedan 2 rojos esperados.
- No hay I-2.

### Precondiciones
- **Rama y árbol:** `feat/tareas` con `HEAD` = `ebfe126` (`<K1b>`, el commit de 01b del humano). `git status --porcelain -- shared backend frontend` salió vacío. Fuera de los paquetes solo están sin preparar `docs/ESTADO.md` y `aprobacion.md`, que están permitidos.
- **Archivos protegidos** (`sha256sum`), los cuatro iguales a los de `aprobacion.md`, sección "Commit `<K1b>`":
  - ESSENTIALS `9aef6ec5…f9260`
  - `ARCHITECTURE.md` `21638fa4…13fc56`
  - `PRD.md` `1b750158…a53f0d6`
  - `CLAUDE.md` `a5c06785…c5100126`
- **V-01:** las 150 `*.ataque` coinciden con la tabla de "### Cierre de PA-09 y veredicto" de la ronda 1 de 01b (`diff` vacío).
- **PA-01:** no aplica, porque no corrí el backend (01c es solo frontend).

### Búsqueda (C-8 y C-10)
**`vi.mock` en las `*.ataque` del frontend.**
- Hay 51. Todos simulan `@/services/navegacion`, `./navegacion` o `./data` de `components/layout`, salvo dos fábricas cerradas de `./hooks` en `features/clases`:
  - `inicio-sin-datos-02c-r1`: `useNombreDeSesion`, `useClasesImpartidas` y `useFocoAlCargarMas`.
  - `inicio-sin-datos-r2`: además `useClasesInscritas` y `useUnirseAClase`.
- Ninguno de esos ganchos se mueve en §D-9, y las vistas de inicio no usan los ganchos de adjuntos. **C-8 no las contradice.**
- No hay ningún `vi.mock("./data")` ni `vi.mock("./lib")` en `features/clases`.

**C-10.**
- Ninguna `*.ataque` simula `useSolicitarSubida` ni `useUrlDeDescarga`. `archivos-d-r1`, `r2` y `r3`, y `muro-c-*`, simulan la API (`fetch` y almacén), no los ganchos; los únicos `vi.spyOn` son de `Date.now`, `document` y `console`.
- **No hay nada que reescribir por C-10.**

**Importaciones directas.** Las de las `*.ataque` pasan todas por rutas que §D-9 conserva como reexportación:
- `./components/adjuntos-de-publicacion`;
- `./lib`: `tiempoFrescoDelMuro`, `avisoDeFalloAlSubir`, `mensajeDeErrorClases`, `varianteDeClase` y `terminoDeBusquedaValido`;
- `./types`.

Con la regla de §D-9 ("cada símbolo movido se reexporta desde su lugar anterior … un envoltorio con el mismo nombre y la misma salida"), **no cambian**.

**Reglas estáticas que listan archivos de `features/clases`.** Revisé:
- en `features/clases/`: `estatico-r1`, `estatico-02c-r1` y `clases-r4` (`?raw`);
- en `components/`: `layout/estatico-r1` y `ui/badge-03b-r1`;
- en `styles/`: `clases-r1` y `tokens-r1`;
- en `features/admin/`: `cuentas-r1` y `maestros-03b-r1`;
- en `app/`: `fondo-r1`.

Solo dos nombran archivos que §D-9 mueve: `features/clases/estatico-02c-r1` y `styles/clases-r1`. Son las dos reescrituras.

### Diff de lo reescrito (2 archivos; `git diff --stat -- frontend`: 10 inserciones y 5 borrados)
1. **`frontend/src/styles/clases-r1.ataque.test.ts`** › "ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)" › "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 40 enEspera" (**C-8**). En la lista fija de `enEspera=` por archivo solo cambian dos claves:
   - `"/src/features/clases/components/adjuntos-de-publicacion.tsx": 1` pasa a `"/src/components/adjuntos/adjuntos-de-publicacion.tsx": 1`.
   - `"/src/features/clases/components/firma-del-autor.tsx": 0` pasa a `"/src/components/clase/firma-del-autor.tsx": 0`.
   - Lleva comentarios de ronda 0 que citan C-8 y §D-9.
   - No cambia el total (40), ni los conteos, ni la regla del resto de `features/clases/components/`. Los archivos de origen quedan como reexportaciones sin `enEspera=`, así que no cuentan.
2. **`frontend/src/features/clases/estatico-02c-r1.ataque.test.ts`** › "ataque CLASES-02c r1: reglas de 02c en el código fuente" › "O-07: `administracion` solo se lee en firma-del-autor.tsx, y nadie compara un nombre con «Administración»" (**C-8**).
   - `rutasCon(/\.administracion\b/)` pasa de `["/src/features/clases/components/firma-del-autor.tsx"]` a `["/src/components/clase/firma-del-autor.tsx"]`.
   - Lleva un comentario que cita C-8 y §D-9, y que deja dicho que la lista de `FIRMA_ADMINISTRACION` del mismo caso queda sin reescribir (posible PA-20, abajo).
   - Nada más cambia.

### Posible PA-20 (para el arquitecto, antes de programar)
**Caso:** `estatico-02c-r1` › O-07, la aserción `lineasCon(/FIRMA_ADMINISTRACION|firmaAdministracion/)`.

**Lo que fija hoy:** exactamente tres líneas.
- `features/clases/components/firma-del-autor.tsx`: `{TEXTOS_MURO.firmaAdministracion}`.
- `features/clases/data.ts`: el `import` de `FIRMA_ADMINISTRACION`.
- `features/clases/data.ts`: `firmaAdministracion: FIRMA_ADMINISTRACION`.

**Por qué no la reescribo:**
- Al pasar a `components/clase/`, `FirmaDelAutor` ya no puede leer `TEXTOS_MURO` de `features/clases/data.ts`: un archivo compartido no importa de `features/`, regla 9 de `CLAUDE.md`, que vigila V-04.
- §D-9 mueve a `components/clase/data.ts` solo el texto de `ConClaseDeLaRuta`. No dice dónde queda el de la firma, ni si `TEXTOS_MURO.firmaAdministracion` se conserva.
- Según cómo se resuelva, la lista resultante cambia de forma:
  - el texto en `components/clase/data.ts`;
  - `FIRMA_ADMINISTRACION` importado de `@campus/shared` dentro de la firma;
  - con o sin `TEXTOS_MURO.firmaAdministracion`.
- No es solo una ruta: elegir una opción sería adivinar el diseño.

**Lo que hace falta:** que el arquitecto fije dónde vive el texto de la firma (una línea en §D-9). Con eso, la aserción se reescribe en una ronda 0 corta. **Lo que la prueba protege no cambia:** el texto "Administración" solo vive en un lugar de datos y en la firma, y nadie lo compara.

**Hasta entonces:** cuando exista `components/clase/firma-del-autor.tsx`, O-07 seguirá en rojo por esta aserción, aunque la de `.administracion` ya pase.

### Rojos esperados (lista exacta; PA-05 del programador)
| # | Archivo | Caso | C-n | Por qué | Se pone en verde cuando |
|---|---|---|---|---|---|
| 1 | `frontend/src/styles/clases-r1.ataque.test.ts` | "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 40 enEspera" | C-8 | `enEspera= en /src/components/adjuntos/adjuntos-de-publicacion.tsx: expected +0 to be 1`: el archivo aún no existe. Además, la ruta vieja cuenta 1 fuera de la lista fija | `AdjuntosDePublicacion` vive en `components/adjuntos/adjuntos-de-publicacion.tsx` y su archivo de origen es una reexportación |
| 2 | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | "O-07: `administracion` solo se lee en firma-del-autor.tsx, y nadie compara un nombre con «Administración»" | C-8, y el posible PA-20 | Hoy, `.administracion` se lee en la ruta vieja. Después del movimiento, la aserción de `FIRMA_ADMINISTRACION` sigue en rojo hasta resolver el posible PA-20 | `FirmaDelAutor` vive en `components/clase/firma-del-autor.tsx` **y** se reescribe la lista de `FIRMA_ADMINISTRACION` con la decisión del arquitecto |

Ninguna `*.ataque` simula una ruta que todavía no existe, así que ningún archivo falla al cargar.

### I-2
Ninguna.
- Las pruebas normales del frontend no simulan `./hooks`, `./lib` ni `./data` (los únicos `vi.mock` normales son de `react-router`).
- No leen archivos (`import.meta.glob`, `readFileSync`).
- No importan un símbolo movido por una ruta que no se conserve como reexportación.

### Observaciones (no son hallazgos)
- **O-1:** `features/clases/estatico-r1` revisa `?? []` y los ternarios anidados solo dentro de `features/clases/**` (`import.meta.glob("./**")`). Lo que §D-9 mueve a `components/clase/`, `components/adjuntos/`, `lib/` y `services/` queda fuera de esa revisión. La prueba sigue en verde, pero cubre menos. Si el manager quiere, en la ronda 1 de 01c agrego una `*.ataque` nueva que extienda la regla a esas carpetas.
- **O-2:** en `estatico-02c-r1` › §D-2C1, la exención `features/clases/lib.ts` ("donde vive perspectivaDeRuta") apunta al archivo viejo. Hoy no filtra ninguna línea: `perspectivaDeRuta` hace `pathname.toLowerCase()` sin `startsWith`, así que la prueba no queda contradicha y no la reescribí. Si el movimiento cambiara esa línea, sería C-8 sobre una ruta.

### Corridas (solo frontend; una suite a la vez)
- **lint:** `cd frontend; npm run lint > <scratchpad>/front-lint-01c-r0.txt 2>&1`, código 0. ESLint sin errores; Prettier "All matched files use Prettier code style!"; `tsc -b` sin errores. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-01c-r0.json > <scratchpad>/front-test-01c-r0.txt 2>&1`, de 01:46:12Z a 01:47:32Z, código 1.
  - Pie: `Test Files  2 failed | 125 passed (127)` · `Tests  2 failed | 1850 passed (1852)` · `Duration  77.07s (transform 17.92s, setup 51.26s, import 148.58s, tests 345.96s, environment 242.55s)`.
  - Última línea: el error de npm por el código 1.
  - Los 2 rojos son exactamente los esperados 1 y 2, y no hay otros.

### Conteos
- `*.ataque`: 150 (76 del backend y 74 del frontend). Ninguna nueva y 2 cambiadas.
- Frontend: 127 archivos y 1852 casos, igual que en la ronda 1 de 01b.

### Tabla de SHA-256 de las 150 `*.ataque` al cierre de la ronda 0 de 01c (base de V-01 del programador de 01c; 2 cambiadas, marcadas)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `BE39268974E827B3BEFCD648ABA6FA1FAB8DDB32B4BC3D8FB3946A5714542C6F` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | reescrita: C-8 (ronda 0 de 01c) |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `8344C118DDDF789693C1556CECF0736FDBA573CEE411A2A00707178B2A273C2D` | `frontend/src/styles/clases-r1.ataque.test.ts` | reescrita: C-8 (ronda 0 de 01c) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

### Complementaria: O-07 (Enmienda 3)
El arquitecto resolvió el posible PA-20 con la Enmienda 3 (final de `plan.md` y fila de `FirmaDelAutor` en §D-9). La decisión:
- El texto de la firma vive en `components/clase/data.ts`, en `TEXTOS_DE_LA_CLASE.firmaAdministracion: FIRMA_ADMINISTRACION`, importado de `@campus/shared` en una sola línea de `import`.
- `components/clase/firma-del-autor.tsx` lo lee de ahí.
- `features/clases/data.ts` y la reexportación de la firma ya no lo nombran.

**Diff:** `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` › O-07 (C-8, Enmienda 3). Es el único archivo que formateé, desde `frontend/`.
- La lista de líneas de código con `FIRMA_ADMINISTRACION` o `firmaAdministracion` pasa de `[features/clases/components/firma-del-autor.tsx, features/clases/data.ts, features/clases/data.ts]` a `["/src/components/clase/data.ts", "/src/components/clase/data.ts", "/src/components/clase/firma-del-autor.tsx"]`: el `import` y la clave en `data.ts`, más la lectura en la firma.
- Al tratarse de una lista exacta, ninguna línea puede quedar en `features/clases/data.ts` ni en la reexportación.
- Lleva un comentario nuevo que cita "C-8, Enmienda 3". El comentario de la ronda 0 ya no menciona el posible PA-20.
- Lo demás de O-07 queda igual:
  - `.administracion` solo en `/src/components/clase/firma-del-autor.tsx`, que ya estaba reescrito;
  - ninguna comparación contra la firma o su texto;
  - ningún literal `"Administración"` en el código.
- `prettier --check` y `eslint` de ese archivo pasan.

**Corridas** (solo frontend, una a la vez):
- **lint:** `cd frontend; npm run lint`, código 0. ESLint sin errores; Prettier "All matched files use Prettier code style!"; `tsc -b` sin errores. Última línea con texto: `> tsc -b`.
- **test:** `cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-01c-r0b.json > <scratchpad>/front-test-01c-r0b.txt 2>&1`, de 01:51:59Z a 01:53:26Z, código 1.
  - Pie: `Test Files  2 failed | 125 passed (127)` · `Tests  2 failed | 1850 passed (1852)` · `Duration  83.88s (transform 19.94s, setup 52.49s, import 203.15s, tests 374.32s, environment 234.96s)`.
  - La última línea es el error de npm por el código 1.

**Rojos esperados de 01c:** siguen siendo exactamente los dos de la ronda 0, y no hay otros. El posible PA-20 queda resuelto.
1. `styles/clases-r1` › "V-06: …": `enEspera= en /src/components/adjuntos/adjuntos-de-publicacion.tsx: expected +0 to be 1`. Se pone en verde con el movimiento de `AdjuntosDePublicacion`.
2. `features/clases/estatico-02c-r1` › "O-07: …": hoy, `.administracion` se lee en la ruta vieja. Se pone en verde con el movimiento de `FirmaDelAutor` y del texto según la Enmienda 3.

**Hash nuevo:** `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` = `7EBF0E1F8C5D29E453CCAA942324B95176E6632BD2452064C10D08D72B84A24C`, antes `BE392689…2C6F`. Es el único que cambia frente a la tabla de la ronda 0 de 01c.

#### Tabla de SHA-256 de las 150 `*.ataque` tras la complementaria de 01c (base de V-01 del programador de 01c; 2 cambiadas frente a la ronda 1 de 01b, marcadas)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7EBF0E1F8C5D29E453CCAA942324B95176E6632BD2452064C10D08D72B84A24C` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | reescrita: C-8 (ronda 0 de 01c y complementaria, Enmienda 3) |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `8344C118DDDF789693C1556CECF0736FDBA573CEE411A2A00707178B2A273C2D` | `frontend/src/styles/clases-r1.ataque.test.ts` | reescrita: C-8 (ronda 0 de 01c) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01c — Ronda 1
Veredicto: **RESISTE**. No hay hallazgos: el refactor no cambia el comportamiento en nada de lo que ataqué.
Verificación propia (solo frontend; el backend no se corre en 01c):
- lint: código 0.
- test: `Test Files  129 passed (129)` · `Tests  1876 passed (1876)`.

### Precondiciones y regresión
- **Rama y base:** `feat/tareas`, base `<K1b>` = `ebfe126`. El árbol tiene el refactor sin commit: 4 `git mv` y los archivos nuevos que lista el resumen.
- **V-01:** las 150 `*.ataque` coinciden con la tabla de "Complementaria: O-07 (Enmienda 3)". El `diff` contra esa tabla solo agrega la nueva de esta ronda.
- **Regresión:** todas mis `*.ataque` del frontend pasan en la corrida completa. Entre ellas, las dos que reescribí en la ronda 0 (`styles/clases-r1` › V-06 y `features/clases/estatico-02c-r1` › O-07) y todas las de CLASES.
- **Punto 6, con git:**
  - fuera de `frontend/src` no cambia nada (aparte de la carpeta del encargo y `docs/ESTADO.md`);
  - `git diff ebfe126 --diff-filter=D` sale vacío: no se borró nada;
  - los cuatro orígenes de los `git mv` siguen existiendo como reexportación o envoltorio;
  - `git diff --quiet ebfe126 -- frontend/src/app/router.tsx` da código 0: `router.tsx` está intacto.
  - Ninguna `*.ataque` cayó, así que PA-20 no aplica.

### Hallazgos
Ninguno.

### Atacado sin hallazgos
Todo está en `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx`: 11 casos, verdes en dos corridas aisladas y en la completa.

**1. Mismas salidas que en `ebfe126`, contra copias literales del código de antes del refactor:**
- **`perspectivaDeRuta`:** 18 rutas raras dan lo mismo: vacía, `/`, con barra final, mayúsculas, `/maestros`, `/maestro-clases`, `/administrador`, query, hash, sin barra inicial, `//maestro`, `/admin/../maestro` y un NBSP.
- **`baseDeClase`:** las tres perspectivas, con ids vacíos, con `/`, `%20` y `../`.
- **`erroresPorCampo`:** incidencias sin campo, con índice numérico, con `Symbol`, repetidas y con ruta anidada.
- **`esErrorDeCursor`:** "Cursor:" con mayúscula, sin espacio, con espacio inicial, un `VALIDACION` de `claseId`, otro código con prefijo "cursor:", un `Error` común, texto, `null` y `undefined`.
- **`erroresDeFormularioClases`:** el campo del formulario, uno que no es del formulario y un error que no es `VALIDACION`.
- **`tiempoFrescoDelMuro`:** sin páginas, sin adjuntos, una vista previa nula, una fecha inválida, una vencida, varias en una página y en varias páginas. `MARGEN_DE_VISTA_PREVIA_MS` sigue en 60 000.
- **Textos y constantes:**
  - `TEXTOS_ADJUNTOS`: los ocho textos fijos y las cinco funciones de texto, comparados con los literales de `ebfe126`.
  - `ACCEPT_DE_ADJUNTOS` sigue saliendo de la misma fórmula de `TIPOS_DE_ARCHIVO_PERMITIDOS`.
  - `clavePublicaciones` no cambia.
  - Los tres mensajes de archivos de `MENSAJES_ERROR_CLASES_GENERALES` y `mensajeDeErrorClases` para `ARCHIVO_NO_SUBIDO`, `ARCHIVO_INVALIDO`, `ALMACEN_NO_CONFIGURADO` y `ALMACEN_NO_DISPONIBLE` dan los textos de antes.
  - `TEXTOS_CLASE.sinAcceso` y `TEXTOS_DE_LA_CLASE.sinAcceso` valen "No tienes acceso a esta clase.".
  - `TEXTOS_DE_LA_CLASE.firmaAdministracion === FIRMA_ADMINISTRACION === "Administración"`.
- **`avisoDeFalloAlSubir` (envoltorio):** un fallo que no es `ApiError` da "No pudimos subir «…». Inténtalo de nuevo.". `ARCHIVO_INVALIDO` lleva el motivo del servidor. `ALMACEN_NO_DISPONIBLE` lleva el texto del almacén. `SIN_ACCESO_A_LA_CLASE` lleva el mensaje de CLASES.
- **`errorDeArchivoElegido` y `tipoDeArchivo`:** dan los textos de antes con un archivo de más de 25 MB, un SVG, un archivo sin extensión, 5 ya elegidos y un `.PDF` sin tipo. Una extensión desconocida da `""`.

**2. Comportamiento, con los ganchos simulados en su lugar real (`vi.mock("@/components/adjuntos/hooks")`):**
- El envoltorio `features/clases/components/adjuntos-de-publicacion.tsx` reacciona igual que antes:
  - un fallo de descarga `ALMACEN_NO_DISPONIBLE` avisa con el texto de CLASES;
  - un `SIN_ACCESO_A_LA_CLASE`, con el suyo;
  - una descarga buena navega a la URL con el id del adjunto.

  La lista conserva su nombre accesible, "Archivos adjuntos". Esto también demuestra que el envoltorio pasa de verdad por el gancho movido.
- El componente compartido usa el `mensajeDeError` que recibe, no uno fijo de CLASES. Sin adjuntos no pinta nada.
- **La firma:** el admin sale como «Administración» con su icono y sin su nombre. Una persona que se llama «Administración» sale como nombre, sin icono. La firma se sigue decidiendo por `administracion`, nunca por el nombre.

**3. Revisión estática de lo movido** (lo que `features/clases/estatico-r1` dejó de cubrir: O-1 de mi ronda 0):
- Los 12 archivos de destino existen:
  - `components/adjuntos/{adjuntos-de-publicacion, lista-de-adjuntos-elegidos}.tsx` y `components/adjuntos/{data, hooks, lib, types}.ts`;
  - `components/clase/{con-clase-de-la-ruta, firma-del-autor}.tsx` y `components/clase/data.ts`;
  - `lib/{errores-de-api, ruta-de-clase}.ts`;
  - `services/clasesService.ts`.
- Ninguno usa `?? []`, `fetch(`, `console.`, `dangerouslySetInnerHTML` ni `target="_blank"`, ni importa de `features/`.
- Ningún archivo de `components/`, `lib/` ni `services/` importa de `features/`.
- **Cada símbolo movido se define una sola vez, en su destino de §D-9** (22 símbolos, incluidos los tipos `Perspectiva`, `ArchivoCandidato`, `ErroresFormulario` e `IncidenciaValidacion`). `AdjuntosDePublicacion` se define dos veces, el compartido y el envoltorio, como aceptó el manager.
- Los tres orígenes de una línea (`con-clase-de-la-ruta`, `firma-del-autor` y `lista-de-adjuntos-elegidos`) son exactamente una reexportación.
- **Precisión sobre el alcance:** `features/auth` y `features/admin` tienen homónimos propios (`ErroresFormulario`, `IncidenciaValidacion`, `erroresPorCampo`) desde antes de 01c. Cada módulo tiene los suyos (regla 9 de `CLAUDE.md`), no son parte de §D-9 y están en "No se toca"; por eso quedan fuera de esa comprobación, con un comentario en la prueba.

**4. Lectura de los diffs contra `ebfe126`.** Los cuerpos de `perspectivaDeRuta`, `baseDeClase` (ahora lee `BASES_POR_PERSPECTIVA`, con los mismos valores), `campoDeErrorDeApi` (antes `campoDeErrorClases`), `erroresDeFormularioDeApi`, `erroresPorCampo`, `tipoDeArchivo`, `errorDeArchivoElegido`, `tiempoFrescoDeAdjuntos`, `avisoDeFalloAlSubir`, los dos ganchos y los cuatro componentes son los mismos de antes. Solo cambian:
- las importaciones;
- la prop `mensajeDeError` del compartido;
- el texto de la firma, que sale de `components/clase/data.ts`.

El mapa de `mensajeDeErrorClases` esparce `MENSAJES_POR_CODIGO_DE_ARCHIVO`, con las mismas cuatro claves y los mismos textos.

### Hermanos
- Los nueve movimientos de §D-9 más el de los mensajes de archivos (M-01). Cada uno tiene su comprobación de "una sola definición" o de "misma salida".
- Los cuatro envoltorios: `AdjuntosDePublicacion`, `avisoDeFalloAlSubir`, `erroresDeFormularioClases` y `tiempoFrescoDelMuro`.
- Los dos ganchos movidos, por el `vi.mock` de su lugar real.
- Los dos textos de `components/clase/data.ts`.

### No atacado y por qué
- **El formulario del muro de punta a punta** con el gancho de subida simulado en su lugar real: `formulario-publicacion.tsx` no cambió e importa `useSolicitarSubida` de `../hooks`, que lo reexporta. `archivos-d-r1`, `r2` y `r3` lo atacan de punta a punta con la API simulada, y siguen en verde.
- **Navegador y 360 px:** 01c no cambia nada visual, y no abro navegadores.
- **El backend:** 01c no lo toca.

### Corridas (solo frontend; una suite a la vez)
- **lint:** `cd frontend; npm run lint > <scratchpad>/front-lint-01c-r1.txt 2>&1`, código 0. ESLint sin errores; Prettier, "All matched files use Prettier code style!"; `tsc -b` sin errores. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-01c-r1.json > <scratchpad>/front-test-01c-r1.txt 2>&1`, de 02:38:23Z a 02:39:44Z, código 0.
  - Pie: `Test Files  129 passed (129)` · `Tests  1876 passed (1876)` · `Duration  77.83s (transform 18.00s, setup 51.37s, import 151.36s, tests 342.23s, environment 244.99s)`.
  - Última línea: `JSON report written to …/front-01c-r1.json`.
  - Son 1865 casos de la verificación del manager más los 11 nuevos.

### Conteos
- `*.ataque` nuevas: 1, `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx`, con 11 casos.
- `*.ataque` en total: 151 (76 del backend y 75 del frontend). Ninguna existente cambió en esta ronda.

### Tabla de SHA-256 de las 151 `*.ataque` al cierre de la ronda 1 de 01c (base de V-01 del cierre de 01c; 1 nueva, ninguna existente cambia)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7EBF0E1F8C5D29E453CCAA942324B95176E6632BD2452064C10D08D72B84A24C` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | nueva: ronda 1 de 01c |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `8344C118DDDF789693C1556CECF0736FDBA573CEE411A2A00707178B2A273C2D` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01d — Ronda 0
Estado: **pendiente de decisión antes de programar**.
- Reescribí 1 `*.ataque` por C-9 y queda en verde, así que no hay rojos esperados por C-9.
- Hay **4 posibles PA-20**: listas cerradas de reglas estáticas fuera del texto de C-9 que 01d contradice con seguridad (2) o probablemente (2). No las reescribí.
- No hay I-2.

### Precondiciones
- **Rama y árbol:** `feat/tareas` con `HEAD` = `ad670c9` (`<K1c>`). `git status --porcelain -- shared backend frontend` salió vacío. Fuera de los paquetes solo están sin preparar `docs/ESTADO.md`, `aprobacion.md` y `revision.md`, que están permitidos.
- **Archivos protegidos** (`sha256sum`), los cuatro iguales a los de `aprobacion.md`, sección "Commit `<K1c>`":
  - ESSENTIALS `9aef6ec5…f9260`
  - `ARCHITECTURE.md` `21638fa4…13fc56`
  - `PRD.md` `1b750158…a53f0d6`
  - `CLAUDE.md` `32fc5f90…276f1`
- **V-01:** las 151 `*.ataque` coinciden con la tabla de la ronda 1 de 01c (`diff` vacío).
- **Backend:** no lo corrí. PA-01 no aplica.

### Búsqueda (C-9)
Busqué en las 75 `*.ataque` del frontend:
- listas cerradas de rutas del router (`app/*.ataque`, `rutas-*`, `router.ataque`, `muro-rutas-*`, `rutas-clases-*`);
- conteos de botones, enlaces o acciones principales (`getAllByRole("button"|"link")` con longitudes o listas de nombres, `data-variant="primary"`);
- prohibiciones de "crear" o "editar";
- aserciones de que el muro solo pinta anuncios y materiales (`tipo`);
- reglas estáticas con listas cerradas de archivos que 01d puede tocar.

| Qué | Resultado |
|---|---|
| Listas cerradas de rutas del router | Ninguna `*.ataque` fija la lista completa de rutas. Lo que hay son casos por ruta, como `/maestro/clases/:claseId/editar` → `/login` o `…/clases/nueva`. Las rutas nuevas (`tareas/:tareaId`, `tareas/nueva`, `tareas/:tareaId/editar`) no chocan con ninguno. `marco-r1` exige que todo `href` sea una ruta existente, y lo será |
| "Crear" o "Editar" prohibidos en la vista del maestro | `rutas-02c-r1` › "el maestro no tiene «Crear clase» ni «Editar clase» en ningún lugar" › "inicio con clases, la tarjeta, el encabezado de la clase y sus alumnos": navega a `/maestro/clases/:claseId`, que es el muro (índice de `ClaseLayout`), y prohíbe todo botón o enlace con `/crear/i`. **"Crear tarea" lo contradice (C-9)** → **reescrito** (abajo) |
| Conteos de acciones principales | `clases-r3` › "una sola acción principal por vista" cuenta `primary` en el inicio y en la lista del admin. "Crear tarea" es `outline`. Sin cambios |
| "El muro solo pinta anuncios y materiales" | Ninguna aserción lo fija. Ningún doble usa `tipo: "tarea"` |
| Conteos por capacidad | `lib.test.ts` (normal) revisa `CAPACIDADES_POR_PERSPECTIVA` campo por campo. Agregar `crearTarea` no lo rompe |

### Diff de lo reescrito (1 archivo; C-9)
`frontend/src/app/rutas-02c-r1.ataque.test.tsx` › "ataque CLASES-02c r1: el maestro no tiene «Crear clase» ni «Editar clase» en ningún lugar", en la ayuda `sinCrearNiEditar` que usan sus dos casos.
- El nombre accesible prohibido pasa de `/crear|editar|nueva clase/i` a la función `nombreProhibido`: `/crear|editar|nueva clase/i.test(nombre) && nombre !== "Crear tarea"`.
- Se admite **solo** el nombre exacto "Crear tarea". Cualquier otro control con "crear", "editar" o "nueva clase" sigue prohibido.
- Las demás aserciones no cambian: ningún `href` a `/clases/nueva` ni `/editar` (el de "Crear tarea" es `…/tareas/nueva`), y ningún "Crea tu primera clase" ni "Nueva clase".
- Lleva un comentario de ronda 0 que cita C-9, §D-10 y S-18.
- `git diff --stat`: 8 inserciones y 2 borrados.

### Rojos esperados
**Ninguno.** El caso reescrito pasa hoy y seguirá pasando cuando aparezca "Crear tarea". Si los 4 posibles PA-20 de abajo no se resuelven, caerán cuando exista el código de 01d.

### I-2
Ninguna. Las normales que 01d toca (`app/router.test.tsx` y `features/clases/muro-view.test.tsx`) ya están en la lista cerrada de 01d. Del resto de las normales que nombran el muro, el router o las capacidades (`publicacion-del-muro.test.tsx`, `clase-layout.test.tsx`, `lib.test.ts`, `marco.test.tsx`, `inicio-maestro-view.test.tsx`), ninguna fija una lista que 01d contradiga.

### Posibles PA-20 (listas cerradas de reglas estáticas fuera del texto de C-9; para el arquitecto, antes de programar)
C-9 nombra "listas cerradas de rutas del router; conteos de botones o de acciones principales **del muro**". Estas cuatro listas son de reglas estáticas sobre `src/`; las dos primeras sí caen con lo que pide §D-10. No las reescribo, porque su forma nueva depende de en qué archivos y con qué expresión implemente el programador. Propongo para cada una lo que conserva lo que protege.

**P20-1 (seguro).** `features/clases/estatico-02c-r1.ataque.test.ts` › "C-13 y A-5: los botones de borrar leen puedeBorrar del dato; nada decide por el rol, por `propio` ni por mis-comentarios".
- **Lo que fija:**
  - `rutasCon(/\.puedeBorrar\b/)` es exactamente `["…/comentarios-de-publicacion.tsx", "…/publicacion-del-muro.tsx"]`;
  - ninguna línea tiene `puedeBorrar\s*[:=]` salvo `(comentario|publicacion).puedeBorrar`.
- **Por qué cae:** §D-10 pide "Borrar tarea" solo con `puedeBorrar`, leído de la tarea. El componente que lo lea (`acciones-de-la-tarea.tsx`, `detalle-tarea-view.tsx` o ambos) suma una ruta y una línea como `puedeBorrar={tarea.puedeBorrar}`.
- **Propuesta (un C-n de 01d):**
  - la lista suma el o los archivos de `features/tareas` que lean `.puedeBorrar` de la tarea;
  - la segunda expresión admite `(comentario|publicacion|tarea).puedeBorrar`.

  Sigue protegiendo que el botón decida por el dato y nunca por el rol. Hace falta que el plan fije el archivo, o que se acepte la lista que deje el programador y se compruebe con el código.

**P20-2 (seguro).** `styles/clases-r1.ataque.test.ts` › "V-06: … 40 enEspera".
- **Lo que fija:** exactamente 40 `enEspera=`, una lista fija por archivo, y un resto que solo puede vivir en `features/admin/components/` (2) y `features/clases/components/` (3).
- **Por qué cae:** §D-10 pide "Publicar tarea" o "Guardar cambios" con `enEspera`, y casi con seguridad "Sí, borrar tarea" (patrón de §7.14). Esos `enEspera=` en `features/tareas/` caen fuera de la lista y fuera de los dos prefijos del resto.
- **Propuesta:** sumar a la lista fija `"/src/features/tareas/components/formulario-tarea.tsx": 1` y `"/src/features/tareas/components/acciones-de-la-tarea.tsx": 1`, y llevar el total a 42.
  - Depende de que el botón principal sea un solo `enEspera=` en `formulario-tarea.tsx` y el de borrar viva en `acciones-de-la-tarea.tsx`, como nombra §D-10.
  - "Crear tarea" no espera nada, así que no lleva `enEspera`.

  Necesita que el plan confirme los archivos y los conteos.

**P20-3 (probable).** `features/clases/estatico-02c-r1.ataque.test.ts` › "§D-2C1: la perspectiva sale solo de perspectivaDeRuta; …".
- **Lo que fija:** `rutasCon(/perspectivaDeRuta\(/)` es exactamente `["…/clase-layout.tsx", "…/muro-view.tsx"]`.
- **Por qué podría caer:** las vistas de `features/tareas` (crear, editar y detalle, con "Cancelar" al detalle o al muro y la navegación al terminar) y la tarjeta del muro necesitan la base de la perspectiva para sus enlaces (punto 3 de "Puntos de ataque" → 01d). Si la calculan con `perspectivaDeRuta(location.pathname)`, la lista crece.
- **Propuesta:** fijar en §D-10 de dónde sale la perspectiva en `features/tareas` (por ejemplo, `perspectivaDeRuta` en cada vista, o recibida del muro por props en la tarjeta) y sumar esas rutas a la lista. Lo que protege no cambia: nadie compara el `pathname` con un prefijo por su cuenta.

**P20-4 (condicional).** `components/layout/estatico-r1.ataque.test.ts` › "los únicos valores arbitrarios de maquetación nuevos son los que prescribe el plan".
- **Lo que fija:** la lista exacta de valores arbitrarios fuera de `components/ui/`.
- **Por qué podría caer:** el detalle "dos columnas desde 1024 px" y el formulario podrían usar un valor arbitrario nuevo (un `lg:grid-cols-[…]` distinto del que ya existe).
- **Propuesta:** si `DESIGN.md` §7.20 o §7.21 de 01d prescribe uno, el arquitecto lo nombra y se suma. Si 01d reutiliza los valores existentes o utilidades de la escala, no cae.

Revisé además, sin encontrar contradicción por diseño:
- `badge-03b-r1`: las cinco variantes de `badge.tsx`. `components/ui/**` sigue en "No se toca", así que la insignia "Tarea" usa una variante existente.
- `styles/clases-r1` › V-05: `outline-none` solo en `dialog.tsx`, y ningún `ring-` ni `focus:`. `NativeSelect` debe tener "el mismo foco que `Input`", que no los usa; si el programador copia el `native-select` de shadcn sin adaptarlo, eso será un hallazgo, no una contradicción.
- `marco-r1`: todo `href` es una ruta existente.
- `estatico-02c-r1` › §D-2C3: las expresiones de `/clases/nueva` y `/editar` no coinciden con `…/tareas/nueva` ni con `…/tareas/:tareaId/editar`.
- `estatico-02c-r1` › O-07: la firma sigue en `components/clase/firma-del-autor.tsx`.

### Corridas (solo frontend; una suite a la vez)
- **lint:** `cd frontend; npm run lint > <scratchpad>/front-lint-01d-r0.txt 2>&1`, código 0. ESLint sin errores; Prettier "All matched files use Prettier code style!"; `tsc -b` sin errores. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-01d-r0.json > <scratchpad>/front-test-01d-r0.txt 2>&1`, de 03:24:06Z a 03:25:31Z, código 0.
  - Pie: `Test Files  129 passed (129)` · `Tests  1876 passed (1876)` · `Duration  81.24s (transform 17.27s, setup 54.77s, import 158.21s, tests 357.68s, environment 256.91s)`.
  - Última línea: `JSON report written to …/front-01d-r0.json`.

### Conteos
`*.ataque`: 151 (76 del backend y 75 del frontend). Ninguna nueva y 1 cambiada.

### Nota para la ronda 1 de 01d
01d trae `DESIGN.md` nuevo:
- §7.3: `NativeSelect` y el control segmentado de entregas tardías;
- §7.7: el umbral de 72 h;
- §7.8: la insignia "Tarea";
- §7.18: la tarjeta y "Crear tarea";
- §7.20: "Detalle de tarea";
- §7.21: "Formulario de tarea y rúbrica".

En la ronda 1 atacaré:
- **Tokens:** ninguna clase de las escalas anuladas ni colores sueltos en `native-select.tsx`, `features/tareas` ni la tarjeta.
- **Foco:** §7.14 al quitar criterios y adjuntos, la confirmación de borrar y el foco tras un error.
- **360 px:** con jsdom solo se revisan las clases responsivas declaradas; lo visual queda para la comprobación humana.
- **"El estado nunca solo con color":** la insignia "Tarea", el vencimiento próximo y el vencido llevan texto o icono.
- **Los puntos de "Puntos de ataque" → 01d:**
  - doble envío durante la subida;
  - quitar un adjunto o un criterio con la publicación en vuelo;
  - otra zona horaria con `TZ`;
  - fecha vacía;
  - puntos con coma decimal;
  - categoría que desaparece (`404`);
  - instrucciones con HTML o URL;
  - el estudiante en `…/editar`;
  - los enlaces de las tres perspectivas.

### Tabla de SHA-256 de las 151 `*.ataque` al cierre de la ronda 0 de 01d (base de V-01 del programador de 01d; 1 cambiada, marcada)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | reescrita: C-9 (ronda 0 de 01d) |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7EBF0E1F8C5D29E453CCAA942324B95176E6632BD2452064C10D08D72B84A24C` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `8344C118DDDF789693C1556CECF0736FDBA573CEE411A2A00707178B2A273C2D` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

### Complementaria: C-13 (Enmienda 4)
El arquitecto convirtió mis cuatro posibles PA-20 en **C-13** (Enmienda 4, al final de `plan.md`, y fila C-13 de §D-R0). Reescribí P20-1 a P20-3. P20-4 (valores arbitrarios) **no se toca**: 01d no agrega ninguno, y si en la ronda 1 aparece uno, es hallazgo. Formateé solo los dos archivos, desde `frontend/`; `prettier --check` y `eslint` pasan.

**Diffs** (todos citan "C-13, Enmienda 4" en un comentario de ronda 0 complementaria):
1. `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` › "C-13 y A-5: los botones de borrar leen puedeBorrar del dato; …":
   - `rutasCon(/\.puedeBorrar\b/)` suma `"/src/features/tareas/components/acciones-de-la-tarea.tsx"`, el único lector nuevo. Queda en 3 rutas.
   - La expresión de asignaciones pasa de `(comentario|publicacion)\.puedeBorrar` a `(comentario|publicacion|tarea)\.puedeBorrar`.
   - Lo demás no cambia: ni `mis-comentarios`, ni `esMaestro` o `esDueno`, ni `.propio`. Sigue protegiendo que el botón decida por el dato y nunca por el rol, y que nadie más lea `puedeBorrar`.
2. El mismo archivo › "§D-2C1: la perspectiva sale solo de perspectivaDeRuta; …":
   - La exención de la comparación del `pathname` pasa de `/src/features/clases/lib.ts: ` a `/src/lib/ruta-de-clase.ts: `, donde vive `perspectivaDeRuta` desde 01c. Esto cierra mi O-2 de la ronda 0 de 01c.
   - La lista de llamadores de `perspectivaDeRuta(` suma solo `"/src/features/tareas/hooks.ts"` (el gancho `useRutaDeLaClase`).
3. `frontend/src/styles/clases-r1.ataque.test.ts` › "V-06: …":
   - El título y el total pasan de 40 a **42** `enEspera=`.
   - La lista fija suma `"/src/features/tareas/components/formulario-tarea.tsx": 1` y `"/src/features/tareas/components/acciones-de-la-tarea.tsx": 1`.
   - Con `0` explícito: `"/src/features/clases/components/tarjeta-de-tarea.tsx"`, `"/src/features/tareas/components/editor-de-rubrica.tsx"`, `"/src/features/tareas/detalle-tarea-view.tsx"`, `"/src/features/tareas/crear-tarea-view.tsx"` y `"/src/features/tareas/editar-tarea-view.tsx"`.
   - `muro-view.tsx` sigue en 1, porque "Crear tarea" es un enlace.
   - Lo demás no cambia: ningún `enEspera=` fuera de la lista (salvo el resto de admin y del roster), ningún `disabled` en JSX, y `aria-busy`/`aria-disabled` solo en `button.tsx`.

**Rojos esperados de 01d (lista exacta: los de C-13 y ninguno de C-9).** Ninguno de los archivos nuevos existe todavía:

| # | Archivo | Caso | Por qué | Se pone en verde cuando |
|---|---|---|---|---|
| 1 | `frontend/src/styles/clases-r1.ataque.test.ts` | "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 42 enEspera" | `expected [ …(40) ] to have a length of 42 but got 40`. Después fallarían también `formulario-tarea.tsx` y `acciones-de-la-tarea.tsx` (0 contra 1). Las rutas con `0` explícito pasan desde ya | Existen `formulario-tarea.tsx` y `acciones-de-la-tarea.tsx`, con un `enEspera=` cada uno, y en total hay 42 |
| 2 | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | "C-13 y A-5: los botones de borrar leen puedeBorrar del dato; nada decide por el rol, por `propio` ni por mis-comentarios" | `expected [ …(2) ] to deeply equal [ …(3) ]`: falta `acciones-de-la-tarea.tsx` | `acciones-de-la-tarea.tsx` lee `tarea.puedeBorrar` y nadie más lo lee |
| 3 | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | "§D-2C1: la perspectiva sale solo de perspectivaDeRuta; ninguna vista mira el prefijo de la ruta por su cuenta" | `expected [ …(2) ] to deeply equal [ …(3) ]`: falta `features/tareas/hooks.ts`. La exención nueva no cambia nada hoy | `features/tareas/hooks.ts` llama a `perspectivaDeRuta(` (`useRutaDeLaClase`) y nadie más |

C-9 no deja rojos: el caso reescrito de `rutas-02c-r1` pasa hoy.

**Corridas** (solo frontend, una a la vez):
- **lint:** `cd frontend; npm run lint`, código 0. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-01d-r0b.json > <scratchpad>/front-test-01d-r0b.txt 2>&1`, de 03:31:53Z a 03:33:19Z, código 1.
  - Pie: `Test Files  2 failed | 127 passed (129)` · `Tests  3 failed | 1873 passed (1876)` · `Duration  81.90s (transform 18.37s, setup 54.09s, import 159.48s, tests 362.26s, environment 257.49s)`.
  - La última línea es el error de npm por el código 1.
  - Los 3 rojos son exactamente los de la tabla, y no hay otros.

**Hashes nuevos:**
- `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` = `7DD3EE18FAEA65A04BA5EA5E7309FA63D9E3803A6B4B10A553610DA089F7455B` (antes `7EBF0E1F…A24C`).
- `frontend/src/styles/clases-r1.ataque.test.ts` = `3C970727558800454D30AA8D2E95E0BD0AE2EE10A239898A45F755F518B1C69D` (antes `8344C118…2C2D`).

#### Tabla de SHA-256 de las 151 `*.ataque` tras la complementaria de 01d (base de V-01 del programador de 01d; 3 cambiadas en la ronda 0 de 01d, marcadas)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | reescrita: C-9 (ronda 0 de 01d) |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7DD3EE18FAEA65A04BA5EA5E7309FA63D9E3803A6B4B10A553610DA089F7455B` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | reescrita: C-13, Enmienda 4 (complementaria de 01d) |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `3C970727558800454D30AA8D2E95E0BD0AE2EE10A239898A45F755F518B1C69D` | `frontend/src/styles/clases-r1.ataque.test.ts` | reescrita: C-13, Enmienda 4 (complementaria de 01d) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

### Complementaria 2: C-13 (5), V-07
**Origen.** El programador se detuvo por PA-20 en `styles/clases-r1` › "V-07". Ese caso espera 8 archivos con `vidrio-fuerte` y había 9: el noveno es `features/tareas/components/formulario-tarea.tsx`, por el control segmentado de entregas tardías (S-13, DESIGN §7.3, copia del de "Tipo de publicación"). El arquitecto lo fijó como punto 5 de C-13 (fila C-13 de §D-R0 e índice de la Enmienda 4).

**Comprobación propia con `grep`** (vidrio sin variante, `vidrio-fuerte` y `vidrio-azul`) sobre los archivos nuevos de 01d: `features/tareas/**`, `components/ui/native-select.tsx`, `lib/vencimiento.ts` y `features/clases/components/tarjeta-de-tarea.tsx`.
- El único es `formulario-tarea.tsx:352`: `className="vidrio-fuerte w-fit rounded-card p-1"`, el grupo del control segmentado.
- No hay ningún otro: **sin hallazgo** para la ronda 1 por este motivo.

**Diff:** `frontend/src/styles/clases-r1.ataque.test.ts` › "V-07: vidrio, vidrio fuerte y vidrio azul solo en la lista final del plan (igualdad exacta)".
- La lista de `vidrio-fuerte` pasa de 8 a 9 con `"/src/features/tareas/components/formulario-tarea.tsx"`, al final, en orden.
- Lleva un comentario que cita "C-13 (5), Enmienda 4", S-13 y DESIGN §7.3.
- No cambia nada más: la igualdad sigue exacta, y las listas de vidrio sin variante (4), `vidrio-azul` (1) y `data-material`/`data-densidad` (1) quedan igual. Ningún otro archivo nuevo puede usar vidrio.
- Formateé solo ese archivo, desde `frontend/`. `prettier --check` y `eslint` pasan.

**Corrida aislada:** con el código actual del programador en el árbol, `cd frontend; npx vitest run src/styles/clases-r1.ataque.test.ts` termina con código 0.
- Resultado: `Test Files  1 passed (1)` · `Tests  11 passed (11)`. V-06 (42 `enEspera=`) y V-07 pasan.
- Última línea: `Duration  5.57s (transform 2.40s, setup 395ms, import 3.05s, tests 146ms, environment 1.67s)`.
- No corrí la suite completa: el programador no corre nada hasta esta respuesta, y la suite la corre él al retomar (PA-08).

**Hash nuevo:** `frontend/src/styles/clases-r1.ataque.test.ts` = `292F6359683AD0D04859A52D5FAC11E20601B51C1B29E7EE0BE6788A51765C72` (antes `3C970727…C69D`). Es el único que cambia frente a la tabla de la complementaria de C-13.

#### Tabla de SHA-256 de las 151 `*.ataque` tras la complementaria 2 de 01d (base de V-01 del programador para retomar 01d)
Comando: `git ls-files` (versionadas y no versionadas) `| xargs sha256sum`, en mayúsculas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | reescrita: C-9 (ronda 0 de 01d) |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7DD3EE18FAEA65A04BA5EA5E7309FA63D9E3803A6B4B10A553610DA089F7455B` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | reescrita: C-13, Enmienda 4 (complementaria de 01d) |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `292F6359683AD0D04859A52D5FAC11E20601B51C1B29E7EE0BE6788A51765C72` | `frontend/src/styles/clases-r1.ataque.test.ts` | reescrita: C-13 y C-13 (5), Enmienda 4 (complementarias 1 y 2 de 01d) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01d — Ronda 1
Veredicto: **ROTO**. Hay 4 hallazgos: 1 de severidad media (T-06) y 3 bajos (T-07, T-08 y T-09). Ninguno es crítico ni alto.

Verificación propia (solo frontend; 01d no corre el backend, así que PA-01 y PA-07 no aplican):
- **Carga medida antes de correr:** CPU al 28 %, 17 GB libres y ninguna otra suite en curso.
- **lint:** `cd frontend; npm run lint` termina con código 0. Sus últimas líneas son `All matched files use Prettier code style!` y `> tsc -b`, sin errores.
- **test:** `cd frontend; npm test` da `Test Files  2 failed | 136 passed (138)` · `Tests  5 failed | 1979 passed (1984)` (125.85 s). Los 5 rojos son exactamente los de esta ronda. Fuera de ellos todo pasa, incluidas las pruebas del programador y las 151 `*.ataque` previas.
- **PA-09:** cada archivo nuevo se corrió aislado dos veces y dio el mismo resultado que en la corrida completa: los mismos 5 rojos y 17 verdes.

### Precondiciones y regresión
- **V-01:** las 151 `*.ataque` coinciden con la tabla de la "Complementaria 2" de la ronda 0. El `diff` normalizado contra esa tabla solo agrega las 2 nuevas de esta ronda.
- **Regresión:** antes de atacar, `npx vitest run ataque` dio `Test Files  75 passed (75)` · `Tests  1207 passed (1207)`.

### Hallazgos

#### T-06 — Los errores de la rúbrica siguen al índice de la fila, no a la fila
Severidad: media

Prueba: `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx`, caso "quitar la fila con error: el error no pasa a la fila que ocupa su lugar (que es válida)".

Reproducción:
1. Crear una tarea con dos criterios: el 1 sin texto y con 10 puntos; el 2 como "Ortografía" con 5 puntos.
2. Pulsar "Publicar tarea". El criterio 1 queda marcado ("Escribe el criterio", `aria-invalid="true"`).
3. Pulsar "Quitar criterio 1".

Esperado: la fila que queda ("Ortografía", válida) no tiene error.

Obtenido: "Ortografía" queda con `aria-invalid="true"` y con el mensaje del error de la fila que se quitó.

Causa: `editor-de-rubrica.tsx` lee los errores por posición (`rubrica.<índice>.criterio` y `rubrica.<índice>.puntosMax`). Las filas usan `criterio.llave` como identidad, y `FormularioTarea` no limpia ni reindexa `errores` al quitar o agregar filas.

Variante en el sentido contrario (caso "quitar una fila válida antes de la que tiene error…", en verde porque la aserción admite que el error desaparezca): si se quita una fila válida que está antes de la inválida, el error de la inválida se pierde sin que se haya corregido.

Requisito o regla violada: plan, "Formulario (`FormularioTarea`)": errores por campo con `ErrorDeCampo`. DESIGN §7.20, editor de rúbrica. El error marca un campo correcto.

Hermanos:
- "Puntos máximos" (`rubrica.N.puntosMax`) usa el mismo mecanismo y tiene el mismo defecto.
- También le aplica a un error de servidor con prefijo `rubrica.N.…`, si llegara.
- "Agregar criterio" no desplaza índices, así que no le aplica.
- Los adjuntos no tienen errores por índice, así que no les aplica.

#### T-07 — Una tarea con `tarea: null` se pinta como publicación común, con «Ver comentarios» y «Borrar publicación»
Severidad: baja

Prueba: `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx`, caso "un elemento de tipo tarea con tarea: null (forma que el esquema admite) no se pinta como publicación común…".

Esperado: no se ofrecen ni comentarios ni borrado desde el muro (S-08).

Obtenido: aparece el botón "Ver comentarios (0)", que el servidor responde con `404`. Con `puedeBorrar: true` aparece también "Borrar publicación", que el servidor responde con `404` (`borrarPublicacion` no encuentra tareas).

Causa: `publicacion-del-muro.tsx` solo usa `TarjetaDeTarea` cuando `tipo === "tarea" && tarea !== null`. En cualquier otro caso cae en `PublicacionComun`.

Por qué es baja: el backend lo impide con la instantánea de 01b, pero `publicacionSchema` de `shared/` admite la forma, y el respaldo es silencioso y contradice S-08. Es el mismo detalle que anotó el manager en la verificación del resumen. Aquí queda demostrado con una prueba.

Requisito o regla violada: S-08 y §D-10.

#### T-08 — Tras `404 CATEGORIA_NO_ENCONTRADA` o `404 TEMA_NO_ENCONTRADO`, la lista no se vuelve a pedir
Severidad: baja

Pruebas: `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx`, casos "un 404 de categoría se marca bajo su campo y la lista se vuelve a pedir…" y "un 404 de tema …".

Esperado: el error se marca bajo su campo, que ya ocurre, y `GET …/categorias` o `GET …/temas` se vuelve a pedir. Así el selector deja de ofrecer lo que ya no existe y muestra lo que exista ahora.

Obtenido: el mensaje "Esa categoría ya no existe. Elige otra." (o "Ese tema ya no existe.") sale bajo el campo, pero no hay segunda petición: `expected 1 to be greater than 1`. La opción borrada sigue en el selector y sigue seleccionada. Si se reenvía, el resultado es el mismo `404`.

Causa: `useCrearTarea` y `useEditarTarea` solo invalidan temas y categorías en `onSuccess`.

Requisito o regla violada: plan, tabla de códigos ("Esa categoría ya no existe. Elige otra."): el mensaje pide elegir otra mientras la interfaz sigue ofreciendo la misma. Plan, `hooks.ts`: invalidar temas y categorías.

Hermanos:
- `useEditarTarea` tiene el mismo `onError`.
- `CATEGORIA_REQUERIDA` (`409`, la clase ganó categorías después de cargar el formulario) tiene la misma causa: el selector sigue en "Sin categoría" y no ofrece las nuevas. No lo automaticé; lo cubre el mismo remedio.

#### T-09 — El foco cae en `<body>` si una recarga quita `puedeBorrar` mientras se confirma el borrado
Severidad: baja

Prueba: `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx`, caso "si una recarga del detalle quita puedeBorrar mientras se confirma, el foco no cae en <body>".

Reproducción:
1. Abrir el detalle con `puedeBorrar: true` y `puedeEditar: false`.
2. Pulsar "Borrar tarea". El foco va a "Cancelar", como debe.
3. Una recarga de la tarea (al volver a la ventana, o una invalidación) trae `puedeBorrar: false`.

Obtenido: `AccionesDeLaTarea` devuelve `null`, desaparece "Cancelar", que tenía el foco, y `document.activeElement` es `<body>`.

Causa: el efecto de foco de `acciones-de-la-tarea.tsx` solo reacciona a `confirmando`. No cubre el estado vecino en que la confirmación desaparece porque cambió el permiso.

Requisito o regla violada: DESIGN §7.14 (nunca `<body>`) y la regla de los estados vecinos del mismo mecanismo.

Hermanos:
- Con `puedeEditar: true` la confirmación también se desmonta, pero queda "Editar tarea". El foco se pierde igual, porque el botón enfocado desaparece y nada lo recoloca. No lo automaticé por separado.
- Mismo patrón en `EditarTareaView`: si una recarga cambia `puedeEditar` a `false` con el foco dentro del formulario, el formulario se sustituye por `MensajeError`. No lo automaticé.

### Atacado sin hallazgos
Estas pruebas son verdes en las dos corridas aisladas y en la completa.

**`tareas-01d-r1.ataque.test.tsx`:**
- **Fechas en cuatro zonas extremas** (`Pacific/Kiritimati` +14, `Pacific/Pago_Pago` −11, `America/Mexico_City`, `Asia/Kathmandu` +5:45):
  - `fechaLocalAIso` → `isoAFechaLocal` vuelve al mismo valor en medianoche, 23:59, fin de año y 1 de marzo;
  - con entrada vacía, solo espacios o inválida, las dos devuelven cadena vacía.
- **Fronteras del vencimiento:**
  - a 72 h −1 min es `proxima` (variante `warning`); a 72 h +1 min es `pendiente`; a −1 min es `vencida`;
  - todos los textos empiezan por "Vence" o "Venció", así que el estado nunca va solo en el color;
  - con una fecha inválida no aparece `Invalid`, `NaN` ni el texto crudo.
- **`cuerpoDeTarea` contra `crearTareaSchema`:**
  - `"100"` da 100, y la categoría y el tema vacíos dan `null`;
  - `1e3`, `-0`, `10,5`, vacío, `1001` y `0` dan error en `puntos` y en nada más;
  - con categorías en la clase y ninguna elegida sale "Elige la categoría de la tarea.".
- **Detalle en las tres perspectivas:**
  - "Editar tarea" apunta a `…/editar` de la propia perspectiva, en maestro y admin;
  - el estudiante no ve "Editar tarea" ni "Borrar tarea" aunque el servidor diga `true`, y ve "Tu trabajo";
  - las instrucciones con `<b>` y una URL salen como texto plano, sin HTML ni enlace;
  - la insignia "Tarea" lleva texto.
- **Doble clic humano (30 ms, precedente de `alumnos-b-r1`) en "Sí, borrar tarea":** sale un solo `DELETE`.
  - Nota: tres clics en el mismo instante sintético sí mandan tres `DELETE`, porque la guarda depende de `isPending` y no hay ref. El "Borrar publicación" del muro tiene el mismo patrón. No lo cuento como hallazgo, por el precedente.
- **Tope de la rúbrica (21 clics en "Agregar criterio"):**
  - quedan 20 filas;
  - el botón no está `disabled`;
  - sale la nota "La rúbrica puede tener hasta 20 criterios.";
  - el `POST` lleva los 20 criterios.
- **Maestro en `…/editar` con `puedeEditar: false`:** aparece "No puedes editar esta tarea.", no hay "Guardar cambios" y no sale ninguna petición que no sea `GET`.
- **Revisión estática de lo nuevo de 01d** (`features/tareas/**`, `native-select.tsx`, `vencimiento.ts`, `trabajoService.ts` y `tarjeta-de-tarea.tsx`):
  - sin `fetch(`, `console.`, `?? []`, `dangerouslySetInnerHTML`, `target="_blank"` ni emojis;
  - `features/tareas` y `features/clases` no se importan entre sí (también lo vigila ESLint).

**`tarjeta-01d-r1.ataque.test.tsx`, en las tres perspectivas:**
- el título enlaza a `<base de la perspectiva>/<claseId>/tareas/<id>`;
- la insignia dice "Tarea", el vencimiento va en texto ("Venció el …") y los puntos se muestran;
- no hay comentarios ni borrado aunque `puedeBorrar` sea `true`;
- no sale ninguna petición.

**Ya cubierto por otras pruebas, revisado sin caso nuevo:**
- El estudiante en `…/nueva` o `…/editar` cae en `*` → `/login`, y "Crear tarea" solo se muestra a maestro y admin. Lo cubren `rutas-02c-r1` (reescrita en la ronda 0, C-9) y las pruebas del programador.
- Lo cubren `native-select.test.tsx` y `styles/clases-r1` (V-06 y V-07):
  - el `NativeSelect`: etiqueta asociada, `aria-invalid`, tokens y altura;
  - el `enEspera` del formulario.

### No atacado y por qué
- **360 px, el contexto opaco del admin (H-6) y la lectura real con lector de pantalla:** necesitan navegador. Quedan como no verificados y los decide el humano.
- **La nota del tope sin `aria-describedby`:** el plan no lo exige, porque el botón sigue tabulable y sin `disabled`. Lo dejo como lo anotó el manager.

### Archivos y conteos
`npx vitest list 01d-r1`:
- `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx`: 18 casos.
- `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx`: 4 casos.
- Total: 22 casos (5 en rojo, que son los hallazgos, y 17 en verde).

### Tabla de SHA-256 de las 153 `*.ataque` al cierre de la ronda 1 de 01d
151 sin cambio respecto de la ronda 0 de 01d y 2 nuevas, marcadas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7DD3EE18FAEA65A04BA5EA5E7309FA63D9E3803A6B4B10A553610DA089F7455B` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` | nueva (ronda 1 de 01d) |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `BF79214DDDFA5DDE868A71252B2DFC6C6F11D854EF906E136259F9452AD9E0FF` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | nueva (ronda 1 de 01d) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `292F6359683AD0D04859A52D5FAC11E20601B51C1B29E7EE0BE6788A51765C72` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01d — Ronda 2
Veredicto: **ROTO**. 5 hallazgos, todos de severidad baja (T-10 a T-14). Ninguno es crítico, alto ni medio.

Los remedios de T-06 a T-09 y de M-01 resisten en lo que corrigieron. Los hallazgos son bordes y estados vecinos de esos mismos mecanismos.

Verificación propia (solo frontend; 01d no corre el backend):
- **Carga antes de correr:** CPU al 31 % y 28 % (lecturas con 10 s de separación), 17.2 GB libres, ninguna otra suite en curso.
- **lint:** `cd frontend; npm run lint` termina con código 0. Las últimas líneas son `> @campus/frontend@0.0.0 typecheck` y `> tsc -b`, sin errores.
- **test:** `cd frontend; npm test` da `Test Files  1 failed | 139 passed (140)` · `Tests  8 failed | 2033 passed (2041)` (86.28 s, sin tiempos agotados).
  - Los 8 rojos son exactamente los de esta ronda.
  - Todo lo demás pasa: las pruebas del programador, las 153 `*.ataque` previas y mis 22 casos de la ronda 1.
- **PA-09:** cada archivo nuevo se corrió aislado dos veces. Las dos corridas dieron lo mismo que la completa: los mismos 8 rojos y 15 verdes.

### Precondiciones y regresión
- **V-01:** las 153 `*.ataque` coinciden con la tabla de la ronda 1 de 01d (`diff` normalizado vacío). El cierre solo agrega las 2 nuevas de esta ronda.
- **Regresión:** `npx vitest run 01d-r1` da `Tests  22 passed (22)`. Los 5 rojos de la ronda 1 pasan.
- **StrictMode:** el aviso duplicado al montar con el error en caché solo existe en desarrollo, así que no es un hallazgo.
  - `main.tsx` monta `StrictMode`, que solo duplica los efectos en desarrollo.
  - Lo que sí pasa en producción es T-12, que se reproduce sin `StrictMode`.

### Hallazgos

#### T-10 — Un error del servidor por una fila de la rúbrica que se quitó con el envío en vuelo se pierde en silencio
Severidad: baja

Prueba: `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx`, caso "un error del servidor por una fila que se quitó mientras el envío estaba en vuelo no se pierde en silencio (ni campo ni aviso)".

Reproducción:
1. Crear una tarea con dos criterios válidos y pulsar "Publicar tarea", con el `POST` en vuelo.
2. Pulsar "Quitar criterio 2". El editor de rúbrica no se bloquea durante el envío.
3. El servidor responde `400 VALIDACION` con el mensaje "rubrica.1.criterio: El criterio no es válido.".

Esperado: el error se ve en algún lado, en un campo, en la rúbrica entera o en un aviso.

Obtenido: no se ve en ningún lado (`{ enPantalla: false, avisado: false }`). El botón deja de esperar y la persona no sabe por qué no se publicó.

Causa:
- `erroresConLlavesDeFila` traduce la posición 1 a la llave de la fila enviada, y esa fila ya no está en pantalla. `EditorDeRubrica` solo lee las llaves de las filas actuales.
- `useCrearTarea` no avisa, porque `erroresDeLaTareaDeApi` devolvió un error de campo.
- El remedio de T-06 cubre la posición que no existe en el envío, pero no cubre la llave que ya no existe en pantalla.

Requisito o regla violada: plan, "Formulario (`FormularioTarea`)", que pide los errores del servidor bajo su campo y los demás en un aviso. Aquí el error no sale por ninguno de los dos caminos.

Hermanos:
- "Puntos máximos" (`rubrica.N.puntosMax`): el mismo camino, aplica.
- `useEditarTarea`: el mismo `onError` y el mismo formulario, aplica.
- Los errores del cliente: no aplica, porque se calculan con las filas del momento.

#### T-11 — Un 404 o 403 al borrar o al guardar no vuelve a pedir la tarea (hermanos de T-08)
Severidad: baja

Pruebas: `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx`, cuatro casos:
- "detalle: un DELETE que responde 404 TAREA_NO_ENCONTRADA vuelve a pedir la tarea…";
- "… 403 BORRADO_NO_PERMITIDO …";
- "edición: un PUT que responde 404 TAREA_NO_ENCONTRADA vuelve a pedir la tarea…";
- "… 403 EDICION_NO_PERMITIDA …".

Esperado: tras el aviso, `GET …/tareas/:tareaId` se vuelve a pedir. Así el detalle pasa a "Esa tarea ya no existe." o deja de ofrecer "Borrar tarea", y la edición pasa a "No puedes editar esta tarea.".

Obtenido: no hay segunda petición (`expected 1 to be greater than 1`).
- El detalle sigue mostrando la tarea borrada, con "Sí, borrar tarea" activo, mientras el aviso dice que ya no existe.
- La edición sigue ofreciendo "Guardar cambios" con el mismo `403` en cada intento.

Causa:
- `useBorrarTarea.onError` solo avisa.
- `useEditarTarea.onError` solo llama a `pedirDeNuevoLasOpciones`, que no incluye los códigos de la tarea en `OPCIONES_QUE_CAMBIARON_POR_CODIGO`.

Requisito o regla violada: es el mismo mecanismo de T-08 (un código que dice que lo que la caché ofrece ya no es cierto) aplicado a la otra consulta de la misma vista. También viola la regla de hermanos.

#### T-12 — Abrir otra vista con el error en caché vuelve a avisar de un fallo que ya se avisó
Severidad: baja

Prueba: `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx`, caso "un fallo de recarga en el detalle avisa una vez; abrir «Editar tarea» con ese error en caché no vuelve a avisar de un fallo que no ocurrió (sin StrictMode)".

Reproducción:
1. En el detalle, una recarga falla con un `500`. Sale el aviso "No pudimos actualizar la tarea. Mostramos la última versión que tenemos.", que es correcto.
2. Pulsar "Editar tarea". Todas las respuestas posteriores son exitosas.

Obtenido: sale un segundo aviso, "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión.", sin un fallo nuevo.

Causa: `useAvisoDeRecargaFallida` dispara en el montaje cuando la consulta compartida ya está en `isError` con datos.

Requisito o regla violada: el contrato del propio remedio, "un aviso por cada fallo" (resumen de M-01). Es el detalle menor que anotó el manager, demostrado aquí en producción, sin `StrictMode`.

Hermanos:
- Volver de la edición al detalle con el error todavía en caché tiene la misma causa. No lo automaticé.
- El aviso doble por `StrictMode` es el mismo efecto, pero solo en desarrollo.

#### T-13 — Un 403 de acceso en la recarga se anuncia como problema de conexión y deja el formulario ofreciendo guardar
Severidad: baja

Prueba: `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx`, caso "edición: un 403 SIN_ACCESO_A_LA_CLASE en la recarga dice que ya no hay acceso, no que revise su conexión".

Esperado: la persona se entera de que ya no tiene acceso a la clase ("No tienes acceso a esta clase."), por un aviso o en la vista.

Obtenido:
- El único aviso es "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión.".
- El formulario sigue ofreciendo "Guardar cambios", que solo puede terminar en otro `403`.

Causa: `errorQueReemplazaLaVista` solo reemplaza la vista con `TAREA_NO_ENCONTRADA`. Cualquier otro error con caché usa el mismo texto fijo, que habla de la conexión.

Requisito o regla violada: plan, tabla de códigos (`SIN_ACCESO_A_LA_CLASE` → "No tienes acceso a esta clase."). El aviso inventa una causa que no es. Es el detalle menor del manager sobre "revisa tu conexión", en su caso más claro.

Hermanos:
- Un `5xx` recibe el mismo texto, que tampoco encaja (el detalle menor del manager).
- `VALIDACION` con prefijo `claseId:` o `tareaId:`: el mismo camino.
- El detalle del estudiante o del maestro que sale de la clase: el mismo camino, con el texto "Mostramos la última versión que tenemos.".
- `ACCESO_RESTRINGIDO` no aplica, porque lo redirige `apiClient`.

#### T-14 — Quien soltó el foco con un clic en blanco dentro de la vista lo recibe de vuelta en la raíz con cualquier recarga
Severidad: baja

Prueba: `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx`, caso "quien soltó el foco con un clic en blanco dentro de la vista no lo recupera cuando llega una recarga sin cambios".

Reproducción:
1. El foco está en "Borrar tarea".
2. Un clic en el texto de las instrucciones (dentro de la vista) lo suelta, y el foco queda en `<body>`.
3. Llega una recarga sin cambios. "Borrar tarea" sigue montado y ningún control desapareció.

Obtenido: el foco va al contenedor de la vista (`<div tabindex="-1">`).

Causa: `useFocoAlPerderseElControl` solo olvida que el foco estaba dentro con un `mousedown` fuera del contenedor. No usa el criterio que fijaron los ganchos de CLASES: `focusout` sin `relatedTarget`, con el control todavía conectado y la ventana con el foco (`useFilaEnFoco` en `features/clases/hooks.ts` y `useFocoDeLaLista` en `components/layout/hooks.ts`). La clave del detalle cambia con cada `dataUpdatedAt`, así que cualquier recarga exitosa lo dispara.

Requisito o regla violada: DESIGN §7.20, "Foco cuando una recarga quita el control enfocado", que dice que solo se recoloca cuando el control se perdió. También el estado vecino "`focusout` sin destino" de la regla de hermanos (CLASES-02).

Hermanos:
- La edición tiene el mismo gancho, pero su clave solo cambia con `status` y `puedeEditar`. Le aplica cuando cambia el estado de la consulta, no en cada recarga.
- Tabular fuera de la ventana no se ve afectado.

### Atacado sin hallazgos
Todo está en verde en las dos corridas aisladas y en la completa.

**`tareas-01d-r2.ataque.test.tsx`:**
- **T-06, errores en tres filas a la vez con quitar y agregar en secuencia:**
  - el error de cada fila sigue a su fila;
  - "Puntos máximos" no recibe el error de "Criterio";
  - la fila nueva nace limpia;
  - al quitar la primera, la inválida sube con su error y el valor se conserva.
- **T-06, `rubrica.7` con dos filas:** se muestra como error de la rúbrica entera, sin marcar ninguna fila y sin aviso.
- **`erroresConLlavesDeFila`:**
  - `01` apunta a la fila 1;
  - `-1` y un campo que no es de la rúbrica pasan tal cual;
  - los campos que no son de la rúbrica no cambian.
- **T-08, lista nueva vacía tras un 404 de categoría:**
  - el selector solo ofrece "Sin categoría" y queda en `""`;
  - el reenvío va con `categoriaId: null` y se publica.
- **M-01, fallo seguido de una recarga exitosa que de verdad llega (edición):**
  - la caché tiene "Ensayo v2";
  - lo escrito ("Mío") y el foco se conservan;
  - hay un solo aviso, y un fallo posterior avisa otra vez (2).
- **`errorQueReemplazaLaVista`:** sin tarea da `true`; con un 404 da `true`; con un 500 da `false`; con un `Error` común da `false`; con `null` da `false`.
- **T-09, foco en "Borrar tarea":** una recarga sin cambios no mueve el foco, y una que quita el botón no lo deja en `<body>`.
- **Revisión estática final de 01d** (`features/tareas/**`, `native-select.tsx`, `vencimiento.ts`, `trabajoService.ts`, `tarjeta-de-tarea.tsx` y `publicacion-del-muro.tsx`):
  - sin `disabled` en JSX;
  - sin clases de las escalas anuladas ni de la paleta de Tailwind;
  - sin valores arbitrarios en px, rem, % o color;
  - sin importaciones de `@/features/` (también lo vigila ESLint).
  - Los `grep` de `?? []`, `fetch(`, `console.` y `style={` también salen vacíos. El único corchete es el selector `in-data-[material=opaco]`.

**`tarjeta-01d-r2.ataque.test.tsx`, en las tres perspectivas:**
- con `tarea: null` dice "Fecha límite no disponible", conserva su enlace y no tiene botones;
- cuando una recarga trae el resumen, el mismo enlace (el mismo nodo) muestra el vencimiento en texto y los puntos;
- no sale ninguna petición.

### No atacado y por qué
- **El error que llega dos veces seguidas y la opción borrada que vuelve a existir (T-08):** no les hice caso.
  - Una categoría borrada no puede volver con el mismo id.
  - Dos 404 seguidos solo invalidan dos veces, y la derivación del campo no depende del número de errores.
- **El cambio de pestaña con el foco en una acción:** los proveedores apagan `refetchOnWindowFocus`, así que no hay recarga que lo provoque al volver.
- **El 404 con el formulario a medio escribir:** por decisión del manager (M-01), la vista se reemplaza y el foco va a la raíz. Lo cubre el caso del programador; no lo ataqué como hallazgo.
- **Cambiar de `tareaId` dentro de `…/editar` sin desmontar:** en la interfaz no hay un camino que lo produzca.
  - El formulario se inicializa una sola vez y no lleva `key`, así que guardaría lo de A sobre B.
  - Solo pasaría con dos entradas de historial `…/A/editar` y `…/B/editar` contiguas. Queda anotado, no probado.
- **360 px, el contexto opaco del admin y el lector de pantalla:** necesitan navegador. Quedan como no verificados y los decide el humano.

### Archivos y conteos
`npx vitest list 01d-r2`:
- `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx`: 20 casos.
- `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx`: 3 casos.
- Total: 23 casos, 8 en rojo (los hallazgos) y 15 en verde.

### Tabla de SHA-256 de las 155 `*.ataque` al cierre de la ronda 2 de 01d
153 sin cambio respecto de la ronda 1 de 01d y 2 nuevas, marcadas.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7DD3EE18FAEA65A04BA5EA5E7309FA63D9E3803A6B4B10A553610DA089F7455B` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` | nueva (ronda 2 de 01d) |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `BF79214DDDFA5DDE868A71252B2DFC6C6F11D854EF906E136259F9452AD9E0FF` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `F9082B05A42410D1F24620B6EEA4F45A731E7A42A8899863E1FCD0EFEDEDFFFC` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | nueva (ronda 2 de 01d) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `292F6359683AD0D04859A52D5FAC11E20601B51C1B29E7EE0BE6788A51765C72` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01d — Ronda 3
Veredicto: **ROTO**. Hay 1 hallazgo de severidad baja, T-15. Es la última ronda del tope, así que se escala al humano.

Los remedios de T-10 a T-14 resisten todos los bordes que ataqué. El hallazgo es un estado vecino del mecanismo de foco de T-09 y T-14, que solo ocurre en la edición: dos fallos seguidos de distinto tipo.

Verificación propia (solo frontend; 01d no corre el backend):
- **Carga antes de correr:** CPU al 15 % y 9 % (con 10 s de separación), 17.5 GB libres, ninguna otra suite en curso.
- **lint:** `cd frontend; npm run lint` termina con código 0. La última línea es `> tsc -b`, sin errores.
- **test:** `cd frontend; npm test` da `Test Files  1 failed | 140 passed (141)` · `Tests  2 failed | 2122 passed (2124)` (87.09 s, sin tiempos agotados).
  - Los 2 rojos son los de esta ronda (T-15).
  - Todo lo demás pasa, incluidas las 155 `*.ataque` previas.
- **PA-09:** el archivo nuevo, aislado en dos corridas, dio lo mismo que en la completa: 2 rojos y 20 verdes.

### Precondiciones y regresión
- **V-01:** las 155 `*.ataque` coinciden con la tabla de la ronda 2 de 01d. El `diff` normalizado solo agrega la nueva de esta ronda.
- **Regresión:** `npx vitest run 01d-r1 01d-r2` da `Test Files  4 passed (4)` · `Tests  45 passed (45)`. Pasan los 45 casos de mis rondas 1 y 2.
- **Antes de atacar leí los 61 casos nuevos del programador,** para no repetirlos.

### Hallazgos

#### T-15 — Edición: si un fallo que conserva el formulario va seguido de uno que lo reemplaza, el foco cae en `<body>`
Severidad: baja

Pruebas: `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx`, los dos casos "edición: un 500 conserva el formulario con el foco en «Título»; si la siguiente recarga da 404 TAREA_NO_ENCONTRADA y reemplaza el formulario, el foco no cae en <body>" y "… 403 SIN_ACCESO_A_LA_CLASE …".

Reproducción:
1. Edición abierta, con el foco en "Título".
2. Una recarga da `500`. El formulario se conserva y el foco sigue en "Título", como debe.
3. La recarga siguiente, unos milisegundos después, da `404 TAREA_NO_ENCONTRADA` o `403 SIN_ACCESO_A_LA_CLASE`. El formulario se reemplaza por "Esa tarea ya no existe." o por "No tienes acceso a esta clase.".

Obtenido: `document.activeElement` es `<body>`.

Causa:
- La clave de `useFocoAlPerderseElControl` en `editar-tarea-view.tsx` es `[tareaId, status, puedeEditar]`.
- Entre el primer fallo y el segundo no cambia: `status` sigue en `error` y `puedeEditar` sale de los datos en caché.
- El efecto que recoloca el foco no corre, aunque el control enfocado salió del documento.
- El detalle no tiene el defecto, porque su clave incluye `errorUpdatedAt`. Su caso, "detalle: un 500 conserva el detalle con el foco en «Borrar tarea»; si la siguiente recarga da 403 SIN_ACCESO_A_LA_CLASE…", está en verde.

Requisito o regla violada: DESIGN §7.14 y §7.20 (nunca `<body>`) y el estado vecino "dos fallos seguidos" de la regla de hermanos (CLASES-02).

Hermanos:
- Cualquier fallo que conserva la vista seguido de cualquiera que la reemplaza, en la edición: aplica el mismo defecto. Los que conservan la vista son `500`, `429`, la red caída, `SIN_CONEXION` y un `VALIDACION` de otro campo. Los que la reemplazan son `TAREA_NO_ENCONTRADA`, `SIN_ACCESO_A_LA_CLASE` y un `VALIDACION` de `claseId:` o `tareaId:`.
- El detalle no tiene el defecto: su clave lleva `errorUpdatedAt`.
- Dos fallos en el mismo milisegundo no ocurren en un navegador, pero en jsdom sí: también dejarían la misma clave en el detalle. Las pruebas meten una pausa de 5 ms entre recargas para reproducir lo que pasa en un navegador.
- Después de un `PUT` que falla y renueva la tarea (T-11), el camino es el mismo si la recarga anterior ya había fallado.

### Atacado sin hallazgos
Todo está en `tareas-01d-r3.ataque.test.tsx`, en verde en las dos corridas aisladas y en la completa.

- **T-13, cada código en la primera carga frente a la recarga (14 casos):** los códigos son 404, `SIN_ACCESO_A_LA_CLASE`, `VALIDACION` de `tareaId`, `VALIDACION` de `claseId`, `VALIDACION` de un campo normal (`titulo:`), 500 y 429.
  - En la primera carga, siempre: un `role="alert"`, sin detalle ni acciones y sin el aviso de recarga.
  - En la recarga, los cuatro que reemplazan quitan el detalle sin aviso. Los otros tres, incluido el `VALIDACION` con prefijo de campo normal, conservan el detalle y avisan exactamente una vez.
- **T-13 y T-14 en el detalle:** un 500 conserva el detalle con el foco. Si después llega `SIN_ACCESO_A_LA_CLASE`, el foco no cae en `<body>`.
- **T-12, la consulta desmontada e invalidada:**
  - fallo avisado; salir de la tarea; invalidar sin vista montada; volver;
  - si la recarga al volver acierta, hay 1 aviso en total; si vuelve a fallar, 2;
  - la marca del `WeakMap` sobrevive al desmontaje y no tapa un fallo nuevo.
- **T-14, el foco que sale a un `iframe` fuera de la vista:** una recarga que quita "Borrar tarea" no le roba el foco al `iframe`.
- **Adjuntos con la publicación en vuelo** ("Puntos de ataque → 01d", punto 1), con la subida al almacén retenida:
  - "Quitar a.pdf" no cambia lo que se envía;
  - un segundo "Publicar tarea" no duplica nada;
  - se piden un solo archivo y un solo `POST`, con `archivoIds` igual a su id.
- **Revisión estática de tipos:** en `features/tareas`, fuera de `types.ts` no hay declaraciones de tipos, salvo las interfaces `…Props` de los componentes. Confirma la corrección de M-01.
- **Revisión estática final de 01d** (con los `grep` y las pruebas estáticas de las rondas 1 y 2, que siguen en verde):
  - sin `disabled` en JSX;
  - sin escalas anuladas ni paleta de Tailwind;
  - sin valores arbitrarios;
  - sin `?? []`, `fetch(`, `console.`, `style={` ni `dangerouslySetInnerHTML`;
  - sin importaciones entre módulos de `features/`;
  - sin `any`.

**Bordes que pidió el coordinador y no ataqué con un caso nuevo, con su razón:**
- **T-10, el error de una fila quitada junto con otro de una fila viva en la misma respuesta:** no puede ocurrir con el servidor. `erroresDeLaTareaDeApi` devuelve un solo campo por respuesta (un `VALIDACION` lleva un solo prefijo), y los errores del cliente se calculan con las filas del momento. La combinación de error de rúbrica entera más fila viva ya la fija el unitario del programador "PR-1D02: el error de una fila que ya no está pasa a la rúbrica entera y el de una que sigue se conserva".
- **T-11, la respuesta de la recarga antes o después del toast:** el toast sale de forma síncrona en `onError` justo después de lanzar la invalidación. El orden no cambia lo que se ve: la vista reacciona a la respuesta, y lo cubren los casos del programador con 404, 403 y 500.
- **T-11, el 404 mientras la rúbrica se edita:** es el caso del programador "PR-1D04: un 404 al guardar vuelve a pedir la tarea; el formulario a medio escribir se reemplaza…". Que se pierda lo escrito lo decidió el manager (M-01).
- **T-12, dos fallos en el mismo milisegundo:** lo cubren los casos del programador de "dos fallos seguidos", con respuestas instantáneas.
- **T-14, cuando el foco pasa a otro control de la vista (`focusin` dentro y `focusout` con destino dentro) y desaparece el primero:** es el caso del programador "PR-1D05: pasar el foco a otro control de la vista y quitar el primero no mueve el foco".
- **T-14, un control que desaparece con la ventana sin foco:** son los casos de cambio de pestaña de PR-1D04 y PR-1D05.
- **T-14, `activeElement` nulo:** jsdom no lo produce. Por código, el gancho trata `null` igual que `<body>` (`activo !== null && …`).

### No atacado y por qué
- **360 px (incluidos los nombres de adjuntos largos del punto 2), el contexto opaco del admin y el lector de pantalla:** necesitan navegador. Quedan como no verificados y los decide el humano.
- **El criterio de ventana con `document.activeElement` frente a `hasFocus()` en un navegador real:** el manager ya lo arbitró y lo anotó para el `chore` de accesibilidad. Sin navegador no lo puedo verificar.

### Archivos y conteos
`npx vitest list 01d-r3`: `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx`, 22 casos (2 en rojo, que son T-15, y 20 en verde).

Mis `*.ataque` de 01d en total: 45 de las rondas 1 y 2 más 22 de esta, 67 casos en 5 archivos.

### Tabla de SHA-256 de las 156 `*.ataque` al cierre de la ronda 3 de 01d
155 sin cambio respecto de la ronda 2 de 01d y 1 nueva, marcada.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7DD3EE18FAEA65A04BA5EA5E7309FA63D9E3803A6B4B10A553610DA089F7455B` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `BF79214DDDFA5DDE868A71252B2DFC6C6F11D854EF906E136259F9452AD9E0FF` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `F9082B05A42410D1F24620B6EEA4F45A731E7A42A8899863E1FCD0EFEDEDFFFC` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `4C0DFDD8AEA100786556F0B2F01F438F7135E786C898547B19930291B3927C0E` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | nueva (ronda 3 de 01d) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `292F6359683AD0D04859A52D5FAC11E20601B51C1B29E7EE0BE6788A51765C72` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## TAREAS-01d — Ronda 4 (cerrada, T-15)
Veredicto: **RESISTE**. T-15 está corregido y no hay hallazgos nuevos.

Es una ronda cerrada que autorizó el humano: solo confirma T-15 y no ataca nada fuera de la clave de foco común. La tabla de abajo es la base de V-01 para el cierre de 01d y para la ronda 0 de 01e.

Verificación propia (solo frontend):
- **Carga antes de correr:** CPU al 2 %, 18.6 GB libres, ninguna otra suite en curso.
- **lint:** `cd frontend; npm run lint` termina con código 0. La última línea es `> tsc -b`, sin errores.
- **test:** `cd frontend; npm test` da `Test Files  142 passed (142)` · `Tests  2142 passed (2142)` (79.81 s, sin tiempos agotados).

### Regresión
- **V-01:** antes de crear el archivo nuevo, las 156 `*.ataque` coincidieron con la tabla de la ronda 3 de 01d (`diff` normalizado vacío).
- **Mis 67 casos de 01d en verde.** `npx vitest run 01d-r1 01d-r2 01d-r3` da `Test Files  5 passed (5)` · `Tests  67 passed (67)`. Incluye los dos casos de T-15 de `tareas-01d-r3.ataque.test.tsx`.
- **Las 156 `*.ataque` en verde,** dentro de la corrida completa.

### T-15: confirmado
- `claveDeFocoDeLaTarea` arma `tareaId:status:dataUpdatedAt:errorUpdatedAt:errorUpdateCount`.
- Es la única clave de `useFocoAlPerderseElControl` en `editar-tarea-view.tsx` y en `detalle-tarea-view.tsx`.
- Los dos rojos de la ronda 3 pasan.

### Casos nuevos (solo sobre la clave de foco común)
Archivo: `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx`, 2 casos, verdes en dos corridas aisladas y en la completa.
- **"la clave es la misma para dos momentos iguales (objetos distintos) y cambia con cada uno de sus cinco componentes":**
  - la clave es estable entre dos renders sin cambio de la consulta, así que el foco no salta;
  - cambia con `tareaId`, `status`, `dataUpdatedAt`, `errorUpdatedAt` y `errorUpdateCount`.
- **"edición: escribir en «Título» (renders sin cambio de la consulta) no mueve el foco; éxito → 500 → 404 lleva el foco a la raíz, no a <body>":**
  - con tres cambios de texto, el foco sigue en "Título";
  - la recarga exitosa conserva lo escrito y el foco;
  - el 500 conserva el foco;
  - el 404 reemplaza el formulario por "Esa tarea ya no existe." sin dejar el foco en `<body>`.

El caso del detalle con dos fallos en el mismo milisegundo no lo repetí: ya lo cubre "PR-1D05: con los dos fallos en el mismo milisegundo (500 y luego 403 SIN_ACCESO_A_LA_CLASE), el foco va a la raíz y no a <body>".

### Tabla de SHA-256 de las 157 `*.ataque` al cierre de la ronda 4 de 01d (base de V-01 del cierre de 01d y de la ronda 0 de 01e)
156 sin cambio respecto de la ronda 3 de 01d y 1 nueva, marcada.

| SHA-256 | Archivo | Cambio |
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
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2292DD1D4CF039FBA0B43E9376DA101A97422AE6CC44020895D64E5E157977BD` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `DD46C90B7A5DD6F311AA7E4D08A53126B804F1DB06F69E53915125268980C00F` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `B104D388325E921E1847DE34353CA53A7D9E7BFF58A9C5208CFE3D447C8D33B9` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `7DD3EE18FAEA65A04BA5EA5E7309FA63D9E3803A6B4B10A553610DA089F7455B` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `6728168DD95F9D551AEAEA9AABAF08111114C82F3842F2D0C74F485BED210433` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `5EC19B161C50FDF74D53A3AEAF220807A2789A444A75DDA9FB8B11C015280D17` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `BF79214DDDFA5DDE868A71252B2DFC6C6F11D854EF906E136259F9452AD9E0FF` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `F9082B05A42410D1F24620B6EEA4F45A731E7A42A8899863E1FCD0EFEDEDFFFC` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `4C0DFDD8AEA100786556F0B2F01F438F7135E786C898547B19930291B3927C0E` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `13E93A4A2D1AF150C196FC28F769635E6512D4544E2BEF795BC228A7D0D7C90D` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | nueva (ronda 4 de 01d) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `292F6359683AD0D04859A52D5FAC11E20601B51C1B29E7EE0BE6788A51765C72` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |
