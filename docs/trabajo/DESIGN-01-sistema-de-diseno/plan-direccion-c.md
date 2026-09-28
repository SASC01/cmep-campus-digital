# Plan — DESIGN-01 · sistema de diseño aplicado a lo existente
Estado: BLOQUEADO
Carril: normal (decisión del humano; ver R-11)
Requisitos: RF-01, RF-02, RF-04, RF-04a, RF-04b, RF-04d, RF-05, RF-06, RN-03 (solo la interfaz de sus pantallas, sin cambiar su comportamiento); PRD §7 y pregunta abierta 1; `docs/DESIGN.md` completo; pendientes de `docs/ESTADO.md` §3 con destino "Encargo de dirección visual" (MF-05 y T-14 de AUTH-02b incluidos)

Rama: `feat/design-01-sistema-de-diseno`, creada desde `main` (`c50cece`).

---

## Preguntas bloqueantes

Cada respuesta cambia el alcance o el orden del trabajo. El resto del plan está escrito con la opción recomendada; si el humano elige otra, el arquitecto ajusta solo las secciones afectadas.

**P-01 · Entradas de la barra lateral mientras no existen los módulos.**
`DESIGN.md` §7.2 dice que la barra "solo muestra los destinos del rol" y que "los fija el encargo de cada módulo". Hoy solo existen la bienvenida (`/estudiante`, `/maestro`) y la pantalla provisional de cuentas (`/admin`).
- **(A) Recomendada.** Solo los destinos que existen: estudiante y maestro, "Inicio"; administrador, "Cuentas". Cada encargo de módulo agrega el suyo (CLASES, TAREAS, CALENDARIO, CALIFICACIONES, ENVIVO, ADMIN).
- (B) Mostrar ya los destinos futuros ("Calendario", "Calificaciones", "Grabaciones"…) desactivados, con "Próximamente". No la recomiendo: son enlaces muertos, y el texto "Próximamente" no está en el PRD.

**P-02 · "El administrador en su versión densa con tablas", sin pantallas nuevas de ADMIN.**
`/admin` provisional no tiene ninguna tabla: son dos formularios y una ficha.
- **(A) Recomendada.** El administrador usa el mismo marco (barra lateral y encabezado) con su densidad: controles de 36 px y 16 px entre bloques. No se construye el componente de tabla: sin una pantalla que lo use no se puede validar a la vista, y sería código sin consumidor. `DESIGN.md` §7.7 sigue como propuesta y la tabla llega con ADMIN (RF-54 y RF-57).
- (B) Construir además `components/ui/table.tsx` según §7.7 (contenedor, encabezado fijo, filas de 40 px), con su prueba en jsdom y sin pantalla que lo use. §7.7 seguiría como propuesta.

**P-03 · Confirmar T-14 contra el código anterior a la corrección: "ronda 0" del tester.**
ESTADO §3 exige quitar primero las marcas `it.fails` y confirmar que las 4 pruebas fallan en la aserción final del foco, no en la preparación, y solo entonces corregir el código. Pediste que el tester retire las `it.fails` en su ronda 1, que ocurre después del programador. Para entonces el código anterior ya no existe en el árbol de trabajo, y el tester no puede tocar código de producción.
- **(A) Recomendada.** Una "ronda 0" corta del tester, antes del programador, solo de confirmación. Quita las 4 marcas, corre el archivo, comprueba el mensaje y la línea de cada falla, restaura el archivo byte por byte y verifica su hash. Procedimiento exacto en "Diseño", §D-7. Después, en la ronda 1, retira las marcas de forma definitiva como pediste.
- (B) Sin ronda 0: en la ronda 1, el tester reconstruye el código anterior en un `git worktree` de `c50cece` dentro del scratchpad, con un enlace a `node_modules`. Exige autorizar `git worktree add`, que escribe en `.git`, y es más frágil en Windows.
- (C) Omitir la confirmación. No la recomiendo: incumple el procedimiento que tú mismo fijaste en ESTADO §3.

**P-04 · Dividir el encargo.**
El encargo toca unos 45 archivos y mezcla un cambio de comportamiento (botones en espera y T-14, que el tester debe atacar) con un reestilizado que solo se valida a la vista. Como la paleta y las escalas por defecto de Tailwind quedan anuladas, la migración mecánica de clases (`text-sm` → `text-small`…) tiene que hacerse en todos los archivos en el mismo cambio que los tokens.
- **(A) Recomendada.** Dos entregas con este mismo plan, cada una con su ronda de programador, tester y manager, y su propio PR:
  - **DESIGN-01a (Fase A):** tokens, fuentes, anulación de la paleta, `components/ui/`, patrón de botón en espera en los 13 botones, T-14 y la migración mecánica de clases en todos los archivos.
  - **DESIGN-01b (Fase B):** marco (barra lateral, encabezado, avatar, monograma), bloque azul del login, composición de cada pantalla y los patrones nuevos de `DESIGN.md`.
  - 01b sale de una rama nueva desde `main` después de fusionar 01a (sugerida: `feat/design-01b-marco-y-pantallas`).
- (B) Una sola entrega: el programador hace la Fase A y la Fase B seguidas, y el tester ataca todo junto.

**P-05 · Aprobación de las dependencias nuevas** (`AGENTS.md`: "Pide confirmación antes de agregar una dependencia nueva").
- **(A) Recomendada.** Aprobar exactamente estas tres, en el workspace `frontend`, con rango `^5.3.0` (la convención del repositorio):
  - `@fontsource/bricolage-grotesque`
  - `@fontsource/atkinson-hyperlegible-next`
  - `@fontsource/atkinson-hyperlegible-mono`

  Se importan solo el subconjunto `latin` y los pesos de `DESIGN.md` §4. Detalle y justificación en "Cambios por capa › Dependencias". Ninguna otra dependencia: ni paquetes de shadcn o Radix, ni `next-themes`, ni las versiones variables `@fontsource-variable/*`.
- (B) Fijarlas en la versión exacta `5.3.0` (`--save-exact`), para que una actualización de Fontsource no cambie los glifos sin aviso.

---

## Suposiciones

- **S-01 · Carril normal.** Lo fijó el humano. Las pantallas de contraseña y la de acceso restringido cambian solo de estilo. Su lógica, sus guardas y sus textos no cambian (R-11).
- **S-02 · Sin CLI de shadcn.** Los componentes nuevos (`label.tsx`, `sonner.tsx`) se escriben a mano a partir del código de shadcn 4.21.0, como en FRONT-01. Los pendientes D-02 (`cn`) y D-03 (`paths` en `frontend/tsconfig.json`) no entran: siguen para el primer encargo que ejecute `shadcn add`. Sin ejecutar el CLI no se puede comprobar que `paths` lo arregle.
- **S-03 · Sin navegador.** Ningún agente abre navegadores, ni con interfaz ni sin ella. La comprobación visual la hace el humano con la lista de "Pruebas requeridas › Comprobación del humano". No propongo capturas con un navegador sin interfaz.
- **S-04 · Sin cambios de texto.** Ningún `TEXTOS_*` de `features/auth/data.ts` ni de `features/admin/data.ts` cambia. Los únicos textos nuevos son las etiquetas de la barra lateral ("Inicio" y "Cuentas", en `app/destinos.ts`) y el nombre accesible de la lista desplazable de anuncios ("Lista de anuncios").
- **S-05 · Sin botón de avisos.** El encabezado no muestra el botón de avisos de §7.2 hasta que exista el módulo `notificaciones`: un "0 nuevas" inventado sería falso.
- **S-06 · "Cerrar sesión" en el encabezado.** `DESIGN.md` no le da lugar. Va a la derecha del encabezado, como botón `outline` con icono y texto. Por debajo de 640 px el texto queda solo para lectores de pantalla (`sr-only sm:not-sr-only`). Es un único elemento en el DOM. No va en un menú del avatar, porque 5 pruebas de ataque hacen clic directo en `button "Cerrar sesión"` (R-08).
- **S-07 · La bienvenida no usa el bloque destacado.** §7.3 exige un titular con un dato ("Tienes 3 entregas…"), y la bienvenida no tiene ninguno. Queda como título de página y una línea de texto.
- **S-08 · El bloque azul del login no es el bloque destacado de §7.3.** Es un patrón propio, el "panel de anuncios del login": fondo `--accent` con tarjetas crema, sin titular de dato ni acción principal. Se documenta en `DESIGN.md` como §7.10.
- **S-09 · Densidad del administrador.** §7.1 dice que los campos miden 44 px, y §8, que el administrador usa controles de 36 px. Se aplica §8, que es la regla más específica: en `/admin`, botones y campos de 36 px. El texto de los campos se queda en 16 px en todos los roles, porque por debajo de 16 px iOS amplía la página al enfocar un campo.
- **S-10 · Monograma "cm" provisional** hasta tener el logo del colegio (PRD §11, pregunta abierta 1). Va en la barra lateral y en la cabecera de las tarjetas de cuenta y del login.
- **S-11 · Estado "hover"**, que `DESIGN.md` no fija: `primary` y `destructive` bajan su fondo al 90 %; `outline` y `ghost` pasan a `--muted`. Se documenta en §7.1.
- **S-12 · Lista de anuncios enfocable.** La lista desplazable del panel lleva `tabIndex={0}` y `aria-label="Lista de anuncios"`, para que se pueda desplazar con el teclado (WCAG 2.1.1).
- **S-13 · Solo el subconjunto `latin` de las fuentes.** Cubre á, é, í, ó, ú, ü, ñ, ¿ y ¡. Un nombre con letras de `latin-ext` (por ejemplo, ł) se ve con la fuente de respaldo del sistema.
- **S-14 · Encabezado de 64 px por debajo de 768 px.** §7.2 fija 96 px, medidos en escritorio, y no dice nada del móvil. Se documenta.
- **S-15 · Se retiran del botón** la variante `secondary` y los tamaños `xs`, `lg`, `icon-xs` e `icon-lg`. No están en §7.1, nadie los usa y dejarían tamaños fuera del sistema.

---

## Alcance

