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
