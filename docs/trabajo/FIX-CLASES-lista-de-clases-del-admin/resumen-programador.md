# Resumen del programador — FIX-CLASES

## FIX-CLASES — Implementación

Plan: docs/trabajo/FIX-CLASES-lista-de-clases-del-admin/plan.md (base `<R>` = ad070b9, rama fix/clases)
Pasos completados: 8 de 8 (pasos 2 a 9)

Archivos creados / modificados (por mí):
- backend/test/lecturas-consistentes.integracion.test.ts (nuevo)
- backend/src/adapters/db/cliente.ts
- backend/src/adapters/db/clases.ts
- backend/src/adapters/README.md
(backend/test/admin-muro-02b-r1.ataque.test.ts ya venía modificado por el tester, C-1; no lo toqué.)

Precondiciones: rama fix/clases; PA-01 (regla "Campus: bloquear entrada a Docker en redes publicas" Enabled/Inbound/Block/Public; red activa `uacam5 2`); V-01: 141 *.ataque iguales a la tabla de la ronda 0 (antes y después de mi trabajo; solo difiere de main admin-muro-02b-r1).

## Paso 3: pruebas solas contra el código sin cambios (rojo por el defecto)
Comando: `cd backend; npx vitest run test/lecturas-consistentes.integracion.test.ts` → `Tests  6 failed | 3 passed (9)` (salida en scratchpad/paso3.txt)
- PR-FX-01 (primer punto, instantaneaUnica): `expected 'read committed' to be 'repeatable read'` (la opción no existe). Los otros 3 casos de PR-FX-01 (controles) pasan.
- PR-FX-02: `expected 500 to be 200`, log `ZodError too_small` en `clases[0].maestros` (gestion.ts:44).
- PR-FX-03a: `TypeError: Cannot read properties of null (reading 'id')` en clases.ts:334 (clase nula).
- PR-FX-03b: `expected [] to deeply equal [ { nombre: 'Maestro …' } ]` (maestros: []).
- PR-FX-04: `TypeError: Cannot read properties of null (reading 'nombre')` en clases.ts:280.
- PR-FX-05: `expected [] to deeply equal [ { id, nombre } ]` (maestros: []).
Ninguna cayó por una precondición de §D-4 (todas se formaron detrás de la tabla). No hay PA-20.

## Pruebas requeridas (archivo: backend/test/lecturas-consistentes.integracion.test.ts)
- PR-FX-01 punto 1 → "PR-FX-01 · con { instantaneaUnica: true } la transacción corre en repeatable read"
- PR-FX-01 punto 2 → "PR-FX-01 · sin opciones y con solo { maxWait } la transacción sigue en read committed"
- PR-FX-01 punto 3 → "PR-FX-01 · anidada, manda la transacción de afuera (read committed)"
- PR-FX-01 punto 4 → "PR-FX-01 · un AppError lanzado dentro de una transacción con la opción sale tal cual"
- PR-FX-02 → "PR-FX-02 · GET /api/admin/clases con la clase borrada entre la página y sus maestros responde 200 con la clase y sus dos maestros"
- PR-FX-03a → "PR-FX-03a · listarClasesInscritas con la clase borrada entre la inscripción y la clase devuelve la clase con su maestro"
- PR-FX-03b → "PR-FX-03b · listarClasesInscritas con la clase borrada entre la clase y sus maestros devuelve la clase con su maestro"
- PR-FX-04 → "PR-FX-04 · listarClasesImpartidas con la clase borrada entre la asignación y la clase devuelve la clase con alumnos 0"
- PR-FX-05 → "PR-FX-05 · leerClase con la clase borrada entre la clase y sus maestros devuelve la clase con su maestro"
Precondiciones de §D-4 (marca application_name, formada en 4 s, no terminada antes) dentro de cada caso; sin retención previa en PR-FX-02 hay una precondición de 200.

## Paso 6: el archivo nuevo solo, con el remedio
Tres corridas aisladas (`npx vitest run test/lecturas-consistentes.integracion.test.ts`): las tres `Tests  9 passed (9)` (PA-09 sin diferencias).

## Verificación (comando y última línea)
- lint backend: `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0; antes: "All matched files use Prettier code style!")
- test backend: `cd backend; npm test` → `Tests  1755 passed (1755)` y `Test Files  148 passed (148)`; Duration 78.72s.
  - Nota: el primer intento (13:53) NO ejecutó ninguna prueba: `global-setup` falló al levantar Testcontainers con "HTTP code 500 server error" de Docker (error de infraestructura, 26 min); Docker respondía bien después (contenedores dev sanos). Repetí la corrida una vez (14:19) y salió verde. Lo declaro porque pediste una sola corrida: la primera no llegó a correr pruebas.
- build raíz: `npm run build` (raíz) → `✓ built in 760ms` (exit 0)
- lint raíz: `npm run lint` (raíz) → `> tsc -b` del typecheck del frontend (exit 0)
- prisma validate: n/a (no se tocó el esquema)

## Conteos
- `cd backend; npx vitest list` → 1755 líneas, 148 archivos únicos, 9 casos de lecturas-consistentes (los cinco PR-FX presentes). Coincide con la corrida (148 archivos, 1755 casos). Frente a `<R>` (147 archivos / 1746 casos del reporte del tester): +1 archivo, +9 casos.

## PA-07 (corrida completa, scratchpad/test-completo2.txt)
- "Error no controlado": 10 = I-1 exacto (5 `buscarCredencialesPorEmail`, 1 `crearSesion`, 3 `ZodError` de URL del almacén, 1 "boom").
- P2028: 5 = los permitidos: `tx.sesion.findFirst`, `tx.sesion.create`, `tx.sesion.updateMany`, `tx.tokenCuenta.updateMany`, `$queryRawUnsafe` (cuentas-r3 y servicio-ocupado). Control positivo: servicio-ocupado.integracion y servicio-ocupado-ch-r1 en verde. Ninguno de las cuatro lecturas.
- `too_small`: 0. `TypeError`: 0. Cualquier otro rojo: ninguno. La frontera de nombres-tokens-r2 (899/900 s) pasó.
- N-02: la corrida completa no imprime duración por caso (reporter por defecto); no medí la retención en la corrida completa. Sin P2028 ni tiempo límite ajenos.

## V-01, V-03, V-04, V-05
- V-01: 141 iguales a la tabla de la ronda 0 (diff vacío).
- V-03: `git diff --name-only ad070b9 -- backend/prisma` vacío.
- V-04: `instantaneaUnica` solo en cliente.ts (definición y uso) y en 4 llamadas de clases.ts; `isolationLevel` solo en cliente.ts; `.$transaction(` solo en cliente.ts (dentro de enTransaccion); `$queryRaw/$executeRaw` nuevos: 0 (`$queryRawUnsafe` sigue 1 uso real, cliente.ts:84); en las cuatro transacciones ningún create/update/upsert/delete/$executeRaw; `Promise.all` ya no aparece en clases.ts.
- V-05: `git diff --quiet ad070b9` y `git status --porcelain` vacíos para todas las rutas de "No se toca" (middleware, handlers, core, workers, config, adapters/auth|notifier|queue|scheduler|storage|live, prisma, shared, frontend, infra, package.json y lock, vitest.config.ts, eslint, .prettierignore, AGENTS, CLAUDE, README, PRD, DESIGN, .claude, ARCHITECTURE*). Los demás archivos de adapters/db no se tocaron. Únicos cambios contra `<R>`: README.md de adapters, clases.ts, cliente.ts, admin-muro-02b-r1.ataque (C-1, del tester) y el archivo nuevo.

## Hallazgos atendidos
No aplica (implementación inicial). Hermanos del inventario §D-3 aplicados: las cuatro funciones "Aplica"; `editarClase` hereda por `leerClase` sin cambios; las 'no aplica' no se tocaron.

## Desviaciones del plan
Ninguna de diseño. Detalles de forma: (1) cada función afectada pasó de `async` a devolver la promesa de `enTransaccion`, como prevé el plan; (2) PR-FX-01 son cuatro casos `it` (uno por punto); (3) repetí una vez la corrida completa por el fallo de Docker descrito arriba.

## Pendiente o fuera de alcance
- Textos de A-1 (ESSENTIALS, ARCHITECTURE §14, ESTADO) los aplica el orquestador.
- La prueba nueva retiene `clases` y `maestros_de_clase` unos milisegundos con NOWAIT y reintento; no vi efectos en otros archivos.

## (SUPERADO por la sección completa de abajo) Corrección de la ronda 1, parcial: detenido por PA-22 / PA-05

Hecho: E-1 (rama fix/clases; PA-01 con red IZZI-F281-5G, regla habilitada; V-01 142/142 contra la tabla de la ronda 1; A-2 registrada), E-2, E-3, E-4 y E-5 parcial. No hechos: E-6 a E-8.

E-2: PR-FX-06, 06b, 07 y 07b agregados a backend/test/lecturas-consistentes.integracion.test.ts (títulos exactos del plan), con doble del ejecutor propio.
E-3 (publicaciones.ts sin cambios): `Tests  4 failed | 9 passed (13)`; las cuatro caen despues de su control y de la precondicion del gancho, por el defecto: PR-FX-06 `expected [] to deeply equal [P3,P4]` (linea 496); PR-FX-06b `expected +0 to be 1` (comentarios, linea 527); PR-FX-07 `expected [] to deeply equal [K3,K4]` (linea 568); PR-FX-07b `expected [] to deeply equal [K1,K2]` (linea 596). Salida: scratchpad/e3.txt.
E-4: listarPublicaciones y listarComentarios en enTransaccion(..., { instantaneaUnica: true }); comentario de enTransaccion ampliado en cliente.ts. Nada mas en publicaciones.ts.
E-5: archivo nuevo tres veces `Tests  13 passed (13)`. lecturas-fx-r1.ataque: `Tests  1 failed | 23 passed (24)`: T-01 y T-02 pasan; falla "la opción solo se puede activar dentro de adapters/db: ..." porque hace `expect(usos).toEqual(["adapters/db/clases.ts:4"])` (linea 787) y ahora hay `adapters/db/publicaciones.ts:2`. Es una expectativa de la ronda 1 que contradice V-04 de la Enmienda 1 (6 usos). No la toque (PA-22).

## FIX-CLASES — Corrección de la ronda 1

Plan: plan.md, Enmienda 1 (A-2 registrada en aprobacion.md). Pasos completados: E-1 a E-8 (8 de 8). La parada PA-22 quedó resuelta por C-2 del tester (no toqué lecturas-fx-r1.ataque).

Archivos de esta ronda: backend/src/adapters/db/publicaciones.ts (solo listarPublicaciones y listarComentarios), backend/src/adapters/db/cliente.ts (solo el comentario de enTransaccion), backend/src/adapters/README.md (textos de la Enmienda 1), backend/test/lecturas-consistentes.integracion.test.ts (doble del ejecutor y 4 casos).

### Hallazgos
- T-01 (listarPublicaciones, página vacía si se borra el cursor entre su comprobación y la página): corregido. Mi caso: lecturas-consistentes.integracion.test.ts › "PR-FX-06: listarPublicaciones con la publicación del cursor borrada entre su comprobación y la página devuelve las publicaciones que siguen". Del tester: lecturas-fx-r1.ataque.test.ts › "listarPublicaciones: con la publicación del cursor borrada después de leerla, devuelve 400 o las publicaciones que siguen, nunca una página vacía con publicaciones detrás".
- T-02 (listarComentarios): corregido. Mi caso: "PR-FX-07: listarComentarios con el comentario del cursor borrado entre su comprobación y la página devuelve los comentarios que siguen". Del tester: lecturas-fx-r1.ataque.test.ts › "listarComentarios: con el comentario del cursor borrado después de leerlo, devuelve 400 o los comentarios que siguen, nunca una página vacía con comentarios detrás".

### Hermanos (lecturas con cursor y conjunto de claves de adapters/db)
- listarClasesAdmin, listarClasesInscritas, listarClasesImpartidas (clases.ts): aplica; ya aplicado en la implementación original (instantánea única); caso del tester en lecturas-fx-r1 (gancho tras la lectura del cursor) y PR-FX-02 a PR-FX-04 para las fronteras de clase.
- listarPublicaciones y listarComentarios (publicaciones.ts): aplica; aplicado ahora (T-01, T-02).
- listarEnlacesRegistro y la otra lectura con cursor de enlaces-registro.ts: no aplica hoy, sin disparador (los enlaces no se borran, se revocan; plan O-4). No se tocó el archivo.
- listarPersonas y listarAlumnosDeClase (inscripciones.ts, conjunto de claves con condicionesDePagina, sin cursor de Prisma): no aplica, la página no depende de que exista la fila del cursor. No se tocó.

### Estados vecinos de cada envoltura
- listarPublicaciones: cursor→página: PR-FX-06; página→conteo y página→adjuntos: PR-FX-06b; ejecutor externo: el doble pasa como ejecutor y abre la instantánea (PR-FX-06 y 06b); con un TransactionClient real manda la transacción de afuera (PR-FX-01, anidada).
- listarComentarios: cursor→página: PR-FX-07; publicación→comentarios: PR-FX-07b; ejecutor externo: igual que arriba.
- Cursor que ya no existía antes de la primera sentencia: sigue dando 400 (cubierto por pruebas existentes de muro y por el caso del tester, rama 400).

### E-3 (publicaciones.ts sin cambios)
`Tests  4 failed | 9 passed (13)`: PR-FX-06 `expected [] to deeply equal [P3,P4]` (línea 496); PR-FX-06b `expected +0 to be 1` (comentarios, línea 527); PR-FX-07 `expected [] to deeply equal [K3,K4]` (línea 568); PR-FX-07b `expected [] to deeply equal [K1,K2]` (línea 596). Las cuatro caen después de su control y de la precondición del gancho. Salida: scratchpad/e3.txt.

### Verificación
- Archivo nuevo tres veces seguidas: `Tests  13 passed (13)` (x3).
- `cd backend; npx vitest run test/lecturas-fx-r1.ataque.test.ts test/lecturas-consistentes.integracion.test.ts` → `Test Files  2 passed (2)` / `Tests  37 passed (37)` (24 + 13).
- lint backend: `cd backend; npm run lint` → exit 0, última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- test backend: `cd backend; npm test` → `Test Files  149 passed (149)` / `Tests  1783 passed (1783)`, Duration 86.70s (15:17 a 15:19).
- build raíz: `npm run build` → `✓ built in 731ms`. lint raíz: `npm run lint` → exit 0, última línea `> tsc -b`. prisma validate: n/a.
- Conteos: `cd backend; npx vitest list` → 1783 casos, 149 archivos únicos; 13 de lecturas-consistentes (PR-FX-01 a 07b presentes) y 24 de lecturas-fx-r1. Coincide con la corrida.

### PA-07
"Error no controlado" = 10 = I-1 (5 búsqueda de credenciales, 1 crearSesion, 3 ZodError del almacén, 1 boom). P2028 = 5 permitidos: tx.sesion.findFirst, tx.sesion.create, tx.sesion.updateMany, tx.tokenCuenta.updateMany, prisma.$queryRawUnsafe; control positivo servicio-ocupado en verde. too_small = 0; TypeError = 0; ningún rojo; la frontera de nombres-tokens-r2 pasó.

### V-01, V-04, V-05, V-07
- V-01: 142 *.ataque iguales a la tabla de "C-2 (Enmienda 1)" del reporte del tester (diff vacío).
- V-04: instantaneaUnica en clases.ts (4), publicaciones.ts (2) y la definición en cliente.ts; isolationLevel solo en cliente.ts; .$transaction( solo en cliente.ts; $queryRaw/$executeRaw nuevos: 0; solo muro.ts (líneas 126 y 203) llama a las dos funciones, sin ejecutor; ninguna escritura dentro de las 6 transacciones.
- V-05: sin diff ni status en todas las rutas de "No se toca" (incluidos inscripciones.ts, enlaces-registro.ts, middleware, handlers, core, prisma, shared, frontend, infra, package*.json). Cambios contra la base: README.md de adapters, clases.ts, cliente.ts, publicaciones.ts (diff abajo), admin-muro-02b-r1 (C-1, tester), más archivos nuevos de pruebas (el mío y lecturas-fx-r1 del tester).
- V-07: los diez IDs PR-FX aparecen en la lista.

### Diff completo de publicaciones.ts contra la base (hunks: comentarios previos y cuerpos de listarPublicaciones y listarComentarios únicamente)
```diff
diff --git a/backend/src/adapters/db/publicaciones.ts b/backend/src/adapters/db/publicaciones.ts
index d35ab73..a47eb79 100644
--- a/backend/src/adapters/db/publicaciones.ts
+++ b/backend/src/adapters/db/publicaciones.ts
@@ -152,7 +152,11 @@ export const crearPublicacion = (
 // Más reciente primero. Cursor de Prisma sobre la PK (el orden es creado_en DESC, id DESC, que
 // sigue el índice de la clase). El conteo de comentarios sale de una sola consulta agrupada para
 // toda la página, fuera de cualquier ciclo.
-export const listarPublicaciones = async (
+// FIX-CLASES (T-01): la comprobación del cursor, la página, el conteo y los adjuntos corren en una
+// sola instantánea; si la publicación del cursor se borra después de comprobarla, la página sigue
+// viéndola y devuelve las que siguen en lugar de quedar vacía. Con el ejecutor de una transacción
+// externa, corre con el aislamiento de esa transacción (hoy solo la llama muro.ts, sin ejecutor).
+export const listarPublicaciones = (
   {
     claseId,
     cursor,
@@ -160,56 +164,61 @@ export const listarPublicaciones = async (
     actor,
   }: { claseId: string; cursor: string | undefined; limite: number; actor: ParticipanteDeAutoria },
   ejecutor: Ejecutor = obtenerDb(),
-): Promise<ListaPublicacionesDb> => {
-  if (cursor !== undefined) {
-    const delCursor = await ejecutor.publicacion.findFirst({
-      where: { id: cursor, claseId },
-      select: { id: true },
-    })
-    if (delCursor === null) throw errorCursorInvalido()
-  }
-  const filas = await ejecutor.publicacion.findMany({
-    where: { claseId },
-    select: SELECT_PUBLICACION,
-    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
-    take: limite + 1,
-    ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
-  })
-  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
-  if (pagina.length === 0) return { publicaciones: [], siguienteCursor }
+): Promise<ListaPublicacionesDb> =>
+  enTransaccion(
+    ejecutor,
+    async (tx) => {
+      if (cursor !== undefined) {
+        const delCursor = await tx.publicacion.findFirst({
+          where: { id: cursor, claseId },
+          select: { id: true },
+        })
+        if (delCursor === null) throw errorCursorInvalido()
+      }
+      const filas = await tx.publicacion.findMany({
+        where: { claseId },
+        select: SELECT_PUBLICACION,
+        orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
+        take: limite + 1,
+        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
+      })
+      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
+      if (pagina.length === 0) return { publicaciones: [], siguienteCursor }
 
-  const conteos = await ejecutor.comentario.groupBy({
-    by: ["publicacionId"],
-    where: { publicacionId: { in: pagina.map((fila) => fila.id) } },
-    _count: { _all: true },
-  })
-  const comentariosPorPublicacion = new Map(
-    conteos.map((conteo) => [conteo.publicacionId, conteo._count._all]),
+      const conteos = await tx.comentario.groupBy({
+        by: ["publicacionId"],
+        where: { publicacionId: { in: pagina.map((fila) => fila.id) } },
+        _count: { _all: true },
+      })
+      const comentariosPorPublicacion = new Map(
+        conteos.map((conteo) => [conteo.publicacionId, conteo._count._all]),
+      )
+      // d: una sola consulta para los adjuntos de toda la página (índice archivos(publicacion_id)).
+      const archivos = await tx.archivo.findMany({
+        where: { publicacionId: { in: pagina.map((fila) => fila.id) }, estado: "confirmado" },
+        select: { ...SELECT_ARCHIVO, publicacionId: true },
+        orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
+      })
+      const adjuntosPorPublicacion = new Map<string, ArchivoDb[]>()
+      for (const { publicacionId, ...archivo } of archivos) {
+        if (publicacionId === null) continue
+        adjuntosPorPublicacion.set(publicacionId, [
+          ...(adjuntosPorPublicacion.get(publicacionId) ?? []),
+          archivo,
+        ])
+      }
+      return {
+        publicaciones: pagina.map((fila) => ({
+          ...fila,
+          comentarios: comentariosPorPublicacion.get(fila.id) ?? 0,
+          adjuntos: adjuntosPorPublicacion.get(fila.id) ?? [],
+          puedeBorrar: puedeBorrar(actor, fila.autor),
+        })),
+        siguienteCursor,
+      }
+    },
+    { instantaneaUnica: true },
   )
-  // d: una sola consulta para los adjuntos de toda la página (índice archivos(publicacion_id)).
-  const archivos = await ejecutor.archivo.findMany({
-    where: { publicacionId: { in: pagina.map((fila) => fila.id) }, estado: "confirmado" },
-    select: { ...SELECT_ARCHIVO, publicacionId: true },
-    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
-  })
-  const adjuntosPorPublicacion = new Map<string, ArchivoDb[]>()
-  for (const { publicacionId, ...archivo } of archivos) {
-    if (publicacionId === null) continue
-    adjuntosPorPublicacion.set(publicacionId, [
-      ...(adjuntosPorPublicacion.get(publicacionId) ?? []),
-      archivo,
-    ])
-  }
-  return {
-    publicaciones: pagina.map((fila) => ({
-      ...fila,
-      comentarios: comentariosPorPublicacion.get(fila.id) ?? 0,
-      adjuntos: adjuntosPorPublicacion.get(fila.id) ?? [],
-      puedeBorrar: puedeBorrar(actor, fila.autor),
-    })),
-    siguienteCursor,
-  }
-}
 
 // Borra con id y clase_id; sus comentarios caen en cascada. false: no existe en esa clase. 403
 // BORRADO_NO_PERMITIDO (sin escribir nada) si core/autoria.ts no deja a este actor. d: antes del
@@ -241,7 +250,9 @@ export const borrarPublicacion = (
   })
 
 // null: la publicación no existe en esa clase.
-export const listarComentarios = async (
+// FIX-CLASES (T-02): la comprobación de la publicación, la del cursor y la página corren en una sola
+// instantánea (mismo remedio y misma regla del ejecutor externo que listarPublicaciones).
+export const listarComentarios = (
   {
     claseId,
     publicacionId,
@@ -256,33 +267,41 @@ export const listarComentarios = async (
     actor: ParticipanteDeAutoria
   },
   ejecutor: Ejecutor = obtenerDb(),
-): Promise<ListaComentariosDb | null> => {
-  const publicacion = await ejecutor.publicacion.findFirst({
-    where: { id: publicacionId, claseId },
-    select: { id: true },
-  })
-  if (publicacion === null) return null
+): Promise<ListaComentariosDb | null> =>
+  enTransaccion(
+    ejecutor,
+    async (tx) => {
+      const publicacion = await tx.publicacion.findFirst({
+        where: { id: publicacionId, claseId },
+        select: { id: true },
+      })
+      if (publicacion === null) return null
 
-  if (cursor !== undefined) {
-    const delCursor = await ejecutor.comentario.findFirst({
-      where: { id: cursor, publicacionId },
-      select: { id: true },
-    })
-    if (delCursor === null) throw errorCursorInvalido()
-  }
-  const filas = await ejecutor.comentario.findMany({
-    where: { publicacionId },
-    select: SELECT_COMENTARIO,
-    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
-    take: limite + 1,
-    ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
-  })
-  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
-  return {
-    comentarios: pagina.map((fila) => ({ ...fila, puedeBorrar: puedeBorrar(actor, fila.autor) })),
-    siguienteCursor,
-  }
-}
+      if (cursor !== undefined) {
+        const delCursor = await tx.comentario.findFirst({
+          where: { id: cursor, publicacionId },
+          select: { id: true },
+        })
+        if (delCursor === null) throw errorCursorInvalido()
+      }
+      const filas = await tx.comentario.findMany({
+        where: { publicacionId },
+        select: SELECT_COMENTARIO,
+        orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
+        take: limite + 1,
+        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
+      })
+      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
+      return {
+        comentarios: pagina.map((fila) => ({
+          ...fila,
+          puedeBorrar: puedeBorrar(actor, fila.autor),
+        })),
+        siguienteCursor,
+      }
+    },
+    { instantaneaUnica: true },
+  )
 
 // N-09: la transacción lee primero la publicación con FOR SHARE (única consulta cruda nueva de la
 // subentrega, etiquetada y parametrizada). Sin fila (la publicación no es de esa clase o ya se
```

### Desviaciones
Ninguna. Nota: los hunks de "@@ -155" y "@@ -244" que git etiqueta con la función anterior son los comentarios que preceden a las dos funciones.
