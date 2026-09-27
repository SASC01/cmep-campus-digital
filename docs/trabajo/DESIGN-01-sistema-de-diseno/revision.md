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

## DESIGN-01a — final

Veredicto: **APROBADO** (sin problemas que bloqueen). Antes del commit faltan los pasos del humano del carril sensible: confirmar la lista de 19, hacer la comprobación H-01 a H-10 y revisar el diff (ver "Para el humano").

Verificación propia (2026-09-27, desde `frontend/`, salidas en el scratchpad):
- **lint:** código 0 (ESLint, `prettier --check` y `tsc -b`).
- **test:** código 0; **37 archivos, 494 pruebas, 494 en verde**, sin fallos esperados. Solo las `*.ataque` (`vitest run ataque`): 18 archivos, 266 pruebas.
- **build:** código 0. Sigue el aviso de Vite del bloque de más de 500 kB, que ya existía en AUTH-02.
- **V-01:** `sha256sum -c` de la tabla de 39 de `reporte-tester.md` ("DESIGN-01a — Ronda 1") da 39/39 OK. `find` encuentra exactamente 39 `*.ataque` y todas están en la tabla. Respecto de `6868e4d` solo cambiaron `features/admin/cuentas-r1`, `-r2`, `-r3` y `-r4`; las 7 nuevas están sin rastrear.
- **V-02 a V-07 y V-13:** los mismos resultados que declararon el programador y el tester. Las únicas coincidencias de V-03 son el comentario de `tokens.css` y la expresión regular de `clases-r1.ataque.test.ts`, que es el texto de la guarda y no un localizador. `enEspera=` aparece 13 veces, `disabled` no aparece en ningún JSX de producción y `outline-none` solo en `DialogContent`.
- **V-08:** limpia con las dos bases. Contra `6868e4d`, todas las rutas de `frontend/` de "No se toca"; las únicas pruebas normales modificadas son las 3 permitidas; `package.json` cumple E-1 y `vitest.config.ts` es exactamente E-3. Contra `5a32230`, fuera de `frontend/` solo cambian `docs/DESIGN.md` (E-5), `docs/ESTADO.md`, `aprobacion.md`, `reporte-tester.md`, `resumen-programador.md` y `package-lock.json`.
- **V-09 y V-10 sobre `dist/`:** 6 `.woff2` y 6 `.woff`, todos `latin`, ninguno `latin-ext` y sin Google Fonts. En el CSS no queda ningún `--color-*` de la paleta por defecto, y aparecen los 15 selectores y valores que pide V-10 (también `data-material=opaco` en la variante del botón `outline`).
- **`package-lock.json`:** comparé el JSON de `6868e4d` con el del árbol de trabajo, entrada por entrada, con un script del scratchpad. Resultado: **19 entradas pierden `"peer": true`** y son exactamente las 19 que lista `aprobacion.md`. Ninguna entrada gana `peer` ni se borra. Solo hay 3 entradas nuevas (`@fontsource/*` 5.3.0). Fuera de `peer` solo cambia la sección `frontend` (las 3 dependencias de E-1), y la raíz del JSON queda igual.

### Cumplimiento del plan (01a)
- **Alcance:** están los 11 puntos de "DESIGN-01a" y nada de 01b: sin orbes, sin marco, sin `FondoAnimado` y sin cambios en `layout-publico.tsx`, las guardas ni `router.tsx`.
- **§D-1 a §D-4:** `tokens.css` tiene los seis bloques en el orden del plan, las diez anulaciones, la escala con el guion ASCII, los radios y `@theme inline` con todos los colores. Las tres utilidades de vidrio tienen su respaldo con `@supports not`, el contexto opaco redefine las siete variables y la densidad corta en 48rem. Los hexadecimales van en minúsculas porque así los deja Prettier; el tester lo explicó y lo acepto.
- **§D-5:** `Button` con `enEspera` hace lo que dice el plan: `aria-disabled`, `aria-busy` y `data-en-espera` solo cuando está en espera; el clic interceptado con `preventDefault`; el indicador `aria-hidden` con `motion-reduce:animate-none` antes del texto; `asChild` incompatible por tipo. Las guardas `isPending` y `enviandoRef` se conservan.
- **§D-6:** en `ficha-de-cuenta.tsx` ya no están `tieneFocoRef`, `manejarFoco`, `manejarDesenfoque` ni los `on*Capture`. El foco se decide en `onSuccess` y `onError` con `focoDisponiblePara(raizRef.current, document.activeElement, document.body)`. Hay una sola raíz, y `renderContenido` usa retornos tempranos. La raíz de `FichaDeCuenta` solo cambió `rounded-lg` por `rounded-panel`, y se mantienen las invariantes de R-08.
- **§D-7 a §D-9:** `ErrorDeCampo`, `Label`, `Toaster` (lo importa solo `providers.tsx`) y el foco global en `index.css` coinciden con el plan. Los botones rellenos llevan el contorno interior.
- **Capas y reglas que no se rompen:** sin cambios en backend ni en API, sin secretos, sin proveedores nuevos. Las fuentes se sirven desde el propio origen y las dependencias nuevas tienen licencia OFL.

### Comparación de `cuentas-r1` a `cuentas-r4.ataque` contra `6868e4d`
Revisé el diff línea por línea; en r4 también con `git diff -w`, porque Prettier reindentó los cuerpos.
- **r1** (+4): debajo de las dos `toBeEnabled()` de "Copiar" agrega `not.toHaveAttribute("aria-disabled")`, cada una con su comentario de N-01. No quita nada.
- **r2** (ronda 0): solo el auxiliar `fichaDe` y la sustitución de las 2 líneas de `closest("div.rounded-lg")`. Es igual al texto de §D-8, paso 7.
- **r3:**
  - `fichaDe` y su sustitución, como en r2;
  - N-01 en r3:402-403, sin quitar la `toBeEnabled` original;
  - `emularCorreccionDelFocoDeChromium`: sale la emulación del salto a `<body>` y entran 5 aserciones de F-1 (`aria-disabled`, `aria-busy`, `not.toBeDisabled`, sin atributo `disabled` y el foco en el botón).
