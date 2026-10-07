# Resumen del programador — TAREAS-01

## TAREAS-01a — Implementación

Plan: `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/plan.md` (LISTO, aprobado por escrito; subentrega 01a, base `<R>` = `ad070b9`, rama `feat/tareas`).
Pasos completados: 8 de 8 (pasos 2 a 9; el 10 es este resumen).
Ninguna PARADA se activó. PA-01: `Get-NetConnectionProfile` = `uacam5 2` (Public), declarada de confianza por el humano para 2026-10-06; `Get-NetFirewallRule` = "Campus: bloquear entrada a Docker en redes publicas", Enabled True, Inbound, Block, Public.

### Archivos creados
- `shared/src/tareas.ts`
- `backend/src/core/tareas/temas.ts`, `temas.test.ts`, `categorias.ts`, `categorias.test.ts`
- `backend/prisma/migrations/20261006151453_tipo_publicacion_tarea/migration.sql`
- `backend/prisma/migrations/20261006151533_tareas_temas_y_categorias/migration.sql`
- `backend/src/adapters/db/bloqueo-clase.ts`, `referencias.ts`, `temas.ts`, `categorias.ts`
- `backend/src/handlers/tareas/temas.ts`, `categorias.ts`
- `backend/test/ayudas-tareas.ts`, `esquemas-tareas.test.ts`, `temas.integracion.test.ts`, `categorias.integracion.test.ts`, `migracion-tareas.integracion.test.ts`, `temas-autorizacion.integracion.test.ts`

### Archivos modificados
- `shared/src/clases.ts`, `shared/src/index.ts`
- `backend/prisma/schema.prisma`
- `backend/src/adapters/db/maestros-de-clase.ts` (importa `bloquearClase` de `bloqueo-clase.ts`; sin otro cambio), `publicaciones.ts` (`temaId`), `index.ts`
- `backend/src/handlers/clases/muro.ts` (`temaId ?? null`, solo en un material), `backend/src/app.ts` (A-10)
- `backend/src/adapters/README.md`, `backend/src/handlers/README.md`
- `backend/test/bloqueo-usuario.integracion.test.ts` (I-2, ver abajo)
- No toqué `sesiones-y-cadena.ataque.test.ts` ni ninguna otra `*.ataque` (V-01, abajo).

### Verificación (comando exacto y última línea)
- lint backend: `cd backend; npm run lint` → código 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (eco del comando; `tsc` no imprime nada si pasa; ESLint sin errores; Prettier "All matched files use Prettier code style!").
- test backend: `cd backend; npm test` → código 0; `Test Files  154 passed (154)` y `Tests  1872 passed (1872)`.
- build shared: `cd shared; npm run build` → código 0; última línea `> tsc -p tsconfig.json`. `cd shared; npm run lint` → `All matched files use Prettier code style!`.
- build raíz: `npm run build` (desde la raíz) → código 0; incluye `✓ built in 6.20s` del frontend; la última línea impresa es `See https://rolldown.rs/reference/InputOptions.checks#plugintimings for more details.` (aviso de tiempos de plugins de Vite, no es un error).
- lint raíz: `npm run lint` (desde la raíz) → código 0; última línea `> tsc -b`.
- lint frontend: `cd frontend; npm run lint` → código 0; última línea `> tsc -b`.
- test frontend: `cd frontend; npm test` → código 0; `Test Files  127 passed (127)` y `Tests  1852 passed (1852)` (el frontend no cambió).
- prisma validate: `cd backend; npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀`.

Una suite a la vez (PA-08): todas corrieron en serie. La corrida completa del backend se hizo dos veces: la primera (1871 pruebas, todo verde) y una final, después de agregar un caso a `esquemas-tareas.test.ts` (1872). Las cifras de arriba son las de la final.

### Rojo esperado
`test/sesiones-y-cadena.ataque.test.ts` › "ataque: superficie de rutas" › "bajo /api solo existen las rutas de AUTH-01, …, TAREAS-01a: …": **queda en verde** (está en `Test Files 154 passed`; aparece una vez en `npx vitest list`). Ninguna otra `*.ataque` cayó.

### PARADAS y verificaciones
- **PA-03:** la primera migración contiene solo `ALTER TYPE "tipo_publicacion" ADD VALUE 'tarea';`. La segunda: `ADD COLUMN "tema_id"` en `publicaciones`, 4 `CREATE TABLE`, índices, FK y, a mano, 5 `CHECK` de tablas nuevas, `DROP CONSTRAINT "publicaciones_titulo_segun_tipo"` + su reemplazo y `publicaciones_anuncio_sin_tema`. Sin `DROP` de otra cosa, sin `ALTER` de columnas existentes, nada en las tablas prohibidas; en `publicaciones` solo `tema_id`, su FK, sus dos índices y los dos `CHECK`. `migrate dev` no propuso `reset` ni avisó deriva.
- **PA-04:** `cd backend; npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → código 0, "No difference detected."
- **V-03:** `prisma validate` OK; `prisma format --check` → "All files are formatted correctly!"; `prisma generate` OK; `prisma migrate status` → "12 migrations found in prisma/migrations" y "Database schema is up to date!"; `git status --porcelain backend/prisma/migrations` → solo las dos carpetas nuevas (el árbol de `migrations/` anterior no cambió). `campus_dev` ya tiene las dos migraciones aplicadas (A-1).
- **PA-07** (`npm test`, salida completa en el scratchpad, `grep -o -F` por término): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 10, `"code":"P2028"` 5, `Unable to start a transaction` 0. Los 10 son exactamente I-1 (5 `POST /api/auth/login` "fallo simulado de la base en la búsqueda", 1 `POST /api/auth/login` "…al crear la sesión", `POST …/archivos`, `POST …/archivos/:id/descarga` y `GET …/publicaciones` con `ZodError`, `GET /api/prueba/error-comun` "boom"), atribuidos por la última "incoming request" del mismo `pid` y `requestId`. Los 5 `P2028` son los permitidos (`cuentas-r3`: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`; `servicio-ocupado`: `cambiar-contrasena` › `tx.sesion.findFirst()`, `refrescar` › `tx.sesion.updateMany()`, `…/comentarios` › `$queryRawUnsafe`); control positivo completo. Ningún `P2028` de una ruta de TAREAS-01.
- **V-01:** sha256 de las 141 `*.ataque` (backend y frontend) contra la tabla del tester (`reporte-tester.md`, ronda 0 de 01a): `diff` vacío, 141 de 141 iguales (incluida `sesiones-y-cadena.ataque.test.ts` = `2C8CB4D7…45C8`).
- **V-04 (búsquedas en producción):** `$queryRawUnsafe` en código: 1 (`adapters/db/cliente.ts`); `$queryRaw`/`$executeRaw` nuevos solo en `referencias.ts`, `temas.ts` y `categorias.ts` (y los de siempre), todos etiquetados; `FOR KEY SHARE` en código solo en `referencias.ts` (el resto son comentarios); `tipo: "tarea"` en una escritura de producción: 0; `addHook` en `handlers/`: 0; `notifier` en `handlers/`: 0 en código (solo la prosa del README); `estadoPago` en `backend/src/`: los mismos archivos de hoy; `console.` en archivos nuevos: 0; `trabajoId`/`trabajo_id` en `shared/src/`: 0.
- **V-05/V-06:** ningún archivo de "No se toca" cambió (la lista de arriba es la completa; `package.json` y `package-lock.json` sin cambios; `middleware/`, `adapters/auth`, `notifier`, `storage`, `queue`, `infra/` sin tocar). Las ocho rutas de V-06 están registradas y el caso `printRoutes` de la ronda 0 está verde.
- **PA-09:** cada archivo nuevo corrió aislado (`npx vitest run <archivo>`) y dentro de la corrida completa, con el mismo resultado.

### I-2 cambiada
`backend/test/bloqueo-usuario.integracion.test.ts` › "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts, publicaciones.ts, referencias.ts, temas.ts y categorias.ts usan SQL etiquetado en adapters/db". Los tres archivos nuevos usan de verdad `$queryRaw` o `$executeRaw` en código (`referencias.ts`: `FOR KEY SHARE`; `temas.ts`: el `UPDATE … FROM unnest`; `categorias.ts`: el `FOR UPDATE` y su `UPDATE … FROM unnest`), así que los agregué a su lista cerrada; cambió el título y la lista, no la lógica.

### Pruebas requeridas (archivo y título exacto)
Cada título empieza con su ID. Los títulos completos salen de `npx vitest list` (comando en "Conteos").

