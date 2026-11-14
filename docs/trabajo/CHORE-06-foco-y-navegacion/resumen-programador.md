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

---

# CHORE-06b

## Implementación — CHORE-06b (2026-11-12)


**Estado: DETENIDO en el paso 18 (antes de las mutaciones), por PA-1, PA-2 y una contradicción del plan en §D-6 (fila 361).** Los pasos 13 a 17 están hechos; el 19 se corrió (lint, regresión y build) y es lo que mostró las paradas. No apliqué ninguna mutación ni toqué las pruebas que caen. Equipo conectado a la corriente (`Win32_Battery.BatteryStatus` 2).

### Paradas

**P-1 · PA-1 y PA-2: §D-6 (a) cambia el sentido de tres pruebas que el plan no inventarió.** `gradebook-view.tsx` llama `useMarcarViejasLasVentanas` al pulsar «Calificaciones» (§D-6 a, como dice el plan). Esa llamada es un `invalidateQueries({ refetchType: "none" })` más, y estas pruebas cuentan esas marcas y afirman que pulsar no agrega ninguna:
- PA-1 (normal, fuera de la lista cerrada): `src/features/calificaciones/gradebook-01d.test.tsx`
  - CAL-1D03d (4 filas del `it.each`: '400 de cursor', '400 de cursorTareas', 'ventana vacía de alumnos', 'ventana vacía de tareas'): `:1355`, `expected [ …(2) ] to have a length of 1 but got 2`.
  - CAL-1D03e ("con la tabla sana en la primera…"): `:1385`, `expect(marcasViejas(espia)).toHaveLength(0)` → `got 2`.
- PA-2 (`*.ataque` fuera de los C-n): `src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` CAL-T-244 (`:626`, `expect(marcas()).toBe(1)` → 2) y `src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` CAL-T-258 (`:406`, `expect(marcasViejas(espia)).toHaveLength(marcas)` → 3 contra 1).
- No es arreglable sin cambiar su sentido: N-52 consiste justamente en marcar la ventana a la vista al pulsar. Para CAL-1D03e (tabla sana, sin frase) una variante sería marcar al pulsar solo con la frase a la vista (`ocurrenciaDelCursor !== null`), como la limpieza de (b); CAL-1D03d, CAL-T-244 y CAL-T-258 cambian de sentido en cualquier caso. Decide el Arquitecto o el Manager (reescritura de esas aserciones, con la del tester para las dos `*.ataque`).

**P-2 · Contradicción de §D-6 (fila 361) con CH6-B15 (alumno).** Con la forma literal del plan ("si alguna consulta en caché bajo las dos claves trae la clase, se invalidan las dos claves"), `CH6-B15 (alumno)` cae: la barra se pide dos veces (`recargas-ch6.test.tsx:1141`, `expected 3 to be 2`).
- Causa: el alumno pasa por dos efectos (el de `ClaseLayout` y, tras el `Navigate`, el de `ClaseAnteriorView`). El primero invalida y la barra se pide y llega ya sin A. Pero la lista del inicio está en caché, inactiva e invalidada, y sus datos todavía traen a A. El segundo efecto la encuentra con `listaTraeLaClase` e invalida otra vez las dos claves, así que la barra (activa) se pide de nuevo. El mismo vecino aparece en el salto A → B → A del maestro si el inicio ya estaba en caché.
- Comprobado con un experimento en el archivo real, restaurado desde copia (`cmp` igual): invalidar solo las consultas que traen la clase (`invalidateQueries({ queryKey: lista, predicate: (q) => listaTraeLaClase(q.state.data, claseId) })`) deja los 5 casos de CH6-B15 en verde. No lo apliqué: cambia el mecanismo que el plan escribe. Queda la forma literal y el caso en rojo.
- Desviación menor ya aplicada y declarada: las dos invalidaciones van con `{ cancelRefetch: false }` (PR-3), sin la cual el segundo efecto cancelaba y repetía la petición en vuelo.

### Rojo primero (paso 13)
Comandos desde `frontend/`, uno a la vez, antes de tocar producción:
- `npx vitest run src/components/seccion/recargas-ch6.test.tsx` → `Tests  12 failed (12)`: los ganchos no existen (`… is not a function`). Esperado (CH6-B01 no lo nombra el paso 13; CH6-B02 sí, rojo).
- `npx vitest run src/features/calificaciones/gradebook-ch6.test.tsx` → `Tests  3 failed | 1 passed (4)`: CH6-B14 (a), (b) y (d) rojos (`expected [] to have a length of 1`: la ventana vacía se sirve de la caché; (d): `isInvalidated` falso); (c) verde (regresión).
- `npx vitest run src/features/clases/ver-mas-ch6.test.tsx` → `Tests  88 failed | 54 passed (142)`. Rojos: todo CH6-B10, CH6-B12 (a), (c), (d), (e) y CH6-B13. Verdes: CH6-B11 entero (lo que sigue reemplazando ya reemplaza) y CH6-B12 (b) (la recarga que gana).
- `npx vitest run src/features/clases/recargas-ch6.test.tsx` → `Tests  53 failed | 77 passed (130)` en la primera corrida. Contraste con el paso 13:
  - Verdes como se esperaba: CH6-B04 entero, incluido (c′) (la librería); CH6-B16 (a) y (b); CH6-B18 (b) y (d).
  - Rojos como se esperaba: CH6-B16 (c), (e) y (f); CH6-B18 (a) (parte M-02), (c) y (e) (ganchos inexistentes).
  - Verdes también, sin que el paso 13 los nombre: CH6-B03 de las siete listas que ya tenían `refetch` en error, CH6-B05 (Avisos y Dudas), CH6-B06, CH6-B16 de foco en el estado (b) y las tres de N-01 (con B solo vieja, la vista de hoy no hace nada y pide el observador), y CH6-B15 (admin) y (maestro desde «Clases archivadas»), que fijan que no se pide nada.
  - **Salieron distinto: CH6-B07 y CH6-B09, verdes.** Mi primera versión ponía la lista en error **sin datos**, y ahí la librería no cancela (`query.fetch` solo cancela con datos) y `resetQueries` deja la consulta en `pending`. Las reescribí con la lista en error **con datos** (B07) y con una recarga ya en vuelo por `refetchQueries` (B09, como T-07 de ADMIN-01g). Corridas de nuevo antes de tocar producción: `npx vitest run src/features/clases/recargas-ch6.test.tsx -t "CH6-B07"` y `-t "CH6-B09"` → 7 y 3 rojos, `expected 5 to be 4` (la petición de más).
- Después de implementar, tres casos de `ver-mas-ch6` fallaron por la prueba, no por el código, y los corregí: CH6-B12 (c) esperaba dos peticiones de la página con la vista desmontada, pero la librería cancela el reintento al quedarse sin observadores (`cancelRetry`), así que sale una; el caso con `signal` contaba también la página; CH6-B13 (abrir) no alcanzaba a ver el mensaje porque la renovación quitaba la fila enseguida (ahora la retiene). Y CH6-B15 (salto) arrancaba en A con la barra sin cargar; ahora arranca en B.

### Verificación (paso 19, desde `frontend/`)
- `npm run lint`: la última línea es `> tsc -b`, que termina sin errores (antes, `All matched files use Prettier code style!`).
- `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` → `Tests  9 failed | 5352 passed (5361)` (`Test Files  5 failed | 235 passed (240)`). Las 9 fallas:
  - 7 de P-1: 5 normales en `gradebook-01d.test.tsx` (CAL-1D03d, sus 4 filas, y CAL-1D03e) y 2 `*.ataque` (CAL-T-244 y CAL-T-258);
  - CH6-B15 (alumno), P-2 de §D-6;
  - CAL-T-191 (`estatico-01d-r1.ataque.test.ts`), que señalaba mi `gradebook-ch6.test.tsx` por construir fechas sin fijar el reloj. Corregí mi prueba (reloj fijo solo para `Date`) y lo comprobé con `npx vitest run src/features/calificaciones/gradebook-ch6.test.tsx src/features/calificaciones/estatico-01d-r1.ataque.test.ts` → `Tests  14 passed (14)`. No volví a correr la suite de regresión completa después de eso.
- `npm run build` → `✓ built in 1.04s`.
- Los 12 archivos C-n de la ronda 0 pasan en esa corrida (ninguno está entre las fallas): los 20 casos rojos de la ronda 0 quedaron verdes.
- C-10 (`app/muro-recuperar-c-r4.ataque.test.tsx`) y C-14 (`app/estado-por-id-ch6a-r3.ataque.test.tsx`) **no cayeron**. La condicional PR-C18 (`muro-view.test.tsx:344`) tampoco; no la toqué.

### Pruebas requeridas → caso (el comienzo exacto del título; `%s` es la fila del `it.each`)
- CH6-B01 (a) a (i) → `components/seccion/recargas-ch6.test.tsx`: «CH6-B01 (a): sana y fresca, pulsar la sección no pide nada», «CH6-B01 (b): sana y marcada vieja…», «CH6-B01 (c): sana con más de 30 s…», «CH6-B01 (d): en error sin datos…», «CH6-B01 (e): en error con datos (página siguiente fallida)…», «CH6-B01 (f): en error y pidiendo…», «CH6-B01 (g): dos pulsaciones en el mismo act…», «CH6-B01 (h): el primer render no cuenta…», «CH6-B01 (i): con dos consultas en la misma llamada…».
- CH6-B02 (a), (b) y (c) → el mismo archivo: «CH6-B02 (a): en error al desmontarse…», «CH6-B02 (b): al cambiar de clave en error…», «CH6-B02 (c): sana, no se toca al desmontarse». Se arman con el error a mano, sin `isInvalidated`: solo fijan la garantía escrita de PR-2 para el día en que cambie la librería, y no prueban una conducta que la persona vea hoy. La regresión de `features/admin` va en la suite de regresión.
- CH6-B03 → `features/clases/recargas-ch6.test.tsx`: «CH6-B03 (%s, primera carga fallida)…» (las 12 listas), «CH6-B03 (%s, el 400 del cursor)…» (las 10 paginadas), «CH6-B03 (Avisos, pulsando el enlace «Avisos» del control segmentado)…» y «CH6-B03 (%s, pulsando «Inicio» de la barra)…» (los dos inicios). Los comentarios se prueban solo pulsando «Avisos», no «Recursos».
- CH6-B04 → el mismo archivo: «CH6-B04 (%s, sin datos)…» y «CH6-B04 (%s, con datos y una recarga fallida)…» (12 cada uno), y «CH6-B04 (c′) (%s)…» (Avisos, Personas e inicio del estudiante). La parte M-02 (la lista conservada se ve mientras vuela al volver) va en `ver-mas-ch6.test.tsx`: «CH6-B10 (%s, volver de otra sección)…» (9 listas).
- CH6-B05 → «CH6-B05 (%s): tras pulsar dos veces la sección…» (Avisos, Dudas e inicio del estudiante).
- CH6-B06 → «CH6-B06 (%s): con la primera carga fallida, cerrar y volver a abrir el bloque…» (comentarios y respuestas). El camino de «Ver más» lo cubre CH6-B10.
- CH6-B07 → «CH6-B07 (%s): con la lista en error (con datos) y su nueva petición retenida…» (las siete de la fila 346).
- CH6-B08 → «CH6-B08: tras «Subir» con la recarga por sección fallida…».
- CH6-B09 → «CH6-B09 (%s): con la lista en error y una recarga en vuelo…» (/admin/clases, Clases anteriores y Clases archivadas).
- CH6-B10 → `ver-mas-ch6.test.tsx`: «CH6-B10 (%s, %s): salen las dos peticiones…» (9 listas × 500 y sin red, con el «repetir»); «CH6-B10 (%s, pulsar la sección)…», «CH6-B10 (%s, volver de otra sección)…» y «CH6-B10 (%s, la recuperación falla)…» (9 cada uno); «CH6-B10 (Avisos, invalidación por comentar)…»; «CH6-B10 (%s, foco en una fila)…» (Avisos y Dudas).
- CH6-B11 → «CH6-B11 (%s, %s): la página que falla reemplaza la lista…» (400 del cursor, 400 VALIDACION de otro campo, 429, 403 en las listas de clase, 404 en comentarios y respuestas) y «CH6-B11 (%s, 401 sin refresco)…».
- CH6-B12 (a) a (e) → «CH6-B12 (a) (%s)…», «CH6-B12 (b) (%s)…», «CH6-B12 (c) (%s)…» (las 8 sin `signal`), «CH6-B12 (c) (un tema de Actividades, con signal)…», «CH6-B12 (d) (%s)…» y «CH6-B12 (e) (%s)…».
- CH6-B13 → «CH6-B13 (abrir)…», «CH6-B13 («Ver más comentarios»)…», «CH6-B13 (un recurso)…» y «CH6-B13 (dos fallos seguidos)…».
- CH6-B14 (a) a (d) → `features/calificaciones/gradebook-ch6.test.tsx`: «CH6-B14 (a): con la frase a la vista, pulsar «Calificaciones»…», «CH6-B14 (b): …salir a otra sección y volver antes de 30 s…», «CH6-B14 (c): regresión de CAL-T-201…» y «CH6-B14 (d): salto del historial de A…».
- CH6-B15 → `recargas-ch6.test.tsx`: «CH6-B15 (%s): con A en la barra…» (alumno, **rojo por P-2**; maestro), «CH6-B15 (admin)…», «CH6-B15 (maestro desde «Clases archivadas»)…» y «CH6-B15 (salto del historial)…».
- CH6-B16 → «CH6-B16 (a) (%s)…», «(b) (%s)…», «(c) (%s, falló estando a la vista)…», «(c) (%s, falló fuera de la vista)…», «(e) (%s)…» y «(f) (%s)…» (Avisos y Dudas); «CH6-B16 (foco, %s, %s): con el foco en una fila de A…» y «…con el foco en el control segmentado…» (4 listas × (b) y (c)); y las tres «CH6-B16 (Avisos, N-01, …)».
- **N-05** → «CH6-B16 (c) (Avisos, N-05: la clave de useListaConservadaTrasLaPagina): A con su lista conservada… B muestra su MensajeError mientras vuela su renovación…». Antes del salto comprueba que los dos `errorUpdateCount` coinciden.
- CH6-B17 → «CH6-B17 (%s): B falló fuera de la vista y su renovación responde 503…» (Recursos y Actividades), «…y su renovación también falla…» (Avisos y Dudas) y «CH6-B17 (%s, la renovación de A en vuelo)…» (las 4).
- CH6-B18 → «CH6-B18 (a) (%s)…» (Avisos y Dudas), «CH6-B18 (b)…», «CH6-B18 (c): un rerender a otra clave…», «CH6-B18 (d)…» y las dos «CH6-B18 (e)…».

