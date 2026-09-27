# Resumen del Programador

## DESIGN-01a

Pasos 1 a 14 de "Pasos de implementación (DESIGN-01a)" completados. No se llegó a un `BLOQUEADO`; hay **un hallazgo sin resolver en V-08** (ver abajo), que reporto sin darlo por bueno, tal como pide el plan.

### Paso 1 · Precondiciones

- `git diff --name-only 6868e4d -- frontend/` → exactamente `frontend/src/features/admin/cuentas-r2.ataque.test.tsx`, `…/cuentas-r3.ataque.test.tsx`, `…/cuentas-r4.ataque.test.tsx`. OK.
- `git status --porcelain --untracked-files=all -- frontend/` → sin `??`, solo esos 3 archivos modificados. OK.
- V-01 (32 hashes de la tabla de la ronda 0) → 32/32 OK, antes de tocar nada.
- `aprobacion.md` contiene `<A> = 5a32230`; `git cat-file -e '5a32230^{commit}'` → código 0.

### Paso 2 · Dependencias (E-1, E-2)

`npm view` confirmó los tres paquetes en `5.3.0`. Instalados con:
```
npm install @fontsource/bricolage-grotesque@^5.3.0 @fontsource/atkinson-hyperlegible-next@^5.3.0 @fontsource/atkinson-hyperlegible-mono@^5.3.0 -w frontend
```
Los seis `latin-<peso>.css` existen en `node_modules/@fontsource/<familia>/`. Nombres de familia confirmados en el CSS instalado, literales: **"Bricolage Grotesque"**, **"Atkinson Hyperlegible Next"**, **"Atkinson Hyperlegible Mono"** — coinciden con lo previsto en el plan.

### Paso 3 · `vitest.config.ts` (E-3)

Sustituida la línea `css: false,` exactamente por el comentario y la línea `css: { include: [...] }` del plan. Diff verificado: 2 líneas agregadas, 1 quitada, nada más.

### Paso 4 · Tokens

`styles/tokens.css` reescrito en los 6 bloques de D-1 (`:root`, `@supports not`, contexto opaco/densidad, `@theme` con anulaciones, `@theme inline`, utilidades). `styles/tokens.test.ts` nuevo con 128 aserciones (valores de `:root`, anulación, materiales, respaldo, contexto opaco, densidad, escala, contraste calculado). Primera aserción (texto no vacío, contiene `--background`) pasó: no fue necesario detenerse por D-2. **Ningún par de contraste quedó bajo su umbral**: no se detuvo el programador ni se cambió ningún valor de token.

### Paso 5 · Estilos base y fuentes

`styles/index.css` reescrito según D-1 (sin `ring-*`, con `:focus-visible` global). Seis importaciones de Fontsource agregadas en `main.tsx`, antes de `./styles/index.css`.

### Paso 6 · `cn`

`lib/utils.ts`: `cn` ahora usa `extendTailwindMerge` con la escala propia (`text`, `radius`, `shadow`). `lib/utils.test.ts` nuevo, 4 pruebas, todas en verde.

### Paso 7 · `components/ui/`

`button-variants.ts`, `button.tsx` (`enEspera` según D-5), `button.test.tsx` (8 pruebas), `input.tsx`, `card.tsx`, `dialog.tsx`, `label.tsx` (nuevo), `sonner.tsx` (nuevo). `app/providers.tsx` importa `Toaster` de `@/components/ui/sonner`.

### Paso 8 · Piezas compartidas

`cargando.tsx` (`motion-reduce:animate-none`), `mensaje-error.tsx` (clases migradas), `error-de-campo.tsx` (nuevo, según D-7) y `error-de-campo.test.tsx` (2 pruebas).

### Paso 9 · Contenedor

`components/layout/contenedor-rol.tsx`: `CONTEXTO_POR_ROL`, `data-material`/`data-densidad` solo para `admin`, "Cerrar sesión" con `enEspera`, tamaño `default`. `contenedor-rol.test.tsx` nuevo, 5 pruebas.

### Paso 10 · Botones en espera (13 en total)

Migrados a `enEspera` (se retiró `disabled`/`aria-busy` manual): `ContenedorRol` (Cerrar sesión), `AccesoRestringidoView` (Cerrar sesión), `FormularioLogin`, `FormularioRegistro`, `FormularioRecuperar`, `FormularioNuevaContrasena`, `FormularioCambiarContrasena` (2: Guardar y Cerrar sesión), `FormularioInvitarMaestro`, `BuscadorDeCuenta` (Buscar), `FormularioCorregirCorreo` (Guardar correo), `AccionRestablecer` (Sí, restablecer), `ContrasenaTemporal` (Copiar). `Label` y `ErrorDeCampo` aplicados en todos los formularios; los 6 enlaces sueltos usan `buttonVariants({ variant: "link", size: "enlace" })`.

### Paso 11 · T-14