- **PR-1A01** → `backend/src/core/tareas/temas.test.ts` (16 casos): "PR-1A01: con 29 temas pasa y con 30 rechaza con 409 TOPE_DE_TEMAS"; "PR-1A01: un nombre repetido sin distinguir mayúsculas, acentos ni espacios de más → 409 TEMA_REPETIDO"; "PR-1A01: un nombre distinto pasa"; "PR-1A01: con el tope y un nombre repetido, el tope va primero"; "PR-1A01: renombrar a su mismo nombre (aunque cambie la capitalización) pasa"; "PR-1A01: renombrar al nombre de otro tema → 409 TEMA_REPETIDO"; "PR-1A01: un tema que no está → 404 TEMA_NO_ENCONTRADO"; "PR-1A01: sin temas → 0"; "PR-1A01: con huecos → el mayor más 1"; "PR-1A01: el mismo conjunto en otro orden pasa"; "PR-1A01: los ids en otra capitalización cuentan como los mismos"; "PR-1A01: un tema faltante rechaza"; "PR-1A01: un tema sobrante o ajeno rechaza"; "PR-1A01: un id repetido rechaza"; "PR-1A01: una lista vacía con temas rechaza"; "PR-1A01: el maestro y el admin pueden; el estudiante no".
- **PR-1A02** → `backend/src/core/tareas/categorias.test.ts` (16 casos): "PR-1A02: una lista vacía es válida"; "PR-1A02: 100 pasa; 99 y 101 rechazan"; "PR-1A02: una sola categoría de 100 pasa"; "PR-1A02: diez categorías que suman 100 pasan"; "PR-1A02: un peso fuera de 1 a 100 o con decimales rechaza aunque la suma sea 100"; "PR-1A02: sin actuales, todas las nuevas se crean"; "PR-1A02: las que traen id se actualizan"; "PR-1A02: las actuales que no vienen se quitan; una lista vacía las quita todas"; "PR-1A02: crear, actualizar y quitar combinados"; "PR-1A02: un id que no es de la clase → 404 CATEGORIA_NO_ENCONTRADA"; "PR-1A02: un id repetido (también en otra capitalización) → 400 VALIDACION"; "PR-1A02: un nombre repetido, normalizado, → 400 VALIDACION"; "PR-1A02: once categorías → 400 por el tope de 10"; "PR-1A02: pesos que no suman 100 → 400 VALIDACION"; y dos de la función extra `conNombresDeCategoriaNormalizados` ("PR-1A02: recorta y pasa CRLF y CR a LF solo en el nombre de cada categoría, sin mutar"; "PR-1A02: lo que no es texto o no tiene la forma esperada queda intacto").
- **PR-1A03** → `backend/test/esquemas-tareas.test.ts` (27 casos): `textoDeUnaLineaSchema` ("PR-1A03: rechaza \r, \n, U+2028 y U+2029"; "PR-1A03: rechaza un texto de solo invisibles o espacios, con el mensaje del campo"; "PR-1A03: rechaza los inversores de dirección y los caracteres de control"; "PR-1A03: respeta el máximo (10 pasa, 11 rechaza)"; "PR-1A03: el máximo cuenta puntos de código: 10 emojis de 2 unidades de UTF-16 pasan y 11 rechazan"; más 2); `nombreTemaSchema` y `nombreCategoriaSchema` ("PR-1A03: el nombre de un tema admite 80 y rechaza 81, con su mensaje cuando falta"; "PR-1A03: el nombre de una categoría admite 60 y rechaza 61, con su mensaje cuando falta"; "PR-1A03: ninguno admite un salto de línea"); `pesoCategoriaSchema` ("PR-1A03: acepta enteros de 1 a 100"; "PR-1A03: rechaza 0, 101, decimales, texto, NaN e infinito, con el mismo mensaje"); `reemplazarCategoriasSchema` ("PR-1A03: pesos que suman 100 pasan"; "PR-1A03: una lista vacía pasa (la clase queda sin categorías)"; "PR-1A03: una suma distinta de 100 rechaza con el mensaje sobre el campo categorias"; "PR-1A03: hasta 10 categorías pasan y 11 rechazan"; "PR-1A03: ids repetidos (también en otra capitalización) y nombres repetidos rechazan"; "PR-1A03: los ids salen en minúsculas y una categoría nueva no lleva id"; "PR-1A03: un peso inválido o un cuerpo sin la lista rechazan"); `ordenTemasSchema` ("PR-1A03: de 1 a 30 ids pasan; 0 y 31 rechazan"; "PR-1A03: un id repetido en mayúsculas y minúsculas rechaza"; "PR-1A03: los ids salen en minúsculas y uno que no es uuid rechaza"); `moverElementoSchema` ("PR-1A03: la clave ausente rechaza; null y un uuid pasan; otro texto rechaza"); rama `material` ("PR-1A03: sin temaId, la salida no tiene la clave (Enmienda 1, M-01)"; "PR-1A03: con temaId uuid o null, la salida lo conserva"; "PR-1A03: un temaId que no es uuid rechaza"; "PR-1A03: un anuncio con temaId descarta la clave como cualquier campo extra").
- **PR-1A04** → `backend/test/temas.integracion.test.ts` (12 casos): "PR-1A04: crear deja cada tema al final del orden y la respuesta lleva elementos en 0"; "PR-1A04: el nombre se guarda recortado y con CRLF normalizado"; "PR-1A04: listar trae los temas en orden con elementos y sinTema (sin contar anuncios) y lo ve el estudiante"; "PR-1A04: renombrar responde el tema con su conteo, y a su mismo nombre también pasa"; "PR-1A04: reordenar guarda el orden completo y lo responde como el GET"; "PR-1A04: borrar un tema deja sus materiales con tema_id nulo y cuentan en sinTema"; "PR-1A04: renombrar y borrar un tema de otra clase responde 404 TEMA_NO_ENCONTRADO sin cambiar nada"; "PR-1A04: un nombre repetido (sin distinguir mayúsculas ni acentos) responde 409 TEMA_REPETIDO"; "PR-1A04: un nombre inválido responde 400 VALIDACION y no crea nada"; "PR-1A04: con 30 temas, crear otro responde 409 TOPE_DE_TEMAS"; "PR-1A04: reordenar con un conjunto distinto del actual responde 409 ORDEN_DESACTUALIZADO y no cambia nada"; `PR-1A04: "orden" como :temaId en DELETE responde 400 VALIDACION y en PUT con cuerpo de nombre también`.
- **PR-1A05** → `backend/test/temas.integracion.test.ts` (5 casos): "PR-1A05: dos creaciones simultáneas con 29 temas: una 201 y otra 409 TOPE_DE_TEMAS"; "PR-1A05: diez creaciones simultáneas con 25 temas: cinco 201, cinco 409 TOPE_DE_TEMAS y 30 temas"; "PR-1A05: dos creaciones simultáneas con el mismo nombre: una 201 y otra 409 TEMA_REPETIDO"; "PR-1A05: un reordenamiento y un borrado simultáneos: 200 con el orden nuevo o 409 ORDEN_DESACTUALIZADO, nunca 500"; "PR-1A05: renombrar y borrar el mismo tema a la vez termina sin 500".
- **PR-1A06** → `backend/test/temas.integracion.test.ts` (9 casos): "PR-1A06: un material pasa a un tema y de vuelta a null"; "PR-1A06: una tarea también se mueve, y el admin puede mover lo de un maestro (mover no es editar)"; "PR-1A06: un anuncio responde 409 ANUNCIO_SIN_TEMA y no cambia"; "PR-1A06: un tema de otra clase o inexistente responde 404 TEMA_NO_ENCONTRADO sin cambiar el elemento"; "PR-1A06: una publicación de otra clase responde 404 PUBLICACION_NO_ENCONTRADA sin cambiarla"; "PR-1A06: sin la clave temaId o con un valor que no es uuid, 400 VALIDACION"; "PR-1A06: publicar un material con temaId lo deja en ese tema; sin la clave o con null queda sin tema"; "PR-1A06: un anuncio con temaId se publica sin tema (la clave se descarta)"; "PR-1A06: publicar un material con un tema de otra clase responde 404, sin publicación ni trabajo MATERIAL_CREADO".
- **PR-1A07** → `backend/test/categorias.integracion.test.ts` (16 casos): "PR-1A07: PUT crea, renombra, cambia pesos y quita en una sola petición"; "PR-1A07: GET trae las tareas de cada categoría"; "PR-1A07: quitar una categoría con tareas responde 409 CATEGORIA_CON_TAREAS con su nombre y conteo, sin cambiar nada"; "PR-1A07: un id de otra clase responde 404 CATEGORIA_NO_ENCONTRADA y no cambia nada"; "PR-1A07: pesos que no suman 100 responden 400 VALIDACION y no cambian nada"; "PR-1A07: una lista vacía quita todas las categorías sin tareas y deja la clase sin categorías"; "PR-1A07: dos guardados simultáneos quedan en serie y el resultado suma 100"; "PR-1A07: bloquearCategoriaParaUsar da true con una categoría de la clase y false con una de otra clase y con un id inexistente"; y siete más (clase sin categorías, orden de las nuevas, nombre recortado, lista vacía con tareas, decimales/texto/once/repetidos, diez guardados simultáneos, `bloquearTemaParaUsar`, y "PR-1A07: un guardado que quita una categoría espera a la transacción que la usa y después la rechaza si ya tiene tarea", que prueba el `FOR KEY SHARE` contra el `FOR UPDATE` con una transacción retenida y `formadasDetrasDe`).
- **PR-1A08** → `backend/test/migracion-tareas.integracion.test.ts` (14 casos): "PR-1A08: el CHECK de título por tipo rechaza un anuncio con título y un material o una tarea sin título"; "PR-1A08: un anuncio con tema falla y un material con tema pasa"; "PR-1A08: un peso de categoría de 0 o 101 falla y de 1 o 100 pasa"; "PR-1A08: los puntos de una tarea de 0 o 1001 fallan y de 1 o 1000 pasan"; "PR-1A08: borrar un tema pone tema_id en nulo en sus publicaciones y no las borra"; "PR-1A08: borrar una clase con temas, categorías y tareas no falla (NO ACTION) y se lleva todo"; "PR-1A08: una fila de tareas con un id que no es de ninguna publicación falla"; y siete más (título por tipo que sigue aceptando lo válido, mover un anuncio a un tema por SQL, criterios de rúbrica, orden de tema negativo, borrar categoría con tareas, borrar la publicación de una tarea, valores por defecto de una tarea).
- **PR-1A09** → `backend/test/temas-autorizacion.integracion.test.ts` (11 casos): "PR-1A09: las ocho rutas de 01a se prueban"; "PR-1A09: cada ruta: sin token, 401 NO_AUTENTICADO"; "PR-1A09: cada ruta: con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO"; "PR-1A09: cada ruta: estudiante restringido inscrito, 403 ACCESO_RESTRINGIDO"; "PR-1A09: las siete rutas de maestro y admin: el estudiante inscrito recibe 403 ROL_NO_PERMITIDO (también en GET …/categorias)"; "PR-1A09: cada ruta: maestro de otra clase y, donde aplica, estudiante no inscrito, 403 SIN_ACCESO_A_LA_CLASE"; "PR-1A09: cada ruta: una clase inexistente responde 403 SIN_ACCESO_A_LA_CLASE, igual que una ajena, al maestro y al admin"; "PR-1A09: cada ruta: el maestro de la clase y el admin reciben el éxito de la ruta"; "PR-1A09: GET …/temas también responde 200 al estudiante inscrito"; "PR-1A09: en cada caso negado, temas, categorías y el tema de cada publicación quedan como estaban"; "PR-1A09: ninguna respuesta de éxito lleva estadoPago, accesoRestringido ni correos".

Todas las viñetas tienen caso; ninguna queda "no cubierta".

### Conteos
- Backend: `cd backend; npx vitest list > <scratchpad>/vitest-list-back.txt` → 1872 líneas (1872 pruebas); 154 archivos distintos (`cut -d' ' -f1 | sort -u | wc -l`). Antes de 01a (ronda 0 del tester): 147 archivos y 1746 pruebas; ahora +7 archivos y +126 pruebas, que son exactamente las 126 de PR-1A01 a PR-1A09 (`grep -c "PR-1A"` sobre esa lista da 126; E6 no cambia de cantidad).
- La corrida (`npm test`) coincide: `Test Files  154 passed (154)`, `Tests  1872 passed (1872)`.
- Frontend: `cd frontend; npm test` → `Test Files  127 passed (127)`, `Tests  1852 passed (1852)`; `npx vitest list` lista 1852 pruebas. Sin cambios por 01a.

