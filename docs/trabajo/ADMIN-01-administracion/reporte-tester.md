# Reporte del Tester — ADMIN-01 · administración, ampliado

> **Nota de transcripción (orquestador, 2026-11-04).** El arnés rechazó la escritura del reporte por el tester en la ronda 0 de 01a; solo quedó en el archivo la tabla de SHA-256 (249 filas, SHA-256 `81f9f5dc8c402fc0e86622ad655094bbb0025265e3622530603bc720667a29ca`). Por la regla de transcripción con cotejo (`AGENTS.md`), el orquestador antepone tal cual el texto que entregó el tester, sin cambiar contenido. Cotejo: `git diff --name-only 8d98fba -- backend frontend shared` da solo los dos archivos de C-1 y C-2, con los SHA-256 que el texto declara. SHA-256 del archivo resultante en `aprobacion.md`.

## Ronda 0 — 01a

Veredicto: **LISTA PARA EL PROGRAMADOR** (sin PARADA). C-1 y C-2 quedan aplicados y en rojo por la razón esperada. Ninguna otra `*.ataque` del backend ni del frontend se rompe por el diseño de 01a. Hay tres observaciones (O-1 a O-3): O-1 y O-2 son trampas de implementación que el programador debe evitar en 01a, y O-3 afecta a 01e.

Plan: `plan.md`, SHA-256 `7dbe0191a6555b807441a185400e26a4870ad4791a500f70f6d886e568670bb7` (comprobado al empezar), Enmiendas 1 a 3. Base: `8d98fba` (rama `feat/admin-01`; `git diff --name-only 8d98fba -- backend frontend shared` solo lista los dos archivos de C-1 y C-2).

Verificación propia: lint del backend en verde (`cd backend; npm run lint`, que corre antes `shared:build` y `prisma generate` por `prelint`: R-17 cumplida). Su última línea es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, sin errores, y antes salió `All matched files use Prettier code style!`. Test: solo los dos archivos de C-1 y C-2 (abajo), como pide la ronda 0. No corrí la suite completa del backend ni la del frontend.

### Entorno (PA-01)
- Red activa: `IZZI-F281-5G`, perfil Público. Es la red de la casa, declarada de confianza en ESTADO §5, no `uacam5 2`. La regla del firewall "Campus: bloquear entrada a Docker en redes publicas" existe y está habilitada (Inbound, Block, perfil Public).
- Docker: motor 28.5.1, encendido.
- Carga antes de la corrida: CPU al 11 % y al 4 % en dos lecturas, con 16.7 GB libres.
- Una sola suite a la vez.

### Cambios (solo C-1 y C-2)

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-1 | `backend/test/sesiones-y-cadena.ataque.test.ts` | (1) **E-30:** el comentario de la línea 87 ("Fuera de /api (la guarda no aplica)…"), que dejó de ser cierto con M-15 de CHORE-02, pasa a decir que la guarda revisa toda ruta y que esas rutas de prueba arrancan porque pasan por `protegido()`. (2) Inventario de rutas (`:553`): se agregan exactamente `POST /api/admin/clases/:claseId/archivar`, `POST /api/admin/clases/:claseId/restaurar`, `GET /api/clases/anteriores` y `HEAD /api/clases/anteriores` (4 entradas, en su lugar del orden de `sort()`: 121 entradas, ordenadas y sin repetir, comprobado con `node`), más el comentario de C-1 y "ADMIN-01a" en el título. Lo que protege no cambia: ninguna ruta crea administradores, solo las tres de siempre crean maestros y cualquier otra ruta nueva vuelve a poner la prueba en rojo | `78680f5e046af46ed8e1b403dd5c2e81a1492eb1aa99e132fb26e4e6d92f0446` → `d1673261a3f4467da10cb07deae3b8fad93a6f233caea8370d61d4fbdc45f29b` |
| C-2 | `backend/test/lecturas-fx-r1.ataque.test.ts` | `:805-825`: la lista de usos de `instantaneaUnica: true` suma `"adapters/db/clases-archivadas.ts:1"` (`listarClasesAnteriores`; archivar y restaurar son escrituras y no la usan), en su lugar del orden (`clases-` antes de `clases.`), con su comentario. El título del caso pasa de "diecinueve" a "veinte lecturas (… una de clases archivadas …)", como hizo el C-2 de CALIFICACIONES-02a (`57192e2`). Lo demás que protege no cambia | `849134d1af25c6f4bae7225030dc123421d770cc253237ee8ec47b9fdc948529` → `7a73655168d44a449a8c9bebd5a941b2b8f16deca5ad8d55bdc11772b9133439` |

Nada más en esas dos pruebas ni en ninguna otra. No toqué código de producción ni pruebas normales.

### Corrida de C-1 y C-2 (rojo esperado)

Comando (desde `backend/`): `npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts`

```
 Test Files  2 failed (2)
      Tests  2 failed | 57 passed (59)
   Start at  16:02:04
   Duration  34.42s (transform 2.43s, setup 90ms, import 7.42s, tests 20.27s, environment 0ms)
```

- `sesiones-y-cadena.ataque.test.ts` › "bajo /api solo existen las rutas de … CALIFICACIONES-02a y ADMIN-01a…": `expected [ …(117) ] to deeply equal [ …(121) ]`. El diff solo marca como faltantes las cuatro entradas nuevas (`GET` y `HEAD /api/clases/anteriores`, `POST …/archivar` y `POST …/restaurar`) y ninguna sobrante. Pasa a verde cuando el programador registre exactamente esas cuatro rutas (paso 6).
- `lecturas-fx-r1.ataque.test.ts` › "la opción solo se puede activar dentro de adapters/db…": `expected [ …(8) ] to deeply equal [ …(9) ]`. Solo falta `"adapters/db/clases-archivadas.ts:1"`. Pasa a verde cuando exista `adapters/db/clases-archivadas.ts` con un solo `instantaneaUnica: true` en su texto, comentarios incluidos (paso 4).
- Los otros 57 casos de los dos archivos, en verde.
- Contención en esa salida (solo informativo: PA-07 aplica a corridas completas): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0, `"code":"P2028"` 0. `lecturas-fx-r1` registra en nivel `error`.

### Recorrido de las vigiladas de §D-R0 → 01a

Leí cada una contra el diseño de §D-1 a §D-3, el código actual de `adapters/db/clases.ts` y `middleware/`, y la restricción de M-01 (el cursor sigue siendo un `findUnique` por PK).

| Vigilada | Qué protege | Con el diseño de 01a |
|---|---|---|
| `lecturas-fx-r1:324-362` (admin) | Gancho tras `clase.findUnique` (cursor) que borra la clase del cursor; la página sale de la misma instantánea | No cambia, si el cursor sigue siendo `tx.clase.findUnique` con `select: { id, archivadaEn }` y no un `findFirst`. Sin `estado`, la lista es la de hoy (DH-11) |
| `lecturas-fx-r1:364-400` y `:402-434` (inscritas e impartidas) | Gancho tras `inscripcion.findUnique` y `maestroDeClase.findUnique`; `total` 3 en la misma instantánea | No cambia con la lectura por PK y `clase: { select: { archivadaEn } }` (el gancho se dispara después de que se resuelve toda la llamada). El filtro `clase.archivadaEn: null` en la página y en el `count` no cambia el `total` porque ninguna clase está archivada |
| `lecturas-fx-r1:437-473` (controles en READ COMMITTED) | Sin la instantánea, el gancho reproduce el defecto (página vacía; `total` 1) | No cambia: el cursor borrado sigue dejando la página vacía y el `count` filtrado por la clase sigue dando 1 |
| `lecturas-fx-r1:475-526` | Gancho tras `inscripcion.findMany` y `maestroDeClase.findMany` (la página es la primera sentencia sin cursor) | No cambia: siguen siendo `findMany` sobre esas tablas |
| `lecturas-fx-r1:618-646` | Retiene `maestros_de_clase`; inscritas devuelve la clase con sus dos maestros | No cambia: el filtro nuevo toca `clases`, no `maestros_de_clase`. Ninguna `*.ataque` retiene la tabla `clases` (grep de `tabla: "clases"` y `LOCK TABLE clases`: solo la definición en `lecturas-fx-r1:152`). PR-FX-03a y PR-FX-04, que sí la retienen, son normales y son del programador (Enmienda 2) |
| `lecturas-fx-r1:648-658` | Gancho tras `clase.updateMany` en `editarClase` | No cambia: `editarClase` sigue siendo un `updateMany`, ahora con `archivadaEn: null` en el `where` |
| `lecturas-fx-r1:962-973` | Sexto paso con la clase borrada: `null` o sin conceder | No cambia: solo gana el campo `archivada` |
| `lecturas-fx-r1:1121-1147` | Las cuatro lecturas usan la instantánea y su cuerpo (hasta el siguiente `\nexport `) no escribe ni bloquea | No cambia con `unirseConCodigo` como export propio después de `listarClasesAdmin`, **pero el corte no quita comentarios**: ver **O-2** |
| `hilo-01c-r1:718` | `FOR KEY SHARE` solo en `entregas.ts` y `referencias.ts` | No cambia: `unirseConCodigo` toma `FOR SHARE`, que el regex `FOR\s+KEY\s+SHARE` no ve |
| `alumnos-b-r1:1149-1162` | `inscripciones.ts` sin cambios; el handler de alumnos no compara rol ni nombra movimientos | No cambia: `inscripciones.ts` no se toca en 01a; `enClaseArchivada: "lectura"` en `handlers/clases/alumnos.ts` no casa con `\brol\b`, `.rol`, `/movimiento/i` ni el resto |
| `gestion-02a-r1:793-799` | `total` de la lista del admin sin `estado` entre dos `clase.count()` | No cambia (DH-11: sin `estado`, todas) |
| `gestion-02a-r1:544` (citada en la lista cerrada) | `toEqual` de la respuesta de crear con la del detalle | No cambia si las dos traen `archivadaEn: null` (ADM-1A05) |
| `clases-r1:561-585` | Unirse y regenerar a la vez nunca inscriben en otra clase | No cambia: con `FOR SHARE` por `codigo_invitacion`, unirse espera al `UPDATE` del código (llave única: `FOR UPDATE`) y en READ COMMITTED vuelve a evaluar el código: `200` con la misma clase o `404` |
| `clases-r1:542-559` (cinco uniones simultáneas) | Una sola fila y un solo `yaEstabas: false` | No cambia: `FOR SHARE` es compatible consigo mismo y el `createMany` conserva `skipDuplicates` |
| `sexto-paso-02a-r1` | El admin no pasa con `roles` raros; la guarda no exime `/api/admin/clases`; datos de la migración en tablas temporales | No cambia: sus rutas no declaran `enClaseArchivada`, así que la regla nueva de `protegido()` no aplica; la clase está activa; la sentencia de la migración `clases_administradas` no nombra `archivada_en` |
| `guarda-*` y `nombres-guarda-r3` | La guarda reconoce los pasos marcados por `protegido()` | No cambian: la guarda y `marcarPasoDeLaCadena` no se tocan; `/api/clases/anteriores` no tiene parámetros en sus dos primeros segmentos; `…/archivar` y `…/restaurar` llevan `pertenencia: "propiedad"` |
| `calificaciones-estatico-01b-r1:30-46` (CAL-T-69) | El handler de calificaciones no decide el acceso a mano | No cambia: reemplaza `protegido\(\{[^}]*\}\)` antes de mirar, así que `enClaseArchivada: "lectura-del-alumno"` desaparece con el resto de la opción (también si Prettier la parte en varias líneas) |

