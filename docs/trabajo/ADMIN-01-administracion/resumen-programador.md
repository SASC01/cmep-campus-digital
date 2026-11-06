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
