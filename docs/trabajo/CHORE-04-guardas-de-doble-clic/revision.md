# Revisión del Manager — CHORE-04 · guardas de doble clic — plan
Veredicto: CAMBIOS REQUERIDOS
Verificación propia: modo plan, sin suites (límite del encargo). Revisé `plan.md` (411 líneas, SHA-256 `3763a634ea9f409bed1a2da87a3cfb8c52c38610facc0c22c82b2d450af0f5a8`, coincide con `aprobacion.md`) contra el árbol de `9b6953c` (HEAD de la rama, sin cambios en paquetes). Leí el código de TanStack Query instalado (`@tanstack/query-core` 5.103.2, `mutationObserver.js`) para comprobar `reset()`, `setOptions()` y el orden de los callbacks.

Son dos problemas que bloquean, los dos pequeños y del plan, no del enfoque. El inventario, el patrón, el orden de la ref frente a `reset()`, la fila 29 (salvo M-02), la regla estática, la lista cerrada y §D-R0 están bien hechos y verificados. Con M-01 y M-02 resueltos, el plan queda para aprobarse.

## Problemas que bloquean

### M-01 — CH4-25 pide "ningún aviso" ante códigos que redirigen, pero 7 de los 8 controles de clases avisan hoy
Dónde: "Pruebas requeridas", CH4-25; también la matriz de §D-6 en lo que toca a "las que redirigen".
Por qué importa: CH4-25 dice que, con `403 ACCESO_RESTRINGIDO` y `401` sin refresco, no sale "ningún aviso del control (como hoy)" en los ocho controles. El código de `9b6953c` dice otra cosa:
- `useAgregarAlumno`, `useAsignarMaestro`, `useRetirarMaestro`, `useBorrarComentario`, `useBorrarPublicacion` y `useQuitarAlumno` (`features/clases/hooks.ts`) llaman a `toast.error(mensajeDeErrorClases(error))` en su `onError` sin mirar `errorQueRedirigeElCliente`.
- `formulario-unirse-clase.tsx:46-55` avisa con un toast ante `ACCESO_RESTRINGIDO` (lo dice su comentario N-04), y `features/clases/alumnos-b-r1.ataque.test.tsx:416-417` lo fija: "redirige con apiClient, avisa una sola vez y no marca el campo".
- Solo `useRegenerarCodigo` calla ante esos códigos (ADMIN-01d1).

El plan prohíbe tocar esos ganchos (§D-6, §D-7 y PA-4). Así, CH4-25 no se puede escribir en verde sin cambiar un gancho o contradecir una `*.ataque`. El programador caería en una PARADA segura, o peor, escribiría la prueba "como sale" sin decirlo.
Qué se espera: CH4-25 afirma, control por control, el aviso de hoy: regenerar, ninguno; los otros siete, uno solo. Se conserva lo que sí importa a este encargo: la ref se suelta y, con el control montado, otro clic manda la petición. La matriz de §D-6 se escribe con esa misma realidad. Si el arquitecto cree que esos siete deberían callar, es otro cambio, fuera de este `chore`: va como pendiente con destino (ver "Para el humano", punto 5), no dentro de CH4-25.

### M-02 — La `mutationKey` por clase deja «Subir» y «Bajar» tomados para siempre si cambia `claseId` sin desmontar la vista
Dónde: §D-4 (`useOrdenarTemas` con `mutationKey: claveOrdenDeTemas(claseId)`), CH4-37 y la lista de estados vecinos de §D-1 y de "Puntos de ataque" 4.
Por qué importa: es el estado vecino "cambio de clave" que la regla de hermanos exige revisar (decisión del humano del 2026-10-05), y el plan no lo trata. El encadenamiento es este:
1. `TrabajoDeLaClase` no lleva `key` y `ClaseLayout` pinta un `<Outlet />` sin `key` (`clase-layout.tsx:90`). El propio componente prevé ver otro `claseId` sin desmontarse: `clasePrevia` en `trabajo-view.tsx`.
2. `useMutation` llama a `observer.setOptions()` en cada render. En 5.103.2, `setOptions` hace `this.reset()` cuando cambia el hash de la `mutationKey`, y `reset()` quita el observador de la mutación en vuelo (`removeObserver`).
3. Desde ese momento, el `onSettled` del `mutate` ya no corre: `ordenandoRef` queda en `true` y el estado local `ordenEnVuelo` queda con el tema de la clase A mientras viva esa instancia. En la clase B, ningún «Subir» ni «Bajar» hace nada. Al volver a A por el historial, el control de A sigue en espera sin fin.

Hoy, sin la clave, el observador sigue atado y el `onSettled` suelta la ref al responder. El defecto lo introduce el plan. Se llega por un salto del historial de más de una entrada (el menú de "Atrás" del navegador), de `…/A/trabajo` a `…/B/trabajo` con el detalle de B ya en caché. Es poco frecuente, pero el resultado es un control muerto sin aviso. CH4-37 ("Otra clase no espera") no dice si la clase B se monta de nuevo o es la misma instancia; solo el segundo camino lo detecta.
Qué se espera:
- El plan nombra el estado (cambio de `claseId` con el `PUT` en vuelo, misma instancia) y fija su resultado: ni la ref ni el estado local quedan tomados más allá de la respuesta, y la clase B no espera por la A.
- El remedio lo elige el arquitecto. No debe romper el foco "al cambiar de clase, al encabezado de la vista" que hoy depende de `clasePrevia`.
- CH4-37 suma el camino de la misma instancia (A → B por el historial, sin pasar por otra ruta), con la respuesta de A después del cambio.
- **Hermano:** `AccionesDelAdmin` (`aviso-de-clase-archivada.tsx:30-43`, «Restaurar») ya tiene el mismo patrón desde ADMIN-01: `useRestaurarClase(claseId)` con `mutationKey: claveGestionDeClase("restaurar", claseId)`, `restaurandoRef` y un montaje sin `key` dentro de `ClaseDeLaRuta`. El plan lo inventaría como hermano y decide si entra (es un archivo más) o queda con destino. `ConfirmarArchivado` no corre el riesgo: vive en una fila de `/admin/clases` con `key={clase.id}`.

## Lo verificado (sin hallazgo)

- **Inventario, contra mi propio grep en `9b6953c`.**
  - Hay 68 llamadas a `.mutate(` o `.mutateAsync(` en producción, en 58 archivos.
  - Simulé CH4-01 tal como la escribe §D-5 (manejador = última línea `^  const x = (`, ref tomada antes de la llamada y guarda `if (… ref.current …) return` en el archivo). Dan 49 con guarda, las 2 excepciones de `formulario-tarea.tsx` y 17 sin guarda. Las 17 son exactamente las filas 3–6 y 12–23. No hay mutaciones desestructuradas (`{ mutate }`) ni llamadas desde ganchos.
  - Las filas 1, 2, 7–11 y 24–26 están resueltas como dice el plan.
  - Hay 20 `fetchNextPage(` y todos llevan `{ cancelRefetch: false }`. Los únicos `enEspera` con `isFetchingNextPage` son las filas 27 y 28. Los otros tres usos son guardas de efectos de foco.
  - El único botón que pide una consulta con `refetch()` sin `cancelRefetch: false` es «Reintentar» de `lista-de-clases.tsx:57` (H-1). Los siete `refetch()` de H-2 están todos dentro de `useAlPulsarLaSeccionActiva`, con la guarda `isError`. Los `refetch()` de `editar-recurso-view`, `editar-tarea-view` y `entrega-de-alumno-view` corren tras un `409`, no desde un botón.
  - Confirmo: H-1 es el único hermano nuevo.
- **El patrón (§D-1), comprobado contra la librería.**
  - `MutationObserver.mutate()` suelta la mutación anterior y `reset()` hace `removeObserver`: con la ref después de `reset()`, el segundo envío del mismo render perdería el `onSettled` del primero. El orden del plan (`preventDefault()` → ref → `isPending` → `reset()` → validar → tomar → `mutate` → soltar en `onSettled`) cierra ese defecto y el de la nota (a) de CHORE-03.
  - `#notify` llama a los callbacks del `mutate` antes que a los oyentes de React, así que "Inténtalo de nuevo" funciona al primer clic.
  - Con la vista desmontada (`hasListeners()` falso) no corren, y la ref muere con el componente.
  - `sacarDeLaCacheAlAsentar` no quita observadores.
- **"El mismo render" con dos eventos en un solo `act`** es la técnica correcta: cada `fireEvent` suelto trae su propio `act` y deja pintado `isPending`. PA-7 es la salida si no se reproduce.
- **Fila 29 (salvo M-02).**
  - `useMutationState` con `select` sobre `mutacion.state.variables` (`unknown`) y `ordenDeLasVariables` sin `as` es sano.
  - `sigueEnVuelo()` lee la caché en el manejador.
  - En la vista que lanzó el orden, el `onSettled` del `mutate` y la notificación de la caché salen en el mismo lote: no hay parpadeo. CH4-39 lo fija.
  - `useOrdenarTemas` solo lo usa `trabajo-view.tsx`, así que la nota de Recursos de la fila 29 no aplica.
  - La guarda de una línea mide 99 caracteres con sangría (`printWidth` 100), así que cabe en una línea para CH4-01.
- **Lista cerrada y §D-R0.**
  - Las líneas citadas existen y dicen lo que el plan dice: CH3-C13 en 141–146 y 172–173; C-1 en 60–69 y 145; `formularios-ch3.test.tsx:599`.
  - Los únicos `vi.mock` de `./hooks` son los dos `inicio-sin-datos*`, que no pintan `TrabajoView`. Sus dobles con `isFetchingNextPage` y sin `isFetching` siguen en verde porque, con `hasNextPage: false`, el botón no se pinta.
  - Las pruebas que cuentan `cliente.isMutating()` no cambian por sumar una clave.
- **Carril normal: confirmado.** Es el mismo criterio que CHORE-03, que tocó estos formularios de `auth` (T-05) en carril normal: es estado de la interfaz. No cambia qué se envía, ni cómo se guarda la sesión o el token, ni la salida de la caché de mutaciones. No toca `middleware/`, `adapters/auth`, migraciones, `infra/`, estado de pago ni restricción de acceso en el servidor.
- **Tamaño: una sola subentrega de 32 archivos, conforme.** Es "unos 30". El patrón es repetitivo y la regla estática necesita todo el inventario resuelto para quedar en verde; partir obligaría a una lista de excepciones temporal. El corte 04a/04b queda bien descrito como alternativa.
- **S-01 a S-06.**
  - S-01 es razonable: fuera de «Subir» y «Bajar», repetir tras volver a montar exige volver a escribir, buscar o confirmar, y el servidor no duplica.
  - S-02 evita un segundo patrón y un refactor de 51 sitios.
  - S-03 y S-04 están bien separados.
  - S-05 conserva una conducta probada.
  - S-06: basta con pruebas. Lo que cambia (número de peticiones, `aria-busy`, foco y avisos) lo ve jsdom, y no hay valores ni patrones visuales nuevos. `DESIGN.md` no cambia, con razón.
- **No sobreconstruye.**
  - No hay gancho compartido, `ListaMaestrosDeClase`, `SeccionDeTema`, `BarraSuperior` ni los ganchos de `auth` cambian, y los "Ver más" no llevan ref (con `cancelRefetch: false` la segunda llamada se une a la primera; CH4-30 a lo prueba).
  - Las pruebas de caminos de las frases y de `VALIDACION` fuera de contrato son las que exige `AGENTS.md` para los controles cuya guarda cambia.

## Problemas que no bloquean

### N-01 — CH4-35 no fija el orden de los pasos y la prueba puede salir verde o roja según cómo se arme
Para que la mutación siga pendiente al volver, la recarga por sección tiene que estar en vuelo. Eso pasa solo si el `PUT` responde con la vista montada, o si la persona está en otra sección que observa una lista de temas, como «Recursos». Si se sale primero a «Avisos» y el `PUT` responde ahí, la lista de «actividades» no tiene observadores: `invalidateQueries` no la vuelve a pedir y la mutación se asienta de inmediato. Hay que escribir la secuencia: responder el `PUT` con la vista montada, retener la recarga, salir, volver y soltar.

### N-02 — CH4-31 (b), "en el estudiante, también tras unirse a otra clase", no se puede observar como está escrito
«Unirme a la clase» navega a la clase en su `onSuccess` (también con `yaEstabas`), así que el inicio ya no está pintado. Hay que reescribir el camino (volver al inicio con la recarga de la lista retenida) o quitarlo. Lo mismo para el ejemplo "tras unirse a una clase" de §D-3.

### N-03 — §D-R0 no inventaría todas las pruebas que leen el código de los archivos tocados
Me faltan estas cuatro:
- `features/tareas/entregas-01d-r1.ataque.test.tsx:866-868`: lee `clases/lib.ts`, `data.ts` y `types.ts`; prohíbe `?? []`, `disabled`, valores por defecto y `console.`.
- `lib/estatico-ch3-r1.ataque.test.ts:100`: lectores de `.message` en `clases/lib.ts`.
- `services/apiClient-ch3-r1.ataque.test.ts:86`: los importadores de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`.
- `features/tareas/como-se-entrega-01a.test.tsx:242-261`: `clases/data.ts`.

Con las formas de §D-4 siguen en verde. Hay que sumarlas a "Inventariadas, sin cambio", para que una falla sea PA-2 con nombre y no una sorpresa.

## Detalles menores

- CH4-01 acepta cualquier guarda del archivo con esa ref. No exige que esté en el mismo manejador ni antes de la llamada. R-03 lo reconoce y el punto de ataque 5 lo cubre. Cuesta poco endurecerla ya: que la línea `if (… <ref>.current …) return` esté entre la línea del manejador y la que toma la ref. Hoy los 49 sitios con guarda la cumplen.
- CH3-C13: con los diez en `CON_REF`, la rama `if (!CON_REF.includes(ruta))` queda muerta. No hace falta quitarla (la lista cerrada dice "nada más"), pero el título nuevo debería decir que la rama queda para un formulario futuro sin ref.
- CH4-12 dice "antes de 30 s" en caminos de formularios de cuenta. El `staleTime` no afecta a mutaciones. No estorba, pero la condición que importa es la del historial, no el tiempo.
- La frase "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo." no está en `features/clases/data.ts` (solo aparece en un comentario). CH4-36 debe buscarla donde la pinta hoy la traducción del `409 ORDEN_DESACTUALIZADO` y no darla por constante del módulo.

## Desacuerdos arbitrados

Ninguno: no hay desacuerdo entre agentes ni con `ARCHITECTURE-ESSENTIALS.md`.

## Documentos a actualizar

- A-1 (`CLAUDE.md` › Componentes) y A-2 (`docs/ESTADO.md`), como dice el plan, al cierre y con autorización del humano. Si M-02 se resuelve con una regla general (por ejemplo, "una guarda con `mutationKey` que depende de un id no se queda tomada si el id cambia con el componente montado"), A-1 la suma en la misma viñeta.
- Si se toma la opción del punto 5 de abajo, A-2 registra en `ESTADO.md` §3 la fila de los avisos ante códigos que redirigen, con su destino.
- `DESIGN.md`, ESSENTIALS y `ARCHITECTURE.md`: sin cambio.

## Para el humano

1. **S-01 (vetable): volver a montar con la petición en vuelo solo se protege en «Subir» y «Bajar».** Recomiendo aceptarla. En los otros 17, repetir tras volver exige volver a escribir, buscar o confirmar, y el servidor responde sin duplicar. La alternativa (una `mutationKey` por control) suma unos 10 archivos y obliga a partir el encargo.
2. **Tamaño: una subentrega de 32 archivos.** Recomiendo no partir.
3. **Carril normal (R-07).** Lo confirmo: guardas de interfaz, sin cambio de sesión, token ni contraseñas en el servidor.
4. **S-06: sin comprobación humana en navegador.** Recomiendo aceptarla: todo lo que cambia lo cubren las pruebas de jsdom.
5. **Fuera de alcance, para decidir el destino (de M-01).** Siete controles de clases avisan con un toast ante `403 ACCESO_RESTRINGIDO` y `401` mientras `apiClient` ya redirige: «Agregar», «Asignar», «Sí, quitar» (maestro y alumno), «Sí, borrar comentario», «Sí, borrar» y «Unirme a la clase». «Sí, regenerar» ya no avisa desde ADMIN-01d1. Recomiendo no meterlo en CHORE-04 y registrarlo en `ESTADO.md` §3 con destino el `chore` de foco y navegación del marco. Ojo: para «Unirme a la clase», una `*.ataque` vigente fija hoy "avisa una sola vez".

## Verificación de la Enmienda 1 — CHORE-04 (2026-11-10)
Veredicto: APROBADO (sin M-n nuevos; observaciones abajo y una decisión del humano, S-07)
Verificación propia, en modo plan y sin suites:
- `plan.md` tiene 550 líneas y SHA-256 `7f669749e1aaf873d282e87be7130cf2721c5b4c8d77bfff5fd060f7c73da4f5`. La copia previa coincide con `3763a634…`.
- Revisé hunk por hunk el `git diff --no-index` completo: 168 líneas sumadas y 29 quitadas, en 36 hunks.
- Contrasté las afirmaciones técnicas con `@tanstack/query-core` y `@tanstack/react-query` 5.103.2 instalados y con el código de `9b6953c`.

### Alcance de la enmienda
Cada hunk se explica por M-01, M-02, N-01, N-02, N-03 o un detalle menor, y lleva su marca "Enmienda 1". Nada más cambió. "No se toca", la lista cerrada, los pasos y PA-1 a PA-7 siguen iguales, salvo lo que exige la entrada de `aviso-de-clase-archivada.tsx`. CH4-36 conserva "antes de 30 s" con razón: ese camino es de una consulta, donde el `staleTime` sí cuenta.

### M-01: resuelto
- §D-6 y CH4-25 afirman ahora el aviso que da hoy cada control: «Sí, regenerar» y «Restaurar», ninguno; los otros siete, uno solo, y «Unirme a la clase» sin marcar el campo.
- Lo comprobé en `hooks.ts`: `avisarErrorDeGestion` mira `errorQueRedirigeElCliente` y los seis ganchos no. `alumnos-b-r1.ataque:416-417` queda inventariada sin cambio.
- Lo que el encargo sí fija es lo suyo: la ref queda libre y otro clic manda la petición.
- El aviso de más queda fuera, con su fila en A-2.

### M-02: resuelto. El remedio cierra el estado y sus vecinos
1. **El `finally` corre aunque se suelte el observador.**
   - En `useMutation.js:192`, `mutateAsync` es `observer.mutate`, que devuelve `#currentMutation.execute(variables)`: la promesa es de la mutación, no del observador.
   - `setOptions` hace `reset()` cuando cambia el hash de la clave (`mutationObserver.js:61`). Eso solo quita el observador; la promesa se cumple o se rechaza igual, y el `finally` corre.
   - Además, como el observador ya no le pasa opciones, la mutación de A conserva las de A (`mutation.js:181-206` lee `this.options` al responder). La respuesta de A escribe la lista de A, no la de B. CH4-37 (b) lo fija.