### Barrido del resto de las `*.ataque` del backend (94 archivos)

Busqué por grep y leí los casos que coinciden, por cada cosa que 01a cambia:
- **El `CHECK` `activa = (archivada_en IS NULL)`:** ninguna `*.ataque` escribe `activa` en la base. `clases-r1:442,468` y `clases-r2:246` mandan `activa: false` en el **cuerpo** y esperan que se ignore. `crearClaseDePrueba` crea con `activa = true` y sin fecha. Los `INSERT INTO clases` de `migracion-01a-r1`, `migracion-clases03a-r1` y `sexto-paso-02a-r1` corren sobre migraciones anteriores o en tablas temporales.
- **Funciones que se quitan o cambian de firma:** ninguna `*.ataque` importa `buscarClasePorCodigo`, `inscribir`, `resolverClaseDeLaRuta`, `requireMembership` ni `requireOwnership`. `claseDe(request).id` (`clases-r3:112`) no cambia.
- **Forma de las respuestas:** ninguna `*.ataque` compara con `toEqual` exacto, `Object.keys` ni lista de claves prohibidas una respuesta que gane `archivadaEn` de forma que la rompa. Las listas de prohibidas de `clases-r1`, `clases-r2`, `clases-r3`, `gestion-02a-r1` y `admin-muro-02b-r1` no nombran `archivadaEn` ni `activa`. La de `gestion-02a-r1:693-734` cambia en 01e: ver **O-3**.
- **Revisiones estáticas que leen `backend/src`:**
  - `arquitectura-cuentas-r1`, `temas-01a-r1:955-1030`, `temas-01a-r3:406-485`, `tareas-01a-r1:724-770`, `tareas-01b-r1:788-800`, `entregas-01b-r1:999-1045`, `instantanea-01b-r1:526`, `lecturas-fx-r2:918-990` y `:1072-1110`, `muro-c-r1:633-660` y `:1129-1160`, `muro-c-r2:326` y `calificaciones-estatico-01a-r1`: ninguna mira archivos que 01a toque de forma que el diseño rompa. Siguen valiendo: un solo `$queryRawUnsafe` (el SQL de `FOR SHARE`, si es crudo, va con `$queryRaw` de plantilla), `adapters/db` no importa `adapters/queue`, no hay `delete` nuevos, `core/clases/archivada.ts` no entra en las listas de `core/tareas/` y los handlers no comparan roles.
  - El `FOR SHARE` de `unirseConCodigo` no lo cuenta ningún regex de `FOR KEY SHARE`.
- **Inventarios de rutas:** solo `sesiones-y-cadena` (C-1) usa `printRoutes`. Ninguna otra `*.ataque` nombra `anteriores`, `archivar` ni `restaurar`.
- **Migraciones:** `migracion-01a-r1` y `migracion-clases03a-r1` aplican solo las migraciones anteriores a la suya (`todas.slice(0, indice)`), así que una migración posterior no las cambia.
- **Conteos de consultas:** ninguna `*.ataque` cuenta sentencias del sexto paso ni de unirse.
- **`backend/src/**/*.ataque`** (`config/`, `core/clases/codigo-r1` y `-r2`, `workers/ritmo-03c-r1`): no tocan nada de 01a.

### Frontend: las `*.ataque` que leen `shared/src` o `backend/src`
- `frontend/src/lib/errores-ch3-r2.ataque.test.ts:197-276` es la única `*.ataque` del frontend que lee fuentes de `shared/src` y de `backend/src` (`import.meta.glob` con `?raw`). Con el diseño de 01a sigue en verde, salvo por lo que describe **O-1**.
- Las demás `*.ataque` del frontend importan esquemas de `@campus/shared`. `archivadaEn` es opcional (S-14, DH-08), así que los dobles sin el campo siguen siendo válidos, y ninguna recorre `.shape` de `claseDetalleSchema` ni de `claseAdminSchema`.
- De paso miré las normales que leen fuentes (`lib/errores-de-api.test.ts`, `features/admin/errores-ch3.test.ts` y `formularios-ch3.test.tsx`): importan esquemas existentes y no cambian.

### Observaciones (no son hallazgos ni PARADA en 01a)

**O-1. Un mensaje nuevo en `shared/src` con prefijo «palabra: » fuera del inventario pone en rojo una `*.ataque` del frontend.** `frontend/src/lib/errores-ch3-r2.ataque.test.ts:258` exige que todo literal de `shared/src` con la forma `"<nombre>: …"` use un nombre de su `INVENTARIO` (`claseId`, `tipo`, `tema`, `confirmar`, …). Ni `estado` ni `cursor` están en él. Si el programador escribe en `shared/src/clases.ts` algo como `z.enum(["activas", "archivadas"], "estado: no es válido")`, siguiendo el estilo de `"tipo: no es válido"`, esa prueba cae. El plan no fija ese texto y ADM-1A11 solo pide `400`, así que el diseño no la rompe. Si el programador necesita el prefijo, es PARADA y el tester lo suma al inventario con un C-n nuevo. El mismo riesgo vuelve en 01b y en 01e (esquemas nuevos de `shared/`). `AGENTS.md` pide correr el frontend cuando cambia `shared/`, y esa corrida lo detectaría.

**O-2. El corte de `lecturas-fx-r1:1121-1147` incluye los comentarios que siguen a cada lectura.** El caso corta cada cuerpo desde `export const <nombre> =` hasta el siguiente `\nexport ` y **no quita comentarios**. Busca en ese corte `.create(`, `.createMany(`, `.update(`, `.updateMany(`, `.upsert(`, `.delete(`, `.deleteMany(`, `$executeRaw`, `$queryRawUnsafe` y `FOR (UPDATE|SHARE|NO KEY)`. El comentario que preceda a `export const unirseConCodigo` (§D-3 pide que siga a `listarClasesAdmin`) queda dentro del corte de `listarClasesAdmin`. Si ese comentario dice "FOR SHARE" o nombra `createMany(`, la vigilada cae aunque el código sea correcto. Lo mismo vale para cualquier comentario o helper no exportado entre las cuatro lecturas.

En la misma línea, el caso de C-2 (`:758-826`) tiene tres condiciones que hay que cuidar:
- Cuenta `instantaneaUnica: true` sobre el texto con comentarios: en `clases.ts` debe seguir habiendo 4 y en `clases-archivadas.ts`, 1.
- Ningún archivo fuera de `cliente.ts` puede nombrar `isolationLevel`, `RepeatableRead`, `REPEATABLE READ` ni `Serializable`, ni siquiera en un comentario.
- Ningún archivo fuera de `adapters/db/` (por ejemplo, `middleware/` o `core/clases/archivada.ts`) puede nombrar `enTransaccion` ni `instantaneaUnica`, tampoco en comentarios.

