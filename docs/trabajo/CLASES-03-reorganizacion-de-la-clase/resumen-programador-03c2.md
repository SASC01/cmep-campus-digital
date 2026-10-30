# Resumen del programador — CLASES-03c2 (contenido), implementación

Fecha: 2026-10-30. Rama `feat/clases-03`; base dentro de los paquetes `91756a5` (`<K3c1>`).
Plan: `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md`, SHA-256 `5c53894078640e5fa7639e315d4d8481d8b06bb8b81c8d5a5aa222194199ac24` (reproducido al empezar; "LISTO (Enmiendas 1 a 11 aplicadas)").
Entré después de las adendas 1 y 2 de la ronda 0 del tester (C-25 en `trabajo-01e-r1.ataque` y C-31) y con la autorización del humano del 2026-10-30 para `features/tareas/recuperar-ch3.test.tsx:200` (fila E11-2).

## Pasos completados: 4 de 4 (el paso 5 es del orquestador)

1. **Avisos (§D-7.5, CL3-C08).** `usePublicaciones` pide `…/publicaciones?tipo=anuncio&limite=20[&cursor=…]`; la clave no cambia.
2. **Actividades (§D-7.6, CL3-C09 a C11).**
   - `claveTemasDeLaSeccion(claseId, seccion)` = `[...claveTemas(claseId), seccion]` en `features/clases/data.ts` (importa `claveTemas` de `services/trabajoService`, sin cambiarlo); `SeccionDeTemas` se reexporta de `shared/` en `types.ts`.
   - `useTemasDeLaSeccion(claseId, seccion)` (`GET …/temas?seccion=…`, `listaTemasRespuestaSchema`).
   - `useTrabajo` pide `…/trabajo?tema=…&seccion=actividades&limite=…[&cursor=…]`; la clave no cambia.
   - `TrabajoView` toma la estructura, el orden, los nombres, los conteos, "Sin tema" y el vacío de la lista por sección; `useTemas(claseId, capacidades.gestionarTrabajo)` (el total) solo lo piden maestro y admin (N-08), y solo da `elementosEnTotal` (función pura nueva `elementosEnTotalDelTema` en `lib.ts`: `null` si el total no llegó, falló o no tiene el tema).
   - `SeccionDeTema` recibe `elementosEnTotal: number | null`; la confirmación dice `TEXTOS_TEMAS.consecuencia(n)` con el total, o `TEXTOS_TEMAS.consecuenciaSinConteo` con `null`.
   - `useOrdenarTemas`: `onSuccess` escribe la lista total (como antes) y **espera** la invalidación de las listas por sección (`invalidarTemasDeLasSecciones`: el prefijo `claveTemas` con un `predicate` que deja fuera la clave exacta del total, para no volver a pedirlo).
   - `useAvisoDeRecargaFallida` y `useAlPulsarLaSeccionActiva` de `TrabajoView` pasan a la consulta por sección (mismo texto de 03c1).
   - Comentario de `trabajo-view.tsx:49` (132 caracteres, pendiente de la revisión final de 03c1) partido en líneas de 100, al reescribir ese bloque.
   - Lista cerrada: E11-2 (`features/tareas/recuperar-ch3.test.tsx:200`, `url.pathname`) y E11-3 (`trabajo-view.test.tsx`, M-01: el doble guarda el orden nuevo antes de soltar el `PUT`). Ninguna aserción cambió.
3. **O-16 y guardas (§D-11, §D-12; CL3-C14, C15, C19).**
   - `useMontado()` nuevo en `features/clases/hooks.ts` (ref `true` mientras está montado quien llama al gancho).
   - `useComentar`, `useCrearTema` y `useRenombrarTema`: con el formulario desmontado, el `VALIDACION` de su campo se avisa con `mensajeDeErrorClases` (ruta quitada; genérico si queda vacío); montado, sigue el `ErrorDeCampo` sin aviso. Ninguna firma cambió.
   - `useCrearClase` y `useEditarClase` (variante M-01): `onError` no hace nada con el formulario montado; desmontado avisa una vez cualquier error con `mensajeDeErrorClases`, salvo `errorQueRedirigeElCliente(error)`. `onSuccess`, desmontado, avisa "Clase creada" / "Cambios guardados" sin navegar.
   - `errorQueRedirigeElCliente` en `features/clases/lib.ts`, con la importación unida a la de la línea 16 exactamente como pide R-03c2-1 (`import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"`). `grep -rln CODIGOS_QUE_REDIRIGE_EL_CLIENTE` en producción de `src/`: solo `services/apiClient.ts`, `features/calificaciones/lib.ts`, `features/clases/lib.ts` y `features/tareas/lib.ts`.
   - Guardas (R-03c2-2): `formulario-comentario.tsx` y `formulario-clase.tsx` llevan `enviandoRef`, marcada justo antes de `mutate` (después de la validación local y, al editar, de `if (claseId === undefined) return`) y liberada en el `onSettled` de esa llamada. La comprobación `if (enviandoRef.current) return` reemplaza la de `isPending` al inicio del envío. Sin `reset()`: el error del servidor sigue en el estado `errores`.
4. **Matriz** (abajo) y verificación.

## Archivos creados / modificados (dentro de `frontend/`; nada en `shared/`, `backend/` ni `infra/`)

Producción (modificados): `src/features/clases/hooks.ts`, `lib.ts`, `data.ts`, `types.ts`, `trabajo-view.tsx`, `components/seccion-de-tema.tsx`, `components/formulario-comentario.tsx`, `components/formulario-clase.tsx`.

Pruebas normales de la lista cerrada (modificadas, solo como dice su fila): `src/features/clases/trabajo-view.test.tsx` (E11-3: en "M-01 · «Bajar» de un tema y «Subir» de otro en el mismo turno mandan un solo PUT del orden", el doble guarda el orden nuevo en `datos` antes de `respuesta.soltar(…)`; las aserciones no cambian) y `src/features/tareas/recuperar-ch3.test.tsx:200` (E11-2, con la autorización del humano: `ruta === …/temas` → `url.pathname === …/temas`; nada más del archivo ni de `features/tareas`). Las otras filas de 03c2 (`muro-view.test.tsx`, `app/router.test.tsx` y el doble de `…/temas` de `trabajo-view.test.tsx`) no necesitaron cambio: sus dobles ya comparan el `pathname` o usan `startsWith`.

Pruebas nuevas: `src/features/clases/contenido-03c2.test.tsx` (CL3-C08 a C11), `src/features/clases/formularios-03c2.test.tsx` (CL3-C14 y C15) y `src/app/redirige-03c2.test.ts` (CL3-C19).

`*.ataque`: ninguna tocada por mí. Las tres que aparecen en `git diff` (`services/apiClient-ch3-r1`, `features/clases/trabajo-01e-r1`, `features/tareas/formularios-ch3-r1`) son de la ronda 0 del tester y sus adendas.