### Hallazgos atendidos
Ninguno (primera entrega de 01a; el único rojo de la ronda 0 se resolvió con el registro de las rutas).
Hermanos y estados vecinos: no aplica (no hay hallazgo que corregir).

### Desviaciones del plan
Ninguna que contradiga el plan. Decisiones donde el plan calla o hay que elegir (las cuatro primeras tocan código o pruebas que el plan no nombra; las demás son menores). Si alguna no te cuadra, la deshago:
1. **`PublicacionDb.tipo` admite `"tarea"`** (`adapters/db/publicaciones.ts`). Sin eso `tsc` falla, porque el cliente generado ya conoce el valor nuevo del `enum`. Es solo el tipo; ninguna consulta cambia en 01a (el muro empieza a pintar tareas en 01b, C-5).
2. **Nombres de temas y de categorías se guardan recortados y con CRLF normalizado.** Temas: `conTextosNormalizados(request.body, ["nombre"])` (ya existía). Categorías: función nueva `conNombresDeCategoriaNormalizados` en `core/tareas/categorias.ts`, con 2 pruebas. Sin esto, `"  Examen "` se guardaba con los espacios. El plan no dice nada de esto para 01a (sí lo dice para el título de la tarea en 01b).
3. **`CODIGOS_TAREAS` lleva solo los 7 códigos de 01a** (`TEMA_NO_ENCONTRADO`, `CATEGORIA_NO_ENCONTRADA`, `CATEGORIA_CON_TAREAS`, `TOPE_DE_TEMAS`, `TEMA_REPETIDO`, `ORDEN_DESACTUALIZADO`, `ANUNCIO_SIN_TEMA`); 01b agrega los demás (`TAREA_NO_ENCONTRADA`, `CATEGORIA_REQUERIDA`, `EDICION_NO_PERMITIDA`, `FECHA_LIMITE_INVALIDA`). De `shared/src/tareas.ts` solo entró lo de temas y categorías, como dice la sección de `shared/`.
4. **Pruebas extra** (dentro de archivos de PR-1A07/PR-1A04): `bloquearTemaParaUsar` directo y el caso del `FOR KEY SHARE` contra el guardado de categorías (§D-7). Son nuevas; no tocan nada existente.
5. Las categorías nuevas se crean con `creado_en` separado un milisegundo por posición (`createMany` con `new Date(base + i)`): sin eso, todas tendrían el mismo `creado_en` (hora de la transacción) y el orden `(creado_en, id)` las mezclaría por el uuid.
6. `moverATema` responde `temaId` en minúsculas (el esquema de entrada no lo transforma). `renombrarTema` responde el conteo de elementos con una consulta `count` (el `temaSchema` lleva `elementos`).
7. En `schema.prisma` agregué el comentario del cambio de `Publicacion` y los comentarios de cada modelo nuevo; en `bloqueo-clase.ts` conservé el cuerpo de `bloquearClase` y `sinAcceso` tal cual (A-5).
8. Corrí `npx prettier --write src test/*.ts` acotado a `backend/` (no desde la raíz); `git status` confirma que no cambió ningún archivo ajeno a los listados.

### Pendiente o fuera de alcance detectado
- Los textos de "Al cerrar 01a" (ESSENTIALS, PRD RN-05, ARCHITECTURE §7 y §14) los aplica el orquestador (A-9); no los toqué.
- El mensaje de un `temaId` inválido en el cuerpo sale como "temaId: temaId: debe ser un identificador válido" (el esquema ya lleva el prefijo y `validarCuerpo` agrega otro), igual que los demás ids con prefijo de `shared/` (por ejemplo `maestroId`); lo dejé como el patrón existente.
- La lista de temas se ordena por `(orden, creado_en, id)` como dice el plan; el índice es `(clase_id, orden, id)`, así que el desempate por `creado_en` ordena en memoria hasta 30 filas (S-14).
- Prueba de carga manual (archivo temporal ya borrado): 40 `POST …/temas` simultáneos sobre una clase vacía dieron 30 `201` y 10 `409`, sin 5xx ni `P2028`.

## TAREAS-01a — Corrección de la ronda 1

Plan: `plan.md` (01a). Arbitraje: `revision.md`, "Arbitraje — ronda 1 de 01a". PA-01: red `uacam5 2` (Public, declarada hoy) y regla "Campus: bloquear entrada a Docker en redes publicas" Enabled/Inbound/Block/Public.

### Hallazgos atendidos
- **T-01 corregido** (renombrar con `temaId` de la ruta en mayúsculas). Un solo remedio en la validación: `temaIdParamSchema` pasa el id a minúsculas. Además `validarRenombre` compara los ids en minúsculas en sus dos condiciones (defensa en profundidad; el arbitraje pide el remedio en el esquema, no solo ahí).
- **T-04 corregido** (mover responde `publicacionId` en mayúsculas). Esquema nuevo `publicacionDeMoverParamSchema` (en `shared/src/tareas.ts`, con id a minúsculas) usado solo por la ruta de mover; no cambié `publicacionIdParamSchema` de `clases.ts` porque lo usa el muro. `moverElementoSchema.temaId` también pasa a minúsculas.
- **T-02 corregido** (invisibles) y **T-03 corregido** (formas de compatibilidad): función pura nueva `claveDeNombre` en `shared/src/tareas.ts` (NFKC, quita `\p{Default_Ignorable_Code_Point}`, luego `normalizarTerminoDeBusqueda`; reexportada por nombre en `index.ts`). Solo cambia la comparación: el nombre se guarda y se muestra tal como llega. No toqué `normalizarTerminoDeBusqueda`.
- Los 7 rojos de `temas-01a-r1.ataque.test.ts` y `categorias-01a-r1.ataque.test.ts` quedan en verde; nada más cambió de color. No modifiqué ninguna `*.ataque`.

### Hermanos y estados vecinos (uno por uno)
Rutas de temas y mover:
- `GET …/temas` y `POST …/temas`: sin id de ruta; el POST compara nombres con `claveDeNombre` (aplica, se aplicó; casos: core "invisibles y formas de compatibilidad cuentan como el mismo nombre" y los de `temas-01a-r1`).
- `PUT …/temas/:temaId`: aplica, se aplicó (id a minúsculas en el esquema; `validarRenombre` robusto; clave nueva). Casos: "renombrar con el id en mayúsculas encuentra el tema y no se cuenta a sí mismo" y los rojos T-01.
- `DELETE …/temas/:temaId`: usa el mismo `temaIdParamSchema`; ya funcionaba (el DB compara uuid sin mayúsculas); ahora entra en minúsculas. Cubierto por el caso "hermanos: borrar, ordenar y publicar…" del tester y "los ids de la ruta salen en minúsculas".
- `PUT …/temas/orden`: ids del cuerpo ya iban a minúsculas; sin cambio, no aplica. `:claseId` no se compara en memoria.
- `PUT …/publicaciones/:publicacionId/tema`: aplica, se aplicó (T-04; `publicacionDeMoverParamSchema`).
- Publicar un material con `temaId`: el cuerpo no se compara en memoria y el adaptador solo consulta la DB; la respuesta del muro no repite el `temaId`. No aplica; el caso del tester con id en mayúsculas sigue verde.

Ids del cuerpo:
- `temaId` al mover: aplica, se aplicó (transform a minúsculas; caso "los ids de la ruta salen en minúsculas…" y T-04).
- `temaId` al publicar: no aplica (no se repite ni se compara).
- `temaIds` del orden: ya iban a minúsculas (`ordenTemasSchema`); sin cambio.
- `id` de cada categoría: ya iban a minúsculas (`reemplazarCategoriasSchema` y core); sin cambio.

Respuestas que repiten un id recibido: mover (`publicacionId`, `temaId`) corregido; orden, categorías y temas responden ids de la base (minúsculas). Ninguna otra.

Estados vecinos de la comparación de nombres, en temas y en categorías (las cuatro comparaciones usan `claveDeNombre`):
- Temas: crear (`validarNuevoTema`), renombrar al mismo nombre con otra forma (pasa, no se cuenta a sí mismo) y renombrar al nombre de otro tema (`TEMA_REPETIDO`), todos con invisibles y compatibilidad; casos: core `temas.test.ts` ("comparación de nombres y ids (ronda 1, T-01 a T-03)") y los rojos T-02/T-03.
- Categorías: dos nombres equivalentes en el mismo cuerpo (refine de `reemplazarCategoriasSchema` y `planearReemplazoDeCategorias`) y frente a una categoría ya existente (mismo `planear…`, que compara el cuerpo completo, ya que el guardado es en bloque): casos `categorias.test.ts` ("comparación de nombres (ronda 1, T-02 y T-03)") y los rojos T-02/T-03. Una categoría existente que se renombra a otro nombre equivalente de una existente cae en el mismo caso porque el cuerpo trae ambas.

### Archivos tocados
- `shared/src/tareas.ts` (`claveDeNombre`, `publicacionDeMoverParamSchema`, ids a minúsculas, refine con la clave), `shared/src/index.ts` (2 reexportaciones)
- `backend/src/core/tareas/temas.ts`, `categorias.ts`, `backend/src/handlers/tareas/temas.ts`
- Pruebas: `backend/src/core/tareas/temas.test.ts` (+2), `categorias.test.ts` (+1), `backend/test/esquemas-tareas.test.ts` (+2). Ningún archivo de pruebas de `shared/`.