2. **Los estados vecinos, recorridos sobre la forma exacta de §D-4 bis:**
   - **A responde después de llegar a B.**
     - La ref vale `"A"`, así que en B la guarda `=== claseId` no la ve y B no espera por A.
     - Si B lanzó su propio orden, el `finally` de A no suelta la ref, porque ya vale `"B"`.
     - El actualizador `actual === enVuelo` no borra el orden propio de B.
     - El foco no se mueve, porque la guarda de clase del efecto pone `focoTrasOrdenarRef` en `null` en B.
   - **Volver a A con la petición en vuelo.**
     - `ordenPropio` sigue siendo el de A (o la caché de A, si B lanzó uno), así que el control de origen de A está en espera.
     - Un clic no manda nada: lo para la ref (`"A"`) o `sigueEnVuelo()` de A.
     - Al responder, la espera termina.
   - **Fallo.** El `catch` sin cuerpo (con comentario: `no-empty` lo permite) deja el único aviso al gancho, y el `finally` suelta.
   - **Desmontaje.** El `finally` corre sobre una instancia desmontada: escribe una ref muerta y llama a un `setState` que React 18 ignora sin advertencia. No queda nada tomado.
   - **Dos clics en el mismo render.** La ref se toma de forma síncrona, antes del `await`: el segundo clic la ve. CH4-38 sigue.
   - **Foco de `clasePrevia`.** No se usa `key` y el efecto de `clasePrevia` no se toca, así que el foco al cambiar de clase sigue yendo al encabezado. CH4-37 (b) lo fija.
3. **El instante entre la respuesta y el `finally`** (R-08): ahí el control que se pulsó sigue en espera un render más y ningún otro entra en ella. CH4-39 lo vigila.
4. **«Restaurar» de `AccionesDelAdmin`:** la misma forma, con `enEspera` sin cambio (`restaurar.isPending || restauracion.enVuelo`). Lo cubre CH4-28 (c), con los dos caminos: B no espera, y volver a A con su restauración en vuelo.
5. **La revisión de hermanos por mecanismo es correcta:**
   - Las filas de `/admin/clases` llevan `key={clase.id}`.
   - Las claves de `auth` y `admin` son fijas.
   - Los seis formularios de dos fases ya sueltan en un `finally`.
   - «Sí, regenerar» y «Sí, quitar» de un maestro no tienen `mutationKey`: el observador sigue atado, el `onSettled` corre y la ref se suelta. Lo fija CH4-29.

### H-3 y S-07: la afirmación es correcta
- En `mutationObserver.js:62`, sin clave (o con la misma clave), una mutación pendiente toma las opciones nuevas, y sus `onSuccess` y `onError` corren con el id del render nuevo.
- Es previo a este encargo y no es de doble clic.
- El alcance que propone el plan es razonable: lo cierra donde ya pone clave (el orden de los temas) y lo demás va a ESTADO §3.
- **Observación sobre su alcance:** el peor caso de H-3 está dentro del encargo. En «Sí, regenerar», `useRegenerarCodigo` escribe con `setQueryData(claveCodigoDeClase(claseId), …)`. Si la persona salta de A a B mientras regenera A, el código nuevo de A se muestra como el de B hasta la siguiente lectura. Es un dato equivocado en pantalla, no solo un aviso de más. «Sí, quitar» de un maestro solo renueva la lista de B en lugar de la de A; es más leve.
- Cerrar los dos no suma archivos: `hooks.ts`, `codigo-de-clase.tsx` y `maestros-de-clase-view.tsx` ya están en "Se toca". Bastaría la clave por clase en sus dos ganchos, la forma de §D-4 bis y cambiar CH4-29. Lo dejo como opción del humano (punto 6), no como hallazgo: es previo, poco frecuente, y el plan lo trata como decisión vetable con su destino.

### La corrección del arquitecto a mi detalle sobre CH4-01: tiene razón
- Yo afirmé que los 49 sitios con guarda ya cumplían "la guarda entre la línea del manejador y la que toma la ref". Es falso.
- Los seis formularios de dos fases toman la ref en su segunda fase y la comprueban en `handleSubmit`. Lo verifiqué uno por uno:
  - `formulario-tarea.tsx:207` y `:262`;
  - `formulario-de-entrega.tsx:115` y `:152`;
  - `formulario-recurso.tsx:177` y `:233`;
  - `formulario-publicacion.tsx:98` y `:135`;
  - `panel-de-calificacion.tsx:100` y `:124`;
  - `hilo-privado.tsx:49` y `:64`.
- La regla de dos lugares, (a) o (b), es la forma correcta. El caso de control sobre un texto de ejemplo (falla sin guarda, con la guarda después y con la guarda de otra ref; pasa con las tres formas) evita que la regla se afloje sin que nadie lo note.
- La toma con `= (?!false|null)` acepta `= claseId` y no cuenta las liberaciones.
- La guarda de la ref va sola en su línea porque Prettier partiría la línea larga (`printWidth` 100) y CH4-01 ya no la leería.

### N-01 a N-03 y detalles menores: resueltos
- **N-01:** CH4-35 ya trae el orden de los pasos, con la razón.
- **N-02:** CH4-31 (b) pasa a "volver al inicio con la lista vieja"; el camino de unirse queda como no aplicable, con su razón. §D-3 cambió su ejemplo.
- **N-03:** las cuatro pruebas están en §D-R0, sin cambio, y con ellas las de «Restaurar» y `alumnos-b-r1`.
- **CH3-C13:** el título dice que la rama sin ref queda para un formulario futuro.
- **CH4-12:** ya no tiene plazo.
- **CH4-36:** busca el texto del `409` en el mensaje del servidor. Lo confirmé en `backend/src/core/tareas/temas.ts:70`.

### Conteo: 33 archivos, una subentrega
Son 26 de producción, 4 pruebas nuevas, 2 de la lista cerrada y 1 `*.ataque`. Sigue siendo "unos 30". La lista cerrada no crece.

### Observaciones (no bloquean)
- **O-E1-1:** en §D-4 bis, `onOrdenar={(temaId, control) => void handleOrdenar(temaId, control)}` y `onClick={() => void handleRestaurar()}` son flechas en línea que llaman a un manejador, no a una mutación. CH4-02 y la viñeta de A-1 las permiten. El resumen del programador debe decir que son así a propósito, por `no-misused-promises`.
- **O-E1-2:** A-1 crece con la regla del id que protege la guarda. Antes de aplicarla al cierre, conviene que el orquestador la revise para que siga siendo una sola viñeta legible.

### Decisiones para el humano (lista final, con mi recomendación)
1. **S-01**, volver a montar con la petición en vuelo: solo se protegen «Subir», «Bajar» y ahora «Restaurar». Recomiendo aceptarla.
2. **Tamaño:** una subentrega de 33 archivos. Recomiendo no partir.
3. **Carril normal (R-07):** confirmado.
4. **S-06,** sin comprobación en navegador: recomiendo aceptarla.
5. **El aviso de más de siete controles mientras `apiClient` redirige (M-01):** recomiendo registrarlo en ESTADO §3 con destino el `chore` de foco y navegación del marco (A-2), fuera de CHORE-04.
6. **S-07, H-3 (la petición en vuelo de A corre con las opciones de B en los ganchos sin clave).** Hay tres opciones:
   - (a) La del plan: cerrarlo solo en el orden de los temas y registrar el resto en ESTADO §3.
   - (b) **Mi recomendación:** la (a), más cerrar también «Sí, regenerar» con clave por clase y la forma de §D-4 bis. Hoy puede mostrar el código de A como el de B; no suma archivos. «Sí, quitar» de un maestro, opcional, en el mismo paso.
   - (c) Corregir aquí todos los ganchos con id, lo que obliga a partir el encargo. No la recomiendo.

   Si el humano elige (b), hace falta una Enmienda 2 corta: excepción de PA-4 para `useRegenerarCodigo` (y `useRetirarMaestro` si entra), §D-2 y §D-4 bis para `codigo-de-clase.tsx`, CH4-29 reescrita como CH4-28 y la matriz. Yo la verificaría con el mismo `git diff --no-index`.

## Verificación de la Enmienda 2 — CHORE-04 (2026-11-10)
Veredicto: CAMBIOS REQUERIDOS (un solo M-n, M-03, que es corto: fijar dónde va el foco en dos casos de CH4-40)
Verificación propia, en modo plan y sin suites:
- `plan.md` tiene 619 líneas y SHA-256 `3b0a8c72b6e24ac955068c549982c31d3cd0a0403fa799989a3cf412b046896e`. La copia previa coincide con `7f669749…`.
- Revisé hunk por hunk el `git diff --no-index` completo: 93 líneas sumadas y 24 quitadas.
- Lo contrasté con las decisiones del humano de `aprobacion.md`, con el código de `9b6953c` (`codigo-de-clase.tsx`, `encabezado-clase.tsx`, `useFocoAlTituloDeLaClase` en `hooks.ts:284-300`) y con las pruebas que pintan «Sí, regenerar».

### Alcance de la enmienda
Cada hunk se explica por una de tres cosas: las decisiones del humano (S-07 b; S-01, subentrega única, carril, S-06 y el aviso de más, marcadas como ya no vetables), O-E1-1 (paso 11) u O-E1-2 (A-1). No hay cambios fuera de lo pedido. El conteo sigue en 33, con los mismos archivos en "Se toca", y la lista cerrada no crece.

Un detalle de redacción: S-07 conserva el texto de la Enmienda 1 ("solo donde ya entra…") con una nota de lectura delante. No confunde, pero el programador debe leer la nota; el destino real está en §D-4 ter y en A-2.

### §D-4 ter cierra el defecto del código equivocado
- Con `mutationKey: claveRegenerarCodigo(claseId)`, el cambio de clase suelta al observador (`mutationObserver.js:61`). La mutación de A conserva sus opciones y su `onSuccess` escribe en `claveCodigoDeClase(A)`. B nunca recibe el código de A, ni en la caché ni en pantalla. Esto ya lo verifiqué para la Enmienda 1 y aplica igual.
- **La confirmación pasa de A a B: cerrado.**
  - `confirmandoEn` guarda la clase y `confirmando` se deriva en el render (`confirmandoEn === claseId`). En B la confirmación no se pinta.
  - El `finally` de A solo cierra la confirmación de A (`actual === claseId ? null : actual`). Si en B se abrió la de B, no la toca.
- **Estados vecinos, recorridos sobre la forma exacta:**
  - **A responde estando en B.** La ref vale `"A"`, así que B no espera: `regenerar.isPending` es falso porque el observador se soltó, y `regeneracion.enVuelo` es el de B. Un `POST` de B toma la ref `"B"`, y el `finally` de A no la suelta.
  - **Volver a A con la petición en vuelo.** La confirmación de A sigue en el estado y «Sí, regenerar» espera, por `regeneracion.enVuelo` de A. Un clic no sale (lo para `sigueEnVuelo()`).
  - **Fallo.** Un solo aviso, el del gancho, que no cambia. El `catch` no deja un rechazo sin manejar, y `inesperadas` de CH3-B08 sigue vacía.
  - **Desmontaje.** No queda nada tomado.
  - **Dos clics en el mismo render.** La ref se toma antes del `await`.
  - **«Cancelar» con la petición en vuelo (S-05, CH4-24).** Al cancelar, `confirmandoEn` pasa a `null` y el foco vuelve a «Regenerar código» por `debeEnfocarRegenerar`. Si la persona vuelve a abrir, «Sí, regenerar» está en espera. El `finally` no reabre nada.
- **La excepción a PA-4 es mínima.** En `useRegenerarCodigo` solo se suma la línea de la clave; `mutationFn`, `onSuccess` y `onError` no cambian, y PA-4 dice que cualquier otro cambio es parada. El gancho nuevo `useRegeneracionEnVuelo` repite en tres líneas el cuerpo de `useGestionEnVuelo`; generalizar este último tocaría tres llamadores de ADMIN-01, así que repetir es lo mínimo.
- **V-06 y CH4-01/02.**
  - `codigo-de-clase.tsx` conserva 2 `enEspera=`.
  - La guarda `if (regenerandoRef.current === claseId || regeneracion.sigueEnVuelo()) return` cabe en una línea (unos 82 caracteres) y está entre el manejador y la toma de la ref.
  - `onClick={() => void handleRegenerar()}` no llama a una mutación.

### «Sí, quitar» de un maestro fuera: el argumento se sostiene, con un matiz
- La respuesta de A corre con las opciones de B. Renueva la lista de B, que se lee del servidor y es correcta, y su aviso usa el `nombre` de las variables (el maestro de A), así que también es correcto. No escribe un dato de A en B, que era el defecto de regenerar.
- **Matiz:** la lista de A no se marca vieja. Si la persona vuelve a A antes de que venza el `staleTime` de 30 s, ve todavía al maestro que quitó, y su «Sí, quitar» respondería con error. Es un dato viejo, no un dato de otra clase. Basta con que la fila de A-2 lo diga así ("A puede mostrar al maestro quitado hasta que venza su `staleTime`"), para que su destino lo mida. No bloquea.

