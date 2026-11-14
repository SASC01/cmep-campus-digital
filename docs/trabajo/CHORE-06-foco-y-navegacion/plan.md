# Plan — CHORE-06 · foco y navegación del marco
Estado: LISTO
Carril: normal
Requisitos: sin RF ni RN nuevos. Cumple `CLAUDE.md` (Componentes, Manejo de errores en el frontend, Ubicaciones compartidas), `DESIGN.md` §6, §7.10 y §7.14, y las filas de `docs/ESTADO.md` §3 con destino "el `chore` de foco y navegación del marco" (inventario en "Alcance").
Rama: `chore/chore-06-foco-y-navegacion`, desde `main` = `47c3339` (base de "No se toca"). Dos subentregas: CHORE-06a (32 archivos) y CHORE-06b (32 archivos), en ese orden (§D-0; Enmienda 1). (Enmienda 3) 06a cerró en `023b450` con 38 archivos; 06b parte de `023b450` y cuenta 38 (hasta 41 con las tres condicionales).
Solo frontend. Sin backend, `shared/`, `infra/` ni dependencias nuevas.

**Enmienda 1 (2026-11-12): responde a `revision.md` del plan (CAMBIOS REQUERIDOS, tres hallazgos de inventario). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 1" en su lugar.
- **M-01:** la `key` del contenido de la entrega de un alumno era `alumnoId`, que no es única por la ruta (`tareas/:tareaId/entregas/:alumnoId`: el mismo alumno tiene entrega en cada tarea). Pasa a `${tareaId}:${alumnoId}` (§D-1, Forma C). CH6-A06 suma el camino "mismo alumno, otra tarea", CH6-A30 (c) exige la `key` compuesta y "Mutaciones" suma su fila. Repasé los 16 sitios con el criterio "única por todos los ids de la ruta de los que depende lo que la vista escribe o muestra": solo este fallaba (§D-1, "Criterio de la `key`").
- **M-02:** el inventario del mecanismo M-2 estaba incompleto y decía, sin serlo, que `features/tareas` ya callaba. Inventario nuevo, por grep propio, en "Alcance" (M-2): entran en 06a tres sitios más de `features/clases` (crear y editar clase, y las subidas de anuncio y recurso) y seis de `features/tareas` (crear, editar y borrar tarea; entregar, anular y comentar en el hilo, por `avisarDelErrorDeLaEntrega`; la recarga fallida de la tarea; las subidas de la tarea y de la entrega). La descarga de `components/adjuntos` queda fuera, con destino. DH-04 lo lleva al humano con sus opciones. §D-3, R-03, el punto de ataque 2, CH6-A15 y CH6-A18 (nueva), "Mutaciones", "Se toca" y "No se toca" cambian en consecuencia.
- **M-03:** la lista cerrada y §D-R0 de 06b no tenían las pruebas que cambian de sentido con DH-03 (b). Repetí el grep por "pulsa la sección y cuenta peticiones" y miré el `staleTime` de cada cliente: CL3-2R2-10 cambia de sentido (C-9). PR-C18 (`muro-view.test.tsx:344`) y la de `muro-recuperar-c-r4.ataque.test.tsx:208-223`, que el manager señala, **deberían seguir en verde**: la lista de Avisos no usa el `staleTime` del cliente sino el suyo (`usePublicaciones`, `features/clases/hooks.ts:1023-1027`: 240 s, `TIEMPO_FRESCO_DEL_MURO_MS`), así que recién pedida está fresca aunque el cliente de la prueba no tenga `staleTime`. Las dejo en la lista cerrada y en §D-R0 como **condicionales** (solo si caen, con la reescritura ya redactada). Es un punto en que difiero de la revisión; lo dice R-09.
- **Recuento (DH-06):** 06a pasa de 25 a 32 archivos y 06b de 31 a 32. Las dos son "unos 30" (CHORE-04 cerró con 33). Alternativa en DH-06.
- **Decisiones para el humano:** DH-02 (el matiz del patrón), DH-04 (alcance de M-2), DH-05 (lo que el recorte deja fuera de su decisión del 2026-10-26 y la opción del manager), DH-07 (H-1) y DH-09 nueva (defensa del servidor). Cada una con mi recomendación y la del manager cuando difieren.
- **No bloqueantes:** las filas de `docs/ESTADO.md` se citan por su texto (N-02); §D-6 pide la barra solo si la trae (N-03); en `features/admin/hooks.ts` el cambio es quitar la definición y reexportar (N-04); CH6-A30 dice qué hacer si cae su precondición; el comentario de `conservaLaListaTrasLaPagina` y CH6-B11 ya no prometen que "no se pinta nada" ante un código que redirige; "Hermanos" suma la severidad que confirmó el manager.

**Enmienda 2 (2026-11-12): las nueve decisiones del humano y las dos observaciones de la verificación de la Enmienda 1 (`revision.md`). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 2" donde no es solo quitar una variante.
- **Decisiones:** el humano eligió el 2026-11-12 la opción recomendada en las nueve (DH-01 (a), DH-02 (a), DH-03 (b), DH-04 (a), DH-05 (b), DH-06 (a), DH-07 (a), DH-08 normal, DH-09 (b)). La sección pasa a "Decisiones del humano (2026-11-12)", con una tabla de lo decidido y lo descartado, y el plan queda en firme: salen las variantes por decisión de §D-4, §D-5, CH6-B06, "Puntos de ataque", R-01, "Comprobación humana", A-1, A-2 y A-4. Las dos condicionales de M-03 (PR-C18 y C-10) no son decisiones y se quedan.
- **O-E1-1:** el destino de la descarga de `components/adjuntos` nombra el camino de la prop `alFallarLaDescarga`, que ya existe, desde `publicacion-del-muro.tsx` y `elemento-de-recurso.tsx` (tabla de M-2 y A-4).
- **O-E1-2:** el punto de ataque 5 suma `listaTraeLaClase` con una forma inesperada en la caché.
- **Cierre:** A-4 se alinea con la viñeta "Dos encargos nuevos que salen de CHORE-06" de `docs/ESTADO.md` §2b, que ya anotó el orquestador: no los vuelve a registrar, y cada fila de §3 que cambia de destino dice a cuál de los dos va. La defensa en el servidor no lleva fila en §3.
- **Conteos:** sin cambio. 06a, 32 archivos; 06b, 32 (hasta 34 si caen las dos condicionales).

**Enmienda 3 (2026-11-12): 06b sobre la base nueva (`023b450`), con lo aprendido en 06a y la decisión del humano sobre O-08. Sigue LISTO.** Solo toca lo de 06b; 06a está cerrada y no cambia. Cada cambio lleva la marca "Enmienda 3". Recoge "Lo que cambia para 06b" de `revision.md` (Revisión final de 06a) y la entrada del humano sobre O-08 de `aprobacion.md`.
- **C-13** (arbitrada en la ronda 0 de 06a) entra en §D-R0, comprobada en `023b450`: `lib/guardas-ch4-r1.ataque.test.ts:113-120`.
- **Inventario de hermanos por ganchos y memoria** (lección de T-01 a T-03): nuevo "Mecanismo M-5" en "Alcance", con cada vista, gancho y subcomponente que 06b toca o crea.
- **Regla de la clave para los ganchos de 06b** (§D-4, "Regla de la clave"), con su caso de salto de clase (CH6-B18) y sus mutaciones.
- **O-08, decidida por el humano:** el salto del historial a otra clase cuenta como pulsar la sección (§D-4, PR-1 bis; DH-10). Comprobado en el código: se dispara solo en las cuatro listas que sobreviven al cambio de clase. Casos CH6-B16 (cuenta como pulsar; el foco no se mueve) y CH6-B17 (si falla, el aviso es de la clase de destino), con sus mutaciones y la matriz de §D-7.
- **Grep contra `023b450`:** líneas nuevas de los sitios que 06a movió; `useAvisoDeRecargaFallida` pide ahora `clave` (§D-5, paso 3). El grep encontró además cinco pruebas que el plan no inventariaba y que 06b rompería: `publicacion-del-muro.test.tsx` (lista cerrada) y C-15 a C-18. ATQ-CH6-26 de 06a queda como condicional (C-14). Las demás pruebas de 06a siguen en verde con 06b; el porqué va en §D-R0.
- **Dos correcciones de diseño de 06b que salieron del grep, sin decisión nueva:**
  - `conservaLaListaTrasLaPagina` conserva solo ante la red o un `5xx`, que es lo que dice DH-02 (a). Antes conservaba cualquier error salvo el cursor, el acceso y la redirección, y eso contradecía CH6-B13 (un `404 PUBLICACION_NO_ENCONTRADA` en «Ver más comentarios» se habría conservado sin decir «Esa publicación ya no existe.»). §D-5.
  - PR-2 marca vieja también la consulta que sigue pidiendo al salir. Sin eso, CH6-B12 (c) ("al volver, la lista se pide") no se cumplía, y tampoco la frase "Inténtalo de nuevo" por el camino "otra sección y regreso" cuando la recarga falla con la vista desmontada. Se hace con un parámetro opcional del gancho movido; `features/admin` no cambia. §D-4. (Enmienda 3b: **retirada**. La premisa era falsa, M-01.)
- **O-01 de 06a:** queda como decisión tomada (§D-5, "O-01").
- **Conteo de 06b:** 38 archivos, hasta 41 con las condicionales PR-C18, C-10 y C-14. Lo que crece son pruebas (5 `*.ataque` y 1 normal). Producción sigue en 19 archivos. No se parte (R-01).

**Enmienda 3b (2026-11-12): responde a la verificación de la Enmienda 3 (`revision.md`, CAMBIOS REQUERIDOS, M-01 y M-02). Sigue LISTO.** Comprobé las líneas de la librería (`@tanstack/query-core` 5.103.2, `build/modern/`). No reabre ninguna decisión del humano, el alcance de 06b ni 06a. Cada cambio lleva la marca "Enmienda 3b"; donde un texto de la Enmienda 3 era falso, se corrige en su lugar.
- **M-01 · Una consulta que falla queda inválida** (`query.js:450-462`: la acción `error` pone `isInvalidated: true`; solo `successState` lo regresa a falso, `:497-505`; `isStaleByTime` da `true` con `isInvalidated`, `:214-218`). Por eso una consulta en error siempre está vieja: se pide sola al montarse y cuando el observador cambia a su clave.
  - Sale `tambienEnVuelo` con todo lo que depende de él: el parámetro, su descripción en PR-2, CH6-B02 (a) a (c), su fila de mutación, R-11 y la fila de A-4.
  - PR-1 bis y M-3 describen el mecanismo real. En el salto, quien pide B es el observador; PR-1 bis evita la segunda petición que hoy lanzan las cuatro vistas con `refetch()`, que cancela la del observador y pide otra.
  - CH6-B16 junta "en error" en un solo estado.
  - Las filas de "Mutaciones" que no podían caer se reemplazan o se declaran redundantes con su mecanismo.
  - El paso 13 dice qué casos salen verdes antes del cambio.
  - "O-01" y CH6-B12 (c) se corrigen. En el tema de Actividades (`useTrabajo` usa `signal`), salir aborta la página y no falla.
- **M-02 · La recarga que recupera una lista conservada ya no pinta el error mientras vuela.** Elijo la salida 1, que la lista se quede: es la coherente con DH-02 (a) y no cambia lo que DH-02 (a) dejó igual. Lo resuelve un gancho nuevo en `features/clases/hooks.ts`, `useListaConservadaTrasLaPagina` (§D-5), que recuerda, con su clave, el fallo de la página que conservó la lista.
  - `useFocoAlPasarAError` recibe `isError && !conserva`.
  - Cada camino de recuperación fija que no aparece ningún `role="alert"` ni el texto de error mientras la recarga vuela. Para el humano no queda nada que decidir.
- **N-01 a N-04:** la frase del foco en PR-1 bis, de dónde importan sus ganchos los inicios (C-15 y C-16), los avisos contados desde el inicio de cada caso (C-6 y C-18) y `limiteDeRecursos` en M-5. Detalle: las llamadas a `abrirComentarios` son 10, no 27.
- **Conteo:** sin cambio. 06b, 38 archivos (hasta 41). El gancho nuevo va en `hooks.ts`, que ya está en la lista.

**Enmienda 4 (2026-11-12): las dos paradas del programador en §D-6 (`resumen-programador.md`, "Implementación — CHORE-06b", P-1 y P-2). Sigue LISTO.** No toca DH-01 a DH-10, O-08, §D-4, §D-5, M-01 ni M-02 de la 3b, ni C-3 a C-18. Cada cambio lleva la marca "Enmienda 4".
- **P-1, la forma de §D-6 (a):** al pulsar «Calificaciones», las ventanas se marcan viejas **solo con la frase de la clase cambiada a la vista**, como la limpieza de (b).
  - Así se cumple N-52, se cumple cada camino de "Vuelve a abrir Calificaciones" (pulsar, salir y volver, el salto de clase) y con la tabla sana pulsar no marca nada.
  - Inventario por grep de las pruebas que cuentan marcas: cambian de sentido **CAL-1D03d** (4 filas, a la lista cerrada), **CAL-T-244** (C-19, por la marca de (b) al desmontar con la frase, no por (a)) y **CAL-T-258** (C-20). CAL-1D03e no cambia con esta forma.
  - No hay conducta visible nueva que decida el humano: las marcas no piden nada por sí mismas.
- **P-2, el mecanismo de la fila 361:** se invalidan solo las consultas que todavía traen la clase (un `predicate` con `listaTraeLaClase`), con `{ cancelRefetch: false }`, que queda en el plan.
  - Comprobado en 5.103.2: `invalidateQueries` marca todas las que coinciden, pero solo vuelve a pedir las activas (`queryClient.js:297-306`, `utils.js:40-47`). El inicio inactivo queda invalidado con la clase dentro y se pide al montarse (`query.js:214-218`).
  - Se corrige el párrafo de la Enmienda 3 y CH6-B15 suma el vecino del maestro con el inicio en caché, con sus mutaciones.
- **De paso:** N-05 (el salto en negativo de la clave de `useListaConservadaTrasLaPagina`) entra como variante de CH6-B16 (c). N-06 queda como decisión tomada. Se corrigen las tres frases con el mecanismo viejo que señaló el manager.
- **Conteo de 06b:** 40 archivos, hasta 43 con las tres condicionales. Suman `gradebook-01d.test.tsx` (lista cerrada) y `secciones-01d-r4.ataque.test.tsx` (C-20). C-19 cae en `gradebook-01d-r3.ataque.test.tsx`, que ya cuenta por C-8. Sin las condicionales no pasa de 41.

**Enmienda 4b (2026-11-12): responde a la verificación de la Enmienda 4 (`revision.md`, CAMBIOS REQUERIDOS, M-01, N-01 y N-02). Sigue LISTO.** Comprobé el camino en `gradebook-view.tsx` del árbol de 06b: la frase de la ventana vacía deja «Alumnos anteriores» a la vista, y regresar no marca la ventana vacía (CAL-1D02ac, CAL-T-201). Cada cambio lleva la marca "Enmienda 4b".
- **M-01: la condición de §D-6 (a) y (b) pasa de "la frase se ve ahora" a "la frase se vio en esta vista y todavía no se marcó".** Se guarda en dos refs de `gradebook-view.tsx` (ya en 06b), con la ocurrencia, para que una frase ya marcada no vuelva a contar. Vale al pulsar la sección, en la limpieza al desmontar y, por tanto, en el salto de clase.
  - CH6-B14 suma un caso por camino tras ir a otra ventana: (f) pulsar, (g) salir y volver, (h) saltar de clase y regresar.
  - Su mutación es volver a "se ve ahora". Otra fila vigila que la marca apague la frase.
  - El inventario no cambia: ninguna prueba regresa a otra ventana y después pulsa o desmonta. CAL-1D03d, CAL-1D03e, C-19 y C-20 dan las mismas cifras.
- **N-01:** el riesgo de `{ cancelRefetch: false }` queda declarado en R-12, con su mecanismo y por qué se acepta.
- **N-02:** C-19 cuenta las marcas justo después de `unmount()` y compara el final contra ese valor.
- **Conteo:** sin cambio. 06b, 40 archivos, hasta 43 con las condicionales. Nada va al humano.

**Enmienda 5 (2026-11-13): responde a T-04 y T-05 de la ronda 1 del tester de 06b (`reporte-tester.md`, "Ronda 1 — CHORE-06b"). Sigue LISTO.** Las dos son huecos del plan con una sola raíz: la marca de `useListaConservadaTrasLaPagina` (M-02 de la Enmienda 3b) vive en el estado del componente, es una sola y solo se toma en un render que todavía ve la dirección "hacia adelante". Cada cambio lleva la marca "Enmienda 5". No cambian DH-01 a DH-10, O-08, la decisión de M-02 (la lista se conserva mientras vuela la recarga que la recupera), §D-4 ni §D-6.
- **El remedio:** la marca pasa a ser de la consulta. Vive en una memoria de módulo de `features/clases/hooks.ts` (ya en 06b), un `WeakMap` con clave en la **instancia de la consulta** de la caché de TanStack Query, que sobrevive a los desmontajes. Se borra sola cuando la consulta sale de la caché, y no se comparte entre dos `QueryClient`. El valor es el fallo que conservó la lista (`errorUpdateCount` y `errorUpdatedAt`). Lo registra un efecto, y la decisión del render lo lee. El gancho cambia la cadena `clave` por la `queryKey` de su consulta y suma `errorUpdatedAt` (§D-5).
- **Inventario por mecanismo** de las 9 listas, por estado vecino, y de los demás ganchos con memoria de 06b: ninguno más tiene el hueco (§D-5).
- **Pruebas:**
  - CH6-B18 (e) se reescribe para la firma nueva; es prueba nueva de 06b.
  - CH6-B19 suma los estados vecinos que no cubren ATQ-CH6-36 y ATQ-CH6-37.
  - "Mutaciones" suma cuatro filas.
  - ATQ-CH6-36 y ATQ-CH6-37 pasan a verde sin tocarlas.
  - Ninguna otra prueba existente cambia de sentido.
- **Conteo:** el remedio no suma archivos. Pero el árbol tiene 42: los 40 del plan y los 2 `*.ataque` nuevos del tester en la ronda 1. **Pasa de 41 sin contar las condicionales: va al humano como confirmación**, con la recomendación de no partir (R-01).

## Preguntas bloqueantes

Ninguna. Las nueve decisiones que cambiaban la conducta visible o el alcance las tomó el humano el 2026-11-12 (sección siguiente). (Enmienda 3) También O-08, DH-10, el mismo día.

## Decisiones del humano (2026-11-12)

(Enmienda 2) El humano eligió en las nueve la opción recomendada. El plan está escrito en firme con ellas; las opciones descartadas quedan solo como registro.

| DH | Tema | Decidido | Descartadas |
|---|---|---|---|
| DH-01 | Que lo abierto no pase de un id a otro | (a) `key` por sitio, única por todos los ids de la ruta (§D-1) | (b) una `key` en el `<Outlet>` de `ClaseLayout` |
| DH-02 | Fallo de una página de «Ver más» | (a) se conserva la lista solo ante el fallo de la página siguiente (§D-5) | (b) conservar también ante una recarga de fondo; (c) «Volver a cargar» en el `MensajeError`; (d) sin cambio |
| DH-03 | Pulsar la sección en la que ya se está | (b) vuelve a pedir si está en error o vieja (§D-4) | (a) solo en error; (c) siempre |
| DH-04 | Avisos mientras `apiClient` redirige | (a) callan `features/clases` y `features/tareas`, en 06a; la descarga de `components/adjuntos` queda fuera, con destino (§D-3) | (a′) `features/tareas` en una 06c; (b) solo `features/clases`; (c) dejarlo |
| DH-05 | Lo que queda fuera | (b) el foco al cambiar de ruta, encargo propio antes de DEPLOY; lo demás, `chore` de accesibilidad del marco después de DEPLOY (A-4) | (a) todo después de DEPLOY; (c) una 06c en este `chore` |
| DH-06 | Subentregas | (a) 06a de 32 y después 06b de 32 (§D-0) | (a′) con una 06c de 4; (b) una sola |
| DH-07 | Comprobación humana | (a) cuatro puntos, unos 8 minutos, al cerrar 06b | (b) sin comprobación |
| DH-08 | Carril | normal | sensible |
| DH-09 | Defensa en el servidor | (b) encargo propio después de DEPLOY (A-4) | (a) antes de DEPLOY; (c) no hacerla |

El razonamiento de cada una, con la postura del manager, está en el historial de este archivo (Enmienda 1) y en `revision.md`. Lo que sigue de esta sección es el detalle que el resto del plan cita.

- **DH-01 · Cómo deja de pasar lo abierto de un id a otro** (O-r1-1, O-E3-1, H-3 y los hermanos de §D-1).
  - **(a) Decidida.** `key` por el id de la ruta en cada vista o bloque que guarda estado local (formularios, confirmaciones, contadores), por debajo del elemento que la vista usa como raíz de foco; 16 sitios (§D-1). Conserva el foco de hoy: las listas de Avisos, Dudas, Actividades y Recursos siguen llevándolo a su `h2` al cambiar de clase (O-14 de 02c), y lo que se monta de nuevo lo deja en el título de la clase (como «Sí, regenerar» en CHORE-04) o en la raíz de la vista.
  - Para que los encargos que vienen (FORO-01) no lo olviden, una regla estática (CH6-A30) exige la `key` en toda vista nueva de la clase.
- **DH-02 · Qué ve la persona cuando falla una página de «Ver más»** (P-1 de CHORE-04, O-E4-1). Hoy, en las listas de `features/clases`, la lista ya cargada se reemplaza por «Algo salió mal. Inténtalo de nuevo.» y desaparece el botón: la frase pide repetir algo que ya no está.
  - **(a) Decidida.** Ante el fallo de la página siguiente (red, `5xx`), la lista se queda como estaba, un solo aviso dice el error y «Ver más» sigue ahí para repetir. El cursor vencido (`400`) y un error que quita el acceso siguen reemplazando la lista con su frase. Es lo que ya hacen Recursos (CLASES-03d), Entregas (ENTREGAS-01e) y Mis calificaciones (CALIFICACIONES-01d). Una recarga de fondo que falla sigue como hoy (T-04 de 02c). Patrón nuevo en `DESIGN.md` §7.10, con marca "propuesta (CHORE-06b)".
  - (Enmienda 1, matiz del manager) Recursos, Entregas y Mis calificaciones conservan la lista **también** cuando falla una recarga de fondo; (a) solo ante la página siguiente. El texto de `DESIGN.md` (A-2) no dice que sea "el mismo" patrón.
- **DH-03 · Qué hace pulsar la sección en la que ya se está** ("una sola política de recarga", N-54).
  - **(b) Decidida.** Vuelve a pedir la lista si está en error **o vieja** (marcada vieja por una acción, o pasados los 30 s del `staleTime`); sana y fresca no pide nada, y nunca cancela ni duplica lo que vuela. Cierra O-03 de CLASES-03c2 (los conteos viejos tras «Subir»/«Bajar») sin pedir de más.
  - Calificaciones (gradebook y Mis calificaciones) conserva su conducta de T-08 (vuelve a la ventana inicial y pide), y las vistas de `features/admin`, `/admin/clases` y "Clases anteriores" conservan la suya (`useVolverAPedirSiFallo` y su par): ya cumplen sus frases con casos probados. Se registran como variantes de la misma política (§D-4).
- **DH-04 · Avisos mientras `apiClient` ya saca a la persona de la página** (Enmienda 1: el inventario completo está en "Alcance", M-2).
  - **(a) Decidida.** Callan, en 06a, todos los sitios de `features/clases` y de `features/tareas` que hoy avisan ante `401` sin refresco, `403 ACCESO_RESTRINGIDO` o `403 CAMBIO_DE_CONTRASENA_REQUERIDO`: los 13 ganchos, «Unirme a la clase», crear y editar clase, las subidas de anuncio y recurso, los cinco avisos de recarga de `features/clases`; y en `features/tareas`, crear, editar y borrar tarea, entregar, anular y comentar en el hilo, la recarga fallida de la tarea y las subidas de la tarea y de la entrega. Como ya callan CLASES-03, ADMIN-01, `features/calificaciones` y, en `features/tareas`, calificar, la descarga y los «Ver más». Queda fuera la descarga de `components/adjuntos` sin `alFallarLaDescarga` (Avisos y Recursos), con destino (M-2).
  - También fuera: O-r1-6 de CHORE-03 (los formularios de `auth` y `admin` pintan su `MensajeError` ese instante). En `auth`, `apiClient` no redirige ante `NO_AUTENTICADO` en `/login` y las demás pantallas sin sesión (`RUTAS_SIN_SESION`), así que callar por código dejaría a la persona sin mensaje; necesita su propio diseño (DH-05).
  - La descarga queda fuera porque callarla en `components/adjuntos` exige importar `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` fuera de los cuatro `lib.ts` de los módulos (lo prohíbe `services/apiClient-ch3-r1.ataque.test.ts:83-88`, N-46 de CHORE-03) o pasarle la prop `alFallarLaDescarga` (que ya existe) desde los componentes de `features/clases`; y solo cae ahí si la sesión se pierde justo en ese clic. Destino en "Alcance" (M-2) y A-4.
- **DH-05 · Lo que queda fuera de CHORE-06, con su destino.** **(b) Decidida.** Lo que es uniformidad interna o pulido de foco sin daño para la persona va a un `chore` de accesibilidad del marco **después de DEPLOY** (con comprobación con lector de pantalla), salvo lo que ya tiene otro destino; el foco al cambiar de ruta va a un **encargo propio antes de DEPLOY** (los dos ya están en `docs/ESTADO.md` §2b, hoja de ruta vigente). Lista completa en "Alcance", "No entra". Lo principal:
  - unificar el seguimiento del foco de la ventana (`useFilaEnFoco`, `useFocoAlCargarMas`, `useFocoDeLaLista` con `document.hasFocus()` frente a `useFocoAlPerderseElControl` con el elemento activo; M-14/O-20 de CLASES-02d y la divergencia de TAREAS-01d);
  - el foco al cambiar de ruta en la SPA (queda en `<body>` al cambiar de sección o abrir una tarea) y los cinco puntos de "Foco tras navegar o reemplazar la vista" de ADMIN-01;
  - la regla única de foco ante un `400` de campo y en la primera carga (O-1/O-2 de CLASES-03e), O-7/O-8 de CLASES-03e, el punto 9 de CALIFICACIONES-02b;
  - O-r1-6 de CHORE-03 y O-r1-1 de CLASES-03e;
  - `useTemasDelRecurso` (CL3-3R3-02) y el componente `AlPulsarLaSeccionActiva` de `features/admin` (ADMIN-01g).
  - **Lo que el recorte deja fuera de lo que el humano fijó el 2026-10-26** (ESTADO 2b, "Dos `chore` después de ADMIN", (b)): "los ganchos de foco unificados" y el foco al cambiar de ruta; y el punto (3) de la fila "Foco tras navegar o reemplazar la vista, de ADMIN-01", asignado a este `chore` por E12-17. El humano lo aceptó con esta decisión.
- **DH-06 · Subentregas.** **(a) Decidida:** 06a (32 archivos: lo destructivo y los avisos de más, con `features/tareas`) y después 06b (32 archivos: recargas, «Ver más» y frases de recuperación). Las dos son "unos 30", como CHORE-04 (33).
- **DH-07 · Comprobación humana en navegador.** **(a) Decidida:** cuatro puntos, unos 8 minutos, al cerrar 06b ("Comprobación humana"): lo que jsdom no ve es el historial real del navegador, el anuncio del lector de pantalla y el corte de red. H-1 se llega manteniendo presionado «Atrás», como H-2 (N-01).
- **DH-08 · Carril normal (decidido).** No toca `middleware/`, `adapters/auth`, sesiones, contraseñas, migraciones, `infra/`, estado de pago ni restricción de acceso. DH-04 cambia qué avisa un gancho cuando `apiClient` redirige, pero no toca `services/apiClient.ts`, el refresco del token ni la redirección.
- **DH-09 · Defensa en el servidor.** **(b) Decidida:** encargo propio después de DEPLOY (ya en `docs/ESTADO.md` §2b). Hoy el servidor acepta una calificación o una edición armada para otra fila si la versión coincide, y casi siempre coincide (empieza en 0 en cada fila); editar clase no lleva versión. CHORE-06a cierra la causa en el cliente y ningún hermano exige un cambio del servidor para cerrar este encargo. La segunda red de seguridad (que el cuerpo traiga el id de la fila, o una versión que no se repita entre filas) cambia el contrato de `shared/` y del backend: otro encargo y otro carril.
- **DH-10 · O-08, el salto del historial a otra clase (Enmienda 3; decisión del humano del 2026-11-12, por escrito, `aprobacion.md`).** Texto del humano: "Al saltar de una clase a otra con el historial, el disparo del gancho cuenta como pulsar la sección: renueva la lista solo si está en error o vieja, y una prueba lo fija. Dos condiciones: la renovación no mueve el foco (en un cambio de clase manda el encabezado, como quedó en 06a), y si falla, el aviso es el de la clase de destino, nunca el de la anterior; cada una con su caso de prueba." En el plan: §D-4 (PR-1 bis), CH6-B16 y CH6-B17, "Mutaciones" y §D-7.

## Suposiciones

- **S-01 · "Mismo id, otra clase" es el caso de daño.** Las filas con `key` por un id de una sola clase (publicaciones, comentarios, dudas, recursos, temas) ya se montan de nuevo al cambiar de clase. El daño aparece donde la `key` no es única por el id de la ruta (personas que están en las dos clases: lección 3 de CHORE-04) o donde no hay `key` (formularios y confirmaciones de la vista). §D-1 los revisa todos con ese criterio.
- **S-02 · Se llega con un salto del historial y la clase, tarea, alumno o recurso de destino en caché.** Si el destino no está en caché, `ClaseLayout` (o la vista) pinta «Cargando» y todo se monta de nuevo: ya es seguro. Por eso cada caso de §D-1 se prueba con el destino en caché (`gcTime` de 5 min).
- **S-03 · Volver a la clase de origen con la petición en vuelo** (por ejemplo, el retiro de un maestro) monta los controles de nuevo, sin espera, y pedir la acción otra vez exige volver a confirmar: es una acción nueva y deliberada (S-01 de CHORE-04, decidida por el humano). El servidor responde con su error y su aviso. No se agrega `mutationKey` ni lectura de la caché de mutaciones a esos controles.
- **S-04 · Ninguna respuesta de la clase, tarea, alumno o recurso anterior navega, reinicia un formulario ni mueve el foco en la vista del nuevo.** Su aviso sí sale, uno solo, y renueva lo de su id (sus ganchos conservan las opciones con que se crearon: `mutationObserver.js:61-62` de `@tanstack/query-core` 5.103.2, ya documentado en S-07 de CHORE-04).
- **S-05 · Los textos no cambian.** Los avisos de «Ver más» usan la traducción de consultas del módulo (`mensajeDeConsultaClases`: «Algo salió mal. Inténtalo de nuevo.» o el de red), como Recursos. No hay texto nuevo que aprobar.
- **S-06 · "Pulsar la sección activa" incluye pulsar «Inicio» de la barra estando en el inicio y ir atrás o adelante a otra entrada de la misma ruta.** Las tres cambian `location.key` sin desmontar la vista; las tres llegan por `useAlPulsarLaSeccionActiva`. (Enmienda 3, DH-10) Incluye también el salto del historial a la misma sección de otra clase, en las vistas que sobreviven al cambio de clase (§D-4, PR-1 bis). Ya no es una suposición: lo decidió el humano.

## Alcance

### Inventario heredado, verificado contra `47c3339`

Rutas relativas a `frontend/src/`. "Fila" es la línea de `docs/ESTADO.md` §3 en el árbol de trabajo del 2026-11-12, solo como referencia: (Enmienda 1, N-02) en `47c3339` van 3 líneas antes y el árbol puede moverse, así que **las filas se identifican por su texto** (la columna "Pendiente"), no por el número; así las ubica el orquestador en A-3 y A-4. Destino: 06a, 06b, **fuera** (DH-05) o **ya resuelta**.

