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

## TAREAS-01d — Implementación

Plan: `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/plan.md` (01d, pasos 27 a 33; Enmienda 4, C-13). Base `<K1c>` = `ad670c9`. Solo frontend; el backend no se corrió.
Pasos completados: 7 de 7 (27 a 33).

**Nota de la interrupción.** La sesión se cortó una vez por el límite de tokens, justo después de crear `features/tareas/types.ts` y `data.ts` y de empezar `lib.ts` (que tenía un marcador provisional). Se reanudó desde ahí: `lib.ts` se escribió completo, y de ahí en adelante se hizo todo lo demás sin rehacer lo anterior. Una segunda parada, PA-20, se activó en el paso 32 (V-07, ver abajo) y se resolvió fuera de mi trabajo (el arquitecto sumó la lista a C-13 y el tester reescribió `styles/clases-r1.ataque.test.ts`).

### Archivos (todos en `frontend/src` salvo `docs/DESIGN.md`)
- Paso 27: `components/ui/native-select.tsx` y `.test.tsx`; `lib/vencimiento.ts` y `.test.ts`; `services/trabajoService.ts`.
- Paso 28, `features/tareas/`: `types.ts`, `data.ts`, `lib.ts`, `lib.test.ts`, `hooks.ts` (con `useRutaDeLaClase`, único llamador de `perspectivaDeRuta` del módulo), `crear-tarea-view.tsx`, `editar-tarea-view.tsx`, `detalle-tarea-view.tsx`, y `components/`: `formulario-tarea.tsx`, `editor-de-rubrica.tsx`, `lista-de-adjuntos-publicados.tsx`, `rubrica-de-solo-lectura.tsx`, `detalles-de-la-tarea.tsx`, `tu-trabajo.tsx`, `acciones-de-la-tarea.tsx` (único lector de `tarea.puedeBorrar`); más `formulario-tarea.test.tsx`, `editar-tarea-view.test.tsx`, `detalle-tarea-view.test.tsx`.
- Paso 29, `features/clases/`: `components/tarjeta-de-tarea.tsx` (nuevo; recibe `perspectiva` por props, no lee `puedeBorrar`, sin `enEspera`), `tarjeta-de-tarea.test.tsx` (nuevo), `components/publicacion-del-muro.tsx` (despachador), `muro-view.tsx` ("Crear tarea", enlace `outline` con `Plus`), `data.ts` (`crearTarea` false/true/true, `TEXTOS_MURO.crearTarea`, `TEXTOS_TARJETA_DE_TAREA`), `types.ts` (`crearTarea`). `muro-view.test.tsx` no cambió.
- Paso 30: `app/router.tsx` y `app/router.test.tsx`.
- Paso 31: `docs/DESIGN.md`.

### Pruebas requeridas
(Los títulos exactos salen de `npx vitest list`, guardado en el scratchpad como `vl-front-despues-01d.txt`.)
- PR-1D01 → `frontend/src/lib/vencimiento.test.ts`, 14 casos: "PR-1D01: el umbral vale 72 horas", "PR-1D01: a 71 h 59 min es próxima y a 72 h exactas también", "PR-1D01: a 72 h 1 min es pendiente", "PR-1D01: \"Vence hoy a las …\" con la hora local de 24 h", "PR-1D01: \"Vence mañana a las …\"", "PR-1D01: \"Vence en 2 días\" y \"Vence en 3 días\" (días de calendario)", "PR-1D01: una fecha pasada es vencida y dice «Venció el …»; la fecha exacta de ahora también", "PR-1D01: pasada la medianoche local, 45 minutos después es «mañana», no «hoy»", "PR-1D01: una fecha inválida da un valor explícito, no el texto recibido ni «Invalid Date»", y los demás de la lista.
- PR-1D02 → `frontend/src/features/tareas/lib.test.ts`, 16 casos: "PR-1D02: fechaLocalAIso y isoAFechaLocal son inversas", "PR-1D02: una fecha vacía o inválida da cadena vacía", "PR-1D02: suma solo los enteros válidos", "PR-1D02: arma el cuerpo válido con la fecha en UTC", "PR-1D02: con categorías en la clase y ninguna elegida, error en categoriaId", "PR-1D02: un código conocido da su mensaje fijo", "PR-1D02: un VALIDACION quita el prefijo del campo", "PR-1D02: FECHA_LIMITE_INVALIDA va al campo fechaLimite y un 500 a ninguno", y los demás.
- PR-1D03 → `frontend/src/features/tareas/formulario-tarea.test.tsx`, 17 casos: "PR-1D03: enviar vacío muestra los errores del cliente con ErrorDeCampo y no hace ninguna petición"; "PR-1D03: un error de campo del servidor se muestra bajo el campo y no como aviso"; "PR-1D03: con categorías, la opción inicial es «Elige una categoría» y enviar sin elegir no hace ninguna petición"; "PR-1D03: sin categorías en la clase, «Sin categoría» es la única opción"; "PR-1D03: el control de entregas tardías usa aria-pressed y cambia el cuerpo"; "PR-1D03: agregar y quitar criterios mueve el foco como pide §7.14 y muestra el total en vivo"; "PR-1D03: sube los archivos antes de publicar y publica con sus ids en orden"; "PR-1D03: si falla la subida de un archivo, el aviso lo nombra y no se publica"; "PR-1D03: el botón queda en espera y un segundo clic no envía dos veces"; "PR-1D03: todos los campos llevan autoComplete off"; "PR-1D03: al terminar avisa «Tarea publicada» y navega al detalle de la tarea nueva"; y los demás.
- PR-1D04 → `frontend/src/features/tareas/editar-tarea-view.test.tsx`, 9 casos: "PR-1D04: carga los valores de la tarea (fecha local, categoría, tema, criterios y adjuntos publicados)"; "PR-1D04: una tarea sin categoría en una clase con categorías carga con «Elige una categoría» y no se guarda sin elegir"; "PR-1D04: quitar un adjunto publicado lo saca de archivoIds y lleva el foco a «Adjuntar archivos»"; "PR-1D04: un 403 EDICION_NO_PERMITIDA se avisa con el mensaje del servidor y no navega"; "PR-1D04: sin puedeEditar la vista no muestra el formulario"; y los demás.
- PR-1D05 → `frontend/src/features/tareas/detalle-tarea-view.test.tsx`, 13 casos: "PR-1D05: el estudiante ve la tarea completa, «Tu trabajo» y ninguna acción de maestro"; "PR-1D05: las instrucciones se muestran como texto plano"; "PR-1D05: el maestro con puedeEditar y sin puedeBorrar ve «Editar tarea» y no «Borrar tarea»"; "PR-1D05: el admin con puedeBorrar y sin puedeEditar ve «Borrar tarea» y no «Editar tarea»"; "PR-1D05: borrar pide confirmación en línea con el foco en «Cancelar», que vuelve a «Borrar tarea»"; "PR-1D05: confirmar borra con DELETE, avisa «Tarea borrada» y navega al muro"; "PR-1D05: mientras carga muestra «Cargando la tarea…»"; "PR-1D05: un 404 dice «Esa tarea ya no existe.»"; y los demás.
- PR-1D06 → `frontend/src/features/clases/tarjeta-de-tarea.test.tsx` (nuevo, como dice la tabla del plan; `muro-view.test.tsx` no cambió), 6 casos: "PR-1D06: la tarjeta lleva la insignia con texto e icono, el título, el vencimiento y los puntos"; "PR-1D06: el título es un enlace al detalle de la perspectiva de cada rol"; "PR-1D06: la tarjeta no ofrece comentarios ni borrar publicación"; "PR-1D06: con un punto, el texto dice «1 punto»"; "PR-1D06: un anuncio sigue con su publicación de siempre, con comentarios"; "PR-1D06: el maestro y el admin ven «Crear tarea» como enlace al formulario; el estudiante no".
- PR-1D07 → `frontend/src/app/router.test.tsx`, 6 casos nuevos en el describe "PR-1D07: rutas de las tareas": "PR-1D07: el maestro monta el formulario en tareas/nueva sin pedir una tarea llamada nueva"; "PR-1D07: el maestro monta el detalle y el formulario de edición"; "PR-1D07: el admin monta crear, detalle y editar bajo /admin/clases"; "PR-1D07: el estudiante monta el detalle con «Tu trabajo»"; "PR-1D07: el estudiante en tareas/nueva cae en /login sin pedir una tarea llamada nueva"; "PR-1D07: el estudiante en tareas/:id/editar cae en /login".
- PR-1D08 → `frontend/src/components/ui/native-select.test.tsx`, 5 casos: "PR-1D08: la etiqueta queda asociada y se puede elegir una opción", "PR-1D08: el estado inválido sale en aria-invalid y la ausencia no lo pone", "PR-1D08: usa tokens y ninguna clase de las escalas anuladas de Tailwind", "PR-1D08: la altura sale de --control-height, como la del campo de una línea", "PR-1D08: el chevron es decorativo y no se anuncia".