`git diff --stat -- frontend` (archivos rastreados; los tres nuevos están sin rastrear):
```
 .../clases/components/formulario-clase.tsx         | 20 ++++-
 .../clases/components/formulario-comentario.tsx    | 11 ++-
 .../features/clases/components/seccion-de-tema.tsx | 10 ++-
 frontend/src/features/clases/data.ts               |  6 ++
 frontend/src/features/clases/hooks.ts              | 97 +++++++++++++++++++---
 frontend/src/features/clases/lib.ts                | 20 ++++-
 .../features/clases/trabajo-01e-r1.ataque.test.tsx |  7 ++   (tester, adenda 1)
 frontend/src/features/clases/trabajo-view.test.tsx | 13 ++-
 frontend/src/features/clases/trabajo-view.tsx      | 31 +++++--
 frontend/src/features/clases/types.ts              |  2 +
 .../tareas/formularios-ch3-r1.ataque.test.tsx      |  4 +-  (tester, adenda 2)
 .../src/features/tareas/recuperar-ch3.test.tsx     |  2 +-
 .../src/services/apiClient-ch3-r1.ataque.test.ts   |  7 +-  (tester, ronda 0)
 13 files changed, 201 insertions(+), 29 deletions(-)
?? frontend/src/app/redirige-03c2.test.ts
?? frontend/src/features/clases/contenido-03c2.test.tsx
?? frontend/src/features/clases/formularios-03c2.test.tsx
```

## Verificación (desde `frontend/`, una tras otra; nunca dos suites a la vez)

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0; antes, `All matched files use Prettier code style!`) |
| `npx vitest list \| grep -acE "^src/"` | `5501` casos (base 5434 + 67) |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `251` archivos (base 248 + 3) |
| `npm run test` | `Tests  5501 passed (5501)` (antes, `Test Files  251 passed (251)`; `Duration  217.04s`). Sin «Hook timed out» (0). C-29 en verde |
| `npm run build` | `✓ built in 1.07s` (exit 0; solo el aviso de tamaño de bloque de siempre) |

Formateo: `npx prettier --write` solo sobre los archivos que toqué, dentro de `frontend/`. `shared/` no cambió: el `npm run lint` del frontend corre `shared:build` como siempre, sin cambios en `shared/src`.

## Conteos (de `npx vitest list`, desde `frontend/`)

- `contenido-03c2.test.tsx`: 17 casos (`npx vitest list | grep -ac "^src/features/clases/contenido-03c2.test.tsx >"`).
- `formularios-03c2.test.tsx`: 41 casos (ídem con su ruta).
- `app/redirige-03c2.test.ts`: 9 casos (ídem con su ruta).
- Total nuevo: 67 casos en 3 archivos. Ningún caso existente se borró ni se desactivó.

## Pruebas requeridas de 03c2 → archivo y título exacto

**CL3-C08** (Avisos pide `…/publicaciones?tipo=anuncio&limite=20` y "Ver más avisos" lleva `tipo=anuncio` y el cursor) → `frontend/src/features/clases/contenido-03c2.test.tsx`:
- "CL3-C08: estudiante pide …/publicaciones?tipo=anuncio&limite=20 y «Ver más avisos» lleva tipo=anuncio y el cursor"
- "CL3-C08: maestro pide …" y "CL3-C08: admin pide …" (mismo título con su perspectiva)

**CL3-C09** (filtros `seccion`, "Sin tema" solo con actividades, conteos de la sección, vacío, total para la frase, el estudiante no pide el total) → `contenido-03c2.test.tsx`:
- "CL3-C09: estudiante pide …/temas?seccion=actividades y cada tema con seccion=actividades; los conteos son los de la sección y «Sin tema» no sale sin actividades" (y la misma para maestro y admin)
- "CL3-C09: «Sin tema» sale primero cuando tiene actividades, con el conteo de la sección"
- "CL3-C09: sin actividades en ningún tema, el vacío dice «Aún no hay actividades en esta clase.» aunque haya elementos en total"
- "CL3-C09: el estudiante no pide el total de los temas (GET …/temas sin seccion)"
- "CL3-C09: maestro pide el total y la confirmación de borrar un tema dice el total, no el conteo de la sección" (y la misma para admin)
- "CL3-C09: si el total falla, la confirmación usa la frase sin conteo y no hay aviso"
- "CL3-C09: si el total no tiene el tema, la confirmación de ese tema usa la frase sin conteo"

**CL3-C10** ("Subir"/"Bajar" en espera hasta la lista por sección; foco en el botón del tema movido; doble clic, un `PUT`) → `contenido-03c2.test.tsx`:
- "CL3-C10: «Bajar» sigue en espera hasta que llega la lista por sección, y el foco se queda en el botón del tema que se movió"
- "CL3-C10: doble clic en «Subir» manda un solo PUT del orden"
- Además siguen verdes, sin cambio de aserciones: "M-01 · «Bajar» de un tema y «Subir» de otro en el mismo turno mandan un solo PUT del orden" (`trabajo-view.test.tsx`, E11-3) y "doble clic humano (30 ms) en «Subir» manda un solo PUT del orden" (`trabajo-01e-r1.ataque.test.tsx`, C-25).

**CL3-C11** (recarga fallida de Actividades: un aviso por fallo con el texto nuevo; montar con un fallo ya ocurrido no avisa) → `contenido-03c2.test.tsx`:
- "CL3-C11: cada recarga fallida de la lista por sección avisa una vez con el texto nuevo y conserva la vista"
- "CL3-C11: volver a montar la vista con un fallo ya ocurrido no avisa"

**CL3-C14** (O-16 en comentario, crear clase, editar clase, crear tema y renombrar tema; variante M-01 de clase) → `frontend/src/features/clases/formularios-03c2.test.tsx`:
- Desmontado con `VALIDACION` de su campo: "CL3-C14: 'comentario' desmontado con el envío en vuelo y un 400 VALIDACION de su campo: un aviso con el mensaje sin la ruta" (y las de 'crear tema', 'renombrar tema', 'crear clase' y 'editar clase')
- Montado: "CL3-C14: 'comentario' montado con un 400 VALIDACION de su campo: su ErrorDeCampo, sin aviso" (y los otros cuatro)
- Vacío desmontado: "CL3-C14: 'comentario' desmontado con un VALIDACION de su campo sin texto visible: un aviso con el genérico" (y los otros cuatro)
- Clase, desmontado con 5xx: "CL3-C14: 'crear clase' desmontado con un 500 'ERROR_INTERNO': un aviso con el mensaje del módulo (el genérico o el del servidor)", "CL3-C14: 'crear clase' desmontado con un 503 'SERVICIO_OCUPADO': …" (y las dos de 'editar clase')
- Clase, desmontado con la red caída: "CL3-C14: 'crear clase' desmontado con la red caída: un aviso (el genérico del módulo)" (y 'editar clase')
- Clase, desmontado con éxito: "CL3-C14: 'crear clase' desmontado con un 201: un aviso de éxito y ninguna navegación", "CL3-C14: 'editar clase' desmontado con un 200: un aviso de éxito y ninguna navegación"
- Clase, desmontado con `ACCESO_RESTRINGIDO`: "CL3-C14: 'crear clase' desmontado con 403 ACCESO_RESTRINGIDO: ningún aviso" (y 'editar clase')
- Clase, montado: "CL3-C14: 'crear clase' montado con un 201: un solo aviso de éxito y la navegación a la clase", "CL3-C14: 'editar clase' montado con un 200: …", "CL3-C14: 'crear clase' montado con un 500, un 503 y la red caída: un solo aviso en cada caso, como antes" (y 'editar clase')
- **Observación (texto del plan contra el código, sin cambio de código):** la viñeta dice "desmontado con un `500`, un aviso con el mensaje del servidor, y con la red caída, el de conexión". §D-11 manda avisar con `mensajeDeErrorClases(error)`, y `TRADUCCION_DE_ERRORES_CLASES` traduce `ERROR_INTERNO` y `SIN_CONEXION` al genérico del módulo ("Algo salió mal. Inténtalo de nuevo."); solo los códigos de `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` (por ejemplo, `503 SERVICIO_OCUPADO`) conservan el texto del servidor. Es lo mismo que da hoy `alFallar` con el formulario montado (lo comprueba el caso "montado con un 500, un 503 y la red caída"). Los casos aseguran eso: genérico con `500` y red, texto del servidor con `503`. Lo dejo para que el manager confirme la lectura; no cambié la traducción del módulo (eso sí sería cambiar el plan).