### Pruebas normales y `*.ataque` que pintan «Sí, regenerar»: siguen en verde
- `formularios-ch3.test.tsx:690` (CH3-B08): mismas props y un solo aviso, y `inesperadas` sigue vacía.
- `clase-archivada-01d1-vista.test.tsx:1845-1935` (T-03): un aviso por respuesta y la confirmación cerrada al asentarse, también al salir de la clase y con los códigos que redirigen. El `finally` cierra igual que el `onSettled` de hoy.
- `clase-archivada-01d1-r3.ataque.test.tsx:1157-1235`, `clases-r1.ataque.test.tsx:174-215` (doble activación con la espera visible), `clases-r2.ataque.test.tsx:185` y `clase-layout.test.tsx:200` (PR-A22d, el foco a «Cancelar» y de vuelta): con la forma de §D-4 ter dan lo mismo.

El plan no las nombra; menciona solo las invalidaciones de `claveCodigoDeClase`. Es la misma clase de N-03. Pido sumarlas a "Inventariadas, sin cambio" de §D-R0 en la misma corrección de M-03, para que una falla sea PA-2 con nombre.

Las reglas estáticas sobre `hooks.ts` (`estatico-03c1-r1`, `ver-mas-01e-r3`) no ven nada nuevo que prohíban.

### M-03 — CH4-40 no fija dónde queda el foco cuando la confirmación desaparece o reaparece con el cambio de clase
Dónde: §D-4 ter y CH4-40 (b) y (c).
Por qué importa: la confirmación por clase cambia el foco en dos estados vecinos que el plan recorre sin decir a dónde va. La regla de hermanos del humano (2026-10-05) nombra el foco y el cambio de clave, y el foco tras una recarga o un cambio de vista fue la fuente de rondas extra en CLASES-02c.
1. **(b) Ir a B con la confirmación de A abierta.** Hoy la confirmación sigue en B y el foco se queda en «Sí, regenerar». Con §D-4 ter, la confirmación se desmonta en B. Si el foco estaba en «Sí, regenerar» o en «Cancelar», se pierde, y `useFocoAlTituloDeLaClase` (clave `${claseId}:${soloLectura}`) lo lleva a la raíz y de ahí al título de la clase. Es correcto, pero es conducta nueva y CH4-40 no la afirma.
2. **(c) Volver a A con la petición en vuelo.** La confirmación de A se monta de nuevo, y su «Cancelar» lleva `autoFocus` (`codigo-de-clase.tsx`, el que fija PR-A22d). React enfoca «Cancelar» al montar, durante el commit. Cuando corre `useFocoAlPerderseElControl`, el foco ya no está perdido y no lo mueve. El efecto: navegar por el historial le quita el foco a donde la persona lo tenía (el título, tras (b)) y lo deja en «Cancelar» de una confirmación que no acaba de abrir. Quien usa un lector de pantalla oye "Cancelar" en lugar del nombre de la clase. Y si pulsa Enter, cierra la confirmación sin buscarlo.

Qué se espera:
- CH4-40 (b) afirma que el foco va al título de la clase B, nunca a `<body>`.
- Para (c), el plan decide y lo afirma. Puede aceptar que «Cancelar» tome el foco al reaparecer, y decirlo como conducta elegida con su porqué. O puede evitarlo: por ejemplo, que la confirmación de A no se vuelva a pintar abierta al regresar, de modo que «Regenerar código» abre una confirmación donde «Sí, regenerar» ya espera por la caché. También puede elegir otro remedio que no toque `useFocoAlTituloDeLaClase`.
- Un caso por cada camino (cambio de clase con el foco en «Sí, regenerar» y con el foco en «Cancelar»).

Junto con M-03, en la misma corrección: el inventario de §D-R0 de arriba y el matiz de A-2 sobre «Sí, quitar».

### Para el humano
No hay decisiones nuevas. Las del 2026-11-10 (S-01, S-06, S-07 b, una subentrega de 33, carril normal y el aviso de más a ESTADO §3) quedan aplicadas como el humano las tomó. Lo único abierto es M-03, que es del plan y no de producto: lo resuelve el arquitecto con una Enmienda 3 corta, y yo la verifico con el mismo `git diff --no-index` contra la copia `3b0a8c72…`. Después, el plan cerrado va al humano, como pidió ("Quiero ver el plan final antes").

## Verificación de la Enmienda 3 — CHORE-04 (2026-11-10)
Veredicto: APROBADO (sin M-n; M-03 resuelto)
Verificación propia, en modo plan y sin suites:
- `plan.md` tiene 651 líneas y SHA-256 `75e9179fc4c3bae39e1da38a323a254e4c547da8019ba4d2a9130f0f253e3e1c`. La copia previa coincide con `3b0a8c72…`.
- Revisé el `git diff --no-index` completo, en 7 hunks: la cabecera, la línea de ajuste en §D-4 ter, el bloque "El foco al cambiar de clase", las cinco pruebas de §D-R0, CH4-40 (b′) y (c), el punto de ataque 6 y la fila de A-2.
- Todos llevan la marca "Enmienda 3" y responden a M-03 o a los dos puntos sin bloqueo. No hay cambios fuera de lo pedido. Siguen 33 archivos y la lista cerrada no crece.

### La línea de ajuste cierra (c) sin romper los vecinos
- `if (confirmandoEn !== null && confirmandoEn !== claseId) setConfirmandoEn(null)` es un `setState` condicionado durante el render. React descarta ese render y vuelve a pintar antes del commit, así que la confirmación de A nunca llega a montarse en B ni reaparece al volver. Su «Cancelar» con `autoFocus` no toma el foco.
- **Compatibilidad:** es la misma forma que ya usan nueve sitios con `if (soloLectura && confirmando) setConfirmando(false)` (siete de `features/clases`, `trabajo-view.tsx` con `creando` y uno de `tareas`), con `eslint-plugin-react-hooks` 7 en verde. No es un `setState` en un efecto. La condición se apaga tras el ajuste, así que no hay bucle.
- **Los vecinos de §D-4 ter siguen igual:**
  - La ref por clase, `sigueEnVuelo()` y la clave hacen que B no espere por A y que la respuesta de A escriba solo en A.
  - El fallo da un solo aviso, el del gancho.
  - El desmontaje no deja nada tomado.
  - Dos clics en el mismo render los para la ref.
  - CH4-24 («Cancelar» y volver a abrir en la misma clase) no cambia, porque `claseId` no cambia.
- **Los caminos que pediste revisar:**
  - **A → B → A → B con A en vuelo.** Cada cambio cierra la confirmación ajena y ningún «Cancelar» se monta. Al volver a A, abrir «Regenerar código» pinta «Sí, regenerar» en espera por `regeneracion.enVuelo` de A, y el clic no sale. El `finally` de A ya no encuentra nada que cerrar.
  - **Abrir la confirmación en B con A en vuelo.** `confirmandoEn = "B"`. El «Sí, regenerar» de B no espera y manda el `POST` de B: la ref vale `"A"` y `sigueEnVuelo` de B es falso. El `finally` de A no toca la confirmación de B (`actual === "A"` es falso). Si la persona vuelve a A con la de B en vuelo, el ajuste cierra la de B, y el `finally` de B deja `null`.
- **El foco.**
  - En (b′), la confirmación desaparece y el gancho de la clase lleva el foco del control perdido a la raíz y de ahí al título de B. Hay un caso desde «Sí, regenerar» y otro desde «Cancelar».
  - En (c), nada se monta con `autoFocus` y el foco se queda en el título.
  - PR-A22d (`clase-layout.test.tsx:200`) no cambia, porque no hay cambio de clase.

### Los hermanos: el argumento es cierto en el código
- `codigo-de-clase.tsx:96` es el único `autoFocus` de `features/` y `components/`.
- «Restaurar» no tiene confirmación (DH-09) y «Subir»/«Bajar» son botones.
- Las demás confirmaciones en línea viven en filas con `key` por id:
  - `FilaComentario` (`key={comentario.id}`), `FilaMaestro` (`maestro.id`), `FilaAlumno` (`alumno.id`);
  - `ElementoDeDuda` (`duda.id`), `ElementoDeRecurso` (`recurso.id`);
  - la publicación (`<li key={publicacion.id}>`) y `SeccionDeTema` (`seccion.clave`).

### Observación (no bloquea, fuera de este `chore`)
**O-E3-1: hay estado local de una vista que pasa abierto a otro id cuando la vista sobrevive a un salto del historial.**
- `AccionesDeLaTarea` (`features/tareas/detalle-tarea-view.tsx:134`, sin `key`): la confirmación de borrar la tarea X seguiría abierta en la tarea Y.
- `creando` de `trabajo-view.tsx`: el formulario de "Nuevo tema" de A seguiría abierto en B.

No es de doble clic, no toma el foco y lo que se pinta corresponde a la vista nueva. Es la misma familia que H-3. Recomiendo que el orquestador lo sume a la fila de ESTADO §3 de H-3, con su destino (el `chore` de foco y navegación del marco), sin cambiar este plan.

### Resumen del plan final para el humano (CHORE-04, 651 líneas, `75e9179f…`)
1. **Qué hace:**
   - Pone la guarda síncrona con ref a los 17 controles que no la tenían: los seis formularios de `auth`, tres «Cerrar sesión», «Unirme a la clase» y los «Agregar», «Asignar», «Sí, quitar», «Sí, borrar» y «Sí, regenerar» de clases.
   - Pasa «Ver más comentarios» y «Ver más clases» a `isFetching` y arregla «Reintentar» de la barra.
   - Protege «Subir» y «Bajar» entre montajes con la caché de mutaciones.
2. **Además:** «Restaurar» y «Sí, regenerar» no se quedan tomados ni escriben en otra clase si se salta por el historial con la petición en vuelo. Regenerar podía mostrar el código de A como el de B; ya no.
3. **Una regla estática nueva** fija en todo `src/` que ninguna mutación se lance sin su guarda y que los "Ver más" no cancelen la petición en vuelo.
4. **Decisiones del humano (2026-11-10):** S-01 (volver a montar solo se protege donde un clic reenviaría), S-06 (sin comprobación en navegador), S-07 (b) (regenerar también), carril normal, una sola subentrega.
5. **Tamaño:** 33 archivos (26 de producción, 4 pruebas nuevas, 2 normales de la lista cerrada y 1 `*.ataque` en la ronda 0). Sin backend, sin `shared/`, sin migración y sin cambios en `DESIGN.md`.
6. **Cambio visible:** los "Ver más" quedan en espera mientras su lista se recarga, y el foco va al título de la clase si una confirmación de regenerar desaparece al cambiar de clase.
7. **Riesgos que quedan:**
   - CH4-01 es una regla textual (R-03), mitigada por pruebas de comportamiento y un caso de control.
   - H-3 sigue abierto en los demás ganchos sin clave, entre ellos «Sí, quitar» de un maestro, que puede mostrar en A al maestro quitado hasta 30 s. Va a ESTADO §3 con destino el `chore` de foco y navegación del marco.
   - Siete controles siguen avisando una vez mientras `apiClient` redirige (mismo destino).
   - O-E3-1, de la misma familia.
8. **Siguiente paso:** la autorización del humano para programar. La ronda 0 del tester aplica C-1 y después entra el programador.

## Verificación del resumen del programador — CHORE-04 (2026-11-11)
Resumen verificado: `resumen-programador.md`, "## CHORE-04 — Implementación (2026-11-11)" (271 líneas, `70ee86a0…`). Plan: `plan.md` 651 líneas, `75e9179f…`. Base `9b6953c`.
**Veredicto del resumen: DEVUELTO (M-01 y M-02).** La implementación cumple el plan en todo lo demás: cifras exactas, forma del código, "Se toca" y "No se toca", V-01 y V-06. Lo devuelvo porque faltan las tres viñetas (c) de P-1, que se resuelven con la Enmienda 4 de abajo, y porque un camino de CH4-31 (b) no afirma lo que pide la viñeta.
Equipo con corriente (`BatteryStatus` 2, 100 %). La otra copia de trabajo no se usa (dicho por el humano por medio del orquestador). Corrí una sola cosa a la vez.

### Corridas propias (desde `frontend/`)
| Comando | Última línea | Resumen |
|---|---|---|
| `npm run lint` | `> tsc -b` (exit 0; antes, "All matched files use Prettier code style!") | igual |
| `npm run build` | `✓ built in 1.71s` (exit 0; solo el aviso de un fragmento de más de 500 kB, que ya existía) | no lo corrió (le tocaba al manager) |
| `npx vitest run src/features/auth src/features/clases src/lib src/app src/components/layout` | `Test Files  200 passed (200)` · `Tests  4377 passed (4377)` (Duration 333.38s) | `200 passed (200)` · `4377 passed (4377)`: coincide |
| `npx vitest list` de las 4 pruebas nuevas, contado con `grep -a -c` | 92 · 79 · 26 · 5 = **202** | 202: coincide |

- **Conteo por id** (mismo listado): coincide uno por uno con el resumen:
  - regla estática: CH4-01 2, CH4-02 1, CH4-03 1 y CH4-04 1;
  - auth: CH4-10 14, CH4-11 14, CH4-12 7, CH4-13 7, CH4-14 36, CH4-15 6, CH4-16 7 y la precondición;
  - clases: CH4-20 9, CH4-21 16, CH4-22 8, CH4-23 8, CH4-24 5, CH4-25 16, CH4-26 1, CH4-27 5, CH4-28 4, CH4-29 1 y CH4-40 6;
  - «Ver más» y orden: CH4-30 2, CH4-31 6, CH4-32 2, CH4-33 1, CH4-34 2, CH4-35 1, CH4-36 6, CH4-37 3, CH4-38 1 y CH4-39 2.
- **Archivos:** 33 en `frontend/` contra `9b6953c` (29 seguidos y 4 nuevos), exactamente los de §D-0. Fuera de los paquetes solo están `docs/ESTADO.md` (`2186bbf8…`, el del orquestador), la carpeta del encargo y las dos investigaciones sin seguimiento que ya había antes de la ronda 0.
- **V-01:** hay 281 `*.ataque`. Contra `scratchpad/v01-ch4-base.txt` (`f292fb31…`), el `diff` cambia solo la línea 273, `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` (`74b07393…` → `151dbd75…`, C-1). El programador no tocó ningún `*.ataque`.
- **V-06:** hay 90 `enEspera=` en producción, en la base y hoy. Contados archivo por archivo en los 26 de producción, ninguno gana ni pierde uno.

### Lo verificado en el código (sin hallazgo)
- **§D-1 y §D-2: cumplen.** Revisé los seis formularios de `auth`, «Unirme a la clase», los tres «Cerrar sesión» (marco, acceso restringido y cambio obligatorio) y «Agregar», «Asignar», «Sí, quitar» (maestro y alumno), «Sí, borrar comentario» y «Sí, borrar».
  - El orden es `preventDefault()` → ref → `isPending` → `reset()`, y la ref se toma justo antes de `mutate` y se suelta en el `onSettled` del `mutate`.
  - Los manejadores tienen nombre, a dos espacios y antes del primer retorno temprano (`require-rol.tsx`, `acceso-restringido-view.tsx` y `maestros-de-clase-view.tsx`). `MaestroDeLista` se importa de `./types`.
  - Los callbacks que ya existían se conservan; en «Unirme», `onSettled` va después de `onSuccess` y `onError`.
  - No hay tipos fuera de `Props`, `?? []`, `disabled` ni `console.`.