### Verificación (comando exacto y última línea)
Carga medida antes: `LoadPercentage` 10 y 17 (separadas 10 s). Una suite a la vez.
- `cd frontend; npm run lint` → `> tsc -b` (ESLint, `prettier --check` "All matched files use Prettier code style!" y typecheck, sin errores).
- `cd frontend; npm test` → `Tests  1962 passed (1962)` (`Test Files  136 passed (136)`). Una sola corrida completa; las dos pruebas de la barra con 101 clases no cayeron.
- `cd frontend; npm run build` → `✓ built in 1.38s`.
- raíz `npm run build` → `✓ built in 1.25s`.
- raíz `npm run lint` → `> tsc -b`.
- `prisma validate`: n/a.

### Conteos
- `cd frontend; npx vitest list`: 1962 casos (líneas con " > "); antes de 01d, 1876 (`vl-front-antes-01d.txt`). Diferencia: +86 = 5 (PR-1D08) + 14 (PR-1D01) + 16 (PR-1D02) + 17 (PR-1D03) + 9 (PR-1D04) + 13 (PR-1D05) + 6 (PR-1D06) + 6 (PR-1D07).
- Archivos: 136 (`Test Files  136 passed (136)`); antes de 01d, 129 (136 menos los 7 nuevos: native-select, vencimiento, lib, formulario-tarea, editar-tarea-view, detalle-tarea-view, tarjeta-de-tarea).

### Rojos esperados de C-13 y `rutas-02c-r1`
En verde en la corrida completa (`Tests  1962 passed`): V-06 de `styles/clases-r1` (42 `enEspera=`: `formulario-tarea.tsx` 1, `acciones-de-la-tarea.tsx` 1, 0 en el resto de la lista), "C-13 y A-5" de `estatico-02c-r1` (`acciones-de-la-tarea.tsx` único lector de `tarea.puedeBorrar`), "§D-2C1" (`features/tareas/hooks.ts` único llamador nuevo de `perspectivaDeRuta`), V-07 (9 archivos con `vidrio-fuerte`, con `formulario-tarea.tsx`) y `rutas-02c-r1`.

### V-01
`bash $S/v01d.sh` genera la tabla actual (151 archivos `*.ataque.test.ts[x]`); contra la tabla de "Complementaria 2: C-13 (5), V-07" de `reporte-tester.md` (151 filas, hash nuevo de `styles/clases-r1` `292F6359…5C72`): `diff` vacío, V01_IGUAL, 151/151. No toqué ninguna `*.ataque`.

### `git diff --name-only ad670c9`
Rastreados modificados: `docs/DESIGN.md`; en `frontend/src`: `app/router.tsx`, `app/router.test.tsx`, `features/clases/components/publicacion-del-muro.tsx`, `features/clases/data.ts`, `features/clases/muro-view.tsx`, `features/clases/types.ts`; y, sin ser míos, `docs/ESTADO.md`, los cinco archivos de `docs/trabajo/TAREAS-01-…/` y las tres `*.ataque` que reescribió el tester (`app/rutas-02c-r1`, `features/clases/estatico-02c-r1`, `styles/clases-r1`). Archivos nuevos (sin rastrear): todos en `frontend/src` (los de `components/ui/`, `lib/`, `services/`, `features/tareas/` y `features/clases/` de la lista de arriba). Ningún archivo mío fuera de `frontend/src` y `docs/DESIGN.md`.

### `docs/DESIGN.md` (marca "propuesta (TAREAS-01d)")
§7.1 (la lista de pantallas de trabajo suma "crear y editar tarea"); §7.3 (selector `NativeSelect` y control segmentado de entregas tardías); §7.7 (umbral de 72 h, textos de `vencimientoDe`, "Venció el …" en tono `muted`, `varianteDeVencimiento`); §7.8 (insignia "Tarea" `muted` con `ClipboardList`); §7.18 (tarjeta de tarea en el muro y "Crear tarea"); §7.20 nueva "Detalle de tarea"; §7.21 nueva "Formulario de tarea y rúbrica".

### Desviaciones
1. Quité `disabled={enElTope}` del botón "Agregar criterio" de `editor-de-rubrica.tsx` porque V-06 prohíbe `disabled` en JSX. Con 20 criterios, agregar no hace nada y una nota dice el tope; §7.21 lo documenta (el botón sigue en el orden de tabulación).
2. En `features/tareas/lib.ts`, `IncidenciaValidacion` se importa desde `./types` (no con `import { type … } from "@/lib/errores-de-api"`), porque la regex de `refactor-01c-r1` contaba esa línea como una definición más del símbolo.
3. Extra no pedido por el plan: `varianteDeVencimiento(estado)` en `lib/vencimiento.ts` (con su caso en `vencimiento.test.ts`), para no repetir la tabla "próxima → warning, el resto → muted" en el muro y el detalle.
4. PR-1D06 en un archivo nuevo (`tarjeta-de-tarea.test.tsx`, como la tabla del plan) en vez de `muro-view.test.tsx`, que no cambió.

### Pendiente o fuera de alcance detectado
- Ninguno bloqueante. La edición de tareas desde un detalle ya cargado no muestra el cambio de `actualizadoEn` hasta que el detalle se vuelve a pedir (se invalida al guardar). "Trabajo de clase" y los temas son de 01e.

## TAREAS-01d — Corrección de la ronda 1

Plan: `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/plan.md` (01d). Hallazgos: `reporte-tester.md`, "## TAREAS-01d — Ronda 1" (T-06 a T-09). Solo frontend. No toqué ninguna `*.ataque`.

### Hallazgos atendidos
- **T-06: corregido.** Cada fila de la rúbrica ya tenía una llave estable (`CriterioDelFormulario.llave`); los errores ahora se guardan por esa llave (`rubrica.<llave>.criterio`, `rubrica.<llave>.puntosMax`) y no por posición. `erroresConLlavesDeFila(errores, filasEnviadas)` (`features/tareas/lib.ts`) traduce la posición del envío a la llave de esa fila; `FormularioTarea` lo aplica a los errores del cliente y a los del servidor, con las filas tal como estaban al enviar; `EditorDeRubrica` lee `errores[rubrica.<llave>.<campo>]`.
- **T-07: corregido.** `PublicacionDelMuro` envía todo elemento de tipo `tarea` a `TarjetaDeTarea`, aunque venga `tarea: null`. La tarjeta, sin resumen, muestra la insignia `muted` "Fecha límite no disponible" (texto explícito, sin valor por defecto) y nunca "Ver comentarios" ni "Borrar publicación".
- **T-08: corregido.** `useCrearTarea` y `useEditarTarea` (`onError`) invalidan la lista que cambió (`pedirDeNuevoLasOpciones`; códigos en `OPCIONES_QUE_CAMBIARON_POR_CODIGO`, `data.ts`): `CATEGORIA_NO_ENCONTRADA` y `CATEGORIA_REQUERIDA` las categorías, `TEMA_NO_ENCONTRADO` los temas. `FormularioTarea` deriva el valor del campo: si la categoría o el tema elegidos ya no están en la lista nueva, el campo muestra "Elige una categoría" o "Sin tema".
- **T-09: corregido.** Gancho propio `useFocoAlPerderseElControl(contenedorRef, clave)` en `features/tareas/hooks.ts` (no se importa nada de `features/clases`). `DetalleTareaView` y `EditarTareaView` cuelgan de una raíz con `tabIndex={-1}`; si el foco estaba dentro y se perdió (activo = `<body>`) cuando cambia la clave de la vista, el foco va a la raíz.

