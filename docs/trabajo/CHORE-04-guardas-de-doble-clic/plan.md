# Plan — CHORE-04 · guardas de doble clic
Estado: LISTO
Carril: normal
Requisitos: sin RF ni RN nuevos. Cumple `CLAUDE.md` › Componentes (guarda síncrona con ref en toda acción que lanza una mutación; `enEspera={isFetching}` en los "Ver más"), DH-7 de CHORE-03 (con M-05 y S-14), O-22 de CHORE-03 03c, la fila 29 (O-01 de la ronda 1 de CLASES-03c2) y E-38 de ADMIN-01.
Rama: `chore/chore-04-guardas`, desde `main` = `9b6953c` (base de "No se toca"). Una sola subentrega, CHORE-04 (33 archivos desde la Enmienda 1; justificación en §D-0).

**Enmienda 1 (2026-11-10), responde a `revision.md` (CAMBIOS REQUERIDOS). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 1" en su lugar.
- **M-01:** CH4-25 y la matriz de §D-6 afirman el aviso que hoy da cada control de clases ante `403 ACCESO_RESTRINGIDO` y `401` sin refresco: «Sí, regenerar», ninguno; los otros siete, uno solo (lo fija `alumnos-b-r1.ataque:416-417` para «Unirme a la clase»). Los ganchos no se tocan (PA-4 sigue). El aviso de más mientras `apiClient` redirige queda fuera, como fila nueva de ESTADO §3 con destino el `chore` de foco y navegación del marco (A-2).
- **M-02:** nuevo §D-4 bis. Nombra el estado "cambio de `claseId` con la petición en vuelo, misma instancia" y lo resuelve sin `key` (no rompe el foco de `clasePrevia`): la ref y el estado local de «Subir»/«Bajar» guardan la clase del orden y se sueltan en el `finally` de `mutateAsync`, que no depende del observador. «Restaurar» del aviso de clase archivada, el hermano, **entra** (un archivo de producción más y CH4-28). Revisión por mecanismo de los demás controles: §D-4 bis, "Hermanos". El defecto previo que la revisión destapa (sin `mutationKey`, la mutación pendiente toma las opciones del id nuevo) queda como H-3 con destino (S-07). CH4-37 suma el camino con la misma instancia.
- **N-01:** CH4-35 fija el orden de los pasos.
- **N-02:** CH4-31 (b) cambia "tras unirse a otra clase" por volver al inicio con la lista vieja; §D-3 cambia su ejemplo.
- **N-03:** §D-R0 suma cuatro pruebas vigiladas, sin cambio.
- **Detalles menores:** CH4-01 se endurece (la guarda va en el mismo manejador antes de tomar la ref, o en el manejador que lo llama; ver la corrección a la revisión en §D-5); el título de CH3-C13 dice que la rama sin ref queda para un formulario futuro; CH4-12 quita "antes de 30 s"; CH4-36 busca el texto del `409` donde lo pinta la traducción del servidor.
- **Conteo:** 33 archivos (25 → 26 de producción). Sigue siendo "unos 30": no se parte (§D-0).

**Enmienda 2 (2026-11-10), decisiones del humano sobre la verificación de la Enmienda 1 (`revision.md`, línea 112). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 2".
- **S-07 = opción (b):** además del orden de los temas, se corrige «Sí, regenerar». `useRegenerarCodigo` gana una `mutationKey` por clase y `codigo-de-clase.tsx` toma la forma de §D-4 bis, con la confirmación por clase (§D-4 ter). Excepción mínima a PA-4: en `useRegenerarCodigo` solo se suma la línea de la clave, y se suma el gancho nuevo `useRegeneracionEnVuelo`. Sin archivos nuevos (`hooks.ts`, `data.ts` y `codigo-de-clase.tsx` ya estaban en "Se toca") y sin pruebas normales nuevas en la lista cerrada. CH4-40 nueva; CH4-29 queda solo para «Sí, quitar» de un maestro.
- **«Sí, quitar» de un maestro no entra:** no muestra un dato equivocado en B (su respuesta renueva la lista de B, que es correcta; la de A queda vieja hasta su próxima lectura). Va a ESTADO §3 con los demás ganchos con id (A-2).
- **Decididas por el humano el 2026-11-10, ya no vetables:** S-01, una sola subentrega de 33 archivos, carril normal, S-06 (sin comprobación humana) y el aviso de más mientras `apiClient` redirige a ESTADO §3 con destino el `chore` de foco y navegación del marco.
- **O-E1-1:** el resumen del programador explica que las flechas en línea que llaman a un manejador asíncrono (`onOrdenar`, «Restaurar» y, desde esta enmienda, «Sí, regenerar») son así a propósito, por `no-misused-promises` (paso 11).
- **O-E1-2:** antes de aplicar A-1 al cierre, el orquestador la revisa para que siga siendo una sola viñeta legible (A-1).
- **Conteo:** sin cambio, 33 archivos.

**Enmienda 3 (2026-11-10): responde a M-03 de "Verificación de la Enmienda 2" (`revision.md`, línea 203). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 3".
- **M-03:** §D-4 ter decide que la confirmación de una clase se cierra al cambiar de clase, así que no reaparece abierta al volver y su «Cancelar» con `autoFocus` no toma el foco. CH4-40 (b) y (c) afirman el foco, con un caso por cada lugar donde estaba antes del salto («Sí, regenerar» o «Cancelar»). La revisión de hermanos concluye que «Restaurar» y «Subir»/«Bajar» no tienen este mecanismo. Sin archivos nuevos.
- **Sin que bloquee:** la fila de A-2 de «Sí, quitar» de un maestro dice que A puede mostrar al maestro quitado hasta que venza su `staleTime`. §D-R0 suma cinco pruebas vigiladas sin cambio.
- **Conteo:** sin cambio, 33 archivos.

**Enmienda 4 (2026-11-11): responde a la PARADA parcial P-1 del programador y al arbitraje del manager (`revision.md`, "Verificación del resumen del programador — CHORE-04", "Arbitraje de P-1" y M-01). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 4".
- **P-1 / M-01:** CH4-30 (c) y CH4-31 (c) pedían que, tras el fallo de una página de «Ver más», el botón saliera de la espera y otro clic la volviera a pedir. El código de hoy no puede cumplirlo: con `retry: 1`, la consulta queda en error y la vista reemplaza la lista por su `MensajeError`, así que el botón ya no existe. La viñeta contradecía §D-3 del propio plan. Las dos viñetas (c) cambian para afirmar la conducta de hoy, sin cambiarla (texto del manager, transcrito); CH4-31 (c) vale para los dos inicios. §D-3 suma una viñeta con esa conducta y A-2 suma una línea a la fila de ESTADO §3 del hermano de T-02 de CLASES-03e (los caminos de la frase de recuperación de ese `MensajeError` no tienen casos).
- **M-02:** CH4-31 (b) aclara que, en sus dos caminos, la lista del servidor cambia antes de soltar la recarga y el caso afirma el cursor de la página pedida.
- **Sin cambio:** alcance, archivos de "Se toca" y "No se toca", decisiones del humano y conteo (33 archivos).

**Enmienda 5 (2026-11-11): solo de redacción. Responde al arbitraje del manager tras la ronda 1 del tester (RESISTE) (`revision.md`, "Arbitraje tras la ronda 1 — CHORE-04") y registra las decisiones del humano del 2026-11-11 (`aprobacion.md`). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 5".
- **Regla del humano para las pruebas de doble envío:** una prueba que pasa sin la guarda no la vigila, y eso se comprueba quitando la guarda, no razonando. CH4-10 y CH4-13 dicen ahora que, en los formularios con `CampoContrasena`, sus casos con el componente real son la regresión de "una sola petición" y no prueban la guarda. La vigilan ATQ-CH4-01 y ATQ-CH4-03 del tester, CH4-01, C-1 y CH3-C13. Recuperar no cambia.
- **O-r1-3:** §D-4 bis y §D-4 ter suman una línea cada uno: la ref de «Restaurar», «Sí, regenerar» y «Subir»/«Bajar» es redundante con `sigueEnVuelo()`. No se quita. Las dos frases vecinas también se corrigen con los textos del manager: D-E5-1 (§D-4 bis, "Mutaciones sin `mutationKey`") y D-E5-2 (§D-4 ter, "Estados vecinos").
- **O-r1-1:** se corrige la frase de §D-4 ter sobre las demás confirmaciones en línea, que "se montan de nuevo cerradas en la otra clase". No es cierto para las filas de personas que están en las dos clases. Decisión del humano, opción (a): no se corrige en CHORE-04 y va a ESTADO §3, a la fila de H-3/O-E3-1, como prioritario del `chore` de foco y navegación (A-2).
- **P-1, decidido por el humano:** la frase «Algo salió mal. Inténtalo de nuevo.» tras el fallo de «Ver más» y la del título del inicio (O-E4-1) van a ESTADO §3 con destino el `chore` de foco y navegación. En A-2, la línea de P-1 deja el "salvo que el humano decida otro" y nombra O-E4-1.
- **Sin cambio:** conducta, alcance, archivos de "Se toca" y "No se toca", y conteo (33 archivos).

## Preguntas bloqueantes

Ninguna. Las decisiones que el humano podía vetar están en "Suposiciones" con su alternativa. Enmienda 2: el humano ya decidió S-01, S-06 y S-07 (opción b), la subentrega única, el carril normal y el destino del aviso de más (2026-11-10).

## Suposiciones

- **S-01 (decidida por el humano el 2026-11-10, Enmienda 2; ya no vetable) · Volver a montar con la petición en vuelo.** La ref protege la instancia montada: dos clics o dos envíos seguidos, en el mismo render o en renders distintos, mientras la petición vuela. Volver a montar el control con la petición en vuelo (ir a otra sección o ruta y regresar) solo se protege donde **un solo clic** sobre el control montado de nuevo reenviaría sin volver a confirmar ni a escribir nada: «Subir» y «Bajar» de los temas (fila 29, §D-4). En los demás, repetir la acción tras volver es una acción nueva y deliberada y el servidor no duplica datos:
  - formularios de `auth` y «Unirme a la clase»: hay que volver a escribir (y el token de un enlace ya no está en la URL); unirse es idempotente (`yaEstabas`);
  - «Sí, quitar», «Sí, borrar comentario», «Sí, borrar» y «Sí, regenerar»: hay que volver a abrir la confirmación; un segundo borrado o retiro responde con su error y su aviso;
  - «Agregar a la clase» y «Asignar a la clase»: hay que volver a buscar; agregar es idempotente (`yaEstaba`);
  - «Cerrar sesión»: el marco por rol, la pantalla de acceso restringido y el formulario de cambio obligatorio no se desmontan mientras sale la petición, y al asentarse navegan a `/login`.
  - Alternativa si el humano la veta: `mutationKey` por control y lectura de la caché de mutaciones, como `useGestionEnVuelo` de ADMIN-01 (unos 10 archivos más; la subentrega pasaría de 40 y habría que partirla).
- **S-02 · Sin gancho compartido nuevo.** El patrón es el de los 51 sitios que ya lo tienen: `const <nombre>Ref = useRef(false)` en el componente dueño de la mutación, guarda al inicio del manejador, la ref se toma justo antes de `mutate` y se suelta en el `onSettled` de ese `mutate`. Un gancho (`useGuardaSincrona` o parecido) crearía un segundo patrón o obligaría a migrar los 51 sitios (refactor fuera de alcance, regla de `AGENTS.md`). Lo que unifica es la regla estática de §D-5.
- **S-03 · «Reintentar» de la barra entra (hermano H-1).** Es el único botón de `src/` que pide una consulta con `refetch()` sin `{ cancelRefetch: false }`: dos clics en el mismo render cancelan la primera petición y piden otra. Es un GET, pero es la misma clase que los "Ver más" y la regla estática de §D-5 lo cubre.
- **S-04 · Los `refetch()` de "pulsar la sección activa" no entran (hermano H-2).** `dudas-view.tsx:59`, `muro-view.tsx:68`, `recursos-view.tsx:74`, `trabajo-view.tsx:111`, `components/seccion-de-recursos.tsx:83`, `components/respuestas-de-duda.tsx:168` y `components/seccion-de-tema.tsx:65` piden otra vez con `refetch()` (sin `cancelRefetch: false`) cuando se pulsa la sección en la que ya se está con la lista en error: dos pulsaciones seguidas cancelan la primera y piden otra. Son GET, no hay control propio que guardar y la política de recarga es del `chore` de foco y navegación del marco ("una sola política de recarga"). Destino: ese `chore`; el orquestador lo registra en `docs/ESTADO.md` (A-2).
- **S-05 · «Cancelar» con la petición en vuelo no cambia.** En las confirmaciones en línea de quitar, borrar y regenerar, «Cancelar» sigue cerrando la confirmación aunque la petición vuele (conducta actual, probada en sus encargos). La ref vive en el componente que no se desmonta (la fila o el encabezado), así que al volver a abrir la confirmación el botón «Sí, …» sigue en espera y no manda otra petición (CH4-24). Bloquear «Cancelar» como en archivar (ADMIN-01) sería un cambio de conducta fuera de este `chore`.
- **S-06 (decidida por el humano el 2026-11-10, Enmienda 2) · Sin comprobación humana en navegador.** Todo lo que cambia lo ve jsdom: el número de peticiones, `aria-busy`, el foco y los avisos. No hay valores visuales nuevos ni patrones nuevos (`DESIGN.md` sin cambio, §D-7).
- **S-07 (Enmienda 1, M-02; Enmienda 2: el humano eligió la opción (b) el 2026-11-10) · H-3 se corrige en el orden de los temas y en «Sí, regenerar» (§D-4 ter); el resto queda fuera, con destino.** Lo que sigue es el texto de la Enmienda 1; donde dice "solo donde ya entra (el orden de los temas …)", desde la Enmienda 2 se lee "en el orden de los temas y en «Sí, regenerar»". En `@tanstack/query-core` 5.103.2 (`mutationObserver.js:61-62`), cuando `useMutation` recibe opciones nuevas: si la `mutationKey` cambia de hash, el observador se suelta de la mutación en vuelo (`reset()`); si no hay clave o no cambia, la mutación pendiente **toma las opciones nuevas** (`#currentMutation.setOptions`). Así, en un componente que sobrevive al cambio de un id de la ruta (sin `key`), un gancho sin `mutationKey` y con el id en su cierre corre el `onSuccess`/`onError` de la petición de A con el id de B (por ejemplo, `useRegenerarCodigo` escribiría el código nuevo de A en la caché de B, y hoy `useOrdenarTemas`, la lista de temas de A en la de B). Es previo a este encargo, no es de doble clic y su remedio toca ganchos de varios módulos. Este plan lo corrige solo donde ya entra (el orden de los temas gana su `mutationKey` por clase, y CH4-37 (b) fija que la respuesta de A no escribe la lista de B). El resto va a ESTADO §3 (A-2) con destino el `chore` de foco y navegación del marco, que ya lleva lo que pasa en una vista que sobrevive a la navegación. La alternativa (inventariar y corregir aquí todos los ganchos con id) sumaría decenas de archivos y obligaría a partir el encargo.

## Alcance

**Entra (verificado contra el código en `9b6953c`; las líneas son las de hoy).**