- **r4:** los mismos tres cambios que r3 (N-01 en r4:360-361). Además, las 4 `it.fails` pasan a `it`: su nombre, su preparación y su `expect(document.activeElement, …)` final no cambian; solo cambian la línea `it(`, el cierre y el comentario.
- **Ninguna aserción final se debilitó.** Lo que se quitó del auxiliar de Chromium era preparación y, como pide §D-8, ahora exige F-1. Así, las 7 pruebas que lo usan comprueban además que el botón en vuelo conserva el foco. El camino "foco en `<body>`" sigue cubierto:
  - en r4:287, con `clicEnZonaNoEnfocable`;
  - en 5 pruebas de `foco-r1.ataque`: clic fuera y otro campo, con éxito y con 500; clic fuera sin ir a otro campo, con éxito y con 500; y la variante con `<StrictMode>`.
- **Ningún localizador por clase de estilo** en las cuatro.

### Las 7 `*.ataque` nuevas
- **Localizadores:** usan rol, etiqueta y texto accesible. Los únicos selectores CSS son atributos: `[data-material]` y `[data-densidad]` en `contexto-r1`, que es justo lo que ataca; y en `errores-r1`, `input[aria-invalid]` y `svg[aria-hidden]`. Ninguno usa clases de estilo. No hay `skip`, `only`, `todo` ni `fails`.
- **Atacan de verdad:**
  - `en-espera-r1`, en `app/` y en `features/admin/`: los 13 botones (más "Cerrar sesión" en cuatro contextos), con clic repetido, `submit`, `requestSubmit` y doble clic en el mismo instante. Comprueban la salida de la espera con éxito y con error.
  - `foco-r1`: F-2, F-3 y F-4 en 12 escenarios.
  - `contexto-r1`: el contexto opaco solo en `/admin` y en todos sus controles.
  - `errores-r1`: la descripción accesible de cada error.
  - `tokens-r1`: los valores contra las tablas de `DESIGN.md`, leídas del propio documento, y el contraste de pares sólidos que el plan no listaba.
  - `clases-r1`: V-02 a V-07 y V-13 como guarda permanente.
- **La tabla de 39 hashes es correcta** (V-01, arriba).

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean

#### M-01 — La prueba "escenario 4 de T-14" de `cuentas-view.test.tsx` no hace lo que dice su nombre
Dónde: `frontend/src/features/admin/cuentas-view.test.tsx`, prueba "'Cancelar' con la petición en vuelo, clic fuera y foco en 'Nombre completo'…".
Por qué importa: el plan pedía "'Cancelar' en vuelo, clic fuera (`blur()`), foco en 'Nombre completo' y llega la temporal". La prueba no pulsa "Cancelar" ni hace el clic fuera: solo enfoca "Nombre completo" con la petición en vuelo. Es otro escenario, que ya cubre r4:221. El nombre promete una cobertura que no da. El escenario real sí está cubierto, en `cuentas-r4.ataque:287` y en `foco-r1`, así que no se pierde protección.
Qué se espera: que la prueba reproduzca el escenario que nombra (pulsar "Cancelar" y quitar el foco antes de ir al campo) o que cambie de nombre. Es un cambio de carril trivial. Puede ir con el paso 1 del cierre, que ya toca el programador, y después se corre `test`.

#### M-02 — Las capas flotantes salen del contexto opaco y denso (O-1 del tester)
Dónde: `components/ui/dialog.tsx`. Radix pinta el contenido en un portal a `<body>`, fuera de `ContenedorRol`.
Por qué importa: un `Button` `outline` dentro de un diálogo abierto en `/admin` tendría `vidrio-fuerte` con `backdrop-filter` y 44 px de alto en escritorio, contra la regla "administrador sin vidrio" y la densidad de §8. Hoy no afecta: nadie usa `Dialog`, y `cuentas-r1.ataque` prohíbe los modales en `features/admin`. Tampoco es trabajo de 01b, que no monta capas flotantes.
Qué se espera: un pendiente nuevo en `ESTADO.md` §3, con destino ADMIN o el primer encargo que monte un diálogo, popover o select en una pantalla densa. Ese encargo decide cómo heredan el material y la densidad. Una salida coherente con §7.11, que ya dice que las capas flotantes son opacas, es que `DialogContent` lleve siempre `data-material="opaco"`, y que la densidad se pase de forma explícita.

#### M-03 — Marca adelantada en `DESIGN.md` §6 (O-2 del tester)
Dónde: `docs/DESIGN.md` §6, viñeta "Botones rellenos…: (DESIGN-01a, propuesta, confirmada por el humano)".
Por qué importa: el humano aceptó S-07 al planear, pero lo confirma en H-04. Además, "propuesta, confirmada por el humano" no es ninguna de las marcas de la tabla de cabecera.
Qué se espera: después de H-04, en el paso 1 del cierre, la marca queda como "propuesta aprobada (fecha)", o se corrige si el humano prefiere el contorno azul por fuera (R-14).