### Hermanos y estados vecinos, uno por uno
T-06:
- "Puntos máximos": aplica, se aplicó. Caso: "PR-1D03: «Puntos máximos» sigue a su fila al quitar la primera, una del medio y la última".
- Errores del servidor con prefijo `rubrica.N`: aplica, se aplicó (antes ni se reconocían: el prefijo genérico no admite puntos ni dígitos, caía en un aviso con el prefijo a la vista). `erroresDeLaTareaDeApi` y `mensajeDeErrorTareas` ahora los reconocen. Casos: "PR-1D03: un error del servidor por la fila N se asigna a la fila que ocupaba esa posición en el envío y viaja con ella" y, en `lib.test.ts`, "PR-1D02: un VALIDACION por fila da su campo por posición y el mensaje sin el prefijo".
- Quitar la fila con error: "PR-1D03: quitar la fila con error deja sin error a la fila válida que ocupa su lugar". Quitar una válida anterior: "PR-1D03: quitar una fila válida anterior conserva el error de la inválida, que sube de lugar". Quitar la primera, una del medio y la última: el caso de "Puntos máximos" de arriba. Quitar y volver a agregar: "PR-1D03: quitar y volver a agregar una fila no le devuelve el error de la que se quitó".
- Foco al quitar (§7.14): sin cambio de comportamiento; caso "PR-1D03: tras quitar una fila, el foco va a «Quitar criterio» de la fila vecina correcta".
- Posición fuera del envío: se avisa como error de la rúbrica entera, no se pierde ("PR-1D02: una posición que no existe en el envío no se pierde: pasa a la rúbrica entera").
- "Agregar criterio": no aplica; no desplaza índices ni crea errores (la fila nueva tiene llave nueva, verificado en el caso de agregar tras quitar).
- Adjuntos: no aplica; no tienen errores por índice.

T-07:
- Detalle ante una respuesta sin `tarea`: aplica; el esquema de `shared/` la rechaza, la vista dice "Algo salió mal. Inténtalo de nuevo." y no pinta acciones (no necesitó cambio). Caso: "PR-1D05: una respuesta sin `tarea` no se pinta como detalle: dice que algo salió mal".
- Muro del estudiante, del maestro y del admin: aplica a las tres, la perspectiva solo decide el enlace. Caso: "PR-1D06: una tarea sin su resumen (tarea: null) no se pinta como publicación común y lo dice, en las tres perspectivas".

T-08:
- `useEditarTarea`: aplica, se aplicó. Casos: "PR-1D04: tras un 404 de categoría al guardar, la lista se pide de nuevo y el campo vuelve a «Elige una categoría»" y "PR-1D04: tras un 404 de tema al guardar, el campo vuelve a «Sin tema»".
- Crear: "PR-1D03: tras un 404 de categoría la lista se pide de nuevo y el campo vuelve a «Elige una categoría»" y "PR-1D03: tras un 404 de tema la lista se pide de nuevo y el campo vuelve a «Sin tema»".
- `CATEGORIA_REQUERIDA`: aplica, se aplicó. Caso: "PR-1D03: con CATEGORIA_REQUERIDA (la clase ganó categorías) se pide de nuevo y el campo pasa a «Elige una categoría» con su mensaje".
- Estado vecino que encontré: una recarga de las listas que falla desmontaba el formulario (`isError` con datos en caché) y perdía lo escrito. Ahora, con las listas ya cargadas, sigue con las últimas. Caso: "PR-1D03: una recarga de las listas que falla no desmonta el formulario ni borra lo escrito".
- Formulario del muro con `temaId`: no aplica hoy; 01e lo agrega y entonces tendrá que invalidar los temas igual.

T-09 (estados vecinos):
- `puedeBorrar` a `false` con la confirmación abierta: se aplicó. Caso: "PR-1D05: puedeBorrar pasa a false con la confirmación abierta: el foco va a la raíz de la vista".
- `puedeEditar` a `false` con el foco en "Editar tarea": se aplicó. Caso: "PR-1D05: puedeEditar pasa a false con el foco en «Editar tarea»: el foco va a la raíz de la vista".
- `EditarTareaView` cuando una recarga quita `puedeEditar` con el foco en el formulario: se aplicó. Caso: "PR-1D04: una recarga que quita puedeEditar con el foco dentro del formulario lleva el foco a la raíz de la vista".
- La tarea que desaparece (404) con el foco en una acción: detalle, "PR-1D05: la tarea desaparece (404) con el foco en una acción: el foco va a la raíz y se dice que no existe"; edición, "PR-1D04: la tarea que desaparece (404) con el foco dentro del formulario lleva el foco a la raíz".
- Primera carga: no aplica; nadie tiene el foco dentro (el gancho solo actúa si estaba dentro y se perdió).
- Recarga sin cambios: no mueve el foco. Casos: "PR-1D05: una recarga que no cambia nada deja el foco donde estaba" y "PR-1D04: una recarga sin cambios no le quita el foco al formulario".
- Error con la tarea en caché y dos fallos seguidos: se aplicó; el segundo fallo no cambia el estado y el foco se queda donde el primero lo dejó. Caso: "PR-1D05: un error de servidor en la recarga (con la tarea en caché) y un segundo fallo seguido no dejan el foco en <body>".
- Cambio de `tareaId`: se aplicó. Caso: "PR-1D05: al cambiar de tarea (otro tareaId) con el foco en una acción, el foco va a la raíz mientras carga la nueva".
- Quien soltó el foco con un clic fuera: no se lo quita. Caso: "PR-1D05: quien soltó el foco con un clic fuera no lo recupera cuando una recarga cambia la vista".
- Borrar con éxito: no aplica; navega al muro y la vista se desmonta.

### Archivos tocados (`frontend/src` salvo `docs/DESIGN.md`)
`features/tareas/`: `lib.ts`, `lib.test.ts`, `data.ts`, `hooks.ts`, `components/formulario-tarea.tsx`, `components/editor-de-rubrica.tsx`, `detalle-tarea-view.tsx`, `editar-tarea-view.tsx`, `formulario-tarea.test.tsx`, `editar-tarea-view.test.tsx`, `detalle-tarea-view.test.tsx`. `features/clases/`: `components/tarjeta-de-tarea.tsx`, `components/publicacion-del-muro.tsx`, `tarjeta-de-tarea.test.tsx`. `docs/DESIGN.md`: §7.18 (tarea sin resumen), §7.20 (foco cuando una recarga quita el control, T-09), §7.21 (errores de filas de la rúbrica, T-06, y opciones que cambian, T-08), todas con la marca "propuesta (TAREAS-01d)".

### Verificación (comando exacto y última línea)
Carga antes de la suite completa: lecturas de `LoadPercentage` en pares de 10 s entre 0 y 42 (p. ej. 21/11, 15/38, 40/35, 26/28, 18/39, 29/37, 33/0); la carga fluctuó por encima de 25 % en varios pares a lo largo de unos 4 minutos y corrí con 21/11 como última lectura limpia; la corrida completa tardó 132 s (sin fallos por tiempo).
- `cd frontend; npm run lint` → `> tsc -b` (ESLint, `prettier --check` y typecheck sin errores).
- `cd frontend; npm test` → `Tests  2011 passed (2011)` (`Test Files  138 passed (138)`). La primera corrida completa de esta ronda dio 1 rojo, "C-13 y A-5" de `estatico-02c-r1`, porque mi clave de foco en `detalle-tarea-view.tsx` leía `.puedeBorrar`; la cambié por `consulta.dataUpdatedAt` y `errorUpdatedAt` (`acciones-de-la-tarea.tsx` sigue siendo el único lector) y la segunda corrida completa dio todo en verde.
- `cd frontend; npm run build` → `✓ built in 1.29s`.
- raíz `npm run build` → `✓ built in 1.39s`.
- raíz `npm run lint` → `> tsc -b`.
- Los 5 rojos de la ronda 1 (T-06 ×1, T-07 ×1, T-08 ×2, T-09 ×1) pasan; `tareas-01d-r1.ataque.test.tsx` 18/18 y `tarjeta-01d-r1.ataque.test.tsx` 4/4.

