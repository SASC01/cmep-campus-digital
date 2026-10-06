# Contexto heredado de TAREAS-01a para FIX-CLASES

Copiado literal por el orquestador (2026-10-06) desde `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/` de la rama `feat/tareas` (commit `9237ecd`), que no existe en `main` ni en `fix/clases`. Solo lectura.

## Arbitraje — ronda 1 de 01a
Base: `reporte-tester.md`, "TAREAS-01a — Ronda 1" (SHA-256 `44162db5…df38`), y `aprobacion.md`, "Ronda 1 de 01a del tester: ROTO". Leí el código citado; no corrí nada en este arbitraje.

### 1. T-02 y T-03: se corrigen en 01a, en una clave de comparación propia de los nombres de temas y categorías
- **No se toca `normalizarTerminoDeBusqueda`.** La usan el buscador de alumnos, `usuarios.nombre_busqueda` (ya guardado y normalizado al escribir) y su índice de trigramas (ESSENTIALS, "Búsqueda de alumnos": "definida una sola vez en `shared/`"). Cambiarla obligaría a renormalizar las filas guardadas y movería la búsqueda de alumnos sin plan. Queda fuera de 01a.
- **Dónde va el remedio:** en `shared/src/tareas.ts` (permitido en 01a), una sola función pura que dé la clave de comparación de un nombre de tema o de categoría. Primero NFKC; después quita los `Default_Ignorable_Code_Point` (`/\p{Default_Ignorable_Code_Point}/gu`); al final, `normalizarTerminoDeBusqueda`. La usan los **cuatro** sitios que hoy comparan nombres: `validarNuevoTema` y `validarRenombre` (`core/tareas/temas.ts`), `planearReemplazoDeCategorias` (`core/tareas/categorias.ts`) y el refine de nombres repetidos de `reemplazarCategoriasSchema` (`shared/src/tareas.ts`). El tester los cuenta como tres flujos (crear tema, renombrar tema, guardar categorías), pero el guardado compara en dos lugares. **Solo cambia la comparación:** el nombre se guarda y se muestra tal como llega, con los ZWJ de los emojis intactos, porque `textoConContenidoSchema` los admite a propósito.
- **T-02 (invisibles):** es un defecto. S-05 dice que los nombres no se repiten, y dos nombres que se ven idénticos son el mismo nombre.
- **T-03 (formas de compatibilidad):** también se corrige en 01a, con la misma función. S-05 nombra solo mayúsculas y acentos, pero el plan, en "Puntos de ataque" para 01a (punto 2), pone el ancho completo entre las variantes de "nombres iguales": es la intención del arquitecto, no un requisito inventado. Agregar NFKC a una función que hay que crear de todos modos por T-02 cuesta una línea y no toca la búsqueda de alumnos. Si se dejara fuera, los dos casos rojos de T-03 quedarían en `*.ataque` sin remedio, y el programador no puede tocarlos.
- **O-01 ("ñ" igual a "n")** se queda como está: es el criterio de ESSENTIALS para `nombre_busqueda`, y la clave nueva lo hereda a propósito.
- Para ESTADO §3 (destino: el encargo que vuelva a abrir la búsqueda de alumnos): ¿`normalizarTerminoDeBusqueda` debe quitar los ignorables y aplicar NFKC para los nombres de personas? Así queda decidido una sola vez para todo `nombre_busqueda`.