**CL3-C15** (guardas de CHORE-04 en "Comentar", "Crear clase" y "Guardar cambios"; procedimiento de la Enmienda 11) → `formularios-03c2.test.tsx`:
- "CL3-C15: dos clics en el mismo render en «'Comentar'» mandan una sola petición" (y «'Crear clase'», «'Guardar cambios'»)
- "CL3-C15: tras un error del servidor en «'Comentar'», el siguiente envío vuelve a salir" (y los otros dos)
- (a) "CL3-C15: tras el ErrorDeCampo del servidor en «'Comentar'», un envío válido lo quita antes de la respuesta nueva" (y los otros dos)
- (b) "CL3-C15: tras el ErrorDeCampo del servidor en «'Comentar'», un envío que la validación local rechaza muestra un solo ErrorDeCampo, el local, sin aviso; y el siguiente envío sale" (y los otros dos)
- Los títulos no usan la palabra `reset()` (R-03c2-2). (Las comillas simples dentro de «» las pone `vitest` al formatear `$boton`.)

**CL3-C19** (`errorQueRedirigeElCliente` de `features/clases/lib.ts`) → `frontend/src/app/redirige-03c2.test.ts`:
- "CL3-C19: ApiError ACCESO_RESTRINGIDO da true, lo mismo que el de features/tareas", "… CAMBIO_DE_CONTRASENA_REQUERIDO da true, …", "… NO_AUTENTICADO da true, …", "… VALIDACION da false, …", "… SIN_ACCESO_A_LA_CLASE da false, …", "… SERVICIO_OCUPADO da false, …", "CL3-C19: un Error da false, …", "CL3-C19: null da false, …", "CL3-C19: un objeto con codigo que no es ApiError da false, lo mismo que el de features/tareas".
- Vive en `src/app/` y no en `features/clases/`: la regla `no-restricted-imports` de `eslint.config.mjs` ("Un módulo de features/ no importa de otro módulo", regla 9) también aplica a las pruebas de `features/`, y el caso compara con `features/tareas/lib.ts` como pide la viñeta. `app/` sí puede importar de los dos módulos.

Ninguna viñeta queda sin caso.

## Matriz de avisos, recargas y foco (§D-14) de cada vista que cambia en 03c2

Columnas: disparador · respuesta · qué se renueva · aviso (uno) · foco · en vuelo a la vez · con la vista desmontada. "Como 03c1" quiere decir que 03c2 no tocó ese camino (solo la URL o la consulta de la que lee).

### Avisos (`muro-view.tsx`; solo cambia la URL)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| Primera carga (`?tipo=anuncio&limite=20`) | `403`, 5xx, red | — | Ninguno: `MensajeError` (como 03c1) | Como 03c1 | — | Nada |
| Recarga con datos | 5xx, red | Se conserva lo último | Como 03c1 | Sin cambio | — | Ninguno |
| "Ver más avisos" (`tipo=anuncio`, `cursor`) | `400` del cursor | — | Ninguno: R1 | Como 03c1 (R1, CL3-C12) | `enEspera={isFetching}`: un clic durante la recarga no pide nada | Nada |
| "Ver más avisos" | 5xx, red | Como 03c1 | Como 03c1 | Como 03c1 | Una página por doble clic (TanStack no repite la página en curso) | Ninguno |
| Cualquiera | Redirige `apiClient` | — | Ninguno | — | — | — |

### Actividades de aprendizaje (`trabajo-view.tsx`, `seccion-de-tema.tsx`)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| Primera carga de la lista por sección (`GET …/temas?seccion=actividades`) | `403 SIN_ACCESO_A_LA_CLASE`, 5xx, red | — | Ninguno: `MensajeError` (`mensajeDeConsultaClases`) en lugar de la lista | Como 03c1 (§7.22) | — | Nada |
| Recarga de la lista por sección con datos | 5xx, `503`, red | Se conserva lo último | Uno por fallo: "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos." (CL3-C11); al volver a montar con un fallo viejo, ninguno | Sin cambio | Dos recargas que fallan seguidas: dos avisos (uno por fallo) | Ninguno |
| Recarga de la lista por sección con datos | `SIN_ACCESO_A_LA_CLASE` o `VALIDACION` de `claseId` | — | Ninguno: `MensajeError` reemplaza la vista | Como 03c1 | — | Ninguno |
| Lista total (`GET …/temas`, solo maestro y admin) | cualquier error | — | Ninguno: la confirmación de borrar dice la frase sin conteo | Sin cambio | — | Nada |
| Lista total | no tiene el tema | — | Ninguno: frase sin conteo para ese tema | Sin cambio | — | — |
| Primera página de un tema (`…/trabajo?tema=…&seccion=actividades`) | 5xx, red, `403` | — | Ninguno: `MensajeError` en la sección (como 03c1) | Como 03c1 | Las demás secciones siguen; fila del limitador (máx. 6) | Nada |
| "Ver más de `<tema>`" | `400` del cursor | — | Ninguno: R2 en la sección (CL3-C13) | Como 03c1 | `enEspera={isFetching}` | Nada |
| "Subir" / "Bajar" | `200` | La lista total (escrita con la respuesta) y, esperadas, las listas por sección | Ninguno | Se queda en el botón del tema que se movió (o el otro botón, o su `h3`) cuando llega la lista por sección | El botón sigue en espera hasta que llega la lista por sección (CL3-C10). Doble clic, o "Bajar" y "Subir" de otro tema en el mismo turno: un `PUT` (`ordenandoRef`) | Sin aviso de éxito (no hay); la escritura y la invalidación corren igual |
| "Subir" / "Bajar" | `200`, y la recarga por sección falla | La total sí; la por sección conserva el orden viejo | Uno: el de recarga fallida | El botón sale de la espera y conserva el foco | — | Ninguno |
| "Subir" / "Bajar" | `409 ORDEN_DESACTUALIZADO` | Temas (total y por sección: `claveTemas` no exacta) y trabajo | El mensaje del servidor (como 03c1) | En el botón | — | El aviso sale (patrón T-30, como 03c1) |
| "Subir" / "Bajar" | 5xx, red | — | Uno (`mensajeDeErrorClases`, como 03c1) | En el botón | — | El aviso sale |
| "Crear tema" / "Guardar nombre" | `201` / `200` | Temas (total y por sección) | "Tema creado" / "Tema renombrado" | Como 03c1 (§7.22) | Doble clic = un envío (`enviandoRef` de `formulario-tema.tsx`, ya existía) | El aviso sale |
| "Crear tema" / "Guardar nombre" | `400 VALIDACION` de `nombre` o `TEMA_REPETIDO` | Con `TEMA_REPETIDO`: temas y trabajo | Montado: ninguno, `ErrorDeCampo`. **Desmontado: uno, el mensaje sin la ruta (genérico si queda vacío)** (§D-11, CL3-C14) | Montado: el campo | — | Uno |
| "Crear tema" / "Guardar nombre" | otro `400`, 5xx, red | — | Uno (como 03c1) | En el botón | — | Uno |
| "Sí, borrar tema" y "Mover" | todas | Temas (total y por sección) y trabajo, como 03c1 | Como 03c1 | Como 03c1 | Como 03c1 | Como 03c1 |
| Cualquiera | Redirige `apiClient` | — | Ninguno de la vista de 03c2. **Heredado (sin cambio en 03c2):** los `onError` de tema, orden, borrar y mover, y el aviso de recarga fallida, no excluyen hoy los códigos que redirige `apiClient` (patrón O-1d3-2, que §D-11 deja como está) | — | — | — |

