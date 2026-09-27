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

**Base `<B>` de V-08 para 01b:** pendiente. El orquestador la anota después del commit de los documentos del plan, que hace el humano.

## Pendientes para encargos siguientes
- **ADMIN:** "Dar rol accesible a la ficha de cuenta (role=region con nombre accesible) y que las pruebas de ataque la localicen por ese rol en lugar de fichaDe." (R-15).
- **DESIGN-01b:** plan detallado en `plan-01b.md`, aprobado el 2026-09-27. Sigue en la misma rama, `feat/design-01-sistema-de-diseno`, desde `e39500a`. Ya no sale de una rama nueva después de fusionar 01a, porque el PR se abre hasta que pase la comprobación completa.