### 2. El `500` de `GET /api/admin/clases` (PR-2A12)
- **La hipótesis del tester es plausible, y es la causa más probable.** `listarClasesAdmin` (`adapters/db/clases.ts:361`) pide las clases con `maestros: SELECT_MAESTROS_DE_CLASE` anidado. Con Prisma 7.10 sin la vista previa `relationJoins` (el `generator` de `schema.prisma` no la declara), Prisma resuelve la relación con una segunda consulta (`maestros_de_clase WHERE clase_id IN (…)`), fuera de una transacción. En READ COMMITTED, cada sentencia ve su propia instantánea. Si otro archivo de pruebas borra sus clases entre las dos sentencias (`borrarClasesDePrueba` hace `clase.deleteMany`, y la cascada borra `maestros_de_clase`), la primera ve la clase y la segunda ya no ve sus maestros. La página sale con `maestros: []` y el esquema de respuesta (mínimo 1) lanza `ZodError too_small`, que termina en `500`. La lista es global, así que la toca la limpieza de cualquier archivo en paralelo. Eso explica que sea intermitente y que saliera verde en las corridas del programador y en la mía.
- **No encontré otra causa ni una condición de la base con una clase sin maestros:** `core/clases/maestros.ts` no deja quitar al último maestro y valida dentro de la transacción, con la clase bloqueada. `crearClaseAdministrada` y `crearClaseDePrueba` crean la clase y sus asignaciones en un solo `create` anidado. `maestros_de_clase.maestro_id` es `ON DELETE RESTRICT`. Ninguna ruta borra clases. Los `INSERT INTO clases` sin maestro de `migracion-maestros-de-clase` y `sexto-paso-02a-r1` van sobre tablas temporales y se revierten. El caso nuevo del tester (`temas-01a-r1`, maestro retirado) deja la clase con un maestro, no con cero, y terminó 22 s antes.
- **Por qué sigue siendo del dominio (regla del humano del 2026-10-02):** la lectura no es consistente. Hoy solo la dispara la limpieza de las pruebas, pero cualquier borrado de clases futuro (una baja de clase en ADMIN) produciría el mismo `500` en el flujo del admin. Hermanos que debe revisar quien lo corrija: toda lectura con una relación anidada cuyo esquema exige un mínimo (`listarClasesInscritas`, `listarClasesImpartidas`, `leerClase` con sus maestros para el encabezado, `listarPersonas`).
- **(a) I-1:** no entra. I-1 es la lista de errores provocados a propósito, y este no lo es.
- **(b) PA-07 en las corridas siguientes de 01a, mientras exista el pendiente:** si reaparece **exactamente** ese error (`GET /api/admin/clases`, `ZodError too_small` en `clases[n].maestros`) y, con él, el rojo de PR-2A12 u otro caso de la lista del admin en `gestion-clases.integracion`, quien corre lo reporta con `requestId`, hora, proceso y el caso rojo, **no repite la corrida para limpiarla** (PA-12) y **no bloquea** el veredicto de 01a. Cualquier otro "Error no controlado", o ese mismo error en otra ruta, sí bloquea. Excepción: si sale en la corrida de cierre del manager, se reporta en `revision.md` y el humano lo ve en el resumen del commit de 01a.
- **(c) Destino recomendado para el humano:** **pendiente de prioridad alta en ESTADO §3**, con su propio encargo `fix/clases` (carril normal: toca `adapters/db/clases.ts`, sin migración ni middleware), que conviene correr **después del commit de 01a y antes de la ronda 0 de 01b**, para que las corridas de 01b salgan limpias. No recomiendo meterlo en 01a: es código de otro dominio, protegido en TAREAS-01, y mezclarlo rompe "una funcionalidad por cambio". El remedio lo decide su plan; las salidas naturales son leer la página y sus maestros en una sola instantánea (una transacción de solo lectura en REPEATABLE READ, o una sola sentencia) y aplicar lo mismo a los hermanos.

### 3. T-01, T-02 y T-04 van al programador (y T-03 con ellos, por el punto 1)
- **T-01 y T-04 son el mismo mecanismo:** un id de la ruta que no se pasa a minúsculas antes de compararlo en memoria o de devolverlo. Se espera **un solo remedio**, en la validación de los parámetros de 01a (`temaIdParamSchema` y el `publicacionId` de la ruta de mover, pasados a minúsculas como ya hacen `ordenTemasSchema` y los ids de categoría). No basta con parchar `validarRenombre`. Así se cubren las dos condiciones de T-01 (que el tema exista y que no se cuente a sí mismo) y la respuesta de T-04.
- **Hermanos que el resumen de la corrección debe recorrer uno por uno** (regla de hermanos y de estados vecinos):
  - las seis rutas de temas y mover: `GET` y `POST …/temas` (sin id), `PUT …/temas/:temaId`, `DELETE …/temas/:temaId`, `PUT …/temas/orden` y `PUT …/publicaciones/:publicacionId/tema`;
  - los ids del cuerpo: `temaId` al mover y al publicar un material, `temaIds` del orden e `id` de cada categoría;
  - toda respuesta de 01a que repita un id recibido;
  - los cuatro sitios que comparan nombres (punto 1).

  Para cada uno: si el remedio aplica, si se aplicó y con qué caso queda cubierto. Los estados vecinos de la comparación de nombres: crear, renombrar al mismo nombre, renombrar al de otro, y el guardado de categorías con dos nombres equivalentes en el mismo cuerpo y frente a una categoría que ya existe.