Son vigiladas: si cambian, es PARADA.

**O-3 (para 01e, fuera de 01a). `gestion-02a-r1.ataque.test.ts:693-734` choca con S-16 y no está en §D-R0 → 01e.** El caso da de baja al maestro B (`activo: false`, `:704`) y exige que cada maestro del **detalle** de la clase tenga exactamente las claves `["id", "nombre"]` (`:728`). En 01e, S-16 y ADM-1E19 piden `cuentaDesactivada: true` en el detalle para el maestro inactivo. El detalle usa `SELECT_MAESTROS_DE_CLASE` y `maestrosDeFilas`, que es justo lo que cambia. La prueba recibiría `["cuentaDesactivada", "id", "nombre"]`.

§D-R0 → 01e solo vigila `gestion-02a-r1:268`, con un maestro activo. Hace falta un C-n en la ronda 0 de 01e o una decisión del plan antes de esa ronda. Lo que el caso protege (nada de correo, rol, estado de pago, restricción, `activo` ni hash) seguiría valiendo con la clave nueva. No afecta a 01a.

### Atacado sin hallazgos
- Todas las vigiladas de §D-R0 → 01a y el barrido de las 94 `*.ataque` del backend y de las del frontend que leen fuentes (arriba).

### No atacado y por qué
- El código de 01a: aún no existe (ronda 0). Los puntos de ataque 1 a 4 de 01a se atacan en la ronda 1.
- La suite completa del backend y la del frontend: la ronda 0 pide correr solo C-1 y C-2. Por eso no hay conteo PA-07 de una corrida completa.

### SHA-256 de todas las `*.ataque` (base de V-01)