### Conteos
- `cd frontend; npx vitest list`: 2011 casos en 138 archivos (líneas con " > "); antes de esta corrección, 1984 con las del tester. Diferencia +27, todos normales: PR-1D03 +10 (17 a 27), PR-1D02 +3 (16 a 19), PR-1D04 +5 (9 a 14), PR-1D05 +8 (13 a 21), PR-1D06 +1 (6 a 7).

### V-01
Las 153 `*.ataque` contra la tabla de "Tabla de SHA-256 de las 153 `*.ataque` al cierre de la ronda 1 de 01d" de `reporte-tester.md`: `diff` vacío, V01_IGUAL, 153/153. No toqué ninguna.

### Desviaciones
- Ninguna del plan. Dos decisiones de implementación: (1) el foco de T-09 se recoloca en la raíz de la vista y no en el `h1`, porque debe existir también en los estados de error y de carga; (2) la clave del gancho del detalle usa `dataUpdatedAt` y no los permisos, por la lista cerrada de `puedeBorrar` de C-13.

### Pendiente o fuera de alcance
- En `EditarTareaView`, un error de recarga de la tarea (que no sea 404) con el formulario abierto lo sustituye por el mensaje de error y se pierde lo escrito (el foco ya no se pierde, pero el contenido sí). No estaba en el reporte; lo anoto para decidir.
- "Formulario del muro con `temaId`": 01e deberá invalidar los temas con el mismo criterio.

## TAREAS-01d — Corrección de M-01

Plan: `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/plan.md` (01d). Hallazgo: M-01 del manager (`editar-tarea-view.tsx`). Solo frontend. No toqué ninguna `*.ataque`.

### M-01: corregido
Con la tarea ya cargada, un error de recarga que no es 404 ya no sustituye la vista. `errorQueReemplazaLaVista(hayTarea, error)` (`features/tareas/lib.ts`) decide: reemplaza solo sin tarea (primera carga fallida) o con `TAREA_NO_ENCONTRADA`. En los demás casos, `useAvisoDeRecargaFallida` (`features/tareas/hooks.ts`) avisa con un toast, uno por cada fallo, y el formulario no se desmonta. Textos nuevos en `data.ts` (`TEXTOS_FORMULARIO_TAREA.avisoRecargaFallida`, `TEXTOS_DETALLE_TAREA.avisoRecargaFallida`).

### Hermanos y estados vecinos, uno por uno
- 5xx con la tarea en caché: aplica, se aplicó. Caso: "PR-1D04: un 5xx en la recarga deja el formulario, lo escrito y el foco, y avisa sin desmontar" (mismo nodo del campo, mismo valor, foco intacto).
- Dos fallos seguidos: aplica, se aplicó. Caso: "PR-1D04: dos fallos seguidos avisan dos veces y el formulario sigue intacto".
- Un fallo seguido de una recarga exitosa: decisión documentada en `DESIGN.md` §7.21: el formulario conserva lo escrito y no se sobrescribe con los datos nuevos (se edita sobre la versión con que se abrió; el servidor valida al guardar). Caso: "PR-1D04: un fallo seguido de una recarga exitosa conserva lo escrito y no lo sobrescribe con los datos nuevos".
- 404 con la tarea en caché: sigue como antes (mensaje "Esa tarea ya no existe." y foco a la raíz, sin el aviso de recarga). Caso: "PR-1D04: un 404 con la tarea en caché sigue diciendo que no existe y el foco va a la raíz".
- Foco con el formulario conservado: no se mueve (aserción en el caso del 5xx).
- Primera carga fallida: sigue como hoy. Caso: "PR-1D04: la primera carga fallida sigue diciendo el error y no muestra el formulario".
- Pérdida de `puedeEditar`: sigue como hoy; lo cubre el caso ya existente "PR-1D04: una recarga que quita puedeEditar con el foco dentro del formulario lleva el foco a la raíz de la vista".
- Detalle (`detalle-tarea-view.tsx`): aplica, se aplicó. Aunque es de solo lectura (no hay nada escrito que perder), mostrar un error de pantalla completa por un fallo pasajero es peor que la última versión; ahora conserva la tarea y avisa, y el error la reemplaza solo en la primera carga fallida o en un 404. Casos: "PR-1D05: un error de servidor en la recarga con la tarea en caché deja el detalle, avisa y no mueve el foco (M-01)" (reescrito: antes esperaba el mensaje de error, que ya no corresponde), "PR-1D05: dos fallos seguidos con la tarea en caché avisan dos veces y el detalle sigue (M-01)", "PR-1D05: tras un fallo, una recarga exitosa muestra la versión nueva del detalle (M-01)"; el 404 y la primera carga fallida ya tenían caso ("PR-1D05: la tarea desaparece (404) con el foco en una acción: el foco va a la raíz y se dice que no existe" y "PR-1D05: un error de servidor muestra el aviso genérico").

### Archivos tocados (`frontend/src/features/tareas/` y `docs/DESIGN.md`)
`lib.ts`, `hooks.ts`, `data.ts`, `editar-tarea-view.tsx`, `detalle-tarea-view.tsx`, `editar-tarea-view.test.tsx`, `detalle-tarea-view.test.tsx`; `docs/DESIGN.md` §7.20 y §7.21 (marca "propuesta (TAREAS-01d)").

### Verificación (comando exacto y última línea)
Carga medida antes de la suite: pares de 10 s 41/22 y 20/11 (la última, limpia; durante la corrida completa el equipo estuvo ocupado: la corrida tardó 188 s contra 132 s de la anterior).
- `cd frontend; npm run lint` → `> tsc -b`.
- `cd frontend; npm test` → `Tests  3 failed | 2015 passed (2018)`, `Test Files  3 failed | 135 passed (138)`. Los tres rojos, todos por tiempo límite de 5 s (corrida sola de la suite, sin repetir):
  - `tareas-01d-r1.ataque.test.tsx` › "con 20 criterios, «Agregar criterio» no agrega, no usa disabled y la nota dice el tope; el envío lleva los 20": 5194 ms (el que el manager dijo que no cuenta).
  - `barra-02d-r1.ataque.test.tsx` › "con 101 clases pide una sola página de 100 (sin cursor) y termina en «Ver todas» hacia el inicio": 7307 ms.
  - `foco-barra-02d-r2.ataque.test.tsx` › "101 → 100 clases con el foco en «Ver todas»: el foco queda en la lista, no en <body>": 7325 ms.
  Las dos de la barra con 101 clases: no repetí la corrida completa. Corridas aisladas de esos dos archivos después: `Tests  33 passed (33)`. Me detengo ahí para que decida el humano, como indicó el coordinador.
- `cd frontend; npm run build` → `✓ built in 1.72s`.
- raíz `npm run build` → `✓ built in 1.71s`.
- raíz `npm run lint` → `> tsc -b`.

### Conteos
`cd frontend; npx vitest list`: 2018 casos en 138 archivos (líneas con " > "); antes de M-01, 2011. Diferencia +7 casos normales: PR-1D04 +5 (14 a 19), PR-1D05 +2 (21 a 23: tres casos nuevos y uno reescrito en su lugar).

### V-01
Las 153 `*.ataque` contra la tabla de la ronda 1 de `reporte-tester.md`: `diff` vacío, V01_IGUAL, 153/153.

### Desviaciones
Ninguna del plan. La decisión que el coordinador pidió documentar (el formulario no se sobrescribe tras una recarga exitosa) está en `DESIGN.md` §7.21.

### Pendiente
Los dos casos de la barra con 101 clases (arriba) cayeron por tiempo en la corrida completa con el equipo ocupado; los decide el humano.

### A-13: testTimeout y corrida de cierre
Cambio en `frontend/vitest.config.ts` (abierto por A-13 solo para esta línea), `git diff`:
```
+      // Los casos que montan el router o listas de 101 clases rozan los 5 s en la suite completa (A-13 de TAREAS-01, cierra M-02 de DESIGN-01b).
+      testTimeout: 15_000,
```
(dentro de `test: { … }`, entre `include` y `css`; nada más cambia en el archivo).
- Carga previa (pares de 10 s): 37/27 y 1/14.
- `cd frontend; npm test` (una sola corrida) → `Test Files  138 passed (138)` · `Tests  2018 passed (2018)` · `Duration  86.21s`.
- `cd frontend; npm run lint` → `> tsc -b`.
- `cd frontend; npm run build` → `✓ built in 764ms`.
- raíz `npm run build` → `✓ built in 652ms`.
- raíz `npm run lint` → `> tsc -b`.
- `cd frontend; npx vitest list` → 2018 casos (líneas con " > "), sin cambio.
- V-01: 153/153 contra la tabla de la ronda 1, `diff` vacío (V01_IGUAL).

