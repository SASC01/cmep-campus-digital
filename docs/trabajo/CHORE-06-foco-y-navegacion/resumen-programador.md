# Resumen del programador — CHORE-06 · foco y navegación del marco

Cada entrega del programador agrega su sección al final de este archivo, por partes (`cat >>`), sin reescribirlo.

## CHORE-06a — Implementación (2026-11-12)

Programador. Plan: `plan.md` (694 líneas, SHA-256 `c5fe10fc…1297`, con las Enmiendas 1 y 2). Se aplican también los arbitrajes de `revision.md`: "Arbitraje de la ronda 0" y "Arbitraje de PA-1". Rama `chore/chore-06-foco-y-navegacion`, base `47c3339`. El equipo estaba conectado a la corriente (`BatteryStatus` 2). El orquestador transmitió la respuesta del humano: la otra copia de trabajo no se usa y no había otra suite corriendo. Nunca corrí dos suites a la vez.

**Estado: terminado.** Pasos 2 a 11. Al empezar, C-1, C-2 y C-11 ya estaban aplicadas, con los hashes del arbitraje: `guardas-ch4-r1` `b29a7828…`, `alumnos-b-r1` `236cba62…` y `alumnos-b-r3` `d938aa80…`. Siguen intactas.

### PARADA PA-1 y su resolución
- **Qué cayó.** Al primer cierre de la suite de 06a (`Tests  2 failed | 5299 passed (5301)`) cayeron dos casos de `features/tareas/clase-archivada-01d2-tareas.test.tsx:1035-1046`, una prueba normal fuera de la lista cerrada: ADM-1D221 «éxito, con la vista desmontada: como hoy, navega; un aviso», en las filas 35 (crear tarea) y 36 (editar tarea).
- **Causa.** La guarda `if (!montado.current || !sigueVigente(generacion)) return` que el plan pide en `handleGuardar` (§D-1, Formas A y C). Con la `key`, el contenido se desmonta igual al saltar a otro id que al salir de la vista, y `useMontado` no distingue los dos casos. Me detuve y lo reporté.
- **Resolución.** El manager arbitró ("Arbitraje de PA-1") y el humano eligió la opción (a): con la vista desmontada, guardar una tarea (nueva o editada) no navega y sale un solo aviso de éxito. El código quedó como estaba. La lista cerrada de 06a ganó esa entrada y la cambié con el texto exacto del arbitraje:
  - título nuevo: «ADM-1D221 éxito, con la vista desmontada: no navega; un aviso (CHORE-06a, como editar recurso y crear o editar clase)»;
  - cuerpo nuevo: `const { cliente, router, soltar } = …`, `soltar()`, espera de `exitos()` en 1, `reposar(cliente)`, la ruta igual a `RUTAS.otra` y distinta de `destino`, y `exitos()` en 1.
  - `conLaEscrituraEnVuelo` ya devolvía `cliente` y `RUTAS.otra` existe (`:52`). No cambié ninguna ayuda ni nada más del archivo.
- **Cambio visible aprobado por el humano:** si guardas una tarea y te vas a otra sección antes de que el servidor conteste, ya no te regresa al detalle: te quedas donde fuiste y ves el aviso de que se guardó. Es lo mismo que ya pasaba al editar un recurso o una clase.
- **Otros cambios visibles (R-04):** al cambiar de clase con un salto del historial, el foco que estaba en un formulario, en Personas o en Calificaciones va al título de la clase. Al cambiar de tarea, de alumno o de recurso, va a la raíz de la vista.

### Archivos tocados en `frontend/` contra `47c3339` (`git status --porcelain frontend | wc -l` → 34; el conteo de 06a es de 34)
- **Producción (25):**
  - `features/clases/`: `maestros-de-clase-view.tsx`, `alumnos-view.tsx`, `personas-view.tsx`, `editar-clase-view.tsx`, `categorias-view.tsx`, `muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `editar-recurso-view.tsx`, `hooks.ts`;
  - `features/clases/components/`: `seccion-de-recursos.tsx`, `formulario-unirse-clase.tsx`, `formulario-clase.tsx`, `formulario-publicacion.tsx`, `formulario-recurso.tsx`;
  - `features/tareas/`: `crear-tarea-view.tsx`, `detalle-tarea-view.tsx`, `editar-tarea-view.tsx`, `entrega-de-alumno-view.tsx`, `hooks.ts`, `components/formulario-tarea.tsx`, `components/formulario-de-entrega.tsx`;
  - `features/calificaciones/`: `gradebook-view.tsx`, `mis-calificaciones-view.tsx`.
- **Pruebas nuevas (4):** `app/estado-por-id-ch6.test.tsx`, `features/clases/avisos-al-redirigir-ch6.test.tsx`, `features/tareas/avisos-al-redirigir-ch6.test.tsx`, `lib/estado-por-id-estatico-ch6.test.ts`.
- **Lista cerrada (2):**
  - `features/clases/guardas-ch4.test.tsx`: `avisoDeClases` con `REDIRIGEN.includes(error.codigo) ? null : …` y el título de CH4-25, como dice el plan;
  - `features/tareas/clase-archivada-01d2-tareas.test.tsx`: ADM-1D221, como dice el arbitraje de PA-1.
- **`*.ataque` del tester (3):** C-1, C-2 y C-11, sin cambios míos.
- **Fuera del conteo:** `docs/ESTADO.md`, `docs/trabajo/DOCS-05-envivo-bigbluebutton/aprobacion.md` y la carpeta del encargo, que lleva el orquestador. Solo agregué esta sección a `resumen-programador.md`.

### Verificación (desde `frontend/`)
| Qué | Comando | Última línea |
|---|---|---|
| lint | `npm run lint` | `> tsc -b` (salida 0; ESLint y Prettier sin errores) |
| suite de 06a | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Tests  5303 passed (5303)` (`Test Files  239 passed (239)`; `Duration  264.14s …`) |
| build y suite completa | no los corrí: son del manager | — |

### Conteos
Salen de `npx vitest list src/app/estado-por-id-ch6.test.tsx src/features/clases/avisos-al-redirigir-ch6.test.tsx src/features/tareas/avisos-al-redirigir-ch6.test.tsx src/lib/estado-por-id-estatico-ch6.test.ts`, contados con `grep -a -c`.

| Archivo | Casos |
|---|---|
| `app/estado-por-id-ch6` | 73 |
| `features/clases/avisos-al-redirigir-ch6` | 82 |
| `features/tareas/avisos-al-redirigir-ch6` | 56 |
| `lib/estado-por-id-estatico-ch6` | 5 |
| **Total** | **216** |

Por id (`grep -a -c "> CH6-Axx"`): A01 2, A02 2, A03 2, A04 2, A05 2, A06 5, A07 3, A08 3, A09 2, A10 2, A11 7, A12 2, A13 4, A14 32, A15 68, A16 14, A17 3, A18 56 y A30 5.

### Pruebas requeridas: cada viñeta con su archivo y su caso
Archivo A: `src/app/estado-por-id-ch6.test.tsx`. Archivo C: `src/features/clases/avisos-al-redirigir-ch6.test.tsx`. Archivo T: `src/features/tareas/avisos-al-redirigir-ch6.test.tsx`. Archivo E: `src/lib/estado-por-id-estatico-ch6.test.ts`. Donde el título lleva `%s`, es una plantilla de `it.each`; entre paréntesis van sus valores.

- **CH6-A01**, archivo A: «CH6-A01: con la confirmación abierta en A y el foco en %s, saltar a B: la confirmación no pasa, «Quitar» está a la vista, el foco es el título de B y al volver a A está cerrada» (%s = «Cancelar» y «Sí, quitar»).
- **CH6-A02**, archivo A: «CH6-A02: (%s) la confirmación de «Quitar» de un alumno no pasa de A a B, el foco va al título de B y al volver a A está cerrada» (maestro y admin).
- **CH6-A03**, archivo A:
  - «CH6-A03 (maestro): con el DELETE de A retenido, en B nada espera y «Sí, quitar» manda el de B; la respuesta de A da un aviso, renueva solo A y al volver a A (antes de 30 s) el maestro quitado ya no está»
  - y el par «CH6-A03 (alumno): …» con el mismo texto.
- **CH6-A04**, archivo A:
  - «CH6-A04 (maestro): con la confirmación de «Borrar tarea» de T1 abierta, saltar a T2: no hay confirmación, el foco es la raíz de la vista y al volver a T1 está cerrada»
  - «CH6-A04 (admin): con el 409 TAREA_CON_ENTREGAS de T1 a la vista, saltar a T2: no hay confirmación ni el mensaje del 409, y el foco es la raíz de la vista»
- **CH6-A05**, archivo A:
  - «CH6-A05: los archivos y enlaces elegidos y el comentario privado de T1 no están en T2; «Entregar tarea» en T2 manda el POST de T2 sin lo de T1»
  - «CH6-A05: con la confirmación de anular abierta en T1, saltar a T2: no está»
- **CH6-A06**, archivo A:
  - «CH6-A06: con puntos escritos para P1 y texto en su hilo, saltar a P2 (misma versión): el panel y el hilo son de P2, y «Calificar y devolver» manda el PUT de P2 con su versión y sus puntos; el foco es la raíz»
  - «CH6-A06: con el PUT de P1 retenido al saltar a P2, nada espera en P2; al soltarlo (%s) sale un solo aviso, el panel de P2 no se reinicia ni toma el foco y no se vuelve a pedir la entrega de P2» (éxito y 409 ENTREGA_MODIFICADA)
  - camino "mismo alumno, otra tarea" (Enmienda 1, M-01): «CH6-A06 (mismo alumno, otra tarea): de la entrega de P1 en T1 a la de P1 en T2 (misma versión): el panel es el de T2 sin lo escrito en T1, el hilo está vacío y «Calificar y devolver» manda el PUT de P1 en T2»
  - y «CH6-A06 (mismo alumno, otra tarea): con el PUT de P1 en T1 retenido al saltar a T2, al soltarlo sale un aviso y nada se reinicia ni toma el foco en T2».
- **CH6-A07**, archivo A:
  - «CH6-A07: lo escrito para T1 no está en T2, y «Guardar cambios» en T2 manda el PUT de T2 con su versión y su contenido»
  - «CH6-A07: con el PUT de T1 retenido al saltar a la edición de T2, al soltarlo (éxito) sale un aviso, la ruta sigue en la edición de T2 y lo escrito en T2 se conserva»
  - «CH6-A07: con un 409 TAREA_MODIFICADA de T1 estando en T2, sale un aviso y T2 no se recarga ni se reinicia»
