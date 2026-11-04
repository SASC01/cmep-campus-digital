# Resumen del programador — CLASES-03e (frontend de Dudas y las dos decisiones de texto del humano en Recursos)

Fecha: 2026-11-03. Plan: `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md` (SHA-256 `711c23a30ca99afdb7fe22d94b1b3b9276ae5abddafa251f7f26fb96d4f1a541`, verificado; "LISTO (Enmiendas 1 a 13 aplicadas, con E13-9)"). Base dentro de los paquetes: `028569f` (K3d). Seguí "## Arbitraje de la ronda 0 — 03e" (`revision.md`, SHA-256 `d3f471d6…`, sus seis indicaciones literales), "## Verificación de la adenda E13-9", "## CLASES-03e — Ronda 0" de `reporte-tester.md` (R-03e-1 a 5) con su adenda 1, y la regla de 03c2/03d: todo `onError` que decide avisar según si el formulario sigue montado lo decide después de su última espera. Solo `frontend/`; no toqué ninguna `*.ataque`, `features/tareas`, `shared/` ni el backend.

```
Plan: docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md
Pasos completados: 5 de 5 del programador (1, 2, 2 bis, 3, 4 y 5; el 6 es del orquestador)
PARADA: ninguna
```

## Archivos

**Creados (producción, 5):**
- `frontend/src/features/clases/dudas-view.tsx` (`DudasView`, §D-9.1)
- `frontend/src/features/clases/components/elemento-de-duda.tsx` (§D-9.2)
- `frontend/src/features/clases/components/respuestas-de-duda.tsx` (§D-9.3)
- `frontend/src/features/clases/components/formulario-duda.tsx` (§D-9.1)
- `frontend/src/features/clases/components/formulario-respuesta.tsx` (§D-9.3)

**Creados (pruebas, 4):**
- `frontend/src/features/clases/dudas-03e.test.tsx` (63 casos)
- `frontend/src/features/clases/dudas-caminos-03e.test.tsx` (27)
- `frontend/src/features/clases/dudas-lib-03e.test.ts` (9)
- `frontend/src/features/clases/recursos-enmienda13-03e.test.tsx` (22)

**Modificados (producción, 6):**
- `features/clases/data.ts`: `claveDudas`, `claveRespuestas`, `LIMITE_DUDAS`, `LIMITE_RESPUESTAS`, `TEXTOS_DUDAS`, `TEXTOS_RESPUESTAS` (§D-13 literal), `CODIGOS_QUE_RENUEVAN_LAS_DUDAS`, `CAMPOS_PINTADOS_DE_LA_DUDA` y `_RESPUESTA` (`["texto"]`), `MENSAJES_ERROR_CLASES_GENERALES.dudaNoEncontrada` / `.respuestaNoEncontrada`, `MENSAJES_POR_CODIGO_DE_CLASES` + `DUDA_NO_ENCONTRADA` y `RESPUESTA_NO_ENCONTRADA`, `textosPorCampo` + `dudaId`, `respuestaId` y `resuelta` (el genérico), la sección `{ segmento: "dudas" }` entre «Recursos» y «Personas», y `TEXTOS_FORMULARIO_RECURSO.temasNoCargadosAlEditar` (Enmienda 13). `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` no cambia (15).
- `features/clases/types.ts`: reexporta `CrearDuda`, `CrearRespuesta`, `Duda`, `ListaDudasRespuesta` de `@campus/shared`.
- `features/clases/lib.ts`: `erroresDeLaDudaDeApi` y `erroresDeLaRespuestaDeApi` (envoltorios; `erroresDeFormularioClases(` pasa de 5 a 7 en `lib.ts`).
- `features/clases/hooks.ts`: `useDudas`, `useRespuestas`, `useCrearDuda`, `useMarcarDuda`, `useBorrarDuda`, `useResponder`, `useBorrarRespuesta` (§D-9.4, con `useMontado` en duda y respuesta); `useTemasDelRecurso` con E13-9 (`lecturaFallida` y confirmación por `dataUpdateCount`); `useBorrarRecurso` avisa "Ese recurso ya no existe." ante `PUBLICACION_NO_ENCONTRADA` (Enmienda 13 (2)). `hooks.ts` sigue con una sola llamada a `erroresDeFormularioClases(`.
- `features/clases/components/formulario-recurso.tsx`: la nota `temasNoCargadosAlEditar` en modo editar (Enmienda 13 (1)).
- `app/router.tsx`: `{ path: "dudas", element: <DudasView /> }` en las tres ramas.

**Modificados (pruebas normales de la lista cerrada de 03e, 7):**
- `features/clases/errores-ch3.test.ts`: CH3-B15 (4) `5` → `7`; CH3-B01 `TEXTOS_FIJOS_DE_SIEMPRE` suma `DUDA_NO_ENCONTRADA` y `RESPUESTA_NO_ENCONTRADA` con su comentario de motivo (E12-2). `:79` sigue en 15. Nada más.
- `features/clases/recursos-03d.test.tsx:739`: "Esa publicación ya no existe." → "Ese recurso ya no existe.". Nada más.
- `features/clases/editar-recurso-03d.test.tsx:1096`: igual. Nada más.
- `features/clases/clase-layout.test.tsx`: «Dudas» en las listas de secciones (`:311`, PR-1E05 ×3), `toHaveLength(5)` → 6, índices de «Personas» 3 → 4 en `medidasDeLaOpcion` (M-T1 y PR-2C07), y los ordinales en títulos y comentarios ("la cuarta" → "la quinta", "cinco secciones" → "seis secciones").
- `app/router-01d.test.tsx`: las tres listas de CAL-1D06 suman «Dudas»; índices «Calificaciones» 4 → 5 y «Personas» 3 → 4; el comentario de la lista.
- `features/clases/lib.test.ts`: la lista de secciones de PR-2C01 suma «Dudas»; `indiceDeSeccionActiva` de «Personas» 3 → 4 y «Calificaciones» 4 → 5 (M-12 y su vecino), con sus comentarios.
- `features/clases/secciones-03c1.test.tsx`: `NOMBRES` suma «Dudas»; "cinco" → "seis" en el título de CL3-C01; `esperadas(3)` → `(4)` y `(4)` → `(5)`; las medidas literales que dependen del índice (`{ x: "390px", ancho: "125px" }` → `{ x: "520px", ancho: "135px" }`, `"150px"` → `"160px"`) y CL3-C04 (`520 - 250` → `630 - 250`, con su comentario 500..630).
- `app/clase-03c1.test.tsx` y `app/router.test.tsx` / `router-01e.test.tsx`: no hizo falta cambiarlas (verdes).

Las `*.ataque` que aparecen en `git status` (9 archivos) son las de la ronda 0 de 03e y su adenda (del tester); no las toqué.

## Verificación (desde `frontend/`, una tras otra; nunca dos suites a la vez)

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0; antes, `All matched files use Prettier code style!`) |
| `npx vitest list \| grep -acE "^src/"` | `5881` |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `268` |
| `npx vitest run` | `Test Files  268 passed (268)` · `Tests  5881 passed (5881)` · `Duration  267.02s`. «timed out»: 0 |
| `npm run build` | `✓ built in 880ms` |
| `prisma validate` / `build` de `shared/` | n/a (03e no toca `shared/` ni el backend) |

Corrida intermedia antes de las pruebas nuevas y de la lista cerrada (con el código ya escrito): `Test Files  7 failed | 257 passed (264)` · `Tests  26 failed | 5734 passed (5760)`. Los 26 rojos eran: los de la lista cerrada (`router-01d` 8, `clase-layout` 5, `secciones-03c1` 7, `lib.test` 3, `recursos-03d:739` 1 y `editar-recurso-03d:1096` 1, estos dos porque la corrida arrancó antes de que guardara su cambio) y **`components/layout/estatico-r1.ataque.test.ts` › V-17 "0 «Ocultar»"**, rojo por un comentario mío de `elemento-de-duda.tsx` que nombraba "Ocultar respuestas". Lo corregí en el código (el comentario ya no escribe la palabra); la prueba no se tocó. Los 38 rojos esperados de la ronda 0 (C-8, C-9, C-19, C-21, C-24, C-28, C-32, C-33 y P-03e-1) ya estaban verdes en esa corrida.

## Conteos (de `npx vitest list` de la verificación)

- **5881 casos en 268 archivos.** Base 5760 / 264 (adenda 1 de la ronda 0).
- Archivos nuevos (4): `dudas-03e.test.tsx` 63, `dudas-caminos-03e.test.tsx` 27, `dudas-lib-03e.test.ts` 9 y `recursos-enmienda13-03e.test.tsx` 22 = **121** (`grep -ac "^src/features/clases/<archivo>"` sobre la misma salida).
- Ninguna prueba existente ganó ni perdió casos: 5760 + 121 = 5881; 264 + 4 = 268.

## Pruebas requeridas (03e) → archivo y título exacto

Los títulos son los de `npx vitest list` (los `it.each` aparecen ya expandidos). Rutas bajo `frontend/src/features/clases/`.

- **CL3-E01** (vista: `h2` y frase; formulario para estudiante y maestro, no para el admin; lista en orden; vacío; "Ver más dudas" con `enEspera={isFetching}` y cursor) → `dudas-03e.test.tsx`:
  - "CL3-E01: estudiante ve el h2 «Dudas» y su frase; el formulario solo para estudiante y maestro" (y sus gemelos `maestro` y `admin`; el del admin afirma que no hay campo ni botón)
  - "CL3-E01: la lista sale en el orden del servidor (de la más reciente a la más antigua)"
  - "CL3-E01: estudiante con la clase sin dudas ve «Aún no hay dudas en esta clase.»" (y `maestro`, `admin`)
  - "CL3-E01: «Ver más dudas» pide la página siguiente con el cursor y espera también mientras la lista se recarga"