## TAREAS-01d — Corrección de la ronda 2

Plan: `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/plan.md` (01d). Hallazgos T-10 a T-14 del tester (ronda 2). Solo frontend y `docs/DESIGN.md`. No toqué ninguna `*.ataque` ni `vitest.config.ts`. Esta ronda cuenta como ronda extra por hermanos: abajo, cada mecanismo con todos sus estados vecinos.

Pruebas del tester que cubren los hallazgos (`frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx`), 8 rojos que ahora pasan: T-10 "un error del servidor por una fila que se quitó mientras el envío estaba en vuelo no se pierde en silencio (ni campo ni aviso)"; T-11 "detalle: un DELETE que responde %i %s vuelve a pedir la tarea…" (404 y 403) y "edición: un PUT que responde %i %s vuelve a pedir la tarea…" (404 y 403); T-12 "un fallo de recarga en el detalle avisa una vez; abrir «Editar tarea» con ese error en caché no vuelve a avisar…"; T-13 "edición: un 403 SIN_ACCESO_A_LA_CLASE en la recarga dice que ya no hay acceso, no que revise su conexión"; T-14 "quien soltó el foco con un clic en blanco dentro de la vista no lo recupera cuando llega una recarga sin cambios".

### Hallazgos
- **T-10: corregido.** `erroresSinFilasQuitadas` (`lib.ts`) pasa el error de una fila cuya llave ya no está a `rubrica` (error de la rúbrica entera, que `EditorDeRubrica` muestra con `ErrorDeCampo`). `formulario-tarea.tsx` lo aplica con las filas vigentes (`filasVigentesRef`, actualizado en un efecto).
- **T-11: corregido.** `pedirDeNuevoLaTarea` (`hooks.ts`), llamado en `onError` de `useBorrarTarea` y `useEditarTarea`: con `TAREA_NO_ENCONTRADA`, `EDICION_NO_PERMITIDA`, `BORRADO_NO_PERMITIDO` o `SIN_ACCESO_A_LA_CLASE` invalida la consulta de la tarea (se vuelve a pedir y la vista reacciona); con `TAREA_NO_ENCONTRADA` además marca viejos muro, trabajo, temas y categorías. La lista de códigos vive en `data.ts` (`CODIGOS_QUE_RENUEVAN_LA_TAREA`).
- **T-12: corregido.** `useAvisoDeRecargaFallida(claseId, tareaId, activo, fallo, texto)` guarda lo último avisado fuera del componente, en un `WeakMap` por instancia de consulta de la caché, con `errorUpdateCount:errorUpdatedAt`. Se compara el contador de errores además de la fecha porque dos fallos en el mismo milisegundo (el caso de "dos fallos seguidos" con respuestas instantáneas) tendrían la misma `errorUpdatedAt`.
- **T-13: corregido.** `errorQueReemplazaLaVista` ahora también reemplaza con `SIN_ACCESO_A_LA_CLASE` y con `VALIDACION` de `claseId:`/`tareaId:` (coherente con el 404: la vista deja de ofrecer guardar y borrar; el foco va a la raíz por `useFocoAlPerderseElControl`). El aviso de edición depende del error (`avisoDeRecargaFallidaAlEditar`, `lib.ts`; textos en `data.ts`). Ver "Desviaciones" por el 5xx.
- **T-14: corregido.** `useFocoAlPerderseElControl` adopta el criterio de CLASES-02 (ver más abajo). Se quitó el oyente de `mousedown`.

### Hermanos y estados vecinos, uno por uno

**Mecanismo 1: errores de la rúbrica por llave (T-10)**
- "Puntos máximos": aplica, se aplicó (mismo camino por llave y campo). Caso: formulario-tarea.test.tsx "PR-1D03: el error de «Puntos máximos» de una fila quitada se muestra igual como error de la rúbrica".
- "Criterio" de una fila quitada: aplica, se aplicó. Caso: "PR-1D03: el error de «Criterio» de una fila quitada se muestra como error de la rúbrica, sin marcar otras filas ni perderse".
- `useEditarTarea` (mismo formulario): aplica, se aplicó. Caso: editar-tarea-view.test.tsx "PR-1D04: el error del servidor por una fila que ya no está se muestra como error de la rúbrica y no se pierde".
- Filas reordenadas por quitar una anterior antes de la respuesta: no cambia (la llave sigue a su fila). Caso: "PR-1D03: quitar una fila anterior antes de la respuesta deja el error en su fila, que sube de lugar, y no sale como error de la rúbrica".
- Sin filas quitadas: sin cambio. Caso: "PR-1D03: sin filas quitadas, el error del servidor sigue en su fila (el remedio no cambia ese camino)".
- Todas las filas quitadas: aplica. Caso: "PR-1D03: quitar todas las filas antes de la respuesta deja el error en la rúbrica y la sección sigue usable".
- Posición fuera del envío (`rubrica.7`): ya cubierto desde T-06 (`erroresConLlavesDeFila`), sin cambio. Casos del tester y lib.test.ts "PR-1D02: una posición que no existe en el envío no se pierde: pasa a la rúbrica entera".
- Unitario: lib.test.ts "PR-1D02: el error de una fila que ya no está pasa a la rúbrica entera y el de una que sigue se conserva" y "PR-1D02: sin filas vigentes, todos los errores de fila pasan a la rúbrica; los que no son de fila no cambian".
- Errores del cliente (`cuerpoDeTarea`): no aplica. Se calculan de forma síncrona en el envío con las filas de ese instante, sin hueco entre filas y error.

**Mecanismo 2: invalidaciones en `onError` (T-11)**
- Borrar con `TAREA_NO_ENCONTRADA`: aplica, se aplicó. detalle-tarea-view.test.tsx "PR-1D05: un 404 al borrar vuelve a pedir la tarea, dice que ya no existe, lleva el foco a la raíz y marca viejos el muro y el trabajo".
- Borrar con `BORRADO_NO_PERMITIDO`: aplica. "PR-1D05: un 403 BORRADO_NO_PERMITIDO vuelve a pedir la tarea y, con puedeBorrar en false, la vista deja de ofrecer borrar y el foco va a la raíz" (comprueba además que el muro NO se marca viejo: el alcance es solo la tarea).
- Borrar con `SIN_ACCESO_A_LA_CLASE`: aplica. "PR-1D05: un 403 SIN_ACCESO_A_LA_CLASE al borrar vuelve a pedir la tarea y la vista dice que ya no hay acceso".
- Borrar con un fallo que no dice que la tarea cambió (500): no aplica, no se pide de nuevo. "PR-1D05: un fallo que no dice que la tarea cambió (500 al borrar) no vuelve a pedirla y deja la confirmación".
- Guardar con `TAREA_NO_ENCONTRADA` (formulario a medio escribir): aplica. editar-tarea-view.test.tsx "PR-1D04: un 404 al guardar vuelve a pedir la tarea; el formulario a medio escribir se reemplaza por «Esa tarea ya no existe.» y el foco va a la raíz" (lo escrito se pierde, igual que M-01 fija para el 404 de la recarga).
- Guardar con `EDICION_NO_PERMITIDA`: aplica. "PR-1D04: un 403 EDICION_NO_PERMITIDA al guardar vuelve a pedir la tarea y, con puedeEditar en false, el formulario deja de ofrecer guardar".
- Guardar con `SIN_ACCESO_A_LA_CLASE`: aplica. "PR-1D04: un 403 SIN_ACCESO_A_LA_CLASE al guardar vuelve a pedir la tarea y la vista dice que ya no hay acceso".
- Guardar con 500: no aplica. "PR-1D04: un fallo que no dice que la tarea cambió (500 al guardar) no la vuelve a pedir y deja el formulario".
- Crear con `SIN_ACCESO_A_LA_CLASE`: no aplica el remedio (no hay tarea en caché ni consulta que renovar; el aviso lo da el hook y el formulario conserva lo escrito). Caso: formulario-tarea.test.tsx "PR-1D03: avisa que no hay acceso, conserva lo escrito y no navega".
- El 404 de categoría y de tema (T-08, `pedirDeNuevoLasOpciones`) sigue igual en crear y editar (casos existentes de PR-1D03 y PR-1D04); en `useEditarTarea` ambos remedios conviven en `onError`.

