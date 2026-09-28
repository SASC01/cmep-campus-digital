# Aprobación del humano — DESIGN-01a

Fecha: 2026-09-27
Aprobó: Carlos Salazar
Carril: DESIGN-01a **sensible** (aprobación escrita del plan y revisión humana del diff antes del commit); DESIGN-01b **normal**, con la condición de detención de su resumen
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Base de V-08
- `frontend/` y `package-lock.json`: `6868e4d` (fusión de DOCS-03).
- Todo lo que está fuera de `frontend/`: **`<A>` = `5a32230`** (`5a32230f702f27cb7cf094e2bbb43eb47ca94a20`, "docs(design-01): plan 01a replaneado sobre D3 y aprobado", commit del humano del 2026-09-27). El orquestador comprobó que existe (`git cat-file -e '5a32230^{commit}'`, código 0) y que incluye `.claude/agents/tester.md`, `docs/DESIGN.md`, `docs/ESTADO.md` y los 5 archivos de esta carpeta. Tras el commit, el árbol de trabajo quedó limpio y `git diff --quiet 6868e4d -- frontend/` salió con código 0.

## Texto de la aprobación
> APRUEBO el plan de DESIGN-01a tal como está en plan.md (estado LISTO).
>
> - Acepto la condición ampliada de 01b: no toca require-rol.tsx, require-sesion.tsx, require-cambio-de-contrasena.tsx ni las guardas de router.tsx. Si lo necesita, se detiene y me avisa.
> - Acepto fichaDe como solución temporal (R-15). Agrega a los pendientes de ADMIN en ESTADO.md: "Dar rol accesible a la ficha de cuenta (role=region con nombre accesible) y que las pruebas de ataque la localicen por ese rol en lugar de fichaDe."
> - whitespace-nowrap y el peso de títulos de anuncios los juzgo en H-10.
>
> Registra la aprobación en aprobacion.md y actualiza ESTADO.md. No hagas commit ni inicies la ronda 0: avísame cuando esté listo para que yo haga el commit.

## Decisiones del humano durante la planeación (2026-09-27)
El detalle de cada una está en `plan.md`, "Respuestas del humano que este plan aplica".

| Tema | Decisión |
|---|---|
| Dirección visual | D3, "Vidrio líquido con fondo flotante" (`docs/DESIGN.md`, D-28). El plan de la dirección C queda como antecedente en `plan-direccion-c.md` y `revision-direccion-c.md` |
| Barra lateral (P-01) | Solo destinos que ya existen; ninguna ruta nueva |
| Administrador (P-02) | Sin componente de tabla; sus pantallas van opacas, sin vidrio |
| Ronda 0 (P-03) | Sí, antes del programador |
| División (P-04 y P-07) | 01a: tokens, materiales de vidrio con respaldo sólido sin `backdrop-filter`, fuentes, componentes base, migración de clases, `enEspera` en los 13 botones y T-14. 01b: marco, composición y `FondoAnimado` con orbes, con `prefers-reduced-motion` |
| Fuentes (P-05) | Las tres de `@fontsource`, solo el subconjunto `latin` |
| Carril (P-06) | 01a sensible; 01b normal |
| Controles del admin | 36 px en escritorio y 44 px en pantallas angostas (corte de 768 px) |
| M-01 | Se autoriza modificar `frontend/vitest.config.ts` (excepción E-3 del plan) |
| Rojos previstos | El humano acepta el cambio en los 6 `*.ataque` que arbitró el manager, con sus cuatro condiciones |
| Selectores de la ficha (P-08) | (B): en la ronda 0, el tester los cambia por uno que funcione antes y después del cambio, por rol, etiqueta o texto accesible, nunca por clase de estilo. Se acepta `fichaDe` como solución temporal (R-15) |
| Orbes fuera de login e inicio (P-09) | (A): quietos, como dice `DESIGN.md` §7.1 |
| Condición de 01b | No toca `require-rol.tsx`, `require-sesion.tsx`, `require-cambio-de-contrasena.tsx` ni las guardas de `router.tsx`. Si lo necesita, se detiene y avisa al humano |
| Foco de los botones azules y rojos | Contorno blanco por dentro; el humano lo confirma en H-04 |
| Campos del admin | Texto de 16 px, por el zoom de Safari en iOS |
| Precondición de la ronda 0 | "`frontend/` sin cambios desde `6868e4d`"; el humano hace commit de los documentos antes |
| `whitespace-nowrap` del tamaño `enlace` y peso de los títulos de los anuncios | Los juzga el humano en H-10 |