- **§D-3: cumple.**
  - `comentarios-de-publicacion.tsx` usa `enEspera={comentarios.isFetching}`.
  - En `panel-mis-clases.tsx`, `isFetchingNextPage` pasa a `isFetching` en la prop, el `Pick`, la desestructuración y la llamada, con su comentario de T-19; los dos inicios pasan `clases.isFetching`.
  - «Reintentar» de la barra usa `refetch({ cancelRefetch: false })`.
- **§D-4 y §D-4 bis: cumplen.**
  - `claveOrdenDeTemas`, `VariablesDeOrdenarTemas`, `OrdenPropioEnVuelo` y `ordenDeLasVariables` siguen el plan, sin `as` ni `any`.
  - `useOrdenarTemas` gana su `mutationKey` y la firma de la `mutationFn`, y conserva `onSuccess` y `onError`. `useOrdenDeTemasEnVuelo` usa `useMutationState` con `exact` y `status: "pending"`.
  - `handleOrdenar` sigue la forma exacta, con la guarda de la ref sola en su línea. El efecto de foco suma la guarda de clase antes de la de `isPending`.
  - La constante `ordenEnVuelo` es la libertad de forma que el resumen declara: no cambia el valor.
  - `AccionesDelAdmin` sigue la forma exacta de §D-4 bis, sin cambiar `enEspera`.
- **§D-4 ter: cumple**, con la línea de M-03 tal cual: `if (confirmandoEn !== null && confirmandoEn !== claseId) setConfirmandoEn(null)`.
  - **Excepción a PA-4: es la mínima.** El hunk de `useRegenerarCodigo` es solo la línea `mutationKey: claveRegenerarCodigo(claseId)`. `useRegeneracionEnVuelo` va después y tiene el cuerpo de `useGestionEnVuelo`. En `hooks.ts` no cambia ningún otro gancho.
- **Lista cerrada: exacta.**
  - `formularios-ch3.test.tsx:599` es la única línea que cambia.
  - En CH3-C13 cambian `CON_REF` (más los seis), la línea de comentario y el título; no cambia nada más.
- **§D-5:** las expresiones son las del plan (el resumen las transcribe bien). El caso de control cubre los tres casos que deben fallar y los tres que deben pasar.
- **La matriz de §D-6 y la tabla de hermanos, contrastadas con el código:** coinciden. Ningún gancho cambia su aviso ni su renovación. Los estados vecinos que nombra cada punto tienen el caso que dice, y los títulos existen.
- **Pruebas requeridas:** cada viñeta tiene su archivo y el título exacto del resumen, y el caso afirma lo que pide, con dos excepciones: las tres viñetas (c) de P-1 (M-01) y el segundo camino de CH4-31 (b) (M-02).
  - CH4-28 (c) afirma "la lista de A renovada" como `isInvalidated` del detalle de A. Lo acepto: estando en B nadie observa A, y `renovarTrasGestionar` invalida sin pedir. El caso también afirma que la respuesta de B no invalida A.
  - CH4-14 y CH4-27 nombran los casos existentes de las tres primeras propiedades. Revisé los títulos en los dos archivos.
- **O-E1-1:** el resumen explica las tres flechas en línea por `no-misused-promises`. CH4-02 no las cuenta, porque llaman a un manejador, no a una mutación.

### M-01 — Faltan CH4-30 (c) y CH4-31 (c) (P-1): se resuelven con la Enmienda 4 y tres casos nuevos
Dónde: `features/clases/ver-mas-y-orden-ch4.test.tsx`; en el plan, "Pruebas requeridas", CH4-30 (c) y CH4-31 (c).
Por qué importa: falta una viñeta del plan ("Verificación del resumen", punto 3).
Qué se espera: después de la Enmienda 4, tres casos que afirmen la viñeta (c) nueva: uno en «Ver más comentarios» y uno por cada inicio (estudiante y maestro). El programador los entrega en una sección de corrección, con las cifras nuevas:
- `ver-mas-y-orden-ch4.test.tsx` pasa a 29 casos, y las cuatro pruebas nuevas suman 205;
- el conteo por id (CH4-30 3 y CH4-31 8);
- lint y la suite de `src/features/clases`, con su última línea.

### M-02 — El segundo camino de CH4-31 (b) no afirma el cursor de la lista renovada, y tiene una aserción que no prueba nada
Dónde: `ver-mas-y-orden-ch4.test.tsx`, "CH4-31 (b): $rol, salir del inicio, marcar vieja la lista y volver con la recarga retenida…" (líneas 472-511).
Por qué importa: la viñeta (b) pide para sus dos caminos que, "al soltar la recarga, … un clic pide la página siguiente con el cursor de la lista renovada". Este camino no cambia la lista del servidor, así que no puede distinguir el cursor viejo del nuevo, y no lo afirma. Además, su última aserción (`expect(TEXTOS_CLASES_ANTERIORES.anteriores.titulo.length).toBeGreaterThan(0)`) no mira la pantalla ni la red. El resumen dice que "el cursor de la lista renovada se afirma en CH4-30 (b) y CH4-31 (b)", y eso solo es cierto para el primer camino.
Qué se espera: el caso cambia la lista del servidor antes de soltar la recarga, como el primer camino, y afirma el cursor de la página pedida. La aserción de relleno sale. El título nombra el cursor.

### Arbitraje de P-1: la viñeta cambia, sin cambiar la conducta; lo aplica una Enmienda 4 corta
**El código confirma lo que dice el programador.**
- Con las `defaultOptions` de `app/providers.tsx` (`retry: 1`), cuando `fetchNextPage` falla dos veces la consulta infinita queda en `isError`, y las dos vistas ponen el error primero:
  - `comentarios-de-publicacion.tsx`, `contenido()`: `if (comentarios.isError) return <MensajeError mensaje={mensajeDeErrorDeLista(…)} />`;
  - `panel-mis-clases.tsx`, `contenidoPanel`: `if (props.isError) return <MensajeError …/>`.
- La lista y el botón dejan de existir. "El botón sale de la espera y otro clic la vuelve a pedir" no se puede cumplir sin cambiar la conducta.

**No hace falta cambiar la conducta.** Conservar la lista y el botón tras el fallo de una página es cambiar la política de renovación de las listas, no la guarda:
- el plan la deja fuera (Alcance, "No entra": el hermano de T-02 de CLASES-03e "cambia la renovación … no la guarda");
- el plan ya lo decía en §D-3: las frases que reemplazan la lista hacen que «Ver más» no se pinte;
- el riesgo de la guarda (un botón que queda en espera, o una página pedida dos veces) no existe si el botón ya no está.

La viñeta (c) estaba en contradicción con §D-3 del propio plan. El programador hizo bien en detenerse y en no inventar una aserción.

**Texto de la Enmienda 4 (el arquitecto lo transcribe; no cambia archivos, alcance ni ninguna decisión del humano):**
- **CH4-30 (c)** se reemplaza por: "(c) (Enmienda 4, P-1) Si la página falla (`500`), la vista hace lo de hoy, que este encargo no cambia (§D-3, §D-7):
  - salen las dos peticiones de la página (`retry: 1`) y ninguna más, contadas después de esperar;
  - la lista se reemplaza por un solo `MensajeError` (`role="alert"`) con el texto de `mensajeDeErrorDeLista` para ese error;
  - «Ver más comentarios» ya no está;
  - ningún control del bloque queda en espera."
- **CH4-31 (c)** se reemplaza por lo mismo, en los dos inicios (estudiante y maestro), con «Ver más clases» y el `MensajeError` del panel.
- **§D-3** suma una viñeta: "Tras el fallo de una página, la consulta queda en error y la vista reemplaza la lista por su `MensajeError` (conducta de hoy, sin cambio); el «Ver más» no se pinta mientras está."
- **A-2** suma a la fila de ESTADO §3 del hermano de T-02 de CLASES-03e, con destino el `chore` de foco y navegación del marco: "Tras el fallo de una página de «Ver más comentarios» o «Ver más clases», la lista se reemplaza por el `MensajeError` del bloque («Algo salió mal. Inténtalo de nuevo.», o el de red) sin un control para reintentar en el bloque. Los caminos de esa frase (cerrar y abrir los comentarios, salir del inicio y volver, pulsar la sección activa) no tienen casos (CHORE-04, P-1)."

**Quién lo aplica.**
1. El arquitecto escribe la Enmienda 4, con el texto de arriba. Antes, el orquestador guarda la copia de `plan.md` (`75e9179f…`) en el scratchpad, como pide `AGENTS.md`.
2. Yo la verifico con un `git diff --no-index` completo contra esa copia.
3. El programador escribe los tres casos y corrige M-02 en una sola ronda de corrección.
4. Verifico esa corrección (lint, la suite de `src/features/clases` y las cifras) antes de que el tester ataque.

Prefiero la enmienda a dejar solo este arbitraje, por el precedente de ENTREGAS-01 (las PARADAS del programador se resolvieron con las Enmiendas 4 y 5) y para que el tester lea una sola fuente.

**¿Va al humano?** La Enmienda 4 no: el plan ya decide que la renovación no cambia, y el orquestador puede avanzar ("Con el plan aprobado, el orquestador avanza"). Sí va al humano una cosa: los caminos de la frase de recuperación de ese `MensajeError` (ver "Para el humano"). La regla de `AGENTS.md` (2026-10-26) pide sus casos en el plan; la frase no es de este encargo, y solo el humano puede mandarla a otro destino. La decisión no bloquea la Enmienda 4 ni la corrección del programador. Sí debe estar tomada antes de la revisión final.

### Arbitraje: el rojo primero en `auth` (CH4-10 y CH4-13 de seis formularios ya pasaban)
**El mecanismo (lo determiné leyendo el código y lo comprobé con una mutación).** No tiene que ver con `mutationKey` ni con `gcTime: 0`. Está en `CampoContrasena` (`features/auth/components/campo-contrasena.tsx:55-66`):
- el campo registra en su formulario un *listener* nativo de `submit` en captura, que llama `flushSync(() => setVisible(false))` (CC-6: ocultar la contraseña al enviar);
- `flushSync` vacía todo el trabajo síncrono pendiente de la raíz, también el render que dejó programado el primer `handleSubmit` (`setErrores({})` crea un objeto nuevo y siempre programa uno);
- en ese render, `useSyncExternalStore` de `useMutation` ya lee la mutación pendiente, porque `MutationObserver.#updateResult` es síncrono.

Así, el segundo `submit` del mismo `act` (y el que dispara un segundo clic en el botón de envío) llega a un `handleSubmit` nuevo, que ya ve `isPending` en `true`. Pasa lo mismo en el navegador. Los seis formularios con contraseña tienen el campo; `recuperar` no, y por eso solo ese quedó en rojo. «Cerrar sesión» no envía un formulario. Es el único `flushSync` de producción en `src/`.

**La mutación acotada.** Respaldé `formulario-login.tsx` y `campo-contrasena.tsx` en `scratchpad/mut/`, corrí cada variante por separado y restauré los dos archivos.
- **M1.** `formulario-login.tsx` de la base (sin ref), con `CampoContrasena` intacto:
  - `npx vitest run src/features/auth/guardas-ch4.test.tsx -t "login"`: `Tests  19 passed | 73 skipped (92)`. Ningún caso de login nota que falta la ref.
  - Las tres estáticas (`guardas-de-doble-clic-estatico`, `estatico-ch3-r2.ataque` y `errores-de-api-estatico`): `Tests  3 failed | 23 passed (26)`. Caen CH4-01, el caso de `formulario-login.tsx` de C-1 y CH3-C13.
- **M2.** Login sin ref y `flushSync(() => setVisible(false))` → `setVisible(false)`: `Tests  3 failed | 16 passed | 73 skipped (92)`. Caen CH4-10 (a), CH4-10 (b) y CH4-13 de login: sin el `flushSync`, la técnica sí reproduce "el mismo render".
- **M3.** Login con la ref de hoy, sin el `flushSync`: `Tests  19 passed | 73 skipped (92)`. Lo que protege es la ref.
- **Restauración.** El primer intento de restaurar desde el guion falló por una ruta relativa, y la restauré enseguida a mano con rutas absolutas:
  - `sha256sum` y `cmp` iguales al respaldo;
  - `campo-contrasena.tsx` = blob de la base `20c1e955…` y fuera de `git status`;
  - `formulario-login.tsx` idéntico al del programador;
  - `git diff --stat 9b6953c -- frontend` sigue en `29 files changed, 351 insertions(+), 72 deletions(-)`.

**Decisión.**
- **¿Son casos vacíos?** Respecto del requisito, no: afirman "una sola petición", y eso se cumple. Respecto de la ref, sí: en esos seis formularios no la distinguen, porque hoy el envío doble ya lo frena el `flushSync` de otro componente.
- **¿Es PA-7?** No en el fondo. La técnica reproduce el mismo render: lo muestran recuperar, «Cerrar sesión», clases y la mutación M2. Lo que mete un render entre los dos eventos es una conducta del producto, no una debilidad de la prueba.
  - **Al pie de la letra, la condición de PA-7 sí se dio**, y el plan mandaba detenerse. El programador lo declaró con claridad y no lo escondió. Lo dejo como observación de proceso (`AGENTS.md`: "Cuando el plan dice detenerse … te detienes"), sin devolver el resumen por eso, porque el arbitraje le da la razón en el fondo.
- **¿Basta con lo que hay?** Sí:
  - la presencia y el lugar exacto de la ref los fija la estática (CH4-01, C-1 y CH3-C13; M1 lo confirma);
  - que la ref se suelte lo fijan CH4-11, CH4-14 y CH4-16, que fallarían si quedara tomada.
- **¿Falta un caso?** No es obligatorio para el programador: sería un archivo más fuera de §D-0, porque `vi.mock` abarca todo el archivo. Lo paso al tester como punto de ataque 1: en un `*.ataque` puede doblar `CampoContrasena` sin el `flushSync` y repetir CH4-10 y CH4-13 en los seis.
- **El resumen:** su hipótesis (`mutationKey` y `gcTime: 0`) no es el mecanismo, pero el programador la presenta como no determinada. No hace falta corregirla: queda escrita aquí.

### Arbitraje: el rojo de clases contra la base restaurada después del paso 6
**La evidencia vale.**
- Correr la prueba con los 11 archivos de producción de clases devueltos a `9b6953c` es el mismo estado de código que "antes del cambio".
- Los 14 casos en rojo son exactamente los que el plan hace depender del cambio:
  - CH4-20 (nueve);
  - CH4-28 (c) "misma instancia" (en la base, la ref booleana de «Restaurar» quedaba tomada al soltarse el observador: el defecto de M-02 de la revisión del plan);
  - CH4-40 (a), (b) y los dos (b′)/(c).
- Los verdes los explica la base:
  - CH4-28 (a), porque «Restaurar» tiene su ref desde ADMIN-01;
  - los reintentos y los caminos (CH4-21 a CH4-27 y CH4-29), porque el plan los espera en verde;
  - CH4-40 (d) y (e), porque son el error y el desmontaje.
- La restauración la comprueba que el diff de hoy coincide con el plan, hunk por hunk, y que mi corrida de los módulos está en verde.

**Riesgo residual:** una prueba escrita después de ver la implementación puede ajustarse a ella. Lo cubre mi cotejo viñeta por viñeta y lo cubrirá el ataque del tester. Es una desviación de orden, declarada; no devuelve el resumen.

### Detalles menores (no devuelven el resumen)
- **`data.ts`:** el plan pedía un comentario de una línea para `claveRegenerarCodigo`, y tiene dos.
- **`lib.ts`:** `OrdenEnVuelo` entra en la importación de tipos fuera del orden alfabético. lint lo acepta.
- **CH4-20:** afirma la espera antes de la respuesta, pero no que el control sale de ella al responder. CH4-21 y CH4-24 lo cubren.