| Fila de ESTADO | Archivo (`frontend/src/`) y línea de hoy | Control | Qué falta |
|---|---|---|---|
| 3 | `features/clases/components/codigo-de-clase.tsx:59` (antes :58) | «Sí, regenerar» | ref |
| 4 | `features/clases/components/formulario-unirse-clase.tsx:36` | «Unirme a la clase» | ref |
| 5 | `features/clases/components/buscador-alumnos.tsx:44` | «Agregar a la clase» (fila de candidato) | ref |
| 6 | `features/clases/components/buscador-de-maestros.tsx:100` | «Asignar a la clase» (en línea en el JSX) | manejador con nombre y ref |
| 12 | `features/auth/components/formulario-login.tsx:41` | iniciar sesión | ref |
| 13 | `features/auth/components/formulario-registro.tsx:42` | registro de estudiante | ref |
| 14 | `features/auth/components/formulario-registro-maestro.tsx:47` | registro de maestro | ref |
| 15 | `features/auth/components/formulario-recuperar.tsx:38` | recuperar contraseña | ref |
| 16 | `features/auth/components/formulario-nueva-contrasena.tsx:93` | restablecer o establecer contraseña | ref |
| 17 | `features/auth/components/formulario-cambiar-contrasena.tsx:47` y `:102` | cambio obligatorio y «Cerrar sesión» (en línea) | ref; manejador con nombre y ref |
| 18 | `features/auth/acceso-restringido-view.tsx:72` | «Cerrar sesión» (en línea) | manejador con nombre y ref |
| 19 | `features/clases/maestros-de-clase-view.tsx:75` (antes :67) | «Sí, quitar» de un maestro (en línea, `onQuitar`) | manejador con nombre y ref |
| 20 | `features/clases/components/comentarios-de-publicacion.tsx:80` (antes :74) | «Sí, borrar comentario» (en línea) | manejador con nombre y ref |
| 21 | `features/clases/components/publicacion-del-muro.tsx:124` (antes :118) | «Sí, borrar» de una publicación (en línea) | manejador con nombre y ref |
| 22 | `features/clases/components/tabla-alumnos.tsx:64` (antes :59) | «Sí, quitar» de un alumno | ref |
| 23 | `app/require-rol.tsx:46` | «Cerrar sesión» del marco por rol (en línea, `onCerrarSesion`) | manejador con nombre y ref |
| 27 | `features/clases/components/comentarios-de-publicacion.tsx:188` | «Ver más comentarios» | `enEspera={comentarios.isFetching}` (`cancelRefetch: false` ya está en `:187`) |
| 28 | `features/clases/components/panel-mis-clases.tsx:61`, `inicio-estudiante-view.tsx:62` e `inicio-maestro-view.tsx:52` | «Ver más clases» de los dos inicios | prop `isFetching` en lugar de `isFetchingNextPage` (`cancelRefetch: false` ya está) |
| 29 | `features/clases/trabajo-view.tsx:174-193` y `hooks.ts:1441` | «Subir» y «Bajar» entre montajes | `mutationKey` y lectura de la caché de mutaciones (§D-4) |
| Hermano de M-02 (Enmienda 1) | `features/clases/components/aviso-de-clase-archivada.tsx:30-43` | «Restaurar» del aviso del admin (`AccionesDelAdmin`), con `mutationKey` por clase y sin `key` en su montaje | la ref guarda la clase y se suelta en el `finally` de `mutateAsync` (§D-4 bis) |
| H-1 (nuevo) | `components/layout/lista-de-clases.tsx:57` | «Reintentar» de la lista de clases de la barra | `refetch({ cancelRefetch: false })` (S-03) |
| — | `src/` completo | regla estática | `lib/guardas-de-doble-clic-estatico.test.ts` (§D-5) |

**Filas ya resueltas (verificadas, no se tocan):** 1 (`formulario-comentario.tsx:34`, `enviandoRef`), 2 (`formulario-clase.tsx:86`), 7 (`formulario-corregir-correo.tsx:31`), 8 (`formulario-generar-enlace.tsx:45`), 9 (`formulario-invitacion-masiva.tsx:34`), 10 (`formulario-invitar-maestro.tsx:32`), 11 (`buscador-de-cuenta.tsx` ya no existe), 24 (`tabla-enlaces.tsx:258`), 25 (`registrados-del-enlace.tsx:83`) y 26 (`clases-admin-view.tsx:102`). Las filas 3, 5, 6, 19 a 22, 27 y 28 son las de E-38 de ADMIN-01: siguen pendientes, como dice ESTADO.

**Búsqueda de hermanos (grep del arquitecto en `9b6953c`).**
- Mutaciones: 68 llamadas a `.mutate(` o `.mutateAsync(` en código de producción de `src/` (58 archivos), más dos referencias sin llamar (`descarga.mutateAsync` pasada a `descargar` en `components/adjuntos/adjuntos-de-publicacion.tsx:101` y `:129`, ya guardada por `descargandoRef` de `VistaDeFicha`, DH-6 de CHORE-03). 51 ya tienen su guarda: 49 toman una ref en el mismo manejador antes de la llamada y la comprueban en un `if (… Ref.current …) return`, y 2 (`crear-tarea-view.tsx:30` y `editar-tarea-view.tsx:112`) corren dentro de `handleGuardar` de `features/tareas/components/formulario-tarea.tsx`, que toma `guardandoRef` antes de `await onGuardar(`. Las 17 restantes son exactamente las filas 3 a 6 y 12 a 23 de la tabla. No hay otra.
- "Ver más": 20 llamadas a `fetchNextPage(`; todas llevan `{ cancelRefetch: false }`. Las únicas con `enEspera` que lee `isFetchingNextPage` son las filas 27 y 28. `isFetchingNextPage` aparece además en `features/calificaciones/mis-calificaciones-view.tsx:83`, `features/tareas/entregas-view.tsx:82` y `features/tareas/components/hilo-privado.tsx:149`, como guarda de un efecto de foco (correcto; no se tocan).
- Botones que piden una consulta: solo «Reintentar» de `components/layout/lista-de-clases.tsx:57` (H-1). Los `refetch()` de pulsar la sección activa son H-2 (S-04).
- Entre montajes: archivar y restaurar ya leen la caché de mutaciones (`useGestionEnVuelo`, ADMIN-01). «Subir»/«Bajar» no (fila 29). La fila 29 dice "lo mismo aplicará a Recursos si ordena temas con este gancho": no lo hace (`useOrdenarTemas` solo lo usa `trabajo-view.tsx`).
- Cambio de un id de la ruta con el componente montado (Enmienda 1, M-02): §D-4 bis, "Hermanos".

**No entra.**
- H-2 (S-04), con destino el `chore` de foco y navegación del marco.
- El hermano de T-02 de CLASES-03e ("Ver más comentarios" sobre una publicación que otra persona borró; `docs/ESTADO.md` §3): cambia la renovación tras un `404`, no la guarda; sigue con destino el `chore` de foco y navegación.
- Cambiar qué hace «Cancelar» con la petición en vuelo (S-05).
- (Enmienda 1, M-01) Callar el aviso de los siete controles de clases que hoy avisan ante `403 ACCESO_RESTRINGIDO` y `401` mientras `apiClient` redirige: fila de ESTADO §3 con destino el `chore` de foco y navegación del marco (A-2).
- (Enmienda 1, S-07) H-3: la mutación pendiente que toma las opciones del id nuevo en los ganchos sin `mutationKey`; fila de ESTADO §3 con el mismo destino. Enmienda 2: salvo el orden de los temas y «Sí, regenerar», que entran (§D-4 ter).
- Los avisos y las renovaciones de los ganchos: ningún gancho de `features/auth` ni de `features/clases` cambia, salvo `useOrdenarTemas` (§D-4).
- Backend, `shared/`, `infra/`, `features/admin`, `features/tareas`, `features/calificaciones`.

## Diseño

### §D-0 · Una sola subentrega (conteo)

| Grupo | Archivos |
|---|---|
| Producción `features/auth` | 7: los seis formularios de las filas 12 a 17 y `acceso-restringido-view.tsx` |
| Producción `app/` | 1: `require-rol.tsx` |
| Producción `features/clases` | 17 (Enmienda 1: suma `aviso-de-clase-archivada.tsx`): `codigo-de-clase.tsx`, `aviso-de-clase-archivada.tsx`, `formulario-unirse-clase.tsx`, `buscador-alumnos.tsx`, `buscador-de-maestros.tsx`, `maestros-de-clase-view.tsx`, `comentarios-de-publicacion.tsx`, `publicacion-del-muro.tsx`, `tabla-alumnos.tsx`, `panel-mis-clases.tsx`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `trabajo-view.tsx`, `hooks.ts`, `data.ts`, `types.ts`, `lib.ts` |
| Producción `components/layout` | 1: `lista-de-clases.tsx` |
| Pruebas nuevas | 4: `lib/guardas-de-doble-clic-estatico.test.ts`, `features/auth/guardas-ch4.test.tsx`, `features/clases/guardas-ch4.test.tsx`, `features/clases/ver-mas-y-orden-ch4.test.tsx` |
| Pruebas normales cambiadas (lista cerrada) | 2: `lib/errores-de-api-estatico.test.ts`, `features/clases/formularios-ch3.test.tsx` |
| `*.ataque` cambiada (§D-R0) | 1: `lib/estatico-ch3-r2.ataque.test.ts` |
| **Total** | **33** (Enmienda 1; antes 32) |

33 es "unos 30" (decisión del humano, 2026-11-04): no se parte. Enmienda 2: el humano decidió el 2026-11-10 una sola subentrega; la Enmienda 2 no suma archivos. La Enmienda 1 suma un archivo de producción; sus pruebas van en `features/clases/guardas-ch4.test.tsx` y en `ver-mas-y-orden-ch4.test.tsx`, que ya estaban contadas, y la lista cerrada no crece. Casi todos los cambios son de 3 a 10 líneas con el mismo patrón, y la regla estática necesita todo el inventario resuelto para quedar en verde, así que partir obligaría a una lista de excepciones temporal. Si el humano prefiere partir: CHORE-04a con `auth`, `app/` y las dos estáticas de CHORE-03 (10 archivos, más su prueba nueva: 11) y CHORE-04b con lo demás y la regla estática (22). `CLAUDE.md` y `docs/ESTADO.md` los cambia el orquestador al cierre (A-1 y A-2), fuera del conteo.

### §D-1 · El patrón (forma exacta)

**Formulario** (filas 4 y 12 a 17; la línea de T-05 solo donde ya existe):

```tsx
const enviandoRef = useRef(false)

const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
  evento.preventDefault()
  if (enviandoRef.current) return
  if (<m>.isPending) return
  if (<m>.isError) <m>.reset()
  // …lectura y validación local, sin cambio…
  enviandoRef.current = true
  <m>.mutate(datos, {
    // …callbacks que ya tenía el mutate, sin cambio…
    onSettled: () => {
      enviandoRef.current = false
    },
  })
}
```

Por qué cada lugar (estados vecinos del mecanismo):
1. **`preventDefault()` primero.** Si la guarda retornara antes, un segundo Enter con la ref tomada dejaría que el navegador enviara el formulario y recargara la página.
2. **La ref antes de `isPending`.** `isPending` llega un render tarde; la ref no (es la guarda que ya exigía `CLAUDE.md`).
3. **La ref antes de `reset()`.** Con un error del envío anterior, el segundo envío del mismo render ve `isError` en `true` (el objeto del render) y llamaría a `reset()` con la petición en vuelo: TanStack Query suelta el observador de esa mutación, el `onSettled` del `mutate` ya no corre, la ref queda tomada para siempre, el botón sale de la espera y el formulario ya no envía. Con la ref primero, `reset()` solo corre con la mutación asentada. Es la nota (a) de CHORE-03 en ESTADO.
4. **La ref se toma justo antes de `mutate`, después de validar.** Un envío que la validación local rechaza no la toma.
5. **Se suelta en el `onSettled` del `mutate`.** TanStack Query llama a los callbacks del `mutate` antes de avisar a React, así que cuando la persona ve el error o el éxito la ref ya está libre ("Inténtalo de nuevo" se cumple al primer clic). Con el componente desmontado, la ref muere con él y nada queda tomado. `sacarDeLaCacheAlAsentar` (login, registro, registro de maestro, nueva contraseña, cambio) saca la mutación de la caché en el `onSettled` del gancho, que corre antes; el observador sigue atado a ella y el `onSettled` del `mutate` corre igual (es el orden que ya tienen `formulario-alta-alumno.tsx` y `formulario-generar-enlace.tsx` de ADMIN-01, cuyos ganchos usan `sacarDeLaCacheAlAsentar`).
6. **Un nombre por guarda, con sufijo `Ref`, en una línea `if (<nombre>Ref.current) return`.** Es lo que leen CH3-C13 y el ataque C-1 de §D-R0 (la regla exige esa línea exacta entre `evento.preventDefault()` y la guarda `isPending`).

**Botón** (filas 3, 5, 6, «Cerrar sesión» de la 17 y 18 a 23): la llamada sale de la flecha del JSX a un manejador con nombre declarado en el cuerpo del componente dueño de la mutación (dos espacios de sangría), con la misma guarda:

```tsx
const borrandoRef = useRef(false)

const handleBorrar = () => {
  if (borrandoRef.current) return
  borrandoRef.current = true
  borrar.mutate(comentario.id, {
    onSettled: () => {
      borrandoRef.current = false
    },
  })
}
// …
<Button … onClick={handleBorrar} enEspera={borrar.isPending}>
```

Reglas comunes a los dos:
- En los controles de §D-2, `enEspera` conserva su expresión de hoy (solo cambian las dos de §D-3), y cada archivo conserva su número de `enEspera=` (V-06 de `styles/clases-r1.ataque.test.ts`: 90 en total). Nada de `disabled`.
- Los ganchos no cambian: los avisos y las renovaciones siguen donde están (§D-6).
- Los callbacks que el `mutate` ya tenía se conservan; el `onSettled` se suma. Si ya había `onSettled` (`codigo-de-clase.tsx`), la liberación va dentro del mismo, antes de lo que ya hacía.
- El manejador se declara después de los ganchos y antes del primer retorno temprano del componente (en `require-rol.tsx`, `acceso-restringido-view.tsx` y `maestros-de-clase-view.tsx` hay retornos tempranos).
- Sin tipos nuevos en los componentes (solo `Props`), sin `?? []`, sin `fetch(`, sin `console.` (reglas que leen `ver-mas-01e-r3.ataque` y `refactor-01c-r1.ataque` sobre algunos de estos archivos).

### §D-2 · Control por control