`features/admin/lib.ts`: `focoDisponiblePara` agregada, con `lib.test.ts` (4 casos nuevos, más los 2 ya existentes de `mensajeDeErrorAdmin`). `ficha-de-cuenta.tsx` reescrito según D-6: raíz única (`raizRef`), `renderContenido()` con retornos tempranos, sin `tieneFocoRef`/`manejarFoco`/`manejarDesenfoque`/`onFocusCapture`/`onBlurCapture`; el foco se decide con `focoDisponiblePara(raizRef.current, document.activeElement, document.body)` en el propio `onSuccess`/`onError`. Dos pruebas nuevas en `cuentas-view.test.tsx` (F-1 y escenario 4 de T-14), ambas en verde.

**Nota de implementación (no es una desviación del plan, pero vale explicarla):** al escribir esas dos pruebas descubrí que `mutate()` de TanStack Query v5 no invoca el `mutationFn` de forma síncrona dentro del mismo `fireEvent.click`: `isPending` (y por tanto `aria-disabled`) se asienta un tick después. Las pruebas usan `waitFor` para esperar ese tick antes de leer el estado "en espera", igual que ya hacía la prueba de login que adapté. Sin ese `waitFor` las dos pruebas fallaban con `aria-disabled` ausente, no por un defecto de `enEspera`.

### Paso 12 · Migración de clases

Aplicado el inventario completo del plan en todos los archivos de `frontend/src` fuera de las pruebas (`login-view.tsx`, `registro-view.tsx`, `panel-anuncios.tsx`, `tarjeta-de-cuenta.tsx`, `acceso-restringido-view.tsx`, `bienvenida-view.tsx`, `cuentas-view.tsx`, `diagnostico-view.tsx`, y los archivos ya migrados en los pasos anteriores). Verificado con grep: 0 apariciones de `text-sm|text-base|...`, `font-semibold`, `shadow-*`, `rounded-md|lg|xl|...`, `rounded` suelto, `tracking-tight`, `leading-none`, `backdrop-blur|saturate` fuera de comentarios explicativos (ver V-03). `login-view.test.tsx` adaptado: la prueba de doble envío ahora comprueba `aria-disabled`, el foco y que `aria-disabled` desaparece al responder.

### Paso 13 · `docs/DESIGN.md`

Editado solo dentro de las secciones que el plan autoriza (E-5): tabla de cabecera ("Estado de aplicación"), §3 (derivados, tokens nuevos de implementación, filas nuevas de "Contraste verificado", nota sobre `tokens.test.ts`, implementación de "Materiales" y de "Superficies de vidrio"), §4 (implementación de fuentes), §6 (foco interior de botones rellenos, corte de 768 px, patrón `enEspera`), §7.3 (`Label`, `ErrorDeCampo`, `hover`, tamaño `enlace`), §7.11 (`Toaster`), §8 (fila del admin con el corte de 768 px, mecanismo `data-densidad`/`data-material`/`--control-height`) y §10 (clases anuladas de Tailwind). Todo marcado **(DESIGN-01a, propuesta)**. No toqué la fila del administrador ni el párrafo de Safari en iOS de §8 (ya escritos por el orquestador), ni el párrafo "Nadie las ha visto en pantalla todavía" de §4 (eso lo cierra el orquestador tras H-01).

### Paso 14 · Verificación

**Tokens de contraste, calculado vs. `DESIGN.md` §3** (peor caso; diferencia ≤ 0.1 en todos, no detiene):

| Texto | Vidrio (62 %) calc. / doc | Vidrio fuerte (78 %) calc. / doc | Tarjeta interna calc. / doc |
|---|---|---|---|
| `--foreground` | 10.42 / 10.4 | 12.72 / 12.7 | 11.28 / 11.2 |
| `--muted-foreground` | 6.05 / 6.0 | 7.39 / 7.3 | 6.56 / 6.5 |
| `--link` | 7.21 / 7.2 | 8.80 / 8.8 | 7.81 / 7.8 |
| `--warning` | 4.52 / 4.5 | 5.52 / 5.5 | 4.90 / 4.9 |
| `--success` | 5.03 / 5.0 | 6.14 / 6.1 | 5.45 / 5.4 |
| `--danger` | 4.35 / 4.3 (no pasa como texto; como icono, ≥3 OK) | 5.31 / 5.3 | 4.71 / 4.7 |
| `--input` (3:1) | 10.42 / 10.4 | 12.72 / 12.7 | 11.28 / 11.2 |
| `--ring` (3:1) | 5.88 / 5.8 | 7.18 / 7.1 | 6.37 / 6.3 |

| Vidrio azul (78 %) | Calc. | Doc |
|---|---|---|
| `#FFFFFF` | 5.42 | 5.4 |
| `--accent-soft-glass` | 4.59 | 4.5 |

Coincide con lo anticipado por R-11 del plan (`--warning` en 4.52, `--accent-soft-glass` en 4.59).

**V-01 (hashes):** 32/32 OK, al empezar y al terminar.

**V-02 (paleta por defecto):** 0 apariciones de colores por defecto de Tailwind y de `dark:` en `src/`.

**V-03 (escalas anuladas):** 0 usos reales; la única coincidencia es un comentario en `tokens.css` que menciona `text-sm`, `rounded-lg`, `shadow-md` como ejemplos de lo que queda anulado (no es una clase aplicada). `rounded` en `src/**/*.ataque.test.*` → 0.

**V-04 (valores sueltos):** 0 en `src/**/*.{ts,tsx}` (fuera de `tokens.css`/`tokens.test.ts`) y en `styles/index.css`. 0 valores arbitrarios `text-[…]`, `rounded-[…]`, etc.

**V-05 (foco):** `outline-none|outline-hidden` → exactamente 1, en `dialog.tsx` (`DialogContent`). `ring-`/`focus:` → 0. (Tuve que reformular un comentario de `button-variants.ts` que citaba literalmente "outline-none" y elevaba el conteo a 2; ya no lo menciona por su nombre.)

**V-06 (`disabled`):** ningún `disabled` crudo como prop de JSX. `\bdisabled\b` da 6 y `\bdisabled:` da 5; la diferencia es **`aria-disabled` en `button.tsx:44`**, que el propio regex `\bdisabled\b` también encuentra por el guion como límite de palabra (no es un `disabled:` de variante ni un `disabled` de control). `aria-busy`/`aria-disabled` → solo en `components/ui/button.tsx`, como exige el plan. `enEspera=` → exactamente 13 apariciones.

**V-07 (materiales):** `vidrio` sin sufijo → solo en `card.tsx` como clase real; también aparece la palabra "vidrio" en un comentario de prosa de `error-de-campo.tsx` (no es una clase). `vidrio-fuerte` → solo en `button-variants.ts`. `vidrio-azul` → 0 fuera de `tokens.css` (excluyendo pruebas, que la regla general de esta sección de verificaciones excluye). `data-material`/`data-densidad` → solo en `contenedor-rol.tsx`.

**V-08 — HALLAZGO SIN RESOLVER (ver sección propia abajo).**

**V-09 (fuentes en `dist/`):** exactamente 6 `.woff2` y 6 `.woff`, todos con `latin` en el nombre, ninguno con `latin-ext`. `fonts.googleapis`/`fonts.gstatic` → 0.

**V-10 (CSS de `dist/`):** 0 apariciones de `--color-(red|blue|gray|...)`. Presentes: `.text-small`, `.rounded-panel`, `.rounded-pill`, `.shadow-overlay`, `.vidrio`, `.vidrio-fuerte`, `backdrop-filter`, `-webkit-backdrop-filter`, `@supports not`, `data-material=opaco` (contexto **y** variante del botón `outline`), `data-densidad=densa`, `outline-offset:2px`, `--glass:`, `--control-height:`, `"Atkinson Hyperlegible Next"`. La variante `in-data-[material=opaco]` sí generó CSS (Tailwind 4.3.3): no hizo falta el equivalente arbitrario.

**V-11:** `npm run lint` desde la raíz (workspace `frontend`) → código 0 (ESLint, Prettier y `tsc -b`, los tres en verde). `npm run test` desde `frontend/` → **6 fallidas, 402 en verde, 3 fallo esperado (411 total, 30 archivos)**, exactamente los 6 rojos previstos. `npm run build` desde `frontend/` → código 0.

**V-12:** cubierto por V-03 (ningún `text-*` fuera de escala). No hay ninguna `text-caption` sobre texto de más de dos palabras en mayúsculas hoy.

**V-13 (rojo sobre vidrio):** `text-destructive`/`text-danger` aparece solo en las 5 ubicaciones que autoriza el plan: `error-de-campo.tsx` (sobre `--danger-soft`), `mensaje-error.tsx` (icono y título, sobre `--surface`), `components/ui/sonner.tsx` (icono, sobre `--surface`) y los dos iconos de `acceso-restringido-view.tsx` (3:1, iconos).

### Los 6 rojos previstos, con archivo y línea (vigentes, `HEAD` actual)

| # | Archivo | Prueba | Dónde falla |
|---|---|---|---|
| 1 | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | "…deshabilitado pierde el foco" › "el admin confirma y no se mueve: al llegar la temporal, el foco llega a 'Copiar'" | `emularCorreccionDelFocoDeChromium`, línea 144: `await waitFor(() => expect(control).toBeDisabled())` |
| 2 | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | ídem › "el admin confirma y el servidor responde 500: el foco no queda en `<body>`" | Ídem, línea 144 |
| 3 | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | "lo que el cambio de la ronda 4 sí debe sostener" › "en Chromium: 500, el foco vuelve a 'Cancelar'…" | `emularCorreccionDelFocoDeChromium`, línea 144 |
| 4 | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | ídem › "en Chromium: tras la corrección, el admin vuelve a 'Cancelar' con Tab…" | Ídem, línea 144 |
| 5 | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | "confirmandoAnteriorRef con `<StrictMode>`…" › "con `<StrictMode>` y en Chromium: el admin confirma y no se mueve…" | Ídem, línea 144 |
| 6 | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | "un clic en una zona no enfocable…" › `it.fails` "'Cancelar' con la petición en vuelo, clic fuera…" | `Error: Expect test to fail` — la prueba interna **pasa** (T-14 corregido); `it.fails` la marca en rojo, como se esperaba |

No apareció ningún otro rojo ni una falla en otra línea o por otra causa. No toqué ningún `*.ataque.test.*`.

### Las 3 `it.fails` que siguen fallando por la razón equivocada (en la preparación, no en el `expect` final)

Son las otras 3 de las 4 `it.fails` de `cuentas-r4.ataque.test.tsx` (las de las líneas 208/232/256 en `6868e4d`, desplazadas por el auxiliar `fichaDe` de la ronda 0; sus posiciones nuevas están en `reporte-tester.md`, "Números de línea nuevos"). Cuentan como "fallo esperado" en el resumen de Vitest, pero no son un rojo mío: siguen dependiendo de `emularCorreccionDelFocoDeChromium` (línea 144, `toBeDisabled()`), que ya no puede cumplirse porque "Sí, restablecer" no vuelve a `disabled`. Le toca a la ronda 1 del tester retirar las 4 `it.fails` y adaptar la preparación, tal como dice el plan.

### Confirmación: las 3 pruebas de la ficha están en verde

- `cuentas-r2.ataque.test.tsx` › "la temporal ya visible sigue en la ficha de Carla…"
- `cuentas-r3.ataque.test.tsx` › "tras la temporal de Carla (con el foco en 'Copiar')…"
- `cuentas-r4.ataque.test.tsx` › "con `<StrictMode>`: buscar a Beto con la confirmación abierta en Carla…"

Ninguna aparece en la lista de fallidas de `npm run test`.

---

## Hallazgo sin resolver: V-08 en `package-lock.json`

`git diff 6868e4d -- package-lock.json` no se limita a las entradas de `@fontsource/*` y de la sección de `frontend`, como exige la excepción E-2. Además de las 3 líneas de dependencias y sus 3 bloques de metadatos de Fontsource (esperados), el mismo `npm install` autorizado por el plan **quitó la propiedad `"peer": true`** de unas 15 entradas no relacionadas en el árbol completo del lockfile (`@babel/*`, `react`, `react-dom`, `tsc`/TypeScript, `prisma`, `pg`, `@typescript-eslint/*`, `zod`, `acorn`, `browserslist`, `@keyv/serialize`, etc.), sin tocar sus versiones ni sus dependencias declaradas.

- **No hice esto a propósito ni lo intenté corregir a mano.** Es un efecto colateral del propio `npm install` que el plan mandó ejecutar (Dependencias, paso 2). `npm --version` en esta máquina es `11.19.0`; el lockfile venía de una corrida anterior (posiblemente con otra versión de npm), y `npm install` recalculó los indicadores `"peer"` de todo el árbol al reescribir el lockfile, sin que yo haya pedido esa reescritura ni la pueda evitar sin usar una versión distinta de npm (fuera de mi alcance) o editar el lockfile a mano (prohibido: alteraría un archivo generado sin pasar por la herramienta, y el plan no lo autoriza).
- El diff **no** toca ninguna versión, ningún `resolved`/`integrity` fuera de los tres paquetes nuevos, ni ninguna dependencia declarada: son solo bajas de la clave `"peer": true` en paquetes que ya estaban en el lockfile.
- **Por qué me detengo aquí:** el plan es explícito — "V-08 marcará ese archivo: el agente se detiene y pregunta, sin darlo por bueno." No doy este V-08 por verde. No he escrito nada en `CLAUDE.md`, `docs/ESTADO.md` ni `README.md` (esos cambios de cierre son del orquestador y dependen de que V-08 cierre limpio o de que el humano decida que este ruido de npm es aceptable).
- **Lo que pido decidir:** si el humano/orquestador acepta este ruido de `npm install` como inherente a la versión de npm de esta máquina (no a mi código), o si prefiere fijar la versión de npm del proyecto, o alguna otra vía. No até nada más al resultado de esta decisión: todo el resto de DESIGN-01a (código, pruebas, `DESIGN.md`) está terminado y verificado.

El diff completo de `package-lock.json` queda disponible con `git diff 6868e4d -- package-lock.json`.

---

## Verificación

- **lint:** `npm run lint --workspace=frontend` (desde la raíz) → **ok** (ESLint 0, Prettier 0, `tsc -b` 0).
- **test:** `npm run test` (desde `frontend/`) → **402 pasan, 6 fallan (previstos), 3 fallo esperado** (411 total, 30 archivos).
- **build:** `npm run build` (desde `frontend/`) → **ok**. `dist/assets/`: 6 `.woff2` + 6 `.woff`, todos `latin`; sin `latin-ext`; sin referencias a Google Fonts.
- **prisma validate:** n/a (sin cambios de esquema).

## Archivos creados / modificados

**Nuevos:**
- `frontend/src/styles/tokens.test.ts`
- `frontend/src/lib/utils.test.ts`
- `frontend/src/components/ui/button.test.tsx`
- `frontend/src/components/ui/label.tsx`
- `frontend/src/components/ui/sonner.tsx`
- `frontend/src/components/error-de-campo.tsx`
- `frontend/src/components/error-de-campo.test.tsx`
- `frontend/src/components/layout/contenedor-rol.test.tsx`

**Modificados:**
- `frontend/package.json`, `package-lock.json` (raíz, con el hallazgo de arriba), `frontend/vitest.config.ts`
- `frontend/src/styles/tokens.css`, `frontend/src/styles/index.css`, `frontend/src/main.tsx`
- `frontend/src/lib/utils.ts`
- `frontend/src/components/ui/button-variants.ts`, `button.tsx`, `input.tsx`, `card.tsx`, `dialog.tsx`
- `frontend/src/components/cargando.tsx`, `mensaje-error.tsx`
- `frontend/src/components/layout/contenedor-rol.tsx`
- `frontend/src/app/providers.tsx`
- `frontend/src/features/auth/components/formulario-login.tsx`, `formulario-registro.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx`, `formulario-cambiar-contrasena.tsx`, `panel-anuncios.tsx`, `tarjeta-de-cuenta.tsx`
- `frontend/src/features/auth/login-view.tsx`, `registro-view.tsx`, `acceso-restringido-view.tsx`, `bienvenida-view.tsx`, `login-view.test.tsx`
- `frontend/src/features/admin/components/formulario-invitar-maestro.tsx`, `buscador-de-cuenta.tsx`, `formulario-corregir-correo.tsx`, `contrasena-temporal.tsx`, `ficha-de-cuenta.tsx`
- `frontend/src/features/admin/cuentas-view.tsx`, `cuentas-view.test.tsx`, `lib.ts`, `lib.test.ts`
- `frontend/src/features/diagnostico/diagnostico-view.tsx`
- `docs/DESIGN.md` (solo dentro de las secciones de "docs/DESIGN.md (01a)")

**No tocados** (`*.ataque.test.*`, "No se toca" del plan): confirmado por V-08, salvo el hallazgo de `package-lock.json` ya descrito.

## Desviaciones del plan

Ninguna deliberada. La única nota es la de la sección "V-08 — HALLAZGO SIN RESOLVER" arriba, que reporto sin resolver por mi cuenta, tal como exige el plan.

## Pendiente o fuera de alcance

- Todo lo de DESIGN-01b (fondo con orbes, marco, composición), según el plan.
- El hallazgo de V-08 en `package-lock.json`, para que el humano decida.
- La comprobación del humano (H-01 a H-10) y la ronda 1 del tester, que siguen en el flujo del plan.

## DESIGN-01a — cierre

Cierre pedido por el orquestador tras la comprobación parcial del humano (bloque del login) y la revisión final del manager. Cuatro tareas: marcas de `DESIGN.md`, M-01, el borde de los campos y el rectángulo grisáceo del login.

### 1. Marcas de `docs/DESIGN.md`

A mano, sin formateador. Pasé a "propuesta aprobada (2026-09-27)" solo lo que el humano aprobó en el bloque del login:
- **Fuentes (H-01):** la "Implementación" de §4 pasa de "propuesta" a "propuesta aprobada (2026-09-27)". Sustituí el párrafo "Nadie las ha visto en pantalla todavía..." por el resultado de H-01 (lo que el humano confirmó: solo .woff2 del propio origen, las dos familias, cifras tabulares y lectura cómoda a 360 px), con una nota de que el resto de H-02 en adelante queda para la comprobación completa después de 01b.
- **Foco blanco por dentro en el botón azul (S-07):** en §6, separé la marca por color: `primary` queda "propuesta aprobada (2026-09-27), confirmada en H-04"; `destructive` sigue como propuesta, porque el humano no vio un botón rojo en el bloque del login (comprobacion-humano.md solo confirma "el botón azul"). También separé la fila correspondiente de la tabla de contraste de §3 (misma distinción).
- **Anillo de foco de los enlaces:** no encontré ninguna marca "propuesta" específica para el foco de los enlaces en DESIGN.md; ese foco sale de la regla general de §6 (--ring), que ya estaba marcada "captura", no "propuesta". No había nada que cambiar ahí.
- **Todo lo demás sigue como propuesta**, sin tocar sus marcas.

Atendí también:
- **M-03 (marca adelantada en §6):** la viñeta de "Botones rellenos" ya no dice "propuesta, confirmada por el humano" (que no es ninguna marca de la tabla de cabecera); ahora usa las marcas reales, separadas por color (ver arriba).
- **§7.3, corte de 768 px en los campos:** la frase "Los campos miden 44 px de alto (36 px en pantallas densas)" ahora dice "...(36 px en pantallas densas desde 768 px de ancho; 44 px por debajo de ese corte, como en §6 y §8)".
- **§7.3, frase confusa de ErrorDeCampo:** reescrita sin cambiar la decisión: "en vez de texto rojo suelto. Así, el rojo no toca el vidrio (que no llega a AA sobre vidrio al 62 %) sin importar dónde esté el formulario en la pantalla."
- **"Estado de aplicación" (cabecera):** anota el cierre de 01a (2026-09-27), incluye el borde de los campos y la corrección del rectángulo grisáceo, y dice que la comprobación visual completa (H-01 a H-10 y la tabla de contraste) queda pendiente para después de DESIGN-01b.

Después de editar DESIGN.md, corrí `npm run test` desde `frontend/` (resultados al final): sigue en verde, porque `tokens-r1.ataque.test.ts` lee las tablas de color de §3 con `?raw` y las comparé con cuidado contra `tokens.css`.

### 2. M-01 — prueba "escenario 4 de T-14"

`frontend/src/features/admin/cuentas-view.test.tsx`: la prueba ahora hace lo que su nombre promete. Antes solo enfocaba "Nombre completo" con la petición en vuelo (duplicaba cuentas-r4.ataque.test.tsx:287). Ahora:
1. Pulsa "Sí, restablecer" (queda en vuelo).
2. Pulsa "Cancelar" (no cancela la petición ya en curso, solo oculta la confirmación; el efecto de T-09/T-10 devuelve el foco a "Restablecer contraseña") y lo comprueba.
3. Simula el clic fuera con `restablecerBtn.blur()` dentro de `act()` (mismo patrón que `clicEnZonaNoEnfocable` de foco-r1.ataque.test.tsx) y comprueba que el foco cae a `<body>`.
4. Enfoca "Nombre completo".
5. Resuelve la respuesta con éxito.
6. Comprueba que el foco se queda en "Nombre completo".

No debilité ninguna aserción; agregué las de los pasos 2 y 3, que antes no estaban. Añadí `act` al import de `@testing-library/react`.

### 3. Borde de los campos (decisión del humano)

**Valor elegido:** `--input: #5A6472` (1 px, más claro que la tinta #16202E). Lo hallé replicando en un script del scratchpad el método de DESIGN.md §3 y tokens.test.ts (composición de capas: fondo con velo, saturación en sRGB/lineal/sin aplicar, peor de los tres resultados; los 4 fondos ya incluyen los 3 colores de orbe, así que el peor caso "con los orbes de 01b" ya estaba cubierto por el método existente, aunque 01a no los pinte todavía).

Contraste calculado (peor caso donde aplica):
- Contra vidrio (62 %), peor caso: 3.81 (mayor o igual a 3).
- Contra vidrio fuerte (78 %), peor caso: 4.65.
- Contra la tarjeta interna (vidrio fuerte sobre vidrio azul), peor caso: 4.13.
- Contra --surface (sólido): 6.00 (mayor o igual a 3).
- Contra --background (sólido): 5.14 (mayor o igual a 3).

Cambios:
- `frontend/src/styles/tokens.css`: --input deja de apuntar a var(--foreground); ahora vale #5a6472 directamente.
- `frontend/src/components/ui/input.tsx`: border-2 pasa a border (1 px); agregado focus-visible:border-accent (mismo grosor, sin salto); se conserva aria-invalid:border-destructive. No usé focus: ni ring- (prohibidos por V-05 de clases-r1.ataque.test.ts) ni valores arbitrarios.
- `frontend/src/components/ui/button-variants.ts`: el botón outline en contexto opaco (administrador) ya no usa border-input (que ahora sería el color claro de los campos); pasa a border-foreground, un token existente que sigue resolviendo a la tinta #16202E. Su aspecto no cambió: 2 px, color tinta.
- `frontend/src/styles/tokens.test.ts`: COLOR.input actualizado a #5A6472; agregada la fila ["--input", "#5a6472"] a la lista de valores literales de :root; sustituida la aserción que esperaba "--input: var(--foreground)" por una que confirma que ya no apunta a --foreground; las pruebas de contraste que ya existían para --input (sólidas contra --surface/--background, y sobre vidrio/vidrio fuerte/tarjeta interna contra 3:1) usan COLOR.input automáticamente, así que verifican el valor nuevo sin más cambios.
- `docs/DESIGN.md`: actualicé la fila de --input en la tabla "Base" de §3 (valor, uso, origen), agregué la fila de contraste sólido en "Contraste verificado" (6.0 · 5.1, redondeado hacia abajo), actualicé la fila "Contorno de campo --input" de la tabla de vidrio (10.4/12.7/11.2 a 3.8/4.6/4.1, redondeados hacia abajo), añadí una viñeta nueva bajo la tabla "Base" explicando el cambio y que el botón outline usa --foreground, y actualicé §5 "Bordes" y §7.3 (tabla del outline y viñeta de "campos") con el grosor nuevo, el comportamiento de foco y la excepción del botón del administrador.
- **No toqué** --border ni ningún otro token; tampoco cambié el grosor de foco de ningún otro control.

Verifiqué que ninguna prueba *.ataque.test.* dependía de --input === --foreground ni de border-input en el botón del administrador (solo hay dos usos de border-input/border-2 en todo src/, y revisé los dos). La única prueba de ataque que menciona --input (tokens-r1.ataque.test.ts:188, "--input / --surface >= 3") sigue en verde con el valor nuevo (6.00 mayor que 3).

### 4. Rectángulo grisáceo del login

**Causa, confirmada leyendo el código:** confirmo la hipótesis del orquestador. Card (components/ui/card.tsx) usa la utilidad vidrio, que en tokens.css pinta box-shadow: var(--glass-highlight), var(--shadow-glass), con --shadow-glass: 0 8px 32px rgb(22 32 46 / 0.08) (desenfoque de 32 px). En PanelAnuncios, el contenedor que hace scroll (ul en móvil, con overflow-y-auto y max-h-56; aside en escritorio, con lg:overflow-y-auto y lg:max-h-svh) recorta ese box-shadow de golpe en su borde de contenido, porque el recorte de overflow ocurre en un rectángulo fijo (el borde de relleno del contenedor), no se desvanece como el propio desenfoque. El resultado es un filo recto y grisáceo justo donde termina el contenedor, visible entre tarjetas conforme se hace scroll y debajo de la última: coincide con lo que describió el humano.

**Corrección aplicada (no verificada en pantalla):** en frontend/src/features/auth/components/panel-anuncios.tsx, agregué a cada contenedor que hace scroll (ul en móvil; aside desde lg:) un relleno pequeño con margen negativo a juego (p-2 -m-2, y lg:p-2 lg:-m-2 / lg:p-0 lg:m-0 según el breakpoint). El relleno le da a la sombra un margen antes de que la corte el borde del contenedor; el margen negativo cancela exactamente ese relleno para que el contenido no se desplace ni cambie el resto del layout (revisé que la aritmética no reduce a menos de cero ningún gap existente: gap-4 en el aside a escritorio tiene 48 px de huelgo con el gap-12 del grid vecino, y en móvil el gap-4 entre el título y la lista y el gap-8 del grid principal quedan con margen de sobra frente al ajuste de 8 px).

Es un alivio parcial (8 px de margen frente a un desenfoque de 32 px), no una eliminación garantizada del recorte: como no puedo abrir un navegador, lo reporto como no verificado en pantalla. Lo decide el humano en la comprobación completa después de DESIGN-01b; si 8 px no basta, se puede ampliar sin más cambios de estructura.

Documenté el patrón en docs/DESIGN.md §7.2 ("Superficies de vidrio"), como corrección sin verificar en pantalla, para que un futuro panel con scroll propio use el mismo mecanismo.

### Archivos tocados en el cierre

- frontend/src/features/admin/cuentas-view.test.tsx (M-01)
- frontend/src/styles/tokens.css (borde de campos)
- frontend/src/styles/tokens.test.ts (borde de campos)
- frontend/src/components/ui/input.tsx (borde de campos)
- frontend/src/components/ui/button-variants.ts (borde de campos, botón outline del administrador)
- frontend/src/features/auth/components/panel-anuncios.tsx (rectángulo grisáceo)
- docs/DESIGN.md (marcas, borde de campos, rectángulo grisáceo)

### Verificación del cierre (desde frontend/)

- **lint:** código 0 (ESLint + prettier --check + tsc -b).
- **test:** código 0; 37 archivos, 496 pruebas, 496 en verde. Las dos pruebas de más, respecto de las 494 del reporte del manager, son la fila nueva de tokens.test.ts (--input, #5a6472) y la prueba que separé de "apuntan a su token" para verificar que --input ya no apunta a --foreground; no se perdió ninguna aserción.
- **build:** código 0. Mismo aviso preexistente de Vite sobre el bloque de más de 500 kB.
- **V-01 (39 hashes de *.ataque, tabla de "DESIGN-01a — Ronda 1" de reporte-tester.md):** sha256sum -c da 39/39 OK, desde la raíz. Ninguna prueba de ataque cambió.
- **V-08:** git status --porcelain fuera de frontend/ solo muestra docs/DESIGN.md (E-5), docs/ESTADO.md (no lo toqué; ya estaba modificado por el orquestador antes de mi turno) y docs/trabajo/DESIGN-01-sistema-de-diseno/ (excluida). package-lock.json no cambió en este cierre. No toqué ningún archivo de la lista "No se toca" del plan.

### Correcciones de la revisión del cierre (M-01, M-02, M-03)

El orquestador me pidió corregir los hallazgos de `revision.md`, sección "DESIGN-01a — cierre". Alcance acotado a `frontend/src/styles/tokens.css`, `frontend/src/styles/tokens.test.ts` y `docs/DESIGN.md`.

**M-01 (bloqueaba) — `--input` no puede llevar un valor propio.** Corregido:
- Nuevo token base **`--field-border: #5a6472`** en `tokens.css`, junto a `--border`.
- `--input` pasa a `var(--field-border)`, igual que `--ring` apunta a `--accent`. Ya no hay ningún derivado de shadcn con un valor literal propio.
- `tokens.test.ts`: la fila literal de `:root` pasa de `["--input", "#5a6472"]` a `["--field-border", "#5a6472"]`; la prueba que antes comprobaba "--input ya no apunta a --foreground" ahora comprueba `expect(tokens).toContain("--input: var(--field-border)")`. `COLOR.input` (el doble de la prueba de contraste) no cambió de valor, así que las pruebas de contraste de `--input` contra vidrio, vidrio fuerte, tarjeta interna, `--surface` y `--background` siguen verificando el mismo color, ahora resuelto a través de `--field-border`.
- `docs/DESIGN.md`: nueva fila "Base" para `--field-border` (valor, uso y origen); la fila de `--input` ahora dice "apunta a `--field-border`" y remite a ella para el origen. La fila de `--foreground` (línea ~50) ya no menciona el contorno de los campos; dice en cambio el uso real que conserva, el borde de 2 px del botón `outline` en contexto opaco.
- `tokens-r1.ataque.test.ts` (no la toqué): sigue en verde. Lee las tablas de §3 de `DESIGN.md` y compara contra `tokens.css` resolviendo `var()`, así que tanto la fila de `--field-border` como la de `--input` (que ahora incluye "(apunta a `--field-border`)" en la celda de valor, con el hex entre backticks aparte) se resuelven y comparan correctamente. Ninguna prueba de ataque se puso roja; no hizo falta detenerse.

**M-02 (bloqueaba) — la marca de origen mezclaba el criterio del humano con el valor que elegí yo.** Corregido en cada lugar que señaló el manager:
- Tabla "Base" (`--field-border`): origen separado en dos partes, "criterio… decisión del humano (2026-09-27)" y "valor y nombre del token: propuesta (cierre de DESIGN-01a)".
- Viñeta bajo la tabla "Base" (antes sobre `--input`, ahora sobre `--field-border` y `--input`): misma separación criterio/valor, y explica que `--input` apunta a `--field-border` con `var()`.
- "Contraste verificado", fila sólida y fila de vidrio del borde de campo: renombradas a `--field-border` (es el token con el valor propio; `--input` solo lo referencia) y con la misma separación criterio/valor.
- §5 "Bordes" y §7.3 "Borde de un campo": mismo ajuste, más la aclaración de que `--input` apunta a `--field-border`.
- La fila del anillo de foco interior (línea ~131) ya no dice "(aprobado, H-04)", que no es ninguna marca de `DESIGN.md`; ahora usa "propuesta aprobada (2026-09-27), confirmada en H-04" para `primary` y "todavía propuesta" para `destructive`, igual que ya decía §6.
- De paso (detalle menor que ya estaba permitido incluir en la misma edición): agregué en §7.3 la frase que faltaba sobre un campo inválido y enfocado (conserva el borde `--destructive` y lleva el anillo azul por fuera), y cambié "el anillo de foco de §6 se queda encima" por "se queda, por fuera", más preciso.

**M-03 (no bloqueaba) — §7.2 presentaba `p-2 -m-2` como patrón general y decía que no movía nada.** Corregido en la misma edición: el párrafo de "Contenedor con desplazamiento propio" ahora queda como observación marcada "propuesta, sin verificar en pantalla", explica que el ajuste actual en `PanelAnuncios` es un **alivio parcial** (8 px de margen contra una sombra que llega a unos 40 px), que no es un patrón para copiar tal cual en otro contenedor con scroll, y que la solución de fondo la decide el encargo que rehaga esa composición (01b). Quité la afirmación de que el ajuste "no mueve el contenido ni el resto del layout".

**No toqué** `frontend/src/features/auth/components/panel-anuncios.tsx` ni ningún otro archivo fuera de los tres autorizados: el comentario de ese componente que el manager mencionó como ejemplo del mismo problema de M-03 sigue con la frase "sin mover el contenido ni el resto del layout" sin corregir, porque está fuera del alcance que me dieron para esta corrección. Lo reporto para que el orquestador decida si lo autoriza en otro turno.

### Verificación de la corrección (desde `frontend/`)

- **lint:** código 0 (ESLint + `prettier --check` + `tsc -b`).
- **test:** código 0; **37 archivos, 496 pruebas, 496 en verde**. El número de pruebas no cambió respecto del cierre anterior: sustituí una prueba por otra (misma cantidad) y renombré una fila de `it.each` (misma cantidad de filas).
- **build:** código 0. Mismo aviso preexistente de Vite sobre el chunk de más de 500 kB.
- **V-01 (39 hashes de *.ataque):** `sha256sum -c` → 39/39 OK, desde la raíz. Ninguna prueba de ataque se tocó ni cambió de hash.

**M-03, seguimiento — comentario de `panel-anuncios.tsx`:** el orquestador autorizó tocar ese archivo, solo el comentario. Reescrito: quité la frase "sin mover el contenido ni el resto del layout" y dejé explícito que `p-2 -m-2` es un alivio parcial del recorte de la sombra, sin verificar en pantalla, con la solución de fondo remitida a `DESIGN.md` §7.2 y a DESIGN-01b. Formateado solo ese archivo con `npx prettier --write src/features/auth/components/panel-anuncios.tsx` desde `frontend/` (sin cambios: ya cumplía el estilo). Ninguna clase ni código cambió.

**Detalle menor, seguimiento final:** en §1 "Qué se conserva de la dirección C", quité "el borde tinta de los campos" de la lista de lo que se conserva (ya no es cierto desde el borde de 1 px de `--field-border`) y lo agregué a "Qué cambia", con la remisión a §3 y §5.

### Archivos tocados en esta corrección

- `frontend/src/styles/tokens.css`
- `frontend/src/styles/tokens.test.ts`
- `docs/DESIGN.md`
- `frontend/src/features/auth/components/panel-anuncios.tsx` (solo el comentario, seguimiento de M-03)