- **CH6-A08**, archivo A: los tres «CH6-A08: …», iguales a los de A07 con R1, R2 y `409 RECURSO_MODIFICADO`.
- **CH6-A09**, archivo A:
  - «CH6-A09: lo escrito en «Nueva tarea» de A no está en la de B»
  - «CH6-A09: con el POST de A retenido al saltar a «Nueva tarea» de B, al soltarlo sale un aviso y la ruta sigue en la de B»
- **CH6-A10**, archivo A:
  - «CH6-A10: el nombre escrito para A no está en el formulario de B, y «Guardar cambios» en B manda el PUT de B con el nombre de B»
  - «CH6-A10: con el PUT de A retenido al saltar a B, al soltarlo no navega y el formulario de B no cambia»
- **CH6-A11**, archivo A:
  - «CH6-A11 (Avisos): el anuncio y el archivo elegidos en A no están en B; con el foco en el campo, va al título de B»
  - «CH6-A11 (Dudas): la duda escrita en A no está en B»
  - «CH6-A11 (Recursos): el recurso que se escribía en A no está en B»
  - «CH6-A11 («Nuevo tema»): abierto y con texto en A, está cerrado en B; con el foco en el campo, va al título de B»
  - «CH6-A11: con la publicación de A retenida al saltar a B, al soltarla sale un aviso y solo se renueva la lista de A»
  - regresión O-14: «CH6-A11 (regresión O-14, %s): con el foco en una fila de la lista de A, el salto lo lleva al h2 de la lista de B» (Avisos y Actividades).
- **CH6-A12**, archivo A:
  - «CH6-A12 (gradebook): tras avanzar a «Alumnos siguientes» en A, saltar a B pide la primera ventana de B, sin el cursor de A, y no dice que la clase cambió»
  - «CH6-A12 (Mis calificaciones): con el filtro «Entregadas» en A, en B el filtro es «Todas»»
- **CH6-A13**, archivo A:
  - «CH6-A13 (a): A → B → A → B con la confirmación abierta y el DELETE de A en vuelo: nada abierto ni en espera en ninguna, y la respuesta da un aviso»
  - «CH6-A13 (b): con el destino sin caché, la clase se carga y todo nace cerrado (regresión)»
  - «CH6-A13 (c): con el DELETE de A en vuelo, ir al inicio y soltarlo: un aviso, sin errores»
  - «CH6-A13 (d): con StrictMode, el doble montaje no reabre nada ni mueve el foco»
- **CH6-A14**, archivo A: «CH6-A14: %s, con %s: un solo aviso legible, ningún ErrorDeCampo en B y lo escrito en B intacto». Son 8 formularios por 4 casos, 32 en total.
  - Formularios: anuncio, duda, recurso, tema, tarea nueva, edición de tarea, edición de recurso y panel de calificación.
  - Casos: «un campo que el formulario pinta», «un campo que el formulario no pinta», «un mensaje de solo espacios» y «un prefijo con ruta».
  - **Los dos vecinos que el plan pide nombrar** (no cambian en este encargo). Hay caso existente en estos formularios:
    - "un campo que el formulario pinta solo en otro modo": «CH3-B16: $formulario.nombre con «$campo:» $variante ($pinta) da exactamente un mensaje legible, conserva lo escrito y el botón sale de la espera», con (e) y (f) del anuncio, en `features/clases/formularios-ch3.test.tsx:832-878`. Cubre los formularios de clases con modos: anuncio, recurso y clase.
    - "rechazo del servidor seguido de un rechazo local":
      - «CL3-C15: tras el ErrorDeCampo del servidor en «$boton», un envío que la validación local rechaza muestra un solo ErrorDeCampo, el local, sin aviso; …» (`features/clases/formularios-03c2.test.tsx:555`: comentar, crear tema, renombrar tema, crear clase y editar clase);
      - «CH4-27: rechazo del servidor y después un envío que la validación local rechaza: un solo mensaje, el local, y ninguna petición nueva» (`features/clases/guardas-ch4.test.tsx:828`);
      - «ADM-1C05 (d): …» (`features/clases/clases-admin-01c.test.tsx:644`).
  - **Sin caso existente** que haya encontrado por `grep` para la duda, la tarea nueva, la edición de tarea, la edición de recurso y el panel de calificación, en ninguno de los dos vecinos. Va en "Pendiente".
- **CH6-A15**, archivo C:
  - los 13 ganchos: «CH6-A15: %s con %s: ningún aviso ante un código que redirige (irA con su destino); un solo aviso ante el 500». Son 13 ganchos por 4 códigos, el `500` como control, 52 casos;
  - los sitios de M-02: «CH6-A15: %s con %s: ningún aviso ante un código que redirige; lo escrito y lo elegido se conservan y el botón sale de la espera; un solo aviso ante el 500». Son crear clase, editar clase, la subida al publicar un anuncio y la subida al crear un recurso, por 4 códigos: 16 casos.
- **CH6-A16**, archivo C:
  - «CH6-A16: «Unirme a la clase» con %s: ningún aviso ante un código que redirige, el campo sin marcar e irA una vez; un aviso ante el 500» (4 casos);
  - «CH6-A16: %s con una recarga que responde %s: ningún aviso de recarga con el 401 (irA a /login); uno con el 503». Son categorías, Recursos, Actividades, editar recurso y un tema de Recursos, por `401` sin refresco y `503`: 10 casos.
- **CH6-A17**, archivo A, con los casos que escribí aquí:
  - «CH6-A17 (DuplicarClaseDeLaRuta): el nombre escrito para duplicar A no está al duplicar B»
  - «CH6-A17 (EditorDeCategorias): la categoría agregada y escrita en A no está en el editor de B»
  - «CH6-A17 («Mis calificaciones» de una clase anterior): con el filtro «Entregadas» en A, en la clase anterior B el filtro es «Todas»»
  - Para la ficha de una cuenta (`usuario-view.tsx:107`) el caso ya existe: «ADM-1F10: ir a otra cuenta con el restablecimiento en vuelo descarta la temporal y no la muestra en la otra ficha» y «M-20 con <StrictMode>: ir a otra cuenta con el foco dentro lo lleva a la raíz» (`features/admin/ficha-01f.test.tsx:741` y `:1011`).
  - Las filas con `key` por un id de una sola clase siguen cubiertas por las vigiladas de O-14 (`foco-02c-r3/r4/r5`, `heredados-02d-r1`) y por la regresión O-14 de CH6-A11.
- **CH6-A18**, archivo T:
  - «CH6-A18: %s con %s: ningún aviso ante un código que redirige (irA con su destino), lo escrito se conserva y el botón sale de la espera; un solo aviso ante el 500». Son crear, editar y borrar una tarea; entregar; anular la entrega; comentar en el hilo privado (alumno); comentar en el hilo de un alumno (maestro); la subida al crear una tarea y la subida al entregar; por 4 códigos: 36 casos;
  - «CH6-A18: en %s, una recarga de la tarea con %s: ningún aviso ante un código que redirige (irA con su destino); uno ante el 503». Son el detalle, la edición, las entregas y la entrega de un alumno, por 4 códigos: 16 casos;
  - regresiones:
    - «CH6-A18 (regresión CAL-1C06): calificar con %s sigue sin avisar» (3);
    - «CH6-A18 (regresión, entregas-01d-r3:307): un 404 TAREA_NO_ENCONTRADA al entregar y comentar a la vez sigue dando un solo aviso».
- **CH6-A30**, archivo E:
  - «CH6-A30 (precondición): el glob ve el código de producción y al menos 15 render props de una línea»
  - «CH6-A30 (a): todo render prop de una línea de ConClaseDeLaRuta lleva key={claseId}, salvo la lista cerrada»
  - «CH6-A30 (a, control): la regla señala un render prop de ejemplo sin la key, por ruta#Componente»
  - «CH6-A30 (b): las cuatro listas con memoria de foco llevan la key en su formulario («Nuevo tema», por clase)»
  - «CH6-A30 (c): la tarea, su edición, el recurso y la entrega de un alumno llevan la key por todos los ids de su ruta»
  - Hoy hay exactamente 15 render props de una línea. No aflojé ninguna expresión. Para (c) busco la `key` compuesta como texto armado por partes (`join`), para que ESLint no lea `${` dentro de una cadena.

### Rojo primero (paso 2)
- **Corrida antes de tocar producción:** `npx vitest run src/app/estado-por-id-ch6.test.tsx src/features/clases/avisos-al-redirigir-ch6.test.tsx src/features/tareas/avisos-al-redirigir-ch6.test.tsx` → `Tests  144 failed | 65 passed (209)`.
- **Una de las 144 era del arnés:** «CH6-A18: entregar con 500 (control)», por el enlace a la vista dos veces. Corregí el selector y repetí, todavía sin producción, con `-t "entregar|CH6-A05|Unirme|calificar con"` → `16 failed | 12 passed | 181 skipped (209)`. El control quedó verde.
- **Rojo real: 143.** Cayeron los CH6-A01 a A14 previstos (los A14 «un campo que el formulario pinta» de los 8 formularios y los 4 del tema) y todos los casos de código que redirige de A15, A16 y A18.
- **En verde, como preveía el plan:** CH6-A13 (b) y (c), CH6-A17 (duplicar) y todos los controles `500`/`503`.
- **Con producción:** las cuatro pruebas nuevas → `Tests  214 passed (214)`. Los 2 casos de A17 llegaron después del arbitraje de PA-1; los corrí aparte (`-t "CH6-A17"`) → `3 passed`.

### Mutaciones (paso 9)
**Cómo las hice.** Cada mutación es un cambio real en el archivo de producción, con el guion `scratchpad/mut.sh`:
1. aplica la mutación con `sed`;
2. comprueba que el archivo cambió;
3. corre `npx vitest run <prueba> -t "<caso>"`;
4. restaura copiando desde `scratchpad/post/` (nunca con `git`) y lo confirma con `cmp`.

Al terminar, `sha256sum -c post-sha.txt` dio 25 de 25 `OK`. La salida de cada una está en `scratchpad/mut-<id>.txt`.