| Archivo (`frontend/src/`) | Componente dueño de la mutación | Ref | Manejador | Notas |
|---|---|---|---|---|
| `features/auth/components/formulario-login.tsx` | `FormularioLogin` | `enviandoRef` | `handleSubmit` | Mutación `inicioSesion`. Al éxito navega (el gancho); la ref muere con el formulario |
| `features/auth/components/formulario-registro.tsx` | `FormularioRegistro` | `enviandoRef` | `handleSubmit` | Mutación `alta` |
| `features/auth/components/formulario-registro-maestro.tsx` | `FormularioRegistroMaestro` | `enviandoRef` | `handleSubmit` | Mutación `alta` |
| `features/auth/components/formulario-recuperar.tsx` | `FormularioRecuperar` | `enviandoRef` | `handleSubmit` | Mutación `recuperar`. Al éxito pinta la confirmación fija; la ref se suelta igual |
| `features/auth/components/formulario-nueva-contrasena.tsx` | `FormularioNuevaContrasena` | `enviandoRef` | `handleSubmit` | Mutación `nuevaContrasena`. Con `ENLACE_INVALIDO` la vista pasa a `EnlaceInvalido`; la ref ya está libre |
| `features/auth/components/formulario-cambiar-contrasena.tsx` | `FormularioCambiarContrasena` | `enviandoRef` y `cerrandoRef` | `handleSubmit` y `handleCerrarSesion` (declarado después de `handleSubmit`) | Dos guardas independientes, como hoy: el cambio en vuelo no bloquea «Cerrar sesión». `onClick={handleCerrarSesion}` |
| `features/auth/acceso-restringido-view.tsx` | `AccesoRestringidoView` | `cerrandoRef` | `handleCerrarSesion` | Antes de `if (isError)`. `onClick={handleCerrarSesion}` |
| `app/require-rol.tsx` | `RequireRol` | `cerrandoRef` | `handleCerrarSesion` | Antes de `if (isError)`. `onCerrarSesion={handleCerrarSesion}`; `cerrando={cerrarSesion.isPending}` no cambia; `ContenedorRol` y `BarraSuperior` no se tocan |
| `features/clases/components/codigo-de-clase.tsx` | `CodigoDeClase` | `regenerandoRef` (Enmienda 2: `useRef<string \| null>(null)`) | `handleRegenerar` (ya existe; Enmienda 2: pasa a `async`) | Enmienda 2: forma de §D-4 ter (la de §D-4 bis, con la confirmación por clase), no la de §D-1 |
| `features/clases/components/formulario-unirse-clase.tsx` | `FormularioUnirseClase` | `enviandoRef` | `handleSubmit` | La ref antes de `if (unirse.isPending) return`. Se conservan `onSuccess` y `onError` del `mutate`; se suma `onSettled`. No importa nada nuevo de `../hooks` (lo doblan los `inicio-sin-datos*.ataque`) |
| `features/clases/components/buscador-alumnos.tsx` | `FilaCandidato` | `agregandoRef` | `handleAgregar` (ya existe) | Una ref por fila, como la mutación |
| `features/clases/components/buscador-de-maestros.tsx` | `FilaParaAsignar` | `asignandoRef` | `handleAsignar` (nuevo) | `onClick={handleAsignar}` |
| `features/clases/maestros-de-clase-view.tsx` | `MaestrosDeLaClase` | `retirandoRef` | `handleQuitar(maestro: MaestroDeLista)` (nuevo, antes de `if (clase.isError)`) | `onQuitar={handleQuitar}`. Una ref para todas las filas, porque la mutación `retirar` es una y `quitando` ya pone en espera todos los «Sí, quitar». `ListaMaestrosDeClase` no cambia. `MaestroDeLista` se importa de `./types` |
| `features/clases/components/comentarios-de-publicacion.tsx` | `FilaComentario` | `borrandoRef` | `handleBorrar` (nuevo) | `onClick={handleBorrar}` |
| `features/clases/components/publicacion-del-muro.tsx` | `PublicacionComun` | `borrandoRef` | `handleBorrar` (nuevo) | `onClick={handleBorrar}` |
| `features/clases/components/tabla-alumnos.tsx` | `FilaAlumno` | `quitandoRef` | `handleQuitar` (ya existe) | Se conserva su comentario de T-21 |
| `features/clases/components/aviso-de-clase-archivada.tsx` (Enmienda 1) | `AccionesDelAdmin` | `restaurandoRef` (pasa a `useRef<string \| null>(null)`) | `handleRestaurar` (ya existe, pasa a `async`) | Forma de §D-4 bis, no la de §D-1: su mutación lleva `mutationKey` por clase y el componente sobrevive al cambio de clase |

### §D-3 · "Ver más" (filas 27 y 28) y «Reintentar» (H-1)

- **`comentarios-de-publicacion.tsx:188`:** `enEspera={comentarios.isFetching}`.
- **`panel-mis-clases.tsx`:** la prop `isFetchingNextPage: boolean` pasa a `isFetching: boolean` en `PanelMisClasesProps`, en el `Pick` de `contenidoPanel`, en la desestructuración y en la llamada; el botón usa `enEspera={props.isFetching}`. Un comentario de una línea dice el porqué (T-19 de TAREAS-01e: con una recarga de la lista en vuelo, el botón seguía activo y su clic se unía a la recarga sin pedir la página).
- **`inicio-estudiante-view.tsx:62` e `inicio-maestro-view.tsx:52`:** `isFetching={clases.isFetching}`. `onVerMas` no cambia.
- **Sin ref en los "Ver más".** No son mutaciones: con `fetchNextPage({ cancelRefetch: false })`, TanStack Query marca la consulta como "pidiendo" en la misma llamada, y una segunda llamada antes de que React vuelva a pintar se une a la primera. CH4-30 y CH4-31 lo prueban con dos clics en el mismo `act`. (ADMIN-01 sumó una ref en sus «Cargar más»; aquí no hace falta y la regla estática no la exige.)
- **`components/layout/lista-de-clases.tsx:57`:** `onClick={() => void clases.refetch({ cancelRefetch: false })}`. `enEspera={clases.isFetching}` no cambia.
- **Cambio visible declarado:** «Ver más comentarios» y «Ver más clases» quedan en espera mientras su lista se recarga en segundo plano (por ejemplo, tras comentar, o al volver al inicio con la lista ya vieja; Enmienda 1, N-02: unirse navega a la clase y el inicio ya no está pintado). Antes se veían activos y el clic no traía nada.
- Las frases "Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos." y "Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas." no cambian ni cambian sus caminos: reemplazan la lista, así que el "Ver más" no se pinta mientras están.
- (Enmienda 4, P-1) Tras el fallo de una página, la consulta queda en error y la vista reemplaza la lista por su `MensajeError` (conducta de hoy, sin cambio); el «Ver más» no se pinta mientras está.

### §D-4 · «Subir» y «Bajar» entre montajes (fila 29)

Hoy: con el `PUT …/temas/orden` en vuelo, ir a otra sección y volver monta otra `TrabajoDeLaClase` con `ordenandoRef` en `false` y sin `ordenEnVuelo`; un clic en «Subir» o «Bajar» calcula otro orden con la lista vieja y manda un segundo `PUT`.

- **`features/clases/data.ts`**, junto a `claveGestionDeClase`: `export const claveOrdenDeTemas = (claseId: string) => ["clases", claseId, "ordenar-temas"] as const`, con un comentario de una línea (la clave de la mutación, para saber si un orden de esa clase sigue en vuelo aunque la vista que lo lanzó ya se haya desmontado).
- **`features/clases/types.ts`**, después de `OrdenEnVuelo`: `export interface VariablesDeOrdenarTemas extends OrdenEnVuelo { temaIds: string[] }` y (Enmienda 1, §D-4 bis) `export interface OrdenPropioEnVuelo extends OrdenEnVuelo { claseId: string }`, con un comentario de una línea (el orden que lanzó esta vista, con la clase a la que pertenece).
- **`features/clases/lib.ts`**: `export const ordenDeLasVariables = (variables: unknown): OrdenEnVuelo | null`. Devuelve `{ temaId, control }` solo si `variables` es un objeto no nulo con `temaId` de tipo texto y `control` igual a `"subir"` o `"bajar"`; en cualquier otro caso, `null`. Sin `as` ni `any`.
- **`features/clases/hooks.ts`**:
  - `useOrdenarTemas` gana `mutationKey: claveOrdenDeTemas(claseId)` y su `mutationFn` pasa a `({ temaIds }: VariablesDeOrdenarTemas) => api(…)`. El cuerpo de la petición sigue siendo `{ temaIds }`; `onSuccess` y `onError` no cambian.
  - `useOrdenDeTemasEnVuelo(claseId: string)` (nuevo, después de `useOrdenarTemas`): devuelve `{ ordenEnVuelo, sigueEnVuelo }`. `ordenEnVuelo` sale de `useMutationState({ filters: { mutationKey, exact: true, status: "pending" }, select: (mutacion) => ordenDeLasVariables(mutacion.state.variables) })`: el primer valor distinto de `null`, o `null`. `sigueEnVuelo` es `() => queryClient.isMutating({ mutationKey, exact: true }) > 0` y se lee en el manejador, sin esperar otro render (como `useGestionEnVuelo`). Un comentario de dos líneas dice el porqué.
- **`features/clases/trabajo-view.tsx`** (Enmienda 1: la forma exacta está en §D-4 bis, que reemplaza a la de la versión anterior de este punto):
  - `const ordenDeLaCache = useOrdenDeTemasEnVuelo(claseId)`, junto a `useOrdenarTemas`.
  - `handleOrdenar` pasa a `async`, con la ref y el estado local por clase y `mutateAsync` en `try/catch/finally` (§D-4 bis).
  - A `SeccionDeTema`, el orden propio de esta clase o, si no hay, el de la caché (§D-4 bis). El estado local da la espera en el mismo render del clic, como hoy. La caché la da en la vista que se montó con el orden en vuelo, y cubre el instante entre el `finally` y el aviso de la caché, siempre sobre el mismo control (sin parpadeo de los demás).
  - En la vista nueva `focoTrasOrdenarRef` está en `null`, así que el orden lanzado antes no mueve el foco. El efecto de foco solo suma la guarda de clase de §D-4 bis.
- **`SeccionDeTema` no cambia.**
- **Conducta resultante:** en la vista que se montó con un orden en vuelo, el control que lo lanzó está en espera; los demás «Subir» y «Bajar» no lo están y su clic no hace nada, como hoy en la misma vista mientras un orden vuela (M-01 de TAREAS-01e). Cuando el orden se asienta (éxito, o error con su único aviso del gancho), nada queda en espera y el siguiente clic manda un `PUT` calculado con la lista renovada. Un orden en vuelo de otra clase no bloquea esta.

### §D-4 bis · Cambio de clase con la petición en vuelo, misma instancia (Enmienda 1, M-02)

**El estado.** `TrabajoDeLaClase` y `AccionesDelAdmin` sobreviven a un cambio de `claseId`: `ClaseLayout` pinta `<Outlet />` sin `key` (`clase-layout.tsx:90`), y `trabajo-view.tsx` lo prevé con `clasePrevia`. Se llega con un salto del historial de `…/A/trabajo` a `…/B/trabajo` (o entre dos clases archivadas, en la vista del admin) con la petición de A en vuelo. `useMutation` llama a `observer.setOptions()` y, como la `mutationKey` lleva la clase, el observador se suelta de la mutación de A (`reset()`, `mutationObserver.js:61`). El `onSettled` del `mutate` ya no corre: con la forma de §D-1, la ref y el estado local quedarían tomados para siempre en esa instancia. El defecto lo introduciría la clave de §D-4; en «Restaurar» existe desde ADMIN-01.

**Resultado que se fija:**
- ni la ref ni el estado local quedan tomados más allá de la respuesta de A;
- B no espera por A: su «Subir», «Bajar» o «Restaurar» manda su petición;
- al volver a A con su petición todavía en vuelo, el control de A espera (por la caché) y sale de la espera cuando A responde;
- la respuesta de A solo renueva lo de A (su `onSuccess` conserva las opciones de A, porque el observador ya no le pasa las de B);
- el foco al cambiar de clase sigue yendo al encabezado de la vista (efecto de `clasePrevia`, que no se toca).

**Remedio, y por qué este.**
- **Sin `key={claseId}`.** Montaría otra instancia: el efecto de `clasePrevia` dejaría de correr y el foco caería a `<body>` al cambiar de clase.
- **Sin un efecto que limpie al cambiar de clase.** `eslint-plugin-react-hooks` 7 (`recommended`) marca el `setState` dentro de un efecto, y leer refs en el render.
- **La ref y el estado guardan la clase de lo que protegen, y se sueltan en el `finally` de `mutateAsync`.** La promesa de `execute` se cumple o se rechaza aunque el observador ya se haya soltado. El rechazo se atrapa sin hacer nada: el aviso y la renovación viven en el gancho (`CLAUDE.md`, "manejadores asíncronos: `try/catch/finally`").
- **La espera visible es la propia solo si es de esta clase; si no, la de la caché.** La caché va por clase.

`trabajo-view.tsx` (forma exacta; los nombres que no cambian quedan como hoy):

```tsx
const ordenandoRef = useRef<string | null>(null)
const [ordenPropio, setOrdenPropio] = useState<OrdenPropioEnVuelo | null>(null)
const focoTrasOrdenarRef = useRef<OrdenPropioEnVuelo | null>(null)

const handleOrdenar = async (temaId: string, control: ControlDeOrden) => {
  if (ordenandoRef.current === claseId) return
  if (ordenDeLaCache.sigueEnVuelo() || listaDeTemas === undefined) return
  const orden = ordenTrasMover(listaDeTemas.map(({ id }) => id), temaId, control)
  if (orden === null) return
  const enVuelo: OrdenPropioEnVuelo = { claseId, temaId, control }
  setOrdenPropio(enVuelo)
  focoTrasOrdenarRef.current = enVuelo
  generacionDelOrdenRef.current = generacion
  ordenandoRef.current = claseId
  try {
    await ordenar.mutateAsync({ temaIds: orden, temaId, control })
  } catch {
    // El aviso y la renovación los da useOrdenarTemas.
  } finally {
    if (ordenandoRef.current === enVuelo.claseId) ordenandoRef.current = null
    setOrdenPropio((actual) => (actual === enVuelo ? null : actual))
  }
}

const ordenPropioDeEstaClase = ordenPropio?.claseId === claseId ? ordenPropio : null
// …
<SeccionDeTema … ordenEnVuelo={ordenPropioDeEstaClase ?? ordenDeLaCache.ordenEnVuelo}
  onOrdenar={(temaId, control) => void handleOrdenar(temaId, control)} />
```

- La guarda de la ref va sola en su línea (`if (ordenandoRef.current === claseId) return`): junta con las otras dos, Prettier la partiría en varias líneas y CH4-01 no la leería.
- El efecto de foco tras ordenar suma, antes de su guarda de `ordenar.isPending`: si `pendiente` no es `null` y `pendiente.claseId !== claseId`, pone `focoTrasOrdenarRef.current = null` y retorna. Así un orden de A no mueve el foco en B, y el efecto de `clasePrevia` decide solo.
- `useState<OrdenEnVuelo | null>` y `setOrdenEnVuelo` desaparecen; `enfocarControlDeOrden` recibe el `OrdenPropioEnVuelo`, que es un `OrdenEnVuelo`.

`aviso-de-clase-archivada.tsx`, `AccionesDelAdmin` (forma exacta):

```tsx
const restaurandoRef = useRef<string | null>(null)

const handleRestaurar = async () => {
  if (restaurandoRef.current === claseId || restauracion.sigueEnVuelo()) return
  restaurandoRef.current = claseId
  try {
    await restaurar.mutateAsync()
  } catch {
    // El aviso y la renovación los da useRestaurarClase.
  } finally {
    if (restaurandoRef.current === claseId) restaurandoRef.current = null
  }
}
// …
<Button … onClick={() => void handleRestaurar()} enEspera={restaurar.isPending || restauracion.enVuelo}>
```

El `claseId` del `finally` es el del clic (cierre del manejador). `enEspera` no cambia de expresión: tras el cambio de clase, `restaurar.isPending` queda en `false` (el observador se soltó) y `restauracion.enVuelo` mira la clase nueva. El comentario del componente se actualiza en una línea: la guarda guarda la clase y se suelta en el `finally`.

