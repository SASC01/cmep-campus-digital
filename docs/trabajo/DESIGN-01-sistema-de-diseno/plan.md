# Plan — DESIGN-01 · sistema de diseño D3 ("Vidrio líquido con fondo flotante")
Estado: LISTO
Carril: DESIGN-01a **sensible** · DESIGN-01b **normal** (decisión del humano, respuesta 6; condición de 01b en su resumen)
Requisitos: `docs/DESIGN.md` completo (aprobado el 2026-09-27) y `docs/ARCHITECTURE.md` §20, D-28; pendientes de `docs/ESTADO.md` §3 con destino "dirección visual" (incluidos MF-05 y T-14 de AUTH-02b). Solo la interfaz de RF-01, RF-02, RF-04, RF-04a, RF-04b, RF-04d, RF-05, RF-06 y RN-03, sin cambiar su comportamiento salvo el patrón de botón en espera (§D-5) y el foco de T-14 (§D-6).

Base: `6868e4d` (fusión de DOCS-03). DESIGN-01a se trabaja en `feat/design-01-sistema-de-diseno`. Ninguna precondición depende de `HEAD` ni del estado de `docs/`: el humano puede hacer commit de los documentos del plan antes de la ronda 0. Las precondiciones comparan `frontend/` con `6868e4d`. V-08 compara lo que está fuera de `frontend/` contra el commit en que el humano aprueba el plan, cuyo hash anota el orquestador en `aprobacion.md` (M-04 de `revision.md`). DESIGN-01b sale de una rama nueva desde `main` después de fusionar 01a (sugerida: `feat/design-01b-fondo-y-marco`).

Antecedentes que este plan reemplaza: `plan-direccion-c.md` y `revision-direccion-c.md` (misma carpeta; no se modifican). Lo reutilizado se verificó contra el código de `6868e4d` y contra el `DESIGN.md` actual; lo que cambió se dice en su sección. Revisión del manager de este plan: `revision.md`, "DESIGN-01a — plan" (APROBADO); sus M-01 a M-03 se atienden aquí.

---

## Preguntas bloqueantes

Ninguna. P-07, P-08 y P-09 las respondió el humano el 2026-09-27 (tabla siguiente).

---

## Respuestas del humano que este plan aplica

| Respuesta | Dónde se aplica |
|---|---|
| 1 · P-01: solo destinos que ya existen | 01b (marco): estudiante y maestro, "Inicio"; administrador, "Cuentas" |
| 2 · P-02: sin componente de tabla; admin opaco | §D-3 (contexto opaco `data-material="opaco"`); sin `table.tsx` |
| 3 · P-03: ronda 0 del tester, con N-04 | §D-8 |
| 4 · P-04: dos subentregas | "Alcance" |
| 5 · P-05: tres familias de `@fontsource`, solo `latin` | "Dependencias" |
| 6 · P-06: 01a sensible, 01b normal | Encabezado y "Cierre de cada subentrega" |
| 7 · Controles del admin: 36 px en escritorio y 44 px en pantallas angostas | §D-4: corte en 768 px |
| 8 · M-01: tocar `frontend/vitest.config.ts`; se aceptan los 6 rojos | Excepción E-3 y §D-2; tabla de rojos previstos |
| **P-07: (A)** (2026-09-27). 01a lleva la migración de clases, `enEspera` en los 13 botones y T-14; 01b, el marco, la composición y los orbes, en carril normal. **Condición del humano:** 01b no toca las redirecciones de `require-rol.tsx`; si resulta necesario, se detiene y avisa | "Alcance"; resumen de 01b, "Condición de detención" y "No se toca" |
| **P-08: (B)** (2026-09-27). En la ronda 0, el tester cambia los 3 selectores de la ficha por uno que funcione antes y después del cambio, **por rol, etiqueta o texto accesible, nunca por clase de estilo**, sin la alternativa `, div.rounded-lg`. Regla ya escrita en `.claude/agents/tester.md`, "Reglas de combate" | §D-8 (paso 7), E-4, V-01, V-03, V-08, rojos previstos (vuelven a ser 6), §D-6 y R-08 |
| **P-09: (A)** (2026-09-27). Como dice `DESIGN.md` §7.1: orbes en movimiento solo en login e inicio, quietos en las demás | Resumen de 01b |
| Foco blanco por dentro en los botones azules y rojos: aceptado; el humano lo confirma en su comprobación visual | S-07, H-04 |
| Campos del admin con texto de 16 px: aceptado. El orquestador ya corrigió `docs/DESIGN.md` §8 (fila del administrador y párrafo sobre Safari en iOS) | S-09; el programador no toca esa fila ni ese párrafo |
| Precondición sin `HEAD`: "`frontend/` sin cambios desde `6868e4d`" | §D-8 (paso 1) y paso 1 del programador |

---

## Suposiciones

- **S-01 · Sin navegador para ningún agente.** Ningún agente abre navegadores, ni con interfaz ni sin ella. La verificación visual y el **contraste medido en navegador** los hace el humano con el procedimiento de "Comprobación del humano". No propongo un navegador sin interfaz para agentes: exigiría una dependencia nueva (por ejemplo, Playwright) que no está aprobada.
- **S-02 · Sin CLI de shadcn.** `label.tsx` y `sonner.tsx` se escriben a mano, como en FRONT-01. D-02 (`cn`) y D-03 (`paths`) no entran: siguen para el primer encargo que ejecute `shadcn add`.
- **S-03 · Sin cambios de texto.** Ningún `TEXTOS_*` cambia y ningún `data.ts` se toca en 01a.
- **S-04 · Nombre del producto (M-02 de la dirección C).** 01a no lo toca: el `h1` del login sigue pintando `TEXTOS_LOGIN.titulo` en un solo nodo. `DESIGN.md` solo pide "CMEP" y "Campus Digital" en dos colores en la barra superior (§7.4), que es de 01b. Decidido para 01b: la barra superior toma el nombre de una constante nueva en `components/layout/data.ts` (`NOMBRE_PRODUCTO = { sigla: "CMEP", nombre: "Campus Digital" }`), porque `components/layout` no puede importar de `features/`. El login conserva su `h1` sin partir. El nombre accesible de la lista de anuncios (01b) sale del `h2` que ya existe, con `aria-labelledby`. Ningún `data.ts` de `features/` se toca en todo DESIGN-01.
- **S-05 · Error de un campo sobre vidrio.** `DESIGN.md` §7.3 deja al encargo elegir entre vidrio fuerte, sólido o fondo `--danger-soft`. Elijo **fondo `--danger-soft`** en un componente `ErrorDeCampo` (§D-7): los formularios de cuenta siguen en vidrio (62 %), como pide §7.2, y el rojo va sobre un sólido (`--destructive` sobre `--danger-soft`: 5.5). Se documenta como **propuesta** hasta la comprobación del humano.
- **S-06 · Movimiento reducido del indicador de carga en 01a.** El `prefers-reduced-motion` de 01b es el de los orbes. El indicador de carga es de `Cargando` y del botón en espera, que nacen o cambian en 01a, y `DESIGN.md` §6 pide que deje de girar. Por eso 01a pone `motion-reduce:animate-none` en los dos.
- **S-07 · Anillo de foco de los botones rellenos (aceptado por el humano el 2026-09-27; lo confirma en H-04).** `DESIGN.md` §6 pide el foco en `#FFFFFF` "sobre `--accent`… (botón `primary`)". Un contorno blanco por fuera del botón quedaría sobre vidrio claro y no se vería. En `primary` y `destructive`, el contorno de 2 px va 4 px hacia dentro (`-outline-offset-4`) y en el color de su texto (`--primary-foreground` y `--destructive-foreground`, ambos `#FFFFFF`): 9.2:1 y 6.8:1. El mecanismo de foco blanco para superficies de color (bloque destacado, tarjetas de clase) no se construye: no hay ninguna todavía. Lo hace el encargo que las construya.
- **S-08 · Estados `hover`** (no están en `DESIGN.md`): `primary` y `destructive`, fondo al 90 %; `outline`, de vidrio fuerte a `--surface`; en contexto opaco, a `--muted`; `ghost`, a vidrio fuerte (en contexto opaco, `--muted`). Se documentan como **propuesta**.
- **S-09 · Densidad del admin.** Botones y campos de 36 px desde 768 px de ancho y de 44 px por debajo (respuesta 7). El texto de los campos de texto va a 16 px (`--text-body`) en todos los roles: **decisión del humano, ya escrita en `DESIGN.md` §8** por el orquestador. No es una propuesta ni un cambio del programador.
- **S-10 · Enlaces sueltos con objetivo de 44 px.** Los 6 enlaces apilados de los formularios de cuenta ("¿Olvidaste tu contraseña?", "Crear cuenta"…) no están dentro de una frase, así que no les aplica la excepción de WCAG 2.5.8. Usan `buttonVariants({ variant: "link", size: "enlace" })`, con altura mínima de 44 px.
- **S-11 · Se retiran del botón** la variante `secondary` y los tamaños `xs`, `lg`, `icon-xs` e `icon-lg`. Nadie los usa (verificado con búsqueda) y no están en `DESIGN.md` §7.3.
- **S-12 · `--card` apunta a `--surface`.** `Card` usa la utilidad `vidrio` (§D-3), no `bg-card`. El derivado `--card` queda sólido para que un componente futuro de shadcn que use `bg-card` no pinte vidrio sin desenfoque.
- **S-13 · Solo el subconjunto `latin`.** Cubre á, é, í, ó, ú, ü, ñ, ¿ y ¡. Un nombre con letras de `latin-ext` (por ejemplo, ł) se ve con la fuente de respaldo del sistema.
- **S-14 · "Inicio".** En el código actual, "inicio" son las rutas índice `/estudiante` y `/maestro`, bajo `RequireRol`, que hoy pintan `BienvenidaView` y mañana los dashboards. `/admin` no es "inicio" para los orbes: el administrador tiene orbes quietos y superficies opacas (`DESIGN.md` §7.1). "Login" es solo `/login`: `/registro` está en "Demás pantallas".

---

## Alcance

### División entre 01a y 01b (P-07, opción A)

| Pieza | Subentrega | Por qué |
|---|---|---|
| Tokens, materiales con respaldo sólido, fuentes, componentes base | 01a | Respuesta 4 |
| Migración mecánica de clases (inventario) | 01a | Anular la paleta y las escalas por defecto de Tailwind deja sin CSS a `text-sm`, `rounded-lg`, `shadow-sm`…: cualquier archivo sin migrar se rompe en silencio en el mismo cambio que los tokens |
| `enEspera` en `Button` y en los 13 botones | 01a | Comportamiento del `Button` base; cambia el doble envío del login, del registro y de "Sí, restablecer" (carril sensible) |
| T-14 | 01a | Misma causa que MF-05: se corrige al quitar `disabled` |
| Contexto opaco y densidad del administrador | 01a | Parte del material y del tamaño de los controles base |
| Fondo con orbes, movimiento y `prefers-reduced-motion` de los orbes | 01b | Respuesta 4 |
| Marco (barra lateral o inferior, barra superior, monograma, avatar) y composición de cada pantalla | 01b | Con los orbes ningún texto puede quedar directo sobre el fondo; fondo y composición llegan juntos |

### DESIGN-01a (este plan, completo)
1. **Tokens** (`DESIGN.md` §3, §4 y §5): todos los colores, los derivados de shadcn, los materiales (`--glass`, `--glass-strong`, `--glass-accent`, `--glass-border`, `--glass-highlight`, `--shadow-glass`, colores de los orbes y `--background-veil`), los radios, `--shadow-overlay`, la escala tipográfica y las familias. Anulación de la paleta y de las escalas por defecto de Tailwind.
2. **Materiales:** utilidades `vidrio`, `vidrio-fuerte` y `vidrio-azul`, con respaldo sólido sin `backdrop-filter`; contexto opaco para pantallas densas; densidad de los controles del admin.
3. **Fuentes:** las tres familias de `@fontsource`, solo los pesos de §4 y el subconjunto `latin`.
4. **`components/ui/`:** `Button` (variantes de §7.3, píldora, tamaños por densidad y estado **en espera**), `Input`, `Card` (panel de vidrio), `Dialog` (capa flotante opaca), `Label` (nuevo) y `Toaster` (nuevo, §7.11).
5. **Piezas compartidas:** `Cargando`, `MensajeError` y `ErrorDeCampo` (nuevo).
6. **Foco:** contorno sólido de 2 px separado 2 px, en lugar de `ring-ring/50`; interior y blanco en los botones rellenos (S-07).
7. **MF-05 y T-14 de raíz:** los 13 botones con una petición en vuelo pasan de `disabled` a `enEspera`, y `AccionRestablecer` decide el foco con el elemento activo en el momento de la respuesta.
8. **Migración mecánica de clases** en todos los archivos de `frontend/src` (inventario abajo), sin cambiar la estructura de ninguna pantalla.
9. **`docs/DESIGN.md`:** los patrones y valores nuevos de 01a, marcados como **propuesta**, y el estado de aplicación.
10. **Prueba de tokens y contraste calculado** (`tokens.test.ts`, gracias a la excepción de `vitest.config.ts`) y **contraste medido en navegador por el humano** en las pantallas de 01a.
11. **Selectores de la ficha en 3 pruebas de ataque** (P-08 B), en la ronda 0 del tester, por texto y rol accesibles (§D-8, paso 7).

### DESIGN-01b (en resumen al final; plan detallado aparte)
Fondo con orbes (`FondoAnimado`), movimiento y `prefers-reduced-motion` de los orbes, marco, composición de cada pantalla y contraste medido contra el peor caso sobre los orbes.

### Pendientes de ESTADO §3 con destino "dirección visual"

| Pendiente | ¿Dónde? | Nota |
|---|---|---|
| Valores de `DESIGN.md` en `tokens.css`, tokens nuevos, materiales, radios, `--shadow-glass` y `--shadow-overlay` | 01a | Los tamaños, ciclos y amplitud de los orbes, en 01b |
| Tema del `Toaster` | 01a | Se ve con "Copiar" en `/admin` |
| Anillo de foco sólido en lugar de `ring-ring/50` | 01a | |
| Fondo con orbes, su alcance por pantalla y `prefers-reduced-motion` de los orbes | 01b | |
| Respaldo sólido sin `backdrop-filter` | 01a | En las utilidades de material |
| Anular la paleta por defecto de Tailwind | 01a | |
| Instalar y validar las tres familias | 01a | Validación visual: humano (H-01) |
| Propuestas aprobadas el 2026-09-27 | Las que tienen consumidor | Lista en "docs/DESIGN.md (01a)" |
| Regla del rojo sobre vidrio | 01a | S-05, V-13 |
| `paths` de shadcn (D-03) y `cn` (D-02) | No entra | S-02 |
| Grep de V-07 (`\bslate-`) | 01a | V-02 |
| MF-05 y T-14 | 01a | §D-5, §D-6 y §D-8 |

### No entra (en 01a)
- Marco, composición, fondo con orbes y movimiento de los orbes (01b).
- Pantallas nuevas y dashboards; bloque destacado; `EstadoVacio`, `EstadoPagoBadge` y `EstadoEntregaBadge`; botón de avisos; tabla densa (respuesta 2).
- Pendientes de ADMIN, aunque vivan en `/admin`: tarjetas hechas a mano en lugar de `Card` (MF-02); `erroresPorCampo` duplicado; el `role="status"` que envuelve también "Copiar"; la temporal que se pierde al buscar otra cuenta; el texto genérico ante un fallo de red; la alerta que persiste al reabrir la confirmación. Aquí solo cambian sus clases.
- Cambios de AUTH-03 y cualquier cambio de texto.
- Quitar `tw-animate-css`: deja de usarse, pero desinstalarlo es un cambio de dependencias (R-09).
- Token de radio para casillas (6 px): no hay casillas todavía (R-10).
- `--text-display` a 32 px por debajo de 640 px: no hay bloque destacado todavía (R-10).
- CLI de shadcn, `paths` y `cn` de shadcn (S-02). Logo del colegio. Modo oscuro.

