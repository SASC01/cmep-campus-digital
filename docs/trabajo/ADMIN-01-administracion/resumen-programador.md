# Resumen del programador — ADMIN-01a

Plan: `docs/trabajo/ADMIN-01-administracion/plan.md`, SHA-256 `a5bb19668efebae23968c87dd857ea89561bc69ac950ba7ee81e54881f67a464` (Enmiendas 1 a 4; comprobado al reanudar).
Pasos completados: 7 de 7 (01a), con la PARADA del paso 7 resuelta por la Enmienda 4 (E4-1, E4-2).

## Archivos creados / modificados

- `shared/src/clases.ts`, `shared/src/index.ts`: `archivadaEn` opcional en `claseDetalleSchema` y `claseAdminSchema`; `estadoDeClasesSchema`, `listaClasesAdminConsultaSchema`, `claseAnteriorSchema`, `listaClasesAnterioresRespuestaSchema` y sus tipos.
- `backend/prisma/schema.prisma` (campo `archivadaEn` y comentario de `Clase`, A-09) y `backend/prisma/migrations/20261104234335_admin_01_clases_archivadas/migration.sql` (nuevo).
- `backend/src/core/clases/archivada.ts` (nuevo) y `archivada.test.ts` (nuevo).
- `backend/src/adapters/db/clases.ts`, `clases-archivadas.ts` (nuevo), `index.ts`; `backend/src/adapters/README.md`.
- `backend/src/middleware/index.ts`, `pertenencia.ts`, `require-membership.ts`, `require-ownership.ts`, `README.md`.
- `backend/src/handlers/clases/{clases,gestion,alumnos,muro,recursos,dudas}.ts`, `backend/src/handlers/tareas/{temas,categorias,tareas,entregas,hilo-privado}.ts`, `backend/src/handlers/calificaciones.ts`, `backend/src/handlers/archivos.ts`, `backend/src/handlers/README.md`.
- Pruebas nuevas: `backend/test/ayudas-clases-archivadas.ts` (ayuda nueva), `backend/test/protegido-clase-archivada.test.ts`, `backend/test/clases-archivadas.integracion.test.ts`, `backend/test/clases-archivadas-matriz.integracion.test.ts`, `backend/test/clases-archivadas-migracion.integracion.test.ts`.
- Lista cerrada (§D-R0 01a y Enmienda 4): `backend/test/calificaciones-lecturas-estatico.test.ts` (CAL-1B08, los dos regex del plan), `backend/test/exportacion-calificaciones-estatico.test.ts` (CAL2-A08, el regex del plan), `backend/test/bloqueo-usuario.integracion.test.ts` (E6, E4-1: título, `"clases.ts"` entre `"categorias.ts"` y `"dudas.ts"`, y la línea `// ADMIN-01a (§D-3): …`), `backend/test/calificaciones-autorizacion.integracion.test.ts` (tercer caso de CAL-1A17, E4-2: `maestroDeClase.delete` del segundo maestro antes del `create`, con su comentario).
- No toqué ninguna `*.ataque` (C-1 y C-2 son del tester).

## Verificación (comando exacto y última línea)

Una suite después de otra; carga medida antes de cada suite completa (backend: 17 % y 17 %; frontend: tras esperar, 2 %).

| Paquete | Comando | Última línea |
|---|---|---|
| shared | `cd shared; npm run build` | `> tsc -p tsconfig.json` (sin errores, exit 0) |
| shared | `cd shared; npm run lint` | `All matched files use Prettier code style!` |
| backend | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0; antes, `All matched files use Prettier code style!`) |
| backend | `cd backend; npm run test` | `Tests  2839 passed (2839)` (`Test Files  239 passed (239)`) |
| backend | `cd backend; npm run build` | `> tsc -p tsconfig.json` (exit 0) |
| frontend | `cd frontend; npm run lint` | `> tsc -b` (exit 0) |
| frontend | `cd frontend; npm run test` | `Tests  6062 passed (6062)` (`Test Files  281 passed (281)`) |
| frontend | `cd frontend; npm run build` | `✓ built in 1.22s` (exit 0; el aviso de tamaño de bloque de siempre) |
| prisma | `npx prisma validate` | `The schema at prisma\schema.prisma is valid` |
| prisma | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` (E1-11) | `No difference detected.` (exit 0) |

### PA-07, contención de la corrida completa del backend

`40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"code":"P2028"` 5 (nivel 40, de pruebas de sesiones y tokens que fuerzan la expiración; traducidos a 503) · `"Error no controlado"` 10, todos simulados por las propias pruebas: 5 "fallo simulado de la base en la búsqueda", 1 "fallo simulado de la base al crear la sesión", 1 "boom" (`salud.integracion`) y 3 `ZodError` "La URL del almacén debe ser http o https" (ataques de URL del almacén). Ninguno de 01a.

## Conteos

- Backend: `cd backend; npx vitest list` → 2839 casos (`grep -a " > " | wc -l`), 239 archivos (`grep -a " > " | cut -d' ' -f1 | sort -u | wc -l`), 33 casos ADM-1A (`grep -a -c "ADM-1A"`).
- Por archivo (`npx vitest list` de los cinco archivos nuevos, `grep -a "ADM-1A" | cut -d'>' -f1 | sort | uniq -c`): `src/core/clases/archivada.test.ts` 7; `test/protegido-clase-archivada.test.ts` 4; `test/clases-archivadas.integracion.test.ts` 14; `test/clases-archivadas-matriz.integracion.test.ts` 5; `test/clases-archivadas-migracion.integracion.test.ts` 3.
- Frontend: de la corrida `npm run test` (281 archivos, 6062 casos).

## Pruebas requeridas (01a)

- **ADM-1A01** → `backend/src/core/clases/archivada.test.ts`: "ADM-1A01: clase activa → null con las tres relaciones y las cuatro políticas"; "ADM-1A01: archivada sin política → 409 CLASE_ARCHIVADA para las tres relaciones"; "ADM-1A01: archivada con 'lectura' → estudiante 409; maestro y admin null"; "ADM-1A01: archivada con 'lectura-del-alumno' o 'gestion' → null para las tres relaciones"; "ADM-1A01: errorClaseArchivada da el código, el estado y el texto exactos".
- **ADM-1A02** → ídem: "ADM-1A02: archivar una activa → null; una archivada → 409 CLASE_YA_ARCHIVADA"; "ADM-1A02: restaurar una archivada → null; una activa → 409 CLASE_NO_ARCHIVADA".
- **ADM-1A03** → `backend/test/protegido-clase-archivada.test.ts`: "ADM-1A03: enClaseArchivada sin pertenencia lanza al construir, con cualquiera de las tres políticas"; "ADM-1A03: "gestion" con roles ["admin", "maestro"], ["maestro"] o sin roles lanza al construir"; "ADM-1A03: "gestion" con roles ["admin"] no lanza y arma los seis pasos"; "ADM-1A03: una ruta con pertenencia y sin enClaseArchivada arranca (la guarda la acepta)".
- **ADM-1A04** → `backend/test/clases-archivadas.integracion.test.ts`: "ADM-1A04: archivar → 200 con archivadaEn ISO y activa = false; otra vez → 409 CLASE_YA_ARCHIVADA sin escribir; restaurar → 200 con archivadaEn null y activa = true; otra vez → 409 CLASE_NO_ARCHIVADA sin escribir".
- **ADM-1A05** → ídem: "ADM-1A05: GET /clases/:claseId trae archivadaEn (null en una activa, ISO en una archivada) para el alumno inscrito, el maestro y el admin"; "ADM-1A05: GET /admin/clases trae archivadaEn en cada fila; crear y editar responden archivadaEn: null".
- **ADM-1A06** → ídem: "ADM-1A06: sin token 401; estudiante y maestro de la clase 403 ROL_NO_PERMITIDO; restringido 403 ACCESO_RESTRINGIDO; clase inexistente 403 SIN_ACCESO_A_LA_CLASE; sin estado de pago en la respuesta del admin".
- **ADM-1A07** → ídem: "ADM-1A07: inscritas e impartidas no traen la archivada (tampoco en total) y al restaurar vuelve"; "ADM-1A07: una clase archivada entre dos páginas como cursor → 400 VALIDACION «cursor: no es válido» en las dos listas, y recorrer de nuevo no salta ninguna clase activa".
- **ADM-1A08** → ídem: "ADM-1A08: el alumno ve solo sus archivadas y el maestro solo las suyas, por archivada_en DESC, id DESC, con total y paginación por cursor; sin estado de pago, restricción, correo ni versión"; "ADM-1A08: admin → 403 ROL_NO_PERMITIDO; restringido → 403 ACCESO_RESTRINGIDO; sin token → 401".
- **ADM-1A09** → `backend/test/clases-archivadas-matriz.integracion.test.ts`: "ADM-1A09 (a): las rutas con :claseId de printRoutes son exactamente las de la tabla de §D-1, métodos incluidos y HEAD aparte"; "ADM-1A09 (b): con una clase archivada, cada ruta cerrada responde 409 CLASE_ARCHIVADA al maestro, al admin y al alumno inscrito cuando sus roles los admiten, sin escribir nada"; "ADM-1A09 (c): cada ruta «lectura» no responde 409 al maestro ni al admin y responde 409 CLASE_ARCHIVADA al alumno inscrito cuando la admite"; "ADM-1A09 (d): las dos rutas «lectura-del-alumno» responden 200 al alumno inscrito (también su HEAD) y al maestro y al admin"; "ADM-1A09 (e): un alumno no inscrito recibe 403 SIN_ACCESO_A_LA_CLASE (nunca 409) en una archivada, en toda ruta que admite su rol".
- **ADM-1A10** → `clases-archivadas.integracion.test.ts`: "ADM-1A10: gradebook y exportación de una archivada → 200 para el maestro de la clase y el admin; mis-calificaciones → 200 para el alumno inscrito".
- **ADM-1A11** → ídem: "ADM-1A11: activas y archivadas filtran y ordenan como §D-2, con total por estado; un cursor del otro estado → 400; sin estado, todas como antes; estado=otra → 400".
- **ADM-1A12** → ídem: "ADM-1A12: el código de una archivada → 404 CODIGO_INVALIDO con el mismo cuerpo que un código inexistente y sin inscripción; tras restaurar, unirse funciona"; "ADM-1A12: con el archivado retenido (UPDATE hecho, sin confirmar), unirse espera esa fila y, al confirmar el archivado, responde 404 sin inscribir" (la espera se comprueba con `formadasDetrasDe`; la transacción retenedora pasa `timeout: 15_000`).
- **ADM-1A13** → ídem: "ADM-1A13: PUT /admin/clases/:claseId sobre una archivada → 409 CLASE_ARCHIVADA sin cambiar el nombre; editarClase directo → null sin escribir".
- **ADM-1A14** → `backend/test/clases-archivadas-migracion.integracion.test.ts`: "ADM-1A14: el CHECK rechaza activa = true con fecha y activa = false sin fecha, y admite los dos estados válidos"; "ADM-1A14: los dos índices parciales existen con sus columnas y su predicado"; "ADM-1A14: las clases anteriores a la migración quedan activas y sin fecha de archivo".
- **ADM-1A15** → `clases-archivadas.integracion.test.ts`: "ADM-1A15: HEAD /clases/:claseId/publicaciones en una archivada → 409 al alumno inscrito y 200 al maestro".

Todas las viñetas están cubiertas.

## C-1, C-2, vigiladas y V-01

- C-1 (`sesiones-y-cadena.ataque`) y C-2 (`lecturas-fx-r1.ataque`) pasaron de rojo a verde.
- Vigiladas de §D-R0 01a, en verde sin cambios: `lecturas-fx-r1.ataque` (324-440, 1121-1147, el caso de C-2 con `instantaneaUnica: true` 4 veces en `clases.ts` y 1 en `clases-archivadas.ts`), `lecturas-consistentes.integracion` (PR-FX-03a, 03b y 04 **no cambiaron**: no hizo falta la reformulación preaprobada), `clases-r1.ataque` (542-585), `gestion-02a-r1.ataque` (544, 793-799), `gestion-clases.integracion` (353-366), `alumnos-b-r1.ataque`, `hilo-01c-r1.ataque`, `sexto-paso-02a-r1.ataque`, `calificaciones-estatico-01b-r1.ataque`, las `guarda-*`, y las vigiladas de la Enmienda 4 (`temas-01a-r1`, `temas-01a-r3`, `arquitectura-cuentas-r1`).
- O-2: el comentario que antecede a `unirseConCodigo` no nombra `FOR SHARE`, `createMany(` ni `$executeRaw` ("en modo compartido", "insertar sin duplicados"); nada fuera de `adapters/db/` nombra `enTransaccion` ni `instantaneaUnica`.
- O-1: ningún literal nuevo `"<nombre>: …"` en `shared/src` (`estadoDeClasesSchema` sin mensaje propio).
- **V-01:** las 249 `*.ataque` coinciden con la tabla SHA-256 de `reporte-tester.md` (`sha256sum -c` sobre la tabla: sin diferencias).
- **No se toca:** `git diff --name-only 8d98fba` (fuera de `docs/trabajo/ADMIN-01-administracion/` y `docs/ESTADO.md`) más los no rastreados solo listan archivos de "Se toca" de 01a, la lista cerrada (con E4-1 y E4-2), las dos `*.ataque` de C-1 y C-2 (del tester) y archivos nuevos de prueba en `backend/test/` y `backend/src/core/clases/`.
- N-18: ninguna prueba nueva deja confirmada una clase con 0 o 3 maestros (todas usan `crearClaseDePrueba` o `POST /admin/clases` con uno; la matriz manda las rutas de maestros con ids al azar y sin cuerpo).

## Migración `admin_01_clases_archivadas` (confirmada por el humano)

`npx prisma migrate dev --create-only --name admin_01_clases_archivadas` generó solo el `ADD COLUMN`; se agregó a mano el bloque de R-02; después `npx prisma migrate dev` (campus_dev local), `validate`, `generate` y la verificación de deriva (sin diferencias). SQL completo:

```sql
-- AlterTable
ALTER TABLE "clases" ADD COLUMN     "archivada_en" TIMESTAMPTZ(3);

-- A mano (Prisma no expresa CHECK ni índices parciales y no los compara al buscar deriva; R-02 de
-- ADMIN-01): archivar pone activa = false con archivada_en; restaurar, activa = true sin fecha.
ALTER TABLE "clases" ADD CONSTRAINT "clases_activa_segun_archivada"
  CHECK ("activa" = ("archivada_en" IS NULL));

-- Lista del administrador por estado (§D-2): activas por (creado_en DESC, id DESC), archivadas por
-- (archivada_en DESC, id DESC).
CREATE INDEX "clases_activas_idx" ON "clases" ("creado_en" DESC, "id" DESC) WHERE "archivada_en" IS NULL;
CREATE INDEX "clases_archivadas_idx" ON "clases" ("archivada_en" DESC, "id" DESC) WHERE "archivada_en" IS NOT NULL;
```

## Matriz de §D-1 (políticas aplicadas)

- `lectura-del-alumno`: `GET /clases/:claseId`, `GET …/mis-calificaciones`.
- `lectura`: las 22 rutas de la fila de §D-1 (personas, alumnos, publicaciones, comentarios, recursos, recurso, dudas, respuestas, temas, categorías, tarea, trabajo, entrega, hilo del alumno, entregas, entrega de un alumno, hilo del maestro, gradebook, exportación y las tres descargas).
- `gestion`: archivar y restaurar.
- Cerradas (sin declarar): todas las demás, incluidas `GET …/codigo`, `GET …/alumnos/candidatos`, `PUT /admin/clases/:claseId` y asignar o quitar maestros. ADM-1A09 (a) comprueba que el conjunto de rutas con `:claseId` es exactamente esta tabla.

## Matriz de avisos y recargas

No aplica: 01a es solo backend (la matriz del plan empieza en 01c).

## Decisiones donde el plan calla

1. `CODIGOS_CLASES` de `shared/` no gana `CLASE_ARCHIVADA`, `CLASE_YA_ARCHIVADA` ni `CLASE_NO_ARCHIVADA` (el plan de 01a no lo pide; la traducción del frontend es de 01c).
2. `estadoDeClasesSchema` va sin mensaje propio (O-1); `estado=otra` responde `400 VALIDACION` con el texto que forma `validarParametros`.
3. `listarClasesAnteriores` elige inscripciones (rol `estudiante`) o asignaciones (cualquier otro rol que llegue; la ruta solo admite estudiante y maestro) con el rol del perfil, en el adaptador; el handler no compara roles. Pagina por keyset `(archivada_en, id)` menores que los de la fila del cursor, sin el cursor de Prisma (que no ordena por una columna de la relación); el cursor se lee por PK de la inscripción o la asignación.
4. Archivar y restaurar usan la hora del servidor de la API (`new Date()`) para `archivada_en`, no `now()` de la base.
5. Si un archivado o una restauración confirma entre el `UPDATE` (0 filas) y la relectura, la respuesta sigue siendo el 409 del estado que vio el `UPDATE` (comentado en el código).
6. `conMaestroPrincipal` (handler) serializa `archivadaEn` a ISO o `null`, así que crear, editar, archivar, restaurar y el detalle siempre lo mandan.
7. ADM-1A03 vive en `backend/test/` (archivo nuevo de prueba), no junto a `middleware/index.test.ts`, que no está en "Se toca".
8. ADM-1A09 decide si una ruta cerrada admite a un actor comparando con una clase gemela activa: si en la gemela responde `403 ROL_NO_PERMITIDO` o `SIN_ACCESO_A_LA_CLASE`, en la archivada se espera ese 403; si no, `409 CLASE_ARCHIVADA`. Para los HEAD, el código se lee del GET equivalente.

## Hermanos

- **El filtro de archivadas en las listas con cursor** (inscritas, impartidas, admin por estado, anteriores): las cuatro leen el cursor por PK con `archivadaEn` y rechazan con `400` el cursor que no cumple el filtro; las cuatro filtran también el `total`. Aplicado en las cuatro.
- **`archivadaEn` en las respuestas de clase**: detalle, crear, editar, archivar, restaurar (vía `conMaestroPrincipal`) y cada fila de la lista del admin. Aplicado en todas. Las listas de inscritas e impartidas no lo llevan (sus esquemas no lo piden; nunca traen archivadas).
- **Escrituras sobre `clases` que deben respetar el archivado**: `editarClase` (filtro `archivadaEn: null`, plan); `regenerarCodigo` no se cambió (la ruta es cerrada y el plan no pide filtro; una carrera con archivar regeneraría el código de una archivada, que no sirve para unirse porque `unirseConCodigo` rechaza la archivada). Se registra como observación, sin cambio.
- **Unirse**: el único camino de inscripción por código es `unirseConCodigo`; el alta manual (`POST …/alumnos`) es una ruta cerrada.
- **Estados del mecanismo del sexto paso**: clase inexistente (403 antes del 409), ajena (403), rol no admitido (403 de `requireRole` o de pertenencia), admin sin `admin` en `roles` (403), activa (sin cambio), archivada con cada política; los cubren ADM-1A01 y ADM-1A09.
- **E4-2 (tres maestros)**: los hermanos los inventarió el plan (Enmienda 4); no encontré otro caso que deje confirmada una clase con más de dos maestros.

## Pendiente o fuera de alcance detectado

- `regenerarCodigo` sin filtro de archivada (ver "Hermanos"); sin efecto funcional.
- El aviso de tamaño de bloque del build del frontend es el de siempre.

## Corrección ronda 1

Hallazgos atendidos: **T-01 corregido. T-02 no corregido: PARADA** (el remedio exige cambiar el contrato del cursor en `shared/`; propuesta abajo, sin aplicar).

### T-01 — editar en carrera con un archivado → 409, no 403 (corregido)

- **Remedio:** `editarClase` (`backend/src/adapters/db/clases.ts`). Si su `updateMany` (filtrado por `archivadaEn: null`) no cambia ninguna fila, relee la clase por PK: si no existe devuelve `null` (el handler sigue respondiendo `403 SIN_ACCESO_A_LA_CLASE`, como hoy); si existe, lanza `errorClaseArchivada()` de `core/clases/archivada.ts` (`409 CLASE_ARCHIVADA`, "Esta clase está archivada: solo se puede consultar."), el mismo que da la ruta cerrada. `handlers/clases/gestion.ts` no cambia.
- **Desviación declarada:** ADM-1A13 decía "editarClase llamado directo con una archivada → `null` sin escribir". Con T-01 lanza el 409 sin escribir. Ajusté mi propia prueba (`clases-archivadas.integracion.test.ts`, ADM-1A13; título nuevo: "ADM-1A13: PUT /admin/clases/:claseId sobre una archivada → 409 CLASE_ARCHIVADA sin cambiar el nombre; editarClase directo → lanza el mismo 409 sin escribir (T-01) y, con la clase inexistente, null"), que además comprueba el `null` con una clase inexistente.
- **Cubre:** `clases-archivadas-r1.ataque` › "ADM-T1A05: editar la clase (PUT /admin/clases/:claseId) en carrera con un archivado …" (verde) y ADM-1A13.

**Hermanos (escrituras que filtran por archivada o se cruzan con un archivado después del sexto paso), uno por uno:**
1. `editarClase`: único adaptador que filtra por `archivada_en` en una escritura. Remedio aplicado.
2. `archivarClase` y `restaurarClase`: ya releen por PK y distinguen 403 (no existe) de 409 (`CLASE_YA_ARCHIVADA` o `CLASE_NO_ARCHIVADA`). No aplica.
3. `unirseConCodigo`: decide bajo `FOR SHARE`; una archivada responde `404 CODIGO_INVALIDO` por diseño (§D-3, no revela que existe). No aplica.
4. `regenerarCodigo`, publicar y comentar, temas, categorías, tareas, entregas, calificar, hilo privado, dudas, alta y baja de alumnos, asignar y retirar maestros: no filtran por archivada; si pasaron el sexto paso antes del archivado, confirman (R-03 y S-05 aceptados; O-R1-2 del tester lo confirma sin 500). No aplica: el plan no les pide filtro.

**Estados vecinos del mecanismo (`editarClase` con 0 filas o con relectura):**
- Clase activa: escribe y relee (sin cambio).
- Clase archivada antes del sexto paso: 409 del sexto paso (sin cambio).
- Archivada después del sexto paso (la carrera de T-01): 409 del adaptador (corregido).
- Borrada después del sexto paso, antes del `UPDATE`: relectura `null` → `403 SIN_ACCESO_A_LA_CLASE` (como hoy).
- Borrada entre el `UPDATE` y la relectura de `leerClase`: `null` → 403 (vigilada `lecturas-fx-r1.ataque:648-658`, en verde).
- Archivada y restaurada entre el `UPDATE` (0 filas) y la relectura: responde 409, el estado que vio el `UPDATE` (igual que la decisión 5 de archivar y restaurar).

### T-02 — keyset de las listas de archivadas con la clase del cursor vuelta a archivar (PARADA)

**Por qué no hay remedio dentro de §D-2 y M-01:** el cursor es solo un `claseId` (`paginacionSchema.cursor: z.uuid()` y `siguienteCursor: z.uuid().nullable()` en `shared/`). El servidor solo puede leer la posición **actual** de la fila del cursor (`findUnique` por PK, M-01). Si la clase se restaura y se vuelve a archivar, su `archivada_en` cambia y su posición actual ya no es la que vio la página anterior; con solo el id no hay forma de distinguir "este cursor viene de una página que lo vio en otra posición". Probé en la cabeza alternativas sin cambiar el contrato y ninguna es correcta:
- Rechazar si el cursor quedó "en la cabeza" (sin filas antes que él): falla con archivados legítimos posteriores y no detecta una vuelta a archivar que no quede primera.
- Conservar la `archivada_en` original al volver a archivar: cambia el significado del dato (la fecha de archivo).

**Propuesta (no aplicada; la decide el manager):**
- (a) **Recomendada.** Cursor con posición: en las dos listas ordenadas por `archivada_en` (`GET /clases/anteriores` y `GET /admin/clases?estado=archivadas`), la respuesta suma `siguienteCursorArchivadaEn` (ISO o `null`) y la consulta admite `cursorArchivadaEn` (ISO, obligatorio si hay `cursor` en esas dos listas). El servidor sigue leyendo la fila del cursor por PK (M-01) y responde `400 VALIDACION` "cursor: no es válido" si su `archivada_en` actual no coincide con la que trae el cliente (la clase se restauró y se volvió a archivar). El keyset usa la posición del cliente. Cambia `shared/` (`listaClasesAnterioresRespuestaSchema`, `listaClasesAdminConsultaSchema` o un esquema de consulta propio y `listaClasesAdminRespuestaSchema`) y los consumidores de 01c y 01d. Alternativa equivalente: `siguienteCursor` opaco (`"<archivadaEn>|<id>"`), que exige quitar `z.uuid()` de esos dos esquemas.
- (b) Riesgo aceptado en ESTADO §3 (el tester lo juzgó baja: exige restaurar y volver a archivar la clase exacta del cursor mientras alguien pagina).

**Hermanos de T-02:**
- `GET /clases/inscritas` y `GET /clases/impartidas`: ordenan por el `creado_en` de la inscripción o la asignación, que archivar y restaurar no cambian. Cursor archivado → 400; restaurado → vuelve a su misma posición. Sin hueco.
- `GET /admin/clases` sin `estado` y con `estado=activas`: ordenan por `clases.creado_en`, que no cambia. Archivada (con `activas`) → 400; restaurada → misma posición. Sin hueco.
- `GET /admin/clases?estado=archivadas` y `GET /clases/anteriores`: ordenan por `archivada_en`, que cambia al volver a archivar. Ahí está el hueco (ADM-T1A07b y ADM-T1A07).

### Verificación (ronda 1)

| Paquete | Comando | Última línea |
|---|---|---|
| backend | `npm run lint` | exit 0 (`> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) |
| backend | `npm run test` (carga 0 % y 2 %) | `Tests  2 failed | 2852 passed (2854)` · `Test Files  1 failed | 239 passed (240)`: solo ADM-T1A07 y ADM-T1A07b (T-02, PARADA) |
| backend | `npm run build` | exit 0 (`> tsc -p tsconfig.json`) |
| frontend | `npm run lint` | exit 0 (`> tsc -b`) |
| frontend | `npm run test` (carga 3 % y 12 %, tras esperar a la carga ajena) | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` |
| frontend | `npm run build` | `✓ built in 872ms` |
| shared | no se tocó en esta ronda | n/a |

Ningún archivo cayó por tiempo.

**PA-07:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"code":"P2028"` 5 (los mismos de siempre) · `"Error no controlado"` 10: 5 "fallo simulado de la base en la búsqueda", 1 "fallo simulado de la base al crear la sesión", 1 "boom" y 3 `ZodError` de la URL del almacén. Ninguno de 01a.

**Conteos:** `cd backend; npx vitest list` → 2854 casos (`grep -a " > " | wc -l`), 240 archivos (`grep -a " > " | cut -d' ' -f1 | sort -u | wc -l`), 33 `ADM-1A` (`grep -a -c "ADM-1A"`) y 15 `ADM-T1A` (`grep -a -c "ADM-T1A"`).

**V-01:** la tabla de la ronda 0 (249 filas) con `archivos-d-r1` cambiado a `87add25840c43bc2608eab5dd15a0f372b34a2d11908cbf60819c6edd69500c2` y la fila nueva `clases-archivadas-r1` `c3f5df14a1bc30b3ff2530a5edb8e6de6ecf6a62f1b380d0d6acebe1f79c70cd`: 250 filas, `sha256sum -c` sin diferencias; el repositorio tiene 250 `*.ataque`. No toqué ninguna.

**Archivos de esta ronda:** `backend/src/adapters/db/clases.ts` (T-01) y `backend/test/clases-archivadas.integracion.test.ts` (ADM-1A13). Nada fuera de "Se toca" ni de mis pruebas nuevas.

## Corrección ronda 1 — T-02 (Enmienda 5)

Plan: `plan.md` SHA-256 `066d9476fb1bb17301babf505eaeae1b6d904c227c7ac8cdd0c56a33a23f8a68` (Enmiendas 1 a 5; comprobado al empezar). Paso 7b, solo lo de 01a. **T-02 corregido** con el cursor con posición (§D-2, Enmienda 5). T-01 sigue corregido (sección anterior). N-22 aplicado.

### Qué cambió

- `shared/src/clases.ts` e `index.ts`: `listaClasesAnterioresConsultaSchema` (nuevo, `paginacionSchema.extend({ cursorArchivadaEn: z.string().optional() })`) y su tipo `ListaClasesAnterioresConsulta`; `listaClasesAdminConsultaSchema` suma `cursorArchivadaEn: z.string().optional()`; `listaClasesAnterioresRespuestaSchema` suma `siguienteCursorArchivadaEn: z.iso.datetime().nullable()` (obligatorio); `listaClasesAdminRespuestaSchema` suma `siguienteCursorArchivadaEn: z.iso.datetime().nullable().optional()`. Sin mensajes propios ni `superRefine` (O-1).
- `backend/src/adapters/db/clases-archivadas.ts` (`listarClasesAnteriores`): (a) y (b) antes de leer el cursor (cursor sin posición o posición sin cursor → 400); después del mismo `findUnique` por PK (M-01, mismo `select`), rechaza si no existe, no está archivada o `archivadaEn.toISOString() !== cursorArchivadaEn` (d). El keyset no cambia. Devuelve `siguienteCursorArchivadaEn` (el `archivadaEn` de la última clase si hay siguiente; si no, `null`).
- `backend/src/adapters/db/clases.ts` (`listarClasesAdmin`, `cursorArchivadaEn` opcional en la firma): sin `estado` o con `activas`, cualquier `cursorArchivadaEn` → 400 (c); con `archivadas`, (a) y (b) → 400; después del `findUnique` por PK y `cumpleElEstado`, con `archivadas`, posición distinta → 400 (d). `siguienteCursorArchivadaEn` solo con `archivadas` y página siguiente; si no, `null`. Todo con `errorCursorInvalido` ("cursor: no es válido").
- Handlers: `GET /clases/anteriores` valida con `listaClasesAnterioresConsultaSchema`; `GET /admin/clases` pasa `cursorArchivadaEn`; los dos serializan `siguienteCursorArchivadaEn` con `toISOString()` o `null`.
- `backend/src/adapters/README.md` (N-22: la relectura por id de `editarClase`, `null` si no existe o `409 CLASE_ARCHIVADA` si existe; y la posición en `listarClasesAdmin` y `listarClasesAnteriores`) y `backend/src/handlers/README.md`.
- Pruebas propias: ADM-1A08 y ADM-1A11 ajustados en `backend/test/clases-archivadas.integracion.test.ts`; ADM-1A16 y ADM-1A17 nuevos en `backend/test/clases-archivadas-posicion.integracion.test.ts`. Ninguna otra prueba normal cambió. No toqué ninguna `*.ataque`.

### Pruebas requeridas (Enmienda 5)

- **ADM-1A08** → `backend/test/clases-archivadas.integracion.test.ts`: "ADM-1A08: el alumno ve solo sus archivadas y el maestro solo las suyas, por archivada_en DESC, id DESC, con total y paginación por cursor; sin estado de pago, restricción, correo ni versión". El recorrido manda `cursor` y `cursorArchivadaEn`; comprueba que `siguienteCursorArchivadaEn` es el `archivadaEn` de la última clase y que es `null` exactamente cuando `siguienteCursor` es `null`; los cursores de una activa, una ajena y uno inexistente van con una posición bien formada y siguen en 400. El segundo caso ("ADM-1A08: admin → 403 ROL_NO_PERMITIDO; restringido → 403 ACCESO_RESTRINGIDO; sin token → 401") no cambia.
- **ADM-1A11** → ídem: "ADM-1A11: activas y archivadas filtran y ordenan como §D-2, con total por estado; un cursor del otro estado → 400; sin estado, todas como antes; estado=otra → 400". Página siguiente de `archivadas` con posición; `siguienteCursorArchivadaEn` es el `archivadaEn` de la última fila en `archivadas` y `null` en `activas` y sin `estado` aunque haya `siguienteCursor`; el cursor de una activa en `archivadas`, con posición bien formada → 400; con `activas` y sin `estado`, `cursorArchivadaEn` con o sin `cursor` → 400; sin `estado` con el cursor de una archivada y sin posición → 200.
- **ADM-1A16** → `backend/test/clases-archivadas-posicion.integracion.test.ts`: "ADM-1A16 (alumno): la página siguiente con la posición → 200; con la clase del cursor restaurada y vuelta a archivar, una posición que no coincide, el cursor sin posición o la posición sin cursor → 400 "cursor: no es válido"" y "ADM-1A16 (maestro): …" (mismo resto del título). Cubren (a) el control [C, D]; (b) restaurada y vuelta a archivar por la API → 400; (c) otra fecha, sin milisegundos, `+00:00` mandado como `%2B00:00` y texto vacío, cada una → 400; (d) cursor sin posición; (e) posición sin cursor. Cuerpo exacto `{ error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } }`.
- **ADM-1A17** → ídem: "ADM-1A17: la página siguiente con la posición → 200; vuelta a archivar por la API o directo en la base, una posición que no coincide, el cursor sin posición o la posición sin cursor → 400 "cursor: no es válido"" ((a) a (e), y (f) directo en la base con `archivarClaseDePrueba`; arranca con un centinela y su posición real) y "ADM-1A17 (g): el recorrido completo de un tramo propio con limite 1, 2 y 3 entrega cada clase una sola vez, en (archivada_en DESC, id DESC)" (con tres clases empatadas en la misma fecha).

### Rojo esperado (declarado)

Exactamente las tres de C-21, C-23 y C-24, que el tester ajusta en su ronda 2. ADM-T1A07 queda en verde.
- ADM-T1A06: `{"error":{"codigo":"VALIDACION","mensaje":"cursor: no es válido"}}: expected 400 to be 200` (su recorrido manda el cursor sin posición).
- ADM-T1A07b: `{"error":{"codigo":"VALIDACION","mensaje":"cursor: no es válido"}}: expected 400 to be 200` (la primera petición manda `cursor=centinela` sin posición).
- ADM-T1A08: `expected '400 VALIDACION' to be '200'` (la última aserción, `conSuCursor`, sin posición).

Ninguna otra prueba en rojo.

### Hermanos y estados vecinos del mecanismo de la posición

| Estado | `GET /clases/anteriores` | `GET /admin/clases?estado=archivadas` | Prueba |
|---|---|---|---|
| Cursor y posición válidos | 200, página siguiente | 200 | ADM-1A08, 1A11, 1A16 (a), 1A17 (a) y (g) |
| Clase del cursor restaurada | 400 (no está archivada) | 400 (no cumple el filtro) | ADM-T1A07 (verde), R-04 |
| Restaurada y vuelta a archivar por la API | 400 (posición distinta) | 400 | ADM-1A16 (b), 1A17 (b) |
| Vuelta a archivar directo en la base | 400 | 400 | ADM-1A17 (f) |
| Posición sin cursor | 400 | 400 | ADM-1A16 (e), 1A17 (e) |
| Cursor sin posición | 400 | 400 | ADM-1A16 (d), 1A17 (d) |
| Formato distinto (sin ms, `+00:00`, vacío, otra fecha) | 400 | 400 | ADM-1A16 (c), 1A17 (c) |
| Cursor de una activa, ajena o inexistente con posición bien formada | 400 | 400 (activa) | ADM-1A08, 1A11 |

Lista del admin **sin `estado`** y con **`activas`**: cualquier `cursorArchivadaEn`, con o sin `cursor`, → 400; sin posición, como hoy (un cursor archivado sin `estado` → 200; con `activas` → 400 por el filtro); `siguienteCursorArchivadaEn` es `null` aunque haya página siguiente (ADM-1A11). Inscritas e impartidas no cambian (su clave de orden no se mueve; sección anterior). La posición protege solo la fila del cursor (R-19, riesgo aceptado).

### Verificación

Una suite después de otra, con la puerta de carga (backend: 18 % y una segunda lectura de 25 % o menos; frontend: 2 % y una segunda de 25 % o menos). Ningún archivo cayó por tiempo; no terminé procesos ajenos.

| Paquete | Comando | Última línea |
|---|---|---|
| shared | `npm run build` | exit 0 (`> tsc -p tsconfig.json`) |
| shared | `npm run lint` | `All matched files use Prettier code style!` (exit 0) |
| backend | `npm run lint` | exit 0 (`> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) |
| backend | `npm run test` | `Tests  3 failed \| 2855 passed (2858)` · `Test Files  1 failed \| 240 passed (241)`: solo el rojo esperado |
| backend | `npm run build` | exit 0 (`> tsc -p tsconfig.json`) |
| frontend | `npm run lint` | exit 0 (`> tsc -b`) |
| frontend | `npm run test` | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` |
| frontend | `npm run build` | `✓ built in 2.15s` |

Vigiladas de la Enmienda 5 en verde sin cambios: `lecturas-fx-r1.ataque` (324-440, 805-825, 1125-1150), `gestion-02a-r1.ataque` (783-825), `gestion-clases.integracion` (339-392), `lecturas-consistentes.integracion` (290-335) y `frontend/src/lib/errores-ch3-r2.ataque` (suite del frontend en verde).

**PA-07:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"code":"P2028"` 5 (los de siempre) · `"Error no controlado"` 10 (5 "fallo simulado de la base en la búsqueda", 1 "fallo simulado de la base al crear la sesión", 1 "boom" y 3 `ZodError` de la URL del almacén). Ninguno de 01a.

**Conteos:** `cd backend; npx vitest list` → 2858 casos (`grep -a " > " | wc -l`), 241 archivos (`grep -a " > " | cut -d' ' -f1 | sort -u | wc -l`), 37 `ADM-1A` (`grep -a -c "ADM-1A"`: los 33 de antes más 4 nuevos, dos de ADM-1A16 y dos de ADM-1A17).

**V-01:** 250 filas (la tabla de la ronda 0 con `archivos-d-r1` en `87add258…` y la fila de `clases-archivadas-r1` en `c3f5df14…`), `sha256sum -c` sin diferencias; el repositorio tiene 250 `*.ataque`.

**No se toca:** `git diff --name-only 8d98fba` (fuera de `docs/`) más los no rastreados solo listan "Se toca" de 01a, la lista cerrada (CAL-1B08, CAL2-A08, E6 y CAL-1A17), las `*.ataque` del tester (C-1, C-2, `archivos-d-r1` por N-20 y `clases-archivadas-r1`) y mis pruebas nuevas. Esta corrección solo tocó `shared/src/clases.ts`, `shared/src/index.ts`, `adapters/db/clases.ts`, `adapters/db/clases-archivadas.ts`, `handlers/clases/clases.ts`, `handlers/clases/gestion.ts`, los dos README, `clases-archivadas.integracion.test.ts` y el archivo nuevo `clases-archivadas-posicion.integracion.test.ts`. M-09 y `lib/unir-paginas.ts` no se tocaron (son de 01e y 01c).

**N-18:** las pruebas nuevas crean clases con un maestro (`crearClaseDePrueba`); ninguna queda con 0 o 3.

## ADMIN-01b — Implementación

**Estado: PARADA en el paso 10 (migración `admin_01_copias_de_archivos`), como manda el encargo.** Pasos 8 y 9 hechos; el 10 llega hasta `prisma validate`. Pasos 11 a 13 sin empezar: esperan la confirmación del humano para `prisma migrate dev`.

Plan: `docs/trabajo/ADMIN-01-administracion/plan.md`, SHA-256 `066d9476fb1bb17301babf505eaeae1b6d904c227c7ac8cdd0c56a33a23f8a68` (Enmiendas 1 a 5; comprobado al empezar). Red de las corridas (PA-01, N-27): `IZZI-F281-5G`, perfil Público, regla "Campus: bloquear entrada a Docker en redes publicas" habilitada (Inbound, Block, Public); Docker 28.5.1. Trabajo en paralelo: respuesta del humano transmitida por el orquestador (la otra copia no corre nada).

### Hecho hasta la PARADA

- **Paso 8, `shared/`:** `shared/src/clases.ts` suma `duplicarClaseSchema` (`nombreClaseSchema` + `maestroIdsSchema`), `conteoDeBorradoRespuestaSchema` (cinco enteros ≥ 0), `CONFIRMAR_BORRADO_DE_CLASE = "borrar"` y `confirmarBorradoClaseSchema` (`z.object`, `confirmar` literal opcional), con sus tipos; `shared/src/index.ts` los exporta.
- **Paso 9, `core/` con ADM-1B01:** `core/clases/borrado.ts` (`decidirBorrado`, `partirEnLotes` y los tres errores 409), `core/clases/duplicado.ts` (`esRecursoDeAprendizaje`, `planDeDuplicado`), `core/archivos/objetos.ts` (puerto `AlmacenDeObjetos`, `errorArchivoEnCopia`, `errorAlmacenDeObjetosNoConfigurado`), `core/eventos/objetos.ts` (las cuatro colas, topes por trabajo, `RETRASO_BORRADO_DE_OBJETOS_MS = 600_000` y los dos esquemas de datos). Cada uno con su prueba.
- **Paso 10, hasta `validate`:** `backend/prisma/schema.prisma` (`archivos.copia_de` con la relación consigo misma `CopiasDeArchivo`, `ON DELETE RESTRICT`; `@@index([copiaDe])`, `@@index([claseId, estado])`; en `movimientos_inscripcion`, `@@index([claseId, secuencia(sort: Desc)])`; comentarios de `Archivo` y `MovimientoInscripcion` al día, A-09). Sin carpeta de migración todavía.

### Verificación hasta aquí (comando exacto y última línea)

| Paquete | Comando | Última línea |
|---|---|---|
| shared | `cd shared; npm run build` | `> tsc -p tsconfig.json` (exit 0) |
| shared | `cd shared; npm run lint` | `All matched files use Prettier code style!` |
| backend | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0) |
| backend | `cd backend; npx vitest run src/core/clases src/core/eventos src/core/archivos` | `Tests  100 passed (100)` (`Test Files  16 passed (16)`) |
| frontend | `cd frontend; npm run lint` | `> tsc -b` (exit 0) |
| frontend | `cd frontend; npm run build` | `✓ built in 791ms` |
| frontend | `cd frontend; npx vitest run src/lib/errores-ch3-r2.ataque.test.ts` (O-01b-10) | `Tests  84 passed (84)` |
| prisma | `cd backend; npx prisma validate` | `The schema at prisma\schema.prisma is valid` |
| prisma | `cd backend; npx prisma format --check` | `All files are formatted correctly!` |

Conteo: `cd backend; npx vitest list src/core/clases/borrado.test.ts src/core/clases/duplicado.test.ts | grep -a -c "ADM-1B01"` → 11.

Prettier: solo `npx prettier --write` sobre los ocho archivos nuevos de `core/` (acotado, nunca la raíz).

### La migración propuesta (PARADA)

**SQL que genera Prisma** (`cd backend; npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, solo lectura contra `campus_dev` local; es lo que escribirá `migrate dev --create-only`):

```sql
-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "copia_de" UUID;

-- CreateIndex
CREATE INDEX "archivos_copia_de_idx" ON "archivos"("copia_de");

-- CreateIndex
CREATE INDEX "archivos_clase_id_estado_idx" ON "archivos"("clase_id", "estado");

-- CreateIndex
CREATE INDEX "movimientos_inscripcion_clase_id_secuencia_idx" ON "movimientos_inscripcion"("clase_id", "secuencia" DESC);

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_copia_de_fkey" FOREIGN KEY ("copia_de") REFERENCES "archivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Bloque a mano** (al final del mismo `migration.sql`):

```sql
-- A mano (Prisma no expresa CHECK ni lo compara al buscar deriva; R-02 de ADMIN-01): solo un
-- archivo confirmado puede ser una copia en curso (§D-5, M-02).
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_copia_solo_confirmado"
  CHECK ("copia_de" IS NULL OR "estado" = 'confirmado');
```

**Compatibilidad hacia atrás:** columna nueva y nula; un backend anterior no la escribe ni la lee (R-09: serviría una copia en curso con un 404 del almacén). Tres índices nuevos y una FK solo sobre la columna nueva. Ninguna fila existente viola el `CHECK`: todas nacen con `copia_de` nulo. Los `CREATE INDEX` no son `CONCURRENTLY` (Prisma no lo hace dentro de su transacción): bloquean la escritura de `archivos` y `movimientos_inscripcion` mientras se crean, unos milisegundos con el tamaño del piloto.

**Estado de `campus_dev` local:** `npx prisma migrate status` → `17 migrations found in prisma/migrations` · `Database schema is up to date!` (la última aplicada es `20261104234335_admin_01_clases_archivadas`). Ninguna fila violaría el `CHECK`, por construcción (la columna todavía no existe y nace nula). No leí `.env` ni consulté filas.

**Procedimiento propuesto (lo corro solo con la confirmación del humano), desde `backend/`:**
1. `npx prisma migrate dev --create-only --name admin_01_copias_de_archivos` (crea la carpeta con el SQL de arriba, sin aplicarla).
2. Agregar el bloque a mano al final de `migration.sql`.
3. `npx prisma migrate dev` (aplica en `campus_dev` local). Si propone un `reset` o detecta deriva, PARADA: no se confirma ni se resetea.
4. `npx prisma validate`.
5. `npx prisma generate`.
6. Verificación de deriva (E1-11, N-06): `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` debe terminar en `No difference detected.` (exit 0). Si propone borrar índices, la FK o el `CHECK`, PARADA (R-02).
7. ADM-1B14 (prueba de migración nueva) y después los pasos 11 a 13.

### Decisiones donde el plan calla (hasta aquí)

1. `confirmarBorradoClaseSchema` lleva el mensaje `"no es válido"` en el literal (sin prefijo propio): la respuesta queda `confirmar: no es válido`, en español, como `cursor: no es válido`, en lugar del texto por omisión de zod en inglés. No crea ningún literal `"<nombre>: …"` en `shared/src` (O-01b-10; `errores-ch3-r2.ataque` en verde).
2. `CONFIRMAR_BORRADO_DE_CLASE` se exporta como constante, como `CONFIRMAR_BORRADO_CON_ENTREGAS` de las tareas.
3. `planDeDuplicado` reparte los ids nuevos de los temas ya ordenados: dos temas con el mismo `orden` conservan entre sí su orden `(orden, id)`; los huecos de `orden` se copian tal cual. A los archivos copiados les da marcas `ahora + i ms` en el orden `(creado_en, id)` de la original, para que los adjuntos de cada recurso conserven su orden (la lista de adjuntos se ordena así).
4. `planDeDuplicado` filtra otra vez lo que no se copia (no aprendizaje, no confirmado, de un recurso que no se copia), aunque la lectura del adaptador ya lo acote: así ADM-1B01 prueba "nada de lo excluido" en `core/`.
5. Un tema de la original que ya no existe deja el recurso copiado en "Sin tema" (no ocurre con la FK `ON DELETE SET NULL`, pero el mapa lo cubre).

### Pruebas requeridas cubiertas hasta aquí

- **ADM-1B01** → `backend/src/core/clases/borrado.test.ts`: "ADM-1B01: una activa → 409 CLASE_NO_ARCHIVADA, con o sin copias y con o sin confirmar"; "ADM-1B01: una archivada con copias en curso → 409 CLASE_CON_COPIAS_EN_CURSO, con o sin confirmar"; "ADM-1B01: una archivada sin copias y sin confirmar → 409 CONFIRMACION_REQUERIDA; confirmada → null"; "ADM-1B01: vacío → ningún lote; exacto → uno; uno de más → dos; 2 001 claves en lotes de 1000 → tres, en orden"; "ADM-1B01: un tamaño que no es un entero positivo lanza". `backend/src/core/clases/duplicado.test.ts`: "ADM-1B01: bloque aprendizaje sí; bloque nulo con autor admin sí y con autor maestro no; docente no; anuncio y tarea no"; "ADM-1B01: los temas conservan nombre, orden (con huecos) y el orden entre empates, en la clase nueva"; "ADM-1B01: las categorías conservan nombre y peso, en el orden (creado_en, id) con marcas crecientes"; "ADM-1B01: solo los recursos de aprendizaje, del más reciente al más antiguo, con el tema mapeado, sin tema o con el tema borrado en nulo"; "ADM-1B01: los archivos confirmados de los recursos copiados, con la clave de la clase nueva y copiaDe = el original; nada de lo excluido"; "ADM-1B01: una original sin temas, categorías ni recursos da un plan vacío".
- ADM-1B02 a ADM-1B23: **no cubiertas todavía** (pasos 10 a 13 pendientes).

### No se toca y `*.ataque`

- `git status`: fuera de `docs/trabajo/ADMIN-01-administracion/` y del archivo ajeno `docs/trabajo/DEPLOY-investigacion-vps.md`, solo cambian `shared/src/clases.ts`, `shared/src/index.ts`, `backend/prisma/schema.prisma` y los ocho archivos nuevos de `core/` (de "Se toca" de 01b o pruebas nuevas). Las tres `*.ataque` modificadas son C-3 a C-5 del tester; no toqué ninguna `*.ataque`.
- Las vigiladas y C-3 a C-5 se corren con el código de los pasos 11 y 12 (C-3 a C-5 siguen en su rojo esperado hasta entonces).

### Reanudación tras la confirmación de la migración (2026-11-05)

**Estado: PARADA en el paso 13.** La migración está aplicada y los pasos 11 y 12 están hechos con ADM-1B02 a ADM-1B24 (también ADM-1B24, de la Enmienda 6). Al correr las suites de los módulos tocados falló una prueba normal que no está en la lista cerrada de 01b: **ADM-1A09 (a)** de `backend/test/clases-archivadas-matriz.integracion.test.ts`. La dejé intacta. Plan vigente: SHA-256 `7118c2283f47e6bfc146f219c795b68d6d502bcbf69ab601e5e44498d97e71eb` (Enmiendas 1 a 6).

**La PARADA.** El caso ADM-1A09 (a) compara las rutas con `:claseId` de `printRoutes` contra la tabla `POLITICAS` de ese mismo archivo, que tiene solo las rutas de 01a. 01b registra las cuatro rutas que el plan ya pone como `"gestion"` en §D-1: `GET` y `HEAD /api/admin/clases/:claseId/conteo-de-borrado`, `DELETE /api/admin/clases/:claseId` y `POST /api/admin/clases/:claseId/duplicar`. El resultado es `expected [ …(88) ] to deeply equal [ …(84) ]`: el diff solo muestra esas cuatro entradas de más y ninguna de menos. El remedio sería sumar a `POLITICAS` cuatro entradas con `"gestion"`, como las de archivar y restaurar, y revisar que (b) a (e) las traten bien. No lo apliqué porque el archivo no está en la lista cerrada de 01b; lo decide el manager o el arquitecto.

**Migración aplicada (procedimiento del orquestador, contra `campus_dev` local):**
1. `npx prisma migrate dev --create-only --name admin_01_copias_de_archivos` creó `backend/prisma/migrations/20261105163205_admin_01_copias_de_archivos/migration.sql`. Coincide exactamente con el SQL reportado: la columna, los tres índices y la FK con `ON DELETE RESTRICT ON UPDATE CASCADE`, nada más.
2. Al final del archivo se agregó el bloque a mano del `CHECK archivos_copia_solo_confirmado`.
3. `npx prisma migrate dev` → `Your database is now in sync with your schema.` (no propuso reset). `npx prisma validate` → `The schema at prisma\schema.prisma is valid`. `npx prisma generate` → `✔ Generated Prisma Client (7.10.0) to .\src\adapters\db\generated`.
4. Deriva (E1-11): `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → `No difference detected.` (exit 0).

**Archivos de los pasos 11 y 12:**
- **Adaptadores.**
  - `adapters/db`: `cliente.ts` (`timeout`), `archivos.ts` (`copiaDe` en la descarga), `publicaciones.ts` y `recursos.ts` (descarte con `copiaDe: null`), `index.ts`, y los nuevos `bloqueo-maestros.ts`, `borrado-de-clase.ts`, `duplicado-de-clase.ts` y `copias-de-archivos.ts`.
  - `adapters/queue/index.ts`: `cancelarVarios`, `inicio` en el lote y `datos` en el trabajo fallido.
  - `adapters/queue/colas.ts`: las cuatro colas nuevas.
  - `adapters/storage/index.ts`: `crearAlmacenDeObjetos` y `ClienteDeObjetos`.
- **Handlers:** `handlers/clases/gestion.ts` (las tres rutas) y `handlers/archivos.ts` (`409 ARCHIVO_EN_COPIA`).
- **Worker:** `workers/objetos.ts` y `worker.ts`.
- **README:** los de `adapters`, `handlers` y `workers`.
- **Pruebas nuevas:** `adapters/storage/objetos.test.ts`, y en `test/` `copias-de-archivos-migracion`, `borrado-de-clase`, `duplicado-de-clase`, `borrado-duplicado-autorizacion`, `worker-objetos` y `colas-objetos` (todas `.integracion.test.ts`). Ayudas nuevas: `test/ayudas-borrado-duplicado.ts` y `test/objetos-en-memoria.ts`.
- **Lista cerrada (E4-4):** `test/bloqueo-usuario.integracion.test.ts` E6 cambia en sus tres partes. Lista final de archivos con SQL etiquetado de 01b: `bloqueo-maestros.ts`, `borrado-de-clase.ts`, `duplicado-de-clase.ts` y **`copias-de-archivos.ts`**. Este último entra porque `leerCopiasPendientes` usa `$queryRaw` (un `LEFT JOIN` con el original): así la lectura es **una** sentencia, como pide M-03. Las dos escrituras son `updateMany`. Ningún archivo existente ganó SQL etiquetado.

**Verificación (comando exacto y última línea).** Red PA-01: `IZZI-F281-5G`, perfil Público, la regla del firewall activa.
- `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0).
- Suites de los módulos tocados más las vigiladas: `cd backend; npx vitest run <73 rutas: test/{muro,recursos,archivos,gestion,cola,clases,bloqueo,lecturas,worker,sesiones-y-cadena,arquitectura,hilo-01c,temas-01a,entregas-01b-r1,calificaciones-estatico,arranque,logs-archivos,borrado,duplicado,copias,colas-objetos,guarda,sexto,db-cliente,servicio-ocupado,higiene}*, src/workers/ritmo-03c-r1.ataque.test.ts, src/adapters/storage, src/core>` → `Tests  1 failed | 1426 passed (1427)` (`Test Files  1 failed | 120 passed (121)`). La única roja es ADM-1A09 (a), la de la PARADA. C-3, C-4 y C-5 pasaron a verde.
- PA-07 sobre esa corrida: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 3 · `"code":"P2028"` 3.
  - Los 3 «Error no controlado» son los `ZodError` "La URL del almacén debe ser http o https" que provocan las propias pruebas de URL del almacén (los mismos de 01a).
  - Los 3 `P2028` son de `servicio-ocupado` ("Error controlado del servidor").
  - Ninguno viene de 01b.
- `build` de los tres paquetes y la suite del frontend no los corrí en esta reanudación: la PARADA llegó antes. El frontend ya estaba en verde tras el cambio de `shared/` (sección anterior), y `shared/` no cambió después.

**Conteos:** `npx vitest list` de los nueve archivos de pruebas de 01b (`src/core/clases/borrado.test.ts`, `src/core/clases/duplicado.test.ts`, `src/adapters/storage/objetos.test.ts` y los seis nuevos de `test/`) da 46 casos con "ADM-1B", contados con `grep -a -c "ADM-1B"`.

**Pruebas requeridas (archivo y título exacto):**
- ADM-1B01: los 11 títulos de la sección anterior.
- ADM-1B02 → `test/borrado-de-clase.integracion.test.ts`: "ADM-1B02: alumnos activos, actividades, entregas con fecha, calificaciones y archivos confirmados; lo demás no cuenta".
- ADM-1B03 → ídem: "ADM-1B03: sin confirmar → 409 CONFIRMACION_REQUERIDA y nada borrado; confirmar=otra → 400 VALIDACION; de una activa → 409 CLASE_NO_ARCHIVADA".
- ADM-1B04 → ídem: "ADM-1B04: 204; la clase y sus filas hijas desaparecen; sus movimientos también y los de otra clase siguen; los usuarios siguen; sus recordatorios quedan cancelados; BORRAR_OBJETOS lleva todas sus claves (también pendientes y descartadas) y ninguna de otra clase"; "ADM-1B04 (lotes): una clase con 1 001 archivos encola dos trabajos de BORRAR_OBJETOS, de 1000 y de 1 clave".
- ADM-1B05 → ídem: "ADM-1B05: la cascada no falla con una fila en cada tabla hija (categoría con tarea, tema con recurso, rúbrica, entrega calificada con puntajes, archivos de entrega y de publicación, comentarios del muro y del hilo, duda con respuesta, maestros, inscripciones y movimientos)".
- ADM-1B06 → ídem: "ADM-1B06: una copia en curso dentro de la clase, o una de otra clase que apunta a un archivo de esta → 409 CLASE_CON_COPIAS_EN_CURSO y nada borrado".
- ADM-1B07 → `test/borrado-duplicado-autorizacion.integracion.test.ts`: "ADM-1B07: sin token 401; estudiante y maestro de la clase 403 ROL_NO_PERMITIDO; restringido 403 ACCESO_RESTRINGIDO; clase inexistente 403 SIN_ACCESO_A_LA_CLASE; nada borrado ni creado; sin estado de pago en las respuestas del admin".
- ADM-1B08 → `test/duplicado-de-clase.integracion.test.ts`: "ADM-1B08: copia nombre, descripción, temas, categorías, recursos de aprendizaje con sus archivos (copia_de = original); no copia maestros, alumnos, movimientos, anuncios, tareas, recursos del docente, comentarios, dudas ni calificaciones; nace activa con otro código, también desde una archivada; encola COPIAR_OBJETOS"; "ADM-1B08 (lotes): 101 archivos de recursos de aprendizaje se copian en dos trabajos de COPIAR_OBJETOS, de 100 y de 1".
- ADM-1B09 → ídem: "ADM-1B09: 0, 3 o repetidos en maestroIds y un nombre inválido → 400; un maestro inactivo o un estudiante → 404 MAESTRO_NO_ENCONTRADO; nada creado".
- ADM-1B10 → ídem: "ADM-1B10: con el borrado primero en la fila: borrado (204) y después el duplicado responde 403, sin copia huérfana"; "ADM-1B10: con el duplicado primero en la fila: duplicado (201) y después el borrado responde 409 CLASE_CON_COPIAS_EN_CURSO; la original sigue".
- ADM-1B11 → `test/worker-objetos.integracion.test.ts`: "ADM-1B11: copia y limpia copia_de; repetir el trabajo no vuelve a copiar"; "ADM-1B11: original sin objeto (borrado o descartado) o el almacén dice «origen inexistente» → la copia queda descartada sin publicación"; "ADM-1B11: un error transitorio del almacén lanza y deja copia_de; sin almacén, el trabajo falla con un error controlado"; "ADM-1B11 (por pg-boss, colas propias): un trabajo que agota sus reintentos pasa a la cola de fallidos con sus datos y su consumidor descarta las copias".
- ADM-1B12 → ídem: "ADM-1B12: borra las claves; repetirlo no falla; un error del almacén lanza".
- ADM-1B13 → `test/duplicado-de-clase.integracion.test.ts`: "ADM-1B13: la descarga de un archivo con copia en curso → 409 ARCHIVO_EN_COPIA para el maestro y el admin; terminada la copia → 200".
- ADM-1B14 → `test/copias-de-archivos-migracion.integracion.test.ts`: "ADM-1B14: el CHECK rechaza copia_de en un archivo pendiente o descartado y lo admite en uno confirmado"; "ADM-1B14: borrar un archivo que otro tiene en copia_de falla (FK RESTRICT)"; "ADM-1B14: los índices de copia_de, (clase_id, estado) y (clase_id, secuencia DESC) existen".
- ADM-1B15 → `src/adapters/storage/objetos.test.ts`: "ADM-1B15: copiar llama a copyObject en el bucket privado con el origen en ese bucket y responde copiado"; "ADM-1B15: NoSuchKey (o NotFound) del origen se traduce a origen_inexistente; otro error, a 503 sin llaves"; "ADM-1B15: borrar llama a removeObjects con las claves; una lista vacía no llama; un error del almacén o de una clave lanza".
- ADM-1B16 → `test/colas-objetos.integracion.test.ts`: "ADM-1B16: cancelarVarios cancela la lista dentro de la transacción; si la transacción se revierte, los trabajos siguen vivos; los que no están en la lista no se tocan"; "ADM-1B16: enTransaccion con timeout lo respeta (expira con 503 SERVICIO_OCUPADO o aguanta más de 5 s) y sin él sigue en 5 s".
- ADM-1B17 → `test/duplicado-de-clase.integracion.test.ts`: "ADM-1B17: borrar el recurso de la copia con su archivo en copia → 204, el archivo queda descartado sin publicación y con copia_de nulo; el worker después no lo copia ni lo toca". La ruta real responde `204`, no `200`.
- ADM-1B18 → ídem: "ADM-1B18: editar el recurso de la copia quitándole el adjunto en copia → 200, el mismo resultado que ADM-1B17".
- ADM-1B19 → ídem: "ADM-1B19: duplicar una clase con copias en curso → 409 CLASE_CON_COPIAS_EN_CURSO sin crear nada; cuando el worker termina, duplicarla funciona y sus copias apuntan a objetos que existen".
- ADM-1B20 → ídem: "ADM-1B20: la copia conserva el orden de las categorías (GET …/categorias) y de los recursos de cada tema y de «Sin tema» (GET …/recursos), también con creado_en repetidos en la original".
- ADM-1B21 → `test/worker-objetos.integracion.test.ts`: "ADM-1B21: con 3 copias y el almacén fallando en la segunda, la primera queda terminada y el trabajo lanza; el reintento copia solo la segunda y la tercera; una lectura y, como máximo, dos UPDATE por intento, ninguno dentro del ciclo". El contador envuelve las tres funciones de `adapters/db`, cada una de una sola sentencia, y registra cuántas copias del almacén había hecho al llamarlas.
- ADM-1B22 → ídem: "ADM-1B22: recibe los archivoIds en datos y descarta solo esas copias pendientes; un datos fuera del esquema se registra en warn y completa sin tocar nada".
- ADM-1B23 → `test/borrado-de-clase.integracion.test.ts`: "ADM-1B23: los trabajos de BORRAR_OBJETOS nacen diferidos entre 10 min y 10 min + 5 s después del borrado, y un archivo pendiente de la clase está entre sus claves".
- ADM-1B24 → `test/duplicado-de-clase.integracion.test.ts`: "ADM-1B24: duplicar y después borrar definitivamente la original deja la copia intacta (con la copia en curso el borrado responde 409; terminada, 204; la copia sigue confirmada, con su objeto y su descarga 200; BORRAR_OBJETOS solo lleva las claves de la original)". Cubre (a) a (e) y lo que pidió el manager:
  - N-28: `copia_de` y un solo trabajo de `COPIAR_OBJETOS`, comprobados justo después del `201` y antes de archivar.
  - N-29: el consumidor se llama directo, sin registrar ninguno en las colas reales.
  - N-30: que las claves de la original no estén vacías, que exista un trabajo de borrado y que el objeto original esté en el almacén antes del consumidor.
  - La descarga `200` comprueba la clave firmada.

**N-29 en todo 01b:** ninguna prueba registra un consumidor con `COPIAR_OBJETOS` ni con `BORRAR_OBJETOS`. `duplicado-de-clase` llama directo a `procesarCopiaDeObjetos` y `procesarBorradoDeObjetos`. `worker-objetos` usa las colas propias `PRUEBA_COPIAR_OBJETOS`, `PRUEBA_BORRAR_OBJETOS` y `PRUEBA_COPIAR_OBJETOS_FALLIDO`. `colas-objetos` usa `PRUEBA_CANCELAR_VARIOS`.

**N-18:** todas las clases de las pruebas nuevas tienen uno o dos maestros. ADM-1B08 duplica con dos y ninguna prueba suma un tercero.

**V-01:** `sha256sum -c` sobre la tabla de la ronda 0 de 01b (251 líneas): sin diferencias. `git ls-files` lista 251 `*.ataque` y no hay ninguna sin rastrear.

**"No se toca" contra `69057f7`:** `git diff --name-only 69057f7 -- backend frontend shared` más los no rastreados solo listan archivos de "Se toca" de 01b, E6 de la lista cerrada, C-3 a C-5 del tester y pruebas o ayudas nuevas. No cambian `workers/index.ts`, `config/`, `middleware/` ni `app.ts`.

**Vigiladas de §D-R0 01b, en verde en esa corrida:**
- `arquitectura-cuentas-r1` y `hilo-01c-r1`.
- `muro-c-r1`: ningún archivo nuevo nombra las colas de avisos; `gestion.ts` importa `COLA_RECORDATORIO_24H`, que no está en su patrón.
- `temas-01a-r1` y `temas-01a-r3`.
- `entregas-01b-r1`.
- `lecturas-fx-r2:1072-1108`.
- `calificaciones-estatico-01a-r1` (CAL-T-20).
- `worker-r1`, `worker-r2` y `worker-03c-r1`.
- `ritmo-03c-r1`.
- `arranque-r1`.
- Las pruebas de muro y recursos.

**Decisiones donde el plan calla (además de las de la sección anterior):**
1. `borrarClaseDefinitivamente` recibe además `confirmado`, porque `decidirBorrado` decide la confirmación dentro de la transacción.
2. Las colas de fallidos nuevas no fijan `retryLimit`: queda el de pg-boss por omisión, como `AVISO_FALLIDO`.
3. `procesarCopiaDeObjetos` acepta el repositorio como tercer parámetro, con las funciones reales por omisión, para que ADM-1B21 cuente las sentencias.
4. Con datos inválidos, `COPIAR_OBJETOS` y `BORRAR_OBJETOS` registran `error` y completan, como `CORREO_DE_CUENTA`.
5. Sin almacén, los trabajos lanzan `503 ALMACEN_NO_CONFIGURADO`.
6. El duplicado reintenta el código de invitación con su propio `conReintentoDeCodigo`, una copia del de `clases.ts`: ese archivo no está en "Se toca" de 01b.
7. Con la FK `RESTRICT`, la fila de un original nunca desaparece mientras tiene una copia en curso. Por eso el caso "original borrado" de ADM-1B11 se prueba con el original descartado y sin objeto en el almacén. El `LEFT JOIN` cubre igual la fila ausente.

**Hermanos** (estados del mecanismo de copia y borrado):
- Copia en curso: la detectan la descarga de la clase (409), el borrado de esta clase o de otra con originales aquí (409) y el duplicado de una clase con copias (409). Las descargas de entregas no aplican, porque una entrega nunca es copia.
- Descartes: borrar la publicación y editar el recurso (los dos con `copiaDe: null`). Los descartes de `tareas.ts` y `entregas.ts` no aplican.
- Worker de copias: primera vez, repetición, fallo a mitad, sin origen, sin almacén y fallidos. Todos cubiertos.
- Claves del borrado: archivos confirmados, pendientes, descartados y de entregas. Todos incluidos.

### Cierre del paso 13 tras la Enmienda 7 (2026-11-05)

**Estado: 01b completa** (pasos 8 a 13). Plan vigente: SHA-256 `4f46a1a6bb59bdab789eef4b7fb693c5b6f43a22d7e38c86e1364b0470b2a6c1` (Enmiendas 1 a 7), comprobado al reanudar. La PARADA de ADM-1A09 (a) quedó resuelta con E7-1. Lo que dice la sección "Reanudación" de arriba sigue valiendo (archivos, pruebas requeridas con su título exacto, decisiones y hermanos). Abajo, lo nuevo y las cifras finales.

**E7-1, aplicado tal cual:** en `backend/test/clases-archivadas-matriz.integracion.test.ts`, después de la línea 61, entran las cuatro líneas de la enmienda (el comentario de ADMIN-01b y las tres entradas `"gestion"`) y nada más. `git diff -U0` muestra un solo hunk `@@ -61,0 +62,4 @@`. `cd backend; npx vitest run test/clases-archivadas-matriz.integracion.test.ts` → `Tests  5 passed (5)`. El caso (a) pasa con las 88 rutas que antes daba de más: las 84 de 01a más `GET`, `HEAD`, `DELETE` y `POST` de 01b.

**Red (PA-01, N-27):** `IZZI-F281-5G`, perfil Público, regla "Campus: bloquear entrada a Docker en redes publicas" habilitada. La otra copia de trabajo no se usa (lo respondió el humano).

**Verificación final (comando exacto y última línea), una corrida después de otra:**

| Paquete | Comando | Última línea |
|---|---|---|
| backend | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0) |
| backend | `cd backend; npx vitest run <73 rutas de test/ (muro, recursos, archivos, gestion, cola, clases, bloqueo, lecturas, worker, sesiones-y-cadena, arquitectura, hilo-01c, temas-01a, entregas-01b-r1, calificaciones-estatico, arranque, logs-archivos, borrado, duplicado, copias, colas-objetos, guarda, sexto, db-cliente, servicio-ocupado, higiene)> src/workers/ritmo-03c-r1.ataque.test.ts src/adapters/storage src/core` | `Tests  1427 passed (1427)` (`Test Files  121 passed (121)`) |
| backend | `cd backend; npm run build` | `> tsc -p tsconfig.json` (exit 0) |
| shared | `cd shared; npm run build` | `> tsc -p tsconfig.json` (exit 0) |
| shared | `cd shared; npm run lint` | `All matched files use Prettier code style!` |
| frontend | `cd frontend; npm run lint` | `> tsc -b` (exit 0) |
| frontend | `cd frontend; npm run build` | `✓ built in 1.26s` |
| frontend | `cd frontend; npx vitest run src/lib/errores-ch3-r2.ataque.test.ts` (la única prueba del frontend que lee `shared/src`) | `Tests  84 passed (84)` |
| prisma | `npx prisma validate` · deriva E1-11 | `The schema at prisma\schema.prisma is valid` · `No difference detected.` (exit 0) |

La suite completa del backend y la del frontend no las corrí: las corre el manager al cerrar la subentrega (CHORE-05).

**PA-07, sobre la corrida de módulos:**
- `40P01`: 0
- `deadlock detected`: 0
- `could not serialize`: 0
- `too many clients`: 0
- `"Error no controlado"`: 3. Son los `ZodError` "La URL del almacén debe ser http o https" que provocan a propósito las pruebas de ataque de URL del almacén; son los mismos de 01a.
- `"code":"P2028"`: 3. Los provoca `servicio-ocupado` y salen como "Error controlado del servidor".
- Ninguno viene de 01b.

**Conteos:**
- `cd backend; npx vitest list src/core/clases/borrado.test.ts src/core/clases/duplicado.test.ts src/core/eventos/objetos.test.ts src/core/archivos/objetos.test.ts src/adapters/storage/objetos.test.ts test/borrado-de-clase.integracion.test.ts test/duplicado-de-clase.integracion.test.ts test/borrado-duplicado-autorizacion.integracion.test.ts test/worker-objetos.integracion.test.ts test/colas-objetos.integracion.test.ts test/copias-de-archivos-migracion.integracion.test.ts` da 51 casos (`grep -a -c " > "`) en 11 archivos (`grep -a " > " | cut -d' ' -f1 | sort -u | wc -l`). De ellos, 46 llevan "ADM-1B" (`grep -a -c "ADM-1B"`). Los otros 5 son pruebas propias de `core/eventos/objetos.ts`, de `core/archivos/objetos.ts` y de la política de las colas.
- ADM-1A09: 5 casos, en la corrida de arriba.

**Pruebas requeridas:** ADM-1B01 a ADM-1B24, todas cubiertas, con su archivo y título exacto en las dos secciones anteriores (ADM-1B01 en la primera; ADM-1B02 a ADM-1B24 en "Reanudación"). Ninguna viñeta queda sin caso.

**Lista cerrada de 01b aplicada:**
- E6 de `bloqueo-usuario.integracion.test.ts` (E4-4). La lista final de archivos con SQL etiquetado es `bloqueo-maestros.ts`, `borrado-de-clase.ts`, `duplicado-de-clase.ts` y `copias-de-archivos.ts`.
- ADM-1A09 en `clases-archivadas-matriz.integracion.test.ts` (E7-1).
- Ninguna otra prueba normal cambió.

**V-01:** `sha256sum -c` sobre la tabla de la ronda 0 de 01b (251 líneas) no da diferencias. `git ls-files` lista 251 `*.ataque`, ninguna sin rastrear, y no toqué ninguna.

**"No se toca" contra `69057f7`** (`git diff --name-only 69057f7` más los no rastreados, fuera de `docs/trabajo/ADMIN-01-administracion/` y `docs/ESTADO.md`):
- **Dentro de los paquetes**, solo aparecen:
  - archivos de "Se toca" de 01b: `shared/src/clases.ts` e `index.ts`, `schema.prisma` y la migración, `core/` nuevos, `adapters/db/{archivos,cliente,index,publicaciones,recursos}.ts` y sus nuevos, `adapters/queue/{index,colas}.ts`, `adapters/storage/index.ts`, `handlers/clases/gestion.ts`, `handlers/archivos.ts`, `worker.ts`, `workers/objetos.ts` y los tres README;
  - las dos pruebas de la lista cerrada;
  - C-3 a C-5 del tester;
  - pruebas y ayudas nuevas.
- **Fuera de los paquetes**, aparecen `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md` y `docs/trabajo/CHORE-05-proceso-suites/aprobacion.md`. Vienen de la fusión `68242f3` (CHORE-05): sin cambios desde ese commit y con los SHA-256 anotados en `aprobacion.md` (`5b818b82…`, `b5cde043…`, `92bd117a…`, `41a4fa3e…`, `b1d0965c…`, `f33831f0…`).
- **Archivo ajeno sin rastrear:** `docs/trabajo/DEPLOY-investigacion-vps.md`.
- No cambiaron `workers/index.ts`, `config/`, `middleware/`, `app.ts` ni `infra/`.

**Decisiones donde el plan calla:** las siete de "Reanudación" y las cinco de la primera sección. E7-1 no agrega ninguna.

**Hermanos:** los de "Reanudación". Para E7-1, el hermano es la tabla de §D-1 de cada prueba que enumera rutas con `:claseId`:
- C-3 de `sesiones-y-cadena.ataque` ya sumaba las cuatro rutas (lo hizo el tester).
- `clases-archivadas-r1.ataque` (ADM-T1A09) las lee de `printRoutes` sin tabla propia.
- El grep de `printRoutes` en `backend/test` da además `gestion-clases-autorizacion.integracion`, `recursos-autorizacion.integracion` y `movimientos-inscripcion.integracion` (y la ayuda `ayudas-clases-archivadas.ts`). Ninguno lleva una tabla cerrada de rutas con `:claseId` que 01b rompa: `cd backend; npx vitest run test/movimientos-inscripcion.integracion.test.ts test/gestion-clases-autorizacion.integracion.test.ts test/recursos-autorizacion.integracion.test.ts` → `Tests  31 passed (31)` (`Test Files  3 passed (3)`). Los dos primeros ya estaban en la corrida de módulos; el tercero lo corrí aparte.

## ADMIN-01b — Corrección ronda 1

Plan: SHA-256 `4f46a1a6bb59bdab789eef4b7fb693c5b6f43a22d7e38c86e1364b0470b2a6c1` (Enmiendas 1 a 7). Reporte: `reporte-tester.md`, "## Ronda 1 — ADMIN-01b". No toqué ninguna `*.ataque`.

### T-01 (alta) — corregido

- **Remedio en `backend/src/adapters/storage/index.ts`:**
  - `ClienteDeObjetos.removeObjects` devuelve `Promise<unknown[]>`, ya no la forma de los tipos de `minio`.
  - La nueva `codigoDeErrorDeBorrado(resultado)` lee las dos formas de un error por clave: la real de `minio` 8.0.7, `{ Key, Code, Message }` (la que arma `removeObjectsParser`), y la de sus tipos, `{ Error: { Code } }`.
  - `null` o `undefined` no es error. Cualquier otro objeto sí lo es, también uno sin código reconocible: con `Quiet`, la respuesta solo trae errores, así que nunca se lee como éxito.
  - `borrar` lanza `503 ALMACEN_NO_DISPONIBLE` (el error transitorio de §D-4, sin URL, llave ni secreto) si queda algún error por clave. pg-boss reintenta el lote completo, y como borrar lo ya borrado no falla, el reintento es seguro.
- **Clave que ya no existe (decisión):** `NoSuchKey` o `NotFound` por clave, en cualquiera de las dos formas, no es error. El borrado es idempotente. Si viene junto a otro error, el lote igual lanza.
- **ADM-1B15** (`backend/src/adapters/storage/objetos.test.ts`). Título nuevo: "ADM-1B15: borrar llama a removeObjects con las claves; una lista vacía no llama; un error del almacén o de una clave (forma real de minio y forma de sus tipos) lanza; una clave inexistente no". Su doble ahora usa las dos formas y cubre:
  - `NoSuchKey` y `NotFound`, que resuelven;
  - `AccessDenied` e `InternalError` en todas las claves y en una de dos, que lanzan sin el secreto;
  - un elemento sin código, que lanza;
  - `NoSuchKey` junto a `AccessDenied`, que lanza;
  - `[null, undefined]`, que resuelve;
  - y, como antes, la lista vacía (no llama) y el error global (503).
- `objetos-r1.ataque` (ADM-T1B01, ADM-T1B01b y ADM-T1B02, con el cliente real de `minio`) pasa: `cd backend; npx vitest run src/adapters/storage` → `Tests  9 passed (9)`.

**Hermanos: cada llamada a `minio` en `adapters/storage`.**

| Llamada | ¿Usa la forma de los tipos? | ¿Le aplica el remedio? |
|---|---|---|
| `removeObjects` (`borrar`) | Sí, ese era el hallazgo | Aplicado |
| `copyObject` (`copiar`) | No: el valor de retorno no se usa. Un error llega como excepción `S3Error` y se lee su `code`, que sí existe en ejecución (lo comprueba ADM-T1B02 con el cliente real) | No aplica |
| `statObject` (`metadatosDe`) | Lee `size` y `metaData`, que el cliente arma él mismo. El ausente se reconoce por el `code` de la excepción | No aplica (lo comprueba la prueba existente "metadatosDe…" con el cliente real contra un servidor local) |
| `presignedPutObject` y `presignedGetObject` | Devuelven una cadena firmada en local, sin respuesta del almacén | No aplica |
| `esObjetoAusente` | Lee `error.code` de la excepción, real en `S3Error` | No aplica |

**Estados vecinos de `borrar`:**
- Lote vacío: no llama al almacén (ADM-1B15).
- Todas las claves con error: lanza (ADM-1B15, ADM-T1B01).
- Algunas claves con error: lanza (ADM-1B15, ADM-T1B01).
- Error global, como un `403`: `removeObjects` lanza y se traduce a 503 sin secretos (ADM-1B15 con `ECONNRESET`, ADM-T1B01b con `403`).
- Clave inexistente: resuelve (ADM-1B15, ADM-T1B01).
- Reintento después de un fallo parcial: pg-boss repite el trabajo con las mismas claves; las ya borradas no dan error en S3, o dan `NoSuchKey`, que se ignora, y las que fallaron se vuelven a pedir. Lo cubre la idempotencia probada en ADM-1B12 y ADM-1B15. El worker no cambia: `procesarBorradoDeObjetos` deja propagar el error.

### T-02 (baja) — corregido

- **ADM-1B23** (`backend/test/borrado-de-clase.integracion.test.ts`). Título nuevo: "ADM-1B23: los trabajos de BORRAR_OBJETOS nacen diferidos 10 min (entre 10 min después de pedir el borrado y 10 min después de su respuesta), y un archivo pendiente de la clase está entre sus claves".
  - Toma `antes = Date.now()` antes del `DELETE` y `despues = Date.now()` al volver la respuesta, y exige `antes + 600 000 ≤ start_after ≤ despues + 600 000`.
  - Sin tolerancia: la API y la prueba comparten proceso y reloj, y pg-boss guarda la fecha con precisión de milisegundos o más.
  - Ya no hay cota fija de 5 s. Es la variante de N-20 de 01a.
- **Hermanos (mis pruebas de 01b que miden contra la hora real):**
  - ADM-1B16 (`test/colas-objetos.integracion.test.ts`), el caso de `timeout`:
    - los dos que esperan un `503` (`pg_sleep(1.5)` con `timeout` de 500 ms, y `pg_sleep(5.5)` sin opción contra los 5 s de Prisma) solo pueden tardar más, así que la carga no los rompe;
    - el que espera éxito (`pg_sleep(5.5)` con `timeout`) sí dependía del margen: lo subí de 9 000 a 15 000 ms, y el límite del caso de 20 s a 30 s.
  - `colas-objetos`, `encolarDiferido`: `inicio` a una hora en el futuro, solo para que el trabajo siga vivo. No mide nada.
  - `worker-objetos`, `esperarHasta`: espera hasta 25 s una condición, no una duración.
  - ADM-1B20: fechas fijas, sin reloj.
  - No quedan otras.

### Verificación (comando literal y última línea)

Red (PA-01): `IZZI-F281-5G`, perfil Público, regla del firewall habilitada. Puerta de carga: CPU 13 % y 7 % (y 13 % y 17 % antes de la segunda corrida), sin ningún `node` corriendo antes; no terminé ningún proceso. Sin otra copia de trabajo. Corridas una tras otra.

- `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0).
- `cd backend; npx vitest run src/adapters/storage` → `Tests  9 passed (9)`.
- Suite de módulos con las dos `*.ataque` nuevas. Comando literal, desde `backend/`:

  `npx vitest run test/archivos-autorizacion.integracion.test.ts test/archivos-d-r1.ataque.test.ts test/archivos-d-r2.ataque.test.ts test/archivos.integracion.test.ts test/arquitectura-cuentas-r1.ataque.test.ts test/arranque-r1.ataque.test.ts test/bloqueo-usuario.integracion.test.ts test/borrado-de-clase.integracion.test.ts test/borrado-duplicado-autorizacion.integracion.test.ts test/borrado-duplicado-r1.ataque.test.ts test/calificaciones-estatico-01a-r1.ataque.test.ts test/calificaciones-estatico-01b-r1.ataque.test.ts test/calificaciones-estatico.test.ts test/clases-archivadas-matriz.integracion.test.ts test/clases-archivadas-migracion.integracion.test.ts test/clases-archivadas-posicion.integracion.test.ts test/clases-archivadas-r1.ataque.test.ts test/clases-archivadas-r2.ataque.test.ts test/clases-archivadas.integracion.test.ts test/clases-autorizacion.integracion.test.ts test/clases-r1.ataque.test.ts test/clases-r2.ataque.test.ts test/clases-r3.ataque.test.ts test/clases-r4.ataque.test.ts test/clases.integracion.test.ts test/cola.integracion.test.ts test/colas-objetos.integracion.test.ts test/copias-de-archivos-migracion.integracion.test.ts test/db-cliente.test.ts test/duplicado-de-clase.integracion.test.ts test/entregas-01b-r1.ataque.test.ts test/gestion-02a-r1.ataque.test.ts test/gestion-clases-autorizacion.integracion.test.ts test/gestion-clases.integracion.test.ts test/guarda-ch-r1.ataque.test.ts test/guarda-ch-r2.ataque.test.ts test/guarda-ch-r3.ataque.test.ts test/guarda-clase-r1.ataque.test.ts test/guarda-clase-r2.ataque.test.ts test/guarda-clase.integracion.test.ts test/guarda-r2.ataque.test.ts test/guarda-todas-las-rutas.integracion.test.ts test/higiene-de-pruebas.integracion.test.ts test/hilo-01c-r1.ataque.test.ts test/lecturas-consistentes.integracion.test.ts test/lecturas-fx-r1.ataque.test.ts test/lecturas-fx-r2.ataque.test.ts test/logs-archivos-d-r1.ataque.test.ts test/logs-archivos-d-r3.ataque.test.ts test/movimientos-inscripcion.integracion.test.ts test/muro-admin.integracion.test.ts test/muro-autorizacion.integracion.test.ts test/muro-c-r1.ataque.test.ts test/muro-c-r2.ataque.test.ts test/muro.integracion.test.ts test/recursos-autorizacion.integracion.test.ts test/recursos-clases03a-r1.ataque.test.ts test/recursos-clases03a-r2.ataque.test.ts test/recursos-filtros.integracion.test.ts test/recursos.integracion.test.ts test/servicio-ocupado-ch-r1.ataque.test.ts test/servicio-ocupado.integracion.test.ts test/sesiones-y-cadena.ataque.test.ts test/sexto-paso-02a-r1.ataque.test.ts test/temas-01a-r1.ataque.test.ts test/temas-01a-r3.ataque.test.ts test/worker-03c-r1.ataque.test.ts test/worker-consumidor.integracion.test.ts test/worker-correo-de-cuenta.integracion.test.ts test/worker-objetos.integracion.test.ts test/worker-r1.ataque.test.ts test/worker-r2.ataque.test.ts src/workers/ritmo-03c-r1.ataque.test.ts src/adapters/storage src/core`

  - **Primera corrida:** `Tests  1 failed | 1445 passed (1446)` · `Test Files  1 failed | 123 passed (124)`. La roja fue **ADM-1A11** (`test/clases-archivadas.integracion.test.ts`, de 01a y fuera de la lista cerrada), con `expected 28 to be greater than or equal to 29` en su ayuda `entre(activas.cuerpo.total, activas.antes.activas, activas.despues.activas)` (`:463`, llamada en `:499`).
  - Sola, `npx vitest run test/clases-archivadas.integracion.test.ts` → `Tests  14 passed (14)`.
  - **Segunda corrida**, el mismo comando, sin cambiar nada: `Tests  1446 passed (1446)` · `Test Files  124 passed (124)`.
- `cd backend; npm run build` → `> tsc -p tsconfig.json` (exit 0).

**Observación sobre ADM-1A11 (no la toqué; la decide el manager).** Esa ayuda supone que el número de clases activas de toda la base solo sube o solo baja mientras el caso pide la lista: pone el `total` entre el conteo de antes y el de después. Con los demás archivos corriendo en paralelo, una clase activa que se borra (las limpiezas `afterAll` de cualquier archivo) y otra que se crea en la misma ventana (cualquier `crearClaseDePrueba`, un duplicado o un restaurar) dejan el `total` fuera de los dos conteos, aunque la respuesta sea correcta. Es una fragilidad de la prueba de 01a, intermitente. Puede pasar más seguido con 01b, que suma duplicados y la `*.ataque` del tester que restaura y borra a la vez. No es un fallo del código. No la cambié: está fuera de la lista cerrada y es una prueba normal, así que la reporto como PARADA para que el manager decida si la acota (por ejemplo, contando solo un rango de `creado_en` propio) o la acepta como está.

**PA-07** (segunda corrida; la primera da las mismas cifras):
- `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0.
- `"Error no controlado"` 3: los tres son los `ZodError` "La URL del almacén debe ser http o https" que provocan a propósito las pruebas de ataque (inventario de 01a).
- `"code":"P2028"` 3: de `servicio-ocupado`.
- Ninguno viene de 01b.

**V-01:** las 251 `*.ataque` de la tabla de la ronda 0 pasan `sha256sum -c` sin diferencias. Las dos nuevas del tester coinciden: `objetos-r1.ataque` `65c1d9d9…` y `borrado-duplicado-r1.ataque` `3520057d…`. En el árbol hay 253 (`find backend frontend -name "*.ataque.test.ts*"`).

**N-18 y N-29:** esta corrección no crea pruebas que hagan clases ni que registren consumidores.

**Archivos cambiados en esta ronda:** `backend/src/adapters/storage/index.ts`, `backend/src/adapters/storage/objetos.test.ts`, `backend/test/borrado-de-clase.integracion.test.ts` y `backend/test/colas-objetos.integracion.test.ts`.

### Enmienda 8

Plan: SHA-256 `e539dbcd877f0da7b2e895dff4d8ac099d400ca1fadd66d9f7b36d0a1838b183` (Enmiendas 1 a 8). Apliqué exactamente E8-1 (ADM-1A11) y E8-2 (PR-2A12), con el texto del plan y sin tocar ninguna otra línea de esos dos archivos. Prettier no cambió nada. No toqué ninguna `*.ataque`; `gestion-02a-r1.ataque:793-799` queda para el tester.

**`git diff -U0` de los dos archivos:**

```diff
diff --git a/backend/test/clases-archivadas.integracion.test.ts b/backend/test/clases-archivadas.integracion.test.ts
index c55398c..b3a21cc 100644
--- a/backend/test/clases-archivadas.integracion.test.ts
+++ b/backend/test/clases-archivadas.integracion.test.ts
@@ -13,2 +13,2 @@ import { afterAll, beforeAll, describe, expect, it } from "vitest"
-import { obtenerDb } from "../src/adapters/db/cliente.js"
-import { editarClase } from "../src/adapters/db/index.js"
+import { enTransaccion, obtenerDb } from "../src/adapters/db/cliente.js"
+import { editarClase, listarClasesAdmin } from "../src/adapters/db/index.js"
@@ -454 +453,0 @@ describe("GET /admin/clases?estado= (ADM-1A11)", () => {
-    const contar = (where: object) => obtenerDb().clase.count({ where })
@@ -456 +454,0 @@ describe("GET /admin/clases?estado= (ADM-1A11)", () => {
-      const antes = { activas: await contar({ archivadaEn: null }), todas: await contar({}) }
@@ -458 +455,0 @@ describe("GET /admin/clases?estado= (ADM-1A11)", () => {
-      const despues = { activas: await contar({ archivadaEn: null }), todas: await contar({}) }
@@ -460 +457 @@ describe("GET /admin/clases?estado= (ADM-1A11)", () => {
-      return { cuerpo: listaClasesAdminRespuestaSchema.parse(respuesta.json()), antes, despues }
+      return { cuerpo: listaClasesAdminRespuestaSchema.parse(respuesta.json()) }
@@ -462,3 +459,13 @@ describe("GET /admin/clases?estado= (ADM-1A11)", () => {
-    const entre = (valor: number, a: number, b: number) => {
-      expect(valor).toBeGreaterThanOrEqual(Math.min(a, b))
-      expect(valor).toBeLessThanOrEqual(Math.max(a, b))
+    // Enmienda 8: otros archivos crean, archivan, restauran, duplican y borran clases a la vez, así
+    // que el total no se compara con conteos hechos fuera de su instantánea. El de una primera página
+    // sale de la misma que sus filas (FIX-CLASES): igual a ellas sin página siguiente, mayor con ella.
+    const totalDeLaPrimeraPagina = (cuerpo: {
+      clases: readonly unknown[]
+      total: number
+      siguienteCursor: string | null
+    }) => {
+      if (cuerpo.siguienteCursor === null) {
+        expect(cuerpo.total).toBe(cuerpo.clases.length)
+        return
+      }
+      expect(cuerpo.total).toBeGreaterThan(cuerpo.clases.length)
@@ -477,5 +484 @@ describe("GET /admin/clases?estado= (ADM-1A11)", () => {
-    entre(
-      archivadas.cuerpo.total,
-      archivadas.antes.todas - archivadas.antes.activas,
-      archivadas.despues.todas - archivadas.despues.activas,
-    )
+    totalDeLaPrimeraPagina(archivadas.cuerpo)
@@ -499 +502 @@ describe("GET /admin/clases?estado= (ADM-1A11)", () => {
-    entre(activas.cuerpo.total, activas.antes.activas, activas.despues.activas)
+    totalDeLaPrimeraPagina(activas.cuerpo)
@@ -526 +529,27 @@ describe("GET /admin/clases?estado= (ADM-1A11)", () => {
-    entre(todas.cuerpo.total, todas.antes.todas, todas.despues.todas)
+    totalDeLaPrimeraPagina(todas.cuerpo)
+    // Enmienda 8: el total por estado (§D-2), contra conteos de la misma instantánea. La transacción
+    // de la prueba va en REPEATABLE READ y la lectura de la lista corre sobre ella (un enTransaccion
+    // anidado no abre otra): las seis sentencias, en serie, ven las mismas filas. Solo lee y no
+    // espera nada; el timeout explícito queda muy por encima de lo que dura.
+    const misma = await enTransaccion(
+      obtenerDb(),
+      async (tx) => {
+        const primera = { cursor: undefined, limite: 1 }
+        return {
+          activas: (await listarClasesAdmin({ ...primera, estado: "activas" }, tx)).total,
+          archivadas: (await listarClasesAdmin({ ...primera, estado: "archivadas" }, tx)).total,
+          todas: (await listarClasesAdmin(primera, tx)).total,
+          activasContadas: await tx.clase.count({ where: { archivadaEn: null } }),
+          archivadasContadas: await tx.clase.count({ where: { archivadaEn: { not: null } } }),
+          todasContadas: await tx.clase.count(),
+        }
+      },
+      { instantaneaUnica: true, timeout: 10_000 },
+    )
+    expect(misma.activas).toBe(misma.activasContadas)
+    expect(misma.archivadas).toBe(misma.archivadasContadas)
+    expect(misma.todas).toBe(misma.todasContadas)
+    expect(misma.activasContadas + misma.archivadasContadas).toBe(misma.todasContadas)
+    // La activa y las dos archivadas del caso están en la instantánea: el filtro separa algo.
+    expect(misma.activasContadas).toBeGreaterThanOrEqual(1)
+    expect(misma.archivadasContadas).toBeGreaterThanOrEqual(2)
diff --git a/backend/test/gestion-clases.integracion.test.ts b/backend/test/gestion-clases.integracion.test.ts
index 172a807..79b130f 100644
--- a/backend/test/gestion-clases.integracion.test.ts
+++ b/backend/test/gestion-clases.integracion.test.ts
@@ -13 +13,2 @@ import { afterAll, beforeAll, describe, expect, it } from "vitest"
-import { obtenerDb } from "../src/adapters/db/cliente.js"
+import { enTransaccion, obtenerDb } from "../src/adapters/db/cliente.js"
+import { listarClasesAdmin } from "../src/adapters/db/index.js"
@@ -353 +353,0 @@ describe("GET /api/admin/clases", () => {
-    const totalAntes = await obtenerDb().clase.count()
@@ -362,5 +362,16 @@ describe("GET /api/admin/clases", () => {
-    const totalDespues = await obtenerDb().clase.count()
-    // Otros archivos crean y borran clases a la vez: total queda entre los dos conteos, pero otras
-    // pruebas pueden mover la tabla en cualquier dirección, así que se acota por el mínimo y el máximo.
-    expect(cuerpo.total).toBeGreaterThanOrEqual(Math.min(totalAntes, totalDespues))
-    expect(cuerpo.total).toBeLessThanOrEqual(Math.max(totalAntes, totalDespues))
+    // Enmienda 8: otros archivos crean, duplican y borran clases a la vez; el total se comprueba
+    // contra sus filas (la misma instantánea, FIX-CLASES) y contra un conteo en la misma
+    // instantánea, nunca entre conteos hechos fuera de ella.
+    expect(cuerpo.total).toBeGreaterThanOrEqual(
+      cuerpo.clases.length + (cuerpo.siguienteCursor === null ? 0 : 1),
+    )
+    if (cuerpo.siguienteCursor === null) expect(cuerpo.total).toBe(cuerpo.clases.length)
+    const misma = await enTransaccion(
+      obtenerDb(),
+      async (tx) => ({
+        total: (await listarClasesAdmin({ cursor: undefined, limite: 1 }, tx)).total,
+        contadas: await tx.clase.count(),
+      }),
+      { instantaneaUnica: true, timeout: 10_000 },
+    )
+    expect(misma.total).toBe(misma.contadas)
```

**Red y carga.** PA-01: `IZZI-F281-5G`, perfil Público, regla del firewall habilitada. Puerta de carga antes de cada corrida (CPU en %, dos lecturas):
- Primera corrida de los dos archivos: 32/25. La corrí sin esperar una segunda lectura en 25 % o menos; lo declaro.
- Primera corrida de módulos: 21/31, 40/26 y 0/0.
- Corrida de `duplicado` y `archivos-d-r1`: 32/27, 33/37 y 19/20.
- Segunda corrida de módulos: 12/15.

Ningún `node` estaba corriendo antes y no terminé ningún proceso.

**E8-5, en orden (comando literal y última línea):**
1. `cd backend; npx vitest run test/clases-archivadas.integracion.test.ts test/gestion-clases.integracion.test.ts` → `Tests  35 passed (35)` (`Test Files  2 passed (2)`). Son 14 y 21 casos, los mismos de la línea base.
2. Suite de módulos con el comando literal de la corrección de la ronda 1 (arriba, en "Verificación"; incluye `objetos-r1.ataque` y `borrado-duplicado-r1.ataque`):
   - **Primera corrida:** `Tests  1 failed | 1445 passed (1446)` · `Test Files  1 failed | 123 passed (124)`. ADM-1A11 y PR-2A12 pasaron. La roja fue `test/archivos-d-r1.ataque.test.ts:1051` (caso "estudiante inscrito no solicita ni publica; … el admin solicita y descarga (C-9)"), con `expected 9 to be 8`.
   - **Causa:** esa `*.ataque`, anterior a ADMIN-01, cuenta las filas de `archivos` con `subidoPor` igual al admin único de la base (`:914-920`). Mis pruebas de `duplicado-de-clase.integracion` creaban archivos subidos por el admin (y el duplicado copia `subido_por`), y corren a la vez. Es la misma familia de fragilidad que E8-4: una lectura sin filtro propio del caso.
   - **Remedio, solo en mi prueba** (`backend/test/duplicado-de-clase.integracion.test.ts`, no en la `*.ataque`): los cinco archivos que subía el admin (en `originalCompleta`, ADM-1B08 lotes, ADM-1B10 `preparar` y `originalConUnArchivo`) los sube ahora el maestro de su clase, con un comentario que dice por qué. Ninguna aserción leía `subidoPor`, así que no cambia lo que prueban. Los recursos siguen siendo del admin, porque eso es lo que los hace de aprendizaje.
   - **Lo que no resuelve:** la `*.ataque` nueva del tester (`borrado-duplicado-r1:135`, `:451` y `:537`), `muro-admin.integracion` (`:289`, `:618`) y `admin-muro-02b-r1.ataque:506` también suben archivos como el admin. `archivos-d-r1` puede volver a fallar por ellos. Es una observación para el tester (igual que `gestion-02a-r1`); no la toco.
   - `cd backend; npx vitest run test/duplicado-de-clase.integracion.test.ts test/archivos-d-r1.ataque.test.ts` → `Tests  30 passed (30)` (`Test Files  2 passed (2)`).
   - **Segunda corrida de módulos**, el mismo comando: `Tests  1446 passed (1446)` · `Test Files  124 passed (124)`.
3. `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0).

**Las igualdades de la misma instantánea** (`misma.activas`, `misma.archivadas` y `misma.todas` contra sus conteos, en ADM-1A11, y `misma.total` contra `misma.contadas`, en PR-2A12) pasaron en las tres corridas. No hay defecto del adaptador.

**PA-07** (segunda corrida de módulos; la primera da las mismas cifras):
- `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0.
- `"Error no controlado"` 3: los tres son los `ZodError` "La URL del almacén debe ser http o https" que provocan las pruebas de ataque a propósito (inventario).
- `"code":"P2028"` 3: de `servicio-ocupado`.

**V-01:** las 251 de la tabla de la ronda 0 no tienen diferencias. Las dos del tester siguen igual: `objetos-r1` `65c1d9d9…` y `borrado-duplicado-r1` `3520057d…`. En el árbol hay 253.

**Archivos de esta entrega:** `backend/test/clases-archivadas.integracion.test.ts` (E8-1), `backend/test/gestion-clases.integracion.test.ts` (E8-2) y `backend/test/duplicado-de-clase.integracion.test.ts` (los archivos de mis pruebas, que ahora sube el maestro).

## ADMIN-01c — PARADA en el paso 14 (2026-11-05)

Plan: `docs/trabajo/ADMIN-01-administracion/plan.md`, SHA-256 `9e678ef4d34af4fa5990e396c0d1f13f941e303998b188240a42e9aa32556f26` (comprobado al empezar). Base dentro de los paquetes: `52f1c97`. Trabajo en paralelo: la otra copia no se usa (aprobacion.md). Sin navegadores.

### Qué pasó
El paso 14 pide `ARCHIVO_EN_COPIA` en `MENSAJES_POR_CODIGO_DE_ARCHIVO` (`components/adjuntos/data.ts`, §D-10 "Enmienda 1 (M-04)"), y la lista cerrada de 01c ya prevé su efecto en `reexportaciones-01c.test.ts:139-145`. Pero `features/clases/data.ts:286` esparce ese mapa en `MENSAJES_POR_CODIGO_DE_CLASES`, y **CH3-B01** (`features/clases/errores-ch3.test.ts:95-97`, prueba normal) compara sus claves con igualdad exacta contra `TEXTOS_FIJOS_DE_SIEMPRE` (`:45-60`). De `errores-ch3.test.ts`, la lista cerrada solo admite `:84` y CH3-B15 (1) a (3) ("Nada más del archivo cambia"). Con el diseño bien hecho, CH3-B01 cae: PARADA.

### Lo único que cambié (para comprobarlo)
- `frontend/src/components/adjuntos/data.ts`: `ARCHIVO_EN_COPIA: "Este archivo todavía se está copiando. Inténtalo en unos minutos."` en `MENSAJES_POR_CODIGO_DE_ARCHIVO`, con su comentario. SHA-256 `1aba642068d97902acbcfadfe8341b9e9c4e512bd9c7efb6749494dff0f01077`.
- `frontend/src/features/clases/reexportaciones-01c.test.ts` (lista cerrada): `"ARCHIVO_EN_COPIA"` en la lista de `:139-145`. SHA-256 `1bd735b3730fdfc7a1cef7a654742cf7ead8b6f79c9beb3e5ea10057f54eee82`.
- Nada más: `git diff --stat 52f1c97 -- frontend backend shared` lista estos dos archivos y los dos `*.ataque` de la ronda 0 (sin tocar por mí: `foco-02c-r4` `0165d4e2…` y `styles/clases-r1` `550ccd96…`, los vigentes de la lista `ac79306a…`).

### Corrida
Puerta de carga: lecturas de 35 a 85 % desde las 14:35; dos seguidas de 25 % o menos a las 14:40:34 (23) y 14:40:44 (15), sin ningún `vitest`. No terminé procesos.

Comando, desde `frontend/`: `npx vitest run src/features/clases/errores-ch3.test.ts src/features/clases/reexportaciones-01c.test.ts src/components/adjuntos/errores-ch3.test.ts`

```
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 37 passed (38)
```

El rojo es CH3-B01: `expected [ 'ALMACEN_NO_CONFIGURADO', …(12) ] to deeply equal [ 'ALMACEN_NO_CONFIGURADO', …(11) ]`, con `+ "ARCHIVO_EN_COPIA"` como única diferencia (`errores-ch3.test.ts:95:63`). `reexportaciones-01c` (con su cambio de la lista cerrada) y la vigilada `components/adjuntos/errores-ch3.test.ts` en verde.

### Grep de hermanos (para que la enmienda los cierre de una vez)
- Pruebas que enumeran las claves de un mapa que esparce `MENSAJES_POR_CODIGO_DE_ARCHIVO`: solo CH3-B01 (`features/clases`). `features/tareas/data.ts:153` también lo esparce, pero ninguna prueba compara sus claves (grep de `Object.keys(MENSAJES_POR_CODIGO`, `TEXTOS_FIJOS` y `ALMACEN_NO_CONFIGURADO` en `*.test.*`: solo `errores-ch3.test.ts`, `reexportaciones-01c.test.ts`, `refactor-01c-r1.ataque` con `toMatchObject` y `entregas-01d.test.tsx:845`, que no enumera).
- Pruebas que enumeran `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de clases: `errores-ch3.test.ts:84` (ya en la lista cerrada, 15 → 20) y la vigilada `errores-ch3-r1.ataque:273` (los recorre). Ninguna otra.

### Remedio que propondría (no lo apliqué)
Sumar CH3-B01 a la lista cerrada de 01c con un solo cambio: `ARCHIVO_EN_COPIA: "Este archivo todavía se está copiando. Inténtalo en unos minutos."` en `TEXTOS_FIJOS_DE_SIEMPRE` (`:45-60`), con su comentario de ADMIN-01c. El bucle de `:98-100` lo recorre solo y comprueba el texto.

### Otros huecos del plan que encontré al leer, antes de escribir código (no bloquean por sí solos; los anoto para la misma enmienda)
1. **Foco tras duplicar.** La matriz de 01c dice "Éxito: `h1` de la clase nueva". El `h1` vive en `features/clases/components/encabezado-clase.tsx:36`, sin `tabIndex`, y ese archivo es de 01d1 (no está en "Se toca" de 01c). Duplicar navega de `/admin/clases/:id/duplicar` a `/admin/clases/:nueva` dentro del mismo `ClaseLayout`: sin tocar el encabezado, el foco queda como hoy al crear una clase (`FormularioClase` solo navega). O la enmienda suma `encabezado-clase.tsx` (`tabIndex={-1}` y un destino) a 01c, o la celda pasa a "como al crear una clase".
2. **`claveClasesAnteriores`.** La matriz de 01c (archivar y restaurar) la nombra en "Se renueva", pero la clave nace en 01d2 en `services/clasesService.ts`, que no está en "Se toca" de 01c. Sin enmienda, 01c renovaría las dos listas del admin, el detalle de la clase y las listas inscritas e impartidas (con la barra lateral, que cuelga de ellas), y 01d2 sumaría la de anteriores.
3. **Aviso de duplicado.** §D-10: "avisa «Clase duplicada. Los archivos de los recursos pueden tardar unos minutos en estar disponibles.» cuando la original tenía recursos con archivos". La respuesta de `POST …/duplicar` es `claseRespuestaSchema` (sin dato de archivos) y el formulario no pide los recursos de la original, así que el cliente no sabe si los había. Opciones: el texto completo siempre, o "Clase duplicada" siempre; cualquiera necesita que la enmienda lo fije.
4. **Nombre accesible del control segmentado.** §D-10 pide un `role="group"` "con nombre accesible", pero §D-12 no trae el texto. Propuesta: "Estado de las clases".

Pasos completados: 0 de 2 (14 y 15). Quedo a la espera de la enmienda.

## ADMIN-01c — Implementación (2026-11-05)

Plan: `docs/trabajo/ADMIN-01-administracion/plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78` (Enmiendas 1 a 10; comprobado al reanudar). Base dentro de los paquetes: `52f1c97`. La otra copia de trabajo no se usa. Sin navegadores. Sin commit. 01c no toca `shared/` ni el backend.

Pasos completados: 2 de 2 (14 y 15).

### Archivos
- **Nuevos:** `frontend/src/lib/unir-paginas.ts`, `frontend/src/lib/unir-paginas.test.ts`, `frontend/src/features/clases/duplicar-clase-view.tsx`, `features/clases/components/confirmar-archivado.tsx`, `components/dialogo-borrar-clase.tsx`, `components/formulario-duplicar-clase.tsx`, `features/clases/clases-admin-01c.test.tsx`, `features/clases/clases-admin-01c-rutas.test.tsx`.
- **Modificados:** `features/clases/clases-admin-view.tsx`, `components/tabla-clases-admin.tsx`, `hooks.ts`, `data.ts`, `lib.ts`, `types.ts`; `components/adjuntos/data.ts` (`ARCHIVO_EN_COPIA`); `app/router.tsx` (`duplicar`).
- **Lista cerrada (pruebas normales):** `clases-admin-view.test.tsx:165` (URL con `estado=activas`); `errores-ch3.test.ts` (`:84` de 15 a 20; CH3-B15 (1) a (3); CH3-B01 con las dos líneas de E10-1, exactas); `reexportaciones-01c.test.ts` (`:139-145` y el comentario de `:146`, «cinco códigos»). `git diff -U0 52f1c97` de los tres: solo esas líneas.

### Verificación (comando literal y última línea)
Puerta de carga antes de cada corrida (script propio en el scratchpad: dos lecturas de 25 % o menos y ningún `vitest`). Excepciones: dos corridas cortas de un solo archivo que lancé justo después de una puerta pasada (15:15) sin repetirla, y dos de depuración de ADM-1C10 (borradas; ninguna se reporta como cifra).
- **lint:** `cd frontend; npm run lint` → exit 0; `All matched files use Prettier code style!` y la última línea es `> tsc -b`, sin errores.
- **build:** `cd frontend; npm run build` → exit 0, `✓ built in 1.22s`.
- **test (módulos tocados y vigiladas de fuera, por ruta):** `cd frontend; npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx` (15:28:50) → `Test Files  133 passed (133)` · `Tests  2456 passed (2456)`.
  - Después corregí solo las letras de los títulos de ADM-1C11 en `clases-admin-01c-rutas.test.tsx`; ese archivo solo: `npx vitest run src/features/clases/clases-admin-01c-rutas.test.tsx` → `Tests  22 passed (22)`; `lint` otra vez exit 0.
- **Corrida acotada de E10-1** (corregida por M-01 del manager). Desde `frontend/`: `npx vitest run src/features/clases/errores-ch3.test.ts src/features/clases/reexportaciones-01c.test.ts src/components/adjuntos/errores-ch3.test.ts`.
  - Puerta de carga: 15:52:34 `cpu=3` y 15:52:45 `cpu=0`, sin ningún `vitest`.
  - Resultado (15:52:47): `Test Files  3 passed (3)` y `Tests  42 passed (42)`.
  - Por qué cambió: antes reporté `Tests  38 passed (38)`, de la corrida de las 14:56:55. Esa corrida fue anterior a los cuatro casos de CH3-B15 en modo `duplicar` de la Enmienda 9, que apliqué después (tres filas en `FILAS_POR_MODO` y una en `MODOS`). El "38" del plan tampoco los contaba.
- prisma validate: n/a.

### Rojo esperado de la ronda 0, ahora en verde (en la corrida de módulos)
- `styles/clases-r1.ataque.test.ts` > "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 76 enEspera" (C-9). `enEspera=` por archivo: `tabla-clases-admin.tsx` 1, `confirmar-archivado.tsx` 1, `dialogo-borrar-clase.tsx` 1, `formulario-duplicar-clase.tsx` 1, `duplicar-clase-view.tsx` 0, `clases-admin-view.tsx` 1.
- `styles/clases-r1.ataque.test.ts` > "V-07: vidrio, vidrio fuerte y vidrio azul solo en la lista final del plan (igualdad exacta)" (C-9c y C-9b).
- `features/clases/foco-02c-r4.ataque.test.tsx` > "ataque CLASES-02c r4: useFocoAlPasarAError en /admin/clases" > "recarga que falla tras tener datos, con el foco en un control de la vista: el foco va al destino del error; con el foco movido por la persona, no se mueve".
- ídem > "dos fallos seguidos: el segundo no mueve el foco, ni desde el destino ni desde <body>".
- ídem > "éxito, error, éxito, error: cada paso a error con el foco en un control de la vista lleva el foco al destino".

### Conteos
`cd frontend; npx vitest list src/features/clases/clases-admin-01c.test.tsx src/features/clases/clases-admin-01c-rutas.test.tsx src/lib/unir-paginas.test.ts`, contado con `grep -a`: 78 casos en 3 archivos (51 en `clases-admin-01c.test.tsx`, 22 en `clases-admin-01c-rutas.test.tsx`, 5 en `unir-paginas.test.ts`). Los 78 llevan "ADM-1C" en su ruta de títulos; 4 son de la matriz y N-24.

### Pruebas requeridas → archivo y título exacto
Abreviaturas: **[A]** `frontend/src/features/clases/clases-admin-01c.test.tsx`; **[R]** `frontend/src/features/clases/clases-admin-01c-rutas.test.tsx` (router real y `app/providers.tsx`); **[U]** `frontend/src/lib/unir-paginas.test.ts`.
- **ADM-1C01** → [A] "ADM-1C01: los dos botones están en el grupo «Estado de las clases»; «Archivadas» escribe ?estado= en el historial y atrás y adelante cambian de tabla".
- **ADM-1C02** → [A] "ADM-1C02: la confirmación lleva el foco a «Cancelar» y cancelar lo regresa a «Archivar»; «Sí, archivar» con dos clics hace una sola petición, la fila sale, un aviso y el foco va al «Archivar» de la fila vecina"; "ADM-1C02: al archivar la última clase de la lista, el foco va al encabezado «Clases», nunca a <body>"; "ADM-1C02: 409 CLASE_YA_ARCHIVADA da un solo aviso con el texto del servidor y la lista se renueva".
- **ADM-1C03** → [A] "ADM-1C03: «Restaurar» con dos clics hace una sola petición, la fila sale de «Archivadas», un aviso y el foco va al «Restaurar» vecino"; "ADM-1C03: «Duplicar» lleva a la vista de duplicar con el nombre prellenado; con éxito, la ruta pasa a la clase de la respuesta y hay un solo aviso, también sin recursos en la original (Enmienda 10)".
- **ADM-1C04** → [A] "ADM-1C04: pide el conteo al abrirse y lo dice en palabras; el foco empieza en «Cancelar»; dos clics, un solo DELETE con la confirmación; la fila sale, el diálogo se cierra, un aviso y el foco va al «Borrar definitivamente» vecino"; "ADM-1C04: cada cifra con su singular y las que valen 0 dichas igual (…)" (2 casos); "ADM-1C04: 409 CLASE_CON_COPIAS_EN_CURSO da un solo mensaje en el diálogo, que sigue abierto con el conteo; el botón sale de la espera y repetirlo pide otro DELETE".
- **ADM-1C04b** → [A] "ADM-1C04b: el título es «Borrar definitivamente «{nombre}»» completo, sin comillas exteriores; un nombre de 120 caracteres sin espacios se conserva entero y el título parte palabras (wrap-anywhere)". Compara `textContent` con `Borrar definitivamente «Clase 5»` y con el nombre largo; la clase por `toHaveClass`, sin medir.
- **ADM-1C05** → [A] "ADM-1C05 (a) un campo que este modo no pinta (descripcion:, pintado solo al crear): …", "ADM-1C05 (b) mensaje vacío: …", "ADM-1C05 (b) mensaje de solo espacios: …", "ADM-1C05 (c) prefijo con ruta: …" (cada uno termina en "un solo mensaje legible, lo escrito se conserva y «Duplicar clase» sale de la espera"); "ADM-1C05 (d): un rechazo del servidor bajo «Nombre» seguido de un envío que la validación local rechaza (nombre vacío): un solo mensaje, el del último envío, sin otro POST". El recorrido de `ENTRADAS_FUERA_DE_CONTRATO` con la función del módulo en modo `duplicar` lo hace CH3-B15 (2) "toda la tabla fuera de contrato da null en el modo duplicar" (lista cerrada).
- **ADM-1C06** → [R] "ADM-1C06 (a) cerrar y volver a abrir: …", "ADM-1C06 (b) pulsar «Clases» en la barra estando ahí: …", "ADM-1C06 (c) ir a otra sección y regresar antes del staleTime: …", "ADM-1C06 (d) cambiar a «Activas» y volver: …" (cada uno: "al volver a abrir el diálogo pide otra vez el conteo (no lo sirve de la caché) y el texto desaparece").
- **ADM-1C07** → [R] "en «activas», (a) pulsar «Clases» en la barra estando ahí: la primera página vuelve a pedirse sin cursor ni posición, responde y el texto desaparece", y los mismos con "(b) ir a otra sección y regresar antes del staleTime", "(c) cambiar de pestaña y volver" y "(d) atrás y adelante del historial".
- **ADM-1C08** → [A] "ADM-1C08 y ADM-1C16 (d): en «activas», dos clics en «Cargar más clases» hacen una sola petición" (y "en «archivadas»"). `enEspera={isFetching}` y `cancelRefetch: false` en el código.
- **ADM-1C09** → [A] "ADM-1C09: el contenido del diálogo lleva data-material=opaco y data-densidad=densa, y solo existe mientras está abierto (sin forceMount)".
- **ADM-1C10** → [R] "ADM-1C10 (a) repetir «Descargar»: …", "ADM-1C10 (b) pulsar «Recursos» estando en la sección: …", "ADM-1C10 (c) ir a «Avisos» y regresar antes del staleTime: …" (cada uno: "sale otra petición de la URL; un solo aviso por intento fallido y, con 200, el aviso no vuelve y la descarga sigue"). El recorrido de `ENTRADAS_FUERA_DE_CONTRATO` con el código nuevo lo hacen CH3-B01 (lista cerrada) y la vigilada `components/adjuntos/errores-ch3.test.ts`.
- **ADM-1C11** → [R] "ADM-1C11 (a): repetir «Sí, borrar definitivamente» pide otro DELETE; con 204 la fila sale y el texto desaparece"; "ADM-1C11 (b) cerrar y volver a abrir: al volver a abrir, el error ya no está, se vuelve a pedir el conteo y el botón está disponible"; "ADM-1C11 (c) pulsar «Clases» en la barra estando ahí: …" (mismo final).
- **ADM-1C12** → [R] "ADM-1C12 (a) pulsar «Clases» en la barra estando ahí: …", "ADM-1C12 (b) ir a otra sección y regresar antes del staleTime: …", "ADM-1C12 (c) cambiar de pestaña y volver: …", "ADM-1C12 (d) atrás y adelante del historial: …" (cada uno: "vuelve a pedir la primera página de la lista visible y, si responde, el texto desaparece").
- **ADM-1C13** → [A] "ADM-1C13: 409 CLASE_CON_COPIAS_EN_CURSO da un solo aviso con el texto del servidor, lo escrito se conserva, «Duplicar clase» sale de la espera y repetir el envío pide otro POST".
- **ADM-1C14** → [A] "ADM-1C14: la lista pide ?estado=activas&limite=50 en «Activas» y ?estado=archivadas&limite=50 en «Archivadas»"; "ADM-1C14: archivar marca viejas las dos listas del admin (prefijo) y las listas de la barra lateral" (y "restaurar", "borrar", "duplicar"). Comprueban además que ninguna clave con "anteriores" se invalida (E10-6).
- **ADM-1C15** → [A] "ADM-1C15 (a) claseId: en «Sí, archivar»: un solo aviso legible y el botón sale de la espera; (e) al cancelar y volver a abrir no queda ningún mensaje viejo", con (b) vacío, (b) espacios, (c) confirmar.0: y (d) nombre: (pintado solo al duplicar); los cinco en «Restaurar» ("…: un solo aviso legible y el botón sale de la espera") y los cinco en «Sí, borrar definitivamente» ("…: un solo mensaje legible en el diálogo, sin aviso; el botón sale de la espera; (e) al cerrar y volver a abrir el mensaje viejo no está"). 15 casos.
- **ADM-1C16** → (a) [A] "ADM-1C16 (a): en «Archivadas», la página siguiente lleva el cursor y la posición codificada, exactamente"; (b) [A] "ADM-1C16 (b): en «Activas», la segunda página sale sin cursorArchivadaEn con la posición en null", "… sin la posición (dobles de hoy)" y "… aunque el servidor mandara una posición"; (c) [A] "ADM-1C16 (c): con el 400 de la posición vieja, la frase de lista cambiada una sola vez y sin aviso", y por los caminos de ADM-1C07: [R] "en «archivadas», (a) …", "(b) …", "(c) …", "(d) …" (comprueban `cursorArchivadaEn` en la petición que falla y que las nuevas salen sin `cursor` ni `cursorArchivadaEn`); (d) [A] "ADM-1C08 y ADM-1C16 (d): en «archivadas», dos clics en «Cargar más clases» hacen una sola petición".
- **ADM-1C17** → (a) [U] "ADM-1C17 (a): sin repetidas, devuelve todas las filas en el orden de las páginas", "ADM-1C17 (a): un id repetido en una página posterior se queda en su primera aparición y sale de la posterior", "ADM-1C17 (a): una repetida dentro de la misma página sale igual", "ADM-1C17 (a): páginas vacías", "ADM-1C17 (a): no muta la entrada"; (b) [A] "ADM-1C17 (b): en «activas», la fila que la segunda página repite se pinta una sola vez, en su lugar; React no avisa de claves repetidas y la tercera página sale con el cursor y la posición de la segunda respuesta" (y "en «archivadas»").
- **N-24 del manager** → [A] "N-24: si la última página trae solo filas repetidas, el foco va al encabezado «Clases»"; "N-24: si la primera fila de la última página es repetida, el foco va al «Abrir» de la primera fila de verdad nueva".
- Casos de la matriz que no son ADM: [A] "matriz de 01c: 404 MAESTRO_NO_ENCONTRADO va en el selector de maestros, sin aviso"; "matriz de 01c: duplicar sin elegir maestro no pide nada y marca el selector".

### V-01 y "No se toca"
- **V-01:** reconstruí la lista de la ronda 0 de 01c (las 256 filas de `reporte-tester.md:1548-1805`, con las dos filas de "Tras la Enmienda 9"). Su SHA-256 en formato `sha256sum -c` da `ac79306abdf63ad495a3a985f01cc18f142f380b94b27f35e70316f872696c03`, el de la lista vigente. `sha256sum -c` no da diferencias. `git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'` da 256 y no hay ninguna `*.ataque` sin rastrear. No toqué ninguna `*.ataque`.
- **"No se toca" contra `52f1c97`:** `git diff --name-only 52f1c97 -- backend shared infra AGENTS.md CLAUDE.md .claude docs/DESIGN.md docs/ESTADO.md` está vacío. En `frontend/` cambian solo archivos de "Se toca" de 01c, los tres de la lista cerrada y las dos `*.ataque` del tester (C-9 a C-9d). `services/clasesService.ts` y `encabezado-clase.tsx` no se tocan (E10-3, E10-6). `docs/DESIGN.md` no se toca: el plan lo deja para el cierre (A-04, §D-R0 01c). Fuera de los paquetes, solo `docs/trabajo/ADMIN-01-administracion/resumen-programador.md` (el `DEPLOY-investigacion-vps.md` sin rastrear ya estaba y no es mío).
- Vigiladas: todas en verde dentro de la corrida de módulos. `clases-admin-view.test.tsx:104-127` no cambió. Ningún código fijo nuevo en `MENSAJES_POR_CODIGO_DE_CLASES` (E10-2): `ARCHIVO_EN_COPIA` llega por `MENSAJES_POR_CODIGO_DE_ARCHIVO`, como pide §D-10. Lo escribí como literal en el mapa, no como clave de `MENSAJES_ERROR_DE_ARCHIVOS` (detalle menor del manager en la verificación de E10).

### Decisiones donde el plan calla
1. **Recuperar la lista** (`useRecuperarListaDeClasesAdmin`, `hooks.ts`):
   - Con otra `location.key` y la vista montada (pulsar «Clases», cambiar de pestaña, atrás o adelante), se hace `resetQueries` exacto de la lista visible, solo si está en error. Pide la primera página sin cursor ni posición.
   - Al desmontarse la vista, las listas en error salen de la caché (`removeQueries`), así que regresar antes del `staleTime` las pide de nuevo.
   - Una lista sana no se vuelve a pedir, así que las pruebas existentes que cuentan peticiones no cambian.
2. **«Clases» de la barra** abre `/admin/clases`, es decir, «Activas». Desde «Archivadas», ADM-1C07 y ADM-1C16 (c), camino (a), vuelven después a su pestaña: así la lista archivada en error se pide otra vez desde la primera página.
3. **Qué se renueva al archivar o restaurar:**
   - También el detalle de esa clase (`exact: true`).
   - Además de los dos `409` de la matriz, también ante `SIN_ACCESO_A_LA_CLASE`, por si otra sesión la borró; si no, la fila quedaría para siempre.
4. **El conteo:**
   - `staleTime` y `gcTime` en 0, y se saca de la caché al cerrar el diálogo.
   - `CLASE_NO_ARCHIVADA` muestra el texto del servidor. Cualquier otro error muestra la frase de recuperación y no ofrece «Sí, borrar definitivamente».
   - Usa el `retry` de la app (uno).
5. **El diálogo:**
   - No se cierra mientras el borrado está en vuelo.
   - Se monta solo abierto, con `key` por clase.
   - Al cancelar, el foco vuelve a «Borrar definitivamente» de esa fila (`useFocoAlCerrarElBorrado`). Radix solo lo devuelve a un `DialogTrigger`, que aquí no hay; sin esto quedaba en `<body>`.
   - Tras borrar, el foco va al mismo control de la fila vecina, o al `h1`.
6. **Foco al quitar una fila** (§7.14; `useFocoAlQuitarUnaClase`): va al mismo control de la fila que ocupa su lugar.
   - En «Activas», «Archivar»; en «Archivadas», «Restaurar»; tras el diálogo, «Borrar definitivamente».
   - Sin filas, va al `h1` «Clases».
   - Lo marca `data-accion` en cada botón.
7. **Nombres accesibles:** el texto visible de cada botón de la tabla va `aria-hidden`, y la acción con el nombre de la clase va en un solo nodo `sr-only` ("Archivar Clase 1"). Es O-01c-3: el nombre de la clase nunca queda como nodo de texto propio dentro de un botón. Los enlaces «Abrir» y «Duplicar» conservan el patrón de hoy.
8. **Variantes:** «Archivar» y «Borrar definitivamente» en `ghost`; «Abrir», «Duplicar» y «Restaurar» en `outline`; «Sí, archivar» en `destructive` (§7.14); «Sí, borrar definitivamente» en `destructive`.
9. **Formulario de duplicar:**
   - «Cancelar» lleva a `/admin/clases`.
   - Un error con que `apiClient` redirige no avisa.
   - Un error que va como aviso limpia los errores de campo anteriores, para que se lea un solo mensaje.
   - El `id` del campo es `nombre-de-la-copia`, para no repetir el de crear.
10. **Columna «Archivada»:** pinta la fecha corta solo si `archivadaEn` es texto; ausente, la celda va vacía. No hay valor inventado.
11. **Nombre de la función del selector:** `noSeEncontroElMaestro` (`lib.ts`). El primer nombre, `esMaestroNoEncontrado`, chocaba con `/esMaestro/` de `estatico-02c-r1.ataque:63`. Lo cambié yo; ninguna prueba cambió.

### Desviaciones del plan
Ninguna. Los textos son los de §D-10 y §D-12, con «Estado de las clases» ya aprobado (E10-5).

### Matriz de avisos y recargas (vistas nuevas de 01c)
"Redirige" = `401`, `ACCESO_RESTRINGIDO` o `CAMBIO_DE_CONTRASENA_REQUERIDO`, que resuelve `apiClient`: ninguna de estas vistas avisa de ellos.

**`/admin/clases` (`ClasesAdminView`)**

| Disparador | Clase de error | Qué se renueva | Qué se anuncia | Foco |
|---|---|---|---|---|
| Lista, primera página | `5xx` o red; `VALIDACION` | Nada al instante. La renuevan pulsar «Clases», cambiar de pestaña, atrás y adelante (`resetQueries`), o salir y volver (`removeQueries`) | Reemplaza el contenido con `MensajeError` (`TEXTOS_CLASES_ADMIN.error`); sin aviso. El control segmentado sigue | Como hoy: al `h1` solo si hubo datos y el foco se perdió (llave por estado, O-01c-6) |
| Lista, primera página | Redirige | — | Nada | — |
| «Cargar más clases» | `400` del cursor, también con la posición vieja | Igual que arriba; vuelve sin cursor ni posición | `MensajeError` con la frase de lista cambiada; sin aviso | El `h1`, si el botón tenía el foco |
| «Cargar más clases» | `5xx` o red | Igual | `MensajeError` con `TEXTOS_CLASES_ADMIN.error`, como hoy (E9-4); sin aviso | Ídem |
| «Sí, archivar» / «Restaurar» | `VALIDACION` | Nada | Un aviso traducido | Se queda en el botón, que sale de la espera |
| «Sí, archivar» / «Restaurar» | `409 CLASE_YA_ARCHIVADA` / `CLASE_NO_ARCHIVADA`; `SIN_ACCESO_A_LA_CLASE` | Las dos listas del admin, inscritas e impartidas (con la barra) y el detalle (`exact`) | Un aviso con el texto del servidor | La fila sale: el mismo control de la vecina, o el `h1` |
| «Sí, archivar» / «Restaurar» | `5xx` o red | Nada | Un aviso | Se queda en el botón |
| «Sí, archivar» / «Restaurar» | Redirige | Nada | Nada | — |
| «Sí, archivar» / «Restaurar» | Éxito | Ídem `409` | "Clase archivada" / "Clase restaurada" | Vecina o `h1` |
| Conteo, al abrir el diálogo | `409 CLASE_NO_ARCHIVADA` | Al reabrir | `MensajeError` en el diálogo con el texto del servidor; sin botón de borrar | Se queda en «Cancelar» |
| Conteo, al abrir el diálogo | `5xx`, red u otro | Al reabrir: se saca de la caché al cerrar | `MensajeError` con "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo."; sin botón de borrar | «Cancelar» |
| «Sí, borrar definitivamente» | `VALIDACION`, `409 CLASE_CON_COPIAS_EN_CURSO` o `CLASE_NO_ARCHIVADA`, `5xx` o red | Nada; el conteo se conserva | Un `MensajeError` en el diálogo, sin aviso; al cerrar se limpia (`reset()`) | Se queda en el botón, que sale de la espera |
| «Sí, borrar definitivamente» | Éxito | Las dos listas del admin e inscritas e impartidas | "Clase borrada" | El diálogo se cierra: «Borrar definitivamente» de la vecina, o el `h1` |
| Cerrar el diálogo sin borrar | — | Se saca el conteo | — | El «Borrar definitivamente» que lo abrió |

**En vuelo a la vez, en `/admin/clases`:**
- Cada fila tiene su propia mutación de restaurar y su ref. Dos «Restaurar» de filas distintas salen los dos, y cada uno avisa una vez.
- El foco lo decide la fila que lo tenía.
- «Cargar más clases» durante una renovación por archivar o restaurar queda en espera (`isFetching`), y `cancelRefetch: false` no corta la renovación.
- Mientras el diálogo está abierto, el resto de la página es inerte (modal).

**Con la vista desmontada, en `/admin/clases`:**
- Archivar y restaurar avisan desde el gancho, una vez, también al desmontarse.
- El borrado avisa su error solo si el diálogo ya no está (`useMontado`); su éxito avisa siempre.
- Ninguno avisa de un error con que `apiClient` redirige.
- Las listas en error salen de la caché.

**`/admin/clases/:claseId/duplicar` (`DuplicarClaseView`)**
- **Detalle de la clase (`GET`):** como "editar". Ante un error, `MensajeError` con `mensajeDeConsultaClases`, que reemplaza la vista. Si el `401` no se recupera, redirige.
- **«Duplicar clase»:**
  - `VALIDACION` de un campo pintado (`nombre`, `maestroIds`): `ErrorDeCampo`.
  - `VALIDACION` de otro campo, vacía o con ruta: un aviso.
  - `MAESTRO_NO_ENCONTRADO`: en el selector, sin aviso.
  - `409 CLASE_CON_COPIAS_EN_CURSO`, `5xx` o red: un aviso, y se limpian los errores de campo viejos.
  - En todos, lo escrito y los maestros elegidos se conservan, y el foco se queda en el botón.
  - Si redirige, nada.
  - Éxito: se marcan viejas las listas del admin e inscritas e impartidas, sale el aviso "Clase duplicada. Los archivos de los recursos pueden tardar unos minutos en estar disponibles." y navega a la clase nueva sin mover el foco, como al crear (E10-3 y E10-4).
- **En vuelo a la vez:** la ref impide un segundo `POST`.
- **Con la vista desmontada:** el gancho avisa el error, salvo si redirige, y el éxito sin navegar.

**«Descargar» de un recurso (componente compartido, sin cambio salvo el texto)**
- `409 ARCHIVO_EN_COPIA`: un aviso, "Este archivo todavía se está copiando. Inténtalo en unos minutos.".
- Cada «Descargar» vuelve a pedir la URL: es una mutación y no hay caché.
- El foco se queda en «Descargar».
- Los demás errores, como hoy.

### Hermanos
1. **La guarda con ref en cada acción nueva:** «Cargar más clases», «Sí, archivar», «Restaurar», «Sí, borrar definitivamente» y «Duplicar clase». Las cinco con ref y `enEspera`, y cada una con su caso de dos clics y una sola petición (ADM-1C08 y 1C16 d, 1C02, 1C03, 1C04; el formulario de duplicar, por la ref de CHORE-04). «Archivar», «Borrar definitivamente» y «Cancelar» no piden nada: no aplica.
2. **El cursor con posición:** «Activas» nunca la manda, ni con `null`, ni sin el campo, ni si el servidor la mandara. «Archivadas» la manda solo si llega como texto. El `400` de cualquiera de las dos lleva al mismo texto. Probado en las dos pestañas.
3. **El descarte por `id`:** las dos pestañas usan `unirPaginasSinRepetidas` en el único lugar donde se unen las páginas. Los `ids` que recibe `useFocoAlCargarMas` ya vienen sin repetidos (N-24). 01d2, 01f y 01g lo usarán desde sus archivos; no aplica en 01c.
4. **Estados vecinos de la recuperación de la lista:**
   - primera carga que falla, recarga que falla y página siguiente que falla con `5xx` o con `400`, en cada pestaña;
   - error ya en la caché al montar (`foco-02c-r4`, C-9d);
   - cambiar de pestaña con error en la otra;
   - atrás y adelante;
   - desmontar y volver;
   - pulsar «Clases» desde «Archivadas».
   El remedio aplica a todos. Una lista sana no se vuelve a pedir.
5. **Estados vecinos del foco:**
   - fila que sale por archivar, restaurar, borrar o un `409`;
   - última fila;
   - lista vacía;
   - lista que pasa a error (manda `useFocoAlPasarAError`; el gancho nuevo no actúa sin `ids`);
   - cambio de pestaña (la llave del gancho de error lleva el estado);
   - cancelar la confirmación en línea (vuelve a «Archivar»);
   - cerrar el diálogo sin borrar (vuelve al botón que lo abrió).
   Probados, salvo el cambio de pestaña con foco en una fila, que no existe: el foco está en el botón de la pestaña.
6. **El conteo y los errores del diálogo:** reabrir (incluye pulsar «Clases», ir y volver, y cambiar de pestaña), reabrir tras un `400` (ADM-1C15 e) y reabrir tras un `409` (ADM-1C11 b y c). En todos se pide el conteo otra vez y no queda el error viejo.
7. **`ARCHIVO_EN_COPIA`:** la descarga de la clase usa `mensajeDeErrorClases`, y la tabla de clases lo esparce. La de las entregas (`features/tareas`) también lo esparce, pero el servidor solo lo responde en la descarga de la clase (E1-21): no aplica más.

## ADMIN-01c — Corrección ronda 1 (2026-11-05)

Plan: `plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78`. Fuente: `reporte-tester.md`, "## Ronda 1 — ADMIN-01c" (línea 1902), y `frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx`, que no toqué. Es la ronda de corrección 1 de 3. Sin navegadores y sin commit.

### Hallazgos
- **T-01: corregido.**
  - `useConteoDeBorrado` (`hooks.ts`): si el conteo falla con `esCambioDeLaClaseEnGestion` (`SIN_ACCESO_A_LA_CLASE`, `CLASE_NO_ARCHIVADA` o `CLASE_YA_ARCHIVADA`), renueva las dos listas del admin, inscritas e impartidas y el detalle (`renovarTrasGestionar`), igual que archivar y restaurar. Lo hace dentro del `queryFn` y relanza el error.
  - `useBorrarClase`: ante `SIN_ACCESO_A_LA_CLASE` (`esClaseQueYaNoExiste`, nueva en `lib.ts`), avisa como antes y renueva lo mismo.
  - El `409 CLASE_NO_ARCHIVADA` del `DELETE` sigue la matriz del plan: solo el mensaje en el diálogo, sin renovar.
  - Así la frase "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo." se cumple: al cerrar, la fila de la clase que ya no existe salió de la lista. Por cada camino:
    - cerrar: la fila ya no está;
    - pulsar «Clases», cambiar de pestaña, ir y volver: la lista ya está renovada;
    - reabrir otra fila: su conteo propio.
- **T-02: corregido.**
  - `useArchivarClase(claseId)` y `useRestaurarClase(claseId)` llevan una `mutationKey` por clase (`claveGestionDeClase`, `data.ts`).
  - `useGestionEnVuelo(accion, claseId)` lee de la caché de mutaciones:
    - `enVuelo` (`useIsMutating`), para pintar la espera;
    - `sigueEnVuelo()` (`queryClient.isMutating`), para la guarda síncrona.
  - Así la fila o la confirmación que se vuelven a montar con la petición en vuelo siguen en espera y no mandan otra. Las refs se quedan para el doble clic dentro de la misma instancia.
  - **«Cancelar» con archivar en vuelo:** no cierra la confirmación, porque la petición ya salió y no se puede retirar. Es lo mismo que hace «Cancelar» del diálogo de borrar (decisión 5 de la implementación; el tester lo dio por bueno en ADM-T1C04).
  - No pongo «Cancelar» en espera: sumaría un `enEspera=` y V-06 fija 76, lo que sería PARADA. Ningún texto del plan cambia.
- **T-03: corregido.** El error del conteo sustituye al conteo y al botón (`conteoFallo` en `dialogo-borrar-clase.tsx`). Nunca salen "Cierra y vuelve a intentarlo" y «Sí, borrar definitivamente» a la vez.
  - El conteo sí se vuelve a pedir al reconectar: ADM-T1C19 lo exige.
  - Con el borrado ya en vuelo, el conteo confirmado se queda a la vista hasta que responda, para que el botón en espera no desaparezca con el foco dentro.
- **Hermano de T-01, el foco:** al cerrar el diálogo cuando su fila ya salió (la lista se renovó con el diálogo abierto), el foco va a la fila que quedó, como tras borrar (`useFocoAlQuitarUnaClase`). Antes buscaba el botón de una fila que ya no existía y quedaba en `<body>`. Lo resuelve `alCerrarElBorrado` en `clases-admin-view.tsx`.

### Archivos cambiados en esta ronda
- Producción: `features/clases/hooks.ts`, `data.ts` (`claveGestionDeClase`), `lib.ts` (`esClaseQueYaNoExiste`), `clases-admin-view.tsx`, `components/tabla-clases-admin.tsx`, `components/confirmar-archivado.tsx` y `components/dialogo-borrar-clase.tsx`. Todos de "Se toca" de 01c.
- Pruebas: `features/clases/clases-admin-01c.test.tsx`, mío, con 3 casos nuevos:
  - "hermano de T-01: el conteo con 409 CLASE_NO_ARCHIVADA (otra pestaña la restauró) muestra el texto del servidor, sin «Sí, borrar definitivamente», y la lista de «Archivadas» se renueva";
  - "hermano de T-01: al cerrar el diálogo cuando su fila ya salió de la lista, el foco va a la fila que quedó, nunca a <body>";
  - "matriz de 01c: «Sí, borrar definitivamente» con 409 CLASE_NO_ARCHIVADA muestra el mensaje en el diálogo y no renueva las listas".
- No toqué ninguna `*.ataque` ni ninguna prueba normal fuera de la mía.

### Verificación (desde `frontend/`; puerta de carga antes de cada corrida)
- **lint:** `npm run lint` → exit 0; `All matched files use Prettier code style!` y `> tsc -b` sin errores.
- **build:** `npm run build` → exit 0, `✓ built in 887ms`.
- **test:** `npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx` (16:18:40; puerta 16:18:27 `cpu=25` y 16:18:38 `cpu=12`) → `Test Files  134 passed (134)` · `Tests  2482 passed (2482)`.
  - Las cuentas: 2479 de la corrida del tester más mis 3 casos.
  - Los 6 rojos del tester ya pasan: ADM-T1C01, 02, 06, 07, 08 y 19.
- Antes, solo los tres archivos de 01c (`clases-admin-01c-r1.ataque`, `clases-admin-01c` y `clases-admin-01c-rutas`): `Tests  96 passed (96)`. Después de sumar mis casos, `clases-admin-01c.test.tsx` solo: `Tests  54 passed (54)`.

### V-01
- Las 256 de la lista `ac79306a…` no tienen diferencias (`sha256sum -c`).
- Se suma la del tester sin rastrear: `frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx` = `1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65`.
- En total, 257. No toqué ninguna.

### Hermanos y estados vecinos, por mutación de 01c

| Mutación o consulta | Remedio de T-01 (renovar si la clase cambió o ya no existe) | Remedio de T-02 (en vuelo sobrevive al desmontaje) | Remedio de T-03 (el error sustituye a la acción) |
|---|---|---|---|
| Archivar | Ya lo tenía (`409` y `403`) | Aplicado: `mutationKey` por clase, la espera y la guarda leen la caché; «Cancelar» no cierra en vuelo | No aplica: no hay consulta previa en la confirmación |
| Restaurar | Ya lo tenía | Aplicado, igual | No aplica |
| Conteo | Aplicado: `403`, `409 CLASE_NO_ARCHIVADA` y `409 CLASE_YA_ARCHIVADA` | No aplica: es una consulta. Al reabrir se pide de nuevo, y se saca de la caché al cerrar | Aplicado |
| Borrar | Aplicado solo a `403`; el `409 CLASE_NO_ARCHIVADA` sigue la matriz (sin renovar) | Ya cubierto: el diálogo no se cierra en vuelo y es modal, así que ni cambiar de pestaña ni Escape lo desmontan (ADM-T1C04) | Con el borrado en vuelo, el conteo confirmado se queda y no se mezcla con un error de recarga |
| Duplicar | No aplica: la vista no tiene una fila que quede vieja. Una clase que ya no existe da `403` en el detalle y no pinta el formulario (ADM-T1C16) | No aplica: un formulario nuevo es otra copia que la persona pide. La misma instancia ya tiene su ref y `isPending` (ADM-T1C13) | No aplica |

**Estados vecinos:**
- **En vuelo con la vista desmontada:** archivar y restaurar avisan desde las opciones de la mutación, una vez. Al volver, la fila ve la petición en vuelo, si sigue, y no deja mandar otra. El borrado avisa el éxito una vez y su error solo con el diálogo desmontado (ADM-T1C05).
- **En vuelo al cambiar de pestaña:** archivar y restaurar quedan en espera al volver (ADM-T1C06 y 08). El diálogo de borrar no deja cambiar de pestaña (modal).
- **`403`:** archivar, restaurar, conteo y borrar renuevan las listas.
- **`409`:** archivar, restaurar y conteo renuevan. El `409` de borrar solo se muestra en el diálogo (matriz).
- **`5xx` y red:** sin cambios. Un aviso en archivar y restaurar, y en el diálogo el error, sin botón de borrar si el que falló es el conteo.
- **Reconexión:** el conteo se vuelve a pedir; si falla, solo el error. La lista se vuelve a pedir como hoy: `refetchOnReconnect` en la caché.

### Matriz de avisos y recargas (filas que cambian)

| Disparador | Clase de error | Qué se renueva | Qué se anuncia | Foco |
|---|---|---|---|---|
| Conteo, al abrir o al reconectar | `403 SIN_ACCESO_A_LA_CLASE`, `409 CLASE_NO_ARCHIVADA` o `CLASE_YA_ARCHIVADA` | **Las dos listas del admin, inscritas e impartidas y el detalle** (antes: solo al reabrir) | `403`: la frase de recuperación; `409 CLASE_NO_ARCHIVADA`: el texto del servidor. Sin botón de borrar | «Cancelar»; al cerrar, la fila vecina si la fila ya salió |
| Conteo, al reconectar | `5xx` o red | Al reabrir | La frase de recuperación **en lugar** del conteo y del botón | Se queda en el diálogo |
| «Sí, borrar definitivamente» | `403 SIN_ACCESO_A_LA_CLASE` | **Las dos listas del admin, inscritas e impartidas y el detalle** | Un `MensajeError` en el diálogo | En el botón; al cerrar, la fila vecina |
| «Sí, archivar» / «Restaurar», en vuelo | Cualquiera | Igual que antes | Igual que antes | Tras volver a montar la fila: el botón en espera. «Cancelar» de la confirmación no la cierra |

### M-02 (verificación del manager, `revision.md:2989`): corregido

**Defecto.** Al cerrar el diálogo de una fila que ya había salido de la lista, `useFocoAlQuitarUnaClase` buscaba su lugar con `previos.indexOf`. Esa fila ya no estaba en la lista anterior, así que daba −1, se acotaba a 0 y el foco iba a la primera fila.

**Remedio.** En `features/clases/hooks.ts`, el gancho guarda el último lugar en que vio cada fila (`ultimoLugar`, un `Map` de `id` a índice), actualizado en cada render con datos. Al decidir el foco, lee el lugar de la fila que salió de ese mapa, aunque haya salido varios renders antes, y va a:
- la que ocupa ese lugar ahora, que es la siguiente;
- la anterior, si era la última;
- el `h1`, si la lista quedó vacía.

`idsPrevios` desaparece. No cambia ningún otro archivo de producción.

**Comprobación de que los casos detectan el defecto.** Cambié a mano el cálculo a `Math.min(0, …)`, que es el comportamiento viejo, y corrí `npx vitest run src/features/clases/clases-admin-01c.test.tsx -t "M-02"` → `Tests  11 failed | 4 passed | 54 skipped (69)`. Después restauré el archivo desde una copia y `cmp` dio igual. Los cuatro que pasan con el cálculo viejo son los de la primera fila y el de la lista vacía, que no distinguen el defecto.

**Casos nuevos**, en `frontend/src/features/clases/clases-admin-01c.test.tsx`, 15 en total (`npx vitest list src/features/clases/clases-admin-01c.test.tsx`, `grep -a -c "M-02"` = 15):
- "M-02: con la primera de tres filas, el conteo responde 403 y se cierra con «Cancelar»: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: con la primera de tres filas, el conteo responde 403 y se cierra con Escape: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: con la primera de tres filas, el DELETE responde 403 y se cierra con «Cancelar»: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: con la de en medio de tres filas, el conteo responde 403 y se cierra con «Cancelar»: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: con la de en medio de tres filas, el conteo responde 403 y se cierra con Escape: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: con la de en medio de tres filas, el DELETE responde 403 y se cierra con «Cancelar»: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: con la última de tres filas, el conteo responde 403 y se cierra con «Cancelar»: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: con la última de tres filas, el conteo responde 403 y se cierra con Escape: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: con la última de tres filas, el DELETE responde 403 y se cierra con «Cancelar»: el foco va al «Borrar definitivamente» de la vecina"
- "M-02: si la fila era la única, el foco va al encabezado «Clases»"
- "M-02: con dos páginas cargadas, la fila de la segunda página que ya salió deja el foco en su vecina"
- "M-02: al reconectar, si la fila con el foco ya no está en la lista renovada, el foco va al mismo control de la vecina"
- "M-02: borrar con éxito la fila de en medio lleva el foco al mismo control de la siguiente"
- "M-02: restaurar con éxito la fila de en medio lleva el foco al mismo control de la siguiente"
- "M-02: archivar con éxito la fila de en medio lleva el foco al mismo control de la siguiente"

Las vecinas que comprueban los tres casos de cada lugar:
- con la primera fila, la vecina es Clase 6;
- con la de en medio, Clase 7, la siguiente;
- con la última, Clase 6, la anterior.

**Hermanos y estados vecinos del mecanismo (foco al quitar una fila; un solo gancho, `useFocoAlQuitarUnaClase`):**

| Estado o camino | ¿Pasa por el gancho? | ¿El remedio aplica? | Caso |
|---|---|---|---|
| Diálogo cerrado con «Cancelar»; la fila salió por el conteo `403` | Sí (`marcarBorrada` desde `alCerrarElBorrado`) | Sí | Primera, de en medio y última |
| Ídem, cerrado con Escape | Sí, por el mismo `onCerrar` (`onOpenChange`) | Sí | Primera, de en medio y última |
| La fila salió por el `DELETE` con `403` | Sí | Sí | Primera, de en medio y última |
| Conteo con `409 CLASE_NO_ARCHIVADA` o `CLASE_YA_ARCHIVADA` | Sí: renueva igual que el `403` | Sí, mismo cálculo | Cubierto por los del `403` (mismo camino de código); el caso de la ronda 1 "hermano de T-01: el conteo con 409 CLASE_NO_ARCHIVADA…" comprueba que la fila sale |
| La lista queda vacía | Sí: no hay vecina → `h1` | Sí | "si la fila era la única" |
| Varias páginas cargadas | Sí: los `ids` son la unión sin repetidos | Sí | "con dos páginas cargadas…" |
| La fila que sale al reconectar con el foco dentro | Sí (`useFilaEnFoco`) | Sí; antes también caía a la primera si la fila había salido antes | "al reconectar…" |
| Borrar con éxito | Sí: la fila sale después de que el diálogo se cierra | Sí, no se rompe | "borrar con éxito la fila de en medio…" |
| Restaurar con éxito, «Archivadas» | Sí, por el foco en la fila | Sí | "restaurar con éxito…" |
| Archivar con éxito, «Activas» | Sí | Sí | "archivar con éxito…" |
| `409` de archivar o restaurar (la fila sale al renovarse) | Sí, por el foco en la fila | Sí, mismo cálculo | El caso de 01c "ADM-1C02: 409 CLASE_YA_ARCHIVADA…" (vecina siguiente) |
| Cerrar el diálogo sin que la fila haya salido | No (`useFocoAlCerrarElBorrado` devuelve el foco al botón que lo abrió) | No aplica | ADM-1C09 y ADM-T1C04 |
| Lista en error o cambio de pestaña | El gancho no actúa sin `ids`: manda `useFocoAlPasarAError` | No aplica | Vigiladas `foco-02c-r3` y `-r4` |

### Verificación de M-02 (desde `frontend/`; puerta de carga 16:36:39 `cpu=4` y 16:36:49 `cpu=15`)
- **lint:** `npm run lint` → exit 0; `All matched files use Prettier code style!` y `> tsc -b` sin errores.
- **build:** `npm run build` → exit 0, `✓ built in 866ms`.
- **test:** `npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx` (16:36:52) → `Test Files  134 passed (134)` · `Tests  2497 passed (2497)`, es decir, 2482 más los 15 casos de M-02.
- Antes, `clases-admin-01c.test.tsx` solo: `Tests  69 passed (69)`.
- **V-01:** las 256 de la lista `ac79306a…` dan 0 diferencias con `sha256sum -c`. Con `clases-admin-01c-r1.ataque.test.tsx` = `1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65`, son 257. No toqué ninguna `*.ataque`.
- **Archivos de esta corrección:** `frontend/src/features/clases/hooks.ts` y `frontend/src/features/clases/clases-admin-01c.test.tsx`, mío (casos nuevos y el import de `onlineManager`).

**Matriz (columna de foco, filas que corrige M-02).** Conteo con `403` o `409`, y «Sí, borrar definitivamente» con `403`: al cerrar el diálogo, el foco va a la fila siguiente, a la anterior si era la última, o al `h1` si no queda ninguna.

## ADMIN-01c — Corrección ronda 2 (2026-11-05)

Plan `3822b6c0…`. Fuente: `reporte-tester.md`, "## Ronda 2 — ADMIN-01c" (línea 2065), y ADM-T2C04 de `frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx`, que no toqué. Es la ronda de corrección 2 de 3. Sin navegadores y sin commit.

### T-04: corregido

**Causa:** `conteoFallo = conteo.isError && !borrar.isPending`. En cuanto el `DELETE` dejaba de estar pendiente, el error del conteo, pedido otra vez al reconectar, volvía a la vista junto al error del borrado.

**Regla de qué mensaje gana:** el diálogo muestra un solo mensaje, el del último envío de la persona.
1. Antes de pulsar «Sí, borrar definitivamente» en esta apertura, manda el conteo. Si falla, también cuando se vuelve a pedir al reconectar, su error sustituye al conteo y al botón (T-03).
2. Desde que lo pulsa (el borrado en vuelo o ya respondido con error), manda el borrado. Se ven el conteo que la persona confirmó, el botón y, si falló, solo el error del borrado. Un error posterior del conteo ya no se muestra.
3. Al cerrar el diálogo, el borrado vuelve a reposo (`reset()`) y el conteo sale de la caché: la siguiente apertura empieza en el punto 1.

**Remedio:** en `frontend/src/features/clases/components/dialogo-borrar-clase.tsx`, la condición pasa a `conteoFallo = conteo.isError && borrar.isIdle`, con la regla escrita en el comentario. El conteo se sigue pidiendo al reconectar, como exigen ADM-T1C19 y ADM-T2C04; solo cambia qué se muestra. No cambia ningún otro archivo de producción.

**Comprobación de que los casos detectan el defecto:** devolví a mano la condición vieja (`!borrar.isPending`) y corrí `npx vitest run src/features/clases/clases-admin-01c.test.tsx -t "T-04"` → `Tests  5 failed | 3 passed | 69 skipped (77)`. Después restauré el archivo desde una copia y `cmp` dio igual. Los tres que pasan con la condición vieja son el `204`, el de antes de enviar y el de cerrar y reabrir, que no dependen del orden de llegada.

### Tabla completa del mecanismo (qué muestra el diálogo y dónde queda el foco)
"Conteo + botón" = el texto del conteo y «Sí, borrar definitivamente». Una sola fila por combinación; la regla es la de arriba.

| Estado del conteo | Estado del `DELETE` | Qué se muestra | Foco | Caso que lo cubre |
|---|---|---|---|---|
| Cargando (primera vez) | Sin enviar | `Cargando`, sin botón | «Cancelar» (inicial) | ADM-1C04 |
| Con datos | Sin enviar | Conteo + botón | «Cancelar» | ADM-1C04 |
| Error (sin datos) | Sin enviar | Un mensaje: la frase de recuperación, o el texto del servidor con `409 CLASE_NO_ARCHIVADA`; sin botón | «Cancelar» | ADM-1C06, ADM-T1C01, "hermano de T-01: el conteo con 409…" |
| Error tras tener datos (reconexión) | Sin enviar | Un mensaje, la frase; sin conteo ni botón | Se queda en el diálogo | ADM-T1C19; "T-04: antes de enviar…" |
| Nueva petición en vuelo con datos | Sin enviar | Conteo + botón (los datos que ya había) | Sin cambio | "T-04: antes de enviar…" (la segunda reconexión) |
| Con datos, o nueva petición en vuelo | En vuelo | Conteo + botón en espera, sin mensaje | El botón | ADM-1C04; ADM-T2C04 (antes de responder) |
| Error tras tener datos (reconexión durante el envío) | En vuelo | Conteo confirmado + botón en espera, sin mensaje | El botón | ADM-T2C04; "T-04: el conteo que se vuelve a pedir al reconectar falla con el DELETE en vuelo…" (los 3) |
| Cualquiera | `204` | El diálogo se cierra; aviso "Clase borrada" | «Borrar definitivamente» de la vecina, o el `h1` | ADM-1C04; M-02 "borrar con éxito…"; "T-04: … y después el DELETE responde 204…" |
| Con datos, o error del conteo antes o después | `403` | Un mensaje, "No tienes acceso a esta clase."; conteo + botón; las listas se renuevan | El botón; al cerrar, la vecina (M-02) | ADM-T1C02; M-02 (`DELETE` 403); "T-04: el DELETE responde 403… y después el conteo… falla" |
| Con datos, o error del conteo antes o después | `409 CLASE_CON_COPIAS_EN_CURSO` | Un mensaje, el texto del servidor; conteo + botón | El botón | ADM-1C04, ADM-1C11 (a) |
| Con datos, o error del conteo antes o después | `409 CLASE_NO_ARCHIVADA` | Un mensaje, el texto del servidor; conteo + botón; sin renovar (matriz) | El botón | "matriz de 01c: … 409 CLASE_NO_ARCHIVADA…"; los dos de T-04 con `409` (conteo falla antes y después) |
| Con datos, o error del conteo antes o después | `5xx` | Un mensaje, el genérico; conteo + botón | El botón | ADM-T2C04 (el conteo falla antes); "T-04: el DELETE responde 500 y después el conteo…" |
| Con datos, o error del conteo antes | Red | Un mensaje, el de red del módulo; conteo + botón | El botón | "T-04: … y después el DELETE responde sin conexión…" |
| Con datos | `VALIDACION` fuera de contrato | Un mensaje legible; conteo + botón | El botón | ADM-1C15 (5 casos) |
| Después de cerrar y volver a abrir | Reposo otra vez | Como "Cargando" y después "Con datos"; ningún mensaje viejo | «Cancelar» | ADM-1C11 (b) y (c), ADM-1C15 (e), "T-04: tras un error del borrado, cerrar y volver a abrir…" |
| Cualquiera | En vuelo y la persona cierra (Escape o «Cancelar») | No se cierra | Se queda en el diálogo | ADM-T1C04 |
| Cualquiera | En vuelo y la vista se desmonta | Sin diálogo; el gancho avisa el éxito, y el error solo con el diálogo desmontado | — | ADM-T1C05 |

**Órdenes de llegada, uno por uno:**
- El conteo falla antes de que el `DELETE` responda: gana el `DELETE` (500, 409, red y 204 probados).
- El conteo falla después de que el `DELETE` respondió con error: gana el `DELETE` (500, 409 y 403 probados).
- El conteo falla antes de pulsar: gana el conteo (T-03).

### Casos nuevos
En `frontend/src/features/clases/clases-admin-01c.test.tsx`, que es mío; son 8, del bloque "T-04: qué mensaje muestra el diálogo de borrado (un solo mensaje, el del último envío)":
- "T-04: el DELETE responde 500 y después el conteo que se vuelve a pedir al reconectar falla: un solo mensaje, el del borrado, con el conteo confirmado y el botón, y el foco en el botón"
- "T-04: el DELETE responde 409 CLASE_NO_ARCHIVADA y después el conteo que se vuelve a pedir al reconectar falla: un solo mensaje, el del borrado, con el conteo confirmado y el botón, y el foco en el botón"
- "T-04: el DELETE responde 403 SIN_ACCESO_A_LA_CLASE y después el conteo que se vuelve a pedir al reconectar falla: un solo mensaje, el del borrado, con el conteo confirmado y el botón, y el foco en el botón"
- "T-04: el conteo que se vuelve a pedir al reconectar falla con el DELETE en vuelo y después el DELETE responde 409 CLASE_NO_ARCHIVADA: un solo mensaje, el del borrado, y el foco en el botón"
- "T-04: el conteo que se vuelve a pedir al reconectar falla con el DELETE en vuelo y después el DELETE responde sin conexión: un solo mensaje, el del borrado, y el foco en el botón"
- "T-04: el conteo que se vuelve a pedir falla con el DELETE en vuelo y después el DELETE responde 204: sin mensajes, el diálogo se cierra, un aviso y el foco en la fila vecina"
- "T-04: antes de enviar, el conteo que se vuelve a pedir y falla sustituye al conteo y al botón; si después responde, vuelven el conteo y el botón, sin mensaje"
- "T-04: tras un error del borrado, cerrar y volver a abrir empieza sin mensajes, con el conteo nuevo y el botón disponible"

El caso de 500 con el conteo fallando antes es ADM-T2C04, del tester.

### Verificación (desde `frontend/`; puerta de carga antes de cada corrida)
- **lint:** `npm run lint` → exit 0; `All matched files use Prettier code style!` y `> tsc -b` sin errores.
- **build:** `npm run build` → exit 0, `✓ built in 789ms`.
- **test:** `npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx` (17:07:36; puerta 17:07:23 `cpu=21` y 17:07:33 `cpu=20`) → `Test Files  135 passed (135)` · `Tests  2513 passed (2513)`.
  - Son 2505 de la corrida del tester más mis 8. ADM-T2C04 ya pasa.
  - Una corrida anterior de la misma suite (17:04:53; puerta 17:04:40 `cpu=8` y 17:04:51 `cpu=12`) dio `Tests  2513 passed (2513)`. Durante ella lancé por error un `npx vitest list` del archivo mío. Por eso la repetí limpia, sin nada en paralelo, y la que vale es la de arriba.
- Antes: `npx vitest run src/features/clases/clases-admin-01c.test.tsx src/features/clases/clases-admin-01c-r2.ataque.test.tsx src/features/clases/clases-admin-01c-r1.ataque.test.tsx` → `Tests  108 passed (108)` (77 + 8 + 23).
- **Conteo:** `npx vitest list src/features/clases/clases-admin-01c.test.tsx`, con `grep -a "T-04"`: 8 casos.

### V-01
- Las 256 de la lista `ac79306a…` dan 0 diferencias con `sha256sum -c`.
- Más las dos del tester, sin rastrear:
  - `clases-admin-01c-r1.ataque.test.tsx` = `1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65`;
  - `clases-admin-01c-r2.ataque.test.tsx` = `76b5b2522f60795c0e7672da7b10ea95a3ce61d1aa26f102ef8eb057bd3ce6d9`.
- En total, 258. No toqué ninguna `*.ataque`.

**Archivos de esta corrección:** `frontend/src/features/clases/components/dialogo-borrar-clase.tsx` y `frontend/src/features/clases/clases-admin-01c.test.tsx`.

### Estados vecinos antes de la ronda 3

Fuente: `revision.md`, "## Verificación de la corrección de la ronda 2 — ADMIN-01c" (línea 3194), con sus tres estados vecinos y sus puntos de ataque. Ninguna decisión cambia un texto ni un comportamiento que fije el plan: el `409 CLASE_NO_ARCHIVADA` del `DELETE` sigue sin renovar (matriz), y la frase del conteo es la de §D-10. No es PARADA.

**Regla ampliada (en el comentario de `dialogo-borrar-clase.tsx`):** un solo mensaje, el del último envío de la persona.
1. **Antes de pulsar** «Sí, borrar definitivamente» en esta apertura, manda el conteo. Si falla, su error sustituye al conteo y al botón.
2. **Desde que se pulsa,** manda el borrado:
   - se ve el **conteo confirmado, congelado** desde el primer clic de esta apertura (vecino 1);
   - se ven también el botón y, si falló, solo el error del borrado;
   - un error posterior del conteo no se muestra.
3. **Excepción (vecino 3):** con el borrado ya respondido, si el conteo dice que la clase ya no existe (`403 SIN_ACCESO_A_LA_CLASE`, porque otra pestaña la borró), eso gana:
   - la frase "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo." sustituye al mensaje del borrado y al botón, porque volver a borrar no puede servir;
   - el foco va a «Cancelar»;
   - las listas ya se renovaron (T-01), así que al cerrar la fila ya no está y la frase se cumple;
   - con el borrado en vuelo, se espera a que responda.
4. **Vecino 2:** un error con que `apiClient` redirige (`CODIGOS_QUE_REDIRIGE_EL_CLIENTE`: `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`, `NO_AUTENTICADO`) no se pinta ni se anuncia, ni del borrado ni del conteo. Usa el mismo `errorQueRedirigeElCliente` que ya usan `mis-calificaciones-view.tsx:126`, `hilo-privado.tsx:174`, `entrega-de-alumno-view.tsx:122` y `entregas-view.tsx:110`. El aviso con la vista desmontada ya lo omitía (`avisarErrorConElFormularioDesmontado`).
5. **Al cerrar,** el borrado vuelve a reposo y el conteo sale de la caché. La siguiente apertura es un diálogo nuevo (`key`), sin conteo congelado.

**Remedio**, solo en `frontend/src/features/clases/components/dialogo-borrar-clase.tsx`:
- `confirmado` (estado): el conteo a la vista en el primer clic de la apertura. `conteoVisible` lo usa mientras el borrado no está en reposo.
- `conteoQueRedirige`, `yaNoExiste`, `conteoFallo` (reposo **o** `yaNoExiste`, y nunca con código que redirige) y `borradoFallo` (error del borrado, sin `conteoFallo` ni código que redirige).
- Un efecto lleva el foco a «Cancelar» cuando el botón desaparece con el foco dentro.

No cambia ningún otro archivo de producción.

**Comprobación de que los casos detectan el comportamiento anterior:** puse la versión del diálogo de la ronda 2 (copia) y corrí `npx vitest run src/features/clases/clases-admin-01c.test.tsx -t "vecino"` → `Tests  7 failed | 5 passed | 75 skipped (87)`. Después restauré el archivo y `cmp` dio igual.
- Fallan los 7 casos que cubren cambios: vecino 1, los 4 de vecino 2, vecino 3 y la sustitución por la frase tras el `403` del `DELETE`.
- Pasan, y quedan como cobertura de los órdenes que pidió el manager: `409` de copias con reconexión, dos reconexiones y Escape.
- El filtro "vecino" también alcanza dos títulos viejos de 01c (ADM-1C03 y ADM-1C04).

**Casos nuevos:** 10, en `frontend/src/features/clases/clases-admin-01c.test.tsx`, bloque "estados vecinos antes de la ronda 3: el diálogo de borrado".
- "vecino 1: tras un error del DELETE, el conteo que se vuelve a pedir responde otras cifras: se sigue viendo el conteo confirmado, con un solo mensaje, también durante el segundo intento"
- "vecino 2: el DELETE responde 403 ACCESO_RESTRINGIDO, con que apiClient redirige: el diálogo no pinta ni anuncia ningún mensaje y no hay aviso"
- "vecino 2: el DELETE responde 403 CAMBIO_DE_CONTRASENA_REQUERIDO, con que apiClient redirige: el diálogo no pinta ni anuncia ningún mensaje y no hay aviso"
- "vecino 2: el DELETE responde 401 sin refresco (NO_AUTENTICADO), con que apiClient redirige: el diálogo no pinta ni anuncia ningún mensaje y no hay aviso"
- "vecino 2: el conteo que se vuelve a pedir responde con un código con que apiClient redirige: el diálogo no pinta ni anuncia ningún mensaje"
- "vecino 3: tras un error del DELETE, el conteo responde 403 (otra pestaña la borró): un solo mensaje, la frase del conteo, sin «Sí, borrar definitivamente», el foco en «Cancelar», la fila sale y al cerrar el foco va a la vecina"
- "vecino: 409 CLASE_CON_COPIAS_EN_CURSO y después una reconexión cuyo conteo falla: un solo mensaje, el del borrado, con el conteo confirmado y el botón"
- "vecino: una reconexión con el conteo sano y después el DELETE responde 403: un solo mensaje, el del borrado; otra reconexión cuyo conteo responde 403 lo sustituye por la frase, sin botón"
- "vecino: dos reconexiones, una con el DELETE en vuelo y otra después de su error, con el conteo fallando las dos veces: un solo mensaje, el del borrado"
- "vecino: Escape justo cuando el DELETE responde con error: el diálogo se cierra limpio, sin aviso; el foco vuelve a «Borrar definitivamente» y al volver a abrir no queda ningún mensaje"

"Un segundo intento con una reconexión en medio" lo cubre vecino 1: el segundo `DELETE` sale después de la reconexión, sin el mensaje viejo durante el vuelo y con solo el nuevo al responder.

**Tabla del mecanismo actualizada.** Filas nuevas o cambiadas respecto de la tabla de la ronda 2; las demás no cambian.

| Estado del conteo | Estado del `DELETE` | Qué se muestra | Foco | Caso |
|---|---|---|---|---|
| Se vuelve a pedir y responde otras cifras | Con error (o en vuelo, en el segundo intento) | El conteo **confirmado** (congelado), el botón y un solo mensaje, el del borrado; en vuelo, ninguno | El botón | vecino 1 |
| Cualquiera | Error con código que redirige (`ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`, `NO_AUTENTICADO`) | Ningún mensaje ni aviso; conteo y botón (la página se va) | El botón | vecino 2 (3 casos) |
| Error con código que redirige | Sin enviar | Ningún mensaje: el conteo que había, o `Cargando` sin datos | Sin cambio | vecino 2 (conteo) |
| `403` (la clase ya no existe) tras el error del `DELETE` | Con error (`500` o `403`) | **Un mensaje, la frase del conteo; sin botón**; la fila sale de la lista | «Cancelar»; al cerrar, la vecina (M-02) | vecino 3; "vecino: una reconexión con el conteo sano y después el DELETE responde 403…" |
| `403` con el `DELETE` en vuelo | En vuelo | Conteo confirmado y botón en espera; se decide al responder | El botón | Por la regla (`yaNoExiste` exige que no esté en vuelo); con `204` se cierra (ronda 2) |
| Falla (`500`) tras una reconexión | `409 CLASE_CON_COPIAS_EN_CURSO` | Un mensaje, el del borrado; conteo confirmado y botón | El botón | "vecino: 409 CLASE_CON_COPIAS_EN_CURSO y después una reconexión…" |
| Falla en dos reconexiones (con el `DELETE` en vuelo y después de su error) | `500` | Un mensaje, el genérico del borrado | El botón | "vecino: dos reconexiones…" |
| Con datos | `500` y Escape en el mismo instante | Si el error llega primero, el diálogo se cierra con Escape, sin aviso; si Escape llega en vuelo, no se cierra y se cierra con el siguiente | Al cerrar, «Borrar definitivamente» de esa fila; al reabrir, sin mensajes | "vecino: Escape justo cuando…" |

**Verificación** (desde `frontend/`; puerta de carga 19:12:44 `cpu=4` y 19:12:54 `cpu=7`):
- **lint:** `npm run lint` → exit 0; `All matched files use Prettier code style!` y `> tsc -b` sin errores.
- **build:** `npm run build` → exit 0, `✓ built in 854ms`.
- **test:** `npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx` (19:12:57) → `Test Files  135 passed (135)` · `Tests  2523 passed (2523)`, es decir, 2513 más los 10 nuevos.
- **Conteo:** `npx vitest list src/features/clases/clases-admin-01c.test.tsx`, corrido después de la suite y solo, con `grep -a "vecino"`: 12 títulos, que son los 10 nuevos más los dos viejos de ADM-1C03 y ADM-1C04 que dicen "vecino".
- Antes: `npx vitest run src/features/clases/clases-admin-01c.test.tsx src/features/clases/clases-admin-01c-r2.ataque.test.tsx src/features/clases/clases-admin-01c-r1.ataque.test.tsx` → `Tests  118 passed (118)` (87 + 8 + 23).
- **V-01:** 258. Las 256 de `ac79306a…` dan 0 diferencias con `sha256sum -c`; `clases-admin-01c-r1` = `1cc30b08…` y `clases-admin-01c-r2` = `76b5b252…`, del tester, sin cambios. No toqué ninguna `*.ataque`.
- Fuera de `frontend/` no cambia nada: `git diff --name-only 52f1c97 -- backend shared infra` está vacío.
- **Archivos:** `frontend/src/features/clases/components/dialogo-borrar-clase.tsx` y `frontend/src/features/clases/clases-admin-01c.test.tsx`.

### M-03 (verificación del manager, `revision.md:3289`): corregido

**Causa:** el caso "vecino: Escape justo cuando el DELETE responde con error…" soltaba el `500`, esperaba un solo `setTimeout(0)` y mandaba Escape. Si la respuesta aún no se había procesado, el diálogo seguía en vuelo y, como está decidido, no se cerraba. A mí me pasó en verde por azar del orden; al manager le falló siempre.

**Remedio**, solo en pruebas mías. No toqué código de producción: `cmp` contra la copia de `dialogo-borrar-clase.tsx` de la ronda anterior da igual. Tampoco toqué ninguna `*.ataque`.
- El caso se parte en dos, deterministas. El estado del borrado se lee del botón (`aria-busy`) y de la aparición del `MensajeError` con `findBy` y `waitFor`, nunca de una espera fija.
  - "vecino: Escape con el DELETE en vuelo no cierra el diálogo: el botón sigue en espera y el foco dentro; al responder con error, un solo mensaje y el botón sale de la espera"
  - "vecino: Escape en cuanto el DELETE respondió con error: el diálogo se cierra limpio, sin aviso; el foco vuelve a «Borrar definitivamente» y al volver a abrir no queda ningún mensaje"
- Nuevas ayudas en `clases-admin-01c.test.tsx`:
  - `asentado()` espera a que la caché no tenga ninguna consulta ni mutación en vuelo (`isFetching() === 0` e `isMutating() === 0`);
  - `sinConsultasEnVuelo()` espera solo las consultas, para cuando el `DELETE` sigue retenido a propósito.
  - Las dos sustituyen a `reposar(…)`, que sale del archivo.

**Esperas revisadas, una por una**
`clases-admin-01c.test.tsx` (con los números de línea de antes de esta corrección):

| Línea | Lo que hacía | ¿Le pasaba lo mismo? | Cambio |
|---|---|---|---|
| 351 (ADM-1C02) | `reposar()` y luego `aria-busy` y una sola petición | Sí, podía comprobar `aria-busy` antes del render | `waitFor(aria-busy)`, un tercer clic y la cuenta |
| 387 (ADM-1C02, `409`) | `reposar()` tras `waitFor` de la fila | No: el aviso sale antes de renovar | `asentado()` |
| 406 (ADM-1C03) | `reposar()` y una sola petición | Sí, igual que 351 | `waitFor(aria-busy)`, un tercer clic y la cuenta |
| 466 (ADM-1C04) | `reposar()` y un solo `DELETE` | Sí, igual | `waitFor(aria-busy)`, un tercer clic y la cuenta |
| 475 (ADM-1C04) | `reposar()` y el foco | Sí: el foco se mueve en un efecto | `waitFor(toHaveFocus)` |
| 512 (ADM-1C04, `409`) | `reposar()` tras `findByRole("alert")` | No, pero arreglado igual | `asentado()` |
| 603 (ADM-1C05) | `reposar()` tras el `POST` y luego el aviso o el error de campo | Sí: la respuesta podía no haberse procesado | `waitFor(no aria-busy)` y `asentado()` |
| 784 (ADM-1C08/1C16 d) | `reposar()` y `aria-busy` | Sí, igual que 351 | `waitFor(aria-busy)` |
| 851 (ADM-1C16 c) | `reposar()` tras `findByRole("alert")` | No, pero arreglado igual | `asentado()` |
| 994 (matriz, `409` del `DELETE`) | `reposar()` tras `findByRole("alert")` | No, pero arreglado igual | `asentado()` |
| 1215, 1259, 1301, 1400, 1454, 1502, 1552, 1559 (T-04 y vecinos) | `reposar(100/150)` tras la nueva petición del conteo, antes de afirmar que su error no se ve | Sí: la respuesta del conteo podía no haberse procesado y la afirmación negativa pasaba sin probar nada | `sinConsultasEnVuelo()` |
| 1268 (T-04, `204`) | `act` con `await Promise.resolve()` y `reposar(150)` | Sí, por el mismo motivo | `soltar` sin `act` y `asentado()` |
| 1439 (vecino 2, `DELETE` que redirige) | `reposar(150)` tras `waitFor(no aria-busy)` | No, pero arreglado igual | `asentado()` |
| 1577 y 1584 (Escape) | `setTimeout(0)` dentro de `act`, un segundo Escape condicional y `reposar(150)` | Sí: es M-03 | Dos casos nuevos (arriba) |
| 171 (`retener`) | `new Promise` de la respuesta retenida | No es una espera: la prueba la suelta | Sin cambio |

`clases-admin-01c-rutas.test.tsx`:
- `reposar()` en los caminos de 259, 276, 379 y 398: tras cambiar de pestaña, el siguiente clic dependía de que el cambio ya se hubiera aplicado. Sí podía fallar: un clic sobre la pestaña que todavía figuraba como activa no hace nada. Pasan a `enLaPestana(nombre)`, un `waitFor` sobre `aria-pressed`.
- Los demás `reposar()` del archivo (268, 284 a 288, 389, 510, 520, 522) solo marcan el ritmo entre navegaciones. Lo que se comprueba después va con `findBy` o `waitFor` y espera hasta 6 s, así que no les pasa lo mismo. Sin cambio.

`unir-paginas.test.ts`: no tiene ninguna espera (es una función pura).

**Verificación** (desde `frontend/`, con la puerta de carga antes de cada corrida)
- **lint:** `npm run lint` → exit 0; `All matched files use Prettier code style!` y `> tsc -b` sin errores.
- **build:** `npm run build` → exit 0, `✓ built in 807ms`.
- **El archivo solo, tres veces:** `npx vitest run src/features/clases/clases-admin-01c.test.tsx`
  - 19:28:54 (puerta 19:28:41 `cpu=1` y 19:28:51 `cpu=11`) → `Tests  88 passed (88)`;
  - 19:29:44 (19:29:31 `cpu=23` y 19:29:42 `cpu=15`) → `Tests  88 passed (88)`;
  - 19:30:16 (19:30:03 `cpu=25` y 19:30:13 `cpu=20`) → `Tests  88 passed (88)`.
  - Son 87 de antes más 1, porque el caso de Escape se partió en dos.
- **Suite de módulos, dos veces:** `npx vitest run src/features/clases src/lib src/styles src/components/adjuntos src/app/rutas-02c-r1.ataque.test.tsx src/components/layout/estatico-r1.ataque.test.ts src/app/marco-r1.ataque.test.tsx src/app/barra-02d-r1.ataque.test.tsx src/components/layout/contenedor-rol.test.tsx`
  - 19:32:44 (puerta 19:32:31 `cpu=23` y 19:32:42 `cpu=11`) → `Test Files  135 passed (135)` · `Tests  2524 passed (2524)`;
  - 19:35:55 (puerta 19:35:42 `cpu=23` y 19:35:53 `cpu=23`) → `Test Files  135 passed (135)` · `Tests  2524 passed (2524)`.
  - Son 2523 más 1, por el caso partido. Las dos corridas incluyen `clases-admin-01c-rutas.test.tsx` y las dos `*.ataque` del tester.
- **V-01:** 258. Las 256 de `ac79306a…` dan 0 diferencias con `sha256sum -c`; `clases-admin-01c-r1` = `1cc30b08…` y `clases-admin-01c-r2` = `76b5b252…`, sin cambios.
- **Archivos:** `frontend/src/features/clases/clases-admin-01c.test.tsx` y `frontend/src/features/clases/clases-admin-01c-rutas.test.tsx`, los dos míos.

## ADMIN-01d1 — Implementación (2026-11-05)

Plan: `docs/trabajo/ADMIN-01-administracion/plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78` (Enmiendas 1 a 10; comprobado al empezar). Base dentro de los paquetes: `3ae6a00`. Ronda 0 leída (O-01d1-1 a O-01d1-14). La otra copia de trabajo no se usa. Sin navegadores. Sin commit. 01d1 no toca `shared/` ni el backend.

Pasos completados: 3 de 3 (16, 17 y 18). Sin PARADA:
- ninguna prueba normal fuera de la lista cerrada (vacía) cambió ni falló;
- ningún archivo fuera de "Se toca";
- ninguna vigilada cambió;
- C-10 en verde por la razón esperada;
- ningún texto fuera del plan;
- ningún código fijo nuevo en los mapas de errores.

### Archivos
- **Nuevos (producción):**
  - `frontend/src/components/clase/contexto-de-solo-lectura.ts`;
  - `components/clase/hooks.ts` (`useSoloLecturaDeLaClase`);
  - `components/clase/lib.ts` (`esClaseArchivada`);
  - `features/clases/components/aviso-de-clase-archivada.tsx`;
  - `features/clases/components/categorias-de-solo-lectura.tsx`.
- **Modificados (producción):**
  - `components/clase/data.ts` (`TEXTOS_DE_LA_CLASE.archivada`);
  - `features/clases/clase-layout.tsx`;
  - `features/clases/lib.ts` (`estaArchivada`);
  - `features/clases/data.ts` (`TEXTOS_CLASE_ARCHIVADA`);
  - `features/clases/hooks.ts`: el ayudante, `useDetalleViejoAnteClaseArchivada`, `useFocoAlTituloDeLaClase` y el ayudante en 24 `onError`;
  - en `features/clases/`: `components/encabezado-clase.tsx`, `muro-view.tsx`, `components/publicacion-del-muro.tsx`, `components/comentarios-de-publicacion.tsx`, `trabajo-view.tsx`, `components/seccion-de-tema.tsx`, `categorias-view.tsx`, `recursos-view.tsx`, `components/elemento-de-recurso.tsx`, `editar-recurso-view.tsx` y `editar-clase-view.tsx`.
- **Sin cambios aunque estaban en "Se toca":** `components/elemento-de-trabajo.tsx` (fila 14; abajo, decisión 3).
- **Nuevos (pruebas):** `frontend/src/features/clases/clase-archivada-01d1.test.ts` y `frontend/src/features/clases/clase-archivada-01d1-vista.test.tsx`.
- **Lista cerrada:** vacía (§D-R0 01d1); ninguna prueba normal existente cambió.

### Verificación
Todo se corrió desde `frontend/`. Antes de cada corrida, la puerta de carga: dos lecturas de 25 % o menos y ningún `node` con `vitest`.
- **lint:** `npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores (21:26:42).
- **test (módulos tocados y vigiladas de la ronda 0, por ruta):**
  - Comando: `npx vitest run src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/features/calificaciones/gradebook-01d.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`.
  - Puerta de carga: 21:26:48 `21` y 21:26:54 `9`. Inicio: 21:27:02.
  - Resultado: `Test Files  158 passed (158)` · `Tests  3477 passed (3477)`.
  - Por qué 3477: es la misma selección que corrió el tester en la ronda 0 (sus tres corridas suman 3067 + 232 + 96 = 3395) más mis dos archivos (82 casos).
  - Antes de escribir mis pruebas, la misma corrida con el código ya cambiado (21:08:42) dio `Tests  3395 passed (3395)`: ninguna prueba existente cayó.
- **build:** `npm run build` → exit 0, última línea `✓ built in 969ms`.
- **prisma validate:** n/a.
- **Rojo esperado de la ronda 0, ahora en verde:** `styles/clases-r1.ataque.test.ts` > V-06, con 77 `enEspera=` (C-10).
  - `aviso-de-clase-archivada.tsx` lleva 1 y `categorias-de-solo-lectura.tsx`, 0.
  - Ningún control se copió en dos ramas.

### Conteos
- **Comando:** `npx vitest list src/features/clases/clase-archivada-01d1.test.ts src/features/clases/clase-archivada-01d1-vista.test.tsx`, contado con `grep -a -c`.
- **Resultado:** 82 casos en 2 archivos (5 en `clase-archivada-01d1.test.ts` y 77 en `clase-archivada-01d1-vista.test.tsx`).
- **Los 77 de la vista:**
  - ADM-1D102: 6;
  - ADM-1D103: 4;
  - ADM-1D104: 43 (1 de cobertura del inventario, 21 en activa y 21 en archivada);
  - ADM-1D105: 2;
  - ADM-1D106: 8;
  - ADM-1D107: 4;
  - ADM-1D108: 1;
  - ADM-1D109: 4;
  - estados vecinos del foco: 5.

### Pruebas requeridas → archivo y título exacto
Abreviaturas:
- **[L]** `frontend/src/features/clases/clase-archivada-01d1.test.ts`.
- **[V]** `frontend/src/features/clases/clase-archivada-01d1-vista.test.tsx`: router real (`rutas`) y `app/providers.tsx`. Los que necesitan la caché a mano usan un cliente propio con las mismas opciones y sin reintento: ADM-1D102, ADM-1D108, ADM-1D109 y el caso de vista desmontada de ADM-1D105.

Viñetas:
- **ADM-1D101** → [L]:
  - "ADM-1D101: con archivadaEn ISO es true";
  - "ADM-1D101: con archivadaEn null es false";
  - "ADM-1D101: sin la clave (un backend anterior al despliegue) es false".
- **ADM-1D102:**
  - [V] "ADM-1D102: perspectiva %s, archivada %s: lo que lee una sección es exactamente si la clase está archivada" (6 casos: estudiante, maestro y admin, con true y false);
  - [L] "ADM-1D102: un componente montado sin proveedor lee false".
- **ADM-1D103** → [V]:
  - "ADM-1D103: maestro: el aviso con la fecha larga, sin código, sin «Editar clase», sin «Restaurar» ni «Duplicar»";
  - "ADM-1D103: admin: el aviso «Es de solo lectura.» con la fecha larga, «Restaurar» y «Duplicar», sin código ni «Editar clase»";
  - "ADM-1D103: %s: en una clase activa no hay aviso y el código y sus controles siguen" (maestro y admin).
  - La fecha se compara con `formatearFechaLarga` sobre un instante a mediodía UTC (O-01d1-9).
- **ADM-1D104** → [V]:
  - "ADM-1D104: el inventario cubre las filas 1 a 21, una vez cada una";
  - "ADM-1D104 fila %i (%s): en una activa se pinta" y "ADM-1D104 fila %i (%s): en una archivada no se pinta" (21 y 21, con `it.each` por fila).
  - Además, en una archivada:
    - fila 1: no sale ningún `GET …/codigo`;
    - fila 15: las categorías en solo lectura (nombre y peso, sin campos ni botones);
    - fila 20: el texto de archivada con "Volver a Recursos";
    - fila 21: el texto con "Volver a la clase" (`/admin/clases/<id>`).
- **ADM-1D105** → [V]:
  - "ADM-1D105: el envío recibe 409 CLASE_ARCHIVADA: un solo aviso, lo escrito se conserva hasta el detalle nuevo, que se pide una vez; después, el aviso fijo, sin formulario, y el foco en el título";
  - su estado vecino: "ADM-1D105 (vista desmontada): el 409 llega cuando la persona ya salió de la clase: un solo aviso, el detalle queda viejo sin pedirse y, al volver, se pide y aparece el aviso fijo".
- **ADM-1D106** → [V]:
  - "ADM-1D106: dos clics, una petición; aviso «Clase restaurada»; el aviso fijo desaparece, vuelven los controles y el foco va al título";
  - "ADM-1D106: con 409 CLASE_NO_ARCHIVADA (otra pestaña ya la restauró): un solo aviso y se renueva el detalle; el aviso fijo desaparece";
  - los casos (a) a (c) de ADM-1C15: "ADM-1D106 (ADM-1C15 %s) en «Restaurar» del aviso: un solo aviso legible y el botón sale de la espera", con (a) `claseId:`, (b) vacío, (b) espacios y (c) `confirmar.0:`;
  - además, "ADM-1D106 (matriz, 5xx): un solo aviso, el aviso fijo se queda y el botón sale de la espera";
  - y "ADM-1D106 (en vuelo a la vez): con la restauración de esa clase en vuelo desde otra instancia (la tabla), «Restaurar» del aviso espera con ella y no manda otra".
- **ADM-1D107** → [V]:
  - "ADM-1D107 $nombre: no sale la publicación ni el PUT; un solo aviso; lo escrito y el archivo se conservan hasta el detalle nuevo; después, el aviso fijo y el formulario deja de pintarse" (aviso y recurso);
  - "ADM-1D107 $nombre en una clase activa: la subida sigue como hoy (solicitud, PUT y publicación), sin pedir el detalle" (aviso y recurso).
  - El `exact` se comprueba: la lista de Avisos no se vuelve a pedir.
- **ADM-1D108** → [V] "ADM-1D108: el detalle se marca viejo y se pide una sola vez; el código deja de pintarse y aparece el aviso fijo; nada entra en ciclo".
- **ADM-1D109:**
  - [V] "ADM-1D109: con ClaseLayout montado, %s con CLASE_ARCHIVADA renueva el detalle una vez; con 409 TAREA_MODIFICADA o 500, no" (una consulta y una mutación);
  - [V] "ADM-1D109: con ClaseLayout desmontado, %s con CLASE_ARCHIVADA no toca el detalle" (una consulta y una mutación);
  - [L] "ADM-1D109 (clasificación): solo el código CLASE_ARCHIVADA de la API cuenta, sin mirar el texto".

### Las afirmaciones negativas detectan el defecto
Hice mutaciones temporales en el árbol. Cada una la restauré con `cp` desde la copia y la comprobé con `cmp`, sin diferencias.

| Mutación | Rojos |
|---|---|
| `useSoloLecturaDeLaClase` siempre devuelve `false` | 28: los 3 de ADM-1D102 en archivada, los 2 de ADM-1D103 en archivada, las filas 2 a 21 en archivada, ADM-1D105 y los dos de ADM-1D107 en archivada |
| La escucha de `ClaseLayout` no hace nada | 5: los dos de ADM-1D107 en archivada, ADM-1D108 y los dos de ADM-1D109 con `ClaseLayout` montado |
| Sin el ayudante en `useCrearPublicacion` | 1: "ADM-1D105 (vista desmontada) …" |
| Sin darse de baja al desmontar | 2: los dos "ADM-1D109: con ClaseLayout desmontado …" |
| Sin pasar el foco de la raíz al título | 3: ADM-1D105 y los dos primeros de ADM-1D106 |
| «Restaurar» sin la guarda con ref ni la lectura de la caché de mutaciones | 1: "ADM-1D106: dos clics, una petición …" |

- **La fila 1** no caía con la primera mutación: en la archivada, el código responde 409 y tampoco se ve. La reforcé comprobando que no sale ningún `GET …/codigo`, y con la mutación ya cae.
- **"En vuelo a la vez"** no cae con la última mutación. Lo sostiene `enEspera`, que llega por `useGestionEnVuelo` y bloquea el clic en `Button`.
- **Sin tiempos fijos.** Las pruebas esperan con `findBy` o `waitFor` sobre el DOM, `aria-busy`, los avisos, `isFetching()` o `isInvalidated` de la caché. Las respuestas que hay que sostener se retienen con una promesa.

### V-01 (lista de la ronda 0 de 01d1)
- Corrí `sha256sum -c` con la lista reconstruida de `reporte-tester.md`: 259 líneas, y la lista tiene SHA-256 `825acabd5f732dec57c0e06839b3f584d00e9bc325fa7a758e5e045a8445d73f`, igual a la del tester.
- Resultado: 259 `OK` y 0 diferencias.
- `git ls-files` da 259 `*.ataque`; ninguna sin rastrear. No toqué ninguna `*.ataque`.

### "No se toca" contra `3ae6a00`
Comandos: `git diff --name-status 3ae6a00 -- frontend backend shared` y `git ls-files --others --exclude-standard -- frontend backend shared`.
- **Dentro de los paquetes** solo aparecen:
  - los archivos de "Archivos", todos en "Se toca" de 01d1 (con la suma de la Enmienda 3);
  - `frontend/src/styles/clases-r1.ataque.test.ts`, que es el C-10 del tester, con el hash de V-01.
- Sin cambios en `backend/` ni en `shared/`.
- **Fuera de los paquetes** solo escribo esta sección. `aprobacion.md`, `reporte-tester.md` y `docs/trabajo/DEPLOY-investigacion-vps.md` ya estaban cambiados o sin rastrear al empezar y no son míos.
- **No toqué:** `components/adjuntos/`, los cuatro formularios con adjuntos, `components/foco/`, `app/router.tsx` ni `services/`.

### Pendientes de la revisión final de 01c
1. **«Restaurar» del aviso con la misma `mutationKey` que la tabla:** hecho.
   - Usa `useRestaurarClase(claseId)`, con `claveGestionDeClase("restaurar", claseId)`, y `useGestionEnVuelo("restaurar", claseId)` para `enEspera` y la guarda.
   - Caso: "ADM-1D106 (en vuelo a la vez) …".
2. **Tipos en línea y parámetros desestructurados de `mutationFn`/`queryFn` a `types.ts`:** no movidos.
   - `features/clases/types.ts` no está en "Se toca" de 01d1. Quedan para 01d2, que sí lo tiene.
   - Los de 01c, en `features/clases/hooks.ts`:
     - `useClasesAdmin`: `{ pageParam: CursorDeClasesAdmin | undefined }`;
     - `useBorrarClase`: `{ id: string }`;
     - `useDuplicarClase`: `{ claseId: string; datos: DuplicarClase }`;
     - `useFocoAlQuitarUnaClase`: `useRef<{ id: string; accion: AccionDeFilaDeClase } | null>`.
   - Los anteriores a ADMIN-01 son 19 más, contados con `grep -n "mutationFn: (\(.*\)\?{\|queryFn: ({ pageParam }: {\|: { [a-zA-Z]*: " frontend/src/features/clases/hooks.ts` (24 líneas: menos las tres de 01c que coinciden con el patrón, `useClasesAdmin`, `useBorrarClase` y `useDuplicarClase`, porque la cuarta, el `useRef`, no coincide; y menos dos líneas que no son tipos, `body: { maestroId: id }` y el objeto de `:942`): los diez `{ pageParam … }` de las listas (dos con `signal`), `useEditarClase` (`{ claseId; datos: EditarClase }`), los tres `({ id }: { id: string; nombre: string })`, `{ temaId; nombre }`, el de `useMoverElemento`, `{ recursoId; datos }`, `{ dudaId; resuelta }` y el `predicate` de `filtroDeLasSecciones`.
   - 01d1 no sumó ninguno: `estaArchivada` recibe `Pick<ClaseDetalle, "archivadaEn">`.

### O-01d1-8: por dónde pasa la invalidación del detalle ante `409 CLASE_ARCHIVADA`, mutación por mutación (`features/clases/hooks.ts`)
- **El ayudante común** es `marcarViejoElDetalleAnteClaseArchivada(queryClient, claseId, error)`. Invalida `claveClaseDetalle(claseId)` con `exact: true` y `cancelRefetch: false`, y no avisa.
- **Cada `onError` propio** lo llama en su primera línea, antes de su aviso. El resto de cada `onError` no cambia.
- **Con `ClaseLayout` montado,** la escucha (`useDetalleViejoAnteClaseArchivada`) llama al mismo ayudante con el mismo error.
- **Una sola petición:** por `cancelRefetch: false`, la segunda llamada se une a la que ya está en vuelo. ADM-1D105 cuenta una sola.
- **Con la vista desmontada,** lo único que cubre es el ayudante.

| Mutación | ¿Recibe `CLASE_ARCHIVADA`? | Ayudante en su `onError` | Escucha de `ClaseLayout` |
|---|---|---|---|
| `useCrearClase` | No (sin `:claseId`) | No | — |
| `useEditarClase` | Sí (`PUT /admin/clases/:id`, cerrada) | Sí, con el `claseId` de las variables, antes de `avisarErrorConElFormularioDesmontado` | Sí (fila 21: la ruta ya no pinta el formulario) |
| `useArchivarClase`, `useRestaurarClase` | No (`gestion`: `CLASE_YA_ARCHIVADA` o `CLASE_NO_ARCHIVADA`, que ya renuevan el detalle por `avisarErrorDeGestion`) | No | No aplica |
| `useBorrarClase`, `useDuplicarClase` (y la consulta `useConteoDeBorrado`) | No (`gestion`) | No | No aplica |
| `useAsignarMaestro`, `useRetirarMaestro` | Sí (cerradas, P-01 a′) | Sí, antes de `toast.error` | Sí |
| `useRegenerarCodigo` | Sí | Sí: un `onError` nuevo que solo invalida (su aviso sigue en el componente) | Sí |
| `useUnirseAClase` | No (sin `:claseId`; `404 CODIGO_INVALIDO`) | No | — |
| `useAgregarAlumno`, `useQuitarAlumno` | Sí | Sí, antes de `toast.error` | Sí |
| `useCrearPublicacion`, `useComentar` | Sí | Sí, al inicio de su `onError` | Sí |
| `useBorrarPublicacion`, `useBorrarComentario` | Sí | Sí, antes de `toast.error` | Sí |
| `useCrearTema`, `useRenombrarTema` | Sí | Sí, antes de `avisarErrorDelTema` | Sí |
| `useBorrarTema`, `useOrdenarTemas`, `useMoverElemento` | Sí | Sí, al inicio de su `onError` | Sí |
| `useCrearRecurso`, `useEditarRecurso` | Sí | Sí, antes de `avisarErrorDelRecurso` | Sí |
| `useBorrarRecurso` | Sí | Sí, al inicio de su `onError` | Sí |
| `useCrearDuda`, `useResponder` | Sí | Sí, antes de `avisarErrorDelTexto` | Sí |
| `useMarcarDuda`, `useBorrarDuda`, `useBorrarRespuesta` | Sí | Sí, al inicio de su `onError` | Sí |
| `useGuardarCategorias` | Sí | Sí, al inicio de su `onError` | Sí |
| `useSolicitarSubida`, `useUrlDeDescarga` (reexportados de `components/adjuntos/hooks.ts`, que no se toca) | Sí en la subida; en la descarga, solo el alumno | No (§D-9, Enmienda 3) | Sí: es su único camino |

- **Cuenta:** son 24 llamadas al ayudante en `onError`, contadas con `grep -c "marcarViejoElDetalleAnteClaseArchivada(queryClient, claseId, error)"`. Aparte están la definición y las dos llamadas de la escucha, que pasan `evento.action.error`.
- **Consultas:** las de la clase que reciben el código (`GET …/codigo`, `GET …/alumnos/candidatos` y, desde 01d2, las del alumno) solo pasan por la escucha.

### Decisiones donde el plan calla
1. **Foco al título.**
   - `useFocoAlPerderseElControl` (`components/foco/`) se usa tal cual. Su contenedor es la raíz de `ClaseLayout`, que ahora lleva `tabIndex={-1}`, y su clave es `${claseId}:${soloLectura}`.
   - Ese gancho decide si el control con el foco se perdió y, si se perdió, lleva el foco a la raíz. Desde ahí, `useFocoAlTituloDeLaClase` lo pasa al `h1`.
   - El `h1` ahora lleva `tabIndex={-1}` y recibe su ref por la prop `tituloRef` de `EncabezadoClase`.
   - Si la persona soltó el foco o lo tiene en otro control, no se mueve (casos vecinos).
2. **Precedencia con los mecanismos de foco que ya existen por fila.**
   - Si el control que desaparece está dentro de una publicación, un tema o una sección de recursos, el mecanismo de esa vista deja el foco en la fila o en su encabezado.
   - Corre antes porque es un efecto hijo. Cuando llega el de `ClaseLayout`, el foco ya no está perdido y no se mueve. Lo fijan tres casos vecinos.
   - El `h1` aplica al resto: los formularios de publicar, «Restaurar», las rutas de editar, el editor de categorías y el código.
   - Lo señalo para el manager: la matriz dice "si el control desaparece, `h1`", sin distinguir este caso.
3. **Fila 14.**
   - `ElementoDeTrabajo` no tiene ninguna acción de escritura: su único botón, «Ver material», es de lectura y se queda.
   - Su acción de escritura es el «Mover» del material, que pinta `seccion-de-tema.tsx` en la misma línea que el de la tarea (fila 13).
   - `elemento-de-trabajo.tsx` queda sin cambios. La prueba de la fila 14 mira el «Mover» dentro de la fila del material y que «Ver material» sigue.
4. **El código no se pide en una archivada.** `useCodigoDeClase` recibe `enabled` falso, además de no pintarse, porque la ruta está cerrada y respondería 409.
5. **El alumno en 01d1.** Mientras no llega la redirección de N-05 (01d2), ve el aviso con el texto del maestro: "Solo puedes consultarla.", el mismo que §D-12 da para el alumno.
6. **El aviso.**
   - Va en una `Card` propia bajo la del encabezado, con el icono `Archive` en `text-muted-foreground` (sin rojo) y el texto.
   - Para el admin lleva dos acciones:
     - «Restaurar»: `outline`, `size="sm"`, `enEspera` y ref;
     - el enlace «Duplicar»: `outline`, `size="sm"`, hacia `/admin/clases/<id>/duplicar`.
   - Los textos «Restaurar» y «Duplicar» son los de `TEXTOS_CLASES_ADMIN` de 01c.
   - «Restaurar» no llama a `reset()`: su error no se pinta en línea, va en un aviso.
7. **Categorías de solo lectura.**
   - Cada fila lleva el nombre y "{peso} %" (`TEXTOS_CATEGORIAS.sufijoPeso`), con divisores y sin conteo de tareas.
   - Sin categorías, se pinta `TEXTOS_CATEGORIAS.vacio`.
   - El encabezado y la frase de la vista no cambian.
8. **Filas 20 y 21.**
   - Fila 20: el texto de archivada gana sobre los errores del recurso, porque es la primera rama de `contenido()`.
   - Fila 21: un `MensajeError` con el texto y el enlace "Volver a la clase" (`outline`) hacia `baseDeClase("admin", claseId)`, como el "noPuedes" de editar recurso. La ruta solo existe para el admin.
9. **Volver a una clase cuyo detalle quedó viejo** (con la vista desmontada).
   - Mientras llega el detalle nuevo, se pinta el viejo.
   - Con el viejo, el encabezado puede pedir el código y recibir 409, que vuelve a marcar el detalle.
   - Son, a lo sumo, una petición más y sin ciclo, porque el detalle nunca recibe ese código. La prueba lo acota entre +1 y +2.
10. **"Volver a mis clases" del maestro hacia `/maestro/clases-archivadas`** (§D-9) no entra en 01d1: la ruta nace en 01d2 (ADM-1D203).

### Hermanos y estados vecinos de cada mecanismo
**A. Solo lectura (contexto):**

| Estado o camino | ¿Aplica? | Cómo queda |
|---|---|---|
| Primera carga de una archivada (maestro, admin y alumno) | Sí | Aviso y ningún control de las filas 1 a 21; el código no se pide (ADM-1D102 a ADM-1D104) |
| Clase activa | Sí | Todo como hoy (ADM-1D104 en activa; ninguna prueba existente cambió) |
| Backend anterior sin `archivadaEn` | Sí | Activa (ADM-1D101) |
| Componente montado sin proveedor | Sí | `false` (ADM-1D102 [L]); los 23 archivos con dobles sin la clave siguen en verde |
| Pasa a archivada con la vista abierta (409 de una escritura, de la subida o del código) | Sí | El detalle se renueva: aparece el aviso y salen los controles (ADM-1D105, ADM-1D107, ADM-1D108) |
| Pasa a activa («Restaurar» o 409 `CLASE_NO_ARCHIVADA`) | Sí | Sale el aviso y vuelven los controles (ADM-1D106) |
| Detalle cargando o en error | Sí | El proveedor solo se pinta con datos; el error es la rama de hoy |
| Cambio de clase sin desmontar el marco | Sí | El valor sale de los datos de la clase nueva; la clave del foco cambia con el `claseId` |
| Control a medio usar (confirmación de borrar abierta, formulario de tema o de renombrar abierto, edición de categorías) | Sí | Deja de pintarse con su estado; no se manda nada |

**B. Detalle viejo ante `409 CLASE_ARCHIVADA` (escucha y ayudante):**

| Estado o camino | ¿Aplica? | Cómo queda |
|---|---|---|
| Escritura con la vista montada | Sí | Un aviso (el de la mutación); el detalle se pide una vez (ADM-1D105) |
| Escritura que llega con la vista desmontada | Sí | Un aviso (el del gancho); el detalle queda viejo sin pedirse y se pide al volver (ADM-1D105, vista desmontada) |
| Solicitud de subida (aviso y recurso) | Sí | Un aviso del `catch` del formulario; no sale ni la publicación ni el `PUT`; lo escrito y el archivo se conservan (ADM-1D107) |
| Consulta cerrada (`GET …/codigo`) | Sí | El detalle se pide una vez, sin ciclo (ADM-1D108) |
| Dos errores a la vez (gancho y escucha, o dos peticiones) | Sí | Por `cancelRefetch: false`, una sola petición (ADM-1D105 cuenta 1) |
| Otro código (409 `TAREA_MODIFICADA`, 500) | No reacciona | ADM-1D109 |
| Error de red o que no es `ApiError` | No reacciona | `esClaseArchivada` da falso (ADM-1D109 [L]) |
| Código con que `apiClient` redirige (401, `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`) | No reacciona | No es `CLASE_ARCHIVADA` |
| Reintento de una consulta (`retry: 1`) | Sí | Solo dispara el `error` final; el intento fallido intermedio es `failed` |
| Reconexión (`refetchOnReconnect`) | Sí | Si la recarga recibe el código, la escucha lo atiende igual |
| Cambio de clase | Sí | La escucha se vuelve a suscribir con el `claseId` nuevo (dependencia del efecto) |
| `ClaseLayout` desmontado | Sí | Se da de baja de las dos cachés (ADM-1D109) |
| El propio detalle | Nunca recibe el código (`lectura-del-alumno`) | Sin ciclo |
| Volver con el detalle viejo | Sí | Puede pedir el detalle una vez más (decisión 9) |

**C. Foco al título:**

| Estado o camino | ¿Aplica? | Cómo queda |
|---|---|---|
| Desaparece el formulario de publicar (fuera de una fila) | Sí | `h1` (ADM-1D105) |
| Desaparece «Restaurar» del aviso (éxito o 409 `CLASE_NO_ARCHIVADA`) | Sí | `h1` (ADM-1D106) |
| «Restaurar» con 5xx, red o `VALIDACION` | No desaparece | El foco se queda en «Restaurar» (ADM-1D106, 5xx) |
| Control dentro de una publicación, un tema o una sección de recursos | Gana el mecanismo de la fila | La publicación, el encabezado del tema o un control conectado; nunca `<body>` (tres casos vecinos) |
| Foco soltado (en `<body>`) | No se mueve | Caso vecino |
| Foco en un control que sigue (la barra) | No se mueve | Caso vecino |
| Rutas 20 y 21 con el formulario abierto cuando la clase pasa a archivada | Sí | El formulario sale. La raíz de editar recurso sigue y su clave no cambia, así que `ClaseLayout` lleva el foco al `h1` |
| Vista desmontada | No aplica | — |
| Dos cambios seguidos (archivar y restaurar) | Sí | Cada cambio de la clave vuelve a evaluar |

**D. «Restaurar» del aviso (doble envío):**

| Estado o camino | Qué lo evita |
|---|---|
| Dos clics en el mismo render | La guarda con ref |
| La restauración ya está en vuelo desde la tabla o desde otra instancia del aviso que se desmontó | `useGestionEnVuelo`: `enEspera` y `sigueEnVuelo()` |
| El aviso se vuelve a montar con la petición en vuelo | La mutación vive en la caché con su clave |

Casos: "dos clics" y "en vuelo a la vez".

### Matriz de avisos y recargas (01d1)
| Disparador | `VALIDACION` / `4xx` | `409` | `5xx` o red | Redirige | Se renueva | Foco | En vuelo a la vez | Vista desmontada |
|---|---|---|---|---|---|---|---|---|
| «Restaurar» del aviso | Un aviso (`mensajeDeErrorClases`, ADM-1C15 a–c). Con `403 SIN_ACCESO_A_LA_CLASE` (borrada en otra pestaña): un aviso; se renuevan el detalle y las listas, y el detalle pasa a su error de hoy | `CLASE_NO_ARCHIVADA`: un aviso; se renuevan el detalle y las listas del admin | Un aviso; nada se renueva | Sin aviso (`errorQueRedirigeElCliente`) | Éxito: "Clase restaurada"; el detalle (`exact`), las listas del admin, inscritas e impartidas; sin `claveClasesAnteriores` (E10-6) | Éxito o `409`: `h1`. Un error que deja el aviso: se queda en «Restaurar» | La misma `mutationKey` que la tabla: una sola petición y los dos botones en espera | El gancho avisa y renueva igual |
| Enlace «Duplicar» del aviso | — | — | — | — | Navega a `/admin/clases/<id>/duplicar` | El de una navegación | — | — |
| Cualquier escritura de `features/clases` | (de hoy) | `CLASE_ARCHIVADA`: un aviso, el de hoy de cada gancho, con el texto del servidor; lo escrito se conserva hasta el detalle nuevo | (de hoy) | (de hoy) | Solo el detalle (`exact`), por el ayudante y la escucha, en una petición | `h1` si el control desaparece fuera de una fila; dentro de una fila, el mecanismo de la fila | Dos `409` a la vez: una sola petición del detalle | El ayudante deja el detalle viejo sin pedirlo; un aviso, el del gancho |
| Solicitud de subida (aviso y recurso) | (de hoy) | `CLASE_ARCHIVADA`: el aviso del `catch` ("No pudimos subir «…»: …"), uno solo; sin publicación ni `PUT` | (de hoy) | (de hoy) | Solo el detalle, por la escucha | Al llegar el detalle: `h1` | — | Sin escucha (el formulario ya no está) |
| `GET …/codigo` (maestro y admin) | — | `CLASE_ARCHIVADA`: el error en su lugar del encabezado hasta que llega el detalle; sin aviso | (de hoy) | (de hoy) | Solo el detalle, por la escucha | Sin cambio (el código no tiene foco) | — | — |
| Aviso fijo, categorías de solo lectura, rutas 20 y 21 | Sin peticiones nuevas | — | — | — | — | — | — | — |

### Desviaciones del plan
Ninguna de alcance. El manager debe revisar tres lecturas:
- la fila 14 sin cambio de código (decisión 3);
- la precedencia del foco de las filas sobre el `h1` (decisión 2);
- la posible petición extra del detalle al volver con el detalle viejo (decisión 9).

### Pendiente o fuera de alcance
- **`docs/DESIGN.md`:** el patrón del aviso de clase archivada (§7.16) y las categorías de solo lectura van en A-04, al cierre. `docs/` fuera de `trabajo/` está en "No se toca".
- **Tipos en línea:** los de `features/clases/hooks.ts` van a `types.ts` en 01d2 (arriba).
- **La raíz de `ClaseLayout` gana `tabIndex={-1}`.**
  - Un clic en un espacio vacío dentro de la clase la enfoca, como ya pasa en otras raíces con `tabIndex={-1}` (editar recurso, tareas).
  - No cambia ninguna prueba.

### M-01 (verificación del manager, `revision.md:3648`): corregido

#### Decisión de (a): con la raíz enfocada por la persona, el foco no se mueve
- **Por qué esta opción.** La raíz de `ClaseLayout` es enfocable (`tabIndex={-1}`). En un navegador, un clic en un espacio en blanco dentro de la clase deja ahí el foco: dentro de la clase, esa es la forma de soltarlo.
  - `DESIGN.md` §7.14 pide "no se le quita el foco a un control que la persona eligió".
  - El contrato de `components/foco` (`useFocoAlPerderseElControl`) es el mismo: a quien soltó el foco no se le mueve. La raíz con `tabIndex={-1}` es el destino de respaldo cuando el control se pierde, no un lugar del que haya que sacar a la persona.
  - Con esta opción, el comentario del gancho y la tabla C ya dicen lo que hace el código.
- **Cambio** (`features/clases/hooks.ts`, `useFocoAlTituloDeLaClase`): un `useLayoutEffect` con la misma clave guarda si la raíz ya tenía el foco al pintarse el cambio. Corre antes que los efectos pasivos y, por tanto, antes de que `useFocoAlPerderseElControl` enfoque la raíz.
  - El efecto que pasa el foco al `h1` no hace nada si la raíz ya lo tenía.
  - Si la raíz la acaba de enfocar el gancho porque el control se perdió, el foco sigue yendo al `h1`, como antes: ADM-1D105 y ADM-1D106 siguen en verde.
  - El comentario del gancho lo explica. No cambia ningún otro archivo de producción.
- **El caso vecino de antes**, "con el foco soltado (en `<body>`)", se queda: cubre lo que hace jsdom y el foco que sale de la clase. El estado de un navegador lo fijan ahora los dos casos de (a).
- **Detección:** sin la guarda nueva (mutación temporal, restaurada y comprobada con `cmp`), caen exactamente los dos casos de (a) y nada más: `Tests  2 failed | 19 passed | 62 skipped (83)` con `-t "M-01|ADM-1D105|ADM-1D106|vecino"`.

#### Casos nuevos (`frontend/src/features/clases/clase-archivada-01d1-vista.test.tsx`, `describe` "M-01: estados vecinos del foco al título y de la escucha")
- "M-01 (a): con el foco en la raíz de la clase (un clic en un espacio en blanco), la clase pasa a archivada y el foco se queda en la raíz"
- "M-01 (a): con el foco en la raíz de una clase archivada, la clase pasa a activa (restaurada en otra pestaña) y el foco se queda en la raíz"
- "M-01 (b): cambio de clase sin la nueva en caché, con el foco en un campo que desaparece: el marco pinta «Cargando» y el foco queda en <body>, como antes de 01d1"
- "M-01 (b): cambio de clase con la nueva en caché, con el foco en un campo que desaparece y sin mecanismo de fila: el foco va al título de la clase nueva"
- "M-01 (b): cambio de clase con la nueva en caché y el foco en «Borrar publicación»: gana el mecanismo de Avisos (O-14), el encabezado de la lista"
- "M-01 (c): un 409 CLASE_ARCHIVADA de una escritura de otra clase, con esta abierta, pide una vez más el detalle de esta, sin aviso de más ni ciclo"

Ninguno usa tiempos fijos. La otra clase la responde un manejador propio de la prueba (`responderLaOtra`).

#### Tabla B, filas que cambian o se suman
| Estado o camino | ¿Aplica? | Cómo queda |
|---|---|---|
| (c) Un `409 CLASE_ARCHIVADA` de otra clase con esta abierta | Sí (la escucha reacciona a cualquier error con ese código, Enmienda 3) | El detalle de la clase abierta se pide una vez más, sin aviso de más ni ciclo; el de la otra clase lo marca su propio ayudante. Inofensivo. Caso "M-01 (c) …" |
| Solicitud de subida que recibe el `409` con la vista desmontada (N-01d1-1) | Sin escucha y sin ayudante (`components/adjuntos` no se toca, Enmienda 3) | El detalle no queda marcado viejo. Si la persona vuelve antes de los 30 s de `staleTime`, ve la clase activa con sus controles hasta la siguiente escritura (que recibe el `409` y la corrige) o hasta que vencen los datos. Lo acepta el plan |

#### Tabla C completa (foco al título al cambiar el estado de archivada)
| Estado o camino | ¿Aplica? | Cómo queda |
|---|---|---|
| Desaparece el formulario de publicar (fuera de una fila) | Sí | `h1` (ADM-1D105) |
| Desaparece «Restaurar» del aviso (éxito o 409 `CLASE_NO_ARCHIVADA`) | Sí | `h1` (ADM-1D106) |
| Desaparece otro control del aviso (el enlace «Duplicar») porque otra pestaña restauró | Sí | `h1` (mismo camino que «Restaurar»: control perdido dentro de la raíz) |
| «Restaurar» con 5xx, red o `VALIDACION` | No desaparece | El foco se queda en «Restaurar» (ADM-1D106, 5xx) |
| Control dentro de una publicación, un tema o una sección de recursos | Gana el mecanismo de la fila | La publicación, el encabezado del tema o un control conectado; nunca `<body>` (tres casos vecinos; sondas del manager con «Mover» y renombrar tema) |
| Editor de categorías, ruta 20 o ruta 21 con el foco dentro | Sí | `h1` |
| **(a) Foco en la raíz de la clase (clic en un espacio en blanco), la clase pasa a archivada o a activa** | **No se mueve** | **Se queda en la raíz (dos casos "M-01 (a)")** |
| Foco en el `h1` (lo dejó ahí un cambio anterior o la persona) | No se mueve | El `h1` sigue conectado |
| Foco soltado fuera de la clase (en `<body>`) | No se mueve | Caso vecino de antes |
| Foco en un control que sigue (la barra) | No se mueve | Caso vecino de antes |
| **(b) Cambio de clase sin la nueva en caché, con el foco en un control que desaparece** | No aplica | `ClaseLayout` pinta «Cargando», la raíz no existe cuando corre el efecto y el foco queda en `<body>`, como antes de 01d1 (caso "M-01 (b) … sin la nueva en caché") |
| **(b) Cambio de clase con la nueva en caché y un control sin mecanismo de fila** | Sí | `h1` de la clase nueva (caso "M-01 (b) … sin mecanismo de fila") |
| **(b) Cambio de clase con la nueva en caché y un control dentro de una fila** | Gana el mecanismo de la vista al cambiar de clase | En Avisos, el encabezado de la lista (O-14; caso "M-01 (b) … «Borrar publicación»"). Trabajo y Recursos tienen el mismo mecanismo al cambiar de clase |
| Cambio de clase con el foco en la raíz | No se mueve | La raíz es el mismo elemento y la foto dice que ya tenía el foco |
| Atrás y adelante entre una clase archivada y una activa | Sí | Es un cambio de clase: lo mismo que las tres filas (b) |
| El detalle pasa a error | No aplica | La raíz se desmonta; el foco lo lleva `useFocoAlPasarAError` al contenedor del error, como hoy |
| Vista desmontada | No aplica | — |
| Dos cambios seguidos (archivar y restaurar) | Sí | Cada cambio de la clave vuelve a evaluar, con su propia foto |

#### Verificación (desde `frontend/`; puerta de carga antes de cada corrida)
- **lint:** `npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores (21:55:07).
- **test:** el mismo comando literal de la implementación (`npx vitest run src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts … src/app/clase-03c1.test.tsx`, completo arriba). Puerta de carga: 21:56:43, `2`. Inicio: 21:56:45. Resultado: `Test Files  158 passed (158)` · `Tests  3483 passed (3483)`, que son 3477 + los 6 casos nuevos.
- **build:** `npm run build` → exit 0, última línea `✓ built in 812ms`.
- **Conteos:** `npx vitest list src/features/clases/clase-archivada-01d1.test.ts src/features/clases/clase-archivada-01d1-vista.test.tsx`, contado con `grep -a -c`: 88 casos en 2 archivos (5 y 83). De ellos, 6 tienen `M-01 (` en el título.
- **V-01:** `sha256sum -c` con la lista `825acabd…`: 259 `OK` y 0 diferencias.
- **"No se toca":** igual que en la implementación. Esta corrección solo cambió `features/clases/hooks.ts` (producción) y `features/clases/clase-archivada-01d1-vista.test.tsx` (mi prueba). No toqué ninguna `*.ataque`.

#### N-01d1-1 y N-01d1-2
- **N-01d1-1:** declarado en la tabla B (arriba). Sin cambio de código.
- **N-01d1-2:** queda para 01d2, como sugiere el manager. Si `estaArchivada` pasa a ser un predicado de tipo, `ClaseLayout` deja de leer `archivadaEn` por su cuenta.

## ADMIN-01d1 — Corrección ronda 1 (2026-11-05)

Plan `3822b6c0…`. Reporte: `reporte-tester.md`, "## Ronda 1 — ADMIN-01d1" (línea 2766). La prueba nueva del tester es `frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx` (`8d58d05c…`); no la toqué. La otra copia de trabajo no se usa. Sin navegadores. Sin commit.

### T-01: corregido

#### Remedio
Un solo mecanismo, igual en todos: el componente que guarda el estado de abierto lo reinicia en el mismo render en que ve la clase en solo lectura, `if (soloLectura && <abierto>) set<Abierto>(false)`. Es el patrón de estado derivado que ya usa `editar-recurso-view.tsx` (`esperaLaLecturaFresca`).

**Por qué este y no desmontar.** Desmontar el componente (por ejemplo, con una `key` por solo lectura) también cerraría los estados de lectura, que en una archivada deben seguir: «Ver comentarios», «Ver recurso», «Ver material». Además movería el foco de las filas.

**Qué pasa al cerrar.** Los efectos de foco que siguen al cerrar no hacen nada:
- `confirmandoAnteriorRef`: el botón de borrar no está pintado y su ref es `null`.
- `focoAlCerrarRef`: solo lo marca un manejador de la persona.

Así, el reinicio no mueve el foco. En una archivada el control ya no se pinta, y al volver a activa se ve como al abrir la clase.

**Dónde se aplicó:**
- `components/publicacion-del-muro.tsx`: `confirmando`;
- `components/comentarios-de-publicacion.tsx` (`FilaComentario`): `confirmando`;
- `trabajo-view.tsx`: `creando`;
- `components/seccion-de-tema.tsx`: `renombrando` y `confirmando`;
- `components/elemento-de-recurso.tsx`: `confirmando`;
- `editar-recurso-view.tsx`: `reinicios` vuelve a 0. Es un hermano que encontré al recorrer los controles (abajo, fila 20).

Ningún otro archivo de producción cambió.

#### Hermanos: los controles 1 a 21 de §D-9, uno por uno
| # | Control | Estado propio de abierto, edición o borrador | ¿Le aplica? | ¿Aplicado? |
|---|---|---|---|---|
| 1 | Código y «Regenerar código» | `confirmando` y `copiando`, en `CodigoDeClase` | No: en una archivada `CodigoDeClase` se desmonta y su estado se pierde. Al volver nace cerrado | No hace falta |
| 2 | «Editar clase» | Ninguno (enlace) | — | — |
| 3 | Formulario de publicar aviso | Texto, archivos elegidos y errores, en `FormularioPublicacion` | No: se desmonta en una archivada. Lo escrito se conserva hasta el detalle nuevo y después se pierde (§D-9, Enmienda 2). Al volver nace vacío | No hace falta |
| 4 | «Borrar publicación» y su confirmación | `confirmando`, en `PublicacionComun`, que sigue montado | **Sí** | **Sí** |
| 5 | Formulario de comentar | Texto y errores, en `FormularioComentario` | No: se desmonta | No hace falta |
| 6 | «Borrar» comentario y su confirmación | `confirmando`, en `FilaComentario`, que sigue montado | **Sí** | **Sí** |
| 7 | «Crear tarea» | Ninguno (enlace) | — | — |
| 8 | «Nuevo tema» y su formulario | `creando`, en `TrabajoDeLaClase`, que sigue montado. El nombre escrito vive en `FormularioTema`, que se desmonta | **Sí** | **Sí** |
| 9, 10 | «Subir» y «Bajar» | `ordenEnVuelo` y `ordenandoRef`: una petición en vuelo, no un estado de abierto. Se limpian en `onSettled`; el `409` también los limpia | No | — |
| 11 | Renombrar tema | `renombrando`, en `SeccionDeTema`, que sigue montado. El nombre escrito vive en `FormularioTema`, que se desmonta | **Sí** | **Sí** |
| 12 | «Borrar tema» y su confirmación | `confirmando`, en `SeccionDeTema` | **Sí** | **Sí** |
| 13, 14 | «Mover» de una tarea o un material | `destino`, en `MoverElemento` | No: se desmonta. Al volver, el selector nace con su tema actual | No hace falta |
| 15 | Editor de categorías | Filas y errores, en `EditorDeCategorias` | No: se desmonta (lo reemplazan las categorías de solo lectura). Al volver nace con la lista del servidor | No hace falta |
| 16 | Formulario de publicar recurso | Título, texto, tema, archivos y errores, en `FormularioRecurso` | No: se desmonta | No hace falta |
| 17 | «Editar recurso» | Ninguno (enlace) | — | — |
| 18 | «Borrar recurso» y su confirmación | `confirmando`, en `ElementoDeRecurso`, que sigue montado | **Sí** | **Sí** |
| 19 | «Mover» recurso | `destino`, en `MoverElemento` | No: se desmonta | No hace falta |
| 20 | Ruta de editar un recurso | Lo escrito vive en `FormularioRecurso`, que se desmonta. **Pero `reinicios`** (la `key` tras un `409 RECURSO_MODIFICADO`) vive en la vista, que sigue montada: al volver a activa, el formulario nacía con `enfocarAlMontar` y le quitaba el foco a la persona | **Sí** | **Sí**: `reinicios` vuelve a 0 en solo lectura |
| 21 | Ruta de editar la clase | Lo escrito y los errores, en `FormularioClase`, que se desmonta. La vista no guarda estado | No | No hace falta |

**Otros que pedía el encargo:**
- **Confirmaciones de archivar de la tabla de 01c:** no aplican. Viven en `/admin/clases`, fuera del `ClaseLayout`. Una fila archivada sale de "Activas", y su confirmación se desmonta con ella.
- **Menús:** no hay ninguno en las filas 1 a 21.
- **Aviso de la clase archivada:** «Restaurar» no tiene estado de abierto; su ref de guarda se limpia en `onSettled`.
- **Estados de lectura que no se reinician a propósito:** «Ver comentarios» (`abierto` en la publicación), «Ver recurso», sus comentarios (`abierto` y `comentariosAbiertos`) y «Ver material». Son lectura, y en una archivada siguen.
- **01d2:** Dudas, Personas y `features/tareas` (filas 22 a 37) llevarán el mismo mecanismo en sus controles con estado de abierto.

#### Estados vecinos del mismo mecanismo
| Estado o camino | ¿Aplica? | Cómo queda | Caso |
|---|---|---|---|
| Archivar con el `409` de una escritura y restaurar con «Restaurar» (admin) | Sí | Cerrado al volver | ADM-T1D111 (tester) |
| Otra pestaña o sesión archiva y restaura (admin) | Sí | Cerrado al volver | ADM-T1D112 (tester) |
| Otra sesión (el admin) archiva y restaura con el maestro en la clase | Sí | Cerrado al volver: confirmaciones de borrar recurso y tema, y «Nuevo tema» | "T-01 vecino, maestro, otra sesión archiva y restaura: …" (3) |
| Archivar, restaurar, volver a abrir, archivar y restaurar otra vez | Sí | Cerrado en cada vuelta; ningún `DELETE` | "T-01 vecino: archivar, restaurar, volver a abrir …" |
| Restaurar con la vista desmontada | El componente se desmonta | Cerrado al volver (el estado ya no existe) | "T-01 vecino: restaurar con la vista desmontada …" |
| Cambiar de clase entre archivar y restaurar | Al cambiar de sección o de clase, el componente se desmonta | Cerrado al volver | "T-01 vecino: cambiar de clase entre archivar y restaurar …" |
| Un `409` en vuelo cuando llega la restauración | Sí | Un aviso; al volver a activa, la confirmación sigue cerrada; un solo `DELETE` y nada se reabre | "T-01 vecino: un 409 en vuelo cuando llega la restauración …" |
| Ruta 20 tras un conflicto, archivar y restaurar | Sí (hermano) | El formulario vuelve sin quitarle el foco a la persona | "T-01 vecino, ruta 20: …" |
| Borrado de un tema o un recurso en vuelo (ref de guarda marcada) cuando la clase pasa a archivada | Sí | La confirmación se cierra. La guarda sigue hasta que la petición se asienta (`onSettled`); con un `409` no sale otro `DELETE` | Cubierto por la guarda de hoy |

**Detección.** Sin las seis líneas del remedio (mutación temporal, restaurada y comprobada con `cmp`), caen 5 de mis 7 casos de T-01: los tres del maestro, "volver a archivar" y "409 en vuelo". El resultado fue `5 failed | 2 passed | 83 skipped (90)`. Los dos que pasan igual son la vista desmontada y el cambio de clase: ahí el componente se desmonta y el remedio no interviene, así que fijan el estado vecino, no el remedio.

El caso de la ruta 20 lo corrí antes de cambiar `editar-recurso-view.tsx` y falló en `expect(cerrar).toHaveFocus()`. Con el cambio pasa.

#### Casos nuevos (en `frontend/src/features/clases/clase-archivada-01d1-vista.test.tsx`)
Del `describe` "T-01: lo abierto a medio usar no reaparece al volver a activa (estados vecinos)":
- "T-01 vecino, maestro, otra sesión archiva y restaura: $nombre no reaparece abierto". Son tres casos: 'la confirmación de borrar un recurso (fila 18)', 'el formulario de «Nuevo tema» (fila 8)' y 'la confirmación de borrar un tema (fila 12)'.
- "T-01 vecino: archivar, restaurar, volver a abrir la confirmación, archivar y restaurar otra vez: tampoco reaparece"
- "T-01 vecino: restaurar con la vista desmontada: al volver, la confirmación está cerrada"
- "T-01 vecino: cambiar de clase entre archivar y restaurar: al volver a la clase restaurada, «Nuevo tema» está cerrado"
- "T-01 vecino: un 409 en vuelo cuando llega la restauración: un aviso, la confirmación sigue cerrada y no sale otro DELETE"

Del `describe` "T-01, hermano de la ruta 20: el formulario reiniciado tras un conflicto no se lleva el foco al volver a activa":
- "T-01 vecino, ruta 20: tras un 409 RECURSO_MODIFICADO, la clase se archiva y se restaura con el foco fuera del formulario: el formulario vuelve sin quitarle el foco a la persona"

Son 8 casos. Ninguno usa tiempos fijos: las esperas son `findBy` y `waitFor` sobre el DOM, los avisos y `isFetching()`, y el `DELETE` se retiene con una promesa.

#### N-01d1-3 (precisión)
La fila "cambio de clase con el foco en la raíz" de la tabla C (M-01) solo vale con la clase nueva en caché. Sin caché, `ClaseLayout` pinta «Cargando», la raíz se desmonta y el foco queda en `<body>`, como en la fila (b) sin caché.

#### Verificación (desde `frontend/`; puerta de carga antes de cada corrida)
- **lint:** `npm run lint` → exit 0. Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores (22:40:17).
- **test:** `npx vitest run src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/features/calificaciones/gradebook-01d.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`. Puerta de carga: 22:40:47; inicio: 22:40:49. Resultado: `Test Files  159 passed (159)` · `Tests  3536 passed (3536)`. Cuadra así: los 3483 de M-01, más los 45 del tester (el filtro `src/features/clases` ya incluye su archivo) y mis 8 nuevos.
- **build:** `npm run build` → exit 0, última línea `✓ built in 919ms`.
- **Conteos:** corrí `npx vitest list src/features/clases/clase-archivada-01d1.test.ts src/features/clases/clase-archivada-01d1-vista.test.tsx src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx` y conté con `grep -a -c`. Salen 5, 91 y 45. Mis dos archivos suman 96 casos; de ellos, 8 tienen "T-01 " en el título.
- **Los siete rojos del tester** (ADM-T1D111 ×3 y ADM-T1D112 ×4) están en verde. Su archivo solo, a las 22:32:42 (con la puerta), dio `Tests  45 passed (45)`.
- **Corridas sin puerta nueva:** dos corridas cortas de un solo caso. Una con la mutación, a las 22:33:42, justo después de la puerta de mis casos; otra la del caso de la ruta 20, a las 22:39:16 y después. Las lancé sin repetir la puerta, sin ningún otro `vitest` corriendo, y no se reportan como cifra.
- **V-01:** `sha256sum -c` sobre la lista de la ronda 0 (`825acabd…`, 259 líneas) más la línea de `clase-archivada-01d1-r1.ataque.test.tsx` = `8d58d05c409c560d115a7ea51bc29a028d0f201658b3db979b1c53d2ec2d2e6a`. Resultado: 260 `OK` y 0 diferencias. Hay 259 rastreadas y 1 sin rastrear (la nueva del tester).
- **"No se toca" contra `3ae6a00`:** en esta ronda solo cambiaron los seis archivos de producción del remedio (todos en "Se toca" de 01d1) y mi archivo de pruebas. No toqué ninguna `*.ataque`.

## ADMIN-01d1 — Corrección ronda 2 (2026-11-06)

Plan `3822b6c0…`. Reporte: `reporte-tester.md`, "## Ronda 2 — ADMIN-01d1" (línea 2922). La prueba nueva del tester es `frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx` (`32fd1be4…`); no la toqué. La otra copia de trabajo no se usa. Sin navegadores. Sin commit. Las cifras son todas de después de la pausa del humano.

### T-02: corregido

#### Remedio
Un solo mecanismo: **la generación de solo lectura**, en el gancho `useGeneracionDeSoloLectura()` de `components/clase/hooks.ts` (archivo de "Se toca").
- La generación sube cada vez que la clase entra en solo lectura. El gancho devuelve `generacion` (el valor de este render) y `sigueVigente(anotada)` (se lee al llegar el efecto).
- Un efecto asíncrono anota la generación del control que lo lanzó. Si al llegar ya no es la vigente, no hace nada.
- **La generación se captura en el render del control, no al lanzar la recarga.** Lo que dejé antes de la pausa la leía al lanzar la recarga, y no cubría un `409 RECURSO_MODIFICADO` que llega después de restaurar: la recarga salía con la generación nueva y reiniciaba el formulario. Lo prueba el caso "T-02 hermano: el 409 RECURSO_MODIFICADO …".
- El remedio de T-01 (el `setReinicios(0)` en solo lectura) se queda: cubre el reinicio que ya se asentó antes de archivar.

**Dónde se aplicó (los tres efectos que resultaron afectados):**
- `features/clases/editar-recurso-view.tsx`, `recargarTrasConflicto`: comprueba antes de pedir la recarga y otra vez al llegar.
- `features/clases/editar-recurso-view.tsx`, `alGuardar`: no navega si la generación ya no es la vigente. El aviso de éxito lo da el gancho, como con la vista desmontada.
- `features/clases/trabajo-view.tsx`, el foco diferido tras «Subir» o «Bajar»: no mueve el foco si el orden se lanzó en una generación anterior.

#### Tabla de efectos asíncronos de las filas 1 a 21
"Se desmonta" quiere decir que el control sale del árbol en una archivada y que TanStack Query no llama a los callbacks de `mutate` de un observador desmontado, así que su efecto no llega a nadie.

| Fila | Efecto al resolver | ¿Qué cambiaría? | ¿Le aplica? | ¿Aplicado? |
|---|---|---|---|---|
| 1 | `regenerar.mutate` → `onSuccess`/`onError`: aviso y `setConfirmando(false)` (`codigo-de-clase.tsx`) | Solo cierra | No: se desmonta. El gancho (`useRegenerarCodigo`) solo escribe el código en la caché | No hace falta |
| 1 | `handleCopiar`: `await clipboard`; `finally` con `setCopiando(false)` | Solo su propio estado | No: instancia desmontada, sin efecto en la nueva | No hace falta |
| 3 | `handlePublicar` (`mutateAsync`): `setTexto("")`, `setElegidos([])` y `finally` (`formulario-publicacion.tsx`) | Limpia el formulario | No: el manejador sigue, pero sobre la instancia desmontada; la que nace al restaurar es otra y no cambia | No hace falta |
| 4 | `useBorrarPublicacion` (`DELETE`): aviso e invalidar el muro; sin callbacks de `mutate` | Nada abierto; la fila sale y el foco lo lleva la vecina | No | ADM-T2D101 (tester) |
| 5 | `comentar.mutate` → `setTexto("")`, errores y ref (`formulario-comentario.tsx`) | Limpia | No: se desmonta | No hace falta |
| 6 | `useBorrarComentario` (`DELETE`): aviso e invalidar | Nada abierto | No | ADM-T2D101 (tester) |
| 8, 11 | `FormularioTema`: `onSuccess: onTerminar` (cierra y lleva el foco a «Nuevo tema» o «Renombrar») y `onSettled` con su ref | Foco | No: se desmonta y sus callbacks de `mutate` no corren | No hace falta |
| 9, 10 | `ordenar.mutate` → `onSettled`: ref y `setOrdenEnVuelo(null)`; y el foco diferido (`focoTrasOrdenarRef`) | **Mueve el foco** | **Sí**: `trabajo-view` sigue montado, y al llegar con la persona en otro control del mismo tema le quitaba el foco | **Sí** |
| 12 | `borrar.mutate` → `onSettled`: `borrandoRef` (`seccion-de-tema.tsx`) | Solo la guarda. Mientras está en vuelo, «Sí, borrar tema» no manda otro `DELETE` | No: no abre ni enfoca | ADM-T2D101 (tester) |
| 13, 14, 19 | `mover.mutate` → `onSettled` y su ref (`mover-elemento.tsx`) | Nada abierto | No: se desmonta | No hace falta |
| 15 | `guardar.mutate` → `onSuccess`/`onError`: reemplaza las filas y deja un foco pendiente (`editor-de-categorias.tsx`) | Reinicia y enfoca | No: se desmonta, sus callbacks no corren, y el editor nace de nuevo al restaurar | No hace falta |
| 16 | `handleSubmit` en modo crear (`mutateAsync`): limpia el formulario | Limpia | No: el manejador sigue, sobre la instancia desmontada | No hace falta |
| 18 | `borrar.mutate` → `onSettled`: `borrandoRef` (`elemento-de-recurso.tsx`) | Solo la guarda | No | ADM-T2D101 (tester) |
| 20 | `recargarTrasConflicto`: `setReinicios(n + 1)`, con `enfocarAlMontar` | **Reinicia y enfoca** | **Sí** (T-02). La vista sigue montada y el manejador del formulario, con `mutateAsync`, sigue corriendo | **Sí** |
| 20 | `alGuardar` (`onGuardado` tras el `mutateAsync`): `navigate(destino)` | **Navega y descarta lo escrito** | **Sí**: hermano encontrado en este recorrido | **Sí** |
| 20 | `useAvisoDeRecargaFallida`: un aviso si la recarga vieja falla | Solo un aviso | No: no abre, no reinicia ni enfoca | — |
| 21 | `editar.mutate` → `onSuccess: alTerminar` (aviso y `navigate`) y `onSettled` (`formulario-clase.tsx`) | Navegaría | No: usa `mutate`, no `mutateAsync`; se desmonta y el callback no corre. El gancho avisa una vez. Lo fija un caso | No hace falta |
| 21 | `recargar tras conflicto` | — | No existe: `editar-clase-view.tsx` no recarga tras un conflicto | — |
| Aviso | `restaurar.mutate` → `onSettled`: la ref | Solo la guarda | No | — |
| — | Foco diferido de `ClaseLayout` (`useFocoAlTituloDeLaClase`) | Enfoca | No: corre en el mismo commit del cambio, no al llegar una petición | — |
| — | `setTimeout(0)` de `useFilaEnFoco`, `useFocoAlCargarMas` y `useFocoAlPerderseElControl` | Solo borran su memoria | No: no mueven el foco | — |
| 2, 7, 17 | Enlaces | Sin efecto asíncrono | — | — |

**`editar-tarea-view.tsx` (fila 36, 01d2): sin PARADA en 01d1, con aviso para 01d2.**
- Tiene el mismo patrón (`recargarTrasConflicto` con `setReinicios`).
- En 01d1, `features/tareas` no lee el contexto de solo lectura (`grep`: ningún `useSoloLecturaDeLaClase` ahí) y su formulario no se oculta en una archivada. Sin esa transición, T-02 no ocurre: no le aplica en 01d1 y no lo toqué. Está fuera de "Se toca".
- **Lo señalo para el arquitecto y el manager antes de 01d2.** Cuando la fila 36 oculte el formulario, T-02 sí le aplicará. Pero §D-9 (Enmienda 2) condiciona E-31 y E-32: la guarda de `editar-tarea-view.tsx` "no toca `recargarTrasConflicto`". Las dos cosas chocan, y hace falta decidirlo en el plan de 01d2. `useGeneracionDeSoloLectura` ya queda en `components/clase/` para que `features/tareas` pueda usarlo. Lo mismo vale para las filas 22 a 34 de 01d2 que usen `mutateAsync` y sigan montadas.

#### Órdenes de llegada
| Orden | Recarga del conflicto | Guardado con éxito | `409` del guardado | Orden de «Subir» |
|---|---|---|---|---|
| Llega sin archivar (control) | Reinicia y enfoca, como hoy | Navega a Recursos, como hoy | Pide la recarga, como hoy | El foco vuelve al botón del tema |
| Llega con la clase archivada | No hace nada. Al restaurar, el formulario nace con la versión nueva y sin quitar el foco | No navega; sigue el texto de archivada y un aviso | No pide la recarga | No mueve el foco |
| Llega después de restaurar | No reinicia ni enfoca | No navega; lo escrito sigue y un aviso | Un aviso; no pide la recarga ni reinicia | No mueve el foco |
| Llega después de archivar y restaurar dos veces | No reinicia ni enfoca | Igual que la fila anterior (la generación solo sube) | Igual | Igual |
| Vista desmontada y vuelta a montar | La vista nueva espera la lectura fresca en vuelo (§7.21) y nace con la versión nueva, sin quitar el foco | `montado.current` falso en la vista vieja: no navega; el gancho avisa | Ídem: no pide la recarga | La instancia vieja no pinta nada |

**Una decisión que el manager debe ver.** Con un `PUT` con éxito en vuelo, ahora la persona se queda en la ruta. Si llega con la clase restaurada, su formulario conserva lo escrito y la versión con que nació, así que el siguiente guardado recibe `409 RECURSO_MODIFICADO` y sigue el camino de siempre. Elegí no sacarla de la pantalla: preferí conservar lo que escribió después a llevarla a Recursos.

#### Casos nuevos (en `frontend/src/features/clases/clase-archivada-01d1-vista.test.tsx`)
Del `describe` "T-02: la recarga tras un conflicto en vuelo al pasar a solo lectura (ruta 20)":
- "T-02 control: sin archivar, la recarga del conflicto sigue reiniciando el formulario con la versión nueva y llevándose el foco"
- "T-02: la recarga llega después de archivar y restaurar: el formulario no se reinicia ni se lleva el foco"
- "T-02: la recarga llega después de archivar y restaurar dos veces: tampoco reinicia ni se lleva el foco"
- "T-02: la recarga llega con la vista desmontada y vuelta a montar: el formulario nuevo no se reinicia ni se lleva el foco"

Del `describe` "T-02: órdenes de llegada y hermanos del efecto asíncrono viejo":
- "T-02: la recarga llega con la clase archivada: el formulario no se pinta y, al restaurar, nace con la versión nueva sin llevarse el foco"
- "T-02 hermano: el 409 RECURSO_MODIFICADO del guardado llega después de restaurar: un aviso, no se pide la recarga, no se reinicia ni se lleva el foco"
- "T-02 hermano: el guardado con éxito llega después de restaurar: un aviso, no navega y lo escrito sigue"
- "T-02 hermano: el guardado con éxito llega con la clase archivada: un aviso, no navega y sigue el texto de archivada con «Volver a Recursos»"
- "T-02 control: sin archivar, el guardado con éxito sigue navegando a Recursos"
- "T-02 hermano, ruta 21: el guardado de la clase llega después de restaurar: un aviso, no navega y lo escrito en el formulario nuevo sigue"
- "T-02 hermano, «Subir»: el orden llega después de restaurar, con la persona en otro control del mismo tema: el foco no se mueve"
- "T-02 control, «Subir»: sin archivar, el foco vuelve al botón del tema que se movió"

Son 12 casos. Ninguno usa tiempos fijos: las esperas son `findBy` y `waitFor` sobre el DOM, los avisos, las peticiones, `isFetching()` e `isMutating()`, y lo que hay que sostener se retiene con una promesa.

#### Detección
- **Sin `sigueVigente`** (mutación temporal en `components/clase/hooks.ts`, restaurada y comprobada con `cmp`): `npx vitest run src/features/clases/clase-archivada-01d1-vista.test.tsx src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx -t "T-02|ADM-T2D103"` da `Tests  7 failed | 7 passed | 108 skipped (122)`.
- **Los 7 rojos:** ADM-T2D103b y seis míos: la recarga después de restaurar, después de dos vueltas, el `409` del guardado, el éxito después de restaurar, el éxito con la clase archivada y «Subir».
- **Los 7 que pasan igual, y por qué:**
  - los tres controles, que fijan que el camino sin archivar no cambió;
  - ADM-T2D103 y "la recarga llega con la clase archivada", que los absorbe el `setReinicios(0)` de T-01;
  - la vista desmontada y la ruta 21, donde el efecto viejo ya no llega a nadie.

  Esos cuatro últimos fijan estados vecinos, no este remedio.
- **Antes del remedio final,** con el código de antes de la pausa, cayeron cuatro de los hermanos: `409` del guardado, éxito después de restaurar, éxito con la clase archivada y «Subir».

#### Verificación (desde `frontend/`; puerta de carga antes de cada corrida)
- **lint:** `npm run lint` → exit 0 (10:22:48), con el árbol final. En la corrida de las 09:16:56, con el mismo árbol, la última línea con texto fue `> tsc -b`, sin errores; en la de las 10:22:48 mi `tail -1` solo recogió la línea en blanco final.
- **test:** `npx vitest run src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/features/calificaciones/gradebook-01d.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`.
  - **Con ese comando literal no quedó verificado hoy.** Las dos corridas (puertas 09:17:05 y 09:40:52) dieron `Tests  8 failed | 3559 passed (3567)` y `Tests  9 failed | 3558 passed (3567)`, con duraciones de 1018 s y 1080 s, contra unos 190 s de anoche. **No las reporto como verde.**
  - **Causa probable:** el equipo está a batería (`Win32_Battery.BatteryStatus` = 1, descargando, 66 %), con el procesador limitado y otras aplicaciones activas. Ninguna la toqué. Los rojos cambian de una corrida a otra y vienen sobre todo de pruebas de otros encargos (`alumnos-b-r2`, `clases-admin-02c-r1`, `tareas-01d-r1`, `clases-r4`, `crear-clase-view`, `formularios-ch3`, `tarjeta-de-tarea`), con `Test timed out` y esperas vencidas. En las dos cayó además ADM-T1D110 (abajo).
  - **Corrida que sí vale, el mismo comando más `--maxWorkers=4`:** `npx vitest run --maxWorkers=4 src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/features/calificaciones/gradebook-01d.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`. Puerta de carga: 10:04:48. Inicio: 10:04:54. Duración: 740.70 s. Resultado: `Test Files  160 passed (160)` · `Tests  3567 passed (3567)`.
  - **Cuadre:** 3536 de la ronda 1 + 19 del tester + 12 míos = 3567.
  - **Para el manager:** con el equipo conectado a la corriente, el comando literal debería volver a tardar unos 190 s; no lo pude comprobar. A batería, conviene `--maxWorkers=4`.
  - **ADM-T1D110 (`clase-archivada-01d1-r1.ataque.test.tsx:1060`), lo señalo para el manager y el tester.** Es de este encargo y cayó en las dos corridas lentas, las dos veces con `expected 3 to be 2` en `expect(detallesDe(A)).toBe(detallesAntes + 1)`. Solo, tras la puerta de las 10:24:04, pasó 3 de 3 (`Tests  1 passed | 44 skipped (45)`), y también en la corrida con 4 trabajadores.
    - **Lectura del código (no lo comprobé con una sonda):** al volver con el detalle viejo, el encabezado pide `GET …/codigo`, que recibe 409. Con `retry: 1`, su error final llega cerca de 1 s después. Si la prueba tarda más que eso, la escucha pide el detalle una vez más. Es la petición extra de la decisión 9 de la implementación, ya aceptada por el manager, sin ciclo. No lo introduce esta ronda.
    - **Consecuencia:** esa aserción exacta depende del tiempo. No toqué la prueba: `*.ataque`. Decide el manager.
    - **Precisión a N-01d1-1:** por ese mismo camino, el maestro y el admin que vuelven antes del `staleTime` no siempre esperan a la siguiente escritura: si el código recibe el 409, el detalle se corrige solo en cuanto llega su error final.
- **build:** `npm run build` → exit 0, última línea `✓ built in 3.00s`.
- **Conteos:** `npx vitest list src/features/clases/clase-archivada-01d1.test.ts src/features/clases/clase-archivada-01d1-vista.test.tsx`, contado con `grep -a -c`: 108 casos en 2 archivos (5 y 103). De ellos, 12 tienen "T-02" en el título.
- **El rojo del tester** (ADM-T2D103b) está en verde.
- **V-01:** `sha256sum -c` sobre la lista de la ronda 0 (`825acabd…`, 259 líneas) más `clase-archivada-01d1-r1.ataque.test.tsx` = `8d58d05c409c560d115a7ea51bc29a028d0f201658b3db979b1c53d2ec2d2e6a` y `clase-archivada-01d1-r2.ataque.test.tsx` = `32fd1be4f0b957965e60cff91d01e4e5012dad150873f9a51d72a9a02eca2a43`. Resultado: 261 `OK` y 0 diferencias. Hay 259 rastreadas y 2 sin rastrear (las dos del tester en este encargo).
- **"No se toca" contra `3ae6a00`:** en esta ronda solo cambiaron `components/clase/hooks.ts`, `features/clases/editar-recurso-view.tsx` y `features/clases/trabajo-view.tsx` (los tres en "Se toca" de 01d1) y mi archivo de pruebas. `features/tareas` sin cambios. No toqué ninguna `*.ataque`.
- **Prisma:** n/a. Tampoco corrí el backend: 01d1 es solo frontend.

## ADMIN-01d1 — Corrección ronda 3 (2026-11-06)

Plan `3822b6c0…`. Reporte: `reporte-tester.md`, "## Ronda 3 — ADMIN-01d1" (línea 3035). La prueba nueva del tester es `frontend/src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx` (`a188c90d…`); no la toqué. **Autorización del humano (2026-11-06):** tocar `features/clases/components/codigo-de-clase.tsx`, fuera de "Se toca", solo para esto. Sin navegadores. Sin commit. La otra copia de trabajo no se usa. Sin cuarta ronda del tester: verifica el manager.

### T-03: corregido

#### Remedio
- **`features/clases/hooks.ts`, `useRegenerarCodigo`:** los avisos pasan al gancho, como en las demás mutaciones, porque los callbacks de `useMutation` corren aunque el componente ya no esté.
  - Éxito: `TEXTOS_CODIGO.avisoRegenerado` («Código nuevo listo»).
  - Fallo: `TEXTOS_CODIGO.avisoErrorRegenerar`, también en un `VALIDACION` o `SERVICIO_OCUPADO` (T-06 de CLASES y CH3-B08 no cambian).
  - `409 CLASE_ARCHIVADA`: `mensajeDeErrorClases(error)`, "Esta clase está archivada: solo se puede consultar.". **Decisión:** "Inténtalo de nuevo" no se cumpliría en una archivada, y este texto ya es el de §D-12 y el de la matriz. No hay texto nuevo.
  - Códigos con que `apiClient` redirige: sin aviso (decisión abajo).
- **`features/clases/components/codigo-de-clase.tsx`:** `regenerar.mutate` solo cierra la confirmación, con `onSettled`. El foco no cambia: `debeEnfocarRegenerar` solo lo marca «Cancelar», como hoy. No hay aviso doble.

**Lo que dijo el encargo que revisara: los códigos que redirigen.** Las mutaciones del módulo no hacen todas lo mismo:
- no avisan: `useMoverElemento`, las de recursos y dudas, `avisarErrorDeGestion` y `avisarErrorConElFormularioDesmontado`;
- sí avisan, y son anteriores: `useAsignarMaestro`, `useRetirarMaestro`, `useAgregarAlumno`, `useQuitarAlumno`, `useCrearPublicacion`, `useBorrarPublicacion`, `useComentar`, `useBorrarComentario`, `useBorrarTema`, `useOrdenarTemas`, `avisarErrorDelTema` y `useGuardarCategorias`.

`useRegenerarCodigo` sigue a las primeras (CLASES-03c2, Enmienda 7: la página se va). Antes de este cambio avisaba, así que para esos códigos el comportamiento cambia a propósito. No cambié las otras: queda en "Pendiente".

#### Hermano corregido: `useGuardarCategorias` (fila 15, `hooks.ts`, en "Se toca")
- El error de una fila (`400 VALIDACION` "categorias.0.nombre: …") lo pinta `EditorDeCategorias` desde su callback de `mutate`, y el gancho callaba sin mirar si el editor seguía montado. Con el editor desmontado, por archivar o por salir de la clase, no quedaba ningún mensaje.
- Remedio, como `useComentar`: `if (montado.current && erroresDeCategoriasDeApi(error, []) !== null) return`. Desmontado, avisa con `mensajeDeErrorClases`, sin la ruta.
- `editor-de-categorias.tsx` no cambia.

#### Tabla corregida: dónde vive el aviso de cada mutación de las filas 1 a 21
Pregunta de cada fila: ¿este aviso vive en un callback de `mutate` del componente, que se puede desmontar al archivar? **Desmontar por archivar y por salir de la clase es el mismo camino:** el observador se va y los callbacks de `mutate` no corren. El tester señaló que salir de la clase con «Regenerar código» en vuelo era anterior a 01d1; también queda corregido, con caso.

Sustituye a la fila 1 de la tabla de la ronda 2 ("Solo cierra — No hace falta"), que estaba mal, y a su fila 15. También corrige la tabla de O-01d1-8, donde `useRegenerarCodigo` decía "su aviso sigue en el componente".

| Fila | Mutación o acción | Dónde vive su aviso | ¿Se pierde con el componente desmontado? | Remedio |
|---|---|---|---|---|
| 1 | `useRegenerarCodigo` | **Antes, en los callbacks de `mutate`; ahora, en el gancho** | **Se perdía (T-03)**; ya no | **Aplicado** |
| 1 | Copiar el código (sin mutación) | En el manejador `async` del componente, con `try/catch` | No: el manejador sigue corriendo | No aplica |
| 3 | `useCrearPublicacion` | Gancho. El error del campo lo pinta el formulario solo si sigue montado; si no, avisa el gancho | No | Ya estaba |
| 3, 16, 20 | `useSolicitarSubida` y el `PUT` al almacén | `catch` del manejador del formulario (`mutateAsync`), que sigue corriendo | No (ADM-T3D101 a ADM-T3D103) | No aplica |
| 4 | `useBorrarPublicacion` | Gancho | No | Ya estaba |
| 5 | `useComentar` | Gancho, con `montado` para el error del campo | No (caso "T-03 hermano, comentar") | Ya estaba |
| 6 | `useBorrarComentario` | Gancho | No | Ya estaba |
| 8, 11 | `useCrearTema`, `useRenombrarTema` | Gancho (`avisarErrorDelTema`), con `montado` para el error del nombre | No (ADM-T3D112) | Ya estaba |
| 9, 10 | `useOrdenarTemas` | Gancho | No | Ya estaba |
| 12 | `useBorrarTema` | Gancho | No | Ya estaba |
| 13, 14, 19 | `useMoverElemento` | Gancho | No (caso "T-03 hermano, mover") | Ya estaba |
| 15 | `useGuardarCategorias` | Éxito y conflicto, en el gancho. **El error de una fila vivía solo en el callback de `mutate` del editor** | **Se perdía**; ya no | **Aplicado** |
| 16 | `useCrearRecurso` | Gancho (`avisarErrorDelRecurso`), con `montado` para el error del campo | No | Ya estaba |
| 18 | `useBorrarRecurso` | Gancho | No | Ya estaba |
| 20 | `useEditarRecurso` | Gancho (`avisarErrorDelRecurso`), con `montado` para el error del campo | No (ADM-T3D105, ADM-T3D107) | Ya estaba |
| 21 | `useEditarClase` | Montado: en los callbacks de `mutate` (`alTerminar`, `alFallar`). Desmontado: en el gancho (`if (!montado.current)` y `avisarErrorConElFormularioDesmontado`) | No (caso "T-02 hermano, ruta 21") | Ya estaba |
| Aviso | `useRestaurarClase` | Gancho | No | Ya estaba |
| 2, 7, 17 | Enlaces | Sin mutación | — | — |

**Límite de la fila 21, por lectura del código.** La decisión se toma con `montado.current` al llegar la respuesta. Si el formulario se desmonta justo entre el `onSuccess` del gancho y la notificación de los callbacks de `mutate`, el aviso se perdería. Es la misma ventana de todas las mutaciones con `montado`, anterior a 01d1, y no la reproduje. No la cambio.

**N-01d1-4, declarado (decisión del orquestador; sin cambio de código; va a ESTADO §3 al cierre).** Un `409 RECURSO_MODIFICADO` que llega con la clase archivada no pide la recarga. Al restaurar, el formulario nace de una caché que ya se sabe vieja (versión anterior). El siguiente guardado recibe otro `409` y se pierde lo escrito después de restaurar. Nada se sobrescribe, y el `409` dice la verdad. Fila que falta en la tabla de órdenes de la ronda 2:

| Orden | `409` del guardado |
|---|---|
| Llega con la clase archivada | No pide la recarga. **Consecuencia (N-01d1-4):** al restaurar, el formulario nace con la versión de la caché; el siguiente guardado recibe otro `409`, un aviso por envío, se reinicia con la versión del servidor y el foco va al campo. Lo fija ADM-T3D108 |

#### Casos nuevos (en `frontend/src/features/clases/clase-archivada-01d1-vista.test.tsx`, `describe` "T-03: el aviso no se pierde con el componente desmontado")
- "T-03 (a): «Regenerar código» recibe 409 CLASE_ARCHIVADA con la clase ya archivada: un aviso con el texto de archivada, no «Inténtalo de nuevo»"
- "T-03: con el componente montado, un 409 CLASE_ARCHIVADA da un solo aviso y la confirmación se cierra"
- "T-03 (T-06 de CLASES): con el componente montado, un 500 da un solo aviso y la confirmación se cierra con «Regenerar código» de vuelta"
- "T-03: con el componente montado, un 200 da un solo aviso, el código nuevo y la confirmación cerrada"
- "T-03: la persona sale de la clase con «Regenerar código» en vuelo y la respuesta es %s: un solo aviso" (500 y 200)
- "T-03: «Regenerar código» con %s, con que apiClient redirige: sin aviso, como useMoverElemento y las de recursos y dudas" (`ACCESO_RESTRINGIDO` y `CAMBIO_DE_CONTRASENA_REQUERIDO`)
- "T-03 hermano, categorías: un VALIDACION de una fila llega con el editor desmontado por archivar: un aviso legible, sin la ruta"
- "T-03 hermano, categorías (control): con el editor montado, ese VALIDACION va en su fila, sin aviso"
- "T-03 hermano, comentar: el 409 llega con el formulario desmontado por archivar: un solo aviso"
- "T-03 hermano, mover: el 409 llega con el selector desmontado por archivar: un solo aviso"

Son 12 casos, sin tiempos fijos. Salir de la clase con categorías en vuelo no tiene caso propio: pasa por la misma condición que archivar.

#### Detección (mutaciones temporales; cada una restaurada y comprobada con `cmp`)
Comando: `npx vitest run src/features/clases/clase-archivada-01d1-vista.test.tsx src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx -t "T-03|ADM-T3D111"`. Sin mutación: `Tests  17 passed | 141 skipped (158)`.

| Mutación | Resultado | Caen |
|---|---|---|
| Los avisos de regenerar vuelven a los callbacks de `mutate` (el defecto original) | `Tests  9 failed | 8 passed | 141 skipped (158)` | **ADM-T3D111 (a), (b) y (c)**; T-03 (a); el 409 con el componente montado; salir de la clase con 500 y con 200; los dos códigos que redirigen |
| `useGuardarCategorias` sin `montado` | `Tests  1 failed | 16 passed | 141 skipped (158)` | "T-03 hermano, categorías: …" |

- Los controles de ADM-T3D111, el 500 y el 200 con el componente montado siguen en verde con la primera mutación: con el componente montado, el aviso sale igual en los dos sitios.
- Los casos de comentar y mover no los pone en rojo ninguna de las dos: ya avisaban desde el gancho. Cubren lo que el tester leyó sin correr; no prueban este remedio.
- Esas corridas se hicieron con el título anterior de los casos de redirección; el cambio de título es lo único distinto.

#### Verificación (desde `frontend/`; antes de cada corrida, `BatteryStatus` 2 y la puerta de carga)
- **lint:** `npm run lint` → exit 0 (11:17:01). Antes sale `All matched files use Prettier code style!`, y la última línea es `> tsc -b`, sin errores.
- **test:** `npx vitest run src/features/clases src/features/tareas src/components/clase src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/features/calificaciones/gradebook-01d.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/clase-03c1.test.tsx`, sin bandera. Puerta de carga: 11:18:01 `7` y 11:18:08 `6`, `BatteryStatus` 2 antes y después. Inicio: 11:18:10. Duración: 170.69 s. Resultado: `Test Files  161 passed (161)` · `Tests  3622 passed (3622)`. Cuadra así: 3567 de la ronda 2, más los 43 del tester y mis 12.
- **build:** `npm run build` → exit 0, última línea `✓ built in 925ms` (11:15, antes del cambio de título, que solo toca una prueba).
- **Conteos:** `npx vitest list src/features/clases/clase-archivada-01d1.test.ts src/features/clases/clase-archivada-01d1-vista.test.tsx`, contado con `grep -a -c`: 120 casos en 2 archivos (5 y 115). De ellos, 12 tienen "T-03" en el título.
- **V-01:** `sha256sum -c` sobre la lista de la ronda 0 (`825acabd…`, 259 líneas) más `clase-archivada-01d1-r1.ataque.test.tsx` = `b465fd900c2a12681681f04b6ce3c54b23f1028d8b0fdc8545681bdf47e33d60` (el C-n del tester), `-r2` = `32fd1be4f0b957965e60cff91d01e4e5012dad150873f9a51d72a9a02eca2a43` y `-r3` = `a188c90deb61bafedabc50b76c77b02507964297cd6b155f905114839f728493`. Resultado: 262 `OK` y 0 diferencias. Hay 259 rastreadas y 3 sin rastrear (las tres del tester en este encargo). No toqué ninguna `*.ataque`.
- **"No se toca" contra `3ae6a00`:** en esta ronda solo cambiaron `features/clases/hooks.ts` (en "Se toca"), `features/clases/components/codigo-de-clase.tsx` (autorizado por el humano, solo para esto) y mi archivo de pruebas. `backend/` y `shared/` sin cambios. Ninguna prueba normal fuera de la lista cerrada cayó: sin PARADA.
- **Prisma:** n/a.

#### Pendiente o fuera de alcance
- **«Sí, regenerar» sigue sin guarda con ref** (`codigo-de-clase.tsx`, `handleRegenerar`), contra la regla de `CLAUDE.md` de que toda acción que lanza una mutación lleva una. Ya era así, y la autorización solo cubre los avisos, así que no la agregué. Hoy lo sostiene `enEspera` (`clases-r1.ataque`: "'Sí, regenerar' en espera no manda un segundo POST /codigo"). Dos clics en el mismo render podrían mandar dos `POST`; no lo reproduje. Necesita un destino.
- **Las mutaciones anteriores que avisan ante un código con que `apiClient` redirige** (lista de arriba). Es una incoherencia anterior a ADMIN-01. Necesita un destino.
- **Los tipos en línea** van a `types.ts` en 01d2, y **N-01d1-2**, también en 01d2. **N-01d1-4** va a ESTADO §3 al cierre.

## ADMIN-01d2 — Implementación (2026-11-06)

Plan: `docs/trabajo/ADMIN-01-administracion/plan.md`, SHA-256 `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60` (comprobado al empezar y al terminar). Pasos completados: 19, 19b y 19c, 3 de 3. Sin PARADA: ninguna normal fuera de la lista cerrada cayó, ninguna vigilada cambió, C-11, C-12, C-40 y C-41 quedan en verde y no se sumó ningún código fijo a los mapas de errores.

### Lo primero que el manager debe mirar

Hay **una contradicción del plan que resolví sin parar** y quiero que se revise, porque el sistema dice que un plan contradictorio se devuelve: ADM-1D204 (d) pide «"Cargar más" otra vez tras un error de la página siguiente» y que se pida la primera página, y la matriz de 01d2 dice que un `5xx` o el `400` del cursor **reemplazan** la lista con su texto. Si se reemplaza todo, no hay botón que repetir. Me pareció que las dos frases se pueden cumplir a la vez, sin texto nuevo y sin control nuevo: el mensaje reemplaza las filas y «Cargar más» se queda debajo, en el mismo lugar del árbol, con el foco. Al pulsarlo: con `5xx` o red, `refetch` (renueva las páginas cargadas, y la fallida nunca se guardó); con el `400` del cursor, `resetQueries` desde la primera. Si el manager prefiere que el botón desaparezca, el cambio es de un solo archivo (`components/lista-de-clases-anteriores.tsx`) y el camino (d) pasa a no existir, como "repetir un control" en ADM-1D235.

### La corrida colgada de las 13:55

No fue un temporizador ni una prueba mía: **el equipo se suspendió.** El registro de Windows lo dice (`Microsoft-Windows-Kernel-Power`):
- 13:58:58, id 105: cambio de fuente de energía (se desconectó).
- 13:59:36, id 506: entra en modo de espera moderno, motivo `Lid` (se cerró la tapa).
- 14:17:30, ids 507 y 506: sale y vuelve a entrar, motivo `Austerity Battery Drain Budget Exceeded`.
- 14:31:00, id 507: sale del modo de espera, motivo `Lid`.

El `vitest` llevaba 3 min 48 s al cerrarse la tapa. Por eso 51 s de CPU en más de 35 minutos y ningún hijo. Al despertar, a las 14:31, la corrida ya había terminado sola: `Test Files 1 failed | 178 passed (179)`, `Tests 2 failed | 3978 passed (3980)`, `Errors 30 errors`, `Duration 2129.04s`, con 30 errores `Failed to start forks worker`. Son los 30 archivos que no llegaron a arrancar (179 + 30 = 209), no fallas de código. Terminé los dos procesos que seguían vivos, PID 17664 y 13216 (míos); ninguno más. Esa corrida no cuenta como resultado.

**Lo que sí encontró, y era real:** dos casos de `app/marco-r1.ataque.test.tsx` (`'/estudiante'` y `'/maestro'`, "ningún texto suelto sobre los orbes"): mi enlace del pie iba directo sobre el fondo. Corregido en producción (va dentro de una `Card`), sin tocar la `*.ataque`. Las corridas siguientes fueron en segundo plano, con la salida en un archivo y sin tuberías. Ninguna prueba mía deja temporizadores ni promesas colgando: `Tests 4606 passed` en 224 s.

### Archivos

`git diff --name-only 7655a5b -- frontend` da 38, y `git ls-files -o --exclude-standard frontend` da 6: **44 en total**, dentro de los 44 a 47 del plan.

**Producción modificados (32):** `app/router.tsx`, `components/clase/hooks.ts`, `services/clasesService.ts`; `features/calificaciones/`: `components/lista-de-mis-calificaciones.tsx`, `data.ts`, `mis-calificaciones-view.tsx`; `features/clases/`: `alumnos-view.tsx`, `categorias-view.tsx`, `clase-layout.tsx`, `components/elemento-de-duda.tsx`, `components/encabezado-clase.tsx`, `components/respuestas-de-duda.tsx`, `components/tabla-alumnos.tsx`, `data.ts`, `dudas-view.tsx`, `editar-recurso-view.tsx`, `hooks.ts`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `lib.ts`, `maestros-de-clase-view.tsx`, `muro-view.tsx`, `types.ts`; `features/tareas/`: `components/acciones-de-la-tarea.tsx`, `components/formulario-tarea.tsx`, `components/hilo-privado.tsx`, `crear-tarea-view.tsx`, `data.ts`, `editar-tarea-view.tsx`, `entrega-de-alumno-view.tsx`, `hooks.ts`, `lib.ts`.

**Producción nuevos (4):** `features/clases/clase-anterior-view.tsx`, `clases-anteriores-view.tsx`, `clases-archivadas-view.tsx`, `components/lista-de-clases-anteriores.tsx`. Son 36, los del plan sin los dos que podían quedar sin cambio: `detalle-tarea-view.tsx` y `personas-view.tsx` no cambian.

**Pruebas:** nuevas `features/clases/clase-archivada-01d2-vista.test.tsx` y `features/tareas/clase-archivada-01d2-tareas.test.tsx`. Lista cerrada, las dos entradas y nada más: `features/tareas/errores-ch3.test.ts:44` (14 a 15) y `features/clases/clase-archivada-01d1-vista.test.tsx` (sale `["estudiante", true]`, se ajusta el comentario; ADM-1D102 de 6 a 5 casos, `npx vitest list src/features/clases/clase-archivada-01d1-vista.test.tsx`, `grep -a -c "ADM-1D102"` = 5). Las cuatro `*.ataque` de C-11, C-12, C-40 y C-41 son del tester y no las toqué.

### Verificación (desde `frontend/`)

Puerta antes de la corrida final: `15:08:36 puerta: 21 y 10; vitest 0; BatteryStatus 2`. Sin `--maxWorkers`, sin repetir archivos.

| Qué | Comando literal | Última línea |
|---|---|---|
| lint | `npm run lint` (exit 0) | `> tsc -b` (antes, `All matched files use Prettier code style!`) |
| build | `npm run build` (exit 0) | `✓ built in 923ms` |
| test | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts` | `Tests  4606 passed (4606)`; `Test Files  211 passed (211)`; `Duration  224.03s` |

prisma validate: n/a. No toqué `shared/`, así que no corrí el backend. Antes de mis pruebas nuevas, el mismo comando dio `Tests 4399 passed (4399)` · 209 archivos; 4399 + 207 = 4606.

**Conteos:** `npx vitest list src/features/clases/clase-archivada-01d2-vista.test.tsx src/features/tareas/clase-archivada-01d2-tareas.test.tsx`, contado con `grep -a -c`: `clase-archivada-01d2-vista` **115**, `clase-archivada-01d2-tareas` **92**; 207 casos.

**V-01:** la lista de `reporte-tester.md`, "#### V-01: lista vigente completa", extraída a un archivo, tiene SHA-256 `e2ee9ba20c4b1f748735e62317e85d611ccfc59d46f584373c9a128040d8e6c2`; `sha256sum -c`: 262 OK, 0 distintos. `git ls-files -o --exclude-standard | grep ataque`: 0. `git ls-files | grep -c ataque`: 262.

**"No se toca" contra `7655a5b`:** `git diff --name-only 7655a5b -- backend shared infra eslint.config.mjs package.json` da 0. En `frontend/`, solo los 44 de arriba. `lista-maestros-de-clase.tsx`, `buscador-de-maestros.tsx`, `selector-de-maestros.tsx`, `buscador-alumnos.tsx`, `panel-de-calificacion.tsx`, `formulario-de-entrega.tsx`, `formulario-duda.tsx` y `formulario-respuesta.tsx` no cambian.

**`enEspera=`:** 78, lo fija V-06, en verde.

**Tipos en línea (M-11):** `grep -nE "\}: \{|: \{ [a-zA-Z]*: " frontend/src/features/clases/hooks.ts` da solo dos líneas, y las dos son literales de objeto: `body: { maestroId: id },` y `const objetivo = pendiente.current ?? (enFoco === null ? null : { id: enFoco, accion })`. `grep -n "useRef<{" frontend/src/features/clases/hooks.ts` no da nada. Se conserva la desestructuración. N-01d1-2: `estaArchivada` es predicado de tipo y `clase-layout.tsx` pinta el aviso con `{estaArchivada(data) && …}`, sin volver a preguntar.

**BatteryStatus:** 2 en todas las corridas que cuento; ver arriba la que no.

### Detección de las pruebas (mutaciones temporales)

Cada una con su archivo restaurado por bytes, comprobado con SHA-256 y, al final de cada tanda, con `cmp` de todos los archivos cambiados: `CMP-OK`. Guiones en `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\ce73329e-6e87-4432-b4fc-239c50515013\scratchpad\mutaciones.py` y `mut3.py`. **41 de 42 caen**, cada una con su `-t`:

fila 22, 23 y 27 (el control se pinta), 24, 25, 26 y 28 (el reinicio), 29 (la `key`); tabla D: frase de Dudas, frase de Categorías, vacío del muro (2 casos), vacío de alumnos, aviso de la fila 20 y de la fila 36; N-05 (3), OA-2 (3), M-13 foco (2), E-02 `key`, P-03 (2), OA-1 (4), fila 37; `unirPaginasSinRepetidas` (2), reintento de «Cargar más» (2), limpieza de la lista al desmontar (2), guarda más `cancelRefetch` (2); filas 32 `confirmando` (2), `conEntregas`, generación (3); 33 `reinicios`, `onCalificada` (2), recarga (3); 36 `reinicios`, navegar (3), recarga (3); 35 navegar (3); T-03: borrar, entregar (4), hilo (2), calificar (2), formulario (4); M-06 con la vista desmontada.

**La que no cae, y por qué:** quitar **solo** `if (cargandoMasRef.current) return` de la lista. Dos clics siguen dando una petición porque `fetchNextPage({ cancelRefetch: false })` se une a la que está en vuelo. Quitar la guarda **y** `cancelRefetch: false` sí cae (2 casos). La guarda queda porque la pide `CLAUDE.md`.

**Tres que al principio no caían y obligaron a corregir la prueba, no el código:** E-02 pasaba porque, sin el detalle de B en caché, «Cargando» desmonta el `Outlet` y el filtro se reinicia solo: la prueba ahora trae B en caché. La limpieza al desmontar pasaba porque una lista de una página se recupera sola (el fallo deja `isInvalidated`): el caso nuevo trae dos páginas y cursores vencidos. Y al escribir ese caso vi un defecto real de mi diseño: repetir «Cargar más» tras el `400` con dos páginas volvía a pedir el cursor vencido y el texto no se iba; por eso ese camino usa `resetQueries`.

### Decisiones donde el plan calla

1. **ADM-1D204 (d) y la matriz:** arriba.
2. **`useRecuperarListaDeClasesAnteriores` en `features/clases/hooks.ts`.** "Se toca" dice `hooks.ts (useClasesAnteriores)`, y los caminos (a) a (c) de ADM-1D204 piden esto. Es copia de `useRecuperarListaDeClasesAdmin`, sin tipos ni textos nuevos.
3. **Los enlaces del pie van dentro de una `Card`.** El alcance dice "solo el enlace al pie" y `marco-r1.ataque` prohíbe el texto suelto. Sin superficie nueva ni clase de vidrio.
4. **La fila de las listas:** nombre (enlace), maestros con `unirNombres` y la fecha con `formatearFechaLarga`. ~~Sin "Archivada el".~~ El humano aprobó `Archivada el {fecha}`: ver "Antes de la ronda 1".
5. **Funciones y constantes declaradas (OA-3):** `rutaDeClaseAnterior` en `features/clases/lib.ts`, y en `data.ts`: `RUTA_CLASES_ANTERIORES_DEL_ALUMNO`, `LIMITE_CLASES_ANTERIORES` (20, como `LIMITE_CLASES`) y `TEXTOS_CLASES_ANTERIORES`. `cambioMientrasLasVeias` apunta al texto que ya existe. "Cargar más", los títulos, vacíos y errores salen de §D-12. Los tipos nuevos, en `types.ts`.
6. **`features/tareas` invalida con `{ cancelRefetch: false }`,** además de `exact: true`, como el ayudante de `features/clases`: sin eso, el gancho y la suscripción de `ClaseLayout` cancelarían uno la petición del otro.
7. **`claveClasesAnteriores` es una función,** como `claveClasesAdmin`, y `data.ts` la reexporta.
8. **`estaArchivada` es genérica** (`<Clase extends Pick<ClaseDetalle, "archivadaEn">>`), para que `estaArchivada({})` de `clase-archivada-01d1.test.ts:14-24` siga compilando sin cambiarse.
9. **`clase-anterior-view.tsx` no monta `useDetalleViejoAnteClaseArchivada`:** el plan no lo pide y en esa vista el alumno solo lee.
10. **ADM-1D219 (mutación)** usa un `MutationObserver` con una ruta de prueba, para no depender de un formulario; el precedente es ADM-1D109.
11. **Caso de más, hermano de M-06:** "ADM-1D211 hermano: con la vista desmontada…". Sin él, quitar la invalidación de `features/tareas` no lo detectaba nadie, porque con `ClaseLayout` montado la suscripción la cubre.

### Tabla A confirmada (estados de abierto)

Filas iguales a las del plan, con estas líneas de hoy. **Sin correcciones de fondo; tres de más, en cursiva.**

| Fila | Archivo:línea | Estado | Confirmado | Remedio aplicado |
|---|---|---|---|---|
| 22 | `formulario-duda.tsx:28-29` | `texto`, `errores` | Se desmonta (`dudas-view.tsx:166`) | No hace falta |
| 23 | `elemento-de-duda.tsx:57`, `marcandoRef` | Guarda; se limpia en `onSettled` | Sí. Probado con la marca en vuelo: "ADM-1D220 fila 23…" | No hace falta |
| 24 | `elemento-de-duda.tsx:42` | `confirmando` | Sobrevive | `:47` |
| 25 | `elemento-de-duda.tsx:41` | `enfocarCampo` | Sobrevive | `:48` |
| 25 | `elemento-de-duda.tsx:39` | `abierto` | Sobrevive; lectura | No se reinicia, a propósito (caso de control) |
| 25 | `formulario-respuesta.tsx:32-33` | `texto`, `errores` | Se desmonta (`respuestas-de-duda.tsx:256`) | No hace falta |
| 26 | `respuestas-de-duda.tsx:34` | `confirmando` | Sobrevive | `:37` |
| 27 | `buscador-alumnos.tsx:84` | `escrito` | Se desmonta (`alumnos-view.tsx:17`) | No hace falta |
| 28 | `tabla-alumnos.tsx:40` | `confirmando` | Sobrevive | `:44` |
| 29 | `lista-maestros-de-clase.tsx:32` | `confirmando` | Sobrevive | `key` en `maestros-de-clase-view.tsx:69` (el plan decía `:61`, antes del cambio) |
| 30 | `buscador-de-maestros.tsx:129` | `escrito` | Se desmonta (`maestros-de-clase-view.tsx:81`) | No hace falta |
| 31 | `acciones-de-la-tarea.tsx` | Ninguno (enlace) | Sí | — |
| 32 | `acciones-de-la-tarea.tsx:42` y `:44` | `confirmando`, `conEntregas` | Sobreviven: devuelve `null` en `:74`, después de sus ganchos | `:49` y `:50` |
| 33 | `entrega-de-alumno-view.tsx:70` | `reinicios` | Sobrevive | `:76` |
| 33 | `panel-de-calificacion.tsx:68-75` | `estado`, `errores`, `enviando` | Se desmonta (`entrega-de-alumno-view.tsx:144`) | No hace falta |
| 34 | `hilo-privado.tsx:39-43` | `texto`, `error`, `errorDelServidor` | Se desmonta (`:245`) | No hace falta |
| 35 | `formulario-tarea.tsx` | Lo escrito y los elegidos | Se desmonta (`crear-tarea-view.tsx:35`) | No hace falta |
| 36 | `editar-tarea-view.tsx:46` | `reinicios` | Sobrevive | `:52` |
| 36 | `formulario-tarea.tsx` | Lo escrito y los elegidos | Se desmonta (`editar-tarea-view.tsx:85`) | No hace falta |
| 37 | `lista-de-mis-calificaciones.tsx:41` | Ninguno | Sí | — |
| *24, 26 y 32* | `borrandoRef` | Guarda; se limpia en `onSettled` | El componente sigue montado, así que el callback corre | No hace falta |
| *Listas* | `lista-de-clases-anteriores.tsx`, `cargandoMasRef` | Guarda | Se libera en `finally`; tras el `400` no se toma | — |
| *Reinicios* | `confirmandoAnteriorRef` de 24, 26, 28 y 32 | Foco al cerrar | El efecto corre, y `borrarBtnRef`/`quitarBtnRef` ya son `null`: no mueve nada, y al restaurar no hay cambio que procesar | No hace falta |

### Tabla B confirmada (efectos asíncronos)

Igual que el plan. Con las líneas de hoy, las filas con "Sí":

| Fila | Efecto | Remedio aplicado |
|---|---|---|
| 32 | `onError` → `setConEntregas` | Generación y aviso, `acciones-de-la-tarea.tsx:87` |
| 32 | `onSuccess` → `navigate` | Sin generación, a propósito |
| 33 | `onCalificada` | Generación, `entrega-de-alumno-view.tsx:155` |
| 33 | `recargarTrasConflicto` | Al entrar `:120`, al llegar `:126` y en su `catch` `:136` |
| 35 | `handleGuardar` → `navigate` | `crear-tarea-view.tsx:31` |
| 36 | `recargarTrasConflicto` | Antes `editar-tarea-view.tsx:123` y al llegar `:125` |
| 36 | `handleGuardar` → `navigate` | `:113` |
| 25 | `enfocarAlMontar` de `formulario-respuesta.tsx:38-41` | Lo cubre el reinicio de `enfocarCampo` |

**Dos filas de más, sin remedio:** `enfocarPrimerError` de `panel-de-calificacion.tsx` en el `catch` de un panel desmontado (`formularioRef` ya es `null`; no mueve nada; `setErrores` cae en una instancia vieja), y el `catch` de `formulario-de-entrega.tsx` con la instancia desmontada (el aviso de subida es un `toast` y corre igual; no lo cubre un caso con la instancia desmontada, solo montada: ADM-1D213b).

### Tabla B2 confirmada

Las 35 celdas tienen caso o son controles de ADM-1D222; los títulos están abajo ("ADM-1D221 …"). Sin correcciones. Un matiz de la columna "Fila 32, `DELETE` con éxito" en "Vista desmontada": "sin navegar" se comprueba con la ruta de Dudas, donde sigue la persona. Y uno de "Después de restaurar" en 35 y 36: el formulario vigente no es el del envío; lo que se comprueba es que el de ahora conserva su texto y su foco.

### Tabla C confirmada

Las filas 22 a 30, "Ya estaba": confirmadas, con un caso por fila, también 27 y 30 (`ADM-1D223 fila N`). Las líneas de hoy: `useCrearDuda :1843`, `useMarcarDuda :1869`, `useBorrarDuda :1934`, `useResponder :1958`, `useBorrarRespuesta :1981`, `useAgregarAlumno :752`, `useQuitarAlumno :777`, `useRetirarMaestro :638`, `useAsignarMaestro :616` (`features/clases/hooks.ts`).

| Fila | Mutación (`features/tareas/hooks.ts`) | Remedio aplicado |
|---|---|---|
| 32 | `useBorrarTarea :223` | `montado` en `:245`; generación en el `onError` |
| 33 | `useCalificarEntrega :500` | `montado` en `:535` |
| 34 | `useComentarEnHilo :444` | `montado` en `:459` |
| 35 y 36 | `useCrearTarea :173`, `useEditarTarea :195` | Sin cambio; `montado` en `formulario-tarea.tsx:243` |
| Alumno | `useEntregar :373` | `montado` en `:394` |
| Alumno | `useAnularEntrega :400` | Ya estaba; solo gana la invalidación de M-06 |

`renovarTrasErrorDeLaEntrega(` sigue en 3 y `avisarDelErrorDeLaEntrega(` en 5: lo comprueban las vigiladas, en verde. **Una fila de más:** `useSolicitarSubidaEn` y el `PUT` de la entrega: el aviso vive en el `catch` de `formulario-de-entrega.tsx`, que sigue corriendo: no se pierde.

### Tabla D confirmada

Sin filas de más: cada fila con su caso de archivada, su control de activa y su vuelta al restaurar. Líneas de hoy: `maestros-de-clase-view.tsx:78` (`minimo`), `:81` (la tarjeta, con `tope` dentro), `tabla-alumnos.tsx:212` y `:82` (columna), `:199` (vacío), `muro-view.tsx:125`, `dudas-view.tsx:164`, `categorias-view.tsx:57`, `editar-recurso-view.tsx:90`, `editar-tarea-view.tsx:75`. Los textos que agrega 01d2 no piden usar nada oculto.

### Hermanos y estados vecinos

| Mecanismo | Estado o camino | ¿Aplica? |
|---|---|---|
| Reinicio en el render | Archivar y restaurar una vez, dos veces, con la clase que nace archivada | Sí, probado (ADM-1D220, ADM-1D222 b) |
| Generación | Con la clase archivada, tras restaurar, tras dos vueltas, vista desmontada, sin pasar por archivada | Sí, celda por celda (ADM-1D221, ADM-1D222) |
| `montado` en ganchos | Control oculto por archivar, salir de la vista, control montado | Sí (ADM-1D223) |
| Marcar viejo el detalle | `ClaseLayout` montado; vista desmontada; gancho y suscripción a la vez; dos fallos | Sí; una sola petición con `cancelRefetch: false` (ADM-1D210, ADM-1D211 hermano) |
| N-05 y OA-2 | Primera carga, recarga, caché contra servidor en los dos sentidos | Sin ciclo (ADM-1D234 c) |
| `useFocoAlPasarAError` en la clase anterior | Recarga que falla con el foco dentro; primera carga; segundo fallo; foco fuera; otra clase | Probado (ADM-1D236) |
| Frases de las listas | Primera carga, página siguiente `400`, página siguiente `5xx`, dos páginas cargadas | Probado (ADM-1D204, ADM-1D217) |
| Generación, guarda "al llegar" (N-01d2-1) | La recarga tras el `409` ya en vuelo al archivar y restaurar, una y dos vueltas: fila 36; fila 33 con respuesta buena, con `500` y con la tarea (`RUBRICA_MODIFICADA`); fila 36 llegando con la clase archivada | Sí; casos en "Antes de la ronda 1". El `catch` de `entrega-de-alumno-view.tsx:136` no tiene caso: `refetch` no rechaza, y no lo alcanzo sin simular la librería |

**Estados vecinos que declaro, sin cambio, como pidió el manager (no cuentan como hallazgo):**
1. **El foco en el contenedor del error de la clase anterior, cuando el detalle se recupera sin navegar** (por ejemplo, `refetchOnReconnect`): el contenedor sale y el foco cae en `<body>`, porque el gancho solo actúa al entrar en error. Igual que `ClaseLayout` hoy. Por lectura; no lo corrí. Va a la fila del `chore` de foco.
2. **El fallo callado en solo lectura de la fila 36, y después salir al detalle sin restaurar:** el gancho no lo anotó (con `activo` en falso no hay `ultimoFalloAvisado`), así que el detalle avisa una vez al montarse, "Mostramos la última versión". El texto es cierto. Por lectura; no lo corrí.
3. **El foco en la redirección de N-05 y de OA-2:** queda en `<body>`; decisión del plan, al `chore` de foco. ADM-1D233 no lo comprueba.
4. **N-01d1-4, extendido a las filas 33 y 36:** un `409` que llega con la clase archivada no pide la recarga; al restaurar, el formulario nace de la caché vieja y el siguiente guardado recibe otro `409`. Nada se sobrescribe. Declarado por el plan, a ESTADO §3.
5. **«Ver más tareas» en una clase anterior:** como la fila ya no tiene enlace (fila 37), al cargar la última página el foco va al `h2`, no a la fila: la búsqueda de `mis-calificaciones-view.tsx` pide `a` y cae en su respaldo. Nunca `<body>`. Por lectura.
6. **«Cargar más» tras el `400` con el foco dentro:** la lista se vacía mientras se pide y el foco va al `h1`. Probado que no cae en `<body>`.
7. **`claveClasesAnteriores` no se marca vieja al restaurar** (Enmienda 10): el alumno ve el cambio en su siguiente lectura. Si abre una clase de la lista que ya se restauró, OA-2 lo lleva a la clase.

### Matriz de avisos y recargas

| Disparador | Reemplaza la vista | Redirige | `409` | `5xx` o red | Se renueva | Un solo aviso | Foco | En vuelo a la vez | Vista desmontada |
|---|---|---|---|---|---|---|---|---|---|
| Listas, primera página | Su texto de error | `apiClient` | — | Su texto de error, sin aviso | — | Ninguno | `h1` solo si había datos y el foco se perdió | — | Si quedó en error, sale de la caché |
| Listas, «Cargar más» | `400`: frase de lista cambiada; `5xx`: su texto; el botón se queda | `apiClient` | — | Igual | Repetir: `refetch`; con el `400`, `resetQueries` | Ninguno | Se queda en el botón; última página: primera clase nueva o `h1`; tras el `400`: `h1` | Dos clics, una petición | Sin aviso, sale de la caché |
| Detalle de la clase anterior | Su texto y "Volver…" (`403`, `5xx`, red) | `apiClient`; activa: a la clase con `replace` | — | Igual | Al volver a montar | Ninguno | Contenedor del error si tenía el foco dentro; primera carga, no | Con «Ver más tareas»: gana el del detalle | Sin aviso |
| "Mis calificaciones" en la clase anterior | Como hoy, con el texto del cursor de §D-12 | `apiClient` | — | Como hoy | Como hoy | Como hoy | Como hoy; "Ver más": `h2` si no hay enlace | Como hoy | Como hoy |
| Alumno en una archivada por la ruta normal | — | N-05 con `replace` | — | — | — | Ninguno | Sin mover a mano | Lo en vuelo avisa desde su gancho (ADM-1D233) | — |
| Escrituras de `features/tareas` | Por `CLASE_ARCHIVADA`, no | `apiClient` | `CLASE_ARCHIVADA`: uno, sin conflicto; `TAREA_MODIFICADA` y los de calificar: el suyo | Los de hoy | Solo el detalle, `exact` | Uno | Maestro: `h1` si el control salió; alumno: N-05 | Gancho y suscripción: una petición | El aviso sale; el detalle queda viejo |
| Subida de tarea o entrega; descarga del alumno; listas del alumno | Lista: su error | `apiClient` | `CLASE_ARCHIVADA`: el del `catch`, el de la descarga o el error de la vista | Los de hoy | Solo el detalle, por la suscripción | Uno | Maestro: `h1`; alumno: N-05 | Sin `PUT` ni mutación final | Sin suscripción no se marca |
| Filas 32 a 36, y entregar, en vuelo al pasar a solo lectura | — | — | `TAREA_CON_ENTREGAS` con la confirmación oculta: aviso del servidor; los demás, su aviso, sin recarga | Los de hoy | Nada por este camino | Uno | Nadie lo mueve, salvo el `DELETE` con éxito | Tabla B2 | Tabla B2 |
| Filas 22 a 30 en vuelo al pasar a solo lectura | — | — | Aviso del gancho | Aviso del gancho | Lo de hoy | Uno | Fila o encabezado (abajo) | Sin cambio | El gancho avisa |

**Foco al ocultarse un control, fila por fila** (corregido por N-01d2-2): 22: `h1`; 23, 24 y 26: la fila, o el encabezado de `dudas-view` y de `respuestas-de-duda`; 25: la fila; 27: `h1`; 28: el `h2` "Alumnos" (probado); 29: `h1`, por la `key` (probado); 30, según el control: «Asignar a la clase», el `h2` del panel de maestros; el campo de búsqueda, `h1`; 31, 32, 33 y 34: `h1`; 35 y 36: `h1`, o la raíz de la vista si gana `useFocoAlPerderseElControl`, nunca `<body>`.

### Pruebas requeridas

Salen de `npx vitest list`; los títulos con `$nombre` llevan las comillas que pone Vitest.

- **ADM-1D201** (19):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 22: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 23: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 24: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 25: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 26: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 27: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 28: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 29: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 30: en una archivada el control no está; en una activa, sí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 23: la insignia «Resuelta» sí se pinta en una archivada
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D201 fila 25: «Ver respuestas» sí se pinta y una duda sin respuestas no ofrece «Responder»
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D201 fila 31: en una archivada el control no está; en una activa, sí
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D201 fila 32: en una archivada el control no está; en una activa, sí
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D201 fila 33: en una archivada el control no está; en una activa, sí
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D201 fila 34: en una archivada el control no está; en una activa, sí
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D201 filas 35 y 36 (maestro, crear): el texto de archivada y Volver a Actividades, que lleva a su trabajo, sin formulario
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D201 filas 35 y 36 (admin, crear): el texto de archivada y Volver a Actividades, que lleva a su trabajo, sin formulario
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D201 filas 35 y 36 (maestro, editar): el texto de archivada y Volver a Actividades, que lleva a su trabajo, sin formulario
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D201 filas 35 y 36 (admin, editar): el texto de archivada y Volver a Actividades, que lleva a su trabajo, sin formulario
- **ADM-1D202** (5):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D202: lista con el nombre, los maestros y cada clase enlazada a su vista
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D202: vacío
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D202: Cargar más en espera con la petición en vuelo y el foco en la primera clase nueva al cargar la última página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D202: la vista de una clase anterior pinta Mis calificaciones sin secciones y el título de la actividad como texto (fila 37)
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D202 fila 37: control: en una clase activa el título sigue siendo un enlace
- **ADM-1D203** (4):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D203: lista, abrir una en solo lectura; Volver a mis clases va a /maestro/clases-archivadas
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D203: vacío
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D203: control: con la clase activa va a /maestro y, al restaurar con la vista abierta, el enlace vuelve a /maestro
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D203: el admin en una archivada va a /admin/clases
- **ADM-1D204** (18):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (a): ir al inicio y volver a entrar antes del staleTime vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (b): pulsar Inicio en la barra y regresar por el enlace vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (c): atrás y adelante del historial vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (a): ir al inicio y volver a entrar antes del staleTime vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (b): pulsar Inicio en la barra y regresar por el enlace vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (c): atrás y adelante del historial vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (a) con dos páginas ya cargadas: el 400 de la tercera y regresar pide solo la primera, sin los cursores viejos
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (d) con el 400 del cursor y dos páginas cargadas: repetir Cargar más pide solo la primera, el texto desaparece y el foco nunca cae en body
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (d): repetir Cargar más tras un error de la página siguiente vuelve a pedir la primera página y el texto desaparece; el foco se queda en el botón
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (a): ir al inicio y volver a entrar antes del staleTime vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (b): pulsar Inicio en la barra y regresar por el enlace vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (c): atrás y adelante del historial vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (a): ir al inicio y volver a entrar antes del staleTime vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (b): pulsar Inicio en la barra y regresar por el enlace vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (c): atrás y adelante del historial vuelve a pedir la primera página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (a) con dos páginas ya cargadas: el 400 de la tercera y regresar pide solo la primera, sin los cursores viejos
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (d) con el 400 del cursor y dos páginas cargadas: repetir Cargar más pide solo la primera, el texto desaparece y el foco nunca cae en body
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D204 (d): repetir Cargar más tras un error de la página siguiente vuelve a pedir la primera página y el texto desaparece; el foco se queda en el botón
- **ADM-1D205** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D205: en el gradebook de una archivada arma el archivo
- **ADM-1D206** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D206: al pasar de la clase anterior A a la B sin desmontar el marco, el filtro vuelve a Todas y B se pide una vez, nunca con el filtro de A
- **ADM-1D207** (3):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D207: el panel muestra la calificación sin formulario y el hilo del maestro, sin campo
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D207: sin calificar, dice Sin calificar todavía
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D207 control: HiloPrivado montado sin la prop sigue como hoy, con su formulario
- **ADM-1D208** (3):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D208: el alumno en el muro de una archivada termina en la clase anterior con replace, sin que ninguna sección pida su lista
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D208: el alumno en trabajo de una archivada termina en la clase anterior con replace, sin que ninguna sección pida su lista
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D208: el alumno en calificaciones de una archivada termina en la clase anterior con replace, sin que ninguna sección pida su lista
- **ADM-1D209** (3):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D209: estudiante lleva a su lista
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D209: maestro lleva a su lista
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D209: el inicio del administrador no los tiene
- **ADM-1D210** (1):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D210: un solo aviso, lo escrito sigue y la key no cambia hasta que llega el detalle, sin pedir la entrega ni la tarea; dos clics, una petición
- **ADM-1D211** (3):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D211: un solo aviso, conserva lo escrito sin reiniciarse ni pedir la tarea; al llegar el detalle, el texto de archivada
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D211 control: con 409 TAREA_MODIFICADA sigue recargando y reiniciando como hoy
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D211 hermano: con la vista desmontada, el 409 avisa y deja viejo el detalle (exact), sin pedir nada más
- **ADM-1D212** (1):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D212: un solo aviso, conserva lo escrito sin navegar; al llegar el detalle, el texto de archivada
- **ADM-1D213a** (3):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D213a ('Entregar tarea'): un solo aviso, sin pedir la entrega, y termina en la clase anterior con replace
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D213a ('Anular entrega'): un solo aviso, sin pedir la entrega, y termina en la clase anterior con replace
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D213a ('escribir en su hilo'): un solo aviso, sin pedir la entrega, y termina en la clase anterior con replace
- **ADM-1D213b** (1):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D213b: con un archivo y un enlace, la solicitud de subida recibe el 409: sin entregar ni PUT, un aviso, lo elegido sigue y el detalle viejo termina en la clase anterior
- **ADM-1D214** (2):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D214 (editar): la solicitud de subida recibe el 409: sin guardar, un aviso, conserva lo escrito y el archivo, y al llegar el detalle el texto de archivada
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D214 (crear): la solicitud de subida recibe el 409: sin guardar, un aviso, conserva lo escrito y el archivo, y al llegar el detalle el texto de archivada
- **ADM-1D215** (2):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D215 (recurso): un solo aviso, el detalle se marca viejo y termina en la redirección de N-05
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D215 (archivo de su entrega): un solo aviso y termina en la redirección de N-05
- **ADM-1D216** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D216: la vista muestra su error una vez, el detalle se marca viejo y termina en la redirección de N-05
- **ADM-1D217** (6):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D217 (a, b): la primera página sale sin cursor ni posición y Cargar más pide exactamente los dos, codificados
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D217 (d): dos clics, una petición
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D217 (c): el 400 del cursor dice la frase de lista cambiada una sola vez, sin aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D217 (a, b): la primera página sale sin cursor ni posición y Cargar más pide exactamente los dos, codificados
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D217 (d): dos clics, una petición
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D217 (c): el 400 del cursor dice la frase de lista cambiada una sola vez, sin aviso
- **ADM-1D218** (2):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D218: una clase repetida en la segunda página se pinta una vez, sin aviso de claves, y la tercera lleva el cursor de la segunda respuesta
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D218: una clase repetida en la segunda página se pinta una vez, sin aviso de claves, y la tercera lleva el cursor de la segunda respuesta
- **ADM-1D219** (2):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D219 (consulta de B con 409): el detalle de B se pide una sola vez más y el de A, ninguna
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D219 (mutación de B con 409): el detalle de B se pide una sola vez más y el de A, ninguna
- **ADM-1D220** (11):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D220 fila 24: «Sí, borrar duda» no reaparece, tampoco tras dos vueltas, sin escrituras y con el foco donde quedó
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D220 fila 25: el formulario de responder renace sin llevarse el foco (enfocarCampo)
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D220 control: Ver respuestas abierto sigue abierto (lectura)
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D220 fila 26: «Sí, borrar respuesta» no reaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D220 fila 28: «Sí, quitar» del alumno no reaparece y el foco va al encabezado Alumnos
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D220 fila 29: «Sí, quitar» del maestro no reaparece y con el foco en «Quitar» va al h1
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D220 fila 23: «Marcar como resuelta» en vuelo al archivar no deja la guarda marcada al restaurar
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D220 fila 32 (confirmando): «Sí, borrar tarea» no reaparece, tampoco tras dos vueltas, sin escrituras
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D220 fila 32 (conEntregas): reabrir «Borrar tarea» da el primer paso, no el segundo con el conteo viejo
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D220 fila 33 (reinicios): tras un 409 de calificar, al restaurar el panel nace sin llevarse el foco
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D220 fila 36 (reinicios): tras un 409 de guardar, al restaurar el formulario nace sin llevarse el foco
- **ADM-1D221** (28):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 36, 409, con la clase archivada: no pide la recarga; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 36, 409, 'después de restaurar': un aviso; no pide ni reinicia; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 36, 409, 'después de archivar y restaurar dos v…': un aviso; no pide ni reinicia; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 36, 409, con la vista desmontada: como hoy, pide la recarga
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 éxito, con la clase archivada: no navega; sigue el texto de archivada; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 éxito, 'después de restaurar': no navega; un aviso; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 éxito, 'después de archivar y restaurar dos v…': no navega; un aviso; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 éxito, con la vista desmontada: como hoy, navega; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 éxito, con la clase archivada: no navega; sigue el texto de archivada; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 éxito, 'después de restaurar': no navega; un aviso; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 éxito, 'después de archivar y restaurar dos v…': no navega; un aviso; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 éxito, con la vista desmontada: como hoy, navega; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, 409, con la clase archivada: no pide la recarga; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, 409, 'después de restaurar': un aviso; no pide ni reinicia; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, 409, 'después de archivar y restaurar dos v…': un aviso; no pide ni reinicia; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, 409, con la vista desmontada: no pide la recarga; el aviso del 409
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, éxito, con la clase archivada: no reinicia; un aviso; al restaurar, el panel nace con la respuesta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, éxito, 'después de restaurar': no reinicia; un aviso; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, éxito, 'después de archivar y restaurar dos v…': no reinicia; un aviso; lo escrito y el foco siguen
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, éxito, con la vista desmontada: un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 32, TAREA_CON_ENTREGAS, 'con la clase archivada': un aviso con el mensaje del servidor; no abre el segundo paso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 32, TAREA_CON_ENTREGAS, 'después de restaurar': un aviso con el mensaje del servidor; no abre el segundo paso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 32, TAREA_CON_ENTREGAS, 'después de archivar y restaurar dos v…': un aviso con el mensaje del servidor; no abre el segundo paso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 32, TAREA_CON_ENTREGAS, con la vista desmontada: un aviso del gancho
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 32, DELETE con éxito, 'con la clase archivada': navega a Actividades; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 32, DELETE con éxito, 'después de restaurar': navega a Actividades; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 32, DELETE con éxito, 'después de archivar y restaurar dos v…': navega a Actividades; un aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 32, DELETE con éxito, con la vista desmontada: un aviso, sin navegar
- **ADM-1D222** (15):
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (a) fila 36: con 409, un aviso, una lectura, el formulario reiniciado y el foco en el título
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (a) fila 36: con éxito, navega
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (a) fila 35: con éxito, navega
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (a) fila 33: con 409 recarga, reinicia y lleva el foco al encabezado
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (a) fila 33: con éxito reinicia y lleva el foco al encabezado
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (a) fila 32: TAREA_CON_ENTREGAS abre el segundo paso, sin aviso, con el foco en Cancelar
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (a) fila 32: DELETE con éxito navega a Actividades
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (b) fila 36: un guardado nuevo navega y con 409 reinicia
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (b) fila 36: con 409 reinicia y lleva el foco al título
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (b) fila 35: un guardado nuevo navega
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (b) fila 33: un guardado nuevo reinicia y lleva el foco al encabezado
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (b) fila 36: un guardado nuevo navega y con 409 reinicia
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (b) fila 36: con 409 reinicia y lleva el foco al título
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (b) fila 35: un guardado nuevo navega
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D222 (b) fila 33: un guardado nuevo reinicia y lleva el foco al encabezado
- **ADM-1D223** (30):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 22: el 409 con el control oculto da un solo aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 23: el 409 con el control oculto da un solo aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 24: el 409 con el control oculto da un solo aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 25: el 409 con el control oculto da un solo aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 26: el 409 con el control oculto da un solo aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 27: el 409 con el control oculto da un solo aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 28: el 409 con el control oculto da un solo aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 29: el 409 con el control oculto da un solo aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D223 fila 30: el 409 con el control oculto da un solo aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 32, TAREA_CON_ENTREGAS': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 33, puntajes.0.puntos': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 34, texto': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 35, titulo': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 36, titulo': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 32, TAREA_CON_ENTREGAS': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 33, puntajes.0.puntos': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 34, texto': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 35, titulo': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 'fila 36, titulo': un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 fila 32 control: con el control montado, el segundo paso, sin aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 fila 33 control: con el panel montado, el ErrorDeCampo, sin aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 fila 34 control: con el formulario montado, el ErrorDeCampo, sin aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 fila 35 control: con el formulario montado, el ErrorDeCampo, sin aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 fila 36 control: con el formulario montado, el ErrorDeCampo, sin aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 entregar, 'ENTREGA_VACIA', con la redirección de N-05: un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 entregar, 'enlaces.0', con la redirección de N-05: un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 entregar, 'ENTREGA_VACIA', al salir de la vista: un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 entregar, 'enlaces.0', al salir de la vista: un solo aviso legible, sin la ruta
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 entregar, 'ENTREGA_VACIA', control: con el formulario montado, sin aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D223 entregar, 'enlaces.0', control: con el formulario montado, sin aviso
- **ADM-1D224** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D224: con un maestro, minimo no se pinta en una archivada, sí en una activa, y vuelve al restaurar
- **ADM-1D225** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D225: con dos maestros, tope no se pinta en una archivada, sí en una activa, y vuelve al restaurar
- **ADM-1D226** (3):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D226 (un maestro): la tarjeta Asignar maestro y su título no se pintan en una archivada y vuelven al restaurar
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D226 (dos maestros): la tarjeta Asignar maestro y su título no se pintan en una archivada y vuelven al restaurar
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D226: en el formulario de duplicar de una archivada, el buscador sigue
- **ADM-1D227** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D227: no pinta el encabezado Acciones ni su celda en una archivada, las demás columnas siguen y vuelven al restaurar
- **ADM-1D228** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D228: sin alumnos se lee el vacío de la clase y no Comparte el código; al restaurar vuelve el de la activa
- **ADM-1D229** (2):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D229 (maestro): sin avisos se lee el vacío neutro en una archivada y el suyo en una activa
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D229 (admin): sin avisos se lee el vacío neutro en una archivada y el suyo en una activa
- **ADM-1D230** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D230: en Dudas no se lee la frase en una archivada; el título y la lista siguen; al restaurar vuelve
- **ADM-1D231** (1):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D231: en Categorías no se lee la frase de los pesos en una archivada; las categorías siguen; al restaurar vuelve
- **ADM-1D232** (2):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D232 fila 20: una recarga que falla en una archivada no avisa Puedes seguir editando; al restaurar, sin aviso
  - `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D232 fila 36: una recarga que falla en una archivada no avisa Puedes seguir editando; al restaurar con esa consulta aún en error, un solo aviso
- **ADM-1D233** (3):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D233 (a): con texto escrito ninguna escritura sale y el formulario ya no está
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D233 (b): con el DELETE de su comentario en vuelo, al soltarlo un solo aviso y ningún otro DELETE
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D233 (c): con el POST de comentar en vuelo que recibe el 409, un solo aviso con el texto de archivada
- **ADM-1D234** (4):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D234 (a): termina en la clase con replace, sin pedir Mis calificaciones de esa ruta
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D234 (b): con la vista abierta y la clase ya restaurada, la misma redirección, sin aviso
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D234 (c): sin ciclo: caché archivada y servidor activa, y al revés; el detalle se pide una vez por transición
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D234 (d): con 403 el texto de sin acceso y Volver a clases anteriores, sin redirigir
- **ADM-1D235** (16):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 texto del cursor: vuelve a pedir la primera página, sin cursor, y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 falla la primera carga: vuelve a pedir y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 texto del cursor: vuelve a pedir la primera página, sin cursor, y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 falla la primera carga: vuelve a pedir y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 texto del cursor: vuelve a pedir la primera página, sin cursor, y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 falla la primera carga: vuelve a pedir y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (d): dice Vuelve a abrir esta clase; control: el alumno en una clase activa lee el de hoy
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 no pudimos cargar más tareas: repetir Ver más tareas vuelve a pedir esa página
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (e) primera carga: Volver y abrir la misma clase vuelve a pedir el detalle y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (e) recarga con el detalle en caché: Volver y abrir la misma clase vuelve a pedir el detalle y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (f) primera carga: atrás y adelante vuelve a pedir el detalle y, si sigue fallando, el texto sigue sin ciclo
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (f) recarga con el detalle en caché: atrás y adelante vuelve a pedir el detalle y, si sigue fallando, el texto sigue sin ciclo
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (e) primera carga: Volver y abrir la misma clase vuelve a pedir el detalle y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (e) recarga con el detalle en caché: Volver y abrir la misma clase vuelve a pedir el detalle y el texto desaparece
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (f) primera carga: atrás y adelante vuelve a pedir el detalle y, si sigue fallando, el texto sigue sin ciclo
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D235 (f) recarga con el detalle en caché: atrás y adelante vuelve a pedir el detalle y, si sigue fallando, el texto sigue sin ciclo
- **ADM-1D236** (6):
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D236: con el foco en el filtro Mostrar, el mensaje reemplaza la vista y el foco va a su contenedor
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D236: con el foco en Ver más tareas, el mensaje reemplaza la vista y el foco va a su contenedor
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D236 control: una primera carga que falla no mueve el foco
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D236 control: un segundo fallo seguido no mueve el foco
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D236 control: con el foco en un control fuera de la vista, se queda ahí
  - `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D236 control: al pasar a otra clase anterior sin desmontar, la memoria del gancho empieza de cero

**ADM-1D102** (como queda): `clases/clase-archivada-01d1-vista.test.tsx`: `ADM-1D102: perspectiva %s, archivada %s: lo que lee una sección es exactamente si la clase está archivada` (5 casos, sin `estudiante, true`).

### Hallazgos atendidos

No hay rondas todavía. Pendientes de 01d1 cerrados: tipos en línea (M-11) y N-01d1-2.

### Desviaciones del plan

Ninguna a sabiendas. Lo que el plan no decide está en "Decisiones", y lo primero que hay que mirar es ADM-1D204 (d).

### Pendiente o fuera de alcance

- A ESTADO §3 al cierre, según el plan: N-01d1-4 extendido y el foco de N-05 con el vecino 1, en el `chore` de foco.
- Sin navegador: nada de esto se vio en pantalla. Los enlaces del pie en su `Card` y «Cargar más» bajo el mensaje de error los juzga el humano en la comprobación del final de 01g.
- No corrí la suite completa del frontend: la corre el manager al cerrar.

### Antes de la ronda 1 (2026-11-06)

Lo pidió el orquestador tras "## Verificación del resumen — ADMIN-01d2" de `revision.md`. El manager aceptó sin M-n; esto son sus notas y una decisión del humano.

**1. Texto aprobado por el humano: corregido.** `TEXTOS_CLASES_ANTERIORES.archivadaEl` en `features/clases/data.ts`, con `formatearFechaLarga`, pintado en `components/lista-de-clases-anteriores.tsx`. Es el único cambio de producción de esta entrega. Sin otro texto nuevo.

**2. N-01d2-1: cubierto, sin tocar producción.** 9 casos míos en `features/tareas/clase-archivada-01d2-tareas.test.tsx`, `describe` "ADM-1D221: la recarga tras el 409 ya en vuelo". Parten de las sondas del manager, pero sin su `setTimeout` de 50 ms: la recarga se suelta, se espera `isFetching` en 0 y se dejan correr 50 turnos de promesas dentro de `act`, sin medir tiempo. Suman el caso con la tarea (`RUBRICA_MODIFICADA`), que era su punto de ataque 1. Mi tabla de hermanos ya lo lista.

Mutaciones (`scratchpad\mut5.py`), restauradas por bytes y comprobadas con `cmp` contra una copia previa de cada archivo: `cmp OK` en los tres.

| Mutación | Filtro `-t` | Resultado |
|---|---|---|
| Sin la guarda "al llegar" de `editar-tarea-view.tsx:125` | "fila 36, recarga en vuelo" | `Tests  2 failed \| 1 passed \| 98 skipped (101)` |
| Sin la de `entrega-de-alumno-view.tsx:126` | "fila 33, recarga en vuelo" | `Tests  6 failed \| 95 skipped (101)` |
| Sin las dos | "recarga en vuelo" | `Tests  8 failed \| 1 passed \| 92 skipped (101)` |
| Sin la de `entrega-de-alumno-view.tsx:136` (el `catch`) | "fila 33, recarga en vuelo" | `Tests  6 passed \| 95 skipped (101)`: **no cae** |
| La fecha sola en la fila | "texto aprobado" | `Tests  2 failed \| 115 skipped (117)` |

- **La que no cae:** el `catch` de `recargarTrasConflicto` solo corre si `refetch()` rechaza, y por defecto no rechaza: con `500` entra por `entregaNueva.isError`. No la alcanzo sin simular TanStack Query, así que queda sin caso, declarada.
- **El caso que pasa en las dos mutaciones de la fila 36** es "llega con la clase archivada…": no protege esa guarda, sino el `setReinicios(0)` de `:52` (lo cubre también ADM-1D220 fila 36).

**3. N-01d2-2: corregido** en "Foco al ocultarse un control, fila por fila" de la matriz: fila 22, `h1`; fila 30, según el control. Es lo que midió el manager con sus sondas F22, F30 y F30b; no lo volví a medir.

**4. N-01d2-3: hecho.** ADM-1D235 (e) y (f) usan `clienteComoElDeProviders`, con las opciones de `app/providers.tsx` (`retry: 1`), porque esos casos necesitan la caché a mano. Sin tiempos fijos y sin perder estabilidad: el archivo pasa a 60.77 s y las corridas salieron en verde a la primera. (f) ahora afirma dos peticiones por transición (la petición y el reintento) y que, con `isFetching` en 0, no hay una tercera. Los títulos no cambian.

**Casos nuevos**, de `npx vitest list` (los títulos con `$orden` llevan las comillas de Vitest; los dos de "texto aprobado" salen uno por lista, y los de la fila 33, uno por orden):

- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 36, recarga en vuelo, 'después de restaurar': al llegar no reinicia; lo escrito, el foco y un solo aviso
- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 36, recarga en vuelo, 'después de archivar y restaurar dos v…': al llegar no reinicia; lo escrito, el foco y un solo aviso
- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 36, recarga en vuelo: llega con la clase archivada y, al restaurar, el formulario no se lleva el foco
- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, recarga en vuelo: al llegar bien no reinicia; lo escrito, el foco y un solo aviso (en `fila 33, 'después de restaurar'`)
- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, recarga en vuelo: al llegar con 500, ningún otro aviso; lo escrito y el foco siguen (en `fila 33, 'después de restaurar'`)
- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, recarga en vuelo de la entrega y de la tarea (RUBRICA_MODIFICADA): al llegar no reinicia (en `fila 33, 'después de restaurar'`)
- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, recarga en vuelo: al llegar bien no reinicia; lo escrito, el foco y un solo aviso (en `fila 33, 'después de archivar y restaurar dos v…'`)
- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, recarga en vuelo: al llegar con 500, ningún otro aviso; lo escrito y el foco siguen (en `fila 33, 'después de archivar y restaurar dos v…'`)
- `tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221 fila 33, recarga en vuelo de la entrega y de la tarea (RUBRICA_MODIFICADA): al llegar no reinicia (en `fila 33, 'después de archivar y restaurar dos v…'`)
- `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D202 y ADM-1D203, texto aprobado: cada fila dice Archivada el {fecha}, no la fecha sola (en `ADM-1D217 y ADM-1D218 ('alumno')`)
- `clases/clase-archivada-01d2-vista.test.tsx`: ADM-1D202 y ADM-1D203, texto aprobado: cada fila dice Archivada el {fecha}, no la fecha sola (en `ADM-1D217 y ADM-1D218 ('maestro')`)

**Verificación** (desde `frontend/`; puerta: `15:59:53 puerta: 15 y 7; vitest 0; BatteryStatus 2`; sin `--maxWorkers` y sin repetir archivos)

| Qué | Comando literal | Última línea |
|---|---|---|
| lint | `npm run lint` (exit 0) | `> tsc -b` |
| build | `npm run build` (exit 0) | `✓ built in 804ms` |
| test | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts` | `Tests  4617 passed (4617)`; `Test Files  211 passed (211)`; `Duration  228.15s` |

**Conteos:** `npx vitest list src/features/clases/clase-archivada-01d2-vista.test.tsx src/features/tareas/clase-archivada-01d2-tareas.test.tsx`, con `grep -a -c`: `clase-archivada-01d2-vista` **117** (115 + 2), `clase-archivada-01d2-tareas` **101** (92 + 9); 218 casos. 4606 + 11 = 4617.

**V-01:** la lista extraÃ­da tiene SHA-256 `e2ee9ba20c4b1f748735e62317e85d611ccfc59d46f584373c9a128040d8e6c2`; `sha256sum -c`: 262 OK, 0 distintos; `git ls-files -o --exclude-standard | grep -c ataque`: 0.

**"No se toca" contra `7655a5b`:** `git diff --name-only 7655a5b -- backend shared infra eslint.config.mjs package.json` da 0; `git diff --name-only 7655a5b -- frontend` da 38 y `git ls-files -o --exclude-standard frontend` da 6: los mismos 44 de antes.

**BatteryStatus:** 2. No toqué ninguna `*.ataque`. Sin navegadores. Sin commit.

## ADMIN-01d2 — Corrección ronda 1 (2026-11-06)

Plan `e3279dd1…`, sin cambio. Atiendo T-01, T-02 (arbitraje del manager, "## Arbitraje de T-02 — ADMIN-01d2") y T-03, de `reporte-tester.md`, "## Ronda 1 — ADMIN-01d2". `BatteryStatus` 2. No toqué ninguna `*.ataque`.

### PARADA parcial: dos hermanos de T-01 sin corregir

**El mismo aviso falso sigue en `features/clases/trabajo-view.tsx:99-103` y `features/clases/recursos-view.tsx:62-67`, para el alumno.** Lo medí con una sonda temporal (un archivo de prueba, ya borrado): con la recarga de los temas en `409 CLASE_ARCHIVADA`, el alumno termina en la clase anterior, y antes salta:
- en Actividades: "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos.";
- en Recursos: "No pudimos actualizar Recursos. Mostramos la última versión que tenemos.", con dos llamadas, una por bloque; el mismo `id` de aviso las junta en una en pantalla.

**Por qué paré:** esos dos archivos no están en "Se toca" de 01d2, y el encargo dice que tocar uno de fuera es PARADA. No hay arreglo dentro del alcance: `useAvisoDeRecargaFallida` de `features/clases/hooks.ts` no recibe el error, y cambiar `errorQuitaLaVista` de `lib.ts` iría más allá de su alcance y cambiaría lo que hacen tres vistas.

**Lo que propongo si lo autorizan:** en cada una, `&& !esClaseArchivada(temas.error)` en el segundo argumento, más su `import` de `components/clase/lib`: dos líneas por archivo. Sumaría un caso por vista y su mutación. No escribí un caso en rojo: el encargo pide la suite en verde.

### T-01: corregido en `features/tareas`

**Remedio:** en `useAvisoDeRecargaFallida` de `features/tareas/hooks.ts`, y no en `detalle-tarea-view.tsx`: si la consulta de la tarea falló con `esClaseArchivada(consulta.state.error)`, el fallo queda como atendido y no avisa. Lo lee de la caché, así que ninguna firma cambia y cubre a todos los que llaman al gancho.

**Hermanos, uno por uno** (grep de "Mostramos la última versión" y "Puedes seguir editando", y de cada `useAvisoDeRecargaFallida`). Qué recibe cada rol sale de `enClaseArchivada`: las lecturas son `lectura`, así que el maestro y el admin nunca reciben el `409` en ellas.

| Vista | Alumno | Maestro y admin | ¿Remedio aplicado? |
|---|---|---|---|
| Detalle de tarea (`detalle-tarea-view.tsx:53`) | **Aviso falso** (T-01) | No recibe el `409` | **Sí,** por el gancho; ADM-T1D215 y casos propios |
| Entregas de una tarea (`entregas-view.tsx:59`) | Sin ruta | No recibe el `409` | Sí, por el gancho; caso defensivo |
| Entrega de un alumno (`entrega-de-alumno-view.tsx`, `useAvisoDeRecargaFallida`) | Sin ruta | No recibe el `409` | Sí, por el gancho; caso defensivo |
| Ruta 36 (`editar-tarea-view.tsx`) | Sin ruta | No recibe el `409`; además, sin aviso en solo lectura (tabla D) | Sí, por el gancho; caso defensivo |
| `TEXTOS_CALIFICAR.avisoRecargaFallida` (`entrega-de-alumno-view.tsx:131` y `:137`) | Sin ruta | Solo tras un `409` de calificar; sin el `409` de archivada en la lectura | No aplica |
| Ruta 20 (`editar-recurso-view.tsx:87`) | Sin ruta | No recibe el `409`; además, sin aviso en solo lectura (tabla D) | No aplica |
| Categorías (`categorias-view.tsx:36`) | Sin ruta | No recibe el `409` | No aplica |
| **Actividades, temas (`trabajo-view.tsx:99`)** | **Aviso falso, medido** | No recibe el `409` | **No: PARADA** |
| **Recursos, temas (`recursos-view.tsx:62`)** | **Aviso falso, medido** | No recibe el `409` | **No: PARADA** |
| Recursos, cada sección (`seccion-de-recursos.tsx:64`) | Por lectura: el aviso usa `mensajeDeConsultaClases`, es decir, el texto de archivada, que es cierto. No lo medí | No recibe el `409` | No hace falta |
| Gradebook | Sin ruta | `lectura`; la vista no tiene ese aviso | No aplica |
| Mis calificaciones | `lectura-del-alumno`: nunca recibe el `409`, y la vista no tiene ese aviso | Sin ruta | No aplica |
| Avisos, Dudas, Personas | Reemplazan o avisan con el texto de archivada, sin decir "última versión" (ADM-1D216) | No reciben el `409` | No aplica |
| Hilo privado, «Ver más» (`hilo-privado.tsx:178`) | Avisa con el texto traducido, que es cierto | No recibe el `409` | No aplica |

Los casos "defensivos" fijan el gancho compartido: hoy el servidor no le manda ese `409` al maestro.

**Estados vecinos de T-01:**

| Estado | Resultado | Caso |
|---|---|---|
| Primera carga | Reemplaza con el texto de archivada, sin aviso | T-01 primera carga |
| Recarga con la tarea en caché | Sin aviso | T-01 fallos seguidos, T-01 redirección |
| Error ya en caché, al volver a montar | Sin aviso | T-01 error ya en caché |
| Fallos seguidos: `409`, `409`, `5xx` | El `5xx` avisa una vez: el `409` no se come el siguiente | T-01 fallos seguidos |
| `5xx` solo | Sigue avisando | T-01 estado recarga (control) |
| Cambio de clave (otra tarea) | Cada consulta tiene su marca; por lectura, sin caso | — |
| Con `callado` | El fallo callado no pasa por aquí (`activo` en falso); sin cambio | — |

### T-02: corregido, con el remedio del arbitraje

**Remedio:** `useClaseArchivadaEnSuLista(claseId, archivada)` en `features/clases/hooks.ts`, llamado desde `clase-layout.tsx` y `clase-anterior-view.tsx`. Con la clase archivada lee la lista en caché: sin lista, nada; con la clase en sus páginas, nada; si no, `removeQueries` con `exact: true`. Sin tipos ni textos nuevos (usa el tipo de `shared/`). No está en `useDetalleViejoAnteClaseArchivada` ni en `AvisoDeClaseArchivada`. No toca inscritas ni impartidas, y no marca nada al restaurar. E10-6 sigue en pie: ninguna mutación del admin toca esa clave.

**Hermanos y estados vecinos:**

| Estado | Resultado | Caso (por lista, salvo los dos últimos) |
|---|---|---|
| Pasa a archivada con la vista abierta | Sale de la caché; al volver, sin vacío mientras se pide (petición retenida), y sale la clase | "pasa a archivada con la vista abierta" |
| Nace archivada | Sale de la caché | "nace archivada" |
| La lista ya la trae | 0 peticiones al volver | "la lista ya trae la clase" |
| Varias páginas, en la segunda cargada | 0 peticiones; las dos páginas siguen | "varias páginas" |
| En una página sin cargar | Se quita; una lectura, desde la primera | "la clase en una página sin cargar" |
| Sin lista en caché | Ni petición ni lista creada | "sin lista en caché" |
| Clase activa fuera de la lista | No la toca (es lo normal) | "T-02 control" |
| Restaurada, sigue en la lista | No se marca; 0 peticiones. Vecino 7 ya declarado | "una clase restaurada" |
| Archivar, restaurar y volver a archivar | Una sola lectura al volver | "archivar, restaurar y volver a archivar" |
| Otra clase, sin desmontar | Sale de la caché: `claseId` está en las dependencias | "otra clase archivada" |
| Listas del inicio | No se vuelven a pedir | "no toca las listas del inicio" |
| Alumno por N-05 | Lo cubren las dos vistas | Las de `alumno` |
| Alumno por enlace guardado | Sale de la caché | "por un enlace guardado" |
| Sesión del admin | Ni petición ni lista creada | "la sesión del admin" |

**Fila nueva para la matriz:** detalle que llega archivado con la lista en caché sin la clase | no reemplaza nada | no redirige | — | — | se quita la lista, sin pedirla | ningún aviso | no mueve el foco | sin efecto sobre lo que esté en vuelo | la vista desmontada ya no lee el detalle.

**Queda sin cambio, como dice el arbitraje:** la barra lateral y las listas del inicio traen la clase archivada hasta su siguiente petición. Destino: ESTADO §3 al cierre.

### T-03: corregido

**Remedio:** en `respuestas-de-duda.tsx`, `if (soloLectura && filas?.length === 0 && !respuestas.isError) return null`, después de los ganchos.

**Un defecto que me causó el propio remedio, y que corregí:** sin el `h3`, si la última respuesta se borra (`DELETE` en vuelo) con la clase ya archivada, el foco caía en `<body>`, porque su destino era ese título. Ahora va a la fila de la duda (`data-duda-id`) cuando no hay título. Lo encontró mi caso "T-03 vecino".

**Hermanos (títulos que quedan solos en las filas 22 a 37), uno por uno:**

| Fila | Título | ¿Queda solo? |
|---|---|---|
| 22 | `h2` "Dudas" | No: siempre hay lista, vacío, error o carga |
| 25 | `h3` "Respuestas" con la lista vacía | **Era T-03; corregido** |
| 25 | `h3` "Respuestas" mientras carga o con error | No: hay `Cargando` o el mensaje |
| 25 | Admin, clase activa, bloque vacío | Sí, y **no lo cambio**: es de antes de 01d2, está fuera de "solo lectura", y ese título es el destino de foco (caso de control) |
| 27 | "Agregar alumnos" | No: es del buscador, y se va con él |
| 28 | `h2` "Alumnos" | No: tabla, vacío, error o carga |
| 29 | `h2` "Maestros de la clase" | No: siempre hay de uno a dos |
| 30 | "Asignar maestro" | No: la tarjeta entera se va (ADM-1D226) |
| 31 y 32 | Sin título propio | `AccionesDeLaTarea` devuelve `null` |
| 33 | `h3` "Calificación" | No: la calificación o "Sin calificar todavía." |
| 34 | `h3` "Comentarios privados" | No: lista, vacío, error o carga |
| 35 y 36 | Sin título: el texto y el enlace | No |
| 37 | `h2` de "Mis calificaciones" | No |

**Un resto declarado, sin cambio:** en ese bloque vacío, «Ocultar respuestas» conserva `aria-controls` hacia un `id` que ya no existe. El control sigue siendo útil, y plegar lleva el foco a la fila (ADM-T1D228). Lo mismo pasa hoy con `pedir` en falso. Lo anoto por si el manager lo quiere en un `chore`.

**Estados vecinos de T-03:** abierto al archivar (ADM-T1D227); plegar con el foco en el control (ADM-T1D228); al restaurar vuelven título y formulario sin llevarse el foco (caso propio); con respuestas sigue el título (control); borrar la última en vuelo (caso propio); una recarga con error o en carga sigue pintando el bloque.

### Casos nuevos (`npx vitest list`; los de `describe.each` salen una vez por rol)

- `clases/clase-archivada-01d2-vista.test.tsx`: T-03: al restaurar vuelven el título y el formulario, sin llevarse el foco
- `clases/clase-archivada-01d2-vista.test.tsx`: T-03 control: con respuestas, el título sigue en una archivada
- `clases/clase-archivada-01d2-vista.test.tsx`: T-03 control: en una clase activa, el admin con el bloque vacío conserva el título: el foco tiene a dónde ir
- `clases/clase-archivada-01d2-vista.test.tsx`: T-03 vecino: la última respuesta se borra con la clase ya archivada: el título sale y el foco no cae en body
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: pasa a archivada con la vista abierta y la lista no la trae: al volver no se lee el vacío mientras se pide, y sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: nace archivada (el detalle no estaba en caché) y la lista no la trae: la lista sale de la caché
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: la lista ya trae la clase: al volver, 0 peticiones
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: varias páginas, la clase en la segunda ya cargada: al volver, 0 peticiones y las dos páginas siguen
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: la clase en una página sin cargar: se quita la lista y solo cuesta una lectura, desde la primera
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: sin lista en caché no pasa nada: ninguna petición de la lista
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: una clase restaurada que sigue en la lista: no se marca nada y al volver, 0 peticiones
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: archivar, restaurar y volver a archivar: una sola lectura al volver, y sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: otra clase archivada sin desmontar la vista: la lista trae la primera y no la segunda: sale de la caché
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02 control: una clase activa que no está en la lista no la toca: al volver, 0 peticiones
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: no toca las listas del inicio: no se vuelven a pedir
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: pasa a archivada con la vista abierta y la lista no la trae: al volver no se lee el vacío mientras se pide, y sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: nace archivada (el detalle no estaba en caché) y la lista no la trae: la lista sale de la caché
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: la lista ya trae la clase: al volver, 0 peticiones
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: varias páginas, la clase en la segunda ya cargada: al volver, 0 peticiones y las dos páginas siguen
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: la clase en una página sin cargar: se quita la lista y solo cuesta una lectura, desde la primera
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: sin lista en caché no pasa nada: ninguna petición de la lista
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: una clase restaurada que sigue en la lista: no se marca nada y al volver, 0 peticiones
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: archivar, restaurar y volver a archivar: una sola lectura al volver, y sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: otra clase archivada sin desmontar la vista: la lista trae la primera y no la segunda: sale de la caché
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02 control: una clase activa que no está en la lista no la toca: al volver, 0 peticiones
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: no toca las listas del inicio: no se vuelven a pedir
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: el alumno por un enlace guardado a la clase anterior, con la lista sin ella: la lista sale de la caché
- `clases/clase-archivada-01d2-vista.test.tsx`: T-02: la sesión del admin en una archivada: no hay lista, no pide nada y no la crea
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 estado recarga, alumno, 5xx (control): sigue avisando una vez, porque ahí sí se muestra la última versión
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 fallos seguidos: el 409 no avisa y un 5xx después sí, una vez
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 error ya en caché: volver a montar la vista con el 409 en la caché no avisa
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 primera carga: sin la tarea en caché, el 409 reemplaza la vista con el texto de archivada, sin aviso
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 redirección: con el detalle ya archivado, termina en la clase anterior sin ningún aviso
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 hermanos, maestro, el detalle: el gancho compartido tampoco avisa de una recarga con 409
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 hermanos, maestro, las entregas: el gancho compartido tampoco avisa de una recarga con 409
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 hermanos, maestro, la entrega de un alumno: el gancho compartido tampoco avisa de una recarga con 409
- `tareas/clase-archivada-01d2-tareas.test.tsx`: T-01 hermanos, maestro, editar: el gancho compartido tampoco avisa de una recarga con 409

### Mutaciones

Cada una restaurada por bytes y comprobada con `cmp` contra una copia previa: `cmp OK` en `features/tareas/hooks.ts`, `features/clases/hooks.ts`, `respuestas-de-duda.tsx`, `clase-layout.tsx` y `clase-anterior-view.tsx`.

| Mutación | Corrida | Resultado |
|---|---|---|
| T-01, sin el remedio | Mis casos, `-t "T-01"` | `Tests  7 failed \| 2 passed \| 101 skipped (110)` |
| T-01, sin el remedio | ADM-T1D215 | `Tests  1 failed \| 28 skipped (29)` |
| T-03, sin el remedio | Mis casos, `-t "T-03"` | `Tests  2 failed \| 2 passed \| 117 skipped (121)` |
| T-03, sin el remedio | ADM-T1D227 | `Tests  1 failed \| 27 skipped (28)` |
| T-03, sin el destino de respaldo del foco | "T-03 vecino" | `Tests  1 failed \| 120 skipped (121)` |
| T-03, sin `soloLectura` | `-t "ADM-1D220 fila 25\|T-03"` | `Tests  2 failed \| 3 passed \| 116 skipped (121)` |
| T-02, sin el gancho en `ClaseLayout` | Mis casos, `-t "T-02"` | `Tests  6 failed \| 16 passed \| 121 skipped (143)` |
| T-02, sin el gancho en `ClaseLayout` | ADM-T1D220 | `Tests  1 failed \| 1 passed \| 26 skipped (28)` |
| T-02, sin el gancho en la clase anterior | Mis casos | `Tests  2 failed \| 20 passed \| 121 skipped (143)` |
| T-02, sin mirar si ya la trae | Mis casos | `Tests  8 failed \| 14 passed \| 121 skipped (143)` |
| T-02, invalidar en lugar de quitar | Mis casos | `Tests  7 failed \| 15 passed \| 121 skipped (143)` |
| T-02, sin `claseId` en las dependencias | Mis casos | `Tests  2 failed \| 22 passed \| 121 skipped (145)` |
| T-02, sin mirar si está archivada | Mis casos | `Tests  2 failed \| 22 passed \| 121 skipped (145)` |

Todas caen. Las dos últimas al principio no caían (`22 passed`): "otra clase" pasaba porque, sin el detalle de B en caché, `archivada` pasaba por falso; y faltaba el caso de la clase activa. Corregí esas pruebas, y por eso cambia el total de 143 a 145.

### Verificación (desde `frontend/`; puerta `16:55:01 puerta: 14 y 9; vitest 0; BatteryStatus 2`; sin `--maxWorkers`)

| Qué | Comando literal | Última línea |
|---|---|---|
| lint | `npm run lint` (exit 0) | `> tsc -b` |
| build | `npm run build` (exit 0) | `✓ built in 863ms` |
| test | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts` | `Tests  4711 passed (4711)`; `Test Files  213 passed (213)`; `Duration  229.93s` |
| Los dos archivos del tester | `npx vitest run src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx` | `Tests  57 passed (57)`; `Test Files  2 passed (2)` |

Ningún rojo. ADM-T1D215, ADM-T1D220 (las dos listas) y ADM-T1D227, en verde. Sin navegadores ni tiempos fijos. `npx` solo desde `frontend/`.

**Conteos:** `npx vitest list src/features/clases/clase-archivada-01d2-vista.test.tsx src/features/tareas/clase-archivada-01d2-tareas.test.tsx`, con `grep -a -c`: `clase-archivada-01d2-vista` **145** (117 + 28), `clase-archivada-01d2-tareas` **110** (101 + 9). La corrida anterior del programador daba 4617; 4617 + 37 + 57 de las `*.ataque` nuevas = 4711.

**V-01:** la lista de 262 (`e2ee9ba20c4b1f748735e62317e85d611ccfc59d46f584373c9a128040d8e6c2`) da `sha256sum -c`: 262 OK, 0 distintos; mÃ¡s las dos nuevas del tester: en clases `0fc7408a9c9e039c700956c8132790e689b84db3714f52080df86aecb387d88b`, en tareas `af127fae8354906737c857aa497a29a53514c928fa4dcfbfc79a41e3fbc13eee`. Total 264: `git ls-files | grep -c ataque` da 262 rastreadas y `git ls-files -o --exclude-standard | grep -c ataque`, 2 sin rastrear.

**Producción cambiada en esta corrección:** `features/tareas/hooks.ts`, `features/clases/components/respuestas-de-duda.tsx`, `features/clases/hooks.ts`, `features/clases/clase-layout.tsx` y `features/clases/clase-anterior-view.tsx`. Todos ya en "Se toca"; `clase-layout.tsx` y `hooks.ts` por el arbitraje de T-02.

### Hallazgos atendidos

- **T-01:** corregido en `features/tareas`. **Sus hermanos `trabajo-view.tsx` y `recursos-view.tsx`: no corregidos, PARADA** por alcance.
- **T-02:** corregido.
- **T-03:** corregido.

### Pendiente

- La autorización de los dos archivos de arriba.
- A ESTADO §3 al cierre, según el arbitraje: la barra lateral y las listas del inicio.
- `aria-controls` del bloque vacío: a decidir.
- **Lo de `npx` del tester** (dos paquetes en la caché fuera del repositorio) no es mío; lo decide el humano.

### Hermanos autorizados de T-01

El humano autorizó tocar `features/clases/trabajo-view.tsx` y `features/clases/recursos-view.tsx`, solo para esto. Esta subsección cierra la "PARADA parcial" de arriba; lo que allí dice "No: PARADA" queda corregido.

**Remedio, y nada más en esos dos archivos** (`git diff 7655a5b` da tres líneas por archivo): `&& !esClaseArchivada(temas.error)` en el segundo argumento de `useAvisoDeRecargaFallida`, más su `import` de `@/components/clase/lib`.

**Otras vistas con el mismo patrón** (grep de "última versión" y "Puedes seguir editando", y de `recargaFallida`, `avisoRecarga` y `useAvisoDeRecargaFallida` en todo `frontend/src`): **no queda ninguna con el aviso falso, así que no hay otra PARADA.**

| Vista | Rol que la abre | ¿Le llega el `409`? | Resultado |
|---|---|---|---|
| `trabajo-view.tsx` | Alumno | Sí | **Corregida ahora** |
| `recursos-view.tsx` | Alumno | Sí | **Corregida ahora** |
| `categorias-view.tsx` (mismo patrón y mismo texto) | Maestro y admin; `gestionarTrabajo` | No: `GET …/categorias` es `lectura` (`handlers/tareas/categorias.ts:17`) | Sin aviso falso. No la toqué; no está autorizada ni hace falta |
| `editar-recurso-view.tsx` | Maestro y admin | No; además, sin aviso en solo lectura (tabla D) | Sin aviso falso |
| `seccion-de-recursos.tsx` | Alumno | Sí | Avisa con el texto de archivada, que es cierto. Lo cubre "toda la sección a la vez" |
| Secciones de `trabajo-view` (`seccion-de-tema.tsx`) | Alumno | Sí | No llaman al aviso. Lo cubre "toda la sección a la vez" |
| `detalle-tarea-view`, `entregas-view`, `entrega-de-alumno-view`, `editar-tarea-view` | — | — | Las cubre el gancho de `features/tareas` (arriba) |

**Estados vecinos:** recarga con datos (caso del `409`); `5xx` solo (control); fallos seguidos, `409` y después `5xx`: el `409` no se come el siguiente; toda la sección a la vez. La primera carga no pasa por este aviso, porque sin datos su segundo argumento es falso.

**Casos nuevos** (`npx vitest list`; el `describe.each` da uno por vista):

- `clases/clase-archivada-01d2-vista.test.tsx` (`'Actividades de aprendizaje'`): T-01 hermano: la recarga de los temas con 409 no da el aviso falso y el alumno termina en la clase anterior
- `clases/clase-archivada-01d2-vista.test.tsx` (`'Actividades de aprendizaje'`): T-01 hermano, control: con un 5xx el aviso de siempre sigue saliendo y el alumno se queda
- `clases/clase-archivada-01d2-vista.test.tsx` (`'Actividades de aprendizaje'`): T-01 hermano, fallos seguidos: el 409 no avisa y un 5xx después sí
- `clases/clase-archivada-01d2-vista.test.tsx` (`'Actividades de aprendizaje'`): T-01 hermano, toda la sección a la vez: temas y listas con 409: ningún aviso de última versión y termina en la clase anterior
- `clases/clase-archivada-01d2-vista.test.tsx` (`'Recursos'`): T-01 hermano: la recarga de los temas con 409 no da el aviso falso y el alumno termina en la clase anterior
- `clases/clase-archivada-01d2-vista.test.tsx` (`'Recursos'`): T-01 hermano, control: con un 5xx el aviso de siempre sigue saliendo y el alumno se queda
- `clases/clase-archivada-01d2-vista.test.tsx` (`'Recursos'`): T-01 hermano, fallos seguidos: el 409 no avisa y un 5xx después sí
- `clases/clase-archivada-01d2-vista.test.tsx` (`'Recursos'`): T-01 hermano, toda la sección a la vez: temas y listas con 409: ningún aviso de última versión y termina en la clase anterior

**Mutaciones** (`-t` por vista), restauradas por bytes y comprobadas con `cmp` contra una copia previa: `cmp OK` en los dos archivos.

| Mutación: sin `&& !esClaseArchivada(temas.error)` | Resultado |
|---|---|
| Actividades sin el remedio | `Tests  2 failed \| 2 passed \| 149 skipped (153)` |
| Recursos sin el remedio | `Tests  2 failed \| 2 passed \| 149 skipped (153)` |

En Actividades identifiqué cuáles caen con una corrida más, también restaurada con `cmp`: "la recarga de los temas con 409" y "fallos seguidos". Siguen en verde el control del `5xx`, como debe, y "toda la sección a la vez": mi explicación, que deduzco y no medí, es que ahí el detalle archivado llega primero y la vista ya no está cuando responden los temas. Sea cual sea la causa, ese caso no protege esta guarda; protege que ningún otro camino dé el aviso. En Recursos no lo identifiqué; da las mismas cifras.

**Verificación** (desde `frontend/`; puerta `17:17:02 puerta: 4 y 2; vitest 0; BatteryStatus 2`; sin `--maxWorkers`). Las mutaciones corrieron después, con la suite ya terminada; no volví a cambiar nada entre las dos.

| Qué | Comando literal | Última línea |
|---|---|---|
| lint | `npm run lint` (exit 0) | `> tsc -b` |
| build | `npm run build` (exit 0) | `✓ built in 814ms` |
| test | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts` | `Tests  4719 passed (4719)`; `Test Files  213 passed (213)`; `Duration  251.53s` |
| Los dos archivos del tester | `npx vitest run src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx` | `Tests  57 passed (57)`; `Test Files  2 passed (2)` |

**Conteos:** `npx vitest list src/features/clases/clase-archivada-01d2-vista.test.tsx src/features/tareas/clase-archivada-01d2-tareas.test.tsx`, con `grep -a -c`: `clase-archivada-01d2-vista` **153** (145 + 8), `clase-archivada-01d2-tareas` **110**. 4711 + 8 = 4719.

**V-01:** la lista de 262 (`e2ee9ba20c4b1f748735e62317e85d611ccfc59d46f584373c9a128040d8e6c2`) da `sha256sum -c`: 262 OK, 0 distintos; mÃ¡s las dos nuevas del tester: en clases `0fc7408a9c9e039c700956c8132790e689b84db3714f52080df86aecb387d88b`, en tareas `af127fae8354906737c857aa497a29a53514c928fa4dcfbfc79a41e3fbc13eee`. Total 264: `git ls-files | grep -c ataque` da 262 rastreadas y `git ls-files -o --exclude-standard | grep -c ataque`, 2 sin rastrear.

No toqué ninguna `*.ataque`. `aria-controls` de «Ocultar respuestas» no cambia: queda para ESTADO §3 al cierre. Sin navegadores ni tiempos fijos.

## ADMIN-01d2 — Corrección ronda 2 (2026-11-06)

Plan `e3279dd1…`, sin cambio. Atiendo T-04 de `reporte-tester.md`, "## Ronda 2 — ADMIN-01d2", con el remedio de "## Arbitraje de T-04 — ADMIN-01d2" de `revision.md`. O-r2-1 se aceptó: no toqué nada por eso. No toqué ninguna `*.ataque`.

### T-04: corregido

**Remedio, solo en `useClaseArchivadaEnSuLista` (`features/clases/hooks.ts`), sin tipos ni textos nuevos, tal como lo escribió el manager:** lee `getQueryState` en lugar de `getQueryData`, con `enVuelo = consulta?.fetchStatus === "fetching"`. Sin nada en vuelo y sin datos, no hace nada; sin nada en vuelo y con la clase en sus páginas, no hace nada; en cualquier otro caso, `removeQueries` con `exact: true`. El comentario del gancho dice la regla: al leer la clase archivada, la lista en caché solo se queda si no tiene nada en vuelo y ya trae esa clase, o si no hay nada que quitar. Prettier parte la segunda guarda en varias líneas; es la misma condición. Único archivo de producción de esta corrección.

### Estados del mecanismo (copiados de la sección del manager, con su caso o "por lectura")

| Estado de la lista al leer la clase archivada | Con el remedio | Cubierto por |
|---|---|---|
| Sin consulta en la caché | No hace nada; al abrirla, se pide | "T-02: sin lista en caché…", "T-02: la sesión del admin…" |
| Sin datos, quieta (error de la primera carga) | No hace nada; al abrirla, se pide porque no hay datos | Sonda del manager, y ADM-T2D203 con filas; **sin caso mío** |
| Sin datos, en vuelo | **Se quita (T-04)** | "T-04: la primera página en vuelo llega… antes de volver", "…después de volver", "…falla después", "…hacia una clase que ya estaba archivada" |
| Sin datos, en pausa (sin red) | No hace nada: la petición aún no sale | Por lectura |
| Sin la clase, quieta | Se quita | "T-02: pasa a archivada…", "T-02: nace archivada…" |
| Sin la clase, en vuelo (recarga o «Cargar más») | Se quita | ADM-T2D201 |
| Sin la clase, en pausa | Se quita | Por lectura; mismo camino que "quieta" |
| Con la clase, quieta | Se queda | "T-04 control", "T-02: la lista ya trae la clase…" |
| Con la clase, en vuelo | **Se quita** | "T-04: con la clase en la lista y una recarga en vuelo…" |
| Con la clase, en pausa | Se queda | Por lectura |
| Con la lista en error y filas | Se decide por sus filas, y al desmontarse ya salió | ADM-T2D203 |
| Otra clase archivada sin desmontar | `claseId` en las dependencias | "T-02: otra clase archivada…", ADM-T2D204 |
| Página sin cargar | Se quita; una lectura por apertura | "T-02: la clase en una página sin cargar…", ADM-T2D206 |
| Alumno por N-05 y por un enlace guardado | Las dos vistas llaman al gancho; la segunda ya no encuentra nada | Casos de `alumno`, "T-02: el alumno por un enlace guardado…" |
| ¿Puede empezar una lectura de la lista con la clase abierta? | No: solo la monta la lista; por eso el efecto no vuelve a correr | Por lectura |

**El costo, medido:** si la persona sale de la lista hacia la clase con algo en vuelo, hay una lectura más ("T-04: la lista salió en vuelo…" afirma 2 peticiones). Sin ciclo ni vacío falso.

**Queda fuera, como dice el arbitraje:** una clase restaurada que sigue en la lista (vecino 7); la barra lateral y las listas del inicio (ESTADO §3 al cierre); la lista abierta, sin salir de ella, mientras el admin archiva otra clase (E10-6).

### Casos nuevos (`npx vitest list`; el `describe.each` da uno por lista)

- `clases/clase-archivada-01d2-vista.test.tsx` (`'alumno'`): T-04: la primera página en vuelo llega sin la clase antes de volver: sin vacío, y sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx` (`'alumno'`): T-04: la primera página en vuelo llega después de volver: sin vacío en medio ni al final, y sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx` (`'alumno'`): T-04: la primera página en vuelo falla después: sin su error ni el vacío, y al volver sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx` (`'alumno'`): T-04: la lista salió en vuelo hacia una clase que ya estaba archivada: una lectura más, sin vacío
- `clases/clase-archivada-01d2-vista.test.tsx` (`'alumno'`): T-04: con la clase en la lista y una recarga en vuelo que no la trae: sale de la caché y al volver sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx` (`'alumno'`): T-04 control: la lista quieta que ya trae la clase se queda cuando la clase pasa a archivada: al volver, 0 peticiones
- `clases/clase-archivada-01d2-vista.test.tsx` (`'maestro'`): T-04: la primera página en vuelo llega sin la clase antes de volver: sin vacío, y sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx` (`'maestro'`): T-04: la primera página en vuelo llega después de volver: sin vacío en medio ni al final, y sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx` (`'maestro'`): T-04: la primera página en vuelo falla después: sin su error ni el vacío, y al volver sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx` (`'maestro'`): T-04: la lista salió en vuelo hacia una clase que ya estaba archivada: una lectura más, sin vacío
- `clases/clase-archivada-01d2-vista.test.tsx` (`'maestro'`): T-04: con la clase en la lista y una recarga en vuelo que no la trae: sale de la caché y al volver sale la clase
- `clases/clase-archivada-01d2-vista.test.tsx` (`'maestro'`): T-04 control: la lista quieta que ya trae la clase se queda cuando la clase pasa a archivada: al volver, 0 peticiones

### Mutaciones

Sobre `features/clases/hooks.ts`, restauradas por bytes y comprobadas con `cmp` contra una copia previa: `cmp OK`. Hay una por cada condición nueva.

| Mutación | Corrida | Resultado |
|---|---|---|
| Sin `!enVuelo` en la guarda de "sin datos" | Mis casos, `-t "T-04"` | `Tests  6 failed \| 6 passed \| 153 skipped (165)` |
| Sin `!enVuelo` en la guarda de "sin datos" | ADM-T2D202 | `Tests  2 failed \| 22 skipped (24)` |
| Sin `!enVuelo` en la guarda de "ya la trae" | Mis casos, `-t "T-04"` | `Tests  2 failed \| 10 passed \| 153 skipped (165)` |
| `enVuelo` mirando otro `fetchStatus` | Mis casos, `-t "T-04"` | `Tests  8 failed \| 4 passed \| 153 skipped (165)` |

La última la repetí sola: en la tanda, mi `timeout` de 175 s cortó la corrida y su línea no sumaba (`5 failed | 2 passed | 153 skipped (165)`). Esa cifra no cuenta.

### Corrida a batería, que no cuenta como resultado

A las 18:16:02 el equipo se desconectó (`Kernel-Power` id 105; `BatteryStatus` 1). Corrí igual, como pide el encargo, con el comando literal y la puerta `18:28:51 puerta: 1 y 0; vitest 0; BatteryStatus 1`:

`Test Files  3 failed | 212 passed (215)` · `Tests  10 failed | 4759 passed (4769)` · `Duration  968.40s`

Cayeron `app/personas-03c1-r2.ataque` (7), `app/personas-03c1-r1.ataque` (1) y `features/clases/clases-admin-02c-r1.ataque` (2). Ninguna toca este gancho. En la salida hay 6 `Test timed out in 15000ms` y un `Unable to find role="button" and name "Cargar más clases"`; **no revisé uno por uno los 10**, así que no afirmo que todos sean por tiempo. Lo que sí afirmo es que el mismo comando, sin cambiar nada, sale en verde con el equipo conectado (abajo). El equipo volvió a la corriente a media corrida: la última lectura dio `BatteryStatus` 2. Repetí el comando completo, no solo esos archivos. Sin `--maxWorkers`.

### Verificación (desde `frontend/`; puerta de la corrida que cuenta: `18:48:51 puerta: 8 y 6; vitest 0; BatteryStatus 2`)

| Qué | Comando literal | Última línea |
|---|---|---|
| lint | `npm run lint` (exit 0), a batería | `> tsc -b` |
| build | `npm run build` (exit 0), a batería | `✓ built in 1.79s` |
| test | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/components/clase src/app src/styles/clases-r1.ataque.test.ts src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/errores-ch3-r2.ataque.test.ts src/components/layout/estatico-r1.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/services/apiClient-ch3.test.ts` | `Tests  4769 passed (4769)`; `Test Files  215 passed (215)`; `Duration  397.83s` |
| Los cuatro archivos del tester | `npx vitest run src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx src/features/tareas/clase-archivada-01d2-r2.ataque.test.tsx src/features/clases/clase-archivada-01d2-r2.ataque.test.tsx` | `Tests  95 passed (95)`; `Test Files  4 passed (4)` |

Ningún rojo; ADM-T2D202, en las dos listas, en verde. Sin navegadores ni tiempos fijos. `npx` solo desde `frontend/`. Lint y build corrieron antes de esa suite, sin cambios de código en medio.

**Conteos:** `npx vitest list src/features/clases/clase-archivada-01d2-vista.test.tsx src/features/tareas/clase-archivada-01d2-tareas.test.tsx`, con `grep -a -c`: `clase-archivada-01d2-vista` **165** (153 + 12), `clase-archivada-01d2-tareas` **110**.

**V-01:** la lista de 262 (`e2ee9ba20c4b1f748735e62317e85d611ccfc59d46f584373c9a128040d8e6c2`) da `sha256sum -c`: 262 OK, 0 distintos; mÃ¡s las cuatro nuevas del tester: `-r1` en clases `0fc7408a9c9e039c700956c8132790e689b84db3714f52080df86aecb387d88b`, `-r1` en tareas `af127fae8354906737c857aa497a29a53514c928fa4dcfbfc79a41e3fbc13eee`, `-r2` en clases `4e3a45f7672489373d6d1ad3f2309c572e9b7930e846fa9596b60a858c933294`, `-r2` en tareas `940817a89a4aaa1703187248e6c53dcbfe97c1af053b2f78c265e34f0ce50e7a`. Total 266: `git ls-files | grep -c ataque` da 262 rastreadas y `git ls-files -o --exclude-standard | grep -c ataque`, 4 sin rastrear.

### Hallazgos atendidos

T-04: corregido. O-r2-1: aceptado por el manager, sin cambios.

### Desviaciones del plan

Ninguna. Un caso de más: "T-04: la lista salió en vuelo hacia una clase que ya estaba archivada…", que fija el costo que describe el arbitraje.

### Pendiente

Sin cambio: lo de ESTADO §3 al cierre (barra lateral y listas del inicio, `aria-controls`, N-01d1-4 y el foco de N-05). El estado "sin datos, quieta" no tiene caso mío: se apoya en la sonda del manager y en ADM-T2D203.

## ADMIN-01e — Implementación (2026-11-09)

**Estado: PARADA** antes de `prisma migrate dev` (paso 22): la migración `admin_01_usuarios_y_movimientos` la confirma el humano (`AGENTS.md`, "Pide confirmación antes de"; encargo del orquestador). Retomo con su confirmación: aplicar la migración, la verificación de deriva (N-06) y los pasos 23 a 25.

- Plan: `docs/trabajo/ADMIN-01-administracion/plan.md`, SHA-256 `7018e1f321364350554c1a2fdd2cd2e5f0c54ea18c3586ce8c62a1ad2b4e97cf` (Enmiendas 1 a 13), comprobado al empezar con `sha256sum`.
- Base de "No se toca" dentro de los paquetes: `ea718bc`.
- Entorno: sin otra copia de trabajo ni otra suite corriendo (respuesta del humano de hoy, por el orquestador; antes de cada corrida comprobé que no había ningún `node` con `vitest`). Docker Desktop encendido. **Red `uacam5 2`, perfil Privado: PA-01 resuelta para la sesión de hoy por autorización del humano** (la regla del firewall solo cubre el perfil Público). `BatteryStatus` 2 (corriente). Sin navegadores. No terminé procesos. Sin commit.
- Lecturas: `reporte-tester.md`, "## Ronda 0 — ADMIN-01e" (O-01e-1 a O-01e-10 y OA-01e-1); `aprobacion.md` (Enmienda 13, ronda 0 de 01e, OA-01e-1); N-26, N-32 y E8-4 en `revision.md`.

### Pasos completados: 2 de 6 (20 y 21), y el 22 preparado sin aplicar

| Paso | Estado |
|---|---|
| 20. `shared/src/usuarios-admin.ts` | Hecho, con `index.ts` y `build` de `shared` |
| 21. `core/usuarios/` con ADM-1E01 | Hecho: `baja.ts`, `acceso.ts`, `busqueda.ts`, `textos.ts`, cada uno con su prueba |
| 22. Migración | **Preparada, sin aplicar (PARADA):** `schema.prisma` editado, `prisma format` y `prisma validate` en verde, SQL calculado con `prisma migrate diff` entre esquemas (sin base). Falta `prisma migrate dev`, `prisma generate`, la verificación de deriva (N-06) y ADM-1E16 |
| 23 a 25 | Pendientes |

### Archivos (solo de "Se toca" de 01e)
- Nuevos: `shared/src/usuarios-admin.ts`; `backend/src/core/usuarios/{baja,acceso,busqueda,textos}.ts` y sus cuatro `*.test.ts`.
- Modificados: `shared/src/index.ts` (exporta los esquemas y tipos nuevos), `backend/prisma/schema.prisma` (tres índices en `usuarios`, uno en `movimientos_inscripcion` y los dos comentarios de `MovimientoInscripcion`, A-09).
- `git status --short -- shared backend frontend` (sin las once `*.ataque` de la ronda 0): ` M backend/prisma/schema.prisma`, ` M shared/src/index.ts`, `?? backend/src/core/usuarios/`, `?? shared/src/usuarios-admin.ts`. Ninguna `*.ataque` tocada; ninguna prueba normal existente tocada.
- SHA-256: `shared/src/usuarios-admin.ts` `465fdd571bec922fbaa566af2453f9827d826bfdd6256a18853e535f8e3555ce`; `backend/prisma/schema.prisma` `394760a44d5482a21398fae1862db2f711dcba01d743400d0ee36f6b3fb26dd9`.

### La migración que pido aplicar: `admin_01_usuarios_y_movimientos` (§Cambios, prisma, 01e)

**SQL** (salida de `npx prisma migrate diff --from-schema <schema de ea718bc> --to-schema prisma/schema.prisma --script`, desde `backend/`; el esquema de `ea718bc` sale de `git show ea718bc:backend/prisma/schema.prisma`; no toca ninguna base). Copia en `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\migracion-01e-propuesta.sql`, SHA-256 `14b918bf57ac070eac6cef4683ac4e7e43e1201c168bcebc92f8140ebd1e39cf`:

```sql
-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "usuarios_nombre_busqueda_id_idx" ON "usuarios"("nombre_busqueda", "id");

-- CreateIndex
CREATE INDEX "usuarios_rol_nombre_busqueda_id_idx" ON "usuarios"("rol", "nombre_busqueda", "id");

-- CreateIndex
CREATE INDEX "movimientos_inscripcion_secuencia_idx" ON "movimientos_inscripcion"("secuencia" DESC);
```

| Qué | Detalle |
|---|---|
| Tablas nuevas | Ninguna |
| Columnas nuevas o cambiadas | Ninguna |
| Índices nuevos | `usuarios_email_idx` (GIN `gin_trgm_ops` sobre `email`: la búsqueda por parte del correo, S-12, ADM-1E16); `usuarios_nombre_busqueda_id_idx` (orden de la lista sin filtro de rol); `usuarios_rol_nombre_busqueda_id_idx` (orden con `rol`; también la tabla de estado de pago de 01g); `movimientos_inscripcion_secuencia_idx` (`secuencia DESC`, S-09). El de `(alumno_id, secuencia DESC)` no va (Enmienda 1) |
| Restricciones (`CHECK`, FK, únicos) | Ninguna. Nada escrito a mano: Prisma expresa los cuatro índices, así que la verificación de deriva (N-06) no debería proponer cambios; si propone borrar los índices parciales o los `CHECK` de 01a y 01b, PARADA |
| Extensión | `pg_trgm` ya existe (la usa `usuarios_nombre_busqueda_idx`, GIN); la migración no la crea |
| Compatibilidad hacia atrás | Solo índices: un backend anterior no los nota y no cambia ninguna consulta. `CREATE INDEX` (no `CONCURRENTLY`, Prisma corre la migración en una transacción) bloquea las escrituras de `usuarios` y `movimientos_inscripcion` mientras se construye; con las tablas del piloto es un instante |
| Comentarios del esquema (A-09) | `MovimientoInscripcion` dice ahora que la lee la consulta de movimientos del admin, sin filtros, con el índice `(secuencia DESC)` (el comentario ya no decía "Sin índices secundarios…": 01b lo había cambiado) |
| Diff del esquema | `git diff -U0 -- backend/prisma/schema.prisma`: `@@ -121,0 +122,5` (los tres `@@index` de `Usuario` con su comentario), `@@ -253 +258,2` y `@@ -259 +265,2` (comentarios de `MovimientoInscripcion`), `@@ -272,0 +280` (`@@index([secuencia(sort: Desc)])`) |

**Al retomar, con la confirmación:** desde `backend/`, `npx prisma migrate dev --name admin_01_usuarios_y_movimientos` contra la base local de desarrollo; `npx prisma validate`, `npx prisma generate`; `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` (N-06) sin diferencias; después ADM-1E16 y los pasos 23 a 25.

### Decisiones de detalle dentro del plan (para que el manager las contraste)
1. **`decidirCambioDeActivo`, orden de las guardas:** admin → `409 CUENTA_DE_ADMINISTRACION` (también al pedir `activo: true`); después "mismo estado → `{ escribir: false }`"; después la baja de un maestro con clases activas → `409 MAESTRO_CON_CLASES`. §D-7.4 enumera los tres casos sin fijar el orden; puse "mismo estado" antes del conflicto para que repetir la baja de un maestro ya inactivo, al que una clase restaurada dejó con una clase activa (N-14), no sea un `409` sino "sin escribir" (ADM-1E05: "repetir → sin escribir"). Caso: "ADM-1E01: mismo estado → sin escribir (también la baja repetida de un maestro que ya tiene clases)".
2. **`decidirCambioDeAcceso`:** restablecer a quien ya tiene acceso no escribe aunque el pedido traiga motivo (S-10: restablecer borra el motivo); restringir de nuevo escribe si el motivo pedido (`undefined` → `null`) es distinto del guardado, sin revocar sesiones (ya se revocaron al restringir; la fecha la conserva el adaptador, §D-8).
3. **`prepararBusquedaDeUsuarios`:** `nombre` = `prepararTerminoDeBusqueda` (la normalización de `shared/` y el mínimo de 3) con `escaparComodinesLike`; `email` = el término recortado y en minúsculas (como `normalizarCorreo`), escapado, sin quitar acentos ni juntar espacios, para que `+` y `_` de un correo se busquen tal cual. `null` si el normalizado tiene menos de 3. Reutiliza `core/clases/busqueda.ts` sin cambiarlo.
4. **`textos.ts`** reúne los textos de §D-7, §D-8 y §D-12 (con el singular y el plural de `MAESTRO_CON_CLASES`), más `usuarioNoEncontrado` con el texto que ya usa `handlers/admin.ts` y el `400` del lote ("alumnoIds: hay cuentas que no son de alumnos", S-11; su resto no empieza con un nombre en camelCase, así que `errores-ch3-r2.ataque` sigue en verde).
5. **`shared/src/usuarios-admin.ts`:**
   - `GET /admin/usuarios/:id`, `PUT …/nombre` y `PUT …/activo` (y el acceso) responden **la fila** (`usuarioAdminFilaSchema`), sin envoltorio: §D-7.2 dice "la misma forma de una fila" y §D-7.3 "Responde la fila". El alta responde `{ usuario, contrasenaTemporal }` (§D-7.5).
   - `listaUsuariosConsultaSchema`: límite 1..100 por omisión 50; `q` valida aquí solo el máximo (120 normalizados o 1000 crudos, el mismo texto que el buscador de candidatos) y el mínimo lo decide `core/` (`400 BUSQUEDA_MUY_CORTA`); `estadoPago` sin `rol=estudiante` → `superRefine` con ruta `estadoPago`, que `validarParametros` responde como `400 VALIDACION` "estadoPago: Solo se filtra por estado de pago entre los alumnos"; `cursorNombre` es `z.string().optional()` sin mensaje (Enmienda 5). Ningún literal con la forma `"<nombre>: …"` en `shared/src` (`errores-ch3-r2.ataque:258`, en verde).
   - `usuarioAdminFilaSchema`: los cinco campos de alumno, opcionales, con un `superRefine` que los exige en las filas de estudiantes y los prohíbe en las demás (§Cambios, shared, 01e). Las respuestas son `z.object`, que descarta `hashContrasena`, `nombreBusqueda`, `debeCambiarContrasena` y `enlaceRegistroId` (ADM-1E15).
   - `estadoPagoLoteSchema`: 1 a 100 ids, sin repetidos también con otra capitalización (como `archivoIdsSchema`).
   - **`accesoSchema.motivo`:** `normalizarTextoLargo` → `textoLargoSchema(1000)` (prohíbe controles e inversores de dirección) → hasta 300 visibles ("El motivo no puede tener más de 300 caracteres") → sin visibles, `undefined`. **El tope crudo de 1000 no está en el plan:** S-10 mide en visibles y no dice nada de controles; sin un tope, `textoLargoSchema` no se puede usar y un `\0` en el motivo daría `500` de PostgreSQL. Sigue el precedente de `LONGITUD_MAXIMA_BUSQUEDA_CRUDA` ("solo para no procesar entradas absurdas"). Si el manager prefiere otro tope o medir sin él, es una línea.
   - No agregué un `CODIGOS_…` para los códigos nuevos: el plan no lo pide en 01e (lo verá 01f si lo necesita).
   - S-16 (`cuentaDesactivada` en `shared/src/clases.ts`) queda para el paso 23, como dice el plan; por eso C-42 sigue en rojo.

### Verificación (comando exacto y última línea; una corrida después de otra)
- **build `shared`:** `cd shared; npm run build` → exit 0; última línea `> tsc -p tsconfig.json` (sin errores).
- **lint `shared`:** `cd shared; npm run lint` → exit 0; `All matched files use Prettier code style!`.
- **lint backend:** `cd backend; npm run lint` → exit 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores; corrido después de editar el esquema).
- **prisma:** `cd backend; npx prisma format` → `Formatted prisma\schema.prisma in 39ms 🚀`; `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀`. `prisma generate` no corrió: va con `migrate dev`, al retomar.
- **test backend (módulo tocado y estáticas que leen `backend/src` o `shared/src`):** `cd backend; npx vitest run src/core/usuarios test/arquitectura-cuentas-r1.ataque.test.ts test/temas-01a-r1.ataque.test.ts test/temas-01a-r3.ataque.test.ts test/lecturas-fx-r2.ataque.test.ts test/nombres-ids-01a-r2.ataque.test.ts test/entregas-01b-r1.ataque.test.ts test/esquemas-exportacion.test.ts test/alumnos-b-r1.ataque.test.ts` → `Test Files  12 passed (12)` · `Tests  145 passed (145)`. Antes, solo `npx vitest run src/core/usuarios` → `Tests  17 passed (17)`.
- **lint frontend:** `cd frontend; npm run lint` → exit 0; `> tsc -b`.
- **build frontend:** `cd frontend; npm run build` → exit 0; `✓ built in 1.66s`.
- **test frontend:** 01e no toca `frontend/`; la única prueba del frontend que lee `shared/src` (grep de `shared/src` en `*.test.{ts,tsx}`) es `src/lib/errores-ch3-r2.ataque.test.ts`: `cd frontend; npx vitest run src/lib/errores-ch3-r2.ataque.test.ts` → `Tests  85 passed (85)`.
- No corrí las suites completas (las corre el manager al cerrar) ni los once archivos de los C-n (ver abajo).

### Pruebas requeridas (01e)
- **ADM-1E01** → cubierta, 17 casos:
  - `backend/src/core/usuarios/baja.test.ts`: "ADM-1E01: la cuenta de administración → 409 CUENTA_DE_ADMINISTRACION, al darla de baja y al reactivarla"; "ADM-1E01: maestro con 1 clase activa → 409 MAESTRO_CON_CLASES con el texto en singular"; "ADM-1E01: maestro con 3 clases activas → 409 MAESTRO_CON_CLASES con el texto en plural"; "ADM-1E01: baja de un maestro sin clases activas y de un alumno → escribe"; "ADM-1E01: reactivar escribe, también a un maestro con clases asignadas"; "ADM-1E01: mismo estado → sin escribir (también la baja repetida de un maestro que ya tiene clases)".
  - `backend/src/core/usuarios/acceso.test.ts`: "ADM-1E01: un maestro o el admin → 409 NO_ES_ALUMNO, al restringir y al restablecer"; "ADM-1E01: restringir a un alumno con acceso → escribe y revoca sus sesiones, con motivo o sin él"; "ADM-1E01: restablecer a un alumno restringido → escribe y no revoca"; "ADM-1E01: mismo estado → sin escribir (restringido con el mismo motivo o sin motivo; con acceso)"; "ADM-1E01: restringir de nuevo con otro motivo (o quitándolo) → escribe el motivo, sin revocar".
  - `backend/src/core/usuarios/busqueda.test.ts`: "ADM-1E01: quita acentos, pasa a minúsculas y junta espacios en el nombre; el correo, recortado y en minúsculas"; "ADM-1E01: menos de 3 caracteres normalizados → null (también con espacios o acentos de sobra)"; "ADM-1E01: escapa %, _ y \ en el nombre y en el correo"; "ADM-1E01: errorBusquedaMuyCorta → 400 BUSQUEDA_MUY_CORTA con su texto".
  - `backend/src/core/usuarios/textos.test.ts`: "ADM-1E01: MAESTRO_CON_CLASES en singular con 1 y en plural con 2 y con 10"; "ADM-1E01: los textos de §D-7 y §D-8, literales".
- **ADM-1E02 a ADM-1E22** → **no cubiertas todavía** (paso 25, después de la migración, los adaptadores y las rutas). ADM-1E16 necesita la migración aplicada.
- **Lista cerrada** (`movimientos-inscripcion.integracion:243-281`, PR-B16g y PR-B16h; E6 de `bloqueo-usuario.integracion`) → sin tocar todavía (paso 25).

**Conteos:** `cd backend; npx vitest list src/core/usuarios` → 17 líneas con "ADM-1E01" (`grep -ac "ADM-1E01"`): `acceso.test.ts` 5, `baja.test.ts` 6, `busqueda.test.ts` 4, `textos.test.ts` 2; 4 archivos.

### C-n de la ronda 0 (rojo → verde)
No corrí los once archivos en esta entrega: nada de lo que hice cambia su estado. Según la ronda 0 del tester: **C-6** (`sesiones-y-cadena`, faltan las 13 rutas) pasa a verde en el paso 24; **C-8** (`lecturas-fx-r1`, faltan `gestion-de-usuarios.ts:2` y `movimientos.ts:1`) en el paso 23; **C-42** (`gestion-02a-r1`, claves de `b`) en el paso 23 con S-16 y el `build` de `shared` (O-01e-5); **C-7** es comentario; **C-25 a C-32**, en verde hoy, se comprueban en el paso 25 con `serializers.req`. Los declaro con su salida al terminar.

### Vigiladas
- En verde en la corrida de arriba: `arquitectura-cuentas-r1.ataque:100-124` (ningún `console.` ni `estadoPago` en `handlers/admin.ts` ni `adapters/db/tokens-cuenta.ts`, que no toqué), `temas-01a-r1.ataque:985-997`, `temas-01a-r3.ataque:426-428`, `lecturas-fx-r2.ataque:967`, `alumnos-b-r1.ataque:1149-1162` y `:1156`; y `frontend/src/lib/errores-ch3-r2.ataque.test.ts:258` (prefijos de `shared/src` y del backend).
- Las demás (Enmiendas 1, 4, 7, 8 y 13, y M-09) dependen de los pasos 23 a 25: las corro al terminar.
- OA-01e-1: las rutas de §D-7 y §D-8 irán en `backend/src/handlers/admin/usuarios.ts`, registrado por el plugin de `handlers/admin.ts`, sin la palabra `estadoPago` en `admin.ts` ni en `tokens-cuenta.ts`.

### Matriz de §D-1 (backend) y hermanos
- **Matriz:** 01e no suma rutas con `:claseId` (§D-R0 01e, E7-3), así que la tabla de §D-1 no gana filas; la matriz de las nueve rutas de §D-7 y §D-8 (rol incorrecto, sin token, restringido, estado de pago) va en el resumen final, con las rutas ya escritas.
- **Hermanos:** no aplica (no es una corrección de hallazgo).

### Pendientes para los pasos que siguen (no hechos aquí)
- **N-26** (ADM-1E22): el caso unitario de `opcionesDeLogger` usará un secreto distintivo (`secreto-cuerpo-1e22`), no `"s"`.
- **E8-4**: ADM-1E02, ADM-1E10 y ADM-1E11 con filtro propio, misma instantánea (`ejecutor` como último parámetro de `leerResumenAdmin`, `listarUsuarios` y `listarMovimientosDeInscripcion`) o propiedades de la respuesta.
- **N-32** (las ~30 líneas duplicadas de `conReintentoDeCodigo` y `traducirErrorDeCodigo` entre `adapters/db/clases.ts` y `duplicado-de-clase.ts`): `duplicado-de-clase.ts` no está en "Se toca" de 01e y la revisión lo condiciona a que el arquitecto lo admita sin enmienda; no lo toco. Queda para el carril trivial al cierre, salvo que el orquestador traiga esa admisión.
- O-01e-2 (conteo exacto de `instantaneaUnica: true`), O-01e-3 (ayudas nuevas de `clases.ts` fuera de los tramos vigilados), O-01e-4 (13 rutas exactas, parámetro `:id`), O-01e-5 (`build` de `shared` antes de la suite), O-01e-7 (revocar con `UPDATE`, nunca `DELETE`), O-01e-8 (`listarPersonas` con Prisma) y O-01e-9: leídas, se aplican en los pasos 23 a 25.

### Desviaciones del plan
Ninguna. Una interpretación declarada para el manager: el tope crudo de 1000 del motivo (punto 5 de "Decisiones de detalle"). El orden de las guardas de `decidirCambioDeActivo` (punto 1) está dentro de §D-7.4, que no lo fija.

### Continuación tras la confirmación de la migración (2026-11-09)

**Estado: terminado** (pasos 22 a 25). El humano autorizó la migración ("Autorizo", por el orquestador). El orquestador indicó: el tope de 1000 del motivo se queda y lo arbitra el manager; N-32 queda fuera de 01e (carril trivial al cierre). Entorno sin cambios: sin otra suite ni otra copia, Docker encendido, red `uacam5 2` autorizada hoy (PA-01 resuelta para la sesión), `BatteryStatus` 2. Antes de cada corrida comprobé que ningún `node` corría `vitest`. Pasos completados: **6 de 6** (20 a 25).

#### Paso 22: la migración
- `npx prisma migrate dev --name admin_01_usuarios_y_movimientos --create-only` (contra `campus_dev`, `127.0.0.1:5433`; no pidió resetear) creó `backend/prisma/migrations/20261109150104_admin_01_usuarios_y_movimientos/migration.sql` (SHA-256 `6b427bd4b98ae15e4631765858a6a39c094c7f131443b876d6010aa2ffc8685d`). **Mismo SQL que el propuesto (`14b918bf…`): los mismos cuatro `CREATE INDEX`, línea por línea** (`diff` de las líneas ordenadas: solo difiere una línea vacía); **el orden cambia**: `migrate dev` pone primero el de `movimientos_inscripcion` (orden alfabético de tablas) y `migrate diff` lo ponía al final. Sin efecto: son cuatro índices independientes. Lo declaro por si el orquestador lo cuenta como "otro SQL".
- `npx prisma migrate dev` → `Applying migration 20261109150104_admin_01_usuarios_y_movimientos` · `Your database is now in sync with your schema.`
- `npx prisma generate` → `✔ Generated Prisma Client (7.10.0) to .\src\adapters\db\generated in 221ms`; `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀`.
- **Deriva (N-06):** `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → `No difference detected.`, exit 0 (no propone borrar los índices parciales ni los `CHECK` de 01a y 01b).

#### Pasos 23 a 25: archivos
- **shared:** `shared/src/clases.ts` (S-16: `cuentaDesactivada: z.literal(true).optional()` en `maestroDeClaseSchema` y en los maestros de `personasRespuestaSchema`, con `personaConCorreoSchema.extend`; `personaConCorreoSchema` de los compañeros no cambia).
- **core:** `backend/src/core/usuarios/fila.ts` (nuevo): `filaDeUsuarioAdmin`, la fila que ve el admin (datos de pago y acceso solo con `rol = estudiante`, fechas en ISO). Va en `core/` para que el handler no compare roles.
- **adapters:** `adapters/db/gestion-de-usuarios.ts` y `movimientos.ts` (nuevos), `index.ts`; `clases.ts` (`crearClaseAdministrada` con cada intento en `enTransaccion` y `bloquearMaestrosActivos`; `SELECT_MAESTROS_DE_CLASE` y `maestrosDeFilas` con `activo` opcional y la marca; `MaestroDb` gana `cuentaDesactivada?: true`); `maestros-de-clase.ts` (`asignarMaestro` con `bloquearMaestrosActivos`); `inscripciones.ts` (solo `listarPersonas`: `activo` en el `select` de Prisma y la marca; tipo `MaestroDePersonasDb`); `tokens-cuenta.ts` (M-18: `if (usuario === null || !usuario.activo) return false` tras el bloqueo, sin cambio de firma); `adapters/README.md`.
- **config:** `backend/src/config/logger.ts`: solo `serializers: { req: peticionSinConsulta }` (los campos del serializador por omisión de Fastify 5.12.5, `url` cortada en el primer `?`; tolera un objeto sin `url` ni `method` y no devuelve el cuerpo). `redact`, `level` y la firma no cambian.
- **handlers:** `backend/src/handlers/admin/usuarios.ts` (nuevo, `usuariosAdminHandler`, las nueve rutas con parámetro `:id` y `protegido({ roles: ["admin"] })` en cada una); `handlers/admin.ts` solo suma el `import` y `await app.register(usuariosAdminHandler)` con un comentario (OA-01e-1: ni `admin.ts` ni `tokens-cuenta.ts` nombran `estadoPago`); `handlers/README.md`.
- **Lista cerrada:** `backend/test/movimientos-inscripcion.integracion.test.ts` (PR-B16g: título y `:248` → `printRoutes({ commonPrefix: false })` con una sola aparición de «movimiento», en `admin/movimientos-inscripcion`, y `403` para el maestro; lo demás del caso igual. PR-B16h: título y el único export `listarMovimientosDeInscripcion`; hunks `@@ -243 +243,3`, `@@ -248 +250,10`, `@@ -277 +288,2`, `@@ -280 +292,3`) y `backend/test/bloqueo-usuario.integracion.test.ts` E6 (las tres partes: título, `"gestion-de-usuarios.ts"` en su lugar alfabético y la línea `// ADMIN-01e (§D-7): …`; `movimientos.ts` no usa SQL etiquetado). Por qué `commonPrefix: false` en PR-B16g: con el árbol comprimido, "movimientos-inscripcion" se parte bajo el prefijo común `m` de `maestros` y la cuenta daba 0 (la primera corrida falló por eso).
- **Pruebas nuevas:** `backend/test/usuarios-admin.integracion.test.ts`, `usuarios-admin-baja.integracion.test.ts`, `usuarios-admin-pago-acceso.integracion.test.ts`, `usuarios-admin-resumen-movimientos.integracion.test.ts`, `usuarios-admin-autorizacion.integracion.test.ts`, `usuarios-admin-migracion.integracion.test.ts`, `logs-usuarios-admin.integracion.test.ts`, `backend/src/config/logger-sin-consulta.test.ts` y la ayuda nueva `backend/test/ayudas-usuarios-admin.ts`.
- **"No se toca":** `git diff --name-only ea718bc -- shared backend frontend` (sin las once `*.ataque` de la ronda 0) lista solo archivos de "Se toca" de 01e más `config/logger.ts` (la excepción de M-09). Ninguna `*.ataque` tocada; ninguna prueba normal fuera de la lista cerrada. Conteo de `instantaneaUnica: true` (C-8, O-01e-2): `gestion-de-usuarios.ts` 2, `movimientos.ts` 1, `clases.ts` 4 (`grep -c`).

#### Verificación final (comando exacto y última línea; una corrida después de otra, `BatteryStatus` 2)
- **lint `shared`:** `cd shared; npm run lint` → `All matched files use Prettier code style!`. **build `shared`:** `cd shared; npm run build` → exit 0 (`> tsc -p tsconfig.json`).
- **lint backend:** `cd backend; npm run lint` → exit 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (el `prelint` reconstruye `shared` y corre `prisma generate`).
- **test backend (módulos de 01e):** desde `backend/`, `npx vitest run $(cat modulos-01e.txt)` con la lista de 70 rutas guardada en `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\modulos-01e.txt`: `src/core/usuarios`, `src/config/logger-sin-consulta.test.ts`, `src/config/logger.ataque.test.ts`, las siete pruebas nuevas de `test/`, las dos de la lista cerrada, los once archivos de los C-n, las 31 vigiladas de la ronda 0 del tester, los demás archivos del patrón 1 de la Enmienda 13 (`duplicado-de-clase.integracion`, `clases-archivadas.integracion`, `borrado-duplicado-r1`, `lecturas-consistentes.integracion`, `entregas-01b-r1`, `calificaciones.integracion`, `muro-admin.integracion`, `concurrencia-02a-r1`, `autoria-02b-r1`), `hilo-01c-r1` (O-01e-9), los de tokens de cuenta (`cuentas-r3`, `invitacion-flujo-03a-r2`, `invitacion.integracion`, `restablecer.integracion`, `admin-restablecimiento.integracion`), `higiene-de-pruebas.integracion` y `cuerpos-02a-r2`. Última corrida (09:38:56): `Test Files  73 passed (73)` · `Tests  1027 passed (1027)` (la de las 09:27:04 dio lo mismo; entre las dos solo cambió ADM-1E15). Contención: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0, `"code":"P2028"` 5: los tres deterministas de `servicio-ocupado` (`req-1`, `req-3`, `req-5`, `SERVICIO_OCUPADO`) y dos de `cuentas-r3.ataque` (`:713-800`, el login y el restablecimiento formados detrás de una fila retenida más de 5 s), `503`, a propósito.
- **lint frontend:** `cd frontend; npm run lint` → exit 0; `> tsc -b`. **build frontend:** `cd frontend; npm run build` → `✓ built in 1.08s`.
- **test frontend:** 01e no toca `frontend/`; el módulo que consume los esquemas que cambiaron (S-16: `personasRespuestaSchema` y `claseRespuestaSchema`, que usa `features/clases/hooks.ts`) más la prueba que lee `shared/src`: `cd frontend; npx vitest run src/features/clases src/lib/errores-ch3-r2.ataque.test.ts` → `Test Files  114 passed (114)` · `Tests  2482 passed (2482)`.
- **prisma:** `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀`; deriva → `No difference detected.`.

#### Pruebas requeridas (01e)
**Conteo:** desde `backend/`, `npx vitest list src/core/usuarios src/config/logger-sin-consulta.test.ts test/usuarios-admin.integracion.test.ts test/usuarios-admin-baja.integracion.test.ts test/usuarios-admin-pago-acceso.integracion.test.ts test/usuarios-admin-resumen-movimientos.integracion.test.ts test/usuarios-admin-autorizacion.integracion.test.ts test/usuarios-admin-migracion.integracion.test.ts test/logs-usuarios-admin.integracion.test.ts` → **77** casos con "ADM-1E" (`grep -ac`), en 12 archivos: `acceso.test.ts` 5, `baja.test.ts` 6, `busqueda.test.ts` 4, `textos.test.ts` 2, `logger-sin-consulta.test.ts` 3, `usuarios-admin` 21, `usuarios-admin-baja` 17, `usuarios-admin-pago-acceso` 9, `usuarios-admin-resumen-movimientos` 4, `usuarios-admin-autorizacion` 1, `usuarios-admin-migracion` 2, `logs-usuarios-admin` 3. Por id (`grep -ac "ADM-1E<n>:"`): 1E01 17, 1E02 7, 1E03 1, 1E04 2, 1E05 6, 1E06 1, 1E07 3, 1E08 5, 1E09 4, 1E10 2, 1E11 2, 1E12 1, 1E13 2, 1E14 1, 1E15 1, 1E16 2, 1E17 3, 1E18 2, 1E19 2, 1E20 1, 1E21 7, 1E22 5.

- **ADM-1E01** → los 17 casos de `src/core/usuarios/*.test.ts`, con sus títulos en la primera entrega de esta sección.
- **ADM-1E02** → `test/usuarios-admin.integracion.test.ts`: "ADM-1E02: busca por parte del nombre sin acentos ni mayúsculas y por parte del correo"; "ADM-1E02: filtro por rol, y estadoPago solo con rol=estudiante (si no, 400 VALIDACION)"; "ADM-1E02: término de menos de 3 caracteres normalizados → 400 BUSQUEDA_MUY_CORTA"; "ADM-1E02: los comodines se escapan: % y _ solo se encuentran a sí mismos"; "ADM-1E02: ordena por nombre y pagina con cursor y cursorNombre; siguienteCursorNombre es el nombre de la última fila y es null exactamente cuando siguienteCursor lo es"; "ADM-1E02: un cursor que no cumple los filtros (mandado con su nombre real) → 400"; "ADM-1E02: las cuentas dadas de baja salen con activo: false; los datos de pago y acceso solo en las filas de estudiantes". Todo con un `q` propio (E8-4 (a)).
- **ADM-1E03** → mismo archivo: "ADM-1E03: la ficha de un id inexistente → 404 USUARIO_NO_ENCONTRADO; la de una cuenta existente, su fila".
- **ADM-1E04** → mismo archivo: "ADM-1E04: editar el nombre cambia nombre y nombre_busqueda: la búsqueda encuentra el nuevo y no el viejo"; "ADM-1E04: un nombre que nombreSchema rechaza → 400 VALIDACION sin escribir; una cuenta inexistente → 404".
- **ADM-1E05** → `test/usuarios-admin-baja.integracion.test.ts`: "ADM-1E05: la baja revoca el refresco, el login responde lo mismo que una contraseña incorrecta y el enlace vivo ya no sirve; reactivar devuelve el login con su contraseña"; "ADM-1E05: la baja de un maestro también revoca su invitación viva"; "ADM-1E05: la cuenta de administración → 409 CUENTA_DE_ADMINISTRACION, sin escribir"; "ADM-1E05: un maestro con una clase activa → 409 MAESTRO_CON_CLASES (singular) y sigue activo"; "ADM-1E05: un maestro solo con clases archivadas → baja 200; sigue asignado y sale con cuentaDesactivada: true en el detalle (admin) y en «Personas» (el otro maestro)"; "ADM-1E05: un maestro sin clases → baja; repetirla responde la fila sin escribir".
- **ADM-1E06** → mismo archivo: "ADM-1E06: con la fila retenida, el refresco y la baja quedan en serie y la sesión rotada también queda revocada".
- **ADM-1E07** → `test/usuarios-admin.integracion.test.ts`: "ADM-1E07: 201 con la temporal y Cache-Control: no-store; la cuenta nace estudiante, activa, al corriente y con el cambio obligatorio; el login con la temporal lleva al cambio obligatorio" (el login responde `200`; `/me` y las demás rutas, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, el contrato de `admin-restablecimiento.integracion:56`); "ADM-1E07: un correo repetido, también con otra capitalización → 409 CORREO_EN_USO sin crear otra cuenta"; y `test/logs-usuarios-admin.integracion.test.ts`: "ADM-1E07: la contraseña temporal del alta no aparece en los logs (ni el hash de las cuentas)".
- **ADM-1E08** → `test/usuarios-admin-pago-acceso.integracion.test.ts`: "ADM-1E08: con 1 id y con 100 ids responde 200 con los actualizados"; "ADM-1E08: 101 ids, una lista vacía o ids repetidos (también con otra capitalización) → 400 VALIDACION sin escribir"; "ADM-1E08: un id de maestro o inexistente → 400 «alumnoIds: hay cuentas que no son de alumnos» sin escribir ninguna fila"; "ADM-1E08: fecha_estado_pago cambia solo en las filas cuyo estado cambia"; "ADM-1E08: dos lotes cruzados con los mismos ids en orden inverso, a la vez → los dos 200, sin deadlock" (30 ids, cinco vueltas).
- **ADM-1E09** → mismo archivo: "ADM-1E09: restringir con motivo → la siguiente petición con el token vivo responde 403 ACCESO_RESTRINGIDO, las sesiones quedan revocadas y /me (tras volver a entrar) trae el motivo; restablecer lo borra"; "ADM-1E09: restringir de nuevo con otro motivo cambia el motivo y conserva la fecha; repetir con el mismo no escribe"; "ADM-1E09: a un maestro → 409 NO_ES_ALUMNO sin escribir; una cuenta inexistente → 404"; "ADM-1E09: un motivo de 301 caracteres visibles → 400 sin escribir; 300 visibles con espacios de más pasan; uno de solo espacios queda sin motivo".
- **ADM-1E10** → `test/usuarios-admin-resumen-movimientos.integracion.test.ts`: "ADM-1E10: las tres cifras son las de sus conteos en la misma instantánea, y cambian exactamente al crear un alumno, dar de baja a un maestro y archivar una clase (transacción que se deshace)" (E8-4 (b): `enTransaccion(obtenerDb(), …, { instantaneaUnica: true, timeout: 10_000 })`, `leerResumenAdmin(tx)` y un error centinela); "ADM-1E10: por HTTP, la forma de la respuesta y alumnos ≥ 1 tras crear un alumno activo" (E8-4 (c)).
- **ADM-1E11** → mismo archivo: "ADM-1E11: orden por secuencia descendente dentro y entre páginas, sin ids repetidos; los movimientos del caso en su orden relativo; el actor admin firmado «Administración»; sin estado de pago; claseId y alumnoId en la consulta se ignoran" (recorre hasta 40 páginas buscando sus movimientos por id); "ADM-1E11: un cursor inexistente → 400 cursor: no es válido".
- **ADM-1E12** → `test/usuarios-admin-baja.integracion.test.ts`: "ADM-1E12: crear una clase o asignar un maestro dado de baja → 404 MAESTRO_NO_ENCONTRADO".
- **ADM-1E13** → mismo archivo: "ADM-1E13: con la baja formada antes, tras confirmarla el uso del token se rechaza y la contraseña no cambia"; "ADM-1E13: la cuenta desactivada justo antes de soltar la fila (sin revocar el token): el uso relee activo bajo el bloqueo y se rechaza sin escribir". El segundo es el que solo cierra M-18: la baja ya revoca el token, así que el primero pasaría también sin M-18.
- **ADM-1E14** → `test/usuarios-admin-autorizacion.integracion.test.ts`: "ADM-1E14: sin token 401; estudiante y maestro 403 ROL_NO_PERMITIDO; alumno restringido 403 ACCESO_RESTRINGIDO; nada se escribe; ninguna respuesta lleva el estado de pago" (las 9 rutas y los 4 `HEAD`; ninguna lleva `:claseId`, así que no hay caso de clase ajena).
- **ADM-1E15** → `test/usuarios-admin.integracion.test.ts`: "ADM-1E15: las claves de todo el JSON de cada ruta de 01e (lista, ficha, nombre, activo, alta, estado de pago, acceso, resumen y movimientos) no incluyen hashContrasena, nombreBusqueda, debeCambiarContrasena ni enlaceRegistroId" (con `clavesDe`, a cualquier profundidad).
- **ADM-1E16** → `test/usuarios-admin-migracion.integracion.test.ts`: "ADM-1E16: la migración está aplicada y los cuatro índices nuevos existen con su definición"; "ADM-1E16: la búsqueda por parte del correo usa el índice GIN (EXPLAIN sin Seq Scan sobre usuarios con enable_seqscan = off)".
- **ADM-1E17** → `test/usuarios-admin-baja.integracion.test.ts`: "ADM-1E17: alumno del alta: con A creada, restablecer da B; A ya no entra y B sí; restablecer otra vez da C y B deja de servir"; "ADM-1E17: un login con la temporal que verificó el hash antes del restablecimiento y crea la sesión después no crea sesión"; "ADM-1E17: un maestro invitado: restablecer da B, B entra; restablecer da C y B deja de servir; la cuenta del admin sigue en 403 OPERACION_NO_PERMITIDA".
- **ADM-1E18** → mismo archivo: "ADM-1E18: con la baja formada primero sobre la fila del maestro, asignar, crear y duplicar esperan y responden 404 MAESTRO_NO_ENCONTRADO sin escribir"; "ADM-1E18: con la escritura formada primero, la baja responde 409 MAESTRO_CON_CLASES y el maestro sigue activo". Los dos con `conFilaRetenida`; cada uno recorre asignar, crear y duplicar, y comprueba que nunca queda un maestro inactivo asignado a una clase activa.
- **ADM-1E19** → mismo archivo: "ADM-1E19: un maestro activo sale sin la clave cuentaDesactivada y uno inactivo con cuentaDesactivada: true en el detalle, en asignar y quitar y en «Personas»"; "ADM-1E19: en la lista del admin, la clase con un maestro inactivo lo marca y el activo sale sin la clave" (recorre la lista global por páginas, con tope, hasta encontrar su clase).
- **ADM-1E20** → `test/usuarios-admin.integracion.test.ts`: "ADM-1E20: POST /admin/usuarios/buscar sigue respondiendo como hoy".
- **ADM-1E21** → mismo archivo, (a) a (i): "ADM-1E21: página 1 [N1, N2] con la posición de N2; (a) la siguiente → [N3, N4]"; "ADM-1E21: (b) N2 renombrada hacia delante, hacia atrás o solo en mayúsculas → 400 cursor: no es válido, nunca 200; (c) devuelta a su nombre exacto → 200 [N3, N4]"; "ADM-1E21: (d) un cursorNombre que no coincide → 400: otro nombre, el mismo con espacios de más, el texto vacío"; "ADM-1E21: (e) cursor sin cursorNombre → 400; (f) cursorNombre sin cursor → 400"; "ADM-1E21: (g) un nombre con espacios, +, &, %, ñ y acentos como cursorNombre codificado → 200 con la página siguiente"; "ADM-1E21: (h) con rol=estudiante&estadoPago=deudor, el mismo (a) y (b)"; "ADM-1E21: (i) R-19, lo que la posición no cubre: con la página 1 [N1, N2], renombrar N4 antes de N1 hace que la página 2 responda 200 [N3, N5]" (con el comentario que cita R-19).
- **ADM-1E22** → `src/config/logger-sin-consulta.test.ts`: «ADM-1E22: registrar { req: { method: "GET", url: "/a/b?x=1&y=2" } } deja "url":"/a/b" y el método»; "ADM-1E22: el camino completo, con sus ids, se conserva; una URL sin consulta no cambia"; "ADM-1E22: un objeto { req: { body } } sin url ni method no lanza y no deja el cuerpo (secreto distintivo, N-26)" (N-26: `secreto-cuerpo-1e22`); y `test/logs-usuarios-admin.integracion.test.ts`: "ADM-1E22: precondición: las peticiones respondieron lo esperado y hay una línea «incoming request» por petición, con su método y su ruta sin consulta"; "ADM-1E22: ningún req.url del log lleva «?», y el log no contiene el estado de pago, los nombres de los parámetros, los nombres ni los correos de las alumnas, el término buscado ni ningún cursor (tampoco codificados para URL)".
- **Lista cerrada** → `test/movimientos-inscripcion.integracion.test.ts`: "PR-B16g: solo /api/admin/movimientos-inscripcion contiene «movimiento» en printRoutes, y exige admin; ninguna respuesta de las rutas de b contiene el id ni la secuencia de una fila de movimientos_inscripcion" y "PR-B16h: el único export de adapters/db/index cuyo nombre contiene «movimiento» es listarMovimientosDeInscripcion"; `test/bloqueo-usuario.integracion.test.ts`: "E6: solo salud.ts, …, copias-de-archivos.ts y gestion-de-usuarios.ts usan SQL etiquetado en adapters/db". Los tres en verde en la corrida de módulos.

**Una diferencia con la letra de ADM-1E22:** la primera lista con `estadoPago=deudor` lleva además `q=<marca>`. Sin el `q`, la página 1 de la lista global de deudores trae la cuenta de otra prueba, y el `cursorNombre` de la página 2 no sería el nombre de nuestras alumnas: la aserción "el log no contiene su nombre" no probaría nada. Con el `q`, el cursor es de ellas; las tres listas siguen siendo `/api/admin/usuarios` con `rol=estudiante&estadoPago=…`.

**Mutaciones** (en memoria, con el archivo restaurado después; guion `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\mutar.py`): quitar el `activo` de M-18 → ADM-1E13 `1 failed`; `asignarMaestro` sin el bloqueo → ADM-1E18 `2 failed`; `crearClaseAdministrada` sin el `return null` del bloqueo → ADM-1E18 `1 failed`; sin `serializers.req` → ADM-1E22 `4 failed`; sin la marca de S-16 → ADM-1E19 `2 failed`; la baja sin revocar → ADM-1E05 `1 failed`; el cursor sin comparar `cursorNombre` → ADM-1E21 `3 failed`. Después, `git diff --stat` sin restos de las mutaciones.

#### C-n de la ronda 0 (rojo → verde)
Corrida de los once archivos de los C-n más la lista cerrada (09:09:17), y después dentro de la corrida de módulos (09:38:56):
- **C-6** (`sesiones-y-cadena.ataque`, las 13 rutas): rojo → **verde**. `noReconocidas` vacío.
- **C-7**: comentario; el caso de C-6, en verde.
- **C-8** (`lecturas-fx-r1.ataque`, `"adapters/db/gestion-de-usuarios.ts:2"` y `"adapters/db/movimientos.ts:1"`): rojo → **verde**, con el número que el tester previó (2 y 1).
- **C-42** (`gestion-02a-r1.ataque`, claves de `b`): rojo → **verde** tras S-16 en `adapters/db/clases.ts` y `shared/src/clases.ts` con el `build` de `shared` (O-01e-5).
- **C-25 a C-32** (centinela por camino): verdes antes y **verdes** con `serializers.req`.
Esa corrida dio `1 failed | 125 passed (126)`: el único rojo fue mi primera versión de PR-B16g (lista cerrada, `printRoutes` comprimido), corregida con `commonPrefix: false`; después `Tests  8 passed (8)` en ese archivo y todo en verde en la de módulos.

#### Vigiladas
Todas en verde en la corrida de módulos, sin tocarlas: Enmienda 1 y Enmienda 13 (`clases-r1.ataque:593-641`, `clases.integracion:178-191`, `gestion-02a-r1.ataque:269`, `:674-675`, `:681-682` y `:688`, `admin-muro-02b-r1.ataque:740-741`, `:779` y `:812`, `alumnos-b-r1.ataque:459-460`, `alumnos.integracion:135-140`, `clases-archivadas-r1.ataque:848-856`, `gestion-clases.integracion:429-435` y `:484-488`); Enmienda 4 (`alumnos-b-r1.ataque:1149-1162` y `:1156`, `temas-01a-r1.ataque:985-997`, `temas-01a-r3.ataque:426-428`); Enmienda 7 (`clases-archivadas-matriz.integracion:222-233`, `gestion-clases-autorizacion.integracion:395-425`, `autorizacion-cuentas.integracion:40-53`, `guarda-todas-las-rutas.integracion:141`, `recursos-autorizacion.integracion:580-598`, `clases-archivadas-r1.ataque:622-628`, `cuentas-r2.ataque:310-319`); generales (`arquitectura-cuentas-r1.ataque:100-124`, `lecturas-fx-r2.ataque:967`); Enmienda 8 (`admin-unico.integracion:50`, `admin-unico.ataque:32` y `:56`, `cuentas-r1.ataque:592`, `cuentas-03a-r1.ataque:496`, `enlaces-03b-r1.ataque:234`, `invitacion-masiva-03c-r1.ataque:297` y `:354`, `sesiones-y-cadena.ataque:769`); M-09 (`logs-02a-r1.ataque:200-211`, `logs-03b-r1.ataque:259-261`, `logs-03c-r1.ataque:228-229`, `logs-muro-c-r1.ataque:230`, `logs-muro-c-r2.ataque:243`, `logs-02b-r1`, `logs-archivos-d-r1`, `logs-archivos-d-r3`, `config/logger.ataque.test.ts:60-82`, `worker-r1.ataque:52`, `worker-r2.ataque:42`, `servicio-ocupado.integracion:274-…`); `hilo-01c-r1.ataque:705-753` (O-01e-9). Ninguna PARADA.

#### Matriz del backend (§D-1 y las rutas nuevas)
- **§D-1:** 01e no suma rutas con `:claseId` (E7-3), así que la tabla de §D-1 no gana filas; ADM-1A09 (`clases-archivadas-matriz.integracion`) y ADM-T1A09 siguen en verde con las 13 entradas nuevas en el árbol (`noReconocidas` vacío).
- **Rutas nuevas** (todas `protegido({ roles: ["admin"] })`, sin `pertenencia` ni `enClaseArchivada`), según ADM-1E14 y los casos de cada una:

| Ruta | Sin token | Estudiante | Maestro | Alumno restringido | Admin | Estado de pago en la respuesta |
|---|---|---|---|---|---|---|
| `GET` y `HEAD /admin/usuarios` | 401 | 403 `ROL_NO_PERMITIDO` | 403 `ROL_NO_PERMITIDO` | 403 `ACCESO_RESTRINGIDO` | 200; 400 `BUSQUEDA_MUY_CORTA`; 400 `VALIDACION` (cursor, `estadoPago` sin `rol=estudiante`) | Solo en filas de estudiantes |
| `GET` y `HEAD /admin/usuarios/:id` | 401 | 403 | 403 | 403 | 200; 404 `USUARIO_NO_ENCONTRADO` | Solo si es estudiante |
| `PUT /admin/usuarios/:id/nombre` | 401 | 403 | 403 | 403 | 200; 400 `VALIDACION`; 404 | Ídem |
| `PUT /admin/usuarios/:id/activo` | 401 | 403 | 403 | 403 | 200; 409 `CUENTA_DE_ADMINISTRACION`, `MAESTRO_CON_CLASES`; 404 | Ídem |
| `POST /admin/alumnos` | 401 | 403 | 403 | 403 | 201 (`no-store`); 409 `CORREO_EN_USO`; 400 | Sí (es estudiante) |
| `PUT /admin/alumnos/estado-pago` | 401 | 403 | 403 | 403 | 200 `{ actualizados }`; 400 `VALIDACION` | No (solo el conteo) |
| `PUT /admin/alumnos/:id/acceso` | 401 | 403 | 403 | 403 | 200; 409 `NO_ES_ALUMNO`; 400; 404 | Sí (es estudiante) |
| `GET` y `HEAD /admin/resumen` | 401 | 403 | 403 | 403 | 200 | No |
| `GET` y `HEAD /admin/movimientos-inscripcion` | 401 | 403 | 403 | 403 | 200; 400 cursor | No |

Ninguna respuesta para estudiantes o maestros lleva estado de pago (ninguna de estas rutas los admite; ADM-1E14 lo comprueba en los cuerpos `403`).

#### Hermanos
No hay hallazgos que corregir en esta entrega. Sí revisé por analogía los hermanos de los remedios del plan:
- **N-03 (bloqueo de los maestros):** asignar (aplicado), crear (aplicado), duplicar (ya en 01b, sin cambio). Los tres con ADM-1E18 en los dos órdenes.
- **S-16 (`cuentaDesactivada`):** detalle, lista del admin, crear y editar (todas por `maestrosDeFilas` con `SELECT_MAESTROS_DE_CLASE`), asignar y quitar (`leerMaestros`, mismo `select`) y «Personas» (`listarPersonas`): aplicado en todas. No aplica a inscritas ni a `GET /clases/anteriores` (leen solo `nombre`; C-42 exige que inscritas no cambie) ni al duplicado (su `select` no pide `activo` y sus maestros son activos por el bloqueo; `duplicado-de-clase.ts` no está en "Se toca").
- **M-18 (`activo` bajo el bloqueo):** `usarTokenYCambiarContrasena` es la única que consume un token; `prepararTokenDeRecuperacion` crea un token, no lo consume (no lo cambié: un token de una cuenta inactiva ya no se puede usar, por M-18 y por `decidirUsoDeToken`) y `cambiarContrasenaPropia` exige una sesión viva, que la baja ya revocó.
- **M-09 (la consulta en el log):** el serializador vale para todas las peticiones de la API; el worker no registra `req`. Las listas con consulta de otras rutas (`/admin/clases`, `/admin/maestros/candidatos`, `/clases/:claseId/alumnos/candidatos`, enlaces) quedan cubiertas por el mismo remedio (ADM-1E22 pide tres de ellas).
- **Cursor con posición:** `cursorNombre` solo en `GET /admin/usuarios` (la tabla de §D-2); movimientos sin posición (`secuencia` no cambia), como dice el plan.

#### Decisiones de detalle (además de las de la primera entrega)
6. **`core/usuarios/fila.ts`** (nuevo, dentro de `core/usuarios/`): la fila que ve el admin. Así el handler no compara `rol` para decidir qué campos manda.
7. **`cambiarActivo` y `cambiarAcceso` reciben la decisión de `core/` por parámetro** (`decidir`), como pide §Cambios ("la decisión de `core/` por parámetro").
8. **El lote compara los ids en minúsculas** antes del `SELECT … FOR NO KEY UPDATE`, igual que el esquema compara los repetidos.
9. **PR-B16g usa `printRoutes({ commonPrefix: false })`** (arriba).
10. **La primera lista de ADM-1E22 lleva `q`** (arriba).
11. **El tope crudo de 1000 del motivo** se queda, por indicación del orquestador; lo arbitra el manager.

#### Pendientes
- **N-32:** fuera de 01e (`duplicado-de-clase.ts` no está en "Se toca"); va al carril trivial al cierre, como indicó el orquestador.
- **O-R1-1 y N-18 de la ronda 1** son del tester. N-18 se respetó en todas las pruebas nuevas: ninguna clase queda con 0 o con 3 maestros. Una clase activa puede quedar con su único maestro inactivo (ADM-1E19, como tras restaurar, N-14), que es un estado que el plan admite.
- Documentos de cierre (A-01 a A-09) los aplica el orquestador; los README de `adapters/` y `handlers/` ya están al día (A-06), y el comentario de `MovimientoInscripcion` del esquema (A-09).

#### Desviaciones del plan
Ninguna de alcance. Declaradas para el manager: el orden de los `CREATE INDEX` de la migración generada (mismo SQL, otro orden), el `q` en la primera lista de ADM-1E22, `commonPrefix: false` en PR-B16g, `core/usuarios/fila.ts` y el tope crudo de 1000 del motivo.

## ADMIN-01e — Corrección de la verificación (2026-11-09)

Origen: `revision.md`, "## Verificación del resumen — ADMIN-01e" (línea 5698), **DEVUELTO** por M-14, más la decisión del humano sobre el arbitraje 1 (el tope del motivo): **"Quitarlo"** (opción (c) del manager), transmitida por el orquestador. Plan sin cambios: `7018e1f3…`. Entorno igual (sin otra suite ni otra copia, Docker encendido, red `uacam5 2` autorizada hoy, `BatteryStatus` 2); antes de cada corrida, ningún `vitest` corriendo. Sin commit.

### M-14 — corregido
- **Nuevo:** `backend/src/core/usuarios/fila.test.ts`, con tres casos de prefijo `ADM-1E01`:
  - "ADM-1E01: un estudiante trae las seis claves comunes y los cinco datos de pago y acceso, con las fechas en ISO" (`toEqual` exacto, fechas en ISO);
  - "ADM-1E01: un estudiante sin fechas ni motivo los trae en null, nunca sin la clave" (las once claves, con `null`);
  - "ADM-1E01: un maestro y el admin traen exactamente las seis claves comunes, aunque la cuenta tenga datos de pago o de acceso" (`Object.keys` igual a `activo`, `creadoEn`, `email`, `id`, `nombre`, `rol`, y `toEqual` exacto).
- `fila.ts` no cambia.

### Tope del motivo — quitado (decisión del humano)
- `shared/src/usuarios-admin.ts`: se borra `MAXIMO_CRUDO_MOTIVO = 1000` con su comentario, y `motivoRestriccionSchema` pasa de `.pipe(textoLargoSchema(MAXIMO_CRUDO_MOTIVO))` a `.pipe(textoLargoSchema(Number.POSITIVE_INFINITY))`. Ya no existe el mensaje "No puede tener más de 1000 caracteres" para el motivo: con un máximo infinito, `.max` nunca falla. Se conservan, con su texto de siempre ("El texto tiene caracteres no permitidos"), el rechazo de los caracteres de control (el carácter nulo nunca llega a PostgreSQL) y el de los inversores de dirección, que son las otras dos reglas de `textoLargoSchema`. La medida de S-10 sigue igual: hasta 300 visibles ("El motivo no puede tener más de 300 caracteres"), y sin visibles equivale a sin motivo. No hay texto nuevo.
- Por qué `textoLargoSchema(Number.POSITIVE_INFINITY)` y no copiar sus dos reglas: `textoLargoCon` y la regex de inversores son privados de `shared/src/clases.ts`, que en 01e solo se toca para S-16; reusar el esquema exportado evita duplicar las reglas y conserva sus textos. Comprobado en memoria: `textoLargoSchema(Number.POSITIVE_INFINITY)` acepta 5000 caracteres y rechaza `\u0000` y `\u202e` con "El texto tiene caracteres no permitidos".
- **Pruebas mías ajustadas** (ninguna `*.ataque`), en `backend/test/usuarios-admin-pago-acceso.integracion.test.ts`:
  - nuevo: "ADM-1E09: sin tope crudo: 300 visibles con mucho relleno (más de 1000 caracteres en total, también emojis de dos unidades) se aceptan y se guardan tal cual". Son 300 visibles separados por cinco espacios y un salto de línea (1795 caracteres): `200`, guardados tal cual. 300 emojis (600 unidades de UTF-16): `200`. Y 301 visibles con el mismo relleno: `400` "motivo: El motivo no puede tener más de 300 caracteres";
  - nuevo: "ADM-1E09: un motivo con el carácter nulo, otro carácter de control o un inversor de dirección → 400 VALIDACION (nunca 500) sin escribir". Con `\u0000`, `\u0007` y `\u202e`: `400` "motivo: El texto tiene caracteres no permitidos", y la fila sin restringir y sin motivo;
  - el caso anterior, "ADM-1E09: un motivo de 301 caracteres visibles → 400 sin escribir; 300 visibles con espacios de más pasan; uno de solo espacios queda sin motivo", no cambia: no dependía del tope.
- **Arreglo de forma en dos pruebas mías (sin cambio de comportamiento):** al escribirlas, la herramienta de edición convirtió el escape `\u202e` en el carácter invisible literal U+202E dentro de `"Ana\u202eRuiz"` (ADM-1E04, `usuarios-admin.integracion.test.ts:323`) y del nuevo `"Adeudo\u202emarzo"`. Los volví a escribir como el escape `\u202e` en el texto del archivo. Ninguno de los dos casos probaba otra cosa: la cadena en memoria es la misma. Lo encontré con un barrido de caracteres de control e inversores en todos los archivos de 01e (`shared/src/usuarios-admin.ts`, `src/core/usuarios/*`, `src/config/logger-sin-consulta.test.ts`, `test/usuarios-admin*.ts`, `test/logs-usuarios-admin…`, `test/ayudas-usuarios-admin.ts`); ya no queda ninguno. Lo mismo pasó con un comentario de `shared/src/usuarios-admin.ts` (un `\0` escrito como byte nulo literal), corregido a "el carácter nulo" antes de compilar.

### Hermanos del cambio del tope
Busqué en los archivos de 01e los textos o esquemas con un `.max` crudo junto a un límite de visibles o normalizado:
- **`listaUsuariosConsultaSchema.q`** (`shared/src/usuarios-admin.ts`): un tope crudo de 1000 puntos de código junto al de 120 normalizados. **No aplica:** es la regla de S-12 y del buscador que ya existía (`busquedaCandidatosSchema` y `estadoDeTerminoDeBusqueda` en `shared/src/clases.ts`, con `LONGITUD_MAXIMA_BUSQUEDA_CRUDA`). Responde con el mismo texto que el de 120, "La búsqueda no puede tener más de 120 caracteres", así que no agrega ningún texto nuevo. Además lo usa la misma tabla que reutiliza 01g. No lo cambié; si el manager quiere alinearlo, es una línea.
- **`editarNombreSchema` y `altaAlumnoSchema`** (`nombreSchema` y `correoSchema` de `auth.ts`): sus `.max(120)` y `.max(254)` son los límites de siempre de las cuentas, sin cambio en 01e. No aplica.
- **`estadoPagoLoteSchema.alumnoIds`:** el `.max(100)` cuenta ids, no texto. No aplica.
- **`cursorNombre`:** `z.string()` sin tope ni mensaje (Enmienda 5). No aplica.
- **Fuera de `shared/`:** `core/usuarios/` no valida longitudes; los handlers usan los esquemas. Ningún otro hermano.
- **Estados vecinos del mismo mecanismo (el motivo):** restringir por primera vez, restringir de nuevo con otro motivo, restablecer (que ignora el motivo) y el motivo de solo espacios pasan por el mismo esquema y no cambian salvo por el tope quitado. Los cubren los casos de ADM-1E09 de arriba y los dos nuevos.

### Mutaciones (en memoria; los archivos y `shared/dist` quedan restaurados después)
Guion: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\mutar2.py`.
- `fila.ts` sin la guarda `if (cuenta.rol !== "estudiante") return comun` (el maestro y el admin recibirían los datos de pago): `npx vitest run src/core/usuarios/fila.test.ts` → `Tests  1 failed | 2 passed (3)`.
- `fila.ts` con `fechaEstadoPago` sin ISO (`String(fecha)`): → `Tests  1 failed | 2 passed (3)`.
- El tope de 1000 de vuelta (`textoLargoSchema(1000)`, con el `build` de `shared`): `npx vitest run test/usuarios-admin-pago-acceso.integracion.test.ts -t ADM-1E09` → `Tests  1 failed | 5 passed | 5 skipped (11)`.
- Sin el `.pipe(textoLargoSchema(…))` (sin el rechazo de controles e inversores): mismo comando → `Tests  1 failed | 5 passed | 5 skipped (11)`.
- Después: `shared/src/usuarios-admin.ts` y `shared/dist/usuarios-admin.js` con `Number.POSITIVE_INFINITY` (`grep -c` 1 y 1), y `fila.ts` sin cambios.

### Verificación (comando exacto y última línea; una corrida después de otra)
- **build `shared`:** `cd shared; npm run build` → exit 0 (`> tsc -p tsconfig.json`). **lint `shared`:** `cd shared; npm run lint` → `All matched files use Prettier code style!`.
- **lint backend:** `cd backend; npm run lint` → exit 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test backend (módulos tocados):** `cd backend; npx vitest run src/core/usuarios test/usuarios-admin-pago-acceso.integracion.test.ts test/usuarios-admin.integracion.test.ts test/usuarios-admin-autorizacion.integracion.test.ts` → `Test Files  8 passed (8)` · `Tests  53 passed (53)`. Incluye `src/core/usuarios` con `fila.test.ts`, las integraciones del motivo (ADM-1E09 y ADM-1E14, que lo manda) y el archivo de ADM-1E04, cuyo escape arreglé.
- **lint frontend:** `cd frontend; npm run lint` → exit 0. **build frontend:** `cd frontend; npm run build` → `✓ built in 1.48s`. **test frontend** (la prueba que lee `shared/src`; ningún módulo del frontend consume todavía `usuarios-admin.ts`): `cd frontend; npx vitest run src/lib/errores-ch3-r2.ataque.test.ts` → `Tests  85 passed (85)`.

### Conteos
- `cd backend; npx vitest list src/core/usuarios test/usuarios-admin-pago-acceso.integracion.test.ts`: 20 líneas con "ADM-1E01" (antes 17; suma las 3 de `fila.test.ts`, contadas con `grep -ac "fila.test.ts"`) y 6 con "ADM-1E09" (antes 4).
- El mismo `npx vitest list` de los doce archivos de pruebas de 01e de la entrega anterior: **82** casos con "ADM-1E" (`grep -ac`; antes 77: +3 de M-14 y +2 de ADM-1E09).

### Archivos de esta corrección
- Nuevo: `backend/src/core/usuarios/fila.test.ts` (SHA-256 `78752dcb43e51c407840edcd51efac0d3d83b91d836ee938409cc652b34eb404`).
- Modificados: `shared/src/usuarios-admin.ts` (`f5b08d47771ac2b6eda88fc59ec25e236fff7b09fe326253b3931ec058180966`), `backend/test/usuarios-admin-pago-acceso.integracion.test.ts` (`b2ebe59f38d79639babf6d3e97c1449f90f7d696007b7cda16b1a88b0248194a`) y `backend/test/usuarios-admin.integracion.test.ts` (`db8512816ca43d25ac717e12499c34180f668502cb21e899b3ab1faf9e9f8fd6`; solo el escape `\u202e` de `:323`).
- Ninguna `*.ataque` ni prueba normal fuera de 01e; código de producción, solo `shared/src/usuarios-admin.ts`.

### Hallazgos atendidos
- **M-14:** corregido.
- **Arbitraje 1 (tope del motivo):** aplicada la decisión del humano, "Quitarlo".

### Desviaciones
Ninguna. Uso `textoLargoSchema(Number.POSITIVE_INFINITY)` para conservar el rechazo de controles e inversores con su texto de siempre, sin tope crudo (arriba). El hermano `q` de la lista de usuarios queda como está y declarado.

## ADMIN-01e — Corrección ronda 1 (2026-11-09)

Origen: `reporte-tester.md`, "## Ronda 1 — ADMIN-01e" (línea 5054), **ROTO** por T-01. Ronda de corrección 1 de 3. Plan sin cambios: `7018e1f3…`. Entorno: sin otra suite ni otra copia (antes de cada corrida, ningún `vitest` corriendo), Docker encendido, red `uacam5 2` autorizada hoy. **Energía: `BatteryStatus` 1 (a batería) en esta corrección; se corre igual, por la instrucción del humano del 2026-11-06.** Sin commit. No toqué las pruebas del tester (`usuarios-admin-01e-r1.ataque.test.ts` y `logs-usuarios-01e-r1.ataque.test.ts`).

### T-01 — corregido
- **Remedio, en `shared/src/usuarios-admin.ts`:** el `superRefine` de `q` en `listaUsuariosConsultaSchema` rechaza ahora un término que contiene el carácter nulo, con `400 VALIDACION` "q: Los datos enviados tienen caracteres no permitidos.". El nulo nunca llega a PostgreSQL. El carácter se construye con `String.fromCharCode(0)` (constante `CARACTER_NULO`), así que no aparece literal en el archivo. Si el término también pasa del máximo, se responde primero el de longitud (un solo mensaje).
- **Mismo criterio y mismo texto que el buscador de candidatos, y una precisión:** el buscador de candidatos **no** rechaza el nulo en su esquema. Lo deja llegar a PostgreSQL y traduce el `22021` a `400 VALIDACION` "Los datos enviados tienen caracteres no permitidos." con `traducirErrorPrisma`, dentro de `buscarMaestrosCandidatos` (`adapters/db/maestros-de-clase.ts:126-129`; el texto sale de `adapters/db/errores.ts:44-47`). Para cumplir "en el esquema" y "el nulo nunca debe llegar a PostgreSQL" sin inventar texto:
  - **criterio:** el mismo carácter que PostgreSQL rechaza (el nulo; los demás controles los acepta, y el buscador de candidatos también);
  - **texto:** literalmente el mismo, "Los datos enviados tienen caracteres no permitidos.";
  - **diferencia:** como sale de `validarParametros`, lleva delante la ruta del campo ("q: …"), igual que cualquier `VALIDACION` de un esquema; el del buscador de candidatos sale sin ruta. En el frontend, `quitarRutaDelMensaje` deja el mismo texto.
  - No hay texto nuevo, así que no hay PARADA. Lo declaro por si el manager prefiere también la traducción en el adaptador, como en candidatos. No la agregué porque, con el esquema, ya no hay forma de que el nulo llegue a la consulta.
- **Caso propio, en `backend/test/usuarios-admin.integracion.test.ts`:** "ADM-1E02: q con el carácter nulo, en cada forma en que llega (sola, con rol, con rol y estadoPago, y en la página 2 con cursor y cursorNombre) → 400 VALIDACION «q: Los datos enviados tienen caracteres no permitidos.», nunca 500". Prueba siete consultas: nulo al final, al principio y en medio; con `rol`; con `rol` y `estadoPago`; en la página 2 con `cursor` y `cursorNombre` válidos; y `q` hecho solo de nulos (que, sin la regla, caería en `BUSQUEDA_MUY_CORTA` o en la base). El nulo se construye con `String.fromCharCode(0)`.
- **Mutación** (en memoria, con el archivo y `shared/dist` restaurados después; guion `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\mutar3.py`): con la condición anulada (`texto.includes(CARACTER_NULO) && false`), `npx vitest run test/usuarios-admin.integracion.test.ts test/usuarios-admin-01e-r1.ataque.test.ts -t "ADM-1E02: q con el|ADM-T1E01"` → `Tests  2 failed | 36 skipped (38)` (mi caso y ADM-T1E01). Restaurado: `grep -c "&& false" shared/dist/usuarios-admin.js` → 0.

### Hermanos: cada campo de 01e que llega a SQL como texto
| Campo | Cómo llega a la base | ¿El nulo llega a PostgreSQL? | ¿Aplica el remedio? |
|---|---|---|---|
| `q` (`GET /admin/usuarios`) | `$queryRaw` con `LIKE` sobre `nombre_busqueda` y `email` | Antes sí (T-01) | **Sí, aplicado** |
| `cursorNombre` | No va a SQL: se compara en JS con el `nombre` de la fila del cursor (`gestion-de-usuarios.ts`, `fila.nombre !== cursorNombre`) | No | No aplica: un nulo da `400` "cursor: no es válido" (lo confirmó el tester en el punto 4) |
| `cursor` (usuarios y movimientos) | `${cursor}::uuid` / `findUnique` por PK | No: el esquema exige `z.uuid()` | No aplica |
| `rol`, `estadoPago` (consulta y lote) | `::rol_usuario`, `::estado_pago` / Prisma | No: `z.enum` | No aplica |
| `nombre` (`PUT …/nombre`, `POST /admin/alumnos`) | Prisma `update`/`create` | No: `nombreSchema` rechaza `\p{Cc}` ("El nombre tiene caracteres no permitidos") | No aplica: ya rechazado; lo prueba ADM-1E04 con `"Ana\u0000Ruiz"` |
| `email` (`POST /admin/alumnos`) | Prisma `create` | No: `correoSchema` (`z.email`) no admite el nulo | No aplica; además, cualquier `22021` de ese `create` lo traduce `traducirErrorPrisma` a `400` en `crearAlumnoConTemporal` |
| `motivo` (`PUT …/acceso`) | Prisma `update` | No: `textoLargoSchema` rechaza los controles | No aplica: ya rechazado; lo prueba ADM-1E09 ("un motivo con el carácter nulo…") |
| `alumnoIds` | `id = ANY(${ids}::uuid[])` | No: `z.uuid()` | No aplica |
| `id` de la ruta | `::uuid` / PK | No: `z.uuid()` | No aplica |

**Estados vecinos: cada forma en que llega `q`.** Todas pasan por el mismo esquema antes de `core/` y del adaptador, así que el remedio aplica a cada una. Las siete van en mi caso:
- `q` solo: aplica.
- `q` con `rol`: aplica.
- `q` con `rol` y `estadoPago` (la tabla de 01g): aplica.
- `q` en la página 2, con `cursor` y `cursorNombre`: aplica. El esquema rechaza antes de leer la fila del cursor.
- `q` que, sin la regla, sería corto (solo nulos): aplica. El esquema corre antes que `prepararBusquedaDeUsuarios`.
- `q` demasiado largo y con nulo: aplica, con el mensaje de longitud, porque va primero (uno solo).
- `q` repetido (`q=a&q=b`): ya era `400` por tipo, sin cambio.
- Fuera de 01e, el buscador de candidatos de maestros y el de alumnos (`/clases/:claseId/alumnos/candidatos`) siguen como estaban: los dos traducen el `22021` en su adaptador (no son de 01e y no se tocan).

### Barrido de escapes
Revisé 25 archivos de 01e (sin `*.ataque`): `shared/src/usuarios-admin.ts`, `shared/src/clases.ts`, `src/core/usuarios/*`, `src/adapters/db/gestion-de-usuarios.ts`, `movimientos.ts`, `src/handlers/admin/*`, `src/config/logger.ts`, `logger-sin-consulta.test.ts`, `test/usuarios-admin*.ts`, `test/logs-usuarios-admin*.ts` y `test/ayudas-usuarios-admin.ts`. Busqué caracteres de las categorías Cc, Cf, Zl y Zp, salvo `\n` y `\t`: 0 archivos con alguno.

### Verificación (comando exacto y última línea; una corrida después de otra, `BatteryStatus` 1)
- **build `shared`:** `cd shared; npm run build` → exit 0 (`> tsc -p tsconfig.json`). **lint `shared`:** `cd shared; npm run lint` → `All matched files use Prettier code style!`.
- **lint backend:** `cd backend; npm run lint` → exit 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test backend:** `cd backend; npx vitest run $(cat modulos-01e.txt) src/core/usuarios test/usuarios-admin-01e-r1.ataque.test.ts test/logs-usuarios-01e-r1.ataque.test.ts`, con la misma lista de 70 rutas (`C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\modulos-01e.txt`) más los dos archivos del tester → `Test Files  76 passed (76)` · `Tests  1051 passed (1051)` (inicio 11:41:00, 119 s). ADM-T1E01 en verde. Contención: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0, `"code":"P2028"` 5: los mismos deterministas de antes, `servicio-ocupado` (`req-1`, `req-3`, `req-5`) y `cuentas-r3.ataque` (`req-1m`, `req-20`).
- **test frontend** (cambió `shared/src`): `cd frontend; npx vitest run src/lib/errores-ch3-r2.ataque.test.ts` → `Tests  85 passed (85)`. El texto nuevo del esquema no empieza con "palabra:", así que la regla de prefijos de `shared/src` no cambia. **build frontend:** `cd frontend; npm run build` → `✓ built in 2.58s`.

### Conteos
`cd backend; npx vitest list` de los doce archivos de pruebas de 01e (`src/core/usuarios`, `src/config/logger-sin-consulta.test.ts` y los siete de `test/`) → **83** casos con "ADM-1E" (`grep -ac`; antes 82, suma uno). ADM-1E02 pasa de 7 a **8** (`grep -ac "ADM-1E02:"`).

### Archivos de esta corrección
- `shared/src/usuarios-admin.ts` (SHA-256 `2b12cc149ab1567335abd077769d7801313be33199a25a596a8aea700d88df75`): la constante `CARACTER_NULO` y la regla del nulo en el `superRefine` de `q`, con un `return` después del mensaje de longitud para que salga uno solo.
- `backend/test/usuarios-admin.integracion.test.ts` (`30f4f20d80eb593994aac71513bd9795bf81b06ea8bc3d333fbbc5d48897ee0a`): el caso nuevo de ADM-1E02.
- Nada más: ni adaptadores ni handlers, ni pruebas del tester.

### Hallazgos atendidos
- **T-01:** corregido.

### Desviaciones
Ninguna de alcance. Declarado arriba: el buscador de candidatos rechaza el nulo en su adaptador y no en su esquema. Aquí va en el esquema, como pidió el orquestador, con el mismo criterio y el mismo texto; la única diferencia es el prefijo "q:" que agrega `validarParametros`.

## ADMIN-01f — Implementación (2026-11-09)

Estado: **terminado con tres puntos para arbitraje** (no hay PARADA general; ver "PARADA parcial y rojos que no son míos"). Plan `plan.md` = `7f344f7ab9bab55bd77932e6c7986c1b9b0200ac617a6696799e868d6f7aaa5c` (comprobado al empezar). Base de "No se toca" dentro de los paquetes: `10356bd`. Entorno: sin otra copia ni suite (dato del orquestador); una corrida después de otra; sin navegadores; ningún commit (dos `git rm` hechos por error se deshicieron con `git reset -- <ruta>`: el índice quedó como estaba y los dos archivos quedan borrados solo en el árbol de trabajo, como autoriza el plan). Escapes: el carácter nulo siempre como `String.fromCharCode(0)`; ningún carácter invisible literal.

Pasos de 01f: 26, 27, 28 y 28b, completos salvo ADM-1F09b (e) (PARADA parcial, abajo).

### Archivos tocados contra "Se toca" (§D-R0 01f, con la Enmienda 14)
Producción (32, todos en "Se toca"; ninguno fuera; `backend/`, `shared/` e `infra/` sin cambios):
- `components/foco/hooks.ts` (`useFocoAlCargarMas`, movido sin cambios), `components/foco/lib.ts` (`focoPerdido`, movida sin cambios).
- `features/clases/hooks.ts` y `lib.ts` (solo las dos reexportaciones), `types.ts` (`MaestroDeLista.cuentaDesactivada`, `PersonaDeLaLista`), `data.ts` (solo `TEXTO_CUENTA_DESACTIVADA`), `components/lista-personas.tsx`, `lista-maestros-de-clase.tsx`, `tabla-clases-admin.tsx` (insignia).
- `components/layout/data.ts` (destinos de 01f), `app/router.tsx`.
- `features/admin/`: nuevos `inicio-admin-view.tsx`, `usuarios-view.tsx`, `usuario-view.tsx`, `components/tabla-de-usuarios.tsx`, `formulario-nombre-de-cuenta.tsx`, `formulario-alta-alumno.tsx`, `acciones-de-cuenta.tsx`, `dialogo-dar-de-baja.tsx`, `dialogo-restringir-acceso.tsx`, `estado-de-pago-de-cuenta.tsx`; cambiados `components/ficha-de-cuenta.tsx` (E-01, E-24: la región la pone la vista; sale el bloque de datos, que ahora pinta la ficha), `contrasena-temporal.tsx` (E-27), `formulario-corregir-correo.tsx` (fila 7: ref), `formulario-invitar-maestro.tsx` (outline, `textoParaTerceros`), `maestros-view.tsx`, `hooks.ts`, `data.ts`, `lib.ts`, `types.ts`; borrados `cuentas-view.tsx` y `components/buscador-de-cuenta.tsx` (autorizado).

Pruebas normales: lista cerrada `features/admin/cuentas-view.test.tsx` (reescrito: dashboard y tabla), `formularios-ch3.test.tsx` (`:14`, `:215-221`, `:336`, `:349`, `:381`, `:537-545`, `:586-588`; **y `:647`, fuera de la lista: desviación D-1**), `errores-ch3.test.ts` (`:78`, `:97-102`), `lib/errores-de-api-estatico.test.ts` (CH3-C13), `components/layout/contenedor-rol.test.tsx` (`:107-123`, `:185-242`), `features/clases/clases-admin-01c-rutas.test.tsx` (`:269`, `:390`). Nuevas: `features/admin/ficha-01f.test.tsx`, `usuarios-01f.test.tsx`, `lib-01f.test.ts`, el bloque ADM-1F20 al final de `errores-ch3.test.ts`, `features/clases/cuenta-desactivada-01f.test.tsx`, `features/clases/reexportaciones-01f.test.ts`. Ningún `*.ataque` tocado (`git diff --stat` de los 20 C-n igual que al terminar la ronda 0).

### Verificación (comando exacto y última línea)
- lint: `cd frontend; npm run lint` → exit 0; última línea `> tsc -b` (antes, `All matched files use Prettier code style!`).
- build: `cd frontend; npm run build` → exit 0; última línea `✓ built in 1.59s`.
- Módulos: `npx vitest run src/features/admin src/features/clases src/components/foco src/components/layout` → `Tests  1 failed | 3429 passed (3430)` (`Test Files  1 failed | 144 passed (145)`; el rojo: `cuentas-r3`, abajo, R-2).
- C-n fuera de los módulos y vigiladas: `npx vitest run` con `src/app/contexto-r1.ataque.test.tsx src/app/cuentas-r1.ataque.test.tsx src/app/errores-r1.ataque.test.tsx src/app/marco-r1.ataque.test.tsx src/app/registro-maestro-03b-r1.ataque.test.tsx src/app/rutas-02c-r1.ataque.test.tsx src/features/auth/rutas-ch3-r1.ataque.test.tsx src/lib/estatico-ch3-r1.ataque.test.ts src/lib/estatico-ch3-r2.ataque.test.ts src/services/apiClient-ch3-r1.ataque.test.ts src/styles/clases-r1.ataque.test.ts src/lib/errores-de-api-estatico.test.ts src/app/barra-02d-r1.ataque.test.tsx src/features/auth/secuencias-ch3-r2.ataque.test.tsx src/features/auth/errores-ch3-r1.ataque.test.tsx src/app/router.test.tsx src/app/marco.test.tsx src/app/en-espera-r1.ataque.test.tsx src/app/fondo-r1.ataque.test.tsx src/app/router.ataque.test.tsx src/features/calificaciones/estatico-01d.test.ts src/features/calificaciones/estatico-01d-r1.ataque.test.ts src/services/apiClient-ch3.test.ts src/features/tareas/como-se-entrega-01a.test.tsx src/features/tareas/entregas-01d-r1.ataque.test.tsx src/features/auth/establecer-contrasena-view.test.tsx src/app/fondo-de-la-app.test.tsx src/lib/errores-ch3-r2.ataque.test.ts src/lib/errores-ch3-r1.ataque.test.ts src/lib/unir-paginas.test.ts src/styles` → `Tests  6 failed | 1147 passed (1153)` (`Test Files  1 failed | 31 passed (32)`; los 6: `app/rutas-02c-r1`, abajo, R-1).
- build de `shared/` y `prisma validate`: n/a (01f no toca `shared/` ni el esquema).

### Conteos de los archivos nuevos o reescritos (`npx vitest list <archivo> | grep -ac ' > '`)
`ficha-01f.test.tsx` 57 · `usuarios-01f.test.tsx` 33 · `lib-01f.test.ts` 19 · `cuentas-view.test.tsx` 8 · `errores-ch3.test.ts` 31 (29 de antes + 2 de ADM-1F20) · `features/clases/cuenta-desactivada-01f.test.tsx` 7 · `features/clases/reexportaciones-01f.test.ts` 2. Suma: 157 casos en esos siete archivos (los siete están dentro de los módulos, así que la corrida de 3430 ya los incluye).

### Pruebas requeridas (01f) → archivo y título exacto
Archivos: `F` = `frontend/src/features/admin/ficha-01f.test.tsx`; `U` = `frontend/src/features/admin/usuarios-01f.test.tsx`; `CV` = `frontend/src/features/admin/cuentas-view.test.tsx`; `L` = `frontend/src/features/admin/lib-01f.test.ts`; `E` = `frontend/src/features/admin/errores-ch3.test.ts`; `CD` = `frontend/src/features/clases/cuenta-desactivada-01f.test.tsx`; `R` = `frontend/src/features/clases/reexportaciones-01f.test.ts`; `CR` = `frontend/src/components/layout/contenedor-rol.test.tsx`. Un título con `%s` o `%j` es un `it.each`; se dice cuántas filas tiene.
- **ADM-1F01** (b) → `CV` "ADM-1F01 (b): con el resumen en error, pulsar «Inicio» estando en /admin lo vuelve a pedir y el texto desaparece" (también comprueba que no hay «Reintentar»); (c) → `CV` "ADM-1F01 (c): con el resumen en error, ir a «Usuarios» y regresar antes del staleTime lo vuelve a pedir y el texto desaparece". Control: `CV` "un resumen sano no se vuelve a pedir al pulsar «Inicio» ni al regresar antes del staleTime".
- **ADM-1F02** → `U` "ADM-1F02 y ADM-1F21 (b): espera 300 ms; con «», «   », «a» o «ab» no pide nada con q, la ayuda sigue visible, y volver a vaciar el campo no pide otra vez la lista"; `U` "ADM-1F21 (a, f): la primera carga no lleva q ni rol; «Maestro» manda rol=maestro y nunca estadoPago; «Todos», ni rol ni estadoPago" (filtro); `U` "ADM-1F18 (a, b, d): la primera página sale sin cursor; la siguiente lleva q, rol, cursor y cursorNombre codificado, con una sola petición por dos clics; al cargar la última, el foco va a la primera fila nueva" (isFetching, cancelRefetch: false, ref y foco); vacíos: `U` "ADM-1F02: con una búsqueda sin resultados, el vacío de búsqueda" y `CV` "vacío sin búsqueda: «No hay cuentas con ese rol», también con «Todos» (OA-01f-1)".
- **ADM-1F03** → `U` "ADM-1F03 y ADM-1F18 (c), camino (a): pulsar «Usuarios» estando en la tabla pide la primera página sin cursor y el texto desaparece"; `U` "ADM-1F03, camino (b): ir a «Maestros» y regresar antes del staleTime pide la primera página y el texto desaparece"; `U` "ADM-1F03, camino del historial: atrás y adelante y atrás otra vez dejan la tabla sin el texto".
- **ADM-1F04** → `F` "ADM-1F04: la ficha es una región con el nombre de la cuenta; el h1 es «Usuarios»; acciones según el rol".
- **ADM-1F05** (a) a (c) → `F` "ADM-1F05 %s: un solo mensaje legible, lo escrito se conserva y el botón sale de la espera" (4 filas: (a) email:, (b) vacío, (b) solo espacios, (c) nombre.0:); (d) → `F` "ADM-1F05 (d): un rechazo del servidor y después el nombre vacío dejan un solo mensaje, el ErrorDeCampo nuevo"; dos clics → `F` "ADM-1F05: dos clics en «Guardar nombre», una petición; con éxito, la ficha muestra el nombre nuevo y avisa".
- **ADM-1F06** (a) a (c) → `U` "ADM-1F06 %s: un solo mensaje legible, lo escrito se conserva y el botón sale de la espera" (4 filas: (a) rol:, (b) vacío, (b) espacios, (c) nombre.0:); (d) → `U` "ADM-1F06 (d) y ADM-1F22: un rechazo del servidor y después el nombre vacío dejan un solo mensaje, «Escribe el nombre completo»"; 409 → `U` "ADM-1F06: 409 CORREO_EN_USO va en un ErrorDeCampo de «Correo», sin MensajeError; lo escrito se conserva"; temporal → `U` "ADM-1F06: con éxito, una petición por dos clics; la temporal se muestra una vez, no queda en la caché y su role=status no envuelve «Copiar»".
- **ADM-1F07** → `F` "ADM-1F07: el diálogo enfoca «Cancelar» y lleva el contexto opaco y denso; confirmar hace una petición y deja «Reactivar» con el foco"; `F` "ADM-1F07: un 409 MAESTRO_CON_CLASES da un solo mensaje en el diálogo, que sigue abierto, y el botón sale de la espera"; `F` "ADM-1F07: «Cancelar» cierra sin petición y devuelve el foco a «Dar de baja»"; `F` "ADM-1F07: «Reactivar» no abre diálogo; dos clics, una petición".
- **ADM-1F07b** (a) a (d), con el mensaje real en inglés → `F` "ADM-1F07b, diálogo de baja %s: un solo mensaje, sin inglés, el diálogo sigue abierto y el botón sale de la espera" (6 filas); `F` "ADM-1F07b, «Reactivar» %s: un solo mensaje, sin inglés, y el botón sale de la espera" (4 filas); `F` "ADM-1F07b, «Restablecer acceso» %s: un solo mensaje, sin inglés, y el botón sale de la espera" (4 filas, con restringido: real); (e) → `F` "ADM-1F07b (e): un 400 y después cerrar y reabrir el diálogo: al reabrir no queda el mensaje viejo".
- **ADM-1F08** (a) a (c), con restringido: real en inglés → `F` "ADM-1F08 %s: un solo mensaje, sin inglés, el diálogo sigue abierto con el motivo escrito y el botón sale de la espera" (5 filas); (d) → `F` "ADM-1F08 (d): un rechazo del servidor y después un motivo de más de 300 dejan un solo mensaje, el ErrorDeCampo"; restablecer sin diálogo → `F` "ADM-1F08: «Restablecer acceso» va sin diálogo y con una sola petición"; diálogo → `F` "ADM-1F08: el diálogo enfoca «Cancelar», lleva el contexto opaco y denso, y manda el motivo; dos clics, una petición".
- **ADM-1F09** → `F` "ADM-1F09: elegir «Deudor» y «Guardar» con doble clic hace una petición con un solo id y avisa".
- **ADM-1F09b** (a), (b), (c), (d) y (f) → `F` "ADM-1F09b %s: un solo mensaje, sin inglés, la opción elegida se conserva y «Guardar» sale de la espera" (6 filas). **(e): no cubierta. PARADA parcial P-01f-1, abajo.**
- **ADM-1F10** → `F` "ADM-1F10: el error de «Sí, restablecer» no reaparece al reabrir la confirmación"; `F` "ADM-1F10: con un error de restablecer a la vista, corregir el correo con error deja un solo mensaje"; `F` "ADM-1F10: ir a otra cuenta con el restablecimiento en vuelo descarta la temporal y no la muestra en la otra ficha"; `F` "ADM-1F10: un fallo de red al restablecer da el texto de red del módulo (el genérico)".
- **ADM-1F11** → `R` "ADM-1F11: useFocoAlCargarMas de features/clases/hooks es la misma función que la de components/foco" y `R` "ADM-1F11: focoPerdido de features/clases/lib es la misma función que la de components/foco/lib". Las pruebas de `features/clases` no cambian (verdes en la corrida de módulos).
- **ADM-1F12** → `F` "ADM-1F12: dos envíos de «Guardar correo» hacen una sola corrección".
- **ADM-1F13** → `F` "ADM-1F13: «Restablecer contraseña» en alumno y maestro; restablecer dos veces muestra la segunda temporal y la primera ya no está ni en la pantalla ni en la caché; en la ficha del admin no está" (el admin, en ADM-1F04).
- **ADM-1F14** → `CR` "con rol admin, hay cuatro enlaces: 'Inicio' hacia /admin, 'Usuarios' hacia /admin/usuarios, 'Maestros' hacia /admin/maestros y 'Clases' hacia /admin/clases"; `CR` "en %s solo queda activo %j" (con las filas /admin, /admin/usuarios y /admin/usuarios/:id); `CR` "todo destino de DESTINOS_POR_ROL declara su coincidencia, y solo «Usuarios» y «Clases» son de prefijo".
- **ADM-1F15** → `F` "ADM-1F15: vive en /admin/maestros con su botón en outline; la vista sigue con un solo primary, «Enviar invitaciones»; dos clics, una invitación". Los casos de CHORE-03 del formulario siguen en `formularios-ch3.test.tsx` y `errores-ch3-r1`, que lo montan solo (verdes).
- **ADM-1F16** → `CD` "ADM-1F16: con dos maestros, solo el dado de baja lleva la insignia" (Personas); `CD` "la insignia sale junto al maestro con la marca y no junto al activo" y "con todos activos, ninguna insignia" (lista de maestros); `CD` "la insignia sale junto al maestro dado de baja; los nombres siguen en su lista" y "con un maestro activo, no sale" (/admin/clases).
- **ADM-1F17** (a) → `U` "ADM-1F17 (a): pulsar «Usuarios» estando en la tabla vuelve a pedir y quita el error"; (b) → `U` "ADM-1F17 (b): ir a «Inicio» y regresar antes del staleTime vuelve a pedir y quita el error"; (c) → `F` "ADM-1F26 (control) y ADM-1F17 (c): un 5xx da el texto de carga; volver a la tabla y abrir otra vez la misma cuenta la vuelve a pedir y el texto desaparece"; (d) → `U` "ADM-1F17 (d): cambiar el rol y volver al de antes, con la clave de antes en error en su primera carga, la vuelve a pedir y el texto desaparece" y `U` "ADM-1F17 (d): lo mismo con la clave de antes en error en una recarga con datos (la página siguiente que falla)"; (e) → `U` "ADM-1F17 (e): ir a otra sección y volver con «atrás», «adelante» y «atrás» otra vez deja la tabla sin el error, con el término y el rol de nuevo vacíos". Con 5xx: (a), (b), (c), (d primera carga) y (e); con el 400 fuera de contrato: (d recarga) y ADM-1F21 (e).
- **ADM-1F18** (a, b, d) → `U` "ADM-1F18 (a, b, d): …" (arriba) y `L` "ADM-1F18 (a, b): la búsqueda y el rol van primero; la página siguiente suma cursor y cursorNombre, codificados" (espacios, +, &, %, ñ y acentos); (c) → los tres casos de ADM-1F03 (la causa es el 400 "cursor: no es válido").
- **ADM-1F19** → `U` "ADM-1F19: una cuenta repetida en la segunda página se pinta una vez, sin aviso de claves de React, y la tercera página lleva el cursor de la segunda respuesta".
- **ADM-1F20** → `E` "ADM-1F20: el mensaje real en inglés y uno de prueba de activo, restringido y estadoPago dan exactamente el genérico en las acciones y en las consultas" y `E` "ADM-1F20 (controles que no cambian): alumnoIds.0 y motivo dan su resto; la tabla común sigue igual".
- **ADM-1F21** (a, f) → `U` "ADM-1F21 (a, f): …" (arriba); (b) → `U` "ADM-1F02 y ADM-1F21 (b): …" y `L` "ADM-1F21 (b): «%j» es corto: no manda q ni muestra el vacío ni el tope" (6 filas, con uno y dos nulos solos); (c) → `U` "ADM-1F21 (c): 121 normalizados y 1001 en crudo no se mandan y marcan el campo con su tope; 120 normalizados sí" y `L` "ADM-1F21 (c): 121 normalizados y 1001 en crudo son largos; 120 normalizados se mandan"; (d) → `U` "ADM-1F21 (d): un término con el carácter nulo no pide nada y muestra el vacío de búsqueda, sin alerta" (4 filas: al final, al principio, en medio y tres seguidos) y `L` "ADM-1F21 (d): un término válido con el carácter nulo no manda q y muestra el vacío sin pedir" (4 filas); (e) → `U` "ADM-1F21 (e) con %s: un solo MensajeError con el texto fijo, sin aviso ni texto del servidor; lo escrito y el filtro se conservan; editar la búsqueda vuelve a pedir y, con 200, el texto desaparece" (6 filas: 5xx, q con el nulo, q largo, BUSQUEDA_MUY_CORTA, rol en inglés, limite); sus caminos, los de ADM-1F17 (a), (b), (d) y (e).
- **ADM-1F22** → `L` "ADM-1F22: el texto exacto de nombreSchema da «Escribe el nombre completo»; con un espacio de más, otro texto o el vacío vuelven tal cual" y `L` "ADM-1F22 (amarre): editarNombreSchema y altaAlumnoSchema con el nombre vacío dan TEXTO_DEL_NOMBRE_PROPIO en nombre"; alta → `U` "ADM-1F22: el 400 «nombre: Escribe tu nombre completo» da un solo MensajeError con «Escribe el nombre completo»" y `U` "ADM-1F06 (d) y ADM-1F22: …"; Editar nombre → `F` "ADM-1F22: el nombre de solo espacios no se envía y dice «Escribe el nombre completo»; el 400 «nombre: Escribe tu nombre completo» da un solo MensajeError con «Escribe el nombre completo»; «caracteres no permitidos» da su resto"; Invitar maestro → `F` "ADM-1F22: el nombre vacío dice «Escribe el nombre completo»; el 400 «nombre: Escribe tu nombre completo» da un solo MensajeError con «Escribe el nombre completo»" (y C-44 de `cuentas-r1`, verde).
- **ADM-1F23** → `CD` "ADM-1F23: con maestros[0] marcado y `maestro` sin la marca, la insignia sale junto a ese maestro" y `CD` "ADM-1F23: con `maestro` marcado y `maestros` sin la marca, no sale" (Personas del alumno, con su doble de GET /clases/:claseId/personas). **Cobertura parcial** en la lista de maestros (maestro y admin) y en /admin/clases: los casos de ADM-1F16 montan el componente con sus props, no la vista con su doble de GET /clases/:claseId; ver "Pendiente".
- **ADM-1F24** → `CV` "ADM-1F24: los accesos son los destinos del admin salvo «Inicio», en su orden, con su ruta existente y fuera de toda navegación; con el resumen en 500 siguen y solo el panel de las cifras se reemplaza".
- **ADM-1F25** → `F` "ADM-1F25: el nombre con el carácter nulo no se envía y muestra el texto de shared/; si el servidor responde su 400, un solo mensaje"; `F` "ADM-1F25: el motivo con el carácter nulo no se envía y muestra el texto de shared/; si el servidor responde su 400, un solo mensaje"; `U` "ADM-1F25: el nombre o el correo con el carácter nulo no se envían y muestran el texto de shared/; si el servidor responde su 400, un solo mensaje".
- **ADM-1F26** → `F` "ADM-1F26: /admin/usuarios/abc con el 400 VALIDACION dice «Esa cuenta ya no existe.» con «Volver a Usuarios», sin aviso ni texto del servidor, y el enlace lleva a la tabla"; `F` "ADM-1F26: el 404 USUARIO_NO_ENCONTRADO da lo mismo"; control 5xx, `F` "ADM-1F26 (control) y ADM-1F17 (c): …".

### Estado de cada C-n (rojo de la ronda 0 → ahora)
- C-13 (`features/admin/cuentas-r1`, `cuentas-r2`, `cuentas-r3`, `cuentas-r4`, `en-espera-r1`, `foco-r1`): rojo → verde, salvo **un caso de `cuentas-r3`** (R-2, abajo).
- C-13b (`cuentas-r1`, los dos diálogos): rojo → verde.
- C-14 (`errores-ch3-r1`, `secuencias-ch3-r2`): verde → verde.
- C-15 (`rutas-ch3-r1`, con el bloque nuevo de la tabla): rojo → verde (necesitó que la tabla no reintente un 4xx: D-2).
- C-16: `app/contexto-r1`, `app/cuentas-r1`, `app/marco-r1`, `app/errores-r1` y `app/registro-maestro-03b-r1`, rojo → verde; `app/rutas-02c-r1`: los casos de C-16 (`:219` y `:238`) pasan, pero **seis casos de `:168-178`, fuera de C-16, pasan a rojo** (R-1, abajo).
- C-17 y C-17b (`styles/clases-r1`, V-06 85 y V-07): rojo → verde.
- C-35 (`lib/estatico-ch3-r2`): rojo → verde; `:135-150`, verde.
- C-36 y C-43 (`lib/estatico-ch3-r1`): verde → verde.
- C-37 (`services/apiClient-ch3-r1`): rojo → verde.
- C-44 (`cuentas-r1`, invitar con el nombre de espacios): rojo → verde.
- C-45 (`features/auth/rutas-ch3-r1`): verde → verde (ahora usa la rama del resumen).

### Vigiladas (si cambian, PARADA): todas sin cambios y en verde
`app/barra-02d-r1`, `features/auth/secuencias-ch3-r2`, `features/auth/errores-ch3-r1`, `app/router.test`, `app/marco.test`, `app/en-espera-r1`, `app/fondo-r1`, `app/router.ataque`, `features/admin/maestros-view.test`, `maestros-03c-r1`, `maestros-03b-r1`, `lib/estatico-ch3-r1` (`:96-200`), `features/clases/personas-view.test`, `app/foco-pestana-02d-r3`, `features/calificaciones/estatico-01d` y `estatico-01d-r1`, `services/apiClient-ch3`, `features/clases/estatico-02c-r1`, `refactor-01c-r1`, `ver-mas-01e-r3`, `inicio-sin-datos-02c-r1`, `inicio-sin-datos-r2`, `clase-archivada-01d2-vista`, `clases-admin-01c-rutas` (`:270`, `:286`, `:391`), `features/tareas/como-se-entrega-01a`, `entregas-01d-r1`, `features/auth/establecer-contrasena-view.test`, `app/fondo-de-la-app.test`, `lib/errores-ch3-r2`, `lib/errores-ch3-r1`, `lib/unir-paginas.test`, `features/clases/lib.test`. Ninguna la toqué; todas dentro de las dos corridas de arriba.

(`app/foco-pestana-02d-r3.ataque.test.tsx`, aparte: `npx vitest run src/app/foco-pestana-02d-r3.ataque.test.tsx` → `Tests  7 passed (7)`.)

### PARADA parcial y rojos que no son míos (para el manager)
- **P-01f-1 (PARADA parcial, ADM-1F09b e).** El caso pide "un rechazo del servidor y después un envío que la validación local rechaza (sin opción elegida)". Para que exista un envío "sin opción elegida", el control tendría que empezar sin opción y rechazar «Guardar» con un texto. Ese texto no está en §D-12, en T-E14 ni en el código: el de `estadoPagoLoteSchema` para `estadoPago` ausente es inglés ("Invalid option: expected one of …"), y la regla del encargo es PARADA si falta un texto. Me detuve solo en ese punto: el control empieza en el estado de pago de hoy (§D-11 dice "control segmentado y «Guardar»"), así que no hay estado "sin opción" ni rechazo local; lleva igual la línea de T-05 (`if (cambiar.isError) cambiar.reset()`) después de su guarda. Para cerrar (e), el arquitecto decide: (1) un texto nuevo para "elige una opción" y el control sin selección inicial, o (2) quitar (e) porque el control siempre tiene opción.
- **R-1 (`app/rutas-02c-r1.ataque.test.tsx:168-178`, seis casos, ataque, no lo toco).** "admin en /maestro/clases/nueva… termina en /admin sin pedir … nada del admin" exige que ninguna petición empiece con `/api/admin/`. Desde 01f, `/admin` es el dashboard y pide `GET /api/admin/resumen` al montarse (§D-11, ADM-1F24, O-01f-8). Recibido: `expected [ '/api/admin/resumen' ] to deeply equal []`. Es otro caso del mismo patrón que C-45 (M-15): el grep de la Enmienda 14 contó `rutas-02c-r1` entre los que "responden algo distinto de 2xx al resumen y no cuentan", pero estos seis sí filtran las peticiones a `/api/admin/`. Remedio que propongo (para el tester, con un C-n): excluir `GET /api/admin/resumen` de esa lista, o comprobar "nada de la clase ni de `/api/clases/nueva`" y que lo único del admin sea el resumen.
- **R-2 (`features/admin/cuentas-r3.ataque.test.tsx:416-434`, ataque, no lo toco).** "la respuesta que llega tras una búsqueda rechazada en el cliente (ficha desmontada) no hace nada": abre la confirmación (el foco va a «Cancelar», dentro de la ficha) y navega a `/admin/usuarios/abc` **sin** enfocar antes el enlace "Usuarios" (a diferencia de `buscarConEnter`); al final exige `document.activeElement` = el enlace "Usuarios" de la barra. Al desmontarse la ficha con el foco dentro, el foco queda en `<body>` (la ficha nueva es otra instancia, con `key`); ningún componente lleva el foco a la barra, y el plan dice "Raíz de la vista" para la ficha, no la barra. Recibido hoy: `expected <body>… to be <a aria-current="page" …>`. Creo que la prueba debía llamar a `act(() => campoBuscar().focus())` antes de `abrirFichaRechazada()`, como el caso hermano de `:395-414` (es la equivalencia que su propio comentario declara: "el campo de búsqueda donde se quedaba el foco"). Lo decide el manager.
- La corrección que el tester tiene anunciada en `en-espera-r1:268` y en títulos de `foco-r1` y `cuentas-r4` no se ve hoy: `en-espera-r1` está en verde con la versión actual.

### Desviaciones del plan (declaradas)
- **D-1 (lista cerrada).** `features/admin/formularios-ch3.test.tsx:647` (`expect(CASOS_SERVIDOR_Y_LOCAL).toHaveLength(24)` → `23`), en la precondición de CH3-C09. No estaba en la lista cerrada; es la cuenta del mismo arreglo del que la lista cerrada quita la fila de `BuscadorDeCuenta` (`:537-545`). Sin el cambio, CH3-C09 queda en rojo. Una línea, con comentario. Si el manager no lo acepta, se revierte y queda en rojo hasta una enmienda.
- **D-2 (reintentos).** `useResumenAdmin`, `useUsuariosAdmin` y `useUsuario` llevan `retry: reintentarConsultaAdmin` (`features/admin/lib.ts`): un 4xx no se reintenta; lo demás, una vez, como `app/providers.tsx`. El plan no lo dice; lo exigen las `*.ataque` de C-15 (`rutas-ch3-r1`, bloque de la tabla: un solo `400` en blanco debe dejar el texto de error, y con un reintento la segunda respuesta, `200`, lo borraba) y es coherente con la ficha: un `404` o un id mal formado no cambian al repetirlos. Prueba: `L` "reintentarConsultaAdmin: un 4xx no se reintenta; lo demás, una vez".
- **D-3 (FichaDeCuenta).** Sale de `FichaDeCuenta` el bloque de datos (nombre, correo, rol, "Cuenta inactiva"): la ficha nueva los pinta en su lista "Correo / Rol / Cuenta / Alta" y, si se quedaba, la región repetía el correo y el estado ("Desactivada" debe ser un solo nodo, OA-01f-r0-2). Sus props no cambian. `TEXTOS_CUENTAS.ficha.inactiva`, `TEXTOS_CUENTAS.titulo`, `notaProvisional` y `buscar` quedan sin uso (E-16 los borra en 01g).
- **D-4 (insignia en `/admin/clases`).** La celda "Maestros" conserva el texto unido ("Luis Pérez, Ana Ruiz", que piden `clases-admin-view.test.tsx:123` y `clases-admin-02c-r1:271`) y, debajo, repite cada maestro dado de baja con su insignia.
- **D-5 (diálogos).** Los dos diálogos reciben `onCerrar` (cancelar) y `onHecho` (éxito) por props, para que `acciones-de-cuenta.tsx` espere a que la ficha traiga el cambio antes de mover el foco al sustituto (el diálogo se cierra un render antes de que llegue la ficha renovada).
- **D-6 (E-01, sin reinicio).** "Corregir correo enviado deja un solo mensaje" se resuelve derivando: el error de restablecer solo se ve si se pidió después del último envío del correo (`FichaDeCuenta` cuenta los envíos con el `submit` que burbujea del formulario). No reinicia la mutación, porque una temporal ya visible debe seguir (`cuentas-r2`: "la temporal ya visible sigue en la ficha de Carla al corregir su correo") y porque un reinicio condicionado a `isError` fuera de la lista lo prohíbe C-35. Al abrir y cerrar la confirmación sí hay `restablecer.reset()` sin condición (salvo con la petición en vuelo, leída de la ref).

### Nombres de mutaciones y consultas (para C-36 y C-39) y reinicios declarados (CH3-C13)
- Mutaciones: `editar` (nombre), `alta`, `baja` (diálogo), `reactivar`, `restringir` (diálogo), `restablecerAcceso`, `cambiar` (estado de pago); de hoy: `restablecer`, `corregir`, `invitar`. Consultas: `resumen`, `usuarios`, `usuario`.
- Reinician una mutación (lista exacta de CH3-C13): los diez de siempre; `formulario-nombre-de-cuenta.tsx#editar`, `formulario-alta-alumno.tsx#alta`, `dialogo-restringir-acceso.tsx#restringir`, `estado-de-pago-de-cuenta.tsx#cambiar` (T-05, después de su guarda); `ficha-de-cuenta.tsx#restablecer` (E-01: al abrir o cerrar la confirmación); `dialogo-dar-de-baja.tsx#baja` (al cerrarse, ADM-1F07b e). `editar` y `restringir` también se reinician sin condición al cerrar su formulario o su diálogo. `reactivar` y `restablecerAcceso` no se reinician (un nuevo `mutate` ya reemplaza el error).
- Refs de envío: todas las mutaciones nuevas y `formulario-corregir-correo.tsx` (fila 7, entre `preventDefault()` y la guarda `isPending`). "Cargar más usuarios": `cargandoMasRef`, `enEspera={usuarios.isFetching}`, `fetchNextPage({ cancelRefetch: false })`.

### Matriz de avisos y recargas de 01f (confirmada contra el código)
"Reemplaza": la vista o el panel pasan a `MensajeError` (`role="alert"`), sin aviso. "Redirige": `apiClient` lo resuelve (401, `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`) y ningún control lo pinta ni avisa (`errorQueRedirigeElCliente`). "Desmontada": la vista o el control que lanzó la acción ya no está; sus callbacks de `mutate` no corren y el gancho decide.

| Disparador | 4xx de negocio / VALIDACION | 409 | 5xx o red | Redirige | Se renueva | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|---|---|
| Resumen del dashboard (`GET /admin/resumen`) | Cualquier 4xx: sin reintento, reemplaza el panel de las cifras con `TEXTOS_INICIO_ADMIN.error` | — | Un reintento y después reemplaza el panel | Sin texto propio (la página se va) | Pulsar «Inicio» estando aquí (`resetQueries` si quedó en error); en error se marca vieja al desmontarse | No se mueve | Una sola consulta | Marcada vieja si quedó en error |
| Tabla de usuarios, primera página | `400` del término o de un filtro, `BUSQUEDA_MUY_CORTA`: sin reintento, reemplaza la tabla con `TEXTOS_USUARIOS.error`; "cursor:" con la frase de lista cambiada | — | Un reintento y después `TEXTOS_USUARIOS.error` | Igual | Pulsar «Usuarios» estando aquí; dejar la clave (otro rol u otro término) o desmontarse la marcan vieja si quedó en error; editar la búsqueda pide otra clave | No se mueve en la primera carga | Una consulta por clave; un término con el nulo no pide | Marcada vieja si quedó en error |
| "Cargar más usuarios" | `400` "cursor: no es válido": la frase de lista cambiada reemplaza la tabla; otro `400`: el texto de error | — | `TEXTOS_USUARIOS.error` reemplaza la tabla (sin aviso; como 01c) | Igual | Los mismos caminos piden la primera página sin cursor | Si el botón desaparece con el foco: primera fila nueva («Ver …») o el `h1` | Ref + `enEspera={isFetching}` + `cancelRefetch: false`: una petición | — |
| Ficha (`GET /admin/usuarios/:id`) | `404` o cualquier `VALIDACION`: "Esa cuenta ya no existe." con "Volver a Usuarios", sin reintento ni aviso | — | Un reintento y después `TEXTOS_USUARIO.error` | Igual | Volver a abrir la cuenta (marcada vieja al salir si quedó en error) | Raíz de la vista (`tabIndex={-1}`) solo si el control con el foco desaparece; desde la barra, no se mueve | Una consulta por id | Marcada vieja si quedó en error; la ficha lleva `key` por id |
| «Guardar nombre» | `VALIDACION`: un `MensajeError` (`textoParaTerceros`); el local, `ErrorDeCampo` | — | Un `MensajeError` (genérico); lo escrito se conserva | Sin texto | Éxito: la ficha toma la respuesta (`setQueryData`), listas viejas; aviso "Nombre actualizado" | Éxito: el formulario se cierra y el foco vuelve a «Editar nombre» | Ref: una petición | `toast.error` con el texto traducido (salvo redirección); el éxito avisa igual |
| «Crear cuenta» (alta) | `VALIDACION`: un `MensajeError`; `CORREO_EN_USO`: `ErrorDeCampo` en "Correo" y ningún `MensajeError` | (`CORREO_EN_USO` es 409: arriba) | Un `MensajeError` | Sin texto | Éxito: listas y resumen viejos; la temporal, solo en el estado del formulario (`gcTime: 0`, sale de la caché al asentarse) | La temporal toma el foco («Copiar») solo si seguía en el formulario | Ref: una petición | `toast.error` traducido; la temporal no se muestra (el formulario ya no está) |
| «Sí, dar de baja» | `VALIDACION` (también `activo` en inglés): un `MensajeError` en el diálogo (genérico) | `MAESTRO_CON_CLASES`, `CUENTA_DE_ADMINISTRACION`: su texto del servidor en el diálogo | Un `MensajeError` en el diálogo | Sin texto | Éxito: ficha (`setQueryData`), listas y resumen; aviso "Cuenta dada de baja" | Éxito: «Reactivar» cuando la ficha ya trae el cambio; cancelar: «Dar de baja» | Ref; el diálogo no se cierra en vuelo | `toast.error` traducido |
| «Reactivar» | `VALIDACION`: un `MensajeError` (genérico para `activo`) | `CUENTA_DE_ADMINISTRACION`: texto del servidor | Un `MensajeError` | Sin texto | Igual que la baja; aviso "Cuenta reactivada" | Éxito: «Dar de baja» si el foco se perdió | Ref: una petición | `toast.error` traducido |
| «Sí, restringir» | `VALIDACION` (también `restringido` en inglés): un `MensajeError` en el diálogo; el motivo local, `ErrorDeCampo` | `NO_ES_ALUMNO`: texto del servidor | Un `MensajeError` | Sin texto | Igual; aviso "Acceso restringido" | Éxito: «Restablecer acceso»; cancelar: «Restringir acceso» | Ref; no se cierra en vuelo | `toast.error` traducido |
| «Restablecer acceso» | Como «Reactivar» (genérico para `restringido`) | `NO_ES_ALUMNO` | Un `MensajeError` | Sin texto | Igual; aviso "Acceso restablecido" | Éxito: «Restringir acceso» si el foco se perdió | Ref | `toast.error` traducido |
| «Guardar» (estado de pago) | `VALIDACION` (también `estadoPago` en inglés): un `MensajeError` (genérico) | — | Un `MensajeError` | Sin texto | Éxito: la ficha se vuelve a pedir (la respuesta es solo el número), listas y resumen; aviso "Estado de pago actualizado" | Se queda en «Guardar» | Ref | `toast.error` traducido |
| «Sí, restablecer» y «Guardar correo» | De hoy, con E-01 (el error de restablecer se oculta tras un envío del correo y sale al abrir o cerrar la confirmación) | — | De hoy (el genérico ante la red, E-25) | Igual | Corregir: la ficha funde la respuesta (`setQueryData`, también desmontada) y las listas quedan viejas | De hoy | Refs: una petición cada una | Restablecer: la temporal se descarta (la ficha tiene `key`); corregir: la ficha de esa cuenta en la caché se renueva, la de otra no |

Dos disparadores en vuelo a la vez en la misma ficha (por ejemplo, «Restablecer acceso» y «Guardar»): cada uno tiene su mutación, su ref y su `MensajeError`; si los dos fallan se ven dos mensajes, uno bajo cada control (no lo cubre E-01, que es de restablecer y corregir).

### Frases de recuperación y sus caminos (cada uno con su caso)
- "No pudimos cargar el resumen. …": pulsar «Inicio» estando ahí (ADM-1F01 b); ir a otra sección y regresar (ADM-1F01 c). No hay control que repetir.
- "No pudimos cargar los usuarios. …": pulsar «Usuarios» (ADM-1F17 a, y C-15); ir y regresar (ADM-1F17 b, y C-15); historial atrás, adelante, atrás (ADM-1F17 e, y C-15); cambiar el rol y volver con la clave en error, primera carga y recarga (ADM-1F17 d); editar la búsqueda (ADM-1F21 e).
- "La lista cambió mientras la veías. …": pulsar «Usuarios», ir y regresar, historial (ADM-1F03 / ADM-1F18 c).
- "No pudimos cargar la cuenta. …": volver a la tabla y abrir otra vez la misma cuenta (ADM-1F17 c). "Esa cuenta ya no existe." lleva "Volver a Usuarios" (ADM-1F26).

### Hermanos y estados vecinos (de los mecanismos nuevos)
- Marcar vieja una consulta en error: resumen, tabla (por clave) y ficha; al dejar la clave y al desmontarse. Estados: primera carga en error (ADM-1F17 d), recarga con datos en error (ADM-1F17 d, segunda), dos fallos seguidos (los 5xx con un reintento), cambio de clave (rol, término), desmontar y volver, historial. Aplicado a los tres.
- No reintentar un 4xx: resumen, tabla y ficha (los tres). Las mutaciones no reintentan (como hoy).
- El nombre de otra persona (`textoParaTerceros`): alta, "Editar nombre" e "Invitar maestro"; error local y del servidor en los tres. El registro, el registro por enlace y "Establecer contraseña" no (P-E14-1 a).
- `errorQueRedirigeElCliente`: en los `MensajeError` de las siete mutaciones nuevas y en los avisos con el control desmontado. Las de hoy (restablecer, corregir, invitar) no cambian.
- El foco al sustituto: «Dar de baja»/«Reactivar» y «Restringir acceso»/«Restablecer acceso», tras cancelar y tras el éxito, con diálogo o sin él.
- El nulo: buscador (vacío sin pedir), nombre (alta y "Editar nombre"), correo (alta) y motivo (restringir).

### Pendiente o fuera de alcance detectado
- P-01f-1, R-1 y R-2 (arriba): los decide el manager.
- ADM-1F23 en la lista de maestros del maestro y del admin, y en `/admin/clases`: probado con el componente y sus props, no con la vista y su doble de `GET /clases/:claseId` o `GET /admin/clases`. La vista no cambia de fuente (§D-11, Enmienda 14: `maestros`), pero el caso de punta a punta queda para el tester.
- `DESIGN.md`: los patrones nuevos (dashboard con cifras, tabla de usuarios y ficha) los documenta el orquestador al cierre (A-04); no lo toqué.

## ADMIN-01f — Corrección de la verificación (2026-11-09)

Responde a `revision.md`, "## Verificación del resumen — ADMIN-01f — implementación" (línea 6604): M-20, M-21, M-22 y la declaración de D-7. Arbitrajes que no piden código: P-01f-1, que M-22 resuelve; R-1 y R-2, que el tester cerró con C-46 y C-47; D-1 a D-6, aceptadas. No toqué ninguna `*.ataque`. Sin commit, sin navegadores, una corrida después de otra (nadie más corre suites, dato del orquestador).

### Hallazgos
- **M-20: corregido.** `features/admin/usuario-view.tsx`: la raíz con `tabIndex={-1}` y `useFocoAlPerderseElControl` pasan a `VistaDeLaCuenta`, que no lleva `key` y queda montada entre cuentas. Solo el contenido (`FichaDeLaCuenta`) sigue con `key={usuarioId}` (E-25: la temporal, los errores y las confirmaciones de la cuenta anterior se descartan). `VistaDeLaCuenta` lee el momento de la misma consulta (`useUsuario`, misma clave, una sola petición) para la clave del gancho, `claveDeFocoDeLaConsulta(usuarioId, usuario)`, que cambia con el id y con cada respuesta o fallo. Con el foco dentro de la ficha que se va, termina en la raíz; con el foco fuera (la barra), no se mueve.
  - Antes de corregir, los seis casos nuevos de M-20 fallan con la estructura vieja (con la `key` en la raíz): `npx vitest run src/features/admin/ficha-01f.test.tsx -t "M-20"` → `Tests  6 failed | 2 passed | 58 skipped (66)`; los dos que pasan son los controles. Con la corrección, verdes.
- **M-21: corregido.** `features/clases/cuenta-desactivada-01f.test.tsx` suma cinco casos con la vista montada por `rutas` y el doble de su consulta: el maestro (`/maestro/clases/:claseId/personas`, con `GET /api/clases/:claseId`) y el admin (`/admin/clases/:claseId/personas`, con la misma consulta), cada uno con el doble derecho (`maestros[1]` marcado y `maestro` sin la marca) y al revés (`maestro` marcado y `maestros` sin la marca); y `/admin/clases`, con `GET /api/admin/clases`, que no tiene campo de compatibilidad (`claseAdminSchema` solo trae `maestros`): un maestro marcado y uno activo. Los de componente se quedan, como prueba de ADM-1F16.
- **M-22: corregido (arbitraje de P-01f-1, opción 2, sin texto nuevo).** `features/admin/ficha-01f.test.tsx`, caso ADM-1F09b (e): un `400 VALIDACION`, después elegir la otra opción y guardar con un `5xx`, y después `200`. En cada paso, un solo mensaje (el del último envío; el viejo ya no está), la opción elegida se conserva y «Guardar» sale de la espera; el tercer envío avisa "Estado de pago actualizado" y deja cero alertas. Se leen los tres cuerpos (`deudor`, `al_corriente`, `al_corriente`). Ejercita la línea de T-05 de `estado-de-pago-de-cuenta.tsx`. El código no cambia.
- **D-7: declarada.** Fila "Cargar más usuarios" de la matriz: el `5xx` (como cualquier error que no sea del cursor) reemplaza la tabla con `TEXTOS_USUARIOS.error`, sin aviso, como en 01c (Enmienda 9, P-01c-4). La matriz del plan (`:1867`) decía "Reemplaza / un aviso". La prueban ADM-1F17 (d), "lo mismo con la clave de antes en error en una recarga con datos (la página siguiente que falla)", y ADM-1F03.
- P-01f-1 queda cerrado por M-22. R-1 y R-2 (C-46 y C-47): ahora verdes en mis corridas, abajo.

### Hermano aplicado (M-20)
- **La tabla de `/admin/usuarios`: aplicado.** `features/admin/usuarios-view.tsx`: la raíz de la vista lleva `tabIndex={-1}` y `useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaConsulta(JSON.stringify(clave), usuarios))`, declarado después de `useFocoAlCargarMas`, que sigue decidiendo cuando el control que desaparece es «Cargar más usuarios» (al primer «Ver …» nuevo o al `h1`). Camino real: el foco en un «Ver …» cuando cambia la clave (por ejemplo, la búsqueda diferida 300 ms llega con el foco ya en una fila) o la tabla pasa a error. Antes caía en `<body>`.
- **El dashboard: no aplica.** El panel de las cifras se reemplaza por su `MensajeError`, pero no tiene controles (las cifras son texto y los accesos no dependen del resumen: siguen montados). Nada con el foco desaparece.
- **Formularios y diálogos de la ficha:** su foco ya lo decide cada uno (al cerrarse vuelve al botón que lo abrió o a su sustituto). Si un cambio de la consulta los desmonta con el foco dentro, ahora también lo recoge la raíz.

### Estados vecinos del mecanismo (la raíz de la ficha), uno por uno
- **Primera carga:** abrir la ficha sin foco en ella no mueve nada. Caso: "M-20 (control): abrir la primera ficha sin foco en ella no mueve el foco".
- **Cambio de clave (otra cuenta):** "M-20: con el foco dentro de la ficha, ir a %s lleva el foco a la raíz de la vista, nunca a <body>", fila "otra cuenta".
- **Error en la carga nueva:** las filas "el id mal formado (400)" y "una cuenta que no existe (404)" del mismo caso, y "M-20: con el foco dentro de la ficha, ir a una cuenta cuya carga falla (5xx) lleva el foco a la raíz".
- **Fallos seguidos:** el `5xx` falla dos veces (un reintento), y la clave cambia con cada fallo (`errorUpdateCount`). Mismo caso del `5xx`.
- **Error ya en caché:** la cuenta que quedó en error se marca vieja al salir y se vuelve a pedir al volver; la raíz no depende de la caché (la clave lleva el id). Lo prueba "ADM-1F26 (control) y ADM-1F17 (c): …" para el texto; para el foco aplica el mismo camino que "otra cuenta".
- **Recarga con datos:** la ficha no se recarga sola. `setQueryData` tras una acción cambia la clave sin quitar el control: el gancho solo mueve el foco si el control que lo tenía ya no está, y sigue en verde lo de `cuentas-r1` a `cuentas-r4`, `foco-r1` y `en-espera-r1` (por ejemplo, la temporal que llega con el foco en "Correo correcto").
- **Historial:** "M-20: atrás y adelante del historial entre dos fichas con el foco dentro llevan el foco a la raíz cada vez".
- **`<StrictMode>`:** "M-20 con <StrictMode>: ir a otra cuenta con el foco dentro lo lleva a la raíz".
- **Foco fuera (A-4, C-47):** "M-20 (control, A-4): con el foco en el enlace «Usuarios» de la barra, ir a otra cuenta, a abc o a un 404 no lo mueve", y C-47 de `cuentas-r3`, en verde.
- **La tabla (hermano):** "con el foco en «Ver», cambiar el rol (la tabla se vuelve a cargar) lleva el foco a la raíz"; "con el foco en «Ver», un error de la clave nueva lleva el foco a la raíz"; control: "(control) con el foco en el buscador, escribir un término no lo mueve aunque la tabla se recargue".

### Archivos de esta vuelta
- Producción: `frontend/src/features/admin/usuario-view.tsx` (M-20) y `frontend/src/features/admin/usuarios-view.tsx` (el hermano). Los dos estaban en "Se toca" de 01f; ninguno nuevo.
- Pruebas (nuevas de 01f): `frontend/src/features/admin/ficha-01f.test.tsx` (M-20 y M-22; `montar` acepta `<StrictMode>`), `frontend/src/features/admin/usuarios-01f.test.tsx` (hermano de M-20), `frontend/src/features/clases/cuenta-desactivada-01f.test.tsx` (M-21).
- Ninguna `*.ataque`, ninguna prueba de la lista cerrada, ninguna vigilada.

### Verificación (comando exacto y última línea; desde `frontend/`)
- lint: `npm run lint` → exit 0; última línea `> tsc -b`.
- build: `npm run build` → exit 0; última línea `✓ built in 2.17s`.
- Módulos: `npx vitest run src/features/admin src/features/clases src/components/foco src/components/layout` → `Tests  3447 passed (3447)` (`Test Files  145 passed (145)`).
- C-n fuera de los módulos y vigiladas: `npx vitest run` con las 32 rutas de la entrega anterior más `src/app/foco-pestana-02d-r3.ataque.test.tsx` → `Tests  1160 passed (1160)` (`Test Files  33 passed (33)`). Están en verde C-46 (`app/rutas-02c-r1`) y C-47 (`features/admin/cuentas-r3`).

### Conteos (`npx vitest list <archivo> | grep -ac ' > '`)
- `ficha-01f.test.tsx`: 66 (antes 57; +1 de M-22 y +8 de M-20).
- `usuarios-01f.test.tsx`: 36 (antes 33; +3 del hermano).
- `features/clases/cuenta-desactivada-01f.test.tsx`: 12 (antes 7; +5 de M-21).
- Módulos: de 3430 a 3447 (+17 = 9 + 3 + 5).

### Pruebas requeridas que cambian de mapeo
- **ADM-1F09b (e)** → `ficha-01f.test.tsx` "ADM-1F09b (e): un 400, elegir la otra opción y guardar con un 5xx, y luego 200: un solo mensaje en cada paso, la opción se conserva y «Guardar» sale de la espera". Ya no hay viñeta sin cubrir.
- **ADM-1F23** → además de los tres de antes, `cuenta-desactivada-01f.test.tsx`:
  - "ADM-1F23, maestro (/maestro/clases/:claseId/personas): con maestros[1] marcado y `maestro` sin la marca, la insignia sale junto a ese maestro y no junto al activo"
  - "ADM-1F23, maestro: con `maestro` marcado y `maestros` sin la marca, no sale"
  - "ADM-1F23, admin (/admin/clases/:claseId/personas): con maestros[1] marcado y `maestro` sin la marca, la insignia sale junto a ese maestro y no junto al activo"
  - "ADM-1F23, admin: con `maestro` marcado y `maestros` sin la marca, no sale"
  - "ADM-1F23, /admin/clases con el doble de GET /api/admin/clases: la insignia sale junto al maestro dado de baja y no junto al activo"
  
  Ya no es cobertura parcial.
- La matriz de 01f (fila de la ficha, "Foco: raíz de la vista") ya se cumple también al cambiar de cuenta. Por D-7, la fila "Cargar más usuarios" dice "el `5xx` reemplaza la tabla, sin aviso".

### Desviaciones
D-7 queda declarada arriba (aceptada por el manager). Ninguna otra en esta vuelta.

### Pendiente
Nada de 01f. Los patrones visuales nuevos (dashboard, tabla de usuarios, ficha e insignia en `/admin/clases`, D-4) van en A-04 de `DESIGN.md`, al cierre, a cargo del orquestador.

## ADMIN-01f — Corrección ronda 1 (2026-11-09)

Responde a `reporte-tester.md`, "## Ronda 1 — ADMIN-01f" (línea 5810), que dio ROTO con T-01 y T-02; las pruebas son de `frontend/src/features/admin/usuarios-01f-r1.ataque.test.tsx`, que no toqué. Es la ronda 1 de 3. Sin commit, sin navegadores, una corrida después de otra (nadie más corre suites, dato del orquestador).

### Hallazgos
- **T-01: corregido.** `features/admin/components/estado-de-pago-de-cuenta.tsx`: el control ya no guarda la opción en `useState(estadoPago)`. Guarda solo la elección de la persona (`eleccion`, `null` si no eligió) y muestra `eleccion ?? estadoPago`, así que sigue a la ficha cada vez que esta trae otro estado (la respuesta de «Restringir acceso», la recarga pasado el `staleTime` o cualquier `setQueryData`). En `features/admin/hooks.ts`, `useCambiarEstadoPago` pone en la ficha el estado guardado con `setQueryData` en cuanto el servidor responde `200`, además de volver a pedirla (la respuesta solo trae el número).
  - **Lo que decidí, sin texto nuevo:**
    - Una elección distinta del estado de la ficha, sin guardar o con «Guardar» en vuelo, se conserva aunque llegue otro estado. Con dos opciones, eso solo pasa si el servidor vuelve al estado de antes.
    - La elección deja de contar en tres casos: el servidor trae ese mismo estado (la comparación se hace en el render, con el estado visto antes, sin efecto); «Guardar» sale bien (la ficha ya lo trae); o la persona elige el estado que tiene la ficha.
    - Un error la conserva, como pedía ADM-1F09b.
    - No hace falta ningún aviso ni texto: el control muestra siempre el estado del servidor, salvo mientras hay una elección propia sin guardar.
- **T-02: corregido.** `components/foco/hooks.ts`: `useFocoAlPerderseElControl` gana un tercer parámetro opcional, `incluirDialogos` (por omisión `false`, así que el criterio no cambia para nadie más). Con él, un `focusin` dentro de un `role="dialog"` también cuenta como control de la vista, aunque el diálogo viva en un portal. La ficha (`usuario-view.tsx`, `VistaDeLaCuenta`) lo pasa en `true`. Al cambiar de cuenta con un diálogo abierto, el diálogo se desmonta con su control, cambia la clave y el foco va a la raíz de la vista.
  - Las vigiladas de `components/foco` y `features/calificaciones/estatico-01d` siguen en verde (corrida de módulos y de las 32 rutas). El comentario nuevo no usa ninguna palabra prohibida de CAL-1D09.
- Pruebas nuevas que fallan sin la corrección: con `incluirDialogos` en `false` y el control de vuelta a un estado fijo, `npx vitest run src/features/admin/ficha-01f.test.tsx -t "T-01|T-02"` → `Tests  21 failed | 1 passed | 66 skipped (88)`. El que pasa es el control "T-02 (control): cerrar el diálogo con «Cancelar» sin cambiar de cuenta devuelve el foco a su botón, no a la raíz". Con la corrección, los 22 en verde.

### Hermanos de T-01 (estado local inicializado con datos del servidor)
- `features/admin`, revisado archivo por archivo. Busqué `useState(` en todo el módulo y lo crucé con props de la cuenta o de una consulta:
  - `estado-de-pago-de-cuenta.tsx`: era el caso. Corregido.
  - `formulario-nombre-de-cuenta.tsx`: el campo es no controlado y toma `defaultValue={cuenta.nombre}` al abrirse. Con el formulario abierto, un nombre nuevo del servidor no pisa lo que la persona escribe (es su edición); cerrado, se monta de nuevo con el nombre de hoy. No es el patrón: no se cambia.
  - `ficha-de-cuenta.tsx`: `correosAlConfirmar` se inicializa con un contador local, no con un dato del servidor.
  - `acciones-de-cuenta.tsx`: deriva los botones de `cuenta` en cada render.
  - `formulario-alta-alumno.tsx`, `usuarios-view.tsx` (término y filtro), `contrasena-temporal.tsx` y los diálogos: su estado no viene del servidor.
  - Sin otro hermano.
- `features/clases` de 01f (`lista-personas.tsx`, `lista-maestros-de-clase.tsx`, `tabla-clases-admin.tsx`): solo `confirmando` (local, `false`). Sin hermano.
- **Observación para 01g (no se toca en 01f):** la fila y el lote de `/admin/estado-pago` deben seguir el mismo criterio (mostrar el estado del servidor de cada fila y no guardar una copia al montarse), y la selección del lote no debe sobrevivir a filas que cambiaron.

### Hermanos y estados vecinos de T-02 (el foco en un diálogo al cambiar la clave)
- **Diálogos de 01f:** dar de baja y restringir acceso. No hay otros en `features/admin`: `components/ui/dialog` solo lo usan esos dos (C-13b). Casos en `ficha-01f.test.tsx`:
  - "T-02: diálogo de %s con el foco en «%s», ir a %s: el diálogo se cierra y el foco va a la raíz" (15 filas):
    - baja, con el foco en «Cancelar» y en «Sí, dar de baja»;
    - restringir, con el foco en «Cancelar», en «Sí, restringir» y en "Motivo (opcional)" con el motivo a medias;
    - cada una de esas cinco hacia otra cuenta, `abc` y `404`.
  - "T-02: atrás y adelante del historial con un diálogo abierto cada vez llevan el foco a la raíz".
  - "T-02: con el diálogo abierto, ir a una cuenta cuya carga falla (5xx) lleva el foco a la raíz" (con su reintento, fallos seguidos).
  - "T-02 con <StrictMode>: con el diálogo abierto, ir a otra cuenta lleva el foco a la raíz".
  - Control: "T-02 (control): cerrar el diálogo con «Cancelar» sin cambiar de cuenta devuelve el foco a su botón, no a la raíz". Cerrar un diálogo sin cambiar la clave no toca la raíz: su foco lo decide `acciones-de-cuenta.tsx`, y el éxito, que sí cambia la clave con `setQueryData`, lleva el foco al sustituto antes de que el gancho de la raíz decida (ADM-1F07 y ADM-1F08, en verde).
  - Del tester: ADM-T1F03 y ADM-T1F04, en verde.
- **Primera carga, recarga y error en caché:** con el diálogo abierto, la ficha solo cambia de clave por una respuesta (cubierta por `setQueryData`, arriba) o por el cambio de cuenta. Sin diálogo, lo cubren los casos de M-20 y ADM-T1F05 y ADM-T1F06.
- **La tabla de `/admin/usuarios`:** no tiene diálogos (el alta es en línea). No aplica, y no pasa el parámetro.
- **`features/clases` de 01f, `dialogo-borrar-clase.tsx` en `/admin/clases`:** `clases-admin-view.tsx` no usa la raíz de `components/foco`, sino `useFocoAlPasarAError` sobre el `h1` y `useFocoAlCerrarElBorrado`. El diálogo se cierra con su botón o con la vista. Salir de `/admin/clases` con el diálogo abierto desmonta toda la vista; cambiar `?estado=` con el historial y el diálogo abierto no cambia de vista. Aplicar aquí el criterio exigiría tocar `clases-admin-view.tsx`, que no está en "Se toca" de 01f: **no lo toco**. Queda para el manager como observación (no lo ataqué, como dice el tester).
- **Fuera de 01f, PARADA para ese hermano (no toco nada):** `features/calificaciones/mis-calificaciones-view.tsx` usa `useFocoAlPerderseElControl` y abre el modal de cálculo (`components/calculo-de-calificacion.tsx`, en un portal). Si su clave cambia con el modal abierto, el caso es el mismo de T-02. Pasarle `incluirDialogos` exige tocar un archivo fuera de "Se toca" (y fuera del módulo), así que lo dejo con la lista para el manager o el arquitecto: `features/calificaciones/mis-calificaciones-view.tsx` (y, si se decide el mismo criterio, revisar `gradebook-view.tsx`, que no tiene diálogo). El parámetro ya existe y no cambia nada mientras nadie lo pase.

### Matriz de 01f: filas que cambian
| Disparador | Antes | Ahora |
|---|---|---|
| Ficha (`GET /admin/usuarios/:id`), foco | Raíz de la vista si el control que tenía el foco, dentro de la raíz, desaparece al cambiar la clave | Igual, y también si ese control estaba en un diálogo de la ficha (baja o restringir), que vive en un portal: con el diálogo abierto, otra cuenta, `abc`, `404`, `5xx`, atrás o adelante cierran el diálogo y el foco va a la raíz. Con el foco en la barra, no se mueve |
| «Guardar» (estado de pago), se renueva | La ficha se vuelve a pedir; el control seguía con su valor inicial | La ficha toma el estado guardado con `setQueryData` y además se vuelve a pedir; el control muestra siempre el estado de la ficha, salvo una elección propia sin guardar o en vuelo |
| Cualquier respuesta que traiga otro `estadoPago` a la ficha («Restringir acceso», «Restablecer acceso», «Dar de baja», «Reactivar», «Guardar nombre», la recarga pasado el `staleTime`) | El control no cambiaba | El control muestra el estado nuevo; una elección propia distinta se conserva hasta que el servidor trae ese mismo estado o se guarda |

Las demás filas no cambian (con D-7, declarada en la corrección de la verificación).

### Archivos de esta vuelta
- Producción, todos en "Se toca" de 01f:
  - `frontend/src/components/foco/hooks.ts` (el parámetro `incluirDialogos`);
  - `frontend/src/features/admin/usuario-view.tsx` (lo pasa en `true`);
  - `frontend/src/features/admin/components/estado-de-pago-de-cuenta.tsx` (T-01);
  - `frontend/src/features/admin/hooks.ts` (`setQueryData` en `useCambiarEstadoPago`).
- Pruebas: `frontend/src/features/admin/ficha-01f.test.tsx` (22 casos nuevos: 3 de T-01 y 19 de T-02). Ningún `*.ataque`, ninguna prueba de la lista cerrada, ninguna vigilada.

### Verificación (comando exacto y última línea; desde `frontend/`)
- lint: `npm run lint` → exit 0; última línea `> tsc -b`.
- build: `npm run build` → exit 0; última línea `✓ built in 928ms`.
- Módulos: `npx vitest run src/features/admin src/features/clases src/components/foco src/components/layout` → `Tests  3479 passed (3479)` (`Test Files  146 passed (146)`).
- Archivo del tester: `npx vitest run src/features/admin/usuarios-01f-r1.ataque.test.tsx` → `Tests  10 passed (10)`.
- C-n fuera de los módulos y vigiladas: `npx vitest run` con las 32 rutas de siempre más `src/app/foco-pestana-02d-r3.ataque.test.tsx` → `Tests  1160 passed (1160)` (`Test Files  33 passed (33)`).

### Conteos
- `npx vitest list src/features/admin/ficha-01f.test.tsx | grep -ac ' > '` → 88 (antes 66; +22).
- Módulos: de 3447 a 3479 (+32 = los 10 del tester, que ahora caen dentro de `src/features/admin`, y mis 22).

### Hallazgos
T-01 corregido. T-02 corregido.

### Pendiente o fuera de alcance
- Hermano de T-02 fuera de "Se toca": `features/calificaciones/mis-calificaciones-view.tsx` (modal de cálculo). Para ese hermano, PARADA con la lista de arriba.
- Observación: el diálogo de borrar una clase en `/admin/clases` (`clases-admin-view.tsx`, fuera de "Se toca").
- Observación para 01g: la fila y el lote de estado de pago (T-01).

## ADMIN-01g — Implementación (2026-11-09)

**Estado: terminado, sin PARADA de código.** Queda una observación de R-23 (un hermano en vistas de 01f, fuera de "Se toca"), al final.

- **Plan:** `plan.md` = `d42d343530f61a0774093cd29acd91ccadf5a12b7c0d324639daeace43f4a46d` (Enmiendas 1 a 15), comprobado al empezar.
- **Base de "No se toca" dentro de los paquetes:** `1566196`.
- **Entorno:** nadie más corría suites (dato del orquestador). Una corrida después de otra, sin navegadores y sin commit. `BatteryStatus` 2 (corriente) al terminar.
- **Escapes:** el carácter nulo, como `String.fromCharCode(0)`; ningún invisible literal.
- **Pasos:** 29 y 30, completos.

### Archivos tocados contra "Se toca" (§D-R0 01g, "Enmienda 15": 20 de producción)
- **Nuevos (6):**
  - `features/admin/estado-pago-view.tsx`;
  - `features/admin/movimientos-view.tsx`;
  - `features/admin/components/tabla-estado-pago.tsx` (la fila vive aquí, con sus dos `enEspera=`);
  - `features/admin/components/barra-de-lote.tsx`;
  - `features/admin/components/dialogo-estado-pago-lote.tsx`;
  - `features/admin/components/tabla-movimientos.tsx`.
- **Cambiados (14):**
  - en `features/admin/components/`:
    - `tabla-enlaces.tsx` (E-01, E-07, E-18);
    - `registrados-del-enlace.tsx` (E-07);
    - `enlace-nuevo.tsx` (E-14);
    - `resultado-invitacion-masiva.tsx` (E-17);
    - `formulario-generar-enlace.tsx`, `formulario-invitacion-masiva.tsx` y `formulario-invitar-maestro.tsx` (refs de las filas 8 a 10);
  - en `features/admin/`: `hooks.ts`, `data.ts` (E-16 y los textos de T-E14), `lib.ts` y `types.ts`, que solo suman o quitan lo de E-16;
  - `components/layout/data.ts` (seis destinos);
  - `components/layout/barra-navegacion.tsx` (E-06);
  - `app/router.tsx`.
- **No toqué:** `inicio-admin-view.tsx`, `maestros-view.tsx`, `usuarios-view.tsx`, `usuario-view.tsx`, `dialogo-restringir-acceso.tsx`, `estado-de-pago-de-cuenta.tsx`, `components/estado-pago-badge.tsx` ni `components/foco/`. `backend/`, `shared/` e `infra/` no cambian.
- **Pruebas normales:**
  - lista cerrada: `lib/errores-de-api-estatico.test.ts` (CH3-C13: título, `CON_REF` con las cuatro rutas y `DE_01F` + `tabla-enlaces.tsx#revocar` y `dialogo-estado-pago-lote.tsx#cambiarLote`, nada más) y `components/layout/contenedor-rol.test.tsx` (seis enlaces; la tabla suma `/admin/`, `/admin/estado-pago` y `/admin/movimientos`; el caso de prefijo no cambia);
  - nuevas: `features/admin/estado-pago-01g.test.tsx`, `movimientos-01g.test.tsx`, `maestros-01g.test.tsx` y `lib-01g.test.ts`.
- No toqué ningún `*.ataque`.
- **E-16:** antes de borrar cada clave, la busqué en todo `frontend/src`, con las pruebas incluidas. Ninguna la leía, salvo `TEXTOS_CUENTAS.invitar.exito` y `.ficha.correoActualizado`, que se quedan.

### Verificación (comando exacto y última línea; desde `frontend/`)
- **lint:** `npm run lint` → exit 0; última línea `> tsc -b`.
- **build:** `npm run build` → exit 0; última línea `✓ built in 926ms`.
- **Módulos:** `npx vitest run src/features/admin src/components/layout` → `Tests  1173 passed (1173)` (`Test Files  34 passed (34)`). Incluye los C-n de `features/admin` (C-19c en `cuentas-r1`), las vigiladas de `features/admin` (`rutas-ch3-r1`, `maestros-*`, `formularios-ch3`, `errores-ch3-r1`, `ficha-01f`, `usuarios-01f`, `usuarios-01f-r1` y `-r2.ataque`) y los cuatro casos integrados de 01f (R-23), todos en verde.
- **C-n fuera de los módulos y vigiladas:** `npx vitest run` con las 26 rutas siguientes → `Tests  645 passed (645)` (`Test Files  26 passed (26)`):
  - `src/app/marco-r1.ataque.test.tsx`, `src/app/rutas-02c-r1.ataque.test.tsx`, `src/app/registro-maestro-03b-r1.ataque.test.tsx`;
  - `src/styles/clases-r1.ataque.test.ts`;
  - `src/lib/estatico-ch3-r2.ataque.test.ts`, `src/lib/estatico-ch3-r1.ataque.test.ts`, `src/lib/errores-de-api-estatico.test.ts`;
  - `src/app/errores-r1.ataque.test.tsx`, `src/app/en-espera-r1.ataque.test.tsx`, `src/app/contexto-r1.ataque.test.tsx`;
  - `src/features/clases/clase-archivada-01d2-vista.test.tsx`, `src/features/clases/estatico-03c1-r1.ataque.test.ts`;
  - `src/services/apiClient-ch3-r1.ataque.test.ts`, `src/services/apiClient-ch3.test.ts`;
  - `src/app/barra-02d-r1.ataque.test.tsx`, `src/app/router.ataque.test.tsx`, `src/app/marco.test.tsx`;
  - `src/features/auth/rutas-ch3-r1.ataque.test.tsx`;
  - `src/app/router.test.tsx`, `src/app/fondo-r1.ataque.test.tsx`;
  - `src/lib/errores-ch3-r1.ataque.test.ts`, `src/lib/errores-ch3-r2.ataque.test.ts`, `src/lib/unir-paginas.test.ts`;
  - `src/features/clases/clases-admin-01c-rutas.test.tsx`;
  - `src/features/calificaciones/estatico-01d.test.ts`, `src/features/calificaciones/estatico-01d-r1.ataque.test.ts`.
- **build de `shared/` y `prisma validate`:** n/a.

### Conteos (`npx vitest list <archivo> | grep -ac ' > '`)
| Archivo | Casos | Nuevo o cambiado |
|---|---|---|
| `estado-pago-01g.test.tsx` | 75 | nuevo |
| `movimientos-01g.test.tsx` | 8 | nuevo |
| `maestros-01g.test.tsx` | 7 | nuevo |
| `lib-01g.test.ts` | 7 | nuevo |
| `components/layout/contenedor-rol.test.tsx` | 25 | cambiado |
| `lib/errores-de-api-estatico.test.ts` | 5 | cambiado |

### Estado de cada C-n (rojo de la ronda 0 → ahora)
- **C-18** (`app/marco-r1`, `app/rutas-02c-r1`): rojo → verde. Seis destinos en el orden de O-01g-1 (Inicio, Usuarios, Estado de pago, Clases, Maestros, Movimientos), y `/admin/` con «Inicio» activo.
- **C-48** (`app/registro-maestro-03b-r1`): rojo → verde.
- **C-19 y C-19b** (`styles/clases-r1`): rojo → verde. V-06 con 90 (`tabla-estado-pago.tsx` 2, `dialogo-estado-pago-lote.tsx` 1, cada vista 1, la barra y `tabla-movimientos.tsx` 0; `restoAdmin` sigue en 2). V-07 con el diálogo del lote entre los atributos del contexto.
- **C-19c** (`features/admin/cuentas-r1`): rojo → verde.
- **C-38** (`lib/estatico-ch3-r2`): rojo → verde.
- **C-39** (`lib/estatico-ch3-r1`): verde → verde.
- **Un tropiezo propio, corregido antes de la corrida final:** escribí `enEspera=` en tres comentarios nuevos y V-06 los contó (93 en lugar de 90). Los reescribí.

### Vigiladas (si cambian, PARADA)
Ninguna cambió; todas están en verde en las dos corridas de arriba.
- `/admin/maestros` sigue con tres llamadas al montarse (`app/errores-r1`).
- `features/admin/rutas-ch3-r1` sigue con `inesperadas` estricta: E-07, E-14, E-17, E-18 y las refs no suman ninguna consulta al montar.
- El `role="status"` de `EnlaceNuevo` sigue siendo uno y con el mismo texto.
- E-17: `maestros-03c-r1:237` lee el mismo `textContent`.
- V-16 y los valores arbitrarios (`components/layout/estatico-r1`): sin corchetes nuevos; la barra de lote no es `fixed`.
- `contexto-r1`, `marco-r1` (una navegación, rutas existentes y "Administración" una vez), `clase-archivada-01d2-vista` y C-45 y C-46.

### Pruebas requeridas (01g) → archivo y título exacto
Abreviaturas de los archivos:
- `E` = `frontend/src/features/admin/estado-pago-01g.test.tsx`
- `M` = `frontend/src/features/admin/movimientos-01g.test.tsx`
- `MA` = `frontend/src/features/admin/maestros-01g.test.tsx`
- `L` = `frontend/src/features/admin/lib-01g.test.ts`
- `CR` = `frontend/src/components/layout/contenedor-rol.test.tsx`

Un título con `%s` es un `it.each`; entre paréntesis, sus filas.
- **ADM-1G01** → `E`: "ADM-1G01: la búsqueda manda q con rol=estudiante; el filtro manda estadoPago; la selección (de una en una y la de la cabecera), la barra, el diálogo con el conteo, una petición con los ids y el aviso con N" y "ADM-1G01: «Marcar…» de la fila va sin diálogo, con una petición por dos clics y el estado contrario"; vacíos y «Desde»: "la columna «Desde» dice la fecha o «Sin cambios»; vacíos según el filtro y la búsqueda".
- **ADM-1G01b** (a)–(d) → `E` "ADM-1G01b %s: un solo MensajeError en la fila, sin aviso ni inglés; la fila conserva su estado, su botón sale de la espera y la selección no cambia" (6 filas, con `estadoPago:` real en inglés); (e) → "ADM-1G01b (e): con el mensaje de la fila a la vista, abrir el diálogo del lote lo quita; con la única elegida fuera de la selección, «Sí, cambiar» deja exactamente un alert, el del diálogo; al cerrar, ninguno"; hermano → "ADM-1G01b (e), hermano: con el mensaje de la fila a la vista, abrir el diálogo de restringir de otra fila lo quita y al cerrarlo no vuelve"; M-25 → "ADM-1G01b (M-25): con la tabla en error, un diálogo abierto cuya acción falla deja dos alert en el documento y uno accesible, el del diálogo; al cerrarlo queda el de carga".
- **ADM-1G02** (a), (b), (c) y (e) → `E` "ADM-1G02 %s: un solo MensajeError en el diálogo, sin aviso ni inglés; la selección se conserva y el botón sale de la espera" (6 filas, con `estadoPago:` real en inglés y `motivo:`); (d) → "ADM-1G02 (d) y ADM-1G18 (c): un rechazo del servidor y después, con la fila elegida cambiada, «Sí, cambiar» da «Elige al menos un alumno», un solo mensaje y sin petición".
- **ADM-1G03** → `E` "ADM-1G03: «Restringir» abre el diálogo (contexto opaco y denso, foco en «Cancelar»), manda el motivo y el botón pasa a «Restablecer», con el foco en él" (con «Restablecer» sin diálogo y una petición por dos clics) y "ADM-1G03: «Cancelar» del diálogo de restringir devuelve el foco a «Restringir» de su fila". Los casos de ADM-1F08 del diálogo los cubre `ficha-01f.test.tsx`, porque el componente es el mismo y no cambia.
- **ADM-1G04** → `M`:
  - "ADM-1G04: la tabla con sus columnas, «Alta» o «Baja» y «Hecho por»; «Cargar más movimientos» pide solo el cursor, una vez con dos clics, y al cargar la última página el foco va al h1";
  - "ADM-1G04: sin movimientos, «Aún no hay movimientos»";
  - la frase de cursor vencido por cada camino, en las filas "la lista cambiada" de "ADM-1G04 y ADM-1G12, con %s, camino (a): …", "… camino (b): …" y "… camino (d): …".
- **ADM-1G05** → `MA`:
  - "ADM-1G05: dos clics hacen una sola petición en generar enlace, invitación masiva e invitar maestro";
  - "ADM-1G05 y ADM-1G10: «Cargar más enlaces» con isFetching, cancelRefetch: false y ref (una petición por dos clics); en la última página el foco va a «Ver registrados» del primer enlace nuevo";
  - "ADM-1G05: «Cargar más» de registrados con isFetching y ref: una petición por dos clics".
- **ADM-1G06** → `MA` "ADM-1G06: el error de «Sí, revocar» no reaparece al reabrir la confirmación".
- **ADM-1G07** → `MA` "ADM-1G07: el role=status de «Enlace nuevo» no contiene «Copiar enlace»".
- **ADM-1G08** → `CR` "en %s solo queda activo %j", fila `/admin/` → «Inicio» (y C-18 de `rutas-02c-r1`, verde).
- **ADM-1G09** → `MA` "ADM-1G09 y ADM-1G22 (E-17): el texto de cada línea inválida va en <bdi> y la línea se lee igual".
- **ADM-1G10** → `MA` "ADM-1G05 y ADM-1G10: …" (arriba).
- **ADM-1G11** → `E`:
  - "ADM-1G11 (a) y ADM-1G14 (b): pulsar «Estado de pago» estando aquí pide la primera página del filtro sin cursor; el texto desaparece y la selección se vacía";
  - "ADM-1G11 (b): ir a otra sección y regresar antes del staleTime pide la primera página y el texto desaparece";
  - "ADM-1G11 (c): cambiar el filtro y volver al de antes pide la primera página del filtro y el texto desaparece";
  - "ADM-1G11 (d): atrás y adelante del historial dejan la tabla sin el texto ni selección".
- **ADM-1G12**:
  - `/admin/estado-pago`, en `E`:
    - "ADM-1G12 (a): pulsar «Estado de pago» con la tabla en error la vuelve a pedir y el texto desaparece";
    - "ADM-1G12 (b): ir a otra sección y regresar antes del staleTime la vuelve a pedir";
    - "ADM-1G12 (d): atrás, adelante y atrás del historial la vuelven a pedir";
    - (c) → "ADM-1G12 (c) y ADM-1G16 (e): con la clave de «Deudores» en error (%s), cambiar el filtro y volver la vuelve a pedir y, con 200, el texto desaparece" (3 filas: 5xx en su primera carga, 400 de `estadoPago` en inglés en su primera carga y 400 fuera de contrato en una recarga con datos).
  - `/admin/movimientos`, en `M`: las filas "el error de carga" de los caminos (a), (b) y (d).
- **ADM-1G13** → `CR` "con rol admin, hay seis enlaces: 'Inicio' hacia /admin, 'Usuarios' hacia /admin/usuarios, 'Estado de pago' hacia /admin/estado-pago, 'Clases' hacia /admin/clases, 'Maestros' hacia /admin/maestros y 'Movimientos' hacia /admin/movimientos" y "en %s solo queda activo %j" (con `/admin/estado-pago` y `/admin/movimientos`); además C-18 y C-48, verdes.
- **ADM-1G14**:
  - (a) → `E` "ADM-1G14 (a): «Cargar más alumnos» pide la página siguiente con el filtro, rol, cursor y cursorNombre codificado";
  - (b) → los cuatro casos de ADM-1G11 (la causa es el `400` "cursor: no es válido");
  - (c) → `M` "ADM-1G04: …" (solo `cursor`) y `L` "estadoContrario y la consulta de movimientos (ADM-1G14 c: solo cursor)".
- **ADM-1G15** → `E` "ADM-1G15 y ADM-1G20 (b): la segunda página trae solo una fila repetida: se pinta una vez, con una casilla; la cabecera y la barra la cuentan una vez; el lote no la repite; sin aviso de claves; el foco va al h1".
- **ADM-1G16**:
  - (a)–(d) → `E` "ADM-1G16 (a, b, c, d): la primera carga sin q; corto, largo y con el nulo no mandan q; el largo marca el campo; el nulo muestra el vacío sin pedir; «Todos» no manda estadoPago";
  - (e) → `E` "ADM-1G16 (e) con %s: el texto fijo de la tabla, sin aviso ni texto del servidor; editar la búsqueda vuelve a pedir y, con 200, el texto desaparece" (3 filas: q con el nulo, `BUSQUEDA_MUY_CORTA` y "estadoPago: Solo se filtra…"), y las filas (c) de ADM-1G12, con el `estadoPago` real en inglés.
- **ADM-1G17** → `E`:
  - (a, b) → "ADM-1G17 (a, b): la fila pinta el estado del servidor y su botón el contrario; una recarga o la respuesta de restringir con otro estado los cambian";
  - (c) → "ADM-1G17 (c): «Marcar…» en vuelo y una recarga con el otro estado: lo enviado es el contrario al de antes; al asentarse, la fila muestra la última respuesta";
  - (d) y (e) con "repetir el control" → "ADM-1G17 (e) con %s: un solo MensajeError en la fila, sin aviso; repetir el mismo «Marcar…» con 200 lo quita y avisa una vez" (3 filas: 5xx, red y 400 en inglés);
  - (e) en M-23 → "ADM-1G17 (e): un error en una fila y después «Marcar…» en otra: solo el de la segunda si falla, ninguno si sale bien; y «Restablecer» en la misma fila deja solo su mensaje";
  - (f) → "ADM-1G17 (f): con la fila desmontada en vuelo (otra sección), un error avisa una vez; un 401 no avisa; sin errores en la consola" (el `401` lo cubre ADM-1G20 c) y "ADM-1G17 (f): con éxito y la fila desmontada (otro filtro que la saca), el aviso de éxito sale una vez";
  - (g) → "ADM-1G17 (g): dos filas en vuelo a la vez, cada una con su espera" y "ADM-1G01: «Marcar…» de la fila va sin diálogo, con una petición por dos clics…".
- **ADM-1G18** → `E`:
  - (a) → "ADM-1G18 (a): una recarga con otro estado saca la fila elegida de la selección y no vuelve aunque la fila regrese a su estado";
  - (b, e) → "ADM-1G18 (b) y (e): una fila elegida que sale de la lista sale de la selección; cambiar el filtro o la búsqueda la vacía y volver no la recupera";
  - (c) → "ADM-1G02 (d) y ADM-1G18 (c): …";
  - (d) → "ADM-1G18 (d): «Seleccionar los de esta página» con más de 100 filas: «No puedes cambiar más de 100 alumnos a la vez», sin petición";
  - (f) → "ADM-1G18 (f): con un elegido, el aviso es «Estado de pago actualizado», la selección se vacía y el foco va al h1 (la barra ya no se pinta)", "ADM-1G18 (f): un error deja el diálogo abierto con un mensaje y la selección y el destino; repetir con 200 lo quita, cierra y avisa una vez, con los mismos ids" y "ADM-1G18 (f): «Cancelar» del lote devuelve el foco a su botón de la barra";
  - (g) → "ADM-1G18 (g): con la tabla en error, la barra no se pinta; cuando la recarga responde, la selección vigente vuelve a verse".
- **ADM-1G19** → `E`:
  - (a) → "ADM-1G19 (a): restringir abierto con el foco en «%s»; una recarga 200 saca la fila: el diálogo se cierra y el foco va a la raíz" (2 filas: «Cancelar» y "Motivo (opcional)" a medias);
  - (b) → "ADM-1G19 (b): con una recarga 5xx el diálogo de restringir sigue con el foco y el motivo; al cerrarlo con Escape, el foco va al h1";
  - (c) → "ADM-1G19 (c) y ADM-1G20 (d): el lote o restringir abiertos con una recarga 5xx: el diálogo sigue; al cerrarlo con «Cancelar», el foco va al h1";
  - (d) → "ADM-1G19 (d): atrás y adelante del historial con cada diálogo abierto: la vista se desmonta sin errores en la consola ni avisos; al volver, sin diálogo ni selección";
  - (e) → "ADM-1G19 (e): abrir y cerrar cada diálogo varias veces y después cambiar el filtro con el foco en un botón de la vista: el foco no salta a un control de un diálogo cerrado".
  - **Declaración pedida:** con `incluirDialogos` en `false` en `estado-pago-view.tsx`, `npx vitest run src/features/admin/estado-pago-01g.test.tsx -t "ADM-1G19 \(a\)"` → `Tests  2 failed | 73 skipped (75)`, con `expected <body …> not to be <body …>`. Restituido a `true`, verde.
- **ADM-1G20** → `E`:
  - (a) → "ADM-1G20 (a): con el foco en «%s» de una fila, la búsqueda diferida la saca: el foco va a la raíz" (3 filas: marcar, acceso y casilla);
  - (b) → "ADM-1G15 y ADM-1G20 (b): …";
  - (c) → "ADM-1G20 (c): un 401 con el refresco fallido en %s: apiClient lleva al login; ningún mensaje ni aviso y ningún botón en espera" (5 filas: la fila, el lote, restringir, «Restablecer» y «Cargar más alumnos»); «Cargar más movimientos» con `401` no tiene caso propio, aunque aplica el mismo remedio en `movimientos-view.tsx` (ver "Pendiente");
  - (d) → "ADM-1G19 (c) y ADM-1G20 (d): …".
- **ADM-1G21** → `L` "ADM-1G21: las claves sin uso ya no están en data.ts y TEXTOS_MAESTROS.notaProvisional sigue". `lint` y `tsc` en verde.
- **ADM-1G22** → `MA` "ADM-1G09 y ADM-1G22 (E-17): …" y "ADM-1G22 (E-18): la última página sin enlaces nuevos lleva el foco a «Ver registrados» de la primera fila, nunca a <body>".
- **ADM-1G23** → `E`:
  - (a)–(d) → "ADM-1G23 %s: un solo MensajeError en la fila, sin aviso; la fila conserva su estado y el botón sale de la espera" (6 filas);
  - (e) → "ADM-1G23 (e): un 400 y después abrir y cerrar el diálogo de restringir de esa fila (otra fila sin restricción): el mensaje viejo no vuelve". Una fila restringida no ofrece «Restringir», así que el diálogo se abre desde otra fila: la acción vigente cambia igual;
  - (f) → "ADM-1G23 (f): repetir «Restablecer» tras un 5xx: con 200, el mensaje se va, la fila pasa a «Sin restricción» y «Acceso restablecido» sale una vez".
- **ADM-1G24** → `L` "ADM-1G24: sin ids, estadoPagoLoteSchema da exactamente TEXTOS_LOTE.eligeAlMenosUno; con 101 ids distintos, exactamente TEXTOS_LOTE.maximo".
- **ADM-1F24** sigue sin cambios y recorre los cinco accesos (`cuentas-view.test.tsx`, verde en los módulos).

### Matriz de avisos y recargas de 01g (confirmada contra el código)
Definiciones:
- **Reemplaza:** la tabla pasa a `MensajeError` (`role="alert"`), sin aviso.
- **Redirige:** `apiClient` lo resuelve (`401` tras el refresco fallido, `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`). Ninguna vista lo pinta ni avisa (`errorQueRedirigeElCliente`); la tabla se queda con lo que tenía, o en `Cargando` si no tenía nada.
- **Acción vigente (M-23):** solo se pinta el mensaje de acción de la última acción de la persona en la vista.

**`/admin/estado-pago`**

| Disparador | 4xx / VALIDACION | 5xx o red | Redirige | Se renueva | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|---|
| Tabla, primera página | Sin reintento: reemplaza con `TEXTOS_ESTADO_PAGO.error`; "cursor:" con la frase de lista cambiada | Un reintento; después, el mismo texto | Sin texto | Pulsar «Estado de pago» (con la tabla en error: vacía la selección y pide desde la primera página); dejar la clave o desmontar la marca vieja si quedó en error; editar la búsqueda o el filtro pide otra clave | Si desaparece el control que tenía el foco (también dentro de un diálogo), a la raíz | Una consulta por clave | Marcada vieja si quedó en error |
| «Cargar más alumnos» | `400` del cursor: la frase de lista cambiada; otro `400`: el texto de error. Reemplaza, sin aviso | Reemplaza, sin aviso (como 01c y D-7 de 01f) | Sin texto; se queda la tabla | Los caminos de arriba | Botón desaparecido con el foco: la primera casilla nueva o, sin filas nuevas, el `h1` | Ref, `isFetching` y `cancelRefetch: false`: una petición | — |
| «Marcar…» de la fila (`cambiar`, de 01f) | Un `MensajeError` en la fila, solo si es la vigente (genérico para `estadoPago`) | Igual | Sin texto | Éxito: la ficha (`setQueryData`), las listas y el resumen; aviso "Estado de pago actualizado" | Se queda en el botón (el mismo elemento cambia de texto); si la fila sale, a la raíz | Una por fila (ref); varias filas a la vez, cada una con su espera; con dos fallos, solo el de la última pulsada | El gancho avisa el error una vez (salvo si redirige); el éxito avisa igual |
| «Restablecer» de la fila (`restablecerAcceso`, de 01f) | Un `MensajeError` en la fila, solo si es la vigente (genérico para `restringido`) | Igual | Sin texto | Éxito: la ficha, las listas y el resumen; aviso "Acceso restablecido" | Se queda en el botón de acceso, que pasa a «Restringir» | Ref | Como «Marcar…» |
| Diálogo del lote (`cambiarLote`) | Un `MensajeError` en el diálogo, que sigue abierto con la selección y el destino; rechazo local con 0 o con más de 100 (los textos de `shared/`, sin petición) | Igual | Sin texto | Éxito: listas, fichas y resumen; aviso con N; la selección se vacía | Cancelar o Escape: su botón de la barra o, si ya no está, el `h1`. Éxito: la barra o el `h1` | Ref; no se cierra en vuelo | Con el diálogo desmontado (historial), el gancho avisa el error una vez |
| Diálogo de restringir (01f, montado por la vista) | Como en 01f: un `MensajeError` en el diálogo | Igual | Sin texto | Éxito: ficha, listas y resumen; aviso "Acceso restringido" | Cancelar: «Restringir» de su fila o, si ya no está, el `h1`. Éxito: «Restablecer» de la fila cuando la lista ya lo trae; si la fila sale, la raíz | Ref | Un `200` que saca la fila lo cierra (foco a la raíz); un `5xx` no lo cierra |
| Tabla en error con un diálogo abierto | El diálogo sigue; el texto de carga queda en su lugar, inerte detrás del modal. Si falla la acción del diálogo: dos `role="alert"` en el documento y uno accesible, el del diálogo | | | | Al cerrarlo, el `h1` | | |

**`/admin/movimientos`**

| Disparador | Error | Se renueva | Foco |
|---|---|---|---|
| Lista y «Cargar más movimientos» | `400` del cursor: la frase de lista cambiada; otro error (`4xx` sin reintento, `5xx` con uno): `TEXTOS_MOVIMIENTOS.error`. Reemplazan, sin aviso; un error que redirige no se pinta | Pulsar «Movimientos», ir y volver, o el historial | Al cargar la última página con el foco en el botón, el `h1` (las filas no tienen controles) |

**`/admin/maestros`**

| Disparador | Comportamiento |
|---|---|
| "Cargar más enlaces" y "Cargar más" de registrados | Como antes en sus errores. Ahora con ref, `isFetching` y `cancelRefetch: false` (E-07); el foco, E-18 |
| «Sí, revocar» (E-01) | El error sale al abrir o al cerrar la confirmación (salvo en vuelo) |
| Los tres formularios | Una petición por dos clics (ref antes de la guarda `isPending`) |

### Frases de recuperación y sus caminos (cada uno con su caso)
- **"No pudimos cargar los alumnos. …"** (ADM-1G12):
  - pulsar «Estado de pago» (a);
  - ir a otra sección y volver (b);
  - el historial (d);
  - el filtro que se deja con su clave en error y se retoma (c): en la primera carga con `5xx` y con un `400` en inglés, y en una recarga con datos;
  - editar el término (ADM-1G16 e).
- **"La lista cambió mientras la veías. …" en `/admin/estado-pago`** (ADM-1G11 y ADM-1G14 b), en todos con la selección vaciada:
  - pulsar «Estado de pago» (a);
  - ir y volver (b);
  - el filtro (c);
  - el historial (d).
- **`/admin/movimientos`**, con la frase de lista cambiada y con la de error de carga (ADM-1G04 y ADM-1G12): (a), (b) y (d). No tiene filtro.

### Hermanos y estados vecinos de cada mecanismo
- **Criterio de T-01 (nada local inicializado con datos del servidor)** (ADM-1G17 y ADM-1G18):
  - La fila deriva la insignia, el botón de «Marcar…» y el botón de acceso en cada render.
  - La selección guarda la elección con el estado de cada fila al elegirla y se recorta en el render.
  - El destino del lote vive en el estado del diálogo.
  - El diálogo de restringir recibe la fila de la consulta en cada render.
  - Estados vecinos, cada uno con su caso:
    - una elección propia frente a una respuesta con otro estado;
    - una recarga;
    - la respuesta de otra acción (restringir);
    - el éxito y el error;
    - el desmontaje en vuelo, con éxito y con error;
    - dos filas en vuelo a la vez;
    - una fila que sale de la lista.
  - Ningún otro estado local nuevo viene del servidor: la barra y las tablas son de solo props.
- **`incluirDialogos`** (ADM-1G19, ADM-1G20 d):
  - Estados vecinos:
    - el foco en «Cancelar» y en el motivo a medias;
    - una recarga `200` que saca la fila (a la raíz);
    - una recarga `5xx` (el diálogo sigue; al cerrarlo, al `h1`);
    - el lote con un `5xx`;
    - atrás y adelante (la vista se desmonta);
    - abrir y cerrar varias veces y después cambiar el filtro (el foco no salta).
  - El parámetro en `false` hace caer (a).
  - La tabla de `/admin/movimientos` no tiene diálogos.
- **La acción vigente** (ADM-1G01b e y su hermano, ADM-1G17 e, ADM-1G23 e, M-25):
  - otra fila;
  - la misma fila con otro botón;
  - abrir el lote;
  - abrir restringir;
  - cerrar el diálogo (el mensaje viejo no vuelve);
  - la tabla en error.
- **Ref y una petición por dos clics:** las dos acciones de la fila, el lote, «Cargar más alumnos», «Cargar más movimientos», «Cargar más enlaces», «Cargar más» de registrados y los tres formularios (ADM-1G05).
- **Errores que redirigen:** no se pintan en la fila, el lote, restringir, «Restablecer», la tabla de alumnos ni la de movimientos. **Hermano en 01f (R-23, fuera de "Se toca" de 01g):** `usuarios-view.tsx`, `usuario-view.tsx` e `inicio-admin-view.tsx` pintan su texto de error de carga ante un `401` tras el refresco fallido, aunque `apiClient` ya lleva al login. En 01g no lo toco. No lo ataca ningún caso de hoy: los cuatro casos integrados de 01f siguen en verde. Lo dejo como observación para el manager y el humano (R-23).
- **E-01:** «Sí, revocar» (ADM-1G06) se suma a la confirmación de restablecer de la ficha (01f), con el mismo criterio. No hay otra confirmación en línea en `features/admin`.
- **E-14:** `EnlaceNuevo` se suma a `ContrasenaTemporal` (E-27 de 01f). No hay otro `role="status"` que envuelva un botón en `features/admin`.

### Desviaciones del plan
- **D-1 (aclaración, no cambia el comportamiento).** Para que se cumplan ADM-1G20 (c) y la fila "401" de la matriz, la tabla de alumnos y la de movimientos no pintan su texto de error ante un error que redirige: se quedan con lo que había. La matriz de 01g ya lo pedía; lo declaro porque es una rama nueva en las dos vistas.
- **D-2 (pruebas).** Algunos casos de `estado-pago-01g.test.tsx` usan su propio `QueryClient` con la configuración de `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`) en lugar de `Providers`. Así pueden simular "otro admin cambió la cuenta" con `invalidateQueries`. `movimientos-01g` y `maestros-01g` usan `Providers`.
- Ningún texto fuera de §D-12, T-E14 o el código: los cotejé contra la lista de la Enmienda 15. El nombre accesible de los botones de fila se compone de esos textos y el nombre del alumno, como `accionSobre` de 01c.

### Pendiente o fuera de alcance
- R-23: el hermano de "errores que redirigen" en las vistas de 01f (arriba).
- «Cargar más movimientos» con un `401` no tiene caso propio; el remedio es el mismo de la tabla de alumnos, que sí lo tiene.
- `DESIGN.md` (A-04, al cierre, a cargo del orquestador): la tabla con selección múltiple y la barra de lote (§7.9), y la casilla nativa con `accent-primary` (no hay un componente de casilla en `components/ui/`).

## ADMIN-01g — Corrección de la verificación (2026-11-09)

Responde a `revision.md`, "## Verificación del resumen — ADMIN-01g — implementación" (línea 7506): M-26 y M-27. Ya estaban aceptados D-1, D-2, ADM-1G03 y la casilla nativa con `accent-primary`. No toqué `components/layout/lib.ts` ni `app/providers.tsx` (N-01g-1 y N-01g-2 quedan para el cierre) ni ningún `*.ataque`. Sin commit ni navegadores; una corrida después de otra (nadie más corre suites, dato del orquestador).

### Hallazgos
- **M-26: corregido, sin PARADA.**
  - En `features/admin/components/tabla-estado-pago.tsx`, la etiqueta que envuelve cada casilla (la de la fila y la de la cabecera) pasa de `inline-flex items-center` a `inline-flex size-(--control-height) cursor-pointer items-center justify-center`.
  - El área pulsable mide 44 × 44 px y, desde 768 px en el contexto denso del administrador, 36 × 36 px (`styles/tokens.css:70` y `:93-98`), como pide `DESIGN.md` §6.
  - Es el mismo mecanismo que `size-(--control-height)` de `button-variants.ts` (`icon`) y `barra-superior.tsx:40`: una variable CSS, sin corchetes. La regla de valores arbitrarios de `components/layout/estatico-r1` no la cuenta, V-06 y V-07 no la tocan, y las tres siguen en verde.
  - La casilla se sigue viendo de 16 px (`size-4`). El nombre accesible sigue saliendo del texto `sr-only`, sin `aria-label`.
- **Hermanos de M-26 (controles nuevos de 01g por debajo del mínimo):**
  - **«Marcar…» y el botón de acceso («Restringir» o «Restablecer») de la fila:** iban con `size="sm"` (`h-9`, 36 px también por debajo de 768 px). **Aplicado:** pasan al tamaño por omisión (`h-(--control-height)`).
  - **«Marcar como deudores» y «Marcar al corriente» de la barra de lote:** también `size="sm"`. **Aplicado:** tamaño por omisión.
  - **Revisados sin cambio:**
    - «Cargar más alumnos» y «Cargar más movimientos», tamaño por omisión;
    - el buscador y el filtro (`Input` y `NativeSelect`, `h-(--control-height)`);
    - «Sí, cambiar» y «Cancelar» del diálogo del lote, tamaño por omisión;
    - el diálogo de restringir, de 01f, sin cambio.
  - **`/admin/movimientos`:** solo tiene «Cargar más movimientos»; sus filas no tienen controles.
  - **Fuera de los controles nuevos (observación, sin cambio):**
    - los botones de fila de `tabla-enlaces.tsx` («Ver registrados», «Revocar», «Sí, revocar» y «Cancelar»; existían antes de 01g y van con `size="sm"`). 01g los toca solo por E-01 y E-18; cambiar su tamaño queda fuera de lo pedido;
    - lo mismo en `tabla-clases-admin.tsx` de 01c, que no está en "Se toca".
    Los dejo para el cierre.
- **M-27: corregido.** `features/admin/movimientos-01g.test.tsx` suma dos casos y un control del refresco fallido en su doble (`refrescoFalla`):
  - "ADM-1G20 (c): un 401 con el refresco fallido en «Cargar más movimientos»: lleva al login; ningún mensaje ni aviso y ningún botón en espera";
  - "ADM-1G20 (c), estado vecino: un 401 con el refresco fallido en la primera carga: lleva al login; ningún mensaje ni aviso".
  - Sin la guarda de `errorQueRedirigeElCliente` en `movimientos-view.tsx`, los dos caen: `npx vitest run src/features/admin/movimientos-01g.test.tsx -t "401"` → `Tests  2 failed | 8 skipped (10)`. Con la guarda, verdes. El código de la vista no cambió en esta vuelta.
- **Casos de M-26** en `features/admin/estado-pago-01g.test.tsx`:
  - "M-26: la etiqueta de cada casilla (la de la fila y la de la cabecera) mide un control; el nombre sigue saliendo del texto sr-only, sin aria-label";
  - "M-26: los botones de la fila y de la barra de lote tienen el tamaño de un control (no el pequeño)", que comprueba `data-size="default"` en «Marcar…», el de acceso y los dos de la barra.
  - jsdom no calcula tamaños; las dos pruebas comprueban la clase y la variante. La medida real (36 y 44 px) entra en la comprobación humana H-6, a 360 px.

### Archivos de esta vuelta
- **Producción:**
  - `frontend/src/features/admin/components/tabla-estado-pago.tsx` (las dos etiquetas, los dos botones y el comentario);
  - `frontend/src/features/admin/components/barra-de-lote.tsx` (los dos botones).
  
  Los dos están en "Se toca".
- **Pruebas (nuevas de 01g):** `frontend/src/features/admin/estado-pago-01g.test.tsx` (+2) y `frontend/src/features/admin/movimientos-01g.test.tsx` (+2, y el refresco fallido en el doble).

### Verificación (comando exacto y última línea; desde `frontend/`)
- **lint:** `npm run lint` → exit 0; última línea `> tsc -b`.
- **build:** `npm run build` → exit 0; última línea `✓ built in 836ms`.
- **Módulos:** `npx vitest run src/features/admin src/components/layout` → `Tests  1177 passed (1177)` (`Test Files  34 passed (34)`).
- **Las 26 rutas de C-n y vigiladas** (las mismas de la implementación) → `Tests  645 passed (645)` (`Test Files  26 passed (26)`).

### Conteos (`npx vitest list <archivo> | grep -ac ' > '`)
- `estado-pago-01g.test.tsx`: 77 (antes 75).
- `movimientos-01g.test.tsx`: 10 (antes 8).
- Módulos: de 1173 a 1177.

### Matriz y desviaciones
- La matriz no cambia. Ninguna desviación nueva.

## ADMIN-01g — Corrección ronda 1 (2026-11-09)

Respondo a `reporte-tester.md`, "## Ronda 1 — ADMIN-01g" (línea 6111): ROTO con T-01, T-02 y T-03, y las observaciones O-01g-r1-1 y O-01g-r1-2. Es la ronda 1 de 3.
- No toqué las pruebas del tester: `features/admin/usuarios-01g-r1.ataque.test.tsx`, `maestros-01g-r1.ataque.test.tsx`, `estado-pago-01g-r1.ataque.test.tsx` y `components/layout/barra-01g-r1.ataque.test.tsx`.
- Sin commit ni navegadores. Una corrida después de otra; nadie más corría suites (dato del orquestador).

### Hallazgos
- **T-01: corregido**, con la autorización del humano del 2026-11-09 ("Autorizo") para tocar tres archivos de 01f **solo** para esto.
  - `features/admin/usuarios-view.tsx`, `usuario-view.tsx` e `inicio-admin-view.tsx` ya no pintan su texto de error de carga cuando `errorQueRedirigeElCliente(<consulta>.error)`, como D-1 de 01g. Se queda lo que había: la tabla, si ya tenía datos; si no, `Cargando`.
  - En la ficha, el mismo filtro va antes de "Esa cuenta ya no existe.".
  - En los tres archivos no cambia nada más: el `import` de `errorQueRedirigeElCliente`, la condición y su comentario.
  - Caso nuevo por pantalla, en `features/admin/redirige-01g.test.tsx`:
    - "T-01: un 401 con el refresco fallido en la primera carga de /admin/usuarios: ningún mensaje";
    - "T-01: un 401 con el refresco fallido en «Cargar más usuarios»: ningún mensaje, la tabla se queda y nada en espera";
    - "T-01: un 401 con el refresco fallido al abrir la ficha: ningún mensaje (tampoco «Esa cuenta ya no existe.»)";
    - "T-01: un 401 con el refresco fallido en el resumen de /admin: ningún mensaje y los accesos siguen".
  - ATQ-1G27 a ATQ-1G30, del tester, en verde.
- **T-02: corregido.** `features/admin/components/tabla-enlaces.tsx`:
  - La raíz de la tabla (`tablaRef`) queda montada en todos sus estados (error, carga, vacío y lista), con `tabIndex={-1}`.
  - El destino de "sin enlaces nuevos" de `useFocoAlCargarMas` es «Ver registrados» de la primera fila y, si ya no hay filas (el `5xx` las reemplazó por su `MensajeError`), esa raíz.
  - Caso: `maestros-01g.test.tsx` "T-02: «Cargar más enlaces» con un 5xx en la página siguiente: la lista pasa a su error y el foco va a la raíz de la tabla, nunca a <body>". ATQ-1G24, en verde.
- **T-03: corregido.**
  - `features/admin/components/registrados-del-enlace.tsx` usa `useFocoAlCargarMas`. Sus filas no tienen controles, así que el destino es el botón de su fila que abrió la lista («Ocultar registrados» cuando está abierta). `tabla-enlaces.tsx` se lo pasa por una prop nueva, `destinoDelFocoRef` (los dos archivos están en "Se toca").
  - Casos: `maestros-01g.test.tsx` "T-03: «Cargar más» de registrados con el foco y %s: el foco va a «Ocultar registrados» de su enlace, nunca a <body>", con 2 filas: "la última página" y "un 5xx en la página siguiente". ATQ-1G25, en verde.
- **O-01g-r1-1: corregido.** El título de ADM-1G17 (f) en `estado-pago-01g.test.tsx` pasa a "ADM-1G17 (f): con la fila desmontada en vuelo (otra sección), un error avisa una vez; sin errores en la consola". El `401` lo cubren ADM-1G20 (c) y ATQ-1G19 y ATQ-1G20.
- **O-01g-r1-2: decidido y declarado, sin texto nuevo.** Con «Restablecer» en vuelo, una recarga que trae la fila sin restricción cambia el texto del botón a «Restringir», porque el botón deriva del servidor (criterio de T-01). Pero el botón sigue en espera hasta que el `PUT` se asiente:
  - `enEspera={restablecerAcceso.isPending}`, ya sin la condición `restringido &&`; V-06 sigue en 90;
  - la guarda con ref pasa antes de la rama de restringir.
  - Así no se abre el diálogo de restringir con un `PUT` contrario en vuelo; al asentarse, el botón vuelve a abrirlo.
  - Caso: `estado-pago-01g.test.tsx` "O-01g-r1-2: el botón pasa a «Restringir» en espera; pulsarlo no abre el diálogo hasta que el PUT responde".

### Hermanos y estados vecinos
- **Cada «Cargar más» de 01g y de los tres archivos autorizados:**
  - **«Cargar más alumnos»** (`estado-pago-view.tsx`):
    - la última página con filas nuevas va a la primera casilla nueva (ADM-1F18 y ADM-1G14 a);
    - sin filas nuevas o solo con repetidas, al `h1` (ADM-1G20 b);
    - con `5xx`, la tabla pasa a su error y el foco va al `h1` (lo prueban los casos de la lista cambiada y de error de carga);
    - con `401`, ningún mensaje (ADM-1G20 c);
    - dos clics, una petición (ADM-1G14 a);
    - con una recarga en vuelo, en espera por `isFetching`.
    
    Sin cambio.
  - **«Cargar más movimientos»** (`movimientos-view.tsx`): las filas no tienen controles, así que siempre va al `h1`, también con `5xx`. Con `401`, ningún mensaje (M-27); dos clics, una petición (ADM-1G04). Sin cambio.
  - **«Cargar más enlaces»** (`tabla-enlaces.tsx`):
    - con enlaces nuevos, al primero (ADM-1G10);
    - sin nuevos, a la primera fila (ADM-1G22);
    - **solo repetidos:** se apareció un hermano, ver abajo;
    - **con `5xx`:** a la raíz de la tabla (T-02, corregido);
    - **con `401`:** hermano de D-1, ver abajo;
    - con una recarga en vuelo, ATQ-1G23 en verde;
    - dos clics, ADM-1G05.
  - **«Cargar más» de registrados** (`registrados-del-enlace.tsx`):
    - la última página y el `5xx`: corregido (T-03);
    - **solo repetidos:** ver abajo;
    - **con `401`:** ver abajo;
    - dos clics: ADM-1G05.
  - **«Cargar más usuarios»** (`usuarios-view.tsx`, 01f, autorizado solo para T-01):
    - con `401`, ningún mensaje (T-01);
    - la última página, solo repetidas (ADM-1F19) y `5xx`: van al primer «Ver» nuevo o al `h1` con `useFocoAlCargarMas`, que ya tenía. Sin otro cambio.
- **Hermano que apareció al probar "solo repetidos" en los enlaces: aplicado.** `TablaEnlaces` y `RegistradosDelEnlace` unían sus páginas con `flatMap`. Si la página siguiente repetía un enlace o un registrado (R-19), se pintaba dos veces, con la misma `key` de React y con dos «Ver registrados» del mismo nombre. Ahora las dos listas usan `unirPaginasSinRepetidas` (`lib/unir-paginas.ts`, como las demás listas de ADMIN-01).
  - Caso: `maestros-01g.test.tsx` "T-02 (estado vecino): una última página solo con enlaces repetidos lleva el foco a «Ver registrados» de la primera fila".
  - Los dos archivos están en "Se toca".
- **Cada vista con un error que redirige** (`errorQueRedirigeElCliente`, con lo que había o `Cargando`):
  - `/admin/estado-pago` y `/admin/movimientos` (D-1 de 01g);
  - `/admin/usuarios`, la ficha y `/admin`, el resumen (T-01, ahora);
  - **también** `TablaEnlaces` y `RegistradosDelEnlace` de `/admin/maestros`, que pintaban `mensajeDeConsultaAdmin(...)` ante un `401`: aplicado aquí, en los dos archivos de "Se toca". Un `401` de una mutación no se pinta en ninguna mutación nueva de 01f ni de 01g (ya lo filtraban).
  - Los casos de `401` de `/admin/maestros` no tienen prueba propia: el remedio es el mismo que el de `redirige-01g.test.tsx`.
- **Archivos fuera de "Se toca" y de los tres autorizados:** ningún hermano los exige. Sin PARADA.

### Archivos de esta vuelta
- **Producción:**
  - `features/admin/components/tabla-enlaces.tsx` (T-02, la raíz y su destino, el `ref` del botón de expandir, `unirPaginasSinRepetidas` y el `401`);
  - `features/admin/components/registrados-del-enlace.tsx` (T-03, `unirPaginasSinRepetidas` y el `401`);
  - `features/admin/components/tabla-estado-pago.tsx` (O-01g-r1-2).
  - Autorizados solo para T-01: `features/admin/usuarios-view.tsx`, `usuario-view.tsx` e `inicio-admin-view.tsx`.
- **Pruebas:**
  - nueva, `features/admin/redirige-01g.test.tsx` (4);
  - `features/admin/maestros-01g.test.tsx`: +4;
  - `features/admin/estado-pago-01g.test.tsx`: +1 y un título corregido.
- Un tropiezo propio, corregido antes de la corrida final: escribí la palabra «Ocultar» en un comentario y V-17 (`components/layout/estatico-r1`) la prohíbe en cualquier `.tsx`. La quité.

### Verificación (comando exacto y última línea; desde `frontend/`)
- **lint:** `npm run lint` → exit 0; última línea `> tsc -b`.
- **build:** `npm run build` → última línea `✓ built in 836ms`.
- **Módulos:** `npx vitest run src/features/admin src/components/layout` → `Tests  1255 passed (1255)` (`Test Files  39 passed (39)`). Incluye las cuatro pruebas del tester y los casos de 01f.
- **Las cuatro del tester:** `npx vitest run src/features/admin/usuarios-01g-r1.ataque.test.tsx src/features/admin/maestros-01g-r1.ataque.test.tsx src/features/admin/estado-pago-01g-r1.ataque.test.tsx src/components/layout/barra-01g-r1.ataque.test.tsx` → `Tests  69 passed (69)`.
- **Las 26 rutas de C-n y vigiladas** (las mismas de la implementación): `Tests  645 passed (645)` (`Test Files  26 passed (26)`).

### Conteos (`npx vitest list <archivo> | grep -ac ' > '`)
- `maestros-01g.test.tsx`: 11 (antes 7).
- `redirige-01g.test.tsx`: 4 (nuevo).
- `estado-pago-01g.test.tsx`: 78 (antes 77).

### Matriz: filas que cambian
- **"Cargar más enlaces" y de registrados** (antes "E-18: primer enlace nuevo, nunca `<body>`"):
  - "Cargar más enlaces": el primer enlace nuevo; sin nuevos, «Ver registrados» de la primera fila; con un error que reemplaza la lista, la raíz de la tabla.
  - "Cargar más" de registrados: el botón de su enlace que abrió la lista, también con un error.
  - Las dos listas sin filas repetidas. Un `401` no se pinta.
- **Tabla de usuarios, ficha y resumen de 01f:** "redirige" ya no pinta su texto de error de carga.
- **«Restablecer» de la fila:** con su `PUT` en vuelo, el botón de acceso sigue en espera aunque una recarga cambie su texto a «Restringir».

### Desviaciones
Ninguna fuera de lo autorizado (T-01). O-01g-r1-2 queda declarado arriba como decisión dentro del criterio de T-01.

## ADMIN-01g — Corrección ronda 2 (2026-11-09)

Respondo a `reporte-tester.md`, "## Ronda 2 — ADMIN-01g" (línea 6301), ROTO con T-04, T-05 y T-06, y al arbitraje del manager: `revision.md`, "## Arbitraje de la ronda 2 — ADMIN-01g" (línea 7844), que leí completo. Es la corrección 2 de 3.
- **Archivos de producción:** solo `features/admin/hooks.ts`, `components/tabla-enlaces.tsx` y `components/registrados-del-enlace.tsx`, los tres que permite esta ronda. No toqué `maestros-view.tsx` ni otro archivo de producción.
- **Pruebas:** no toqué ninguna `*.ataque` (las de las rondas 1 y 2 del tester incluidas) ni ninguna vigilada.
- Sin commit ni navegadores.
- **Declaración sobre las corridas:** en esta vuelta corrí una vez las siete `*.ataque` mientras la corrida de los módulos seguía en segundo plano (la herramienta la mandó ahí a los 180 s y lancé la siguiente sin esperar su aviso). Eran dos suites mías, a la vez. Las cifras que reporto abajo salen de corridas posteriores, hechas una después de otra; las de esa vuelta las descarté. Esa corrida de los módulos fue la que mostró el defecto que explico en "Desviación" (56 rojos).

### Hallazgos
- **T-04: corregido.** En `features/admin/hooks.ts`, `useEnlacesRegistro` y `useRegistradosDelEnlace` ganan `retry: reintentarConsultaAdmin`: un `4xx`, incluido el `401` sin sesión, no se reintenta y un `5xx`, una vez, como las demás consultas del módulo.
  - **Grep de toda consulta de `features/admin/hooks.ts`** (`useQuery(` y `useInfiniteQuery(`): son siete, y las siete tienen ahora el reintento del módulo:
    - `useEnlacesRegistro` (nuevo en esta ronda);
    - `useRegistradosDelEnlace` (nuevo en esta ronda);
    - `useResumenAdmin`, `useUsuariosAdmin`, `useUsuario`, `useAlumnosEstadoPago` y `useMovimientos` (ya lo tenían).
  - Las mutaciones no reintentan: no aplica.
  - Las claves de las dos listas pasan a constantes exportadas de `hooks.ts`, junto a sus consultas: `CLAVE_ENLACES_REGISTRO` y `claveRegistradosDelEnlace`. Lo hice así porque `data.ts` no está entre los tres archivos de esta ronda; los componentes de abajo las usan.
- **T-05: corregido.** `tabla-enlaces.tsx` usa `useFocoAlPerderseElControl(tablaRef, claveDeFocoDeLaConsulta("enlaces-registro", enlaces))` sobre la raíz que ya existía (`tabIndex={-1}`, de T-02).
  - **Orden declarado:** va después de `useFocoAlCargarMas`, que decide antes cuando el control que desaparece es «Cargar más enlaces» (como en `usuarios-view.tsx`).
  - Los controles de las listas de registrados viven dentro de la raíz y no son portales, así que no lleva `incluirDialogos`.
- **T-06: corregido**, sin tocar `maestros-view.tsx`.
  - En `tabla-enlaces.tsx`: con la lista en error, pulsar «Maestros» estando ahí la vuelve a pedir desde la primera página; con la lista sana, no pide nada (`useVolverAPedirSiFallo(CLAVE_ENLACES_REGISTRO)` con `useAlPulsarLaSeccionActiva`).
  - Además, `useMarcarViejaSiQuedoEnError(CLAVE_ENLACES_REGISTRO)`, como las demás tablas. No es redundante: hace que ir a otra sección y volver antes del `staleTime` pida la clave que quedó en error, también la de una recarga con datos.
  - **Hermano, aplicado:** `registrados-del-enlace.tsx`, con su clave. Con la lista abierta y en error, pulsar «Maestros» la vuelve a pedir; ocultarla y volver a verla también.

### Desviación (con su porqué; no amplía el alcance)
- El gancho `useAlPulsarLaSeccionActiva` lee la `location` del router.
- `features/admin/maestros-view.test.tsx`, `maestros-03b-r1.ataque.test.tsx` y `maestros-03c-r1.ataque.test.tsx` montan `MaestrosView` sin router. Las dos `*.ataque` y la normal son vigiladas.
- Puse el gancho directo en los componentes y esa corrida de los módulos dio 56 rojos en esos tres archivos, todos por `useLocation` fuera de un router.
- **Remedio, en los mismos dos archivos:**
  - el gancho vive en un componente que no pinta nada, `AlPulsarLaSeccionActiva` (exportado de `registrados-del-enlace.tsx`, que ya importaba `tabla-enlaces.tsx`);
  - las dos listas lo montan solo si `useInRouterContext()` es verdadero (`react-router`).
- En la aplicación siempre hay router, así que el camino funciona igual; las vigiladas no cambian y vuelven a verde.
- Tropecé de nuevo con V-17: escribí «Ocultar» en un comentario y lo quité antes de las corridas finales.

### Hermanos y estados vecinos (uno por uno)
Las pruebas nuevas están en `src/features/admin/maestros-recargas-01g.test.tsx` (14 casos). Cada caso se cita con su título exacto.

**T-04: el reintento del módulo en las consultas de `/admin/maestros`.**
- **«Cargar más enlaces» con `401`:** aplica y aplicado.
  - Caso: "T-04: un 401 con el refresco fallido en «Cargar más enlaces»: sale de la espera, sin mensaje ni aviso, y no sale otra petición".
  - Del tester: ATQ-1G37 (fila 2) y ATQ-1G47 (fila 1).
- **«Cargar más» de registrados con `401`:** aplica y aplicado.
  - Caso: "T-04: un 401 con el refresco fallido en «Cargar más» de registrados: sale de la espera, sin mensaje, y no sale otra petición".
  - Del tester: ATQ-1G37 (fila 4) y ATQ-1G47 (fila 2).
- **Primera carga de enlaces con `401`:** aplica y aplicado.
  - Caso: "T-04 (estado vecino): un 401 con el refresco fallido en la primera carga de la lista: una sola petición, sin mensaje".
  - Del tester: ATQ-1G37 (fila 1).
- **Primera página de registrados con `401`:** aplica y aplicado. Del tester: ATQ-1G37 (fila 3).
- **`5xx` en las dos listas:** sigue con un reintento; sin cambio de comportamiento. Lo cubren los casos de T-06 y las pruebas de rondas anteriores, en verde.
- **Las otras cinco consultas del módulo:** ya tenían el reintento (grep de arriba). No aplica.

**T-05: el foco cuando una recarga cambia la tabla de enlaces.**

Estados del mecanismo:
- **Recarga que falla con el foco en «Revocar»:** aplicado.
  - Caso: "T-05: con el foco en «Revocar», una recarga que falla reemplaza la tabla: el foco va a la raíz de la tabla".
- **Lo mismo con `<StrictMode>`:** aplicado.
  - Caso: "T-05 con <StrictMode>: con el foco en «Revocar», una recarga que falla lleva el foco a la raíz".
- **Recarga que falla con el foco en «Ver registrados»:** aplicado.
  - Caso: "T-05: con el foco en «Ver registrados», una recarga que falla reemplaza la tabla: el foco va a la raíz de la tabla".
- **Recarga que falla con el foco en el botón que oculta los registrados de su fila:** aplicado.
  - Caso: "T-05: con el foco en «Ocultar registrados», una recarga que falla reemplaza la tabla: el foco va a la raíz".
  - Del tester: ATQ-1G42 (fila 2).
- **Recarga que falla con el foco en «Cargar más» de registrados:** aplicado. Del tester: ATQ-1G42 (fila 1).
- **Tras «Sí, revocar»** (el foco vuelve a «Revocar») **y una recarga que falla:** aplicado.
  - Caso: "T-05: tras «Sí, revocar» (el foco vuelve a «Revocar») y una recarga que falla, el foco va a la raíz, nunca a <body>".
  - Del tester: ATQ-1G48.
- **Recarga `200` que quita la fila con el foco:** aplicado.
  - Caso: "T-05: una recarga 200 que quita la fila con el foco en su «Ver registrados» (otra persona la quitó) lleva el foco a la raíz".
- **Control: recarga `200` que conserva la fila:** el foco no se mueve.
  - Caso: "T-05 (control): una recarga 200 con la fila todavía en la lista no mueve el foco de «Ver registrados»".
- **La página siguiente que falla con el foco en «Cargar más enlaces»:** la resuelve `useFocoAlCargarMas`, declarado antes.
  - Lleva el foco a «Ver registrados» de la primera fila o, si no la hay, a la raíz.
  - Sin cambio en esta ronda. Lo siguen cubriendo `maestros-01g-r1.ataque.test.tsx` y `maestros-01g.test.tsx`, en verde con los dos ganchos montados.

Hermanos del gancho de foco:
- **`usuarios-view.tsx`, `usuario-view.tsx` y `estado-pago-view.tsx`:** ya lo tienen. Sin cambio.
- **`registrados-del-enlace.tsx`:** sin gancho propio.
  - Sus controles viven dentro de la raíz de `tabla-enlaces`, que lo monta, así que su reemplazo queda cubierto (ATQ-1G42).
  - Su «Cargar más» usa `useFocoAlCargarMas` hacia «Ver registrados» de su fila.
- **`movimientos-view.tsx`:** no aplica.
  - La tabla de movimientos no tiene controles por fila.
  - El único control que una recarga puede quitar es «Cargar más», que ya resuelve `useFocoAlCargarMas`, hacia el encabezado con `tabIndex={-1}`.
- **`inicio-admin-view.tsx`:** no aplica.
  - Lo que cambia con la consulta (las cifras o su `MensajeError`) no tiene controles.
  - Los accesos no dependen del resumen.

**T-06: pulsar «Maestros» estando ahí, o regresar a la sección.**
- **`5xx` de la primera carga de enlaces:** aplicado.
  - Caso: "T-06: tras el 5xx de la primera carga, pulsar «Maestros» vuelve a pedir la lista y el texto desaparece".
- **`5xx` de «Cargar más enlaces»:** aplicado.
  - Caso: "T-06: tras el 5xx de «Cargar más enlaces», pulsar «Maestros» vuelve a pedir la lista desde la primera página y el texto desaparece".
  - Del tester: ATQ-1G38.
- **Control con la lista sana:** no pide nada.
  - Caso: "T-06 (control): con la lista sana, pulsar «Maestros» no pide nada".
- **Hermano: lista de registrados abierta, en error y sana:** aplicado.
  - Caso: "T-06, hermano: con la lista de registrados abierta y en error, pulsar «Maestros» la vuelve a pedir y el texto desaparece; sana, no".
- **Ir a otra sección y regresar antes del `staleTime`:** aplicado con `useMarcarViejaSiQuedoEnError` en las dos listas, el mismo gancho que ya prueban las demás tablas del módulo.
  - **No cubierto por un caso propio de `/admin/maestros`:** lo declaro.
- **`401`:** no pinta texto, así que no hay nada que recuperar. No aplica.
- **Las demás vistas del módulo:** ya tienen el par de ganchos. Sin cambio.

### Matriz de avisos y recargas de `/admin/maestros`, al día
Cambian solo las dos listas. El resto queda como en la corrección de la ronda 1.

| Disparador | Error | Qué se renueva | Qué se anuncia | Foco |
|---|---|---|---|---|
| Primera carga de enlaces | `5xx` o red | Un reintento. Pulsar «Maestros», o ir y volver, la vuelve a pedir | Un `MensajeError` en la raíz | Si un control de la tabla tenía el foco, va a la raíz |
| Primera carga de enlaces | `401` (redirige) | Nada, sin reintento | Nada | Lo lleva la redirección |
| «Cargar más enlaces» | `5xx` o red | Un reintento. «Maestros» la vuelve a pedir desde la primera página | Un solo mensaje | `useFocoAlCargarMas`; si se pierde otro control, la raíz |
| «Cargar más enlaces» | `401` | Nada: sale de la espera y no hay segunda petición | Nada | Sin cambio |
| Recarga de enlaces (invalidación) | `5xx` | Reemplaza la tabla por el mensaje | Un solo mensaje | La raíz de la tabla, nunca `<body>` (también con `<StrictMode>`) |
| Recarga `200` que quita la fila con el foco | — | La lista | Nada | La raíz |
| Registrados, primera página | `5xx` | Un reintento. «Maestros», o verlos de nuevo, la vuelve a pedir | Un solo mensaje en su fila | Sin cambio |
| Registrados, primera página o «Cargar más» | `401` | Nada: sale de la espera y no hay segunda petición | Nada | Sin cambio |
| «Sí, revocar» | Como en la ronda 1 | Como en la ronda 1 | Como en la ronda 1 | Regresa a «Revocar»; si la recarga falla, la raíz |

En los dos estados transversales:
- **En vuelo a la vez:** la consulta se cancela o se descarta, como en la ronda 1.
- **Con la vista desmontada:** la clave en error queda marcada vieja y no se anuncia nada.

### Verificación
Todo se corrió en `frontend/`, una corrida tras otra.
- **lint:** `npm run lint` → código de salida 0; última línea `tsc -b`.
- **build:** `npm run build` → `✓ built in 1.53s`.
- **Módulos:** `npx vitest run src/features/admin src/components/layout` → `Tests  1301 passed (1301)` (`Test Files  43 passed (43)`).
- **Las siete `*.ataque` del tester, rondas 1 y 2:** `npx vitest run src/features/admin/usuarios-01g-r1.ataque.test.tsx src/features/admin/maestros-01g-r1.ataque.test.tsx src/features/admin/estado-pago-01g-r1.ataque.test.tsx src/components/layout/barra-01g-r1.ataque.test.tsx src/features/admin/maestros-01g-r2.ataque.test.tsx src/features/admin/usuarios-01g-r2.ataque.test.tsx src/features/admin/estado-pago-01g-r2.ataque.test.tsx --reporter=verbose` → `Tests  101 passed (101)` (`Test Files  7 passed (7)`).
- **Los ATQ pedidos, en verde de esa misma corrida:**
  - ATQ-1G37: 4 de 4;
  - ATQ-1G38: 1 de 1;
  - ATQ-1G42: 2 de 2;
  - ATQ-1G47: 2 de 2;
  - ATQ-1G48: 1 de 1;
  - total: 10 de 10 casos.
- **Las 26 rutas** (las mismas de la implementación) → `Tests  645 passed (645)` (`Test Files  26 passed (26)`).
- **build de `shared/` y `prisma validate`:** n/a.

### Conteos
`npx vitest list src/features/admin/maestros-recargas-01g.test.tsx | grep -ac ' > '` → 14 (archivo nuevo).

## ADMIN-01g — Corrección ronda 3 (2026-11-09)

Respondo a `reporte-tester.md`, "## Ronda 3 — ADMIN-01g" (línea 6462): ROTO por T-07 (baja). El humano decidió (2026-11-09): "Corregir con ronda acotada".
- **Archivo de producción:** solo `frontend/src/features/admin/hooks.ts`, y en él solo `useVolverAPedirSiFallo`.
- **Prueba nueva:** `frontend/src/features/admin/volver-a-pedir-01g.test.tsx`.
- No toqué ninguna `*.ataque`, incluida `maestros-01g-r3.ataque.test.tsx`. Sin commit ni navegadores.
- Las corridas fueron una tras otra, todas en primer plano.

### T-07: corregido
- **Antes**, `useVolverAPedirSiFallo` decidía solo con `status === "error"`.
  - Una consulta con datos que se recarga desde el error conserva `status: "error"` mientras la recarga corre.
  - Así, `resetQueries` descartaba esa recarga y lanzaba otra petición.
- **Ahora**, si `getQueryState(clave).fetchStatus === "fetching"`, el gancho no hace nada; la recarga en curso decide.
- **Mutación:** quité la guarda a mano y corrí `npx vitest run src/features/admin/volver-a-pedir-01g.test.tsx src/features/admin/maestros-01g-r3.ataque.test.tsx`.
  - Resultado: `Tests  3 failed | 15 passed (18)`.
  - Fallan "T-07: en error y con una recarga en vuelo por otra causa, pulsar no lanza otra petición ni descarta la que corre", "T-07 (estado vecino): tras la recarga en vuelo que vuelve a fallar, pulsar sí vuelve a pedir" y ATQ-1G60.
  - Restauré `hooks.ts` desde la copia y comprobé que la guarda volvió.

### Estados vecinos del gancho
Los cubre `volver-a-pedir-01g.test.tsx`, con el gancho real sobre un `useQuery`.
- **En error y sin recarga en vuelo:** sí pide, una vez. Caso: "T-07 (estado vecino): en error y sin recarga en vuelo, pulsar vuelve a pedir una vez".
- **En error y con una recarga en vuelo por otra causa:** no pide, ni con dos pulsaciones, y la recarga en curso entrega sus datos. Caso: "T-07: en error y con una recarga en vuelo por otra causa, pulsar no lanza otra petición ni descarta la que corre".
- **Tras la recarga en vuelo que vuelve a fallar:** al pulsar, sí vuelve a pedir. Caso: "T-07 (estado vecino): tras la recarga en vuelo que vuelve a fallar, pulsar sí vuelve a pedir".
- **Sana:** no pide. Caso: "T-07 (control): con la consulta sana, pulsar no pide nada".

**Nota sobre el estado de la consulta.** Una consulta **sin datos** que se recarga desde el error pasa a `status: "pending"` (TanStack Query v5), así que el gancho ya no pedía. La prueba deja datos en la consulta antes del error, como en las vistas.

### Usos del gancho (hermanos)
El cambio aplica a todos, porque es el mismo gancho.
- **`/admin/usuarios`** (`usuarios-view.tsx`): le afecta.
  - Casos que siguen cubriendo el camino que sí pide: `usuarios-01f.test.tsx`, "ADM-1F17 (a): pulsar «Usuarios» estando en la tabla vuelve a pedir y quita el error" y "ADM-1F03 y ADM-1F18 (c), camino (a): pulsar «Usuarios» estando en la tabla pide la primera página sin cursor y el texto desaparece"; `auth/rutas-ch3-r1.ataque.test.tsx`, "pulsar «Usuarios» estando en la tabla vuelve a pedir y quita el error".
  - El estado con una recarga en vuelo no tiene caso propio de la vista; lo cubre la prueba del gancho.
- **`/admin/estado-pago`** (`estado-pago-view.tsx`): le afecta.
  - La vista envuelve el gancho: si `alumnos.isError`, vacía la selección y llama al gancho.
  - Con una recarga en vuelo, la selección se vacía, pero ya no sale una segunda petición; la recarga en curso renueva las filas. No toqué la vista, porque está fuera del alcance de esta ronda.
  - Casos: `estado-pago-01g.test.tsx`, "ADM-1G12 (a): pulsar «Estado de pago» con la tabla en error la vuelve a pedir y el texto desaparece" y "ADM-1G11 (a) y ADM-1G14 (b): pulsar «Estado de pago» estando aquí pide la primera página del filtro sin cursor; el texto desaparece y la selección se vacía".
  - El estado en vuelo lo cubre la prueba del gancho.
- **`/admin/movimientos`** (`movimientos-view.tsx`): le afecta.
  - **No cubierto en la vista:** `movimientos-01g.test.tsx` no tiene caso de pulsar «Movimientos». El mecanismo lo cubre la prueba del gancho.
- **El resumen de `/admin`** (`inicio-admin-view.tsx`): le afecta.
  - Casos: `cuentas-view.test.tsx`, "ADM-1F01 (b): con el resumen en error, pulsar «Inicio» estando en /admin lo vuelve a pedir y el texto desaparece" y "un resumen sano no se vuelve a pedir al pulsar «Inicio» ni al regresar antes del staleTime".
- **La ficha** (`usuario-view.tsx`): no usa el gancho (grep). No aplica.
- **Enlaces** (`tabla-enlaces.tsx`): le afecta.
  - Casos: `maestros-01g-r3.ataque.test.tsx`, ATQ-1G59 y ATQ-1G60.
  - Además, `maestros-recargas-01g.test.tsx`: "T-06: tras el 5xx de la primera carga, pulsar «Maestros» vuelve a pedir la lista y el texto desaparece", "T-06: tras el 5xx de «Cargar más enlaces», pulsar «Maestros» vuelve a pedir la lista desde la primera página y el texto desaparece" y "T-06 (control): con la lista sana, pulsar «Maestros» no pide nada".
  - Y `maestros-01g-r2.ataque.test.tsx`: ATQ-1G38.
- **Registrados** (`registrados-del-enlace.tsx`): le afecta.
  - Casos: `maestros-recargas-01g.test.tsx`, "T-06, hermano: con la lista de registrados abierta y en error, pulsar «Maestros» la vuelve a pedir y el texto desaparece; sana, no"; `maestros-01g-r3.ataque.test.tsx`, ATQ-1G61.

### Verificación
En `frontend/`, una tras otra:
- **lint:** `npm run lint` → código de salida 0; última línea `tsc -b`. La primera corrida falló por el formato de mi prueba nueva; lo arreglé con `npx prettier --write src/features/admin/volver-a-pedir-01g.test.tsx`, solo ese archivo.
- **build:** `npm run build` → `✓ built in 946ms`.
- **Módulos:** `npx vitest run src/features/admin src/components/layout` → `Tests  1319 passed (1319)` (`Test Files  45 passed (45)`).
- **Las ocho `*.ataque` de 01g (rondas 1 a 3):** `npx vitest run src/features/admin/usuarios-01g-r1.ataque.test.tsx src/features/admin/maestros-01g-r1.ataque.test.tsx src/features/admin/estado-pago-01g-r1.ataque.test.tsx src/components/layout/barra-01g-r1.ataque.test.tsx src/features/admin/maestros-01g-r2.ataque.test.tsx src/features/admin/usuarios-01g-r2.ataque.test.tsx src/features/admin/estado-pago-01g-r2.ataque.test.tsx src/features/admin/maestros-01g-r3.ataque.test.tsx --reporter=verbose` → `Tests  115 passed (115)` (`Test Files  8 passed (8)`). ATQ-1G60 en verde.
- **Las 26 rutas** (las mismas de la implementación) → `Tests  645 passed (645)` (`Test Files  26 passed (26)`).
- **build de `shared/` y `prisma validate`:** n/a.

### Conteos
- `npx vitest list src/features/admin/volver-a-pedir-01g.test.tsx | grep -ac ' > '` → 4 (archivo nuevo).