Reglas de D3 que el humano pidió respetar: orbes animados solo con `transform`; pantallas densas (calificaciones, admin) opacas; el rojo nunca como texto sobre vidrio al 62 %; contraste AA verificado en navegador, no solo calculado. Lo mide el humano (H-09); ningún agente abre un navegador.

## Documentos que aplicó el orquestador (autorizados)
- `.claude/agents/tester.md`, "Reglas de combate": "Las pruebas de ataque no localizan elementos por clases de estilo. Usa el rol, la etiqueta o el texto accesible; una clase cambia con el diseño sin que cambie el comportamiento."
- `docs/DESIGN.md` §8: la fila del administrador dice "texto de 14 px (16 px en campos de texto)", y un párrafo debajo de la tabla explica el zoom de Safari en iOS.

## Flujo
1. El humano hace commit de los documentos del plan. Deben ir `.claude/agents/tester.md`, `docs/DESIGN.md` y esta carpeta.
2. El orquestador anota el hash `<A>` arriba.
3. Ronda 0 del tester (plan, §D-8): confirmación de T-14 y selectores de la ficha.
4. `programador` (DESIGN-01a).
5. `tester`, rondas 1 a 3.
6. `manager` en modo final.
7. El humano hace la comprobación visual y revisa el diff antes del commit.

Ningún agente hace commit, push ni deploy.

## Parada de V-08 en `package-lock.json` y decisión del humano — 2026-09-27
**Hallazgo.** El programador reportó, en `resumen-programador.md` ("DESIGN-01a"), que V-08 no pasa en `package-lock.json`. El `npm install` autorizado (E-1 y E-2) agregó las 3 entradas de `@fontsource/*` y la sección de `frontend`. Además, quitó la clave `"peer": true` de entradas ajenas.

**Verificación del orquestador.**
- No cambia ningún `version`, `resolved` ni `integrity` fuera de los 3 paquetes nuevos.
- Causa probable: el lockfile se generó por última vez en `0fa5822` (AUTH-02a), antes de que el humano actualizara Node y npm (npm `11.19.0`), y esta versión recalcula esa marca de otra forma.

**Decisión del humano:** aceptarlo como efecto del `npm install` autorizado y seguir con la ronda 1 del tester. La pregunta le presentó "la marca `"peer": true` de 18 paquetes ajenos (react, vite, typescript, prisma, zod…)" y dijo que ninguna versión, `resolved` ni `integrity` cambiaba.

**Corrección del orquestador (T-01 de la ronda 1 del tester).** La lista de 18 que el orquestador anotó aquí y le mostró al humano estaba mal: la sacó del diff de texto con un `grep`, y este tomó encabezados de entrada equivocados. Recalculada comparando el JSON de `6868e4d` con el del árbol de trabajo, entrada por entrada:
- **19 entradas pierden `"peer": true`:** `@babel/core`, `@csstools/css-parser-algorithms`, `@csstools/css-tokenizer`, `@electric-sql/pglite`, `@testing-library/dom`, `@types/react`, `@types/react-dom`, `@typescript-eslint/parser`, `acorn`, `browserslist`, `eslint`, `keyv`, `pg`, `prisma`, `react`, `react-dom`, `typescript`, `vite` y `zod`.
  - Faltaban en la lista anterior: `@csstools/css-parser-algorithms`, `@csstools/css-tokenizer` y `browserslist`.
  - Sobraban: `abstract-logging` y `perfect-debounce`, que no cambian.
- Ninguna entrada gana `"peer"` y ninguna se borra.
- Entradas nuevas: solo las 3 de `@fontsource/*`.
- Fuera de `"peer"`, solo cambia la sección `frontend`.

La naturaleza del cambio es la misma que se le presentó al humano: solo bajas de `"peer": true`, sin cambios de versiones.

