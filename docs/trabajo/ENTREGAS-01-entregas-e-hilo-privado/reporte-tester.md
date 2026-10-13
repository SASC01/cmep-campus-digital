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


# Reporte del Tester — ENTREGAS-01b — Ronda 0
Veredicto: **LISTA PARA IMPLEMENTAR.** No hay PARADAS.
Verificación propia:
- **backend:** lint con código 0; test con 4 rojos, los esperados (C-1, C-2, C-4 y C-9); PA-07 limpia.
- **frontend:** lint con código 0; test todo en verde.

Base de 01b dentro de los paquetes: `<K1a>` = `82888dd` (HEAD de `feat/entregas`). Antes de esta ronda, el árbol de `shared/`, `backend/` y `frontend/` estaba limpio: aún no hay código de 01b. `plan.md` con SHA-256 `ffc6fdd1171e746caa88e8bcf7af30775b429db2b9ffe890b73381b32ee2f3d3` (984 líneas, Enmiendas 1 a 4).

## PA-01 y precondiciones
- **Docker:** servidor y cliente **28.5.1**. Corren solo los tres contenedores de `infra/`, que no toqué.
- **La red cambió** respecto de la que verificó el orquestador en 01a: ahora es **`uacam5 2`**, Wi-Fi, `NetworkCategory : Public`, y es el único perfil activo.
- **La regla "Campus: bloquear entrada a Docker en redes publicas"** sigue `Enabled True`, `Inbound`, `Block`, perfil `Public`, sobre `com.docker.backend.exe`.
- **Por qué seguí:** la mitigación de `AGENTS.md` cubre el perfil en que está clasificada esta red, así que corrí la suite. **Lo anoto para el humano**, porque la red no es la de siempre: si `uacam5 2` debiera tratarse como no confiable aunque sea Pública, la corrida ya ocurrió bajo la regla de bloqueo.
- **`shared/dist`:** `cd shared; npm run build` → `> tsc -p tsconfig.json`, código 0.
- No abrí navegadores ni terminé procesos.

## V-01 — 166/166
Comparé con la tabla de la ronda 1 de 01a (las 166 `*.ataque`) sobre `82888dd`, antes de reescribir nada: **166 coinciden, 0 faltantes, 0 sobrantes** (`diff` vacío).

## Inventario de §D-R0 para 01b (Enmienda 1, M-01)
### Contratos que cambian en 01b y quién los usa
| Contrato | Quién lo usa | 01b |
|---|---|---|
| 8 rutas nuevas (inventario de `printRoutes`) | `sesiones-y-cadena.ataque:527` | **C-1** |
| `instantaneaUnica: true` en `adapters/db/entregas.ts` (3) | `lecturas-fx-r1.ataque:758` | **C-2** |
| `handlers/tareas/entregas.ts` nuevo | `temas-01a-r3.ataque:440` (lista cerrada; `.rol`, `relacion ===`) y `temas-01a-r1.ataque:978` (lista cerrada, `prohibido`, `encolar(`) | **C-4** y **C-9** |
| `FOR KEY SHARE` en `adapters/db/entregas.ts` (`bloquearTareaParaEntregar`) | `temas-01a-r1.ataque:978` | **C-9** |
| `encolar(` (`ENTREGA_REALIZADA`) en `handlers/tareas/entregas.ts`; `cancelar(` sigue solo en `tareas.ts` | `temas-01a-r1.ataque:978` | **C-9** (3a y 3b) |
| `COLA_ENTREGA_REALIZADA` / `ENTREGA_REALIZADA` | `muro-c-r1.ataque:625` solo vigila `PUBLICACION_CREADA`, `MATERIAL_CREADO`, `COMENTARIO_CREADO` y `AVISO_FALLIDO`. Ninguna prueba enumera `OPCIONES_DE_COLAS` ni lee `pgboss.queue` (busqué en `backend/test` y `backend/src`). `tareas-01b-r1:773` busca los trabajos con `data ->> 'tareaId'` de una tarea sin entregas | No rompe |
| `elementoDeTrabajoSchema` exige `entrega` | Frontend `*.ataque`: los dobles `material()` de `trabajo-01e-r1`, `trabajo-01e-r2` y `ver-mas-01e-r3` (solo materiales; ningún doble de elemento de tipo tarea). `tarjeta-01d-r1/r2` son publicaciones del muro (`Publicacion`), no de "Trabajo de clase". Backend: `instantanea-01b-r1`, `referencias-01b-r1` y `tareas-01b-r1` hacen `parse` de respuestas reales, que traerán `entrega`; ninguna compara un elemento completo ni lista sus llaves (las `PROHIBIDAS` de `tareas-01b-r1:628` no incluyen `entrega` ni `estado`) | **C-10** (3 archivos) |
| `listarTrabajo` con `alumnoId` opcional | `instantanea-01b-r1:390`, `:474` y `:488` (`*.ataque`); `lecturas-consistentes.integracion` (normal) | No rompe, por diseño (fila "Diseño" de §D-R0) |
| `borrarTarea` con `confirmarEntregas` opcional | Ninguna `*.ataque` la llama; `tareas.integracion.test.ts:809` (normal) | No rompe, por diseño |
| `DELETE …/tareas/:tareaId` con `borrarTareaQuerySchema` estricto | Ninguna `*.ataque` ni normal manda consulta a ese `DELETE` (busqué `?` en las URL de `DELETE` y en `urlTarea(…)`) | No rompe |
| `buscarArchivosParaConfirmar` con `prefijo` obligatorio y `entregaId: null` | Ninguna `*.ataque` la llama; `archivos.integracion.test.ts:441` (normal, en la lista cerrada). Todas las `*.ataque` crean archivos con `crearArchivoDePrueba` (clave `materiales/{claseId}/{id}`) o por la API; la única clave a mano (`archivos-d-r1:628`, `"../../otra"`) se ignora y la prueba exige la clave de materiales | No rompe |
| `buscarArchivoConfirmado` solo de publicaciones | Ninguna `*.ataque` descarga un archivo confirmado sin publicación (no podía existir antes de 01a) | No rompe |
| `archivosParaPublicar` como envoltorio de `archivosParaConfirmar` | Ninguna prueba lo nombra | No rompe |
| `exigirBorradoConEntregasPermitido` / `mensajeTareaConEntregas` en `core/tareas/tareas.ts` (archivo existente) | `temas-01a-r3:440` ya lista `core/tareas/tareas.ts`; si el nuevo código usa `console.` o nombra `estadoPago`, cae. No compara roles fuera de `core/` | No rompe (`core/` puede comparar el rol, la regla solo mira lo que no es `core/`) |

### Listas estáticas que siguen intactas en 01b (cuidados para el programador)
- **`lecturas-fx-r2:966` (O-4):** solo se borran `categoria`, `comentario`, `criterioRubrica`, `inscripcion`, `maestroDeClase`, `publicacion` y `tema`, sin `DELETE FROM` ni `TRUNCATE`. 01b borra entregas e hilos por la cascada de `publicaciones` (§D-3.8, paso 5). **Un `tx.entrega.delete(…)` o un `deleteMany` explícito lo rompería**, y sería PA-03 del programador.
- **`lecturas-fx-r1:758` (C-2):**
  - En `entregas.ts` deben ser exactamente 3 literales `instantaneaUnica: true`, incluidos los comentarios (O-2).
  - En `tareas.ts` siguen 2, sin mención en comentarios, aunque `listarTrabajo` sume su consulta de entregas.
- **`instantanea-01b-r1:537`:**
  - `borrarTarea` y `editarTarea` sin `instantaneaUnica`;
  - `listarTrabajoCon` sin escrituras, bloqueos ni `$queryRaw`;
  - **la consulta nueva de entregas debe ir con Prisma** (`entrega.findMany`), como dice §D-3.11.
- **`temas-01a-r3:426` y `arquitectura-cuentas-r1:69`:** `$queryRawUnsafe` solo en `cliente.ts`.
- **`temas-01a-r1:978` (regla `prohibido`, que no cambia):**
  - `handlers/tareas/entregas.ts` no puede tener `$queryRaw`, `$executeRaw`, `obtenerDb`, `adapters/db/cliente`, `@prisma`, `.rol`, `"admin" ===`, `=== "…"` ni `notifier`;
  - debe usar `alumnoDeLaRelacion` y `perfilDe(request).id`.
- **`temas-01a-r3:440`:**
  - en `handlers/tareas/*`, nada de `console.`, `estadoPago`, `.rol` ni `relacion ===`;
  - `core/entregas/` no está entre los prefijos de esa lista, así que no hace falta sumarlo.
- **Mis `*.ataque` de 01a:** sus reglas estáticas miran `moverATema` y `editarTarea`, que 01b no toca. Las de llaves miran `tareaDetalleSchema`, que tampoco cambia. Si 01b toca alguna de esas funciones, la reviso en la ronda 1.

**Resultado:** rompen exactamente C-1, C-2, C-4 y C-9 de la tabla de §D-R0 (la parte de 01b) y los dobles de "Trabajo de clase" de la viñeta "01b" (C-10). No apliqué la parte de 01c de C-1, C-2, C-3, C-4 ni C-9. **No encontré ninguna otra `*.ataque` que 01b rompa**, así que no hay PA-02.

## Reescrituras (A-4)
Cambio mínimo, con un comentario "ENTREGAS-01b ronda 0 (C-n, …)" en cada sitio. No cambié ninguna aserción salvo lo que fija cada C-n. Formateé solo esos archivos con `npx prettier --write <archivo>`, dentro de su paquete.

| C-n | Archivo › caso | Cambio |
|---|---|---|
| **C-1** | `backend/test/sesiones-y-cadena.ataque.test.ts` › "bajo /api solo existen las rutas de … TAREAS-01b y ENTREGAS-01b: …" | La lista exacta pasa de 79 a **90** entradas (comprobé por script que quedan ordenadas como `.sort()` y sin repetidos). Entran las 8 rutas de "Autorización" con sus métodos, más el `HEAD` de los 3 `GET` (O-1 de la Enmienda 1): `GET`, `HEAD` y `POST` de `…/tareas/:tareaId/entrega`; `POST` de `…/entrega/anular`, de `…/entrega/archivos` y de `…/entrega/archivos/:archivoId/descarga`; `GET` y `HEAD` de `…/entregas` y de `…/entregas/:alumnoId`; `POST` de `…/entregas/:alumnoId/archivos/:archivoId/descarga`. `?confirmar=entregas` no suma nada. El título suma "ENTREGAS-01b". |
| **C-2** | `backend/test/lecturas-fx-r1.ataque.test.ts` › "la opción solo se puede activar dentro de adapters/db: … las once lecturas (cuatro de clases, dos del muro, dos de tareas y tres de entregas)" | La lista de usos suma `"adapters/db/entregas.ts:3"`. El título pasa de "ocho" a "once" lecturas. Lo demás no cambia (literal contado con sus comentarios, O-2). |
| **C-4** | `backend/test/temas-01a-r3.ataque.test.ts` › "ningún archivo nuevo de 01a ni de 01b usa console., menciona estadoPago o compara un rol a mano; …" | La lista cerrada suma `"handlers/tareas/entregas.ts"`. Las reglas de `console.`, `estadoPago`, `.rol` y `relacion ===` no cambian. |
| **C-9** | `backend/test/temas-01a-r1.ataque.test.ts` › nuevo título "FOR KEY SHARE solo en adapters/db/referencias.ts y entregas.ts; bloquearClase se define solo en bloqueo-clase.ts; los handlers de tareas no usan SQL, Prisma, roles ni notifier; los de temas y categorías no encolan y solo tareas.ts cancela" | Según "C-9: cambio por regla", solo la parte de 01b. **(1)** La lista de `FOR KEY SHARE`, ordenada, es `["adapters/db/entregas.ts", "adapters/db/referencias.ts"]`. **(2)** `handlers/tareas/` suma `entregas.ts`, y `prohibido` no cambia. **(3a)** `encolar(`/`cancelar(` se prohíben fuera de `tareas.ts` y `entregas.ts`. **(3b)** Nuevo: `cancelar(` solo en `tareas.ts`. `bloquearClase` y el conteo de fuentes no cambian. |
| **C-10** | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx`, `trabajo-01e-r2.ataque.test.tsx` y `ver-mas-01e-r3.ataque.test.tsx` (ancla: viñeta "01b" de §D-R0, "`elementoDeTrabajoSchema` exige `entrega` (dobles de 'Trabajo de clase' del frontend)") | Cada doble `material()` suma `entrega: null` (un material siempre lleva `entrega` nula, §D-3.2). Ninguna aserción cambia. Hoy pasan, porque `elementoDeTrabajoSchema` es `z.object` y descarta la llave. |

**Total:** 7 archivos (4 del backend y 3 del frontend).

## Rojos esperados (lista cerrada, de esta ronda a la entrega del programador)
| Prueba | Hoy (`82888dd` + C-1, C-2, C-4, C-9 y C-10) | Falla porque | Vuelve a verde cuando |
|---|---|---|---|
| C-1 `sesiones-y-cadena` › "bajo /api solo existen las rutas de … y ENTREGAS-01b: …" | **Roja** | Faltan exactamente las 11 entradas nuevas: la salida muestra solo esas 11 líneas con `-` y ninguna de más | `app.ts` registre `entregasHandler` con las 8 rutas (paso 7 de 01b) |
| C-2 `lecturas-fx-r1` › "la opción solo se puede activar dentro de adapters/db: … once lecturas …" | **Roja** | Falta solo `"adapters/db/entregas.ts:3"` | Exista `adapters/db/entregas.ts` con sus 3 lecturas (paso 6) |
| C-4 `temas-01a-r3` › "ningún archivo nuevo de 01a ni de 01b usa console., …" | **Roja** | Falta solo `"handlers/tareas/entregas.ts"` | Exista el handler (paso 7) |
| C-9 `temas-01a-r1` › "FOR KEY SHARE solo en adapters/db/referencias.ts y entregas.ts; …" | **Roja** | Falta solo `"adapters/db/entregas.ts"` en la lista de `FOR KEY SHARE`; la regla 2 también caerá hasta que exista el handler (O-2 de la revisión de la Enmienda 3) | Existan `adapters/db/entregas.ts` (paso 6) y `handlers/tareas/entregas.ts` (paso 7) |
| C-10 (3 archivos del frontend) | Verdes | — | Ya lo están; deben seguir verdes cuando `elementoDeTrabajoSchema` exija `entrega` |
| Normales de la lista cerrada (ver I-2) | Verdes | — | Rojas mientras el programador no las ajuste; verdes en su entrega |

## Corridas (una suite a la vez)
**Backend:**
- **lint:** `cd backend; npm run lint > <scratchpad>/b0-lint-back.txt 2>&1`, código 0. Prettier dice "All matched files use Prettier code style!". Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `cd backend; npm test > <scratchpad>/b0-test-back.txt 2>&1`, de 13:54:42Z a 13:59:44Z, código 1.
  - Resumen: `Test Files  4 failed | 173 passed (177)` · `Tests  4 failed | 2229 passed (2233)` · `Duration  283.84s (transform 36.73s, setup 8.15s, import 390.83s, tests 1586.24s, environment 84ms)`.
  - Los 4 rojos son exactamente C-1, C-2, C-4 y C-9, y cada uno falla solo por lo que 01b todavía no crea.
  - Ningún otro rojo, tiempo límite ni intermitencia; PA-12 no aplica.
  - La duración es mayor que en la ronda 1 de 01a (99 s), sin tiempos límite.

**Frontend**, después del backend:
- **lint:** `cd frontend; npm run lint > <scratchpad>/b0-lint-front.txt 2>&1`, código 0. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test > <scratchpad>/b0-test-front.txt 2>&1`, de 14:01:19Z a 14:05:24Z, código 0. Última línea: `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  236.92s (transform 49.00s, setup 210.94s, import 477.18s, tests 912.81s, environment 879.34s)`.

## PA-07
**Fuente:** `<scratchpad>/b0-test-back.txt`. Conté con `grep -a -o -F` y atribuí con `<scratchpad>/pa07-tester.mjs` (último "incoming request" con el mismo `pid` y el mismo `requestId`).

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
  - 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "… al crear la sesión" (`pid` 26676);
  - 3 `ZodError` en `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones` (`pid` 23856);
  - 1 `boom` de `GET /api/prueba/error-comun` (`pid` 5152).
- **Control positivo: completo.** Los tres de `servicio-ocupado`, en el `pid` 19228 y con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`,** en el `pid` 988: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **PA-07: limpia.**

### I-2: listas cerradas de pruebas normales que el programador deberá ampliar en 01b
Todas están ya en su lista cerrada: ninguna es aviso ni PARADA.
- **`backend/test/bloqueo-usuario.integracion.test.ts` › "E6: …":**
  - suma `"entregas.ts"` entre `"enlaces-registro.ts"` e `"invitaciones.ts"`;
  - el título nuevo es "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts, publicaciones.ts, referencias.ts, temas.ts, categorias.ts, tareas.ts y entregas.ts usan SQL etiquetado en adapters/db";
  - y una frase en el comentario de `:677-684`.
- **`backend/test/archivos.integracion.test.ts:441`:** `prefijo: prefijoDeMateriales(claseId)`.
- **`backend/test/lecturas-consistentes.integracion.test.ts`:** solo si el compilador pidiera `alumnoId` (no debería).
- **`backend/test/tareas.integracion.test.ts:809`:** `borrarTarea` sin `confirmarEntregas` no cambia (Diseño).
- **Dobles de "Trabajo de clase" de las normales del frontend** (suman `entrega`): solo `frontend/src/features/clases/trabajo-view.test.tsx`. No hay otra prueba normal con `puedeMover`, `ElementoDeTrabajo` ni `listaTrabajoRespuesta` en el frontend. En el backend, `trabajo.integracion.test.ts` hace `parse` de respuestas reales y no compara elementos completos.
- **Otras listas normales:** ninguna. `cola.integracion` solo mira las dos colas de correo, ninguna prueba enumera `OPCIONES_DE_COLAS` y `core/eventos/avisos-de-clase.test.ts` no lista colas.

## Observaciones para el programador y para mi ronda 1 de 01b (no aplicadas)
- **PR-1B09 bis (O-3 de la Enmienda 1):**
  - cada orden se lanza en un orden fijo: la primera operación, la espera con `formadasDetrasDe` hasta que esté formada detrás de la fila de `entregas` retenida, y solo entonces la segunda;
  - el caso (b) parte de una fila existente en `asignado` (por ejemplo, tras una anulación), porque sin fila no hay nada que retener;
  - ayuda local con `timeout` explícito, porque `ayudas-concurrencia.ts` es de "No se toca".
- **PR-1B04 y PR-1B28 (O-1 de la Enmienda 2):** van en `backend/test/` (`esquemas-entregas.test.ts`, nuevo, y `esquemas-tareas.test.ts`), sin tocar `shared/package.json`.
- **PR-1B22 bis (O-3 de la Enmienda 2):** debe incluir la carrera "un comentario retiene la tarea y deja una fila `asignado`; después llega el borrado del maestro sin parámetro, espera y responde `204`, y el hilo se borra". En 01b el comentario del hilo todavía no existe por la API, así que esa carrera (c) es de 01c; en 01b queda con una entrega anulada (fila `asignado`).
- **`FOR KEY SHARE` una sola vez en `entregas.ts` (O-2 de la Enmienda 3):** C-9 no lo mide. En la ronda 1 compruebo por texto fuente que aparece una sola vez, dentro de `bloquearTareaParaEntregar`, y que `entregar` y `anularEntrega` la usan.
- **Para mi ronda 1:**
  - la lectura cruzada de archivos por las tres rutas y la de la clase (PR-1B17 primero en rojo);
  - fugas de `estadoPago`, `email` y `deudor` en todas las respuestas nuevas, también en errores;
  - carreras de entregar y anular, de entregar y cambiar la fecha o `aceptaTardias`, y de entregar y borrar;
  - la frontera de la fecha límite;
  - enlaces (`JaVaScRiPt:`, espacios, usuario y contraseña, inversores, 2048 y 2049 caracteres, solo `https://`);
  - subidas a una tarea cerrada y reutilizar el id de un archivo descartado;
  - borrar con `?confirmar=entregas` en todas sus formas (`?confirmar=entregas&confirmar=entregas`, mayúsculas, vacío);
  - `listarEntregas` con alumnos dados de baja o desactivados;
  - que `ENTREGA_REALIZADA` lleve solo ids.