| Id | Se quita | Cae (cuántos y cuáles) |
|---|---|---|
| M01 | `key={claseId}` de `MaestrosDeLaClase` | CH6-A01, sus 2 casos (`Tests  2 failed`); con `-t "CH6-A03"`, CH6-A03 (maestro) (`1 failed \| 1 passed`) |
| M02 | `key={claseId}` de `AlumnosDeLaClase` | CH6-A02, sus 2 casos; con `-t "CH6-A03"`, CH6-A03 (alumno) (`1 failed \| 1 passed`) |
| M03 | `key={tarea.id}` del detalle | CH6-A04 (2) y CH6-A05 (2) (`4 failed`) |
| M04 | la `key` compuesta entera de `EntregaDeUnAlumno` | los 5 de CH6-A06 (`5 failed`) |
| M05 | la parte de `tareaId` (queda `key={alumnoId}`) | CH6-A06 "mismo alumno, otra tarea" (los 2) y CH6-A30 (c) (`3 failed \| 7 passed`; los demás A06 siguen verdes) |
| M06a | `key={tareaId}` de `EdicionDeLaTarea` | los 3 de CH6-A07 y CH6-A30 (c) (`4 failed`) |
| M06b | `!montado.current \|\|` de `handleGuardar` en editar tarea | CH6-A07 «…al soltarlo (éxito)…» y ADM-1D221 «éxito, con la vista desmontada: no navega…» de la fila 36 (`2 failed`) |
| M07 | `!montado.current \|\|` de `handleGuardar` en crear tarea | CH6-A09 «con el POST de A retenido…» y ADM-1D221 de la fila 35 (`2 failed`) |
| M08 | la línea `if (creandoEn !== null && (creandoEn !== claseId \|\| soloLectura)) setCreandoEn(null)` | CH6-A11 («Nuevo tema»): al volver a A reaparecía abierto. También CH6-A30 (b) (`2 failed`) |
| M09 | `key={claseId}` de `FormularioPublicacion` | CH6-A11 (Avisos), CH6-A11 «con la publicación de A retenida…» y CH6-A30 (b) (`3 failed`) |
| M10a | la guarda de `useAsignarMaestro` (grupo maestros) | CH6-A15 «asignar maestro» con los 3 códigos; el `500` sigue verde (`3 failed \| 1 passed`) |
| M10b | la guarda de `useQuitarAlumno` (grupo alumnos) | CH6-A15 «quitar alumno», los 3 códigos |
| M10c | la guarda de `useCrearPublicacion` (grupo publicaciones) | CH6-A15 «crear anuncio», los 3 códigos |
| M10d | `avisa` de `avisarErrorDelTema` pasa a `true` (grupo temas) | CH6-A15 «crear tema» y «renombrar tema», 3 y 3 (`6 failed`) |
| M10e | la guarda de `useGuardarCategorias` (grupo categorías) | CH6-A15 «guardar categorías», los 3 códigos |
| M11a | la guarda de `alFallar` en `formulario-clase.tsx` | CH6-A15 «crear clase» y «editar clase», 3 y 3 (`6 failed`) |
| M11b | la guarda de la subida en `formulario-publicacion.tsx` | CH6-A15 «subida al publicar un anuncio», los 3 códigos |
| M12a | la guarda de `useEditarTarea` | CH6-A18 «editar una tarea», los 3 códigos |
| M12b | la guarda de `avisarDelErrorDeLaEntrega` | CH6-A18 «entregar», «anular la entrega» y los dos «comentar en el hilo», 3 cada uno (`12 failed`) |
| M12c | `errorQueRedirigeElCliente` de `useAvisoDeRecargaFallida` de tareas (sustituido por `false &&`) | CH6-A18, la recarga en las 4 vistas, 3 códigos cada una (`12 failed`) |
| M12d | la guarda de la subida en `formulario-de-entrega.tsx` | CH6-A18 «la subida al entregar», los 3 códigos |

**Ningún caso pasó sin su remedio, así que no hubo PA-7.** Una nota: en la primera corrida de M01 y M02, el patrón `-t` llevaba paréntesis y no seleccionó CH6-A03. La repetí solo con `-t "CH6-A03"`; son las filas M01b y M02b.

### Hermanos por mecanismo
**M-1, lo abierto es del id de la ruta: los 16 sitios, la `key` y el criterio "única por todos los ids de la ruta" (Enmienda 1).**

| Sitio | `key` | ¿Única por todos los ids de los que depende? | Aplicado |
|---|---|---|---|
| `maestros-de-clase-view.tsx` | `MaestrosDeLaClase key={claseId}` | solo depende de `:claseId`: sí | sí |
| `alumnos-view.tsx` | `AlumnosDeLaClase key={claseId}` | sí | sí |
| `personas-view.tsx` | `PersonasDeLaClase key={claseId}` | sí (ver la nota de abajo) | sí |
| `editar-clase-view.tsx` | `EditarClaseDeLaRuta key={claseId}` | sí | sí |
| `categorias-view.tsx` | `CategoriasDeLaClase key={claseId}`; la de `EditorDeCategorias` se queda | sí | sí |
| `gradebook-view.tsx` | `GradebookDeLaClase key={claseId}` | sí | sí |
| `mis-calificaciones-view.tsx` | `MisCalificacionesDeLaClase key={claseId}` | sí | sí |
| `crear-tarea-view.tsx` | `CrearTareaDeLaClase key={claseId}`, más la guarda `useMontado` en `handleGuardar` | sí | sí |
| `muro-view.tsx` | `FormularioPublicacion key={claseId}` | sí | sí |
| `dudas-view.tsx` | `FormularioDuda key={claseId}` | sí | sí |
| `recursos-view.tsx` | `FormularioRecurso key={claseId} modo="crear"` | sí | sí |
| `trabajo-view.tsx` | `creandoEn` por clase, ajustado durante el render | sí | sí |
| `detalle-tarea-view.tsx` | `<div key={tarea.id}>` | id global (UUID de una sola fila): sí | sí |
| `editar-tarea-view.tsx` | marco y `EdicionDeLaTarea key={tareaId}`, más `useMontado` en `handleGuardar` | id global: sí | sí |
| `editar-recurso-view.tsx` | marco y `EdicionDelRecurso key={recursoId}` (ya traía `useMontado`) | id global: sí | sí |
| `entrega-de-alumno-view.tsx` | marco y `EntregaDeUnAlumno` con ``key={`${tareaId}:${alumnoId}`}`` | depende de `:tareaId` y `:alumnoId`: la compuesta | sí |

- **Fuera de los 16, revisados:** `usuario-view.tsx:107` (`key={usuarioId}`), `clase-anterior-view.tsx:75` (`<Outlet key={claseId} />`), `duplicar-clase-view.tsx:32` y `EntregasView` (sin estado local). No aplica ningún cambio.
- **Nota sobre `personas-view.tsx`:** en las ramas del maestro y del admin, `PersonasView` compone `MaestrosDeClaseView` y `AlumnosView`, que ya llevan su propia `key` por dentro. El `<MaestrosDeLaClaseEnLectura>` del maestro vive en un render prop de varias líneas, sin estado local que importe; CH6-A30 no lo ve (R-02).

**M-1, la forma de la Forma C (arbitraje de la ronda 0).** El contenido observa por su cuenta `useTarea`, `useEntregaDeAlumno` y `useRecurso`, con las variables `consulta` y `tarea`. El marco observa las mismas claves (una sola petición, R-07). Las vigiladas del arbitraje siguen en verde (están dentro de la suite de 06a):
- ATQ-CH4-32: `handleGuardar` sigue dentro de `contenido()`, con su línea idéntica;
- ATQ-CH4-34: los cuatro literales de `.refetch(`;
- CAL-T-95;
- `entregas-01d-r3:682-713` y `entregas-01e-r1:720-760`.

**M-1, el guardado que llega con la vista desmontada avisa y no navega (arbitraje de PA-1).**

| Acción | Cómo navega tras guardar | Con la vista desmontada (por salir o por saltar a otro id) | Con 06a |
|---|---|---|---|
| Crear tarea | `navigate` tras `await mutateAsync` | navegaba (ADM-1D221, fila 35) | no navega; un aviso de éxito, el del gancho (guarda `useMontado`) |
| Editar tarea | ídem, en el contenido | navegaba (fila 36) | no navega; un aviso (guarda `useMontado`) |
| Editar recurso | `navigate` en `alGuardar`, con `useMontado` | no navegaba (T-01 de 03d) | igual |
| Crear y editar clase (`FormularioClase`) | `onSuccess` del `mutate` | no navega (CL3-C14); el gancho avisa con `useMontado` | igual; con `key`, el `onSuccess` del `mutate` no corre |
| Duplicar clase | `onSuccess` del `mutate` | no navega | igual (ya llevaba `key`) |
| Borrar tarea (`AccionesDeLaTarea`) | `onSuccess` del `mutate` | no navega (fila 32); el aviso lo da el gancho | igual; con la `key` del detalle, el `mutate` de la otra tarea no navega |
| Publicar anuncio, duda o recurso; tema | no navegan | el gancho avisa | igual; con la `key`, lo escrito no pasa a otra clase |
| Calificar | no navega | el gancho avisa; el `onCalificada` o el `onConflicto` del panel desmontado no corren | igual (CH6-A06) |
| Entregar, anular y el hilo | no navegan | el gancho avisa | igual (CH6-A05) |

**M-2, avisos con la página que se va (§D-3): cada sitio, si el remedio aplica y si lo apliqué.**
- **`features/clases/hooks.ts`: los 13 ganchos.** Aplica y está aplicado en los 13:
  - asignar y retirar maestro; agregar y quitar alumno; crear anuncio; borrar publicación; comentar; borrar comentario;
  - crear y renombrar tema, por `avisarErrorDelTema`. Ahí `avisa` cubre los dos `toast.error` y `renovarTrasError` sigue corriendo;
  - borrar tema, ordenar temas y guardar categorías.
- **Los demás sitios de `features/clases`:** aplica y está aplicado en «Unirme a la clase» (`formulario-unirse-clase.tsx`, primera línea del `onError`) y en `formulario-clase.tsx` (`alFallar`).
  - Las subidas de `formulario-publicacion.tsx` y `formulario-recurso.tsx`: aplica y está aplicado.
  - Los 5 llamadores de `useAvisoDeRecargaFallida` (categorías, `BloqueDeRecursos` de `recursos-view`, Actividades, editar recurso y `SeccionDeRecursos`): aplica y está aplicado, sumando `&& !errorQueRedirigeElCliente(…)`. La firma del gancho no cambió.
- **`features/tareas`:** aplica y está aplicado en `useCrearTarea`, `useEditarTarea`, `useBorrarTarea`, `avisarDelErrorDeLaEntrega` (cubre entregar, anular y los dos hilos), `useAvisoDeRecargaFallida` (sin cambiar de firma) y las subidas de `formulario-tarea.tsx` y `formulario-de-entrega.tsx`.
  - Las guardas usan el `errorQueRedirigeElCliente` de `features/tareas/lib.ts`.