**Mecanismo 3: aviso de recarga fallida (T-12)**
- Abrir "Editar tarea" con el error ya avisado en el detalle: aplica; lo cubre el caso del tester. Mismo mecanismo con el montaje de la edición: editar-tarea-view.test.tsx "PR-1D04: montar el formulario con el error ya avisado en caché no avisa otra vez".
- Volver al detalle: aplica. detalle-tarea-view.test.tsx "PR-1D05: volver al detalle con el error ya avisado en caché no avisa otra vez" (navega detalle, otra ruta, detalle con el error en caché).
- StrictMode: el efecto doble de StrictMode solo ocurre al montar; con el error ya avisado, el remonte ya no duplica (la marca lo impide). Un fallo que llega con la vista montada nunca se duplicaba (los efectos no se ejecutan doble fuera del montaje). Casos: "PR-1D05: con StrictMode (efectos dos veces) un fallo avisa una sola vez" y su par "PR-1D04: con StrictMode (efectos dos veces) un fallo avisa una sola vez". Honestidad: estos dos casos pasan también sin el remedio; el que discrimina el remedio es el de montaje con error en caché (verificado por mutación: sin la comparación de la marca fallan los dos casos de volver/abrir).
- Dos fallos seguidos: siguen avisando dos veces (contador de errores). Casos existentes "PR-1D04: dos fallos seguidos avisan dos veces y el formulario sigue intacto" y "PR-1D05: dos fallos seguidos con la tarea en caché avisan dos veces y el detalle sigue (M-01)".
- Fallo, recarga exitosa y otro fallo: avisa dos veces. "PR-1D05: un fallo, una recarga exitosa y otro fallo avisan dos veces"; el del tester ("edición: fallo y luego recarga exitosa…") cubre lo mismo en la edición.
- Cambio de `tareaId`: la memoria es por consulta (otra tarea es otra consulta de la caché); no aplica nada extra.

**Mecanismo 4: textos y vista por código (T-13)**
- `SIN_ACCESO_A_LA_CLASE` en la recarga, edición: reemplaza la vista, texto "No tienes acceso a esta clase.", foco a la raíz. Caso del tester y editar-tarea-view.test.tsx "PR-1D04: un 403 SIN_ACCESO_A_LA_CLASE reemplaza el formulario por «No tienes acceso a esta clase.», sin ofrecer guardar y con el foco en la raíz".
- `SIN_ACCESO_A_LA_CLASE` en la recarga, detalle: igual. detalle-tarea-view.test.tsx "PR-1D05: un 403 SIN_ACCESO_A_LA_CLASE reemplaza el detalle por «No tienes acceso a esta clase.», sin ofrecer acciones y con el foco en la raíz".
- `VALIDACION` con `tareaId:` y con `claseId:` (edición y detalle): como 404 y como pérdida de acceso. "PR-1D04: un VALIDACION «%s» en la recarga se trata como 404 o como pérdida de acceso" y su par "PR-1D05" (dos casos cada uno). `VALIDACION` de otro campo: solo avisa. "PR-1D05: un VALIDACION de otro campo en la recarga deja el detalle y solo avisa".
- 5xx: ver "Desviaciones". 500 con JSON o `SIN_CONEXION` (503 sin JSON): "revisa tu conexión", como hasta ahora. "PR-1D04: un 503 sin JSON (la API caída) en la recarga avisa que revise la conexión".
- Error de red (el fetch rechaza): "revisa tu conexión". "PR-1D04: sin conexión (el fetch rechaza) en la recarga avisa que revise la conexión".
- Otra respuesta del servidor (429): edición: "No pudimos actualizar la tarea. Puedes seguir editando; inténtalo de nuevo en un momento." (sin hablar de conexión): "PR-1D04: un 429 en la recarga avisa sin hablar de conexión y deja el formulario con lo escrito".
- Detalle: un solo texto ("Mostramos la última versión que tenemos."), que no habla de conexión; no necesita variantes. Casos: "PR-1D05: un 429 en la recarga deja el detalle y avisa con la última versión que se tiene", "PR-1D05: sin conexión en la recarga deja el detalle y avisa con la última versión que se tiene".
- `ACCESO_RESTRINGIDO` y `CAMBIO_DE_CONTRASENA_REQUERIDO`: no aplican; `apiClient` los redirige antes de que la vista actúe. Se fija en lib.test.ts "PR-1D02: errorQueReemplazaLaVista(true, %s) = %s" (no reemplazan la vista).
- Unitarios: lib.test.ts "PR-1D02: errorQueReemplazaLaVista(true, %s) = %s" (7 casos) y "PR-1D02: %s dice «%s»" (6 casos) y "PR-1D02: solo el aviso de conexión habla de conexión".

**Mecanismo 5: foco (T-14)**, en detalle (PR-1D05) y en edición (PR-1D04). Criterio nuevo de `useFocoAlPerderseElControl`: dentro = último `focusin` dentro del contenedor; un `focusout` sin destino con el control todavía en el documento y la ventana con el foco borra la memoria (turno aparte, como `useFilaEnFoco`); recupera solo si el control que lo tenía ya no está en el documento y el foco quedó en `<body>`.
- Primera carga: no mueve el foco. "PR-1D05: la primera carga, con el foco en <body>, no lo mueve" / "PR-1D04: la primera carga, con el foco en <body>, no lo mueve".
- Recarga sin cambios con foco: no lo mueve (casos existentes "PR-1D05: una recarga que no cambia nada deja el foco donde estaba" y "PR-1D04: una recarga sin cambios no le quita el foco al formulario").
- Recarga que quita el control: raíz (casos existentes de T-09, ambas vistas).
- Clic en blanco y recarga sin cambios: no recupera. Caso del tester (detalle) y "PR-1D04: un clic en blanco suelta el foco: una recarga sin cambios no lo recupera" y "PR-1D05: un clic en blanco y una recarga sin cambios dejan el foco en <body>".
- Clic en blanco y luego una recarga que quita el control: no recupera. "PR-1D05: un clic en un espacio en blanco de la vista suelta el foco: una recarga que quita el control después no lo recupera" y "PR-1D04: un clic en blanco suelta el foco: una recarga que quita puedeEditar después tampoco lo recupera".
- Clic fuera de la vista: igual que clic en blanco (el `focusout` sin destino); caso existente "PR-1D05: quien soltó el foco con un clic fuera no lo recupera cuando una recarga cambia la vista".
- Cambio de pestaña con foco en una acción (focusout sin destino y blur de la ventana): conserva la memoria. "PR-1D05: al cambiar de pestaña (focusout sin destino y blur de la ventana) la memoria se conserva y la recarga que quita el control lleva el foco a la raíz" / "PR-1D04: al cambiar de pestaña … lleva el foco a la raíz".
- `focusout` sin destino con el control todavía enfocado y el aviso de la ventana después: conserva. "PR-1D05: un focusout sin destino con el control todavía enfocado (el aviso de la ventana llega después) conserva la memoria" / "PR-1D04: … el campo todavía enfocado …" (verificado por mutación: sin la guarda de elemento activo ambos fallan).
- Cambio de aplicación (`visibilitychange` oculta): conserva. "PR-1D05: al ocultarse la página (visibilitychange) antes del focusout, la memoria se conserva".
- Foco que pasa a otro control de la vista y se quita el primero: no mueve. "PR-1D05: pasar el foco a otro control de la vista y quitar el primero no mueve el foco".
- Error en caché y dos fallos seguidos: el control sigue montado, no mueve el foco; casos existentes ("PR-1D05: un error de servidor en la recarga con la tarea en caché … no mueve el foco (M-01)", "PR-1D04: dos fallos seguidos …").
- Cambio de `tareaId`: raíz mientras carga la otra. Existente en detalle ("PR-1D05: al cambiar de tarea (otro tareaId) con el foco en una acción, el foco va a la raíz mientras carga la nueva"); nuevo en edición "PR-1D04: al cambiar de tarea (otro tareaId) con el foco en el formulario, el foco va a la raíz mientras carga la nueva".
- Diferencia con CLASES-02: allí el criterio de ventana es `document.hasFocus()` además del seguimiento de `window`; aquí es el elemento activo (`document.activeElement === objetivo` mantiene la memoria) más el seguimiento de `window`/`visibilitychange`. Motivo: en jsdom `blur()` deja `document.hasFocus()` en falso (`_lastFocusedElement` nulo), por lo que con el criterio de CLASES la prueba del tester (clic en blanco con `blur()`) no habría podido pasar; en un navegador el elemento activo pasa a `<body>` con un clic en blanco y sigue siendo el control al cambiar de pestaña, así que es equivalente y no depende de `hasFocus()`.