(Enmienda 5, O-r1-3) En «Restaurar», «Sí, regenerar» y «Subir»/«Bajar», la ref por clase es redundante con `sigueEnVuelo()` para el doble clic del mismo render: `queryClient.isMutating` lee la caché de forma síncrona, y `mutate`/`mutateAsync` dejan la mutación `pending` antes del primer `await`. Ninguna prueba de comportamiento la vigila (CH4-28 (a), CH4-20, CH4-40 (a) y CH4-38 siguen verdes sin ella; medición del tester, ronda 1). Se conserva por la regla de `CLAUDE.md` y por la forma única que exige CH4-01, que es lo que la vigila.

**Hermanos (revisión por mecanismo: estado local o ref de un control, en un componente que sobrevive al cambio de un id de la ruta).**
- **Mutaciones con `mutationKey` que lleva un id** (el observador se suelta y el `onSettled` del `mutate` se pierde): `useOrdenarTemas` (nueva clave de §D-4) y `useRestaurarClase` en `AccionesDelAdmin`. Las dos entran. `useArchivarClase` y `useRestaurarClase` en las filas de `/admin/clases` no corren el riesgo: cada fila lleva `key={clase.id}`. Las claves fijas (`auth`, `CLAVE_MUTACION_GENERAR_ENLACE`, `CLAVE_MUTACION_ALTA_ALUMNO`) no dependen de un id de la ruta.
- **Mutaciones sin `mutationKey`** (el observador sigue atado y el `onSettled` del `mutate` corre, así que la ref se suelta cuando A responde). De los controles de este plan, dos viven en un componente que sobrevive al cambio de clase: «Sí, regenerar» (`CodigoDeClase`, en el encabezado) y «Sí, quitar» de un maestro (`MaestrosDeLaClase`). **Enmienda 2:** «Sí, regenerar» deja esta lista y pasa a la de arriba, con su clave por clase (§D-4 ter); lo que sigue en este punto vale solo para «Sí, quitar» de un maestro. Mientras A vuela, el control de B está en espera y no manda nada hasta que A responde; no queda nada tomado. Se quedan con la forma de §D-1. Que B espere por A y que la respuesta de A corra con las opciones de B es H-3 (S-07). Las filas con `key` por un id de una sola clase (comentarios, publicaciones) y los formularios de `auth` y de unirse no dependen de un id de la ruta. (Enmienda 5, O-r1-1) `FilaAlumno` lleva `key` por el id de la persona y sobrevive al cambio de clase cuando la misma persona está en las dos. Su mutación no tiene `mutationKey`, así que el observador sigue atado y la ref se suelta cuando A responde (ATQ-CH4-16 del tester). Su confirmación abierta pasa a B (O-r1-1, decisión (a) del humano, a ESTADO §3). `FilaCandidato` también lleva `key` por el id de la persona y no tiene confirmación; si sobreviviera al salto, su ref se soltaría igual cuando A responde, por el mismo motivo.
- **Los 49 controles con guarda de otros módulos** no tienen `mutationKey` con un id, así que no hay `reset()` que pierda su liberación. Los de dos fases (`formulario-tarea.tsx`, `formulario-de-entrega.tsx`, `formulario-recurso.tsx`, `formulario-publicacion.tsx`, `panel-de-calificacion.tsx` y `hilo-privado.tsx`) ya sueltan en un `finally`.

### §D-4 ter · «Sí, regenerar» con clave por clase (Enmienda 2, S-07 opción b)

**El defecto (H-3 en su peor caso).** `CodigoDeClase` vive en el encabezado de `ClaseLayout`, que sobrevive al cambio de clase. `useRegenerarCodigo(claseId)` no tiene `mutationKey`. Si la persona salta por el historial de A a B mientras regenera A, la mutación pendiente toma las opciones de B (`mutationObserver.js:62`) y su `onSuccess` hace `setQueryData(claveCodigoDeClase(B), códigoNuevoDeA)`: el encabezado de B muestra el código de A hasta la siguiente lectura. Además, el estado `confirmando` (un booleano) pasa abierto de A a B.

**Remedio (el de §D-4 bis, sin archivos nuevos).**
- **`features/clases/data.ts`**, junto a `claveCodigoDeClase`: `export const claveRegenerarCodigo = (claseId: string) => ["clases", claseId, "regenerar-codigo"] as const`, con un comentario de una línea.
- **`features/clases/hooks.ts`**:
  - `useRegenerarCodigo` suma **solo** `mutationKey: claveRegenerarCodigo(claseId)`. Su `mutationFn`, `onSuccess` y `onError` no cambian. Con la clave, el cambio de clase suelta al observador y la mutación de A conserva sus opciones: escribe el código de A en la caché de A y marca vieja A.
  - `useRegeneracionEnVuelo(claseId: string)` (nuevo, después de `useRegenerarCodigo`) devuelve `{ enVuelo, sigueEnVuelo }`, con el mismo cuerpo que `useGestionEnVuelo` sobre `claveRegenerarCodigo(claseId)` (`useIsMutating` y `queryClient.isMutating`, `exact: true`).
- **`features/clases/components/codigo-de-clase.tsx`** (forma exacta):

```tsx
const regeneracion = useRegeneracionEnVuelo(claseId)
const regenerandoRef = useRef<string | null>(null)
// La confirmación es de una clase: no pasa abierta a otra si el encabezado sobrevive al cambio.
const [confirmandoEn, setConfirmandoEn] = useState<string | null>(null)
// Enmienda 3 (M-03): al cambiar de clase, la confirmación de la otra se cierra (no reaparece al volver).
if (confirmandoEn !== null && confirmandoEn !== claseId) setConfirmandoEn(null)
const confirmando = confirmandoEn === claseId

const handleRegenerar = async () => {
  if (regenerandoRef.current === claseId || regeneracion.sigueEnVuelo()) return
  regenerandoRef.current = claseId
  try {
    await regenerar.mutateAsync()
  } catch {
    // El aviso lo da useRegenerarCodigo (T-03 de 01d1).
  } finally {
    if (regenerandoRef.current === claseId) regenerandoRef.current = null
    setConfirmandoEn((actual) => (actual === claseId ? null : actual))
  }
}
// «Regenerar código»: onClick={() => setConfirmandoEn(claseId)}
// cancelar(): debeEnfocarRegenerar.current = true; setConfirmandoEn(null)
// «Sí, regenerar»: onClick={() => void handleRegenerar()} enEspera={regenerar.isPending || regeneracion.enVuelo}
```

- El `claseId` del `finally` es el del clic. Al terminar, la confirmación de esa clase se cierra, como hacía el `onSettled` de hoy, sin cerrar la de otra.
- `enEspera` sigue siendo un solo `enEspera=` por botón (V-06: `codigo-de-clase.tsx` conserva 2).
- `CodigoDeClaseProps` no cambia (`formularios-ch3.test.tsx:690` lo pinta con las mismas props).
- El foco al cancelar (`debeEnfocarRegenerar` y `refBotonRegenerar`) no cambia.
- (Enmienda 5, O-r1-3) En «Restaurar», «Sí, regenerar» y «Subir»/«Bajar», la ref por clase es redundante con `sigueEnVuelo()` para el doble clic del mismo render: `queryClient.isMutating` lee la caché de forma síncrona, y `mutate`/`mutateAsync` dejan la mutación `pending` antes del primer `await`. Ninguna prueba de comportamiento la vigila (CH4-28 (a), CH4-20, CH4-40 (a) y CH4-38 siguen verdes sin ella; medición del tester, ronda 1). Se conserva por la regla de `CLAUDE.md` y por la forma única que exige CH4-01, que es lo que la vigila.

**El foco al cambiar de clase (Enmienda 3, M-03).**
- **Ir a B con la confirmación de A abierta.** En B la confirmación no se pinta y su control con el foco («Sí, regenerar» o «Cancelar») se desmonta. `useFocoAlTituloDeLaClase` (clave `${claseId}:${soloLectura}`, `hooks.ts:284-300`) lleva el foco al título de la clase B, nunca a `<body>`. Es conducta nueva y CH4-40 (b) la afirma. Ese gancho no se toca.
- **Volver a A con la petición en vuelo. Decisión: la confirmación de A no reaparece abierta.** Sin el remedio, al volver se montaría otra vez; su «Cancelar» lleva `autoFocus` (lo fija PR-A22d de `clase-layout.test.tsx:200`) y tomaría el foco en el commit. `useFocoAlPerderseElControl` ya no lo vería perdido, y la persona quedaría en una confirmación que no acaba de abrir: el lector de pantalla diría "Cancelar" en lugar del nombre de la clase, y un Enter la cerraría sin buscarlo. Lo descarto porque un salto del historial no debe abrir nada ni robar el foco.
- **El remedio** es la línea de "ajustar el estado durante el render" que ya usa el módulo (`if (soloLectura && confirmando) setConfirmando(false)` en `comentarios-de-publicacion.tsx`, `publicacion-del-muro.tsx` y `tabla-alumnos.tsx`, y su variante con `creando` en `trabajo-view.tsx`; no es un `setState` en un efecto): si `confirmandoEn` no es `null` ni la clase actual, pasa a `null`.
  - Al volver a A, la confirmación está cerrada y el foco se queda donde estaba (el título, tras el camino (b)).
  - Si la persona abre «Regenerar código», la confirmación nueva pinta «Sí, regenerar» en espera (por `regeneracion.enVuelo` de A), y su clic no manda nada (lo para `sigueEnVuelo()`).
  - Al responder, el `finally` cierra la confirmación de A si está abierta, y no toca la de otra clase.
- **Estados vecinos de §D-4 ter con el remedio:**
  - B no espera por A, y la respuesta de A sigue escribiendo solo en A.
  - Un fallo de A da un solo aviso.
  - El desmontaje no deja nada tomado.
  - Dos clics en el mismo render siguen parados: por `sigueEnVuelo()` y por la ref, que es redundante con él (Enmienda 5, O-r1-3).
  - «Cancelar» y volver a abrir en la misma clase (CH4-24) no cambia, porque `claseId` no cambia.
- **Hermanos del mecanismo** (una confirmación por clase que reaparece y toma el foco):
  - **«Restaurar»** del aviso (§D-4 bis): no aplica. No tiene confirmación (DH-09), ni `autoFocus`, ni estado abierto. Al volver a A solo se pinta en espera por la caché, y el foco se queda donde estaba.
  - **«Subir» y «Bajar»** (§D-4 bis): no aplica. Son botones sin confirmación ni `autoFocus`. La espera de A sale de la caché o del orden propio, y el efecto de foco descarta un orden de otra clase (`pendiente.claseId !== claseId`), así que nada toma el foco al volver.
  - **Las demás confirmaciones en línea** (Enmienda 5, frase corregida del manager): las de comentarios, publicaciones, dudas, recursos y temas viven en filas con `key` por un id de una sola clase y se montan de nuevo cerradas en la otra clase; las de personas (`FilaMaestro` y `FilaAlumno`, `key` por el id de la persona) sobreviven al salto si la persona está en las dos clases, y su confirmación pasa abierta (O-r1-1 de la ronda 1; familia H-3/O-E3-1). Decisión del humano (2026-11-11), opción (a): no se corrige en CHORE-04; va a ESTADO §3 como prioritario (A-2). `CodigoDeClase` es la única del encabezado que sobrevive al cambio de clase.

**Resultado que se fija (CH4-40):**
- B nunca muestra el código de A;
- B no espera por A;
- al volver a A con la petición en vuelo, «Sí, regenerar» de A está en espera y no manda otra;
- un fallo da un solo aviso y no deja nada tomado;
- la vista desmontada no deja nada tomado, y la respuesta escribe el código de A en la caché de A.

**«Sí, quitar» de un maestro no entra** (opcional en la decisión del humano). Su respuesta renueva la lista de B, que se lee del servidor y es correcta; no muestra un dato equivocado en B. Lo que deja es la lista de A vieja hasta su próxima lectura, y que el control de B espere por A. No es el mismo defecto: queda con los demás ganchos con id en ESTADO §3 (A-2).

### §D-5 · La regla estática (`frontend/src/lib/guardas-de-doble-clic-estatico.test.ts`, nueva)

Lee con `import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true })` el código de producción (sin `.test.`), sin comentarios (`/\/\*[\s\S]*?\*\//g` y las líneas que empiezan con `//`). Cuatro casos:

- **CH4-01 · Toda llamada a una mutación tiene su guarda.** Por cada coincidencia de `/\b(\w+)\.(mutate|mutateAsync)\(/g`, su manejador es la última línea anterior que cumple `/^ {2}const (\w+) = (?:async )?\(/m` (un manejador en el cuerpo de un componente: Prettier lo deja a dos espacios). Entre esa línea y la llamada hay una línea que toma una ref (Enmienda 1: `/\b(\w+Ref)\.current = (?!false\b|null\b)/`, para aceptar también `= claseId` de §D-4 bis). Entre las refs tomadas ahí (en `trabajo-view.tsx` también se toman `focoTrasOrdenarRef` y `generacionDelOrdenRef`, que no guardan nada), al menos una tiene su guarda. **Enmienda 1 (detalle menor, endurecida):** la guarda de esa ref (una línea `if (` … `<ref>.current` … `) return`) tiene que estar en uno de dos lugares: (a) entre la línea del manejador y la línea que toma la ref, o (b) si el manejador `M` es la segunda fase de otro, en otro manejador a dos espacios del mismo archivo, antes de su llamada a `M(` (por ejemplo, `handleSubmit` con su guarda y después `void handleGuardar(…)`). Corrección a la revisión: no basta (a); los seis manejadores de dos fases (`formulario-tarea.tsx`, `formulario-de-entrega.tsx`, `formulario-recurso.tsx`, `formulario-publicacion.tsx`, `panel-de-calificacion.tsx` y `hilo-privado.tsx`) toman la ref en la segunda fase y la comprueban en `handleSubmit`; los demás cumplen (a). Excepciones, lista cerrada y exacta: `/src/features/tareas/crear-tarea-view.tsx#crear.mutateAsync` y `/src/features/tareas/editar-tarea-view.tsx#editar.mutateAsync`; para ellas el caso comprueba que en `/src/features/tareas/components/formulario-tarea.tsx` `guardandoRef.current = true` aparece antes de `await onGuardar(` y que existe `if (guardandoRef.current`. Precondiciones: al menos 60 llamadas encontradas; al menos una en cada uno de `/src/app/`, `/src/features/auth/`, `/src/features/clases/`, `/src/features/admin/`, `/src/features/tareas/` y `/src/features/calificaciones/`; las dos excepciones existen. El mensaje de falla lista `ruta#llamada`.
- **CH4-02 · Ninguna mutación se llama desde una flecha en línea.** Ninguna línea de producción cumple `/=>\s*(?:void\s+)?\w+\.(?:mutate|mutateAsync)\(/`.
- **CH4-03 · Los "Ver más" y los botones que piden una consulta no cancelan la petición en vuelo.** Todo `fetchNextPage(` de producción es `fetchNextPage({ cancelRefetch: false })`, y todo `.refetch(` que aparece en la misma línea que `onClick=` es `.refetch({ cancelRefetch: false })`. Precondiciones: al menos 15 `fetchNextPage(` y la línea de «Reintentar» de `/src/components/layout/lista-de-clases.tsx`.
- **CH4-04 · Ningún botón espera solo la página siguiente.** Ninguna línea de producción con `enEspera=` menciona `isFetchingNextPage`, e `isFetchingNextPage` aparece en producción solo en `/src/features/calificaciones/mis-calificaciones-view.tsx`, `/src/features/tareas/entregas-view.tsx` y `/src/features/tareas/components/hilo-privado.tsx` (guardas de efectos de foco).