| Fila | Pendiente | Dónde está hoy | Destino |
|---|---|---|---|
| 348 | **O-r1-1 (prioritario):** la confirmación de «Sí, quitar» de un maestro (`FilaMaestro`) o de un alumno (`FilaAlumno`) pasa abierta de la clase A a la B si la persona está en las dos; un clic la retira de B | `features/clases/components/lista-maestros-de-clase.tsx:34` y `:174` (`key={maestro.id}`); `components/tabla-alumnos.tsx:40` y `:228` (`key={alumno.id}`). Las dos vistas no llevan `key`: `maestros-de-clase-view.tsx:119`, `alumnos-view.tsx:27` | 06a (§D-1) |
| 348 | H-3: `useRetirarMaestro` (`hooks.ts:670`) sin `mutationKey`; la respuesta de A corre con las opciones de B, la lista de A no se marca vieja y «Sí, quitar» de B espera por A | `maestros-de-clase-view.tsx:29` (el gancho vive en `MaestrosDeLaClase`, que sobrevive) | 06a: con la `key` de la vista, el observador de A se suelta y su mutación conserva las opciones de A (S-04) |
| 348 | O-E3-1: la confirmación de borrar de `AccionesDeLaTarea` pasa abierta a otra tarea | `features/tareas/detalle-tarea-view.tsx:134`; estado en `components/acciones-de-la-tarea.tsx:42-44` | 06a |
| 348 | O-E3-1: «Nuevo tema» (`creando`) pasa abierto a otra clase | `features/clases/trabajo-view.tsx:82` y `:85` | 06a |
| 347 y 360 | Aviso de más mientras `apiClient` redirige: 12 entradas (13 ganchos) de `features/clases/hooks.ts` y «Unirme a la clase» | `hooks.ts:665` (asignar), `:684` (retirar), `:815` (agregar), `:838` (quitar alumno), `:1059` (crear anuncio), `:1080` (borrar publicación), `:1131` (comentar), `:1152` (borrar comentario), `:1342` y `:1344` (`avisarErrorDelTema`: crear y renombrar tema), `:1414` (borrar tema), `:1474` (ordenar temas), `:2015` (guardar categorías); `components/formulario-unirse-clase.tsx:53-57` | 06a (DH-04) |
| 346 | H-2: siete `refetch()` de "pulsar la sección activa" sin `cancelRefetch: false` | `dudas-view.tsx:57-60`, `muro-view.tsx:66-69`, `recursos-view.tsx:72-75`, `trabajo-view.tsx:115-118`, `components/seccion-de-recursos.tsx:81-84`, `components/respuestas-de-duda.tsx:166-169`, `components/seccion-de-tema.tsx:63-66` | 06b (§D-4) |
| 445 | N-54: "queda el resto del inventario" de las frases que se cumplen pulsando la sección | las siete de arriba ya llaman a `useAlPulsarLaSeccionActiva`; **faltan**: comentarios (`components/comentarios-de-publicacion.tsx`), Personas (`personas-view.tsx`), el roster (`components/tabla-alumnos.tsx`) y los dos inicios (`inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`), que no reaccionan a `location.key` | 06b |
| 384 | O-03 de CLASES-03c2: tras «Subir»/«Bajar» con la recarga por sección fallida, la lista queda vieja y pulsar la sección no la pide | `trabajo-view.tsx:115-118` (solo pide en error) | 06b, con DH-03 (b) |
| 397 | Hermano de T-02 de CLASES-03e: abrir los comentarios o «Ver más comentarios» de una publicación que otra persona borró pinta «Esa publicación ya no existe.» sin renovar la lista | `components/comentarios-de-publicacion.tsx:169-178`; el remedio de Dudas es `useRenovarSiLaDudaYaNoEsta` (`hooks.ts:1789`) | 06b |
| 397 | P-1 y O-E4-1: tras el fallo de una página de «Ver más comentarios» o «Ver más clases» la lista se reemplaza por su `MensajeError` sin control para repetir; el título de `BloqueDestacado` dice "No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo." | `comentarios-de-publicacion.tsx:170`, `components/panel-mis-clases.tsx:31`, `inicio-estudiante-view.tsx:44`, `inicio-maestro-view.tsx` (mismo patrón) | 06b (DH-02) |
| 446 | N-52: la ventana vacía del gradebook no se marca vieja | `features/calificaciones/hooks.ts:78-93` (excluye la ventana a la vista) y `gradebook-view.tsx:86-90` | 06b |
| 361 | ADMIN-01d2: la barra lateral y los inicios siguen trayendo una clase que la sesión acaba de leer archivada | `hooks.ts:427-443` (`useClaseArchivadaEnSuLista` solo quita "Clases anteriores") | 06b |
| 415 | O-r1c-2 de CALIFICACIONES-01c: `EntregaDelAlumno` sin `key` por `alumnoId`. ESTADO dice "hoy no se alcanza"; **sí se alcanza** con un salto del historial entre dos entregas en caché (S-02), de otro alumno en la misma tarea o (Enmienda 1, M-01) del mismo alumno en otra tarea | `features/tareas/entrega-de-alumno-view.tsx:61-158` (`PanelDeCalificacion` con `key={reinicios}`) | 06a (hermano destructivo, §D-1) |
| 416 | La nota "`GradebookView` no la necesita": el salto del historial entre las calificaciones de dos clases conserva las ventanas de la otra | `features/calificaciones/gradebook-view.tsx:53` y `:222` | 06a (hermano, §D-1) |
| 400, 447 | Seguimiento del foco divergente (TAREAS-01d) y copiado en tres ganchos (M-14/O-20 de CLASES-02d) | `features/clases/hooks.ts:865` (`useFilaEnFoco`), `components/foco/hooks.ts:97` (`useFocoAlCargarMas`), `components/layout/hooks.ts:25` (`useFocoDeLaLista`) con `document.hasFocus()`; `components/foco/hooks.ts:23` con el elemento activo | fuera (DH-05) |
| 444 | Foco al cambiar de ruta en la SPA | `features/clases/clase-layout.tsx:52` (la clave solo cambia con la clase) | fuera (DH-05) |
| 362 | Foco tras navegar o reemplazar la vista (ADMIN-01, cinco puntos) | revisiones de ADMIN-01c, 01d1 y 01d2 | fuera (DH-05) |
| 391, 394 | O-1/O-2 y O-7/O-8 de CLASES-03e | `dudas-view.tsx`, `components/elemento-de-duda.tsx`, `components/respuestas-de-duda.tsx` | fuera (DH-05) |
| 392 | O-r1-1 de CLASES-03e: en Dudas, una recarga fallida desmonta un bloque de respuestas con lo escrito | `dudas-view.tsx:111-117` | fuera (DH-02 (a)) |
| 376 | O-r1-6 de CHORE-03: formularios de `auth` y `admin` pintan su `MensajeError` mientras `irA` recarga | 11 componentes | fuera (DH-04, DH-05) |
| 387 | `useTemasDelRecurso`: dos peticiones en lugar de una (CL3-3R3-02) | `hooks.ts:1180` | fuera (carril trivial, como dice la fila) |
| 398 | Hermano de O-16: `useGuardarCategorias` no da mensaje ante un error de fila con el editor desmontado | `hooks.ts:1994-2020` | fuera (carril trivial la próxima vez que se toque el editor; no es de navegación) |
| 526 | Punto 9 de CALIFICACIONES-02b (`dataUpdatedAt` en el mismo milisegundo) | `components/foco/lib.ts:8-15` | fuera (prácticamente inalcanzable; `useQuery` no expone `dataUpdateCount`) |
| 356 | `AlPulsarLaSeccionActiva` de `features/admin` montado solo con router | `features/admin/components/registrados-del-enlace.tsx:40-49` | fuera (sin cambio de conducta; se sube cuando otro módulo lo use) |
| 509 | "Ver más clases" tras un `400` del cursor muestra "no es válido" | **Ya resuelta:** `inicio-estudiante-view.tsx:56` usa `mensajeDeErrorDeLista(…, TEXTOS_PANEL.cambioMientrasLasVeias)` ("Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas.", `data.ts:158`). El orquestador cierra la fila (A-3) | — |

### Hermanos que faltaban (grep del arquitecto, por mecanismo)

**Mecanismo M-1, "estado local de una vista que sobrevive al cambio de un id de la ruta".** Búsqueda: todas las rutas con un id (`app/router.tsx:84-202`: `:claseId`, `:tareaId`, `:alumnoId`, `:recursoId`, `:usuarioId`), cada vista que las pinta (`<ConClaseDeLaRuta>` en 21 sitios de `src/features`) y cada `useState` de los componentes que pintan (`rg "useState[<(]" src/features/{clases,tareas,calificaciones} -g '!*.test.*'`). Criterio de la lección 3 de CHORE-04: la `key` tiene que ser única por el id de la ruta, no solo existir.

| Vista (ruta) | Estado que pasa | Daño | ¿Tiene `key` por el id? |
|---|---|---|---|
| Personas del admin (`maestros-de-clase-view.tsx`) | confirmación de quitar, búsqueda, mutación de retirar | retira a un maestro de la clase equivocada | No (O-r1-1) |
| Personas del maestro y del admin (`alumnos-view.tsx`) | confirmación de quitar, búsqueda | retira a un alumno de la clase equivocada | No (O-r1-1) |
| Detalle de tarea (`detalle-tarea-view.tsx`) | confirmación de borrar (`AccionesDeLaTarea`), archivos y enlaces elegidos de la entrega (`FormularioDeEntrega`), confirmación de anular (`EntregaRealizada`), texto del hilo privado (`HiloPrivado`) | borra otra tarea; entrega en otra tarea lo elegido para la primera | No (O-E3-1 y hermanos) |
| Entrega de un alumno (`entrega-de-alumno-view.tsx`; ruta `tareas/:tareaId/entregas/:alumnoId`) | puntos y versión del panel de calificación, texto del hilo privado del maestro | **califica a otro alumno, o al mismo en otra tarea, con lo escrito para el primero** (la versión empieza en 0 en cada fila, así que lo normal es que coincida y el `PUT` se acepte); manda a otro hilo un mensaje privado | No (O-r1c-2). Enmienda 1 (M-01): la `key` tiene que ser por `tareaId` **y** `alumnoId` |
| Editar tarea (`editar-tarea-view.tsx`) | lo escrito y la versión de apertura | **guarda en la tarea B lo escrito para A** si las versiones coinciden; si no, `409` y se pierde lo escrito | No |
| Editar recurso (`editar-recurso-view.tsx`) | ídem | ídem, en un recurso | No |
| Crear tarea (`crear-tarea-view.tsx`) | lo escrito, con tema y categoría de A | crea en B una tarea escrita para A | No |
| Editar clase (`editar-clase-view.tsx`) | nombre y descripción de A | **escribe en B el nombre de A** | No |
| Avisos (`muro-view.tsx`) | el anuncio que se escribía (`FormularioPublicacion`) | publica en B el anuncio de A | No |
| Dudas (`dudas-view.tsx`) | la duda que se escribía (`FormularioDuda`) | la publica en B | No |
| Recursos (`recursos-view.tsx:181`) | el recurso que se escribía (`FormularioRecurso` en modo crear) | lo publica en B | No |
| Actividades (`trabajo-view.tsx`) | «Nuevo tema» abierto | crea el tema en B | No (O-E3-1) |
| Calificaciones del maestro (`gradebook-view.tsx`) | ventanas y cursores de la otra clase | pide la ventana de A con el cursor de B y muestra "La clase cambió…" | No |
| Mis calificaciones (`mis-calificaciones-view.tsx`) | el filtro elegido en la otra clase | ninguno (el filtro vale en B); se incluye por la regla de CH6-A30 | No |
| Personas del alumno (`personas-view.tsx:190`) | ninguno | ninguno; se incluye por la regla de CH6-A30 | No |
| Categorías (`categorias-view.tsx`) | — | — | **Sí**: `EditorDeCategorias key={claseId}` (`:47`); la vista suma la suya por CH6-A30 |
| Duplicar clase (`duplicar-clase-view.tsx:32`) | — | — | **Sí** |
| Ficha de una cuenta (`features/admin/usuario-view.tsx:107`) | — | — | **Sí**: `FichaDeLaCuenta key={usuarioId}` debajo de la raíz de foco. Es el precedente de la forma "marco y contenido" de §D-1 |
| Mis calificaciones de una clase anterior (`clase-anterior-view.tsx:75`) | — | — | **Sí**: `<Outlet key={claseId} />` |
| Entregas de una tarea (`features/tareas/entregas-view.tsx`) | ninguno (sin `useState`; la lista va en la clave de la consulta) | — | No hace falta |
| Encabezado de la clase (`CodigoDeClase`, `AvisoDeClaseArchivada`) | — | — | Resueltos en CHORE-04 (§D-4 bis y ter) |
| Filas de publicaciones, comentarios, dudas, respuestas, recursos y temas | — | — | **Sí**: `key` por un id de una sola clase |

**Severidad de los hermanos de M-1 (Enmienda 1, confirmada por el manager en el código).** Se llega con un salto del historial de más de una entrada (mantener presionado «Atrás» y elegir), entre dos entradas del mismo patrón de ruta con otro id y el destino en caché; ningún enlace de la app lleva directo de un id al otro, así que la frecuencia es baja aunque el daño sea real.
- **Alta:** calificar a otro alumno, o al mismo en otra tarea (O-r1c-2 y M-01: la versión de cada entrega empieza en 0 y casi siempre coincide); editar una tarea o un recurso en el id equivocado (la versión también empieza en 0: dos tareas sin editar comparten la 0 y el `PUT` sobrescribe la otra); quitar a un maestro o a un alumno de la clase equivocada (O-r1-1, ya prioritario).
- **Media-alta:** editar la clase equivocada (admin): `FormularioClase` no lleva versión y el `PUT` con el nombre de A a B siempre se acepta.
- **Media:** crear una tarea o publicar un anuncio, una duda o un recurso en la clase equivocada (visible para los alumnos de B y reversible; con un tema o una categoría de A, probablemente el servidor lo rechace).
- **Baja:** el gradebook con los cursores de otra clase (solo muestra "La clase cambió…"; no escribe nada). El filtro de Mis calificaciones no es daño: entra solo por la regla CH6-A30.
- **Ninguno exige un cambio del servidor para cerrar este encargo:** la causa es del cliente y la `key` la elimina. La defensa en el servidor, como segunda red, es DH-09.

**Mecanismo M-2, "aviso de un error con que `apiClient` ya redirige"** (Enmienda 1, M-02: inventario rehecho). Búsqueda: `rg "toast\.error\(|errorQueRedirigeElCliente\(|avisoDeFalloAlSubir\(" src -g '!*.test.*'` en todo `src/` salvo `features/auth` (O-r1-6, fuera) y `features/diagnostico`, y por cada aviso de error de una mutación, una subida, una descarga o una recarga, si consulta antes `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (por `errorQueRedirigeElCliente` de su módulo). **La versión anterior del plan decía que `features/tareas` ya callaba: era falso** (solo callan calificar, `hooks.ts:533`, la descarga de las vistas de la tarea, `:310`, y los «Ver más» de `entregas-view.tsx:110` y `hilo-privado.tsx:177`). `features/calificaciones` (`exportar-a-excel.tsx:57`, `mis-calificaciones-view.tsx:129`) y `features/admin` sí callan.

| Módulo | Sitio (aviso que no calla) | Qué avisa | Destino |
|---|---|---|---|
| `features/clases` | `hooks.ts`: los 13 ganchos de la fila 347 (líneas en el inventario de arriba) | mutaciones | 06a |
| `features/clases` | `components/formulario-unirse-clase.tsx:55` | unirse | 06a |
| `features/clases` | `useAvisoDeRecargaFallida` (`hooks.ts:1271`) en sus cinco llamadores: `categorias-view.tsx:36`, `recursos-view.tsx:63`, `trabajo-view.tsx:106`, `editar-recurso-view.tsx:88`, `components/seccion-de-recursos.tsx:64` | recargas | 06a |
| `features/clases` | `components/formulario-clase.tsx:81` (`alFallar` de crear y editar clase; su hermano `formulario-duplicar-clase.tsx:68` ya calla) | mutación | 06a (nuevo) |
| `features/clases` | `components/formulario-publicacion.tsx:126` y `components/formulario-recurso.tsx:213` (la subida: un `401` o `403` de la solicitud de subida, por `avisoDeFalloAlSubir`) | subidas | 06a (nuevo) |
| `features/tareas` | `hooks.ts:190` (`useCrearTarea`), `:214` (`useEditarTarea`), `:246` (`useBorrarTarea`) | mutaciones | 06a (nuevo; DH-04) |
| `features/tareas` | `hooks.ts:359-374` (`avisarDelErrorDeLaEntrega`), que llaman `useEntregar` (`:398`), `useAnularEntrega` (`:419`) y `useComentarEnHilo` (`:463`); `useCalificarEntrega` (`:545`) ya calla antes, en `:533` | mutaciones | 06a (nuevo; DH-04) |
| `features/tareas` | `hooks.ts:288-301` (`useAvisoDeRecargaFallida` de tareas), con sus llamadores en el detalle (`detalle-tarea-view.tsx:53`), la edición (`editar-tarea-view.tsx:69`), las entregas (`entregas-view.tsx:59`) y la entrega de un alumno (`entrega-de-alumno-view.tsx:98`) | recargas | 06a (nuevo; DH-04): se corrige dentro del gancho, sin tocar los llamadores |
| `features/tareas` | `components/formulario-tarea.tsx:226` y `components/formulario-de-entrega.tsx:135` (las subidas) | subidas | 06a (nuevo; DH-04) |
| `components/adjuntos` | `adjuntos-de-publicacion.tsx:77` (la descarga sin `alFallarLaDescarga`: la de Avisos y Recursos) | descarga | **fuera** (DH-04): callarla exige importar `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` fuera de los cuatro `lib.ts` de módulo (lo fija `services/apiClient-ch3-r1.ataque.test.ts:83-88`, N-46 de CHORE-03) o una prop nueva por dos componentes de `features/clases`. Destino: ESTADO §3, el `chore` de accesibilidad del marco o el próximo encargo que toque `components/adjuntos` (ENVIVO, por las grabaciones), lo que llegue antes. (Enmienda 2, O-E1-1) El camino previsto es la prop `alFallarLaDescarga`, que ya existe: pasarla desde `publicacion-del-muro.tsx` y `elemento-de-recurso.tsx` (A-4) |
| — | No son de este mecanismo: `features/tareas/components/acciones-de-la-tarea.tsx:88` (solo `409 TAREA_CON_ENTREGAS`), `components/formulario-tarea.tsx:244` (solo errores de campo, con el formulario desmontado), `entrega-de-alumno-view.tsx:131` y `:137` (ya calla en `:130`; `:137` es el `catch` de un `refetch`, que no lanza), `codigo-de-clase.tsx:44` y `:52` (copiar al portapapeles, sin API) | — | — |

**Mecanismo M-3, "pulsar la sección activa" (y sus variantes).** Búsqueda: `rg "useAlPulsarLaSeccionActiva\(" src -g '!*.test.*'` da 16 llamadas en cuatro formas:
1. siete de `features/clases` con `if (!q.isError) return; void q.refetch()` (H-2);
2. `features/admin` (`useVolverAPedirSiFallo`, `hooks.ts:234`: en error y sin petición en vuelo, `resetQueries`) en cinco vistas;
3. `/admin/clases` y "Clases anteriores" (`useRecuperarListaDeClasesAdmin`, `hooks.ts:450`, y `useRecuperarListaDeClasesAnteriores`, `hooks.ts:402`: en error, `resetQueries`, **sin mirar si ya se está pidiendo**: el hermano de T-07 de ADMIN-01g, que `useVolverAPedirSiFallo` ya corrigió);
4. Calificaciones (`gradebook-view.tsx:86`, `mis-calificaciones-view.tsx:109`: siempre, sin cancelar).

Al desmontarse, solo `features/admin` (`useMarcarViejaSiQuedoEnError`, `hooks.ts:219`) y las dos listas de (3) (`removeQueries`) atienden la consulta en error. En `features/clases`, una lista con datos y en error **no** se vuelve a pedir al volver antes de 30 s (no está vieja): la frase "Inténtalo de nuevo" no se cumple por ese camino. Es parte de 06b (§D-4). (Enmienda 3b, M-01) Esto no es cierto con TanStack Query 5.103.2: la acción `error` deja la consulta inválida (`query.js:450-462`), así que al volver se pide sola. Lo que faltaba es que nada lo fijara con un caso; PR-2 queda como garantía escrita (CH6-B04).

**Mecanismo M-4, "falla la página siguiente".** Búsqueda: `rg "fetchNextPage\(" src -g '!*.test.*'` da 20 llamadas. Conservan la lista y avisan: Recursos (`seccion-de-recursos.tsx:61-69`), Entregas (`features/tareas/entregas-view.tsx:99-118`), el hilo privado (`features/tareas/components/hilo-privado.tsx:171`) y Mis calificaciones (`mis-calificaciones-view.tsx:113-147`). Reemplazan la lista por su `MensajeError`: en `features/clases`, Avisos, comentarios, Dudas, respuestas, los temas de Actividades (`seccion-de-tema.tsx:88`), Personas, el roster y los dos inicios (9 listas); en `features/admin` y `/admin/clases`, sus cinco tablas, "Clases anteriores" y las dos listas de clases del admin (con su recuperación probada en ADMIN-01, ADM-1F17 y ADM-1D204). 06b cambia solo las 9 de `features/clases` (DH-02).

**Mecanismo M-5 (Enmienda 3), "memoria que pasa de un id a otro" en lo que 06b toca o crea.** Es la lección de T-01 a T-03 de 06a: las tres vinieron de memoria fuera de `useState`. Base `023b450`. Búsqueda:
- `useRef`, `useState`, `useContext`, `getQueryData`, `getQueriesData`, `getQueryState` y `.subscribe(` en cada archivo de producción de 06b y en los ganchos que llama;
- la memoria de módulo (`let`, `new Map`, `new WeakMap` y `new Set` a nivel de módulo);
- el criterio y la tabla de "Arbitraje de la ronda 2" y de "Verificación de la corrección de la ronda 2" de `revision.md`.

"Sobrevive" quiere decir que la instancia sigue montada al cambiar la clase con el historial.

| Lugar (06b) | ¿Sobrevive al cambio de clase? | Memoria que guarda (y la de los ganchos que llama) | ¿Puede llevar algo de A a B? |
|---|---|---|---|
| `MuroDeLaClase`, `DudasDeLaClase` | Sí (Forma B, por O-14) | `clasePrevia` (es su clave), `idsPrevios`, `filaEnFocoRef` (los consume `clasePrevia`), `useFocoAlPasarAError` (con clave), `useFocoAlCargarMas` (lo cubre la línea de H-R2 en `enfocarPublicacion` y `enfocarDuda`), `conMarcarEnFocoRef` (Dudas; solo elige el control de la vecina dentro de la misma clase), `useAlPulsarLaSeccionActiva` (`llaveRef` es `location.key`). **Nuevo en 06b:** `useRecargarAlPulsarLaSeccion` (sin memoria propia), `useMarcarViejaSiQuedoEnError` (con clave, `huella`) y `useAvisoDeRecargaFallida` del fallo de la página | No, si `useAvisoDeRecargaFallida` recibe `claseId` como `clave` (Regla de la clave, §D-4). Sin ella, el aviso del fallo de la página de A se repetiría al volver a A, como en T-03 |
| `BloqueDeRecursos` (`key={bloque}`), `TrabajoDeLaClase` | Sí | Lo de 06a (`clasePrevia`, `clavesPrevias`, `useAvisoDeRecargaFallida` con `claseId`, el orden por clase de CHORE-04, `useGeneracionDeSoloLectura`). **Nuevo:** `useRecargarAlPulsarLaSeccion` y `useMarcarViejaSiQuedoEnError` | No |
| `SeccionDeRecursos`, `ElementosDelTema` (dentro de `SeccionDeTema`) | No: `` key={`${claseId}:${seccion.clave}`} `` desde 06a (T-02) | `idsPrevios`, `filaEnFocoRef`, `conMoverEnFocoRef`, `useFocoAlCargarMas`, `useAvisoDeRecargaFallida` (Recursos, con `claseId`). **Nuevo:** el aviso del fallo de la página en `ElementosDelTema` (con `claseId`) y `useMarcarViejaSiQuedoEnError` | No: se monta de nuevo. La clave es una segunda red, como O-09 |
| `ComentariosDePublicacion`, `RespuestasDeDuda` | No: viven en la fila (`key` por la publicación o la duda, ids de una sola clase) | `idsPrevios`, `filaEnFocoRef`, `useFocoAlCargarMas`, `useRenovarSiLaDudaYaNoEsta` (`fallosVistos`, sin clave). **Nuevo:** `useRenovarSiLaPublicacionYaNoEsta` (`fallosVistos`), el aviso de la página y `useMarcarViejaSiQuedoEnError` | No, porque se montan de nuevo. Aun así, `useRenovarSiLaPublicacionYaNoEsta` es nuevo y lleva clave (Regla de la clave). `useRenovarSiLaDudaYaNoEsta` no se toca (no está en "Se toca"; mismo motivo que en 06a) |
| `PersonasDeLaClase`, `AlumnosDeLaClase` (con `TablaAlumnos`) | No: `key={claseId}` desde 06a | Confirmaciones, `quitandoRef`, `botonesQuitar` (por alumno), `idsPrevios`. **Nuevo:** el aviso de la página y `useMarcarViejaSiQuedoEnError` | No |
| Inicios (`inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`) | Su ruta no tiene id | `PanelMisClases` con `useFocoAlCargarMas`. **Nuevo:** los dos ganchos de §D-4 y el aviso de la página | No (no hay id) |
| `GradebookDeLaClase` | No: `key={claseId}` desde 06a | `pidiendoRef`, `pulsadoRef`, `ventanas`. **Nuevo (§D-6):** la marca "la frase estaba a la vista" que lee la limpieza al desmontarse | No: se monta de nuevo por clase. La limpieza marca la clase de su cierre (`claseId` en las dependencias), nunca la de una ref |
| `components/seccion/hooks.ts` | — | `useAlPulsarLaSeccionActiva` (`llaveRef` = `location.key`); `useMarcarViejaSiQuedoEnError` movido (`claveRef` y `huella`: la limpieza corre con la clave de su propio efecto) | No |
| `features/clases/hooks.ts` (06b) | — | `useRecuperarListaDeClases*` (sin refs; claves sin id porque las listas son de la sesión); `useClaseArchivadaEnSuLista` (sin refs; efecto por `[claseId, archivada]`; busca la clase *dentro* de las listas de la sesión); `limiteDeTrabajo` (memoria de módulo: la fila de lecturas de "Trabajo", cada una con su clase en su cierre y su `signal`); (Enmienda 3b, N-04) `limiteDeRecursos` (`hooks.ts:1551`, la misma forma para `useRecursos`, que usa `SeccionDeRecursos`: el `signal` saca de la fila a la sección que se desmonta). **Nuevo (Enmienda 3b, M-02):** `useListaConservadaTrasLaPagina`, que recuerda en un estado del gancho el fallo de la página que conservó la lista, con su clave (§D-5). (Enmienda 5) Ese estado se perdía al montarse de nuevo (T-04) y era uno solo para varias claves (T-05). Pasa a un `WeakMap` de módulo con clave en la instancia de la consulta (§D-5) | No |
| Contextos | — | Solo `ContextoDeSoloLectura`, con el valor de la clase actual que le da `ClaseLayout` | No |
| Suscripciones de la caché | — | `useDetalleViejoAnteClaseArchivada` (`clase-layout.tsx`, "No se toca"): O-07, una lectura de más sin efecto visible. Con DH-10, si la renovación de B responde `409 CLASE_ARCHIVADA`, marca viejo el detalle de B, que es la clase actual: es lo correcto | No |

Resultado: lo nuevo de 06b que guarda algo en una ref es `useAvisoDeRecargaFallida` en las 9 listas (lleva clave desde 06a; aquí cuenta cuál se le pasa), `useRenovarSiLaPublicacionYaNoEsta` y `useMarcarViejaSiQuedoEnError`, que ya guarda su clave. Los tres quedan bajo la Regla de la clave, con su caso de salto (CH6-B18) y su mutación. (Enmienda 3b) Son cuatro con `useListaConservadaTrasLaPagina` (M-02), que también guarda su clave.

### Entra

**CHORE-06a · lo que pasa de un id a otro y los avisos de más (32 archivos; Enmienda 1).**
- M-1 en los 16 sitios de la tabla con "No" y daño o regla (§D-1), con la regla estática CH6-A30.
- M-2: todo lo de la tabla de M-2 con destino 06a (§D-3; DH-04): en `features/clases`, los 13 ganchos, «Unirme a la clase», los cinco llamadores de `useAvisoDeRecargaFallida`, crear y editar clase y las dos subidas; en `features/tareas`, sus tres mutaciones de la tarea, `avisarDelErrorDeLaEntrega`, su `useAvisoDeRecargaFallida` y sus dos subidas.

**CHORE-06b · recargas, «Ver más» y frases de recuperación (32 archivos; Enmienda 1).**
- M-3: un solo gancho de "pulsar la sección activa" con la política de DH-03, y la consulta en error marcada vieja al salir, en las 12 listas de `features/clases` (§D-4); el hermano de T-07 en las dos de (3).
- M-4: el fallo de la página siguiente en las 9 listas de `features/clases` (§D-5; DH-02).
- El hermano de T-02 de CLASES-03e en los comentarios (§D-5).
- N-52 en el gradebook y la fila 361 (barra lateral e inicios con una clase archivada) (§D-6).
- (Enmienda 3; 38 archivos) DH-10 (O-08): el salto del historial a otra clase cuenta como pulsar la sección (§D-4, PR-1 bis). La Regla de la clave en los ganchos de 06b (§D-4). PR-2 con las consultas que siguen pidiendo al salir (Enmienda 3b: retirado, M-01). (Enmienda 3b, M-02) La lista conservada se sigue viendo mientras la recarga la recupera (`useListaConservadaTrasLaPagina`, §D-5).

### No entra

- Lo de la columna "fuera" del inventario (DH-05), con su destino.
- `features/admin`, `/admin/clases`, "Clases anteriores", `features/tareas` y `features/calificaciones` en M-3 y M-4: ya cumplen sus frases con casos probados (variantes registradas en §D-4), salvo el hermano de T-07 en (3), N-52 y la `key` de §D-1.
- `components/foco/`, `components/clase/`, `components/layout/`, `services/`, `app/` y `clase-layout.tsx`: no cambian.
- Textos de la interfaz: ninguno nuevo (S-05).
- (Enmienda 1) M-2 en la descarga de `components/adjuntos/adjuntos-de-publicacion.tsx:77`, con destino (tabla de M-2; DH-04).

## Diseño

### §D-0 · Dos subentregas (conteo y orden)

Rutas relativas a `frontend/src/`.

| Grupo | CHORE-06a | CHORE-06b |
|---|---|---|
| Producción `features/clases` | 16: `maestros-de-clase-view.tsx`, `alumnos-view.tsx`, `personas-view.tsx`, `editar-clase-view.tsx`, `categorias-view.tsx`, `muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `editar-recurso-view.tsx`, `components/seccion-de-recursos.tsx`, `components/formulario-unirse-clase.tsx`, `hooks.ts`; (Enmienda 1, M-02) `components/formulario-clase.tsx`, `components/formulario-publicacion.tsx`, `components/formulario-recurso.tsx` | 14: `muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `personas-view.tsx`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `components/seccion-de-recursos.tsx`, `components/seccion-de-tema.tsx`, `components/respuestas-de-duda.tsx`, `components/comentarios-de-publicacion.tsx`, `components/tabla-alumnos.tsx`, `hooks.ts`, `lib.ts` |
| Producción `features/tareas` | 7: `crear-tarea-view.tsx`, `detalle-tarea-view.tsx`, `editar-tarea-view.tsx`, `entrega-de-alumno-view.tsx`; (Enmienda 1, M-02) `hooks.ts`, `components/formulario-tarea.tsx`, `components/formulario-de-entrega.tsx` | 0 |
| Producción `features/calificaciones` | 2: `gradebook-view.tsx`, `mis-calificaciones-view.tsx` | 2: `gradebook-view.tsx`, `hooks.ts` |
| Producción compartida | 0 | 3: `components/seccion/hooks.ts`, `components/seccion/types.ts` (nuevo), `features/admin/hooks.ts` (Enmienda 1, N-04: se quita la definición de `useMarcarViejaSiQuedoEnError` y de `marcarViejaSiQuedoEnError`, y se reexporta el gancho movido; §D-4) |
| Pruebas nuevas | 4: `app/estado-por-id-ch6.test.tsx`, `features/clases/avisos-al-redirigir-ch6.test.tsx`, `lib/estado-por-id-estatico-ch6.test.ts`; (Enmienda 1) `features/tareas/avisos-al-redirigir-ch6.test.tsx` | 4: `components/seccion/recargas-ch6.test.tsx`, `features/clases/recargas-ch6.test.tsx`, `features/clases/ver-mas-ch6.test.tsx`, `features/calificaciones/gradebook-ch6.test.tsx` |
| Pruebas normales de la lista cerrada | 1: `features/clases/guardas-ch4.test.tsx` | 2: `features/clases/ver-mas-y-orden-ch4.test.tsx`, `features/clases/personas-view.test.tsx`; (Enmienda 3) 3 con `features/clases/publicacion-del-muro.test.tsx`; (Enmienda 4) 4 con `features/calificaciones/gradebook-01d.test.tsx` |
| `*.ataque` (C-n del tester, §D-R0) | 2 | 7 (Enmienda 1: suma C-9); (Enmienda 3) 12: suma C-13, C-15, C-16, C-17 y C-18; (Enmienda 4) 13 archivos: suma C-20 (`secciones-01d-r4.ataque.test.tsx`). C-19 cae en `gradebook-01d-r3.ataque.test.tsx`, ya contado por C-8 |
| **Total** | **32** | **32**; (Enmienda 3) **38**; (Enmienda 4) **40** (hasta 43 con las tres condicionales) |

(Enmienda 1) Las pruebas condicionales de la lista cerrada y de §D-R0 de 06b (PR-C18 y la de `muro-recuperar-c-r4.ataque`) no se cuentan: se espera que sigan en verde; si caen, suman hasta dos archivos a 06b (34), que sigue sin partirse: son reescrituras de una aserción ya redactadas aquí. (Enmienda 3) Con C-14 (ATQ-CH6-26 de 06a), las condicionales son tres: 06b va de 38 a 41 como máximo. 06a cerró en 38 (`023b450`).

- **Por qué dos.** Juntas pasan de 50 (regla de unos 30, decisión del humano del 2026-11-04). El corte va por mecanismo: 06a es M-1 y M-2 (lo destructivo y los avisos), 06b es M-3 y M-4 (recargas y «Ver más»). Las dos comparten ocho archivos de producción (`muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `personas-view.tsx`, `components/seccion-de-recursos.tsx`, `hooks.ts` de `features/clases` y `gradebook-view.tsx`), que 06b vuelve a tocar en otras líneas.
- **Por qué 06a primero.** Es lo destructivo (O-r1-1 prioritario, calificar o editar en el id equivocado) y no depende de 06b. 06b parte del commit de 06a: sus pruebas de caminos montan las vistas ya con la `key`.
- `CLAUDE.md`, `docs/DESIGN.md` y `docs/ESTADO.md` los cambia el orquestador al cierre de cada subentrega (A-1 a A-4), fuera del conteo.