### Para el humano
- **Los caminos de la frase de recuperación del `MensajeError` que reemplaza la lista tras el fallo de una página** («Ver más comentarios» y «Ver más clases»: "Algo salió mal. Inténtalo de nuevo." o el aviso de red).
  - **Qué pasa:** la frase existe desde CLASES-01 y CHORE-04 no la toca. La regla de `AGENTS.md` del 2026-10-26 pide sus casos por camino en el plan, y ningún plan los tiene. Además, el bloque no ofrece un control para reintentar.
  - **Opción (a), recomendada:** va a ESTADO §3, a la fila del hermano de T-02 de CLASES-03e, con destino el `chore` de foco y navegación del marco, que en la hoja de ruta va después de DOCS-05 y es dueño de "una sola política de recarga" (texto en A-2 de la Enmienda 4).
  - **Opción (b):** entra a CHORE-04 con una Enmienda 5: un caso por camino y, si un camino no cumple la promesa, otro texto o remedio. Eso cambia la renovación de las listas y probablemente suma archivos.
  - **Cuándo:** la decisión no bloquea la Enmienda 4 ni la corrección del programador. Debe estar tomada antes de mi revisión final.

### Puntos de ataque para la ronda 1 del tester
1. **La ref de los seis formularios de `auth`, sin el `flushSync` de `CampoContrasena`.** Doblar el campo en un `*.ataque` y repetir con dos eventos en un solo `act`:
   - una sola petición (CH4-10 y CH4-13);
   - que la ref se suelte tras cada clase de error;
   - el orden ref → `isPending` → `reset()`.
   Hoy, en esos seis formularios, las pruebas de comportamiento no distinguen la ref.
2. **La regla estática (§D-5):**
   - la guarda acepta cualquier línea `if (… <ref>.current …) return`, incluida una negada (`if (!xRef.current) return`);
   - los manejadores con `useCallback`, `function` o a cuatro espacios no se ven;
   - CH4-03 solo mira `.refetch(` en la misma línea que `onClick=`.
   Una forma que existe en `src/` sin guarda es hallazgo; una que no existe, observación.
3. **Los casos nuevos de P-1, cuando estén:**
   - el fallo de la página por red;
   - el fallo con una recarga de fondo en vuelo;
   - que nada quede en espera ni salga otra página.
4. **Cambio de clase con la petición en vuelo:**
   - «Sí, regenerar» en A → B → A → B, y la confirmación abierta en B con A en vuelo;
   - «Restaurar» entre dos clases archivadas;
   - «Subir»/«Bajar» con un `409` de A que llega estando en B.
   En todos: que nada quede tomado y que B nunca muestre ni escriba datos de A.
5. **«Sí, quitar» de un maestro (CH4-29):** si la confirmación de un maestro con el mismo id pasa abierta de A a B. Es de la familia de H-3 y O-E3-1, con destino: observación, salvo que deje algo tomado.
6. **Los estados vecinos de la matriz** que el resumen da por cubiertos sin caso propio: `503 SERVICIO_OCUPADO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO` y el `409` de los controles de clases.

### Para el orquestador
- **Siguiente paso:** copia de `plan.md` → Enmienda 4 (arquitecto) → mi verificación → corrección del programador (M-01 y M-02) → mi verificación del resumen → ronda 1 del tester. En paralelo, la pregunta al humano de "Para el humano".
- **Medición del programador:** un resumen devuelto. La causa principal es una viñeta del plan que no se podía cumplir (P-1), no un hermano omitido; M-02 sí es suyo. Más la observación de proceso sobre PA-7.

## Verificación de la Enmienda 4 — CHORE-04 (2026-11-11)
Veredicto: **APROBADO, sin M-n.** La revisé solo leyendo; no corrí suites.
- **Archivos:** `plan.md` tiene 667 líneas, SHA-256 `6f4eb38535bb4ef83aefba378be781aa91e66238c07879dbc0df59f91776e02d`. La copia de antes es `scratchpad/copias-plan-ch4/plan-ch4-antes-e4-75e9179f.md`, y su SHA-256 `75e9179f…` lo comprobé.
- **`git diff --no-index` completo:** son 5 hunks y todos son de la Enmienda 4.
  1. **La nota de la Enmienda 4 al inicio** (líneas 29-32): dice bien la causa, lo que cambia y lo que no cambia (alcance, "Se toca" y "No se toca", decisiones del humano, 33 archivos).
  2. **§D-3:** mi viñeta, tal cual.
  3. **CH4-30 (c):** mi texto, tal cual.
  4. **CH4-31:**
     - el encabezado queda en "(a) y (b), como CH4-30";
     - la aclaración de M-02;
     - la (c) aparte, para los dos inicios.
  5. **A-2:** mi línea, tal cual. La cláusula "salvo que el humano decida otro" es correcta, porque la decisión (a)/(b) de "Para el humano" sigue pendiente.
- **Fuera de lo pedido:** nada más cambia.

### CH4-31 (c) contra el código: correcto
- Los dos inicios pasan al panel `errorMensaje={mensajeDeErrorDeLista(clases.error, TEXTOS_PANEL.cambioMientrasLasVeias)}` (`inicio-estudiante-view.tsx:53-57` e `inicio-maestro-view.tsx:43-47`), y `PanelMisClases` lo pinta en `MensajeError` (`role="alert"`). "El `MensajeError` del panel, con su texto para ese error" es, entonces, el mismo `mensajeDeErrorDeLista` de CH4-30 (c). Ante un `500` da el genérico de clases y ante un cursor, la frase de "cambiaron mientras las veías". La forma del arquitecto no cambia el requisito.
- **"Un solo `MensajeError`" se cumple también a nivel de página.** Con la lista en error, `BloqueDestacado` cambia su título a `TEXTOS_PANEL.error` como texto, sin `role="alert"`.

### La aclaración de CH4-31 (b) (M-02): precisa sin cambiar, y se puede cumplir
- La viñeta ya pedía el cursor de la lista renovada en los dos caminos ("como CH4-30"). La aclaración solo dice cómo distinguirlo.
- El primer camino ya lo hace: cambia `servidor.clases` antes de soltar y afirma `idClase(4)`. En el segundo, la recarga retenida se responde con `responder`, que lee `servidor.clases`, así que basta con cambiarla antes de soltar.

### Observación (no bloquea; para el orquestador al aplicar A-2 al cierre)
**O-E4-1.** Con la lista de un inicio en error, el título de `BloqueDestacado` muestra otra frase de recuperación: "No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo." (`TEXTOS_PANEL.error`, `data.ts:159`). Es de la misma familia: viene de antes, no tiene casos por camino y no hay control para reintentar. No cambia el plan. Al aplicar la línea de la Enmienda 4 en A-2, conviene nombrarla junto al `MensajeError` del bloque, si el humano elige la opción (a). Que el orquestador lo anote en `aprobacion.md`.

### Lista exacta para la ronda de corrección del programador (M-01 y M-02)
**Archivos que puede tocar:**
- solo `frontend/src/features/clases/ver-mas-y-orden-ch4.test.tsx`;
- y agregar su sección al final de `resumen-programador.md` (con `cat >>`).

Ningún archivo de producción, ninguna otra prueba y ningún `*.ataque`. Si algo más hiciera falta, es PARADA.

1. **CH4-30 (c)** (M-01), un caso en el `describe` de «Ver más comentarios».
   - **Montaje:** con los comentarios abiertos y la página respondiendo `500`.
   - **Clic:** un clic en «Ver más comentarios».
   - **Qué afirma:**
     - que, después de esperar, salen exactamente dos peticiones de página (con cursor) y ninguna más (`retry: 1`, con la espera de reintento de la librería: el `waitFor` debe cubrirla);
     - un solo `role="alert"`, con el texto `mensajeDeErrorDeLista(error, TEXTOS_COMENTARIOS.cambioMientrasLosVeias)` para ese `500`;
     - que «Ver más comentarios» ya no está;
     - que no hay ningún botón con `aria-busy="true"`.
   - **Título**, empezando por `CH4-30 (c):` y nombrando la conducta. Por ejemplo: "CH4-30 (c): si la página falla, salen sus dos peticiones y ninguna más, la lista se reemplaza por un solo MensajeError, «Ver más comentarios» ya no está y nada queda en espera".
2. **CH4-31 (c)** (M-01), un `it.each(INICIOS)` para estudiante y maestro, con las mismas cuatro afirmaciones:
   - con «Ver más clases»;
   - con el texto `mensajeDeErrorDeLista(error, TEXTOS_PANEL.cambioMientrasLasVeias)`;
   - con las peticiones de página del inicio (las de `delInicio(api, true)`), sin contar las de la barra (`limite=100`).
   - **Título**, empezando por `CH4-31 (c): $rol, …`.
3. **CH4-31 (b), segundo camino** (M-02):
   - antes de soltar la recarga retenida, cambiar `servidor.clases` (como el primer camino) y afirmar el cursor de la página pedida tras el clic (`idClase(4)` si se usa la misma lista);
   - quitar `expect(TEXTOS_CLASES_ANTERIORES.anteriores.titulo.length).toBeGreaterThan(0)` y su importación, si queda sin uso;
   - en el título, nombrar el cursor renovado. Por ejemplo: "… el botón espera y su clic no pide página; al soltar, un clic pide la página con el cursor renovado".
4. **Verificación**, desde `frontend/`, una a la vez:
   - `npm run lint`;
   - `npx vitest run src/features/clases`;
   - `npx vitest list src/features/clases/ver-mas-y-orden-ch4.test.tsx`, contado con `grep -a -c`.
5. **Cifras esperadas:**
   - `ver-mas-y-orden-ch4.test.tsx`: **29 casos** (CH4-30 **3**, CH4-31 **8**; los demás ids, sin cambio);
   - las cuatro pruebas nuevas: **205** (92 + 79 + 29 + 5);
   - si además corre la suite de los cinco módulos del plan: `Test Files  200 passed (200)` · `Tests  4380 passed (4380)`.
6. **El resumen:**
   - cada viñeta tocada con su archivo y su título exacto;
   - el comando y la última línea de cada corrida;
   - los hermanos: la (c) aplica a los tres «Ver más» de este encargo (comentarios y los dos inicios), y el resto de «Ver más» de `src/` queda fuera (no cambian; CH4-03 y CH4-04);
   - el estado vecino "fallo por red" se anota sin caso propio (mismo camino de `isError`).

Después, verifico la corrección y entra la ronda 1 del tester.

## Verificación de la corrección del resumen — CHORE-04 (2026-11-11)
**Veredicto: ACEPTADO.** M-01 y M-02 están corregidos, y las cifras coinciden con mi corrida.
- **Lo que verifiqué:** `resumen-programador.md` (322 líneas, `3676b607…`), la sección "## CHORE-04 — Corrección del resumen (M-01 y M-02)" desde la línea 273.
- **Base:** `plan.md` `6f4eb385…` (Enmienda 4).
- **Condiciones:** con corriente (`BatteryStatus` 2) y una corrida a la vez.

### Corridas propias (desde `frontend/`)
| Comando | Última línea | Resumen |
|---|---|---|
| `npm run lint` | `> tsc -b` (exit 0) | igual |
| `npx vitest run src/features/clases` | `Test Files  117 passed (117)` · `Tests  2521 passed (2521)` (Duration 209.25s) | igual |
| `npx vitest list` de las cuatro pruebas nuevas, contado con `grep -a -c` | 92 · 79 · **29** · 5 = **205**; CH4-30 **3**, CH4-31 **8** | igual |

- **Los demás ids de `ver-mas-y-orden-ch4`** no cambian: CH4-32 2, CH4-33 1, CH4-34 2, CH4-35 1, CH4-36 6, CH4-37 3, CH4-38 1 y CH4-39 2.
- **Los títulos del resumen** existen tal cual en el listado.

### No cambió nada más
- **El diff de los archivos seguidos** contra `9b6953c` sigue igual: `29 files changed, 351 insertions(+), 72 deletions(-)`. Siguen siendo 33 archivos en `frontend/`.
- **Los de producción no cambiaron desde mi verificación anterior.** Lo comprobé por fecha de modificación: después de ella solo cambió `ver-mas-y-orden-ch4.test.tsx` (20:41). `formulario-login.tsx` (20:34) es mi restauración de la mutación, con el mismo SHA-256 que el respaldo.
- **Las otras tres pruebas nuevas** siguen con sus casos (92, 79 y 5).
- **V-01:** hay 281 `*.ataque`. Contra `v01-ch4-base.txt`, solo cambia la línea 273 (C-1, `151dbd75…`).

### Los casos contra las viñetas de la Enmienda 4
- **CH4-30 (c)** (`ver-mas-y-orden-ch4.test.tsx:395`) y **CH4-31 (c)** (`:545`, estudiante y maestro).
  - **Montaje:** dos `500` interceptados para la página (con cursor) y un clic en «Ver más».
  - **La ayuda común** `comprobarFalloDeLaPagina` (`:70`) afirma:
    - un solo `role="alert"`, con `mensajeDeErrorDeLista(ERROR_500, <texto del cursor de cada vista>)`;
    - que el «Ver más» ya no está;
    - ningún botón con `aria-busy="true"`.
  - **Después,** espera 1,5 s y afirma exactamente 2 peticiones de página y que sigue habiendo un solo `alert`.
  - **En los inicios** solo cuenta `delInicio(api, true)`; la barra (`limite=100`) queda fuera.
  - Las cuatro viñetas se cumplen.
- **No son vacíos.**
  - Sin la petición de página no aparecería el `alert`.
  - El texto exacto prueba que es el `MensajeError` del bloque, no el título de `BloqueDestacado`, que no es `alert`.
  - Una tercera petición la respondería el doble del servidor con éxito, la lista volvería y el conteo de 2 fallaría.
  - No hizo falta una mutación.
- **CH4-31 (b), segundo camino** (`:500`).
  - **Montaje:** `servidor.clases` pasa a `[1, 4, 2, 3]` antes de soltar la recarga, y el caso afirma `cursor` = `idClase(4)`.
  - **El cursor sí distingue la lista vieja de la nueva:** el doble pagina de 2 en 2 (`paginar(…, 2)`), así que la lista vieja `[1, 2, 3]` daría `idClase(2)`.
  - **La aserción de relleno** y su importación salieron.
  - **El título** nombra el cursor renovado.
- **Hermanos y estados vecinos:** la (c) se aplicó a los tres «Ver más» del encargo. El fallo por red sigue el mismo camino de `isError`, sin caso propio, y queda como punto de ataque.

### Puntos de ataque para la ronda 1 del tester (lista final)
Reemplaza la lista de la línea 472.
1. **La ref de los seis formularios de `auth`, sin el `flushSync` de `CampoContrasena`.** En un `*.ataque`, doblar el campo sin el `flushSync` y, con dos eventos en un solo `act`, comprobar:
   - una sola petición (CH4-10 y CH4-13);
   - que la ref se suelta tras cada clase de error;
   - el orden ref → `isPending` → `reset()`.
   Hoy, en esos seis formularios, las pruebas de comportamiento no distinguen la ref (M1 y M2 de mi mutación).
2. **La regla estática (§D-5):**
   - la guarda acepta cualquier `if (… <ref>.current …) return`, incluida una negada;
   - los manejadores con `useCallback`, `function` o a cuatro espacios no se ven;
   - CH4-03 solo mira `.refetch(` en la misma línea que `onClick=`.
   Una forma que existe en `src/` sin guarda es hallazgo; una que no existe, observación.
3. **El fallo de una página de «Ver más»** (CH4-30 (c) y CH4-31 (c)):
   - por red;
   - con un `400 VALIDACION` de cursor (la frase de "cambiaron mientras los veías");
   - con una recarga de fondo que termina mientras la página falla;
   - en cada caso: que nada quede en espera, que no salga otra página y que haya un solo `alert`.
   Los caminos de la frase de recuperación y el título de `BloqueDestacado` (O-E4-1) quedan fuera, con su destino: van como observación, no como hallazgo.
4. **Cambio de clase con la petición en vuelo:**
   - «Sí, regenerar» en A → B → A → B, y la confirmación abierta en B con A en vuelo;
   - «Restaurar» entre dos clases archivadas;
   - «Subir»/«Bajar» con un `409` de A que llega estando en B.
   En todos: que nada quede tomado y que B nunca muestre ni escriba datos de A.