- **Ya callaban, sin cambio:** calificar (`hooks.ts`), la descarga de las vistas de la tarea, los «Ver más» de `entregas-view` y `hilo-privado`, `features/calificaciones` y `features/admin`.
- **No aplica:**
  - `acciones-de-la-tarea.tsx:88`: solo `409 TAREA_CON_ENTREGAS`;
  - `formulario-tarea.tsx:244`: el error de campo con el formulario desmontado;
  - `entrega-de-alumno-view.tsx:131` y `:137`: ya callaba, y el otro es el `catch` de un `refetch`;
  - `codigo-de-clase.tsx`: copiar al portapapeles, sin API.
- **Fuera por DH-04:** la descarga de `components/adjuntos/adjuntos-de-publicacion.tsx:77`, sin tocar (R-10).
- **R-03 (lo contrario):** un `401` cuando no se envió token sigue avisando donde avisaba. La guarda mira el código, como ya lo hacen CLASES-03, ADMIN-01 y calificaciones; no escribí un caso propio para ese camino.

### Estados vecinos de M-1 recorridos (§D-1)
| Estado | Dónde |
|---|---|
| Destino sin caché | CH6-A13 (b) |
| Destino en caché | todos los CH6-A01 a A12 |
| A → B → A → B | CH6-A13 (a) |
| Petición de A en vuelo al saltar (con sus opciones; ningún control de B en espera) | CH6-A03, A06, A07, A08, A09, A10, A11 y A13 (a) |
| Respuesta de A estando en B: éxito | CH6-A03, A06, A07, A08, A09, A10, A11 |
| Respuesta de A estando en B: `409` | CH6-A06, A07, A08 |
| Respuesta de A estando en B: `400 VALIDACION` (pintado, no pintado, vacío, con ruta) | CH6-A14 |
| Respuesta de A estando en B: códigos que redirigen | los cubren A15 y A18 con la vista montada; no hay un caso que combine el salto con un código que redirige |
| Respuesta de A estando en B: `5xx` y red | sin caso propio con el salto. El gancho avisa una vez (es su `onError`); lo cubren los controles `500` de A15 y A18, con la vista montada |
| Volver a A con su petición en vuelo | CH6-A13 (a): nada reabierto ni en espera (S-03) |
| Vista desmontada con la petición en vuelo | CH6-A13 (c) y ADM-1D221 (filas 35 y 36) |
| Foco en el control que se desmonta | CH6-A01, A02, A04, A06, A11, A13 (d) |
| Foco en una fila de la lista | CH6-A11, regresión O-14 |
| Foco en otro control de la vista que sobrevive | CH6-A06 (P2): su panel no toma el foco |
| Foco fuera de la vista | sin caso nuevo: `useFocoAlTituloDeLaClase` no lo mueve, y lo cubre `foco-02c-r*` |
| Clase que pasa a archivada en medio | la generación de solo lectura no cambió: siguen en verde `clase-archivada-01d1-*` y `01d2-*`, incluida ADM-1D221 |
| `StrictMode` | CH6-A13 (d) |

### Matriz de avisos y recargas (§D-7, 06a)
**Por sitio de §D-1:** la respuesta del id anterior que llega estando en el id nuevo, con la vista desmontada o al volver.
- **Éxito:** el aviso de éxito del gancho, uno solo, y se renueva lo del id anterior (invalidación con sus propias opciones, S-04).
  - El id nuevo no se pide ni se reinicia. Nada navega: crear y editar tarea por la guarda `useMontado`; editar recurso por la que ya tenía; editar clase, duplicar y borrar tarea porque el `onSuccess` del `mutate` no corre desmontado.
  - El foco no se mueve en el id nuevo.
- **`409`:**
  - editar tarea: un aviso. `recargarTrasConflicto` del contenido desmontado puede pedir la tarea anterior, nunca la nueva (CH6-A07);
  - editar recurso: un aviso y ninguna recarga (montado);
  - calificar: un aviso, el del gancho; `onConflicto` no corre (CH6-A06).
  - En ningún caso se reinicia nada ni se pide nada del id nuevo.