**Confirmación del humano (2026-09-27, antes del commit de 01a):**
> Confirmo la lista de 19 entradas del lockfile: solo pierden "peer": true, sin cambios de versión, resolved ni integrity. Con esa confirmación, V-08 da por buena la diferencia de `package-lock.json`: esas 19 bajas más lo de E-2. Cualquier otra diferencia en ese archivo sigue siendo parada.

## Decisiones del humano tras la revisión final del manager — 2026-09-27
> Decisiones DESIGN-01a:
> - M-01: sí, se corrige en el cierre.
> - Autorizo aplicar en CLAUDE.md los textos literales del plan; los reviso en el diff antes del commit.
> - El lockfile lo confirmo después de revisar el diff de package.json.

- **M-01:** el programador corrige en el cierre la prueba "escenario 4 de T-14" de `cuentas-view.test.tsx`, para que haga lo que dice su nombre.
- **`CLAUDE.md`:** el orquestador aplicó el 2026-09-27 los textos literales de `plan.md`, "Cierre de 01a", punto 2:
  - "Componentes": `enEspera`;
  - "Tokens": escalas anuladas y vidrio;
  - "Formularios": `ErrorDeCampo`;
  - "Ubicaciones compartidas": `label.tsx`, `sonner.tsx` y `ErrorDeCampo`.
  - El humano los revisa en el diff antes del commit.
- **Lista de 19 del lockfile:** la confirma el humano después de revisar el diff. Sigue pendiente.
- **Comprobación del humano:** hoja para llenar en `comprobacion-humano.md`, que prepara el orquestador.

## Comprobación parcial, suspensión y cierre de 01a — 2026-09-27
El resultado parcial y la suspensión están en `comprobacion-humano.md`. Decisiones del humano:
- **Comprobación visual suspendida.** Habrá una sola comprobación completa (H-01 a H-10, con H-05 y H-06, y la tabla de contraste) **después de 01b**. **El PR no se abre hasta que esa comprobación pase.**
- **Cierre de 01a**, además de lo ya acordado (marcas de `DESIGN.md`, M-01, `CLAUDE.md` y `README.md`):
  > 1. Borde de campos: el de 2 px color tinta es demasiado pesado y al enfocar queda el anillo azul encima del borde oscuro. Cambia a un borde más ligero con contraste mínimo 3:1 contra el vidrio en el peor caso (considerando que en 01b habrá orbes detrás), y al enfocar el borde pasa a --accent en lugar de quedarse oscuro. Actualiza DESIGN.md y el token, y que tokens.test.ts verifique el 3:1.
  > 2. En la captura del login hay un rectángulo grisáceo detrás de las tarjetas de avisos, visible entre ellas y debajo. Averigua qué lo produce y corrígelo si no es intencional.
  - **Grosor del borde (pregunta del orquestador; respuesta del humano):**
    - **1 px** y un color más claro.
    - Al enfocar, el borde pasa a `--accent` sin cambiar el grosor, y el anillo de foco se queda.
    - El cambio es solo para los campos. El botón `outline` en contexto opaco (admin) conserva su aspecto actual.
- **Commit:** cuando el manager apruebe el cierre, el orquestador se lo pide al humano (en la rama, sin push).
- **Marcas de `DESIGN.md` en el cierre:** solo pasa a "propuesta aprobada (2026-09-27)" lo que el humano aprobó en el bloque del login: fuentes (H-01), foco blanco por dentro en el botón azul (S-07) y anillo de foco de los enlaces. Lo demás sigue como propuesta hasta la comprobación completa.
- **Después del commit, replanear DESIGN-01b**, sin tocar código hasta que el humano apruebe. Se agregan al alcance:
  > 3. Botón mostrar/ocultar contraseña en los 5 formularios con contraseña (login, registro, restablecer, establecer-contrasena, cambiar-contrasena): type="button", nombre accesible que cambie entre "Mostrar contraseña" y "Ocultar contraseña", aria-pressed, que no envíe el formulario ni mueva el cursor del campo, y que no cambie el autocomplete. Ojo: revisa que ningún selector de prueba que busca el campo "Contraseña" empiece a encontrar también el botón; si hay que cambiar pruebas de ataque, va en ronda 0.
  > 4. Pie de página en todas las pantallas: "© <año actual> Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos" con el año calculado, y enlaces del colegio leídos de un solo archivo de configuración; los enlaces vacíos no se muestran. Deja espacio para "Aviso de privacidad". Yo te daré las URL después.
  >
  > Si con esto 01b queda demasiado grande, propón cómo dividirlo.
  - **Aclaración del punto 4:**
    > - Los enlaces todavía no los tengo. Por ahora arma el pie con marcadores para ver el maquetado: "Sitio web", "Facebook", "Contacto" y "Aviso de privacidad".
    > - Todo sale de un solo archivo de configuración (texto y URL por enlace), para que cuando te dé las URL solo se edite ese archivo, sin tocar componentes.
    > - Mientras un enlace no tenga URL: en desarrollo se ve como marcador, para evaluar el diseño; en el build de producción no se muestra. Nunca uses href="#".
    > - Agrega a ESTADO.md el pendiente: "Llenar enlaces reales del pie (incluido aviso de privacidad) antes de DEPLOY".

## Commit de 01a — 2026-09-27
- **`e39500a`** (`e39500a980275140cc0e24387ea8c563e295e60e`), del humano: "feat(design-01): sistema de diseño D3, parte 01a (tokens, vidrio, fuentes, componentes base, enEspera y T-14)". Son 65 archivos, en la rama `feat/design-01-sistema-de-diseno` y sin push.
  - El humano lo reportó como `e35500a`. El orquestador lo comprobó en `git log`: el hash real es `e39500a`.
- Después del commit, el árbol de trabajo quedó limpio.
- Ya sin commit de por medio, el humano pidió marcar H-01 a 360 px: "pasa (lo revisé junto con el login a 360)".
- **El PR no se abre** hasta que pase la comprobación visual completa después de 01b.
- **Siguiente paso:** replanear DESIGN-01b en `plan-01b.md`, en modo plan y sin tocar código. El borde de los campos ya quedó resuelto en 01a. Se agregan el botón para mostrar u ocultar la contraseña y el pie con marcadores.

## Aprobación del plan de DESIGN-01b — 2026-09-27
Aprobó: Carlos Salazar. Registró: orquestador, a partir del mensaje del humano.

> APRUEBO el plan de DESIGN-01b (plan-01b.md, estado LISTO), con estas respuestas:
>
> P-01: (A). 01b-1 carril normal, 01b-2 carril sensible.
> P-02: (A). Dos subentregas en la misma rama, commit mío por cada una.
> P-03: (A). Mismo pie en /admin, opaco.
> P-04: (A). La contraseña visible se oculta al enviar, también si falla la validación.
> P-05: (B) del manager, con dos ajustes:
>   1. En formularios con más de un campo de contraseña, cada botón lleva el nombre de su campo ("Mostrar contraseña nueva", "Mostrar confirmación de contraseña"), siempre fijo y con aria-pressed.
>   2. El nombre accesible va como texto visualmente oculto dentro del botón (sr-only), no como aria-label, para que getByLabelText no encuentre el botón al buscar el campo.
>   Vuelve a comprobar con los nombres por campo que ningún selector de prueba (incluidas las de ataque) encuentra el botón al buscar un campo. Si alguno lo encuentra, 01b-2 lleva ronda 0.
>
> Las propuestas visuales (candado sin insignia, títulos de anuncios en negrita, barra superior a 360, posición y trayectoria de orbes, espaciado del maestro a 20 px) las juzgo en la comprobación final.
>
> Registra la aprobación en aprobacion.md, actualiza plan-01b.md con el ajuste de P-05 y ESTADO.md. No hagas commit ni lances la ronda 0: avísame cuando esté listo para mi commit.

**Carriles:** 01b-1 **normal**; 01b-2 **sensible** (aprobación escrita, que es esta, y revisión humana del diff de 01b-2 antes de su commit).
**Rama:** `feat/design-01-sistema-de-diseno`, desde `e39500a`, con un commit del humano por subentrega. El PR sigue cerrado hasta que pase la comprobación completa.
**P-06 del plan (nombres de dos botones), respuesta del humano (2026-09-27, herramienta de preguntas):**
- botón del campo "Confirma la contraseña nueva": **"Mostrar confirmación de contraseña"**, su ejemplo literal;
- botón del campo "Contraseña temporal": **"Mostrar contraseña temporal"**.