249 archivos (94 del backend y 155 del frontend), de `git ls-files` más los no rastreados (ninguno). Están calculados después de C-1 y C-2. Las otras 247 son idénticas a `8d98fba`.

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
| `backend/test/exportacion-02a-r1.ataque.test.ts` | `885668a621af11f17b4ac706db705aef33231b7773e4783147d21b318bdd0f9a` |
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
| `backend/test/lecturas-fx-r1.ataque.test.ts` | `7a73655168d44a449a8c9bebd5a941b2b8f16deca5ad8d55bdc11772b9133439` |
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
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `d1673261a3f4467da10cb07deae3b8fad93a6f233caea8370d61d4fbdc45f29b` |
| `backend/test/sexto-paso-02a-r1.ataque.test.ts` | `70ac720f2e7fcadee5bbcb6414887ab08129dea7cd91df012046953b1584e8b6` |
| `backend/test/tareas-01a-r1.ataque.test.ts` | `c89c30851e6b409cd045017181147bf674df947762a8dea3f3fb981bd9b36e09` |
| `backend/test/tareas-01b-r1.ataque.test.ts` | `79bc7aafc11676d36129610a4b5cd5fe5d8234d0d748487fd2f3e48c5f772c79` |
| `backend/test/temas-01a-r1.ataque.test.ts` | `ae60c11cff5c82df4954db48582df4bd5a64957ff9afaf9712aa43a038f8e189` |
| `backend/test/temas-01a-r3.ataque.test.ts` | `dc7b86a621062ed671c1e7174a745019133fbd410c7a2e78114b2a2c50affe95` |
| `backend/test/worker-03c-r1.ataque.test.ts` | `f09e9a0038c47d1a2223376a0af260baf573f0c45bf770201c48c9e30296f04b` |
| `backend/test/worker-r1.ataque.test.ts` | `9f60f9d65d52d2021a1eb04e9f01d3cc68f22744c845bf93d6621aa4fe9713a8` |
| `backend/test/worker-r2.ataque.test.ts` | `77d11bd85f202a9eec92a363df82e63fb9a784ca9d368d49f62e61c1a2aa967b` |
| `frontend/src/app/barra-02d-r1.ataque.test.tsx` | `0e49b62b73b2ef55e8c0b2ba26e1d136a3adb674761fda2c11453eb5c2faf7cc` |
| `frontend/src/app/cache-03a-r1.ataque.test.tsx` | `b89ede0f6aed45dfcb5e64c8909a822156ce43fd80948e72419cdce9d4541a87` |
| `frontend/src/app/contexto-r1.ataque.test.tsx` | `e85743c0fbb8e476874a2c67334342d8d69d14153579fc1e4cce0ae6e2b29616` |
| `frontend/src/app/contrasena-r1.ataque.test.tsx` | `bc2be5541006887e2a5a4a89b33046180f607d54474b0f96a73d615afbcac385` |
| `frontend/src/app/contrasena-r2.ataque.test.tsx` | `f38bcacb716d8a39acdb3535a95603cd0d8ab02572ca57a7df5268b01ceb6eac` |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `68fb5d092c0c8ecfcf282477ef023aaae26f6b869656e05109dc3efa276d842a` |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `41930017715d3d6869dc7acefd75de8ec3684f1f035b845abdf8ec0f6b734dee` |
| `frontend/src/app/en-espera-r1.ataque.test.tsx` | `1506c27e5f7418b5e087fd30f8809645a2fc3e2761c7249de78f02e24aa6c7a5` |
| `frontend/src/app/errores-r1.ataque.test.tsx` | `db48dad405c27062621a44d3744c84cc5903892a51e5a8df18f41383cb9c88a3` |
| `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` | `0e1d93e4dd3cbc7b5e9475a17b5ca66f0df056ba25cb117249f4c2e2f5887a51` |
| `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` | `2154b5c15f696a0c7f884bff774cf4e2a4208a5281db9076653f8253e2385ab9` |
| `frontend/src/app/fondo-r1.ataque.test.tsx` | `f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4` |
| `frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx` | `29782507d18ff96315e4030e890b21fdf1eb1c5550c3d1cfe5c92664d30b64dd` |
| `frontend/src/app/marco-r1.ataque.test.tsx` | `57cb54afd3b79464f0df01b88fc388cebbeac5657d936c4c204cbae6034b0834` |
| `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | `c8a9812f21cb24db50cc2afd945b7b38abacb468fbf4f4df16c07a52c48426ac` |
| `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | `d7608d7fc7767f53db3971672fc99fdb8bbd33f303f41e321bcc48ad25f511fd` |
| `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` | `2f8056a770397c1601647277944555a48afc4b9a2babeb75e5898f0cc92562bb` |
| `frontend/src/app/personas-03c1-r1.ataque.test.tsx` | `6acc49a2e3b649868ccf9a9337143f991b655dafbcff2e5916bca0269bd23a7c` |
| `frontend/src/app/personas-03c1-r2.ataque.test.tsx` | `a3e3dadd35c40e9a11a0bdef8cd716daceeb254e5307a837c6598213ba803a7b` |
| `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` | `0eefed2c05d76b0790a437e9465a898a9076083b1f046f8785145cfaad0da379` |
| `frontend/src/app/router.ataque.test.tsx` | `053e867a904afa3c09eef92ca2e03e929d9f9c93f714040856f40c7418721bbe` |
| `frontend/src/app/rutas-01d-r1.ataque.test.tsx` | `fc820217bc3baa3749c077fe16a4abd7ae10e92c84494ffb2a215133c19df36a` |
| `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | `f0657fb91f7b3accf64726292f9324c6742c1ac537c6c4a1985ec4e32ae09c83` |
| `frontend/src/app/rutas-clases-r1.ataque.test.tsx` | `c7946f5f5d5d16d36b395adc2ad9928acc7fd9839875fb64532b51489756730b` |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `f090cbd8e8c9b0af52d4fc19547b07e9b6413f5414cc4b10862f01e29818dddc` |
| `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` | `11c6d9c55be91aa41e8525345e3795e34b8e1e661ff7cdd901f729760a033cfd` |
| `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` | `48f5ff8fef35faa6d8500fae4a53ca953d7f661100a5c4879ba58e68972ab2de` |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | `36d605f79169e16a5afadc7e07fc3781472dd393406430277ceb147fc2da1fa5` |
| `frontend/src/components/layout/pie-r1.ataque.test.tsx` | `0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c` |
| `frontend/src/components/layout/pie-r2.ataque.test.tsx` | `00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21` |
| `frontend/src/components/layout/pie-r3.ataque.test.tsx` | `472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76` |
| `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` | `a1814d281dafd8243989c9f9a462a4f33a86b1fb70eeebf29e99bcb0f340d82a` |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `7d080037d9a64eebcebb789d1dfd94b787652103e6f9c84f968f9c9f64c3b30c` |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` |
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` |
| `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` | `c21edb5a06b43808ce2be23058409b7ff887e66d60e842c500a3714a90ebcb25` |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` |
| `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` | `30f45bba30d9348ec1587b42e84ca370274e1bf0af0f310b8a6bbd79fa982669` |
| `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` | `d477a809e55e603d3ef6c02ca43b21372b75d0947fa303f1539d48bdf32841f8` |
| `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | `761f54f183540d8ae222f97940fa6c2355ff33e515771e627f8efde49261eda2` |
| `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` | `14ead3dce027b433d51a9d635b0fa35718ee3875bffc3e1949f96ecb8d2f7135` |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `3ceda51db8f67f40c26615fbc4cd7d082035b00f38713c6ca4c7db58e47926c8` |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `1f5d1147637c09daa6fdf1384e4395edd69dfdab84aae5d602a362dabd3295bd` |
| `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` | `af3f0d474f8052b402c8959a64acf9e730f9ae60f09d90996a6306e9c2440f08` |
| `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` | `991b115524d8dade8d6ea2c51fb753dc8832ee410db2161a0ce761d011cfca4a` |
| `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | `96b6ab55f0a7bf9b66f8edbcb5ceffa7e4fe35935c6cb12ecab93fc04bc02856` |
| `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` | `0ce580976ea894ee4bd9c4adbe3d7d1d524354a8ff22fc7e7cc6acf89057aa53` |
| `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | `4bcd3e34b62726fea718efb9c482d8c1f504bbe85ef32427bdf4d65a6832d8f1` |
| `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` | `812ee5f1b04a1218e2b96cdb97fb5a964a4a21b0d81b95bb4889beaa4a3894bb` |
| `frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx` | `bef8aa53d338fde15e251d53756b76e3381ef9f6de4943c4db83c8e2b3d258dd` |
| `frontend/src/features/calificaciones/exportacion-02b-r2.ataque.test.tsx` | `d15e821c212bb268c65bd9dee36293b02f5bde4dedd4bf9926dbbf99b9971f57` |
| `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` | `5991d8e3d4e694973309f178e5341a2285584cf9ed6006fbb658d7f5a61de5dd` |
| `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` | `c744fb831fa9992c2a9ed0729f9ec3cc089f3167ca19133c6eee0133382607a1` |
| `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` | `8dea1c2adc5d228e166ce6037a1a1a827d26e2bdc6d7c8534f146517ebc1ac44` |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` | `6f7496ca7652e7b4441a7eb9822e74270d50127ac40ba27b86c83edfcd5cc3fa` |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` | `24751f358fc5ecd485c475e7025dd881b87fe892f025459a6ff29f615fc5cc66` |
| `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` | `c504d0ad3690781275a6ffb78638a6148550b2fd4ee1ed25a4b154054fc4f80d` |
| `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` | `6ac36ce1eb4df953626415b3ed431a8f4809dc29cf259f755f1f8509dd54b7ef` |
| `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` | `fb33f2a27bfcca906549a12610977478ba72e6e7ed8afd5c5a0a962deb3eb802` |
| `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` | `932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872` |
| `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` | `55dc274eca96da4360848b88f9f2a839ac815031490ab57ff38de074512d632c` |
| `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` | `371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183` |
| `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` | `266d088dd727f18af8c8a106b8d9c4dbed75753e4b1b4abb12f3a4df870ecb7f` |
| `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` | `856cffbd9c743f9815daf731487e29dc5f5272545dc15820a70baf86ecfa6527` |
| `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` | `a9dc00d9cf6e8684113eeb824658c7fb2f3077ee8a54deb0cce47ac802c74f44` |
| `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` | `98e645df89c9736ee33f440c1d83f342be84f30caabec0310b1b5185e538fbd6` |
| `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` | `f1b2b7d3c2a2bfbc2c2aa31cce4b120e306681c0cc9efb85ac2a954c8f8f8afe` |
| `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` | `c6c85ac2f6e7418e81d7817f9c455c0e0973025a15ae2a5378e00c9a71c45620` |
| `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` | `a3880b67ffaa0d15763d1c761cef1ff8472029c77bfb2211ab079eadb1685325` |
| `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` | `66c0b873bc8b9d8e9e01ac871bd6aaab4328508beb5ec9371d69463d7c12430d` |
| `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` | `87dae1927669b46bb52aad94db5107a5284f772fa9b29e225aace19c1a1e8def` |
| `frontend/src/features/clases/clases-r1.ataque.test.tsx` | `5f0679d8cfacc8bce01989c04a415dc5b546625eb7dec92f03959de5a0f89815` |
| `frontend/src/features/clases/clases-r2.ataque.test.tsx` | `c7ad5edc733e374117a9277f1c2987e84cc2930c77eb4c720ccf15cc9f5fab45` |
| `frontend/src/features/clases/clases-r3.ataque.test.tsx` | `a835a11d29aedb8f77f91e826a22c2b7cf5322fced3f6bed0c1acbf7c75a4e61` |
| `frontend/src/features/clases/clases-r4.ataque.test.tsx` | `86b04d234527eceefca35b07ce89e6b7ce0b6afe5ccdee2f005e6a4219f0495a` |
| `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` | `dce7fd019a6e32b8e4df37dd0728e265f5e9449e9ee2723f372ea174fe312464` |
| `frontend/src/features/clases/dudas-03e-r1.ataque.test.tsx` | `3b5a9fac5cd20a881bf6b38597b752725a7f6bbfddcf103b7bf1239a76353dfc` |
| `frontend/src/features/clases/dudas-03e-r2.ataque.test.tsx` | `fec2ffc2691bd297dca5f90233d498d10dfd689a5d9a8819bc30e757c6f67c26` |
| `frontend/src/features/clases/dudas-03e-r3.ataque.test.tsx` | `18edcffc8e48073362b98c784d5bf64e3335709ae6e1c6425b32aa3310e24b56` |
| `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | `ddc9dfaccc8230ec612126fdf29939a8e4311188566e5cfcaa724bd119e959e8` |
| `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | `5e20eefe0104b510a3002de084b6162162b5bf20797622c8d92b350853494b53` |
| `frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts` | `3cb8e0d7bb13b57638d65aa74ec5ff0f9306f024cf6996b7737232243a0b82f8` |
| `frontend/src/features/clases/estatico-r1.ataque.test.ts` | `cdd1ed8890859ae3e884822fc7074852a2173105114745d83fe9a15c1c47c626` |
| `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` | `de23d395dfe7a6f3d6d15eb48cb574599dc9d8204e5a90b255c0c10d25a186fa` |
| `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` | `46383e1f3ede03cb204dbf602373d0a07e513d8dac7ec4179a203ea6ee270fa3` |
| `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | `1d2bfe93db13219086246e21307223229a89416484a09ac69da14460e54e47bb` |
| `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` | `8b8ea2d21597bc0444709a9d26fd795d05bc964ef7b5094240628c63018c091b` |
| `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` | `b819d6bbde4bd47e3ec724fcdea5e77eb66b12076b8a9a083691b52ef0bdd182` |
| `frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx` | `ab006dc1711e9a652643930a7010c25f442d1ffdd137adbb093eb5bd98da90d6` |
| `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | `5224976752a14c3e003b246fa97abf25356e370cb46da1cdff9526bf3be86b4e` |
| `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | `7f4a935de29c3c519aad697edb1470c4cfcead600f5c1516c5fff948995d4434` |
| `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` | `8bc578ef17d2731f388c14ca19bc719a2b8d04d8a41009fadee15227379047bc` |
| `frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx` | `479430b848cf3d21a0187138944deec46bb36653071bbd2790ed57620f012976` |
| `frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx` | `4d94ccbe786a46ca1d82a280956f1146d5c302a9f83dfac45f39b3b2f94b753f` |
| `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` | `0f60f1582fce6e5efaf9bf6856133dc30f1dc4eb9c3b7fea19f90a330f8335b3` |
| `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` | `7c434a0e54e70b12d4b2a3de22ffb4dbf5f28a1cfbd2290c22e8a2b59edf0e16` |
| `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` | `99df138b24d4aba97b9f714c32ba226e82c7403cf73aa2e9e2b0b028b28e283e` |
| `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` | `4817262ef6e4dadff56857e50bab2e06ec479e62d5eaf45b34d70d683736b637` |
| `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | `8da38dbcb605ce3d90ace8117ce2cc5c838d71eb24bdd76fad3a53b82da93901` |
| `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | `d0acb3527aafa6f687e3eb00563e37be93768e7d7f742694a4d5ce05b75b7e28` |
| `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | `d08e51d451ebaeb2d7086c75dc1f73d52c5b4a6b8dfb979932828bed5f5d459d` |
| `frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx` | `558212b46641de0794d0ce90e3944a99cb5baa7fab4b09bbac5ea7cac41eaa34` |
| `frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx` | `aec8c4131e5dc733246b33e8189e2dc595387324bdd2081d1d245641c20c380a` |
| `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` | `67b60a9a5363f88e6ceba210c27452b8d639f6df798aa4e506dc54bb2312249a` |
| `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | `7677e0571587c89de1cb76788d499ac545255ca64c8afcb38a8ad6e39c02e2c6` |
| `frontend/src/features/clases/recursos-03d-r1.ataque.test.tsx` | `60541290248812cfce5591ddf33d01125d60c33257743a7ec48a445013d3d8c1` |
| `frontend/src/features/clases/recursos-03d-r2.ataque.test.tsx` | `4aafaa73980ba1bc29be043623a030c9eaa730825eb61a403bf54f9ac700b42d` |
| `frontend/src/features/clases/recursos-03d-r3.ataque.test.tsx` | `70b1a49a6a0e471422be987466228e5beb87e25baee2906790651c94ed214a3a` |
| `frontend/src/features/clases/recursos-03e-r1.ataque.test.tsx` | `29a3125cc70969f2fc2bb1f012beeb81840e1a00ea08d5b588b10d190342ae7f` |
| `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | `85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511` |
| `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` | `4303eac77b98e8978495d9e68fd7725ac436f9db757dbc0c02c59051436908fa` |
| `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` | `09435abbb9a26dd71c52b4d95487c6d38594f1ba062aefb60f73b7eb7308f991` |
| `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` | `d899c19ba982fbde2208bbc7fa009869556c84bd4650586dbd9ee90b22234e47` |
| `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` | `97af503e763f7dff9fcfbdc72862cd21de6af8e51d3ec41134f8475d98ae2df6` |
| `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` | `db42c88d5b0bfb1125bf122c03a2e019d6f5365c128ac4bfadd413a26a934845` |
| `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` | `f6924bc272a5240cf97d35729c797cc10960ed7cf94fe1be1b69ca2df6c1cf8f` |
| `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | `9866ef34167061e2715b65a352c55d08c7e9268033e879ae633c7fd568e4d49f` |
| `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` | `ea58eb11c3157a33c5730f87f2cf562ae178589b30264902b165c4439cebc2ee` |
| `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` | `2ef258e946084f17e33936e8fa257551a90323b589859dd2e1f70aabeaf711bf` |
| `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` | `e2fefd7d744f77c7bdd2ba73a08cc51076d0f6130bf4d0a225e0e972a1dce111` |
| `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` | `11bb5433fb30f268b6d93e1e7814d826bbab8fb1f173e574faf52f5a96b5a41e` |
| `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` | `d8daccb56c8de8d9f1b0f8d1b0907c110e327f4f55b016fc0fe7fc0f25ccc79c` |
| `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` | `ef86c46708f0682bca5a023e85794639c396ec94d207cac23ceb13585ab39e75` |
| `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` | `5ff367edba10c9ba9c7e50f8ed874032654fa2abdc0dd8f4a122a000355472ab` |
| `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` | `2938ae2f1c00f63a0372997c7ba68bdc0ab097895769bf9060072a4ac2674c5a` |
| `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` | `0963f14f4842d6d57288876c932496ac09d44b872fc049492ee6e8ba539f3235` |
| `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` | `4f486ca37d2a2bb6cc26754281d2adce086a9d8d4485a069de7ae5d54e360acf` |
| `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` | `93a5a0a648669e9c96494a62b2b16082b07296f279e2892bf2c8d47834ee2fc1` |
| `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | `08a5e1a5642e7fc7553632dd5cf4e07f0ea35c3ef1e7293d010bbc49b09465aa` |
| `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | `172be3efd919c0d3948eca17c7e808968e2370afe1f9c2a28cef7d2ded584b81` |
| `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` | `496652bc59817166f53e00cb828f2119c857c2834063a31764d7876dc150c930` |
| `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | `4e6950f0fe571d6ae41a78380c59c20459fdf19f34c57e9777e4e34a6bc61c58` |
| `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` | `94d6e6253b266c7f21099aa593aac7b2600edca22ab403aa365dcd789b1c6a97` |
| `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` | `f614e7369f8c47c40a87ad1f8867fb8edf7ebc76e94d0ba6c5c59c92cb6347f0` |
| `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` | `fb387ecbb7e5272d2ffb53d626b51ffd9c57b409d10c560e6a5ecbfa6a2a8c19` |
| `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | `7a7c7ba922f77da22d0f765ed5ea9ccf9216d1900e4b5f18365da9d46437495f` |
| `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` | `bfded7507bc684ea9858cd76517ef0e4c23cbc69e5a19f381e6ec522fd6156e6` |
| `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | `b778fc2e6bb0a8f8715a56877b3b781439ca214c8a9c8ae126f610c95229882a` |
| `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | `bf3c999033195cac778a82a579e44729fb07a405f5cdb41d8e7dc932cb71f942` |
| `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | `3567d7c23d2cf6a2fd538cd6822ef60ac3cffeac036394ed1e3559debe492c57` |
| `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | `6bbe2bd85e2b5500fbab4d0f51630c0c8e9d65b1a63045ad1fa906298a92a435` |
| `frontend/src/lib/errores-ch3-r1.ataque.test.ts` | `72b19b6a00b4ade43b06829bb5bef1a5cdecf5a7d2af57369f1e857a1d4a17f5` |
| `frontend/src/lib/errores-ch3-r2.ataque.test.ts` | `5d41a2af073dcaa2b8b016d835d36d5ebae9278863db048484a192a88bb31a30` |
| `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` | `66513d957e524af5e336a2c7e656df37f51106507a3984b691df47cd825d4d10` |
| `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` | `a9529cefbd27cbb94376a6548ef1b8b247fb1f4155938298ae5d10eaee81008a` |
| `frontend/src/lib/format-01c-r1.ataque.test.ts` | `60bc1fc7011e9a0fe5a4c4aa45420f2c7d38adb9ee2f8d235d09847dbe13ac3a` |
| `frontend/src/lib/format-d-r1.ataque.test.ts` | `c71cba65dd284d7af11cbc812b6bcf75baa373939edb8318e731858d9c50173f` |
| `frontend/src/lib/format-d-r2.ataque.test.ts` | `89dbbb70d5dc404c3d74db5391d10855c8cb1d6b4c643b6147b3ce6ffb2637af` |
| `frontend/src/lib/format-d-r3.ataque.test.ts` | `bfa7ded62f7a1402590d438a1cc51060a63fa019ad47d3eb5740e43383064a2a` |
| `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | `b6265bf6eec25b7f2c34dcd93dd4d8b23d07ca6214576921a50a66ff16346ffb` |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `8d8aaf8f82b0f63ad879537a3858438fe2079f9820fb7eb19eff6718b22f802a` |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582` |