- **CL3-E02** (firma, fecha, texto plano, «Resuelta» con icono y texto solo si `resuelta`; "Ver respuestas (n)" / "Responder") → `dudas-03e.test.tsx`:
  - "CL3-E02: firma, fecha, texto plano (nunca HTML) e insignia «Resuelta» con icono y texto solo si está resuelta" (la fecha se compara con `formatearFechaHora` de un instante fijo, `CREADO_EN`)
  - "CL3-E02: estudiante ve «Ver respuestas (n)» con n ≥ 1 y «Responder» con 0" (y `maestro`)
- **CL3-E03** (publicar: `{ texto }` normalizado, aviso, campo vacío, lista renovada; vacío o invisibles sin petición; doble clic, un `POST`) → `dudas-03e.test.tsx`:
  - "CL3-E03: envía { texto } normalizado, avisa, vacía el campo y la lista se renueva"
  - "CL3-E03: con el texto "", «Escribe tu duda» bajo el campo y ninguna petición" (y con `"   "` y con dos U+200B)
  - "CL3-E03: doble clic en «Publicar duda» manda un solo POST"
- **CL3-E04** (marcar y quitar) → `dudas-03e.test.tsx`:
  - "CL3-E04: el mismo botón cambia de texto, el foco se queda, avisa y la insignia aparece y desaparece"
  - "CL3-E04: sin `puedeMarcar` no hay botón; el estudiante nunca lo ve aunque el dato diga true"
  - "CL3-E04: doble clic manda un solo PUT"
  - "CL3-E04: con 404, el aviso, la fila desaparece y el foco va al «Marcar como resuelta» de la vecina"
  - "CL3-E04: con 404 y sin vecinas, el foco va al h2 «Dudas»"
- **CL3-E05** (borrar una duda) → `dudas-03e.test.tsx`:
  - "CL3-E05: la confirmación en línea dice «Se borrará con sus respuestas.»; el foco va a «Cancelar» y vuelve a «Borrar duda»"
  - "CL3-E05: «Sí, borrar duda» avisa, la fila sale, el foco va al «Borrar duda» de la vecina y sus respuestas salen de la caché"
  - "CL3-E05: sin vecinas, el foco va al h2 «Dudas»"
  - "CL3-E05: con 403 BORRADO_NO_PERMITIDO, el aviso del servidor, la lista se renueva, el botón desaparece y el foco va a la fila"
  - "CL3-E05: con 404, el aviso «Esa duda ya no existe.», la lista se renueva y la fila desaparece"
- **CL3-E06** (respuestas) → `dudas-03e.test.tsx`:
  - "CL3-E06: se piden al abrir, en orden ascendente, y «Ver más respuestas» pide con el cursor"
  - "CL3-E06: estudiante responde: un POST, el aviso, la respuesta aparece y el conteo de la duda se renueva" (y `maestro`)
  - "CL3-E06: el admin lee las respuestas sin formulario"
  - "CL3-E06: borrar una respuesta pide confirmación y el foco va al «Borrar» de la vecina; sin vecinas, al h3 «Respuestas»"
- **CL3-E07** (`VALIDACION` fuera de contrato de duda, respuesta y marcar; los envoltorios recorren `ENTRADAS_FUERA_DE_CONTRATO`) →
  - `dudas-03e.test.tsx`: "CL3-E07: publicar una duda con resuelta: da un solo mensaje legible, conserva lo escrito y el botón sale de la espera" (y `vacío`, `solo espacios`, `texto.0:`); "CL3-E07: tras un «texto:» del servidor, un envío vacío muestra solo «Escribe tu duda»" (la secuencia); "CL3-E07: responder con dudaId: (el servidor dice «dudaId: dudaId: debe ser un identificador válido») da un solo mensaje legible, el esperado «Esa duda ya no existe.», conserva lo escrito y el botón sale de la espera" (y `vacío`, `solo espacios`, `texto.0:`); "CL3-E07: tras un «texto:» del servidor al responder, un envío vacío muestra solo «Escribe tu respuesta»" (la secuencia); "CL3-E07: marcar con resuelta: da un aviso legible y el botón sale de la espera" (y `vacío`, `resuelta.0:`).
  - `dudas-lib-03e.test.ts`: "CL3-E07: erroresDeLaDudaDeApi recorre ENTRADAS_FUERA_DE_CONTRATO: ninguna va a un campo y el aviso es legible" (y `erroresDeLaRespuestaDeApi`); "CL3-E07: la duda y la respuesta pintan solo «texto»"; "CL3-E07: erroresDeLaDudaDeApi da el error de «texto» bajo su campo, con el genérico si queda sin texto visible" (y la de la respuesta); "CL3-E07: erroresDeLaDudaDeApi no pinta «resuelta:», «dudaId:», «respuestaId:» ni «texto.0:»" (y la de la respuesta); "CL3-E07: los avisos de lo que no se pinta son legibles: dudaId da «Esa duda ya no existe.», respuestaId «Esa respuesta ya no existe.» y resuelta el genérico"; "CL3-E07: DUDA_NO_ENCONTRADA y RESPUESTA_NO_ENCONTRADA tienen su texto fijo y renuevan la lista, con BORRADO_NO_PERMITIDO".
- **CL3-E08** (O-16 en duda y respuesta) → `dudas-03e.test.tsx`:
  - "CL3-E08: con el formulario de duda montado, un VALIDACION de texto: va bajo el campo sin aviso"
  - "CL3-E08: con la vista desmontada y el POST en vuelo, un VALIDACION de texto: da un aviso"
  - "CL3-E08: con el formulario de respuesta montado, un VALIDACION de texto: va bajo el campo sin aviso"
  - "CL3-E08: con las respuestas plegadas y el POST en vuelo, un VALIDACION de texto: da un aviso"
- **CL3-E09** (R4 por camino) → `dudas-caminos-03e.test.tsx`: "CL3-E09 (a): pulsar «Dudas» estando ahí pide la lista desde la primera página y la frase desaparece"; "CL3-E09 (b): ir a «Avisos» y volver antes de 30 s pide la lista y la frase desaparece"; "CL3-E09 (c): atrás y adelante del historial piden la lista y la frase desaparece"; "CL3-E09 (d): con la frase a la vista no se ofrece «Ver más dudas»". Router real y `Providers` de `app/providers.tsx`.
- **CL3-E10** (R5 por camino) → `dudas-caminos-03e.test.tsx`: "CL3-E10 (a): «Ocultar respuestas» y «Ver respuestas (n)» piden la primera página y la frase desaparece"; "CL3-E10 (b): pulsar «Dudas» estando ahí con el bloque abierto en error lo vuelve a pedir; otras respuestas abiertas y sanas no se piden" (dos dudas abiertas y una sola en error); "CL3-E10 (c): ir a «Avisos», volver y reabrirlas las pide y la frase desaparece"; "CL3-E10 (d): con la frase a la vista no se ofrece «Ver más respuestas»".
- **CL3-E11** (R7) → `dudas-03e.test.tsx`: "CL3-E11: 'publicar una duda' tras un 503 avisa, sale de la espera, conserva lo escrito y un segundo clic termina como un primer envío correcto" y sus gemelos `'marcar'`, `'quitar «Resuelta»'`, `'borrar una duda'`, `'responder'` y `'borrar una respuesta'`.
- **CL3-E12** (ruta `…/dudas` en las tres ramas y la sección entre «Recursos» y «Personas») → `dudas-caminos-03e.test.tsx`: "CL3-E12: estudiante en …/dudas monta «Dudas», con la sección activa entre «Recursos» y «Personas»" (y `maestro`, `admin`). Además, las listas de secciones de la lista cerrada (`clase-layout`, `router-01d`, `lib.test`, `secciones-03c1`).
- **CL3-E13** (R9 en Dudas) → `dudas-caminos-03e.test.tsx`, cada uno con `500` y con `red`: "CL3-E13 (3a): primera carga de la lista con 500; pulsar «Dudas» estando ahí la vuelve a pedir y el texto desaparece"; "CL3-E13 (3b): primera carga de la lista con 500; ir a «Avisos» y volver antes de 30 s la pide y el texto desaparece"; "CL3-E13 (3c): primera carga de la lista con 500; atrás y adelante del historial la piden y el texto desaparece"; "CL3-E13 (4): primera carga de las respuestas con 500; «Ocultar respuestas» y «Ver respuestas (n)» las piden y el texto desaparece"; "CL3-E13 (4): primera carga de las respuestas con 500 en una duda sin respuestas; «Ocultar respuestas» y «Responder» las piden y el texto desaparece"; "CL3-E13 (4a): primera carga de las respuestas con 500; pulsar «Dudas» con el bloque abierto las vuelve a pedir y el texto desaparece"; "CL3-E13 (4b): primera carga de las respuestas con 500; ir a «Avisos», volver y reabrirlas las pide y el texto desaparece"; "CL3-E13 (4c): primera carga de las respuestas con 500; atrás y adelante del historial y reabrirlas las pide y el texto desaparece" (los mismos títulos con `red` en lugar de `500`).
- **CL3-E14** (el control de las respuestas, estudiante y maestro; cada estado comparado por referencia) → `dudas-03e.test.tsx`: "CL3-E14: estudiante · con 0 respuestas, «Responder» despliega con un GET, el foco va al campo y el mismo botón pasa a «Ocultar respuestas»; la primera respuesta deja el bloque abierto y, al plegar, «Ver respuestas (1)»"; "CL3-E14: estudiante · con n ≥ 1, plegado «Ver respuestas (n)» y desplegado «Ocultar respuestas»; borrar la última deja «Ocultar respuestas» y al plegar, «Responder»"; "CL3-E14: estudiante · una recarga de la lista con el bloque plegado cambia «Responder» ↔ «Ver respuestas (1)» en el mismo botón y el foco se queda" (los tres también con `maestro`).
- **CL3-E15** (el admin) → `dudas-03e.test.tsx`: "CL3-E15: con 0 respuestas no hay control ni formulario; con n ≥ 1, «Ver respuestas (n)» y «Ocultar respuestas», sin formulario"; "CL3-E15: si una recarga baja el conteo a 0 con el control plegado y el foco en él, el control desaparece y el foco va a la fila"; "CL3-E15: desplegado con el conteo en 0, el bloque sigue hasta que lo pliega y entonces el control desaparece con el foco en la fila".
- **CL3-E16** (Enmienda 13 (1), con E13-9) → `recursos-enmienda13-03e.test.tsx`:
  - (a) "CL3-E16 (a): 'maestro' con la lectura de temas al abrir en '500' (caché vieja: false): sin campo «Tema», la nota sin rol ni aviso ni aria-invalid, y guardar envía el tema del recurso" y sus 7 gemelos (`maestro`/`admin` × `500`/`red` × caché vieja `false`/`true`). La caché vieja es la de T-02 de 03d. Afirma además que "El recurso se publicará sin tema." no aparece.
  - (b) "CL3-E16 (b): 'maestro' con la lectura de temas pendiente no ve ni el campo ni ninguna nota" (y `admin`).
  - (c) "CL3-E16 (c): 'maestro' · con la nota a la vista, una lectura posterior en vuelo la deja, una que falla también, y una correcta (invalidación de claveTemas) muestra el campo con el tema elegido; guardar lo envía" (y `admin`); "CL3-E16 (c): con la nota a la vista por falta de red, recuperar la red (evento online) pide la lista y muestra el campo".
  - (d) "CL3-E16 (d): tras un 409 que reinicia el formulario y una nueva lectura de temas que falla, la nota está y el foco sigue en «Título del recurso»".
  - (e) "CL3-E16 (e): al crear, con la lista de temas en 500, sigue «…se publicará sin tema.» y nunca «…conserva su tema.»; pendiente, sin nota" (y `red`).