Coinciden con lo que ya proponía `plan-01b.md` (§D-7), así que los 7 nombres quedan fijados sin cambios en el plan.

**Inventario de selectores con los nombres por campo:** el arquitecto no encontró ninguna prueba, normal ni de ataque, que encuentre el botón al buscar un campo, así que 01b-2 no lleva ronda 0. Lo verifica el manager.

**Base `<B>` de V-08 para 01b: `0fc961b`** (`0fc961bff0623824fd96e870ab4bfc11e44541ce`, "docs(design-01): plan 01b aprobado", commit del humano del 2026-09-27). El orquestador comprobó:
- que existe: `git cat-file -e '0fc961b^{commit}'`, código 0;
- que incluye `plan-01b.md`, `revision.md`, `aprobacion.md`, `comprobacion-humano.md` y `docs/ESTADO.md`;
- que el árbol quedó limpio;
- que `frontend/` es idéntico a `e39500a`. El orquestador la anota después del commit de los documentos del plan, que hace el humano.

## Parada de la ronda 0 de 01b-1 y decisión del humano — 2026-09-27
**Parada.** El tester se detuvo en el subpaso 5 (`reporte-tester.md`, "DESIGN-01b-1 — Ronda 0 (guarda V-07)"):
- El texto exacto de §D-9 pasa Vitest, pero `npm run lint` sale con código 2.
- `tsc -b` da `TS2345` en `clases-r1.ataque.test.ts`, líneas 94 y 97.
- La causa: `noUncheckedIndexedAccess` de `tsconfig.base.json` hace que `rutasDe` devuelva `(string | undefined)[]`, y las listas permitidas son `string[]`.
- El tester dejó el archivo con el texto de §D-9 para que se viera el fallo; el original está en su copia del scratchpad (hash `9921f668…`, el de la tabla de 01a).

**Decisión del humano (herramienta de preguntas):** "Corregir §D-9 y repetir".
- El arquitecto corrige solo el tipado del texto de §D-9, sin cambiar lo que comprueba. Por ejemplo, una ruta `undefined` cuenta como violación.
- El orquestador verifica que el cambio del plan sea solo eso.
- El tester restaura el original desde su copia, comprueba el hash y repite la ronda 0 con el texto corregido.
- Si lint vuelve a fallar, se detiene otra vez.

Como `plan-01b.md` cambia después de `<B>`, el orquestador le pedirá al humano un commit antes de que empiece el programador y anotará aquí la base nueva de V-08.

**Corrección aplicada (verificada por el orquestador con `git diff 0fc961b -- plan-01b.md`):**
- El arquitecto cambió solo el texto de V-07 de §D-9: anotación `readonly string[]` en las dos listas, y los dos `filter` con `ruta === undefined || !LISTA.includes(ruta)`.
- Además escribió en §D-9 el texto de referencia de la ronda 1 (igualdad exacta), ajustó el punto de ataque 9 y agregó una nota en el encabezado.
- Al hacerlo revirtió sin querer la aclaración de V-17 sobre "Ocultar", que ya estaba en `0fc961b`. El orquestador la restauró, y el diff contra `0fc961b` ya no la incluye.
- El tester repite la ronda 0 desde el original restaurado.

## Base nueva de V-08 para 01b-1 — 2026-09-27
- **`<B>` = `8feab74`** (`8feab745550a3c20991ef83c424307fa36a314be`, "test(design-01): ronda 0 de 01b-1, guarda V-07 con lista permitida", commit del humano).
  - Sustituye a `0fc961b` como base de V-08 **fuera de `frontend/`**, por decisión del humano ("Anótalo como base nueva de V-08 fuera de frontend/").
  - Dentro de `frontend/` la base sigue siendo `e39500a`.
- Comprobado por el orquestador:
  - existe (`git cat-file -e '8feab74^{commit}'`, código 0);
  - incluye `clases-r1.ataque.test.ts`, `plan-01b.md`, `reporte-tester.md`, `aprobacion.md` y `docs/ESTADO.md`;
  - el árbol quedó limpio;
  - `git diff --name-only e39500a -- frontend/` lista solo `frontend/src/styles/clases-r1.ataque.test.ts`.
- **Siguiente paso:** programador de DESIGN-01b-1 según `plan-01b.md`, después la ronda 1 del tester y el veredicto del manager. 01b-2 no empieza.

## Ronda 1 de 01b-1 y arbitraje del manager — 2026-09-27
- **Tester, ronda 1: ROTO**, con 2 hallazgos de severidad baja (`reporte-tester.md`, "DESIGN-01b-1 — Ronda 1"). No hay ningún salto de autorización, y `/acceso-restringido` resistió con los tres roles.
  - **T-01:** una URL del pie con un carácter de control invisible al inicio o al final sale como enlace. `trim()` no los quita y `new URL` sí. El error está en el plan (§D-5, paso 2).
  - **T-02:** el programador quitó una línea de `format.test.ts` (la importación de `./format`), cosa que E-2 no permitía, y declaró en su resumen que no quitaba ninguna.
- **Error del orquestador:** limitó la ronda 1 del tester a V-07 y a archivos nuevos, aunque el plan también le asignaba actualizar dos descripciones de `tokens-r1.ataque`. Van en la ronda 2.
- **Arbitraje del manager** (`revision.md`, "DESIGN-01b-1 — arbitraje de la ronda 1"): el ROTO se sostiene.
  - **T-01:** se rechazan los caracteres de control en cualquier posición, recorriendo el texto sin expresión regular (`no-control-regex`), y los espacios solo en los extremos. Las 3 pruebas del tester son legítimas.
  - **T-02:** se amplía E-2 para permitir esa línea de importación y el programador corrige su resumen con la salida real de V-08.
  - **O-3:** el programador corrige la contradicción de `DESIGN.md` §7.4.
  - **O-2:** se agrega a H-12.
  - Estos cambios de texto en `plan-01b.md` los aplica el arquitecto y se le informan al humano sin nueva aprobación.
- `plan-01b.md` cambia después de `<B>` = `8feab74` solo por esos textos. El orquestador verifica el diff y se lo indica al programador como diferencia autorizada de V-08, como se hizo con `CLAUDE.md` en el cierre de 01a.

## Ronda 2 de 01b-1 y arbitraje del manager — 2026-09-27
- **Tester, ronda 2: ROTO**, con un hallazgo nuevo de severidad baja (`reporte-tester.md`, "DESIGN-01b-1 — Ronda 2").
  - T-01, T-02 y O-3 quedaron bien corregidos, sin regresiones.
  - **T-03:** un carácter invisible en medio del dominio (U+00AD, U+200B, U+2060, U+FEFF) sale como enlace del pie. La regla del arbitraje de la ronda 1 solo cubría U+0000 a U+001F y U+007F.
  - El tester también actualizó las dos descripciones de `tokens-r1.ataque` que el orquestador le había dejado fuera en la ronda 1.
- **Arbitraje del manager** (`revision.md`, "DESIGN-01b-1 — arbitraje de la ronda 2"): el ROTO se sostiene y T-03 entra en este encargo. La falla fue del arbitraje anterior.
  - **Regla final:** se publica solo una URL que el analizador deja exactamente igual (`new URL(url).href`), salvo la barra final de un dominio sin ruta. Sustituye a `trim()` y al recorrido de controles, y no usa expresiones regulares. El manager la probó en Node con 66 casos.
  - **Consecuencias aceptadas:** también quedan como marcador las mayúsculas en el esquema o el dominio, el puerto por defecto, un dominio con acentos y un espacio en la ruta de un `https:`.
  - **O-5 y O-6 no entran:** la regla no comprueba que el destino sea válido. El error queda a la vista, y el humano prueba cada enlace al llenar las URL reales, antes de DEPLOY.
  - **Ronda 3 del tester, la última:** acotada a la regla nueva y a las regresiones. Si sale ROTO, se escala al humano.
- Los textos del plan los aplica el arquitecto y el orquestador verifica el diff. Siguen siendo diferencias autorizadas de V-08 contra `8feab74`.

