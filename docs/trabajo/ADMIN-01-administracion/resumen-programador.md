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