### §D-1 · M-1: lo abierto es del id de la ruta (06a)

**El estado.** `ConClaseDeLaRuta` lee `:claseId` y `ClaseLayout` pinta `<Outlet />` sin `key` (`clase-layout.tsx:90`); las vistas de tarea, entrega y recurso leen su id con `useParams`. Con un salto del historial a la misma ruta con otro id, y el destino en caché (S-02), la instancia sobrevive y su estado local también.

**Resultado que se fija** (CH6-A01 a CH6-A16):
- ninguna confirmación, formulario ni bloque abierto para un id aparece en otro; lo escrito para un id no se ve ni se envía en otro;
- ningún control del id nuevo espera por una petición del anterior;
- la respuesta del anterior renueva lo suyo y da su único aviso; no navega, no reinicia ni enfoca nada en el nuevo (S-04);
- el foco nunca cae en `<body>`: si el control que lo tenía se desmonta, va al título de la clase (cambio de clase) o a la raíz de la vista (cambio de tarea, alumno o recurso); en las listas de Avisos, Dudas, Actividades y Recursos, a su `h2` como hoy (O-14 de 02c);
- volver al id anterior con su petición en vuelo no reabre nada (S-03, CH4-40 (c)).

**Forma A · `key` en la vista** (vistas sin memoria de foco propia que importe al cambiar de clase). En el render prop de `ConClaseDeLaRuta`, el componente interno lleva `key={claseId}`, como ya hace `duplicar-clase-view.tsx:32`:
- `features/clases/maestros-de-clase-view.tsx:119` (`MaestrosDeLaClase`): cierra O-r1-1 de maestros y H-3 (el observador de `useRetirarMaestro` de A se suelta al desmontarse; la mutación de A conserva sus opciones e invalida el detalle de A, así que A ya no queda vieja);
- `features/clases/alumnos-view.tsx:27` (`AlumnosDeLaClase`): cierra O-r1-1 de alumnos (la fila y su `useQuitarAlumno` se montan de nuevo) y la búsqueda de A;
- `features/clases/personas-view.tsx:190` (`PersonasDeLaClase`), `features/clases/editar-clase-view.tsx:57` (`EditarClaseDeLaRuta`), `features/clases/categorias-view.tsx:71` (`CategoriasDeLaClase`; la `key` de `EditorDeCategorias` en `:47` se queda), `features/calificaciones/gradebook-view.tsx:222` (`GradebookDeLaClase`), `features/calificaciones/mis-calificaciones-view.tsx:254` (`MisCalificacionesDeLaClase`);
- `features/tareas/crear-tarea-view.tsx:60` (`CrearTareaDeLaClase`), y en su `handleGuardar` (`:29-33`), después del `await`: `if (!montado.current || !sigueVigente(generacion)) return` antes de `navigate`, con `const montado = useMontado()` (`components/clase/hooks.ts`). Sin esa línea, un guardado de A que llega estando en B navegaría al detalle de la tarea de A.
- **Foco.** El control que tenía el foco estaba dentro de la raíz de `ClaseLayout`; la clave de `useFocoAlTituloDeLaClase` (`clase-layout.tsx:52`, `${claseId}:${soloLectura}`) cambia con la clase, así que `useFocoAlPerderseElControl` lleva el foco a la raíz y de ahí al título (`features/clases/hooks.ts:289-305`). Es el mismo camino de CH4-40 (b′). Si el foco estaba fuera de lo que se desmonta (las secciones, la barra), no se mueve.

**Forma B · `key` en el formulario** (las cuatro listas con `clasePrevia`, que conservan su foco O-14):
- `features/clases/muro-view.tsx:164`: `<FormularioPublicacion key={claseId} claseId={claseId} />`;
- `features/clases/dudas-view.tsx:166`: `<FormularioDuda key={claseId} claseId={claseId} />`;
- `features/clases/recursos-view.tsx:181`: `<FormularioRecurso key={claseId} modo="crear" … />`;
- `features/clases/trabajo-view.tsx`: «Nuevo tema» es un estado, no un componente. Forma exacta (la de `CodigoDeClase`, CHORE-04 §D-4 ter; ajustar el estado durante el render, no en un efecto):

```tsx
const [creandoEn, setCreandoEn] = useState<string | null>(null)
// CHORE-06a (§D-1): «Nuevo tema» es de su clase; al pasar a otra o a solo lectura, se cierra.
if (creandoEn !== null && (creandoEn !== claseId || soloLectura)) setCreandoEn(null)
const creando = creandoEn === claseId
// «Nuevo tema»: onClick={() => setCreandoEn(claseId)}
// cerrarFormulario: focoAlCerrarRef.current = true; setCreandoEn(null)
```
  La línea `if (soloLectura && creando) setCreando(false)` (`:85`) queda absorbida en la de arriba. `focoAlCerrarRef` no se toma al cambiar de clase, así que el efecto de `:121-125` no lleva el foco a «Nuevo tema» de B.
- **Foco.** El campo del formulario no es una fila (`useFilaEnFoco` de esas vistas solo recuerda filas), así que el efecto de `clasePrevia` no actúa y lo recoge `useFocoAlTituloDeLaClase`: el título de la clase. Una fila con el foco sigue yendo al `h2`, como hoy.

**Forma C · marco y contenido** (vistas cuyo id no es el de la clase y que guardan contadores; precedente: `features/admin/usuario-view.tsx:98-107`). La función de hoy se queda como marco: conserva `raizRef`, el `<div ref={raizRef} tabIndex={-1}>` y `useFocoAlPerderseElControl` con la misma clave (lee la misma consulta, que está en caché). Todo lo demás pasa a una función nueva del mismo archivo, que el marco pinta con `key` por el id. Así la clave del foco cambia con el id, el foco va a la raíz como en T-09 ("otra tarea"), y los contadores, la espera de la lectura fresca, `useMontado`, la generación de solo lectura y los manejadores asíncronos son del id.
- `features/tareas/editar-tarea-view.tsx`: marco `EditarTareaDeLaClase` (`:36`; `useTarea`, `raizRef`, `useFocoAlPerderseElControl` de `:82`, el `div` de `:146`); contenido `EdicionDeLaTarea` con `key={tareaId}` (`reinicios`, `esperaLaLecturaFresca`, `useAvisoDeRecargaFallida`, `useEditarTarea`, `contenido()`, `handleGuardar` y `recargarTrasConflicto`). `handleGuardar` suma `useMontado` igual que crear tarea: después del `await`, `if (!montado.current || !sigueVigente(generacion)) return`.
- `features/clases/editar-recurso-view.tsx`: marco `EditarRecursoDeLaClase` (`:52`; `raizRef`, `useFocoAlPerderseElControl` de `:95`, el `div` de `:152`); contenido `EdicionDelRecurso` con `key={recursoId}`. Ya usa `useMontado` en `alGuardar` y `recargarTrasConflicto` (`:120`, `:130`): pasa con ellos al contenido.
- `features/tareas/entrega-de-alumno-view.tsx`: marco `EntregaDelAlumno` (`:61`; `useTarea`, `useEntregaDeAlumno`, `raizRef`, `useFocoAlPerderseElControl` de `:106-109` con la misma clave compuesta); contenido `EntregaDeUnAlumno` con `` key={`${tareaId}:${alumnoId}`} `` (Enmienda 1, M-01: la ruta es `tareas/:tareaId/entregas/:alumnoId` y el mismo alumno tiene entrega en cada tarea; con `key={alumnoId}` el contenido sobrevivía al salto de P1 en T1 a P1 en T2) (`reinicios`, `montadoRef`, la generación, `useAvisoDeRecargaFallida`, `recargarTrasConflicto`, `calificacion()` y `contenido()`). Cierra O-r1c-2: el panel de la otra entrega nace con su versión y sus valores, sin `enfocarAlMontar` heredado, y un `onCalificada` o un `onConflicto` de la anterior que llega después cae en el contenido anterior, ya desmontado.
- `features/tareas/detalle-tarea-view.tsx`: no guarda contadores. Basta la `key` en el bloque que pinta los datos: `<div key={tarea.id} className="grid gap-5 lg:grid-cols-3">` (`:82`). Se montan de nuevo `TuTrabajo`, `HiloPrivado`, `PanelDeEntregas` y `AccionesDeLaTarea`. `AccionesDeLaTarea` navega en el `onSuccess` del `mutate` (`components/acciones-de-la-tarea.tsx:82`), que no corre con el componente desmontado.

**Criterio de la `key` (Enmienda 1, M-01; lección 3 de CHORE-04).** La `key` es única por **todos** los ids de la ruta de los que depende lo que esa vista escribe o muestra, no solo por el último. Revisión de los 16 sitios:
- Forma A y Forma B: dependen solo de `:claseId` (lo que escriben o muestran es de la clase); `key={claseId}` o `creandoEn` por clase. Bien.
- `crear-tarea-view.tsx`: solo `:claseId`. Bien.
- `detalle-tarea-view.tsx` (`key={tarea.id}`), `editar-tarea-view.tsx` (`key={tareaId}`), `editar-recurso-view.tsx` (`key={recursoId}`): ids globales (UUID de una sola fila, que implica su clase). Bien.
- `entrega-de-alumno-view.tsx`: depende de `:tareaId` y `:alumnoId`, y `alumnoId` se repite entre tareas. Era el único mal: `` key={`${tareaId}:${alumnoId}`} ``.
- Fuera de los 16: `usuario-view.tsx:107` (`key={usuarioId}`, id global) y `clase-anterior-view.tsx:75` (`key={claseId}`): bien.

**Lo que no se toca y por qué.** `clase-layout.tsx` (sin `key` en el `<Outlet />`, DH-01 a), `components/clase/con-clase-de-la-ruta.tsx`, `components/foco/` y los ganchos de mutación (ninguno gana `mutationKey`: S-03). `CodigoDeClase` y `AvisoDeClaseArchivada` ya están por clase (CHORE-04).

**Hermanos del mecanismo que no cambian** (se fijan con casos de regresión, CH6-A17): las filas con `key` por un id de una sola clase; `EditorDeCategorias` y `DuplicarClaseDeLaRuta` (ya con `key`); la ficha de una cuenta (`usuario-view.tsx:107`); "Mis calificaciones" de una clase anterior (`clase-anterior-view.tsx:75`); `EntregasView` (sin estado local).

**Estados vecinos de M-1 que recorre el resumen y atacan las pruebas:** destino sin caché (todo se monta de nuevo, ya seguro); destino en caché; atrás y adelante varias veces (A → B → A → B); petición de A en vuelo al saltar (mutación de A con sus opciones, ningún control de B en espera); la respuesta de A llega estando en B (éxito, `409`, `5xx`, `400 VALIDACION` de un campo pintado, códigos que redirigen); volver a A con su petición en vuelo; la vista desmontada (ir fuera de la clase) con la petición en vuelo; el foco en el control que se desmonta, en otro control de la vista y fuera de la vista; la clase que pasa a archivada en medio (la generación de solo lectura no cambia); `StrictMode` (el doble montaje no reabre nada).

### §D-2 · `VALIDACION` fuera de contrato y M-1

Ningún formulario cambia su conducta ante un `400`: la traducción, los campos que pinta y la limpieza del error del servidor no se tocan. Lo que cambia es que el formulario de un id deja de existir al pasar a otro. Por la regla de O-16 (§D-11 de CHORE-03), un error de campo que llega con el formulario desmontado se avisa una vez, con texto legible. CH6-A14 lo fija en los formularios de la Forma B y C: el `400 VALIDACION` de A (un campo pintado, uno que el formulario no pinta, uno vacío y uno con ruta `campo.0.sub:`) que llega estando en B da un solo aviso legible y ningún `ErrorDeCampo` en el formulario de B, y lo escrito en B no se toca.

### §D-3 · M-2: quien recibe un error con que `apiClient` redirige no avisa (06a, DH-04)

`CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (`services/apiClient.ts:21-25`) dice "Quien los recibe no avisa". En `features/clases`:
- **Los 13 ganchos** de la fila 347/360: en su `onError`, `if (errorQueRedirigeElCliente(error)) return` justo antes del `toast.error(`. La línea `marcarViejoElDetalleAnteClaseArchivada(…)` que va antes no cambia. En `avisarErrorDelTema` (`hooks.ts:1335-1345`), la guarda va al inicio de la función, después de `delCampo`, y vale para los dos `toast.error`; `renovarTrasError` sigue corriendo (un código que redirige no está en `CODIGOS_QUE_RENUEVAN_LOS_TEMAS`, así que no renueva nada de más).
- **«Unirme a la clase»** (`components/formulario-unirse-clase.tsx:48-59`, `onError` del `mutate`): su primera línea pasa a ser `if (errorQueRedirigeElCliente(error)) return`, antes de calcular `errorDeCampo`; el resto no cambia. Así no hay `if` anidado y el campo no se marca, como hoy (un código que redirige no es de campo).
- **`useAvisoDeRecargaFallida`** no cambia de firma: sus cinco llamadores suman `&& !errorQueRedirigeElCliente(<consulta>.error)` a su segundo argumento (`categorias-view.tsx:35`, `recursos-view.tsx:65`, `trabajo-view.tsx:108`, `editar-recurso-view.tsx:90`, `components/seccion-de-recursos.tsx:66`).
- **(Enmienda 1, M-02) Los sitios nuevos de `features/clases`:**
  - `components/formulario-clase.tsx:75-82` (`alFallar`): su primera línea pasa a ser `if (errorQueRedirigeElCliente(error)) return`, como `formulario-duplicar-clase.tsx:68`. Los errores de campo no cambian.
  - `components/formulario-publicacion.tsx:126` y `components/formulario-recurso.tsx:213` (el `catch` de la subida): antes del `toast.error(avisoDeFalloAlSubir(…))`, `if (errorQueRedirigeElCliente(error)) return`. Lo que el `catch` hace después (soltar la espera en el `finally`, conservar lo escrito y los elegidos) no cambia. `avisoDeFalloAlSubir` no cambia.
- **(Enmienda 1, M-02) `features/tareas`** (DH-04 (a); `errorQueRedirigeElCliente` de `features/tareas/lib.ts:234`):
  - `hooks.ts:186-191` (`useCrearTarea`), `:209-215` (`useEditarTarea`) y `:242-247` (`useBorrarTarea`): `if (errorQueRedirigeElCliente(error)) return` justo antes del `toast.error(`. Lo que va antes (`marcarViejoElDetalleAnteClaseArchivada`, `pedirDeNuevoLasOpciones`, `pedirDeNuevoLaTarea`) no cambia.
  - `avisarDelErrorDeLaEntrega` (`hooks.ts:359-374`): su primera línea pasa a ser `if (errorQueRedirigeElCliente(error)) return`. Cubre entregar, anular y comentar en el hilo; `useCalificarEntrega` ya volvía antes (`:533`), sin cambio. `renovarTrasErrorDeLaEntrega` sigue corriendo en los tres (con un código que redirige no renueva nada).
  - `useAvisoDeRecargaFallida` de tareas (`hooks.ts:288-301`): sin cambiar de firma, la línea `if (esClaseArchivada(consulta.state.error)) return` (`:298`) pasa a `if (esClaseArchivada(consulta.state.error) || errorQueRedirigeElCliente(consulta.state.error)) return`, después de marcar el fallo como avisado, así que no se repite al volver. Sus cuatro llamadores no cambian.
  - `components/formulario-tarea.tsx:224-227` y `components/formulario-de-entrega.tsx:135` (el `catch` de la subida): como en `features/clases`. La rama de `:243-245` de `formulario-tarea.tsx` (error de campo con el formulario desmontado) no es de este mecanismo y no cambia.
- **Fuera** (DH-04): la descarga de `components/adjuntos/adjuntos-de-publicacion.tsx:77` sin `alFallarLaDescarga`.
- **Riesgo declarado (R-03):** `errorQueRedirigeElCliente` mira el código, no si `apiClient` redirigió. `apiClient` no redirige un `401` cuando no envió token ni cuando la ruta actual es de las de sin sesión; en las vistas de una clase, con sesión y fuera de esas rutas, siempre redirige (`perderSesion`, `apiClient.ts:174-178`). (Enmienda 1) Es la regla que ya siguen los ganchos de CLASES-03 y ADMIN-01, `features/calificaciones` y, en `features/tareas`, calificar, la descarga y los «Ver más».

### §D-4 · M-3: una sola política para volver a pedir una lista (06b, DH-03)

**La política (PR).**
- **PR-1 · Pulsar la sección en la que ya se está** (otra `location.key` en la misma ruta, con la vista montada: el control segmentado, «Inicio» de la barra en el inicio, y atrás o adelante a otra entrada de la misma ruta; S-06). Cada consulta de la vista: si está pidiendo algo (`isFetching`), nada; si está en error o vieja (`isError || isStale`), `refetch({ cancelRefetch: false })`; si está sana y fresca, nada. En una consulta por páginas, `refetch` vuelve a pedir desde la primera página y calcula los cursores siguientes con las páginas nuevas (`infiniteQueryBehavior` de 5.103.2), así que un cursor vencido no se repite.
- **PR-1 bis · El salto del historial a otra clase (Enmienda 3, DH-10, O-08).**
  - *Dónde se dispara.* Al saltar con el historial a la misma sección de otra clase, `useAlPulsarLaSeccionActiva` se dispara (llega otra `location.key`) solo en las vistas que sobreviven al cambio de clase: `MuroDeLaClase` (`publicaciones`), `DudasDeLaClase` (`dudas`), cada `BloqueDeRecursos` (`temas` del bloque) y `TrabajoDeLaClase` (`temas`). Lo verifiqué en `023b450`.
  - *Dónde no se dispara.* Las demás listas de la tabla se montan de nuevo con el salto (secciones de un tema, comentarios, respuestas, Personas, el roster y Calificaciones), así que su primer render no cuenta. Para ellas el salto es un montaje: piden si su consulta está vieja (`refetchOnMount`). (Enmienda 3b) Una consulta en error siempre está vieja: la acción `error` la deja inválida (`query.js:450-462`).
  - *Qué hace* (Enmienda 3b, M-01; reemplaza el texto de la Enmienda 3, que suponía un estado "en error sin estar vieja" que la librería no tiene). En el render del salto, el observador de la vista cambia a la clave de B y, si B está vieja (también si está en error), la pide él mismo. `shouldFetchOptionally` está en `queryObserver.js:444-446`, y el resultado optimista ya trae `isFetching: true`. Después, `useAlPulsarLaSeccionActiva` corre el manejador con la consulta de B, nunca con la de A. Lo que aporta PR-1 bis es que **no salga una segunda petición**: ve `isFetching` y no hace nada (PR-3). Hoy, en `023b450`, las cuatro vistas llaman a `x.refetch()` con B en error, y eso cancela la petición del observador y lanza otra: dos peticiones. Por estados de B al llegar:
    - sana y fresca: ninguna petición;
    - vieja (marcada o pasados 30 s; 240 s en Avisos): una, la del observador;
    - en error (falló estando a la vista o fuera de ella): una, la del observador, desde la primera página; hoy salen dos;
    - pidiendo: ninguna más, y la que vuela no se cancela.

    Así se cumple la decisión del humano: renueva solo si está en error o vieja.
  - *Condición (a): la renovación no mueve el foco.* (Enmienda 3b, N-01: reemplaza el texto de la Enmienda 3.) El foco del salto es el de 06a:
    - si se perdió el control, va al título;
    - si lo tenía una fila de A, va al `h2` de la lista;
    - si lo tenía «Ver más» de A: se queda en «Ver más» de B cuando B también lo tiene (es el mismo nodo; ATQ-CH6-31), y si no, va al `h2`;
    - en otro caso, se queda donde estaba.

    La respuesta de la renovación (éxito o fallo) no lo mueve. La excepción es que la renovación quite el control que tenía el foco. Entonces aplica la regla de siempre, nunca una fila de A ni `<body>`:
    - si desaparece «Ver más» de B, el foco va a la primera fila nueva de B si la respuesta trae alguna, y si no al `h2` (`useFocoAlCargarMas`, `components/foco/hooks.ts:155-157`);
    - si sale una fila, a la vecina o al `h2`.

    Con la lista de B conservada tras un «Ver más» fallido, la renovación ya no la reemplaza por el error mientras vuela (M-02, §D-5), así que tampoco quita controles por eso.
  - *Condición (b): si la renovación falla, el aviso es el de B.*
    - En Recursos y Actividades, la lista se conserva y sale un solo «No pudimos actualizar…», el de B. `useAvisoDeRecargaFallida` ya lleva la clave `claseId` desde 06a: al saltar empieza de cero con la consulta de B, así que cuenta solo los fallos de B ocurridos después del salto.
    - En Avisos y Dudas, la lista de B se reemplaza por el `MensajeError` de su propio error, sin aviso, como ya hace una recarga que falla.
    - Un fallo de A que llega estando en B (su renovación seguía en vuelo al saltar) no da aviso ni mensaje en B. Al volver a A tampoco se avisa (R8), y la lista de A se pide (Enmienda 3b: la pide el observador, porque el fallo la dejó inválida; las cuatro listas no consumen `signal`, así que ese fallo sí llega).
- **PR-2 · Salir de la vista o de la clave** (desmontarse o cambiar de clave): una consulta que quedó en error se marca vieja sin pedirla (`invalidateQueries({ queryKey, exact: true, refetchType: "none" })`). Al volver antes de los 30 s del `staleTime`, se pide. Una consulta sana no se toca. (Enmienda 3b, M-01; retira lo que añadió la Enmienda 3, `tambienEnVuelo`, que no tenía ningún efecto observable.) Con 5.103.2 PR-2 es redundante: la acción `error` ya deja la consulta inválida (`query.js:450-462`), también cuando el fallo llega con la vista desmontada, y `success` borra la marca (`:497-505`). Una consulta que consume `signal` (`useTrabajo`, `useRecursos`) se aborta al salir y vuelve al estado de antes (`query.js:249` y `:357-366`): no falla. Se queda como garantía escrita, igual que se aceptó en ADMIN-01. Los caminos "otra sección y regreso" (CH6-B04 (c′) y CH6-B12 (c)) se cumplen por la librería y quedan fijados con sus casos.
- **PR-3 · Nunca se cancela ni se duplica una petición en vuelo** por PR-1 o PR-2. (Enmienda 3) PR-1 tiene dos defensas: la comprobación de `isFetching` y `refetch({ cancelRefetch: false })`, que une la llamada a la petición en vuelo. Para el conteo son redundantes entre sí, como O-05 de 06a. Las mutaciones lo tienen en cuenta ("Mutaciones").

**Dónde vive.** `components/seccion/hooks.ts`:
- `useAlPulsarLaSeccionActiva` no cambia (es la base).
- **Nuevo** `useRecargarAlPulsarLaSeccion(...consultas: readonly ConsultaQueSeRecarga[])`, sobre `useAlPulsarLaSeccionActiva`, aplica PR-1 a cada consulta. `ConsultaQueSeRecarga` es `Pick<UseQueryResult, "isError" | "isStale" | "isFetching" | "refetch">` (las de `useInfiniteQuery` también cumplen) y se declara en `components/seccion/types.ts` (archivo nuevo; regla 1 de `CLAUDE.md`: los tipos no van en archivos de ganchos).
- **Movido** `useMarcarViejaSiQuedoEnError(queryKey)` desde `features/admin/hooks.ts:214-230`, sin cambio de cuerpo, con `marcarViejaSiQuedoEnError`. En `features/admin/hooks.ts` el cambio son dos cosas (Enmienda 1, N-04): se quitan las definiciones de `marcarViejaSiQuedoEnError` y `useMarcarViejaSiQuedoEnError` (`:210-230`) y se reexporta el gancho con su nombre (una línea, como `features/calificaciones/hooks.ts:95` con `useAlPulsarLaSeccionActiva`), así que ningún importador de `features/admin` cambia. Si al quitarlas queda sin uso alguna importación de ese archivo, se quita también; nada más del archivo cambia.
  - (Enmienda 3b, M-01) Sin parámetro nuevo: el gancho se mueve como estaba, con un solo argumento. Lo que agregaba la Enmienda 3 (`tambienEnVuelo`) se retira.
  - (Enmienda 3b, N-02) Las 12 listas importan `useRecargarAlPulsarLaSeccion` y `useMarcarViejaSiQuedoEnError` directamente de `@/components/seccion/hooks`, nunca reexportados por `features/clases/hooks.ts`. C-15 y C-16 dependen de eso.
  - (Enmienda 3) `useRecargarAlPulsarLaSeccion` no tiene memoria propia: lee las consultas del render en que llega la `location.key` nueva, que en un salto de clase ya son las de B. Si para un manejador estable las guarda en una ref, la actualiza en cada render. En ninguno de los dos casos desestructura `refetch` ni lo pasa como valor, y la llamada se escribe en una línea, `.refetch({ cancelRefetch: false })`. Lo vigilan `lib/guardas-ch4-r1.ataque.test.ts`, ATQ-CH4-34 (`:130-139`), y `lib/guardas-de-doble-clic-estatico.test.ts`.

**Regla de la clave (Enmienda 3; lección de T-03 de 06a).** Todo gancho que 06b crea, mueve o llama por primera vez en una vista y que guarda en una ref algo que depende de una consulta o de un id (un contador de fallos, una marca de "había frase", la clave que se marcará al salir) guarda también la clave que protege y, si cambia, empieza de cero sin actuar, como `useFocoAlPasarAError` y, desde 06a, `useAvisoDeRecargaFallida`. En 06b:
- `useAvisoDeRecargaFallida` en las 9 listas de §D-5. La `clave` es `claseId` en Avisos, Dudas, Personas, el roster y los temas de Actividades; `publicacionId` en los comentarios; `dudaId` en las respuestas. En los inicios, que no tienen id en la ruta, es la huella de su consulta (`JSON.stringify(CLAVE_CLASES_INSCRITAS)` o `JSON.stringify(CLAVE_CLASES_IMPARTIDAS)`), que no cambia.
- `useRenovarSiLaPublicacionYaNoEsta` (§D-5): una ref `clavePrevia` con `` `${claseId}:${publicacionId}` ``, con el bloque de `useAvisoDeRecargaFallida`.
- `useMarcarViejaSiQuedoEnError`: ya guarda la suya (`huella` en las dependencias; la limpieza corre con la clave de su efecto). No cambia.
- `useRecargarAlPulsarLaSeccion`: no guarda nada (viñeta de arriba).
- (Enmienda 3b, M-02) `useListaConservadaTrasLaPagina` (§D-5): su estado guarda `{ clave, errorUpdateCount }` del fallo de la página que conservó la lista, y solo lo usa si la clave es la misma. (Enmienda 5, T-04 y T-05: reemplaza lo anterior.) La marca ya no vive en el componente: es de la consulta. Se guarda en un `WeakMap` de módulo con clave en la instancia de la consulta de la caché, así que cada clave tiene la suya y sobrevive al montaje nuevo (§D-5, "Enmienda 5").
- §D-6: `useMarcarViejasLasVentanas` no guarda nada. La limpieza de `gradebook-view.tsx` marca la clase de su cierre (`claseId` en sus dependencias), y la vista se monta de nuevo por clase desde 06a. La clave que la protege es la `key`, igual que O-09.

Cada uno tiene un caso con el salto de clase del historial y, si la vista que lo llama se monta de nuevo por su `key` (las filas y el gradebook), también un caso del gancho con `renderHook` y `rerender` a otra clave. Ese caso es el que hace caer la mutación del bloque de la clave (CH6-B18 y "Mutaciones"). Donde la `key` ya protege, la clave es una segunda red y se dice así en el resumen. No es una PA-7.

**Sitios (las 12 listas de `features/clases`).** En cada uno, la llamada de hoy a `useAlPulsarLaSeccionActiva` (si la hay) se reemplaza por `useRecargarAlPulsarLaSeccion(<consulta>)` y se suma `useMarcarViejaSiQuedoEnError(<clave>)` (Enmienda 3b: un solo argumento; se retira el `true` de la Enmienda 3). (Enmienda 3) En `023b450` las líneas de la columna "Hoy" son: `muro-view.tsx:69-72`, `dudas-view.tsx:60-63`, `recursos-view.tsx:77-80` (dentro de `BloqueDeRecursos`, por bloque), `trabajo-view.tsx:122-125`, `components/seccion-de-recursos.tsx:85-88`; `respuestas-de-duda.tsx:166-169` y `seccion-de-tema.tsx:63-66` (en `ElementosDelTema`) no se movieron. Abajo quedan las de `47c3339`:

| Vista | Consulta y clave | Hoy |
|---|---|---|
| `muro-view.tsx` | `publicaciones`, `clavePublicaciones(claseId)` | `:66-69` |
| `dudas-view.tsx` | `dudas`, `claveDudas(claseId)` | `:57-60` |
| `recursos-view.tsx` | `temas`, `claveTemasDeLaSeccion(claseId, <la sección que pide la vista>)` | `:72-75` |
| `trabajo-view.tsx` | `temas`, `claveTemasDeLaSeccion(claseId, "actividades")` | `:115-118` |
| `components/seccion-de-recursos.tsx` | `recursos`, `claveRecursos(claseId, bloque, seccion.clave)` | `:81-84` |
| `components/seccion-de-tema.tsx` | `trabajo`, `claveTrabajo(claseId, <su tema>)` (`services/trabajoService.ts`) | `:63-66` |
| `components/respuestas-de-duda.tsx` | `respuestas`, `claveRespuestas(claseId, dudaId)`; solo con `pedir` (como hoy) | `:166-169` |
| `components/comentarios-de-publicacion.tsx` | `comentarios`, `claveComentarios(claseId, publicacionId)` | sin gancho |
| `personas-view.tsx` (`PersonasDeLaClase`) | `personas`, `clavePersonas(claseId)` | sin gancho |
| `components/tabla-alumnos.tsx` | `alumnos`, `claveAlumnos(claseId)` | sin gancho |
| `inicio-estudiante-view.tsx` | `clases`, `CLAVE_CLASES_INSCRITAS` | sin gancho |
| `inicio-maestro-view.tsx` | `clases`, `CLAVE_CLASES_IMPARTIDAS` | sin gancho |

Las claves salen de `features/clases/data.ts` o de `services/`; el programador usa la misma función que usa el gancho de la consulta, nunca una clave escrita a mano (M-29 de ADMIN-01). Si alguna clave no está exportada, la exporta desde donde vive (sin moverla).

**El hermano de T-07 en (3).** `useRecuperarListaDeClasesAdmin` (`hooks.ts:461-465`) y `useRecuperarListaDeClasesAnteriores` (`:412-416`) suman, después de leer el estado, `if (estado?.fetchStatus === "fetching") return` antes de `resetQueries`, como `useVolverAPedirSiFallo` (`features/admin/hooks.ts:246`). Conservan su `removeQueries` al desmontarse (equivale a PR-2).

**Variantes registradas, sin cambio** (cumplen sus frases con casos probados): `features/admin` (`useVolverAPedirSiFallo`, en error y sin petición en vuelo, `resetQueries`: vuelve a la primera página sin las demás), `/admin/clases` y "Clases anteriores" (lo mismo, con `removeQueries` al salir), y Calificaciones (T-08: al pulsar vuelve a la ventana inicial y pide siempre, sin cancelar). Se escriben así en `CLAUDE.md` (A-1).


### §D-5 · M-4: falla la página siguiente (06b, DH-02)

**Función nueva** en `features/clases/lib.ts`:

```ts
// CHORE-06b (§D-5): con filas a la vista, el fallo de la página siguiente (red o 5xx) no quita lo cargado:
// la lista se queda y «Ver más» sigue para repetir. El cursor vencido, un error que quita el acceso y uno
// con que apiClient redirige no se conservan como fallo de página (el primero dice su frase, el segundo
// reemplaza la vista y el tercero no avisa: la página se va).
export const conservaLaListaTrasLaPagina = (consulta: {
  isFetchNextPageError: boolean
  error: unknown
}): boolean =>
  consulta.isFetchNextPageError &&
  !esErrorDeCursor(consulta.error) &&
  !errorQuitaLaVista(consulta.error) &&
  !errorQueRedirigeElCliente(consulta.error)
```

El tipo del parámetro va en línea porque es la firma de una función pura de `lib.ts` (como `focoPerdido`); si la regla estática de tipos de `features/clases` lo rechaza, va a `types.ts` como `FalloDeLaPagina` y el programador lo dice en el resumen.

**(Enmienda 3) La función que vale es esta, no la de arriba.** La de arriba conservaba cualquier error salvo el cursor, el acceso y la redirección: también un `404 PUBLICACION_NO_ENCONTRADA` o `DUDA_NO_ENCONTRADA` (contradecía CH6-B13 y T-02 de CLASES-03e), un `400 VALIDACION` de otro campo o un `429`. DH-02 (a) dice "red, `5xx`". La forma de "red o `5xx`" es la de `avisoDeRecargaFallidaDelRecurso` (`features/clases/lib.ts:734-739`):

```ts
// CHORE-06b (§D-5, DH-02 a): con filas a la vista, el fallo de la página siguiente por la red o el servidor
// (sin conexión o 5xx) no quita lo cargado: la lista se queda y «Ver más» sigue para repetir. Cualquier 4xx
// (el cursor vencido, un error que quita el acceso o con que apiClient redirige, la publicación o la duda
// que ya no existe) reemplaza la lista como antes.
export const conservaLaListaTrasLaPagina = (consulta: {
  isFetchNextPageError: boolean
  error: unknown
}): boolean =>
  consulta.isFetchNextPageError &&
  (!esApiError(consulta.error) ||
    consulta.error.codigo === "SIN_CONEXION" ||
    consulta.error.estado >= 500)
```

**(Enmienda 3b, M-02) La recarga que recupera una lista conservada.**
- *El problema.* `isFetchNextPageError` es `isError && fetchMeta?.fetchMore?.direction === "forward"` (`infiniteQueryObserver.js:104-105`). Toda recarga despacha `fetch` sin `meta`, y eso deja `fetchMeta: null` (`query.js:354-357` y `:432-436`). Pasa al pulsar, al montar, cuando el observador cambia de clave y con una invalidación. Mientras tanto `status` sigue en `"error"` hasta el `success` (`fetchState`, `:486-496`, solo lo toca sin datos). Con `conserva = conservaLaListaTrasLaPagina(consulta)` a secas, todo camino de recuperación pasaba un momento por el `MensajeError`: lo anunciaba el lector de pantalla y el foco saltaba.
- *La decisión: la lista sigue a la vista durante esa recarga.* Es la salida 1 de `revision.md`, coherente con DH-02 (a), que pone a Recursos como modelo y que ahí no pinta el error. Durante la recarga «Ver más» queda en espera (`enEspera={isFetching}`, sin cambio), no aparece ningún `role="alert"` ni texto de error, y el foco no se mueve.
- *Lo que DH-02 (a) dejó igual no cambia:*
  - una recarga de fondo que falla sin que antes fallara una página sigue reemplazando la lista;
  - si la recarga que recupera falla, ese fallo es de una recarga y también reemplaza la lista: el `MensajeError` de siempre, sin aviso;
  - un «Ver más» que vuelve a fallar es un fallo de página: la lista se queda y sale un aviso.

  No hace falta decisión del humano.
- *Cómo.* Un gancho nuevo en `features/clases/hooks.ts`, junto a `useAvisoDeRecargaFallida`. Recibe parámetros sueltos (sin tipo nuevo en el archivo de ganchos, regla 1 de `CLAUDE.md`) y usa el ajuste de estado durante el render, la forma de `creandoEn` de `trabajo-view.tsx`, no una ref escrita en el render:

```ts
// CHORE-06b (§D-5, M-02 de la Enmienda 3b): la lista que conservó un fallo de la página siguiente se
// sigue viendo mientras una recarga la recupera (pulsar, volver, el salto de clase, una invalidación):
// la recarga borra la dirección del fallo, pero el error es el mismo (mismo errorUpdateCount) hasta
// que llega la respuesta. Un fallo nuevo de una recarga sí reemplaza la lista (DH-02 a).
export const useListaConservadaTrasLaPagina = (
  isFetchNextPageError: boolean,
  isError: boolean,
  errorUpdateCount: number,
  error: unknown,
  clave: string,
): boolean => {
  const ahora = conservaLaListaTrasLaPagina({ isFetchNextPageError, error })
  const [marca, setMarca] = useState<string | null>(null)
  const actual = `${clave}:${String(errorUpdateCount)}`
  if (ahora && marca !== actual) setMarca(actual)
  return ahora || (isError && marca === actual)
}
```

  - **Por qué funciona en cada camino.** El render que precede a la recarga ve todavía `fetchMeta` hacia adelante. En el resultado optimista del montaje o del cambio de clave, `createResult` lee `state.fetchMeta` antes de que se despache `fetch`. Así la marca se toma antes de perder la dirección, y vale mientras el `errorUpdateCount` sea el mismo.
  - **Clave.** La marca lleva la clave: otra clase u otra publicación empiezan de cero (Regla de la clave). Las claves son las de `useAvisoDeRecargaFallida` en esa lista.
  - **`StrictMode`.** El doble render da la misma marca.
  - **Si cambia la forma.** Si al programarlo el gancho necesitara otra forma para cumplir los casos, el programador se detiene (PA-4). No se resuelve tocando `components/foco/` ni la configuración de la consulta.

**(Enmienda 5, T-04 y T-05) La marca es de la consulta, no del componente.** Reemplaza la forma de arriba, que el programador aplicó tal cual (`features/clases/hooks.ts:1341-1353` del árbol).
- *Por qué fallaba.*
  - **T-04.** La marca vivía en un `useState` y solo se tomaba en un render que veía `isFetchNextPageError`. Se pulsa la sección, la recarga que recupera queda en vuelo (`fetchMeta: null`, `query.js:354-357`), y la persona va a otra sección o cierra el bloque. Las 8 consultas sin `signal` siguen pidiendo sin observadores: al quitar el último, la librería solo cancela el reintento (`query.js:247-251`). Al montarse de nuevo, el estado nace en `null`, ningún render ve ya la dirección, y `conserva` es falso.
  - **T-05.** En `MuroDeLaClase` y `DudasDeLaClase`, que sobreviven al salto de clase, había un solo par para dos clases: la marca de B pisaba la de A.
- *Dónde vive ahora.* En una memoria de módulo de `features/clases/hooks.ts`:
  `const fallosDePaginaConservados = new WeakMap<Query, string>()`
  - **La clave** es la instancia de la consulta de la caché (`Query`, importada como tipo de `@tanstack/react-query`). El gancho la obtiene con `useQueryClient().getQueryCache().find({ queryKey, exact: true })`.
  - **Siempre existe en ese render.** El gancho de la lista, llamado antes en el mismo componente, ya la construyó en la caché: el observador lo hace en su constructor y en `getOptimisticResult`, también al cambiar de clave.
  - **El valor** es `` `${errorUpdateCount}:${errorUpdatedAt}` `` del fallo de página que conservó la lista. Lleva `errorUpdatedAt` para que un contador que vuelve a empezar no repita una marca vieja: `resetQueries` deja la misma instancia con `errorUpdateCount: 0` y `errorUpdatedAt: 0` (N-06 del manager queda cerrado así).
  - **Hay precedente** de memoria de módulo por consulta: `ultimoFalloAvisado` de `features/tareas/hooks.ts`, un `WeakMap` por consulta (inventario de la ronda 2 de 06a).
- *La forma del gancho:*

```ts
// CHORE-06b (§D-5; Enmienda 5, T-04 y T-05): el fallo de la página que conservó la lista es de la
// consulta, no del componente: sobrevive a que la vista se monte de nuevo con la recuperación en vuelo y
// cada consulta tiene el suyo. Sale de la memoria con la consulta (gcTime, removeQueries, clear).
const fallosDePaginaConservados = new WeakMap<Query, string>()

export const useListaConservadaTrasLaPagina = (
  queryKey: QueryKey,
  isFetchNextPageError: boolean,
  isError: boolean,
  errorUpdateCount: number,
  errorUpdatedAt: number,
  error: unknown,
): boolean => {
  const consulta = useQueryClient().getQueryCache().find({ queryKey, exact: true })
  const ahora = conservaLaListaTrasLaPagina({ isFetchNextPageError, error })
  const fallo = `${String(errorUpdateCount)}:${String(errorUpdatedAt)}`
  useEffect(() => {
    if (!ahora || consulta === undefined) return
    fallosDePaginaConservados.set(consulta, fallo)
  }, [ahora, consulta, fallo])
  return ahora || (isError && consulta !== undefined && fallosDePaginaConservados.get(consulta) === fallo)
}
```

  - **El registro va en un efecto,** no en el render: no se escribe una memoria de módulo durante el render, que `eslint-plugin-react-hooks` 7 puede rechazar.
  - **El efecto siempre llega a tiempo.** El render que ve `isFetchNextPageError` ya decide con `ahora`. React corre los efectos de un *commit* antes de pintar la actualización siguiente, así que el render en que `fetchMeta` pasa a `null` ya lee la marca. Vale para el fallo con la vista montada y para el montaje con el fallo ya ocurrido: el resultado optimista de ese primer render todavía trae la dirección (Enmienda 3b, tabla del manager).
  - **Si una regla de lint rechaza el número de parámetros,** el programador lee `errorUpdatedAt` de `consulta?.state` en lugar del parámetro y lo dice en el resumen.
- *Por qué cumple:*
  - **T-04:** la marca se tomó con la vista montada, al fallar la página. Al volver con la recuperación en vuelo, el render lee la marca de la consulta: mismo `errorUpdateCount` y mismo `errorUpdatedAt`, porque la recarga no los toca hasta responder. `conserva` es verdadero: la lista y «Ver más» en espera, sin `role="alert"`.
  - **T-05:** A y B son dos instancias de consulta con dos marcas.
- *Lo que DH-02 (a) dejó igual sigue igual:*
  - **una recarga de fondo que falla sin un fallo de página antes:** no hay marca, así que la lista se reemplaza (ATQ-CH6-38);
  - **la recuperación que falla:** sube `errorUpdateCount` y cambia `errorUpdatedAt`, la marca ya no coincide y la lista se reemplaza sin aviso (ATQ-CH6-39, con `403` y `404`);
  - **un «Ver más» que vuelve a fallar:** `ahora` registra el fallo nuevo y conserva, con su aviso;
  - **el `400` del cursor:** es un `4xx`, `ahora` es falso, no hay marca de ese fallo y reemplaza con su frase (ATQ-CH6-40).
- *Limpieza y aislamiento.*
  - El `WeakMap` no retiene la consulta: cuando la caché la suelta (pasada su `gcTime`, con `removeQueries` o con `clear` al cerrar sesión, `features/auth/hooks.ts:46` y `:118`), la entrada se va con ella. Una consulta nueva con la misma clave es otra instancia, sin marca.
  - Cada prueba crea su propio `QueryClient`, así que sus consultas son instancias nuevas y no heredan marcas de otra prueba. No hace falta limpiar nada entre pruebas.
- *Alternativas descartadas:*
  - **(1) Un `Map` de módulo por `queryHash`:** sobreviviría al montaje, pero lo compartirían dos `QueryClient` con las mismas claves (las pruebas, y en la app una sesión nueva tras `clear`), y no se limpiaría con la consulta. Una marca vieja podría coincidir.
  - **(2) Guardar la marca en la caché** (`meta` de la consulta o `setQueryData`): `meta` viene de las opciones y no es para estado, y tocar los datos cambia `dataUpdatedAt` y lo que pintan las listas.
  - **(3) Un contexto o un componente más arriba que sobreviva:** los inicios y los bloques no tienen un ancestro común que sobreviva a todos los caminos, y es más código en más archivos.
  - **(4) Conservar ante cualquier error con datos mientras se recarga** (MT16 del tester): rompe lo que DH-02 (a) dejó igual (ATQ-CH6-38, 39 y 40 caen) y sería una conducta visible nueva sin decisión del humano.
  - **(5) Volver a calcular la dirección con el estado de la consulta:** la recarga borra `fetchMeta`, y ni `error`, ni `errorUpdatedAt`, ni `dataUpdatedAt` distinguen un fallo de página de uno de recarga.
- *Firma.* Cambian el último argumento y uno nuevo: la `queryKey` de la consulta en lugar de la cadena `clave`, y `errorUpdatedAt`. Los 9 llamadores pasan la misma clave que pasan a `useMarcarViejaSiQuedoEnError`: `clavePublicaciones(claseId)`, `claveDudas(claseId)`, `claveComentarios(claseId, publicacionId)`, `claveRespuestas(claseId, dudaId)`, `claveTrabajo(claseId, <su tema>)`, `clavePersonas(claseId)`, `claveAlumnos(claseId)`, `CLAVE_CLASES_INSCRITAS` y `CLAVE_CLASES_IMPARTIDAS`. Los llamadores están en 06b y el conteo no cambia. Los dobles de C-15 y C-16 (`() => false`) no miran los argumentos y no cambian.
- *Inventario por mecanismo (Enmienda 5).* El mecanismo es el mismo para las 9 listas, porque la marca es de la consulta. Lo que cambia entre ellas es si la vista sobrevive al cambio de clave o se monta de nuevo, y si la consulta consume `signal`.

| Lista | Al cambiar de clave o volver | `signal` |
|---|---|---|
| Avisos (`MuroDeLaClase`) y Dudas (`DudasDeLaClase`) | sobreviven al salto de clase; se montan de nuevo al volver de otra sección | no |
| Comentarios (de una publicación o de un recurso) y respuestas | se montan de nuevo (la fila o el bloque, al cerrar y abrir) | no |
| Personas y el roster | se montan de nuevo (`key={claseId}`) | no |
| Inicio del estudiante y del maestro | se montan de nuevo (sin id en la ruta) | no |
| Un tema de Actividades (`ElementosDelTema`) | se monta de nuevo (`` `${claseId}:${seccion.clave}` ``) | **sí** |

  Estados vecinos, en todas salvo donde se dice:
  - **Primera carga que falla:** no hay datos, así que no es fallo de página; no hay marca y se reemplaza, como hoy.
  - **Fallo de página (red o `5xx`):** `ahora` y la marca se registran; la lista se conserva y sale un aviso.
  - **Recuperación en vuelo y montaje nuevo (T-04):** se lee la marca de la consulta y la lista se conserva. En el tema de Actividades, salir aborta la recarga y la revierte con la dirección, así que pasa sin marca; con marca, igual.
  - **Cerrar y abrir un bloque** (comentarios y respuestas): es otro montaje sobre la misma consulta y se conserva.
  - **Saltos A → B → A y A → B → A → B (T-05):** cada consulta tiene su marca, también en las vistas que sobreviven.
  - **La recuperación responde bien:** `isError` pasa a falso. La marca queda y no estorba: el siguiente error trae otro par.
  - **La recuperación falla:** el par cambia, y la lista se reemplaza sin aviso.
  - **Un fallo de página nuevo:** se registra el par nuevo, se conserva y sale un aviso nuevo.
  - **La consulta sale de la caché** (`gcTime`, `removeQueries`, `clear` al cerrar sesión): la entrada se va con ella, y la consulta nueva no tiene marca.
  - **`resetQueries`** (no lo usa ninguna de las 9 listas): la instancia se queda pero el par vuelve a `0:0`; un fallo posterior trae otro `errorUpdatedAt`, así que la marca vieja no coincide.
  - **Dos observadores de la misma consulta montados a la vez:** leen la misma marca y deciden igual.
  - **`StrictMode`:** el efecto corre dos veces con el mismo valor.
  - **La clase pasa a archivada:** un `409 CLASE_ARCHIVADA` es un `4xx`, así que no registra marca; si llega en la recuperación, cambia el par y reemplaza.
- *Los demás ganchos de 06b con memoria propia, ante el montaje nuevo y ante varias claves:*
  - `useAvisoDeRecargaFallida` (ref `fallosVistos` y su `clave`): al montarse de nuevo nace con el contador del momento y no avisa un fallo ya ocurrido. Es la conducta buscada (R8): olvidar es correcto. Con varias claves, la ref se reinicia con la clave (06a). No tiene el hueco.
  - `useRenovarSiLaPublicacionYaNoEsta` (ref `fallosVistos` y su clave): igual. Al abrir de nuevo un bloque con el `404` ya ocurrido, la consulta en error está vieja, se pide otra vez, el `404` nuevo sube el contador y la renueva (ATQ-CH6-42, O-11). No tiene el hueco.
  - `useMarcarViejaSiQuedoEnError`: su memoria es la clave del efecto, y PR-2 es redundante con la librería (3b). No tiene el hueco.
  - `useRecargarAlPulsarLaSeccion`: sin memoria.
  - Las dos refs del gradebook (`fraseSinMarcarRef`, `fraseMarcadaRef`): al desmontarse, la limpieza marca las ventanas, así que lo que la ref sabía queda en la caché antes de perderse. La vista se monta de nuevo por clase. No tienen el hueco (ATQ-CH6-46 a 49 en verde).
  - `useFocoAlPasarAError`: recibe `isError && !conserva`; con el `conserva` corregido, decide bien. Su memoria va por clave (06a).

**En cada una de las 9 listas** (Avisos, comentarios, Dudas, respuestas, temas de Actividades, Personas, roster y los dos inicios):
1. `const conserva = conservaLaListaTrasLaPagina(<consulta>)` (con `isFetchNextPageError` solo hay filas: TanStack Query lo pone en una consulta por páginas que ya tenía datos). (Enmienda 3b, M-02) En su lugar: `const conserva = useListaConservadaTrasLaPagina(<consulta>.isFetchNextPageError, <consulta>.isError, <consulta>.errorUpdateCount, <consulta>.error, <clave>)`. El resto de los pasos usa ese `conserva`. (Enmienda 5) La llamada pasa a ser `useListaConservadaTrasLaPagina(<queryKey>, <consulta>.isFetchNextPageError, <consulta>.isError, <consulta>.errorUpdateCount, <consulta>.errorUpdatedAt, <consulta>.error)`.
2. El orden de la vista no cambia: **error primero**, con la condición `<consulta>.isError && !conserva`; después cargando, vacío y datos. Con `conserva`, la rama de datos pinta la lista y «Ver más» (cotejado con la lección 2 de CHORE-04: la viñeta pide un botón que esta vez sigue pintado, porque la rama de error ya no lo quita).
3. Un aviso por fallo con `useAvisoDeRecargaFallida(<consulta>.errorUpdateCount, conserva, mensajeDeConsultaClases(<consulta>.error))`, como Recursos (`seccion-de-recursos.tsx:64-69`). No avisa al montar con un fallo ya ocurrido, ni con la vista desmontada, ni ante un código que redirige (`conserva` es falso). (Enmienda 3) Desde 06a el gancho pide un cuarto argumento obligatorio, `clave`, antes de `idDelAviso`: la llamada es `useAvisoDeRecargaFallida(<consulta>.errorUpdateCount, conserva, mensajeDeConsultaClases(<consulta>.error), <clave>)`, con la clave de la "Regla de la clave" (§D-4). En `023b450` el modelo de Recursos está en `seccion-de-recursos.tsx:65-73`.
4. Los dos inicios pasan `conserva` a su panel: `isError={clases.isError && !conserva}`, `errorMensaje` solo en ese caso, y a `BloqueDestacado` `esError={clases.isError && !conserva}` (el título no dice "No pudimos cargar tus clases" con la lista a la vista; O-E4-1). `PanelMisClases` y `BloqueDestacado` no cambian.
5. Personas (`personas-view.tsx:47-63`) ya pinta su encabezado en todos los estados (T-27); `cargada` pasa a `primera !== undefined && ultima !== undefined && (!personas.isError || conserva)`.
6. `respuestas-de-duda.tsx`: las condiciones de `:251` y `:255` que miran `respuestas.isError` miran `respuestas.isError && !conserva`; la de `:181` (el foco a la vecina) no cambia.

**Seccion-de-recursos** ya conserva la lista; solo cambia su gancho de PR-1 (§D-4) y, en 06a, el aviso ante un código que redirige (§D-3).

**Foco.** Con la lista conservada, «Ver más» no se desmonta: el foco se queda en el botón (hoy va al encabezado de la lista). `useFocoAlCargarMas` no cambia: solo mueve el foco si el botón se desmontó. `useFocoAlPasarAError` (Avisos, Dudas) sigue igual para los errores que reemplazan la lista. (Enmienda 3b, M-02) Su primer argumento pasa a ser `<consulta>.isError && !conserva`, es decir, "la lista está reemplazada por el error", y no `isError`. Con la lista conservada, `eraError` queda en falso y el gancho no mueve nada. Si después una recarga falla y reemplaza la lista, ese render es el paso a error, y el foco va al `h2` solo si se perdió (T-04 de 02c, como hoy).

**El hermano de T-02 de CLASES-03e (comentarios).** Nuevo gancho en `features/clases/hooks.ts`, junto a `useRenovarSiLaDudaYaNoEsta` (`:1789-1802`) y con la misma forma: `useRenovarSiLaPublicacionYaNoEsta(claseId, errorUpdateCount, error)`, que ante `PUBLICACION_NO_ENCONTRADA` (una vez por fallo) invalida la lista de Avisos (`clavePublicaciones(claseId)`, `exact`) y las de Recursos (`clavePrefijoDeRecursos(claseId)`), como `invalidarComentarios` (`:1099-1110`). Lo llama `ComentariosDePublicacion`. `PUBLICACION_NO_ENCONTRADA` no se conserva como fallo de página: el bloque dice «Esa publicación ya no existe.» hasta que la lista renovada quita la fila (y con ella el bloque). El foco sigue la regla de la fila que sale (vecina o `h2`).
- (Enmienda 3) En `023b450`, `useRenovarSiLaDudaYaNoEsta` está en `hooks.ts:1811-1824` e `invalidarComentarios` en `:1105-1116`. Por la Regla de la clave (§D-4), la firma es `useRenovarSiLaPublicacionYaNoEsta(claseId: string, publicacionId: string, errorUpdateCount: number, error: unknown)`. Guarda `clavePrevia` con `` `${claseId}:${publicacionId}` `` y, si cambia, pone `fallosVistos` al día y vuelve sin invalidar. Con el `conservaLaListaTrasLaPagina` de la Enmienda 3, un `404` nunca se conserva como fallo de página, así que la primera carga y «Ver más comentarios» llegan a la misma rama.

**O-01 de 06a (Enmienda 3): decisión tomada, sin cambio en 06b.** O-01 es que la página siguiente de «Ver más alumnos» de una tarea, si falla después de saltar a otra tarea, nunca se avisa.
- §D-5 fija la regla para las 9 listas de `features/clases`:
  - el fallo de la página siguiente con la vista a la vista conserva la lista y avisa una vez;
  - si llega con la vista desmontada (otra sección, otra clase u otra tarea), no se avisa: la persona no está ahí, y R8 dice que "montar la vista con un fallo ya ocurrido no avisa";
  - al volver, la lista se pide de nuevo. (Enmienda 3b, M-01) La pide la librería: el fallo deja la consulta inválida y al montarse o al cambiar el observador se pide. Ni PR-2 ni PR-1 bis hacen falta para esto. Mientras vuela esa recarga, la lista se ve como estaba (M-02, `useListaConservadaTrasLaPagina`). En el tema de Actividades (`useTrabajo` consume `signal`), salir aborta la página en vuelo y la revierte: no falla. Al volver, la lista sigue con su «Ver más», y solo se pide si ya está vieja por tiempo.
- Las entregas de una tarea (`features/tareas/entregas-view.tsx`) siguen fuera de 06b ("No entra": `features/tareas` en M-4). Ya conservaban la lista desde ENTREGAS-01e. (Enmienda 3b, M-01; corrige el texto de la Enmienda 3) Las consultas de `features/tareas` no consumen `signal`, así que el fallo de la página de T1 llega con la vista desmontada y deja la consulta inválida. Al volver a T1, la lista se vuelve a pedir desde la primera página, sin aviso. La decisión no cambia (no se avisa con la vista desmontada; R8); cambia el porqué.
- El orquestador cierra la fila de O-01 en `docs/ESTADO.md` §3 como decisión tomada (DH-02 (a) y R8), con esta referencia (A-3).


### §D-6 · N-52 y la clase archivada en la barra (06b)

- **N-52** (`features/calificaciones`). Nuevo gancho en `hooks.ts`, junto a `useMarcarViejoElGradebook`: `useMarcarViejasLasVentanas(claseId)` devuelve una función que marca viejas todas las ventanas de la clase (`invalidateQueries({ queryKey: clavePrefijoDeCalificaciones(claseId), refetchType: "none" })`), incluida la que está a la vista. `gradebook-view.tsx` la llama (a) al pulsar la sección, en el manejador de `:86-90`, antes de `recargarLaPrimeraVentana()`; y (b) al desmontarse, si la vista mostraba la frase de la clase cambiada (`ocurrenciaDelCursor !== null`; un efecto de limpieza que lee una ref, como `useMarcarViejaSiQuedoEnError`). Así "Alumnos siguientes" vuelve a pedir la ventana vacía en lugar de servirla de la caché. `useMarcarViejoElGradebook` no cambia: con la vista quieta sigue sin marcar la ventana a la vista (CAL-T-201). CAL-T-248 cambia de sentido (C-6 de §D-R0).
  - **(Enmienda 4, P-1) La forma de (a): solo con la frase a la vista.**
    - *El cambio.* Al pulsar la sección, `marcarViejasLasVentanas()` se llama solo si en el render en que llega la pulsación se ve la frase de la clase cambiada (`ocurrenciaDelCursor !== null`, la misma condición que la limpieza de (b)). Con la tabla sana, pulsar sigue como en T-08: invalida y pide la primera ventana (`useRecargarLaPrimeraVentana`, que no lleva `refetchType: "none"`) y no marca nada más.
    - *Cómo se escribe.* El manejador lee `ocurrenciaDelCursor` del render en que llega la `location.key` nueva. Para no leerla antes de declararla, el programador sube el cálculo puro de `reemplazada`, `errorDeCursor`, `ventanaVaciaConCursor` y `ocurrenciaDelCursor` (hoy en `gradebook-view.tsx:120-149`) por encima de la llamada a `useAlPulsarLaSeccionActiva`. Son líneas sin ganchos, así que el orden de los ganchos no cambia. No usa `fraseALaVistaRef` en el manejador: esa ref se actualiza en un efecto declarado después y tendría el valor del render anterior. Si mover ese cálculo hace caer una prueba de foco de T-08, es PA-1.
    - *Por qué esta forma y no las otras dos:*
      - *Marcar siempre al pulsar* (lo que hay hoy en el árbol) haría viejas, con la tabla sana, ventanas que están bien. Al navegar a ellas después se pedirían de nuevo, es decir, pedir de más sin necesidad. Además rompe CAL-1D03e.
      - *No sumar ninguna marca, ensanchando la que ya existe al pulsar:* esa marca es la de `useRecargarLaPrimeraVentana`, sin `refetchType: "none"`. Si incluyera la ventana a la vista, la pediría en ese momento, porque sigue activa: el observador cambia a la primera ventana un render después. Eso sería una petición de más que contradice CAL-1D03d ("pide la primera ventana una sola vez"). Marcarla a la vista desde `useMarcarViejoElGradebook` rompe CAL-T-201. Y quitarla de la caché en lugar de marcarla esquivaría las sondas de las pruebas, no su intención.
      - Con la forma elegida cambian las pruebas que de verdad cambian de sentido (abajo, "Inventario de las marcas del gradebook"), y nada pide de más.
    - *Lo que ve la persona:* nada nuevo. Las marcas no piden nada por sí mismas, y la frase "Vuelve a abrir Calificaciones" ya se cumplía al pulsar con la primera ventana; N-52 ya estaba decidido. No va al humano.
  - **(Enmienda 4b, M-01) La condición de (a) y (b): "la frase se vio y todavía no se marcó".** Reemplaza "se ve ahora" de la Enmienda 4, tanto al pulsar como en la limpieza al desmontar.
    - *Por qué.* La frase de la ventana vacía W deja «Alumnos anteriores» a la vista (`gradebook-view.tsx`, la rama `ventanaVacia` de `cuerpo`). Regresar no marca W: lo fijan CAL-1D02ac (`gradebook-01d.test.tsx:1222-1251`) y CAL-T-201. Si la persona regresa y después hace lo que pide la frase (pulsar, salir y volver, saltar de clase), en ese render `ocurrenciaDelCursor` es `null` y nada marcaba W. «Alumnos siguientes» la servía vieja y la frase volvía. Es el camino "otra ventana" que `AGENTS.md` exige cubrir. El hueco ya estaba en (b) y en el salto antes de la Enmienda 4.
    - *Dónde se guarda.* En `gradebook-view.tsx` (`GradebookDeLaClase`, ya en 06b), dos refs: `fraseSinMarcarRef` (`string | null`, la última ocurrencia vista y no marcada) y `fraseMarcadaRef` (`string | null`, la última que se marcó). Reemplazan a `fraseALaVistaRef` del árbol. Las ocurrencias son las de `ocurrenciaDelCursor` (`cursor:<errorUpdatedAt>:<errorUpdateCount>` o `vacia:<dataUpdatedAt>`), así que cada respuesta o fallo nuevo da otra.
    - *Cómo se enciende.* Es un efecto sin dependencias, declarado justo después del cálculo de `ocurrenciaDelCursor`, que la Enmienda 4 ya sube, y **antes** de la llamada a `useAlPulsarLaSeccionActiva`. Los efectos corren en el orden en que se declaran, así que en el render de la pulsación el manejador ya ve la frase de ese render:
      `if (ocurrenciaDelCursor === null || ocurrenciaDelCursor === fraseMarcadaRef.current) return; fraseSinMarcarRef.current = ocurrenciaDelCursor`
      Regresar a otra ventana no la apaga: solo se enciende.
    - *Cómo se marca y se apaga.* Con `fraseSinMarcarRef.current !== null`, se pasa ese valor a `fraseMarcadaRef`, se pone `fraseSinMarcarRef` en `null` y se llama a `marcarViejasLasVentanas()`. Lo hacen dos sitios:
      - el manejador de la pulsación, antes de `recargarLaPrimeraVentana()`;
      - la limpieza al desmontar, el efecto de `[marcarViejasLasVentanas]` que ya existe, que lee las refs.

      Una frase ya marcada no vuelve a encenderse aunque se vea otra vez la misma ocurrencia (W servida de la caché con el mismo `dataUpdatedAt`). Una ocurrencia nueva sí: W vuelve a responder vacía o llega otro `400`.
    - *Con la tabla sana y sin haber visto la frase en este montaje, `fraseSinMarcarRef` es `null` y nada se marca* (CAL-1D03e no cambia).
    - *Montaje nuevo por clase.* `GradebookDeLaClase` lleva `key={claseId}` desde 06a. Las refs nacen en `null` en cada clase, y la limpieza de la instancia de A marca las ventanas de A (`claseId` de su cierre). El salto de clase después de "otra ventana" marca A.
    - *`StrictMode`.* El montaje doble corre la limpieza una vez de más. Si la frase ya se vio en ese primer montaje (la primera carga con un `400`, como CAL-1D02ad), marca una vez y la apaga. Las refs sobreviven al montaje simulado, y como la frase ya está en `fraseMarcadaRef`, no se vuelve a encender. A lo más es una marca de más, que no pide nada. Ninguna prueba que cuente marcas usa `StrictMode`.
    - *En la misma pulsación, si la frase se ve en ese render:* el efecto la enciende primero y el manejador la marca y la apaga. La segunda pulsación, ya con la tabla sana, no marca (C-20).
    - *Inventario:* ninguna prueba que cuente marcas regresa a otra ventana y después pulsa o desmonta: CAL-T-241 y CAL-1D02ac no pulsan ni desmontan, y CAL-1D02aa no cuenta marcas. CAL-1D03d, CAL-1D03e, C-19 y C-20 dan las mismas cifras que con la Enmienda 4.
  - **(Enmienda 4) Inventario de las marcas del gradebook** (grep de `marcasViejas`, `espiarMarcas`/`marcas()`, `refetchType`, `spyOn(…, "invalidateQueries")` e `isInvalidated` en todas las pruebas; base `023b450`). La única que cambia por (b) es CAL-T-244.
    - **Cambian:**
      - `gradebook-01d.test.tsx` CAL-1D03d (`:1330-1359`, las 4 filas): pulsa con la frase a la vista, así que suma una marca por (a). Va a la lista cerrada.
      - `gradebook-01d-r3.ataque.test.tsx` CAL-T-244 (`:582-627`): desmonta con la frase a la vista y después cuenta, así que suma una marca por (b). Es C-19.
      - `secciones-01d-r4.ataque.test.tsx` CAL-T-258 (`:389-408`): la primera pulsación es con la frase (una marca) y la segunda con la tabla sana (ninguna). Es C-20.
    - **No cambian:**
      - en `gradebook-01d.test.tsx`: CAL-1D02ac (`:1222`, sin pulsar ni desmontar; su `isInvalidated` de la ventana a la vista sigue falso), CAL-1D02ad (`:1253`, sin pulsar ni desmontar) y CAL-1D03e (`:1361`, tabla sana: con esta forma, cero marcas, como hoy);
      - en `gradebook-01d-r3.ataque.test.tsx`: CAL-T-232, CAL-T-234 y CAL-T-246, que cuentan antes de su `unmount`; CAL-T-233, CAL-T-235, CAL-T-240 y CAL-T-241, que ni pulsan ni desmontan; CAL-T-242, que desmonta sin la frase (la ventana rota sigue en vuelo, sin ocurrencia); y CAL-T-248, que es C-8 y no cuenta marcas;
      - CAL-T-201 (`gradebook-01d-r2.ataque.test.tsx`), que no cuenta marcas y no pulsa ni desmonta;
      - `exportar-02b.test.tsx:757`, que lee `isInvalidated` sin pulsar ni desmontar el gradebook con la frase;
      - las `invalidateQueries` con `refetchType` de `app/estado-por-id-ch6a-r1` y `-r2`, `editar-recurso-03d`, `ver-mas-y-orden-ch4` y `recargas-ch6`, que son preparación de cada prueba y no cuentan las marcas del gradebook;
      - los `isInvalidated` de `features/tareas` (calificar), que miran la invalidación de calificar, no la vista.
    - **Lo comprueba la corrida del programador:** con (a) siempre, las únicas fallas fueron CAL-1D03d ×4, CAL-1D03e, CAL-T-244 y CAL-T-258. La forma elegida suma menos marcas, así que no puede sumar fallas nuevas, y CAL-1D03e vuelve a verde.
- **Fila "ADMIN-01d2: la barra lateral y las listas del inicio siguen trayendo una clase…"** (`features/clases/hooks.ts:427-443`). En `useClaseArchivadaEnSuLista`, con `archivada` verdadero, antes de la lógica de "Clases anteriores" (que no cambia): (Enmienda 1, N-03) solo si alguna consulta en caché bajo `CLAVE_CLASES_INSCRITAS` o `CLAVE_CLASES_IMPARTIDAS` (los inicios por páginas y la barra, que cuelga de esas claves, `services/clasesService.ts:27-54`) trae esa clase, se invalidan las dos claves (sin `exact`). Si ninguna la trae (el maestro que abre una clase desde "Clases archivadas", la sesión del admin), no se pide nada. Para saberlo, una función pura nueva en `features/clases/lib.ts`, `listaTraeLaClase(dato: unknown, claseId: string): boolean`, que reconoce sin `as` las dos formas de esas consultas (páginas con `clases` y la página única de la barra) y devuelve falso ante cualquier otra; el gancho la aplica a `queryClient.getQueriesData` de cada clave. El efecto corre una vez por clase (`[queryClient, claseId, archivada]`). (`lib.ts` ya está en 06b; el conteo no cambia.)
  - **(Enmienda 4, P-2) El mecanismo, que reemplaza "se invalidan las dos claves".**
    - *Por qué la forma anterior no bastaba.* El efecto corre más de una vez por clase leída archivada: el de `ClaseLayout` y, tras el `Navigate` del alumno, el de `ClaseAnteriorView`; o el del maestro al volver a A con el historial. El inicio que está en caché sin montarse queda inválido después de la primera invalidación, pero conserva la clase en sus datos hasta que se vuelva a pedir. Con "si alguna la trae, se invalidan las dos claves", la segunda corrida lo encuentra, invalida todo y vuelve a pedir la barra, que está activa y ya no traía la clase (`recargas-ch6.test.tsx:1141`: 3 peticiones donde se esperan 2).
    - *El mecanismo correcto.* Por cada clave (`CLAVE_CLASES_INSCRITAS`, `CLAVE_CLASES_IMPARTIDAS`):
      `void queryClient.invalidateQueries({ queryKey: lista, predicate: (consulta) => listaTraeLaClase(consulta.state.data, claseId) }, { cancelRefetch: false })`
      Así se invalidan solo las consultas que todavía traen la clase. La comprobación previa con `getQueriesData` (`laTraen`) puede quedarse o quitarse: el `predicate` ya decide. El programador dice cuál deja.
    - *Lo que comprobé en 5.103.2.*
      - `invalidateQueries` marca inválidas todas las consultas que pasan el filtro, activas o no (`queryClient.js:297-301`).
      - Después llama a `refetchQueries` con el mismo filtro y `type: "active"` (`:303-306`). El filtro vuelve a evaluar el `predicate` (`utils.js:40-47`), así que solo pide las activas que todavía traen la clase.
      - Una consulta inactiva (el inicio sin montarse) queda con `isInvalidated: true` y conserva sus datos. Al montarse el inicio, `isStaleByTime` da viejo por `isInvalidated` (`query.js:214-218`) y se pide; la respuesta ya no trae la clase y `success` quita la marca (`:497-505`).
      - En una segunda corrida del efecto, el inicio coincide otra vez, pero `invalidate()` no hace nada si ya está inválido (`query.js:284-286`) y no se pide porque no está activo. La barra ya no coincide si su petición terminó.
      - Si su petición sigue en vuelo, todavía trae la clase y coincide, y `{ cancelRefetch: false }` une la segunda llamada a esa petición en lugar de cancelarla y repetirla (`query.js:298-303`).
    - *`{ cancelRefetch: false }` queda en el plan:* deja de ser una desviación del programador. Es PR-3 aplicada aquí.
- (Enmienda 3) **Con el salto del historial:**
  - **`useClaseArchivadaEnSuLista`.** Vive en `ClaseLayout`, que sobrevive al cambio de clase, y en la vista de una clase anterior. No guarda refs. Su efecto vuelve a correr con cada clase, así que saltar de A (archivada) a B y regresar a A lo corre otra vez para A. (Enmienda 4, P-2: corrige la frase de la Enmienda 3, que atribuía esto a `listaTraeLaClase`.) Que la barra no se pida de nuevo se debe a dos cosas: solo se invalidan las consultas que todavía traen la clase (el `predicate`) y una consulta inactiva invalidada no se pide hasta que se monta. Con el inicio del maestro en caché, su segunda corrida solo vuelve a encontrar el inicio, que no está activo: ninguna petición. CH6-B15 suma ese camino, con el inicio en caché.
  - **El gradebook.** Se monta de nuevo por clase (`key={claseId}`, 06a). La limpieza de (b) marca las ventanas de la clase de su cierre: saltar de A, con la frase a la vista, a B marca las de A y no toca las de B (CH6-B14 (d)).

### §D-7 · Avisos, recargas y la matriz del resumen

El primer resumen de cada subentrega trae la matriz (`AGENTS.md`, "Matriz de avisos y recargas"):
- **06a:** por cada sitio de §D-1 y cada clase de respuesta del id anterior (éxito, `409`, `5xx`, red, `400 VALIDACION`, `401` sin refresco, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`) que llega estando en el id nuevo, con la vista desmontada y al volver: qué se renueva, qué se anuncia (un solo aviso), a dónde va el foco y si algo navega o se reinicia. Por cada gancho de §D-3: qué avisa ante cada código.
- **06b:** por cada lista de §D-4 y §D-5 y cada disparador (pulsar la sección con la consulta sana fresca, sana vieja, en error, en error y pidiendo; salir y volver antes y después de 30 s; «Ver más» con `5xx`, red, `400` del cursor, `403 SIN_ACCESO_A_LA_CLASE`, `401` sin refresco, `404` de la publicación o de la duda; dos fallos seguidos; página en vuelo con una recarga de fondo): qué se pide (cuántas peticiones y con qué cursor), qué se anuncia, qué se ve y a dónde va el foco, en los estados "en vuelo a la vez" y "con la vista desmontada".
- **06b, disparadores que suma la Enmienda 3 (DH-10 y PR-2):**
  - el salto del historial a otra clase en las cuatro listas que sobreviven (Avisos, Dudas, los dos bloques de Recursos y Actividades), con B sana y fresca, vieja, en error (Enmienda 3b: un solo estado, porque toda consulta en error está vieja) y pidiendo;
  - el mismo salto con la renovación de A todavía en vuelo, que después responde bien o falla;
  - volver a A después de ese fallo;
  - salir de cualquiera de las 12 listas con una recarga o una página en vuelo que falla después, y volver antes de los 30 s (Enmienda 3b: en el tema de Actividades, que consume `signal`, la página se aborta y no falla).

  En cada uno: cuántas peticiones salen y de qué clase, qué aviso o mensaje sale y de qué clase (nunca de A en B), y dónde queda el foco antes y después de la respuesta.
- **06b, disparador que suma la Enmienda 3b (M-02):** la recarga que recupera una lista conservada tras un «Ver más» fallido, por cada camino: pulsar la sección, volver de otra sección, el salto de DH-10, el regreso a A de CH6-B18 (a) y una invalidación por una mutación (comentar). Para cada uno: qué se ve mientras vuela (la lista y «Ver más» en espera, sin `role="alert"`), qué se anuncia (nada), dónde queda el foco (donde estaba) y qué pasa si esa recarga falla (reemplaza, sin aviso) o responde bien.

El manager la contrasta con el código antes de que el tester ataque.

## Cambios por capa

### shared/
Sin cambios.

### backend/core/
Sin cambios.

### backend/adapters/
Sin cambios.

### backend/handlers/
Sin cambios. No hay endpoint nuevo.

### backend/workers/
Sin cambios.

### backend/prisma/
Sin migración.

### infra/ y .env.example
Sin cambios.

### frontend/
- **06a:** §D-1 (Formas A, B y C), §D-3 (con los sitios de M-02 de la Enmienda 1) y la regla estática CH6-A30. Archivos en §D-0.
- **06b:** §D-4 (`components/seccion/hooks.ts` y `types.ts`, la reexportación de `features/admin/hooks.ts` y las 12 listas), §D-5 (`conservaLaListaTrasLaPagina` en `features/clases/lib.ts`, las 9 listas y `useRenovarSiLaPublicacionYaNoEsta`) y §D-6 (`useMarcarViejasLasVentanas` y `useClaseArchivadaEnSuLista`). Archivos en §D-0.
- Sin componentes de `components/ui/`, sin tokens, sin textos nuevos.

## Acceso a datos

No hay consultas nuevas en el servidor. En el cliente:
- §D-1 no agrega peticiones: el marco y el contenido de la Forma C observan la misma consulta (misma clave, una petición).
- PR-1 agrega, como máximo, una petición por pulsación y por consulta de la vista, solo si está en error o vieja, y nunca con otra en vuelo. Una consulta por páginas vuelve a pedir tantas páginas como tenía cargadas, desde la primera (como el `refetch` de hoy en las siete vistas de H-2).
- PR-2 no pide nada al salir; pide al volver, solo si la consulta quedó en error.
- §D-6 marca viejas las ventanas del gradebook sin pedirlas y pide la barra lateral una vez por clase archivada leída.

## Autorización

No cambia. Las `key`, los avisos y las recargas son de interfaz: la cadena de middleware sigue decidiendo quién quita, borra, califica o edita, y en qué clase.

## Se toca y no se toca

Base: `47c3339` para 06a; el commit de 06a para 06b (`AGENTS.md`, "Commits y cierre de subentregas"). (Enmienda 3) Dentro de los paquetes, la base de 06b es `023b450`. Fuera de los paquetes sigue siendo `47c3339`, y `docs/trabajo/` y `docs/ESTADO.md` quedan fuera de la verificación.

**06a · Se toca (programador).** Rutas relativas a `frontend/src/`.
- Producción (25; Enmienda 1): los de la columna 06a de §D-0. En los seis de M-02 (`formulario-clase.tsx`, `formulario-publicacion.tsx`, `formulario-recurso.tsx`, `features/tareas/hooks.ts`, `formulario-tarea.tsx`, `formulario-de-entrega.tsx`), solo las líneas de §D-3.
- Pruebas nuevas (4): `app/estado-por-id-ch6.test.tsx`, `features/clases/avisos-al-redirigir-ch6.test.tsx`, `features/tareas/avisos-al-redirigir-ch6.test.tsx`, `lib/estado-por-id-estatico-ch6.test.ts`.
- Lista cerrada (1): `features/clases/guardas-ch4.test.tsx`, solo en lo que dice la lista.
- `docs/trabajo/CHORE-06-foco-y-navegacion/` (su resumen).

**06a · Se toca (tester, ronda 0).** C-1 y C-2 de §D-R0.

**06b · Se toca (programador).**
- Producción (19): los de la columna 06b de §D-0.
- Pruebas nuevas (4): `components/seccion/recargas-ch6.test.tsx`, `features/clases/recargas-ch6.test.tsx`, `features/clases/ver-mas-ch6.test.tsx`, `features/calificaciones/gradebook-ch6.test.tsx`.
- Lista cerrada (2, más una condicional): `features/clases/ver-mas-y-orden-ch4.test.tsx` y `features/clases/personas-view.test.tsx`; y `features/clases/muro-view.test.tsx` solo si cae (Enmienda 1, M-03); solo en lo que dice la lista. (Enmienda 3) Son 3 con `features/clases/publicacion-del-muro.test.tsx`, más la condicional. (Enmienda 4) Son 4 con `features/calificaciones/gradebook-01d.test.tsx` (CAL-1D03d, entrada 6 de la lista).
- `docs/trabajo/CHORE-06-foco-y-navegacion/`.

**06b · Se toca (tester, ronda 0).** C-3 a C-9 de §D-R0, y C-10 solo si su condición se cumple. (Enmienda 3) También C-13, C-15, C-16, C-17 y C-18, y C-14 solo si su condición se cumple. (Enmienda 4) También C-19 y C-20, que el tester aplica antes de que el programador reanude.

**06b · No se toca, además (Enmienda 3).**
- Las pruebas de 06a. Las normales (`app/estado-por-id-ch6.test.tsx`, `features/clases/avisos-al-redirigir-ch6.test.tsx`, `features/tareas/avisos-al-redirigir-ch6.test.tsx`, `lib/estado-por-id-estatico-ch6.test.ts`) quedan fuera de la lista cerrada. Los tres `app/estado-por-id-ch6a-r*.ataque.test.tsx` quedan fuera de §D-R0, salvo C-14.
- En las cuatro listas que sobreviven al cambio de clase y en las vistas de tarea, entrega y recurso, nada de lo que fija CH6-A30: las `key` de los formularios, `creandoEn !== claseId`, las `key` de las secciones, `key={tarea.id}`, `key={tareaId}`, `key={recursoId}`, la `key` compuesta y `<ListaDeEntregasDeLaTarea key={tareaId}`. Tampoco la línea de H-R2 en `enfocarPublicacion` y `enfocarDuda`, ni la clave de los cinco llamadores de `useAvisoDeRecargaFallida`.

**No se toca (las dos).** Todo lo demás; en particular:
- `features/clases/clase-layout.tsx`, `components/clase/` (`con-clase-de-la-ruta.tsx`, `hooks.ts`, `lib.ts`, `contexto-de-solo-lectura.ts`), `components/foco/`, `components/layout/`, `components/ui/`, `components/adjuntos/` (incluida la descarga de `adjuntos-de-publicacion.tsx`, fuera por DH-04), `components/mensaje-error.tsx`;
- `services/` (en especial `apiClient.ts` y `navegacion.ts`), `app/` de producción (`router.tsx`, `providers.tsx`), `lib/` de producción (`errores-de-api.ts`, `unir-paginas.ts`);
- en `features/clases/hooks.ts`: en 06a, todo salvo las líneas de §D-3; en 06b, todo salvo `useRenovarSiLaPublicacionYaNoEsta` (nuevo), las dos guardas de `fetchStatus` y `useClaseArchivadaEnSuLista` (§D-4 a §D-6). Tampoco cuentan como "No se toca", por las Enmiendas 3b a 5: `useListaConservadaTrasLaPagina` y su `WeakMap` de módulo, y `renovarLasListasSiTraenLaClase`. Ningún gancho de mutación gana `mutationKey`;
- `features/clases/components/` fuera de los de §D-0 (en especial `lista-maestros-de-clase.tsx`, `panel-mis-clases.tsx`, `bloque-destacado.tsx`, `codigo-de-clase.tsx`, `aviso-de-clase-archivada.tsx`, `elemento-de-*.tsx`, y los `formulario-*.tsx` que no son `formulario-unirse-clase.tsx`, `formulario-clase.tsx`, `formulario-publicacion.tsx` ni `formulario-recurso.tsx`; Enmienda 1);
- `features/tareas/` fuera de los siete de 06a (Enmienda 1): `lib.ts`, `data.ts`, `types.ts`, `entregas-view.tsx` y `components/` salvo `formulario-tarea.tsx` y `formulario-de-entrega.tsx`; en `hooks.ts`, todo salvo las líneas de §D-3; `features/calificaciones/` fuera de los de §D-0; `features/admin/` salvo, en 06b, quitar las dos definiciones y la reexportación de §D-4; `features/auth/`, `features/diagnostico/`;
- todo `*.ataque.test.*` salvo los C-n de §D-R0; toda prueba normal fuera de la lista cerrada;
- `package.json`, `package-lock.json`, `shared/`, `backend/`, `infra/`;
- `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE*.md`, `docs/ESTADO.md` (los cambia el orquestador al cierre, A-1 a A-4).

## Lista cerrada de pruebas normales que el programador puede cambiar

Grep del arquitecto en `47c3339`, por los criterios de `AGENTS.md` (firmas que cambian, dobles de tipos que cambian, textos que cambian) más los de ADMIN-01 (tamaños exactos, filtros de peticiones y conteos al montar) y la conducta que cambia de sentido.

**06a.**
1. **Firmas.** Ninguna función exportada cambia de firma. `useAvisoDeRecargaFallida` conserva la suya (§D-3). Las funciones nuevas de la Forma C (`EdicionDeLaTarea`, `EdicionDelRecurso`, `EntregaDeUnAlumno`) no se exportan. `rg "EditarTareaDeLaClase|EditarRecursoDeLaClase|EntregaDelAlumno|MaestrosDeLaClase|AlumnosDeLaClase" src -g "*.test.*"` no da ninguna importación (las pruebas montan las vistas exportadas por la ruta).
2. **Dobles.** `rg "vi.mock\(.*(clases|tareas|calificaciones)/hooks" src -g "*.test.*"` solo da `features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` e `inicio-sin-datos-r2.ataque.test.tsx`, que no pintan ninguna vista de §D-1 ni ganchos de §D-3: sin cambio.
3. **Conducta que cambia de sentido** (avisos ante un código que redirige; `rg "ACCESO_RESTRINGIDO|NO_AUTENTICADO|CAMBIO_DE_CONTRASENA_REQUERIDO" src/features/clases -g "*.test.*"`):
   - **`features/clases/guardas-ch4.test.tsx`**: `:388`, `const avisoDeClases = (error: ApiError) => mensajeDeErrorClases(error)` pasa a `const avisoDeClases = (error: ApiError) => (REDIRIGEN.includes(error.codigo) ? null : mensajeDeErrorClases(error))` (`REDIRIGEN` ya está en `:389`; se lee al llamar, no al declarar). En el título de CH4-25 (`:733`), "el aviso de hoy (ninguno en «Sí, regenerar», uno en los demás)" pasa a "ningún aviso (apiClient redirige; CHORE-06a)". Nada más cambia: CH4-21 y CH4-24 usan `avisoDeError` con un `500` y siguen igual.
   - Sin cambio (ya afirman "ningún aviso" o no tocan los ganchos de §D-3): `formularios-03c2.test.tsx:413`, `clase-archivada-01d1-vista.test.tsx:1929`, `clases-admin-01c.test.tsx`, `recursos-03d.test.tsx`, `dudas-03e*.test.tsx`.
   - (Enmienda 1, M-02) **`features/tareas`**: `rg "ACCESO_RESTRINGIDO|NO_AUTENTICADO|CAMBIO_DE_CONTRASENA_REQUERIDO" src/features/tareas -g "*.test.*"`. Ninguna prueba normal afirma hoy un aviso ante un código que redirige en los sitios de §D-3: `calificar-01c.test.tsx:840` (CAL-1C06, "no hay aviso ni recarga") ya afirma el silencio; `entregas-01e.test.tsx:883` y `entregas-01d.test.tsx:1059` son de la descarga y de «Ver más comentarios», que ya callan. Sin cambio.
   - (Enmienda 1, M-02) **Las subidas y crear o editar clase**: `rg "avisoDeFalloAlSubir|errorRechazado|alFallar" src -g "*.test.*"` no da ninguna prueba que pida el aviso de la subida o de `alFallar` ante uno de los tres códigos. Sin cambio.
4. **Textos.** Ninguno.

**06b.**
1. **Firmas.** `useAlPulsarLaSeccionActiva` no cambia. `useMarcarViejaSiQuedoEnError` se mueve sin cambiar de firma y `features/admin/hooks.ts` lo reexporta: `rg "useMarcarViejaSiQuedoEnError" src -g "*.test.*"` da solo importaciones desde `features/admin/hooks` o la vista: sin cambio.
2. **Dobles.** Ningún doble de `UseQueryResult` de las 12 listas: las pruebas montan con `fetch` doblado. Los dos `inicio-sin-datos*.ataque` doblan `useClasesInscritas` sin `isFetchNextPageError` ni `isStale`: con `hasNextPage: false` y sin error, `conservaLaListaTrasLaPagina` recibe `undefined` en `isFetchNextPageError` (falso) y nada cambia; están en §D-R0 como vigiladas (PA-2 si fallan).
3. **Conducta que cambia de sentido** (el fallo de la página siguiente; `rg "página siguiente|Ver más.*(falla|500|red)" src -g "*.test.*"`):
   - **`features/clases/ver-mas-y-orden-ch4.test.tsx`**, CH4-30 (c) y CH4-31 (c) (Enmienda 4 de CHORE-04, "afirman la conducta de hoy"): pasan a afirmar §D-5: salen las dos peticiones de la página (`retry: 1`) y ninguna más; la lista se queda con sus filas; un solo aviso con `mensajeDeConsultaClases(error)`; «Ver más comentarios» o «Ver más clases» sigue a la vista y fuera de espera; en los inicios, sin `MensajeError` del panel y sin el error en el título del bloque destacado. El título de cada caso cambia en ese sentido.
   - **`features/clases/personas-view.test.tsx:263`** (T-27, ronda 5): "si la consulta de la página siguiente falla, el foco queda en el encabezado «Alumnos»" pasa a "…la lista se queda, un solo aviso y el foco se queda en «Ver más alumnos»"; la aserción del foco cambia de encabezado a botón.
   - (Enmienda 1, M-03) **Pulsar la sección y contar peticiones con DH-03 (b).** Grep: `rg -l "location\.key|estando ahí|estando en (ella|él)|sección activa" src -g "*.test.*"` y, en cada archivo que pulsa una sección de `features/clases` y cuenta peticiones, el `staleTime` de su cliente. Con el de `providers.tsx` (30 s) y sin adelantar el reloj más de 30 s, una lista sana sigue fresca y nada cambia. La lista de Avisos usa su propio `staleTime` (`usePublicaciones`, `features/clases/hooks.ts:1023-1027`: 240 s, o menos si una vista previa firmada vence antes), que no depende del cliente.
     - **Condicional · `features/clases/muro-view.test.tsx:344`** (PR-C18, "con el muro sano, pulsar «Muro» no vuelve a pedir nada"; cliente de `:301` sin `staleTime`). Debería seguir en verde por el `staleTime` propio de Avisos (sus publicaciones no traen adjuntos). **Solo si cae**, el programador la cambia así: el cliente de `renderConEnlaceMuro` (`:301`) suma `staleTime: 30_000` a `queries`, y el título y la aserción no cambian. Conserva la intención ("sana y fresca no pide") y lo declara en el resumen con la salida de la falla.
     - Vigiladas en lo normal (siguen en verde; PA-1 si caen): `app/clase-03c1.test.tsx:493` (CL3-C12) y `:526` (CL3-C13), `recursos-caminos-03d.test.tsx:517` (CL3-D23) y `:713` (CL3-D27), `dudas-caminos-03e.test.tsx:333` (CL3-E09) y `:411` (CL3-E10), `dudas-03e.test.tsx:1575` (M-01 (b): las respuestas no se piden porque su bloque no está en `pedir`), `guardas-ch4.test.tsx:631` (CH4-22, cuenta la mutación) y `ver-mas-y-orden-ch4.test.tsx:771` (cuenta los `PUT`), todas con `Providers` o 30 s.
4. **Textos.** Ninguno.
5. **(Enmienda 3) Grep contra `023b450`.**
   - **Firmas.**
     - `useAvisoDeRecargaFallida` de clases tiene la firma de 06a (`clave` antes de `idDelAviso`), y 06b la llama en 9 sitios más. `rg "useAvisoDeRecargaFallida" src -g "*.test.*"` da `features/tareas/formularios-ch3.test.tsx:28` y `:613`, que es el gancho de `features/tareas` (no cambia), y comentarios de las pruebas de 06a. No cambia ninguna prueba.
     - `useMarcarViejaSiQuedoEnError` se mueve sin cambio de firma (Enmienda 3b: se retira el parámetro opcional de la Enmienda 3). Ninguna prueba lo llama (`rg` vacío), así que no cambia nada.
     - (Enmienda 3b) `useListaConservadaTrasLaPagina` es nuevo y vive en `features/clases/hooks.ts`. Lo dobla solo la fábrica de C-15 y C-16.
     - `useRenovarSiLaPublicacionYaNoEsta` es nuevo.
   - **Línea de M-03.** El `staleTime` propio de Avisos está ahora en `features/clases/hooks.ts:1027-1031`. PR-C18 (`muro-view.test.tsx:344`, cliente de `:301`) no se movió.
   - **Conducta que cambia de sentido, nueva:**
     - **`features/clases/publicacion-del-muro.test.tsx`.** `renderPublicacion` (`:84-97`) pinta `PublicacionDelMuro` sin router. Con 06b, `ComentariosDePublicacion` llama a `useRecargarAlPulsarLaSeccion` (`useLocation`), y lanza en cuanto un caso abre los comentarios (10 llamadas a `abrirComentarios`; Enmienda 3b). Cambio: dentro del `QueryClientProvider`, `<PublicacionDelMuro … />` va envuelto en `<MemoryRouter>` (importado de `react-router`). Nada más cambia: ningún título ni ninguna aserción. `adjuntos-de-publicacion.test.tsx` también lo pinta sin router (`:213`, `:230`), pero no abre los comentarios. Queda vigilada; si cae, es PA-1.
     - **`features/clases/personas-view.test.tsx:263-277`** (completa lo de la viñeta 3). Además del foco, `:274` (`expect(await screen.findByRole("alert")).toBeInTheDocument()`) pasa a: el aviso se llama una vez, con `vi.spyOn(toast, "error")` de `sonner` (el archivo no lo dobla; el espía se restaura al final del caso); ningún `role="alert"`; «Ver más alumnos» sigue a la vista y fuera de espera; `:275` pasa a esperar el foco en ese botón; `:276` no cambia.
   - **Pruebas de 06a que 06b podría romper: ninguna normal.**
     - `app/estado-por-id-ch6.test.tsx`: CH6-A11 (`:1279`, cuenta los GET de B tras el salto), CH6-A20, CH6-A21, CH6-A22 y CH6-A11 (regresión O-14) saltan entre dos clases con la lista de destino sana y recién pedida. Con DH-10, PR-1 bis no pide nada (fresca: Avisos 240 s; los temas, menos de 30 s). En CH6-A21, B sale en error y la librería la deja inválida (Enmienda 4: antes decía "PR-2 la marca"). Al volver, la pide el cambio de clave y responde bien (`temasQueFallan` ya es `null`), así que sigue en un aviso. CH6-A12 no se dispara: el gradebook se monta de nuevo.
     - `features/clases/avisos-al-redirigir-ch6.test.tsx` (CH6-A16) invalida `["clases", A]` sin navegar. `features/tareas/avisos-al-redirigir-ch6.test.tsx` no toca `features/clases`. `lib/estado-por-id-estatico-ch6.test.ts` solo exige textos que 06b no toca ("No se toca, además").
     - Las cuatro quedan **vigiladas**; si alguna cae, es PA-1.
6. **(Enmienda 4, P-1) `features/calificaciones/gradebook-01d.test.tsx`, CAL-1D03d** (`:1330-1359`; el archivo no cambió ni en 06a ni en 06b, así que las líneas son las de `023b450` y las del árbol).
   - **Título (`:1331`).** "…sin aviso, sin aria-busy ni otra marca, y el foco se queda en la sección" pasa a "…sin aviso, sin aria-busy, con una sola marca más (la de N-52: la ventana a la vista queda vieja; CHORE-06b) y el foco se queda en la sección".
   - **`:1355`.** `expect(marcasViejas(espia)).toHaveLength(marcas)` pasa a `expect(marcasViejas(espia)).toHaveLength(marcas + 1)`.
   - **Línea nueva después de `:1355`, para que la marca sea la de N-52.** `expect(cliente.getQueryCache().find({ queryKey: claveGradebook(CLASE_ID, DESTINOS[caso.pulsar].destino), exact: true })?.state.isInvalidated).toBe(true)`.
     - Es la ventana rota o vacía que se veía, ya marcada. `DESTINOS` (`:671`) tiene las dos claves que usa `caso.pulsar` (`:1117`).
     - En las filas de 400, esa ventana ya está inválida por la librería, porque está en error. Las que prueban N-52 son las dos filas de la ventana vacía.
   - Nada más cambia: la única petición, la primera ventana, el texto que se va, los botones de ventana, `aria-busy`, el foco y ningún aviso.
   - **Sigue protegiendo T-08:** pulsar pide una sola vez, sin bucle ni marcas de más. La única marca nueva es la que N-52 exige.
   - CAL-1D03e (`:1361-1388`) **no cambia:** con la tabla sana no hay marca.

Cualquier otra prueba normal que falle es PA-1.

## §D-R0 · Pruebas `*.ataque` que el cambio obliga a tocar (C-n del tester, ronda 0)

**06a.**
- **C-1 · `features/clases/guardas-ch4-r1.ataque.test.tsx:385`.** `avisoDeClases` igual que en la lista cerrada: `REDIRIGEN.includes(error.codigo) ? null : mensajeDeErrorClases(error)`. ATQ-CH4-10 (`:571-600`) ya admite `esperado === null` para su fila de `403 CAMBIO_DE_CONTRASENA_REQUERIDO`. Sigue protegiendo lo mismo: la ref libre y una sola petición después del error.
- **C-2 · `features/clases/alumnos-b-r1.ataque.test.tsx:416-443`** ("N-04 con ACCESO_RESTRINGIDO al unirse"): el título de `:417`, "redirige con apiClient, avisa una sola vez y no marca el campo", pasa a "redirige con apiClient, no avisa y no marca el campo"; `:441` (`toHaveBeenCalledTimes(1)` de `aviso.error`) pasa a afirmar, después de esperar a `irA` y un momento más, que `aviso.error` no se llamó. `:440`, `:442` y `:443` no cambian: sigue protegiendo una sola redirección a `/acceso-restringido` y el campo sin marcar.
- **Vigiladas, sin cambio** (siguen en verde con el plan; si alguna falla, PA-2): `guardas-ch4-r1.ataque.test.tsx` ATQ-CH4-15 y ATQ-CH4-16 (`:820-890`: abren la confirmación de B si no llegó abierta, así que valen con la `key`); `clases-r1.ataque`, `clases-r2.ataque` y `clase-archivada-01d1-r*.ataque` («Sí, regenerar» no cambia); `foco-02c-r3/r4/r5.ataque`, `heredados-02d-r1.ataque`, `ventana-02c-r2.ataque` (O-14: las filas siguen yendo al `h2`); `calificar-01c-r*.ataque` y `entregas-01e-r1.ataque` (el panel y el hilo con la Forma C); `calificaciones/secciones-01d-r3.ataque` (CAL-T-231); `clases-admin-02c-r1.ataque`; `alumnos-b-r3.ataque:48`; `recursos-03d-r1.ataque` (sus `401` ya no avisaban). (Enmienda 1, M-02) En `features/tareas`: `entregas-01d-r3.ataque.test.tsx:586-612` (entregar y comentar con la sesión perdida: "como mucho un aviso", así que vale con cero), `entregas-01d-r2.ataque.test.tsx:661-674` (no cuenta avisos), `entregas-01d-r1.ataque.test.tsx:325`, `entregas-01e-r1.ataque.test.tsx:379` y `entregas-01e-r2.ataque.test.tsx:254` y `:478` (refresco rechazado en consultas que ya callan). Y `services/apiClient-ch3-r1.ataque.test.ts:83-88`: la lista de importadores de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` no cambia (por eso la descarga de `components/adjuntos` queda fuera).

**06b.**
- **C-3 · `features/clases/ver-mas-y-orden-ch4-r1.ataque.test.tsx`**, ATQ-CH4-20 (`:421-440`) y ATQ-CH4-22 (`:499-526`): como CH4-30 (c) y CH4-31 (c) de la lista cerrada. ATQ-CH4-21 y ATQ-CH4-23 (la recarga gana) no cambian.
- **C-4 · `features/clases/alumnos-b-r4.ataque.test.tsx:345` y `:355`** ("si la consulta de la página siguiente falla, el foco va al encabezado" en el roster y en Personas): el foco se queda en «Ver más alumnos», con la lista y un solo aviso.
- **C-5 · `features/clases/foco-02c-r3.ataque.test.tsx:376`** («Ver más avisos» que falla: "con el foco en el botón, va al encabezado; si la persona se fue al campo del anuncio, se queda ahí"): con el foco en el botón, se queda en el botón; la segunda mitad no cambia.
- **C-6 · `features/clases/foco-pestana-02d-r3.ataque.test.tsx:257`** (Personas: la página siguiente falla con la pestaña oculta): el foco se queda en «Ver más alumnos».
- **C-7 · `features/clases/muro-c-r1.ataque.test.tsx:803` y `:815`** (la página siguiente del muro y la de comentarios fallan: el foco no cae en `<body>`): siguen pidiendo "no cae en `<body>`"; el tester decide si basta (el foco se queda en el botón) o los reescribe para afirmarlo.
- **C-8 · `features/calificaciones/gradebook-01d-r3.ataque.test.tsx:723`** (CAL-T-248, "evidencia N-52", verde a propósito): cambia de sentido, como dice la fila 446: tras pulsar la sección o salir y volver con la frase a la vista, «Alumnos siguientes» pide la ventana y no la sirve de la caché.
- **C-9 (Enmienda 1, M-03) · `features/clases/ordenar-03c2-r2.ataque.test.tsx:463-477`** (CL3-2R2-10: "tras escribir el orden sobre una recarga fallida, pulsar «Actividades de aprendizaje» estando ahí no pide nada y ninguna frase de la vista promete esa acción"; cliente de `:131-132` con la configuración de `providers.tsx`). Es O-03 y cambia de sentido por DH-03 (b): la lista quedó marcada vieja. El título pasa a "…pulsar «Actividades de aprendizaje» estando ahí pide la lista de temas de la sección una vez y ninguna frase de la vista promete esa acción"; `:474` (`expect(servidor.getsDeSeccion()).toBe(antes)`) pasa a esperar `antes + 1` (con `waitFor`) y después de `reposar(200)` sigue en `antes + 1` (una sola petición); `:475` y `:476` no cambian (sin frases de recuperación; el orden escrito se ve). Conserva la intención del ataque (lo vigila una sola petición y ninguna promesa en la vista); la conducta que fija es la de CH6-B08.
- **C-10 (Enmienda 1, M-03; condicional) · `app/muro-recuperar-c-r4.ataque.test.tsx:208-229`** ("…con el muro ya sano, «Avisos» no pide nada…"; cliente de `:156` sin `staleTime`). Debería seguir en verde por el `staleTime` propio de Avisos (240 s). **Solo si cae** en la corrida del programador con PR-1 aplicado: el programador se detiene (PA-2) y el tester aplica esta reescritura, ya redactada aquí, sin otra enmienda: el cliente de `:156` suma `staleTime: 30_000`; la aserción de `:223` ("«Avisos» con la lista sana", 2) no cambia. Conserva la intención: con la lista sana y fresca, pulsar no pide.
- **Vigiladas, sin cambio:** `app/personas-03c1-r2.ataque.test.tsx:357` (CL3-R2-11: la página y la recarga fallan las dos; la recarga reemplaza, un solo error, foco al encabezado); `recursos-03d-r1.ataque` CL3-3R1-09 a 11 y `recursos-caminos-03d.test.tsx` (Recursos ya conservaba); `dudas-caminos-03e.test.tsx`, `recuperar-ch3*.test.tsx`, `consultas-ch3.test.tsx` (frases del cursor y caminos con `refetch`, que sigue siendo `refetch`); `gradebook-01d-r2.ataque.test.tsx:286` (CAL-T-201); `clases-admin-01c*.test.tsx` y `clase-archivada-01d2-vista.test.tsx:967` (ADM-1D204 (d)); `ver-mas-01e-r3.ataque.test.tsx:194` (una recarga en segundo plano que falla sigue quitando el botón: DH-02 (a) no cambia las recargas); `inicio-sin-datos*.ataque`; `components/seccion/hooks.test.tsx`. (Enmienda 1, M-03) Con DH-03 (b), y por el criterio de la lista cerrada (`Providers` o 30 s, o el `staleTime` propio de Avisos): `app/muro-recuperar-c-r3.ataque.test.tsx:211-222` (pulsar «Avisos» con el muro en error recupera la lista), `app/personas-03c1-r1.ataque.test.tsx:570` (CL3-R1-21), `ordenar-03c2-r1.ataque.test.tsx:448`, `recuperar-ch3-r1.ataque.test.tsx:199` (cuenta los `POST`) y `ordenar-03c2-r2.ataque.test.tsx` CL3-2R2-11 (`:481`).

**06b, Enmienda 3** (grep contra `023b450`; las líneas son de ese commit).
- **Precisiones a C-3 a C-7.** Esas pruebas esperan el `MensajeError`, y con §D-5 ya no aparece ante la red o un `5xx`: en su lugar sale un aviso. La reescritura cambia esa espera, no solo el foco.
  - **C-3:** de `FALLAS` (`:388-391`) solo cambia la fila "red". La del `400` de cursor sigue reemplazando con su frase, y su caso no cambia.
  - **C-4:** `alumnos-b-r4.ataque.test.tsx`. Las esperas de que la lista se vacíe (`:351` y `:361`) pasan a esperar `aviso.error` una vez con la lista a la vista. `:352` pasa a esperar el foco en «Ver más alumnos». `:363` y `:364` no cambian.
  - **C-5:** `foco-02c-r3.ataque.test.tsx`. `:386` y `:397` (`findByText(GENERICO)`) pasan a esperar `aviso.error` con `GENERICO`. `:388` pasa a esperar el foco en «Ver más avisos». `:399` no cambia.
  - **C-6:** `foco-pestana-02d-r3.ataque.test.tsx`. `:267` (`findByRole("alert")`) pasa a esperar el `toast.error` doblado, que se lee con `vi.mocked(toast.error)` importando `toast` de `sonner`. `:270` pasa al botón «Ver más alumnos». (Enmienda 3b, N-03) Los avisos se cuentan desde el inicio del caso: `vi.mocked(toast.error).mockClear()` al empezarlo, porque `vi.restoreAllMocks()` de Vitest 4 no borra las llamadas de un `vi.fn()`.
  - **C-7:** `muro-c-r1.ataque.test.tsx`. `:809` y `:822` (`findByRole("alert")`) pasan a esperar `aviso.error` una vez. `:812` y `:825` pasan al botón «Ver más avisos» y «Ver más comentarios». `:811` y `:824` no cambian. El tester ya no decide si basta: esta es la reescritura.
- **C-13 (arbitrada en la ronda 0 de 06a) · `lib/guardas-ch4-r1.ataque.test.ts:113-120`** (ATQ-CH4-34). Comprobada en `023b450`: `:113` es el comentario "S-04 (H-2)…" y `:114` a `:120` son las siete líneas `void <consulta>.refetch()`. Se quitan las ocho líneas del arreglo y el resto no cambia: todo `.refetch(` sin la opción sigue en una lista cerrada, más corta.
- **C-14 (condicional) · `app/estado-por-id-ch6a-r3.ataque.test.tsx:695-719`** (ATQ-CH6-26, de 06a).
  - *Por qué puede caer.* Con DH-10, llegar a B con un fallo ocurrido fuera de la vista dispara PR-1 bis, que vuelve a pedir B, y `listas.fallan` todavía tiene a B. Hoy sigue en verde solo por tiempo: el reintento de `retry: 1` tarda unos 1000 ms, la aserción de `:713` mira a los 150 ms, y la recarga manual de `:714` cancela la renovación en silencio.
  - *Si cae* en la corrida del programador con PR-1 bis aplicado, el programador se detiene (PA-2) y el tester aplica esto, sin otra enmienda: antes de `:711` (`navegar(router, -1)`), `listas.fallan.delete(B)`; después de `:713`, `listas.fallan.add(B)`. El título y las demás aserciones no cambian.
  - *Conserva la intención:* el fallo ya ocurrido no se avisa al llegar, y uno que llega después se avisa una vez.
- **C-15 · `features/clases/inicio-sin-datos-r2.ataque.test.tsx`.** Con 06b los inicios llaman a `useAvisoDeRecargaFallida`, que viene de `./hooks` y la fábrica de `:31-37` no lo da (con Vitest 4, leer un export que falta lanza; precedente C-19 de CLASES-c). También llaman a `useMarcarViejaSiQuedoEnError` (`useQueryClient`), y el render de `:52-56` no tiene `QueryClientProvider`.
  - Cambios: la fábrica suma `useAvisoDeRecargaFallida: () => undefined`, con un comentario como el de `:25-30`, y el render envuelve `<MemoryRouter>` en `<QueryClientProvider client={new QueryClient()}>`.
  - Nada más cambia. Sigue protegiendo lo mismo: sin error, sin carga y sin datos, los inicios no afirman vacío ni total.
- **C-16 · `features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx`.** Lo mismo en la fábrica de `:24-28` y el render de `:41-45`.
- **(Enmienda 3b) C-15 y C-16, precisiones.**
  - Las dos fábricas suman también `useListaConservadaTrasLaPagina: () => false`, porque los inicios lo importan de `./hooks` (M-02).
  - El `QueryClientProvider` basta porque los inicios importan `useRecargarAlPulsarLaSeccion` y `useMarcarViejaSiQuedoEnError` de `@/components/seccion/hooks`, que no se dobla (§D-4, N-02). Si el programador los importara por `./hooks`, el doble no los tendría y caería: PA-2.
- **C-17 · `features/clases/alumnos-b-r5.ataque.test.tsx:316-327`** ("%s: si la página siguiente falla, el foco va exactamente al encabezado «Alumnos»"; `errorInterno`, un `500`). Es T-27 en el roster y en Personas, y cambia de sentido por §D-5. Faltaba en el inventario.
  - Título: "%s: si la página siguiente falla, la lista se queda, un solo aviso y el foco se queda exactamente en «Ver más alumnos» (CHORE-06b, §D-5)".
  - `:324` (`findByRole("alert")`) pasa a `await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))`.
  - `:325` pasa a esperar el foco en `screen.getByRole("button", { name: "Ver más alumnos" })`.
  - Se suman `expect(screen.queryByRole("alert")).toBeNull()` y que `nombreDe(1)` siga a la vista.
- **C-18 · `features/clases/muro-c-r3.ataque.test.tsx:189-216`** (los `it.each` de «Ver más avisos» y «Ver más comentarios» sobre `CASOS`). Faltaba en el inventario.
  - Con la función de la Enmienda 3 cambian solo las filas "500" y "sin conexión (fetch rechaza)": 4 de 14 casos. Las de `400` y `403` siguen reemplazando la lista con su texto y no cambian. Con la función de antes habrían cambiado 10.
  - Cambio: `CasoDeError` suma `conserva: boolean`, verdadero en esas dos filas.
  - Para ellas, en lugar de `findByRole("alert")`:
    - `toast.error` (importado de `sonner`, ya doblado en `:18`) se llama una vez con `caso.deSiempre`. Si para esos errores `mensajeDeConsultaClases` no diera el mismo texto que `mensajeDeErrorClases`, vale el de `mensajeDeConsultaClases` del mismo error, que es el del aviso de §D-5;
    - no hay ningún `role="alert"`;
    - el «Ver más …» sigue a la vista.
  - El título del caso no cambia. Sigue protegiendo T-34: el texto del cursor solo sale con el `400` del cursor.
  - (Enmienda 3b, N-03) El doble de `:18` no se limpia entre casos, así que "una vez" se cuenta desde el inicio de cada caso: `vi.mocked(toast.error).mockClear()` al empezar, o la diferencia entre antes y después.
- **Vigiladas, sin cambio (Enmienda 3; PA-2 si caen):**
  - `app/estado-por-id-ch6a-r1.ataque.test.tsx` entero. Los saltos de ATQ-CH6-04 y ATQ-CH6-15 llegan a listas sanas y frescas, y las entregas son de `features/tareas`.
  - `app/estado-por-id-ch6a-r2.ataque.test.tsx` entero. ATQ-CH6-19 restaura el manejador sano antes de saltar, así que la renovación de B responde bien.
  - `app/estado-por-id-ch6a-r3.ataque.test.tsx` salvo C-14:
    - ATQ-CH6-25 y ATQ-CH6-27: la clase que falló se borra de `fallan` antes de saltar;
    - ATQ-CH6-29 y ATQ-CH6-32: la página de A que vuela al saltar no toca B. Si responde bien, se queda en A. (Enmienda 3b) Si falla, la librería deja A inválida. En ATQ-CH6-29 (Actividades, con `signal`), el desmontaje de la sección la aborta;
    - ATQ-CH6-30, ATQ-CH6-31, ATQ-CH6-33, ATQ-CH6-34 y ATQ-CH6-35.
  - `publicacion-del-muro.test.tsx:494` (PR-C17), `muro-view.test.tsx:275` y `:318`, `muro-c-r2.ataque.test.tsx:293` y `:312`, y `app/muro-recuperar-c-r3.ataque.test.tsx:230`. Todas son del `400` del cursor, que sigue reemplazando.
- **(Enmienda 4, P-1) C-19 · `features/calificaciones/gradebook-01d-r3.ataque.test.tsx:582-627`** (CAL-T-244).
  - *Líneas.* Son las mismas en `023b450` y en el archivo actual: C-8 solo cambió el bloque final (`:722` en adelante del archivo actual; el `it` de CAL-T-248 estaba en `:723` de `023b450`).
  - *Por qué cambia.* El caso desmonta la vista con la frase a la vista (`:591`, `primera.unmount()`), y la limpieza de §D-6 (b) marca las ventanas de la clase: es la marca que N-52 pide para el camino "salir y volver". Por eso `:626` cuenta 2 donde esperaba 1.
  - *Reescritura* (Enmienda 4b, N-02; reemplaza la de la Enmienda 4, que juntaba en una sola cifra la marca de la limpieza y "ninguna marca más"). Son tres cambios, y nada más del caso cambia:
    1. Justo después de `:591` (`primera.unmount()`) se suman estas tres líneas, con la sangría del caso:
       - `// CHORE-06b (C-19, §D-6 b): una marca por la ocurrencia y otra al salir con el texto visto (N-52).`
       - `const tras = marcas()`
       - `expect(tras).toBe(2)`
    2. `:626` pasa de `expect(marcas()).toBe(1)` a `expect(marcas()).toBe(tras)`.
    3. El título no cambia: no habla de marcas.
  - *Líneas.* Las de arriba son las de `023b450` y del archivo actual. Con las tres líneas nuevas, la de `:626` queda en `:629`.
  - *Conserva la intención:* mientras llega la primera ventana, «Alumnos siguientes» en espera no pide el cursor muerto, y al llegar se ve el vacío de la clase sin texto, sin botones y con el foco en la vista. Ni la espera ni la llegada agregan marcas: siguen siendo exactamente las dos de antes del montaje. (Enmienda 4b) Así se ve aparte: `tras` fija la marca de la limpieza, y la aserción final fija que no hay ninguna más.