- **`5xx` y red:** un aviso del gancho; nada se renueva en el id nuevo.
- **`400 VALIDACION`:** un solo aviso legible y ningún `ErrorDeCampo` en el formulario del id nuevo (CH6-A14, 32 casos).
- **`401` sin refresco, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`:** ningún aviso; `irA` una vez. Es la guarda de §D-3, que actúa igual con la vista montada o desmontada, porque vive en el gancho.

**Por gancho de §D-3:** ante los tres códigos que redirigen, ningún `toast.error` e `irA` con su destino (`/login`, `/acceso-restringido`, `/cambiar-contrasena`). Ante `500`/`503`, el aviso de hoy, uno solo. Lo escrito y lo elegido se conservan y el botón sale de la espera (A15, A16, A18).

**Recargas:** el aviso de recarga fallida queda marcado como atendido. En tareas: `ultimoFalloAvisado` se fija antes del `return` de la guarda, así que volver a la vista no lo repite. En clases: `fallosVistos` avanza igual.

### Vigiladas del arbitraje y CAL-T-108
- **CAL-T-108** (`features/tareas/avisos-01c-r2.ataque.test.tsx:637-652`): en verde. No hace falta C-12.
- Vigiladas, en verde: ATQ-CH4-32 y 34 (`lib/guardas-ch4-r1.ataque.test.ts`), CAL-T-95, `entregas-01d-r3` y `entregas-01e-r1`, las de §D-R0 de 06a, y C-1, C-2 y C-11. Las comprobé con `npx vitest run` sobre esos 8 `*.ataque` y `guardas-ch4.test.tsx` → `Tests  235 passed (235)`, y otra vez dentro de la suite final de 06a.

### Desviaciones del plan
Ninguna en la conducta. Detalles de forma:
1. En `avisarErrorDelTema`, la guarda es el booleano `avisa`, que cubre los dos avisos y deja correr `renovarTrasError`, como pide §D-3. Un `return` al inicio la habría saltado.
2. En las subidas de `formulario-recurso.tsx`, `formulario-tarea.tsx` y `formulario-de-entrega.tsx`, la guarda es `if (archivoEnSubida !== null && errorQueRedirigeElCliente(error)) return`, antes del `if` de la subida, para no anidar `if` (`CLAUDE.md`). En `formulario-publicacion.tsx` va, como dice el plan, justo antes del `toast.error`.
3. Las Formas C devuelven `contenido()` desde el contenido; el marco pinta el `div` raíz con el contenido y su `key`.
4. ADM-1D221 se cambió por el arbitraje de PA-1, con el texto exacto.
5. Agregué dos casos de CH6-A17 (EditorDeCategorias y la clase anterior) porque no encontré casos existentes. Para eso, el doble del servidor de `app/estado-por-id-ch6.test.tsx` ganó el estado `archivadas`.

### Pendiente o fuera de alcance detectado
- **Vecinos de CH6-A14 sin caso existente encontrado:** "campo pintado solo en otro modo" y "rechazo del servidor seguido de uno local", en la duda, la tarea nueva, la edición de tarea, la edición de recurso y el panel de calificación. Este encargo no cambia esa conducta; queda como observación para el manager.
- **Estados vecinos sin caso propio:** la respuesta de A estando en B con un código que redirige o con red. Se infieren de las guardas y de los controles con la vista montada; no escribí el caso combinado.
- **La descarga de `components/adjuntos`** sigue avisando ante un código que redirige (DH-04, R-10; su destino está en A-4).

## CHORE-06a — Corrección del resumen (M-01) (2026-11-12)

Programador. Atiende **M-01** de `revision.md`, "Verificación del resumen del programador — CHORE-06a". Corrige solo el texto: no toqué código ni pruebas y no corrí suites. Cada celda la comprobé leyendo el archivo y la línea citados. No copié ninguna de la revisión sin comprobarla.

**M-01: corregido.** Esta sección sustituye a estas frases de la sección "## CHORE-06a — Implementación (2026-11-12)":
- líneas 102 a 108: la viñeta «**Los dos vecinos que el plan pide nombrar** …», con sus sub-viñetas CH3-B16, CL3-C15, CH4-27 y ADM-1C05 (d), y la viñeta «**Sin caso existente** que haya encontrado por `grep` para la duda, la tarea nueva, la edición de tarea, la edición de recurso y el panel de calificación…»;
- línea 199: en «**Fuera de los 16, revisados:** …», la parte «y `EntregasView` (sin estado local)»;
- línea 293: la viñeta de "Pendiente" «**Vecinos de CH6-A14 sin caso existente encontrado:** …».

Esa sección y lo demás no cambian.

### CH6-A14: los 8 formularios por los 2 vecinos
Las rutas son relativas a `frontend/src/features/`. "Sin caso" quiere decir que no encontré ninguno con las búsquedas de abajo. "No aplica" quiere decir que el formulario no tiene ese vecino; el motivo va en la celda.

| Formulario | "Campo pintado solo en otro modo" | "Rechazo del servidor seguido de uno local" |
|---|---|---|
| Anuncio | `clases/formularios-ch3.test.tsx:834`, «CH3-B16: $formulario.nombre con «$campo:» $variante ($pinta) da exactamente un mensaje legible, conserva lo escrito y el botón sale de la espera», fila «publicar un anuncio» con `titulo` (no lo pinta: un aviso; `FILAS_POR_MODO`, `:801`). Además, `:862` «CH3-B16 (e): en el anuncio, tras el aviso de «titulo:», no aparece ningún campo de título ni un error bajo él» y `:878` «CH3-B16 (f): en el anuncio, con el formulario desmontado mientras la petición está en vuelo, «titulo:» da exactamente un aviso (lo da el gancho)» | `clases/avisos-03d.test.tsx:498`, «CL3-D20: tras un «texto:» del servidor, un envío vacío muestra solo «Escribe el anuncio»» |
| Duda | No aplica: `FormularioDuda` tiene un solo modo y un solo campo (`texto`). Un campo ajeno lo cubre CH6-A14 «un campo que el formulario no pinta» | `clases/dudas-03e.test.tsx:792`, «CL3-E07: tras un «texto:» del servidor, un envío vacío muestra solo «Escribe tu duda»» |
| Recurso (nuevo) | `clases/recursos-03d.test.tsx:1072`, «CL3-D15: con «%s» un solo aviso legible, ningún ErrorDeCampo, lo escrito se conserva y el botón sale de la espera», fila «version:» (`:1067`). `version` solo va en el cuerpo de la edición (`shared/src/recursos.ts:76`) | `clases/recursos-03d.test.tsx:1097`, «CL3-D17: tras un «%s» del servidor, un envío con el título vacío muestra solo «Escribe el título del recurso»» (`describe` «CL3-D17 · rechazo del servidor y después la validación local, al publicar», `:1092`; filas «titulo:» y «texto:») |
| Tema (crear y renombrar) | No aplica: los dos modos pintan el mismo campo (`nombre`). Lo fija `clases/formularios-ch3.test.tsx:834` (CH3-B16), filas «crear un tema» y «renombrar un tema» (lo pinta: un ErrorDeCampo) | `clases/formularios-03c2.test.tsx:555`, «CL3-C15: tras el ErrorDeCampo del servidor en «$boton», un envío que la validación local rechaza muestra un solo ErrorDeCampo, el local, sin aviso; y el siguiente envío sale», filas «crear tema» (`:213`) y «renombrar tema» (`:229`) |
| Tarea nueva | Sin caso: ninguna prueba de `tareas/` manda un `400` de `version:` (el campo que solo lleva la edición) a «Publicar tarea» | Sin caso |
| Edición de tarea | Sin caso: ninguna prueba manda a «Guardar cambios» un campo que solo acepte el modo crear | Sin caso |
| Edición de recurso | `clases/editar-recurso-03d.test.tsx:687`, «CL3-D16: con «%s» un solo aviso legible, ningún ErrorDeCampo, lo escrito se conserva y el botón sale de la espera», fila «tipo:» (`:682`). `tipo` solo lo lleva el cuerpo de crear, que va por la ruta de publicaciones | `clases/editar-recurso-03d.test.tsx:705`, «CL3-D17: tras un «titulo:» del servidor, un envío con el título vacío muestra solo «Escribe el título del recurso»» (`describe` «… al editar», `:704`) |
| Panel de calificación | `tareas/calificar-01c-r1.ataque.test.tsx:543`, «CAL-T-78: un 400 «calificacion: …» en una tarea con rúbrica (sin campo «Calificación») no se pierde en silencio: o lo avisa o lo muestra». El otro sentido es `tareas/calificar-01c.test.tsx:924`, «CAL-1C06b (vecino): un 400 «calificacion: …» en una tarea sin rúbrica se pinta bajo «Calificación», sin aviso» | Sin caso: `CAL-1C01` (`tareas/calificar-01c.test.tsx:303`) es solo la validación local; `CAL-T-115` y `CAL-T-128/129` (`tareas/campos-01c-r2.ataque.test.tsx:335`, `tareas/cruces-01c-r3.ataque.test.tsx:297-416`) son un rechazo del servidor seguido de otro del servidor, no de uno local |

**Lo que la viñeta vieja nombraba y no es de estos 8 formularios.** Sigue siendo cierto, pero no cubre ninguna celda de la tabla:
- `CH4-27` (`clases/guardas-ch4.test.tsx:828`): es «Unirme a la clase»;
- `ADM-1C05 (d)` (`clases/clases-admin-01c.test.tsx:644`): es duplicar clase;
- las filas de `CL3-C15` para comentar, crear clase y editar clase.

**Cómo lo busqué.** Desde `frontend/src`, con la herramienta de búsqueda o `grep -rn`, solo en `*.test.tsx`:
1. `grep -rnE 'it\("|it\.each|^    "' --include=*.test.tsx features/clases features/tareas | grep -iE "validación local|vacío|vacía|en blanco|local" | grep -iE "servidor|tras|después|rechazo"` dio:
   - CL3-D20 (`avisos-03d:498`), CL3-E07 (`dudas-03e:792` y `:837`, la de responder), CL3-D17 (`editar-recurso-03d:705` y `recursos-03d:1097`), CL3-C15 (`formularios-03c2:555`), CH4-27 y ADM-1C05 (d);
   - en `features/tareas`, solo `entregas-01d:968` (el hilo, no uno de los 8).
2. `grep -rnE 'it\("|it\.each|^    "' --include=*.test.tsx features/tareas | grep -iE "(servidor|400|VALIDACION|rechazo).*(local|vac|después|luego|otro envío|nuevo envío|reenv)|(local).*(servidor)"` dio CAL-T-115, CAL-T-128, 129, 133 y 134 y dos de `entregas-01d-r1`: todas son servidor tras servidor, o de la entrega.
3. `grep -rn '"version: \|`version: ' --include=*.test.tsx features` dio:
   - `clases/editar-recurso-03d:681` y `clases/recursos-03d:1067` (CL3-D16 y CL3-D15);
   - `tareas/calificar-01c:877` y `tareas/campos-01c-r2:286` (el panel);
   - ninguna del formulario de la tarea.
4. `grep -n "otro modo"` en `features/clases/formularios-ch3.test.tsx` (`:781`) y la lectura de `FILAS_POR_MODO` (`:798-813`) y de `casosPorModo` (`:820-829`): `control: null` (no lo pinta) solo en «editar clase» con `maestroIds` y en «publicar un anuncio» con `titulo`.
5. Leí los títulos de `tareas/formularios-ch3.test.tsx` (`CH3-A14`, `:467-482`): cubre la entrada fuera de contrato y F2, no el otro modo ni la secuencia.
6. Las tres celdas que señaló la revisión (`editar-recurso-03d.test.tsx:704-705`, `recursos-03d.test.tsx:1092` y `calificar-01c-r1.ataque.test.tsx:543`) las comprobé abriendo esas líneas: existen y dicen lo que la tabla les atribuye.

**Va a "Pendiente".** No hay caso para estas celdas:
- "campo pintado solo en otro modo": tarea nueva y edición de tarea;
- "rechazo del servidor seguido de uno local": tarea nueva, edición de tarea y panel de calificación.

CHORE-06a no cambia la conducta de esos formularios ante un `400` (§D-2). Sugiero la fila de `docs/ESTADO.md` §3 que propone la revisión, con destino el próximo encargo que toque esos formularios.

### Hermano de M-01: `EntregasView` sí guarda estado local
La línea 199 dice «`EntregasView` (sin estado local)». Es falso. Lo leí en `features/tareas/entregas-view.tsx:45-115`: `EntregasDeLaTarea` no tiene `useState`, pero guarda tres refs que viven en la instancia. Como el componente no lleva `key`, sobreviven a un salto del historial de las entregas de T1 a las de T2 (misma ruta, otro `:tareaId`):

| Ref | Qué guarda | Qué pasa al saltar de T1 a T2 con «Ver más alumnos» de T1 en vuelo |
|---|---|---|
| `pidiendoMasRef` (`:52`) | la guarda síncrona de «Ver más alumnos»; se suelta en el `finally` de `fetchNextPage` | Sigue en `true` hasta que responde la página de T1. En T2, el botón no está en espera (`enEspera` lee `lista.isFetching`, que ya es la consulta de T2), pero `handleVerMas` vuelve sin pedir nada: un clic muerto hasta que T1 responde |
| `idsAntesDeVerMasRef` (`:55`) | los alumnos que había al pedir la página siguiente, para llevar el foco a la primera fila nueva | Se queda con los ids de T1. El efecto de `:78-96` corre ya con las filas de T2 (`isFetchingNextPage` de T2 es `false`): limpia la ref y, si el foco se perdió, lo lleva al «Ver entrega» de una fila de T2 que no estaba en T1 o al `h2`. Como las dos listas son los alumnos de la misma clase, lo normal es el `h2` |
| `montadoRef` (`:53`) | si la vista sigue montada, para no avisar desmontada | Sigue en `true`: es la misma instancia. Si la página de T1 falla (`5xx` o red) estando en T2, `handleVerMas` de T1 da su `toast.error` en la vista de T2: un aviso de T1 en T2 |

- **¿Le aplica el remedio de §D-1?** Por el mecanismo, sí: es estado de una vista que sobrevive al cambio de un id de la ruta (M-1). Tiene su raíz de foco (`raizRef` y `useFocoAlPerderseElControl`), así que su forma sería la C: marco con la raíz y contenido con `key={tareaId}`.
- **Por qué el plan no la incluye:** su inventario de M-1 buscó `useState`, y esta vista no tiene ninguno. La tabla de hermanos del plan la da por "ninguno (sin `useState`; la lista va en la clave de la consulta)" y "No hace falta".
- **No la cambié:** no está en "Se toca" de 06a. Lo de la tabla de arriba lo saqué de leer el código; no lo comprobé con una prueba.
- **A dónde va:** es el punto de ataque 1 del tester que dejó la revisión. Si se confirma un daño, el arbitraje decide si es un hermano de 06a (una `key` más, con su caso) o va a otro encargo.

### Contradicciones entre el código y el resumen
Ninguna más. La de `EntregasView` es del texto: el código no cambió.

## CHORE-06a — Corrección ronda 1 (T-01) (2026-11-12)

Programador. Ronda de corrección 1 de 3. Atiende **T-01** de `reporte-tester.md`, "## Ronda 1 — CHORE-06a (2026-11-12)". Aplico el remedio de `revision.md`, "Verificación de la corrección del resumen — CHORE-06a" (apartado `EntregasView`), con la autorización del humano de `aprobacion.md` (2026-11-12, «Autorizo»): tocar `features/tareas/entregas-view.tsx` solo para este remedio. El equipo estaba con corriente; una suite a la vez.

**T-01: corregido.** ATQ-CH6-01 (`app/estado-por-id-ch6a-r1.ataque.test.tsx`) pasa a verde sin tocar ese archivo.

### El diff, en corto (`features/tareas/entregas-view.tsx`; `git diff --stat`: 22 inserciones y 7 borrados)
Es la Forma C de §D-1.
- **El contenido.** `EntregasDeLaTarea` pasó a llamarse `ListaDeEntregasDeLaTarea`: es el contenido, y se lleva las refs (`pidiendoMasRef`, `montadoRef`, `idsAntesDeVerMasRef`, `encabezadoRef`, `verMasRef`), `handleVerMas`, `useAvisoDeRecargaFallida` y el efecto del foco tras «Ver más». Ahora devuelve `contenido()`.
- **El marco.** El `EntregasDeLaTarea` nuevo conserva `raizRef`, el `div` con `tabIndex={-1}` y `useFocoAlPerderseElControl` con la misma clave compuesta. Lee `useTarea` y `useEntregasDeLaTarea`: son las mismas claves que el contenido, así que sale una petición de cada una. Pinta `<ListaDeEntregasDeLaTarea key={tareaId} …/>`.
- **Lo que no se movió.** No cambiaron `fetchNextPage({ cancelRefetch: false })` ni las cuatro guardas de `handleVerMas` (`!resultado.isError || !montadoRef.current`, el cursor, el error que reemplaza la vista y `errorQueRedirigeElCliente`). Siguen siendo las mismas líneas, en el mismo manejador; solo se corrieron unos números de línea. El archivo sigue con un `enEspera=`.
  - Las pruebas que las leen literalmente siguen en verde dentro de la suite de 06a: `lib/guardas-de-doble-clic-estatico` (CH4-04 y la lista de `fetchNextPage`), `entregas-01e-r1` (revisión estática de 01e), `entregas-01e-r2` y `styles/clases-r1` (V-06). No hubo PA-2.
- **Por qué basta `key={tareaId}`.** La ruta es `tareas/:tareaId/entregas` bajo `:claseId`. `tareaId` es el UUID de una sola fila, que ya implica su clase. Lo que la vista pide y muestra (la tarea y su lista) depende de `claseId` y `tareaId`, pero el mismo `tareaId` no se repite en otra clase. Es el mismo criterio que el detalle, la edición de la tarea y la del recurso. A diferencia de la entrega de un alumno, aquí ningún id se repite entre filas.

### Caso nuevo
- **Id CH6-A19** (el siguiente libre después de CH6-A18), en `src/app/estado-por-id-ch6.test.tsx`, `describe` «CH6-A19 · las entregas de una tarea».
- **Título:** «CH6-A19: con «Ver más alumnos» de T1 en vuelo, saltar a las entregas de T2: su «Ver más alumnos» no espera y un clic pide la página de T2; al responder T1, nada de T1 se escribe en T2, sin aviso y sin foco en <body>».
- **Montaje:** router real (`rutas`) y la caché de `providers.tsx`. El doble del servidor ganó `entregasEnPaginas` y `siguientesDeEntregas`: 20 alumnos en la primera página y 1 en la siguiente, con la página de T1 retenida.
- **Qué afirma:**
  - el botón de T2 no está en `aria-busy`;
  - el clic manda una página con cursor de T2 y aparece «Alumno 21»;
  - al soltar la página de T1, su alumno «Solo de la tarea uno» no aparece en T2;
  - T2 sigue con una sola página siguiente, no sale ningún `toast.error`, el foco no está en `<body>` y la ruta sigue en las entregas de T2.
- **CH6-A30 (c)** suma `expect(textoDe("tareas/entregas-view.tsx")).toContain("<ListaDeEntregasDeLaTarea key={tareaId}")`. No tiene precondición de conteo que actualizar: la de 15 cuenta los render props de una línea y `EntregasView` usa uno de varias líneas, así que sigue en 15.

### Mutación
Hecha con copias en `scratchpad/r1prog/post/`. Restauré copiando la copia, nunca con `git`, y lo confirmé con `cmp`.

| Se quita | Comando | Cae |
|---|---|---|
| `key={tareaId}` de `ListaDeEntregasDeLaTarea` | `npx vitest run src/app/estado-por-id-ch6.test.tsx src/app/estado-por-id-ch6a-r1.ataque.test.tsx src/lib/estado-por-id-estatico-ch6.test.ts -t "CH6-A19\|ATQ-CH6-0[123]\|CH6-A30"` | `Tests  3 failed \| 6 passed \| 115 skipped (124)`: CH6-A19, ATQ-CH6-01 y CH6-A30 (c). ATQ-CH6-02 y 03 siguen verdes, y los otros 4 de CH6-A30 también |

### Hermanos por mecanismo: estado que sobrevive al salto de un id
**Cómo lo busqué.**
- Partí de las rutas con id de `app/router.tsx`: `:claseId` (estudiante, maestro, admin y clases anteriores), `tareas/:tareaId`, `tareas/:tareaId/editar`, `tareas/:tareaId/entregas`, `tareas/:tareaId/entregas/:alumnoId`, `recursos/:recursoId/editar` y `admin/usuarios/:usuarioId`.
- Saqué el componente que pinta cada una y corrí `grep -n "useRef\|^function \|^export function \| key={"` sobre cada vista de ruta. Después, `grep -n "useRef(\|useRef<\|useState\|fetchNextPage\|if (.*Ref.current"` sobre los subcomponentes que cuelgan de una `key` que puede repetirse entre ids (`seccion.clave`, `bloque`) o de una vista sin `key`.
- Los ganchos con memoria de módulo (`ultimoFalloAvisado`, `tareaPerdidaAvisada`) van por consulta de la caché, no por instancia.

| Vista o componente | ¿Lleva `key` por todos sus ids? | Qué guarda que sobreviva | ¿Aplica el remedio? | ¿Aplicado? |
|---|---|---|---|---|
| `tareas/entregas-view.tsx`, `EntregasDeLaTarea` | no la llevaba (T-01) | `pidiendoMasRef`, `montadoRef`, `idsAntesDeVerMasRef` | sí, Forma C | **sí, en esta ronda** |
| `clases/clase-layout.tsx`, `ClaseDeLaRuta` | no, a propósito (DH-01 a) | `raizRef`, `tituloRef`, `errorRef` y la memoria de `useFocoAlTituloDeLaClase`, que están hechas para el cambio de clase. Los ganchos reciben `claseId` | no | — |
| `clases/muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx` (`BloqueDeRecursos`, `key={bloque}`) y `trabajo-view.tsx` (Forma B) | la vista no; el formulario sí, o `creandoEn` | refs de foco: `clasePrevia`, `idsPrevios` o `clavesPrevias`, `encabezadoRef`, `useFilaEnFoco`. En Actividades, `ordenandoRef`, `focoTrasOrdenarRef` y el orden propio llevan la clase (CHORE-04 §D-4 bis). No hay una guarda de «Ver más» por ref: usan `isFetching` | no; el foco por clase está a propósito (O-14) | — |
| `clases/components/seccion-de-tema.tsx` y `seccion-de-recursos.tsx`, con `key={seccion.clave}`. Su sección «Sin tema» lleva la clave constante `CLAVE_SIN_TEMA` (`clases/lib.ts:385`), así que sobrevive al cambio de clase | no, para «Sin tema» | `idsPrevios` (los ids de filas de la otra clase), `conMoverEnFocoRef` y el `idsPrevios` del tema (`seccion-de-tema.tsx:49`). Su «Ver más» no lleva guarda por ref (`fetchNextPage({ cancelRefetch: false })` con `isFetching`), y «Sin tema» no tiene renombrar ni borrar | ver la observación de abajo | no (sin evidencia de daño) |
| `clases/components/tabla-alumnos.tsx`, `comentarios-de-publicacion.tsx` y `respuestas-de-duda.tsx` | sí: la vista lleva `key={claseId}` (`AlumnosDeLaClase`, `PersonasDeLaClase`), o la fila de la publicación o la duda va por un id de una sola clase | `quitandoRef` y `borrandoRef`, `confirmando` | ya aplica, por la `key` de su padre | sí (06a) |
| `tareas/components/hilo-privado.tsx` | sí: en el detalle cuelga de `<div key={tarea.id}>`, y en la entrega de un alumno, del contenido con la `key` compuesta | `pidiendoMasRef`, `montadoRef`, `enviandoRef`, el texto | ya aplica | sí (06a) |
| `calificaciones/gradebook-view.tsx` y `mis-calificaciones-view.tsx` | sí (`key={claseId}`; en la clase anterior, `<Outlet key={claseId} />`) | `pidiendoRef`, `pidiendoMasDeRef`, las ventanas y el filtro | ya aplica | sí (06a) |
| `tareas/detalle-tarea-view.tsx`, `editar-tarea-view.tsx`, `entrega-de-alumno-view.tsx` y `clases/editar-recurso-view.tsx` | sí: Forma C, o `key` en el bloque de datos | el marco solo lleva `raizRef` y su clave de foco | ya aplica | sí (06a) |
| `admin/usuario-view.tsx`, `VistaDeLaCuenta` | sí (`FichaDeLaCuenta key={usuarioId}`) | el marco solo lleva `raizRef` | ya aplica | (antes de 06a) |

**Ninguna otra vista tiene el defecto de T-01:** una guarda por ref que deje un control del id nuevo en un clic muerto. No hay nada que reportar fuera de "Se toca".

**Observación, sin prueba y sin cambio.** La sección «Sin tema» de Recursos (`clases/components/seccion-de-recursos.tsx`, `key={seccion.clave}` dentro de `BloqueDeRecursos key={bloque}` en `recursos-view.tsx:138` y `:189`) y la de Actividades (`seccion-de-tema.tsx`, en `trabajo-view.tsx:246`) sobreviven a un salto de clase con su `idsPrevios`.
- Con el foco en una fila de «Sin tema» de A, el efecto de la sección (hijo) corre antes que el de `clasePrevia` del bloque o de la vista (padre). Por lectura, ese efecto puede llevar el foco a una fila o al encabezado de «Sin tema» de B en lugar del `h2` de la lista (O-14).
- Es foco, no escritura. No lo verifiqué con una prueba. Es anterior a 06a: el plan no tocó esas `key`.
- La dejo para el tester como punto de ataque. Si se confirma, su remedio es otra `key` (la de la sección incluiría la clase) y necesita su propio arbitraje.

### Estados vecinos del remedio en `EntregasView`
| Estado | Qué pasa | Cómo lo sé |
|---|---|---|
| La página de T1 responde bien estando en T2 | Se escribe en la caché de la consulta de T1, no en T2. Al volver a T1, se ven sus 21 alumnos | CH6-A19 (nada de T1 en T2) y ATQ-CH6-03 |
| La página de T1 falla estando en T2 | `handleVerMas` de T1 lee `montadoRef` de su contenido, ya desmontado, y no avisa. Ver O-01 | ATQ-CH6-02 (verde) |
| T1 → T2 → T1 con la página en vuelo | Al volver, T1 monta un contenido nuevo (`pidiendoMasRef` en `false`). Su consulta sigue pidiendo, así que «Ver más alumnos» está en `enEspera` y la guarda `lista.isFetching` no deja pedir otra. Al responder, aparecen sus filas | por lectura; sin caso propio |
| Dos clics en T2 | La guarda síncrona `pidiendoMasRef` del contenido de T2 y `lista.isFetching`: una sola petición | la regla de CHORE-04 (`guardas-de-doble-clic-estatico`) y el clic único de CH6-A19; sin un caso de doble clic tras el salto |
| La tarea borrada en medio (la página de T1 responde `404 TAREA_NO_ENCONTRADA` estando en T2) | El contenido de T1 está desmontado: no avisa ni reemplaza nada en T2. Al volver a T1, su consulta en error reemplaza la vista con «Esa tarea ya no existe.» | por lectura; sin caso propio |
| La clase archivada en medio (`409 CLASE_ARCHIVADA` en la página de T1 estando en T2) | No avisa (desmontado). La clase pasa a solo lectura cuando `ClaseLayout` relee el detalle (`useDetalleViejoAnteClaseArchivada`), igual que con cualquier otra petición | por lectura; sin caso propio |
| El foco en «Ver más alumnos» de T1 al saltar | El botón se desmonta. La clave del marco cambia con la tarea y el foco va a la raíz de la vista, no a `<body>` (Forma C) | el mismo camino que CH6-A04 y A06; en CH6-A19 el foco no queda en `<body>` |

### O-01 (el fallo de la página de T1 que llega estando en T2 no se avisa)
- **Antes del remedio**, el resultado de `fetchNextPage` era el del observador, que ya miraba la consulta de T2, así que `resultado.isError` era falso (lo explica ATQ-CH6-02).
- **Con el remedio**, el `fetchNextPage` es del observador del contenido de T1, ya desmontado. Si el resultado trae el error, `montadoRef.current` (del contenido de T1) es `false` y vuelve sin avisar (`:107` del original). El fallo no lo recibe nadie en T2 y queda en la caché de T1.
- **Es conducta de "vista desmontada", ya cubierta.** "Ver más que falla con la vista desmontada no avisa" ya existía en las entregas (el comentario de `handleVerMas`: "sin aviso si la vista ya no está montada") y en el hilo privado (`features/tareas/entregas-01d.test.tsx:1046`, «Ronda 2 (T-05): «Ver más comentarios» que responde un 503 después de que el hilo se desmontó no avisa»). Es la regla de la familia que el arbitraje de PA-1 recoge para los guardados.
- **No agregué avisos.** Al volver a T1, la consulta de T1 está en error con sus datos. «Ver más alumnos» se puede repetir (la frase del aviso no se pinta), sin otro mensaje. Eso es 06b (§D-5, DH-02) si llegara a cambiar.

### Verificación (desde `frontend/`, una a la vez)
| Qué | Comando | Última línea |
|---|---|---|
| lint | `npm run lint` | salida 0; `> tsc -b` |
| suite de 06a | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Tests  5349 passed (5349)` (`Test Files  240 passed (240)`; `Duration  279.18s …`). Incluye ATQ-CH6-01, ahora en verde, y los 45 casos del tester de la ronda 1 |
| conteo | `npx vitest list src/app/estado-por-id-ch6.test.tsx src/features/clases/avisos-al-redirigir-ch6.test.tsx src/features/tareas/avisos-al-redirigir-ch6.test.tsx src/lib/estado-por-id-estatico-ch6.test.ts`, con `grep -a -c` por archivo | 74 en `app/estado-por-id-ch6.test` (73 + CH6-A19), 82, 56 y 5: **217**. `grep -a -c "> CH6-A19"`: 1 |