## Ronda 1 — ADMIN-01a

Veredicto: **ROTO.** Hay 2 hallazgos: T-01 (media) y T-02 (baja, con un hermano). No hay hallazgos críticos ni altos.

Plan: `plan.md`, SHA-256 `a5bb19668efebae23968c87dd857ea89561bc69ac950ba7ee81e54881f67a464` (Enmiendas 1 a 4; lo comprobé al empezar). Base: `8d98fba`. Resumen del programador: `resumen-programador.md`. La verificación del manager es `revision.md`, "Verificación del resumen — ADMIN-01a", y ataqué sus ocho puntos.

Verificación propia, con una suite después de otra:
- **backend lint:** `cd backend; npm run lint` → exit 0. Salió `All matched files use Prettier code style!` y la última línea es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **backend test:** `cd backend; npm test` → `Test Files  1 failed | 239 passed (240)` · `Tests  3 failed | 2851 passed (2854)`, en 209.64 s. Solo fallan los tres casos de mis hallazgos.
- **backend build:** `cd backend; npm run build` → exit 0 (`> tsc -p tsconfig.json`).
- **frontend lint:** `cd frontend; npm run lint` → exit 0 (`> tsc -b`).
- **frontend test y build:** van en la tabla de "Conteos".

### Entorno (PA-01) y carga
- **Red y firewall:** la red es `IZZI-F281-5G`, en perfil Público. La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public). Docker 28.5.1, encendido.
- **Puerta de carga del backend:** CPU al 3 % y al 8 %, sin ningún `node` con `vitest`.
- **Carga ajena (N-21):** antes de la suite del frontend, la carga estuvo entre 32 % y 70 % durante varios minutos. La medí por proceso: eran `ZenlessZoneZero.exe` (un juego del humano) y dos `git` de la app de Codex. No terminé nada. Esperé a tener dos lecturas seguidas de 25 % o menos (la última, 20 %) y entonces corrí la suite.
- **Fallas por tiempo:** ninguna. Ningún archivo cayó por tiempo ni por una aserción de milisegundos en la corrida completa del backend.

### Archivos `*.ataque` que creé o cambié

| Archivo | Cambio | SHA-256 |
|---|---|---|
| `backend/test/clases-archivadas-r1.ataque.test.ts` | Nuevo: 15 casos, de `ADM-T1A01` a `ADM-T1A13`, más `ADM-T1A02b` y `ADM-T1A07b` | `c3f5df14a1bc30b3ff2530a5edb8e6de6ecf6a62f1b380d0d6acebe1f79c70cd` |
| `backend/test/archivos-d-r1.ataque.test.ts` | N-20, solo en el caso "subida: firmada para PUT…" (ver "N-20") | `d9e1de5b1bd43f54cf3a4dcf153d1eeabdc36b4dec02fbeb9d8a0239f298dfe9` → `87add25840c43bc2608eab5dd15a0f372b34a2d11908cbf60819c6edd69500c2` |