## Commit de 01b-1, O-7 y cambio de proceso — 2026-09-27
- **`<C>` = `73e29c5`** (`73e29c5955f569b859e6f94f86f9b199d093a116`, "feat(design-01): parte 01b-1 (fondo con orbes, marco, composición, pie y recorte de la sombra)", commit del humano, 48 archivos). El orquestador comprobó que existe y que el árbol quedó limpio.
- **Revisión visual del humano de 01b-1:** "Ya revisé 01b-1 en el navegador y se ve bien." La comprobación completa con la hoja (H-01 a H-17 y C-01 a C-26) sigue definida en `plan-01b.md` para después de 01b-2.
- **O-7, decisión del humano:** "en código. En el cierre de 01b, la regla del pie rechaza cualquier URL con usuario o contraseña antes del dominio, con su caso de prueba." Por la regla nueva de proceso, basta una ronda del tester, o la revisión del manager.
- **Cambio de proceso para trabajo visual** (texto literal del humano; registrado en `AGENTS.md`, "Trabajo visual"):
  > - V-08 usa como base solo el commit de aprobación del plan; cambios posteriores en docs/trabajo/ y ESTADO.md no exigen un commit nuevo.
  > - Solo me pides commit al terminar cada subentrega, no en pasos intermedios.
  > - Los ajustes visuales que yo pida después de ver la pantalla son carril trivial: programador aplica, tests en verde, sin plan ni ronda 0, salvo que toquen pruebas de ataque o lógica.
  > - Una validación sobre datos que solo escribo yo en un archivo de configuración (como los enlaces del pie) no justifica más de una ronda del tester por casos extremos.
- **Bases de V-08 para 01b-2:**
  - `frontend/` contra `<C>` = `73e29c5`, como fija el plan;
  - fuera de `frontend/`, contra el commit de aprobación del plan, `0fc961b`, sin contar `docs/trabajo/` ni `docs/ESTADO.md`. `docs/DESIGN.md` solo puede cambiar en las secciones de E-1 (01b-1, ya confirmadas en `<C>`) y E-13 (01b-2).
- **01b-2 (carril sensible):** plan aprobado. Programador → tester → manager. El commit se pide solo al terminar, junto con el cierre de 01b.

## Parada del programador en 01b-2 (paso 17) y decisión del humano — 2026-09-27
- **Parada:** al poner `CampoContrasena` en los 4 formularios, 2 pruebas existentes se pusieron en rojo, las dos de `frontend/src/components/layout/estatico-r1.ataque.test.ts`, en el bloque "ataque (DESIGN-01b-1 r1): nada de 01b-2 está implementado".
  - El tester las escribió en la ronda 1 de 01b-1 para blindar el alcance de 01b-1: que no existiera `CampoContrasena` y que los 7 campos siguieran como `type="password"`. Con 01b-2 fallan por diseño.
  - El resto de la suite quedó en verde (813 de 815) y el inventario de selectores de §D-7 se sostuvo.
  - El programador no tocó ninguna prueba. Dejó hechos los pasos 15, 16 y 17 (este último parcial); faltan el 18 y el 19. Detalle en `resumen-programador.md`, "DESIGN-01b-2".
- **Decisión del humano (herramienta de preguntas):** "Ronda 0 del tester".
  - El tester sustituye solo ese bloque por su equivalente de 01b-2: 7 `CampoContrasena` con el nombre de la tabla, ningún `type="password"` literal fuera de `campo-contrasena` y ningún `aria-label`. La guarda debe quedar igual de estricta.
  - Publica los hashes. Después el programador sigue con los pasos 18 y 19.

## 01b-2: rondas, revisión final y decisiones del cierre de 01b — 2026-09-27
- **Tester, ronda 1: ROTO** por T-01 (media): el cursor volvía a una selección vieja al ocultarse por el envío. El programador lo corrigió en la vuelta 2.
- **Tester, ronda 2: RESISTE.** Suite: 52 archivos y 873 pruebas en verde; tabla de 47 `*.ataque`.
- **Manager, revisión final de 01b-2: APROBADO** (`revision.md`, "DESIGN-01b-2 — final").
  - M-01: la interfaz `Seleccion` estaba en `campo-contrasena.tsx`, contra la regla 6 de `CLAUDE.md`.
  - El manager enlistó lo que el humano debe revisar en el diff antes del commit `<D>`, porque es carril sensible.
