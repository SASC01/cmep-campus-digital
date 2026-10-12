# Reporte del Tester — ENTREGAS-01a — Ronda 0
Veredicto de la ronda 0: **PARADA (PA-02)**. Detalle en "PA-02".
- **Qué la causa:** el caso `tareas-01b-r1` › "seis ediciones de fecha simultáneas: todas 200 …" necesita más que el cambio mínimo de §D-R0. Lo dejé sin reescribir para que decida el orquestador.
- **Dos pruebas normales fuera de la lista cerrada del programador** van a caer igual: `tareas-concurrencia.integracion` › las dos "PR-1B12" de ediciones simultáneas, y `esquemas-tareas` › "PR-1B06: editarTareaSchema es el mismo esquema …".
- **Lo demás de la ronda está hecho:** V-01, el inventario de §D-R0, C-6, C-7, las corridas y PA-07.

Verificación propia: backend lint código 0 · test `172 passed (172)` / `2159 passed (2159)` · frontend lint código 0 · test `150 passed (150)` / `2243 passed (2243)` · PA-07 limpia.

Base `<R>` = `dd8edcb` (rama `feat/entregas`). Antes de esta ronda, `git diff --stat dd8edcb -- shared backend frontend` estaba vacío y `git status` de esos paquetes no tenía cambios: aún no hay código del programador. La ronda 0 no cuenta en el tope de 3 rondas.

## PA-01 y precondiciones
Lo comprobé en modo de solo lectura:
- `docker info` / `docker version`: servidor y cliente **28.5.1**, "Docker Desktop". Corren solo los tres contenedores de `infra/` (`campus-dev-postgres-1`, `campus-dev-minio-1` y `campus-dev-livekit-1`), que no toqué.
- `Get-NetConnectionProfile`: red **`IZZI-F281-5G`**, interfaz Wi-Fi, `NetworkCategory : Public`.
- `Get-NetFirewallRule -DisplayName 'Campus: bloquear entrada a Docker en redes publicas'`: `Enabled : True`, `Direction : Inbound`, `Action : Block`, `Profile : Public`. Su filtro de aplicación es `C:\Program Files\Docker\Docker\resources\com.docker.backend.exe`.
- **PA-01: coincide con lo que verificó el orquestador.** No me detuve.
- **`shared/dist` (R-17):** `cd shared; npm run build` → `> tsc -p tsconfig.json`, sin errores (código 0). El `prelint` del backend lo vuelve a construir antes del `lint`.
- No abrí navegadores ni aplicaciones gráficas. No terminé procesos.

## V-01 — 163/163
Calculé el SHA-256 de todas las `*.ataque.test.ts(x)` que versiona git (`git ls-files -co --exclude-standard`): están en `backend/src/`, `backend/test/` y `frontend/src/`. Después las comparé con la tabla de 163 de la ronda 4 de 01e de TAREAS-01 (`docs/trabajo/TAREAS-01-tareas-temas-y-categorias/reporte-tester.md`, desde la línea 6294), pasando ambas a minúsculas y ordenando por ruta.
- Resultado sobre `dd8edcb`, antes de reescribir nada: **163 coinciden, 0 faltantes, 0 sobrantes** (`diff` vacío).
- La tabla de referencia incluye 6 archivos de `backend/src/` (en `config/`, `core/clases/` y `workers/`), así que V-01 cubre también esa carpeta, además de `backend/test/` y `frontend/src/`.

## Inventario de §D-R0 para 01a (Enmienda 1, M-01)
Recorrí las `*.ataque` y las pruebas normales contra los cambios de contrato de 01a (§D-1, §D-2, §D-7 y §D-8). Para cada lista digo qué encontré y si rompe en 01a.

### Contratos que cambian en 01a y quién los usa
| Contrato | Quién lo usa hoy | Resultado en 01a |
|---|---|---|
| `PUT /api/clases/:claseId/tareas/:tareaId` exige `version` (`editarTareaSchema = crearTareaSchema.extend({ version })`) | `*.ataque`: `tareas-01b-r1` (helper `editar`: 24 llamadas), `referencias-01b-r1` (helper `editar`: 5 llamadas, más 1 `PUT` en "la cadena en las cinco rutas") e `instantanea-01b-r1:235` (1 `PUT`). Las demás `*.ataque` con `"PUT"` (`admin-muro-02b-r1`, `cuerpos-02a-r2`, `gestion-02a-r1`, `logs-02a-r1`, `lecturas-fx-r1:661`, `muro-c-r1:749`, `servicio-ocupado-ch-r1:332`, `cuentas-r1/r2/r3`, `logs-cuentas-r1`, `clases-r1/r2/r3`, `temas-01a-r1/r3`, `categorias-01a-r1`, `nombres-ids-01a-r2` y `archivos-d-r1`) editan clases, correos, comentarios, temas, categorías u orden, o firman URL del almacén. Ninguna edita una tarea. | Rompen las tres de TAREAS-01b que prevé §D-R0. Se reescriben en **C-6**, salvo un caso que necesita más que el cambio mínimo (**PA-02**). |
| `crearTareaSchema` suma `requiereAdjuntos` con `.default(true)` | `esquemas-tareas.test.ts:312` (normal) usa `toMatchObject`, que acepta una llave de más. Las `*.ataque` crean tareas sin el campo. | No rompe nada. |
| `tareaDetalleSchema` exige `version` y `requiereAdjuntos` | Frontend: los dobles `tareaDetalle` de las cuatro `*.ataque` de TAREAS-01d (`tareas-01d-r1` a `r4`). Ninguna otra `*.ataque` construye un `TareaDetalle`. `tarjeta-01d-r1/r2`, `reloj-01e-r4` y las de "Trabajo de clase" usan el resumen del muro (`resumenDeTareaSchema`, que 01a no cambia). Backend: ninguna `*.ataque` construye un `TareaDetalle` a mano; las respuestas se leen con `tareaRespuestaSchema.parse`, que no es estricto. | Rompen las cuatro de 01d que prevé §D-R0. `useTarea` y `consultaTarea` hacen `parse` con `tareaRespuestaSchema`, así que sin los campos la vista caería en error. Se reescriben en **C-7**. |
| `editarTarea(datos, …)` con `version` en el tipo `EditarTarea` | Ninguna `*.ataque` la llama: `instantanea-01b-r1:537` solo lee su cuerpo para comprobar que no usa `instantaneaUnica`. Normales: `tareas.integracion.test.ts:761` y `:852`, en la lista cerrada del programador. | Ninguna `*.ataque` rompe. |
| `moverATema` sube la versión de una tarea (`tx.tarea.updateMany` antes de `publicaciones`) | `*.ataque`: `instantanea-01b-r1:339` y `:361` mueven por la API dentro del gancho de `listarTrabajo`. Es una lectura en `REPEATABLE READ` que no bloquea filas, así que el movimiento no espera. `temas-01a-r1` y `temas-01a-r3` mueven materiales y tareas y comprueban conteos y códigos. Ninguna lee `tareas.version` ni `tareas.actualizado_en`, y ninguna retiene filas de `tareas` (busqué `conFilaRetenida`, `conTablaRetenida` y `FOR UPDATE` sobre `tareas`). Normal: `lecturas-consistentes.integracion.test.ts:738` mueve un material. | No rompe nada. |
| `CODIGOS_TAREAS` y `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` suman `TAREA_MODIFICADA`; `CODIGOS_QUE_RENUEVAN_LA_TAREA` no cambia | Ninguna prueba, normal o `*.ataque`, enumera esas listas (búsqueda en `backend/` y `frontend/`). | No rompe nada. |
| `useEditarTarea.onError` no cambia (§D-8.3.1) | `tareas-01d-r2:320` y `:341`: ante `404`, `403 BORRADO_NO_PERMITIDO` y `403 EDICION_NO_PERMITIDA`, avisan y vuelven a pedir la tarea. | No rompe, por diseño (fila "Diseño" de §D-R0). |
| "Guardar cambios" en `enEspera` durante la recarga, sin `disabled` | `tareas-01d-r2:519` (ningún `disabled` en el JSX de `features/tareas`) y `styles/clases-r1` V-06 (ningún `disabled` en el JSX de `src/`). | No rompe, por diseño (fila "Diseño" de §D-R0), mientras nadie escriba `disabled`. |
| `TEXTOS_DE_LA_CLASE.sinTema` y las claves de O-2 | `refactor-01c-r1:448` exige que `TEXTOS_DE_LA_CLASE` se defina solo en `components/clase/data.ts`. `:256` y `:257` fijan `sinAcceso` y `firmaAdministracion`. `estatico-02c-r1` cuenta las líneas que nombran `FIRMA_ADMINISTRACION`. Nada fija la lista completa de llaves. | No rompe nada, si `sinTema` se agrega como llave del objeto que ya existe y ningún archivo vuelve a definir `TEXTOS_DE_LA_CLASE`. |

