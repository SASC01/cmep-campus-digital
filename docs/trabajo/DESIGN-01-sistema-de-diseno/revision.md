# Revisión del Manager — DESIGN-01 · sistema de diseño D3 — plan

## DESIGN-01a — plan

Veredicto: APROBADO (sin problemas que bloqueen). El plan sigue en estado BLOQUEADO hasta que el humano responda P-07 y P-08. Si elige la (A) en las dos, está listo para su aprobación escrita. Con cualquier otra opción, el arquitecto ajusta las secciones que se indican en "Para el humano" y yo reviso solo esos cambios.

Verificación propia (línea base en `6868e4d`, desde `frontend/`):
- **lint:** código 0.
- **test:** código 0; 25 archivos y 258 pruebas: 254 en verde y 4 fallos esperados (T-14).
- **build:** código 0.
- **`*.ataque`:** los SHA-256 de las 32 coinciden con la tabla vigente de AUTH-02 (32/32 OK). Son 11 en `frontend/` y 21 en `backend/`.
- **Árbol de trabajo:** igual que al empezar. `git status` muestra solo esta carpeta; `dist/` está ignorado.
- **Experimentos:** los corrí en el scratchpad, fuera del repositorio, sin modificar ningún archivo del proyecto.

### Afirmaciones técnicas verificadas
| Afirmación del plan | Cómo la comprobé | Resultado |
|---|---|---|
| **M-01 / E-3:** con `css: { include: [/…tokens\.css\?raw$/] }`, `tokens.css?raw` llega con su texto y el resto del CSS sigue vacío (Vitest 4.1.11) | Leí `CSSEnablerPlugin` (`cli-api.CnMVyzaz.js`, 10020-10050) y `defaults.9aQKnqFk.js:68`. Además, corrí Vitest con una configuración del scratchpad (la de `vite.config.ts` más esa `include`): `tokens.css?raw` contiene `--background` e `index.css?raw` llega como `""`. Contraprueba con `css: false`: `tokens.css?raw` llega vacío y la aserción falla | **Confirmada.** La condición de parada de §D-2 no debería dispararse |
| `vite:css` y `@tailwindcss/vite` excluyen `?raw`; `vite:asset` lo carga como texto | `node.js:717` (`SPECIAL_QUERY_RE`), 29241-29245 y 31838-31856; `@tailwindcss/vite`, expresión `D` | Confirmada |
| `?raw` tiene tipo sin tocar `tsconfig` | `tsconfig.app.json` carga `vite/client`, que declara `*?raw` | Confirmada |
| **`in-data-[material=opaco]:` existe en Tailwind 4.3** | Compilé con `@tailwindcss/node` 4.3.3 y el tema anulado del plan | **Confirmada:** genera `:where([data-material="opaco"]) .x`, así que no suma especificidad y la variante se emite después de `.vidrio-fuerte`. `in-data-[…]:hover:bg-muted` y `hover:vidrio-fuerte` (el `ghost`) también generan CSS. No hace falta la alternativa arbitraria |
| La anulación deja sin CSS las escalas por defecto | La misma compilación | `text-sm`, `rounded-lg`, `shadow-sm`, `font-semibold`, `backdrop-blur-md`, `bg-white` y `text-black` no generan CSS. `rounded-full`, `bg-transparent`, `border-transparent`, `font-medium`, `font-bold` y `leading-tight` sí. `text-h1` lleva tamaño, interlineado, interletraje y peso. `tracking-tight` y `leading-none` siguen generando CSS (su escala se conserva); quitarlos es correcto, porque pisarían el interletraje y el interlineado del token |
| **`--warning` sobre vidrio: 4.52** | Recalculé con el método de §3 (4 fondos con velo, 3 variantes de saturación) | **4.520**, peor caso: orbe azul con saturación en lineal. Todos los demás pares coinciden con `DESIGN.md` §3. Además: `--accent-soft-glass` sobre vidrio azul, 4.594; `--danger` sobre vidrio, 4.346 (como icono pasa 3:1); `--destructive` sobre `--danger-soft`, 5.575; blanco sobre `--primary` y sobre `--destructive`, 9.259 y 6.844 |
| **Rojos previstos: 6 + 3** | Leí `cuentas-r2/r3/r4.ataque` y busqué dependencias de `disabled`, de clases y de `textContent` en todas las pruebas | **Confirmada.** `emularCorreccionDelFocoDeChromium` aparece en r3:459 y 483 y en r4:346, 376 y 434 (5). La 4.ª `it.fails`, en r4:284, no la usa y pasará con F-2 (1). `closest("div.rounded-lg")` está solo en r2:290, r3:449 y r4:461 (3). Ninguna otra prueba depende de clases, de `aria-busy` ni de `disabled`, salvo `login-view.test.tsx:151/157`, que adapta el programador. Las `toHaveAccessibleDescription` exactas siguen pasando con el icono `aria-hidden` de `ErrorDeCampo` |
| 13 botones con `disabled={…}` | Búsqueda en `src/` | Son 13, en los archivos que lista el plan |
| Inventario de clases | Búsqueda de las escalas anuladas | Los 25 archivos que las usan están todos en el plan. `layout-publico.tsx` y las guardas de `app/` no tienen ninguna, así que es correcto que estén en "No se toca" |

### Antecedentes de la dirección C: atendidos
- **M-01:** resuelto con E-3 y verificado arriba.
- **M-02:**
  - `listaAnuncios` ya no toca `data.ts`: se usa `aria-labelledby` (S-04).
  - El `h1` del login no se parte en 01a. En 01b, el nombre del producto sale de `components/layout/data.ts`.
  - V-08 recorre la lista entera, excepciones incluidas, y `setup.ts` está en "No se toca".
- **M-03:** el carril quedó fijado por el humano (respuesta 6).
- **M-04:** la tabla "Cierre de cada subentrega" reparte entre 01a y 01b los puntos H, las marcas, los textos de `CLAUDE.md` y `ESTADO.md`, las rondas y los nombres de las secciones.
- **N-01 a N-06:**
  - las `toBeEnabled` se refuerzan en la ronda 1;
  - interletraje con el guion ASCII, y la escala entra en `tokens.test.ts`;
  - V-06 es más amplia;
  - ronda 0 con `git diff --quiet` y `git status`; Espacio en H-05;
  - los `.woff` son esperables;
  - R-01 y los aplazados tienen destino en ESTADO.
- **Menores:**
  - `renderContenido` con retornos tempranos;
  - "Copiar" sin guarda, justificado;
  - la regla de formateadores vale para todos los agentes;
  - la barra con un solo destino se avisa en 01b.

**Reglas de D3 que pidió el humano:**
- **Orbes solo con `transform`:** 01b, con prueba sobre los `@keyframes`.
- **Pantallas densas opacas:** contexto `data-material="opaco"` en todo `/admin`. El gradebook usará el mismo mecanismo.
- **Rojo nunca como texto sobre vidrio al 62 %:** `ErrorDeCampo` sobre `--danger-soft`, más V-13.
- **Contraste AA medido en navegador:** ver el apartado siguiente.

**Cómo concilia el plan el contraste medido en navegador con la regla de `AGENTS.md`:**
- Ningún agente abre un navegador ni propone uno sin interfaz, que además sería una dependencia nueva (S-01).
- La medición la hace el humano en su navegador, con un procedimiento paso a paso (H-09, C-01 a C-12).
- El orquestador solo transcribe y calcula los pares que no son texto a partir de los hexadecimales que le dicte el humano.
- El peor caso calculado lo cubre `tokens.test.ts`.
- Queda un límite, y el plan lo declara: en 01a el fondo es plano, así que H-09 no mide sobre los orbes. El peor caso real se mide en 01b, desplazando el orbe con `translate` desde DevTools.

Me parece la conciliación correcta.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### M-01 — La precondición `HEAD = 6868e4d` detiene todo si alguien hace commit de los documentos antes de programar
Dónde: §D-8, paso 1; "Pasos", paso 1.
Por qué importa: el tester y el programador se detienen si `HEAD` no empieza con `6868e4d`. En el carril sensible, el orquestador escribe `aprobacion.md`. Si el humano hace commit de la carpeta de trabajo, o de cualquier otro documento, en la rama antes de la ronda 0, la precondición falla sin que haya ningún problema real, y se pierde una vuelta.
Qué se espera: una de dos. O el plan comprueba que `frontend/` no cambió respecto de `6868e4d` (`git diff --quiet 6868e4d -- frontend/`) además de `git status`, o dice de forma explícita que no se hace commit en la rama hasta cerrar 01a.

### M-02 — V-01 mezcla "32" con "desde `frontend/`"
Dónde: "Verificaciones", V-01 (plan:625); §D-8, paso 2 (plan:268); "Tareas de la ronda 1" (plan:288).
Por qué importa: V-01 dice "las 32 `*.ataque`" y a la vez que todas las verificaciones van "desde `frontend/`", donde solo hay 11. Las otras 21 están en `backend/`. Un programador que lo siga al pie de la letra obtiene 11 hashes y se detiene, o compara rutas relativas que no coinciden con la tabla.
Qué se espera: V-01 se ejecuta desde la raíz sobre las 32 rutas de la tabla (`sha256sum -c` da 32/32). La ronda 0 puede seguir con las 11 de `frontend/`.

### M-03 — Notas para `plan-01b.md` que conviene fijar ya
Dónde: "DESIGN-01b · resumen".
- **`backdrop-filter` crea bloque contenedor.** Según Filter Effects 2, y así lo hace Chromium, un elemento con `backdrop-filter` distinto de `none` se vuelve el bloque contenedor de sus descendientes `position: fixed`. `FondoAnimado` y la barra inferior fija no pueden quedar dentro de ninguna superficie de vidrio, o se pegarán al panel y no a la ventana. `plan-01b.md` debe decir dónde se montan y comprobarlo.
- **Guardas en carril normal.** El resumen prevé tocar `app/require-rol.tsx` y `app/router.tsx`. `require-rol.tsx` contiene la redirección de RN-03 (acceso restringido) y la del cambio obligatorio de contraseña. Las dos son materia del carril sensible. Con P-07 (A), 01b sigue en carril normal solo si esas ramas de redirección no cambian. `plan-01b.md` debe declararlas intocables o reabrir el carril (ver "Para el humano").
- **Contraste en 01b.** La lista del peor caso sobre los orbes no incluye `--warning`, el par con menos margen (4.52). Si alguna pantalla de 01b pone texto de aviso sobre vidrio, se agrega.

## Detalles menores
- **`FichaDeCuenta`** (§D-6, plan:260): la nueva raíz se describe como `rounded-panel border border-border bg-surface p-4`. Debe conservar `flex flex-col gap-3`; si no, se pierde la separación entre bloques. Conviene decir "sustituye `rounded-lg` por `rounded-panel` y agrega `data-slot`".
- **Tamaño `enlace`:** hereda `whitespace-nowrap` de la base del botón. El enlace más largo ("¿Ya tienes cuenta? Inicia sesión", unos 245 px) cabe en los 280 px útiles a 360 px, pero sin margen. `whitespace-normal` en ese tamaño lo evita para el futuro.
- **Títulos de los anuncios** en `text-body` por debajo de `lg`: sin peso propio, pasan de semibold a 400. Si se quiere conservar la jerarquía, agrega `font-bold` o `font-medium`. Se juzga en H-10.
- **`ContrasenaTemporal`** (`bg-muted`, `rounded-row`, temporal en `text-h3`): es un tratamiento propio del admin. No hace falta un patrón nuevo en `DESIGN.md`, pero conviene una línea en §8 o en §7.10 si se repite.
- **`CONTEXTO_POR_ROL`** queda en línea en `contenedor-rol.tsx`, igual que `ESPACIADO_POR_ROL`. Cuando 01b cree `components/layout/data.ts`, las dos constantes deberían mudarse ahí.
- **`NOMBRE_PRODUCTO`** (01b) duplica `TEXTOS_LOGIN.titulo`. Es aceptable, porque `components/layout` no puede importar de `features/`. La fuente única sería que `features/auth/data.ts` lo importara de `components/layout/data.ts`, lo que toca un `data.ts` de `features/`. Se decide en `plan-01b.md`.
- **`--background-veil`:** el plan no dice si genera `--color-background-veil`. Sin consumidor en 01a, da igual; que lo decida 01b.

## Desacuerdos arbitrados
- **Los 9 rojos previstos (6 aceptados, más 3 si P-08 es A).** Los comprobé uno por uno (tabla de arriba), y las cuatro condiciones de `revision-direccion-c.md` siguen vigentes tal como las transcribe el plan (plan:617-621). Añado una precisión a la condición 2: "falla por otra causa o en otra línea" se refiere a la línea de preparación de la tabla (144 en r3 y r4; 291, 450 y 462 para `rounded-lg`) y, en la 6.ª, a que la prueba pase.
- **Las 3 `it.fails` que "fallan por la razón equivocada"** (r4:208, 232 y 256): no cuentan como rojos del programador. Las resuelve el tester en la ronda 1, como dice el plan.

## Documentos a actualizar
Los que lista "Cierre de 01a" son correctos y completos: `DESIGN.md` con sus marcas, `CLAUDE.md` con el texto literal, `ESTADO.md` §1 a §3 y `README.md`, línea 228. Solo agrego:
- **`ESTADO.md` §3:** la nota de `backdrop-filter` y el bloque contenedor, como riesgo de 01b (M-03), si `plan-01b.md` no se escribe enseguida.
- **`AGENTS.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md`:** sin cambios, de acuerdo.

## Para el humano

**P-07 · Reparto entre 01a y 01b. Opinión: (A).**
- Que la migración de clases vaya en 01a no es una elección: anular las escalas deja sin estilo cualquier archivo sin migrar en el mismo cambio.
- `enEspera` es comportamiento del `Button` base, y es la razón por la que elegiste carril sensible para 01a. T-14 tiene la misma causa.
- Marco y composición deben ir con los orbes, porque hoy hay textos directamente sobre el fondo, y con orbes en movimiento esos textos no se sostienen.
- (B) haría crecer mucho el diff que revisas a mano, y la composición se juzgaría sin el fondo real.
- **Condición que recomiendo al elegir (A):** 01b se queda en carril normal solo si no cambia ninguna rama de redirección de `require-rol.tsx`, `require-sesion.tsx` ni `require-cambio-de-contrasena.tsx` (acceso restringido, sesión y cambio obligatorio). Si `plan-01b.md` necesita tocarlas, pasa a sensible.

**P-08 · Pruebas que localizan la ficha por `rounded-lg`. Opinión: me inclino por (B); (A) es aceptable.**
- Las 3 pruebas afectadas (r2:279, r3:432 y r4:449) vigilan justo lo que 01a reescribe: la raíz única de `AccionRestablecer`, que la temporal no pase de una cuenta a otra y el foco con `<StrictMode>`.
- **Con (A):** fallan en la preparación durante todo el trabajo del programador, así que no le avisan si rompe algo; el tester lo detecta en la ronda 1, a costa de una de las tres rondas.
- **Con (B):** siguen vivas desde el principio, y el programador queda con los 6 rojos que ya aceptaste. El cambio del selector es mecánico, se comprueba contra el código actual y queda sellado con hash.
- **Costo de (B):** la ronda 0 deja de ser solo de confirmación, y el arquitecto tiene que ajustar §D-8, E-4, V-01 (la base de hashes pasa a ser la de la ronda 0) y la tabla de rojos.
- **Si prefieres el proceso más simple, (A) funciona.** (C) no: una clase sin efecto, solo para las pruebas.

**P-09 · Orbes quietos en las demás pantallas. Opinión: (A).**
- Es lo que dicen `DESIGN.md` §7.1 y D-28, aprobados el mismo día.
- (B) obligaría a cambiar la fuente única y rompería la continuidad visual entre `/login` y `/registro`, que comparten composición.
- No bloquea 01a.

**Decisiones nuevas (se confirman en tu comprobación; no bloquean el plan):**
- **Anillo de foco interior y blanco en los botones rellenos (S-07 y R-14).** Es una interpretación de `DESIGN.md` §6, que no la dice de forma literal. Irá como "propuesta"; la apruebas o la corriges en H-04.
- **Texto de 16 px en los campos del admin (S-09).** `DESIGN.md` §8 dice "texto de 14 px" para el administrador. El plan conserva 16 px en los campos para que iOS no amplíe la página al enfocarlos. Irá como "propuesta"; la confirmas en H-03.
- **No hagas commit en la rama antes de que empiece la ronda 0,** o autoriza el ajuste de M-01. Si no, el tester se detiene por la precondición de `HEAD`.

## Revisión de los ajustes (respuestas P-07 a P-09)

Veredicto: CAMBIOS REQUERIDOS, por un solo punto (M-04), de una o dos líneas en V-08. Todo lo demás de los ajustes está bien, y cuando M-04 quede corregido el plan puede ir a tu aprobación por escrito sin otra ronda completa: me basta revisar esa corrección.

Verificación propia (sin tocar el repositorio; los experimentos corrieron en el scratchpad):
- **`git status`:** solo `.claude/agents/tester.md`, `docs/DESIGN.md` y `docs/ESTADO.md` modificados (los cambios del orquestador) y esta carpeta sin rastrear. `frontend/` sigue idéntico a `6868e4d`.
- **`fichaDe` antes del cambio.** Copié `cuentas-r2`, `-r3` y `-r4` al scratchpad y sustituí los 3 selectores por el auxiliar, con el texto exacto de §D-8 paso 7. Agregué además dos aserciones temporales: que `fichaDe` devuelve el abuelo del nombre y que ese elemento es el mismo `div.rounded-lg` que encontraba el selector anterior. Corrí las copias con la configuración de Vitest del proyecto contra el código de `6868e4d`: **3 archivos, 39 en verde y 4 fallos esperados**, lo mismo que las originales.
- **`fichaDe` después del cambio (01a).** Aquí no hay corrida posible, porque el código de 01a todavía no existe. Lo compruebo por estructura con §D-6:
  - la raíz de la ficha conserva el `div` del nombre, la raíz única de `AccionRestablecer` y `FormularioCorregirCorreo`;
  - el `div` del nombre no contiene el formulario, así que el recorrido hacia arriba se detiene en la raíz de la ficha;
  - la ficha es hermana del formulario "Buscar" dentro del contenedor del buscador, así que la guarda no se dispara.
- **Formularios:** "Guardar correo" existe siempre, también después de corregir el correo (el formulario sigue montado y solo agrega el aviso), así que r2:279 lo encuentra. Los `aria-label` salen de `TEXTOS_CUENTAS` ("Buscar", "Guardar correo", "Enviar invitación"), y 01a no toca `data.ts` (S-03).
- **Clases en las `*.ataque`:** hoy solo hay 3 apariciones de `rounded` en todas ellas, justo las que cambia la ronda 0, así que "`rounded` en `*.ataque` → 0" es alcanzable. Los otros localizadores (`closest("div")`, `querySelector("svg")`, `[role="status"]`) son por etiqueta HTML o por rol, no por clase.

### Problemas que bloquean

#### M-04 — V-08 da una violación segura en `.claude/` y en `docs/ESTADO.md`, y otra en `docs/trabajo/` si se hace commit
Dónde: "Verificaciones", V-08 (plan:665), aplicada a la lista "No se toca" (plan:119-124).
Por qué importa:
- V-08 exige, para cada ruta de "No se toca", `git diff --quiet 6868e4d -- <ruta>` con código 0. Pero `.claude/` ya difiere de `6868e4d`: el orquestador agregó la regla en `tester.md`, con tu autorización. `docs/ESTADO.md` también difiere, y el orquestador lo sigue actualizando durante el encargo (`AGENTS.md`).
- Si haces commit de los documentos del plan antes de la ronda 0, como anunciaste, `git diff 6868e4d -- docs/trabajo/` también sale distinto de 0, porque la carpeta de DESIGN-01 aparece como nueva. Y la guarda "no cambian respecto de su última versión confirmada" de `plan.md` y de los antecedentes no dice contra qué se compara.
- En carril sensible, el programador reportaría una violación de "No se toca" que no existe, o se detendría. Eso es justo lo que pediste evitar: que ninguna verificación dependa de `docs/` ni de `.claude/`.

Qué se espera:
- **Rutas de `frontend/` y `package-lock.json`:** V-08 sigue comparando contra `6868e4d`.
- **Rutas fuera de `frontend/`:** V-08 compara contra el commit en que apruebas el plan. El orquestador lo registra en `aprobacion.md`. Así cubre también `plan.md`, `plan-direccion-c.md` y `revision-direccion-c.md`.
- **`docs/trabajo/`:** la ruta excluye de forma explícita la carpeta de DESIGN-01 (por ejemplo, con `':!docs/trabajo/DESIGN-01-sistema-de-diseno'`).
- **Archivos del orquestador:** `docs/ESTADO.md`, `aprobacion.md` y `comprobacion-humano.md` quedan fuera de la comprobación del programador; los verifico yo en la revisión final.

Las demás precondiciones y verificaciones cumplen tu condición, y las revisé una por una:
- **§D-8, pasos 1, 6 y 8:** se ejecutan desde `frontend/` con la ruta `.`, así que solo miran `frontend/`.
- **Paso 1 del programador:** compara `frontend/` contra `6868e4d` y acepta solo los 3 archivos de la ronda 0; su "como mucho" tolera que hagas commit de ellos.
- **V-01:** compara hashes de archivos concretos, desde la raíz.

Ninguna de estas depende de `HEAD`, de `docs/` ni de `.claude/`.

### Problemas que no bloquean
- **`fichaDe` y la regla de `tester.md`.** Cumple la regla: solo usa texto, rol y nombre accesible, más un recorrido del árbol del DOM, sin clases ni atributos nuevos.
- **Aserciones.** No debilita ninguna: todas quedan iguales, dentro del mismo `within(ficha)`. La guarda contra "Buscar" evita que se tome por ficha un contenedor más amplio.
- **Holgura teórica.** Si un cambio futuro envolviera la ficha y otro contenido que no fuera el buscador, `fichaDe` devolvería un contenedor más amplio sin avisar. Con una sola ficha en pantalla no cambia ningún resultado, y R-15 deja la salida duradera (rol y nombre accesible en la ficha) para ADMIN. Aceptable.
- **Tabla de rojos.** Cuadra: 6. Las 3 pruebas de la ficha deben quedar en verde en la entrega del programador. Con F-2, r3:432 sigue llevando el foco a "Copiar", porque el elemento activo, "Sí, restablecer", está dentro de la raíz; r2:279 y r4:449 no dependen de `disabled`. Las 3 `it.fails` que fallan en la preparación no cuentan.
- **Orden de la ronda 0.** Es correcto: se restaura r4 y se comprueba su hash (paso 6) antes de editar los selectores (paso 7), y el paso 8 reconstruye la línea base completa (258 pruebas).

### Cambios del orquestador (comprobados)
- **`.claude/agents/tester.md`:** la viñeta está en "Reglas de combate", con el texto que dictaste. El plan la cita igual en E-4, §D-8, los puntos de ataque y R-08, y no hay nada que la contradiga. Esto rompe V-08, pero por la forma de V-08, no por la regla (ver M-04).
- **`docs/DESIGN.md` §8:** la fila del administrador dice "texto de 14 px (16 px en campos de texto)", y el párrafo sobre Safari en iOS está bien redactado. Coincide con §7.3 ("texto `--text-body`" en los campos) y con S-09. El plan le prohíbe al programador tocar ese texto y le deja agregar "(44 px por debajo de 768 px)" en la misma fila: son compatibles.

### Excepciones y "No se toca" (M-02)
- **Tester:** la ronda 0 edita `cuentas-r2`, `-r3` y `-r4`, y E-4 lo cubre con su alcance exacto (el auxiliar, las dos líneas de cada archivo, sin aserciones).
- **Programador:** todo lo que modifica está fuera de "No se toca" o bajo una excepción:
  - `providers.tsx`, `contenedor-rol.tsx`, `features/admin/lib.ts`, `main.tsx` y `lib/utils.ts` no están en la lista;
  - las 3 pruebas normales que adapta figuran como excepción;
  - `DESIGN.md` va por E-5;
  - las dependencias van por E-1 y E-2, y `vitest.config.ts` por E-3.
- **Orquestador:** el cierre asigna `CLAUDE.md`, `ESTADO.md` y `README.md`, que están fuera del trabajo del programador, y el plan ya no pide cambios en `.claude/`.

### Detalles menores
- **Seguimiento de la primera revisión.** Siguen sin atender dos detalles menores: `whitespace-nowrap` en el tamaño `enlace` y el peso de los títulos de los anuncios en `text-body`. No bloquean; se juzgan en H-10.
- **§D-8, paso 7.** Prettier puede partir el `while` del auxiliar en varias líneas. El diff seguirá siendo "solo el auxiliar y la sustitución", pero conviene que el tester no lo tome por una desviación.

### Para el humano
**Condición de detención de 01b, extendida por el arquitecto. Opinión: de acuerdo.**
- `require-sesion.tsx` decide la sesión y `require-cambio-de-contrasena.tsx`, el cambio obligatorio; las dos son materia del carril sensible ("sesiones y contraseñas"), igual que la redirección de acceso restringido de `require-rol.tsx`.
- Extender la condición a `router.tsx` (rutas, `path`, orden y guardas) también es correcto, porque ahí se decide qué guarda protege cada ruta.
- La única entrada que queda abierta es agregar una ruta de diseño que envuelva a las demás. Recomiendo que `plan-01b.md` la haga verificable:
  - el diff de `router.tsx` solo agrega ese elemento envolvente;
  - `router.test.tsx`, `router.ataque.test.tsx`, `sesion-r2.ataque.test.tsx` y `app/cuentas-r*.ataque.test.tsx` siguen en verde sin modificarse.

**Antes de aprobar el plan de 01a por escrito:**
- **M-04 debe quedar corregido,** porque si no, la verificación de "No se toca" dará una violación falsa en `.claude/` y en `docs/ESTADO.md`.
- **Haz commit de los documentos antes de la ronda 0,** como anunciaste, y que el orquestador anote ese hash en `aprobacion.md`. V-08 lo usará como base para todo lo que está fuera de `frontend/`.
- **La ronda 0 ya no es solo de confirmación.** Además de confirmar T-14, el tester modifica 3 pruebas de ataque (solo el localizador de la ficha) y publica sus hashes nuevos. Es lo que elegiste en P-08 (B).
- **El programador entrega con 6 rojos previstos,** los que aceptaste. Las 3 pruebas de la ficha deben estar en verde.
- **01b sigue en carril normal** con la condición de detención extendida.

### Revisión de la corrección de M-04

Veredicto: CAMBIOS REQUERIDOS, por una frase (M-05). Con esa frase corregida, M-04 queda resuelto y el plan puede ir a la aprobación por escrito del humano; conviene aplicar M-06 en la misma edición.

M-04 queda resuelto en lo esencial:
- **Dos bases.** V-08 usa `6868e4d` para `frontend/` y `package-lock.json`, y `<A>` para todo lo demás. Como `<A>` ya contiene la regla de `tester.md` y el §8 de `DESIGN.md`, desaparecen las violaciones falsas.
- **Documentos del plan.** `plan.md`, `plan-direccion-c.md` y `revision-direccion-c.md` se comparan uno por uno contra `<A>`.
- **`DESIGN.md`.** La excepción E-5 también se mide contra `<A>`.
- **Archivos fuera de V-08.** `ESTADO.md`, `aprobacion.md`, `comprobacion-humano.md` y los entregables de los agentes quedan fuera, y la revisión final los cubre (paso 16).

Comprobé las demás condiciones que me pidió el orquestador:
- **Ninguna comprobación depende de `HEAD`.** `git diff <base>` compara el árbol de trabajo contra la base, así que un commit posterior no cambia el resultado. `git status --porcelain` solo añade la detección de archivos sin rastrear o modificados, que es lo que se busca.
- **La parada por `<A>` ausente es precisa:** falta el hash en `aprobacion.md`, o `git cat-file -e` no encuentra ese commit.
- **La exclusión con pathspec funciona tal como está escrita.** La probé en Git Bash y en PowerShell 5.1.26100: `git status --porcelain -- docs/trabajo ':(exclude)docs/trabajo/DESIGN-01-sistema-de-diseno'` deja fuera la carpeta sin rastrear de DESIGN-01, y `git diff --quiet 6868e4d -- …` con la misma exclusión sale con código 0 en las dos terminales.

#### M-05 — V-08 pone al orquestador a hacer commit (bloquea)
Dónde: V-08, "Condiciones de parada" (plan:677): "Si el orquestador cambia con autorización un archivo fuera de `frontend/`… lo confirma en un commit y anota su hash".
Por qué importa: `AGENTS.md` dice que ningún agente hace commit ("El humano decide commit y despliegue. Ningún agente hace commit, push ni deploy"; "No hagas commit ni push sin que se te pida"). El orquestador no es una excepción.
Qué se espera: una redacción que no le pida el commit a ningún agente. Por ejemplo: "Si durante el encargo cambia con autorización un archivo fuera de `frontend/` distinto de los tres de arriba, el orquestador le pide al humano que haga ese commit y anota el hash nuevo en `aprobacion.md`. Mientras no exista, V-08 marcará ese archivo: el agente se detiene y pregunta, sin darlo por bueno".

#### M-06 — `git cat-file -e <A>^{commit}` sin comillas falla en PowerShell 5.1 (no bloquea)
Dónde: paso 1 del programador (plan:780) y V-08 (plan:677).
Por qué importa: `AGENTS.md` declara PowerShell 5.1 como la terminal del proyecto, y en ella las llaves sin comillas se interpretan como un bloque de código. Lo comprobé: `git cat-file -e 6868e4d^{commit}` sale con código 129 ("unknown switch `n'"), aunque el commit existe. Quien ejecute el paso en PowerShell se detendría por una ausencia de `<A>` que no es real. En Git Bash funciona.
Qué se espera: la forma con comillas simples, `git cat-file -e '<A>^{commit}'`, que funciona igual en las dos terminales. La probé con `6868e4d`: código 0 en ambas; con un hash inexistente, código 128. Otra opción es que el plan diga que V-08 se ejecuta en Git Bash.