### Comentario (`formulario-comentario.tsx`, `useComentar`)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| "Comentar" | `201` | Comentarios y la lista de Avisos (exacta) | "Comentario publicado" | Sin cambio (el campo se vacía) | **Doble clic en el mismo render = un `POST`** (`enviandoRef`, §D-12) | El aviso sale (T-30) |
| "Comentar" | `400 VALIDACION` de `texto` | — | Montado: ninguno, `ErrorDeCampo`. **Desmontado: uno, sin la ruta; genérico si queda vacío** | El campo | — | Uno |
| "Comentar" | otro `400`, `404`, 5xx, red | — | Uno (como 03c1) | En el botón | La guarda se libera en `onSettled`: el siguiente envío sale (CL3-C15) | Uno |
| Validación local tras un `ErrorDeCampo` del servidor | — | — | Ninguno: un solo `ErrorDeCampo`, el local (el del servidor se reemplaza en `errores`) | El campo | La guarda no se toma (se marca después de validar) | — |
| "Comentar" | Redirige `apiClient` | — | Heredado: el gancho avisa con el genérico (patrón O-1d3-2, no pedido en 03c2) | — | — | — |

### Crear y editar clase (`formulario-clase.tsx`, `useCrearClase`, `useEditarClase`; variante M-01)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| "Crear clase" / "Guardar cambios" | `201` / `200` | Lista del admin, listas de clases (y el detalle al editar) | "Clase creada" / "Cambios guardados" (de `alTerminar`) | Navega a la clase | **Doble clic en el mismo render = una petición** (`enviandoRef`, §D-12) | **Un aviso del gancho, el mismo texto; no navega** |
| Lo mismo | `400 VALIDACION` de un campo pintado | — | Ninguno: `ErrorDeCampo` | El campo | — | **Un aviso del gancho con el mensaje sin la ruta (genérico si queda vacío)** |
| Lo mismo | `400` fuera de contrato, `404 MAESTRO_NO_ENCONTRADO`, `409` | — | Uno (de `alFallar`) | En el botón | La guarda se libera en `onSettled` | **Uno, del gancho** |
| Lo mismo | 5xx, `503` o red | — | Uno (de `alFallar`; genérico con `500` y red, el del servidor con `503`) | En el botón | — | **Uno, del gancho, el mismo texto** (antes, ninguno) |
| Lo mismo | Redirige `apiClient` (`errorQueRedirigeElCliente`) | — | Montado: el de `alFallar`, como antes (sin cambio) | — | — | **Ninguno** |
| Validación local o falta de `claseId` | — | — | Ninguno: `ErrorDeCampo` local | El campo | La guarda no se toma | — |

Con el formulario montado, el gancho nunca avisa (sus `onError`/`onSuccess` corren antes que los de `mutate` y ven `montado.current === true`), así que nunca hay dos avisos.

## Hermanos y estados vecinos (aunque no es una corrección, por la regla del 2026-10-05)

**Filtros nuevos (`tipo=anuncio`, `seccion=actividades`).**
- Lecturas de `…/publicaciones`: solo `usePublicaciones` (grep de `/publicaciones?` en producción). Aplicado. La clave no cambió, así que `invalidarMuro` (exacta) y la de `features/tareas` (`clavePublicaciones`, exacta) la siguen alcanzando.
- Lecturas de `…/trabajo`: solo `useTrabajo` (primera página y "Ver más"); las dos llevan `seccion=actividades` (mismo `URLSearchParams`). Aplicado.
- Lecturas de `…/temas`: `useTemas`/`consultaTemas` (el total: formulario del muro con "Material", formularios de tarea de `features/tareas` y la frase de borrar de Actividades) y `useTemasDeLaSeccion` (la estructura de Actividades). El total no cambia de URL a propósito (§D-7.6).
- Invalidaciones de temas que deben alcanzar la lista por sección: `invalidarTemas` (crear, renombrar), `invalidarTemasYTrabajo` (borrar, mover, `renovarTrasError`, publicar un material) y `features/tareas/hooks.ts:103` y `:122`. Todas usan `claveTemas` **no exacta** (grep de `claveTemas(` en producción): alcanzan `claveTemasDeLaSeccion` sin cambio. El único que escribía la lista sin invalidar era `useOrdenarTemas` (`setQueryData`): es el que cambió (espera la recarga por sección).

**`useOrdenarTemas` con espera: estados del mecanismo.** `200` con la recarga por sección que llega (CL3-C10: espera y foco), `200` con la recarga que falla (la espera termina, un aviso de recarga fallida, el orden en pantalla queda el de la última lista por sección), `409` y 5xx (por `onError`, sin cambio), doble clic y "Bajar"+"Subir" de otro tema en el mismo turno (un `PUT`, `ordenandoRef`; M-01 de `trabajo-view.test.tsx` y `trabajo-01e-r1.ataque` en verde), vista desmontada con el `PUT` en vuelo (la invalidación no tiene observadores activos y se resuelve sin pedir; no hay aviso de éxito), estudiante (no ve los controles; no pide el total). La lista total no se vuelve a pedir tras ordenar: el `predicate` deja fuera su clave exacta.

