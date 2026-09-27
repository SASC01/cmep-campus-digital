# Revisión del Manager — DESIGN-01 — plan
Veredicto: CAMBIOS REQUERIDOS
Verificación propia (línea base en `c50cece`, desde `frontend/`): lint código 0 · test código 0, 25 archivos, 258 pruebas: 254 en verde y 4 fallos esperados (T-14) · build código 0. El árbol de trabajo quedó igual (`git status`: solo `docs/ESTADO.md` y esta carpeta). SHA-256 de `cuentas-r4.ataque.test.tsx` = `97b5c079…` (coincide con la tabla vigente); `cuentas-r3.ataque.test.tsx` = `8defb25f…` (coincide). Hay 32 `*.ataque`. `git diff d144966 c50cece -- frontend` sale vacío: el código de producción es el mismo que confirmó el tester en la ronda 4 de AUTH-02.

El plan es sólido en lo esencial: cubre el encargo, el diagnóstico de T-14 es correcto y la cuenta de rojos esperados cuadra con el código. Lo comprobé prueba por prueba (abajo). Vuelve al arquitecto por cuatro puntos. Uno detiene al programador con seguridad en el paso A-5, dos hacen inexacta la lista "No se toca" y uno falta para que la división en 01a y 01b tenga un cierre definido. Además hay una pregunta nueva de carril para el humano.

## Problemas que bloquean

### M-01 — `tokens.test.ts` con `?raw` siempre recibe una cadena vacía: A-5 se detiene con seguridad
Dónde: "frontend/src/styles/" › `tokens.test.ts`; R-09; paso A-5.
Por qué importa: `vitest.config.ts` fija `css: false`. En Vitest 4.1.11 (`node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js`, `CSSEnablerPlugin`), el plugin `vitest:css-disable` vacía el código de todo id que cumpla `\.(css|…)(?:$|\?)`. `tokens.css?raw` lo cumple, y el plugin posterior devuelve `export default ""`. La transformación ocurre después del `load` de Vite, así que el contenido crudo se pierde. La condición de "detente" del plan se cumplirá siempre, y el programador perderá una ronda en algo que ya se sabe. Las alternativas obvias chocan con el propio plan:
- cambiar `vitest.config.ts` (por ejemplo, `css: { include: [/tokens\.css/] }`) toca un archivo de "No se toca";
- `readFileSync` de `node:fs` no compila con `tsc -b`, porque `tsconfig.app.json` solo carga `types: ["vite/client"]`. Agregar `/// <reference types="node" />` metería los globales de Node en todo `src/`.

Qué se espera: el plan elige de antemano una vía que funcione y la verifica en su texto. Si esa vía toca `vitest.config.ts` o `tsconfig*.json`, aparece como excepción explícita en "No se toca" y la aprueba el humano. Otra opción es sustituir la prueba por una verificación fuera de la suite, aunque se pierde la protección contra regresiones.

### M-02 — La lista "No se toca" no coincide con los pasos
Dónde: "Alcance › No se toca"; S-04; §D-9; `panel-anuncios.tsx`; V-08.
Por qué importa: el orquestador revisa esa lista antes de instruir a cada agente, y cualquier contradicción obliga a pedir autorización a mitad del trabajo. Encontré tres:
1. **`listaAnuncios` en `features/auth/data.ts`** (lo reportó el arquitecto; lo confirmo). La excepción está en la sección de `panel-anuncios.tsx` y en V-08, pero no en "No se toca". Sobra, además: la lista puede tomar su nombre del `h2` que ya existe ("Avisos del colegio", `TEXTOS_LOGIN.tituloAnuncios`) con `aria-labelledby`, sin agregar texto ni tocar `data.ts`.
2. **El `h1` del login, partido en "CMEP" y "Campus Digital" (§D-9).** Hoy el `h1` pinta `TEXTOS_LOGIN.titulo` ("CMEP Campus Digital") como un solo nodo. Para pintar "Campus Digital" en `--brand` hacen falta dos textos. O el programador los escribe literales en la vista, lo que rompe la regla 2 de `CLAUDE.md` y deja `TEXTOS_LOGIN.titulo` sin uso, o agrega claves a `data.ts`, que está en "No se toca". El plan no dice cuál. El mismo nombre partido aparece en `Encabezado` (`components/layout`), así que es una pieza que usan dos módulos (regla 5).
3. **V-08 no comprueba la lista completa.** Faltan `tsconfig.base.json`, `.prettierignore`, `frontend/components.json`, `frontend/tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/services/**`, `src/features/*/hooks.ts` y `src/features/*/types.ts`. `vitest.config.ts` importa en especial, por M-01. Tampoco comprueba que `frontend/package.json` cambie solo en las tres dependencias.