### Verificación (comando y última línea)
- `cd shared; npm run build` → código 0, `> tsc -p tsconfig.json`; `npm run lint` → "All matched files use Prettier code style!".
- `cd backend; npm run lint` → código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- `cd backend; npm test` → código 0, `Test Files  156 passed (156)` · `Tests  1918 passed (1918)`.
- `npm run build` (raíz) → código 0, `✓ built in 1.58s`; `npm run lint` (raíz) → código 0, `> tsc -b`.
- `cd frontend; npm run lint` → código 0, `> tsc -b`; `cd frontend; npm test` → `Test Files  127 passed (127)` · `Tests  1852 passed (1852)`.
- Conteos: `cd backend; npx vitest list` → 1918 líneas, 156 archivos distintos (antes de la corrección, 1913 pruebas con las 41 de las dos `*.ataque` nuevas; ahora +5 propias de la corrección: 2+1+2 = 5). Coincide con la corrida.
- V-01: sha256 de las 143 `*.ataque` contra la tabla de la ronda 1: `diff` vacío, 143 de 143 iguales.
- PA-07 (`npm test`): `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 10 (I-1) · `"code":"P2028"` 5 (los 2 de `cuentas-r3` y los 3 de `servicio-ocupado`, con control positivo) · `Unable to start a transaction` 0. El `ZodError too_small` de `GET /api/admin/clases` (PR-2A12) no reapareció: la excepción no se usó.

### Desviaciones
Ninguna respecto al arbitraje. Nota: `validarRenombre` también compara en minúsculas, además del remedio en el esquema.

## TAREAS-01a — Corrección de la ronda 2

Arbitraje y reporte: `reporte-tester.md`, "TAREAS-01a — Ronda 2". PA-01: red `uacam5 2` (Public, declarada hoy) y regla "Campus: bloquear entrada a Docker en redes publicas" Enabled/Inbound/Block/Public (comprobado).

### T-05 corregido
`claveDeNombre` (`shared/src/tareas.ts`) ahora reutiliza el conjunto "se ve vacío" que ya existía (`CARACTER_QUE_SE_VE_VACIO` de `shared/src/clases.ts`, antes privado; ahora `export` y reexportado por nombre en `index.ts`, A-11; sin duplicar la definición). Lo aplica después de NFKC y antes de `normalizarTerminoDeBusqueda`, en un solo paso.

**Desviación del texto del encargo (necesaria para que pasen los 2 rojos):** no todo el conjunto se *quita*. Los `Default_Ignorable` se quitan (como en T-02: "Uni"+U+200B+"dad" = "Unidad"), pero U+2800 y U+1D159 cuentan como *espacio* (el tester espera que "Unidad"+U+2800+"1" sea "Unidad 1", y quitarlos daría "unidad1"). Se distinguen con la misma definición compartida: lo que cumple `CARACTER_QUE_SE_VE_VACIO` y es `Default_Ignorable` se quita; el resto se cambia por un espacio, y `normalizarTerminoDeBusqueda` lo colapsa y recorta. Solo cambia la comparación; el nombre se guarda tal como llega.

### Hermanos y estados vecinos
- Los cuatro sitios que comparan nombres, confirmado por `grep`: `validarNuevoTema` y `validarRenombre` (`core/tareas/temas.ts`, `const clave = claveDeNombre`), `planearReemplazoDeCategorias` (`core/tareas/categorias.ts`) y el refine de `reemplazarCategoriasSchema` (`shared/src/tareas.ts`) usan `claveDeNombre`; ninguno llama ya a `normalizarTerminoDeBusqueda` directo. Casos: `temas.test.ts` "PR-1A01: U+2800 y U+1D159 al final o en medio del nombre cuentan como el mismo nombre" (crear y renombrar), `categorias.test.ts` "PR-1A02: U+2800 y U+1D159 hacen repetido un nombre en el mismo guardado", y los 2 rojos de `nombres-ids-01a-r2` (temas y categorías vía API).
- Clases de caracteres, medidas con `shared/dist` (clave de "Unidad"+c+"1"):
  - `Default_Ignorable` (U+200B, U+00AD, U+200D, U+2060, U+FEFF, …): se quita; "unidad1" para el del medio. Caso: "PR-1A01: invisibles y formas de compatibilidad cuentan como el mismo nombre".
  - "Se ve vacío" de `shared/` (U+2800, U+1D159): cuentan como espacio ("unidad 1"). Casos de T-05.
  - Espacios Unicode (NBSP U+00A0, U+3000, tabulador, U+2003, U+2009): `normalizarTerminoDeBusqueda` ya los colapsa ("unidad 1"). Caso: `esquemas-tareas.test.ts` "PR-1A03: el relleno Hangul y los espacios Unicode: el relleno se quita y los espacios se colapsan".
  - Relleno Hangul (U+3164, U+115F, U+1160): **sí está** en el conjunto "se ve vacío" de `shared/`, porque es `Default_Ignorable` (`CARACTER_QUE_SE_VE_VACIO.test` = true). La clave lo quita: "Unidad"+relleno+"1" da "unidad1", no "unidad 1"; "Unidad 1"+relleno es el mismo nombre. No agregué nada a la definición. Casos: "PR-1A01: el relleno Hangul se quita como cualquier Default_Ignorable (no cuenta como espacio)".
- Estados vecinos:
  - Nombre que tras la clave queda vacío: el esquema lo rechaza antes con `400 VALIDACION` ("Escribe el nombre del tema/de la categoría"), porque `contarCaracteresVisibles` no cuenta esos caracteres (medido: U+3164, U+115F, U+1160, U+2800, U+1D159, NBSP, U+3000 y tabulador solos dan `esquema: false`). Caso: "PR-1A03: quita U+2800 y U+1D159, y un nombre solo de eso queda con clave vacía pero el esquema lo rechaza". Excepción: O-06 (abajo), visible con clave vacía.
  - Renombrar a su propio nombre con solo un carácter "se ve vacío" de diferencia: pasa ("el mismo tema"). Caso: "PR-1A01: renombrar a su propio nombre con solo un carácter que se ve vacío de diferencia pasa".
  - Dos nombres del mismo guardado de categorías que difieren solo en uno de esos caracteres: `400`. Caso de categorías arriba; y la categoría renombrada con solo esa diferencia pasa ("PR-1A02: una categoría renombrada con solo un carácter que se ve vacío de diferencia pasa").

### Reportado para arbitraje del manager, sin actuar
- O-05: el relleno Hangul en lugar del espacio se quita y no cuenta como espacio ("unidad1"). Es coherente con T-02; si el manager prefiere que cuente como espacio, es cambiar `IGNORABLE` en la clave.
- O-06: U+FF9E y U+FF9F (visibles, `\p{Lm}`) dan clave vacía ("solo" → ""), así que como nombres de un carácter chocan entre sí. Hoy el esquema los acepta (`esquema: true`). Sin cambio.
- O-07: no hay plegado de mayúsculas Unicode ("Straße" → "straße", "STRASSE" → "strasse", distintos) ni homoglifos (la "а" cirílica es distinta de la "a" latina). Sin cambio.

### Archivos tocados
`shared/src/clases.ts` (solo `export` de la constante), `shared/src/tareas.ts` (`claveDeNombre`), `shared/src/index.ts`; pruebas: `backend/src/core/tareas/temas.test.ts` (+3), `categorias.test.ts` (+2), `backend/test/esquemas-tareas.test.ts` (+2). Ninguna `*.ataque`.

### Verificación (comando y última línea)
- `cd shared; npm run build` → `> tsc -p tsconfig.json` (código 0); `npm run lint` → "All matched files use Prettier code style!".
- `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0).
- `cd backend; npm test` → código 0, `Test Files  157 passed (157)` · `Tests  1938 passed (1938)`. Los 2 casos de `nombres-ids-01a-r2` en verde; sin otros rojos; las excepciones arbitradas (`ZodError` de `GET /api/admin/clases`, `admin-muro-02b-r1`) no aparecieron.
- `npm run build` (raíz) → `✓ built in 1.28s`, código 0; `npm run lint` (raíz) → `> tsc -b`, código 0.
- `cd frontend; npm run lint` → `> tsc -b`; `cd frontend; npm test` → `Test Files  127 passed (127)` · `Tests  1852 passed (1852)`.
- Conteos: `cd backend; npx vitest list` → 1938 líneas y 157 archivos, igual que la corrida (antes de esta corrección, 1931 con la `*.ataque` nueva; +7 míos).
- V-01: sha256 de las 144 `*.ataque` contra la tabla de la ronda 2: `diff` vacío, 144 de 144.
- PA-07: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 10 (I-1) · `"code":"P2028"` 5 (permitidos) · `Unable to start a transaction` 0.

## TAREAS-01b — Parada PA-05 (historial; superada, ver la sección siguiente)

Me detuve en los pasos 12 a 17 hechos y los pasos 18 a 20 sin hacer, por **PA-05**: al registrar `tareasHandler` en `app.ts` (paso 17) cae una `*.ataque` que no está en los rojos esperados de la ronda 0 de 01b.

- **Caso:** `backend/test/sesiones-y-cadena.ataque.test.ts` › "ataque: superficie de rutas" › "bajo /api solo existen las rutas de AUTH-01, …, CLASES-02a y TAREAS-01a: …" (línea 543, `printRoutes`). Salida: `expected [ …(79) ] to deeply equal [ …(72) ]`; las 7 entradas de más son exactamente las de V-06 para 01b: `POST /api/clases/:claseId/tareas`; `GET`, `HEAD`, `PUT` y `DELETE …/tareas/:tareaId`; `GET` y `HEAD …/trabajo`.
- **Causa:** §D-R0, C-2 dice "01a, 01b" (cinco rutas más los `HEAD` en 01b), pero la ronda 0 de 01b no reescribió esa lista (su tabla de C-n no menciona C-2). No es un defecto de la implementación. Hace falta una ronda 0 complementaria del tester que la reescriba (de 72 a 79 entradas); yo no toco ninguna `*.ataque`.