CH4-01 suma (Enmienda 1) un caso de control: aplicada sobre un texto de ejemplo dentro de la prueba (no un archivo de `src/`), falla con una llamada sin guarda, con una guarda después de tomar la ref y con una guarda de otra ref, y pasa con la forma de §D-1, con la de dos fases y con la de §D-4 bis.

El programador puede endurecer una expresión si la de arriba deja pasar algo, nunca aflojarla; si la endurece, lo dice en el resumen con la expresión final. Si un caso falla en un archivo que no está en "Se toca", se detiene (PA-3).

### §D-6 · Avisos, recargas y la matriz del resumen

Ningún aviso ni ninguna renovación cambia: viven en los ganchos (`useCerrarSesion`, `useLogin`, `useRegenerarCodigo`, `useAgregarAlumno`, `useAsignarMaestro`, `useRetirarMaestro`, `useBorrarComentario`, `useBorrarPublicacion`, `useQuitarAlumno`, `useOrdenarTemas`) o en los callbacks del `mutate` que ya existían (`formulario-unirse-clase.tsx`). Lo único nuevo en la matriz es la fila "segundo clic o envío con la petición en vuelo": ni petición, ni aviso, ni cambio de foco.

**Enmienda 1 (M-01): lo que hoy se anuncia ante los códigos con que `apiClient` redirige** (`401` sin refresco, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`). La matriz lo copia tal cual; este encargo no lo cambia:
- «Sí, regenerar» (`useRegenerarCodigo`): ningún aviso (calla con `errorQueRedirigeElCliente`, ADMIN-01d1).
- «Restaurar» del aviso de clase archivada (`useRestaurarClase` → `avisarErrorDeGestion`): ningún aviso (misma comprobación).
- «Agregar a la clase», «Asignar a la clase», «Sí, quitar» de un maestro y de un alumno, «Sí, borrar comentario» y «Sí, borrar» (sus ganchos en `features/clases/hooks.ts`), y «Subir»/«Bajar» (`useOrdenarTemas`): **un** aviso, `toast.error(mensajeDeErrorClases(error))`, sin mirar `errorQueRedirigeElCliente`.
- «Unirme a la clase» (`onError` del `mutate` en `formulario-unirse-clase.tsx:45-56`): **un** aviso y el campo sin marcar (lo fija `alumnos-b-r1.ataque.test.tsx:416-417`: "redirige con apiClient, avisa una sola vez y no marca el campo").
- Formularios de `auth`: su `MensajeError` un instante mientras la página se va (O-r1-6 de CHORE-03, ya en ESTADO §3).
- «Cerrar sesión»: `logout` no rechaza.

Ese aviso de más mientras se redirige no es de doble clic. Queda fuera de CHORE-04 como fila de ESTADO §3 con destino el `chore` de foco y navegación del marco (A-2). Lo que sí fija este encargo, en todos los casos, es que la ref se suelta y, con el control todavía montado, otro clic manda la petición (CH4-25).

El primer resumen del programador trae la matriz (`AGENTS.md`, "Matriz de avisos y recargas") de los 23 controles de §D-2 a §D-4 bis (18 de mutación con «Restaurar» del aviso, Enmienda 1; «Ver más comentarios», «Ver más clases» de cada inicio, «Reintentar» y «Subir»/«Bajar»), más el estado "cambio de clase con la petición en vuelo" en «Subir»/«Bajar», «Restaurar», «Sí, regenerar» y «Sí, quitar» de un maestro (§D-4 bis): por cada clase de respuesta (éxito, `5xx`, red, `409` donde aplique, `400 VALIDACION` en los formularios, y las que redirigen: `401` sin refresco, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`), qué se renueva, qué se anuncia (un solo aviso), a dónde va el foco y cuándo se suelta la ref, en los estados "segundo clic en vuelo" y "con la vista desmontada". El manager la contrasta con el código antes de que el tester ataque.

### §D-7 · Lo que no cambia

- Ningún texto de la interfaz. Ninguna traducción de errores (`mensajeDeErrorAuth`, `mensajeDeErrorClases` y las tablas de `data.ts` siguen igual).
- `docs/DESIGN.md`: sin patrón nuevo. La espera del control que lanzó un orden desde otra vista es el `enEspera` de siempre.
- Los ganchos de `features/auth/hooks.ts` y los de `features/clases/hooks.ts` salvo `useOrdenarTemas` y el nuevo `useOrdenDeTemasEnVuelo`.
- Backend, `shared/`, `infra/`: sin cambios. No hay endpoint nuevo.

## Cambios por capa

### shared/
Sin cambios.

### backend/core/
Sin cambios.

### backend/adapters/
Sin cambios.

### backend/handlers/
Sin cambios.

### backend/workers/
Sin cambios.

### backend/prisma/
Sin migración.

### infra/ y .env.example
Sin cambios.

### frontend/
- `features/auth/components/`: `formulario-login.tsx`, `formulario-registro.tsx`, `formulario-registro-maestro.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx`, `formulario-cambiar-contrasena.tsx` (§D-1, §D-2).
- `features/auth/acceso-restringido-view.tsx` (§D-2).
- `app/require-rol.tsx` (§D-2).
- `features/clases/components/`: `codigo-de-clase.tsx`, `formulario-unirse-clase.tsx`, `buscador-alumnos.tsx`, `buscador-de-maestros.tsx`, `comentarios-de-publicacion.tsx`, `publicacion-del-muro.tsx`, `tabla-alumnos.tsx` (§D-2), `panel-mis-clases.tsx` (§D-3), `aviso-de-clase-archivada.tsx` (§D-4 bis, Enmienda 1).
- `features/clases/`: `maestros-de-clase-view.tsx` (§D-2), `inicio-estudiante-view.tsx` e `inicio-maestro-view.tsx` (§D-3), `trabajo-view.tsx`, `hooks.ts`, `data.ts`, `types.ts` y `lib.ts` (§D-4 y §D-4 bis).
- `components/layout/lista-de-clases.tsx` (§D-3).
- Pruebas: las cuatro nuevas de §D-0, las dos normales de la lista cerrada y la de §D-R0.

## Acceso a datos

No aplica: no hay consultas nuevas ni cambian las existentes. Cada control manda las mismas peticiones que hoy, una vez por acción.

## Autorización

No cambia. La guarda es de interfaz y no sustituye nada del servidor: la cadena de middleware sigue decidiendo quién puede quitar, borrar, asignar o regenerar.

## Se toca y no se toca

Base: `9b6953c` (inicio de la rama). Una sola subentrega.

**Se toca (programador).** Rutas relativas a `frontend/src/`.
- Producción (26; Enmienda 1 suma `features/clases/components/aviso-de-clase-archivada.tsx`): `features/auth/components/formulario-login.tsx`, `formulario-registro.tsx`, `formulario-registro-maestro.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx`, `formulario-cambiar-contrasena.tsx`; `features/auth/acceso-restringido-view.tsx`; `app/require-rol.tsx`; `features/clases/components/codigo-de-clase.tsx`, `formulario-unirse-clase.tsx`, `buscador-alumnos.tsx`, `buscador-de-maestros.tsx`, `comentarios-de-publicacion.tsx`, `publicacion-del-muro.tsx`, `tabla-alumnos.tsx`, `panel-mis-clases.tsx`, `aviso-de-clase-archivada.tsx`; `features/clases/maestros-de-clase-view.tsx`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `trabajo-view.tsx`, `hooks.ts`, `data.ts`, `types.ts`, `lib.ts`; `components/layout/lista-de-clases.tsx`.
- Pruebas nuevas (4): `lib/guardas-de-doble-clic-estatico.test.ts`, `features/auth/guardas-ch4.test.tsx`, `features/clases/guardas-ch4.test.tsx`, `features/clases/ver-mas-y-orden-ch4.test.tsx`.
- Pruebas normales de la lista cerrada (2), solo en lo que dice esa lista.
- `docs/trabajo/CHORE-04-guardas-de-doble-clic/` (su resumen).

**Se toca (tester, ronda 0).** `lib/estatico-ch3-r2.ataque.test.ts`, solo C-1 de §D-R0.

**No se toca.** Todo lo demás; en particular:
- `features/auth/hooks.ts`, `lib.ts`, `data.ts` y `types.ts`; `features/auth/components/campo-contrasena.tsx`.
- En `features/clases/`: `components/seccion-de-tema.tsx`, `components/lista-maestros-de-clase.tsx`, `components/formulario-comentario.tsx` y todo componente, vista o archivo no listado arriba; en `hooks.ts`, todo gancho distinto de `useOrdenarTemas` y el nuevo `useOrdenDeTemasEnVuelo` (Enmienda 2: más la línea de `mutationKey` de `useRegenerarCodigo`, y el gancho nuevo `useRegeneracionEnVuelo`).
- `components/layout/` salvo `lista-de-clases.tsx` (`barra-superior.tsx`, `contenedor-rol.tsx`, `hooks.ts`, `data.ts`); `components/ui/`, `components/clase/`, `components/adjuntos/`, `components/foco/`, `components/seccion/`.
- `app/` salvo `require-rol.tsx`; `services/`; `lib/` de producción; `styles/`.
- `features/admin/`, `features/tareas/`, `features/calificaciones/`, `features/diagnostico/`.
- Todo `*.ataque.test.*` salvo C-1; toda prueba normal fuera de la lista cerrada.
- `package.json` y `package-lock.json` (sin dependencias nuevas); `shared/`, `backend/`, `infra/`.
- `docs/` fuera de `docs/trabajo/CHORE-04-guardas-de-doble-clic/`: `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE*.md` y `docs/ESTADO.md` (A-1 y A-2 los aplica el orquestador al cierre).

## Lista cerrada de pruebas normales que el programador puede cambiar

Grep del arquitecto en `9b6953c`, por los tres criterios de `AGENTS.md` y el de las reglas estáticas sobre el código fuente:

1. **Llamadas directas a funciones cuya firma cambia.**
   - `useOrdenarTemas` (sus variables pasan de `string[]` a `VariablesDeOrdenarTemas`): `rg "useOrdenarTemas" src --glob "*.test.*"` da `features/clases/formularios-ch3.test.tsx:52` (importación, sin cambio) y `:598-599`; `trabajo-01e-r1.ataque.test.tsx:312` y `trabajo-view.test.tsx:1330` son comentarios. **Cambia solo `features/clases/formularios-ch3.test.tsx:599`:** `result.current.mutate([TEMA_ID])` pasa a `result.current.mutate({ temaIds: [TEMA_ID], temaId: TEMA_ID, control: "subir" })`. Lo que el caso afirma (la petición y su error) no cambia: el cuerpo sigue siendo `{ temaIds }`.
   - `PanelMisClases` (prop `isFetchingNextPage` → `isFetching`): `rg "PanelMisClases|panel-mis-clases" src --glob "*.test.*"` solo da comentarios (`styles/clases-r1.ataque.test.ts:85`, `:243` como ruta de V-06, e `inicio-sin-datos-r2.ataque.test.tsx:26`). Ninguna prueba lo pinta directo: sin cambio.
   - `SeccionDeTema`, `ListaMaestrosDeClase`, `BarraSuperior`, `ContenedorRol` y los ganchos de `features/auth`: no cambian.
   - (Enmienda 1) `AccionesDelAdmin` y `useRestaurarClase`: el gancho no cambia; el componente pasa a `mutateAsync`. La búsqueda de `aviso-de-clase-archivada`, `AccionesDelAdmin`, `restaurandoRef`, `useRestaurarClase`, `useGestionEnVuelo` y `claveGestionDeClase` en `src/**/*.test.*` solo da la ruta en V-06 de `styles/clases-r1.ataque.test.ts:279` (1 `enEspera=`, sin cambio) y el título de `clases-admin-01c-r2.ataque.test.tsx:504`. Las pruebas que cuentan `cliente.isMutating()` (por ejemplo, `clase-archivada-01d1-vista.test.tsx:1778`) no cambian: `mutateAsync` deja la misma mutación en la caché. `OrdenPropioEnVuelo` es nuevo y nadie lo dobla. Sin cambio.
   - (Enmienda 2) `useRegenerarCodigo` (gana `mutationKey`) y `CodigoDeClase` (estado interno por clase y `mutateAsync`). La búsqueda de `useRegenerarCodigo`, `CodigoDeClase`, `codigo-de-clase` y `claveCodigoDeClase` en `src/**/*.test.*` da:
     - `features/clases/formularios-ch3.test.tsx:690` (CH3-B08), que pinta `CodigoDeClase` con las mismas props y afirma un solo aviso ante cada error. Sigue igual: el `catch` sin cuerpo no deja un rechazo sin manejar ni un aviso más.
     - Las `invalidateQueries`/`getQueryState` de `claveCodigoDeClase` en `clase-archivada-01d1-vista.test.tsx:1030`, `clase-archivada-01d1-r1.ataque.test.tsx:842-848` y `clase-archivada-01d2-vista.test.tsx:1169` (la consulta del código, que no cambia).
     - La ruta en V-06 (`styles/clases-r1.ataque.test.ts:244`, 2 `enEspera=`, sin cambio).

     Nadie llama a `useRegenerarCodigo` ni lo dobla. Sin cambio; la lista cerrada no crece.
2. **Dobles de tipos que ganan o pierden campos.** `rg "isFetchingNextPage" src --glob "*.test.*"`: `inicio-sin-datos-02c-r1.ataque.test.tsx:19` e `inicio-sin-datos-r2.ataque.test.tsx:20` (dobles de la consulta; §D-R0, sin cambio) y un comentario en `personas-ver-mas-03c1.test.tsx:10`. `rg "useUnirseAClase" src --glob "*.test.*"`: solo `inicio-sin-datos-r2.ataque.test.tsx:35` (§D-R0, sin cambio). Ningún doble de `VariablesDeOrdenarTemas` ni de `useOrdenarTemas`: los únicos `vi.mock(` de `./hooks`, `../hooks` o `@/features/clases/hooks` son los dos `inicio-sin-datos*`, que no pintan `TrabajoView`; ninguna prueba dobla `@/features/auth/hooks`.
3. **Aserciones sobre textos que cambian.** Ningún texto cambia.
4. **Reglas estáticas sobre el código de los archivos tocados** (búsqueda de `Ref.current) return` y de `CON_REF` en `src/**/*.test.ts`, y de cada archivo tocado en las pruebas que leen el código con `import.meta.glob`):
   - **`lib/errores-de-api-estatico.test.ts`, caso CH3-C13:** `CON_REF` (líneas 141-146) suma los seis formularios de `features/auth` (`formulario-login.tsx`, `formulario-registro.tsx`, `formulario-registro-maestro.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx`, `formulario-cambiar-contrasena.tsx`), así que los diez de `DIEZ` quedan en `CON_REF`; el comentario de cabecera del caso (líneas 115-123) suma una línea "CHORE-04 (§D-1, filas 12 a 17): los seis formularios de features/auth ganan la ref antes de su guarda isPending."; y en el título del caso, "solo corregir el correo y los tres formularios de /admin/maestros ganan una ref, antes de esa guarda" pasa a "los diez ganan una ref, antes de esa guarda (la rama sin ref queda para un formulario futuro)" (Enmienda 1, detalle menor: con los diez en `CON_REF` esa rama no corre hoy, y no se quita). Nada más del caso cambia (sigue fijando la línea de T-05 entre la guarda `isPending` y el primer `safeParse`, la ref antes de esa guarda y la lista exacta de los que reinician una mutación). Sin este cambio, la línea 173 (`not.toMatch(/Ref\.current\) return/)`) falla en los seis.
   - `styles/clases-r1.ataque.test.ts` (V-06, 90 `enEspera=`): sin cambio, porque ningún archivo gana ni pierde un `enEspera=` (PA-5).