`build` y la suite completa no los corrí; son del manager.

### Archivos tocados en `frontend/` (`git status --porcelain frontend | wc -l` → **36**)
- Los 34 de 06a, más `features/tareas/entregas-view.tsx` (35, con su autorización), más el `*.ataque` de la ronda 1 del tester, `app/estado-por-id-ch6a-r1.ataque.test.tsx` (36), que no toqué.
- En esta ronda cambié solo tres:
  - `features/tareas/entregas-view.tsx` (SHA-256 `05b23673379363cd1ba8c4045b4356475e5fc2e83c94ae866156df4a08dd9248`);
  - `app/estado-por-id-ch6.test.tsx`: el doble de las entregas en páginas y CH6-A19;
  - `lib/estado-por-id-estatico-ch6.test.ts`: CH6-A30 (c).
- No toqué ningún `*.ataque`, ni otra prueba, ni otro archivo de producción.

### Desviaciones
Ninguna.

## CHORE-06a — Corrección ronda 2 (T-02, T-03 y H-R2) (2026-11-12)

Programador. Ronda de corrección 2 de 3. Atiende **T-02** y **T-03** de `reporte-tester.md` ("## Ronda 2 — CHORE-06a") y **H-R2** de `revision.md` ("## Arbitraje de la ronda 2 — CHORE-06a"), con sus remedios en el texto exacto del arbitraje. Para T-03 aplico R-a, con la autorización del humano de `aprobacion.md` (tocar `features/clases/hooks.ts` solo en `useAvisoDeRecargaFallida`). El equipo estaba con corriente; una suite a la vez.