5. **«Sí, quitar» de un maestro (CH4-29):** si la confirmación de un maestro con el mismo id pasa abierta de A a B. Es de la familia de H-3 y O-E3-1: observación, salvo que deje algo tomado.
6. **Los estados vecinos de la matriz sin caso propio:** `503 SERVICIO_OCUPADO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO` y el `409` de los controles de clases. Que la ref se suelte y que haya un solo aviso.

### Para el orquestador
- **Sigue pendiente la decisión del humano** sobre los caminos de la frase de recuperación (opción (a) o (b) de "Para el humano"). Debe estar tomada antes de la revisión final.
- **Medición del programador:** en este encargo hubo un resumen devuelto (P-1 por el plan; M-02, suyo), y la corrección se aceptó a la primera.

## Arbitraje tras la ronda 1 — CHORE-04 (2026-11-11)
**Es un arbitraje de solo lectura: no corrí suites.**
- **Lo que leí:**
  - `reporte-tester.md` (263 líneas, `ab8c9fce…`), "## Ronda 1";
  - `aprobacion.md`, la postura literal del humano y la ronda 1;
  - los títulos de `guardas-ch4-r1.ataque.test.tsx` (ATQ-CH4-01 en la línea 304 y ATQ-CH4-03 en la 346);
  - `lista-maestros-de-clase.tsx:174` y `tabla-alumnos.tsx:228`.
- **Dos supuestos:**
  - tomo como decidida la lectura del orquestador sobre P-1: es la opción (a), y la frase de recuperación y la de O-E4-1 van a ESTADO §3 sin Enmienda 5 de alcance;
  - la ronda 1 queda RESISTE, sin hallazgos.

### 1. Los 18 casos del programador (CH4-10 (a), CH4-10 (b) y CH4-13 de los formularios con `CampoContrasena`)
**Decisión: aplico la regla del humano tal cual.** Esos 18 casos pasan sin la guarda, así que no la vigilan, y no se aceptan como pruebas de la guarda. Tampoco se pueden reescribir con el componente real: el tester midió que no existe ninguna forma de envío (clic, `requestSubmit` ni Enter) que llegue antes de `isPending`. Corren las dos salidas que da el humano, cada una en su sitio:
- **La guarda la vigilan los casos reescritos del tester:**
  - ATQ-CH4-01 (tres formas por configuración) y ATQ-CH4-03, en `features/auth/guardas-ch4-r1.ataque.test.tsx`. Doblan `CampoContrasena` sin su `flushSync`; recuperar va con el componente real;
  - la tabla de la ronda 1 lo comprueba quitando la guarda, formulario por formulario: 4 rojos en cada uno y 8 en nueva contraseña;
  - en lo estático, la vigilan además CH4-01, C-1 (`estatico-ch3-r2.ataque`) y CH3-C13, comprobado con mi mutación M1.
- **Se declara la redundancia** en el resumen del programador, con el texto de abajo.
- **Los 18 casos se quedan, con otro título:** pasan a ser la regresión de "una sola petición con el componente real". No cambia ninguna aserción.
  - Lo que vigilan es real: si alguien quitara la ref y el `flushSync` a la vez, fallarían.
  - Su título de hoy ("en el mismo render") es falso en esos formularios, y por eso cambia.
- **Recuperar** conserva sus tres casos y sus títulos: sí caen sin la guarda.

**El texto que el resumen debe declarar, tal cual:**
> Redundancia de la guarda con `isPending` en los formularios con `CampoContrasena`: login, registro de estudiante, registro de maestro, nueva contraseña (restablecer y establecer, un mismo componente) y cambio obligatorio (cinco componentes, seis configuraciones).
> - `CampoContrasena` (`campo-contrasena.tsx:55-66`) registra en su formulario un *listener* nativo de `submit` en captura, que corre `flushSync(() => setVisible(false))`. Toda vía al `handleSubmit` (el clic en el botón de envío, `requestSubmit` y el Enter) dispara ese `submit`.
> - `flushSync` vacía el render que dejó programado el envío anterior: `setErrores({})` crea un objeto nuevo y siempre programa uno. En ese render, `useMutation` ya lee la mutación pendiente, porque `MutationObserver` actualiza su resultado de forma síncrona dentro de `mutate`.
> - El segundo `handleSubmit` recibe el objeto nuevo, ve `isPending` en `true` y sale por esa guarda, antes de la ref.
>
> Por eso, con el componente real, la ref es redundante con `isPending` en esos formularios, y CH4-10 (a), CH4-10 (b) y CH4-13 de esas seis configuraciones (18 casos) no la vigilan: siguen en verde sin ella (medición del tester, ronda 1). La ref se conserva por la regla de `CLAUDE.md` (guarda síncrona con ref en toda mutación) y porque deja de ser redundante si `CampoContrasena` pierde ese `flushSync`.
> **La vigilan:**
> - ATQ-CH4-01 y ATQ-CH4-03 del tester, con un doble de `CampoContrasena` sin el `flushSync`; caen sin la guarda;
> - CH4-01, C-1 y CH3-C13, que fijan la línea y su lugar.
>
> En recuperar, que no tiene el campo, la guarda no es redundante, y CH4-10 (a), CH4-10 (b) y CH4-13 la vigilan.

**Quién toca qué:**
- **El programador:** solo `frontend/src/features/auth/guardas-ch4.test.tsx` y su sección del resumen.
- **El arquitecto:** CH4-10 y CH4-13 en el plan (Enmienda 5).
- **El tester:** no toca nada. Sus `*.ataque` quedan como están.

### 2. O-r1-3: la ref de «Restaurar», «Sí, regenerar» y «Subir»/«Bajar»
**Decisión: se declara la redundancia; la ref no se quita.** Es la segunda salida de la regla del humano, aplicada por analogía, así que no hace falta una decisión nueva.
- **Por qué es redundante:** `sigueEnVuelo()` lee la caché de mutaciones de forma síncrona, y `mutate`/`mutateAsync` dejan la mutación `pending` antes del primer `await`. El segundo clic del mismo render ya sale por `sigueEnVuelo()`, y ninguna prueba de comportamiento puede distinguir la ref.
  - Queda una ventana de una microtarea entre que la mutación se asienta y el `finally`. Ahí la ref frena y `sigueEnVuelo()` no, pero esa ventana no se puede probar y no protege nada que importe.
- **Por qué no se quita:**
  - quitarla obligaría a abrir excepciones en CH4-01 (la regla exige una ref tomada y guardada antes de cada llamada), lo que rompe el patrón único de `CLAUDE.md`;
  - obligaría a cambiar §D-4 bis y §D-4 ter;
  - no gana nada.
- **Lo que vigila cada parte:**
  - la ref, CH4-01 (si se quita la línea de la guarda o la que la toma, la regla cae);
  - `sigueEnVuelo()`, CH4-28 (a), CH4-20 «Sí, regenerar», CH4-40 (a) y CH4-38, que caerían sin ninguna de las dos guardas;
  - entre montajes, CH4-28 (c), CH4-34, CH4-37 (c) y CH4-40 (c).
- **Dónde se declara:** en el resumen del programador, con el texto de abajo, y en el plan (§D-4 bis y §D-4 ter, Enmienda 5).
> En «Restaurar», «Sí, regenerar» y «Subir»/«Bajar», la ref por clase es redundante con `sigueEnVuelo()` para el doble clic del mismo render: `queryClient.isMutating` lee la caché de forma síncrona, y `mutate`/`mutateAsync` dejan la mutación `pending` antes del primer `await`. Ninguna prueba de comportamiento la vigila (CH4-28 (a), CH4-20, CH4-40 (a) y CH4-38 siguen verdes sin ella; medición del tester, ronda 1). Se conserva por la regla de `CLAUDE.md` y por la forma única que exige CH4-01, que es lo que la vigila.
- **¿Va al humano?** No para declararla. Solo sería decisión suya quitar la ref, porque eso cambia la regla de `CLAUDE.md`, y no lo recomiendo. Va en "Para el humano" solo como aviso.

### 3. O-r1-1: la confirmación de «Sí, quitar» pasa abierta de A a B
- **El tester tiene razón, y mi verificación de la Enmienda 3 se equivocó.** Comprobé que las filas llevan `key` por id, pero no que el id de una persona puede repetirse en dos clases. `FilaMaestro` (`key={maestro.id}`) y `FilaAlumno` (`key={alumno.id}`) sobreviven al salto del historial cuando la misma persona está en las dos clases, y su confirmación llega abierta a B. Comentarios, publicaciones, dudas, recursos y temas sí se montan de nuevo cerrados, porque su id es de una sola clase.
- **Gravedad:** es una confirmación destructiva que aparece abierta en una clase donde nadie la pidió. Un clic retira a la persona de B. Ya existía antes de CHORE-04 (no la introduce) y no es de doble clic. Pertenece a la familia de H-3 y O-E3-1, que el humano mandó al `chore` de foco y navegación.
- **Decisión recomendada (a): queda con destino en ESTADO §3,** en la fila de H-3/O-E3-1, marcada como prioritaria dentro de ese `chore` por ser destructiva.
- **Alternativa (b): corregirla en CHORE-04.** El remedio cabe en "Se toca", con dos archivos y sin archivos nuevos:
  - `key={claseId}` en `<ListaMaestrosDeClase>` de `maestros-de-clase-view.tsx` (`lista-maestros-de-clase.tsx` está en "No se toca");
  - la clave de la fila de `tabla-alumnos.tsx` con la clase;
  - dos casos en `features/clases/guardas-ch4.test.tsx`;
  - una Enmienda 5 con más contenido.
  El riesgo está en el foco: la vecina de T-21 y `useFilaEnFoco` al volver a montar la lista. Haría falta otra ronda del tester.
- **Va al humano**, con mi recomendación de (a): es una decisión de alcance sobre un defecto destructivo. No bloquea la ronda del programador, pero debe estar tomada antes de mi revisión final.
- **La frase de §D-4 ter se corrige igual en las dos opciones** (Enmienda 5). Donde dice que "las demás confirmaciones en línea … viven en filas con `key` por id, que se montan de nuevo cerradas en la otra clase", pasa a decir:
  > las de comentarios, publicaciones, dudas, recursos y temas viven en filas con `key` por un id de una sola clase y se montan de nuevo cerradas en la otra clase; las de personas (`FilaMaestro` y `FilaAlumno`, `key` por el id de la persona) sobreviven al salto si la persona está en las dos clases, y su confirmación pasa abierta (O-r1-1 de la ronda 1; familia H-3/O-E3-1).

### 4. O-r1-2 y la incidencia de proceso del tester
- **O-r1-2: lo acepto.**
  - Hoy no existe ninguna forma sin guarda.
  - ATQ-CH4-30 a ATQ-CH4-34 fijan el inventario.
  - Endurecer CH4-01 no hace falta en este encargo.
- **La incidencia de proceso: la acepto.** El tester terminó un proceso que él mismo creó en esa llamada, y eso lo permite la regla. Las sondas temporales las creó y las borró él mismo, y su archivo quedó restaurado con `cmp`.

### 5. El recorrido que sigue
1. **El orquestador guarda la copia de `plan.md`** (`6f4eb385…`) y anota su SHA-256 en `aprobacion.md`.
2. **El arquitecto escribe una Enmienda 5 corta**, solo de redacción. No cambia la conducta, los archivos de "Se toca" ni el conteo de 33. Con la opción (b) de O-r1-1, cambiaría:
   - **CH4-10 y CH4-13:** la viñeta suma: "(Enmienda 5) En los formularios con `CampoContrasena` (cinco componentes, seis configuraciones), el `flushSync` de su *listener* de `submit` mete un render entre los dos eventos del mismo `act` también con el componente real, y la ref es redundante con `isPending`. Ahí CH4-10 (a), CH4-10 (b) y CH4-13 son la regresión de 'una sola petición con el componente real' y no vigilan la guarda. La vigilan ATQ-CH4-01 y ATQ-CH4-03 del tester (con un doble sin el `flushSync`), CH4-01, C-1 y CH3-C13. En recuperar, los tres casos sí la vigilan. No es PA-7 (arbitraje del manager)."
   - **§D-4 bis y §D-4 ter:** una línea en cada uno con la declaración de redundancia del punto 2.
   - **§D-4 ter:** la frase corregida del punto 3.
   - **A-2:**
     - "salvo que el humano decida otro" pasa a "(decidido por el humano el 2026-11-11)" en la línea de P-1, y esa línea nombra también el título de `BloqueDestacado` (O-E4-1);
     - si el humano elige (a) en O-r1-1, la fila de H-3/O-E3-1 suma el caso de las personas que están en las dos clases (maestro y alumno), marcado como prioritario por ser destructivo.
3. **Yo verifico la enmienda** con `git diff --no-index` contra la copia.
4. **Ronda del programador.** Solo puede tocar:
   - `frontend/src/features/auth/guardas-ch4.test.tsx`;
   - su sección al final de `resumen-programador.md`.
   Nada más. Si hiciera falta otro archivo, es PARADA.
   a. **Partir cada uno de los tres `it.each`** de CH4-10 (a), CH4-10 (b) y CH4-13 en dos:
      - el primero recorre solo `recuperar`, con el título de hoy sin cambio;
      - el segundo recorre las seis configuraciones con `CampoContrasena` (`NOMBRES` sin `recuperar`) y cambia su título.
      Los títulos nuevos son:
      - "CH4-10 (a): %s, con el CampoContrasena real, dos clics en un solo act mandan una sola petición y el botón espera hasta la respuesta (regresión; el segundo envío ya ve isPending por el flushSync de CampoContrasena, y la guarda la vigilan ATQ-CH4-01, CH4-01 y C-1)";
      - "CH4-10 (b): %s, con el CampoContrasena real, dos submit en un solo act mandan una sola petición, el segundo con defaultPrevented y el botón en espera (regresión; el segundo envío ya ve isPending por el flushSync de CampoContrasena, y la guarda la vigilan ATQ-CH4-01, CH4-01 y C-1)";
      - "CH4-13: %s, con el CampoContrasena real, tras un 500, dos submit válidos en un solo act mandan una sola petición; espera hasta la respuesta, sale con un solo MensajeError y un clic más manda la tercera (regresión; la guarda la vigilan ATQ-CH4-03, CH4-01 y C-1)".
   b. **El cuerpo de los casos no cambia,** ni una aserción.
   c. **Encima del `describe`,** un comentario de dos o tres líneas con el mecanismo: el *listener* de `submit` en captura de `CampoContrasena` con `flushSync`.
   d. **Cifras esperadas:**
      - `npx vitest list src/features/auth/guardas-ch4.test.tsx`: **92** casos, contados con `grep -a -c`;
      - CH4-10: **14**; CH4-13: **7**;
      - las cuatro pruebas nuevas del programador: **205**;
      - `npx vitest run src/features/auth`: todo verde, con su última línea;
      - `npm run lint`: exit 0.
   e. **El resumen** trae:
      - los dos textos de declaración de los puntos 1 y 2, tal cual;
      - cada título nuevo con su archivo;
      - las cifras con su comando;
      - y dice que no cambió ninguna aserción (el diff del archivo solo toca títulos, la partición de los `it.each` y el comentario).
5. **El tester no repite nada.** La ronda 1 queda RESISTE, y la ronda del programador solo cambia títulos y la partición.
6. **Mi verificación del resumen y la revisión final** pueden ir en la misma invocación:
   - primero lint y la suite de `src/features/auth`, con el diff del archivo (sin cambios de aserciones);
   - si la acepto, sigue la revisión final con build y la suite completa del frontend, una vez (sin backend: no se toca `shared/`);
   - antes de la revisión final, las decisiones del humano de "Para el humano" deben estar tomadas.