### Desviaciones del plan y de la instrucción
1. **T-13, 5xx.** La instrucción pedía un texto que no hable de conexión para un 5xx. Dos pruebas del tester fijan lo contrario: "edición: fallo y luego recarga exitosa que de verdad llega…" espera exactamente "…revisa tu conexión." para un 500 `ERROR_INTERNO`, y no puedo modificarla. Además `apiClient` ya trata los 500, 502, 503 y 504 sin JSON como `SIN_CONEXION` (DEC-12). Por eso: sin conexión, `SIN_CONEXION` y cualquier estado >= 500 conservan "revisa tu conexión"; el texto nuevo "inténtalo de nuevo en un momento" va para el resto de respuestas del servidor (por ejemplo 429 o una respuesta inválida). El detalle menor del manager (5xx sin hablar de conexión) queda sin aplicar para el estado 5xx y es decisión del manager o del humano; si se quiere cambiar, el tester debe actualizar su prueba.
2. `errorUpdateCount` en lugar de comparar solo `errorUpdatedAt` (T-12), por el milisegundo repetido; mismo espíritu ("fallo nuevo").
3. Ninguna otra.

### Archivos tocados
`frontend/src/features/tareas/`: `data.ts`, `lib.ts`, `hooks.ts`, `detalle-tarea-view.tsx`, `editar-tarea-view.tsx`, `components/formulario-tarea.tsx`, `lib.test.ts`, `formulario-tarea.test.tsx`, `editar-tarea-view.test.tsx`, `detalle-tarea-view.test.tsx`; `docs/DESIGN.md` §7.20 y §7.21 (marca "propuesta (TAREAS-01d)"). Prettier solo en `frontend/src/features/tareas` (el comando incluyó los `*.ataque`, que quedaron sin cambios: V-01).
`git diff --name-only ad670c9` fuera de `docs/trabajo` y `docs/ESTADO.md` solo muestra `frontend/src/...`, `frontend/vitest.config.ts` (A-13, ya hecho), `docs/DESIGN.md` y `.claude/agents/programador.md` (este último lo cambió el orquestador antes de mi trabajo; no lo toqué).

### Verificación (comando exacto y última línea)
Carga medida antes de la suite y del lint: lecturas separadas 10 s: 32/28, luego 27/24, 31/39/46 y por fin 7/12 (esperé hasta que bajó de 25 %); la corrida completa se hizo con 12 %.
- `cd frontend; npm run lint` → `> tsc -b` (salida limpia: ESLint sin errores y `All matched files use Prettier code style!`).
- `cd frontend; npm test` (una sola corrida) → `Tests  2102 passed (2102)` (`Test Files  140 passed (140)`, `Duration  87.52s`).
- `cd frontend; npm run build` → `✓ built in 693ms`.
- raíz `npm run build` → `✓ built in 725ms` (exit 0).
- raíz `npm run lint` → `> tsc -b` (exit 0).

### Conteos
`cd frontend; npx vitest list | grep -c " > "` → 2102 casos; `npx vitest list --filesOnly | grep -c test` → 140 archivos. Antes: 2041 con las del tester; diferencia +61 casos normales: lib.test.ts +16, formulario-tarea.test.tsx +6, editar-tarea-view.test.tsx +19, detalle-tarea-view.test.tsx +20. Por archivo (`npx vitest list`): lib 35, formulario 33, editar 38, detalle 43, ataque r1 18, ataque r2 20.

### Verificación por mutación (no entregada, hecha y restaurada)
Quitar la guarda `document.activeElement === objetivo`: fallan los 2 casos "focusout sin destino con el control todavía enfocado". Quitar la comparación de la marca del aviso: fallan los 2 casos de montar/volver con el error en caché. Anular el filtro de códigos de `pedirDeNuevoLaTarea`: fallan 6 casos de T-11. `hooks.ts` quedó idéntico a la copia de antes.

### V-01
Las 155 `*.ataque` (backend, frontend, shared) contra la tabla al final de "## TAREAS-01d — Ronda 2": `diff` vacío, V01_IGUAL, 155/155.

### Pendiente o fuera de alcance
- Decisión sobre T-13 y el 5xx (Desviación 1).
- Con `SIN_ACCESO_A_LA_CLASE` en la recarga de la edición, lo escrito se pierde al reemplazarse el formulario (igual que con el 404, decisión de M-01); si se quiere conservarlo habría que avisar y dejar el formulario, lo que contradice "deja de ofrecer guardar".

### M-01: tipo en hooks.ts
Corregido sin cambio de comportamiento. `FalloDeLaConsulta` sale de `hooks.ts` y pasa a `types.ts`, inferido del resultado de TanStack Query en lugar de declararlo a mano.

```
--- hooks.ts
-import type { CrearTarea } from "./types"
+import type { CrearTarea, FalloDeLaConsulta } from "./types"
-interface FalloDeLaConsulta {
-  errorUpdatedAt: number
-  errorUpdateCount: number
-}
--- types.ts
+import type { QueryObserverResult } from "@tanstack/react-query"
+// T-12: lo que el aviso de recarga fallida lee de la consulta de la tarea para saber si un fallo es
+// nuevo (inferido del resultado de TanStack Query, no declarado a mano).
+export type FalloDeLaConsulta = Pick<QueryObserverResult, "errorUpdatedAt" | "errorUpdateCount">
```

Hermanos (mismo patrón: tipos fuera de `types.ts`): busqué con `grep -nE "^\s*(export )?(interface|type) "` en `hooks.ts`, `lib.ts` y `data.ts` de `features/tareas`. Antes solo aparecía `hooks.ts:175` (este hallazgo); después no aparece nada. No hay otros.

Notas del manager para adelante:
- Prettier con escritura se corre excluyendo las `*.ataque`. En esta corrección no corrí Prettier.
- El criterio de ventana de `useFocoAlPerderseElControl` (`document.activeElement` en lugar de `document.hasFocus()`) diverge de los ganchos de CLASES-02. Está explicado en el comentario del gancho y en "Mecanismo 5" de esta sección.

Verificación (solo se movió el tipo: build no requerido):
- `cd frontend; npm run lint` → `> tsc -b` (exit 0).
- `cd frontend; npx vitest run src/features/tareas` (aislado) → `Tests  187 passed (187)`.
- `cd frontend; npm test` (una corrida; carga en pares de 10 s: 14/29, 29/32, 31/24) → `Tests  2102 passed (2102)` (`Test Files  140 passed (140)`).
- V-01: 155/155 contra la tabla de la ronda 2, `diff` vacío (V01_IGUAL).

## TAREAS-01d — Corrección de la ronda 3 (T-15)

Plan: `docs/trabajo/TAREAS-01-tareas-temas-y-categorias/plan.md` (01d). Ronda 4 cerrada, autorizada por el humano solo para T-15. Solo frontend y `docs/DESIGN.md`. No toqué ninguna `*.ataque`. Prettier solo sobre los archivos que edité, con rutas explícitas: ninguna `*.ataque`.