Qué se espera: cada archivo que un paso modifica está fuera de "No se toca" o figura como excepción con su alcance exacto; la fuente del nombre del producto queda decidida, y V-08 verifica la lista entera, excepciones incluidas. Conviene agregar `frontend/src/test/setup.ts` a la lista, porque es la tentación natural ante un problema de jsdom.

### M-03 — Carril: para la Fase A, el normal no se sostiene; falta la pregunta al humano
Dónde: encabezado "Carril: normal"; S-01; R-11.
Por qué importa: `AGENTS.md` pone en el carril sensible "sesiones y contraseñas" y "restricción de acceso". El plan dice que esas pantallas "cambian solo de estilo" (S-01), y no es exacto:
- **§D-4 cambia el comportamiento** de la protección contra el doble envío en login, registro, recuperar, restablecer, establecer contraseña, cambio obligatorio, los tres "Cerrar sesión" y "Sí, restablecer". Pasa de `disabled` a interceptar el clic. Un doble envío en el login cuenta dos intentos para el bloqueo al sexto; uno en "Sí, restablecer" genera dos temporales y deja inválida la que se muestra.
- **§D-5 reescribe la lógica de foco** del flujo de la contraseña temporal.

Sobre `acceso-restringido-view.tsx`, R-11 tiene razón: ahí solo cambian clases, el icono y `enEspera`. Por esa pantalla sola, el carril normal se sostendría. El costo del carril sensible es bajo: el humano ya aprueba por escrito al responder P-01 a P-05, y ya hace la comprobación visual. Solo se agrega la revisión del diff antes del commit.

Qué se espera: el plan agrega una **P-06** para el humano. Recomendación del manager: **01a (Fase A) en carril sensible y 01b (Fase B) en carril normal**. Si P-04 es B, todo el encargo en sensible. El humano fijó el carril y es quien decide; el plan no debe darlo por resuelto.

### M-04 — Si P-04 es (A), 01a no tiene un cierre definido
Dónde: P-04; "Comprobación del humano"; "docs/DESIGN.md"; "Textos para `CLAUDE.md`"; B-9.
Por qué importa: la Fase A queda coherente y verificable sin la B. Tokens, `components/ui`, `enEspera`, T-14 y la migración de clases dejan todo el árbol consistente sobre el marco actual, y lint, test, build y V-01 a V-11 aplican igual. Pero el plan solo describe el cierre de la entrega única:
- **Comprobación del humano:** no dice qué puntos H corresponden a 01a. H-07, H-08, H-09, H-10, H-11 y H-12, más el título de página de H-02 y la densidad de H-05, se pueden comprobar ya en 01a. H-01, H-03 (icono), H-04 y H-06 son de 01b.
- **Marcas de "propuesta":** B-9 solo existe al final de la Fase B. `--text-h1` y `--shadow-overlay` ya se pueden decidir en 01a.
- **`DESIGN.md` §1:** el texto de A-11 ("Aplicado en DESIGN-01: … y las pantallas existentes") sería falso al cerrar 01a.
- **`CLAUDE.md`:** las viñetas 1 y 2 y las entradas de `ui/` y `components/` describen lo que entrega 01a. Si esperan al cierre de 01b, `CLAUDE.md` queda desfasado entre los dos PR.
- **Tester:** no dice si el máximo de 3 rondas cuenta por separado en cada subentrega, ni cómo se nombran las secciones de `reporte-tester.md` y `revision.md` de cada una.

Qué se espera: con P-04 (A), el plan asigna a cada subentrega sus puntos H, sus cambios de `DESIGN.md` (marcas incluidas), sus textos de `CLAUDE.md` y de `ESTADO.md` y su tope de rondas.

## Problemas que no bloquean

### N-01 — Aserciones de ataque que quedan vacías sin ponerse en rojo
La tabla "Pruebas existentes que dependen de `disabled`" marca como "Nadie" las `toBeEnabled()`:
- `cuentas-r1.ataque`, líneas 337 y 354 ("Copiar" vuelve a estar disponible tras un error);
- `cuentas-r3.ataque:393` y `cuentas-r4.ataque:359` (`waitFor` hasta que "Sí, restablecer" se habilita).

Con `aria-disabled`, `toBeEnabled()` pasa siempre, así que esas aserciones dejan de detectar un botón que se queda en espera. No se ponen rojas, pero pierden su sentido: es un debilitamiento silencioso de la suite adversaria. Qué se espera: agregarlas a los puntos de ataque de la ronda 1, para que el tester las refuerce con `not.toHaveAttribute("aria-disabled")`, justificadas en su reporte y con sus hashes nuevos.