- **CL3-E17** (Enmienda 13 (2)) → `recursos-enmienda13-03e.test.tsx`: "CL3-E17: 'maestro' en 'Recursos del docente': un solo aviso «Ese recurso ya no existe.», nada con «publicación», la fila sale y el foco va al «Borrar recurso» de la vecina"; el mismo con `'admin' en 'Recursos del docente'` y `'admin' en 'Recursos de aprendizaje'`; "CL3-E17: «atrás» hacia la edición del recurso borrado dice «Ese recurso ya no existe.», sin «publicación»"; "CL3-E17: con 403 BORRADO_NO_PERMITIDO el aviso sigue siendo el del servidor"; "CL3-E17: en Avisos, borrar un anuncio con 404 sigue avisando «Esa publicación ya no existe.»". Además, las dos filas de la lista cerrada (`recursos-03d.test.tsx:739` y `editar-recurso-03d.test.tsx:1096`) y C-32/C-33 del tester, verdes.
  - Nota: no hay caso "maestro en Recursos de aprendizaje" porque ahí el maestro no tiene "Borrar recurso" (RN-07: `puedeBorrar` es falso en lo del admin). "En los dos bloques" queda cubierto con el admin, que borra en ambos.

Todas las viñetas tienen caso; ninguna queda sin cubrir.

## Indicaciones literales del arbitraje de la ronda 0 de 03e (punto 3), cumplidas

1. **R-03e-1:** `FormularioDuda` y `FormularioRespuesta` no llaman a `reset()` ni tienen `if (… .isError) … .reset()`. El error del servidor vive en `errores`: la validación local lo reemplaza (`setErrores(erroresPorCampo(…))`) y `setErrores({})` lo limpia antes de `mutate`, como `FormularioComentario`.
2. **R-03e-2 (C-28):** solo `elemento-de-duda.tsx` lee `duda.puedeBorrar` y solo `respuestas-de-duda.tsx` lee `respuesta.puedeBorrar`. Ninguna línea escribe `puedeBorrar=` ni `puedeBorrar:`; se pasa el objeto entero.
3. **R-03e-3 (C-21):** `enEspera=` exacto: `dudas-view.tsx` 1 ("Ver más dudas"), `elemento-de-duda.tsx` 2 (el botón único de marcar o quitar y "Sí, borrar duda"), `respuestas-de-duda.tsx` 2 ("Ver más respuestas" y "Sí, borrar respuesta"), `formulario-duda.tsx` 1 y `formulario-respuesta.tsx` 1. El control que despliega las respuestas, "Borrar duda", "Borrar" y "Cancelar" no lo llevan; ningún comentario escribe `enEspera=`. Total 71 (V-06 verde).
4. **R-03e-4 (C-19):** solo `dudas-view.tsx` llama a `perspectivaDeRuta(`; `ElementoDeDuda`, `RespuestasDeDuda` y los formularios reciben la perspectiva por props (los formularios no la necesitan).
5. **R-03e-5 (V-07 y V-13):** ningún archivo nuevo tiene `vidrio`, `vidrio-fuerte`, `vidrio-azul`, `text-danger` ni `text-destructive`. "Resuelta" es `<Badge variant="success" icon={<CircleCheck aria-hidden="true" />}>Resuelta</Badge>`.
6. **E13-9:** en `useTemasDelRecurso`, cuando el `refetch` propio termina sin éxito se guarda `queryClient.getQueryState(consultaTemas(claseId).queryKey)?.dataUpdateCount` (`datosAlFallar`). `lecturaFallida` es verdadero desde esa falla hasta que la lista se confirma; se confirma cuando el contador leído en el render es mayor que el guardado. Sin `Date.now()` ni `dataUpdatedAt` para decidir, sin "después de abrir". La nota va con `lecturaFallida && listaVigente === undefined` (más `edicion !== null`), sin mirar `isFetching`. Para que el formulario se vuelva a pintar cuando una lectura trae los mismos datos (y el contador suba sin que cambie `data`), la consulta del gancho usa `notifyOnChangeProps: "all"` (antes llamaba a `useTemas(claseId)`, que es la misma consulta sin esa opción). Es la única diferencia con la indicación: la indicación no dice cómo lograr que el render lea el contador; sin ella, una respuesta correcta con datos iguales no volvía a pintar el formulario.

## Matriz de avisos, recargas y foco (§D-14, 03e)