- **(Enmienda 4, P-1) C-20 · `features/calificaciones/secciones-01d-r4.ataque.test.tsx:389-408`** (CAL-T-258). Ni 06a ni 06b tocaron el archivo, así que las líneas son las de `023b450` y las del árbol.
  - *Por qué cambia.* La primera pulsación (`:401`) llega con la frase del `400` a la vista y marca las ventanas (N-52, §D-6 (a)). La segunda (`:404`) llega con la tabla sana y no marca.
  - *Reescritura:*
    - título (`:389`): "…el 400 marca una vez y pulsar la sección dos veces (con el texto y con la tabla sana) no agrega ninguna" pasa a "…el 400 marca una vez; pulsar la sección con el texto a la vista agrega una (N-52, CHORE-06b) y con la tabla sana ninguna";
    - `:406`: `expect(marcasViejas(espia)).toHaveLength(marcas)` pasa a `expect(marcasViejas(espia)).toHaveLength(marcas + 1)`;
    - entre `:403` y `:404` se suma `expect(marcasViejas(espia)).toHaveLength(marcas + 1)`, para que la marca nueva se vea antes de la segunda pulsación y no después;
    - `:394`, `:399`, `:400` y `:407` no cambian.
  - *Conserva la intención:* el `400` marca una vez, ninguna pulsación repite la marca de la ocurrencia, y con la tabla sana pulsar no marca. Lo único nuevo es la marca que N-52 exige con la frase a la vista.