### No se toca (DESIGN-01a)

Nadie modifica estas rutas, salvo lo que diga una excepción con su alcance exacto.

**Repositorio**
- `backend/`, `shared/`, `infra/`, `.claude/`, `.codex/`
- `AGENTS.md`, `CLAUDE.md`, `README.md` (los aplica el orquestador al cerrar; ver "Cierre de cada subentrega")
- `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/PRD.md`, `docs/ESTADO.md`, `docs/design/**`
- `docs/trabajo/**` fuera de `docs/trabajo/DESIGN-01-sistema-de-diseno/`; y dentro de esa carpeta, `plan-direccion-c.md`, `revision-direccion-c.md` y este `plan.md` (solo lo cambia el arquitecto). Cada agente escribe solo su propio entregable (`resumen-programador.md`, `reporte-tester.md`, `revision.md`); el orquestador, `aprobacion.md` y `comprobacion-humano.md`
- Raíz: `package.json`, `eslint.config.mjs`, `.prettierignore`, `tsconfig.base.json`, `.gitattributes`, `.gitignore`, `.nvmrc`

**Frontend**
- `frontend/components.json`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/.env*`
- `frontend/src/test/setup.ts`, `frontend/src/vite-env.d.ts`
- `frontend/src/services/**`
- `frontend/src/features/*/hooks.ts`, `frontend/src/features/*/types.ts`, `frontend/src/features/*/data.ts`
- `frontend/src/app/router.tsx`, `frontend/src/app/require-rol.tsx`, `frontend/src/app/require-sesion.tsx`, `frontend/src/app/require-cambio-de-contrasena.tsx`
- `frontend/src/components/layout/layout-publico.tsx`, `frontend/src/components/layout/types.ts`
- `frontend/src/lib/format.ts`, `frontend/src/lib/format.test.ts`
- `frontend/src/features/auth/lib.ts` y las vistas de `auth` sin clases: `recuperar-view.tsx`, `restablecer-view.tsx`, `establecer-contrasena-view.tsx`, `cambiar-contrasena-view.tsx`
- Las pruebas normales existentes, salvo `features/auth/login-view.test.tsx`, `features/admin/cuentas-view.test.tsx` y `features/admin/lib.test.ts`
- **Para el programador:** todo `*.ataque.test.*`
- **Para el tester:** todo el código de producción y las pruebas normales

**Excepciones (alcance exacto)**
- **E-1 · `frontend/package.json`:** solo las tres líneas nuevas en `dependencies` que escribe el `npm install` aprobado (respuesta 5), con rango `^5.3.0`. Nada más.
- **E-2 · `package-lock.json` de la raíz:** solo lo que escribe ese mismo `npm install`.
- **E-3 · `frontend/vitest.config.ts`** (respuesta 8): solo se sustituye la línea `css: false,` por una línea de comentario y la línea `css: { include: [/[\\/]src[\\/]styles[\\/]tokens\.css\?raw$/] },`. Nada más en el archivo. Justificación y verificación en §D-2.
- **E-4 · `*.ataque.test.*`** (respuestas 3 y 8, y P-08 B). Solo el tester:
  - **Ronda 0:** edita `cuentas-r4.ataque.test.tsx` de forma temporal para confirmar T-14 y lo restaura byte a byte (§D-8, pasos 3 a 6). Después, en `cuentas-r2.ataque.test.tsx`, `cuentas-r3.ataque.test.tsx` y `cuentas-r4.ataque.test.tsx`, agrega el auxiliar `fichaDe` y sustituye solo las líneas que localizan la ficha (§D-8, paso 7). Ninguna aserción cambia.
  - **Rondas 1 a 3:** sobre las `*.ataque` existentes hace solo los cambios de "Tareas de la ronda 1" (§D-8), y puede crear `*.ataque` nuevas.
  - Regla de `.claude/agents/tester.md`, "Reglas de combate": "Las pruebas de ataque no localizan elementos por clases de estilo. Usa el rol, la etiqueta o el texto accesible; una clase cambia con el diseño sin que cambie el comportamiento."
- **E-5 · `docs/DESIGN.md`:** el programador lo edita solo en las secciones de "docs/DESIGN.md (01a)", a mano y sin formateador.

La verificación V-08 recorre esta lista entera, excepciones incluidas, con dos bases: `6868e4d` para `frontend/` y `package-lock.json`, y el commit de aprobación del plan (hash anotado en `aprobacion.md`) para todo lo demás. `docs/ESTADO.md`, `aprobacion.md` y `comprobacion-humano.md` los actualiza el orquestador durante el encargo: quedan fuera de V-08 y los revisa el manager en la revisión final.

---

## Diseño

Sin backend, sin API nueva y sin datos. Todo ocurre en el frontend.

### D-1 · Tokens y anulación
`frontend/src/styles/tokens.css` se reescribe en seis bloques, en este orden:
1. **`:root`, CSS plano:** todos los colores de `DESIGN.md` §3, los derivados, los materiales y `--control-height`. Van aquí, y no en `@theme`, porque el contexto opaco y el respaldo sin `backdrop-filter` los redefinen por subárbol, y porque así siempre se emiten al CSS, los use o no una clase.
2. **Respaldo sin `backdrop-filter`:** `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { :root { --glass: var(--surface); --glass-strong: var(--surface); --glass-accent: var(--accent); } }` (`DESIGN.md` §3, "Materiales").
3. **Contexto opaco y densidad** (§D-3 y §D-4).
4. **`@theme`** (no `inline`): primero las anulaciones (`--color-*`, `--text-*`, `--font-*`, `--font-weight-*`, `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--text-shadow-*` y `--blur-*`, todas con `initial`); después, con valores literales, las familias, los pesos, la escala tipográfica, los radios y `--shadow-overlay`. Anular `--blur-*` deja sin CSS a `backdrop-blur-*`, así que nadie puede fabricar vidrio fuera de las utilidades.
5. **`@theme inline`:** `--color-<token>: var(--<token>)` para cada color de `:root`, derivados incluidos, para que las utilidades de color sigan al token en cualquier subárbol.
6. **`@utility vidrio`, `@utility vidrio-fuerte` y `@utility vidrio-azul`** (§D-3).

Conservan su valor por defecto: `--spacing`, puntos de corte, contenedores, `--tracking-*`, `--leading-*`, `--ease-*` y `--animate-*`. `DESIGN.md` no los redefine.

**Tailwind 4 no falla con una clase desconocida: la ignora sin avisar.** Por eso la anulación va con el inventario de clases y con las búsquedas V-02 a V-05 y V-10. Sin ellas, las regresiones serían invisibles (R-02).

`cn` (`lib/utils.ts`) se extiende con `extendTailwindMerge` y las claves de tema `text`, `radius` y `shadow` (tailwind-merge 3.7, `bundle-mjs.mjs` líneas 621-718: el tema `text` por defecto solo acepta tallas de camiseta, y cualquier otro `text-<x>` lo toma como color). Sin eso, `cn("text-small", "text-destructive")` borraría el tamaño (R-03).

### D-2 · Prueba de tokens con `?raw` (M-01 de la dirección C)
`vitest.config.ts` fija `css: false`. En Vitest 4.1.11 (`node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js`, líneas 10020-10050, `CSSEnablerPlugin`), el plugin `vitest:css-disable` vacía el código de todo id que cumpla `\.(css|…)(?:$|\?)` salvo que `shouldProcessCSS(id)` sea verdadero, y `vitest:css-empty-post` lo sustituye por `export default ""`. `tokens.css?raw` cumple la expresión, así que hoy llega vacío.

**Vía elegida (E-3):** `css: { include: [/[\\/]src[\\/]styles[\\/]tokens\.css\?raw$/] }`. Verificado en el código instalado (y, por el manager, con una corrida de Vitest en el scratchpad; `revision.md`):
- **Vitest 4.1.11**, mismo archivo: con `css` como objeto, `shouldProcessCSS` devuelve `true` si algún `include` coincide con el id. Para `…/tokens.css?raw`, los dos plugins de Vitest salen sin tocar el código. Para cualquier otro CSS, `include` no coincide y se siguen vaciando como hoy. El valor por defecto de Vitest ya es `css: { include: [] }` (`dist/chunks/defaults.9aQKnqFk.js`, línea 68), equivalente a `false`.
- **Vite 8.3.0** (`node_modules/vite/dist/node/chunks/node.js`): el `load` de `vite:asset` (líneas 31838-31856) resuelve `?raw` leyendo el archivo y devuelve `export default <texto en JSON>`. El `transform` de `vite:css` (líneas 29241-29245) excluye los ids con `SPECIAL_QUERY_RE`, que incluye `raw` (línea 717).
- **`@tailwindcss/vite`** (`dist/index.mjs`): excluye los ids que cumplen `/[?&](?:worker|sharedworker|raw|url)\b/`.

Resultado: `import tokens from "./tokens.css?raw"` entrega el texto crudo en la prueba, y ningún otro CSS cambia de trato. La expresión acepta `/` y `\`, porque Vite normaliza los ids con `/` también en Windows. El tipo de `?raw` ya lo declara `vite/client`, incluido en `tsconfig.app.json`.

**Condición de parada:** la primera aserción de `tokens.test.ts` comprueba que el texto no está vacío y contiene `--background`. Si falla con E-3 aplicada, el programador **se detiene** y lo reporta. No prueba otra vía ni toca otro archivo de configuración.

### D-3 · Materiales, respaldo sólido y contexto opaco
**Utilidades** (en `tokens.css`, para que la prueba de tokens las cubra):
- `vidrio`: `background-color: var(--glass)`, `border: 1px solid var(--glass-border)`, `box-shadow: var(--glass-highlight), var(--shadow-glass)`, `-webkit-backdrop-filter: var(--glass-filter)` y `backdrop-filter: var(--glass-filter)`.
- `vidrio-fuerte`: lo mismo con `--glass-strong` y `--glass-strong-filter`.
- `vidrio-azul`: `background-color: var(--glass-accent)`, `box-shadow: var(--glass-highlight), var(--shadow-glass)` y los dos `backdrop-filter` con `--glass-accent-filter`; sin borde (`DESIGN.md` solo pone borde al vidrio y al vidrio fuerte). No la usa ninguna pantalla hasta los dashboards; se define porque es un material de `DESIGN.md` y la prueba de contraste lo necesita.

Los filtros son tokens nuevos, con los valores de `DESIGN.md`: `--glass-filter: blur(28px) saturate(170%)`, `--glass-strong-filter: blur(32px) saturate(170%)` y `--glass-accent-filter: blur(30px) saturate(170%)`.

**Respaldo sin `backdrop-filter`:** el bloque `@supports not` de §D-1. Como las utilidades leen variables, el vidrio pasa a sólido sin tocar ningún componente. Ningún navegador actual carece de `backdrop-filter`, así que el humano no lo puede ver: lo cubren `tokens.test.ts` y V-10.

**Contexto opaco** (pantallas densas: hoy, todo `/admin`; mañana, el gradebook):
```css
[data-material="opaco"] {
  --glass: var(--surface);
  --glass-strong: var(--surface);
  --glass-border: var(--border);
  --glass-highlight: 0 0 transparent;
  --shadow-glass: 0 0 transparent;
  --glass-filter: none;
  --glass-strong-filter: none;
}
```
El botón `outline` en contexto opaco lleva además borde de 2 px en `--input` (`DESIGN.md` §7.3) mediante la variante `in-data-[material=opaco]:`. El manager comprobó que Tailwind 4.3.3 la genera (`revision.md`). Si aun así no apareciera (V-10), se usa el equivalente arbitrario `[[data-material=opaco]_&]:` con las mismas clases.

`ContenedorRol` pone `data-material="opaco"` y `data-densidad="densa"` en su raíz solo cuando el rol es `admin`.

### D-4 · Densidad de los controles
`--control-height: 2.75rem` (44 px) en `:root`, y:
```css
@media (width >= 48rem) {
  [data-densidad="densa"] { --control-height: 2.25rem; }
}
```
**Corte en 768 px (48rem, el `md` de Tailwind):** es el mismo en que `DESIGN.md` §7.4 cambia la barra lateral por la barra inferior. Por debajo, la interfaz es de pantalla táctil; por encima, de puntero. Así, la densidad y la navegación cambian en el mismo punto. Lo usan `Button` (tamaños `default` e `icon`) e `Input`. El tamaño `sm` es fijo, de 36 px, para acciones en línea en cualquier rol (§7.3). Las pantallas fuera de `ContenedorRol` usan el valor de `:root`.

### D-5 · Botón en espera (MF-05)
`Button` gana la propiedad `enEspera?: boolean`, incompatible con `asChild` por tipo. Con `enEspera`:
1. No pone `disabled`. Pone `aria-disabled="true"` y `aria-busy="true"`: el botón **conserva el foco** y sigue en el orden de tabulación.
2. Intercepta `onClick`: llama a `evento.preventDefault()` y **no** llama al `onClick` recibido. Eso cubre el clic; Enter y Espacio sobre el botón, que el navegador convierte en `click`; y el envío implícito con Enter desde un campo, que el navegador convierte en un `click` sintético sobre el botón de envío (el `preventDefault` cancela el envío).
3. Muestra `LoaderCircle` (`aria-hidden`, `size-4 animate-spin motion-reduce:animate-none`) antes del texto. **El texto no cambia:** el nombre accesible es el mismo en vuelo, y las pruebas localizan los botones por ese nombre.
4. Cursor `progress` y sin opacidad reducida, para que el contraste del texto se mantenga.

**Defensas contra el doble envío, en capas:**
- **(a) El clic interceptado.** Actúa en cuanto React vuelve a pintar con `enEspera=true`.
- **(b) La guarda del manejador.** Cada `handleSubmit` conserva su `if (mutacion.isPending) return`. Cubre `fireEvent.submit`, `requestSubmit()` y cualquier envío que no pase por el botón.
- **(c) El candado síncrono.** `AccionRestablecer` conserva `enviandoRef` (T-03).

Dos clics en el mismo instante quedan igual de protegidos que hoy: `disabled` también dependía de un repintado entre los dos. "Copiar" no tiene guarda (b): con `enEspera` solo le queda la (a), y copiar dos veces no tiene consecuencias.

**`disabled` queda para un control que no está disponible**, no para una petición en vuelo. Hoy no hay ninguno.

### D-6 · T-14 en `AccionRestablecer` (`features/admin/components/ficha-de-cuenta.tsx`)
**Causa:** `tieneFocoRef` se deduce de eventos `blur`. Un `blur` sin destino, sea el de la corrección de Chromium o un clic en una zona no enfocable, deja la bandera encendida aunque el admin se vaya después a otro campo.

**Corrección de raíz:**
1. Con `enEspera`, "Sí, restablecer" ya no se deshabilita, así que Chromium no le quita el foco.
2. El foco se decide con el elemento activo **en el momento de la respuesta**, no con el historial de eventos. Se eliminan `tieneFocoRef`, `manejarFoco`, `manejarDesenfoque` y los `onFocusCapture`/`onBlurCapture`.

**Contrato del foco** (lo ataca el tester):
- **F-1:** con la petición en vuelo, "Sí, restablecer" tiene `aria-disabled="true"` y `aria-busy="true"`, no tiene `disabled` y conserva el foco si lo tenía. Clic, Enter o Espacio sobre él no mandan una segunda petición.
- **F-2:** al llegar la temporal (`onSuccess` de la llamada a `mutate`), el foco va a "Copiar" **solo si** `focoDisponiblePara(raizRef.current, document.activeElement, document.body)` es `true`: el elemento activo está dentro de la raíz de `AccionRestablecer`, o es `<body>` o `null` (nadie más tiene el foco). Si el admin está en otro control, el foco no se toca.
- **F-3:** con un error (`onError`), el foco va a "Cancelar" solo con la misma condición y solo si "Cancelar" existe. Si el admin canceló con la petición en vuelo, la referencia es nula y no pasa nada.
- **F-4:** se conservan T-07, T-09, T-10, T-11, T-12 y T-13. Al abrir la confirmación, el foco va a "Cancelar"; al cancelar, a "Restablecer contraseña"; con `<StrictMode>`, el montaje no mueve el foco (`confirmandoAnteriorRef`); cada ficha nueva empieza cerrada.

**Estructura:** `AccionRestablecer` devuelve **una sola raíz**, `<div ref={raizRef} className="flex flex-col gap-2">{renderContenido()}</div>`. `renderContenido` es una función local que elige, con retornos tempranos y sin ternarios anidados, el contenido de cada estado: temporal, confirmación o botón inicial.

**`FichaDeCuenta`:** en su raíz solo se sustituye `rounded-lg` por `rounded-panel`; conserva `flex flex-col gap-3 border border-border bg-surface p-4`. Sin `data-slot` ni otro atributo nuevo. **Invariantes de estructura** que usan las pruebas de ataque (R-08):
- la raíz de la ficha es el ancestro común más cercano del nombre de la cuenta y del formulario "Guardar correo", y no contiene el formulario "Buscar" (auxiliar `fichaDe`, §D-8, paso 7);
- el `div` que envuelve nombre, correo, rol y "Cuenta inactiva" es el primer `div` ancestro del nombre (`cuentas-r1.ataque:407`) y no contiene el formulario "Guardar correo";
- el icono sigue junto a "Cuenta inactiva" (`cuentas-r1.ataque:381`).

### D-7 · Error de un campo (S-05)
`ErrorDeCampo({ id, children })` pinta `<p id={id} className="flex items-start gap-2 rounded-row bg-danger-soft px-3 py-2 text-small text-destructive"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{children}</p>`. El texto queda como nodo directo del `<p>`, así que `getByText` lo sigue encontrando en un solo elemento. Sustituye a cada `<p id="…-error" className="text-sm text-destructive">`, con el mismo `id` y el mismo texto.

### D-8 · Ronda 0 (T-14 y selectores de la ficha) y rondas del tester (respuesta 3 con N-04; P-08 B)
**Ronda 0 del tester, antes del programador.** No es solo de confirmación: confirma T-14 (pasos 1 a 6) y cambia el localizador de la ficha en 3 archivos de ataque (pasos 7 a 9). Solo lee el código de producción. Solo escribe `cuentas-r2.ataque.test.tsx`, `cuentas-r3.ataque.test.tsx`, `cuentas-r4.ataque.test.tsx` y su reporte. Todo desde `frontend/`, con la salida de cada comando redirigida a un archivo del scratchpad, sin tubería. No cuenta en el tope de 3 rondas.

**Confirmación de T-14**
1. **Precondición** (no depende de `HEAD` ni de `docs/`): `git diff --quiet 6868e4d -- .` sale con código 0 y `git status --porcelain -- .` sale vacío. Si no, **detente**.
2. SHA-256 de las 11 `*.ataque` de `frontend/` igual a la tabla vigente (`docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md`, "Aplicación de la opción B a T-14"). En particular, `src/features/admin/cuentas-r4.ataque.test.tsx` = `97b5c0796860736d9fb8d32b96de1feb97ecc074af74fa70d8b4a51ec001ee1a`. Si alguno no coincide, **detente**.
3. Copia `cuentas-r4.ataque.test.tsx` al scratchpad. En el original, sustituye solo las 4 apariciones de `it.fails(` por `it(`, sin formatear.
4. `npm run test -- src/features/admin/cuentas-r4.ataque.test.tsx` (el `pretest` construye `shared/`).
5. Confirma que fallan exactamente esas 4 pruebas y que cada una falla en su `expect(document.activeElement, …)` final, no en `emularCorreccionDelFocoDeChromium`, `escribirEn`, `clicEnZonaNoEnfocable` ni `findByText`. Mensajes esperados:
   - 1.ª (línea 209): `el admin escribía en "Nombre completo" y la temporal le llevó el foco a button "Copiar"`
   - 2.ª (línea 233): `el admin escribía en "Correo correcto" y la temporal le llevó el foco a button "Copiar"`
   - 3.ª (línea 257): `el admin escribía en "Nombre completo" y el error le llevó el foco a button "Cancelar"`
   - 4.ª (línea 285): `el admin escribía en "Nombre completo" y la temporal le llevó el foco a button "Copiar"`

   Anota la línea de cada falla y compárala con la del `expect` final de su prueba. Si alguna falla en la preparación, **detente** y repórtalo: el orquestador lo escala.
6. Restaura el archivo desde la copia. Comprueba: el hash vuelve a ser `97b5c079…`; `git diff --quiet -- src/features/admin/cuentas-r4.ataque.test.tsx` sale con código 0; `git status --porcelain -- .` sale vacío (N-04: detecta un cambio de fin de línea aunque el hash se calcule mal). Vuelve a correr el archivo: 13 pruebas, 9 en verde y 4 como fallo esperado.

**Selectores de la ficha (P-08 B)**

Hoy, `cuentas-r2.ataque.test.tsx:290`, `cuentas-r3.ataque.test.tsx:449` y `cuentas-r4.ataque.test.tsx:461` hacen `screen.getByText(<nombre>).closest("div.rounded-lg")`, seguido de un `if (!(ficha instanceof HTMLElement)) throw …`. Es un selector de clase de estilo, que prohíbe la regla de `tester.md` ("Las pruebas de ataque no localizan elementos por clases de estilo. Usa el rol, la etiqueta o el texto accesible; una clase cambia con el diseño sin que cambie el comportamiento"), y 01a lo rompe al anular `rounded-lg`.

**El rol, la etiqueta o el texto accesible no bastan por sí solos:** la raíz de `FichaDeCuenta` no tiene rol ni nombre accesible en el código de `6868e4d`, así que ninguna consulta de Testing Library la devuelve directamente. Consultar a nivel de `screen` quitaría el `within(ficha)`, que es lo que comprueba que la temporal y los botones son de esa ficha. Darle un rol (por ejemplo, `role="group"` con `aria-labelledby`) sería un cambio de producción que el código de hoy no tiene.

**Salida:** la ficha se localiza como el **ancestro común más cercano de dos elementos accesibles que solo existen dentro de ella**: el texto del nombre de la cuenta y el formulario con nombre accesible "Guardar correo" (`role="form"`, por su `aria-label`; `FichaDeCuenta` siempre pinta `FormularioCorregirCorreo`). Una guarda comprueba que ese ancestro no contiene el formulario "Buscar", para que nunca se tome por ficha el contenedor del buscador. Solo usa texto, rol y nombre accesible; no depende de clases ni de un atributo que el código de hoy no tenga. Con el código de `6868e4d` devuelve la misma raíz que `closest("div.rounded-lg")`, y 01a no cambia esa estructura (§D-6).

7. En cada uno de los 3 archivos:
   - agrega, junto a los demás auxiliares del archivo, este auxiliar (mismo texto en los tres):
     ```ts
     // La ficha de una cuenta: el ancestro común más cercano de su nombre y del formulario
     // "Guardar correo". Sin clases de estilo (tester.md, "Reglas de combate").
     const fichaDe = (nombre: string): HTMLElement => {
       const formularioCorreo = screen.getByRole("form", { name: "Guardar correo" })
       let nodo: HTMLElement | null = screen.getByText(nombre).parentElement
       while (nodo && !nodo.contains(formularioCorreo)) nodo = nodo.parentElement
       if (!nodo) throw new Error("no se encontró el contenedor de la ficha")
       if (nodo.contains(screen.getByRole("form", { name: "Buscar" }))) {
         throw new Error("el contenedor encontrado incluye el buscador: no es la ficha")
       }
       return nodo
     }
     ```
   - sustituye solo las dos líneas `const ficha = screen.getByText(X.nombre).closest("div.rounded-lg")` y `if (!(ficha instanceof HTMLElement)) throw new Error("no se encontró el contenedor de la ficha")` por `const ficha = fichaDe(X.nombre)`, con el mismo `X` (`carla` en r2; `beto` en r3 y r4);
   - no cambia ninguna otra línea: ni aserciones, ni nombres de pruebas, ni `it.fails`.
   - Formatea solo esos 3 archivos, desde `frontend/`: `npx prettier --write src/features/admin/cuentas-r2.ataque.test.tsx src/features/admin/cuentas-r3.ataque.test.tsx src/features/admin/cuentas-r4.ataque.test.tsx`.
8. **Verificación:**
   - **Mismo elemento que antes, sin clases.** De forma temporal, después de cada `const ficha = fichaDe(X.nombre)`, agrega `expect(ficha).toBe(screen.getByText(X.nombre).parentElement?.parentElement)`. En `6868e4d`, la raíz de `FichaDeCuenta` es el abuelo del párrafo del nombre: el mismo elemento que devolvía `closest("div.rounded-lg")`. Corre los 3 archivos: deben pasar. Retira esas líneas temporales antes del punto siguiente.
   - `git diff -- src/features/admin/cuentas-r2.ataque.test.tsx src/features/admin/cuentas-r3.ataque.test.tsx src/features/admin/cuentas-r4.ataque.test.tsx`: solo el auxiliar agregado y la sustitución de las dos líneas en cada archivo. `git status --porcelain -- .` muestra solo esos 3 archivos como modificados.
   - `rounded` en `src/**/*.ataque.test.*` → 0.
   - `npm run test` desde `frontend/`: 25 archivos y 258 pruebas, 254 en verde y 4 fallos esperados, igual que la línea base de `6868e4d`. `cuentas-r4.ataque.test.tsx`: 13 pruebas, 9 en verde y 4 fallos esperados.
   - `npm run lint` desde `frontend/` (solo comprueba): código 0.
9. **Hashes y reporte.** Escribe `reporte-tester.md`, sección "DESIGN-01a — Ronda 0 (confirmación de T-14 y selectores de la ficha)", con:
   - la salida relevante de los pasos 1 a 8;
   - el diff de los 3 archivos;
   - los números de línea **nuevos**, en r3 y r4, de las pruebas de la tabla "Rojos previstos" y de la línea `waitFor(() => expect(control).toBeDisabled())` de `emularCorreccionDelFocoDeChromium`, y los de las `toBeEnabled` de "Tareas de la ronda 1" (el auxiliar desplaza líneas);
   - la **tabla de hashes vigente (SHA-256) de las 32 `*.ataque`**, con rutas desde la raíz: 29 sin cambios respecto de la tabla de AUTH-02 y 3 modificadas (r2, r3 y r4). Esa tabla es la base de V-01 para el programador.

El programador no empieza sin esa sección, con las 4 fallas de T-14 confirmadas en la aserción final y con la tabla de 32 hashes.

**Tareas de la ronda 1 del tester (01a):**
- Retira las 4 `it.fails` de forma definitiva.
- Adapta la preparación de las pruebas que dependían de `disabled`. `emularCorreccionDelFocoDeChromium` pasa a comprobar F-1 (`aria-disabled="true"`, sin `disabled`, el foco puesto). El camino "foco en `<body>`" se sigue cubriendo con `clicEnZonaNoEnfocable`.
- Refuerza las `toBeEnabled()` que pierden sentido con `aria-disabled` (N-01): hoy `cuentas-r1:337`, `cuentas-r1:354`, `cuentas-r3:393` y `cuentas-r4:359` (las de r3 y r4, en las líneas que publique la ronda 0), con `not.toHaveAttribute("aria-disabled")`.
- No debilita ninguna aserción final ni localiza nada por clases de estilo (`tester.md`). Justifica cada cambio en su reporte y publica los hashes de las 32 `*.ataque` y de las que agregue.

### D-9 · Foco
- Regla global en `index.css`, `@layer base`: `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`.
- `primary` y `destructive`: `focus-visible:-outline-offset-4` y `focus-visible:outline-primary-foreground` o `focus-visible:outline-destructive-foreground` (S-07).
- Se retiran `outline-none`, `ring-*`, `focus:*` y `focus-visible:ring-*` de todos los componentes. La única excepción es `DialogContent`, que recibe el foco por programa y no es un control (V-05).

---

## Cambios por capa

### shared/
Sin cambios.

### backend/core/, backend/adapters/, backend/handlers/, backend/workers/
Sin cambios.

### backend/prisma/
Sin cambios. Sin migración.

### infra/ y .env.example
Sin cambios. Ninguna variable de entorno nueva.

### Dependencias (respuesta 5; E-1 y E-2)
| Paquete | Rango | Qué se importa |
|---|---|---|
| `@fontsource/bricolage-grotesque` | `^5.3.0` | `latin-500.css`, `latin-700.css` |
| `@fontsource/atkinson-hyperlegible-next` | `^5.3.0` | `latin-400.css`, `latin-500.css`, `latin-700.css` |
| `@fontsource/atkinson-hyperlegible-mono` | `^5.3.0` | `latin-500.css` |

- Seis CSS de Fontsource. Cada uno suele declarar el mismo peso en `.woff2` y en `.woff`: en `dist/assets/` aparecerán 6 `.woff2` y, probablemente, hasta 6 `.woff`. Los `.woff` son esperables (N-05).
- Sin paquetes variables (`@fontsource-variable/*`) y sin `latin-ext` (S-13).
- **Instalación, desde la raíz:** antes, `npm view <paquete> version` para cada uno. **Detente** si alguno no existe o si su versión mayor no es 5. Después:
  ```
  npm install @fontsource/bricolage-grotesque@^5.3.0 @fontsource/atkinson-hyperlegible-next@^5.3.0 @fontsource/atkinson-hyperlegible-mono@^5.3.0 -w frontend
  ```
  Comprueba que existen los seis `latin-<peso>.css` de la tabla en `node_modules/@fontsource/<familia>/`. Si falta alguno, **detente**.
- **Nombre de la familia:** tómalo literal del `font-family` de cada `latin-<peso>.css` instalado. Previsto: "Bricolage Grotesque", "Atkinson Hyperlegible Next" y "Atkinson Hyperlegible Mono".

### frontend/vitest.config.ts (E-3)
Sustituye `css: false,` por:
```ts
      // Solo tokens.css?raw pasa sin vaciarse, para su prueba (DESIGN-01a, M-01). El resto del CSS sigue vacío.
      css: { include: [/[\\/]src[\\/]styles[\\/]tokens\.css\?raw$/] },
```

### frontend/src/styles/
**`tokens.css`** (reescrito, §D-1). Valores literales de `DESIGN.md`; hexadecimal en mayúsculas, como en el documento:
- **`:root`:**
  - Base: `--background` `#E9EEF3`, `--background-veil` `rgb(247 245 239 / 0.35)`, `--surface` `#FFFFFF`, `--foreground` `#16202E`, `--muted` `#EFECE3`, `--muted-foreground` `#3D4654`, `--border` `#DDD8CB`, `--input` `var(--foreground)`.
  - Acción y marca: `--primary` `#22409A`, `--primary-foreground` `#FFFFFF`, `--accent` `#22409A`, `--accent-foreground` `#FFFFFF`, `--accent-soft` `#E1E7F7`, `--accent-soft-glass` `#E8ECF8`, `--link` `#1B3480`, `--brand` `#1D5B4B`, `--brand-foreground` `#FFFFFF`, `--brand-soft` `#E1EEE8`, `--ring` `var(--accent)`.
  - Estados: `--success` `#1D5B4B`, `--success-soft` `#E1EEE8`, `--warning` `#7A4F09`, `--warning-soft` `#F6EBD3`, `--danger` `#A3341F`, `--danger-soft` `#F7E4DE`, `--destructive` `#A3341F`, `--destructive-foreground` `#FFFFFF`.
  - Derivados: `--card` y `--popover` → `var(--surface)` (S-12); `--card-foreground` y `--popover-foreground` → `var(--foreground)`; `--secondary` → `var(--muted)`; `--secondary-foreground` → `var(--foreground)`.
  - Materiales: `--glass` `rgb(255 255 255 / 0.62)`, `--glass-strong` `rgb(255 255 255 / 0.78)`, `--glass-accent` `rgb(34 64 154 / 0.78)`, `--glass-border` `rgb(255 255 255 / 0.75)`, `--glass-highlight` `inset 0 1px 0 rgb(255 255 255 / 0.9)`, `--shadow-glass` `0 8px 32px rgb(22 32 46 / 0.08)`, los tres `--glass-*-filter` de §D-3, `--orb-blue` `var(--accent)`, `--orb-green` `var(--brand)`, `--orb-soft` `#9FB3E6`.
  - `--control-height: 2.75rem`.
  - Se elimina `--radius`: los radios son los de `DESIGN.md` §5.
- **Respaldo, contexto opaco y densidad:** §D-3 y §D-4.
- **`@theme`** (tras las anulaciones de §D-1):
  - `--font-sans: "Atkinson Hyperlegible Next", ui-sans-serif, system-ui, sans-serif`; `--font-heading: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif`; `--font-mono: "Atkinson Hyperlegible Mono", ui-monospace, monospace`.
  - `--font-weight-normal: 400`, `--font-weight-medium: 500`, `--font-weight-bold: 700`.
  - Escala de `DESIGN.md` §4, con `--text-<n>--line-height`, `--text-<n>--letter-spacing` y, solo en los títulos, `--text-<n>--font-weight`. **El signo menos es el guion ASCII (`-0.03em`), nunca `−` (U+2212)** (N-02):

    | Token | Tamaño | Interlineado | Interletraje | Peso |
    |---|---|---|---|---|
    | `--text-display` | 2.75rem | 1.05 | -0.03em | 700 |
    | `--text-h1` | 1.75rem | 1.15 | -0.02em | 700 |
    | `--text-h2` | 1.375rem | 1.2 | -0.015em | 700 |
    | `--text-h3` | 1.125rem | 1.3 | -0.01em | 500 |
    | `--text-body` | 1rem | 1.5 | 0 | — |
    | `--text-small` | 0.875rem | 1.45 | 0 | — |
    | `--text-caption` | 0.75rem | 1.35 | 0 | — |

  - Radios: `--radius-hero: 24px`, `--radius-panel: 22px`, `--radius-bar: 20px`, `--radius-card: 16px`, `--radius-row: 14px`, `--radius-date: 12px`, `--radius-pill: 999px`.
  - `--shadow-overlay: 0 8px 24px rgb(22 32 46 / 0.12)`.
- **`@theme inline`:** `--color-<token>: var(--<token>)` para cada color de `:root`: base, acción y marca, estados y derivados. No incluye materiales ni orbes.
- **Utilidades:** las tres de §D-3.
- Comentario de cabecera: los valores salen de `docs/DESIGN.md`; ya no dice "provisionales".

**`index.css`:** conserva `@import "tailwindcss"`, `@import "tw-animate-css"` e `@import "./tokens.css"`. En `@layer base`:
- `* { @apply border-border; }`
- `html { @apply bg-background font-sans text-body text-foreground; }`
- `h1, h2, h3 { @apply font-heading; }` (el peso y el interletraje los da cada token `--text-*`)
- `code, kbd { @apply font-mono; }`
- `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`
- Se eliminan la regla actual con `ring-*`, el `font-size`, el `line-height` y el `letter-spacing` sueltos.

**`tokens.test.ts`** (nuevo, del programador). `import tokens from "./tokens.css?raw"`. Funciones auxiliares escritas en el propio archivo de prueba.
1. El texto no está vacío y contiene `--background` (condición de parada de §D-2).
2. No contiene `−` (U+2212).
3. Cada valor de `:root` de la lista de arriba, con los `var()` resueltos dentro de `:root`.
4. El bloque `@supports not (…backdrop-filter…)` redefine `--glass` y `--glass-strong` a `var(--surface)` y `--glass-accent` a `var(--accent)`.
5. `[data-material="opaco"]` redefine las siete variables de §D-3; el `@media (width >= 48rem)` de `[data-densidad="densa"]` fija `--control-height: 2.25rem`.
6. `@theme` contiene las diez anulaciones `…-*: initial` y la escala, los radios, las familias, los pesos y `--shadow-overlay` exactamente como en las tablas de arriba.
7. Las tres utilidades existen y contienen `backdrop-filter` y `-webkit-backdrop-filter`; cada `--glass-*-filter` contiene `saturate(170%)`.
8. **Contraste calculado**, con el método de `DESIGN.md` §3:
   - **WCAG 2.2:** canal sRGB `c`; lineal = `c / 12.92` si `c ≤ 0.04045`, si no `((c + 0.055) / 1.055) ^ 2.4`; luminancia `0.2126 R + 0.7152 G + 0.0722 B`; razón `(L1 + 0.05) / (L2 + 0.05)`.
   - **Componer** un color con alfa `a` sobre otro: `a · arriba + (1 − a) · abajo`, canal por canal, en sRGB (como pinta el navegador).
   - **Saturación 1.7** (Filter Effects, `feColorMatrix type="saturate"`), `s = 1.7`:
     - `R' = (0.213 + 0.787 s) R + (0.715 − 0.715 s) G + (0.072 − 0.072 s) B`
     - `G' = (0.213 − 0.213 s) R + (0.715 + 0.285 s) G + (0.072 − 0.072 s) B`
     - `B' = (0.213 − 0.213 s) R + (0.715 − 0.715 s) G + (0.072 + 0.928 s) B`
     - Resultado recortado a [0, 1]. Tres variantes: aplicada en sRGB, aplicada en lineal (se linealiza, se aplica, se vuelve a sRGB) y sin aplicar.
   - **Fondo de partida:** cada uno de `--background`, `--orb-blue`, `--orb-green` y `--orb-soft`, con `--background-veil` compuesto encima.
   - **Superficies:**
     - vidrio: fondo → saturar → componer `--glass`;
     - vidrio fuerte: fondo → saturar → componer `--glass-strong`;
     - vidrio azul: fondo → saturar → componer `--glass-accent`;
     - tarjeta interna: vidrio azul → saturar → componer `--glass-strong` (la misma variante de saturación en los dos pasos).
   - **Peor caso:** el mínimo sobre los cuatro fondos y las tres variantes.
   - **Pares y umbrales:**
     - Sólidos, todos los de la tabla "Sobre superficies sólidas" de `DESIGN.md` §3, ≥ 4.5. Además, ≥ 3: `--input` contra `--surface` y `--background`; `--ring` contra `--surface` y `--background`.
     - Vidrio: `--foreground`, `--muted-foreground`, `--link`, `--warning` y `--success` ≥ 4.5; `--input`, `--ring` y `--danger` (solo como icono) ≥ 3.
     - Vidrio fuerte y tarjeta interna: `--foreground`, `--muted-foreground`, `--link`, `--warning`, `--success` y `--danger` ≥ 4.5; `--input` y `--ring` ≥ 3.
     - Vidrio azul: `#FFFFFF` (`--accent-foreground`) y `--accent-soft-glass` ≥ 4.5.
   - Cada aserción lleva en su mensaje el par, la superficie y la razón calculada.
   - **Si un par no llega a su umbral, el programador se detiene y lo reporta. No cambia ningún valor de token.** Sería un error de `DESIGN.md`, y lo decide el humano.
   - El resumen del programador incluye la razón calculada de cada par sobre vidrio junto a la de `DESIGN.md` §3. Una diferencia de más de 0.1 se reporta, pero no detiene.

### frontend/src/main.tsx
Antes de `import "./styles/index.css"`, seis importaciones: `@fontsource/bricolage-grotesque/latin-500.css`, `…/latin-700.css`, `@fontsource/atkinson-hyperlegible-next/latin-400.css`, `…/latin-500.css`, `…/latin-700.css` y `@fontsource/atkinson-hyperlegible-mono/latin-500.css`. Van aquí, y no dentro de `index.css`, para que Vite resuelva las `url()` relativas de cada `@font-face`. Nada más cambia.

### frontend/src/lib/
- **`utils.ts`:** `cn` usa `extendTailwindMerge({ extend: { theme: { text: ["display", "h1", "h2", "h3", "body", "small", "caption"], radius: ["hero", "panel", "bar", "card", "row", "date", "pill"], shadow: ["overlay"] } } })`.
- **`utils.test.ts`** (nuevo):
  - `cn("text-small", "text-destructive")` conserva las dos;
  - `cn("text-h3", "text-body")` → `"text-body"`;
  - `cn("rounded-panel", "rounded-row")` → `"rounded-row"`;
  - `cn("shadow-overlay", "text-foreground")` conserva las dos.

### frontend/src/components/ui/
- **`button-variants.ts`:**
  - **Base:** `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill text-small whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`. Sin peso de letra en la base, para que ninguna variante tenga que pisarlo (`buttonVariants` sobre `<Link>` no pasa por `cn`). Sin `outline-none`, `ring-*` ni `aria-invalid:*`.
  - **Variantes:**
    - `primary`: `bg-primary font-bold text-primary-foreground hover:bg-primary/90 focus-visible:-outline-offset-4 focus-visible:outline-primary-foreground`
    - `outline`: `vidrio-fuerte font-bold text-foreground hover:bg-surface in-data-[material=opaco]:border-2 in-data-[material=opaco]:border-input in-data-[material=opaco]:hover:bg-muted`
    - `destructive`: `bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90 focus-visible:-outline-offset-4 focus-visible:outline-destructive-foreground`
    - `ghost`: `border border-transparent font-bold text-foreground hover:vidrio-fuerte in-data-[material=opaco]:hover:bg-muted`
    - `link`: `font-medium text-link underline-offset-4 hover:underline`
  - **Tamaños:** `default`: `h-(--control-height) px-5`; `sm`: `h-9 px-3`; `icon`: `size-(--control-height)`; `icon-sm`: `size-9`; `enlace`: `min-h-11 w-fit px-0` (S-10).
  - Se retiran `secondary`, `xs`, `lg`, `icon-xs` e `icon-lg` (S-11). La variante por defecto sigue siendo `outline`.
- **`button.tsx`:** propiedad `enEspera` según §D-5.
  - Tipo: `ComponentProps<"button"> & VariantProps<typeof buttonVariants> & ({ asChild?: false; enEspera?: boolean } | { asChild: true; enEspera?: never })`.
  - Con `enEspera`, pinta `aria-disabled="true"`, `aria-busy="true"` y `data-en-espera=""`; sin él, ninguno de los tres atributos (nada de `"false"`).
  - El `onClick` envuelto hace `preventDefault()` y sale si `enEspera`; si no, llama al original.
  - El `LoaderCircle` va antes de `children`. Sin `any`.
- **`button.test.tsx`** (nuevo):
  - con `enEspera`: `aria-disabled` y `aria-busy` en `"true"`, `not.toBeDisabled()`, el mismo nombre accesible y un `svg[aria-hidden="true"]`;
  - sin `enEspera`: ninguno de los tres atributos;
  - `onClick` no se llama con `enEspera`;
  - en un `form` con `onSubmit` espía: sin `enEspera`, `fireEvent.click` en el botón de envío llama a `onSubmit` una vez (prueba que jsdom envía); con `enEspera`, 0 llamadas;
  - el foco se conserva al pasar a `enEspera` con `rerender`;
  - una línea `// @ts-expect-error` con `asChild` y `enEspera` juntos (la comprueba `tsc -b`);
  - `variant="outline"` lleva la clase `vidrio-fuerte`; `variant="primary"`, `-outline-offset-4`.
- **`input.tsx`:** `h-(--control-height) w-full min-w-0 rounded-row border-2 border-input bg-surface px-3 text-body text-foreground transition-colors duration-150 selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-small file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive`. Se retiran `bg-transparent` (del campo), `shadow-xs`, `py-1`, `text-base md:text-sm`, `outline-none` y los `ring`.
- **`card.tsx`:** `Card`: `flex flex-col gap-6 rounded-panel vidrio py-6 text-foreground`. `CardTitle`: `font-heading text-h3`. `CardDescription`: `text-small text-muted-foreground`. El resto sin cambios.
- **`dialog.tsx`** (sin consumidores hoy; capa flotante opaca, §7.11):
  - overlay: `fixed inset-0 z-50 bg-foreground/40`, sin animaciones;
  - contenido: `fixed inset-0 z-50 m-auto grid h-fit w-full max-w-[calc(100%-2rem)] gap-4 rounded-panel border border-border bg-surface p-6 text-foreground shadow-overlay outline-none sm:max-w-lg`, sin `animate-*`, `fade-*`, `zoom-*` ni `duration-200`;
  - botón de cerrar: `absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-pill text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground [&_svg]:size-4`. Se quitan `opacity-*`, `ring-*`, `focus:*`, `rounded-xs` y `data-[state=open]:bg-accent`;
  - `DialogTitle`: `font-heading text-h2`; `DialogDescription`: `text-small text-muted-foreground`.
- **`label.tsx`** (nuevo, sin Radix): `function Label({ className, ...props }: ComponentProps<"label">)` con `cn("text-small font-bold text-foreground", className)`.
- **`sonner.tsx`** (nuevo): exporta `Toaster` sobre el de `sonner`:
  - `position="top-right"`;
  - `icons` de éxito (`CircleCheck`, `size-4 text-success`, `aria-hidden`) y de error (`CircleAlert`, `size-4 text-destructive`, `aria-hidden`);
  - `style` tipado como `CSSProperties` con `--normal-bg: var(--surface)`, `--normal-text: var(--foreground)` y `--normal-border: var(--border)`;
  - `toastOptions={{ classNames: { toast: "font-sans rounded-row! shadow-overlay!" } }}` (R-07).
  - **Solo lo importa `app/providers.tsx`.** Cuatro archivos de ataque simulan `sonner` sin `Toaster` (`vi.mock("sonner", () => ({ toast: aviso }))`): si otro componente lo importara, esas pruebas fallarían al montar.

### frontend/src/components/
- **`cargando.tsx`:** el icono pasa a `size-4 animate-spin motion-reduce:animate-none` (S-06). El resto igual.
- **`mensaje-error.tsx`:** contenedor `flex items-start gap-3 rounded-row border border-destructive bg-surface p-4 text-foreground`; título `font-bold text-destructive`; mensaje `text-small`. La misma estructura y el mismo `role="alert"`.
- **`error-de-campo.tsx`** (nuevo): §D-7.
- **`error-de-campo.test.tsx`** (nuevo): pinta el `id` y el texto; lleva un `svg[aria-hidden="true"]`; `getByText` encuentra un solo elemento.

### frontend/src/components/layout/
- **`contenedor-rol.tsx`:**
  - Raíz: `data-material` y `data-densidad` solo para `admin` (constante `CONTEXTO_POR_ROL`, como `ESPACIADO_POR_ROL`), además del `data-rol` que ya tiene.
  - "Cerrar sesión": `enEspera={cerrando}` en lugar de `disabled` y `aria-busy`; tamaño `default` en lugar de `sm` (44 px para estudiante y maestro, `DESIGN.md` §6; 36 px en admin desde 768 px).
  - Clases: `font-heading font-semibold tracking-tight` → `font-heading text-h3 font-bold`; `text-sm leading-tight` → `text-small leading-tight`.
  - La estructura (una sola `nav`, un solo "Cerrar sesión", nombre y rol en su propio `span`) no cambia: el marco es de 01b.
- **`contenedor-rol.test.tsx`** (nuevo, con `MemoryRouter`):
  - con `rol="admin"`, la raíz tiene `data-material="opaco"` y `data-densidad="densa"`; con `estudiante` y `maestro`, ninguno de los dos;
  - con `cerrando`, "Cerrar sesión" tiene `aria-disabled="true"`, no está deshabilitado y conserva el foco;
  - un solo botón "Cerrar sesión" y una sola `navigation` "Navegación principal".

### frontend/src/app/
- **`providers.tsx`:** importa `Toaster` de `@/components/ui/sonner` y lo pinta sin propiedades (`position` y colores los fija el componente).
- Nada más cambia en `app/`.

### frontend/src/features/auth/
- **Formularios** (`formulario-login`, `-registro`, `-recuperar`, `-nueva-contrasena` y `-cambiar-contrasena`):
  - `<label className="text-sm font-medium">` → `<Label>` con el mismo `htmlFor`;
  - errores de campo → `ErrorDeCampo`, con el mismo `id`;
  - ayudas `text-sm text-muted-foreground` → `text-small text-muted-foreground`;
  - los 6 enlaces sueltos → `<Link className={buttonVariants({ variant: "link", size: "enlace" })}>`;
  - `disabled={x.isPending} aria-busy={x.isPending}` → `enEspera={x.isPending}`, también en "Cerrar sesión" de `formulario-cambiar-contrasena`;
  - las guardas `if (x.isPending) return` se quedan;
  - el contenedor de los enlaces del login y de recuperar pierde `text-sm` (el tamaño lo da el enlace) y conserva `text-small` en la nota de administración.
- **`login-view.tsx` y `registro-view.tsx`:** `h1` → `text-h1` (sin `font-heading font-bold tracking-tight`, que dan la base y el token). El aviso `role="status"` → `text-small text-success`. La rejilla no cambia.
- **`panel-anuncios.tsx`:** `h2` → `text-h3 lg:text-h2`; `CardTitle` → `text-body lg:text-h3`; texto → `text-small lg:text-body`. Estructura igual.
- **`tarjeta-de-cuenta.tsx`:** `h1` → `text-h1`.
- **`acceso-restringido-view.tsx`:** `h1` → `text-h1`; `enEspera` en "Cerrar sesión". Los iconos conservan `text-danger`: son iconos, no texto, y sobre vidrio dan 4.3 ≥ 3. El cambio de icono y la composición son de 01b.
- **`bienvenida-view.tsx`:** `h1` → `text-h1`, con el texto exacto `"Hola, {nombre}"`.
- **`login-view.test.tsx`:** "deshabilita el botón durante el envío y un doble clic hace una sola petición" pasa a "marca el botón en espera durante el envío…": `toHaveAttribute("aria-disabled", "true")`, `not.toBeDisabled()`, el foco se conserva, un clic y un `submit` más siguen dejando `fetch` en 1 llamada, y al responder `aria-disabled` desaparece. Es la única prueba normal existente que depende de `disabled`.

### frontend/src/features/admin/
- **Los cuatro componentes y `cuentas-view.tsx`:**
  - `Label`, `ErrorDeCampo` y `enEspera` en "Buscar", "Enviar invitación", "Guardar correo", "Sí, restablecer" y "Copiar";
  - los `h2` pasan de `font-heading text-lg font-semibold tracking-tight` a `text-h3`; el `h1`, a `text-h1`;
  - `text-sm` → `text-small`;
  - los formularios hechos a mano: `rounded-lg` → `rounded-panel`;
  - los `aria-label` de los formularios ("Enviar invitación", "Buscar", "Guardar correo") no cambian: los usa el auxiliar `fichaDe` de las pruebas de ataque (§D-8);
  - `ContrasenaTemporal`: contenedor `rounded-row border border-border bg-muted p-3`, con el mismo `role="status"`; temporal en `text-h3 font-bold tracking-normal`.
- **`ficha-de-cuenta.tsx`:** §D-6.
- **`lib.ts`:** `focoDisponiblePara(contenedor: Element | null, activo: Element | null, cuerpo: Element): boolean`, que devuelve `activo === null || activo === cuerpo || (contenedor !== null && contenedor.contains(activo))`.
- **`lib.test.ts`:** los cuatro casos: nulo, `<body>`, dentro y fuera.
- **`cuentas-view.test.tsx`**, dos pruebas nuevas:
  - con la petición en vuelo, "Sí, restablecer" tiene `aria-disabled="true"`, no está deshabilitado y conserva el foco (F-1);
  - "Cancelar" en vuelo, clic fuera (`blur()`), foco en "Nombre completo" y llega la temporal: el foco sigue en "Nombre completo" (escenario 4 de T-14).

### frontend/src/features/diagnostico/
`diagnostico-view.tsx`: `h1` → `text-h1`; la línea "Última respuesta" → `text-small text-muted-foreground tabular-nums` (§4).

### Inventario de clases que la anulación deja sin efecto, y su sustituto
Sale de leer todos los archivos de `frontend/src` fuera de las pruebas en `6868e4d`. Rutas relativas a `frontend/src`.

| Clase actual | Dónde | Sustituto |
|---|---|---|
| `text-sm` | etiquetas, errores, ayudas, enlaces, avisos y descripciones en `features/auth/components/*`, `features/admin/components/*`, `cuentas-view`, `login-view`, `diagnostico-view`, `contenedor-rol`, `mensaje-error`, `card`, `dialog`, `button-variants`, `input` (`file:`) | `text-small` |
| `text-base`, `md:text-sm`, `lg:text-base` | `input`, `panel-anuncios` | `text-body` (sin `md:text-sm`) |
| `text-lg`, `lg:text-lg` | `panel-anuncios`, `dialog`, `buscador-de-cuenta`, `formulario-invitar-maestro`, `contrasena-temporal` | Según las secciones de arriba (`text-h2` o `text-h3`) |
| `text-xl` | `diagnostico-view` | `text-h1` |
| `text-2xl`, `lg:text-2xl` | los `h1` de `login-view`, `registro-view`, `tarjeta-de-cuenta`, `acceso-restringido-view`, `bienvenida-view` y `cuentas-view`; `panel-anuncios` (`h2`) | `text-h1`; en el panel, `lg:text-h2` |
| `text-xs` | tamaño `xs` del botón | Se retira (S-11) |
| `font-semibold` | `contenedor-rol`, `CardTitle`, `DialogTitle`, `mensaje-error`, `panel-anuncios`, los `h2` de admin, `contrasena-temporal` | `font-bold`, o nada si el token del título ya lleva peso |
| `tracking-tight` | todos los `h1` y `h2`, `contenedor-rol` | Se elimina: el interletraje va en `--text-*` |
| `leading-none` | `CardTitle`, `DialogTitle` | Se elimina |
| `shadow-sm`, `shadow-xs`, `shadow-lg` | `card`, `input`, `dialog` | Se eliminan; el diálogo, `shadow-overlay` |
| `rounded-md` | `button-variants`, `input`, `contrasena-temporal` | `rounded-pill` (botón), `rounded-row` (campo y temporal) |
| `rounded-lg` | `mensaje-error`, `dialog`, formularios de admin, `ficha-de-cuenta` | `rounded-row` (error), `rounded-panel` (diálogo, formularios y ficha) |
| `rounded-xl` | `card` | `rounded-panel` |
| `rounded-xs` | cerrar del diálogo | `rounded-pill` |
| `ring-*`, `ring-offset-*`, `focus-visible:ring-*`, `focus:ring-*`, `aria-invalid:ring-*`, `focus-visible:border-ring` | `button-variants`, `input`, `dialog`, `index.css` | Se eliminan; regla global de §D-9 |
| `outline-none`, `focus:outline-hidden` | `button-variants`, `input`, cerrar del diálogo, `index.css` | Se eliminan (salvo `DialogContent`) |
| `bg-foreground/50` | overlay del diálogo | `bg-foreground/40` |
| `data-[state=open]:bg-accent`, `data-[state=open]:text-muted-foreground`, `opacity-70`, `hover:opacity-100`, `transition-opacity` | cerrar del diálogo | `text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150` |
| `transition-all`, `transition-[color,box-shadow]`, `duration-200`, `animate-in`/`animate-out`, `fade-*`, `zoom-*` | `button-variants`, `input`, `dialog` | `transition-colors duration-150`; sin animaciones (§6) |
| `bg-transparent` (campo) | `input` | `bg-surface` |
| `border border-input` (campo); `border border-border bg-surface` (botón `outline`) | `input`, `button-variants` | `border-2 border-input`; `vidrio-fuerte` |
| `bg-card`, `text-card-foreground` | `card`, `dialog` | `vidrio text-foreground`; `bg-surface text-foreground` |
| `h-9`, `h-8`, `h-10`, `h-6`, `size-9`… (alturas de control) | `button-variants`, `input` | `h-(--control-height)`, o `h-9` en `sm` |
| `has-[>svg]:px-*` | tamaños del botón | Se eliminan |
| `text-accent underline-offset-4 hover:underline` | 6 enlaces de `features/auth/components/*` | `buttonVariants({ variant: "link", size: "enlace" })` |
| `animate-spin` | `cargando` | `animate-spin motion-reduce:animate-none` |
| `hover:bg-secondary/80`, `bg-secondary` | variante `secondary` | Se retira (S-11) |

Se conservan: `font-medium` (500 existe), `font-bold`, `leading-tight`, `tabular-nums`, `text-muted-foreground`, `text-success`, `text-warning`, `text-danger` (iconos), `bg-muted`, `bg-surface`, `border-border`, `bg-background` y los valores arbitrarios de rejilla (`lg:grid-cols-[…]`). Colores de la paleta por defecto (`slate-`, `gray-`, `neutral-`…), `bg-white`, `text-black` o `dark:`: **ninguno** hoy, y V-02 lo mantiene en cero.

### docs/DESIGN.md (01a; lo edita el programador, E-5)
Todo valor o patrón nuevo va marcado como **propuesta**. Al aprobarlo el humano en la comprobación, la marca pasa a "propuesta aprobada (fecha)"; no se borra (§11).
- **Tabla de cabecera, "Estado de aplicación":** "DESIGN-01a (fecha de cierre): tokens, materiales con su respaldo sólido, fuentes, `components/ui/` y botón en espera. Pendiente en DESIGN-01b: fondo con orbes, movimiento, marco y composición de las pantallas."
- **§3, "Tokens":**
  - derivados: `--card` y `--popover` → `--surface` (S-12), con la razón;
  - tokens nuevos de implementación: `--glass-filter`, `--glass-strong-filter` y `--glass-accent-filter` (valores de "Materiales"), y `--control-height` (§8);
  - "Contraste verificado": fila "`--destructive` / `--danger-soft` (error de un campo): 5.5"; fila "Anillo de foco interior `#FFFFFF` sobre `--primary` · `--destructive`: 9.2 · 6.8"; en la tabla sobre vidrio, fila "`--danger` como icono (no texto, 3:1): 4.3 · 5.3 · 4.7"; y una nota de que `tokens.test.ts` recalcula cada par con este método.
- **§3, "Materiales":** implementación: utilidades `vidrio`, `vidrio-fuerte` y `vidrio-azul` de `tokens.css`; respaldo con `@supports not`; contexto opaco `data-material="opaco"`; `backdrop-blur-*` anulado.
- **§4, "Reglas de carga":** importaciones en `main.tsx`, subconjunto `latin` y seis CSS; los `.woff` junto a los `.woff2`.
- **§6:** sustituye la viñeta "Botones con una petición en vuelo…" por el patrón de §D-5 (`enEspera`, la regla de `disabled` y las tres defensas). Agrega el anillo interior de los botones rellenos (S-07). En "Tamaño de los objetivos": en las pantallas densas, 36 px desde 768 px y 44 px por debajo (humano, 2026-09-27; el corte de 768 px, propuesta).
- **§7.2:** cómo se aplica cada material (utilidades y contexto opaco).
- **§7.3:** `hover` (S-08); tamaños con `--control-height`; tamaño `enlace` (S-10); `Label`; el error de un campo con `ErrorDeCampo` sobre `--danger-soft`, que sustituye a "Cuál de las tres opciones se usa lo decide el encargo…" (S-05); en "Los botones miden 44 px…", la regla del admin de §6.
- **§7.11:** `Toaster` en `components/ui/sonner.tsx`, con radio `--radius-row` y `--shadow-overlay`.
- **§8:** el mecanismo de densidad y de material (`data-densidad`, `data-material`, `--control-height`) y el corte de 768 px; en la fila del administrador, "controles de 36 px" pasa a "controles de 36 px (44 px por debajo de 768 px)". **No toca** "texto de 14 px (16 px en campos de texto)" ni el párrafo sobre Safari en iOS: ya los escribió el orquestador por decisión del humano.
- **§10:** "Clases de las escalas por defecto de Tailwind (`text-sm`, `font-semibold`, `shadow-md`, `rounded-lg`, `backdrop-blur-*`…): están anuladas y no generan CSS."

**Propuestas aprobadas el 2026-09-27 que 01a aplica** (la marca "propuesta aprobada (2026-09-27)" se conserva): `--text-h1`; `saturate(170%)` del vidrio fuerte y del vidrio azul; borde de 1 px, brillo del filo y sombra del vidrio; `--shadow-overlay`; radios de campos, menús y avisos (14 px) y de diálogos (22 px); velo de los diálogos al 40 %; capas flotantes opacas; `outline` en pantallas densas; administrador sin vidrio. Las demás (orbes, barra inferior, barras opacas, márgenes a 360 px, tarjetas sólidas, tablas, marcadores de carga, "Sin entregar", casillas) no tienen consumidor en 01a.

---

## Acceso a datos
Sin consultas nuevas ni llamadas nuevas a la API. Sin paginación, transacciones ni riesgo de N+1.

## Autorización
- Sin endpoints nuevos. La seguridad sigue en el middleware del backend.
- Las guardas del frontend (`RequireSesion`, `RequireRol` y `RequireCambioDeContrasena`) no se tocan.
- `data-material` y `data-densidad` son solo presentación: dependen del rol que `RequireRol` ya validó con `GET /me`, y no protegen nada.
- **Estado de pago:** ninguna pantalla tocada lo muestra ni lo recibe.
- **Acceso restringido:** la pantalla cambia de clases y del botón en espera, no de lógica. Sigue fuera de `RequireRol` y sin marco.
- **Doble envío (carril sensible):** el login, el registro, las pantallas de contraseña y "Sí, restablecer" pasan de `disabled` a `enEspera` con tres defensas (§D-5). Un segundo envío del login contaría dos intentos para el bloqueo; uno de "Sí, restablecer" generaría dos temporales. El tester lo ataca (punto 2).

---

## Pruebas requeridas

### Del programador
- `styles/tokens.test.ts`: valores, anulación, materiales, respaldo, contexto opaco, densidad, escala y contraste calculado.
- `lib/utils.test.ts`: `cn` con la escala propia.
- `components/ui/button.test.tsx`: `enEspera`, clic, envío, foco, tipo y variantes.
- `components/error-de-campo.test.tsx`.
- `components/layout/contenedor-rol.test.tsx`: contexto por rol y "Cerrar sesión" en espera.
- `features/admin/lib.test.ts`: `focoDisponiblePara`.
- `features/admin/cuentas-view.test.tsx`: dos pruebas nuevas (F-1 y escenario 4 de T-14).
- `features/auth/login-view.test.tsx`: la prueba adaptada.

### Pruebas existentes que dependen de `disabled` o de clases
| Prueba | Tipo | Dependencia | Responsable |
|---|---|---|---|
| `features/auth/login-view.test.tsx:139` | normal | `toBeDisabled()` y `toBeEnabled()` | Programador |
| `cuentas-r3.ataque:459` y `:483` | ataque | `emularCorreccionDelFocoDeChromium` exige `toBeDisabled()` | Tester, ronda 1 |
| `cuentas-r4.ataque:346`, `:376` y `:434`, y las 3 `it.fails` de las líneas 208, 232 y 256 | ataque | ídem | Tester, ronda 1 |
| `cuentas-r2.ataque:290`, `cuentas-r3.ataque:449` y `cuentas-r4.ataque:461` | ataque | `closest("div.rounded-lg")` | **Tester, ronda 0** (P-08 B; §D-8, paso 7). Ya no son rojos del programador |
| `cuentas-r3.ataque:123` y `cuentas-r4.ataque:127` (`controlesEnfocables`) | ataque | Filtra por `disabled`. Con `aria-disabled` el botón sigue en la lista, que es lo correcto | Nadie |
| `cuentas-r1.ataque:337` y `:354`, `cuentas-r3.ataque:393`, `cuentas-r4.ataque:359` (`toBeEnabled`) | ataque | Pasan siempre con `aria-disabled`: pierden sentido sin ponerse en rojo (N-01) | Tester, ronda 1 (refuerzo) |
| Doble envío: `router.ataque` ("Crear cuenta"), `app/cuentas-r1.ataque`, `enlace-r1.ataque`, `features/admin/cuentas-r1.ataque`, `cuentas-r2.ataque` ("…no manda una segunda") | ataque | Dependen de la guarda del manejador y de `enviandoRef`, que se conservan | Nadie: deben seguir en verde |

Los números de línea son los de `6868e4d`. En r2, r3 y r4, la ronda 0 los desplaza; los nuevos están en su reporte.

### Rojos previstos en la entrega del programador
La suite del frontend termina con **exactamente estos 6 rojos** y ningún otro: los que aceptó el humano (respuesta 8). Las pruebas se identifican por su nombre; las líneas de `6868e4d` van entre paréntesis y las vigentes son las que publique la ronda 0.

| # | Archivo | Prueba | Falla esperada |
|---|---|---|---|
| 1 | `cuentas-r3.ataque.test.tsx` | "en Chromium, 'Sí, restablecer' deshabilitado pierde el foco" › "el admin confirma y no se mueve…" (459) | En la preparación: `waitFor(() => expect(control).toBeDisabled())` de `emularCorreccionDelFocoDeChromium` (144) |
| 2 | `cuentas-r3.ataque.test.tsx` | ídem › "el admin confirma y el servidor responde 500…" (483) | Ídem |
| 3 | `cuentas-r4.ataque.test.tsx` | "…sí debe sostener" › "en Chromium: 500, el foco vuelve a 'Cancelar'…" (346) | Ídem, en r4 (144) |
| 4 | `cuentas-r4.ataque.test.tsx` | ídem › "en Chromium: tras la corrección, el admin vuelve a 'Cancelar'…" (376) | Ídem |
| 5 | `cuentas-r4.ataque.test.tsx` | "confirmandoAnteriorRef con <StrictMode>…" › "con <StrictMode> y en Chromium…" (434) | Ídem |
| 6 | `cuentas-r4.ataque.test.tsx` | "un clic en una zona no enfocable…" › `it.fails` "'Cancelar' con la petición en vuelo, clic fuera…" (284) | La prueba ya pasa, y `it.fails` la marca en rojo. **Es la señal de que T-14 quedó corregido** |

- Las 3 pruebas que localizan la ficha (r2 "la temporal ya visible sigue en la ficha de Carla…", r3 "tras la temporal de Carla (con el foco en 'Copiar')…" y r4 "con <StrictMode>: buscar a Beto con la confirmación abierta en Carla…") deben estar **en verde** en la entrega del programador. Si alguna falla, es trabajo suyo: rompió una invariante de §D-6 o la conducta que vigilan.
- Las otras 3 `it.fails` de T-14 (208, 232 y 256) seguirán como "fallo esperado", pero por la razón equivocada: fallan en la preparación. No cuentan como rojos del programador. El programador lo declara; lo resuelve el tester en la ronda 1.
- **Condiciones (manager, `revision-direccion-c.md`, "Desacuerdos arbitrados", con la precisión de `revision.md`):**
  1. el programador no toca ningún `*.ataque`, registra V-01 al empezar y al terminar, y declara la suite en rojo con los nombres, el archivo y la línea de cada falla, sin llamarla verde;
  2. si aparece cualquier otro rojo, o uno de estos falla por otra causa o en otra línea (la línea de preparación publicada por la ronda 0 en los 5 primeros; en el 6.º, que la prueba pase), el programador **se detiene** y lo reporta. **Nunca** vuelve a poner `disabled` para satisfacer una prueba;
  3. en la ronda 1, el tester adapta solo la preparación (N-01 incluido), no debilita ninguna aserción final y publica los hashes de las 32 más las nuevas;
  4. en la revisión final, el manager compara línea por línea el diff de `cuentas-r2`, `cuentas-r3` y `cuentas-r4` contra `6868e4d` (ronda 0 y ronda 1).

### Verificaciones (sin navegador)
Todas desde `frontend/`, salvo que se diga otra cosa. Las búsquedas excluyen `*.test.*` salvo que se diga otra cosa.
- **V-01 (hashes; M-02 de `revision.md`):** **desde la raíz**, `sha256sum -c` sobre las 32 rutas de la tabla de hashes de la ronda 0 de DESIGN-01a (11 en `frontend/` y 21 en `backend/`; 29 iguales a la tabla de AUTH-02 y 3 modificadas en la ronda 0) → 32/32 OK, al empezar y al terminar el programador.
- **V-02 (paleta por defecto; el grep de V-07 de FRONT-01 corregido):** `\b(bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|accent|caret|divide|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b` y `\bdark:` en `src/` → 0.
- **V-03 (escalas anuladas):** `\btext-(xs|sm|base|lg|xl|[2-9]xl)\b`, `\bfont-(thin|extralight|light|semibold|extrabold|black)\b`, `\bshadow-(2xs|xs|sm|md|lg|xl|2xl)\b`, `\brounded-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b`, `\brounded(["'\s]|$)` (el `rounded` sin sufijo), `\btracking-(tighter|tight)\b`, `\bleading-none\b` y `\bbackdrop-(blur|saturate)` en `src/` → 0. Además, `rounded` en `src/**/*.ataque.test.*` → 0 (lo dejó así la ronda 0).
- **V-04 (valores sueltos):** `#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(` en `src/**/*.{ts,tsx}` y en `styles/index.css` → 0 (solo `tokens.css` y `tokens.test.ts`, que se excluye). `\b(text|rounded|shadow|leading|tracking|font|bg|border|outline)-\[` → 0.
- **V-05 (foco):** `outline-none|outline-hidden` → exactamente 1 aparición, en `dialog.tsx` (`DialogContent`). `\bring-` y `\bfocus:` → 0.
- **V-06 (`disabled`; N-03):** `\bdisabled\b` en `src/**/*.tsx`: cada aparición debe ser el prefijo de variante `disabled:` dentro de una cadena de clases. Cuenta las dos búsquedas (`\bdisabled\b` y `\bdisabled:`) y deben coincidir. `aria-busy` y `aria-disabled` → solo en `components/ui/button.tsx`. `enEspera=` → exactamente 13 apariciones, en los archivos de los 13 botones.
- **V-07 (materiales):** `\bvidrio([^-\w]|$)` (el `vidrio` sin sufijo; `\bvidrio\b` también encontraría `vidrio-fuerte`) solo en `components/ui/card.tsx`; `vidrio-fuerte` solo en `components/ui/button-variants.ts`; `vidrio-azul` → 0 fuera de `tokens.css`; `data-material` y `data-densidad` solo en `components/layout/contenedor-rol.tsx`.
- **V-08 ("No se toca", la lista entera; M-04 de `revision.md`).** Desde la raíz, con dos bases. Ninguna depende de `HEAD`.
  - **Base `6868e4d`: rutas de `frontend/` y `package-lock.json`.** Por cada ruta de `frontend/` de "No se toca", `git diff --quiet 6868e4d -- <ruta>` con código 0 y `git status --porcelain -- <ruta>` vacío. Excepciones:
    - `git diff 6868e4d -- frontend/package.json` solo agrega las tres líneas de E-1;
    - `git diff 6868e4d -- package-lock.json` solo toca entradas de `@fontsource/*` y de la sección de `frontend` (E-2);
    - `git diff 6868e4d -- frontend/vitest.config.ts` es exactamente el de E-3 (2 líneas agregadas, 1 quitada);
    - los `*.ataque.test.*` no se comparan con `6868e4d`, sino con la tabla de hashes de la ronda 0 (V-01).
  - **Base `<A>`: todo lo que está fuera de `frontend/`.** `<A>` es el hash del commit en que el humano aprueba el plan, que el orquestador anota en `aprobacion.md`. Ese commit ya incluye los cambios del orquestador en `.claude/agents/tester.md` y en `docs/DESIGN.md`, y los documentos de la carpeta de DESIGN-01. Por cada ruta, `git diff --quiet <A> -- <ruta>` con código 0 y `git status --porcelain -- <ruta>` vacío:
    - `backend/`, `shared/`, `infra/`, `.claude/`, `.codex/`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/PRD.md`, `docs/design/` y los archivos de la raíz de "No se toca" (`package.json`, `eslint.config.mjs`, `.prettierignore`, `tsconfig.base.json`, `.gitattributes`, `.gitignore`, `.nvmrc`);
    - `docs/trabajo/` sin la carpeta de DESIGN-01: `git diff --quiet <A> -- docs/trabajo ':(exclude)docs/trabajo/DESIGN-01-sistema-de-diseno'` y `git status --porcelain -- docs/trabajo ':(exclude)docs/trabajo/DESIGN-01-sistema-de-diseno'`;
    - dentro de la carpeta de DESIGN-01, solo `plan.md`, `plan-direccion-c.md` y `revision-direccion-c.md`, uno por uno;
    - excepción E-5: `git diff <A> -- docs/DESIGN.md` solo toca las secciones de "docs/DESIGN.md (01a)".
  - **Fuera de V-08:** `docs/ESTADO.md`, `aprobacion.md` y `comprobacion-humano.md`, que el orquestador actualiza durante el encargo, y los entregables de los agentes (`resumen-programador.md`, `reporte-tester.md`, `revision.md`). Los revisa el manager en la revisión final.
  - **Condiciones de parada:** si `aprobacion.md` no tiene el hash `<A>`, o `git cat-file -e '<A>^{commit}'` falla (con comillas simples, para que funcione igual en PowerShell 5.1 y en Git Bash), **detente**. Si durante el encargo cambia con autorización un archivo fuera de `frontend/` distinto de los tres de arriba, el orquestador le pide al humano que haga ese commit y anota el hash nuevo en `aprobacion.md`. Mientras no exista, V-08 marcará ese archivo: el agente se detiene y pregunta, sin darlo por bueno. V-08 usa siempre el último hash anotado.
  - El resumen pega la salida de cada comando.
- **V-09 (fuentes en `dist/`, tras `npm run build`):** exactamente 6 `.woff2` en `dist/assets/`, todos con `latin` en el nombre y ninguno con `latin-ext`; `.woff`, entre 0 y 6, con las mismas reglas; `fonts.googleapis` y `fonts.gstatic` en `dist/` → 0.
- **V-10 (CSS de `dist/`):** `--color-(red|blue|gray|slate|neutral|zinc|stone|amber|green|white|black)` → 0. Aparecen, o su forma minificada: `.text-small`, `.rounded-panel`, `.rounded-pill`, `.shadow-overlay`, `.vidrio`, `.vidrio-fuerte`, `backdrop-filter`, `-webkit-backdrop-filter`, `@supports not`, `data-material=opaco` (en el selector del contexto y en el de la variante del botón `outline`), `data-densidad=densa`, `outline-offset:2px`, `--glass:`, `--control-height:` y `"Atkinson Hyperlegible Next"`. Si falta el selector de la variante `in-data-[material=opaco]`, se usa el equivalente arbitrario (§D-3) y se repite V-10; si tampoco aparece, **detente**.
- **V-11:** `npm run lint` desde la raíz (solo comprueba), `npm run test` y `npm run build` desde `frontend/`. Test: los 6 rojos previstos y ningún otro, en la entrega del programador; todo en verde, en la del tester y en la del manager. La suite del backend no es obligatoria: `backend/` no cambia (V-08). Si alguien la corre, aplica la precondición de red de `AGENTS.md`.
- **V-12 (tamaños de texto):** ningún `text-*` de tamaño fuera de la escala propia en `src/` (V-03 lo cubre) y ninguna clase `text-caption` sobre texto de más de dos palabras en mayúsculas (hoy no hay ninguna).
- **V-13 (rojo sobre vidrio):** `\btext-(destructive|danger)([^-\w]|$)` en `src/**/*.tsx`: solo en `error-de-campo.tsx` (sobre `--danger-soft`), `mensaje-error.tsx` (sobre `--surface`), `components/ui/sonner.tsx` (icono sobre `--surface`) y los dos iconos de `acceso-restringido-view.tsx` (iconos, 3:1). Cualquier otra aparición se justifica o se corrige.

### Comprobación del humano en su navegador (DESIGN-01a)
Nadie más la hace (S-01). Con Vite, la API y el worker en local ("Frontend en local" del README). Chrome o Edge. Cada pantalla, a 1280 × 800 y a 360 × 800 (modo de dispositivo de DevTools). El orquestador transcribe el resultado en `docs/trabajo/DESIGN-01-sistema-de-diseno/comprobacion-humano.md`, sección "DESIGN-01a".

Cuentas: el estudiante y el admin de `campus_dev`. Para `/maestro`, invita un maestro desde `/admin` (el enlace queda en `backend/tmp/correos/`); si no quieres, omítela: es la misma vista que `/estudiante`. `/acceso-restringido` necesita un estudiante restringido, y todavía no hay pantalla para restringir. Si no tienes uno, se reporta **no verificada** (la cubren las pruebas de jsdom); no se altera la base a mano.

- **H-01, fuentes:** Network › Font: solo `.woff2` del propio origen, nada de `fonts.googleapis`. Elements › Computed › "Rendered Fonts": Atkinson Hyperlegible Next en el texto y Bricolage Grotesque en los títulos. En `/diagnostico`, activa y desactiva `font-variant-numeric: tabular-nums` en "Última respuesta": las cifras ocupan el mismo ancho (`tnum`). Lectura cómoda a 16 px y a 360 px.
- **H-02, materiales y controles:** en login, registro, recuperar (y su confirmación), restablecer (sin token, enlace inválido; con un enlace real), establecer contraseña y `/cambiar-contrasena`: paneles de vidrio translúcido con borde blanco y brillo en el filo sobre el fondo plano; botones en píldora; campos blancos con borde tinta de 2 px; títulos. El fondo todavía no tiene orbes: es lo esperado en 01a.
- **H-03, admin opaco y denso:** en `/admin`, ningún panel ni botón translúcido (Computed › `backdrop-filter`: `none`); a 1280 px, botones y campos de 36 px (Computed › `height`); a 767 px y a 360 px, de 44 px; a 768 px, de 36 px. El texto de los campos, a 16 px.
- **H-04, foco:** recorre cada pantalla con Tab. Contorno de 2 px azul, separado del control; en los botones azules y rojos, contorno blanco por dentro (S-07: confirma o corrige).
- **H-05, botón en espera (MF-05):** con DevTools › Network › limitación lenta, pulsa "Iniciar sesión": el foco se queda en el botón y aparece el indicador. Otro clic, Enter sobre el botón, **Espacio** sobre el botón o Enter desde el campo de contraseña **no** mandan una segunda petición a `/api/auth/login` (Network). Repite con "Crear cuenta" en el registro y con "Sí, restablecer" en `/admin`.
- **H-06, T-14 en Chrome o Edge:** con la red lenta, "Restablecer contraseña" y luego "Sí, restablecer" con el ratón; clic en "Nombre completo" y escribe algo; al llegar la temporal, el foco se queda en tu campo. Repite con un clic en el texto de la página antes de ir al campo.
- **H-07, aviso de "Copiar":** fondo blanco, borde, esquinas de 14 px, sombra suave e icono verde. Para ver el de error, bloquea el portapapeles del sitio (icono del candado de la barra de direcciones › Configuración del sitio › Portapapeles › Bloquear) y vuelve a copiar: icono rojo.
- **H-08, movimiento reducido:** DevTools › Rendering › "Emulate CSS media feature prefers-reduced-motion: reduce", con la red lenta: el indicador de carga del botón y el de `Cargando` dejan de girar y el texto se queda.
- **H-09, contraste medido en navegador (regla de D3).** Para cada par de la tabla:
  1. Zoom del navegador al 100 %. Elements: selecciona el elemento del texto.
  2. En Styles, haz clic en la muestra de color de su propiedad `color`. En el selector, despliega "Contrast ratio".
  3. Si DevTools no puede determinar el fondo (pasa con el vidrio), usa el gotero del fondo ("Pick background color") y haz clic en un pixel del fondo pegado al texto, no sobre las letras.
  4. Anota la razón que muestra DevTools, el color del texto y el del fondo (hexadecimal). Cierra con Esc sin guardar cambios.
  5. Para los pares de borde o de foco (no texto), o si tu versión de DevTools no ofrece el gotero del fondo: con el gotero, lee el hexadecimal del borde o del anillo y el del pixel de al lado, sin guardar cambios, y díctaselos al orquestador. La razón la calcula él con la fórmula de `tokens.test.ts`.

  | Id | Pantalla | Elemento | Umbral |
  |---|---|---|---|
  | C-01 | `/login` | "¿No te llega el correo? Acude a administración." (`--muted-foreground` sobre vidrio) | 4.5 |
  | C-02 | `/login` | "¿Olvidaste tu contraseña?" (`--link` sobre vidrio) | 4.5 |
  | C-03 | `/login` | Etiqueta "Correo" (`--foreground` sobre vidrio) | 4.5 |
  | C-04 | `/login` | Error de campo al enviar vacío (`--destructive` sobre `--danger-soft`) | 4.5 |
  | C-05 | `/login` | Título de `MensajeError` con credenciales incorrectas (`--destructive` sobre `--surface`) | 4.5 |
  | C-06 | `/login` | Texto de "Iniciar sesión" (blanco sobre `--primary`) | 4.5 |
  | C-07 | `/login` | Borde del campo contra el panel de vidrio | 3 |
  | C-08 | `/login` | Anillo de foco de un campo contra el panel | 3 |
  | C-09 | `/cambiar-contrasena` | Texto de "Cerrar sesión" (`--foreground` sobre vidrio fuerte) | 4.5 |
  | C-10 | `/registro` | Ayuda de la contraseña (`--muted-foreground` sobre vidrio) | 4.5 |
  | C-11 | `/admin` | "Invitación enviada…" (`--success` sobre `--surface`) | 4.5 |
  | C-12 | `/admin` | Aviso de "Copiar" (`--foreground` sobre `--surface`) | 4.5 |

  Registro: una fila por par, con Id, razón medida, hexadecimal del texto, hexadecimal del fondo, umbral y "pasa" o "no pasa". Un "no pasa" se escala al humano antes del commit. Los pares sobre los orbes se miden en 01b.
- **H-10, parecido general:** compara las pantallas con `docs/design/referencia-direccion-d3.png` en materiales, tipografía, botones y campos. La composición y el fondo son de 01b.

Si una comprobación no se puede hacer, se registra como **no verificada**, con el motivo.

---

## Puntos de ataque para el Tester
1. **Ronda 0** (§D-8), incluidos los selectores de la ficha sin clases de estilo.
2. **`enEspera` en los 13 botones:** doble clic en el mismo instante y separado por una tarea; `fireEvent.submit` y `form.requestSubmit()` en vuelo; Enter y Espacio emulados; que el nombre accesible no cambie; que el foco se conserve y que el botón siga en el orden de tabulación; que `aria-disabled` y `aria-busy` desaparezcan al asentarse, con éxito y con error; "Cerrar sesión" en el marco, en `/cambiar-contrasena` y en `/acceso-restringido`; "Copiar" con `writeText` lento. En especial el login (un segundo envío contaría dos intentos) y "Sí, restablecer" (dos temporales).
3. **T-14 y el contrato F-1 a F-4:** los 4 escenarios; moverse con Tab fuera y volver antes de la respuesta; cambio de ventana, con `activeElement` conservado; `<StrictMode>`; cancelar en vuelo con éxito y con error; buscar otra cuenta en vuelo (la temporal perdida es un pendiente conocido de ADMIN, no un hallazgo, salvo que haya empeorado); un `500` seguido de un reintento.
4. **Regresión:** las 32 `*.ataque` (V-01) y las de doble envío, en especial.
5. **Anulación y materiales:** V-02 a V-07, V-10 y V-13 por tu cuenta. Busca clases por defecto que se hayan colado, colores o tamaños sueltos, `backdrop-blur-*` o fondos blancos translúcidos fuera de las utilidades, y texto rojo sobre vidrio al 62 %.
6. **Contexto opaco y densidad:** todo lo que pinta `/admin` cuelga de `data-material="opaco"` y `data-densidad="densa"`; ninguna otra ruta los tiene; el botón `outline` en contexto opaco lleva las clases del borde de 2 px (y V-10 comprueba que generan CSS).
7. **`cn` y `tailwind-merge`:** combinaciones de `text-small`, `text-h1`, `rounded-panel` y `shadow-overlay` con colores y con el `className` de quien llama.
8. **Tokens y contraste:** valores contra `DESIGN.md` §3 a §5; pares no listados que aparezcan en el código (por ejemplo, `text-muted-foreground` sobre `bg-muted` en la temporal: 8.0); el `@supports not`; el signo menos ASCII.
9. **`Toaster` y la simulación de `sonner`:** que ningún componente fuera de `app/providers.tsx` importe `components/ui/sonner`.
10. **Fuentes en `dist/`** (V-09).
11. **Invariantes de DOM** (R-08), sin localizar nada por clases de estilo (`tester.md`, "Reglas de combate").

---

## Riesgos y desacuerdos
- **R-01 · Contradicción PRD–DESIGN (pregunta no bloqueante, para CLASES).** PRD §7, "Patrones a conservar", pide una "barra lateral con lista de clases". `DESIGN.md` §7.4 define una barra compacta de iconos de 96 px, donde no cabe una lista. Aquí no afecta, porque no hay clases, pero hay que resolverlo antes de planear CLASES. ¿La lista de clases va en la barra (y entonces la barra deja de ser compacta en ese contexto) o en el dashboard y el menú de clases? (Referencia de `docs/ESTADO.md` §3.)
- **R-02 · Tailwind ignora sin error las clases desconocidas.** Mitigado con el inventario, V-02 a V-05, V-10 y la prueba de tokens.
- **R-03 · `tailwind-merge` y la escala propia.** Sin `extendTailwindMerge`, `cn` borraría tamaños y radios. Mitigado con `utils.ts` y su prueba.
- **R-04 · Variante `in-data-[…]`.** El manager comprobó que Tailwind 4.3.3 la genera. Si no apareciera, se usa el selector arbitrario (§D-3). V-10 lo detecta.
- **R-05 · Comportamiento real del foco.** jsdom no reproduce la corrección del foco de Chromium, ni Safari (que no enfoca los botones con el clic), ni Firefox. F-2 no depende de eventos `blur`, así que debería ser robusto. Queda sin verificar en un navegador real hasta H-05 y H-06.
- **R-06 · Rojos previstos entre el programador y la ronda 1 del tester.** Riesgo de que el programador "arregle" el código para satisfacer `toBeDisabled()`. Prohibido de forma explícita; V-06 lo detecta.
- **R-07 · Estilos de `sonner`.** Se inyectan en tiempo de ejecución; el radio y la sombra se imponen con `!important`. Solo se ve en H-07.
- **R-08 · Pruebas de ataque acopladas al DOM.** El programador conserva: un solo botón "Cerrar sesión" por pantalla; una sola `nav`; el `h1` "Hola, {nombre}"; el rol como texto exacto en su propio elemento; en el login, un solo `heading` "CMEP Campus Digital" (lo busca `enlace-r1.ataque:483` con `getByRole`, que falla con dos), las etiquetas "Correo" y "Contraseña" únicas y ningún `role="status"` sin aviso; en la ficha, las invariantes de §D-6 (raíz como ancestro común más cercano del nombre y del formulario "Guardar correo", sin el formulario "Buscar"; el primer `div` ancestro del nombre conteniendo el correo; el icono junto a "Cuenta inactiva") y la temporal dentro de `role="status"`; los `aria-label` de los formularios de admin; el motivo de la restricción como nodo de texto directo; el nombre accesible de los botones sin cambios en vuelo.
- **R-09 · `tw-animate-css` queda sin uso.** Desinstalarlo es un cambio de dependencias: pendiente para un `chore` con aprobación.
- **R-10 · Tokens que faltan para pantallas futuras:** radio de 6 px de las casillas (`DESIGN.md` §5) y `--text-display` a 32 px por debajo de 640 px (§4). No hay consumidores; los resuelve el primer encargo que los necesite.
- **R-11 · El par con menos margen.** `--warning` sobre vidrio da 4.52 en el peor caso (saturación en lineal; lo confirmó el manager: 4.520). Si la implementación del cálculo difiere en un detalle, `tokens.test.ts` puede dar menos de 4.5 y detener al programador. Es la conducta correcta: lo decide el humano. Lo mismo vale para `--accent-soft-glass` sobre vidrio azul (4.59).
- **R-12 · Estado intermedio entre 01a y 01b.** `main` queda entre los dos PR con vidrio sobre un fondo plano y la composición de siempre. Es coherente y legible (no hay orbes), pero no es la imagen final. El humano lo sabe antes de H-02.
- **R-13 · AUTH-03** cambiará el formulario del cambio obligatorio (sin la temporal). Aquí se reestiliza igual; el retrabajo es mínimo.
- **R-14 · Interpretación de `DESIGN.md` §6 en el foco de los botones rellenos** (S-07). Aceptada por el humano; si en H-04 prefiere el contorno azul por fuera, basta con quitar dos clases por variante.
- **R-15 · El auxiliar `fichaDe` depende de la estructura** (ancestro común del nombre y del formulario "Guardar correo"). Si una pantalla futura mete el formulario fuera de la ficha, o envuelve la ficha y el buscador juntos, la guarda del auxiliar falla con un mensaje claro en lugar de pasar en falso. La salida duradera es darle a la ficha un rol y un nombre accesible (por ejemplo, `role="group"` con `aria-labelledby` al nombre), un cambio de producción que queda para ADMIN.

Sin desacuerdos con `ARCHITECTURE-ESSENTIALS.md`.

---

## Pasos de implementación (DESIGN-01a)

**Reglas para todos los pasos y todos los agentes:**
- **Formateadores:** solo `npx prettier --write <rutas concretas>`, desde `frontend/`, sobre los archivos que tocaste. Nunca `npm run format` (formatearía también las `*.ataque`), nunca desde la raíz y nunca `--write`, `--fix` o `-i` fuera de `frontend/`. `docs/DESIGN.md` se edita a mano, sin formateador.
- **Sin navegadores ni `npm run dev`:** no hacen falta. Git, solo de lectura. No leas ningún `.env`.
- **Procesos:** ningún paso arranca procesos de larga vida. Si alguno quedara en marcha, no termines un proceso que no arrancaste.
- **Salidas largas:** redirígelas a un archivo del scratchpad, sin tubería.
- **Condiciones de parada:** si una se cumple, te detienes y la reportas, aunque la alternativa parezca obvia.

**Antes del programador**
0. **Tester, ronda 0** (§D-8): confirmación de T-14 y selectores de la ficha. El programador no empieza sin la sección "DESIGN-01a — Ronda 0 (confirmación de T-14 y selectores de la ficha)" en `reporte-tester.md`, con la tabla de 32 hashes.

**Programador**
1. **Precondiciones** (no dependen de `HEAD`), desde la raíz:
   - `git diff --name-only 6868e4d -- frontend/` lista exactamente `frontend/src/features/admin/cuentas-r2.ataque.test.tsx`, `…/cuentas-r3.ataque.test.tsx` y `…/cuentas-r4.ataque.test.tsx` (los de la ronda 0), y nada más;
   - `git status --porcelain --untracked-files=all -- frontend/` no muestra archivos sin rastrear (`??`) y, como mucho, esos 3 archivos como modificados;
   - V-01: 32/32;
   - `aprobacion.md` contiene el hash `<A>` del commit de aprobación del plan y `git cat-file -e '<A>^{commit}'` (con comillas simples) sale con código 0 (base de V-08 fuera de `frontend/`), y V-08 sale limpia antes de tocar nada.

   Si algo falla, **detente**.
2. **Dependencias** (E-1, E-2): `npm view` y `npm install` desde la raíz, según "Dependencias". Comprueba los seis `latin-<peso>.css` y anota el nombre de cada familia. Si falta algo, **detente**.
3. **Configuración de la prueba** (E-3): el cambio exacto en `frontend/vitest.config.ts`.
4. **Tokens:** `styles/tokens.css` y `styles/tokens.test.ts`. `npm run test -- src/styles/tokens.test.ts`. Si la primera aserción falla, **detente** (§D-2). Si un par de contraste no llega a su umbral, **detente** (no cambies valores).
5. **Estilos base y fuentes:** `styles/index.css` y las seis importaciones en `main.tsx`.
6. **`cn`:** `lib/utils.ts` y `lib/utils.test.ts`.
7. **`components/ui/`:** `button-variants.ts`, `button.tsx`, `button.test.tsx`, `input.tsx`, `card.tsx`, `dialog.tsx`, `label.tsx` y `sonner.tsx`; `app/providers.tsx`.
8. **Piezas compartidas:** `cargando.tsx`, `mensaje-error.tsx`, `error-de-campo.tsx` y `error-de-campo.test.tsx`.
9. **Contenedor:** `components/layout/contenedor-rol.tsx` y `contenedor-rol.test.tsx`.
10. **Botones en espera:** migra los 12 botones restantes a `enEspera` (el 13.º es el del contenedor) y retira `disabled` y `aria-busy`; conserva las guardas. Aplica `Label`, `ErrorDeCampo` y los enlaces con `buttonVariants`.
11. **T-14:** `features/admin/lib.ts` (`focoDisponiblePara`) y `lib.test.ts`; `ficha-de-cuenta.tsx` según §D-6 (con sus invariantes de estructura); las dos pruebas nuevas de `cuentas-view.test.tsx`.
12. **Migración de clases:** aplica el inventario en todos los archivos restantes. Adapta `login-view.test.tsx`.
13. **`docs/DESIGN.md`:** las partes de 01a, marcadas como **propuesta**.
14. **Verificación y resumen:** V-01 a V-13. Escribe `resumen-programador.md`, sección "DESIGN-01a", con: la salida de cada V; los 6 rojos previstos con el archivo y la línea de cada falla; la confirmación de que las 3 pruebas de la ficha están en verde; la nota sobre las 3 `it.fails` que fallan en la preparación; la tabla de contraste calculado frente a `DESIGN.md` §3; los archivos tocados.

**Después**
15. **Tester, rondas 1 a 3 de 01a** (máximo 3; la ronda 0 no cuenta). Tareas de §D-8 y puntos de ataque. Veredicto en `reporte-tester.md`, sección "DESIGN-01a — Ronda N".
16. **Manager, revisión final de 01a:** `revision.md`, sección "DESIGN-01a — final", con la comparación línea por línea de `cuentas-r2`, `-r3` y `-r4` contra `6868e4d`, la verificación de que los patrones nuevos están en `DESIGN.md` y la revisión de lo que V-08 deja fuera: `docs/ESTADO.md`, `aprobacion.md` y `comprobacion-humano.md` (que solo cambiaron por mano del orquestador y dicen lo que se decidió).
17. **Comprobación del humano** (H-01 a H-10), transcrita por el orquestador.
18. **Cierre de 01a** (ver abajo).

---

## Cierre de cada subentrega (M-04 de la dirección C)

| Aspecto | DESIGN-01a | DESIGN-01b |
|---|---|---|
| Carril | Sensible: aprobación escrita del plan (`aprobacion.md`, con el hash `<A>` del commit de aprobación, base de V-08 fuera de `frontend/`) y revisión humana del diff antes del commit | Normal, con la condición de detención del resumen de 01b |
| Plan | Este `plan.md` | `plan-01b.md` detallado, que escribe el arquitecto después de fusionar 01a; lo revisa el manager y lo aprueba el humano |
| Rama | `feat/design-01-sistema-de-diseno` | `feat/design-01b-fondo-y-marco`, desde `main` tras fusionar 01a |
| Tester | Ronda 0 (T-14 y selectores de la ficha; no cuenta en el tope) y rondas 1 a 3 (máximo 3; a la tercera se escala) | Rondas 1 a 3, contadas aparte |
| Secciones de `reporte-tester.md` | "DESIGN-01a — Ronda 0 (confirmación de T-14 y selectores de la ficha)", "DESIGN-01a — Ronda N" | "DESIGN-01b — Ronda N" |
| Secciones de `revision.md` | "DESIGN-01a — plan", "DESIGN-01a — final" | "DESIGN-01b — plan", "DESIGN-01b — final" |
| Sección de `resumen-programador.md` | "DESIGN-01a" | "DESIGN-01b" |
| Comprobación del humano | H-01 a H-10 de este plan | Las de 01b (resumen abajo) |
| `comprobacion-humano.md` | Sección "DESIGN-01a" | Sección "DESIGN-01b" |

### Cierre de 01a
1. **`docs/DESIGN.md`** (programador, carril trivial, antes del commit): cada valor nuevo que el humano aprobó en la comprobación pasa de "propuesta" a "propuesta aprobada (fecha)"; lo que rechace se corrige o se queda como propuesta. El párrafo de §4 "Nadie las ha visto en pantalla todavía" se sustituye por el resultado de H-01. La fecha de cierre se escribe en "Estado de aplicación".
2. **`CLAUDE.md`** (orquestador, con autorización del humano). Texto literal:
   - **"Componentes"**, viñeta nueva después de "Botón de acción principal…":
     > Un botón cuya petición está en vuelo usa `enEspera` de `Button` (`aria-disabled`, `aria-busy` e indicador de carga), nunca `disabled`: conserva el foco y no dispara su acción. `disabled` queda para un control que no está disponible.
   - **"Tokens"**, dos viñetas nuevas:
     > La paleta y las escalas por defecto de Tailwind (colores, tamaños de letra, pesos, radios, sombras y desenfoques) están anuladas en `tokens.css`. Una clase como `text-sm`, `rounded-lg` o `shadow-md` no genera CSS y se pierde sin error: usa `text-small`, `rounded-panel`, `shadow-overlay`. `cn` conoce la escala propia (`lib/utils.ts`).

     > El vidrio se aplica solo con las utilidades `vidrio`, `vidrio-fuerte` y `vidrio-azul` de `tokens.css`, que traen su respaldo sólido sin `backdrop-filter`; nunca con `backdrop-blur-*` ni con fondos blancos translúcidos sueltos. Una pantalla densa marca su contenedor con `data-material="opaco"` (y `data-densidad="densa"` si sus controles miden 36 px): el vidrio pasa a `--surface` sin tocar los componentes.
   - **"Formularios"**, viñeta nueva:
     > El error de un campo usa `ErrorDeCampo` (`components/error-de-campo.tsx`, fondo `--danger-soft`), nunca texto rojo suelto: el rojo no llega a AA sobre vidrio al 62 %.
   - **"Ubicaciones compartidas"**: en `components/ui/`, "…reestilizados, incluidos `label.tsx` y `sonner.tsx` (`Toaster` con el tema; solo lo importa `app/providers.tsx`)"; en `components/`, agregar `ErrorDeCampo` (`error-de-campo.tsx`) a la lista de piezas que ya existen.
3. **`docs/ESTADO.md`** (orquestador):
   - §1: DESIGN-01a como completado, con su PR y la suite final.
   - §2: DESIGN-01 sigue en curso; siguiente paso, `plan-01b.md`.
   - §3: se retiran las filas de MF-05 y de T-14 (cerradas). La fila "Dirección visual D3" queda solo con lo de 01b (fondo con orbes y su alcance, movimiento y `prefers-reduced-motion` de los orbes, marco, composición y contraste medido sobre los orbes). `paths` y `cn` de shadcn (D-02 y D-03) pasan al primer encargo que ejecute `shadcn add`. Filas nuevas: `tw-animate-css` sin uso (R-09), para un `chore`; radio de las casillas y `--text-display` en móvil (R-10), para el primer encargo que los use; foco blanco sobre superficies de color, para el encargo que construya el bloque destacado o las tarjetas de clase (S-07); rol y nombre accesible para la ficha de admin (R-15), para ADMIN; si `plan-01b.md` no se escribe enseguida, el riesgo de `backdrop-filter` como bloque contenedor de lo fijo (resumen de 01b). R-01 se conserva, con destino CLASES (sigue en este `plan.md`).
4. **`README.md`, línea 228** (orquestador): el conteo de archivos y pruebas del frontend, con los números de la revisión final del manager.
5. **`AGENTS.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md`:** sin cambios (la regla de selectores de `tester.md` ya la agregó el orquestador).

---

## DESIGN-01b · resumen (plan detallado en `plan-01b.md`, después de 01a)

P-07 (A) y P-09 (A), respondidas por el humano el 2026-09-27. Carril normal, con la condición de detención de abajo.

**Condición de detención (humano, P-07)**
- **01b no toca las redirecciones de `app/require-rol.tsx`.** En ese archivo, 01b solo puede cambiar las propiedades del `<ContenedorRol … />` final y sus importaciones. Cada rama `if` y cada `<Navigate … />` (error con cambio de contraseña pendiente, error sin sesión, carga, `accesoRestringido`, rol distinto) queda idéntica, byte por byte. Se verifica con `git diff` del archivo: solo líneas dentro del JSX de `ContenedorRol` y de las importaciones.
- **Si resulta necesario cambiar cualquiera de esas redirecciones, el agente se detiene y avisa al humano.** No lo resuelve por su cuenta, ni aunque la alternativa parezca obvia.
- Por prudencia, y como recomendó el manager, la misma condición se extiende a `app/require-sesion.tsx` y `app/require-cambio-de-contrasena.tsx` (no se tocan en 01b; sus indicadores de carga cambian de aspecto a través de `Cargando`, no editando las guardas) y a los `<Navigate>`, las rutas y el anidamiento de guardas de `app/router.tsx`. Si montar el fondo exige cambiar algo de eso, más allá de agregar un elemento de diseño que envuelva las rutas sin cambiar su orden, sus `path` ni sus guardas, el agente se detiene y avisa.
- **"No se toca" de 01b** (se detalla en `plan-01b.md`): las ramas de redirección de `app/require-rol.tsx`, `app/require-sesion.tsx`, `app/require-cambio-de-contrasena.tsx`, las rutas y guardas de `app/router.tsx`, `backend/`, `shared/`, `infra/`, los `data.ts` de `features/` y los `*.ataque` para el programador.

**Alcance**
- **`FondoAnimado`:** las capas de `DESIGN.md` §7.1 (`--background`, tres orbes, velo `--background-veil`), fijas, sin puntero (`pointer-events: none`) y con `aria-hidden`. Orbes de 620, 560 y 520 px, con ciclos de 22, 26 y 30 s, animados **solo con `transform`** (desplazamiento de hasta 60 px y escala entre 0.92 y 1.08, `ease-in-out`, ida y vuelta) y con `will-change: transform` solo en ellos. Se mueven solo en `/login`, `/estudiante` y `/maestro` (S-14); **quietos en todas las demás**, `/admin` incluida (P-09 A). Con `prefers-reduced-motion: reduce`, quietos en su posición de la captura.
- **Marco:** barra lateral de vidrio (96 px, monograma "cm", elementos de 72 × 60 px, activo en vidrio fuerte con `aria-current="page"`), que pasa a barra inferior fija de 64 px por debajo de 768 px; barra superior de vidrio (64 px) con "CMEP" y "Campus Digital" desde `components/layout/data.ts` (S-04), avatar con iniciales y "Cerrar sesión"; sin botón de avisos hasta `notificaciones`. En `/admin`, barras opacas y activo en `--accent-soft`. Destinos (respuesta 1): estudiante y maestro, "Inicio"; administrador, "Cuentas". El humano debe saber, antes de verlo, que la barra tendrá un solo destino por rol.
- **Composición:** todo texto sube a vidrio o a un sólido. Login y registro con el panel de anuncios como panel de vidrio, anuncios en filas de vidrio fuerte y lista desplazable con `tabIndex={0}` y `aria-labelledby` al `h2`. Pantallas de cuenta en panel de vidrio centrado con monograma. Acceso restringido con icono `Lock` e insignia. Bienvenida en un panel de vidrio, sin bloque destacado (no tiene un dato que poner en el titular). `/admin` sobre superficies opacas. Diagnóstico. Indicadores de carga: `Cargando` sobre un sólido o un vidrio propio, sin tocar las guardas.
- **`DESIGN.md`:** tabla de alcance de §7.1 con las rutas; §7.4 con lo implementado; patrones nuevos ("panel de anuncios del login", "pantallas de cuenta"); marcas de las propuestas aprobadas que se aplican (orbes, barra inferior, barras opacas, márgenes de 16 px a 360 px).

**Archivos previstos** (los confirma `plan-01b.md`): `components/layout/fondo-animado.tsx`, `barra-lateral.tsx`, `barra-superior.tsx`, `monograma.tsx`, `data.ts` (nuevo; ahí se mudan también `ESPACIADO_POR_ROL` y `CONTEXTO_POR_ROL`), `types.ts` (`Destino`), `contenedor-rol.tsx` y `layout-publico.tsx`; `components/avatar-usuario.tsx`; `components/cargando.tsx`; `lib/format.ts` (`inicialesDe`); `app/destinos.ts` (nuevo); `app/require-rol.tsx` (solo las propiedades de `ContenedorRol`, ver la condición); `app/router.tsx` solo si el fondo se monta en una ruta de diseño que envuelve a las demás, dentro de la condición; `styles/tokens.css` (diámetros, ciclos y `@keyframes`); las vistas de `features/auth`, `features/admin/cuentas-view.tsx` y `features/diagnostico/diagnostico-view.tsx`; `docs/DESIGN.md`. Ningún `data.ts` de `features/`.

**Depende de 01a:** los tokens y materiales (incluidos `--orb-*` y `--background-veil`), el respaldo sólido, el contexto opaco y la densidad, `Button` con `enEspera`, `Card` de vidrio, `ErrorDeCampo`, las fuentes y la prueba de tokens (que 01b extiende a los orbes).

**Riesgos**
- **`backdrop-filter` crea un bloque contenedor** (M-03 de `revision.md`). Según Filter Effects 2, y así lo hace Chromium, un elemento con `backdrop-filter` distinto de `none` se vuelve el bloque contenedor de sus descendientes `position: fixed`. `FondoAnimado` y la barra inferior fija no pueden quedar dentro de ninguna superficie de vidrio, o se pegarían al panel y no a la ventana. `plan-01b.md` dice dónde se montan y lo comprueba (prueba de estructura: ningún ancestro de esos elementos lleva una utilidad `vidrio*`; y comprobación del humano).
- **Rendimiento:** el `backdrop-filter` sobre un fondo que se mueve obliga a recalcular el desenfoque de cada panel en cada cuadro. Puede costar en equipos modestos. Mitigación: movimiento solo en tres rutas, solo `transform` y solo los orbes con `will-change`. El humano lo mide con DevTools › Performance.
- **Texto sobre los orbes:** si alguna pieza queda fuera de vidrio o sólido, el contraste depende de dónde pase un orbe. La comprobación recorre cada pantalla.
- **jsdom no aplica media queries ni animaciones:** las pruebas cubren estructura (una sola `nav`, `aria-hidden`, `aria-current`, rutas animadas) y el texto de `tokens.css` (solo `transform` en los `@keyframes`, `prefers-reduced-motion`).
- **Invariantes de DOM (R-08):** una sola `nav` que cambia de forma con clases responsivas (dos copias duplicarían enlaces), un solo "Cerrar sesión", ningún segundo `heading` "CMEP Campus Digital" en el login (el nombre de la barra superior no es un encabezado) y las invariantes de la ficha de §D-6, que usa el auxiliar `fichaDe`.
- **Área segura de iOS** en la barra inferior (`env(safe-area-inset-bottom)`): se revisa en la comprobación a 360 px.

**Comprobación del humano (01b)**
- Orbes en movimiento suave en `/login`, `/estudiante` y `/maestro`; quietos en las demás; quietos con "prefers-reduced-motion: reduce".
- DevTools › Performance: sin caídas de cuadros evidentes con los orbes en movimiento.
- **Contraste medido contra el peor caso:** con el movimiento reducido emulado, en Elements selecciona el orbe azul y, en `element.style`, agrega `translate: <x>px <y>px` hasta dejarlo detrás del texto que vas a medir; después, el procedimiento de H-09 para `--foreground`, `--muted-foreground`, `--link`, `--success`, **`--warning`** (el par con menos margen, 4.52, si alguna pantalla de 01b pone texto de aviso sobre vidrio), el texto de los botones de vidrio fuerte y las etiquetas de la barra lateral. Umbral 4.5 (3 en bordes y foco).
- Marco a 1280 y a 360 px: barra lateral, barra inferior fija a la ventana (no a un panel) y sin tapar contenido, ningún desplazamiento horizontal.
- Parecido con `docs/design/referencia-direccion-d3.png`.
