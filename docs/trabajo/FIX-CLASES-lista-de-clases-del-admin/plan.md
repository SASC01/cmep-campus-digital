# Plan — FIX-CLASES · lecturas con relaciones anidadas en una sola instantánea y aislamiento de una prueba de ataque
Estado: LISTO (Enmienda 1 pendiente de A-2 del humano; índice al final del archivo)
Carril: normal (lo fijó el humano el 2026-10-06; no toca `middleware/`, `adapters/auth`, sesiones ni contraseñas, migraciones ni `infra/`)
Requisitos: RN-06 y ESSENTIALS "Reglas de negocio · Clases" (una clase tiene de uno a dos maestros y nunca queda sin maestro); los contratos de `claseAdminSchema`, `claseInscritaSchema`, `claseImpartidaSchema` y `claseDetalleSchema` (`shared/src/clases.ts`); ESSENTIALS "Reglas de datos" (`enTransaccion`, `P2028` → `503`, sin N+1, paginación). No hay `RF` nuevo: es la corrección de un defecto del dominio CLASES (regla del humano del 2026-10-02: un `500` en un flujo de usuario en corrida limpia es del dominio).

Rama `fix/clases` desde `main` = `ad070b9`. Base de "No se toca" `<R>` = `ad070b9`. Un solo commit del humano al cerrar, con su propio PR. Contexto heredado: `contexto-de-tareas-01a.md` (arbitraje del manager y extracto del tester de TAREAS-01a). Instrucción literal: `aprobacion.md`.

Convenciones: decisiones `§D-n`; pruebas requeridas `PR-FX-nn`; cambios que contradicen pruebas existentes `C-n` (§D-R0); paradas `PA-n`; verificaciones `V-n`; riesgos `R-n`; suposiciones `S-nn`; observaciones con destino `O-n`.

## Preguntas bloqueantes

Ninguna. La única decisión que cambiaría el diseño (activar la vista previa `relationJoins` de Prisma en lugar de una instantánea única) tiene una opción razonable por defecto: no activarla (S-01). Si el humano prefiere `relationJoins`, lo dice al aprobar y el plan se rehace (R-04 explica qué costaría).

## Suposiciones

| Id | Suposición | Por qué |
|---|---|---|
| S-01 | **No se activa `relationJoins`.** En Prisma 7.10 sigue siendo vista previa: el generador de tipos solo agrega `relationLoadStrategy` si `isPreviewFeatureOn("relationJoins")` (`node_modules/prisma/build/cli.js`), y el cliente generado de hoy no lo tiene (`grep relationLoadStrategy` en `adapters/db/generated` → 0). Activarla cambia **todas** las consultas con relaciones del proyecto a la vez | Un `fix` no debe cambiar el comportamiento de la base de datos de todo el backend por una vista previa. La instantánea única corrige la familia afectada sin tocar nada más (§D-1) |
| S-02 | Cuando una clase se borra **mientras** se lee, la respuesta correcta es la de la instantánea: la clase sale completa, con sus maestros, como si la petición hubiera llegado justo antes del borrado. No se omite ni se responde `403` | Es lo que da una lectura consistente; omitirla cambiaría el tamaño de la página y el cursor, y el contrato no prevé una clase "a medio borrar" |
| S-03 | **Los usuarios no se borran físicamente** (comentario de `Publicacion` en `schema.prisma`: "no hay bajas físicas de usuarios"; ninguna ruta borra usuarios; las FK de autoría y de `maestros_de_clase.maestro_id` son `RESTRICT`). Las lecturas cuya relación anidada apunta a un `usuario` no entran en el remedio | Una fila de `usuarios` no puede desaparecer entre dos sentencias de una petición. Si un encargo futuro agrega bajas físicas, revisa el inventario de §D-3 (O-2) |
| S-04 | `listarPersonas` y el sexto paso (`buscarDatosDePertenencia`) quedan fuera del remedio | Ya degradan a `403` sin `500` cuando la clase se borra en medio (§D-3); el sexto paso corre en **cada** petición con `:claseId` y una transacción ahí cuesta una conexión más por petición sin beneficio |
| S-05 | El archivo de pruebas nuevo puede ponerle `application_name` a la URL de **su propio** pool (`construirApp({ env: { ...env, DATABASE_URL: <con marca> } })`), sin tocar `setup.ts`, `global-setup.ts` ni `vitest.config.ts` | Cada archivo de Vitest tiene su propio proceso y su propio cliente de Prisma (`isolate` por defecto); la marca solo identifica las conexiones de ese archivo para la detección determinista de §D-4. La URL sigue apuntando a la base desechable que validó `setup.ts` |
| S-06 | Comprobación humana: **ninguna**. No cambia el frontend ni ningún texto, ruta, esquema o permiso | Todo se verifica con pruebas automáticas |
| S-07 | El orden de los maestros sigue saliendo de `ORDEN_DE_MAESTROS`; el remedio no toca los `select` ni el mapeo, solo dónde corren | "No sobreconstruyas" |

## Alcance

**Entra:**
1. Una opción nueva de `enTransaccion` (`adapters/db/cliente.ts`): `{ instantaneaUnica: true }`, que abre la transacción en REPEATABLE READ, solo para lecturas (§D-1, §D-2).
2. Las cuatro lecturas de `adapters/db/clases.ts` a las que les aplica el defecto corren dentro de esa transacción: `listarClasesAdmin` (el defecto observado), `listarClasesInscritas`, `listarClasesImpartidas` y `leerClase` (que también usa `editarClase`) (§D-3).
3. Una prueba de integración determinista nueva que reproduce la carrera de cada una, falla antes del remedio y pasa después, más la prueba del aislamiento de la opción (PR-FX-01 a PR-FX-05).
4. En la ronda 0, el tester reescribe la aserción intermitente de `backend/test/admin-muro-02b-r1.ataque.test.ts` (C-1).
5. `backend/src/adapters/README.md` (programador) y los textos propuestos para ESSENTIALS "Reglas de datos" y `ARCHITECTURE.md` §14 (orquestador, con autorización del humano).
6. (Enmienda 1, T-01 y T-02) `listarPublicaciones` y `listarComentarios` (`adapters/db/publicaciones.ts`) corren también en una sola instantánea, para que la comprobación del cursor proteja de verdad a la página (§D-5), con sus pruebas PR-FX-06, PR-FX-06b, PR-FX-07 y PR-FX-07b. Requiere A-2.

**No entra:**
- Ningún cambio en `shared/`, `handlers/`, `middleware/`, `core/`, `prisma/`, `frontend/` ni `infra/`. Las rutas, los esquemas, los permisos y las respuestas no cambian.
- `relationJoins` (S-01) ni SQL crudo con `json_agg` (§D-1, opción b).
- Las lecturas declaradas "no aplica" en §D-3 (con su motivo).
- Los "comprobar y después actuar" con una clase que no son lecturas con relaciones anidadas (unirse con código, editar y releer): O-1, para el encargo que agregue la baja de clases.
- El ajuste de ESSENTIALS sobre `claveDeNombre` (decisión del humano en `aprobacion.md`): lo aplica el orquestador en TAREAS-01b, no aquí.
- Las pruebas normales o de ataque que cuentan **todas** las clases con cotas (`gestion-clases.integracion` PR-2A12 y `gestion-02a-r1.ataque:793-799`): no se reescriben (O-3).

## Diseño

### §D-0 · Diagnóstico (confirmado leyendo el código y la dependencia instalada)
- **Cómo resuelve Prisma 7.10 una relación anidada.** Sin `relationJoins`, el plan de consulta usa un nodo `join` en memoria: primero la sentencia del padre y después, por cada relación, otra sentencia sobre la tabla hija con `WHERE <llave> IN (…)`, unidas en JavaScript (`node_modules/@prisma/client/runtime/client.mjs`, `case"join"` y la función que une hijos con padres). Para una relación a uno (`isRelationUnique`), si la fila hija no aparece, el campo queda en `null` aunque el tipo diga que no puede serlo; para una a muchos, queda `[]`.
- **Fuera de una transacción**, cada sentencia va al pool por su cuenta y, en READ COMMITTED, toma su propia instantánea. Un borrado confirmado entre la sentencia del padre y la del hijo deja: una clase con `maestros: []` (`listarClasesAdmin`, `leerClase`, `listarClasesInscritas`) o una `clase: null` dentro de la fila (`listarClasesInscritas`, `listarClasesImpartidas`).
- **Dentro de una transacción en READ COMMITTED no se arregla:** las sentencias van por la misma conexión, pero cada una toma su instantánea al empezar (es lo que el protocolo de bloqueo por usuario necesita, `adapters/README.md`). Hace falta REPEATABLE READ: la instantánea se toma en la primera sentencia y todas las demás la comparten.
- **`enTransaccion` hoy** acepta cualquier función (también de solo lectura) pero no deja elegir el aislamiento: solo `{ maxWait }` (`cliente.ts:41-54`). Prisma sí lo acepta (`$transaction(fn, { isolationLevel })`, `Prisma.TransactionIsolationLevel.RepeatableRead` existe en el cliente generado) y `@prisma/adapter-pg` lo aplica con `BEGIN` seguido de `SET TRANSACTION ISOLATION LEVEL …` en la misma conexión (`node_modules/@prisma/adapter-pg/dist/index.mjs`, `startTransaction`).
- **No existe una clase sin maestros en la base** (lo confirmó el manager y lo releí): `crearClaseAdministrada` y `crearClaseDePrueba` crean clase y asignaciones en un solo `create` anidado; `core/clases/maestros.ts` no deja quitar al último maestro, dentro de una transacción con la clase bloqueada; `maestros_de_clase.maestro_id` es `RESTRICT`; ninguna ruta borra clases. Asignar y retirar maestros en paralelo con una lectura tampoco rompe nada: cada estado confirmado tiene de uno a dos maestros y la sentencia de los maestros es una sola. El único disparador es **borrar la clase** entre dos sentencias: hoy, la limpieza de otro archivo de pruebas (`borrarClasesDePrueba`); mañana, una baja de clase de ADMIN.

### §D-1 · Remedio: opciones comparadas