**O-16 (`useMontado`): ganchos y estados.**
- Ganchos del plan (§D-11 de 03c2): `useComentar`, `useCrearTema`, `useRenombrarTema`, `useCrearClase`, `useEditarClase`. Aplicado a los cinco.
- Hermanos del patrón fuera de la lista de 03c2: `useCrearPublicacion` (es de 03d según §D-11; no lo toqué), `useGuardarCategorias` (`hooks.ts`, `onError`: `if (erroresDeCategoriasDeApi(error, []) !== null) return` calla un error de fila aunque el editor de categorías ya no esté montado). Este último **no está en §D-11 ni en ninguna lista**: no lo toqué y lo anoto como pendiente para el orquestador (mismo hueco que O-16, otra vista). Fuera de `features/clases` hay ganchos con el mismo patrón en `features/tareas`, que está en "No se toca".
- Estados vecinos del mecanismo (los cubren los casos de CL3-C14): formulario montado al responder (sin aviso del gancho); desmontado al navegar a otra pantalla con el envío en vuelo (un aviso); desmontado y vuelto a montar (otra instancia del formulario: la vieja tiene su ref en `false`, avisa una vez, y la nueva no pinta el error porque sus callbacks de `mutate` no corren); mensaje con ruta (se quita), mensaje vacío o de solo espacios tras la ruta (genérico). En la variante de clase, además: 5xx, `503`, red, éxito y `ACCESO_RESTRINGIDO`, montado y desmontado. `StrictMode` (efecto doble): la limpieza pone `false` y el segundo efecto vuelve a poner `true`.

**Guardas de §D-12: estados.** Validación local fallida y falta de `claseId` (no toman la guarda: se marca justo antes de `mutate`); éxito y error (se libera en `onSettled` de esa llamada; caso "el siguiente envío vuelve a salir"); dos clics en el mismo render (una petición); formulario desmontado con la petición en vuelo (la ref muere con el componente). Hermanos con guarda ya existente, sin cambio: `formulario-tema.tsx`, `formulario-publicacion.tsx`, `editor-de-categorias.tsx`, borrar tema y "Subir"/"Bajar". Filas 3 a 6 y 19 a 22 de CHORE-04: no se tocan (§D-12).