### Conteos
- `npx vitest list src/components/seccion/recargas-ch6.test.tsx src/features/clases/recargas-ch6.test.tsx src/features/clases/ver-mas-ch6.test.tsx src/features/calificaciones/gradebook-ch6.test.tsx`, contado con `grep -a -c`: 288 casos (12, 130, 142 y 4).
- Archivos tocados en `frontend/` (`git status --short frontend`): **38**, los de la Enmienda 3; ninguna condicional.
  - Producción (19): `components/seccion/hooks.ts`, `components/seccion/types.ts` (nuevo), `features/admin/hooks.ts`, `features/calificaciones/hooks.ts`, `features/calificaciones/gradebook-view.tsx`, `features/clases/hooks.ts`, `features/clases/lib.ts`, `muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `personas-view.tsx`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `components/seccion-de-recursos.tsx`, `components/seccion-de-tema.tsx`, `components/respuestas-de-duda.tsx`, `components/comentarios-de-publicacion.tsx` y `components/tabla-alumnos.tsx` (los últimos 13, bajo `features/clases/`).
  - Pruebas nuevas (4): `components/seccion/recargas-ch6.test.tsx`, `features/clases/recargas-ch6.test.tsx`, `features/clases/ver-mas-ch6.test.tsx` y `features/calificaciones/gradebook-ch6.test.tsx`.
  - Lista cerrada (3):
    - `ver-mas-y-orden-ch4.test.tsx`: CH4-30 (c) y CH4-31 (c), con títulos y aserciones como dice la lista. La importación de `mensajeDeErrorDeLista`, que quedó sin uso, pasa a `mensajeDeConsultaClases`;
    - `personas-view.test.tsx:263-277`: espía de `toast.error`, sin `role="alert"` y el foco en el botón;
    - `publicacion-del-muro.test.tsx`: `MemoryRouter`.
  - `*.ataque` de la ronda 0 (12), que no toqué.

### Notas de implementación
- `conservaLaListaTrasLaPagina` es la de la Enmienda 3 (red o `5xx`), con el tipo en línea: ninguna regla de tipos de `features/clases` lo rechazó (lint en verde).
- `useListaConservadaTrasLaPagina` tiene la forma exacta del plan; no hizo falta otra (sin PA-4).
- Los inicios y las 12 listas importan los ganchos de la política de `@/components/seccion/hooks` (N-02). C-15 y C-16 pasan.
- `respuestas-de-duda.tsx`: sin `pedir`, la consulta no se pasa a `useRecargarAlPulsarLaSeccion` (`...(pedir ? [respuestas] : [])`).
- `useRenovarSiLaPublicacionYaNoEsta` invalida con `invalidarMuro` (Avisos, `exact`) y con `clavePrefijoDeRecursos(claseId)`.
- La limpieza de §D-6 (b) lee una ref que se actualiza en cada render (`ocurrenciaDelCursor !== null`) y marca la clase de su cierre.

### Pendiente por la parada
- Paso 18 (mutaciones): no apliqué ninguna. Van al reanudar, con la decisión sobre P-1 y P-2.
- Van también en el resumen de la reanudación: los hermanos por mecanismo de §D-4 a §D-6, el inventario de M-5 contrastado con el código, los estados vecinos de DH-10 y la matriz de avisos y recargas de §D-7. Las dos decisiones pendientes cambian dos filas de esa matriz (pulsar «Calificaciones» y la clase archivada leída dos veces).
- La suite de regresión no se volvió a correr completa después de corregir el reloj de `gradebook-ch6.test.tsx`.

## Reanudación — CHORE-06b: R-1 a R-4 y pasos 18 a 20 (2026-11-12)


Programador. Plan vigente: `plan.md`, 1156 líneas, SHA-256 `201dc71f…` (Enmiendas 4 y 4b). Equipo conectado a la corriente. Comandos desde `frontend/`, una suite a la vez.

### R-1 · Lista cerrada, entrada 6
`src/features/calificaciones/gradebook-01d.test.tsx`, CAL-1D03d (las 4 filas del `it.each`), tal cual la entrada 6:
- el título cambia de "…sin aviso, sin aria-busy ni otra marca, y el foco se queda en la sección" a "…sin aviso, sin aria-busy, con una sola marca más (la de N-52: la ventana a la vista queda vieja; CHORE-06b) y el foco se queda en la sección";
- `expect(marcasViejas(espia)).toHaveLength(marcas)` pasa a `marcas + 1`;
- se suma la línea de `isInvalidated` de `claveGradebook(CLASE_ID, DESTINOS[caso.pulsar].destino)`.

Nada más del archivo cambió. CAL-1D03e no se tocó.

### R-2 · P-1 en `gradebook-view.tsx`
- **Rojo primero.** Escribí CH6-B14 (f), (g) y (h) en `gradebook-ch6.test.tsx` y los corrí contra el código del árbol: `npx vitest run src/features/calificaciones/gradebook-ch6.test.tsx` → `Tests  3 failed | 4 passed (7)`.
  - (g) y (h): `expected false to be true`. W no queda `isInvalidated` tras «Alumnos anteriores», porque la limpieza miraba "se ve ahora".
  - (f): `expected 4 to be 3`. Con la marca incondicional de entonces W sí quedaba inválida, pero la última pulsación, ya con la tabla sana, agregaba una marca. Es rojo por la otra mitad del caso, no por la de W; lo digo porque el plan esperaba los tres rojos por W.
- **Cambio.**
  - El cálculo puro de `reemplazada`, `errorDeCursor`, `ventanaVaciaConCursor` y `ocurrenciaDelCursor` sube por encima de `useAlPulsarLaSeccionActiva`. `conCursor` se queda donde estaba: no lo usa el manejador.
  - `fraseSinMarcarRef` y `fraseMarcadaRef` reemplazan a `fraseALaVistaRef`.
  - El efecto que enciende la frase va justo después del cálculo y antes de `useAlPulsarLaSeccionActiva`: `if (ocurrenciaDelCursor === null || ocurrenciaDelCursor === fraseMarcadaRef.current) return; fraseSinMarcarRef.current = ocurrenciaDelCursor`.
  - El manejador de la pulsación, antes de `recargarLaPrimeraVentana()`, y la limpieza al desmontar (el efecto de `[marcarViejasLasVentanas]`) marcan y apagan: con `fraseSinMarcarRef.current !== null` pasan el valor a `fraseMarcadaRef`, ponen `fraseSinMarcarRef` en `null` y llaman a `marcarViejasLasVentanas()`.
  - `features/calificaciones/hooks.ts` no cambió.
  - Subir el cálculo no hizo caer ninguna prueba de foco de T-08 (R-4 y la suite de regresión).

### R-3 · P-2 en `features/clases/hooks.ts`
- `renovarLasListasSiTraenLaClase` recorre las dos claves e invalida cada una con `{ queryKey: lista, predicate: (consulta) => listaTraeLaClase(consulta.state.data, claseId) }` y `{ cancelRefetch: false }`.
- **Quité la comprobación previa con `getQueriesData` (`laTraen`):** el `predicate` ya decide (el plan me deja elegir).
- Sumé dos casos a `recargas-ch6.test.tsx` (CH6-B15):
  - el del maestro con el inicio en caché (A → B → A), que pide el plan;
  - y, en el paso 18, «CH6-B15 (alumno, la barra en vuelo)». Hizo falta porque la fila de `{ cancelRefetch: false }` no caía: en el caso del alumno la barra ya había respondido cuando corría el segundo efecto. El plan prevé que la retenga.

### R-4 · Corrida corta
- `npx vitest run src/features/calificaciones src/features/clases/recargas-ch6.test.tsx` → `Test Files  23 passed (23)` y `Tests  599 passed (599)`.
- `npm run lint` → termina en `> tsc -b` sin errores.

Quedaron en verde: CAL-1D03d (4 filas), CAL-1D03e, C-19 (CAL-T-244), C-20 (CAL-T-258), los casos de CH6-B15 con el nuevo y CH6-B14 (a) a (h). No cayó ninguna otra prueba.

### CH6-B nuevos o cambiados desde el resumen de la parada (archivo y título exacto)
- `src/features/calificaciones/gradebook-ch6.test.tsx`:
  - «CH6-B14 (f): tras ver la frase y regresar con «Alumnos anteriores», pulsar «Calificaciones» deja W isInvalidated; «Alumnos siguientes» la pide una vez y la frase no vuelve; otra pulsación ya con la tabla sana no marca nada»
  - «CH6-B14 (g): tras ver la frase y regresar con «Alumnos anteriores», ir a otra sección y volver antes de 30 s deja W isInvalidated; «Alumnos siguientes» la pide una vez y la frase no vuelve»
  - «CH6-B14 (h): tras ver la frase en A y regresar con «Alumnos anteriores», saltar con el historial a B deja W de A isInvalidated; al regresar a A, «Alumnos siguientes» la pide una vez y la frase no vuelve»
  - CH6-B14 (e) (tabla sana, pulsar no marca): no escribí un caso propio. Lo fija CAL-1D03e (`gradebook-01d.test.tsx`), que no cambia, como permite el plan; la mutación G3 lo hace caer.
  - Además fijé el reloj (solo `Date`) en todo el archivo, por CAL-T-191.
- `src/features/clases/recargas-ch6.test.tsx`:
  - «CH6-B15 (maestro con el inicio en caché): A archivada → B → A con el historial: la barra se pide una sola vez, el inicio no se pide mientras no se monta pero queda isInvalidated, y al volver al inicio se pide una vez y ya no trae a A»
  - «CH6-B15 (alumno, la barra en vuelo): con la petición de la barra retenida mientras el alumno pasa a «Clases anteriores», la segunda corrida del efecto se une a ella y la barra se pide una sola vez»
  - «CH6-B16 (Avisos, N-01, B vieja y sin página siguiente al llegar): «Ver más avisos» desaparece en el salto y el foco va al h2 de Avisos, no a una publicación de B, y sigue ahí tras la renovación». Es nuevo: es el caso de CH6-B16 que hace caer la mutación de H-R2 (ver D2).
  - N-05, sin cambio desde la parada: «CH6-B16 (c) (Avisos, N-05: la clave de useListaConservadaTrasLaPagina): A con su lista conservada tras un «Ver más» fallido y B en error por una recarga con el mismo contador de errores: al saltar, B muestra su MensajeError mientras vuela su renovación (no conserva la marca de A)».
- El resto de CH6-B01 a CH6-B18 conserva los archivos y títulos del resumen de la parada ("Pruebas requeridas → caso").

### Paso 18 · Mutaciones (tabla de 06b completa)
Cada fila se hizo con `scratchpad/mutar.py`:
1. copia el archivo real a una copia de respaldo;
2. cambia el texto exacto, comprobando que aparece una sola vez;
3. corre `npx vitest run <pruebas> -t "<filtro>"`;
4. restaura desde la copia y compara byte a byte (`filecmp.cmp(..., shallow=False)`, el equivalente de `cmp`). En las 31 corridas salió "igual". Hubo además un primer intento de G5 que no cambió nada, porque el texto aparecía dos veces; lo repetí con más contexto.

Nunca `git checkout`, `git restore` ni `git stash`. Rutas relativas a `frontend/src/`.

| Id | Fila del plan | Archivo | Qué quité | Cayó | cmp |
|---|---|---|---|---|---|
| M01 | `isStale` de PR-1 | `components/seccion/hooks.ts` | `&& !consulta.isStale` | CH6-B01 (b), CH6-B01 (c), CH6-B08 | igual |
| M02 y M03 | `isFetching` de PR-1, sola | `components/seccion/hooks.ts` | `if (consulta.isFetching) continue` | Nada: CH6-B01 (f) y (g), CH6-B07 y CH6-B16 (e) pasan. **Redundancia declarada** (PR-3): `cancelRefetch: false` une la llamada a la petición en vuelo. La vigila M04 | igual |
| M04 | PR-3: `isFetching` y `cancelRefetch: false` a la vez | `components/seccion/hooks.ts` | las dos (queda `refetch()`) | CH6-B07 (las 7) y CH6-B16 (e) (las 4) | igual |
| | | | | **CH6-B01 (f) no cae:** su consulta está en error sin datos, y sin datos `query.fetch` no cancela lo que vuela (5.103.2), así que no hay petición de más. **Redundancia del mecanismo**: lo vigilan B07 y B16 (e), que tienen datos | |
| M05 | `useMarcarViejaSiQuedoEnError` de Avisos | `features/clases/muro-view.tsx` | la llamada | Nada (CH6-B04 de Avisos y (c′) pasan). **Redundancia declarada** por el plan: la acción `error` ya deja la consulta inválida (`query.js:450-462`). Vigilan el gancho M18 y M19 | igual |
| M06 | `&& !conserva`, comentarios | `features/clases/components/comentarios-de-publicacion.tsx` | `&& !conserva` | CH6-B10 (comentarios: 500, sin red, pulsar, volver, la recuperación falla) | igual |
| M07 | `&& !conserva`, un inicio | `features/clases/inicio-estudiante-view.tsx` | `&& !conserva` de `errorALaVista` | CH6-B10 (inicio del estudiante: los mismos 5) | igual |
| M08 | `useRenovarSiLaPublicacionYaNoEsta` | `features/clases/components/comentarios-de-publicacion.tsx` | la llamada | CH6-B13 (los 4) | igual |
| G1 | la llamada de (a) | `features/calificaciones/gradebook-view.tsx` | `marcarViejasLasVentanas()` del manejador | CH6-B14 (a), CH6-B14 (f), CAL-1D03d (4 filas), C-20 (CAL-T-258) | igual |
| G2 | la llamada de (b), la limpieza | ídem | `marcarViejasLasVentanas()` de la limpieza | CH6-B14 (b), (d), (g) y (h), C-19 (CAL-T-244) | igual |
| G3 | (Enmienda 4) marcar siempre al pulsar | ídem | el `if` de la frase en el manejador (queda la marca incondicional) | CAL-1D03e, C-20, CH6-B14 (f) | igual |
| G4 | (4b) volver a "se ve ahora" | ídem | el efecto copia `ocurrenciaDelCursor` (también `null`) a `fraseSinMarcarRef` en cada render | CH6-B14 (f), (g) y (h) | igual |
| G5 | (4b) no apagar la frase al marcar | ídem | `fraseSinMarcarRef.current = null` del manejador | C-20, CH6-B14 (f) | igual |
| G6 | (4b) sin la comparación con `fraseMarcadaRef` | ídem | `\|\| ocurrenciaDelCursor === fraseMarcadaRef.current` | CH6-B14 (f): W, servida de la caché con la ocurrencia ya marcada, enciende otra vez la frase y la última pulsación marca. Sin redundancia | igual |
| C1 | guarda de `fetchStatus` de `useRecuperarListaDeClasesAdmin` | `features/clases/hooks.ts` | `if (consulta.fetchStatus === "fetching") return` | CH6-B09 (/admin/clases) | igual |
| C2 | (N-03, Enmienda 4) invalidar las dos claves sin condición | ídem | el `predicate` (queda `{ queryKey: lista }`) | CH6-B15 (alumno), (maestro desde «Clases archivadas»), (maestro con el inicio en caché), (salto del historial) | igual |
| C3 | (Enmienda 4, P-2) la forma anterior: `laTraen` y luego las dos claves enteras | ídem | el `predicate`, cambiado por la comprobación previa | CH6-B15 (alumno), CH6-B15 (maestro con el inicio en caché) | igual |
| C4 | (Enmienda 4) `{ cancelRefetch: false }` | ídem | la opción | Primera corrida: nada (la barra ya había respondido). Con el caso nuevo que la retiene: CH6-B15 (alumno, la barra en vuelo) | igual |
| D1 | (3b) en `dudas-view.tsx`, la llamada de `023b450` | `features/clases/dudas-view.tsx` | `useRecargarAlPulsarLaSeccion(dudas)` por `useAlPulsarLaSeccionActiva(() => { if (!dudas.isError) return; void dudas.refetch() })` | CH6-B16 (c) (Dudas, falló estando a la vista), CH6-B16 (c) (Dudas, falló fuera de la vista) | igual |
| D2 | (DH-10 a) la línea de H-R2 en `enfocarPublicacion` | `features/clases/muro-view.tsx` | `if (clasePrevia.current !== claseId) return false` | Primera corrida: CH6-A22 (Avisos) de 06a; ningún CH6-B16 (las variantes N-01 llegaban a B con página siguiente). Con el caso nuevo: CH6-B16 (Avisos, N-01, B vieja y sin página siguiente al llegar) | igual |
| D3 | (DH-10 b) `clave` del aviso en `trabajo-view.tsx`, por una constante | `features/clases/trabajo-view.tsx` | `claseId` → `"constante"` | CH6-B17 (Actividades (los temas)), CH6-B17 (Actividades (los temas), la renovación de A en vuelo), CH6-A21 (Actividades) | igual |
| D4 | `clave` del aviso de la página en `muro-view.tsx`, por una constante | `features/clases/muro-view.tsx` | `claseId` → `"constante"` | CH6-B18 (a) (Avisos) | igual |
| E1 | `huella` de las dependencias de `useMarcarViejaSiQuedoEnError` | `components/seccion/hooks.ts` | `huella` de `[queryClient, huella]` | CH6-B02 (b) (CH6-B18 (b) no cae: es regresión de la librería, como dice el plan) | igual |
| E2 | la limpieza de `useMarcarViejaSiQuedoEnError` | ídem | el `return () => …` | CH6-B02 (a) y (b) | igual |
| E3 | (3b) `useListaConservadaTrasLaPagina` devuelve solo `ahora` | `features/clases/hooks.ts` | `\|\| (isError && marca === actual)` | CH6-B10 (Avisos: pulsar, volver, invalidación por comentar), CH6-B16 (f) (Avisos y Dudas), CH6-B18 (a) (Avisos y Dudas), CH6-B18 (e) | igual |
| E4 | (3b) la marca sin la clave | ídem | `` `${clave}:` `` de `actual` | CH6-B18 (e), CH6-B16 (c) (Avisos, N-05) | igual |
| E5 | (3b) primer argumento de `useFocoAlPasarAError` en `muro-view.tsx` de vuelta a `isError` | `features/clases/muro-view.tsx` | `&& !conserva` | CH6-B10 (Avisos, foco en una fila). Sin redundancia | igual |
| E6 | (Enmienda 3) condición de red o `5xx` de `conservaLaListaTrasLaPagina`, de vuelta a "todo salvo cursor, acceso y redirección" | `features/clases/lib.ts` | el cuerpo | CH6-B11 (Avisos y comentarios: 400 VALIDACION de otro campo, 429; comentarios: 404), CH6-B13 («Ver más comentarios») | igual |
| M19 | el bloque de la clave de `useRenovarSiLaPublicacionYaNoEsta` | `features/clases/hooks.ts` | el `if (clavePrevia.current !== clave) {…}` | CH6-B18 (c) | igual |

Redundancias declaradas (no son PA-7), cada una con su mecanismo:
- `isFetching` sola (M02 y M03): `cancelRefetch: false` une la llamada.
- CH6-B01 (f) dentro de M04: sin datos, la librería no cancela.
- `useMarcarViejaSiQuedoEnError` en la vista (M05): la acción `error` invalida.
- C4 y D2 caen solo con un caso añadido: el que retiene la barra y la variante de N-01. Ninguna queda sin caso que la vigile.

Comprobación final del árbol: `git status --short frontend` muestra 40 archivos, los mismos que antes de las mutaciones.

### Hermanos por mecanismo

**§D-4 · M-3, pulsar la sección** (`rg "useAlPulsarLaSeccionActiva\(" src -g '!*.test.*'`, 16 llamadas en `023b450`):

| Sitio | ¿Aplica PR-1? | ¿Se aplicó? |
|---|---|---|
| `muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx` (cada bloque), `trabajo-view.tsx`, `components/seccion-de-recursos.tsx`, `components/seccion-de-tema.tsx`, `components/respuestas-de-duda.tsx` (las siete de H-2) | Sí | Sí: `useRecargarAlPulsarLaSeccion` y `useMarcarViejaSiQuedoEnError`. Las respuestas solo con `pedir` |
| `components/comentarios-de-publicacion.tsx`, `personas-view.tsx` (`PersonasDeLaClase`), `components/tabla-alumnos.tsx`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx` (no tenían gancho) | Sí | Sí, los mismos dos ganchos |
| `clases-admin-view.tsx` (`useRecuperarListaDeClasesAdmin`) y `components/lista-de-clases-anteriores.tsx` (`useRecuperarListaDeClasesAnteriores`) | Solo el hermano de T-07 (variante registrada) | Sí: la guarda de `fetchStatus` en los dos ganchos (C1 la vigila en el admin; CH6-B09 cubre los tres caminos) |
| `features/admin` (5 vistas: `useVolverAPedirSiFallo`) y `registrados-del-enlace.tsx` | No (variante registrada; ya cumple T-07) | — (solo reexporta el gancho movido) |
| `gradebook-view.tsx` y `mis-calificaciones-view.tsx` | No (variante T-08). El gradebook suma solo la marca N-52 de §D-6 | §D-6, aplicado |
| `components/seccion/hooks.ts` (`useAlPulsarLaSeccionActiva`) | Es la base | Sin cambio |