### Listas cerradas e inventarios estáticos
| Lista (archivo y caso) | Qué fija | 01a |
|---|---|---|
| `sesiones-y-cadena.ataque:527` (C-1) | Inventario exacto de `printRoutes` | 01a no agrega rutas, así que no cambia. C-1 es de 01b y 01c. |
| `lecturas-fx-r1.ataque:758` (C-2) | `instantaneaUnica: true` exactamente en `clases.ts:4`, `publicaciones.ts:2` y `tareas.ts:2`, y ninguna mención en los comentarios de `tareas.ts` | 01a no agrega lecturas. **Cuidado (O-2 de la Enmienda 1):** el conteo es de texto, así que escribir el literal en un comentario de `tareas.ts` o de `publicaciones.ts` lo rompe. |
| `muro-c-r1.ataque:625` (C-3) | Quién nombra las colas de avisos | 01a no agrega colas, así que no cambia. |
| `temas-01a-r3.ataque:440` (C-4) | Lista cerrada de `core/tareas/` y `handlers/tareas/`, sin `console.` ni `estadoPago` y sin comparar un rol a mano | 01a no agrega archivos ahí. `core/concurrencia.ts` vive en la raíz de `core/`, y el error `TAREA_MODIFICADA` va "junto a los de tareas", en un archivo que ya existe. **Un archivo nuevo en `core/tareas/` o en `handlers/tareas/` la rompería** (sería PA-03 del programador). |
| `temas-01a-r1.ataque:978` | `FOR KEY SHARE` solo en `adapters/db/referencias.ts`; `bloquearClase` solo en `bloqueo-clase.ts`; lista cerrada de `handlers/tareas/` (los tres de hoy), sin SQL, Prisma, `.rol`, roles comparados ni `notifier`; `encolar(` y `cancelar(` solo en `handlers/tareas/tareas.ts` | 01a no la rompe: `moverATema` sube la versión con `updateMany`, sin `FOR KEY SHARE`, y no hay handlers nuevos. **Para 01b y 01c, ver "Avisos para rondas siguientes" (A-1).** |
| `temas-01a-r1.ataque:1007` | Las consultas de `adapters/db/temas.ts`, `categorias.ts` y `referencias.ts` no viven dentro de un ciclo | El `updateMany` nuevo de `moverATema` debe ir fuera de todo `for` o `while`. Si es así, no rompe. |
| `instantanea-01b-r1.ataque:537` | En `adapters/db/tareas.ts`: `crearTarea`, `editarTarea` y `borrarTarea` sin `instantaneaUnica`; `leerTareaCon` y `listarTrabajoCon` sin escrituras ni bloqueos; `leerTarea` y `listarTrabajo` con la opción | 01a solo suma `t.version` al `FOR NO KEY UPDATE OF t` de `editarTarea`, que es una escritura sin la opción. No rompe. |
| `temas-01a-r3.ataque:426` y `arquitectura-cuentas-r1.ataque:69` | `$queryRawUnsafe` solo en `adapters/db/cliente.ts` | 01a no agrega SQL inseguro, así que no cambia. |
| `lecturas-fx-r2.ataque:966` (O-4) | Qué tablas se borran en `backend/src` | 01a no borra nada nuevo, así que no cambia. |
| `lecturas-fx-r2.ataque:918` | Solo `handlers/clases/muro.ts` llama a las lecturas del muro, con un único argumento | 01a solo ajusta tipos en `publicaciones.ts` (§D-1), así que no cambia. |
| `tareas-01b-r1.ataque:726` | Solo `adapters/notifier/` escribe en `notificaciones`; las colas de una tarea son `RECORDATORIO_24H` y `TAREA_CREADA` | 01a no encola nada nuevo, así que no cambia. |
| `styles/clases-r1.ataque` V-06 | Ningún `disabled` en JSX; 49 `enEspera=`, con lista fija por archivo (`formulario-tarea.tsx: 1`, `editar-tarea-view.tsx: 0`, `editor-de-rubrica.tsx: 0`, …) | "Cómo se entrega" no lleva `enEspera`, y la recarga reutiliza el de "Guardar cambios". No rompe, **si el programador no agrega ningún `enEspera=` ni ningún `disabled`**. |
| `styles/clases-r1.ataque` V-07 | Archivos con `vidrio-fuerte`, por igualdad exacta (`formulario-tarea.tsx` ya está) | Si "Cómo se entrega" copia dentro de `formulario-tarea.tsx` el control de entregas tardías, no rompe. **Extraerlo a un archivo nuevo con `vidrio-fuerte` la rompería** (sería PA-03, porque §D-8 no crea archivos). |
| `tareas-01d-r1.ataque:493` (C-5) | Ningún `target="_blank"` en `features/tareas` | 01a no agrega enlaces externos, así que no cambia. C-5 es de 01d. |
| `refactor-01c-r1.ataque` | Lista de símbolos movidos; en `components/`, `lib/` y `services/`, nada de `?? []`, `fetch(`, `console.` ni `target=_blank`, y ninguna importación de `features/` | `components/clase/data.ts` está en la lista. Sumar `sinTema` a `TEXTOS_DE_LA_CLASE` no la rompe. |
| `estatico-02c-r1.ataque` | `puedeBorrar` solo en tres archivos; la perspectiva solo desde `perspectivaDeRuta`; la firma solo en dos archivos | 01a no lee `puedeBorrar` en archivos nuevos ni compara rutas, así que no cambia. |
| `bloqueo-usuario.integracion` E6 (normal) | SQL etiquetado solo en 9 archivos de `adapters/db` | 01a no agrega archivos con SQL a `adapters/db` (`temas.ts` y `tareas.ts` ya están). No cambia en 01a; ver I-2. |

**Resultado del inventario para 01a:**
- Rompen exactamente lo que nombra la viñeta "01a" de §D-R0: las tres `*.ataque` de TAREAS-01b y las cuatro de TAREAS-01d.
- Las tres filas "Diseño" de §D-R0 con subentrega 01a (`tareas-01d-r2:519`, `:320` y `:341`) no rompen, por diseño.
- **No encontré ninguna `*.ataque` que 01a rompa fuera de §D-R0.**
- Pero un caso de una de las previstas necesita más que el cambio mínimo: es la PA-02 de abajo.

## Reescrituras (A-4)
La tabla de §D-R0 no numera las reescrituras de la viñeta "01a", así que las llamo **C-6** (backend: `version` en el `PUT`) y **C-7** (frontend: dobles de tarea). Ancla de las dos: §D-R0, viñeta "**01a:** `PUT /clases/:claseId/tareas/:tareaId` exige `version` (… y las `*.ataque` de TAREAS-01b que editan); `tareaDetalleSchema` exige `version` y `requiereAdjuntos` (… y en las `*.ataque` de 01d y 01e de TAREAS-01)".

**Regla que seguí:** cambio mínimo y ninguna aserción tocada. Cada archivo lleva un comentario "ENTREGAS-01a ronda 0 (C-6 | C-7, §D-R0 «01a» …)" con el motivo. Formateé solo esos siete archivos (`npx prettier --write <archivo>`, dentro de su paquete).

### C-6 — backend, `version` en el `PUT` de una tarea (3 archivos)
- **Cambio mínimo:** a cada edición que llega al adaptador le sumo `version: N` dentro de los `cambios` que ya recibe `cuerpoDeTarea`. No toqué ningún helper compartido: `ayudas-tareas.ts` está en "No se toca".
- **Valor de N:** la versión vigente en ese momento del caso. Es 0 para una tarea creada por la API o con `crearTareaDePrueba` (la columna nace en 0), y sube 1 por cada edición con éxito anterior.
- **Por qué no la leo del `GET`:** hoy el `GET` no devuelve `version`, y una lectura dentro del helper agregaría una petición que cambia el orden de las carreras.
- **Qué no se toca:** las ediciones que la cadena rechaza antes de leer el cuerpo (maestro ajeno `403 SIN_ACCESO_A_LA_CLASE`, alumno `403 ROL_NO_PERMITIDO`, sin token o restringido) no rompen y no las cambié.
- **Hoy siguen en verde:** `crearTareaSchema` es `z.object` (no estricto), así que hoy el servidor descarta la llave `version`. Con 01a, la valida y la compara.

| Archivo | Caso | Llamadas cambiadas (versión enviada) | Por qué rompía sin `version` |
|---|---|---|---|
| `backend/test/tareas-01b-r1.ataque.test.ts` | "maestro retirado y vuelto a asignar: …" | B mientras A está (0, espera `403`), B con A retirado (0, `200`), B con A de vuelta (1, `403`), A otra vez (1, `200`) | `400 VALIDACION` en lugar de `403 EDICION_NO_PERMITIDA` o `200` |
| ídem | "la tarea del admin: …" | maestro sobre la del admin (0, `403`); admin sobre la suya (0, `200`); admin sobre la del maestro (0, `403`) | ídem |
| ídem | "editar la fecha y borrar a la vez (tres tareas): …" | la edición de cada vuelta (0; acepta `200` o `404`) | `400` no está en `[200, 404]` |
| ídem | "fecha a 24 h + 3 s: …" | las dos ediciones (0 y 0, tareas distintas) | `400` en lugar de `200` |
| ídem | "límite de 365 días: …" | fuera y pasada (0 y 0; esperan `400 FECHA_LIMITE_INVALIDA`, que no sube la versión) y "conserva" sobre `crearTareaDePrueba` (0, `200`) | `400 VALIDACION` en lugar de `FECHA_LIMITE_INVALIDA` y `200` |
| ídem | "conservar un archivo de otra tarea, …" | las cinco del ciclo (0; esperan `400`) | **No rompía:** seguía en `400`, pero por `VALIDACION` y no por el archivo. El caso pasaría sin probar lo que dice, así que le sumo la versión para que conserve su sentido |
| ídem | "seis archivos en total o el mismo id dos veces: …" | seis (0, `VALIDACION` del esquema), repetido (0, `VALIDACION`), mayúsculas (0, `200`), ninguno (1, `200`) | mayúsculas y ninguno: `400` en lugar de `200` |
| ídem | "ninguna respuesta de las cinco rutas, …" (fugas) | "Editada" de A (0, `200`) y "B" de B (1, `403`) | **No rompía** (solo revisa llaves), pero el `200` que revisa por fugas pasaría a ser un `400`. Le sumo la versión por la misma razón |
| ídem | "crear, editar y borrar una tarea solo deja en la cola sus dos trabajos …" | la edición (0, `200`) | `400` en lugar de `200` |
| `backend/test/referencias-01b-r1.ataque.test.ts` | "editar con la categoría o el tema de otra clase o inexistentes: …" | las cuatro del ciclo (0; `404`) y "sin categoría" (0; `409 CATEGORIA_REQUERIDA`) | `400 VALIDACION` en lugar de `404` y `409` |
| ídem | "los conteos de temas y categorías cuentan las tareas …" | editar `t2` (0, `200`) | `400` en lugar de `200` |
| ídem | "dos creaciones y, aparte, dos ediciones que reclaman el mismo pendiente: …" | las dos ediciones simultáneas, cada una sobre su tarea (0 y 0; esperan `[200, 400]`) | `[400, 400]` |
| `backend/test/instantanea-01b-r1.ataque.test.ts` | "con una edición en medio que cambia el título, reemplaza la rúbrica y quita el adjunto: …" | el `PUT` del gancho (0, `200` como precondición) | La precondición `porLaApi(…, 200)` fallaría con `400` |

En total, 21 llamadas en `tareas-01b-r1`, 5 en `referencias-01b-r1` y 1 en `instantanea-01b-r1`. Sin cambio: `tareas-01b-r1` › "el maestro de otra clase recibe 403 …" (las dos ediciones son de la cadena) y `referencias-01b-r1` › "sin token 401; …" (la cadena responde antes del cuerpo).

### C-7 — frontend, dobles de `TareaDetalle` (4 archivos)
- **Cambio mínimo:** cada doble `tareaDetalle` suma `version: 0` (una tarea recién creada) y `requiereAdjuntos: true` (el valor por defecto de "Cómo se entrega"), justo después de `aceptaTardias`.
- **Qué se conserva:** en los de `r1`, `r2` y `r3`, `...cambios` sigue al final, así que un caso que necesite otro valor lo puede pedir. Ninguna aserción cambia.
- **Hoy siguen en verde:** `tareaDetalleSchema` es `z.object`, así que hoy el `parse` descarta las dos llaves. Con 01a, las exige.

| Archivo | Doble |
|---|---|
| `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | `tareaDetalle(cambios)` |
| `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | `tareaDetalle(cambios)` |
| `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | `tareaDetalle(cambios)` |
| `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | `tareaDetalle(titulo)` |

- **Cuerpos del `PUT` y del `POST`:** ninguna de las cuatro compara el cuerpo completo. Solo leen `rubrica` (`r1`), `categoriaId` (`r2`) y `archivoIds` (`r3`), así que la `version` y `requiereAdjuntos` del cuerpo nuevo no las rompen.
- **Por qué no hay C-7 en las `*.ataque` de 01e de TAREAS-01** (`trabajo-01e-r1/r2`, `ver-mas-01e-r3`, `categorias-01e-r1/r2`, `reloj-01e-r4`): no construyen un `TareaDetalle`. Usan el resumen del muro y los elementos de "Trabajo de clase", que cambian en 01b (`entrega`), no en 01a.
- **Una dependencia que el programador no debe romper:** `tareas-01d-r1` › "cuerpoDeTarea contra el esquema de shared/: …" llama `cuerpoDeTarea({ ...estadoInicialDelFormulario(null), … }, 0)`. Si 01a cambia la firma de `cuerpoDeTarea` (por ejemplo, para pasarle la versión), esta `*.ataque` rompe, y no está en §D-R0. §D-8.2 arma `{ ...datos, version }` en la vista, así que la firma no debería cambiar.

## PA-02 — PARADA del orquestador
**`backend/test/tareas-01b-r1.ataque.test.ts:283` (línea en el árbol de la ronda 0; `:273` en `dd8edcb`)** › "ataque TAREAS-01b r1: trabajos diferidos (punto 2)" › **"seis ediciones de fecha simultáneas: todas 200 y al final hay exactamente un RECORDATORIO_24H vivo, el de trabajo_id, a fecha − 24 h; un solo TAREA_CREADA"**.
- **Qué fija hoy:**
  - seis `PUT` simultáneos sobre la misma tarea responden todos `200`;
  - queda un solo `RECORDATORIO_24H` vivo, el de `trabajo_id`;
  - hay **7** trabajos `RECORDATORIO_24H` en total (1 al crear + 6 cancelados y recreados);
  - hay un solo `TAREA_CREADA`.
- **Por qué no basta el cambio mínimo de §D-R0:**
  - Con P-05, la versión se compara con la fila bloqueada (§D-2.1, PR-1A04). Si las seis mandan la misma versión, pasa exactamente una y las otras cinco reciben `409 TAREA_MODIFICADA`.
  - Si mandan 0, 1, 2, 3, 4 y 5, el resultado depende del orden en que llegan al bloqueo, que la prueba no controla.
  - Ninguna forma de enviar la versión conserva "todas 200" ni "7 trabajos". Para reescribirla hay que cambiar sus aserciones, y eso es más que el cambio mínimo de A-4: es PA-02 por definición del plan ("una de §D-R0 necesita más que el cambio mínimo descrito").
- **Qué hice:** no la reescribí. Quedó igual a `dd8edcb`, salvo que el comentario de C-6 la nombra. Hoy pasa. Con 01a caerá: los seis `PUT` sin `version` darán `400 VALIDACION`.
- **Opciones para el arquitecto** (las dejo escritas; no decido):
  - **(a) Recomendada por mí:** las seis mandan `version: 0`. Se espera exactamente un `200` y cinco `409 TAREA_MODIFICADA`. El único `RECORDATORIO_24H` vivo es el de `trabajo_id`, a fecha − 24 h de la que ganó (se lee de la fila). Hay 2 trabajos `RECORDATORIO_24H` en total (el de crear, cancelado, y el de la ganadora) y un solo `TAREA_CREADA`.
    - Conserva el ataque de concurrencia y la invariante "un solo recordatorio vivo, el de `trabajo_id`".
    - Además comprueba que un `409` no cancela ni crea trabajos (PR-1A03, en carrera).
  - **(b)** Seis ediciones en serie con versiones 0 a 5: conserva "7 trabajos", pero pierde la concurrencia, que es lo que ataca el caso.
  - **(c)** Quitar el caso y dejar que PR-1A04 lo cubra: pierde la comprobación de los trabajos diferidos bajo carrera.