El tester confirma en la ronda 0, con los `rg` de la lista cerrada (incluidos los de la Enmienda 1), que no hay otra `*.ataque` del mismo sentido; si la hay, la anota como C-n y avisa al manager (no es PARADA del programador). (Enmienda 3) El repaso de la ronda 0 de 06b incluye además:
- las pruebas que pintan un componente de las 12 listas sin router o sin `QueryClientProvider` (`rg "<(PublicacionDelMuro|ComentariosDePublicacion|ElementoDeRecurso|TablaAlumnos|PanelMisClases)\b" src -g "*.test.tsx"` y los `vi.mock` de `./hooks`);
- las que hacen fallar una página con la red o un `5xx` y esperan un `MensajeError` o el foco en un encabezado (`rg "findByRole\(\"alert\"\)|GENERICO|errorInterno|error500" src/features/clases src/app -g "*.ataque.test.tsx"`, cruzado con las que piden una página con `cursor`).

## Pruebas requeridas

Todas en el frontend, sin API ni infra. Prefijo `CH6-` (`CH6-A` en 06a, `CH6-B` en 06b). Reglas para todas:
- **Router y caché reales.** Los casos de navegación (saltos del historial, pulsar la sección, otra sección y regreso, «Inicio» de la barra) montan `rutas` de `app/router` con `createMemoryRouter` y un `QueryClient` con las `defaultOptions` de `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`). La red se dobla con `fetch`; se cuentan las peticiones por método y ruta, y las respuestas se retienen con una promesa diferida (el arnés de `guardas-ch4-r1.ataque.test.tsx`, `montar`/`navegar`/`retenida`, es el modelo). "Salto del historial" es `router.navigate(-1)` o `(1)` entre dos entradas de la misma ruta con otro id, con el destino ya en caché (S-02). `irA` de `services/navegacion` se dobla.
- **Foco.** Se afirma con `document.activeElement`, nunca solo "no es `<body>`" cuando el plan dice a dónde va.
- **Rojo primero.** Las pruebas de comportamiento de cada grupo se escriben y se corren antes del cambio de producción de su grupo; el resumen dice cuántas fallaron y cuáles, con el comando y su salida.
- **Mutación que lo comprueba** (regla del humano, 2026-11-11). Después de implementar, por cada remedio de la tabla "Mutaciones" de abajo, el programador lo quita (cambio real en el archivo), corre el caso que dice vigilarlo, comprueba que falla, y lo restaura (comprobando con `git diff` que el archivo quedó igual). Si el caso pasa sin el remedio, no lo vigila: lo reescribe hasta que caiga, o declara la redundancia con su mecanismo en el resumen y se detiene (PA-7). Nunca sobre una copia: el archivo real, restaurado.
- Sin selectores de clase; por rol, nombre accesible, `aria-busy` y texto. Toda prueba con al menos una aserción; una precondición que falta hace fallar la prueba con un mensaje.

### CHORE-06a · lo abierto es del id (`app/estado-por-id-ch6.test.tsx`)

Clases A ("Historia") y B ("Geografía") con la misma persona en las dos donde haga falta; tareas T1 y T2 de A; alumnos P1 y P2 con entrega en T1; recursos R1 y R2.
- **CH6-A01 · Quitar a un maestro (admin, Personas; O-r1-1, prioritario).** Con la confirmación de «Quitar <maestro>» abierta en A y el foco en «Cancelar» (en otro caso, en «Sí, quitar»): salto a B. En B no hay «Sí, quitar <maestro>» ni la frase de consecuencia; «Quitar <maestro>» está a la vista; el foco es el título (`h1`) de B. Volver a A: la confirmación está cerrada y ningún «Cancelar» tiene el foco.
- **CH6-A02 · Lo mismo con un alumno** (maestro y admin, el roster): la confirmación de «Quitar <alumno>» no pasa a B; el foco va al título de B; al volver a A está cerrada.
- **CH6-A03 · Quitar con la petición en vuelo (H-3).** Maestro y alumno, por separado: con el `DELETE` de A retenido, salto a B: nada de B está en espera; abrir «Quitar» y «Sí, quitar» en B manda el `DELETE` de B. Soltar el de A: un solo aviso de A ("… ya no da esta clase" o el del alumno), y la lista de A queda vieja o renovada (`claveClaseDetalle(A)` o `claveAlumnos(A)`); la de B no cambia por la respuesta de A. Volver a A **antes de 30 s**: A no muestra a la persona quitada (se pidió de nuevo).
- **CH6-A04 · Borrar una tarea (O-E3-1).** Con la confirmación de «Borrar tarea» de T1 abierta (y, como admin, con el `409 TAREA_CON_ENTREGAS` a la vista), salto a T2: no hay confirmación ni el mensaje del `409`; el foco es la raíz de la vista (el `div` con `tabIndex={-1}`); al volver a T1, cerrada.
- **CH6-A05 · Tu trabajo y el hilo del alumno.** En T1, archivos y enlaces elegidos sin entregar, y texto en "Comentarios privados"; salto a T2: nada de eso está; «Entregar» en T2 manda el `POST` de T2 sin los archivos ni los enlaces de T1. Con la confirmación de anular abierta en T1, salto a T2: no está.
- **CH6-A06 · Calificar a un alumno (O-r1c-2).** Maestro; panel de P1 con puntos escritos (sin enviar) y texto en el hilo; salto a la entrega de P2 (en caché, **con la misma `version` que P1**): el panel muestra lo de P2 (sin los puntos de P1), el hilo está vacío; «Calificar y devolver» manda el `PUT` de P2 con la versión y los puntos de P2. Con el `PUT` de P1 retenido al saltar: en P2 nada espera; al soltarlo (éxito, y en otro caso `409 ENTREGA_MODIFICADA`), un solo aviso, el panel de P2 no se reinicia ni toma el foco, y no sale ninguna recarga de la entrega de P2. Foco tras el salto: la raíz de la vista. **(Enmienda 1, M-01) Camino "mismo alumno, otra tarea":** lo mismo saltando de la entrega de P1 en T1 a la de P1 en T2 (las dos en caché, **con la misma `version`**): el panel muestra lo de P1 en T2 (su rúbrica o su calificación directa, sin los puntos escritos en T1), el hilo está vacío, «Calificar y devolver» manda el `PUT` de la entrega de P1 en T2 con su versión y sus puntos, y el texto escrito en el hilo de T1 no se envía al de T2; con el `PUT` de T1 retenido al saltar, al soltarlo, un aviso y nada se reinicia ni toma el foco en T2.
- **CH6-A07 · Editar una tarea.** Lo escrito en T1 (título cambiado) no está en T2; «Guardar» en T2 manda el `PUT` de T2 con su versión y su contenido. Con el `PUT` de T1 retenido al saltar a la edición de T2, al soltar (éxito): un aviso, **la ruta sigue en la edición de T2** (no navega al detalle de T1) y lo escrito en T2 se conserva. Con un `409 TAREA_MODIFICADA` de T1 estando en T2: un aviso, ninguna recarga ni reinicio en T2.
- **CH6-A08 · Editar un recurso.** Lo mismo que CH6-A07 con R1 y R2 (`409 RECURSO_MODIFICADO`).
- **CH6-A09 · Crear una tarea.** Lo escrito en "Nueva tarea" de A (título, tema y categoría de A) no está en la de B. Con el `POST` de A retenido al saltar, al soltar: un aviso, la ruta sigue en "Nueva tarea" de B.
- **CH6-A10 · Editar una clase (admin).** El nombre escrito para A no está en el formulario de B, que muestra el de B; «Guardar» en B manda el `PUT` de B con el nombre de B. Con el `PUT` de A retenido al saltar, al soltar: no navega y el formulario de B no cambia.
- **CH6-A11 · Formularios de las cuatro listas.** Avisos (anuncio con texto y un archivo elegido), Dudas, Recursos (crear) y «Nuevo tema» (Actividades): lo escrito en A no está en B (y «Nuevo tema» está cerrado en B); si el foco estaba en el campo, va al título de B. Con la publicación de A retenida al saltar, al soltar: un aviso y solo se renueva la lista de A. **Regresión O-14:** con el foco en una fila de la lista de A (un «Borrar publicación», una duda, un tema), el salto lo lleva al `h2` de la lista, como hoy.
- **CH6-A12 · Calificaciones.** Gradebook: tras avanzar a «Alumnos siguientes» en A, salto a B: se pide la primera ventana de B (sin `cursor` de A) y no aparece "La clase cambió…". Mis calificaciones: con el filtro "Entregadas" en A, en B el filtro es "Todas".
- **CH6-A13 · Estados vecinos.** (a) A → B → A → B con una confirmación abierta y una petición en vuelo: nada abierto ni en espera en ninguna; un aviso por respuesta. (b) Destino sin caché: «Cargando» y todo nace cerrado (regresión). (c) Con la petición en vuelo, ir fuera de la clase (el inicio) y soltar: un aviso, sin excepciones. (d) Con `StrictMode`: el doble montaje no reabre nada ni mueve el foco.
- **CH6-A14 · `VALIDACION` de A estando en B (§D-2).** En los formularios de las Formas B y C (anuncio, duda, recurso, tema, tarea, edición de tarea, edición de recurso, panel de calificación): el envío de A retenido, salto a B con algo escrito en el formulario de B, y A responde `400 VALIDACION` con (1) un campo que el formulario pinta, (2) uno que no pinta, (3) un mensaje vacío o de solo espacios y (4) un prefijo con ruta (`campo.0.sub:`): un solo aviso legible, ningún `ErrorDeCampo` en el formulario de B y lo escrito en B intacto. Los casos de "un campo que el formulario pinta solo en otro modo" y de "rechazo del servidor seguido de un rechazo local" no cambian en este encargo: el resumen nombra el caso existente de cada formulario que los cubre.
- **CH6-A17 · Hermanos que no cambian (regresión).** `EditorDeCategorias` (lo escrito en A no pasa a B), `DuplicarClaseDeLaRuta`, la ficha de una cuenta (salto entre dos cuentas) y "Mis calificaciones" de una clase anterior: el resumen nombra el caso existente de cada uno o lo escribe aquí.

### CHORE-06a · avisos con la página que se va (`features/clases/avisos-al-redirigir-ch6.test.tsx`)

- **CH6-A15 · Los 13 ganchos.** `it.each` sobre asignar y retirar maestro, agregar y quitar alumno, crear anuncio, borrar publicación, comentar, borrar comentario, crear tema, renombrar tema, borrar tema, ordenar temas y guardar categorías, por cada uno de `401` sin refresco (refresco rechazado), `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`: `toast.error` no se llama; `irA` sí (con su destino). Control en la misma tabla: un `500` da un solo aviso con `mensajeDeErrorClases`. Con el componente real donde lo hay (no con `renderHook` suelto), para que el `mutate` sea el de la vista. (Enmienda 1, M-02) La tabla suma crear y editar clase (`FormularioClase`, admin) y la subida de un archivo al publicar un anuncio y al crear un recurso (la solicitud de subida responde con el código): en las cuatro, ningún aviso; lo escrito y lo elegido se conservan; el botón sale de la espera.
- **CH6-A16 · «Unirme a la clase» y los avisos de recarga.** «Unirme a la clase» con los tres códigos: ningún aviso, el campo sin marcar, `irA` una vez. Las cinco vistas de §D-3 (categorías, Recursos, Actividades, editar recurso, un tema de Recursos) con una recarga que responde `401` sin refresco: ningún "No pudimos actualizar…"; con `503`: uno (regresión).

### CHORE-06a · avisos con la página que se va en `features/tareas` (`features/tareas/avisos-al-redirigir-ch6.test.tsx`; Enmienda 1, M-02)

- **CH6-A18 · `features/tareas`.** Con el router real y la configuración de `providers.tsx`, por cada uno de `401` sin refresco, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`: crear, editar y borrar una tarea; entregar, anular y comentar en el hilo privado (alumno) y comentar en el hilo de un alumno (maestro); la subida de un archivo al crear una tarea y al entregar; y la recarga de la tarea con datos en caché en el detalle, la edición, las entregas y la entrega de un alumno. En todos, ningún `toast.error` e `irA` con su destino; en las mutaciones, lo escrito se conserva y el botón sale de la espera. Control en la misma tabla: un `500` (y un `503` en la recarga) da un solo aviso, el de hoy. Regresión: calificar sigue sin avisar (CAL-1C06) y un `404 TAREA_NO_ENCONTRADA` al entregar y comentar a la vez sigue dando un solo aviso (el de `entregas-01d-r3.ataque.test.tsx:307`).

### CHORE-06a · la regla (`lib/estado-por-id-estatico-ch6.test.ts`)

- **CH6-A30.** Lee con `import.meta.glob("/src/features/**/*.tsx", { query: "?raw", import: "default", eager: true })` el código de producción (sin `.test.`), sin comentarios. (a) Todo render prop de una línea de `ConClaseDeLaRuta` que cumpla `/\{\((claseId)\) => <(\w+)([^>]*)\/>\}/` lleva `key={claseId}` entre sus atributos, salvo la lista cerrada y exacta `clase-layout.tsx#ClaseDeLaRuta`, `clase-anterior-view.tsx#ClaseAnteriorDeLaRuta`, `muro-view.tsx#MuroDeLaClase`, `dudas-view.tsx#DudasDeLaClase`, `recursos-view.tsx#RecursosDeLaClase` y `trabajo-view.tsx#TrabajoDeLaClase`. (b) En esas cuatro listas: `muro-view.tsx` tiene `<FormularioPublicacion key={claseId}`, `dudas-view.tsx` `<FormularioDuda key={claseId}`, `recursos-view.tsx` `<FormularioRecurso key={claseId}` y `trabajo-view.tsx` `creandoEn !== claseId`. (c) `detalle-tarea-view.tsx` tiene `key={tarea.id}`; `editar-tarea-view.tsx` `key={tareaId}`; `editar-recurso-view.tsx` `key={recursoId}`; `entrega-de-alumno-view.tsx` `` key={`${tareaId}:${alumnoId}`} `` (Enmienda 1, M-01: la `key` compuesta; `key={alumnoId}` solo debe hacer fallar el caso). Precondiciones: al menos 15 render props de una línea (hoy son exactamente 15); cada archivo de la lista cerrada existe. (Enmienda 1) Si la precondición de las 15 cae, el mensaje dice que una vista pasó a un render prop de varias líneas, que la regla no ve, y que hay que revisarla a mano o bajar la cifra con la lista nueva en el resumen; no es una falla de la regla. Un caso de control aplica (a) a un texto de ejemplo y falla sin la `key`. El mensaje de falla lista `ruta#Componente`. El programador puede endurecer una expresión, nunca aflojarla (lo dice en el resumen).

### CHORE-06b · la política (`components/seccion/recargas-ch6.test.tsx`)

- **CH6-B01 · `useRecargarAlPulsarLaSeccion`**, con `createMemoryRouter` y el `QueryClient` de `providers.tsx`. Una pulsación es otra `location.key` en la misma ruta. Estados: (a) sana y fresca: 0 peticiones; (b) sana y marcada vieja (`invalidateQueries` con `refetchType: "none"`): 1; (c) sana con más de 30 s (`vi.setSystemTime`): 1; (d) en error sin datos: 1; (e) en error con datos (página siguiente fallida): 1, desde la primera página; (f) en error y pidiendo (la petición retenida): 0, y la petición en vuelo no se cancela (su respuesta se aplica); (g) dos pulsaciones en el mismo `act` con la consulta en error: 1; (h) el primer render no cuenta; (i) dos consultas en la misma llamada: cada una según su estado. (Enmienda 3b, M-02) Lo que se ve mientras vuela la recarga de (e) no lo fija este gancho, que no pinta nada: lo fijan CH6-B10 y CH6-B16 (f) en las vistas.
- **CH6-B02 · `useMarcarViejaSiQuedoEnError` movido.** En error al desmontarse: queda `isInvalidated` y no se pide; sana: no se toca; al cambiar de clave en error: la anterior queda vieja. Además, las pruebas de `features/admin` que lo usan siguen en verde (regresión, sin cambio). (Enmienda 3b, M-01; reemplaza los casos (a) a (c) de `tambienEnVuelo`, que se retira.) Un error de verdad ya deja la consulta inválida (`query.js:450-462`), así que los casos de este gancho arman a mano un error **sin** `isInvalidated`. Se hace con `queryClient.getQueryCache().find({ queryKey, exact: true })` y su `setState({ status: "error", error, isInvalidated: false, fetchStatus: "idle" })`; si falta la consulta, el caso falla con un mensaje. Con ese estado:
  - (a) al desmontarse queda `isInvalidated` y no se pide;
  - (b) al cambiar de clave, la anterior queda `isInvalidated` y la nueva no;
  - (c) sana, no se toca.

  Son los casos que hacen caer sus mutaciones.

### CHORE-06b · frases de recuperación por camino (`features/clases/recargas-ch6.test.tsx`)

Por cada lista de la tabla de §D-4 y cada frase que pinta (el texto de la consulta ante un `500` o la red, "…Vuelve a abrir…" ante el `400` del cursor, el texto fijo del lugar en Personas y el roster), un caso por camino. En cada uno, la acción vuelve a pedir lo que la frase promete (desde la primera página), la frase desaparece y no se sirve de la caché lo que se sabe viejo:
- **CH6-B03 · Pulsar la sección estando en ella** (otra `location.key`): Avisos, comentarios abiertos (pulsando «Avisos» o «Recursos»), Dudas, respuestas abiertas (pulsando «Dudas»), Actividades (los temas y un tema), Recursos (los temas y un tema), Personas, el roster, y los dos inicios pulsando «Inicio» de la barra.
- **CH6-B04 · Ir a otra sección y volver antes de 30 s**, con la consulta en error **con datos** (una recarga o una página que falló) y sin datos: en las 12. (Enmienda 3, PR-2) Más el camino (c′): con una recarga de la lista en vuelo, ir a otra sección; la recarga falla con la vista desmontada; volver antes de 30 s: se pide una vez, sin aviso, y la frase de error no queda a la vista al responder bien. En Avisos, Personas y un inicio (consultas sin `signal`, cuyo fallo sí llega desmontadas). (Enmienda 3b) Ese camino lo cumple la librería, no PR-2 (M-01). (Enmienda 3b, M-02) Con la consulta en error **por una página que falló** (lista conservada), al volver la lista se ve mientras vuela la recarga: ningún `role="alert"` ni texto de error mientras la recarga está retenida, «Ver más» en espera y el foco donde lo dejó el montaje. Con la consulta en error por una **recarga** que falló, el `MensajeError` sigue mientras vuela, como hoy (DH-02 (a)).
- **CH6-B05 · Atrás y adelante del historial** a otra entrada de la misma ruta (pulsar dos veces la sección, fallar, ir atrás): en Avisos, Dudas y un inicio.
- **CH6-B06 · Repetir el control:** «Ver más» (CH6-B10); cerrar y abrir los comentarios y las respuestas ("Vuelve a abrirlos", "Vuelve a abrirlas").
- **CH6-B07 · H-2:** con la lista en error y la nueva petición retenida, dos pulsaciones seguidas (en el mismo `act` y en renders distintos) mandan una sola petición, en las siete vistas de la fila 346.
- **CH6-B08 · O-03:** tras «Subir» con la recarga por sección fallida (la respuesta del orden escrita y la lista marcada vieja), pulsar «Actividades de aprendizaje» estando ahí pide la lista de temas una vez y los conteos se renuevan.
- **CH6-B09 · Hermano de T-07** (`/admin/clases` y "Clases anteriores"): con la lista en error y una recarga en vuelo, pulsar la sección no manda otra; al responder, la lista aparece.
- Los caminos que ya tienen caso (Recursos, Dudas y el cursor de las listas, en `recursos-caminos-03d.test.tsx`, `dudas-caminos-03e.test.tsx`, `recuperar-ch3.test.tsx` y `consultas-ch3.test.tsx`) no se repiten: el resumen nombra, por lista y camino, el caso que lo cubre, y esas pruebas siguen en verde con PR-1.

### CHORE-06b · «Ver más» que falla (`features/clases/ver-mas-ch6.test.tsx`)

