# Resumen del programador — CLASES-03c1

> **Nota de transcripción (orquestador, 2026-10-29).** Las instrucciones de entorno del programador le impiden escribir reportes, así que entregó el resumen como texto y el orquestador lo transcribió tal cual, sin cambiar contenido, según la regla "Transcripción con cotejo" de `AGENTS.md`. Cotejo en `aprobacion.md`.

03c1 de CLASES-03 está implementada, pero me detuve en una PARADA: en la suite del frontend quedan 8 casos rojos en 4 archivos que no están en la lista cerrada de 03c1, o que sí están pero con aserciones que la lista no nombra. Lint y build pasan, y las 47 rojas de la ronda 0 (23 archivos) ya están verdes. No toqué ninguna `*.ataque` ni nada de "No se toca" fuera de lo que DH-06 autoriza.

```
Plan: docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md (SHA-256 2ec5f987…6ee31, 1059 líneas, Enmiendas 1 a 4)
Pasos completados: 1 a 6 de 03c1; paso 7 (verificación) con PARADA
```

## PARADA: rojos fuera de lo permitido
Corrida: `npm run test` desde `frontend/` dio `Test Files  4 failed | 237 passed (241)` · `Tests  8 failed | 5359 passed (5367)` · `Duration 179.66s`. No hubo «Hook timed out».

1. **`src/app/marco.test.tsx` › «O-14: con la clase nueva ya en la caché, … va al encabezado «Publicaciones» …»** (`:305`).
   - Es una prueba normal fuera de la lista cerrada.
   - Fija `heading { name: "Publicaciones", level: 2 }`, que §D-13 cambia a "Avisos".
   - Es hermana de `foco-02c-r4` y `foco-02c-r5` (P-03c1-1).
   - Cambio mínimo: `"Publicaciones"` → `"Avisos"`.
2. **`src/app/router-01d.test.tsx`, cinco casos CAL-1D06 del indicador** (`:178-200`).
   - Afirman `w-1/5`, `grid-cols-5` y `translate-x-[200%]`/`[300%]`/`[400%]`, y entran por `…/alumnos` y `…/maestros`.
   - El archivo sí está en la lista cerrada, pero solo para "nombres de las secciones y rutas", y eso sí lo cambié. Las aserciones del indicador no las nombra la lista, así que no las toqué.
   - Cambio mínimo: medidas simuladas, como `clase-layout.test.tsx`.
3. **`src/features/tareas/recuperar-ch3.test.tsx` › «CH3-A19: … ir a «Trabajo de clase» y volver al detalle …»** (`:470`).
   - Pulsa `link { name: /Trabajo de clase/ }`.
   - Es una prueba normal de `features/tareas`, que está en "No se toca".
   - Cambio mínimo: `/Actividades de aprendizaje/`. Es la hermana normal de la `*.ataque` `features/tareas/formularios-ch3-r1` que el tester ya cambió.
4. **`src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` › «roster y «Personas» montados juntos: el foco de «Ver más» de «Personas» va a su fila nueva …»** (`:311`).
   - Monta `PersonasView` en la ruta del maestro (`/maestro/clases/:claseId/alumnos`) y espera la lista del estudiante (`[data-persona-id]`).
   - Con §D-7.7, `PersonasView` del maestro muestra sus maestros y el roster, que es justo lo que el plan pide.
   - En la ronda 0 el tester la anotó como "sin cambio" bajo C-13. Le corresponde al tester reescribirla, por ejemplo montándola en una ruta de estudiante.

Corregí en mi código, sin tocar la prueba, un rojo que salió en la primera corrida: `muro-c-r1.ataque` › «PersonasView sin :claseId muestra «No tienes acceso…»». Era un fallo mío: el maestro y el admin pintaban el mensaje dos veces. Ahora las ramas del maestro y del admin van dentro de un solo `ConClaseDeLaRuta` y el caso pasa.

## Archivos
**Nuevos:**
- `frontend/src/components/seccion/hooks.ts` (DH-06) y su prueba `hooks.test.tsx`
- `frontend/src/features/clases/secciones-03c1.test.tsx`
- `frontend/src/features/clases/textos-03c1.test.ts`
- `frontend/src/app/clase-03c1.test.tsx`

**Modificados, código:**
- `features/calificaciones/hooks.ts`: DH-06. Una línea de reexportación y se borra la copia. También quité las importaciones que quedaron sin uso (`useRef` y la línea `import { useLocation } from "react-router"`), que el lint exige.
- `features/clases/data.ts`:
  - los textos de §D-13 de 03c, incluidas las claves `recursos` y `dudas` de `TEXTOS_CLASE` y `TEXTOS_TEMAS.consecuenciaSinConteo`;
  - `SECCIONES_DE_LA_CLASE`, la misma lista para las tres perspectivas;
  - salen `crearTarea` de `CAPACIDADES_POR_PERSPECTIVA`, `CLASES_DEL_INDICADOR_POR_SECCIONES` y `CLASES_DE_LA_REJILLA_POR_SECCIONES`;
  - `CLASES_DE_POSICION_DEL_INDICADOR` queda con dos valores.
- `features/clases/types.ts`: sale `crearTarea`; entran `MedidaDeOpcion`, `MedidaDelPanel` y `MedidaDelIndicador`.
- `features/clases/lib.ts`: `medidaDelIndicador` y `desplazamientoParaVer`.
- `features/clases/hooks.ts`: `useIndicadorDeSecciones`, con `useLayoutEffect` que mide y desplaza solo al montar y al cambiar de sección, más `ResizeObserver` y `document.fonts.ready` si existen.
- `components/secciones-de-clase.tsx`:
  - `flex` con cada `li` en `shrink-0` y los enlaces en `whitespace-nowrap`;
  - el indicador usa `style` solo con `--indicador-x`/`--indicador-ancho`, y las clases `translate-x-(--indicador-x)` y `w-(--indicador-ancho)`, sin corchetes.
- `app/router.tsx`: `personas` en las tres ramas; `alumnos` (maestro y admin) y `maestros` (admin) redirigen a `../personas` con `replace`. `AlumnosView` y `MaestrosDeClaseView` ya no tienen ruta propia.
- `personas-view.tsx`: decide por la perspectiva.
  - Estudiante: lo de antes.
  - Maestro: `MaestrosDeLaClaseEnLectura`, que es `useClase` con `ListaMaestrosDeClase` y `puedeQuitar={false}`, sin cambiar ese componente; después `AlumnosView`.
  - Admin: `MaestrosDeClaseView` y después `AlumnosView`.
- `components/buscador-de-maestros.tsx` (`:67`, `:91`, `:136`) y `maestros-de-clase-view.tsx:29`: el atributo pasa a `data-candidato-maestro-id` (§D-7.7).
- `muro-view.tsx`: sin "Crear tarea"; el efecto de T-35 pasa a `useAlPulsarLaSeccionActiva`.
- `trabajo-view.tsx` y `components/seccion-de-tema.tsx`: usan el gancho compartido; vuelven a pedir solo lo que está en error.

**Modificados, lista cerrada** (`git diff --stat`, 8 archivos, +210 −135):
- `clase-layout.test.tsx`:
  - los nombres y el orden de las secciones;
  - las rutas `alumnos`/`maestros` pasan a `personas` en el montaje;
  - las aserciones del indicador pasan a medidas simuladas (`--indicador-x`, `--indicador-ancho`), con `vi.restoreAllMocks` en `afterEach`;
  - los comentarios de N-47 se reescribieron con sus aserciones.
- `lib.test.ts`: la tabla de secciones; los casos de `indiceDeSeccionActiva` con `personas` y `calificaciones` (`alumnos` y `maestros` dan −1); cinco casos nuevos de CL3-C03.
- `tarjeta-de-tarea.test.tsx`: PR-1D06 pasa a "«Crear tarea» ya no está en Avisos en ninguna perspectiva".
- `muro-view.test.tsx`: los textos de §D-13 (vacíos de las tres perspectivas, "Ver más avisos", R1, `h2` "Avisos" y el `Link` local "Avisos"); el título de PR-2C09. Los demás títulos de caso conservan los nombres viejos; solo cambié aserciones.
- `trabajo-view.test.tsx`: el vacío y la recarga fallida.
- `recuperar-ch3.test.tsx`: `TEXTOS_CLASE.muro` → `TEXTOS_CLASE.avisos`.
- `maestros-de-clase-view.test.tsx`: la frase de la consecuencia.
- `router-01d.test.tsx`: solo los nombres de las secciones y "Avisos" en el primer `it.each`.

## Verificación (frontend; no toqué `shared/` ni el backend)
| Comando | Última línea |
|---|---|
| `npm run lint` | exit 0, `> tsc -b` |
| `npx vitest list \| grep -acE "^src/"` | 5367 casos |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | 241 archivos |
| `npm run test` | `Test Files  4 failed \| 237 passed (241)` · `Tests  8 failed \| 5359 passed (5367)` (los 8 de la PARADA) |
| `npm run build` | exit 0, `✓ built in 786ms` |

- Frente a la base de 237/5310 son +4 archivos y +57 casos: 4, 12, 5 y 31 de los archivos nuevos, más 5 en `lib.test.ts`.
- También comprobé con una mutación que CL3-C13 (a) detecta un `SeccionDeTema` sin el gancho, y restauré el archivo.

## Pruebas requeridas › 03c1
- **CL3-C01** (`features/clases/secciones-03c1.test.tsx`): «CL3-C01: %s ve las cuatro secciones en orden, sin «Foro», y la activa lleva aria-current y text-link», con estudiante, maestro y admin.
- **CL3-C02** (mismo archivo):
  - «CL3-C02: lleva la posición y el ancho de la opción activa, y cambian al navegar a otra sección»
  - «CL3-C02: usa las dos variables medidas, el color del contexto opaco y sin animación con movimiento reducido»
  - «CL3-C02: en %s no hay indicador ni sección activa», con «Editar clase», «Categorías de calificación» y el detalle de una tarea
  - «CL3-C02: un ResizeObserver vuelve a medir sin desplazar el panel»
  - «CL3-C02: la carga de las fuentes vuelve a medir; sin ResizeObserver ni document.fonts no falla»
- **CL3-C03** (`features/clases/lib.test.ts`):
  - «CL3-C03: el indicador toma la posición y el ancho de la opción activa»
  - «… una opción ya a la vista no desplaza el panel (null), tampoco en sus bordes exactos»
  - «… cortada a la derecha …»
  - «… cortada a la izquierda …»
  - «… una opción más ancha que el panel alinea su inicio»
- **CL3-C04** (`secciones-03c1.test.tsx`):
  - «CL3-C04: al entrar con una sección que no cabe, el panel desplaza su scrollLeft para dejarla a la vista; la página no se desplaza»
  - «CL3-C04: con la sección activa a la vista, el panel no se desplaza»
- **CL3-C05** (`app/clase-03c1.test.tsx`):
  - «CL3-C05: %s en …/personas monta «Personas» con su sección activa» (×3)
  - «CL3-C05: %s en …/%s llega a …/personas con replace: atrás no vuelve a la ruta vieja», con maestro/alumnos, admin/alumnos y admin/maestros
  - «CL3-C05: %s en …/trabajo sigue montando «Actividades de aprendizaje»» (×3)
- **CL3-C06** (mismo archivo):
  - «CL3-C06: el estudiante ve lo de antes: su maestro con correo y sus compañeros, sin buscador»
  - «CL3-C06: el maestro ve sus maestros de solo lectura (sin «Quitar») y el roster con el buscador, sin petición nueva para los maestros»
  - «CL3-C06: el admin ve la asignación de maestros y el roster con el buscador, maestros arriba»
- **CL3-C07** (mismo archivo):
  - «CL3-C07: con el foco en una fila del buscador de alumnos que pierde su botón, el foco va al siguiente «Agregar», no al encabezado de los maestros»
  - «CL3-C07: el buscador de maestros sigue su regla: al llegar a dos maestros desaparece y el foco va al encabezado de los maestros»
- **CL3-C12** (mismo archivo):
  - (a) «CL3-C12 (a): pulsar «Avisos» estando en Avisos pide la primera página sin cursor y la frase desaparece»
  - (b) «CL3-C12 (b): ir a «Personas» y volver a «Avisos» antes de 30 s pide la lista y la frase desaparece»
  - (c) «CL3-C12 (c): atrás y adelante del historial piden la lista y la frase desaparece»
  - (d) «CL3-C12 (d): con la frase a la vista no hay «Ver más avisos»»
  - Lista sana: «CL3-C12: con la lista sana, pulsar «Avisos» no pide nada»
- **CL3-C13** (mismo archivo):
  - (a) «CL3-C13 (a): pulsar «Actividades de aprendizaje» estando ahí pide la primera página del tema en error (sin cursor) y los temas sanos no piden nada»
  - (a), lista en error: «CL3-C13 (a): con la lista de temas en error, pulsar «Actividades de aprendizaje» la vuelve a pedir»
  - (b) «CL3-C13 (b): ir a «Personas» y volver antes de 30 s pide el tema y la frase desaparece»
  - (c) «CL3-C13 (c): atrás y adelante del historial piden el tema y la frase desaparece»
  - (d) «CL3-C13 (d): con la frase a la vista no hay «Ver más de Unidad 1»»
- **CL3-C16** (`components/seccion/hooks.test.tsx`):
  - «CL3-C16: no llama a su función al montar ni en otro render con la misma location.key»
  - «CL3-C16: llama a su función una vez por cada location.key nueva en la misma ruta»
  - «CL3-C16: al ir a otra ruta la vista se desmonta y no llama a su función; al volver, montar tampoco cuenta»
  - «CL3-C16: features/calificaciones lo reexporta: es la misma función»
  - Las pruebas de `features/calificaciones` siguen verdes sin cambio.
- **CL3-C17** (`features/clases/textos-03c1.test.ts`): cinco casos «CL3-C17: …» (nombres de las secciones; Avisos con sus vacíos y R1; Actividades con R2 y la recarga fallida; la consecuencia de quitar un maestro; sin la capacidad `crearTarea`).
- **CL3-C18** (`app/clase-03c1.test.tsx`), y PR-1D06 de `tarjeta-de-tarea.test.tsx`:
  - «CL3-C18: %s no ve «Crear tarea» en Avisos» (×3)
  - «CL3-C18: el vacío de %s dice «%s»» (×3)
  - «CL3-C18: «Ver más avisos» queda en espera mientras la lista se pide y vuelve a estar disponible al llegar»

**Caminos de R1 y R2** (§D-10): todos usan el router real y `Providers` (staleTime 30 s, un reintento). Los casos son los de CL3-C12 y CL3-C13 de arriba; para (c), el historial empieza en Personas, se provoca la frase y se hace `navigate(-1)` y `navigate(1)`.

## Matriz de avisos, recargas y foco de 03c1 (§D-14)
**Avisos (`MuroView`).**
- **Primera carga** con `403`, 5xx o red: `MensajeError` en la lista, sin aviso; el foco no se mueve.
- **"Ver más avisos" con `400` del cursor:** R1 reemplaza la lista y no hay aviso. Si el foco estaba en el botón, va al `h2` «Avisos» (`useFocoAlPasarAError`). "Ver más avisos" no se ofrece mientras está R1.
- **"Ver más avisos" con 5xx o red:** `MensajeError` con su texto; el foco va al `h2`, como antes (muro-c-r3).
- **Recarga con error y datos:** la vista pasa a error y el foco va al `h2` si se perdió (T-04, sin cambio).
- **Pulsar «Avisos» estando ahí:** con error, vuelve a pedir la primera página, sin aviso, y el foco se queda en el enlace. Con la lista sana, no pide nada.
- **En vuelo a la vez:** "Ver más avisos" usa `enEspera={isFetching}` y `cancelRefetch: false`; un doble clic hace una sola petición (cargar-mas-02c-r2).
- **Con la vista desmontada:** las consultas de lista no avisan.
- **Error que redirige `apiClient`:** ningún aviso.

**Actividades de aprendizaje (`TrabajoView` y `SeccionDeTema`).**
- **Primera carga de los temas con error:** `MensajeError` y ningún aviso.
- **Recarga de los temas con datos que falla:** un aviso por fallo con «No pudimos actualizar Actividades de aprendizaje…»; montar con el fallo ya ocurrido no avisa.
- **"Ver más de `<tema>`" con `400`:** R2 en esa sección; si el foco estaba en el botón, va al `h3` del tema. Las demás secciones siguen igual.
- **Pulsar «Actividades de aprendizaje» estando ahí:** vuelve a pedir solo el tema en error y la lista de temas si está en error; lo sano no pide nada, sin aviso.
- **"Subir"/"Bajar", temas y "Mover":** sin cambio en 03c1 (la espera hasta la lista por sección es de 03c2).
- **Con la vista desmontada:** nada nuevo.
- **Error que redirige:** ningún aviso.

**Personas.**
- **Estudiante:** sin cambio.
- **Maestro, panel de maestros:** lee la caché del encabezado, sin petición nueva. Con error, `MensajeError` en el panel; cargando, `Cargando`; no tiene controles. El buscador y el roster siguen como en `AlumnosView`.
- **Admin:** la matriz de `MaestrosDeClaseView` y de `AlumnosView` sin cambio. Lo que cambia es que perder el foco en una fila del buscador de alumnos ya no lo manda al `h2` «Maestros de la clase»: el atributo es `data-candidato-maestro-id` (CL3-C07).
- **Sin `:claseId` válido:** un solo «No tienes acceso a esta clase.».
- Formularios (comentario, clase, tema; O-16 y las guardas): son de 03c2.

## Desviaciones y notas
1. `features/calificaciones/hooks.ts`: además de la línea de reexportación, quité `useRef` de su importación de `react` y la línea `import { useLocation } from "react-router"`, que quedaron sin uso al borrar la copia.
2. `TEXTOS_CLASE.recursos` y `.dudas` y `TEXTOS_TEMAS.consecuenciaSinConteo` ya están en `data.ts`: son textos de §D-13 de 03c. Las secciones "Recursos" y "Dudas" todavía no están en la lista.
3. `TEXTOS_TRABAJO.crearTarea` ahora es el literal "Crear tarea", porque `TEXTOS_MURO.crearTarea` desapareció. El texto no cambia.
4. La medida del indicador va en estado de React (`useState`) y se aplica por `style`, solo con las dos variables (A-01).
5. Los títulos de los casos de `muro-view.test.tsx` conservan los nombres viejos, salvo PR-2C09; cambié solo las aserciones y un comentario. En `clase-layout.test.tsx` sí actualicé los títulos junto con sus aserciones y comentarios (N-47).

Para cerrar 03c1 falta la decisión sobre los cuatro rojos de la PARADA.

## Cierre de la PARADA (Enmienda 5)
Apliqué solo las tres filas de la Enmienda 5 (E5-2 a E5-4) de la lista cerrada de 03c1, con el plan `84074f4a…` ("LISTO (Enmiendas 1 a 7 aplicadas)"). La fila de `features/tareas` la aplico con la autorización del humano (2026-10-29, "si, apruebo"), que me transmitió el orquestador. No toqué ninguna `*.ataque`, ni código de producción, ni `shared/` ni el backend.

**Cambios**
1. `frontend/src/app/marco.test.tsx`, caso O-14 (`:302` título y `:305` aserción):
   - título: "…va al encabezado «Publicaciones» y no…" → "…va al encabezado «Avisos» y no…";
   - aserción: `getByRole("heading", { name: "Publicaciones", level: 2 })` → `getByRole("heading", { name: "Avisos", level: 2 })`.
2. `frontend/src/app/router-01d.test.tsx`, los cinco casos CAL-1D06 del indicador (antes `:178-200`). Respeté los cambios previos del árbol (el primer `it.each` con "Avisos" y las secciones nuevas).
   - Caso del admin en `…/calificaciones`: antes afirmaba `grid-cols-5` y `w-1/5`, `translate-x-[400%]`; ahora conserva `aria-hidden="true"` y afirma `--indicador-x`/`--indicador-ancho` iguales a los medidos de la opción 3. Título: "…el indicador mide un quinto (w-1/5, grid-cols-5) y … translate-x-[400%]" → "…en «Calificaciones» el indicador lleva la posición y el ancho medidos de esa opción (--indicador-x, --indicador-ancho)".
   - `it.each` de cuatro filas: antes `[rol, segmento, translate-x-[…%], w-1/n]` con `admin/alumnos`, `admin/maestros`, `maestro/alumnos`, `maestro/calificaciones`; ahora `[rol, segmento, indice]` con `admin/personas/2`, `admin/personas/2`, `maestro/personas/2`, `maestro/calificaciones/3`, y afirma las medidas simuladas de esa opción. Título: "…el indicador sigue en %s (las posiciones de Alumnos y Maestros no cambian) y mide %s" → "…el indicador lleva la posición y el ancho medidos de la opción %i" (las columnas de clase que interpolaba ya no existen).
   - Para medir: `simularMedidas`, `medidasDelIndicador` y `medidasDeLaOpcion`, copiados de `features/clases/clase-layout.test.tsx` (espías de `offsetLeft`/`offsetWidth`), `vi.restoreAllMocks()` en el `afterEach` y `waitFor` sumado a la importación de `@testing-library/react`. Ninguna otra aserción del archivo cambió.
   - Nota: las filas `admin/alumnos` y `admin/maestros` llevan ahora a la misma ruta `…/personas`, así que quedan dos filas iguales. Conservé las cinco ejecuciones para no cambiar el número de casos; si el manager prefiere quitar la fila duplicada, es una línea.
3. `frontend/src/features/tareas/recuperar-ch3.test.tsx`, CH3-A19:
   - `:449` título: "ir a «Trabajo de clase» y volver" → "ir a «Actividades de aprendizaje» y volver";
   - `:470`: `getByRole("link", { name: /Trabajo de clase/ })` → `getByRole("link", { name: /Actividades de aprendizaje/ })`.

**`git diff --stat` de los tres archivos** (contra HEAD; `router-01d.test.tsx` incluye los cambios previos de 03c1):
```
 frontend/src/app/marco.test.tsx                    |  4 +-
 frontend/src/app/router-01d.test.tsx               | 74 +++++++++++++++++-----
 .../src/features/tareas/recuperar-ch3.test.tsx     |  4 +-
 3 files changed, 63 insertions(+), 19 deletions(-)
```

**Verificación** (desde `frontend/`, una tras otra)
| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (sin errores, código de salida 0; antes: `All matched files use Prettier code style!`) |
| `npx vitest list \| grep -acE "^src/"` | `5367` casos |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `241` archivos |
| `npm run test` | `Test Files  241 passed (241)` · `Tests  5367 passed (5367)` · `Duration  179.97s`. No hubo «Hook timed out». |
| `npm run build` | `✓ built in 820ms` (con el aviso de siempre de trozos de más de 500 kB) |

El cuarto rojo de la PARADA (`foco-pestana-02d-r3.ataque.test.tsx:311`) también está verde en esta corrida; no lo toqué (le correspondía al tester).

**Hermanos:** las tres filas son hermanas del mismo cambio de textos y del indicador de §D-13 y §D-7.2. Con la suite completa en verde, no queda otra prueba normal con "Publicaciones", "Trabajo de clase" o las clases viejas del indicador que esté roja.