### N-02 — Signo menos tipográfico en el interletraje
La tabla de la escala usa "−0.03em" con U+2212, igual que `DESIGN.md`. Copiado tal cual a `tokens.css`, es CSS inválido y el navegador lo ignora sin aviso, igual que las clases anuladas. Qué se espera: indicar el guion ASCII y que `tokens.test.ts` compruebe también la escala tipográfica (tamaño, interlineado, interletraje y peso), no solo los colores.

### N-03 — V-06 es angosta para la trampa que debe cerrar
`disabled=\{` no detecta `<Button disabled>`, un `disabled` pasado en un objeto esparcido, ni que `button.tsx` convierta `enEspera` en `disabled`. La salvaguarda real ya existe: los 6 rojos, cada uno con su causa exacta, más el `not.toBeDisabled()` de `button.test.tsx`. Aun así, conviene que V-06 busque `\bdisabled\b` que no vaya seguido de `:` en el código de producción, y que el resumen del programador muestre la línea de cada rojo con la aserción `toBeDisabled` que falla.

### N-04 — Detalles de la ronda 0 (P-03) y de la lista del humano
- **Ronda 0:** el procedimiento de §D-7 deja el archivo intacto y lo prueba: copia byte a byte, sustitución sin formatear (`it.fails(` sigue en una sola pieza aunque Prettier partió la llamada), restauración desde la copia y hash. Conviene agregar `git diff --quiet -- <archivo>` y `git status --porcelain -- frontend/` vacíos después de restaurar: detectan un cambio de fin de línea aunque alguien recalcule mal el hash.
- **H-08:** falta Espacio sobre el botón, que es uno de los tres caminos que §D-4 declara cubiertos.
- **H-01:** solo cubre el login; el registro lleva el mismo panel y queda sin comprobar.

### N-05 — Fuentes: V-09 puede detener al tester por nada
Los CSS de Fontsource 5 suelen declarar dos fuentes por peso, `.woff2` y `.woff`. En ese caso, `dist/assets/` tendrá también unos 6 `.woff`. V-09 cuenta solo los `.woff2`, así que no falla, pero conviene decir que los `.woff` son esperables, para que nadie lo tome como una desviación. Queda por confirmar al instalar.

### N-06 — R-01 y los pendientes aplazados necesitan un destino escrito
La contradicción entre PRD §7 ("barra lateral con lista de clases") y `DESIGN.md` §7.2 queda bien anotada en R-01 y no se resuelve aquí, como debe ser. Pero si solo vive en el plan, se pierde. Lo mismo pasa con los pendientes que el plan aplaza. Van a "Documentos a actualizar".

## Detalles menores
- §D-5: la raíz única de `AccionRestablecer` con tres estados dentro invita a anidar ternarios en JSX. Conviene indicar que el contenido se elige con retornos tempranos en una función o un subcomponente (`CLAUDE.md`).
- "Copiar" no tiene guarda `if (copiando) return`. Con `enEspera` solo queda la defensa (a). Es aceptable: copiar dos veces no tiene consecuencias.
- La regla de formateadores de "Pasos" también debe aplicarse al tester en la ronda 0 y en la ronda 1 (`npx prettier --write <archivo>` desde `frontend/`, nunca `npm run format`).
- P-01 (A) deja una barra lateral con un solo destino. Es correcto según §7.2, pero conviene decírselo al humano antes de H-04 para que no lo tome por un defecto.
- La captura no muestra nombre ni rol junto al avatar. El plan los conserva por R-08 y los documenta en §7.2. Me parece bien.
- El inventario de clases está completo. Lo contrasté con todas las clases de `src/` fuera de las pruebas: `text-sm` (59), `tracking-tight` (11), `font-semibold` (8), `text-2xl` (7), `rounded-md` (7), `text-lg` (6), `text-base` (3), `leading-none` (2), `text-xs`, `text-xl`, `shadow-xs/sm/lg`, `rounded-xs`, `rounded-xl` y los `ring-*`/`outline-*`. `leading-tight` sobrevive, porque `--leading-*` se conserva. No hay colores de la paleta, `bg-white`, `text-black` ni `dark:`. `extendTailwindMerge` para `font-size` y `shadow` es necesario: tailwind-merge 3.7 clasifica cualquier `text-<x>` desconocido como color.