### T-15: corregido
- **Remedio:** `claveDeFocoDeLaTarea(tareaId, consulta)` en `features/tareas/lib.ts` arma `tareaId:status:dataUpdatedAt:errorUpdatedAt:errorUpdateCount`. Ahora las dos vistas la usan como clave de `useFocoAlPerderseElControl`, para que no vuelvan a divergir.
- **Edición:** la clave antes era `[tareaId, status, puedeEditar]`.
- **Detalle:** la clave antes era `[tareaId, status, dataUpdatedAt, errorUpdatedAt]`. Le sumé el contador de errores: con dos fallos en el mismo milisegundo, la clave del detalle tampoco cambiaba.
- `puedeEditar` sale de la clave de la edición sin perder nada: cualquier respuesta que lo cambie cambia `dataUpdatedAt`.
- **Tipo nuevo** en `types.ts`: `MomentoDeLaConsulta`, inferido con `Pick<QueryObserverResult, "status" | "dataUpdatedAt" | "errorUpdatedAt" | "errorUpdateCount">`.
- **Casos del tester:** `tareas-01d-r3.ataque.test.tsx` › "edición: un 500 conserva el formulario con el foco en «Título»; si la siguiente recarga da %i %s y reemplaza el formulario, el foco no cae en <body>" (404 `TAREA_NO_ENCONTRADA` y 403 `SIN_ACCESO_A_LA_CLASE`). Los 2 rojos pasan a verde.

### Hermanos y estados vecinos, uno por uno
Todos los casos de la edición están en `editar-tarea-view.test.tsx` › "PR-1D04: el foco tras dos fallos seguidos de distinto tipo (T-15)".

**Un fallo que conserva el formulario seguido de uno que lo reemplaza (edición): aplica y se aplicó.** Los cubre el `it.each` "PR-1D04: %s conserva el formulario con el foco en «Título»; después %s lo reemplaza y el foco va a la raíz, no a <body>", con estas seis combinaciones:

| Primer fallo (conserva) | Segundo fallo (reemplaza) |
|---|---|
| 500 | 404 |
| 500 | 403 `SIN_ACCESO_A_LA_CLASE` |
| la red caída | 404 |
| `VALIDACION` de campo (`titulo:`) | `VALIDACION` de `tareaId:` |
| 429 | `VALIDACION` de `claseId:` |
| `SIN_CONEXION` (503 sin JSON) | 404 |

**Los dos fallos en el mismo milisegundo:** el que discrimina el contador de errores. Aplica, se aplicó.
- Edición: "PR-1D04: con los dos fallos en el mismo milisegundo, el segundo (404) sigue llevando el foco a la raíz".
- Detalle: `detalle-tarea-view.test.tsx` › "PR-1D05: con los dos fallos en el mismo milisegundo (500 y luego 403 SIN_ACCESO_A_LA_CLASE), el foco va a la raíz y no a <body>".
- Unitario: `lib.test.ts` › "PR-1D02: cambia con un fallo nuevo aunque el estado siga en error y la fecha sea la misma" y "PR-1D02: cambia con la tarea, con una respuesta nueva y con la fecha del fallo; sin cambios es la misma".

**Camino de T-11 (un PUT con 404 después de una recarga fallida; la tarea se vuelve a pedir y el 404 reemplaza): aplica, se aplicó.** Caso: "PR-1D04: camino de T-11: tras una recarga fallida, un PUT con 404 vuelve a pedir la tarea, el 404 reemplaza el formulario y el foco va a la raíz".

**Estados en los que el foco no se mueve: el remedio no los altera.**
- Dos fallos que conservan, seguidos: "PR-1D04: dos fallos que conservan el formulario seguidos no mueven el foco de «Título»".
- Un fallo que conserva seguido de una recarga exitosa: "PR-1D04: un fallo que conserva el formulario seguido de una recarga exitosa no mueve el foco de «Título»".
- En los dos, el control sigue en el documento: la clave cambia, pero el gancho no actúa.

**El detalle con las mismas secuencias:** mi cambio no lo altera.
- Ya lo cubría el caso del tester "detalle: un 500 conserva el detalle con el foco en «Borrar tarea»; si la siguiente recarga da 403 SIN_ACCESO_A_LA_CLASE, el foco no cae en <body> (sin hallazgo esperado)", que sigue en verde.
- Los casos del detalle de T-09 y T-14 de PR-1D05 siguen en verde (archivo con 45 casos en verde).

**El remedio de T-14 sigue valiendo tras el cambio de clave.**
- Clic en blanco, 500 y luego 404: el foco queda en `<body>`, sin recuperarse.
  - Edición: "PR-1D04: quien soltó el foco con un clic en blanco no lo recupera cuando un fallo que conserva va seguido de uno que reemplaza (T-14 sigue valiendo)".
  - Detalle: "PR-1D05: quien soltó el foco con un clic en blanco no lo recupera cuando un 500 va seguido de un 404 (T-14 sigue valiendo)".
- Cambio de pestaña, 500 y luego 403: el foco va a la raíz. Caso: "PR-1D04: con la memoria conservada por un cambio de pestaña, un fallo que conserva seguido de uno que reemplaza lleva el foco a la raíz".
- Los casos de T-14 de la ronda 2, en las dos vistas, siguen en verde.

### Verificación por mutación (hecha y restaurada; `diff` vacío contra la copia)
- Clave de la edición devuelta a la de antes: fallan 11 casos. Son los 2 del tester y 9 míos: las 6 combinaciones, el del mismo milisegundo, el camino de T-11 y el del cambio de pestaña.
- Sin `errorUpdateCount` en `claveDeFocoDeLaTarea`: fallan 3, los dos del mismo milisegundo (edición y detalle) y el unitario.

### Verificación (comando exacto y última línea)
Carga medida antes de la suite completa, con dos lecturas separadas 10 s: 19 % y 16 %.

| Comando | Última línea |
|---|---|
| `cd frontend; npm run lint` | `> tsc -b` (exit 0) |
| `cd frontend; npx vitest run src/features/tareas` (aislado) | `Tests  225 passed (225)` (`Test Files  7 passed (7)`) |
| `cd frontend; npm test` (una corrida) | `Tests  2140 passed (2140)` (`Test Files  141 passed (141)`, 79.69 s) |
| `cd frontend; npm run build` | `✓ built in 1.76s` |
| raíz `npm run build` | `✓ built in 713ms` (exit 0) |
| raíz `npm run lint` | `> tsc -b` (exit 0) |

### Conteos
- `cd frontend; npx vitest list | grep -c " > "` da 2140 casos. Antes eran 2124: son 16 casos normales más.
- Reparto por archivo: `editar-tarea-view.test.tsx` +12 (38 → 50), `detalle-tarea-view.test.tsx` +2 (43 → 45), `lib.test.ts` +2 (35 → 37).

### Archivos tocados
- `frontend/src/features/tareas/`: `lib.ts`, `types.ts`, `editar-tarea-view.tsx`, `detalle-tarea-view.tsx`, `lib.test.ts`, `editar-tarea-view.test.tsx` y `detalle-tarea-view.test.tsx`.
- `docs/DESIGN.md` §7.20: una frase con la marca "propuesta (TAREAS-01d), T-15". Dice que cada fallo nuevo cuenta como cambio y que las dos vistas usan `claveDeFocoDeLaTarea`.

### V-01
Las 156 `*.ataque` (backend, frontend y shared) coinciden con la tabla al final de "## TAREAS-01d — Ronda 3": `diff` vacío, 156/156.

### Desviaciones
- La clave del detalle también cambió: ganó `errorUpdateCount` al pasar a la función común. Es el mismo remedio, aplicado al hermano del mismo milisegundo que el tester señaló en su reporte.
- Ninguna otra.

### Pendiente
Nada de T-15.

### M-01 de la revisión final: viñetas de §7.3
Las dos viñetas de 01d en `docs/DESIGN.md`, "Selector de una lista corta, `components/ui/native-select.tsx`" y "Control segmentado de dos botones para una política", salieron del final de §7.6 (líneas 488-489, con su línea en blanco) y quedaron al final de §7.3, como líneas 415-416, antes de "### 7.4". El texto no cambió.
Comprobación con `git diff -U0 ad670c9 -- docs/DESIGN.md`: el hunk `@@ -487,0 +488,3 @@` de §7.6 desapareció y quedó `@@ -414,0 +415,2 @@` en §7.3. §7.6 es idéntica a la de `ad670c9` (`diff` vacío de la sección). Sin pruebas, por el carril trivial.