**V-01:** `sha256sum -c` sobre las 249 filas de la tabla de la ronda 0 da 248 iguales. La única distinta es `archivos-d-r1`, que cambié yo por N-20. El conjunto de `*.ataque` queda en 250, porque suma la nueva. Nadie más tocó ninguna `*.ataque`.

No toqué código de producción ni pruebas normales. N-18: ninguna clase de mi archivo queda confirmada con 0 o 3 maestros. Todas nacen con uno o dos; la de T1A04 pasa de uno a dos, y en T1A11 el maestro se desactiva pero sigue asignado.

### Conteos (con comando)
- `cd backend; npx vitest list test/clases-archivadas-r1.ataque.test.ts | grep -a -c "ADM-T1A"` → 15.
- Suite del backend: 2854 casos y 240 archivos. Es lo del programador (2839 y 239) más mis 15 casos en 1 archivo. Fallan 3, que son los casos de T-01 y T-02.
- Corrida acotada, `npx vitest run test/clases-archivadas-r1.ataque.test.ts test/archivos-d-r1.ataque.test.ts` → `Tests  3 failed | 31 passed (34)`. Pasan 12 de mis 15 casos y los 19 de `archivos-d-r1`.
- Frontend: `cd frontend; npm run test` → `Test Files  281 passed (281)` · `Tests  6062 passed (6062)` (334.63 s), lo mismo que el programador y el manager. `npm run build` → `✓ built in 977ms`, exit 0, con el aviso de tamaño de bloque de siempre.

### PA-07 (corrida completa del backend, `cd backend; npm test`, salida en un archivo)
- **Conteo:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 10 · `"code":"P2028"` 5.
- **Control positivo:** sale bien. Los tres `P2028` deterministas de `servicio-ocupado.integracion` están en la salida, todos en la misma app (pid 1656): `POST /api/auth/cambiar-contrasena` (req-1), `POST /api/auth/refrescar` (req-3) y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` (req-5).
- **Los otros dos `P2028`** son los permitidos de `cuentas-r3.ataque` (pid 17572): `POST /api/auth/login` (req-1m, `tx.sesion.create()`) y `POST /api/auth/restablecer` (req-20, `tx.tokenCuenta.updateMany()`). No hay ninguno de `maxWait`.
- **Los 10 "Error no controlado"** son el inventario cerrado:
  - 5 "fallo simulado de la base en la búsqueda" (`POST /api/auth/login`);
  - 1 "fallo simulado de la base al crear la sesión" (`POST /api/auth/login`);
  - 3 `ZodError` de la URL del almacén (`POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`);
  - 1 "boom" (`GET /api/prueba/error-comun`).
- **De mi archivo:** ninguno.
- **Atribución:** la hice por app, con el `requestId` y el `pid` de la petición más cercana anterior.

### Hallazgos

#### T-01 — Editar una clase en carrera con su archivado responde `403 SIN_ACCESO_A_LA_CLASE` al admin
Severidad: **media**
Prueba: `backend/test/clases-archivadas-r1.ataque.test.ts` › "ADM-T1A05: editar la clase (PUT /admin/clases/:claseId) en carrera con un archivado que confirma después del sexto paso → 409 CLASE_ARCHIVADA, no 403 SIN_ACCESO_A_LA_CLASE, y el nombre no cambia".

Escenario:
1. Una transacción retiene la fila de la clase activa con `FOR UPDATE`.
2. El admin manda `PUT /api/admin/clases/:claseId`. El sexto paso lee la clase activa y la deja pasar. Después, el `updateMany` de `editarClase` se forma detrás de la fila (lo compruebo con `formadasDetrasDe`).
3. La retenedora archiva la clase (`activa = false`, `archivada_en = now()`) y confirma.
4. El `UPDATE` de la edición reevalúa su filtro `archivada_en IS NULL`, cuenta 0 y `editarClase` devuelve `null`.

Esperado: `409 CLASE_ARCHIVADA` "Esta clase está archivada: solo se puede consultar.", el mismo que da la ruta cerrada un instante después.
Obtenido: `403 {"error":{"codigo":"SIN_ACCESO_A_LA_CLASE","mensaje":"No tienes acceso a esta clase."}}`. El nombre no cambia; eso sí está bien.

Causa: `handlers/clases/gestion.ts`, `PUT /admin/clases/:claseId`, hace `if (clase === null) throw sinAcceso()`. Con 01a, ese `null` ya no significa solo "la clase ya no existe": también significa "está archivada" (el comentario de `editarClase` lo dice).

Requisito o regla violada:
- **§D-1 y "Autorización":** "escrituras: 409 para todos".
- **§D-3:** el filtro de `editarClase` "cubre la carrera", pero la respuesta de la carrera dice al administrador, que tiene acceso a toda clase existente, que no lo tiene.
- **Efecto en 01c:** la interfaz de "Editar clase" leería un `SIN_ACCESO_A_LA_CLASE`, no "la clase está archivada".

Hermanos que revisé:
- `archivarClase` y `restaurarClase` releen por PK y distinguen 403 (no existe) de 409. Están bien.
- `regenerarCodigo` no filtra archivadas. Confirma la escritura después del archivado (T1A04), que es R-03 aceptado.
- El resto de las escrituras de R-03 (publicar y asignar maestro) confirman sin 500 (T1A04).

`editarClase` es el único adaptador que filtra por `archivada_en` en una escritura cerrada.

#### T-02 — El keyset de las listas de archivadas repite una clase si la del cursor se restaura y se vuelve a archivar entre dos páginas
Severidad: **baja**
Pruebas, en `backend/test/clases-archivadas-r1.ataque.test.ts`:
- "ADM-T1A07: la clase del cursor de GET /clases/anteriores restaurada entre dos páginas → 400; restaurada y vuelta a archivar → la página siguiente no repite en silencio una clase ya entregada";
- "ADM-T1A07b (hermano en GET /admin/clases?estado=archivadas): la clase del cursor vuelta a archivar con una fecha posterior entre dos páginas → la página siguiente no repite en silencio una clase ya entregada".

Escenario de `GET /clases/anteriores`:
1. El alumno tiene cuatro archivadas: A (14-ene), B (13-ene), C (12-ene) y D (11-ene). La página 1 (`limite=2`) trae [A, B], con cursor B.
2. El admin restaura B. La página siguiente con cursor B responde `400 VALIDACION` "cursor: no es válido", que es lo correcto (R-04).
3. El admin vuelve a archivar B por la API (`archivada_en` = ahora). La página siguiente con cursor B responde `200` y trae [A, C].

A ya estaba en la página 1. El keyset (`despuesDelCursor`) toma la posición **actual** de la fila del cursor, que ahora está en la cabeza. Lo mismo pasa en la lista del admin con `estado=archivadas`: el `cursor` de Prisma sobre `(archivada_en DESC, id DESC)` también lee la posición actual de la fila del cursor. En T1A07b, la página siguiente trae otra vez A.

Esperado: la página siguiente rechaza el cursor (`400`) o sigue sin repetir. Obtenido: `200` con una clase de la página anterior, y nada lo avisa.

Requisito o regla violada: "Puntos de ataque" 3 del plan ("que nunca se salte ni se repita una fila en silencio") y R-04. El plan solo cubre "la fila del cursor deja de cumplir el filtro". El caso "la cumple otra vez, pero en otra posición" no lo cubre.

**Juicio (punto 2 del manager):** es un defecto, de severidad baja.
- Por qué es baja: hace falta que el administrador restaure y vuelva a archivar la clase exacta del cursor mientras alguien pagina.
- Qué efecto tiene: en "Ver más" (01d, `GET /clases/anteriores`) y en la lista del admin (01c), la persona ve filas duplicadas, y una clave de React se repite.

No lo trato como hallazgo aparte, sino como parte del mismo mecanismo: una archivada **que todavía no se veía** y que se restaura y se vuelve a archivar salta a la cabeza y no aparece en el recorrido en curso. Eso equivale a una clase archivada después de empezar a paginar, igual que una clase nueva en cualquier keyset, y lo juzgo aceptable. El manager decide si T-02 va a corrección en 01a o a ESTADO §3 como riesgo aceptado.

### N-20 — Decisión sobre `archivos-d-r1.ataque:781`
**Decisión: la ajusto.** La aserción original era `expiraEn − (X-Amz-Date + 300 s) < 1000 ms`. `X-Amz-Date` se trunca al segundo, así que el margen real era de `1000 ms − (fracción del segundo de la firma)` entre la firma y `expiraEn()`. Con carga falló sin que hubiera un defecto: 1026 ms en la corrida del manager.

Lo que la aserción protege es "la vigencia que anuncia la API no supera la de la firma". Ahora se acota con la hora de la propia petición:
- `antes` y `despues` son `Date.now()` alrededor de la petición;
- `firmadaEn ≥ floor(antes, s)`;
- `firmadaEn ≤ despues`;
- `expiraEn ≥ firmadaEn + 300 s`;
- `expiraEn ≤ despues + 300 s`.

Así, lo que se anuncia de más queda acotado por lo que tardó la petición, y la prueba ya no depende de la fracción del segundo.

Con este ajuste:
- **Sigue detectando lo que debe:** un `expiraEn` calculado con más vigencia, por ejemplo `+301 s`, falla en cualquier petición que tarde menos de un segundo.
- **Deja de fallar sin defecto:** no hay un margen fijo que la carga pueda rebasar.
- **No depende de la hora del día:** solo usa el intervalo medido, así que no le aplica el reloj fijo de T-20.

Solos: `19 passed (19)`. En la suite completa, verde.

### Observaciones (no son hallazgos)
- **O-R1-1 (punto 6 del manager, hermano de N-18; destino: ronda del tester de 01e).** `claseAnteriorSchema` exige `maestros.min(1)`, igual que `claseAdminSchema`. Una archivada confirmada con 0 maestros daría 500 en `GET /clases/anteriores`. Hoy no se alcanza:
  - `retirarMaestro` rechaza al último maestro;
  - asignar y quitar maestros están cerradas en una archivada;
  - con P-01 a′ (E1-19), la baja de un maestro con solo clases archivadas conserva su asignación;
  - `SELECT_CLASE_ANTERIOR` no filtra por `activo`.

  T1A11 lo cubre hoy: una archivada cuyo único maestro está desactivado se sigue listando con su nombre, con 200. No lo probé con 0 maestros confirmados: eso violaría N-18 y además es inalcanzable. En 01e hay que comprobar que la baja de un maestro deja esta lista en 200.
- **O-R1-2 (R-03 confirmado).** Publicar, asignar un segundo maestro y regenerar el código que ya pasaron el sexto paso confirman después del archivado sin 500 y sin romper el `CHECK` (T1A04). Regenerar deja un código nuevo en una archivada, como dijo el programador; no sirve mientras la clase esté archivada (T1A12).
- **O-R1-3 (ajena a 01a).** La suite completa trae 21 `DeprecationWarning: Calling client.query() when the client is already executing a query` de `pg`. Con `--trace-deprecation`, la pila sale de `@prisma/adapter-pg` (`PgTransaction.performIO`), que lanza sentencias concurrentes dentro de una transacción. No viene de código de 01a; lo dejo anotado por si llega `pg@9`. No lo comparé contra la base.

### Atacado sin hallazgos
- **Carreras de archivar (punto 1):**
  - dos archivados a la vez dan 200 y 409 `CLASE_YA_ARCHIVADA`, con la fecha del que ganó; tres restauraciones dan 200 y dos 409 `CLASE_NO_ARCHIVADA` (T1A01);
  - archivar contra restaurar, en los tres órdenes (espera la fila, no la espera, la reevalúa), da 200 o 409 con el código correcto y un estado final coherente (T1A02). La decisión 5 del programador da dos 409 con la clase archivada por la retenedora, como dice su comentario;
  - seis ráfagas de 4 operaciones sin retención: solo 200 o 409, con el `CHECK` siempre cumplido (T1A02b);
  - unirse y archivar a la vez en 8 clases: el archivado da 200 y unirse da 200 con inscripción o 404 sin ella, nunca 500 (T1A03). La carrera retenida en el otro sentido es ADM-1A12;
  - escrituras que pasaron el sexto paso: ver O-R1-2 (T1A04).
- **Keyset (punto 2):** cinco archivadas empatadas en la misma fecha entre otras dos, en páginas de 1, 2 y 3, para el alumno y para el maestro: cada clase sale una sola vez, en `(archivada_en DESC, id DESC)`, y no entra la activa (T1A06). La clase del cursor restaurada da 400 (T1A07, primera mitad).
- **`estado` (punto 3):** devuelven `400 VALIDACION`, nunca 500 (T1A08):
  - mayúsculas;
  - arreglo (también repetido con el mismo valor);
  - vacío, espacios delante o detrás, `%00`, comilla con `--`;
  - `null`, `undefined` y `todas`.

  Sin `estado` y con un cursor archivado: 200. En `GET /clases/anteriores` responden 400:
  - `limite` 0, −1, 101, 1.5 o `abc`;
  - un cursor que no es UUID, vacío, al azar, repetido o con comilla.

  Su cursor propio da 200.
- **Orden 403/409 (punto 4), en todas las rutas con `:claseId` de `printRoutes` (más de 60, `HEAD` incluidos), sobre una archivada (T1A09):**
  - el maestro ajeno recibe `403 SIN_ACCESO_A_LA_CLASE` o `ROL_NO_PERMITIDO`;
  - el alumno restringido inscrito, `403 ACCESO_RESTRINGIDO`;
  - el maestro de la clase con cambio pendiente, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`;
  - sin token, 401;
  - el admin recibe, en cada ruta que le da 403 en una gemela activa, el mismo 403 en la archivada.

  Nunca 409. El `HEAD` de las lecturas para el alumno inscrito ya lo recorre ADM-1A09 (c).