### Entra
1. **Tokens (ESTADO §3):** valores de `DESIGN.md` en `tokens.css`, los siete tokens nuevos, `--input` apuntando a `--foreground`, `--shadow-overlay`, la escala tipográfica `--text-*`, las familias y la anulación de la paleta y las escalas por defecto de Tailwind (colores, tamaños de letra, pesos, radios y sombras).
2. **Fuentes:** las tres familias con `@fontsource`, solo con los pesos de §4 y el subconjunto `latin`.
3. **`components/ui/`:** `Button` (variantes de §7.1, tamaños por densidad, la variante tinta sobre el bloque destacado y el estado **en espera**), `Input`, `Card`, `Dialog`, `Label` (nuevo) y `Toaster` (nuevo, con el tema de §7.9). Además, `Cargando`, `MensajeError` y `ErrorDeCampo` (nuevo).
4. **Foco:** contorno sólido de 2 px, separado 2 px, en lugar de `ring-ring/50`. Cambia de color sobre las superficies `--accent` y `--brand`.
5. **MF-05 y T-14 de raíz:** los 13 botones con una petición en vuelo pasan de `disabled` a `enEspera`, y `AccionRestablecer` decide el foco con el elemento activo en el momento de la respuesta.
6. **Marco:** barra lateral compacta, que baja a una barra inferior por debajo de 768 px; encabezado con nombre del producto, nombre y rol, avatar y "Cerrar sesión". Es el mismo marco para los tres roles; el administrador cambia en densidad y destinos.
7. **Pantallas reestilizadas:** login (panel de anuncios como bloque azul a la izquierda), registro, recuperar, restablecer, establecer contraseña, cambio obligatorio, acceso restringido, bienvenida, `/admin` provisional y diagnóstico.
8. **`DESIGN.md`:** documentar los patrones nuevos y quitar las marcas de "propuesta" que este encargo valida, después de la comprobación visual del humano.
9. **Grep de V-07 corregido** (`\b` antes de cada familia de color) como parte de las verificaciones V-02 a V-04.

### Pendientes de ESTADO §3 con destino "dirección visual": qué entra y por qué

| Pendiente | ¿Entra? | Por qué |
|---|---|---|
| Valores de `DESIGN.md` en `tokens.css`, tokens nuevos, `--shadow-overlay` | Sí | Es el núcleo del encargo |
| Tema del `Toaster` | Sí | §7.9 lo define. Se valida con el aviso de "Copiar" en `/admin` |
| Anillo de foco sólido en lugar de `ring-ring/50` | Sí | §6. `ring-ring/50` da menos de 3:1 |
| Variante tinta del botón sobre el bloque destacado | Sí, solo el mecanismo | Se expresa como `primary` dentro de `data-superficie="destacada"` (§D-3). Ninguna pantalla lo usa todavía: lo estrenan los dashboards |
| Anular la paleta por defecto de Tailwind | Sí | Inventario y sustituciones en "Cambios por capa › Inventario de clases" |
| Instalar y validar las tres familias | Sí, con P-05 | La validación visual es del humano (H-11) |
| Confirmar lo marcado como propuesta | En parte | Tabla en "Cambios por capa › `docs/DESIGN.md`" |
| `paths` de shadcn y dependencia `cn` (D-02, D-03) | No | S-02 |
| Grep de V-07 (`\bslate-`) | Sí | V-02 |
| MF-05, botones que pierden el foco al deshabilitarse | Sí | Patrón "en espera" (§D-4) |
| T-14 | Sí | §D-5 y §D-7 |

### No entra
- Pantallas nuevas de CLASES, TAREAS, ADMIN u otros módulos; dashboards; composición del bloque destacado; `EstadoVacio`, `EstadoPagoBadge` y `EstadoEntregaBadge`; botón de avisos.
- Componente de tabla (P-02, opción A).
- Pendientes de ADMIN, aunque vivan en `/admin`: tarjetas hechas a mano en lugar de `Card` (MF-02); `erroresPorCampo` duplicado; el `role="status"` que envuelve también "Copiar"; la temporal que se pierde al buscar otra cuenta; el texto genérico ante un fallo de red; la alerta que persiste al reabrir la confirmación. Aquí solo se cambian sus clases, no su estructura. Ninguno es inevitable para reestilizar.
- Cambios de AUTH-03 (el cambio obligatorio sigue pidiendo la temporal) y cualquier cambio de texto.
- Quitar `tw-animate-css`: deja de usarse, pero desinstalarlo es un cambio de dependencias (R-12).
- CLI de shadcn, `paths` y `cn` (S-02). Logo del colegio. Imágenes en los anuncios (RF-06, RF-07). Modo oscuro.

### No se toca
- `backend/`, `shared/`, `infra/`
- `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/PRD.md`, `docs/ESTADO.md` (este lo lleva el orquestador)
- `eslint.config.mjs`, `package.json` de la raíz, `tsconfig.base.json`, `.prettierignore`
- `frontend/components.json`, `frontend/tsconfig*.json`, `frontend/vite.config.ts`, `frontend/vitest.config.ts`, `frontend/index.html`, `frontend/.env*`
- `frontend/src/services/**`, `frontend/src/features/*/hooks.ts`, `frontend/src/features/*/types.ts` y los `data.ts` de `features/auth` y `features/admin`
- **Para el programador:** todo `*.ataque.test.*`
- Única excepción: `frontend/package.json` y el `package-lock.json` de la raíz cambian solo con el `npm install` aprobado en P-05

---

## Diseño

Sin backend, sin API nueva y sin datos. Todo ocurre en el frontend.

### D-1 · Tokens y anulación de la paleta
- En `tokens.css`, un bloque `@theme` anula los espacios de nombres por defecto: `--color-*`, `--text-*`, `--font-*`, `--font-weight-*`, `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*` y `--text-shadow-*`, cada uno con `initial`. Después se definen solo los tokens de `DESIGN.md`.
- **Tailwind 4 no falla con una clase desconocida: la ignora sin avisar.** Por eso la anulación se acompaña del inventario de clases (sección "Cambios por capa") y de los greps V-02 a V-04 y V-10. Sin ellos, las regresiones serían invisibles (R-03).
- Espaciado (`--spacing`), puntos de corte, contenedores, `--tracking-*`, `--leading-*` y `--animate-*` conservan sus valores por defecto: `DESIGN.md` no los redefine.
- `cn` (`lib/utils.ts`) se extiende con `extendTailwindMerge`. Si no, `tailwind-merge` confunde `text-small` con un color: `cn("text-small", "text-destructive")` borraría el tamaño (R-04).

### D-2 · Foco
- Regla global en `index.css`, `@layer base`: `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`.
- Sobre una superficie `--accent` o `--brand`, el elemento marcado redefine `--ring` para su subárbol:
  - `[data-superficie="acento"]` y `[data-superficie="marca"]` → `--ring: var(--background)`;
  - `[data-superficie="destacada"]` (la tarjeta crema dentro del bloque azul) → `--ring: var(--accent)`.
- Se retiran `outline-none`, `ring-*` y `focus-visible:ring-*` de los componentes. La única excepción es el `DialogContent`, que recibe el foco por programa y no es un control (V-05).

### D-3 · Botón sobre el bloque destacado
El código sigue pidiendo `variant="primary"`, como exige `DESIGN.md` §7.3. La variante `primary` incluye `in-data-[superficie=destacada]:bg-foreground`, `in-data-[superficie=destacada]:text-background` e `in-data-[superficie=destacada]:hover:bg-foreground/90`. Si la versión instalada de Tailwind no genera el variante `in-data-[…]` (V-10), se usa el equivalente arbitrario `[[data-superficie=destacada]_&]:bg-foreground`, y así con las demás clases. Ninguna pantalla lo usa todavía: se prueba con jsdom (clases) y con el CSS de `dist/` (V-10).

### D-4 · Botón en espera (MF-05)
`Button` gana la propiedad `enEspera?: boolean`, incompatible con `asChild` por tipo. Con `enEspera`:
1. No pone `disabled`. Pone `aria-disabled="true"` y `aria-busy="true"`: el botón **conserva el foco** y sigue en el orden de tabulación.
2. Intercepta `onClick`: llama a `evento.preventDefault()` y **no** llama al `onClick` recibido. Eso cubre:
   - el clic;
   - Enter y Espacio sobre el botón, porque el navegador los convierte en `click`;
   - el envío implícito con Enter desde un campo: el navegador lo convierte en un `click` sintético sobre el botón de envío, y `preventDefault` cancela el envío.
3. Muestra `LoaderCircle` (`aria-hidden`, `size-4 animate-spin motion-reduce:animate-none`) antes del texto. **El texto no cambia:** el nombre accesible es el mismo en vuelo, y las pruebas localizan los botones por ese nombre.
4. Cursor `progress` y sin opacidad reducida, para que el contraste del texto se mantenga.

**Defensas contra el doble envío, en capas:**
- **(a) El clic interceptado.** Actúa en cuanto React vuelve a pintar con `enEspera=true`.
- **(b) La guarda del manejador.** Cada `handleSubmit` conserva su `if (mutacion.isPending) return`. Cubre `fireEvent.submit`, `requestSubmit()` y cualquier envío que no pase por el botón.
- **(c) El candado síncrono.** `AccionRestablecer` conserva `enviandoRef`, que protege dos clics en el mismo instante (T-03).

Dos clics en el mismo instante en los demás botones siguen igual de protegidos que hoy, ni más ni menos: `disabled` también dependía de un repintado entre los dos clics. Las pruebas de ataque de doble envío existentes deben seguir en verde (R-07).

**`disabled` queda para un control que no está disponible**, no para una petición en vuelo. Hoy no hay ninguno.

### D-5 · T-14 en `AccionRestablecer` (`features/admin/components/ficha-de-cuenta.tsx`)
**Causa:** `tieneFocoRef` se deduce de eventos `blur`. Un `blur` sin destino, sea el de la corrección de Chromium o un clic en una zona no enfocable, deja la bandera encendida aunque el admin se vaya después a otro campo.

**Corrección de raíz:**
1. Con `enEspera`, "Sí, restablecer" ya no se deshabilita, así que Chromium no le quita el foco.
2. El foco se decide con el elemento activo **en el momento de la respuesta**, no con el historial de eventos. Se eliminan `tieneFocoRef`, `manejarFoco`, `manejarDesenfoque` y los `onFocusCapture`/`onBlurCapture`.

**Contrato del foco**, que el tester ataca:
- **F-1:** con la petición en vuelo, "Sí, restablecer" tiene `aria-disabled="true"` y `aria-busy="true"`, no tiene `disabled` y conserva el foco si lo tenía. Clic, Enter o Espacio sobre él no mandan una segunda petición.
- **F-2:** al llegar la temporal (`onSuccess` de la llamada a `mutate`), el foco va a "Copiar" **solo si** `focoDisponiblePara(raiz, document.activeElement, document.body)` es `true`:
  - el elemento activo está dentro de la raíz de `AccionRestablecer`;
  - o es `<body>` o `null`, es decir, nadie más tiene el foco.

  Si el admin está en otro control, el foco no se toca.
- **F-3:** con un error (`onError`), el foco va a "Cancelar" solo con la misma condición y solo si "Cancelar" existe. Si el admin canceló con la petición en vuelo, la referencia es nula y no pasa nada.
- **F-4:** se conservan T-07, T-09, T-10, T-11, T-12 y T-13. Al abrir la confirmación, el foco va a "Cancelar"; al cancelar, a "Restablecer contraseña"; con `<StrictMode>`, el montaje no mueve el foco (`confirmandoAnteriorRef`); cada ficha nueva empieza cerrada.

**Estructura:** `AccionRestablecer` devuelve **una sola raíz** `<div ref={raizRef} className="flex flex-col gap-2">` y, dentro, el contenido de cada estado: botón inicial, confirmación o temporal. La raíz **no** lleva `rounded-lg` (R-08).

### D-6 · Marco (`ContenedorRol`)
```
<div data-rol={rol} class="min-h-svh bg-background text-foreground md:flex">
  <BarraLateral destinos />          nav "Navegación principal": ≥ 768 px, columna de 96 px; < 768 px, barra inferior fija de 64 px
  <div class="flex min-h-svh flex-1 flex-col">
    <Encabezado … />                 header de 64 px (< 768) y 96 px (≥ 768)
    <main class="flex flex-1 flex-col {ESPACIADO_POR_ROL} px-4 pb-24 md:px-10 md:pb-10">  <Outlet/>  </main>
  </div>
</div>
```
- **Una sola `nav`** que cambia de forma con clases responsivas; no hay dos copias. jsdom no aplica media queries: dos copias duplicarían enlaces y romperían `getByRole` (R-08).
- **Destinos por rol en `app/destinos.ts`.** `app/` es dueño de las rutas, y `components/layout` no puede importar de `features/`. Se construyen con `rutaPorRol` de `features/auth/lib`, para no duplicar las rutas.
- **Elemento activo:** `NavLink` con `end`, que pone `aria-current="page"`.
- **`[data-rol="admin"]`** redefine `--control-height` a 36 px (§D-8).
- **`ESPACIADO_POR_ROL`** pasa al `main`: estudiante `gap-6` (24 px, §8), maestro `gap-6` y admin `gap-4`.

### D-7 · Procedimiento de T-14 (con P-03, opción A)
**Ronda 0 del tester, antes del programador.** Solo lee el código de producción; solo escribe `cuentas-r4.ataque.test.tsx`, de forma temporal, y su reporte.
1. `git status --porcelain -- frontend/` debe salir vacío: el código es el de `c50cece`. Si no, **detente**.
2. SHA-256 de `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` = `97b5c0796860736d9fb8d32b96de1feb97ecc074af74fa70d8b4a51ec001ee1a` (tabla vigente de AUTH-02, ronda 4, "Aplicación de la opción B"). Si no coincide, **detente**.
3. Copia el archivo al scratchpad. En el original, sustituye solo las 4 apariciones de `it.fails(` por `it(`, sin formatear.
4. Desde `frontend/`: `npx vitest run src/features/admin/cuentas-r4.ataque.test.tsx`, con la salida redirigida a un archivo del scratchpad y sin tubería.
5. Confirma que fallan exactamente esas 4 pruebas y que cada una falla en su `expect(document.activeElement, …)` final, no en `emularCorreccionDelFocoDeChromium`, `escribirEn`, `clicEnZonaNoEnfocable` ni `findByText`. Mensajes esperados:
   - 1.ª: `el admin escribía en "Nombre completo" y la temporal le llevó el foco a button "Copiar"`
   - 2.ª: `el admin escribía en "Correo correcto" y la temporal le llevó el foco a button "Copiar"`
   - 3.ª: `el admin escribía en "Nombre completo" y el error le llevó el foco a button "Cancelar"`
   - 4.ª: `el admin escribía en "Nombre completo" y la temporal le llevó el foco a button "Copiar"`

   Anota el número de línea de cada falla y compáralo con la línea del `expect` final.
6. Restaura el archivo desde la copia y comprueba que el hash vuelve a ser `97b5c079…`. Vuelve a correr el archivo: 13 pruebas, 9 en verde y 4 como fallo esperado.
7. Escribe `docs/trabajo/DESIGN-01-sistema-de-diseno/reporte-tester.md`, sección "Ronda 0 — confirmación de T-14", con la salida relevante. Si alguna de las 4 falla en la preparación, **detente** y repórtalo: el orquestador lo escala.

**Programador:** no toca ningún `*.ataque.test.*`. Al terminar, la suite del frontend tiene **exactamente estos 6 rojos esperados** y ningún otro:

| Archivo | Prueba | Falla esperada |
|---|---|---|
| `cuentas-r3.ataque.test.tsx` | "en Chromium, 'Sí, restablecer' deshabilitado pierde el foco" › "el admin confirma y no se mueve…" | En la preparación: `waitFor(() => expect(control).toBeDisabled())`. El botón ya no se deshabilita |
| `cuentas-r3.ataque.test.tsx` | ídem › "el admin confirma y el servidor responde 500…" | Ídem |
| `cuentas-r4.ataque.test.tsx` | "…sí debe sostener" › "en Chromium: 500, el foco vuelve a 'Cancelar', Shift+Tab…" | Ídem |
| `cuentas-r4.ataque.test.tsx` | ídem › "en Chromium: tras la corrección, el admin vuelve a 'Cancelar' con Tab…" | Ídem |
| `cuentas-r4.ataque.test.tsx` | "confirmandoAnteriorRef con <StrictMode>…" › "con <StrictMode> y en Chromium: el admin confirma y no se mueve…" | Ídem |
| `cuentas-r4.ataque.test.tsx` | "un clic en una zona no enfocable y después otro campo" › `it.fails` "'Cancelar' con la petición en vuelo, clic fuera…" | La prueba ya pasa, y `it.fails` la marca en rojo. **Es la señal de que T-14 quedó corregido de raíz** |

- Las otras 3 `it.fails` de T-14 seguirán en "fallo esperado", pero **por la razón equivocada**: fallan en la preparación. El programador lo declara en su resumen; lo resuelve el tester.
- Si cualquier otra prueba sale en rojo, es trabajo del programador. Si una de estas 6 falla por otra causa, el programador **se detiene** y lo reporta. **Nunca** vuelve a poner `disabled` para satisfacer `toBeDisabled()`.

**Ronda 1 del tester:**
- Retira las 4 `it.fails` de forma definitiva.
- Adapta la preparación de las pruebas que dependían de `disabled`. Por ejemplo, `emularCorreccionDelFocoDeChromium` pasa a comprobar F-1 (`aria-disabled`, sin `disabled`, el foco puesto), y el camino "foco en `<body>`" se sigue cubriendo con `clicEnZonaNoEnfocable`.
- No debilita ninguna aserción final. Justifica cada cambio en su reporte y publica los hashes nuevos de las 32 `*.ataque`, más las que agregue.

### D-8 · Densidad por rol
`--control-height` vale 2.75rem (44 px) en `:root` y 2.25rem (36 px) en `[data-rol="admin"]`. Lo usan:
- `Button`, tamaños `default` e `icon`;
- `Input`.

El tamaño `sm` es fijo, de 36 px, para acciones en línea en cualquier rol (§7.1). Las pantallas sin marco (login y cuentas) usan el valor de `:root`.

### D-9 · Login y registro
- **Rejilla:** en `lg`, `[minmax(0,1fr)_minmax(0,28rem)]` con 40 px de margen; en móvil, una columna con el panel arriba (RF-06).
- **Panel** (`<aside aria-label="Anuncios" data-superficie="acento">`):
  - fondo `--accent`, `rounded-xl`, relleno de 32 px arriba y abajo y 36 px a los lados en `lg`, y de 20 px en móvil;
  - `h2` "Avisos del colegio" en `text-h2` y `--accent-foreground`;
  - una sola lista desplazable (`ul`, S-12): `max-h-56` en móvil y `lg:flex-1 lg:min-h-0` en escritorio, siempre con `overflow-y-auto`;
  - cada anuncio es una tarjeta crema (`bg-background text-foreground rounded-lg`): título `text-h3` y texto `text-body text-muted-foreground`. En móvil, título `text-body font-bold` y texto `text-small line-clamp-1`.
- **Formulario:** `Card` con `Monograma` y `h1` "CMEP <span class=text-brand>Campus Digital</span>" en `text-h1`. El nombre accesible sigue siendo exactamente "CMEP Campus Digital".
- **Registro:** la misma rejilla y el mismo panel.

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

### Dependencias (con P-05)
| Paquete | Rango | Qué se importa | Por qué no basta lo que hay |
|---|---|---|---|
| `@fontsource/bricolage-grotesque` | `^5.3.0` | `latin-500.css`, `latin-700.css` | El sistema no tiene la familia de títulos de la dirección C. Google Fonts por CDN no es proveedor aprobado (`DESIGN.md` §4) |
| `@fontsource/atkinson-hyperlegible-next` | `^5.3.0` | `latin-400.css`, `latin-500.css`, `latin-700.css` | Familia de texto decidida por el humano (distingue I, l y 1; O y 0) |
| `@fontsource/atkinson-hyperlegible-mono` | `^5.3.0` | `latin-500.css` | Códigos de clase. Hoy no hay ninguno en pantalla, pero el token `--font-mono` se define ahora, con su valor de §4 |

- **Seis archivos WOFF2 en total**, estimados en unos 150 KB entre todos. El navegador solo descarga los pesos que usa la página.
- **Sin paquetes variables:** cada archivo trae los pesos del 200 al 800, y §4 pide cargar solo los de su tabla.
- **Sin `latin-ext`** (S-13).
- **Instalación, desde la raíz:**
  ```
  npm install @fontsource/bricolage-grotesque@^5.3.0 @fontsource/atkinson-hyperlegible-next@^5.3.0 @fontsource/atkinson-hyperlegible-mono@^5.3.0 -w frontend
  ```
  Antes, `npm view <paquete> version` para cada uno. **Detente** si alguno no existe, si su versión mayor no es 5 o si le falta alguno de los archivos `latin-<peso>.css` de la tabla.
- **Nombre de la familia:** tómalo literal del `font-family` de cada `latin-<peso>.css` instalado. Previsto: "Bricolage Grotesque", "Atkinson Hyperlegible Next" y "Atkinson Hyperlegible Mono".

### frontend/src/styles/
**`tokens.css`** (reescrito). Valores literales de `DESIGN.md` §3 en hexadecimal:
- **`:root`:**
  - `--background` `#F7F5EF`, `--surface` `#FFFFFF`, `--foreground` `#16202E`, `--muted` `#EFECE3`, `--muted-foreground` `#3D4654`, `--border` `#DDD8CB`;
  - `--primary` `#22409A`, `--primary-foreground` `#FFFFFF`;
  - `--accent` `#22409A`, `--accent-foreground` `#F7F5EF`, `--accent-soft` `#E1E7F7`;
  - `--brand` `#1D5B4B`, `--brand-foreground` `#F7F5EF`, `--brand-soft` `#E1EEE8`;
  - `--success` `#1D5B4B`, `--success-soft` `#E1EEE8`, `--warning` `#8A5A0B`, `--warning-soft` `#F6EBD3`;
  - `--danger` `#A3341F`, `--danger-soft` `#F7E4DE`, `--destructive` `#A3341F`, `--destructive-foreground` `#FFFFFF`;
  - derivados: `--card` y `--popover` → `var(--surface)`; `--card-foreground` y `--popover-foreground` → `var(--foreground)`; `--secondary` → `var(--muted)`; `--secondary-foreground` → `var(--foreground)`; `--input` → `var(--foreground)`; `--ring` → `var(--accent)`;
  - `--radius: 0.5rem` y `--control-height: 2.75rem`.
- **Densidad y foco por superficie:** `[data-rol="admin"] { --control-height: 2.25rem }`; `[data-superficie="acento"], [data-superficie="marca"] { --ring: var(--background) }`; `[data-superficie="destacada"] { --ring: var(--accent) }`.
- **`@theme`** (anulación y escalas propias):
  - `--color-*`, `--text-*`, `--font-*`, `--font-weight-*`, `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*` y `--text-shadow-*`, todos con `initial`;
  - `--font-sans: "Atkinson Hyperlegible Next", ui-sans-serif, system-ui, sans-serif`; `--font-heading: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif`; `--font-mono: "Atkinson Hyperlegible Mono", ui-monospace, monospace`;
  - `--font-weight-normal: 400`, `--font-weight-medium: 500`, `--font-weight-bold: 700`;
  - escala de §4, con `--text-<n>--line-height`, `--text-<n>--letter-spacing` y, solo en los títulos, `--text-<n>--font-weight`:

    | Token | Tamaño | Interlineado | Interletraje | Peso |
    |---|---|---|---|---|
    | `display` | 2.75rem | 1.05 | −0.03em | 700 |
    | `h1` | 1.75rem | 1.15 | −0.02em | 700 |
    | `h2` | 1.375rem | 1.2 | −0.015em | 700 |
    | `h3` | 1.125rem | 1.3 | −0.01em | 500 |
    | `body` | 1rem | 1.5 | 0 | — |
    | `small` | 0.875rem | 1.45 | 0 | — |
    | `caption` | 0.75rem | 1.35 | 0 | — |

  - `--shadow-overlay: 0 8px 24px rgb(22 32 46 / 0.12)`.
- **`@theme inline`:** `--color-<token>: var(--<token>)` para todos los colores de `:root`, los derivados incluidos. Radios: `--radius-sm: calc(var(--radius) - 4px)`, `--radius-md: calc(var(--radius) - 2px)`, `--radius-lg: var(--radius)` y `--radius-xl: calc(var(--radius) + 4px)`.
- El comentario de cabecera ya no dice "provisionales".

**`index.css`:** conserva `@import "tailwindcss"`, `@import "tw-animate-css"` e `@import "./tokens.css"`. En `@layer base`:
- `* { @apply border-border }`;
- `html { @apply bg-background text-foreground font-sans text-body }` (no se usa `var(--font-sans)` a mano);
- `h1, h2, h3 { @apply font-heading }` (el peso lo da cada token);
- `code, kbd { @apply font-mono }`;
- `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`;
- se elimina la regla actual con `ring-*`.

**`tokens.test.ts`** (nuevo, prueba del programador). Importa `./tokens.css?raw`.
- Primero comprueba que el texto no está vacío. Si sale vacío por `css: false`, **detente** y repórtalo; no cambies la configuración de Vitest.
- Resuelve los `var()` del bloque `:root` y comprueba:
  - cada valor de la tabla de arriba;
  - que existen `--shadow-overlay` y la anulación `--color-*: initial`;
  - los pares de contraste de `DESIGN.md` §3, con una función WCAG escrita en el propio archivo de prueba: 4.5 como mínimo para texto; 3 como mínimo para `--input` contra `--surface` y `--background`, `--ring` contra `--background` y `--surface`, y `--background` contra `--accent` y `--brand` (foco sobre superficie).

### frontend/src/main.tsx
Antes de `import "./styles/index.css"`, seis importaciones: `@fontsource/bricolage-grotesque/latin-500.css`, `…/latin-700.css`, `@fontsource/atkinson-hyperlegible-next/latin-400.css`, `…/latin-500.css`, `…/latin-700.css` y `@fontsource/atkinson-hyperlegible-mono/latin-500.css`. Se importan aquí, y no dentro de `index.css`, para que Vite resuelva las `url()` relativas de cada `@font-face`. Nada más cambia.

### frontend/src/lib/
- **`utils.ts`:** `cn` usa `extendTailwindMerge({ extend: { classGroups: { "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "small", "caption"] }], shadow: [{ shadow: ["overlay"] }] } } })`.
- **`utils.test.ts`** (nuevo):
  - `cn("text-small", "text-destructive")` conserva las dos;
  - `cn("text-small", "text-body")` → `"text-body"`;
  - `cn("shadow-overlay", "text-foreground")` conserva las dos.
- **`format.ts` (Fase B):** `inicialesDe(nombre: string): string`.
  - Toma el primer carácter (con `Array.from`) de las dos primeras palabras, en mayúsculas `es-MX`.
  - Con una sola palabra, su primer carácter.
  - Ignora los espacios repetidos.
  - Ejemplos: "Ana López" → "AL"; "Álvaro de la Cruz" → "ÁD"; "Ana" → "A".
  - Pruebas en `format.test.ts`.

### frontend/src/components/ui/
- **`button-variants.ts`:**
  - **Base:** `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-small font-bold whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`. Sin `outline-none`, `ring-*` ni `aria-invalid:*`.
  - **Variantes:**
    - `primary`: `bg-primary text-primary-foreground hover:bg-primary/90`, más las tres clases `in-data-[superficie=destacada]` de §D-3;
    - `outline`: `border-2 border-input bg-surface text-foreground hover:bg-muted`;
    - `destructive`: `bg-destructive text-destructive-foreground hover:bg-destructive/90`;
    - `ghost`: `text-foreground hover:bg-muted`;
    - `link`: `text-accent underline-offset-4 hover:underline`.
  - **Tamaños:**
    - `default`: `h-(--control-height) px-5`;
    - `sm`: `h-9 px-3`;
    - `icon`: `size-(--control-height)`;
    - `icon-sm`: `size-9`;
    - `enlace`: `min-h-11 w-fit px-0`, para enlaces sueltos con objetivo de 44 px.
  - Se retiran `secondary`, `xs`, `lg`, `icon-xs` e `icon-lg` (S-15). La variante por defecto sigue siendo `outline`.
- **`button.tsx`:** propiedad `enEspera` según §D-4.
  - Tipo: `ComponentProps<"button"> & VariantProps<typeof buttonVariants> & ({ asChild?: false; enEspera?: boolean } | { asChild: true; enEspera?: never })`.
  - Con `enEspera`, renderiza `aria-disabled="true"`, `aria-busy="true"` y `data-en-espera=""`; sin él, ninguno de los tres atributos: nada de `"false"`.
  - El `onClick` envuelto hace `preventDefault()` y sale si `enEspera`; si no, llama al original.
  - Muestra el `LoaderCircle` antes de `children`.
  - Sin `any`.
- **`button.test.tsx`** (nuevo, del programador):
  - con `enEspera`: `aria-disabled` y `aria-busy` en `"true"`, `not.toBeDisabled()`, el mismo nombre accesible y un `svg[aria-hidden="true"]`;
  - `onClick` no se llama;
  - en un `form` con `onSubmit` espía:
    - control sin `enEspera`: `fireEvent.click` en el botón de envío llama a `onSubmit` una vez, lo que prueba que jsdom envía;
    - con `enEspera`: 0 llamadas;
  - el foco se conserva al pasar a `enEspera` con `rerender`;
  - una línea `// @ts-expect-error` con `asChild` y `enEspera` juntos (la comprueba `tsc -b`);
  - `primary` renderizado dentro de `<div data-superficie="destacada">` lleva en `className` la clase `in-data-[superficie=destacada]:bg-foreground`.
- **`input.tsx`:** `h-(--control-height) w-full min-w-0 rounded-lg border-2 border-input bg-surface px-3 text-body text-foreground transition-colors duration-150 selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-small file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive`. Se retiran `bg-transparent`, `shadow-xs`, `text-base md:text-sm`, `outline-none` y los `ring`.
- **`card.tsx`:**
  - `Card`: `flex flex-col gap-6 rounded-lg border border-border bg-card py-6 text-card-foreground`, sin sombra;
  - `CardTitle`: `font-heading text-h3`;
  - `CardDescription`: `text-small text-muted-foreground`;
  - el resto sin cambios.
- **`dialog.tsx`** (sin consumidores hoy):
  - overlay: `fixed inset-0 z-50 bg-foreground/40`, sin animaciones;
  - contenido: `fixed inset-0 z-50 m-auto grid h-fit w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border border-border bg-surface p-6 text-foreground shadow-overlay outline-none sm:max-w-lg`, sin `animate-*`, `zoom-*`, `fade-*` ni `duration-200`;
  - botón de cerrar: `absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground [&_svg]:size-4`. Se quitan `opacity-*`, `ring-*`, `focus:outline-hidden` y **`data-[state=open]:bg-accent`**, que con nuestro `--accent` pintaría la X de azul;
  - `DialogTitle`: `font-heading text-h2`;
  - `DialogDescription`: `text-small text-muted-foreground`.
- **`label.tsx`** (nuevo, sin Radix): `function Label({ className, ...props }: ComponentProps<"label">)` con `text-small font-bold text-foreground`.
- **`sonner.tsx`** (nuevo): exporta `Toaster` sobre el de `sonner`, con:
  - `position="top-right"`;
  - `icons` de éxito (`CircleCheck`, `size-4 text-success`) y de error (`CircleAlert`, `size-4 text-destructive`);
  - `style`, tipado como `CSSProperties`, con `--normal-bg: var(--surface)`, `--normal-text: var(--foreground)`, `--normal-border: var(--border)` y `--border-radius: var(--radius)`;
  - `toastOptions={{ classNames: { toast: "font-sans shadow-overlay!" } }}` (R-14).

### frontend/src/components/ (piezas compartidas)
- **`cargando.tsx`:** el icono pasa a `size-4 animate-spin motion-reduce:animate-none`. El resto igual.
- **`mensaje-error.tsx`:**
  - contenedor `rounded-lg border border-destructive bg-surface p-4`;
  - título `font-bold text-destructive`;
  - mensaje `text-small`;
  - la misma estructura y el mismo `role="alert"`.
- **`error-de-campo.tsx`** (nuevo): `ErrorDeCampo({ id, children })` → `<p id={id} className="flex items-start gap-1.5 text-small text-destructive"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{children}</p>`. Sustituye a cada `<p id="…-error" className="text-sm text-destructive">`, con el mismo `id` y el mismo texto. Las pruebas localizan el error por su texto.
- **`avatar-usuario.tsx`** (Fase B): `AvatarUsuario({ nombre })` es un círculo `size-11 rounded-full bg-accent text-accent-foreground font-bold text-small` con `inicialesDe(nombre)`, y `aria-hidden="true"`. El nombre ya aparece como texto a su lado.

### frontend/src/components/layout/ (Fase B)
- **`types.ts`:** además de `Rol`, `export interface Destino { etiqueta: string; ruta: string; Icono: LucideIcon }`.
- **`monograma.tsx`:** `Monograma()` es un `span` `inline-flex size-13 items-center justify-center rounded-lg bg-brand font-heading text-h2 text-brand-foreground` con "cm", y `aria-hidden="true"`.
- **`barra-lateral.tsx`:** `BarraLateral({ destinos }: { destinos: Destino[] })`.
  - `<nav aria-label="Navegación principal">`.
  - **< 768 px:** barra inferior, `fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-background`; cada elemento, `flex-1`.
  - **≥ 768 px:** `md:sticky md:top-0 md:h-svh md:w-24 md:flex-col md:items-center md:gap-4 md:border-t-0 md:border-r md:py-6`.
  - `Monograma` visible solo en `md`.
  - Cada `NavLink` (`end`): `flex flex-col items-center justify-center gap-1 rounded-lg text-caption font-medium`, de 72 × 60 px en `md` (`md:h-15 md:w-18`). El icono es de 20 px (`size-5`, `aria-hidden`).
  - Activo: `bg-accent text-accent-foreground font-bold`. Inactivo: `text-muted-foreground hover:bg-muted`.
- **`encabezado.tsx`:** `Encabezado({ nombre, etiquetaRol, onCerrarSesion, cerrando })`.
  - `<header class="flex h-16 items-center justify-between gap-3 px-4 md:h-24 md:px-10">`.
  - Izquierda: `<p class="font-heading text-h3 font-bold">CMEP <span class="text-brand">Campus Digital</span></p>`. No es un encabezado: el único `h1` es el de la página.
  - Derecha:
    - `<p class="sr-only sm:not-sr-only flex flex-col text-right text-small">`, con el nombre (`font-bold`) y el rol (`text-muted-foreground`), cada uno en su propio `span`, como hoy;
    - `AvatarUsuario`;
    - `Button variant="outline" enEspera={cerrando}` con `LogOut` y `<span class="sr-only sm:not-sr-only">Cerrar sesión</span>`. Su nombre accesible siempre es "Cerrar sesión".
  - El texto "Cerrar sesión" sale de la propiedad `etiquetaCerrarSesion`, que `RequireRol` pasa desde `TEXTOS_SESION.cerrarSesion`, o se deja literal como hoy en `contenedor-rol.tsx`. Opción elegida: **literal**, como hoy, para no ampliar las propiedades.
- **`contenedor-rol.tsx`:**
  - Recibe además `destinos: Destino[]`.
  - Compone el marco de §D-6.
  - `ESPACIADO_POR_ROL` = `{ estudiante: "gap-6", maestro: "gap-6", admin: "gap-4" }`.
  - `data-rol` en la raíz.
  - No importa nada de `features/`.
- **`contenedor-rol.test.tsx`** (nuevo, del programador; con `MemoryRouter`):
  - una sola `navigation` "Navegación principal";
  - el destino activo con `aria-current="page"`;
  - un solo botón "Cerrar sesión";
  - con `cerrando`, ese botón tiene `aria-disabled="true"` y conserva el foco;
  - `data-rol` según el rol;
  - el nombre y el rol como texto exacto.
- **`layout-publico.tsx`:** sin cambios.

### frontend/src/app/
- **`providers.tsx`:** importa `Toaster` de `@/components/ui/sonner`. Pasa a `<Toaster />`, sin `position` ni `richColors`, que ya fija el componente.
- **`destinos.ts`** (nuevo, Fase B):
  ```ts
  export const DESTINOS_POR_ROL: Record<Rol, Destino[]> = {
    estudiante: [{ etiqueta: "Inicio", ruta: rutaPorRol("estudiante"), Icono: House }],
    maestro: [{ etiqueta: "Inicio", ruta: rutaPorRol("maestro"), Icono: House }],
    admin: [{ etiqueta: "Cuentas", ruta: rutaPorRol("admin"), Icono: UserCog }],
  }
  ```
  Con P-01, opción A.
- **`require-rol.tsx`:** pasa `destinos={DESTINOS_POR_ROL[rol]}`. Nada más cambia.
- **`router.tsx`, `require-sesion.tsx` y `require-cambio-de-contrasena.tsx`:** sin cambios.

### frontend/features/auth/
- **Formularios** (`formulario-login`, `-registro`, `-recuperar`, `-nueva-contrasena` y `-cambiar-contrasena`), en la Fase A:
  - `<label className="text-sm font-medium">` → `<Label>`;
  - los errores de campo → `ErrorDeCampo`;
  - las ayudas `text-sm text-muted-foreground` → `text-small text-muted-foreground`;
  - los enlaces sueltos → `className={buttonVariants({ variant: "link", size: "enlace" })}` sobre `<Link>`, sin `asChild`;
  - `disabled={x.isPending} aria-busy={x.isPending}` → `enEspera={x.isPending}`, también en "Cerrar sesión" de `formulario-cambiar-contrasena`;
  - las guardas `if (x.isPending) return` se quedan.
- **`login-view.tsx` y `registro-view.tsx`** (Fase B): rejilla de §D-9. El aviso de `role="status"` pasa a `text-small text-success`, con el mismo icono y la misma estructura. Por ahora el login conserva la rejilla y cambia solo las clases (Fase A).
- **`panel-anuncios.tsx`** (Fase B): patrón de §D-9. La `lista` lleva `tabIndex={0}` y `aria-label="Lista de anuncios"`; este texto va a `TEXTOS_LOGIN`, **excepción única** a "no se toca `data.ts`": se **agrega** la clave `listaAnuncios`, sin modificar ninguna existente.
- **`tarjeta-de-cuenta.tsx`** (Fase B): `main` centrado; `Card w-full max-w-md`; `CardHeader` con `Monograma` y `h1` en `text-h1`.
- **`acceso-restringido-view.tsx`:**
  - Fase A: clases y `enEspera`.
  - Fase B: `Card` como `tarjeta-de-cuenta`; icono `Lock` en lugar de `Ban` (§7.6), en `text-danger`.
  - Se conserva la estructura `<span><span class="font-bold">Motivo:</span>{" "}{motivo}</span>`: `getByText` busca el motivo como nodo de texto directo (R-08).
  - Sin cambios de lógica.
- **`bienvenida-view.tsx`:** `h1` en `text-h1`, que conserva el texto exacto `"Hola, {nombre}"`, y la línea en `text-muted-foreground`.

### frontend/features/admin/
- **Fase A** (en los cuatro componentes y en `cuentas-view.tsx`):
  - `Label`, `ErrorDeCampo` y `enEspera` en "Buscar", "Enviar invitación", "Guardar correo", "Sí, restablecer" y "Copiar";
  - los `h2` pasan de `font-heading text-lg font-semibold tracking-tight` a `text-h3`;
  - el `h1` pasa a `text-h1`;
  - `text-sm` → `text-small`;
  - `ContrasenaTemporal`: contenedor `rounded-lg border border-border bg-muted p-4`, con el mismo `role="status"`; temporal en `text-h3 font-bold tracking-normal font-sans`.
- **`ficha-de-cuenta.tsx`:**
  - `AccionRestablecer` según §D-5;
  - `FichaDeCuenta` **conserva** su raíz `div` con `rounded-lg` (`rounded-lg border border-border bg-surface p-4`) y el `div` que envuelve nombre, correo, rol y "Cuenta inactiva" (R-08).
- **`lib.ts`:** `focoDisponiblePara(contenedor: Element | null, activo: Element | null, cuerpo: Element): boolean`, que devuelve `activo === null || activo === cuerpo || (contenedor !== null && contenedor.contains(activo))`.
- **`lib.test.ts`:** los cuatro casos: nulo, `<body>`, dentro y fuera.
- **`cuentas-view.test.tsx`**, dos pruebas nuevas del programador:
  - con la petición en vuelo, "Sí, restablecer" tiene `aria-disabled="true"`, no está deshabilitado y conserva el foco;
  - "Cancelar" en vuelo, clic fuera (`blur()`), foco en "Nombre completo" y llega la temporal: el foco sigue en "Nombre completo".

### frontend/features/diagnostico/
`h1` en `text-h1`; la línea de "Última respuesta" con `tabular-nums` (§4); `text-sm` → `text-small`. `Card` sin clases extra.

### Inventario de clases que la anulación deja sin efecto, y su sustituto
Sale de leer todos los archivos de `frontend/src` fuera de las pruebas. Las rutas son relativas a `frontend/src`.

| Clase actual | Dónde | Sustituto |
|---|---|---|
| `text-sm` | etiquetas, errores, ayudas, enlaces, avisos y descripciones en `features/auth/components/*`, `features/admin/components/*`, `cuentas-view`, `login-view`, `diagnostico-view`, `contenedor-rol`, `mensaje-error`, `card`, `dialog`, `button-variants` | `text-small` |
| `text-base`, `md:text-sm` | `input.tsx`, `panel-anuncios.tsx` | `text-body` (sin `md:text-sm`) |
| `text-lg`, `lg:text-lg` | `panel-anuncios` (`h2`, título), `dialog` (título), `buscador-de-cuenta` y `formulario-invitar-maestro` (`h2`), `contrasena-temporal` | `text-h2` en el panel y el diálogo; `text-h3` en los `h2` de admin, la temporal y el título de anuncio |
| `text-xl` | `diagnostico-view` (`h1`) | `text-h1` |
| `text-2xl`, `lg:text-2xl` | los `h1` de `login-view`, `registro-view`, `tarjeta-de-cuenta`, `acceso-restringido-view`, `bienvenida-view` y `cuentas-view`; `panel-anuncios` (`h2`) | `text-h1`; en el panel, `text-h2` |
| `text-xs` | tamaño `xs` de `button-variants` | Se retira (S-15) |
| `font-semibold` | `contenedor-rol`, `CardTitle`, `DialogTitle`, `mensaje-error`, `panel-anuncios`, los `h2` de admin, `contrasena-temporal` | `font-bold`, o el peso que ya lleva el token de título |
| `tracking-tight` | todos los `h1` y `h2`, `contenedor-rol` | Se elimina: el interletraje va en `--text-*` |
| `leading-none` | `CardTitle`, `DialogTitle` | Se elimina: el interlineado va en `--text-*` |
| `shadow-sm`, `shadow-xs`, `shadow-lg` | `card`, `input`, `dialog` | Se eliminan; el diálogo pasa a `shadow-overlay` |
| `rounded-md` | `button-variants`, `input`, `contrasena-temporal` | `rounded-lg` |
| `rounded-xl` | `card` | `rounded-lg` (el `rounded-xl` queda para el bloque azul) |
| `rounded-xs` | cerrar del diálogo | `rounded-lg` |
| `ring-*`, `ring-offset-*`, `focus-visible:ring-*`, `focus:ring-*`, `aria-invalid:ring-*` | `button-variants`, `input`, `dialog`, `index.css` | Se eliminan; regla global de §D-2 |
| `outline-none`, `focus:outline-hidden` | `button-variants`, `input`, cerrar del diálogo | Se eliminan (salvo `DialogContent`) |
| `bg-foreground/50` | overlay del diálogo | `bg-foreground/40` (§7.9) |
| `data-[state=open]:bg-accent`, `opacity-70`, `hover:opacity-100` | cerrar del diálogo | `text-muted-foreground hover:bg-muted hover:text-foreground` |
| `transition-all`, `transition-[color,box-shadow]`, `duration-200`, `animate-in`/`animate-out`, `fade-*`, `zoom-*` | `button-variants`, `input`, `dialog` | `transition-colors duration-150`; sin animaciones (§6) |
| `bg-transparent` | `input` | `bg-surface` |
| `border` (1 px) sobre un control | `input`, variante `outline` | `border-2 border-input` |
| `h-9`, `h-8`, `h-10`, `h-6`, `size-9` (alturas de control) | `button-variants`, `input` | `h-(--control-height)`, o `h-9` en `sm` |
| `hover:bg-secondary/80`, `bg-secondary` | variante `secondary` | Se retira (S-15) |
| `animate-spin` sin alternativa | `cargando` | `animate-spin motion-reduce:animate-none` |
| `Ban` (icono) | `acceso-restringido-view` | `Lock` (§7.6), en la Fase B |

Colores de la paleta por defecto (`slate-`, `gray-`, `neutral-`…), `bg-white`, `text-black` o `dark:`: **ninguno** hoy, y V-02 lo mantiene en cero.

### docs/DESIGN.md (lo edita el programador)

**Fase A:**
- §1, fila "Estado de aplicación": "Aplicado en DESIGN-01: `tokens.css`, `components/ui/` y las pantallas existentes".
- §4, "Reglas de carga": importaciones en `main.tsx`, subconjunto `latin` y los seis archivos.
- §5, "Sombras": implementada en `tokens.css`, `Dialog` y `Toaster`.
- §6: sustituye la viñeta "Botones con una petición en vuelo…" por el patrón de §D-4, la regla de `disabled` y las tres defensas contra el doble envío. Agrega el mecanismo de foco sobre superficies (`data-superficie`, §D-2).
- §7.1: `hover` (S-11), tamaños con `--control-height`, tamaño `enlace`, `Label`, `ErrorDeCampo` y el botón sobre el bloque destacado (§D-3).
- §7.9: `Toaster` en `components/ui/sonner.tsx`.
- §10: agregar "Clases de las escalas por defecto de Tailwind (`text-sm`, `font-semibold`, `shadow-md`, `rounded-md` fuera de su uso…): están anuladas y no generan CSS".

**Fase B:**
- §7.2: lo implementado (barra inferior de 64 px, encabezado de 64/96 px, "Cerrar sesión", sin botón de avisos hasta `notificaciones`, nombre y rol junto al avatar, destinos en `app/destinos.ts`, el mismo marco para el admin).
- §7.10 nuevo, "Panel de anuncios del login".
- §7.11 nuevo, "Pantallas de cuenta" (tarjeta centrada con monograma).
- §8: mecanismo de densidad (`--control-height` y `data-rol`) y S-09.
- §11: "Lo marcado como propuesta lo confirma o corrige el primer encargo que lo use".

**Marcas de "propuesta":** se retiran **solo después** de la comprobación del humano (Paso B-9); si el humano rechaza una, se corrige el valor o la marca se queda.

| Marca | Decisión | Criterio |
|---|---|---|
| `--text-h1` (§4) | Se retira si el humano la aprueba (H-02) | Se usa en todos los títulos de página |
| `--shadow-overlay` (§5) | Se retira si el humano la aprueba (H-09) | Se ve en el aviso de "Copiar" |
| Velo de diálogos al 40 % (§7.9) | **Se queda** | Se aplica en `dialog.tsx`, pero ninguna pantalla abre un diálogo |
| Barra inferior por debajo de 768 px (§7.2) | Se retira si el humano la aprueba a 360 px (H-06) | Se implementa en la Fase B |
| Tablas densas del admin (§7.7) | **Se queda** (P-02, opción A) | Sin pantalla |
| Marcadores de carga (§7.8) | **Se queda** | No hay listas |
| Fila "Sin entregar" (§7.5) | **Se queda** | Es de TAREAS |
| "Nadie las ha visto en pantalla" (§4) | Se sustituye por el resultado de H-11 | Comprobación del humano |

### Textos para `CLAUDE.md` (los aplica el orquestador con autorización del humano, al cerrar)
1. **"Componentes"**, viñeta nueva después de "Botón de acción principal…":
   > Un botón cuya petición está en vuelo usa `enEspera` de `Button` (`aria-disabled`, `aria-busy` e indicador de carga), nunca `disabled`: conserva el foco y no dispara su acción. `disabled` queda para un control que no está disponible.
2. **"Tokens"**, viñeta nueva:
   > La paleta y las escalas por defecto de Tailwind (colores, tamaños de letra, pesos, radios y sombras) están anuladas en `tokens.css`. Una clase como `text-sm` o `shadow-md` no genera CSS y se pierde sin error: usa `text-small`, `font-bold`, `rounded-lg`, `shadow-overlay`. `cn` conoce la escala propia (`lib/utils.ts`).
3. **"Ubicaciones compartidas":**
   - `components/ui/`: "…reestilizados, incluidos `label.tsx` y `sonner.tsx` (`Toaster` con el tema)".
   - `components/layout/`: "barra lateral compacta (`BarraLateral`), encabezado (`Encabezado`), `Monograma`, contenedores por rol (`ContenedorRol`, `LayoutPublico`). Los tipos `Rol` (reexportado de `shared/`) y `Destino` viven en `components/layout/types.ts`".
   - `components/`: en la lista de piezas que ya existen, agregar `AvatarUsuario` (`avatar-usuario.tsx`) y `ErrorDeCampo` (`error-de-campo.tsx`).
   - `lib/format.ts`: "…tamaños de archivo e iniciales (`inicialesDe`)".
   - `app/`: "rutas, layouts, guardas por rol y destinos de la barra lateral por rol (`destinos.ts`)".

`AGENTS.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md`: sin cambios.

---

## Acceso a datos
Sin consultas nuevas ni llamadas nuevas a la API. El encabezado usa el `nombre` que `RequireRol` ya lee de la caché de `useMe`. Sin paginación, transacciones ni riesgo de N+1.

## Autorización
- Sin endpoints nuevos. La seguridad sigue en el middleware del backend.
- Las guardas del frontend (`RequireSesion`, `RequireRol` y `RequireCambioDeContrasena`) **no cambian de lógica**. `RequireRol` solo pasa una propiedad más.
- La barra lateral muestra solo los destinos del rol que devuelve `GET /me`. Ocultar un destino no protege nada: el backend responde `403`.
- **Estado de pago:** ninguna pantalla tocada lo muestra ni lo recibe.
- **Acceso restringido:** la pantalla cambia de estilo y de icono, no de lógica. Sigue fuera de `RequireRol` y sin marco: el alumno restringido no ve barra lateral ni destinos.

---

## Pruebas requeridas

### Del programador (normales)
- `styles/tokens.test.ts`: valores, anulación y contraste.
- `lib/utils.test.ts`: `cn` con la escala propia.
- `lib/format.test.ts` (Fase B): `inicialesDe`.
- `components/ui/button.test.tsx`: `enEspera`, clic, envío, foco, tipo y variante sobre el bloque destacado.
- `components/layout/contenedor-rol.test.tsx` (Fase B).
- `features/admin/lib.test.ts`: `focoDisponiblePara`.
- `features/admin/cuentas-view.test.tsx`: dos pruebas nuevas (F-1 y el escenario 4 de T-14).
- `features/auth/login-view.test.tsx`:
  - "deshabilita el botón durante el envío y un doble clic hace una sola petición" pasa a "marca el botón en espera durante el envío…": `toHaveAttribute("aria-disabled", "true")`, `not.toBeDisabled()`, el foco se conserva, un clic y un `submit` más siguen dejando `fetch` en 1 llamada, y al responder `aria-disabled` desaparece. **Es la única prueba existente que depende de `disabled`.**
  - Fase B: el panel tiene `data-superficie="acento"`; la lista, `tabIndex=0` y su nombre; y sigue habiendo un solo `heading` de nivel 1 "CMEP Campus Digital".
- Una prueba de formulario (`registro-view.test.tsx`) comprueba que el error de campo lleva un `svg[aria-hidden="true"]`.

### Pruebas existentes que dependen de `disabled`: inventario y responsable
| Prueba | Tipo | Dependencia | Responsable |
|---|---|---|---|
| `features/auth/login-view.test.tsx` › "deshabilita el botón durante el envío…" | normal | `toBeDisabled()` y `toBeEnabled()` | Programador (Paso A-10) |
| `cuentas-r3.ataque` › 2 pruebas "en Chromium…" | ataque | `emularCorreccionDelFocoDeChromium` exige `toBeDisabled()` | Tester, ronda 1 |
| `cuentas-r4.ataque` › 3 pruebas "en Chromium…" + 3 `it.fails` "en Chromium…" | ataque | ídem | Tester, ronda 1 |
| `cuentas-r3.ataque` y `cuentas-r4.ataque`, `controlesEnfocables()` | ataque | Filtra por el atributo `disabled`. Con `aria-disabled` el botón sigue en la lista, que es lo correcto | Nadie: sigue siendo válida |
| `cuentas-r1.ataque` (`toBeEnabled` en "Copiar"), `cuentas-r3.ataque` y `cuentas-r4.ataque` (`toBeEnabled` en "Sí, restablecer") | ataque | `toBeEnabled()` pasa con `aria-disabled` | Nadie |
| Pruebas de doble envío (`router.ataque` "Crear cuenta", `app/cuentas-r1.ataque`, `enlace-r1.ataque`, `features/admin/cuentas-r1.ataque`, `cuentas-r2.ataque` "…no manda una segunda") | ataque | Dependen de la guarda del manejador y de `enviandoRef`, que se conservan | Nadie: deben seguir en verde |

### Verificaciones del programador y del tester (sin navegador)
Todas desde `frontend/`, salvo que se diga otra cosa. Las búsquedas excluyen `*.test.*`.
- **V-01:** SHA-256 de las 32 `*.ataque` igual a la tabla de AUTH-02 (ronda 4, opción B), al empezar y al terminar el programador.
- **V-02 (paleta por defecto; es el grep de V-07 corregido):** patrón `\b(bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|accent|caret|divide|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b` y `\bdark:` en `src/` → 0.
- **V-03 (escalas anuladas):** `\btext-(xs|sm|base|lg|xl|[2-9]xl)\b`, `\bfont-(thin|extralight|light|semibold|extrabold|black)\b`, `\bshadow-(2xs|xs|sm|md|lg|xl|2xl)\b`, `\brounded-(xs|2xl|3xl|4xl)\b`, `\btracking-(tighter|tight)\b` y `\bleading-none\b` en `src/` → 0.
- **V-04 (valores sueltos):**
  - `#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(` en `src/**/*.{ts,tsx}` y en `styles/index.css` → 0. Solo `tokens.css` los contiene.
  - `\b(text|rounded|shadow|leading|tracking|font)-\[` → 0.
- **V-05:** `outline-none|outline-hidden` → exactamente 1 aparición, en `dialog.tsx` (`DialogContent`). `\bring-(\d|offset|ring|destructive|inset)` → 0.
- **V-06:** `disabled=\{` → 0 y `aria-busy=` → 0 fuera de `components/ui/button.tsx`.
- **V-07:** `bg-accent` solo en `barra-lateral.tsx`, `avatar-usuario.tsx` y `panel-anuncios.tsx`.
- **V-08:** `git status --porcelain -- ../backend ../shared ../infra ../AGENTS.md ../CLAUDE.md ../.claude ../docs/ARCHITECTURE.md ../docs/ARCHITECTURE-ESSENTIALS.md ../docs/PRD.md ../eslint.config.mjs ../package.json` → vacío. `git diff --stat -- src/features/auth/data.ts src/features/admin/data.ts` → vacío, salvo en la Fase B la clave agregada `listaAnuncios`.
- **V-09 (fuentes en `dist/`, después de `npm run build`):**
  - exactamente 6 `.woff2` en `dist/assets/`, todos con `latin` en el nombre y ninguno con `latin-ext`;
  - `fonts.googleapis` y `fonts.gstatic` en `dist/` → 0.
- **V-10 (CSS de `dist/`):**
  - `--color-(red|blue|gray|slate|neutral|zinc|stone|amber|green|white|black)` → 0;
  - aparecen `.text-small`, `.shadow-overlay`, `superficie=destacada` y `outline-offset:2px`, o su forma minificada.
- **V-11:** `npm run lint` desde la raíz (solo comprueba), `npm run test` y `npm run build` desde `frontend/`.
  - Test: los 6 rojos esperados de §D-7 y ningún otro, en la entrega del programador; todo en verde, en la del tester y la del manager.
  - La suite del backend no es obligatoria, porque `backend/` no cambia (V-08). Si alguien la corre, aplica la precondición de red de `AGENTS.md`.

### Comprobación del humano en su navegador (no la hace ningún agente)
Con Vite, la API y el worker en local ("Frontend en local" del README). Cada pantalla, a 1280 × 800 y a 360 × 800 (modo de dispositivo de DevTools):
- **H-01, login:** bloque azul a la izquierda con tarjetas crema, formulario a la derecha y monograma. En móvil, el panel arriba, compacto y con desplazamiento propio. La lista se enfoca con Tab y se desplaza con las flechas.
- **H-02, títulos:** en registro, recuperar (y su confirmación), restablecer (sin token: enlace inválido; con un enlace real), establecer contraseña y `/cambiar-contrasena`, el título de página (`--text-h1`) se ve bien y la tarjeta se ve centrada.
- **H-03, acceso restringido** con un estudiante restringido: motivo, icono de candado y "Cerrar sesión".
- **H-04, `/estudiante` y `/maestro`:** barra lateral de 96 px con "Inicio" activo, y encabezado de 96 px con "CMEP Campus Digital", nombre, rol, avatar y "Cerrar sesión". Compárala con `docs/design/referencia-direccion-c.png`.
- **H-05, `/admin`:** controles de 36 px, formularios, ficha, confirmación y temporal.
- **H-06, a 360 px:** barra inferior de 64 px sin tapar contenido, ningún desplazamiento horizontal en ninguna pantalla y "Cerrar sesión" como icono.
- **H-07, foco:** recorre cada pantalla con Tab. Contorno de 2 px azul separado del control; sobre el panel azul, contorno crema.
- **H-08, botón en espera (MF-05):** con DevTools › Network › "Slow 3G", pulsa "Iniciar sesión":
  - el foco se queda en el botón y aparece el indicador;
  - otro clic, Enter sobre el botón o Enter desde el campo de contraseña **no** mandan una segunda petición a `/api/auth/login`.

  Repite con "Sí, restablecer" en `/admin`.
- **H-09, aviso de "Copiar":** fondo blanco, borde, sombra suave e icono verde; si falla, rojo.
- **H-10, T-14 en Chrome o Edge:**
  1. "Restablecer contraseña" y luego "Sí, restablecer" con el ratón, con la red lenta.
  2. Clic en "Nombre completo" y escribe algo.
  3. Al llegar la temporal, el foco se queda en tu campo. Repite con un clic en el texto de la página antes de ir al campo.
- **H-11, fuentes:**
  - Network › Font: solo `.woff2` del propio origen y nada de `fonts.googleapis`;
  - Elements › Computed › "Rendered Fonts": Atkinson Hyperlegible Next en el texto y Bricolage Grotesque en los títulos;
  - lectura cómoda a 16 px y a 360 px;
  - en `/diagnostico`, activa y desactiva `font-variant-numeric: tabular-nums` en la hora y comprueba que las cifras ocupan el mismo ancho (`tnum`).
- **H-12, movimiento reducido:** DevTools › Rendering › "prefers-reduced-motion: reduce". El indicador de carga deja de girar y el texto se queda.

---

## Puntos de ataque para el Tester
1. **Ronda 0** (§D-7), si P-03 es (A).
2. **`enEspera` en los 13 botones:**
   - doble clic en el mismo instante y separado por una tarea;
   - `fireEvent.submit` y `form.requestSubmit()` en vuelo;
   - que el nombre accesible no cambie;
   - que el foco se conserve y que el botón siga en el orden de tabulación;
   - que desaparezca `aria-disabled` al asentarse, con éxito y con error;
   - "Cerrar sesión" en el marco, en `/cambiar-contrasena` y en `/acceso-restringido`;
   - "Copiar" con `writeText` lento.
3. **T-14 y el contrato F-1 a F-4:**
   - los 4 escenarios;
   - moverse con Tab fuera y volver antes de la respuesta;
   - cambio de ventana, con `activeElement` conservado;
   - `<StrictMode>`;
   - cancelar en vuelo con éxito y con error;
   - buscar otra cuenta en vuelo (la temporal perdida es un pendiente conocido de ADMIN, no un hallazgo nuevo, salvo que haya empeorado);
   - un `500` seguido de un reintento.
4. **Regresión:** las 32 `*.ataque` (V-01), y las de doble envío, en especial.
5. **Anulación de la paleta:** V-02 a V-05 y V-10 por tu cuenta. Busca clases por defecto que se hayan colado en el código nuevo y cualquier color o tamaño suelto.
6. **`cn` y `tailwind-merge`:** combinaciones de `text-small` o `text-h1` con colores y con `className` de quien llama.
7. **Marco:**
   - una sola `nav` y un solo "Cerrar sesión";
   - `aria-current`;
   - destinos del rol correcto;
   - tras cerrar la sesión y entrar con otro rol, ni los destinos ni el nombre del anterior;
   - el restringido sin marco.
8. **Login:**
   - un solo `h1` con el nombre exacto;
   - una sola coincidencia de `/Acude a administración/`;
   - sin `role="status"` si no hay aviso;
   - las etiquetas "Correo" y "Contraseña" únicas.
9. **Tokens:** valores y contraste contra `DESIGN.md` §3; pares no listados que aparezcan en el código nuevo (por ejemplo, `text-muted-foreground` sobre `bg-accent`).
10. **Fuentes en `dist/`** (V-09).
11. **Invariantes de DOM de R-08.**

---

## Riesgos y desacuerdos
- **R-01 · Contradicción PRD–DESIGN (pregunta no bloqueante, para CLASES).** PRD §7, "Patrones a conservar", pide una "barra lateral con lista de clases". `DESIGN.md` §7.2 define una barra compacta de iconos de 96 px, donde no cabe una lista. Aquí no afecta, porque no hay clases, pero hay que resolverlo antes de planear CLASES. ¿La lista de clases va en la barra (y entonces la barra deja de ser compacta en ese contexto) o en el dashboard y el menú de clases?
- **R-02 · §7.1 frente a §8 en la altura de los campos del admin.** Resuelto con S-09. Si el humano prefiere campos de 44 px en `/admin`, basta con no redefinir `--control-height` para `data-rol="admin"`.
- **R-03 · Tailwind ignora sin error las clases desconocidas.** Mitigado con el inventario, V-02 a V-05 y V-10.
- **R-04 · `tailwind-merge` y la escala propia.** Sin `extendTailwindMerge`, `cn` borraría tamaños de letra. Mitigado con `utils.ts` y su prueba.
- **R-05 · Variante `in-data-[…]`.** Si la versión instalada no la genera, se usa el selector arbitrario (§D-3). V-10 lo detecta.
- **R-06 · Comportamiento real del foco.** jsdom no reproduce la corrección del foco de Chromium, ni Safari, que no enfoca los botones con el clic, ni Firefox. F-2 no depende de eventos `blur`, así que debería ser robusto; queda sin verificar en un navegador real hasta H-08 y H-10.
- **R-07 · Rojos esperados entre el programador y la ronda 1 del tester.** Riesgo de que el programador "arregle" el código para satisfacer `toBeDisabled()`. Prohibido de forma explícita en §D-7. El manager verifica que ningún botón en vuelo usa `disabled` (V-06).
- **R-08 · Pruebas de ataque acopladas al DOM.** El programador conserva:
  - un solo botón "Cerrar sesión" por pantalla;
  - una sola `nav`;
  - el `h1` "Hola, {nombre}";
  - el rol como texto exacto ("Estudiante") en su propio elemento;
  - en el login, un solo `heading` "CMEP Campus Digital", las etiquetas "Correo" y "Contraseña" únicas y ningún `role="status"` sin aviso;
  - en la ficha de admin, la raíz `div.rounded-lg` como primer ancestro `div.rounded-lg` del nombre, el `div` inmediato del nombre conteniendo el correo, el icono junto a "Cuenta inactiva" y la temporal dentro de `role="status"`;
  - el motivo de la restricción como nodo de texto directo;
  - el nombre accesible de los botones sin cambios en vuelo;
  - los `aria-label` de los formularios.
- **R-09 · Archivos de Fontsource e importación `?raw`.** Si no existen los `latin-<peso>.css` esperados, o si `?raw` devuelve vacío con `css: false`, el programador se detiene. No cambia la configuración.
- **R-10 · AUTH-03** cambiará el formulario del cambio obligatorio (sin la temporal). Aquí se reestiliza igual; el retrabajo es mínimo.
- **R-11 · Carril.** La tabla de carriles de `AGENTS.md` pone "restricción de acceso" en el carril sensible. Aquí `acceso-restringido-view.tsx` cambia solo de clases, de icono y de `enEspera`, sin lógica, y el humano fijó el carril normal. Lo señalo para que el manager lo confirme.
- **R-12 · `tw-animate-css` queda sin uso.** Desinstalarlo es un cambio de dependencias: pendiente para un `chore` con aprobación.
- **R-13 · Barra inferior y área segura de iOS.** No se trata `env(safe-area-inset-bottom)`. Si H-06 muestra un problema en un iPhone real, se corrige en un encargo aparte.
- **R-14 · Estilos de `sonner`.** Se inyectan en tiempo de ejecución; la sombra se sustituye con `!important`. Solo se ve en H-09.
- **R-15 · `--text-display` a 32 px por debajo de 640 px** (§4) no tiene token. Lo resuelve el encargo del primer dashboard.
- **R-16 · Tamaño del encargo.** Si P-04 es (B), una sola entrega amplía la superficie que el tester debe atacar y lo que el humano debe revisar a la vez.

Sin desacuerdos con `ARCHITECTURE-ESSENTIALS.md`.

---

## Pasos de implementación

Reglas para todos los pasos:
- **Formateadores:** solo `npx prettier --write <rutas concretas>`, desde `frontend/`, sobre los archivos que tocaste. Nunca `npm run format` (formatearía también las `*.ataque`), nunca desde la raíz y nunca `--fix` fuera de `frontend/`.
- **Sin navegadores ni `npm run dev`:** no hacen falta. Git, solo de lectura. No leas ningún `.env`.
- **Procesos largos:** si arrancas uno, redirige su salida a un archivo, sin tubería.
- Si una condición de "detente" se cumple, te detienes y lo reportas.

### Antes del programador
0. **Ronda 0 del tester** (§D-7), si P-03 es (A). El programador no empieza sin la sección "Ronda 0" en `reporte-tester.md`, con las 4 fallas confirmadas en la aserción final.

### Fase A (DESIGN-01a si P-04 es A)
- **A-1 · Precondiciones.** `git status --porcelain` limpio en `frontend/`; V-01 al empezar. Si falla, **detente**.
- **A-2 · Dependencias (P-05).** `npm view` y `npm install` según "Dependencias", desde la raíz. Comprueba los seis `latin-<peso>.css` y los nombres de las familias. Si falta algo, **detente**.
- **A-3 · Estilos y fuentes.** `tokens.css`, `index.css` y las seis importaciones en `main.tsx`.
- **A-4 · `cn`.** `lib/utils.ts` y `lib/utils.test.ts`.
- **A-5 · Prueba de tokens.** `styles/tokens.test.ts`. `npm run test` desde `frontend/`.
- **A-6 · `components/ui/`.** `button-variants.ts`, `button.tsx`, `button.test.tsx`, `input.tsx`, `card.tsx`, `dialog.tsx`, `label.tsx` y `sonner.tsx`; `app/providers.tsx`.
- **A-7 · Piezas compartidas.** `cargando.tsx`, `mensaje-error.tsx` y `error-de-campo.tsx`.
- **A-8 · Botones en espera.** Migra los 13 botones a `enEspera` y retira `disabled`/`aria-busy`; conserva las guardas. Aplica `Label`, `ErrorDeCampo` y los enlaces con `buttonVariants`.
- **A-9 · T-14.** `features/admin/lib.ts` (`focoDisponiblePara`) y su prueba; `ficha-de-cuenta.tsx` según §D-5; las dos pruebas nuevas de `cuentas-view.test.tsx`.
- **A-10 · Migración de clases.** Aplica el inventario en todos los archivos restantes, `contenedor-rol.tsx` incluido. Ajusta la prueba de `login-view.test.tsx` y agrega la del `svg` en `registro-view.test.tsx`.
- **A-11 · `DESIGN.md`**, partes de la Fase A. Sin quitar marcas.
- **A-12 · Verificación y resumen.** V-01 a V-11. Escribe `resumen-programador.md` con:
  - la salida de cada V;
  - la lista de los 6 rojos esperados, con la línea de cada falla;
  - la nota sobre las 3 `it.fails` que fallan en la preparación.

  Si P-04 es (A), aquí entran el tester, el manager y el PR de 01a.

### Fase B (DESIGN-01b si P-04 es A)
- **B-1 · Iniciales.** `lib/format.ts` (`inicialesDe`) y su prueba.
- **B-2 · Piezas del marco.** `components/avatar-usuario.tsx`, `components/layout/monograma.tsx` y `components/layout/types.ts` (`Destino`).
- **B-3 · Marco.** `barra-lateral.tsx`, `encabezado.tsx`, `contenedor-rol.tsx` y `contenedor-rol.test.tsx`; `app/destinos.ts` y `app/require-rol.tsx`.
- **B-4 · Login y registro.** `panel-anuncios.tsx` (con la clave nueva `listaAnuncios` en `TEXTOS_LOGIN`), `login-view.tsx` y `registro-view.tsx`; pruebas de la Fase B en `login-view.test.tsx`.
- **B-5 · Pantallas de cuenta.** `tarjeta-de-cuenta.tsx`, `acceso-restringido-view.tsx` y `bienvenida-view.tsx`.
- **B-6 · Admin y diagnóstico.** `cuentas-view.tsx` (solo el espaciado dentro del marco) y `diagnostico-view.tsx` (`tabular-nums`).
- **B-7 · `DESIGN.md`**, partes de la Fase B. Sin quitar marcas.
- **B-8 · Verificación y resumen.** V-01 a V-11 y `resumen-programador.md`. Luego, tester (ronda 1 de 01b, o la ronda 1 del encargo único si P-04 es B), manager final y comprobación del humano (H-01 a H-12).
- **B-9 · Tras la comprobación del humano** (carril trivial, antes del commit): el programador aplica en `DESIGN.md` la tabla de marcas según el veredicto de cada punto H y actualiza el párrafo de §4 con el resultado de H-11. El orquestador aplica los textos de `CLAUDE.md`, con autorización del humano, y actualiza `docs/ESTADO.md`.