## Desacuerdos arbitrados
**Rojos esperados entre el programador y la ronda 1 del tester (decisión anticipada del manager, `AGENTS.md`: "si considera incorrecta una, argumenta y decide el Manager").** Verifiqué la cuenta contra el código:
- `emularCorreccionDelFocoDeChromium` aparece en 2 pruebas de `cuentas-r3` (líneas 468 y 492) y en 3 `it(` de `cuentas-r4` (356/367, 382 y 440). Las 5 fallarán en `waitFor(() => expect(control).toBeDisabled())`.
- La 4.ª `it.fails` (línea 284) no la usa. Con F-2, el elemento activo es "Nombre completo", fuera de la raíz, así que pasa y Vitest la marca en rojo.
- Las otras 3 `it.fails` fallan en la preparación: siguen como "fallo esperado" por la razón equivocada.
- Las pruebas que dependen de la raíz única también cuadran: `cuentas-r3:361` ("Cancelar" en vuelo y el foco pasa a "Copiar") y `cuentas-r3:338` ("Correo correcto" está fuera de `AccionRestablecer`).

Decido que esos 6 rojos son **legítimos y previstos**: el contrato cambió por decisión del humano (T-14 de raíz con `aria-disabled`), no por un defecto de las pruebas. Condiciones:
1. el programador no toca ningún `*.ataque`, registra V-01 al empezar y al terminar, y declara la suite en rojo con los 6 nombres y su línea, sin llamarla verde;
2. si aparece cualquier otro rojo, o uno de estos 6 falla por otra causa, el programador se detiene;
3. en la ronda 1, el tester adapta solo la preparación, no debilita ninguna aserción final (N-01 incluido) y publica los hashes de las 32 más las nuevas;
4. en la revisión final, el manager compara línea por línea el diff de `cuentas-r3` y `cuentas-r4`.

## Documentos a actualizar
- **`docs/ESTADO.md` §3 (orquestador):**
  - R-01 como pendiente con destino CLASES;
  - la fila de "dirección visual" cerrada, con `paths` y `cn` de shadcn (D-02 y D-03) reasignados al primer encargo que ejecute `shadcn add`;
  - `tw-animate-css` sin uso (R-12), para un `chore`;
  - R-13 (área segura de iOS) y R-15 (`--text-display` en móvil), con su destino;
  - las filas de MF-05 y T-14, cerradas.
- **`README.md`, línea 228:** "El frontend tiene 25 archivos con 258 pruebas: 183 adversarias, en 11 archivos" cambiará. El plan no lo menciona y `README.md` no está en "No se toca". Asignar la actualización al cierre de cada subentrega.
- **`CLAUDE.md`:** los textos literales del plan son correctos. Solo hay que repartirlos entre 01a y 01b (M-04).
- **`AGENTS.md` y `.claude/agents/*.md`:** sin cambios, de acuerdo.

## Para el humano
Las preguntas del plan, con la opinión del manager:
- **P-01 · Destinos de la barra.** No es realmente bloqueante: `DESIGN.md` §7.2 ya lo decide ("los fija el encargo de cada módulo"). La (A) es la correcta; basta con confirmarla.
- **P-02 · Administrador "con tablas".** Sí es bloqueante, porque el plan se aparta de lo que pediste literalmente. La (A) es sólida: `/admin` no tiene nada tabular, y una tabla sin pantalla que la use no se puede validar y contradice "no sobreconstruyas". Si esperabas ver tablas en este encargo, eso son pantallas de ADMIN, y las dejaste fuera de alcance.
- **P-03 · Ronda 0 del tester.** La (A) es sólida y barata, y cumple al pie de la letra el procedimiento de ESTADO §3. El archivo queda intacto y se comprueba con el hash (con el ajuste de N-04). Aclaración: la (C) no carece del todo de evidencia, porque el tester de AUTH-02 ya confirmó las 4 fallas en la aserción final, con el mismo código de producción de hoy. Aun así, recomiendo la (A).
- **P-04 · Dividir el encargo.** La (A) es la recomendable: aísla el cambio de comportamiento (lo que ataca el tester) del reestilizado (lo que revisas tú a la vista), y la Fase A es coherente sola. Está condicionada a M-04.
- **P-05 · Dependencias.** La (A) es correcta: el rango `^5.3.0` sigue la convención del repositorio, y el subconjunto `latin` cubre á, é, í, ó, ú, ü, ñ, ¿ y ¡. Solo se instalan esos tres paquetes, sin versiones variables. La (B) no aporta lo suficiente para justificar una excepción.

Decisiones nuevas:
- **P-06 · Carril (M-03).** Recomiendo 01a en carril sensible (tu aprobación escrita del plan y tu revisión del diff antes del commit) y 01b en carril normal.
- **Altura de los campos del admin (S-09 y R-02).** El plan pone 36 px también en los formularios de `/admin`. `DESIGN.md` §6 reserva los 36 px para "las tablas del administrador", y §8, para sus "controles". Confirma que quieres 36 px en formularios, o 44 px.
- **M-01.** Si el arquitecto propone tocar `vitest.config.ts` para la prueba de tokens, necesita tu autorización, porque ese archivo está en "No se toca".