## No atacado y por qué
- No hay código de 01b: los ataques de "Puntos de ataque → 01b" son de la ronda 1.

## Tabla de SHA-256 de las 166 `*.ataque` al cierre de la ronda 0 de 01b (base de V-01 del programador y del manager en 01b)
159 iguales a la tabla de la ronda 1 de 01a y 7 reescritas, marcadas: C-1, C-2, C-4 y C-9 en el backend, y C-10 en 3 archivos del frontend. Ninguna nueva ni borrada.

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
| `8C1E50E8EE98319764AEC8B91ADF02FFD408E08C9CF1A34C1157FC8C5E2E2B67` | `backend/test/lecturas-fx-r1.ataque.test.ts` | Reescrita (C-2) |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `B8B6CECB19E74DD1C0FE40DFC996488ADAEEB3EC9DA401E3E4CEC8C15991D936` | `backend/test/sesiones-y-cadena.ataque.test.ts` | Reescrita (C-1) |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `88A5F57D298C8649160F858A5B42A016C83A1DED5F0301542EA95D95EF6301C5` | `backend/test/temas-01a-r1.ataque.test.ts` | Reescrita (C-9) |
| `F8B1A2781EAC50F89E8DE833DA4CFC70EF5033640EF8CDAE4AAE6DD03F917AA0` | `backend/test/temas-01a-r3.ataque.test.ts` | Reescrita (C-4) |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` | Reescrita (C-10) |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` | Reescrita (C-10) |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` | Reescrita (C-10) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
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


# Reporte del Tester — ENTREGAS-01b — Ronda 1
Veredicto: **ROTO** (1 hallazgo, de severidad media).
Verificación propia:
- **backend:** lint con código 0; test con 1 rojo, T-01.
- **frontend:** lint con código 0; test todo en verde.
- **PA-07:** limpia (I-1 = 10).

Base: la implementación de 01b sin commit sobre `82888dd` (`resumen-programador.md`, aceptado por el manager en `revision.md`, "Verificación del resumen — ENTREGAS-01b — implementación"). PA-01 la resolvió el humano para hoy: la red `uacam5 2` se declaró de confianza.

## Regresión y V-01
- **V-01 al empezar:** 166/166 iguales a la tabla de la ronda 0 de 01b, sin faltantes ni sobrantes.
- **Mis pruebas previas pasan en las corridas completas:**
  - C-1, C-2, C-4, C-9 y C-10 ya están en verde con la implementación;
  - siguen en verde las de 01a: C-6, C-7, C-8, `tareas-01a-r1`, `migracion-01a-r1` y el frontend `tareas-01a-r1`.
- No hay regresiones.

## Hallazgos
### T-01 — Un enlace aceptado se guarda y se devuelve con hasta 18 280 caracteres (el tope documentado es 2048)
Severidad: **media**.

Prueba: `backend/test/entregas-01b-r1.ataque.test.ts` › "ataque ENTREGAS-01b r1: enlaces de la entrega (S-08)" › "T-r1-2 (N-02): un enlace aceptado nunca se guarda ni se devuelve con más de LONGITUD_MAXIMA_ENLACE (2048) caracteres, aunque la normalización lo alargue (ñ, espacios, inversores)".

**Esperado:** una entrada de 2048 caracteres que la normalización alarga responde `400 VALIDACION`, o se guarda y se devuelve con 2048 caracteres o menos.

**Obtenido:** `POST …/entrega` responde `200`, y lo guardado mide lo mismo en la respuesta del alumno, en la fila de `entregas` y en `GET …/entregas/:alumnoId`:
| Entrada (2048 caracteres) | Largo guardado y devuelto |
|---|---|
| `https://ejemplo.mx/` + `ñ` | **12 193** |
| `https://ejemplo.mx/a` + espacios + `b` | **6 102** |
| `https://ejemplo.mx/` + U+202E (inversor) | **18 280** |

**Causa (lectura del código):** `enlaceDeEntregaSchema` (`shared/src/entregas.ts`) aplica `.max(LONGITUD_MAXIMA_ENLACE)` antes del `.transform((texto) => new URL(texto).href)`, y `new URL()` codifica cada carácter no ASCII o de control como `%XX` (de 3 a 9 caracteres por carácter). `urlDeEntregaRespuestaSchema` no tiene tope, así que tampoco lo detecta al leer.

**Consecuencia:**
- Con 5 enlaces, una entrega puede guardar unos 90 000 caracteres de enlaces.
- La lista de 01d los pinta "con su texto completo" (§D-9.5).
- Una validación que confíe en `LONGITUD_MAXIMA_ENLACE` para lo que viene del servidor se equivoca.

**Requisito o regla:**
- §D-3.2 y S-08 del plan ("hasta 2048 caracteres", `LONGITUD_MAXIMA_ENLACE = 2048`; "se guardan normalizados");
- N-02 de la "Verificación del resumen — ENTREGAS-01b". El manager lo dejó como ambigüedad del plan y pidió atacarlo (T-r1-2).
- El dato guardado incumple el tope documentado.

**Remedio mínimo que propuso el manager (no lo aplico):** medir también el `href` (tope sobre el resultado de la transformación), con su prueba en `esquemas-entregas.test.ts`. No cambia el contrato de la API.

## *.ataque nuevas
| Archivo | Casos | Qué ataca |
|---|---|---|
| `backend/test/entregas-01b-r1.ataque.test.ts` | 21 | Enlaces, lectura cruzada de archivos, mayúsculas en los prefijos, orden de errores en las descargas, fugas y restricción, carreras, subidas, "Trabajo de clase", la lista del maestro, §D-3.8, el 503 por HTTP y la revisión estática |

La app de ese archivo registra en nivel `error`, como `servicio-ocupado-ch-r1`: el `P2028` del 503 (nivel `warn`) no entra en PA-07, y un "Error no controlado" sí saldría.

## Atacado sin hallazgos
- **Enlaces (S-08):**
  - `javascript:`, `JaVaScRiPt:`, con espacios delante, `data:`, `file:`, `ftp:`, sin protocolo, `https://usuario:clave@…`, `https://usuario@…`, `https://` solo, vacío, solo espacios, un número, `null` y 2049 caracteres responden `400 VALIDACION`, sin fila ni trabajo.
  - Lo aceptado se normaliza: recorta los espacios, pasa el esquema y el servidor a minúsculas y codifica el inversor de dirección (`%E2%80%AE`), igual en la respuesta y en la base.
- **Lectura cruzada:**
  - el archivo de la entrega de Ana por la descarga de la clase da `404` para Beto, para Ana, para el maestro y para el admin;
  - por la ruta del alumno, Beto recibe `404`;
  - por la del maestro con el `:alumnoId` de Beto, `404`, para el maestro y para el admin;
  - el maestro ajeno recibe `403 SIN_ACCESO_A_LA_CLASE` y la alumna por la ruta del maestro, `403 ROL_NO_PERMITIDO`;
  - **ningún rechazo firmó una descarga** (contador del doble);
  - con el `:alumnoId` correcto, maestro y admin reciben `200`, y Ana por su ruta, también.
- **Confirmación cruzada:** no entran en una entrega (`400` sin escribir) el archivo subido para otra tarea, el de otro alumno, un material pendiente del maestro y el id de un archivo descartado al anular. Los pendientes siguen pendientes y la entrega sigue `asignado`.
- **T-r1-3, mayúsculas:**
  - un material subido con el `:claseId` en mayúsculas se publica por la ruta en minúsculas, y al revés; los dos quedan `confirmado`;
  - un archivo de entrega subido con el `:tareaId` en mayúsculas guarda la clave en minúsculas y se entrega con su id en mayúsculas.
- **T-r1-4, orden de errores:**
  - una tarea de otra clase con un archivo válido da `404 TAREA_NO_ENCONTRADA`, por la ruta del alumno y por la del maestro;
  - un alumno dado de baja, uno desactivado o un maestro como `:alumnoId` dan `404 ALUMNO_NO_ENCONTRADO`, en la descarga y en `GET …/entregas/:alumnoId`;
  - ningún caso firma nada.
- **RN-02 y fugas,** con alumnos deudores: ninguna respuesta lleva `estadoPago`, `fechaEstadoPago`, `accesoRestringido`, `motivoRestriccion`, `email`, `rol`, `claveObjeto`, `hashContrasena`, "deudor", "al_corriente" ni `@`. Revisé 21 respuestas:
  - entregar dos veces, ver la suya, descargar y subir ya entregada;
  - lista, entrega propia, entrega ajena, descarga, no inscrito, trabajo y `DELETE` con `409`, para maestro y admin;
  - trabajo de la alumna, anular y anular otra vez.

  La alumna nunca recibe `version`.
- **Alumna restringida:** `403 ACCESO_RESTRINGIDO` en las cinco rutas de la entrega, sin revelar el motivo, sin fila, archivo, firma ni trabajo.
- **Carreras:**
  - **anular mientras la entrega pasa a `calificado`** (puesta a mano dentro de la retenedora de la fila de `entregas`): `409 ENTREGA_CALIFICADA`, y los archivos, los enlaces y la versión no cambian;
  - **entregar mientras la tarea pasa a vencida y sin tardías** (con la fila de `tareas` retenida): la entrega espera y responde `409 ENTREGA_CERRADA`, sin fila ni trabajo;
  - **entregar mientras pasa a aceptar tardías:** entra con retraso;
  - **cinco entregas simultáneas de la misma alumna:** un `200` y cuatro `409 ENTREGA_YA_REALIZADA`, un trabajo, versión 1 y solo el archivo de la ganadora confirmado;
  - la entrega contra el borrado, y la entrega contra la anulación, ya las cubren PR-1B22 bis y PR-1B09 bis.
- **Subidas (S-10):**
  - a una tarea cerrada, ya entregada o calificada: `409` con su código, sin fila ni firma;
  - tras anular se puede volver a subir, y lo subido antes de anular (pendiente, nunca entregado) se puede entregar; la versión sigue 1, 2 y 3.
- **"Trabajo de clase":** cada alumna ve solo su entrega (Ana la suya en `t1` y `null` en `t2`; Beto al revés), y el maestro y el admin reciben `null` en todas. El N+1 lo cubre PR-1B23 y lo confirmé en el código: un solo `entrega.findMany` por página.
- **Lista del maestro:**
  - la alumna desactivada y el alumno dado de baja con entrega no aparecen ni cuentan (`total` 1 y `entregadas` 0);
  - un cursor de un maestro o del admin no da `500` (N-04 lo acepta);
  - un cursor inexistente da `400 VALIDACION`.
- **§D-3.8:**
  - **consultas raras dan `400 VALIDACION` para maestro y admin, sin cambiar nada** (foto de la tarea, la publicación, los criterios, las entregas, los archivos y `pgboss.job`): `ENTREGAS`, `1`, `true`, vacía, repetida, con espacio, con `%00`, con una llave de más, `CONFIRMAR=` y `confirmar[]=`;
  - **el maestro con el parámetro** recibe `409` con el mensaje exacto en plural (2 entregas, una de ellas `calificado`), y la foto no cambia;
  - **el admin sin el parámetro** recibe el `409` en singular, con el texto exacto;
  - **el admin con el parámetro** recibe `204`, sin `500` ni `P2003`: no queda la tarea, la publicación, los criterios, las entregas (incluida la `asignado`) ni el hilo; el archivo confirmado queda `descartado` sin contexto; el pendiente sigue pendiente; entregar después da `404`.
- **T-r1-1, PR-1B26 por HTTP:** con la fila de `entregas` retenida 5,5 s, `POST …/entrega` responde `503 SERVICIO_OCUPADO`, la entrega sigue `asignado` con su versión y sin enlaces, y no hay `ENTREGA_REALIZADA`.
- **T-r1-5, el universo de la lista frente al detalle:** no se puede alcanzar por la API.
  - Solo `POST /clases/unirse` (`roles: ["estudiante"]`) y `agregarAlumnoManual` (`where: { rol: "estudiante" }`) crean inscripciones.
  - Ningún adaptador cambia el `rol` de un usuario.
  - La diferencia de filtros entre `listarEntregas` (sin rol) y `alumnoInscrito` (con `rol: "estudiante"`) solo se vería con datos puestos a mano. No es hallazgo; anoto que, si llega la gestión de usuarios con cambio de rol, hay que revisarla.
- **O-2 de la Enmienda 3:** `FOR KEY SHARE` aparece una sola vez en el código de `adapters/db/entregas.ts`, dentro de `bloquearTareaParaEntregar`, y la usan `entregar` y `anularEntrega`.
- **Revisión estática:**
  - `adapters/db` (`entregas.ts`, `tareas.ts`, `archivos.ts` e `inscripciones.ts`) no importa `adapters/queue`;
  - `handlers/tareas/entregas.ts` no tiene `relacion ===`, `.rol`, roles comparados, `$queryRaw`, `$executeRaw`, `obtenerDb` ni `@prisma`;
  - `entregas.ts` no usa `Unsafe` ni consultas dentro de ciclos;
  - las 7 respuestas nuevas de `shared/src/entregas.ts` son `z.strictObject`;
  - las listas cerradas heredadas (`$queryRawUnsafe` solo en `cliente.ts`, Prisma solo en `adapters/`, C-4 y C-9) siguen verdes.

## Observaciones (no son hallazgos)
- **O-b1-1 — Subidas pendientes sin tope por alumno:**
  - S-10 solo exige que la entrega esté abierta, así que una alumna puede pedir sin límite URL de subida de 25 MB para su entrega; los pendientes no cuentan contra los 5 por entrega.
  - Hasta `LIMPIEZA_DIARIA` (antes de DEPLOY), esos objetos se quedan en el almacén.
  - Pasaba igual con los materiales, pero hoy solo los suben maestros y el admin; desde 01b, cualquier alumno inscrito.
  - El plan no pide un tope (P-04 a habla de "5 archivos por entrega"). Lo anoto para DEPLOY o para el humano (costo de R2).
- **O-b1-2 — `entregadas` y `total` de la lista no filtran por rol,** mientras que `alumnoInscrito` sí lo hace (T-r1-5). Hoy es inalcanzable; ver arriba.

## No atacado y por qué
- **La frontera del milisegundo y los desfases distintos de `Z`:**
  - El plan la limita a `core/` (preámbulo de "Pruebas requeridas", Enmienda 1), y PR-1B01 la cubre con `ahora` explícito.
  - En integración usé márgenes de horas.
  - La API no recibe fechas en las rutas de entrega: la fecha límite llega por el `PUT` de la tarea, que ya atacaron TAREAS-01b (zonas y fracciones) y 01a.
- **El hilo privado:** es de 01c.
- **El navegador:** ningún punto de 01b lo exige.

## Corridas (una suite a la vez)
**Prueba aislada de mi archivo nuevo, antes de las completas:** `npx vitest run test/entregas-01b-r1.ataque.test.ts` → `Tests  1 failed | 20 passed (21)`. El único rojo es T-01.

**Backend:**
- **lint:** `cd backend; npm run lint > <scratchpad>/b1-lint-back.txt 2>&1`, código 0. Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `cd backend; npm test > <scratchpad>/b1-test-back.txt 2>&1`, de 15:44:49Z a 15:46:51Z, código 1.
  - Resumen: `Test Files  1 failed | 185 passed (186)` · `Tests  1 failed | 2368 passed (2369)` · `Duration  117.22s (transform 15.11s, setup 5.37s, import 200.29s, tests 939.61s, environment 56ms)`.
  - Conteo: 2348 del programador más mis 21.
  - El único rojo es T-01. No hubo intermitencias; PA-12 no aplica.

**Frontend**, después del backend:
- **lint:** `cd frontend; npm run lint > <scratchpad>/b1-lint-front.txt 2>&1`, código 0. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test > <scratchpad>/b1-test-front.txt 2>&1`, de 15:47:38Z a 15:50:01Z, código 0. Última línea: `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  137.85s (transform 30.04s, setup 112.72s, import 296.37s, tests 497.92s, environment 537.11s)`.

## PA-07
**Fuente:** `<scratchpad>/b1-test-back.txt`. Atribuí con `<scratchpad>/pa07-tester.mjs`.

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
  - 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "… al crear la sesión" (`pid` 11016);
  - 3 `ZodError` en `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones` (`pid` 24720);
  - 1 `boom` de `GET /api/prueba/error-comun` (`pid` 4952).
- **Control positivo: completo.** Los tres de `servicio-ocupado`, en el `pid` 4600 y con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`,** en el `pid` 9508: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Mis carreras y el 503 de T-r1-1** no dejan ninguna línea: la app registra en nivel `error`, y no hubo ningún error ni deadlock.
- **PA-07: limpia.**

## Tabla de SHA-256 de las 167 `*.ataque` al cierre de la ronda 1 de 01b (base de V-01 de la siguiente ronda)
166 iguales a la tabla de la ronda 0 de 01b y 1 nueva, marcada. Ninguna cambió.

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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` | Nueva (ronda 1 de 01b) |
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
| `8C1E50E8EE98319764AEC8B91ADF02FFD408E08C9CF1A34C1157FC8C5E2E2B67` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `B8B6CECB19E74DD1C0FE40DFC996488ADAEEB3EC9DA401E3E4CEC8C15991D936` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `88A5F57D298C8649160F858A5B42A016C83A1DED5F0301542EA95D95EF6301C5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `F8B1A2781EAC50F89E8DE833DA4CFC70EF5033640EF8CDAE4AAE6DD03F917AA0` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
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


# Reporte del Tester — ENTREGAS-01b — Ronda 2
Veredicto: **RESISTE** (0 hallazgos).
Verificación propia:
- **backend:** lint con código 0; test `Test Files  187 passed (187)` · `Tests  2378 passed (2378)`.
- **frontend:** lint con código 0; test `Test Files  153 passed (153)` · `Tests  2271 passed (2271)`.
- **PA-07:** limpia (I-1 = 10).

Base: la corrección de T-01 (`resumen-programador.md`, "ENTREGAS-01b — Corrección de la ronda 1 (T-01)"), aceptada por el manager (`revision.md`, línea 887). Sin commit, sobre `82888dd`.

