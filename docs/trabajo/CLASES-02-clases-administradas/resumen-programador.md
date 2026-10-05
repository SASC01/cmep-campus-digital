# Resumen del Programador — CLASES-02 · clases administradas, maestros por clase, autoría y barra lateral

## CLASES-02a — Implementación

Plan: `docs/trabajo/CLASES-02-clases-administradas/plan.md` (SHA-256 `2a4cf22fc8fc6d873374f7f199ae102a2463c16b4c6ccf9f5a6b10aafb331de0` al empezar la continuación, con las Enmiendas 1 y 2). Rama `feat/clases-02`, base `<R>` = `e4396a0`. Fecha: 2026-10-03.
Pasos completados: 2 a 10 de 02a. El paso 11 (resumen, manager, tester) sigue en el orquestador.
Una PARADA (PA-06, `shared/src/index.ts` en "No se toca") se activó al principio y la resolvió la Enmienda 2 con A-11. No se activó ninguna otra.

### Migración
- Nombre: `20261003191319_clases_administradas`, creada con `npx prisma migrate dev --create-only --name clases_administradas` y aplicada en `campus_dev` con `npx prisma migrate dev` ("Your database is now in sync with your schema").
- El SQL generado coincidió con §D-2A1 sin cambios (ni `DROP`, ni `ALTER` de columnas existentes, ni renombres de FK por `MovimientoInscripcion`: PA-03 y PA-04 no se activaron). Solo agregué a mano, al final, el bloque `-- CLASES-02 · datos` (`INSERT … SELECT … ON CONFLICT DO NOTHING`).
- V-03: `npx prisma validate` → "The schema at prisma\schema.prisma is valid"; `npx prisma format --check` → "All files are formatted correctly!"; `npx prisma generate` → "Generated Prisma Client (7.10.0)"; `npx prisma migrate status` → "Database schema is up to date!"; `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → "No difference detected." (código 0).

### Archivos creados
- `backend/prisma/migrations/20261003191319_clases_administradas/migration.sql`
- `backend/src/core/clases/maestros.ts`, `backend/src/core/clases/maestros.test.ts`
- `backend/src/adapters/db/maestros-de-clase.ts`
- `backend/src/handlers/clases/gestion.ts`
- `backend/test/gestion-clases.integracion.test.ts`, `backend/test/gestion-clases-autorizacion.integracion.test.ts`, `backend/test/migracion-maestros-de-clase.integracion.test.ts`

### Archivos modificados
- `shared/src/clases.ts` y `shared/src/index.ts` (A-11: solo reexportaciones nombradas nuevas; las existentes no se tocaron).
- `backend/prisma/schema.prisma` (`MaestroDeClase`, `Clase.maestros`, índice de `clases`, `actorId @map("maestro_id")`, `movimientosComoActor`, `asignacionesDeClase`; `prisma format` realineó columnas).
- `backend/src/core/clases/pertenencia.ts`, `texto.ts`.
- `backend/src/adapters/db/clases.ts`, `inscripciones.ts`, `index.ts`.
- `backend/src/middleware/index.ts`, `pertenencia.ts`, `require-membership.ts`, `require-ownership.ts` (A-1).
- `backend/src/handlers/clases/clases.ts`, `alumnos.ts`; `backend/src/app.ts` (A-9: una línea más el `import`).
- `backend/src/middleware/README.md`, `backend/src/adapters/README.md`, `backend/src/handlers/README.md`.
- Pruebas normales (A-4, PA-16): `backend/src/core/clases/pertenencia.test.ts`, `backend/src/core/clases/texto.test.ts`, `backend/src/middleware/index.test.ts`, `backend/test/ayudas-clases.ts`, `backend/test/clases.integracion.test.ts`, `backend/test/clases-autorizacion.integracion.test.ts`, `backend/test/alumnos-autorizacion.integracion.test.ts`, `backend/test/movimientos-inscripcion.integracion.test.ts`.
- Dobles del frontend (solo agregar `maestros`, regla "Dobles del frontend"): `frontend/src/app/router.test.tsx`, `frontend/src/features/clases/clase-layout.test.tsx`, `frontend/src/features/clases/inicio-estudiante-view.test.tsx`, `frontend/src/features/clases/components/formulario-clase.test.tsx`. Cada una suma 2 a 4 líneas (comentario de C-7 y el campo); ninguna aserción cambió.
- No modifiqué ninguna `*.ataque`, ningún archivo de "No se toca" ni `docs/` fuera de esta carpeta. `git diff e4396a0` de los 14 `*.ataque` que cambió el tester sigue siendo el del tester (302 inserciones, 88 borrados).

### Verificación (comando exacto y última línea de cada uno)
- lint del backend: `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (la última línea del script; código de salida 0, sin errores). Antes: "All matched files use Prettier code style!".
- test del backend: `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/p02a-test-2.json` (una sola corrida, código 0) → `Test Files  136 passed (136)` / `Tests  1673 passed (1673)` / `Duration  93.75s`.
- shared: `cd shared; npm run build` → `tsc -p tsconfig.json` (sin errores); `cd shared; npm run lint` → "All matched files use Prettier code style!".
- raíz: `npm run build` → `✓ built in 2.08s` (código 0; el aviso de tamaño de chunk del frontend ya existía); `npm run lint` → `> tsc -b` del frontend (código 0).
- frontend: `cd frontend; npm run lint` → `> tsc -b` (código 0); `cd frontend; npm test` → `Test Files  104 passed (104)` / `Tests  1396 passed (1396)`.
- Primera corrida del frontend, antes de completar los dobles: `11 failed | 1385 passed` en 4 archivos; todas las fallas fueron por `maestros` faltante en esos dobles; se corrigieron como dice el plan.
- Las corridas fueron de una en una (backend, luego frontend).

### PA-07 (corrida completa del backend, archivo `p02a-test-2.txt`)
| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `timed out` y `Unable to start a transaction` | 0 y 0 |
| `"Error no controlado"` | 10 (la misma cifra del I-1 de la ronda 0) |
| `"code":"P2028"` | 5 |

Los 5 `P2028` son exactamente los permitidos: `POST /api/auth/cambiar-contrasena` (`tx.sesion.findFirst()`), `POST /api/auth/refrescar` (`tx.sesion.updateMany()`), el `$queryRawUnsafe` de `POST …/comentarios` (los tres de `servicio-ocupado.integracion`), y `POST /api/auth/login` (`tx.sesion.create()`) y `POST /api/auth/restablecer` (`tx.tokenCuenta.updateMany()`) (los dos de `cuentas-r3`). Control positivo presente (los cinco aparecen). Ningún `P2028` de una ruta de CLASES-02. PA-12 no se activó. No verifiqué uno por uno el origen de los 10 `"Error no controlado"` (solo la cifra); el manager y el tester cuentan con I-1.

### Los 26 rojos de la ronda 0
- Con la implementación quedaron en verde: la corrida completa no tiene ningún caso fallido (`Tests  1673 passed (1673)`). Los 7 archivos que tenían los 26 rojos (`clases-r1`, `clases-r2`, `clases-r3`, `muro-c-r1`, `alumnos-b-r1`, `alumnos-b-r2`, `sesiones-y-cadena`) están dentro de los 136 que pasan.
- Los 10 errores de `tsc -p tsconfig.test.json` de la ronda 0 desaparecieron (`crearClaseAdministrada`, `actorId`, `regenerarCodigo(claseId, generarCodigo)`).
- O-01 del tester (`regenerarCodigo` con la firma vieja reescrito citando C-3): sin objeción, la firma nueva es la de "Cambios por capa" y A-10.

### V-01 (hashes)
`git ls-files '*.ataque.test.*' | xargs sha256sum` contra `tabla-02a-r0.md` de la ronda 0: 115 de 115 hashes iguales (la única diferencia al comparar texto fue la mayúscula de `apiClient` en el nombre de ruta, por la conversión a minúsculas de mi `sed`, no del hash). Ninguna `*.ataque` es mía ni la toqué; no hay `*.ataque` sin rastrear.

### Conteos
- `cd backend; npx vitest list` → 1673 líneas (1673 casos); `npx vitest list --filesOnly` → 136 archivos. Partida: 1623 casos y 132 archivos. Diferencia: +50 casos y +4 archivos (`maestros.test.ts` y los tres archivos de integración nuevos).
- Casos con `PR-2A` en el título: 59 (`grep -c "PR-2A"` sobre la salida de `npx vitest list`).
- Frontend: 104 archivos y 1396 casos en la corrida (sin cambios de cifra).

### Pruebas requeridas (archivo y título exacto del caso, que se lee de `npx vitest list`)
Todas están cubiertas. Los títulos completos van en la salida de `npx vitest list`; aquí el archivo y la cabecera `PR-2Axx:` (el texto completo del título sigue a los dos puntos y es el de la lista).
- **PR-2A01** → `backend/src/core/clases/pertenencia.test.ts`, 10 casos `PR-2A01: …` (estudiante inscrito, no inscrito, maestro asignado, no asignado, admin con clase, admin sin clase, rol desconocido, datos nulos, maestro con `inscrito: true`, estudiante con `esMaestro: true`).
- **PR-2A02** → `backend/src/core/clases/pertenencia.test.ts`, 3 casos: «PR-2A02: con admiteAdmin true, 'propiedad' deja pasar a 'maestro' y 'admin' y niega al resto», «PR-2A02: con admiteAdmin true, 'inscripcion' deja pasar las tres relaciones y niega null», «PR-2A02: con admiteAdmin false, las dos exigencias niegan 'admin' y el resto queda igual».
- **PR-2A03** → `backend/src/core/clases/maestros.test.ts`, 3 casos (0 o 1 actuales; ya asignado con 1 y con 2; nuevo con 2 → `409 TOPE_DE_MAESTROS`).
- **PR-2A04** → `backend/src/core/clases/maestros.test.ts`, 4 casos (único → `409 CLASE_SIN_MAESTRO`; de dos con el orden recibido; no asignado; lista vacía).
- **PR-2A05** → `backend/src/core/clases/texto.test.ts`, 4 casos del `describe("conTextosNormalizados")` («PR-2A05: CRLF y CR pasan a LF y se recorta, solo en los campos pedidos», «campos ausentes, no texto o null se dejan intactos», «un cuerpo que no es objeto se devuelve igual», «no muta el objeto recibido»).
- **PR-2A06** → `backend/src/middleware/index.test.ts`, 4 casos del `describe("el admin y el sexto paso (CLASES-02a, M-01)")`: sin roles (admin 403, estudiante y maestro pasan), roles que nombran a admin (200) y roles sin admin (`ROL_NO_PERMITIDO`), clase inexistente y arreglo de roles mutado, y «protegido() no lanza con pertenencia y roles ausentes, vacíos o congelados, y la cadena sigue con seis pasos en orden». **No cubierta la variante "undefined explícito"**: con `exactOptionalPropertyTypes` el tipo `OpcionesProtegido` no permite pasar `roles: undefined`, así que el caso de "ausente" es el equivalente; "otra capitalización" tampoco tiene caso (un rol `"Admin"` no es un `Rol` válido y `requireRole` lo rechazaría).
- **PR-2A07** → `backend/test/migracion-maestros-de-clase.integracion.test.ts`: «PR-2A07: la sentencia de datos deja una fila (id, maestro_id, creado_en) por clase, sin duplicar la que ya existía, es repetible, y se revierte sin dejar nada».
- **PR-2A08** → mismo archivo: «PR-2A08: maestros_de_clase tiene la PK, el índice (maestro_id, creado_en DESC, clase_id DESC), la FK a clases con ON DELETE CASCADE y la FK a usuarios con ON DELETE RESTRICT; clases tiene el índice (creado_en DESC, id DESC) y maestro_id sigue NOT NULL».
- **PR-2A09** → `backend/test/gestion-clases.integracion.test.ts`: «PR-2A09: crearClaseDePrueba crea la clase y sus asignaciones en un solo create anidado, con la misma creado_en que la clase y maestro_id = el primer maestro». La aserción de igualdad de `creado_en` pasó sin ajustar la ayuda (O-E1 no se activó).
- **PR-2A10** → mismo archivo, 4 casos (201 con 1 y 2 maestros; 400 por `maestroIds` inválidos; 404 `MAESTRO_NO_ENCONTRADO`; reglas de nombre y descripción).
- **PR-2A11** → mismo archivo: «PR-2A11: edita nombre y descripción y devuelve el detalle con maestros; una clase inexistente responde 403 SIN_ACCESO_A_LA_CLASE y un claseId que no es UUID, 400».
- **PR-2A12** → mismo archivo, 2 casos (orden, paginación, maestros, alumnos activos y total; cursor inválido y `limite` inválido). El recorrido usa clases con fechas de 2099 para no depender de las demás pruebas que corren en paralelo: **`total` solo se comprueba como mayor o igual a 5**, no como igualdad con la cuenta de la tabla (otros archivos escriben clases a la vez).
- **PR-2A13** → mismo archivo, 2 casos (asignar, repetir, tercero → 409; 404).
- **PR-2A14** → mismo archivo, 2 casos (retirar de dos, único, no asignado; escritura doble de `clases.maestro_id`).
- **PR-2A15** → mismo archivo, 2 casos: «PR-2A15: (a) tres asignaciones simultáneas … una 200 y dos 409, ninguna 500; (c) …» y «PR-2A15: (b) dos retiros simultáneos … (c) …».
- **PR-2A16** → mismo archivo: «PR-2A16: el maestro retirado pierde el acceso en la siguiente petición (detalle, muro y roster) y sus publicaciones se quedan; el asignado lo gana; impartidas refleja los dos cambios».
- **PR-2A17** → mismo archivo, 2 casos (solo maestros activos con correo completo y `hayMas`; mínimo, máximo, comodines `%`, `_` y `\` y carácter nulo). **No cubierto en este caso: "que el correo completo no salga en los logs"** (no está en las viñetas de PR-2A17; lo ataca el tester, PA-10).
- **PR-2A18** → mismo archivo: «PR-2A18: impartidas lista la clase a los dos maestros, por fecha de asignación; el cursor de una clase que ya no es del maestro responde 400; total correcto».
- **PR-2A19** → mismo archivo: «PR-2A19: inscritas y el detalle traen maestros (1 y 2) en orden y maestro = el primero».
- **PR-2A20** → mismo archivo: «PR-2A20: el admin en el detalle, el código (ver y regenerar), el roster, el buscador, el alta y la baja recibe 200 o 204; el alta y la baja escriben un movimiento con actorId = el admin y secuencia en orden; el buscador devuelve el correo enmascarado».
- **PR-2A21** → mismo archivo: «PR-2A21: POST /api/clases y PUT /api/clases/:claseId responden 404 (con token de maestro, de admin y sin token) y no escriben».
- **PR-2A22** → `backend/test/gestion-clases-autorizacion.integracion.test.ts`, 5 casos (sin token; inactiva, cambio pendiente y restringido; los cuatro roles que reciben `ROL_NO_PERMITIDO` sin cambios; admin 2xx y clase inexistente; sin `estadoPago` ni `accesoRestringido` en respuestas a estudiantes).
- **PR-2A23** → mismo archivo, 2 casos (el admin en las 7 rutas abiertas y clase inexistente; el admin en las 13 rutas que siguen cerradas: `personas`, `inscritas`, `impartidas`, `unirse`, las 7 del muro y las 2 de archivos). Las filas de la matriz de las rutas existentes para estudiantes, maestro ajeno y restringido siguen en `clases-autorizacion.integracion.test.ts` (PR-A15a a PR-A15h) y `alumnos-autorizacion.integracion.test.ts` (PR-B08a a PR-B08i), que adapté solo en el caso del admin (C-3).
- **PR-2A24** → mismo archivo: «PR-2A24: las rutas de gestión existen, POST /api/clases y PUT /api/clases/:claseId ya no, RUTAS_PUBLICAS sigue con las 10 de hoy y la API arrancó sin tocar la guarda». La lista cerrada de V-06 la protege `sesiones-y-cadena.ataque.test.ts` (reescrita por el tester, en verde).

Casos de pruebas normales reescritos por un C-n (cada uno con comentario `CLASES-02a (C-n)` o un título que lo cita):
- `backend/test/clases.integracion.test.ts` (C-1, C-2, A-5): los describes `POST /api/admin/clases (antes POST /api/clases)`, `crearClaseAdministrada: reintento de código (PR-A09; C-1, A-5)` y `PUT /api/admin/clases/:claseId (antes PUT /api/clases/:claseId)`, y `PR-C12f (C-1, C-2: rutas del administrador): …`. Conservan lo que protegían.
- `backend/test/clases-autorizacion.integracion.test.ts` (C-1, C-2, C-3): salen `POST /clases` y `PUT /clases/:claseId` de la lista (6 rutas); PR-A15d y PR-A15h distinguen las rutas que admiten al admin.
- `backend/test/alumnos-autorizacion.integracion.test.ts` (C-3): PR-B08d y PR-B08h; `personas` sigue en 403 para el admin.
- `backend/test/movimientos-inscripcion.integracion.test.ts` (C-6): `maestroId` → `actorId` en 5 líneas.
- `backend/test/ayudas-clases.ts`: `crearClaseDePrueba` con `create` anidado, `maestroIds` y `creadoEn` opcionales; `idDelAdminDePrueba` y `tokenDelAdminDePrueba`.

### Archivos tocados contra las autorizaciones y "Cambios por capa"
- A-1: `middleware/index.ts`, `pertenencia.ts`, `require-membership.ts`, `require-ownership.ts`, `README.md` (todos). La guarda, `rutas-publicas.ts`, `authenticate.ts`, `with-profile.ts`, `with-password-gate.ts`, `with-access.ts`, `require-role.ts` y `tipos.ts` no cambian (`git diff --quiet e4396a0` con código 0 en cada uno, V-05).
- A-2: migración y esquema. A-4: las pruebas normales de arriba (todas en la lista de PA-16; ninguna fuera). A-5: `crearClase` y las dos rutas retiradas. A-9: `app.ts`. A-10: `editarClase`, `leerCodigo` y `regenerarCodigo` sin filtro por `maestro_id`. A-11: `shared/src/index.ts`. A-7 y A-8 no aplican a este código.
- `git diff --name-only e4396a0 -- backend/prisma/migrations` lista solo la carpeta nueva; `backend/package.json`, `frontend/package.json`, `package.json` y `package-lock.json` sin cambios.
- Ningún archivo fuera de "Cambios por capa" salvo lo que declaro en "Desviaciones".

### V-04 (búsquedas en producción, sin pruebas; son texto, no un analizador)
- `$queryRawUnsafe` en `backend/src/` (sin pruebas): 2 líneas, las dos en `adapters/db/cliente.ts` (una es el comentario "Único $queryRawUnsafe…" y la otra la llamada): 1 llamada. `$queryRaw` y `$executeRaw` nuevos: 0 (los que salen ya existían: `bloqueo-usuario.ts`, `enlaces-registro.ts`, `invitaciones.ts`, `publicaciones.ts`, `salud.ts`).
- `addHook` en `backend/src/handlers/`: 0. `console.` en los tres archivos nuevos de producción: 0.
- `maestroId` sobre `Clase`: solo la escritura del `clase.create` (`maestroId: primero`) y el `updateMany` del retiro (`where: { id, maestroId: id }`, `data: { maestroId: restante }`), los dos en `adapters/db/`. La relación `Clase.maestro` no se selecciona en ningún sitio. El texto `maestro:` que aparece en `select` de `adapters/db/clases.ts` es la relación de `MaestroDeClase.maestro` (otro modelo): el límite del grep por texto.
- `movimientoInscripcion` solo en `adapters/db/inscripciones.ts`, 2 veces, ambas `.create(`, con `actorId`.
- `estadoPago` en `backend/src/`: mismos archivos de hoy (en inscripciones solo el roster).

### Hermanos
- **Rutas que abren `admin` en sus `roles` (7):** `GET /clases/:claseId`, `GET` y `POST /clases/:claseId/codigo`, `GET /clases/:claseId/alumnos`, `GET /clases/:claseId/alumnos/candidatos`, `POST /clases/:claseId/alumnos`, `DELETE /clases/:claseId/alumnos/:alumnoId`: remedio aplicado a las 7 y probado en PR-2A20, PR-2A23, PR-A15d y PR-B08d. Hermanas que **no** se abren (el remedio no aplica): `GET /clases/:claseId/personas`, `GET /clases/inscritas`, `GET /clases/impartidas`, `POST /clases/unirse`, las 7 del muro (`GET` y `POST …/publicaciones`, `DELETE …/publicaciones/:id`, `GET` y `POST …/comentarios`, `DELETE …/comentarios/:id`, `DELETE …/mis-comentarios/:id`) y las 2 de archivos (02b): verificado con PR-2A23 que siguen en `403 ROL_NO_PERMITIDO`.
- **Usos de `maestroId` que pasan a `maestros` o a `actorId`:** `agregarAlumnoManual` y `quitarAlumno` (adaptador) → `actorId`; los handlers `POST` y `DELETE …/alumnos` → `actorId: perfil.id`; `MovimientoInscripcion` (esquema); `listarClasesImpartidas` (a `maestroDeClase`); `buscarDatosDePertenencia`; `listarPersonas` (a `maestros`, ver "Desviaciones"). Aplicado a todos.
- **Lugares que leían `clases.maestro_id` o `Clase.maestro`:** `buscarDatosDePertenencia`, `editarClase`, `leerCodigo`, `regenerarCodigo`, `leerClase` (el `select` del detalle), `listarClasesInscritas`, `listarClasesImpartidas`, `listarPersonas`. Los 8 migrados; `crearClase` retirada.
- **Las tres operaciones con filtro por `maestro_id` (defensa extra de CLASES-a, A-10):** `editarClase`, `leerCodigo` y `regenerarCodigo`: las tres lo pierden. `README` del adaptador actualizado.
- **Normalización de ids a minúsculas (UUID repetido en mayúsculas):** `maestroIdsSchema` (con `transform`), `crearClaseAdministrada`, `asignarMaestro` y `retirarMaestro` lo hacen; `asignarMaestroSchema` y `maestroIdParamSchema` no (el adaptador lo corrige). Cubierto por PR-2A10 y PR-2A13.
- **Los dos pasos del sexto paso que reciben `admiteAdmin`:** `requireMembership` y `requireOwnership`, ambos sin valor por defecto, y las dos variantes de `pasoDePertenencia`.
- No se encontró ningún otro hermano.

### PARADAS evaluadas
PA-01 no (regla de firewall habilitada y Public; red `IZZI-F281-5G` Public; Docker 28.5.1). PA-02 no (rama correcta; base existe; SHA-256 del plan al empezar igual al aprobado en la primera parte; V-01 igual). PA-03 y PA-04 no. PA-05 no (cero rojos). **PA-06 sí, al principio** (`shared/src/index.ts`), resuelta por la Enmienda 2 y A-11. PA-07 y PA-12 no (arriba). PA-08 no (una suite a la vez). PA-09: no hubo pruebas con resultados distintos entre una corrida aislada y la completa (cada archivo nuevo corrió aislado y dentro de la completa con el mismo resultado). PA-10: no verifiqué logs de correos de candidatos (no hay ninguna prueba mía que los recorra; queda para el tester). PA-11 no. PA-13 no (la guarda no cambió). PA-14 no (ninguna lectura de `Clase.maestroId`). PA-16 no (solo archivos de la lista). PA-17 no (ninguna prueba existente llamaba a los pasos directamente).

### Desviaciones del plan (todas pequeñas; las decide el manager)
1. **`listarPersonas` pasó a leer los maestros de `maestros_de_clase` en 02a** (el plan lo lista en 02b). Sin eso, el adaptador seguiría leyendo `Clase.maestro` (PA-14). La respuesta sigue igual (`maestro` = el primero, `personasRespuestaSchema` no cambió); en 02b se agregan `maestros` y los correos.
2. **`crearClaseAdministrada` fija un solo `creadoEn` explícito** (`new Date()` de la aplicación) para la clase y sus asignaciones, y `clases.maestro_id` = el id más pequeño en texto (que coincide con el orden S-05 de dos asignaciones con la misma `creado_en`). El plan no lo exige, pero así el orden no depende de que Prisma use un solo reloj por solicitud. `crearClaseDePrueba` (ayuda) no lo hace, y PR-2A09 comprueba que el reloj sea el mismo: pasó.
3. **`asignarMaestro` y `retirarMaestro` tocan `actualizado_en` de la clase siempre** (es el candado de §D-2A4, paso 1), también en las respuestas idempotentes. No escriben asignaciones en ese caso.
4. **`middleware/README.md`:** lo apliqué yo (paso 7 del plan lo pone en mi lista; A-8 lo menciona para el orquestador). `prettier --write` re-alineó las columnas de la tabla, por eso el diff de ese archivo es de 20 líneas.
5. **`handlers/clases/clases.ts` exporta `generarCodigo` y `conMaestroPrincipal`** (el plan dice "se exporta desde ahí o se mueve"; elegí exportarlos). `gestion.ts` los importa.
6. **PR-2A06 vive en `src/middleware/index.test.ts` y esa prueba importa las ayudas de `../../test/`**: el plan lo lista como prueba unitaria de `core/` pero necesita base y app, y `index.test.ts` es el único archivo de pruebas de middleware que PA-16 permite cambiar. No hay precedente de un `src/**/*.test.ts` que importe de `test/`; `lint` y `typecheck` lo aceptan.
7. **`GET /api/admin/clases` no pidió un `HEAD` explícito**; Fastify lo deriva (PR-2A24 lo comprueba en `printRoutes`).
8. Un candidato que ya está asignado pero se volvió inactivo recibe `404` al "asignar de nuevo" (la validación de rol y `activo` va antes de `decidirAsignacion`, como dice §D-2A4, paso 2).

### Pendiente o fuera de alcance detectado
- Textos para los documentos que aplica el orquestador al cerrar 02a: ESSENTIALS, `ARCHITECTURE.md` (§6, §7, §14), `CLAUDE.md` y fila de ESTADO (las de "Al cerrar 02a" de "Textos propuestos"). Los de `backend/src/adapters/README.md` (M-06) y `backend/src/middleware/README.md` ya están aplicados por mí (los textos del plan, con una oración más: la sección `db/inscripciones.ts` nombra también `actorId`).
- En el archivo `backend/src/handlers/README.md` corregí la sangría pendiente de la línea de `permitirRestringido: true })` (cambió una línea).
- El texto de `handlers/README.md` para `clases/alumnos.ts` aún dice "roster del dueño"; el admin también lo ve desde 02a. No lo cambié (no está en los textos del plan).
- O-02 del tester (tiempos de `guarda-clase-r1` y `guarda-clase-r2`): en mi corrida no hubo ningún tiempo límite ni `timed out`.
- 02b debe agregar a `shared/src/index.ts` sus símbolos nuevos (A-11 ya lo cubre).

## CLASES-02a — Corrección de la ronda 1

Hallazgos atendidos: **T-01 (baja): corregido.** **M-08: corregido.** O-03 y O-04 no son del programador (arbitraje del manager).

### T-01
- `backend/src/handlers/validacion.ts`: la guarda de `validarCuerpo` pasó a `typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)`, con el mismo mensaje `cuerpo: debe ser un objeto JSON`. Nada más del archivo cambió (A-12).
- Prueba nueva (archivo nuevo, autorizado por la instrucción del coordinador; no estaba en la lista de PA-16 de 02a): `backend/src/handlers/validacion.test.ts`, casos «T-01: un arreglo ([], ['x'] o [{}]) responde 400 VALIDACION con «cuerpo: debe ser un objeto JSON»» y «T-01: null y un valor que no es objeto siguen rechazándose igual, y un objeto válido pasa».
- El caso de T-01 de `backend/test/gestion-02a-r1.ataque.test.ts` pasa en verde sin tocarlo.
- Ninguna prueba existente fijaba el mensaje en inglés: `grep "Invalid input: expected object"` en `backend/src` y `backend/test` no da resultados; el único que fija el texto en español es `auth-login.integracion.test.ts:166` («cuerpo: debe ser un objeto JSON», para un cuerpo que no es objeto) y sigue en verde.

### Hermanos: las 21 llamadas a `validarCuerpo` en `handlers/` (la corrección vive en la función; ninguna necesita cambio local, ninguna lo recibió)
1. `admin.ts:83` (`invitarMaestroSchema`) · 2. `admin.ts:106` (`buscarUsuarioSchema`) · 3. `admin.ts:139` (`corregirCorreoSchema`) · 4. `admin.ts:151` (`crearEnlaceRegistroSchema`) · 5. `admin.ts:223` (`invitacionMasivaSchema`) · 6. `archivos.ts:40` (`solicitarSubidaSchema`) · 7. `auth/cuentas.ts:61` (`recuperarSchema`) · 8. `auth/cuentas.ts:99` (`nuevaContrasenaConTokenSchema`) · 9. `auth/cuentas.ts:120` (`datosDeInvitacionSchema`) · 10. `auth/cuentas.ts:134` (`establecerContrasenaSchema`) · 11. `auth/cuentas.ts:161` (`cambiarContrasenaSchema`) · 12. `auth/index.ts:84` (`registroSchema`) · 13. `auth/index.ts:106` (`loginSchema`) · 14. `auth/registro-maestro.ts:33` (`registroMaestroSchema`) · 15. `clases/alumnos.ts:97` (`agregarAlumnoSchema`) · 16. `clases/clases.ts:77` (`unirseSchema`) · 17. `clases/gestion.ts:55` (`crearClaseAdminSchema`) · 18. `clases/gestion.ts:72` (`editarClaseSchema`) · 19. `clases/gestion.ts:91` (`asignarMaestroSchema`) · 20. `clases/muro.ts:149` (`crearPublicacionSchema`) · 21. `clases/muro.ts:228` (`crearComentarioSchema`).
Las 21 pasan por la misma función y por tanto rechazan un arreglo con `400 VALIDACION`; la suite completa (incluidas las `*.ataque` de AUTH, ADMIN, CLASES y archivos) sigue en verde. `validarParametros` (parámetros de la URL y consulta) no recibe cuerpos y no cambia. No hay otros hermanos.

### M-08 (PR-2A12)
- `backend/test/gestion-clases.integracion.test.ts`, caso «PR-2A12: ordena por creado_en DESC, id DESC, pagina sin repetidos ni huecos, trae maestros (1 o 2) y alumnos activos, y total»: toma `clase.count()` antes y después de la petición y exige `total` entre el mínimo y el máximo de los dos conteos (además conserva el piso de 5 de mis propias clases). El comentario del caso explica el motivo.

### Verificación (una sola corrida a la vez)
- `cd backend; npm run lint` → código 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores; antes, ESLint y Prettier limpios).
- `cd backend; npm run build` → código 0; última línea `> tsc -p tsconfig.json`.
- `cd backend; npm test` (una corrida completa) → `Test Files  141 passed (141)` / `Tests  1700 passed (1700)` / `Duration  97.12s`. Los 4 `*.ataque` nuevos del tester están dentro y en verde.
- PA-07 (en `p02a-r1-test.txt`): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `timed out` 0, `"Error no controlado"` 10 (igual a I-1), `"code":"P2028"` 5: `tx.sesion.findFirst()`, `tx.sesion.updateMany()` y `prisma.$queryRawUnsafe()` (los tres de `servicio-ocupado`), `tx.sesion.create()` y `tx.tokenCuenta.updateMany()` (los dos de `cuentas-r3`): exactamente los permitidos, con control positivo.
- Conteos: `cd backend; npx vitest list` → 1700 casos; `npx vitest list --filesOnly` → 141 archivos. Antes de la corrección (mi resumen anterior): 1673 y 136. Diferencia: +27 casos y +5 archivos = los 4 `*.ataque` nuevos del tester y `validacion.test.ts` (2 casos míos; 25 del tester). `grep -c "T-01"` sobre la lista: 10 líneas (2 mías y 8 del tester).
- V-01: `git ls-files '*.ataque.test.*'` más los 4 sin rastrear, con `sha256sum`, contra la tabla de la ronda 0 más las 4 filas de la ronda 1 (119 filas): 119 de 119 iguales. No toqué ninguna `*.ataque`.
- Frontend: no se corrió (no cambia, como pidió el coordinador).

### Archivos tocados
- `backend/src/handlers/validacion.ts` (A-12, una condición).
- `backend/src/handlers/validacion.test.ts` (nuevo).
- `backend/test/gestion-clases.integracion.test.ts` (M-08, PR-2A12; está en la lista de PA-16).
- Ninguno fuera de A-12, de "Cambios por capa" ni de la lista de pruebas; `docs/` solo este resumen.

### PARADAS
Ninguna se activó: PA-01 sin cambios (misma red y regla), PA-05 y PA-07 limpias, PA-12 no (sin tiempos límite), PA-13 y PA-14 no, PA-16: el único archivo de pruebas fuera de la lista es `validacion.test.ts`, que el coordinador pidió expresamente con A-12 (lo declaro como desviación para el manager).

## CLASES-02b — Implementación

Plan: `docs/trabajo/CLASES-02-clases-administradas/plan.md` (con las Enmiendas 1 y 2). Rama `feat/clases-02`; base de "No se toca" dentro de los paquetes `<K2a>` = `07c992f`, fuera `<R>` = `e4396a0`. Fecha: 2026-10-05. Red `uacam5 2` aceptada por el humano para hoy (PA-01: regla "Campus: bloquear entrada a Docker en redes publicas" habilitada, Inbound, Block, Public; Docker 28.5.1).
Pasos completados: 13 a 18 de 02b (el 12 fue la ronda 0 del tester y el 19 es del orquestador).

### Archivos creados
- `backend/src/core/autoria.ts`, `backend/src/core/autoria.test.ts`
- `backend/test/muro-admin.integracion.test.ts`

### Archivos modificados
- `shared/src/clases.ts` y `shared/src/index.ts` (A-11: solo reexportaciones nuevas): `FIRMA_ADMINISTRACION`, `autorDelMuroSchema` con `administracion`, `puedeBorrar` en `publicacionSchema` y `comentarioSchema`, `personaConCorreoSchema` (y su tipo `PersonaConCorreo`), `personasRespuestaSchema` con `maestros` y correo, `CODIGOS_CLASES.BORRADO_NO_PERMITIDO`.
- `backend/src/core/clases/texto.ts` (M-09: un arreglo se devuelve intacto) y `texto.test.ts`.
- `backend/src/adapters/db/publicaciones.ts` (rol del autor; `puedeBorrar` por elemento; `borrarPublicacion` y `borrarComentario` con `actor` y la autoría dentro de la transacción), `inscripciones.ts` (`listarPersonas` con `maestros` y correos), `index.ts`.
- `backend/src/handlers/clases/muro.ts` (roles, firma, `actor`; usa `conTextosNormalizados` de `core/` y se borra la copia local), `backend/src/handlers/archivos.ts` (roles).
- `backend/src/adapters/README.md` y `backend/src/handlers/README.md` (textos de 02b).
- Pruebas normales (A-4, PA-16, I-2): `backend/test/muro.integracion.test.ts`, `muro-autorizacion.integracion.test.ts`, `archivos-autorizacion.integracion.test.ts`, `alumnos.integracion.test.ts`, `gestion-clases-autorizacion.integracion.test.ts` (I-2), `backend/src/core/clases/texto.test.ts` (I-2).
- Dobles del frontend (solo agregar campos; ninguna aserción cambió): `frontend/src/app/router.test.tsx`, `features/clases/adjuntos-de-publicacion.test.tsx`, `formulario-publicacion.test.tsx`, `lib.test.ts`, `muro-view.test.tsx`, `personas-view.test.tsx`, `publicacion-del-muro.test.tsx`. Cada uno lleva un comentario de C-10 o C-11. Se agregó `administracion: false`, `puedeBorrar: true` (como los dobles del tester), `email` y `maestros`.
- No toqué ninguna `*.ataque`, ningún archivo de "No se toca" (`git diff --quiet 07c992f` con código 0 en `backend/src/middleware`, `adapters/db/clases.ts`, `maestros-de-clase.ts`, `handlers/validacion.ts`, `backend/prisma`, los `package*.json`, `vitest.config.ts`, `test/setup.ts` y `test/global-setup.ts`) ni `docs/` fuera de esta carpeta. `handlers/clases/alumnos.ts` no cambió: `personasRespuestaSchema.parse(personas)` ya entrega la forma nueva con el adaptador y el esquema.

### Verificación (comando exacto y última línea; una suite a la vez, backend primero)
- `cd backend; npm run lint` → código 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores; antes ESLint y Prettier limpios).
- `cd backend; npm run build` → código 0; última línea `> tsc -p tsconfig.json`.
- `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/p02b-test.json` (una sola corrida completa) → `Test Files  144 passed (144)` / `Tests  1720 passed (1720)` / `Duration  123.09s`.
- **Los 5 rojos de la ronda 0 pasan a verde:** `muro-c-r1:1371`, `archivos-d-r1:1025`, `gestion-02a-r1:345` y `:680`, `alumnos-b-r1:459`. La corrida completa no tiene ningún caso fallido. (Después de implementar el backend y antes de adaptar mis pruebas normales, la primera corrida dio `Tests  10 failed | 1700 passed (1710)`, todos en pruebas normales que contradecían C-8 a C-11, y ninguno en una `*.ataque`.)
- PA-07 (corrida completa, `p02b-test.txt`): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `timed out` 0, `"Error no controlado"` 10 (la cifra de I-1), `"code":"P2028"` 5: `prisma.$queryRawUnsafe()`, `tx.sesion.findFirst()` y `tx.sesion.updateMany()` (los tres de `servicio-ocupado`), `tx.sesion.create()` y `tx.tokenCuenta.updateMany()` (los dos de `cuentas-r3`): exactamente los permitidos, con control positivo. Ningún `P2028` de una ruta de CLASES-02. No verifiqué uno por uno el origen de los 10 `"Error no controlado"`, solo la cifra.
- shared: `cd shared; npm run build` → `> tsc -p tsconfig.json` (sin errores); `npm run lint` → "All matched files use Prettier code style!".
- raíz: `npm run build` → `✓ built in 2.29s` (código 0); `npm run lint` → `> tsc -b` del frontend (código 0).
- frontend: `cd frontend; npm run lint` → `> tsc -b` (código 0; el error esperado TS2353 de `archivos-d-r2.ataque.test.tsx:491` desapareció con `shared/`); `cd frontend; npm test` → `Test Files  104 passed (104)` / `Tests  1396 passed (1396)` / `Duration  78.37s`.
  - Primera corrida del frontend, antes de completar los dobles: `Test Files  5 failed | 99 passed (104)` / `Tests  31 failed | 1365 passed (1396)`, y `tsc -b` con errores en 3 archivos más; todo por campos faltantes en dobles.

### Conteos
- `cd backend; npx vitest list` → 1720 casos; `npx vitest list --filesOnly` → 144 archivos. Partida (02b ronda 0): 1703 y 142. Diferencia: +17 casos y +2 archivos (`autoria.test.ts` y `muro-admin.integracion.test.ts`). Los casos con `PR-2B` en el título, por `grep -o "PR-2B[0-9]*"` sobre esa lista: PR-2B01 3, PR-2B02 3, PR-2B03 2, PR-2B04 1, PR-2B05 1, PR-2B06 2, PR-2B07 1, PR-2B08 1, PR-2B09 1, PR-2B10 1 (16) y 1 caso más de `texto.test.ts` (M-09).
- Frontend: 104 archivos y 1396 casos (de la corrida).

### Pruebas requeridas (archivo y título)
- **PR-2B01** → `backend/src/core/autoria.test.ts`: «PR-2B01: tabla completa actor × autor con los tres roles y personas distintas», «PR-2B01: cada quien borra lo suyo, con cualquiera de los tres roles», «PR-2B01: ids iguales con roles distintos (dato imposible): true, manda la identidad».
- **PR-2B02** → mismo archivo: «PR-2B02: el admin sale como «Administración» con administracion: true y su id real», «PR-2B02: el maestro y el estudiante salen con su nombre y administracion: false, aunque se llamen «Administración»», «PR-2B02: la salida no tiene la clave rol».
- **PR-2B03** → `backend/test/muro-admin.integracion.test.ts`: «PR-2B03: el admin publica un anuncio y un material, con y sin adjuntos suyos: 201, autor firmado «Administración», puedeBorrar true y un aviso con solo ids» (incluye la vista del estudiante y la del maestro con `puedeBorrar: false`) y «PR-2B03: una publicación del admin revertida no deja ni la publicación ni el trabajo».
- **PR-2B04** → mismo archivo: «PR-2B04: el maestro borra la suya; la del otro maestro y la del admin responden 403 BORRADO_NO_PERMITIDO sin tocar nada; el admin borra la de cualquier maestro y sus archivos quedan descartados; inexistente o de otra clase, 404».
- **PR-2B05** → mismo archivo: «PR-2B05: el estudiante borra el suyo y no el de otro; el maestro borra el suyo y el de un estudiante, no el del otro maestro ni el del admin; el admin borra cualquiera; otra publicación u otra clase, 404; mis-comentarios sigue igual».
- **PR-2B06** → mismo archivo: «PR-2B06: puedeBorrar de las publicaciones coincide, elemento por elemento, con lo que responde el DELETE, para el estudiante, el maestro y el admin con autores de los tres roles» y «PR-2B06: puedeBorrar de los comentarios coincide, elemento por elemento, con lo que responde el DELETE, para las tres perspectivas con autores de los tres roles». En las publicaciones, la perspectiva del estudiante no incluye una publicación de un estudiante (un estudiante no publica por la API: dato imposible), y su `DELETE` responde `403 ROL_NO_PERMITIDO`.
- **PR-2B07** → mismo archivo: «PR-2B07: el admin y el maestro dueño borran la misma publicación a la vez: una 204 y una 404, ninguna 500, y los archivos quedan descartados una sola vez» (tres rondas).
- **PR-2B08** → mismo archivo: «PR-2B08: un alumno ve a los maestros (1 y 2) y a los compañeros con su correo completo, sin estadoPago ni accesoRestringido en ninguna parte, también con compañeros deudores y restringidos».
- **PR-2B09** → mismo archivo: «PR-2B09: el admin solicita la subida y la descarga (200), publica con sus archivos, y un maestro no puede confirmar el archivo que subió el admin (400 ARCHIVO_INVALIDO)».
- **PR-2B10** → mismo archivo: «PR-2B10: el admin no comenta (403 ROL_NO_PERMITIDO), el maestro ajeno recibe 403 SIN_ACCESO_A_LA_CLASE al borrar y ninguna respuesta del muro lleva el rol del autor, el correo ni el nombre real del admin». Las filas de la matriz de las rutas del muro y de archivos con el admin agregado (sin token, rol incorrecto, ajeno, restringido, cambio pendiente, permitido, snapshot) siguen en `muro-autorizacion.integracion.test.ts` (PR-C08a a PR-C08h) y `archivos-autorizacion.integracion.test.ts` (PR-D09a a PR-D09h), adaptadas solo en el caso del admin (C-9) y en el «rol incorrecto» del `DELETE` de comentarios (C-8).
- **M-09** → `backend/src/core/clases/texto.test.ts`: «PR-2A05: un arreglo se devuelve intacto (M-09), sin volverlo objeto, para que validarCuerpo lo rechace».
- Ninguna viñeta de 02b queda sin caso. Límite: PR-2B03 y PR-2B10 comprueban que el admin no filtra su nombre ni su correo con búsqueda de texto y de claves en el cuerpo; los logs de esas rutas no se revisaron (PA-10 queda para el tester).

### Pruebas normales adaptadas (cada una cita su C-n)
- `muro-autorizacion.integracion.test.ts` (C-8, C-9): `admiteAdmin` por ruta; PR-C08d, PR-C08e (de 3 a 2 rutas con «rol incorrecto»: el `DELETE` de comentarios ya admite al estudiante) y PR-C08h; en el `DELETE` de comentarios los «ajenos» suman al estudiante no inscrito.
- `archivos-autorizacion.integracion.test.ts` (C-9): PR-D09d (el admin recibe lo mismo que el maestro) y PR-D09h (el admin sale de las negaciones).
- `gestion-clases-autorizacion.integracion.test.ts` (C-9, I-2): PR-2A23 deja cerradas solo `personas`, `inscritas`, `impartidas`, `unirse`, comentar y `mis-comentarios`.
- `muro.integracion.test.ts` (C-10): PR-C02a y PR-C03e con `administracion: false`.
- `alumnos.integracion.test.ts` (C-11): PR-B02a (maestro con correo y `maestros`) y PR-B02e (el correo ya sale; el estado de pago y la restricción, no).

### V-01
`git ls-files '*.ataque.test.*'` (más los sin rastrear) con `sha256sum` contra la tabla de la ronda 0 de 02b de `reporte-tester.md` (120 filas, la última aparición del encabezado): 120 de 120 iguales. No hay `*.ataque` sin rastrear ni mías.

### V-04 (búsquedas en producción, sin pruebas; texto, no analizador)
- `puedeBorrar` se define solo en `backend/src/core/autoria.ts`. En el frontend aparece una variable local `puedeBorrar` en `features/clases/components/comentarios-de-publicacion.tsx:40` (`esMaestro || comentario.propio`, de CLASES-01): es lo que 02c cambia a leer el dato del servidor; 02b no toca producción del frontend.
- `FIRMA_ADMINISTRACION` se define solo en `shared/src/clases.ts`. `conTextosNormalizados` se define solo en `backend/src/core/clases/texto.ts` (la copia de `muro.ts` se borró).
- `$queryRaw` o `$executeRaw` nuevos en `backend/src/` (diff contra `07c992f`): 0. `console.` nuevos: 0. `estadoPago` en `backend/src/`: los mismos archivos de antes (ninguno nuevo). `Clase.maestroId` y `Clase.maestro`: no se leen (los `maestro:` de `select` de `adapters/db/` son la relación de `MaestroDeClase`).

### Hermanos
- **Rutas que abren `admin` al muro y a los archivos (7, todas con `admin` en `roles`):** `GET` y `POST …/publicaciones`, `DELETE …/publicaciones/:publicacionId`, `GET …/comentarios`, `DELETE …/comentarios/:comentarioId` (que además pasa a `inscripcion` con `estudiante`), `POST …/archivos` y `POST …/archivos/:archivoId/descarga`: remedio aplicado a las 7. Hermanas que no se abren (el remedio no aplica, P-03 a): `POST …/comentarios` y `DELETE …/mis-comentarios/:comentarioId`, más `personas`, `inscritas`, `impartidas` y `unirse` (PR-2A23, PR-C08d y PR-2B10 lo verifican).
- **Lugares que arman `autor`:** el adaptador (`listarPublicaciones`, `crearPublicacion`, `listarComentarios`, `crearComentario`, todos con `rol` en `SELECT_AUTOR`) y los 4 sitios del handler `muro.ts` (lista de publicaciones, crear publicación, lista de comentarios, crear comentario) que arman el autor con `firmaDelAutor` (vía `autorParaResponder`): los 4 aplicados. Nada más arma un `autor` (`personas` usa `{ id, nombre, email }` y no lleva firma).
- **Lugares que deciden si se puede borrar:** `borrarPublicacion` y `borrarComentario` (dentro de su transacción), y los cuatro que devuelven `puedeBorrar` por elemento (las dos listas y las dos altas, donde el autor es el actor): todos con `core/autoria.ts`. `borrarMiComentario` no cambia (el `autor_id` va en la condición del `deleteMany`). Ninguna ruta verifica autoría a mano en el handler.
- **Respuestas con `maestros`:** `GET …/personas` (02b, con correo); el detalle, `inscritas` y la lista del admin ya los llevaban desde 02a. En "Personas" `maestro` sigue siendo el primero de `maestros`.
- **Rutas que normalizan texto con `conTextosNormalizados` (M-09):** `POST …/publicaciones` y `POST …/comentarios` (muro, 2) y las tres de `gestion.ts` (`POST`, `PUT` y la descripción): la guarda de arreglos vive en la función y las cubre sin cambios locales.
- No se encontró ningún otro hermano.

### PARADAS evaluadas
PA-01 no (regla de firewall habilitada y Public; red `uacam5 2` aceptada por el humano para hoy; Docker 28.5.1). PA-02 no (rama correcta, base existe, ningún archivo protegido fuera de lista tocado). PA-05 no (los 5 rojos de la ronda 0 en verde y ninguno nuevo). PA-06 no (ningún archivo de "No se toca", sin dependencias, sin tocar `vitest.config.ts`, `global-setup.ts` ni `setup.ts`, ningún `timeout` cambiado). PA-07 y PA-12 no (arriba). PA-08 no. PA-09 no (los casos nuevos pasaron aislados y en la corrida completa). PA-13 no. PA-14 no (ninguna lectura de `Clase.maestroId`). PA-16 no (solo archivos de la lista de 02b, I-2 y los dobles del frontend). PA-17 no.

### Desviaciones del plan (pequeñas; las decide el manager)
1. **`puedeBorrar` por elemento lo calcula el adaptador con el `actor`** (`listarPublicaciones` y `listarComentarios` reciben `actor`, y las altas lo calculan con el autor = actor), no el handler: es lo que dice "Cambios por capa" ("la autoría se decide en `core/autoria.ts` y se aplica en el adaptador") y deja al handler sin lógica. El handler solo arma la firma con `firmaDelAutor`.
2. `handlers/clases/alumnos.ts` no cambió (el plan lo lista en "Cambios por capa"): con el adaptador y el esquema nuevos, `personasRespuestaSchema.parse(personas)` ya devuelve la forma nueva.
3. **`listarPersonas`**: si la clase no tiene ningún maestro devuelve `null` (como si no existiera), en lugar de un `500`. Es el mismo camino que ya tenía por clase inexistente; ninguna clase válida lo recorre.
4. En el muro, el `DELETE` de comentarios admite ahora a `estudiante` con `inscripcion`: el plan lo pide (tabla de §D-2B3) y por eso PR-C08e baja de 3 a 2 rutas con «rol incorrecto».

### Textos que apliqué en los README del backend (M-06; el orquestador aplica los de ESSENTIALS, `ARCHITECTURE.md`, `CLAUDE.md` y `PRD.md`)
- `backend/src/adapters/README.md`, sección `db/inscripciones.ts`: «`listarAlumnosDeClase` es la **única** función que selecciona el estado de pago y la restricción de acceso de un alumno (RN-02), y la única que selecciona el correo completo **junto con** esos datos. `listarPersonas` selecciona id, nombre y correo de los maestros y de los alumnos de la clase (CLASES-02, RF-19), nunca el estado de pago ni la restricción. Fuera de este archivo, también seleccionan correos `buscarMaestrosCandidatos` (`db/maestros-de-clase.ts`, solo maestros, para el admin) y las funciones de cuentas de AUTH. El orden de los maestros sale de `ORDEN_DE_MAESTROS` (`db/clases.ts`).»
- Misma sección de `db/publicaciones.ts`: «El autor se selecciona con su `rol` solo para dos cosas: `firmaDelAutor` (la firma "Administración") y `puedeBorrar` (`core/autoria.ts`), que se aplica dentro de la transacción de `borrarPublicacion` y `borrarComentario` (leer la autoría y borrar en la misma transacción, sin candado: la autoría no cambia) y por elemento en `listarPublicaciones` y `listarComentarios`, con el `actor` de la petición. El rol no sale en ninguna respuesta.»
- `backend/src/handlers/README.md`: se actualizan los puntos de `clases/alumnos.ts` (roster del maestro de la clase y del admin; "Personas" con maestros y correo, no abierta al admin; se quita «roster del dueño»), `clases/muro.ts` (roles, firma, `puedeBorrar`, `403 BORRADO_NO_PERMITIDO`, `conTextosNormalizados`) y `archivos.ts` (el admin solicita y descarga).

### Pendiente o fuera de alcance detectado
- Los textos de ESSENTIALS (viñeta "Autoría"), `PRD.md` (RN-07), `ARCHITECTURE.md` (§14, fila `publicaciones` y la viñeta de la búsqueda) y la fila de ESTADO de "Al cerrar 02b" los aplica el orquestador.
- 02c debe cambiar la variable local `puedeBorrar` de `comentarios-de-publicacion.tsx` para que el botón salga del dato del servidor (C-13); 02b no toca producción del frontend.
- O-04 del tester (el log de cada petición y la consulta de la URL) sigue con destino DEPLOY.

### Trivial O-06
- `shared/src/clases.ts:291`, antes: `// Roster del dueño (S-10): el único lugar donde salen el correo completo y los datos de pago.`; después: `// Roster de los maestros de la clase y del admin (S-10): el único lugar donde salen el correo completo y los datos de pago.` Solo cambió ese comentario.
- Lint (código 0 en los tres, sin correr suites): `cd shared; npm run lint` → "All matched files use Prettier code style!"; `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`; `cd frontend; npm run lint` → `> tsc -b`.