**`errorQueRedirigeElCliente`.** Hermanos: los de `features/tareas/lib.ts` y `features/calificaciones/lib.ts` (mismo nombre, firma y cuerpo). El de `features/clases` solo lo usan los dos ganchos de clase (§D-11 no pide usarlo en comentario ni tema). Grep de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` en producción: `services/apiClient.ts`, `features/calificaciones/lib.ts`, `features/clases/lib.ts`, `features/tareas/lib.ts`; ningún comentario de `hooks.ts`, `data.ts`, `types.ts` ni de los componentes la nombra (R-03c2-1).

## Hallazgos atendidos

No aplica (implementación, no corrección). R-03c2-1 y R-03c2-2 (indicaciones literales del paso 3) seguidas al pie de la letra.

## Desviaciones del plan

Ninguna en el código. Dos precisiones para el manager:
1. **CL3-C19 vive en `frontend/src/app/redirige-03c2.test.ts`** y no en `features/clases/`: ESLint (`no-restricted-imports`, regla 9) prohíbe que un archivo de `features/clases`, también de prueba, importe `@/features/tareas/lib`, y la viñeta pide comparar con ese ayudante.
2. **CL3-C14, textos del `500` y de la red** (ver "Observación" en CL3-C14): el código sigue §D-11 (`mensajeDeErrorClases`), que da el genérico del módulo con `500` y red, y el texto del servidor con `503`; los casos lo aseguran así. No cambié la traducción del módulo.

Otras decisiones menores dentro del plan: `elementosEnTotalDelTema` como función pura de `lib.ts` (la regla de `null` de §D-7.6); `invalidarTemasDeLasSecciones` con `predicate` para no volver a pedir el total recién escrito; en los dos formularios, `if (enviandoRef.current) return` reemplaza la comprobación de `isPending` al inicio del envío (la ref la cubre y llega antes); el comentario de `trabajo-view.tsx:49` se partió al reescribir ese bloque (pendiente de la revisión final de 03c1).

## Pendiente o fuera de alcance detectado

- `useGuardarCategorias`: un error de fila con el editor de categorías desmontado no da mensaje (hueco tipo O-16, fuera de §D-11). Para `docs/ESTADO.md` o el `chore` de foco y navegación.
- Heredado y sin cambio (O-1d3-2): los `onError` de comentario, tema, orden, borrar y mover, y el aviso de recarga fallida de Actividades, no excluyen los códigos que redirige `apiClient`.
- Paso 5 de 03c2 (A-02 bis, A-02 ter, la frase de los conteos de A-04 y la parte de A-12): del orquestador al cerrar.
- No abrí navegadores; nada visual nuevo (sin cambios de estilos ni de `DESIGN.md`).

## Corrección de M-01 (verificación del manager)

Fuente: `revision.md`, "## Verificación del resumen del programador — 03c2", M-01. **M-01: corregido.**

**Causa.** `useCrearTema` y `useRenombrarTema` decidían en su `onError` si avisar (`!montado.current || erroresDelTemaDeApi(error) === null`) **antes** de `await renovarTrasError(…)`. Con `TEMA_REPETIDO` (error del campo `nombre` y código que renueva temas y trabajo), TanStack Query 5.103.2 espera ese `onError` antes de despachar el error y de llamar a los callbacks de `mutate`, que solo corren con el observador suscrito. Si el formulario se desmontaba durante la renovación, el gancho ya había decidido callar y el formulario ya no pintaba su `ErrorDeCampo`, así que la persona no recibía ningún mensaje.

**Remedio.** `frontend/src/features/clases/hooks.ts`:
- Ayudante nuevo `avisarErrorDelTema` (`:858-868`): un error que no es del campo se avisa al momento, como antes (`:865`); después viene `await renovarTrasError(…)` (`:866`); al final, un error del campo se avisa solo si el formulario **ya no** está montado (`:867`). La decisión se toma después de la última espera.
- `useCrearTema` (`:887`) y `useRenombrarTema` (`:909`) llaman a ese ayudante en su `onError`. Ninguna firma cambió.
- No hizo falta tocar `lib.ts` ni `types.ts`. No cambió ninguna prueba existente ni ninguna `*.ataque`.

**Casos nuevos** en `frontend/src/features/clases/formularios-03c2.test.tsx`, en el bloque "O-16 en crear y renombrar tema con TEMA_REPETIDO: el aviso se decide después de renovar (CL3-C14, M-01 de la verificación de 03c2)". El doble del archivo gana `temas.retener` y `temas.pedidas` para retener la renovación.
- "CL3-C14 (M-01): 'crear tema' desmontado antes de la respuesta TEMA_REPETIDO: un solo aviso con el mensaje" (y 'renombrar tema')
- "CL3-C14 (M-01): 'crear tema' desmontado durante la renovación de temas tras TEMA_REPETIDO: un solo aviso al terminar" (y 'renombrar tema')
- "CL3-C14 (M-01): 'crear tema' montado al terminar la renovación tras TEMA_REPETIDO: su ErrorDeCampo, sin aviso" (y 'renombrar tema')
- "CL3-C14 (M-01): 'crear tema' desmontado después de mostrar su ErrorDeCampo por TEMA_REPETIDO: ningún aviso" (y 'renombrar tema')
- "CL3-C14 (M-01): 'crear tema' desmontado y vuelto a montar durante la renovación tras TEMA_REPETIDO: un solo aviso y el formulario nuevo sin error" (y 'renombrar tema')

Comprobación de que los casos detectan el hueco: con el orden anterior restaurado de forma temporal en el ayudante, fallaron 4 casos ("durante la renovación" y "vuelto a montar durante la renovación", en crear y en renombrar). Con el remedio, los 10 pasan. Restauré el remedio de inmediato desde una copia en el scratchpad.

**Hermanos.** Cada `onError` u `onSuccess` de `features/clases` que decide con `montado`. Grep de `montado.current` en producción: `hooks.ts:170`, `:172`, `:183`, `:197`, `:218`, `:723` y `:867`.
- `useCrearTema` y `useRenombrarTema`: decidían antes de una espera. El remedio aplica y lo apliqué.
- `useComentar` (`:723`): el `onError` es síncrono, sin `await`, y decide justo antes de los callbacks de `mutate`. No hay espera entre la decisión y el despacho, así que el remedio no aplica.
- `useCrearClase` y `useEditarClase` (`:183`, `:197`, `:218`): `onError` y `onSuccess` son síncronos; sus invalidaciones van con `void`, sin espera. El remedio no aplica.
- Ganchos que nacen en 03d y 03e (`useCrearPublicacion`, `useCrearRecurso`, `useEditarRecurso`, `useCrearDuda` y `useResponder`): deben tomar la decisión con `montado` después de su última espera, con el patrón de `avisarErrorDelTema`. Queda anotado para esas subentregas; no son de 03c2.
- `useGuardarCategorias`, fuera de §D-11: no usa `montado`. Sigue pendiente con el destino que fijó el manager.

**Estados vecinos del mecanismo** (O-16 en los formularios de tema):

| Estado | Cobertura |
|---|---|
| Montado al responder, sin renovación (un `VALIDACION` de `nombre`) | Casos de CL3-C14 de antes |
| Montado al terminar la renovación (`TEMA_REPETIDO`) | Caso nuevo "montado al terminar la renovación" |
| Desmontado antes de la respuesta (`VALIDACION` o `TEMA_REPETIDO`) | Casos de antes y caso nuevo "antes de la respuesta" |
| Desmontado durante la renovación (el estado de M-01) | Caso nuevo "durante la renovación" |
| Desmontado y vuelto a montar durante la renovación | Caso nuevo. La instancia vieja avisa una vez y la nueva no pinta el error |
| Desmontado después de mostrar el `ErrorDeCampo` | Caso nuevo: ningún aviso más |
| Error que no es del campo (5xx, `404 TEMA_NO_ENCONTRADO`, etc.) | Se avisa al momento, antes de renovar, igual que antes; no depende de `montado` |
| Mensaje vacío con ruta, desmontado | Caso "sin texto visible" de antes: el genérico |

En todos los estados sale un solo mensaje: un aviso o el `ErrorDeCampo`, nunca los dos.

**Matriz corregida (filas de crear y renombrar tema; reemplazan a la fila "Crear tema / Guardar nombre — `400 VALIDACION` de `nombre` o `TEMA_REPETIDO`" de arriba).**

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| "Crear tema" / "Guardar nombre" | `400 VALIDACION` de `nombre` | — | Montado: ninguno, se muestra el `ErrorDeCampo` | El campo | — | Uno, con el mensaje sin la ruta (el genérico si queda vacío) |
| "Crear tema" / "Guardar nombre" | `TEMA_REPETIDO` | Temas (el total y los de la sección) y el trabajo, y el gancho espera esa renovación | Lo decide el gancho **al terminar la renovación**. Si el formulario sigue montado: ninguno, se muestra su `ErrorDeCampo`. Si se desmontó antes de la respuesta o durante la renovación: un aviso con el mensaje del servidor | Montado: el campo | El botón sigue en espera hasta que termina la renovación | Uno. Desmontado y vuelto a montar durante la renovación: uno, y el formulario nuevo queda sin error. Desmontado después del `ErrorDeCampo`: ninguno más |

**Verificación** (desde `frontend/`, una tras otra):

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0) |
| `npx vitest list \| grep -acE "^src/"` | `5501` → `5511` casos (+10) |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `251` archivos (sin cambio) |
| `npx vitest list \| grep -ac "^src/features/clases/formularios-03c2.test.tsx >"` | `41` → `51` |
| `npm run test` | `Tests  5511 passed (5511)` (antes, `Test Files  251 passed (251)`; `Duration  216.25s`). Sin «Hook timed out» (0) |
| `npm run build` | `✓ built in 731ms` (exit 0) |

Formateo: solo corrí `npx prettier --write` sobre `src/features/clases/hooks.ts` y `src/features/clases/formularios-03c2.test.tsx`. Con `git diff --stat -- frontend`, los archivos rastreados suman 13 archivos, 211 inserciones y 35 borrados; los tres archivos de prueba nuevos siguen sin rastrear.

Conteos de CL3-C14 tras la corrección: 39 casos (los 29 de antes más los 10 nuevos).

## Corrección de la ronda 1 (T-01)

Fuente: `reporte-tester.md`, "## CLASES-03c2 — Ronda 1", T-01 (media). **T-01: corregido.**

**Causa.** `useOrdenarTemas` escribía la respuesta del `PUT` solo en la lista total (`setQueryData`), que ya no gobierna la vista. La lista por sección se quedaba con el orden viejo cuando su recarga fallaba. `handleOrdenar` (`trabajo-view.tsx:162`) calculaba el siguiente orden sobre esa lista, y como el servidor solo valida el conjunto de ids, el primer movimiento se deshacía sin aviso.

**Remedio.** Solo en `frontend/src/features/clases/hooks.ts` y `lib.ts`:
- `lib.ts:353`, `temasEnElOrdenDe(lista, ordenada)` (función pura nueva): devuelve la lista por sección en el orden de la respuesta del `PUT`, con los conteos de la sección. Un tema que la respuesta no trae queda al final.
- `hooks.ts:823`, `filtroDeLasSecciones`: el filtro de las listas por sección, compartido por `invalidarTemasDeLasSecciones` y el `onSuccess`.
- `hooks.ts:960-969`, `onSuccess` de `useOrdenarTemas`. Escribe el total, como antes, y espera la recarga por sección, como antes (CL3-C10). Después aplica `temasEnElOrdenDe` solo a las listas por sección que no pudieron traer el orden nuevo:
  - las que quedaron en error, porque su recarga falló;
  - las que no tienen observadores (la vista está desmontada y la invalidación no las volvió a pedir).

  Una recarga que sí llegó no se toca: manda lo que dice el servidor. El `onSuccess` corre aunque la vista esté desmontada.
- Primero probé la sugerencia del tester tal cual: reordenar antes de esperar. Rompía su `CL3-2R1-03` y mi `CL3-C10`, porque los dos afirman que, durante la espera, la vista sigue con el orden viejo y el botón en espera. Por eso el reordenamiento va **después** de la espera y solo donde la recarga no trajo el orden. No cambié ninguna prueba existente.
- `trabajo-view.tsx`, `types.ts`, `seccion-de-tema.tsx`: sin cambio.

**Pruebas que lo cubren:**
- Del tester, ahora verdes: `features/clases/ordenar-03c2-r1.ataque.test.tsx:199`, "CL3-2R1-01: «Subir Unidad 2» sale bien y la recarga por sección falla; el siguiente «Subir Unidad 3» no deshace el primer movimiento", y "CL3-2R1-01: «Bajar Unidad 1» sale bien y la recarga por sección falla; el siguiente «Subir Unidad 3» no deshace el primer movimiento". El control de `:228` y CL3-2R1-02 a 08 siguen verdes.
- Mías, nuevas, en `frontend/src/features/clases/contenido-03c2.test.tsx`, bloque "T-01 (ronda 1 de 03c2): el orden nuevo no se pierde si la lista por sección no llega":
  - "CL3-C10 (T-01): «Subir» sale bien y la recarga por sección falla: la vista muestra el orden del PUT y el siguiente «Subir» parte de él". Comprueba también que los conteos siguen siendo los de la sección.
  - "CL3-C10 (T-01, O-01): salir con el PUT en vuelo, que responde mientras no se ve, y volver con la recarga por sección fallando: la vista muestra el orden del PUT y el siguiente «Subir» parte de él"
- Comprobé que detectan el hueco: con la condición del remedio puesta en `false` de forma temporal, fallaron los 4 casos (los dos del tester y los dos míos). Restauré el código desde una copia del scratchpad.

**Hermanos:**
- «Bajar»: es el mismo `onSuccess`. Aplica y está aplicado; lo cubre la segunda variante de CL3-2R1-01.
- Crear, renombrar o borrar tema y mover un elemento: no aplica. No escriben la caché a mano; invalidan y vuelven a pedir. Si su recarga por sección falla y después se ordena, el conjunto de ids cambió (tema nuevo o borrado) y el servidor responde `409 ORDEN_DESACTUALIZADO`, que avisa y renueva. Renombrar y mover no cambian el orden ni el conjunto. Ahí no hay pérdida silenciosa.
- Otros `setQueryData` de `features/clases` que la vista podría ignorar: `useGuardarCategorias` escribe `claveCategorias`, que es la misma clave que lee su vista. No aplica.

**Estados vecinos del mecanismo** (el orden tras «Subir»/«Bajar»):

| Estado | Resultado |
|---|---|
| `PUT` `200` y la recarga por sección llega | Sin cambio: la vista muestra lo del servidor y el botón espera hasta que llega (CL3-C10, CL3-2R1-03 y 04) |
| `PUT` `200` y la recarga por sección falla | La lista toma el orden de la respuesta. Sale un aviso de recarga fallida y el siguiente orden parte del nuevo (T-01) |
| Salir con el `PUT` en vuelo, que responde mientras no se ve, y volver con la recarga sana | Orden nuevo (CL3-2R1-05) |
| Lo mismo, volviendo con la recarga fallando | Orden nuevo desde la caché, y el siguiente «Subir» parte de él (caso nuevo O-01) |
| Salir con la recarga por sección en vuelo y volver | Orden nuevo (CL3-2R1-06) |
| **O-01, volver antes de que responda el `PUT`** | **No cubierto.** La vista nueva ve la caché vieja y no sabe que hay un `PUT` en vuelo (`ordenandoRef` y `ordenEnVuelo` son de la vista anterior). Un «Subir» en esa ventana parte del orden viejo. Cuando el `PUT` responde, `onSuccess` corrige la caché, pero ese segundo `PUT` ya salió. Cerrarlo pide marcar «Subir»/«Bajar» en espera desde la vista nueva (por ejemplo, con `useIsMutating` y una `mutationKey`), y la espera de cada botón vive en `seccion-de-tema.tsx`, que no está entre los archivos permitidos. No lo forcé. Es heredado de 03c1 (antes pasaba igual con la lista total); lo decide el manager |
| `409 ORDEN_DESACTUALIZADO`, 5xx o red | Sin cambio (`onError`) |
| Doble clic | Un `PUT` (`ordenandoRef`), sin cambio |
| Estudiante | No ordena; la consulta por sección no recibe nada |

**Matriz (filas que cambian, de la tabla de Actividades de arriba):**

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| "Subir" / "Bajar" | `200`, y la recarga por sección falla | La total, escrita con la respuesta. La de la sección toma el orden de la respuesta con sus conteos, al terminar la espera | Uno: el de recarga fallida, que ahora sí muestra la última versión que se tiene | El botón sale de la espera y conserva el foco (o va al otro botón del tema, o a su `h3`) | El siguiente «Subir»/«Bajar» parte del orden nuevo | — |
| "Subir" / "Bajar" | `200` con la vista desmontada | La total, y las listas por sección en caché (sin observadores) toman el orden de la respuesta | Ninguno | — | — | Al volver se ve el orden nuevo aunque la recarga falle. Volver antes de que responda el `PUT` no está cubierto (O-01, arriba) |

**Verificación** (desde `frontend/`, una tras otra):

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0) |
| `npx vitest list \| grep -acE "^src/"` | `5547` (base de la ronda 1: 5545, +2) |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `254` (sin cambio) |
| `npx vitest list \| grep -ac "^src/features/clases/contenido-03c2.test.tsx >"` | `19` (antes 17) |
| `npm run test` | `Tests  5547 passed (5547)` (antes, `Test Files  254 passed (254)`; `Duration  220.87s`). Sin «Hook timed out» (0) |
| `npm run build` | `✓ built in 822ms` (exit 0) |

Formateo: solo corrí `npx prettier --write` sobre `hooks.ts`, `lib.ts` y `contenido-03c2.test.tsx`, dentro de `frontend/`. `git diff --stat -- frontend` sobre los rastreados: `13 files changed, 245 insertions(+), 35 deletions(-)`. Los archivos de prueba nuevos, míos y del tester, siguen sin rastrear. No toqué ninguna `*.ataque`.

## Corrección de M-01 de la ronda 1

Fuente: `revision.md`, "## Verificación de la corrección de la ronda 1 — 03c2", M-01. **M-01: corregido.**

**Causa.** El `setQueriesData` del remedio de T-01 dejaba la lista por sección como correcta y recién llegada: TanStack Query 5.103.2 borra el error, quita la marca de vieja y pone la fecha de ahora. Eso producía dos fallos:
1. Tras un `PUT` correcto, si la recarga respondía `403 SIN_ACCESO_A_LA_CLASE` o `VALIDACION` de `claseId`, la escritura tapaba ese error. Volvían los datos viejos con «Subir», «Bajar», «Renombrar» y «Borrar tema».
2. Con la vista desmontada, una lista que otra acción había marcado vieja perdía esa marca. Al volver antes de 30 s no se pedía y la vista mostraba conteos viejos.

**Remedio.** Solo en `frontend/src/features/clases/hooks.ts`:
- `:949-970`: función nueva `ponerElOrdenEnLasSeccionesSinElNuevo`, que llama el `onSuccess` de `useOrdenarTemas` (`:991`) después de esperar la recarga por sección.
- Elige con `getQueryCache().findAll(filtroDeLasSecciones(claseId))` las listas por sección que no trajeron el orden nuevo: en error, o sin observadores.
- Excluye las que tienen un error que reemplaza la vista (`errorQuitaLaVista`, `:959`). Ese error se sigue mostrando, sin acciones.
- A cada lista elegida le escribe el orden de la respuesta, con sus propios conteos (`temasEnElOrdenDe`), y enseguida la marca vieja sin pedirla ahora: `invalidateQueries({ queryKey, exact: true, refetchType: "none" })` (`:967`). Así se vuelve a pedir al montar, aunque no hayan pasado 30 s.
- Si esa petición falla, la vista conserva el orden del `PUT`, y el siguiente «Subir»/«Bajar» parte de él. T-01 sigue en verde.
- `lib.ts`, `types.ts` y `trabajo-view.tsx`: sin cambio en esta corrección.

**Casos nuevos** en `frontend/src/features/clases/contenido-03c2.test.tsx`, bloque "M-01 de la ronda 1 de 03c2: la lista que toma el orden del PUT no tapa un error ni queda por fresca". `montar` gana el parámetro `staleTime`, por defecto 0; el segundo caso usa 30_000, el valor de `app/providers.tsx`.
- "CL3-C10 (M-01 ronda 1): «Subir» sale bien y la recarga por sección responde 403 SIN_ACCESO_A_LA_CLASE: la vista sigue diciendo que no hay acceso, sin «Subir», «Bajar», «Renombrar» ni «Borrar tema»"
- "CL3-C10 (M-01 ronda 1): con staleTime de 30 s, salir con el PUT en vuelo, marcar vieja la lista por sección mientras no se ve y volver antes de 30 s: se vuelve a pedir y muestra los conteos nuevos en el orden del PUT"

Comprobé que detectan los dos fallos: con el remedio anterior simulado de forma temporal (sin la exclusión de `errorQuitaLaVista` y sin la marca de vieja), los 2 casos fallaron. Restauré el código desde una copia del scratchpad. Siguen verdes los casos de T-01 (`CL3-2R1-01`, las dos variantes, y mis "CL3-C10 (T-01) …" y "CL3-C10 (T-01, O-01) …"), `CL3-2R1-02` a `08`, `CL3-C10` y el M-01 de `trabajo-view.test.tsx`.

**Estados vecinos de la escritura en caché**, uno por uno. Al escribir, cada lista queda marcada vieja.

| Estado | ¿Escribe? | Resultado |
|---|---|---|
| Montada, la recarga por sección llega (`200`) | No | Manda el servidor; el botón espera (CL3-C10) |
| Montada, la recarga falla con 5xx | Sí | Orden del `PUT`, marcada vieja, un aviso de recarga fallida y el siguiente orden parte del nuevo (T-01) |
| Montada, la recarga falla por la red | Sí | Igual que con 5xx: `SIN_CONEXION` no reemplaza la vista |
| Montada, la recarga responde `403 SIN_ACCESO_A_LA_CLASE` | No | `MensajeError` "No tienes acceso a esta clase.", sin acciones (caso nuevo) |
| Montada, la recarga responde `VALIDACION` de `claseId` | No | Igual que con `403`: `errorQuitaLaVista` la incluye |
| Dos fallos seguidos (dos «Subir» con la recarga en 5xx) | Sí, en cada uno | Cada orden parte del anterior. Un aviso por fallo (CL3-C11) |
| Desmontada, sin otra invalidación, al volver antes de 30 s | Sí (sin observadores) | Marcada vieja: se pide al montar. Si responde, manda el servidor; si falla, queda el orden del `PUT` (caso "T-01, O-01") |
| Desmontada, con otra invalidación mientras no se ve, al volver antes de 30 s | Sí | Sigue marcada vieja: se pide al montar y muestra los conteos nuevos en el orden del `PUT` (caso nuevo) |
| Desmontada, al volver después de 30 s | Sí | Se pide al montar, como cualquier dato viejo |
| Desmontada, la lista ya estaba en un error que reemplaza la vista | No | Al volver se ve el error y se vuelve a pedir, como hoy |
| Estudiante | — | No ordena |
| Volver antes de que responda el `PUT` (O-01) | — | Fuera de alcance, va a CHORE-04 |

**Matriz (filas que cambian, de la tabla de Actividades).**

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| "Subir" / "Bajar" | `200`, y la recarga por sección falla con 5xx o red | La total, con la respuesta. La de la sección toma el orden de la respuesta, con sus conteos, y queda marcada vieja | Uno: el de recarga fallida | El botón sale de la espera y conserva el foco | El siguiente orden parte del nuevo | — |
| "Subir" / "Bajar" | `200`, y la recarga responde `403 SIN_ACCESO_A_LA_CLASE` o `VALIDACION` de `claseId` | Nada se escribe en la lista por sección | Ninguno: `MensajeError` reemplaza la vista, sin acciones | Como 03c1 | — | — |
| "Subir" / "Bajar" | `200` con la vista desmontada | La total. Las listas por sección en caché toman el orden y quedan marcadas viejas | Ninguno | — | — | Al volver se piden, aun antes de 30 s |

**Verificación** (desde `frontend/`, una tras otra):

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0) |
| `npx vitest list \| grep -acE "^src/"` | `5549` (base 5547, +2) |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `254` (sin cambio) |
| `npx vitest list \| grep -ac "^src/features/clases/contenido-03c2.test.tsx >"` | `21` (antes 19) |
| `npm run test` | `Tests  5549 passed (5549)` (antes, `Test Files  254 passed (254)`; `Duration  245.45s`). Sin «Hook timed out» (0) |
| `npm run build` | `✓ built in 756ms` (exit 0) |

Formateo: solo corrí `npx prettier --write` sobre `hooks.ts` y `contenido-03c2.test.tsx`, dentro de `frontend/`. `git diff --stat -- frontend` sobre los rastreados: `13 files changed, 266 insertions(+), 35 deletions(-)`. No toqué ninguna `*.ataque` ni ninguna prueba normal fuera de mis archivos.