"Desmontada" es la vista (o el bloque) que ya no está cuando llega la respuesta. "Redirige" son los códigos de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`: todos los ganchos nuevos de mutación los callan con `errorQueRedirigeElCliente` (en Dudas, también `useCrearDuda` y `useResponder`, antes de decidir nada).

### `DudasView` (lista)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| Primera carga | `403 SIN_ACCESO_A_LA_CLASE` | — | Ninguno: `MensajeError` "No tienes acceso a esta clase." | No se mueve (ningún control se perdió) | — | Nada |
| Primera carga | 5xx, `503` o red | — | Ninguno: `MensajeError` con R9 (genérico o conexión) | No se mueve | — | Nada |
| Recarga de la lista (tras una acción) | 5xx o red | Ninguna; la lista se reemplaza por el `MensajeError` (patrón del muro, T-04) | Ninguno | Al `h2` si el foco se perdió (`useFocoAlPasarAError`) | — | Nada |
| "Ver más dudas" | `400` del cursor | — | Ninguno: R4 reemplaza la lista y "Ver más dudas" no se ofrece | Al `h2` | Clic durante una recarga: nada (`enEspera={isFetching}`, `cancelRefetch: false`) | Nada |
| "Ver más dudas" | 5xx o red | — | Ninguno: `MensajeError` (patrón del muro) | Al `h2` | Doble clic: una petición | Nada |
| "Ver más dudas" | `200` | Página siguiente | Ninguno | Si el botón se desmonta con el foco, a la primera duda nueva o al `h2` | — | — |
| Pulsar "Dudas" estando ahí | — | Solo la lista si está en error (y las respuestas abiertas en error) | Ninguno | — | — | — |
| "Publicar duda" | `201` | Dudas (exacta) | "Duda publicada" | Sin cambio; el campo se vacía | Doble clic: un `POST` (guarda `enviandoRef`) | El aviso sale (gancho) |
| "Publicar duda" | `400` de `texto` | — | Ninguno: `ErrorDeCampo` | El campo | — | Un aviso del gancho, sin ruta (O-16) |
| "Publicar duda" | `400` fuera de contrato (`resuelta:`, vacío, espacios, `texto.0:`) | — | Uno, legible | En el botón | — | Uno |
| "Publicar duda" | `404`/`403` (`SIN_ACCESO_A_LA_CLASE`), 5xx, `503`, red | — (con `DUDA_NO_ENCONTRADA` o `BORRADO_NO_PERMITIDO`, no aplica aquí, renovaría) | Uno (R7: el botón sale de la espera y lo escrito queda) | En el botón | — | Uno |
| "Marcar como resuelta" / "Quitar «Resuelta»" | `200` | Dudas (exacta); la mutación espera la lista nueva | "Marcada como resuelta" / "Ya no está marcada como resuelta" | Se queda en el mismo botón, que cambia de texto | Doble clic: un `PUT` (guarda `marcandoRef`) | El aviso sale |
| Marcar | `404 DUDA_NO_ENCONTRADA` | Dudas: la fila desaparece | "Esa duda ya no existe." | Al "Marcar como resuelta" de la vecina (o su "Borrar duda", o su fila); sin vecinas, al `h2` | — | El aviso sale |
| Marcar | `400` (`resuelta:`, vacío, `resuelta.0:`), `403`, 5xx, red | — | Uno, legible | En el botón (sale de la espera) | — | Uno |
| "Sí, borrar duda" | `204` | Dudas; las respuestas de esa duda salen de la caché | "Duda borrada" | Al "Borrar duda" de la vecina (o su fila); sin vecinas, al `h2` | Doble clic: un `DELETE` (guarda `borrandoRef`; "Cancelar" no cierra en vuelo) | El aviso sale |
| Borrar duda | `403 BORRADO_NO_PERMITIDO` | Dudas (`puedeBorrar` se actualiza) | El del servidor | Si el botón desaparece y la fila sigue, a la fila | — | El aviso sale |
| Borrar duda | `404 DUDA_NO_ENCONTRADA` | Dudas; sus respuestas salen de la caché | "Esa duda ya no existe." | Vecina o `h2` | — | El aviso sale |
| Borrar duda | 5xx, `503`, red | — | Uno (R7) | En "Sí, borrar duda" (sale de la espera) | — | Uno |
| Recarga que cambia el conteo, bloque plegado | `200` | El texto del control ("Responder" ↔ "Ver respuestas (n)") en el mismo botón; para el admin el control aparece o desaparece | Ninguno | Se queda en el botón; si desaparece con el foco (admin), a la fila | — | — |
| Cambio de clase (misma instancia) | — | — | — | Si el foco se perdió dentro de una fila, al `h2` (O-14) | — | — |
| Cualquiera | Redirige `apiClient` | — | Ninguno | — | — | Ninguno |

### Respuestas de una duda (`RespuestasDeDuda`, `FormularioRespuesta` y el control)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada (bloque plegado o vista fuera) |
|---|---|---|---|---|---|---|
| "Responder" plegado con 0 respuestas | (no pide por sí) | Monta el bloque y pide su primera página | Ninguno | Al campo "Escribe una respuesta"; el control pasa a "Ocultar respuestas" sin moverse | Doble clic: despliega y pliega; ningún `POST` | — |
| "Ver respuestas (n)" / "Ocultar respuestas" | — | Al montar, la primera página (sin cursor) | Ninguno | Se queda en el control | — | — |
| Admin pliega un bloque con 0 respuestas | — | — | Ninguno | El control desaparece: a la fila de la duda | — | — |
| Primera carga | 5xx, `503`, red | — | Ninguno: `MensajeError` con R9 en el bloque | No se mueve (el foco está en el control, fuera del bloque) | Otras dudas abiertas siguen | Nada |
| "Ver más respuestas" | `400` del cursor | — | Ninguno: R5; "Ver más respuestas" no se ofrece | Al `h3` "Respuestas" (`useFocoAlCargarMas`) | Clic durante una recarga: nada (`enEspera={isFetching}`) | Nada |
| "Ver más respuestas" | 5xx o red | — | Ninguno: `MensajeError` en el bloque | Al `h3` | Doble clic: una petición | Nada |
| Pulsar "Dudas" | — | Solo las respuestas abiertas en error | Ninguno | — | Las sanas no se piden | — |
| "Responder" (enviar) | `201` | Respuestas de esa duda y dudas (conteo) | "Respuesta publicada" | Sin cambio; el bloque sigue abierto, el control sigue en "Ocultar respuestas" | Doble clic: un `POST` | El aviso sale |
| "Responder" (enviar) | `400` de `texto` | — | Ninguno: `ErrorDeCampo` | El campo | — | Un aviso del gancho, decidido tras su última espera (O-16) |
| "Responder" (enviar) | `400` fuera de contrato (`dudaId:` → "Esa duda ya no existe.", vacío, espacios, `texto.0:`) | — | Uno | En el botón | — | Uno |
| "Responder" (enviar) | `404 DUDA_NO_ENCONTRADA` | Respuestas y dudas: la fila y su bloque desaparecen | "Esa duda ya no existe." | Vecina o `h2` (lo resuelve `DudasView`) | — | El aviso sale |
| "Responder" (enviar) | 5xx, `503`, red | — | Uno (R7) | En el botón; lo escrito queda | — | Uno |
| "Sí, borrar respuesta" | `204` | Respuestas y dudas | "Respuesta borrada" | Al "Borrar" de la vecina (o la respuesta vecina); sin vecinas, al `h3` | Doble clic: un `DELETE` (guarda `borrandoRef`) | El aviso sale |
| Borrar respuesta | `403 BORRADO_NO_PERMITIDO` / `404 RESPUESTA_NO_ENCONTRADA` / `404 DUDA_NO_ENCONTRADA` | Respuestas y dudas | El mensaje | Según la fila | — | El aviso sale |
| Borrar respuesta | 5xx, red | — | Uno (R7) | En el botón | — | Uno |

### Formulario de recurso al editar (Enmienda 13)

| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| Lectura de temas pedida al abrir | `200` | La lista confirma: campo «Tema» con el tema del recurso | Ninguno | No se mueve | — | — |
| Lectura de temas al abrir | 5xx o red | Nada | Ninguno: la nota "No pudimos cargar los temas. El recurso conserva su tema." en lugar del campo (`<p>` `text-small text-muted-foreground`, sin rol, sin `aria-invalid`) | No se mueve | Pendiente: ni campo ni nota | Nada (el `setState` de un componente desmontado se descarta) |
| Lectura posterior (invalidación, `online`, otra lectura) | En vuelo | — | La nota sigue | — | — | — |
| Lectura posterior | 5xx o red | — | La nota sigue | — | — | — |
| Lectura posterior | `200` | Confirma (`dataUpdateCount` mayor que el de la falla): el campo aparece con el tema del recurso y la nota se va | Ninguno | No se mueve | — | — |
| "Guardar cambios" con la nota | `200` | Como en 03d | "Cambios guardados" | Navega a Recursos | — | — |
| "Guardar cambios" | `409` y la relectura de temas falla | El recurso; el formulario se reinicia y pide los temas otra vez | El del `409` | "Título del recurso" | — | — |
| "Sí, borrar recurso" (en «Recursos») | `404 PUBLICACION_NO_ENCONTRADA` | Recursos y temas; `claveRecurso` sale de la caché | "Ese recurso ya no existe." (antes, "Esa publicación ya no existe.") | Vecina o `h3` | — | El aviso sale |
| "Sí, borrar recurso" | `403 BORRADO_NO_PERMITIDO` | Recursos y temas | El del servidor (sin cambio) | Según la fila | — | El aviso sale |

## Hermanos y estados vecinos

**Hermanos del cambio de texto del `404` al borrar (Enmienda 13 (2)):**
- `useBorrarRecurso`: aplicado.
- `useMoverElemento` (mover un recurso que ya no existe), `useComentar` y "Ver comentarios" (`mensajeDeErrorDeLista`) en un recurso: **no aplicado**, por la observación de la Enmienda 13 y el arbitraje del manager ("otra decisión de texto del humano"; el tester no los cuenta como hallazgo de CL3-E17). Siguen diciendo "Esa publicación ya no existe.".
- `useBorrarPublicacion` (Avisos): no aplica, por decisión; lo fija el último caso de CL3-E17.

**Hermanos de la nota de temas al editar (Enmienda 13 (1)):** la nota de crear (`temasNoCargados`) no cambia (CL3-E16 (e)); ningún otro formulario edita con la lista total de temas en este módulo.

**Estados vecinos de E13-9 (`useTemasDelRecurso` y la nota), uno por uno:**
- Lectura al abrir correcta: confirma como en 03d; la nota nunca aparece (T-02/T-03 de 03d, verdes).
- Lectura al abrir pendiente: ni campo ni nota (CL3-E16 (b)).
- Lectura al abrir que falla, sin caché y con caché vieja: la nota (CL3-E16 (a)); la caché vieja no confirma porque su contador no sube después de la falla.
- Lectura al abrir que falla y después una invalidación correcta: el campo aparece y la nota se va (CL3-E16 (c)).
- Evento `online` tras una falla por red: la lista se vuelve a pedir y confirma (CL3-E16 (c), el caso del evento `online`).
- Lectura posterior en vuelo: la nota sigue (CL3-E16 (c), primer tramo).
- Lectura posterior fallida: la nota sigue (CL3-E16 (c), segundo tramo).
- Reinicio por `409`: el formulario se vuelve a montar (`key={reinicios}`), el gancho pide otra vez y, si falla, la nota está con el foco en el título (CL3-E16 (d)).
- Petición previa en vuelo al abrir (T-03 de 03d): sin cambio en la lógica; si la lectura propia que sigue falla, se guarda el contador de ese momento, así la respuesta previa (que terminó antes) no confirma.
- `setQueryData` de la lista total por "Subir"/"Bajar" tras una falla: sube el contador y confirma con datos del servidor (la respuesta del `PUT`); es una respuesta correcta posterior.
- Modo crear: `confirmada` nace verdadera y no hay nota de edición (CL3-E16 (e)).

**Hermanos de O-16 (duda y respuesta):** `useCrearDuda` y `useResponder` deciden después de su espera (`avisarErrorDelTexto`, como `avisarErrorDelRecurso`); `useComentar`, `useCrearPublicacion` y los de tema y clase no cambian.

**Hermanos de "el control desaparece con el foco" (S-14):** el control del admin al plegar con 0 (lo atiende `ElementoDeDuda`, que no depende de que `DudasView` se vuelva a pintar) y al bajar el conteo con una recarga (`ElementoDeDuda` y, de respaldo, `DudasView`); "Borrar duda" que desaparece por `BORRADO_NO_PERMITIDO` (a la fila, `DudasView`); "Marcar como resuelta" que desaparece si `puedeMarcar` pasa a falso (a la fila, `DudasView`).

## Desviaciones del plan

- `useTemasDelRecurso` pasa de `useTemas(claseId)` a `useQuery({ ...consultaTemas(claseId), notifyOnChangeProps: "all" })` (la misma consulta y la misma clave). Motivo en la indicación 6 de arriba. No cambia ninguna otra llamada a `useTemas`.
- Nada más.

## Pendiente o fuera de alcance

- "Mover", comentar y "Ver comentarios" de un recurso borrado siguen diciendo "Esa publicación ya no existe." (observación de la Enmienda 13; decisión de texto del humano pendiente).
- El paso 6 (comprobación humana H-1 a H-7 y A-07, A-13 y A-14) es del orquestador. `docs/DESIGN.md` §7.31 (Dudas) no lo toqué: lo aplica el orquestador con A-07.
- Ningún navegador abierto; lo visual (H-5, H-7) queda para la comprobación humana.

## git diff --stat (frontend, contra el árbol de la sesión; incluye las 9 `*.ataque` del tester)

```
 frontend/src/app/router-01d.test.tsx               |  25 ++-
 frontend/src/app/router.tsx                        |   5 +
 frontend/src/app/rutas-01d-r1.ataque.test.tsx      |   5 +-
 frontend/src/features/clases/clase-layout.test.tsx |  28 ++-
 .../clases/clases-admin-02c-r1.ataque.test.tsx     |  11 +-
 .../clases/components/formulario-recurso.tsx       |  19 +-
 frontend/src/features/clases/data.ts               |  81 +++++++
 .../features/clases/editar-recurso-03d.test.tsx    |   2 +-
 frontend/src/features/clases/errores-ch3.test.ts   |   5 +-
 .../features/clases/estatico-02c-r1.ataque.test.ts |  16 +-
 .../clases/heredados-02d-r1.ataque.test.tsx        |   9 +-
 frontend/src/features/clases/hooks.ts              | 240 ++++++++++++++++++++-
 .../clases/indicador-03c1-r1.ataque.test.tsx       |  41 ++--
 .../clases/indicador-03c1-r2.ataque.test.tsx       |  41 ++--
 frontend/src/features/clases/lib.test.ts           |  20 +-
 frontend/src/features/clases/lib.ts                |  10 +
 .../clases/recursos-03d-r1.ataque.test.tsx         |   5 +-
 .../clases/recursos-03d-r2.ataque.test.tsx         |   5 +-
 frontend/src/features/clases/recursos-03d.test.tsx |   2 +-
 .../src/features/clases/secciones-03c1.test.tsx    |  33 +--
 frontend/src/features/clases/types.ts              |   5 +
 frontend/src/styles/clases-r1.ataque.test.ts       |  18 +-
 22 files changed, 529 insertions(+), 97 deletions(-)