## Regresión, V-01 y alcance del cambio
- **V-01 al empezar:** 167/167 iguales a la tabla de la ronda 1 de 01b.
- **Desde mi ronda 1 solo cambiaron** `shared/src/entregas.ts` y `backend/test/esquemas-entregas.test.ts`. Lo comprobé con `find … -newer` sobre `shared/src`, `backend/src`, `backend/test`, `backend/prisma` y `frontend/src`, contra mi reporte de la ronda 1.
- **El remedio:** `enlaceDeEntregaSchema` conserva el tope sobre el texto crudo (`.trim().min(1).max(2048)`) y suma `.pipe(z.string().max(LONGITUD_MAXIMA_ENLACE, MENSAJE_ENLACE))` después del `transform` a `URL.href`. Es lo mínimo que proponía N-02.
- **T-r1-2 (`entregas-01b-r1` › "T-r1-2 (N-02): …") ya pasa.** También pasan todas mis pruebas previas: las de 01a, C-1 a C-10 y los 21 casos de la ronda 1. No hay regresiones.

## Hallazgos
Ninguno.

## *.ataque nuevas
| Archivo | Casos | Qué ataca |
|---|---|---|
| `backend/test/entregas-01b-r2.ataque.test.ts` | 5 | T-r2-1 (la frontera 2048/2049 normalizada por HTTP y las formas inválidas de `enlaces`), T-r2-2 (enlaces ya codificados y otras formas válidas) y T-r2-3 (las lecturas con enlaces ya guardados) |

## Atacado sin hallazgos
- **T-r2-1, la frontera por `POST …/entrega`:**
  - un enlace que normalizado mide **2048** (338 `ñ` y relleno) responde `200` y se guarda y se devuelve igual;
  - uno de **2049** responde `400 VALIDACION` en cualquiera de las 5 posiciones de la lista, siempre con el mensaje `enlaces.<i>: Escribe un enlace…` en su posición;
  - en ningún caso queda fila de `entregas`, archivo confirmado ni `ENTREGA_REALIZADA`.
- **Formas inválidas de `enlaces`:** número, objeto, lista anidada, `null` dentro, booleano, cinco válidos y uno inválido (al final o al principio), seis válidos, un texto o `null` en lugar de la lista. Todas responden `400 VALIDACION` sin escribir nada.
- **T-r2-2, enlaces ya codificados:**
  - `%C3%B1` y `ñ` se guardan igual, sin doble codificación (ningún `%25`);
  - el tope se aplica al resultado en las dos formas: 2048 pasa y 2049 no, sin escribir;
  - `%c3%b1` en minúsculas se conserva tal cual (`URL.href` no cambia la capitalización de un `%XX`).
- **Otras formas válidas:** fragmento `#`, consulta `?a=1&b=2`, puerto `:8443`, IDN (`https://ñandú.mx/`, que pasa a punycode `xn--…`), y `+` y `%20` en la consulta. Se aceptan y se guardan como su `href`.
- **T-r2-3, las lecturas no se volvieron más estrictas:** fabriqué con SQL una entrega con un enlace de exactamente 2048 normalizados más uno corto, y otra con un enlace **anterior al remedio** (más de 2048, como los que dejó la ronda 1).
  - Responden `200` y devuelven los enlaces intactos: `GET …/entrega` (alumna), `GET …/entregas/:alumnoId` (maestro y admin), `GET …/entregas` (`entregadas` 1) y "Trabajo de clase" (su `entrega`).
  - `urlDeEntregaRespuestaSchema` no tiene tope, así que un dato viejo no rompe la lectura.
- **Revisión estática:** el cambio está acotado a `enlaceDeEntregaSchema`. El resto de `shared/src/entregas.ts` y del código de 01b no cambió desde la ronda 1, y las reglas estáticas de mis rondas anteriores siguen verdes.

## Observación (no es hallazgo)
- **O-b2-1 — capitalización:** un enlace con `%c3%b1` en minúsculas se guarda distinto de uno con `ñ` o con `%C3%B1`. Son URL equivalentes y S-08 solo pide guardar el `href`, así que no es defecto. Si en algún momento se comparan enlaces para quitar repetidos, habrá que normalizar la capitalización de los `%XX`.

## No atacado y por qué
- Lo de las rondas anteriores que no cambió (rutas, carreras, borrado, fugas): la regresión lo cubre al volver a correr mis pruebas, que siguen verdes.
- El navegador: no aplica.

## Corridas (una suite a la vez)
**Prueba aislada, antes de las completas:** `npx vitest run test/entregas-01b-r2.ataque.test.ts test/entregas-01b-r1.ataque.test.ts` → `Test Files  2 passed (2)` · `Tests  26 passed (26)`.

**Backend:**
- **lint:** `cd backend; npm run lint > <scratchpad>/b2-lint-back.txt 2>&1`, código 0. Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `cd backend; npm test > <scratchpad>/b2-test-back.txt 2>&1`, de 16:13:28Z a 16:16:01Z, código 0.
  - Última línea: `Test Files  187 passed (187)` · `Tests  2378 passed (2378)` · `Duration  148.02s (transform 15.89s, setup 6.85s, import 285.38s, tests 1141.64s, environment 70ms)`.
  - Conteo: 2373 del manager más mis 5 nuevos, y 186 archivos más 1.

**Frontend**, después del backend:
- **lint:** `cd frontend; npm run lint > <scratchpad>/b2-lint-front.txt 2>&1`, código 0. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test > <scratchpad>/b2-test-front.txt 2>&1`, de 16:16:56Z a 16:19:26Z, código 0. Última línea: `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  142.47s (transform 31.36s, setup 93.23s, import 291.30s, tests 632.66s, environment 437.40s)`.

**Resultado:** ningún rojo ni intermitencia; PA-12 no aplica.

## PA-07
**Fuente:** `<scratchpad>/b2-test-back.txt`. Atribuí con `<scratchpad>/pa07-tester.mjs`.

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
  - 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "… al crear la sesión" (`pid` 10500);
  - 3 `ZodError` en `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones` (`pid` 9152);
  - 1 `boom` de `GET /api/prueba/error-comun` (`pid` 16048).
- **Control positivo: completo.** Los tres de `servicio-ocupado`, en el `pid` 11608 y con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`,** en el `pid` 6288: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **PA-07: limpia.**