**Lo mismo pasa en dos pruebas normales**, que no son mías pero el orquestador debe saberlo ahora. Están fuera de la lista cerrada del programador: esa lista solo permite "sumar esos campos", y estas necesitan cambiar aserciones, así que el programador se detendría en ellas.
1. `backend/test/tareas-concurrencia.integracion.test.ts` › "concurrencia de las tareas (PR-1B12)" › **"PR-1B12: dos ediciones de fecha simultáneas dejan un solo RECORDATORIO_24H en created y es el de trabajo_id"**. Exige `200` en las dos; con 01a, una recibe `409`.
2. El mismo archivo › **"PR-1B12: una ráfaga de diez ediciones de fecha deja un solo recordatorio vivo, el de trabajo_id"**. Exige `200` en las diez; con 01a, nueve reciben `409`.
3. `backend/test/esquemas-tareas.test.ts:414` › "crearTareaSchema (PR-1B06)" › **"PR-1B06: editarTareaSchema es el mismo esquema y tareaIdParamSchema pasa el id a minúsculas"**. Tiene `expect(editarTareaSchema).toBe(crearTareaSchema)`, y con §D-2.1 `editarTareaSchema` pasa a ser `crearTareaSchema.extend({ version })`, otro objeto. No edita una tarea ni es un doble, así que tampoco cabe en la lista cerrada.
4. `tareas-concurrencia.integracion` › "PR-1B12: editar y borrar a la vez no deja ningún recordatorio vivo" y "PR-1B12: editar una tarea con el tema que se borra a la vez …" **sí caben**: con `version` 0, el resultado aceptado (`200` o `404`) no cambia.

## Pruebas normales que 01a rompe y están en la lista cerrada del programador (solo inventario; no las toqué)
- **Backend, `PUT` sin `version` o `editarTarea` sin `version`** (deben sumar el campo):
  - `tareas.integracion.test.ts`: el helper de `PUT` de `:122` y las llamadas directas a `editarTarea` de `:761` y `:852`;
  - `tareas-autoria.integracion.test.ts`: los `PUT` de `:104` (helper) y `:280`;
  - `tareas-autorizacion.integracion.test.ts`: `:175` (`estatusPermitido: 200` con `cuerpoDeTarea({ titulo: "Editada" })`);
  - `tareas-concurrencia.integracion.test.ts`: `:156` y `:236` caben en la lista; `:116` y `:135` no (PA-02, arriba).
- **Frontend, dobles de `TareaDetalle`** (deben sumar `version` y `requiereAdjuntos`): `app/router.test.tsx`, `features/tareas/detalle-tarea-view.test.tsx`, `features/tareas/editar-tarea-view.test.tsx` (además, O-1), `features/tareas/formulario-tarea.test.tsx` y `features/tareas/lib.test.ts`.

## Rojos esperados
**Hoy no hay ninguno.** Las 7 reescrituras pasan sobre `dd8edcb` porque los esquemas de hoy no son estrictos:
- `crearTareaSchema` (que hoy también es `editarTareaSchema`) es `z.object`, así que el servidor descarta la llave `version` del `PUT`.
- `tareaDetalleSchema` es `z.object`, así que el cliente descarta `version` y `requiereAdjuntos` del doble.
- La corrida completa lo confirma (ver "Corridas").

**Con la implementación de 01a:**
| Prueba | Antes de 01a | Durante 01a | Cuándo queda en verde |
|---|---|---|---|
| C-6 (las 27 llamadas reescritas de las tres `*.ataque` del backend) | Verde (la llave se descarta) | Verde si el `PUT` compara la versión como dice §D-2.1: el orden 404 → 403 de autoría → 409 de versión → fecha, categoría y tema | Ya lo está; si alguna cae con 01a, es un hallazgo de la ronda 1 |
| C-7 (los 4 dobles del frontend) | Verde (las llaves se descartan) | Verde cuando `tareaDetalleSchema` exija los dos campos: el doble ya los trae | Ya lo está |
| `tareas-01b-r1` › "seis ediciones de fecha simultáneas: …" (**PA-02**, sin reescribir) | Verde | **Roja** en cuanto `editarTareaSchema` exija `version`: los seis `PUT` responderán `400 VALIDACION` | Cuando el orquestador resuelva la PA-02 (con una enmienda o una indicación para la ronda 0 complementaria) |
| Normales fuera de la lista cerrada: `tareas-concurrencia.integracion` › las dos "PR-1B12" de ediciones simultáneas, y `esquemas-tareas` › "PR-1B06: editarTareaSchema es el mismo esquema …" | Verdes | **Rojas** con 01a | Cuando el orquestador amplíe la lista cerrada del programador o el arquitecto lo resuelva |
| Normales dentro de la lista cerrada (inventario de arriba) | Verdes | Rojas hasta que el programador sume `version` y los dobles | En la entrega del programador |

## Avisos para rondas siguientes (no aplican en 01a; los anoto para que el orquestador los resuelva antes de la ronda 0 de 01b)
- **A-1 — `backend/test/temas-01a-r1.ataque.test.ts:978` › "FOR KEY SHARE solo en adapters/db/referencias.ts; bloquearClase se define solo en bloqueo-clase.ts; los handlers de tareas no usan SQL, Prisma, roles ni notifier, y los de temas y categorías tampoco encolan". §D-R0 no la nombra: C-4 solo nombra `temas-01a-r3:440`.** Tiene tres reglas que 01b y 01c van a tocar:
  1. Lista cerrada de `handlers/tareas/` (`categorias.ts`, `tareas.ts` y `temas.ts`). Rompe con `entregas.ts` (01b) y con `hilo-privado.ts` (01c), igual que C-4.
  2. `encolar(` y `cancelar(` prohibidos en los handlers de `handlers/tareas/` distintos de `tareas.ts`. Rompe si `entregas.ts` encola `ENTREGA_REALIZADA` o `hilo-privado.ts` encola `COMENTARIO_CREADO` desde el callback `alGuardar` del handler, como hoy `tareas.ts` (§D-0.4, §D-5).
  3. `FOR KEY SHARE` solo en `adapters/db/referencias.ts`. Rompe si `adapters/db/entregas.ts` escribe el `SELECT … FOR KEY SHARE` de la tarea (§D-6: entregar, anular y comentar), salvo que reutilice una función de `referencias.ts`.

  Si no se nombra ahora, será PA-02 en la ronda 0 de 01b. Sugiero que el arquitecto la sume a C-4 (01b y 01c) con las tres reglas.
- **A-2 — `bloqueo-usuario.integracion.test.ts` › "E6: …" (normal).** Si `adapters/db/entregas.ts` usa SQL etiquetado (§D-3.5, §D-3.7 y §D-4 lo prevén), la lista cerrada debe sumar `entregas.ts` en 01b. No está en la lista cerrada del programador de 01b. Ver I-2.
- **A-3 — `muro-c-r1:625` (C-3)** solo vigila `PUBLICACION_CREADA`, `MATERIAL_CREADO`, `COMENTARIO_CREADO` y `AVISO_FALLIDO`. `ENTREGA_REALIZADA` no está, así que 01b no la rompe y C-3 sigue siendo solo de 01c, como dice el plan.

## Corridas (una suite a la vez)
Todas sobre el árbol de la ronda 0: `dd8edcb` más las 7 reescrituras. `<scratchpad>` es mi carpeta temporal de la sesión.

**Backend**
- **shared:** `cd shared; npm run build` → `> tsc -p tsconfig.json`, código 0.
- **lint:** `cd backend; npm run lint > <scratchpad>/lint-back.txt 2>&1`, código 0.
  - El `prelint` reconstruye `shared` y corre `prisma generate`.
  - ESLint pasa sin errores, Prettier dice "All matched files use Prettier code style!" y `tsc` pasa en `src/` y en las pruebas.
  - Última línea con texto: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `cd backend; npm test > <scratchpad>/test-back.txt 2>&1`, de 03:14:47Z a 03:18:50Z, código 0.
  - Última línea: `Test Files  172 passed (172)` · `Tests  2159 passed (2159)` · `Duration  232.46s (transform 23.25s, setup 8.40s, import 403.73s, tests 1563.65s, environment 127ms)`.
  - No hubo rojos, tiempos límite ni intermitencias.

**Frontend**, después de que terminó el backend:
- **lint:** `cd frontend; npm run lint > <scratchpad>/lint-front.txt 2>&1`, código 0.
  - ESLint pasa sin errores, Prettier dice "All matched files use Prettier code style!" y `tsc -b` no da errores.
  - Última línea con texto: `> tsc -b`.
- **test:** `cd frontend; npm test > <scratchpad>/test-front.txt 2>&1`, de 03:20:52Z a 03:25:01Z, código 0.
  - Última línea: `Test Files  150 passed (150)` · `Tests  2243 passed (2243)` · `Duration  239.44s (transform 50.21s, setup 215.46s, import 480.39s, tests 896.57s, environment 903.73s)`.
  - No hubo rojos, tiempos límite ni intermitencias.