| Opción | Cómo | Ventajas | Costos y riesgos | Veredicto |
|---|---|---|---|---|
| (a) **Instantánea única: `enTransaccion` en REPEATABLE READ** | Las lecturas afectadas corren dentro de `enTransaccion(…, { instantaneaUnica: true })`; Prisma manda todas sus sentencias (cursor, página, relaciones anidadas, total) por la conexión de la transacción, que ve una sola instantánea | Cambio mínimo: los `select`, el orden (`ORDEN_DE_MAESTROS`), `paginar` y el mapeo no cambian. Cubre todos los niveles de anidación, la relación a uno (`null`) y la a muchos (`[]`), y de paso deja el total y el cursor en la misma instantánea que la página. Una transacción de solo lectura en REPEATABLE READ **no** falla por serialización (`40001` solo lo provocan escrituras que chocan) y no toma bloqueos de fila | Una conexión del pool ocupada durante toda la lectura (hoy, `Promise.all` toma dos a la vez por menos tiempo: el uso máximo por petición no sube). Tres viajes más a la base (`BEGIN`, `SET TRANSACTION`, `COMMIT`). Un camino nuevo de `503`: con el pool lleno, la lectura espera una conexión hasta el `maxWait` de Prisma (2 s) y responde `503 SERVICIO_OCUPADO` (P2028 traducido por `enTransaccion`), en vez de esperar sin límite como hoy (el pool de `pg` que crea `PrismaPg` sin configuración tiene 10 conexiones y `connectionTimeoutMillis = 0`). Las lecturas por índice con `take ≤ 101` terminan muy por debajo del `timeout` de 5 s | **Recomendada** |
| (b) Una sola sentencia (SQL etiquetado con `json_agg`) | Reescribir cada lectura como `$queryRaw` con subconsultas que agreguen los maestros y el total | Una sentencia = una instantánea, sin transacción ni conexión extra, sin camino nuevo de `503` | Cuatro consultas a mano: el orden de los maestros se duplicaría en SQL (ESSENTIALS y `clases.ts` dicen que `ORDEN_DE_MAESTROS` es la **única** definición), el cursor de Prisma y `paginar` se reimplementan, se pierden los tipos generados y los resultados crudos hay que validarlos. Mucha superficie nueva para un `fix` | Descartada |
| (b') `relationJoins` | Vista previa de Prisma; con ella la estrategia por defecto pasa a `join` (LATERAL + JSON en una sola sentencia) | Corrige la familia entera en todo el proyecto, también lecturas futuras | Vista previa (S-01); cambia el SQL de **todas** las consultas con relaciones (planes, rendimiento, comportamiento) y obliga a regenerar el cliente; se activa en `schema.prisma` | Descartada; decisión del humano si la quiere (R-04) |
| (c) Tolerar `maestros: []` | Relajar el esquema de respuesta o filtrar la clase vacía | Ninguna conexión extra | El contrato dice de 1 a 2 y el frontend lo da por hecho (`maestro` de compatibilidad = `maestros[0]`). No cubre la `clase: null` de `inscritas` e `impartidas` (un `TypeError` antes del esquema). Filtrar descuadra la página y el cursor | Descartada |

### §D-2 · `enTransaccion` con `instantaneaUnica` (`adapters/db/cliente.ts`)
- **Firma nueva** (la única función de transacciones sigue siendo esta; ESSENTIALS: "Toda transacción se abre con `enTransaccion`"):
  ```ts
  export const enTransaccion = <T>(
    ejecutor: Ejecutor,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    opciones: { maxWait?: number; instantaneaUnica?: true } = {},
  ): Promise<T>
  ```
- **Comportamiento:**
  - Sin opciones, la llamada a Prisma es **idéntica** a la de hoy (`ejecutor.$transaction(fn)`), y con solo `maxWait`, también (`{ maxWait }`). Ninguna transacción existente cambia de aislamiento: el protocolo de bloqueo por usuario depende de READ COMMITTED.
  - Con `instantaneaUnica: true`, pasa `isolationLevel: "RepeatableRead"` (más `maxWait` si viene). El literal de cadena basta para el tipo `Prisma.TransactionIsolationLevel`; no hace falta cambiar la importación de tipo de `Prisma`.
  - El `.catch(traducirErrorDeTransaccion)` no cambia: un `P2028` es `503 SERVICIO_OCUPADO`; cualquier otro error (por ejemplo, el `400 VALIDACION` del cursor) se relanza tal cual.
  - Anidada (el ejecutor ya es un `TransactionClient`), corre `fn` directamente, como hoy, e ignora las dos opciones: no puede cambiar el aislamiento de la transacción de afuera. Se documenta en el comentario.
  - Forma sugerida del cuerpo (la exacta la decide el programador, con estas tres condiciones): construir el objeto de opciones de Prisma solo con las claves presentes; si queda vacío, llamar `ejecutor.$transaction(fn)` sin segundo argumento.
- **Regla de uso (comentario en el código y `adapters/README.md`):** solo para **lecturas** de varias sentencias cuya respuesta exige una relación obligatoria o una cardinalidad mínima que un borrado entre dos sentencias puede romper. Dentro no se escribe: en REPEATABLE READ, una escritura que choca con otra falla con `40001`, que hoy sería un `500`. Dentro, las sentencias van una tras otra (`await` en orden), no con `Promise.all`: en una transacción interactiva comparten una conexión y Prisma las pondría en serie de todos modos.

### §D-3 · Inventario de lecturas con relaciones anidadas (hermanos) y veredicto
Búsqueda en `backend/src/adapters/db/*.ts` (sin `generated/`): `include:`, `_count`, y `select` anidados sobre `maestros`, `maestro`, `inscripciones`, `clase`, `usuario`, `autor`, `publicacion`, `archivos`, `sesiones`, `tokensCuenta`, `registrados`. Los estados vecinos del mecanismo son los momentos en que la clase puede desaparecer: antes del padre, entre el padre y el hijo, entre el hijo y el nieto, entre la lectura del cursor y la página, y entre la página y el total.

| # | Función (archivo) | Padre → hijos | ¿Qué rompe un borrado entre sentencias? | Veredicto |
|---|---|---|---|---|
| 1 | `listarClasesAdmin` (`clases.ts:361`) | `clases` → `maestros_de_clase` → `usuarios`; `_count` de `inscripciones` | Entre `clases` y `maestros_de_clase`: `maestros: []` → `ZodError too_small` → `500` (el defecto observado). Entre el cursor y la página: página vacía en lugar de `400` (regla T-18). Entre la página y el total: total descuadrado (inocuo) | **Aplica.** Remedio §D-2; PR-FX-02 |
| 2 | `listarClasesInscritas` (`clases.ts:294`) | `inscripciones` → `clases` (a uno) → `maestros_de_clase` → `usuarios` | Entre `inscripciones` y `clases`: `fila.clase` es `null` → `TypeError` en el mapeo → `500`. Entre `clases` y `maestros_de_clase`: `maestros: []` → `maestro: undefined` en el handler → `ZodError` → `500` | **Aplica.** Remedio §D-2; PR-FX-03a y PR-FX-03b (los dos estados) |
| 3 | `listarClasesImpartidas` (`clases.ts:243`) | `maestros_de_clase` → `clases` (a uno, con `_count`) | Entre `maestros_de_clase` y `clases`: `fila.clase` es `null` → `TypeError` → `500`. Retirar al maestro en medio no rompe nada (la clase sigue) | **Aplica.** Remedio §D-2; PR-FX-04 |
| 4 | `leerClase` (`clases.ts:191`), también al final de `editarClase` | `clases` → `maestros_de_clase` → `usuarios` | Entre `clases` y `maestros_de_clase`: `maestros: []` → `conMaestroPrincipal` lanza `500 ERROR_INTERNO` (o el esquema). Si la clase se borra antes del padre: `null` → `403` (correcto) | **Aplica.** Remedio §D-2 (en `leerClase`; `editarClase` no cambia y hereda el remedio porque le pasa su ejecutor); PR-FX-05 |
| 5 | `listarPersonas` (`inscripciones.ts:104`) | `clases` → `maestros_de_clase` → `usuarios`, en paralelo con `inscripciones` → `usuarios` | Si la clase desaparece antes o en medio: `clase === null` o `maestros` vacío → devuelve `null` → `403 SIN_ACCESO_A_LA_CLASE`, la respuesta documentada de una clase inexistente. Los alumnos apuntan a `usuarios` (S-03) | **No aplica** (degrada a `403`, sin `500`) |
| 6 | `buscarDatosDePertenencia` (`clases.ts:25`, sexto paso) | `clases` → `maestros_de_clase` y `inscripciones` filtrados por el usuario | Un borrado en medio da `{ esMaestro: false, inscrito: false }` → `403`, o deja pasar al admin a un handler que ya maneja la clase inexistente (`null` → `403`). Falla cerrado; sin cardinalidad mínima | **No aplica** (S-04); además es el camino de cada petición con `:claseId` |
| 7 | `crearClaseAdministrada` (`clases.ts:133`) | `create` anidado con `select` de maestros | La clase es nueva: nadie más la ve ni la puede borrar antes de que confirme | **No aplica** |
| 8 | `leerMaestros` en `asignarMaestro` y `retirarMaestro` (`maestros-de-clase.ts`) | `maestros_de_clase` → `usuarios` | Corren dentro de una transacción que ya tiene la fila de la clase con `FOR NO KEY UPDATE`: el `DELETE` de la clase (que pide `FOR UPDATE`) espera a que confirme | **No aplica** |
| 9 | `listarAlumnosDeClase` y `buscarCandidatos` (`inscripciones.ts`) | `inscripciones` → `usuarios`; `usuarios` → `inscripciones` filtradas | Apuntan a `usuarios` (S-03) o a una relación a muchos que admite vacío (`yaInscrito: false`). Una baja de alumno en medio deja la fila de `usuarios` | **No aplica** |
| 10 | `listarPublicaciones` y `listarComentarios` (`publicaciones.ts`) | `publicaciones`/`comentarios` → `usuarios` (autor, `RESTRICT`); comprobación del cursor (`findFirst`) y página (`findMany` con el `cursor` de Prisma) en sentencias distintas; conteo y adjuntos (o la comprobación de la publicación) en sentencias aparte | El borrado de la clase o de una publicación en medio no da `500` (el esquema admite `comentarios: 0`, `adjuntos: []` o una lista vacía; el autor no desaparece, S-03). **Pero** si la fila del cursor se borra entre su comprobación y la página (un `DELETE` normal del autor, del maestro moderador o del admin), Prisma devuelve una página vacía aunque queden filas detrás, y "Ver más" oculta el resto del muro o del hilo: viola la regla T-18/T-29 (cursor borrado → `400`, nunca una página vacía). *Corregido en la Enmienda 1: la versión original solo evaluó el `500` y el borrado de la clase* | **Aplica (frontera cursor→página; T-01, T-02).** Remedio §D-5; PR-FX-06, PR-FX-06b, PR-FX-07, PR-FX-07b |
| 11 | `borrarPublicacion`, `borrarComentario`, `crearPublicacion`, `crearComentario` | lectura del autor dentro de su transacción | Autor `RESTRICT`; ya están en transacción | **No aplica** |
| 12 | `buscarSesionPorHash` (`sesiones.ts`), `buscarTokenPorHash`, `buscarInvitacionPorHash`, `buscarTokenParaEnvio` (`tokens-cuenta.ts`) | `sesiones`/`tokens_cuenta` → `usuarios` (a uno) | Solo si se borrara el usuario (S-03). Además son AUTH: tocarlas sería carril sensible | **No aplica** |
| 13 | `listarEnlacesRegistro` (`enlaces-registro.ts`) | página + `groupBy` aparte | Los enlaces no se borran (se revocan); el conteo admite 0 | **No aplica** |

**Nota de la Enmienda 1 · frontera cursor→página en todo el inventario.** La tabla de arriba evaluó el borrado de la clase entre sentencias; le faltó un estado vecino: **la fila del cursor deja de existir entre su comprobación y la página**. Con el `cursor` de Prisma, la página se ancla en esa fila; si ya no está, Prisma devuelve `[]` sin avisar (la razón de la regla T-18). Búsqueda: `grep "cursor: {"` y `cursor === undefined` en `adapters/db` (sin `generated/`).

| Lectura con cursor | Cómo pagina | ¿Quién puede borrar la fila del cursor hoy? | Veredicto de la frontera cursor→página |
|---|---|---|---|
| `listarClasesAdmin`, `listarClasesInscritas`, `listarClasesImpartidas` (`clases.ts`) | Comprobación por PK + `cursor` de Prisma | Hoy la limpieza de pruebas; mañana una baja de clase o de inscripción | **Protegidas** desde la implementación de FIX-CLASES (instantánea única); el tester lo comprobó con un gancho en la ronda 1 |
| `listarPublicaciones` (`publicaciones.ts`) | `findFirst` del cursor + `findMany` con `cursor` | El autor, el admin (`DELETE …/publicaciones/:publicacionId`) | **Aplica: T-01.** §D-5 |
| `listarComentarios` (`publicaciones.ts`) | `findFirst` del cursor + `findMany` con `cursor` | El autor, el maestro moderador, el admin (`DELETE …/comentarios/:comentarioId`, `mis-comentarios`) | **Aplica: T-02.** §D-5 |
| `listarEnlacesRegistro` (`enlaces-registro.ts:44`) | `findMany` con `cursor` sobre `enlaces_registro`, **sin** comprobación previa | Nadie: los enlaces se revocan (`revocado_en`), no se borran, y ninguna ruta ni la limpieza programada los borra | **No aplica hoy** (sin disparador). O-4 |
| `listarRegistradosPorEnlace` (`enlaces-registro.ts:144`) | `findMany` con `cursor` sobre `usuarios`, sin comprobación previa del cursor | Nadie: no hay bajas físicas de usuarios (S-03) | **No aplica hoy** (sin disparador). O-4 |
| `listarPersonas`, `listarAlumnosDeClase` (`inscripciones.ts`, `condicionesDePagina`) | Conjunto de claves (`nombre_busqueda`, `usuario_id`) leído de `usuarios`, sin el `cursor` de Prisma | Una baja del alumno borra su inscripción, no su fila de `usuarios` | **Inmunes por diseño**: la clave de orden sobrevive a la baja (ya lo dice `adapters/README.md`) |

Las demás filas del inventario no paginan con cursor.

### §D-5 · Enmienda 1: `listarPublicaciones` y `listarComentarios` en una sola instantánea (T-01, T-02)
- **Remedio elegido:** el mismo de §D-2, sin mecanismo nuevo. El cuerpo completo de cada función corre en `enTransaccion(ejecutor, async (tx) => { … }, { instantaneaUnica: true })`, con `tx` en todas sus sentencias y en el mismo orden de hoy (ya son secuenciales):
  - `listarPublicaciones`: la comprobación del cursor (`publicacion.findFirst`), la página (`publicacion.findMany` con `cursor`), el conteo de comentarios (`comentario.groupBy`) y los adjuntos (`archivo.findMany`). El retorno temprano de la página vacía y el cálculo de `puedeBorrar` quedan dentro, igual.
  - `listarComentarios`: la comprobación de la publicación (`publicacion.findFirst`), la del cursor (`comentario.findFirst`) y la página (`comentario.findMany` con `cursor`).
  - Con la instantánea, si la fila del cursor se borra después de comprobarla, la página la sigue viendo y devuelve **las filas que siguen** (el contrato admite "`400` o las que siguen"; nunca una página vacía con filas detrás). Un cursor que ya no existía **antes** de la primera sentencia sigue dando `400 VALIDACION` "cursor: no es válido" (`errorCursorInvalido()`), igual que hoy. De paso, el conteo de comentarios y los adjuntos salen de la misma instantánea que la página (estados vecinos página→conteo y página→adjuntos), y los comentarios de la misma que la comprobación de la publicación (publicación→comentarios).
  - Nada más del archivo cambia: ni los `select`, ni el orden, ni los errores, ni las funciones de escritura. Ninguna de las dos escribe dentro.
- **El `ejecutor` opcional.** Las dos aceptan `ejecutor: Ejecutor = obtenerDb()`. Quién las llama hoy (`grep` en `backend/src`): solo `handlers/clases/muro.ts:126` y `:203`, sin segundo argumento, es decir, con el cliente: abren su propia transacción REPEATABLE READ. Ningún adaptador las llama dentro de otra transacción. Si en el futuro alguien les pasa un `TransactionClient`, corren dentro de la transacción de afuera y con **su** aislamiento (PR-FX-01 ya fija que la opción anidada no lo cambia): la protección de la frontera queda a cargo de quien abrió esa transacción. Se dice en el comentario de las dos funciones y en `adapters/README.md`, y V-04 comprueba que sigan llamándose solo desde `muro.ts` sin ejecutor. En las pruebas, un doble del cliente que expone `$transaction` (el del tester en `lecturas-fx-r1.ataque`, y el del programador en PR-FX-06 y PR-FX-07) entra por la rama del cliente y abre la instantánea, así que las pruebas ejercen el código de producción tal cual.
- **Alternativa comparada: una sola sentencia por conjunto de claves.** Leer primero el `(creado_en, id)` del cursor y pedir la página con un `where` de "después de esa clave" (como `condicionesDePagina` de `inscripciones.ts`), sin el `cursor` de Prisma. La página ya no depende de que la fila del cursor exista, sin transacción ni conexión extra. **Descartada:** cambia la forma de dos consultas que hoy funcionan (riesgo de regresión en el orden y los empates, con `creado_en` de milisegundos), no cubre los estados vecinos página→conteo, página→adjuntos y publicación→comentarios, y se aparta del remedio que ya se aplicó a las tres listas de `clases.ts`. La instantánea son dos envolturas y la misma regla para todas las lecturas con cursor del proyecto.
- **Costo:** el de §D-1 (a). El muro y el hilo se leen en cada vista de clase: cada lectura ocupa una conexión durante sus 2 a 4 sentencias (hoy las toma una tras otra del pool) y, con el pool lleno más de 2 s, responde `503` (R-01).
- **Regla ampliada** (comentario de `enTransaccion`, `adapters/README.md` y textos de A-1 con la redacción de A-2): la instantánea única se usa en las lecturas de varias sentencias cuya respuesta exige una relación obligatoria o una cardinalidad mínima, **o que comprueban la fila del cursor en una sentencia y leen la página en otra**.

### §D-4 · Cómo se reproduce la carrera de forma determinista (PR-FX-02 a PR-FX-05)
Una sentencia `SELECT` normal no espera bloqueos de fila, así que la carrera no se puede retener con `FOR UPDATE`. Sí espera un bloqueo de **tabla** `ACCESS EXCLUSIVE`, el único modo que choca con el `ACCESS SHARE` de un `SELECT`. El método, ya usado en el proyecto (`cuentas-r1.ataque.test.ts:129-182`, con `LOCK TABLE usuarios … NOWAIT`):
1. **Marca del pool.** El archivo construye su app en `beforeAll`, antes de cualquier otra llamada a la base (`inicializarDb` es idempotente: la primera URL gana), con `DATABASE_URL` + `application_name=<marca única>` agregado con `URL.searchParams` (S-05); las llamadas directas a los adaptadores del mismo archivo usan ese mismo cliente. pg-boss también recibe la URL marcada, pero nunca toca las tablas retenidas, y la consulta del punto 4 filtra por tabla. Comprueba al empezar, como precondición, que `SELECT current_setting('application_name')` por `obtenerDb()` devuelve la marca (si no, la prueba falla con el mensaje "Precondición: el pool de este archivo no lleva la marca application_name").
2. **Retenedora.** `obtenerDb().$transaction(async (tx) => { … }, { timeout: 15_000, maxWait: 5_000 })`. Su primera sentencia es `LOCK TABLE <tabla> IN ACCESS EXCLUSIVE MODE NOWAIT`, con la tabla escrita literal (dos ramas: `clases` y `maestros_de_clase`; nunca interpolada). Si falla con `55P03` (otro archivo tiene la tabla), se reintenta con una transacción nueva, espera aleatoria de 20 a 50 ms y presupuesto de 60 s (la misma clasificación del error que `cuentas-r1`, reescrita en el archivo nuevo: nunca se importa de una `*.ataque`). Con `NOWAIT` la retenedora nunca se forma en la cola de la tabla (CHORE-02; lo vigila PR-CH-01c).
3. **Lanzar la lectura** (la petición HTTP o la llamada al adaptador) **dentro** de la retenedora, ya con la tabla tomada, guardando la promesa en una variable de afuera. **Nunca** se devuelve esa promesa desde la función de la transacción: Prisma esperaría a que termine antes de confirmar y la lectura espera a la tabla (bloqueo mutuo hasta el `timeout`).
4. **Esperar a que la lectura esté formada detrás de la tabla**, sondeando por `obtenerDb()` (otra conexión, fuera de la retenedora) cada 25 ms, con límite de 4 s:
   ```sql
   SELECT count(*)::int AS n
   FROM pg_locks l
   JOIN pg_class c ON c.oid = l.relation
   JOIN pg_stat_activity a ON a.pid = l.pid
   WHERE l.locktype = 'relation' AND NOT l.granted
     AND c.relname = ${tabla}
     AND a.application_name = ${marca}
     AND ${pidDeLaRetenedora}::int = ANY(pg_blocking_pids(l.pid))
   ```
   Solo cuenta procesos **de este archivo** que esperan **esa tabla**, detrás de **esta** retenedora: la misma idea que `formadasDetrasDe` para filas (AGENTS, "Bloqueos en las pruebas"), aplicada a una tabla. `formadasDetrasDe` no cambia. Precondiciones con `expect` y mensaje: la lectura quedó formada en 4 s, y **no** terminó antes de formarse (si terminara sin esperar, la prueba no estaría ejerciendo la carrera: "Precondición: la lectura terminó sin esperar la tabla retenida").
5. **Borrar la clase** desde la retenedora (`tx.clase.deleteMany({ where: { id } })`, `count` 1; la cascada borra sus asignaciones e inscripciones; la clase de la prueba no tiene movimientos) y salir de la función: la retenedora confirma.
6. Fuera de la retenedora: esperar la lectura y comprobar el resultado, y que la clase ya no existe en la base (prueba de que el borrado confirmó con la lectura en vuelo).

Por qué es determinista: la lectura solo puede reanudar después del `COMMIT` del borrado, y para entonces ya leyó al padre (las tablas del padre no están retenidas). Antes del remedio, la sentencia del hijo toma una instantánea nueva y no ve las filas borradas; después, ve la de la primera sentencia. Las retenciones de esta prueba duran milisegundos (el límite de 4 s solo protege contra un cuelgue) y quedan por debajo del `timeout` de 5 s de las transacciones de otros archivos que esperen esa tabla.

Qué tabla se retiene en cada caso (la del primer hijo, que el padre no toca):

| Prueba | Lectura | Padre (no retenido) | Tabla retenida | Antes del remedio | Después |
|---|---|---|---|---|---|
| PR-FX-02 | `GET /api/admin/clases?cursor=<K>&limite=1` (HTTP) | `clases` | `maestros_de_clase` | `500` (`ZodError too_small` en `clases[0].maestros`) | `200`, la clase con sus maestros |
| PR-FX-03a | `listarClasesInscritas` (adaptador) | `inscripciones` | `clases` | rechaza (`TypeError` por `clase` nula) | resuelve, la clase con su maestro |
| PR-FX-03b | `listarClasesInscritas` (adaptador) | `inscripciones` | `maestros_de_clase` | `maestros: []` | la clase con su maestro |
| PR-FX-04 | `listarClasesImpartidas` (adaptador) | `maestros_de_clase` | `clases` | rechaza (`TypeError`) | resuelve, la clase con `alumnos: 0` |
| PR-FX-05 | `leerClase` (adaptador) | `clases` | `maestros_de_clase` | `maestros: []` | la clase con su maestro |

`leerClase` se prueba en el adaptador y no por `GET /api/clases/:claseId` porque el sexto paso de esa ruta lee las mismas tablas antes del handler y se formaría primero detrás de la retención. `inscritas` e `impartidas` se prueban en el adaptador para no depender de los bloqueos de `usuarios` que toman otros archivos (`cuentas-r1`, hasta 1.5 s) en el middleware; PR-FX-02 sí va por HTTP para reproducir el síntoma exacto del defecto (el `500`).

### §D-R0 · Cambios que contradicen pruebas existentes (ronda 0 del tester)

| C-n | Cambio | Qué conserva | Dónde |
|---|---|---|---|
| C-1 | La aserción `expect(await obtenerDb().comentario.count({ where: { autorId: admin.id } })).toBe(0)` cuenta los comentarios del admin **en toda la base**. El admin es la cuenta única de la corrida y `muro-admin.integracion.test.ts` siembra comentarios suyos con `crearComentarioDePrueba` mientras corre en paralelo (línea 668, y con la ayuda `nuevo` de la línea 376 en las líneas 394, 400 y 407; el contexto heredado citaba también la 283, que en `ad070b9` es un comentario de un alumno): rojo intermitente (`expected 3 to be +0`, ronda 1 de TAREAS-01a). Se acota al escenario del caso: los comentarios del admin **en la clase del caso** (`where: { autorId: admin.id, publicacion: { claseId: clase.id } }`) | Que ningún intento del admin escribió un comentario: todos los intentos del caso (con el id de clase en minúsculas y en mayúsculas, con barra final, `PUT`, `PATCH`, `mis-comentarios`) van a `clase.id`, así que acotar a esa clase no pierde ningún intento. Se conservan `expect(fallas).toEqual([])` y la aserción de que el comentario de la alumna sigue (`comentario.count({ where: { id: deAlumna } })` = 1). El tester puede reforzarla contando también por publicación (`publicacionId: { in: [delMaestro, delAdmin] }`), sin ampliar el alcance a toda la base | `backend/test/admin-muro-02b-r1.ataque.test.ts:391`, caso "comentar en su publicación y en la de un maestro, mis-comentarios, y los métodos que no existen…" del bloque "ataque CLASES-02b r1: el admin no comenta (P-03 a)" |

**Hermanas buscadas** (conteos sobre toda la base que pueden cruzarse con otros archivos):
- `usuario.count({ where: { rol: "admin" } })` = 1 (`admin-unico.*`, `cuentas-r1:592`, `cuentas-03a-r1:496`, `enlaces-03b-r1:234`, `invitacion-masiva-03c-r1:297` y `:354`, `sesiones-y-cadena:640`): **no** son intermitentes; el índice único parcial garantiza un solo admin en cualquier instante. No se tocan.
- Conteos del admin acotados a una clase o publicación (`admin-muro-02b-r1:333` y `:336`, `gestion-02a-r1:317` y `:371`): ya están acotados. No se tocan.
- `clase.count()` como cota del `total` en `gestion-clases.integracion` PR-2A12 (prueba normal, líneas 353-367) y `gestion-02a-r1.ataque:793-799`: riesgo teórico, no observado (O-3). No se tocan en FIX-CLASES.
- **Víctimas del defecto, no hermanas:** toda prueba que pide `GET /api/admin/clases` (lista global) podía caer en el `500` antes del remedio: `gestion-clases.integracion` y `gestion-02a-r1.ataque`, entre otras. No se cambian; después del remedio quedan protegidas.

Rojos esperados de la ronda 0: **ninguno** (C-1 vuelve estable un caso verde).

## Cambios por capa

### shared/
Ninguno.

### backend/core/
Ninguno. No hay lógica pura nueva: el remedio es de acceso a datos.

### backend/adapters/
**`adapters/db/cliente.ts`**
- `enTransaccion` con la opción `instantaneaUnica?: true` de §D-2. Se actualiza su comentario: qué hace la opción, que es solo para lecturas, que anidada no cambia el aislamiento y que sin opciones la llamada es la de antes. Sigue siendo el único lugar de `backend/src` con `.$transaction(` (PR-CH-04h).
- Nada más cambia en el archivo (`inicializarDb`, `obtenerDb`, `cerrarConexion`, `ejecutorSqlDe` intactos).

**`adapters/db/clases.ts`** (las cuatro funciones de §D-3 marcadas "Aplica"; nada más del archivo cambia)
- `listarClasesAdmin`: el cuerpo completo (la lectura del cursor por PK, la página, el total y el mapeo) pasa a `enTransaccion(ejecutor, async (tx) => { … }, { instantaneaUnica: true })`, con `tx` en lugar de `ejecutor` en las tres consultas y en este orden: cursor (si viene), `tx.clase.findMany(…)` y `tx.clase.count()` (secuenciales, sin `Promise.all`). Los `select`, `orderBy`, `take`, `cursor`/`skip`, `paginar` y el resultado no cambian. El comentario de las líneas 357-360 se actualiza: "Prisma resuelve los maestros de la página con otra sentencia (una para toda la página, no una por fila); por eso la lectura corre en una sola instantánea (FIX-CLASES): un borrado de la clase entre las dos sentencias dejaría una clase sin maestros".
- `listarClasesInscritas` y `listarClasesImpartidas`: lo mismo (cursor por PK, página, total; secuenciales; mismo mapeo).
- `leerClase`: `enTransaccion(ejecutor, async (tx) => { const fila = await tx.clase.findUnique(…); return fila === null ? null : aClaseDb(fila) }, { instantaneaUnica: true })`.
- `editarClase`: **sin cambios**. Llama a `leerClase(claseId, ejecutor)` con el cliente, así que la relectura abre su propia instantánea. Un borrado entre el `updateMany` y la relectura sigue dando `null` → `403` (correcto: la clase ya no existe).
- Las funciones conservan su firma, su tipo de retorno y sus errores (`400 VALIDACION` del cursor). Pasan de `async` a devolver la promesa de `enTransaccion`, sin cambiar lo que devuelven.

**`adapters/db/publicaciones.ts`** (Enmienda 1; solo con A-2 y solo en estas dos funciones)
- `listarPublicaciones` y `listarComentarios`: el cuerpo completo pasa a `enTransaccion(ejecutor, async (tx) => { … }, { instantaneaUnica: true })`, como dice §D-5. Cambian `ejecutor.` por `tx.` dentro, y pasan de `async` a devolver la promesa de `enTransaccion`; firma, tipo de retorno, errores (`errorCursorInvalido()`), `select`, orden y mapeo, iguales. Un comentario de dos o tres líneas en cada una: por qué la instantánea (T-18/T-29: la comprobación del cursor solo protege a la página si comparten instantánea) y qué pasa con un ejecutor de una transacción externa (§D-5).
- `enTransaccion` ya se importa en el archivo. **Nada más del archivo cambia** (tipos, constantes, `crearPublicacion`, `borrarPublicacion`, `crearComentario`, `borrarComentario`, `borrarMiComentario`, comentarios de cabecera).

**`adapters/db/cliente.ts`** (Enmienda 1): solo el comentario de `enTransaccion`, para la regla ampliada de §D-5 ("…o que comprueban la fila del cursor en una sentencia y leen la página en otra"). El código no cambia.

**`adapters/README.md`** (lo edita el programador; textos en "Documentos")
- Sección "`db/cliente.ts`: `enTransaccion` y el `P2028` (CHORE-02)": párrafo nuevo sobre `instantaneaUnica` (con la oración que agrega la Enmienda 1).
- Sección "`db/clases.ts` (CLASES-a, §D-0.1 y §D-A2)": una oración nueva.
- Sección "`db/publicaciones.ts` y las colas de avisos (CLASES-c, §D-C2 y §D-C3)" (Enmienda 1): una oración nueva.

### backend/handlers/
Ninguno. Las rutas, la cadena de middleware y los esquemas de respuesta no cambian:

| Ruta | Método | Cadena (sin cambios) | Lectura que cambia |
|---|---|---|---|
| `/api/admin/clases` | `GET` | `protegido({ roles: ["admin"] })` | `listarClasesAdmin` |
| `/api/clases/inscritas` | `GET` | `protegido({ roles: ["estudiante"] })` | `listarClasesInscritas` |
| `/api/clases/impartidas` | `GET` | `protegido({ roles: ["maestro"] })` | `listarClasesImpartidas` |
| `/api/clases/:claseId` | `GET` | `protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" })` | `leerClase` |
| `/api/admin/clases/:claseId` | `PUT` | `protegido({ roles: ["admin"], pertenencia: "propiedad" })` | `editarClase` → `leerClase` |
| `/api/clases/:claseId/publicaciones` (Enmienda 1) | `GET` | `protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" })` | `listarPublicaciones` |
| `/api/clases/:claseId/publicaciones/:publicacionId/comentarios` (Enmienda 1) | `GET` | `protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" })` | `listarComentarios` |

### backend/workers/
Ninguno.

### backend/prisma/
Ninguno. Sin migración, sin cambios en `schema.prisma` (tampoco `previewFeatures`).

### infra/ y .env.example
Ninguno. El tamaño del pool no cambia.

### frontend/features/<modulo>/
Ninguno.

## Acceso a datos

Todas las consultas son las de hoy (mismos índices, misma paginación); lo único que cambia es que cada lectura corre en una transacción REPEATABLE READ de solo lectura, con sus sentencias en serie. Prisma agrupa cada relación de toda la página en una sentencia con `IN (…)`: ninguna consulta por fila (sin N+1).

| Lectura | Sentencias (en orden) | Índice | Paginación | Transacción |
|---|---|---|---|---|
| `listarClasesAdmin` | cursor: `clases` por PK · página: `clases` ordenada por `(creado_en DESC, id DESC)`, `take limite + 1` (≤ 101) · hijo: `maestros_de_clase` `clase_id IN (…)` · nieto: `usuarios` por PK · `_count` de `inscripciones` (por el prefijo de la PK `(clase_id, usuario_id)`) con `usuarios.activo` · total: `count(*)` de `clases` | `clases (creado_en DESC, id DESC)`; PK de `maestros_de_clase`; PK de `usuarios`; PK de `inscripciones`. El `count(*)` sin filtro es R-08 de CLASES-02, aceptado | Cursor de Prisma sobre `id`, máximo 100 | `enTransaccion` con `instantaneaUnica` |
| `listarClasesInscritas` | cursor: `inscripciones` por PK · página: `inscripciones` del usuario · hijo: `clases` por PK `IN (…)` · nieto: `maestros_de_clase` · bisnieto: `usuarios` · total: `inscripciones` del usuario | `inscripciones (usuario_id, creado_en DESC, clase_id DESC)`; PK de `clases`, `maestros_de_clase` y `usuarios` | Cursor de Prisma sobre `(clase_id, usuario_id)`, máximo 100 | Igual |
| `listarClasesImpartidas` | cursor: `maestros_de_clase` por PK · página: `maestros_de_clase` del maestro · hijo: `clases` por PK con `_count` · total: `maestros_de_clase` del maestro | `maestros_de_clase (maestro_id, creado_en DESC, clase_id DESC)`; PK de `clases` e `inscripciones` | Cursor de Prisma sobre `(clase_id, maestro_id)`, máximo 100 | Igual |
| `leerClase` | `clases` por PK · `maestros_de_clase` · `usuarios` | PK | No es lista (a lo más 1 clase y 2 maestros) | Igual |
| `listarPublicaciones` (Enmienda 1) | cursor: `publicaciones` por PK con `clase_id` · página: `publicaciones` de la clase, `take limite + 1` · autor: `usuarios` por PK · conteo: `comentarios` `groupBy` por `publicacion_id IN (…)` · adjuntos: `archivos` por `publicacion_id IN (…)` | `publicaciones (clase_id, creado_en DESC, id DESC)`; PK de `usuarios`; `comentarios (publicacion_id, creado_en, id)`; `archivos (publicacion_id)` | Cursor de Prisma sobre `id`, máximo el de `paginacionSchema` | Igual |
| `listarComentarios` (Enmienda 1) | publicación: por PK con `clase_id` · cursor: `comentarios` por PK con `publicacion_id` · página: `comentarios` de la publicación · autor: `usuarios` por PK | `comentarios (publicacion_id, creado_en, id)`; PK de `publicaciones` y `usuarios` | Cursor de Prisma sobre `id` | Igual |

**Conexiones y `P2028`:** cada lectura ocupa una conexión del pool (10 por proceso) desde `BEGIN` hasta `COMMIT`; hoy `Promise.all` ocupa dos a la vez durante menos tiempo, así que el uso máximo por petición no sube. Si el pool está lleno más de 2 s (el `maxWait` por defecto), la lectura responde `503 SERVICIO_OCUPADO`, nunca `500` (R-01). No se toma ningún bloqueo de fila ni se escribe nada, así que estas transacciones no esperan a otras ni las hacen esperar, y no pueden caer en `40001` ni en deadlock.

## Autorización

Sin cambios. Ninguna ruta nueva, ninguna cadena tocada, ningún campo nuevo en las respuestas:
- `GET /api/admin/clases`: solo admin (los demás roles, `403 ROL_NO_PERMITIDO`).
- `GET /api/clases/inscritas`: solo estudiante, sus propias clases.
- `GET /api/clases/impartidas`: solo maestro, sus propias clases.
- `GET /api/clases/:claseId`: estudiante inscrito, maestro de la clase o admin (sexto paso); clase ajena o inexistente, `403 SIN_ACCESO_A_LA_CLASE`.
- `PUT /api/admin/clases/:claseId`: solo admin, en una clase que exista.
- Estado de pago y restricción: ninguna de estas lecturas los selecciona (siguen siendo exclusivos de `listarAlumnosDeClase`). El alumno restringido sigue detenido por `withAccess` antes del handler.

Las pruebas de autorización existentes de estas rutas siguen en verde sin cambios (`clases-autorizacion.integracion`, `gestion-clases-autorizacion.integracion`, `guarda-todas-las-rutas.integracion`, `middleware-orden.integracion` y las `*.ataque` de clases).

## Pruebas requeridas

Todas en un archivo nuevo, `backend/test/lecturas-consistentes.integracion.test.ts`, con el método de §D-4. Cada título empieza por su ID. Se escriben **antes** del remedio y se corren solas contra el código de `<R>` para registrar su rojo (paso 3); después del remedio, en verde.

- **PR-FX-01 · `enTransaccion` y el aislamiento** (lee `SELECT current_setting('transaction_isolation')` dentro de la transacción con `tx.$queryRaw` etiquetado):
  - con `{ instantaneaUnica: true }` → `repeatable read`;
  - sin opciones → `read committed`, y con solo `{ maxWait: 5_000 }` → `read committed` (control: el protocolo de bloqueo por usuario depende de READ COMMITTED);
  - anidada: `enTransaccion(obtenerDb(), (tx) => enTransaccion(tx, leerNivel, { instantaneaUnica: true }))` → `read committed` (la de afuera manda);
  - un `AppError` lanzado dentro de una transacción con la opción sale tal cual (la misma instancia, no `503`).
  Antes del remedio: rojo en el primer punto (la opción no existe y el nivel queda en `read committed`).
- **PR-FX-02 · `GET /api/admin/clases` con la clase borrada entre la página y sus maestros:** dos maestros `a` y `b`; la clase `C` con los dos (`maestroIds: [a, b]`) y la clase centinela `K` (cursor), con `creadoEn` explícito en una fecha lejana en el pasado con milisegundos aleatorios (`K` = base, `C` = base − 1 s), para que ninguna clase de otro archivo quede entre las dos. Precondición sin retención: `GET ?cursor=<K>&limite=1` da `C` primero. Con `maestros_de_clase` retenida y la petición formada, se borra `C`. Después: `200`; `listaClasesAdminRespuestaSchema` acepta el cuerpo; `clases[0].id` es `C`; sus `maestros` son `a` y `b` en el orden de `ORDEN_DE_MAESTROS` (misma `creado_en`: por id); y `C` ya no existe en la base. Antes del remedio: `500`.
- **PR-FX-03a · `listarClasesInscritas` con la clase borrada entre la inscripción y la clase:** un estudiante inscrito solo en `C` (un maestro `m`). Con `clases` retenida, se borra `C`. Después: resuelve; `clases` = `[{ id: C, nombre, maestros: [{ nombre: m.nombre }] }]`, `total` 1. Antes: rechaza (`TypeError` u otro error por `clase` nula).
- **PR-FX-03b · `listarClasesInscritas` con la clase borrada entre la clase y sus maestros:** igual, con `maestros_de_clase` retenida. Después: `maestros` con `m`. Antes: `maestros: []`.
- **PR-FX-04 · `listarClasesImpartidas` con la clase borrada entre la asignación y la clase:** un maestro asignado solo a `C`. Con `clases` retenida, se borra `C`. Después: resuelve; `clases` = `[{ id: C, nombre, alumnos: 0 }]`, `total` 1. Antes: rechaza.
- **PR-FX-05 · `leerClase` con la clase borrada entre la clase y sus maestros:** con `maestros_de_clase` retenida, se borra `C`. Después: no es `null` y `maestros` = `[{ id: m.id, nombre: m.nombre }]`. Antes: `maestros: []`.

**Enmienda 1 (T-01, T-02).** Cuatro casos más en el mismo archivo. Una tabla retenida no separa dos sentencias sobre la misma tabla (la comprobación del cursor y la página), así que estos usan un **doble del ejecutor**, el método del tester en `lecturas-fx-r1.ataque` (reescrito en el archivo del programador; nunca importado de una `*.ataque`): un `Proxy` sobre `obtenerDb()` que reenvía todo (atando las funciones a su objetivo), que en `$transaction(fn, opciones)` llama a la transacción real pasándole a `fn` la transacción envuelta con el mismo gancho (y conserva `opciones`, así que la instantánea se abre de verdad), y que, después de que resuelve **una** llamada concreta `<modelo>.<operación>`, corre el gancho una sola vez antes de devolver el resultado. El gancho borra por **otra** conexión (`obtenerDb()` sin envolver) con la función real del adaptador (`borrarPublicacion` o `borrarComentario`, con el autor como `actor`), que es lo que hace la ruta `DELETE`. El doble se pasa como `ejecutor`, así que el código de producción corre tal cual. Precondición de cada caso: sin gancho, la misma llamada devuelve el resultado esperado (control). Nadie retiene bloqueos: la lectura en instantánea no toma bloqueos de fila y el borrado no la espera.
- **PR-FX-06 · título exacto:** "PR-FX-06: listarPublicaciones con la publicación del cursor borrada entre su comprobación y la página devuelve las publicaciones que siguen". Una clase con P1 a P4 (de la más reciente a la más antigua, `creadoEn` explícitos), `cursor` = P2, `limite` 10. Gancho después de `publicacion.findFirst` (la comprobación del cursor): borra P2. Después del remedio: `publicaciones` = `[P3, P4]` (por id, en ese orden) y `siguienteCursor` `null`; P2 ya no existe en la base. Antes: `[]` (T-01).
- **PR-FX-06b · título exacto:** "PR-FX-06b: listarPublicaciones con una publicación de la página borrada antes del conteo y los adjuntos conserva su conteo de comentarios y sus adjuntos". P3 con un comentario y un archivo `confirmado` de esa publicación (`crearArchivoDePrueba` con `publicacionId`), sin cursor. Gancho después de `publicacion.findMany` (la página): `borrarPublicacion` de P3 (descarta el archivo y borra sus comentarios en cascada). Después: P3 en la página con `comentarios` 1 y `adjuntos` con ese archivo. Antes: `comentarios` 0 y `adjuntos` `[]` (estados vecinos página→conteo y página→adjuntos).
- **PR-FX-07 · título exacto:** "PR-FX-07: listarComentarios con el comentario del cursor borrado entre su comprobación y la página devuelve los comentarios que siguen". Una publicación con K1 a K4 (del más antiguo al más reciente), `cursor` = K2. Gancho después de `comentario.findFirst` (la comprobación del cursor): `borrarComentario` de K2. Después: `comentarios` = `[K3, K4]` y `siguienteCursor` `null`; K2 ya no existe. Antes: `[]` (T-02).
- **PR-FX-07b · título exacto:** "PR-FX-07b: listarComentarios con la publicación borrada entre su comprobación y los comentarios devuelve los comentarios de la instantánea". Una publicación con K1 y K2, sin cursor. Gancho después de `publicacion.findFirst` (la comprobación de la publicación): `borrarPublicacion`. Después: resuelve con `[K1, K2]` (S-02: la respuesta de la instantánea). Antes: `[]` (estado vecino publicación→comentarios).

Las cuatro se escriben y se corren **antes** del remedio de §D-5 (paso E-3): deben caer por el defecto, no por la precondición de control (PA-20). Las dos `*.ataque` del tester de T-01 y T-02 (`lecturas-fx-r1.ataque.test.ts`) deben pasar a verde con el remedio, sin tocarlas.

En cada PR-FX-02 a PR-FX-05, además: las dos precondiciones de §D-4 (formada en 4 s y no terminada antes de formarse) y que `C` no existe al final. Las clases y usuarios se registran para la limpieza de siempre (`borrarMovimientosYClasesDePrueba` antes que `borrarUsuariosDePrueba`; borrar una clase ya borrada no falla). Límite de cada caso: 75 s (presupuesto de reintentos de 60 s, como `cuentas-r1`). Ningún `LOCK TABLE` sin `NOWAIT` (PR-CH-01c lo vigila).

**Lo que ya existe y debe seguir en verde (no son pruebas nuevas):** la paginación, el orden, el total y el `400` del cursor de las cuatro lecturas (`gestion-clases.integracion` PR-2A12, `clases.integracion`, `gestion-02a-r1.ataque`, `clases-r1` a `clases-r4`); la autorización de las cinco rutas (sección anterior); `servicio-ocupado.integracion` y `servicio-ocupado-ch-r1.ataque` (el `503` de `enTransaccion` y el `maxWait`); `higiene-de-pruebas.integracion` (PR-CH-01c y PR-CH-04h).

**Autorización por endpoint:** no hay endpoints nuevos ni cambia ninguna cadena; las pruebas de autorización existentes cubren las cinco rutas (rol incorrecto, clase ajena, alumno restringido, y que no se filtra el estado de pago). Ninguna nueva.

### Pruebas: lista cerrada (PA-16)
| Quién | Crear | Cambiar |
|---|---|---|
| Programador | `backend/test/lecturas-consistentes.integracion.test.ts` | Ninguna. Solo las que reporte la ronda 0 como I-2, con la autorización del humano. **Enmienda 1:** `backend/test/lecturas-consistentes.integracion.test.ts`, solo para **agregar** PR-FX-06, PR-FX-06b, PR-FX-07 y PR-FX-07b y su doble del ejecutor; los casos PR-FX-01 a PR-FX-05 no se tocan. `backend/test/lecturas-fx-r1.ataque.test.ts` no se toca |
| Tester, ronda 0 | — | `backend/test/admin-muro-02b-r1.ataque.test.ts`, solo la aserción de C-1 (línea 391), citando C-1 en un comentario |
| Tester, rondas de ataque | Sus `*.ataque` nuevas (`backend/test/lecturas-fx-r<n>.ataque.test.ts` u otro nombre con `-fx-r<n>`) | Ninguna existente |

## Puntos de ataque para el Tester

PA-07 es regla permanente del tester (`.claude/agents/tester.md`). Este plan fija:
- **Lista de `P2028` permitidos (PA-07 c):** exactamente los 5 de hoy, identificados por ruta y llamada como en CLASES-02: los dos de `cuentas-r3.ataque` (`POST /api/auth/login` y `POST /api/auth/restablecer`) y los tres deterministas de `servicio-ocupado.integracion` (`POST /api/auth/cambiar-contrasena`, `POST /api/auth/refrescar` y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios`); en el registro del manager de TAREAS-01a son `tx.sesion.create`, `tx.tokenCuenta.updateMany`, `tx.sesion.findFirst`, `tx.sesion.updateMany` y `$queryRawUnsafe`. Con su control positivo. **Ningún `P2028` de las cuatro lecturas de FIX-CLASES es permitido** en las corridas del programador y del manager. Si el tester provoca uno a propósito (punto 4), lo identifica por ruta y caso en su reporte y el manager decide.
- **Inventario I-1 (PA-07 b):** los 10 `"Error no controlado"` de CLASES-02 (5 de `buscarCredencialesPorEmail`, 1 de `crearSesion`, 3 `ZodError` de URL del almacén y "boom"); la corrida final de la ronda 0 lo confirma. **La excepción arbitrada en TAREAS-01a para el `ZodError too_small` de `GET /api/admin/clases` no aplica aquí:** después del remedio, ese error en cualquier corrida es un hallazgo que bloquea.
- **PA-12** también aplica al tester.
- **Hermanos (AGENTS):** al reportar un hallazgo, el tester nombra los hermanos del inventario de §D-3 y los estados vecinos del mecanismo (antes del padre, entre el padre y el hijo, entre el hijo y el nieto, entre el cursor y la página, entre la página y el total).

### Ronda 0 (no cuenta en el tope de 3)
1. **Precondiciones:** rama `fix/clases`, árbol limpio dentro de los paquetes contra `<R>` = `ad070b9`; V-01 contra la tabla de la ronda 3 de CLASES-02d (`docs/trabajo/CLASES-02-clases-administradas/reporte-tester.md`: 141 `*.ataque`); PA-01 antes de cualquier prueba del backend.
2. **Reescritura:** C-1, conservando lo que protege (columna "Qué conserva"). Busca además, en las `*.ataque` y en las pruebas normales del backend, conteos sin acotar sobre filas de la cuenta única del admin o sobre tablas que otros archivos llenan en paralelo (`count(` o `findMany(` con `autorId`, `actorId`, `subidoPor`, `usuarioId` del admin, o sin `where`). Si encuentras uno intermitente que el plan no lista, en una `*.ataque` lo reescribes citando C-1 y lo reportas; en una prueba normal lo reportas como I-2. Las hermanas ya revisadas están en §D-R0.
3. **Corrida completa del backend** (una suite a la vez, PA-08), con PA-07 e I-1.
4. **Reporte** en `reporte-tester.md` de esta carpeta, "FIX-CLASES — Ronda 0": el diff de C-1, rojos esperados (ninguno), I-1, I-2 y la tabla de hashes de las 141 `*.ataque` (base de V-01 del programador). Formatea solo el archivo que tocaste, desde `backend/`.

### Rondas de ataque
1. **Otras intercalaciones:** borrar la clase en cada frontera de sentencia de las cuatro lecturas, también con cursor (borrar la clase del cursor entre su lectura y la página: debe dar `400` o una página correcta, nunca una página vacía con más clases detrás), con dos maestros, y retirar o asignar maestros en paralelo con la lectura (nunca 0 ni 3 maestros, nunca `500`).
2. **`editarClase`** con la clase borrada en medio: `200` o `403`, nunca `500`.
3. **Aislamiento:** que ninguna transacción de escritura cambió de nivel (el protocolo de bloqueo por usuario y las de CLASES siguen en READ COMMITTED); que la opción no se puede activar desde fuera de `adapters/db`.
4. **Pool lleno:** las cuatro lecturas con las 10 conexiones del pool de su proceso ocupadas más de 2 s: `503 SERVICIO_OCUPADO`, nunca `500` (con el método de `servicio-ocupado-ch-r1`).
5. **Las "no aplica" de §D-3:** intentar un `500` con el mismo método de §D-4 en `listarPersonas`, el sexto paso, `listarPublicaciones` y `listarComentarios`. Si sale, es un hallazgo (el inventario se equivocó).
6. **Escrituras dentro de la instantánea:** que ninguna de las cuatro funciones escribe dentro de su transacción.
7. **Logs:** ningún `"Error no controlado"` nuevo; ningún `too_small` ni `TypeError` de estas rutas.
8. **(Enmienda 1) El muro y el hilo:** T-01 y T-02 en verde sin cambiar sus casos; la frontera cursor→página con el cursor borrado por cada camino de borrado (autor, maestro moderador, admin, `mis-comentarios`), con cursor en mayúsculas y con el cursor de otra clase o de otra publicación (debe seguir siendo `400`); los estados vecinos página→conteo, página→adjuntos y publicación→comentarios; y el `503` de las dos lecturas con el pool lleno. Si un ataque necesita un cambio fuera de las dos funciones de A-2, se reporta como hallazgo y decide el manager.

## Riesgos y desacuerdos

| ID | Riesgo o desacuerdo | Mitigación |
|---|---|---|
| R-01 | Camino nuevo de `503` en cuatro lecturas (seis con la Enmienda 1: también el muro y el hilo de comentarios, que se leen en cada vista de clase): con el pool lleno más de 2 s, responden `503 SERVICIO_OCUPADO` en lugar de esperar sin límite (hoy, fuera de transacción, el pool de `pg` espera indefinidamente) | Es la regla de ESSENTIALS para toda transacción; el uso máximo de conexiones por petición no sube; ataque 4 |
| R-02 | Alguien usa `instantaneaUnica` en una transacción que escribe y obtiene `40001` (un `500`) | Comentario en `enTransaccion` y en `adapters/README.md`; V-04 (la opción solo aparece en las cuatro lecturas, y ninguna escribe); propuesta para ESSENTIALS. Alternativa no incluida: `SET TRANSACTION READ ONLY` como primera sentencia (una sentencia más por lectura) |
| R-03 | Las pruebas nuevas retienen `clases` o `maestros_de_clase` con `ACCESS EXCLUSIVE`, tablas que leen casi todos los archivos: mientras dura la retención, sus consultas esperan | Precedente aceptado (`cuentas-r1` retiene `usuarios` hasta 1.5 s). Con `NOWAIT` y reintento acotado no se forma cola; la retención dura milisegundos y su límite (4 s) queda debajo del `timeout` de 5 s de las transacciones que esperen. Si en una corrida completa aparece un `P2028` o un tiempo límite en otro archivo durante estas pruebas: PA-12, se reporta, no se repite |
| R-04 | **Alternativa del humano: `relationJoins`.** Corregiría la familia en todo el proyecto (también lecturas futuras, como las de TAREAS), pero es vista previa y cambia el SQL de todas las consultas con relaciones | El plan no la toma (S-01). Si el humano la quiere, es otro encargo (`chore/`), con su propia corrida completa y la revisión de planes de consulta. Recomiendo revisarla cuando sea estable |
| R-05 | Dependencia de Prisma: si una versión futura resuelve las relaciones en una sola sentencia o deja de aplicar `isolationLevel` con `@prisma/adapter-pg` | PR-FX-01 detecta lo segundo. Lo primero solo haría pasar PR-FX-02 a PR-FX-05 también sin el remedio (no las rompe) |
| R-06 | Conflicto al fusionar `main` en `feat/tareas`: TAREAS-01a puede haber editado `adapters/README.md` | Secciones distintas; lo resuelve el orquestador al fusionar. Las lecturas nuevas de TAREAS (temas y categorías) se revisan contra la regla nueva en el plan de 01b (pendiente para ESTADO §3) |
| R-07 | La regla nueva de "Reglas de datos" es una decisión nueva de ESSENTIALS | El arquitecto propone el texto; lo aplica el orquestador solo con autorización del humano (A-1) |

### Observaciones con destino (para ESTADO §3; las anota el orquestador)
- **O-1:** "comprobar y después actuar" con una clase fuera de este alcance: `POST /api/clases/unirse` (`buscarClasePorCodigo` y después `inscribir`: si la clase se borra en medio, la FK falla), `editarClase` (actualizar y releer, hoy da `403`). Destino: el encargo que agregue la baja de clases (ADMIN), que además vuelve a correr el inventario de §D-3.
- **O-2:** mezclas de instantáneas inocuas que quedan (`listarPersonas`, `listarPublicaciones`, `listarComentarios`, el sexto paso) y la suposición S-03 (no hay bajas físicas de usuarios). Destino: el encargo que agregue bajas físicas de usuarios, si llega.
- **O-3:** `clase.count()` como cota del `total` en `gestion-clases.integracion` PR-2A12 y `gestion-02a-r1.ataque:793-799`: si otro archivo crea y otro borra clases dentro de la ventana de una sola petición, el `total` puede quedar fuera de `[min, max]` de los dos conteos. No observado. Destino: pendiente de aislamiento de pruebas, solo si aparece.
- **O-4 (Enmienda 1):** `listarEnlacesRegistro` y `listarRegistradosPorEnlace` (`enlaces-registro.ts:44` y `:144`) paginan con el `cursor` de Prisma **sin** comprobar antes la fila del cursor (la regla T-18 es posterior a AUTH-03b) y fuera de una instantánea. Hoy no hay disparador: los enlaces se revocan y no se borran, y no hay bajas físicas de usuarios (S-03); un cursor inexistente da hoy una página vacía en lugar de `400`. No se tocan en FIX-CLASES (dominio de cuentas, otro archivo protegido, sin defecto observable). Destino: el encargo que agregue el borrado de enlaces o las bajas físicas de usuarios, o el que reabra la gestión de enlaces en ADMIN, que les aplica la comprobación del cursor y la instantánea única.

### Documentos

**Lo edita el programador: `backend/src/adapters/README.md`**
- Sección "`db/cliente.ts`: `enTransaccion` y el `P2028` (CHORE-02)", párrafo nuevo al final:
  > `enTransaccion` acepta `{ instantaneaUnica: true }` (FIX-CLASES) para las **lecturas** de varias sentencias cuya respuesta exige una relación obligatoria o una cardinalidad mínima: abre la transacción en REPEATABLE READ, así todas sus sentencias, incluidas las que Prisma usa para resolver cada relación anidada (sin la vista previa `relationJoins`, una por nivel), ven la instantánea de la primera. En READ COMMITTED cada sentencia toma la suya, y un borrado confirmado entre dos deja, por ejemplo, una clase sin maestros (un `500`). Dentro no se escribe: en REPEATABLE READ, una escritura que choca falla con `40001`. Una transacción de solo lectura en ese nivel no falla por serialización ni toma bloqueos de fila, pero ocupa una conexión durante toda la lectura y, sin conexión dentro del `maxWait`, responde `503` como cualquier otra. Anidada en otra transacción, la opción no cambia el aislamiento de la de afuera. Sin opciones, `enTransaccion` sigue abriendo READ COMMITTED, del que depende el protocolo de bloqueo por usuario. Hoy la usan `listarClasesAdmin`, `listarClasesInscritas`, `listarClasesImpartidas` y `leerClase`.
- Sección "`db/clases.ts` (CLASES-a, §D-0.1 y §D-A2)", al final:
  > `listarClasesAdmin`, `listarClasesInscritas`, `listarClasesImpartidas` y `leerClase` (también la relectura de `editarClase`) corren con `enTransaccion(…, { instantaneaUnica: true })`, con sus sentencias en serie: la página, sus relaciones, el cursor y el total salen de una sola instantánea (FIX-CLASES).
- **(Enmienda 1)** En el párrafo nuevo de la sección de `db/cliente.ts`, después de "…una cardinalidad mínima" se agrega ", o que comprueban la fila del cursor en una sentencia y leen la página en otra (con el `cursor` de Prisma, una fila del cursor borrada en medio da una página vacía aunque queden filas detrás: la regla T-18)", y la última oración queda: "Hoy la usan `listarClasesAdmin`, `listarClasesInscritas`, `listarClasesImpartidas`, `leerClase`, `listarPublicaciones` y `listarComentarios`."
- **(Enmienda 1)** Sección "`db/publicaciones.ts` y las colas de avisos (CLASES-c, §D-C2 y §D-C3)", después de la oración que termina "…fuera de cualquier ciclo.":
  > `listarPublicaciones` y `listarComentarios` corren con `enTransaccion(…, { instantaneaUnica: true })` (FIX-CLASES, T-01 y T-02 de su ronda 1): la comprobación del cursor (y, en los comentarios, la de la publicación), la página, el conteo de comentarios y los adjuntos salen de una sola instantánea. Así, si la fila del cursor se borra después de comprobarla, la página devuelve las filas que siguen en lugar de quedar vacía; un cursor que ya no existía responde `400` como siempre. Llamadas con el ejecutor de una transacción externa, corren con el aislamiento de esa transacción; hoy solo las llama `handlers/clases/muro.ts`, sin ejecutor.

**Los aplica el orquestador al cerrar, solo con la autorización A-1 del humano (SHA-256 resultante en `aprobacion.md`)**
- `docs/ARCHITECTURE-ESSENTIALS.md`, "Reglas de datos", viñeta nueva después de la que empieza "Toda transacción se abre con `enTransaccion`":
  > - Una lectura de varias sentencias (Prisma resuelve cada relación anidada con otra sentencia) cuya respuesta exige una relación obligatoria o una cardinalidad mínima, o que comprueba la fila del cursor antes de leer la página, se hace en una sola instantánea: `enTransaccion` con `instantaneaUnica` (REPEATABLE READ, solo lecturas). Las transacciones que escriben siguen en READ COMMITTED (FIX-CLASES).

  *(Redacción de la Enmienda 1: agrega "o que comprueba la fila del cursor antes de leer la página". A-1 autorizó la redacción anterior; esta se aplica con A-2.)*
- `docs/ARCHITECTURE.md` §14, "Reglas de acceso a datos", viñeta nueva después de "**Transacción que expira (`P2028`).**":
  > - **Lecturas en una sola instantánea.** Sin la vista previa `relationJoins`, Prisma resuelve cada relación anidada con otra sentencia; en READ COMMITTED cada una ve su propia instantánea, y un borrado confirmado entre dos deja una respuesta incompleta (una clase sin maestros, una fila sin su clase). Lo mismo pasa con la paginación por cursor: con el `cursor` de Prisma, si la fila del cursor se borra entre su comprobación y la página, la página sale vacía aunque queden filas detrás. Las lecturas cuya respuesta exige una relación obligatoria o una cardinalidad mínima, y las que comprueban el cursor antes de leer la página, corren con `enTransaccion(…, { instantaneaUnica: true })`: REPEATABLE READ, sentencias en serie, sin escrituras dentro. Una transacción de solo lectura en ese nivel no falla por serialización ni toma bloqueos; ocupa una conexión mientras lee y, con el pool lleno, responde `503 SERVICIO_OCUPADO`. Las lecturas cuya relación apunta a `usuarios` quedan fuera porque no hay bajas físicas de usuarios. Inventario y motivos en `docs/trabajo/FIX-CLASES-lista-de-clases-del-admin/plan.md`, §D-3 (FIX-CLASES).
- El texto de `ARCHITECTURE.md` de arriba ya trae la redacción de la Enmienda 1 (la oración sobre la paginación por cursor y "y las que comprueban el cursor antes de leer la página"); como el de ESSENTIALS, se aplica con A-2.
- `docs/ESTADO.md`: cerrar el pendiente del `500` de `GET /api/admin/clases` y el de la `*.ataque` intermitente de CLASES-02b; agregar O-1, O-2, O-3 y O-4 (Enmienda 1) con su destino, y para TAREAS-01b: "revisar las lecturas con relaciones anidadas de temas y categorías contra la regla de la instantánea única".
- `README.md`, `AGENTS.md`, `CLAUDE.md`: sin cambios (ningún comando ni regla de trabajo cambia).

## Pasos de implementación

### Antes de empezar (orquestador)
0. El manager revisa el plan (modo plan). El humano lo aprueba por escrito con la autorización A-1; el orquestador lo registra en `aprobacion.md` con `<R>` = `ad070b9`. Sin commit de aprobación.

### Ronda 0 (tester)
1. Precondiciones (PA-01, PA-02, V-01 contra las 141), C-1, búsqueda de hermanas, corrida completa del backend y reporte con la tabla de hashes ("Puntos de ataque · Ronda 0").

### Programador (base `<R>`)
2. Precondiciones: rama `fix/clases`; PA-01; V-01 contra la tabla de la ronda 0.
3. **Primero las pruebas:** escribe `backend/test/lecturas-consistentes.integracion.test.ts` con PR-FX-01 a PR-FX-05 (§D-4). Córrelas **solas** contra el código sin cambios: `cd backend; npx vitest run test/lecturas-consistentes.integracion.test.ts`. Deben quedar en rojo: PR-FX-01 en su primer punto, y PR-FX-02, PR-FX-03a, PR-FX-03b, PR-FX-04 y PR-FX-05 por el defecto (no por una precondición). Guarda la salida en el scratchpad y copia al resumen, por caso, el título y la línea del error. Si alguna pasa, o falla por una precondición de §D-4, es PA-20.
4. `adapters/db/cliente.ts`: la opción de §D-2.
5. `adapters/db/clases.ts`: las cuatro funciones de "Cambios por capa".
6. Corre de nuevo solo el archivo nuevo: todo verde. Córrelo dos veces más, solo, para PA-09.
7. `adapters/README.md`: los dos textos de "Documentos".
8. Verificación, en este orden y una suite a la vez (PA-08): `cd backend; npm run lint`; `cd backend; npm test` (una corrida completa, PA-01, PA-07, PA-12); desde la raíz, `npm run build` y `npm run lint`. `shared/` y `frontend/` no cambian: su suite no se corre salvo que el manager lo pida.
9. Resumen verificable: cada PR-FX con su archivo y título exacto; los rojos del paso 3; conteos con `npx vitest list` (comando incluido); el comando y la última línea de cada verificación; PA-07 (I-1 = 10, los 5 `P2028` permitidos, `too_small` 0, `TypeError` de estas rutas 0); V-04 y V-05; y, si corrige un hallazgo, sus hermanos y estados vecinos uno por uno (AGENTS).

### Programador, corrección de la ronda 1 (Enmienda 1; solo después de A-2)
- **E-1.** Precondiciones: rama `fix/clases`; PA-01; V-01 contra la tabla de la ronda 1 del tester (142 `*.ataque`); A-2 registrada en `aprobacion.md`.
- **E-2.** En `backend/test/lecturas-consistentes.integracion.test.ts`, agrega el doble del ejecutor y PR-FX-06, PR-FX-06b, PR-FX-07 y PR-FX-07b con sus títulos exactos ("Pruebas requeridas", Enmienda 1). No toques PR-FX-01 a PR-FX-05.
- **E-3.** Córrelas **solas** contra `publicaciones.ts` sin cambios: `cd backend; npx vitest run test/lecturas-consistentes.integracion.test.ts`. Las cuatro nuevas deben caer por el defecto (`[]` en 06 y 07; `comentarios` 0 y `adjuntos` `[]` en 06b; `[]` en 07b), con su control en verde; PR-FX-01 a PR-FX-05 siguen en verde. Guarda la salida en el scratchpad y copia al resumen, por caso, el título y la línea del error. Si una pasa o cae por su control: PA-20.
- **E-4.** `adapters/db/publicaciones.ts`: solo `listarPublicaciones` y `listarComentarios`, como dice §D-5 y "Cambios por capa". `adapters/db/cliente.ts`: solo el comentario de `enTransaccion`.
- **E-5.** Corre solo el archivo nuevo tres veces seguidas (PA-09): todo verde. Después, solo `cd backend; npx vitest run test/lecturas-fx-r1.ataque.test.ts`: los 24 casos en verde, incluidos los de T-01 y T-02, sin tocar el archivo.
- **E-6.** `adapters/README.md`: los textos de la Enmienda 1 en "Documentos".
- **E-7.** Verificación como el paso 8 (`cd backend; npm run lint`; `cd backend; npm test`, una corrida completa, PA-01, PA-07, PA-12; desde la raíz, `npm run build` y `npm run lint`), una suite a la vez.
- **E-8.** Resumen verificable, como el paso 9, más:
  - T-01 y T-02 respondidos uno por uno, con el caso del programador y el del tester que los cubren;
  - **hermanos** (AGENTS): todas las lecturas con `cursor:` de `adapters/db` (las tres de `clases.ts`, las dos de `publicaciones.ts`, las dos de `enlaces-registro.ts`) y las dos de conjunto de claves de `inscripciones.ts`, cada una con si el remedio aplica, si se aplicó y por qué (la tabla de la nota de §D-3);
  - **estados vecinos** del mecanismo en las dos funciones: cursor→página, página→conteo, página→adjuntos y publicación→comentarios, cada uno con el caso que lo cubre (PR-FX-06, 06b, 07 y 07b) o la razón si no lo tiene;
  - el `git diff <R> -- backend/src/adapters/db/publicaciones.ts` completo, para que el manager compruebe que todos los cambios caen dentro de las dos funciones (V-05).

### Cierre
10. El manager verifica el resumen (V-01 a V-07, con su propia corrida) → el tester ataca (máximo 3 rondas) → el manager da el veredicto final → el orquestador aplica los textos de A-1 → el humano hace **un solo commit** con el bloque que le da el orquestador (`git status`, `git add` con las rutas de abajo, `git commit -m "fix(clases): lecturas de clases con sus maestros en una sola instantánea y aislamiento de una prueba de ataque"`) y abre su PR. Rutas previstas: `backend/src/adapters/db/cliente.ts`, `backend/src/adapters/db/clases.ts`, `backend/src/adapters/db/publicaciones.ts` (Enmienda 1, con A-2), `backend/src/adapters/README.md`, `backend/test/lecturas-consistentes.integracion.test.ts`, `backend/test/admin-muro-02b-r1.ataque.test.ts`, las `*.ataque` nuevas del tester si las hay, `docs/trabajo/FIX-CLASES-lista-de-clases-del-admin/`, `docs/ESTADO.md` y, con A-1, `docs/ARCHITECTURE-ESSENTIALS.md` y `docs/ARCHITECTURE.md`.

### PARADAS
| ID | Te detienes y reportas si… |
|---|---|
| PA-01 | La regla del firewall "Campus: bloquear entrada a Docker en redes publicas" no existe, está deshabilitada o no es Inbound/Block/Public, o la red activa no es de confianza (`Get-NetFirewallRule`, `Get-NetConnectionProfile`). La red `uacam5 2` (Pública) la declaró de confianza el humano **solo para la sesión del 2026-10-06**: otro día, o en otra red, se le vuelve a preguntar antes de correr cualquier prueba del backend |
| PA-02 | La rama no es `fix/clases`; hay cambios fuera de los permitidos contra `<R>`; un archivo protegido que cambió el orquestador no coincide con su SHA-256 de `aprobacion.md`; o V-01 no coincide con la última tabla del tester |
| PA-05 | Falla una `*.ataque` (la ronda 0 no deja rojos esperados) |
| PA-06 | Necesitas tocar un archivo de "No se toca", agregar una dependencia, cambiar `vitest.config.ts`, `global-setup.ts` o `setup.ts`, o cambiar el `timeout` de una prueba existente para que pase |
| PA-07 | Regla permanente de `.claude/agents/tester.md`, con la lista de `P2028` permitidos y el inventario I-1 de "Puntos de ataque". Aplica también al programador y al manager en sus corridas completas del backend |
| PA-08 | Ibas a correr dos suites a la vez (backend y frontend, o dos corridas del backend) |
| PA-09 | Una prueba nueva da resultados distintos en dos corridas (aislada y completa, o dos aisladas) |
| PA-12 | Una corrida completa del backend cae por tiempos límite, o sale un rojo intermitente en cualquier archivo: no repites la corrida para "limpiarla"; la reportas completa (archivo, caso, duración, hora, PA-07) |
| PA-15 | Para demostrar un defecto habría que editar un archivo de producción (en lugar de una prueba, un doble o una copia en el scratchpad) |
| PA-16 | Hay que crear o cambiar un archivo de pruebas que no está en "Pruebas: lista cerrada", o cambiar uno de la lista de otra forma que la permitida |
| PA-19 | Prisma rechaza `isolationLevel` con `@prisma/adapter-pg`, o PR-FX-01 no da `repeatable read` con la opción o no da `read committed` sin ella |
| PA-20 | En el paso 3, una de PR-FX-02 a PR-FX-05 pasa con el código sin cambios (o, en el paso E-3 de la Enmienda 1, una de PR-FX-06, 06b, 07 o 07b pasa con `publicaciones.ts` sin cambios o cae por su control), o falla por una precondición de §D-4 (la lectura no espera la tabla retenida, o termina antes de formarse): el diagnóstico de §D-0 no se cumple en esta versión de Prisma y el plan vuelve al arquitecto |
| PA-21 | Una de las cuatro funciones (seis con la Enmienda 1) necesita escribir dentro de su transacción, o el remedio exige cambiar un esquema de `shared/`, un handler o el middleware |
| PA-22 | (Enmienda 1) El remedio de T-01 o T-02 exige tocar `publicaciones.ts` fuera de `listarPublicaciones` y `listarComentarios`, o cambiar `lecturas-fx-r1.ataque.test.ts`, o A-2 no está registrada en `aprobacion.md` |

### Verificaciones
- **V-01 (hashes):** `Get-FileHash -Algorithm SHA256` de todas las `*.ataque` contra la última tabla del tester (la de la ronda 0 de FIX-CLASES, que parte de las 141 de la ronda 3 de CLASES-02d).
- **V-02 (paquetes):** el orden del paso 8, con el comando exacto y la última línea de salida de cada uno.
- **V-03 (Prisma):** `git diff --name-only <R> -- backend/prisma` vacío.
- **V-04 (búsquedas en `backend/src`, sin pruebas; son texto, no un analizador):**
  - `instantaneaUnica` → solo en `adapters/db/cliente.ts` (definición) y en las cuatro funciones de `adapters/db/clases.ts` (Enmienda 1: y en `listarPublicaciones` y `listarComentarios` de `adapters/db/publicaciones.ts`; 6 usos en total);
  - (Enmienda 1) `listarPublicaciones(` y `listarComentarios(` en `backend/src` → solo en `handlers/clases/muro.ts`, sin segundo argumento;
  - `isolationLevel` → solo en `adapters/db/cliente.ts`;
  - `.$transaction(` → solo en `adapters/db/cliente.ts`, dentro de `enTransaccion`;
  - `$queryRaw`, `$executeRaw` o `$queryRawUnsafe` nuevos → 0 (`$queryRawUnsafe` sigue siendo exactamente 1);
  - dentro de las cuatro transacciones nuevas (seis con la Enmienda 1): ningún `create`, `update`, `upsert`, `delete` ni `$executeRaw`;
  - `Promise.all` → ya no aparece en `listarClasesAdmin`, `listarClasesInscritas` ni `listarClasesImpartidas`.
- **V-05 ("No se toca"), mecánica:** por cada ruta de la lista, `git diff --quiet <R> -- <ruta>` con código 0 y `git status --porcelain -- <ruta>` vacío; (Enmienda 1) `backend/src/adapters/db/publicaciones.ts` sale de la comprobación mecánica y el manager revisa su `git diff <R>` hunk por hunk: todos dentro de `listarPublicaciones` y `listarComentarios`; `backend/package.json` y `package-lock.json` sin cambios; excluidos `docs/trabajo/FIX-CLASES-lista-de-clases-del-admin/` y `docs/ESTADO.md`.
- **V-06 (rutas):** `printRoutes` y `RUTAS_PUBLICAS` sin cambios (`guarda-todas-las-rutas.integracion` en verde).
- **V-07 (conteos):** `npx vitest list` desde `backend/`, redirigido a un archivo del scratchpad; cada cifra del resumen sale de ahí o de la corrida, con el comando; los seis IDs de PR-FX aparecen en la lista (diez con la Enmienda 1: más PR-FX-06, PR-FX-06b, PR-FX-07 y PR-FX-07b). Esperado: los archivos y casos de `<R>` más 1 archivo nuevo del programador y sus casos, más las `*.ataque` nuevas del tester.

### Autorizaciones (por escrito, al aprobar el plan)
| ID | Qué autoriza |
|---|---|
| A-1 | Que el orquestador aplique al cerrar los textos de "Documentos" en `docs/ARCHITECTURE-ESSENTIALS.md` (una regla nueva en "Reglas de datos") y en `docs/ARCHITECTURE.md` §14, con el SHA-256 resultante en `aprobacion.md`. Sin A-1, el código se entrega igual y los textos quedan como pendiente en ESTADO §3 |
| A-2 | (Enmienda 1) Texto exacto para el humano: **"Autorizo A-2 de FIX-CLASES: el programador modifica `backend/src/adapters/db/publicaciones.ts` solo en las funciones `listarPublicaciones` y `listarComentarios`, para que sus sentencias corran dentro de `enTransaccion(…, { instantaneaUnica: true })` como dice la Enmienda 1 (T-01 y T-02); el resto de ese archivo sigue en «No se toca». Autorizo también que los textos de A-1 para `ARCHITECTURE-ESSENTIALS.md` y `ARCHITECTURE.md` se apliquen con la redacción de la Enmienda 1 (agregan las lecturas que comprueban el cursor antes de leer la página)."** Sin A-2, T-01 y T-02 quedan sin remedio: el encargo no puede cerrar con la ronda 1 en `ROTO` y el orquestador escala al humano |

Que el tester reescriba C-1 en la ronda 0 ya lo pidió el humano en su instrucción ("en su ronda 0, reescribir la prueba de ataque intermitente de CLASES-02b"); el orquestador lo registra junto con la aprobación.

### No se toca (base `<R>` = `ad070b9`)
- **Backend:** todo `src/` salvo `src/adapters/db/cliente.ts`, `src/adapters/db/clases.ts`, `src/adapters/README.md` y, **con A-2 y solo en `listarPublicaciones` y `listarComentarios`**, `src/adapters/db/publicaciones.ts` (Enmienda 1; el resto del archivo sigue protegido y lo verifica el manager, V-05). En particular: `src/middleware/**`, `src/handlers/**`, `src/core/**`, `src/workers/**`, `src/config/**`, `src/adapters/auth/**`, `notifier/**`, `queue/**`, `scheduler/**`, `storage/**`, `live/**`, y de `src/adapters/db/`: `errores.ts`, `errores.test.ts`, `index.ts`, `inscripciones.ts`, `maestros-de-clase.ts`, `publicaciones.ts` (salvo las dos funciones de A-2), `archivos.ts`, `usuarios.ts`, `sesiones.ts`, `tokens-cuenta.ts`, `invitaciones.ts`, `enlaces-registro.ts`, `bloqueo-usuario.ts`, `salud.ts`. Todo `test/` salvo el archivo nuevo del programador y lo que la lista cerrada permite al tester (incluidas `ayudas-*.ts`, `global-setup.ts`, `setup.ts`, `entorno-de-pruebas.ts`, `higiene-de-pruebas.integracion.test.ts`). `prisma/**`, `vitest.config.ts`, `package.json`, `tsconfig*.json`.
- **Fuera de `backend/`:** todo `shared/`, `frontend/` e `infra/`; `eslint.config.mjs`, `package.json`, `package-lock.json` y `.prettierignore` de la raíz; `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/PRD.md`, `docs/DESIGN.md`, `.claude/**`. `docs/ARCHITECTURE-ESSENTIALS.md` y `docs/ARCHITECTURE.md` solo con A-1, por el orquestador.

## Comprobación humana
Ninguna (S-06).

## Enmienda 1 (T-01 y T-02 de la ronda 1)
2026-10-06. Origen: `reporte-tester.md`, "FIX-CLASES — Ronda 1" (ROTO): **T-01** (media) `listarPublicaciones` y **T-02** (media) `listarComentarios` devuelven una página vacía si la fila del cursor se borra entre su comprobación y la página. Causa anterior a FIX-CLASES; el inventario de §D-3 (fila 10) la marcó "no aplica" porque solo evaluó el `500` y el borrado de la clase, no la frontera cursor→página. Estado: **pendiente de A-2 del humano** (sin A-2 no se programa nada de esta enmienda). Lo ya implementado (la opción `instantaneaUnica` y las cuatro lecturas de `clases.ts`) no cambia.

Índice de lo que cambió, sección por sección (todo marcado "Enmienda 1" en el texto):
1. **Cabecera:** nota de A-2 pendiente.
2. **Alcance · Entra:** punto 6.
3. **§D-3:** fila 10 pasa a "Aplica (frontera cursor→página; T-01, T-02)"; **nota nueva** con la frontera cursor→página de todas las lecturas con cursor (las tres de `clases.ts` protegidas; las dos de `publicaciones.ts` aplican; las dos de `enlaces-registro.ts` sin disparador hoy, O-4; `listarPersonas` y `listarAlumnosDeClase` inmunes por conjunto de claves).
4. **§D-5 (nueva):** remedio (las dos funciones completas en `enTransaccion(…, { instantaneaUnica: true })`), qué pasa con un `ejecutor` de una transacción externa (corren con el aislamiento de afuera; hoy solo las llama `muro.ts` sin ejecutor), alternativa por conjunto de claves comparada y descartada, costo y regla ampliada.
5. **Cambios por capa:** `adapters/db/publicaciones.ts` (solo las dos funciones), comentario de `enTransaccion` en `cliente.ts`, una oración más en `adapters/README.md`; dos rutas más en la tabla de handlers (sin cambios en ellas).
6. **Acceso a datos:** dos filas.
7. **Pruebas requeridas:** PR-FX-06, PR-FX-06b, PR-FX-07 y PR-FX-07b, con doble del ejecutor y títulos exactos; T-01 y T-02 del tester deben pasar a verde sin tocarlas.
8. **Lista cerrada (PA-16):** el programador agrega casos a `lecturas-consistentes.integracion.test.ts`.
9. **Rondas de ataque:** punto 8.
10. **Riesgos:** R-01 ampliado. **Observaciones:** O-4.
11. **Documentos:** textos de `adapters/README.md` para la Enmienda 1; redacción ampliada de los textos de ESSENTIALS y `ARCHITECTURE.md` (se aplican con A-2); O-4 a ESTADO §3.
12. **Pasos:** E-1 a E-8 (pruebas primero y rojas, remedio, aislado tres veces más `lecturas-fx-r1`, corrida completa, resumen con hermanos y estados vecinos); rutas del commit.
13. **PARADAS:** PA-20 y PA-21 ampliadas; PA-22 nueva. **Verificaciones:** V-04, V-05 y V-07 ampliadas.
14. **Autorizaciones:** A-2 con su texto exacto. **No se toca:** `publicaciones.ts` sale de la lista solo en las dos funciones, con A-2.