Por cada una de las 9 listas de §D-5 (Avisos, comentarios, Dudas, respuestas, un tema de Actividades, Personas, el roster, inicio del estudiante e inicio del maestro):
- **CH6-B10 · `5xx` y red.** Salen las dos peticiones de la página (`retry: 1`) y ninguna más; la lista se queda con sus filas; un solo aviso con `mensajeDeConsultaClases(error)`; «Ver más» a la vista y fuera de espera, con el foco en él si lo tenía; en los inicios, sin el `MensajeError` del panel y sin el error en el título del bloque destacado. Un clic en «Ver más» pide la página con el mismo cursor; si responde bien, aparecen las filas nuevas sin otro aviso (camino "repetir el control" de la frase del aviso). Pulsar la sección y volver de otra sección también la recuperan (CH6-B03 y B04). (Enmienda 3b, M-02) Mientras vuela esa recuperación (la recarga retenida), por cada camino (pulsar la sección, volver de otra sección y una invalidación por comentar, en Avisos):
  - la lista sigue a la vista, con «Ver más» en espera;
  - no hay ningún `role="alert"` ni texto de error, y en los inicios el título no dice el error;
  - el foco no se mueve.

  Al responder bien, la lista se renueva sin aviso. Si esa recarga falla, la lista se reemplaza por el `MensajeError`, sin aviso, y el foco va al `h2` solo si se perdió. Lo anterior vale en las 9 listas para pulsar y volver, y en Avisos para la invalidación. En Avisos y Dudas, un caso pone el foco en una fila de la lista conservada y hace fallar la recuperación (una invalidación que responde `503`): la lista se reemplaza y el foco va al `h2`, nunca a `<body>`. Es lo que fija el argumento `isError && !conserva` de `useFocoAlPasarAError`.
- **CH6-B11 · Lo que sigue reemplazando.** `400` del cursor: la frase "…Vuelve a abrir…" reemplaza la lista, sin aviso; `403 SIN_ACCESO_A_LA_CLASE`: el error de la clase, como hoy; `401` sin refresco: ningún aviso e `irA` a `/login` (Enmienda 1: la prueba no afirma qué se ve el instante que dura la recarga de `irA`; el error puede reemplazar la lista ese instante, como O-r1-6). (Enmienda 3) Cualquier otro `4xx`, sin aviso, también reemplaza la lista como hoy: un `400 VALIDACION` de otro campo, un `429`, y un `404 PUBLICACION_NO_ENCONTRADA` en «Ver más comentarios» o `DUDA_NO_ENCONTRADA` en «Ver más respuestas», que pinta el mensaje del bloque (CH6-B13).
- **CH6-B12 · Estados vecinos.** (a) Dos fallos seguidos de la página: dos avisos, uno por fallo, y la lista sigue. (b) La página en vuelo y una recarga de fondo que gana (ATQ-CH4-21): ningún aviso, «Ver más» pide con el cursor renovado. (c) La página en vuelo y la vista desmontada (otra sección) antes de que falle: ningún aviso; al volver, la lista se pide (Enmienda 4: la pide la librería; antes decía "PR-2"). (Enmienda 3b, M-01; corrige el texto de la Enmienda 3) Lo cumple la librería: el fallo, que llega con la vista desmontada, deja la consulta inválida. Al volver se pide desde la primera página una vez, sin aviso, y la lista se ve mientras vuela (M-02). Es la decisión sobre O-01 de §D-5. En las 8 listas sin `signal`. En el tema de Actividades (`useTrabajo` consume `signal`), salir aborta la página en vuelo y la revierte: no falla. Al volver, la lista sigue con su «Ver más» y no se pide nada antes de los 30 s. (d) Montar la vista con el fallo ya ocurrido (volver antes de que se pida otra vez): ningún aviso repetido. (e) Dos clics en «Ver más» en el mismo `act` tras el fallo: una sola petición.
- **CH6-B13 · Comentarios de una publicación borrada (hermano de T-02).** Abrir los comentarios y, en otro caso, «Ver más comentarios» con `404 PUBLICACION_NO_ENCONTRADA`: un solo mensaje en el bloque («Esa publicación ya no existe.»), sin aviso; la lista de Avisos se pide **una** vez y la fila sale; el foco, si estaba en el bloque, va al «Borrar publicación» de la vecina o al `h2`. Lo mismo con un recurso (la lista de Recursos se renueva). Dos fallos seguidos: una renovación por fallo.

### CHORE-06b · gradebook y barra (`features/calificaciones/gradebook-ch6.test.tsx`; la barra en `features/clases/recargas-ch6.test.tsx`)

- **CH6-B14 · N-52.** El escenario de CAL-T-248 (dos cambios de la clase en menos de 30 s con el mismo límite de ventana): (a) pulsando «Calificaciones» y (b) saliendo y volviendo antes de 30 s con la frase a la vista: «Alumnos siguientes» pide la ventana (no la sirve de la caché) y, si ya no está vacía, el texto desaparece. (c) Regresión de CAL-T-201: con la vista quieta y la caché fresca, regresar y volver a avanzar a la ventana vacía no pide nada. (d) (Enmienda 3) Salto del historial de A, con la frase a la vista, a B: las ventanas de A quedan `isInvalidated` y las de B no (B pide solo su primera ventana, como en CH6-A12); al volver a A, «Alumnos siguientes» pide la ventana. (e) (Enmienda 4, P-1) Con la tabla sana, pulsar «Calificaciones» no marca ninguna ventana (`invalidateQueries` con `refetchType: "none"`: cero llamadas nuevas) y pide solo la primera ventana. Lo fija CAL-1D03e, que no cambia; si el programador quiere el caso con su router, lo suma aquí.
- **(Enmienda 4b, M-01) El camino "otra ventana".** Los tres casos usan el escenario de CAL-T-248: la clase cambia dos veces en menos de 30 s y el mismo cursor vuelve en la primera ventana nueva. La persona ve la frase en la ventana vacía W, pulsa «Alumnos anteriores» (la frase desaparece y W queda fresca en la caché, como fija CAL-1D02ac) y después:
  - **(f)** pulsa «Calificaciones» estando ahí;
  - **(g)** va a otra sección de la clase y vuelve antes de 30 s;
  - **(h)** salta con el historial a las calificaciones de la clase B y regresa a A.

  En los tres, la ventana W queda `isInvalidated` antes de volver a avanzar. Después, «Alumnos siguientes» pide W una sola vez (no la sirve de la caché) y, como el servidor ya responde con filas, la frase no reaparece. En (f), además, cuando «Alumnos siguientes» ya trajo las filas, una pulsación más de «Calificaciones» no agrega ninguna marca. Mientras W se volvía a pedir, la caché la mostró un momento con la misma ocurrencia ya marcada, y esa ocurrencia no debe volver a encender la frase.
- **CH6-B15 · Clase archivada en la barra (fila 361).** Alumno y maestro con A en la barra: abrir A y que llegue archivada (el alumno pasa a "Clases anteriores"): la barra y la lista del inicio se piden una vez y ya no la traen. Admin: ninguna petición de `CLAVE_CLASES_INSCRITAS` ni `CLAVE_CLASES_IMPARTIDAS`. (Enmienda 1, N-03) Maestro que abre una clase archivada desde "Clases archivadas", con la barra en caché sin esa clase: ninguna petición de la barra ni del inicio, también al abrirla dos veces seguidas. (Enmienda 3) Salto del historial A (archivada, leída) → B (activa) → A: la barra y el inicio se piden una sola vez en total, y saltar a B no pide nada de la barra. (Enmienda 4, P-2) **El vecino del maestro con el inicio en caché.**
- Preparación: el maestro abre primero su inicio, de modo que la lista del inicio, con A, queda en caché y sin montarse, y la barra queda activa.
- Pasos: abre A, que llega archivada; salta a B; vuelve a A con el historial.
- Se espera:
  - la barra se pide una sola vez en todo el camino, la primera vez que se lee A archivada;
  - el inicio no se pide mientras no se monta, pero queda `isInvalidated`;
  - al volver al inicio, se pide una vez y ya no trae a A.
- Además, **el alumno** (la forma de hoy): la barra se pide una sola vez aunque el efecto corra dos veces (`ClaseLayout` y `ClaseAnteriorView`). Es lo que hoy cae en `recargas-ch6.test.tsx:1141`.

### CHORE-06b · O-08 y la Regla de la clave (`features/clases/recargas-ch6.test.tsx`; Enmienda 3)

Con el router real (`rutas` de `app/router`, `createMemoryRouter`) y la configuración de `app/providers.tsx`. "Salto" es `router.navigate(-1)` o `(1)` entre la misma sección de A y de B, con B en caché (S-02).

- **CH6-B16 · DH-10 (a): el salto cuenta como pulsar y la renovación no mueve el foco.** En Avisos, Dudas, Recursos (bloque del docente) y Actividades, por estados de B al llegar:
  - (a) sana y fresca: ninguna petición de la lista de B;
  - (b) marcada vieja (`invalidateQueries` con `refetchType: "none"`): una;
  - (c) en error con datos (Enmienda 3b, M-01: junta los estados (c) y (d) de la Enmienda 3, porque una consulta en error siempre está vieja). Dos variantes: la recarga de B falló estando a la vista y después se saltó a A; y la recarga de B falló con B fuera de la vista (`refetchQueries({ type: "all" })` estando en A). En las dos sale **una** petición, la del observador, desde la primera página; hoy salen dos. El error de B (el `MensajeError` en Avisos y Dudas) desaparece al responder bien. (Enmienda 4, N-05 del manager) En Avisos va además el salto en negativo de la clave de `useListaConservadaTrasLaPagina`: A tiene su lista conservada (marca `A:n`) y B está en error por una **recarga**, con el mismo `errorUpdateCount` `n`. Al llegar, B muestra su `MensajeError` mientras vuela su renovación. El programador ya lo armó; queda requerido;
  - (d) (Enmienda 3b) sin uso: quedó dentro de (c);
  - (e) pidiendo al llegar (petición retenida, B en error): ninguna más, y la retenida no se cancela (su respuesta se aplica);
  - (f) (Enmienda 3b, M-02) en Avisos y Dudas, B con su lista conservada tras un «Ver más» que falló: una petición. Mientras vuela (retenida), la lista de B sigue a la vista con «Ver más» en espera, sin ningún `role="alert"` ni texto de error, y el foco no se mueve. Al responder bien, sin aviso.

  Foco, en (b), (c) y (f):
  - con el foco en una fila de A, tras el salto está en el `h2` de la lista de B y sigue ahí después de la respuesta, también si la respuesta trae otras filas;
  - con el foco en el control segmentado, no se mueve ni con el salto ni con la respuesta;
  - (Avisos, N-01) con el foco en «Ver más avisos» de A y B también con página siguiente: tras el salto está en «Ver más avisos» de B (es el mismo nodo; ATQ-CH6-31). Si la renovación de B llega sin página siguiente y **sin filas nuevas** (las mismas de la caché), el botón desaparece y el foco va al `h2` de Avisos. Si trae filas nuevas, va a la primera fila nueva de B (`useFocoAlCargarMas`). Nunca a una fila de A ni a `<body>`.
- **CH6-B17 · DH-10 (b): si la renovación falla, el aviso es el de B.**
  - Recursos y Actividades, en el estado (c) de CH6-B16 (Enmienda 3b: en la variante "falló con B fuera de la vista", que deja la lista con datos y sin aviso previo), con la renovación que responde `503`: un solo «No pudimos actualizar…», después del salto; nada al llegar; la lista de B se queda; el foco no se mueve.
  - Avisos y Dudas, mismo estado: la lista de B sigue reemplazada por su `MensajeError` (el texto del error de B, que ya tenía al llegar) y no sale ningún aviso.
  - En las cuatro, con la renovación de A en vuelo al saltar (A en error y pulsada su sección) y que falla ya en B: ningún aviso ni mensaje en B. Al volver a A, ningún aviso de ese fallo (R8), y la lista de A se pide una vez.
- **CH6-B18 · La Regla de la clave (§D-4).**
  - (a) Avisos y Dudas: la página siguiente de A falla con la lista a la vista y avisa una vez; salto a B (sana) y regreso a A: ningún aviso más; un fallo nuevo de la página en A avisa una vez. (Enmienda 3b, M-02) Al regresar a A, la librería pide su lista. Mientras vuela (retenida), la lista de A sigue a la vista, sin ningún `role="alert"` ni texto de error.
  - (b) `useMarcarViejaSiQuedoEnError` al saltar: Avisos de A en error (el `400` del cursor), salto a B: la consulta de A queda `isInvalidated` y la de B no. (Enmienda 3b) Es una regresión que ya cumple la librería; no vigila al gancho, que vigilan CH6-B02 (a) a (c).
  - (e) (Enmienda 3b, M-02) `useListaConservadaTrasLaPagina` con `renderHook`:
    - con `isFetchNextPageError` y un `503` devuelve verdadero;
    - con un `rerender` que pone `isFetchNextPageError` en falso, mismo `errorUpdateCount`, `isError` y la misma clave, sigue en verdadero;
    - con otra clave y el mismo `errorUpdateCount`, falso;
    - con otro `errorUpdateCount` (un fallo nuevo de una recarga), falso;
    - con un `400` del cursor, falso desde el principio.
    - (Enmienda 5) Se reescribe para la firma nueva: `queryKey` y `errorUpdatedAt` en lugar de la cadena `clave`. La consulta se crea en la caché del `QueryClient` del caso antes de llamar al gancho, por ejemplo con `queryClient.getQueryCache().build(queryClient, { queryKey })`; si falta, el caso falla con un mensaje. Los puntos que hablaban de "otra clave" pasan a "otra consulta". Se suman:
      - otra consulta con el mismo par: falso;
      - desmontar el gancho y montarlo otra vez sobre la misma consulta, con `isFetchNextPageError` en falso y el mismo par: verdadero. Es T-04 a nivel del gancho;
      - dos ganchos montados a la vez sobre la misma consulta: los dos verdaderos;
      - `resetQueries` de la consulta y después un error con el mismo `errorUpdateCount` y otro `errorUpdatedAt`: falso;
      - un `QueryClient` nuevo con la misma `queryKey`, el mismo par y `Date` fijo (`vi.setSystemTime`): falso. Es el aislamiento entre clientes.
    - Es prueba nueva de 06b, `features/clases/recargas-ch6.test.tsx`, que el programador ya escribió: la cambia él y no entra en la lista cerrada.
- **CH6-B19 · (Enmienda 5) Los estados vecinos de T-04 y T-05 que no cubren ATQ-CH6-36 ni ATQ-CH6-37.** Van en `features/clases/ver-mas-ch6.test.tsx`, con el router real y la configuración de `app/providers.tsx`. En cada uno, mientras vuela la recarga que recupera la lista conservada (retenida), la lista sigue a la vista con «Ver más» en espera, sin `role="alert"` ni texto de error y sin petición de más; al responder bien, sin aviso:
  - (a) en Avisos y en Personas, volver de otra sección **dos veces seguidas** con la recuperación todavía en vuelo;
  - (b) en Avisos, la recuperación que lanza una invalidación por comentar, seguida de ir a otra sección y volver;
  - (c) en Personas y en comentarios, el salto de clase A → B → A con la renovación de A ya en vuelo al saltar. Son listas que se montan de nuevo por su `key`;
  - (d) en Dudas, A → B → A → B con las dos conservadas y las dos renovaciones en vuelo: al llegar a B la segunda vez, B se conserva;
  - (e) en Avisos, la recuperación que **falla** después de volver de otra sección: la lista se reemplaza por su `MensajeError`, sin aviso y sin «Ver más». Es la regresión de DH-02 (a) por el camino nuevo;
  - (f) en Avisos, la consulta quitada con `removeQueries` mientras la vista está en otra sección: al volver, la primera carga nueva no tiene marca y, si falla, reemplaza.
  - (c) `useRenovarSiLaPublicacionYaNoEsta` con `renderHook`: con `PUBLICACION_NO_ENCONTRADA` y un `errorUpdateCount` distinto, un `rerender` a otra clave (otra clase o publicación) no invalida nada; un fallo nuevo después sí, una vez.
  - (d) Comentarios abiertos de una publicación de A con su `404` ya avisado por el bloque, y salto a B: ninguna renovación de la lista de Avisos de B. Es la regresión del montaje de nuevo por la fila.

### Mutaciones que deben hacer caer su caso

| Subentrega | Se quita | Debe caer |
|---|---|---|
| 06a | `key={claseId}` de `maestros-de-clase-view.tsx` | CH6-A01, CH6-A03 (maestro) |
| 06a | `key={claseId}` de `alumnos-view.tsx` | CH6-A02, CH6-A03 (alumno) |
| 06a | `key={tarea.id}` de `detalle-tarea-view.tsx` | CH6-A04, CH6-A05 |
| 06a | la `key` compuesta del contenido de `entrega-de-alumno-view.tsx` (entera) | CH6-A06 |
| 06a | (Enmienda 1, M-01) la parte de `tareaId` de esa `key` (queda `key={alumnoId}`) | CH6-A06, camino "mismo alumno, otra tarea", y CH6-A30 (c) |
| 06a | `key={tareaId}` del contenido y, aparte, la guarda de `useMontado` de `editar-tarea-view.tsx` | CH6-A07 (lo escrito) y CH6-A07 (no navega), cada uno |
| 06a | la guarda de `useMontado` de `crear-tarea-view.tsx` | CH6-A09 (no navega) |
| 06a | la línea de `creandoEn !== claseId` de `trabajo-view.tsx` | CH6-A11 («Nuevo tema») |
| 06a | `key={claseId}` de `FormularioPublicacion` | CH6-A11 (Avisos) y CH6-A30 |
| 06a | la guarda de `errorQueRedirigeElCliente` de un gancho (uno por grupo: maestros, alumnos, publicaciones, temas, categorías) | su fila de CH6-A15 |
| 06a | (Enmienda 1, M-02) la guarda de `formulario-clase.tsx` y, aparte, la de la subida de `formulario-publicacion.tsx` | sus filas de CH6-A15 |
| 06a | (Enmienda 1, M-02) en `features/tareas/hooks.ts`, la guarda de `useEditarTarea`, la de `avisarDelErrorDeLaEntrega` y la de `useAvisoDeRecargaFallida` (cada una); y la de la subida de `formulario-de-entrega.tsx` | sus filas de CH6-A18 |
| 06b | `isStale` de la condición de PR-1 | CH6-B01 (b) y (c), CH6-B08 |
| 06b | la comprobación de `isFetching` de PR-1 (Enmienda 3: esta fila la reemplaza la de PR-3, más abajo; sola no hace caer el caso) | CH6-B01 (f), CH6-B07 |
| 06b | `useMarcarViejaSiQuedoEnError` de una lista (Avisos) (Enmienda 3b, M-01: **redundancia declarada**. En la vista no puede caer, porque la acción `error` de la librería ya deja la consulta inválida, `query.js:450-462`. El gancho lo vigilan sus filas de abajo, con CH6-B02) | — (CH6-B04 sigue como caso de camino) |
| 06b | `&& !conserva` de la condición de error de una lista (comentarios, y un inicio) | CH6-B10 de esa lista |
| 06b | `useRenovarSiLaPublicacionYaNoEsta` | CH6-B13 |
| 06b | las dos llamadas de `useMarcarViejasLasVentanas` (cada una) | CH6-B14 (a) y (b) (Enmienda 4: también CAL-1D03d y C-20 con la de (a), y C-19 con la de (b)) |
| 06b | (Enmienda 4, P-1) la condición de la frase en (a): marcar siempre al pulsar | CAL-1D03e (con la tabla sana espera cero marcas) y C-20 (tres marcas donde espera dos) |
| 06b | (Enmienda 4b, M-01) volver a "se ve ahora": el manejador y la limpieza miran solo `ocurrenciaDelCursor !== null` del render, sin `fraseSinMarcarRef` | CH6-B14 (f), (g) y (h): «Alumnos siguientes» sirve W de la caché |
| 06b | (Enmienda 4b, M-01) no apagar la frase al marcar (`fraseSinMarcarRef` no vuelve a `null`) | C-20 y CH6-B14 (f): la segunda pulsación, con la tabla sana, marca otra vez |
| 06b | (Enmienda 4b, M-01) quitar la comparación con `fraseMarcadaRef` en el efecto que enciende la frase | CH6-B14 (f), en su última pulsación: W, servida de la caché con la ocurrencia ya marcada mientras se vuelve a pedir, enciende otra vez la frase, y esa pulsación con la tabla sana marca. Si la caché no llega a mostrar W en ningún render y el caso no cae, se declara la redundancia con ese mecanismo; no es PA-7 |
| 06b | la guarda de `fetchStatus` de `useRecuperarListaDeClasesAdmin` | CH6-B09 |
| 06b | (Enmienda 1, N-03) la comprobación con `listaTraeLaClase` (invalidar siempre) | CH6-B15, caso del maestro desde "Clases archivadas" (Enmienda 4: con el mecanismo nuevo, la mutación equivalente es quitar el `predicate` e invalidar las dos claves enteras sin condición) |
| 06b | (Enmienda 4, P-2) el `predicate` con `listaTraeLaClase` (invalidar las dos claves enteras en cuanto alguna consulta trae la clase, la forma anterior) | CH6-B15 (alumno: 3 peticiones de la barra donde espera 2) y CH6-B15 (maestro con el inicio en caché, A → B → A: la barra se pide de nuevo) |
| 06b | (Enmienda 4, P-2) `{ cancelRefetch: false }` de esas invalidaciones | CH6-B15 (alumno), si la segunda corrida llega con la barra en vuelo. Si el caso no la retiene y no cae, el programador retiene la petición de la barra en ese caso, para que la segunda corrida la encuentre en vuelo |
| 06b | (Enmienda 3, PR-3) la comprobación de `isFetching` **y** `{ cancelRefetch: false }` a la vez (cada una sola es redundante con la otra para el conteo, como O-05; se declara así en el resumen, sin PA-7) | CH6-B01 (f), CH6-B07, CH6-B16 (e) |
| 06b | (Enmienda 3b, M-01; reemplaza la fila de la Enmienda 3, que no podía caer) en `dudas-view.tsx`, volver a la llamada de `023b450` (`useAlPulsarLaSeccionActiva(() => { if (!dudas.isError) return; void dudas.refetch() })`) en lugar de `useRecargarAlPulsarLaSeccion` | CH6-B16 (c) Dudas, por conteo: dos peticiones, porque `refetch()` cancela la del observador y pide otra |
| 06b | (Enmienda 3, DH-10 a) la línea de H-R2 en `enfocarPublicacion` (`muro-view.tsx`) | CH6-B16, foco con «Ver más avisos» que desaparece |
| 06b | (Enmienda 3, DH-10 b) la `clave` de `useAvisoDeRecargaFallida` en `trabajo-view.tsx`, cambiada por una constante | CH6-B17 (Actividades), además de CH6-A21 |
| 06b | (Enmienda 3) la `clave` del aviso del fallo de la página en `muro-view.tsx`, cambiada por una constante | CH6-B18 (a) Avisos |
| 06b | (Enmienda 3) `huella` de las dependencias del efecto de `useMarcarViejaSiQuedoEnError` (Enmienda 3b: solo cae con el error armado a mano sin `isInvalidated`) | CH6-B02 (b). CH6-B18 (b) no cae: es regresión de la librería |
| 06b | (Enmienda 3b) la limpieza de `useMarcarViejaSiQuedoEnError` (el `return () => …` del efecto) | CH6-B02 (a) y (b) |
| 06b | (Enmienda 3b, M-02) en `useListaConservadaTrasLaPagina`, devolver solo `ahora` (sin la marca) | CH6-B10 (la recuperación por cada camino: aparece el `role="alert"` mientras vuela), CH6-B16 (f), CH6-B18 (a) (regreso) y (e) (el `rerender` sin dirección) |
| 06b | (Enmienda 3b, M-02) en la marca, comparar solo el `errorUpdateCount`, sin la clave | CH6-B18 (e) (otra clave con el mismo `errorUpdateCount`) (Enmienda 5: esta fila la reemplazan las cuatro siguientes, porque la marca ya no lleva la clave en una cadena) |
| 06b | (Enmienda 5, T-04) la marca de vuelta a un `useState` del gancho, en lugar del `WeakMap` por consulta | ATQ-CH6-36 (las 11 filas) y CH6-B19 (a), (b) y (c); CH6-B18 (e) (montar de nuevo) |
| 06b | (Enmienda 5, T-05) una sola variable de módulo (la última marca), en lugar de una por consulta | ATQ-CH6-37 (los 2) y CH6-B19 (d); CH6-B18 (e) (otra consulta con el mismo par) |
| 06b | (Enmienda 5) la marca sin `errorUpdatedAt` (solo `errorUpdateCount`) | CH6-B18 (e) (`resetQueries` y un error posterior con el mismo contador) |
| 06b | (Enmienda 5) un `Map` de módulo por `queryHash` en lugar del `WeakMap` por instancia | CH6-B18 (e) (un `QueryClient` nuevo con la misma clave, el mismo par y `Date` fijo) |
| 06b | (Enmienda 3b, M-02) el primer argumento de `useFocoAlPasarAError` en `muro-view.tsx` de vuelta a `publicaciones.isError` | CH6-B10 (Avisos): con el foco en una fila de la lista conservada, la recuperación falla y la lista se reemplaza; el foco debe ir al `h2`. Si no cae porque el efecto de la fila de la vista ya lleva el foco al `h2`, se declara la redundancia con ese mecanismo y el caso que sí lo vigila; no es PA-7 |
| 06b | (Enmienda 3) el bloque de la clave de `useRenovarSiLaPublicacionYaNoEsta` | CH6-B18 (c) |
| 06b | (Enmienda 3) la condición de red o `5xx` de `conservaLaListaTrasLaPagina` (volver a "todo salvo cursor, acceso y redirección") | CH6-B11 (otros `4xx`), CH6-B13 («Ver más comentarios» con `404`) |
| 06b | (Enmienda 3) la limpieza al desmontarse de §D-6 (b) | CH6-B14 (b) y (d) |

Si un caso pasa sin su remedio: PA-7. (Enmienda 3) Las redundancias declaradas aquí (PR-3, y la clave donde la vista se monta de nuevo por su `key`) no son PA-7: el resumen las nombra con su mecanismo y con el caso que sí cae. (Enmienda 3b) Tampoco lo son PR-2 en la vista (la librería marca el fallo) ni el argumento de `useFocoAlPasarAError` si cae en el caso previsto. Se retira la fila de `tambienEnVuelo` de la Enmienda 3, porque el parámetro se retira.

### Regresión

- 06a: `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` y `npm run lint` en cada ronda.
- 06b: `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` y `npm run lint` en cada ronda. (Enmienda 3) Incluye las pruebas de 06a (`src/app/estado-por-id-ch6*`, `src/lib/estado-por-id-estatico-ch6.test.ts`), que deben seguir en verde salvo C-14 si cae. La regla de "Mutaciones" es la de `AGENTS.md` › Pruebas: quitar el remedio en el archivo real, ver caer el caso y restaurar desde una copia, comprobando que el archivo quedó igual (`cmp` o `git diff` contra `023b450` más lo de la ronda).
- La suite completa del frontend y `npm run build`, una vez por subentrega, en la verificación del manager al cerrarla. Sin backend: no se toca `shared/`.

## Puntos de ataque para el Tester

Por mecanismo, no por control (lección 2 de ADMIN-01).

1. **M-1, lo abierto de un id en otro.** Cualquier ruta con un id (`:claseId`, `:tareaId`, `:alumnoId`, `:recursoId`, `:usuarioId`) y cualquier estado local que la vista pinte: confirmaciones, formularios, bloques desplegados, filtros, ventanas, contadores de reinicio, la espera de la lectura fresca. Saltos del historial con el destino en caché (y sin él), A → B → A → B, la misma persona o el mismo tema en las dos clases (la `key` debe ser única por el id de la ruta: lección 3 de CHORE-04). Que nada abierto pase, que nada escrito se envíe al otro id, que ninguna respuesta del anterior navegue, reinicie o enfoque en el nuevo, y que el foco vaya al título, a la raíz o al `h2`, nunca a `<body>`. Una vista nueva bajo la clase sin `key` que la regla CH6-A30 no vea es observación con propuesta para endurecerla.
2. **M-2, avisos con la página que se va.** (Enmienda 1) Cada aviso de error de una mutación, una subida, una descarga o una recarga en todo `src/` salvo `features/auth` (ganchos, componentes y manejadores de `features/clases`, `features/tareas`, `features/calificaciones`, `features/admin` y `components/`) ante los tres códigos; con la vista montada y desmontada. La descarga de `components/adjuntos` sin `alFallarLaDescarga` es una decisión tomada (DH-04): observación, no hallazgo. Y lo contrario: un código que **no** redirige (un `401` sin token enviado) no debe quedar mudo donde antes avisaba (R-03).
3. **M-3, pulsar la sección y volver.** Cada lista de §D-4 en sus estados: sana fresca, sana vieja, en error con y sin datos, pidiendo, recién montada con un fallo ya ocurrido; pulsar dos veces; pulsar con una página siguiente en vuelo; volver antes y después de 30 s; atrás y adelante. Que ninguna petición se cancele ni se duplique y que cada frase desaparezca por cada camino.
4. **M-4, la página siguiente.** Cada lista de §D-5 con `5xx`, red, `400` del cursor, `403`, `401`, `404` de la publicación o de la duda; dos fallos seguidos; página y recarga a la vez; foco en «Ver más»; la vista desmontada. Que haya un solo mensaje por fallo y nunca uno de más mientras la página se va.
4 bis. (Enmienda 3) **DH-10, el salto de clase como pulsación, y la Regla de la clave.**
   - Saltos A → B → A → B en las cuatro listas que sobreviven, con B en cada estado de CH6-B16 y con la renovación de A en vuelo.
   - Un fallo que llega justo en el render del salto: se aceptó en 06a que no se avisa, igual que una vista con `key`.
   - `StrictMode`.
   - Que ninguna petición sea de A estando en B, que ningún aviso ni mensaje de A salga en B, y que la respuesta no mueva el foco salvo que quite el control que lo tenía (entonces, el `h2`).
   - Cualquier gancho de 06b con memoria cuya clave no sea la del id que protege.
   - PR-2 con una petición en vuelo que responde bien después de salir: ninguna petición de más al volver.
   - (Enmienda 3b, M-02) La recarga que recupera una lista conservada, por cada camino (pulsar, volver, el salto, el regreso, una invalidación): ningún `role="alert"`, texto de error ni salto de foco mientras vuela. Y lo que DH-02 (a) dejó igual: una recarga de fondo que falla sin un fallo de página antes sigue reemplazando la lista, también mientras se recupera.
5. **N-52 y la barra.** Las ventanas del gradebook tras pulsar o salir con la frase a la vista; la barra y los inicios tras leer una clase archivada, en los tres roles. (Enmienda 2, O-E1-2) `listaTraeLaClase` con una forma inesperada en la caché bajo `CLAVE_CLASES_INSCRITAS` o `CLAVE_CLASES_IMPARTIDAS` (datos sin `pages` ni `clases`, `pages` vacío, una página sin `clases`, filas sin `id`, `null`, `undefined`, una consulta en error sin datos): que no lance, que devuelva falso y que el gancho no invalide por ella, y que una forma válida junto a una inesperada siga encontrando la clase.

**Decisiones tomadas que no son hallazgo** (se anotan como observación, sin prueba roja):
- Volver al id anterior con su petición en vuelo deja los controles sin espera; pedir la acción otra vez exige volver a confirmar y el servidor responde con su error (S-03).
- Lo que el plan deja fuera (DH-05): el foco al cambiar de sección o abrir una tarea, el seguimiento del foco de la ventana, O-1/O-2 y O-7/O-8 de CLASES-03e, O-r1-6 de CHORE-03, O-r1-1 de CLASES-03e.
- Las variantes registradas de la política (`features/admin`, `/admin/clases`, "Clases anteriores", Calificaciones; §D-4).
- Una recarga de fondo que falla sigue reemplazando la lista (T-04 de 02c; DH-02 (a)).
- (Enmienda 3) El salto de clase vuelve a pedir la lista de B si está en error o vieja (DH-10).
- (Enmienda 3) Las listas que se montan de nuevo con el salto (secciones de un tema, comentarios, respuestas, Personas, el roster y Calificaciones) no cuentan el salto como pulsación: piden según `refetchOnMount`, y la consulta en error ya está vieja por la librería (Enmienda 4: antes decía "y PR-2").
- (Enmienda 3) Un `4xx` en la página siguiente reemplaza la lista: solo la red y el `5xx` la conservan (DH-02 (a)).
- (Enmienda 3) En las entregas de una tarea, la página que falla con la vista desmontada no se avisa (O-01, §D-5). (Enmienda 3b) Al volver, la lista se vuelve a pedir: el fallo la dejó inválida.
- (Enmienda 3b) En el tema de Actividades, la página en vuelo al salir se aborta (`signal`) y no falla: al volver no se pide nada antes de los 30 s.
- (Enmienda 4, N-06 del manager) Que la consulta se vacíe con la vista montada (`removeQueries` o `clear` al cambiar de sesión, `features/auth/hooks.ts:46` y `:118`) devuelve `errorUpdateCount` a 0. Así, un fallo de recarga posterior podría repetir el número de la marca de `useListaConservadaTrasLaPagina`. Al cambiar de sesión la vista se desmonta, así que no se alcanza, y la marca no suma `errorUpdatedAt`. Es observación, no hallazgo.
- (Enmienda 4, P-1) Con la tabla sana, pulsar «Calificaciones» no marca las ventanas; solo vuelve a pedir la primera (T-08).
- (Enmienda 4b, N-01; R-12) Una petición de la barra que ya volaba antes de que se archivara la clase se une a la invalidación (`cancelRefetch: false`) y puede dejar la clase en la barra hasta su siguiente recarga.
- (Enmienda 4b) Con `StrictMode` y la frase vista en el primer montaje, la limpieza simulada marca una vez de más, sin pedir nada.

## Riesgos y desacuerdos