Cualquier otra prueba normal que falle es PA-1.

## §D-R0 · Pruebas `*.ataque` que el cambio obliga a tocar (C-n del tester, ronda 0)

- **C-1 · `frontend/src/lib/estatico-ch3-r2.ataque.test.ts`.** `CON_REF` (líneas 64-69) suma los seis formularios de `features/auth`: `/src/features/auth/components/formulario-login.tsx`, `formulario-registro.tsx`, `formulario-registro-maestro.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx` y `formulario-cambiar-contrasena.tsx`. Su comentario (líneas 60-63) suma: "CHORE-04 ronda 0 (C-1, §D-R0; §D-1, filas 12 a 17 de CHORE-04): suman los seis formularios de features/auth; los diez llevan la ref." Por qué: el caso exige, en los archivos fuera de `CON_REF`, que `if (<m>.isPending) return` siga inmediatamente a `evento.preventDefault()`; con la ref de §D-1 entre las dos, los seis fallarían. Sigue protegiendo lo mismo: entre `evento.preventDefault()` y la guarda `isPending` va exactamente una línea `if (<nombre>Ref.current) return`, la línea de T-05 sigue inmediatamente a esa guarda, va dentro de `handleSubmit` antes de leer el formulario, y hay un solo `<m>.reset(`.

**Inventariadas, sin cambio** (siguen en verde con el plan; si alguna falla, PA-2):
- `features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx:19` e `inicio-sin-datos-r2.ataque.test.tsx:20`: sus dobles de la consulta traen `isFetchingNextPage: false` y no traen `isFetching`. Las vistas leerán `clases.isFetching` (sin definir en el doble), pero con `hasNextPage: false` el botón no se pinta y nada lo lee. `inicio-sin-datos-r2.ataque.test.tsx:35` dobla `useUnirseAClase` con `isPending` y `mutate`; el formulario no se envía en el caso y no importa nada nuevo de `./hooks`. El campo `isFetchingNextPage` de esos dobles queda sin lector; quitarlo sería cosmético y no se hace.
- `styles/clases-r1.ataque.test.ts`, V-06: 90 `enEspera=`, los mismos por archivo.
- `features/clases/ordenar-03c2-r1.ataque.test.tsx` (CL3-2R1-03, -05 y -06) y `ordenar-03c2-r2.ataque.test.tsx` (CL3-2R2-04 y -05): miran la espera con `waitFor` o después de que el orden se asienta; el cuerpo del `PUT` sigue siendo `{ temaIds }`.
- `features/clases/clase-archivada-01d1-vista.test.tsx`, `clase-archivada-01d1-r1/r2/r3.ataque.test.tsx` (orden con la clase archivándose): el efecto de foco y la generación de solo lectura no cambian.
- `app/en-espera-r1.ataque.test.tsx` ("dos clics en el mismo instante" de login y registro, y «Cerrar sesión»): una petición, como hoy.
- `features/auth/enlace-r2.ataque.test.tsx:117-139` (reintento tras un fallo de red con `sacarDeLaCacheAlAsentar`): la ref se suelta en el `onSettled` del `mutate`, antes de que se pinte el error, así que el clic inmediato manda la segunda petición.
- `features/clases/ver-mas-01e-r3.ataque.test.tsx`, `refactor-01c-r1.ataque.test.tsx`, `estatico-02c-r1.ataque.test.ts`, `estatico-03c1-r1.ataque.test.ts` y `components/layout/estatico-r1.ataque.test.ts`: sus reglas sobre `trabajo-view.tsx`, `hooks.ts`, `data.ts`, `lib.ts`, `comentarios-de-publicacion.tsx`, `publicacion-del-muro.tsx` y los formularios de `auth` se siguen cumpliendo (sin tipos fuera de `types.ts` salvo `Props`, sin `?? []`, sin `disabled`, sin lectores nuevos de `.puedeBorrar`, `perspectivaDeRuta(` en los mismos archivos, `useIndicadorDeSecciones` exportado, los mismos `CampoContrasena`).
- (Enmienda 1, N-03) `features/tareas/entregas-01d-r1.ataque.test.tsx:866-868`: lee `clases/lib.ts`, `data.ts` y `types.ts` y prohíbe `?? []`, `disabled`, valores por defecto y `console.`. `ordenDeLasVariables`, `claveOrdenDeTemas`, `VariablesDeOrdenarTemas` y `OrdenPropioEnVuelo` no usan nada de eso (el `?? null` de §D-4 vive en `hooks.ts`).
- (Enmienda 1, N-03) `lib/estatico-ch3-r1.ataque.test.ts:100`: los lectores de `.message` en `clases/lib.ts`. `ordenDeLasVariables` no lee `.message`.
- (Enmienda 1, N-03) `services/apiClient-ch3-r1.ataque.test.ts:86`: los importadores de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`. Ningún archivo tocado lo importa.
- (Enmienda 1, N-03) `features/tareas/como-se-entrega-01a.test.tsx:242-261` (normal): carga `clases/data.ts` para leer `TEXTOS_FORMULARIO_PUBLICACION.sinTema`. Sumar `claveOrdenDeTemas` no lo cambia.
- (Enmienda 1, M-02) «Restaurar» del aviso de clase archivada: `features/clases/clase-archivada-01d1-vista.test.tsx`, `clase-archivada-01d1-r1/r2/r3.ataque.test.tsx`, `clase-archivada-01d2-*` y `clases-admin-01c*.test.tsx` cuentan peticiones, avisos, espera y `cliente.isMutating()`. Con `mutateAsync` y la ref por clase, una petición por restauración, el mismo aviso del gancho y la misma espera (`restaurar.isPending || restauracion.enVuelo`).
- (Enmienda 3) «Sí, regenerar», que la forma de §D-4 ter debe dejar igual:
  - `features/clases/clase-archivada-01d1-vista.test.tsx:1845-1935` (T-03): un aviso por respuesta y la confirmación cerrada al asentarse, también al salir de la clase y con los códigos que redirigen; el `finally` cierra igual que el `onSettled` de hoy.
  - `features/clases/clase-archivada-01d1-r3.ataque.test.tsx:1157-1235`.
  - `features/clases/clases-r1.ataque.test.tsx:174-215` (doble activación con la espera visible).
  - `features/clases/clases-r2.ataque.test.tsx:185`.
  - `features/clases/clase-layout.test.tsx:200` (PR-A22d, normal): el foco va a «Cancelar» al abrir la confirmación y de vuelta al cancelar. El `autoFocus` de «Cancelar» no cambia; la línea de M-03 solo cierra la confirmación cuando cambia la clase, que esa prueba no hace.
- (Enmienda 1, M-01) `features/clases/alumnos-b-r1.ataque.test.tsx:416-417` ("redirige con apiClient, avisa una sola vez y no marca el campo"): sigue en verde. El aviso de «Unirme a la clase» ante un código que redirige no cambia (§D-6).

## Pruebas requeridas

Todas en el frontend, sin API ni infra. Prefijo `CH4-`. Reglas para todas:
- **"El mismo render"** es dos eventos dentro de un solo `act`: `act(() => { fireEvent.click(boton); fireEvent.click(boton) })`, o lo mismo con `fireEvent.submit(formulario)`. Dos `fireEvent` sueltos no sirven: el primero puede dejar pintado `isPending` antes del segundo (por eso `app/en-espera-r1.ataque` pasa hoy en login sin ref). Si una prueba no logra reproducir el mismo render con esta técnica, es PA-7.
- **Rojo primero.** Las pruebas de comportamiento se escriben y se corren antes del cambio de producción de su grupo (pasos 2 y 7); el resumen dice cuántas fallaron y cuáles, con el comando y su salida.
- **Router y caché reales** en los casos de caminos (frases de recuperación, sección activa, otra sección y regreso, historial): `rutas` de `app/router` y un `QueryClient` con las `defaultOptions` de `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`). La red se dobla con `fetch` y se cuentan las peticiones por método y ruta; las respuestas se retienen con una promesa diferida.
- Sin selectores de clase; por rol, nombre accesible, `aria-busy` y texto. Toda prueba termina con al menos una aserción; una precondición que falta hace fallar la prueba con un mensaje.

### Regla estática (`lib/guardas-de-doble-clic-estatico.test.ts`)
- **CH4-01**, **CH4-02**, **CH4-03** y **CH4-04**, como dice §D-5.

### Autenticación y marco (`features/auth/guardas-ch4.test.tsx`)
Los formularios son siete casos: login, registro de estudiante, registro de maestro, recuperar, restablecer (enlace de recuperación), establecer (invitación, con el campo de nombre) y cambio obligatorio.
- **CH4-10 · Una sola petición.** En cada formulario, con la respuesta retenida: (a) dos clics en su botón en el mismo render y (b) dos `submit` en el mismo render mandan una sola petición; el botón queda en espera hasta la respuesta; el segundo `submit` sale con `defaultPrevented` en `true` (no recarga la página). (Enmienda 5) En los formularios con `CampoContrasena` (cinco componentes, seis configuraciones), el `flushSync` de su *listener* de `submit` mete un render entre los dos eventos del mismo `act` también con el componente real, y la ref es redundante con `isPending`. Ahí CH4-10 (a), CH4-10 (b) y CH4-13 son la regresión de 'una sola petición con el componente real' y no vigilan la guarda. La vigilan ATQ-CH4-01 y ATQ-CH4-03 del tester (con un doble sin el `flushSync`), CH4-01, C-1 y CH3-C13. En recuperar, los tres casos sí la vigilan. No es PA-7 (arbitraje del manager).
- **CH4-11 · "Inténtalo de nuevo", camino "repetir el control".** En cada formulario, la frase "No pudimos completar la operación. Inténtalo de nuevo." (respuesta `500`) y el aviso de red (`TypeError` de `fetch`): un solo `MensajeError`, lo escrito se conserva, el botón sale de la espera; un clic más manda la segunda petición y, si responde bien, la pantalla llega a su destino de siempre.
- **CH4-12 · La misma frase, camino "otra ruta y regreso".** Login (ir a `/recuperar` con «¿Olvidaste tu contraseña?» y volver con el historial; Enmienda 1: sin plazo, porque el `staleTime` no afecta a las mutaciones y lo que importa es volver a montar el formulario), registro de estudiante (ir a `/login` y volver con el historial) y recuperar (ir a `/login` y volver con el historial): el formulario se monta de nuevo, un envío válido manda una petición nueva y la frase no queda pintada. No aplica, con su razón escrita en el caso como comentario y una aserción de que el camino no existe: restablecer, establecer y registro de maestro (el token se lee del fragmento una vez; al volver sin él la pantalla es la del enlace inválido, sin el formulario) y cambio obligatorio (la guarda de rutas devuelve a `/cambiar-contrasena`). "Pulsar la sección activa" no aplica a ninguno: las pantallas de cuenta no tienen secciones ni un enlace a sí mismas.
- **CH4-13 · Error previo y doble envío (sin `reset()` en vuelo).** En los seis formularios con la línea de T-05: tras un primer envío que responde `500`, dos `submit` válidos en el mismo render con la respuesta retenida mandan una sola petición; el botón sigue en espera hasta que responde y, al responder `500`, sale de la espera con un solo `MensajeError`; un clic más manda la tercera petición. (Enmienda 5) En los formularios con `CampoContrasena` (cinco componentes, seis configuraciones), el `flushSync` de su *listener* de `submit` mete un render entre los dos eventos del mismo `act` también con el componente real, y la ref es redundante con `isPending`. Ahí CH4-10 (a), CH4-10 (b) y CH4-13 son la regresión de 'una sola petición con el componente real' y no vigilan la guarda. La vigilan ATQ-CH4-01 y ATQ-CH4-03 del tester (con un doble sin el `flushSync`), CH4-01, C-1 y CH3-C13. En recuperar, los tres casos sí la vigilan. No es PA-7 (arbitraje del manager).
- **CH4-14 · `VALIDACION` fuera de contrato no deja la ref tomada.** En cada formulario: un campo que el formulario no pinta, un mensaje vacío o de solo espacios y un prefijo con ruta (`campo.<i>.subcampo:`), y en establecer contraseña con el enlace de recuperación (restablecer), `nombre:` (el campo que solo pinta la invitación): un solo mensaje legible (un `MensajeError` o un `ErrorDeCampo` con texto, nunca los dos ni ninguno), lo escrito se conserva, el botón sale de la espera **y un envío válido después manda otra petición**. También la secuencia: rechazo del servidor y después un envío que la validación local rechaza: un solo mensaje, el del envío local, y ninguna petición nueva. Los casos de `features/auth/formularios-ch3.test.tsx` ya cubren las tres primeras propiedades; CH4-14 agrega la última y el resumen nombra el caso existente de cada una.
- **CH4-15 · «Cerrar sesión», una sola petición.** En el marco por rol (`RequireRol` en `/estudiante`, `/maestro` y `/admin`), en "Acceso restringido" y en el cambio obligatorio: dos clics en el mismo render mandan un solo `POST /api/auth/logout` y la pantalla termina en `/login`. En el cambio obligatorio, con el cambio de contraseña en vuelo, «Cerrar sesión» manda su petición (las guardas son independientes).
- **CH4-16 · Un envío inválido no toma la ref.** En cada formulario: un envío que la validación local rechaza (su `ErrorDeCampo`), se corrige el campo y un solo clic manda la petición.

### Clases (`features/clases/guardas-ch4.test.tsx`)
Ocho controles: «Sí, regenerar» (maestro, encabezado de la clase), «Unirme a la clase» (estudiante, inicio), «Agregar a la clase» (maestro, Personas), «Asignar a la clase» (admin, Personas), «Sí, quitar» de un maestro (admin, Personas, con dos maestros), «Sí, borrar comentario» (Avisos), «Sí, borrar» de una publicación (Avisos) y «Sí, quitar» de un alumno (maestro, Personas).
- **CH4-20 · Una sola petición.** En los ocho, con la respuesta retenida, dos clics en el mismo render mandan una sola petición y el control queda en espera hasta la respuesta. En «Unirme a la clase», también dos `submit` en el mismo render, con `defaultPrevented` en el segundo.
- **CH4-21 · "Inténtalo de nuevo", camino "repetir el control".** En los ocho, su frase con un `500` ("Algo salió mal. Inténtalo de nuevo." o "No pudimos regenerar el código. Inténtalo de nuevo.") y su aviso de red: un solo aviso, el control sale de la espera, y repetirlo (volviendo a abrir la confirmación si se cerró, o volviendo a escribir el código) manda la segunda petición.
- **CH4-22 · La misma frase, camino "pulsar la sección activa".** Tras el `500`, pulsar en el control segmentado la sección en la que se está («Personas» o «Avisos»; para «Sí, regenerar», la sección abierta; para «Unirme a la clase», «Inicio» de la navegación estando en el inicio), con otra `location.key` en la misma ruta, y repetir el control: manda la segunda petición y el aviso viejo no se repite.
- **CH4-23 · La misma frase, camino "otra sección y regreso" antes de 30 s.** Tras el `500`, ir a otra sección («Avisos» desde «Personas» y al revés; para «Unirme a la clase», "Clases anteriores" y de vuelta) y volver antes de que venza el `staleTime`, y repetir el control (volviendo a abrir los comentarios o la confirmación si hace falta): manda la segunda petición.
- **CH4-24 · Confirmación cancelada y vuelta a abrir con la petición en vuelo** (S-05). En «Sí, regenerar», los dos «Sí, quitar», «Sí, borrar comentario» y «Sí, borrar»: «Cancelar», volver a pedir la acción y pulsar «Sí, …»: el botón está en espera y no sale otra petición; al responder, un solo aviso.
- **CH4-25 · Errores con que `apiClient` redirige (Enmienda 1, M-01).** En los ocho, con `403 ACCESO_RESTRINGIDO` (con `irA` de `services/navegacion` doblado) y con `401` sin refresco, el aviso de hoy, control por control (§D-6): «Sí, regenerar», ninguno; los otros siete, uno solo, el texto de `mensajeDeErrorClases` para ese código (y en «Unirme a la clase», el campo sin marcar). Además, en los ocho, con el control todavía montado, otro clic manda la petición (la ref quedó libre). La prueba no afirma "ningún aviso" donde hoy hay uno.
- **CH4-28 · «Restaurar» del aviso de clase archivada (Enmienda 1, M-02).** (a) Dos clics en el mismo render mandan una sola petición, y el botón espera hasta la respuesta. (b) Tras un `500`, un solo aviso; otro clic manda la segunda petición. (c) **Misma instancia, otra clase:** con la restauración de la clase archivada A retenida, ir por el historial a la clase archivada B (sin pasar por otra ruta, con el detalle de B en caché). «Restaurar» de B no está en espera y su clic manda la petición de B. Soltar la de A después: un aviso de A y la lista de A renovada; nada de B queda en espera. Volver a A por el historial con la de A todavía retenida (en otro caso): «Restaurar» de A en espera; al soltarla, sale de la espera.
- **CH4-40 · «Sí, regenerar» con cambio de clase (Enmienda 2, S-07 opción b).** Maestro de las clases A y B, con el detalle y el código de las dos en caché. Cada caso afirma, al final y en cada paso, que el encabezado de B nunca muestra el código nuevo de A, ni en el texto ni en la caché (`claveCodigoDeClase(B)`):
  - (a) dos clics en «Sí, regenerar» en el mismo render: una sola petición; el botón espera hasta la respuesta;
  - (b) **la respuesta de A llega estando en B:** con el `POST` de A retenido, saltar por el historial a la misma sección de B (misma instancia del encabezado). En B, la confirmación no está abierta y «Regenerar código» de B no espera. Soltar la de A: un solo aviso de éxito; B conserva su código; la caché de A tiene el código nuevo. Regenerar en B manda el `POST` de B;
  - (b′) (Enmienda 3, M-03) **el foco en (b)**, en dos casos según dónde estaba antes del salto (en «Sí, regenerar» o en «Cancelar» de la confirmación de A): en B la confirmación no está y el foco queda en el título de la clase B (`document.activeElement` es ese encabezado, nunca `<body>`);
  - (c) **volver a A con la petición en vuelo:** desde (b) sin soltar, volver a A por el historial. (Enmienda 3, M-03) La confirmación de A **no** reaparece abierta: «Regenerar código» está a la vista, ningún «Cancelar» tiene el foco y el foco sigue en el título, como quedó tras (b). Los dos casos de (b′) se prolongan aquí. Abrir «Regenerar código»: «Sí, regenerar» está en espera y un clic no manda otro `POST`. Al soltar, A muestra su código nuevo, la confirmación se cierra y nada queda en espera;
  - (d) **fallo estando en B:** el `POST` de A responde `500` estando en B. Un solo aviso ("No pudimos regenerar el código. Inténtalo de nuevo."), nada en espera en B, B conserva su código. Al volver a A, la confirmación está cerrada y repetir «Regenerar código» → «Sí, regenerar» manda el `POST` de A (camino "repetir el control");
  - (e) **desmontaje:** con el `POST` de A retenido, ir a una ruta fuera de la clase (el inicio) y soltar. Un solo aviso, sin excepciones. Al volver a A, se ve el código nuevo y nada queda en espera.
- **CH4-29 · Cambio de clase sin desmontar, control sin `mutationKey` (Enmienda 1, hermanos de M-02; Enmienda 2: solo «Sí, quitar» de un maestro, porque «Sí, regenerar» pasa a CH4-40).** «Sí, quitar» de un maestro (Personas del admin). Con la petición de A retenida, saltar por el historial a la misma sección de B (misma instancia) y soltar la de A: nada queda en espera en B y un clic en el control de B manda su petición (la ref no quedó tomada). La prueba no fija qué se ve en B mientras la de A vuela ni qué renueva la respuesta de A: eso es H-3 (S-07), con destino.
- **CH4-26 · Una guarda para la lista de maestros.** Con dos maestros y el retiro del primero en vuelo, «Sí, quitar» del segundo está en espera y su clic no manda nada.
- **CH4-27 · «Unirme a la clase», `VALIDACION` fuera de contrato.** Un campo que el formulario no pinta, un mensaje vacío o de solo espacios y un prefijo con ruta (`codigo.0.x:`), y la secuencia rechazo del servidor seguido de un envío que la validación local rechaza: un solo mensaje legible (aviso o `ErrorDeCampo`, nunca los dos ni ninguno), lo escrito se conserva, el botón sale de la espera y un envío válido después manda otra petición.

### "Ver más", «Reintentar» y el orden de los temas (`features/clases/ver-mas-y-orden-ch4.test.tsx`)
- **CH4-30 · «Ver más comentarios».** (a) Dos clics en el mismo render piden una sola página. (b) Con la lista de comentarios recargándose (tras comentar con éxito, o con `invalidateQueries` de su clave, con la recarga retenida), el botón está en espera y un clic no pide página; al soltar la recarga sale de la espera y un clic pide la página siguiente con el cursor de la lista renovada. (c) (Enmienda 4, P-1) Si la página falla (`500`), la vista hace lo de hoy, que este encargo no cambia (§D-3, §D-7):
  - salen las dos peticiones de la página (`retry: 1`) y ninguna más, contadas después de esperar;
  - la lista se reemplaza por un solo `MensajeError` (`role="alert"`) con el texto de `mensajeDeErrorDeLista` para ese error;
  - «Ver más comentarios» ya no está;
  - ningún control del bloque queda en espera.
- **CH4-31 · «Ver más clases» de los dos inicios** (estudiante y maestro): (a) y (b), como CH4-30. En (b), dos caminos: recarga con `invalidateQueries` de la lista, con el inicio pintado y la recarga retenida; y (Enmienda 1, N-02) salir del inicio, marcar vieja la lista y volver con la recarga retenida, de modo que el inicio pinta la lista de la caché mientras la recarga vuela. "Tras unirse a otra clase" no aplica: «Unirme a la clase» navega a la clase en su `onSuccess` (también con `yaEstabas`), y el inicio ya no está pintado. (Enmienda 4, M-02) En los dos caminos, la lista del servidor cambia antes de soltar la recarga, y el caso afirma que la página pedida lleva el cursor de la lista renovada, no el de la vieja.
  (c) (Enmienda 4, P-1) Lo mismo que CH4-30 (c), en los dos inicios (estudiante y maestro), con «Ver más clases» y el `MensajeError` del panel. Si la página falla (`500`), la vista hace lo de hoy, que este encargo no cambia (§D-3, §D-7):
  - salen las dos peticiones de la página (`retry: 1`) y ninguna más, contadas después de esperar;
  - la lista se reemplaza por un solo `MensajeError` (`role="alert"`) del panel, con su texto para ese error;
  - «Ver más clases» ya no está;
  - ningún control del bloque queda en espera.
- **CH4-32 · «Reintentar» de la lista de clases de la barra** (estudiante y maestro): con la consulta en error y la nueva petición retenida, dos clics en el mismo render mandan un solo `GET`; al responder, la lista aparece.
- **CH4-33 · `ordenDeLasVariables` (unitaria).** `{ temaIds: ["a"], temaId: "t", control: "subir" }` da `{ temaId: "t", control: "subir" }`; lo mismo con `"bajar"`; `null`, `undefined`, un número, un arreglo, un objeto sin `temaId`, con `temaId` que no es texto, sin `control` o con `control: "otro"` dan `null`.
- **CH4-34 · Orden entre montajes con el `PUT` en vuelo.** «Subir» de un tema con el `PUT` retenido; ir a otra sección de la clase y volver (en otro caso, atrás y adelante del historial): en la vista nueva «Subir <tema>» está en espera; un clic en cualquier «Subir» o «Bajar» no manda otro `PUT`; al soltar el `PUT` con éxito, nada queda en espera, se ve el orden nuevo y el siguiente «Subir» manda un `PUT` que parte de él.
- **CH4-35 · Lo mismo con el `PUT` ya respondido y la recarga por sección retenida** (la mutación sigue pendiente hasta que la lista se renueva). Orden fijo de los pasos (Enmienda 1, N-01):
  1. con la vista de "Actividades de aprendizaje" montada, retener la recarga por sección (`GET …/temas?seccion=actividades`);
  2. pulsar «Subir» y dejar que el `PUT` responda con la vista montada;
  3. esperar a que la recarga retenida salga (la mutación sigue pendiente);
  4. ir a otra sección y volver;
  5. comprobar que el control de origen está en espera y que un clic no manda otro `PUT`;
  6. soltar la recarga: nada queda en espera y el siguiente «Subir» parte del orden nuevo.

  Si el `PUT` respondiera con la vista fuera, en una sección que no observa la lista de actividades, la mutación se asentaría de inmediato y el caso no probaría nada.
- **CH4-36 · Frases del orden con la vista desmontada al responder.** "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo." (`409 ORDEN_DESACTUALIZADO`; Enmienda 1, detalle menor: el texto no es una constante de `features/clases/data.ts`, sino el `mensaje` del servidor, que `mensajeDeErrorClases` pinta tal cual porque el código está en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`. La prueba lo manda en el doble del `409` y lo busca en el aviso) y "Algo salió mal. Inténtalo de nuevo." (`500`): con el `PUT` respondido mientras la vista no está, al volver nada está en espera y hay un solo aviso. Los tres caminos de la frase, cada uno en su caso: repetir «Subir» manda otro `PUT`; pulsar «Actividades de aprendizaje» estando ahí y repetir, también; ir a otra sección, volver antes de 30 s y repetir, también. En los tres, el `PUT` nuevo se calcula con la lista renovada.
- **CH4-37 · Otra clase no espera.** (a) Con el `PUT` de la clase A retenido, ir a B pasando por otra ruta (vista nueva): en B ningún «Subir» está en espera y su clic manda el `PUT` de B.
  (b) (Enmienda 1, M-02) **Misma instancia:** con el `PUT` de A retenido, saltar por el historial de `…/A/trabajo` a `…/B/trabajo` sin pasar por otra ruta, con el detalle y los temas de B en caché:
  - con el foco en el «Subir» pulsado antes del salto, el foco va al encabezado de la vista (`clasePrevia`), como hoy;
  - en B ningún «Subir» o «Bajar» está en espera, y su clic manda el `PUT` de B (B no espera por A);
  - al soltar después el `PUT` de A, la lista de temas de B no cambia (la respuesta de A no la escribe; H-3) y nada de B queda en espera;
  - volver por el historial a A: nada en espera y su «Subir» manda un `PUT` nuevo.

  (c) Variante de (b): volver a A con el `PUT` de A todavía retenido. El control de origen de A está en espera (por la caché) y un clic no manda otro; al soltarlo, sale de la espera y el siguiente «Subir» manda.