## Tabla de SHA-256 de las 168 `*.ataque` al cierre de la ronda 2 de 01b (base de V-01 del cierre de 01b)
167 iguales a la tabla de la ronda 1 de 01b y 1 nueva, marcada. Ninguna cambió.

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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` | Nueva (ronda 2 de 01b) |
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
| `8C1E50E8EE98319764AEC8B91ADF02FFD408E08C9CF1A34C1157FC8C5E2E2B67` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `B8B6CECB19E74DD1C0FE40DFC996488ADAEEB3EC9DA401E3E4CEC8C15991D936` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `88A5F57D298C8649160F858A5B42A016C83A1DED5F0301542EA95D95EF6301C5` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `F8B1A2781EAC50F89E8DE833DA4CFC70EF5033640EF8CDAE4AAE6DD03F917AA0` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
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


# Reporte del Tester — ENTREGAS-01c — Ronda 0
Veredicto: **LISTA PARA IMPLEMENTAR.** No hay PARADAS.
Verificación propia:
- **backend:** lint con código 0; test con 5 rojos, los esperados (C-1, C-2, C-3, C-4 y C-9 de 01c); PA-07 limpia.
- **frontend:** no lo toqué, así que no lo corrí.

Base de 01c dentro de los paquetes: `<K1b>` = `159cc7e` (HEAD de `feat/entregas`; el árbol de `shared/`, `backend/` y `frontend/` estaba limpio). `plan.md` con SHA-256 `ffc6fdd1…f3d3` (984 líneas). Aún no hay código de 01c.

## PA-01 y precondiciones
- **Docker:** servidor **28.5.1**.
- **Red:** `uacam5 2`, perfil `Public`, único perfil activo. Hoy el humano la declaró de confianza (`aprobacion.md`).
- **Firewall:** la regla "Campus: bloquear entrada a Docker en redes publicas" está `True`, `Inbound`, `Block`, `Public`. PA-01 cubierta.
- **`shared`:** `cd shared; npm run build` → `> tsc -p tsconfig.json`, código 0.
- No abrí navegadores ni terminé procesos.

## V-01 — 168/168
Comparé con la tabla de la ronda 2 de 01b sobre `159cc7e`, antes de reescribir nada: **168 coinciden, 0 faltantes, 0 sobrantes**.

## Inventario de §D-R0 para 01c
| Contrato o lista | Quién lo usa | 01c |
|---|---|---|
| 4 rutas nuevas del hilo, más 2 `HEAD` | `sesiones-y-cadena.ataque:537` | **C-1** |
| `instantaneaUnica: true` en `entregas.ts` pasa de 3 a 4 (`listarHiloPrivado`) | `lecturas-fx-r1.ataque:758` | **C-2** |
| `handlers/tareas/hilo-privado.ts` nombra `COLA_COMENTARIO_CREADO` | `muro-c-r1.ataque:625`. Lee el texto completo, **con comentarios**: hoy solo lo nombran `adapters/queue/colas.ts`, `core/eventos/avisos-de-clase.ts` y `handlers/clases/muro.ts` | **C-3** |
| `handlers/tareas/hilo-privado.ts` nuevo | `temas-01a-r3.ataque:440` (lista cerrada; `console.`, `estadoPago`, `.rol`, `relacion ===`) y `temas-01a-r1.ataque:978` (lista cerrada, `prohibido`, `encolar(` y `cancelar(`) | **C-4** y **C-9** (reglas 2 y 3a) |
| `FOR KEY SHARE` | `temas-01a-r1:978` regla 1 (`entregas.ts` y `referencias.ts`) y `entregas-01b-r1` › "O-2 de la Enmienda 3: FOR KEY SHARE aparece una sola vez …" | No cambia, **si `comentarEnHiloPrivado` reutiliza `bloquearTareaParaEntregar`** (§D-4 y C-9 lo prevén). Un segundo `FOR KEY SHARE` rompería las dos, y sería PARADA (lo dice el manager en "Para 01c"). |
| `datosComentarioCreadoSchema` pasa a ser la unión del muro y del hilo | `src/core/eventos/avisos-de-clase.test.ts` (normal): acepta la forma del muro y rechaza `texto` y `correo` de más. Con la unión de dos `z.strictObject` sigue igual. Ninguna `*.ataque` usa el esquema ni el tipo | No rompe |
| `comentarios.publicacion_id` nulo en las lecturas del muro | Ver el apartado siguiente | No rompe |
| `adapters/queue/colas.ts` | 01c no suma colas (reutiliza `COMENTARIO_CREADO`) | No cambia |
| SQL etiquetado en `adapters/db` (E6 de `bloqueo-usuario.integracion`) | El hilo vive en `entregas.ts`, que ya está en la lista | No cambia |
| `lecturas-fx-r2:918` (las lecturas del muro solo las llama `handlers/clases/muro.ts`) y `:966` (O-4, qué se borra) | 01c no llama a las lecturas del muro ni borra comentarios (S-04) | No rompe |
| `entregas-01b-r1` › "toda respuesta nueva de shared/src/entregas.ts es z.strictObject" (cuenta 7 por nombre) | Los esquemas del hilo (`comentarioPrivadoSchema`, `listaComentariosPrivadosRespuestaSchema`) no encajan en el patrón de nombres, así que el conteo sigue en 7 | No rompe, pero no los cubre: lo ataco en la ronda 1 |
| `tareas-01b-r1:773` (colas con `data ->> 'tareaId'`) | Los datos de `COMENTARIO_CREADO` del hilo son `{ comentarioId, entregaId, claseId }`, sin `tareaId` | No rompe |

### Las `*.ataque` del muro y los comentarios privados
Revisé `muro-c-r1/r2`, `admin-muro-02b-r1`, `autoria-02b-r1`, `gestion-02a-r1`, `cuerpos-02a-r2`, `lecturas-fx-r1/r2` y `logs-muro-c-r1/r2`. Todas cuentan o leen comentarios de tres maneras:
- por `publicacionId` concreto (`comentario.count({ where: { publicacionId } })`);
- por `id`;
- por la relación `publicacion: { claseId }` (`autoria-02b-r1:239`).

Un comentario privado tiene `publicacion_id` nulo, así que **no entra en ninguno de esos conteos**. El único conteo sin publicación (`autoria-02b-r1:604`) filtra por un autor creado en la propia prueba y un texto propio.

**No hay rotura posible en 01c, pero sí ataques para mi ronda 1:**
- el `comentarios` del muro en una tarea con hilos privados;
- `GET …/publicaciones/:publicacionId/comentarios` sobre la tarea;
- los dos `DELETE` del muro con el id de un comentario privado (PR-1C04 los pide; los repito por la API con la tarea, que es la publicación más cercana al hilo).

**Resultado del inventario:** rompen exactamente C-1, C-2, C-3, C-4 y C-9 (la parte de 01c). No encontré ninguna otra `*.ataque` que 01c rompa, así que no hay PA-02. **No hizo falta numerar C-11.**

## Reescrituras (A-4)
Cambio mínimo, con un comentario "ENTREGAS-01c ronda 0 (C-n, …)" en cada sitio. Formateé solo esos archivos.

| C-n | Archivo › caso | Cambio |
|---|---|---|
| **C-1** | `backend/test/sesiones-y-cadena.ataque.test.ts` › "bajo /api solo existen las rutas de … ENTREGAS-01b y ENTREGAS-01c: …" | De 90 a **96** entradas, ordenadas como `.sort()` (comprobado por script). Entran `GET`, `HEAD` y `POST` de `/api/clases/:claseId/tareas/:tareaId/entrega/comentarios` y de `…/entregas/:alumnoId/comentarios`: las 4 rutas de "Autorización" y el `HEAD` de sus 2 `GET`. El título suma "ENTREGAS-01c". |
| **C-2** | `backend/test/lecturas-fx-r1.ataque.test.ts` › "… doce lecturas (cuatro de clases, dos del muro, dos de tareas y cuatro de entregas)" | `"adapters/db/entregas.ts:3"` pasa a `:4`. El título pasa de "once" a "doce" lecturas. |
| **C-3** | `backend/test/muro-c-r1.ataque.test.ts` › "ningún consumidor: solo core/eventos, adapters/queue/colas.ts, handlers/clases/muro.ts y handlers/tareas/hilo-privado.ts nombran las colas de avisos (workers/ no)" | La lista suma `"handlers/tareas/hilo-privado.ts"` y el título lo nombra. |
| **C-4** | `backend/test/temas-01a-r3.ataque.test.ts` › "ningún archivo nuevo de 01a ni de 01b usa console., …" | La lista cerrada suma `"handlers/tareas/hilo-privado.ts"`. Las reglas no cambian. |
| **C-9** (parte de 01c) | `backend/test/temas-01a-r1.ataque.test.ts` › "FOR KEY SHARE solo en adapters/db/referencias.ts y entregas.ts; …" | **Regla 2:** la lista de `handlers/tareas/` suma `hilo-privado.ts`. **Regla 3a:** `PUEDEN_ENCOLAR` suma `hilo-privado.ts`. **Regla 3b** (`cancelar(` solo en `tareas.ts`) y **regla 1** (`FOR KEY SHARE` en `entregas.ts` y `referencias.ts`) no cambian. El título no cambia, como dice el bloque "C-9: cambio por regla". |

**Total:** 5 archivos, todos del backend. El frontend no se toca en 01c.

## Rojos esperados (lista cerrada, de esta ronda a la entrega del programador)
| Prueba | Hoy (`159cc7e` + C-1, C-2, C-3, C-4 y C-9) | Falla porque | Vuelve a verde cuando |
|---|---|---|---|
| C-1 `sesiones-y-cadena` | **Roja** | Faltan exactamente las 6 entradas nuevas | `app.ts` registre `hiloPrivadoHandler` (paso 4 de 01c) |
| C-2 `lecturas-fx-r1` | **Roja** | Recibe `entregas.ts:3` y espera `:4` | Exista `listarHiloPrivado` con la opción (paso 3) |
| C-3 `muro-c-r1:625` | **Roja** | Falta `handlers/tareas/hilo-privado.ts` | El handler nombre la cola (paso 4) |
| C-4 `temas-01a-r3` | **Roja** | Falta `handlers/tareas/hilo-privado.ts` | Exista el handler (paso 4) |
| C-9 `temas-01a-r1` | **Roja** | Regla 2: falta `handlers/tareas/hilo-privado.ts` (la regla 1 ya pasa) | Exista el handler (paso 4) |

Ningún otro rojo es esperado. En particular, mis `entregas-01b-r1` y `entregas-01b-r2` deben seguir en verde con 01c.

## Corridas (una suite a la vez)
**Backend:**
- **lint:** `cd backend; npm run lint > <scratchpad>/c0-lint-back.txt 2>&1`, código 0. Última línea con texto: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `cd backend; npm test > <scratchpad>/c0-test-back.txt 2>&1`, de 16:41:29Z a 16:44:06Z, código 1.
  - Resumen: `Test Files  5 failed | 182 passed (187)` · `Tests  5 failed | 2373 passed (2378)` · `Duration  152.40s (transform 15.79s, setup 6.26s, import 249.59s, tests 1241.59s, environment 53ms)`.
  - Los 5 rojos son exactamente C-1, C-2, C-3, C-4 y C-9. Cada uno falla solo por lo que 01c todavía no crea: la salida muestra únicamente `entregas.ts:4` contra `:3`, las 6 rutas del hilo y `handlers/tareas/hilo-privado.ts`.
  - No hubo intermitencias; PA-12 no aplica.

**Frontend:** no lo corrí, porque no toqué nada del frontend en esta ronda.

## PA-07
**Fuente:** `<scratchpad>/c0-test-back.txt`. Atribuí con `<scratchpad>/pa07-tester.mjs`.

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
  - 6 de `POST /api/auth/login`: 5 "en la búsqueda" y 1 "al crear la sesión" (`pid` 4132);
  - 3 `ZodError` de T-39 (`pid` 4068);
  - 1 `boom` de `GET /api/prueba/error-comun` (`pid` 20188).
- **Control positivo: completo.** Los tres de `servicio-ocupado`, en el `pid` 5424 y con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`,** en el `pid` 23832: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **PA-07: limpia.**

### I-2 para 01c
**Ninguna lista cerrada de pruebas normales necesita cambiar en 01c:**
- E6 de `bloqueo-usuario.integracion` ya incluye `entregas.ts`, donde vive el hilo;
- `core/eventos/avisos-de-clase.test.ts` acepta la unión sin cambio;
- ninguna prueba normal enumera rutas, colas ni handlers de `handlers/tareas/`.

La lista cerrada del programador no tiene entradas para 01c, y no hace falta.

## Observaciones para el programador y para mi ronda 1 (no aplicadas)
- **`FOR KEY SHARE` y el bloqueo de la tarea:** `comentarEnHiloPrivado` debe reutilizar `bloquearTareaParaEntregar` (§D-4, C-9 regla 1). Un segundo `FOR KEY SHARE` en `entregas.ts` o en otro archivo pone en rojo `temas-01a-r1:978` y `entregas-01b-r1` (O-2 de la Enmienda 3), y sería PARADA.
- **C-2 cuenta texto:** en `entregas.ts` deben quedar exactamente 4 literales `instantaneaUnica: true`, contando los comentarios.
- **C-3 lee comentarios:** en `src/`, solo `handlers/tareas/hilo-privado.ts` puede sumarse a los archivos que nombran `COMENTARIO_CREADO`, entre comillas o como `COLA_…`, aunque sea en un comentario. Si un comentario de `adapters/db/entregas.ts` o de `core/` lo escribe así, cae.
- **PR-1C06 (O-3 de la Enmienda 2 y "Para 01c" del manager):** la carrera "el borrado retiene la tarea (`FOR UPDATE`) y llega el comentario → `404` sin comentario ni fila de entrega", con `formadasDetrasDe`.
- **PR-1C08:** la unión de `datosComentarioCreadoSchema` con dos `z.strictObject` de llaves distintas. El tipo del muro no cambia.
- **Para mi ronda 1:**
  - el hilo de otra alumna por cualquier camino, cursor ajeno incluido (de otro hilo, de otra tarea o de un comentario del muro);
  - que un comentario privado se vea, se cuente o se borre por las rutas del muro, sobre la propia tarea;
  - que el admin no pueda escribir (P-01 a), sin crear fila ni trabajo;
  - comentar en el hilo de un alumno dado de baja o desactivado (`404`);
  - que comentar no suba la versión ni cambie el estado de la entrega (S-15), también en carrera con entregar y anular;
  - que `COMENTARIO_CREADO` lleve solo ids (sin texto) y con id igual al del comentario;
  - textos invisibles y 1000 y 1001 caracteres visibles;
  - fugas (`estadoPago`, `email`, `rol`) en la firma del autor y en `propio`;
  - que los esquemas de respuesta del hilo sean `z.strictObject`;
  - paginación de 20 a 100 y cursor de una entrega borrada;
  - PA-07 con las carreras del borrado.

## No atacado y por qué
- No hay código de 01c: los ataques de "Puntos de ataque → 01c" van en la ronda 1.

## Tabla de SHA-256 de las 168 `*.ataque` al cierre de la ronda 0 de 01c (base de V-01 del programador y del manager en 01c)
163 iguales a la tabla de la ronda 2 de 01b y 5 reescritas, marcadas. Ninguna nueva ni borrada.

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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
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
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` | Reescrita (C-2, 01c) |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` | Reescrita (C-3) |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` | Reescrita (C-1, 01c) |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` | Reescrita (C-9, 01c) |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` | Reescrita (C-4, 01c) |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
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


# Reporte del Tester — ENTREGAS-01c — Ronda 1
Veredicto: **RESISTE** (0 hallazgos).
Verificación propia:
- **backend:** lint con código 0; test `Test Files  192 passed (192)` · `Tests  2422 passed (2422)`.
- **frontend:** lint con código 0; test `Test Files  153 passed (153)` · `Tests  2271 passed (2271)`.
- **PA-07:** limpia (I-1 = 10).

Base: la implementación de 01c sin commit sobre `159cc7e` (`resumen-programador.md`, aceptado por el manager en `revision.md`, "Verificación del resumen — ENTREGAS-01c — implementación"). PA-01 vigente por la declaración del humano (red `uacam5 2`).

## Regresión y V-01
- **V-01 al empezar:** 168/168 iguales a la tabla de la ronda 0 de 01c.
- **Mis pruebas previas pasan en las corridas completas:**
  - C-1, C-2, C-3, C-4 y C-9 (parte de 01c) ya están en verde;
  - siguen en verde todas las de 01a, la ronda 0 de 01b y `entregas-01b-r1/r2`.
  - En particular, la regla de mi `entregas-01b-r1` (`FOR KEY SHARE` una sola vez en `entregas.ts`) sigue en verde: `comentarEnHiloPrivado` reutiliza `bloquearTareaParaEntregar`.
- No hay regresiones.

## Hallazgos
Ninguno.

## *.ataque nuevas
| Archivo | Casos | Qué ataca |
|---|---|---|
| `backend/test/hilo-01c-r1.ataque.test.ts` | 15 | El hilo ajeno, el aislamiento frente al muro, P-01 a, S-15, `COMENTARIO_CREADO`, el texto, la restricción y las fugas, las carreras (T-r1-1, T-r1-2, borrado y T-r1-4), la paginación y la revisión estática (incluida T-r1-3) |

## Atacado sin hallazgos
- **El hilo de otra alumna:**
  - Ana no ve el comentario de Beto en su lista;
  - un cursor del hilo de Beto, de otra tarea suya o inexistente da `400 VALIDACION`;
  - la ruta del maestro le responde `403 ROL_NO_PERMITIDO`, al leer y al escribir;
  - con un `:alumnoId` de otra clase, dado de baja, desactivado, un maestro, el admin o inexistente, el maestro (leer y escribir) y el admin (leer) reciben `404 ALUMNO_NO_ENCONTRADO` y no se crea ninguna fila de entrega.
- **Aislamiento frente al muro:**
  - el muro no trae el texto de los comentarios privados, y el `comentarios` de la tarea y del anuncio sigue en 0;
  - `GET …/publicaciones/:id/comentarios` sobre la tarea y sobre el anuncio no los trae y no da `500`;
  - los seis `DELETE` del muro con el id de un comentario privado responden `404` y los dos comentarios siguen: `mis-comentarios` de la alumna y del maestro, la moderación por la tarea y por el anuncio, el admin, y la alumna por el anuncio.
- **P-01 a:** el admin lee (`200`) y al escribir recibe `403 ROL_NO_PERMITIDO`, no `404`, también con un `:alumnoId` inexistente. No se crea fila, comentario ni trabajo.
- **S-15:**
  - el primer comentario (del maestro) crea la fila en `asignado` con versión 0;
  - en `asignado` (versión 3), `entregado`, `calificado` (versión 4) y con la entrega cerrada (tarea vencida sin tardías), comentar como alumna y como maestro responde `201`, y la fila queda idéntica: estado, versión, fecha, enlaces y `actualizado_en`.
- **`COMENTARIO_CREADO` (T-r1-5):**
  - el trabajo del hilo tiene id igual al del comentario y datos exactamente `{ comentarioId, entregaId, claseId }`, sin texto;
  - un evento real del hilo encaja solo en la forma privada, y uno real del muro solo en la del muro;
  - la unión rechaza las dos llaves a la vez, ninguna, texto y llaves de más (`tareaId`).
- **Texto:**
  - vacío, solo espacios, solo invisibles (`U+200B`, `U+FEFF`, `U+00AD`), 1001 visibles, un inversor de dirección, un número, `null`, una lista y un objeto dan `400 VALIDACION`, para la alumna y para el maestro, sin fila;
  - 1 y 1000 visibles dan `201`, y los espacios a los lados se recortan.
  - El inversor de dirección se rechaza por la regla común de `textoLargoCon`, la misma que en el muro (CLASES-c).
- **Alumna restringida:** `403 ACCESO_RESTRINGIDO` en las cuatro rutas del hilo, sin revelar el motivo y sin fila.
- **Fugas:** ninguna respuesta del hilo trae `estadoPago`, `fechaEstadoPago`, `accesoRestringido`, `motivoRestriccion`, `email`, `rol`, "deudor", "al_corriente", `hashContrasena` ni `@`. Revisé alumna, maestro y admin, con éxito y con error (incluidos `404`, `400` y el `403` del admin). El autor trae exactamente `id`, `nombre` y `administracion`, y `propio` es correcto.
- **Carreras:**
  - **T-r1-1,** el primer comentario de la alumna y el del maestro a la vez, sin fila, en cinco vueltas: dos `201`, una sola fila `asignado` con versión 0, dos comentarios, sin `P2002` ni `500`;
  - **T-r1-2,** con la fila de `entregas` retenida, entregar y comentar en los dos órdenes: `200` y `201`, la entrega queda `entregado` con versión +1 (solo la sube la entrega) y hay un comentario;
  - **comentar y borrar la tarea,** con la fila de `tareas` retenida: si el borrado va primero, `204` y `404 TAREA_NO_ENCONTRADA`, sin comentario ni fila; si el comentario va primero, `201` y `204`, y el hilo se va con la tarea; nunca `500`;
  - **T-r1-4:** mientras la alumna está de baja, la ruta del maestro da `404`; tras reinscribirla, el cursor de la primera página sigue sirviendo y trae lo que faltaba.
- **Paginación:**
  - `limite` 0, −1, 101, 2.5 o texto y un cursor que no es uuid dan `400 VALIDACION`; `limite=100` pasa;
  - la paginación de 2 en 2, con el cursor en mayúsculas, recorre los cinco sin repetir ni saltar.
- **Revisión estática:**
  - `FOR KEY SHARE` aparece solo en `entregas.ts` (una vez) y en `referencias.ts`, y `comentarEnHiloPrivado` usa `bloquearTareaParaEntregar`;
  - `instantaneaUnica: true` aparece exactamente 4 veces en el texto de `entregas.ts`;
  - el handler del hilo no tiene `relacion ===`, `.rol`, roles comparados, `$queryRaw`, `$executeRaw`, `obtenerDb`, `@prisma` ni `cancelar(`, y solo encola `COLA_COMENTARIO_CREADO`;
  - nada de `adapters/db` importa `adapters/queue`;
  - **T-r1-3:** los 3 esquemas de respuesta del hilo son `z.strictObject`;
  - las listas cerradas de C-1 a C-9 siguen verdes.

## Observaciones (no son hallazgos)
- **O-c1-1 — mi propio archivo:** `entregas-01b-r1.ataque.test.ts` tiene 2 caracteres de inversión de dirección escritos sin escapar dentro de cadenas de prueba (el caso de los enlaces con inversor). No cambian lo que prueba, pero conviene escaparlos (`‮`) para que el texto fuente no esconda nada. No lo toco en esta ronda para no mover su SHA-256. En el archivo nuevo de esta ronda ya van escapados.

## No atacado y por qué
- **La frontera cursor→página del hilo (regla T-18), con un gancho entre sentencias:**
  - En el hilo no se puede borrar un comentario (S-04): solo desaparece con la cascada del borrado de la tarea, y entonces desaparece el hilo entero.
  - La lectura corre en `instantaneaUnica`.
  - No hay un camino real en que el comentario del cursor desaparezca y la página siga.
- **El navegador:** no aplica.

## Corridas (una suite a la vez)
**Prueba aislada, antes de las completas:** `npx vitest run test/hilo-01c-r1.ataque.test.ts` → `Tests  15 passed (15)`. En la primera versión, mi caso de texto esperaba `201` para un inversor de dirección; la regla común lo rechaza a propósito, así que corregí mi expectativa, no el código.

**Backend:**
- **lint:** `cd backend; npm run lint > <scratchpad>/c1-lint-back.txt 2>&1`, código 0. Última línea con texto: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **test:** `cd backend; npm test > <scratchpad>/c1-test-back.txt 2>&1`, de 17:28:52Z a 17:31:30Z, código 0.
  - Última línea: `Test Files  192 passed (192)` · `Tests  2422 passed (2422)` · `Duration  152.82s (transform 20.17s, setup 6.23s, import 250.32s, tests 1209.22s, environment 54ms)`.
  - Conteo: 2407 del programador más mis 15.

**Frontend**, después del backend:
- **lint:** `cd frontend; npm run lint > <scratchpad>/c1-lint-front.txt 2>&1`, código 0. Última línea: `> tsc -b`.
- **test:** `cd frontend; npm test > <scratchpad>/c1-test-front.txt 2>&1`, de 17:32:12Z a 17:34:20Z, código 0. Última línea: `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  123.89s (transform 30.13s, setup 76.82s, import 327.45s, tests 543.59s, environment 327.28s)`.

**Resultado:** ningún rojo ni intermitencia; PA-12 no aplica.

## PA-07
**Fuente:** `<scratchpad>/c1-test-back.txt`. Atribuí con `<scratchpad>/pa07-tester.mjs`.

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
  - 6 de `POST /api/auth/login` (`pid` 26212);
  - 3 `ZodError` de T-39 (`pid` 2316);
  - 1 `boom` de `GET /api/prueba/error-comun` (`pid` 25916).
- **Control positivo: completo.** Los tres de `servicio-ocupado`, en el `pid` 25368 y con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3`,** en el `pid` 7772: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **De mis carreras del hilo** (retenciones de `tareas` y `entregas`, y primeros comentarios simultáneos) no sale ningún error, ningún `P2028` ni ningún deadlock.
- **PA-07: limpia.**

## Tabla de SHA-256 de las 169 `*.ataque` al cierre de la ronda 1 de 01c (base de V-01 del cierre de 01c)
168 iguales a la tabla de la ronda 0 de 01c y 1 nueva, marcada. Ninguna cambió.

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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` | Nueva (ronda 1 de 01c) |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
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


# Reporte del Tester — ENTREGAS-01d — Ronda 0
Veredicto: **LISTA PARA IMPLEMENTAR, con tres condiciones de diseño que el programador debe cumplir** (abajo, "Condiciones").
- Cada una evita que una `*.ataque` existente caiga por una causa que §D-R0 no nombra.
- Si el programador no puede cumplir alguna, es PA-02 del plan y se detiene.
- No hay PARADA hoy: ninguna de las tres rompe por necesidad, porque el plan admite una implementación que las cumple.

Verificación propia: frontend lint con código 0; test con 1 rojo, el esperado (C-11, V-06). No corrí el backend porque no lo toqué.

Base de 01d dentro de los paquetes: `<K1c>` = `ec1c4b3` (árbol limpio). `plan.md` con SHA-256 `ffc6fdd1…f3d3`. Aún no hay código de 01d.

## PA-01 y precondiciones
- **Docker:** 28.5.1.
- **Red:** `uacam5 2`, perfil `Public`, declarada de confianza por el humano hoy.
- **Firewall:** la regla "Campus: bloquear entrada a Docker en redes publicas" está `True`, `Inbound`, `Block`, `Public`. PA-01 cubierta. Como no corrí la suite del backend, no hizo falta.
- **`shared`:** `cd shared; npm run build`, código 0.
- No abrí navegadores ni terminé procesos.

## V-01 — 169/169
Comparé con la tabla de la ronda 1 de 01c sobre `ec1c4b3`, antes de reescribir nada: **169 coinciden, 0 faltantes, 0 sobrantes**.

## Inventario de §D-R0 para 01d
**Los archivos nuevos o tocados de §D-9:**
- `lib/estado-de-entrega.ts`;
- `components/estado-entrega-badge.tsx`;
- `components/adjuntos/{hooks.ts, lib.ts, adjuntos-de-publicacion.tsx}`, solo con agregados;
- `features/tareas/components/{tu-trabajo, formulario-de-entrega, campo-de-enlaces, entrega-realizada, lista-de-enlaces, hilo-privado}.tsx`;
- `features/tareas/{detalle-tarea-view.tsx, data.ts, lib.ts, hooks.ts, types.ts}`;
- `features/clases/components/fila-de-entrega.tsx`, la sección que la monta, `features/clases/{data.ts, types.ts}`.

| Lista o inventario (archivo › caso) | Qué fija | ¿Rompe con 01d? |
|---|---|---|
| `styles/clases-r1.ataque` › **V-06** | 49 `enEspera=` y una lista fija por archivo; fuera de la lista, solo `features/admin/components` (2) y el roster de `features/clases/components` (3) | **Sí, prevista** (§D-R0 "01d y 01e"). Entran `formulario-de-entrega.tsx` (1), `entrega-realizada.tsx` (1) y `hilo-privado.tsx` (2). → **C-11** |
| `styles/clases-r1.ataque` › **V-07** | Archivos con `vidrio-fuerte` (igualdad exacta; `fila-de-entrega.tsx` ya está) | **No**, si ningún componente nuevo usa `vidrio-fuerte`: §D-9 no lo pide (Card y `Badge`). La lista no cambia, y un archivo nuevo con vidrio fuerte sería un hallazgo de la ronda 1 o una enmienda. |
| `features/clases/estatico-02c-r1.ataque` › "§D-2C1: … perspectivaDeRuta" | `perspectivaDeRuta(` solo en `categorias-view`, `clase-layout`, `muro-view`, `trabajo-view` y `features/tareas/hooks.ts` | **No**: §D-9 usa `useRutaDeLaClase` (hooks.ts) y la perspectiva por props; "Trabajo de clase" ya la tiene. La lista no cambia (lo confirma el manager en "Para 01d"). |
| `features/tareas/tareas-01d-r1.ataque` › "sin fetch(, … target=_blank …" (`:498`) | Ningún `target="_blank"` en `features/tareas` | **Sí, prevista**: `lista-de-enlaces.tsx` (§D-9.5). → **C-5** |
| `features/tareas/tareas-01d-r2.ataque:524` (`DE_01D`) | En `features/tareas/**`: sin `disabled` en JSX, sin escalas anuladas, sin paleta de Tailwind, sin valores arbitrarios en px, rem o % y sin importar de `@/features/` | **No**, si los componentes nuevos respetan esas reglas (§D-9 lo exige: "sin `disabled`") |
| `features/tareas/tareas-01d-r3.ataque:398` | Tipos de `features/tareas` solo en `types.ts`; en un componente, solo sus Props | **No**, si se cumple la regla 1 de `CLAUDE.md` |
| `features/clases/ver-mas-01e-r3.ataque:311` (`DE_01E`, 14 archivos) | Incluye `fila-de-entrega.tsx`, `features/clases/{lib,hooks,data}.ts` y `secciones-de-clase.tsx`: sin tipos fuera de `types.ts`, sin `?? []`, `disabled`, `fetch(`, `console.`, valores arbitrarios ni importaciones de otro módulo | **No**, si el cambio de §D-9.8 respeta esas reglas. Los colores nuevos van en `data.ts` (`CLASES_DEL_CUADRO_DE_FECHA`), sin valores arbitrarios. |
| `features/clases/estatico-r1.ataque` | En `features/clases`: sin `?? []` y sin ternarios anidados en JSX | **No**, si la fila del alumno elige el texto y el color fuera del JSX (retornos tempranos o variables) |
| `features/clases/estatico-02c-r1.ataque` › "O-07: `administracion` solo se lee en firma-del-autor.tsx …" y "C-13 y A-5: … nada decide … por `propio` …" | `.administracion` solo en `firma-del-autor.tsx`; **ningún `.propio`** en el código; `.puedeBorrar` solo en 3 archivos | **No**, si `HiloPrivado` pinta al autor con `FirmaDelAutor` (§D-9.6) y **no lee `comentario.propio`** (§D-9 no lo usa). Leer `.propio` lo rompería → Condición 3. |
| `styles/clases-r1.ataque` › **V-13** (texto rojo solo en 5 archivos `.tsx`) | `text-danger` / `text-destructive` | **No**: "Sin entregar" va con `<Badge variant="danger">` (`EstadoEntregaBadge`) y la fila toma su color de `features/clases/data.ts` (`.ts`, fuera del escaneo). Un `text-danger` en un `.tsx` nuevo lo rompería. |
| `components/layout/estatico-r1.ataque` › "los únicos valores arbitrarios …", V-16 (`fixed`) y V-15 | Lista cerrada de valores arbitrarios fuera de `components/ui` | **No**, si los enlaces largos se cortan con utilidades del tema (`wrap-anywhere`, `break-all`), sin `[...]` |
| `features/clases/refactor-01c-r1.ataque` (R-04) | Símbolos movidos definidos una sola vez (`useSolicitarSubida`, `useUrlDeDescarga` y `AdjuntosDePublicacion` ×2); `components/adjuntos` sin `target=_blank`; y **simula `@/components/adjuntos/hooks` solo con `useUrlDeDescarga` y `useSolicitarSubida`** | **No** por los símbolos: `useUrlDeDescargaEn` no encaja en `useUrlDeDescarga\b`. **Sí rompería** si la ficha de `AdjuntosDePublicacion` llama a `useUrlDeDescargaEn` en el camino sin `rutaDeArchivos`: el módulo simulado no la trae, y los casos `:316` y `:340` caerían con un `TypeError`. → Condición 1 |
| `features/clases/reexportaciones-01c.test.ts` (normal, R-04) | Reexportaciones y textos de `components/clase` | No, si `components/adjuntos` solo suma |
| `features/clases/reloj-01e-r4.ataque:26` | Monta `<FilaDeEntrega titulo fechaLimite destino />` **sin `entrega`** | **Rompería** (`tsc -b`) si `entrega` pasa a ser una prop obligatoria. §D-9.8 dice que "solo la perspectiva de estudiante se la pasa", es decir, opcional. → Condición 2 |
| `features/tareas/tareas-01d-r1.ataque:328` (detalle del alumno) | `getByText("Tu trabajo")` justo después de que aparece el `h2`, con un doble que responde 500 a todo lo que no es la tarea (también a `GET …/entrega` y al hilo) | **Rompería** si `TuTrabajo` no pinta el `h3` "Tu trabajo" mientras carga o tras un error. → Condición 3 |
| Pruebas con textos relativos al día (`reloj-01e-r4:38`) | Toda prueba del frontend que diga "Vence hoy", "Vence mañana" o "Vence en N días" fija el reloj o pasa `ahora` | Rige para las pruebas nuevas del programador (§D-9.8, PR-1D12). No rompe hoy. |
| Mis `*.ataque` de 01a (`tareas-01a-r1`: "Sin tema" solo en `components/clase/data.ts`; "No tienes acceso a esta clase." nunca en `features/tareas`) | Textos literales | No, si los textos nuevos de §D-9 van en `data.ts` y no repiten esos literales |

**Resultado:**
- Rompen por necesidad exactamente lo que nombra §D-R0: V-06 (C-11) y C-5. V-07 y `perspectivaDeRuta` no cambian, por diseño.
- **Tres `*.ataque` más romperían según cómo se implemente** (`refactor-01c-r1`, `reloj-01e-r4` y `tareas-01d-r1:328`). No las reescribí, porque el plan admite una implementación que las respeta.
- Las dejo como condiciones explícitas: si el programador no puede cumplir alguna, es PA-02 (PARADA).

## Condiciones para el programador (si alguna no se puede cumplir, PA-02)
1. **R-04 y el doble de `refactor-01c-r1`:** sin `rutaDeArchivos`, `AdjuntosDePublicacion` debe seguir pidiendo la descarga con `useUrlDeDescarga(claseId)` (y la subida con `useSolicitarSubida(claseId)`).
   - El gancho nuevo `useUrlDeDescargaEn` solo puede llamarlo una ficha que se monta cuando hay `rutaDeArchivos` (por ejemplo, una segunda ficha). Llamar ganchos de forma condicional no vale.
   - Si la ficha única llama a `useUrlDeDescargaEn(rutaDeArchivos ?? …)`, el doble de `refactor-01c-r1` (que no trae ese gancho) hace caer dos casos, y eso es PARADA por R-04 (plan, PA-07).
2. **`FilaDeEntrega`:** la prop `entrega` es **opcional** (ausente = la fila de hoy), como dice §D-9.8 ("solo la perspectiva de estudiante se la pasa"). Si es obligatoria, `reloj-01e-r4.ataque:26` no compila.
3. **`TuTrabajo` y el hilo:**
   - el `h3` "Tu trabajo" se pinta en todos los estados (cargando, error y datos), porque además recibe el foco (§D-9.2);
   - `HiloPrivado` no lee `comentario.propio` ni `autor.administracion` (la firma la da `FirmaDelAutor`; `estatico-02c-r1` prohíbe `.propio` y `.administracion` fuera de la firma).

## Reescrituras (A-4)
Cambio mínimo, con su comentario "ENTREGAS-01d ronda 0 (C-n, …)". Formateé solo esos archivos.

| C-n | Archivo › caso | Cambio |
|---|---|---|
| **C-5** | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` › título nuevo "sin fetch(, console., ?? [], dangerouslySetInnerHTML ni emojis; target=_blank solo en lista-de-enlaces.tsx y siempre con rel=noopener noreferrer en el mismo elemento; features/tareas no importa de features/clases y viceversa" | `target=_blank` sale de la expresión de lo prohibido y entran dos aserciones: (a) los archivos con `target="_blank"` (también `target={"_blank"}`) son, como mucho, `components/lista-de-enlaces.tsx`; (b) cada elemento que lo lleva tiene `rel="noopener noreferrer"` en el mismo elemento (del `<` anterior al `>` siguiente). El motivo del plan va en el comentario: abrir el enlace en la misma pestaña sacaría a la persona de la entrega y del hilo, y `noopener noreferrer` corta `window.opener` y el `Referer`. Lo demás no cambia. |
| **C-11** (V-06) | `frontend/src/styles/clases-r1.ataque.test.ts` › "V-06: … 53 enEspera" | El total pasa de 49 a **53**. La lista fija suma `formulario-de-entrega.tsx: 1`, `entrega-realizada.tsx: 1`, `hilo-privado.tsx: 2`, y `tu-trabajo.tsx`, `campo-de-enlaces.tsx`, `lista-de-enlaces.tsx` y `components/estado-entrega-badge.tsx` con 0, según §D-9.2 a §D-9.6. Ancla: §D-R0 "01d y 01e". |

**Total:** 2 archivos.

**Si la implementación reparte los botones de otra forma** (por ejemplo, "Sí, anular entrega" en `tu-trabajo.tsx` en lugar de `entrega-realizada.tsx`, o el formulario del hilo en un archivo propio), C-11 quedará roja. En la ronda 1 lo contrasto con el plan: si el reparto se aparta de §D-9, es hallazgo; si el plan lo admite, es un ajuste de C-11 con su motivo.

## Rojos esperados (de esta ronda a la entrega del programador)
| Prueba | Hoy (`ec1c4b3` + C-5 y C-11) | Por qué | Vuelve a verde cuando |
|---|---|---|---|
| C-11 `styles/clases-r1` › "V-06: … 53 enEspera" | **Roja** | `expected [ …(49) ] to have a length of 53`. Los archivos nuevos no existen y la lista fija cuenta 0 donde espera 1 o 2 | Existan `formulario-de-entrega.tsx`, `entrega-realizada.tsx` y `hilo-privado.tsx` con sus botones en espera (paso 3 de 01d) |
| C-5 `tareas-01d-r1` › "… target=_blank solo en lista-de-enlaces.tsx …" | **Verde** | La regla se cumple sin archivos nuevos: ningún `target="_blank"` hoy | Debe seguir verde con `lista-de-enlaces.tsx` y su `rel` |
| Las tres de "Condiciones" | Verdes | — | Deben seguir verdes. Si caen, PA-02 |

## Corridas (una suite a la vez)
- **Frontend lint:** `cd frontend; npm run lint > <scratchpad>/d0-lint-front.txt 2>&1`, código 0. Última línea con texto: `> tsc -b`.
- **Frontend test:** `cd frontend; npm test > <scratchpad>/d0-test-front.txt 2>&1`, de 17:56:12Z a 17:58:06Z, código 1.
  - Resumen: `Test Files  1 failed | 152 passed (153)` · `Tests  1 failed | 2270 passed (2271)` · `Duration  110.49s (transform 28.95s, setup 60.28s, import 284.10s, tests 518.41s, environment 277.55s)`.
  - El único rojo es C-11 (V-06), el esperado.
  - No hubo intermitencias; PA-12 no aplica.
- **Backend:** no lo corrí, porque no toqué nada del backend. Por eso no hay PA-07 en esta ronda.

## Observaciones para el programador y para mi ronda 1 (no aplicadas)
- **Guarda síncrona con ref y `enEspera`** en "Entregar tarea" o "Marcar como completada", "Sí, anular entrega", "Enviar comentario" y "Ver más comentarios" (este último con `isFetching`, no con `isFetchingNextPage`). Sin `disabled`.
- **Foco en cada estado vecino**, nunca en `<body>`:
  - después de entregar, anular o comentar;
  - tras un `409 ENTREGA_*` (nueva lectura) y tras una subida fallida;
  - al quitar el último enlace o el último archivo;
  - cuando una recarga de la entrega quita el botón que tenía el foco (por ejemplo, "Anular entrega" al pasar a cerrada o a calificada).
- **La subida:** `useSolicitarSubidaEn(…/entrega)` y `subirArchivo` sin `Authorization` ni credenciales. **El token nunca viaja al almacén.**
- **Enlaces:**
  - `ListaDeEnlaces` con `href` exacto, `target="_blank"` y `rel="noopener noreferrer"`;
  - una respuesta con un `javascript:` hace fallar el `parse` (`urlDeEntregaRespuestaSchema`) y la vista muestra el error sin pintar el enlace;
  - un enlace de 2048 caracteres se corta sin desbordar a 360 px (eso se ve en la comprobación humana).
- **Reloj fijo** en toda prueba con "Sin entregar", "Entregado con retraso" o la fecha larga (PR-1D01, PR-1D08, PR-1D12).
- **Para mi ronda 1:**
  - doble clic y Enter repetido;
  - un `409` en carrera (entregada en otra pestaña);
  - una recarga de fondo que cambia `puedeEntregar` mientras se elige un archivo;
  - "Ver más comentarios" durante una recarga;
  - la fila de "Trabajo de clase" del alumno con cada estado y sin fila;
  - la perspectiva de maestro y admin sin `entrega`;
  - el texto de privacidad (P-01 a);
  - textos de §9 sin emojis;
  - que nada pinte `estadoPago`;
  - y que la subida use la ruta de la entrega y nunca `/clases/:claseId/archivos`.

## No atacado y por qué
- No hay código de 01d: los ataques de "Puntos de ataque → 01d" van en la ronda 1.
- El navegador (360 px, lector de pantalla y H-7): corresponde a la comprobación humana.

## Tabla de SHA-256 de las 169 `*.ataque` al cierre de la ronda 0 de 01d (base de V-01 del programador y del manager en 01d)
167 iguales a la tabla de la ronda 1 de 01c y 2 reescritas, marcadas (C-5 y C-11). Ninguna nueva ni borrada.

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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | Reescrita (C-5) |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `9F81802D388B09FD2210A7FB863F51F8F9FEDF11B243515B23CE8912CEB43424` | `frontend/src/styles/clases-r1.ataque.test.ts` | Reescrita (C-11, V-06) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

# Reporte del Tester — ENTREGAS-01d — Ronda 1
Veredicto: **ROTO** (3 hallazgos: 1 media, 2 bajas). Los tres son del mismo mecanismo o de su hermano: lo que la vista renueva o anuncia después de un error del servidor al entregar. Todo lo demás de la lista resiste.

Verificación propia (frontend; una suite a la vez, sin tocar el backend):
- `cd frontend; npm run lint` → código 0; última línea: `> tsc -b` (ESLint, Prettier "All matched files use Prettier code style!" y `tsc -b` sin errores).
- `cd frontend; npm test` → `Test Files  1 failed | 159 passed (160)` · `Tests  4 failed | 2360 passed (2364)`. Los 4 rojos son los míos de esta ronda (T-01, T-02 ×2, T-03), deterministas en tres corridas aisladas. Cifras coherentes con las del manager (158 / 2319) más mis dos archivos (2 / 45 casos).
- Backend: no corrido (no cambió y no toqué nada suyo); PA-07 no aplica a esta ronda.

Base: árbol de 01d sin commit sobre `ec1c4b3`. V-01: las 169 `*.ataque` de la tabla de cierre de la ronda 0 de 01d coinciden byte a byte (169/169, 0 faltantes, 0 cambiadas). No abrí navegadores ni terminé procesos.

## Hallazgos

### T-01 — Tras un `409 ENTREGA_CERRADA` porque el maestro cerró la tarea, «Tu trabajo» dice a la vez «Asignado» y «La fecha límite ya pasó…»
Severidad: media
Prueba: `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` › "ataque ENTREGAS-01d r1: la vista tras un 409 dice una sola cosa (PR-1D07, §D-9.3)" › "409 ENTREGA_CERRADA porque el maestro cerró la tarea: la tarea se vuelve a pedir y la insignia deja de decir «Asignado»"
Reproducción: el alumno abre la tarea (fecha límite futura); el maestro la mueve al pasado sin tardías; el alumno pulsa "Entregar tarea" → `409 ENTREGA_CERRADA`.
Esperado: la vista "cambia sola a lo que corresponda" (§D-9.3, PR-1D07, `DESIGN.md` §7.24): insignia y texto coherentes, y "Detalles" con la fecha nueva.
Obtenido:
- `reaccionarAlErrorDeLaEntrega` solo invalida `claveMiEntrega`, que es hija de `claveTarea`: invalidar la hija no renueva la madre. Además, `providers.tsx` tiene `refetchOnWindowFocus: false`.
- La entrega nueva dice `asignado` sin `puedeEntregar`, así que el panel muestra "La fecha límite ya pasó y esta tarea no acepta entregas con retraso.".
- Pero `estadoDeEntregaVisible` calcula la insignia con la `fechaLimite` vieja de la caché → **«Asignado»**, y "Detalles" sigue diciendo la fecha vieja.
- No hay `GET` nuevo de la tarea (1 antes, 1 después). La contradicción dura hasta que la caché de la tarea se renueve (navegar fuera y volver tras 30 s).
Hermanos (mismo mecanismo, sin prueba propia):
- La nota de retraso y `conRetrasoSiVuelve` también salen de la tarea en caché.
- `entregaCerradaAhora` decide con esa misma tarea la frase de cierre bajo la entrega hecha.
- Un `409` en "Sí, anular entrega" por el mismo motivo deja la entrega sin "Anular" y sin la frase de cierre.
Requisito: §D-9.3 "Errores" ("la vista cambia sola a lo que corresponda"); PR-1D07.

### T-02 — Un `409` de la entrega no marca viejo «Trabajo de clase»: la fila del alumno sigue con el estado de antes
Severidad: baja
Prueba: `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` › "ataque ENTREGAS-01d r1: «Trabajo de clase» tras un 409 de la entrega (hermano de T-01)" › "409 'ENTREGA_YA_REALIZADA' al entregar marca viejo «Trabajo de clase»" y "409 'ENTREGA_CALIFICADA' al entregar marca viejo «Trabajo de clase»"
Esperado: el `409` dice que la entrega cambió fuera de esta pestaña (otra pestaña, o el maestro la calificó). Como en el éxito de entregar y anular (PR-1D04), `clavePrefijoDelTrabajo(claseId)` queda vieja, y la fila de §D-9.8 dice el estado nuevo al volver.
Obtenido: `isInvalidated` sigue en `false`. Con `staleTime` de 30 s, al volver a "Trabajo de clase" la fila sigue diciendo "Vence …" o "Entregado" para una entrega que ya está hecha o calificada.
Requisito: §D-9.8 (la fila dice el estado de la entrega); hermano del remedio de PR-1D04 (invalidar el trabajo al cambiar la entrega).

### T-03 — El error de enlaces del servidor no se asocia a ningún control; su hermano `ENTREGA_VACIA` sí
Severidad: baja
Prueba: `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` › "ataque ENTREGAS-01d r1: el error del servidor se asocia a un control (hermano de ENTREGA_VACIA)" › "VALIDACION de enlaces.0 del servidor describe «Entregar tarea» o el campo «Enlace»". El control positivo del mismo `describe` ("ENTREGA_VACIA del servidor describe «Entregar tarea»") pasa.
Esperado: los dos errores del servidor van "bajo su grupo, sin aviso" (§7.24). Sin `toast` y con el foco en el botón, la única forma de que un lector de pantalla los reciba es la asociación. `ENTREGA_VACIA` queda en el `aria-describedby` de "Entregar tarea"; el de enlaces debería quedar igual (en el botón o en el campo "Enlace").
Obtenido: el `ErrorDeCampo` del servidor (`${idError}-servidor` en `campo-de-enlaces.tsx`) no entra en el `aria-describedby` del campo, que solo junta la ayuda, el tope y el error local, ni en el del botón; `aria-invalid` del campo sigue en `false`. Quien usa lector de pantalla pulsa "Entregar tarea" y no recibe nada.
Requisito: patrón de `ErrorDeCampo` asociado a su control (CLAUDE.md, "Formularios"); regla de hermanos (AGENTS.md).

## Atacado sin hallazgos
- **Ruta de la subida y token (T-r1-3):** dos archivos con un `401` en la segunda solicitud.
  - Un solo refresco.
  - Cero solicitudes a `/api/clases/:claseId/archivos`; las tres van a `…/entrega/archivos` (la del `401` reintentada).
  - Los dos `PUT` van sin `Authorization`, con `credentials: "omit"` y sin "token" en ninguna cabecera, también el posterior al refresco.
  - El `POST …/entrega` sale con `Bearer token-renovado` y dos `archivoIds`.
- **Una sola petición por acción:**
  - "Marcar como completada": dos clics y tres `submit` dan un `POST`, en espera, y un solo aviso "Marcaste la tarea como completada".
  - "Sí, anular entrega": tres clics dan un `POST …/anular`, y "Cancelar" no cierra en vuelo.
  - "Enviar comentario": dos clics y dos `submit` dan un `POST`, y el comentario aparece una vez.
  - "Ver más comentarios": tres clics en vuelo dan un `GET` con cursor, 25 filas únicas, y el foco nunca queda en `<body>`.
- **Foco en estados vecinos (T-r1-1):**
  - `409` `ENTREGA_YA_REALIZADA`, `ENTREGA_CALIFICADA` y `ENTREGA_CERRADA` al entregar con el foco en el botón: un aviso, un `GET` de la entrega y el foco dentro de "Tu trabajo".
  - `409 ENTREGA_CALIFICADA` al anular con el foco en "Sí, anular entrega".
  - Subida fallida: el aviso nombra el archivo, no hay `POST`, el archivo se conserva y el foco sigue en el botón.
  - Quitar el segundo archivo lleva el foco al "Quitar" del primero; quitar el último, a "Adjuntar archivos".
  - Quitar el último enlace lleva el foco al campo.
  - Recarga que califica la entrega con el foco en "Anular entrega" y recarga con una entrega de otra pestaña con el foco en "Entregar tarea": el foco va a la sección. Nunca `<body>`.
- **T-r1-4:**
  - `400 ENTREGA_VACIA`: un solo texto, ningún `toast`, un `POST` y ningún `GET` de la entrega después del error.
  - `VALIDACION` de `enlaces.0` con un archivo y un enlace: el mensaje sin prefijo una sola vez, ningún `toast`, una solicitud, un `PUT`, un `POST` y ningún `GET` después.
  - Nota: un reintento manual vuelve a subir los archivos (diseño: cada envío sube lo elegido).
- **`javascript:` en la respuesta:**
  - `miEntregaRespuestaSchema` rechaza `javascript:`, `JavaScript:`, `javascript:` con espacio delante, `data:`, `vbscript:`, `file:` y `//host` sin protocolo.
  - Una respuesta con un enlace bueno y uno `JavaScript:` no pinta ninguno: muestra el `MensajeError`, no hay ningún `href` peligroso en el documento ni botón "Anular".
- **T-r1-2 (2048 caracteres):**
  - En la entrega hecha, el `<a>` conserva el `href` exacto, lleva `target="_blank"`, `rel="noopener noreferrer"` y `wrap-anywhere`, y el `sr-only` "(se abre en otra pestaña)" está dentro del enlace.
  - En el campo, 2048 se agrega (la ficha lleva `wrap-anywhere` y `min-w-0`, y "Quitar …" lleva el nombre completo); 2049 no se agrega y deja el campo con `aria-invalid`.
- **Hilo (T-r1-5):**
  - El texto de privacidad y el `h3` están mientras carga, tras un error de carga (sin lista) y con el hilo vacío.
  - Un comentario enviado mientras la lista se recarga aparece una vez, aunque la recarga vieja responda después (4 filas únicas).
  - "Ver más" durante la recarga que sigue a un envío propio no pide nada; después, 26 filas únicas y el comentario nuevo una vez.
- **"Trabajo de clase" (`frontend/src/features/clases/fila-01d-r1.ataque.test.tsx`, 8 casos):** todas las pruebas del programador que pintan la fila fijan el reloj (`fila-de-entrega-01d`, `trabajo-view` PR-1E01, `entregas-01d`; `estado-de-entrega.test` recibe `ahora` explícito). En las mías:
  - Un segundo antes del límite, la fila conserva el texto de `vencimientoDe`; en el límite exacto y un segundo después, "Sin entregar" (R-08 aceptado).
  - La misma fila cambia con el reloj de la prueba, no con la hora real.
  - Maestro y admin: "Venció el …", nunca "Sin entregar".
  - "Entregado", "Entregado con retraso" y "Calificado" (también calificado con retraso) sin texto de vencimiento.
  - Anulada y pendiente: el vencimiento.
  - Fecha ilegible: el texto de fecha no disponible.
- **Revisión estática de los 21 archivos de 01d:**
  - Sin `?? []`, sin `disabled` en JSX y sin valores por defecto en `estadoPago`, `accesoRestringido`, `rol` ni `calificacion`.
  - Sin `localStorage`, `sessionStorage` ni `console.`.
  - En todo `src/`, `fetch(` solo en `apiClient.ts` y `almacenService.ts`, y `_blank` solo en `lista-de-enlaces.tsx`.
  - Sin importaciones entre `features/tareas` y `features/clases`, y en los `.tsx` nuevos solo interfaces `…Props`.
  - V-06, V-07, C-5 y las listas heredadas siguen en verde en la corrida completa.
- **Estados de `TuTrabajo` y `HiloPrivado`:** error → cargando → vacío → datos; `requiereAdjuntos: false` con el cambio de texto del botón; cerrada sin botones; calificada sin "Anular". Los cubren PR-1D03, PR-1D08 y PR-1D10, y no encontré un camino que los rompa.
- **`DESIGN.md` §7.24 y §7.25 (revisión manual del texto):** describen lo que hace el código (encabezado siempre, textos, `enEspera`, destinos del foco, errores bajo el grupo sin aviso, "Ver más" con `isFetching`, privacidad en todos los estados). El único desfase es el de T-01: "la entrega se vuelve a pedir" es cierto, pero la tarea no.
- **Regresiones:** las 169 previas siguen en verde en la corrida completa, incluidas mis `*.ataque` de 01a (`tareas-01a-r1`) y las reescritas de la ronda 0 de 01d.

## Observaciones (no son hallazgos)
- **O-1d1-1:** con una tarea que en caché dice `requiereAdjuntos: false` y en el servidor ya lo requiere, `400 ENTREGA_VACIA` deja el botón diciendo "Marcar como completada" junto a "Agrega al menos un archivo o un enlace…". Es recuperable (el mensaje dice qué hacer) y el plan pide exactamente ese manejo. Mismo origen que T-01, que es no renovar la tarea; si el remedio de T-01 renueva la tarea también aquí, desaparece.
- **O-1d1-2:** en el milisegundo exacto de la fecha límite, la insignia y la fila dicen "Sin entregar" mientras el formulario sigue abierto y el servidor acepta a tiempo. Es R-08, aceptado.

## No atacado y por qué
- **360 px y desbordes reales:** jsdom no calcula el diseño. Solo comprobé que las clases están en el elemento correcto (T-r1-2). El desborde visual de un enlace de 2048, de la ficha y de la fila va a la comprobación humana (H-1 y H-7 del plan). No verificado por mí.
- **Enter real del teclado:** jsdom no hace el envío implícito al pulsar Enter. Lo simulé con `submit` repetido sobre el formulario, que es lo que produce el navegador.
- **Backend:** no cambió en 01d; no lo corrí (instrucción del orquestador).

## Corridas (una suite a la vez)
1. `npx vitest run src/features/tareas/entregas-01d-r1.ataque.test.tsx src/features/clases/fila-01d-r1.ataque.test.tsx`, tres veces → `Tests  4 failed | 41 passed (45)`, los mismos 4 cada vez.
2. `cd frontend; npm run lint` → código 0, `> tsc -b`.
3. `cd frontend; npm test` → `Test Files  1 failed | 159 passed (160)` · `Tests  4 failed | 2360 passed (2364)` · `Duration  166.66s`.

## Tabla de SHA-256 de las 171 `*.ataque` al cierre de la ronda 1 de 01d
| SHA-256 | Archivo | Nota |
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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` | Nueva (ronda 1 de 01d) |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2C4FE47075244E20C7D3904D364907D0848A75C29CBE784E73EEB144380A91CB` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` | Nueva (ronda 1 de 01d) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `9F81802D388B09FD2210A7FB863F51F8F9FEDF11B243515B23CE8912CEB43424` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

# Reporte del Tester — ENTREGAS-01d — Ronda 2
Veredicto: **ROTO** (2 hallazgos bajos: T-04 y T-05). Verificación propia: frontend lint con código 0; test `Tests  2 failed | 2396 passed (2398)`, y los 2 rojos son solo T-04 y T-05. El detalle va al final de esta sección.

Base: árbol de 01d sin commit sobre `ec1c4b3`, con la corrección de T-01 a T-03 (`resumen-programador.md`, "ENTREGAS-01d — Corrección de la ronda 1"). V-01: las 171 `*.ataque` de mi tabla de la ronda 1 coinciden byte a byte (171/171, 0 faltantes, 0 cambiadas). No abrí navegadores ni terminé procesos. El backend no lo corrí (no cambió).

## Regresiones
- `npx vitest run src/features/tareas/entregas-01d-r1.ataque.test.tsx src/features/clases/fila-01d-r1.ataque.test.tsx src/features/tareas/tareas-01a-r1.ataque.test.tsx` → `Test Files  3 passed (3)` · `Tests  51 passed (51)`. Los 4 rojos de la ronda 1 (T-01, T-02 ×2, T-03) pasan; nada de lo que resistía cayó. Las reescritas de la ronda 0 de 01d entran en la corrida completa (abajo).

## Hallazgos
Hay 2 hallazgos bajos sobre el remedio y sus vecinos. Los dos tienen una prueba roja determinista: tres corridas aisladas de `entregas-01d-r2.ataque.test.tsx` dan `Tests  2 failed | 21 passed (23)`. T-01, T-02 y T-03 de la ronda 1 quedan cerrados.

### T-04 — Con el error de enlaces del servidor puesto, un enlace inválido escrito a mano repite el mismo mensaje dos veces bajo el campo
Severidad: baja
Prueba: `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` › "ataque ENTREGAS-01d r2: errores de enlaces del cliente y del servidor a la vez (T-r2-3)" › "con el error del servidor puesto, un enlace inválido escrito a mano: el mismo texto no aparece dos veces y aria-describedby no repite ids"
Reproducción:
1. El servidor responde `400 VALIDACION` `enlaces.0: <mensaje de enlaceDeEntregaSchema>`.
2. Sin quitar ese enlace, el alumno escribe `javascript:alert(1)` y pulsa "Agregar enlace".
Esperado: un solo `ErrorDeCampo` por campo con ese texto (T-r2-3).
Obtenido:
- Dos `ErrorDeCampo` con el mismo mensaje: el local (`idError`) y el del servidor (`${idError}-servidor`).
- `aria-describedby` no repite ids y `aria-invalid` es `true`: esas dos partes resisten. Con la descripción así, el lector de pantalla lee el mismo texto dos veces.
- El error del servidor solo se borra cuando cambia la lista (`handleCambiarEnlaces`). Un intento de agregar que falla no la cambia, así que los dos quedan a la vez.
Requisito: T-r2-3 de la revisión del manager; `DESIGN.md` §7.24 ("se marcan bajo su grupo"; un aviso por error).

### T-05 — Un `TAREA_NO_ENCONTRADA` al comentar con "Ver más comentarios" en vuelo da dos avisos iguales; el segundo sale de un hilo ya desmontado
Severidad: baja
Prueba: `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` › "ataque ENTREGAS-01d r2: comentar con errores (T-r2-4)" › "TAREA_NO_ENCONTRADA al comentar con «Ver más comentarios» en vuelo que también responde 404: un solo aviso"
Reproducción:
1. Hilo con 25 comentarios. El alumno pulsa "Ver más comentarios" y la página sigue en vuelo.
2. Envía un comentario y el servidor responde `404 TAREA_NO_ENCONTRADA` (la tarea se borró).
3. La recarga de la tarea da `404` y la vista pasa a "Esa tarea ya no existe.".
4. La página pendiente responde también `404`.
Esperado: un solo aviso por el mismo hecho, y ningún aviso de una vista que ya no está montada.
Obtenido:
- `toast.error` se llama dos veces con "Esa tarea ya no existe.", y la vista lo dice una tercera.
- El primer aviso es el de `useComentarEnHilo.onError`.
- El segundo es el de `handleVerMas` (`if (resultado.isError) toast.error(...)`), que corre al resolverse `fetchNextPage` cuando `HiloPrivado` ya se desmontó (en la prueba, la página responde después del comentario; el orden inverso no lo probé).
Hermanos sin prueba propia: los mismos dos avisos con `SIN_ACCESO_A_LA_CLASE` (la página también responde `403`), y con un `404` o un `403` al entregar o anular mientras "Ver más" está en vuelo. Un `409` no, porque la página del hilo no falla.
Requisito: "un aviso, uno solo" (T-r2-4 y "cada código… qué anuncia (uno solo)" del encargo); la tabla de hermanos del programador (`resumen-programador.md`, `404` y `403`: "Un aviso").

## Atacado sin hallazgos
Todo está en `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` (23 casos, 21 en verde). Cada caso fija el reloj, cuenta las peticiones desde la acción y comprueba que el foco no quede en `<body>`.
- **T-r2-1 (N-01):** un `409 ENTREGA_YA_REALIZADA` llega con la tarea y la entrega recargándose.
  - Hay un solo `GET` nuevo de la tarea y uno de la entrega, y un aviso.
  - Las respuestas viejas, que llegan después y traen otro título y una entrega asignada, se descartan.
  - La vista dice "Entregado".
- **Al entregar, por código:**
  - `409` `ENTREGA_YA_REALIZADA`, `ENTREGA_CALIFICADA` y `ENTREGA_CERRADA`: tarea y entrega se piden una vez cada una y hay un aviso. Con `CERRADA`, la insignia deja de decir «Asignado».
  - `503 SERVICIO_OCUPADO` y `404 ARCHIVO_NO_ENCONTRADO`: no renuevan nada y dan un aviso.
  - `404 TAREA_NO_ENCONTRADA` y `403 SIN_ACCESO_A_LA_CLASE`: un aviso, la tarea se pide una vez, la vista pasa a su mensaje, sin redirección y con el foco en la raíz.
  - `VALIDACION` de enlaces: ningún `toast` y nada renovado.
- **Al anular (T-r2-2):** `409` `ENTREGA_CALIFICADA`, `ENTREGA_NO_REALIZADA` y `ENTREGA_CERRADA` con la confirmación abierta y el foco en "Sí, anular entrega".
  - La confirmación se cierra: no queda "Cancelar" ni la frase de consecuencia.
  - Hay un aviso, tarea y entrega se piden una vez cada una, y aparecen "Tu entrega ya está calificada." o la frase de cierre.
  - El foco queda dentro de "Tu trabajo".
- **Un `409` tras otro** (`ENTREGA_CERRADA` dos veces, con el servidor aún ofreciendo entregar): un aviso por clic y una recarga por clave por cada `409`. El foco nunca cae en `<body>`.
- **Un `409` con la vista desmontada** (la respuesta llega después de `cleanup()`):
  - Un aviso con el mensaje del servidor y ninguna petición más (las consultas ya no están activas).
  - "Trabajo de clase" queda marcado como viejo.
  - Ni `console.error` ni `console.warn`.
- **T-r2-3, la parte que resiste:**
  - Con los dos errores a la vez, `aria-describedby` no repite ids y `aria-invalid` es `true`.
  - Quitar el enlace que rechazó el servidor borra su error y deja `aria-invalid` en `false`.
- **T-r2-4, al comentar:**
  - `403 SIN_ACCESO_A_LA_CLASE` y `404 TAREA_NO_ENCONTRADA`, sin "Ver más" en vuelo: sin redirección, un aviso, la tarea se pide una vez y el foco no cae en `<body>`.
  - `403 ACCESO_RESTRINGIDO`: `apiClient` redirige una sola vez a `/acceso-restringido` y no se renueva la tarea.
  - `503`: un aviso, ningún `GET`, lo escrito se conserva y el foco sigue en el campo.
- **`HiloPrivado` con `claseId` y `tareaId`:** tras enviar, el campo se vacía y conserva el foco. "Ver más comentarios" queda en `aria-busy` durante la recarga que sigue al envío (`isFetching`) y sale de ella al terminar.
- **Revisión estática del remedio** (`hooks.ts`, `campo-de-enlaces.tsx`, `hilo-privado.tsx`, `tu-trabajo.tsx`, `detalle-tarea-view.tsx`):
  - Sin `disabled`, sin `?? []`, sin `fetch(` y sin importaciones de otros módulos de `features/`.
  - `renovarTrasErrorDeLaEntrega(` se llama exactamente tres veces (entregar, anular y comentar), y `reaccionarAlErrorDeLaEntrega` ya no existe.
  - La corrida completa sigue en verde para V-06, V-07, C-5 y las listas heredadas.
  - `entregas-01d.test.tsx` del programador fija el reloj, incluidos sus 11 casos "Ronda 1 …".
- **`DESIGN.md` §7.24 ("Errores del servidor", revisión manual):** dice que un `409` renueva la tarea, la entrega y "Trabajo de clase", y que el error de enlaces describe el campo. Coincide con el código, salvo la duplicación de T-04.

## No atacado y por qué
- **360 px:** jsdom no calcula el diseño. Queda para la comprobación humana (H-1 y H-7); no lo verifiqué.
- **El orden inverso de T-05** (la página de "Ver más" falla antes que el comentario): no lo probé. Por lectura del código, también da dos avisos.
- **Backend:** no cambió; no lo corrí (instrucción del orquestador). PA-07 no aplica.

## Corridas (una suite a la vez)
1. Regresiones: `npx vitest run src/features/tareas/entregas-01d-r1.ataque.test.tsx src/features/clases/fila-01d-r1.ataque.test.tsx src/features/tareas/tareas-01a-r1.ataque.test.tsx` → `Tests  51 passed (51)`.
2. `npx vitest run src/features/tareas/entregas-01d-r2.ataque.test.tsx`, tres veces → `Tests  2 failed | 21 passed (23)`, con los mismos 2 rojos cada vez.
3. `cd frontend; npm run lint` → código 0, `> tsc -b`.
4. `cd frontend; npm test` → `Test Files  1 failed | 160 passed (161)` · `Tests  2 failed | 2396 passed (2398)` · `Duration  102.93s`. Los 2 rojos son solo T-04 y T-05. Las cifras cuadran con las del manager (160 / 2375) más mi archivo nuevo (1 / 23).

## Veredicto de la ronda 2
**ROTO**: 2 hallazgos bajos (T-04 y T-05); ni críticos, ni altos, ni medios. T-01 a T-03 quedan cerrados y no hay regresiones.

## Tabla de SHA-256 de las 172 `*.ataque` al cierre de la ronda 2 de 01d
| SHA-256 | Archivo | Nota |
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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2C4FE47075244E20C7D3904D364907D0848A75C29CBE784E73EEB144380A91CB` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `EC51A1921087FDB6E68355F7C63AE46F688ED6F78186DA4649B983FD4C1B114C` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` | Nueva (ronda 2 de 01d) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `9F81802D388B09FD2210A7FB863F51F8F9FEDF11B243515B23CE8912CEB43424` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

# Reporte del Tester — ENTREGAS-01d — Ronda 3
Veredicto: **RESISTE** (sin hallazgos; 2 observaciones). Verificación propia: frontend lint con código 0; test `Tests  2425 passed (2425)`. El detalle va al final de esta sección.

Base: árbol de 01d sin commit sobre `ec1c4b3`, con la corrección de T-04 y T-05 (`resumen-programador.md`, "ENTREGAS-01d — Corrección de la ronda 2"). V-01: las 172 `*.ataque` de mi tabla de la ronda 2 coinciden byte a byte (172/172). Aplico el arbitraje vinculante del manager: dos acciones distintas que fallan a la vez con un error que no reemplaza la vista dan dos avisos y no es hallazgo. No abrí navegadores ni terminé procesos. Backend no corrido (no cambió).

## Regresiones
- `npx vitest run src/features/tareas/entregas-01d-r1.ataque.test.tsx src/features/tareas/entregas-01d-r2.ataque.test.tsx src/features/clases/fila-01d-r1.ataque.test.tsx src/features/tareas/tareas-01a-r1.ataque.test.tsx` → `Test Files  4 passed (4)` · `Tests  74 passed (74)`. T-04 y T-05 pasan; nada de lo que resistía cayó. Las reescritas de la ronda 0 de 01d entran en la corrida completa (abajo).

## Hallazgos
Ninguno. T-04 y T-05 quedan cerrados.

## Atacado sin hallazgos
Todo está en `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` (17 casos, todos en verde y estables en tres corridas aisladas). El reloj está fijo y cada caso cuenta las peticiones desde la acción.
- **T-r3-1, un aviso por tarea perdida y por carga:**
  - Comentar y entregar fallan a la vez con `404 TAREA_NO_ENCONTRADA`: hay un solo aviso, la vista dice "Esa tarea ya no existe." y el foco no cae en `<body>`.
  - En la misma carga, un segundo `403 SIN_ACCESO_A_LA_CLASE` mientras la tarea aún se recarga no repite el aviso, tampoco cuando la recarga termina con `403`.
  - Con otra carga de la misma tarea, el aviso se repite: un `403` al comentar, la tarea recarga bien (otro `dataUpdatedAt`) y un segundo `403` vuelve a avisar.
  - "Otra tarea" no tiene caso propio. El `WeakMap` usa como llave la instancia de la consulta, así que otra tarea es otra llave. Lo cubren por separado los casos de una tarea perdida, cada uno con su `QueryClient`.
- **T-r3-2 (N-02), dos `404` a la vez:**
  - Entregar y "Ver más comentarios": un solo aviso y la vista pasa a "Esa tarea ya no existe.".
  - Comentar y "Ver más": salen **dos** `GET` de la tarea. Ninguno se aborta en la red, porque `consultaTarea` no pasa `signal`. Aun así, la primera recarga responde `200` ("Revivida") al final y **no revive la vista**: TanStack la descartó al cancelarla. Hay un aviso.
  - Leo "debe completarse un solo `GET`" como "un solo resultado aplicado": se cumple. En la red no se cumple; queda como observación (O-1d3-1).
- **T-r3-3, un segundo rechazo del servidor:**
  - En "Enlace", el segundo rechazo deja solo "Mensaje dos.". `aria-describedby` no repite ids, describe el mensaje nuevo y no el viejo, `aria-invalid` es `true` y no hay `toast`.
  - En el hilo, igual: queda solo "Texto dos.", que es la descripción accesible del campo.
- **Descartar el error del servidor:** en "Enlace", al escribir, al agregar uno válido y al quitar, con `aria-invalid` de vuelta en `false`; en el hilo, al escribir. El caso de error local y del servidor idénticos lo cubre mi T-04 de la ronda 2 (en verde).
- **T-r3-4, sesión perdida y `503`:**
  - "Ver más comentarios" con `401` y refresco rechazado: una redirección a `/login`, un solo refresco y ningún aviso.
  - "Enviar comentario" y "Entregar tarea" en el mismo caso: una redirección, un solo refresco, ninguna recarga de la tarea y como mucho un aviso (ver O-1d3-2).
  - "Ver más" con un `503` que llega después de desmontar: ningún aviso y nada en `console.error`.
  - "Enviar comentario" y "Entregar tarea" con un `503` después de desmontar: un aviso (el del gancho, por diseño), ninguna petición más y nada en la consola.
- **Un `409` y un `404` a la vez** (entregar y comentar): la vista termina en "Esa tarea ya no existe.", sin avisos repetidos. Salen dos avisos distintos, el `409` y el `404`, cada uno con su mensaje: son dos acciones con dos errores distintos (arbitraje del manager).
- **Revisión estática del remedio:**
  - `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` es exactamente `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO` y `NO_AUTENTICADO`, los tres que `apiClient` trata así.
  - No hay ganchos de entregas nuevos exportados: `useMiEntrega`, `useEntregar`, `useAnularEntrega`, `useHiloPrivado` y `useComentarEnHilo`.
  - En `hooks.ts`, `lib.ts`, `data.ts`, `campo-de-enlaces.tsx`, `formulario-de-entrega.tsx`, `hilo-privado.tsx` y `detalle-tarea-view.tsx`: sin `disabled`, sin `?? []`, sin `fetch(` y sin importaciones de otros módulos de `features/`.
  - La corrida completa sigue en verde para V-06, V-07, C-5 y las listas heredadas.
- **`DESIGN.md` §7.24 y §7.25 (revisión manual del texto):** el mensaje único por campo, el descarte al escribir, agregar o quitar, y "Ver más" sin aviso cuando el error reemplaza la vista, redirige o el hilo se desmontó coinciden con el código.

## Observaciones (no son hallazgos)
- **O-1d3-1 (N-02):** con dos `404` a la vez salen dos `GET` de la tarea y los dos llegan al servidor, porque `consultaTarea` no pasa el `AbortSignal` de TanStack a `apiClient`. Solo se aplica el resultado de la segunda, y la primera, aunque responda después, no cambia la vista. Destino: el manager decide; pasar `signal` en `consultaTarea` está fuera de lo que tocó 01d (`services/trabajoService.ts`).
- **O-1d3-2:** con la sesión perdida, "Enviar comentario" y "Entregar tarea" redirigen a `/login` y además llaman a `toast.error("Algo salió mal. Inténtalo de nuevo.")`. "Ver más" no avisa (`errorQueRedirigeElCliente`). La recarga completa de `irA` hace casi invisible ese aviso, y, por lectura del código, `useEditarTarea` (de antes de ENTREGAS) hace lo mismo: `mensajeDeErrorTareas` no conoce `NO_AUTENTICADO`. Lo comprobé con una sonda temporal sobre los dos casos de esta ronda; los dos avisan, y luego restauré la prueba (SHA-256 sin cambios). No lo cuento como hallazgo; lo dejo por si el manager quiere extender la regla de redirección a `avisarDelErrorDeLaEntrega`.

## No atacado y por qué
- **360 px:** jsdom no calcula el diseño. Queda para la comprobación humana (H-1 y H-7); no lo verifiqué.
- **Backend:** no cambió; no lo corrí (instrucción del orquestador). PA-07 no aplica.

## Corridas (una suite a la vez)
1. Regresiones: `npx vitest run src/features/tareas/entregas-01d-r1.ataque.test.tsx src/features/tareas/entregas-01d-r2.ataque.test.tsx src/features/clases/fila-01d-r1.ataque.test.tsx src/features/tareas/tareas-01a-r1.ataque.test.tsx` → `Tests  74 passed (74)`.
2. `npx vitest run src/features/tareas/entregas-01d-r3.ataque.test.tsx`, tres veces → `Tests  17 passed (17)`.
3. `cd frontend; npm run lint` → código 0, `> tsc -b`.
4. `cd frontend; npm test` → `Test Files  162 passed (162)` · `Tests  2425 passed (2425)` · `Duration  104.74s`. Las cifras cuadran con las del manager (161 / 2408) más mi archivo nuevo (1 / 17).

## Veredicto de la ronda 3
**RESISTE**: sin hallazgos y con dos observaciones (O-1d3-1 y O-1d3-2).

## Tabla de SHA-256 de las 173 `*.ataque` al cierre de la ronda 3 de 01d
| SHA-256 | Archivo | Nota |
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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2C4FE47075244E20C7D3904D364907D0848A75C29CBE784E73EEB144380A91CB` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `EC51A1921087FDB6E68355F7C63AE46F688ED6F78186DA4649B983FD4C1B114C` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `7705E7AD12BE458ACF68148544F87B1F77FEF79344C2CC9DBFC3A27792A2E4CB` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Nueva (ronda 3 de 01d) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `9F81802D388B09FD2210A7FB863F51F8F9FEDF11B243515B23CE8912CEB43424` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

# Reporte del Tester — ENTREGAS-01e — Ronda 0
Veredicto: **LISTA PARA IMPLEMENTAR, con 9 condiciones de diseño** (abajo, "Condiciones"); sin PARADA. Verificación propia: frontend lint con código 0; test con 1 rojo, el esperado (C-12, V-06). El backend no lo corrí porque no lo toqué.

Base de 01e dentro de los paquetes: `<K1d>` = `d6794d6` (HEAD de `feat/entregas`; en el árbol solo cambian `docs/ESTADO.md` y `aprobacion.md`). Aún no hay código de 01e.

## PA-01 y precondiciones
- **Docker:** 28.5.1.
- **Red:** hoy es `IZZI-F281-5G`, perfil `Public`, no `uacam5 2`. La regla "Campus: bloquear entrada a Docker en redes publicas" está `True`, `Inbound`, `Block`, `Public`, la misma situación que el orquestador aceptó en la ronda 0 de 01a. En esta ronda no corro la suite del backend, así que PA-01 no entra en juego; lo anoto para el orquestador porque la red cambió desde la declaración de hoy.
- **`shared`:** `cd shared; npm run build`, código 0.
- No abrí navegadores ni terminé procesos.

## V-01 — 173/173
Comparé con mi tabla del cierre de la ronda 3 de 01d sobre `d6794d6`, antes de reescribir nada: **173 coinciden, 0 faltantes, 0 sobrantes**.

## Inventario de §D-R0 para 01e
Archivos nuevos o tocados por §D-10 (plan, "Cambios por capa → frontend → 01e"):
- `features/tareas/{entregas-view.tsx, entrega-de-alumno-view.tsx}`;
- `features/tareas/components/{panel-de-entregas.tsx, tabla-de-entregas.tsx}`;
- `features/tareas/components/acciones-de-la-tarea.tsx` (§D-10.5);
- `features/tareas/{detalle-tarea-view.tsx, data.ts, lib.ts, hooks.ts, types.ts}`;
- `app/router.tsx`.

Nada de `features/clases` (está en "No se toca" para 01e).

| Lista o inventario (archivo › caso) | Qué fija | ¿Rompe con 01e? |
|---|---|---|
| `styles/clases-r1.ataque` › **V-06** | 53 `enEspera=` con una lista fija por archivo; fuera de la lista, solo `features/admin/components` (2) y el roster de `features/clases/components` (3) | **Sí, prevista** (§D-R0 "01d y 01e"). "Ver más alumnos" (§D-10.2) y "Borrar con las entregas" (§D-10.5.5) suman 2: **C-12**, de 53 a 55. |
| `styles/clases-r1.ataque` › **V-07** | Archivos con `vidrio`, `vidrio-fuerte`, `vidrio-azul`; `data-material` y `data-densidad` solo en `contenedor-rol.tsx` (igualdad exacta) | **No**, si 01e no usa vidrio ni `data-material`. §D-10.2 pone la tabla opaca dentro del `Card`, como el roster (`tabla-alumnos.tsx` no usa ninguno), dice "sin `data-material="opaco"` en el maestro" y el admin ya es opaco por su contenedor. La lista no cambia → condición 3. |
| `features/clases/estatico-02c-r1.ataque` › "§D-2C1: … perspectivaDeRuta" | `perspectivaDeRuta(` solo en `categorias-view`, `clase-layout`, `muro-view`, `trabajo-view` y `features/tareas/hooks.ts`; nadie compara `pathname` con un prefijo | **No**, si las vistas nuevas y `detalle-tarea-view.tsx` (`puedeConfirmarEntregas`) toman la perspectiva de `useRutaDeLaClase` (hooks.ts), como hoy. La lista no cambia → condición 2. |
| `estatico-02c-r1` › "C-13 y A-5: … puedeBorrar" | Lectores de `.puedeBorrar`: los dos del muro y `acciones-de-la-tarea.tsx` | **No**: §D-10.5 sigue leyendo `tarea.puedeBorrar` solo en `acciones-de-la-tarea.tsx`, y `puedeConfirmarEntregas` no casa con la regla. Condición 4: ningún archivo nuevo lee `.puedeBorrar`. |
| `estatico-02c-r1` › `.administracion` solo en `firma-del-autor.tsx`; ningún `.propio`; ningún `"Administración"` literal fuera de `data.ts` | | **No**, si la entrega del alumno reutiliza `HiloPrivado` y `FirmaDelAutor` tal cual → condición 5. |
| `features/clases/ver-mas-01e-r3.ataque` › "los 14 archivos de 01e existen; …" (incluye `acciones-de-la-tarea.tsx`) | En `acciones-de-la-tarea.tsx`: solo tipos `…Props`, sin `?? []`, `disabled`, `fetch(`, `console.`, `dangerouslySetInnerHTML`, valores arbitrarios ni importaciones de `features/clases` | **No**: §D-10.5 no necesita nada de eso. |
| `features/tareas/tareas-01d-r1.ataque` › "sin fetch(, console., ?? [], … target=_blank solo en lista-de-enlaces.tsx …" (C-5) | En todo `features/tareas` | **No**: 01e reutiliza `ListaDeEnlaces` y no suma ningún `_blank`. |
| `tareas-01d-r1.ataque` › "doble clic humano (30 ms) en «Sí, borrar tarea» manda un solo DELETE" (`:365`) | Un `DELETE` y la navegación a "Trabajo de clase"; el doble de `fetch` solo responde el `GET` de la tarea | **No** (fila "Diseño" de la Enmienda 2), **siempre que `PanelDeEntregas` no pida nada** (§D-10.1 lo dice) → condición 6. |
| `tareas-01d-r2.ataque` › "detalle: un DELETE que responde 404/403 …" (`:329`) y "edición: un PUT …" (`:341`) | Aviso y nueva lectura de la tarea | **No** (fila "Diseño"): el retorno temprano de `useBorrarTarea.onError` es solo para `TAREA_CON_ENTREGAS`. |
| `tareas-01d-r2.ataque` › "sin disabled en JSX, sin clases de las escalas anuladas, … y sin importar de otro módulo de features" | En todo `features/tareas`: `from "@/features/…"` está prohibido, **también** `@/features/tareas/…` | **No**, si los archivos nuevos importan entre sí con rutas relativas → condición 7. |
| `tareas-01d-r3.ataque` › tipos fuera de `types.ts` | En `features/tareas` solo las interfaces `…Props` de los `.tsx` | **No**, si los tipos de las vistas nuevas van en `types.ts` (regla 1 de CLAUDE.md). |
| `components/layout/estatico-r1.ataque` › **V-16** `fixed` solo en `barra-navegacion.tsx` y `dialog.tsx` (con `\bfixed\b`) | | **No**, si la tabla no usa `table-fixed` (la regex lo cuenta) ni `fixed` → condición 8. V-15 (`animate-`) y `<a href="…">` literal: no aplican si "Ver entregas", "Ver entrega" y los "Volver" son `Link`. |
| `features/clases/refactor-01c-r1.ataque` | Destinos de lo movido; `components/`, `lib/` y `services/` no importan de `features/` | **No**: 01e no toca esos archivos. |
| Rutas del router | Ninguna `*.ataque` fija un inventario de rutas de `router.tsx` (busqué `path:`, `routes`, `matchRoutes` y rutas con un segmento después de `tareas/:id`). `estatico-02c-r1` solo fija la línea de `clases/nueva` | **No**. |
| Mis `*.ataque` de 01d (`entregas-01d-r1`, `-r2`, `-r3`, `fila-01d-r1`) | `r1`: listas fijas de archivos de 01d y reglas en todo `src/` (`fetch(` solo en `apiClient` y `almacenService`, `_blank` solo en `lista-de-enlaces`). `r2`: `renovarTrasErrorDeLaEntrega(` llamado **3** veces. `r3`: `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` exacto y los ganchos de entregas exportados con `toEqual` | **Sí, prevista por la regla de §D-R0**, solo `r3` › "sin ganchos nuevos exportados…": 01e suma a `hooks.ts` los ganchos de la lista y de la entrega de un alumno, cuyo nombre lleva "Entrega" → **C-13**. `r2`: **no**, si 01e no suma llamadas a `renovarTrasErrorDeLaEntrega` (el maestro reutiliza `useComentarEnHilo` y `useHiloPrivado`) → condición 9. |
| Textos de borrar | Ninguna `*.ataque` fija "Se borrará con su rúbrica y sus adjuntos." (solo `detalle-tarea-view.test.tsx:210/:217`, normal, en la lista cerrada del programador). `muro-c-r1:523` fija "Se borrará con sus comentarios.", que es del muro | **No**. |

Conclusión: **solo rompen las previstas** (V-06 → C-12; el inventario de ganchos de mi `r3` → C-13, del tipo "lista cerrada que suma archivos nuevos" de §D-R0). No hay PA-02.

## Condiciones para el programador (si alguna no se puede cumplir, es PA-02 y se detiene)
1. **"Ver más alumnos" vive en `entregas-view.tsx`** (1 `enEspera=`) y `tabla-de-entregas.tsx`, `entrega-de-alumno-view.tsx` y `panel-de-entregas.tsx` no llevan `enEspera=`. En `acciones-de-la-tarea.tsx` hay exactamente 2: "Sí, borrar tarea" y "Borrar con las entregas". Total: 55.
2. Las vistas nuevas y `detalle-tarea-view.tsx` toman la perspectiva de `useRutaDeLaClase`: ningún llamador nuevo de `perspectivaDeRuta(` ni comparación de `pathname`.
3. Sin `vidrio`, `vidrio-fuerte`, `vidrio-azul`, `data-material` ni `data-densidad` en los archivos nuevos (el `Card` trae su vidrio).
4. Ningún archivo nuevo lee `.puedeBorrar`.
5. `HiloPrivado` y `FirmaDelAutor` se reutilizan tal cual: ningún `.propio` ni `.administracion` fuera de la firma.
6. `PanelDeEntregas` no hace peticiones (§D-10.1).
7. Los archivos nuevos de `features/tareas` importan entre sí con rutas relativas, nunca con `@/features/…`.
8. Ningún `fixed` (tampoco `table-fixed`) ni `animate-` en los archivos nuevos.
9. 01e no suma llamadas a `renovarTrasErrorDeLaEntrega` (hoy son 3: entregar, anular y comentar). Si el maestro necesitara una regla de renovación propia, es PA-02.

## Reescrituras (A-4)
- **C-12** — `frontend/src/styles/clases-r1.ataque.test.ts` › "V-06: … 55 enEspera" (ancla: `const fijos`):
  - Título: "53 enEspera" pasa a "55 enEspera", y `toHaveLength(53)` pasa a `55`.
  - `acciones-de-la-tarea.tsx` pasa de 1 a 2.
  - Suma `entregas-view.tsx: 1`, `components/tabla-de-entregas.tsx: 0`, `entrega-de-alumno-view.tsx: 0` y `components/panel-de-entregas.tsx: 0`.
  - Lleva un comentario con el motivo. No cambia ninguna otra aserción.
- **C-13** — `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` › "sin ganchos nuevos del alumno ni del hilo en hooks.ts respecto a la ronda 1 (01e suma solo los de las entregas del maestro y del admin)" (ancla: `const deEntregas`):
  - El filtro `/Entrega|Hilo|Comentar|Entregar|Anular/` pasa a `/MiEntrega|Hilo|Comentar|Entregar|Anular/`.
  - El título cambia como arriba y lleva un comentario con el motivo.
  - La igualdad exacta con los 5 ganchos de 01d no cambia.

## Rojos esperados (de esta ronda a la entrega del programador)
| Prueba | Hoy (`d6794d6` + C-12 y C-13) | Vuelve a verde |
|---|---|---|
| `styles/clases-r1.ataque` › "V-06: … 55 enEspera" | **Roja**, y es la única roja de la corrida: `expected [ …(53) ] to have a length of 55 but got 53` | En el paso 1 de 01e, cuando existan "Ver más alumnos" en `entregas-view.tsx` y "Borrar con las entregas" en `acciones-de-la-tarea.tsx` |
| `entregas-01d-r3.ataque` (C-13) | Verde (los 5 ganchos de hoy cumplen el filtro nuevo) | — |

Cualquier otra roja en la entrega del programador es PA-02.

## Corridas (una suite a la vez)
1. `cd shared; npm run build` → código 0.
2. `cd frontend; npm run lint` → código 0, `> tsc -b`.
3. `cd frontend; npm test` → `Test Files  1 failed | 161 passed (162)` · `Tests  1 failed | 2424 passed (2425)` · `Duration  107.10s`. El único rojo es V-06 (C-12), el esperado.
4. Backend: no corrido (no cambia en 01e).

## Observaciones para el programador y para mi ronda 1 (no aplicadas)
- **"Ver más alumnos":**
  - En espera con `isFetching`, no con `isFetchingNextPage` (CLAUDE.md, T-19).
  - Si desaparece al cargar la última página, el foco va a la primera fila nueva o al `h2` "Entregas", nunca a `<body>`, como en `HiloPrivado`.
  - El `400` del cursor dice su texto y no un aviso genérico.
- **`ALUMNO_NO_ENCONTRADO`** reemplaza la vista como `TAREA_NO_ENCONTRADA`, sin un camino paralelo; con el foco en un control que desaparece, a la raíz.
- **Hilo del admin:** el formulario no se pinta (`puedeEscribir` solo en la perspectiva de maestro). En la ronda 1 compruebo que el admin no ve "Enviar comentario" y que, si el servidor le respondiera, la vista no ofrece escribir.
- **Ataques planeados para la ronda 1:**
  - El alumno que escribe la URL del maestro (`/estudiante/…/entregas` debe caer en `*`).
  - Dobles del maestro con `estadoPago` o `correo`: el esquema estricto debe rechazarlos y no se pinta nada (PR-1E07).
  - "Borrar con las entregas" solo para el admin, con guarda síncrona con ref y `enEspera`; doble clic humano (30 ms) = un `DELETE`; el maestro nunca envía `confirmar`; el primer `DELETE` del admin va sin consulta.
  - `409` → `404` al confirmar (aviso, vista reemplazada y foco en la raíz); `409` → 5xx (el segundo paso sigue y la guarda se libera).
  - "Cancelar" con el borrado en vuelo no cierra nada (O-2 de la Enmienda 2).
  - Un solo anuncio del `409` (en línea, sin `toast`).
- **Matriz de avisos y recargas** (recomendación del manager): para cada error de la lista y de la entrega de un alumno, qué renueva y qué anuncia (uno solo). Arbitraje vigente de 01d: dos acciones distintas con el mismo error que no reemplaza la vista dan dos avisos.

## No atacado y por qué
- Aún no hay código de 01e: esta ronda solo hace el inventario, las reescrituras y las condiciones.
- 360 px: a la comprobación humana (H-4).

## Veredicto de la ronda 0 de 01e
**LISTA PARA IMPLEMENTAR, con 9 condiciones de diseño** (arriba). No hay PARADA: las dos reescrituras son de listas cerradas que §D-R0 prevé, y el plan admite una implementación que cumple las 9 condiciones.

## Tabla de SHA-256 de las 173 `*.ataque` al cierre de la ronda 0 de 01e (base de V-01 del programador y del manager en 01e)
| SHA-256 | Archivo | Nota |
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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2C4FE47075244E20C7D3904D364907D0848A75C29CBE784E73EEB144380A91CB` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `EC51A1921087FDB6E68355F7C63AE46F688ED6F78186DA4649B983FD4C1B114C` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `0D5DD62306776126EAC593EFFA4C543D1A73560E1B743DA650EC5B6DEFB50873` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (C-13) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` | Reescrita (C-12, V-06) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

# Reporte del Tester — ENTREGAS-01e — Ronda 1
Veredicto: **ROTO** (1 hallazgo medio: T-01). Verificación propia: frontend lint con código 0; test `Tests  3 failed | 2484 passed (2487)`, y los 3 rojos son solo T-01. El detalle va al final de esta sección.

Base: árbol de 01e sin commit sobre `d6794d6`. V-01: las 173 `*.ataque` de mi tabla de la ronda 0 de 01e coinciden byte a byte (173/173). PA-01: no corro el backend. No abrí navegadores ni terminé procesos.

## Regresiones
- `npx vitest run` sobre mis `*.ataque` del frontend (`entregas-01d-r1`, `-r2`, `-r3` con C-13, `fila-01d-r1`, `tareas-01a-r1` y `styles/clases-r1` con C-12) → `Test Files  6 passed (6)` · `Tests  102 passed (102)`. C-12 (V-06, 55 `enEspera`) ya está en verde.

## Hallazgos
Un hallazgo medio. Su prueba es roja y determinista en tres corridas aisladas de `entregas-01e-r1.ataque.test.tsx`: `Tests  3 failed | 26 passed (29)`, los tres casos de un mismo `it.each`.

### T-01 — Descargar un adjunto con un error que reemplaza la vista (`404 ALUMNO_NO_ENCONTRADO`, `403 SIN_ACCESO_A_LA_CLASE`, `404 TAREA_NO_ENCONTRADA`) solo avisa: la entrega del alumno sigue a la vista
Severidad: media
Prueba: `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` › "ataque ENTREGAS-01e r1: la entrega de un alumno (T-r1-1 y T-r1-2)" › "descargar un adjunto con $estado $codigo: un aviso como máximo, la vista se reemplaza por «$mensaje» y el foco no cae en <body>". Son tres casos, uno por código, y los tres fallan en la misma aserción.
Reproducción: el maestro abre la entrega de un alumno y pulsa "Descargar trabajo.pdf". El `POST …/entregas/:alumnoId/archivos/:archivoId/descarga` responde el error, y el servidor respondería lo mismo a la entrega y a la tarea.
Esperado: lo que pide T-r1-1 del manager ("la descarga de un adjunto… un aviso como máximo, la vista reemplazada y el foco en la raíz") y T-r1-2 ("con `ALUMNO_NO_ENCONTRADO`, el reemplazo de la vista"). Es la misma regla que la matriz del programador aplica a "Enviar comentario" y "Ver más comentarios": el error reemplaza la vista.
Obtenido:
- Sale un aviso (`toast.error` con el mensaje), y eso cumple.
- Nada se renueva: `descargar` de `components/adjuntos/adjuntos-de-publicacion.tsx` solo hace `toast.error(mensajeDeError(error))`, y `useUrlDeDescargaEn` no tiene `onError`.
- La vista sigue mostrando el `h2` "Ana Ruiz", la insignia, los adjuntos y el hilo con su formulario. El maestro puede seguir pulsando "Descargar" y escribiendo en el hilo de un alumno que ya no está, o de una tarea que ya no existe.
- La matriz de avisos y recargas del resumen no tiene una fila para "Descargar un adjunto".
Hermanos (mismo mecanismo, sin prueba propia):
- Los adjuntos de la tarea en el detalle (`AdjuntosDePublicacion` sin `rutaDeArchivos`).
- La descarga del alumno en "Tu trabajo" (01d) con `404 TAREA_NO_ENCONTRADA` o `403 SIN_ACCESO_A_LA_CLASE`.
- En los dos, por lectura del código, pasa lo mismo: un aviso y ninguna renovación.
Requisito: §D-10.3 (`404 ALUMNO_NO_ENCONTRADO` → "No encontramos a ese alumno en esta clase."; `404 TAREA_NO_ENCONTRADA` → "Esa tarea ya no existe."); T-r1-1 y T-r1-2 de la revisión del manager; la regla de hermanos (AGENTS.md), porque la matriz cubre el hilo y no la descarga.

## Atacado sin hallazgos
Todo está en `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` (29 casos, 26 en verde). El reloj está fijo y el servidor es un doble en memoria.
- **Dobles con campos de más (PR-1E07):** una fila con `estadoPago` o `accesoRestringido`, un alumno con `email`, y la entrega de un alumno con `estadoPago`, `accesoRestringido` o `email`. El esquema estricto los rechaza: la vista dice "Algo salió mal. Inténtalo de nuevo.", no pinta al alumno ni "Ver entrega" y no aparece "Deudor" ni el correo.
- **"Ver más alumnos" (T-r1-3):**
  - Tres clics en vuelo: un solo `GET` con cursor, en espera, 21 filas con `href` únicos y el foco fuera de `<body>`.
  - Durante una recarga de la lista: en espera (`isFetching`); un clic no pide la página siguiente y las filas no se duplican.
  - Con la vista desmontada y un `503`: ningún aviso y nada en `console.error`.
  - Con la sesión perdida (`401` y refresco rechazado): una redirección a `/login` y ningún aviso.
  - El `400` del cursor dice su texto, sin aviso; el botón desaparece y el foco no cae en `<body>`.
- **Conteo (T-r1-5):** sale de la página más reciente ("Entregaron 3 de 25" y luego "7 de 26"), no de contar filas, y el anterior desaparece. En singular: "Entregaron 0 de 1 alumno.".
- **Entrega de un alumno:**
  - La descarga va por `…/entregas/:alumnoId/archivos/:id/descarga` y nunca por la ruta de la clase.
  - Una recarga de la entrega con `404 ALUMNO_NO_ENCONTRADO` y el foco en "Descargar": la vista se reemplaza, sin aviso, y el foco va a la raíz.
  - `ARCHIVO_NO_ENCONTRADO` al descargar: un aviso, la vista sigue y el foco se queda en "Descargar".
  - "Enviar comentario" y "Ver más comentarios" con `404 ALUMNO_NO_ENCONTRADO` a la vez: un aviso como máximo, la vista se reemplaza (sin formulario) y el foco no cae en `<body>`.
  - El maestro escribe: dos clics y dos `submit` en vuelo dan un solo `POST`, en espera.
  - El admin: sin campo, sin "Enviar comentario" y sin ningún `textbox`; ve la nota de solo lectura y el texto de privacidad de los maestros, también con el hilo en error.
  - Calificada con retraso: "Calificado" y "Entregó el …".
- **Borrar (T-r1-4):**
  - Admin con `409`: el mensaje en `role="alert"`, el foco en "Cancelar", "Borrar con las entregas" y ningún "Sí, borrar tarea". "Cancelar" vuelve a "Borrar tarea" con el foco. El segundo intento da el mismo segundo paso.
  - Los dos `DELETE` del primer paso van sin `confirmar`. "Borrar con las entregas" manda exactamente `…?confirmar=entregas`, navega a "Trabajo de clase" y da un solo aviso de éxito y ninguno de error.
  - "Cancelar" pulsado con el primer `DELETE` en vuelo no cierra nada: al llegar el `409` aparece el segundo paso con el foco en "Cancelar".
  - En la perspectiva de maestro, con el `409`, no queda ningún botón "Borrar…" ni sale `confirmar`. La perspectiva sale de la ruta, así que un perfil de admin en `/maestro/…` ve lo mismo; el router además fija las ramas por rol (PR-1E05).
- **Panel "Entregas":** para maestro y admin, el enlace lleva a `/<perspectiva>/clases/:claseId/tareas/:tareaId/entregas` y el detalle no pide nada de `/entregas` ni de `/entrega`. El estudiante no ve ni el panel ni el enlace, y nada pide `/entregas`.
- **El alumno en la URL del maestro:** cae en `*` (a `/login`) sin pedir nada de entregas. Lo cubre `app/router-01e.test.tsx` (PR-1E05), que revisé; no le sumé un caso.
- **Revisión estática de los 10 archivos de 01e:**
  - Sin `disabled`, `?? []`, `fetch(`, `console.`, valores por defecto en `estadoPago`, `accesoRestringido`, `rol` ni `calificacion`, vidrio, `data-material`, `fixed`, `animate-` ni importaciones `@/features/…`.
  - Las vistas nuevas no mencionan `estadoPago`, `accesoRestringido`, `email` ni el correo, ni llaman a `perspectivaDeRuta(`.
  - `renovarTrasErrorDeLaEntrega(` sigue en 3.
  - V-06 (55), V-07, C-5 y las listas heredadas siguen en verde.

## Observaciones (no son hallazgos)
- **O-1e1-1 (por lectura del código):** con la lista vacía, la vista dice a la vez "Entregaron 0 de 0 alumnos." y "Aún no hay alumnos en esta clase.". Es redundante, pero el plan no lo prohíbe. Para el manager.
- **O-1e1-2 (por lectura del código):** el `400` del cursor cambia toda la tabla por el mensaje (las filas ya cargadas desaparecen) y el conteo sigue a la vista. Es coherente con el texto ("vuelve a abrir Entregas").

## No atacado y por qué
- **360 px** (la tabla que se desplaza dentro de su contenedor, las insignias legibles): jsdom no calcula el diseño. Queda para la comprobación humana (H-4); no lo verifiqué.
- **Backend:** no cambió; no lo corrí (instrucción del orquestador).

## Corridas (una suite a la vez)
1. Regresiones: mis seis `*.ataque` previas del frontend → `Tests  102 passed (102)`.
2. `npx vitest run src/features/tareas/entregas-01e-r1.ataque.test.tsx`, tres veces → `Tests  3 failed | 26 passed (29)`, con los mismos 3 rojos (T-01).
3. `cd frontend; npm run lint` → código 0, `> tsc -b`.
4. `cd frontend; npm test` → `Test Files  1 failed | 164 passed (165)` · `Tests  3 failed | 2484 passed (2487)` · `Duration  106.92s`. Los 3 rojos son solo T-01. Las cifras cuadran con las del manager (164 / 2458) más mi archivo nuevo (1 / 29).

## Veredicto de la ronda 1 de 01e
**ROTO**: 1 hallazgo medio (T-01, con tres casos rojos).

## Tabla de SHA-256 de las 174 `*.ataque` al cierre de la ronda 1 de 01e
| SHA-256 | Archivo | Nota |
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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2C4FE47075244E20C7D3904D364907D0848A75C29CBE784E73EEB144380A91CB` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `EC51A1921087FDB6E68355F7C63AE46F688ED6F78186DA4649B983FD4C1B114C` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `0D5DD62306776126EAC593EFFA4C543D1A73560E1B743DA650EC5B6DEFB50873` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `740C526EFADAF15A849A5ECFF1A0D9F9D00FBA76F1C19775FEF71E3D833A2732` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | Nueva (ronda 1 de 01e) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

# Reporte del Tester — ENTREGAS-01e — Ronda 2
Veredicto: **RESISTE** (sin hallazgos). Verificación propia: frontend lint con código 0; test `Tests  2529 passed (2529)`. El detalle va al final de esta sección.

Base: árbol de 01e sin commit sobre `d6794d6`, con la corrección de T-01. V-01: las 174 `*.ataque` de mi tabla de la ronda 1 de 01e coinciden byte a byte (174/174). Aplico el arbitraje del manager: O-1e1-1 y O-1e1-2 no son hallazgos. No abrí navegadores ni terminé procesos. Backend no corrido (no cambió).

## Regresiones
- `npx vitest run` sobre mis `*.ataque` del frontend (`entregas-01e-r1`, `entregas-01d-r1`, `-r2`, `-r3`, `fila-01d-r1`, `tareas-01a-r1` y `styles/clases-r1`), más `refactor-01c-r1` como control de R-04 → `Test Files  8 passed (8)` · `Tests  142 passed (142)`. Los 3 rojos de T-01 pasan.

## Hallazgos
Ninguno. T-01 queda cerrado.

## Atacado sin hallazgos
Todo está en `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` (31 casos, todos en verde y estables en tres corridas aisladas). El reloj está fijo y el servidor es un doble en memoria.
- **T-r2-1:**
  - En la entrega de un alumno, la descarga y la recarga de la tarea, de la entrega y del hilo responden `404 TAREA_NO_ENCONTRADA` a la vez. Hay un solo aviso ("Esa tarea ya no existe."), la vista se reemplaza y el foco va a la raíz.
  - Dos descargas en vuelo con el mismo `404` dan un solo aviso.
  - Dos descargas seguidas con `ARCHIVO_NO_ENCONTRADO` dan un aviso cada una: la vista se queda, el foco sigue en el último "Descargar" y la tarea no se vuelve a pedir.
- **T-r2-2:** con la vista desmontada, una descarga que responde `404 TAREA_NO_ENCONTRADA` o `503` da como mucho un aviso, es decir, el de la acción del usuario (patrón T-30 que el manager aceptó en 01d). No hay ninguna petición más, nada en `console.error` y ninguna redirección.
- **T-r2-3, en cinco vistas** (entrega de un alumno vista por el maestro y por el admin, detalle del maestro, detalle del admin y "Tu trabajo" del alumno):
  - `404 TAREA_NO_ENCONTRADA` y `403 SIN_ACCESO_A_LA_CLASE`, y en la entrega de un alumno también `404 ALUMNO_NO_ENCONTRADO`: exactamente un aviso con su mensaje y la vista pasa a ese mensaje, sin "Descargar", sin redirección y con el foco fuera de `<body>` (12 casos).
  - `ARCHIVO_NO_ENCONTRADO` y después `503`: un aviso cada uno, ningún `GET` (nada se renueva), y "Descargar" sigue siendo el mismo elemento y conserva el foco (5 casos).
  - Sesión perdida (`401` y refresco rechazado): una redirección a `/login` y ningún aviso (5 casos).
- **T-r2-4 (R-04):** `AdjuntosDePublicacion` sin la prop, como en el muro y en "Trabajo de clase". Con `404`, `403` o `503` da un solo aviso con el mensaje del módulo, una única petición por la ruta de la clase y ninguna renovación. `refactor-01c-r1.ataque` y `reexportaciones-01c.test.ts` siguen en verde.
- **Revisión estática:**
  - `adjuntos-de-publicacion.tsx` suma solo la prop opcional `alFallarLaDescarga?: (error: unknown) => void` y no importa de `features/`.
  - `components/adjuntos/hooks.ts` sigue exportando los mismos 4 ganchos.
  - `renovarTrasErrorDeLaEntrega(` sigue en 3.
  - En los 6 archivos que cambiaron: sin `disabled`, sin `?? []`, sin `fetch(` y sin importaciones `@/features/…`. V-06, V-07, C-5 y las listas heredadas siguen en verde en la corrida completa.

## No atacado y por qué
- **360 px:** jsdom no calcula el diseño. Queda para la comprobación humana (H-4); no lo verifiqué.
- **Backend:** no cambió; no lo corrí (instrucción del orquestador).

## Corridas (una suite a la vez)
1. Regresiones: mis `*.ataque` previas del frontend más `refactor-01c-r1` → `Tests  142 passed (142)`.
2. `npx vitest run src/features/tareas/entregas-01e-r2.ataque.test.tsx`, tres veces → `Tests  31 passed (31)`.
3. `cd frontend; npm run lint` → código 0, `> tsc -b`.
4. `cd frontend; npm test` → `Test Files  166 passed (166)` · `Tests  2529 passed (2529)` · `Duration  108.32s`. Las cifras cuadran con las del manager (165 / 2498) más mi archivo nuevo (1 / 31).

## Veredicto de la ronda 2 de 01e
**RESISTE**: sin hallazgos.

## Tabla de SHA-256 de las 175 `*.ataque` al cierre de la ronda 2 de 01e
| SHA-256 | Archivo | Nota |
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
| `AE927AC24B5FA0CD9E759E46382538BD904A00686C3DA32CC226FE2D0F07614F` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `5088C78DE9C116F0033AD04F911ED43BA79774A8BD513F0529AAFB1F7FE15A76` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
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
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
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
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2C4FE47075244E20C7D3904D364907D0848A75C29CBE784E73EEB144380A91CB` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `EC51A1921087FDB6E68355F7C63AE46F688ED6F78186DA4649B983FD4C1B114C` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `0D5DD62306776126EAC593EFFA4C543D1A73560E1B743DA650EC5B6DEFB50873` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `740C526EFADAF15A849A5ECFF1A0D9F9D00FBA76F1C19775FEF71E3D833A2732` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `BCF2F7D10F9E11FA8D5728FF3FDCF29D8CC8A05C0F3E68B34F9926D182178220` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` | Nueva (ronda 2 de 01e) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |
