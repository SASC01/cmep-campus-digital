# Resumen del programador — CLASES-03d (frontend de Recursos)

Fecha: 2026-11-03. Plan: `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md` (SHA-256 `49b47f652220bfc7220b936743bdad2daeacad5910d1f2b5f25fdaf004cba6d2`, "LISTO (Enmiendas 1 a 12 aplicadas)"). Base dentro de los paquetes: `e462444` (K3c2). Arbitrajes seguidos: "Arbitraje de la ronda 0 — 03d" (sus 8 indicaciones literales) y "Arbitraje de la PARADA del programador — 03d" (secciones 2 a 5, con E12-1 y E12-3). La PARADA de CH3-B01 quedó resuelta por la Enmienda 12. Solo `frontend/`; no toqué ninguna `*.ataque`, `features/tareas`, `shared/` ni el backend.

```
Plan: docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md
Pasos completados: 7 de 7 (el paso 8 es del orquestador)
```

## Verificación (desde `frontend/`, una tras otra)

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0; antes, `All matched files use Prettier code style!`) |
| `npx vitest list \| grep -acE "^src/"` | `5694` |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `261` |
| `npx vitest run` | `Test Files  1 failed \| 260 passed (261)` · `Tests  1 failed \| 5693 passed (5694)` · `Duration  577.39s`. «Hook timed out»: 0. El único rojo fue `features/tareas/tareas-01d-r1.ataque.test.tsx` › "con 20 criterios, «Agregar criterio» no agrega…" con `Error: Test timed out in 15000ms` (24 763 ms, carga; archivo que 03d no toca) |
| `npx vitest run src/features/tareas/tareas-01d-r1.ataque.test.tsx` (solo ese archivo) | `Test Files  1 passed (1)` · `Tests  18 passed (18)` |
| `npm run build` | `✓ built in 3.28s` |
| `prisma validate` / `build` de `shared/` | n/a (03d no toca `shared/` ni el backend) |

## Conteos (de `npx vitest list` de la verificación)

- **5694 casos en 261 archivos.** Base 5567 / 255 (adenda 1 de la ronda 0).
- Archivos nuevos (6): `recursos-03d.test.tsx` 42, `recursos-caminos-03d.test.tsx` 29, `editar-recurso-03d.test.tsx` 31, `avisos-03d.test.tsx` 10, `recursos-lib-03d.test.ts` 16 y `formulario-recurso.test.tsx` 10 = **138**.
- `formulario-publicacion.test.tsx`: **35 → 18** (`npx vitest list` de ese archivo antes del cambio: 35; `git show e462444:…` cuenta 35 `it(`). Salen 17: 8 pasan a `formulario-recurso.test.tsx` (PR-C09f, "un material sin descripción…", PR-1E04 ×2 de `:818` y `:845`, PR-1E04 de `:891`, PR-1E08 ×3) y **9 se retiran** con su motivo (abajo). `formulario-recurso.test.tsx` suma además 2 casos nuevos con la parte del título de PR-C12h y de PR-C15b (E12-3: "como un caso nuevo"): 8 + 2 = 10.
- `errores-ch3.test.ts`: 21 → 24 (E6 (b) y (c): `FILAS_POR_MODO` 2 → 4 filas de recurso, `MODOS` 1 → 2).
- `errores-ch3-r1.ataque.test.ts`: 91 → **94** (su `it.each(CODIGOS_CON_MENSAJE_DEL_SERVIDOR)` de `:273` recorre los 3 códigos nuevos; el archivo no cambió).
- Cuenta: 5567 − 17 + 138 + 3 + 3 = 5694.

**Los 9 retirados de `formulario-publicacion.test.tsx`** (E12-3 D; en su lugar queda el comentario "CLASES-03d, Enmienda 12: sin el control del tipo no queda propiedad que probar; §7.3 del control segmentado la prueban «Crear tarea» (`features/tareas`) y `segmentado-02d-r1.ataque`"):
1. "PR-2D05: el elegido lleva aria-pressed y el Check delante del texto, y cambia con el otro"
2. "PR-2D05: el indicador es aria-hidden, se traslada con «Material» y no tiene transición con movimiento reducido"
3. "PR-2D05: el indicador usa --surface y, en contexto opaco, --accent-soft"
4. "PR-2D05: el grupo va en vidrio fuerte (no en otra Card) y con rounded-card"
5. "PR-2D05: los dos botones se alcanzan con teclado: son botones nativos, en orden y sin tabindex negativo"
6. "PR-2D05: el botón principal cambia de texto como hasta ahora"
7. "PR-2D05: cambiar de tipo con texto escrito no lo borra"
8. "PR-2D05: cambiar de tipo con la publicación en vuelo no cambia lo que se envía ni quita la espera"
9. "PR-1E04 · O-18: con una publicación en vuelo, cambiar de tipo no cambia el texto del botón ni el tipo enviado"

## Archivos

**Producción, nuevos:** `features/clases/recursos-view.tsx` (194), `editar-recurso-view.tsx` (150), `components/seccion-de-recursos.tsx` (185), `components/elemento-de-recurso.tsx` (207), `components/formulario-recurso.tsx` (412).
**Producción, modificados:** `features/clases/data.ts`, `types.ts`, `lib.ts`, `hooks.ts`, `components/formulario-publicacion.tsx` (solo anuncios), `app/router.tsx`.
**Pruebas nuevas:** `features/clases/recursos-03d.test.tsx`, `recursos-caminos-03d.test.tsx`, `editar-recurso-03d.test.tsx`, `avisos-03d.test.tsx`, `recursos-lib-03d.test.ts`, `formulario-recurso.test.tsx`.
**Pruebas normales de la lista cerrada, cambiadas:** `features/clases/errores-ch3.test.ts` (E6 (a)–(e) y E12-1), `formularios-ch3.test.tsx` y `recuperar-ch3.test.tsx` (decisión (1), aceptada; E12-4), `muro-view.test.tsx` (PR-2C07, indicación literal de la sección 3), `formulario-publicacion.test.tsx` (E12-3), `clase-layout.test.tsx`, `app/router-01d.test.tsx`, `lib.test.ts` y `secciones-03c1.test.tsx` ("Recursos" en su lugar, con índices, medidas, `toHaveLength` y ordinales). `app/clase-03c1.test.tsx`, `app/router.test.tsx` y `app/router-01e.test.tsx` quedaron verdes sin cambio.

`git diff --stat e462444 -- frontend ':!*.ataque.test.*'` → `15 files changed, 717 insertions(+), 693 deletions(-)` (los 15 archivos rastreados de arriba) más los 11 archivos nuevos sin rastrear (`git status --short`), con las líneas indicadas (`wc -l`): avisos-03d 573, editar-recurso-03d 874, formulario-recurso.test 286, recursos-03d 1292, recursos-caminos-03d 756, recursos-lib-03d 170.

## Pruebas requeridas (03d): viñeta → archivo y título exacto

Rutas relativas a `frontend/src/features/clases/`. Los títulos con «%s» o `$campo` son `it.each`: se cita el patrón y cada instancia sale en `npx vitest list`.

- **CL3-D01** →
  - `recursos-03d.test.tsx` › "CL3-D01: dos bloques en orden con su h2; en cada uno «Sin tema» y los temas con recursos de ese bloque, en su orden; un tema sin recursos del bloque no aparece"
  - › "CL3-D01: un bloque sin recursos dice su vacío, y el error de un bloque no tapa el otro"
  - › "CL3-D01: si los dos bloques fallan su recarga con datos, cada aviso lleva el mismo id (uno visible); montar la vista con los fallos ya ocurridos no avisa"
  - `recursos-lib-03d.test.ts` › "CL3-D01: «Sin tema» si tiene recursos y después los temas con recursos, en su orden; un tema sin recursos no aparece"
- **CL3-D02** → `recursos-03d.test.tsx` › "CL3-D02: pide los temas de cada bloque, la primera página de 5 de cada sección y «Ver más» de 20 con cursor"; › "CL3-D02: como máximo 6 lecturas a la vez; al desmontar, las que esperan en la fila no salen"
- **CL3-D03** → `recursos-03d.test.tsx` › "CL3-D03: insignia «Recurso» con icono y texto, firma «Administración», fecha, título y «Ver recurso» con la descripción en texto plano, los adjuntos y «Ver comentarios (n)»"
- **CL3-D04** → `recursos-03d.test.tsx` › "CL3-D04: el maestro ve «Editar recurso», «Borrar recurso» y «Mover» solo donde el servidor los permite"; › "CL3-D04: el estudiante nunca ve las acciones, aunque el dato diga true"
- **CL3-D05** → `recursos-03d.test.tsx` › "CL3-D05: la confirmación dice la frase según los adjuntos, el foco va a «Cancelar»; al confirmar con doble clic sale un DELETE, el aviso y el foco al «Borrar recurso» de la vecina"; › "CL3-D05: borrar el último recurso de una sección con el foco dentro lleva el foco al encabezado de la sección vecina del mismo bloque y, sin vecinas, al h2 del bloque" (condición del arbitraje para `data-seccion-de-recursos`); › "CL3-D05: con 403 BORRADO_NO_PERMITIDO, el aviso, la lista se renueva y el botón desaparece; con 404, la fila desaparece"
- **CL3-D06** → `recursos-03d.test.tsx` › "CL3-D06: con éxito, el aviso, se renuevan los recursos, los temas y la edición del recurso, y el foco va al «Mover» de la vecina"; › "CL3-D06: con 403 MOVER_NO_PERMITIDO, el aviso del servidor, la lista se renueva, «Mover» desaparece y el foco va al h3 de la sección"
- **CL3-D07** → `recursos-03d.test.tsx` › "CL3-D07: %s comenta dentro de «Ver recurso» y el conteo de la lista de recursos se renueva" (estudiante y maestro); › "CL3-D07: el admin lee los comentarios sin formulario"
- **CL3-D08** (con la indicación 8: tras el `201` se vuelven a pedir `GET …/temas?seccion=docente` y `…/recursos?bloque=docente&tema=<Unidad 1>`) → `recursos-03d.test.tsx` › "CL3-D08: el maestro ve «Se publicará en Recursos del docente.»; el cuerpo es el del recurso; al 201, el aviso, los campos vacíos y se vuelven a pedir los temas del bloque y la lista de la sección"; › "CL3-D08: el admin ve «Se publicará en Recursos de aprendizaje.» y el estudiante no ve el formulario"; `recursos-lib-03d.test.ts` › "CL3-D08: el recurso nuevo es el data del esquema: archivoIds siempre, temaId solo si se eligió, sin bloque ni version"
- **CL3-D09** → `recursos-03d.test.tsx` › "CL3-D09: una subida por archivo, la lista fija mientras se publica y un doble envío da un solo POST"; › "CL3-D09: si falla la subida de un archivo, el aviso lo nombra y no se publica"
- **CL3-D10** → `recursos-03d.test.tsx` › "CL3-D10: sin temas no hay campo «Tema»; con la lista fallida, la nota en línea"; › "CL3-D10: con 404 TEMA_NO_ENCONTRADO se renuevan los temas y el campo vuelve a «Sin tema»"; además los seis PR-1E04/PR-1E08 de `formulario-recurso.test.tsx` (E12-3 C)
- **CL3-D11** → `editar-recurso-03d.test.tsx` › "CL3-D11: el formulario nace con el recurso; «Guardar cambios» envía la versión y la lista final de archivoIds con un solo PUT; al éxito, el aviso y vuelve a Recursos"; › "CL3-D11: lectura fresca al abrir: con el recurso viejo en caché, espera la lectura y nace con la versión nueva"; `recursos-lib-03d.test.ts` › "CL3-D11: el recurso editado lleva version, temaId (null con «Sin tema») y la lista de archivoIds"
- **CL3-D12** → `editar-recurso-03d.test.tsx` › "CL3-D12: el aviso del servidor; «Guardar cambios» sigue en espera hasta la recarga; el formulario se reinicia con la versión nueva y el foco va a «Título del recurso»"; › "CL3-D12: si la recarga tras el 409 falla, lo escrito y la versión se conservan y sale el aviso de recarga fallida"
- **CL3-D13** → `editar-recurso-03d.test.tsx` › "CL3-D13: al guardar con %s, un aviso, la vista se reemplaza por su mensaje con «Volver a Recursos» y el foco va a la raíz" (404, 403 EDICION_NO_PERMITIDA, 403 SIN_ACCESO_A_LA_CLASE); › "CL3-D13: en la primera carga con %s, el mensaje y «Volver a Recursos»" (404, un VALIDACION de recursoId, 403 SIN_ACCESO_A_LA_CLASE); › "CL3-D13: con `puedeEditar: false`, «No puedes editar este recurso.» y «Volver a Recursos»"; `recursos-lib-03d.test.ts` › "CL3-D13: reemplazan la vista la primera carga, el 404, el 403 de la clase y un VALIDACION de claseId o recursoId"
- **CL3-D14** → `editar-recurso-03d.test.tsx` › "CL3-D14: un aviso por fallo con la variante por error; volver a montar la vista no lo repite y «Guardar cambios» envía el PUT"; `recursos-lib-03d.test.ts` › "CL3-D14: sin conexión o con un 5xx, «revisa tu conexión»; con otra respuesta (429), «inténtalo de nuevo en un momento»". La red se simula con `fetch` rechazado; no se fijó el reloj porque la vista no muestra textos relativos al tiempo.
- **CL3-D15** → `recursos-03d.test.tsx` › "CL3-D15: con «%s» un solo aviso legible, ningún ErrorDeCampo, lo escrito se conserva y el botón sale de la espera" (temaId:, version:, vacío, solo espacios, archivoIds.0:)
- **CL3-D16** → `editar-recurso-03d.test.tsx` › "CL3-D16: con «%s» un solo aviso legible, ningún ErrorDeCampo, lo escrito se conserva y el botón sale de la espera" (version:, tipo:, vacío, solo espacios, archivoIds.1:)
- **CL3-D17** → crear: `recursos-03d.test.tsx` › "CL3-D17: tras un «%s» del servidor, un envío con el título vacío muestra solo «Escribe el título del recurso»" (titulo:, texto:); editar: `editar-recurso-03d.test.tsx` › "CL3-D17: tras un «titulo:» del servidor, un envío con el título vacío muestra solo «Escribe el título del recurso»"
- **CL3-D18** → `recursos-lib-03d.test.ts` › "CL3-D18: en modo %s recorre ENTRADAS_FUERA_DE_CONTRATO (null y un aviso legible) y pinta solo titulo y texto" (crear y editar); además `errores-ch3.test.ts` › CH3-B15 (1) y (2) con las filas y modos de recurso
- **CL3-D19** → `avisos-03d.test.tsx` › "CL3-D19: solo «Anuncio», los adjuntos y «Publicar anuncio»; sin tipo, título ni tema, no pide los temas y envía { tipo: anuncio, texto, archivoIds }"; `formulario-publicacion.test.tsx` › "PR-C09a · CL3-D19: el formulario de Avisos no tiene grupo «Tipo de publicación», ni botón «Material», ni campos «Título…» o «Tema», y no pide los temas"; `recursos-lib-03d.test.ts` › "CL3-D19: el anuncio validado es { tipo: anuncio, texto normalizado, archivoIds: [] } sin título ni tema"
- **CL3-D20** → `avisos-03d.test.tsx` › "CL3-D20: con «%s» un solo aviso legible, ningún ErrorDeCampo, lo escrito se conserva y el botón sale de la espera" (titulo:, temaId:, vacío, solo espacios, archivoIds.0:); › "CL3-D20: tras un «texto:» del servidor, un envío vacío muestra solo «Escribe el anuncio»" (la secuencia); `recursos-lib-03d.test.ts` › "CL3-D20: recorre ENTRADAS_FUERA_DE_CONTRATO y solo pinta texto; titulo y temaId se avisan"
- **CL3-D21** → `avisos-03d.test.tsx` › "CL3-D21: con un 400 de «titulo:» en vuelo y al asentarse, nunca aparece un campo de título"; `formularios-ch3.test.tsx` › "CH3-B16 (e): en el anuncio, tras el aviso de «titulo:», no aparece ningún campo de título ni un error bajo él"
- **CL3-D22** → anuncio: `avisos-03d.test.tsx` › "CL3-D22: montado, un VALIDACION de texto: va bajo «Anuncio» y no avisa"; › "CL3-D22: desmontado con la publicación en vuelo, un VALIDACION de texto: da un aviso". Recurso, crear: `recursos-03d.test.tsx` › "CL3-D22: montado, un VALIDACION de titulo: va bajo el campo y no avisa"; › "CL3-D22: desmontado con la petición en vuelo, un VALIDACION de «%s» da un aviso" (titulo:, texto:). Recurso, editar: `editar-recurso-03d.test.tsx` › "CL3-D22: montado, un VALIDACION de texto: va bajo la descripción y no avisa"; › "CL3-D22: desmontado con el PUT en vuelo, un VALIDACION de titulo: da un aviso"
- **CL3-D23** → `recursos-caminos-03d.test.tsx` › "CL3-D23 (a): en $titulo, pulsar «Recursos» estando ahí pide la primera página del tema en error (sin cursor); los temas sanos no piden nada"; "(b): … ir a «Avisos» y volver antes de 30 s pide el tema y la frase desaparece"; "(c): … atrás y adelante del historial piden el tema y la frase desaparece"; "(d): … con la frase a la vista no se ofrece «Ver más»" — cada uno en «Recursos del docente» (Unidad 1) y en «Recursos de aprendizaje» (Sin tema). Router real y `Providers`.
- **CL3-D24** → `recursos-caminos-03d.test.tsx` › "CL3-D24 (a): «Ocultar comentarios» y «Ver comentarios (n)» piden la primera página y la frase desaparece"; › "CL3-D24 (b): ir a otra sección, volver y reabrirlos los pide y la frase desaparece"; › "CL3-D24 (c): con la frase a la vista no se ofrece «Ver más comentarios»"
- **CL3-D25** → publicar: `recursos-03d.test.tsx` › "CL3-D25: «Publicar recurso» tras un 503 sale de la espera, conserva lo escrito y un segundo clic publica"; borrar: › "CL3-D25: «Sí, borrar recurso» tras un 503 sale de la espera y un segundo clic borra"; mover: › "CL3-D25: «Mover» tras un 503 sale de la espera y un segundo clic mueve"; guardar: `editar-recurso-03d.test.tsx` › "CL3-D25: «Guardar cambios» tras un 503 sale de la espera, conserva lo escrito y un segundo clic guarda"
- **CL3-D26** → `recursos-caminos-03d.test.tsx` › "CL3-D26: %s en …/recursos monta «Recursos» con su sección activa" (tres ramas); › "CL3-D26: %s en …/recursos/:recursoId/editar monta «Editar recurso» y «Recursos» queda activa" (maestro y admin); › "CL3-D26: en la rama del estudiante, …/recursos/:recursoId/editar cae en `*`"; `recursos-lib-03d.test.ts` › "CL3-D26: «Recursos» es la tercera sección y queda activa en …/recursos y en su edición (S-11)"
- **CL3-D27** → lugares (1) y (2), con 500 y con la red caída: `recursos-caminos-03d.test.tsx` › "CL3-D27 (a): primera carga de $lugar con $falla; pulsar «Recursos» estando ahí la vuelve a pedir y el texto desaparece; lo sano no se pide", "(b): … ir a «Avisos» y volver antes de 30 s la pide y el texto desaparece", "(c): … atrás y adelante del historial la piden y el texto desaparece" (12 casos). Lugar (5): `editar-recurso-03d.test.tsx` › "CL3-D27 (b): con %s, ir a «Avisos» y volver a entrar antes de 30 s pide el recurso y el texto desaparece", "CL3-D27 (c): con %s, atrás y adelante del historial piden el recurso y el texto desaparece", "CL3-D27: con %s, «Volver a Recursos» y volver a entrar por «Editar recurso» pide el recurso y el texto desaparece" (500 y red; 6 casos). Router real y `Providers` (staleTime 30 s, un reintento).
- **CL3-D28** → crear: `recursos-03d.test.tsx` › "CL3-D28: %s con el título «%s»: «Escribe el título del recurso» bajo el campo, ningún POST, nunca el del material; lo escrito y los archivos se conservan" (maestro con "", "   ", "ㅤ"; admin con "\u{FEFF}\u{3000} "); editar: `editar-recurso-03d.test.tsx` › "CL3-D28: con el título «%s», «Escribe el título del recurso» bajo el campo, ningún PUT; lo escrito y los archivos se conservan" (los cuatro); `recursos-lib-03d.test.ts` › "CL3-D28: con el título «%s» crear y editar dicen «Escribe el título del recurso», nunca el del material"; `formulario-recurso.test.tsx` › "PR-C12h: el título de un recurso hecho solo de caracteres invisibles muestra su ErrorDeCampo y no llama a la API (CLASES-03d, antes en formulario-publicacion.test.tsx)"

**Condición del arbitraje (sección 5 b)**: `recursos-03d.test.tsx` › "mover con 403 ACCESO_RESTRINGIDO en «Recursos» no da aviso ni vuelve a pedir nada" y › "mover con 403 ACCESO_RESTRINGIDO en «Actividades de aprendizaje» no da aviso ni vuelve a pedir nada".
**Caso de la matriz (§D-14, "Ver más" con 5xx)**: `recursos-03d.test.tsx` › "con un 500 al pedir «Ver más de Unidad 1», las filas se conservan, sale un aviso, el botón sigue y un segundo clic carga la página".

## Matriz de avisos, recargas y foco (§D-14, 03d), contrastada con el código

Columnas: disparador · respuesta · qué se renueva · aviso (uno) · foco · en vuelo a la vez · con la vista desmontada. "Gancho" es el `onError`/`onSuccess` de `useMutation` en `features/clases/hooks.ts` (corre aunque la vista no esté).

### RecursosView (`recursos-view.tsx`, `components/seccion-de-recursos.tsx`, `components/elemento-de-recurso.tsx`)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| Primera carga de un bloque (`useTemasDeLaSeccion(claseId, bloque)`) | `403 SIN_ACCESO_A_LA_CLASE` / VALIDACION de `claseId` | — | Ninguno: `MensajeError` en el bloque (`errorQuitaLaVista`) | Si estaba dentro del bloque, su `h2` (efecto de `BloqueDeRecursos`) | Cada bloque su `MensajeError`; ningún aviso | Nada |
| Primera carga de un bloque | 5xx, `503`, red | — | Ninguno: `MensajeError` (R9) en el bloque | El `h2` del bloque si estaba dentro | Los dos bloques: un `MensajeError` en cada uno | Nada |
| Primera carga de la sección de un tema (`useRecursos`) | 5xx, `503`, red | — | Ninguno: `MensajeError` (R9) en la sección | La sección sigue: su `h3` (`SeccionDeRecursos`, rama "la fila sigue o se fue") | Las demás secciones siguen | Nada |
| Recarga de un bloque con datos | 5xx, `503`, red | Se conserva lo último | `toast.error(recargaFallida, { id: "recarga-fallida-de-recursos" })` por fallo (`useAvisoDeRecargaFallida` con 4.º parámetro) | Sin cambio | Los dos bloques fallan: dos llamadas con el mismo id (una visible) | Ninguno (montar con el fallo ya ocurrido no avisa) |
| "Ver más de `<tema>`" | `400` del cursor | — | Ninguno: R3 en la sección | `useFocoAlCargarMas` → `h3` | `enEspera={isFetching}` y `cancelRefetch: false`: un clic durante la recarga no pide nada | Nada |
| "Ver más de `<tema>`" (y una recarga de la sección con filas) | 5xx, `503` o red | Se conservan las filas | Uno por fallo (`useAvisoDeRecargaFallida` en `SeccionDeRecursos`, texto de `mensajeDeConsultaClases`, mismo id que los bloques) | En el botón, que sigue para repetir | `enEspera={isFetching}`: doble clic = una petición | Ninguno |
| "Publicar recurso" | `201` | `clavePrefijoDeRecursos` y `claveTemas` (total y por sección) | "Recurso publicado" (gancho) | Sin cambio; campos vacíos | Guarda `publicandoRef`: doble clic = un `POST` y una subida por archivo | El aviso sale |
| "Publicar recurso" | `400 VALIDACION` de `titulo`/`texto` | — | Ninguno: `ErrorDeCampo` | En el botón | — | Un aviso (decidido después de la última espera) |
| "Publicar recurso" | `400` fuera de contrato | — | Uno (gancho) | En el botón | — | Uno |
| "Publicar recurso" | `404 TEMA_NO_ENCONTRADO` | Temas, trabajo y recursos (`renovarTrasError`) | El mensaje del servidor | En el botón; el tema vuelve a "Sin tema" (`temaVigente`) | — | El aviso sale |
| "Publicar recurso" | Falla una subida | — | "No pudimos subir «nombre»…" (el `catch` del formulario) | En el botón | — | El `catch` sigue corriendo (es la promesa del manejador): el aviso sale |
| "Sí, borrar recurso" | `204` | Recursos y temas; `claveRecurso` fuera de la caché | "Recurso borrado" | Vecina: su "Borrar recurso" (o "Mover" si el foco estaba en "Mover"), o la fila; sin vecinas, el `h3`; si la sección desaparece, el `h3` de la sección vecina del mismo bloque y, sin vecinas, el `h2` del bloque | Guarda `borrandoRef`: doble clic = un `DELETE` | El aviso sale |
| "Sí, borrar recurso" | `403 BORRADO_NO_PERMITIDO`, `404` | Recursos y temas (`CODIGOS_QUE_RENUEVAN_LOS_RECURSOS`) | El mensaje | Si la fila desaparece, vecina o `h3`; si solo desaparece el control, el `h3` | — | El aviso sale |
| "Mover" | `200` | Temas, trabajo, recursos, `claveTarea` y `claveRecurso` | "Moviste «…» a «…»" | El "Mover" de la vecina, o la fila, o el `h3`; sección que desaparece: como al borrar | Guarda de `MoverElemento`: doble clic = un `PUT` | El aviso sale |
| "Mover" | `403 MOVER_NO_PERMITIDO` | Temas, trabajo y recursos (`CODIGOS_QUE_RENUEVAN_LOS_TEMAS`) | El mensaje del servidor | El control desaparece: el `h3` | — | El aviso sale |
| Comentar / borrar comentario (en "Ver recurso") | `201` / `204` | Comentarios, muro y `clavePrefijoDeRecursos` (conteo) | El de siempre | El de siempre | El de siempre | El de siempre |
| Cualquiera de los tres ganchos de recursos y "Mover" (fuera de la letra, aceptado) | Redirige `apiClient` (`ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`, `NO_AUTENTICADO`) | Nada | Ninguno (`errorQueRedirigeElCliente`) | — | — | Ninguno |

### EditarRecursoView (`editar-recurso-view.tsx` y `FormularioRecurso` en modo editar)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| Abrir con el recurso viejo en caché | — | `GET` del recurso; "Cargando el recurso…" hasta la lectura fresca | — | — | — | — |
| Primera carga | `404`, VALIDACION de `recursoId`/`claseId`, `403 SIN_ACCESO_A_LA_CLASE`, 5xx, `503`, red | — | Ninguno: `MensajeError` + "Volver a Recursos" (R9 con 5xx/red) | La raíz (si se perdió un control) | — | Nada |
| Recarga con el recurso en caché | red o 5xx / `429` u otra | Se conserva lo escrito y la versión | `recargaRed` / `recargaServidor`, uno por fallo; volver a montar no lo repite | Sin cambio | — | Ninguno |
| Recarga | `404`, `403 SIN_ACCESO`, VALIDACION de ids, `puedeEditar: false` | La vista se reemplaza | Ninguno de la recarga | La raíz (`useFocoAlPerderseElControl`) | — | Nada |
| "Guardar cambios" | `200` | `claveRecurso` escrita; recursos y temas | "Cambios guardados" (gancho) | Navega a `…/recursos` (solo si la vista sigue montada) | Guarda `publicandoRef`: doble clic = un `PUT` | El aviso sale; no navega |
| "Guardar cambios" | `400` de `titulo`/`texto` | — | Ninguno: `ErrorDeCampo` | En el botón | — | Un aviso |
| "Guardar cambios" | `400` fuera de contrato | — | Uno | En el botón | — | Uno |
| "Guardar cambios" | `409 RECURSO_MODIFICADO` | `GET` del recurso (`onConflicto`); reinicio con la versión nueva (`key`) | El mensaje del servidor | "Título del recurso" | El botón sigue en espera hasta la recarga | El aviso sale; sin recarga |
| La recarga tras el `409` falla | — | Nada: lo escrito y la versión se conservan | El de recarga fallida (además del del `409`) | En el botón | — | — |
| "Guardar cambios" | `404 RECURSO_NO_ENCONTRADO`, `403 EDICION_NO_PERMITIDA`, `SIN_ACCESO_A_LA_CLASE` | `claveRecurso`, recursos y temas (`CODIGOS_QUE_RENUEVAN_EL_RECURSO`): la vista se reemplaza | Uno (gancho) | La raíz | — | El aviso sale |
| "Guardar cambios" | `404 TEMA_NO_ENCONTRADO` | Temas (`renovarTrasError`) | El mensaje | En el botón; el tema vuelve a "Sin tema" | — | El aviso sale |
| "Guardar cambios" | 5xx, `503`, red | — | Uno | En el botón | — | Uno |
| Cualquiera | Redirige `apiClient` | — | Ninguno | — | — | — |

### Formulario de Avisos (`components/formulario-publicacion.tsx`, `useCrearPublicacion`)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| "Publicar anuncio" | `201` | Muro (exacto) | "Publicado" | Sin cambio; campo vacío | Doble clic = un `POST` | El aviso sale |
| "Publicar anuncio" | `400` de `texto` | — | Ninguno: `ErrorDeCampo` | En el botón | — | Un aviso (sin espera previa a la decisión) |
| "Publicar anuncio" | `400` de `titulo`, `temaId`, vacío, espacios, `archivoIds.0` | — | Uno | En el botón | — | Uno |
| "Publicar anuncio" | 5xx, `503`, red | — | Uno | En el botón | — | Uno |
| Cualquiera | Redirige `apiClient` | — | Uno (heredado: `useCrearPublicacion` no lleva la guarda; fuera del alcance de 03d) | — | — | Uno |

## Las indicaciones literales del arbitraje de la ronda 0 (sección 4)

1. **R-03d-1:** `TEXTOS_FORMULARIO_RECURSO` con los textos exactos de §D-13; los campos dentro de un `<form>` con `ListaDeAdjuntosElegidos` y la nota `listaFija` dentro. Al montar el maestro solo se piden `…/temas?seccion=aprendizaje`, `?seccion=docente` y el total `…/temas`; `…/recursos` solo por cada sección con `elementos > 0` (`seccionesDeRecursos`).
2. **R-03d-2:** el cuerpo es el `data` de `crearPublicacionSchema.safeParse` (`recursoNuevoValidado`, `lib.ts`), con `archivoIds` siempre y `temaId` solo si se eligió; nunca `bloque` ni `version`.
3. **R-03d-3:** `TEXTOS_FORMULARIO_PUBLICACION` conserva `campoAnuncio`, `publicarAnuncio`, `avisoPublicado` y `sinTema` (con el comentario de PR-1A17). Salieron `grupoTipo`, `anuncio`, `material`, `campoTitulo`, `campoDescripcion`, `publicarMaterial`, `campoTema` y `temasNoCargados`, con sus usos en las pruebas normales de la lista cerrada.
4. **R-03d-4:** `vidrio-fuerte` no aparece en `formulario-publicacion.tsx` y sí en `elemento-de-recurso.tsx`; ningún otro archivo nuevo lleva `vidrio`.
5. **C-21:** `enEspera=` 1 en `formulario-recurso.tsx`, 1 en `elemento-de-recurso.tsx`, 1 en `seccion-de-recursos.tsx`, 0 en las dos vistas; total 64 (`styles/clases-r1.ataque` › V-06 verde).
6. **C-27:** solo `elemento-de-recurso.tsx` lee `recurso.puedeBorrar`; ninguna línea escribe `puedeBorrar=` ni `puedeBorrar:` (la variable local se llama `ofreceBorrar`).
7. **C-19:** `perspectivaDeRuta(` solo en `recursos-view.tsx` y `editar-recurso-view.tsx`; `SeccionDeRecursos` y `ElementoDeRecurso` reciben `base` y `perspectiva` por props.
8. **P-03d-4:** el caso de CL3-D08 con `RecursosView` montada afirma las dos peticiones tras el `201` (arriba).

## Cambios declarados (aceptados por el arbitraje de la PARADA)

- **Prop `destino` de `FormularioRecurso` (modo crear):** la frase "Se publicará en Recursos del docente." o "… de aprendizaje.", que elige `RecursosView` por la perspectiva (admin → aprendizaje; maestro → docente). §D-8.5 no nombra el prop; §D-8.1 pide la frase bajo el título. En modo editar, los props son `recurso`, `cancelarA`, `onGuardado` (navega solo si la vista sigue montada), `onConflicto` y `enfocarAlMontar` (patrón de §7.21). Las dos mutaciones (`useCrearRecurso` y `useEditarRecurso(claseId)`, con `recursoId` en las variables) viven en el formulario, así su `useMontado` es el del formulario (§D-11).
- **Guarda de redirección (`errorQueRedirigeElCliente`)** en `useMoverElemento` (también en "Actividades de aprendizaje") y en los tres ganchos de recursos (`avisarErrorDelRecurso` para crear y editar, y `useBorrarRecurso`): con `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO` o `NO_AUTENTICADO`, ni aviso ni renovación. En la matriz (fila "Cualquiera") y con su prueba (los dos casos de 403 `ACCESO_RESTRINGIDO`).
- **`data-seccion-de-recursos="<bloque>:<clave>"`** en cada sección de un bloque (`marcaDeSeccionDeRecursos` y `claveDeLaMarcaDeRecursos` en `lib.ts`): `BloqueDeRecursos` lo sigue con `useFilaEnFoco` para llevar el foco cuando una sección desaparece (vecina del mismo bloque o `h2`). Su caso: "CL3-D05: borrar el último recurso de una sección con el foco dentro…".

## Desviaciones y decisiones no escritas en el plan

- **"Ver más de `<tema>`" con 5xx o red (§D-14: "Se conservan las filas · Uno · En el botón"):** mi primera versión reemplazaba la sección por el `MensajeError` (como "Ver más" de Actividades). Lo corregí antes de la verificación: `SeccionDeRecursos` solo reemplaza la lista con el cursor vencido (R3) o sin filas (R9); con filas, las conserva y avisa una vez por fallo con `useAvisoDeRecargaFallida` (texto de `mensajeDeConsultaClases`, el id compartido de "Recursos"). Lo mismo vale para una recarga de la sección con filas que falla. Caso: "con un 500 al pedir «Ver más de Unidad 1»…".
- **Foco cuando solo desaparece el control (no la fila):** `SeccionDeRecursos` lleva el foco al `h3` si la fila sigue pero el control con el foco ya no está ("Mover" tras `MOVER_NO_PERMITIDO`, "Borrar recurso" tras `BORRADO_NO_PERMITIDO`), como pide la matriz ("Si el control desaparece, `h3`"). Caso: "CL3-D06: con 403 MOVER_NO_PERMITIDO…".
- **Al editar, el tema con la lista de temas sin llegar:** `temaVigente` conserva el tema del recurso mientras la lista total no llegó o falló (al crear, el elegido es "" en ese caso), para que guardar no lo pase a "Sin tema" por una lista que no está. En editar, la nota "No pudimos cargar los temas. El recurso se publicará sin tema." no se muestra (habla de publicar).
- **`CODIGOS_QUE_RENUEVAN_LOS_RECURSOS`** (`BORRADO_NO_PERMITIDO`, `PUBLICACION_NO_ENCONTRADA`) y **`CODIGOS_QUE_RENUEVAN_EL_RECURSO`** (`RECURSO_NO_ENCONTRADO`, `EDICION_NO_PERMITIDA`, `SIN_ACCESO_A_LA_CLASE`) en `data.ts`: las listas de códigos de las filas "Sí, borrar recurso 403/404" y "Guardar cambios 404/403" de §D-14.
- **Lista de adjuntos publicados en línea** en `formulario-recurso.tsx`: `ListaDeAdjuntosPublicados` vive en `features/tareas` (regla 9) y "Cambios por capa" no autoriza otro archivo de componente.

## Hermanos y estados vecinos

- **Guarda de redirección:** hermanos = cada `onError` de recursos y "Mover". Aplicada en `useCrearRecurso`, `useEditarRecurso`, `useBorrarRecurso` y `useMoverElemento`. **No** en `useCrearPublicacion` (Avisos), `useComentar`, `useBorrarComentario`, `useBorrarTema`, `useOrdenarTemas` ni los de tema: es el patrón heredado O-1d3-2 y el plan no lo pide; queda como detalle con destino (CHORE).
- **Decidir el aviso después de la última espera (lección M-01 de 03c2):** `useCrearRecurso` y `useEditarRecurso` (vía `avisarErrorDelRecurso`, que espera la renovación y lee `montado` al final); `useCrearPublicacion` ya no espera nada antes de decidir. Estados: montado sin renovación (campo), montado con renovación (`TEMA_NO_ENCONTRADO`: aviso), desmontado antes de la respuesta (aviso), desmontado durante la renovación (aviso, porque se lee al final).
- **Foco al desaparecer algo en "Recursos":** fila borrada o movida con vecina (control equivalente: "Borrar recurso" o "Mover", según el que tenía el foco), sin vecina (`h3`), solo el control (`h3`), la sección entera (sección vecina del mismo bloque o `h2`), el bloque en error que reemplaza la vista (`h2`), cambio de clase con la misma instancia (`h2`), "Ver más" que se desmonta (`useFocoAlCargarMas`). En "Editar recurso": recarga que reemplaza la vista, `puedeEditar` que pasa a false o un 404 al guardar (raíz, `useFocoAlPerderseElControl`), reinicio por 409 ("Título del recurso").
- **Avisos de recarga fallida:** los dos bloques (mismo id), cada sección con filas (mismo id), "Editar recurso" (sin id, variante por error). Estados: primer fallo, fallo seguido de fallo (dos avisos), montar con el fallo ya ocurrido (ninguno), fallo que reemplaza la vista (ninguno).
- **R3/R9 por camino:** en cada lugar, pulsar la sección, ir y volver antes del `staleTime`, historial, y en "Editar recurso" volver y entrar. Lo sano no se pide (comprobado en (a)).
- **El título "Escribe el título del recurso":** crear y editar, por la validación local y por el servidor (`titulo:` pintado) — los dos modos.

## Pendiente o fuera de alcance

- **Rojo por carga en la suite completa:** `features/tareas/tareas-01d-r1.ataque.test.tsx` › "con 20 criterios…" dio `Test timed out in 15000ms` (24 763 ms) en la corrida completa y pasó solo (18 de 18). 03d no toca `features/tareas`.
- Guarda de redirección en los demás ganchos de `features/clases` (arriba, hermanos no aplicados).
- `features/tareas/como-se-entrega-01a.test.tsx` (PR-1A17) sigue leyendo `TEXTOS_FORMULARIO_PUBLICACION.sinTema`; anotar en `ESTADO.md` que apunte a `TEXTOS_FORMULARIO_RECURSO.sinTema` (arbitraje de la ronda 0, sección 3).
- El paso 8 (A-03, A-03 bis y A-05 en `DESIGN.md`) es del orquestador.

## Corrección de la ronda 1 (T-01 y T-02)

Fuente: `reporte-tester.md`, "## CLASES-03d — Ronda 1" (SHA-256 del archivo `aaef43c8…`). Solo `features/clases` (producción) y mis pruebas normales de 03d. No toqué ninguna `*.ataque`, `features/tareas`, `shared/` ni el backend.

### T-01 (baja): corregido
- **Causa:** el `catch` de `handleEnviar` (`components/formulario-recurso.tsx`) llama a `edicion.onConflicto()` aunque la vista ya no esté. `recargarTrasConflicto` hacía `consulta.refetch()` sin mirar `montado`, a diferencia de `alGuardar`.
- **Remedio:** `editar-recurso-view.tsx:113`, `if (!montado.current) return` al inicio de `recargarTrasConflicto`, con su comentario. Con la vista desmontada, el aviso del `409` lo sigue dando el gancho y ya no se pide el recurso ni se llama a `setReinicios`.
- **Pruebas:**
  - `recursos-03d-r1.ataque.test.tsx` › "CL3-3R1-14: un 409 con la vista desmontada da su aviso y no vuelve a pedir el recurso (§D-14: «El aviso sale; sin recarga»)" (del tester, ahora verde).
  - `editar-recurso-03d.test.tsx` › "T-01: un 409 con «Editar recurso» desmontada da un aviso y no vuelve a pedir el recurso".
- **Hermanos:**
  - `alGuardar` (`editar-recurso-view.tsx:103`) ya tenía la guarda.
  - El `409` con la vista montada no cambia (CL3-D12 y CL3-3R1-13, verdes).
  - `features/tareas/editar-tarea-view.tsx:96` tiene el mismo `consulta.refetch()` sin guarda. Está en "No se toca", así que no lo cambié; queda anotado con destino en `ESTADO.md`.
- **Estados vecinos de `recargarTrasConflicto`:**
  - Montada, la recarga trae el recurso: se reinicia el formulario.
  - Montada, la recarga falla: se conserva lo escrito y sale el aviso.
  - Montada, la recarga trae un `404`, un `403` o `puedeEditar: false`: la vista se reemplaza.
  - Desmontada antes de la respuesta del `PUT`: no se pide nada (este remedio).
  - Desmontada durante la recarga: la recarga ya había salido y su resultado no reinicia nada que se vea.

### T-02 (media): corregido con la opción (b), volver a pedir la lista de temas al abrir la edición
- **Por qué (b) y no (a):** con (a), una lista que llega fresca y sin el tema seguiría ofreciendo el tema del recurso. Eso pone rojo CL3-3R1-22 ("la lista llega sin el tema del recurso (se borró): el campo dice «Sin tema» y el PUT lleva temaId null"). Además, la persona solo saldría de ese estado con un `404` del servidor al guardar. La opción (b) es la "lectura fresca al abrir" de §7.21 y §D-8.6 aplicada a la lista de temas, y no cambia nada al crear.
- **Remedio, en `components/formulario-recurso.tsx`:**
  - `:75`: el formulario guarda cuándo se abrió (`abiertoEn`).
  - `:136-142`: en modo editar, al montar, vuelve a pedir los temas. Si ya se están pidiendo (no había lista o estaba vieja), no lanza una segunda petición.
  - `:110-113`: la lista solo cuenta si llegó después de abrir el formulario (`temas.dataUpdatedAt >= abiertoEn`). Mientras no llega, o si falla, `temaVigente` recibe `undefined`: el recurso conserva su tema y el campo "Tema" no se muestra, así que nunca viaja `null` sin que la lista confirme que el tema ya no existe.
  - `:319`: las opciones salen de esa lista vigente.
  - En crear no cambia nada (`edicion === null`).
- **Pruebas:**
  - `recursos-03d-r1.ataque.test.tsx` › "CL3-3R1-23: con la lista de temas en caché todavía fresca (de «Recursos») y el recurso movido después a un tema nuevo, guardar solo el título conserva el tema del recurso" (del tester, ahora verde).
  - `recursos-03d-r1.ataque.test.tsx` › CL3-3R1-22 sigue verde.
  - `editar-recurso-03d.test.tsx` › "T-02: al abrir la edición se vuelven a pedir los temas; mientras no llegan, el campo no se muestra y guardar conserva el tema del recurso".
  - `editar-recurso-03d.test.tsx` › "T-02: si la recarga de los temas falla, el campo no se muestra y guardar conserva el tema del recurso".
  - `editar-recurso-03d.test.tsx` › "T-02: cuando la lista nueva llega con el tema del recurso, el campo lo muestra elegido y guardar lo conserva".
- **Estados vecinos:**

  | Estado de la lista de temas | Qué pasa | Cubierto por |
  |---|---|---|
  | Sin lista en caché | Primera petición, sin una segunda | CL3-D11 |
  | Vieja (más de 30 s) | La petición de `useQuery` al montar, sin una segunda | — |
  | Fresca pero anterior al recurso | Se vuelve a pedir | CL3-3R1-23 |
  | Pendiente | Sin campo, tema conservado | T-02 pendiente |
  | Fallida | Sin campo, tema conservado | T-02 fallida |
  | Llega con el tema | Campo con el tema elegido | T-02 llega |
  | Llega sin el tema | "Sin tema" y `null` | CL3-3R1-22 |
  | Reinicio por `409` | El formulario se monta de nuevo y vuelve a pedir la lista | — |
  | La persona elige otro tema de la lista confirmada | Se envía el elegido | CL3-D11, CL3-D10 |
- **Hermanos:**
  - **«Mover» en Recursos (`MoverElemento`, `destinoVigente`): no aplica.** El destino inicial es `temaActual`, que sale de la misma lista por sección que pinta la fila. Con una lista vieja, la fila también está en su sección vieja, así que el tema actual siempre está en la lista o es "Sin tema". Además, "Mover" no envía nada si el destino es el tema actual. Un destino que otra persona borró lo resuelve el `404 TEMA_NO_ENCONTRADO`, que renueva las listas. No hay un camino en que la lista vieja cambie un tema sin que la persona lo elija.
  - **«Mover» en Actividades:** el mismo componente, con el mismo razonamiento. No aplica.
  - **Crear («Nuevo recurso»): no aplica.** El tema lo elige la persona de la lista que ve.
  - **`features/tareas/components/formulario-tarea.tsx:105`:** mismo patrón al editar una tarea. Está en "No se toca": queda anotado con destino en `ESTADO.md`.
- **Filas de la matriz que cambian ("Editar recurso"):** se suma una fila después de "Abrir con el recurso viejo en caché":

  | Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
  |---|---|---|---|---|---|---|
  | Abrir el formulario (editar) | — | La lista total de temas (salvo que ya se esté pidiendo); hasta que llega, el campo "Tema" no se muestra y el recurso conserva su tema; si falla, igual | Ninguno | — | — | — |

  En la fila "«Guardar cambios» · `409 RECURSO_MODIFICADO`", la columna "Desmontada" queda "El aviso sale; sin recarga" (ahora es lo que hace el código).

### Detalle de la verificación del manager: corregido
`formulario-publicacion.test.tsx:140`: el título de PR-C12h pasa a "PR-C12h: un anuncio hecho solo de caracteres invisibles muestra su ErrorDeCampo y no llama a la API" (E12-3). Nada más del caso.

### Verificación (desde `frontend/`, una tras otra)
| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0) |
| `npx vitest list \| grep -acE "^src/"` | `5733` (base 5729 + 4 casos nuevos en `editar-recurso-03d.test.tsx`, que pasa de 31 a 35) |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `262` |
| `npx vitest run` | `Test Files  262 passed (262)` · `Tests  5733 passed (5733)` · `Duration  258.64s`; «timed out»: 0 |
| `npm run build` | `✓ built in 888ms` |

## Corrección de la ronda 2 (T-03, T-04 y T-05)

Fuente: `reporte-tester.md`, "## CLASES-03d — Ronda 2" (SHA-256 del archivo `088b2c96…`). Solo `features/clases` (producción) y mi prueba normal `editar-recurso-03d.test.tsx`. No toqué ninguna `*.ataque`, `features/tareas`, `shared/` ni el backend.

### T-03 (media): corregido
- **Causa:** la regla de la ronda 1 confirmaba una lista que *llegaba* después de abrir. Si la petición había salido antes (desde «Recursos» o «Actividades»), el formulario no pedía otra (`if (temas.isFetching) return`), y esa respuesta vieja confirmaba "Sin tema".
- **Por qué cambió el remedio:** al probar el que sugería el tester (`refetch` con `cancelRefetch: true`), vi que TanStack Query 5 solo cancela la petición en vuelo si la consulta ya tiene datos. Sin datos, se une a ella y su respuesta vieja confirmaba igual (CL3-3R2-01 siguió en rojo con ese intento).
- **Remedio:** un gancho nuevo, `useTemasDelRecurso(claseId, editar)`, en `hooks.ts:790-815`. Lo usa `components/formulario-recurso.tsx:75`, y salen de ese archivo `abiertoEn`, `pidioLosTemasRef` y su efecto.
  - Al crear, la lista es la de siempre.
  - Al editar, la lista solo cuenta cuando la confirma la respuesta de una petición que salió después de abrir el formulario.
  - Al abrir se guarda si ya había una petición en vuelo (`getQueryState(...).fetchStatus === "fetching"`, leído antes de que el formulario se suscriba).
  - Si la había, primero se espera o se cancela (`refetch({ cancelRefetch: true })`) y después se pide otra. Si no la había, `refetch({ cancelRefetch: false })` se une a la petición del propio montaje (que ya es posterior a abrir) o pide una nueva si la caché estaba fresca.
  - La lista queda confirmada solo si esa petición termina bien (`setConfirmada(true)` en su callback).
  - Mientras no llega, o si falla, `lista` es `undefined`: el campo "Tema" no se muestra y el recurso conserva su tema.
  - Una vez confirmada, las listas siguientes (por ejemplo, de una invalidación con el formulario abierto) también cuentan.
- **Pruebas:**
  - `recursos-03d-r2.ataque.test.tsx` › "CL3-3R2-01: la lista total que «Recursos» pidió antes de mover el recurso llega después de abrir la edición: guardar solo el título conserva el tema del recurso" (del tester, ahora verde).
  - `editar-recurso-03d.test.tsx` › "T-03: la lista total que «Actividades de aprendizaje» pidió antes de abrir llega después: no confirma «Sin tema» y guardar conserva el tema del recurso".
  - `editar-recurso-03d.test.tsx` › "T-03: con una lista en caché y su recarga en vuelo desde antes de abrir, la que llega no confirma; guardar conserva el tema del recurso".
  - `editar-recurso-03d.test.tsx` › "T-03: volver a abrir la edición vuelve a pedir la lista total de temas".

### T-04 (baja): corregido
- **Causa:** con la vista desmontada, el remedio de T-01 quitó la recarga tras el `409`, pero nadie marcaba vieja `claveRecurso`. Volver antes de 30 s servía la versión vieja de la caché.
- **Remedio:** en `hooks.ts:1163-1170` (`renovarTrasErrorDelRecurso`), ante `RECURSO_MODIFICADO`, `invalidateQueries({ queryKey: claveRecurso(…), refetchType: "none" })`. Marca la edición vieja sin pedirla, así que con la vista desmontada sigue sin haber recarga (§D-14). Con la vista montada, la recarga la sigue haciendo `recargarTrasConflicto`. Al volver, la "lectura fresca al abrir" espera la versión del servidor.
- **Pruebas:**
  - `recursos-03d-r2.ataque.test.tsx` › "CL3-3R2-06: el 409 llega con la vista desmontada y la persona vuelve a «Editar recurso» antes de 30 s: la vista nace con la versión del servidor y guardar no da un segundo 409" (verde).
  - `editar-recurso-03d.test.tsx` › "T-04: tras un 409 con la vista desmontada, volver antes de 30 s pide el recurso y nace con la versión del servidor".

### T-05 (baja): corregido
- **Causa:** el `onError` de `useBorrarRecurso` renovaba las listas, pero no tocaba `claveRecurso`.
- **Remedio:** en `hooks.ts:1263-1276`, el `onError` recibe el `recursoId`:
  - con `PUBLICACION_NO_ENCONTRADA`, `removeQueries` de `claveRecurso` (como el `204`);
  - con `BORRADO_NO_PERMITIDO`, la marca vieja sin pedirla;
  - después renueva las listas, como antes.
- **El texto del aviso:** el `404` al borrar sigue diciendo "Esa publicación ya no existe." (`PUBLICACION_NO_ENCONTRADA`). §D-13 fija "Ese recurso ya no existe." solo para `RECURSO_NO_ENCONTRADO`, en la tabla de §D-6 ("leer y editar un recurso"), y la fila "Sí, borrar recurso" de §D-14 dice "El mensaje". Ninguno pide cambiarlo, así que no lo cambié. Si se quiere unificar, es una decisión de texto con enmienda.
- **Pruebas:**
  - `recursos-03d-r2.ataque.test.tsx` › "CL3-3R2-08: tras borrar con 404 un recurso que otra persona ya borró, «atrás» a su «Editar recurso» antes de 30 s no muestra el formulario de un recurso que ya no existe" (verde).
  - `editar-recurso-03d.test.tsx` › "T-05: tras borrar con 404 un recurso que ya no existe, «atrás» a su edición dice «Ese recurso ya no existe.»".
  - `editar-recurso-03d.test.tsx` › "T-05: tras un 403 al borrar, la edición del recurso queda vieja: al abrirla se vuelve a pedir".

### Estados vecinos: la lista total de temas al editar
| Estado | Qué hace ahora | Prueba |
|---|---|---|
| No había lista en caché | Se une a la petición del montaje (posterior a abrir); al llegar, confirma | CL3-D11 (el campo muestra el tema) |
| Lista en caché fresca, sin petición en vuelo | Pide una nueva al abrir; confirma al llegar | CL3-3R1-23, "T-03: volver a abrir…" |
| Lista en caché vieja (más de 30 s) | La petición del montaje es posterior a abrir; se une a ella | Mismo camino que "no había lista" |
| Petición en vuelo desde «Recursos», sin datos | Espera esa, pide otra, y solo la segunda confirma | CL3-3R2-01 |
| Petición en vuelo desde «Actividades de aprendizaje» | Igual | "T-03: … «Actividades de aprendizaje» …" |
| Petición en vuelo con datos en caché (una invalidación anterior) | Se cancela y se pide otra | "T-03: con una lista en caché y su recarga en vuelo…" |
| Invalidación con el formulario abierto y la lista ya confirmada | La lista nueva cuenta: lo que se envía es lo que muestra el campo | CL3-3R2-02 (×2) |
| La petición al abrir falla | Sin campo "Tema"; guardar conserva el tema | "T-02: si la recarga de los temas falla…" |
| La petición al abrir sigue pendiente | Sin campo; guardar conserva el tema | "T-02: al abrir la edición se vuelven a pedir los temas…" |
| Llega sin el tema del recurso (se borró) | "Sin tema" y `null` | CL3-3R1-22 |
| Llega con el tema | El campo lo muestra elegido | "T-02: cuando la lista nueva llega con el tema…" |
| Reinicio tras un `409` | El formulario se monta de nuevo: otra confirmación | CL3-3R2-03 (la lectura falla: sin campo y con el tema del recurso) |
| Volver a abrir la edición | Vuelve a pedir la lista | "T-03: volver a abrir la edición…" |
| Crear | Sin cambio: la lista de siempre | Las de `formulario-recurso.test.tsx` y CL3-D10 |

### Estados vecinos: `claveRecurso` (la edición en caché)
| Estado | Qué le pasa a `claveRecurso` | Prueba |
|---|---|---|
| `409` con la vista montada | Se marca vieja, sin pedirla; `recargarTrasConflicto` la vuelve a pedir y reinicia el formulario | CL3-D12 (×2), CL3-3R2-07 |
| `409` con la vista desmontada | Se marca vieja, sin pedirla; al volver, lectura fresca | CL3-3R2-06, "T-04: …" |
| `404`, `403 EDICION_NO_PERMITIDA` o `SIN_ACCESO` al guardar | Se invalida y se pide (está activa): la vista se reemplaza | CL3-D13 (×3) |
| Guardar `200` | Se escribe la respuesta | CL3-D11 |
| Borrar `204` | Sale de la caché | CL3-D05 |
| Borrar `404 PUBLICACION_NO_ENCONTRADA` | Sale de la caché (T-05) | CL3-3R2-08, "T-05: tras borrar con 404…" |
| Borrar `403 BORRADO_NO_PERMITIDO` | Se marca vieja, sin pedirla (T-05) | "T-05: tras un 403 al borrar…" |
| Mover `200` (sube la versión) | Se invalida (sin vista activa, queda vieja) | CL3-D06 |
| Volver antes de 30 s sin ningún cambio | Se sirve de la caché, por diseño (§7.21: "con la caché fresca no espera") | — |
| Volver después de 30 s | Lectura fresca al abrir | CL3-D11 (lectura fresca) |
| Atrás del historial a la edición | Igual que volver: vieja o fuera de la caché se pide; fresca se sirve | CL3-3R2-08, CL3-D27 (c) |

### Hermanos heredados de `features/tareas` (en "No se toca": solo anotados, con destino en `ESTADO.md`)
- `features/tareas/editar-tarea-view.tsx:96`: recarga tras el `409` sin mirar si la vista sigue montada (hermano de T-01). Allí no aparece T-04, porque esa recarga sí refresca la caché.
- `features/tareas/components/formulario-tarea.tsx:105`: decide que el tema o la categoría "ya no está" con la lista en caché (hermano de T-02 y T-03).
- `useEditarTarea` y `useBorrarTarea` (`features/tareas/hooks.ts`): ante `TAREA_MODIFICADA` no marcan vieja `claveTarea`. `useBorrarTarea` ante su `404` la renueva con `pedirDeNuevoLaTarea`; habría que revisar el equivalente de T-04 cuando se toque ese módulo.

### Matriz de "Editar recurso": filas que cambian
- **"«Guardar cambios» · `409 RECURSO_MODIFICADO`":** la columna "Se renueva" pasa a "`claveRecurso` marcada vieja sin pedirla; con la vista montada, `GET` del recurso y reinicio con la versión nueva". La columna "Desmontada" queda "El aviso sale; sin recarga (la próxima apertura hace la lectura fresca)".
- **"Abrir el formulario (editar)":** la columna "Se renueva" pasa a "La lista total de temas; si había una petición en vuelo desde antes de abrir, se espera o se cancela y se pide otra; solo la respuesta de una petición posterior a abrir confirma la lista".
- **En la matriz de "Recursos", "«Sí, borrar recurso» · `403`/`404`":** la columna "Se renueva" pasa a "Recursos y temas; con `404`, `claveRecurso` fuera de la caché; con `403`, `claveRecurso` marcada vieja".

### Verificación (desde `frontend/`, una tras otra)
| Comando | Última línea |
|---|---|
| `npm run lint` | exit 0 (`> tsc -b`) |
| `npx vitest list \| grep -acE "^src/"` | `5750` (base 5744 + 6 casos nuevos en `editar-recurso-03d.test.tsx`, que pasa de 35 a 41) |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `263` |
| `npx vitest run` | `Test Files  263 passed (263)` · `Tests  5750 passed (5750)` · `Duration  327.12s`; «timed out»: 0 |
| `npm run build` | `✓ built in 1.04s` |