- **R-01 · Tamaño (Enmienda 1).** 06a y 06b tienen 32 archivos cada una (06b, hasta 34 si caen las dos condicionales): "unos 30", como CHORE-04 (33); el humano decidió no partir más (DH-06 (a)).
  - (Enmienda 3) 06a cerró con 38. 06b arranca con 38 (hasta 41): 19 de producción (sin cambio), 4 pruebas nuevas, 3 de la lista cerrada y 12 `*.ataque` del tester (C-3 a C-9, C-13 y C-15 a C-18). Lo que crece desde 32 son pruebas que ya existen y cuya reescritura va redactada aquí: C-13, C-15 a C-18 y `publicacion-del-muro.test.tsx`.
  - **No la parto.** El corte natural sería por mecanismo: M-3, DH-10 y §D-6 (unos 25 archivos) y M-4 (unos 23). Pero las 9 listas de M-4 son también 9 de las 12 de M-3, así que el total subiría a unos 48 y cada lista se tocaría dos veces. La parte del programador (producción, pruebas nuevas y lista cerrada) son 26 archivos.
  - Si el humano prefiere partir, ese es el corte.
  - (Enmienda 4) 06b pasa a 40 archivos, hasta 43 con las tres condicionales (PR-C18, C-10 y C-14, que no cayeron en la corrida del programador).
    - Suman `gradebook-01d.test.tsx` (lista cerrada) y `secciones-01d-r4.ataque.test.tsx` (C-20).
    - Producción sigue en 19 y la parte del programador sube a 27.
    - Sin contar las condicionales no pasa de 41, así que no hace falta volver a preguntar al humano por el tamaño.
  - (Enmienda 5) **El árbol de 06b tiene hoy 42 archivos:** los 40 del plan más los 2 `*.ataque` de la ronda 1 del tester (`features/clases/recargas-ch6b-r1.ataque.test.tsx` y `features/calificaciones/gradebook-ch6b-r1.ataque.test.tsx`). El remedio de T-04 y T-05 no suma ninguno. Con las tres condicionales, hasta 45.
    - **Pasa de 41 sin las condicionales. Como el humano pidió que se le pregunte en ese caso, va como confirmación.**
    - **Recomendación: no partir.** Lo que crece son pruebas del tester, que en 06a también contaron (38). Partir ahora, en medio de las rondas, obligaría a repartir pruebas que atacan código ya escrito en los dos lados.
    - Si el humano prefiere partir, el único corte limpio sigue siendo el que señaló el manager: una 06c con N-52 del gradebook (§D-6, primera viñeta). Hoy serían unos 7 archivos: `gradebook-view.tsx`, `features/calificaciones/hooks.ts`, `gradebook-ch6.test.tsx`, `gradebook-01d.test.tsx`, C-8 y C-19 en el mismo archivo, C-20 y `gradebook-ch6b-r1.ataque.test.tsx`. Eso dejaría 06b en unos 35.
- **R-02 · La regla CH6-A30 solo ve la forma de una línea.** Una vista nueva con un render prop de varias líneas no la dispara. Lo mitiga la viñeta de `CLAUDE.md` (A-1) y el ataque del punto 1.
- **R-03 · `errorQueRedirigeElCliente` mira el código, no si hubo redirección** (§D-3). En las vistas de una clase la sesión existe y la ruta no es de las de sin sesión, así que `apiClient` siempre redirige ante esos códigos. (Enmienda 1) Es la regla que ya siguen CLASES-03, ADMIN-01, `features/calificaciones` y, en `features/tareas`, calificar, la descarga y los «Ver más»; esta enmienda la extiende al resto de `features/tareas` (DH-04).
- **R-04 · Cambio visible declarado (06a).** Al cambiar de clase con un salto del historial, el foco que estaba en un formulario, en Personas o en Calificaciones va al título de la clase (antes se quedaba en el control de la otra clase). Al cambiar de tarea, alumno o recurso, a la raíz de la vista.
- **R-05 · Cambio visible declarado (06b).** Pulsar la sección con la lista vieja la vuelve a pedir (DH-03 b). Tras el fallo de «Ver más», la lista se queda con un aviso (DH-02 a): el foco se queda en «Ver más» en lugar de ir al encabezado. (Enmienda 3) Saltar con «Atrás» o «Adelante» a la misma sección de otra clase vuelve a pedir la lista de esa clase si estaba en error o vieja (DH-10). Volver a una lista cuya recarga falló mientras la persona estaba en otra sección la vuelve a pedir (Enmienda 3b: por la librería, no por PR-2). (Enmienda 3b, M-02) Mientras se recupera una lista conservada tras un «Ver más» fallido, la lista sigue a la vista, sin mensaje de error.
- **R-11 (Enmienda 3) · retirado (Enmienda 3b, M-01).** Su premisa era falsa: con TanStack Query 5.103.2, un fallo deja la consulta inválida aunque llegue con la vista desmontada. `tambienEnVuelo` no hacía nada, y `features/admin` no tiene esa laguna. No va ninguna fila a `docs/ESTADO.md`.
- **R-12 (Enmienda 4b, N-01) · `{ cancelRefetch: false }` puede unirse a una petición de la barra anterior al archivo.**
  - *Mecanismo.* Si la barra ya se estaba pidiendo cuando corre el primer efecto de `useClaseArchivadaEnSuLista`, la invalidación con `{ cancelRefetch: false }` se une a esa petición (`query.js:298-303`) en lugar de lanzar otra. Si el servidor la contestó antes de archivar la clase, la respuesta todavía la trae y la barra se queda con ella. El efecto no vuelve a correr en el maestro. En el alumno, la segunda corrida (`ClaseAnteriorView`) casi siempre llega antes de esa respuesta y vuelve a unirse.
  - *Choca con un principio del propio gancho.* "Clases anteriores" lo documenta al revés: "lo que está en vuelo se pidió antes de saberlo" (`features/clases/hooks.ts:449-452`, T-04 de ADMIN-01d2), y por eso allí se quita de la caché.
  - *Por qué se acepta.* Es el precio de PR-3: sin `cancelRefetch: false`, la segunda corrida del alumno cancela y repite la barra (CH6-B15). El daño es bajo y transitorio. La clase queda en la barra, abrirla lleva a su vista de solo lectura con el aviso de archivada, que vuelve a correr el efecto, y sale en la siguiente recarga de la barra.
  - *Por qué no hay remedio barato dentro de 06b.* Cancelar solo la primera vez exigiría distinguir la primera corrida de la segunda (una memoria compartida entre `ClaseLayout` y `ClaseAnteriorView`). Quitar la barra de la caché, como en "Clases anteriores", la dejaría sin datos mientras se vuelve a pedir, y es una lista activa. Las dos opciones cambian más de lo que arreglan.
  - Se registra aquí y en "Decisiones tomadas que no son hallazgo".
- **R-06 · Dos implementaciones de una política.** `features/admin` y las listas de clases del admin usan `resetQueries` (vuelven a la primera página sin las demás); `features/clases`, `refetch` (vuelve a pedir desde la primera tantas páginas como había). Las dos cumplen "desde la primera página, sin cancelar ni duplicar". Unificar la implementación cambiaría conductas probadas en ADMIN-01 sin beneficio para la persona; queda registrado en `CLAUDE.md` (A-1).
- **R-07 · La Forma C observa la consulta dos veces** (marco y contenido). Misma clave, una sola petición; si una prueba que cuenta llamadas al montar cambiara de cifra, es PA-1, no se ajusta a mano.
- **R-08 · DH-05 deja el foco al cambiar de ruta en `<body>`** hasta el encargo que lo tome. Es lo que pasa hoy.
- **R-09 (Enmienda 1) · Un punto en que difiero de la revisión del plan.** M-03 da por hecho que PR-C18 (`muro-view.test.tsx:344`) y la de `muro-recuperar-c-r4.ataque.test.tsx:208-223` cambian de sentido porque sus clientes no tienen `staleTime`. Pero la lista de Avisos no usa el `staleTime` del cliente: `usePublicaciones` fija el suyo (`features/clases/hooks.ts:1023-1027`, 240 s o hasta que venza una vista previa firmada), así que, recién pedida y sin adjuntos, está fresca y PR-1 no pide. Las dejo como condicionales, con su reescritura ya redactada (lista cerrada y C-10). (Enmienda 2) El manager me dio la razón en la verificación de la Enmienda 1; siguen condicionales.
- **R-10 (Enmienda 1) · La descarga de `components/adjuntos` sigue avisando** ante un código que redirige mientras no llegue su destino (DH-04): un aviso que dura lo que la recarga de `irA`, solo si la sesión se pierde justo en ese clic.
- **Desacuerdos con `ARCHITECTURE-ESSENTIALS.md`:** ninguno.

## Comprobación humana

Decidida (DH-07 (a)): al cerrar 06b. Máximo 4 puntos, unos 8 minutos; solo lo que jsdom no ve (el historial real del navegador, la red cortada de verdad y el lector de pantalla). Lo hace el humano en su navegador; ningún agente abre uno.

- **H-1 · Quitar en otra clase (O-r1-1).** Como admin: abrir Personas de la clase B; después Personas de la clase A, con un maestro que también dé B. Pulsar «Quitar» de ese maestro y, con la confirmación abierta, mantener presionado «Atrás» del navegador y elegir la entrada de Personas de B (Enmienda 1, N-01: un solo «Atrás» lleva al muro de A, porque la barra entra a la clase por el muro). En B no hay confirmación y el foco (con su contorno) está en el nombre de la clase.
- **H-2 · Calificar a otro alumno.** Como maestro: abrir la entrega de un alumno, volver a "Entregas", abrir la de otro y escribir puntos sin enviar; mantener presionado «Atrás» y elegir la entrega del primero. El panel muestra lo del primero, sin los puntos escritos.
- **H-3 · «Ver más» sin red.** En Avisos con más de 20 anuncios, cortar la red (herramientas del navegador, "Sin conexión") y pulsar «Ver más avisos»: la lista se queda, sale un aviso y el botón sigue. Volver la red y pulsarlo: llegan los siguientes.
- **H-4 · Lector de pantalla (opcional, si hay NVDA).** En H-1 y H-3: al llegar a B se lee el nombre de la clase; el aviso del fallo se lee una vez.

## Paradas (el programador se detiene y reporta)

- **PA-1.** Una prueba normal fuera de la lista cerrada falla por el cambio.
- **PA-2.** Una `*.ataque` fuera de los C-n de su subentrega falla, o los C-n no están aplicados por el tester al empezar.
- **PA-3.** CH6-A30 falla en un archivo que no está en "Se toca", o exigiría aflojar una expresión.
- **PA-4.** Hace falta tocar un archivo de "No se toca" (por ejemplo `clase-layout.tsx`, `components/foco/`, `components/clase/`, `services/apiClient.ts`, `panel-mis-clases.tsx`, `bloque-destacado.tsx`), dar `mutationKey` a un gancho, o cambiar la firma de `useAvisoDeRecargaFallida`.
- **PA-5.** Con el remedio, el foco cae en `<body>` en un caso de §D-1 o §D-5. No se arregla tocando los ganchos de foco.
- **PA-6.** Un archivo gana o pierde un `enEspera=` (V-06 de `styles/clases-r1.ataque.test.ts`).
- **PA-7.** Un caso pasa sin su remedio (tabla "Mutaciones") y no se logra reescribir para que caiga.
- **PA-8 (06b).** `refetch({ cancelRefetch: false })` sobre una consulta por páginas en error repite el cursor vencido en lugar de calcularlo desde la primera página, o deja la frase a la vista después de responder bien.

## Pasos de implementación

**Antes de todo**, el programador pide al orquestador la respuesta del humano sobre si la otra copia de trabajo corre una suite (`AGENTS.md`, "Trabajo en paralelo"); sin ella, se detiene.

**CHORE-06a**
1. **Ronda 0 del tester:** C-1 y C-2 de §D-R0, y la confirmación del inventario con los `rg` de la lista cerrada. El programador arranca con C-1 y C-2 aplicados (si no, PA-2).
2. **Rojo primero:** escribir `app/estado-por-id-ch6.test.tsx` (CH6-A01 a A14 y A17), `features/clases/avisos-al-redirigir-ch6.test.tsx` (CH6-A15 y A16) y (Enmienda 1) `features/tareas/avisos-al-redirigir-ch6.test.tsx` (CH6-A18); correrlas con `npx vitest run src/app/estado-por-id-ch6.test.tsx src/features/clases/avisos-al-redirigir-ch6.test.tsx src/features/tareas/avisos-al-redirigir-ch6.test.tsx`; anotar cuáles fallan (se esperan rojas A01 a A12, A15, A16 y A18 salvo sus controles; verdes A13 (b) y A17).
3. **Forma A** (§D-1): las ocho `key` y la guarda de `useMontado` de crear tarea.
4. **Forma B:** los tres formularios con `key` y `creandoEn` de `trabajo-view.tsx`.
5. **Forma C:** `editar-tarea-view.tsx`, `editar-recurso-view.tsx` y `entrega-de-alumno-view.tsx` (marco y contenido), y la `key` de `detalle-tarea-view.tsx`.
6. **M-2** (§D-3): `hooks.ts`, `formulario-unirse-clase.tsx` y los cinco llamadores de `useAvisoDeRecargaFallida`; (Enmienda 1) `formulario-clase.tsx`, `formulario-publicacion.tsx` y `formulario-recurso.tsx`; y en `features/tareas`, `hooks.ts`, `formulario-tarea.tsx` y `formulario-de-entrega.tsx`, solo en las líneas de §D-3.
7. **Lista cerrada:** `features/clases/guardas-ch4.test.tsx`, exactamente como dice la lista.
8. **Regla estática:** `lib/estado-por-id-estatico-ch6.test.ts` (CH6-A30).
9. **Mutaciones** de la tabla (06a), una por una, restaurando y comprobando con `git diff`.
10. **Verificación de la ronda:** `npm run lint` (desde `frontend/`) y la suite de "Regresión" de 06a. Formateadores solo sobre `frontend/`.
11. **Resumen verificable:** cada CH6 con su archivo y título exacto; los casos existentes que cubren CH6-A14 (los dos vecinos que no cambian) y CH6-A17; las cifras con su comando (`npx vitest list`, contadas con `grep -a`); la última línea de `lint` y de la suite; la tabla de mutaciones con el caso que cayó; los hermanos por mecanismo de §D-1 y §D-3, uno por uno, con si el remedio aplica y se aplicó, y los estados vecinos de §D-1 recorridos; la matriz de §D-7; (Enmienda 1) la revisión de cada `key` de §D-1 con el criterio "única por todos los ids de la ruta"; el conteo final de archivos contra los 32 de §D-0.

**CHORE-06b** (después del commit de 06a)
12. **Ronda 0 del tester:** C-3 a C-9 (Enmienda 1) y la confirmación del inventario. C-10 solo si su condición se cumple (PA-2 del programador). (Enmienda 3) Además, C-13 y C-15 a C-18, con las precisiones a C-3 a C-7, y el repaso ampliado de §D-R0. C-14 solo si su condición se cumple (PA-2).
13. **Rojo primero:** escribir `components/seccion/recargas-ch6.test.tsx` (B01, B02), `features/clases/recargas-ch6.test.tsx` (B03 a B09 y B15), `features/clases/ver-mas-ch6.test.tsx` (B10 a B13) y `features/calificaciones/gradebook-ch6.test.tsx` (B14); correrlas y anotar cuáles fallan. (Enmienda 3) `features/clases/recargas-ch6.test.tsx` suma CH6-B16 a CH6-B18. CH6-B16 (a) y (b) y CH6-B18 (d) pueden salir verdes antes del cambio (hoy la vista ya cumple esa parte); el resumen dice cuáles. (Enmienda 3b, M-01; reemplaza la frase anterior) Se esperan **verdes antes del cambio**, y el resumen los nombra:
- CH6-B04 (c′) y la parte "se pide al volver" de CH6-B04 y CH6-B12 (c): lo cumple la librería, porque un fallo deja la consulta inválida;
- CH6-B16 (a) y (b): sana no se pide y vieja la pide el observador; hoy la vista no hace nada en ese estado;
- CH6-B18 (b) (la librería marca A) y CH6-B18 (d) (las filas se montan de nuevo).

Se esperan **rojos**:
- CH6-B16 (c) y (e): hoy salen dos peticiones o se cancela la que vuela;
- CH6-B16 (f), CH6-B12 (c) en su parte M-02 y la recuperación de CH6-B10: hoy la página fallida reemplaza la lista, o la recarga pinta el error mientras vuela;
- CH6-B02 y CH6-B18 (e): los ganchos todavía no existen donde se importan.

Si uno sale distinto, el resumen dice por qué.
14. **La política** (§D-4): `components/seccion/types.ts` y `hooks.ts` (el gancho nuevo y el movido), la reexportación en `features/admin/hooks.ts`; las 12 listas; las dos guardas de `fetchStatus`. (Enmienda 3b) El gancho movido sin cambio de firma (se retira `tambienEnVuelo` de la Enmienda 3); las 12 listas lo importan de `@/components/seccion/hooks`.
15. **«Ver más»** (§D-5): `conservaLaListaTrasLaPagina` en `lib.ts`; las 9 listas; `useRenovarSiLaPublicacionYaNoEsta` y su llamada en `comentarios-de-publicacion.tsx`. (Enmienda 3) La función es la de la Enmienda 3 (red o `5xx`). Cada `useAvisoDeRecargaFallida` nuevo lleva su `clave`, y `useRenovarSiLaPublicacionYaNoEsta` lleva la suya y la firma de cuatro argumentos.
16. **§D-6:** `useMarcarViejasLasVentanas` y sus dos llamadas en `gradebook-view.tsx`; `useClaseArchivadaEnSuLista`.
17. **Lista cerrada:** `ver-mas-y-orden-ch4.test.tsx` (CH4-30 (c) y CH4-31 (c)) y `personas-view.test.tsx:263`; (Enmienda 1) `muro-view.test.tsx:344` solo si cae, con la reescritura de la lista. (Enmienda 3) También `personas-view.test.tsx:274-275` y `publicacion-del-muro.test.tsx:84-97`, como dice la viñeta 5 de la lista.
18. **Mutaciones** de la tabla (06b).
19. **Verificación de la ronda:** `npm run lint` y la suite de "Regresión" de 06b.
20. **Resumen verificable**, como el paso 11, con la matriz de 06b y, por cada frase de recuperación, el caso de cada camino (nuevo o existente); el conteo contra los 32 de §D-0 (Enmienda 1), y si cayó alguna condicional. (Enmienda 3) El resumen trae además:
    - el conteo contra los 38 de la Enmienda 3;
    - el inventario de M-5 contrastado con el código, gancho por gancho, diciendo si la clave aplica y si se aplicó;
    - los estados vecinos de DH-10: B en cada estado, A en vuelo, ida y vuelta, `StrictMode` y un fallo en el render del salto;
    - las redundancias declaradas con su mecanismo.

**Reanudación de 06b tras las paradas P-1 y P-2 (Enmienda 4).** Hoy los pasos 13 a 17 están hechos y el programador se detuvo antes del 18.
- **R-0 · Tester, antes de que el programador reanude:** aplica C-19 y C-20 (§D-R0, Enmienda 4) con su texto exacto, y confirma con el grep del "Inventario de las marcas del gradebook" (§D-6) que no hay otra `*.ataque` que cuente marcas en el mismo sentido. Si la hay, la anota como C-n y avisa al manager. El programador no reanuda sin C-19 y C-20 aplicados (PA-2).
- **R-1 · Programador, lista cerrada nueva:** `gradebook-01d.test.tsx`, CAL-1D03d, con la entrada 6 de la lista y nada más.
- **R-2 · P-1 en producción:** en `gradebook-view.tsx`, la marca de (a) solo con la frase a la vista, con el cálculo de `ocurrenciaDelCursor` antes de la llamada a `useAlPulsarLaSeccionActiva` (§D-6, "La forma de (a)"). `features/calificaciones/hooks.ts` no cambia de lo que ya tiene. (Enmienda 4b, M-01; reemplaza "solo con la frase a la vista") La condición de (a) y de la limpieza de (b) es "la frase se vio y todavía no se marcó". Se implementa con `fraseSinMarcarRef` y `fraseMarcadaRef`, que reemplazan a `fraseALaVistaRef`. El efecto que la enciende se declara antes de `useAlPulsarLaSeccionActiva`. El manejador y la limpieza marcan y la apagan (§D-6, "La condición de (a) y (b)"). Antes del cambio de producción, rojo primero de CH6-B14 (f), (g) y (h) en `gradebook-ch6.test.tsx`: se esperan rojos con el código del árbol, porque nada marca W tras «Alumnos anteriores».
- **R-3 · P-2 en producción:** en `features/clases/hooks.ts`, `renovarLasListasSiTraenLaClase` invalida con el `predicate` de `listaTraeLaClase`, con `{ cancelRefetch: false }` (§D-6, "El mecanismo"). Se suma a `recargas-ch6.test.tsx` el caso del maestro con el inicio en caché (CH6-B15, Enmienda 4).
- **R-4 · Corrida corta:** `npx vitest run src/features/calificaciones src/features/clases/recargas-ch6.test.tsx` y `npm run lint`. Se esperan en verde:
  - CAL-1D03d (las 4 filas), CAL-1D03e, C-19 y C-20;
  - los cinco casos de CH6-B15 y el nuevo del maestro;
  - (Enmienda 4b) CH6-B14 (a) a (h).

  Si alguna otra prueba cae, es PA-1 o PA-2.
- **Después, los pasos 18 a 20 completos:**
  - las mutaciones de toda la tabla de 06b, incluidas las filas de la Enmienda 4;
  - la verificación con `npm run lint`, la suite de "Regresión" de 06b (completa otra vez, porque la última corrida fue antes de corregir el reloj de `gradebook-ch6.test.tsx`) y `npm run build`;
  - el resumen, con el conteo contra los 40 de la Enmienda 4 y con la matriz de §D-7 de "pulsar «Calificaciones»" (con y sin la frase) y de "la clase archivada leída dos veces" (alumno, maestro con el inicio en caché).

**Corrección de la ronda 1 del tester de 06b: T-04 y T-05 (Enmienda 5).** El programador no toca `recargas-ch6b-r1.ataque.test.tsx` ni `gradebook-ch6b-r1.ataque.test.tsx`.
- **K-1 · Rojo primero.** Escribe CH6-B19 (a) a (f) en `ver-mas-ch6.test.tsx` y la reescritura de CH6-B18 (e) en `recargas-ch6.test.tsx`. Las corre con el código de hoy. Se esperan:
  - **rojos:** CH6-B19 (a), (b), (c) y (d), y los casos nuevos de CH6-B18 (e) de montar de nuevo y de otra consulta (este último cae por el tipo del argumento, o por el mismo par si el programador arma el caso antes del cambio);
  - **verdes:** CH6-B19 (e) y (f), que son regresión.

  El resumen dice cuáles salieron distinto y por qué.
- **K-2 · Producción, solo en `features/clases/hooks.ts`:**
  - `useListaConservadaTrasLaPagina` con el `WeakMap` por consulta y la firma nueva (§D-5, "Enmienda 5");
  - en sus 9 llamadores (`muro-view.tsx`, `dudas-view.tsx`, `personas-view.tsx`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `components/comentarios-de-publicacion.tsx`, `components/respuestas-de-duda.tsx`, `components/seccion-de-tema.tsx` y `components/tabla-alumnos.tsx`), solo los argumentos de esa llamada.
  - Ningún otro cambio.
- **K-3 · Corrida corta:**
  - `npx vitest run src/features/clases/recargas-ch6b-r1.ataque.test.tsx src/features/clases/ver-mas-ch6.test.tsx src/features/clases/recargas-ch6.test.tsx src/features/clases/inicio-sin-datos-r2.ataque.test.tsx src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` y `npm run lint`;
  - se esperan en verde los 70 de `recargas-ch6b-r1` (los 13 de T-04 y T-05 incluidos), CH6-B18 (e), CH6-B19, C-15 y C-16;
  - si cae otra prueba, es PA-1 o PA-2.
- **K-4 · Mutaciones** de las filas de la Enmienda 5 y de las de M-02 que tocan el gancho ("devolver solo `ahora`"), restaurando desde una copia y comparando byte a byte.
- **K-5 · Verificación:** `npm run lint` y la suite de "Regresión" de 06b completa.
- **K-6 · Resumen de la corrección:**
  - cada caso con su título;
  - las mutaciones;
  - los hermanos del mecanismo, uno por uno: las 9 listas y los demás ganchos con memoria de §D-5, "Inventario por mecanismo", diciendo si el remedio aplica y si se aplicó;
  - los estados vecinos del inventario recorridos;
  - el conteo, con el comando.

## Al cierre (los aplica el orquestador, con la autorización del humano para los archivos fuera de `docs/trabajo/`)

- **A-1 · `CLAUDE.md`** (al cerrar 06b, con lo de 06a):
  - En "Ubicaciones compartidas", la viñeta de `components/seccion/` pasa a: "`components/seccion/` — `useAlPulsarLaSeccionActiva` (`hooks.ts`): llama a su función cuando se pulsa la sección en la que ya se está (otra `location.key` en la misma ruta). Sobre él, la política única de recarga (CHORE-06): `useRecargarAlPulsarLaSeccion` vuelve a pedir cada consulta que está en error o vieja, sin cancelar ni duplicar lo que vuela, y `useMarcarViejaSiQuedoEnError` (movido desde `features/admin`, que lo reexporta) marca vieja al salir una consulta que quedó en error, así que volver antes del `staleTime` la pide. Los usan las listas de `features/clases`; `features/admin`, `/admin/clases`, "Clases anteriores" y `features/calificaciones` tienen su variante (vuelven a la primera página con `resetQueries`, o a la ventana inicial)."
  - En "Componentes", una viñeta nueva después de la de la guarda: "Lo abierto es del id de la ruta (CHORE-06a): una vista bajo una ruta con id (`:claseId`, `:tareaId`, `:alumnoId`, `:recursoId`, `:usuarioId`) que guarda estado local (un formulario, una confirmación, un filtro, un contador de reinicios) lo monta de nuevo cuando el id cambia: `key` por ese id en el componente que pinta `ConClaseDeLaRuta`, o, si la vista tiene su raíz de foco, en el contenido debajo de ella (como `FichaDeLaCuenta`). La `key` es única por **todos** los ids de la ruta de los que depende lo que la vista escribe o muestra (la entrega de un alumno, por `tareaId` y `alumnoId` juntos), no por el id de una fila que puede estar en dos clases ni por el último id de la ruta. `lib/estado-por-id-estatico-ch6.test.ts` lo verifica en los render props de `ConClaseDeLaRuta`." (Enmienda 1, M-01)
  - En "Manejo de errores en el frontend", al final de "Textos del servidor": "Quien recibe un error de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`, en cualquier parte del frontend (una mutación, una subida, una descarga o una recarga), no avisa: `apiClient` ya saca a la persona de la página (CHORE-06a). Excepciones registradas: los formularios de `features/auth`, donde `apiClient` no redirige en las pantallas sin sesión, y la descarga de `components/adjuntos` sin `alFallarLaDescarga` (ESTADO §3)." (Enmienda 1, M-02.)
- **A-2 · `docs/DESIGN.md`:**
  - §7.10, después de la viñeta **Error**: "**Error de la página siguiente (CHORE-06b, propuesta):** si «Ver más» falla por la red o el servidor y la lista ya tiene filas, la lista se queda como estaba, un solo aviso dice el error («Algo salió mal. Inténtalo de nuevo.» o el de la red) y «Ver más» sigue a la vista para repetir; el foco se queda en el botón. El cursor vencido (la lista cambió) y un error que quita el acceso reemplazan la lista con su frase, como antes; una recarga de fondo que falla también la reemplaza. Lo implementan, desde CHORE-06b, Avisos, comentarios, Actividades, Dudas, respuestas, Personas, el roster y los inicios. Recursos, Entregas y Mis calificaciones van más allá: conservan la lista también cuando falla una recarga de fondo." (Enmienda 1, matiz del manager en DH-02.)
  - §7.14, al final: "**Lo abierto es de su clase (CHORE-06a, propuesta):** una confirmación, un formulario o un bloque abierto pertenece a la clase, tarea, alumno o recurso en que se abrió. Si la persona salta a otro con el historial, no aparece abierto en el nuevo ni reaparece al volver, y nada de lo escrito se envía al otro. Si el control que tenía el foco desaparece por eso, el foco va al título de la clase (al cambiar de clase) o a la raíz de la vista (al cambiar de tarea, alumno o recurso); en las listas de Avisos, Dudas, Actividades y Recursos, una fila con el foco lo lleva al encabezado de la lista, como antes."
- **(Enmienda 1, N-02) Cómo se ubican las filas.** El orquestador localiza cada fila de `docs/ESTADO.md` §3 por el texto con que empieza, no por el número (los números de abajo son del árbol de trabajo del 2026-11-12 y en `47c3339` van 3 líneas antes). Entre paréntesis, el inicio de cada fila.
- **A-3 · `docs/ESTADO.md` §3:** marcar hechas, con "Hecho en CHORE-06a" o "06b", las filas 346 ("CHORE-04, H-2 (S-04 de su plan)…"), 347 ("CHORE-04 (M-01 de la revisión de su plan), el aviso de más…"; con la Enmienda 1, también `features/tareas` y lo nuevo de `features/clases`), 348 ("**CHORE-04, H-3 (S-07 de su plan)…"), 360 ("ADMIN-01d1 (decisión 2 de su implementación): 12 entradas…"), 361 ("ADMIN-01d2: la barra lateral y las listas del inicio…"), 384 ("O-03 de la ronda 2 de CLASES-03c2…"), 397 ("Hermano de T-02 de CLASES-03e en Avisos y Recursos…"), 415 ("O-r1c-2 de CALIFICACIONES-01c…") y 446 ("N-52 de CALIFICACIONES-01d…"); en la 445 ("\"Vuelve a abrir Trabajo de clase para verlo completo.\"…", N-54), "el resto del inventario, hecho en CHORE-06b"; en la 416 ("`key={claseId}` de CALIFICACIONES-01d…"), que `GradebookView` lleva su `key` desde CHORE-06a; la 509 ("\"Ver más clases\" (inicios de a, `panel-mis-clases.tsx`)…") se cierra como ya resuelta (verificado en `47c3339`: `inicio-estudiante-view.tsx:56`).
- **A-4 · `docs/ESTADO.md` §3, filas que cambian de destino o se suman** (Enmienda 2: con las decisiones del 2026-11-12). Los dos encargos nuevos ya están en la sección 2b, en la viñeta "Dos encargos nuevos que salen de CHORE-06", que anotó el orquestador: (1) **el encargo del foco al cambiar de ruta**, antes de DEPLOY, con su lugar por definir, y el **`chore` de accesibilidad del marco**, después de DEPLOY; (2) **el encargo de la defensa en el servidor**, después de DEPLOY. A-4 no los vuelve a registrar en 2b; solo cambia el destino de las filas de §3 para que remitan a ellos:
  - **Al encargo del foco al cambiar de ruta (antes de DEPLOY; 2b, punto 1):** "Foco al cambiar de ruta en la SPA…" (444) y el punto (3) de "Foco tras navegar o reemplazar la vista, de ADMIN-01…" (362).
  - **Al `chore` de accesibilidad del marco (después de DEPLOY; 2b, punto 1):** los puntos (1), (2), (4) y (5) de la 362; las filas 391 ("O-1 y O-2 de CLASES-03e (manager)…"), 394 ("O-7 y O-8 de CLASES-03e…"), 400 ("Mecanismo de foco de `features/tareas`…"), 447 ("M-14 y O-20 de CLASES-02d…"), 526 ("Punto 9 de CALIFICACIONES-02b…"), 376 ("O-r1-6 de CHORE-03 03c…") y 392 ("O-r1-1 de CLASES-03e (tester)…").
  - **Sin cambio de destino:** 387, 398 y 356.
  - **Fila nueva (M-02, DH-04):** "CHORE-06a: la descarga de `components/adjuntos/adjuntos-de-publicacion.tsx:77` sin `alFallarLaDescarga` (Avisos y Recursos) avisa ante un código con que `apiClient` redirige. No se callaba sin importar `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` fuera de los `lib.ts` de módulo (N-46). El camino previsto (O-E1-1 del manager) es la prop `alFallarLaDescarga`, que ya existe en `AdjuntosDePublicacion`: pasarla desde `features/clases/components/publicacion-del-muro.tsx` y `elemento-de-recurso.tsx` con un manejador que calle ante esos códigos y avise lo demás con `mensajeDeErrorClases`" → destino: el próximo encargo que toque `components/adjuntos` (ENVIVO) o el `chore` de accesibilidad del marco, lo que llegue antes.
  - **La defensa en el servidor (DH-09):** sin fila en §3; ya la lleva la sección 2b (punto 2).
- **(Enmienda 3) Al cierre de 06b, además:**
  - **A-1.** La viñeta de `components/seccion/` suma, después de "sin cancelar ni duplicar lo que vuela": "(el salto del historial a la misma sección de otra clase cuenta como pulsarla; CHORE-06b, DH-10)". (Enmienda 3b: se retira la frase sobre `tambienEnVuelo`.) Se aplican también los dos ajustes de la viñeta "Lo abierto es del id de la ruta" que pide `revision.md` (Revisión final de 06a, "`CLAUDE.md` (A-1)").
  - **A-2.** El patrón de §7.10 dice "por la red o el servidor", como ya lo escribe; no cambia. (Enmienda 3b, M-02) Se suma una frase después de "el foco se queda en el botón": "Mientras una recarga recupera esa lista (al pulsar la sección, al volver a ella o al saltar de clase), la lista sigue a la vista, sin mensaje de error; si esa recarga falla, la reemplaza como cualquier recarga fallida".
  - **A-3.** Se cierra la fila de O-01 de 06a ("CHORE-06a: la página siguiente de «Ver más alumnos»…") como decisión tomada (§D-5, "O-01"). Según la instrucción de `revision.md` (verificación de los documentos del cierre de 06a, punto 4), ninguna fila de §3 queda nombrando "el `chore` de foco y navegación del marco".
  - **A-4, fila nueva (R-11): retirada (Enmienda 3b, M-01).** La laguna no existe; no va nada a `docs/ESTADO.md`.

