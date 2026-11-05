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