- **Lecturas con datos reales y descargas (punto 5, T1A10):**
  - maestro y admin: 200 en las 19 lecturas con datos (detalle, personas, alumnos, avisos y comentarios, recursos y un recurso, dudas, temas, categorías, tarea, trabajo, entregas, entrega de un alumno y su hilo, gradebook, exportación y las dos descargas de su rol). El admin recibe `ROL_NO_PERMITIDO` en las que no lo nombran en `roles`, igual que en una activa;
  - firmas: las dos descargas firman su objeto con `attachment` en el almacén en memoria;
  - escrituras: ninguna. La foto de la clase, archivos, entregas, publicaciones, comentarios, inscripciones, maestros y trabajos de `pgboss` queda igual;
  - alumno inscrito: 409 `CLASE_ARCHIVADA` en las tres descargas, en su entrega y en su hilo, sin ninguna firma nueva.
- **`GET /clases/anteriores` sin fugas (punto 6, T1A11):**
  - con dos maestros, uno dado de baja y otro con un nombre con comillas, `<b>` y ñ, más un compañero deudor y restringido, el cuerpo del alumno y el del maestro no traen correo, estado de pago, restricción, versión, `activo`, hash ni código;
  - las claves de cada clase son exactamente `archivadaEn`, `id`, `maestros` y `nombre`, y las de cada maestro, solo `nombre`.
- **Unirse con el código de una archivada (T1A12):** responde exactamente igual que un código inexistente de la misma forma, en mayúsculas, minúsculas y con espacios. Vale también para un alumno ya inscrito, y no inscribe a nadie.
- **Campos extra (T1A13):** `archivadaEn` y `activa` en el cuerpo de crear, editar, archivar y restaurar no llegan a la base. La fecha de archivo es la del servidor.

### No atacado y por qué
- **Frontend de 01a:** no existe; la interfaz llega en 01c y 01d.
- **S-02:** los recordatorios de una archivada son de NOTIFICACIONES.
- **Borrado y duplicado:** son de 01b.
- **Unirse con su `FOR SHARE` retenido mientras el archivado espera:** no tengo forma de detener `unirseConCodigo` a mitad de su transacción sin tocar producción. Lo cubren la ráfaga de T1A03 y ADM-1A12 en el otro sentido.
- **`Cache-Control: no-store` en las descargas de una archivada:** no lo comprobé en T1A10. La cabecera la pone el mismo handler en una activa, y las pruebas de `archivos-d` ya la vigilan.

## Ronda 2 — ADMIN-01a

Veredicto: **RESISTE.** No hay hallazgos nuevos y T-01 y T-02 están corregidos.

Plan: `plan.md`, SHA-256 `066d9476fb1bb17301babf505eaeae1b6d904c227c7ac8cdd0c56a33a23f8a68` (Enmiendas 1 a 5; lo comprobé al empezar). Leí la corrección del programador ("Corrección ronda 1" y "Corrección ronda 1 — T-02 (Enmienda 5)") y la verificación del manager ("Verificación de la corrección de la ronda 1 — ADMIN-01a", sección "Para el tester en la ronda 2"). Ataqué sus seis puntos y los estados vecinos de T-01.

### Entorno (PA-01) y carga
- **Red y firewall:** `IZZI-F281-5G` en perfil Público; la regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public). Docker 28.5.1, encendido.
- **Puerta de carga:** antes del backend, CPU al 5 % y al 15 %; antes del frontend, al 21 % y al 7 %. En los dos casos, sin ningún `node` con `vitest`.
- **Fallas por tiempo:** ninguna. Una suite después de otra.