### Detalles menores
- **`DESIGN.md` §7.3, campos:** dice "36 px en pantallas densas" sin el corte de 768 px que sí tienen la línea de los botones y §8. Conviene alinearlo en el cierre.
- **`DESIGN.md` §7.3, error de un campo:** la frase "ni al formulario tener que garantizar que siempre está sobre vidrio fuerte o sólido" no se entiende bien. Redactarla de nuevo en el cierre, sin cambiar la decisión.
- **O-3 (clases `.outline` y `.backdrop-filter` en `dist/`):** Tailwind las genera porque encuentra esas palabras en el código, pero ningún elemento las usa. No hay que hacer nada.
- **O-4 (`cn("leading-tight", "text-small")` descarta `leading-tight`):** hoy no ocurre, porque `ContenedorRol` usa una cadena fija. Quien combine interlineado y tamaño con `cn` debe poner el tamaño primero.
- **O-6 (peso 400 de Bricolage en el título de un anuncio en móvil):** el navegador toma el peso más cercano que sí está cargado (500), sin sintetizarlo. Lo juzga el humano en H-10, como ya decidió.
- **`CONTEXTO_POR_ROL`, con su tipo en línea en `contenedor-rol.tsx`:** así lo autoriza el plan, y 01b lo mueve a `components/layout/data.ts`.
- **`tokens-r1.ataque` lee `docs/DESIGN.md` con `?raw`:** una edición de las tablas del documento puede poner en rojo el frontend, y eso es deseable. Después de editar `DESIGN.md` en el cierre, hay que volver a correr `npm run test`.
- **Proceso:** el tester escribió por error en `/tmp` y terminó un proceso que él mismo había arrancado. Lo reportó y no afectó al repositorio. Antes, el resumen del programador hablaba de "unas 15 entradas" de `package-lock.json`; la cifra correcta, 19, ya quedó registrada.

### Desacuerdos arbitrados
- **T-01 (tester) frente a la lista de 18 del orquestador:** tiene razón el tester. Recalculé la lista y son 19, idénticas a las de la corrección de `aprobacion.md`. Todas son bajas de `"peer": true`, sin cambios de versión, `resolved` ni `integrity`. Solo falta la confirmación del humano.
- **Cambio de `emularCorreccionDelFocoDeChromium`:** es la adaptación que manda §D-8 y no debilita nada (ver la comparación de arriba). Queda aceptada.
- **O-5 (lectura de V-06):** la interpretación del tester es correcta. "`aria-busy` y `aria-disabled` solo en `button.tsx`" se refiere a atributos JSX; la variante `aria-busy:cursor-progress` de `button-variants.ts` la pide el propio plan.
- **V-03 y `rounded` en las `*.ataque`:** las 2 coincidencias son el texto de la guarda en `clases-r1`, no un localizador. Cumple el propósito de la regla.

### Documentos a actualizar (cierre de 01a)
- **`docs/DESIGN.md`** (programador, carril trivial, después de H-01 a H-10): las marcas "propuesta" que el humano apruebe pasan a "propuesta aprobada (fecha)"; el párrafo de §4 "Nadie las ha visto en pantalla todavía" se sustituye por el resultado de H-01; la fecha de cierre va en "Estado de aplicación". Se atienden también M-03 y los dos detalles de §7.3. Después, `npm run test` desde `frontend/`.
- **`CLAUDE.md`** (orquestador, con autorización del humano): **los textos literales del plan ("Cierre de 01a", punto 2) están listos para aplicarse tal como están.** Comprobé cada afirmación contra el código:
  - `enEspera`: `aria-disabled`, `aria-busy`, el indicador y la regla de `disabled`;
  - la anulación de las escalas y `cn` en `lib/utils.ts`;
  - las tres utilidades de vidrio con respaldo y el contexto `data-material` y `data-densidad`;
  - `ErrorDeCampo` sobre `--danger-soft`;
  - `label.tsx` y `sonner.tsx`, que solo importa `providers.tsx`.

  No hace falta cambiarles nada.
- **`docs/ESTADO.md`** (orquestador), según el punto 3 del cierre, más lo siguiente:
  - **§1:** frontend con 37 archivos y 494 pruebas en verde (266 adversarias en 18 archivos); backend sin cambios, con 65 archivos y 657 pruebas (no se corrió: `backend/` no cambió y sus 21 hashes coinciden).
  - **Pendiente nuevo de M-02** (portales fuera del contexto opaco y denso), con destino ADMIN o el primer encargo con capas flotantes en una pantalla densa.
  - **Si M-01 no se corrige en el cierre,** un pendiente con su descripción.
  - **Lo que ya está desactualizado** y se corrige al cerrar:
    - en §2, "Siguiente paso: Tester, ronda 1 (en curso)";
    - en §2, la descripción de la rama "sin commits propios" y la carpeta "sin rastrear";
    - en §3, la fila "Dirección visual D3", con "falta el commit de los documentos";
    - en §4, el estado de git local.
  - **Se retiran de §3** las filas de MF-05 (el foco de los botones deshabilitados) y de T-14.
- **`README.md`, línea 228** (orquestador): "El frontend tiene 37 archivos con 494 pruebas: 266 adversarias, en 18 archivos." Son los números de mi corrida.
- **`aprobacion.md`:** dice lo que se decidió: aprobación, `<A>` = `5a32230`, decisiones, parada de V-08 y la corrección a 19. Falta anotar la confirmación del humano de la lista de 19.
- **`comprobacion-humano.md`:** todavía no existe, como corresponde. El orquestador lo crea con el resultado de H-01 a H-10.