**Rojos:** ninguno, como se esperaba (ver "Rojos esperados"). **PA-12:** no aplica.

## PA-07
**Fuente:** `<scratchpad>/test-back.txt`, la salida completa de `cd backend; npm test`. Conté con `grep -a -o -F <término> | wc -l` y lo comprobé con un script (`<scratchpad>/pa07.mjs`). El script atribuye cada error y cada `P2028` a la última "incoming request" con el mismo `pid` y el mismo `requestId`, proceso por proceso (los `requestId` se repiten entre apps), y saca la llamada del mensaje de Prisma.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` (`P2028` de `maxWait`) | 0 |

- **Control positivo: completo.** Están los tres `P2028` deterministas de `servicio-ocupado.integracion`, cada uno con su ruta y en un mismo proceso (`pid` 2856), con nivel `warn` (40):
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`** también están, en otro proceso (`pid` 24524): `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- Ningún `P2028` ni ningún `"Error no controlado"` sale de una ruta de tareas, temas o categorías.
- **PA-07: limpia.** PA-12 no aplica: no hubo tiempos límite ni rojos intermitentes, y la corrida salió completa en verde.

### I-1 (PA-07 b): lista cerrada de la corrida final de la ronda 0 de 01a (base de PA-07 para 01a a 01e)
| # | Ruta | Llamada | Origen |
|---|---|---|---|
| 1-5 | `POST /api/auth/login` | "fallo simulado de la base en la búsqueda" (doble de `buscarCredencialesPorEmail`) | `backend/test/intentos-r2.ataque.test.ts` (lo dice la pila) |
| 6 | `POST /api/auth/login` | "fallo simulado de la base al crear la sesión" (doble de `crearSesion`) | `intentos-r2.ataque.test.ts` (lo dice la pila) |
| 7 | `POST /api/clases/:claseId/archivos` | `ZodError`, `invalid_format` en `subida.url`, al armar la respuesta | `backend/test/archivos-d-r2.ataque.test.ts` › T-39 |
| 8 | `POST /api/clases/:claseId/archivos/:archivoId/descarga` | `ZodError`, `invalid_format` en `url`, al armar la respuesta | `archivos-d-r2` › T-39 |
| 9 | `GET /api/clases/:claseId/publicaciones` | `ZodError`, `invalid_format` en `publicaciones.0.adjuntos.0.vistaPrevia.url`, al armar la respuesta del muro | `archivos-d-r2` › T-39 |
| 10 | `GET /api/prueba/error-comun` | `Error: boom` | `backend/test/salud.integracion.test.ts` (lo dice la pila) |

Es igual al I-1 de TAREAS-01: 6 de `POST /api/auth/login`, 3 `ZodError` de `archivos-d-r2` T-39 y 1 de `GET /api/prueba/error-comun`. Los tres `ZodError` salen del mismo proceso (`pid` 16120), en líneas seguidas del registro.

### I-2: listas cerradas de pruebas normales que el programador deberá ampliar
- **En 01a: ninguna.** 01a no agrega archivos con SQL etiquetado a `adapters/db`. `core/concurrencia.ts` es de `core/`, y E6 de `bloqueo-usuario.integracion.test.ts` solo mira `src/adapters/db/`. Tampoco agrega colas, rutas ni lecturas con la opción.
- **Para 01b (aviso):**
  - **`bloqueo-usuario.integracion.test.ts` › "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts, publicaciones.ts, referencias.ts, temas.ts, categorias.ts y tareas.ts usan SQL etiquetado en adapters/db"** deberá sumar `entregas.ts` si `adapters/db/entregas.ts` usa `$queryRaw` o `$executeRaw` (§D-3.5, §D-3.7 y §D-4 lo prevén). La lista cerrada del programador de 01b no la nombra: hay que agregarla o cae en PARADA.
  - Las pruebas normales fuera de la lista cerrada que 01a ya rompe están en "PA-02", arriba.

## Observaciones del manager (`revision.md`)
| Observación | ¿Aplica en 01a? | Destino |
|---|---|---|
| Enmienda 1, **O-1** — C-1 y las entradas `HEAD` (11 entradas en 01b: 8 rutas y 3 `HEAD`; 6 en 01c: 4 y 2 `HEAD`) | No: 01a no agrega rutas, y el inventario de `printRoutes` no cambia | Ronda 0 de 01b y 01c (C-1) |
| Enmienda 1, **O-2** — C-2 cuenta texto, no código | Solo como cuidado (lo anoté en el inventario): 01a no agrega lecturas con la opción, pero un comentario con `instantaneaUnica: true` en `tareas.ts` o en `publicaciones.ts` rompería `lecturas-fx-r1:758` | Ronda 0 de 01b y 01c (C-2) |
| Enmienda 1, **O-3** — PR-1B09 bis: orden fijo con `formadasDetrasDe` y fila existente en `asignado` para el caso (b) | No | Pruebas del programador de 01b; ronda 1 de 01b |
| Enmienda 2, **O-1** — PR-1B04 (`enlaceDeEntregaSchema`) y PR-1B28 van en `backend/test/` (`esquemas-entregas.test.ts` y `esquemas-tareas.test.ts`) | No | 01b |
| Enmienda 2, **O-2** — la guarda de "Cancelar" mientras vuela el `DELETE` también en el primer paso, como maestro y como admin | No | Ataque de la ronda 1 de 01e |
| Enmienda 2, **O-3** — PR-1B22 bis: comentario que retiene la tarea, borrado del maestro sin parámetro detrás, `204`, y el hilo se borra | No | 01b (pruebas del programador) y ataque de la ronda 1 de 01b |

## Atacado sin hallazgos (ronda 0)
- V-01: 163/163 sobre `dd8edcb`.
- Inventario de §D-R0 para 01a: solo rompen las previstas.
- Pruebas normales de la lista cerrada del programador: inventariadas, sin tocarlas.
- PA-07 de la corrida final, con I-1 e I-2.

## No atacado y por qué
- **La migración sobre una base con datos de TAREAS-01** ("Puntos de ataque", ronda 0, segunda viñeta; PR-1A01; PA-06): la migración aún no existe. **Destino: ronda 1 de 01a.** Allí aplicaré `prisma migrate deploy` sobre una base desechable con tareas, comentarios del muro y archivos confirmados y pendientes creados antes de la migración, y comprobaré que los `CHECK` nuevos (`comentarios_un_solo_contexto` y el reemplazo de `archivos_confirmado_si_y_solo_si_contexto`) no los rechazan.
- **Los puntos de ataque de 01a** (versión de otra tarea, versión de antes de un movimiento, dos pestañas, maestro de reemplazo, `"1"`, `1.0`, `1e0` y `-0`; un `409` que deja algo a medias; bloqueo cruzado entre `editarTarea`, `moverATema` y `borrarTarea`; los estados vecinos del formulario de §D-8.3.7). Aún no hay código. **Destino: ronda 1 de 01a.**
- **Efecto colateral que voy a atacar en la ronda 1 de 01a:** `Tarea.actualizadoEn` tiene `@updatedAt`, así que el `tx.tarea.updateMany({ data: { version: { increment: 1 } } })` de `moverATema` también cambiará `tareas.actualizado_en` al mover. La respuesta de la tarea expone el `actualizadoEn` de la fila de `tareas` (`leerTarea`, `adapters/db/tareas.ts:114`), así que mover de tema parecerá una edición, aunque §D-2.3 y la regla de temas digan que mover "no cuenta como editarlo". Hoy ninguna prueba lo fija.
- **Navegador:** ningún punto de 01a lo exige en esta ronda. H-6 es de la comprobación humana al final de 01e.

## Tabla de SHA-256 de las 163 `*.ataque` al cierre de la ronda 0 de 01a (base de V-01 del programador y del manager en 01a)
156 iguales a la tabla de la ronda 4 de 01e de TAREAS-01; 7 reescritas, marcadas (3 de C-6 y 4 de C-7). Ninguna nueva ni borrada. SHA-256 del archivo tal como está en el árbol de trabajo (`sha256sum`, en mayúsculas).

| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` | Reescrita (C-6) |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` | Reescrita (C-6) |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `27A518A0414FC01DD30E916375D64FAE7AC6D21CE888A55EB191AA857182CEBC` | `backend/test/tareas-01b-r1.ataque.test.ts` | Reescrita (C-6) |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `D7649925CFB92555B68B952083C3EA7BC4C6348AB0212481A2F49F5A2FE17C34` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `1B6E87DB28FF213BC7F8585A58118AD156E46E516FD5BC8C9484AEBAF30308B5` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `323800F232BFF2326F90E55C682A968194F2BB6874B43F8069DACA09CFBC9E21` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `23CA8E45D09D0AB087E7CC34C8E336CA5ABD731699219CDBABFB0BE7E29CE961` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | Reescrita (C-7) |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | Reescrita (C-7) |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | Reescrita (C-7) |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | Reescrita (C-7) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `ED2948ADF746726D62823A12F6501B79B37FCA80C3B7622CC88FA779358A52C6` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |


# Reporte del Tester — ENTREGAS-01a — Ronda 0 complementaria (C-8)
Veredicto: **LISTA PARA IMPLEMENTAR.** La PA-02 de la ronda 0 quedó resuelta con la Enmienda 3: `plan.md` con SHA-256 `a217f74c441a8a08b6e62ea55a0c725ae85aefdb4fd906792a28c9df0e0281fc` y 968 líneas (lo comprobé), aprobada por el manager en `revision.md`, en "Revisión de la Enmienda 3" y "Verificación de la corrección de M-01".
Verificación propia: lint del backend con código 0; en test del backend, 1 rojo, el esperado (C-8 en la aserción 2); PA-07 limpia. No corrí el frontend: no cambió nada en él.

## Cambio aplicado (O-1 del manager)
Solo cambió `backend/test/tareas-01b-r1.ataque.test.ts`. Las otras seis reescrituras de la ronda 0 no se tocaron (sus hashes son los mismos).
1. **C-8**, en "ataque TAREAS-01b r1: trabajos diferidos (punto 2)". Sigue al pie de la letra §D-R0 «C-8: contrato».
   - **Título nuevo:** "seis ediciones de fecha simultáneas con la misma versión: una 200 y cinco 409 TAREA_MODIFICADA; al final hay exactamente un RECORDATORIO_24H vivo, el de trabajo_id, a fecha − 24 h de la ganadora; dos RECORDATORIO_24H en total y un solo TAREA_CREADA".
   - **Se conservan** el mismo `describe`, `{ timeout: 60_000 }`, `escenario()` y `crear(e)`.
   - **Envío:** `fechas` = 6 a 11 días con `diasDespues(…).toISOString()`, y seis `editar(e, tareaId, { fechaLimite: fechas[k], version: 0 })` simultáneos.
   - **Aserciones, en el orden del contrato:**
     1. Ninguna respuesta `>= 500` (con el cuerpo como mensaje).
     2. Los códigos ordenados son `[200, 409, 409, 409, 409, 409]`, y los cinco `409` dicen `TAREA_MODIFICADA`.
     3. La ganadora es el índice de la única `200`. Su fecha es la de la fila. La versión se comprueba con `expect(fila).toMatchObject({ version: 1 })` y `expect(detalleDe(ganadora)).toMatchObject({ version: 1 })`, sin leer `.version` (M-01).
     4. El único vivo es `[fila.trabajoId]`, a fecha − 24 h, al milisegundo.
     5. Los `state` de `RECORDATORIO_24H` son `["cancelled", "created"]`.
     6. Hay un `TAREA_CREADA`.
   - **Precondiciones:** si la fila no existe, o si no hay ninguna `200`, la prueba falla con un mensaje que lo dice. Nunca termina con un `return` temprano.
   - **Ayudantes:** `editar`, `vivos`, `detalleDe`, `codigoDe`, `MS_HORA`, `diasDespues`, `leerTareaDb` y `trabajosDeTarea`, tal cual. `ayudas-tareas.ts` no se tocó.
   - **Comentario de motivo:** "ENTREGAS-01a ronda 0 complementaria (C-8, §D-R0 «C-8: contrato», Enmienda 3; PA-02 de la ronda 0; …)".
2. **Comentario de C-6**, el bloque de `:140-147` (N-02; el plan lo cita como `:140-146`). Ya no dice que las seis "no se tocan": dice que no siguen la regla de C-6 y que pasaron a C-8. Ninguna aserción cambió.
3. Pasé `npx prettier --write` solo sobre ese archivo, y no le cambió nada.

**Motivo (del contrato):**
- Conserva el ataque de concurrencia: seis `PUT` a la vez sobre la misma fila.
- Conserva la invariante que protegía el caso: un solo recordatorio vivo, el de `trabajo_id`, a fecha − 24 h.
- Suma PR-1A03 en carrera: los cinco `409` no escriben la tarea ni tocan la cola.

## Corridas
- **shared:** no hizo falta construirlo aparte, porque el `prelint` del backend lo reconstruye (`npm run shared:build`, código 0) y no cambió desde la ronda 0.
- **lint:** `cd backend; npm run lint > <scratchpad>/lint-back-c8.txt 2>&1`, código 0.
  - ESLint pasa sin errores, Prettier dice "All matched files use Prettier code style!" y `tsc` pasa en `src/` y en las pruebas: `toMatchObject` evita el TS2339.
  - Última línea con texto: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `cd backend; npm test > <scratchpad>/test-back-c8.txt 2>&1`, de 03:46:49Z a 03:49:58Z, código 1.
  - Resumen: `Test Files  1 failed | 171 passed (172)` · `Tests  1 failed | 2158 passed (2159)` · `Duration  181.50s (transform 19.65s, setup 7.38s, import 329.69s, tests 1398.73s, environment 95ms)`.
  - Las últimas líneas son el error de npm: `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`.
  - **El único rojo es C-8**, que tarda 1671 ms y falla en la aserción 2, `test/tareas-01b-r1.ataque.test.ts:301:73`: `AssertionError: expected [ 200, 200, 200, 200, 200, 200 ] to deeply equal [ 200, 409, 409, 409, 409, 409 ]`.
  - La aserción 1 pasó: ninguna respuesta `>= 500`.
  - Es exactamente el criterio de "Rojos esperados de 01a": una sola prueba fallida, C-8, en la aserción 2 con seis `200`.
  - Ningún otro rojo, tiempo límite ni intermitencia, así que PA-12 no aplica.

## PA-07
**Fuente:** `<scratchpad>/test-back-c8.txt`, la salida completa. Conté con `grep -a -o -F` y atribuí con `<scratchpad>/pa07.mjs`, igual que en la ronda 0.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 (6 de `POST /api/auth/login` de `intentos-r2`, 3 `ZodError` de `archivos-d-r2` T-39 en `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`, y 1 de `GET /api/prueba/error-comun`) |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` | 0 |

