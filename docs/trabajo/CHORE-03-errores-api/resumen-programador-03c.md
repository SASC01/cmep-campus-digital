# Resumen del programador — CHORE-03 · 03c (primera entrega, 2026-10-27)

> Transcripción del orquestador: el programador entregó este resumen como texto en su respuesta final; se copia tal cual, sin cambiar contenido.

Plan: `docs/trabajo/CHORE-03-errores-api/plan.md` (SHA-256 `eab43ac5…`, Enmiendas 1 a 4), subentrega 03c, pasos 1 a 6.
Pasos completados: 6 de 6. Ninguna PARADA. lint, test y build quedan en verde y C-4 pasa sin que la haya tocado.

**Archivos creados / modificados** (todos en `frontend/src/`)
- Producción (6 modificados):
  - `features/admin/data.ts`: nace `TRADUCCION_DE_ERRORES_ADMIN`, con `import type` y `satisfies`. `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` queda en `["CUPO_DIARIO_INSUFICIENTE"]` y sus dos comentarios están al día.
  - `features/admin/lib.ts`: `mensajeDeErrorAdmin` pasa a ser envoltorio de `mensajeDeErrorDeApi` y nace `mensajeDeConsultaAdmin`. Se borran `tieneMensajePropio` y `tieneMensajeDelServidor`, con lo que desaparece el `return error.message`.
  - `features/admin/components/tabla-enlaces.tsx` y `registrados-del-enlace.tsx`: solo cambian la línea de la consulta y su importación.
  - `features/auth/data.ts`: nace `TRADUCCION_DE_ERRORES_AUTH`.
  - `features/auth/lib.ts`: `mensajeDeErrorAuth` pasa a ser envoltorio y se va el `return error.message`.
- Pruebas modificadas (2):
  - `features/auth/lib.test.ts`: solo N-L3 (el título y la salida esperada).
  - `lib/errores-de-api-estatico.test.ts`: CH3-C07 y el comentario de cabecera.
- Pruebas nuevas (4): `features/auth/errores-ch3.test.ts`, `features/admin/errores-ch3.test.ts`, `features/auth/formularios-ch3.test.tsx` y `features/admin/formularios-ch3.test.tsx`.
- No toqué ninguna `*.ataque`. Las cuatro que salen modificadas en el árbol (C-4 y las tres endurecidas por PA-12) son de la ronda 0 del tester.

**Verificación** (desde `frontend/`, una suite a la vez; antes de correr el test comprobé que no hubiera ningún `vitest` en marcha)
- lint: `npm run lint` → código 0, `All matched files use Prettier code style!` y la última línea `> tsc -b`; 0 `error TS`.
- test: `npm run test` → `Test Files  229 passed (229)` · `Tests  4303 passed (4303)`; `Test timed out` = 0 y ninguna otra línea con "timed out".
- build: `npm run build` → `✓ built in 1.26s`.
- prisma validate: n/a.
- Salidas en el scratchpad: `03c-prog-lint.txt`, `03c-prog-test.txt` y `03c-prog-build.txt`.
- Formato: `npx prettier --write` solo sobre `src/features/auth/errores-ch3.test.ts` y `src/features/auth/formularios-ch3.test.tsx`, mis dos archivos nuevos.