- **CH4-38 · Misma vista, dos controles en el mismo render.** «Bajar» de un tema y «Subir» de otro en el mismo render: un solo `PUT` (regresión de la ref de TAREAS-01e).
- **CH4-39 · Sin parpadeo al asentarse.** Desde el clic en «Subir» hasta que todo sale de la espera, un `MutationObserver` sobre `aria-busy` registra que solo el control pulsado estuvo en espera (ningún otro «Subir» o «Bajar» pasó por ella), en la vista que lanzó el orden y en la que se montó con él en vuelo.

### Regresión
- Las suites de `src/features/auth`, `src/features/clases`, `src/lib`, `src/app` y `src/components/layout` en verde en cada ronda; la suite completa del frontend, una vez, en la verificación del manager al cerrar. Sin backend: no se toca `shared/`.

## Puntos de ataque para el Tester

Por mecanismo, no por control (lección de ADMIN-01):
1. **La ref, en todos sus estados vecinos:** dos clics, dos Enter o clic y Enter en el mismo render; en renders distintos con la petición en vuelo; tras éxito con el componente aún montado (recuperar, regenerar, agregar); tras cada clase de error (`5xx`, red, `409`, `400 VALIDACION`, `503 SERVICIO_OCUPADO`, y los que redirigen: `401` sin refresco, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`): ¿se suelta y el siguiente clic manda?; con la vista desmontada y la respuesta después (sin excepciones ni avisos duplicados); con un error previo y `reset()` (CH4-13); con `sacarDeLaCacheAlAsentar` en el gancho; con la confirmación cancelada y vuelta a abrir (CH4-24).
2. **El segundo `submit` con la ref tomada** no debe dejar pasar el envío nativo (`defaultPrevented`).
3. **"Ver más" y «Reintentar»:** clic durante una recarga de fondo de la lista, tras un error de la página, dos clics en el mismo render; que la página pedida después use el cursor de la lista renovada.
4. **El orden de los temas entre montajes:** salir y volver con el `PUT` en vuelo, con la recarga posterior en vuelo, con el `PUT` fallando mientras la vista no está (`409` y `500`), con atrás y adelante del historial, con otra clase, con la clase archivándose a mitad; que ningún otro control parpadee en espera; que el orden siguiente parta de la lista renovada.
5. **La regla estática:** buscar formas de llamar a una mutación que CH4-01 y CH4-02 no vean (dentro de un `useEffect`, de un `.then`, de una `function` declarada, de un manejador a cuatro espacios) y proponer endurecerla. Una forma que hoy no existe en `src/` se anota como observación; una que existe y no tiene guarda es hallazgo.
6. **(Enmienda 1, M-02) Cambio de un id de la ruta con el componente montado:** saltos del historial entre dos clases (y entre dos clases archivadas en la vista del admin) con la petición en vuelo, en «Subir»/«Bajar», «Restaurar», «Sí, regenerar» y «Sí, quitar» de un maestro: ninguna ref ni estado local tomado más allá de la respuesta; la clase nueva no espera por una `mutationKey` de otra clase; al volver a la clase de origen, la espera sale de la caché y termina; el foco de `clasePrevia` no cambia. (Enmienda 3) Con «Sí, regenerar»: el foco tras el salto (al título de la clase nueva) y que ninguna confirmación reaparezca abierta ni tome el foco al volver.

**Decisiones tomadas que no son hallazgo** (se anotan como observación, sin prueba roja):
- (Enmienda 1, M-01; decidida por el humano el 2026-11-10) Los siete controles de clases que hoy avisan ante un código con que `apiClient` redirige siguen avisando una vez (§D-6); destino: el `chore` de foco y navegación (A-2).
- (Enmienda 1, S-07; Enmienda 2: «Sí, regenerar» sale de esta lista, y que B muestre el código de A sí es hallazgo, CH4-40) H-3: en «Sí, quitar» de un maestro y los ganchos sin `mutationKey` de otros módulos, mientras la petición de A vuela en una instancia que ya muestra B, el control de B espera por A y la respuesta de A corre con las opciones de B. Destino: el `chore` de foco y navegación (A-2). Sí es hallazgo si alguna ref o espera queda tomada después de la respuesta (CH4-29).
- S-01: volver a montar «Unirme a la clase», los formularios de `auth`, «Agregar», «Asignar», «Quitar», «Borrar», «Regenerar» o «Cerrar sesión» con la petición en vuelo y repetir la acción manda otra petición.
- S-04 (H-2): pulsar dos veces la sección activa con la lista en error pide dos veces (destino: `chore` de foco y navegación).
- S-05: «Cancelar» cierra la confirmación con la petición en vuelo.
- Preexistente: si la persona sale del inicio con «Unirme a la clase» en vuelo, el aviso y la navegación del `mutate` no ocurren (viven en el componente, no en el gancho). Este `chore` no lo cambia; el orquestador lo registra en ESTADO §3 si el tester lo anota.
- Los dobles de `inicio-sin-datos*.ataque` conservan `isFetchingNextPage` sin lector (§D-R0).

## Riesgos y desacuerdos

- **R-01 · 33 archivos (Enmienda 1), en la frontera de "unos 30".** El humano decidió el 2026-11-10 una sola subentrega (Enmienda 2). Si el humano prefiere partir, el corte de §D-0 deja 11 y 22 archivos.
- **R-02 · S-01 deja fuera el remontaje de 17 controles.** Es una decisión de alcance; el humano la aceptó el 2026-11-10 (Enmienda 2).
- **R-03 · CH4-01 es una regla textual.** Se apoya en la sangría que deja Prettier (manejadores a dos espacios). Puede dejar pasar una forma rara (por ejemplo, una llamada dentro de un manejador anidado a cuatro espacios cuyo componente toma otra ref antes) o fallar en una forma válida que hoy no existe. Lo mitigan CH4-02 y las pruebas de comportamiento; una falla en un archivo fuera de "Se toca" es PA-3.
- **R-04 · Cambio visible declarado:** «Ver más comentarios» y «Ver más clases» quedan en espera durante las recargas de fondo de su lista (§D-3).
- **R-05 · Dos fuentes para la espera de «Subir» y «Bajar».** El estado local (la vista que lanzó el orden) y la caché (la vista que se montó con él en vuelo). Llevan los mismos datos (las variables del `mutate`), así que no pueden discrepar; si discreparan, gana el estado local. CH4-39 cubre el parpadeo.
- **R-06 · `useMutationState` es nuevo en el proyecto.** Existe desde TanStack Query 5.0 (el proyecto usa `^5.103.2`). Si no estuviera o su `select` no pudiera leer las variables sin `any` ni `as`, PA-6.
- **R-07 · Carril.** ESTADO lo da como normal. Los formularios de contraseña y el cierre de sesión ganan una guarda de interfaz, sin cambiar qué se envía, cómo se guarda la sesión ni la salida de la caché de mutaciones (`sacarDeLaCacheAlAsentar` sigue igual); no toca `middleware/`, `adapters/auth`, migraciones ni `infra/`. Si el manager lo cuenta como "sesiones o contraseñas", pasa a sensible y solo cambia la aprobación (explícita y por escrito). Enmienda 2: el manager lo confirmó como normal y el humano lo decidió el 2026-11-10.
- **R-08 (Enmienda 1; Enmienda 2 suma «Sí, regenerar») · `mutateAsync` en tres controles.** «Subir»/«Bajar», «Restaurar» del aviso y «Sí, regenerar» pasan de `mutate` con `onSettled` a `mutateAsync` en `try/catch/finally`, para no depender del observador (§D-4 bis). El rechazo se atrapa sin hacer nada porque el aviso vive en el gancho; si una prueba muestra un rechazo sin manejar o un aviso doble, es hallazgo. La liberación llega un microtask después de donde la daba el `onSettled`; la espera de la caché cubre ese instante sobre el mismo control (CH4-39).
- **R-09 (Enmienda 1) · H-3 queda abierto (S-07).** Mientras no llegue su destino, una petición en vuelo de una clase puede renovar o escribir datos de la clase que la vista muestra después de un salto del historial. Este encargo lo cierra en el orden de los temas y (Enmienda 2) en «Sí, regenerar», donde era un dato equivocado en pantalla.
- **Desacuerdos con `ARCHITECTURE-ESSENTIALS.md`:** ninguno.

## Comprobación humana

No hace falta (S-06, decidida por el humano el 2026-11-10). Todo lo que cambia lo prueban jsdom y las reglas estáticas; no hay valores ni patrones visuales nuevos.

## Paradas (el programador se detiene y reporta)

- **PA-1.** Una prueba normal fuera de la lista cerrada falla por el cambio.
- **PA-2.** Una `*.ataque` distinta de C-1 falla, o C-1 no está aplicada por el tester al empezar.
- **PA-3.** CH4-01 a CH4-04 fallan en un archivo que no está en "Se toca", o exigirían aflojar una expresión de §D-5.
- **PA-4.** Hace falta tocar un gancho distinto de `useOrdenarTemas` y `useOrdenDeTemasEnVuelo` (Enmienda 2, excepción mínima: en `useRegenerarCodigo`, solo la línea `mutationKey: claveRegenerarCodigo(claseId)`; y el gancho nuevo `useRegeneracionEnVuelo`. Cualquier otro cambio en `useRegenerarCodigo` es PA-4), o un archivo de "No se toca" (por ejemplo `seccion-de-tema.tsx`, `lista-maestros-de-clase.tsx`, `barra-superior.tsx` o `features/auth/hooks.ts`).
- **PA-5.** Un archivo ganaría o perdería un `enEspera=` (V-06 de `styles/clases-r1.ataque`).
- **PA-6.** `useMutationState` no está disponible, o leer las variables exige `any` o `as`.
- **PA-7.** Una prueba de "el mismo render" no lo reproduce con dos eventos en un solo `act`. No se cambia la técnica por una más débil.

## Pasos de implementación

0. **Antes de correr cualquier suite**, el programador pide al orquestador la respuesta del humano sobre si la otra copia de trabajo corre una suite (`AGENTS.md`, "Trabajo en paralelo"); sin ella, se detiene.
1. **Ronda 0 del tester:** C-1 de §D-R0 en `lib/estatico-ch3-r2.ataque.test.ts`. El programador arranca con C-1 aplicada (si no, PA-2).
2. **Rojo primero (auth y clases):** escribir `features/auth/guardas-ch4.test.tsx` (CH4-10 a CH4-16) y `features/clases/guardas-ch4.test.tsx` (CH4-20 a CH4-29 y, Enmienda 2, CH4-40; Enmienda 1 suma CH4-28 y CH4-29) y correrlas con `npx vitest run src/features/auth/guardas-ch4.test.tsx src/features/clases/guardas-ch4.test.tsx`. Anotar en el resumen cuáles fallan (se esperan rojas las de una sola petición y la de error previo; verdes las de reintento).
3. **`features/auth`:** los seis formularios (§D-1, §D-2) y `acceso-restringido-view.tsx`.
4. **`app/require-rol.tsx`** (§D-2).
5. **Lista cerrada, CH3-C13:** `lib/errores-de-api-estatico.test.ts`, exactamente como dice la lista.
6. **`features/clases`, controles de mutación:** `codigo-de-clase.tsx`, `formulario-unirse-clase.tsx`, `buscador-alumnos.tsx`, `buscador-de-maestros.tsx`, `maestros-de-clase-view.tsx`, `comentarios-de-publicacion.tsx` (solo su «Sí, borrar comentario»), `publicacion-del-muro.tsx`, `tabla-alumnos.tsx` (§D-2); y (Enmienda 1) `aviso-de-clase-archivada.tsx` con la forma de §D-4 bis, sin tocar `useRestaurarClase` ni `useGestionEnVuelo`. Enmienda 2: `codigo-de-clase.tsx` con la forma de §D-4 ter, junto con `claveRegenerarCodigo` (`data.ts`), la línea de `mutationKey` de `useRegenerarCodigo` y `useRegeneracionEnVuelo` (`hooks.ts`).
7. **Orden de los temas, rojo primero:** `types.ts` (`VariablesDeOrdenarTemas` y, Enmienda 1, `OrdenPropioEnVuelo`) y `lib.ts` (`ordenDeLasVariables`); escribir `features/clases/ver-mas-y-orden-ch4.test.tsx` (CH4-30 a CH4-39) y correrla; anotar cuáles fallan. Después `data.ts` (`claveOrdenDeTemas`), `hooks.ts` (`useOrdenarTemas` y `useOrdenDeTemasEnVuelo`), `trabajo-view.tsx` (§D-4 y la forma exacta de §D-4 bis) y la lista cerrada `features/clases/formularios-ch3.test.tsx:599`.
8. **"Ver más" y «Reintentar»:** `comentarios-de-publicacion.tsx:188`, `panel-mis-clases.tsx`, los dos inicios y `components/layout/lista-de-clases.tsx` (§D-3).
9. **Regla estática:** `lib/guardas-de-doble-clic-estatico.test.ts` (CH4-01 a CH4-04).
10. **Verificación de la ronda:** `npm run lint` (desde `frontend/`) y `npx vitest run src/features/auth src/features/clases src/lib src/app src/components/layout`. La suite completa del frontend y `npm run build` los corre el manager al cerrar. Formateadores solo sobre `frontend/` (`AGENTS.md`).
11. **Resumen verificable** (`AGENTS.md`): cada CH4 con su archivo y título exacto; los casos existentes que cubren CH4-14 y CH4-27; las cifras con su comando (`npx vitest list`); la última línea de `lint` y de la suite; la lista de hermanos por mecanismo (los estados vecinos de la ref del punto 1 de "Puntos de ataque", el segundo `submit` del punto 2, los de los "Ver más" del punto 3, los del orden del punto 4 y, Enmienda 1, los del cambio de id del punto 6), uno por uno, con si el remedio aplica y se aplicó; la matriz de §D-6; las expresiones finales de §D-5 si se endurecieron; (Enmienda 2, O-E1-1) que las flechas en línea que llaman a un manejador asíncrono (`onOrdenar`, «Restaurar» y «Sí, regenerar») son así a propósito, por `no-misused-promises`, y no llaman a una mutación; y el conteo final de archivos tocados contra los 33 de §D-0 (Enmienda 1).

## Al cierre (los aplica el orquestador, con la autorización del humano para los archivos fuera de `docs/trabajo/`)

- **A-1 · `CLAUDE.md` › Componentes**, después de la viñeta de la guarda síncrona con ref, una viñeta nueva: "La guarda va en un manejador con nombre del componente dueño de la mutación, nunca en una flecha en línea en el JSX: se comprueba al inicio (en un formulario, después de `evento.preventDefault()` y antes de la guarda `isPending` y de `reset()`), se toma justo antes de `mutate` y se suelta en el `onSettled` de ese `mutate`. Si un solo clic sobre el control montado de nuevo reenviaría sin volver a confirmar (por ejemplo, «Subir» y «Bajar»), la guarda lee además la caché de mutaciones por su `mutationKey`. `lib/guardas-de-doble-clic-estatico.test.ts` lo verifica en todo `src/`, junto con `fetchNextPage({ cancelRefetch: false })` en los "Ver más" y `refetch({ cancelRefetch: false })` en los botones que piden una consulta (CHORE-04)." Enmienda 1 (M-02) suma a la misma viñeta: "Si la `mutationKey` lleva un id de la ruta y el componente sobrevive al cambio de ese id (sin `key`), un cambio de clave suelta al observador y el `onSettled` del `mutate` ya no corre: la guarda guarda el id que protege y se suelta en el `finally` de `mutateAsync`." Enmienda 2 (O-E1-2): antes de aplicarla, el orquestador revisa que A-1 siga siendo una sola viñeta legible; si no lo es, la parte en dos viñetas seguidas sin cambiar su contenido y lo anota en `aprobacion.md`.
- **A-2 · `docs/ESTADO.md`:** tachar las filas 3 a 6, 12 a 23 y 27 a 29 de la viñeta CHORE-04 con "Hecho en CHORE-04"; en la fila de la sección 3 de los "Ver más" de CLASES, marcar hechos comentarios e inicios; registrar H-2 (S-04) con destino el `chore` de foco y navegación del marco, y S-01 como decisión del encargo. Enmienda 1 suma dos filas en ESTADO §3, las dos con destino el `chore` de foco y navegación del marco, salvo que el humano decida otro:
  - (M-01) «Agregar a la clase», «Asignar a la clase», «Sí, quitar» (maestro y alumno), «Sí, borrar comentario», «Sí, borrar» y «Unirme a la clase» avisan con un toast ante `401` sin refresco y `403 ACCESO_RESTRINGIDO` mientras `apiClient` ya redirige («Sí, regenerar» y «Restaurar» callan); para «Unirme a la clase», `alumnos-b-r1.ataque.test.tsx:416-417` fija hoy "avisa una sola vez";
  - (S-07) H-3: en un componente que sobrevive al cambio de un id de la ruta, un gancho sin `mutationKey` hace que la petición en vuelo de A corra con las opciones de B (`mutationObserver.js:62`), y el control de B espera por A. CHORE-04 lo cerró en el orden de los temas y (Enmienda 2) en «Sí, regenerar». Entre los pendientes, «Sí, quitar» de un maestro (`useRetirarMaestro` en `MaestrosDeLaClase`): renueva la lista de B en lugar de la de A, y el «Sí, quitar» de B espera por A. (Enmienda 3) La lista de A no se marca vieja: si la persona vuelve a A antes de que venzan los 30 s del `staleTime`, todavía ve al maestro quitado, y su «Sí, quitar» respondería con error. (Enmienda 5, O-r1-1; decidido por el humano el 2026-11-11, opción (a); **prioritario** dentro de ese `chore` por ser destructivo) La confirmación de «Sí, quitar» de un maestro (`FilaMaestro`) o de un alumno (`FilaAlumno`) pasa abierta de la clase A a la B cuando la misma persona está en las dos: la fila lleva `key` por el id de la persona y sobrevive al salto del historial. Es una confirmación destructiva que aparece en una clase donde nadie la pidió, y un clic retira a la persona de B. Existía antes de CHORE-04.
  - (Enmienda 4, P-1; Enmienda 5: decidido por el humano el 2026-11-11) A la fila de ESTADO §3 del hermano de T-02 de CLASES-03e, con destino el `chore` de foco y navegación del marco, sumar: "Tras el fallo de una página de «Ver más comentarios» o «Ver más clases», la lista se reemplaza por el `MensajeError` del bloque («Algo salió mal. Inténtalo de nuevo.», o el de red) sin un control para reintentar en el bloque. Los caminos de esa frase (cerrar y abrir los comentarios, salir del inicio y volver, pulsar la sección activa) no tienen casos (CHORE-04, P-1)." (Enmienda 5) La misma línea nombra también el título de `BloqueDestacado` (O-E4-1): con la lista de un inicio en error, muestra otra frase de recuperación, "No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo." (`TEXTOS_PANEL.error`), de la misma familia, sin casos por camino y sin control para reintentar.
