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

## Ronda 0 — ADMIN-01b

Veredicto: **LISTA PARA EL PROGRAMADOR** (sin PARADA). Apliqué C-3, C-4 y C-5 tal como los escribe §D-R0 → 01b, y nada más. Las tres pruebas quedan en rojo por la razón esperada: solo les falta lo que 01b va a agregar. Ninguna otra `*.ataque` del backend ni del frontend se rompe por el diseño de 01b. Dejo once observaciones para el programador (O-01b-1 a O-01b-11). Son trampas de implementación que pondrían en rojo una `*.ataque` vigilada aunque el diseño sea correcto.

Plan: `plan.md`, SHA-256 `066d9476fb1bb17301babf505eaeae1b6d904c227c7ac8cdd0c56a33a23f8a68` (Enmiendas 1 a 5; lo comprobé al empezar). Base: commit `68242f3`; dentro de los paquetes, `69057f7`. `git diff --name-only 69057f7 -- backend frontend shared` lista solo los tres archivos de C-3 a C-5.

Verificación propia (regla "Suites por ronda" de CHORE-05: solo lo que toco, más `lint`):
- **lint del backend** en verde. `cd backend; npm run lint` termina con exit 0. Antes salió `All matched files use Prettier code style!` y la última línea es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, sin errores.
- **test:** los tres archivos de C-3 a C-5 (rojo esperado) y, como línea base, las vigiladas de 01b. Abajo van las dos corridas.
- No corrí la suite completa del backend ni la del frontend: las corre el manager al cerrar la subentrega. Por eso no hay PA-07 de corrida completa. En las dos corridas acotadas los seis términos dan 0.

### Entorno (PA-01) y trabajo en paralelo
- **Red y firewall:** `IZZI-F281-5G`, perfil Público (`Get-NetConnectionProfile`). La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public).
- **Docker:** 28.5.1, encendido.
- **Trabajo en paralelo:** el humano respondió, por el orquestador, que la otra copia de trabajo ya no se usa y no está corriendo nada.
- **Carga:** antes de correr, CPU al 1 % y ningún `node` con `vitest`. Una corrida después de otra.

### Cambios (solo C-3, C-4 y C-5)

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-3 | `backend/test/sesiones-y-cadena.ataque.test.ts` | El inventario de rutas (`:589` y siguientes) suma exactamente cuatro entradas, cada una en su lugar del orden de `sort()`: `DELETE /api/admin/clases/:claseId`, `GET /api/admin/clases/:claseId/conteo-de-borrado`, `HEAD /api/admin/clases/:claseId/conteo-de-borrado` y `POST /api/admin/clases/:claseId/duplicar`. Comprobé con `node` que quedan 125 entradas, ordenadas y sin repetir. Además, el comentario de C-3 antes del caso y "ADMIN-01b" en el título, como hizo C-1 en 01a. Lo que protege no cambia: ninguna ruta crea administradores, solo las tres de siempre crean maestros (duplicar crea una clase, no cuentas) y cualquier otra ruta nueva vuelve a poner la prueba en rojo | `d1673261a3f4467da10cb07deae3b8fad93a6f233caea8370d61d4fbdc45f29b` → `71c54a113611a3097baa03691f316f5e3d49dbe6532d058a453aaf0641434db1` |
| C-4 | `backend/test/lecturas-fx-r2.ataque.test.ts` | En el caso O-4 (`:967` y siguientes), el conjunto de borrados de `backend/src` suma `"clase"` y `"movimientoInscripcion"`, en su lugar del orden y con su comentario. El título suma "clases, movimientos de inscripción". Siguen igual el regex de borrados de Prisma (`\.(\w+)\.(delete\|deleteMany)\(`), la regla sin `DELETE FROM` ni `TRUNCATE` crudos (`crudos` vacío) y el que nada borre `enlaces_registro` ni `usuarios` | `4090a21f3b389a24bc67d5f585440a55c39c8387112bdb35116863c5e609662c` → `b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea` |
| C-5 | `backend/test/lecturas-fx-r1.ataque.test.ts` | En la lista de usos de `instantaneaUnica: true` (`:805` y siguientes), se suma `"adapters/db/borrado-de-clase.ts:1"` (`contarParaBorrar`), primera en el orden y con su comentario. El título pasa de "veinte" a "veintiuna lecturas (…, una del conteo de borrado, …)". Lo demás que protege no cambia | `7a73655168d44a449a8c9bebd5a941b2b8f16deca5ad8d55bdc11772b9133439` → `82fe8c49674a3cc8328e7951236c0c8f442fcba3890b716013369785b202cf40` |

Ninguna otra `*.ataque` cambia. No toqué código de producción ni pruebas normales. En C-3 a C-5 no hay pruebas nuevas, así que N-18 no aplica.

### Corrida de C-3 a C-5 (rojo esperado)

Comando, desde `backend/`: `npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts test/lecturas-fx-r2.ataque.test.ts`

```
 Test Files  3 failed (3)
      Tests  3 failed | 75 passed (78)
   Start at  10:02:29
   Duration  22.64s (transform 1.99s, setup 108ms, import 5.04s, tests 24.73s, environment 0ms)
```

- **`sesiones-y-cadena.ataque.test.ts`**, caso "bajo /api solo existen las rutas de … ADMIN-01a y ADMIN-01b…": `expected [ …(121) ] to deeply equal [ …(125) ]`. El diff solo marca como faltantes las cuatro entradas nuevas y ninguna sobrante. Pasa a verde cuando el programador registre exactamente esas cuatro rutas.
- **`lecturas-fx-r2.ataque.test.ts`**, caso "O-4: en backend/src solo se borran clases, movimientos de inscripción, …": `expected [ 'categoria', 'comentario', …(7) ] to deeply equal [ 'categoria', 'clase', …(9) ]`. Solo faltan `"clase"` y `"movimientoInscripcion"`. Pasa a verde con los dos borrados de Prisma de `borrarClaseDefinitivamente`.
- **`lecturas-fx-r1.ataque.test.ts`**, caso "la opción solo se puede activar dentro de adapters/db… veintiuna lecturas…": `expected [ …(9) ] to deeply equal [ …(10) ]`. Solo falta `"adapters/db/borrado-de-clase.ts:1"`. Pasa a verde cuando exista `adapters/db/borrado-de-clase.ts` con un solo `instantaneaUnica: true` en su texto, comentarios incluidos.
- Los otros 75 casos de los tres archivos, en verde.
- **Contención en esa salida** (solo informativo; PA-07 aplica a la corrida completa): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0, `"code":"P2028"` 0.

### Línea base de las vigiladas de 01b (con el código de hoy)

Comando, desde `backend/`: `npx vitest run test/arquitectura-cuentas-r1.ataque.test.ts test/hilo-01c-r1.ataque.test.ts test/muro-c-r1.ataque.test.ts test/temas-01a-r1.ataque.test.ts test/temas-01a-r3.ataque.test.ts test/entregas-01b-r1.ataque.test.ts test/calificaciones-estatico-01a-r1.ataque.test.ts test/worker-r1.ataque.test.ts test/worker-r2.ataque.test.ts test/worker-03c-r1.ataque.test.ts src/workers/ritmo-03c-r1.ataque.test.ts test/arranque-r1.ataque.test.ts test/clases-archivadas-r1.ataque.test.ts`

```
 Test Files  13 passed (13)
      Tests  147 passed (147)
   Start at  10:04:02
   Duration  22.37s (transform 5.12s, setup 564ms, import 19.64s, tests 83.75s, environment 2ms)
```

Los seis términos de contención dan 0.

### Recorrido de las vigiladas de §D-R0 → 01b

Leí cada una contra §D-4 a §D-6, la tabla de "Cambios por capa" de 01b y el código de hoy.

| Vigilada | Qué protege | Con el diseño de 01b |
|---|---|---|
| `arquitectura-cuentas-r1:69-74` | Un solo `$queryRawUnsafe` (`cliente.ts`) y ningún `$executeRawUnsafe` | No cambia: los `FOR UPDATE` y `FOR SHARE` nuevos (borrado, duplicado y `bloquearMaestrosActivos`) van con `$queryRaw` de plantilla. Ver O-01b-6 para los otros casos del archivo |
| `hilo-01c-r1:718` | `FOR KEY SHARE` solo en `entregas.ts` y `referencias.ts` (sin comentarios); 4 `instantaneaUnica: true` en `entregas.ts` | No cambia: el diseño usa `FOR UPDATE` y `FOR SHARE`, que el regex `FOR\s+KEY\s+SHARE` no ve, y no toca `entregas.ts`. Su segundo caso (`:735-753`) es O-01b-5 |
| `worker-r1`, `worker-r2`, `worker-03c-r1` | Consumidores de correos de cuenta y su cola de fallidos, con pg-boss real | No cambian: `registrarConsumidores` conserva su firma (`workers/index.ts` en "No se toca"). `TrabajoFallidoRecibido` gana `datos`, pero ninguna `*.ataque` construye ese objeto: las tres usan el `trabajarFallidos` real, y `encolarVarios` solo gana `inicio?` |
| `src/workers/ritmo-03c-r1:23` | Ritmo del worker de correos, con `trabajarFallidos` simulado | No cambia: el doble es `vi.fn(async () => undefined)` y no recibe ni construye un `TrabajoFallidoRecibido`. `registrarConsumidoresDeObjetos` vive en `workers/objetos.ts`, que esta prueba no importa |
| `muro-c-r1:633` | Solo `core/eventos/avisos-de-clase.ts`, `adapters/queue/colas.ts`, `handlers/clases/muro.ts` y `handlers/tareas/hilo-privado.ts` nombran las colas de avisos (texto **con** comentarios) | No cambia si el duplicado no nombra `MATERIAL_CREADO` (§D-5: no lo encola). Ver O-01b-4 |
| `temas-01a-r1:985-997` | `FOR KEY SHARE` solo en dos archivos; `bloquearClase` definida solo en `bloqueo-clase.ts`; reglas de `handlers/tareas/` | No cambia si el bloqueo del borrado se llama de otra forma (E4-4: el patrón `(const\|function)\s+bloquearClase\b` no casa con `bloquearClaseParaBorrar`). 01b no toca `handlers/tareas/` |
| `temas-01a-r1:1022-1028` | `encolar(` y `cancelar(` en `handlers/tareas/` | No cambia: 01b no toca `handlers/tareas/` (`entregas.ts` salió de 01b por la Enmienda 1) |
| `temas-01a-r3:426-428` | `$queryRawUnsafe` y `$executeRawUnsafe` solo en `cliente.ts`; Prisma y `pg` solo en `adapters/` | No cambia: SQL de plantilla, y `workers/objetos.ts` usa las funciones de `adapters/db` |
| `entregas-01b-r1:1019-1023` | `entregas.ts`, `tareas.ts`, `archivos.ts` e `inscripciones.ts` de `adapters/db` no importan `adapters/queue` | No cambia: la lectura de la descarga en `archivos.ts` solo suma `copiaDe` |
| `lecturas-fx-r2:1072-1108` | Las dos lecturas del muro usan la instantánea y no escriben; las cuatro escrituras no la usan | No cambia: el descarte de M-02 (`copiaDe: null`) vive en `borrarPublicacion`, que solo debe no nombrar `instantaneaUnica` |
| Pruebas de borrar una publicación y editar un recurso (`muro-c-r1`, `muro-c-r2`, `recursos-clases03a-r1`, `recursos-clases03a-r2`) | Descartes de adjuntos con `estado`, `publicacionId` y la versión | No cambian: ninguna compara el `data` de esos `updateMany`, y `copiaDe: null` sobre un archivo que nunca fue copia no cambia nada visible |
| `calificaciones-estatico-01a-r1` (CAL-T-20) | Los comentarios de `adapters/queue/colas.ts` no nombran borrado crudo, niveles de aislamiento ni la opción de instantánea | No cambia si los comentarios de las colas nuevas lo respetan. Ver O-01b-7 |
| `arranque-r1:79-101` | El worker en `production` sin correo sale con 1, nombra `RESEND_API_KEY` y `CORREO_REMITENTE`, y no imprime el secreto del almacén ni `worker_listo` | No cambia si `worker.ts` sigue cargando `cargarEnv()` y `cargarEnvCorreo()` antes de construir `crearAlmacenDeObjetos`. Ver O-01b-8 |
| `clases-archivadas-r1:631-710` (ADM-T1A09, mía) | Toda ruta con `:claseId` de una archivada da su 401 o 403 de siempre al ajeno, al restringido, al de cambio de contraseña pendiente y sin token; el admin, el mismo 403 que en una gemela activa | **Recorre también las tres rutas nuevas**, porque las lee de `printRoutes`. Con el diseño sigue en verde: el maestro ajeno recibe `403 ROL_NO_PERMITIDO`, el restringido `403 ACCESO_RESTRINGIDO`, el pendiente `403 CAMBIO_DE_CONTRASENA_REQUERIDO` y la petición sin token `401`. El admin sobre la gemela activa recibe `409` (conteo y `DELETE` sin `confirmar`) o `400` (duplicar sin cuerpo), no `403`, así que la rama del admin no aplica. No hace falta un C-n. Ver O-01b-9 |

### Barrido del resto de las `*.ataque` (96 del backend y 155 del frontend)

Busqué por grep, y leí los casos que coinciden, todo lo que 01b cambia:
- **Rutas nuevas:** solo `sesiones-y-cadena` (C-3) y ADM-T1A09 (arriba) usan `printRoutes`, y ninguna usa `onRoute` para enumerar. Ninguna `*.ataque` pide `DELETE /api/admin/clases/:id`, `…/conteo-de-borrado` ni `…/duplicar`. Los `DELETE` de `/api/admin/clases/…` que hay (`autoria-02b-r1`, `admin-muro-02b-r1`, `concurrencia-02a-r1`, `gestion-02a-r1`, `logs-02a-r1`) son de `…/maestros/:maestroId`. La V-06 de `sesiones-y-cadena:464` ("ninguna ruta contiene «movimiento»") sigue cierta.
- **Migración `admin_01_copias_de_archivos`:**
  - `migracion-01a-r1` y `migracion-clases03a-r1` aplican solo las migraciones anteriores a la suya (`todas.slice(0, indice)`).
  - La única consulta a `pg_constraint` (`migracion-01a-r1:216`) filtra por siete nombres fijos.
  - Ninguna `*.ataque` crea filas con `copia_de` ni compara los índices de `archivos` o de `movimientos_inscripcion`.
  - La limpieza `borrarMovimientosYClasesDePrueba` borra clases con cascada, y como ninguna `*.ataque` existente hace copias, la FK `RESTRICT` de `copia_de` no la alcanza.
- **Tipos y firmas:**
  - `TrabajoFallidoRecibido` gana `datos`: nadie lo construye en una `*.ataque`.
  - `TrabajoParaEncolarEnLote` gana `inicio?`, que es opcional (`worker-03c-r1:107` no cambia).
  - `enTransaccion` gana `timeout?`: ninguna `*.ataque` afirma los 5 s por defecto. Los `timeout` que aparecen son de las transacciones de las pruebas.
  - `registrarConsumidores` y el puerto `Almacen` no cambian (`archivos-d-r1` usa `crearAlmacen`, que sigue igual).
- **Descarga con `409 ARCHIVO_EN_COPIA`:** las `*.ataque` de descargas (`archivos-d-r1`, `archivos-d-r2`, `logs-archivos-d-r1`, `logs-archivos-d-r3`, `descarga` de ADM-T1A10) crean archivos sin `copia_de`. Con `null`, la ruta responde como hoy.
- **Revisiones estáticas que leen `backend/src`:** las de arriba más `lecturas-fx-r1:758-830` (C-5), `lecturas-fx-r1:1121-1150` (cuerpos de `clases.ts`, que 01b no toca), `lecturas-fx-r2:918-955` (`listarPublicaciones` y `listarComentarios`), `instantanea-01b-r1:526`, `tareas-01a-r1:724-770`, `tareas-01b-r1:788-800`, `alumnos-b-r1:1149-1162` y `calificaciones-estatico-01b-r1`. Ninguna mira archivos que 01b toque de forma que el diseño la rompa.
- **Frontend:** `frontend/src/lib/errores-ch3-r2.ataque.test.ts:197-276` es la única que lee `shared/src` y `backend/src`, y sigue en verde con el diseño. Ver O-01b-10. Las demás `*.ataque` del frontend importan esquemas existentes de `@campus/shared`, y 01b solo agrega esquemas. Ninguna enumera las exportaciones de `shared`.

### Observaciones para el programador (no son hallazgos ni PARADA)

**O-01b-1 (C-4). El regex de borrados crudos lee comentarios, sin distinguir mayúsculas.** `lecturas-fx-r2:977` aplica `/DELETE\s+FROM|TRUNCATE/i` al texto **completo** de cada `.ts` de `backend/src`, comentarios incluidos. §D-4 describe los pasos 6 y 7 como `DELETE FROM movimientos_inscripcion …` y `DELETE FROM clases …`. Si ese texto se copia a un comentario de `borrado-de-clase.ts` (o de cualquier `.ts`), la prueba cae aunque el código use Prisma. Los `README.md` no los lee.

En el mismo caso, el conjunto de modelos es **exacto**: `clase` y `movimientoInscripcion` se suman, y cualquier otro `.<modelo>.delete(` o `.deleteMany(` nuevo lo pone en rojo. Por ejemplo, borrar a mano `archivo`, `tarea` o `entrega` en lugar de dejarlos a la cascada. La prueba no fija el archivo, pero §D-R0 los quiere en `borrado-de-clase.ts`.

**O-01b-2 (C-5). La instantánea se cuenta en el texto con comentarios.**
- `borrado-de-clase.ts` debe tener exactamente un `instantaneaUnica: true`, el de `contarParaBorrar`, contando los comentarios. `borrarClaseDefinitivamente` no lo usa.
- `duplicado-de-clase.ts`, `copias-de-archivos.ts` y `bloqueo-maestros.ts` deben tener cero.
- El mismo caso (`:772-779`) exige además tres cosas:
  - Ningún archivo **fuera** de `adapters/db/` nombra `enTransaccion`, `instantaneaUnica`, `isolationLevel` ni `RepeatableRead`, tampoco en un comentario: `workers/objetos.ts`, `adapters/queue/index.ts` (`cancelarVarios` con `{ sql }`), `core/clases/borrado.ts`, `core/eventos/objetos.ts` y `handlers/clases/gestion.ts`.
  - `isolationLevel`, `RepeatableRead`, `REPEATABLE READ` y `Serializable` solo aparecen en `cliente.ts`: la opción `timeout` de `enTransaccion` vive ahí y no hace falta nombrar niveles en otro lado.
  - `adapters/db/index.ts` no nombra `enTransaccion`, ni siquiera en un comentario.

**O-01b-3 (C-3). El inventario de rutas es exacto.**
- Las rutas son `DELETE /api/admin/clases/:claseId` (sin `/borrar`), `GET /api/admin/clases/:claseId/conteo-de-borrado` (con su `HEAD` automático) y `POST /api/admin/clases/:claseId/duplicar`.
- El parámetro se llama `:claseId`.
- Cualquier otra ruta pone la prueba en rojo, por ejemplo un `HEAD` o un `GET` de `duplicar`, o un `DELETE` con otra forma.
- La consulta `?confirmar=borrar` no forma parte de la ruta.

**O-01b-4 (`muro-c-r1:633`). No nombres la cola de materiales fuera de los cuatro archivos.** El regex lee el texto con comentarios y casa con `COLA_MATERIAL_CREADO` y con `"MATERIAL_CREADO"` entre comillas dobles. Un comentario en `duplicado-de-clase.ts` o en `gestion.ts` que explique que el duplicado "no encola `COLA_MATERIAL_CREADO`", o la importación de esa constante, la pone en rojo. Lo mismo vale para `PUBLICACION_CREADA`, `COMENTARIO_CREADO` y `AVISO_FALLIDO`.

**O-01b-5 (`hilo-01c-r1:735-753` y `entregas-01b-r1:1019-1023`). `adapters/db` no importa `adapters/queue`, ni por la ruta.** El primero revisa todo `adapters/db/` sin comentarios: ningún archivo puede contener `adapters/queue` ni `../queue`. Así que `borrado-de-clase.ts` y `duplicado-de-clase.ts` no pueden importar `COLA_RECORDATORIO_24H` ni las colas nuevas de `adapters/queue/colas.ts`. Las constantes de nombre viven en `core/eventos/`, y las funciones de cola llegan como parámetros (Enmienda 1). La cancelación con la lista de `trabajo_id` la arma el handler en su función de parámetro.

**O-01b-6 (`arquitectura-cuentas-r1`, otros casos del archivo).**
- `workers/objetos.ts` no usa `obtenerDb(` ni importa `adapters/db/cliente`: todo pasa por funciones exportadas de `adapters/db`.
- Nadie fuera de `adapters/` importa `adapters/notifier`, salvo `worker.ts`.
- Los archivos nuevos bajo `workers/`, `core/eventos/` y `adapters/queue/`, y `worker.ts`, no usan `console.` ni nombran `estadoPago`.
- `pg-boss` se importa solo en `adapters/queue/index.ts`.

**O-01b-7 (CAL-T-20, `calificaciones-estatico-01a-r1:22-31`).** Los comentarios de `adapters/queue/colas.ts`, que gana `BORRAR_OBJETOS`, `COPIAR_OBJETOS` y sus colas de fallidos, no pueden nombrar `DELETE FROM`, `TRUNCATE`, `REPEATABLE READ`, `RepeatableRead`, `Serializable`, `enTransaccion`, `instantaneaUnica` ni `isolationLevel`. Un comentario del tipo "el borrado encola dentro de `enTransaccion`" lo rompe.

**O-01b-8 (`arranque-r1:79-101`). El orden del arranque del worker.** `worker.ts` debe seguir llamando a `cargarEnv()` y a `cargarEnvCorreo()` antes de construir `crearAlmacenDeObjetos` con `opcionesDeAlmacen(env)`. No debe registrar las opciones del almacén (la prueba busca su secreto en la salida), y `worker_listo` sigue siendo la última línea.

**O-01b-9 (ADM-T1A09).** Esta prueba pide las tres rutas nuevas sobre una gemela **activa** con el token del admin:
- `DELETE` sin `confirmar`;
- `POST …/duplicar` sin cuerpo;
- `GET` y `HEAD …/conteo-de-borrado`.

Espera cualquier cosa menos `403`; si el admin recibe `403` en la gemela, exige el mismo `403` en la archivada. Por diseño, `DELETE` sin confirmar da `409` y no borra, y duplicar sin cuerpo da `400` y no crea nada.

Un `DELETE` que borrara sin `confirmar=borrar`, o un duplicado que no validara el cuerpo, dejaría filas de más en la base o le borraría la clase al caso. ADM-1B03 y ADM-1B09 ya lo cubren. Lo dejo dicho porque esta `*.ataque` también lo ejercita.

Las tres rutas deben declarar `pertenencia: "propiedad"` y el orden de siempre de la cadena, para que el ajeno, el restringido y el pendiente reciban su `403` antes de cualquier `409`.

**O-01b-10 (frontend, `errores-ch3-r2.ataque:258` y `:268`; es O-1 de 01a, otra vez).** Todo literal nuevo de `shared/src` con la forma `"<nombre>: …"` debe usar un nombre del `INVENTARIO`.
- `confirmar` está en él.
- `nombre`, `maestroIds`, `claves`, `archivoIds`, `alumnos` y `estado` no están.

Si `confirmarBorradoClaseSchema`, `duplicarClaseSchema` o `conteoDeBorradoRespuestaSchema` necesitan un mensaje propio con otro prefijo, es PARADA y el tester lo suma con un C-n nuevo. En `backend/src`, ningún literal puede seguir el prefijo con otro nombre en camelCase pegado a dos puntos (por ejemplo, `"claves: archivoIds: …"`). Como 01b toca `shared/`, `AGENTS.md` pide correr también el frontend, y esa corrida lo detectaría.

**O-01b-11 (recordatorios del encargo, no son míos).**
- **E4-4:** el E6 de `bloqueo-usuario.integracion.test.ts` es de la lista cerrada del programador. Lo dejé intacto.
- **N-18:** en las pruebas nuevas de 01b, ninguna clase queda confirmada con 0 o con 3 maestros. Por ejemplo, ADM-1B08 y ADM-1B09 duplican con uno o dos maestros elegidos, y ninguna prueba suma un tercero a la original.

### Atacado sin hallazgos
- Las vigiladas de §D-R0 → 01b (recorrido y línea base `13 passed (13)`, `147 passed (147)`).
- El barrido de las 96 `*.ataque` del backend y de la del frontend que lee fuentes.
- Mi ADM-T1A09, que recorre las rutas nuevas.

### No atacado y por qué
- **El código de 01b:** todavía no existe (ronda 0). Los puntos de ataque 4 a 7 del plan (borrado, duplicado, worker de copias, descargas en copia) se atacan en la ronda 1.
- **La suite completa del backend y la del frontend:** las corre el manager al cerrar la subentrega (CHORE-05, "Suites por ronda"). Por eso no hay PA-07 de corrida completa ni control positivo.

### SHA-256 de las `*.ataque` que cambié

| Archivo | C-n | SHA-256 anterior | SHA-256 nuevo |
|---|---|---|---|
| `backend/test/sesiones-y-cadena.ataque.test.ts` | C-3 | `d1673261a3f4467da10cb07deae3b8fad93a6f233caea8370d61d4fbdc45f29b` | `71c54a113611a3097baa03691f316f5e3d49dbe6532d058a453aaf0641434db1` |
| `backend/test/lecturas-fx-r2.ataque.test.ts` | C-4 | `4090a21f3b389a24bc67d5f585440a55c39c8387112bdb35116863c5e609662c` | `b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea` |
| `backend/test/lecturas-fx-r1.ataque.test.ts` | C-5 | `7a73655168d44a449a8c9bebd5a941b2b8f16deca5ad8d55bdc11772b9133439` | `82fe8c49674a3cc8328e7951236c0c8f442fcba3890b716013369785b202cf40` |

### V-01: SHA-256 de todas las `*.ataque` (base para el programador de 01b)

Son 251 archivos: 96 del backend y 155 del frontend, de `git ls-files` (no hay `*.ataque` sin rastrear).

- **Comprobación de entrada:** antes de tocar nada, las 251 coincidían con la base que fijó el orquestador. Esa base son las 249 de la tabla de la ronda 0 de 01a, con `archivos-d-r1` en `87add258…`, más `clases-archivadas-r1` `f2cff9c7…` y `clases-archivadas-r2` `62e4c2ce…`. `sha256sum -c` no dio diferencias.
- **Después de C-3 a C-5:** solo cambian las tres de la tabla anterior. Las otras 248 son idénticas a `69057f7`.
- **Lista:** `sha256sum` de la lista de abajo, en formato `sha256sum -c`, con los archivos en orden: `24fb3fe3108411588388b6e7c75cd335dae64c4021968ddff43c12602f3dd18e`.

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
| `backend/test/archivos-d-r1.ataque.test.ts` | `87add25840c43bc2608eab5dd15a0f372b34a2d11908cbf60819c6edd69500c2` |
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
| `backend/test/clases-archivadas-r1.ataque.test.ts` | `f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2` |
| `backend/test/clases-archivadas-r2.ataque.test.ts` | `62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933` |
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
| `backend/test/lecturas-fx-r1.ataque.test.ts` | `82fe8c49674a3cc8328e7951236c0c8f442fcba3890b716013369785b202cf40` |
| `backend/test/lecturas-fx-r2.ataque.test.ts` | `b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea` |
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
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `71c54a113611a3097baa03691f316f5e3d49dbe6532d058a453aaf0641434db1` |
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

**Veredicto de la ronda 0 de 01b: lista para el programador.**

## Ronda 1 — ADMIN-01b

Veredicto: **ROTO.** Hay un hallazgo alto (T-01) y uno bajo (T-02).
- **T-01:** con el cliente real de `minio`, el borrado de objetos da por buenos los errores por clave de `DeleteObjects`. Las claves de una clase borrada pueden quedar para siempre en el almacén sin reintento ni cola de fallidos.
- **T-02:** ADM-1B23 depende de la hora real con una ventana de 5 s.

Lo demás de los seis puntos del manager resiste.

Plan: `plan.md`, SHA-256 `4f46a1a6bb59bdab789eef4b7fb693c5b6f43a22d7e38c86e1364b0470b2a6c1` (Enmiendas 1 a 7; lo comprobé al empezar). Leí el resumen del programador ("ADMIN-01b — Implementación") y la verificación del manager ("## Verificación del resumen — ADMIN-01b", con sus seis puntos de ataque), y el código nuevo de `adapters/db`, `adapters/storage`, `adapters/queue`, `workers/objetos.ts`, `core/` y los handlers.

### Entorno (PA-01), trabajo en paralelo y carga
- **Red y firewall:** `IZZI-F281-5G` en perfil Público; la regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public). Docker 28.5.1.
- **Trabajo en paralelo:** según la respuesta del humano que transmitió el orquestador, la otra copia de trabajo no se usa.
- **Puerta de carga:** el juego `ZenlessZoneZero` (PID 8004) siguió abierto todo el tiempo; no lo toqué.
  - Antes de cada corrida esperé dos lecturas seguidas de 25 % o menos: 25/20, 21/23, 15/8 y 21/16. En una ocasión estuvo en 41/32; esperé alrededor de un minuto hasta tener 17/17 y corrí.
  - Ningún `node` con `vitest` estaba corriendo antes de cada corrida, y corrí una suite después de otra.
- **Rojos por tiempo:** ninguno, salvo los dos de la primera corrida de módulos, que expliqué y resolví en mi propio archivo (abajo, ADM-T1B07).

### Archivos `*.ataque` que creé o cambié

| Archivo | Cambio | SHA-256 |
|---|---|---|
| `backend/src/adapters/storage/objetos-r1.ataque.test.ts` | Nuevo, 3 casos (`ADM-T1B01`, `ADM-T1B01b` y `ADM-T1B02`). Usa el cliente real de `minio` contra un servidor S3 falso dentro de la prueba (`node:http` en 127.0.0.1, puerto efímero), sin red ni proveedor | `65c1d9d9e6cea8ba8cf98bc522c6ba6d7122376d0201ccf3fc3048d24b60543f` |
| `backend/test/borrado-duplicado-r1.ataque.test.ts` | Nuevo, 8 casos (`ADM-T1B03` a `ADM-T1B06` y `ADM-T1B08` a `ADM-T1B11`; `ADM-T1B07` no se conserva, ver abajo) | `3520057d0f1a27739eaa701aacd9c18d5c0728fc6a3d55374f43f63a5e6f5336` |

- **Ronda 0:** no cambié ninguna `*.ataque` existente. C-3 a C-5 siguen con sus hashes (`71c54a11…`, `b008263d…` y `82fe8c49…`) y pasan en la corrida de módulos.
- **V-01:** las 251 `*.ataque` rastreadas coinciden con la tabla de la ronda 0 de 01b (`sha256sum` contra esa lista, sin diferencias). El árbol suma mis dos archivos nuevos, sin rastrear: 253 en total.
- **N-18:** ninguna clase de mis archivos queda confirmada con 0 o 3 maestros. Todas nacen con uno, y las copias con uno o dos elegidos.
- **N-29:** llamo directo a `procesarCopiaDeObjetos`, `procesarBorradoDeObjetos` y `procesarCopiasFallidas`, y ninguna prueba registra consumidores en `COPIAR_OBJETOS` ni en `BORRAR_OBJETOS`.
- No toqué código de producción ni pruebas normales.

### Conteos (con comando)
- `cd backend; npx vitest list test/borrado-duplicado-r1.ataque.test.ts src/adapters/storage/objetos-r1.ataque.test.ts`: `grep -a -c "ADM-T1B"` da 11 (T1B01, T1B01b, T1B02, T1B03, T1B04, T1B05, T1B06, T1B08, T1B09, T1B10 y T1B11).
- Suite de módulos con mis dos archivos: 123 archivos y 1438 casos. Son los 121 archivos y 1427 casos de la verificación del manager, más mis 2 archivos y 11 casos.

### Verificación propia (comando y última línea)

| Qué | Comando (desde `backend/`) | Resultado |
|---|---|---|
| lint | `npm run lint` | exit 0; `All matched files use Prettier code style!` y la última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, sin errores |
| suite de módulos, primera corrida | `npx vitest run <los 71 archivos de test/ con los 26 prefijos del manager> src/workers/ritmo-03c-r1.ataque.test.ts src/adapters/storage src/core` (lista literal en el scratchpad, `archivos-modulo.txt`) | `Tests 4 failed \| 1435 passed (1439)` · `Test Files 4 failed \| 119 passed (123)` (79.13 s). Las 4 rojas: ADM-T1B01 (T-01); ADM-T1B04 por un conteo global de clases en mi propia prueba (lo corregí); y PR-FX-03a y "GET /api/admin/clases con la clase borrada entre la página y el conteo…" de `lecturas-fx-r1`, por la interferencia de mi ADM-T1B07 (abajo) |
| las dos de lecturas, solas | `npx vitest run test/lecturas-consistentes.integracion.test.ts test/lecturas-fx-r1.ataque.test.ts` | `Tests 44 passed (44)` |
| suite de módulos, segunda corrida (con T1B04 corregida y sin T1B07) | el mismo comando | `Tests 1 failed \| 1437 passed (1438)` · `Test Files 1 failed \| 122 passed (123)` (74.47 s). La única roja es ADM-T1B01 (T-01) |

No corrí la suite completa del backend ni el frontend: las corre el manager al cerrar la subentrega.

### PA-07 (segunda corrida de módulos, salida completa en un archivo)
- **Conteo:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 3 · `"code":"P2028"` 3.
- **Los 3 "Error no controlado"** son los del inventario. Los tres son `ZodError` "La URL del almacén debe ser http o https", en la misma app (pid 9244):
  - `handlers/archivos.ts:62` (`POST …/archivos`);
  - `handlers/archivos.ts:97` (`POST …/archivos/:archivoId/descarga`);
  - `handlers/clases/muro.ts:87` (`GET …/publicaciones`).
- **Los 3 `P2028`** (nivel 40) son los tres deterministas de `servicio-ocupado`, en la misma app (pid 27176):
  - `tx.sesion.findFirst()` desde `handlers/auth/cuentas.ts:202` (`POST /api/auth/cambiar-contrasena`);
  - `tx.sesion.updateMany()` desde `handlers/auth/index.ts:180` (`POST /api/auth/refrescar`);
  - el `$queryRawUnsafe` de `encolar` (`adapters/queue/index.ts:63`), desde `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios`.
- **De mis archivos:** ninguno. Mi app de integración registra en nivel `error`, así que un `500` mío sí habría salido.
- Es una corrida de módulos, no la completa: el control positivo y el cotejo final con la lista de permitidos se hacen en la corrida completa del manager.

### Hallazgos

#### T-01 — El borrado de objetos da por buenos los errores por clave de `DeleteObjects` con el cliente real de `minio`
Severidad: **alta**
Prueba: `backend/src/adapters/storage/objetos-r1.ataque.test.ts`, caso "ADM-T1B01: borrar con un DeleteObjects que responde 200 con un <Error> por clave (AccessDenied, InternalError) debe lanzar para que pg-boss reintente; NoSuchKey y la respuesta vacía no lanzan".

**Escenario.** `crearAlmacenDeObjetos` se construye sin segundo argumento, así que usa el `Client` real de `minio` 8.0.7, contra un servidor S3 falso local. `borrar(["materiales/c/1", "materiales/c/2"])` recibe la respuesta normal de `DeleteObjects` con `Quiet`: `200` y un `<DeleteResult>` con `<Error><Key>materiales/c/2</Key><Code>AccessDenied</Code>…</Error>`. Lo mismo pasa con `InternalError`.
- **Esperado:** lanza `ALMACEN_NO_DISPONIBLE` (503). Así `procesarBorradoDeObjetos` propaga el error y pg-boss reintenta 3 veces y después lo manda a `BORRAR_OBJETOS_FALLIDO` (§D-4: "Un error del almacén se propaga").
- **Obtenido:** resuelve sin error. El trabajo se completa, la clave queda en el almacén y nadie lo sabe: las filas de `archivos` ya se borraron con la clase, así que no queda ninguna pista de esa clave.
  `AccessDenied: expected 'resolvió sin error: la clave material…' to match object { codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 }`

**Causa.**
- `minio` 8.0.7 declara en sus tipos `RemoveObjectsResponse = null | undefined | { Error?: { Code?… } }` (`dist/esm/internal/type.d.mts:338`). En tiempo de ejecución, `removeObjectsParser` (`dist/esm/internal/xml-parser.mjs:671-678`) devuelve `toArray(xmlObj.DeleteResult.Error)`: cada elemento es el error mismo, `{ Key, Code, Message }`, sin la envoltura `Error`.
- `crearAlmacenDeObjetos.borrar` (`adapters/storage/index.ts`) filtra `resultado?.Error !== undefined`, que nunca se cumple con la forma real, así que descarta todos los errores.
- La interfaz `ClienteDeObjetos` copia la forma de los tipos, y ADM-1B15 (`adapters/storage/objetos.test.ts`) arma su cliente falso con esa misma forma; por eso pasa.

**Alcance.** El borrado definitivo es lo que cumple DH-04: los objetos de una clase borrada, incluidos los archivos entregados por los alumnos, deben dejar de existir. Con R2 o MinIO, una negación o un error interno por clave dentro de un `200` deja esos objetos para siempre, sin reintento, sin cola de fallidos y sin registro.
- Sin hallazgo en lo vecino: el `403` de toda la petición sí lanza 503 sin repetir la llave ni el secreto (ADM-T1B01b).
- `NoSuchKey` por clave también resuelve, y eso es correcto. Hoy, sin embargo, resuelve solo porque se ignoran todos los errores.

**Hermanos.**
- `copiar` sí traduce bien la forma real (ADM-T1B02, sin hallazgo): `404 NoSuchKey` da `origen_inexistente`, un `200` con `<Error>` en el cuerpo lanza 503 y el `PUT` lleva `x-amz-copy-source: /campus-privado/<origen>`.
- `crearAlmacen.metadatosDe` (de antes) usa el `code` del `S3Error`, que sí es real.
- Lo que sí comparte la forma equivocada son la interfaz `ClienteDeObjetos` y el doble de ADM-1B15.

**Requisito violado:** §D-4 ("Worker `BORRAR_OBJETOS` … Un error del almacén se propaga (3 reintentos y cola de fallidos)"), DH-04 y la regla de `CLAUDE.md` "En `workers/`, un error se deja propagar … Nunca se traga un error en silencio".

#### T-02 — ADM-1B23 depende de la hora real con una cota fija de 5 s
Severidad: **baja**
Prueba: no se puede automatizar sin tocar una prueba del programador; abajo va la reproducción.

**Escenario.** `borrado-de-clase.integracion.test.ts` (ADM-1B23) toma `antes = Date.now()`, hace el `DELETE` y exige `start_after - antes ≤ 605 000`. La API calcula `inicio = Date.now() + 600 000` después de leer la clase con `FOR UPDATE`, las copias, las claves y las tareas. Si entre `antes` y ese cálculo pasan más de 5 s (por la carga del equipo o por una espera de bloqueo o de conexión del pool), la prueba falla aunque el comportamiento sea correcto.

**Reproducción:**
1. En una transacción aparte, retener la fila de la clase con `SELECT … FROM clases WHERE id = $1 FOR UPDATE` justo antes del `DELETE` de ADM-1B23.
2. Soltarla a los 6 s.
3. `start_after - antes` sale alrededor de 606 000 y la aserción `toBeLessThanOrEqual(605_000)` falla.

Una cota robusta toma también `despues = Date.now()` al volver la respuesta y exige `antes + 600 000 ≤ start_after ≤ despues + 600 000`.

**Regla violada:** la de T-20 de TAREAS-01e ("toda prueba que compare fechas relativas al tiempo fija el reloj; una prueba que depende de la hora real es hallazgo"). Como la API no recibe reloj, aquí aplica la variante de N-20 de 01a: acotar con la hora medida antes y después de la petición.

### ADM-T1B07 — el 503 del timeout de 30 s (atacado y sin hallazgo; la prueba no se conserva)
- **Cómo lo ataqué:** una transacción retiene con `FOR UPDATE` la fila de una publicación de una clase archivada. El `DELETE …?confirmar=borrar` queda formado detrás de esa fila durante la cascada (lo comprobé con `formadasDetrasDe`). Solté la fila a los 32 s.
- **Resultado** (corrida aislada, `npx vitest run test/borrado-duplicado-r1.ataque.test.ts -t "ADM-T1B07"`, `1 passed`):
  - la respuesta fue `503 {"error":{"codigo":"SERVICIO_OCUPADO",…}}`;
  - `fotoDeLaClase` quedó idéntica a la de antes, sin trabajos de `BORRAR_OBJETOS` y con el recordatorio de su tarea en `created`;
  - el `DELETE` siguiente dio `204`, con el recordatorio `cancelled` y su trabajo de borrado.
  - Nunca hubo un `500` ni un estado a medias.
- **Por qué no la conservo:** en la primera corrida de módulos rompió PR-FX-03a (`lecturas-consistentes`) y una prueba de `lecturas-fx-r1` ("la lectura no quedó formada detrás de la tabla en 4 s"). Mientras el borrado espera 30 s, mantiene sus bloqueos de fila sobre `clases`, `inscripciones` y las demás tablas de la cascada. Esas dos pruebas piden `LOCK TABLE … IN ACCESS EXCLUSIVE MODE NOWAIT` sobre esas mismas tablas, así que el choque depende solo de que coincidan en el tiempo. Solas pasan (`44 passed`). Juntas con mi archivo, en otra corrida, también pasaron: el choque es intermitente.
- **Decisión:** quité el caso del archivo para no dejar en la suite una prueba que rompe a otras. El id `ADM-T1B07` queda sin usar y el comentario del archivo explica por qué.

### Atacado sin hallazgos (por punto del manager)

**Punto 1. Carreras y el `P2003`.** Archivo `backend/test/borrado-duplicado-r1.ataque.test.ts`, ADM-T1B05, en tres vueltas y sin retención:
- dos borrados a la vez dan exactamente `204` y `403 SIN_ACCESO_A_LA_CLASE`, con un solo trabajo de borrado;
- borrar y restaurar a la vez dan `204` con `403`, o `409 CLASE_NO_ARCHIVADA` con `200`, y la clase existe o no según el par;
- borrar y contar a la vez dan `204` y, para el conteo, `200` o `403`;
- dos duplicados a la vez dan dos `201`, con códigos distintos y un maestro cada uno;
- nunca hubo un `500`.

El `P2003` sin traducir no lo pude alcanzar por rutas reales:
- el duplicado toma la original con `FOR SHARE` y queda en serie con el `FOR UPDATE` del borrado (ADM-1B10);
- las filas de `archivos` solo se borran por la cascada de la clase, protegida por el paso 2;
- una escritura que pasó el sexto paso antes de archivar tendría que seguir en vuelo durante el archivado y el borrado completos. Con una fila retenida, Postgres le da el bloqueo a la que se formó primero, así que confirma antes que el borrado (R-03, ya aceptado).

**Punto 2. El conteo y el borrado.** ADM-T1B06, ADM-T1B04 y ADM-T1B07 (aislada):
- **ADM-T1B06:** una clase con 2 503 archivos, entre confirmado de un recurso, descartado, de entrega confirmado y pendiente, y 2 499 pendientes, da tres trabajos de `BORRAR_OBJETOS` (503, 1000 y 1000).
  - Cada clave aparece una sola vez y la de otra clase no está.
  - `datos` tiene exactamente la clave `claves` y cada clave es `materiales/<uuid>/<uuid>` o `entregas/<uuid>/<uuid>/<uuid>`, sin nombres.
  - El recordatorio de la clase queda `cancelled` y el de otra clase sigue `created`.
  - El consumidor, con esos datos, borra exactamente esas claves.
- **ADM-T1B04:** el conteo con el id en MAYÚSCULAS da `200` con `{ alumnos: 2, … archivos: 1 }`, y el `DELETE` con el id en MAYÚSCULAS borra la misma clase y encola su clave.
- **ADM-T1B07** (aislada): el `503` deja todo como estaba (arriba).

**Punto 3. Lo que se cuela al duplicar.** ADM-T1B08:
- `descripcion`, `codigoInvitacion`, `activa: false`, `archivadaEn`, `claseId`, `maestros` y `estadoPago` en el cuerpo no llegan a la copia, que nace activa, con la descripción de la original y un código nuevo;
- el nombre llega recortado;
- un maestro en MAYÚSCULAS se asigna bien;
- un recurso cuyo tema se borró queda sin tema y la copia no inventa temas;
- cada clave es exactamente `materiales/<copia>/<id de la fila>`;
- `copia_de` apunta a los tres originales;
- un solo trabajo de `COPIAR_OBJETOS` con `datos` igual a `{ archivoIds }` (los tres ids de la copia y nada más);
- la respuesta no lleva `email`, `estadoPago`, `accesoRestringido`, `hashContrasena`, `rol` ni `activo`.

**Punto 4. El worker de copias.**
- **ADM-T1B09 (R-14):** el admin borra el recurso de la copia mientras su objeto se copia. El worker no lanza ni rompe el `CHECK`; la fila queda `descartado`, sin publicación y sin `copia_de`. Ni `terminarCopias` ni, después, el consumidor de fallidos con los mismos datos la reviven.
- **ADM-T1B10:** datos fuera del esquema en los tres consumidores no llaman al almacén ni tocan la copia en curso:
  - un campo de más, 101 ids, un id que no es uuid, una lista vacía, un texto suelto, `null` o un arreglo pelado;
  - 1001 claves o una clave vacía.
- Los reintentos con éxito parcial ya los cubre ADM-1B21.

**Punto 5. `confirmar` y la autorización.**
- **ADM-T1B03:** dan `400 VALIDACION`, sin borrar nada ni encolar:
  - `confirmar` repetido, igual o con otro valor;
  - vacío, `BORRAR` o `Borrar`;
  - con espacios delante o detrás, o con `%00`;
  - `true`, `1`, 12 000 caracteres o `bórrar`.
- `CONFIRMAR`, `Confirmar`, `confirma`, `confirmar[]` y `confirmar[0]` en la consulta, y `{ confirmar: "borrar" }` en el cuerpo, dan `409 CONFIRMACION_REQUERIDA`. Son otros nombres de parámetro: el analizador de Fastify no convierte `confirmar[]` en un arreglo.
- Con `?confirmar=borrar&otro=1` se borra (`204`).
- **ADM-T1B04:** reciben `403` con su código en conteo (`GET` y `HEAD`, este sin cuerpo), borrado y duplicado, sin escribir:
  - el maestro de la clase;
  - su alumno inscrito;
  - un alumno restringido.
- Ids que no son uuid, el uuid nulo, `%00` y `..%2F..%2Fme` dan `400`, `403` o `404`, nunca `500`, y no crean ni borran nada.

**Punto 6. Los datos de los trabajos.** `BORRAR_OBJETOS` solo lleva `{ claves }` con ids (ADM-T1B06), y `COPIAR_OBJETOS` solo `{ archivoIds }` (ADM-T1B08).

**Además: la descarga de la copia (ADM-T1B11).** Un alumno que entra a la copia por código mientras su archivo se copia recibe `409 ARCHIVO_EN_COPIA` y no se firma nada para él. La original sigue descargándose. Terminada la copia, el alumno descarga la clave de la copia.

**Revisión estática del código nuevo.**
- No hay SQL concatenado: `leerCopiasPendientes`, `bloquearMaestrosActivos` y los dos bloqueos de clase usan plantilla parametrizada.
- No hay consultas dentro de ciclos: el worker solo llama al almacén en su ciclo.
- Ningún handler compara roles.
- Los descartes de `tareas.ts` y `entregas.ts` (sin `copiaDe: null`) no alcanzan copias: un adjunto de tarea solo se confirma desde un `pendiente`, y una copia siempre está `confirmado`.

### No atacado y por qué
- **R-05, R-06 y R-12:** son riesgos aceptados. Solo comprobé que el `503` de R-12 deja todo como estaba.
- **El objeto real en MinIO o R2:** no lo ataqué. Ninguna prueba toca el almacén real; el cliente de `minio` se ejerció contra un servidor falso local.
- **El frontend de 01b:** no lo hay; llega en 01c.
- **La suite completa y el control positivo de PA-07:** los hace el manager al cerrar la subentrega.

**Veredicto de la ronda 1 de 01b: ROTO** (T-01 alta, T-02 baja).

## Ronda 2 — ADMIN-01b

Veredicto: **RESISTE.** Sin hallazgos nuevos. T-01 y T-02 están corregidos.

Plan: `plan.md`, SHA-256 `e539dbcd877f0da7b2e895dff4d8ac099d400ca1fadd66d9f7b36d0a1838b183` (Enmiendas 1 a 8; lo comprobé al empezar). Leí "ADMIN-01b — Corrección ronda 1" y su "Enmienda 8" en `resumen-programador.md`, y "## Verificación de la corrección de la ronda 1 — ADMIN-01b" en `revision.md`. Ataqué sus cinco puntos.

### Entorno (PA-01) y carga
- **Red y firewall:** `IZZI-F281-5G`, perfil Público. La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada. Docker 28.5.1.
- **Trabajo en paralelo:** la otra copia de trabajo no se usa.
- **Puerta de carga:** el juego `ZenlessZoneZero` ya estaba cerrado; no terminé ningún proceso.
  - Después de mi propio `tsc` y `eslint`, la CPU marcó 96–100 % durante unos minutos sin un proceso mío visible. Esperé hasta tener seis lecturas de 0–6 % antes de correr.
  - Las lecturas previas a cada corrida fueron 6/11 y 3/6. Ningún `node` con `vitest` corría antes de cada una, y corrí una suite después de otra.
  - Nada cayó por tiempo.

### C-n sobre `*.ataque` existentes (declarados en esta ronda)

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-33 | `backend/test/gestion-02a-r1.ataque.test.ts` | Remedio de E8-2 sobre el patrón que señala E8-3 (`:793-799`).<br>**Quita:** los dos `clase.count()` de antes y de después de `GET /api/admin/clases?limite=2` y la cota del `total` entre ellos.<br>**Pone:** el `total` contra las filas de su propia respuesta (`≥ filas + 1` con página siguiente; igual sin ella) y, aparte, `listarClasesAdmin(…).total` igual a `clase.count()` dentro de una misma `enTransaccion` con `instantaneaUnica: true` y `timeout: 10_000`, con la cota de las 5 clases del caso. Suma los imports `enTransaccion` y `listarClasesAdmin`.<br>Lo demás del caso no cambia: cursores malformados, límites, páginas por la centinela y cursor en mayúsculas. Lo que protege, que el `total` de la lista sin cursor es el de toda la tabla, se mantiene sin depender de lo que otros archivos escriban en paralelo | `ec9602d5f109b45a6d428e708d9b6cdd37a7509a6ff9031fa6fd8a2da0e25e9b` → `73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a` |
| C-34 | `backend/test/archivos-d-r1.ataque.test.ts` | `filasDelCaso` (`:914-920`) deja de contar por el `subidoPor` del admin único: la lista queda en `[e.alumno.id, ajeno.id, conCambio.id, deBaja.id]` y la condición por clase no cambia. Además, un comentario con el porqué.<br>Lo comprobé en el caso: el admin no hace ninguna de las peticiones negadas (estudiante, maestro ajeno, cambio pendiente, de baja y sin token), y su única escritura, la solicitud final, cae en `e.claseA`, que se cuenta por clase. Así `:1022` (sin escrituras) y `:1051` (`+1`) protegen lo mismo y ya no se mueven con las subidas del admin de otros archivos | `87add25840c43bc2608eab5dd15a0f372b34a2d11908cbf60819c6edd69500c2` → `f76ce52002e295f2bda6e7a7a7f796415e08013e6d4c1fbe2c9c686671fe8252` |

- **Familia de `archivos-d-r1` (punto 2):** por grep de `archivo.count` en `backend/test`, la única que contaba por el admin era `archivos-d-r1:914-920`. Las demás cuentan por `claseId` propio o por `subidoPor` de un alumno propio: `admin-muro-02b-r1:458` y `:488`, `calificaciones-01a-r2:512`, `cuerpos-02a-r2:213`, `entregas-01b-r1:599` y `:754`, `gestion-02a-r1:296` y `:323`, `muro-admin.integracion:363`, `entregas.integracion` y `clases-archivadas-matriz:185`.
- **Las que suben como admin** (`borrado-duplicado-r1.ataque:135`, `:451` y `:537`, y `admin-muro-02b-r1.ataque:506`) no cuentan por el admin. Con C-34 ya no mueven ningún conteo, así que no las cambié.
- **Las normales** `muro-admin.integracion:289` y `:618` tampoco interfieren ya (no las toqué). No vi interferencia en mis corridas.

### Mis pruebas de rondas anteriores, otra vez y por ruta
Comando, desde `backend/`:

`npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts test/lecturas-fx-r2.ataque.test.ts src/adapters/storage/objetos-r1.ataque.test.ts test/borrado-duplicado-r1.ataque.test.ts test/gestion-02a-r1.ataque.test.ts test/archivos-d-r1.ataque.test.ts src/adapters/storage/objetos-r2.ataque.test.ts test/objetos-reintento-r2.ataque.test.ts test/borrado-duplicado-r2.ataque.test.ts`

Resultado: `Tests 128 passed (128)` · `Test Files 10 passed (10)`.
- C-3 a C-5, ADM-T1B01 a T1B11 (sin T1B07), C-33, C-34 y las nuevas de esta ronda pasan.
- **ADM-T1B01 no cambia:** ya espera lo que el remedio hace (un `503` por clave fallida; `NoSuchKey` y la respuesta vacía resuelven).

### Archivos `*.ataque` nuevos

| Archivo | Casos | SHA-256 |
|---|---|---|
| `backend/src/adapters/storage/objetos-r2.ataque.test.ts` | ADM-T2B01, T2B02 y T2B03 | `935a721160f978e35d45d2c9392fe8cb169fae32f43b9df583bda46215707e22` |
| `backend/test/objetos-reintento-r2.ataque.test.ts` | ADM-T2B04 | `fd2ae2e9792db81d838580b0ef2769ce8ef08059e3353aa5ab927c62295da9e8` |
| `backend/test/borrado-duplicado-r2.ataque.test.ts` | ADM-T2B05, T2B06 y T2B07 | `b8fc0db0ea3ec7ff2b89cd9e345c57a9b4ef73afe16fb1aa3e6fdf73c27c16a1` |

- Sin cambios desde la ronda 1: `objetos-r1.ataque` `65c1d9d9…` y `borrado-duplicado-r1.ataque` `3520057d…`.
- **V-01:** de las 251 rastreadas, solo cambian las dos de C-33 y C-34. Las otras 249 coinciden con la tabla de la ronda 0 de 01b. En el árbol hay 256: las 251 rastreadas más 5 mías sin rastrear (2 de la ronda 1 y 3 de esta).
- **Lo demás:**
  - No toqué código de producción ni pruebas normales.
  - **N-18:** toda clase de mis archivos nace con un maestro, y las copias con el que se elige.
  - **N-29:** `objetos-reintento-r2` registra sus consumidores en colas propias (`ATAQUE_T2B_*`), y las demás llaman directo a las funciones del worker.
  - **Retenciones:** ninguna prueba nueva retiene filas ni tablas (lección de ADM-T1B07).

### Conteos (con comando)
- `npx vitest list --root backend test/borrado-duplicado-r2.ataque.test.ts test/objetos-reintento-r2.ataque.test.ts src/adapters/storage/objetos-r2.ataque.test.ts`: `grep -a -c "ADM-T2B"` da 7.
- Suite de módulos: 127 archivos y 1453 casos. Son los 124 archivos y 1446 casos de la verificación del manager, más mis 3 archivos y 7 casos.

### Verificación propia (comando y última línea)

| Qué | Comando (desde `backend/`) | Resultado |
|---|---|---|
| lint | `npm run lint` | exit 0; `All matched files use Prettier code style!` y la última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, sin errores |
| suite de módulos | el comando literal de `resumen-programador.md` ("Verificación", 76 rutas de `test/` más `src/workers/ritmo-03c-r1.ataque.test.ts src/adapters/storage src/core`), más `test/borrado-duplicado-r2.ataque.test.ts test/objetos-reintento-r2.ataque.test.ts` (`objetos-r2` entra por `src/adapters/storage`) | `Tests 1453 passed (1453)` · `Test Files 127 passed (127)` (68.95 s), a la primera |

### PA-07 (suite de módulos, salida completa en un archivo)
- **Conteo:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 3 · `"code":"P2028"` 3.
- **Los 3 "Error no controlado"** son los del inventario, todos `ZodError` "La URL del almacén debe ser http o https", en la misma app (pid 7636):
  - `handlers/archivos.ts:62`;
  - `handlers/archivos.ts:97`;
  - `handlers/clases/muro.ts:87`.
- **Los 3 `P2028`** (nivel 40) son los tres deterministas de `servicio-ocupado`, en la misma app (pid 26720):
  - `tx.sesion.findFirst()` desde `handlers/auth/cuentas.ts:202` (cambiar contraseña);
  - `tx.sesion.updateMany()` desde `handlers/auth/index.ts:180` (refrescar);
  - `$queryRawUnsafe` de `encolar` (`adapters/queue/index.ts:63`), desde comentarios.
- **De mis archivos:** ninguno. Mis apps registran en nivel `error`.
- El control positivo y el cotejo con los permitidos se hacen en la corrida completa del manager.

### Hallazgos
Ninguno.

### Atacado sin hallazgos

**Punto 3. T-01 a fondo.** Cliente real de `minio` 8.0.7 contra un servidor S3 falso local (`node:http` en 127.0.0.1). No usé el MinIO de `infra/`.
- **ADM-T2B01, claves que existen mezcladas con ausentes:**
  - Un servidor que ignora `Quiet` y devuelve `<Deleted>` por cada borrada, más `NoSuchKey` o `NotFound` por las ausentes: resuelve.
  - Si además viene un `AccessDenied`, un `SlowDown`, un `<Code>500</Code>` (que el parser lee como número) o un `<Error>` sin `<Code>`: da `503 ALMACEN_NO_DISPONIBLE`, sin la llave, el secreto ni las claves en el mensaje.
- **ADM-T2B02, lote de 1000 claves** (el máximo del esquema de `BORRAR_OBJETOS`):
  - Sale en una sola llamada `DeleteObjects`, con las 1000 claves en orden y sin repetir, y con `<Quiet>true</Quiet>`.
  - Un error en la última clave lanza.
- **ADM-T2B03, reintento tras un `503` por clave:** el segundo intento vuelve a pedir el lote completo y resuelve cuando el almacén ya no reporta errores, o solo reporta `NoSuchKey` por las que ya borró.
- **ADM-T2B04, el mismo reintento por pg-boss de punta a punta,** con una cola propia y el consumidor real (`registrarConsumidoresDeObjetos`):
  - el primer intento falla por un `<Error>` por clave;
  - pg-boss reintenta una sola vez (`retry_count` 1), con las mismas tres claves;
  - el trabajo termina `completed`;
  - su cola de fallidos queda vacía;
  - el secreto no aparece en el log.

**Punto 4. Duraciones con la hora real.** Por grep de `Date.now()`, `new Date()`, `performance.now`, `setTimeout`, `pg_sleep` y cotas `toBeLessThan` en las 15 pruebas y ayudas de 01b, incluidas las mías:
- ADM-1B23 ya acota con `antes` y `despues` (T-02 corregido, sin tolerancia, con razón: comparten proceso y reloj);
- ADM-1B16 mide contra el `timeout` de Prisma, con 9.5 s de margen en el caso que espera éxito;
- lo demás son esperas por condición (`esperarHasta`, el sondeo de `formadas`) o fechas fijas (`duplicado.test.ts:194`).

No queda ninguna duración medida con la hora real sin acotar.

**Punto 5. Lo pendiente.**
- **Carreras sin retención** (`borrado-duplicado-r2.ataque.test.ts`, 4 vueltas cada una):
  - **ADM-T2B05:** duplicar la copia X mientras el worker termina sus copias da `409 CLASE_CON_COPIAS_EN_CURSO` o `201`. Con `201`, las copias nuevas apuntan a archivos de X que existen y tienen objeto.
  - **ADM-T2B06:** borrar la original archivada mientras el worker termina la copia da `409` o `204`. En los dos casos, la copia de X queda `confirmado`, sin `copia_de` y con su objeto. Tras un `409`, el borrado siguiente da `204`.
  - **ADM-T2B07:** descargar el archivo de X mientras se copia da `409 ARCHIVO_EN_COPIA` sin firma, o `200` con la clave de X solo cuando su objeto ya existe.
  - En ningún caso hubo un `500`.
  - **El `P2003`:** no apareció. Cada camino que borra un original pasa por el paso 2 del borrado con la fila de la clase tomada, y `copia_de` solo pasa de nulo a no nulo al crear la copia, bajo el `FOR SHARE` de la original.
- **Lo que se cuela al duplicar, datos fuera del esquema en las tres colas y `confirmar` manipulado:** siguen en verde ADM-T1B08, ADM-T1B10 y ADM-T1B03 de la ronda 1, dentro de la corrida de arriba.

### Observaciones (no son hallazgos)
- **O-R2-1. Un `<Error>` con texto en lugar de hijos se lee como éxito.** `removeObjectsParser` convierte `<DeleteResult><Error>AccessDenied</Error></DeleteResult>` en `["AccessDenied"]`, un texto suelto, y `codigoDeErrorDeBorrado` devuelve `null` para todo lo que no es objeto. Lo comprobé con el parser real; un `<Error/>` vacío ya lo descarta el propio `minio`.
  - No es una respuesta de S3, MinIO ni R2: el protocolo siempre manda `<Error>` con `<Key>`, `<Code>` y `<Message>`. Por eso no lo cuento como hallazgo.
  - Si se quiere que "nunca se lea como éxito" valga también ahí, bastaría con tratar como error todo elemento que no sea `null` ni `undefined`.
- **O-R2-2. ADM-T1B07 sigue sin conservarse** (ronda 1). Ninguna prueba de esta ronda retiene filas ni tablas.

### No atacado y por qué
- **El almacén real (MinIO de `infra/` o R2):** el plan no lo autoriza. Todo T-01 se atacó con el cliente real de `minio` contra un servidor falso local.
- **El frontend:** 01b no tiene.
- **La suite completa y el control positivo de PA-07:** los hace el manager al cerrar la subentrega.

**Veredicto de la ronda 2 de 01b: RESISTE.**

## Ronda 0 — ADMIN-01c

Veredicto: **PARADA**. Apliqué C-9 tal como lo escribe §D-R0 → «Frontend — Enmienda 1» → 01c, y nada más. C-9 queda en rojo por la razón esperada. Pero hace falta **otro cambio en una `*.ataque` que el plan no inventarió**: el diseño de 01c pone en rojo V-07 de `styles/clases-r1.ataque.test.ts` aunque esté bien hecho (P-01c-1). No lo resolví por mi cuenta. Dejo además tres puntos para que la misma enmienda los decida (P-01c-2 a P-01c-4), tres avisos adelantados de 01f y 01g, y las observaciones de trampas para el programador (O-01c-1 a O-01c-14).

Plan: `plan.md`, SHA-256 `e539dbcd877f0da7b2e895dff4d8ac099d400ca1fadd66d9f7b36d0a1838b183` (Enmiendas 1 a 8; lo comprobé al empezar). Base dentro de los paquetes: `52f1c97`. Antes de tocar nada, `git diff 52f1c97 -- frontend backend shared` estaba vacío; después, solo cambia el archivo de C-9.

Verificación propia (regla "Suites por ronda": lo que toco, el módulo, las vigiladas que nombra el plan y `lint`):
- **lint del frontend:** `cd frontend; npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores.
- **test:** el archivo de C-9 (rojo esperado), la suite del módulo `features/clases` y las vigiladas de fuera del módulo. Abajo van las tres corridas.
- No corrí la suite completa del frontend ni la del backend: las corre el manager al cerrar la subentrega. 01c no toca el backend, así que no hay PA-07.

### Entorno y trabajo en paralelo
- **Trabajo en paralelo:** el humano respondió, por el orquestador, que la otra copia de trabajo no se usa.
- **Puerta de carga:** la primera lectura dio 74 % y 69 % (Docker Desktop, ChatGPT, VS Code y procesos de Codex; no terminé ninguno). Esperé con un sondeo cada 10 s hasta dos lecturas seguidas de 25 % o menos y ningún `node` con `vitest`: 13:40:35 `cpu=10` y 13:40:46 `cpu=4`. Corrí una suite después de otra.
- Sin navegadores ni aplicaciones gráficas.

### Cambios (solo C-9)

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-9 | `frontend/src/styles/clases-r1.ataque.test.ts` | V-06: el título y `toHaveLength` pasan de 72 a 76. En la lista fija, `components/tabla-clases-admin.tsx` pasa de 0 a 1 («Restaurar») y entran `components/confirmar-archivado.tsx` 1 («Sí, archivar»), `components/dialogo-borrar-clase.tsx` 1 («Sí, borrar definitivamente»), `components/formulario-duplicar-clase.tsx` 1 («Duplicar clase») y `duplicar-clase-view.tsx` 0, cada uno con su comentario. `clases-admin-view.tsx` sigue en 1 y el resto de `features/clases/components/` sigue en 3. Lo que protege no cambia: ningún `disabled` en JSX, `aria-busy` y `aria-disabled` solo en `Button`, y el número y el lugar de los botones con espera solo cambian con el plan. Sin caracteres invisibles (comprobado con `node`) | `8d8aaf8f82b0f63ad879537a3858438fe2079f9820fb7eb19eff6718b22f802a` → `5b8d13d313b76919009cba7397b69c1253e4301a8ea4758cc9df04c67d67a824` |

Ninguna otra `*.ataque` cambia. No toqué código de producción ni pruebas normales. El hash de antes es el de `git show 52f1c97:frontend/src/styles/clases-r1.ataque.test.ts`.

### Corrida de C-9 (rojo esperado)

Comando, desde `frontend/`: `npx vitest run src/styles/clases-r1.ataque.test.ts`

```
 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
   Start at  13:40:58
   Duration  8.18s (transform 4.12s, setup 478ms, import 5.13s, tests 253ms, environment 2.07s)
```

- El caso "V-06: … 76 enEspera" falla con `expected [ …(72) ] to have a length of 76 but got 72` (`:185`). Solo faltan los cuatro `enEspera=` nuevos. Pasa a verde cuando existan los cuatro archivos y «Restaurar» con las cifras exactas de la lista fija.
- Los otros 10 casos del archivo, en verde. **V-07 sigue en verde hoy**, pero se pone en rojo con el diseño de 01c: ver P-01c-1.

### Línea base del módulo y de las vigiladas (con el código de hoy)

Comando, desde `frontend/`: `npx vitest run src/features/clases`

```
 Test Files  99 passed (99)
      Tests  1759 passed (1759)
   Start at  13:41:16
   Duration  141.10s (transform 39.37s, setup 98.68s, import 296.44s, tests 691.85s, environment 387.39s)
```

Comando, desde `frontend/` (las vigiladas y las estáticas de fuera del módulo que alcanzan a 01c): `npx vitest run src/styles/clases-r1.ataque.test.ts src/app/rutas-02c-r1.ataque.test.tsx src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/adjuntos/errores-ch3.test.ts src/components/layout/estatico-r1.ataque.test.ts src/app/barra-02d-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx`

```
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 206 passed (207)
   Start at  13:43:45
   Duration  24.42s (transform 58.18s, setup 10.07s, import 66.64s, tests 49.47s, environment 40.60s)
```

El único rojo es V-06, el de C-9.

### PARADA

**P-01c-1 (bloquea). V-07 exige que `data-material` y `data-densidad` vivan solo en dos archivos, y ADM-1C09 pide ponerlos en el diálogo de borrar.**
- **La prueba:** `styles/clases-r1.ataque.test.ts`, caso "V-07: vidrio, vidrio fuerte y vidrio azul solo en la lista final del plan (igualdad exacta)", última aserción (`:412-415` después de C-9; `:398-401` en `52f1c97`):
  `expect(rutasDe(coincidencias(/data-material|data-densidad/))).toEqual(["/src/components/layout/contenedor-rol.tsx", "/src/features/calificaciones/gradebook-view.tsx"])`.
  `coincidencias` lee el texto de **todo** archivo `.ts` y `.tsx` de producción de `src/`, comentarios incluidos.
- **El diseño:** §D-10, E-23 y ADM-1C09 piden `data-material="opaco"` y `data-densidad="densa"` en el `DialogContent` de `components/dialogo-borrar-clase.tsx`, comprobado por atributo. El texto `data-material` aparece en ese archivo por fuerza, así que la igualdad exacta falla con el diseño bien hecho: `["…/contenedor-rol.tsx", "…/dialogo-borrar-clase.tsx", "…/gradebook-view.tsx"]` contra la lista de dos.
- **No hay forma limpia de evitarlo:** el atributo tiene que escribirse. Armar la clave por partes, o sacarla de una constante de un archivo fuera de "Se toca" (`contenedor-rol.tsx`), solo burlaría la prueba.
- **Lo que falta en el plan:** §D-R0 → 01c solo trae C-9 (V-06) para este archivo. El grep de la Enmienda 1 nombra `styles/clases-r1.ataque.test.ts` por V-06, pero no por V-07.
- **Propuesta para la enmienda (no la apliqué):** un C-n nuevo, C-9b, sobre la misma aserción. Suma `"/src/features/clases/components/dialogo-borrar-clase.tsx"` en su lugar del orden, con su comentario, y la igualdad sigue exacta. Sigue protegiendo lo mismo: los atributos del contexto solo entran con el plan, y ningún componente se marca opaco por su cuenta.

**P-01c-2 (decisión de diseño para la misma enmienda). El control segmentado de `/admin/clases` y la lista exacta de `vidrio-fuerte`.**
- `DESIGN.md` §7.3, en "Control segmentado de dos botones", dice que el grupo es un "Elemento sobre vidrio" con `vidrio-fuerte`, `rounded-card` y `p-1` cuando va dentro de un panel que ya es una `Card`. El encabezado de `/admin/clases` es una `Card`, y el control va dentro.
- V-07 (`styles/clases-r1.ataque.test.ts`, `vidrioFuerte` con igualdad exacta, `:380-407`) no admite `clases-admin-view.tsx` ni ningún archivo nuevo de 01c.
- Si el programador sigue §7.3 al pie de la letra, V-07 cae. Si no lo sigue, el grupo no tiene `vidrio-fuerte`. §8 dice "Administrador: Opacas, sin vidrio", y en el contexto opaco `vidrio-fuerte` ya vale `--surface`, así que un grupo con `bg-surface` y borde se vería igual sin tocar V-07.
- **Pido que la enmienda lo fije:** o "sin `vidrio`, `vidrio-fuerte` ni `vidrio-azul` en 01c" (el programador no cambia V-07), o un C-n que sume el archivo a `vidrioFuerte`. Sin esa línea, el programador tendría que elegir entre `DESIGN.md` y una `*.ataque`.

**P-01c-3 (recomendación). Una vigilada que sigue en verde pero deja de proteger un caso: `foco-02c-r4.ataque.test.tsx:185`.**
- El uso "/admin/clases" declara `clave: () => ["clases", "admin"]`. El caso "error ya en la caché al montar, sin datos: el foco se queda en <body>" (`:245-255`) siembra el error con `prefetchQuery` **en esa clave exacta**.
- Con 01c, la consulta de la vista pasa a `[...CLAVE_CLASES_ADMIN, estado]`, o sea `["clases", "admin", "activas"]`. El error sembrado queda en otra entrada de la caché. La vista hace su propia primera carga, que también falla (el doble responde `500`), y el caso pasa sin haber probado "error ya en la caché".
- Los demás casos del archivo usan `invalidateQueries` por prefijo y siguen protegiendo lo mismo.
- **Propuesta:** un C-n que cambie `:185` a `["clases", "admin", "activas"]`. Así el caso vuelve a sembrar el error en la clave que lee la vista y no se queda en verde sin probar nada. No es un rojo, así que no bloquea por sí solo, pero conviene resolverlo en la misma enmienda.

**P-01c-4 (aclaración). Dos filas de la matriz de 01c contradicen vigiladas de §D-R0 → 01c.** La matriz es "esperada" y el programador puede corregirla. Pero si la sigue tal cual, cae una vigilada, y eso sería una PARADA suya:
- **"Cargar más clases", columna `5xx` o red: "Un aviso; la lista se queda".** La vigilada `foco-02c-r3.ataque.test.tsx:417-431` pide, ante un `500` de la página siguiente, un `role="alert"` con "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo." y el foco en el `h1` «Clases». Es el comportamiento de hoy: la vista entera pasa a `MensajeError`, y en esa prueba `sonner` está simulado, así que un aviso no pinta ningún `alert`.
- **"Lista de clases (primera página)", columna Foco: "Raíz de la vista si el control enfocado desaparece".** `foco-02c-r4.ataque.test.tsx:178-186`, en sus cinco casos del uso "/admin/clases", y `foco-02c-r3.ataque.test.tsx:417-431` piden el `h1` «Clases» con `tabindex="-1"`, que es lo que hace hoy `useFocoAlPasarAError` con `encabezadoRef`.
- **Pido que la enmienda diga "como hoy" en esas dos celdas**, o que traiga el C-n de las dos vigiladas si de verdad quiere cambiar el comportamiento.

**Avisos adelantados de 01f y 01g (fuera de esta ronda; los dejo para que la enmienda los mire con el mismo grep):**
- **V-07 y los diálogos de 01f y 01g:** E-23 dice que "los de 01f y 01g igual" (`data-material` y `data-densidad` en su `DialogContent`). Los C-n de esas subentregas (C-17 y C-19) solo tocan V-06 del mismo archivo.
- **`features/admin/cuentas-r1.ataque.test.tsx:532`:** el caso "sin modales: ningún archivo de admin usa components/ui/dialog" choca con `dialogo-dar-de-baja.tsx`, `dialogo-restringir-acceso.tsx` (01f) y `dialogo-estado-pago-lote.tsx` (01g). C-13 reescribe ese archivo por `CuentasView`, pero no nombra este caso.
- **`lib/estatico-ch3-r2.ataque.test.ts:135-150`:** el caso "fuera de los diez, ningún archivo de producción de src/ reinicia una mutación condicionado a isError" prohíbe `if (<m>.isError) <m>.reset()` fuera de los diez formularios de T-05. La lista cerrada de 01f suma a CH3-C13 (`errores-de-api-estatico.test.ts`, prueba normal) los formularios nuevos con esa línea, pero ningún C-n de 01f toca esta `*.ataque`, ni su lista `DIEZ` (`:114-133`).

### Observaciones para el programador (trampas; no son hallazgos)

Son lo que pondría en rojo una `*.ataque` o una vigilada aunque el diseño esté bien. Valen una vez resuelta la PARADA.

**O-01c-1 (V-06, C-9). Las cifras son por texto, archivo por archivo.**
- `enEspera=` se cuenta línea por línea en el `.tsx`.
- «Restaurar» va escrito en `components/tabla-clases-admin.tsx`. Si se extrae un componente de fila, sus `enEspera=` caen en "el resto de `features/clases/components/`", que debe sumar exactamente 3 (buscador y roster), y la prueba cae.
- «Cargar más clases» se escribe **una sola vez** en `clases-admin-view.tsx`, aunque haya dos tablas: dos expresiones `enEspera=` dan 77.
- El diálogo de borrar no lleva «Reintentar»: el conteo que falla se recupera cerrando y reabriendo (§D-10).
- La regla `/\sdisabled(=|\s|\/?>|$)/` lee también los comentarios de los `.tsx`. Ni el botón de borrar cuando falla el conteo, ni un comentario que diga "disabled", pueden llevar esa palabra: el botón simplemente no se pinta.
- `aria-busy` y `aria-disabled` solo en `components/ui/button.tsx`: el conteo que carga usa `<Cargando />`, no `aria-busy` en el diálogo.

**O-01c-2 (V-02 a V-05, V-13 y `components/layout/estatico-r1`). Clases y valores.**
- Sin escalas anuladas (`text-sm`, `rounded-lg`, `rounded` solo, `font-semibold`, `shadow-md`), sin colores sueltos ni de la paleta, sin `ring-` ni `focus:`, y `outline-none` solo en `dialog.tsx`.
- Sin texto rojo (`text-destructive` o `text-danger`) en ningún `.tsx` nuevo. "No se puede deshacer." va en el color normal, y los errores del diálogo van en `MensajeError`.
- Ningún valor arbitrario entre corchetes fuera de `components/ui/` que no esté en la lista exacta (`components/layout/estatico-r1.ataque:138-158`): nada de `max-w-[…]`, `w-[…]` o `translate-x-[…]`. Con dos opciones, el indicador del control segmentado usa `translate-x-full`, y en el contexto opaco `in-data-[material=opaco]:…`, que ya está en la lista.
- Nada de `fixed` en los `.tsx` nuevos (V-16) ni de `animate-` (V-15).

**O-01c-3 (`clases-admin-02c-r1.ataque:249-285`, nombres hostiles). El nombre de la clase no puede ser un nodo de texto propio fuera de un enlace.**
- El caso cuenta `within(tabla).getAllByText(nombre)` fuera de `<a>` y exige **1**: la celda.
- "Abrir" y "Duplicar" son enlaces, así que su `sr-only` con el nombre no cuenta.
- Pero si «Archivar» (o «Restaurar» y «Borrar definitivamente», en "Archivadas") copia el patrón de "Abrir" con `<span className="sr-only">{clase.nombre}</span>` dentro de un `<button>`, ese `span` coincide y la cuenta da 2. También con un espacio delante: `getByText` recorta.
- Para nombrar el botón con la clase sin romperla, el `sr-only` del botón no puede tener como texto propio solo el nombre. Por ejemplo, el verbo y el nombre en el mismo nodo, desde `data.ts`.
- La misma prueba exige la regla de corte (`wrap-anywhere` o equivalente) en la celda del nombre.

**O-01c-4 (`clases-admin-02c-r1.ataque:122-151` y `clases-admin-view.test.tsx`, PR-2C03). El foco de «Cargar más clases» va al «Abrir» de la primera fila nueva.**
- Hoy lo busca con `document.querySelector('[data-clase-id="…"] a')`: el **primer** enlace de la fila. Si «Duplicar» (enlace) va antes que «Abrir», el foco cae en «Duplicar» y la prueba falla. «Abrir» sigue siendo el primer enlace de la fila, o la búsqueda apunta a él.
- `getAllByRole("link", { name: /^Abrir / })` debe dar exactamente una fila por clase: ningún otro enlace puede empezar con "Abrir ".
- El atributo `data-clase-id` de la fila no se quita.

**O-01c-5 (vigiladas de foco, P-01c-4).** Mientras la enmienda no diga otra cosa, el error de la lista (primera carga, recarga y página siguiente con `5xx`) sigue reemplazando la vista con `MensajeError` (`role="alert"`) y lleva el foco al `h1` «Clases» (`tabindex="-1"`) cuando el foco estaba dentro. El `400` del cursor sigue mostrando "La lista cambió mientras la veías. Vuelve a abrirla para verla completa." en un `role="alert"`, sin "cursor" ni "no es válido" en el texto.

**O-01c-6 (claves de la consulta).**
- `CLAVE_CLASES_ADMIN` conserva su valor `["clases", "admin"]`. Las vigiladas invalidan por ese prefijo (`foco-02c-r3:478`, `foco-02c-r4:210-214`), y la clave de cada estado tiene que empezar por él.
- `useFocoAlPasarAError` recibe hoy `CLAVE_CLASES_ADMIN.join("/")` como llave de reinicio. Si la vista cambia de estado sin desmontarse, esa llave también debe cambiar por estado (estado vecino: cambiar de pestaña con un error en pantalla).

**O-01c-7 (`?estado=` y `useAlPulsarLaSeccionActiva`).**
- El gancho de `components/seccion/hooks.ts` corre con **cualquier** `location.key` nueva en la misma ruta, y cambiar `?estado=` con `setSearchParams` o un `Link` crea una. Si la vista lo usa (ADM-1C12 a), cambiar de "Activas" a "Archivadas" también lo dispara.
- No escribas `?estado=activas` al montar: que falte vale "Activas". Escribirlo con `replace` crea otra `key` al entrar, y las pruebas existentes cuentan las peticiones de la lista (`clases-admin-view.test.tsx:165`, la primera llamada exacta; `clases-admin-02c-r1`, `cargar-mas-02c-r2`: una sola petición con cursor).
- La URL de la primera página es exactamente `/api/admin/clases?estado=activas&limite=50`, con `estado` primero (lista cerrada).

**O-01c-8 (`estatico-02c-r1.ataque:99-158`).**
- Ninguna vista nueva llama a `perspectivaDeRuta(` (la lista es exacta) ni compara `pathname` con un prefijo. `/admin/clases` y la vista de duplicar ya saben que son del admin por su ruta.
- El enlace "Crear clase" (`to="/admin/clases/nueva"`) se queda en `clases-admin-view.tsx`. Si pasa a otro componente, la prueba cae.
- Ningún texto nuevo, tampoco en `data.ts`, puede ser `"Crear clase"` ni `"Editar clase"`: la lista de esas cinco líneas de `data.ts` es exacta.

**O-01c-9 (`ver-mas-01e-r3.ataque:291-338`, sobre `features/clases/hooks.ts`, `lib.ts` y `data.ts`).** Ningún `type` ni `interface` que no sea de Props en esos tres archivos, por ejemplo el estado de la lista (`"activas" | "archivadas"`) o el `pageParam` con `cursorArchivadaEn`: van en `types.ts`, como pide la Enmienda 5. Tampoco valores arbitrarios con medida ni importaciones de `@/features/`.

**O-01c-10 (`estatico-r1.ataque` de `features/clases`).** Sin `?? []` (tampoco al unir páginas: `unirPaginasSinRepetidas` recibe las páginas que ya llegaron) y sin ternarios anidados dentro de JSX en todo el módulo.

**O-01c-11 (errores, `features/clases/errores-ch3-r1.ataque` y `lib/estatico-ch3-r1` y `-r2`).**
- Los cinco códigos nuevos (`CLASE_YA_ARCHIVADA`, `CLASE_NO_ARCHIVADA`, `CLASE_CON_COPIAS_EN_CURSO`, `CONFIRMACION_REQUERIDA` y `CLASE_ARCHIVADA`) entran a `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` y la vigilada `:273-292` los recorre solos. Con texto, `mensajeDeErrorClases` y `mensajeDeConsultaClases` lo devuelven **tal cual**, también "nombre: Ya hay un tema" y "x: y: z". Sin texto visible, dan el genérico. Si uno de ellos gana además un texto fijo propio en la traducción del módulo, la prueba cae.
- En `features/clases` y `features/calificaciones`, la cadena `.message` no puede aparecer, **ni en un comentario**, salvo `incidencia.message` y el `exec` de la fila de categorías (`:449-468`, texto crudo). Tampoco `.split(":")`, `new RegExp(` ni `\p{L}`.
- En todo `src/`, `if (<m>.isError) <m>.reset()` solo existe en los diez formularios de T-05 (`estatico-ch3-r2:135-150`). El formulario de duplicar y el diálogo de borrar no pueden usar esa línea. El patrón de `features/clases` es el error del servidor en un estado del formulario (CLAUDE.md, "Formularios"), o `reset()` sin condición dentro de un manejador. Nunca en el render.
- `esErrorDeCursor` no se define de nuevo ni se pasa como referencia a `map`, `filter`, etc.

**O-01c-12 (`lib/unir-paginas.ts`).** Las estáticas que recorren todo `src/` lo alcanzan: no importa de `@/features/` (`refactor-01c-r1.ataque:419-425`), no lee `.message`, no usa `?? []` ni `console.`, y no lleva caracteres invisibles literales (`estatico-ch3-r2:68`).

**O-01c-13 (`components/adjuntos/data.ts`).** `ARCHIVO_EN_COPIA` entra en `MENSAJES_POR_CODIGO_DE_ARCHIVO` (lista cerrada: `reexportaciones-01c.test.ts:139-145`). El archivo está en `MOVIDOS` de `refactor-01c-r1.ataque:391-418`: sin `?? []`, `fetch(`, `console.`, `dangerouslySetInnerHTML`, `target=_blank` ni importaciones de `features/`, sin contar los comentarios.

**O-01c-14 (contexto opaco, `clases-admin-02c-r1.ataque:428-462`, `marco-r1.ataque:388-398`).** En `/admin/clases` y en las pantallas de una clase del admin debe haber **un solo** elemento con `data-material` o `data-densidad` mientras el diálogo esté cerrado. El `DialogContent` solo se monta abierto (sin `forceMount`), y la confirmación de archivar, en línea, no lleva esos atributos. Todo botón, enlace, encabezado y campo de esas pantallas, incluido el control segmentado, cuelga del contenedor del rol.

### V-01: SHA-256 de todas las `*.ataque` (base para el programador de 01c)

Son 256 archivos: 101 del backend y 155 del frontend, todos rastreados desde `52f1c97` (`git ls-files`; ninguno sin rastrear).

- **Comprobación de entrada:** antes de tocar nada, las 256 coincidían con la base que fijó el orquestador: las 251 filas de la tabla de la ronda 0 de 01b (`reporte-tester.md:822-1077`, lista `24fb3fe3…`), con C-33 `gestion-02a-r1` en `73c55120…` y C-34 `archivos-d-r1` en `f76ce520…` (ronda 2 de 01b y revisión final de 01b), más `objetos-r1` `65c1d9d9…`, `borrado-duplicado-r1` `3520057d…`, `objetos-r2` `935a7211…`, `objetos-reintento-r2` `fd2ae2e9…` y `borrado-duplicado-r2` `b8fc0db0…`. `sha256sum -c` no dio diferencias, y la lista de rutas coincide exactamente con `git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'`.
- **Después de C-9:** solo cambia `frontend/src/styles/clases-r1.ataque.test.ts`. Las otras 255 son idénticas a `52f1c97`.
- **Lista:** `sha256sum` de la lista de abajo en formato `sha256sum -c` (`<hash>  <ruta>`, una por línea, en este orden): `e1c89304b3599cefad8f1f90fc22d49903081a678fab7ca85520ec963a14a3cd`.

| Archivo | SHA-256 |
|---|---|
| `backend/src/adapters/storage/objetos-r1.ataque.test.ts` | `65c1d9d9e6cea8ba8cf98bc522c6ba6d7122376d0201ccf3fc3048d24b60543f` |
| `backend/src/adapters/storage/objetos-r2.ataque.test.ts` | `935a721160f978e35d45d2c9392fe8cb169fae32f43b9df583bda46215707e22` |
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
| `backend/test/archivos-d-r1.ataque.test.ts` | `f76ce52002e295f2bda6e7a7a7f796415e08013e6d4c1fbe2c9c686671fe8252` |
| `backend/test/archivos-d-r2.ataque.test.ts` | `1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9` |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` |
| `backend/test/arranque-r1.ataque.test.ts` | `38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716` |
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` |
| `backend/test/autoria-02b-r1.ataque.test.ts` | `6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713` |
| `backend/test/borrado-duplicado-r1.ataque.test.ts` | `3520057d0f1a27739eaa701aacd9c18d5c0728fc6a3d55374f43f63a5e6f5336` |
| `backend/test/borrado-duplicado-r2.ataque.test.ts` | `b8fc0db0ea3ec7ff2b89cd9e345c57a9b4ef73afe16fb1aa3e6fdf73c27c16a1` |
| `backend/test/calificaciones-01a-r1.ataque.test.ts` | `5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9` |
| `backend/test/calificaciones-01a-r2.ataque.test.ts` | `afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc` |
| `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` | `dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416` |
| `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` | `b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07` |
| `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` | `29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869` |
| `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` | `6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e` |
| `backend/test/categorias-01a-r1.ataque.test.ts` | `6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db` |
| `backend/test/clases-archivadas-r1.ataque.test.ts` | `f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2` |
| `backend/test/clases-archivadas-r2.ataque.test.ts` | `62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933` |
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
| `backend/test/gestion-02a-r1.ataque.test.ts` | `73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a` |
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
| `backend/test/lecturas-fx-r1.ataque.test.ts` | `82fe8c49674a3cc8328e7951236c0c8f442fcba3890b716013369785b202cf40` |
| `backend/test/lecturas-fx-r2.ataque.test.ts` | `b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea` |
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
| `backend/test/objetos-reintento-r2.ataque.test.ts` | `fd2ae2e9792db81d838580b0ef2769ce8ef08059e3353aa5ab927c62295da9e8` |
| `backend/test/recursos-clases03a-r1.ataque.test.ts` | `42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d` |
| `backend/test/recursos-clases03a-r2.ataque.test.ts` | `ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516` |
| `backend/test/referencias-01b-r1.ataque.test.ts` | `ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21` |
| `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` | `6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5` |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `71c54a113611a3097baa03691f316f5e3d49dbe6532d058a453aaf0641434db1` |
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
| `frontend/src/styles/clases-r1.ataque.test.ts` | `5b8d13d313b76919009cba7397b69c1253e4301a8ea4758cc9df04c67d67a824` |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582` |

### Cierre de la ronda 0 de 01c

- **Veredicto: PARADA** por P-01c-1: el diseño de 01c (ADM-1C09, E-23) pone en rojo V-07 de `styles/clases-r1.ataque.test.ts`, y §D-R0 → 01c no trae el C-n. La enmienda también debería decidir P-01c-2 (`vidrio-fuerte` en el control segmentado), P-01c-3 (`foco-02c-r4:185`) y P-01c-4 (dos celdas de la matriz contra vigiladas), y conviene que mire los tres avisos de 01f y 01g.
- Cuando la enmienda llegue, aplico los C-n nuevos sobre esta misma base, los corro y dejo la ronda 0 lista para el programador. C-9 ya está aplicado y no cambia.
- No toqué código de producción, pruebas normales ni ninguna `*.ataque` fuera de C-9.

### Tras la Enmienda 9

Veredicto: **PARADA**, otra vez y más chica. Apliqué C-9b, C-9c y C-9d tal como los escribe §D-R0 → 01c ("Enmienda 9 — C-n nuevos de 01c"). C-9, C-9b y C-9c quedan en rojo solo por lo que falta implementar, como dice el plan. **C-9d no cumple lo que el plan espera de él:** el plan dice "verde antes y después", y con el código de hoy tres casos de `foco-02c-r4.ataque.test.tsx` pasan a rojo (P-01c-5). No resolví la diferencia por mi cuenta. Dejé C-9d aplicado tal como está escrito, para que la decisión se tome sobre el árbol real.

Plan: `plan.md`, SHA-256 `9e678ef4d34af4fa5990e396c0d1f13f941e303998b188240a42e9aa32556f26` (Enmiendas 1 a 9; lo comprobé al reanudar). Leí también `revision.md`, "## Verificación de la Enmienda 9 — ADMIN-01" (N-01 a N-03). Base: la misma, `52f1c97`. Antes de reanudar, el árbol tenía solo C-9 (`5b8d13d3…`) y `foco-02c-r4` estaba en `1d2bfe93…`, el hash de `52f1c97`.

#### Entorno
- **Puerta de carga:** antes de la primera corrida hubo varias lecturas sobre 25 %, hasta que salieron dos seguidas de 25 % o menos: 14:19:13 `cpu=14` y 14:19:24 `cpu=13`, sin ningún `vitest`. Antes de la suite del módulo: 14:20:50 `cpu=1` y 14:21:01 `cpu=6`. Corrí una suite después de otra y no terminé ningún proceso ajeno.
- La otra copia de trabajo no se usa. Sin navegadores.

#### Cambios

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-9, C-9b y C-9c | `frontend/src/styles/clases-r1.ataque.test.ts` | **C-9** (ya aplicado): V-06 de 72 a 76. **C-9c:** la lista `vidrioFuerte` de V-07 suma `"/src/features/clases/clases-admin-view.tsx"` entre `panel-anuncios.tsx` y `bloque-destacado.tsx`, con su comentario (§7.3 y §D-10). Quedan 12 rutas, con igualdad exacta. **C-9b:** la última aserción de V-07 pasa a `["/src/components/layout/contenedor-rol.tsx", "/src/features/calificaciones/gradebook-view.tsx", "/src/features/clases/components/dialogo-borrar-clase.tsx"]`, con su comentario (E-23: el `DialogContent` se monta en el portal). El vidrio sin variante y el vidrio azul no cambian. Sin caracteres invisibles (comprobado con `node`) | `8d8aaf8f82b0f63ad879537a3858438fe2079f9820fb7eb19eff6718b22f802a` (`52f1c97`) → `5b8d13d313b76919009cba7397b69c1253e4301a8ea4758cc9df04c67d67a824` (C-9) → `550ccd969fe3dc3735933656583c99f5c18d1f4e32668585293c5a337083d53d` (C-9, C-9b y C-9c) |
| C-9d | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | `:185` pasa de `clave: () => ["clases", "admin"]` a `clave: () => ["clases", "admin", "activas"]`, con un comentario de tres líneas antes. Nada más cambia. Sin caracteres invisibles | `1d2bfe93db13219086246e21307223229a89416484a09ac69da14460e54e47bb` (`52f1c97`) → `0165d4e27b1fff9230d17bec740d89c380b6f322923c7e5a044ac010f4b9358b` |

`git diff --name-only 52f1c97 -- frontend backend shared` lista solo estos dos archivos. No toqué código de producción ni pruebas normales.

#### Corridas

1. **C-9d antes del cambio** (línea base, con C-9, C-9b y C-9c ya aplicados en el otro archivo): `npx vitest run src/features/clases/foco-02c-r4.ataque.test.tsx` da `Test Files 1 passed (1)` y `Tests 30 passed (30)` (14:19:31).
2. **Los dos archivos tocados, después:** `npx vitest run src/features/clases/foco-02c-r4.ataque.test.tsx src/styles/clases-r1.ataque.test.ts` da `Test Files 2 failed (2)` y `Tests 5 failed | 36 passed (41)` (14:19:52, 18.80s).
   - **V-06 (C-9):** `expected [ …(72) ] to have a length of 76 but got 72`. Es el rojo esperado.
   - **V-07 (C-9c):** `expected [ …(11) ] to deeply equal [ …(12) ]`. Solo falta `clases-admin-view.tsx`. Es el rojo esperado.
   - **V-07 (C-9b):** su aserción va después de la de `vidrioFuerte` dentro del mismo caso, así que esta corrida no llega a ella. Su rojo está garantizado: hoy solo `contenedor-rol.tsx` y `gradebook-view.tsx` contienen `data-material` o `data-densidad` en el código de producción de `src/` (grep), y la lista exige además `dialogo-borrar-clase.tsx`, que no existe. Pasa a verde cuando ese archivo exista con los dos atributos y el control segmentado lleve `vidrio-fuerte`.
   - **`foco-02c-r4` (C-9d), tres casos del uso "/admin/clases":** "recarga que falla tras tener datos…" (`:267`), "dos fallos seguidos…" (`:290`) y "éxito, error, éxito, error…" (`:310`). Los tres fallan con `Unable to find an element with the text: No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.` Ver P-01c-5.
3. **Módulo:** `npx vitest run src/features/clases` da `Test Files 1 failed | 98 passed (99)` y `Tests 3 failed | 1756 passed (1759)` (14:21:04, 158.87s). Los tres rojos son los de C-9d; el resto, incluidas las vigiladas nuevas de la Enmienda 9 dentro del módulo (`foco-02c-r3:417-483`, `clases-admin-02c-r1:428-462`, `errores-ch3.test.ts:264-281` y `estatico-03c1-r1:93-97`), en verde.
4. **Vigiladas de fuera del módulo:** los mismos 11 archivos de la corrida anterior, que ya incluyen las de la Enmienda 9 (`lib/estatico-ch3-r2:135-150`, `components/layout/estatico-r1:102-112` y `:138-158`, `app/marco-r1:388-398`, y V-05 y V-13 de `styles/clases-r1`). Dan `Test Files 1 failed | 10 passed (11)` y `Tests 2 failed | 205 passed (207)` (14:23:50). Los dos rojos son V-06 y V-07, los esperados.
5. **lint del frontend:** `npm run lint` → exit 0.

#### PARADA

**P-01c-5. C-9d no da "verde antes y después": con el código de hoy pone en rojo tres casos.**
- **Lo que dice el plan:** "Debe esperar: verde antes y después." Y también: "Las recargas de `:263-311` invalidan por prefijo y no cambian."
- **Lo que pasa:** las recargas no usan una clave propia. Llaman a `recargar(cliente, uso.clave(CLASE_A))` (`:263`, `:274`, `:286`, `:291`, `:295`, `:306` y `:311`), que hace `invalidateQueries({ queryKey: uso.clave(…) })`. Con C-9d esa clave es `["clases", "admin", "activas"]`, y la consulta de la vista de hoy está en `["clases", "admin"]`. Una clave más larga no es prefijo de una más corta: la invalidación no alcanza la consulta, la vista no vuelve a pedir y el texto de error nunca aparece.
- **Con 01c implementado:** la consulta pasa a `["clases", "admin", "activas"]` y la invalidación vuelve a alcanzarla, así que los tres casos pasan a verde. C-9d protege lo que el plan quiere: "error ya en la caché" vuelve a sembrar en la clave que lee la vista. Solo es falsa la expectativa de "verde antes". En la práctica, C-9d es un rojo esperado más, como C-9, C-9b y C-9c.
- **Decisión que pido** (no la tomé):
  - (a) Aceptar C-9d como está, con el rojo esperado de esos tres casos hasta que 01c cambie la clave. Es lo que hay hoy en el árbol.
  - (b) Dejar `clave` en `["clases", "admin"]` para las recargas y sembrar el error en `["clases", "admin", "activas"]` solo en `:245-255`. Eso cambia más líneas de las que fija C-9d, así que necesita su propio texto.
- **Para el programador**, si se acepta (a): los tres casos de `foco-02c-r4` son un rojo esperado de 01c y pasan a verde con la clave `[...CLAVE_CLASES_ADMIN, estado]`. Si la clave de "Activas" fuera otra (por ejemplo, el estado antes del prefijo), seguirían en rojo.
- Mi comentario de C-9d repite la frase del plan "las recargas invalidan por prefijo, como antes". Si se decide (a), es cierto con el código de 01c (la clave de "Activas" es la clave completa de la consulta); si se decide (b), el comentario cambia con el nuevo texto.

#### Observaciones que cambian
- **O-01c-5** queda confirmada por la Enmienda 9: la matriz de 01c dice "como hoy" en sus dos celdas. Un error de la lista o de "Cargar más clases" reemplaza la vista con `MensajeError` y no lanza un aviso. El foco va al `h1` «Clases» solo si la lista ya tenía datos y el foco se perdió; una primera carga que falla no mueve el foco.
- **O-01c-6** se amplía con C-9d. La clave de "Activas" es exactamente `["clases", "admin", "activas"]`: `foco-02c-r4` siembra y recarga con ella. El detalle menor del manager sigue: `useFocoAlPasarAError` hoy recibe `CLAVE_CLASES_ADMIN.join("/")`, y al cambiar de pestaña sin desmontar, esa llave debe llevar el estado.
- **O-01c-2 y O-01c-14** cambian por C-9b y C-9c.
  - El control segmentado sigue §7.3 al pie de la letra (§D-10, Enmienda 9):
    - `vidrio-fuerte`, `rounded-card` y `p-1`, escritos en `clases-admin-view.tsx`, nunca en un componente nuevo;
    - indicador `aria-hidden` `w-1/2`, con `rounded-row`, `bg-surface` e `in-data-[material=opaco]:bg-accent-soft`, que pasa a `translate-x-full` en "Archivadas" y lleva `motion-reduce:transition-none`;
    - dos botones `ghost` `size="sm"` con `aria-pressed` y `Check` delante del texto del presionado.
  - Sin corchetes nuevos (`estatico-r1:138-158`). `w-1/2` no lo atrapa la regla `w-1/[45]` de CL3-R1-35.
  - `Dialog`, `DialogContent`, `data-material` y `data-densidad` se escriben **solo** en `components/dialogo-borrar-clase.tsx`. `tabla-clases-admin.tsx` no importa `components/ui/dialog` ni escribe esos atributos, ni siquiera en un comentario, porque V-07 lee el texto con comentarios. Sin `forceMount`.
- **O-01c-11** se precisa con la Enmienda 9.
  - El formulario de duplicar traduce sus errores de campo con `erroresDeLaClaseDeApi(error, "duplicar")` de `lib.ts`, sin cambiar su cuerpo, y con `CAMPOS_PINTADOS_DE_LA_CLASE.duplicar = ["nombre", "maestroIds"]` en `data.ts`.
  - `formulario-duplicar-clase.tsx` no llama a `erroresDeFormularioClases(` ni escribe su propia lista de campos (CH3-B15 (4), `errores-ch3.test.ts:264-281`, vigilada). `descripcion:` es el campo pintado solo en otro modo.
  - La lista cerrada suma CH3-B15 (1) a (3) de `errores-ch3.test.ts` (`:178-205` y `:252-256`), con exactamente lo que fija §D-R0. Nada más del archivo cambia.
  - La confirmación de archivar, «Restaurar» y el diálogo de borrar llaman a `reset()` sin condición dentro del manejador que abre, cierra o cancela; nunca `if (<m>.isError) <m>.reset()` ni en el render.

#### Observación nueva para el programador (N-02 del manager)

**O-01c-15. Para elegir un texto por código: el predicado en `lib.ts` y el texto en `data.ts`.**
- Cuando una vista pinta un `MensajeError` distinto según el código del error (por ejemplo, un `404` o un `403` frente al error genérico de la lista), `lib.ts` da solo un **predicado** por código, del tipo "¿es este caso?". La vista hace el retorno temprano por caso y pasa a `mensaje` un texto fijo de `data.ts`.
- `lib.ts` nunca devuelve el texto (`mensaje={textoDe(error)}`): esa forma no la admiten las estáticas de los mensajes. El manager lo marcó para `features/admin` (C-36 de 01f), y en `features/clases` choca con O-05 de `errores-ch3-r1.ataque:449-468` si toca `.message`.
- En 01c aplica a:
  - la lista de `/admin/clases`: hoy `esErrorDeCursor(…) ? TEXTOS_CLASES_ADMIN.cambioMientrasLasVeias : TEXTOS_CLASES_ADMIN.error`, que ya es un predicado y dos textos de `data.ts`;
  - el texto de recuperación del conteo de borrado;
  - la vista de duplicar, si distingue "sin acceso" (`TEXTOS_DE_LA_CLASE`) del error genérico.

#### Avisos de 01f y 01g

La Enmienda 9 los recoge (C-n de 01f y 01g y sus listas cerradas). Quedan fuera de esta ronda; los miro en la ronda 0 de cada una, con N-01 y N-03 del manager.

#### V-01 tras la Enmienda 9
- 256 `*.ataque` (101 del backend y 155 del frontend), todas rastreadas y ninguna sin rastrear.
- Contra la tabla de la ronda 0 de 01c de arriba (lista `e1c89304…`), solo cambian dos filas: `styles/clases-r1` (`5b8d13d3…` → `550ccd96…`, C-9b y C-9c) y `foco-02c-r4` (`1d2bfe93…` → `0165d4e2…`, C-9d). Las otras 254 son idénticas a `52f1c97`.
- `sha256sum -c` no da diferencias, y la lista de rutas coincide exactamente con `git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'`.
- **Lista vigente** (las 256 filas de la tabla de arriba con esas dos filas cambiadas; formato `sha256sum -c`, mismo orden): `ac79306abdf63ad495a3a985f01cc18f142f380b94b27f35e70316f872696c03`.

| Archivo (solo las filas que cambian) | SHA-256 vigente |
|---|---|
| `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | `0165d4e27b1fff9230d17bec740d89c380b6f322923c7e5a044ac010f4b9358b` |
| `frontend/src/styles/clases-r1.ataque.test.ts` | `550ccd969fe3dc3735933656583c99f5c18d1f4e32668585293c5a337083d53d` |

#### Cierre tras la Enmienda 9
- **Veredicto: PARADA** por P-01c-5: C-9d se aplicó tal como está escrito, pero su resultado no es el que el plan espera ("verde antes y después").
- **Si se decide (a)**, la ronda 0 queda lista para el programador sin más cambios míos. El rojo esperado completo sería: V-06 (C-9), V-07 (C-9c y, detrás, C-9b) y los tres casos del uso "/admin/clases" de `foco-02c-r4` (C-9d).
- **Si se decide (b)**, aplico el texto nuevo y repito las corridas de esta subsección.

## Ronda 1 — ADMIN-01c

Veredicto: **ROTO**. Hay tres hallazgos: dos de severidad media y uno baja. Seis casos nuevos en rojo los demuestran. No hay regresiones: todo lo que estaba en verde sigue en verde, y mis pruebas anteriores del encargo pasan.
Verificación propia: lint exit 0 · suite de módulos (comando literal del resumen, más mi archivo nuevo) `Tests 6 failed | 2473 passed (2479)`. Los 6 rojos son los míos de abajo.

Plan: `plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78` (Enmiendas 1 a 10; lo comprobé al empezar). Leí el resumen del programador ("ADMIN-01c — Implementación", con su matriz) y la verificación del manager ("Verificación del resumen — ADMIN-01c — implementación", con sus ocho puntos de ataque). Base dentro de los paquetes: `52f1c97`. Ataqué el árbol entregado; no toqué código de producción ni pruebas normales ni del programador.

### Entorno
- **Puerta de carga:** la apliqué antes de cada corrida con mi script del scratchpad: dos lecturas de 25 % o menos y ningún `vitest`. Las lecturas: 16:00:36 `cpu=2` y 16:00:48 `cpu=6`; 16:02:28 `cpu=21` y 16:02:40 `cpu=20`; 16:06:36 `cpu=19` y 16:06:47 `cpu=23`. Una excepción: una corrida de 2 casos (`-t "N-01c-2"`) la lancé sin repetir la puerta. Su resultado no se reporta como cifra; la corrida que vale es la de módulos de las 16:06:49.
- La otra copia de trabajo no se usa. Sin navegadores ni aplicaciones gráficas.

### Regresiones (antes de atacar lo nuevo)
Mis pruebas anteriores del encargo, del lado del frontend, por ruta: `src/styles/clases-r1.ataque.test.ts` (C-9, C-9b y C-9c) y `src/features/clases/foco-02c-r4.ataque.test.tsx` (C-9d). Las dos entran en la suite de módulos y están en verde: los cinco rojos esperados de la ronda 0 ya pasan con el código de 01c. Las del backend de 01a y 01b no cambian, porque 01c no toca el backend: no las corrí (regla de suites por ronda).

### Archivo nuevo

| Archivo | Casos | SHA-256 |
|---|---|---|
| `frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx` | 23 (`ADM-T1C01` a `ADM-T1C19`; `ADM-T1C12` son 4 y `ADM-T1C15` son 2) | `1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65` |

- Monta `Providers` de `app/providers.tsx` y el router real (`rutas` de `app/router`), con un servidor en memoria que guarda el estado de las listas, más un manejador por caso.
- Sin selectores de clases de estilo y sin reloj: ningún caso compara fechas ni textos relativos al tiempo.
- Ninguna otra `*.ataque` cambió en esta ronda.

### Conteos y corridas (desde `frontend/`)
- `npx vitest list src/features/clases/clases-admin-01c-r1.ataque.test.tsx`, contado con `grep -a -c "ADM-T1C"`: **23**.
- **lint:** `npm run lint` → exit 0, con `All matched files use Prettier code style!` y `> tsc -b` sin errores. Mi archivo se formateó con `npx prettier --write` sobre ese archivo solo.
- **Suite de módulos**, con el comando literal del resumen: `npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx`. Mi archivo cae dentro de `src/features/clases`.
  ```
   Test Files  1 failed | 133 passed (134)
        Tests  6 failed | 2473 passed (2479)
     Start at  16:06:49
     Duration  140.94s
  ```
  Son 2456 + 23 = 2479. Los 6 rojos son ADM-T1C01, 02, 06, 07, 08 y 19, todos de mi archivo. Los 2456 del programador y de las vigiladas siguen en verde, y en la salida no hay avisos de claves repetidas de React.
- Una corrida anterior de la misma suite, a las 16:02:42 y con la puerta cumplida, todavía sin T1C18 ni T1C19, dio `5 failed | 2472 passed (2477)`.

### V-01
- Las 256 `*.ataque` rastreadas coinciden con la lista vigente `ac79306a…` de la ronda 0 ("Tras la Enmienda 9"): `sha256sum -c` no da diferencias. El programador no tocó ninguna.
- El árbol suma la mía nueva, sin rastrear: **257** en total.

## Hallazgos

### T-01 — Una clase que otra pestaña ya borró se queda en «Archivadas»: la frase del conteo no se puede cumplir y el borrado deja la fila para siempre (N-01c-1)
Severidad: media
Prueba: `frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx`, casos "ADM-T1C01: el conteo responde 403 SIN_ACCESO_A_LA_CLASE: …" y "ADM-T1C02: «Sí, borrar definitivamente» responde 403 SIN_ACCESO_A_LA_CLASE (otra pestaña ya la borró): …".

**Escenario.** El admin tiene `/admin/clases?estado=archivadas` con «Clase 5» y «Clase 6». Otra pestaña borra «Clase 5». El servidor responde `403 SIN_ACCESO_A_LA_CLASE` a todo lo de esa clase: para el admin, una clase inexistente da ese código (PR-2A06).

**Esperado:**
- **ADM-T1C01:** el diálogo dice "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.". Al cerrarlo, la promesa debe poder cumplirse, y la fila de una clase que ya no existe sale de la lista.
- **ADM-T1C02:** si «Sí, borrar definitivamente» recibe ese `403`, la fila tampoco se queda.

**Obtenido:**
- La fila sigue ahí: `la fila de la clase que ya no existe sigue ofreciendo «Borrar definitivamente»` (`:262`) y `… se queda en «Archivadas»` (`:296`).
- Cerrar y volver a abrir pide otra vez el conteo, que da el mismo `403` y la misma frase: un ciclo sin salida.
- Pulsar «Clases», cambiar de pestaña o ir y volver no la quitan, porque `useRecuperarListaDeClasesAdmin` solo vuelve a pedir una lista **en error** y esta lista está sana.
- Ir a otra sección y regresar tampoco la quita antes de que venzan los 30 s del `staleTime`.
- La única salida es pulsar «Restaurar» en esa fila: recibe el mismo `403` y renueva la lista (decisión 3 del resumen), pero nada en la interfaz lo sugiere.

**Causa en el código:**
- `esCambioDeLaClaseEnGestion` (`lib.ts`) renueva las listas ante `CLASE_YA_ARCHIVADA`, `CLASE_NO_ARCHIVADA` y `SIN_ACCESO_A_LA_CLASE`. Solo lo usan `useArchivarClase` y `useRestaurarClase`.
- `useConteoDeBorrado` y `useBorrarClase` no lo usan: es el hermano de la decisión 3 que no se extendió, como anticipó el manager.

**Requisito o regla violada:** `AGENTS.md`, "Toda frase de recuperación… prueban que la acción prometida funciona por cada camino" (la frase del conteo, §D-10 y ADM-1C06), y la matriz de 01c: el `403` de una clase que ya no está cae en "`5xx`, red u otro" y muestra una frase que no se cumple.

**Nota, sin hallazgo propio:** con `409 CLASE_NO_ARCHIVADA` en el `DELETE` (otra pestaña la restauró), la fila también se queda en «Archivadas». En ese caso la matriz del plan dice "en el diálogo" y no pide renovar, y el conteo de esa fila ya muestra el texto del servidor. Lo dejo para que el remedio de T-01 decida si lo incluye. No escribí caso para eso.

### T-02 — Una acción en vuelo se puede mandar dos veces cuando su fila o su confirmación se desmonta y se vuelve a montar
Severidad: media
Prueba: `frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx`:
- "ADM-T1C06: «Restaurar» en vuelo, la persona va a «Activas» y regresa a «Archivadas»: …";
- "ADM-T1C07: «Sí, archivar» en vuelo y «Cancelar»: …";
- "ADM-T1C08: «Sí, archivar» en vuelo, la persona va a «Archivadas» y regresa a «Activas»: …".

**Escenarios:**
- **ADM-T1C06:** «Restaurar Clase 5» con el `POST` pendiente; clic en «Activas»; clic en «Archivadas». La lista de «Archivadas» sale de la caché (30 s de `staleTime`) con la fila todavía ahí; clic otra vez en «Restaurar Clase 5».
- **ADM-T1C07:** «Archivar Clase 1» → «Sí, archivar Clase 1» con el `POST` pendiente → «Cancelar Clase 1» → «Archivar Clase 1» → «Sí, archivar Clase 1».
- **ADM-T1C08:** como el anterior, pero en vez de «Cancelar», ir a «Archivadas» y regresar a «Activas».

**Esperado:** una sola petición por acción mientras la primera sigue en vuelo, y un solo aviso.

**Obtenido:** en los tres, `expected [ … ] to have a length of 1 but got 2` (`:405`, `:434` y `:464`). Se manda un segundo `POST` de restaurar o de archivar con el primero en vuelo.

**Lo que ve la persona:**
- Con el servidor real, el segundo espera la fila y responde `409 CLASE_NO_ARCHIVADA` o `CLASE_YA_ARCHIVADA`. Sale "Clase restaurada" (o "Clase archivada") y, además, un aviso de error que la contradice.
- En ADM-T1C07 hay algo más grave: **«Cancelar» no cancela.** Con «Sí, archivar» en vuelo, «Cancelar» responde (no está en espera), cierra la confirmación y vuelve a mostrar «Archivar», como si nada se hubiera hecho. Unos instantes después la clase sale de la lista con "Clase archivada", aunque la persona la canceló.
- El diálogo de borrar sí resuelve este mismo caso: no se cierra con el `DELETE` en vuelo (decisión 5 del resumen). La confirmación en línea de archivar no lo hace.

**Causa en el código:**
- El estado en vuelo y la guarda con ref viven en el componente que se desmonta:
  - `useRestaurarClase()` y `restaurandoRef` en `FilaClaseAdmin` (`tabla-clases-admin.tsx`);
  - `useArchivarClase()` y `enviandoRef` en `ConfirmarArchivado` (`confirmar-archivado.tsx`).
- Al volver a montarse, la mutación nueva está en reposo (`isPending` falso), la ref está en `false` y `enEspera` no se pinta.
- `handleCancelar` llama a `archivar.reset()` sobre una mutación pendiente, que sigue su curso.

**Hermanos:**
- **«Sí, borrar definitivamente»:** cubierto. El diálogo no se cierra en vuelo y es modal: ni el cambio de pestaña ni Escape lo desmontan (ADM-T1C04, en verde).
- **«Cargar más clases»:** vive en la vista y su espera viene de `isFetching` de la consulta, que no se pierde al cambiar de pestaña.
- **«Duplicar clase»:** salir de la vista no deja volver a mandar desde otra instancia sin pasar por un formulario nuevo. Un segundo envío en un formulario nuevo es otra copia que la persona pidió.

**Requisito o regla violada:** `CLAUDE.md`, "Componentes": "Toda acción que lanza una mutación lleva, además de `enEspera`, una guarda síncrona con una ref" (TAREAS-01e, M-01), con el fin de que una acción no salga dos veces. También ADM-1C02 y ADM-1C03 ("hace una sola petición"), §7.14 (una confirmación que se cancela no ejecuta la acción) y el punto de ataque 4 del manager.

### T-03 — Al recuperar la conexión con el diálogo abierto, el diálogo pide cerrar y volver a intentar y, a la vez, ofrece borrar (N-01c-2)
Severidad: baja
Prueba: `frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx`, caso "ADM-T1C19: al recuperar la conexión con el diálogo abierto, si el conteo que se vuelve a pedir falla, …".

**Escenario.** Diálogo de «Clase 5» abierto con su conteo pintado. Se pierde la conexión y vuelve (`onlineManager.setOnline(false)` y después `true`). El conteo se vuelve a pedir y falla.

**Esperado:** el diálogo no muestra a la vez "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo." y «Sí, borrar definitivamente».

**Obtenido:** `el diálogo pide cerrar y volver a intentar y, a la vez, ofrece borrar: expected true to be false`.

**Causa en el código:**
- `useConteoDeBorrado` usa `staleTime: 0` y hereda `refetchOnReconnect` (por omisión, `true`).
- Con los datos ya pintados, el error de la recarga activa el `MensajeError` y `conteo.data !== undefined` sigue ofreciendo el botón.
- Si la recarga responde, las cifras cambian mientras la persona las lee.

**Lo que no pasa (ADM-T1C18, en verde):** volver a la ventana con `focus` o `visibilitychange` no vuelve a pedir el conteo, porque `app/providers.tsx` fija `refetchOnWindowFocus: false`. Así que el camino de N-01c-2 que planteó el manager no se da; el que sí se da es el de la reconexión.

**Requisito o regla violada:** la matriz de 01c (conteo con error: "sin botón de borrar") y `AGENTS.md`, "Frases de recuperación": la frase pide cerrar mientras el botón invita a seguir.

## Atacado sin hallazgos
- **Foco tras borrar y al cerrar (punto 3):**
  - la única fila de «Archivadas» → `h1` «Clases» (ADM-T1C03);
  - Escape cierra y devuelve el foco a «Borrar definitivamente» de esa fila;
  - con el `DELETE` en vuelo, ni Escape ni «Cancelar» cierran el diálogo, y el foco se queda dentro de él, nunca en `<body>`;
  - al responder, el foco va al «Borrar definitivamente» de la vecina anterior, cuando era la última fila (ADM-T1C04);
  - salir de la vista con el `DELETE` en vuelo: un solo aviso de éxito, ninguno de error, y al volver la fila ya no está (ADM-T1C05).

  La fila de en medio y la primera ya las sondeó el manager. La fila repetida descartada la cubre N-24 del programador; no la repetí.
- **`useRecuperarListaDeClasesAdmin` (punto 5):**
  - con las dos pestañas en error, salir y volver antes del `staleTime` vuelve a pedir las dos, una vez cada una, y el texto se va (ADM-T1C09);
  - con `StrictMode`, una lista sana se pide una sola vez y no sale de la caché al ir y volver (ADM-T1C10);
  - el error de «Cargar más» al salir y volver lo cubren ADM-1C07 (b) y 1C16 (c) del programador.
- **Control segmentado (punto 6):**
  - pulsar la pestaña activa, dos veces, no cambia `location.key`, no escribe `?estado=` y no pide nada;
  - el estado va en `aria-pressed` y en el icono `Check`, que solo tiene la pestaña presionada (ADM-T1C11);
  - con `?estado=otra`, `ARCHIVADAS`, vacío o `archivadas%00`, la vista abre en «Activas», pide solo `estado=activas` y no reescribe la URL (ADM-T1C12, 4 casos).
- **Duplicar (punto 7):**
  - dos envíos seguidos, un solo `POST`, un solo aviso y la ruta de la copia (ADM-T1C13);
  - `MAESTRO_NO_ENCONTRADO`, quitar a ese maestro y elegir a otra: el error del selector se va y el siguiente envío termina (ADM-T1C14);
  - la vista desmontada antes de responder, con `201` y con `409 CLASE_CON_COPIAS_EN_CURSO`: un solo aviso en cada uno y nadie navega (ADM-T1C15, 2 casos);
  - una clase archivada se duplica, y una que ya no existe no pinta el formulario ni manda nada (ADM-T1C16).
- **Nombres accesibles con nombres hostiles (punto 8):**
  - «Abrir», «Duplicar», «Archivar», «Sí, archivar», «Cancelar», «Restaurar» y el título del diálogo se encuentran por su nombre completo con un nombre con HTML y con uno de 120 letras sin espacios;
  - el texto visible de «Archivar» abre su nombre (2.5.3), y el foco inicial de la confirmación es «Cancelar»;
  - no se interpreta ninguna etiqueta (ADM-T1C17). N-01c-3, la variante del `aria-hidden`, sigue para A-04: funciona.
- **Comprobado al leer, sin escribir caso:** la clave de la lista por estado y su invalidación por prefijo; la URL de la primera página; la posición solo en «Archivadas»; el descarte por `id` en las dos pestañas.
  - Una hipótesis que descarté: que renovar una lista infinita repitiera el cursor de una fila archivada o borrada. TanStack Query 5.103.2 (`infiniteQueryBehavior.js:54`) recalcula el `pageParam` de cada página desde la página recién pedida, así que no pasa.
  - El manager escribió en su verificación que `invalidateQueries` "repetiría el cursor vencido". Con esta versión no es así; no cambia ninguna decisión.

## No atacado y por qué
- **El borrado con varias páginas cargadas y una fila repetida descartada:** lo cubren N-24 y la sonda del manager (primera, en medio y última). No le vi un camino distinto que justificara otro caso.
- **Una comprobación visual a 360 px** (el título largo del diálogo en varias líneas): exige navegador. Queda para H-4 del humano.
- **El backend:** 01c no lo toca, y las suites de 01a y 01b se corrieron al cerrar sus subentregas.

## Cierre de la ronda 1 de 01c
- **Veredicto: ROTO.**
- T-01 (media), T-02 (media) y T-03 (baja).
- Seis casos en rojo los demuestran: ADM-T1C01, 02, 06, 07, 08 y 19. Los otros 17 de mi archivo están en verde.
- El programador no toca `clases-admin-01c-r1.ataque.test.tsx`. Si considera incorrecto algún caso, lo argumenta y decide el manager.

## Ronda 2 — ADMIN-01c

Veredicto: **ROTO**, con un solo hallazgo de severidad baja (T-04). Los seis rojos de la ronda 1 ya están en verde, no hay regresiones y los demás puntos de ataque del manager resisten.
Verificación propia: lint exit 0 · suite de módulos (comando literal) `Tests 1 failed | 2504 passed (2505)`. El único rojo es T-04.

Plan: `plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78`, comprobado. Leí:
- `resumen-programador.md`, "ADMIN-01c — Corrección ronda 1", con "### M-02";
- `revision.md`, "## Verificación de la corrección de la ronda 1 — ADMIN-01c", con "### Re-verificación de M-02" y sus puntos de ataque.

No toqué código de producción, pruebas normales ni ninguna `*.ataque` existente: no hay C-n en esta ronda.

### Entorno
- **Puerta de carga:** dos lecturas de 25 % o menos y ningún `vitest`, antes de cada corrida que reporto:
  - 16:48:38 `cpu=5` y 16:48:49 `cpu=2`;
  - 16:52:37 `cpu=0` y 16:52:48 `cpu=4`;
  - 16:56:35 `cpu=7` y 16:56:46 `cpu=11`.
- **Excepciones:** dos corridas cortas de ADM-T2C07 con `-t`, mientras corregía mi propia prueba (abajo), sin repetir la puerta. No reporto sus cifras.
- La otra copia de trabajo no se usa. Sin navegadores.

### Regresiones (antes de atacar)
- Comando, desde `frontend/`: `npx vitest run src/features/clases/clases-admin-01c-r1.ataque.test.tsx src/styles/clases-r1.ataque.test.ts src/features/clases/foco-02c-r4.ataque.test.tsx` (16:48:51).
- Resultado: `Test Files 3 passed (3)` · `Tests 64 passed (64)`, es decir, 23 + 11 + 30.
- Los seis rojos de la ronda 1 (ADM-T1C01, 02, 06, 07, 08 y 19) están en verde.
- `clases-admin-01c-r1.ataque.test.tsx` sigue en `1cc30b08…`, sin cambios.

### Archivo nuevo

| Archivo | Casos | SHA-256 |
|---|---|---|
| `frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx` | 8 (`ADM-T2C01` a `ADM-T2C08`) | `76b5b2522f60795c0e7672da7b10ea95a3ce61d1aa26f102ef8eb057bd3ce6d9` |

- Usa las mismas ayudas que el de la ronda 1, copiadas: `Providers` de `app/providers.tsx`, el router real y un servidor en memoria con su estado. Suma una lista de «Archivadas» paginada de dos en dos.
- Lo formateé con `npx prettier --write` sobre ese archivo solo.
- **Una corrección de mi propia prueba antes de reportar:** en ADM-T2C07, la primera versión esperaba el texto de la alerta sin el título «Error» que `MensajeError` le antepone. Era un error mío, no un hallazgo, y la corregí.

### Conteos y corridas (desde `frontend/`)
- `npx vitest list src/features/clases/clases-admin-01c-r2.ataque.test.tsx`, con `grep -a -c "ADM-T2C"`: **8**.
- **lint:** `npm run lint` da exit 0, con Prettier sin diferencias y `> tsc -b` sin errores. Antes, `eslint` sobre el archivo nuevo encontró una variable sin usar, mía; la quité.
- **Suite de módulos**, con el comando literal del resumen: `npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx`. Mis dos archivos caen dentro de `src/features/clases`.
  ```
   Test Files  1 failed | 134 passed (135)
        Tests  1 failed | 2504 passed (2505)
     Start at  16:57:03
     Duration  137.44s
  ```
  - Son 2497 (la cifra del resumen y del manager, con mi archivo de la ronda 1) más 8 = 2505.
  - El único rojo es ADM-T2C04.
  - En la salida no hay avisos de claves repetidas.
- **V-01:** las 256 rastreadas coinciden con la lista `ac79306a…` (`sha256sum -c` sin diferencias). Hay dos mías sin rastrear: `clases-admin-01c-r1` (`1cc30b08…`) y `clases-admin-01c-r2` (`76b5b252…`). Son **258** en total, y nadie más tocó ninguna.

## Hallazgos

### T-04 — Al reconectar con el borrado en vuelo, el diálogo acaba con dos mensajes de error a la vez
Severidad: baja
Prueba: `frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx`, caso "ADM-T2C04: el conteo que se vuelve a pedir al reconectar falla y después el DELETE falla con 500: el diálogo muestra un solo mensaje de error y el foco no cae en <body>".

**Escenario** (punto 2 del manager, el estado vecino de T-03):
1. Diálogo de «Clase 5» abierto, con su conteo pintado.
2. «Sí, borrar definitivamente», con el `DELETE` pendiente.
3. La conexión se pierde y vuelve (`onlineManager.setOnline(false)` y después `true`). El conteo se vuelve a pedir, con su reintento, y falla con `500`.
4. El `DELETE` responde `500`.

**Esperado:** un solo mensaje, el del envío que la persona acaba de hacer. El foco se queda dentro del diálogo.

**Obtenido:** `el diálogo muestra a la vez el error del conteo y el del borrado: expected [ …(2) ] to have a length of 1 but got 2` (`:377`). Dos `role="alert"` en el diálogo: "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo." y el genérico del borrado.

**Lo que sí se cumple:** las aserciones de foco, que van antes en el mismo caso, pasan. El diálogo sigue abierto y el foco queda dentro de él, nunca en `<body>`. No hay aviso de `sonner`.

**Causa en el código** (`dialogo-borrar-clase.tsx`):
- `conteoFallo = conteo.isError && !borrar.isPending`. Mientras el `DELETE` está pendiente, el error del conteo se esconde.
- Cuando el `DELETE` falla, `isPending` pasa a `false`, el error del conteo vuelve a la vista y se suma al de `{borrar.isError && <MensajeError …/>}`.
- «Sí, borrar definitivamente» desaparece (porque `conteoFallo`) con el foco dentro. Radix lo devuelve al contenido del diálogo.

**Por qué es baja:** hacen falta dos fallos encadenados en una ventana corta, una reconexión y luego un `500` del borrado. Los dos textos son ciertos y legibles, y nada se borra ni se pierde.

**Requisito o regla violada:** `AGENTS.md`, "Matriz de avisos y recargas" ("qué se anuncia (un solo aviso)"), y la regla de leer un solo mensaje, el del envío que se acaba de hacer (`CLAUDE.md`, "Formularios", CHORE-03 T-05).

## Atacado sin hallazgos

- **Punto 1, el foco de M-02 en lo que no cubrían los casos:**
  - **Dos filas salen a la vez con el diálogo abierto (ADM-T2C01).** La lista es `[5, 6, 7, 8]` y el diálogo está en la 6. Otra pestaña borró la 5 y la 6; el conteo de la 6 responde `403` y la lista renovada queda en `[7, 8]`.
    - Al cerrar, el foco va al «Borrar definitivamente» de una de las que quedan, nunca a `<body>`. Por el código, cae en la 8: el lugar guardado de la 6 es el índice 1, y hoy ese índice lo ocupa la 8.
    - **¿Es aceptable según `DESIGN.md` §7.14?** Sí. La regla dice: "va al mismo control de la fila que ocupa su lugar (la siguiente o, si era la última, la anterior)". Se escribió para una fila que sale sola, y en ese caso "la que ocupa su lugar" y "la siguiente" son la misma.
    - Cuando salen dos filas, las dos lecturas se separan: la fila que hoy está en el lugar de la 6 es la 8, y la siguiente de la 6 en la lista anterior es la 7. El código sigue la primera lectura al pie de la letra.
    - La regla no decide este caso. Lo que sí exige ("nunca a `<body>`" y el mismo control de una fila) se cumple, así que no es hallazgo. Si se quiere "la siguiente que sigue existiendo", es una precisión de §7.14 para A-04, no un defecto.
  - **La lista vuelve a una sola página (ADM-T2C02).** Con dos páginas cargadas (`[5, 6]` y `[7]`, paginadas de dos en dos con su cursor y su posición), el diálogo de la 7, que es la última, recibe un `403`. La lista renovada es `[5, 6]`, sin página siguiente, y al cerrar el foco va al «Borrar definitivamente» de la 6, la anterior.
  - **Cambiar de pestaña, volver y quitar una fila (ADM-T2C03).**
    1. Se abre y se cierra el diálogo de la 7 en `[5, 6, 7]`, que queda guardada en el lugar 2.
    2. En «Activas» se archiva la 1 y se regresa a «Archivadas»; la lista nueva es `[1, 5, 6, 7]`.
    3. Se abre el diálogo de la 6, que ahora está en el lugar 2, y responde `403`.
    4. Al cerrar, el foco va a la 7, la siguiente de la lista nueva. `ultimoLugar` no usó un índice de antes.
- **Punto 3, dos acciones sobre la misma clase:**
  - **«Restaurar» en vuelo y, a la vez, el borrado de esa clase (ADM-T2C05).**
    - El diálogo se abre y pide su conteo.
    - Llega la restauración, la fila sale y el diálogo sigue abierto.
    - «Sí, borrar definitivamente» recibe `409 CLASE_NO_ARCHIVADA`: el diálogo lo dice y la clase no se borra.
    - Al cerrar, el foco va al «Borrar definitivamente» de la 6.
    - Un solo aviso, "Clase restaurada", y ninguno de error.
  - **Archivar en vuelo, cambiar de pestaña y regresar (ADM-T2C06).**
    - La confirmación vuelta a abrir está en espera (`aria-busy`) y un segundo clic no manda nada: un solo `POST` y un solo aviso.
    - Cuando la fila sale, con el foco en «Sí, archivar», el foco va al «Archivar» de la 2.
- **Punto 4, el conteo con `403` y `retry: 1` (ADM-T2C07):**
  - Lo vigilé con un `MutationObserver` durante el reintento y las dos renovaciones.
  - En ningún momento hubo más de un `role="alert"` en el diálogo, y el único texto que apareció fue la frase del conteo, una vez.
  - El foco no se movió de «Cancelar».
  - La fila de la clase ya borrada sale de la lista.
  - El doble pedido del conteo es el reintento de la app, ya anotado por el manager.
- **Punto 5, `useGestionEnVuelo` después de un error (ADM-T2C08):** archivar responde `500` y sale un aviso. «Sí, archivar» sale de la espera.
  - «Cancelar» vuelve a cerrar la confirmación y el foco vuelve a «Archivar».
  - «Sí, archivar» vuelve a mandar: segundo `POST`, `200`, la fila sale y llega "Clase archivada".
  - La mutación terminada no deja la fila trabada.

## No atacado y por qué
- **Otra pestaña del navegador con su propia caché, para T-02:** el cliente no puede evitarlo, como dice el manager. El servidor responde `409` y la lista se renueva; eso ya lo cubren ADM-1C02 y la decisión 3.
- **La comprobación visual a 360 px:** exige navegador. Queda para H-4.

## Cierre de la ronda 2 de 01c
- **Veredicto: ROTO**, por T-04 (baja).
- Los 7 casos restantes de mi archivo de esta ronda y los 23 de la ronda 1 están en verde.
- La ronda 2 era la segunda de tres. Si la corrección de T-04 vuelve, ataco en la ronda 3 sus hermanos: el error del conteo junto a cualquier otro mensaje del diálogo, como el `409 CLASE_CON_COPIAS_EN_CURSO` o el `403` del `DELETE` después de una reconexión.
- El programador no toca mis `*.ataque`.

## Ronda 3 — ADMIN-01c

Veredicto: **RESISTE**. No hay hallazgos. ADM-T2C04 (T-04) está en verde, no hay regresiones y los seis puntos de ataque del manager resisten.
Verificación propia: lint exit 0 · suite de módulos (comando literal) `Test Files 136 passed (136)` · `Tests 2536 passed (2536)`.

Plan: `plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78`, comprobado. Leí:
- `resumen-programador.md`, "ADMIN-01c — Corrección ronda 2", con "Estados vecinos antes de la ronda 3", "M-03" y la tabla del mecanismo;
- `revision.md`, "## Verificación de la corrección de la ronda 2 — ADMIN-01c", con "### Estados vecinos…" y "### Re-verificación de M-03".

No toqué código de producción, pruebas normales ni ninguna `*.ataque` existente: no hay C-n.

### Entorno
- **Puerta de carga:** dos lecturas de 25 % o menos y ningún `vitest` antes de cada corrida que reporto:
  - 19:52:14 `cpu=24` y 19:52:25 `cpu=22`;
  - 19:53:51 `cpu=25` y 19:54:02 `cpu=10`;
  - 19:55:52 `cpu=14` y 19:56:03 `cpu=20`;
  - 20:00:05 `cpu=24` y 20:00:17 `cpu=21`.
- **Excepciones:**
  - La segunda corrida barajada (20:00:51) siguió a la primera sin repetir la puerta.
  - Hubo una corrida de mi archivo a las 19:52:55 (puerta: 19:52:55 `cpu=2` y 19:53:07 `cpu=20`) antes de corregir mis propias pruebas. Abajo explico qué corregí.
- La otra copia de trabajo no se usa. Sin navegadores.

### Regresiones (antes de atacar)
- Comando, desde `frontend/`: `npx vitest run src/features/clases/clases-admin-01c-r1.ataque.test.tsx src/features/clases/clases-admin-01c-r2.ataque.test.tsx src/styles/clases-r1.ataque.test.ts src/features/clases/foco-02c-r4.ataque.test.tsx` (19:52:27).
- Resultado: `Test Files 4 passed (4)` · `Tests 72 passed (72)`, es decir, 23 + 8 + 11 + 30.
- ADM-T2C04 está en verde.
- `r1` sigue en `1cc30b08…` y `r2` en `76b5b252…`.

### Archivo nuevo

| Archivo | Casos | SHA-256 |
|---|---|---|
| `frontend/src/features/clases/clases-admin-01c-r3.ataque.test.tsx` | 12: `ADM-T3C01` (5 casos, uno por respuesta del `DELETE`), `ADM-T3C02` a `ADM-T3C04`, `ADM-T3C05` (2 casos) y `ADM-T3C06` y `ADM-T3C07` | `cffce654ebfb37dc10f8ce8bf7026fc982a8c3f79b677fa2eb82c4476e113f83` |

- **Sin tiempos fijos.** El archivo no tiene `setTimeout` ni esperas de milisegundos. Una sonda dentro de `Providers` toma el `QueryClient` de la app, y `asentado()` espera a que no quede ninguna consulta ni mutación en vuelo, reintento incluido. `sinConsultasEnVuelo()` espera solo a las consultas, para cuando el `DELETE` sigue retenido a propósito.
- **`reconectar()` tiene control positivo:** espera a que salga la nueva petición del conteo antes de seguir.
- **Correcciones de mis propias pruebas antes de la corrida que reporto** (no son hallazgos):
  1. **La primera versión de `reconectar()` no esperaba la petición.** El `QueryClient` vuelve a pedir lo viejo después de reanudar las mutaciones pausadas, un salto de microtareas, así que `asentado()` pasaba antes de que la recarga empezara. Cuatro casos fallaron por eso a las 19:53. Con el control positivo pasan, y además dejan de ser vacuos: ADM-T3C04 pasaba sin haber reconectado.
  2. **ADM-T3C01 tenía un `return` temprano** para el caso de que Escape cerrara el diálogo. Lo cambié por una aserción: con la respuesta todavía sin procesar, Escape no cierra, siempre. Ya no hay ningún `return` temprano.

### Conteos y corridas (desde `frontend/`)
- `npx vitest list src/features/clases/clases-admin-01c-r3.ataque.test.tsx`, con `grep -a -c "ADM-T3C"`: **12**.
- **lint:** `npm run lint` da exit 0, con Prettier sin diferencias y `> tsc -b` sin errores. Mi archivo se formateó con `npx prettier --write` sobre ese archivo solo; `eslint` sobre él da 0.
- **Suite de módulos**, comando literal: `npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx`.
  ```
   Test Files  136 passed (136)
        Tests  2536 passed (2536)
     Start at  19:56:05
     Duration  137.37s
  ```
  Son 2524 (la cifra del programador y del manager) más 12. Sin avisos de claves repetidas.
- **Punto 6, orden aleatorio:** las pruebas del encargo con `--sequence.shuffle`, con dos semillas.
  - Comando: `npx vitest run src/features/clases/clases-admin-01c.test.tsx src/features/clases/clases-admin-01c-rutas.test.tsx src/features/clases/clases-admin-01c-r1.ataque.test.tsx src/features/clases/clases-admin-01c-r2.ataque.test.tsx src/features/clases/clases-admin-01c-r3.ataque.test.tsx --sequence.shuffle --sequence.seed=<s>`.
  - `--sequence.seed=11` (20:00:19): `Tests 153 passed (153)`.
  - `--sequence.seed=4242` (20:00:51): `Tests 153 passed (153)`.
  - Son 88 + 22 + 23 + 8 + 12.
- **V-01:** las 256 rastreadas coinciden con la lista `ac79306a…`, sin diferencias. Hay tres mías sin rastrear (`r1` `1cc30b08…`, `r2` `76b5b252…` y `r3` `cffce654…`). Son **259** en total, y nadie más tocó ninguna.

## Hallazgos
Ninguno.

## Atacado sin hallazgos
1. **El orden de llegada (ADM-T3C01, un caso por respuesta del `DELETE`: `500`, `403 SIN_ACCESO_A_LA_CLASE`, `409 CLASE_CON_COPIAS_EN_CURSO`, `409 CLASE_NO_ARCHIVADA` y sin conexión).**
   - **Justo antes de la respuesta**, con el `DELETE` en vuelo: Escape, «Cancelar» y un segundo clic no cierran el diálogo ni mandan otro `DELETE`.
   - **En el instante en que llega la respuesta**, todavía sin procesar: Escape y «Cancelar» no cierran. Ya asentado:
     - un solo `role="alert"`;
     - el foco dentro del diálogo;
     - un solo `DELETE`;
     - ningún aviso;
     - con `403`, la fila sale de la lista.
   - **Justo después, ya procesada:** el segundo clic manda un segundo `DELETE`, y mientras vuela no queda ningún mensaje. Responde `500` y queda un solo mensaje.
   - **Escape ya procesado:** cierra limpio, sin avisos. El foco va al «Borrar definitivamente» de la fila, o al de la vecina cuando la fila salió por el `403` (M-02).
2. **El foco en el contenedor del diálogo:**
   - **ADM-T3C02:** el foco está en el `role="dialog"`, como tras un clic en el texto, y el conteo que se vuelve a pedir al reconectar falla. Queda un solo mensaje (la frase), sin «Sí, borrar definitivamente», y el foco dentro del diálogo, en «Cancelar».
   - **ADM-T3C03:** lo mismo tras un error del `DELETE`, con el conteo que responde `403`. La frase sustituye al mensaje y al botón, y el foco va a «Cancelar».
   - El efecto solo mueve el foco desde el contenedor o desde `<body>`: no se lo quita a otro control.
3. **El conteo congelado (ADM-T3C04):**
   - Se ve "1 alumno". El primer `DELETE` falla y una reconexión trae "9 alumnos": se sigue viendo "1 alumno" con un solo mensaje.
   - Segundo intento con el `DELETE` retenido, y otra reconexión que trae "7 alumnos": sigue "1 alumno", sin mensajes en vuelo. El segundo `DELETE` falla: "1 alumno" y un solo mensaje.
   - Al cerrar y volver a abrir: "7 alumnos", sin mensajes y con el botón.
   - Las dos reconexiones están comprobadas por la petición del conteo que sale.
4. **Un error que redirige en el conteo, sin datos (ADM-T3C05, con `403 ACCESO_RESTRINGIDO` y con `403 CAMBIO_DE_CONTRASENA_REQUERIDO`):**
   - `irA` se llama con `/acceso-restringido` o con `/cambiar-contrasena`: la redirección ocurre.
   - El diálogo no tiene ningún `role="alert"` ni el texto del servidor, no ofrece borrar, no hay aviso y el foco no cae en `<body>`.
   - El caso `401` sin refresco lo cubre "vecino 2" del programador.
5. **Vecino 3:**
   - **Con dos páginas cargadas** (`[5, 6]` y `[7]`, paginadas de dos en dos con su cursor y su posición) y el diálogo de la 6 (ADM-T3C06): el `DELETE` falla y la reconexión trae el `403`. Queda un mensaje, la frase, sin botón y con el foco en «Cancelar». La 6 sale de la lista y, al cerrar, el foco va al «Borrar definitivamente» de la 7.
   - **Con la única clase** (ADM-T3C07): la lista queda vacía ("Aún no hay clases archivadas") y, al cerrar, el foco va al `h1` «Clases».
6. **Las pruebas del programador bajo otro orden y sus esperas:**
   - **Orden aleatorio:** con las dos semillas, los 153 casos del encargo pasan (88 del programador, 22 de rutas y 35 + 8 + 12 míos).
   - **Esperas fijas que quedan:** solo las de `clases-admin-01c-rutas.test.tsx` (`:271`, `:287` a `:291`, `:392`, `:513` a `:525`). Las leí una por una: marcan el ritmo entre navegaciones (atrás y adelante, ir a otra sección, pulsar «Recursos»), y cada comprobación que sigue usa `findBy` o `waitFor`, con hasta 6 s. Ninguna afirmación negativa depende de ellas. En `clases-admin-01c.test.tsx` no queda ninguna: usa `asentado()` y `sinConsultasEnVuelo()`.
   - **Afirmaciones negativas:** busqué las que siguen directamente a una acción sin esperar (`not.toHaveBeenCalled`, `toHaveLength(0)`, `toBeNull()` justo tras `fireEvent`, `soltar` o `setOnline`). Solo aparece la de ADM-1C05 (d), que comprueba una validación local, síncrona, después de un `waitFor` sobre el `ErrorDeCampo`. Tiene control.
   - **Lo que no puedo hacer:** cargar el equipo a propósito sin correr dos suites a la vez, que la regla prohíbe. El orden aleatorio y la revisión de las esperas son lo que sí pude hacer.

## No atacado y por qué
- **Una comprobación visual a 360 px** (el título largo del diálogo en varias líneas): exige navegador. Queda para H-4.
- **Otra pestaña del navegador con otra caché, para T-02:** el cliente no puede evitarlo (manager). El servidor responde `409` y la lista se renueva.

## Cierre de la ronda 3 de 01c
- **Veredicto: RESISTE.**
- Los 12 casos de `clases-admin-01c-r3.ataque.test.tsx` están en verde, igual que los 23 de la ronda 1 y los 8 de la ronda 2.
- T-01, T-02, T-03 y T-04 siguen cerrados.
- Quedan para A-04, sin hallazgo:
  - N-01c-3 (el nombre accesible con `aria-hidden`);
  - «Cancelar» con una acción en vuelo;
  - la lectura de §7.14 cuando salen dos filas a la vez (ronda 2).

## Ronda 0 — ADMIN-01d1

Veredicto: **lista para el programador**. Apliqué C-10 tal como lo escribe §D-R0 → «Frontend — Enmienda 1» → 01d1, y nada más. C-10 queda en rojo por la razón esperada. El grep de las pruebas estáticas y de patrones que 01d1 puede romper no encontró ninguna `*.ataque` que caiga con el diseño bien hecho, así que no hay PARADA. Dejo las trampas para el programador (O-01d1-1 a O-01d1-14).

Plan: `plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78` (Enmiendas 1 a 10; lo comprobé al empezar). Base dentro de los paquetes: `3ae6a00`. Antes de tocar nada, `git diff 3ae6a00 -- frontend backend shared` estaba vacío; después, solo cambia el archivo de C-10.

Verificación propia (regla "Suites por ronda": lo que toco, los módulos, las vigiladas que nombra el plan y `lint`):
- **lint del frontend:** `cd frontend; npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores.
- **test:** el archivo de C-10 (rojo esperado), la suite de los módulos (`src/features/clases src/features/tareas src/components/clase`) y las vigiladas y estáticas de fuera de los módulos. Abajo van las cuatro corridas.
- No corrí la suite completa del frontend ni la del backend: las corre el manager al cerrar la subentrega. 01d1 no toca el backend, así que no hay PA-07.

### Entorno y trabajo en paralelo
- **Trabajo en paralelo:** por el orquestador, la otra copia de trabajo no se usa.
- **Puerta de carga:** antes de cada corrida, dos lecturas seguidas de 25 % o menos (`Win32_Processor.LoadPercentage`) y ningún `node` con `vitest` en su línea de comandos: 20:38:55 `13` y 20:39:04 `19` (C-10); 20:40:43 `4` y 20:40:55 `4` (módulos); 20:47:11 `10` y 20:47:22 `19` (vigiladas); 20:49:06 `16` y 20:49:18 `21` (gradebook). Entre medias hubo lecturas de 26 a 41 %: esperé sin terminar ningún proceso. Una suite después de otra.
- Sin navegadores ni aplicaciones gráficas.

### Cambios (solo C-10)

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-10 | `frontend/src/styles/clases-r1.ataque.test.ts` | V-06: el título y `toHaveLength` pasan de 76 a 77, con su comentario de ronda antes del caso. En la lista fija entran, después de `duplicar-clase-view.tsx` y con su comentario, `components/aviso-de-clase-archivada.tsx` 1 («Restaurar» del aviso del admin) y `components/categorias-de-solo-lectura.tsx` 0. El resto de `features/clases/components/` sigue en 3. Lo que protege no cambia: ningún `disabled` en JSX, `aria-busy` y `aria-disabled` solo en `Button`, y el número y el lugar de los botones con espera solo cambian con el plan. Sin caracteres invisibles (comprobado con `node`) | `550ccd969fe3dc3735933656583c99f5c18d1f4e32668585293c5a337083d53d` → `0ea4c6b87c65c9275b590b2404f174bdf04275a0d8ed009849f44258309c1c46` |

El hash de antes es el de `git show 3ae6a00:frontend/src/styles/clases-r1.ataque.test.ts`, igual al del árbol al empezar. `git diff -U0` del archivo: tres hunks (`@@ -178 +178,8`, el comentario y el título; `@@ -185 +192`, la cifra; `@@ -249,0 +257,4`, las dos entradas con su comentario). Ninguna otra `*.ataque` cambia. No toqué código de producción ni pruebas normales.

### Corrida de C-10 (rojo esperado)

Comando, desde `frontend/`: `npx vitest run src/styles/clases-r1.ataque.test.ts`

```
 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
   Start at  20:39:17
   Duration  5.25s (transform 2.47s, setup 304ms, import 3.18s, tests 158ms, environment 1.42s)
```

- El caso "V-06: … 77 enEspera" falla con `expected [ …(76) ] to have a length of 77 but got 76` (`:192`). Solo falta el `enEspera=` de «Restaurar» del aviso. Pasa a verde cuando existan `aviso-de-clase-archivada.tsx` con exactamente uno y `categorias-de-solo-lectura.tsx` sin ninguno.
- Los otros 10 casos del archivo, en verde, incluido V-07: el plan dice que no cambia en 01d1 (Enmienda 9) y el grep no encontró por qué cambiaría (O-01d1-2).

### Línea base de los módulos (con el código de hoy)

Comando, desde `frontend/`: `npx vitest run src/features/clases src/features/tareas src/components/clase`

```
 Test Files  142 passed (142)
      Tests  3067 passed (3067)
   Start at  20:41:11
   Duration  168.81s (transform 34.84s, setup 96.11s, import 281.54s, tests 939.89s, environment 457.37s)
```

`src/components/clase` no tiene pruebas hoy. Esta corrida incluye las vigiladas del módulo: `estatico-02c-r1`, `estatico-03c1-r1`, `estatico-r1`, `clase-layout.test.tsx`, `errores-ch3.test.ts` (CH3-B01), `errores-ch3-r1.ataque`, `refactor-01c-r1.ataque`, `ver-mas-01e-r3.ataque`, `dudas-03e.test.tsx`, `dudas-03e-r3.ataque`, `tareas-01d-r2.ataque`, las `*.ataque` de las filas 3, 20, 21 y 27 de CHORE-04 y las de 01c (`clases-admin-01c*`).

### Vigiladas y estáticas de fuera de los módulos

Comando, desde `frontend/`: `npx vitest run src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`

```
 Test Files  1 failed | 12 passed (13)
      Tests  1 failed | 231 passed (232)
   Start at  20:47:28
   Duration  26.22s (transform 42.69s, setup 7.63s, import 56.99s, tests 44.29s, environment 36.81s)
```

El único rojo es V-06, el de C-10.

Comando, desde `frontend/` (la vigilada de la Enmienda 3 que lee la caché del gradebook): `npx vitest run src/features/calificaciones/gradebook-01d.test.tsx`

```
 Test Files  1 passed (1)
      Tests  96 passed (96)
   Start at  20:49:20
   Duration  17.77s (transform 399ms, setup 304ms, import 1.37s, tests 14.51s, environment 1.41s)
```

### Inventario por grep (lo que 01d1 puede romper aunque el diseño esté bien)

Recorrí las 37 pruebas del frontend que leen el código fuente (`import.meta.glob`, `?raw`, `readFileSync`), las que simulan módulos (`vi.mock`) y las que montan una clase con el router real y un doble del detalle con `archivadaEn`. Para cada una, contra los archivos de "Se toca" de 01d1 (con la suma de la Enmienda 3):

| Prueba | Qué fija | ¿Cae con 01d1 bien hecho? |
|---|---|---|
| `styles/clases-r1.ataque` V-06 | `enEspera=` por archivo, `disabled`, `aria-busy` | Sí, por la cifra: es C-10 (aplicado) |
| `styles/clases-r1.ataque` V-02 a V-05, V-07, V-13, Toaster | colores, escalas, `ring-`, vidrio, contexto, rojo | No (Enmienda 9: sin vidrio ni contexto nuevos). Trampas en O-01d1-2 |
| `features/clases/estatico-02c-r1.ataque` | lista exacta de `perspectivaDeRuta(`, lectores de `.puedeBorrar`, `"Crear clase"`/`"Editar clase"` | No, si el aviso recibe la perspectiva por props y las filas 4, 6 y 18 se condicionan en su archivo. Trampa de la asignación en O-01d1-3 |
| `features/clases/estatico-03c1-r1.ataque` (CL3-R1-30 a 35) | `personas-view` y `secciones-de-clase`, `useIndicadorDeSecciones`, restos de la rejilla | No (01d1 no toca esos archivos). Trampa de `grid-cols-4/5` y `w-1/4` en O-01d1-6 |
| `features/clases/estatico-r1.ataque` | `?? []` y ternarios anidados en JSX en todo el módulo | No. Trampa en O-01d1-6 |
| `features/clases/ver-mas-01e-r3.ataque` (`:291-338`) | 14 archivos (entre ellos `trabajo-view`, `categorias-view`, `seccion-de-tema`, `elemento-de-trabajo`, `lib.ts`, `hooks.ts`, `data.ts`): sin tipos fuera de `types.ts`, `disabled`, `fetch(`, importaciones de `@/features/` | No. Trampas en O-01d1-6 |
| `features/clases/refactor-01c-r1.ataque` (`:376-475`) | `components/`, `lib/` y `services/` no importan de `features/`; `components/clase/data.ts` en `MOVIDOS`; `TEXTOS_DE_LA_CLASE` definida una vez | No, si `components/clase/lib.ts` y `hooks.ts` no importan de `features/`. O-01d1-4 |
| `features/clases/errores-ch3-r1.ataque` (O-05) y `errores-ch3.test.ts` (CH3-B01) | `.message` en el módulo (con comentarios), `\p{L}`, cortes por `:`; claves de `MENSAJES_POR_CODIGO_DE_CLASES` | No. O-01d1-7 |
| `lib/estatico-ch3-r1.ataque`, `lib/estatico-ch3-r2.ataque`, `lib/errores-de-api-estatico` (CH3-*), `lib/errores-ch3-r1.ataque` | lectores aprobados de `.message`, reinicio condicionado, invisibles, contrato | No. O-01d1-7 |
| `services/apiClient-ch3*.test` | importadores exactos de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` | No, si `components/clase/lib.ts` no la importa. O-01d1-7 |
| `components/layout/estatico-r1.ataque` | `fixed` en `.tsx` (comentarios incluidos), valores arbitrarios (lista exacta), `animate-`, URLs | No. O-01d1-2 |
| `features/tareas/estatico-01c.test.ts` (CAL-1C12, CAL-1C13) y `estatico-01c-r1.ataque` (CAL-T-94) | `components/clase/data.ts`, en crudo y en sus comentarios | No, si el texto nuevo y su comentario evitan las palabras prohibidas. O-01d1-5 |
| `features/tareas/tareas-01a-r1.ataque`, `entregas-01d-r1.ataque`, `tareas-01d-r1/r2.ataque` | literales únicos en `components/clase/data.ts`; `seccion-de-tema`, `features/clases/lib.ts`, `data.ts`, `types.ts` y `publicacion-del-muro` sin `disabled`, valores por defecto ni importaciones de `@/features/` | No. O-01d1-5 y O-01d1-6 |
| `features/calificaciones/estatico-01d*` (CAL-1D09) | archivos exactos del módulo y de `components/foco` | No: 01d1 no toca ninguno de los dos |
| `vi.mock("./hooks", …)` (`inicio-sin-datos-02c-r1`, `inicio-sin-datos-r2`) | fábricas cerradas de `features/clases/hooks` | No: solo montan los inicios, que 01d1 no toca |
| Dobles del detalle con `archivadaEn` (`clases-admin-01c*.test.tsx`, las tres `clases-admin-01c-r*.ataque`) | duplicar una clase archivada dentro de su `ClaseLayout` (ADM-T1C16) | No, con las condiciones de O-01d1-10 |
| Lectores de la `QueryCache` y la `MutationCache` (las cuatro vigiladas de la Enmienda 3 y las de `auth`/`admin`) | consultas y mutaciones en la caché | No: la suscripción no crea ni quita entradas (las cuatro, en verde arriba) |

**Pendientes de la revisión final de 01c para 01d1:**
- **«Restaurar» del aviso con la misma `mutationKey` por clase que la tabla (`claveGestionDeClase`).** Ninguna `*.ataque` lo toca. Las de 01c (`clases-admin-01c-r1/r2/r3`) no montan el aviso. `useRestaurarClase(claseId)` ya lleva esa clave (`hooks.ts:374`), y `useGestionEnVuelo("restaurar", claseId)` la lee.
- **Tipos en línea y parámetros desestructurados de `mutationFn`/`queryFn` a `types.ts`.** Ninguna `*.ataque` los toca. La única regla de tipos sobre `hooks.ts`, `lib.ts` y `data.ts` (`ver-mas-01e-r3.ataque:317-321`) caza declaraciones `type X =` e `interface X`, no anotaciones en línea, así que moverlos no cambia ninguna `*.ataque`. Lo que sí la pone en rojo es declarar un tipo nuevo en esos archivos (O-01d1-6).

### Observaciones para el programador (trampas; no son hallazgos)

Son lo que pondría en rojo una `*.ataque` o una vigilada aunque el diseño esté bien.

**O-01d1-1 (V-06, C-10). Las cifras son por texto, archivo por archivo.**
- `enEspera=` se cuenta línea por línea en los `.tsx`. «Restaurar» del aviso se escribe **una sola vez** en `components/aviso-de-clase-archivada.tsx`, aunque solo lo vea el admin. El enlace «Duplicar» no lleva `enEspera`.
- `components/categorias-de-solo-lectura.tsx` lleva 0. Ningún otro archivo nuevo de `features/clases/components/` puede llevar `enEspera=`: el resto de esa carpeta debe sumar exactamente 3 (buscador y roster).
- Esconder un control de las filas 1 a 21 no cambia la cifra, siempre que su JSX no se duplique. Si una rama "archivada" y otra "activa" escriben el mismo botón dos veces, la cifra sube y la prueba cae. La condición va alrededor del control o como retorno temprano, sin copiar el control (E-38).
- La regla `/\sdisabled(=|\s|\/?>|$)/` lee también los comentarios de los `.tsx`. El comentario "sin disabled en …" la pone en rojo; "`disabled` en JSX", entre comillas invertidas, no (lo comprobé con `node`). Mejor no nombrar la palabra.
- `aria-busy` y `aria-disabled` solo en `components/ui/button.tsx`. Las categorías de solo lectura no son controles apagados: son texto.

**O-01d1-2 (V-02 a V-05, V-07, V-13 y `components/layout/estatico-r1`). Clases, vidrio y palabras que se leen en crudo, con comentarios.**
- `vidrio-fuerte`, `vidrio-azul`, `data-material` y `data-densidad` no pueden aparecer en ningún archivo de 01d1, **tampoco en un comentario**: V-07 lee todas las líneas. Y "vidrio" no puede aparecer dentro de una cadena entre comillas dobles. El aviso va como texto con icono dentro de una `Card` (Enmienda 9).
- La palabra `fixed` en cualquier `.tsx`, comentarios incluidos, solo vive en `barra-navegacion.tsx` y `dialog.tsx` (V-16). El "aviso fijo" del plan no puede decir "fixed" en ningún comentario.
- Sin `outline-none`, `ring-`, `focus:`, `animate-`, ni valores arbitrarios `-[…]` fuera de la lista exacta (`estatico-r1.ataque:138-158`, comentarios incluidos).
- Sin `text-danger` ni `text-destructive` en los `.tsx` nuevos (V-13): si el icono del aviso lleva color, que no sea rojo. Sin colores sueltos ni de la paleta, y sin escalas anuladas (`text-sm`, `rounded-lg`, `font-semibold`).
- Sin `grid-cols-4`, `grid-cols-5`, `w-1/4` ni `w-1/5` en ningún archivo de producción (CL3-R1-35). Ojo con las filas de las categorías de solo lectura.

**O-01d1-3 (`estatico-02c-r1.ataque`). La perspectiva y `puedeBorrar`.**
- La lista de archivos que llaman a `perspectivaDeRuta(` es exacta. El aviso recibe la perspectiva por props desde `ClaseLayout`. Ni `categorias-de-solo-lectura.tsx`, ni `editar-clase-view.tsx`, ni `components/clase/` la llaman. Nadie decide si pinta «Restaurar» mirando el `pathname` (`startsWith("/admin…")` o `pathname.includes(`).
- Los lectores de `.puedeBorrar` son exactos (seis archivos). Las filas 4, 6 y 18 se condicionan en el archivo que ya lo lee, y ningún archivo nuevo lo lee (Enmienda 9).
- **La asignación:** la regla `puedeBorrar\s*[:=]\s*(?!\s*(comentario|publicacion|…)\.puedeBorrar)` exige que, detrás de `puedeBorrar =`, venga directamente `<dato>.puedeBorrar`.
  - En `comentarios-de-publicacion.tsx:32` (`const puedeBorrar = comentario.puedeBorrar`), escribir `const puedeBorrar = !soloLectura && comentario.puedeBorrar` la pone en rojo. Lo comprobé con `node`.
  - `comentario.puedeBorrar && !soloLectura` pasa, pero lo limpio es dejar esa línea como está y condicionar donde se pinta.
  - Tampoco vale una prop `puedeBorrar={…}`.
- `"Crear clase"` y `"Editar clase"` solo en las cinco líneas de `features/clases/data.ts`. "Volver a la clase" (fila 21) es otro texto y entra sin problema.

**O-01d1-4 (`refactor-01c-r1.ataque:407-425`). `components/clase/` no importa de `features/`.**
- `components/clase/contexto-de-solo-lectura.ts`, `hooks.ts` y `lib.ts` no pueden importar de `@/features/` ni de `../features/`. `esClaseArchivada` sale de `@/services/apiClient` (`esApiError` o `ApiError`).
- `components/clase/data.ts` está en `MOVIDOS`: sin `?? []`, `fetch(`, `console.`, `dangerouslySetInnerHTML` ni `target=_blank`.
- `TEXTOS_DE_LA_CLASE` se define solo ahí. `sinAcceso` y `firmaAdministracion` conservan su valor (`:257-260`).
- Las líneas de código que nombran `FIRMA_ADMINISTRACION` o `firmaAdministracion` siguen siendo tres (`estatico-02c-r1:52-58`). Un comentario al final de una línea de código que las nombre suma una.

**O-01d1-5 (`components/clase/data.ts` en las estáticas de `features/tareas`).** El archivo está en la lista de 01c de tareas, que lo lee en crudo:
- **CAL-T-94** (`estatico-01c-r1.ataque:47-53`, comentarios incluidos): sin `#` seguido de 3 a 8 hexadecimales, `rgba(`, `hsl(`, `oklch(`, escalas anuladas ni emojis.
- **CAL-1C13** (`estatico-01c.test.ts:73-95`, crudo): sin `disabled`, `vidrio`, `data-material`, `?? []`, `fetch(`, `console.`, ni valor por defecto (`??` o `||`) detrás de `estadoPago`, `accesoRestringido`, `rol` o `calificacion`.
- **Sus comentarios** (`:127-153`) no pueden nombrar `vidrio`, `data-material`, `disabled`, `?? []`, `fetch(`, `console.`, `_blank`, `perspectivaDeRuta(`, `correo`, `estadoPago`, `"Sin tema"` ni `"Sin categoría"`. Solo vale el comentario de ENTREGAS-01a que ya está.
- Los literales `"Sin tema"` y `"Sin categoría"` siguen viviendo solo ahí (`tareas-01a-r1.ataque:316`, CAL-1C12). El texto de archivada de §D-12 entra una sola vez, en `TEXTOS_DE_LA_CLASE`, y `features/clases` lo toma de ahí sin copiarlo.

**O-01d1-6 (archivos de `features/clases` que otras estáticas nombran).**
- **`ver-mas-01e-r3.ataque:314-342`:** `trabajo-view.tsx`, `categorias-view.tsx`, `seccion-de-tema.tsx`, `elemento-de-trabajo.tsx`, `lib.ts`, `hooks.ts` y `data.ts`, en crudo:
  - ningún `type X =` ni `interface X` que no sea de Props: el tipo del contexto o de la suscripción va en `types.ts`;
  - sin `?? []`, `fetch(` ni `console.`;
  - sin `disabled` en un elemento JSX: la regla cruza líneas;
  - sin valores `-[#…]` ni `-[12px]`;
  - sin importar de `@/features/`, tampoco del propio módulo por el alias: se usan rutas relativas.
- **`entregas-01d-r1.ataque:851-893`:** `seccion-de-tema.tsx`, `features/clases/lib.ts`, `data.ts` y `types.ts`, en crudo, comentarios incluidos: sin `\sdisabled(=|\s|>|\})` y sin `rol ??` (ni `rol ||`, ni lo mismo con `estadoPago`, `accesoRestringido` o `calificacion`).
- **`tareas-01d-r2.ataque:510-537`:** `publicacion-del-muro.tsx` no importa de `@/features/` y no lleva `disabled` en un elemento.
- **`estatico-r1.ataque`:** sin `?? []` y sin ternarios anidados en JSX en todo el módulo. Por ejemplo, `{soloLectura ? null : capacidades.x ? <A /> : <B />}` cae. La condición de solo lectura va en una variable o en un retorno temprano.
- **CL3-R1-34:** `hooks.ts` sigue exportando `useIndicadorDeSecciones`.

**O-01d1-7 (errores).**
- En `features/clases`, la cadena `.message` no puede aparecer, **ni en un comentario**, salvo `incidencia.message` y el `exec` de la fila de categorías (`errores-ch3-r1.ataque:449-468`). Tampoco `\p{L}`, `new RegExp(` ni `.split(":")`.
- `components/clase/lib.ts` no está entre los lectores aprobados de `.message` (`estatico-ch3-r1.ataque:96-116`). `esClaseArchivada` mira `codigo`, nunca el mensaje.
- `CLASE_ARCHIVADA` ya está en los códigos con mensaje del servidor de `clases` (01c). Si 01d1 necesitara un texto fijo por código en `MENSAJES_POR_CODIGO_DE_CLASES`, CH3-B01 cae: es PARADA (Enmienda 10). El texto de las rutas de escritura va en `TEXTOS_DE_LA_CLASE`, que no es un mapa por código.
- Ningún `if (<m>.isError) <m>.reset()` fuera de los diez formularios de T-05, ni un `reset` en el render (`estatico-ch3-r2.ataque:135-150`). Si «Restaurar» del aviso necesita reiniciar, el reinicio va sin condición, dentro del manejador.
- Fuera de `services/apiClient.ts`, solo `features/clases/lib.ts`, `features/tareas/lib.ts` y `features/calificaciones/lib.ts` importan `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (`apiClient-ch3-r1.ataque:59-84`). Si algo de 01d1 necesita saber si un error redirige, usa `errorQueRedirigeElCliente` de `features/clases/lib.ts`. La suscripción no lo necesita: solo mira `CLASE_ARCHIVADA`.
- Sin caracteres invisibles literales en producción (`estatico-ch3-r2.ataque:68-73`): los textos nuevos van con espacios normales, sin NBSP antes de «…» ni de los dos puntos.

**O-01d1-8 (el «ayudante común de errores» de §D-R0).** §D-R0 → 01d1 dice que, en `features/clases/hooks.ts`, una escritura que recibe `409 CLASE_ARCHIVADA` marca viejo el detalle "en el ayudante común de errores de las mutaciones del módulo". Hoy no hay uno solo:
- hay cinco ayudantes: `avisarErrorConElFormularioDesmontado` (`:244`), `avisarErrorDeGestion` (`:340`), `avisarErrorDelTema` (`:1227`), `avisarErrorDelRecurso` (`:1485`) y `avisarErrorDelTexto` (`:1679`);
- y varios `onError` propios: `:517`, `:533`, `:638`, `:658`, `:955`, `:976`, `:1023`, `:1044`, `:1298`, `:1356`, `:1393`, entre otros. Son 32 líneas `onError` en el archivo.

No rompe ninguna prueba, pero el resumen debería decir, mutación por mutación, por dónde pasa la invalidación con `exact: true`: estos son los hermanos de esa regla. Mientras `ClaseLayout` está montado, la suscripción de la Enmienda 3 ya la cubre. El ayudante solo cuenta con la vista desmontada.

**O-01d1-9 (fechas y reloj).** `formatearFechaLarga` usa la zona local si no recibe una. Las pruebas del aviso fijo:
- comparan con la misma función, o con un instante a mediodía UTC, para que la zona del equipo no cambie el día;
- fijan el reloj si comparan un texto relativo (decisión del humano, T-20 de TAREAS-01e).

**O-01d1-10 (dobles de 01c con `archivadaEn`: duplicar dentro de una clase archivada).**
- Las pruebas de 01c (`clases-admin-01c.test.tsx`, `clases-admin-01c-rutas.test.tsx` y mis tres `clases-admin-01c-r*.ataque`) responden el detalle de una clase archivada con su `archivadaEn`.
- ADM-T1C16 (`clases-admin-01c-r1.ataque:670-692`) monta `/admin/clases/<id>/duplicar` de una clase archivada. Con 01d1, el `ClaseLayout` de arriba pinta el aviso con «Restaurar» y «Duplicar». La prueba busca:
  - el campo con la etiqueta exacta "Nombre de la clase";
  - el botón con el nombre exacto "Duplicar clase";
  - y elige a Marta con el buscador de maestros del formulario.

  Para que siga en verde:
  - el aviso no tiene un botón llamado exactamente "Duplicar clase" (su «Duplicar» es un enlace) ni un campo con esa etiqueta;
  - y en 01d1 ningún componente del formulario de duplicar (`SelectorDeMaestros`, `BuscadorDeMaestros`, `ListaMaestrosDeClase`) lee el contexto de solo lectura. Las filas 29 y 30 son de 01d2 y se condicionan en las vistas (§D-9).
- Esos dobles responden `GET …/codigo` con `200` y cualquier ruta no prevista con `500 "no esperada"`. Una petición nueva de la clase archivada (por ejemplo, el código que ya no se pinta) no rompe nada, pero tampoco debe salir.

**O-01d1-11 (dobles del detalle sin `archivadaEn`).** Los 23 archivos con dobles de `GET /api/clases/:claseId` no traen la clave, así que la clase queda activa (S-14). `estaArchivada` sin la clave da `false` (ADM-1D101). Ninguna prueba de hoy hace llegar `CLASE_ARCHIVADA` a una vista de la clase: las únicas que lo nombran son las de 01c, sobre `/admin/clases`. La suscripción no cambia ninguna cuenta de peticiones en las pruebas de hoy.

**O-01d1-12 (textos).** "Volver a la clase" (fila 21) es un texto nuevo de §D-9 que §D-12 no enumera aparte. Va en `data.ts`, como "Volver a Recursos" (`features/clases/data.ts:735`), que ya existe y la fila 20 reutiliza. Los avisos fijos ("Clase archivada el {fecha}. Solo puedes consultarla." y, para el admin, "… Es de solo lectura.") van en `features/clases/data.ts`. El de las rutas de escritura va en `TEXTOS_DE_LA_CLASE.archivada`.

**O-01d1-13 (`CAPACIDADES_POR_PERSPECTIVA`).** PR-2C01 (`lib.test.ts:278-319`) fija la tabla celda por celda: `verCodigo`, `editar`, `formularioPublicacion`, `formularioComentario`. La solo lectura sale del contexto y no cambia la tabla. Tampoco vuelve la capacidad `crearTarea` (CL3-C17).

**O-01d1-14 (lo que 01d1 no toca y está vigilado).** No se tocan `components/adjuntos/hooks.ts`, `adjuntos-de-publicacion.tsx`, los cuatro formularios con adjuntos (Enmienda 3) ni `components/foco/` (CAL-1D09 fija sus archivos). `useFocoAlPerderseElControl` se usa tal cual para el foco en el `h1` de la clase. Un `tabIndex={-1}` en ese `h1` no rompe ninguna prueba de foco de hoy: `foco-barra-02d-r2.ataque` admite `-1`.

### V-01: SHA-256 de todas las `*.ataque` (base para el programador de 01d1)

Son 259 archivos: 101 del backend y 158 del frontend, todos rastreados desde `3ae6a00` (`git ls-files`; ninguno sin rastrear).

- **Comprobación de entrada:** antes de tocar nada, las 259 coincidían una por una con `git show 3ae6a00:<ruta>` (ninguna diferencia), y la lista de rutas de `git ls-files` es la misma que la de `git ls-tree -r 3ae6a00`. La lista de la base, en el formato de abajo, tiene SHA-256 `aa482c064918e83069934c15f824921979543dc467cc97b04b644747fbc8ecb3`.
- **Después de C-10:** solo cambia `frontend/src/styles/clases-r1.ataque.test.ts`. Las otras 258 son idénticas a `3ae6a00`.
- **Lista:** `sha256sum` de la lista de abajo en formato `sha256sum -c` (`<hash>  <ruta>`, una por línea, en el orden de `git ls-files`): `825acabd5f732dec57c0e06839b3f584d00e9bc325fa7a758e5e045a8445d73f`.

| Archivo | SHA-256 |
|---|---|
| `backend/src/adapters/storage/objetos-r1.ataque.test.ts` | `65c1d9d9e6cea8ba8cf98bc522c6ba6d7122376d0201ccf3fc3048d24b60543f` |
| `backend/src/adapters/storage/objetos-r2.ataque.test.ts` | `935a721160f978e35d45d2c9392fe8cb169fae32f43b9df583bda46215707e22` |
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
| `backend/test/archivos-d-r1.ataque.test.ts` | `f76ce52002e295f2bda6e7a7a7f796415e08013e6d4c1fbe2c9c686671fe8252` |
| `backend/test/archivos-d-r2.ataque.test.ts` | `1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9` |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` |
| `backend/test/arranque-r1.ataque.test.ts` | `38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716` |
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` |
| `backend/test/autoria-02b-r1.ataque.test.ts` | `6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713` |
| `backend/test/borrado-duplicado-r1.ataque.test.ts` | `3520057d0f1a27739eaa701aacd9c18d5c0728fc6a3d55374f43f63a5e6f5336` |
| `backend/test/borrado-duplicado-r2.ataque.test.ts` | `b8fc0db0ea3ec7ff2b89cd9e345c57a9b4ef73afe16fb1aa3e6fdf73c27c16a1` |
| `backend/test/calificaciones-01a-r1.ataque.test.ts` | `5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9` |
| `backend/test/calificaciones-01a-r2.ataque.test.ts` | `afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc` |
| `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` | `dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416` |
| `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` | `b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07` |
| `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` | `29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869` |
| `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` | `6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e` |
| `backend/test/categorias-01a-r1.ataque.test.ts` | `6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db` |
| `backend/test/clases-archivadas-r1.ataque.test.ts` | `f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2` |
| `backend/test/clases-archivadas-r2.ataque.test.ts` | `62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933` |
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
| `backend/test/gestion-02a-r1.ataque.test.ts` | `73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a` |
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
| `backend/test/lecturas-fx-r1.ataque.test.ts` | `82fe8c49674a3cc8328e7951236c0c8f442fcba3890b716013369785b202cf40` |
| `backend/test/lecturas-fx-r2.ataque.test.ts` | `b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea` |
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
| `backend/test/objetos-reintento-r2.ataque.test.ts` | `fd2ae2e9792db81d838580b0ef2769ce8ef08059e3353aa5ab927c62295da9e8` |
| `backend/test/recursos-clases03a-r1.ataque.test.ts` | `42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d` |
| `backend/test/recursos-clases03a-r2.ataque.test.ts` | `ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516` |
| `backend/test/referencias-01b-r1.ataque.test.ts` | `ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21` |
| `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` | `6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5` |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `71c54a113611a3097baa03691f316f5e3d49dbe6532d058a453aaf0641434db1` |
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
| `frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx` | `1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65` |
| `frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx` | `76b5b2522f60795c0e7672da7b10ea95a3ce61d1aa26f102ef8eb057bd3ce6d9` |
| `frontend/src/features/clases/clases-admin-01c-r3.ataque.test.tsx` | `cffce654ebfb37dc10f8ce8bf7026fc982a8c3f79b677fa2eb82c4476e113f83` |
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
| `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | `0165d4e27b1fff9230d17bec740d89c380b6f322923c7e5a044ac010f4b9358b` |
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
| `frontend/src/styles/clases-r1.ataque.test.ts` | `0ea4c6b87c65c9275b590b2404f174bdf04275a0d8ed009849f44258309c1c46` |
| `frontend/src/styles/tokens-r1.ataque.test.ts` | `b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582` |

### Cierre de la ronda 0 de 01d1
- **Veredicto: lista para el programador.** Sin PARADA.
- **C-10 aplicado.** Queda en rojo por la razón esperada (76 de 77 `enEspera=`).
- **Lo demás, en verde con el código de hoy:**
  - la suite de los módulos, `Tests 3067 passed (3067)` · 142 archivos;
  - las vigiladas de fuera, con el único rojo de C-10: `Tests 1 failed | 231 passed (232)`;
  - `gradebook-01d.test.tsx`, `Tests 96 passed (96)`;
  - `lint`, exit 0.
- **El grep** no encontró ninguna `*.ataque` ni ninguna vigilada que caiga con el diseño de 01d1 bien hecho. Las trampas para el programador son O-01d1-1 a O-01d1-14.
- **Los dos pendientes de la revisión final de 01c** (la `mutationKey` de «Restaurar» del aviso y los tipos en línea) no tocan ninguna `*.ataque`.
- **V-01:** 259 archivos, lista `825acabd…`; solo cambia el de C-10.

## Ronda 1 — ADMIN-01d1

Veredicto: **ROTO**. Un hallazgo, T-01, de severidad media: lo que se deja a medio usar se reabre solo al restaurar la clase. Son las confirmaciones de borrar (publicación, tema, recurso y comentario) y los formularios de tema (nuevo y renombrar). Lo demuestran siete casos que fallan. Los ocho puntos de ataque del manager y del orquestador resisten.

- **Leí:**
  - el plan, con SHA-256 `3822b6c0…` (lo comprobé al empezar);
  - `resumen-programador.md` (`6d788553…`): "## ADMIN-01d1 — Implementación" y "### M-01";
  - `revision.md` (`8d1cefa8…`): "## Verificación del resumen — ADMIN-01d1" y "### Re-verificación de M-01";
  - el código nuevo y el cambiado de 01d1.
- **Sin navegadores.** La otra copia de trabajo no se usa.
- **Puerta de carga** antes de cada corrida (abajo). No terminé ningún proceso.

### Archivo nuevo

| Archivo | SHA-256 | Casos |
|---|---|---|
| `frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx` | `8d58d05c409c560d115a7ea51bc29a028d0f201658b3db979b1c53d2ec2d2e6a` | 45 (ADM-T1D101 a ADM-T1D112) |

- **Montaje:** el router real (`rutas` de `app/router`). Los casos que no tocan la caché montan `<Providers>` de `app/providers.tsx`: ADM-T1D101, ADM-T1D104, ADM-T1D107, ADM-T1D108, ADM-T1D110 y ADM-T1D111.
- **Los que necesitan la caché a mano** (marcar viejo el detalle como lo haría otra pestaña, o leer el estado del reintento) usan una copia exacta de sus opciones: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`.
- **Sin tiempos fijos.** Las esperas son `findBy` y `waitFor` sobre el DOM, la caché (`isFetching`, `isMutating`, `fetchFailureCount`) o las peticiones registradas. Las respuestas que hay que sostener se retienen con una promesa.
- **Toda prueba tiene aserciones.** Una precondición que falta lanza un error con su motivo; ninguna prueba termina con un `return`.
- **Ninguna otra `*.ataque` cambió:** V-01, abajo.

## Hallazgos

### T-01 — Al restaurar la clase, se reabre solo lo que estaba a medio usar al archivarse (confirmaciones de borrar y formularios de tema)
Severidad: media

Pruebas (en `frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx`):
- **ADM-T1D111**, los tres casos (`it.each`): `'borrar una publicación (fila 4)'`, `'borrar un tema (fila 12)'` y `'borrar un recurso (fila 18)'`, con el título "… el «Sí, borrar» recibe el 409; tras «Restaurar» la confirmación no reaparece sola".
- **ADM-T1D112**, los cuatro casos: "la confirmación de borrar una publicación", "el formulario de «Nuevo tema» (fila 8)", "el formulario de renombrar un tema (fila 11)" y "la confirmación de borrar un comentario (fila 6)", con el título "… al archivarse se oculta y, al restaurarse, no reaparece abierto".

**Reproducción de ADM-T1D111 (admin, router real y `<Providers>`):**
1. En Avisos, el admin pulsa «Borrar publicación»: aparece la confirmación.
2. Otra sesión archiva la clase, y el admin pulsa «Sí, borrar».
3. El `DELETE` recibe `409 CLASE_ARCHIVADA`: un aviso y el detalle se renueva. Aparece el aviso fijo y la confirmación deja de pintarse. Hasta aquí, como pide el plan.
4. El admin pulsa «Restaurar» en el aviso: "Clase restaurada", y el aviso fijo desaparece.
5. **La confirmación "Se borrará con sus comentarios." con «Sí, borrar» y «Cancelar» vuelve a estar en pantalla**, y «Borrar publicación» no aparece. Nadie la pidió después del archivado.

Pasa igual con «Sí, borrar tema» y «Sí, borrar recurso».

**ADM-T1D112** reproduce lo mismo sin ninguna escritura: con el control abierto, otra pestaña archiva y después restaura, y el detalle se renueva (lo que hacen la navegación o la escucha). Vuelven a aparecer abiertos:
- la confirmación de borrar una publicación y la de un comentario;
- el formulario de «Nuevo tema» (montado de nuevo y vacío, sin el botón «Nuevo tema»);
- el formulario de renombrar «Unidad 1».

**Esperado / Obtenido:**
- **Esperado:** archivar la clase cancela lo que estaba a medio usar. El plan dice que, en una archivada, el control "no se pinta" (§D-9, filas 4, 6, 8, 11, 12 y 18), y lo escrito "se conserva hasta ese momento; después ya no hay dónde guardarlo" (§D-9, Enmienda 2). Al restaurarse, se ve la clase como se ve al abrirla: «Borrar publicación», «Borrar tema», «Borrar recurso», «Borrar» y «Nuevo tema» cerrados.
- **Obtenido:** el estado `confirmando`, `creando` o `renombrando` del componente padre sobrevive mientras el control está oculto, y vuelve a pintarse al restaurar. La falla está en la aserción posterior a la restauración (`:1118` y `:1185`), con `expected <button …> to be null` sobre «Sí, borrar», «Sí, borrar tema», «Sí, borrar recurso», «Crear tema», «Guardar nombre» y «Sí, borrar comentario». Las aserciones anteriores (el control se oculta al archivar y queda un solo aviso) pasan.

**Por qué importa:** una confirmación destructiva aparece sin que la persona la haya pedido de nuevo, a un clic de borrar. En el caso del maestro, ni siquiera fue él quien restauró: la restauró el admin en otra sesión, y la confirmación reaparece al renovarse el detalle. DESIGN.md §7.14 pide que el foco y lo que se ofrece respondan a lo que la persona hizo. La tabla A del resumen ("Control a medio usar … deja de pintarse con su estado; no se manda nada") no contempla la vuelta a activa.

**Requisito o regla violada:** §D-9 (P-03 a: la clase archivada sin controles de escritura, y lo escrito no se conserva después del detalle nuevo) y la regla de estados vecinos de `AGENTS.md`: el mecanismo "solo lectura" tiene la transición "pasa a activa" (tabla A, fila "«Restaurar» o 409 `CLASE_NO_ARCHIVADA`"), y ahí no se aplicó.

**Hermanos que comparten el patrón** (el estado de "abierto" vive en un componente que sigue montado mientras el control se oculta), para que el programador los recorra:
- `publicacion-del-muro.tsx` (`confirmando`);
- `comentarios-de-publicacion.tsx` (`confirmando`);
- `seccion-de-tema.tsx` (`confirmando`, `renombrando`);
- `trabajo-view.tsx` (`creando`);
- `elemento-de-recurso.tsx` (`confirmando`).

La confirmación de borrar un comentario y la de borrar un recurso tienen caso propio en ADM-T1D112 y en ADM-T1D111.

## Atacado sin hallazgos
1. **El `useLayoutEffect` de M-01 (a):**
   - **ADM-T1D101.** La persona escribe en Avisos y pulsa «Publicar anuncio», que recibe el `409`. Con el detalle nuevo ya pedido y retenido, enfoca la raíz (clic en blanco) justo antes de que llegue. Al soltar el detalle (archivada), el foco se queda en la raíz, sin pasar al título, y queda un solo aviso.
   - **ADM-T1D102.** Clic en blanco y navegación a Recursos: el foco sigue en la raíz, y al archivarse se queda ahí. Después:
     - otra pestaña restaura y vuelve el formulario;
     - la persona enfoca "Título del recurso";
     - la clase se archiva otra vez;
     - el foco va al `h1`, no se queda en la raíz ni cae en `<body>`.

     La foto se toma en cada cambio y no queda vieja.
2. **El foco nunca cae en `<body>` cuando el control sí se pierde (ADM-T1D103, 21 casos):**
   - con el foco en cada control de las filas 1 a 20, desde la perspectiva del admin, más la confirmación «Sí, borrar» abierta y la fila 5 desde la del alumno (el campo de comentar);
   - la clase pasa a archivada con el detalle renovado;
   - en todos: el control sale del documento, aparece el aviso, el foco queda en un elemento conectado dentro de la raíz de la clase y no sale ninguna escritura.

   Cubre el punto 3: las filas 3 a 20 del admin no se pintan, y la fila 5 del alumno tampoco.
3. **Cambio de clase, y atrás y adelante entre una archivada (A) y una activa (B) (ADM-T1D104, 6 casos):**
   - en Avisos, Actividades, Categorías, Recursos y las rutas 20 y 21, como admin;
   - recorrido: A sin caché → B sin caché → atrás a A, con caché (el detalle de A no se vuelve a pedir) → adelante a B, con caché;
   - cada vez:
     - el `h1` es el de su clase;
     - el aviso y el texto de archivada solo están en A;
     - el control de escritura de la sección solo está en B;
     - ningún resto de la otra clase;
     - ninguna escritura.
4. **Varios `409 CLASE_ARCHIVADA` a la vez (ADM-T1D105):**
   - con el detalle retenido: «Publicar anuncio», «Sí, borrar» de la publicación y una escritura de otra clase (B, con un `MutationObserver` sobre el mismo `QueryClient`);
   - resultado: una sola petición del detalle de A antes y después de soltarlo, dos avisos (uno por escritura de A) y ninguno por la de B;
   - el detalle de B no se pide.
5. **`retry: 1` en `GET …/codigo` (ADM-T1D106):**
   - mientras el primer `409` espera su reintento (`fetchFailureCount` 1, `fetchStatus` "fetching"), el detalle no se ha pedido y no hay aviso fijo;
   - tras el segundo `409`, el detalle se pide una sola vez, aparece el aviso y no sale ningún aviso emergente.
6. **«Restaurar» del aviso:**
   - **ADM-T1D107**, con `403 SIN_ACCESO_A_LA_CLASE` (otra pestaña la borró):
     - un `POST` aunque haya dos clics;
     - un aviso, sin éxito;
     - el detalle pasa a su error ("No tienes acceso a esta clase.") sin el `h1`;
     - el foco queda en el contenedor del error, no en `<body>`.
   - **ADM-T1D108**, con la restauración en vuelo desde la tabla de `/admin/clases`:
     - al entrar a la clase, «Restaurar» del aviso está en espera (`aria-busy`) y dos clics no mandan nada;
     - al salir a la tabla y volver (el aviso se monta de nuevo), sigue en espera y otro clic tampoco manda nada;
     - al soltar: un solo `POST`, un solo "Clase restaurada", sale el aviso y vuelve «Publicar anuncio».
7. **Las rutas 20 y 21 con datos escritos:**
   - **ADM-T1D109**, guardar recibe el `409`:
     - una sola escritura (`PUT`), aunque haya dos clics;
     - un aviso;
     - aparece el texto de archivada y sale el formulario;
     - ya con todo quieto, ninguna otra petición del formulario;
     - el foco dentro de la clase.
   - **ADM-T1D109b**, la clase pasa a archivada sin guardar, con el foco en el campo: ninguna escritura, ningún aviso y el foco en el `h1`.
8. **N-01d1-1 (ADM-T1D110).** Con la solicitud de subida retenida, la persona sale de la clase y la solicitud recibe el `409`:
   - un solo aviso ("No pudimos subir «lectura.pdf»: …"), sin publicación ni `PUT`, y el detalle no se pide;
   - al volver antes del `staleTime`, la clase se ve activa con su formulario y sin otra petición del detalle, que es lo declarado;
   - la siguiente publicación recibe el `409`: un aviso más, una sola petición del detalle, el aviso fijo y ninguna solicitud de subida nueva.

   Nada peor que lo declarado.

## Conteos y corridas (desde `frontend/`)
- **Puerta de carga:** dos lecturas seguidas de 25 % o menos y ningún `node` con `vitest` antes de cada corrida:
  - 22:20:44 `2` y 22:20:55 `11` (mi archivo);
  - 22:23:19 `22` y 22:23:31 `20` (ADM-T1D112 solo);
  - 22:24:41 `9` y 22:24:52 `5` (suite);
  - 22:28:27 `25` y 22:28:39 `8` (lint).
- **Mi archivo solo** (`npx vitest run src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx`, antes de sumar ADM-T1D112): `Tests 3 failed | 38 passed (41)`. Los tres rojos son ADM-T1D111.
- **ADM-T1D112 solo** (`-t "ADM-T1D112"`): `Tests 4 failed | 41 skipped (45)`. Todos fallan en la aserción posterior a la restauración (`:1185`).
- **Suite con el comando literal del resumen**, más mi archivo, que el filtro `src/features/clases` ya incluye:
  - comando: `npx vitest run src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/features/calificaciones/gradebook-01d.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`;
  - resultado: `Test Files 1 failed | 158 passed (159)` · `Tests 7 failed | 3521 passed (3528)` (inicio 22:24:55; 189.74 s);
  - cuadre: 3528 son los 3483 del resumen y del manager más mis 45;
  - los 7 rojos son, todos, de T-01 (ADM-T1D111 ×3 y ADM-T1D112 ×4);
  - todo lo demás, en verde, incluido C-10 (V-06 con 77).
- **lint:** `npm run lint` → exit 0. La última línea es `> tsc -b`, sin errores, y antes sale `All matched files use Prettier code style!`.
- **Formato del archivo nuevo:** `npx prettier --write` acotado a ese archivo, dentro de `frontend/`.

### V-01
- **Comprobación:** `sha256sum -c` con la lista de la ronda 0 de 01d1 (`825acabd…`, 259 líneas) da 259 `OK` y 0 diferencias. `git ls-files` sigue dando 259 `*.ataque` rastreadas.
- **Nueva, sin rastrear:** `frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx`, `8d58d05c409c560d115a7ea51bc29a028d0f201658b3db979b1c53d2ec2d2e6a`. Total: 260.
- No cambié ninguna `*.ataque` existente ni código de producción.

## No atacado y por qué
- **El foco con un clic real en un navegador** (si Chrome dispara `focusout` al quitar del DOM el control enfocado): exige navegador. jsdom pasa el foco a `<body>` sin evento, que es lo que el gancho supone. Queda para la comprobación humana si el manager lo pide.
- **N-01d1-3** (cambio a una clase sin caché con el foco en la raíz: queda en `<body>`): está declarado y es igual a como era antes de 01d1. No lo volví a atacar.

## Cierre de la ronda 1 de 01d1
- **Veredicto: ROTO.**
- **T-01 (media):** al restaurar la clase se reabre solo lo que estaba a medio usar. Siete casos en rojo (ADM-T1D111 ×3 y ADM-T1D112 ×4), con hermanos en cinco archivos.
- **Resisten los ocho puntos de ataque:** M-01 (a), el cambio de clase y atrás y adelante, las filas del admin y del alumno, varios `409` a la vez, el reintento del código, «Restaurar» con `403` y en vuelo desde la tabla, las rutas 20 y 21, y N-01d1-1. Son 38 casos en verde de mi archivo.
- **Mi archivo:** `clase-archivada-01d1-r1.ataque.test.tsx`, 45 casos (`8d58d05c…`).
- **Suite:** `Tests 7 failed | 3521 passed (3528)`.
- **lint:** exit 0.
- **V-01:** 259 sin cambio, más 1 nueva.

## Ronda 2 — ADMIN-01d1

Veredicto: **ROTO**. Un hallazgo, T-02, de severidad media: en la ruta 20, una recarga tras un conflicto que todavía está en vuelo sobrevive al archivado y a la restauración. Cuando llega, reinicia el formulario ya restaurado, borra lo que la persona escribió después de restaurar y le quita el foco. Es un estado vecino del remedio de T-01 sobre `reinicios`. T-01 queda cerrado y lo demás resiste.

- **Leí:**
  - el plan, con SHA-256 `3822b6c0…`;
  - `resumen-programador.md` (`384a7e2b…`): "## ADMIN-01d1 — Corrección ronda 1";
  - `revision.md` (`02eb3f91…`): "## Verificación de la corrección de la ronda 1 — ADMIN-01d1";
  - el diff del remedio en los seis archivos.
- **Sin navegadores.** La otra copia de trabajo no se usa.
- **Puerta de carga** antes de cada corrida. No terminé ningún proceso.

### Regresiones (antes de atacar)
Comando, desde `frontend/` (puerta: 23:00:23 `21` y 23:00:35 `20`): `npx vitest run src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx src/styles/clases-r1.ataque.test.ts src/features/clases/clases-admin-01c-r1.ataque.test.tsx src/features/clases/clases-admin-01c-r2.ataque.test.tsx src/features/clases/clases-admin-01c-r3.ataque.test.tsx` → `Test Files 5 passed (5)` · `Tests 99 passed (99)` (inicio 23:00:37).

- Son 45 de la ronda 1, más 11 de `clases-r1`, más 23, 8 y 12 de 01c.
- **T-01 cerrado:** los siete rojos de ADM-T1D111 y ADM-T1D112 están en verde.

### Archivo nuevo

| Archivo | SHA-256 | Casos |
|---|---|---|
| `frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx` | `32fd1be4f0b957965e60cff91d01e4e5012dad150873f9a51d72a9a02eca2a43` | 19 (ADM-T2D101 a ADM-T2D105) |

- **Montaje:**
  - el router real (`rutas` de `app/router`);
  - el `QueryClient` es una copia exacta de las opciones de `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`). Todos los casos necesitan marcar viejo el detalle como lo haría otra pestaña;
  - el arnés es el de mi ronda 1, copiado (una prueba no importa de otra).
- **Sin tiempos fijos.** Las esperas son por el DOM, la caché o las peticiones, y lo que hay que sostener se retiene con una promesa.
- **ADM-T2D102** registra con un observador del DOM cada cambio en que el aviso fijo y el control abierto conviven. Su precondición exige que el observador haya visto cambios, para que el caso no pase sin observar nada.

## Hallazgos

### T-02 — Ruta 20: la recarga tras un conflicto que llega después de restaurar reinicia el formulario, borra lo escrito y se lleva el foco
Severidad: media

Prueba: `frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx`, "ADM-T2D103b: la recarga sigue en vuelo cuando la clase se restaura y llega después: el formulario no se reinicia ni se lleva el foco de la persona".

**Reproducción** (maestro, `…/recursos/<id>/editar`, router real):
1. Escribe "Guía nueva" y pulsa «Guardar cambios». El `PUT` recibe `409 RECURSO_MODIFICADO` y `recargarTrasConflicto` pide el recurso: la recarga queda en vuelo.
2. Otra sesión archiva la clase y el detalle se renueva: aparece "Esta clase está archivada: solo se puede consultar." y el formulario sale. Con el remedio de T-01, `reinicios` vuelve a 0.
3. Otra sesión restaura la clase y el detalle se renueva: el formulario vuelve a nacer, con la `key` 0 y sin `enfocarAlMontar`.
4. La persona escribe "Lo que escribo después" y deja el foco en el `h1` de la clase.
5. Llega la recarga del paso 1. `recargarTrasConflicto` hace `setReinicios((n) => n + 1)` con la clase ya activa, así que el formulario se vuelve a montar con la `key` 1 y `enfocarAlMontar`.

**Esperado / Obtenido** (`expect.soft`, las dos fallan en la misma corrida):
- **Foco (`:708`):** se espera que siga en el `h1`, donde lo dejó la persona. Obtenido: está en el campo "Título del recurso" (`expected <input …> to be <h1 …>`).
- **Lo escrito (`:709`):** se espera que el campo conserve "Lo que escribo después", lo que escribió en el formulario ya restaurado. Obtenido: "Guía actualizada". El reinicio descarta lo escrito después de la restauración.

**Lo que sí funciona:**
- **ADM-T2D103:** si la recarga llega con la clase todavía archivada, el remedio la absorbe (`reinicios` se queda en 0). Al restaurar, el formulario nace con la versión de la caché ("Guía actualizada") y sin quitar el foco.

**Por qué es T-02 y no T-01:**
- **El remedio de T-01** reinicia `reinicios` en el render en que la vista está en solo lectura.
- **El incremento pendiente** es asíncrono: lo dispara la recarga del conflicto, que la vista no cancela ni olvida al pasar a solo lectura.
- **El resultado:** si se resuelve después de volver a activa, el reinicio "del conflicto" cae sobre un formulario que ya no es el del conflicto.

Es el estado vecino "recarga en vuelo" del mismo mecanismo, que la tabla de hermanos del resumen no recorre: su fila 20 solo cubre la recarga ya asentada.

**Requisito o regla violada:**
- §D-9 (fila 20) y el punto 3 del manager: "el formulario nace sin quitar el foco y con la versión de la caché".
- DESIGN.md §7.14: no se le quita el foco a un control que la persona eligió.
- La regla de estados vecinos de `AGENTS.md`.

## Atacado sin hallazgos
1. **El `DELETE` en vuelo al archivar y restaurar** (ADM-T2D101, 5 casos: publicación, comentario y tema, con el admin y el alumno sobre su comentario, y recurso):
   - con el `DELETE` retenido, la clase se archiva (la confirmación se cierra) y se restaura (sigue cerrada);
   - la persona vuelve a abrir la confirmación y pulsa «Sí, borrar…» dos veces: no sale otro `DELETE`;
   - al soltarlo, un solo aviso de éxito y ningún error.
2. **Archivar y restaurar dos veces seguidas con las recargas retenidas** (ADM-T2D102, 7 casos):
   - controles: las cinco confirmaciones de arriba, el formulario de «Nuevo tema» y el de renombrar;
   - en la recarga que restaura, otra marca de viejo se une sin cancelarla (`cancelRefetch: false`, como la escucha);
   - el observador del DOM no vio ningún cambio con el aviso fijo y el control abierto a la vez;
   - al final está cerrado, salieron 4 recargas y ninguna escritura.
3. **Ruta 20 con la recarga del conflicto que llega con la clase archivada** (ADM-T2D103): el formulario renace con la versión de la caché y sin quitar el foco. El caso de la recarga que llega después de restaurar es T-02.
4. **Los estados de lectura se conservan** (ADM-T2D104: «Ver comentarios», «Ver material» y «Ver recurso»): abiertos y con el foco en «Ocultar…», siguen conectados, abiertos y con el foco al archivar y al restaurar.
5. **«Subir» en vuelo** (ADM-T2D105, 2 casos): la persona lleva el foco a «Recursos» de la barra de secciones y la clase se archiva. Se asiente con la clase restaurada o todavía archivada, el foco no se mueve, y sale un solo `PUT` de orden.
6. **La perspectiva del alumno** (punto 6): la confirmación de borrar su propio comentario está en ADM-T2D101 y ADM-T2D102, en verde.

## No atacado y por qué
- **El foco con un clic real en un navegador:** exige abrir uno.

## Conteos y corridas (desde `frontend/`)
- **Puerta de carga** (dos lecturas seguidas de 25 % o menos y ningún `node` con `vitest`):
  - 23:00:23 `21` y 23:00:35 `20` (regresiones);
  - 23:04:44 `4` y 23:04:55 `6` (mi archivo, segunda corrida);
  - 23:07:35 `17` y 23:07:46 `23` (suite);
  - 23:12:35 `20` y 23:12:46 `7` (lint).
  - La primera corrida de mi archivo (23:01:57) dio `Tests 3 failed | 16 passed (19)`. Dos de esos rojos eran fallas mías de ADM-T2D102: el ancla volvía a abrir los comentarios ya abiertos. Las corregí antes de contar.
- **Mi archivo solo** (`npx vitest run src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx`, inicio 23:04:58): `Tests 1 failed | 18 passed (19)`. El rojo es ADM-T2D103b (T-02).
- **Suite con el comando literal del resumen** (`npx vitest run src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/features/calificaciones/gradebook-01d.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`; el filtro `src/features/clases` ya incluye mis dos archivos):
  - resultado: `Test Files 1 failed | 159 passed (160)` · `Tests 1 failed | 3554 passed (3555)` (inicio 23:07:49; 190.47 s);
  - cuadre: 3555 son los 3536 del resumen más mis 19;
  - el único rojo es ADM-T2D103b.
- **lint:** `npm run lint` → exit 0. La última línea es `> tsc -b`, sin errores.
- **Formato:** `npx prettier --write` solo sobre mi archivo, dentro de `frontend/`.

### V-01
- `sha256sum -c` con la lista `825acabd…` (259 líneas) da 259 OK y 0 diferencias. `git ls-files` da 259 rastreadas.
- Sin rastrear, las dos mías del encargo:
  - `clase-archivada-01d1-r1.ataque.test.tsx`, `8d58d05c409c560d115a7ea51bc29a028d0f201658b3db979b1c53d2ec2d2e6a`, sin cambio desde la ronda 1;
  - `clase-archivada-01d1-r2.ataque.test.tsx`, `32fd1be4f0b957965e60cff91d01e4e5012dad150873f9a51d72a9a02eca2a43`, nueva.
- Total: 261.
- No cambié código de producción ni ninguna `*.ataque` existente.

## Cierre de la ronda 2 de 01d1
- **Veredicto: ROTO.**
- **T-02 (media):** en la ruta 20, la recarga tras un conflicto que llega después de restaurar reinicia el formulario, descarta lo escrito y se lleva el foco. Un caso en rojo, ADM-T2D103b, con dos aserciones suaves.
- **T-01 cerrado.**
- **Resisten** los puntos 1, 2, 4, 5 y 6, y el punto 3 cuando la recarga llega con la clase archivada.
- **Suite:** `Tests 1 failed | 3554 passed (3555)`.
- **lint:** exit 0.

## Ronda 3 — ADMIN-01d1

Veredicto: **ROTO**. Un hallazgo, T-03, de severidad media: «Regenerar código» en vuelo pierde su aviso cuando la clase se archiva antes de la respuesta. Es la última ronda, así que se escala al humano. T-01 y T-02 siguen cerrados, y los puntos de ataque 2 a 7 del manager resisten. T-03 no está en esos puntos: salió de revisar la fila 1 de la tabla de efectos asíncronos del resumen.

- **Leí:**
  - el plan, con SHA-256 `3822b6c0…`;
  - `resumen-programador.md` (`d24ebf5e…`): "## ADMIN-01d1 — Corrección ronda 2";
  - `revision.md` (`a0747eec…`): "## Verificación de la corrección de la ronda 2 — ADMIN-01d1";
  - `components/clase/hooks.ts`, `editar-recurso-view.tsx`, `trabajo-view.tsx`, `codigo-de-clase.tsx` y los formularios con varios pasos.
- **Equipo:** conectado a la corriente en todas las corridas (`BatteryStatus` 2, antes de cada una, y otra vez después de la suite).
- **Sin navegadores.** La otra copia de trabajo no se usa. No terminé ningún proceso.

### C-n de ADM-T1D110 (lo pidió el manager)

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-n de 01d1, ronda 3 | `frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx`, caso ADM-T1D110 | Al volver a la clase, la respuesta de `GET …/codigo` se retiene con una promesa. Monta el `QueryClient` copia de `app/providers.tsx`, porque el caso necesita saber cuándo está todo quieto | `8d58d05c409c560d115a7ea51bc29a028d0f201658b3db979b1c53d2ec2d2e6a` → `b465fd900c2a12681681f04b6ce3c54b23f1028d8b0fdc8545681bdf47e33d60` |

- **Lo que dejó de depender del tiempo:** las dos precondiciones (sin aviso fijo y sin otra petición del detalle al volver) y la cuenta `+1`. Ahora se comprueban con el código retenido y después de confirmar que su petición salió.
- **Lo que sigue protegiendo, y lo que gana:**
  - lo declarado al volver antes del `staleTime`;
  - un aviso por disparador;
  - ninguna solicitud de subida nueva;
  - con el código ya soltado, una cuenta exacta que antes no se comprobaba: 2 peticiones más del código (la primera y su reintento) y el detalle en `+2`, ya todo quieto. Es la petición extra de la decisión 9, sin ciclo.
- **Nada se relajó.** El título del caso sigue diciendo "con una sola petición del detalle", que vale para la escritura; la petición extra del código la explica el comentario de la C-n.
- **Corridas del caso solo:** 3 de 3 `Tests 1 passed | 44 skipped (45)` (10:55:02, 10:55:24 y 10:55:46), cada una tras la puerta de carga. También pasó en la suite.
- **Límite:** no comprobé con una mutación que la nueva cuenta detecte un ciclo, porque no toco producción.

### Regresiones (antes de atacar)
Comando, desde `frontend/` (puerta: 10:45:01 `1` y 10:45:13 `3`): `npx vitest run src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx src/features/clases/clases-admin-01c-r1.ataque.test.tsx src/features/clases/clases-admin-01c-r2.ataque.test.tsx src/features/clases/clases-admin-01c-r3.ataque.test.tsx src/styles/clases-r1.ataque.test.ts` → `Test Files 6 passed (6)` · `Tests 118 passed (118)` (inicio 10:45:15; 27.53 s).

- Son 45 + 19 + 23 + 8 + 12 + 11.
- **T-02 cerrado:** ADM-T2D103b está en verde. Los casos de T-01 también.

### Archivo nuevo

| Archivo | SHA-256 | Casos |
|---|---|---|
| `frontend/src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx` | `a188c90deb61bafedabc50b76c77b02507964297cd6b155f905114839f728493` | 43 (ADM-T3D101 a ADM-T3D112) |

- **Montaje:** el router real (`rutas` de `app/router`). Todos los casos usan el `QueryClient` copia exacta de `app/providers.tsx`, para marcar viejo el detalle como lo haría otra pestaña. Ninguno monta `<Providers>`.
- **Sin tiempos fijos.** Esperas por el DOM, la caché o las peticiones, y respuestas retenidas con una promesa.

## Hallazgos

### T-03 — «Regenerar código» en vuelo pierde su aviso cuando la clase se archiva antes de la respuesta
Severidad: media

Pruebas (en `frontend/src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx`):
- "ADM-T3D111 (a): la respuesta es 409 CLASE_ARCHIVADA con la clase ya archivada: un aviso (matriz de 01d1)";
- "ADM-T3D111 (b): la respuesta es 500 con la clase ya restaurada: un aviso (T-06: que el maestro no crea que regeneró)";
- "ADM-T3D111 (c): la respuesta es 200 con la clase ya restaurada: el código nuevo se ve y lo dice un aviso".

Control: "ADM-T3D111 (control): sin archivar, la respuesta %s da su aviso" (500 y 200) pasa. El rojo es solo el camino que pasa por la archivada.

**Reproducción (maestro, Avisos):**
1. Pulsa «Regenerar código» y «Sí, regenerar». El `POST …/codigo` queda en vuelo.
2. La clase se archiva y el detalle se renueva. `CodigoDeClase` se desmonta.
3. Llega la respuesta. Los avisos viven en los callbacks de `regenerar.mutate` (`codigo-de-clase.tsx:58-69`), que TanStack Query no llama con el componente desmontado. `useRegenerarCodigo` no avisa: su `onError` solo marca viejo el detalle.

**Esperado / Obtenido:**

| Caso | Esperado | Obtenido |
|---|---|---|
| (a) `409 CLASE_ARCHIVADA` con la clase archivada | Un aviso | Ninguno (`expected [] to have a length of 1`). Queda el aviso fijo de la clase archivada |
| (b) `500` con la clase ya restaurada | "No pudimos regenerar el código. Inténtalo de nuevo." | Ninguno. Se ve el código viejo, sin decir que falló |
| (c) `200` con la clase ya restaurada | "Código nuevo listo" | Ninguno. El código cambia en pantalla sin aviso |

**Por qué importa:** el caso (b) es lo que corrigió T-06 de CLASES: quien regenera porque el código se filtró puede creer que el viejo ya no sirve. Exige una ventana estrecha: archivar y restaurar mientras la petición vuela. El caso (a) solo exige que el archivado llegue antes que la respuesta, y ahí el aviso fijo ya dice por qué.

**Requisito o regla violada:** la matriz de 01d1, fila "Cualquier escritura de `features/clases`": `CLASE_ARCHIVADA` da un aviso, también con la vista desmontada. También la regla de `AGENTS.md` de que cada disparador anuncie un solo aviso.

**Lo que dicen los documentos:**
- La tabla de efectos del resumen (fila 1, `regenerar.mutate`) nombra el aviso, pero lo clasifica como "Solo cierra" y "No hace falta". Pasa por alto que el aviso se pierde.
- La tabla de O-01d1-8 sí lo anota: "su aviso sigue en el componente".

**Alcance:**
- El mismo aviso también se perdería al salir de la clase con la petición en vuelo. Eso es de antes de 01d1, lo digo por lectura del código (`codigo-de-clase.tsx` no cambia en 01d1) y no lo corrí. 01d1 suma el camino del archivado.
- Las demás escrituras de las filas 1 a 21 avisan desde el gancho. Lo comprobé con ADM-T3D112 en categorías, crear tema y renombrar tema, y con ADM-T3D101 en las filas 3, 16 y 20. En el resto (comentar, mover) lo leí en el código y no lo corrí con la clase archivada en vuelo.

## Atacado sin hallazgos
1. **Manejadores de varios pasos con el archivo en subida** (el `PUT` al almacén retenido, filas 3, 16 y 20):
   - **ADM-T3D101**, la subida termina con la clase restaurada: una sola escritura, un aviso de éxito y sin navegar. El formulario nuevo no hereda el archivo y conserva lo escrito y el foco.
   - **ADM-T3D102**, termina con la clase archivada: la escritura recibe el `409`, un solo aviso y nada navega. Al restaurar, el formulario nace limpio (o con el recurso, en la fila 20) y sin llevarse el foco.
   - **ADM-T3D103**, el almacén rechaza el archivo con la clase restaurada: un aviso con el nombre del archivo, sin escritura, y el formulario nuevo no cambia.
2. **Cambio de clase con efectos en vuelo** (A activa, B archivada; con B en caché y sin ella; la respuesta llega en B o de vuelta en A):
   - **ADM-T3D104**, «Subir»: el foco de la persona no se mueve y sale un solo `PUT`.
   - **ADM-T3D105**, guardado de la ruta 20: un solo aviso, no navega y lo escrito después sigue.
3. **La segunda vuelta tras un reinicio legítimo (ADM-T3D106):**
   - `409` y reinicio con foco; archivar y restaurar sin llevarse el foco; otro `409` y otro reinicio con foco; y el tercer guardado navega;
   - los envíos llevan las versiones 0, 1 y 2, con un aviso por `409`.
4. **El orden que se asienta con la clase archivada (ADM-T3D109, 3 casos, y ADM-T3D109b):** con el foco en «Ver material» del mismo tema, en el `h1`, en «Recursos» o soltado en `<body>`, el foco no salta al asentarse ni al restaurar.
5. **Los órdenes de la ruta 20 como admin (ADM-T3D107):**
   - (a) la recarga llega después de restaurar;
   - (b) el `200` llega después de restaurar y con la clase archivada;
   - (c) el `409` llega después de restaurar;
   - (d) el `500` llega después de restaurar;
   - (e) el primer guardado justo después de restaurar, con dos clics: un `PUT`, un aviso y navega a los Recursos del admin;
   - (f) ese primer guardado recibe `409`: sí recarga, reinicia y se lleva el foco.
6. **N-01d1-4, solo en lo permitido (ADM-T3D108, maestro y admin):** el segundo `409` deja un aviso por envío, el foco en el campo y la versión del servidor. No lo cuento como hallazgo.
7. **Restaurar desde las rutas 20 y 21 (ADM-T3D110, 4 casos):** con el foco en «Volver a…» o en «Restaurar», vuelve el formulario y el foco va al `h1`, sin escrituras.
8. **Otras escrituras en vuelo con la clase restaurada (ADM-T3D112):** en categorías, crear tema y renombrar tema: un aviso, nada se reabre y el foco de la persona no se mueve.

## No atacado y por qué
- **El foco con un clic real en un navegador:** exige abrir uno.
- **Comentar y mover con la clase archivada en vuelo:** los leí en el código, donde avisan desde el gancho, pero no los corrí. Son lo que queda sin ejecutar de la tabla de efectos.

## Conteos y corridas (desde `frontend/`)
- **Puerta de carga** (dos lecturas seguidas de 25 % o menos, `BatteryStatus` distinto de 1 y ningún `node` con `vitest`):
  - 10:45:01 `1` y 10:45:13 `3` (regresiones);
  - 10:45:50 `7` y 10:46:02 `0` (primera corrida de mi archivo);
  - 10:48:39 `0` y 10:48:52 `15` (segunda);
  - 10:52:41 `2` y 10:52:53 `2` (tercera);
  - 10:54:01 `18` y 10:54:13 `13` (cuarta);
  - 10:56:02 `4` y 10:56:14 `11` (suite);
  - 10:59:39 `19` y 10:59:50 `14` (lint).
- **Lo que corregí en mis propias pruebas:** en la primera corrida, ADM-T3D107 (c) falló por un error mío: esperaba `isMutating` en 0 con el `PUT` retenido. Lo corregí antes de contar. Las corridas segunda y tercera tenían menos casos: los de ADM-T3D111 y ADM-T3D112 y el control se sumaron por partes.
- **Mi archivo solo, versión final** (`npx vitest run src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx`, inicio 10:54:15): `Tests 3 failed | 40 passed (43)`. Los tres rojos son ADM-T3D111 (a), (b) y (c).
- **Suite con el comando literal del resumen, sin bandera** (`npx vitest run src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/features/calificaciones/gradebook-01d.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`; el filtro `src/features/clases` ya incluye mis tres archivos):
  - resultado: `Test Files 1 failed | 160 passed (161)` · `Tests 3 failed | 3607 passed (3610)` (inicio 10:56:15; 192.32 s);
  - cuadre: 3610 son los 3567 del resumen y del manager más mis 43;
  - los únicos rojos son los tres de T-03.
- **lint:** `npm run lint` → exit 0. La última línea es `> tsc -b`, sin errores.
- **Formato:** `npx prettier --write` solo sobre mis dos archivos de esta ronda, dentro de `frontend/`.
- **Un descuido de forma:** el guion de un solo uso que aplicó la C-n lo escribí en `/tmp` y no en el scratchpad de la sesión. Ya lo borré.

### V-01
- `sha256sum -c` con la lista `825acabd…` (259 líneas) da 259 OK y 0 diferencias. `git ls-files` da 259 rastreadas.
- Sin rastrear, las tres mías del encargo:

| Archivo | SHA-256 | Estado |
|---|---|---|
| `clase-archivada-01d1-r1.ataque.test.tsx` | `b465fd900c2a12681681f04b6ce3c54b23f1028d8b0fdc8545681bdf47e33d60` | Cambia por la C-n de ADM-T1D110 (antes `8d58d05c…`) |
| `clase-archivada-01d1-r2.ataque.test.tsx` | `32fd1be4f0b957965e60cff91d01e4e5012dad150873f9a51d72a9a02eca2a43` | Sin cambio |
| `clase-archivada-01d1-r3.ataque.test.tsx` | `a188c90deb61bafedabc50b76c77b02507964297cd6b155f905114839f728493` | Nueva |

- Total: 262. No toqué código de producción.

## Cierre de la ronda 3 de 01d1
- **Veredicto: ROTO.** Es la tercera ronda: se escala al humano.
- **T-03 (media):** «Regenerar código» en vuelo pierde su aviso si la clase se archiva antes de la respuesta. Tres casos en rojo, con dos controles en verde.
- **Para decidir:**
  - La ventana del caso (b) es estrecha, y el caso (a) ya tiene el aviso fijo que explica el estado.
  - El remedio parece acotado: el aviso pasaría al gancho, como en las demás mutaciones. No lo he probado, y el manager y el humano deciden si entra en 01d1 o queda con destino.
- **Resisten** los puntos 2 a 7 del manager. T-01 y T-02 siguen cerrados, y la C-n de ADM-T1D110 está aplicada.
- **Suite:** `Tests 3 failed | 3607 passed (3610)`.
- **lint:** exit 0.

## Ronda 0 — ADMIN-01d2

Veredicto: **PARADA.** Apliqué C-11 y C-12 tal como los escribe §D-R0 → 01d2, y los dos quedan en rojo por la razón esperada. No basta con eso: el grep y dos sondas en memoria encontraron tres cosas que el plan no cubre, que no puedo resolver por mi cuenta y que el programador tampoco podría resolver sin apartarse del plan (P-01 a P-03, abajo).

Plan: `plan.md`, SHA-256 `82f0e21a381021c062ae5cdeddf55f711b52034ab938ca2a1dbc1c5e0307c1d2` (Enmiendas 1 a 11; lo comprobé al empezar). Base dentro de los paquetes: `7655a5b`. Antes de tocar nada, `git diff 7655a5b -- frontend backend shared` estaba vacío; después, solo cambian los dos archivos de C-11 y C-12.

Verificación propia (regla "Suites por ronda": lo que toco, los módulos, las vigiladas de fuera y `lint`):
- **lint del frontend:** `cd frontend; npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores.
- **test:** abajo van las corridas. Los únicos rojos con el código de hoy son los dos de C-11 y C-12.
- No corrí la suite completa del frontend ni la del backend: las corre el manager al cerrar la subentrega. 01d2 no toca el backend, así que no hay PA-07.

### Entorno y trabajo en paralelo
- **Trabajo en paralelo:** por el orquestador, la otra copia de trabajo no se usa.
- **Puerta de carga:** `BatteryStatus` 2 en todas las lecturas, ningún `node` con `vitest` en su línea de comandos y dos lecturas seguidas de 25 % o menos (`Win32_Processor.LoadPercentage`): 12:38:06 `7` y 12:38:15 `10` (C-n); 12:38:43 `5` y 12:38:52 `7` (módulos); 12:44:45 `9` y 12:44:54 `6` (vigiladas); 12:45:40 `0` y 12:45:49 `4` (sonda N-05); 12:51:24 `14` y 12:51:33 `9`, 12:54:32 `3` y 12:54:42 `2`, 12:57:13 `3` y 12:57:22 `4` (sonda T-03).
- **Dos corridas que no cuento:**
  - La primera de las vigiladas salió con 12:43:33 `27` y 12:43:42 `17`: la primera lectura rebasaba la puerta, porque mi guion todavía no esperaba. Dio el mismo resultado, pero la repetí con la puerta cerrada y solo cuento la segunda.
  - La primera de la sonda T-03 (12:47:17 `18` y 12:47:26 `15`) no vale: la sonda también transformaba las lecturas `?raw` y tiró 23 archivos estáticos por un error suyo. La corregí y la repetí por partes.
- Sin navegadores ni aplicaciones gráficas. No terminé ningún proceso.

### Cambios (solo C-11 y C-12)

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-11 | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | `:109` pasa de 14 a 15, ahora en `:112`, con su comentario de ronda antes de la línea. El resto del caso no cambia, y sigue protegiendo que la lista cambie solo con el plan y que ningún código del servidor se recorte | `4e6950f0fe571d6ae41a78380c59c20459fdf19f34c57e9777e4e34a6bc61c58` → `edf4d96e4b884eab718d06811877c17b611099a66d6857502f71eedb96026dda` |
| C-12 | `frontend/src/styles/clases-r1.ataque.test.ts` | V-06: el título y `toHaveLength` pasan de 77 a 78, con su comentario de ronda. En la lista fija entran, después de `categorias-de-solo-lectura.tsx` y con su comentario, `components/lista-de-clases-anteriores.tsx` 1, `clases-anteriores-view.tsx` 0, `clase-anterior-view.tsx` 0 y `clases-archivadas-view.tsx` 0. El resto de `features/clases/components/` sigue en 3. Lo que protege no cambia | `0ea4c6b87c65c9275b590b2404f174bdf04275a0d8ed009849f44258309c1c46` → `537e10bc0519805f2be98ff579b34c71eda6fa7d364e355bfbd0050f568ffcb6` |

El hash de antes de cada uno es el de `git show 7655a5b:<ruta>`, igual al del árbol al empezar. `git diff -U0`: `errores-ch3-r1.ataque`, un hunk (`@@ -109 +109,4`); `clases-r1.ataque`, tres (`@@ -185 +185,7`, el comentario y el título; `@@ -192 +198`, la cifra; `@@ -260,0 +267,6`, las cuatro entradas con su comentario). Ninguna otra `*.ataque` cambia. No toqué código de producción ni pruebas normales.

### Corrida de C-11 y C-12 (rojo esperado)

Comando, desde `frontend/`: `npx vitest run src/features/tareas/errores-ch3-r1.ataque.test.ts src/styles/clases-r1.ataque.test.ts`

```
 Test Files  2 failed (2)
      Tests  2 failed | 17 passed (19)
   Start at  12:38:26
   Duration  9.48s (transform 3.09s, setup 2.34s, import 4.13s, tests 201ms, environment 8.73s)
```

- **C-11:** "un código del servidor nunca se recorta…" falla con `expected 14 to be 15` (`:112`). Falta `CLASE_ARCHIVADA` en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de `features/tareas/data.ts`. La sonda T-03 lo suma en memoria y el caso pasa a verde.
- **C-12:** "V-06: … 78 enEspera" falla con `expected [ …(77) ] to have a length of 78 but got 77` (`:198`). Falta el `enEspera=` de «Cargar más». Pasa a verde cuando exista `lista-de-clases-anteriores.tsx` con exactamente uno y las tres vistas sin ninguno.
- Los otros 17 casos de los dos archivos, en verde, incluido V-07 (el plan dice que no cambia en 01d2).

### Línea base de los módulos (con el código de hoy)

Comando, desde `frontend/`: `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app`

```
 Test Files  1 failed | 199 passed (200)
      Tests  1 failed | 4220 passed (4221)
   Start at  12:38:54
   Duration  213.67s (transform 36.30s, setup 120.66s, import 315.77s, tests 1263.71s, environment 567.81s)
```

El único rojo es el de C-11. `src/components/clase` sigue sin pruebas propias.

### Vigiladas y estáticas de fuera de los módulos

Comando, desde `frontend/`: `npx vitest run src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts`

```
 Test Files  1 failed | 8 passed (9)
      Tests  1 failed | 177 passed (178)
   Start at  12:44:56
   Duration  8.54s (transform 26.20s, setup 4.81s, import 42.84s, tests 622ms, environment 21.89s)
```

El único rojo es V-06, el de C-12.

### Dos sondas en memoria (qué cae con el diseño del plan bien hecho)

El grep no alcanza para saber qué rompe un cambio de comportamiento. Por eso apliqué el diseño **al transformar, en memoria**, con un complemento de Vite en una configuración de Vitest fuera del repositorio. **Ningún archivo del repositorio cambia**: `git status` sigue con los dos de C-11 y C-12. Las configuraciones son `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\ce73329e-6e87-4432-b4fc-239c50515013\scratchpad\vitest.sonda-n05.config.mjs` y `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\ce73329e-6e87-4432-b4fc-239c50515013\scratchpad\vitest.sonda-t03.config.mjs`.

**Sonda N-05:** el `<Navigate replace>` de §D-9 en `ClaseLayout`, antes del `Outlet`, y una ruta `/estudiante/clases-anteriores/:claseId` que pinta el aviso. Comando: `npx vitest run --config <sonda-n05> src/features/clases/clase-archivada-01d1 src/features/clases/clases-admin-01c`, es decir, los diez archivos que nombran `archivadaEn`:

```
 Test Files  3 failed | 7 passed (10)
      Tests  4 failed | 376 passed (380)
   Start at  12:45:51
   Duration  30.22s (transform 12.15s, setup 5.54s, import 11.00s, tests 166.27s, environment 25.00s)
```

**Sonda T-03:** N-05, `CLASE_ARCHIVADA` en los códigos de tareas, `useMontado` en `components/clase/hooks.ts`, su uso en `useBorrarTarea`, `useEntregar`, `useComentarEnHilo` y `useCalificarEntrega`, y la rama del error de campo en el `catch` de `formulario-tarea.tsx` (tabla C). Tres corridas, una después de otra:

| Comando (`npx vitest run --config <sonda-t03> …`) | Resultado | Lo que cae |
|---|---|---|
| `src/features/tareas` | `Tests 1 failed \| 1145 passed (1146)` · 38 archivos | Solo CH3-A08 (`errores-ch3.test.ts:44`), que es la lista cerrada. C-11 pasa a verde |
| `src/features/clases src/features/calificaciones` | `Tests 4 failed \| 2605 passed (2609)` · 130 archivos | Los mismos cuatro de la sonda N-05 |
| `src/app src/lib/errores-ch3-r2.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts` | `Tests 569 passed (569)` · 34 archivos | Nada |

Lo que eso confirma del plan: T-03 no cambia ninguna `*.ataque` ni ninguna normal, y la lista cerrada de `features/tareas` es correcta. Lo que desmiente es lo de N-05 (P-01).

**Límite de las sondas:** son mi versión mínima del diseño, no la implementación. No aplican las filas 22 a 36, ni M-06, ni la tabla D. Esas solo actúan con la clase archivada, y las pruebas con un doble archivado son las diez de arriba; el grep de sus textos y rutas (abajo) no encontró choques. No prueban que el resto del plan funcione.

### PARADA

#### P-01. N-05 rompe tres `*.ataque` sin C-n y una normal fuera de la lista cerrada

§D-R0 de 01d2 dice "C-n: ninguno nuevo. Siguen C-11 y C-12" y "Ninguna prueba de `clase-archivada-01d1*` monta Dudas, Personas ni `features/tareas`". Lo segundo es cierto, pero no cubre esto: esas pruebas montan al **alumno en una clase archivada dentro de `ClaseLayout`**, y N-05 lo saca de ahí.

| Archivo | Caso | Por qué cae | Lo que falla con la sonda |
|---|---|---|---|
| `features/clases/clase-archivada-01d1-vista.test.tsx:351` (**normal**, de 01d1) | ADM-1D102 "perspectiva estudiante, archivada true" | Su router no tiene la ruta de destino y `Sonda` cuelga del `Outlet` que N-05 ya no pinta | `Unable to find an element by: [data-testid="sonda"]` |
| `features/clases/clase-archivada-01d1-r1.ataque.test.tsx:517` | ADM-T1D103 fila 5 (estudiante) | Espera que el foco quede dentro de la raíz de la clase, y la raíz ya no existe | `expected <body> not to be <body>` |
| `features/clases/clase-archivada-01d1-r2.ataque.test.tsx:435` (fila de `BORRADOS`) | ADM-T2D101 'comentario propio (alumno, fila 6)' | Tras restaurar, el alumno sigue fuera de Avisos. Con la sonda cae en `avisoFijo()`, porque mi ruta de prueba pinta el aviso sin leer el detalle; con la vista real caería un paso después: no hay comentario que abrir | `expected <p></p> to be null` |
| La misma fila, por `ABIERTOS` (`:529`) | ADM-T2D102 'la confirmación de borrar comentario propio…' | Con la sonda cae al esperar la segunda recarga retenida, porque mi ruta de prueba no observa el detalle; con la vista real caería en `caso.ancla()`: el alumno ya no está en Avisos | `expected [ … ] to have a length of 2 but got 1` |

- **Es inevitable, no un error de la sonda.** El mensaje exacto de los dos casos de `r2` depende de mi ruta de prueba, pero no el resultado. "Antes de pintar el `Outlet`" es el requisito de ADM-1D208 (ninguna sección llega a pedir nada), así que ninguna implementación correcta deja al alumno dentro. Aunque la vista lo devolviera a la clase al restaurar (OA-2), ADM-1D102, la fila 5 y ADM-T2D101 seguirían cayendo: el `Outlet` no se pinta en la archivada y los comentarios abiertos nacerían cerrados. ADM-T2D102 podría pasar en ese caso; no lo probé.
- **Tampoco el texto del plan se sostiene:** ADM-1D102 y S-15 dicen que `ClaseLayout` provee el contexto "en las tres perspectivas (`true` en una archivada)". Con N-05, el alumno nunca lee ese `true`.
- **Quién puede tocar qué:** la normal no está en la lista cerrada (el programador no la puede cambiar) y las tres `*.ataque` no tienen C-n (yo no las puedo cambiar). Por eso paro. Lo que protegen sigue valiendo para el maestro y el admin:
  - en ADM-1D102 quedan las otras cinco filas, y ADM-1D208 cubre al alumno;
  - en ADM-T2D101 y ADM-T2D102, `BORRADOS` ya tiene "comentario (admin)", con el mismo componente;
  - la fila 5 de ADM-T1D103 es la única de la tabla con el formulario de comentar, así que quitarla dejaría ese control sin el caso de foco; si se conserva, pasa a otra perspectiva.
- **Lo decide el arquitecto:** qué fila se quita y cuál cambia de perspectiva, con el C-n y la entrada de la lista cerrada que correspondan. No apliqué nada.

#### P-02. `clase-anterior-view.tsx`, tal como la escribe el plan, no pasa `lint`

§D-9 (`plan.md:386`) dice que `features/clases/clase-anterior-view.tsx` "monta `<MisCalificacionesView key={claseId} />`". Eso exige importar de `features/calificaciones`, y `eslint.config.mjs:173-190` lo prohíbe (regla 9 de `CLAUDE.md`). Hoy ningún archivo de `features/`, `components/`, `lib/` ni `services/` importa de `@/features/`, y las pruebas estáticas no lo detectan (ninguna lista incluye esta vista): lo detecta `lint`. Lo comprobé pasándole a ESLint el archivo como lo describe el plan, sin escribirlo:

```
cd frontend; printf '…' | npx eslint --config ../eslint.config.mjs --stdin --stdin-filename src/features/clases/clase-anterior-view.tsx
  1:1  error  '@/features/calificaciones/mis-calificaciones-view' import is restricted from being used by a pattern. Un módulo de features/ no importa de otro módulo; …
✖ 1 problem (1 error, 0 warnings)
```

- `router.tsx` sí puede importar de los dos módulos y está en "Se toca", así que hay salidas: una ruta hija con `Outlet`, o `children` desde el router. Pero cambian lo que §D-9 escribe, y también dónde vive `key={claseId}` (E-02, ADM-1D206).
- `ConClaseDeLaRuta` no lleva `key` (`mis-calificaciones-view.tsx:242`): si el arquitecto elige `Outlet`, la `key` tiene que ir en otro lado, o el filtro de una clase pasa a la otra.
- No se resuelve en la ronda 0. Lo decide el arquitecto.

#### P-03. "Volver a mis clases" no se puede cambiar sin un archivo que no está en "Se toca"

§D-9 (`plan.md:334`) y ADM-1D203 piden que, en una archivada, "Volver a mis clases" del maestro vaya a `/maestro/clases-archivadas`. El enlace vive en `components/encabezado-clase.tsx:38` y lee `capacidades.volverDestino` de `CAPACIDADES_POR_PERSPECTIVA`, que no sabe de archivadas. Hoy ningún archivo de producción nombra `clases-archivadas`: 01d1 no lo hizo, porque la ruta no existía.

- `encabezado-clase.tsx` no aparece en ninguna lista de §D-R0 de 01d2 (`plan.md:1451-1503`, cero coincidencias), y "Se toca" es cerrada.
- `clase-layout.tsx` no lo resuelve solo: `EncabezadoClase` recibe `clase`, `perspectiva` y `tituloRef`, y deriva las capacidades por dentro. Pasarle un destino también cambia ese archivo.
- La rama de error de `clase-layout.tsx:52` usa el mismo destino, pero ahí no hay detalle y no se sabe si la clase está archivada: se queda como hoy.
- Ninguna prueba existente fija el destino con una clase archivada: las de "Volver a mis clases" (`clase-layout.test.tsx:142` y `:377`) usan clases activas.
- Hace falta que "Se toca" sume `components/encabezado-clase.tsx`, con su alcance.

### Inventario por grep (lo que 01d2 puede romper aunque el diseño esté bien)

Son 42 las pruebas del frontend que leen el código fuente (`import.meta.glob`, `?raw`, `readFileSync`). Las revisé contra "Se toca" de 01d2, junto con las que simulan módulos (`vi.mock`) y las diez que montan una clase con `archivadaEn`. No entré en detalle en las que no leen ningún archivo de 01d2 (`app/fondo-r1`, `components/ui/badge-03b-r1`, las dos de `features/admin`, `features/clases/clases-r4`, `lib/xlsx-muestra` y las dos de tokens); sí corren en la línea base o en la suite del manager.

| Prueba | Qué fija | ¿Cae con 01d2 bien hecho? |
|---|---|---|
| `styles/clases-r1.ataque` V-06 | `enEspera=` por archivo, `disabled`, `aria-busy` | Sí, por la cifra: es C-12 (aplicado). O-01d2-1 |
| `styles/clases-r1.ataque` V-02 a V-05, V-07, V-13 | colores, escalas, `ring-`, vidrio, contexto, rojo | No (Enmienda 9). O-01d2-2 |
| `features/tareas/errores-ch3-r1.ataque:112` y `errores-ch3.test.ts:44` | los códigos de tareas | Sí, por la cifra: C-11 (aplicado) y lista cerrada |
| `lib/errores-ch3-r2.ataque:149` | recorre los códigos de tareas | No: el nuevo entra solo (la sonda T-03 lo corre, en verde) |
| `features/tareas/entregas-01e-r1.ataque:741-768` | `NUEVOS_01E`, en crudo, con comentarios | No. O-01d2-3 |
| `features/tareas/entregas-01e-r2.ataque:530-560` | ganchos de `components/adjuntos`, `renovarTras…` en 3, sin `@/features/` | No. O-01d2-3 |
| `features/tareas/entregas-01d-r3.ataque:675-735` | códigos que redirige, ganchos del alumno y del hilo | No: `useMontado` no se exporta desde `features/tareas/hooks.ts` |
| `features/tareas/entregas-01d-r1.ataque:881-894` y `entregas-01d-r2.ataque` | `RUTAS_01D`, sin `disabled`, `?? []`, valores por defecto | No. O-01d2-3 |
| `features/tareas/aviso-calificar-01c-r3.ataque:530-555` (CAL-T-127) | 5 llamadas a `avisarDelErrorDeLaEntrega(`, con sus argumentos | No. O-01d2-3 |
| `features/tareas/estatico-01c.test.ts` (CAL-1C12, CAL-1C13) y `estatico-01c-r1.ataque` (CAL-T-94 a CAL-T-98) | palabras prohibidas en comentarios, tipos, texto suelto, una sola acción principal, `.version` | No. O-01d2-4 |
| `features/tareas/tareas-01a-r1`, `tareas-01d-r1`, `r2` y `r3.ataque` | literales únicos; sin tipos fuera de `types.ts`; sin importar entre módulos | No. O-01d2-5 |
| `features/clases/estatico-02c-r1.ataque:78-90` y `:123-133` | lectores de `.puedeBorrar`, asignación, lista de `perspectivaDeRuta(` | No. O-01d2-6 |
| `features/clases/estatico-03c1-r1.ataque` | `personas-view`, `grid-cols-4/5`, `w-1/4` | No. O-01d2-2 |
| `features/clases/estatico-r1.ataque` | `?? []` y ternarios anidados en JSX en todo el módulo | No. Las condiciones nuevas son una trampa natural: O-01d2-5 |
| `features/clases/ver-mas-01e-r3.ataque:296-339` | 14 archivos, con `lib.ts`, `hooks.ts`, `data.ts` y `acciones-de-la-tarea.tsx` | No. O-01d2-5 |
| `features/clases/refactor-01c-r1.ataque:376-475` | `components/`, `lib/` y `services/` no importan de `features/`; `MOVIDOS` | No. O-01d2-7 |
| `features/clases/errores-ch3.test.ts` (CH3-B01) y `errores-ch3-r1.ataque` | códigos de clases (20), `MENSAJES_POR_CODIGO_DE_CLASES`, `.message` | No: 01d2 no suma códigos de clases |
| `lib/estatico-ch3-r1.ataque`, `lib/estatico-ch3-r2.ataque`, `lib/errores-de-api-estatico` (CH3-*), `lib/errores-ch3-r1.ataque` | lectores de `.message`, reinicio condicionado a `isError`, invisibles, `esErrorDeCursor` como referencia | No. `setReinicios(0)` y los reinicios de `confirmando` no son `.reset()`. O-01d2-8 |
| `services/apiClient-ch3*.test` | importadores exactos de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` | No, si nadie más la importa. O-01d2-8 |
| `components/layout/estatico-r1.ataque` (V-16 y arbitrarios) | `fixed` en `.tsx`, comentarios incluidos; lista exacta de valores `-[…]`; `animate-` | No. O-01d2-2 |
| `features/calificaciones/estatico-01d*` (CAL-1D09, CAL-T-182 a CAL-T-190) y `estatico-02b` | doce archivos exactos, sin `@/features/` ni `../../`, sin texto suelto | No. O-01d2-9 |
| `vi.mock("./hooks", …)` (`inicio-sin-datos-02c-r1`, `inicio-sin-datos-r2`) | fábricas cerradas de `features/clases/hooks` | No, si los inicios no llaman ganchos nuevos. O-01d2-10 |
| Dobles con `archivadaEn` (`clase-archivada-01d1*`, `clases-admin-01c*`) | la clase archivada dentro de `ClaseLayout` | **Sí, cuatro casos: P-01.** Lo demás, no: el grep de "Puedes seguir", "Publica el primer", "Lo que escribas", "Los pesos deben" y "Comparte el c" no da nada ahí, como dice el plan |

**Las listas exactas de importadores** (`refactor-01c-r1`, `apiClient-ch3*`, `estatico-02b`, `estatico-ch3-r2`): ninguna nombra `useMontado`, `claveClaseDetalle`, `esClaseArchivada` ni `useSoloLecturaDeLaClase`. **Las rutas:** ninguna prueba nombra `clases-anteriores` ni `clases-archivadas`, salvo las dos filas de C-12, y ninguna recorre `rutas` para fijar su lista.

### Observaciones para el programador (trampas; no son hallazgos)

Son lo que pondría en rojo una `*.ataque` o una vigilada aunque el diseño esté bien.

**O-01d2-1 (V-06, C-12). Las cifras son por texto, archivo por archivo.**
- «Cargar más» se escribe **una sola vez**, en `components/lista-de-clases-anteriores.tsx`. Las tres vistas llevan 0.
- `maestros-de-clase-view.tsx` y `alumnos-view.tsx` no están en la lista fija ni en `components/`: un `enEspera=` ahí cae por "fuera de la lista cerrada".
- Esconder una fila no cambia la cifra, siempre que su JSX no se duplique. Cifras que no se mueven: `hilo-privado` 2, `acciones-de-la-tarea` 2, `elemento-de-duda` 2, `respuestas-de-duda` 2, `dudas-view` 1, `personas-view` 1, `panel-de-calificacion` 1, `formulario-tarea` 1; `entrega-de-alumno-view`, `crear-tarea-view`, `editar-tarea-view`, `detalle-tarea-view`, `calificacion-de-la-entrega` y `lista-de-mis-calificaciones` en 0. En `tabla-alumnos.tsx`, de 1 a 2.
- La regla `/\sdisabled(=|\s|\/?>|$)/` lee también los comentarios de los `.tsx`: mejor no nombrar la palabra.

**O-01d2-2 (V-07, V-13, `layout/estatico-r1`, CL3-R1-35). Clases y palabras que se leen en crudo, con comentarios.**
- `vidrio-fuerte`, `vidrio-azul`, `data-material` y `data-densidad` no pueden aparecer en ningún archivo de 01d2, **tampoco en un comentario**. Y "vidrio" no puede ir dentro de una cadena entre comillas dobles. La lista y las filas van con divisores dentro de una `Card` (Enmienda 9).
- La palabra `fixed` en cualquier `.tsx` solo vive en `barra-navegacion.tsx` y `dialog.tsx`. El "aviso fijo" no puede decir "fixed" en ningún comentario.
- Sin `-[…]` fuera de la lista exacta, sin `animate-`, sin `outline-none`, `ring-` ni `focus:`, sin `text-danger` ni `text-destructive`, sin escalas anuladas, sin `grid-cols-4`, `grid-cols-5`, `w-1/4` ni `w-1/5`. Ojo con quitar la columna «Acciones» de `tabla-alumnos.tsx`: si sus anchos se reparten, que no sea con esas clases.

**O-01d2-3 (conteos crudos de `features/tareas/hooks.ts`). Un comentario cuenta.**
- `renovarTrasErrorDeLaEntrega(` son exactamente 3 y `avisarDelErrorDeLaEntrega(` exactamente 5, leídos en crudo: un comentario con el paréntesis los rompe (`entregas-01e-r1`, `entregas-01e-r2`, `entregas-01d-r2`, CAL-1C13, CAL-T-127).
- Los argumentos de esas 5 no cambian. M-06 y T-03 no añaden ninguna llamada ni otro parámetro; el silencio con `montado.current` va en la condición que ya está antes de cada una.
- `mensajeDelAvisoDeCalificar` solo en `features/tareas/hooks.ts` y `lib.ts`. No nace `reaccionarAlErrorDeLaEntrega`.
- `NUEVOS_01E`, en crudo: `entrega-de-alumno-view.tsx`, `acciones-de-la-tarea.tsx`, `detalle-tarea-view.tsx`, `hooks.ts`, `lib.ts`, `data.ts` y `types.ts`, sin `vidrio`, `data-material`, `fixed`, `animate-` ni `from "@/features/`. `entrega-de-alumno-view.tsx`, además, sin `correo`, `email`, `estadoPago`, `accesoRestringido` ni `perspectivaDeRuta(`.

**O-01d2-4 (CAL-1C13, CAL-T-94 a CAL-T-98). Lo de CALIFICACIONES-01c sigue vigilado.**
- Ningún comentario de `features/tareas/hooks.ts`, `lib.ts`, `data.ts`, `types.ts`, `entrega-de-alumno-view.tsx`, `panel-de-calificacion.tsx`, `calificacion-de-la-entrega.tsx`, `entrega-realizada.tsx`, `components/clase/data.ts`, `services/calificacionesService.ts` ni `lib/format.ts` puede llevar: `vidrio`, `data-material`, `disabled`, `?? []`, `fetch(`, `console.`, `_blank`, `perspectivaDeRuta(`, `correo`, `estadoPago`, `"Sin tema"` ni `"Sin categoría"`. Los comentarios de M-06 y T-03 son los que más arriesgan: no escribas "correo".
- CAL-T-95: `entrega-de-alumno-view.tsx` no escribe texto suelto en JSX; el de archivada sale de `TEXTOS_DE_LA_CLASE.archivada`.
- CAL-T-97: un solo `primary`, el del panel. CAL-T-98: `.version` solo dos veces, en el panel; la vista no la lee.
- CAL-T-94: sin emojis ni pictogramas, comentarios incluidos.

**O-01d2-5 (tipos, ternarios y literales).**
- Ni `features/clases/hooks.ts`, ni `lib.ts`, ni `data.ts`, ni `acciones-de-la-tarea.tsx`, ni nada de `features/tareas` fuera de `types.ts` declara tipos, salvo `…Props` en un `.tsx`. El tipo del predicado de `estaArchivada` va en `features/clases/types.ts`.
- `estatico-r1.ataque` recorre todo `features/clases` con el AST: una condición de solo lectura con un ternario dentro de otro, en JSX, cae. Vale para el vacío de `tabla-alumnos.tsx` y el de `muro-view.tsx`. Sin `?? []`.
- `"Sin tema"`, `"Sin categoría"` y `"No tienes acceso a esta clase."` no se vuelven a escribir. El texto de las filas 35 y 36 es `TEXTOS_DE_LA_CLASE.archivada`. "Volver a Actividades de aprendizaje" no existe hoy en ningún `data.ts`: nace en `features/tareas/data.ts`, una vez.

**O-01d2-6 (`estatico-02c-r1.ataque`). La perspectiva y `puedeBorrar`.**
- La lista de `perspectivaDeRuta(` es exacta (nueve archivos). Las vistas nuevas, `crear-tarea-view.tsx`, `editar-tarea-view.tsx` y `lista-de-clases-anteriores.tsx` no la llaman. N-05 usa la `perspectiva` que `ClaseLayout` ya tiene. El aviso de `clase-anterior-view.tsx` recibe la perspectiva por props. Nadie compara el `pathname` con un prefijo.
- Los lectores de `.puedeBorrar` son exactos (seis archivos). Las filas 24, 26 y 32 se condicionan donde ya se lee: `duda.puedeBorrar && !confirmando && !soloLectura` pasa. `const puedeBorrar = !soloLectura && duda.puedeBorrar` cae por la regla de la asignación, y una prop `puedeBorrar={…}` también. Con `puedeQuitar` no hay esa regla.

**O-01d2-7 (`refactor-01c-r1.ataque`). Lo que sube.**
- `components/clase/hooks.ts` y `services/clasesService.ts` no importan de `features/`. `services/clasesService.ts` está en `MOVIDOS`: sin `?? []`, `fetch(`, `console.`.
- `useMontado` se define una sola vez, con `const`, en `components/clase/hooks.ts`; `features/clases/hooks.ts` solo lo reexporta. Lo mismo `claveClaseDetalle`, de `services/clasesService.ts` a `features/clases/data.ts`. `useMontado` no se exporta desde `features/tareas/hooks.ts`.
- Las reglas de `eslint.config.mjs:173-205`: una vista de `features/*/` no importa con `..`, un componente no importa con `../..`, y ningún archivo de `features/` importa de `@/features/`. Eso incluye las pruebas nuevas: un caso de `features/clases` que necesite una vista de `features/tareas` entra por `@/app/router`.

**O-01d2-8 (CH3-* y `apiClient-ch3*`).**
- Nada nuevo lee `.message`. El texto de las dos listas sale de `mensajeDeErrorDeLista(error, texto)` (`features/clases/lib.ts:219`); `esErrorDeCursor` nunca se pasa como referencia.
- `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` solo la importan los tres `lib.ts` de hoy.
- `CLASE_ARCHIVADA` entra solo en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de tareas. Sumarlo a `MENSAJES_POR_CODIGO_DE_TAREAS` o a `MENSAJES_POR_CODIGO_DE_CLASES` es PARADA (CH3-B01).

**O-01d2-9 (CAL-1D09 y fila 37).**
- `features/calificaciones` sigue con doce archivos: ni uno más. `lista-de-mis-calificaciones.tsx` lee el contexto de `@/components/clase/hooks`, sin `../../` y sin `perspectivaDeRuta(`.
- El título como texto sale sin `Link`, con ternario simple o retorno previo, y sin texto suelto. Sin `disabled`, `fixed` ni `-[…]`, ni `bg-…` nuevo.
- Sin proveedor, el contexto vale `false` y la lista sigue con enlaces: las pruebas de `MisCalificacionesView` no cambian.

**O-01d2-10 (los inicios).**
- `inicio-sin-datos-02c-r1` e `inicio-sin-datos-r2` simulan `./hooks` con fábricas cerradas (`useNombreDeSesion`, `useClasesImpartidas`, `useFocoAlCargarMas`, y el equivalente del alumno). Un gancho nuevo en los inicios cae: el enlace del pie es un `Link` con su texto de `data.ts`.
- Ya montan dentro de `MemoryRouter`, así que el `Link` no rompe. El enlace no es `primary`: `clases-r3.ataque:125-131` cuenta las acciones principales por vista.

**O-01d2-11 (`clases-admin-01c*`, duplicar en una archivada).** El formulario de duplicar vive dentro de `ClaseLayout` de una clase que puede estar archivada y usa `SelectorDeMaestros`, con `ListaMaestrosDeClase` y `BuscadorDeMaestros`. Por eso la condición de las filas 29 y 30 va en `maestros-de-clase-view.tsx`. Si alguno de los dos componentes lee el contexto, ADM-T1C16 cae.

**O-01d2-12 (`reloj-01e-r4.ataque`, pruebas nuevas).** Revisa todas las pruebas del frontend: una que compare «Vence hoy», «Vence mañana» o «Vence en N días» fija el reloj con `useFakeTimers` o `setSystemTime`, o pasa un «ahora» explícito. Vale para las de la fila 37 si afirman el texto de la fecha límite.

### Observaciones para el arquitecto (huecos del plan; no bloquean por sí solos)

Conviene verlos en la misma enmienda de P-01 a P-03. No tienen prueba en rojo: quedan como ataques para la ronda 1 si el plan no los decide.

- **OA-1. "Vuelve a abrir Calificaciones" en una clase anterior.** `MENSAJES_ERROR_CALIFICACIONES.cursorDeMisCalificaciones` (`features/calificaciones/data.ts:110-111`) pide volver a abrir una sección que esa vista no tiene: es "sin secciones" (§D-9). `AGENTS.md` pide un caso por camino en toda frase de recuperación, y ADM-1D204 y ADM-1D217 solo cubren las frases de las dos listas. `features/calificaciones/data.ts` no se toca en 01d2 (`plan.md:1466`), así que hoy no hay cómo cambiar el texto. El camino real sería "Volver a clases anteriores" y volver a entrar.
- **OA-2. La vista de una clase anterior con una clase activa.** El alumno con el enlace guardado, o en esa vista cuando el admin restaura. Ni §D-9 ni ADM-1D202 dicen qué pasa. La vista "provee el contexto con `true`" y pinta el aviso, que necesita `archivadaEn`, que en una activa es `null`. N-05 solo va en un sentido. Es lo mismo que hace caer ADM-T2D101 en P-01 (`avisoFijo()` no se va en la sonda, aunque ahí es mi vista mínima).
- **OA-3. Dónde va la consulta de `useClasesAnteriores`.** El precedente, `consultaDeClasesAdmin` y `siguienteCursorDeClasesAdmin`, vive en `features/clases/lib.ts:747-772` y no se puede reutilizar: fuerza `estado` y `LIMITE_CLASES_ADMIN`. §D-R0 (`plan.md:1471`) deja `lib.ts` "solo `estaArchivada`", con cualquier otro cambio como PARADA. O el arquitecto suma esas dos funciones al alcance de `lib.ts`, o quedan privadas en `hooks.ts`, contra la costumbre de la regla 3. Conviene decirlo antes de que el programador se detenga ahí.
- **OA-4. El alcance de `features/tareas/data.ts`.** "Se toca" (`plan.md:1452`) lo escribe como "`CLASE_ARCHIVADA` en sus códigos con mensaje del servidor". Las filas 35 y 36 piden además "Volver a Actividades de aprendizaje", que no existe hoy en `features/tareas/data.ts`, `features/clases/data.ts` ni `components/clase/data.ts`. Es la misma aclaración: una clave más en ese archivo.

### V-01: SHA-256 de todas las `*.ataque`

Son 262 archivos: 101 del backend y 161 del frontend, todos rastreados desde `7655a5b` (`git ls-files`; ninguno sin rastrear).

- **Comprobación de entrada:** las 262 coincidían con `git show 7655a5b:<ruta>`. La base que da el orquestador (262) es la misma.
- **Después de C-11 y C-12:** comparé una por una contra `7655a5b`. Solo cambian los dos archivos de la tabla de arriba; las otras 260 son idénticas.
- **Formato:** `<hash>  <ruta>`, en el orden de `git ls-files`.

- **Lista:** `sha256sum` de la lista de abajo en ese formato: `e78cb09668b7224d895e5db2410fda5f4f63bc4eecb252990d097613ef2ce070` (262 líneas; comprobada con `sha256sum -c`).

```
65c1d9d9e6cea8ba8cf98bc522c6ba6d7122376d0201ccf3fc3048d24b60543f  backend/src/adapters/storage/objetos-r1.ataque.test.ts
935a721160f978e35d45d2c9392fe8cb169fae32f43b9df583bda46215707e22  backend/src/adapters/storage/objetos-r2.ataque.test.ts
bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671  backend/src/config/correo.ataque.test.ts
dcb78d222544e8dc4fbece59468f555b04abe971b70016e9bb17fcae3e958580  backend/src/config/env.ataque.test.ts
71e7f049447d2d1ecedd897c55ea0b6d31221753f0a7e7473c7ac6e8667f0a95  backend/src/config/logger.ataque.test.ts
91f620c1a27778eebc2bed5eec1bc9b0e3fe1199b32ed00f9dd910011d6a1805  backend/src/core/clases/codigo-r1.ataque.test.ts
262691f5786ad63b2393d0ba5ff97538f6dacf43343bed019ad23c12a07d8686  backend/src/core/clases/codigo-r2.ataque.test.ts
e769cbfcc3a83a64b51c6437f80684640a7c928ad6b8c5c1671fdff005d7b734  backend/src/workers/ritmo-03c-r1.ataque.test.ts
294be1af0bf69d6c05f54e2f0d8e587c78a5527d0b64d1a224c058e31ce013d0  backend/test/admin-muro-02b-r1.ataque.test.ts
388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85  backend/test/admin-unico.ataque.test.ts
d2cc28b62bf988ae14ba975a9bc8d534aec0eebce30da93d7ded9a26026b0857  backend/test/alumnos-b-r1.ataque.test.ts
00346d471355abc7971b921649e7192b8987fe27912c00cb7e41aef2065369e9  backend/test/alumnos-b-r2.ataque.test.ts
fc11ab4b914d4a88612953f82db354e2b9cea9bef86e24321ef7e031f3ac3837  backend/test/alumnos-b-r3.ataque.test.ts
441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb  backend/test/api-real.ataque.test.ts
f76ce52002e295f2bda6e7a7a7f796415e08013e6d4c1fbe2c9c686671fe8252  backend/test/archivos-d-r1.ataque.test.ts
1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9  backend/test/archivos-d-r2.ataque.test.ts
42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612  backend/test/arquitectura-cuentas-r1.ataque.test.ts
38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716  backend/test/arranque-r1.ataque.test.ts
2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c  backend/test/auth-login.ataque.test.ts
73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e  backend/test/auth-registro.ataque.test.ts
6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713  backend/test/autoria-02b-r1.ataque.test.ts
3520057d0f1a27739eaa701aacd9c18d5c0728fc6a3d55374f43f63a5e6f5336  backend/test/borrado-duplicado-r1.ataque.test.ts
b8fc0db0ea3ec7ff2b89cd9e345c57a9b4ef73afe16fb1aa3e6fdf73c27c16a1  backend/test/borrado-duplicado-r2.ataque.test.ts
5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9  backend/test/calificaciones-01a-r1.ataque.test.ts
afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc  backend/test/calificaciones-01a-r2.ataque.test.ts
dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416  backend/test/calificaciones-carreras-01a-r1.ataque.test.ts
b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07  backend/test/calificaciones-estatico-01a-r1.ataque.test.ts
29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869  backend/test/calificaciones-estatico-01b-r1.ataque.test.ts
6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e  backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts
6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db  backend/test/categorias-01a-r1.ataque.test.ts
f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2  backend/test/clases-archivadas-r1.ataque.test.ts
62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933  backend/test/clases-archivadas-r2.ataque.test.ts
95bba9bac44366ad5a361e93dd2f278cb0a1cc889fa479049acc7b45a9a5e71b  backend/test/clases-r1.ataque.test.ts
a87817d56c236c0ba3597214cac23b10483bbc28ae44800c592ed5ce2ef97f38  backend/test/clases-r2.ataque.test.ts
72de7d8af3d3f772abc19db065f6e418f6eb76ce78d87fe6ebb51335fc99825a  backend/test/clases-r3.ataque.test.ts
be97c4e48ac9551bed1d01552e90ab8cdf085cf928ae6c8c3d81809e35f7ce62  backend/test/clases-r4.ataque.test.ts
000ec9008c73d25121c82a46f5ea0f67e6c8c387cb04e361ef82812b57956098  backend/test/concurrencia-02a-r1.ataque.test.ts
530546b4d70a2b9ad36f98f37e2af45480e81a1101ee3516d15426f78350bf82  backend/test/cuentas-03a-r1.ataque.test.ts
6303ddc170545f616c66773c3f5475cb3be1fea9347d8059354d6ade8d676c16  backend/test/cuentas-r1.ataque.test.ts
3a4e81c111b8eeb7df065804aa85062fa3fc607f0147149b71ac21c14e7818d9  backend/test/cuentas-r2.ataque.test.ts
f54f79f7b2a83e95fe440053ccaf15cb3ebb01ce5dfd4c6655e22159a5fd7e6b  backend/test/cuentas-r3.ataque.test.ts
a2f9bff596330a7d55d1ca9d47197fc831eb132f52c759610e2d667895c3332f  backend/test/cuerpos-02a-r2.ataque.test.ts
4ea45eaa95c5ea2e1ec91e04d2bba32689a30bd341ade16625b28aabdb96d6d9  backend/test/dudas-clases03b-r1.ataque.test.ts
d7a9da854ce8ab8ad8d2437db2e8c2a642a777ea3261a6b038da28be022df848  backend/test/enlaces-03b-r1.ataque.test.ts
dc1b7ee7ea58966f5db33ccb4581885a9669dea2263954ae46d17a83e1ef6eaf  backend/test/enlaces-03b-r2.ataque.test.ts
b051b1986496e35e3e306c4c6bc306a763542bca4b350574d0c02e2c484deb35  backend/test/enlaces-ch-r2.ataque.test.ts
d28cc4de621a680e6b54b2bff889700300d558ec7849717584518d2f03ec8cae  backend/test/entorno-ch-r1.ataque.test.ts
47b02c6d3916713bf9236a619fdb59a641d2e805f1f0b7e9b2c161fe719ddc3a  backend/test/entregas-01b-r1.ataque.test.ts
5baaf6f8fb76320620ed4a84efaca2b2d473460f62360e0d48738b97a0ac584a  backend/test/entregas-01b-r2.ataque.test.ts
885668a621af11f17b4ac706db705aef33231b7773e4783147d21b318bdd0f9a  backend/test/exportacion-02a-r1.ataque.test.ts
ba1ac9b17cc9bf747522bd4ec8b87df436008482e643b18eea8e9a8c041c59b3  backend/test/formada-ch-r1.ataque.test.ts
73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a  backend/test/gestion-02a-r1.ataque.test.ts
e4e9365ea010f3f670b6c1194d1a592e95db43bff0496d4ea1646fc5225ca8b4  backend/test/gradebook-01b-r1.ataque.test.ts
5f4133f949d2f337a8f63b75cf82cb77114db7812d67c1960105f5000c31a326  backend/test/guarda-ch-r1.ataque.test.ts
7a7dac6d87edf81059fcff9c07471aaf49d690ec159be4b9fd4aa32b0909a215  backend/test/guarda-ch-r2.ataque.test.ts
610ee44e5d0bcea46eb4e3645f9adf1998a76947a25af7e3f8248ea3a633df79  backend/test/guarda-ch-r3.ataque.test.ts
e5d149f3ac52b726e1fe08908249706341330f88eaa6674b9a9ac67b98b1e864  backend/test/guarda-clase-r1.ataque.test.ts
c979d2c9c420a2177fa6ebddb78eb2ce84d5f043b94270f690916a6fc75d6f8f  backend/test/guarda-clase-r2.ataque.test.ts
20982e2b98f1b162146a211923f3d5ec19d4e170c4aa3a5bfc6f82c3b6173aad  backend/test/guarda-r2.ataque.test.ts
2649f3d357dcb806361ac101c57fcb504b9c798b631048f0b3e200f63da7dc30  backend/test/hilo-01c-r1.ataque.test.ts
2d2216ee9db290b318825a6f73c346d4767cacc12d95f5ca76457a78b63fedc3  backend/test/instantanea-01b-r1.ataque.test.ts
a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a  backend/test/intentos-r2.ataque.test.ts
2619b44eea3370494c95ac128fcfd9e3ffc20d1581a19f549bf371f603a11d7d  backend/test/invitacion-flujo-03a-r2.ataque.test.ts
704155928183aec193ae7e157b86b3e9361d2b63c7a47be1ed859605fab4ffa6  backend/test/invitacion-masiva-03c-r1.ataque.test.ts
dd9b7454e8786bf0b833d265900ccaecf595808cebc8e9a77c9aef15298a1038  backend/test/invitacion-masiva-03c-r2.ataque.test.ts
82fe8c49674a3cc8328e7951236c0c8f442fcba3890b716013369785b202cf40  backend/test/lecturas-fx-r1.ataque.test.ts
b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea  backend/test/lecturas-fx-r2.ataque.test.ts
f9f9ec59ec8d1a5ccb180522798140c45604440f48edcd68a3e02863d90ae347  backend/test/logs-02a-r1.ataque.test.ts
a2006c163d9e6cd3e4a2a773d1501826daf3c8e7bb184d205bfc6442318fb59c  backend/test/logs-02b-r1.ataque.test.ts
bd8b303c434efec0785e0691d31d6f6e87dbf3305f50fa27cce0f78cbb251e3a  backend/test/logs-03a-r1.ataque.test.ts
b58d5d013658433fe5839634e2db5a31b8d2b8f69587bc36958752d3cd33bbf7  backend/test/logs-03b-r1.ataque.test.ts
0e4abf3bc5d92fa0c380805453190703862567930dd74b9e7fcc1809564d181f  backend/test/logs-03c-r1.ataque.test.ts
1e775a19682f3a5995d7c035bcc810a36bf50c22045b6ffbfc5a98b821255db0  backend/test/logs-archivos-d-r1.ataque.test.ts
e9ce866d511e3ee6029015b74e20b4d342a60be99b3aac97e86f00283a3c77f1  backend/test/logs-archivos-d-r3.ataque.test.ts
e008935b107752d203f6423b2f1c9e0f5a4339f0a77154746bf262cecb90351a  backend/test/logs-cuentas-r1.ataque.test.ts
690e30ed39111c0a074fc159015967cd9f0fdc24d9a340e6a0d7be4b980a9d45  backend/test/logs-muro-c-r1.ataque.test.ts
0809c60700e26183e7771b4b1a40b05cbf554c2ed7929190cf4d89a52722e551  backend/test/logs-muro-c-r2.ataque.test.ts
5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689  backend/test/logs-r2.ataque.test.ts
d6b9adaf1c14a61fe369f510774ef702cfa20f28f3cb19b0eb7357440dcb0783  backend/test/migracion-01a-r1.ataque.test.ts
2afd58e1ead0a293aa7bd58c639f3e5126d153a418f9a26450228468e12b2bed  backend/test/migracion-clases03a-r1.ataque.test.ts
bc6d49f9fc1f5eb20e305945fef57caeebeb108bff5d5cf4ba10b8040687d69c  backend/test/mis-calificaciones-01b-r1.ataque.test.ts
d23bf1312777bdc000810e403a5b4d99c9c0e12998e4cc11be5ef5a2253f6935  backend/test/muro-c-r1.ataque.test.ts
7825cfc9b484df740fa0e9562a195d1bbcaf4caf72ea55fa847b5394ab96c125  backend/test/muro-c-r2.ataque.test.ts
8b733b86fc6d54ece008389a59793fae4ec4a65146eb37215e900e50a5337d46  backend/test/nombres-guarda-r3.ataque.test.ts
3fd2583a4de7cd432b2e09a5130c23d6a59fa475e5e0aa69f23739351acbf9cf  backend/test/nombres-ids-01a-r2.ataque.test.ts
00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb  backend/test/nombres-tokens-r2.ataque.test.ts
80b5a848f69b429e7dadec86c07bec1d3e3eed8a042efba41ce912ded39e7bab  backend/test/nowait-ch-r1.ataque.test.ts
fd2ae2e9792db81d838580b0ef2769ce8ef08059e3353aa5ab927c62295da9e8  backend/test/objetos-reintento-r2.ataque.test.ts
42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d  backend/test/recursos-clases03a-r1.ataque.test.ts
ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516  backend/test/recursos-clases03a-r2.ataque.test.ts
ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21  backend/test/referencias-01b-r1.ataque.test.ts
6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5  backend/test/servicio-ocupado-ch-r1.ataque.test.ts
71c54a113611a3097baa03691f316f5e3d49dbe6532d058a453aaf0641434db1  backend/test/sesiones-y-cadena.ataque.test.ts
70ac720f2e7fcadee5bbcb6414887ab08129dea7cd91df012046953b1584e8b6  backend/test/sexto-paso-02a-r1.ataque.test.ts
c89c30851e6b409cd045017181147bf674df947762a8dea3f3fb981bd9b36e09  backend/test/tareas-01a-r1.ataque.test.ts
79bc7aafc11676d36129610a4b5cd5fe5d8234d0d748487fd2f3e48c5f772c79  backend/test/tareas-01b-r1.ataque.test.ts
ae60c11cff5c82df4954db48582df4bd5a64957ff9afaf9712aa43a038f8e189  backend/test/temas-01a-r1.ataque.test.ts
dc7b86a621062ed671c1e7174a745019133fbd410c7a2e78114b2a2c50affe95  backend/test/temas-01a-r3.ataque.test.ts
f09e9a0038c47d1a2223376a0af260baf573f0c45bf770201c48c9e30296f04b  backend/test/worker-03c-r1.ataque.test.ts
9f60f9d65d52d2021a1eb04e9f01d3cc68f22744c845bf93d6621aa4fe9713a8  backend/test/worker-r1.ataque.test.ts
77d11bd85f202a9eec92a363df82e63fb9a784ca9d368d49f62e61c1a2aa967b  backend/test/worker-r2.ataque.test.ts
0e49b62b73b2ef55e8c0b2ba26e1d136a3adb674761fda2c11453eb5c2faf7cc  frontend/src/app/barra-02d-r1.ataque.test.tsx
b89ede0f6aed45dfcb5e64c8909a822156ce43fd80948e72419cdce9d4541a87  frontend/src/app/cache-03a-r1.ataque.test.tsx
e85743c0fbb8e476874a2c67334342d8d69d14153579fc1e4cce0ae6e2b29616  frontend/src/app/contexto-r1.ataque.test.tsx
bc2be5541006887e2a5a4a89b33046180f607d54474b0f96a73d615afbcac385  frontend/src/app/contrasena-r1.ataque.test.tsx
f38bcacb716d8a39acdb3535a95603cd0d8ab02572ca57a7df5268b01ceb6eac  frontend/src/app/contrasena-r2.ataque.test.tsx
68fb5d092c0c8ecfcf282477ef023aaae26f6b869656e05109dc3efa276d842a  frontend/src/app/cuentas-r1.ataque.test.tsx
41930017715d3d6869dc7acefd75de8ec3684f1f035b845abdf8ec0f6b734dee  frontend/src/app/cuentas-r2.ataque.test.tsx
1506c27e5f7418b5e087fd30f8809645a2fc3e2761c7249de78f02e24aa6c7a5  frontend/src/app/en-espera-r1.ataque.test.tsx
db48dad405c27062621a44d3744c84cc5903892a51e5a8df18f41383cb9c88a3  frontend/src/app/errores-r1.ataque.test.tsx
0e1d93e4dd3cbc7b5e9475a17b5ca66f0df056ba25cb117249f4c2e2f5887a51  frontend/src/app/foco-barra-02d-r2.ataque.test.tsx
2154b5c15f696a0c7f884bff774cf4e2a4208a5281db9076653f8253e2385ab9  frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx
f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4  frontend/src/app/fondo-r1.ataque.test.tsx
29782507d18ff96315e4030e890b21fdf1eb1c5550c3d1cfe5c92664d30b64dd  frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx
57cb54afd3b79464f0df01b88fc388cebbeac5657d936c4c204cbae6034b0834  frontend/src/app/marco-r1.ataque.test.tsx
c8a9812f21cb24db50cc2afd945b7b38abacb468fbf4f4df16c07a52c48426ac  frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx
d7608d7fc7767f53db3971672fc99fdb8bbd33f303f41e321bcc48ad25f511fd  frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx
2f8056a770397c1601647277944555a48afc4b9a2babeb75e5898f0cc92562bb  frontend/src/app/muro-rutas-c-r1.ataque.test.tsx
6acc49a2e3b649868ccf9a9337143f991b655dafbcff2e5916bca0269bd23a7c  frontend/src/app/personas-03c1-r1.ataque.test.tsx
a3e3dadd35c40e9a11a0bdef8cd716daceeb254e5307a837c6598213ba803a7b  frontend/src/app/personas-03c1-r2.ataque.test.tsx
0eefed2c05d76b0790a437e9465a898a9076083b1f046f8785145cfaad0da379  frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx
053e867a904afa3c09eef92ca2e03e929d9f9c93f714040856f40c7418721bbe  frontend/src/app/router.ataque.test.tsx
fc820217bc3baa3749c077fe16a4abd7ae10e92c84494ffb2a215133c19df36a  frontend/src/app/rutas-01d-r1.ataque.test.tsx
f0657fb91f7b3accf64726292f9324c6742c1ac537c6c4a1985ec4e32ae09c83  frontend/src/app/rutas-02c-r1.ataque.test.tsx
c7946f5f5d5d16d36b395adc2ad9928acc7fd9839875fb64532b51489756730b  frontend/src/app/rutas-clases-r1.ataque.test.tsx
f090cbd8e8c9b0af52d4fc19547b07e9b6413f5414cc4b10862f01e29818dddc  frontend/src/app/sesion-r2.ataque.test.tsx
11c6d9c55be91aa41e8525345e3795e34b8e1e661ff7cdd901f729760a033cfd  frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts
48f5ff8fef35faa6d8500fae4a53ca953d7f661100a5c4879ba58e68972ab2de  frontend/src/components/foco/foco-01d-r1.ataque.test.ts
36d605f79169e16a5afadc7e07fc3781472dd393406430277ceb147fc2da1fa5  frontend/src/components/layout/estatico-r1.ataque.test.ts
0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c  frontend/src/components/layout/pie-r1.ataque.test.tsx
00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21  frontend/src/components/layout/pie-r2.ataque.test.tsx
472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76  frontend/src/components/layout/pie-r3.ataque.test.tsx
a1814d281dafd8243989c9f9a462a4f33a86b1fb70eeebf29e99bcb0f340d82a  frontend/src/components/ui/badge-03b-r1.ataque.test.ts
7d080037d9a64eebcebb789d1dfd94b787652103e6f9c84f968f9c9f64c3b30c  frontend/src/features/admin/cuentas-r1.ataque.test.tsx
b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184  frontend/src/features/admin/cuentas-r2.ataque.test.tsx
72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a  frontend/src/features/admin/cuentas-r3.ataque.test.tsx
942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4  frontend/src/features/admin/cuentas-r4.ataque.test.tsx
3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998  frontend/src/features/admin/en-espera-r1.ataque.test.tsx
c21edb5a06b43808ce2be23058409b7ff887e66d60e842c500a3714a90ebcb25  frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx
8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35  frontend/src/features/admin/foco-r1.ataque.test.tsx
30f45bba30d9348ec1587b42e84ca370274e1bf0af0f310b8a6bbd79fa982669  frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx
d477a809e55e603d3ef6c02ca43b21372b75d0947fa303f1539d48bdf32841f8  frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx
761f54f183540d8ae222f97940fa6c2355ff33e515771e627f8efde49261eda2  frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx
14ead3dce027b433d51a9d635b0fa35718ee3875bffc3e1949f96ecb8d2f7135  frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx
3ceda51db8f67f40c26615fbc4cd7d082035b00f38713c6ca4c7db58e47926c8  frontend/src/features/auth/enlace-r1.ataque.test.tsx
1f5d1147637c09daa6fdf1384e4395edd69dfdab84aae5d602a362dabd3295bd  frontend/src/features/auth/enlace-r2.ataque.test.tsx
af3f0d474f8052b402c8959a64acf9e730f9ae60f09d90996a6306e9c2440f08  frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx
991b115524d8dade8d6ea2c51fb753dc8832ee410db2161a0ce761d011cfca4a  frontend/src/features/auth/invitacion-r1.ataque.test.tsx
96b6ab55f0a7bf9b66f8edbcb5ceffa7e4fe35935c6cb12ecab93fc04bc02856  frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx
0ce580976ea894ee4bd9c4adbe3d7d1d524354a8ff22fc7e7cc6acf89057aa53  frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx
4bcd3e34b62726fea718efb9c482d8c1f504bbe85ef32427bdf4d65a6832d8f1  frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts
812ee5f1b04a1218e2b96cdb97fb5a964a4a21b0d81b95bb4889beaa4a3894bb  frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts
bef8aa53d338fde15e251d53756b76e3381ef9f6de4943c4db83c8e2b3d258dd  frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx
d15e821c212bb268c65bd9dee36293b02f5bde4dedd4bf9926dbbf99b9971f57  frontend/src/features/calificaciones/exportacion-02b-r2.ataque.test.tsx
5991d8e3d4e694973309f178e5341a2285584cf9ed6006fbb658d7f5a61de5dd  frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx
c744fb831fa9992c2a9ed0729f9ec3cc089f3167ca19133c6eee0133382607a1  frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx
8dea1c2adc5d228e166ce6037a1a1a827d26e2bdc6d7c8534f146517ebc1ac44  frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx
6f7496ca7652e7b4441a7eb9822e74270d50127ac40ba27b86c83edfcd5cc3fa  frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx
24751f358fc5ecd485c475e7025dd881b87fe892f025459a6ff29f615fc5cc66  frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx
c504d0ad3690781275a6ffb78638a6148550b2fd4ee1ed25a4b154054fc4f80d  frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx
6ac36ce1eb4df953626415b3ed431a8f4809dc29cf259f755f1f8509dd54b7ef  frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx
fb33f2a27bfcca906549a12610977478ba72e6e7ed8afd5c5a0a962deb3eb802  frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx
932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872  frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx
55dc274eca96da4360848b88f9f2a839ac815031490ab57ff38de074512d632c  frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx
371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183  frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx
266d088dd727f18af8c8a106b8d9c4dbed75753e4b1b4abb12f3a4df870ecb7f  frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx
856cffbd9c743f9815daf731487e29dc5f5272545dc15820a70baf86ecfa6527  frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx
a9dc00d9cf6e8684113eeb824658c7fb2f3077ee8a54deb0cce47ac802c74f44  frontend/src/features/clases/archivos-d-r1.ataque.test.tsx
98e645df89c9736ee33f440c1d83f342be84f30caabec0310b1b5185e538fbd6  frontend/src/features/clases/archivos-d-r2.ataque.test.tsx
f1b2b7d3c2a2bfbc2c2aa31cce4b120e306681c0cc9efb85ac2a954c8f8f8afe  frontend/src/features/clases/archivos-d-r3.ataque.test.tsx
c6c85ac2f6e7418e81d7817f9c455c0e0973025a15ae2a5378e00c9a71c45620  frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx
a3880b67ffaa0d15763d1c761cef1ff8472029c77bfb2211ab079eadb1685325  frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx
66c0b873bc8b9d8e9e01ac871bd6aaab4328508beb5ec9371d69463d7c12430d  frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx
b465fd900c2a12681681f04b6ce3c54b23f1028d8b0fdc8545681bdf47e33d60  frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx
32fd1be4f0b957965e60cff91d01e4e5012dad150873f9a51d72a9a02eca2a43  frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx
a188c90deb61bafedabc50b76c77b02507964297cd6b155f905114839f728493  frontend/src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx
1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65  frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx
76b5b2522f60795c0e7672da7b10ea95a3ce61d1aa26f102ef8eb057bd3ce6d9  frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx
cffce654ebfb37dc10f8ce8bf7026fc982a8c3f79b677fa2eb82c4476e113f83  frontend/src/features/clases/clases-admin-01c-r3.ataque.test.tsx
87dae1927669b46bb52aad94db5107a5284f772fa9b29e225aace19c1a1e8def  frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx
5f0679d8cfacc8bce01989c04a415dc5b546625eb7dec92f03959de5a0f89815  frontend/src/features/clases/clases-r1.ataque.test.tsx
c7ad5edc733e374117a9277f1c2987e84cc2930c77eb4c720ccf15cc9f5fab45  frontend/src/features/clases/clases-r2.ataque.test.tsx
a835a11d29aedb8f77f91e826a22c2b7cf5322fced3f6bed0c1acbf7c75a4e61  frontend/src/features/clases/clases-r3.ataque.test.tsx
86b04d234527eceefca35b07ce89e6b7ce0b6afe5ccdee2f005e6a4219f0495a  frontend/src/features/clases/clases-r4.ataque.test.tsx
dce7fd019a6e32b8e4df37dd0728e265f5e9449e9ee2723f372ea174fe312464  frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx
3b5a9fac5cd20a881bf6b38597b752725a7f6bbfddcf103b7bf1239a76353dfc  frontend/src/features/clases/dudas-03e-r1.ataque.test.tsx
fec2ffc2691bd297dca5f90233d498d10dfd689a5d9a8819bc30e757c6f67c26  frontend/src/features/clases/dudas-03e-r2.ataque.test.tsx
18edcffc8e48073362b98c784d5bf64e3335709ae6e1c6425b32aa3310e24b56  frontend/src/features/clases/dudas-03e-r3.ataque.test.tsx
ddc9dfaccc8230ec612126fdf29939a8e4311188566e5cfcaa724bd119e959e8  frontend/src/features/clases/errores-ch3-r1.ataque.test.ts
5e20eefe0104b510a3002de084b6162162b5bf20797622c8d92b350853494b53  frontend/src/features/clases/estatico-02c-r1.ataque.test.ts
3cb8e0d7bb13b57638d65aa74ec5ff0f9306f024cf6996b7737232243a0b82f8  frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts
cdd1ed8890859ae3e884822fc7074852a2173105114745d83fe9a15c1c47c626  frontend/src/features/clases/estatico-r1.ataque.test.ts
de23d395dfe7a6f3d6d15eb48cb574599dc9d8204e5a90b255c0c10d25a186fa  frontend/src/features/clases/fila-01d-r1.ataque.test.tsx
46383e1f3ede03cb204dbf602373d0a07e513d8dac7ec4179a203ea6ee270fa3  frontend/src/features/clases/foco-02c-r3.ataque.test.tsx
0165d4e27b1fff9230d17bec740d89c380b6f322923c7e5a044ac010f4b9358b  frontend/src/features/clases/foco-02c-r4.ataque.test.tsx
8b8ea2d21597bc0444709a9d26fd795d05bc964ef7b5094240628c63018c091b  frontend/src/features/clases/foco-02c-r5.ataque.test.tsx
b819d6bbde4bd47e3ec724fcdea5e77eb66b12076b8a9a083691b52ef0bdd182  frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx
ab006dc1711e9a652643930a7010c25f442d1ffdd137adbb093eb5bd98da90d6  frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx
5224976752a14c3e003b246fa97abf25356e370cb46da1cdff9526bf3be86b4e  frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx
7f4a935de29c3c519aad697edb1470c4cfcead600f5c1516c5fff948995d4434  frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx
8bc578ef17d2731f388c14ca19bc719a2b8d04d8a41009fadee15227379047bc  frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx
479430b848cf3d21a0187138944deec46bb36653071bbd2790ed57620f012976  frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx
4d94ccbe786a46ca1d82a280956f1146d5c302a9f83dfac45f39b3b2f94b753f  frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx
0f60f1582fce6e5efaf9bf6856133dc30f1dc4eb9c3b7fea19f90a330f8335b3  frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx
7c434a0e54e70b12d4b2a3de22ffb4dbf5f28a1cfbd2290c22e8a2b59edf0e16  frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx
99df138b24d4aba97b9f714c32ba226e82c7403cf73aa2e9e2b0b028b28e283e  frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx
4817262ef6e4dadff56857e50bab2e06ec479e62d5eaf45b34d70d683736b637  frontend/src/features/clases/muro-02c-r1.ataque.test.tsx
8da38dbcb605ce3d90ace8117ce2cc5c838d71eb24bdd76fad3a53b82da93901  frontend/src/features/clases/muro-c-r1.ataque.test.tsx
d0acb3527aafa6f687e3eb00563e37be93768e7d7f742694a4d5ce05b75b7e28  frontend/src/features/clases/muro-c-r2.ataque.test.tsx
d08e51d451ebaeb2d7086c75dc1f73d52c5b4a6b8dfb979932828bed5f5d459d  frontend/src/features/clases/muro-c-r3.ataque.test.tsx
558212b46641de0794d0ce90e3944a99cb5baa7fab4b09bbac5ea7cac41eaa34  frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx
aec8c4131e5dc733246b33e8189e2dc595387324bdd2081d1d245641c20c380a  frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx
67b60a9a5363f88e6ceba210c27452b8d639f6df798aa4e506dc54bb2312249a  frontend/src/features/clases/personas-02d-r1.ataque.test.tsx
7677e0571587c89de1cb76788d499ac545255ca64c8afcb38a8ad6e39c02e2c6  frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx
60541290248812cfce5591ddf33d01125d60c33257743a7ec48a445013d3d8c1  frontend/src/features/clases/recursos-03d-r1.ataque.test.tsx
4aafaa73980ba1bc29be043623a030c9eaa730825eb61a403bf54f9ac700b42d  frontend/src/features/clases/recursos-03d-r2.ataque.test.tsx
70b1a49a6a0e471422be987466228e5beb87e25baee2906790651c94ed214a3a  frontend/src/features/clases/recursos-03d-r3.ataque.test.tsx
29a3125cc70969f2fc2bb1f012beeb81840e1a00ea08d5b588b10d190342ae7f  frontend/src/features/clases/recursos-03e-r1.ataque.test.tsx
85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511  frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx
4303eac77b98e8978495d9e68fd7725ac436f9db757dbc0c02c59051436908fa  frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx
09435abbb9a26dd71c52b4d95487c6d38594f1ba062aefb60f73b7eb7308f991  frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx
d899c19ba982fbde2208bbc7fa009869556c84bd4650586dbd9ee90b22234e47  frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx
97af503e763f7dff9fcfbdc72862cd21de6af8e51d3ec41134f8475d98ae2df6  frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx
db42c88d5b0bfb1125bf122c03a2e019d6f5365c128ac4bfadd413a26a934845  frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx
f6924bc272a5240cf97d35729c797cc10960ed7cf94fe1be1b69ca2df6c1cf8f  frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx
9866ef34167061e2715b65a352c55d08c7e9268033e879ae633c7fd568e4d49f  frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx
ea58eb11c3157a33c5730f87f2cf562ae178589b30264902b165c4439cebc2ee  frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx
2ef258e946084f17e33936e8fa257551a90323b589859dd2e1f70aabeaf711bf  frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx
e2fefd7d744f77c7bdd2ba73a08cc51076d0f6130bf4d0a225e0e972a1dce111  frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx
11bb5433fb30f268b6d93e1e7814d826bbab8fb1f173e574faf52f5a96b5a41e  frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx
d8daccb56c8de8d9f1b0f8d1b0907c110e327f4f55b016fc0fe7fc0f25ccc79c  frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx
ef86c46708f0682bca5a023e85794639c396ec94d207cac23ceb13585ab39e75  frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx
5ff367edba10c9ba9c7e50f8ed874032654fa2abdc0dd8f4a122a000355472ab  frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx
2938ae2f1c00f63a0372997c7ba68bdc0ab097895769bf9060072a4ac2674c5a  frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx
0963f14f4842d6d57288876c932496ac09d44b872fc049492ee6e8ba539f3235  frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx
4f486ca37d2a2bb6cc26754281d2adce086a9d8d4485a069de7ae5d54e360acf  frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx
93a5a0a648669e9c96494a62b2b16082b07296f279e2892bf2c8d47834ee2fc1  frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx
08a5e1a5642e7fc7553632dd5cf4e07f0ea35c3ef1e7293d010bbc49b09465aa  frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx
172be3efd919c0d3948eca17c7e808968e2370afe1f9c2a28cef7d2ded584b81  frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx
496652bc59817166f53e00cb828f2119c857c2834063a31764d7876dc150c930  frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx
edf4d96e4b884eab718d06811877c17b611099a66d6857502f71eedb96026dda  frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts
94d6e6253b266c7f21099aa593aac7b2600edca22ab403aa365dcd789b1c6a97  frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts
f614e7369f8c47c40a87ad1f8867fb8edf7ebc76e94d0ba6c5c59c92cb6347f0  frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts
fb387ecbb7e5272d2ffb53d626b51ffd9c57b409d10c560e6a5ecbfa6a2a8c19  frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx
7a7c7ba922f77da22d0f765ed5ea9ccf9216d1900e4b5f18365da9d46437495f  frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx
bfded7507bc684ea9858cd76517ef0e4c23cbc69e5a19f381e6ec522fd6156e6  frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx
b778fc2e6bb0a8f8715a56877b3b781439ca214c8a9c8ae126f610c95229882a  frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx
bf3c999033195cac778a82a579e44729fb07a405f5cdb41d8e7dc932cb71f942  frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx
3567d7c23d2cf6a2fd538cd6822ef60ac3cffeac036394ed1e3559debe492c57  frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx
6bbe2bd85e2b5500fbab4d0f51630c0c8e9d65b1a63045ad1fa906298a92a435  frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx
72b19b6a00b4ade43b06829bb5bef1a5cdecf5a7d2af57369f1e857a1d4a17f5  frontend/src/lib/errores-ch3-r1.ataque.test.ts
5d41a2af073dcaa2b8b016d835d36d5ebae9278863db048484a192a88bb31a30  frontend/src/lib/errores-ch3-r2.ataque.test.ts
66513d957e524af5e336a2c7e656df37f51106507a3984b691df47cd825d4d10  frontend/src/lib/estatico-ch3-r1.ataque.test.ts
a9529cefbd27cbb94376a6548ef1b8b247fb1f4155938298ae5d10eaee81008a  frontend/src/lib/estatico-ch3-r2.ataque.test.ts
60bc1fc7011e9a0fe5a4c4aa45420f2c7d38adb9ee2f8d235d09847dbe13ac3a  frontend/src/lib/format-01c-r1.ataque.test.ts
c71cba65dd284d7af11cbc812b6bcf75baa373939edb8318e731858d9c50173f  frontend/src/lib/format-d-r1.ataque.test.ts
89dbbb70d5dc404c3d74db5391d10855c8cb1d6b4c643b6147b3ce6ffb2637af  frontend/src/lib/format-d-r2.ataque.test.ts
bfa7ded62f7a1402590d438a1cc51060a63fa019ad47d3eb5740e43383064a2a  frontend/src/lib/format-d-r3.ataque.test.ts
b6265bf6eec25b7f2c34dcd93dd4d8b23d07ca6214576921a50a66ff16346ffb  frontend/src/services/apiClient-ch3-r1.ataque.test.ts
10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce  frontend/src/services/apiClient.ataque.test.ts
537e10bc0519805f2be98ff579b34c71eda6fa7d364e355bfbd0050f568ffcb6  frontend/src/styles/clases-r1.ataque.test.ts
b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582  frontend/src/styles/tokens-r1.ataque.test.ts
```

### Cierre de la ronda 0 de 01d2
- **Veredicto: PARADA.** No está lista para el programador hasta que el arquitecto resuelva P-01, P-02 y P-03.
- **C-11 y C-12 aplicados.** Quedan en rojo por la razón esperada (14 de 15 códigos; 77 de 78 `enEspera=`). Los dos siguen siendo correctos: no hay que deshacerlos.
- **Lo que bloquea:**
  - **P-01:** N-05 tumba cuatro casos que nadie puede tocar hoy: una normal fuera de la lista cerrada (ADM-1D102, estudiante archivada) y tres `*.ataque` sin C-n (ADM-T1D103 fila 5, ADM-T2D101 y ADM-T2D102 del alumno). Comprobado con una sonda en memoria.
  - **P-02:** `clase-anterior-view.tsx`, tal como lo escribe §D-9, importa de `features/calificaciones` y `lint` lo rechaza (regla 9). Comprobado con ESLint.
  - **P-03:** "Volver a mis clases" a `/maestro/clases-archivadas` vive en `encabezado-clase.tsx`, que no está en "Se toca".
- **Lo demás, en verde con el código de hoy:**
  - la suite de los módulos, `Tests 1 failed | 4220 passed (4221)` · 200 archivos, con el único rojo de C-11;
  - las vigiladas de fuera, `Tests 1 failed | 177 passed (178)` · 9 archivos, con el único rojo de C-12;
  - `lint`, exit 0.
- **Lo que el plan acierta, comprobado:** con T-03 y `CLASE_ARCHIVADA` en memoria solo cae CH3-A08 (la lista cerrada de `errores-ch3.test.ts:44`) y C-11 pasa a verde. Las vigiladas de `entregas-01e-r1`, `entregas-01e-r2`, `entregas-01d-r3`, CAL-T-94, CAL-1C13, V-06, V-07, CH3-* y las listas de importadores no encuentran choque por el grep; las trampas son O-01d2-1 a O-01d2-12.
- **Para la misma enmienda, sin bloquear:** OA-1 a OA-4.
- **V-01:** 262 archivos; solo cambian los dos de C-11 y C-12.

### Tras la Enmienda 12

Veredicto: **lista para el programador.** Este veredicto reemplaza a la PARADA de arriba. C-40 y C-41 quedan en verde con el código de hoy y con N-05, y la ruta hija y `clase-anterior-view.tsx` pasan `lint` sin importar de otro módulo. Todo lo demás sale como el plan lo predice.

Plan: `plan.md`, SHA-256 `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60` (Enmiendas 1 a 12; lo comprobé al empezar y al terminar). Código de producción sin cambios desde `7655a5b`.

**Entorno.** `BatteryStatus` **2** en todas las lecturas, así que la regla nueva de la batería no hizo falta. Sin `--maxWorkers` y sin repetir ningún archivo por tiempos. Puerta de carga, con ningún otro `vitest`: 13:29:49 `9` y 13:29:58 `0` (C-n); 13:30:19 `12` y 13:30:28 `3` (sonda de C-40 y C-41); 13:32:11 `10` y 13:32:20 `21` (módulos; antes, 13:31:50 `28` y 13:31:59 `12`, y esperé); 13:36:26 `18` y 13:36:36 `2` (sonda de módulos); 13:39:16 `24` y 13:39:25 `12` (vigiladas). Una suite después de otra.

#### Cambios (solo C-40 y C-41)

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-40 | `frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx` | La fila 5 de `CONTROLES` pasa a `rol: "maestro"` (de `:518` a `:521`). El comentario de `:451` dice "perspectiva del maestro" y suma tres líneas con la ronda y el porqué. El caso queda como `ADM-T1D103 fila 5 (maestro, caso 5)` | `b465fd900c2a12681681f04b6ce3c54b23f1028d8b0fdc8545681bdf47e33d60` → `53909e72f161cb3494086fff21b521f8dea1425b687258bd14d4e8b401ece3c1` |
| C-41 | `frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx` | La fila de `BORRADOS` pasa a `nombre: "comentario propio (maestro, fila 6)"` y `rol: "maestro"`, con tres líneas de comentario antes. `ABIERTOS` la hereda sin cambiarse | `32fd1be4f0b957965e60cff91d01e4e5012dad150873f9a51d72a9a02eca2a43` → `907f9ba5b6881a4831fc4062c27d685b5daa19e690eff7a3a40b02b5fbec6a72` |

El hash de antes de cada uno es el de `git show 7655a5b:<ruta>`, igual al del árbol. `git diff -U0`: `r1`, dos hunks (`@@ -451 +451,4` y `@@ -518 +521`); `r2`, uno (`@@ -435,2 +435,5`). C-11 y C-12 no cambian: siguen en `edf4d96e…` y `537e10bc…`.

#### Corridas (desde `frontend/`)

**C-40, C-41, C-11 y C-12, con el código de hoy.** `npx vitest run src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx src/features/tareas/errores-ch3-r1.ataque.test.ts src/styles/clases-r1.ataque.test.ts`

```
 Test Files  2 failed | 2 passed (4)
      Tests  2 failed | 81 passed (83)
   Start at  13:30:00
   Duration  17.09s (transform 7.65s, setup 1.50s, import 6.45s, tests 22.90s, environment 6.79s)
```

Los dos archivos de C-40 y C-41, en verde. Los dos rojos son los esperados, con el mismo motivo: `expected 14 to be 15` (C-11) y `expected [ …(77) ] to have a length of 78 but got 77` (C-12).

**C-40 y C-41, con N-05 en memoria.** `npx vitest run --config <sonda-n05> src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx --reporter=verbose`

```
 Test Files  2 passed (2)
      Tests  64 passed (64)
   Start at  13:30:30
   Duration  15.78s (transform 3.11s, setup 614ms, import 1.09s, tests 21.39s, environment 2.68s)
```

La salida nombra `ADM-T1D103 fila 5 (maestro, caso 5)` y `ADM-T2D101 'comentario propio (maestro, fila 6)'`, en verde. `ADM-T2D102` lleva el nombre recortado por Vitest, `'la confirmación de borrar comentario …'`, y aparece dos veces, también en verde: la del admin y esta. Son lo mismo que pide §D-R0: el control sale, el foco queda dentro de la raíz y no salen escrituras; un solo `DELETE` y un solo aviso; ningún render con el aviso y la confirmación a la vez.

**Módulos, con el código de hoy.** `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app`

```
 Test Files  1 failed | 199 passed (200)
      Tests  1 failed | 4220 passed (4221)
   Start at  13:32:22
   Duration  234.43s (transform 37.39s, setup 152.31s, import 387.01s, tests 1369.15s, environment 576.58s)
```

El único rojo es el de C-11. Mismas cifras que antes de C-40 y C-41: ningún caso se perdió.

**Módulos, con N-05, T-03 y `CLASE_ARCHIVADA` en memoria.** `npx vitest run --config <sonda-t03> src/features/clases src/features/calificaciones`

```
 Test Files  1 failed | 129 passed (130)
      Tests  1 failed | 2608 passed (2609)
   Start at  13:36:37
   Duration  145.07s (transform 32.95s, setup 76.92s, import 248.64s, tests 882.51s, environment 324.89s)
```

El único rojo es ADM-1D102 "perspectiva estudiante, archivada true", y es la entrada que la Enmienda 12 suma a la lista cerrada (paso 19c.3): antes eran cuatro y ahora es esa. No repetí la sonda de `src/features/tareas` ni de `src/app`, porque C-40 y C-41 no tocan esos módulos y producción no cambió: siguen valiendo las de arriba (solo CH3-A08, y nada).

**Vigiladas de fuera.** El mismo comando de arriba:

```
 Test Files  1 failed | 8 passed (9)
      Tests  1 failed | 177 passed (178)
   Start at  13:39:27
   Duration  11.03s (transform 44.57s, setup 5.34s, import 63.75s, tests 859ms, environment 21.25s)
```

El único rojo es V-06, el de C-12.

**`lint` del frontend:** `npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores.

#### P-02: la sonda de ESLint por entrada estándar

Escribí en el espacio temporal una muestra de cada archivo, tal como los describe §D-9, y se los pasé a ESLint con `--stdin-filename`, sin escribirlos en el repositorio: `npx eslint --config ../eslint.config.mjs --stdin --stdin-filename <ruta> < <muestra>`.

| Muestra | Lo que lleva | Resultado |
|---|---|---|
| `src/features/clases/clase-anterior-view.tsx` | Los cuatro estados de §D-9, `useFocoAlPasarAError`, `ContextoDeSoloLectura value={true}`, `AvisoDeClaseArchivada perspectiva="estudiante"` y `<Outlet key={claseId} />`; solo `@/components/…`, `./…` y `react-router` | exit 0, sin mensajes |
| `src/app/router.tsx` | El de hoy más la ruta `{ path: "clases-anteriores/:claseId", element: <ClaseAnteriorView />, children: [{ index: true, element: <MisCalificacionesView /> }] }` y su importación (`diff` de 6 líneas) | exit 0, sin mensajes |
| Control: la misma vista con `import { MisCalificacionesView } from "@/features/calificaciones/mis-calificaciones-view"` | La variante vieja | exit 1: `import is restricted from being used by a pattern` (la sonda sí detecta el problema) |

**Límite:** es mi muestra, no el archivo del programador, y ESLint no comprueba tipos. Prueba que la composición del plan no choca con la regla 9. El archivo real lo prueba su `lint`.

#### Estado de P-01 a P-03 y OA-1 a OA-4

Las siete quedan resueltas en el plan (E12-1 a E12-8). P-01 lo comprobé con las corridas de arriba y P-02 con ESLint. P-03 y OA-1 a OA-4 solo los leí: `encabezado-clase.tsx` en "Se toca", `cursorDeClaseAnterior`, la redirección de la clase activa, los ayudantes de `lib.ts` y la clave de `features/tareas/data.ts`. Las prueba la ronda 1, con ADM-1D203 y ADM-1D233 a ADM-1D236.

#### V-01

262 archivos: 101 del backend y 161 del frontend, todos rastreados desde `7655a5b`; ninguno sin rastrear (`git ls-files -o`).
- Comparé uno por uno contra `7655a5b`: **cambian exactamente cuatro**, los de C-11, C-12, C-40 y C-41. Las otras 258 son idénticas, con el hash que trae la lista de arriba.
- **Lista vigente:** la de arriba, con esos cuatro hashes en sus valores nuevos (dos ya estaban; `r1` y `r2` pasan a los de la tabla de C-40 y C-41). `sha256sum` de la lista completa, en el mismo formato y orden: `e2ee9ba20c4b1f748735e62317e85d611ccfc59d46f584373c9a128040d8e6c2`. Sale limpia en `sha256sum -c`.

#### Observaciones que cambian

Siguen vigentes O-01d2-1 a O-01d2-12. Estas se corrigen o se suman:

- **O-01d2-5 (cambia):** las funciones `consultaDeClasesAnteriores` y `siguienteCursorDeClasesAnteriores` van en `features/clases/lib.ts`, sus tipos en `types.ts` y el límite en `data.ts`: `ver-mas-01e-r3.ataque` cae si `lib.ts` declara un tipo. "Volver a Actividades de aprendizaje" nace una vez en `features/tareas/data.ts`, y las filas 35 y 36 lo pintan en línea, sin componente nuevo.
- **O-01d2-6 (se suma, es una trampa nueva):** `encabezado-clase.tsx` compara la prop `perspectiva`. **No nombres la variable `esMaestro`:** `estatico-02c-r1.ataque` prohíbe esa palabra en todo el código de producción (`mis-comentarios|useBorrarMiComentario|esMaestro|esDueno`). Tampoco leas el `pathname`. `clase-anterior-view.tsx` pasa `perspectiva="estudiante"` como literal y no llama a `perspectivaDeRuta(`. `CAPACIDADES_POR_PERSPECTIVA` no cambia (PR-2C01, `lib.test.ts:285`).
- **O-01d2-7 (se suma):** `clase-anterior-view.tsx` no importa de `@/features/` ni con `..`, y exporta solo componentes: en mi control, un `export const` de más disparó `react-refresh`. `MisCalificacionesView` entra solo por `app/router.tsx`.
- **O-01d2-9 (cambia):** ya no es solo `lista-de-mis-calificaciones.tsx`. También se tocan `mis-calificaciones-view.tsx` (la lectura de `useSoloLecturaDeLaClase` y la elección del texto en `:155`) y `features/calificaciones/data.ts` (la clave `cursorDeClaseAnterior` dentro de `MENSAJES_ERROR_CALIFICACIONES`, sin exportaciones nuevas). Siguen doce archivos, un solo `toast.error` en esa vista (CAL-T-189), sin `.message` ni `esErrorDeCursor(` (CAL-1D09), sin `data-material` y sin texto suelto. Los comentarios de esos dos archivos pasan por las mismas reglas de CAL-1D09 y `estatico-01d-r1`, que leen `fixed` y `-[…]` en crudo. La `key` no va aquí.
- **O-01d2-13 (nueva, ADM-1D102):** esa normal sigue en verde hasta que entre N-05. Al entrar cae, y es lo esperado: sale solo la fila `["estudiante", true]` de `:351` y se ajusta el comentario de `:342`. No toques nada más de ese archivo. `["estudiante", false]` de `:354` se queda.
- **O-01d2-14 (nueva, C-40 y C-41):** son `*.ataque` y no se tocan. Con la fila 5 ya en el maestro, el formulario de comentar de esa fila es el de `capacidades.formularioComentario` del maestro: si esa capacidad o ese componente cambian para el maestro, `ADM-T1D103` caerá por eso.

#### Cierre tras la Enmienda 12
- **Veredicto: lista para el programador.**
- **C-40 y C-41:** en verde con el código de hoy y con N-05. **C-11 y C-12:** en rojo por el mismo motivo.
- **Módulos:** `Tests 1 failed | 4220 passed (4221)`, con el único rojo de C-11. **Vigiladas:** `Tests 1 failed | 177 passed (178)`, con el único rojo de C-12. **`lint`:** exit 0.
- **Con el diseño en memoria:** solo caen ADM-1D102 (estudiante, archivada) y CH3-A08, las dos de la lista cerrada; C-11 pasa a verde.
- **P-02:** la composición por `app/router.tsx` pasa `lint`, y su control con la importación prohibida no.
- **V-01:** 262 archivos, lista `e2ee9ba2…`; cambian exactamente cuatro.
- **`BatteryStatus`:** 2.

#### V-01: lista vigente completa (`e2ee9ba2…`; base para el programador de 01d2)

```
65c1d9d9e6cea8ba8cf98bc522c6ba6d7122376d0201ccf3fc3048d24b60543f  backend/src/adapters/storage/objetos-r1.ataque.test.ts
935a721160f978e35d45d2c9392fe8cb169fae32f43b9df583bda46215707e22  backend/src/adapters/storage/objetos-r2.ataque.test.ts
bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671  backend/src/config/correo.ataque.test.ts
dcb78d222544e8dc4fbece59468f555b04abe971b70016e9bb17fcae3e958580  backend/src/config/env.ataque.test.ts
71e7f049447d2d1ecedd897c55ea0b6d31221753f0a7e7473c7ac6e8667f0a95  backend/src/config/logger.ataque.test.ts
91f620c1a27778eebc2bed5eec1bc9b0e3fe1199b32ed00f9dd910011d6a1805  backend/src/core/clases/codigo-r1.ataque.test.ts
262691f5786ad63b2393d0ba5ff97538f6dacf43343bed019ad23c12a07d8686  backend/src/core/clases/codigo-r2.ataque.test.ts
e769cbfcc3a83a64b51c6437f80684640a7c928ad6b8c5c1671fdff005d7b734  backend/src/workers/ritmo-03c-r1.ataque.test.ts
294be1af0bf69d6c05f54e2f0d8e587c78a5527d0b64d1a224c058e31ce013d0  backend/test/admin-muro-02b-r1.ataque.test.ts
388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85  backend/test/admin-unico.ataque.test.ts
d2cc28b62bf988ae14ba975a9bc8d534aec0eebce30da93d7ded9a26026b0857  backend/test/alumnos-b-r1.ataque.test.ts
00346d471355abc7971b921649e7192b8987fe27912c00cb7e41aef2065369e9  backend/test/alumnos-b-r2.ataque.test.ts
fc11ab4b914d4a88612953f82db354e2b9cea9bef86e24321ef7e031f3ac3837  backend/test/alumnos-b-r3.ataque.test.ts
441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb  backend/test/api-real.ataque.test.ts
f76ce52002e295f2bda6e7a7a7f796415e08013e6d4c1fbe2c9c686671fe8252  backend/test/archivos-d-r1.ataque.test.ts
1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9  backend/test/archivos-d-r2.ataque.test.ts
42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612  backend/test/arquitectura-cuentas-r1.ataque.test.ts
38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716  backend/test/arranque-r1.ataque.test.ts
2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c  backend/test/auth-login.ataque.test.ts
73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e  backend/test/auth-registro.ataque.test.ts
6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713  backend/test/autoria-02b-r1.ataque.test.ts
3520057d0f1a27739eaa701aacd9c18d5c0728fc6a3d55374f43f63a5e6f5336  backend/test/borrado-duplicado-r1.ataque.test.ts
b8fc0db0ea3ec7ff2b89cd9e345c57a9b4ef73afe16fb1aa3e6fdf73c27c16a1  backend/test/borrado-duplicado-r2.ataque.test.ts
5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9  backend/test/calificaciones-01a-r1.ataque.test.ts
afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc  backend/test/calificaciones-01a-r2.ataque.test.ts
dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416  backend/test/calificaciones-carreras-01a-r1.ataque.test.ts
b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07  backend/test/calificaciones-estatico-01a-r1.ataque.test.ts
29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869  backend/test/calificaciones-estatico-01b-r1.ataque.test.ts
6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e  backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts
6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db  backend/test/categorias-01a-r1.ataque.test.ts
f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2  backend/test/clases-archivadas-r1.ataque.test.ts
62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933  backend/test/clases-archivadas-r2.ataque.test.ts
95bba9bac44366ad5a361e93dd2f278cb0a1cc889fa479049acc7b45a9a5e71b  backend/test/clases-r1.ataque.test.ts
a87817d56c236c0ba3597214cac23b10483bbc28ae44800c592ed5ce2ef97f38  backend/test/clases-r2.ataque.test.ts
72de7d8af3d3f772abc19db065f6e418f6eb76ce78d87fe6ebb51335fc99825a  backend/test/clases-r3.ataque.test.ts
be97c4e48ac9551bed1d01552e90ab8cdf085cf928ae6c8c3d81809e35f7ce62  backend/test/clases-r4.ataque.test.ts
000ec9008c73d25121c82a46f5ea0f67e6c8c387cb04e361ef82812b57956098  backend/test/concurrencia-02a-r1.ataque.test.ts
530546b4d70a2b9ad36f98f37e2af45480e81a1101ee3516d15426f78350bf82  backend/test/cuentas-03a-r1.ataque.test.ts
6303ddc170545f616c66773c3f5475cb3be1fea9347d8059354d6ade8d676c16  backend/test/cuentas-r1.ataque.test.ts
3a4e81c111b8eeb7df065804aa85062fa3fc607f0147149b71ac21c14e7818d9  backend/test/cuentas-r2.ataque.test.ts
f54f79f7b2a83e95fe440053ccaf15cb3ebb01ce5dfd4c6655e22159a5fd7e6b  backend/test/cuentas-r3.ataque.test.ts
a2f9bff596330a7d55d1ca9d47197fc831eb132f52c759610e2d667895c3332f  backend/test/cuerpos-02a-r2.ataque.test.ts
4ea45eaa95c5ea2e1ec91e04d2bba32689a30bd341ade16625b28aabdb96d6d9  backend/test/dudas-clases03b-r1.ataque.test.ts
d7a9da854ce8ab8ad8d2437db2e8c2a642a777ea3261a6b038da28be022df848  backend/test/enlaces-03b-r1.ataque.test.ts
dc1b7ee7ea58966f5db33ccb4581885a9669dea2263954ae46d17a83e1ef6eaf  backend/test/enlaces-03b-r2.ataque.test.ts
b051b1986496e35e3e306c4c6bc306a763542bca4b350574d0c02e2c484deb35  backend/test/enlaces-ch-r2.ataque.test.ts
d28cc4de621a680e6b54b2bff889700300d558ec7849717584518d2f03ec8cae  backend/test/entorno-ch-r1.ataque.test.ts
47b02c6d3916713bf9236a619fdb59a641d2e805f1f0b7e9b2c161fe719ddc3a  backend/test/entregas-01b-r1.ataque.test.ts
5baaf6f8fb76320620ed4a84efaca2b2d473460f62360e0d48738b97a0ac584a  backend/test/entregas-01b-r2.ataque.test.ts
885668a621af11f17b4ac706db705aef33231b7773e4783147d21b318bdd0f9a  backend/test/exportacion-02a-r1.ataque.test.ts
ba1ac9b17cc9bf747522bd4ec8b87df436008482e643b18eea8e9a8c041c59b3  backend/test/formada-ch-r1.ataque.test.ts
73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a  backend/test/gestion-02a-r1.ataque.test.ts
e4e9365ea010f3f670b6c1194d1a592e95db43bff0496d4ea1646fc5225ca8b4  backend/test/gradebook-01b-r1.ataque.test.ts
5f4133f949d2f337a8f63b75cf82cb77114db7812d67c1960105f5000c31a326  backend/test/guarda-ch-r1.ataque.test.ts
7a7dac6d87edf81059fcff9c07471aaf49d690ec159be4b9fd4aa32b0909a215  backend/test/guarda-ch-r2.ataque.test.ts
610ee44e5d0bcea46eb4e3645f9adf1998a76947a25af7e3f8248ea3a633df79  backend/test/guarda-ch-r3.ataque.test.ts
e5d149f3ac52b726e1fe08908249706341330f88eaa6674b9a9ac67b98b1e864  backend/test/guarda-clase-r1.ataque.test.ts
c979d2c9c420a2177fa6ebddb78eb2ce84d5f043b94270f690916a6fc75d6f8f  backend/test/guarda-clase-r2.ataque.test.ts
20982e2b98f1b162146a211923f3d5ec19d4e170c4aa3a5bfc6f82c3b6173aad  backend/test/guarda-r2.ataque.test.ts
2649f3d357dcb806361ac101c57fcb504b9c798b631048f0b3e200f63da7dc30  backend/test/hilo-01c-r1.ataque.test.ts
2d2216ee9db290b318825a6f73c346d4767cacc12d95f5ca76457a78b63fedc3  backend/test/instantanea-01b-r1.ataque.test.ts
a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a  backend/test/intentos-r2.ataque.test.ts
2619b44eea3370494c95ac128fcfd9e3ffc20d1581a19f549bf371f603a11d7d  backend/test/invitacion-flujo-03a-r2.ataque.test.ts
704155928183aec193ae7e157b86b3e9361d2b63c7a47be1ed859605fab4ffa6  backend/test/invitacion-masiva-03c-r1.ataque.test.ts
dd9b7454e8786bf0b833d265900ccaecf595808cebc8e9a77c9aef15298a1038  backend/test/invitacion-masiva-03c-r2.ataque.test.ts
82fe8c49674a3cc8328e7951236c0c8f442fcba3890b716013369785b202cf40  backend/test/lecturas-fx-r1.ataque.test.ts
b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea  backend/test/lecturas-fx-r2.ataque.test.ts
f9f9ec59ec8d1a5ccb180522798140c45604440f48edcd68a3e02863d90ae347  backend/test/logs-02a-r1.ataque.test.ts
a2006c163d9e6cd3e4a2a773d1501826daf3c8e7bb184d205bfc6442318fb59c  backend/test/logs-02b-r1.ataque.test.ts
bd8b303c434efec0785e0691d31d6f6e87dbf3305f50fa27cce0f78cbb251e3a  backend/test/logs-03a-r1.ataque.test.ts
b58d5d013658433fe5839634e2db5a31b8d2b8f69587bc36958752d3cd33bbf7  backend/test/logs-03b-r1.ataque.test.ts
0e4abf3bc5d92fa0c380805453190703862567930dd74b9e7fcc1809564d181f  backend/test/logs-03c-r1.ataque.test.ts
1e775a19682f3a5995d7c035bcc810a36bf50c22045b6ffbfc5a98b821255db0  backend/test/logs-archivos-d-r1.ataque.test.ts
e9ce866d511e3ee6029015b74e20b4d342a60be99b3aac97e86f00283a3c77f1  backend/test/logs-archivos-d-r3.ataque.test.ts
e008935b107752d203f6423b2f1c9e0f5a4339f0a77154746bf262cecb90351a  backend/test/logs-cuentas-r1.ataque.test.ts
690e30ed39111c0a074fc159015967cd9f0fdc24d9a340e6a0d7be4b980a9d45  backend/test/logs-muro-c-r1.ataque.test.ts
0809c60700e26183e7771b4b1a40b05cbf554c2ed7929190cf4d89a52722e551  backend/test/logs-muro-c-r2.ataque.test.ts
5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689  backend/test/logs-r2.ataque.test.ts
d6b9adaf1c14a61fe369f510774ef702cfa20f28f3cb19b0eb7357440dcb0783  backend/test/migracion-01a-r1.ataque.test.ts
2afd58e1ead0a293aa7bd58c639f3e5126d153a418f9a26450228468e12b2bed  backend/test/migracion-clases03a-r1.ataque.test.ts
bc6d49f9fc1f5eb20e305945fef57caeebeb108bff5d5cf4ba10b8040687d69c  backend/test/mis-calificaciones-01b-r1.ataque.test.ts
d23bf1312777bdc000810e403a5b4d99c9c0e12998e4cc11be5ef5a2253f6935  backend/test/muro-c-r1.ataque.test.ts
7825cfc9b484df740fa0e9562a195d1bbcaf4caf72ea55fa847b5394ab96c125  backend/test/muro-c-r2.ataque.test.ts
8b733b86fc6d54ece008389a59793fae4ec4a65146eb37215e900e50a5337d46  backend/test/nombres-guarda-r3.ataque.test.ts
3fd2583a4de7cd432b2e09a5130c23d6a59fa475e5e0aa69f23739351acbf9cf  backend/test/nombres-ids-01a-r2.ataque.test.ts
00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb  backend/test/nombres-tokens-r2.ataque.test.ts
80b5a848f69b429e7dadec86c07bec1d3e3eed8a042efba41ce912ded39e7bab  backend/test/nowait-ch-r1.ataque.test.ts
fd2ae2e9792db81d838580b0ef2769ce8ef08059e3353aa5ab927c62295da9e8  backend/test/objetos-reintento-r2.ataque.test.ts
42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d  backend/test/recursos-clases03a-r1.ataque.test.ts
ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516  backend/test/recursos-clases03a-r2.ataque.test.ts
ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21  backend/test/referencias-01b-r1.ataque.test.ts
6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5  backend/test/servicio-ocupado-ch-r1.ataque.test.ts
71c54a113611a3097baa03691f316f5e3d49dbe6532d058a453aaf0641434db1  backend/test/sesiones-y-cadena.ataque.test.ts
70ac720f2e7fcadee5bbcb6414887ab08129dea7cd91df012046953b1584e8b6  backend/test/sexto-paso-02a-r1.ataque.test.ts
c89c30851e6b409cd045017181147bf674df947762a8dea3f3fb981bd9b36e09  backend/test/tareas-01a-r1.ataque.test.ts
79bc7aafc11676d36129610a4b5cd5fe5d8234d0d748487fd2f3e48c5f772c79  backend/test/tareas-01b-r1.ataque.test.ts
ae60c11cff5c82df4954db48582df4bd5a64957ff9afaf9712aa43a038f8e189  backend/test/temas-01a-r1.ataque.test.ts
dc7b86a621062ed671c1e7174a745019133fbd410c7a2e78114b2a2c50affe95  backend/test/temas-01a-r3.ataque.test.ts
f09e9a0038c47d1a2223376a0af260baf573f0c45bf770201c48c9e30296f04b  backend/test/worker-03c-r1.ataque.test.ts
9f60f9d65d52d2021a1eb04e9f01d3cc68f22744c845bf93d6621aa4fe9713a8  backend/test/worker-r1.ataque.test.ts
77d11bd85f202a9eec92a363df82e63fb9a784ca9d368d49f62e61c1a2aa967b  backend/test/worker-r2.ataque.test.ts
0e49b62b73b2ef55e8c0b2ba26e1d136a3adb674761fda2c11453eb5c2faf7cc  frontend/src/app/barra-02d-r1.ataque.test.tsx
b89ede0f6aed45dfcb5e64c8909a822156ce43fd80948e72419cdce9d4541a87  frontend/src/app/cache-03a-r1.ataque.test.tsx
e85743c0fbb8e476874a2c67334342d8d69d14153579fc1e4cce0ae6e2b29616  frontend/src/app/contexto-r1.ataque.test.tsx
bc2be5541006887e2a5a4a89b33046180f607d54474b0f96a73d615afbcac385  frontend/src/app/contrasena-r1.ataque.test.tsx
f38bcacb716d8a39acdb3535a95603cd0d8ab02572ca57a7df5268b01ceb6eac  frontend/src/app/contrasena-r2.ataque.test.tsx
68fb5d092c0c8ecfcf282477ef023aaae26f6b869656e05109dc3efa276d842a  frontend/src/app/cuentas-r1.ataque.test.tsx
41930017715d3d6869dc7acefd75de8ec3684f1f035b845abdf8ec0f6b734dee  frontend/src/app/cuentas-r2.ataque.test.tsx
1506c27e5f7418b5e087fd30f8809645a2fc3e2761c7249de78f02e24aa6c7a5  frontend/src/app/en-espera-r1.ataque.test.tsx
db48dad405c27062621a44d3744c84cc5903892a51e5a8df18f41383cb9c88a3  frontend/src/app/errores-r1.ataque.test.tsx
0e1d93e4dd3cbc7b5e9475a17b5ca66f0df056ba25cb117249f4c2e2f5887a51  frontend/src/app/foco-barra-02d-r2.ataque.test.tsx
2154b5c15f696a0c7f884bff774cf4e2a4208a5281db9076653f8253e2385ab9  frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx
f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4  frontend/src/app/fondo-r1.ataque.test.tsx
29782507d18ff96315e4030e890b21fdf1eb1c5550c3d1cfe5c92664d30b64dd  frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx
57cb54afd3b79464f0df01b88fc388cebbeac5657d936c4c204cbae6034b0834  frontend/src/app/marco-r1.ataque.test.tsx
c8a9812f21cb24db50cc2afd945b7b38abacb468fbf4f4df16c07a52c48426ac  frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx
d7608d7fc7767f53db3971672fc99fdb8bbd33f303f41e321bcc48ad25f511fd  frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx
2f8056a770397c1601647277944555a48afc4b9a2babeb75e5898f0cc92562bb  frontend/src/app/muro-rutas-c-r1.ataque.test.tsx
6acc49a2e3b649868ccf9a9337143f991b655dafbcff2e5916bca0269bd23a7c  frontend/src/app/personas-03c1-r1.ataque.test.tsx
a3e3dadd35c40e9a11a0bdef8cd716daceeb254e5307a837c6598213ba803a7b  frontend/src/app/personas-03c1-r2.ataque.test.tsx
0eefed2c05d76b0790a437e9465a898a9076083b1f046f8785145cfaad0da379  frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx
053e867a904afa3c09eef92ca2e03e929d9f9c93f714040856f40c7418721bbe  frontend/src/app/router.ataque.test.tsx
fc820217bc3baa3749c077fe16a4abd7ae10e92c84494ffb2a215133c19df36a  frontend/src/app/rutas-01d-r1.ataque.test.tsx
f0657fb91f7b3accf64726292f9324c6742c1ac537c6c4a1985ec4e32ae09c83  frontend/src/app/rutas-02c-r1.ataque.test.tsx
c7946f5f5d5d16d36b395adc2ad9928acc7fd9839875fb64532b51489756730b  frontend/src/app/rutas-clases-r1.ataque.test.tsx
f090cbd8e8c9b0af52d4fc19547b07e9b6413f5414cc4b10862f01e29818dddc  frontend/src/app/sesion-r2.ataque.test.tsx
11c6d9c55be91aa41e8525345e3795e34b8e1e661ff7cdd901f729760a033cfd  frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts
48f5ff8fef35faa6d8500fae4a53ca953d7f661100a5c4879ba58e68972ab2de  frontend/src/components/foco/foco-01d-r1.ataque.test.ts
36d605f79169e16a5afadc7e07fc3781472dd393406430277ceb147fc2da1fa5  frontend/src/components/layout/estatico-r1.ataque.test.ts
0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c  frontend/src/components/layout/pie-r1.ataque.test.tsx
00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21  frontend/src/components/layout/pie-r2.ataque.test.tsx
472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76  frontend/src/components/layout/pie-r3.ataque.test.tsx
a1814d281dafd8243989c9f9a462a4f33a86b1fb70eeebf29e99bcb0f340d82a  frontend/src/components/ui/badge-03b-r1.ataque.test.ts
7d080037d9a64eebcebb789d1dfd94b787652103e6f9c84f968f9c9f64c3b30c  frontend/src/features/admin/cuentas-r1.ataque.test.tsx
b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184  frontend/src/features/admin/cuentas-r2.ataque.test.tsx
72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a  frontend/src/features/admin/cuentas-r3.ataque.test.tsx
942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4  frontend/src/features/admin/cuentas-r4.ataque.test.tsx
3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998  frontend/src/features/admin/en-espera-r1.ataque.test.tsx
c21edb5a06b43808ce2be23058409b7ff887e66d60e842c500a3714a90ebcb25  frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx
8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35  frontend/src/features/admin/foco-r1.ataque.test.tsx
30f45bba30d9348ec1587b42e84ca370274e1bf0af0f310b8a6bbd79fa982669  frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx
d477a809e55e603d3ef6c02ca43b21372b75d0947fa303f1539d48bdf32841f8  frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx
761f54f183540d8ae222f97940fa6c2355ff33e515771e627f8efde49261eda2  frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx
14ead3dce027b433d51a9d635b0fa35718ee3875bffc3e1949f96ecb8d2f7135  frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx
3ceda51db8f67f40c26615fbc4cd7d082035b00f38713c6ca4c7db58e47926c8  frontend/src/features/auth/enlace-r1.ataque.test.tsx
1f5d1147637c09daa6fdf1384e4395edd69dfdab84aae5d602a362dabd3295bd  frontend/src/features/auth/enlace-r2.ataque.test.tsx
af3f0d474f8052b402c8959a64acf9e730f9ae60f09d90996a6306e9c2440f08  frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx
991b115524d8dade8d6ea2c51fb753dc8832ee410db2161a0ce761d011cfca4a  frontend/src/features/auth/invitacion-r1.ataque.test.tsx
96b6ab55f0a7bf9b66f8edbcb5ceffa7e4fe35935c6cb12ecab93fc04bc02856  frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx
0ce580976ea894ee4bd9c4adbe3d7d1d524354a8ff22fc7e7cc6acf89057aa53  frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx
4bcd3e34b62726fea718efb9c482d8c1f504bbe85ef32427bdf4d65a6832d8f1  frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts
812ee5f1b04a1218e2b96cdb97fb5a964a4a21b0d81b95bb4889beaa4a3894bb  frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts
bef8aa53d338fde15e251d53756b76e3381ef9f6de4943c4db83c8e2b3d258dd  frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx
d15e821c212bb268c65bd9dee36293b02f5bde4dedd4bf9926dbbf99b9971f57  frontend/src/features/calificaciones/exportacion-02b-r2.ataque.test.tsx
5991d8e3d4e694973309f178e5341a2285584cf9ed6006fbb658d7f5a61de5dd  frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx
c744fb831fa9992c2a9ed0729f9ec3cc089f3167ca19133c6eee0133382607a1  frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx
8dea1c2adc5d228e166ce6037a1a1a827d26e2bdc6d7c8534f146517ebc1ac44  frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx
6f7496ca7652e7b4441a7eb9822e74270d50127ac40ba27b86c83edfcd5cc3fa  frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx
24751f358fc5ecd485c475e7025dd881b87fe892f025459a6ff29f615fc5cc66  frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx
c504d0ad3690781275a6ffb78638a6148550b2fd4ee1ed25a4b154054fc4f80d  frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx
6ac36ce1eb4df953626415b3ed431a8f4809dc29cf259f755f1f8509dd54b7ef  frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx
fb33f2a27bfcca906549a12610977478ba72e6e7ed8afd5c5a0a962deb3eb802  frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx
932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872  frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx
55dc274eca96da4360848b88f9f2a839ac815031490ab57ff38de074512d632c  frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx
371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183  frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx
266d088dd727f18af8c8a106b8d9c4dbed75753e4b1b4abb12f3a4df870ecb7f  frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx
856cffbd9c743f9815daf731487e29dc5f5272545dc15820a70baf86ecfa6527  frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx
a9dc00d9cf6e8684113eeb824658c7fb2f3077ee8a54deb0cce47ac802c74f44  frontend/src/features/clases/archivos-d-r1.ataque.test.tsx
98e645df89c9736ee33f440c1d83f342be84f30caabec0310b1b5185e538fbd6  frontend/src/features/clases/archivos-d-r2.ataque.test.tsx
f1b2b7d3c2a2bfbc2c2aa31cce4b120e306681c0cc9efb85ac2a954c8f8f8afe  frontend/src/features/clases/archivos-d-r3.ataque.test.tsx
c6c85ac2f6e7418e81d7817f9c455c0e0973025a15ae2a5378e00c9a71c45620  frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx
a3880b67ffaa0d15763d1c761cef1ff8472029c77bfb2211ab079eadb1685325  frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx
66c0b873bc8b9d8e9e01ac871bd6aaab4328508beb5ec9371d69463d7c12430d  frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx
53909e72f161cb3494086fff21b521f8dea1425b687258bd14d4e8b401ece3c1  frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx
907f9ba5b6881a4831fc4062c27d685b5daa19e690eff7a3a40b02b5fbec6a72  frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx
a188c90deb61bafedabc50b76c77b02507964297cd6b155f905114839f728493  frontend/src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx
1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65  frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx
76b5b2522f60795c0e7672da7b10ea95a3ce61d1aa26f102ef8eb057bd3ce6d9  frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx
cffce654ebfb37dc10f8ce8bf7026fc982a8c3f79b677fa2eb82c4476e113f83  frontend/src/features/clases/clases-admin-01c-r3.ataque.test.tsx
87dae1927669b46bb52aad94db5107a5284f772fa9b29e225aace19c1a1e8def  frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx
5f0679d8cfacc8bce01989c04a415dc5b546625eb7dec92f03959de5a0f89815  frontend/src/features/clases/clases-r1.ataque.test.tsx
c7ad5edc733e374117a9277f1c2987e84cc2930c77eb4c720ccf15cc9f5fab45  frontend/src/features/clases/clases-r2.ataque.test.tsx
a835a11d29aedb8f77f91e826a22c2b7cf5322fced3f6bed0c1acbf7c75a4e61  frontend/src/features/clases/clases-r3.ataque.test.tsx
86b04d234527eceefca35b07ce89e6b7ce0b6afe5ccdee2f005e6a4219f0495a  frontend/src/features/clases/clases-r4.ataque.test.tsx
dce7fd019a6e32b8e4df37dd0728e265f5e9449e9ee2723f372ea174fe312464  frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx
3b5a9fac5cd20a881bf6b38597b752725a7f6bbfddcf103b7bf1239a76353dfc  frontend/src/features/clases/dudas-03e-r1.ataque.test.tsx
fec2ffc2691bd297dca5f90233d498d10dfd689a5d9a8819bc30e757c6f67c26  frontend/src/features/clases/dudas-03e-r2.ataque.test.tsx
18edcffc8e48073362b98c784d5bf64e3335709ae6e1c6425b32aa3310e24b56  frontend/src/features/clases/dudas-03e-r3.ataque.test.tsx
ddc9dfaccc8230ec612126fdf29939a8e4311188566e5cfcaa724bd119e959e8  frontend/src/features/clases/errores-ch3-r1.ataque.test.ts
5e20eefe0104b510a3002de084b6162162b5bf20797622c8d92b350853494b53  frontend/src/features/clases/estatico-02c-r1.ataque.test.ts
3cb8e0d7bb13b57638d65aa74ec5ff0f9306f024cf6996b7737232243a0b82f8  frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts
cdd1ed8890859ae3e884822fc7074852a2173105114745d83fe9a15c1c47c626  frontend/src/features/clases/estatico-r1.ataque.test.ts
de23d395dfe7a6f3d6d15eb48cb574599dc9d8204e5a90b255c0c10d25a186fa  frontend/src/features/clases/fila-01d-r1.ataque.test.tsx
46383e1f3ede03cb204dbf602373d0a07e513d8dac7ec4179a203ea6ee270fa3  frontend/src/features/clases/foco-02c-r3.ataque.test.tsx
0165d4e27b1fff9230d17bec740d89c380b6f322923c7e5a044ac010f4b9358b  frontend/src/features/clases/foco-02c-r4.ataque.test.tsx
8b8ea2d21597bc0444709a9d26fd795d05bc964ef7b5094240628c63018c091b  frontend/src/features/clases/foco-02c-r5.ataque.test.tsx
b819d6bbde4bd47e3ec724fcdea5e77eb66b12076b8a9a083691b52ef0bdd182  frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx
ab006dc1711e9a652643930a7010c25f442d1ffdd137adbb093eb5bd98da90d6  frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx
5224976752a14c3e003b246fa97abf25356e370cb46da1cdff9526bf3be86b4e  frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx
7f4a935de29c3c519aad697edb1470c4cfcead600f5c1516c5fff948995d4434  frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx
8bc578ef17d2731f388c14ca19bc719a2b8d04d8a41009fadee15227379047bc  frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx
479430b848cf3d21a0187138944deec46bb36653071bbd2790ed57620f012976  frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx
4d94ccbe786a46ca1d82a280956f1146d5c302a9f83dfac45f39b3b2f94b753f  frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx
0f60f1582fce6e5efaf9bf6856133dc30f1dc4eb9c3b7fea19f90a330f8335b3  frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx
7c434a0e54e70b12d4b2a3de22ffb4dbf5f28a1cfbd2290c22e8a2b59edf0e16  frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx
99df138b24d4aba97b9f714c32ba226e82c7403cf73aa2e9e2b0b028b28e283e  frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx
4817262ef6e4dadff56857e50bab2e06ec479e62d5eaf45b34d70d683736b637  frontend/src/features/clases/muro-02c-r1.ataque.test.tsx
8da38dbcb605ce3d90ace8117ce2cc5c838d71eb24bdd76fad3a53b82da93901  frontend/src/features/clases/muro-c-r1.ataque.test.tsx
d0acb3527aafa6f687e3eb00563e37be93768e7d7f742694a4d5ce05b75b7e28  frontend/src/features/clases/muro-c-r2.ataque.test.tsx
d08e51d451ebaeb2d7086c75dc1f73d52c5b4a6b8dfb979932828bed5f5d459d  frontend/src/features/clases/muro-c-r3.ataque.test.tsx
558212b46641de0794d0ce90e3944a99cb5baa7fab4b09bbac5ea7cac41eaa34  frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx
aec8c4131e5dc733246b33e8189e2dc595387324bdd2081d1d245641c20c380a  frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx
67b60a9a5363f88e6ceba210c27452b8d639f6df798aa4e506dc54bb2312249a  frontend/src/features/clases/personas-02d-r1.ataque.test.tsx
7677e0571587c89de1cb76788d499ac545255ca64c8afcb38a8ad6e39c02e2c6  frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx
60541290248812cfce5591ddf33d01125d60c33257743a7ec48a445013d3d8c1  frontend/src/features/clases/recursos-03d-r1.ataque.test.tsx
4aafaa73980ba1bc29be043623a030c9eaa730825eb61a403bf54f9ac700b42d  frontend/src/features/clases/recursos-03d-r2.ataque.test.tsx
70b1a49a6a0e471422be987466228e5beb87e25baee2906790651c94ed214a3a  frontend/src/features/clases/recursos-03d-r3.ataque.test.tsx
29a3125cc70969f2fc2bb1f012beeb81840e1a00ea08d5b588b10d190342ae7f  frontend/src/features/clases/recursos-03e-r1.ataque.test.tsx
85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511  frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx
4303eac77b98e8978495d9e68fd7725ac436f9db757dbc0c02c59051436908fa  frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx
09435abbb9a26dd71c52b4d95487c6d38594f1ba062aefb60f73b7eb7308f991  frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx
d899c19ba982fbde2208bbc7fa009869556c84bd4650586dbd9ee90b22234e47  frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx
97af503e763f7dff9fcfbdc72862cd21de6af8e51d3ec41134f8475d98ae2df6  frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx
db42c88d5b0bfb1125bf122c03a2e019d6f5365c128ac4bfadd413a26a934845  frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx
f6924bc272a5240cf97d35729c797cc10960ed7cf94fe1be1b69ca2df6c1cf8f  frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx
9866ef34167061e2715b65a352c55d08c7e9268033e879ae633c7fd568e4d49f  frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx
ea58eb11c3157a33c5730f87f2cf562ae178589b30264902b165c4439cebc2ee  frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx
2ef258e946084f17e33936e8fa257551a90323b589859dd2e1f70aabeaf711bf  frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx
e2fefd7d744f77c7bdd2ba73a08cc51076d0f6130bf4d0a225e0e972a1dce111  frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx
11bb5433fb30f268b6d93e1e7814d826bbab8fb1f173e574faf52f5a96b5a41e  frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx
d8daccb56c8de8d9f1b0f8d1b0907c110e327f4f55b016fc0fe7fc0f25ccc79c  frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx
ef86c46708f0682bca5a023e85794639c396ec94d207cac23ceb13585ab39e75  frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx
5ff367edba10c9ba9c7e50f8ed874032654fa2abdc0dd8f4a122a000355472ab  frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx
2938ae2f1c00f63a0372997c7ba68bdc0ab097895769bf9060072a4ac2674c5a  frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx
0963f14f4842d6d57288876c932496ac09d44b872fc049492ee6e8ba539f3235  frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx
4f486ca37d2a2bb6cc26754281d2adce086a9d8d4485a069de7ae5d54e360acf  frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx
93a5a0a648669e9c96494a62b2b16082b07296f279e2892bf2c8d47834ee2fc1  frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx
08a5e1a5642e7fc7553632dd5cf4e07f0ea35c3ef1e7293d010bbc49b09465aa  frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx
172be3efd919c0d3948eca17c7e808968e2370afe1f9c2a28cef7d2ded584b81  frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx
496652bc59817166f53e00cb828f2119c857c2834063a31764d7876dc150c930  frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx
edf4d96e4b884eab718d06811877c17b611099a66d6857502f71eedb96026dda  frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts
94d6e6253b266c7f21099aa593aac7b2600edca22ab403aa365dcd789b1c6a97  frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts
f614e7369f8c47c40a87ad1f8867fb8edf7ebc76e94d0ba6c5c59c92cb6347f0  frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts
fb387ecbb7e5272d2ffb53d626b51ffd9c57b409d10c560e6a5ecbfa6a2a8c19  frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx
7a7c7ba922f77da22d0f765ed5ea9ccf9216d1900e4b5f18365da9d46437495f  frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx
bfded7507bc684ea9858cd76517ef0e4c23cbc69e5a19f381e6ec522fd6156e6  frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx
b778fc2e6bb0a8f8715a56877b3b781439ca214c8a9c8ae126f610c95229882a  frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx
bf3c999033195cac778a82a579e44729fb07a405f5cdb41d8e7dc932cb71f942  frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx
3567d7c23d2cf6a2fd538cd6822ef60ac3cffeac036394ed1e3559debe492c57  frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx
6bbe2bd85e2b5500fbab4d0f51630c0c8e9d65b1a63045ad1fa906298a92a435  frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx
72b19b6a00b4ade43b06829bb5bef1a5cdecf5a7d2af57369f1e857a1d4a17f5  frontend/src/lib/errores-ch3-r1.ataque.test.ts
5d41a2af073dcaa2b8b016d835d36d5ebae9278863db048484a192a88bb31a30  frontend/src/lib/errores-ch3-r2.ataque.test.ts
66513d957e524af5e336a2c7e656df37f51106507a3984b691df47cd825d4d10  frontend/src/lib/estatico-ch3-r1.ataque.test.ts
a9529cefbd27cbb94376a6548ef1b8b247fb1f4155938298ae5d10eaee81008a  frontend/src/lib/estatico-ch3-r2.ataque.test.ts
60bc1fc7011e9a0fe5a4c4aa45420f2c7d38adb9ee2f8d235d09847dbe13ac3a  frontend/src/lib/format-01c-r1.ataque.test.ts
c71cba65dd284d7af11cbc812b6bcf75baa373939edb8318e731858d9c50173f  frontend/src/lib/format-d-r1.ataque.test.ts
89dbbb70d5dc404c3d74db5391d10855c8cb1d6b4c643b6147b3ce6ffb2637af  frontend/src/lib/format-d-r2.ataque.test.ts
bfa7ded62f7a1402590d438a1cc51060a63fa019ad47d3eb5740e43383064a2a  frontend/src/lib/format-d-r3.ataque.test.ts
b6265bf6eec25b7f2c34dcd93dd4d8b23d07ca6214576921a50a66ff16346ffb  frontend/src/services/apiClient-ch3-r1.ataque.test.ts
10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce  frontend/src/services/apiClient.ataque.test.ts
537e10bc0519805f2be98ff579b34c71eda6fa7d364e355bfbd0050f568ffcb6  frontend/src/styles/clases-r1.ataque.test.ts
b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582  frontend/src/styles/tokens-r1.ataque.test.ts
```

## Ronda 1 — ADMIN-01d2

Veredicto: **ROTO**, por tres hallazgos de severidad media o baja. Los ocho puntos de ataque del manager resisten en lo que pedían, salvo el detalle del punto 7 (T-03). T-01 y T-02 salieron de atacar alrededor de esos puntos.

Verificación propia: lint exit 0 · test `Tests 4 failed | 4670 passed (4674)`, y los cuatro rojos son míos (T-01, T-02 en las dos listas y T-03).

Plan: `plan.md`, SHA-256 `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60`, comprobado. Resumen: `resumen-programador.md`, "ADMIN-01d2 — Implementación" y "Antes de la ronda 1". Base: `7655a5b`.

### Entorno
- **Batería:** `BatteryStatus` 2 en todas las lecturas. Sin `--maxWorkers` y sin repetir archivos por tiempos.
- **Puerta de carga, sin otro `vitest`:** 16:26:24 `23` y 16:26:33 `9`; 16:26:52 `7` y 16:27:02 `6`; 16:29:26 `16` y 16:29:35 `2`; 16:30:41 `11` y 16:30:50 `3` (suite). Una corrida después de otra. La otra copia de trabajo no se usa. Sin navegadores.
- **Un error mío, sin efecto en el repositorio.** Mi guion falló antes de un `cd` y dejó dos comandos corriendo en el espacio temporal, así que `npx` descargó a su caché, fuera del repositorio, dos paquetes que este proyecto no usa en esas versiones: `tsc@2.0.4` y `vitest@5.1.0` (`C:\Users\Carlos\AppData\Local\npm-cache\_npx\1d6e82a4126006c4` y `C:\Users\Carlos\AppData\Local\npm-cache\_npx\69c381f8ad94b576`). `tsc@2.0.4` solo imprimió que no es el compilador, y `vitest@5.1.0` terminó con `No test files found`. No corrieron ninguna prueba ni tocaron el proyecto: `package.json` y `package-lock.json` sin cambios. Esa corrida (16:25) no cuenta. **`AGENTS.md` pide preguntar antes de instalar dependencias, y esto se instaló sin preguntar. No los borré: lo decide el humano.**

### Hallazgos

### T-01 — El alumno lee "Mostramos la última versión" justo cuando la clase archivada lo saca de ahí
Severidad: media
Prueba: `frontend/src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx:895`, "ADM-T1D215: la recarga de la tarea recibe 409 CLASE_ARCHIVADA: termina en la clase anterior y no se avisa que se muestra una versión que ya no se ve"
Esperado: el alumno termina en `/estudiante/clases-anteriores/:claseId`, sin un aviso que diga que sigue viendo la tarea. Si hay aviso, uno solo y con el texto de archivada.
Obtenido: termina en la clase anterior, pero con el aviso `No pudimos actualizar la tarea. Mostramos la última versión que tenemos.`
- **Por qué pasa:** para el alumno, `GET …/tareas/:id` de una archivada responde `409 CLASE_ARCHIVADA`. `features/tareas/detalle-tarea-view.tsx:53-59` lo trata como cualquier recarga fallida con la tarea en caché (`:56`), y un instante después N-05 se lleva la vista.
- **Camino real:** `ClaseLayout` sigue montado entre secciones, así que no vuelve a pedir el detalle de la clase. El alumno abre una tarea que ya tenía en caché, con los datos vencidos, después de que la archivaron. La prueba lo provoca marcando vieja la tarea.
- **Hermano:** es el hermano 5 de la Enmienda 3 ("Consultas"), que el plan revisó para las listas (ADM-1D216) y no para esta lectura, porque la tarea en caché no es una lista.
- **Lo que no pasa:** no hay dos avisos y la redirección llega. El defecto es el texto.

Requisito o regla violada: §D-9 (Enmienda 3, hermano 5) y fila "Subida de tarea o entrega; descarga del alumno; listas del alumno" de la matriz: ante `CLASE_ARCHIVADA`, "un aviso (el del `catch`, el de la descarga o el error de la vista)". El texto que sale afirma algo falso.

### T-02 — Recién visto el aviso de archivada, la lista dice que no hay ninguna
Severidad: baja
Prueba: `frontend/src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx:603`, "ADM-T1D220: la clase que la persona acaba de ver archivada no falta de su lista: abrir la lista justo después de ver el aviso no dice que no hay ninguna" (`alumno` y `maestro`)
Esperado: al seguir "Volver a clases anteriores" (o "Volver a mis clases") desde la clase que la sesión acaba de saber archivada, la lista la incluye.
Obtenido: `Unable to find role="link" and name "Clase 1"`. La lista sale de la caché y dice "No tienes clases anteriores" o "No tienes clases archivadas", hasta que vencen los 30 s del `staleTime` y se vuelve a montar.
- **Ventana estrecha:** hace falta haber abierto la lista en los 30 s anteriores.
- **Para el manager, porque roza una decisión aprobada.** La Enmienda 10 dice que "archivar y restaurar no la marcan viejas" y que el alumno y el maestro ven el cambio "en su siguiente petición de la lista (al montarla con los datos vencidos)". Su razón es la sesión del admin, donde esa clave nunca tiene datos. No contempla este caso: la sesión del propio alumno o maestro que acaba de leer el detalle archivado y, con él, sabe que su lista está vieja. Si el manager lo da por cubierto por la Enmienda 10, no es hallazgo y el caso debe salir con un C-n; no lo decido yo.

Requisito o regla violada: §D-9, Enmienda 10 (lectura que hay que arbitrar). Un vacío que afirma algo que la propia pantalla anterior acaba de desmentir.

### T-03 — Dudas en una archivada: el bloque abierto y vacío deja un título "Respuestas" sin nada debajo
Severidad: baja
Prueba: `frontend/src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx:812`, "ADM-T1D227: el bloque de una duda sin respuestas abierto al archivar: no queda el título «Respuestas» sin nada debajo, ni el formulario"
Esperado: sin respuestas y sin formulario, no queda un encabezado vacío.
Obtenido: `expected <h3 tabindex="-1" class="sr-only"></h3> to be null`.
- **Por qué pasa:** `elemento-de-duda.tsx:60-61` sigue ofreciendo el control por `abierto`, y `respuestas-de-duda.tsx:252` pinta el `h3` y el borde superior aunque `contenido()` dé `null` y el formulario ya no se pinte. Un lector de pantalla lee "Respuestas" y nada más, y queda una línea suelta en pantalla.
- **Lo que está bien:** el control dice "Ocultar respuestas", plegarlo lleva el foco a la fila (ADM-T1D228) y el foco no cae en `<body>`.
- **Precedente:** por lectura, el mismo estado existe hoy para el admin si borran la última respuesta con el bloque abierto. En una archivada es más fácil de alcanzar, porque basta tener abierto "Responder".

Requisito o regla violada: punto de ataque 7 del manager ("nada de título huérfano") y §D-9, fila 25.

### Atacado sin hallazgos

57 casos en dos archivos; 53 en verde.

**Punto 1, lista con `5xx` y `400` alternados, en las dos listas:**
- **ADM-T1D216** (con `app/providers.tsx`): `5xx`, repetir, `400` en la siguiente, repetir y cargar hasta el final. Cada texto una vez, sin avisos, sin perder el botón, y el foco nunca en `<body>`.
- **ADM-T1D217:** el foco en una fila cuando llega el `5xx`: va al `h1`.
- **ADM-T1D218:** ir al inicio y volver con el `5xx` en pantalla: solo la primera página, sin texto.
- **ADM-T1D219:** dos páginas cargadas, `5xx` en la tercera y `400` en la segunda al repetir: la frase, y otro «Cargar más» pide solo la primera.
- **ADM-T1D231 y ADM-T1D232:** dos clics al repetir, con `5xx` y con `400`: una petición.

**Punto 2, N-05 y OA-2 con otras cosas abiertas:**
- **ADM-T1D221:** OA-2 con otro filtro y «Ver más tareas» en vuelo, con `500` y con `400`: sin avisos al llegar, y la clase activa nace en "Todas" y con enlaces.
- **ADM-T1D222:** N-05 con «Ver más tareas» en vuelo, con `500` y `400`, con y sin filtro: título como texto, sin avisos.
- **ADM-T1D223 y ADM-T1D224:** un `403` después de cada redirección: su texto y su enlace, sin ir y venir entre rutas.
- **ADM-T1D233:** un id manipulado en la vista de la clase anterior: sin acceso, sin pedir calificaciones.

**Punto 3, fila 32:**
- **ADM-T1D201:** «Borrar con las entregas» en vuelo y dos vueltas: reabrir da el primer paso y no sale otro `DELETE`; con éxito navega y un aviso.
- **ADM-T1D202:** con un `409`: un aviso, sin segundo paso; el siguiente intento lo abre, sin aviso.
- **ADM-T1D203:** `DELETE` con éxito con la clase ya archivada: navega a Actividades en solo lectura.

**Punto 4, filas 35 y 36 con un archivo a medio subir (`it.each` editar y crear):**
- **ADM-T1D204:** el `PUT` al almacén llega y la tarea recibe el `409`: un aviso, sin navegar, lo escrito sigue hasta el detalle, que se pide una vez.
- **ADM-T1D205:** se archiva con el `PUT` en vuelo: un aviso, sin navegar; al restaurar el formulario nace limpio.
- **ADM-T1D206:** dos archivos, y la solicitud del segundo con `409`: un aviso con su nombre, sin escribir la tarea.

**Punto 5, el alumno con la entrega en vuelo:**
- **ADM-T1D207:** la subida llega después de N-05 y la entrega responde `ENTREGA_VACIA`, `enlaces.0` o `CLASE_ARCHIVADA`: un aviso legible y se queda en la clase anterior.
- **ADM-T1D208:** el `PUT` falla después de la redirección: un aviso, sin entregar.
- **ADM-T1D209:** la entrega se acepta después de la redirección: un aviso de éxito.

**Punto 6, restaurar con "Mis calificaciones" en error:**
- **ADM-T1D225:** el texto de la clase anterior no se ve en la clase activa, y Calificaciones se recupera.
- **ADM-T1D226:** al revés, archivar: en la clase anterior no se lee "Vuelve a abrir Calificaciones".

**Punto 7, Dudas (sin T-03):**
- **ADM-T1D228:** plegar el bloque vacío con el foco en el control: a la fila.
- **ADM-T1D229:** «Ver más respuestas» en vuelo al archivar: la página llega, sin formulario y sin «Borrar».
- **ADM-T1D230:** plegar y desplegar en una archivada, y al restaurar el formulario renace sin llevarse el foco.

**Punto 8, la recarga tras el `409`:**
- **ADM-T1D210 y ADM-T1D211:** la persona sale con la recarga en vuelo, en las filas 36 y 33: al llegar no navega ni avisa otra vez. Fila 36: al volver guarda con la versión nueva.
- **ADM-T1D212 y ADM-T1D214:** un segundo `409` con la primera recarga sin resolver, en las filas 36 y 33, soltando las dos en cada orden: reinicia una vez, sin otro aviso. Fila 36: con la versión nueva y el foco en el título.
- **ADM-T1D213:** control: sin pasar por una archivada, con la recarga en vuelo, dos clics no mandan otro `PUT`.

**Además:**
- **ADM-T1D234:** el foco en cada control de las filas 31 a 36 al archivar (siete casos): nunca en `<body>`.

**La pregunta de T-03 de 01d1, en las filas 22 a 37: ¿qué se pierde si un callback de `mutate` no corre porque el componente ya no está?** Revisé por `grep` cada `.mutate(` y `mutateAsync(` de esos archivos. No encontré ningún aviso perdido:

| Fila | Callback o resto del manejador | Si no corre |
|---|---|---|
| 22 y 25 | `crear.mutate` y `responder.mutate`: limpiar y marcar el campo | Sin formulario; el aviso del error del texto vive en el gancho, con `montado` (ADM-1D223) |
| 23, 24 y 26 | `onSettled`: la guarda | La fila sigue montada; si sale, la guarda se va con ella |
| 27, 28, 29 y 30 | Sin callbacks | Nada |
| 32 | `onSuccess: navigate`, `onError: setConEntregas` | No navega con la vista desmontada, y es lo que pide B2; el aviso sale del gancho (`montado`) |
| 33, 34, 35 y 36 | `mutateAsync` con `catch` | El `catch` sigue corriendo; el error del campo avisa con `montado` |
| Alumno | `entregar` y `anular`, con `mutateAsync` | Igual (ADM-T1D207) |

Un matiz, que no cuento como hallazgo: un comentario del hilo aceptado con el formulario ya fuera no da ningún aviso de éxito. Tampoco lo da con el formulario montado (el comentario aparece en la lista), y es así desde antes de 01d2.

**Lo que no cuento, según la lista del orquestador:** N-01d1-4 extendido, el foco en el contenedor del error al recuperarse sin navegar, el foco en la redirección de N-05, el fallo callado de la fila 36, el `catch` de `entrega-de-alumno-view.tsx:136` y la fecha sin año.

### No atacado y por qué
- **Navegador, 360 px y apariencia:** sin navegadores. «Cargar más» bajo el mensaje de error y los enlaces del pie los juzga el humano en la comprobación del final de 01g.
- **El backend:** 01d2 no lo toca, así que no hay PA-07.
- **La barra lateral con la clase archivada tras N-05:** por lectura, sigue hasta que se vuelve a pedir, y la Enmienda 10 lo declara. No escribí caso. Si el manager reabre esa decisión por T-02, es su hermano.
- **Con la vista desmontada y de vuelta antes de que llegue la recarga, fila 33:** por lectura, el panel nace con la versión vieja y el siguiente guardado recibe otro `409`. No escribí caso: ya era así en `7655a5b` (`montadoRef`) y nada se sobrescribe.

### Conteos y corridas (desde `frontend/`)

**Archivos nuevos**, de `npx vitest list … | grep -a -c`:

| Archivo | Casos | SHA-256 |
|---|---|---|
| `frontend/src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx` | 28 | `0fc7408a9c9e039c700956c8132790e689b84db3714f52080df86aecb387d88b` |
| `frontend/src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx` | 29 | `af127fae8354906737c857aa497a29a53514c928fa4dcfbfc79a41e3fbc13eee` |

No cambié ninguna `*.ataque` existente, ni código de producción, ni pruebas normales. Sin tiempos fijos: lo que debe quedar en vuelo se retiene con una promesa.

**Los dos archivos:** `npx vitest run src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx`

```
 Test Files  2 failed (2)
      Tests  4 failed | 53 passed (57)
   Start at  16:29:37
   Duration  42.57s (transform 3.34s, setup 601ms, import 1.19s, tests 47.75s, environment 2.81s)
```

**Módulos, con el comando literal del resumen:** `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts`

```
 Test Files  2 failed | 211 passed (213)
      Tests  4 failed | 4670 passed (4674)
   Start at  16:30:52
   Duration  231.65s (transform 46.59s, setup 129.04s, import 325.11s, tests 1396.00s, environment 606.90s)
```

- 4617 del resumen + 57 mías = 4674. Los cuatro rojos son T-01, T-02 (dos listas) y T-03; ningún archivo de antes cae.
- **`lint`:** `npm run lint` → exit 0. `All matched files use Prettier code style!`, y la última línea es `> tsc -b`.

**V-01:** `sha256sum -c` de la lista `e2ee9ba2…`: 262 sin diferencias. `git ls-files` da 262 rastreadas. Hay 2 mías sin rastrear, las de la tabla: **264 en total**. Nadie más tocó ninguna.

**Producción:** `git diff --name-only 7655a5b -- frontend` da 38 y `git ls-files -o --exclude-standard frontend` da 8 (los 6 del programador y mis 2). Huella de `frontend/src` sin pruebas: `cc30a2b35c19819b37c23c6c5011482ace120febd4ebd469d80566f408c5733b` (`find frontend/src -name '*.ts' -o -name '*.tsx' | grep -v '\.test\.' | sort | xargs sha256sum | sha256sum`).

### Cierre de la ronda 1 de 01d2
- **Veredicto: ROTO.**
- **Hallazgos:** crítica 0, alta 0, media 1 (T-01), baja 2 (T-02 y T-03).
- **T-02 pide un arbitraje del manager** antes de corregir: roza la Enmienda 10.
- **Resisten** los ocho puntos del manager, salvo T-03 en el punto 7, y la pregunta de T-03 de 01d1 no encontró ningún aviso perdido.
- **Suite:** `Tests 4 failed | 4670 passed (4674)`. **`lint`:** exit 0. **V-01:** 262 sin cambio, más 2 nuevas. **`BatteryStatus`:** 2.
- **Para el humano:** los dos paquetes que `npx` dejó en su caché por error mío (arriba, "Entorno").

## Ronda 2 — ADMIN-01d2

Veredicto: **ROTO**, por un solo hallazgo de severidad baja (T-04). T-01, T-02 y T-03 siguen cerrados, y los siete puntos de ataque resisten, salvo un resto de T-02 en el punto 3. También dejo una medición para que el manager decida (O-r2-1), que no cuento como hallazgo.

Verificación propia: lint exit 0 · test `Tests 2 failed | 4755 passed (4757)`, y los dos rojos son T-04, uno por lista.

Plan: `plan.md`, SHA-256 `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60`, comprobado. Resumen: `resumen-programador.md`, "ADMIN-01d2 — Corrección ronda 1" y "Hermanos autorizados de T-01". Base: `7655a5b`.

### Entorno
- **Batería:** `BatteryStatus` 2 en todas las lecturas. Sin `--maxWorkers` y sin repetir archivos por tiempos.
- **Puerta de carga, sin otro `vitest`:** 17:45:35 `0` y 17:45:44 `0` (regresión); 17:50:35 `9` y 17:50:44 `2`; 17:53:28 `10` y 17:53:37 `4`; 17:55:19 `25` y 17:55:28 `12` (los archivos nuevos); 17:56:28 `14` y 17:56:37 `2` (suite). Una corrida después de otra. Sin navegadores. La otra copia de trabajo no se usa.
- **`npx` solo desde `frontend/`:** cada comando comprueba el directorio antes (`[ "$(basename "$PWD")" = frontend ] || exit 9`). `package.json` y `package-lock.json` sin cambios.
- **Dos corridas de mis archivos que no cuentan como resultado (17:50 y 17:53).** Los rojos eran de mis pruebas, no del código: un `await act` que esperaba una lectura retenida, un texto mal elegido, y la invalidación de Recursos, que no alcanzaba las secciones. Las corregí antes de la corrida que cuento.

### Regresión, antes de atacar

`npx vitest run src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx src/features/tareas/errores-ch3-r1.ataque.test.ts src/styles/clases-r1.ataque.test.ts src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx src/features/clases/clases-admin-01c-r1.ataque.test.tsx src/features/clases/clases-admin-01c-r2.ataque.test.tsx src/features/clases/clases-admin-01c-r3.ataque.test.tsx`

```
 Test Files  10 passed (10)
      Tests  226 passed (226)
   Start at  17:45:46
   Duration  30.26s (transform 19.95s, setup 5.56s, import 13.93s, tests 125.50s, environment 25.37s)
```

Todo en verde: mis `clase-archivada-01d2-r1` (ADM-T1D215, ADM-T1D220 y ADM-T1D227 incluidas), C-11, C-12, C-40, C-41, y las de 01c y 01d1.

### Hallazgos

### T-04 — T-02 sigue si la primera página de la lista aún no llega cuando la sesión lee la clase archivada
Severidad: baja
Prueba: `frontend/src/features/clases/clase-archivada-01d2-r2.ataque.test.tsx:533`, "ADM-T2D202: la primera página de la lista sigue en vuelo cuando la sesión lee la clase archivada, y llega sin ella: al volver no se lee que no hay ninguna" (`alumno` y `maestro`)
Esperado: al seguir "Volver a clases anteriores" (o "Volver a mis clases"), la lista trae la clase.
Obtenido: `Unable to find role="link" and name "Historia"`. Se lee "No tienes clases anteriores" o "No tienes clases archivadas", con cero peticiones más.
- **Por qué pasa:** `useClaseArchivadaEnSuLista` (`features/clases/hooks.ts:419`) lee `getQueryData`, y con la primera página en vuelo no hay datos: "sin lista, no hace nada". Su efecto solo depende de `claseId` y `archivada`, así que no vuelve a correr cuando llega esa respuesta, leída antes de archivar.
- **Qué lo distingue de los que sí resisten:** con «Cargar más» en vuelo sí hay datos y la lista sale de la caché, y su respuesta tardía no vuelve a meter nada (ADM-T2D201). Solo queda este estado: lista sin datos y con una petición en vuelo.
- **Ventana:** más estrecha que T-02. La persona abre la lista y se va a la clase, por la barra, antes de que la lista responda, y la clase se archiva en ese intervalo. Por eso es baja. Es el mismo texto falso que el arbitraje de T-02 decidió corregir, y por eso lo reporto.
- **Puede aceptarse:** si el manager lo da por riesgo residual, va a ESTADO §3 y el caso sale con un C-n; no lo decido yo.

Requisito o regla violada: "## Arbitraje de T-02 — ADMIN-01d2": al volver no se lee el vacío falso.

### Atacado sin hallazgos

38 casos en dos archivos; 36 en verde.

**Punto 1, T-01 con `callado`, en la entrega de un alumno:**
- **ADM-T2D216:** la tarea con `409` mientras la entrega se vuelve a pedir: al volver bien, ningún aviso; un `5xx` nuevo, uno solo.
- **ADM-T2D217:** lo mismo, y la persona sale de la vista: al volver no se repite; un `5xx` nuevo, uno solo.
- **ADM-T2D218:** la tarea con `409` y la entrega reemplaza la vista: sin aviso de la tarea; al volver, un `5xx` nuevo, uno solo.
- **ADM-T2D219:** un `5xx` callado que después se vuelve `409` antes de terminar la entrega: ningún aviso de última versión.
- **ADM-T2D220:** otra tarea sin desmontar: el `409` de la primera no se come el `5xx` de la segunda, y al regresar no se repite nada. Esto cubre lo que el programador declaró solo por lectura ("cambio de clave").

**Punto 2, Recursos con `409` y `5xx` alternados:**
- **ADM-T2D213:** temas en `409`, con las secciones en `409` o en `5xx`: nunca "última versión", y un solo id de aviso.
- **ADM-T2D214:** temas en `5xx` y secciones en `409`, en los dos órdenes: un solo id, se lee el texto de archivada y termina en la clase anterior. Ver O-r2-1.
- **ADM-T2D215:** temas en `409`, `5xx` y `409`: el `5xx` avisa, y los `409` no se lo comen ni lo repiten.

**Punto 3, T-02 con la lista en movimiento (las dos listas; sin T-04):**
- **ADM-T2D201:** «Cargar más» en vuelo al salir: la lista sale de la caché, la respuesta tardía no vuelve a meter nada, y al regresar se pide una vez, desde la primera.
- **ADM-T2D203:** la lista en error con filas en caché: al volver, desde la primera y sin texto de error.
- **ADM-T2D204:** dos clases archivadas seguidas: cada una aparece, con una lectura por vez.
- **ADM-T2D205:** atrás del historial: sin vacío falso, y sale la clase.

**Punto 4, T-02 con una clase en una página sin cargar (las dos listas):**
- **ADM-T2D206:** abrirla tres veces: una lectura por apertura, siempre sin cursor, sin ciclo. Con su página ya cargada: ninguna, y las dos páginas siguen.

**Punto 5, T-03 con varios `DELETE` en vuelo, y el destino exacto del foco:**
- **ADM-T2D207:** dos `DELETE` con la clase archivada, en los dos órdenes: al archivar, el foco va a la fila de la respuesta. Con la primera, a la que queda; con la última, **a la fila de la duda**. Dos avisos de éxito, nunca `<body>`, y sin título huérfano. Esto mide el destino que "T-03 vecino" solo afirmaba como "no en `<body>`".
- **ADM-T2D208:** «Ver más respuestas» con la última página vacía: al `h3` del bloque.
- **ADM-T2D209:** con el foco en «Ver más respuestas», una recarga deja el bloque sin respuestas: el `h3` ya no está y el foco va a la fila de la duda. Lo salva el `useFilaEnFoco` de `dudas-view`. Era lo que esperaba ver roto, y resiste.

**Punto 6, T-03 cuando llega algo al bloque:**
- **ADM-T2D210:** una respuesta nueva por una recarga: reaparece con su título, sin formulario ni «Borrar», y sin llevarse el foco.
- **ADM-T2D211:** una recarga con error y luego sana: un solo mensaje, sin avisos; al sanar, el bloque deja de pintarse y el foco no se mueve.
- **ADM-T2D212:** dos vueltas con el bloque vacío: al restaurar vuelven título y formulario sin llevarse el foco, y al archivar salen.

**Punto 7, las cuatro vistas del gancho tras dos vueltas (detalle, entregas, entrega de un alumno y editar):**
- **ADM-T2D221:** con datos: el `409` no avisa, el `5xx` siguiente avisa una vez, y otro `409` no repite.
- **ADM-T2D222:** sin datos: el texto de archivada reemplaza la vista, sin aviso.
- **ADM-T2D223:** el alumno: `5xx` con su aviso y después `409`: termina en la clase anterior sin otro aviso.

### Observaciones para el manager

**O-r2-1. Una medición sobre tu frase del punto 2, que no cuento como hallazgo.** Pediste "nunca «última versión» justo antes de la redirección". Con los temas en `409`, se cumple. Pero con las secciones en `409` y **después** los temas en `5xx` (ADM-T2D214, orden "secciones 409 antes que temas 5xx"), el último aviso es "No pudimos actualizar Recursos. Mostramos la última versión que tenemos.", con el mismo id, así que reemplaza al de archivada, y después llega la redirección.
- **Por qué no lo cuento:** ese `5xx` es un fallo real y el texto es cierto al salir; el gancho solo ve el error de los temas, y hace falta que el servidor falle justo en ese intervalo. La prueba fija lo demás (un solo id, se leyó el de archivada, termina en la clase anterior) y no afirma el orden final.
- **Medido** con una copia temporal de la prueba, ya borrada, que lanzaba la lista de avisos (18:03:31 `24` y 18:03:40 `10`). Orden "secciones 409 antes que temas 5xx": archivada, archivada, última versión, última versión. Orden contrario: última versión, última versión, archivada, archivada. Son dos llamadas por cada bloque, con el mismo id.
- **Si lo quieres contar:** por lectura, es hermano en `trabajo-view.tsx` y en el detalle de la tarea; esos dos no los medí. Decide tú.

### No atacado y por qué
- **Navegador, 360 px y apariencia:** sin navegadores.
- **El backend:** 01d2 no lo toca, así que no hay PA-07.
- **Lo que no cuenta, según el orquestador:** `aria-controls` de «Ocultar respuestas», la barra lateral y el inicio con la clase archivada, la fecha sin año, N-01d1-4 extendido, el foco en la redirección de N-05, el foco del contenedor de error al recuperar sin navegar, el fallo callado de la fila 36 y el `catch` de `entrega-de-alumno-view.tsx:136`.
- **Las vistas del gancho con el `409` real para el maestro:** el servidor no se lo manda en una lectura. ADM-T2D221 y ADM-T2D222 fijan el gancho compartido con un doble, igual que los casos "defensivos" del programador. Ninguno prueba que el backend lo mande.
- **Clientes:** en `features/tareas` uso las opciones de `app/providers.tsx` sin reintento, como el arnés del programador. En `features/clases`, con `retry: 1`, salvo en Recursos, para medir el orden.

### Conteos y corridas (desde `frontend/`)

**Archivos nuevos**, de `npx vitest list … | grep -a -c`:

| Archivo | Casos | SHA-256 |
|---|---|---|
| `frontend/src/features/clases/clase-archivada-01d2-r2.ataque.test.tsx` | 24 | `4e3a45f7672489373d6d1ad3f2309c572e9b7930e846fa9596b60a858c933294` |
| `frontend/src/features/tareas/clase-archivada-01d2-r2.ataque.test.tsx` | 14 | `940817a89a4aaa1703187248e6c53dcbfe97c1af053b2f78c265e34f0ce50e7a` |

No cambié ninguna `*.ataque` existente, ni código de producción, ni pruebas normales. Las dos de la ronda 1 siguen en `0fc7408a…` y `af127fae…`. Sin tiempos fijos: lo que debe quedar en vuelo se retiene con una promesa.

**Los dos archivos:** `npx vitest run src/features/clases/clase-archivada-01d2-r2.ataque.test.tsx src/features/tareas/clase-archivada-01d2-r2.ataque.test.tsx`

```
 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 36 passed (38)
   Start at  17:55:30
   Duration  30.68s (transform 3.40s, setup 604ms, import 1.22s, tests 32.62s, environment 2.79s)
```

**Módulos, con el comando literal del resumen:** `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts`

```
 Test Files  1 failed | 214 passed (215)
      Tests  2 failed | 4755 passed (4757)
   Start at  17:56:39
   Duration  234.47s (transform 40.43s, setup 130.24s, import 325.51s, tests 1411.51s, environment 616.04s)
```

- 4719 del resumen + 38 mías = 4757. Los dos rojos son T-04, uno por lista; ningún archivo de antes cae.
- **`lint`:** `npm run lint` → exit 0. `All matched files use Prettier code style!`, y la última línea es `> tsc -b`.

**V-01:** `sha256sum -c` de la lista `e2ee9ba2…`: 262 sin diferencias. `git ls-files` da 262 rastreadas. Hay 4 mías sin rastrear, las dos de la ronda 1 y las dos de esta: **266 en total**. Nadie más tocó ninguna.

**Producción:** `git diff --name-only 7655a5b -- frontend` da 40 y `git ls-files -o --exclude-standard frontend` da 10 (los 6 del programador y mis 4). Huella de `frontend/src` sin pruebas: `10a41c206143f21ba15b2b7dfdd91b7f8a9ae39589f1840f83d485c309006315` (`find frontend/src -name '*.ts' -o -name '*.tsx' | grep -v '\.test\.' | sort | xargs sha256sum | sha256sum`).

### Cierre de la ronda 2 de 01d2
- **Veredicto: ROTO.**
- **Hallazgos:** crítica 0, alta 0, media 0, baja 1 (T-04).
- **Para el manager:** T-04 puede corregirse o aceptarse como riesgo residual, y O-r2-1 queda a su decisión.
- **Resisten** T-01, T-02 y T-03 en la regresión, y los siete puntos, salvo T-04 en el punto 3.
- **Suite:** `Tests 2 failed | 4755 passed (4757)`. **`lint`:** exit 0. **V-01:** 262 sin cambio, más 4 sin rastrear. **`BatteryStatus`:** 2.

## Ronda 3 — ADMIN-01d2

Veredicto: **RESISTE.** Sin hallazgos: crítica 0, alta 0, media 0, baja 0. T-01 a T-04 siguen cerrados, y los seis puntos de ataque no encontraron ningún defecto.

Verificación propia: lint exit 0 · test `Tests 4802 passed (4802)` · `Test Files 216 passed (216)`.

Plan: `plan.md`, SHA-256 `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60`, comprobado. Resumen: `resumen-programador.md`, "ADMIN-01d2 — Corrección ronda 2". Base: `7655a5b`.

### Entorno
- **Batería:** `BatteryStatus` 2 en todas las lecturas. Sin `--maxWorkers` y sin repetir archivos por tiempos.
- **Puerta de carga, sin otro `vitest`:** 19:24:40 `2` y 19:24:49 `0` (regresión); 19:39:08 `9` y 19:39:17 `5` (mi archivo); 19:42:32 `12` y 19:42:41 `10` (mutación de la limpieza y las dos corridas en orden aleatorio, una después de otra); 19:45:15 `0` y 19:45:24 `6` (suite). La carga externa llegó a 63 % entre corridas, y esperé sin terminar ningún proceso. Sin navegadores. La otra copia de trabajo no se usa.
- **`npx` solo desde `frontend/`:** cada comando comprueba el directorio antes. `package.json` y `package-lock.json` sin cambios.
- **Dos corridas de mi archivo que no cuentan (19:32 y 19:36).** La primera cayó por mis pruebas: una suposición mía sobre el estado en pausa (abajo) y el nombre de un enlace. La segunda dio `31 passed`, antes de sumar ADM-T3D216.

### Regresión, antes de atacar

`npx vitest run src/features/clases/clase-archivada-01d2-r2.ataque.test.tsx src/features/tareas/clase-archivada-01d2-r2.ataque.test.tsx src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx src/features/tareas/errores-ch3-r1.ataque.test.ts src/styles/clases-r1.ataque.test.ts src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx src/features/clases/clases-admin-01c-r1.ataque.test.tsx src/features/clases/clases-admin-01c-r2.ataque.test.tsx src/features/clases/clases-admin-01c-r3.ataque.test.tsx`

```
 Test Files  12 passed (12)
      Tests  264 passed (264)
   Start at  19:24:52
   Duration  41.02s (transform 45.01s, setup 10.28s, import 29.92s, tests 240.62s, environment 56.02s)
```

Todo en verde, con ADM-T2D202 en las dos listas.

### Hallazgos

Ninguno.

### Atacado sin hallazgos

33 casos en un archivo, todos en verde, en las dos listas salvo el punto 5.

**Punto 1, los estados "en pausa", con `onlineManager`:**
- **ADM-T3D201, sin datos**, en los dos órdenes (volver y que regrese la red; que regrese la red y volver): nunca se lee el vacío, la petición sale una sola vez y trae la clase.
- **ADM-T3D202, sin la clase:** la lista se quita; al volver sin red no se lee el vacío, y con red sale la clase, con una lectura más.
- **ADM-T3D203, con la clase:** la lista se queda; al volver sin red se ve la clase, y con red sigue, con una lectura más.
- **ADM-T3D204:** «Cargar más» en pausa y salir a la archivada: al regresar la red no sale la página vieja.
- **ADM-T3D216, control:** dos clics sin red no piden nada; con red sale una sola página y el botón vuelve a servir.

**Una precisión a la tabla del arbitraje, sin efecto para la persona.** "Sin datos, en pausa: no hace nada: la petición aún no sale" termina igual, pero el estado no se queda en pausa. Al irse el último observador, la petición en pausa se revierte y la lista pasa a sin datos y quieta (lo vi: `fetchStatus` `idle`, y esa fue mi suposición equivocada de la primera corrida). Por eso, al regresar la red con la clase abierta no sale nada, y la lectura ocurre al volver a la lista. El caso cubre los dos órdenes.

**Punto 2, sin datos y quieta, y el reintento:**
- **ADM-T3D205:** en la espera del reintento de la primera carga, con `retry: 1` y `fetchStatus` en `fetching`: al leer la archivada la lista se quita y el reintento no sale. Al volver, sin error ni vacío, con dos lecturas.
- **ADM-T3D206:** la primera carga falla después de salir hacia una clase activa, y esa clase se archiva. Es el estado sin caso del programador: `status` `error` y sin datos. Al volver se pide, sin su error ni el vacío.

**Punto 3, T-04 cruzado con `useRecuperarListaDeClasesAnteriores`:**
- **ADM-T3D207**, en los dos órdenes (la clase ya archivada al llegar; se archiva con la vista abierta): la lista en error y la recarga en vuelo al salir: una sola lectura de más, desde la primera, sin texto de error.
- **ADM-T3D208:** una recarga con la clase en la lista falla después de salir, y la clase se archiva: la lista se queda y al volver termina con la clase, sin el vacío ni el error.
- **ADM-T3D209:** el `400` de «Cargar más» llega después de salir: al volver la lista se cura sola, sin la frase de lista cambiada.

**Punto 4, dos clases seguidas con la lista en vuelo:**
- **ADM-T3D210:** primero una activa, que no toca la lista, y después una archivada: la respuesta tardía no entra, y al volver sale la clase, con dos lecturas.
- **ADM-T3D211:** primero la archivada y después una activa: la lista no se vuelve a crear, con dos lecturas.
- **ADM-T3D212:** dos archivadas seguidas (para el alumno, con N-05 en medio): las dos salen al volver, con dos lecturas.

**Punto 5, el recorrido completo de cada rol, con `app/providers.tsx`:**
- **ADM-T3D213, alumno:** inicio → "Clases anteriores" → «Cargar más» → una clase → volver → otra clase → «Ver más tareas» y el filtro → volver. Sin secciones, títulos como texto, cero lecturas de más de la lista, sin escrituras ni avisos.
- **ADM-T3D214, maestro:** inicio → "Clases archivadas" → una clase → Personas, Dudas, Actividades, una tarea y la entrega de un alumno → "Volver a mis clases". Ningún control de escritura, sin pedir el código, cero lecturas de más de la lista, sin escrituras ni avisos.
- **ADM-T3D215, admin:** una archivada → Personas → «Restaurar» con dos clics: una petición, un aviso, vuelve «Quitar», el foco en el `h1`, y la sesión no crea la lista.

**Punto 6, regresión de T-01 a T-04 en orden aleatorio:** mis cinco archivos del encargo (`01d2-r1` y `01d2-r2`, en `clases` y `tareas`, y `01d2-r3`), con `--sequence.shuffle`, que baraja archivos y casos:

| Semilla | Resultado |
|---|---|
| `--sequence.seed=20261106` | `Test Files 5 passed (5)` · `Tests 128 passed (128)` |
| `--sequence.seed=77` | `Test Files 5 passed (5)` · `Tests 128 passed (128)` |

**¿Detectan algo estos casos?** Mutaciones en memoria, con un complemento de Vite fuera del árbol (`C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\ce73329e-6e87-4432-b4fc-239c50515013\scratchpad\vitest.sonda-r3.config.mjs`). Ningún archivo del repositorio cambia. Sobre `clase-archivada-01d2-r3.ataque.test.tsx`:

| Mutación en `features/clases/hooks.ts` | Resultado | Caen |
|---|---|---|
| Sin `!enVuelo` en la guarda de "sin datos" | `8 failed \| 25 passed` | ADM-T3D205, 210, 211 y 212 |
| `enVuelo` también en pausa | `2 failed \| 31 passed` | ADM-T3D203 |
| `invalidateQueries` en lugar de `removeQueries` | `12 failed \| 21 passed` | ADM-T3D202, 204, 205, 210, 211 y 212 |
| Sin `!enVuelo` en la guarda de "ya la trae" | `33 passed` | **No la detectan.** La cubre "T-04: con la clase en la lista y una recarga en vuelo…", del programador, según el resumen y la verificación del manager; no lo repetí |
| Sin la limpieza de `useRecuperarListaDeClasesAnteriores` | `33 passed` | **No la detectan.** Sobre `01d2-vista` y `01d2-r1.ataque`: `2 failed \| 191 passed`, ADM-1D204 (a) con dos páginas ya cargadas, en las dos listas |

Lo segundo significa que ADM-T3D207 no prueba que la limpieza actúe: con la clase archivada, el gancho de T-04 también quita la lista. Prueba que los dos juntos no piden de más ni dejan texto.

### No atacado y por qué
- **Navegador, 360 px y apariencia:** sin navegadores. Los recorridos del punto 5 corren en jsdom, con el router real y dobles de la API: no son una prueba contra el backend, ni de cómo se ve.
- **El backend:** 01d2 no lo toca, así que no hay PA-07.
- **El texto de error durante la recarga al volver (ADM-T3D208 y ADM-T3D209):** por lectura, si la lista falla después de salir y se vuelve, se lee su texto mientras la recarga de `refetchOnMount` está en vuelo, y se quita al llegar. La prueba afirma el estado final, no ese intervalo. El último intento sí falló, la vista se cura sola, y no lo cuento como hallazgo.
- **La suite completa del frontend:** la corre el manager al cerrar.
- **Lo que no cuenta, según el orquestador:** O-r2-1, el vecino 7, la barra lateral y el inicio con la clase archivada, E10-6, `aria-controls`, la fecha sin año, N-01d1-4 extendido, el foco en la redirección de N-05, el foco del contenedor de error, el fallo callado de la fila 36, el `catch` de `:136` y los vencimientos a batería.

### Conteos y corridas (desde `frontend/`)

**Archivo nuevo**, de `npx vitest list … | grep -a -c`:

| Archivo | Casos | SHA-256 |
|---|---|---|
| `frontend/src/features/clases/clase-archivada-01d2-r3.ataque.test.tsx` | 33 | `6f30bd0fc683631483ca1f35943e932f8883e83a3f4559f72110d67ce1590a8b` |

No cambié ninguna `*.ataque` existente, ni código de producción, ni pruebas normales. Las cuatro anteriores siguen en `0fc7408a…`, `af127fae…`, `4e3a45f7…` y `940817a8…`. Sin tiempos fijos: lo que debe quedar en vuelo se retiene con una promesa. ADM-T3D205 usa la espera real del reintento de TanStack Query, y solo espera por estado (`fetchFailureCount`).

**Mi archivo:** `npx vitest run src/features/clases/clase-archivada-01d2-r3.ataque.test.tsx`

```
 Test Files  1 passed (1)
      Tests  33 passed (33)
   Start at  19:39:19
   Duration  19.85s (transform 1.80s, setup 302ms, import 595ms, tests 17.33s, environment 1.44s)
```

**Módulos, con el comando literal del resumen:** `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts`

```
 Test Files  216 passed (216)
      Tests  4802 passed (4802)
   Start at  19:45:26
   Duration  228.92s (transform 40.94s, setup 124.21s, import 315.75s, tests 1389.18s, environment 595.21s)
```

- 4769 del resumen + 33 mías = 4802, y 215 + 1 = 216.
- **`lint`:** `npm run lint` → exit 0. `All matched files use Prettier code style!`, y la última línea es `> tsc -b`.

**V-01:** `sha256sum -c` de la lista `e2ee9ba2…`: 262 sin diferencias. `git ls-files` da 262 rastreadas. Hay 5 mías sin rastrear: `01d2-r1` y `01d2-r2` en `clases` y `tareas`, y `01d2-r3` en `clases`: **267 en total**. Nadie más tocó ninguna.

**Producción:** `git diff --name-only 7655a5b -- frontend` da 40 y `git ls-files -o --exclude-standard frontend` da 11 (los 6 del programador y mis 5). Huella de `frontend/src` sin pruebas: `ed86095a7ed459ea3d62c8fff931bbe6546bbe0d0bf66a7b8b508b3bb8c95948` (`find frontend/src -name '*.ts' -o -name '*.tsx' | grep -v '\.test\.' | sort | xargs sha256sum | sha256sum`).

### Cierre de la ronda 3 de 01d2
- **Veredicto: RESISTE.**
- **Hallazgos:** ninguno.
- **Suite:** `Tests 4802 passed (4802)` · `Test Files 216 passed (216)`. **Orden aleatorio:** 128 de 128 con las dos semillas. **`lint`:** exit 0. **V-01:** 262 sin cambio, más 5 sin rastrear. **`BatteryStatus`:** 2.
- **Para el manager:** la precisión sobre "sin datos, en pausa", por si la tabla del arbitraje pasa a los documentos.

## Ronda 0 — ADMIN-01e

Veredicto: **LISTA PARA EL PROGRAMADOR** (sin PARADA). Apliqué C-6, C-7, C-8, C-25 a C-32 y C-42 tal como los escribe §D-R0 → 01e, y nada más. C-6, C-8 y C-42 quedan en rojo por la razón esperada y solo por ella; C-7 es un comentario; C-25 a C-32 siguen en verde con el código de hoy y también con el serializador de M-09 aplicado en memoria. Las vigiladas de 01e, en verde. Dejo una observación para el arquitecto (OA-01e-1: una vigilada que el plan describe a medias y que, sin cuidado, lleva la ruta del estado de pago a una PARADA) y diez para el programador (O-01e-1 a O-01e-10).

Plan: `plan.md`, SHA-256 `7018e1f321364350554c1a2fdd2cd2e5f0c54ea18c3586ce8c62a1ad2b4e97cf` (Enmiendas 1 a 13; comprobado al empezar). Base dentro de los paquetes: `ea718bc` (01d2). Antes de tocar nada, los once archivos de los C-n coincidían con `git show ea718bc:<ruta>`, y `gestion-02a-r1.ataque.test.ts` tenía el hash de partida de C-42 (`73c55120…`). Al terminar, `git diff --name-only ea718bc -- backend frontend shared` lista solo esos once `*.ataque`.

Verificación propia (regla "Suites por ronda": lo que toco, las vigiladas que nombra el plan para 01e y `lint` del backend):
- **lint del backend:** `cd backend; npm run lint` → exit 0, dos veces (después de los C-n y después de mover el comentario de C-42). Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, sin errores.
- **test:** los once archivos de los C-n, las 31 vigiladas y dos sondas en memoria. Abajo van las corridas.
- No corrí la suite completa del backend ni la del frontend: las corre el manager al cerrar la subentrega. 01e toca `shared/`, pero en esta ronda no cambió nada de `shared/` ni del frontend.

### Entorno y trabajo en paralelo
- **Trabajo en paralelo:** por el orquestador (respuesta del humano de hoy, 2026-11-09), no hay otra copia de trabajo activa ni otra suite corriendo.
- **Red (PA-01):** `uacam5 2`, perfil Privado, autorizada por el humano para la sesión de hoy (dato del orquestador).
- **Docker:** 28.5.1, encendido. Los contenedores de `infra/` (`campus-dev-*`) siguen arriba; no los toqué.
- **Energía:** `BatteryStatus` **2** (corriente) en todas las lecturas.
- **Carga antes de cada corrida** (`Win32_Processor.LoadPercentage`, dos lecturas a 9 s, ningún `node` con `vitest`): 08:22:35 `18` y `12` (C-n); entre 08:25:04 y 08:27:24, entre `10` y `62`, por las aplicaciones del humano (VS Code, Docker Desktop y otras), así que corrí las vigiladas a las 08:27:34 con `31` y `40`, sin esperar más; 08:29:52 `15` y `12` (sonda M-09, primera); 08:32:30 `17` (sonda M-09, la que cuenta; la segunda lectura no salió); 08:35:11 `2` y `5` (C-n, segunda); 08:37:14 `8` y `5` (sonda S-16). Una corrida después de otra.
- **Una corrida que no cuento:** la primera de la sonda M-09 (08:30:01) cayó entera por un error mío: el serializador que inyecta la sonda tenía un salto de línea dentro de una cadena (`Unterminated string literal` en `src/config/logger.ts`, en memoria). La corregí y la repetí; solo cuento la segunda.
- Sin navegadores ni aplicaciones gráficas. No terminé ningún proceso.

### Cambios (solo C-6 a C-8, C-25 a C-32 y C-42)

| C-n | Archivo | Cambio | `git diff -U0 ea718bc` |
|---|---|---|---|
| C-6 | `backend/test/sesiones-y-cadena.ataque.test.ts` | El inventario de rutas suma exactamente las 13 entradas de §D-7 y §D-8, cada una en su lugar del orden de `sort()`: `GET` y `HEAD` de `/api/admin/movimientos-inscripcion`, `/api/admin/resumen`, `/api/admin/usuarios` y `/api/admin/usuarios/:id`; `POST /api/admin/alumnos`; `PUT /api/admin/alumnos/:id/acceso`, `PUT /api/admin/alumnos/estado-pago`, `PUT /api/admin/usuarios/:id/activo` y `PUT /api/admin/usuarios/:id/nombre`. Comprobé con `node` que quedan 138 entradas (125 + 13), ordenadas y sin repetir. Además, el comentario de C-6 antes del caso y "ADMIN-01e" en el título, como C-1 en 01a y C-3 en 01b. El comentario dice que solo `POST /api/admin/alumnos` y `POST /api/auth/registro` crean estudiantes; el título no lo suma, porque la prueba no enumera quién crea estudiantes ("si la prueba lo enumera", §D-R0). Lo que protege no cambia | `@@ -571 +573,13` (comentario y título); `@@ -612,0 +627,4`, `@@ -645,0 +664,4`, `@@ -673,0 +696`, `@@ -712,0 +736,2`, `@@ -713,0 +739`, `@@ -714,0 +741` (las 13 entradas) |
| C-7 | el mismo archivo | El comentario de V-06 de CLASES-b (`:464`) pasa de "Ninguna ruta expone movimientos_inscripcion" a "Ninguna de estas rutas…" y suma que, desde ADMIN-01e, la única que contiene «movimiento» es `GET /api/admin/movimientos-inscripcion`, solo para el admin, y que las rutas de alumnos de la clase siguen sin exponer sus filas. Solo comentario | `@@ -464 +464,3` |
| C-8 | `backend/test/lecturas-fx-r1.ataque.test.ts` | La lista de usos de `instantaneaUnica: true` suma `"adapters/db/gestion-de-usuarios.ts:2"` (lista y resumen) y `"adapters/db/movimientos.ts:1"`, en su lugar del orden y con su comentario. El título pasa de "veintiuna" a "veinticuatro lecturas (…, dos de gestión de usuarios y una de movimientos)". Lo demás que protege no cambia | `@@ -758 +758` (título); `@@ -827,0 +828,6` |
| C-25 | `backend/test/logs-r2.ataque.test.ts` | El centinela pasa de `/api/salud?centinela=<uuid>` a `/api/salud-centinela/<uuid>`, con su comentario. Así el valor único va en el camino de una ruta que no existe (`404`), que el log conserva entero, y no en la consulta. El reconocimiento (`:86`, `req.url === urlCentinela`) no cambia: compara con un camino sin consulta | `@@ -197 +197,4` |
| C-26 | `backend/test/logs-03a-r1.ataque.test.ts` | Ídem (`:65` sin cambio) | `@@ -241 +241,4` |
| C-27 | `backend/test/logs-03b-r1.ataque.test.ts` | Ídem (`:62` sin cambio) | `@@ -222 +222,4` |
| C-28 | `backend/test/logs-03c-r1.ataque.test.ts` | Ídem (`:62` sin cambio) | `@@ -197 +197,4` |
| C-29 | `backend/test/logs-cuentas-r1.ataque.test.ts` | Ídem (`:62` sin cambio) | `@@ -246 +246,4` |
| C-30 | `backend/test/logs-muro-c-r1.ataque.test.ts` | Ídem (`:67` sin cambio) | `@@ -192 +192,4` |
| C-31 | `backend/test/logs-muro-c-r2.ataque.test.ts` | Ídem (`:67` sin cambio) | `@@ -203 +203,4` |
| C-32 | `backend/test/api-real.ataque.test.ts` | Ídem (`:67` sin cambio) | `@@ -233 +233,4` |
| C-42 | `backend/test/gestion-02a-r1.ataque.test.ts` | Título de `:694`: suma "(el dado de baja, además, con `cuentaDesactivada: true`)". `:729` se reemplaza por el bloque de §D-R0: el detalle trae exactamente los ids de `a` y `b` (`arrayContaining` más `toHaveLength(2)`); cada maestro se busca por `id`, con mensaje y sin `return` temprano; `a` con `["id", "nombre"]`; `b` con `["cuentaDesactivada", "id", "nombre"]` y `cuentaDesactivada` con `toBe(true)`. `:728` (`const delDetalle = …`) queda igual, con el comentario de C-42 debajo. No cambian `prohibidas` (con `"activo"`), correos, "deudor" ni inscritas (`:730-735`). El archivo sigue con 13 casos | `@@ -694 +694` (título); `@@ -729 +729,16` (el bloque). Ningún otro hunk |

En C-25 a C-32 ninguna precondición cambia: ninguno de los ocho afirmaba el código de respuesta del centinela, y ninguno cuenta líneas de forma que una petición `404` más las altere (los recuentos de `logs-muro-c-r1:230` y `logs-muro-c-r2:243` filtran por `/api/clases/`; el de `logs-03c-r1` por `/api/admin/maestros/lote`). No toqué código de producción, pruebas normales ni ninguna otra `*.ataque`.

#### SHA-256 antes y después

| Archivo | C-n | Antes (= `ea718bc`) | Después |
|---|---|---|---|
| `backend/test/sesiones-y-cadena.ataque.test.ts` | C-6, C-7 | `71c54a113611a3097baa03691f316f5e3d49dbe6532d058a453aaf0641434db1` | `e177959b61b1f93fa60d72b260465d4b53b66745fcf51e3befd8e5c7383a7f51` |
| `backend/test/lecturas-fx-r1.ataque.test.ts` | C-8 | `82fe8c49674a3cc8328e7951236c0c8f442fcba3890b716013369785b202cf40` | `e3e7d53e2cec2d70e5321d2452939a5e9d71dbe5421b1e6856beb3c8e1bf4e56` |
| `backend/test/logs-r2.ataque.test.ts` | C-25 | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | `a2507bb8a5f031143a08e9570c1299f7fa1effcf54b006358da2b4a99dc21ec8` |
| `backend/test/logs-03a-r1.ataque.test.ts` | C-26 | `bd8b303c434efec0785e0691d31d6f6e87dbf3305f50fa27cce0f78cbb251e3a` | `01ad4e952282047f4826d6d86fc21fd464143752c8d8901b4063607930d9c1d5` |
| `backend/test/logs-03b-r1.ataque.test.ts` | C-27 | `b58d5d013658433fe5839634e2db5a31b8d2b8f69587bc36958752d3cd33bbf7` | `3a626786bdb37eb05744b50c9c2c03b4037bf947991a9905f015ca04560464a0` |
| `backend/test/logs-03c-r1.ataque.test.ts` | C-28 | `0e4abf3bc5d92fa0c380805453190703862567930dd74b9e7fcc1809564d181f` | `9f0f965dac2650b722520550386df12a27d39d65c6c4ee2bfdc3279925777334` |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | C-29 | `e008935b107752d203f6423b2f1c9e0f5a4339f0a77154746bf262cecb90351a` | `5ff85c4346a45d04974ced7dc62f0222135baa70fc3e2e64dd58d3568ad38bb3` |
| `backend/test/logs-muro-c-r1.ataque.test.ts` | C-30 | `690e30ed39111c0a074fc159015967cd9f0fdc24d9a340e6a0d7be4b980a9d45` | `1f044c28108fc77f5cdad9056eb758be194c44b40f398bc818f473d79954b95c` |
| `backend/test/logs-muro-c-r2.ataque.test.ts` | C-31 | `0809c60700e26183e7771b4b1a40b05cbf554c2ed7929190cf4d89a52722e551` | `9cdb901292f5a5a5060dc1d5de4ce35b6fdbe5d41b61d345eeb4f870186d3735` |
| `backend/test/api-real.ataque.test.ts` | C-32 | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | `e75114dc84a076b8f0a3471bacdb63175adbb62223dd041039992c2348eee438` |
| `backend/test/gestion-02a-r1.ataque.test.ts` | C-42 | `73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a` | `f12aef58da6e9c1efb134c8667b8c6ee8cde3401c9ff6b444164882f664a225e` |

Los once archivos son LF (`git ls-files --eol`: `i/lf w/lf`), como en `ea718bc`.

### Corrida de los C-n (rojo esperado)

Comando, desde `backend/`: `npx vitest run --reporter=verbose test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts test/gestion-02a-r1.ataque.test.ts test/logs-r2.ataque.test.ts test/logs-03a-r1.ataque.test.ts test/logs-03b-r1.ataque.test.ts test/logs-03c-r1.ataque.test.ts test/logs-cuentas-r1.ataque.test.ts test/logs-muro-c-r1.ataque.test.ts test/logs-muro-c-r2.ataque.test.ts test/api-real.ataque.test.ts`

```
 Test Files  3 failed | 8 passed (11)
      Tests  3 failed | 94 passed (97)
   Start at  08:35:12
   Duration  25.86s (transform 4.84s, setup 388ms, import 16.51s, tests 82.30s, environment 2ms)
```

La primera corrida (08:22:53, sin `--reporter=verbose` y con C-42 antes de mover su comentario) dio lo mismo: `3 failed | 94 passed (97)`, con los mismos tres rojos y el mismo mensaje en cada uno.

- **C-6**, `sesiones-y-cadena.ataque.test.ts`, caso "bajo /api solo existen las rutas de … ADMIN-01a, ADMIN-01b y ADMIN-01e…": `AssertionError: expected [ …(125) ] to deeply equal [ …(138) ]` en `:611`. El diff solo marca como faltantes las 13 entradas nuevas (líneas `-`) y ninguna sobrante (ninguna `+`). `noReconocidas` pasa (vacío). Pasa a verde cuando el programador registre exactamente esas 13.
- **C-8**, `lecturas-fx-r1.ataque.test.ts`, caso "la opción solo se puede activar dentro de adapters/db… veinticuatro lecturas…": `AssertionError: expected [ …(10) ] to deeply equal [ …(12) ]` en `:805`. Solo faltan `"adapters/db/gestion-de-usuarios.ts:2"` y `"adapters/db/movimientos.ts:1"`. Las aserciones anteriores del caso (nadie fuera de `adapters/db` nombra la opción, niveles solo en `cliente.ts`, `index.ts` sin `enTransaccion`, los dos usos de `tareas.ts` en código) pasan. Pasa a verde cuando existan los dos archivos con esos conteos, comentarios incluidos.
- **C-42**, `gestion-02a-r1.ataque.test.ts`, caso "detalle e inscritas del alumno… (el dado de baja, además, con `cuentaDesactivada: true`)": `AssertionError: expected [ 'id', 'nombre' ] to deeply equal [ 'cuentaDesactivada', 'id', 'nombre' ]` en `:743`, que es la aserción de las claves de `b`. Antes pasaron, en este orden: los dos ids (`arrayContaining`), `toHaveLength(2)`, los dos `toBeDefined` y las claves de `a` (`["id", "nombre"]`). Es la razón que dice el "Debe esperar" de §D-R0 (`b` sale sin la clave) y no otra: ni la clave en `a`, ni `false`, ni la clave en inscritas, ni un maestro de menos. Hoy `prohibidas`, correos, "deudor" e inscritas pasan antes y después. El paso 23 lo pone en verde (lo comprobé con la sonda S-16, abajo).
- **C-7:** solo comentario; el caso de C-6 es el único que lo contiene.
- **C-25 a C-32:** los ocho archivos, en verde con el código de hoy: `logs-r2` 5 de 5, `logs-03a-r1` 2 de 2, `logs-03b-r1` 2 de 2, `logs-03c-r1` 2 de 2, `logs-cuentas-r1` 2 de 2, `logs-muro-c-r1` 3 de 3, `logs-muro-c-r2` 3 de 3 y `api-real` 6 de 6. Con la consulta en el log, como hoy, el centinela por camino se reconoce igual.
- Los demás casos de los tres archivos con rojo, en verde: `sesiones-y-cadena` 34 de 35, `lecturas-fx-r1` 23 de 24 y `gestion-02a-r1` 12 de 13. Entre ellos, las vigiladas de la Enmienda 13 en `gestion-02a-r1` (`:269`, `:674-675`, `:681-682` y `:688`) y la de E8-4 en `sesiones-y-cadena:769` (un solo admin).
- **Contención en esa salida** (informativo; PA-07 aplica a la corrida completa): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0, `"code":"P2028"` 0. El `"Error no controlado"` que provoca a propósito `logs-r2` (el `500` de `GET /api/me` con el uuid raro) vive en el log del proceso hijo, que la prueba captura y no imprime.

### Vigiladas de §D-R0 → 01e (línea base con el código de hoy)

Comando, desde `backend/`: `npx vitest run test/clases-r1.ataque.test.ts test/clases.integracion.test.ts test/admin-muro-02b-r1.ataque.test.ts test/alumnos-b-r1.ataque.test.ts test/alumnos.integracion.test.ts test/clases-archivadas-r1.ataque.test.ts test/gestion-clases.integracion.test.ts test/temas-01a-r1.ataque.test.ts test/temas-01a-r3.ataque.test.ts test/clases-archivadas-matriz.integracion.test.ts test/gestion-clases-autorizacion.integracion.test.ts test/autorizacion-cuentas.integracion.test.ts test/guarda-todas-las-rutas.integracion.test.ts test/recursos-autorizacion.integracion.test.ts test/cuentas-r2.ataque.test.ts test/arquitectura-cuentas-r1.ataque.test.ts test/lecturas-fx-r2.ataque.test.ts test/admin-unico.integracion.test.ts test/admin-unico.ataque.test.ts test/cuentas-r1.ataque.test.ts test/cuentas-03a-r1.ataque.test.ts test/enlaces-03b-r1.ataque.test.ts test/invitacion-masiva-03c-r1.ataque.test.ts test/logs-02a-r1.ataque.test.ts test/logs-02b-r1.ataque.test.ts test/logs-archivos-d-r1.ataque.test.ts test/logs-archivos-d-r3.ataque.test.ts src/config/logger.ataque.test.ts test/worker-r1.ataque.test.ts test/worker-r2.ataque.test.ts test/servicio-ocupado.integracion.test.ts`

```
 Test Files  31 passed (31)
      Tests  605 passed (605)
   Start at  08:27:35
   Duration  42.65s (transform 7.91s, setup 979ms, import 64.60s, tests 198.59s, environment 6ms)
```

Son las vigiladas de §D-R0 → 01e por grupo:
- **Enmienda 1 (N-03) y Enmienda 13 (S-16):** `clases-r1.ataque` (`:593-641`), `clases.integracion` (`:178-191`), `admin-muro-02b-r1.ataque` (`:740-741`, `:779`, `:812`), `alumnos-b-r1.ataque` (`:459-460`), `alumnos.integracion` (`:135-140`), `clases-archivadas-r1.ataque` (`:848-856`) y `gestion-clases.integracion` (`:429-435`, `:484-488`). Las de `gestion-02a-r1` corrieron con los C-n.
- **Enmienda 4:** `alumnos-b-r1.ataque` (`:1156` y `:1149-1162`), `temas-01a-r1.ataque` (`:985-997`), `temas-01a-r3.ataque` (`:426-428`).
- **Enmienda 7 (E7-3):** `clases-archivadas-matriz.integracion` (`:222-233`), `gestion-clases-autorizacion.integracion` (`:395-425`), `autorizacion-cuentas.integracion` (`:40-53`), `guarda-todas-las-rutas.integracion` (`:141`), `recursos-autorizacion.integracion` (`:580-598`), `clases-archivadas-r1.ataque` (`:622-628`) y `cuentas-r2.ataque` (`:310-319`).
- **Generales:** `arquitectura-cuentas-r1.ataque` (`:100-124`; ver OA-01e-1 y O-01e-1), `lecturas-fx-r2.ataque` (`:967`).
- **Enmienda 8 (E8-4), un solo admin:** `admin-unico.integracion` (`:50`), `admin-unico.ataque` (`:32`, `:56`), `cuentas-r1.ataque` (`:592`), `cuentas-03a-r1.ataque` (`:496`), `enlaces-03b-r1.ataque` (`:234`) e `invitacion-masiva-03c-r1.ataque` (`:297`, `:354`).
- **M-09:** `logs-02a-r1`, `logs-02b-r1`, `logs-archivos-d-r1`, `logs-archivos-d-r3`, `src/config/logger.ataque` (`:60-82`), `worker-r1`, `worker-r2` y `servicio-ocupado.integracion` (`:274-…`). Las de `logs-03b-r1:259-261`, `logs-03c-r1:228-229`, `logs-muro-c-r1:230` y `logs-muro-c-r2:243` están en los archivos de C-27, C-28, C-30 y C-31 y corrieron con los C-n.

**Contención en esa salida** (informativo): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0, `"code":"P2028"` 3. Los tres son los deterministas de `servicio-ocupado.integracion.test.ts`, todos `"msg":"Error controlado del servidor"`, `codigo` `SERVICIO_OCUPADO` y cierre `503`. Los atribuí por proceso (`pid` 7836) y `requestId`: el "incoming request" anterior y el "request completed" siguiente del mismo `pid` y `requestId`, más la pila de cada uno:
- `req-1`: `POST /api/auth/cambiar-contrasena` (pila en `handlers/auth/cuentas.ts:202`; `tx.sesion.findFirst()` de `adapters/db/usuarios.ts:293`, `timeTaken` 5665 ms);
- `req-3`: `POST /api/auth/refrescar` (pila en `handlers/auth/index.ts:180`; `tx.sesion.updateMany()` de `adapters/db/sesiones.ts:72`, 5664 ms);
- `req-5`: `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` (pila en `encolar` de `adapters/queue/index.ts:63`, 5641 ms).

Es el control positivo de PA-07, completo, en una corrida acotada. El conteo de PA-07 que vale es el de la corrida completa del manager.

### Sonda M-09 (en memoria): el serializador de §D-7.11 con C-25 a C-32 y las vigiladas del log

El grep no alcanza para saber si C-25 a C-32 siguen en verde cuando el log pierda la consulta. Por eso apliqué el remedio de §D-7.11 **en memoria**: un `serializers.req` con los mismos campos que el de Fastify por omisión (`method`, `url` cortada en el primer `?`, `version`, `host`, `remoteAddress`, `remotePort`), insertado antes de `redact` en el texto de `src/config/logger.ts`. Llega por dos caminos:
- un complemento de Vite en una configuración de Vitest fuera del repositorio, para las pruebas que construyen la app en el mismo proceso (`logs-02a-r1`, `logs-02b-r1`, `logs-archivos-d-*`, `logger.ataque`, `worker-r*`);
- un gancho de carga de Node (`NODE_OPTIONS=--import=…`), para las APIs reales que arrancan como procesos hijos (`src/server.ts` con `tsx`), que heredan `process.env`.

**Ningún archivo del repositorio cambia.** Los archivos son `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\sonda-m09\serializador.mjs`, `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\sonda-m09\ganchos.mjs`, `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\sonda-m09\registro.mjs` y `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\sonda-m09\vitest.sonda-m09.config.mjs`.

Comando, desde `backend/`: `NODE_OPTIONS="--import=file:///<scratchpad>/sonda-m09/registro.mjs" npx vitest run --config <scratchpad>/sonda-m09/vitest.sonda-m09.config.mjs --reporter=verbose` con los ocho archivos de C-25 a C-32, `logs-02a-r1`, `logs-02b-r1`, `logs-archivos-d-r1`, `logs-archivos-d-r3`, `src/config/logger.ataque`, `worker-r1` y `worker-r2`.

```
 Test Files  15 passed (15)
      Tests  48 passed (48)
   Start at  08:32:32
   Duration  26.75s (transform 4.65s, setup 609ms, import 28.61s, tests 91.41s, environment 4ms)
```

- **La sonda sí actuó.** Su archivo de marcas registra `aplicada` 9 veces por el gancho de Node (las ocho APIs de los logs y el arranque en `production` de `api-real`) y 1 por Vite (el módulo transformado se comparte). También registra 6 URL cortadas, todas `GET` con consulta: `/api/admin/maestros/candidatos`, `/api/clases/<uuid>/alumnos/candidatos` y `/api/admin/clases` (en proceso, `logs-02a-r1`), `/api/admin/enlaces-registro` (un hijo) y `/api/clases/<uuid>/publicaciones` y `…/comentarios` (otro hijo). El serializador estaba en efecto en los dos caminos.
- **Resultado:** los ocho de C-25 a C-32 siguen en verde sin la consulta. `logs-02a-r1:200-211` sigue encontrando `/api/admin/maestros/candidatos`. `logger.ataque:60-82` (el objeto `{ req: { body } }`) no lanza y no deja ningún secreto. Los recuentos de `logs-muro-c-r1:230` y `logs-muro-c-r2:243` no cambian. Es lo que predice §D-R0 → 01e.
- **Por qué hacía falta C-25 a C-32 (razonado, sin corrida):** con la consulta cortada, el centinela viejo `/api/salud?centinela=<valor>` queda en el log como `/api/salud`. `req.url === urlCentinela` ya no lo encuentra, y `faltanteEnElLog` devuelve "falta el centinela" en los ocho.
- Contención en esa salida: los seis términos, en 0.

### Sonda S-16 (en memoria): C-42 y el grep de hermanos de la Enmienda 13

Apliqué S-16 (§D-7.10) en memoria, con el mismo mecanismo (Vite y gancho de Node), sobre tres archivos:
- `adapters/db/clases.ts`: `SELECT_MAESTROS_DE_CLASE` suma `activo`, y `maestrosDeFilas` quita `activo` y agrega `cuentaDesactivada: true` solo si es `false`;
- `adapters/db/inscripciones.ts`: solo `listarPersonas`, con el mismo mapeo;
- `shared/dist/clases.js`: `maestroDeClaseSchema` gana `cuentaDesactivada: z.literal(true).optional()`, y la lista `maestros` de "Personas" usa `personaConCorreoSchema.extend(…)`.

Los archivos son `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\sonda-s16\transformar.mjs`, `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\sonda-s16\ganchos.mjs`, `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\sonda-s16\registro.mjs` y `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\sonda-s16\vitest.sonda-s16.config.mjs`.

Comando, desde `backend/`: `NODE_OPTIONS="--import=file:///<scratchpad>/sonda-s16/registro.mjs" npx vitest run --config <scratchpad>/sonda-s16/vitest.sonda-s16.config.mjs` con los 18 archivos del patrón 1 de la Enmienda 13 (`gestion-02a-r1`, `duplicado-de-clase.integracion`, `gestion-clases.integracion`, `clases-archivadas.integracion`, `borrado-duplicado-r1`, `lecturas-fx-r1`, `clases-archivadas-r1`, `lecturas-consistentes.integracion`, `entregas-01b-r1`, `calificaciones.integracion`, `admin-muro-02b-r1`, `muro-admin.integracion`, `concurrencia-02a-r1`, `clases-r1`, `autoria-02b-r1`, `alumnos.integracion`, `alumnos-b-r1` y `cuentas-03a-r1`), más `clases.integracion`.

```
 Test Files  1 failed | 18 passed (19)
      Tests  1 failed | 335 passed (336)
   Start at  08:37:24
   Duration  43.40s (transform 12.50s, setup 1.14s, import 75.35s, tests 237.57s, environment 5ms)
```

- La sonda aplicó los tres cambios por los dos caminos (3 marcas de Vite y 3 de Node).
- **C-42 pasa a verde** con S-16. El único rojo es C-8 (`expected [ …(10) ] to deeply equal [ …(12) ]`), que no depende de S-16: los dos archivos nuevos todavía no existen.
- Ninguna otra prueba de los 19 archivos cae. Eso confirma el resultado del grep de la Enmienda 13 y de la verificación del manager (el único choque es C-42), incluidas las vigiladas de `admin-muro-02b-r1`, `alumnos-b-r1`, `alumnos.integracion`, `clases-archivadas-r1` y `gestion-clases.integracion`, y `cuentas-03a-r1`, el hueco N-1 que señaló el manager.
- **Hallazgo de la sonda, para el programador (O-01e-5):** sin el cambio de `shared/dist/clases.js`, C-42 sigue en rojo aunque el adaptador ya marque al maestro. `maestroDeClaseSchema` es `z.object` (descarta claves desconocidas), y el handler del detalle responde con `claseRespuestaSchema.parse(…)` (`handlers/clases/clases.ts:133`). Además, el backend consume `@campus/shared` por `./dist` (`shared/package.json`, `exports`), no por `src`.
- Contención en esa salida: los seis términos, en 0.

### Barrido del resto de las `*.ataque` y de las lecturas del log

- **Quién lee la URL del log:** repetí el grep de M-09 (`req?.url`, `req.url`, `"url"` e `"incoming request"` en `backend/test` y `backend/src`). Además de los ocho de C-25 a C-32 y de `logs-02a-r1`, los demás leen `r.raw.req.url` de la respuesta de `inject` (`admin-muro-02b-r1:272-276`, `tareas-01b-r1:668-671`), tipos de las pruebas de autorización (`"url"` de `PreparadoRuta`) o la clave `url` de una descarga (`archivos-d-r1:847`, `archivos-autorizacion:318`). Ninguno lee el log. `servicio-ocupado:274` cuenta niveles. La lista de C-25 a C-32 está completa.
- **Quién arranca la API real:** `api-real`, `arranque-r1` y los siete `logs-*` de C-25 a C-31. `arranque-r1` no usa centinela.
- **Rutas nuevas:** solo `sesiones-y-cadena` (C-6) y las de `printRoutes` ya vigiladas (`clases-archivadas-matriz` ADM-1A09 (a) y `clases-archivadas-r1` ADM-T1A09) enumeran rutas. Ninguna `*.ataque` pide `GET /api/admin/usuarios`, `…/usuarios/:id`, `…/nombre`, `…/activo`, `/api/admin/alumnos…`, `/api/admin/resumen` ni `/api/admin/movimientos-inscripcion`. Las que hay bajo `/api/admin/usuarios/` son de `buscar`, `correo`, `restablecer-contrasena` y `borrar` (`cuentas-r2:310-319`, que sigue esperando `404`). `cuentas-r2:328-339` (`PUT …/:id/correo` con un `:id` de 5 KB → `414`) no cambia con `GET /api/admin/usuarios/:id`.
- **Revisiones estáticas que leen `backend/src`** (18 archivos con `readFileSync` o `readdirSync`): las que miran archivos de 01e son `arquitectura-cuentas-r1` (OA-01e-1, O-01e-1), `lecturas-fx-r1:758-834` (C-8, O-01e-2) y `:1129-1155` (O-01e-3), `lecturas-fx-r2:972` (O-01e-7), `alumnos-b-r1:1149-1162` (O-01e-8), `hilo-01c-r1:705-753`, `temas-01a-r1:985-997` y `temas-01a-r3:426-428` (O-01e-9). Las migraciones: `migracion-01a-r1` y `migracion-clases03a-r1` aplican solo las anteriores a la suya, y `sexto-paso-02a-r1:163` busca solo `_clases_administradas`. La migración de 01e no las alcanza.
- **Claves de los maestros y `/activo/i`:** lo verificó la sonda S-16 (arriba). Las expresiones `/activo/i` (`cuentas-03a-r1:556`, `sesiones-y-cadena:303`) no reconocen `cuentaDesactivada`.

### Observaciones para el arquitecto (no bloquean por sí solas)

- **OA-01e-1. Una vigilada que el plan describe a medias: `arquitectura-cuentas-r1.ataque.test.ts:100-124`.** §D-R0 → 01e la vigila como "ningún archivo nuevo usa `console.`", pero el mismo caso exige también que `handlers/admin.ts` y `adapters/db/tokens-cuenta.ts`, entre otros, no nombren `estadoPago` en su código (sin comentarios; `/estadoPago/`, que también reconoce `estadoPagoLoteSchema` o `estadoPagoSchema`). En 01e, `PUT /admin/alumnos/estado-pago` (§D-8) recibe `{ alumnoIds, estadoPago }`, y `GET /admin/usuarios` filtra por `estadoPago` (§D-7.1). Si esas rutas viven en `handlers/admin.ts`, la vigilada cae y es PARADA del programador. El plan ya ofrece la salida: `handlers/admin/usuarios.ts`, nuevo, registrado por el mismo plugin (§D-R0 → 01e, "si hace falta"; "Cambios por capa", "si `admin.ts` pasa de 400 líneas", y hoy tiene 283). Con esa ruta de archivo, el caso sigue en verde, porque `"handlers/admin/usuarios.ts".startsWith("handlers/admin.ts")` es falso. Conviene que el orquestador se lo diga al programador antes del paso 24: las rutas de usuarios, estado de pago y acceso van en `handlers/admin/usuarios.ts`, y `admin.ts` solo lo registra, sin importar nada cuyo nombre contenga `estadoPago`. Si el arquitecto prefiere `admin.ts`, hace falta un C-n, que debilitaría lo que protege el caso. No escribí ningún C-n para esto.

### Observaciones para el programador (trampas; no son hallazgos)

**O-01e-1 (`arquitectura-cuentas-r1`, vigilada; ver OA-01e-1).**
- `handlers/admin.ts` y `adapters/db/tokens-cuenta.ts` (M-18) no nombran `estadoPago` en código ni usan `console.`. Pon las rutas de §D-7 y §D-8 en `handlers/admin/usuarios.ts`.
- En el mismo archivo: ningún handler usa `obtenerDb(` ni importa `adapters/db/cliente`. `$queryRawUnsafe` aparece solo en `adapters/db/cliente.ts`, así que la lista de usuarios (SQL crudo, §D-7.1) va con `$queryRaw` de plantilla y los filtros opcionales con `Prisma.sql`, `Prisma.join` o `Prisma.empty`, nunca con `$queryRawUnsafe`. Ningún handler declara `: PoliticaIntentos =`.

**O-01e-2 (C-8, `lecturas-fx-r1:758-834`). El conteo es del texto, comentarios incluidos.**
- `adapters/db/gestion-de-usuarios.ts`: exactamente 2 `instantaneaUnica: true` (`listarUsuarios` y `leerResumenAdmin`). `adapters/db/movimientos.ts`: exactamente 1. Si usas otro número (por ejemplo, la ficha también en la instantánea), decláralo y lo ajusto con el mismo C-8.
- `clases.ts` sigue en 4: el `enTransaccion` de `crearClaseAdministrada` (N-03) no lleva la opción, y ningún comentario nuevo escribe `instantaneaUnica: true`. `maestros-de-clase.ts`, `tokens-cuenta.ts` e `inscripciones.ts` siguen en 0.
- Fuera de `adapters/db/` nada nombra `enTransaccion`, `instantaneaUnica`, `isolationLevel` ni `RepeatableRead`, ni en un comentario: `core/usuarios/`, `handlers/admin*` y `config/logger.ts`.
- `isolationLevel`, `RepeatableRead`, `REPEATABLE READ` y `Serializable` solo en `cliente.ts`. Un comentario como "en REPEATABLE READ" en `gestion-de-usuarios.ts` o en `movimientos.ts` lo rompe. `adapters/db/index.ts` no nombra `enTransaccion`.

**O-01e-3 (`lecturas-fx-r1:1129-1155`, cuerpos de `clases.ts`).** El caso corta el cuerpo de `leerClase`, `listarClasesImpartidas`, `listarClasesInscritas` y `listarClasesAdmin` desde `export const <nombre> =` hasta el siguiente `\nexport `, sin quitar comentarios. Una función privada nueva colocada entre una de ellas y el siguiente `export` cuenta como parte de su cuerpo: si escribe (`.create(`, `.update(`, `$executeRaw`…) o bloquea (`FOR UPDATE`, `FOR SHARE`, `FOR NO KEY`, también en un comentario), el caso cae. Hoy `crearClaseAdministrada` (`:149`) y `conReintentoDeCodigo` (`:127`) están antes de esas cuatro. N-03 y N-32 deben dejar sus ayudas nuevas fuera de esos tramos (`:219-235`, `:280-331`, `:339-415` y `:445-522`).

**O-01e-4 (C-6, inventario exacto).**
- Son las 13 entradas de la tabla, con el parámetro `:id` (no `:usuarioId` ni `:alumnoId`) y `estado-pago` literal.
- Cualquier otra ruta o método lo pone en rojo, por ejemplo un `GET` de `/api/admin/alumnos`, un `PATCH`, `/borrar` o una variante con otra forma.
- El `HEAD` de cada `GET` lo agrega Fastify; ningún `PUT` ni `POST` lo tiene.
- `noReconocidas` debe quedar vacío, aquí y en ADM-1A09 (a) y ADM-T1A09. `printRoutes` mezcla el estático `estado-pago` y el paramétrico `:id` bajo `/api/admin/alumnos`. El análisis por sangría ya reconstruye casos así, como `/temas/orden` y `/temas/:temaId`, pero si una línea sale con otra forma, cae.

**O-01e-5 (C-42 y S-16).**
- C-42 queda en verde solo si cambian a la vez el adaptador y `shared/`. `maestroDeClaseSchema` es `z.object` y descarta claves desconocidas, y `GET /clases/:claseId` responde con `claseRespuestaSchema.parse(…)` (`handlers/clases/clases.ts:133`). Además, el backend lee `@campus/shared` de `shared/dist` (`exports` de `shared/package.json`). Corre `npm run build` en `shared/` antes de la suite del backend; si no, C-42 sigue en rojo con `expected [ 'id', 'nombre' ]` aunque el adaptador esté bien (comprobado con la sonda S-16).
- La marca va solo en el inactivo y siempre `true`: nunca `cuentaDesactivada: false` en el activo, porque `a` exige `["id", "nombre"]` exacto. El campo crudo `activo` no sale en ninguna respuesta (`prohibidas` lo busca con `clavesDe` en todo el JSON).
- `listarClasesInscritas` no cambia: inscritas sigue con `["nombre"]`.
- `maestrosDeFilas` también la usan `duplicado-de-clase.ts:207`, con su propio `select`, y `maestros-de-clase.ts:48-50`, con `SELECT_MAESTROS_DE_CLASE`. Si su entrada pasa a exigir `activo`, el `select` del duplicado debe pedirlo.

**O-01e-6 (C-25 a C-32 y M-09, el serializador).**
- `serializers.req` corta solo en el primer `?` y conserva el camino completo, ids incluidos, y `method`. `lineasDe` de `logs-r2` filtra por método y URL, y los ocho buscan su centinela con `req.url === <camino>`.
- No cambia los mensajes `"incoming request"` ni `"request completed"`, no apaga el registro de peticiones y tolera un objeto sin `url` ni `method` sin lanzar y sin devolver `body` (`logger.ataque:60-82`).
- Con el serializador de §D-7.11 en memoria, los 15 archivos del log dan 48 de 48 (sonda M-09).
- Las pruebas de ADM-1E22 van en archivos nuevos (§D-R0).

**O-01e-7 (`lecturas-fx-r2:972`, O-4; vigilada `:967`).**
- La baja revoca sesiones y `tokens_cuenta` con `UPDATE … revocado_en`, nunca con `.delete(` ni `.deleteMany(`: el conjunto de modelos borrados es exacto.
- `/DELETE\s+FROM|TRUNCATE/i` se aplica al texto completo de cada `.ts` de `backend/src`, comentarios incluidos.

**O-01e-8 (`alumnos-b-r1:1149-1162`).**
- `inscripciones.ts` sigue con exactamente dos `movimientoInscripcion.create`, sin `$queryRaw` ni `$executeRaw` y sin `orderBy` con `creadoEn` en la misma línea. `listarPersonas` lee `activo` con Prisma.
- La lectura de movimientos vive en `movimientos.ts`.
- `handlers/clases/alumnos.ts` no se toca (no puede contener «movimiento»).

**O-01e-9 (`hilo-01c-r1:705-753`, `temas-01a-r1:985-997`, `temas-01a-r3:426-428`).**
- `FOR KEY SHARE` sigue solo en `entregas.ts` y `referencias.ts` (en código). Los bloqueos de 01e son `FOR NO KEY UPDATE` y `FOR SHARE`.
- `adapters/db` no importa `adapters/queue` (ni `../queue`).
- `bloquearClase` sigue definida solo en `bloqueo-clase.ts`: un bloqueo nuevo lleva otro nombre.
- `$queryRawUnsafe` y `$executeRawUnsafe`, solo en `cliente.ts`.

**O-01e-10 (recordatorios del encargo, no son míos).**
- **N-18:** en las pruebas nuevas de 01e (baja de maestro, S-16, ADM-1E*), ninguna clase queda confirmada con 0 o con 3 maestros.
- **E8-4:** ADM-1E02, ADM-1E10 y ADM-1E11, con filtro propio, misma instantánea o propiedades de la respuesta. Nota del manager: los cambios de la misma instantánea, con Prisma directo sobre `tx`.
- **Lista cerrada:** `movimientos-inscripcion.integracion:243-281` y E6 de `bloqueo-usuario.integracion` son del programador. No los toqué.

### Para la ronda 1 de 01e (del manager, `revision.md`)
- **O-R1-1** (una clase archivada con 0 maestros daría `500` por `min(1)` en `GET /clases/anteriores` y en `conMaestroPrincipal`) y **N-18** son para mi ronda 1: 01e es la subentrega que da de baja cuentas. En la ronda 0 no hay código que atacar. Los anoto aquí para no perderlos.
- **"Verificación de la Enmienda 13"** (`revision.md:5624-5696`): el manager acepta del diff de `gestion-02a-r1.ataque` "solo el título de `:694` y el bloque que reemplaza `:728-729`". El diff queda en dos hunks: `@@ -694 +694` (título) y `@@ -729 +729,16` (`:729` reemplazada por el bloque, con su comentario). `:728` no cambia. Su N-1 (el hueco de `desactivarUsuarioDePrueba`) queda cubierto por la sonda S-16: `cuentas-03a-r1` sigue en verde con S-16.

### V-01: SHA-256 de todas las `*.ataque` (base para el programador de 01e)

Son 267 archivos: 101 del backend y 166 del frontend, todos rastreados (`git ls-files`; ninguno sin rastrear). Es el mismo conjunto que en `ea718bc` (`git ls-tree -r ea718bc`, 267).

- **Comprobación de entrada:** antes de tocar nada, los once archivos de los C-n coincidían con `git show ea718bc:<ruta>`.
- **Después de los C-n:** comparé las 267, una por una, contra `git show ea718bc:<ruta>`. Solo cambian las once de la tabla "SHA-256 antes y después"; las otras 256 son idénticas a `ea718bc`.
- **Formato:** `<hash>  <ruta>` (dos espacios), en el orden de `git ls-files`.
- **Lista:** `sha256sum` de la lista de abajo en ese formato, con salto de línea final: `b17af275a66e713514190bf5d07c1ed50811b2f059fecc6548c62992cb5ca8dc` (267 líneas; comprobada con `sha256sum -c`).

```
65c1d9d9e6cea8ba8cf98bc522c6ba6d7122376d0201ccf3fc3048d24b60543f  backend/src/adapters/storage/objetos-r1.ataque.test.ts
935a721160f978e35d45d2c9392fe8cb169fae32f43b9df583bda46215707e22  backend/src/adapters/storage/objetos-r2.ataque.test.ts
bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671  backend/src/config/correo.ataque.test.ts
dcb78d222544e8dc4fbece59468f555b04abe971b70016e9bb17fcae3e958580  backend/src/config/env.ataque.test.ts
71e7f049447d2d1ecedd897c55ea0b6d31221753f0a7e7473c7ac6e8667f0a95  backend/src/config/logger.ataque.test.ts
91f620c1a27778eebc2bed5eec1bc9b0e3fe1199b32ed00f9dd910011d6a1805  backend/src/core/clases/codigo-r1.ataque.test.ts
262691f5786ad63b2393d0ba5ff97538f6dacf43343bed019ad23c12a07d8686  backend/src/core/clases/codigo-r2.ataque.test.ts
e769cbfcc3a83a64b51c6437f80684640a7c928ad6b8c5c1671fdff005d7b734  backend/src/workers/ritmo-03c-r1.ataque.test.ts
294be1af0bf69d6c05f54e2f0d8e587c78a5527d0b64d1a224c058e31ce013d0  backend/test/admin-muro-02b-r1.ataque.test.ts
388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85  backend/test/admin-unico.ataque.test.ts
d2cc28b62bf988ae14ba975a9bc8d534aec0eebce30da93d7ded9a26026b0857  backend/test/alumnos-b-r1.ataque.test.ts
00346d471355abc7971b921649e7192b8987fe27912c00cb7e41aef2065369e9  backend/test/alumnos-b-r2.ataque.test.ts
fc11ab4b914d4a88612953f82db354e2b9cea9bef86e24321ef7e031f3ac3837  backend/test/alumnos-b-r3.ataque.test.ts
e75114dc84a076b8f0a3471bacdb63175adbb62223dd041039992c2348eee438  backend/test/api-real.ataque.test.ts
f76ce52002e295f2bda6e7a7a7f796415e08013e6d4c1fbe2c9c686671fe8252  backend/test/archivos-d-r1.ataque.test.ts
1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9  backend/test/archivos-d-r2.ataque.test.ts
42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612  backend/test/arquitectura-cuentas-r1.ataque.test.ts
38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716  backend/test/arranque-r1.ataque.test.ts
2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c  backend/test/auth-login.ataque.test.ts
73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e  backend/test/auth-registro.ataque.test.ts
6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713  backend/test/autoria-02b-r1.ataque.test.ts
3520057d0f1a27739eaa701aacd9c18d5c0728fc6a3d55374f43f63a5e6f5336  backend/test/borrado-duplicado-r1.ataque.test.ts
b8fc0db0ea3ec7ff2b89cd9e345c57a9b4ef73afe16fb1aa3e6fdf73c27c16a1  backend/test/borrado-duplicado-r2.ataque.test.ts
5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9  backend/test/calificaciones-01a-r1.ataque.test.ts
afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc  backend/test/calificaciones-01a-r2.ataque.test.ts
dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416  backend/test/calificaciones-carreras-01a-r1.ataque.test.ts
b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07  backend/test/calificaciones-estatico-01a-r1.ataque.test.ts
29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869  backend/test/calificaciones-estatico-01b-r1.ataque.test.ts
6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e  backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts
6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db  backend/test/categorias-01a-r1.ataque.test.ts
f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2  backend/test/clases-archivadas-r1.ataque.test.ts
62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933  backend/test/clases-archivadas-r2.ataque.test.ts
95bba9bac44366ad5a361e93dd2f278cb0a1cc889fa479049acc7b45a9a5e71b  backend/test/clases-r1.ataque.test.ts
a87817d56c236c0ba3597214cac23b10483bbc28ae44800c592ed5ce2ef97f38  backend/test/clases-r2.ataque.test.ts
72de7d8af3d3f772abc19db065f6e418f6eb76ce78d87fe6ebb51335fc99825a  backend/test/clases-r3.ataque.test.ts
be97c4e48ac9551bed1d01552e90ab8cdf085cf928ae6c8c3d81809e35f7ce62  backend/test/clases-r4.ataque.test.ts
000ec9008c73d25121c82a46f5ea0f67e6c8c387cb04e361ef82812b57956098  backend/test/concurrencia-02a-r1.ataque.test.ts
530546b4d70a2b9ad36f98f37e2af45480e81a1101ee3516d15426f78350bf82  backend/test/cuentas-03a-r1.ataque.test.ts
6303ddc170545f616c66773c3f5475cb3be1fea9347d8059354d6ade8d676c16  backend/test/cuentas-r1.ataque.test.ts
3a4e81c111b8eeb7df065804aa85062fa3fc607f0147149b71ac21c14e7818d9  backend/test/cuentas-r2.ataque.test.ts
f54f79f7b2a83e95fe440053ccaf15cb3ebb01ce5dfd4c6655e22159a5fd7e6b  backend/test/cuentas-r3.ataque.test.ts
a2f9bff596330a7d55d1ca9d47197fc831eb132f52c759610e2d667895c3332f  backend/test/cuerpos-02a-r2.ataque.test.ts
4ea45eaa95c5ea2e1ec91e04d2bba32689a30bd341ade16625b28aabdb96d6d9  backend/test/dudas-clases03b-r1.ataque.test.ts
d7a9da854ce8ab8ad8d2437db2e8c2a642a777ea3261a6b038da28be022df848  backend/test/enlaces-03b-r1.ataque.test.ts
dc1b7ee7ea58966f5db33ccb4581885a9669dea2263954ae46d17a83e1ef6eaf  backend/test/enlaces-03b-r2.ataque.test.ts
b051b1986496e35e3e306c4c6bc306a763542bca4b350574d0c02e2c484deb35  backend/test/enlaces-ch-r2.ataque.test.ts
d28cc4de621a680e6b54b2bff889700300d558ec7849717584518d2f03ec8cae  backend/test/entorno-ch-r1.ataque.test.ts
47b02c6d3916713bf9236a619fdb59a641d2e805f1f0b7e9b2c161fe719ddc3a  backend/test/entregas-01b-r1.ataque.test.ts
5baaf6f8fb76320620ed4a84efaca2b2d473460f62360e0d48738b97a0ac584a  backend/test/entregas-01b-r2.ataque.test.ts
885668a621af11f17b4ac706db705aef33231b7773e4783147d21b318bdd0f9a  backend/test/exportacion-02a-r1.ataque.test.ts
ba1ac9b17cc9bf747522bd4ec8b87df436008482e643b18eea8e9a8c041c59b3  backend/test/formada-ch-r1.ataque.test.ts
f12aef58da6e9c1efb134c8667b8c6ee8cde3401c9ff6b444164882f664a225e  backend/test/gestion-02a-r1.ataque.test.ts
e4e9365ea010f3f670b6c1194d1a592e95db43bff0496d4ea1646fc5225ca8b4  backend/test/gradebook-01b-r1.ataque.test.ts
5f4133f949d2f337a8f63b75cf82cb77114db7812d67c1960105f5000c31a326  backend/test/guarda-ch-r1.ataque.test.ts
7a7dac6d87edf81059fcff9c07471aaf49d690ec159be4b9fd4aa32b0909a215  backend/test/guarda-ch-r2.ataque.test.ts
610ee44e5d0bcea46eb4e3645f9adf1998a76947a25af7e3f8248ea3a633df79  backend/test/guarda-ch-r3.ataque.test.ts
e5d149f3ac52b726e1fe08908249706341330f88eaa6674b9a9ac67b98b1e864  backend/test/guarda-clase-r1.ataque.test.ts
c979d2c9c420a2177fa6ebddb78eb2ce84d5f043b94270f690916a6fc75d6f8f  backend/test/guarda-clase-r2.ataque.test.ts
20982e2b98f1b162146a211923f3d5ec19d4e170c4aa3a5bfc6f82c3b6173aad  backend/test/guarda-r2.ataque.test.ts
2649f3d357dcb806361ac101c57fcb504b9c798b631048f0b3e200f63da7dc30  backend/test/hilo-01c-r1.ataque.test.ts
2d2216ee9db290b318825a6f73c346d4767cacc12d95f5ca76457a78b63fedc3  backend/test/instantanea-01b-r1.ataque.test.ts
a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a  backend/test/intentos-r2.ataque.test.ts
2619b44eea3370494c95ac128fcfd9e3ffc20d1581a19f549bf371f603a11d7d  backend/test/invitacion-flujo-03a-r2.ataque.test.ts
704155928183aec193ae7e157b86b3e9361d2b63c7a47be1ed859605fab4ffa6  backend/test/invitacion-masiva-03c-r1.ataque.test.ts
dd9b7454e8786bf0b833d265900ccaecf595808cebc8e9a77c9aef15298a1038  backend/test/invitacion-masiva-03c-r2.ataque.test.ts
e3e7d53e2cec2d70e5321d2452939a5e9d71dbe5421b1e6856beb3c8e1bf4e56  backend/test/lecturas-fx-r1.ataque.test.ts
b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea  backend/test/lecturas-fx-r2.ataque.test.ts
f9f9ec59ec8d1a5ccb180522798140c45604440f48edcd68a3e02863d90ae347  backend/test/logs-02a-r1.ataque.test.ts
a2006c163d9e6cd3e4a2a773d1501826daf3c8e7bb184d205bfc6442318fb59c  backend/test/logs-02b-r1.ataque.test.ts
01ad4e952282047f4826d6d86fc21fd464143752c8d8901b4063607930d9c1d5  backend/test/logs-03a-r1.ataque.test.ts
3a626786bdb37eb05744b50c9c2c03b4037bf947991a9905f015ca04560464a0  backend/test/logs-03b-r1.ataque.test.ts
9f0f965dac2650b722520550386df12a27d39d65c6c4ee2bfdc3279925777334  backend/test/logs-03c-r1.ataque.test.ts
1e775a19682f3a5995d7c035bcc810a36bf50c22045b6ffbfc5a98b821255db0  backend/test/logs-archivos-d-r1.ataque.test.ts
e9ce866d511e3ee6029015b74e20b4d342a60be99b3aac97e86f00283a3c77f1  backend/test/logs-archivos-d-r3.ataque.test.ts
5ff85c4346a45d04974ced7dc62f0222135baa70fc3e2e64dd58d3568ad38bb3  backend/test/logs-cuentas-r1.ataque.test.ts
1f044c28108fc77f5cdad9056eb758be194c44b40f398bc818f473d79954b95c  backend/test/logs-muro-c-r1.ataque.test.ts
9cdb901292f5a5a5060dc1d5de4ce35b6fdbe5d41b61d345eeb4f870186d3735  backend/test/logs-muro-c-r2.ataque.test.ts
a2507bb8a5f031143a08e9570c1299f7fa1effcf54b006358da2b4a99dc21ec8  backend/test/logs-r2.ataque.test.ts
d6b9adaf1c14a61fe369f510774ef702cfa20f28f3cb19b0eb7357440dcb0783  backend/test/migracion-01a-r1.ataque.test.ts
2afd58e1ead0a293aa7bd58c639f3e5126d153a418f9a26450228468e12b2bed  backend/test/migracion-clases03a-r1.ataque.test.ts
bc6d49f9fc1f5eb20e305945fef57caeebeb108bff5d5cf4ba10b8040687d69c  backend/test/mis-calificaciones-01b-r1.ataque.test.ts
d23bf1312777bdc000810e403a5b4d99c9c0e12998e4cc11be5ef5a2253f6935  backend/test/muro-c-r1.ataque.test.ts
7825cfc9b484df740fa0e9562a195d1bbcaf4caf72ea55fa847b5394ab96c125  backend/test/muro-c-r2.ataque.test.ts
8b733b86fc6d54ece008389a59793fae4ec4a65146eb37215e900e50a5337d46  backend/test/nombres-guarda-r3.ataque.test.ts
3fd2583a4de7cd432b2e09a5130c23d6a59fa475e5e0aa69f23739351acbf9cf  backend/test/nombres-ids-01a-r2.ataque.test.ts
00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb  backend/test/nombres-tokens-r2.ataque.test.ts
80b5a848f69b429e7dadec86c07bec1d3e3eed8a042efba41ce912ded39e7bab  backend/test/nowait-ch-r1.ataque.test.ts
fd2ae2e9792db81d838580b0ef2769ce8ef08059e3353aa5ab927c62295da9e8  backend/test/objetos-reintento-r2.ataque.test.ts
42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d  backend/test/recursos-clases03a-r1.ataque.test.ts
ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516  backend/test/recursos-clases03a-r2.ataque.test.ts
ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21  backend/test/referencias-01b-r1.ataque.test.ts
6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5  backend/test/servicio-ocupado-ch-r1.ataque.test.ts
e177959b61b1f93fa60d72b260465d4b53b66745fcf51e3befd8e5c7383a7f51  backend/test/sesiones-y-cadena.ataque.test.ts
70ac720f2e7fcadee5bbcb6414887ab08129dea7cd91df012046953b1584e8b6  backend/test/sexto-paso-02a-r1.ataque.test.ts
c89c30851e6b409cd045017181147bf674df947762a8dea3f3fb981bd9b36e09  backend/test/tareas-01a-r1.ataque.test.ts
79bc7aafc11676d36129610a4b5cd5fe5d8234d0d748487fd2f3e48c5f772c79  backend/test/tareas-01b-r1.ataque.test.ts
ae60c11cff5c82df4954db48582df4bd5a64957ff9afaf9712aa43a038f8e189  backend/test/temas-01a-r1.ataque.test.ts
dc7b86a621062ed671c1e7174a745019133fbd410c7a2e78114b2a2c50affe95  backend/test/temas-01a-r3.ataque.test.ts
f09e9a0038c47d1a2223376a0af260baf573f0c45bf770201c48c9e30296f04b  backend/test/worker-03c-r1.ataque.test.ts
9f60f9d65d52d2021a1eb04e9f01d3cc68f22744c845bf93d6621aa4fe9713a8  backend/test/worker-r1.ataque.test.ts
77d11bd85f202a9eec92a363df82e63fb9a784ca9d368d49f62e61c1a2aa967b  backend/test/worker-r2.ataque.test.ts
0e49b62b73b2ef55e8c0b2ba26e1d136a3adb674761fda2c11453eb5c2faf7cc  frontend/src/app/barra-02d-r1.ataque.test.tsx
b89ede0f6aed45dfcb5e64c8909a822156ce43fd80948e72419cdce9d4541a87  frontend/src/app/cache-03a-r1.ataque.test.tsx
e85743c0fbb8e476874a2c67334342d8d69d14153579fc1e4cce0ae6e2b29616  frontend/src/app/contexto-r1.ataque.test.tsx
bc2be5541006887e2a5a4a89b33046180f607d54474b0f96a73d615afbcac385  frontend/src/app/contrasena-r1.ataque.test.tsx
f38bcacb716d8a39acdb3535a95603cd0d8ab02572ca57a7df5268b01ceb6eac  frontend/src/app/contrasena-r2.ataque.test.tsx
68fb5d092c0c8ecfcf282477ef023aaae26f6b869656e05109dc3efa276d842a  frontend/src/app/cuentas-r1.ataque.test.tsx
41930017715d3d6869dc7acefd75de8ec3684f1f035b845abdf8ec0f6b734dee  frontend/src/app/cuentas-r2.ataque.test.tsx
1506c27e5f7418b5e087fd30f8809645a2fc3e2761c7249de78f02e24aa6c7a5  frontend/src/app/en-espera-r1.ataque.test.tsx
db48dad405c27062621a44d3744c84cc5903892a51e5a8df18f41383cb9c88a3  frontend/src/app/errores-r1.ataque.test.tsx
0e1d93e4dd3cbc7b5e9475a17b5ca66f0df056ba25cb117249f4c2e2f5887a51  frontend/src/app/foco-barra-02d-r2.ataque.test.tsx
2154b5c15f696a0c7f884bff774cf4e2a4208a5281db9076653f8253e2385ab9  frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx
f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4  frontend/src/app/fondo-r1.ataque.test.tsx
29782507d18ff96315e4030e890b21fdf1eb1c5550c3d1cfe5c92664d30b64dd  frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx
57cb54afd3b79464f0df01b88fc388cebbeac5657d936c4c204cbae6034b0834  frontend/src/app/marco-r1.ataque.test.tsx
c8a9812f21cb24db50cc2afd945b7b38abacb468fbf4f4df16c07a52c48426ac  frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx
d7608d7fc7767f53db3971672fc99fdb8bbd33f303f41e321bcc48ad25f511fd  frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx
2f8056a770397c1601647277944555a48afc4b9a2babeb75e5898f0cc92562bb  frontend/src/app/muro-rutas-c-r1.ataque.test.tsx
6acc49a2e3b649868ccf9a9337143f991b655dafbcff2e5916bca0269bd23a7c  frontend/src/app/personas-03c1-r1.ataque.test.tsx
a3e3dadd35c40e9a11a0bdef8cd716daceeb254e5307a837c6598213ba803a7b  frontend/src/app/personas-03c1-r2.ataque.test.tsx
0eefed2c05d76b0790a437e9465a898a9076083b1f046f8785145cfaad0da379  frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx
053e867a904afa3c09eef92ca2e03e929d9f9c93f714040856f40c7418721bbe  frontend/src/app/router.ataque.test.tsx
fc820217bc3baa3749c077fe16a4abd7ae10e92c84494ffb2a215133c19df36a  frontend/src/app/rutas-01d-r1.ataque.test.tsx
f0657fb91f7b3accf64726292f9324c6742c1ac537c6c4a1985ec4e32ae09c83  frontend/src/app/rutas-02c-r1.ataque.test.tsx
c7946f5f5d5d16d36b395adc2ad9928acc7fd9839875fb64532b51489756730b  frontend/src/app/rutas-clases-r1.ataque.test.tsx
f090cbd8e8c9b0af52d4fc19547b07e9b6413f5414cc4b10862f01e29818dddc  frontend/src/app/sesion-r2.ataque.test.tsx
11c6d9c55be91aa41e8525345e3795e34b8e1e661ff7cdd901f729760a033cfd  frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts
48f5ff8fef35faa6d8500fae4a53ca953d7f661100a5c4879ba58e68972ab2de  frontend/src/components/foco/foco-01d-r1.ataque.test.ts
36d605f79169e16a5afadc7e07fc3781472dd393406430277ceb147fc2da1fa5  frontend/src/components/layout/estatico-r1.ataque.test.ts
0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c  frontend/src/components/layout/pie-r1.ataque.test.tsx
00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21  frontend/src/components/layout/pie-r2.ataque.test.tsx
472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76  frontend/src/components/layout/pie-r3.ataque.test.tsx
a1814d281dafd8243989c9f9a462a4f33a86b1fb70eeebf29e99bcb0f340d82a  frontend/src/components/ui/badge-03b-r1.ataque.test.ts
7d080037d9a64eebcebb789d1dfd94b787652103e6f9c84f968f9c9f64c3b30c  frontend/src/features/admin/cuentas-r1.ataque.test.tsx
b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184  frontend/src/features/admin/cuentas-r2.ataque.test.tsx
72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a  frontend/src/features/admin/cuentas-r3.ataque.test.tsx
942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4  frontend/src/features/admin/cuentas-r4.ataque.test.tsx
3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998  frontend/src/features/admin/en-espera-r1.ataque.test.tsx
c21edb5a06b43808ce2be23058409b7ff887e66d60e842c500a3714a90ebcb25  frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx
8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35  frontend/src/features/admin/foco-r1.ataque.test.tsx
30f45bba30d9348ec1587b42e84ca370274e1bf0af0f310b8a6bbd79fa982669  frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx
d477a809e55e603d3ef6c02ca43b21372b75d0947fa303f1539d48bdf32841f8  frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx
761f54f183540d8ae222f97940fa6c2355ff33e515771e627f8efde49261eda2  frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx
14ead3dce027b433d51a9d635b0fa35718ee3875bffc3e1949f96ecb8d2f7135  frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx
3ceda51db8f67f40c26615fbc4cd7d082035b00f38713c6ca4c7db58e47926c8  frontend/src/features/auth/enlace-r1.ataque.test.tsx
1f5d1147637c09daa6fdf1384e4395edd69dfdab84aae5d602a362dabd3295bd  frontend/src/features/auth/enlace-r2.ataque.test.tsx
af3f0d474f8052b402c8959a64acf9e730f9ae60f09d90996a6306e9c2440f08  frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx
991b115524d8dade8d6ea2c51fb753dc8832ee410db2161a0ce761d011cfca4a  frontend/src/features/auth/invitacion-r1.ataque.test.tsx
96b6ab55f0a7bf9b66f8edbcb5ceffa7e4fe35935c6cb12ecab93fc04bc02856  frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx
0ce580976ea894ee4bd9c4adbe3d7d1d524354a8ff22fc7e7cc6acf89057aa53  frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx
4bcd3e34b62726fea718efb9c482d8c1f504bbe85ef32427bdf4d65a6832d8f1  frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts
812ee5f1b04a1218e2b96cdb97fb5a964a4a21b0d81b95bb4889beaa4a3894bb  frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts
bef8aa53d338fde15e251d53756b76e3381ef9f6de4943c4db83c8e2b3d258dd  frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx
d15e821c212bb268c65bd9dee36293b02f5bde4dedd4bf9926dbbf99b9971f57  frontend/src/features/calificaciones/exportacion-02b-r2.ataque.test.tsx
5991d8e3d4e694973309f178e5341a2285584cf9ed6006fbb658d7f5a61de5dd  frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx
c744fb831fa9992c2a9ed0729f9ec3cc089f3167ca19133c6eee0133382607a1  frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx
8dea1c2adc5d228e166ce6037a1a1a827d26e2bdc6d7c8534f146517ebc1ac44  frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx
6f7496ca7652e7b4441a7eb9822e74270d50127ac40ba27b86c83edfcd5cc3fa  frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx
24751f358fc5ecd485c475e7025dd881b87fe892f025459a6ff29f615fc5cc66  frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx
c504d0ad3690781275a6ffb78638a6148550b2fd4ee1ed25a4b154054fc4f80d  frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx
6ac36ce1eb4df953626415b3ed431a8f4809dc29cf259f755f1f8509dd54b7ef  frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx
fb33f2a27bfcca906549a12610977478ba72e6e7ed8afd5c5a0a962deb3eb802  frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx
932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872  frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx
55dc274eca96da4360848b88f9f2a839ac815031490ab57ff38de074512d632c  frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx
371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183  frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx
266d088dd727f18af8c8a106b8d9c4dbed75753e4b1b4abb12f3a4df870ecb7f  frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx
856cffbd9c743f9815daf731487e29dc5f5272545dc15820a70baf86ecfa6527  frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx
a9dc00d9cf6e8684113eeb824658c7fb2f3077ee8a54deb0cce47ac802c74f44  frontend/src/features/clases/archivos-d-r1.ataque.test.tsx
98e645df89c9736ee33f440c1d83f342be84f30caabec0310b1b5185e538fbd6  frontend/src/features/clases/archivos-d-r2.ataque.test.tsx
f1b2b7d3c2a2bfbc2c2aa31cce4b120e306681c0cc9efb85ac2a954c8f8f8afe  frontend/src/features/clases/archivos-d-r3.ataque.test.tsx
c6c85ac2f6e7418e81d7817f9c455c0e0973025a15ae2a5378e00c9a71c45620  frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx
a3880b67ffaa0d15763d1c761cef1ff8472029c77bfb2211ab079eadb1685325  frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx
66c0b873bc8b9d8e9e01ac871bd6aaab4328508beb5ec9371d69463d7c12430d  frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx
53909e72f161cb3494086fff21b521f8dea1425b687258bd14d4e8b401ece3c1  frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx
907f9ba5b6881a4831fc4062c27d685b5daa19e690eff7a3a40b02b5fbec6a72  frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx
a188c90deb61bafedabc50b76c77b02507964297cd6b155f905114839f728493  frontend/src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx
0fc7408a9c9e039c700956c8132790e689b84db3714f52080df86aecb387d88b  frontend/src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx
4e3a45f7672489373d6d1ad3f2309c572e9b7930e846fa9596b60a858c933294  frontend/src/features/clases/clase-archivada-01d2-r2.ataque.test.tsx
6f30bd0fc683631483ca1f35943e932f8883e83a3f4559f72110d67ce1590a8b  frontend/src/features/clases/clase-archivada-01d2-r3.ataque.test.tsx
1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65  frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx
76b5b2522f60795c0e7672da7b10ea95a3ce61d1aa26f102ef8eb057bd3ce6d9  frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx
cffce654ebfb37dc10f8ce8bf7026fc982a8c3f79b677fa2eb82c4476e113f83  frontend/src/features/clases/clases-admin-01c-r3.ataque.test.tsx
87dae1927669b46bb52aad94db5107a5284f772fa9b29e225aace19c1a1e8def  frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx
5f0679d8cfacc8bce01989c04a415dc5b546625eb7dec92f03959de5a0f89815  frontend/src/features/clases/clases-r1.ataque.test.tsx
c7ad5edc733e374117a9277f1c2987e84cc2930c77eb4c720ccf15cc9f5fab45  frontend/src/features/clases/clases-r2.ataque.test.tsx
a835a11d29aedb8f77f91e826a22c2b7cf5322fced3f6bed0c1acbf7c75a4e61  frontend/src/features/clases/clases-r3.ataque.test.tsx
86b04d234527eceefca35b07ce89e6b7ce0b6afe5ccdee2f005e6a4219f0495a  frontend/src/features/clases/clases-r4.ataque.test.tsx
dce7fd019a6e32b8e4df37dd0728e265f5e9449e9ee2723f372ea174fe312464  frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx
3b5a9fac5cd20a881bf6b38597b752725a7f6bbfddcf103b7bf1239a76353dfc  frontend/src/features/clases/dudas-03e-r1.ataque.test.tsx
fec2ffc2691bd297dca5f90233d498d10dfd689a5d9a8819bc30e757c6f67c26  frontend/src/features/clases/dudas-03e-r2.ataque.test.tsx
18edcffc8e48073362b98c784d5bf64e3335709ae6e1c6425b32aa3310e24b56  frontend/src/features/clases/dudas-03e-r3.ataque.test.tsx
ddc9dfaccc8230ec612126fdf29939a8e4311188566e5cfcaa724bd119e959e8  frontend/src/features/clases/errores-ch3-r1.ataque.test.ts
5e20eefe0104b510a3002de084b6162162b5bf20797622c8d92b350853494b53  frontend/src/features/clases/estatico-02c-r1.ataque.test.ts
3cb8e0d7bb13b57638d65aa74ec5ff0f9306f024cf6996b7737232243a0b82f8  frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts
cdd1ed8890859ae3e884822fc7074852a2173105114745d83fe9a15c1c47c626  frontend/src/features/clases/estatico-r1.ataque.test.ts
de23d395dfe7a6f3d6d15eb48cb574599dc9d8204e5a90b255c0c10d25a186fa  frontend/src/features/clases/fila-01d-r1.ataque.test.tsx
46383e1f3ede03cb204dbf602373d0a07e513d8dac7ec4179a203ea6ee270fa3  frontend/src/features/clases/foco-02c-r3.ataque.test.tsx
0165d4e27b1fff9230d17bec740d89c380b6f322923c7e5a044ac010f4b9358b  frontend/src/features/clases/foco-02c-r4.ataque.test.tsx
8b8ea2d21597bc0444709a9d26fd795d05bc964ef7b5094240628c63018c091b  frontend/src/features/clases/foco-02c-r5.ataque.test.tsx
b819d6bbde4bd47e3ec724fcdea5e77eb66b12076b8a9a083691b52ef0bdd182  frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx
ab006dc1711e9a652643930a7010c25f442d1ffdd137adbb093eb5bd98da90d6  frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx
5224976752a14c3e003b246fa97abf25356e370cb46da1cdff9526bf3be86b4e  frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx
7f4a935de29c3c519aad697edb1470c4cfcead600f5c1516c5fff948995d4434  frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx
8bc578ef17d2731f388c14ca19bc719a2b8d04d8a41009fadee15227379047bc  frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx
479430b848cf3d21a0187138944deec46bb36653071bbd2790ed57620f012976  frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx
4d94ccbe786a46ca1d82a280956f1146d5c302a9f83dfac45f39b3b2f94b753f  frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx
0f60f1582fce6e5efaf9bf6856133dc30f1dc4eb9c3b7fea19f90a330f8335b3  frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx
7c434a0e54e70b12d4b2a3de22ffb4dbf5f28a1cfbd2290c22e8a2b59edf0e16  frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx
99df138b24d4aba97b9f714c32ba226e82c7403cf73aa2e9e2b0b028b28e283e  frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx
4817262ef6e4dadff56857e50bab2e06ec479e62d5eaf45b34d70d683736b637  frontend/src/features/clases/muro-02c-r1.ataque.test.tsx
8da38dbcb605ce3d90ace8117ce2cc5c838d71eb24bdd76fad3a53b82da93901  frontend/src/features/clases/muro-c-r1.ataque.test.tsx
d0acb3527aafa6f687e3eb00563e37be93768e7d7f742694a4d5ce05b75b7e28  frontend/src/features/clases/muro-c-r2.ataque.test.tsx
d08e51d451ebaeb2d7086c75dc1f73d52c5b4a6b8dfb979932828bed5f5d459d  frontend/src/features/clases/muro-c-r3.ataque.test.tsx
558212b46641de0794d0ce90e3944a99cb5baa7fab4b09bbac5ea7cac41eaa34  frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx
aec8c4131e5dc733246b33e8189e2dc595387324bdd2081d1d245641c20c380a  frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx
67b60a9a5363f88e6ceba210c27452b8d639f6df798aa4e506dc54bb2312249a  frontend/src/features/clases/personas-02d-r1.ataque.test.tsx
7677e0571587c89de1cb76788d499ac545255ca64c8afcb38a8ad6e39c02e2c6  frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx
60541290248812cfce5591ddf33d01125d60c33257743a7ec48a445013d3d8c1  frontend/src/features/clases/recursos-03d-r1.ataque.test.tsx
4aafaa73980ba1bc29be043623a030c9eaa730825eb61a403bf54f9ac700b42d  frontend/src/features/clases/recursos-03d-r2.ataque.test.tsx
70b1a49a6a0e471422be987466228e5beb87e25baee2906790651c94ed214a3a  frontend/src/features/clases/recursos-03d-r3.ataque.test.tsx
29a3125cc70969f2fc2bb1f012beeb81840e1a00ea08d5b588b10d190342ae7f  frontend/src/features/clases/recursos-03e-r1.ataque.test.tsx
85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511  frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx
4303eac77b98e8978495d9e68fd7725ac436f9db757dbc0c02c59051436908fa  frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx
09435abbb9a26dd71c52b4d95487c6d38594f1ba062aefb60f73b7eb7308f991  frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx
d899c19ba982fbde2208bbc7fa009869556c84bd4650586dbd9ee90b22234e47  frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx
97af503e763f7dff9fcfbdc72862cd21de6af8e51d3ec41134f8475d98ae2df6  frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx
db42c88d5b0bfb1125bf122c03a2e019d6f5365c128ac4bfadd413a26a934845  frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx
f6924bc272a5240cf97d35729c797cc10960ed7cf94fe1be1b69ca2df6c1cf8f  frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx
9866ef34167061e2715b65a352c55d08c7e9268033e879ae633c7fd568e4d49f  frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx
ea58eb11c3157a33c5730f87f2cf562ae178589b30264902b165c4439cebc2ee  frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx
2ef258e946084f17e33936e8fa257551a90323b589859dd2e1f70aabeaf711bf  frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx
e2fefd7d744f77c7bdd2ba73a08cc51076d0f6130bf4d0a225e0e972a1dce111  frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx
11bb5433fb30f268b6d93e1e7814d826bbab8fb1f173e574faf52f5a96b5a41e  frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx
d8daccb56c8de8d9f1b0f8d1b0907c110e327f4f55b016fc0fe7fc0f25ccc79c  frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx
ef86c46708f0682bca5a023e85794639c396ec94d207cac23ceb13585ab39e75  frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx
af127fae8354906737c857aa497a29a53514c928fa4dcfbfc79a41e3fbc13eee  frontend/src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx
940817a89a4aaa1703187248e6c53dcbfe97c1af053b2f78c265e34f0ce50e7a  frontend/src/features/tareas/clase-archivada-01d2-r2.ataque.test.tsx
5ff367edba10c9ba9c7e50f8ed874032654fa2abdc0dd8f4a122a000355472ab  frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx
2938ae2f1c00f63a0372997c7ba68bdc0ab097895769bf9060072a4ac2674c5a  frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx
0963f14f4842d6d57288876c932496ac09d44b872fc049492ee6e8ba539f3235  frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx
4f486ca37d2a2bb6cc26754281d2adce086a9d8d4485a069de7ae5d54e360acf  frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx
93a5a0a648669e9c96494a62b2b16082b07296f279e2892bf2c8d47834ee2fc1  frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx
08a5e1a5642e7fc7553632dd5cf4e07f0ea35c3ef1e7293d010bbc49b09465aa  frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx
172be3efd919c0d3948eca17c7e808968e2370afe1f9c2a28cef7d2ded584b81  frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx
496652bc59817166f53e00cb828f2119c857c2834063a31764d7876dc150c930  frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx
edf4d96e4b884eab718d06811877c17b611099a66d6857502f71eedb96026dda  frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts
94d6e6253b266c7f21099aa593aac7b2600edca22ab403aa365dcd789b1c6a97  frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts
f614e7369f8c47c40a87ad1f8867fb8edf7ebc76e94d0ba6c5c59c92cb6347f0  frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts
fb387ecbb7e5272d2ffb53d626b51ffd9c57b409d10c560e6a5ecbfa6a2a8c19  frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx
7a7c7ba922f77da22d0f765ed5ea9ccf9216d1900e4b5f18365da9d46437495f  frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx
bfded7507bc684ea9858cd76517ef0e4c23cbc69e5a19f381e6ec522fd6156e6  frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx
b778fc2e6bb0a8f8715a56877b3b781439ca214c8a9c8ae126f610c95229882a  frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx
bf3c999033195cac778a82a579e44729fb07a405f5cdb41d8e7dc932cb71f942  frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx
3567d7c23d2cf6a2fd538cd6822ef60ac3cffeac036394ed1e3559debe492c57  frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx
6bbe2bd85e2b5500fbab4d0f51630c0c8e9d65b1a63045ad1fa906298a92a435  frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx
72b19b6a00b4ade43b06829bb5bef1a5cdecf5a7d2af57369f1e857a1d4a17f5  frontend/src/lib/errores-ch3-r1.ataque.test.ts
5d41a2af073dcaa2b8b016d835d36d5ebae9278863db048484a192a88bb31a30  frontend/src/lib/errores-ch3-r2.ataque.test.ts
66513d957e524af5e336a2c7e656df37f51106507a3984b691df47cd825d4d10  frontend/src/lib/estatico-ch3-r1.ataque.test.ts
a9529cefbd27cbb94376a6548ef1b8b247fb1f4155938298ae5d10eaee81008a  frontend/src/lib/estatico-ch3-r2.ataque.test.ts
60bc1fc7011e9a0fe5a4c4aa45420f2c7d38adb9ee2f8d235d09847dbe13ac3a  frontend/src/lib/format-01c-r1.ataque.test.ts
c71cba65dd284d7af11cbc812b6bcf75baa373939edb8318e731858d9c50173f  frontend/src/lib/format-d-r1.ataque.test.ts
89dbbb70d5dc404c3d74db5391d10855c8cb1d6b4c643b6147b3ce6ffb2637af  frontend/src/lib/format-d-r2.ataque.test.ts
bfa7ded62f7a1402590d438a1cc51060a63fa019ad47d3eb5740e43383064a2a  frontend/src/lib/format-d-r3.ataque.test.ts
b6265bf6eec25b7f2c34dcd93dd4d8b23d07ca6214576921a50a66ff16346ffb  frontend/src/services/apiClient-ch3-r1.ataque.test.ts
10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce  frontend/src/services/apiClient.ataque.test.ts
537e10bc0519805f2be98ff579b34c71eda6fa7d364e355bfbd0050f568ffcb6  frontend/src/styles/clases-r1.ataque.test.ts
b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582  frontend/src/styles/tokens-r1.ataque.test.ts
```

### Atacado sin hallazgos
- Los once archivos de los C-n: los tres rojos son los esperados y solo por su razón; los otros 94 casos, en verde.
- Las 31 vigiladas de §D-R0 → 01e: `605 passed (605)`.
- La sonda M-09: C-25 a C-32 y las vigiladas del log siguen en verde sin la consulta (48 de 48).
- La sonda S-16: C-42 pasa a verde y nada más del grep de la Enmienda 13 cae (335 de 336; el rojo es C-8, que no depende de S-16).
- El barrido de las lecturas del log, de las rutas nuevas y de las revisiones estáticas de `backend/src`.

### No atacado y por qué
- **El código de 01e:** todavía no existe (ronda 0). Los puntos de ataque del plan para 01e (usuarios, estado de pago, acceso, KPIs, movimientos, M-18, N-03, S-16 y el log sin consulta), O-R1-1 y N-18 van en la ronda 1.
- **La suite completa del backend y la del frontend:** las corre el manager al cerrar la subentrega. Por eso no hay PA-07 de corrida completa; el control positivo apareció completo en la corrida de las vigiladas (`servicio-ocupado`).
- **El frontend:** 01e no lo toca, y en esta ronda no cambió nada de `shared/`.

### Cierre de la ronda 0 de 01e
- **Veredicto: lista para el programador.** Sin PARADA.
- **C-6, C-7, C-8, C-25 a C-32 y C-42 aplicados:**
  - C-6 en rojo: `expected [ …(125) ] to deeply equal [ …(138) ]`, solo las 13 rutas nuevas faltan.
  - C-8 en rojo: `expected [ …(10) ] to deeply equal [ …(12) ]`, solo faltan los dos archivos nuevos.
  - C-42 en rojo: `expected [ 'id', 'nombre' ] to deeply equal [ 'cuentaDesactivada', 'id', 'nombre' ]` en la aserción de `b` (`:743`).
  - C-7 es un comentario. C-25 a C-32, en verde hoy y con el serializador de M-09.
- **Corridas:**
  - los C-n, `Tests 3 failed | 94 passed (97)` · 11 archivos;
  - las vigiladas, `Tests 605 passed (605)` · 31 archivos, con los tres `P2028` deterministas de `servicio-ocupado` atribuidos por ruta;
  - la sonda M-09, `48 passed (48)` · 15 archivos;
  - la sonda S-16, `1 failed | 335 passed (336)` · 19 archivos, con el único rojo en C-8;
  - `lint`, exit 0.
- **Para el orquestador, antes del paso 24:** OA-01e-1. Las rutas de §D-7 y §D-8 van en `handlers/admin/usuarios.ts`, o `arquitectura-cuentas-r1` cae y es PARADA.
- **Para el programador:** O-01e-1 a O-01e-10. Sobre todo O-01e-5: compilar `shared/` antes de la suite del backend, o C-42 sigue en rojo.
- **V-01:** 267 archivos; solo cambian los once de los C-n. Lista `b17af275a66e713514190bf5d07c1ed50811b2f059fecc6548c62992cb5ca8dc`.
- **No se toca:** `git diff --name-only ea718bc -- backend frontend shared` lista solo los once `*.ataque` de los C-n.

## Ronda 1 — ADMIN-01e

Veredicto: **ROTO.** Un hallazgo, de severidad media: `GET /api/admin/usuarios` con el carácter nulo en `q` responde `500` (T-01). El resto de los once puntos de ataque resiste: el protocolo de bloqueo con todo a la vez, la marca «Cuenta desactivada» por cada respuesta, el motivo sin tope crudo, el alta, el lote, los movimientos, el log sin consulta y las cuentas raras. Dejo una observación para el arquitecto o el humano (OA-01e-r1-1: quitar al único maestro activo deja una clase activa solo con uno dado de baja, una segunda vía que N-14 no nombra) y tres notas que no son hallazgos.

Plan: `plan.md` = `7018e1f3…` (comprobado). Resumen del programador `ed312373…` ("ADMIN-01e — Implementación", `:2816` y `:2928`; "Corrección de la verificación", `:3041`). Verificación del manager: `revision.md:5698` y `:5812`, con los once puntos de ataque. Base: `ea718bc`.

Verificación propia (regla "Suites por ronda": los módulos de 01e, mis archivos nuevos y las vigiladas, más `lint`):
- **lint del backend:** `cd backend; npm run lint` → exit 0, con mis dos archivos nuevos. Antes salió `All matched files use Prettier code style!`, y la última línea es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** la lista de módulos del programador (`modulos-01e.txt`, 70 rutas, SHA-256 `4605cfa2…`; incluye las vigiladas de mi ronda 0) más mis dos archivos: `Tests 1 failed | 1049 passed (1050)`, 76 archivos. El único rojo es T-01. Detalle abajo.
- No corrí la suite completa del backend ni la del frontend: las corre el manager al cerrar la subentrega.

### Entorno
- Sin otra copia ni otra suite (dato del orquestador). Antes de cada corrida, ningún `node` con `vitest`. Docker encendido. Red `uacam5 2`, autorizada hoy.
- **A batería:** `BatteryStatus` **1** (descargando) en todas las lecturas, del 85 % (11:17) al 78 % (11:29). Se corrió igual, como pide el humano, y se declara. CPU entre 26 % y 36 % al arrancar cada corrida.
- **N-01e-3 (punto 11):** ningún `beforeAll` venció en mis corridas (11:17:05, 11:19:54, 11:25:36 y 11:29:28), a batería. Mis dos archivos llevan `beforeAll` con `timeout` de 60 s.
- Sin navegadores. No terminé ningún proceso. No toqué código de producción ni pruebas del programador.
- **Escapes:** en la primera versión de `usuarios-admin-01e-r1.ataque.test.ts`, la herramienta de escritura convirtió siete escapes (`\u200b`, `\u200d`, `\u2028`, `\u2029`, `\u2800`, `\u3164`, `\ufe0f`) en caracteres literales. ESLint (`no-irregular-whitespace`) los detectó. Los cambié por el texto del escape con un guion que usa `chr(92)`. Un barrido de los dos archivos da 0 caracteres de las categorías Cc, Cf, Zl, Zp y Mn (salvo `\n` y `\t`). `\u0000` y los emojis `\u{1F468}…` siempre fueron escapes.

### Hallazgos

### T-01 — `q` con el carácter nulo tumba la lista de usuarios con un `500`
Severidad: media
Prueba: `backend/test/usuarios-admin-01e-r1.ataque.test.ts`, "ADM-T1E01: q con el carácter nulo (en el nombre o en el correo) responde 400 legible, nunca 500, como el buscador de candidatos".
Esperado / Obtenido:
- **Esperado:** `400` con un mensaje legible, como el buscador de maestros (`gestion-02a-r1.ataque:871`, "q repetido o con nulo: 400", que lo traduce con `traducirErrorPrisma` en `buscarMaestrosCandidatos`, `adapters/db/maestros-de-clase.ts:110-130`). El punto 4 de la verificación del manager pide "nada responde `500`".
- **Obtenido:** las cuatro URL con `%00` en `q` (al final, al principio, en medio y con `rol=estudiante&estadoPago=deudor`) responden `500 ERROR_INTERNO` "Ocurrió un error inesperado." El log trae `"msg":"Error no controlado"` con `Raw query failed. Code: 22021. Message: invalid byte sequence for encoding "UTF8": 0x00` desde `prisma.$queryRaw()`. Las dos URL con bytes que no son UTF-8 (`%FF%FE`, `%ED%A0%80`) dan `200` o `400`, sin `500`.
- **Causa:** `listaUsuariosConsultaSchema.q` (`shared/src/usuarios-admin.ts:34-46`) solo mide la longitud; `normalizarTerminoDeBusqueda` no quita controles; `prepararBusquedaDeUsuarios` (`core/usuarios/busqueda.ts:19-26`) pasa el término y `q.trim().toLowerCase()` al adaptador; y `listarUsuarios` (`adapters/db/gestion-de-usuarios.ts:101-148`) corre el `$queryRaw` sin traducir el `22021`. `enTransaccion` solo traduce `P2028`.
- **Hermanos (las demás entradas de texto de 01e que llegan a PostgreSQL):**
  - `nombre` (editar y alta) y `email` (alta) los rechaza el esquema antes de la base;
  - `motivo` rechaza los controles (ADM-T1E06, 71 casos, en verde);
  - `cursorNombre` se compara en JavaScript, no llega a SQL (ADM-T1E03, en verde);
  - `alumnoIds` y `cursor` son UUID.
  - Solo `q` alcanza el `500`.
- **Impacto:** solo el admin llega a la ruta, y no hay fuga. El `err` del log no trae la consulta: lo comprueba ADM-T1E18, y la línea `incoming request` dice `GET /api/admin/usuarios` sin consulta. Cada intento suma, eso sí, un `"Error no controlado"` al log de producción. En 01f, el buscador de la tabla de usuarios lo vería como el error genérico.
Requisito o regla violada: punto 4 de la verificación (`revision.md:5863`, "Nada responde `500`"); `CLAUDE.md`, "Manejo de errores en el backend" (los errores de Prisma se traducen a `AppError` dentro de `adapters/db`; el `22021` es "entrada inválida (400), no un 500", `adapters/db/errores.ts:44-47`).

### Atacado sin hallazgos (por punto de ataque; casos de `usuarios-admin-01e-r1.ataque.test.ts` y `logs-usuarios-01e-r1.ataque.test.ts`)

1. **Protocolo de bloqueo con todo a la vez (ADM-T1E11, cinco vueltas sobre cinco alumnos).** A la vez: baja, restringir, dos lotes (id en mayúsculas y en minúsculas), login, refresco, restablecer del admin y `POST /api/auth/restablecer` con un enlace de recuperación vivo. Ningún `500`, ni `40P01` ni `P2028` en la salida. Las cuatro escrituras del admin responden `200` siempre. Al final, la cuenta queda inactiva y restringida, sin ninguna sesión viva y sin ningún enlace usable, y el login responde `401`. M-18 con la baja confirmada entre la verificación del token y el bloqueo ya lo cubre ADM-1E13 del programador; no lo repetí.
2. **N-03 y N-14 (ADM-T1E12 y ADM-T1E13).** En una clase restaurada con un maestro dado de baja: repetir la baja responde `200` sin escribir (la fila no cambia); reactivar quita la marca. Duplicar o crear con un maestro dado de baja responde `404` y no crea nada. La baja del único maestro activo de una clase activa responde `409 MAESTRO_CON_CLASES`, con el texto singular de §D-12. Quitar al activo y dejar solo al dado de baja: lo permite (OA-01e-r1-1, abajo).
   - **O-R1-1 (ADM-T1E14):** una clase archivada con 0 maestros no se alcanza por la API: ninguna ruta borra cuentas, retirar al único responde `409`, y la baja no toca asignaciones. La fabriqué dentro de una transacción que se deshace con un centinela, y `listarClasesAnteriores` la devuelve con `maestros` vacío. `listaClasesAnterioresRespuestaSchema` la rechaza, así que por HTTP sería un `500`. Sigue sin alcanzarse; queda como riesgo con destino, no como hallazgo.
   - **N-18:** ninguna clase confirmada por mis pruebas queda con 0 o con 3 maestros. La de 0 vive solo dentro de la transacción deshecha. La de ADM-T1E12 pasa por "solo la dada de baja" y termina con dos: la dada de baja y la tercera, asignada después.
3. **S-16 (ADM-T1E12).**
   - La marca sale solo en la dada de baja y siempre `true`, en el detalle (también en `maestro`), la lista del admin (recorrida por cursor), editar, quitar, asignar y «Personas».
   - Nunca sale en inscritas, anteriores ni candidatos. Ninguna respuesta trae `activo`. La dada de baja no aparece en candidatos.
   - **N-01e-2, confirmado:** con la principal dada de baja, «Personas» responde `200`; `maestros[0]` trae la marca, y `maestro` sale con exactamente `email`, `id` y `nombre`, sin ella y sin `500`.
4. **Lista de usuarios (ADM-T1E02 a ADM-T1E04), salvo T-01.**
   - Comodines (`%`, `_`) literales, barra invertida al final o sola, `+` en el correo, mayúsculas Unicode (`İ`, `ß`, `ǅ` y `ǆ`), inyección (`' OR 1=1 --`, `'); DROP TABLE`): `200` con lo literal, nunca `500`.
   - Bordes: 120 normalizados `200` y 121 `400` ("La búsqueda no puede tener más de 120 caracteres"); 1000 crudos `200` y 1001 `400`.
   - `q` vacío, solo espacios o repetido, `rol` repetido o inválido, `estadoPago` sin `rol=estudiante`, con un maestro o inválido, `limite` 0, 101, −1 o 1.5: `400`.
   - `cursorNombre` con el carácter nulo, de 10 000 caracteres, vacío o sin `cursor`; `cursor` sin `cursorNombre`, inventado, el del admin (no cumple el `q`) o no UUID: `400`. El `cursor` en mayúsculas sirve.
   - La cuenta del cursor se da de baja: sigue en la lista y su cursor sirve. Pasa a "al corriente" entre dos páginas de deudores: `400` "cursor: no es válido".
5. **Motivo sin tope crudo (ADM-T1E05 a ADM-T1E07; decisión del humano, 2026-11-09).**
   - 300 visibles con relleno: espacio, tabulador, salto, ZWJ (U+200D), VS16 (U+FE0F), Braille en blanco (U+2800), relleno Hangul (U+3164) y espacio de ancho cero (U+200B). Se guarda tal cual, recortado. 301 dan `400` "motivo: El motivo no puede tener más de 300 caracteres".
   - Una familia con ZWJ, una bandera y un tono de piel se guardan tal cual.
   - Un motivo de 900 300 unidades con 300 visibles, dentro del cuerpo de 1 MiB, responde `200` en menos de 5 s y se guarda entero.
   - Los 71 caracteres prohibidos responden `400` "motivo: El texto tiene caracteres no permitidos", sin escribir y sin repetir el motivo: C0 sin tabulador, salto ni retorno, DEL y C1 (U+007F a U+009F), y U+202A a U+202E y U+2066 a U+2069.
   - Retorno con salto y retorno solo se normalizan a salto. U+2028 y U+2029 se guardan (son separadores, no controles; igual que en los demás textos largos).
   - Que no sea texto (`null`, número, objeto, arreglo, booleano), `restringido` que no es booleano o falta, cuerpo `[]` o `{}`: `400` sin escribir.
   - Restringir de nuevo con el mismo motivo escrito con espacios externos o con retorno y salto no escribe. Solo invisibles cuenta como sin motivo y conserva la fecha. Restablecer con motivo lo ignora y borra motivo y fecha.
6. **M-09 (`logs-usuarios-01e-r1.ataque.test.ts`, ADM-T1E17 y ADM-T1E18).** Con `LOG_LEVEL=trace` y la consulta cargada de estado de pago, nombre, correo, cursor y una marca:
   - las peticiones fueron un JSON inválido (`400`), un `415`, una ruta inexistente (`404`), un `HEAD` (`200`), el `400` de `validarParametros` con el valor rechazado y el `500` de T-01;
   - ni el log ni las respuestas traen ninguno de esos valores, ni `deudor`, `al_corriente`, `estadoPago=` o `cursorNombre=`. El `err` del `500` no lleva la consulta.
   - En la corrida de módulos, las cuatro líneas `Error no controlado` de T-01 se atribuyen a `GET /api/admin/usuarios`, sin consulta.
7. **Alta de alumno (ADM-T1E08).** Cuatro altas a la vez con el mismo correo (igual, en mayúsculas con espacios, con otra capitalización) dan una `201` con `Cache-Control: no-store` y tres `409 CORREO_EN_USO`, sin `500`, con una sola cuenta en minúsculas. El correo de una cuenta dada de baja, en mayúsculas, da `409`, y la respuesta no trae `contrasenaTemporal`. El log a `trace` de la temporal ya lo cubre ADM-1E22.
8. **Lote de estado de pago (ADM-T1E09 y ADM-T1E10).**
   - 99 alumnos más el admin, un maestro o un id inexistente: `400` "alumnoIds: hay cuentas que no son de alumnos", sin escribir ninguna fila. Un id repetido en otra capitalización o 101 ids: `400`.
   - Una cuenta dada de baja (id en mayúsculas) y una restringida sí cambian. Una ya deudora no cuenta en `actualizados` y conserva su `fecha_estado_pago`.
   - Doce lotes cruzados en paralelo (órdenes inversos y mayúsculas, 20 alumnos): todos `200`, sin `40P01` ni `503`, y el estado final es uniforme.
9. **Movimientos y resumen (ADM-T1E15).** El cursor de un movimiento borrado con su clase da `400`. Con el actor maestro y el alumno dados de baja (y el alumno deudor), la fila sale con `actor` `{ id, nombre, administracion: false }` y `alumno` `{ id, nombre, email }`, sin `estadoPago`, `accesoRestringido`, `activo`, `cuentaDesactivada` ni `rol`. `HEAD` de resumen y movimientos: `200` sin cuerpo. Que las inactivas y las archivadas no cuentan en el resumen lo cubre ADM-1E10 con la misma instantánea.
10. **Cuentas raras (ADM-T1E16).** Un maestro con `acceso_restringido` en la base recibe `403`; una cuenta inactiva con token vivo, `401`. El admin sobre sí mismo: `PUT …/acceso` da `409 NO_ES_ALUMNO`, y `PUT …/activo` (`false` y `true`) da `409 CUENTA_DE_ADMINISTRACION`, sin escribir; sigue habiendo un solo admin. El acceso de un maestro da `409`.
11. **Fragilidad con carga:** sin `beforeAll` vencidos (ver "Entorno").

### Observación para el arquitecto o el humano (no es hallazgo: el plan no fija la respuesta)

- **OA-01e-r1-1. Quitar al único maestro activo deja una clase activa solo con uno dado de baja.**
  - **Cómo se llega:** una clase con A (activa) y B (dada de baja) se alcanza con archivar, dar de baja a B y restaurar (N-14). Después, `DELETE /api/admin/clases/:claseId/maestros/:A` responde `200`, porque `decidirRetiro` solo cuenta asignaciones, no cuentas activas. La clase queda activa solo con B. ADM-T1E12 lo documenta en verde: la respuesta trae solo a B, con la marca.
  - **Por qué lo señalo:** N-14 (`plan.md:1759`) dice que la restauración "es la única forma en que una clase activa queda sin un maestro que pueda entrar". Esta es una segunda forma, que empieza en una clase que sí tenía un maestro activo. RN-06, leído como en N-14 (de uno a dos asignados), se cumple. Se resuelve igual, asignando uno activo.
  - **Opciones:** (a) aceptarlo y anotarlo junto a N-14 en A-01 y A-03; (b) que retirar al último maestro activo de una clase activa responda `409`. (b) cambia el comportamiento de `retirarMaestro`, que es de CLASES-02a, y pide un texto nuevo.
  - **No lo cuento como hallazgo:** el plan no fija la respuesta.

### Notas que no son hallazgos de 01e
- **N-01e-1** (`q` vacío da `400 BUSQUEDA_MUY_CORTA`): confirmado en ADM-T1E02. Sigue con destino a 01f y 01g.
- **N-01e-2:** confirmado sin `500` (punto 3).
- **Mensajes en inglés en campos técnicos (para 01f, sin cambio en 01e).** Los esquemas de 01e dejan pasar el mensaje de zod en los campos que no escribe una persona:
  - `rol: Invalid option: …` y `estadoPago: Invalid option: …` en la lista y en el lote;
  - `cursor: Invalid UUID` en usuarios y movimientos;
  - `limite: Too small…`, `Too big…` e `Invalid input…`;
  - `cursorNombre: Invalid input…` (repetido);
  - `activo: Invalid input: expected boolean…` y `restringido: Invalid input: expected boolean…`.

  Es el mismo patrón de `paginacionSchema` en todo el backend, y solo llega con un cliente que no es el de la interfaz. En 01f, la traducción de cada vista debe tratarlos como `VALIDACION` fuera de contrato (`AGENTS.md`): nunca mostrar el texto.
- **Tono en el alta de alumno (para 01f).** `altaAlumnoSchema` reutiliza `nombreSchema` de registro, así que el admin que captura a otra persona recibe "nombre: Escribe tu nombre completo". La vista de 01f debe traducirlo o pintar su propio texto.

### No atacado y por qué
- **Petición abortada** (punto 6): `inject` no permite cortar el socket a media petición sin arrancar la API real, y el serializador es el mismo para toda línea con `req` (lo comprobé en la ronda 0 con la sonda M-09, en los dos caminos). Queda sin prueba propia.
- **El worker** (punto 6): no registra `req` (vigiladas `worker-r1` y `worker-r2`, en verde en la corrida de módulos).
- **`establecer-contrasena` en la tormenta del punto 1:** usé el enlace de recuperación (`/api/auth/restablecer`), que pasa por el mismo `usarTokenYCambiarContrasena` con M-18. La invitación de un estudiante no existe; la de un maestro necesitaría otra cuenta.
- **La suite completa** del backend y la del frontend: las corre el manager al cerrar la subentrega.

### Archivos nuevos (solo `*.ataque`, sin rastrear)

| Archivo | Casos | SHA-256 |
|---|---|---|
| `backend/test/usuarios-admin-01e-r1.ataque.test.ts` | 16 (ADM-T1E01 a ADM-T1E16) | `309b944a426e30648feb779514c3edec34089ee691bb0e86d51a8597ce01a0d3` |
| `backend/test/logs-usuarios-01e-r1.ataque.test.ts` | 2 (ADM-T1E17 y ADM-T1E18) | `9679a4e38388e15a318cf2470852d96a34ad8f01363923de94325e75f34b3a4e` |

Conteo: `npx vitest list` con los dos archivos da 18 casos con "ADM-T1E". El formato lo dejó Prettier (`npx prettier --write`, acotado a esos dos archivos del backend).

### Corridas (desde `backend/`; una después de otra)

1. **Los dos archivos, versión final** (11:29:28): `npx vitest run --reporter=verbose test/usuarios-admin-01e-r1.ataque.test.ts test/logs-usuarios-01e-r1.ataque.test.ts`
   ```
    Test Files  1 failed | 1 passed (2)
         Tests  1 failed | 17 passed (18)
      Start at  11:29:28
      Duration  61.33s (transform 3.99s, setup 155ms, import 11.29s, tests 27.80s, environment 1ms)
   ```
   El único rojo es ADM-T1E01 (T-01): `expected [ …(4) ] to deeply equal []`, con las cuatro URL de `%00` → `500 Ocurrió un error inesperado.`
2. **Módulos de 01e más mis dos archivos** (11:25:36): `npx vitest run $(cat mod-r1.txt)`. La lista es la de 70 rutas del programador (`modulos-01e.txt`, `4605cfa2…`) más mis dos archivos.
   ```
    Test Files  1 failed | 75 passed (76)
         Tests  1 failed | 1049 passed (1050)
      Start at  11:25:36
      Duration  107.85s (transform 16.11s, setup 3.21s, import 221.30s, tests 752.38s, environment 32ms)
   ```
   - El único rojo es ADM-T1E01. La lista incluye las 31 vigiladas de mi ronda 0 y los 11 archivos de mis C-n, todos en verde (C-6, C-8 y C-42 ya en verde con 01e).
   - Esta corrida usó la versión de `usuarios-admin-01e-r1` anterior al último agregado de ADM-T1E12: la comprobación de «Personas» con la principal dada de baja. Ese agregado corrió en la corrida 1, en verde.
   - **Contención** (informativo; PA-07 es de la corrida completa del manager): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0.
   - `"Error no controlado"` 4: los cuatro de T-01, `GET /api/admin/usuarios` (`req-1` a `req-4` del proceso de mi archivo, `22021` en `$queryRaw`). Son nuevos fuera del inventario y desaparecen con el remedio de T-01.
   - `"code":"P2028"` 5: los tres deterministas de `servicio-ocupado` (`POST /api/auth/cambiar-contrasena` `req-1`, `POST /api/auth/refrescar` `req-3`, `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` `req-5`) y los dos permitidos de `cuentas-r3.ataque` (`POST /api/auth/login` `req-1m`, `POST /api/auth/restablecer` `req-20`).
3. Corridas previas de mis archivos mientras los escribía: 11:17:05, `4 failed | 12 passed (16)`. Además de T-01, fallaron tres aserciones mías que exigían español en campos técnicos (ver "Notas"); las retiré. A las 11:19:54, `1 failed | 17 passed (18)`, con la limpieza del archivo de logs fallando por la conexión cerrada; la corregí. No cuentan.

**lint:** `cd backend; npm run lint` → exit 0 (después del último cambio; la última línea es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`).

### V-01
- Las 267 `*.ataque` rastreadas coinciden con la lista de la ronda 0 de 01e (`b17af275…`; `sha256sum -c` sin diferencias). El programador no tocó ninguna.
- Suman mis dos archivos nuevos, sin rastrear (tabla de arriba): **269** en total.
- `git diff --name-only ea718bc -- backend/test` sigue con los 11 `*.ataque` de los C-n de la ronda 0.

### Cierre de la ronda 1 de 01e
- **Veredicto: ROTO.** 1 hallazgo: **T-01 (media)**, el carácter nulo en `q` de `GET /api/admin/usuarios` da `500`.
- **Remedio esperado (no lo prescribo):** que el `22021` de la lista llegue como `400`, como en el buscador de candidatos, o que el esquema rechace los controles en `q`.
- **Hermanos que el programador debe revisar:** todo término libre que llegue a un `$queryRaw` sin `traducirErrorPrisma`. Hoy, en 01e, solo `q`.
- **Para decidir:** OA-01e-r1-1 (quitar al único activo, N-14).
- **Resiste:** los puntos 1, 2, 3 y 5 a 11, y el resto del 4.
- **Corridas:** los dos archivos, `1 failed | 17 passed (18)`; los módulos de 01e, `1 failed | 1049 passed (1050)`, en 76 archivos; `lint`, exit 0. Todo a batería (85 % a 78 %), sin `beforeAll` vencidos.

## Ronda 2 — ADMIN-01e

Veredicto: **RESISTE.** Sin hallazgos. El remedio de T-01 aguanta los seis puntos de ataque de la verificación (`revision.md:5876`): el nulo en `q` en cada posición, codificación, borde y método; los demás controles, los inversores, los separadores y los bytes que no son UTF-8; el nulo en todas las demás entradas de 01e a la vez; la regresión de la ronda 1; el log del `400` nuevo; y, a batería, ningún `beforeAll` vencido. OA-01e-r1-1 queda fuera de ataque por decisión del humano ("Aceptarla y anotarla").

Plan `7018e1f3…` (comprobado). Corrección del programador: `resumen-programador.md` = `ff4aea30…`, "## ADMIN-01e — Corrección ronda 1" (`:3100`). Verificación del manager: `revision.md:5876`. Base `ea718bc`. El remedio está en `shared/src/usuarios-admin.ts:22` y `:48-58`: el nulo, construido con `String.fromCharCode(0)`, se rechaza en el esquema de `q` con "Los datos enviados tienen caracteres no permitidos.", después del tope de longitud.

Verificación propia (regla "Suites por ronda": los módulos de 01e, mis archivos y las vigiladas, más `lint`):
- **lint del backend:** `cd backend; npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** la lista de 70 rutas del programador (`modulos-01e.txt`, `4605cfa2…`, que trae las vigiladas) más mis cuatro `*.ataque` de 01e: `Tests 1059 passed (1059)`, 78 archivos (abajo).

### Entorno
- Sin otra copia ni otra suite (dato del orquestador). Ningún `node` con `vitest` antes de cada corrida. Docker encendido. Red `uacam5 2`, autorizada hoy.
- **A batería:** `BatteryStatus` **1**, al 60 % (11:55) y al 59 % (11:57). Se corrió igual y se declara. CPU al 38 % y al 16 % al arrancar.
- **N-01e-3 (punto 6):** ningún `beforeAll` venció (corridas de las 11:56:04 y las 11:57:26).
- Sin navegadores. No terminé ningún proceso. No toqué código de producción ni pruebas del programador.
- **Escapes:** en mis archivos nuevos, todo carácter de control, sustituto o invisible se construye con `String.fromCharCode`. Donde se busca el texto escapado del JSON, va con la barra doblada en la fuente. Barrido de los dos archivos: 0 caracteres de las categorías Cc (salvo salto y tabulador), Cf, Zl, Zp, Mn y Cs.

### Hallazgos
Ninguno.

### Atacado sin hallazgos (`usuarios-admin-01e-r2.ataque.test.ts` y `logs-usuarios-01e-r2.ataque.test.ts`)

1. **El nulo en `q` (ADM-T2E01 y ADM-T2E02).** Quince URL, cada una también en `HEAD`: el nulo al final, al principio, rodeado de `+` o de `%20`, solo, tres seguidos y con `rol=estudiante&estadoPago=deudor&limite=1`. Todas dan `400` con un solo mensaje, nunca `500` ni "Error no controlado", y ningún mensaje repite el término ni el nulo.
   - **Bordes:** 119 normalizados más el nulo da el mensaje del nulo. 120 normalizados más el nulo da solo el de longitud, porque la normalización conserva el nulo y son 121; es coherente con el orden del esquema. 1000 crudos con un nulo dentro dan el del nulo, y 1001, solo el de longitud.
   - `q` repetido con el nulo en una de las copias: `400`.
   - En la página 2, con `cursor` y `cursorNombre` válidos y el nulo en `q`: `400` con el texto del nulo; sin el nulo, la misma página da `200`.
2. **Lo que el esquema deja pasar (ADM-T2E03 y ADM-T2E04).**
   - En `q`, al final, al principio y doble en medio: los 31 controles C0 sin el nulo, los 33 de DEL y C1, los nueve inversores, U+2028, U+2029, U+200B, U+200D, BOM, U+FFFD, U+FFFE y U+FFFF. Responden `200` o `400` legible, nunca `500`, y la cuenta se sigue encontrando por su marca.
   - Bytes que no son UTF-8 y sustitutos sueltos codificados (`%ED%A0%80`, `%C0%80`, `%FF`, `%E0%80%80`, `%F4%90%80%80`, `%C3` y `%ED%BF%BF`), en `q` y en `cursorNombre`: `200` o `400` legible, nunca `500`.
3. **El nulo en el resto de 01e, todo a la vez (ADM-T2E05; ADM-T2E06 para los sustitutos).**
   - Dieciséis peticiones en paralelo con el nulo: `nombre` al editar y en el alta, `email` del alta, `motivo`, `cursorNombre` (`400` "cursor: no es válido"), el `:id` de la ficha, de la baja y del acceso, `rol`, `estadoPago`, `limite`, `cursor` de usuarios y de movimientos, `alumnoIds`, el `estadoPago` del lote y `activo` como texto.
   - Las dieciséis dan `400` con mensaje, ninguna repite lo enviado, la cuenta queda igual y el alta no crea nada.
   - Sustitutos sueltos (U+D800 y U+DFFF) en `nombre`, `motivo` y `email` de cuerpos JSON: `200` o `400` legible, sin `500`, y lo guardado no lleva ningún sustituto suelto.
4. **Regresión de la ronda 1:** ADM-T1E01 a ADM-T1E18, en verde dentro de la corrida de módulos. ADM-T1E01, el de T-01, pasó a verde. La contención queda en sus números de siempre (abajo).
5. **El log del `400` nuevo (ADM-T2E07 y ADM-T2E08).** Con `LOG_LEVEL=trace` y el nulo en `q` (al final, al principio, en `HEAD` y junto con un término largo), con la consulta cargada de estado de pago, nombre, correo y cursor:
   - las cuatro peticiones responden `400` y sus cuatro `incoming request` dicen exactamente `/api/admin/usuarios`;
   - ni el log ni las respuestas traen la marca, el nombre, el correo, el cursor, `deudor`, `al_corriente`, `estadoPago=`, `cursorNombre=`, `%00`, el nulo ni su escape JSON;
   - no hay ningún "Error no controlado".
6. **N-01e-3:** sin `beforeAll` vencidos a batería.

### No atacado y por qué
- La petición abortada y el worker, por lo mismo que en la ronda 1.
- La suite completa del backend y la del frontend: las corre el manager al cerrar la subentrega.

### Archivos nuevos (solo `*.ataque`, sin rastrear)

| Archivo | Casos | SHA-256 |
|---|---|---|
| `backend/test/usuarios-admin-01e-r2.ataque.test.ts` | 6 (ADM-T2E01 a ADM-T2E06) | `f7cc197f8c797f4a103cad4b9ddfe2e28b1059cb6efdc1089d7f10268a974846` |
| `backend/test/logs-usuarios-01e-r2.ataque.test.ts` | 2 (ADM-T2E07 y ADM-T2E08) | `8b08c0e62a93288fae34b29944d13e415391b3806643cb1206c56cff7f4ea802` |

Conteo: `npx vitest list` con los dos archivos da 8 casos con "ADM-T2E". El formato lo dejó Prettier, acotado a esos dos archivos. Los de la ronda 1 no cambiaron: `309b944a…` y `9679a4e3…`.

### Corridas (desde `backend/`; una después de otra)

1. **Mis dos archivos nuevos** (11:56:04): `npx vitest run --reporter=verbose test/usuarios-admin-01e-r2.ataque.test.ts test/logs-usuarios-01e-r2.ataque.test.ts` → `Tests 2 failed | 6 passed (8)`. **No cuenta: los dos rojos eran expectativas mías equivocadas.**
   - ADM-T2E01 esperaba el mensaje del nulo con 120 normalizados más el nulo. La normalización conserva el nulo, así que son 121, y el esquema responde, con razón, solo el de longitud. Corregí la expectativa y sumé el borde de 119 más el nulo, que da el del nulo.
   - ADM-T2E05 contaba una cuenta por un correo que no lleva la marca: la cuenta correcta es 0.
   - En los dos casos, el servidor respondió `400` con un solo mensaje y sin `500`.
2. **Módulos de 01e más mis cuatro `*.ataque` de 01e** (11:57:26): `npx vitest run $(cat mod-r2.txt)`, con las 70 rutas de `modulos-01e.txt` (`4605cfa2…`) más `usuarios-admin-01e-r1`, `logs-usuarios-01e-r1`, `usuarios-admin-01e-r2` y `logs-usuarios-01e-r2`.
   ```
    Test Files  78 passed (78)
         Tests  1059 passed (1059)
      Start at  11:57:26
      Duration  132.30s (transform 23.51s, setup 3.66s, import 270.64s, tests 894.00s, environment 49ms)
   ```
   **Contención** (informativo; PA-07 es de la corrida completa del manager):
   - `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0.
   - `"Error no controlado"` 0: los cuatro de T-01 desaparecieron.
   - Ninguna línea con `"statusCode":500`.
   - `"code":"P2028"` 5, todos permitidos: los tres deterministas de `servicio-ocupado` (`POST /api/auth/cambiar-contrasena` `req-1`, `POST /api/auth/refrescar` `req-3` y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` `req-5`) y los dos de `cuentas-r3.ataque` (`POST /api/auth/login` `req-1m` y `POST /api/auth/restablecer` `req-20`).

**lint:** `cd backend; npm run lint` → exit 0, después de la corrida.

### V-01
- Las 267 `*.ataque` rastreadas coinciden con la lista de la ronda 0 de 01e (`b17af275…`; `sha256sum -c` sin diferencias). El programador no tocó ninguna.
- Sin rastrear, mías: las dos de la ronda 1 (`309b944a…`, `9679a4e3…`, sin cambios) y las dos de esta ronda (tabla de arriba). Son **271** en total.

### Cierre de la ronda 2 de 01e
- **Veredicto: RESISTE.** 0 hallazgos. T-01 está corregido, y sus vecinos (posiciones, codificaciones, bordes, `HEAD`, página 2, demás controles, bytes inválidos, el resto de las entradas con el nulo y el log) no dan `500` ni fugan nada.
- **Corridas:** módulos de 01e más mis cuatro archivos, `1059 passed (1059)` en 78 archivos, con la contención en sus números de siempre; `lint`, exit 0. A batería (60 % a 59 %), sin `beforeAll` vencidos.
- **Siguen para 01f:** N-01e-1, N-01e-2, los mensajes de zod en inglés en campos técnicos y el tono del alta.

## Ronda 0 — ADMIN-01f

Veredicto: **LISTA PARA EL PROGRAMADOR** (sin PARADA). Apliqué los C-n que §D-R0 → 01f y el paso "Antes de la ronda 0 de 01f" me asignan:
- C-13 (seis archivos), C-13b, C-14, C-15 y C-16 (seis archivos);
- C-17 y C-17b, y C-35, C-36 y C-37;
- y los de la Enmienda 14: C-43, C-44 y C-45.

Cada rojo es el que el plan espera: falta la interfaz de 01f. C-36, C-43 y C-45 quedan en verde, y la parte `:135-150` de C-35, también. Los módulos de 01f fuera de mis archivos y las vigiladas están en verde, igual que `lint`. La reescritura de C-13 obligó a fijar dos detalles que el plan no escribe: el nombre de la región de la ficha y el texto exacto del estado de la cuenta. Los dejo como observaciones para el arquitecto y el programador (OA-01f-r0-1 y OA-01f-r0-2), con más avisos O-01f-1 a O-01f-9.

Plan: `plan.md` = `7f344f7ab9bab55bd77932e6c7986c1b9b0200ac617a6696799e868d6f7aaa5c` (Enmiendas 1 a 14; comprobado al empezar). Base dentro de los paquetes: `10356bd` (01e). Al empezar, `git status` de `backend`, `frontend` y `shared` estaba limpio. Los 20 archivos de los C-n partían de su hash en `10356bd`, y `features/auth/rutas-ch3-r1.ataque.test.tsx`, del hash de partida de C-45 (`96b6ab55…`, anotado en `aprobacion.md`). Al terminar, `git diff --name-only 10356bd -- backend frontend shared` lista solo esos 20 `*.ataque`.

Leí:
- §D-R0 → 01f, completo, con la lista cerrada, los C-n y las vigiladas de las Enmiendas 1, 2, 9, 10 y 14;
- el paso "Antes de la ronda 0 de 01f" y los pasos 26 a 28b;
- §D-11, §D-12 con T-E14, y "Pruebas requeridas → 01f" (ADM-1F01 a ADM-1F26);
- en `revision.md`, las verificaciones de la Enmienda 14 (`:6183` y `:6362`);
- en `aprobacion.md`, las decisiones del humano (P-E14-1 (a), T-E14 aprobada, R-20 sin partir, "No por ahora") y OA-01f-1.

Verificación propia (regla "Suites por ronda": los módulos de 01f, las vigiladas y `lint` del frontend):
- **lint del frontend:** `cd frontend; npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores.
- **test:** las tres corridas de abajo. 01f no toca el backend ni `shared/`, así que no corrí nada del backend ni hay PA-07.

### Entorno
- Sin otra copia ni otra suite (dato del orquestador). Ningún `node` con `vitest` antes de cada corrida. Red `uacam5 2`, autorizada hoy.
- **Energía:** `BatteryStatus` **2** (corriente), del 97 % al 98 %. CPU al 31 % y al 26 % al arrancar.
- Una corrida después de otra. Sin navegadores. No terminé ningún proceso.
- La corrida de los módulos pasó a segundo plano a los 180 s, por el tope de la herramienta. No lancé nada más hasta que terminó.
- **Escapes:** ningún C-n necesitó caracteres invisibles. Un barrido de los 20 archivos da 0 caracteres de las categorías Cc (salvo salto y tabulador), Cf, Zl, Zp y Cs.
- **Formato:** Prettier (`npx prettier --write`) solo sobre los 20 archivos de los C-n.

### Cambios (solo los C-n de 01f)

Rutas relativas a `frontend/src/`. El hash de antes es el de `git show 10356bd:<ruta>`, igual al del árbol al empezar.

| C-n | Archivo | Cambio | SHA-256 antes → después |
|---|---|---|---|
| C-13, C-13b, C-44 | `features/admin/cuentas-r1.ataque.test.tsx` | Reescrito sobre la ficha: monta las `rutas` reales en `/admin/usuarios/:usuarioId`. El doble responde `/api/me` (admin), `GET /api/admin/usuarios/:id` (la fila, `404`, o `400 VALIDACION` para `abc`), la tabla y los enlaces de `/admin/maestros`. Las equivalencias de cada caso van en el comentario del archivo y en la nota de abajo. Cambian tres casos: "no hay ninguna consulta al montar" pasa a "solo se pide la cuenta, ninguna petición de restablecer ni de corregir"; "Cuenta inactiva con icono" pasa a «Desactivada» dentro de la región (T-E14); y los tres de "Invitar maestro" pasan a `/admin/maestros`. C-44 cambia la descripción del nombre de solo espacios a "Escribe el nombre completo". C-13b: `infractores(/components\/ui\/dialog/).sort()` igual a los dos diálogos. 29 casos | `7d080037d9a64eebcebb789d1dfd94b787652103e6f9c84f968f9c9f64c3b30c` → `4ca7d89e612f9442c7abff9587312a0f36c4ac09ec0e0dd29b6d1c518affd6fb` |
| C-13 | `features/admin/cuentas-r2.ataque.test.tsx` | Igual, con un preámbulo común: monta en `/admin/usuarios` y cada caso abre la ficha que necesita. "Buscar a Beto" es abrir su ficha. "Una búsqueda rechazada" es `/admin/usuarios/abc`, y su conteo de búsquedas pasa a conteo de correcciones (no sale ninguna). "Nombre completo" pasa a "Correo correcto". Mismos 12 casos | `b948e9359fd3981e08b850540027f536f345a3f48d7c0749ba0c16c2c1df1184` → `cfb224f2b70b6dd1d2e265a86abb349b366ad29a97a76e6dc9788686800359b6` |
| C-13 | `features/admin/cuentas-r3.ataque.test.tsx` | Igual. El "campo de búsqueda" donde debía quedarse el foco es el enlace "Usuarios" de la barra, que sigue montado al cambiar de ficha. `buscarConEnter` enfoca ese enlace y abre la ficha sin moverlo. Mismos 18 casos | `72bf9af4ce8f52a114897e038cefb0947841a37f74074f4c5f8dec68a71b654a` → `bdddceef580541e17c1bc6aaf1c8f0cd22f28fbd3f6d434cafedc0f7014c5413` |
| C-13 | `features/admin/cuentas-r4.ataque.test.tsx` | Igual que r3. Mismos 13 casos | `942df3015424aed56e83661993ba015e871cd6be8e797920d47e8cbf0c56eac4` → `3ba845a67131b3a400d96ac8a4d692f447d0517187c1de8f49a55e51c5f6f3f7` |
| C-13 | `features/admin/en-espera-r1.ataque.test.tsx` | Igual. Sale el bloque de «Buscar» (dos casos), porque el botón se borra; la espera de los botones nuevos la cubren ADM-1F05 a ADM-1F09 y V-06 (C-17). "Enviar invitación" pasa a `/admin/maestros`, y su éxito se busca por el texto "Invitación creada." en lugar de un único `role="status"`. 8 casos (antes 10) | `3bd26e7e3bf019d462db4837861ed22017bbb9e9a6276720bf0dea6c2b5b0998` → `bfff614cd9c0b8701b5e4dfa733f77071d1a1440a3505b1d91fd7db188602ff0` |
| C-13 | `features/admin/foco-r1.ataque.test.tsx` | Igual que r3. "Escribir en 'Correo exacto de la cuenta'" pasa a "Correo correcto", y "salir a 'Buscar'" pasa a "salir al enlace 'Usuarios'". Mismos 12 casos | `8219c864e7bdc1315e6a0f0ff1cd6f54e4710cebdceb8e316f4e53aacc0cff35` → `99356742d1a8680fbfdf79835ce4b5f76ec8f787c6e2c0bb83a26ea92f5065b1` |
| C-14 | `features/admin/errores-ch3-r1.ataque.test.tsx` | Sale el import de `BuscadorDeCuenta`, el control "buscar una cuenta" y su fila de `CON_ERROR_LOCAL` (`:685`; sin ella no compila, por el `satisfies`). Los demás controles, los de la ficha incluidos, siguen con sus props de hoy | `c21edb5a06b43808ce2be23058409b7ff887e66d60e842c500a3714a90ebcb25` → `a315d8e091745c492d71d1c27fe36cc55e6ab773e92556e9910ea250bc747885` |
| C-14 | `features/admin/secuencias-ch3-r2.ataque.test.tsx` | Sale el import (`:12`), el bloque `:517-…` de `BuscadorDeCuenta` (tres casos), `RUTA_BUSCAR` y `TEXTOS_CUENTAS` del import de `./data`, que quedaron sin uso | `14ead3dce027b433d51a9d635b0fa35718ee3875bffc3e1949f96ecb8d2f7135` → `4ec1f5c2cbe5326a64ec17e91ddb5c4d92ead2dcaa275dfc18766cdbfbda5651` |
| C-15 | `features/admin/rutas-ch3-r1.ataque.test.tsx` | "Cuentas" pasa a "Usuarios" en `enLaBarra` y en `Control`. "Invitar maestro" pasa a `/admin/maestros`. El doble responde `GET /api/admin/usuarios` en lugar de `POST …/buscar` (`:89`). Sale el control "buscar una cuenta", y la búsqueda pasa a la tabla: un bloque nuevo (tres casos) con el `400` en blanco en la primera carga, el texto fijo de la tabla y sus caminos (pulsar «Usuarios», ir a «Maestros» y volver, atrás y adelante), sin «Reintentar» (ADM-1F17). 19 casos | `761f54f183540d8ae222f97940fa6c2355ff33e515771e627f8efde49261eda2` → `122a11a407732dd48444b2ff42f1146f7467109418ca23cace9b3608518349c8` |
| C-16 | `app/contexto-r1.ataque.test.tsx` | `:100`: el encabezado de `/admin` es "Inicio" | `e85743c0fbb8e476874a2c67334342d8d69d14153579fc1e4cce0ae6e2b29616` → `c7c3d8bf1b66d3caa13da487524720b885d6709f219f7c39c03aba3dbce266e8` |
| C-16 | `app/cuentas-r1.ataque.test.tsx` | `:149`: "Inicio" | `68fb5d092c0c8ecfcf282477ef023aaae26f6b869656e05109dc3efa276d842a` → `70cff6d769f32c18b1071a6d91be53d0c48561ac9327cd8a9add544b1df593a4` |
| C-16 | `app/marco-r1.ataque.test.tsx` | `:158`: identidad "Inicio". `:327-329`: destinos `/admin`, `/admin/usuarios`, `/admin/maestros` y `/admin/clases`, con los textos "Inicio", "Usuarios", "Maestros" y "Clases" | `57cb54afd3b79464f0df01b88fc388cebbeac5657d936c4c204cbae6034b0834` → `d2f04fa7e713adf0339b756c4c5665a6907c488ad2d2779f9b8668b34d3e8548` |
| C-16 | `app/errores-r1.ataque.test.tsx` | "Enviar invitación" pasa a `/admin/maestros`, con `llamadas: 3`: refrescar, `/me` y la lista de enlaces que esa vista pide al montarse; ninguna del formulario. Sale la fila "Buscar". Su búsqueda pasa a un caso nuevo: el buscador de `/admin/usuarios` con un término de 121 caracteres queda `aria-invalid`, descrito por su `ErrorDeCampo` con icono, y no sale ninguna petición con `q` | `db48dad405c27062621a44d3744c84cc5903892a51e5a8df18f41383cb9c88a3` → `979a51e637568945739f1b274bfdf0f579654b34ffec158b5ccec7ccfc82fc1c` |
| C-16 | `app/rutas-02c-r1.ataque.test.tsx` | `:219` `["/admin", ["Inicio"]]`; `:238`, enlaces Inicio, Usuarios, Maestros y Clases; el título dice «Inicio» | `f0657fb91f7b3accf64726292f9324c6742c1ac537c6c4a1985ec4e32ae09c83` → `f38a09885c99f96df01ff33c639c4755c83bbb0635765bea5e75eb158d68b54a` |
| C-16 | `app/registro-maestro-03b-r1.ataque.test.tsx` | `:219-236`: "Inicio" no activo y "Usuarios" en la lista | `0eefed2c05d76b0790a437e9465a898a9076083b1f046f8785145cfaad0da379` → `75c4f15817399d624382c0148564f3d56003bedba76f226a9cfe2f5f477e8e53` |
| C-17, C-17b | `styles/clases-r1.ataque.test.ts` | V-06 de 78 a 85: sale `buscador-de-cuenta.tsx`, entran las diez entradas del plan. V-07: `vidrio-fuerte` suma `estado-de-pago-de-cuenta.tsx` entre `button-variants.ts` y `panel-anuncios.tsx` (13 rutas); `data-material|data-densidad` suma los dos diálogos, en el orden del plan | `537e10bc0519805f2be98ff579b34c71eda6fa7d364e355bfbd0050f568ffcb6` → `5f5f08727dbf88c03578eff79ef6eef07136e3524ad63df81d2461d6b618637b` |
| C-35 | `lib/estatico-ch3-r2.ataque.test.ts` | `CON_REF` con `formulario-corregir-correo.tsx`: entre `evento.preventDefault()` y la guarda `isPending` va exactamente una línea `if (\w+Ref.current) return`; en los otros nueve, la expresión de siempre. `REINICIAN_EN_01F` con los cuatro formularios nuevos se suma a los excluidos de `:135-150` | `a9529cefbd27cbb94376a6548ef1b8b247fb1f4155938298ae5d10eaee81008a` → `9e897a6629f845a19ef425f2e70755dd3875af905dc8fe803fe80b5467b48e7c` |
| C-36, C-43 | `lib/estatico-ch3-r1.ataque.test.ts` | `permitidos` suma las siete mutaciones y las tres consultas de 01f, los textos fijos con claves anidadas y la forma `textoParaTerceros(mensajeDeErrorAdmin((editar\|alta\|invitar).error))`. `usos.length >= 18` no cambia | `66513d957e524af5e336a2c7e656df37f51106507a3984b691df47cd825d4d10` → `c5b7e7278e7e2e8d49cfc702c545cdafb46f59ccfd362692c402d93984ee2dec` |
| C-37 | `services/apiClient-ch3-r1.ataque.test.ts` | El título nombra a admin y `usan` empieza con `["/src/features/admin/lib.ts", true, false]` | `b6265bf6eec25b7f2c34dcd93dd4d8b23d07ca6214576921a50a66ff16346ffb` → `a33ececc9261e00f0e32d243596a6d4b541a1b61b56d45d33bd54bfde4589deb` |
| C-45 | `features/auth/rutas-ch3-r1.ataque.test.tsx` | Una sola rama nueva en `exito`, antes de `if (metodo !== "POST") return null`: `GET /api/admin/resumen` responde `200 { alumnos: 0, maestros: 0, clasesActivas: 0 }`, con su comentario. Nada más cambia: `git diff -U0` da un solo hunk de inserción, sin borrados | `96b6ab55f0a7bf9b66f8edbcb5ceffa7e4fe35935c6cb12ecab93fc04bc02856` → `338054857e30fb01ed88e6ce27692298090f161f94888b8999e75c96e8b216dd` |

**Donde me aparté de las líneas exactas del plan, y por qué** (no cambia lo que se protege):
- **C-14:** sale también la fila "buscar una cuenta" de `CON_ERROR_LOCAL` (`errores-ch3-r1:685`), porque sin ella el archivo no compila. En `secuencias-ch3-r2` salen dos constantes que quedaron sin uso, porque `lint` falla con ellas.
- **C-15 y C-16 (errores-r1):** el plan dice que "Buscar" pasa a la búsqueda de `/admin/usuarios`. Esa búsqueda no se envía ni tiene «Reintentar», así que la fila de la tabla común no se puede expresar.
  - En C-15 la cubro con un bloque aparte, con sus tres caminos (ADM-1F17 (a), (b) y (e)).
  - En C-16 la cubro con un caso aparte: el campo inválido por el tope de 120, descrito por su `ErrorDeCampo` (§D-11, "Enmienda 14").
- **C-13:** el plan pide que los seis archivos pasen a montar la ficha. Por eso cambié también los ayudantes y los casos que dependían del buscador: "no hay consultas al montar", la búsqueda rechazada, el foco en el campo de búsqueda y el bloque «Buscar» de `en-espera-r1`. Cada sustitución está en el comentario de cada archivo.

### Corrida de los C-n (rojo y verde esperados)

Comando, desde `frontend/`: `npx vitest run` con los 20 archivos de la tabla.

```
 Test Files  16 failed | 4 passed (20)
      Tests  121 failed | 567 passed (688)
   Start at  13:37:36
   Duration  96.23s (transform 30.40s, setup 13.93s, import 28.10s, tests 457.49s, environment 67.51s)
```

Primer error de cada caso en rojo (sin colores):
- 61 × `Unable to find role="navigation" and name "Navegación principal"`. Son los casos de C-13 que montan `/admin/usuarios`: la ruta no existe y cae en la pantalla de "no encontrada", sin el marco.
- 21 × `Unable to find role="region"` con el nombre de la cuenta (Carla, Beto, Administración): la ficha no existe.
- 9 × `Unable to find role="button" and name "Enviar invitación"`, en `/admin/maestros` (C-13, C-15 y C-44); 1 × `role="form" … "Enviar invitación"` (C-16, `errores-r1`).
- 3 × `role="heading" … "Inicio"`, del dashboard (C-16: `contexto-r1`, `app/cuentas-r1` y `marco-r1`).
- 3 × "No pudimos cargar los usuarios. …" (bloque nuevo de C-15).
- 2 × `link … "Usuarios"`, en la barra (C-15, "ir a la otra sección").
- 1 × `label … "Buscar por nombre o correo"` (caso nuevo de C-16).

Aserciones:
- **C-16:** `rutas-02c-r1` (9), `registro-maestro-03b-r1` (1) y `marco-r1` (`:357`, los destinos) dan `expected [ [ 'Cuentas', … ] ]` contra la nav nueva.
- **C-13b:** `expected [] to deeply equal [ …(2) ]`.
- **C-17:** `expected [ …(78) ] to have a length of 85`. **C-17b:** `expected [ …(12) ] to deeply equal [ …(13) ]`; la aserción de `data-material`, en el mismo caso, no llega a correr.
- **C-35:** solo el caso de `formulario-corregir-correo.tsx` (`expected 'import { corregirCorreoSchema } from …' to match /evento\.preventDefault…/`). `:135-150` queda en verde.
- **C-37:** `expected [ [ …(3) ], [ …(3) ], [ …(3) ] ] to deeply equal [ …, …(1) ]`.

Por archivo: `cuentas-r1` 25 de 29 en rojo (los cuatro estáticos, en verde), `cuentas-r2` 12/12, `cuentas-r3` 18/18, `cuentas-r4` 13/13, `en-espera-r1` 8/8, `foco-r1` 12/12, `rutas-ch3-r1` 13/19, `rutas-02c-r1` 9/61, `marco-r1` 2/28, `errores-r1` 2/7, `contexto-r1` 1/12, `app/cuentas-r1` 1/24, `registro-maestro-03b-r1` 1/11, `styles/clases-r1` 2/11, `estatico-ch3-r2` 1/16 y `apiClient-ch3-r1` 1/18.

**En verde, como dice el plan:**
- C-36 y C-43 (`estatico-ch3-r1`, que hoy cumple `usos.length >= 18`);
- C-45 (`features/auth/rutas-ch3-r1`: con `10356bd` el dashboard todavía no existe, y la rama no se usa);
- C-14 (`errores-ch3-r1` y `secuencias-ch3-r2`: sin el buscador, lo demás sigue igual);
- `:135-150` de C-35.

Ningún rojo viene de otra causa que la interfaz que 01f debe construir.

### Módulos de 01f (línea base con el código de hoy)

Comando, desde `frontend/`: `npx vitest run src/features/admin src/components/foco src/features/clases`

```
 Test Files  7 failed | 124 passed (131)
      Tests  101 failed | 2960 passed (3061)
   Start at  13:40:00
   Duration  201.83s (transform 36.81s, setup 102.36s, import 254.59s, tests 1335.31s, environment 447.90s)
```

Los 101 rojos son exactamente los de mis C-n de `features/admin`: `cuentas-r1` 25, `cuentas-r2` 12, `cuentas-r3` 18, `cuentas-r4` 13, `en-espera-r1` 8, `foco-r1` 12 y `rutas-ch3-r1` 13. Ninguna prueba normal ni otra `*.ataque` de los tres módulos cae. Entre ellas están:
- en `features/admin`: `cuentas-view.test.tsx`, `formularios-ch3.test.tsx` y `errores-ch3.test.ts`, de la lista cerrada; y las vigiladas `maestros-view.test.tsx`, `maestros-03c-r1` y `maestros-03b-r1`;
- en `features/clases`: `clases-admin-01c-rutas.test.tsx` (lista cerrada `:269` y `:390`, y vigiladas `:270`, `:286` y `:391`) y las vigiladas `clase-archivada-01d2-vista.test.tsx`, `personas-view.test.tsx`, `foco-pestana-02d-r3`, `estatico-02c-r1`, `refactor-01c-r1`, `ver-mas-01e-r3`, `inicio-sin-datos-02c-r1`, `inicio-sin-datos-r2` y `lib.test.ts`;
- en `components/foco`: `foco-01d.test.tsx` y `foco-01d-r1`.

### Vigiladas fuera de los módulos (línea base)

Comando, desde `frontend/`: `npx vitest run` con `src/app/barra-02d-r1.ataque.test.tsx`, `src/features/auth/secuencias-ch3-r2.ataque.test.tsx`, `src/features/auth/errores-ch3-r1.ataque.test.tsx`, `src/app/router.test.tsx`, `src/app/marco.test.tsx`, `src/app/en-espera-r1.ataque.test.tsx`, `src/app/fondo-r1.ataque.test.tsx`, `src/app/router.ataque.test.tsx`, `src/features/calificaciones/estatico-01d.test.ts`, `src/services/apiClient-ch3.test.ts`, `src/features/tareas/como-se-entrega-01a.test.tsx`, `src/features/tareas/entregas-01d-r1.ataque.test.tsx`, `src/features/calificaciones/estatico-01d-r1.ataque.test.ts`, `src/features/auth/establecer-contrasena-view.test.tsx`, `src/app/fondo-de-la-app.test.tsx`, `src/components/layout/contenedor-rol.test.tsx` (lista cerrada), `src/lib/errores-de-api-estatico.test.ts` (lista cerrada) y `src/lib/errores-ch3-r2.ataque.test.ts`.

```
 Test Files  18 passed (18)
      Tests  779 passed (779)
   Start at  13:43:42
   Duration  40.20s (transform 33.90s, setup 13.11s, import 45.87s, tests 140.78s, environment 57.26s)
```

Las vigiladas de `app/marco-r1` y `app/contexto-r1`, y `lib/estatico-ch3-r1` (`:96-170`), corrieron dentro de sus archivos de C-n: sus casos vigilados están en verde.

### Observaciones para el arquitecto (no bloquean; detalles que la reescritura de C-13 tuvo que fijar)

- **OA-01f-r0-1. El nombre de la región de la ficha.** E-24 y §D-11 piden una `section` con `aria-labelledby` de su `h2`, pero no dicen qué dice ese `h2`. Las seis reescrituras de C-13 buscan la ficha con `getByRole("region", { name: <nombre de la cuenta> })`, porque es lo único estable que nombra a la cuenta. Si el arquitecto o el programador eligen otro encabezado (por ejemplo, "Cuenta de Carla Ruiz"), hace falta un C-n que cambie solo el ayudante `fichaDe` y `abrirFicha` de esos seis archivos. Conviene confirmarlo antes del paso 27.
- **OA-01f-r0-2. El texto del estado de la cuenta en la ficha.** T-E14 fija "Cuenta" con "Activa" o "Desactivada". `cuentas-r1` exige, en la ficha de una cuenta dada de baja, un nodo de texto exactamente "Desactivada" dentro de la región y ningún "Activa". El caso de antes ("Cuenta inactiva", con icono) desaparece si `FichaDeCuenta` deja de pintar esa línea. Si la conserva, no choca.

### Observaciones para el programador (trampas; no son hallazgos)

**O-01f-1 (C-13, la ficha).**
- Ruta `/admin/usuarios/:usuarioId` que pide `GET /api/admin/usuarios/:id`.
- La región con nombre igual al nombre de la cuenta (OA-01f-r0-1). Dentro de ella: `FichaDeCuenta`, con "Restablecer contraseña", "Sí, restablecer", "Cancelar", "Copiar", "Correo correcto" y "Guardar correo", con sus textos de hoy.
- El `404` y el `400 VALIDACION` de la ficha dan "Esa cuenta ya no existe." (ADM-1F26). El `404` de la mutación de restablecer sigue dando "No hay ninguna cuenta con ese correo.": `MENSAJES_ERROR_ADMIN` no cambia, y `cuentas-r1` lo comprueba.

**O-01f-2 (C-13, la temporal entre fichas).** Abrir otra ficha, volver a la tabla y regresar, o abrir `/admin/usuarios/abc`, quita la temporal de la pantalla y de la caché de mutaciones, también con el restablecimiento en vuelo (ADM-1F10). Con la vista desmontada, la respuesta tardía no escribe en la consola ni lanza.

**O-01f-3 (C-13, el foco al abrir una ficha).**
- Abrir una ficha con el router (como hace el enlace "Ver") no mueve el foco: `cuentas-r3`, `cuentas-r4` y `foco-r1` lo dejan en el enlace "Usuarios" de la barra y comprueban que siga ahí, también con `<StrictMode>`.
- Ninguna ficha nueva enfoca «Copiar» ni «Cancelar» al montarse. "Correo correcto" está fuera de la raíz de `AccionRestablecer`: escribir ahí con la petición en vuelo conserva el foco.

**O-01f-4 (C-13, corregir el correo).** Tras corregir, ninguna parte de la región muestra el correo anterior: ni el dato "Correo" de la vista ni el de `FichaDeCuenta` (`cuentas-r1` y `cuentas-r2`). Una corrección que termina con la ficha de otra cuenta en pantalla no la cambia.

**O-01f-5 (C-13, C-15, C-16 y C-44, "Invitar maestro" en `/admin/maestros`).**
- "Nombre completo", "Correo" y «Enviar invitación» siguen con esos nombres, y el éxito sigue diciendo "Invitación creada. …".
- `app/errores-r1` cuenta exactamente 3 llamadas al montar `/admin/maestros`: refrescar, `/me` y `GET /api/admin/enlaces-registro`. Una consulta nueva al montar esa vista la pone en rojo.
- El nombre de solo espacios se describe con "Escribe el nombre completo" (C-44, `textoParaTerceros`).

**O-01f-6 (C-15, la tabla).** Con un `400 VALIDACION` en blanco en la primera carga, la tabla muestra "No pudimos cargar los usuarios. Revisa tu conexión e inténtalo de nuevo.", nunca el genérico de las acciones ni ningún aviso. La recuperan los tres caminos del bloque nuevo: pulsar «Usuarios» estando ahí, ir a «Maestros» y volver antes de 30 s, y atrás y adelante. Al recuperarse, la fila de la cuenta se ve.

**O-01f-7 (C-16, el buscador).** La etiqueta es "Buscar por nombre o correo" (T-E14). Con 121 caracteres, el campo queda `aria-invalid="true"`, con un `aria-describedby` que apunta a un nodo con exactamente "La búsqueda no puede tener más de 120 caracteres" y un `svg` `aria-hidden` (`ErrorDeCampo`), y no sale ninguna petición con `q` (ADM-1F21 (c)).

**O-01f-8 (C-45 y las vigiladas de `/admin`).**
- El dashboard pide solo `GET /api/admin/resumen` al montarse: cualquier otra petición en `/admin` va a `inesperadas` en `features/auth/rutas-ch3-r1`.
- `app/contexto-r1:103` exige más de cinco controles (botones, campos y enlaces) en `/admin`, dentro del contexto opaco y denso. El `h1` es "Inicio" (C-16).

**O-01f-9 (C-13b, C-17, C-17b, C-35 y C-37, estáticas).**
- Solo `dialogo-dar-de-baja.tsx` y `dialogo-restringir-acceso.tsx` nombran `components/ui/dialog`, también en comentarios.
- V-06 suma exactamente las cifras del plan. Cuentan por archivo, y "Cargar más usuarios" va en `usuarios-view.tsx`, no en `tabla-de-usuarios.tsx`.
- `vidrio-fuerte` solo en `estado-de-pago-de-cuenta.tsx`; los atributos del contexto, solo en los dos diálogos.
- La línea de la ref de `formulario-corregir-correo.tsx` va entre `evento.preventDefault()` y `if (corregir.isPending) return`, y la de T-05 queda inmediatamente después.
- `features/admin/lib.ts` importa `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` de `@/services/apiClient`.

### No atacado y por qué
- **El código de 01f:** todavía no existe (ronda 0). Los puntos de ataque y los casos ADM-1F01 a ADM-1F26 van en la ronda 1.
- **La suite completa del frontend y el backend:** las corre el manager al cerrar la subentrega. 01f no toca el backend ni `shared/`.

### V-01: SHA-256 de todas las `*.ataque` (base para el programador de 01f)

Son 271 archivos: 105 del backend y 166 del frontend, todos rastreados (`git ls-files`; ninguno sin rastrear). Es el mismo conjunto que en `10356bd` (`git ls-tree -r 10356bd`, 271).

- **Comprobación de entrada:** antes de tocar nada, `git status` de los paquetes estaba limpio, así que las 271 coincidían con `10356bd`.
- **Después de los C-n:** comparé las 271, una por una, contra `git show 10356bd:<ruta>`. Solo cambian las 20 de la tabla "Cambios"; las otras 251 son idénticas a `10356bd`.
- **Formato:** `<hash>  <ruta>` (dos espacios), en el orden de `git ls-files`.
- **Lista:** `sha256sum` de la lista de abajo en ese formato, con salto de línea final: `b111a913a4ba87376a96c1744d449f38e467e1c115d0102798cec6308246fce0` (271 líneas; comprobada con `sha256sum -c`).

```
65c1d9d9e6cea8ba8cf98bc522c6ba6d7122376d0201ccf3fc3048d24b60543f  backend/src/adapters/storage/objetos-r1.ataque.test.ts
935a721160f978e35d45d2c9392fe8cb169fae32f43b9df583bda46215707e22  backend/src/adapters/storage/objetos-r2.ataque.test.ts
bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671  backend/src/config/correo.ataque.test.ts
dcb78d222544e8dc4fbece59468f555b04abe971b70016e9bb17fcae3e958580  backend/src/config/env.ataque.test.ts
71e7f049447d2d1ecedd897c55ea0b6d31221753f0a7e7473c7ac6e8667f0a95  backend/src/config/logger.ataque.test.ts
91f620c1a27778eebc2bed5eec1bc9b0e3fe1199b32ed00f9dd910011d6a1805  backend/src/core/clases/codigo-r1.ataque.test.ts
262691f5786ad63b2393d0ba5ff97538f6dacf43343bed019ad23c12a07d8686  backend/src/core/clases/codigo-r2.ataque.test.ts
e769cbfcc3a83a64b51c6437f80684640a7c928ad6b8c5c1671fdff005d7b734  backend/src/workers/ritmo-03c-r1.ataque.test.ts
294be1af0bf69d6c05f54e2f0d8e587c78a5527d0b64d1a224c058e31ce013d0  backend/test/admin-muro-02b-r1.ataque.test.ts
388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85  backend/test/admin-unico.ataque.test.ts
d2cc28b62bf988ae14ba975a9bc8d534aec0eebce30da93d7ded9a26026b0857  backend/test/alumnos-b-r1.ataque.test.ts
00346d471355abc7971b921649e7192b8987fe27912c00cb7e41aef2065369e9  backend/test/alumnos-b-r2.ataque.test.ts
fc11ab4b914d4a88612953f82db354e2b9cea9bef86e24321ef7e031f3ac3837  backend/test/alumnos-b-r3.ataque.test.ts
e75114dc84a076b8f0a3471bacdb63175adbb62223dd041039992c2348eee438  backend/test/api-real.ataque.test.ts
f76ce52002e295f2bda6e7a7a7f796415e08013e6d4c1fbe2c9c686671fe8252  backend/test/archivos-d-r1.ataque.test.ts
1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9  backend/test/archivos-d-r2.ataque.test.ts
42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612  backend/test/arquitectura-cuentas-r1.ataque.test.ts
38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716  backend/test/arranque-r1.ataque.test.ts
2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c  backend/test/auth-login.ataque.test.ts
73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e  backend/test/auth-registro.ataque.test.ts
6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713  backend/test/autoria-02b-r1.ataque.test.ts
3520057d0f1a27739eaa701aacd9c18d5c0728fc6a3d55374f43f63a5e6f5336  backend/test/borrado-duplicado-r1.ataque.test.ts
b8fc0db0ea3ec7ff2b89cd9e345c57a9b4ef73afe16fb1aa3e6fdf73c27c16a1  backend/test/borrado-duplicado-r2.ataque.test.ts
5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9  backend/test/calificaciones-01a-r1.ataque.test.ts
afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc  backend/test/calificaciones-01a-r2.ataque.test.ts
dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416  backend/test/calificaciones-carreras-01a-r1.ataque.test.ts
b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07  backend/test/calificaciones-estatico-01a-r1.ataque.test.ts
29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869  backend/test/calificaciones-estatico-01b-r1.ataque.test.ts
6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e  backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts
6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db  backend/test/categorias-01a-r1.ataque.test.ts
f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2  backend/test/clases-archivadas-r1.ataque.test.ts
62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933  backend/test/clases-archivadas-r2.ataque.test.ts
95bba9bac44366ad5a361e93dd2f278cb0a1cc889fa479049acc7b45a9a5e71b  backend/test/clases-r1.ataque.test.ts
a87817d56c236c0ba3597214cac23b10483bbc28ae44800c592ed5ce2ef97f38  backend/test/clases-r2.ataque.test.ts
72de7d8af3d3f772abc19db065f6e418f6eb76ce78d87fe6ebb51335fc99825a  backend/test/clases-r3.ataque.test.ts
be97c4e48ac9551bed1d01552e90ab8cdf085cf928ae6c8c3d81809e35f7ce62  backend/test/clases-r4.ataque.test.ts
000ec9008c73d25121c82a46f5ea0f67e6c8c387cb04e361ef82812b57956098  backend/test/concurrencia-02a-r1.ataque.test.ts
530546b4d70a2b9ad36f98f37e2af45480e81a1101ee3516d15426f78350bf82  backend/test/cuentas-03a-r1.ataque.test.ts
6303ddc170545f616c66773c3f5475cb3be1fea9347d8059354d6ade8d676c16  backend/test/cuentas-r1.ataque.test.ts
3a4e81c111b8eeb7df065804aa85062fa3fc607f0147149b71ac21c14e7818d9  backend/test/cuentas-r2.ataque.test.ts
f54f79f7b2a83e95fe440053ccaf15cb3ebb01ce5dfd4c6655e22159a5fd7e6b  backend/test/cuentas-r3.ataque.test.ts
a2f9bff596330a7d55d1ca9d47197fc831eb132f52c759610e2d667895c3332f  backend/test/cuerpos-02a-r2.ataque.test.ts
4ea45eaa95c5ea2e1ec91e04d2bba32689a30bd341ade16625b28aabdb96d6d9  backend/test/dudas-clases03b-r1.ataque.test.ts
d7a9da854ce8ab8ad8d2437db2e8c2a642a777ea3261a6b038da28be022df848  backend/test/enlaces-03b-r1.ataque.test.ts
dc1b7ee7ea58966f5db33ccb4581885a9669dea2263954ae46d17a83e1ef6eaf  backend/test/enlaces-03b-r2.ataque.test.ts
b051b1986496e35e3e306c4c6bc306a763542bca4b350574d0c02e2c484deb35  backend/test/enlaces-ch-r2.ataque.test.ts
d28cc4de621a680e6b54b2bff889700300d558ec7849717584518d2f03ec8cae  backend/test/entorno-ch-r1.ataque.test.ts
47b02c6d3916713bf9236a619fdb59a641d2e805f1f0b7e9b2c161fe719ddc3a  backend/test/entregas-01b-r1.ataque.test.ts
5baaf6f8fb76320620ed4a84efaca2b2d473460f62360e0d48738b97a0ac584a  backend/test/entregas-01b-r2.ataque.test.ts
885668a621af11f17b4ac706db705aef33231b7773e4783147d21b318bdd0f9a  backend/test/exportacion-02a-r1.ataque.test.ts
ba1ac9b17cc9bf747522bd4ec8b87df436008482e643b18eea8e9a8c041c59b3  backend/test/formada-ch-r1.ataque.test.ts
f12aef58da6e9c1efb134c8667b8c6ee8cde3401c9ff6b444164882f664a225e  backend/test/gestion-02a-r1.ataque.test.ts
e4e9365ea010f3f670b6c1194d1a592e95db43bff0496d4ea1646fc5225ca8b4  backend/test/gradebook-01b-r1.ataque.test.ts
5f4133f949d2f337a8f63b75cf82cb77114db7812d67c1960105f5000c31a326  backend/test/guarda-ch-r1.ataque.test.ts
7a7dac6d87edf81059fcff9c07471aaf49d690ec159be4b9fd4aa32b0909a215  backend/test/guarda-ch-r2.ataque.test.ts
610ee44e5d0bcea46eb4e3645f9adf1998a76947a25af7e3f8248ea3a633df79  backend/test/guarda-ch-r3.ataque.test.ts
e5d149f3ac52b726e1fe08908249706341330f88eaa6674b9a9ac67b98b1e864  backend/test/guarda-clase-r1.ataque.test.ts
c979d2c9c420a2177fa6ebddb78eb2ce84d5f043b94270f690916a6fc75d6f8f  backend/test/guarda-clase-r2.ataque.test.ts
20982e2b98f1b162146a211923f3d5ec19d4e170c4aa3a5bfc6f82c3b6173aad  backend/test/guarda-r2.ataque.test.ts
2649f3d357dcb806361ac101c57fcb504b9c798b631048f0b3e200f63da7dc30  backend/test/hilo-01c-r1.ataque.test.ts
2d2216ee9db290b318825a6f73c346d4767cacc12d95f5ca76457a78b63fedc3  backend/test/instantanea-01b-r1.ataque.test.ts
a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a  backend/test/intentos-r2.ataque.test.ts
2619b44eea3370494c95ac128fcfd9e3ffc20d1581a19f549bf371f603a11d7d  backend/test/invitacion-flujo-03a-r2.ataque.test.ts
704155928183aec193ae7e157b86b3e9361d2b63c7a47be1ed859605fab4ffa6  backend/test/invitacion-masiva-03c-r1.ataque.test.ts
dd9b7454e8786bf0b833d265900ccaecf595808cebc8e9a77c9aef15298a1038  backend/test/invitacion-masiva-03c-r2.ataque.test.ts
e3e7d53e2cec2d70e5321d2452939a5e9d71dbe5421b1e6856beb3c8e1bf4e56  backend/test/lecturas-fx-r1.ataque.test.ts
b008263d6fac9b031bdb03251da25545611f863d0cf405de21fa4514caff60ea  backend/test/lecturas-fx-r2.ataque.test.ts
f9f9ec59ec8d1a5ccb180522798140c45604440f48edcd68a3e02863d90ae347  backend/test/logs-02a-r1.ataque.test.ts
a2006c163d9e6cd3e4a2a773d1501826daf3c8e7bb184d205bfc6442318fb59c  backend/test/logs-02b-r1.ataque.test.ts
01ad4e952282047f4826d6d86fc21fd464143752c8d8901b4063607930d9c1d5  backend/test/logs-03a-r1.ataque.test.ts
3a626786bdb37eb05744b50c9c2c03b4037bf947991a9905f015ca04560464a0  backend/test/logs-03b-r1.ataque.test.ts
9f0f965dac2650b722520550386df12a27d39d65c6c4ee2bfdc3279925777334  backend/test/logs-03c-r1.ataque.test.ts
1e775a19682f3a5995d7c035bcc810a36bf50c22045b6ffbfc5a98b821255db0  backend/test/logs-archivos-d-r1.ataque.test.ts
e9ce866d511e3ee6029015b74e20b4d342a60be99b3aac97e86f00283a3c77f1  backend/test/logs-archivos-d-r3.ataque.test.ts
5ff85c4346a45d04974ced7dc62f0222135baa70fc3e2e64dd58d3568ad38bb3  backend/test/logs-cuentas-r1.ataque.test.ts
1f044c28108fc77f5cdad9056eb758be194c44b40f398bc818f473d79954b95c  backend/test/logs-muro-c-r1.ataque.test.ts
9cdb901292f5a5a5060dc1d5de4ce35b6fdbe5d41b61d345eeb4f870186d3735  backend/test/logs-muro-c-r2.ataque.test.ts
a2507bb8a5f031143a08e9570c1299f7fa1effcf54b006358da2b4a99dc21ec8  backend/test/logs-r2.ataque.test.ts
9679a4e38388e15a318cf2470852d96a34ad8f01363923de94325e75f34b3a4e  backend/test/logs-usuarios-01e-r1.ataque.test.ts
8b08c0e62a93288fae34b29944d13e415391b3806643cb1206c56cff7f4ea802  backend/test/logs-usuarios-01e-r2.ataque.test.ts
d6b9adaf1c14a61fe369f510774ef702cfa20f28f3cb19b0eb7357440dcb0783  backend/test/migracion-01a-r1.ataque.test.ts
2afd58e1ead0a293aa7bd58c639f3e5126d153a418f9a26450228468e12b2bed  backend/test/migracion-clases03a-r1.ataque.test.ts
bc6d49f9fc1f5eb20e305945fef57caeebeb108bff5d5cf4ba10b8040687d69c  backend/test/mis-calificaciones-01b-r1.ataque.test.ts
d23bf1312777bdc000810e403a5b4d99c9c0e12998e4cc11be5ef5a2253f6935  backend/test/muro-c-r1.ataque.test.ts
7825cfc9b484df740fa0e9562a195d1bbcaf4caf72ea55fa847b5394ab96c125  backend/test/muro-c-r2.ataque.test.ts
8b733b86fc6d54ece008389a59793fae4ec4a65146eb37215e900e50a5337d46  backend/test/nombres-guarda-r3.ataque.test.ts
3fd2583a4de7cd432b2e09a5130c23d6a59fa475e5e0aa69f23739351acbf9cf  backend/test/nombres-ids-01a-r2.ataque.test.ts
00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb  backend/test/nombres-tokens-r2.ataque.test.ts
80b5a848f69b429e7dadec86c07bec1d3e3eed8a042efba41ce912ded39e7bab  backend/test/nowait-ch-r1.ataque.test.ts
fd2ae2e9792db81d838580b0ef2769ce8ef08059e3353aa5ab927c62295da9e8  backend/test/objetos-reintento-r2.ataque.test.ts
42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d  backend/test/recursos-clases03a-r1.ataque.test.ts
ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516  backend/test/recursos-clases03a-r2.ataque.test.ts
ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21  backend/test/referencias-01b-r1.ataque.test.ts
6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5  backend/test/servicio-ocupado-ch-r1.ataque.test.ts
e177959b61b1f93fa60d72b260465d4b53b66745fcf51e3befd8e5c7383a7f51  backend/test/sesiones-y-cadena.ataque.test.ts
70ac720f2e7fcadee5bbcb6414887ab08129dea7cd91df012046953b1584e8b6  backend/test/sexto-paso-02a-r1.ataque.test.ts
c89c30851e6b409cd045017181147bf674df947762a8dea3f3fb981bd9b36e09  backend/test/tareas-01a-r1.ataque.test.ts
79bc7aafc11676d36129610a4b5cd5fe5d8234d0d748487fd2f3e48c5f772c79  backend/test/tareas-01b-r1.ataque.test.ts
ae60c11cff5c82df4954db48582df4bd5a64957ff9afaf9712aa43a038f8e189  backend/test/temas-01a-r1.ataque.test.ts
dc7b86a621062ed671c1e7174a745019133fbd410c7a2e78114b2a2c50affe95  backend/test/temas-01a-r3.ataque.test.ts
309b944a426e30648feb779514c3edec34089ee691bb0e86d51a8597ce01a0d3  backend/test/usuarios-admin-01e-r1.ataque.test.ts
f7cc197f8c797f4a103cad4b9ddfe2e28b1059cb6efdc1089d7f10268a974846  backend/test/usuarios-admin-01e-r2.ataque.test.ts
f09e9a0038c47d1a2223376a0af260baf573f0c45bf770201c48c9e30296f04b  backend/test/worker-03c-r1.ataque.test.ts
9f60f9d65d52d2021a1eb04e9f01d3cc68f22744c845bf93d6621aa4fe9713a8  backend/test/worker-r1.ataque.test.ts
77d11bd85f202a9eec92a363df82e63fb9a784ca9d368d49f62e61c1a2aa967b  backend/test/worker-r2.ataque.test.ts
0e49b62b73b2ef55e8c0b2ba26e1d136a3adb674761fda2c11453eb5c2faf7cc  frontend/src/app/barra-02d-r1.ataque.test.tsx
b89ede0f6aed45dfcb5e64c8909a822156ce43fd80948e72419cdce9d4541a87  frontend/src/app/cache-03a-r1.ataque.test.tsx
c7c3d8bf1b66d3caa13da487524720b885d6709f219f7c39c03aba3dbce266e8  frontend/src/app/contexto-r1.ataque.test.tsx
bc2be5541006887e2a5a4a89b33046180f607d54474b0f96a73d615afbcac385  frontend/src/app/contrasena-r1.ataque.test.tsx
f38bcacb716d8a39acdb3535a95603cd0d8ab02572ca57a7df5268b01ceb6eac  frontend/src/app/contrasena-r2.ataque.test.tsx
70cff6d769f32c18b1071a6d91be53d0c48561ac9327cd8a9add544b1df593a4  frontend/src/app/cuentas-r1.ataque.test.tsx
41930017715d3d6869dc7acefd75de8ec3684f1f035b845abdf8ec0f6b734dee  frontend/src/app/cuentas-r2.ataque.test.tsx
1506c27e5f7418b5e087fd30f8809645a2fc3e2761c7249de78f02e24aa6c7a5  frontend/src/app/en-espera-r1.ataque.test.tsx
979a51e637568945739f1b274bfdf0f579654b34ffec158b5ccec7ccfc82fc1c  frontend/src/app/errores-r1.ataque.test.tsx
0e1d93e4dd3cbc7b5e9475a17b5ca66f0df056ba25cb117249f4c2e2f5887a51  frontend/src/app/foco-barra-02d-r2.ataque.test.tsx
2154b5c15f696a0c7f884bff774cf4e2a4208a5281db9076653f8253e2385ab9  frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx
f95321e604e20b533ebf2db3c1c6c66ba2f2d87a48f075415b766551f6ee30f4  frontend/src/app/fondo-r1.ataque.test.tsx
29782507d18ff96315e4030e890b21fdf1eb1c5550c3d1cfe5c92664d30b64dd  frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx
d2f04fa7e713adf0339b756c4c5665a6907c488ad2d2779f9b8668b34d3e8548  frontend/src/app/marco-r1.ataque.test.tsx
c8a9812f21cb24db50cc2afd945b7b38abacb468fbf4f4df16c07a52c48426ac  frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx
d7608d7fc7767f53db3971672fc99fdb8bbd33f303f41e321bcc48ad25f511fd  frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx
2f8056a770397c1601647277944555a48afc4b9a2babeb75e5898f0cc92562bb  frontend/src/app/muro-rutas-c-r1.ataque.test.tsx
6acc49a2e3b649868ccf9a9337143f991b655dafbcff2e5916bca0269bd23a7c  frontend/src/app/personas-03c1-r1.ataque.test.tsx
a3e3dadd35c40e9a11a0bdef8cd716daceeb254e5307a837c6598213ba803a7b  frontend/src/app/personas-03c1-r2.ataque.test.tsx
75c4f15817399d624382c0148564f3d56003bedba76f226a9cfe2f5f477e8e53  frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx
053e867a904afa3c09eef92ca2e03e929d9f9c93f714040856f40c7418721bbe  frontend/src/app/router.ataque.test.tsx
fc820217bc3baa3749c077fe16a4abd7ae10e92c84494ffb2a215133c19df36a  frontend/src/app/rutas-01d-r1.ataque.test.tsx
f38a09885c99f96df01ff33c639c4755c83bbb0635765bea5e75eb158d68b54a  frontend/src/app/rutas-02c-r1.ataque.test.tsx
c7946f5f5d5d16d36b395adc2ad9928acc7fd9839875fb64532b51489756730b  frontend/src/app/rutas-clases-r1.ataque.test.tsx
f090cbd8e8c9b0af52d4fc19547b07e9b6413f5414cc4b10862f01e29818dddc  frontend/src/app/sesion-r2.ataque.test.tsx
11c6d9c55be91aa41e8525345e3795e34b8e1e661ff7cdd901f729760a033cfd  frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts
48f5ff8fef35faa6d8500fae4a53ca953d7f661100a5c4879ba58e68972ab2de  frontend/src/components/foco/foco-01d-r1.ataque.test.ts
36d605f79169e16a5afadc7e07fc3781472dd393406430277ceb147fc2da1fa5  frontend/src/components/layout/estatico-r1.ataque.test.ts
0aaa18cd70465293b6fca6cc051b8e4ac360a838d02fede848c35376c3d0066c  frontend/src/components/layout/pie-r1.ataque.test.tsx
00a707429af6b5326f9a96def6382823cf4a6a092aac7e7bd7cbcb8dc9aa1d21  frontend/src/components/layout/pie-r2.ataque.test.tsx
472e1f46d0c899496aa334909b02988962aab07b9bd29a8d7b8af3987fac6c76  frontend/src/components/layout/pie-r3.ataque.test.tsx
a1814d281dafd8243989c9f9a462a4f33a86b1fb70eeebf29e99bcb0f340d82a  frontend/src/components/ui/badge-03b-r1.ataque.test.ts
4ca7d89e612f9442c7abff9587312a0f36c4ac09ec0e0dd29b6d1c518affd6fb  frontend/src/features/admin/cuentas-r1.ataque.test.tsx
cfb224f2b70b6dd1d2e265a86abb349b366ad29a97a76e6dc9788686800359b6  frontend/src/features/admin/cuentas-r2.ataque.test.tsx
bdddceef580541e17c1bc6aaf1c8f0cd22f28fbd3f6d434cafedc0f7014c5413  frontend/src/features/admin/cuentas-r3.ataque.test.tsx
3ba845a67131b3a400d96ac8a4d692f447d0517187c1de8f49a55e51c5f6f3f7  frontend/src/features/admin/cuentas-r4.ataque.test.tsx
bfff614cd9c0b8701b5e4dfa733f77071d1a1440a3505b1d91fd7db188602ff0  frontend/src/features/admin/en-espera-r1.ataque.test.tsx
a315d8e091745c492d71d1c27fe36cc55e6ab773e92556e9910ea250bc747885  frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx
99356742d1a8680fbfdf79835ce4b5f76ec8f787c6e2c0bb83a26ea92f5065b1  frontend/src/features/admin/foco-r1.ataque.test.tsx
30f45bba30d9348ec1587b42e84ca370274e1bf0af0f310b8a6bbd79fa982669  frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx
d477a809e55e603d3ef6c02ca43b21372b75d0947fa303f1539d48bdf32841f8  frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx
122a11a407732dd48444b2ff42f1146f7467109418ca23cace9b3608518349c8  frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx
4ec1f5c2cbe5326a64ec17e91ddb5c4d92ead2dcaa275dfc18766cdbfbda5651  frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx
3ceda51db8f67f40c26615fbc4cd7d082035b00f38713c6ca4c7db58e47926c8  frontend/src/features/auth/enlace-r1.ataque.test.tsx
1f5d1147637c09daa6fdf1384e4395edd69dfdab84aae5d602a362dabd3295bd  frontend/src/features/auth/enlace-r2.ataque.test.tsx
af3f0d474f8052b402c8959a64acf9e730f9ae60f09d90996a6306e9c2440f08  frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx
991b115524d8dade8d6ea2c51fb753dc8832ee410db2161a0ce761d011cfca4a  frontend/src/features/auth/invitacion-r1.ataque.test.tsx
338054857e30fb01ed88e6ce27692298090f161f94888b8999e75c96e8b216dd  frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx
0ce580976ea894ee4bd9c4adbe3d7d1d524354a8ff22fc7e7cc6acf89057aa53  frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx
4bcd3e34b62726fea718efb9c482d8c1f504bbe85ef32427bdf4d65a6832d8f1  frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts
812ee5f1b04a1218e2b96cdb97fb5a964a4a21b0d81b95bb4889beaa4a3894bb  frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts
bef8aa53d338fde15e251d53756b76e3381ef9f6de4943c4db83c8e2b3d258dd  frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx
d15e821c212bb268c65bd9dee36293b02f5bde4dedd4bf9926dbbf99b9971f57  frontend/src/features/calificaciones/exportacion-02b-r2.ataque.test.tsx
5991d8e3d4e694973309f178e5341a2285584cf9ed6006fbb658d7f5a61de5dd  frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx
c744fb831fa9992c2a9ed0729f9ec3cc089f3167ca19133c6eee0133382607a1  frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx
8dea1c2adc5d228e166ce6037a1a1a827d26e2bdc6d7c8534f146517ebc1ac44  frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx
6f7496ca7652e7b4441a7eb9822e74270d50127ac40ba27b86c83edfcd5cc3fa  frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx
24751f358fc5ecd485c475e7025dd881b87fe892f025459a6ff29f615fc5cc66  frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx
c504d0ad3690781275a6ffb78638a6148550b2fd4ee1ed25a4b154054fc4f80d  frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx
6ac36ce1eb4df953626415b3ed431a8f4809dc29cf259f755f1f8509dd54b7ef  frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx
fb33f2a27bfcca906549a12610977478ba72e6e7ed8afd5c5a0a962deb3eb802  frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx
932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872  frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx
55dc274eca96da4360848b88f9f2a839ac815031490ab57ff38de074512d632c  frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx
371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183  frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx
266d088dd727f18af8c8a106b8d9c4dbed75753e4b1b4abb12f3a4df870ecb7f  frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx
856cffbd9c743f9815daf731487e29dc5f5272545dc15820a70baf86ecfa6527  frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx
a9dc00d9cf6e8684113eeb824658c7fb2f3077ee8a54deb0cce47ac802c74f44  frontend/src/features/clases/archivos-d-r1.ataque.test.tsx
98e645df89c9736ee33f440c1d83f342be84f30caabec0310b1b5185e538fbd6  frontend/src/features/clases/archivos-d-r2.ataque.test.tsx
f1b2b7d3c2a2bfbc2c2aa31cce4b120e306681c0cc9efb85ac2a954c8f8f8afe  frontend/src/features/clases/archivos-d-r3.ataque.test.tsx
c6c85ac2f6e7418e81d7817f9c455c0e0973025a15ae2a5378e00c9a71c45620  frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx
a3880b67ffaa0d15763d1c761cef1ff8472029c77bfb2211ab079eadb1685325  frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx
66c0b873bc8b9d8e9e01ac871bd6aaab4328508beb5ec9371d69463d7c12430d  frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx
53909e72f161cb3494086fff21b521f8dea1425b687258bd14d4e8b401ece3c1  frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx
907f9ba5b6881a4831fc4062c27d685b5daa19e690eff7a3a40b02b5fbec6a72  frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx
a188c90deb61bafedabc50b76c77b02507964297cd6b155f905114839f728493  frontend/src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx
0fc7408a9c9e039c700956c8132790e689b84db3714f52080df86aecb387d88b  frontend/src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx
4e3a45f7672489373d6d1ad3f2309c572e9b7930e846fa9596b60a858c933294  frontend/src/features/clases/clase-archivada-01d2-r2.ataque.test.tsx
6f30bd0fc683631483ca1f35943e932f8883e83a3f4559f72110d67ce1590a8b  frontend/src/features/clases/clase-archivada-01d2-r3.ataque.test.tsx
1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65  frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx
76b5b2522f60795c0e7672da7b10ea95a3ce61d1aa26f102ef8eb057bd3ce6d9  frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx
cffce654ebfb37dc10f8ce8bf7026fc982a8c3f79b677fa2eb82c4476e113f83  frontend/src/features/clases/clases-admin-01c-r3.ataque.test.tsx
87dae1927669b46bb52aad94db5107a5284f772fa9b29e225aace19c1a1e8def  frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx
5f0679d8cfacc8bce01989c04a415dc5b546625eb7dec92f03959de5a0f89815  frontend/src/features/clases/clases-r1.ataque.test.tsx
c7ad5edc733e374117a9277f1c2987e84cc2930c77eb4c720ccf15cc9f5fab45  frontend/src/features/clases/clases-r2.ataque.test.tsx
a835a11d29aedb8f77f91e826a22c2b7cf5322fced3f6bed0c1acbf7c75a4e61  frontend/src/features/clases/clases-r3.ataque.test.tsx
86b04d234527eceefca35b07ce89e6b7ce0b6afe5ccdee2f005e6a4219f0495a  frontend/src/features/clases/clases-r4.ataque.test.tsx
dce7fd019a6e32b8e4df37dd0728e265f5e9449e9ee2723f372ea174fe312464  frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx
3b5a9fac5cd20a881bf6b38597b752725a7f6bbfddcf103b7bf1239a76353dfc  frontend/src/features/clases/dudas-03e-r1.ataque.test.tsx
fec2ffc2691bd297dca5f90233d498d10dfd689a5d9a8819bc30e757c6f67c26  frontend/src/features/clases/dudas-03e-r2.ataque.test.tsx
18edcffc8e48073362b98c784d5bf64e3335709ae6e1c6425b32aa3310e24b56  frontend/src/features/clases/dudas-03e-r3.ataque.test.tsx
ddc9dfaccc8230ec612126fdf29939a8e4311188566e5cfcaa724bd119e959e8  frontend/src/features/clases/errores-ch3-r1.ataque.test.ts
5e20eefe0104b510a3002de084b6162162b5bf20797622c8d92b350853494b53  frontend/src/features/clases/estatico-02c-r1.ataque.test.ts
3cb8e0d7bb13b57638d65aa74ec5ff0f9306f024cf6996b7737232243a0b82f8  frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts
cdd1ed8890859ae3e884822fc7074852a2173105114745d83fe9a15c1c47c626  frontend/src/features/clases/estatico-r1.ataque.test.ts
de23d395dfe7a6f3d6d15eb48cb574599dc9d8204e5a90b255c0c10d25a186fa  frontend/src/features/clases/fila-01d-r1.ataque.test.tsx
46383e1f3ede03cb204dbf602373d0a07e513d8dac7ec4179a203ea6ee270fa3  frontend/src/features/clases/foco-02c-r3.ataque.test.tsx
0165d4e27b1fff9230d17bec740d89c380b6f322923c7e5a044ac010f4b9358b  frontend/src/features/clases/foco-02c-r4.ataque.test.tsx
8b8ea2d21597bc0444709a9d26fd795d05bc964ef7b5094240628c63018c091b  frontend/src/features/clases/foco-02c-r5.ataque.test.tsx
b819d6bbde4bd47e3ec724fcdea5e77eb66b12076b8a9a083691b52ef0bdd182  frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx
ab006dc1711e9a652643930a7010c25f442d1ffdd137adbb093eb5bd98da90d6  frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx
5224976752a14c3e003b246fa97abf25356e370cb46da1cdff9526bf3be86b4e  frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx
7f4a935de29c3c519aad697edb1470c4cfcead600f5c1516c5fff948995d4434  frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx
8bc578ef17d2731f388c14ca19bc719a2b8d04d8a41009fadee15227379047bc  frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx
479430b848cf3d21a0187138944deec46bb36653071bbd2790ed57620f012976  frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx
4d94ccbe786a46ca1d82a280956f1146d5c302a9f83dfac45f39b3b2f94b753f  frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx
0f60f1582fce6e5efaf9bf6856133dc30f1dc4eb9c3b7fea19f90a330f8335b3  frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx
7c434a0e54e70b12d4b2a3de22ffb4dbf5f28a1cfbd2290c22e8a2b59edf0e16  frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx
99df138b24d4aba97b9f714c32ba226e82c7403cf73aa2e9e2b0b028b28e283e  frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx
4817262ef6e4dadff56857e50bab2e06ec479e62d5eaf45b34d70d683736b637  frontend/src/features/clases/muro-02c-r1.ataque.test.tsx
8da38dbcb605ce3d90ace8117ce2cc5c838d71eb24bdd76fad3a53b82da93901  frontend/src/features/clases/muro-c-r1.ataque.test.tsx
d0acb3527aafa6f687e3eb00563e37be93768e7d7f742694a4d5ce05b75b7e28  frontend/src/features/clases/muro-c-r2.ataque.test.tsx
d08e51d451ebaeb2d7086c75dc1f73d52c5b4a6b8dfb979932828bed5f5d459d  frontend/src/features/clases/muro-c-r3.ataque.test.tsx
558212b46641de0794d0ce90e3944a99cb5baa7fab4b09bbac5ea7cac41eaa34  frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx
aec8c4131e5dc733246b33e8189e2dc595387324bdd2081d1d245641c20c380a  frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx
67b60a9a5363f88e6ceba210c27452b8d639f6df798aa4e506dc54bb2312249a  frontend/src/features/clases/personas-02d-r1.ataque.test.tsx
7677e0571587c89de1cb76788d499ac545255ca64c8afcb38a8ad6e39c02e2c6  frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx
60541290248812cfce5591ddf33d01125d60c33257743a7ec48a445013d3d8c1  frontend/src/features/clases/recursos-03d-r1.ataque.test.tsx
4aafaa73980ba1bc29be043623a030c9eaa730825eb61a403bf54f9ac700b42d  frontend/src/features/clases/recursos-03d-r2.ataque.test.tsx
70b1a49a6a0e471422be987466228e5beb87e25baee2906790651c94ed214a3a  frontend/src/features/clases/recursos-03d-r3.ataque.test.tsx
29a3125cc70969f2fc2bb1f012beeb81840e1a00ea08d5b588b10d190342ae7f  frontend/src/features/clases/recursos-03e-r1.ataque.test.tsx
85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511  frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx
4303eac77b98e8978495d9e68fd7725ac436f9db757dbc0c02c59051436908fa  frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx
09435abbb9a26dd71c52b4d95487c6d38594f1ba062aefb60f73b7eb7308f991  frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx
d899c19ba982fbde2208bbc7fa009869556c84bd4650586dbd9ee90b22234e47  frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx
97af503e763f7dff9fcfbdc72862cd21de6af8e51d3ec41134f8475d98ae2df6  frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx
db42c88d5b0bfb1125bf122c03a2e019d6f5365c128ac4bfadd413a26a934845  frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx
f6924bc272a5240cf97d35729c797cc10960ed7cf94fe1be1b69ca2df6c1cf8f  frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx
9866ef34167061e2715b65a352c55d08c7e9268033e879ae633c7fd568e4d49f  frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx
ea58eb11c3157a33c5730f87f2cf562ae178589b30264902b165c4439cebc2ee  frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx
2ef258e946084f17e33936e8fa257551a90323b589859dd2e1f70aabeaf711bf  frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx
e2fefd7d744f77c7bdd2ba73a08cc51076d0f6130bf4d0a225e0e972a1dce111  frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx
11bb5433fb30f268b6d93e1e7814d826bbab8fb1f173e574faf52f5a96b5a41e  frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx
d8daccb56c8de8d9f1b0f8d1b0907c110e327f4f55b016fc0fe7fc0f25ccc79c  frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx
ef86c46708f0682bca5a023e85794639c396ec94d207cac23ceb13585ab39e75  frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx
af127fae8354906737c857aa497a29a53514c928fa4dcfbfc79a41e3fbc13eee  frontend/src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx
940817a89a4aaa1703187248e6c53dcbfe97c1af053b2f78c265e34f0ce50e7a  frontend/src/features/tareas/clase-archivada-01d2-r2.ataque.test.tsx
5ff367edba10c9ba9c7e50f8ed874032654fa2abdc0dd8f4a122a000355472ab  frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx
2938ae2f1c00f63a0372997c7ba68bdc0ab097895769bf9060072a4ac2674c5a  frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx
0963f14f4842d6d57288876c932496ac09d44b872fc049492ee6e8ba539f3235  frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx
4f486ca37d2a2bb6cc26754281d2adce086a9d8d4485a069de7ae5d54e360acf  frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx
93a5a0a648669e9c96494a62b2b16082b07296f279e2892bf2c8d47834ee2fc1  frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx
08a5e1a5642e7fc7553632dd5cf4e07f0ea35c3ef1e7293d010bbc49b09465aa  frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx
172be3efd919c0d3948eca17c7e808968e2370afe1f9c2a28cef7d2ded584b81  frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx
496652bc59817166f53e00cb828f2119c857c2834063a31764d7876dc150c930  frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx
edf4d96e4b884eab718d06811877c17b611099a66d6857502f71eedb96026dda  frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts
94d6e6253b266c7f21099aa593aac7b2600edca22ab403aa365dcd789b1c6a97  frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts
f614e7369f8c47c40a87ad1f8867fb8edf7ebc76e94d0ba6c5c59c92cb6347f0  frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts
fb387ecbb7e5272d2ffb53d626b51ffd9c57b409d10c560e6a5ecbfa6a2a8c19  frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx
7a7c7ba922f77da22d0f765ed5ea9ccf9216d1900e4b5f18365da9d46437495f  frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx
bfded7507bc684ea9858cd76517ef0e4c23cbc69e5a19f381e6ec522fd6156e6  frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx
b778fc2e6bb0a8f8715a56877b3b781439ca214c8a9c8ae126f610c95229882a  frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx
bf3c999033195cac778a82a579e44729fb07a405f5cdb41d8e7dc932cb71f942  frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx
3567d7c23d2cf6a2fd538cd6822ef60ac3cffeac036394ed1e3559debe492c57  frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx
6bbe2bd85e2b5500fbab4d0f51630c0c8e9d65b1a63045ad1fa906298a92a435  frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx
72b19b6a00b4ade43b06829bb5bef1a5cdecf5a7d2af57369f1e857a1d4a17f5  frontend/src/lib/errores-ch3-r1.ataque.test.ts
5d41a2af073dcaa2b8b016d835d36d5ebae9278863db048484a192a88bb31a30  frontend/src/lib/errores-ch3-r2.ataque.test.ts
c5b7e7278e7e2e8d49cfc702c545cdafb46f59ccfd362692c402d93984ee2dec  frontend/src/lib/estatico-ch3-r1.ataque.test.ts
9e897a6629f845a19ef425f2e70755dd3875af905dc8fe803fe80b5467b48e7c  frontend/src/lib/estatico-ch3-r2.ataque.test.ts
60bc1fc7011e9a0fe5a4c4aa45420f2c7d38adb9ee2f8d235d09847dbe13ac3a  frontend/src/lib/format-01c-r1.ataque.test.ts
c71cba65dd284d7af11cbc812b6bcf75baa373939edb8318e731858d9c50173f  frontend/src/lib/format-d-r1.ataque.test.ts
89dbbb70d5dc404c3d74db5391d10855c8cb1d6b4c643b6147b3ce6ffb2637af  frontend/src/lib/format-d-r2.ataque.test.ts
bfa7ded62f7a1402590d438a1cc51060a63fa019ad47d3eb5740e43383064a2a  frontend/src/lib/format-d-r3.ataque.test.ts
a33ececc9261e00f0e32d243596a6d4b541a1b61b56d45d33bd54bfde4589deb  frontend/src/services/apiClient-ch3-r1.ataque.test.ts
10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce  frontend/src/services/apiClient.ataque.test.ts
5f5f08727dbf88c03578eff79ef6eef07136e3524ad63df81d2461d6b618637b  frontend/src/styles/clases-r1.ataque.test.ts
b8085bcbbc7f4b6276bf3a87fb7ba0bc887953a8c6ce372354a7f3f1b5037582  frontend/src/styles/tokens-r1.ataque.test.ts
```

### Cierre de la ronda 0 de 01f
- **Veredicto: lista para el programador.** Sin PARADA.
- **C-n aplicados**, cada uno desde su hash de `10356bd` (C-45, desde `96b6ab55…`): C-13 (seis archivos), C-13b, C-14 (dos), C-15, C-16 (seis), C-17, C-17b, C-35, C-36, C-37, C-43, C-44 y C-45. Son 20 archivos.
- **Rojos esperados:** 121 casos en 16 archivos, todos por la interfaz de 01f que falta (rutas, ficha, dashboard, nav, diálogos, `vidrio-fuerte`, la ref y `errorQueRedirigeElCliente`).
- **En verde:** C-36, C-43, C-45, C-14 y `:135-150` de C-35.
- **Corridas:**
  - los C-n, `121 failed | 567 passed (688)` · 20 archivos;
  - los módulos de 01f, `101 failed | 2960 passed (3061)` · 131 archivos, con solo mis C-n en rojo;
  - las vigiladas de fuera, `779 passed (779)` · 18 archivos;
  - `lint` del frontend, exit 0.
  - Todo con corriente (`BatteryStatus` 2).
- **Para el orquestador:** OA-01f-r0-1 (el nombre de la región de la ficha) y OA-01f-r0-2 (el texto «Desactivada»), antes del paso 27.
- **Para el programador:** O-01f-1 a O-01f-9.
- **V-01:** 271 archivos; solo cambian los 20 de los C-n.
- **No se toca:** `git diff --name-only 10356bd -- backend frontend shared` lista solo esos 20 `*.ataque`.

### Corrección de M-19 y N-1

Lo pidió el manager (`revision.md`, "## Verificación de la ronda 0 — ADMIN-01f", línea 6473), que aceptó A-1 a A-4 y C-45. Solo cambian tres archivos de C-13. No corrí `vitest` ni el `lint` completo, porque el programador de 01f está corriendo sus suites. Comprobé con `npx eslint` (sin errores), `npx prettier --check` ("All matched files use Prettier code style!") y un barrido de invisibles (0 caracteres de las categorías Cc, salvo salto y tabulador, Cf, Zl, Zp y Cs) sobre los tres archivos. El rojo esperado de estos casos se confirma en la ronda 1.

- **M-19, `features/admin/en-espera-r1.ataque.test.tsx:268`** (`llenarInvitacion`): el reemplazo mecánico había puesto "Correo correcto", un campo que en `/admin/maestros` no existe. Vuelve a "Nombre completo", como en `10356bd`. Los casos que montan `/admin/maestros` (`:274` y `:292`) vuelven a llenar el formulario de "Invitar maestro". Una sola línea cambia.
- **N-1, `features/admin/foco-r1.ataque.test.tsx`:** cambian cuatro títulos, para que digan lo que el caso prueba desde C-13; ninguna aserción cambia.
  - `:267` y `:471`: "a escribir en 'Nombre completo'" pasa a "a escribir en 'Correo correcto' (fuera de la confirmación)".
  - `:349`: "sale a 'Buscar'" pasa a "sale al enlace 'Usuarios' de la barra".
  - `:388`: "'Correo exacto de la cuenta'" pasa a "'Correo correcto'".
- **N-1, `features/admin/cuentas-r4.ataque.test.tsx`:** cambian cuatro títulos (`:323`, `:365`, `:390` y `:414`, de "'Nombre completo'" a "'Correo correcto'"; el de `:323` suma "(fuera de la confirmación)"). Cambian también los tres mensajes de aserción que decían "el admin escribía en \"Nombre completo\"" (`:339`, `:381` y `:408`), que pasan a "\"Correo correcto\"". Ninguna aserción cambia.
- **Corrección de lo que dije arriba:** en la tabla "Cambios", la fila de `foco-r1` decía que esos títulos ya habían cambiado. No era cierto hasta esta corrección.

| Archivo | SHA-256 de la ronda 0 | SHA-256 nuevo |
|---|---|---|
| `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | `bfff614cd9c0b8701b5e4dfa733f77071d1a1440a3505b1d91fd7db188602ff0` | `1ad878644eaf8730d08392b5201cf4d7362c0009be767990a57a56d6794d9cc0` |
| `frontend/src/features/admin/foco-r1.ataque.test.tsx` | `99356742d1a8680fbfdf79835ce4b5f76ec8f787c6e2c0bb83a26ea92f5065b1` | `729e89a58287bc34fad63a95eac5a718a59b837c27c6887779c048c3a6332e12` |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `3ba845a67131b3a400d96ac8a4d692f447d0517187c1de8f49a55e51c5f6f3f7` | `f7c9ac682c697e6e88863ce850862d8421d55d8940667ea8bc3b45478eae7a98` |

V-01 cambia en esas tres filas. Las otras 268 de la lista `b111a913…` no cambian, y `git diff --name-only 10356bd -- backend frontend shared` sigue con los mismos 20 `*.ataque`.

### C-46 y C-47 (tras la verificación del resumen)

Me los asignó el manager en `revision.md`, "## Verificación del resumen — ADMIN-01f — implementación" (línea 6604; registrado en `aprobacion.md`). Cada archivo parte del hash que tenía en el árbol después de mi ronda 0, y los dos coincidían al empezar: `rutas-02c-r1` = `f38a0988…` y `cuentas-r3` = `bdddceef…`. Ninguna otra prueba cambia.

**C-46, `frontend/src/app/rutas-02c-r1.ataque.test.tsx:168-178`.** En el caso de las rutas retiradas del maestro, la aserción "nada del admin" (`lista.filter((r) => r.startsWith("/api/admin/"))` igual a `[]`) queda en la variable `delAdmin`. Cuando el destino final es `/admin`, se quita de ella exactamente `"/api/admin/resumen"`, la petición del dashboard al montarse; con cualquier otro destino, la lista se compara entera. Lleva un comentario de tres líneas, `:178-180`, con el mismo criterio que C-45. Solo cambia la primera de las dos apariciones de esa aserción en el archivo, la del rango que nombra el manager. La otra, la del bloque "las rutas del admin abiertas por otro rol", no cambia: ahí el destino es `/estudiante` o `/maestro`. Diff contra el estado de partida: −1 línea y +7 (tres de comentario, `const delAdmin`, `const esperadas` en dos líneas y el `expect`).

**C-47, `frontend/src/features/admin/cuentas-r3.ataque.test.tsx:416-434`** ("la respuesta que llega tras una búsqueda rechazada en el cliente (ficha desmontada) no hace nada"). En `10356bd`, `buscarConEnter("beto@ejemplo")` enfocaba el campo antes de la búsqueda rechazada; mi reescritura no enfocaba el enlace «Usuarios». Ahora, antes de `await abrirFichaRechazada()`, va `act(() => campoBuscar().focus())`, con un comentario de dos líneas. Nada más cambia: +3 líneas.

| Archivo | SHA-256 de partida | SHA-256 nuevo |
|---|---|---|
| `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | `f38a09885c99f96df01ff33c639c4755c83bbb0635765bea5e75eb158d68b54a` | `36a71ca4dd8c7ff7c4cacfa9dc56a4c0d330ba4ce40f038629abe44b0a08609a` |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `bdddceef580541e17c1bc6aaf1c8f0cd22f28fbd3f6d434cafedc0f7014c5413` | `53af88084af04f104db634f1f1075a1b5940c23be1411dc6c46401716d066bb5` |

**Comprobación:**
- `npx eslint` sobre los dos archivos: sin errores.
- `npx prettier --check`: "All matched files use Prettier code style!".
- Barrido de invisibles: 0 caracteres de las categorías Cc (salvo salto y tabulador), Cf, Zl, Zp y Cs.
- No corrí el `lint` completo ni los módulos. Nadie más corría suites (lo dijo el orquestador; verifiqué que no hubiera ningún `vitest` vivo).

**Corrida** (a batería: `BatteryStatus` 1, al 40 %), desde `frontend/`: `npx vitest run --reporter=verbose src/app/rutas-02c-r1.ataque.test.tsx src/features/admin/cuentas-r3.ataque.test.tsx`, contra el árbol con la implementación de 01f del programador:

```
 Test Files  2 passed (2)
      Tests  79 passed (79)
   Start at  15:52:03
   Duration  31.76s (transform 11.67s, setup 2.45s, import 1.17s, tests 40.49s, environment 9.66s)
```

- **C-46:** los seis casos del admin que terminan en `/admin` (`/maestro/clases/nueva`, con barra final, en mayúsculas, `/MAESTRO/…`, `?origen=inicio` y `#crear`) pasan a verde. Los cinco de `…/editar` (destino `/login`) siguen en verde con la comparación entera. Lo esperado antes de C-46 eran seis rojos, por `"/api/admin/resumen"`, como dice el manager; después, verde.
- **C-47:** el caso queda en verde con el árbol de hoy. Yo esperaba que pudiera seguir en rojo hasta la corrección de M-20, si el foco del enlace se perdiera al cambiar de ficha. Pero el enlace «Usuarios» sigue montado en la barra y conserva el foco que el caso le da, así que pasa sin esperar a M-20. Lo que espero después de M-20 es lo mismo: verde, con el foco en el enlace. Si la corrección de M-20 mueve el foco al cambiar de ruta, este caso la vigila: el foco de alguien que no está en la ficha no debe moverse.
- No hay `"Error no controlado"` ni contención que contar: es solo frontend.

## Ronda 1 — ADMIN-01f

Veredicto: **ROTO.** Encontré dos hallazgos:
- **T-01 (alta):** el control de estado de pago de la ficha no sigue a la cuenta cuando el servidor trae otro estado. El administrador ve «Al corriente» marcado en un alumno que el servidor ya tiene como deudor.
- **T-02 (media):** con un diálogo abierto, cambiar de ficha con el historial deja el foco en `<body>`. Es un hermano de M-20 que la corrección no cubre.

Lo demás que ataqué resiste: el foco entre fichas sin diálogo y con el `404`, el `408` y el `429` de la ficha, y las peticiones de `/admin` (C-45 y C-46).

Plan `7f344f7a…` (comprobado). Base `10356bd`. Leí la implementación (`resumen-programador.md`, `:3160` y `:3292`), las dos verificaciones del manager (`revision.md:6604` y `:6777`) y el código de `features/admin` (`usuario-view.tsx`, `usuarios-view.tsx`, `inicio-admin-view.tsx`, `acciones-de-cuenta.tsx`, `estado-de-pago-de-cuenta.tsx`, `hooks.ts` y `lib.ts`), además de `components/foco`.

### Entorno
- Nadie más corría suites, según el orquestador; antes de cada corrida no había ningún `vitest` vivo.
- **Energía:** `BatteryStatus` **1** (a batería, al 11 %) a las 16:32:25, en la primera corrida de mi archivo. A las 16:33:18 ya estaba en **2** (corriente), al 11 %, para la corrida de los módulos.
- Sin navegadores: la vista a 360 px (punto 7) queda **no verificada**. No terminé ningún proceso.
- Escribí los caracteres especiales solo como texto; un barrido de mi archivo da 0 invisibles.

### Hallazgos

### T-01 — El estado de pago de la ficha se queda en el valor con que se montó
Severidad: alta
Prueba: `frontend/src/features/admin/usuarios-01f-r1.ataque.test.tsx`, dos casos:
- "ADM-T1F01: con la ficha abierta, la cuenta pasa a deudora en otra pestaña y la respuesta de «Restringir acceso» trae ese estado: el control lo muestra";
- "ADM-T1F02: la ficha vuelve a abrirse pasado el staleTime, la cuenta cambió entretanto y la recarga trae «Deudor»: el control lo muestra".

**Esperado / Obtenido:**
- **Esperado:** el control segmentado "Estado de pago" de la ficha muestra el estado que tiene la cuenta, como dice el propio comentario de `estado-de-pago-de-cuenta.tsx` ("Empieza en el estado de hoy").
- **Obtenido:** `EstadoDePagoDeCuenta` guarda la opción en `useState(estadoPago)` y nunca la vuelve a leer de las props. Cuando la ficha recibe otro `estadoPago` del servidor, el control sigue marcando el de antes. La ficha no muestra el estado de pago en ningún otro lugar, así que el administrador lee un dato falso. Las dos salidas:
  - **ADM-T1F01:** la cuenta pasa a deudora fuera de esta ficha (otra pestaña u otro admin). Después, «Restringir acceso» responde la fila con `estadoPago: "deudor"`, y `renovarTrasCambiarLaCuenta` la pone en la ficha con `setQueryData`. Resultado: `expected 'Al corriente' to be 'Deudor'`.
  - **ADM-T1F02:** se sale a la tabla, la cuenta cambia y se vuelve a la ficha pasados 30 s. La ficha monta con la caché ("Al corriente"), la recarga trae "Deudor" y el control no cambia. Resultado: `expected 'Al corriente' to be 'Deudor'`.

**Por qué es alta:** la vista afirma un estado de pago que la cuenta no tiene (RF-54). Si el administrador pulsa «Guardar» confiando en él, vuelve a marcar al alumno «Al corriente» sin haberlo elegido.

**Requisito o regla violada:** RF-54 y §D-11 (la ficha muestra y cambia el estado de pago); punto 9 de la verificación del manager (M-22 desde otra pestaña).

**Hermanos que revisé:**
- En `features/admin/components`, ningún otro componente inicializa estado local con un dato del servidor (`useState` de props). `AccionesDeCuenta` deriva sus botones de `cuenta` en cada render, y el formulario de «Editar nombre» toma el nombre al abrirse.
- En 01g, la fila de `/admin/estado-pago` y el lote deben vigilar el mismo patrón.

### T-02 — Con un diálogo de la ficha abierto, cambiar de cuenta por el historial deja el foco en `<body>`
Severidad: media
Prueba: `frontend/src/features/admin/usuarios-01f-r1.ataque.test.tsx`, dos casos:
- "ADM-T1F03: con el diálogo «Dar de baja» abierto, atrás del historial a otra ficha: el foco va a la raíz de la vista, nunca a <body>";
- "ADM-T1F04: con el diálogo «Restringir acceso» abierto y el motivo a medias, atrás del historial: el foco va a la raíz, nunca a <body>".

**Esperado / Obtenido:**
- **Esperado** (punto 1 de la verificación): el portal del diálogo se desmonta y el foco va a la raíz de la vista (`tabIndex={-1}`, con el `h1` "Usuarios"), nunca a `<body>`.
- **Obtenido:** en los dos casos, `el foco quedó en <body>: expected false to be true`. El diálogo sí se cierra (`queryByRole("dialog")` da `null`).

**Causa:** `useFocoAlPerderseElControl` (`components/foco/hooks.ts`) solo recuerda un control si el `focusin` cae **dentro** del contenedor de la vista. El diálogo vive en un portal, fuera de esa raíz, así que, con el foco en «Cancelar» o en el motivo, la memoria queda en `null`. Al cambiar la clave por la otra cuenta, el gancho no hace nada, y el retorno del foco de Radix va al disparador, que ya se desmontó.

**Requisito o regla violada:** M-20 (el foco al cambiar de ficha nunca queda en `<body>`), `DESIGN.md` §7.14 y la regla de foco de `CLAUDE.md` (`components/foco`: "nunca a `<body>`").

**Hermanos:** los dos diálogos de 01f (baja y restringir). En 01g, el del lote de estado de pago. También cualquier diálogo de `features/clases` dentro de una vista con raíz de foco, como el de borrar una clase en `/admin/clases`: no lo ataqué en esta ronda.

### Atacado sin hallazgos
- **Punto 1, el foco entre fichas sin diálogo** (ADM-T1F05 y ADM-T1F06): con el foco en "Correo correcto", atrás y adelante del historial dos veces entre dos fichas, el foco va a la raíz de la vista en cada cambio. A → una cuenta que no existe (`404`) → atrás, con el foco en «Restablecer contraseña» y después en «Volver a Usuarios»: va a la raíz en los dos pasos, nunca a `<body>`.
- **Punto 6, D-2** (ADM-T1F07, con `408` y con `429`): la ficha hace una sola petición, sin reintento, y muestra el texto fijo "No pudimos cargar la cuenta. Revisa tu conexión e inténtalo de nuevo.", sin aviso y sin "Esa cuenta ya no existe.". Ir a la tabla y volver la pide otra vez y, con `200`, se ve la ficha.
- **Punto 8, C-45 y C-46** (ADM-T1F08, con y sin `<StrictMode>`): en `/admin`, de `/api/admin/` solo sale `GET /api/admin/resumen`, una vez. Pedir el resumen dos veces o pedir cualquier otra ruta pondría el caso en rojo; hoy no ocurre.
- **Regresión:** mis C-n de la ronda 0 (con C-46, C-47 y la corrección de M-19) siguen en verde contra la implementación. Corrieron dentro de los módulos y de las vigiladas.

### No atacado y por qué
- **Punto 2** (la raíz frente al sustituto, con `setQueryData` más la recarga de las listas), **punto 3** (la tabla: «Ver» con la búsqueda diferida, la última página con solo repetidos, el alta con la tabla en error), **punto 4** (P-1 y P-2 de la ronda 0) y **punto 5** (D-6): no alcancé a atacarlos en esta ronda. Los cubren hoy ADM-1F07, ADM-1F08, ADM-1F10, ADM-1F18, ADM-1F19 y los C-13 de la ronda 0, en verde. Quedan para la ronda 2.
- **Punto 7** (D-4 a 360 px): exige navegador. **No verificada**; la decide el humano.
- **El `401` a la mitad de la tabla o de la ficha** (parte del punto 6): no lo ataqué; lo cubre `apiClient` con sus pruebas.

### Archivo nuevo (solo `*.ataque`, sin rastrear)

| Archivo | Casos | SHA-256 |
|---|---|---|
| `frontend/src/features/admin/usuarios-01f-r1.ataque.test.tsx` | 10 (ADM-T1F01 a ADM-T1F08; ADM-T1F07 con dos estados y ADM-T1F08 con dos modos) | `f1c8d06ab2e4784c5cf102300652c85f1281e789e3fb362ae59a960622f8d0dd` |

`npx eslint` y `npx prettier --check` sin errores; `tsc -b`, sin errores.

### Corridas (desde `frontend/`; una después de otra)

1. **Mi archivo** (16:32): `npx vitest run --reporter=verbose src/features/admin/usuarios-01f-r1.ataque.test.tsx` → `Tests 4 failed | 6 passed (10)`. Los cuatro rojos son T-01 (ADM-T1F01 y ADM-T1F02, `expected 'Al corriente' to be 'Deudor'`) y T-02 (ADM-T1F03 y ADM-T1F04, `el foco quedó en <body>`).
2. **Módulos de 01f** (16:33:20): `npx vitest run src/features/admin src/features/clases src/components/foco src/components/layout`
   ```
    Test Files  1 failed | 145 passed (146)
         Tests  4 failed | 3453 passed (3457)
      Start at  16:33:20
      Duration  176.46s (transform 34.65s, setup 96.47s, import 231.01s, tests 1063.33s, environment 469.71s)
   ```
   Los 4 rojos son los míos. El resto coincide con la corrida del manager (`3447 passed`) más mis 6 casos en verde.
3. **Vigiladas fuera de los módulos y mis C-n de `app/`, `lib/`, `services/`, `styles/` y `features/auth`** (16:36:35): 29 archivos, entre ellos `app/foco-pestana-02d-r3.ataque.test.tsx`.
   ```
    Test Files  29 passed (29)
         Tests  976 passed (976)
      Start at  16:36:35
      Duration  40.90s (transform 30.37s, setup 20.14s, import 44.71s, tests 208.44s, environment 92.32s)
   ```
4. **`lint` del frontend:** `npm run lint` → exit 0. Antes sale "All matched files use Prettier code style!", y la última línea es `> tsc -b`, sin errores.

### V-01
- 271 `*.ataque` rastreadas. Comparadas con la lista de la ronda 0 de 01f (`b111a913…`), solo difieren las cinco que cambié después, con los hashes ya registrados: `rutas-02c-r1` `36a71ca4…` y `cuentas-r3` `53af8808…` (C-46 y C-47); y `cuentas-r4` `f7c9ac68…`, `en-espera-r1` `1ad87864…` y `foco-r1` `729e89a5…` (M-19 y N-1). El programador no tocó ninguna.
- La lista actual da `bce643ced2161b8affbd63f7076227263a3148fc80708487ae1e8a1fac060e91` (271 líneas, formato `<hash>  <ruta>`). Con mi archivo nuevo, sin rastrear, son **272**.

### Cierre de la ronda 1 de 01f
- **Veredicto: ROTO.** Dos hallazgos:
  - **T-01 (alta):** el control de estado de pago no sigue a la cuenta, en `estado-de-pago-de-cuenta.tsx`, por el `useState(estadoPago)` sin resincronizar.
  - **T-02 (media):** con un diálogo abierto, el foco cae en `<body>` al cambiar de ficha por el historial. `useFocoAlPerderseElControl` no recuerda un control que vive en el portal.
- **Remedio esperado** (no lo prescribo): que la opción elegida se reinicie cuando el servidor trae otro estado y la persona no ha elegido otra; y que la raíz recupere el foco también cuando el control perdido estaba en un diálogo de la vista. Los hermanos de cada uno van en su hallazgo.
- **Corridas:** mi archivo, `4 failed | 6 passed (10)`; los módulos, `4 failed | 3453 passed (3457)`, con solo mis rojos; las vigiladas, `976 passed (976)`; `lint`, exit 0.
- Quedan para la ronda 2 los puntos 2 a 5. El punto 7 es para el humano.

## Ronda 2 — ADMIN-01f

Veredicto: **RESISTE.** Sin hallazgos. Las correcciones de T-01 y T-02 aguantan sus estados vecinos, la raíz no le quita el foco al botón sustituto y P-2 y D-6 se cumplen. Los puntos que no alcancé a atacar van en "No atacado y por qué".

Plan `7f344f7a…` (comprobado). Base `10356bd`. Leí la corrección (`resumen-programador.md:3356`), la verificación del manager (`revision.md:6859`, con sus nueve puntos de ataque) y el código nuevo:
- `estado-de-pago-de-cuenta.tsx`: la elección propia (`eleccion`) frente al estado visto (`estadoVisto`), y el `setQueryData` de `useCambiarEstadoPago`;
- `useFocoAlPerderseElControl(…, incluirDialogos)` en `components/foco/hooks.ts`, que solo usa `usuario-view.tsx`.

### Entorno
- Nadie más corría suites (lo dijo el orquestador); ningún `vitest` vivo antes de cada corrida.
- **Energía:** `BatteryStatus` **2** (corriente), del 38 % al 41 %.
- Sin navegadores: el punto 9, D-4 a 360 px, queda **no verificado**. No terminé ningún proceso.
- Los caracteres especiales van solo como texto; el barrido de mi archivo nuevo da 0 invisibles.

### Hallazgos
Ninguno.

### Atacado sin hallazgos (`frontend/src/features/admin/usuarios-01f-r2.ataque.test.tsx`)
- **Punto 1, la raíz frente al sustituto** (ADM-T2F01 y ADM-T2F02, con y sin `<StrictMode>`):
  - Al dar de baja desde el diálogo, con el foco en «Sí, dar de baja», el foco termina en «Reactivar».
  - Al restringir desde el diálogo, termina en «Restablecer acceso»; al restablecer después, en «Restringir acceso».
  - En ningún caso termina en la raíz ni en `<body>`, aunque `incluirDialogos` recuerde el botón del diálogo.
- **Punto 6, los estados vecinos de T-01:**
  - ADM-T2F03: una elección propia sin guardar («Deudor») se conserva cuando otra respuesta trae el mismo estado del servidor. Deja de contar cuando el servidor trae ese mismo estado. Cuando el servidor vuelve a «Al corriente» por fuera, el control lo sigue.
  - ADM-T2F04: tras «Guardar» con éxito, el control muestra «Deudor» en cuanto el servidor lo confirma, aunque la recarga de la ficha siga en vuelo. Sigue en «Deudor» cuando la recarga llega.
- **Punto 7, los estados vecinos de T-02:**
  - ADM-T2F05: Escape en el diálogo y, en el mismo turno, atrás del historial: el foco va a la raíz, nunca a `<body>`.
  - ADM-T2F06: abrir y cerrar el diálogo tres veces y cambiar de cuenta con el foco en «Restablecer contraseña»: también va a la raíz. La memoria del gancho no se queda con un control del diálogo cerrado.
- **Puntos 3 y 4, P-2 y D-6:**
  - ADM-T2F07: el `409` de corregir el correo de A no aparece en B, ni por el historial ni al volver a A con `navigate`.
  - ADM-T2F08: con el error de «Sí, restablecer» a la vista, un envío local inválido de "Corregir correo" deja un solo mensaje. Al reabrir la confirmación no vuelve el error viejo.
- **Regresión:** mi archivo de la ronda 1 (ADM-T1F01 a ADM-T1F08, con T-01 y T-02) queda en verde completo dentro de la corrida de los módulos, igual que los C-n de la ronda 0.

### No atacado y por qué
- **Punto 2, la tabla** («Ver» con la búsqueda diferida, la última página con solo repetidos, el alta con la tabla en error), **punto 5** (el `401` a la mitad de la tabla, de la ficha y de «Guardar») y el resto del punto 6 (la ficha desmontada con «Guardar» en vuelo): no los ataqué en esta ronda. Los cubren hoy ADM-1F02, ADM-1F17 a ADM-1F19 y las pruebas de `apiClient`, todas en verde.
- **Punto 7, el `5xx` de la recarga de la propia ficha con el diálogo abierto:** no lo ataqué.
- **Punto 8, el borrado de una clase con el historial:** no lo ataqué. Es de fuera de 01f, y su destino sería ESTADO §3.
- **Punto 9, D-4 a 360 px:** exige navegador. **No verificada**; la decide el humano en la comprobación de 01g.

### Archivo nuevo (solo `*.ataque`, sin rastrear)

| Archivo | Casos | SHA-256 |
|---|---|---|
| `frontend/src/features/admin/usuarios-01f-r2.ataque.test.tsx` | 10 (ADM-T2F01 y ADM-T2F02 con y sin `<StrictMode>`, ADM-T2F03 a ADM-T2F08) | `e27d328b6d7f7a6b9509a0f351576785284b87aa8095a57249208fd897e2f458` |

Parte del preámbulo de mi archivo de la ronda 1 (mismo doble de la API, con las rutas de baja, estado de pago, correo y restablecer, y una recarga de la ficha que queda en vuelo). Pasa `npx eslint`, `prettier` y `tsc -b` sin errores. El de la ronda 1 sigue con `f1c8d06a…`.

### Corridas (desde `frontend/`; una después de otra)
1. **Mi archivo** (17:00:08): `npx vitest run --reporter=verbose src/features/admin/usuarios-01f-r2.ataque.test.tsx` → `Test Files 1 passed (1)` · `Tests 10 passed (10)`.
2. **Módulos de 01f** (17:00:28): `npx vitest run src/features/admin src/features/clases src/components/foco src/components/layout`
   ```
    Test Files  147 passed (147)
         Tests  3489 passed (3489)
      Start at  17:00:28
      Duration  176.84s (transform 33.41s, setup 99.49s, import 247.68s, tests 1045.64s, environment 469.85s)
   ```
   Son los `3479` de la corrida del manager más mis 10 casos nuevos.
3. **Vigiladas fuera de los módulos y mis C-n de `app/`, `lib/`, `services/`, `styles/` y `features/auth`** (17:03:39; los mismos 29 archivos de la ronda 1): `Test Files 29 passed (29)` · `Tests 976 passed (976)`.
4. **`lint` del frontend:** `npm run lint` → exit 0. Antes sale "All matched files use Prettier code style!", y la última línea es `> tsc -b`, sin errores.

### V-01
- Las 271 `*.ataque` rastreadas son idénticas a la lista de la ronda 1 de 01f (`bce643ce…`; `diff` sin diferencias). El programador no tocó ninguna.
- Sin rastrear, mías: `usuarios-01f-r1` (`f1c8d06a…`, sin cambios) y `usuarios-01f-r2` (`e27d328b…`). Son **273** en total.

### Cierre de la ronda 2 de 01f
- **Veredicto: RESISTE.** 0 hallazgos.
- **Corridas:** mi archivo, `10 passed (10)`; los módulos, `3489 passed (3489)` en 147 archivos; las vigiladas, `976 passed (976)` en 29; `lint`, exit 0. Todo con corriente.
- **Sin atacar en esta ronda:** los puntos 2, 5 y 8 y parte de 6 y 7. **No verificado:** el punto 9 (360 px), para el humano.