### Para el humano
1. **O-r1-1, la confirmación de «Sí, quitar» que pasa abierta a otra clase.** Recomiendo (a): mandarla a ESTADO §3 como prioritaria en el `chore` de foco y navegación. Con (b) se corrige ahora, con dos archivos de "Se toca", dos casos y otra ronda del tester.
2. **Aviso, no hace falta decidir:** en los formularios con contraseña y en «Restaurar», «Sí, regenerar» y «Subir»/«Bajar», la ref es redundante, y así se declara con la segunda salida de tu regla. Quitarla sería decisión tuya (cambia la regla de `CLAUDE.md`), y no lo recomiendo.
3. **Confirmar la lectura del orquestador sobre P-1:** que es la opción (a), con la frase de recuperación y la de O-E4-1 en ESTADO §3. Si no es así, me lo dicen antes de la revisión final.

## Verificación de la Enmienda 5 — CHORE-04 (2026-11-11)
**Veredicto: APROBADO, sin M-n.** Lo aplicado es exactamente lo que pedí. Quedan dos detalles de redacción que el arquitecto suma a la misma Enmienda 5 (textos abajo) y que yo verifico contra la misma copia. No cambian la conducta, los archivos ni el conteo, y no van al humano.

La verifiqué solo leyendo, sin suites:
- `plan.md`: 677 líneas, `efef1f2b…`;
- copia de antes: `scratchpad/copias-plan-ch4/plan-ch4-antes-e5-6f4eb385.md`, `6f4eb385…` (comprobado).

### El diff, hunk por hunk (`git diff --no-index`, 7 hunks)
1. **La nota de la Enmienda 5** (líneas 34-39). Dice bien la regla del humano, O-r1-3, O-r1-1 con la opción (a) y P-1 decidido, y que la conducta, los archivos y el conteo de 33 no cambian.
2. **§D-4 bis**, después del párrafo de `AccionesDelAdmin`: la declaración de redundancia con `sigueEnVuelo()`, con mi texto tal cual.
3. **§D-4 ter**, una viñeta con la misma declaración.
4. **§D-4 ter, "Las demás confirmaciones en línea"**: mi frase corregida, tal cual, más la decisión (a) del humano.
5. **CH4-10**: suma mi texto de la Enmienda 5, tal cual.
6. **CH4-13**: el mismo texto, tal cual.
7. **A-2**:
   - la fila de H-3 suma O-r1-1, prioritario y con maestro y alumno;
   - la línea de P-1 queda como decidida y quita "salvo que el humano decida otro";
   - O-E4-1 está nombrado con su texto y su origen (`TEXTOS_PANEL.error`).

Nada fuera de lo pedido.

### Las dos frases que señaló el arquitecto: se corrigen las dos
**D-E5-1 · §D-4 bis, viñeta "Mutaciones sin `mutationKey`", última frase.** O-r1-1 y ATQ-CH4-16 la desmienten para las filas de personas.
- **Hoy dice:** "Las filas con `key` por id (alumnos, candidatos, comentarios, publicaciones) y los formularios de `auth` y de unirse no dependen de un id de la ruta."
- **Texto nuevo:**
  > Las filas con `key` por un id de una sola clase (comentarios, publicaciones) y los formularios de `auth` y de unirse no dependen de un id de la ruta. (Enmienda 5, O-r1-1) `FilaAlumno` lleva `key` por el id de la persona y sobrevive al cambio de clase cuando la misma persona está en las dos. Su mutación no tiene `mutationKey`, así que el observador sigue atado y la ref se suelta cuando A responde (ATQ-CH4-16 del tester). Su confirmación abierta pasa a B (O-r1-1, decisión (a) del humano, a ESTADO §3). `FilaCandidato` también lleva `key` por el id de la persona y no tiene confirmación; si sobreviviera al salto, su ref se soltaría igual cuando A responde, por el mismo motivo.

**D-E5-2 · §D-4 ter, "Estados vecinos de §D-4 ter con el remedio".** La frase sigue siendo cierta, pero desde O-r1-3 debe nombrar las dos guardas.
- **Hoy dice:** "Dos clics en el mismo render siguen parados por la ref."
- **Texto nuevo:**
  > Dos clics en el mismo render siguen parados: por `sigueEnVuelo()` y por la ref, que es redundante con él (Enmienda 5, O-r1-3).

**Cómo se aplica:** el arquitecto las suma como detalle de la misma Enmienda 5, con la marca "Enmienda 5". El orquestador no necesita otra copia: verifico contra `6f4eb385…`. Espero los mismos 7 hunks más el cambio de esas dos frases, en hunks propios o dentro de los que ya hay.

### Fe de erratas de mi arbitraje tras la ronda 1
La errata que señaló el orquestador es cierta. En `revision.md:719` (punto 5, paso 2), dice:
> Con la opción (b) de O-r1-1, cambiaría:

Debe decir:
> Cambia lo que sigue (con la opción (b) de O-r1-1 cambiarían además los archivos y el conteo):

La lista que sigue aplica la opción (a), que es la que eligió el humano y la que el arquitecto transcribió. No dejo sin corregir nada más de esa sección.

### Lo que sigue
- **La ronda del programador que lanzaste en paralelo es compatible.** Su lista sale de mi arbitraje (línea 639) y no depende de la Enmienda 5: solo `features/auth/guardas-ch4.test.tsx` y su resumen.
- **Después:**
  1. el arquitecto aplica D-E5-1 y D-E5-2;
  2. yo verifico esos dos cambios;
  3. hago la verificación del resumen del programador y la revisión final con la suite completa, en la misma invocación.

## Verificación de D-E5-1 y D-E5-2 y del resumen del programador — CHORE-04 (2026-11-11)
### D-E5-1 y D-E5-2: APROBADO
- **Archivos:** `plan.md` tiene 677 líneas (`38b73074…`). La copia de antes es `plan-ch4-antes-e5-6f4eb385.md` (`6f4eb385…`, comprobado). `git diff --no-index --shortstat` da `1 file changed, 17 insertions(+), 7 deletions(-)`.
- **Lo que cambió respecto de la verificación anterior:** solo tres renglones.
  - **§D-4 bis (línea 311):** la última frase de "Mutaciones sin `mutationKey`" es mi texto de D-E5-1, tal cual.
  - **§D-4 ter (línea 368):** mi texto de D-E5-2, tal cual.
  - **La nota de la Enmienda 5:** la viñeta de O-r1-3 nombra D-E5-1 y D-E5-2.
- **Lo demás** son los 7 hunks que ya verifiqué. No hay nada más.

### Resumen del programador: ACEPTADO
- **Lo que verifiqué:**
  - `resumen-programador.md`: 386 líneas, `d530ec10…`, sección "## CHORE-04 — Ronda tras el arbitraje de la ronda 1" (línea 324);
  - `frontend/src/features/auth/guardas-ch4.test.tsx`: `13f59876…`.
- **Ninguna aserción cambió.** Los cuerpos de `casoCH410a` (líneas 347-362), `casoCH410b` (364-380) y `casoCH413` (382-405) coinciden línea por línea con los de las líneas 342-357, 371-378 y 420-443 que leí en la primera verificación; solo cambia la sangría. Mover los cuerpos a funciones con nombre es una libertad de forma aceptable: evita duplicarlos.
- **La partición está bien:**
  - `SOLO_RECUPERAR` y `CON_CAMPO_CONTRASENA` (`NOMBRES` sin `recuperar`);
  - los tres títulos de `recuperar` siguen sin cambio;
  - los tres títulos de regresión son los míos, tal cual;
  - el comentario tiene tres líneas, encima de las constantes y antes del `describe`.
- **Las dos declaraciones** de las líneas 327-345 son las mías, tal cual.
- **Mis cifras** (de la revisión final, abajo):
  - lint, exit 0;
  - `npx vitest list` de las cuatro pruebas nuevas: 92 · 79 · 29 · 5 = 205 (CH4-10 14 y CH4-13 7);
  - la suite completa, en verde.

  No corrí aparte `npx vitest run src/features/auth`, porque la suite completa lo incluye. El resumen da `Tests  898 passed (898)`; los 21 archivos de `auth` corren dentro de mi suite completa.

## Revisión final — CHORE-04 (2026-11-11)
Veredicto: **APROBADO CON OBSERVACIONES.** No hay problemas que bloqueen. Las observaciones son las redundancias declaradas, que tienen su vigilancia, y los pendientes con destino que decidió el humano.
Verificación propia (desde `frontend/`, una corrida a la vez; con corriente: `BatteryStatus` 2, 100 %; la otra copia de trabajo no se usa): lint `> tsc -b` (exit 0) · build `✓ built in 1.47s` (exit 0) · test (`npm run test`, la suite completa) `Test Files  331 passed (331)` · `Tests  7626 passed (7626)` (Duration 559.99s).

### Problemas que bloquean
Ninguno.

### Lo verificado
- **Alcance:**
  - `git status`: no hay cambios en `backend/` ni en `shared/`. El `pretest` de `npm run test` compila `shared/` y no deja cambios. Por eso no corrí la suite del backend.
  - Fuera de los paquetes solo están `docs/ESTADO.md` (`2186bbf8…`, del orquestador, que viaja en este commit por decisión del humano), la carpeta del encargo y las dos investigaciones, que no van en el commit.
  - El índice está vacío.
- **"No se toca" contra `9b6953c`:**
  - `frontend/` tiene 37 archivos: los 33 de §D-0 (26 de producción, 4 pruebas nuevas, 2 de la lista cerrada y el `*.ataque` de C-1) más los 4 `*.ataque` del tester;
  - `git diff --stat` de los seguidos: `29 files changed, 351 insertions(+), 72 deletions(-)`, sin cambio desde mi primera verificación;
  - ningún archivo de "No se toca" aparece.
- **V-01:** hay 285 `*.ataque`, idéntica a `v01-ch4-r1.txt` (`686daf88…`). Contra la base (`f292fb31…`) solo cambian la línea de C-1 (`74b07393…` → `151dbd75…`) y las 4 nuevas del tester. Nadie modificó, saltó ni borró un `*.ataque` existente.
- **V-06:** hay 90 `enEspera=` en producción, en la base y hoy, sin diferencias por archivo.
- **Caracteres invisibles:** busqué espacios de ancho cero, marcas de dirección, BOM, guion suave y espacio duro en los 37 archivos. No hay ninguno.
- **El plan está cumplido:**
  - los pasos 1 a 11;
  - Enmienda 1 (M-01, M-02, «Restaurar» y H-3);
  - Enmienda 2 («Sí, regenerar» por clase);
  - Enmienda 3 (la confirmación se cierra al cambiar de clase);
  - Enmienda 4 (P-1);
  - Enmienda 5 (redacción y decisiones del humano).

  La forma del código la verifiqué contra §D-1 a §D-4 ter en la verificación del primer resumen, y el diff de producción no cambió desde entonces. La excepción a PA-4 es la mínima.
- **La regla del humano sobre las pruebas de la guarda: acepto la tabla de mutaciones del tester.** No repetí la muestra completa. Ya tenía una medición propia y coincidente en login: M1, sin la ref, deja los 19 casos de comportamiento en verde y hace caer CH4-01, C-1 y CH3-C13; M2 y M3 aíslan el `flushSync`. Las restauraciones las verifiqué por el diff, que no cambió.
  - La guarda de cada formulario con contraseña la vigilan ATQ-CH4-01 y ATQ-CH4-03, que caen sin ella, y además CH4-01, C-1 y CH3-C13.
  - La de recuperar, los botones, «Cerrar sesión» y «Unirme», los casos del programador.
  - La redundancia está declarada en el plan (Enmienda 5) y en el resumen, con el mecanismo.
- **`CLAUDE.md`:**
  - módulos: los tipos nuevos en `types.ts`, la clave en `data.ts`, la función pura en `lib.ts` y los ganchos en `hooks.ts`;
  - no hay tipos en componentes salvo `Props`, ni `?? []`, ni `fetch`, ni `console.`;
  - retornos tempranos;
  - `try/catch/finally` en los manejadores asíncronos (el aviso, en el gancho);
  - ningún valor por defecto silencioso: el `?? null` de `useOrdenDeTemasEnVuelo` significa "no hay orden", no oculta datos;
  - comentarios solo para el porqué.
- **`AGENTS.md`:**
  - las reglas que no se rompen no aplican (solo frontend, sin seguridad en la interfaz: la autorización sigue en el middleware);
  - ninguna suite se corrió a la vez que otra;
  - los formateadores se usaron acotados al archivo;
  - ningún agente hizo commit.
- **Diseño:** no hay patrón visual nuevo, token, texto ni componente. `DESIGN.md` no cambia (§D-7). El cambio visible declarado (los «Ver más» esperan durante las recargas, y el foco va al título de la clase) usa `enEspera` y los ganchos de foco de siempre. No hubo comprobación humana en navegador (S-06, decisión del humano); jsdom cubre lo que cambia.
- **Las pruebas no localizan elementos por clases de estilo,** y toda prueba nueva tiene aserciones.
- **La definición de terminado:**
  - cumple lo que pedía CHORE-04: ESTADO, DH-7, O-22, la fila 29 y E-38;
  - capas y middleware no cambian;
  - lint, build y test en verde;
  - no hay endpoint nuevo ni migración ni cambios en `infra/`;
  - los documentos van al cierre (A-1 y A-2).

### Problemas que no bloquean (observaciones)
- **O-F-1 · Guardas redundantes, declaradas y vigiladas:**
  - con `isPending` en los cinco formularios con `CampoContrasena`, por su `flushSync`;
  - con `sigueEnVuelo()` en «Restaurar», «Sí, regenerar» y «Subir»/«Bajar».

  Se conservan por la regla de `CLAUDE.md`; las vigilan los ATQ del tester y CH4-01. Si algún día se quita el `flushSync` de `CampoContrasena`, los ATQ siguen vigilando la guarda.
- **O-F-2 · Pendientes con destino, decididos por el humano:** H-2, M-01 (el aviso de más), H-3 con O-E3-1 y O-r1-1 (**prioritario**, destructivo), y P-1 con O-E4-1. Todos van al `chore` de foco y navegación del marco, que en la hoja de ruta va después de DOCS-05. La lista de A-2 está abajo.
- **O-F-3 · Huecos de la regla estática (O-r1-2):** hoy no hay ninguna forma real sin guarda, y ATQ-CH4-30 a ATQ-CH4-34 fijan el inventario. Si un encargo agrega una forma nueva de llamar a una mutación, esas reglas caen y obligan a decidir.

### Desacuerdos arbitrados
- P-1: la viñeta cambia y la conducta no (Enmienda 4).
- El rojo de `auth`: el mecanismo es el `flushSync`; no es PA-7 en el fondo.
- Los 18 casos: la regla del humano, con títulos de regresión y la redundancia declarada.
- O-r1-3: se declara la redundancia y la ref no se quita.
- O-r1-1: la opción (a) del humano.

Todo consta en las secciones anteriores de este archivo.

### Al cierre: A-1 (`CLAUDE.md`, con la autorización del humano)
**O-E1-2:** el texto de A-1 junta cuatro frases que suman unas 150 palabras. Recomiendo partirlo en dos viñetas seguidas, sin cambiar el contenido: son las frases literales del plan, agrupadas por tema (dónde vive y cuándo se suelta la guarda, y qué la verifica). Van después de la viñeta de la guarda síncrona con ref, en `CLAUDE.md` › Sistema de diseño › Componentes:

> - La guarda va en un manejador con nombre del componente dueño de la mutación, nunca en una flecha en línea en el JSX: se comprueba al inicio (en un formulario, después de `evento.preventDefault()` y antes de la guarda `isPending` y de `reset()`), se toma justo antes de `mutate` y se suelta en el `onSettled` de ese `mutate`. Si la `mutationKey` lleva un id de la ruta y el componente sobrevive al cambio de ese id (sin `key`), un cambio de clave suelta al observador y el `onSettled` del `mutate` ya no corre: la guarda guarda el id que protege y se suelta en el `finally` de `mutateAsync`.
> - Si un solo clic sobre el control montado de nuevo reenviaría sin volver a confirmar (por ejemplo, «Subir» y «Bajar»), la guarda lee además la caché de mutaciones por su `mutationKey`. `lib/guardas-de-doble-clic-estatico.test.ts` lo verifica en todo `src/`, junto con `fetchNextPage({ cancelRefetch: false })` en los "Ver más" y `refetch({ cancelRefetch: false })` en los botones que piden una consulta (CHORE-04).