- **Rojos que deben quedar en verde después de la corrección:** los 7 casos de `temas-01a-r1` y `categorias-01a-r1` (T-01 a T-04). El programador no toca ninguna `*.ataque`. Base de V-01: la tabla de 143 hashes de la ronda 1.
- **PA-07 de la corrección:** I-1 = 10, más la excepción del punto 2 (b).


---

## Verificación del resumen — TAREAS-01a — corrección de la ronda 1
Veredicto: **resumen ACEPTADO**. El tester puede atacar la ronda 2. Mi corrida completa del backend trajo **un rojo intermitente ajeno a la corrección**: está en una `*.ataque` de CLASES-02b que no cambió, la causa es una cuenta global sobre el único admin y pasa aislada. Lo reporto completo abajo (PA-12) y no lo cuento contra el resumen.
Corrida propia del 2026-10-06, una suite a la vez. PA-01: red `uacam5 2` (Pública, declarada de confianza hoy); regla del firewall habilitada, Inbound, Block, Public.

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd shared; npm run build` | código 0; `> tsc -p tsconfig.json` | código 0 |
| `cd backend; npm run lint` | código 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0 |
| `cd backend; npm test` | `Test Files 156 passed (156)` · `Tests 1918 passed (1918)` | `Test Files 1 failed \| 155 passed (156)` · `Tests 1 failed \| 1917 passed (1918)` (113.21 s): el rojo intermitente de abajo |
| `cd backend; npx vitest list` | 1918 pruebas, 156 archivos | 1918 líneas, 156 archivos. Por archivo, frente a mi lista de 01a: `core/tareas/temas.test.ts` 16 → 18, `categorias.test.ts` 16 → 17, `esquemas-tareas.test.ts` 27 → 29, y los dos `*.ataque` del tester (26 + 15 = 41). 1872 + 41 + 5 = 1918 |
| `npm run build` (raíz) | código 0; `✓ built in 1.58s` | código 0; `✓ built in 1.35s` |
| `npm run lint` (raíz) | código 0; `> tsc -b` | código 0; `> tsc -b` |
| `cd frontend; npm run lint` | código 0; `> tsc -b` | código 0; `> tsc -b` |
| `cd frontend; npm test` | `127 passed (127)` · `1852 passed (1852)` | `127 passed (127)` · `1852 passed (1852)` |

- **Los 7 rojos de la ronda 1, en verde:** en mi corrida completa, el único rojo es el de abajo, así que los 41 casos de `temas-01a-r1` y `categorias-01a-r1` (incluidos los 7 de T-01 a T-04) pasan.
- **V-01:** las 143 `*.ataque` coinciden con la tabla de la ronda 1 (`diff` vacío). Ninguna cambió.
- **PA-07:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `Unable to start a transaction` 0 · `"Error no controlado"` 10, exactamente I-1 (5 de `buscarCredencialesPorEmail`, 1 de `crearSesion`, 3 `ZodError` de URL del almacén y "boom") · `"code":"P2028"` 5, los permitidos (`tx.sesion.create`, `tx.tokenCuenta.updateMany`, `tx.sesion.findFirst`, `tx.sesion.updateMany` y `$queryRawUnsafe`), con el control positivo. `too_small`: 0. El `ZodError` de `GET /api/admin/clases` no reapareció y la excepción arbitrada no se usó. **Limpia.**
- **El rojo intermitente (PA-12, sin repetir la corrida completa):** `test/admin-muro-02b-r1.ataque.test.ts` › "ataque CLASES-02b r1: el admin no comenta (P-03 a)" › "comentar en su publicación y en la de un maestro…": `expected 3 to be +0` en la línea 391, `comentario.count({ where: { autorId: admin.id } })`.
  - La aserción cuenta los comentarios del admin **en toda la base**. El admin es una cuenta única que comparten todos los archivos, y `muro-admin.integracion.test.ts` siembra comentarios de ese admin con `crearComentarioDePrueba` (líneas 283 y 668, entre otras) mientras corre en paralelo.
  - Las cuentas se cruzan entre archivos. No hubo `500` ni ningún "Error no controlado".
  - Ninguno de los dos archivos cambió respecto de `ad070b9`, y la corrección no toca el muro ni los comentarios.
  - Corrido aislado para diagnosticar (`npx vitest run test/admin-muro-02b-r1.ataque.test.ts`): `10 passed (10)`.
  - **No es del dominio** (la regla de los `500` no aplica: la API respondió bien y lo que falla es la cuenta de la prueba) **ni de 01a**.
  - **Destino:** ESTADO §3, pendiente de aislamiento de pruebas. Como es una `*.ataque`, la reescribe el tester con autorización, acotando la cuenta a la clase o a las publicaciones de su escenario. Conviene que entre en la ronda 0 del `fix/clases` que ya recomendé.
  - **Para las corridas siguientes de 01a:** si reaparece **exactamente** ese caso con esa aserción, se reporta con su hora y no bloquea; cualquier otro rojo sí.

**Hermanos y estados vecinos, contrastados con el código** (todos los "aplica / se aplicó" y "no aplica" del resumen son ciertos):
- **Seis rutas de temas y mover:**
  - `GET` y `POST …/temas`: sin id de ruta; el `POST` compara con `claveDeNombre` (`validarNuevoTema`, `core/tareas/temas.ts:30-31`).
  - `PUT …/temas/:temaId` (`handlers/tareas/temas.ts:72`) y `DELETE …/temas/:temaId` (línea 87): las dos usan `temaIdParamSchema`, que ahora transforma a minúsculas (`shared/src/tareas.ts:47`). `validarRenombre` compara además en minúsculas en sus dos condiciones (líneas 40 a 45).
  - `PUT …/temas/orden`: `ordenTemasSchema` ya pasaba los ids a minúsculas (`enMinusculas`, línea 14), y `validarOrdenDeTemas` compara en minúsculas; sin cambio, con razón.
  - `PUT …/publicaciones/:publicacionId/tema`: `publicacionDeMoverParamSchema` (líneas 50 a 53, a minúsculas) solo en esa ruta (línea 100). `publicacionIdParamSchema` del muro no cambió (`git diff` de `shared/src/clases.ts` no lo toca).
  - Publicar un material con `temaId`: no aplica, con razón. El adaptador solo lo usa en `bloquearTemaParaUsar` (comparación `uuid` en la base, que no distingue mayúsculas) y la respuesta del muro no lleva `temaId`.
- **Ids del cuerpo:** `temaId` al mover pasa a minúsculas (`moverElementoSchema`, línea 60). Los `temaIds` del orden y el `id` de cada categoría ya iban a minúsculas (`reemplazarCategoriasSchema`, línea 128, y `planearReemplazoDeCategorias`, líneas 51, 58, 66 y 73). `temaId` al publicar: no aplica, por lo dicho arriba.
- **Respuestas que repiten un id recibido:** solo `moverATema` (`adapters/db/temas.ts:179`), que ahora devuelve los dos ids en minúsculas: `publicacionId` ya llega transformado y `temaId` también. Crear, renombrar, ordenar y las categorías responden filas releídas de la base. No hay otra.
- **Comparación de nombres:** los cuatro sitios usan `claveDeNombre`: `validarNuevoTema`, `validarRenombre`, `planearReemplazoDeCategorias` (línea 53) y el refine de `reemplazarCategoriasSchema` (línea 113). `normalizarTerminoDeBusqueda` solo se llama dentro de `claveDeNombre` y en la búsqueda de alumnos (`core/clases/busqueda.ts`), y no cambió (`git diff` de `shared/src/clases.ts` no la toca). `claveDeNombre` aplica NFKC, quita `\p{Default_Ignorable_Code_Point}` y luego llama a `normalizarTerminoDeBusqueda`, tal como el arbitraje. Los estados vecinos que lista el programador (crear; renombrar al mismo nombre en otra forma; renombrar al de otro; dos nombres equivalentes en el mismo guardado y frente a una existente, que en un guardado en bloque es el mismo caso) tienen caso nuevo en `core/` o en los rojos del tester.
- **"No se toca":** `git diff --name-only ad070b9` y los archivos sin versionar son los de 01a. Lo nuevo de la corrección cae en `shared/src/tareas.ts`, `shared/src/index.ts` (dos reexportaciones por nombre), `core/tareas/temas.ts`, `core/tareas/categorias.ts`, `handlers/tareas/temas.ts` y los tres archivos de PR-1A. `shared/src/` fuera de `clases.ts`, `tareas.ts` e `index.ts` no cambió.

Sin M-nn nuevos.


---

## Extracto de reporte-tester.md, TAREAS-01a — Ronda 1 (PA-07 y el 500 de PR-2A12)
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
Requisito o regla: "Puntos de ataque para el Tester" → 01a, punto 2 ("ancho completo"). S-05 solo nombra mayúsculas y acentos, así que el manager decide si el plan lo exig