### C-21 a C-24 (en `clases-archivadas-r1.ataque.test.ts`, como los fija §D-R0 de 01a)
- **C-21, ADM-T1A06:** `recorrerAnteriores` manda en cada página `cursor` y `cursorArchivadaEn`, que es el `siguienteCursorArchivadaEn` codificado de la página anterior. Además afirma que la posición es `null` exactamente cuando `siguienteCursor` es `null`. Lo demás no cambia.
- **C-22, ADM-T1A07:** el título es nuevo. Sumé el control: con la posición de la página 1 (`2026-01-13T10:00:00.000Z`), la página siguiente da `200` [C, D]. Con la clase del cursor restaurada da exactamente `400 {"error":{"codigo":"VALIDACION","mensaje":"cursor: no es válido"}}`, y con la clase vuelta a archivar por la API da el mismo `400`. Quité el ayudante `repetidasEnLaSiguiente`, que ya no se usaba.
- **C-23, ADM-T1A07b:** el título es nuevo. La primera petición usa `cursor=centinela&cursorArchivadaEn=segundo(6)` y da `200` [a, b], con `siguienteCursorArchivadaEn` igual a `segundo(4)`. Sumé el control: antes de mover b, su posición con `limite=1` da exactamente [c]. Después de restaurar b por la API y volver a archivarla directo en la base (`segundo(7)`), la posición vieja da exactamente el `400` "cursor: no es válido".
- **C-24, ADM-T1A08:** `conSuCursor` manda `cursorArchivadaEn=2026-01-20T10:00:00.000Z` y da `200`. La lista de malformados suma seis casos, y todos dan `400 VALIDACION`:
  - el cursor sin posición;
  - la posición sin cursor;
  - la posición vacía;
  - la posición sin milisegundos;
  - la posición con `+00:00`;
  - la posición repetida.

  El caso `sinEstado` no cambia.

Resultado: `cd backend; npx vitest run test/clases-archivadas-r1.ataque.test.ts` da `Tests  15 passed (15)`. ADM-T1A06, 07, 07b y 08 quedan en verde, y T1A05 (T-01) sigue en verde.

### Archivos `*.ataque` que creé o cambié

| Archivo | Cambio | SHA-256 |
|---|---|---|
| `backend/test/clases-archivadas-r1.ataque.test.ts` | C-21 a C-24 | `c3f5df14a1bc30b3ff2530a5edb8e6de6ecf6a62f1b380d0d6acebe1f79c70cd` → `f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2` |
| `backend/test/clases-archivadas-r2.ataque.test.ts` | Nuevo: 6 casos, de `ADM-T2A01` a `ADM-T2A06` | `62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933` |

**V-01:** las 249 filas de la tabla de la ronda 0, con `archivos-d-r1` en `87add258…` (N-20, ronda 1), dan `sha256sum -c` sin diferencias. El árbol tiene 251 `*.ataque`: esas 249 más las dos de esta tabla. Nadie más tocó ninguna `*.ataque`.

No toqué código de producción ni pruebas normales. N-18: ninguna clase de `r2` queda confirmada con 0 o 3 maestros. En T2A03, la clase del cursor pasa de 2 maestros a 1.

### Hallazgos
Ninguno.

### Atacado sin hallazgos (ADM-T2A01 a T2A06, `backend/test/clases-archivadas-r2.ataque.test.ts`)
- **ADM-T2A01 (punto 1 del manager): posiciones manipuladas en `GET /clases/anteriores` y `GET /admin/clases?estado=archivadas`.** Cada caso va con `GET` y con `HEAD`, y lleva como control la posición exacta, que da `200`.
  - Valores probados:
    - 10 000 caracteres, y la fecha seguida de 5000 ceros;
    - `\u0000`, `\n` y `\u001f`;
    - espacios delante o detrás;
    - en minúsculas, con `+00:00`, sin milisegundos y con un espacio en lugar de la `T`;
    - en milisegundos epoch, entre comillas, `null`, `undefined` y `[object Object]`;
    - con el inversor U+202E y con dígitos de ancho completo;
    - codificada dos veces;
    - con `+` sin codificar;
    - como `cursorArchivadaEn[]`.
  - Resultado: en todos, `400` con el cuerpo exacto "cursor: no es válido" (en `HEAD`, `400` sin cuerpo). La posición repetida da `400 VALIDACION` con el mensaje `cursorArchivadaEn: …` y sin eco del valor. Nunca 500.
- **ADM-T2A02: posiciones donde no van o sin su cursor.**
  - En la lista del admin sin `estado` y con `estado=activas`, `cursorArchivadaEn` da el `400` exacto en todas las combinaciones: con o sin cursor, con el cursor de una activa o de una archivada, y vacía.
  - En las dos listas con posición, también dan `400` la posición sin cursor y los cursores de una clase ajena, de una activa o inexistentes, aunque lleven una posición bien formada.
- **ADM-T2A03 (punto 2): la clase del cursor deja de ser del perfil entre dos páginas.** Al alumno lo doy de baja de esa clase, y al maestro lo retiro de ella. Los dos reciben el `400` exacto, nunca una página ajena. Sin cursor, cada uno sigue viendo solo lo suyo.
- **ADM-T2A04 (punto 3): empates de fecha.** Hay cuatro clases empatadas, entre un centinela y una vieja.
  - El cursor de cada una, con la posición común, trae exactamente las que siguen en `(archivada_en DESC, id DESC)` en las dos listas; no salta ni repite dentro del empate.
  - Con la posición movida ±1 ms, da `400`.
  - En la lista del admin, el recorrido arranca desde un centinela con fechas de 2019.
- **ADM-T2A05 (puntos 4 y 5): dos vueltas de restaurar y archivar por la API, en las dos listas.**
  - Cada posición vieja da `400`, y la actual da `200`.
  - `HEAD` responde lo mismo que `GET`, con posición y sin ella.
- **Punto 6:** cada `400` de estas listas que no es el del parámetro repetido trae exactamente `{"codigo":"VALIDACION","mensaje":"cursor: no es válido"}`. Lo afirman T2A01, T2A02, T2A03, T2A04, T2A05, T1A07 y T1A07b.
- **ADM-T2A06: estados vecinos de la relectura de `editarClase` (T-01).** Usé un gancho después de `clase.updateMany`.
  - Si la clase estaba archivada y se borra entre el `UPDATE` y la relectura, devuelve `null` (403 en la ruta).
  - Si estaba archivada y se restaura entre los dos, da `409 CLASE_ARCHIVADA` sin escribir; es la decisión declarada, igual que la decisión 5.
  - Si estaba activa y se archiva después del `UPDATE`, la edición queda y se devuelve con su `archivadaEn`, que es R-03.
  - En ningún caso sale otro error.

  La carrera HTTP de T-01 (T1A05) sigue en verde.

### Conteos (con comando)
- `cd backend; npx vitest run test/clases-archivadas-r2.ataque.test.ts` da `Tests  6 passed (6)`, y `grep -a -c "ADM-T2A"` sobre `npx vitest list` de ese archivo da 6.
- Suite del backend: 2864 casos y 242 archivos. Son los 2858 casos y 241 archivos de la corrección del programador, más mis 6 casos en 1 archivo.

### Verificación propia (una suite después de otra; comando y última línea)

| Paquete | Comando | Última línea |
|---|---|---|
| backend | `npm run lint` | exit 0 (`> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`; antes, `All matched files use Prettier code style!`) |
| backend | `npm test` | `Tests  2864 passed (2864)` · `Test Files  242 passed (242)` (168.01 s) |
| backend | `npm run build` | exit 0 (`> tsc -p tsconfig.json`) |
| frontend | `npm run lint` | exit 0 (`> tsc -b`) |
| frontend | `npm run test` | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` (266.67 s) |
| frontend | `npm run build` | `✓ built in 908ms`, exit 0, con el aviso de tamaño de bloque de siempre |

### PA-07 (`cd backend; npm test`, salida completa en un archivo)
- **Conteo:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"code":"P2028"` 5 · `"Error no controlado"` 10.
- **Control positivo:** sale bien. Los tres `P2028` deterministas de `servicio-ocupado.integracion` están en la misma app (pid 12532): `POST /api/auth/cambiar-contrasena` (req-1), `POST /api/auth/refrescar` (req-3) y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` (req-5).
- **Los otros dos `P2028`** son los permitidos de `cuentas-r3.ataque` (pid 13248): `POST /api/auth/login` (req-1m, `tx.sesion.create()`) y `POST /api/auth/restablecer` (req-20, `tx.tokenCuenta.updateMany()`). No hay ninguno de `maxWait`.
- **Los 10 "Error no controlado"** son el inventario cerrado:
  - 5 "fallo simulado de la base en la búsqueda" y 1 "fallo simulado de la base al crear la sesión", los seis en `POST /api/auth/login`;
  - 3 `ZodError` de la URL del almacén (`POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`);
  - 1 "boom" (`GET /api/prueba/error-comun`).
- **De mis archivos:** ninguno.
- **Atribución:** por app, con el `pid` y el `requestId` de la petición más cercana anterior.

### No atacado y por qué
- **R-19:** otra fila que se mueve entre dos páginas es un riesgo aceptado, así que no lo reporto. El descarte por `id` en la interfaz es de 01c y 01d2.
- **O-R1-1:** una archivada con 0 maestros sigue con destino a 01e.
- **El frontend de las listas:** llega en 01c y 01d.