**§D-5 · M-4, la página siguiente** (`rg "fetchNextPage\(" src -g '!*.test.*'`, 20 llamadas):

| Sitio | ¿Aplica? | ¿Se aplicó? |
|---|---|---|
| Las 9 listas: Avisos, comentarios, Dudas, respuestas, el tema de Actividades (`ElementosDelTema`), Personas, el roster y los dos inicios | Sí | Sí: `useListaConservadaTrasLaPagina`, el error primero con `&& !conserva`, `useAvisoDeRecargaFallida` con su clave; en los inicios, `errorALaVista` en el panel y en el bloque destacado; en Personas, `cargada`; en las respuestas, las dos condiciones de `pedir` y de solo lectura (la del foco a la vecina no cambia) |
| `seccion-de-recursos.tsx` | Ya conservaba (y también ante una recarga) | Solo PR-1 |
| `features/tareas` (`entregas-view.tsx`, `hilo-privado.tsx`), `mis-calificaciones-view.tsx` | Ya conservan | No entra |
| `features/admin`, `/admin/clases` y "Clases anteriores" | No entra (DH-02 a, solo `features/clases`) | — |
| El hermano de T-02 de CLASES-03e | Comentarios de publicación y de recurso (el mismo componente) | `useRenovarSiLaPublicacionYaNoEsta`, que invalida Avisos y Recursos. `useRenovarSiLaDudaYaNoEsta` no se toca ("No se toca") |

**§D-6:**
- N-52: el gradebook es el único sitio con la frase "La clase cambió…" que sirve ventanas desde la caché. "Mis calificaciones" usa páginas con cursor y no tiene ventanas, así que no le aplica.
- La fila 361: `useClaseArchivadaEnSuLista` vive en `ClaseLayout` y en `ClaseAnteriorView`, las dos con el mismo gancho. Las listas de la sesión cuelgan de `CLAVE_CLASES_INSCRITAS` y `CLAVE_CLASES_IMPARTIDAS`: la barra y los inicios.

### Inventario de M-5 contrastado con el código, gancho por gancho
| Lugar | Memoria | Clave que la protege | ¿Aplica? ¿Se aplicó? |
|---|---|---|---|
| `MuroDeLaClase`, `DudasDeLaClase` (sobreviven al cambio de clase) | `useListaConservadaTrasLaPagina` (estado `marca`) | `claseId` dentro de la marca | Sí y sí (E4, N-05) |
| ídem | `useAvisoDeRecargaFallida` del fallo de la página | `claseId` | Sí y sí (D4, CH6-B18 (a)) |
| ídem | `useMarcarViejaSiQuedoEnError` | `huella` de la clave | Sí y sí (E1) |
| ídem | `useRecargarAlPulsarLaSeccion` | sin memoria: lee las consultas del render | No aplica |
| ídem | `clasePrevia`, `idsPrevios`, `filaEnFocoRef`, `useFocoAlPasarAError`, `useFocoAlCargarMas` y la línea de H-R2 | de 06a | Sin cambio. `useFocoAlPasarAError` recibe ahora `isError && !conserva` (E5) |
| `BloqueDeRecursos`, `TrabajoDeLaClase` (sobreviven) | `useAvisoDeRecargaFallida` | `claseId`, de 06a | Sin cambio (D3) |
| ídem | `useMarcarViejaSiQuedoEnError` | `huella` | Sí y sí |
| `ElementosDelTema` (`key` con `claseId`) | marca, aviso de la página y `useMarcarViejaSiQuedoEnError` | `claseId`. Segunda red, porque la `key` monta de nuevo | Sí y sí |
| `SeccionDeRecursos` (`key` con `claseId`) | `useMarcarViejaSiQuedoEnError` | `huella` | Sí y sí. El aviso conserva su clave de 06a |
| `ComentariosDePublicacion` (vive en la fila) | marca y aviso | `publicacionId`. Segunda red | Sí y sí |
| ídem | `useRenovarSiLaPublicacionYaNoEsta` (`fallosVistos`, `clavePrevia`) | `` `${claseId}:${publicacionId}` `` | Sí y sí (M19, CH6-B18 (c)) |
| `RespuestasDeDuda` (vive en la fila) | marca y aviso | `dudaId`. Segunda red | Sí y sí |
| ídem | `useRenovarSiLaDudaYaNoEsta` | sin clave | "No se toca", como dice el plan |
| `PersonasDeLaClase` y `TablaAlumnos` (`key={claseId}` desde 06a) | marca, aviso y `useMarcarViejaSiQuedoEnError` | `claseId`. Segunda red | Sí y sí |
| Los inicios (la ruta no tiene id) | marca y aviso | `JSON.stringify(CLAVE_CLASES_…)`, constante | Sí y sí |
| `GradebookDeLaClase` (`key={claseId}`) | `fraseSinMarcarRef`, `fraseMarcadaRef` y la limpieza que marca | la `key`; la limpieza marca el `claseId` de su cierre | Sí y sí (G2, G4 a G6, CH6-B14 (d) y (h)) |
| `features/clases/hooks.ts`, memoria de módulo | `limiteDeTrabajo`, `limiteDeRecursos` | cada lectura lleva su clase en su cierre y su `signal` | Sin cambio |
| `useClaseArchivadaEnSuLista` | sin refs; el efecto corre por `[queryClient, claseId, archivada]` | el `predicate` decide por clase | Sí y sí (C2, C3) |
| Contextos | `ContextoDeSoloLectura` (de `ClaseLayout`) | clase actual | Sin cambio |
| Suscripciones de la caché | `useDetalleViejoAnteClaseArchivada` ("No se toca") | — | Sin cambio |

### Estados vecinos de DH-10 (el salto del historial en las cuatro listas que sobreviven)
| Estado | Caso | Resultado |
|---|---|---|
| B sana y fresca | CH6-B16 (a) | 0 peticiones |
| B vieja | CH6-B16 (b) y el foco (b) | 1 petición; el foco va al h2 o se queda en el control segmentado |
| B en error, falló a la vista | CH6-B16 (c) "a la vista" y el foco (c) | 1 petición (la del observador), desde la primera página |
| B en error, falló fuera de la vista | CH6-B16 (c) "fuera", el foco (c), CH6-B17 | 1 petición. Recursos y Actividades avisan una vez si la renovación falla; Avisos y Dudas siguen con su MensajeError |
| B con la lista conservada | CH6-B16 (f) y N-05 (negativo) | 1 petición; la lista se ve con «Ver más» en espera y el foco no se mueve. Con la marca de A, B sí muestra su error |
| B pidiendo | CH6-B16 (e) | 0 peticiones más; la retenida se aplica |
| A en vuelo al saltar | CH6-B17 «la renovación de A en vuelo» | ni aviso ni mensaje en B; al volver a A, una petición y ningún aviso |
| Ida y vuelta A → B → A | CH6-B18 (a), CH6-A21, CH6-B15 (salto y maestro con el inicio en caché) | ningún aviso repetido; un fallo nuevo avisa una vez |
| Foco en «Ver más» de A | las cuatro N-01 de CH6-B16 | se queda en el botón de B; si desaparece, va al h2 o a la primera fila nueva, nunca a una fila de A |
| `StrictMode` | Sin caso nuevo en 06b. `useListaConservadaTrasLaPagina` da la misma marca en el doble render; `useRecargarAlPulsarLaSeccion` no tiene memoria; la limpieza del gradebook marca una vez de más sin pedir nada (riesgo declarado, Enmienda 4b). 06a lo cubre en CH6-A13 (d) | No verificado con un caso de 06b |
| Un fallo en el render del salto | Decisión de 06a: no se avisa. Lo da la clave del aviso, que empieza de cero con la consulta de B (D3, D4) | Sin caso nuevo |

### Estados vecinos de las dos refs del gradebook
| Estado | Qué hace | Caso |
|---|---|---|
| Primera carga, tabla sana | `fraseSinMarcarRef` en `null`; pulsar no marca | CAL-1D03e (G3) |
| Primera carga con el `400` | Se enciende; la pulsación la marca y la apaga | CAL-1D03d (las filas del `400`), C-20 |
| Frase vista en W | Se enciende con `vacia:<dataUpdatedAt>` | CH6-B14 (a), (b) y (d) |
| Otra ventana («Alumnos anteriores») | No se apaga | CH6-B14 (f), (g) y (h) (G4) |
| Marcada (pulsar) | Pasa a `fraseMarcadaRef` y se apaga; la pulsación siguiente, con la tabla sana, no marca | CH6-B14 (f), C-20 (G5) |
| La misma ocurrencia vista otra vez (W de la caché mientras se vuelve a pedir) | No se vuelve a encender | CH6-B14 (f) (G6) |
| Frase nueva (otra respuesta u otro fallo) | Se enciende de nuevo: otra ocurrencia | CAL-1D03d, por las cifras |
| Desmontaje | La limpieza marca si la frase quedó encendida | CH6-B14 (b) y (g), C-19 (G2) |
| Salto de clase | La `key` monta de nuevo; la limpieza de A marca A y no toca B | CH6-B14 (d) y (h) |
| `StrictMode` | La limpieza simulada marca a lo más una vez de más, sin pedir nada | Sin caso (riesgo declarado en el plan) |

### Matriz de avisos y recargas de §D-7 (06b)
"Listas" son las 12 de §D-4; "las 9", las de §D-5. "Un aviso" es `toast.error` con `mensajeDeConsultaClases(error)`, salvo en Recursos y Actividades (temas), que usan su «No pudimos actualizar…». La columna "Caso" nombra los que lo fijan.

| Disparador | Clase de respuesta | Qué se pide | Qué se anuncia | Qué se ve | Foco | En vuelo a la vez | Con la vista desmontada | Caso |
|---|---|---|---|---|---|---|---|---|
| Pulsar la sección, sana y fresca | — | nada | nada | la lista | no se mueve | — | — | CH6-B01 (a), CH6-B16 (a) |
| Pulsar, sana y vieja | éxito | 1, desde la primera página | nada | la lista renovada | no se mueve | si ya vuela, ninguna más | — | CH6-B01 (b) y (c), CH6-B08 |
| Pulsar, en error sin datos | éxito / 5xx | 1 | nada / nada (la frase sigue) | la frase, y después la lista | no se mueve | ninguna más (B07, B01 (g)) | al volver se pide 1 (B04) | CH6-B03, CH6-B04 |
| Pulsar, en error con datos (recarga fallida) | éxito | 1 | nada | Avisos, Dudas, Personas, el roster y los inicios: la frase hasta responder. Recursos y Actividades: la lista | no se mueve | ninguna más, sin cancelar (B07, B16 (e)) | al volver, 1 (B04) | CH6-B04, CH6-B07 |
| Pulsar, lista conservada tras «Ver más» | éxito / 5xx | 1 | nada / nada | la lista con «Ver más» en espera, sin `role="alert"`; si la recuperación falla, el MensajeError | se queda en «Ver más»; si se reemplaza, al encabezado | — | — | CH6-B10 (pulsar y la recuperación falla) |
| Volver de otra sección antes de 30 s | éxito / 5xx | 1 (la consulta está inválida) | nada | la conservada mientras vuela (B10 volver); en las demás, la frase hasta responder | donde lo deja el montaje | — | si la recarga falló desmontada: 1 al volver, sin aviso (B04 (c′)) | CH6-B04, CH6-B10 (volver), CH6-B12 (c) y (d) |
| Atrás y adelante a otra entrada de la misma ruta | éxito | 1 | nada | la lista | no se mueve | — | — | CH6-B05 |
| «Ver más» | 5xx o red | la página 2 veces (`retry: 1`) | un aviso | la lista y «Ver más» a la vista, fuera de espera | se queda en «Ver más» | con una recarga que gana: ningún aviso (B12 (b)) | sin aviso; al volver, 1 desde la primera página (en Actividades, con `signal`, se aborta y no se pide) | CH6-B10, CH6-B12 |
| «Ver más» | 400 del cursor | 2 | nada | la frase "…Vuelve a abrir…" (en Personas y el roster, el texto fijo del lugar) | al encabezado (`useFocoAlCargarMas`) | — | — | CH6-B11, CH6-B03 (cursor) |
| «Ver más» | 403 SIN_ACCESO_A_LA_CLASE, 400 de otro campo, 429 | 2 | nada | el error reemplaza la lista | al encabezado | — | — | CH6-B11 |
| «Ver más» | 401 sin refresco | 2 | nada; `irA("/login")` | no se afirma (O-r1-6) | — | — | — | CH6-B11 (401) |
| «Ver más comentarios» o abrir | 404 PUBLICACION_NO_ENCONTRADA | 2 y una renovación de Avisos o Recursos por fallo | nada | «Esa publicación ya no existe.» en el bloque, hasta que la fila sale | si estaba en el bloque, al «Borrar publicación» de la vecina | — | — | CH6-B13, CH6-B18 (c) y (d) |
| «Ver más respuestas» | 404 DUDA_NO_ENCONTRADA | 2 | nada | «Esa duda ya no existe.» | — | — | — | CH6-B11 |
| Dos fallos seguidos de «Ver más» | 5xx | 2 + 2 | dos avisos | la lista sigue | en «Ver más» | — | — | CH6-B12 (a) |
| Dos clics en «Ver más» tras el fallo | — | 1 página | — | — | — | — | — | CH6-B12 (e) |
| Invalidación por comentar (Avisos conservada) | éxito | 1 | nada | la lista en espera, sin `role="alert"` | no se mueve | — | — | CH6-B10 (invalidación) |
| Invalidación que falla con el foco en una fila conservada | 503 | 2 | nada | el MensajeError | al h2 | — | — | CH6-B10 (foco en una fila), E5 |
| Salto del historial a B (las 4 que sobreviven) | según el estado de B | 0 o 1, ver "Estados vecinos de DH-10" | solo de B: Recursos y Actividades, un aviso si la renovación falla | lo de B | el de 06a; la respuesta no lo mueve | la renovación de A que falla en B: nada en B | — | CH6-B16, CH6-B17, CH6-B18 |
| Pulsar «Calificaciones», tabla sana | éxito | la primera ventana, 1 | nada | la tabla | queda en la sección | 2 pulsaciones: 1 petición | — | CAL-1D03e (0 marcas) |
| Pulsar «Calificaciones», con la frase vista y sin marcar (también después de otra ventana) | éxito | la primera ventana, 1; todas las ventanas quedan viejas (1 marca) | nada | la clase sin la frase; «Alumnos siguientes» pide W | queda en la sección | la pulsación siguiente no marca | — | CAL-1D03d, CH6-B14 (a) y (f), C-20 |
| Salir del gradebook con la frase vista y sin marcar | — | nada; 1 marca al desmontar | nada | al volver, W se pide | — | — | sí, es el caso | CH6-B14 (b), (d), (g) y (h), C-19 |
| Leer una clase archivada, el alumno (dos efectos) | — | la barra 1 vez (con `cancelRefetch: false` si vuela); el inicio, 1 al montarse | nada | la barra y el inicio sin la clase | — | la segunda corrida se une a la barra en vuelo | el inicio queda inválido sin pedirse | CH6-B15 (alumno), (alumno, la barra en vuelo) |
| Leer una clase archivada, el maestro con el inicio en caché, A → B → A | — | la barra 1 vez en total; el inicio 0 hasta montarse, después 1 | nada | ídem | — | — | ídem | CH6-B15 (maestro con el inicio en caché), (salto) |
| Leer una clase archivada, el admin o el maestro desde «Clases archivadas» | — | nada | nada | — | — | — | — | CH6-B15 (admin y maestro desde «Clases archivadas») |

### Frases de recuperación: el caso de cada camino
| Frase | Pulsar la sección | Otra sección y regreso | Repetir el control | Atrás y adelante | Salto de clase |
|---|---|---|---|---|---|
| El texto de la consulta (500 o red) en las 12 listas | CH6-B03 (primera carga) | CH6-B04 (sin datos y con datos) | CH6-B06 (comentarios y respuestas); «Ver más»: CH6-B10 | CH6-B05 (Avisos, Dudas, inicio) | CH6-B16 (c), en las 4 que sobreviven |
| "…Vuelve a abrir…" (el 400 del cursor) en las 10 paginadas | CH6-B03 (el 400 del cursor) | CH6-B04 (con datos, para la consulta en error) y los existentes de `recuperar-ch3.test.tsx` y `consultas-ch3.test.tsx` | cerrar y abrir: CH6-B06 | CH6-B05 | CH6-B18 (b) |
| El texto fijo del lugar (Personas y el roster) | CH6-B03 | CH6-B04 | «Ver más alumnos»: CH6-B10 | — | no aplica (se monta de nuevo por `key`) |
| El aviso de «Ver más» ("Inténtalo de nuevo") | CH6-B10 (pulsar) | CH6-B10 (volver) | CH6-B10 (repetir) | — | CH6-B16 (f) y CH6-B18 (a) |
| «No pudimos actualizar…» (Recursos y Actividades) | CH6-B03, CH6-B07 | CH6-B04 (con datos) | — | — | CH6-B17 |
| "Vuelve a abrir Calificaciones" | CH6-B14 (a) y (f), CAL-1D03d | CH6-B14 (b) y (g) | — | — | CH6-B14 (d) y (h) |
| Recursos y Dudas ya tenían sus casos de camino (`recursos-caminos-03d.test.tsx`, `dudas-caminos-03e.test.tsx`), que siguen en verde | | | | | |

### Paso 19 · Verificación (desde `frontend/`, una suite a la vez)
- `npm run lint`: la salida termina en `> tsc -b`, sin errores. Antes, `All matched files use Prettier code style!`.
- `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` → `Test Files  240 passed (240)` y `Tests  5367 passed (5367)`. Sin fallas. Es la suite de "Regresión" completa, corrida otra vez después de todas las mutaciones y de corregir el reloj.
- `npm run build` → `✓ built in 804ms`.
- Condicionales: **ninguna cayó**. C-10 (`app/muro-recuperar-c-r4.ataque.test.tsx`), C-14 (`app/estado-por-id-ch6a-r3.ataque.test.tsx`) y PR-C18 (`features/clases/muro-view.test.tsx`) siguen en verde sin tocarse.

### Conteos
- Ejecuté `npx vitest list src/components/seccion/recargas-ch6.test.tsx src/features/clases/recargas-ch6.test.tsx src/features/clases/ver-mas-ch6.test.tsx src/features/calificaciones/gradebook-ch6.test.tsx` y conté con `grep -a -c`: **294 casos**.
  - Por archivo: 12, 133, 142 y 7.
  - Antes eran 288. Los 6 nuevos son CH6-B14 (f), (g) y (h); CH6-B15 (maestro con el inicio en caché) y (alumno, la barra en vuelo); y la variante N-01 de CH6-B16.
- Archivos tocados en `frontend/`: **40**, los de la Enmienda 4 (`git status --short frontend`).
  - Producción (19):
    - `components/seccion/hooks.ts` y `components/seccion/types.ts` (nuevo);
    - `features/admin/hooks.ts`;
    - `features/calificaciones/hooks.ts` y `features/calificaciones/gradebook-view.tsx`;
    - en `features/clases/`: `hooks.ts`, `lib.ts`, `muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `personas-view.tsx`, `inicio-estudiante-view.tsx` e `inicio-maestro-view.tsx`;
    - en `features/clases/components/`: `seccion-de-recursos.tsx`, `seccion-de-tema.tsx`, `respuestas-de-duda.tsx`, `comentarios-de-publicacion.tsx` y `tabla-alumnos.tsx`.
  - Pruebas nuevas (4): `components/seccion/recargas-ch6.test.tsx`, `features/clases/recargas-ch6.test.tsx`, `features/clases/ver-mas-ch6.test.tsx` y `features/calificaciones/gradebook-ch6.test.tsx`.
  - Lista cerrada (4): `features/clases/ver-mas-y-orden-ch4.test.tsx`, `features/clases/personas-view.test.tsx`, `features/clases/publicacion-del-muro.test.tsx` y `features/calificaciones/gradebook-01d.test.tsx` (R-1).
  - `*.ataque` del tester (13), que no toqué:
    - `features/calificaciones/gradebook-01d-r3.ataque.test.tsx` (C-8 y C-19);
    - `features/calificaciones/secciones-01d-r4.ataque.test.tsx` (C-20);
    - en `features/clases/`: `alumnos-b-r4`, `alumnos-b-r5`, `foco-02c-r3`, `foco-pestana-02d-r3`, `inicio-sin-datos-02c-r1`, `inicio-sin-datos-r2`, `muro-c-r1`, `muro-c-r3`, `ordenar-03c2-r2` y `ver-mas-y-orden-ch4-r1`;
    - `lib/guardas-ch4-r1.ataque.test.ts`.

### Lo que no pude verificar o quedó fuera
- No hay caso nuevo con `StrictMode` en 06b: los ganchos nuevos se razonaron (ver "Estados vecinos") y el plan no lo pide como caso. CH6-A13 (d) de 06a sigue en verde.
- Que la barra pueda quedarse un momento con una clase recién archivada si su petición salió antes del archivo (R-12) es un riesgo aceptado en el plan. No tiene caso.

## Corrección tras la verificación del manager — CHORE-06b: M-01 y M-02 (2026-11-12)


Programador. Respondo a `revision.md`, "## Verificación del resumen del programador — CHORE-06b (2026-11-12)". Equipo conectado a la corriente. Comandos desde `frontend/`, una suite a la vez. **No cambió nada en producción**, salvo el comentario de `useMarcarViejasLasVentanas` (detalle 1), que no cambia código. Ningún caso nuevo salió rojo contra el código de hoy.

### M-01 · Corregido: la frase del `400` del cursor, caso por camino
Todos los casos están en `src/features/clases/recargas-ch6.test.tsx`, con el router real y las `defaultOptions` de `app/providers.tsx`. Arman el `400` del cursor (`cursorVencido`) sobre páginas ya cargadas, con la frase a la vista antes del camino. Después del camino, cada uno afirma lo mismo (`cumpleLaFraseDelCursor`):
- una sola petición nueva de la lista, la de la primera página, sin `cursor`;
- la frase ya no está;
- ningún aviso.

La frase de cada lista sale de `FRASE_DEL_CURSOR`: los `cambioMientras…` de `data.ts`; en Personas y el roster, el texto fijo del lugar (`mensajeDeConsultaClases` del `VALIDACION`).
- **(a) Otra sección y regreso, en las 10 paginadas:** «CH6-B04 (%s, el 400 del cursor): con la frase del cursor a la vista y páginas cargadas, ir a otra sección y volver antes de 30 s pide la lista una vez desde la primera página, sin el cursor vencido, y la frase desaparece sin aviso». Son 10 filas: Avisos, comentarios, Dudas, respuestas, Actividades (un tema), Recursos (un tema), Personas, el roster, inicio del estudiante e inicio del maestro.
- **(b) Cerrar y abrir:** «CH6-B06 (%s, el 400 del cursor): con «Vuelve a abrirlos» o «Vuelve a abrirlas» a la vista, cerrar y volver a abrir el bloque pide la lista una vez desde la primera página, sin el cursor vencido, y la frase desaparece sin aviso» (comentarios y respuestas). Además comprueba que la frase a la vista es la de `TEXTOS_COMENTARIOS.cambioMientrasLosVeias` o `TEXTOS_RESPUESTAS.cambioMientrasLasVeias` (`/Vuelve a abrirl[oa]s/`).
- **(c) Atrás:** «CH6-B05 (%s, el 400 del cursor): tras pulsar dos veces la sección, el 400 del cursor pinta la frase; ir atrás (otra location.key en la misma ruta) pide la lista una vez desde la primera página y la frase desaparece sin aviso» (Avisos, Dudas e inicio del estudiante).
- **(d) Salto de clase:** «CH6-B16 (%s, el 400 del cursor en B): B con la frase del cursor (páginas cargadas) y el salto a B: se pide una vez desde la primera página, sin el cursor vencido, y la frase desaparece sin aviso» (Avisos y Dudas).
- Corrida contra el código de hoy: `npx vitest run src/features/clases/recargas-ch6.test.tsx -t "el 400 del cursor|Corrección|recarga fallida y la nueva petición retenida|comentarios de un recurso"` → `Tests  44 passed | 122 skipped (166)`. Los 44 incluyen los 10 casos que ya existían de CH6-B03 con el cursor y CH6-B18 (b).
- **Reemplazo declarado** de la viñeta de CH6-B06 en "Pruebas requeridas → caso" del resumen anterior: CH6-B06 queda cubierto por el caso del `400` de arriba, que es la frase que nombra el plan. «CH6-B06 (%s): con la primera carga fallida…» (`500`, texto genérico) se queda como caso del texto de la consulta.

### M-02 · Corregido: CH6-B16 (f) con sus tres variantes de foco
En el mismo archivo, describe «Corrección M-01 (d) y M-02 · …». B queda en el estado (f): su lista se conservó tras un «Ver más» fallido (`500`). Se salta a A, se pone el foco y se regresa a B con el historial, con la renovación de B retenida.
- «CH6-B16 (f) (%s, foco en una fila de A): con B conservada, tras el salto el foco está en el h2 de la lista de B, mientras vuela la renovación y después de la respuesta; nunca en <body> ni en una fila de A» (Avisos y Dudas). Mientras vuela, la lista de B sigue a la vista y no hay `role="alert"`.
- «CH6-B16 (f) (Avisos, foco en «Ver más avisos» de A): con B conservada, tras el salto el foco está en «Ver más avisos» de B, en espera mientras vuela la renovación, y ahí sigue después de la respuesta».
- La variante del control segmentado ya estaba: «CH6-B16 (f) (%s): B con su lista conservada…».

### N-01 · Atendido
- **El foco donde lo dejó el montaje.** En `ver-mas-ch6.test.tsx`, «CH6-B10 (%s, volver de otra sección)…» (9 filas) guarda `document.activeElement` mientras la recarga está retenida, comprueba que no es nulo y que, tras la respuesta, el foco sigue en el mismo elemento. El título no cambió.
- **La recarga fallida al volver.** Caso nuevo en `recargas-ch6.test.tsx`, en las 12 listas: «CH6-B04 (%s, recarga fallida y la nueva petición retenida al volver): mientras vuela la petición del montaje sigue lo de antes (el MensajeError en las listas que reemplaza una recarga; la lista en las que la conservan), sin aviso nuevo; al responder bien, la lista sin frase».
  - Las 9 listas que reemplazan muestran el `MensajeError` mientras vuela: DH-02 (a), "como hoy".
  - Las 3 que conservan la recarga (los temas de Recursos y de Actividades, y Recursos (un tema)) muestran la lista sin `role="alert"`.

### N-02 · Atendido
Caso nuevo en `recargas-ch6.test.tsx`: «CH6-B03 (comentarios de un recurso, pulsando «Recursos»): con la primera carga de los comentarios fallida, pulsar «Recursos» estando ahí los pide una vez y la frase desaparece».
- Para armarlo, el doble del servidor de ese archivo da 3 comentarios al recurso 1 (`comentarios: n === 1 ? 3 : 0`, como en `ver-mas-ch6.test.tsx`).
- Ningún caso anterior dependía de que fueran 0: la suite completa sigue en verde.

### Detalles
1. **El comentario de `useMarcarViejasLasVentanas`** (`features/calificaciones/hooks.ts`) ahora dice la condición de la Enmienda 4b: la frase se vio en esa vista y todavía no se marcó, aunque ya se haya regresado a otra ventana. Solo cambió el comentario.
2. **La fila de la matriz "Pulsar, en error con datos (recarga fallida)".** Reemplazo declarado de lo que decía el resumen anterior:
   - **Qué se ve:** en Avisos, comentarios, Dudas, respuestas, Actividades (un tema), Personas, el roster y los inicios, la frase hasta que responde. En los temas de Recursos y de Actividades y en Recursos (un tema), la lista, que se conserva con su aviso «No pudimos actualizar…» o el de Recursos.
   - "Actividades (un tema)" reemplaza la lista, como bien señaló el manager.
   - Lo fija el caso nuevo de N-01 (`conservaLaRecarga`).
3. **CH6-B13 («Ver más comentarios»)** cuenta ahora un solo mensaje («Esa publicación ya no existe.») justo después de que aparece y otra vez tras la renovación.
4. **`personas-view.test.tsx`:** el `mockRestore()` del espía va en un `finally`. El cuerpo del caso no cambió y sigue dentro de la lista cerrada.

### Tabla de frases de recuperación, corregida (reemplazo declarado de la del resumen anterior)
Un caso por camino. "(R)" es `recargas-ch6.test.tsx`, "(V)" es `ver-mas-ch6.test.tsx` y "(G)" es `gradebook-ch6.test.tsx`; el título empieza como se cita. `—` quiere decir que la interfaz no ofrece ese camino para esa frase.

| Frase | Pulsar la sección | Otra sección y regreso | Repetir el control | Atrás y adelante | Salto de clase |
|---|---|---|---|---|---|
| "…Vuelve a abrir…", "Vuelve a abrirlos", "Vuelve a abrirlas", "Vuelve a entrar…" (el `400` del cursor, en las 10 paginadas) | (R) «CH6-B03 (%s, el 400 del cursor)…» | (R) «CH6-B04 (%s, el 400 del cursor)…» | comentarios y respuestas: (R) «CH6-B06 (%s, el 400 del cursor)…». En las demás, el «Ver más» desaparece con la frase | (R) «CH6-B05 (%s, el 400 del cursor)…» (Avisos, Dudas, inicio del estudiante) | (R) «CH6-B16 (%s, el 400 del cursor en B)…» (Avisos y Dudas). Las demás se montan de nuevo por `key` (lo cubre el regreso) |
| El texto de la consulta ante un `500` o la red, en las 12 | (R) «CH6-B03 (%s, primera carga fallida)…» | (R) «CH6-B04 (%s, sin datos)…» y «CH6-B04 (%s, con datos y una recarga fallida)…» | (R) «CH6-B06 (%s): con la primera carga fallida…» | (R) «CH6-B05 (%s): tras pulsar dos veces…» | (R) «CH6-B16 (c) (%s, falló estando a la vista)…» y «…falló fuera de la vista…» |
| El texto fijo del lugar (Personas y el roster) | (R) «CH6-B03 (Personas \| el roster, …)» | (R) «CH6-B04 (Personas \| el roster, …)» | «Ver más alumnos»: (V) «CH6-B10 (Personas \| el roster, …)» | — | — (se monta de nuevo por `key`) |
| El aviso de «Ver más» ("Inténtalo de nuevo"), en las 9 | (V) «CH6-B10 (%s, pulsar la sección)…» | (V) «CH6-B10 (%s, volver de otra sección)…» | (V) «CH6-B10 (%s, %s): salen las dos peticiones…» (el «repetir») | — | (R) «CH6-B16 (f) (%s)…» y «CH6-B18 (a) (%s)…» |
| «No pudimos actualizar…» (Recursos y Actividades) | (R) «CH6-B03 (Recursos \| Actividades …, primera carga fallida)…» y CH6-B07 | (R) «CH6-B04 (… con datos y una recarga fallida)» y «… recarga fallida y la nueva petición retenida al volver» | — | — | (R) «CH6-B17 (%s): B falló fuera de la vista…» |
| Comentarios de un recurso | (R) «CH6-B03 (comentarios de un recurso, pulsando «Recursos»)…» | — | — | — | — |
| "Vuelve a abrir Calificaciones" | (G) «CH6-B14 (a)…», «CH6-B14 (f)…»; `gradebook-01d.test.tsx` CAL-1D03d | (G) «CH6-B14 (b)…», «CH6-B14 (g)…» | — | — | (G) «CH6-B14 (d)…», «CH6-B14 (h)…» |

Cambian respecto del resumen anterior: la fila del cursor, que antes citaba CH6-B04 "con datos", B18 (b) y `recuperar-ch3.test.tsx`/`consultas-ch3.test.tsx`, archivos que no recorren esos caminos con el `400`; y la fila de los comentarios de un recurso, que es nueva.

### Mutaciones de esta ronda
Archivo real y restauración desde una copia, comparada byte a byte (`scratchpad/mutar.py`; K14, con `cp` y `cmp` de dos archivos). Las 14 dieron "igual".

| Id | Familia que vigila | Archivo | Qué quité | Cayó |
|---|---|---|---|---|
| K1 | M-01 (c), Avisos | `features/clases/muro-view.tsx` | `useRecargarAlPulsarLaSeccion(publicaciones)` | «CH6-B05 (Avisos, el 400 del cursor)…» |
| K2 | M-01 (c), Dudas | `features/clases/dudas-view.tsx` | `useRecargarAlPulsarLaSeccion(dudas)` | «CH6-B05 (Dudas, el 400 del cursor)…» |
| K3 | M-01 (c), inicio | `features/clases/inicio-estudiante-view.tsx` | `useRecargarAlPulsarLaSeccion(clases)` | «CH6-B05 (inicio del estudiante, el 400 del cursor)…» |
| K4 | M-01 (d), Dudas | `features/clases/dudas-view.tsx` | `useRecargarAlPulsarLaSeccion` → la llamada de `023b450` con `refetch()` | «CH6-B16 (Dudas, el 400 del cursor en B)…» (dos peticiones) |
| K5 | M-01 (d), Avisos | `features/clases/muro-view.tsx` | lo mismo | «CH6-B16 (Avisos, el 400 del cursor en B)…» |
| K6 | M-01 (a) | `features/clases/muro-view.tsx` | `useMarcarViejaSiQuedoEnError(clavePublicaciones(claseId))` | Nada. **Redundancia declarada** |
| K7 | M-01 (b) | `features/clases/components/comentarios-de-publicacion.tsx` | `useMarcarViejaSiQuedoEnError(claveComentarios(…))` | Nada. **Redundancia declarada** |
| K8 | N-01 (la recarga al volver) | `features/clases/hooks.ts` | `useListaConservadaTrasLaPagina` devuelve `ahora \|\| isError` (conserva ante cualquier error) | Las 9 listas que reemplazan de «CH6-B04 (%s, recarga fallida y la nueva petición retenida al volver)…». Las 3 que conservan pasan, como debe ser |
| K9 | M-02 (las dos variantes nuevas) | ídem | devuelve solo `ahora` | «CH6-B16 (f) (Avisos, foco en una fila de A)…», «… (Dudas, …)» y «CH6-B16 (f) (Avisos, foco en «Ver más avisos» de A)…» |
| K10 | N-02 | `features/clases/components/comentarios-de-publicacion.tsx` | `useRecargarAlPulsarLaSeccion(comentarios)` | «CH6-B03 (comentarios de un recurso, pulsando «Recursos»)…» |
| K11 | M-02, el foco de la fila | `features/clases/muro-view.tsx` | el envío al `h2` de la rama `clasePrevia` (06a) | «CH6-B16 (f) (Avisos, foco en una fila de A)…» |
| K12 | Hermano de M-02: (c) con el foco en «Ver más avisos» | `features/clases/muro-view.tsx` | la línea de H-R2 | Nada: con B en error no hay publicaciones de B pintadas, así que no hay fila nueva a la cual mandar el foco. Redundancia en ese estado |
| K13 | ídem | ídem | `enfocarEncabezado` de `useFocoAlCargarMas` (→ `() => undefined`) | Nada: la defensa de `useFocoAlCargarMas` lleva el foco al primer enfocable de la sección, que es el `h2` |
| K14 | ídem | `muro-view.tsx` y `components/foco/hooks.ts` (temporal; "No se toca", restaurado) | los dos destinos a la vez | «CH6-B16 (c) (Avisos, foco en «Ver más avisos» de A)…» |

**Redundancias declaradas, con su mecanismo:**
- **K6 y K7** (salir y volver, y cerrar y abrir, con el `400` del cursor): sin `useMarcarViejaSiQuedoEnError`, la acción `error` de `@tanstack/query-core` 5.103.2 ya deja la consulta inválida (`query.js:450-462`). Al montarse, el observador la pide, y `infiniteQueryBehavior` vuelve a pedir desde la primera página con las páginas que había (solo la primera, porque la segunda falló), así que el cursor vencido no se repite.
  - En nuestro código no hay otro remedio que quitar para estos dos caminos: el trabajo lo hace la librería.
  - Los casos quedan como garantía de conducta, igual que M05 de la ronda anterior. Si mañana la librería dejara de invalidar, los vigilaría `useMarcarViejaSiQuedoEnError`, con CH6-B02.
- **K12 y K13:** el `h2` de (c) tiene dos caminos, `enfocarEncabezado` y la defensa del gancho de foco. Cada uno solo es redundante con el otro; K14, que quita los dos, hace caer el caso.

### Hermanos de M-01: viñetas que nombran una frase, un código o un estado, y si su caso se arma con eso mismo
- **CH6-B01** (a) a (i): sí, cada caso se arma con el estado que nombra:
  - (b) `invalidateQueries` con `refetchType: "none"`;
  - (c) `setSystemTime` más 31 s;
  - (d) el rechazo sin datos;
  - (e) la página que falla con datos;
  - (f) la petición retenida;
  - (h) `refetchOnMount: false`.
- **CH6-B02** (el error sin `isInvalidated`): sí, `setState`.
- **CH6-B03**, el texto de la consulta (`500`), "…Vuelve a abrir…" (`400`) y el texto fijo del lugar: sí, `500` y `cursorVencido`; ahora también los comentarios de un recurso.
- **CH6-B04**, "con datos (una recarga o una página que falló) y sin datos":
  - la recarga: sí (`503`);
  - la página que falló por la red o un `5xx`: (V) CH6-B10 (volver);
  - la página que falló con el `400`: **faltaba (M-01) y ya está**;
  - sin datos: sí (`500`);
  - (c′), la recarga en vuelo que falla desmontada: sí.
- **CH6-B05**: se armaba con `503`; **suma el `400` del cursor** (M-01).
- **CH6-B06**, "Vuelve a abrirlos" y "Vuelve a abrirlas": se armaba con `500`; **suma el `400`** (M-01).
- **CH6-B07**, "lista en error y la nueva petición retenida": sí, con datos (`503`) y retenida.
- **CH6-B08**, «Subir» con la recarga por sección fallida: sí (`500` ×2 tras el `PUT`).
- **CH6-B09**, la lista en error y la recarga en vuelo: sí, con datos y `refetchQueries` retenido.
- **CH6-B10**, `5xx` y red: sí (`500` y `TypeError`). La invalidación que responde `503`: sí.
- **CH6-B11**: sí, cada código con el suyo (el `400` del cursor, `VALIDACION` de otro campo, `429`, `403 SIN_ACCESO_A_LA_CLASE`, `404 PUBLICACION_NO_ENCONTRADA`, `404 DUDA_NO_ENCONTRADA` y `401` con el refresco rechazado).
- **CH6-B12** (a) a (e): sí. (c) se arma con la página retenida y un `500`.
- **CH6-B13** (`404 PUBLICACION_NO_ENCONTRADA`): sí, al abrir, en «Ver más comentarios» y en un recurso.
- **CH6-B14**, "la frase de la clase cambiada": sí, con la ventana vacía (el escenario de CAL-T-248). El `400` del cursor del gradebook lo cubren CAL-1D03d (sus filas del `400`) y C-20.
- **CH6-B15**, "llega archivada": sí (`archivadaEn`).
- **CH6-B16**:
  - (b), "marcada vieja": sí;
  - (c), "en error": sí (`503`);
  - (e), "pidiendo": sí, retenida;
  - (f), "conservada tras un «Ver más»": sí (`500`);
  - N-05: sí, recarga `503` y página `500` con el mismo contador;
  - el salto con la frase del `400`: **nuevo (M-01 d)**.
- **CH6-B17**, "responde 503": sí.
- **CH6-B18**:
  - (a), la página siguiente falla: sí (`500`);
  - (b), el `400` del cursor: sí;
  - (c), `PUBLICACION_NO_ENCONTRADA`: sí;
  - (d), el `404`: sí;
  - (e), `503` y el `400`: sí.

### Hermanos de M-02: viñetas con variantes, y si cada variante tiene su caso
- **CH6-B01 (i), dos consultas:** sí.
- **CH6-B03, "comentarios (pulsando «Avisos» o «Recursos»)":** faltaba «Recursos» (N-02) y ya está. Las demás variantes (los temas y un tema de Actividades y de Recursos, «Inicio» de la barra) ya estaban.
- **CH6-B04:** "con y sin datos", (c′) en Avisos, Personas y un inicio, la parte M-02 de la lista conservada (V, B10 volver) y la recarga mientras vuela (nuevo, N-01).
- **CH6-B05:** las tres listas, ahora también con el `400`.
- **CH6-B06:** "Ver más" (CH6-B10) y cerrar y abrir, con comentarios y respuestas.
- **CH6-B07:** "en el mismo act y en renders distintos": las dos cosas en cada caso.
- **CH6-B10:**
  - pulsar, volver y la invalidación (Avisos);
  - responde bien o falla;
  - el foco en una fila (Avisos y Dudas);
  - en los inicios, el título del bloque y el panel;
  - "el foco donde estaba", ahora también al volver (N-01).
- **CH6-B12 (c):** las 8 sin `signal` y Actividades.
- **CH6-B13**, "el foco va al «Borrar publicación» de la vecina **o** al `h2`": la vecina tiene caso. **La rama del `h2` (sin vecina) no tiene caso propio en 06b.**
  - Es el mismo efecto de fila del muro, que ya mandaba al `h2` sin vecinas antes de 06b (T-04 de 02c, `muro-view.tsx`, `vecina === undefined`).
  - El plan escribe "o", la alternativa que corresponda, no dos casos. No lo agregué; lo dejo como punto de ataque para el tester.
- **CH6-B14 (a) a (h):** sí; (f) suma "otra pulsación no marca".
- **CH6-B15:** alumno y maestro; admin; maestro desde «Clases archivadas», abierta dos veces; el salto; el maestro con el inicio en caché; y la barra en vuelo.
- **CH6-B16, "Foco, en (b), (c) y (f)", con fila, segmentado y «Ver más avisos»:**
  - (b): las tres. «Ver más avisos» en sus cuatro variantes N-01.
  - (c): fila y segmentado ya estaban; **faltaba «Ver más avisos» y ya está**, con «CH6-B16 (c) (Avisos, foco en «Ver más avisos» de A): B en error fuera de la vista (su MensajeError, sin «Ver más»): tras el salto el foco va al h2 de Avisos, no a una publicación de B ni a <body>, y ahí sigue después de la respuesta». En (c), B pinta su `MensajeError` y no tiene «Ver más», así que lo que pide el plan ("si no, va al `h2`") es el `h2`. Lo vigila K14.
  - (f): segmentado, y fila y «Ver más avisos» **nuevos (M-02)**.
- **CH6-B17:** las tres plantillas ("nada al llegar", "un solo aviso después", "A en vuelo").
- **CH6-B18:** (a) a (e), y (e) con sus cinco afirmaciones.

### Producción
No cambia nada, salvo el comentario de `features/calificaciones/hooks.ts` (detalle 1).

### Verificación (desde `frontend/`, una a la vez)
- `npm run lint` → código de salida 0; la última línea es `> tsc -b`, sin errores.
- `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` → `Test Files  240 passed (240)` y `Tests  5401 passed (5401)`. Es la suite de "Regresión" completa, corrida después del último caso agregado y de todas las mutaciones.
- `npm run build` → `✓ built in 795ms`.
- Las condicionales (C-10, C-14 y PR-C18) siguen en verde sin tocarse.

### Conteos
- `npx vitest list src/components/seccion/recargas-ch6.test.tsx src/features/clases/recargas-ch6.test.tsx src/features/clases/ver-mas-ch6.test.tsx src/features/calificaciones/gradebook-ch6.test.tsx`, contado con `grep -a -c`: **328 casos**, por archivo 12, 167, 142 y 7.
- Antes eran 294. Los **34 casos nuevos** están todos en `features/clases/recargas-ch6.test.tsx`:
  - de M-01: (a) 10, (b) 2, (c) 3 y (d) 2;
  - de M-02: 3 (fila ×2 y «Ver más avisos»);
  - el hermano de M-02 en el estado (c): 1;
  - de N-01: 12;
  - de N-02: 1.
- En `ver-mas-ch6.test.tsx` no hay casos nuevos: CH6-B10 (volver) y CH6-B13 («Ver más comentarios») afirman más que antes.
- Archivos tocados en `frontend/` (`git status --short frontend | wc -l`): **40**, sin cambio.
  - Esta ronda tocó cuatro archivos que ya estaban en la lista: `features/clases/recargas-ch6.test.tsx`, `features/clases/ver-mas-ch6.test.tsx`, `features/clases/personas-view.test.tsx` (lista cerrada) y `features/calificaciones/hooks.ts` (solo el comentario).
  - No toqué ninguna `*.ataque` ni otra prueba normal.

## Corrección de la ronda 1 — CHORE-06b: T-04 y T-05 (2026-11-14)


Programador. Plan vigente: `plan.md`, 1302 líneas, SHA-256 `73861b13…` (Enmienda 5). Pasos K-1 a K-6. Equipo conectado a la corriente. Comandos desde `frontend/`, una suite a la vez. No toqué ninguna `*.ataque` (las 13 de las rondas 0 y 0 bis, y las 2 de la ronda 1 del tester).

### T-04 y T-05 · corregidos (Enmienda 5)
- **T-04.** La marca del fallo de página que conservó la lista ya no vive en un `useState` del componente: es de la consulta. Al montarse de nuevo la vista con la recuperación en vuelo (otra sección y regreso, cerrar y abrir el bloque), el render lee la marca de la instancia de la consulta: mismo `errorUpdateCount` y mismo `errorUpdatedAt`, porque la recarga no los toca hasta responder. Por eso la lista sigue a la vista con «Ver más» en espera y sin `role="alert"`. Los 11 casos de ATQ-CH6-36 quedaron en verde.
- **T-05.** Avisos y Dudas sobreviven al salto de clase. Ahora cada consulta (A y B) tiene su marca, así que la de B ya no pisa la de A. Los 2 casos de ATQ-CH6-37 quedaron en verde.

### Diff en corto (K-2)
- **`features/clases/hooks.ts`:**
  - `const fallosDePaginaConservados = new WeakMap<Query, string>()`, una memoria de módulo, con la instancia de la consulta como clave;
  - `useListaConservadaTrasLaPagina(queryKey, isFetchNextPageError, isError, errorUpdateCount, errorUpdatedAt, error)` obtiene la consulta con `useQueryClient().getQueryCache().find({ queryKey, exact: true })`;
  - la marca es `` `${errorUpdateCount}:${errorUpdatedAt}` ``. La registra un `useEffect` cuando `ahora` es verdadero, y el render la lee;
  - se suman `type Query` y `type QueryKey` a la importación de `@tanstack/react-query`.

  Es la forma de referencia del plan, sin cambios. No hizo falta leer `errorUpdatedAt` de `consulta?.state`: el lint no rechazó los seis parámetros.
- **En los 9 llamadores solo cambian los argumentos de esa llamada:** la cadena `clave` sale, entra la `queryKey` de la consulta como primer argumento y se suma `<consulta>.errorUpdatedAt`. Son las mismas claves que cada uno ya pasa a `useMarcarViejaSiQuedoEnError`:
  - `muro-view.tsx`: `clavePublicaciones(claseId)`;
  - `dudas-view.tsx`: `claveDudas(claseId)`;
  - `personas-view.tsx`: `clavePersonas(claseId)`;
  - `components/tabla-alumnos.tsx`: `claveAlumnos(claseId)`;
  - `components/comentarios-de-publicacion.tsx`: `claveComentarios(claseId, publicacionId)`;
  - `components/respuestas-de-duda.tsx`: `claveRespuestas(claseId, dudaId)`;
  - `components/seccion-de-tema.tsx`: `claveTrabajo(claseId, seccion.clave)`;
  - `inicio-estudiante-view.tsx`: `CLAVE_CLASES_INSCRITAS`;
  - `inicio-maestro-view.tsx`: `CLAVE_CLASES_IMPARTIDAS`.
- No cambió ningún otro código de producción. Ni `useAvisoDeRecargaFallida` ni el resto de cada vista se tocaron, y los dobles de C-15 y C-16 (`() => false`) siguen sirviendo.

### Rojo primero (K-1)
Contra el código de antes del cambio:
- `npx vitest run src/features/clases/ver-mas-ch6.test.tsx -t "CH6-B19"` → `Tests  6 failed | 3 passed`.
  - Rojos: CH6-B19 (a) en Avisos y en Personas, (b), (c) en Personas y en comentarios, y (d), con `Unable to find role="button" and name "Ver más …"`. La lista estaba reemplazada por el error. Es lo que el paso esperaba.
  - Verdes: CH6-B19 (e), su variante de N-02 y (f), que son regresión. También lo esperado.
- `npx vitest run src/features/clases/recargas-ch6.test.tsx -t "CH6-B18 \(e\)"` → `Tests  5 failed | 2 passed`. **Salió distinto de lo esperado.**
  - Con la firma vieja, los argumentos caen corridos: la `queryKey`, un arreglo y por tanto verdadero, entra como `isFetchNextPageError`, y un número entra como `error`, que no es un `ApiError`. Así `conservaLaListaTrasLaPagina` sale verdadera y el gancho devuelve verdadero siempre.
  - Por eso salieron verdes los dos casos que esperan verdadero ("desmontar y montar otra vez" y "dos ganchos a la vez"), y rojos los cinco que esperan falso ("con un 503…; otra consulta…", "el 400 del cursor", "otra consulta con el mismo par", "`resetQueries`…" y "un `QueryClient` nuevo…").
  - El plan esperaba rojos "montar de nuevo" y "otra consulta", y aclaraba que el segundo caería "por el tipo del argumento". Lo que hace caer el caso es el corrimiento de argumentos, no el tipo (Vitest no comprueba tipos), y por eso "montar de nuevo" salió verde. Lo vigila la mutación Q1 (abajo).

### Corrida corta (K-3)
- `npx vitest run src/features/clases/recargas-ch6b-r1.ataque.test.tsx src/features/clases/ver-mas-ch6.test.tsx src/features/clases/recargas-ch6.test.tsx src/features/clases/inicio-sin-datos-r2.ataque.test.tsx src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` → `Test Files  5 passed (5)` y `Tests  396 passed (396)`.
- `npm run lint` → código de salida 0.
- Quedaron en verde los 70 de `recargas-ch6b-r1` (con los 13 de T-04 y T-05), CH6-B18 (e), CH6-B19, C-15 y C-16.

### Casos nuevos o reescritos
- `src/features/clases/ver-mas-ch6.test.tsx`, describe «CH6-B19 · la lista conservada mientras vuela la recarga que la recupera, por los caminos vecinos de T-04 y T-05» (9 casos nuevos):
  - «CH6-B19 (a) (%s): con la lista conservada y su recuperación en vuelo, volver de otra sección dos veces seguidas: la lista sigue a la vista con «Ver más» en espera y sin role=alert, sin petición de más; al responder bien, sin aviso» (Avisos y Personas)
  - «CH6-B19 (b) (Avisos): la recuperación que lanza una invalidación por comentar queda en vuelo; ir a otra sección y volver: la lista sigue a la vista con «Ver más avisos» en espera y sin role=alert, sin petición de más; al responder bien, sin aviso»
  - «CH6-B19 (c) (Personas): A conservada y su renovación en vuelo; salto A → B → A (la lista se monta de nuevo por su key): al volver a A, su lista sigue a la vista con «Ver más alumnos» en espera y sin role=alert, sin petición de más; al responder bien, sin aviso»
  - «CH6-B19 (c) (comentarios): los comentarios de A conservados y su renovación en vuelo; salto A → B → A y se vuelve a abrir el bloque (la fila se monta de nuevo con el bloque cerrado, N-01 del manager): los comentarios siguen a la vista con «Ver más comentarios» en espera y sin role=alert, sin petición de más; al responder bien, sin aviso»
  - «CH6-B19 (d) (Dudas): A y B conservadas; A → B → A → B con las dos renovaciones en vuelo: al llegar a B la segunda vez, su lista sigue a la vista con «Ver más dudas» en espera y sin role=alert, sin petición de más»
  - «CH6-B19 (e) (Avisos): la recuperación falla después de volver de otra sección: la lista se reemplaza por su MensajeError, sin aviso y sin «Ver más avisos»»
  - «CH6-B19 (e) (Avisos, la recuperación falla con la vista desmontada; N-02 del manager): pulsar la sección deja la recuperación en vuelo, se va a otra sección y la recuperación falla ahí; al volver, mientras se pide otra vez se ve el MensajeError, sin aviso, nunca la lista conservada por una marca vieja»
  - «CH6-B19 (f) (Avisos): con la lista conservada, la consulta sale de la caché (removeQueries) mientras la vista está en otra sección; al volver, la primera carga nueva no tiene marca y, si falla, reemplaza la lista por su MensajeError, sin aviso»
- `src/features/clases/recargas-ch6.test.tsx`, describe «CH6-B18 (e) · useListaConservadaTrasLaPagina con renderHook (Enmienda 5: la marca es de la consulta)». Se reescribe para la firma nueva: los 2 casos que había se cambiaron y se sumaron 5, en total 7. Cada caso crea su consulta con `getQueryCache().build`, y si falta, falla con un mensaje.
  - «CH6-B18 (e): con isFetchNextPageError y un 503 devuelve verdadero; sin la dirección y con el mismo par sigue en verdadero; con otra consulta y el mismo par, o con otro errorUpdateCount, falso»
  - «CH6-B18 (e): con un 400 del cursor es falso desde el principio»
  - «CH6-B18 (e): desmontar el gancho y montarlo otra vez sobre la misma consulta, sin la dirección y con el mismo par: verdadero (T-04 a nivel del gancho)»
  - «CH6-B18 (e): otra consulta con el mismo par, sin haber fallado su página: falso (T-05 a nivel del gancho)»
  - «CH6-B18 (e): dos ganchos montados a la vez sobre la misma consulta: los dos verdaderos»
  - «CH6-B18 (e): con la marca tomada con el contador en 1, resetQueries de la consulta y después un error con el contador otra vez en 1 y otra hora: falso»
  - «CH6-B18 (e): un QueryClient nuevo con la misma queryKey, el mismo par y el reloj fijo: falso (las marcas no pasan de un cliente a otro)»

### Las notas del manager
- **N-01:** en comentarios, CH6-B19 (c) se arma con "salta A → B → A **y vuelve a abrir el bloque**", como indica el título. Personas se queda como está escrito.
- **N-02:** está la variante de (e) en Avisos, "la recuperación falla con la vista desmontada y la persona vuelve". Se ve el `MensajeError` mientras se pide otra vez, sin aviso, y nunca la lista conservada. Está en verde con el remedio.
- **N-03:** seguí `plan.md:531`, que dice que la marca suma `errorUpdatedAt`, y no `:1142`.
- **La mutación "sin `errorUpdatedAt`":** el caso «…resetQueries… con el contador otra vez en 1 y otra hora…» marca con el contador en 1, llama a `resetQueries` y vuelve con el contador en 1 y otra hora. Es el que cae con Q3.
- **O-01**, aceptada, sin caso: no la perseguí.

### Mutaciones (K-4)
Todas en `src/features/clases/hooks.ts`, que está en "Se toca". No muté ningún archivo de "No se toca", ni siquiera de forma temporal.

Cada mutación siguió los mismos pasos, con `scratchpad/mutar2.py`:
1. copié el archivo real a una copia de respaldo;
2. apliqué los reemplazos exactos, comprobando antes que cada texto aparecía una sola vez;
3. corrí `npx vitest run <pruebas> -t "<filtro>"`;
4. restauré desde la copia y lo comparé byte a byte (`filecmp.cmp(..., shallow=False)`, el equivalente de `cmp`).

Nunca usé `git checkout`, `git restore` ni `git stash`.

| Id | Fila del plan | Qué cambié | Cayó | cmp |
|---|---|---|---|---|
| Q1 | (Enmienda 5, T-04) la marca vuelve a un `useState` del gancho | `const [marca, setMarca] = useState(…)`, ajustada en el render, en lugar del `WeakMap` | ATQ-CH6-36 (sus 11 filas); CH6-B19 (a) en Avisos y Personas, (b), y (c) en Personas y comentarios; CH6-B18 (e) "con un 503…", "desmontar y montar otra vez" y "dos ganchos a la vez" (`19 failed`) | igual |
| Q2 | (Enmienda 5, T-05) una sola variable de módulo con la última marca | `ultimaMarca.valor = fallo` en el efecto y la comparación contra ese valor | ATQ-CH6-37 (Avisos y Dudas), CH6-B19 (d), CH6-B18 (e) "otra consulta con el mismo par" y "un QueryClient nuevo…". También caen "con un 503…" y "el 400 del cursor", porque la marca pasa de un caso a otro (`7 failed`) | igual |
| Q3 | (Enmienda 5) la marca sin `errorUpdatedAt` | `const fallo = String(errorUpdateCount)` | CH6-B18 (e) "…resetQueries… con el contador otra vez en 1 y otra hora: falso" | igual |
| Q4 | (Enmienda 5) un `Map` de módulo por `queryHash` | `fallosPorHash.set(consulta.queryHash, fallo)` y lectura por `queryHash` | CH6-B18 (e) "un QueryClient nuevo con la misma queryKey…" y "el 400 del cursor" (otra vez por la marca que pasa entre clientes) | igual |
| Q5 | (3b, M-02) devolver solo `ahora` | `return ahora` | 35 casos (`35 failed \| 5 passed`): ATQ-CH6-36 (las 12 filas, incluido el control del tema con `signal`), ATQ-CH6-37 (2), CH6-B10 (Avisos: pulsar, volver e invalidación por comentar), CH6-B16 (f) (5), CH6-B18 (a) (2), CH6-B18 (e) (los 4 que esperan verdadero), CH6-B19 (a) a (d) (6) y la primera mitad de CH6-B19 (e) | igual |

Sin redundancias: cada fila de la Enmienda 5 hace caer su caso.

### Hermanos: las 9 listas que usan el gancho
En cada una el remedio aplica y se aplicó. El mecanismo es uno solo, la marca por consulta. Lo que cambia entre las listas es cómo se monta la vista y si la consulta consume `signal`:

| Lista | Llamador | Clave | ¿Se aplicó? | Caso |
|---|---|---|---|---|
| Avisos | `muro-view.tsx` | `clavePublicaciones(claseId)` | Sí | ATQ-CH6-36 y 37, CH6-B19 (a), (b), (e) y (f) |
| Dudas | `dudas-view.tsx` | `claveDudas(claseId)` | Sí | ATQ-CH6-36 y 37, CH6-B19 (d) |
| Comentarios (de publicación y de recurso) | `components/comentarios-de-publicacion.tsx` | `claveComentarios(claseId, publicacionId)` | Sí | ATQ-CH6-36 (las dos filas, y cerrar y abrir), CH6-B19 (c) |
| Respuestas | `components/respuestas-de-duda.tsx` | `claveRespuestas(claseId, dudaId)` | Sí | ATQ-CH6-36 (la fila, y cerrar y abrir) |
| Un tema de Actividades | `components/seccion-de-tema.tsx` | `claveTrabajo(claseId, seccion.clave)` | Sí | ATQ-CH6-36 (control con `signal`), CH6-B10 |
| Personas | `personas-view.tsx` | `clavePersonas(claseId)` | Sí | ATQ-CH6-36, CH6-B19 (a) y (c) |
| El roster | `components/tabla-alumnos.tsx` | `claveAlumnos(claseId)` | Sí | ATQ-CH6-36 |
| Inicio del estudiante | `inicio-estudiante-view.tsx` | `CLAVE_CLASES_INSCRITAS` | Sí | ATQ-CH6-36 |
| Inicio del maestro | `inicio-maestro-view.tsx` | `CLAVE_CLASES_IMPARTIDAS` | Sí | ATQ-CH6-36 |

### Estados vecinos del mecanismo, con el caso que cubre cada uno
- **Primera carga que falla:** no hay datos, así que no hay fallo de página ni marca, y se reemplaza. Casos: CH6-B03 y CH6-B04 (sin datos), CH6-B19 (f).
- **Fallo de página (red o `5xx`):** se registra la marca, se conserva la lista y sale un aviso. Casos: CH6-B10 y CH6-B12 (a).
- **La recuperación en vuelo y un montaje nuevo (T-04):**
  - por otra sección y regreso: ATQ-CH6-36 y CH6-B19 (a), dos veces seguidas;
  - tras la invalidación por comentar: CH6-B19 (b);
  - por el salto con montaje nuevo: CH6-B19 (c).
- **Cerrar y abrir el bloque:** ATQ-CH6-36 (comentarios y respuestas, cerrar y abrir) y CH6-B19 (c) en comentarios.
- **A → B → A y A → B → A → B (T-05):** ATQ-CH6-37 (A → B → A) y CH6-B19 (d) (A → B → A → B).
- **La recuperación responde bien:** la lista se renueva sin aviso. Casos: ATQ-CH6-36 y CH6-B19 (a) a (d).
- **La recuperación falla:**
  - con la vista montada: CH6-B10 (la recuperación falla), ATQ-CH6-39 (`403` y `404`) y CH6-B19 (e);
  - con la vista desmontada: CH6-B19 (e) (N-02).
- **Un fallo de página nuevo:** registra el par nuevo y da un aviso. Casos: CH6-B12 (a) y CH6-B18 (a).
- **La consulta sale de la caché o se reinicia:**
  - `removeQueries`: CH6-B19 (f);
  - `resetQueries`: CH6-B18 (e), el caso del contador en 1 (Q3);
  - un `QueryClient` nuevo, con la misma clave: CH6-B18 (e) (Q4).
- **Dos observadores de la misma consulta:** CH6-B18 (e), el caso de los dos ganchos a la vez.
- **`StrictMode`:** ATQ-CH6-42 (las 9 listas y los comentarios de un recurso), en verde. El efecto corre dos veces con el mismo valor.
- **La clase pasa a archivada:** un `409 CLASE_ARCHIVADA` es un `4xx`, así que no registra marca; si llega en la recuperación, el par cambia y la lista se reemplaza. **No tiene caso propio en 06b**: su rama es la de "la recuperación falla con un `4xx`" (ATQ-CH6-39, con `403` y `404`). No lo agregué; lo dejo como punto de ataque.
- **El tema de Actividades (`signal`):** salir aborta la recarga y la revierte con la dirección, así que la lista se conserva con o sin marca. Casos: ATQ-CH6-36 (control) y CH6-B12 (c) (Actividades).

### Los demás ganchos de 06b con memoria, ante el montaje nuevo y ante varias claves
- **`useAvisoDeRecargaFallida`** (la ref `fallosVistos` y su `clave`, de 06a): al montarse de nuevo nace con el contador del momento, así que no avisa un fallo ya ocurrido (R8, la conducta buscada). Con varias claves, la ref se reinicia con la clave. **No tiene el hueco.** Casos: CH6-B12 (d) y CH6-B18 (a).
- **`useRenovarSiLaPublicacionYaNoEsta`** (la ref `fallosVistos` y la clave `claseId:publicacionId`): al abrir de nuevo el bloque, la consulta en error se vuelve a pedir, y el `404` nuevo sube el contador y renueva. **No tiene el hueco.** Casos: CH6-B13 (dos fallos seguidos) y ATQ-CH6-42 (comentarios con 404).
- **Las dos refs del gradebook** (`fraseSinMarcarRef` y `fraseMarcadaRef`): al desmontarse, la limpieza marca las ventanas, así que lo que sabían queda en la caché antes de perderse; por clase, la vista se monta de nuevo. **No tienen el hueco.** Casos: CH6-B14 (b), (d), (g) y (h), y ATQ-CH6-46 a 49.
- **`useMarcarViejaSiQuedoEnError`:** su memoria es la clave de su efecto, y la limpieza marca la clave de su cierre. **No tiene el hueco.** Casos: CH6-B02.
- **`useRecargarAlPulsarLaSeccion`:** no tiene memoria.
- **`useFocoAlPasarAError`:** recibe `isError && !conserva`. Con el `conserva` corregido decide bien, y su memoria va por clave (06a).
- **`renovarLasListasSiTraenLaClase`:** no tiene memoria; decide con lo que hay en la caché.
- **Memoria de módulo que sumé en 06b:** solo `fallosDePaginaConservados`. Los limitadores `limiteDeTrabajo` y `limiteDeRecursos` no cambiaron.

No encontré otro gancho con el mismo hueco.

### Matriz de §D-7: la fila que cambia
**Volver de otra sección (o cerrar y abrir, o el salto que monta de nuevo) con la recuperación de una lista conservada todavía en vuelo**:
- **Qué se pide:** nada nuevo; sigue la misma recarga.
- **Qué se anuncia:** nada.
- **Qué se ve:** la lista conservada, con «Ver más» en espera y sin `role="alert"`. Antes se veía el `MensajeError`.
- **Foco:** donde lo deja el montaje.
- **Si la recuperación falla:** el `MensajeError`, sin aviso. Si falló con la vista desmontada, al volver se ve el `MensajeError` mientras se pide de nuevo.
- **Casos:** ATQ-CH6-36, ATQ-CH6-37 y CH6-B19.

Las demás filas no cambian.

### Verificación (K-5, desde `frontend/`, una a la vez)
- `npm run lint`: código de salida 0; la salida termina en `> tsc -b`, sin errores.
- `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib`: `Test Files  242 passed (242)` y `Tests  5491 passed (5491)`. Sin fallas, y los 13 casos de T-04 y T-05 del tester quedaron en verde.
- `npm run build`: `✓ built in 2.05s`.
- No cayó ninguna condicional: C-10, C-14 y PR-C18 siguen en verde sin tocarse.

### Conteos
- `npx vitest list src/components/seccion/recargas-ch6.test.tsx src/features/clases/recargas-ch6.test.tsx src/features/clases/ver-mas-ch6.test.tsx src/features/calificaciones/gradebook-ch6.test.tsx`, contado con `grep -a -c`: **342 casos** (12, 172, 142 + 9 = 151, y 7). Antes eran 328: se suman los 9 de CH6-B19, y CH6-B18 (e) pasa de 2 a 7 casos (5 más).
- Archivos tocados en `frontend/` (`git status --short frontend | wc -l`): **42**, con mis 27 sin cambio (19 de producción, 4 pruebas nuevas y 4 de la lista cerrada) y 15 `*.ataque` del tester (13 de las rondas 0 y 0 bis, y 2 de la ronda 1).
- Esta corrección tocó 12 archivos, todos ya en la lista:
  - `features/clases/hooks.ts` y los 9 llamadores;
  - `features/clases/ver-mas-ch6.test.tsx` y `features/clases/recargas-ch6.test.tsx`.