**Estado: terminado, sin PARADA.**
- **T-02:** corregido.
- **T-03:** corregido.
- **H-R2:** su caso salió **rojo** en Avisos y en Dudas, así que apliqué su remedio.
- No cayó ninguna vigilada de O-14 ni ninguna otra `*.ataque`. Las dos `*.ataque` de las rondas 1 y 2 están en verde sin tocarlas.

### Los diffs, en corto
`git diff --stat` de los cinco archivos con cambios de fondo: 58 inserciones y 15 borrados. Los otros tres solo suman un argumento.
- **`features/clases/hooks.ts`, solo `useAvisoDeRecargaFallida`:**
  - suma el parámetro obligatorio `clave: string`, antes de `idDelAviso`, y la ref `clavePrevia`;
  - al cambiar la clave, el efecto pone `fallosVistos` al día y vuelve sin avisar: `if (clavePrevia.current !== clave) { clavePrevia.current = clave; fallosVistos.current = errorUpdateCount; return }`;
  - `clave` entra a las dependencias del efecto;
  - el comentario de encima suma "`clave`: el id que protege; si cambia, empieza de cero".
- **Los cinco llamadores pasan su clave**, como único cambio:
  - `categorias-view.tsx`, `recursos-view.tsx` (`BloqueDeRecursos`), `trabajo-view.tsx` y `components/seccion-de-recursos.tsx` pasan `claseId`;
  - `editar-recurso-view.tsx` pasa `recursoId`.
- **T-02:** `recursos-view.tsx` y `trabajo-view.tsx` cambian `key={seccion.clave}` por `` key={`${claseId}:${seccion.clave}`} `` en la sección.
- **H-R2:** `muro-view.tsx` (`enfocarPublicacion`) y `dudas-view.tsx` (`enfocarDuda`) suman como primera línea `if (clasePrevia.current !== claseId) return false`, con su comentario.

### Casos nuevos (`src/app/estado-por-id-ch6.test.tsx`) y su rojo primero
El doble del servidor ganó un `manejador` por caso, consultado antes del doble por defecto y limpiado en `beforeEach`.

- **CH6-A20 (T-02)**, `describe` «CH6-A20 · «Sin tema» de Recursos y de Actividades al cambiar de clase (T-02)»:
  - «CH6-A20 (Recursos): con el foco en «Borrar recurso» de una fila de «Sin tema» de A, saltar a B lleva el foco al h2 «Recursos del docente»»
  - «CH6-A20 (Actividades): con el foco en una fila de «Sin tema» de A, saltar a B lleva el foco al h2 «Actividades de aprendizaje»»
  - «CH6-A20 (Recursos, «Ver más»): con «Ver más de Sin tema» de A en vuelo y el foco en él, saltar a B (sin página siguiente) lleva el foco al h2 «Recursos del docente» y la página de A no se escribe en B»
- **CH6-A21 (T-03)**, «CH6-A21 (%s): la recarga de B falla y avisa una vez; al saltar a A (sana, en caché) y volver a B no sale otro aviso; un fallo nuevo después en A avisa una vez» (Recursos y Actividades). El último tramo es el control de R8 que pide el arbitraje.
- **CH6-A22 (H-R2)**, «CH6-A22 (%s): con el foco en «Ver más» de A (con página siguiente) y el salto a B (sin página siguiente), el foco va al h2 de la lista» (Avisos y Dudas).
- **CH6-A30 (b)** (`src/lib/estado-por-id-estatico-ch6.test.ts`) suma dos `toContain`: `recursos-view.tsx` y `trabajo-view.tsx` con la `key` de la sección. El texto se arma por partes con `join`.

**Rojo primero, antes del cambio de producción:** `npx vitest run src/app/estado-por-id-ch6.test.tsx src/lib/estado-por-id-estatico-ch6.test.ts -t "CH6-A2[012]|CH6-A30"` → `Tests  8 failed | 4 passed | 74 skipped (86)`. Cayeron, cada uno por su razón:
- los 3 de CH6-A20: el foco quedó en «Borrar recurso» de B, en un `<li>` de B o en un `<li>` de B tras «Ver más»;
- los 2 de CH6-A21: `en A (sana) salió un aviso de recarga: … called 1 times, but got 2 times`;
- los 2 de CH6-A22: el foco quedó en una publicación o en una duda de B;
- CH6-A30 (b): la `key` compuesta no estaba en `recursos-view.tsx`.

Siguieron en verde CH6-A30 (precondición), (a), (a, control) y (c).

**Con el cambio:** `npx vitest run src/app/estado-por-id-ch6.test.tsx src/lib/estado-por-id-estatico-ch6.test.ts src/app/estado-por-id-ch6a-r2.ataque.test.tsx -t "CH6-A2[012]|CH6-A30|ATQ-CH6-1[6-9]"` → `Tests  20 passed | 82 skipped (102)`.

### Mutaciones
Hice cada una con `scratchpad/r2prog/mut.sh`. Las copias están en `scratchpad/r2prog/post/`. Restauré copiando la copia, nunca con `git`, y lo confirmé con `cmp`; al final, los 8 archivos dieron `OK` contra su copia.

| Id | Se quita | Cae |
|---|---|---|
| R2a | la `key` de la sección vuelve a `seccion.clave` en `recursos-view.tsx` | `5 failed \| 7 passed`: CH6-A20 (Recursos) y (Recursos, «Ver más»), ATQ-CH6-16 y 18 con «Sin tema», y CH6-A30 (b). Los controles «un tema» siguen verdes |
| R2b | lo mismo en `trabajo-view.tsx` | `3 failed \| 7 passed`: CH6-A20 (Actividades), ATQ-CH6-17 con «Sin tema» y CH6-A30 (b) |
| R2c | el bloque `if (clavePrevia.current !== clave) {…}` del gancho | `4 failed`: los 2 de CH6-A21 y los 2 de ATQ-CH6-19 |
| R2d | `if (clasePrevia.current !== claseId) return false` de `enfocarPublicacion` | `1 failed \| 1 passed`: CH6-A22 (Avisos) |
| R2e | la misma línea de `enfocarDuda` | `1 failed \| 1 passed`: CH6-A22 (Dudas) |

### Redundancias declaradas (O-05)
`pidiendoMasRef` de `entregas-view.tsx` (`handleVerMas`): para el doble clic es redundante con `fetchNextPage({ cancelRefetch: false })`, que une el segundo clic a la página en vuelo (MT10 del tester: ATQ-CH6-22 sigue en verde sin ella). Se conserva por la regla de `CLAUDE.md` (guarda síncrona en toda acción) y la vigila por forma `lib/guardas-de-doble-clic-estatico` (CH4-04). Ningún caso de comportamiento dice vigilarla.

