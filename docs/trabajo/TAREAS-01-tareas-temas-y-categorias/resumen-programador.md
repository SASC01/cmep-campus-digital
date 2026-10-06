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