### Al cierre: A-2 (`docs/ESTADO.md`)
1. **Sección 2 → sección 1:** CHORE-04 pasa a "cerrado", con fecha, commit, ramas y cifras: frontend con 37 archivos (33 del encargo y 4 `*.ataque` del tester), la suite completa de esta revisión y 285 `*.ataque`. Sin backend, `shared/`, `infra/` ni `DESIGN.md`.
   - Qué quedó:
     - la guarda síncrona en los 17 controles;
     - «Ver más» con `isFetching`;
     - «Reintentar» con `cancelRefetch: false`;
     - el orden de temas entre montajes y con cambio de clase;
     - «Restaurar» y «Sí, regenerar» por clase;
     - la regla estática.
   - El cambio visible declarado: los «Ver más» esperan durante las recargas de fondo, y el foco va al título de la clase si desaparece la confirmación de regenerar.
2. **Sección 2b:** en la hoja de ruta, CHORE-04 pasa a hecho y DOCS-05 queda como el siguiente.
3. **Inventario de CHORE-04** (viñeta "CHORE-04 · guardas de doble clic"): tachar las filas 3, 4, 5, 6, 12 a 23, 27, 28 y 29 con "**Hecho en CHORE-04 (2026-11-11).**".
   - En la 29, la frase "Lo mismo aplicará a Recursos (03d)…" se cierra con "no aplica: `useOrdenarTemas` solo lo usa `trabajo-view.tsx`".
   - Si todas las filas quedan tachadas, la viñeta se marca como cerrada.
   - El punto 4b de la sección 2b se marca como hecho.
4. **Sección 3, fila "Los demás «Ver más» de CLASES"** (hoy en la línea 390): "**Comentarios e inicios, hechos en CHORE-04 (2026-11-11).**". La fila queda cerrada.
5. **Sección 3, filas nuevas** (las cuatro con destino el `chore` de foco y navegación del marco):
   - **(a) H-2 (S-04):** los `refetch()` de "pulsar la sección activa" no llevan `cancelRefetch: false`, así que dos pulsaciones seguidas con la lista en error cancelan y piden otra vez. Son siete sitios: `dudas-view.tsx:59`, `muro-view.tsx:68`, `recursos-view.tsx:74`, `trabajo-view.tsx:117` (111 en la base), `components/seccion-de-recursos.tsx:83`, `components/respuestas-de-duda.tsx:168` y `components/seccion-de-tema.tsx:65`. Va con "una sola política de recarga".
   - **(b) M-01, el aviso de más mientras `apiClient` redirige:** el texto de A-2 del plan (Enmienda 1), tal cual.
   - **(c) H-3 (S-07):** el texto de A-2 del plan, tal cual: Enmienda 1, más la Enmienda 3 (el `staleTime` de «Sí, quitar» de un maestro), más la Enmienda 5 (O-r1-1, **prioritario** por ser destructivo, con el maestro y el alumno). Además, O-E3-1, de mi verificación de la Enmienda 3:
     - la confirmación de borrar de `AccionesDeLaTarea` (`detalle-tarea-view.tsx:134`) pasa abierta a otra tarea;
     - "Nuevo tema" (`creando` de `trabajo-view.tsx`) pasa abierto a otra clase.
   - **(d) La familia del fallo de una página:** se suma a la fila existente del hermano de T-02 de CLASES-03e (hoy en la línea 381) el texto de A-2 del plan (Enmiendas 4 y 5, decidido por el humano el 2026-11-11): la línea de P-1 y la de O-E4-1 (el título de `BloqueDestacado`).
6. **Sección 4, decisiones de esta sesión:**
   - S-01, S-06 y S-07 opción (b) (2026-11-10);
   - P-1 opción (a) y O-r1-1 opción (a) (2026-11-11);
   - la regla del humano: "una prueba que pasa sin la guarda no la vigila; se comprueba quitándola" (2026-11-11), con su aplicación en CHORE-04 (la redundancia declarada con `isPending` en los formularios con `CampoContrasena` y con `sigueEnVuelo()` en «Restaurar», «Sí, regenerar» y «Subir»/«Bajar»).
7. **O-r1-2 no lleva fila:** hoy no existe ninguna forma real sin guarda, y ATQ-CH4-30 a ATQ-CH4-34 fijan el inventario. Solo se menciona en el resumen de cierre de la sección 1.
8. **Sección 6, la medición de CHORE-04:** la tabla de abajo, con sus lecciones.

### La medición de CHORE-04
| Concepto | Valor |
|---|---|
| Rondas del tester | r0 (C-1, no es de ataque) + r1 **RESISTE**: 1 ronda de ataque, 0 extra |
| Rondas extra por hermanos o estados vecinos | 0 (umbral: no) |
| Resúmenes devueltos | 1 de 3 (la implementación: M-01 venía del plan, P-1; M-02 era del programador). La corrección y la ronda tras el arbitraje se aceptaron a la primera |
| Enmiendas del plan | 5: tres antes de la aprobación (M-01 a M-03 del manager) y dos después (la 4 por P-1; la 5 de redacción, tras la ronda 1) |
| Paradas | 1 parcial del programador (P-1: una viñeta incumplible, bien detenida) |
| Incidencias de proceso | ver abajo |

**Incidencias de proceso:**
- el programador siguió adelante ante la condición literal de PA-7 (lo declaró; en el fondo no era PA-7);
- el rojo de clases se corrió fuera de orden (la evidencia vale);
- el guion del manager falló al restaurar por una ruta relativa (restauré de inmediato, con verificación byte a byte);
- el tester terminó un proceso suyo que esperaba entrada (permitido).

**Lecciones para el plan siguiente:**
1. **El "rojo primero" de una guarda se mide quitándola, no razonando** (regla del humano). El plan debe pedir esa mutación en la ronda 0 o en el rojo, para descubrir a tiempo los mecanismos que la vuelven redundante. Aquí fueron el `flushSync` de `CampoContrasena` y `sigueEnVuelo()`.
2. **Una viñeta sobre lo que pasa tras un error se coteja con el orden "error primero" de la vista** antes de pedirla. P-1 pedía un botón que el error ya quitaba.
3. **Al revisar los hermanos por `key`, se comprueba que el id sea único por el id de la ruta,** no solo que haya `key`. O-r1-1 se escapó de mi verificación de la Enmienda 3.

### El conjunto del commit
- **Comando:** `git add frontend docs/ESTADO.md docs/trabajo/CHORE-04-guardas-de-doble-clic`, más `CLAUDE.md` cuando A-1 esté aplicado.
- **Rutas:** `git add -n` sobre esas rutas da **43**:
  - los 37 de `frontend/`;
  - `docs/ESTADO.md`;
  - los 5 archivos del encargo (`aprobacion.md`, `plan.md`, `reporte-tester.md`, `resumen-programador.md` y `revision.md`).

  Con `CLAUDE.md` serán 44.
- **Cotejo con `git add -n -A`:** da 45. Solo quedan fuera `docs/trabajo/DEPLOY-investigacion-vps.md` y `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`, como debe ser. El índice está vacío.
- **Tras A-1 y A-2:** el orquestador vuelve a pedirme una verificación corta de `CLAUDE.md` y `docs/ESTADO.md` antes del commit.

### Para el humano
1. **A-1:** autorizar el cambio de `CLAUDE.md`. Recomiendo las dos viñetas de arriba (mismo contenido que el plan, partido para que se lea).
2. **Propuesta, opcional y fuera del plan:** llevar tu regla de las pruebas de guarda a `AGENTS.md` › Pruebas, para que valga en los encargos siguientes. Texto sugerido: "Una prueba que dice vigilar una guarda se comprueba quitando la guarda (mutación real, restaurada); si pasa sin ella, no la vigila: se reescribe o se declara la redundancia con su mecanismo (decisión del humano, 2026-11-11, CHORE-04)". Sin tu aprobación no se aplica.

### Resumen para el humano (CHORE-04)
1. **Veredicto: APROBADO CON OBSERVACIONES.** Nada bloquea.
2. **Qué hace:** pone la guarda contra el doble clic en los 17 controles que no la tenían (los formularios de acceso, los tres «Cerrar sesión» y los controles de clases).
3. **Además:**
   - los «Ver más» esperan durante las recargas;
   - «Reintentar» de la barra ya no cancela la petición en vuelo;
   - «Subir»/«Bajar», «Restaurar» y «Sí, regenerar» ya no se cruzan entre clases.
4. **Una regla estática nueva** vigila todo `src/`.
5. **Mis cifras:** lint en exit 0, build en verde (`✓ built in 1.47s`) y la suite completa del frontend con `Test Files  331 passed (331)` · `Tests  7626 passed (7626)`. No se tocaron `backend/` ni `shared/`.
6. **Archivos:** 37 en el frontend (33 del plan y 4 pruebas de ataque). Hay 285 `*.ataque`, y ninguno existente cambió salvo el de la ronda 0.
7. **Tu regla de las pruebas de la guarda se cumplió:**
   - donde una prueba pasaba sin la guarda, quedó como regresión;
   - la guarda la vigilan las pruebas del tester, que caen al quitarla.
8. **Redundancia declarada:** en los formularios con contraseña y en tres controles de clases, la guarda repite lo que ya frena otro mecanismo. Se conserva por la regla de `CLAUDE.md`.
9. **Pendientes que decidiste mandar al `chore` de foco y navegación:**
   - la confirmación de «Sí, quitar» que pasa abierta a otra clase (prioritaria, porque es destructiva);
   - las frases de recuperación tras el fallo de un «Ver más»;
   - el aviso de más mientras se redirige;
   - H-2 y H-3.
10. **Medición:** una ronda de ataque y RESISTE, sin rondas extra por hermanos; un resumen devuelto; cinco enmiendas; una parada parcial bien hecha.
11. **Lo que necesito de ti:** la autorización de A-1 en `CLAUDE.md` (dos viñetas).
12. **Opcional:** llevar tu regla de las pruebas de guarda a `AGENTS.md`.
13. **Commit:** 43 rutas, más `CLAUDE.md` cuando A-1 esté aplicado. Quedan fuera solo las dos investigaciones de `docs/trabajo/`.

## Verificación de los documentos del cierre — CHORE-04 (2026-11-11)
**Veredicto: APROBADO, con una corrección de formato (D-C-1)** que el orquestador aplica tal cual, sin otra verificación que el `grep` indicado. D-C-2 es una recomendación que no bloquea. La verificación fue solo de lectura, sin suites.

1. **`CLAUDE.md`** (`182d6615…`). El diff da 2 líneas nuevas en "Componentes", justo después de la viñeta de la guarda síncrona con ref y antes de la de «Ver más». Son mis dos viñetas de "Al cierre: A-1", tal cual, y no hay nada más.
2. **`AGENTS.md`** (`45894ec8…`). El diff da 1 línea nueva en "Pruebas", después de "Toda prueba debe ejecutar al menos una aserción…". Es mi texto sugerido, tal cual, y no hay nada más.
3. **`docs/ESTADO.md`** (`a5f4702b…`). Contra la copia `ESTADO-antes-A2.md` (`2186bbf8…`), el diff da 49 inserciones y 26 borrados. Lo comparé con mis ocho puntos de A-2 y con los textos literales de A-2 del plan:
   - **Punto 1, aceptado como lo ajustaste:** CHORE-04 se queda en la sección 2 como "cerrado el 2026-11-11, pendiente del commit del humano y de la fusión en `main`". Es correcto, porque la sección 1 es de encargos ya fusionados. El párrafo trae lo que pedí: qué quedó, el cambio visible, las cifras (lint, build, `331`/`7626`, 205 + 143 casos, 285 `*.ataque`), la redundancia declarada, los pendientes con destino y O-r1-2 sin fila. También trae tu frase de los dos documentos autorizados.
   - **Los 285 `*.ataque`** son de todo el repositorio: la base de V-01 (281) incluye los del backend. El agente hizo bien en no escribir "del frontend".
   - **Punto 2:** la hoja de ruta marca CHORE-04 como cerrado y DOCS-05 como el siguiente. El punto 4b también está.
   - **Punto 3:** el inventario está cerrado, y las filas 3–6, 12–23 y 27–29 están tachadas con "Hecho en CHORE-04 (2026-11-11)". La 29 cierra la frase de Recursos.
   - **Punto 4:** la fila de los «Ver más» de CLASES está cerrada.
   - **Punto 5:** las cuatro filas tienen sus textos:
     - H-2: los siete sitios, con `trabajo-view.tsx:117` (111 en la base);
     - M-01: el texto literal de la Enmienda 1;
     - H-3: el texto literal de las Enmiendas 1, 3 y 5, más O-E3-1, con O-r1-1 marcado como prioritario en la descripción y en el destino;
     - P-1 y O-E4-1: sumados a la fila del hermano de T-02, con el texto literal de las Enmiendas 4 y 5.
   - **Punto 6:** la sección 4 trae las decisiones del 2026-11-10 y del 2026-11-11, y la regla del humano con su aplicación.
   - **Punto 7:** O-r1-2 no tiene fila.
   - **Punto 8:** la sección 6 trae la medición y las tres lecciones, tal cual.

### D-C-1 · Corrección de formato (sí hay que aplicarla)
En la sección 2, en el párrafo de CHORE-04 (`docs/ESTADO.md:239`), hay cuatro asteriscos seguidos que rompen la negrita.
- **Dice:** `Medición en la sección 6. ****Documentos del cierre, autorizados por el humano (2026-11-11):**`
- **Debe decir:** `Medición en la sección 6. **Documentos del cierre, autorizados por el humano (2026-11-11):**`
- **Comprobación:** después, `grep -c '\*\*\*\*' docs/ESTADO.md` debe dar 0.

### D-C-2 · Recomendación (no bloquea): enlazar la fila del aviso de más con la de ADMIN-01d1
Conviene enlazarlas. La fila de ADMIN-01d1 (`docs/ESTADO.md:347`: 12 entradas de `features/clases` que avisan ante un código que `apiClient` redirige; destino "carril trivial o un `chore` posterior") es la misma familia que la fila nueva de CHORE-04 (M-01), y es probable que compartan ganchos. Así se resuelven juntas y nadie lo hace dos veces.
- **Dónde:** al final de la descripción de la fila nueva de CHORE-04 (M-01, el aviso de más mientras `apiClient` redirige), antes del separador `|` del destino.
- **Texto que se suma:** `. Misma familia que la fila de ADMIN-01d1 (12 entradas de \`features/clases\` que avisan ante un código que \`apiClient\` redirige): conviene resolverlas juntas en ese \`chore\`.`
- **No se cambia** el destino de la fila de ADMIN-01d1.

### 4. El conjunto del commit
- **Comando:** `git add -n -A -- frontend CLAUDE.md AGENTS.md docs/ESTADO.md docs/trabajo/CHORE-04-guardas-de-doble-clic` da **45 rutas**:
  - los 37 de `frontend/`;
  - `CLAUDE.md` y `AGENTS.md`;
  - `docs/ESTADO.md`;
  - los 5 archivos del encargo.
- **Cotejo:** `git add -n -A` da 47. Solo quedan fuera `docs/trabajo/DEPLOY-investigacion-vps.md` y `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`.
- **Estado:** el índice está vacío. Fuera de `frontend/`, `git status` solo muestra `AGENTS.md`, `CLAUDE.md`, `docs/ESTADO.md`, la carpeta del encargo y las dos investigaciones.
- **Al aplicar D-C-1** (y D-C-2, si se aplica), el número de rutas no cambia; solo cambia el SHA-256 de `docs/ESTADO.md`, que el orquestador anota en `aprobacion.md`.