- **Control positivo: completo.** Los tres de `servicio-ocupado.integracion`, con nivel `warn`:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`:** `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- Ningún error ni `P2028` sale de las rutas de tareas, incluidos los seis `PUT` simultáneos de C-8.
- **PA-07: limpia.** I-1 sigue siendo la lista cerrada de 10.

## Tabla de SHA-256 de las 163 `*.ataque` al cierre de la ronda 0 complementaria de 01a (base de V-01 del programador y del manager en 01a)
- Respecto de la tabla de la ronda 0 solo cambia `backend/test/tareas-01b-r1.ataque.test.ts`: de `27A518A0…CEBC` a `79BC7AAF…2C79`.
- Respecto de la ronda 4 de 01e de TAREAS-01: 156 iguales y 7 reescritas (3 de C-6, una de ellas también con C-8, y 4 de C-7). Ninguna nueva ni borrada.

| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` | Reescrita (C-6) |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` | Reescrita (C-6) |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` | Reescrita (C-6 y C-8; cambia respecto de la ronda 0) |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `D7649925CFB92555B68B952083C3EA7BC4C6348AB0212481A2F49F5A2FE17C34` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `1B6E87DB28FF213BC7F8585A58118AD156E46E516FD5BC8C9484AEBAF30308B5` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `323800F232BFF2326F90E55C682A968194F2BB6874B43F8069DACA09CFBC9E21` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `23CA8E45D09D0AB087E7CC34C8E336CA5ABD731699219CDBABFB0BE7E29CE961` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | Reescrita (C-7) |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | Reescrita (C-7) |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | Reescrita (C-7) |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | Reescrita (C-7) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `ED2948ADF746726D62823A12F6501B79B37FCA80C3B7622CC88FA779358A52C6` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |


# Reporte del Tester — ENTREGAS-01a — Ronda 1
Veredicto: **RESISTE** (0 hallazgos).
Verificación propia:
- **backend:** lint con código 0; test `Test Files  177 passed (177)` · `Tests  2233 passed (2233)`.
- **frontend:** lint con código 0; test `Test Files  153 passed (153)` · `Tests  2271 passed (2271)`.
- **PA-07:** limpia (I-1 = 10).

Base `<R>` = `dd8edcb`, con la implementación de 01a sin commit (`resumen-programador.md`, aceptado por el manager en `revision.md`, "Verificación del resumen — ENTREGAS-01a — implementación").

## Regresión y V-01
- **V-01 al empezar:** 163/163 iguales a la tabla de la ronda 0 complementaria, sin faltantes ni sobrantes.
- **Mis pruebas previas** (las 7 reescrituras C-6, C-7 y C-8) pasan en las dos corridas completas:
  - C-8 ya está en verde, como prevé "Rojos esperados de 01a" para la entrega del programador.
  - No hay regresiones.

## Hallazgos
Ninguno. Todas las pruebas nuevas pasan contra la implementación.

## *.ataque nuevas (3 archivos, 53 casos)
| Archivo | Casos | Qué ataca |
|---|---|---|
| `backend/test/tareas-01a-r1.ataque.test.ts` | 19 | Versión manipulada, `409` sin efectos, caminos de `moverATema`, carreras, T-r1-4, `requiereAdjuntos` y revisión estática |
| `backend/test/migracion-01a-r1.ataque.test.ts` | 28 (con las filas de los `it.each`) | La migración sobre datos de TAREAS-01 y cada `CHECK` de PR-1A01 |
| `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` | 6 | T-r1-4 y T-r1-6 en el formulario, y T-r1-2 por texto fuente |

## Atacado sin hallazgos
**1. Versión del `PUT`** (`tareas-01a-r1.ataque`, "la versión manipulada"):
- **La versión de otra tarea de la clase**, mayor y existente: `409` y la tarea no cambia.
- **Literales de `version`, en un cuerpo JSON crudo:**
  - `-0`, `1.0` y `2e0` valen 0, 1 y 2, y pasan;
  - `"3"`, `3.5`, `true`, `[3]`, `{"v":3}`, `null`, `1e400`, `-1`, `9007199254740992` y `9007199254740993` responden `400 VALIDACION` sin escribir;
  - nunca hay un `500`.
- **T-r1-1:** `2^31 − 1`, `2^31`, `2^32` y `MAX_SAFE_INTEGER` responden `409 TAREA_MODIFICADA`, nunca `500`, sin escribir. La comparación es en JS y la versión nunca viaja como parámetro a la columna `INTEGER`.
- **Dos pestañas del mismo autor:** la segunda recibe `409`; tras releer, guarda con `v + 1` y la versión final es 2.
- **Maestro de reemplazo (P-04 b) contra el autor que salió:**
  - B edita con A fuera (`200`, versión 1);
  - A vuelve con la versión vieja y recibe `409`;
  - B, con A de vuelta, recibe `403 EDICION_NO_PERMITIDA` aunque traiga la versión vigente, porque la autoría se mira antes que la versión.
- **La tarea por la URL de otra clase** con la versión correcta: `404 TAREA_NO_ENCONTRADA` y la versión no se mueve.

**2. Un `409` no deja nada a medias** (sobre una tarea con categoría, tema, rúbrica de 2 criterios y un adjunto, editada antes por otra pestaña):
- Llega un `PUT` viejo que cambia todo: título, texto, fecha, puntos, banderas, categoría, tema, rúbrica y adjuntos (quita el confirmado y suma uno pendiente).
- Queda igual la fila de `tareas`, incluidos `trabajo_id`, `version` y `actualizado_en`.
- Queda igual la fila de `publicaciones`.
- Los criterios son los mismos, con los mismos ids.
- El adjunto sigue `confirmado`, y el nuevo sigue `pendiente` y sin publicación.
- Los trabajos de `pgboss.job` de la tarea son los mismos, con id y `state`.
- El cuerpo del `409` es exactamente `{ error: { codigo, mensaje } }`, con el mensaje de §D-7.

**3. `moverATema` (T-r1-3) y el orden de bloqueo (§D-0.6):**
- **Tema inexistente, ya borrado o de otra clase:** `404 TEMA_NO_ENCONTRADO`, la versión no sube (la transacción revierte el `updateMany`) y el `PUT` con la versión 0 sigue en `200`.
- **Mover un anuncio** (`409 ANUNCIO_SIN_TEMA`), **o una tarea de otra clase por la URL de esta** (`404 PUBLICACION_NO_ENCONTRADA`): ninguna fila de `tareas` cambia, ni `version` ni `actualizado_en`.
- **Mover y borrar con la fila de `tareas` retenida, en los dos órdenes** (con `formadasDetrasDe` y `timeout` de 30 s):
  - borrar primero da `204` y `404`;
  - mover primero da `200` y `204`;
  - ningún `500` ni deadlock, y la tarea queda borrada.
- **Mover y editar con la fila retenida, en los dos órdenes:**
  - editar primero da `200` y `200`, con versión 2 y el tema del movimiento;
  - mover primero deja la edición vieja en `409`, la versión en 1 y el tema del movimiento.
- **Editar, mover y borrar a la vez, cinco vueltas sin retención:** solo respuestas de una ejecución en serie, ningún `500`, y ningún recordatorio vivo de una tarea borrada.
- PA-07: 0 `deadlock detected` y 0 `40P01` en la corrida completa.

**4. T-r1-4, el tema elegido se borra mientras se edita:**
- **Backend:** el guardado con ese tema da `404 TEMA_NO_ENCONTRADO` sin subir la versión; el siguiente, con la misma versión y "Sin tema", da `200`.
- **Frontend:** el `404` renueva los temas, pero no la tarea:
  - el formulario no se reinicia y lo escrito sigue;
  - el guardado siguiente lleva la misma `version` de apertura, con `temaId: null`;
  - no hay una segunda lectura de la tarea.

**5. T-r1-6 y el teclado durante la recarga tras el `409`** (lectura en vuelo):
- Cambiar "Cómo se entrega", hacer clic en "Guardar cambios" y enviar el formulario desde "Título" y desde "Puntos" no mandan otro `PUT`: 1 `PUT`, 2 lecturas y 1 aviso en total.
- Al reiniciar, el control muestra lo guardado (`aria-pressed`) y el foco está en "Título".
- El guardado siguiente lleva `v + 1` y el `requiereAdjuntos` que se ve.
- "Marcar como completada" viaja como `false` con la versión de apertura, y tras el `409` el cuerpo siguiente lleva el valor recargado.

**6. `requiereAdjuntos`:**
- `"true"`, `"false"`, `1`, `0`, `null`, `[]` y `{}` responden `400 VALIDACION`, al crear (sin crear nada) y al editar (sin escribir ni subir la versión).
- `false` se guarda y lo ven el alumno, los dos maestros y el admin.
- Las respuestas de crear, editar y ver llevan exactamente las 17 llaves de `tareaDetalleSchema`. Ninguna trae `trabajo`, `@`, `estadoPago`, "deudor", "al_corriente" ni `"rol"`.

**7. La migración sobre datos de TAREAS-01** (`migracion-01a-r1.ataque`):
- **Dónde corre:** en un esquema propio de la base desechable, con `SET LOCAL search_path` y el esquema borrado al final.
- **Cómo:**
  - las 12 migraciones anteriores se aplican en orden, cada una en su transacción, como `migrate deploy`;
  - después van los datos, con SQL parametrizado: una maestra y una alumna, una clase, un tema, una categoría, dos tareas (una vencida y sin tema) con rúbrica, un material, un anuncio con un comentario del muro, y archivos confirmado, pendiente y descartado;
  - al final, la migración del encargo.
- **Resultado:**
  - las tareas quedan con `requiere_adjuntos = true` y `version = 0`, y `acepta_tardias` se conserva;
  - el comentario, los archivos y los criterios quedan intactos, y no hay ninguna entrega;
  - los 7 `CHECK` existen en el esquema migrado con `convalidated = true`.
- **Los `CHECK`, uno por uno** (cada intento en su propia transacción, revertida):
  - **entregas:** cuatro filas válidas (asignada, entregada con retraso y 5 enlaces, y calificada) y siete inválidas, cada una rechazada por el `CHECK` de su nombre;
  - **comentarios:** 2 inválidos y 2 válidos;
  - **archivos:** 5 inválidos (incluidos pendiente con entrega y descartado con entrega) y 2 válidos;
  - **`tareas.version`:** −1 se rechaza; 0 y 2147483647 pasan;
  - **otros:** la segunda entrega del mismo alumno y la misma tarea viola el único `(tarea_id, alumno_id)`; `enlaces` como objeto se rechaza; borrar la publicación de una tarea borra en cascada su entrega y el hilo de esa entrega.

**8. Revisión estática:**
- **`moverATema`:** escribe `tareas` antes de `bloquearTemaParaUsar` y antes del `updateMany` de `publicaciones`, sin ciclos ni SQL crudo.
- **`editarTarea`:** bloqueo, autoría, `exigirVersion` y fecha van en ese orden, y la versión se mira antes de la primera escritura; sin consultas en ciclos.
- **T-r1-2, por texto fuente y sin comentarios:**
  - el literal "Sin tema" vive solo en `components/clase/data.ts`;
  - "Elige la categoría de la tarea." se escribe una sola vez en `features/tareas`;
  - "No tienes acceso a esta clase." no se escribe en `features/tareas`.
- **En las líneas que agrega el diff de `shared/src`, `backend/src` y `frontend/src`:** ningún `?? []`, `disabled`, `target=`, `relacion ===`, `console.`, `estadoPago`, `$queryRawUnsafe` ni `any`.
- **Ya lo cubren las listas cerradas heredadas, que siguen verdes:** Prisma solo en `adapters/`, ningún `relacion ===` en los handlers y ningún `disabled` ni `target="_blank"` en `features/tareas`.

**9. Frontend de §D-8 (Enmienda 2):** lo que no repetí porque las pruebas del programador (`conflicto-01a.test.tsx`, PR-1A12 a PR-1A14 (a)–(h)) ya lo comprueban con el mismo rigor:
- la versión de apertura frente a una recarga de fondo;
- un solo aviso y un solo `GET`;
- `aria-busy` sin `disabled`;
- el foco tras el reinicio, tras el `404`/`403` y tras perder `puedeEditar`;
- los archivos elegidos;
- "Cancelar" durante la recarga.

  Lo leí en el código: el reinicio solo ocurre con un `refetch` con éxito y `puedeEditar`, y la guarda con ref sigue marcada durante la recarga.

## Observaciones (no son hallazgos)
- **O-r1-1 — `sinAccesoALaClase` de `features/clases/data.ts:221`** repite a mano "No tienes acceso a esta clase.".
  - Es anterior a ENTREGAS (está igual en `dd8edcb`) y `features/clases` está en "No se toca" para 01a, salvo la línea de `sinTema`.
  - La regla de O-2 de TAREAS-01d solo nombraba `features/tareas`.
  - Destino sugerido: carril trivial.
- **O-r1-2 — El formulario de edición puede nacer de la tarea en caché mientras su recarga está en vuelo.**
  - Ejemplo: mover la tarea en "Trabajo de clase" invalida `claveTarea`, pero sin observador activo no la vuelve a pedir; al abrir "Editar" se pinta lo que hay en caché y la recarga corre de fondo.
  - En ese caso la versión de apertura es la vieja y el guardado recibe `409`, aunque quien movió fue la misma persona, y con P-05 (a′) lo escrito se descarta.
  - Es coherente con §D-8.2 ("se edita sobre la versión con que se abrió"), y la ventana es corta: el detalle intermedio ya recarga la tarea.
  - Lo anoto para el humano por si quiere que la edición espere una lectura fresca. No lo marco como hallazgo porque el plan aprobado no lo pide.
- **O-r1-3 — `PUT` sin `requiereAdjuntos`:** vuelve a `true` (por `.default(true)`, que `editarTareaSchema` hereda de `crearTareaSchema`). Es la misma semántica de "cuerpo completo" de `aceptaTardias`, `categoriaId`, `temaId` y `rubrica`, y el formulario siempre lo envía.

## No atacado y por qué
- **T-r1-5 (opcional), la clave de foco sin avanzar el reloj:**
  - El manager ya lo arbitró como artefacto de las pruebas (`dataUpdatedAt` con `Date` falso).
  - No encontré un camino real en que la vista cambie sin que cambien `dataUpdatedAt`, el estado o el error.
  - Una prueba que reprodujera el foco en `<body>` con el reloj congelado fallaría sin demostrar un defecto de producción.
- **El desbordamiento de `tareas.version` en `2^31 − 1`** (el `increment` daría `22003`): haría falta más de dos mil millones de ediciones o movimientos, y el plan no lo pide. Cliente y servidor rechazan versiones fuera de rango antes de llegar a la base (T-r1-1).
- **Navegador, lector de pantalla y H-6:** quedan para la comprobación humana al final de 01e. Ningún agente abre navegadores.

## Corridas (una suite a la vez)
**Pruebas aisladas de mis archivos nuevos** (antes de las completas, sin otra suite corriendo):
- `npx vitest run test/tareas-01a-r1.ataque.test.ts` → `Tests  19 passed (19)`.
- `npx vitest run test/migracion-01a-r1.ataque.test.ts` → `Tests  28 passed (28)`.
- `npx vitest run src/features/tareas/tareas-01a-r1.ataque.test.tsx` → `Tests  6 passed (6)`.

**Backend:**
- **lint:** `cd backend; npm run lint > <scratchpad>/r1-lint-back.txt 2>&1`, código 0. Prettier dice "All matched files use Prettier code style!". Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `cd backend; npm test > <scratchpad>/r1-test-back.txt 2>&1`, de 05:05:06Z a 05:06:50Z, código 0. Última línea: `Test Files  177 passed (177)` · `Tests  2233 passed (2233)` · `Duration  99.34s (transform 11.16s, setup 4.96s, import 181.97s, tests 772.07s, environment 44ms)`.
- **Conteo:** 2186 del programador más 47 míos (19 + 28), y 175 archivos más 2.

**Frontend**, después del backend:
- **lint:** `cd frontend; npm run lint > <scratchpad>/r1-lint-front.txt 2>&1`, código 0. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test > <scratchpad>/r1-test-front.txt 2>&1`, de 05:07:46Z a 05:09:18Z, código 0. Última línea: `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  89.14s (transform 18.14s, setup 59.78s, import 186.01s, tests 390.06s, environment 278.33s)`.
- **Conteo:** 2265 más 6, y 152 archivos más 1.