- **Decisiones del humano (herramienta de preguntas):**
  - **M-01:** "Sí, mover a types.ts". Es una excepción acotada a "No se toca": solo se agrega la interfaz `Seleccion` a `features/auth/types.ts` y se importa en `campo-contrasena.tsx`.
  - **`CLAUDE.md`:** "Ahora, entran en `<D>`". El orquestador aplicó los textos literales de `plan-01b.md`, "Lo que aplica el orquestador": `components/layout/`, `AvatarUsuario`, `inicialesDe`, `FondoDeLaApp`, lo fijo dentro de vidrio y `CampoContrasena`.
- **Cierre de 01b (carril trivial del programador, lo revisa el manager):**
  - O-7 en código (§D-5, paso 4 nuevo, que agregó el orquestador en el plan);
  - el comentario de `ENLACES_DEL_COLEGIO` (M-01 de 01b-1);
  - `Seleccion` a `types.ts`;
  - la línea de O-7 en `DESIGN.md` §7.12.
  - Después, `README.md`, `ESTADO.md` y la hoja de la comprobación completa en `comprobacion-humano.md`, a cargo del orquestador.
  - Las marcas de `DESIGN.md` pasan a aprobadas solo después de la comprobación completa.

## Commit de 01b-2 y comprobación del humano — 2026-09-28
- **`<D>` = `d2e5ff7`** (`d2e5ff760da7cf3677f1609471f488440efce2af`, "feat(design-01): parte 01b-2 (botón para mostrar la contraseña) y cierre de 01b", commit del humano, 26 archivos).
  - El humano lo reportó como `d2eff7`, que no existe; el orquestador verificó el hash real en `git log`.
  - Después del commit, el árbol quedó limpio.
- **Comprobación en navegador (decisión del humano):** la hoja completa (H-01 a H-17 y C-01 a C-26) se sustituye por una revisión rápida de 7 puntos. Lo demás queda como "no verificada por decisión del humano, cubierta por pruebas automáticas". La medición manual del contraste se descarta: lo cubre `tokens.test.ts`.
  - Registro en `comprobacion-humano.md`, "DESIGN-01 · revisión rápida del humano".
- **Regla nueva en `AGENTS.md`, "Trabajo visual":** "La comprobación humana en navegador es de máximo 10 minutos y máximo 7 puntos: solo lo que las pruebas automáticas no pueden ver. Nada de mediciones manuales de contraste."
- **Siguiente:** con los 7 resultados, y si todo está bien, se hace el cierre final:
  - las marcas de `DESIGN.md` pasan a "propuesta aprobada (fecha)";
  - se actualiza `ESTADO.md`;
  - el orquestador prepara los comandos del commit final y del PR de DESIGN-01.

## Resultado de la revisión rápida y cierre final — 2026-09-28
- **Revisión rápida del humano:** los 7 puntos, "bien" (`comprobacion-humano.md`).
- **Marcas de `DESIGN.md`:** pasan a "propuesta aprobada (2026-09-28)" los valores y patrones que aplicó DESIGN-01. Lo que ningún encargo ha aplicado todavía sigue como propuesta, según `DESIGN.md` §11, y se confirma en el encargo que lo aplique. Lo aplica el programador por el carril trivial.
- **Después:** `ESTADO.md`, el commit final del humano y el PR de DESIGN-01 hacia `main`.

## Pendientes para encargos siguientes
- **ADMIN:** "Dar rol accesible a la ficha de cuenta (role=region con nombre accesible) y que las pruebas de ataque la localicen por ese rol en lugar de fichaDe." (R-15).
- **DESIGN-01b:** plan detallado en `plan-01b.md`, aprobado el 2026-09-27. Sigue en la misma rama, `feat/design-01-sistema-de-diseno`, desde `e39500a`. Ya no sale de una rama nueva después de fusionar 01a, porque el PR se abre hasta que pase la comprobación completa.