### Para el humano
Antes del commit (carril sensible):
1. **Confirma por escrito la lista de 19 entradas** de `package-lock.json` que pierden `"peer": true`: `@babel/core`, `@csstools/css-parser-algorithms`, `@csstools/css-tokenizer`, `@electric-sql/pglite`, `@testing-library/dom`, `@types/react`, `@types/react-dom`, `@typescript-eslint/parser`, `acorn`, `browserslist`, `eslint`, `keyv`, `pg`, `prisma`, `react`, `react-dom`, `typescript`, `vite` y `zod`. Las verifiqué entrada por entrada: ninguna versión cambia, y lo único más son las 3 de `@fontsource/*` y la sección `frontend`. El orquestador anota tu confirmación en `aprobacion.md`.
2. **Haz la comprobación H-01 a H-10** del plan en Chrome o Edge, a 1280 × 800 y a 360 × 800, incluida la tabla de contraste C-01 a C-12 (H-09). Ningún agente la hizo. Quedan sin verificar:
   - el contraste medido;
   - la apariencia del vidrio;
   - las alturas de 36 y 44 px con el corte de 768 px;
   - el foco blanco interior (H-04, que decide M-03);
   - el movimiento reducido;
   - el aviso de `sonner`;
   - el envío con Enter desde un campo (H-05);
   - T-14 en el navegador real (H-06).

   Si un par de H-09 no pasa, se escala antes del commit. `/acceso-restringido` puede quedar "no verificada" si no tienes un estudiante restringido.
3. **Revisa el diff.** En especial:
   - `components/ui/button.tsx`;
   - `features/admin/components/ficha-de-cuenta.tsx`;
   - los 13 cambios de `disabled` a `enEspera`;
   - `package-lock.json`;
   - los diffs de `cuentas-r1`, `-r3` y `-r4.ataque` (resumidos arriba).
4. **Decide M-01:** corregir la prueba en el cierre (recomendado, trivial) o dejarla como pendiente.
5. **Al preparar el commit, incluye los archivos nuevos sin rastrear:** 8 del programador (`tokens.test.ts`, `utils.test.ts`, `button.test.tsx`, `label.tsx`, `sonner.tsx`, `error-de-campo.tsx` y su prueba, `contenedor-rol.test.tsx`), las 7 `*.ataque` de la ronda 1 y `resumen-programador.md`. Ningún agente hace commit.
6. **R-12:** entre 01a y 01b, `main` queda con vidrio sobre fondo plano y la composición actual. Es lo esperado.

## DESIGN-01a — cierre

Veredicto: **CAMBIOS REQUERIDOS** (al programador), por dos correcciones pequeñas de token y de documento: M-01 y M-02. Lo demás del cierre está bien hecho. Cuando lleguen esas dos correcciones, las reviso yo sin ronda del tester (ver "Ronda 2 del tester").

Verificación propia (2026-09-27, desde `frontend/`, salidas en el scratchpad):
- **lint:** código 0 (ESLint, `prettier --check` y `tsc -b`).
- **test:** código 0; **37 archivos, 496 pruebas, 496 en verde**. Solo las `*.ataque` (`vitest run ataque`): 18 archivos y 266 pruebas. Coincide con la corrida del orquestador.
- **build:** código 0. Sigue el aviso de Vite del bloque de más de 500 kB, que ya existía.
- **V-01:** `sha256sum -c` de la tabla de 39 de `reporte-tester.md` ("DESIGN-01a — Ronda 1") da 39/39 OK. `find` encuentra exactamente 39 `*.ataque` y todas están en la tabla: el cierre no tocó ninguna.
- **V-02 a V-07:** ningún `ring-` ni `focus:` en `src/` fuera de pruebas. `outline-none` solo en `DialogContent`. Ningún valor arbitrario en los archivos del cierre. `enEspera=` aparece 13 veces. `border-2` solo en la variante `outline` opaca.
- **V-08:**
  - **Base `6868e4d`:** todas las rutas de `frontend/` de "No se toca" siguen iguales. Las únicas pruebas normales modificadas son las 3 permitidas. `package.json` solo tiene las 3 líneas de E-1 y `vitest.config.ts` es exactamente E-3.
  - **Base `5a32230`:** fuera de `frontend/` solo cambian `CLAUDE.md`, `README.md`, `docs/DESIGN.md`, `docs/ESTADO.md` y esta carpeta. `CLAUDE.md` y `README.md` aparecen, como prevé la condición de parada de V-08, porque el orquestador los cambió con autorización. Los revisé abajo.
  - **`package-lock.json`:** comparé el JSON de `6868e4d` con el del árbol entrada por entrada. **19 entradas pierden `"peer": true`**, las mismas 19 de `aprobacion.md`; ninguna gana `peer` ni se borra. Solo hay 3 entradas nuevas (`@fontsource/*`). Fuera de `peer` solo cambia la sección `frontend`, y la raíz del JSON queda igual. El cierre no tocó el lockfile.
- **Contraste del borde, recalculado con un script propio** (el método de §3, escrito aparte, sin reutilizar el código de `tokens.test.ts`):

  | Par | Calculado | Reportado | Peor caso |
  |---|---|---|---|
  | `#5A6472` / vidrio (62 %) | 3.809 | 3.81 | orbe azul, saturación en lineal |
  | `#5A6472` / vidrio fuerte (78 %) | 4.652 | 4.65 | ídem |
  | `#5A6472` / tarjeta interna | 4.127 | 4.13 | ídem |
  | `#5A6472` / `--surface` | 5.999 | 6.00 | sólido |
  | `#5A6472` / `--background` | 5.139 | 5.14 | sólido |

  **El peor caso está bien elegido.** El borde es más oscuro que cualquier fondo de vidrio posible, así que el peor caso es el fondo más oscuro: el orbe azul `#22409A` bajo el velo, más oscuro que el verde. Los bordes desenfocados de un orbe dan colores intermedios, más claros, y los orbes son sólidos y no se mezclan entre sí. El método ya contaba con los orbes de 01b, así que "3:1 con los orbes" queda cubierto por cálculo. **Depende del velo:** sin él, sobre el orbe azul, el borde baja a 2.90 y no pasa. `DESIGN.md` ya hace obligatorio el velo; en 01b el borde se agrega a la lista de pares que se miden sobre el orbe (ver "Para el humano").

### Cumplimiento del cierre
- **Marcas de `DESIGN.md`:**
  - Pasan a "propuesta aprobada (2026-09-27)" solo la implementación de las fuentes (§4) y el foco blanco interior del botón `primary` (§6). `destructive` sigue como propuesta, porque el humano no vio un botón rojo, y me parece correcto.
  - El anillo de foco de los enlaces no tenía marca de propuesta, porque sale de la regla general de §6, marcada "captura". No había nada que cambiar.
  - Las demás marcas siguen como estaban.
  - Se cumplieron M-03 y los dos detalles de §7.3, y el párrafo de §4 quedó sustituido por el resultado de H-01.
  - Hay dos excepciones, en M-02.
- **M-01 (prueba "escenario 4 de T-14"):** resuelto. La prueba ahora hace lo que dice su nombre:
  1. pulsa "Sí, restablecer" y espera `aria-disabled`;
  2. pulsa "Cancelar" y comprueba que el foco vuelve a "Restablecer contraseña";
  3. hace `blur()` y comprueba que el foco queda en `<body>`;
  4. enfoca "Nombre completo" y lo comprueba;
  5. resuelve la petición;
  6. comprueba que el foco sigue en el campo.

  No perdió ninguna aserción: la final se conserva y se agregaron tres.
- **Borde de los campos:**
  - `Input` pasa de `border-2` a `border` (1 px) con `focus-visible:border-accent`. El grosor no cambia al enfocar y la altura sigue en `--control-height`.
  - Sin `focus:`, sin `ring-` y sin valores arbitrarios.
  - En el CSS generado, `aria-invalid:border-destructive` va después de `focus-visible:border-accent` y tiene la misma especificidad. Por eso un campo inválido conserva el borde rojo al enfocarlo, con el anillo azul por fuera. Es razonable, pero no está escrito (ver "Detalles menores").
  - `tokens.test.ts` verifica 3:1 contra vidrio, vidrio fuerte, tarjeta interna, `--surface` y `--background` con el valor nuevo, porque todas esas pruebas usan `COLOR.input`.
- **Botón `outline` opaco del admin:** el CSS generado sigue dando `border-width: 2px` y `border-color: var(--foreground)` (`#16202E`) bajo `:where([data-material="opaco"])`. Es el mismo color que antes daba `--input`, así que su aspecto no cambió.
- **Regla de §6 con el borde en `--accent` y el anillo juntos:** se sigue cumpliendo.
  - El anillo global (`:focus-visible`, 2 px sólidos en `--ring`, separado 2 px) no cambia.
  - Entre el borde de 1 px y el anillo queda una franja de 2 px del vidrio de detrás, así que los dos trazos se distinguen.
  - El anillo contra el vidrio da 5.88 en el peor caso.
  - El cambio de estado ya no depende solo del anillo: el borde pasa de gris a azul (1.54:1 entre los dos colores), y el anillo aporta el 3:1.
  - Que los dos trazos azules paralelos se vean bien lo juzga el humano; es justo lo que pidió ("el anillo de foco se queda").
- **Rectángulo grisáceo:**
  - **La causa está bien identificada.** La sombra `--shadow-glass` (`0 8px 32px`) de cada tarjeta llega hasta unos 40 px por debajo y 32 px a los lados. El contenedor con `overflow-y-auto` la recorta en el borde de su caja de relleno (con `overflow-y: auto`, `overflow-x` también deja de ser `visible`). La unión de las sombras de tarjetas apiladas, cortada en seco a la izquierda, a la derecha y abajo, forma un rectángulo gris con filos rectos.
  - **Lo que se ve "entre" las tarjetas** es, en parte, la propia sombra aprobada, acumulada en separaciones de 12 a 16 px. Eso no lo quita ningún ajuste del recorte.
  - **La corrección es un alivio parcial,** como declara el programador. Con 8 px de margen, el recorte cae donde la sombra todavía tiene cerca de la mitad de su intensidad.
  - **No encuentro una salida mejor sin decidir diseño:**
    - Un relleno igual a la sombra (`p-8`/`p-10` con su margen negativo) no cabe: a 360 px la página tiene 16 px de margen lateral, así que la lista se saldría de la ventana y habría desplazamiento horizontal. Arriba, además, la zona desplazable taparía el `h2` y las tarjetas se verían pasar por encima del título.
    - Las otras salidas son de diseño: quitar la sombra a las tarjetas dentro de una lista con scroll, o quitar el scroll propio. Le tocan a 01b, que rehace esta composición ("anuncios en filas de vidrio fuerte y lista desplazable"). `vidrio-fuerte` trae la misma sombra, así que el problema volvería.
  - **El `p-2 -m-2` actual es seguro:**
    - **360 px:** la lista entra 8 px en el margen de 16 px de `main`, sin desplazamiento horizontal. Arriba queda a 8 px del `h2` (la separación es `gap-4`) y abajo entra 8 px en el `gap-8` que la separa del formulario, sin solaparse.
    - **Escritorio:** el `aside` entra 8 px en `lg:px-12`, en `lg:py-12` y en el `lg:gap-12` que lo separa del formulario.

  No lo puede ver nadie sin navegador: lo decide el humano en la comprobación completa.
- **`CLAUDE.md`:** las seis inserciones coinciden palabra por palabra con `plan.md`, "Cierre de 01a", punto 2:
  - "Ubicaciones compartidas", dos: `components/ui/` y `components/`;
  - "Tokens", dos;
  - "Componentes", una;
  - "Formularios", una.

  No hay ningún otro cambio.
- **`README.md`, línea 228:** "El frontend tiene 37 archivos con 496 pruebas: 266 adversarias, en 18 archivos." Coincide con mi corrida.
- **`aprobacion.md` y `comprobacion-humano.md`:**
  - Registran lo que decidió el humano: la suspensión, que el PR espera a la comprobación completa después de 01b, el borde de 1 px con `--accent` solo en los campos, las marcas y lo que se agrega a 01b.
  - Están bien.
  - Un detalle para el humano, abajo: la casilla de 360 px de H-01.

### Problemas que bloquean

#### M-01 — `--input` tiene un valor propio, y `CLAUDE.md` y `DESIGN.md` dicen que es un derivado que apunta a un token
Dónde:
- `frontend/src/styles/tokens.css:15` (`--input: #5a6472;`);
- `docs/DESIGN.md:82` y `:50`;
- `CLAUDE.md`, "Tokens".

Por qué importa:
- `CLAUDE.md` dice: "Los derivados que shadcn espera (`--card`, `--popover`, `--secondary`, `--input`, `--ring`…) apuntan a un token propio, nunca a un valor". `DESIGN.md` §3 repite la regla en la línea 82.
- Con el cierre, `--input` es el único derivado de la lista que lleva un valor literal. El código contradice la regla escrita, y `DESIGN.md` se contradice a sí mismo: la tabla "Base" le da valor y la viñeta de la línea 82 lo prohíbe.
- Además, la fila de `--foreground` (línea 50) sigue diciendo "Tinta del contorno de los campos (`--input`)", que ya no es cierto.

Qué se espera:
- El color `#5A6472` vive en un token base con nombre propio. Ese token queda registrado en la tabla "Base" de `DESIGN.md` con su valor, su uso, su contraste y su origen (ver M-02).
- `--input` apunta a ese token con `var()`, como `--ring` apunta a `--accent`.
- La fila de `--input` dice a qué token apunta.
- La fila de `--foreground` deja de mencionar el contorno de los campos.
- `tokens.test.ts` comprueba el valor del token nuevo y que `--input` apunta a él.
- `tokens-r1.ataque` resuelve los `var()` y compara contra las tablas de §3, así que una fila nueva bien escrita no debería ponerla en rojo. **Si se pone en rojo, el programador se detiene y lo reporta, sin tocarla.**
- La otra salida es cambiar la regla para que `--input` deje de ser un derivado. Eso toca `CLAUDE.md` y lo decide el humano (ver "Para el humano").

#### M-02 — La marca de origen del valor `#5A6472` dice "decisión del humano", y ese valor no lo dictó el humano
Dónde: `docs/DESIGN.md`:
- tabla "Base", fila de `--input` (línea 54);
- viñeta de la línea 84;
- "Contraste verificado", líneas 132 y 152;
- §5, "Bordes" (línea 268);
- §7.3, "Borde de un campo" (línea 391).

Por qué importa:
- El humano fijó el criterio: 1 px, un color más claro, 3:1 contra el vidrio en el peor caso y `--accent` al enfocar.
- El valor `#5A6472` lo eligió el programador. Según la tabla "Marcas", un valor que el humano aún no aprueba es **propuesta**.
- Con "decisión del humano", el valor sale de la lista de cosas que el humano juzga en la comprobación completa. Eso es lo contrario de lo que pidió para el cierre: "solo pasa a propuesta aprobada lo que el humano aprobó".
- En la misma línea, la fila del anillo interior (línea 131) dice "(aprobado, H-04)", que no es ninguna marca de la tabla. La marca es "propuesta aprobada (2026-09-27)", como ya dice §6.

Qué se espera:
- En cada lugar se distinguen el criterio y el valor: el criterio (1 px, más claro, 3:1 en el peor caso, `--accent` al enfocar), con la marca "decisión del humano (2026-09-27)"; el valor `#5A6472` y el nombre del token nuevo de M-01, como "propuesta (cierre de DESIGN-01a)".
- La línea 131 usa la marca de la tabla.
- Después de editar `DESIGN.md`, `npm run test` desde `frontend/`.

### Problemas que no bloquean

#### M-03 — `DESIGN.md` §7.2 presenta como patrón reutilizable un alivio parcial y sin verificar
Dónde: `docs/DESIGN.md`, §7.2, "Contenedor con desplazamiento propio".

Por qué importa:
- El texto le dice a un encargo futuro que use `p-2 -m-2` en cualquier contenedor con scroll. El propio programador dice que 8 px no alcanzan para 40 px de sombra, y nadie lo ha visto.
- Un patrón de `DESIGN.md` se copia. Uno que no resuelve el problema se propagaría.
- Además, "sin mover el contenido ni el resto del layout" no es exacto cuando la lista llega a `max-h-56`: como la altura máxima ahora incluye el relleno, la lista ocupa 16 px menos en el layout, y el formulario de abajo sube 16 px a 360 px. Es cosmético, pero el texto lo niega. Pasa lo mismo con el comentario de `panel-anuncios.tsx`.

Qué se espera:
- El texto de §7.2 queda como observación con la marca "propuesta, sin verificar": la causa (el recorte de `--shadow-glass` en un contenedor con scroll), que el ajuste actual es un alivio parcial en `PanelAnuncios` y que la solución la decide 01b con la composición nueva.
- Sin la afirmación de que no mueve nada.
- Puede ir en la misma edición que M-01 y M-02.

#### M-04 — `ESTADO.md` no refleja el cierre (del orquestador, antes del commit)
Dónde: `docs/ESTADO.md` §2 y §3.

Por qué importa: el commit que sigue a este cierre deja `ESTADO.md` como fuente de la siguiente sesión, y hoy tiene tres problemas.
- **§3 sigue con dos filas ya resueltas por 01a:**
  - la de MF-05, "los botones que se deshabilitan … pierden el foco" (línea 190);
  - la de T-14, que dice "Sus 4 pruebas están como `it.fails`" (línea 191), cuando ya no existen.

  Ya lo pedí en la revisión final.
- **Faltan las filas nuevas que manda `plan.md`, "Cierre de 01a", punto 3:**
  - R-09, `tw-animate-css`;
  - R-10, radio de las casillas y `--text-display` en móvil;
  - S-07, foco blanco sobre superficies de color.
- **§2 termina con dos viñetas desactualizadas:**
  - "Después, el cierre de 01a: `DESIGN.md` (marcas), textos de `CLAUDE.md`…, `README.md` y este archivo": eso ya se hizo;
  - "Cierre de 01a (en curso)".

Qué se espera:
- Antes del commit, `ESTADO.md` dice que el cierre de 01a está aprobado y qué falta: el commit, confirmar la lista de 19, replanear 01b y la comprobación completa.
- Se retiran las dos filas de §3 y entran las del punto 3 del plan.
- Se agregan a 01b los dos puntos de "Para el humano" (rectángulo y borde sobre los orbes).
- El riesgo de `backdrop-filter` como bloque contenedor puede quedarse solo en `plan.md` si 01b se replanea enseguida, como está previsto.

### Detalles menores
- **Campo inválido y enfocado:** conserva el borde `--destructive` y lleva el anillo azul por fuera. §7.3 no lo dice. Una frase lo deja escrito; puede ir con M-02.
- **§7.3, "el anillo de foco de §6 se queda encima":** el anillo va por fuera, separado 2 px, no encima. Basta con "se queda, por fuera".
- **`tokens-r1.ataque.test.ts:188`:** la descripción dice "borde de 2 px de los campos y del outline opaco", pero el `outline` opaco ya no usa `--input`. La aserción sigue siendo válida (6.00 ≥ 3). El programador no la toca; que la actualice el tester en su próxima ronda (01b) y publique el hash nuevo. El `outline` opaco queda cubierto por `--foreground` / `--surface` (16.4).
- **`comprobacion-humano.md`:** la hoja de 01a describe en H-02 los "campos blancos con borde tinta de 2 px", y C-07 dice `--input` = `--foreground` `#16202E`. Ya no es así. Como la hoja de la comprobación completa se prepara con 01b, basta con que la nueva use el valor vigente: 1 px, `#5A6472` y, al enfocar, `--accent`. Así el humano no mide contra una referencia vieja.

### Ronda 2 del tester: no hace falta
Basta con mi revisión, también para las correcciones de M-01 a M-03. Razones:
- **El carril sensible de 01a se debe a `enEspera`, T-14 y el foco,** y el cierre no los toca: ni `button.tsx`, ni `ficha-de-cuenta.tsx`, ni ningún manejador. Los 39 hashes siguen iguales y las 266 adversarias están en verde contra el código del cierre.
- **Lo que cambió es presentación pura:**
  - un valor de token;
  - dos clases de `Input`;
  - el token del borde del `outline` opaco, que resuelve al mismo color;
  - relleno y margen en `panel-anuncios`.

  jsdom no pinta. La única prueba adversaria posible sería leer clases, y `tester.md` prohíbe localizar por clases de estilo. Las guardas permanentes que sí aplican (`clases-r1`: sin `ring-`, `focus:` ni valores sueltos; `tokens-r1`: tablas de `DESIGN.md` contra `tokens.css`) ya corrieron en verde sobre el cierre.
- **El único riesgo cuantificable, el contraste, lo recalculé por separado** y coincide al centésimo.
- **Lo que queda sin verificar es visual:** grosor, color, doble trazo azul y rectángulo. Eso lo decide el humano en la comprobación completa, y una ronda del tester no lo cambiaría.
- **M-01 a M-03** son un `var()`, una fila de tabla y texto de `DESIGN.md`, con `lint` y `test` en verde. Carril trivial dentro del encargo.
- **Si al corregir M-01 cambia algo más que `tokens.css`, `tokens.test.ts` y `DESIGN.md`,** por ejemplo un componente, lo reevalúo.

### Desacuerdos arbitrados
Ninguno. El programador y el orquestador coinciden en la causa del rectángulo, y el programador declaró que su corrección es parcial.

### Documentos a actualizar
- **`docs/DESIGN.md`** (programador): M-01, M-02, M-03 y los dos detalles de §7.3. Después, `npm run lint` y `npm run test` desde `frontend/`.
- **`frontend/src/styles/tokens.css` y `tokens.test.ts`** (programador): M-01.
- **`docs/ESTADO.md`** (orquestador): M-04.
- **`CLAUDE.md`:** sin más cambios, salvo que el humano elija la otra salida de M-01.
- **`README.md`:** correcto. Si las correcciones agregan pruebas, se actualiza el conteo con la corrida de mi revisión de esas correcciones.
- **`AGENTS.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md`:** sin cambios.

### Para el humano
**Decisión (solo si no te convence la salida por defecto de M-01):** si prefieres que `--input` deje de ser un derivado y lleve su color directamente, hay que cambiar una frase de `CLAUDE.md` ("Tokens") y otra de `DESIGN.md` §3. Recomiendo no hacerlo: la regla existe para que cada color tenga un solo nombre de origen, y un token base nuevo cuesta una línea.

**Antes del commit (carril sensible), en el diff:**
1. **`CLAUDE.md`:** las seis inserciones del plan. Coinciden palabra por palabra y no hay nada más.
2. **`package-lock.json`:** confirma por escrito la lista de 19 (sigue pendiente). La recalculé otra vez y no cambió.
3. **Los archivos del cierre:**
   - `components/ui/input.tsx`: 1 px y `focus-visible:border-accent`;
   - `components/ui/button-variants.ts`: el `outline` opaco con `border-foreground`;
   - `features/auth/components/panel-anuncios.tsx`;
   - `styles/tokens.css` y `tokens.test.ts`;
   - la prueba de M-01 en `features/admin/cuentas-view.test.tsx`;
   - `docs/DESIGN.md`, ya con M-01 a M-03 corregidos.
4. **Lo que ya te pedí en la revisión final:** `button.tsx`, `ficha-de-cuenta.tsx`, los 13 cambios a `enEspera` y los diffs de `cuentas-r1`, `-r3` y `-r4.ataque`.
5. **Archivos sin rastrear que van en el commit:**
   - los 8 nuevos del programador;
   - las 7 `*.ataque` de la ronda 1;
   - `resumen-programador.md` y `comprobacion-humano.md`.
6. **H-01 a 360 px:** en `comprobacion-humano.md`, la casilla de 360 px de H-01 está vacía (`[ X] 1280 px  [ ] 360 px`), y la transcripción dice que pasó en los dos anchos. `DESIGN.md` §4 ya lo da por aprobado a 360 px. Confírmalo o corrígelo.

**Para la comprobación completa, después de 01b (no se puede ver sin navegador):**
- **Borde de los campos:**
  - con los orbes detrás, que el gris de 1 px se distinga del vidrio;
  - que al enfocar, el borde azul y el anillo se lean como un solo indicador y no como una línea doble molesta;
  - que un campo con error se vea bien enfocado.
  - Mide el borde sobre el orbe azul, igual que `--warning` (plan de 01b): con el orbe azul detrás es el par de borde con menos margen (3.81 calculado, umbral 3).
- **Rectángulo grisáceo:** si sigue visible con el `p-2`. Como 01b rehace el panel de anuncios con filas de vidrio fuerte en una lista desplazable, que trae la misma sombra, pide que `plan-01b.md` resuelva ahí el recorte de la sombra (sombra dentro de listas con scroll, o composición sin scroll propio). No lo sigas parchando en 01a.
- **El resto de la hoja:** H-02 a H-10 y C-01 a C-12, como ya decidiste. En C-07 va el valor vigente del borde.

### DESIGN-01a — cierre, correcciones

Veredicto: **APROBADO**. No queda ningún problema que bloquee. El orquestador puede pedirle el commit al humano, en la rama y sin push, después de los pasos de "Para el humano" de la sección anterior.

Verificación propia (2026-09-27, desde `frontend/`):
- **lint:** código 0.
- **test:** código 0; 37 archivos y 496 pruebas en verde. `tokens-r1.ataque`, que lee las tablas de §3, también está en verde con la fila nueva.
- **build:** código 0.
- **V-01:** 39/39 OK; `find` encuentra exactamente 39 `*.ataque`.
- **Lockfile:** sin cambios. Siguen las mismas 19 bajas de `"peer": true`.

**Alcance de las correcciones:**
- `git status` muestra los mismos 65 archivos que en mi revisión del cierre; ninguno nuevo ni borrado.
- Las clases de `input.tsx`, de `button-variants.ts` y de los dos contenedores de `panel-anuncios.tsx` son idénticas a las que revisé. En `panel-anuncios.tsx` solo cambió el comentario.
- El conteo de pruebas no cambió.
- **Límite:** no hay una instantánea del estado anterior, así que el resto de `frontend/` lo comparo solo por esos indicios, no byte por byte.

**M-01 — resuelto.**
- En `tokens.css`: `--field-border: #5a6472` junto a `--border`, y `--input: var(--field-border)`. `--input` vuelve a ser un derivado, como pide `CLAUDE.md`.
- `tokens.test.ts` comprueba el valor literal y el `var()`. Las pruebas de 3:1 siguen usando el mismo color.
- En `DESIGN.md`:
  - hay una fila "Base" para `--field-border`;
  - la fila de `--input` dice a qué token apunta;
  - la de `--foreground` ya no habla de los campos.
- El nombre en inglés sigue la convención de los demás tokens (`--border`, `--surface`).

**M-02 — resuelto.**
- En cada lugar de §3, §5 y §7.3 se distinguen el criterio y el valor:
  - el criterio, con la marca "decisión del humano (2026-09-27)";
  - el valor y el nombre del token, con la marca "propuesta (cierre de DESIGN-01a)".
- El anillo interior usa la marca de la tabla: `primary`, "propuesta aprobada (2026-09-27)"; `destructive`, "propuesta".
- Los dos detalles de §7.3 (campo inválido y enfocado; "se queda, por fuera") también quedaron atendidos.

**M-03 — resuelto.**
- §7.2 queda como "propuesta, sin verificar en pantalla".
- Explica la causa y dice que el ajuste es un alivio parcial, que no es un patrón para copiar y que la solución de fondo la decide el encargo que rehaga la pantalla.
- Ya no dice que no mueve nada.

**M-04 — resuelto en §3** de `ESTADO.md`.
- Salieron las filas de MF-05 (pérdida de foco) y de T-14. Las otras filas de MF-05 que siguen son pendientes distintos, con destino ADMIN y AUTH-03.
- La fila de D3 quedó solo con lo de 01b, incluidos:
  - el recorte de la sombra;
  - el borde sobre los orbes;
  - la comprobación completa de la que depende el PR.
- Entraron las filas de shadcn, R-09, R-10, S-07 y `backdrop-filter`.
- Faltan las viñetas de §2, que el orquestador actualiza con este veredicto.

**Detalle menor (no bloquea):**
- `DESIGN.md:25` (§1, "Qué se conserva de la dirección C") sigue incluyendo "el borde tinta de los campos", y ya no es así. Estaba desde antes del encargo, pero ahora contradice §3.
- Basta con quitar esas palabras. Si se hace antes del commit (carril trivial), hay que correr `npm run test` desde `frontend/` y no hace falta otra revisión mía. Si no, entra con las ediciones de `DESIGN.md` de 01b.

**Ronda del tester:** sigue sin hacer falta. Las correcciones son un `var()`, filas y texto de `DESIGN.md` y un comentario; no cambian el comportamiento ni el color que se pinta.