**V-01:** las 218 `*.ataque` coinciden con la tabla "al cierre de la ronda 0 de CHORE-03 03c" de `reporte-tester.md`: base 218, actual 218, `diff` vacío.
- Comando: `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, contra las filas de la tabla en minúsculas.
- `git diff --stat 9272501e -- frontend shared backend infra`: 12 archivos, que son los 8 míos de arriba más las 4 `*.ataque` del tester. Además, 4 archivos nuevos de prueba. `shared/`, `backend/` e `infra/` sin cambios.

**Pruebas requeridas** (los títulos son literales de `npx vitest list`; en los `it.each`, `%s` va con tuplas, como pidió O-r2-3)
- **CH3-C01** → `features/auth/errores-ch3.test.ts`, 18 casos:
  - "CH3-C01: mensajeDeErrorAuth recorre la tabla (el resto o el genérico) y nunca deja la ruta ni un texto sin caracteres visibles"
  - "CH3-C01: el código fijo %s sigue dando su texto, con mensaje del servidor, sin texto visible o vacío" (11, uno por código)
  - "CH3-C01: los códigos fijos son exactamente los de siempre y ningún código muestra el mensaje del servidor"
  - "CH3-C01: «%s» como código da el genérico" (constructor, toString, `__proto__` y hasOwnProperty)
  - "CH3-C01: un código desconocido, un error que no es ApiError, undefined y una cadena dan el genérico"
- **CH3-C02** → `features/admin/errores-ch3.test.ts`, 13 casos:
  - "CH3-C02: mensajeDeErrorAdmin recorre la tabla (el resto o el genérico): un VALIDACION ya no sale crudo"
  - "CH3-C02: mensajeDeConsultaAdmin recorre la tabla y siempre da el genérico"
  - "CH3-C02: %s con CUPO_DIARIO_INSUFICIENTE da su mensaje si tiene texto visible y el genérico si no" (las dos funciones)
  - "CH3-C02: el código fijo %s sigue dando su texto en las acciones y en las consultas" (4)
  - "CH3-C02: la traducción del módulo es la de siempre, sin VALIDACION entre los códigos con mensaje del servidor"
  - "CH3-C02: «%s» como código da el genérico en las acciones y en las consultas" (3)
  - "CH3-C02: un código desconocido, un error que no es ApiError y undefined dan el genérico"
- **CH3-C03** → `features/auth/formularios-ch3.test.tsx`, 35 casos:
  - "CH3-C03: %s con %s («%s») da un solo MensajeError legible, sin toast ni ErrorDeCampo; lo escrito se conserva y el botón sale de la espera": 7 formularios × 4 entradas. Las entradas son F1, F3, F4 y "campo pintado".
  - "CH3-C03: %s, tras F3, repetir el control con una respuesta buena manda una petición nueva y quita la alerta": 7 casos.
  - Los 7 formularios: iniciar sesión, registro de estudiante, registro de maestro por enlace, recuperar contraseña, restablecer contraseña, establecer contraseña (invitación) y cambio obligatorio de contraseña.
- **CH3-C04** → `features/admin/formularios-ch3.test.tsx`, 26 casos:
  - "CH3-C04: precondición, cada formulario tiene su campo pintado y su respuesta buena"
  - "CH3-C04: %s con %s («%s») da un solo MensajeError legible, sin toast ni ErrorDeCampo; lo escrito se conserva y el botón sale de la espera": 5 formularios × 4 entradas.
  - "CH3-C04: %s, tras F3, repetir el control con una respuesta buena manda una petición nueva y quita la alerta": 5 casos.
  - Los 5 formularios: invitar maestro, invitación masiva, generar enlace de registro, buscar una cuenta y corregir el correo.
- **CH3-C05** → `features/admin/formularios-ch3.test.tsx`, 6 casos:
  - "CH3-C05: %s con %s («%s») da un solo MensajeError legible y el botón sale de la espera": restablecer la contraseña desde la ficha y revocar un enlace, cada uno con F1, F3 y F4.
- **CH3-C06** → `features/admin/formularios-ch3.test.tsx`, 2 casos:
  - "CH3-C06: «limite: Too big: expected number» en %s muestra el genérico de admin, nunca el texto en inglés": la tabla de enlaces y los registrados de un enlace.
- **CH3-C07** → `lib/errores-de-api-estatico.test.ts`, 1 caso:
  - "CH3-C07: ningún archivo de producción de src/ salvo el contrato y features/diagnostico manipula error.message ni tiene la expresión de ruta"
  - Comprueba también que el alcance incluye `admin`, `auth`, `app/`, `components/`, `services/`, `lib/` y la tabla común, y que excluye el contrato y `diagnostico`.
  - **O-r1-3:** `import.meta.glob` no incluye al archivo que lo llama. Aquí no deja hueco: el archivo es una prueba, fuera de la regla de producción, y lo dejé dicho en su comentario de cabecera.
- **CH3-C08 (1)** → `features/admin/errores-ch3.test.ts`, 16 casos:
  - "CH3-C08: «id: id: debe ser un identificador válido» da el resto en las acciones y el genérico en la consulta, sin ruta ni «id:»"
  - "CH3-C08: «id: id:» seguido del resto %s da el genérico en las acciones y en la consulta": 15 casos, con cada resto escrito por sus puntos de código y con los separadores "" y " ".
  - El literal va con el comentario que cita `backend/src/handlers/admin.ts:60` y la forma `${path.join(".")}: ${message}` de `handlers/validacion.ts`.
- **CH3-C08 (2)** → `features/admin/formularios-ch3.test.tsx`, 4 casos:
  - "CH3-C08: «id: id: debe ser un identificador válido» en %s da un solo MensajeError «%s», sin toast ni «id:»"
  - Las cuatro rutas: restablecer, corregir el correo (que además comprueba que se conserva el correo escrito), revocar y los registrados (consulta, que da el genérico).

**Conteos**
- `npx vitest list src/features/auth/errores-ch3.test.ts src/features/admin/errores-ch3.test.ts src/features/auth/formularios-ch3.test.tsx src/features/admin/formularios-ch3.test.tsx src/lib/errores-de-api-estatico.test.ts | grep ^src | wc -l` → 124.
- Por archivo: 18, 29, 35, 38 y 4 (la estática, con 1 nueva: C07). Casos nuevos: 121.
- Por id: C01 18, C02 13, C03 35, C04 26, C05 6, C06 2, C07 1, C08 20.
- Contra la corrida de cierre de 03b (`225 / 4182`): `229 / 4303`, es decir, +4 archivos y +121 casos. Cuadra.

**Reglas estáticas, una por una**
- `mensajeDelAvisoDeCalificar` aparece solo en `tareas/hooks.ts` y `tareas/lib.ts` (`grep -rlE` en producción).
- `disabled`, `?? []`, `fetch(` y `console.` no aparecen en `tareas/{lib,data,hooks}.ts` (`grep -nE`: nada).
- U+2800, U+1D159, `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =` y `\r\n|\r` no aparecen en producción (`grep -rlE`: nada).
- `esErrorDeCursor` se define una sola vez, en `lib/errores-de-api.ts:37`, y `calificaciones` nunca escribe `esErrorDeCursor(`.
- `calificaciones` sigue con 11 archivos de producción (6 en la raíz y 5 en `components`) y ninguno lee `.message`.
- No hay tipos nuevos fuera de `types.ts`: `TraduccionDeErrores` se importa con `import type` y solo se usa en `satisfies` (`grep` de `type|interface` en `data.ts` y `lib.ts` de `admin` y `auth`: nada).
- Ningún carácter invisible literal: CH3-A24 recorre ya mis cuatro `-ch3` y pasa.
- Punto 4 de la Enmienda 4 y las que leen `admin` y `auth`: las corrí aparte, además de la suite completa. Comando: `npx vitest run` sobre `admin/cuentas-r1`, `admin/maestros-03b-r1`, `app/cuentas-r1`, `auth/enlace-r1`, `styles/clases-r1`, `clases/ver-mas-01e-r3`, `tareas/estatico-01c-r1`, `clases/errores-ch3-r1`, `lib/errores-ch3-r1`, `clases/refactor-01c-r1`, `calificaciones/estatico-01d`, `tareas/aviso-calificar-01c-r3` y `components/layout/estatico-r1`. Resultado: `Test Files  13 passed (13)` · `Tests  365 passed (365)`.

**Matriz §D-6 de `admin` y `auth`**
Común a todas las filas:
- El anuncio es siempre el `MensajeError` (`role="alert"`) del propio componente. Ningún hook de `admin` ni de `auth` avisa ni lleva toast.
- Clases de error:
  - `VALIDACION` (F1, F3, F4, un campo pintado o `id: id:`): un `MensajeError` con el resto, o con el genérico si el resto no tiene texto visible.
  - `409` y `404` con texto fijo: ese texto.
  - `5xx` o sin conexión: `SIN_CONEXION`. En `admin` da el genérico; en `auth`, su texto fijo.
  - Errores que redirigen: `apiClient` llama a `irA`, igual que antes.
- No se renueva nada. El foco no se mueve, salvo donde se indica.
- Con la vista desmontada no hay aviso: el error vive en el estado de la mutación del componente. Es como antes y no cambia.

| Disparador | Qué se renueva / a dónde va el foco | En vuelo a la vez |
|---|---|---|
| Invitar maestro | Nada / no se mueve | sin ref; fuera del chore, CHORE-04 (fila 10) |
| Invitación masiva (`CUPO_DIARIO_INSUFICIENTE` da su mensaje o, sin texto, el genérico) | Nada / no se mueve | sin ref; CHORE-04 (fila 9) |
| Generar enlace | Nada (solo invalida en el éxito) / no se mueve | sin ref; CHORE-04 (fila 8) |
| Buscar cuenta (el `MensajeError` queda fuera del form) | Nada / no se mueve | sin ref; CHORE-04 (fila 11) |
| Corregir correo (`id: id:` → "debe ser un identificador válido") | Nada / no se mueve | sin ref; CHORE-04 (fila 7) |
| Restablecer desde la ficha (`id: id:` → el resto) | Nada / a «Cancelar» si `focoDisponiblePara` lo permite (como hoy) | `enviandoRef` (`ficha-de-cuenta.tsx`, `AccionRestablecer`) |
| Revocar enlace (`id: id:` → el resto) | Nada / no se mueve | `enviandoRef` (`tabla-enlaces.tsx`, `FilaEnlace`) |
| Consulta: tabla de enlaces y «Cargar más enlaces» (`mensajeDeConsultaAdmin`; todo `VALIDACION` → genérico) | Reemplaza la tabla / sin gestión, como hoy (S-06 b2, DH-2) | «Cargar más» con `enEspera={isFetchingNextPage}`, sin cambio |
| Consulta: registrados de un enlace y su «Cargar más» (`id: id:` → genérico) | Reemplaza la subtabla / sin gestión, como hoy | Igual que la fila anterior |
| Iniciar sesión | Nada / no se mueve | sin ref; CHORE-04 (fila 12) |
| Registro de estudiante | Nada / no se mueve | sin ref; CHORE-04 (fila 13) |
| Registro de maestro (`ENLACE_INVALIDO` reemplaza el formulario, como hoy) | Nada / no se mueve | sin ref; CHORE-04 (fila 14) |
| Recuperar contraseña | Nada / no se mueve | sin ref; CHORE-04 (fila 15) |
| Restablecer y establecer contraseña (`ENLACE_INVALIDO` → `EnlaceInvalido`) | Nada / no se mueve | sin ref; CHORE-04 (fila 16) |
| Cambio obligatorio (`CAMBIO_NO_REQUERIDO`: el gancho renueva `/me` y navega, como hoy) | Ver la columna anterior / no se mueve | sin ref; CHORE-04 (fila 17) |
| Cerrar sesión en el cambio obligatorio y en "Acceso restringido" (`logout` nunca rechaza; no hay mensaje) | — | sin ref; CHORE-04 (filas 17 y 18) |
| Consulta `/me` en "Acceso restringido" (`mensajeDeErrorAuth`, S-08) | Reemplaza la vista / sin gestión | — |
| Consulta de la invitación (`mensajeDeErrorAuth`, S-08; `retry: false`) | Reemplaza la vista / sin gestión | — |

La búsqueda de `.mutate(` en `admin` y `auth` coincide exactamente con las filas 7 a 18 de la lista de CHORE-04 más las dos que tienen ref. No hay filas nuevas para la lista.

**Hermanos**
- **Formularios y controles de §D-4:** invitar, masiva, generar, buscar, corregir, restablecer, revocar, login, registro de estudiante, registro de maestro, recuperar, restablecer y establecer contraseña, y cambio obligatorio. A todos les aplica el remedio, que se aplica por el contrato, y cada uno tiene su caso en C03, C04 o C05.
- **Consultas de `admin`:** la tabla de enlaces y los registrados pasan a `mensajeDeConsultaAdmin` (C06 y C08). Los demás usos de `mensajeDeErrorAdmin` son acciones.
- **Las dos consultas de `auth` (S-08):** `acceso-restringido-view.tsx:25` y `establecer-contrasena-view.tsx:44` quedan con `mensajeDeErrorAuth` porque `auth` no tiene variante de consulta. `/me` no lleva parámetros. En la invitación, un `VALIDACION` de `token` ahora sale sin "token: ". No cambié esas vistas.
- **Fila `id: id:` de §D-1, cuatro rutas:**
  - `POST /usuarios/:id/restablecer-contrasena` → "debe ser un identificador válido"
  - `PUT /usuarios/:id/correo` → "debe ser un identificador válido"
  - `POST /enlaces-registro/:id/revocar` → "debe ser un identificador válido"
  - `GET /enlaces-registro/:id/registrados` → "No pudimos completar la operación. Inténtalo de nuevo."
  - Las cuatro las cubre C08 (2).
- **Patrón de T-03 y T-04, verificado formulario por formulario:** ningún formulario de `admin` ni de `auth` asigna a un campo un `VALIDACION` del servidor. Por tanto no hay PA-6.
  - Los `setErrores` y `setError` solo reciben incidencias del `safeParse` local (`erroresPorCampo`, `erroresPorCampoAdmin` e `issues[0]` en la masiva).
  - Los errores del servidor van todos al `MensajeError`.
  - El único `onError` de un gancho es el de `useCambiarContrasena`, para `CAMBIO_NO_REQUERIDO`.
  - Lo dejé probado con la fila "campo pintado" de C03 y C04. Incluye `nombre:` en "restablecer contraseña", un campo que solo se pinta al establecer: da un solo `MensajeError` y ningún `aria-invalid`.
- **`features/diagnostico`:** excluido por S-09. C07 lo excluye por nombre; hoy no tiene ninguna manipulación.
- **Estados vecinos:** primer fallo, repetir el control con éxito (caso aparte por formulario en C03 y C04), un mismo control en vuelo dos veces (sin ref, CHORE-04) y la vista desmontada (sin aviso, como antes). O-16 queda como decisión tomada y no aplica aquí, porque no hay errores de campo que vengan del servidor.

**Hallazgos atendidos:** no hay hallazgos del tester en 03c.
- O-r2-3: lo atendí con títulos `%s` sobre tuplas.
- O-r1-3: lo atendí con la nota en C07.

**Desviaciones del plan:** en producción, ninguna. Lo que hice de más:
- En `auth/data.ts` actualicé también el comentario de `MENSAJES_ERROR_AUTH` ("sin su ruta").
- En las pruebas sumé la fila "campo pintado" en C03 y C04, como evidencia del patrón de T-03 y T-04, y los casos de C01 y C02 con "`__proto__`" y "hasOwnProperty".

**Pendiente o fuera de alcance**
- R-08 sigue igual: el literal de `id: id:` en el backend no lo vigila ninguna prueba del frontend salvo C08.
- Cambio visible declarado: en `admin` y `auth`, un `VALIDACION` ya no muestra su ruta. Esto incluye la consulta de la invitación ("token: …").
- No abrí ningún navegador ni hice commit.