```

Nuevos sin seguimiento (9): `features/clases/dudas-view.tsx`, `components/elemento-de-duda.tsx`, `components/formulario-duda.tsx`, `components/formulario-respuesta.tsx`, `components/respuestas-de-duda.tsx`, `dudas-03e.test.tsx`, `dudas-caminos-03e.test.tsx`, `dudas-lib-03e.test.ts` y `recursos-enmienda13-03e.test.tsx`.

Nota: tras la corrida completa intermedia (13:36, verde, 5881) cambié solo el título de un caso de CL3-E07 en `dudas-03e.test.tsx` (para que diga el texto esperado); `npm run lint`, `npx vitest run` (14:09), `npx vitest list` y `npm run build` de las tablas son posteriores a ese cambio.

## Corrección de la ronda 1 (T-01 y T-02)

Fuentes: `reporte-tester.md` (SHA-256 `17ea0fd5…`), "## CLASES-03e — Ronda 1"; `revision.md` (SHA-256 `c8bf0252…`), "## Verificación del resumen del programador — 03e" (O-3). Solo cambié producción de `features/clases` y mi prueba normal `dudas-03e.test.tsx`. No toqué ninguna `*.ataque`, `features/tareas`, `shared/` ni el backend. No hubo rojos inesperados.

### T-01: corregido
- **Causa:** la marca propia de `ElementoDeDuda` solo se borraba con un `blur` que tenía `relatedTarget`. Un clic en blanco la dejaba viva y una recarga posterior que quitaba el control llevaba el foco a la fila.
- **Remedio:** quité la marca propia y uso el mecanismo hermano, `useFilaEnFoco`, sin cambiarlo:
  - `components/elemento-de-duda.tsx:62`: `useFilaEnFoco("data-desplegar-respuestas")`.
  - `:147`: el control lleva `data-desplegar-respuestas={duda.id}` (antes `""`), así cada fila reconoce el suyo.
  - `:73`: el efecto solo enfoca la fila si la marca es el id de esta duda.
  - Con esto, un foco que pasa a otro elemento cambia la marca. Un clic en blanco con la ventana enfocada la borra. El desmontaje del control y el cambio de pestaña la conservan (O-19).
- **Pruebas:**
  - Del tester: CL3-4R1-01 (`:348`), CL3-4R1-02 (`:366`) y el control CL3-4R1-03 (`:390`), verdes.
  - Mías, en `dudas-03e.test.tsx`, dentro de "corrección de la ronda 1 de 03e (T-01 y T-02)":
    - "T-01: el foco sale del control a «Marcar como resuelta» y vuelve; una recarga quita el control: el foco va a la fila"
    - "T-01: con el foco en el control de otra duda, el control que desaparece en esta no mueve el foco"

### T-02: corregido
- **Causa:** con el bloque de respuestas abierto, dos caminos volvían a pedir las respuestas de una duda que ya no existía. El `404` resultante lo pintaba el bloque como un `MensajeError` dentro de la fila, además del aviso.
  - **Borrar la duda (`204` o `404`):** `removeQueries` con el observador montado volvía a crear la consulta, que salía a pedirse.
  - **Responder o borrar una respuesta con `DUDA_NO_ENCONTRADA`:** `invalidarRespuestasYDudas` volvía a pedir las respuestas.
- **Remedio:** elegí no volver a pedir las respuestas de una duda que ya no existe.
  - **Por qué:** §D-14 ("respuestas de esa duda fuera") y la regla de un solo aviso dicen que la persona lee un solo mensaje. Pedir una lista que se sabe borrada solo produce un segundo mensaje que repite el primero.
  - **Por qué no sacar la duda de la caché antes:** CL3-4R1-06 pide que la fila siga a la vista mientras llega la lista. Si saliera antes de que el servidor la confirme, el foco tendría que moverse dos veces.
  - **Cambios:**
    - `hooks.ts:1347`: `useRespuestas` gana `pedir` (`enabled`).
    - `components/elemento-de-duda.tsx:67` y `:215`: mientras la duda se borra (`borrar.isPending`), después de borrarla (`isSuccess`) o con un `DUDA_NO_ENCONTRADA` al borrarla, `RespuestasDeDuda` recibe `pedir={false}`. Lo que ya se ve se queda y la consulta, aunque `removeQueries` la vuelva a crear, no sale.
    - `hooks.ts:1381` (`renovarTrasErrorDeRespuesta`): al responder o borrar una respuesta, un `DUDA_NO_ENCONTRADA` renueva solo la lista; los otros códigos que renuevan, como antes, las respuestas y la lista. La regla de 03c2 se sigue cumpliendo: `useResponder` decide si avisar del campo después de esa espera.
    - **Hermano, una consulta:** `hooks.ts:1398` (`useRenovarSiLaDudaYaNoEsta`, usado en `components/respuestas-de-duda.tsx:142`). Si abrir las respuestas o "Ver más respuestas" responde `DUDA_NO_ENCONTRADA`, la lista se renueva una vez por fallo y la fila sale. Mientras tanto, el bloque muestra su único mensaje, sin aviso.
    - `lib.ts:713`: `esDudaNoEncontrada`.
- **Pruebas:**
  - Del tester: CL3-4R1-06 (`:447`), -07 (`:477`), -08 (`:504`) y -09 (`:532`), y el control CL3-4R1-10 (`:559`), verdes.
  - Mías, en `dudas-03e.test.tsx`, dentro del mismo `describe`:
    - "T-02: borrar la duda con 503 y sus respuestas abiertas: las respuestas y lo escrito siguen, sin volver a pedirlas ni otro mensaje"
    - "T-02: abrir las respuestas de una duda que otra persona borró: un solo mensaje en el bloque, ningún aviso, y la lista se renueva y la fila sale"
    - "T-02: «Ver más respuestas» de una duda que otra persona borró: el bloque dice «Esa duda ya no existe.», ningún aviso, y la fila sale con la lista nueva"
    - "T-02: borrar una respuesta que otra persona ya borró (RESPUESTA_NO_ENCONTRADA): un aviso y se renuevan las respuestas y la lista"

### Hermanos y estados vecinos de T-01 (marcas de foco en Dudas y Recursos)

| Mecanismo | Blur a otro control | Blur a nada (clic en blanco) | Bloque desplegado | Bloque plegado | Desmontaje del control | ¿Aplica el remedio? |
|---|---|---|---|---|---|---|
| Control de respuestas (`elemento-de-duda.tsx`) | La marca pasa al otro elemento: no mueve el foco (CL3-4R1-03) | Se borra: no mueve el foco (CL3-4R1-01, -02) | El control nunca desaparece desplegado (S-15); al plegar (admin, 0) con el foco: a la fila (CL3-E15) | Recarga a 0 con el foco: a la fila (CL3-E15); con el foco en el control de otra duda: no se mueve (prueba nueva) | Conserva la marca: a la fila | Sí, aplicado (`useFilaEnFoco`) |
| Fila de duda en `DudasView` (`useFilaEnFoco("data-duda-id")`) | Cambia | Se borra | — | — | Conserva | Ya usaba el mecanismo; sin cambio |
| `conMarcarEnFocoRef` de `DudasView` (qué control de la vecina) | Se actualiza en cada `focus` | No se borra, pero solo se lee si la marca de la fila sigue viva (que sí se borra) | — | — | — | No aplica: no decide si mover el foco, solo a dónde |
| Respuestas (`useFilaEnFoco("data-respuesta-id")`) y "Ver más" (`useFocoAlCargarMas`) | Cambia | Se borra | — | — | Conserva | Ya usaban el mecanismo; sin cambio |
| Confirmación en línea ("Cancelar" ↔ "Borrar duda", "Borrar") | — | — | — | — | — | No aplica: mueve el foco por un clic de la persona, no por una marca |
| Recursos: `conMoverEnFocoRef` de `SeccionDeRecursos`, filas `data-recurso-id` y secciones `data-seccion-de-recursos` (`useFilaEnFoco`) | Cambia | Se borra (la marca de fila) | — | — | Conserva | Ya usaban el mecanismo; `conMoverEnFocoRef` es como `conMarcarEnFocoRef`. Sin cambio (fuera de 03e) |
| Comentarios de Recursos y Avisos (`useFilaEnFoco("data-comentario-id")`) | Cambia | Se borra | — | — | Conserva | Ya usan el mecanismo; sin cambio |

### Hermanos y estados vecinos de T-02 (cada acción con la duda o la respuesta que ya no está)

| Acción | 404 de la duda, bloque abierto | 404 de la duda, bloque cerrado | 404 de la respuesta | Éxito |
|---|---|---|---|---|
| Marcar | Un aviso; solo la lista (`exact`); no pide respuestas (CL3-4R1-10). Sin cambio | Igual (CL3-E04) | No aplica | Un aviso; el mismo botón (CL3-E04) |
| Quitar «Resuelta» | Igual que marcar (mismo gancho) | Igual | No aplica | Igual |
| Borrar duda | Un aviso; respuestas sin pedir (`pedir={false}`) y fuera de la caché; la fila sale con la lista (CL3-4R1-07) | Un aviso; la fila sale (CL3-E05) | No aplica | "Duda borrada"; respuestas sin pedir y fuera de la caché (CL3-4R1-06, CL3-E05). Con 503, el bloque vuelve a pedir si hace falta y conserva lo escrito (prueba nueva) |
| Responder | Un aviso; solo la lista (`renovarTrasErrorDeRespuesta`), sin `MensajeError` (CL3-4R1-08) | No aplica (el formulario vive en el bloque) | No aplica | "Respuesta publicada"; respuestas y lista (CL3-E06) |
| Borrar respuesta | Un aviso; solo la lista (CL3-4R1-09) | No aplica | Un aviso; respuestas y lista se renuevan (prueba nueva) | "Respuesta borrada"; respuestas y lista (CL3-E06) |
| "Ver más respuestas" (consulta) | El bloque dice "Esa duda ya no existe." (un solo mensaje, sin aviso); la lista se renueva y la fila sale (prueba nueva) | No aplica | No aplica (cursor vencido: R5, CL3-E10) | Página siguiente (CL3-E06) |
| Abrir las respuestas (consulta) | Igual que "Ver más respuestas" (prueba nueva) | No aplica | No aplica | Primera página (CL3-E06) |

**Mismos patrones en comentarios de Recursos y Avisos** (solo digo si aplican; están fuera de 03e y no los toqué):
- `useBorrarPublicacion` y `useBorrarRecurso` no hacen `removeQueries` de los comentarios. El borrado del recurso quita su `claveRecurso`, que no tiene observador en «Recursos».
- `invalidarComentarios` (comentar y borrar un comentario) vuelve a pedir los comentarios abiertos. Con `PUBLICACION_NO_ENCONTRADA` (publicación o recurso borrados por otra persona), los ganchos de comentarios solo avisan y no renuevan nada, así que no hay un segundo `GET` que pinte un error.
- Si la lista de comentarios se pidiera de una publicación ya borrada, `ComentariosDePublicacion` pintaría su `MensajeError`, la misma clase de caso que "Ver más respuestas".
- Conclusión: el patrón aplicaría en parte. Queda como observación para el `chore` de foco y navegación o para la decisión de texto pendiente (Enmienda 13).

### Matriz de avisos, recargas y foco: filas que cambian con esta corrección
| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| "Sí, borrar duda", bloque abierto | `204` | Dudas; las respuestas no se vuelven a pedir y salen de la caché | "Duda borrada" (uno) | Vecina o `h2` | Las respuestas no se piden mientras el `DELETE` y la lista están en vuelo | El aviso sale |
| "Sí, borrar duda", bloque abierto | `404 DUDA_NO_ENCONTRADA` | Dudas; respuestas sin pedir | "Esa duda ya no existe." (uno) | Vecina o `h2` | Igual | El aviso sale |
| "Sí, borrar duda", bloque abierto | 5xx o red | — | Uno | En el botón | El bloque vuelve a `pedir`; con la caché fresca no sale otra petición | Uno |
| "Responder" / "Sí, borrar respuesta" | `404 DUDA_NO_ENCONTRADA` | Solo dudas | Uno; ningún `MensajeError` | Vecina o `h2` cuando la fila sale | — | El aviso sale |
| Abrir respuestas / "Ver más respuestas" | `404 DUDA_NO_ENCONTRADA` | Dudas (una vez por fallo) | Ninguno: el `MensajeError` del bloque es el único mensaje | Si el foco estaba en "Ver más respuestas", al `h3`; cuando la fila sale, a la vecina o al `h2` | — | Nada |
| Recarga que quita el control del admin | `200` | — | Ninguno | A la fila solo si el control tenía el foco (marca de `useFilaEnFoco`); tras un clic en blanco, no se mueve | — | — |

### Verificación de la corrección (desde `frontend/`, una tras otra)

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0; antes, `All matched files use Prettier code style!`) |
| `npx vitest list \| grep -acE "^src/"` | `5906` |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `270` |
| `npx vitest run` | `Test Files  270 passed (270)` · `Tests  5906 passed (5906)` · `Duration  262.82s`. «timed out»: 0 |
| `npm run build` | `✓ built in 892ms` |

### Conteos
- **5906 casos en 270 archivos.** Base 5900 / 270 (ronda 1 del tester, con sus 2 `*.ataque` nuevas).
- `dudas-03e.test.tsx` pasa de 63 a 69 (`grep -ac "^src/features/clases/dudas-03e.test.tsx"` sobre la salida de `npx vitest list`): los 6 casos nuevos de "corrección de la ronda 1 de 03e (T-01 y T-02)". Ningún otro archivo cambia de cuenta. 5900 + 6 = 5906.

### Archivos de la corrección
- Producción:
  - `frontend/src/features/clases/components/elemento-de-duda.tsx`
  - `frontend/src/features/clases/components/respuestas-de-duda.tsx`
  - `frontend/src/features/clases/hooks.ts`
  - `frontend/src/features/clases/lib.ts`
- Prueba normal: `frontend/src/features/clases/dudas-03e.test.tsx` (solo se suma el `describe` nuevo).

## Corrección de la ronda 2 (T-03 y T-04)

Fuentes: `reporte-tester.md` (SHA-256 `f85e780f…`), "## CLASES-03e — Ronda 2"; `revision.md` (SHA-256 `2dac08e8…`), O-4 y O-5 de "## Verificación de la corrección de la ronda 1 — 03e". Solo cambié producción de `features/clases` (`hooks.ts` y `components/respuestas-de-duda.tsx`) y mi prueba normal `dudas-03e.test.tsx`. No toqué ninguna `*.ataque`, `features/tareas`, `shared/` ni el backend. No hubo rojos inesperados.

### T-03: corregido
- **Causa (TanStack Query 5.103.2):** `useBorrarDuda` llamaba a `removeQueries` de las respuestas con `RespuestasDeDuda` montado. En el siguiente pintado, `getOptimisticResult` construye una consulta nueva sin datos. Con `enabled: false` no se pide, pero queda `isPending`, y el bloque cambiaba lo que se veía por `<Cargando />` (`role="status"`).
- **Remedio:** la consulta no sale de la caché mientras alguien la observa.
  - `hooks.ts:1481`, `quitarRespuestasAlCerrarseSuBloque`: si la consulta no tiene observadores, sale al momento. Si los tiene, se suscribe a la caché (`getQueryCache().subscribe`) y la quita con el evento `observerRemoved` que la deja sin observadores, es decir, cuando la fila sale con la lista nueva, la lista entera se reemplaza o la vista se desmonta.
  - La usan el éxito (`:1515`) y el `404 DUDA_NO_ENCONTRADA` (`:1523`) de `useBorrarDuda`.
  - Mientras tanto la consulta conserva sus datos y no se pide (`pedir={false}` de la ronda 1), así que la fila sigue mostrando lo que se veía, sin estado vivo, hasta que sale.
- **Por qué este remedio y no otro:**
  - "Conservar los últimos datos visibles" con `placeholderData` seguiría construyendo una consulta nueva.
  - Bajar `gcTime` no sirve: TanStack Query 5 conserva el mayor `gcTime` de una consulta.
  - Quitar la consulta al dejar de observarla es exactamente "las respuestas de esa duda salen de la caché" de §D-14, sin pasar por un estado intermedio.
- **Pruebas:**
  - Del tester: CL3-4R2-01 (`:387`), -02 (`:412`) y -03 (`:435`), verdes. CL3-4R1-06 y -07 (la caché vacía al final) siguen verdes.
  - Mías, en `dudas-03e.test.tsx`, `describe` "corrección de la ronda 2 de 03e (T-03 y T-04)":
    - "T-03: borrar (204) con dos páginas de respuestas abiertas: las que se veían siguen sin «Cargando…» mientras llega la lista; después la fila sale y las respuestas salen de la caché"
    - "T-03: otra persona borra la duda y una recarga la quita: la fila sale sin pedir sus respuestas ni mostrar ningún mensaje"
    - "T-03: con la vista desmontada mientras se borra la duda, al responder 204 sus respuestas salen de la caché"

### T-04: corregido
- **Causa:** `fetchNextPage` no mira `enabled`, así que `pedir={false}` no detenía "Ver más respuestas".
- **Remedio:** `components/respuestas-de-duda.tsx:223`, `enEspera={respuestas.isFetching || !pedir}`.
  - Mientras la duda se borra, o si ya no existe, "Ver más respuestas" queda en espera: conserva el foco, y `Button` no dispara su acción en espera.
  - Si el borrado falla (5xx o red), `pedir` vuelve a ser verdadero y el botón pide.
  - La cuenta de `enEspera=` no cambia: sigue en 2 en el archivo y en 71 en total.
- **Pruebas:**
  - Del tester: CL3-4R2-04 (`:459`), verde.
  - Mía: "T-04: con el DELETE en vuelo, «Ver más respuestas» espera y no pide; con un 503 vuelve a pedir la página siguiente".

### Estados vecinos del mecanismo "una duda que deja de existir con su bloque de respuestas montado"

| Camino | Qué pasa con las respuestas | Mensajes | Foco | Prueba |
|---|---|---|---|---|
| Borrar, `204`, una página | No se piden (`pedir` falso); lo visto se queda; salen de la caché cuando la fila sale | "Duda borrada" | Vecina o `h2` | CL3-4R1-06, CL3-E05 |
| Borrar, `204`, varias páginas de dudas (la vista se vuelve a pintar por `isFetching`) | Igual, sin «Cargando…» | Uno | Vecina o `h2` | CL3-4R2-01 |
| Borrar, `204`, varias páginas de respuestas, vista que se vuelve a pintar (pulsar «Dudas») | Igual | Uno | Vecina o `h2` | prueba nueva de T-03, CL3-4R2-03 |
| Borrar, `404 DUDA_NO_ENCONTRADA` | Igual que el `204` | "Esa duda ya no existe." | Vecina o `h2` | CL3-4R1-07, CL3-4R2-02, CL3-E05 |
| Borrar, `503` o red | Vuelven a pedirse si hace falta (con la caché fresca no sale nada); lo escrito queda | Uno (R7) | En "Sí, borrar duda" | prueba de la ronda 1 ("…con 503…") |
| Borrar, `403 BORRADO_NO_PERMITIDO` | `pedir` vuelve a ser verdadero; no se quitan | El del servidor | A la fila (el botón desaparece) | CL3-E05 |
| "Ver más respuestas" durante el `DELETE` | En espera; no pide | Uno (el del borrado) | Se queda en el botón | CL3-4R2-04, prueba nueva de T-04 |
| "Ver más respuestas" después de un `503` del borrado | Pide la página siguiente | Uno (el del `503`) | En el botón | prueba nueva de T-04 |
| Otra persona la borra (solo una recarga de la lista) | No se piden; la fila sale; la consulta queda inactiva y la recoge el `gcTime` | Ninguno | El de §7.14 si el foco estaba dentro (vecina o `h2`) | prueba nueva de T-03 |
| Responder con `DUDA_NO_ENCONTRADA` | No se piden (solo la lista) | Uno | Vecina o `h2` cuando la fila sale | CL3-4R1-08 |
| Borrar una respuesta con `DUDA_NO_ENCONTRADA` | No se piden (solo la lista) | Uno | Vecina o `h2` | CL3-4R1-09 |
| Abrir las respuestas con `DUDA_NO_ENCONTRADA` | El `MensajeError` del bloque; la lista se renueva una vez y la fila sale | Uno (el del bloque), ningún aviso | Cuando la fila sale, vecina o `h2` | prueba de la ronda 1 ("abrir las respuestas…"), CL3-4R2-09 |
| "Ver más respuestas" con `DUDA_NO_ENCONTRADA` (sin borrado propio en vuelo) | Igual | Uno | Al `h3`; cuando la fila sale, a la vecina | prueba de la ronda 1 ("«Ver más respuestas»…"), CL3-4R2-08 |
| Desmontaje de la fila (la vista sale durante el borrado) | Al irse el observador la consulta sale de la caché (al `204`, sin observador: al momento) | "Duda borrada" | — | prueba nueva de T-03 |
| Recarga de la lista que falla tras borrar | La lista entera se reemplaza (patrón del muro); al irse el observador, la consulta sale | Ninguno extra | `h2` | CL3-4R2-09 |

**Comentarios de Avisos y Recursos** (solo digo si aplica; fuera de 03e, sin tocar): no aplica. `useBorrarPublicacion` y `useBorrarRecurso` no quitan de la caché los comentarios abiertos, así que no hay una consulta recreada sin datos ni un "Ver más comentarios" que pida durante el borrado con `enabled` falso. El caso más parecido es "Ver más comentarios" con la publicación ya borrada: pinta el `MensajeError` de los comentarios, la misma observación que dejé en la ronda 1.

### Matriz de avisos, recargas y foco: filas que cambian con esta corrección
| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| "Sí, borrar duda", bloque abierto | `204` / `404 DUDA_NO_ENCONTRADA` | Dudas; las respuestas no se piden, lo que se veía se queda sin estado vivo y la consulta sale de la caché cuando su último observador se va | Uno ("Duda borrada" / "Esa duda ya no existe.") | Vecina o `h2` | "Ver más respuestas" en espera, sin pedir | La consulta sale al momento (sin observador) |
| "Ver más respuestas" con el `DELETE` de su duda en vuelo | — | Nada | Ninguno | Se queda en el botón (en espera) | — | — |
| "Sí, borrar duda" | 5xx / red | — | Uno | En el botón | "Ver más respuestas" vuelve a pedir | Uno |

### Verificación de la corrección (desde `frontend/`, una tras otra)
| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0; antes, `All matched files use Prettier code style!`) |
| `npx vitest list \| grep -acE "^src/"` | `5919` |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `271` |
| `npx vitest run` | `Test Files  271 passed (271)` · `Tests  5919 passed (5919)` · `Duration  268.53s`. «timed out»: 0 |
| `npm run build` | `✓ built in 832ms` |

### Conteos
- **5919 casos en 271 archivos.** Base 5915 / 271 (ronda 2 del tester, con su `*.ataque` nueva de 9 casos).
- `dudas-03e.test.tsx` pasa de 69 a 73 (`grep -ac "^src/features/clases/dudas-03e.test.tsx"` sobre la salida de `npx vitest list`): los 4 casos nuevos del `describe` "corrección de la ronda 2 de 03e (T-03 y T-04)". Ningún otro archivo cambia de cuenta. 5915 + 4 = 5919.

### Archivos de la corrección
- `frontend/src/features/clases/hooks.ts`: `quitarRespuestasAlCerrarseSuBloque` y su uso en `useBorrarDuda`.
- `frontend/src/features/clases/components/respuestas-de-duda.tsx`: `enEspera` de "Ver más respuestas" con `!pedir`.
- `frontend/src/features/clases/dudas-03e.test.tsx`: solo se suma el `describe` nuevo.

## Corrección de M-01 de la verificación de la ronda 2

Fuente: `revision.md` (SHA-256 `a9d62f3b…`), "## Verificación de la corrección de la ronda 2 — 03e", M-01. Solo cambié `components/respuestas-de-duda.tsx` (producción) y mi prueba normal `dudas-03e.test.tsx`. No toqué ninguna `*.ataque`, `features/tareas`, `shared/` ni el backend. No hubo rojos inesperados.

### M-01 (a): desplegar el bloque mientras la duda se borra o ya no existe (corregido)
- **Causa:**
  - Tras el `204` o el `404`, plegar el bloque deja la consulta sin observador y `quitarRespuestasAlCerrarseSuBloque` la quita. Si el bloque ya estaba plegado, la quita al momento.
  - Al desplegarlo con `pedir={false}`, el observador crea una consulta sin datos que nunca se pide, y el bloque pintaba `<Cargando />`.
- **Remedio:** `components/respuestas-de-duda.tsx:242`, `if (!pedir && filas === undefined && !respuestas.isError) return null`.
  - Mientras la duda se borra o ya no existe, un bloque sin respuestas en la caché no pinta nada: ni «Cargando…» (`role="status"`), ni alerta, ni el formulario de una duda que se va.
  - No pide nada: la consulta está desactivada.
  - Lo que ya se veía, con datos o con su error, sigue hasta que la fila sale (T-03 de la ronda 2).
- **Pruebas** (`dudas-03e.test.tsx`, `describe` "corrección de M-01 de la verificación de la ronda 2 de 03e"):
  - "M-01 (a): tras el 204 del borrado, plegar y volver a desplegar mientras llega la lista no muestra «Cargando…» ni pide las respuestas" (y su variante `404`)
  - "M-01 (a): con el bloque plegado cuando llega el 204, desplegarlo antes de la lista no muestra «Cargando…» ni pide las respuestas" (y su variante `404`)

### M-01 (b): pulsar «Dudas» con el bloque en error mientras la duda se borra (corregido)
- **Causa:** `useAlPulsarLaSeccionActiva` de `RespuestasDeDuda` llamaba a `respuestas.refetch()`, y `refetch` no mira `enabled` (`queryObserver.js:195` y `:245`).
- **Remedio:** `components/respuestas-de-duda.tsx:161`, `if (!pedir || !respuestas.isError) return`.
  - Con un `503` o un error de red del borrado, `pedir` vuelve a ser verdadero y pulsar «Dudas» sí vuelve a pedir.
- **Pruebas:**
  - "M-01 (b): con el bloque en error y el 204 del borrado, pulsar «Dudas» mientras llega la lista no pide las respuestas ni cambia el mensaje del bloque" (y su variante `404`)
  - "M-01 (b): con el bloque en error y un 503 del borrado, pulsar «Dudas» sí vuelve a pedir las respuestas y el error se va"

### Las formas de pedir las respuestas, una por una, y cómo respeta cada una `pedir=false`
Grep en producción de `respuestas.refetch`, `respuestas.fetchNextPage`, `fetchPreviousPage`, `claveRespuestas` e `invalidateQueries` / `refetchQueries` / `resetQueries` en `features/clases`.

**Imperativas (no miran `enabled`, cada una con su guarda):**

| Llamada | Dónde | Cómo respeta `pedir=false` |
|---|---|---|
| `respuestas.refetch()` | `respuestas-de-duda.tsx:162`, al pulsar la sección activa | Guarda `if (!pedir …) return` en `:161` (M-01 b) |
| `respuestas.fetchNextPage()` | `respuestas-de-duda.tsx:222`, "Ver más respuestas" | El botón queda en espera (`enEspera={… \|\| !pedir}`, T-04) y `Button` no ejecuta su acción; además, una guarda `if (!pedir) return` en el `onClick` (`:221`) |
| `fetchPreviousPage` | — | No se usa |

**Declarativas o de la caché (respetan `enabled` por sí solas):**

| Llamada | Dónde | Cómo respeta `pedir=false` |
|---|---|---|
| `invalidateQueries({ queryKey: claveRespuestas })` | `hooks.ts:1366` (`invalidarRespuestasYDudas`: responder y borrar una respuesta con éxito, `RESPUESTA_NO_ENCONTRADA` y `BORRADO_NO_PERMITIDO`) | Solo vuelve a pedir las consultas activas, y una consulta con `enabled: false` no lo es: queda vieja, sin petición |
| `invalidateQueries({ queryKey: claveClaseDetalle(claseId) })`, sin `exact` (alcanza a `["clases", claseId, "respuestas", …]`) | `hooks.ts:253` y `:294` (editar la clase, asignar o quitar un maestro) | Igual: no vuelve a pedir una consulta desactivada |
| `removeQueries` | `hooks.ts:1486` (`quitarRespuestasAlCerrarseSuBloque`) | Quita la consulta solo cuando no tiene observadores; al volver a montarse con `pedir=false` no se pide y el bloque no pinta (M-01 a) |
| Montaje, `refetchOnWindowFocus` y `refetchOnReconnect` | Opciones de `useInfiniteQuery` | Respetan `enabled` |

### Estados vecinos: las dos filas nuevas de la tabla de la ronda 2

| Camino | Qué pasa con las respuestas | Mensajes | Foco | Prueba |
|---|---|---|---|---|
| Tras el `204`/`404` del borrado, plegar y volver a desplegar antes de la lista; o desplegar un bloque que estaba plegado | El bloque no pinta nada y no pide; la consulta sigue sin datos hasta que la fila sale | Uno (el del borrado) | Se queda en el control | M-01 (a) ×4 |
| Bloque en error R9, borrar (`204`/`404`) y pulsar «Dudas» antes de la lista | No se piden; el `MensajeError` del bloque no cambia | Uno (el del borrado) más el error que ya estaba, sin cambiar | — | M-01 (b) ×2 |
| Bloque en error R9, borrado con `503`, pulsar «Dudas» | Se vuelven a pedir y el error se va | Uno (el del `503`) | — | M-01 (b) del `503` |

### Matriz: las filas que cambian
| Disparador | Respuesta | Se renueva | Aviso | Foco | En vuelo a la vez | Desmontada |
|---|---|---|---|---|---|---|
| «Ver respuestas (n)» o «Responder» con la duda borrándose o borrada | — | Nada | Ninguno | Se queda en el control | El bloque no pinta ni pide | — |
| Pulsar «Dudas» con el bloque en error y la duda borrándose o borrada | — | Nada | Ninguno; el mensaje del bloque no cambia | — | — | — |

### Verificación (desde `frontend/`, una tras otra)
| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0; antes, `All matched files use Prettier code style!`) |
| `npx vitest list \| grep -acE "^src/"` | `5926` |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `271` |
| `npx vitest run` | `Test Files  271 passed (271)` · `Tests  5926 passed (5926)` · `Duration  281.13s`. «timed out»: 0 |
| `npm run build` | `✓ built in 1.52s` |

### Conteos
- **5926 casos en 271 archivos.** Base 5919 / 271.
- `dudas-03e.test.tsx` pasa de 73 a 80 (`grep -ac "^src/features/clases/dudas-03e.test.tsx"` sobre la salida de `npx vitest list`): son los 7 casos de M-01, 4 de (a) y 3 de (b). Ningún otro archivo cambia de cuenta: 5919 + 7 = 5926.

## Corrección de la ronda 3 (T-05)

Fuente: `reporte-tester.md` (SHA-256 `201feb28…`), "## CLASES-03e — Ronda 3". El humano decidió que corrija T-05 y que el manager verifique, sin cuarta ronda del tester.
- Solo cambié `features/clases/hooks.ts` (producción) y mi prueba normal `dudas-03e.test.tsx`.
- No toqué ninguna `*.ataque`, `features/tareas`, `shared/` ni el backend.
- No hubo rojos inesperados.

### T-05: corregido
**Causa.** `quitarRespuestasAlCerrarseSuBloque` dejaba de escuchar en el primer `observerRemoved`. Por eso quedaba una consulta en la caché en dos casos:
- Al plegar, quitaba la consulta y se iba. Al volver a desplegar con `pedir={false}`, el observador creaba otra consulta vacía y desactivada. Esa nadie la quitaba y quedaba `pending`, sin observadores, hasta el `gcTime`.
- Con el bloque ya plegado al llegar el borrado, la quitaba al momento y ni siquiera se suscribía. Si después se desplegaba, la consulta nueva también quedaba.

**Remedio.** `hooks.ts:1492`: `quitarRespuestasAlCerrarseSuBloque` pasa a llamarse `quitarRespuestasDeUnaDudaQueSeVa`. La usan el `204` (`:1537`) y el `404 DUDA_NO_ENCONTRADA` (`:1544`) de `useBorrarDuda`.
- Siempre se suscribe a la caché, y si nadie observa la consulta la quita al momento.
- Escucha todas las consultas con la clave de esas respuestas (compara `queryHash` con `hashKey(claveRespuestas(…))`), no solo la primera instancia. Cada vez que una se queda sin observadores (`observerRemoved`), la quita.
- Deja de escuchar en dos casos:
  - Cuando la duda ya no está en la lista en caché y no queda ninguna consulta de sus respuestas.
  - Cuando la consulta de la lista sale de la caché (`removed`, por ejemplo al cerrar sesión, que vacía la caché).
- Nunca quita una consulta observada. Así se conservan T-03 (lo que se veía no pasa a «Cargando…»), T-04 y M-01 (`pedir={false}`, el bloque sin datos no pinta, `refetch` y `fetchNextPage` con guarda).
- Importa `hashKey` y el tipo `InfiniteData` de `@tanstack/react-query`, y el tipo `ListaDudasRespuesta` de `@campus/shared`. Son importaciones, no declaraciones de tipos.

**Pruebas.**
- Del tester: CL3-4R3-09 (`:634`, `204` y `404`) y el control CL3-4R3-08 (`:620`), verdes. CL3-4R3-10 (cerrar sesión) también, igual que todo `dudas-03e-r1`, `-r2` y `-r3.ataque`.
- Mías, en `dudas-03e.test.tsx`, `describe` "corrección de la ronda 3 de 03e (T-05)":
  - "T-05: tras el 204, plegar y desplegar tres veces mientras llega la lista: al salir la fila, ninguna consulta de sus respuestas" (y su variante `404`)
  - "T-05: con el bloque plegado cuando llega el 204, desplegarlo antes de la lista: al salir la fila, ninguna consulta de sus respuestas" (y su variante `404`)
  - "T-05: tras el 204, desplegar y salir de la vista antes de la lista: no queda ninguna consulta de sus respuestas"
  - "T-05: tras el 204, si la recarga de la lista falla (la lista se reemplaza por el error), no queda ninguna consulta de sus respuestas"
- `npx vitest list` muestra estos títulos junto a los dos "T-05" de `editar-recurso-03d.test.tsx` (otra subentrega, otra numeración). Se distinguen por su `describe`.

### Estados vecinos de "quitar la consulta de respuestas de una duda que se va"
| Camino | Qué pasa con la consulta | Lo visible | Prueba |
|---|---|---|---|
| `204` o `404`, bloque abierto, la fila sale con la lista | Se quita al irse su observador | Lo que se veía se queda hasta que sale la fila (T-03) | CL3-4R1-06, -07; CL3-4R2-01, -02, -03 |
| `204` o `404`, plegar y desplegar una vez antes de la lista | La primera se quita al plegar; la vacía, al salir la fila | El bloque desplegado no pinta (M-01 a) | CL3-4R3-09; M-01 (a) |
| Lo mismo, varias veces | Cada consulta se quita al quedarse sin observadores | Igual | prueba nueva "…tres veces…" ×2 |
| Bloque plegado cuando llega el `204`/`404`, desplegarlo antes de la lista | Se quita al momento; la vacía, al salir la fila | El bloque no pinta | prueba nueva "…plegado cuando llega…" ×2 |
| `404` y un segundo clic en «Sí, borrar duda» | Un solo `DELETE`; no queda ninguna | Un aviso | CL3-4R3-08 |
| Desplegar y salir de la vista antes de la lista | Se quita al desmontarse | — | prueba nueva "…salir de la vista…" |
| Cerrar sesión mientras llega la lista | La caché se vacía; la escucha termina con el `removed` de la lista | — | CL3-4R3-10 |
| La recarga de la lista falla (la lista se reemplaza por el error y la fila sale) | Se quita al irse el observador; la escucha sigue mientras la duda siga en los datos viejos de la lista y termina con la siguiente lista que no la trae (o con la caché vacía) | Un `MensajeError` de la lista | prueba nueva "…si la recarga de la lista falla…" |
| Borrado con `503` o red | No se llama: la duda sigue y sus respuestas también | Un aviso (R7) | prueba "…con 503…" de la ronda 1; M-01 (b) |
| Otra persona la borra (solo una recarga, sin mutación) | No se llama; la consulta queda inactiva y la recoge el `gcTime` (5 min) | Ninguno | prueba de la ronda 2 "otra persona borra la duda…" (no aplica T-05: no hay borrado propio) |

### Verificación (desde `frontend/`, una tras otra)
| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0; antes, `All matched files use Prettier code style!`) |
| `npx vitest list \| grep -acE "^src/"` | `5953` |
| `npx vitest list \| grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l` | `272` |
| `npx vitest run` | `Test Files  272 passed (272)` · `Tests  5953 passed (5953)` · `Duration  276.05s`. «timed out»: 0 |
| `npm run build` | `✓ built in 848ms` |

### Conteos
- **5953 casos en 272 archivos.** Base 5947 / 272.
- `dudas-03e.test.tsx` pasa de 80 a 86 (`grep -ac "^src/features/clases/dudas-03e.test.tsx"` sobre la salida de `npx vitest list`): son los 6 casos de T-05. Ningún otro archivo cambia de cuenta: 5947 + 6 = 5953.