### Inventario de ganchos con estado
**Componentes que sobreviven al cambio de un id de la ruta.** Los mismos que lista el arbitraje:
- al cambio de `:claseId`: `ClaseDeLaRuta`, `MuroDeLaClase`, `DudasDeLaClase`, `RecursosDeLaClase` con `BloqueDeRecursos` (`key={bloque}`) y `TrabajoDeLaClase`. Hasta esta ronda, también la sección «Sin tema»; con T-02 ya no sobrevive;
- al cambio de `:tareaId`, `:alumnoId` o `:recursoId`: los marcos de la Forma C y el exterior del detalle;
- al cambio de `:usuarioId`: el marco de la ficha.

**Mi búsqueda.** Con `awk` sobre cada `export const use… =` de `features/clases/hooks.ts`, `features/tareas/hooks.ts`, `features/calificaciones/hooks.ts` y `components/{foco,clase,seccion,adjuntos}/hooks.ts`, saqué las líneas con `useRef(`, `useRef<`, `useState(`, `useState<`, `new WeakMap` o `new Map(`. Además, `grep -n "^const .*= new WeakMap\|^const .*= new Map\|^let "` para la memoria de módulo.
- `calificaciones/hooks.ts` y `adjuntos/hooks.ts` no tienen ninguno.
- Después crucé cada gancho con los componentes que lo llaman (`grep -rn "<gancho>(" --include=*.tsx features`).

| Gancho | Qué guarda | ¿Quién lo usa sin `key` por el id? | ¿Lleva algo de A a B? | Remedio |
|---|---|---|---|---|
| `useAvisoDeRecargaFallida` (clases) | `fallosVistos`; ahora también `clavePrevia` | `BloqueDeRecursos`, `TrabajoDeLaClase` y, hasta T-02, «Sin tema» de Recursos | **Sí (T-03)** | R-a, aplicado y vigilado (R2c) |
| `useRenovarSiLaDudaYaNoEsta` (clases) | `fallosVistos`, la misma forma que el de arriba | `RespuestasDeDuda`, dentro de la fila de la duda (`key={duda.id}`, un id de una sola clase) | No: la fila se monta de nuevo con otra clase | no aplica |
| `useFocoAlCargarMas` (`components/foco`) | `teniaElFoco`, `estabaMontado`, `idsPrevios`, `seccionDelBoton` | `MuroDeLaClase`, `DudasDeLaClase` y, hasta T-02, «Sin tema» | **Sí, en foco** (ATQ-CH6-18 y H-R2) | T-02 con la `key` y H-R2 con la línea en `enfocarPublicacion` y `enfocarDuda`; aplicados y vigilados (R2a, R2d, R2e) |
| `useFocoAlPerderseElControl` (`components/foco`) | `controlRef`, `ventanaConFoco` | los marcos | No: su clave lleva el id | no aplica |
| `useFocoAlPasarAError` (clases) | `eraError`, `huboDatos`, `clavePrevia` | Avisos, Dudas, Personas y el layout | No: guarda su clave | no aplica (es el precedente de R-a) |
| `useFilaEnFoco` (clases) | la fila con el foco | las listas de la Forma B | No: cada lista la consume con su `clasePrevia` (O-14) | no aplica |
| `useFocoAlTituloDeLaClase` (clases) | `raizYaTeniaElFoco` | el layout | No: clave `${claseId}:${soloLectura}` | no aplica |
| `useAlPulsarLaSeccionActiva` (`components/seccion`) | `llaveRef` | las listas y sus secciones | No lleva nada de A: corre el manejador de B, que mira B | no aplica en 06a (observación del arbitraje para 06b) |
| `useGeneracionDeSoloLectura` (`components/clase`) | la generación | `TrabajoDeLaClase` y las vistas de tarea | No hace daño: solo sube al entrar en solo lectura | no aplica |
| `useMontado` (`components/clase`) | si el componente está montado | los ganchos de mutación de los formularios | No (CH6-A14) | no aplica |
| `useAvisoDeRecargaFallida` (tareas) | `alSalirRef`; `ultimoFalloAvisado` (`WeakMap` de módulo, por consulta) | el exterior del detalle y los marcos | No: la marca va por consulta, y la limpieza cierra sobre sus propios ids | no aplica |
| `tareaPerdidaAvisada` (tareas, `WeakMap` de módulo) | la tarea perdida ya avisada, por consulta | `avisarDelErrorDeLaEntrega` | No: va por consulta | no aplica |
| `useIndicadorDeSecciones`, `useTerminoDiferido`, `useTemasDelRecurso` y `useFocoAlQuitarUnaClase` (clases) | medida y panel; el término diferido; la petición previa de temas; la fila pendiente | el indicador olvida la medida de otra `base`; los buscadores y el formulario de recurso viven bajo una `key` por clase o por recurso; la lista de clases del admin no tiene id en la ruta | No | no aplica |
| `useOrdenDeTemasEnVuelo` y `useOrdenarTemas` (clases) | la caché de mutaciones, por `mutationKey` con la clase | `TrabajoDeLaClase` | No (CHORE-04 §D-4 bis) | no aplica |
| **`useFocoAlCerrarElBorrado` (clases, `hooks.ts:1000`)** | `devolverA`, el id de la clase cuyo «Borrar definitivamente» abrió el diálogo | solo `clases-admin-view.tsx:82` (`/admin/clases`, ruta sin id) | No: no hay un id de ruta que cambie | no aplica |

**Contra el inventario del manager:** encontré **uno que él no nombra**, `useFocoAlCerrarElBorrado`. No lleva nada de A a B: lo usa una vista sin id en la ruta. Todo lo demás coincide.

**No hay otro gancho que lleve algo de A a B** y cuyo remedio caiga fuera de la lista: no hay nada que reportar.

### Estados vecinos del gancho con clave (`useAvisoDeRecargaFallida` de clases)
| Estado | Qué pasa | Caso |
|---|---|---|
| Primera carga | `clavePrevia` nace con la clave y `fallosVistos` con el contador de ese momento: no avisa | regresión de R8: «CL3-C11: volver a montar la vista con un fallo ya ocurrido no avisa» (`contenido-03c2.test.tsx:419`) y CL3-D01 (`recursos-03d.test.tsx:518`) |
| Recarga que falla, con datos, en la misma clase | El contador cambia con la misma clave: un aviso | CH6-A21 (primer aviso en B; el control en A) y CH6-A16 (503) |
| Fallo ya en la caché al llegar (montar con el error ocurrido) | No avisa | CL3-C11 y CL3-D14 (`editar-recurso-03d.test.tsx:651`) |
| Cambio de clave sin error | Se pone al día y no avisa | CH6-A21 (salto a A, sana) |
| Cambio de clave con la otra consulta en error ya avisado | No repite: el contador de la otra es el "visto" desde el salto | CH6-A21 (volver a B) y ATQ-CH6-19 |
| Dos fallos seguidos en la misma clase | Cada uno cambia el contador: dos avisos (con `idDelAviso`, el segundo reemplaza al primero a la vista) | CL3-D01 (dos bloques, mismo id). No escribí el caso con la misma consulta; es la conducta de antes, sin cambio |
| A → B → A con fallos en las dos clases | Cada salto pone al día sin avisar. El fallo nuevo que llega estando en una clase avisa una vez | CH6-A21 cubre fallo en B, salto, vuelta y un fallo nuevo en A. La variante con el fallo de A ya ocurrido antes no tiene caso propio: por el mismo bloque, no avisa al volver |
| Un fallo que llega justo en el render del salto (el contador de B cambia en el mismo render que la clave) | El bloque de la clave gana: se pone al día y ese fallo no se avisa. En la práctica, el salto y la respuesta llegan en commits distintos, y el fallo posterior al salto avisa | sin caso, por lectura. Es el límite de R-a, aceptado en el arbitraje como el de `useFocoAlPasarAError` |
| `StrictMode` (doble efecto) | En el segundo pase, la clave ya es la misma y el contador ya está visto: no duplica | sin caso propio para este gancho; CH6-A13 (d) cubre `StrictMode` en Personas |

### Estados vecinos de «Sin tema» montada de nuevo
| Estado | Qué pasa | Caso |
|---|---|---|
| La página de «Ver más» de A llega estando en B | Se escribe en la caché de A, no en B; el foco se queda en el `h2` | CH6-A20 (Recursos, «Ver más») |
| El aviso de recarga de «Sin tema» y el del bloque, con el mismo `idDelAviso` | Con la `key` por clase y la clave del gancho, «Sin tema» de B empieza de cero. Dos fallos de B (bloque y sección) siguen dejando un solo aviso a la vista por el id de sonner | CL3-D01 (mismo id); sin caso nuevo |
| Mover un recurso o una actividad a «Sin tema» y desde ella | La `key` depende solo de la clase y de la clave de la sección, no del contenido: la sección aparece o desaparece según `sinTema` y se monta como antes | regresión de mover: CL3-D10 (`recursos-03d.test.tsx:1035`) y la suite de Actividades, en verde |

### Verificación (desde `frontend/`, una a la vez)
| Qué | Comando | Última línea |
|---|---|---|
| lint | `npm run lint` | salida 0; `> tsc -b` |
| suite de 06a | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Tests  5372 passed (5372)` (`Test Files  241 passed (241)`; `Duration  281.03s …`) |
| conteo | `npx vitest list` de las cuatro pruebas nuevas, con `grep -a -c` por archivo | 81 en `app/estado-por-id-ch6.test`, 82, 56 y 5: **224**. CH6-A20: 3, CH6-A21: 2, CH6-A22: 2 |

`build` y la suite completa no los corrí.

### Archivos tocados en `frontend/` (`git status --porcelain frontend | wc -l` → **37**)
- Los 36 de la ronda anterior, más el `*.ataque` de la ronda 2 del tester (`app/estado-por-id-ch6a-r2.ataque.test.tsx`), que no toqué.
- En esta ronda cambié 10, todos ya entre los 36:
  - `features/clases/`: `hooks.ts`, `recursos-view.tsx`, `trabajo-view.tsx`, `categorias-view.tsx`, `editar-recurso-view.tsx`, `components/seccion-de-recursos.tsx`, `muro-view.tsx` y `dudas-view.tsx`;
  - `app/estado-por-id-ch6.test.tsx` y `lib/estado-por-id-estatico-ch6.test.ts`.
- `muro-view.tsx` y `dudas-view.tsx` ya estaban entre los 25 de producción, así que el conteo no sube a 38 ni a 39.

### Desviaciones
Ninguna. El texto del gancho y de las dos líneas de H-R2 es el del arbitraje.