### Lo hecho (todo en el árbol, sin commit)
- Paso 12: `shared/src/clases.ts` (`tipoDeElementoDelMuroSchema`, `resumenDeTareaSchema`, `publicacionSchema.tipo` y `tarea`), `tareas.ts` (esquemas y `CODIGOS_TAREAS` de 01b; `archivoIds` pasa los ids a minúsculas) e `index.ts`. `cd shared; npm run build` y `npm run lint` en verde (R-17 cumplida).
- Paso 13: `core/autoria.ts` (`puedeEditarTarea`, `puedeBorrarTarea`), `core/tareas/{tareas,recordatorio,texto}.ts`, `core/eventos/avisos-de-clase.ts`, con PR-1B01 a PR-1B05 (`npx vitest run src/core`: 35 archivos, 302 pruebas en verde).
- Paso 14: `adapters/queue/index.ts` (`encolar` con `inicio`, `cancelar` con `sql` obligatorio) y `colas.ts`; probado en `cola.integracion.test.ts` (5 casos nuevos; 16 en total, verde): `cancelar` dentro de una transacción revertida deja el trabajo en `created` (PA-19 no se activa).
- Paso 15: `handlers/adjuntos.ts` y `muro.ts` que lo importa.
- Paso 16: (a) `adapters/db/tareas.ts` sin la opción, `publicaciones.ts` con `tarea` y maestros con `tx`, `index.ts`; (b) ayuda `leerConLaClaseBorradaEnMedio` generalizada y PR-1B15 a PR-1B18b (salida en el scratchpad `lc-16b-rojo.txt`); (c) la opción (`instantaneaUnica: true` exactamente 2 veces en `tareas.ts`, ninguna en comentarios); (d) `lecturas-consistentes.integracion.test.ts`: `Tests  20 passed (20)`; `adapters/README.md`.
- Paso 17: `handlers/tareas/tareas.ts`, `app.ts`, `handlers/README.md`, `workers/README.md`.
- `cd backend; npm run lint` → código 0 (última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`).

### 16(b): la corrida en rojo antes de la opción
`cd backend; npx vitest run test/lecturas-consistentes.integracion.test.ts` → `Tests  4 failed | 16 passed (20)`:
- PR-1B15 en rojo por el defecto: `TypeError: Cannot read properties of null (reading 'autor')` (`publicacion: null`; `lecturas-consistentes…test.ts:694`).
- PR-1B16a en rojo por el defecto: `AssertionError: expected [] to deeply equal [ …(2) ]` (línea 722; página vacía).
- PR-1B16c en rojo por el defecto: `AssertionError: expected null to deeply equal { …(2) }` (línea 782; `tarea: null`).
- **PR-1B16b también salió en rojo** (el plan lo esperaba en verde): `AssertionError: expected [ Array(1) ] to deeply equal [ …(2) ]` (línea 743; falta `m3`). Es el mismo defecto: con el elemento del cursor movido de tema, el cursor de Prisma con `skip: 1` salta un elemento legítimo. No es "otra causa" (la función existe y no hay error de tipo ni de la ayuda), por eso no lo traté como PA-21; queda en verde con la opción (d). Lo señalo para el manager: PR-1B16b también es una prueba que demuestra el defecto.
- PR-1B17, PR-1B18a y PR-1B18b en verde.

### Rojo esperado 5, con la salida exacta
`lecturas-fx-r1` › "la opción solo se puede activar dentro de adapters/db: …": falla en `expect([...usos].sort()).toEqual(["adapters/db/clases.ts:4", "adapters/db/publicaciones.ts:2"])` solo por `+   "adapters/db/tareas.ts:2",` (Expected/Received: la lista trae además esa línea). Primero cayó por otra cosa, `nivel` (línea 777), porque un comentario mío en `tareas.ts` decía "REPEATABLE READ"; lo quité y la diferencia es solo `tareas.ts:2`.

### Sin ejecutar
La suite completa del backend (`npm test`), `lecturas-fx-r2` › "O-4" y `temas-01a-r1`/`r3` pasan en la corrida parcial de humo (`muro`, `archivos`, `temas-01a`, `lecturas`, `sesiones-y-cadena`, `guarda-todas`, `admin-muro`, `logs-muro`: `Tests  2 failed | 430 passed (432)`, los 2 rojos son el rojo 5 y este PA-05). Faltan: PR-1B06 a PR-1B14 (`esquemas-tareas`, `tareas.integracion`, `tareas-autoria.integracion`, `trabajo.integracion`, `tareas-concurrencia.integracion`, `tareas-autorizacion.integracion`), la I-2 de E6 (suma `tareas.ts`), los dobles `tarea: null` de las pruebas normales (backend y frontend), la verificación del paso 19 y V-04/V-05.

## TAREAS-01b — Implementación

Plan: `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/plan.md` (01b, base `<M1>` = `07e4ab7`, Enmiendas 1 y 2). La sección anterior, "Parada PA-05", queda como historial y está **superada**: el tester aplicó C-2 (01b) en `sesiones-y-cadena.ataque` (79 rutas, las 7 de V-06) y C-8b en `lecturas-fx-r1.ataque`, y desde ahí el "rojo esperado 5" ya no existe.
Pasos completados: 9 de 9 (pasos 12 a 20). Ninguna PARADA activa. PA-01: red `IZZI-F281-5G` (Public, de confianza permanente), regla "Campus: bloquear entrada a Docker en redes publicas" Enabled/Inbound/Block/Public, Docker encendido. R-17: `cd shared; npm run build` antes de toda corrida del backend.

### Archivos creados
- `backend/src/core/tareas/{tareas,recordatorio,texto}.ts` y sus `.test.ts`
- `backend/src/adapters/db/tareas.ts`, `backend/src/handlers/adjuntos.ts`, `backend/src/handlers/tareas/tareas.ts`
- `backend/test/{tareas.integracion,tareas-autoria.integracion,trabajo.integracion,tareas-concurrencia.integracion,tareas-autorizacion.integracion}.test.ts`

### Archivos modificados
- `shared/src/clases.ts`, `shared/src/tareas.ts`, `shared/src/index.ts`
- `backend/src/core/autoria.ts`, `core/eventos/avisos-de-clase.ts`
- `backend/src/adapters/queue/{index,colas}.ts`, `adapters/db/{publicaciones,index}.ts`, `adapters/README.md`
- `backend/src/handlers/clases/muro.ts`, `handlers/README.md`, `backend/src/workers/README.md`, `backend/src/app.ts`
- Pruebas normales (lista cerrada, A-3): `backend/src/core/autoria.test.ts`, `backend/test/{cola,lecturas-consistentes,bloqueo-usuario}.integracion.test.ts`, `backend/test/{ayudas-tareas.ts,esquemas-tareas.test.ts}`, y en el frontend solo dobles con `tarea: null`: `src/app/marco.test.tsx`, `src/features/clases/{adjuntos-de-publicacion,formulario-publicacion,muro-view,publicacion-del-muro}.test.tsx` y `lib.test.ts`. Ninguna `*.ataque` tocada por mí; el código de producción del frontend no cambió.

### Verificación (comando exacto y última línea)
- `cd shared; npm run build` → código 0, `> tsc -p tsconfig.json`; `cd shared; npm run lint` → `All matched files use Prettier code style!`.
- `cd backend; npm run lint` → código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- `cd backend; npm test` → código 0 (23:52:46Z a 23:54:35Z): `Test Files  169 passed (169)` · `Tests  2123 passed (2123)` · `Duration  103.98s`. Medición de carga antes de la corrida: CPU 12 %, RAM libre 15 285 de 32 436 MB, 3 procesos `node`. Sin rojos: no hubo tiempos límite ni rojos intermitentes (PA-12 no aplica) y `nombres-tokens-r2` pasó sin la excepción arbitrada.
- `npm run build` (raíz) → código 0, `✓ built in 802ms`; `npm run lint` (raíz) → código 0, última línea `> tsc -b`.
- `cd frontend; npm run lint` → código 0, `> tsc -b`; `cd frontend; npm test` → código 0, `Test Files  127 passed (127)` · `Tests  1852 passed (1852)`.
- Después de esas corridas solo cambié un comentario de `shared/src/tareas.ts` (para que V-04 dé 0); comprobé `shared` (build y lint) y volví a correr las cinco `*.ataque` estáticas (`temas-01a-r1`, `temas-01a-r3`, `lecturas-fx-r1`, `lecturas-fx-r2`, `sesiones-y-cadena`): `Test Files  5 passed (5)` · `Tests  115 passed (115)`.

### Rojos esperados de la ronda 0, todos en verde
1. `lecturas-fx-r2` › "O-4: …": verde (`editarTarea` usa `criterioRubrica.deleteMany`).
2. `temas-01a-r1` › "FOR KEY SHARE solo en adapters/db/referencias.ts; …": verde (existe `handlers/tareas/tareas.ts`).
3. `temas-01a-r3` › "ningún archivo nuevo de 01a ni de 01b usa console., …": verde (existen los cuatro archivos).
4. El `tsc` del frontend en `archivos-d-r2.ataque.test.tsx(486,7)`: verde (`cd frontend; npm run lint` → código 0; `publicacionSchema` ganó `tarea`).
- Además `lecturas-fx-r1` pasa completa (ocho lecturas, `tareas.ts:2`, exactamente 2 líneas de código con la opción y ninguna en comentario) y `sesiones-y-cadena` pasa con las 79 rutas. No cayó ninguna otra `*.ataque`.

### 16(b): salida de la corrida en rojo antes de la opción (`cd backend; npx vitest run test/lecturas-consistentes.integracion.test.ts`, guardada en `lc-16b-rojo.txt`): `Tests  4 failed | 16 passed (20)`
- **PR-1B15, rojo por el defecto:** `TypeError: Cannot read properties of null (reading 'autor')` (`publicacion: null`, línea 694 del archivo de pruebas).
- **PR-1B16a, rojo por el defecto:** `AssertionError: expected [] to deeply equal [ …(2) ]` (línea 722: la página sale vacía).
- **PR-1B16c, rojo por el defecto:** `AssertionError: expected null to deeply equal { …(2) }` (línea 782: `tarea: null`).
- **PR-1B16b también salió en rojo, y el plan lo esperaba en verde** (para el manager): `AssertionError: expected [ Array(1) ] to deeply equal [ …(2) ]` (línea 743; falta el elemento `m3`). Es el mismo defecto que PR-1B16a: con el elemento del cursor movido a otro tema, el `cursor` de Prisma con `skip: 1` salta un elemento legítimo del tema. No es "otra causa" (la función existe, sin error de tipo ni de la ayuda), así que no lo traté como PA-21; queda en verde con la opción. PR-1B16b es, por tanto, una cuarta prueba que demuestra el defecto.
- PR-1B17, PR-1B18a y PR-1B18b en verde (PR-1B18a y PR-1B18b son los controles: reproducen el defecto con la lectura anidada en read committed; PA-21 no se activa).
- Con la opción (paso 16 c y d): `Tests  20 passed (20)` (`lc-16d-verde.txt`).

### Pruebas requeridas (archivo y título exacto; los títulos completos salen de `npx vitest list`)
- **PR-1B01** → `backend/src/core/tareas/recordatorio.test.ts` (5): "PR-1B01: con la fecha 3 días después, el momento es fecha − 24 h exacta (milisegundos)"; "PR-1B01: a 24 h exactas, null (el momento sería ahora)"; "PR-1B01: a 23 h, null"; "PR-1B01: con la fecha pasada, null"; "PR-1B01: a 24 h y 1 ms, el momento es 1 ms después de ahora".
- **PR-1B02** → `backend/src/core/tareas/recordatorio.test.ts` (6): "PR-1B02: la misma fecha, con o sin trabajo, no hace nada"; "PR-1B02: una fecha nueva con trabajo cancela el actual y programa el nuevo"; "PR-1B02: una fecha nueva cuyo momento ya pasó solo cancela"; "PR-1B02: sin trabajo y con una fecha nueva futura, solo programa"; "PR-1B02: borrar (fecha nueva null) cancela el trabajo si hay y no hace nada si no"; "PR-1B02: una fecha que difiere por 1 ms cuenta como otra fecha".
- **PR-1B03** → `backend/src/core/tareas/tareas.test.ts` (10): "PR-1B03: al crear, a 366 días rechaza"; "PR-1B03: al editar, conservar la misma fecha ya pasada pasa"; "PR-1B03: con categorías en la clase y sin una elegida, 409 CATEGORIA_REQUERIDA"; "PR-1B03: sin categorías en la clase, la tarea puede quedar sin categoría"; y seis más.
- **PR-1B04** → `backend/src/core/autoria.test.ts` (3): "PR-1B04: puedeEditarTarea, matriz completa actor × autor"; "PR-1B04: puedeBorrarTarea, matriz completa actor × autor"; "PR-1B04: el admin edita la suya (S-09) y la borra; el estudiante nunca puede".
- **PR-1B05** → `backend/src/core/tareas/texto.test.ts` (4): "PR-1B05: pasa CRLF y CR a LF y recorta en título, instrucciones y criterios"; "PR-1B05: lo que no es texto queda intacto (criterios, título, rúbrica que no es arreglo)"; "PR-1B05: un cuerpo que es arreglo, null o texto queda intacto"; "PR-1B05: no muta lo recibido".
- **PR-1B06** → `backend/test/esquemas-tareas.test.ts` (15): "PR-1B06: la fecha con Z y con desfase pasa; sin zona o de otro tipo rechaza"; "PR-1B06: los puntos son enteros de 1 a 1000 y no se coaccionan desde texto"; "PR-1B06: sin-tema y un uuid pasan; otro texto o la ausencia rechazan"; "PR-1B06: una tarea con su resumen pasa; sin la clave tarea rechaza; en un anuncio o material va null"; y once más.
- **PR-1B07** → `backend/test/tareas.integracion.test.ts` (10): "PR-1B07: crear responde 201 con el detalle completo, sin trabajo_id ni rol del autor"; "PR-1B07: en el muro aparece con tipo tarea y su resumen"; "PR-1B07: TAREA_CREADA lleva el id de la tarea y solo ids; RECORDATORIO_24H queda en created con start_after = fecha − 24 h y su id en trabajo_id"; "PR-1B07: a menos de 24 h no se programa recordatorio y trabajo_id queda nulo"; "PR-1B07: los adjuntos quedan confirmados en la publicación de la tarea y salen en el detalle"; "PR-1B07: con categorías en la clase se exige una (409 CATEGORIA_REQUERIDA) y sin categorías no"; "PR-1B07: una categoría o un tema de otra clase responde 404 sin tarea, publicación ni trabajo"; "PR-1B07: el admin crea la tarea y sale firmada Administración, sin rol"; y dos más.
- **PR-1B08** → `backend/test/tareas.integracion.test.ts` (10): "PR-1B08: cambiar la fecha deja el trabajo anterior en cancelled y uno nuevo en created con otro id"; "PR-1B08: cambiar solo el título deja el mismo trabajo y no encola otro TAREA_CREADA"; "PR-1B08: mover la fecha a menos de 24 h cancela el recordatorio sin programar otro"; "PR-1B08: los criterios de la rúbrica se reemplazan"; "PR-1B08: los adjuntos se conservan, se agregan y se quitan (descartado)"; "PR-1B08: TAREA_CREADA no se vuelve a encolar al editar la fecha"; "PR-1B08: un archivo conservado que ya no es de esa tarea responde 400 sin cambiar nada"; y tres más.
- **PR-1B09** → `backend/test/tareas-autoria.integracion.test.ts` (8): "PR-1B09: un maestro contra la tarea del otro maestro, 403 al editar y al borrar, sin escribir y con el trabajo igual"; "PR-1B09: un maestro contra la tarea del admin, 403 al editar y al borrar, sin escribir y con el trabajo igual"; "PR-1B09: un maestro contra la tarea de un maestro retirado de la clase pasa al editar y al borrar"; "PR-1B09: el admin edita la de un maestro (403 EDICION_NO_PERMITIDA) y la borra (204); edita la suya"; "PR-1B09: puedeEditar y puedeBorrar del detalle y del muro coinciden con el resultado real en cada actor y autor"; y tres más.
- **PR-1B10** → `backend/test/tareas.integracion.test.ts` (4): "PR-1B10: borrar responde 204 y quita publicación, tarea y criterios; adjuntos a descartado; los dos trabajos a cancelled"; "PR-1B10: DELETE …/publicaciones/:id sobre una tarea responde 404 y nada cambia"; "PR-1B10: comentar o listar los comentarios de una tarea responde 404"; "PR-1B10: borrar una tarea sin recordatorio solo cancela TAREA_CREADA, y una inexistente o de otra clase responde 404".
- **PR-1B11** → `backend/test/trabajo.integracion.test.ts` (9): "PR-1B11: por tema, del más reciente al más antiguo, con materiales y tareas y sin anuncios"; "PR-1B11: sin-tema trae solo lo que no tiene tema, también del más reciente al más antiguo y sin anuncios"; "PR-1B11: un cursor de otro tema, de otra clase, de un anuncio o borrado responde 400 «cursor: no es válido»"; "PR-1B11: un tema de otra clase o inexistente responde 404 TEMA_NO_ENCONTRADO"; "PR-1B11: puedeMover es true para el maestro y el admin y false para el estudiante"; "PR-1B11: los materiales traen texto y adjuntos y las tareas su resumen, sin la clave del objeto"; y tres más.
- **PR-1B12** → `backend/test/tareas-concurrencia.integracion.test.ts` (6): "PR-1B12: dos ediciones de fecha simultáneas dejan un solo RECORDATORIO_24H en created y es el de trabajo_id"; "PR-1B12: editar y borrar a la vez no deja ningún recordatorio vivo"; "PR-1B12: guardar categorías que quita una con la que se crea una tarea: o la tarea existe y el guardado da 409, o el guardado gana y la creación da 404"; "PR-1B12: borrar un tema mientras se crea una tarea con él: la tarea queda sin tema o la creación da 404, nunca 500"; y dos más.
- **PR-1B13** → `backend/test/tareas.integracion.test.ts` (4), con los títulos exactos del plan: "editar: si falla el encolado del recordatorio nuevo, el recordatorio viejo sigue en created y la tarea no cambia"; "borrar: si falla la cancelación de TAREA_CREADA, la tarea sigue y su recordatorio sigue en created"; "crear: si falla el encolado de RECORDATORIO_24H, no queda la tarea ni TAREA_CREADA"; "editar: si falla la cancelación del recordatorio viejo, la edición no se guarda".
- **PR-1B14** → `backend/test/tareas-autorizacion.integracion.test.ts` (12): "PR-1B14: cada ruta: sin token, 401 NO_AUTENTICADO"; "PR-1B14: cada ruta: con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO"; "PR-1B14: cada ruta: estudiante restringido inscrito, 403 ACCESO_RESTRINGIDO"; "PR-1B14: las tres rutas de escritura: el estudiante inscrito recibe 403 ROL_NO_PERMITIDO"; "PR-1B14: cada ruta: maestro de otra clase y, donde aplica, estudiante no inscrito, 403 SIN_ACCESO_A_LA_CLASE"; "PR-1B14: el detalle y la lista para el estudiante no llevan trabajo_id, rol, correos ni estadoPago en ninguna profundidad"; y seis más.
- **PR-1B15 a PR-1B18b** → `backend/test/lecturas-consistentes.integracion.test.ts`, en un `describe` nuevo, con estos títulos exactos:
  - "PR-1B15 · leerTarea con la tarea borrada entre su fila y su publicación devuelve la tarea completa de la instantánea"
  - "PR-1B16a · listarTrabajo con el elemento del cursor borrado entre su comprobación y la página devuelve los elementos que siguen"
  - "PR-1B16b · listarTrabajo con el elemento del cursor movido a otro tema entre su comprobación y la página devuelve los elementos que siguen del tema"
  - "PR-1B16c · listarTrabajo con una tarea de la página borrada entre la página y su fila de tareas devuelve su resumen de la instantánea"
  - "PR-1B17 · listarPublicaciones con una tarea de la página borrada entre la página y su fila de tareas devuelve su resumen de la instantánea"
  - "PR-1B18a · control: listarTrabajo anidada en una transacción read committed, con el elemento del cursor borrado tras comprobarlo, devuelve la página vacía"
  - "PR-1B18b · control: listarPublicaciones anidada en una transacción read committed, con una tarea de la página borrada entre la página y su fila de tareas, devuelve la tarea sin resumen"
- Todas las viñetas tienen caso; ninguna queda "no cubierta". I-2: `bloqueo-usuario.integracion` › "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts, publicaciones.ts, referencias.ts, temas.ts, categorias.ts y tareas.ts usan SQL etiquetado en adapters/db" (suma `tareas.ts`, que bloquea la tarea con `FOR NO KEY UPDATE OF t` y `FOR UPDATE OF t`). Además, en `cola.integracion.test.ts` (A-4) 5 casos nuevos: política de las dos colas, `encolar` con `inicio`, `cancelar` confirmado, `cancelar` revertido (queda en `created`; descarta PA-19) y `cancelar` de un id inexistente.

### Conteos
- Backend: `cd backend; npx vitest list > <scratchpad>/vl-1b.txt` → 2123 líneas (2123 pruebas) y 169 archivos distintos; coincide con la corrida. Contra la ronda 0 de 01b (161 archivos y 2005 pruebas): +8 archivos (los tres `core/tareas` y los cinco de `test/`) y +118 pruebas = 113 con el prefijo `PR-1B` más los 5 casos de `cola.integracion` (`grep -c "PR-1B"` sobre esa lista da 113; PR-1B13 no lleva el prefijo en su título, que es el exacto del plan).
- Frontend: `cd frontend; npx vitest list` → 1852 pruebas; la corrida da 127 archivos y 1852 pruebas, igual que antes (solo cambiaron dobles).

### PA-07 (`npm test`, salida completa, `grep -o -F` por término)
`40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 10 · `"code":"P2028"` 5 · `Unable to start a transaction` 0 · `too_small` 0.
- Los 10 son exactamente I-1, atribuidos por la última "incoming request" del mismo `pid` y `requestId`: 5 `POST /api/auth/login` "fallo simulado de la base en la búsqueda", 1 `POST /api/auth/login` "…al crear la sesión", `POST …/archivos`, `POST …/archivos/:id/descarga` y `GET …/publicaciones` con `ZodError`, y `GET /api/prueba/error-comun` "boom". Ninguno de una ruta de TAREAS-01.
- Los 5 `P2028` son los permitidos, con control positivo completo: `cuentas-r3` (`POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`) y `servicio-ocupado` (`POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()` y `POST …/comentarios` › `$queryRawUnsafe`). Ninguno de rutas de TAREAS-01; `GET /api/admin/clases` no dio ningún error.

### V-01, V-04, V-05, V-06
- **V-01:** sha256 de las 147 `*.ataque` contra la tabla unificada de "Complementaria: C-2 (01b) y C-8b": `diff` vacío, 147 de 147 iguales (incluidas `sesiones-y-cadena` `6111F6BC…CA1E` y `lecturas-fx-r1` `B8451A76…A9E8`).
- **V-04** (búsquedas en el código de producción): usos de la opción `instantaneaUnica: true`: `adapters/db/clases.ts:4`, `publicaciones.ts:2`, `tareas.ts:2` (en `tareas.ts` solo en `leerTarea` y `listarTrabajo`, y ningún otro archivo de código la lleva); `$queryRawUnsafe` en código: 1 (`cliente.ts`); `$queryRaw` y `$executeRaw` solo en los archivos de `adapters/db` ya conocidos más `tareas.ts` (etiquetados); `FOR KEY SHARE` solo en `referencias.ts` (en los demás archivos solo aparece en comentarios; lo vigila `temas-01a-r1`); `tipo: "tarea"` en una escritura solo en `adapters/db/tareas.ts`; `addHook` en `handlers/`: 0; `notifier` en `handlers/` (código): 0; `console.` en archivos nuevos: 0; `trabajoId` o `trabajo_id` en `shared/src/`: 0; `puedeEditarTarea` y `puedeBorrarTarea` definidos solo en `core/autoria.ts`; `estadoPago` en `backend/src/`: los mismos archivos de hoy (ninguno nuevo).
- **V-05:** ningún archivo de "No se toca" cambió contra `07e4ab7` (`git diff --quiet` y `git status --porcelain` por ruta; en `backend/src/workers` solo cambia `README.md`, permitido en 01b); `backend/package.json`, `frontend/package.json` y `package-lock.json` sin cambios; en `frontend/src` solo los seis dobles de pruebas normales y las `*.ataque` que reescribió el tester.
- **V-06:** las 79 rutas de `printRoutes` (las de `<M1>` más exactamente las 7 de 01b) las verifica `sesiones-y-cadena` (verde); `RUTAS_PUBLICAS` sin cambios.

### Desviaciones y decisiones donde el plan calla
1. **PR-1B16b salió en rojo antes de la opción**, aunque el plan lo esperaba en verde (arriba, para el manager). No cambia el remedio.
2. **El paso 15 ("la suite del muro igual antes de seguir") no podía cumplirse hasta el paso 16 (a):** con `publicacionSchema` exigiendo `tarea` (paso 12), el muro responde un `500` hasta que `listarPublicaciones` trae la relación y `muro.ts` mapea `tarea`. Moví ese mapeo (`tareaParaResponder`, fecha en ISO) junto con `publicaciones.ts` y corrí la suite del muro justo después.
3. **`archivoIds` de `crearTareaSchema` pasa los ids a minúsculas** (`transform`), para que conservar un adjunto al editar compare igual contra la base. `archivoIdsSchema` (compartido con el muro) no cambia.
4. **`leerTarea` y `listarTrabajo` se escribieron como una función interna que recibe `db`** (`leerTareaCon`, `listarTrabajoCon`) y una exportada que la envuelve: en 16(a) llama directo con el `ejecutor` y en 16(c) la envuelve en `enTransaccion(…, { instantaneaUnica: true })`. Mismo resultado que el plan; hace de la opción un cambio de una línea por función.
5. **`puedeMover` lo calcula el handler** con `puedeMoverElemento(relacion)` (core) y el adaptador no lo conoce.
6. Un comentario mío que decía "REPEATABLE READ" en `tareas.ts` hizo caer un caso de `lecturas-fx-r1` por el patrón del nivel; lo quité (el nivel solo vive en `cliente.ts`).
7. **Ayudas nuevas en `ayudas-tareas.ts`** (permitido, solo se agregan): `crearCriteriosDePrueba`, `trabajosDeTarea`, `trabajosDeLaClase`, `diasDespues` y `cuerpoDeTarea`.

### Pendiente o fuera de alcance detectado
- Los textos "Al cerrar 01b" (ESSENTIALS "Autoría", "Restricciones clave" y "Archivos"; PRD RN-07; `ARCHITECTURE.md` §7, §8, §10, §11 y §14; `CLAUDE.md`) los aplica el orquestador (A-9); no los toqué. Sí actualicé los README de `adapters`, `handlers` y `workers`, incluida la línea de módulos de `adapters/README.md` (sin `scheduler`).
- Fila para ESTADO §3: el consumidor de `TAREA_CREADA` y `RECORDATORIO_24H` (NOTIFICACIONES, §D-5).
- `GET …/tareas/:tareaId` y `GET …/trabajo` ocupan una conexión durante 4 a 6 sentencias (R-06); con el pool lleno más de 2 s responden `503 SERVICIO_OCUPADO`, ya cubierto por la regla.

## TAREAS-01c — Implementación

Plan: `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/plan.md` (01c, solo con P-05 a, A-7; Enmienda 3). Base `<K1b>` = `ebfe126`. Solo frontend; el backend no se corrió.
Pasos completados: 4 de 4 (pasos 22 a 25).
Sin PARADAS: ninguna `*.ataque` cayó por algo distinto de la ruta de un `vi.mock` (no hubo ningún `vi.mock` que cambiar) y ningún movimiento obligó a cambiar comportamiento.

### Tabla de movimientos (todos aplicados)
| Qué | De (`features/clases/`) | A | Reexportación o envoltorio |
|---|---|---|---|
| `ConClaseDeLaRuta` y su texto | `components/con-clase-de-la-ruta.tsx`, `TEXTOS_CLASE.sinAcceso` | `components/clase/con-clase-de-la-ruta.tsx`, `components/clase/data.ts` (`TEXTOS_DE_LA_CLASE.sinAcceso`) | `export { ConClaseDeLaRuta } from …` (mismo objeto); `TEXTOS_CLASE.sinAcceso` ahora vale `TEXTOS_DE_LA_CLASE.sinAcceso` |
| `FirmaDelAutor` y el texto de la firma (Enmienda 3) | `components/firma-del-autor.tsx`, `TEXTOS_MURO.firmaAdministracion`, `import { FIRMA_ADMINISTRACION }` de `data.ts` | `components/clase/firma-del-autor.tsx` y `components/clase/data.ts` (`TEXTOS_DE_LA_CLASE = { sinAcceso, firmaAdministracion: FIRMA_ADMINISTRACION }`) | `export { FirmaDelAutor } from …` (mismo objeto); `data.ts` pierde la clave y el `import` |
| `Perspectiva`, `perspectivaDeRuta`, `baseDeClase` y las bases | `types.ts`, `lib.ts`, `data.ts` | `lib/ruta-de-clase.ts` (más `BASES_POR_PERSPECTIVA`, que `CAPACIDADES_POR_PERSPECTIVA` lee) | `export … from` en `types.ts` y `lib.ts` (mismos objetos) |
| `AdjuntosDePublicacion`, `ListaDeAdjuntosElegidos` | `components/` | `components/adjuntos/` (mismos nombres de archivo) | Lista: reexportación (mismo objeto). `AdjuntosDePublicacion`: envoltorio con el mismo nombre y las mismas props, que pasa `mensajeDeErrorClases`; el compartido recibe `mensajeDeError` |
| `useSolicitarSubida`, `useUrlDeDescarga` | `hooks.ts` | `components/adjuntos/hooks.ts` | `export … from` (mismos objetos) |
| `tipoDeArchivo`, `errorDeArchivoElegido`, `avisoDeFalloAlSubir`, frescura de `tiempoFrescoDelMuro` | `lib.ts` | `components/adjuntos/lib.ts` (`avisoDeFalloAlSubir` con los mensajes como parámetro; `tiempoFrescoDeAdjuntos(adjuntos, dataUpdatedAt, tiempoSinVistasPrevias)`) | `tipoDeArchivo` y `errorDeArchivoElegido`: reexportación. `avisoDeFalloAlSubir` y `tiempoFrescoDelMuro`: envoltorios con la misma firma y salida |
| `TEXTOS_ADJUNTOS`, `ACCEPT_DE_ADJUNTOS`, `MARGEN_DE_VISTA_PREVIA_MS` | `data.ts` | `components/adjuntos/data.ts` | `export … from` (mismos objetos) |
| `ArchivoCandidato` | `types.ts` | `components/adjuntos/types.ts` | `export type … from` |
| `erroresPorCampo`, `esErrorDeCursor`, el quitado del prefijo, `erroresDeFormularioClases` | `lib.ts`, `types.ts` | `lib/errores-de-api.ts` (más `ErroresFormulario`, `IncidenciaValidacion`, `campoDeErrorDeApi`, `erroresDeFormularioDeApi` con los mensajes como parámetro) | `erroresPorCampo` y `esErrorDeCursor`: reexportación; `erroresDeFormularioClases`: envoltorio con la misma firma y salida; los dos tipos se reexportan |
| `clavePublicaciones` | `data.ts` | `services/clasesService.ts` | `export … from` en `data.ts` (mismo objeto) |

Ninguna vista, texto, foco, petición ni aserción cambió. Ningún archivo compartido (`components/`, `lib/`, `services/`) importa de `features/` (0 coincidencias). Ningún archivo se borró: los orígenes quedan como reexportación de una línea (o el envoltorio de `AdjuntosDePublicacion`). No se movieron los ganchos de foco ni nada más.

### Verificación (comando exacto y última línea)
- `cd frontend; npm test` después de cada grupo: adjuntos → `Test Files  1 failed | 126 passed (127)` · `Tests  1 failed | 1851 passed (1852)` (el único rojo era O-07, esperado, y `styles/clases-r1` ya pasó a verde); clase → `Test Files  127 passed (127)` · `Tests  1852 passed (1852)` (O-07 en verde). Los grupos ruta de clase, errores y clave del muro los hice seguidos y corrí la suite una vez al terminar los tres (con `tsc -b` y ESLint tras cada uno): `Test Files  127 passed (127)` · `Tests  1852 passed (1852)`.
- `cd frontend; npm run lint` → código 0, última línea `> tsc -b`.
- `cd frontend; npm test` (final) → código 0, `Test Files  128 passed (128)` · `Tests  1864 passed (1864)`.
- `cd frontend; npm run build` → código 0, `✓ built in 661ms`.
- `npm run build` (raíz) → código 0, `✓ built in 669ms`; `npm run lint` (raíz) → código 0, última línea `> tsc -b`.

### Rojos esperados de la ronda 0: los dos en verde
1. `styles/clases-r1.ataque.test.ts` › "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 40 enEspera": verde desde el grupo de adjuntos (`components/adjuntos/adjuntos-de-publicacion.tsx` con 1 `enEspera=`; el envoltorio de origen, 0).
2. `features/clases/estatico-02c-r1.ataque.test.ts` › "O-07: `administracion` solo se lee en firma-del-autor.tsx, …": verde desde el grupo de clase (las tres líneas de `FIRMA_ADMINISTRACION`/`firmaAdministracion` son dos de `components/clase/data.ts` y una de `components/clase/firma-del-autor.tsx`; quité el nombre de la clave de un comentario para no sumar una línea).

### PR-1C01 (conteos con `npx vitest list`)
- Antes de 01c: `cd frontend; npx vitest list > <scratchpad>/vl-front-antes-01c.txt` → 1852 pruebas (la corrida da 127 archivos).
- Después: `… > vl-front-despues-01c.txt` → 1864 pruebas; la corrida da `Test Files  128 passed (128)` · `Tests  1864 passed (1864)`: +1 archivo y +12 casos, exactamente `reexportaciones-01c.test.ts` y sus 12 casos (`grep -c "reexportaciones-01c"` = 12).
- V-01: sha256 de las 150 `*.ataque` contra la tabla de "Complementaria: O-07 (Enmienda 3)": `diff` vacío, 150 de 150 iguales; no cambié ninguna.

### PR-1C02 → `frontend/src/features/clases/reexportaciones-01c.test.ts` (12 casos)
- "PR-1C02: adjuntos: ListaDeAdjuntosElegidos, los dos hooks, los textos, el accept y el margen"
- "PR-1C02: adjuntos: tipoDeArchivo y errorDeArchivoElegido"
- "PR-1C02: clase: ConClaseDeLaRuta y FirmaDelAutor"
- "PR-1C02: clase: el texto de la firma y el de «sin acceso» viven en components/clase/data.ts"
- "PR-1C02: ruta de clase: perspectivaDeRuta, baseDeClase y las bases de CAPACIDADES_POR_PERSPECTIVA"
- "PR-1C02: errores: erroresPorCampo y esErrorDeCursor"
- "PR-1C02: clave del muro: clavePublicaciones"
- "PR-1C02: los tipos movidos son los mismos (Perspectiva, ArchivoCandidato, ErroresFormulario, IncidenciaValidacion)"
- "PR-1C02: avisoDeFalloAlSubir da lo mismo que la versión compartida con mensajeDeErrorClases"
- "PR-1C02: erroresDeFormularioClases da lo mismo que la versión compartida con mensajeDeErrorClases"
- "PR-1C02: tiempoFrescoDelMuro da lo mismo que tiempoFrescoDeAdjuntos sobre los adjuntos de todas las páginas"
- "PR-1C02: AdjuntosDePublicacion conserva el nombre y sigue siendo un componente distinto del compartido"
- Con `toBe` van todos los símbolos de reexportación (funciones, hooks, objetos de texto y claves); los envoltorios (`avisoDeFalloAlSubir`, `erroresDeFormularioClases`, `tiempoFrescoDelMuro`, `AdjuntosDePublicacion`) no pueden ser el mismo objeto, por diseño de §D-9, y se comprueban por nombre y salida.

### Archivos
`git diff --name-only ebfe126` (excluida la carpeta de trabajo): todo dentro de `frontend/src`.
- Modificados: `features/clases/{data,hooks,lib,types}.ts`, `services/clasesService.ts`, y las dos `*.ataque` que reescribió el tester en la ronda 0 (`features/clases/estatico-02c-r1`, `styles/clases-r1`).
- Renombrados con `git mv` (quedan en el índice como renombrados): `components/adjuntos/{adjuntos-de-publicacion,lista-de-adjuntos-elegidos}.tsx` y `components/clase/{con-clase-de-la-ruta,firma-del-autor}.tsx`.
- Nuevos: `components/adjuntos/{data,hooks,lib,types}.ts`, `components/clase/data.ts`, `lib/{errores-de-api,ruta-de-clase}.ts`, las cuatro reexportaciones y el envoltorio de `features/clases/components/` (con los nombres de siempre) y `features/clases/reexportaciones-01c.test.ts`.
- No toqué `app/router.tsx`, `components/ui/**`, `components/layout/**`, los demás servicios, `features/auth`, `features/admin`, `styles/**`, `lib/format.ts`, `utils.ts`, `cache-de-mutaciones.ts` ni `variante-de-clase.ts`; `package.json` y el lock sin cambios.

### Desviaciones y decisiones donde el plan calla
1. **`AdjuntosDePublicacion` es un envoltorio, no una reexportación.** El componente compartido necesita `mensajeDeErrorClases` (de `features/clases`) y lo recibe por la prop `mensajeDeError`; el archivo de origen conserva el nombre y las props y se lo pasa. Es lo que §D-9 dice para lo que usaba `mensajeDeErrorClases`, pero el plan también pide `toBe` para cada símbolo movido: para este no puede cumplirse.
2. **"Los mensajes de error de archivos" (§D-9, fila de `data.ts`):** interpreté que son los `error*` de `TEXTOS_ADJUNTOS` (se movieron con él). `MENSAJES_ERROR_CLASES_GENERALES` (`archivoNoSubido`, `archivoInvalido`, `almacenNoDisponible`) se quedó en `features/clases/data.ts` porque lo usa `mensajeDeErrorClases`, que no se mueve.
3. **`TIEMPO_FRESCO_DEL_MURO_MS` no se movió:** el cálculo compartido recibe el tiempo sin vistas previas como parámetro y `tiempoFrescoDelMuro` se lo pasa.
4. **Los grupos 3 a 5 (ruta de clase, errores, clave del muro) no tuvieron la corrida completa de `npm test` cada uno:** los hice seguidos, con `tsc -b` y ESLint después de cada uno, y corrí la suite al terminar los tres (verde, 127 y 1852).
5. `npx prettier --write` acotado a `frontend/src` (carpetas de `features/clases`, `components/adjuntos`, `components/clase`, `lib`, `services`); comprobé con V-01 que ninguna `*.ataque` cambió.

### Pendiente o fuera de alcance detectado
- Los textos "Al cerrar 01c" de `CLAUDE.md` (ubicaciones compartidas nuevas) los aplica el orquestador (A-9); no los toqué.
- O-1 del tester: `features/clases/estatico-r1` revisa `?? []` y los ternarios anidados solo dentro de `features/clases/**`; lo movido a `components/`, `lib/` y `services/` queda fuera de esa revisión (comprobé a mano que los archivos nuevos no tienen `?? []`, `fetch(`, `dangerouslySetInnerHTML` ni `target="_blank"`).
- 01d puede importar de las ubicaciones compartidas (`components/clase`, `components/adjuntos`, `lib/ruta-de-clase`, `lib/errores-de-api`, `services/clasesService`) sin tocar `features/clases`.

## TAREAS-01c — Corrección de M-01

### M-01 corregido
Los mensajes de error de archivos ya viven en `components/adjuntos/data.ts` (§D-9): `MENSAJES_ERROR_DE_ARCHIVOS` (`archivoNoSubido`, `archivoInvalido`, `almacenNoDisponible`, con los mismos textos) y `MENSAJES_POR_CODIGO_DE_ARCHIVO` (el mapa de `ARCHIVO_NO_SUBIDO`, `ARCHIVO_INVALIDO`, `ALMACEN_NO_CONFIGURADO` y `ALMACEN_NO_DISPONIBLE`; es un dato, así que va en `data.ts`).
- `features/clases/data.ts`: `MENSAJES_ERROR_CLASES_GENERALES` conserva sus claves y ahora toma esos tres valores de `MENSAJES_ERROR_DE_ARCHIVOS`; además reexporta `MENSAJES_ERROR_DE_ARCHIVOS` (mismo objeto).
- `features/clases/lib.ts`: el mapa de `mensajeDeErrorClases` esparce `MENSAJES_POR_CODIGO_DE_ARCHIVO` en lugar de las cuatro líneas. Misma salida, mismas claves.
- Caso nuevo en `features/clases/reexportaciones-01c.test.ts`: "PR-1C02: los mensajes de error de archivos y su mapa por código viven en components/adjuntos/data.ts y features/clases los usa igual" (mismo objeto por la ruta vieja y la nueva, los tres valores de `MENSAJES_ERROR_CLASES_GENERALES`, las cuatro claves del mapa y la salida de `mensajeDeErrorClases` por cada código).

### Hermanos
No encontré hermanos. Lo que el formulario de tarea de 01d necesita de los adjuntos ya está en `components/adjuntos/` (`TEXTOS_ADJUNTOS`, `ACCEPT_DE_ADJUNTOS`, `MARGEN_DE_VISTA_PREVIA_MS`, los dos ganchos, `tipoDeArchivo`, `errorDeArchivoElegido`, `avisoDeFalloAlSubir`, `tiempoFrescoDeAdjuntos`, las dos listas) o en servicios compartidos (`subirArchivo` de `services/almacenService.ts`). El resto de `MENSAJES_ERROR_CLASES_GENERALES` y `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` es de CLASES o genérico (no son de adjuntos); el mensaje genérico y los códigos propios de tareas los armará `mensajeDeErrorTareas` en 01d.

### Verificación (comando y última línea)
- `cd frontend; npm run lint` → código 0, `> tsc -b`.
- `cd frontend; npm test` → código 0, `Test Files  128 passed (128)` · `Tests  1865 passed (1865)`. Los dos rojos esperados siguen en verde.
- `cd frontend; npm run build` → código 0, `✓ built in 685ms`.
- `npm run build` (raíz) → código 0, `✓ built in 691ms`; `npm run lint` (raíz) → código 0, `> tsc -b`.
- Conteos: `cd frontend; npx vitest list` → 1865 pruebas (1864 + 1 caso nuevo); 13 casos de `reexportaciones-01c.test.ts`.
- V-01: 150 de 150 iguales; no toqué ninguna `*.ataque`.
- `git diff --name-only ebfe126` (sin la carpeta de trabajo): los mismos archivos de la sección anterior, ninguno nuevo; de ellos, esta corrección solo editó `components/adjuntos/data.ts`, `features/clases/data.ts`, `features/clases/lib.ts` y `reexportaciones-01c.test.ts`. Recordatorio del manager para el commit `<K1c>`: los cuatro `git mv` exigen `git add` de las dos rutas de cada uno (la nueva y la de origen).

### Desviaciones
Ninguna. Corrí la suite completa tras el cambio (un solo grupo).