**Resultado:** ningún rojo, tiempo límite ni intermitencia; PA-12 no aplica.

## PA-07
**Fuente:** `<scratchpad>/r1-test-back.txt`, la salida completa.
- Conté con `grep -a -o -F` y atribuí con `<scratchpad>/pa07-tester.mjs`: cada error va a la última "incoming request" con el mismo `pid` y el mismo `requestId`, proceso por proceso.
- Recreé el script con ese nombre porque mi `pa07.mjs` de la carpeta temporal compartida apareció sobrescrito por otro script.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` | 0 |

- **I-1, los 10 de siempre:**
  - 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "… al crear la sesión" (`pid` 12624, `intentos-r2`);
  - 3 `ZodError` en `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones` (`pid` 9324, `archivos-d-r2` T-39);
  - 1 `boom` de `GET /api/prueba/error-comun` (`pid` 24784, `salud.integracion`).
- **Control positivo: completo.** Los tres de `servicio-ocupado`, en el `pid` 22428 y con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`,** en el `pid` 15160: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **De mis carreras** (retenciones, ráfagas de editar, mover y borrar, y migración) no sale ningún error, ningún `P2028` ni ningún deadlock.
- **PA-07: limpia.**

## Tabla de SHA-256 de las 166 `*.ataque` al cierre de la ronda 1 de 01a (base de V-01 de la siguiente ronda o del cierre de 01a)
163 iguales a la tabla de la ronda 0 complementaria y 3 nuevas, marcadas. Ninguna cambió.

| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `B8451A764F1A8952A41D4EF49413C9B784F5E28F7607D2790388CF043041A9E8` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `D7FEF40E38A39E7489E3555E5A5ACCDDBED0314578BB02318049CFBC0DC48A24` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` | Nueva (ronda 1 de 01a) |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `6111F6BCAEC5FE2C825894B601DBE6C64BE4F765C3B5FC349F00A6F6A0D8CA1E` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` | Nueva (ronda 1 de 01a) |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `3311E1ADA07AA5F1252C6DA9099FD57F31D38DBDF51A67882E869D5A8D20D6A5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `BBCF8E18F6A573F2ECD295400B7687595BD6A725743E11D8ABF7880EA261D13A` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `D7649925CFB92555B68B952083C3EA7BC4C6348AB0212481A2F49F5A2FE17C34` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `1B6E87DB28FF213BC7F8585A58118AD156E46E516FD5BC8C9484AEBAF30308B5` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `323800F232BFF2326F90E55C682A968194F2BB6874B43F8069DACA09CFBC9E21` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` | Nueva (ronda 1 de 01a) |
| `23CA8E45D09D0AB087E7CC34C8E336CA5ABD731699219CDBABFB0BE7E29CE961` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `ED2948ADF746726D62823A12F6501B79B37FCA80C3B7622CC88FA779358A52C6` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |
