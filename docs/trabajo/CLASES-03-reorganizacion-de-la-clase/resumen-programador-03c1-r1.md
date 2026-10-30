# Resumen del programador — CLASES-03c1, corrección de la ronda 1

Plan: `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md` (SHA-256 `84074f4a…d04fe6`). Base: `reporte-tester.md` (SHA-256 `6f335866…`), "## CLASES-03c1 — Ronda 1" con su "Adenda 1" (CL3-R1-02 reescrita), y `revision.md`, "## Arbitraje de la ronda 1 — 03c1" (lista cerrada).
Pasos completados: 3 de 3 (T-01, T-02, T-03 con su hermano).
Solo el frontend: no se tocó `shared/` ni el backend.

## Archivos

Producción (todos dentro de la lista cerrada del arbitraje):
- `frontend/src/features/clases/components/secciones-de-clase.tsx` (T-01): pasa `base` al gancho y pinta el indicador solo con medida.
- `frontend/src/features/clases/hooks.ts`, solo `useIndicadorDeSecciones` y sus auxiliares (`conservarSiIgual` y el nuevo `posicionDelPanel`), T-01 y T-02.
- `frontend/src/features/clases/lib.ts`: se agrega `opcionEnElPanel` (T-02). `medidaDelIndicador` y `desplazamientoParaVer` no cambian.
- `frontend/src/features/clases/types.ts`: se agregan `PosicionDelPanel` y `MedidaDelIndicadorDeLaClase`. `MedidaDeOpcion`, `MedidaDelPanel` y `MedidaDelIndicador` no cambian. El comentario de `CapacidadesDePerspectiva` vuelve encima de su interfaz (M-01 de la verificación).
- `frontend/src/features/clases/components/tabla-alumnos.tsx:218` (T-03), solo esa línea.
- `frontend/src/features/clases/personas-view.tsx:73` (hermano de T-03), solo esa línea.

Pruebas nuevas, en archivos nuevos:
- `frontend/src/features/clases/personas-ver-mas-03c1.test.tsx` (1 caso).
- `frontend/src/features/clases/opcion-en-el-panel-03c1.test.ts` (5 casos: la función pura nueva).

No toqué ninguna prueba normal existente ni ninguna `*.ataque`. No toqué `trabajo-view.tsx`: M-02 no entró en el arbitraje. Los SHA-256 de las tres `*.ataque` de la ronda 1 coinciden con el reporte:
- `indicador-03c1-r1` `0d33a954…9ad8c`
- `personas-03c1-r1` `6acc49a2…bd23a7c`
- `estatico-03c1-r1` `fb17a1be…4344`

`git diff --stat` contra `HEAD` (`e502381`) de los 6 archivos de producción: `6 files changed, 284 insertions(+), 41 deletions(-)`. Esa cifra incluye lo de 03c1 sin commit: no hay un commit intermedio que aísle esta ronda. Los dos archivos de prueba nuevos están sin seguimiento (`??`).

## Hallazgos

### T-01 — corregido
- **Causa:**
  - El `<span>` del indicador se montaba con `activa >= 0` aunque `medida` fuera `null` (entrada directa) o fuera de otra opción.
  - Al volver de una pantalla sin sección, la medida seguía siendo la de la sección de antes.
  - Al cambiar de clase, era la de la otra clase.
  - Al medir en el `useLayoutEffect`, el navegador calculaba los estilos con esa posición, y el `setMedida` siguiente se animaba.
- **Remedio** (no es el literal del tester `medida.indice === activa`, que habría roto el control):
  - `hooks.ts:964`, `if (activa < 0 && medida !== null) setMedida(null)`: sin sección activa, la medida se olvida. Se hace durante el render y no en un efecto, porque la regla `react-hooks` del lint prohíbe un `setState` síncrono en el cuerpo de un efecto.
  - `hooks.ts:959`: el gancho recibe la `base` de la ruta (`baseDeClase(perspectiva, claseId)`), y cada medida guarda la `base` en que se tomó (`MedidaDelIndicadorDeLaClase`, `types.ts:82`).
  - `hooks.ts:1005-1006`: el gancho solo devuelve la medida de su misma `base`.
  - `:982` y `:1003`: los dos efectos dependen de `[activa, base]`.
  - `conservarSiIgual` (`:1017`) también compara la `base`.
  - `secciones-de-clase.tsx:58`: el indicador se pinta solo con `activa >= 0 && medida !== null`.
- **Resultado:**
  - Al entrar, al volver de una pantalla sin sección o al cambiar de clase, el indicador no está en la página cuando se mide. Aparece ya en su lugar, sin transición, porque un elemento recién insertado no anima.
  - Al cambiar de sección dentro de la misma clase conserva la medida anterior y se desliza.
- **Pruebas que lo cubren:**
  - `indicador-03c1-r1.ataque.test.tsx`, «CL3-R1-01: al entrar directo en «Calificaciones», cuando se mide la opción el indicador o no está o ya tiene su posición»: verde.
  - Mismo archivo, «CL3-R1-01: de «Avisos» a «Editar clase» y de ahí a «Calificaciones», el indicador no reaparece con la posición vieja de «Avisos»»: verde.
  - Control, «CL3-R1-01 (control): al cambiar de «Avisos» a «Calificaciones» sí parte de la posición de «Avisos» (es el deslizamiento que pide el diseño)»: sigue verde.

**Estados vecinos del mecanismo (uno por uno):**

| Estado o camino | Qué pasa ahora | ¿Le aplica el remedio? | Cubierto por |
|---|---|---|---|
| Entrada directa en cualquier sección y perspectiva, incluida «Avisos» | `medida` empieza en `null`, así que al medir no hay indicador. El `setMedida` del efecto de diseño lo monta ya con su posición, antes de pintar | Sí | CL3-R1-01 (entrada en «Calificaciones»), CL3-C01/C02 y CL3-R1-04 a 08 (entradas en las tres perspectivas), sin cambios |
| Volver de «Editar clase», «Categorías», el detalle, la edición o las entregas de una tarea | Con `activa < 0` la medida se olvida en el render, y al volver se comporta como una entrada | Sí: las pantallas sin sección dan `activa < 0` en `indiceDeSeccionActiva` | CL3-R1-01 («Editar clase»). Las demás pantallas siguen el mismo camino (`activa < 0`); no tienen prueba propia |
| Historial (atrás y adelante) entre secciones | Es un cambio de sección en la misma clase: se desliza desde la anterior y el panel deja la opción a la vista | Sí (desliza, como pide el diseño) | CL3-R1-03 |
| Cambio de sección (control) | Conserva la medida de la anterior, así que al medir el indicador está en la posición vieja y se desliza | Es el camino que el remedio debe conservar | CL3-R1-01 (control) y CL3-R1-02 «al cambiar de «Avisos» a «Calificaciones»…» |
| Pulsar la sección activa | No cambia `activa` ni `base`, así que no se vuelve a medir ni a desplazar | No cambia nada | CL3-R1-08 |
| Cambio de clase en la misma sección | La medida de la otra `base` no se devuelve: el indicador se desmonta, se mide sin él y vuelve a aparecer en su lugar | Sí | CL3-R1-07 |
| **Cambio de clase en otra sección, con la clase nueva en caché** (barra lateral, `ClaseLayout` sin `key`) | Igual que una entrada: la medida es de otra `base`, así que al medir no hay indicador. Aparece en su lugar, sin deslizarse desde la sección de la otra clase | Sí | Lo comprobé con un caso temporal sobre el modelo del tester: clase B «Calificaciones» → clase A «Actividades» → clase B «Calificaciones», con fotos solo `ausente`/`300px`; pasó, y borré el archivo. **No queda un caso permanente**: la lista cerrada no autorizaba un archivo nuevo para esto |
| Medidas en cero (panel aún sin diseño) | El indicador mide 0, y el `ResizeObserver` corrige sin desplazar porque `volverAMedir` no toca `scrollLeft` | Sin cambio de conducta (la medida lleva la `base` actual) | CL3-R1-04 |
| Desmontaje con `ResizeObserver` o `document.fonts.ready` pendientes | La limpieza pone `vigente = false` y desconecta, así que el aviso tardío no escribe estado | Sin cambio | CL3-R1-05 |
| Aviso tardío del `ResizeObserver` en una pantalla sin sección | El efecto de `activa < 0` no observa, y el de antes ya se desconectó. Aunque llegara un `setMedida`, el `span` no se pinta con `activa < 0` | Sí | CL3-R1-06 |
| Cambio de tamaño (fuentes o `ResizeObserver`) con la sección activa | Vuelve a medir con la `base` actual. Si la medida es igual, `conservarSiIgual` no repinta | Sin cambio de conducta | CL3-R1-04 |
| Control de dos botones de `FormularioPublicacion` | No aplica: usa clases fijas, sin medida | No aplica | — |

### T-02 — corregido
- **Causa:** `desplazamientoParaVer` recibía el `offsetLeft` del `<li>`, que se mide desde el `<ul>`. En el área desplazable del panel, la opción empieza después del borde y del relleno del panel (`p-1`), así que quedaba cortada tantos píxeles como mide el relleno.
- **Remedio:**
  - `lib.ts:115`: función pura nueva `opcionEnElPanel(opcion, inicioDeLaLista, panel)`. Suma al `offsetLeft` de la opción el inicio de la lista dentro del área desplazable: `inicioDeLaLista - panel.left - panel.clientLeft + panel.scrollLeft`.
  - `hooks.ts:974`: el gancho le pasa `lista.getBoundingClientRect().left` y `posicionDelPanel(panel)` (`hooks.ts:1029`: `getBoundingClientRect().left`, `clientLeft` y `scrollLeft` del panel). Después pasa el resultado a `desplazamientoParaVer`.
  - Todo se mide; no hay ningún número de píxeles en el código.
  - `medidaDelIndicador` y `desplazamientoParaVer` no cambian de firma ni de contrato (CL3-C03 sin cambios), y el indicador sigue en coordenadas del `<ul>`.
  - En jsdom sin modelo, los rectángulos valen 0 y el resultado es el `offsetLeft` de siempre, así que CL3-C04 sigue con 160.
- **Pruebas que lo cubren:**
  - `indicador-03c1-r1.ataque.test.tsx`, «CL3-R1-02: al entrar en «Calificaciones» con 250 px visibles y un relleno de 4 px, la opción queda entera a la vista»: verde.
  - Mismo archivo, «… relleno de 12 px …»: verde.
  - «CL3-R1-02: al cambiar de «Avisos» a «Calificaciones» con 250 px visibles y un relleno de 4 px, la opción queda entera a la vista»: verde.
  - Control: «CL3-R1-02 (control): sin relleno (el modelo de CL3-C04), la opción también queda entera a la vista».
  - CL3-R1-03, CL3-R1-08 y `secciones-03c1.test.tsx` «CL3-C04: …» (los dos casos) siguen verdes.
  - La función pura: `opcion-en-el-panel-03c1.test.ts`, describe «opcionEnElPanel (CL3-C1R1-02)»:
    - «CL3-C1R1-02: suma a la opción lo que la lista empieza dentro del panel (borde y relleno medidos)»
    - «CL3-C1R1-02: con el panel ya desplazado, el resultado no cambia (la lista se movió lo mismo que el desplazamiento)»
    - «CL3-C1R1-02: sin borde ni relleno (o sin medidas, como en jsdom), la opción queda igual»
    - «CL3-C1R1-02: con un relleno de 4 px y 250 px visibles, desplazamientoParaVer deja la opción entera a la vista»
    - «CL3-C1R1-02: con un relleno de 12 px y 250 px visibles, desplazamientoParaVer deja la opción entera a la vista»

**Hermanos y estados vecinos:**
- **El borde izquierdo** (`inicio < scrollLeft`) aplica: usa la misma posición corregida. Ahora, al volver a una opción que quedó a la izquierda, el inicio de la opción se alinea con el inicio del área visible, sin los 4 px de margen. El arbitraje acepta los dos resultados.
- **Entrada, cambio de sección e historial:** los tres pasan por el mismo efecto de diseño, así que el remedio les aplica (CL3-R1-02 ×3, CL3-R1-03).
- **Pulsar la sección activa:** no vuelve a medir ni a desplazar (CL3-R1-08, `scrollLeft` = 20 exacto).
- **Cambio de tamaño (`ResizeObserver` o fuentes):** no desplaza, por diseño (CL3-R1-04). No le aplica.
- **Panel ya desplazado al medir:** el `scrollLeft` se suma en `opcionEnElPanel`, así que el resultado no depende de él. Lo cubre el caso «con el panel ya desplazado…».
- **Otro control con `desplazamientoParaVer`:** ninguno (grep en `frontend/src`).

### T-03 — corregido (con el hermano que el arbitraje asignó a 03c1)
- **Causa:** «Ver más alumnos» usaba `enEspera={…isFetchingNextPage}`, así que durante una recarga del roster parecía disponible (contra CLAUDE.md › Componentes).
- **Remedio:**
  - `components/tabla-alumnos.tsx:218`: `enEspera={alumnos.isFetching}`.
  - `personas-view.tsx:73`: `enEspera={personas.isFetching}`.
  - Una línea en cada uno. El `onClick` ya usaba `cancelRefetch: false`.
- **Pruebas:**
  - `app/personas-03c1-r1.ataque.test.tsx`, «CL3-R1-15: «Ver más alumnos» queda en espera mientras el roster se vuelve a pedir (enEspera={isFetching}, CLAUDE.md › Componentes)»: verde.
  - `features/clases/personas-ver-mas-03c1.test.tsx`, «CL3-C1R1-01: «Ver más alumnos» del estudiante en «Personas» queda en espera mientras la lista se vuelve a pedir».
    - Retiene la recarga, afirma `aria-busy="true"`, pulsa el botón y comprueba que no sale otra petición, ninguna con `cursor=`.
    - Al soltar la recarga, el botón sale de la espera.
    - Lo comprobé en rojo con la línea vieja (`isFetchingNextPage`) y la restauré.

**Hermanos («Ver más» de `features/clases`) y su decisión según el arbitraje:**

| Control | Decisión | Aplicado |
|---|---|---|
| `components/tabla-alumnos.tsx:218` («Ver más alumnos», maestro y admin) | 03c1 | Sí |
| `personas-view.tsx:73` («Ver más alumnos», estudiante) | 03c1 | Sí |
| `clases-admin-view.tsx:78` («Cargar más clases») | CHORE-04, fila nueva | No: fuera de la lista cerrada (sigue `isFetchingNextPage`) |
| `components/comentarios-de-publicacion.tsx:180` («Ver más comentarios») | CHORE-04, fila nueva | No (sigue `isFetchingNextPage`) |
| `components/panel-mis-clases.tsx:61` (con `inicio-estudiante-view.tsx` e `inicio-maestro-view.tsx`) | CHORE-04, fila nueva | No (sigue `props.isFetchingNextPage`) |
| `muro-view.tsx:145` («Ver más avisos») y `components/seccion-de-tema.tsx:144` («Ver más de `<tema>`») | Ya correctos | Ya usan `isFetching` |

**Estados vecinos del «Ver más alumnos»:**
- **Primera carga:** el botón no existe. No le aplica.
- **Página siguiente en vuelo:** `isFetching` también es verdadero, así que queda en espera como antes.
- **Recarga por invalidación** (agregar o quitar un alumno; en el estudiante, el `staleTime` o una invalidación): ahora en espera. Lo cubren CL3-R1-15 y CL3-C1R1-01.
- **Recarga que falla:** la vista cambia al `MensajeError` y el botón se desmonta. El foco sigue el mecanismo de T-27 (encabezado «Alumnos»), sin cambio.
- **Doble clic durante la recarga:** `aria-disabled` no dispara la acción, y `cancelRefetch: false` se une a la recarga. CL3-C1R1-01 comprueba que no sale ninguna petición.
- **Vista desmontada:** sin cambio.

## Matriz de avisos, recargas y foco (solo las filas que cambian)

| Disparador | Clase de error o estado | Qué se renueva | Qué se anuncia | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| Indicador: entrar, volver de una pantalla sin sección, cambiar de clase | No hay petición | Se mide antes de pintar y se monta ya en su lugar | Nada (`aria-hidden`); el estado lo dicen `aria-current` y el color del texto | Sin cambio | No aplica | La limpieza desconecta el observador y `vigente = false`; nada escribe estado |
| Indicador: cambiar de sección o historial | No hay petición | Desliza desde la anterior y el panel deja la opción entera a la vista | Nada | Sin cambio | No aplica | Igual |
| «Ver más alumnos» del roster (maestro y admin) durante una recarga | Recarga en vuelo | Nada nuevo: el clic se une a la recarga (`cancelRefetch: false`) | Nada: el botón en espera (`aria-busy`) | Se queda en el botón (`enEspera` no usa `disabled`) | Recarga y clic: una sola petición | Sin cambio |
| «Ver más alumnos» del estudiante durante una recarga | Igual | Igual | Igual | Igual | Igual (CL3-C1R1-01) | Sin cambio |
| Los dos «Ver más alumnos»: recarga que falla, `5xx` o red | Reemplaza la lista | Sin cambio: el `MensajeError` del bloque, con el texto de la consulta | Un solo `MensajeError` | Encabezado «Alumnos» (T-27, sin cambio) | — | Sin cambio |

Nada de esto agrega avisos (`toast`) ni redirecciones.

## Pruebas requeridas (arbitraje de la ronda 1)

| Requisito | Archivo | Caso |
|---|---|---|
| T-01: los dos casos rojos en verde | `indicador-03c1-r1.ataque.test.tsx` | «CL3-R1-01: al entrar directo en «Calificaciones», cuando se mide la opción el indicador o no está o ya tiene su posición» · «CL3-R1-01: de «Avisos» a «Editar clase» y de ahí a «Calificaciones», el indicador no reaparece con la posición vieja de «Avisos»» |
| T-01: el control sigue verde | Mismo archivo | «CL3-R1-01 (control): al cambiar de «Avisos» a «Calificaciones» sí parte de la posición de «Avisos» (es el deslizamiento que pide el diseño)» |
| T-02: los tres casos reescritos en verde | Mismo archivo | «CL3-R1-02: al entrar en «Calificaciones» con 250 px visibles y un relleno de %i px, la opción queda entera a la vista» (4 y 12) · «CL3-R1-02: al cambiar de «Avisos» a «Calificaciones» con 250 px visibles y un relleno de 4 px, la opción queda entera a la vista» |
| T-02: la función pura nueva, en un archivo nuevo | `opcion-en-el-panel-03c1.test.ts` | Los cinco «CL3-C1R1-02: …» listados en T-02 |
| T-02: CL3-C03 y CL3-C04 sin cambio y en verde | `lib.test.ts`, `secciones-03c1.test.tsx` | Sin cambio (verdes en la corrida completa) |
| T-03 | `app/personas-03c1-r1.ataque.test.tsx` | «CL3-R1-15: «Ver más alumnos» queda en espera mientras el roster se vuelve a pedir (enEspera={isFetching}, CLAUDE.md › Componentes)» |
| Hermano del estudiante | `personas-ver-mas-03c1.test.tsx` | «CL3-C1R1-01: «Ver más alumnos» del estudiante en «Personas» queda en espera mientras la lista se vuelve a pedir» |
| Estado vecino: cambio de clase en otra sección con caché | — | **Sin caso permanente** (solo la comprobación temporal descrita en T-01) |

## Verificación (desde `frontend/`, una tras otra, nunca dos suites a la vez)

| Comando | Última línea |
|---|---|
| `npm run lint` | exit 0. `All matched files use Prettier code style!` y, al final, `> tsc -b` |
| `npx vitest list` con `grep -acE "^src/"` | `5410` casos (base 5404 + 6 nuevos: 1 de `personas-ver-mas-03c1.test.tsx` y 5 de `opcion-en-el-panel-03c1.test.ts`) |
| `npx vitest list` con `grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `246` archivos (base 244 + 2) |
| `npm run test` | `Test Files  246 passed (246)` · `Tests  5410 passed (5410)` · `Duration  183.38s`. «Hook timed out»: 0 (`grep -ac`) |
| `npm run build` | exit 0, `✓ built in 782ms` (el aviso de siempre de trozos de más de 500 kB) |

- Los 6 rojos esperados (CL3-R1-01 ×2, CL3-R1-02 ×3, CL3-R1-15) quedaron verdes, y no apareció ningún otro rojo: la PARADA no se activó.
- Durante el trabajo, el lint marcó `react-hooks` (setState síncrono en un efecto) por mi primera versión del olvido de la medida. La moví al render; no relajé ninguna regla.
- Formateo: `npx prettier --write` solo sobre los 6 archivos tocados y los 2 nuevos, dentro de `frontend/` (todos `unchanged`).

## Desviaciones del plan

Ninguna. La forma del remedio de T-01 no es la literal del tester (`medida.indice === activa`), por el aviso del manager. El resultado es el que pide el arbitraje.

## Pendiente o fuera de alcance detectado

- **El estado vecino "cambio de clase en otra sección con la clase nueva en caché" no tiene caso permanente.** Si el manager lo quiere, el sitio natural es un caso nuevo del tester sobre el modelo de `indicador-03c1-r1`, porque el programador no puede tocar `*.ataque`.
- **M-02** (`trabajo-view.tsx:49`, comentario de 135 caracteres): sigue para 03c2. El arbitraje no lo incluyó.
- **Los tres «Ver más» de CHORE-04** (filas 26, 27 y 28 del arbitraje): sin cambio, como se decidió.
- **La animación real del indicador y el desplazamiento real a 360 px:** no verificados en un navegador (H-1 y H-2, comprobación humana).
