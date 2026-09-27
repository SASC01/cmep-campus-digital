# Plan — DESIGN-01b · sistema de diseño D3, segunda parte (fondo, marco, composición, pie y contraseña visible)
Estado: LISTO · **aprobado por el humano el 2026-09-27** (respuestas en "Respuestas del humano", P-06 incluida)
Carril: DESIGN-01b-1 **normal** · DESIGN-01b-2 **sensible** (P-01 A, decisión del humano)
Requisitos: `docs/DESIGN.md` §2, §3, §6, §7.1 a §7.4, §7.10, §8 y §10; RF-06 (login con panel de anuncios, compacto arriba en móvil), RF-01, RF-02, RF-04, RF-04b, RF-04d, RF-05 y RN-03 solo en su interfaz; RNF-05 (360 px) y RNF-08 (AA, teclado, etiquetas). Decisiones del humano de `aprobacion.md` (P-07 A, P-09 A, condición de detención, borde de los campos, pie con marcadores y botón para mostrar la contraseña).

**Base: `e39500a`** (commit de DESIGN-01a en `feat/design-01-sistema-de-diseno`, sin push). Ninguna precondición depende de `HEAD` ni de `docs/`.

Antecedente que este plan desarrolla: `plan.md`, "DESIGN-01b · resumen" (no se modifica). Lo que aquí cambia respecto de ese resumen se dice en "Diferencias con el resumen de `plan.md`".

**Aprobación del humano (2026-09-27):** P-01 (A), P-02 (A), P-03 (A), P-04 (A) y P-05 (B) con dos ajustes (texto literal en "Respuestas del humano"). Con P-01 (A), esta aprobación escrita cubre el carril sensible de 01b-2; falta la revisión humana del diff de 01b-2 antes de su commit (paso 22).

**Revisión del manager atendida:** `revision.md`, "DESIGN-01b — plan" (CAMBIOS REQUERIDOS). M-01 (redirección de `AccesoRestringidoView`) en §D-1, §D-6, E-6, V-14, "Pruebas existentes afectadas" y el punto de ataque 2; M-02 (`main.tsx`) en "No se toca" y V-08; M-03 (URL con espacios) en §D-5, las pruebas y el punto de ataque 3; M-04 en V-17. Los detalles menores, en §D-3, §D-5, §D-6, R-09, R-15 a R-18 y la hoja (H-10, H-16 y la ventana 5). Y M-05 de "DESIGN-01b — plan, correcciones" (APROBADO; ramas nuevas e importación de `./hooks`) en V-14, parte 2, en §D-1 y en E-6.

---

## Preguntas bloqueantes

Ninguna.

## Respuestas del humano (2026-09-27)

**P-01 · Carril de la parte del botón para mostrar la contraseña.** Respuesta: **(A).** 01b-1 (fondo, marco, composición y pie) en **normal**; 01b-2 (botón de contraseña) en **sensible**: aprobación escrita del plan (ya dada) y revisión humana del diff de 01b-2 antes de su commit.

**P-02 · División.** Respuesta: **(A).** Dos subentregas en la misma rama, **01b-1** y **01b-2**, cada una con su programador, sus rondas del tester y su revisión del manager, y **una sola comprobación visual completa al final**, antes del PR.

**P-03 · El pie en las pantallas del administrador.** Respuesta: **(A).** El mismo pie en todas las pantallas, también en `/admin`, con todos los enlaces; en `/admin` se ve opaco por el contexto.

**P-04 · Contraseña visible al enviar el formulario.** Respuesta: **(A).** Al enviar (evento `submit` del formulario, también si la validación falla), el campo vuelve a ocultarse y el botón a `aria-pressed="false"`.

**P-05 · Nombre accesible del botón.** Respuesta: **(B), con dos ajustes.** Texto literal del humano:
> P-05: (B) del manager, con dos ajustes:
>   1. En formularios con más de un campo de contraseña, cada botón lleva el nombre de su campo ("Mostrar contraseña nueva", "Mostrar confirmación de contraseña"), siempre fijo y con aria-pressed.
>   2. El nombre accesible va como texto visualmente oculto dentro del botón (sr-only), no como aria-label, para que getByLabelText no encuentre el botón al buscar el campo.
>   Vuelve a comprobar con los nombres por campo que ningún selector de prueba (incluidas las de ataque) encuentra el botón al buscar un campo. Si alguno lo encuentra, 01b-2 lleva ronda 0.

Se aplica en §D-7 (nombres, marcado y contrato), E-12, las pruebas y los puntos de ataque de 01b-2, V-17, la hoja (H-16) y `DESIGN.md`. El inventario de selectores se rehízo con los nombres por campo (§D-7): ninguna prueba encuentra el botón al buscar un campo, así que **01b-2 no lleva ronda 0**.

**P-06 · Confirmar dos nombres de botón (nueva; no bloquea: el plan aplica lo propuesto).** Los ejemplos del humano coinciden con una etiqueta ("Contraseña nueva" → "Mostrar contraseña nueva") y dan la pauta para otra ("Confirma la contraseña nueva" → "Mostrar confirmación de contraseña", tal como lo escribió). Falta un campo que el humano no nombró:
- **`/cambiar-contrasena`, campo "Contraseña temporal":** propongo **"Mostrar contraseña temporal"** (la etiqueta del campo, con "Mostrar" delante, igual que "Mostrar contraseña nueva").
- **Confirmación (en `/restablecer`, `/establecer-contrasena` y `/cambiar-contrasena`):** aplico el ejemplo literal del humano, **"Mostrar confirmación de contraseña"**, aunque la etiqueta dice "Confirma la contraseña nueva". Si prefiere que siga la etiqueta, la alternativa es "Mostrar confirmación de contraseña nueva".
Cambiar cualquiera de los dos es solo el valor de una constante de `features/auth/data.ts` y de las pruebas nuevas de 01b-2; se puede decidir hasta antes de que empiece 01b-2.

**Respuesta del humano a P-06 (2026-09-27; anotada por el orquestador):** "Mostrar confirmación de contraseña" para el campo "Confirma la contraseña nueva", y "Mostrar contraseña temporal" para el campo "Contraseña temporal". Son los nombres que ya aplica §D-7: la tabla de los 7 botones queda fijada tal cual, y las marcas "confirmar en P-06" de esa tabla se leen como confirmadas.

**Rama (propuesta, aceptada con la aprobación).** Seguir en **`feat/design-01-sistema-de-diseno`** a partir de `e39500a`. Razones: el humano quiere **un solo PR de DESIGN-01**, que se abre después de una sola comprobación completa; 01b depende de todo 01a y no puede salir de `main`; una rama nueva desde `e39500a` obligaría a apilar dos PR o a fusionarla de vuelta en esta, sin ganar nada. Cada subentrega termina en su propio commit del humano en esta rama, así el diff de 01b-2 (sensible) se revisa aparte. Ninguna verificación depende del nombre de la rama.

---

## Suposiciones

- **S-01 · Sin navegador para ningún agente.** Todo lo visual (orbes, movimiento, marco, recorte de la sombra, contraste medido, gestores de contraseñas) lo comprueba el humano con la hoja de "Comprobación completa". Ningún agente abre navegadores, con o sin interfaz.
- **S-02 · Sin dependencias nuevas.** Todo se hace con React, React Router, Tailwind, lucide-react y los componentes de 01a. No se toca ningún `package.json` ni el lockfile.
- **S-03 · "Inicio" y "login" (S-14 de `plan.md`).** Orbes en movimiento solo en `/login`, `/estudiante` y `/maestro` exactos (sin distinguir mayúsculas y sin la barra final). Quietos en todas las demás, `/admin` incluida (P-09 A). `/registro` va quieto.
- **S-04 · Quieto = pausado.** En una pantalla sin movimiento los orbes se pausan (`animation-play-state: paused`): al entrar directo quedan en su posición de la captura; al llegar desde el login se detienen donde estaban, sin salto. Con `prefers-reduced-motion: reduce` la animación se quita (`animation: none`) y quedan en la posición de la captura, como pide §7.1.
- **S-05 · Posición y trayectoria de los orbes (propuesta).** `DESIGN.md` da diámetro, ciclo y amplitud, no la posición. La propongo medida sobre la captura (1280 × 800) y la trayectoria dentro de la amplitud aprobada (§D-2). Las juzga el humano en H-10 y H-11.
- **S-06 · Fondo montado una sola vez, fuera del router.** Así los orbes no se reinician al pasar del login al dashboard, se ven también mientras las guardas cargan, y ni `router.tsx` ni las guardas cambian (§D-1).
- **S-07 · Enlaces del pie.** Una URL solo cuenta si es absoluta, sin espacios al inicio ni al final, y con esquema `https:`, `mailto:` o `tel:` ("Contacto" puede ser un correo o un teléfono). `http:`, `#`, rutas relativas, `javascript:`, una cadena vacía o una URL con espacios alrededor cuentan como "sin URL" (M-03: un espacio de más es un error de captura; en desarrollo se ve como marcador, así que queda a la vista). Los enlaces se abren en la misma pestaña (sin `target="_blank"`).
- **S-08 · Desarrollo y producción** se distinguen con `import.meta.env.PROD`, que Vite pone en `true` en `vite build` (el que usa Cloudflare Pages). Sin variables nuevas ni secretos.
- **S-09 · El pie no aparece en los estados de carga de las guardas** (`RequireSesion`, `RequireRol`, `RequireCambioDeContrasena`): son instantes de transición, no pantallas, y montarlo ahí exigiría tocar las guardas (condición de detención). Sí aparece en todas las pantallas, incluidos los estados de error y carga propios de `/acceso-restringido`.
- **S-10 · Acceso restringido sin insignia.** El resumen de `plan.md` preveía "icono `Lock` e insignia". La insignia repetiría el título ("Acceso restringido") y pondría texto `--danger` en la pantalla, que la guarda permanente `clases-r1.ataque` limita a los dos iconos. Solo se cambia el icono `Ban` por `Lock`.
- **S-11 · Títulos de los anuncios en 700.** Los anuncios pasan a filas de vidrio fuerte (§7.2) con título en `--text-body` 700, como la fila de entrega de §7.7. Así desaparece el peso 400 que no se carga (O-6 de 01a), y la pregunta de H-10 sobre el peso queda como confirmación.
- **S-12 · Barra superior a 360 px.** No caben el nombre del producto, el avatar, el nombre de la persona y "Cerrar sesión" con texto (≈ 390 px en 328 px útiles). Por debajo de 640 px: el nombre y el rol quedan solo para lectores de pantalla, el avatar se oculta y "Cerrar sesión" muestra solo su icono (el nombre accesible no cambia). Propuesta.
- **S-13 · Ningún `data.ts` de `features/` en 01b-1.** En 01b-2 solo se agrega una constante a `features/auth/data.ts` (E-12).
- **S-14 · Destinos del marco en `components/layout/data.ts`.** `ContenedorRol` los toma de su propio `rol`, así `require-rol.tsx` no cambia en absoluto (más estricto que el resumen, que permitía tocar sus propiedades). Duplica las rutas de `RUTA_POR_ROL` de `features/auth/data.ts`, igual que `NOMBRE_PRODUCTO` duplica `TEXTOS_LOGIN.titulo` (aceptado por el manager en 01a): `components/layout` no puede importar de `features/` (R-01).

---

## Alcance

### División (P-02 A)

| Subentrega | Contenido | Carril | Tester | Manager |
|---|---|---|---|---|
| **01b-1** | Fondo con orbes, movimiento y `prefers-reduced-motion`; marco (barra lateral, barra inferior, barra superior, avatar, monograma); composición de todas las pantallas; pie; recorte de la sombra del panel de anuncios; `DESIGN.md` | normal (con la condición de detención ampliada a `AccesoRestringidoView`, M-01) | Ronda 0 (guarda V-07) y rondas 1 a 3 | "DESIGN-01b — plan" (este plan entero) y "DESIGN-01b-1 — final" |
| **01b-2** | Botón para mostrar u ocultar la contraseña en los 5 formularios | sensible (P-01 A) | Rondas 1 a 3 (sin ronda 0: inventario en §D-7) | "DESIGN-01b-2 — final" |
| Después | **Una sola comprobación visual completa del humano** (hoja de este plan), cierre de marcas de `DESIGN.md`, textos de `CLAUDE.md` y PR | — | — | "DESIGN-01b — cierre" |

01b-2 empieza cuando 01b-1 tiene veredicto APROBADO del manager y el commit del humano (hash `<C>`, que el orquestador anota en `aprobacion.md`). Las dos subentregas no comparten archivos de producción.

### Entra
1. `FondoAnimado` con las capas de `DESIGN.md` §7.1, montado una vez en `main.tsx` por `app/fondo-de-la-app.tsx`; orbes solo con `transform`; movimiento por ruta; `prefers-reduced-motion`.
2. Marco de los roles: una sola `nav` que es barra lateral (≥ 768 px) y barra inferior fija (< 768 px); barra superior con el nombre del producto en dos colores, nombre y rol, avatar y "Cerrar sesión"; monograma; en `/admin`, barras opacas y activo en `--accent-soft`.
3. `MarcoPublico` para las pantallas sin rol (las de `LayoutPublico`, `/cambiar-contrasena` y `/acceso-restringido`).
4. Composición: panel de anuncios del login y del registro (panel de vidrio, filas de vidrio fuerte, lista desplazable accesible), pantallas de cuenta con monograma, acceso restringido, bienvenida, cabecera de `/admin`, `Cargando` sobre vidrio fuerte.
5. **Recorte de la sombra, de fondo:** las filas dentro de un contenedor con desplazamiento propio no llevan sombra; la sombra la da el panel que las contiene, que no está dentro de ningún recorte. Se retira el `p-2 -m-2` de 01a.
6. Pie en todas las pantallas, con "© <año actual> Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos" y los enlaces de un solo archivo (`components/layout/data.ts`).
7. Botón para mostrar u ocultar la contraseña en los 7 campos de contraseña de los 5 formularios, con nombre fijo por campo, `aria-pressed` y el nombre como texto `sr-only` (01b-2; P-05 B con ajustes).
8. `docs/DESIGN.md`: implementación y patrones nuevos, marcados como **propuesta**.
9. Definición de la hoja de la comprobación completa (la escribe el orquestador en `comprobacion-humano.md`).
10. Ronda 0 del tester para la guarda V-07 de `clases-r1.ataque` (§D-9).

### No entra
- Cambios en `app/router.tsx`, `require-rol.tsx`, `require-sesion.tsx`, `require-cambio-de-contrasena.tsx`, ni en las ramas y la redirección de `AccesoRestringidoView` (condición de detención, §D-1).
- Botón de avisos (llega con `notificaciones`), destinos nuevos de la barra (P-01 de `plan.md`: solo los que existen), bloque destacado, dashboards, `EstadoVacio`, insignias de estado.
- Pendientes de ADMIN (tarjetas a mano, `fichaDe` por rol, portales fuera del contexto opaco, etc.). En `/admin` solo cambia la cabecera (§D-6).
- El cambio del borde de los campos (resuelto en 01a; aquí solo se mide sobre los orbes).
- `viewport-fit=cover` en `index.html` y el área segura de iOS (R-10).
- Desinstalar `tw-animate-css` (R-09 de `plan.md`).
- URLs reales del pie (pendiente del humano antes de DEPLOY).

### Diferencias con el resumen de `plan.md`
| Resumen | Este plan | Por qué |
|---|---|---|
| `app/destinos.ts` y cambio de las propiedades de `ContenedorRol` en `require-rol.tsx` | Destinos en `components/layout/data.ts`; `require-rol.tsx` sin cambios | Más estricto con la condición de detención (S-14) |
| `app/router.tsx` "solo si el fondo se monta en una ruta de diseño" | `router.tsx` sin cambios; fondo en `main.tsx` | S-06 |
| "Acceso restringido con icono `Lock` e insignia" | Solo `Lock`; ramas y redirección de la vista intocables | S-10 y M-01 |
| Filas de vidrio fuerte en el panel de anuncios | Igual, sin sombra dentro de la lista | Recorte de la sombra (punto 5) |

---

## Diseño

Sin backend, sin API nueva y sin datos. Todo ocurre en el frontend.

### D-1 · Dónde se monta cada pieza (y por qué no se tocan las guardas)

```
main.tsx
└─ <Providers>
   ├─ <FondoDeLaApp router={router} />        ← fondo con orbes, fijo, una sola vez (app/)
   └─ <RouterProvider router={router} />      ← rutas SIN CAMBIOS
       ├─ LayoutPublico = <MarcoPublico><Outlet/></MarcoPublico>   (login, registro, recuperar, restablecer, establecer, diagnóstico)
       ├─ RequireCambioDeContrasena → CambiarContrasenaView = <MarcoPublico><TarjetaDeCuenta …/></MarcoPublico>
       └─ RequireSesion
           ├─ AccesoRestringidoView = <MarcoPublico>…</MarcoPublico>   (salvo la rama del Navigate)
           └─ RequireRol → ContenedorRol (nav + barra superior + main + pie)
```

- **`FondoDeLaApp`** (`app/fondo-de-la-app.tsx`) lee la ruta con `useSyncExternalStore` sobre `router.subscribe` y `router.state.location.pathname` (API pública de React Router 7.18), y pinta `<FondoAnimado enMovimiento={orbesEnMovimiento(pathname)} />`. Va fuera de `RouterProvider`, así que no necesita una ruta de diseño. Solo lee: no navega ni redirige.
- **`MarcoPublico`** (`components/layout/marco-publico.tsx`) recibe `children` y los pone en una columna que ocupa la ventana, con el pie al final. `LayoutPublico` pasa a ser `<MarcoPublico><Outlet /></MarcoPublico>`. `CambiarContrasenaView` y `AccesoRestringidoView` lo usan directamente porque sus rutas no cuelgan de `LayoutPublico`.
- **`ContenedorRol`** conserva sus propiedades (`rol`, `nombre`, `etiquetaRol`, `onCerrarSesion`, `cerrando`) y su `data-rol`, `data-material` y `data-densidad` en la raíz: `require-rol.tsx` no cambia.

**Bloque contenedor de lo fijo (M-03 de la revisión de 01a).** Un `backdrop-filter` distinto de `none` convierte al elemento en bloque contenedor de sus descendientes `position: fixed`. Por eso:
- el fondo está fuera de todo, en `main.tsx`;
- la `nav` fija (barra inferior) es hija directa de la raíz de `ContenedorRol`, que no lleva vidrio ni `transform`, `filter`, `contain` o `will-change`; la `nav` puede llevar `vidrio` en sí misma, porque su propio `backdrop-filter` no afecta a su posicionamiento;
- lo comprueba una prueba de estructura (ningún ancestro de la `nav` lleva una clase `vidrio*`) y el humano en H-12.

**Condición de detención.**
- Si cualquier paso exige cambiar `app/router.tsx`, `app/require-rol.tsx`, `app/require-sesion.tsx` o `app/require-cambio-de-contrasena.tsx`, **por mínimo que sea**, el agente se detiene y avisa al humano.
- **Redirección de `AccesoRestringidoView` (M-01; RN-03).** `features/auth/acceso-restringido-view.tsx` contiene una redirección de la misma clase que las guardas: `if (!data.accesoRestringido) { return <Navigate to={rutaPorRol(data.rol)} replace /> }`, que saca de ahí a quien no está restringido. 01b-1 cambia la composición de esa vista, pero:
  - el orden de sus ramas queda idéntico: error (`if (isError)`) → carga (`if (isPending)`) → `if (!data.accesoRestringido)` con su `Navigate` → contenido;
  - **no se agrega ni se quita ninguna rama ni ningún `return`** (ninguna línea con `if (` ni con `return` cambia; M-05): solo cambia lo que va dentro de cada `return (…)`;
  - las líneas `if (isError) {`, `if (isPending) {`, `if (!data.accesoRestringido) {` y `return <Navigate to={rutaPorRol(data.rol)} replace />` quedan idénticas, byte por byte, con su sangría; la rama del `Navigate` **no** se envuelve en `MarcoPublico`;
  - las importaciones de `Navigate`, `useMe`, `useCerrarSesion` (la línea que importa de `./hooks`, M-05), `rutaPorRol` y `mensajeDeErrorAuth` no cambian, ni las llamadas `useMe()` y `useCerrarSesion()`;
  - si hace falta cambiar cualquiera de esas cosas, el agente **se detiene y avisa al humano**, aunque el cambio parezca inocuo. Lo comprueba V-14 (partes 2 y 3).
- Si `useSyncExternalStore` con `router.subscribe` no sigue la navegación en la prueba, el agente se detiene: no se busca otra vía (tampoco una ruta de diseño en `router.tsx`).

### D-2 · Fondo con orbes

**Marcado** (`components/layout/fondo-animado.tsx`, `FondoAnimado({ enMovimiento }: FondoAnimadoProps)`):
```tsx
<div aria-hidden="true" data-fondo="" data-movimiento={enMovimiento ? "si" : "no"}>
  <div data-orbe="azul" />
  <div data-orbe="verde" />
  <div data-orbe="suave" />
  <div data-velo="" />
</div>
```
Sin clases: todo el estilo sale de `tokens.css` por atributos, para que la prueba de tokens lo cubra y las pruebas localicen por atributo, no por clase.

**`tokens.css`**, en el primer `:root` (el que leen `tokens.test.ts` y `tokens-r1.ataque`): `--orb-blue-size: 620px`, `--orb-green-size: 560px`, `--orb-soft-size: 520px`, `--orb-blue-cycle: 22s`, `--orb-green-cycle: 26s`, `--orb-soft-cycle: 30s`.

**Bloque 7 nuevo de `tokens.css`, "Fondo con orbes"**, después de las utilidades de vidrio:
```css
[data-fondo] {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background-color: var(--background);
}
[data-orbe] {
  position: absolute;
  border-radius: 9999px;
  will-change: transform;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}
[data-orbe="azul"] {
  width: var(--orb-blue-size);
  height: var(--orb-blue-size);
  top: -160px;
  left: -120px;
  background-color: var(--orb-blue);
  animation-name: orbe-azul;
  animation-duration: var(--orb-blue-cycle);
}
[data-orbe="verde"] {
  width: var(--orb-green-size);
  height: var(--orb-green-size);
  top: calc(50% - 280px);
  right: -144px;
  background-color: var(--orb-green);
  animation-name: orbe-verde;
  animation-duration: var(--orb-green-cycle);
}
[data-orbe="suave"] {
  width: var(--orb-soft-size);
  height: var(--orb-soft-size);
  bottom: -398px;
  left: calc(50% - 220px);
  background-color: var(--orb-soft);
  animation-name: orbe-suave;
  animation-duration: var(--orb-soft-cycle);
}
[data-velo] {
  position: absolute;
  inset: 0;
  background-color: var(--background-veil);
}
[data-fondo][data-movimiento="no"] [data-orbe] {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  [data-orbe] {
    animation: none;
  }
}
@keyframes orbe-azul {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(48px, 36px) scale(1.08); }
  100% { transform: translate(24px, -30px) scale(0.92); }
}
@keyframes orbe-verde {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-36px, 48px) scale(0.92); }
  100% { transform: translate(-54px, -24px) scale(1.08); }
}
@keyframes orbe-suave {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(48px, -36px) scale(1.08); }
  100% { transform: translate(-42px, -30px) scale(0.92); }
}
```
(Prettier puede partir las líneas de los `@keyframes`; da igual, el contenido es el que cuenta.)
- **Posiciones (propuesta, S-05):** medidas sobre la captura. Azul con centro en (190, 150) px de la ventana; verde con centro a 1144 px del borde izquierdo en 1280 y a media altura; suave con centro horizontal cerca del medio y solo 122 px visibles abajo.
- **Trayectoria (propuesta dentro de la amplitud aprobada):** el 0 % es la posición de la captura; ningún desplazamiento pasa de 60 px (los mayores, `48px, 36px` y `-54px, -24px`, dan 60 y 59.1) y la escala va de 0.92 a 1.08. `alternate` da la ida y vuelta. Solo `transform`.
- **Capas:** `--background` (el propio `[data-fondo]`), los tres orbes, el velo encima. `html` conserva `bg-background` como respaldo mientras carga el JavaScript.
- **Pintado:** con `z-index: -1` en el contexto de apilamiento raíz, el fondo queda debajo de todo el contenido en flujo. Por eso **se quitan los `bg-background`** de la raíz de `LayoutPublico` (ahora `MarcoPublico`), de `ContenedorRol` y del `main` de acceso restringido: taparían los orbes.
- **Sin `--color-background-veil`:** el velo se usa como variable CSS, no como utilidad (detalle de la revisión de 01a).

**`orbesEnMovimiento(pathname: string): boolean`** (`components/layout/lib.ts`): pasa a minúsculas, quita las barras finales (salvo en `/`) y devuelve si está en `RUTAS_CON_ORBES_EN_MOVIMIENTO = ["/login", "/estudiante", "/maestro"]` (`components/layout/data.ts`).

**`FondoDeLaApp({ router }: FondoDeLaAppProps)`** (`app/fondo-de-la-app.tsx`): `interface FondoDeLaAppProps { router: DataRouter }` (`import type { DataRouter } from "react-router"`; si `tsc` no lo acepta como tipo de `createBrowserRouter`, usar `ReturnType<typeof createBrowserRouter>`, sin `any`). La suscripción va en un `useCallback` con `[router]`, para no volver a suscribirse en cada render.

### D-3 · Marco de los roles (`ContenedorRol`)

**Estructura** (una sola `nav`, un solo "Cerrar sesión"; R-08 de `plan.md`):
```tsx
<div data-rol={rol} data-material={…} data-densidad={…}
     className="min-h-svh p-4 pb-24 md:grid md:grid-cols-[6rem_minmax(0,1fr)] md:gap-5 md:p-6">
  <BarraNavegacion destinos={DESTINOS_POR_ROL[rol]} />                 {/* <nav aria-label="Navegación principal"> */}
  <div className={cn("flex min-w-0 flex-col", ESPACIADO_POR_ROL[rol])}>
    <BarraSuperior nombre={nombre} etiquetaRol={etiquetaRol} onCerrarSesion={onCerrarSesion} cerrando={cerrando} />  {/* <header> */}
    <main className="flex-1"><Outlet /></main>
    <PieDePagina />                                                      {/* <footer> */}
  </div>
</div>
```
- `ESPACIADO_POR_ROL` y `CONTEXTO_POR_ROL` se mudan a `components/layout/data.ts` (detalle de la revisión de 01a), con su tipo en `types.ts`. `ESPACIADO_POR_ROL` pasa a ser la separación entre barra superior, contenido y pie: `gap-5` (20 px, `DESIGN.md` §5) para estudiante y maestro; `gap-4` (16 px) para admin. Hoy el maestro tiene `gap-6` (24 px) como separación intermedia; con los 20 px del estudiante, la escala de 4 px no tiene un valor entre 16 y 20, así que el maestro comparte el del estudiante. Propuesta; el humano la juzga en H-10.
- La columna de contenido debe ocupar al menos el alto de la ventana para que el pie quede abajo: `md:min-h-[calc(100svh-3rem)]` en esa columna, y en móvil `min-h-[calc(100svh-7rem)]` (alto menos `p-4` arriba y `pb-24`). El programador puede ajustar estas dos alturas si no dejan el pie al final; no cambia nada más.
- **Cuidado con la guarda V-07:** ni `data.ts` ni ningún comentario fuera de `contenedor-rol.tsx` pueden contener el texto literal `data-material` o `data-densidad` (la guarda de `clases-r1.ataque` busca esas palabras en todo `src/`).
- `pb-24` deja sitio a la barra inferior (64 px + 16 px de margen) para que el pie nunca quede debajo.

**`BarraNavegacion({ destinos })`** (`components/layout/barra-navegacion.tsx`):
- `<nav aria-label={TEXTOS_MARCO.navegacion}>` con clases: `vidrio fixed inset-x-4 bottom-4 z-10 flex h-16 items-center justify-center rounded-panel px-2 md:sticky md:inset-x-auto md:top-6 md:bottom-auto md:h-[calc(100svh-3rem)] md:w-24 md:flex-col md:justify-start md:gap-3 md:px-3 md:pt-5`. (`md:inset-x-auto` anula en escritorio el `inset-x-4` de la barra inferior, que con `sticky` serían márgenes de pegado horizontal.)
- Arriba, solo desde 768 px: `<Monograma className="hidden md:flex" />` (52 × 52 px, `--brand`, "cm").
- `<ul className="flex gap-3 md:flex-col">` con un `<li>` por destino y un `NavLink` con `end`:
  - base: `flex h-14 w-18 flex-col items-center justify-center gap-1 rounded-row text-caption font-medium text-foreground transition-colors duration-150 hover:vidrio-fuerte in-data-[material=opaco]:hover:bg-muted md:h-15`;
  - activo (función `className` de `NavLink`): además `vidrio-fuerte font-bold text-link in-data-[material=opaco]:bg-accent-soft`;
  - icono del destino con `aria-hidden="true"` y `className="size-5"`; etiqueta en un `span`;
  - `NavLink` pone `aria-current="page"` en el activo.
- Medidas: 96 px de ancho y todo el alto disponible en escritorio; elementos de 72 × 60 px (72 × 56 en la barra inferior, para caber en 64 px). En `/admin`, el contexto opaco vuelve opacas la barra y el activo pasa a `--accent-soft` (§7.4).

**`BarraSuperior({ nombre, etiquetaRol, onCerrarSesion, cerrando })`** (`components/layout/barra-superior.tsx`):
- `<header className="vidrio flex h-16 items-center justify-between gap-3 rounded-bar pr-3 pl-6">`.
- Izquierda: `<p className="font-heading text-h3 font-bold"><span>{NOMBRE_PRODUCTO.sigla}</span> <span className="text-brand">{NOMBRE_PRODUCTO.nombre}</span></p>`. **No es un encabezado** (R-08).
- Derecha, en este orden:
  - `<p className="flex flex-col text-right text-small leading-tight max-sm:sr-only"><span className="font-medium">{nombre}</span><span className="text-muted-foreground">{etiquetaRol}</span></p>` (nombre y rol como texto exacto, cada uno en su elemento; `router.test.tsx:87` busca "Estudiante");
  - `<AvatarUsuario nombre={nombre} className="max-sm:hidden" />`;
  - `<Button type="button" variant="outline" onClick={onCerrarSesion} enEspera={cerrando} className="max-sm:size-(--control-height) max-sm:px-0"><LogOut aria-hidden="true" /><span className="max-sm:sr-only">{TEXTOS_MARCO.cerrarSesion}</span></Button>`. El nombre accesible es "Cerrar sesión" en todos los anchos. **Es el mismo `enEspera=` que hoy está en `contenedor-rol.tsx`, mudado**: el conteo de 13 no cambia.
- Sin botón de avisos (llega con `notificaciones`).

**`AvatarUsuario({ nombre, className })`** (`components/avatar-usuario.tsx`): `<span aria-hidden="true" className={cn("flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-small font-bold text-accent-foreground", className)}>{inicialesDe(nombre)}</span>`. Decorativo: el nombre ya está como texto al lado.

**`Monograma({ className })`** (`components/layout/monograma.tsx`): `<span aria-hidden="true" className={cn("flex size-13 shrink-0 items-center justify-center rounded-card bg-brand font-heading text-h2 text-brand-foreground", className)}>{NOMBRE_PRODUCTO.monograma}</span>`. Radio de 16 px (§5, "Monograma"). Lo usan `components/layout` y `features/auth` (regla 5).

**`inicialesDe(nombre: string): string`** (`lib/format.ts`): primera letra (primer punto de código) de las dos primeras palabras, en mayúsculas con `toLocaleUpperCase("es-MX")`; una sola palabra da una letra; ignora espacios de más. "Ana López" → "AL"; "Andrea López García" → "AL"; "Administración" → "A"; "  ángel   ruiz " → "ÁR".

**Destinos** (`components/layout/data.ts`, respuesta 1 de `plan.md`):
```ts
export const DESTINOS_POR_ROL: Record<Rol, readonly Destino[]> = {
  estudiante: [{ etiqueta: "Inicio", ruta: "/estudiante", icono: House }],
  maestro: [{ etiqueta: "Inicio", ruta: "/maestro", icono: House }],
  admin: [{ etiqueta: "Cuentas", ruta: "/admin", icono: Users }],
}
```
El humano ya sabe que la barra tendrá un solo destino por rol (recordatorio en la hoja, H-12).

### D-4 · Pantallas sin rol (`MarcoPublico`)

`MarcoPublico({ children })`:
```tsx
<div className="flex min-h-svh flex-col">
  <div className="flex flex-1 flex-col">{children}</div>
  <div className="px-4 pb-4 lg:px-12 lg:pb-8"><PieDePagina /></div>
</div>
```
- Los `main` de las vistas pasan de `min-h-svh` a `flex-1` (login, registro, `TarjetaDeCuenta` y acceso restringido), para que el pie quede al final de la ventana sin forzar desplazamiento.
- Diagnóstico no cambia: su `div p-6` queda arriba y el pie abajo, porque el contenedor intermedio crece.

### D-5 · Pie de página

**Archivo único de enlaces** (`components/layout/data.ts`, sección "Enlaces del colegio", con un comentario que diga que **las URL se editan solo aquí**):
```ts
export const NOMBRE_DEL_COLEGIO = "Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos"

// Enlaces del pie (decisión del humano, 2026-09-27). Para publicar uno, escribe su URL completa,
// sin espacios alrededor (https://…, mailto:… o tel:…). Sin URL válida: en desarrollo se ve como
// marcador y en el build de producción no se muestra. Nunca uses "#".
export const ENLACES_DEL_COLEGIO: readonly EnlaceDelColegio[] = [
  { texto: "Sitio web", url: null },
  { texto: "Facebook", url: null },
  { texto: "Contacto", url: null },
  { texto: "Aviso de privacidad", url: null },
]
```
Tipos en `components/layout/types.ts`: `EnlaceDelColegio = { texto: string; url: string | null }` y `EnlaceVisible = { texto: string; url: string } | { texto: string; url: null }`.

**Funciones puras** (`components/layout/lib.ts`):
- `esUrlPublicable(url: string | null): boolean`, con retornos tempranos y en este orden:
  1. `false` si es `null` o `""`;
  2. **`false` si `url !== url.trim()`** (espacios o caracteres de control al inicio o al final, M-03): el analizador de URL los quitaría en silencio (`new URL(" https://x ")` es válida) y el `href` saldría con ellos;
  3. `false` si `new URL(url)` lanza (se atrapa la excepción);
  4. `true` solo si el protocolo es `https:`, `mailto:` o `tel:` (S-07).
  `"java\nscript:alert(1)"` queda rechazada por el paso 4 (su protocolo sale como `javascript:`).
- `enlacesVisibles(enlaces: readonly EnlaceDelColegio[], esProduccion: boolean): EnlaceVisible[]`: con URL publicable, `{ texto, url }` con la URL tal cual (ya sin espacios, por el paso 2); sin ella, en producción se omite y en desarrollo se devuelve `{ texto, url: null }` (marcador). Conserva el orden.
- `textoDeDerechos(ahora: Date): string` → `` `© ${ahora.getFullYear()} ${NOMBRE_DEL_COLEGIO}` `` (año local).

**`PieDePagina()`** (`components/layout/pie-de-pagina.tsx`):
```tsx
const enlaces = enlacesVisibles(ENLACES_DEL_COLEGIO, import.meta.env.PROD)
<footer className="vidrio flex flex-col gap-2 rounded-bar px-6 py-3 text-small text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
  <p>{textoDeDerechos(new Date())}</p>
  {enlaces.length > 0 && (
    <ul aria-label={TEXTOS_MARCO.enlacesDelColegio} className="flex flex-wrap gap-x-4">
      {enlaces.map(enlace => <li key={enlace.texto}>{renderEnlace(enlace)}</li>)}
    </ul>
  )}
</footer>
```
- Con URL: `<a href={url} className={buttonVariants({ variant: "link", size: "enlace" })}>{texto}</a>` (objetivo de 44 px, §7.3).
- Marcador (solo en desarrollo): `<span data-marcador="" className="inline-flex min-h-11 items-center text-link underline decoration-dashed underline-offset-4">{texto}</span>`. No es enlace ni recibe el foco; el subrayado discontinuo lo distingue de un enlace real. Propuesta.
- `renderEnlace` es una función local con retorno temprano (marcador primero), sin ternarios anidados.
- **Nunca `href="#"`:** la única forma de producir un `<a>` es con una URL publicable.
- Sin `<nav>` (una sola `nav` por pantalla, R-08); la lista lleva nombre accesible "Enlaces del colegio".
- El `<footer>` no queda dentro de `main`, `nav`, `aside`, `article` ni `section`: es el único `contentinfo` de cada pantalla.
- `import.meta.env.PROD` se lee al pintar (no al cargar el módulo), para que la prueba pueda cambiarlo con `vi.stubEnv`.
- En `/admin` el `vidrio` pasa a `--surface` por el contexto opaco, sin tocar el componente (P-03 A).

`TEXTOS_MARCO = { navegacion: "Navegación principal", cerrarSesion: "Cerrar sesión", enlacesDelColegio: "Enlaces del colegio" }` y `NOMBRE_PRODUCTO = { sigla: "CMEP", nombre: "Campus Digital", monograma: "cm" }` en `components/layout/data.ts`.

### D-6 · Composición de cada pantalla (01b-1)

Regla: **ningún texto queda directo sobre los orbes.** Todo va sobre `Card` (vidrio), vidrio fuerte o un sólido.

| Pantalla | Cambio |
|---|---|
| `/login`, `/registro` | `main` pasa a `grid flex-1 …` (sin `min-h-svh`). `PanelAnuncios` se rehace (abajo) |
| Pantallas de cuenta (`TarjetaDeCuenta`: recuperar, restablecer, establecer, cambiar) | `main` a `flex flex-1 items-center justify-center px-4 py-8`; en `CardHeader`, `<Monograma />` encima del `h1` |
| `/cambiar-contrasena` | `CambiarContrasenaView` envuelve su `TarjetaDeCuenta` en `MarcoPublico` |
| `/acceso-restringido` | **Solo cambia lo que devuelve cada rama, dentro de las reglas de la condición de detención (§D-1, E-6):** el `return` de error y el de carga envuelven su `div p-6` en `MarcoPublico`; el `return` del contenido envuelve su `main` en `MarcoPublico`, y ese `main` pasa a `flex flex-1 items-center justify-center px-4 py-8` (sin `bg-background` ni `min-h-svh`); la rama del `Navigate` no cambia ni se envuelve. En el contenido: `Ban` → `Lock` en la misma línea, con `aria-hidden="true"` y `text-danger` (S-10; la línea no se parte, para que la guarda de V-13 la siga encontrando con su `aria-hidden`); `<Monograma />` en `CardHeader`, como las pantallas de cuenta |
| `/estudiante`, `/maestro` (`BienvenidaView`) | El `section` pasa a `Card` con `CardHeader` (`h1` "Hola, {nombre}", texto exacto) y `CardContent` (el párrafo, `text-muted-foreground`). Error y carga, sin cambios |
| `/admin` (`CuentasView`) | La cabecera (`h1` y nota) pasa a `Card` con `CardHeader`; opaca por el contexto. Nada más de `features/admin` cambia |
| `/diagnostico` | Sin cambios de código |
| `Cargando` (compartido) | `<p role="status" aria-live="polite" className="inline-flex w-fit items-center gap-2 rounded-pill vidrio-fuerte px-4 py-2 text-muted-foreground">`: se lee sobre los orbes en las guardas y sobre cualquier panel. Dentro de `/admin`, opaco (ver R-09 para el instante de carga de `RequireRol`) |

**Panel de anuncios** (`features/auth/components/panel-anuncios.tsx`), que resuelve el recorte de la sombra de fondo:
```tsx
const tituloId = useId()
<aside aria-label="Anuncios" className="flex min-h-0 flex-col lg:self-center">
  <Card className="min-h-0 gap-4 py-4 lg:max-h-[calc(100svh-6rem)] lg:py-6">
    <h2 id={tituloId} className="px-4 text-h3 lg:px-6 lg:text-h2">{TEXTOS_LOGIN.tituloAnuncios}</h2>
    <ul tabIndex={0} aria-labelledby={tituloId}
        className="sin-sombra-de-vidrio mx-4 flex max-h-56 min-h-0 flex-col gap-3 overflow-y-auto lg:mx-6 lg:max-h-none lg:flex-1">
      {anuncios.map(anuncio => (
        <li key={anuncio.anuncioId} className="vidrio-fuerte flex flex-col gap-1 rounded-row p-4">
          <h3 className="text-body font-bold">{anuncio.titulo}</h3>
          <p className="line-clamp-1 text-small text-muted-foreground lg:line-clamp-none">{anuncio.texto}</p>
        </li>
      ))}
    </ul>
  </Card>
</aside>
```
- El `aside` conserva su nombre accesible "Anuncios".
- **Id del título con `useId`** (detalle del manager): evita un id duplicado si alguna vez se monta el panel dos veces. Es un hook de React dentro del componente, no un hook propio del módulo.
- **Por qué resuelve el recorte:** la lista con desplazamiento propio solo contiene filas sin sombra (`sin-sombra-de-vidrio` redefine `--shadow-glass` en su subárbol; el borde y el brillo del filo se quedan). La sombra la da la `Card`, que no está dentro de ningún contenedor que recorte. Se retiran `p-2 -m-2` y `lg:p-2 lg:-m-2`, y el comentario del componente se reescribe con esta explicación.
- **Utilidad nueva en `tokens.css`** (bloque 6, junto a las de vidrio): `@utility sin-sombra-de-vidrio { --shadow-glass: 0 0 transparent; }`. Su nombre no activa la guarda V-07 (`vidrio` va precedido de guion).
- **Accesibilidad:** la lista se puede enfocar con Tab y desplazar con las flechas; su nombre es el del `h2`. Con pocos anuncios en escritorio la lista no desplaza y aun así recibe el foco (R-16). Cada anuncio tiene su `h3`, así que el login conserva un solo `heading` "CMEP Campus Digital" (el `h1` del formulario).
- Móvil (RF-06): el panel queda arriba y compacto: lista de 224 px como máximo, una línea de texto por anuncio.

### D-7 · Botón para mostrar u ocultar la contraseña (01b-2; P-05 B con los ajustes del humano)

**Componente** `CampoContrasena` (`features/auth/components/campo-contrasena.tsx`). Solo lo usa `auth`, así que vive en el módulo (regla 5). Props: `interface CampoContrasenaProps extends Omit<ComponentProps<typeof Input>, "type"> { id: string; nombreDelBoton: string }`. `nombreDelBoton` es obligatorio: cada formulario pasa el de su campo (tabla de abajo).

```tsx
<div className="relative">
  <Input ref={campoRef} id={id} type={visible ? "text" : "password"}
         spellCheck={false} autoCapitalize="none" autoCorrect="off"
         className={cn("pr-12", className)} {...props} />
  <Button type="button" variant="ghost" size="icon"
          className="absolute top-0 right-0"
          aria-pressed={visible} aria-controls={id}
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={alternar}>
    {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    <span className="sr-only">{nombreDelBoton}</span>
  </Button>
</div>
```
`Input` ya pasa `ref` al `input` (React 19, lo recibe con el resto de las propiedades). Si no llegara, **detente**: no se toca `components/ui/input.tsx`.

**Nombre del botón (P-05 B, ajustes 1 y 2 del humano):**
- **Fijo.** No cambia al mostrar la contraseña: el estado lo dice `aria-pressed` ("presionado" = la contraseña se ve). Ya no hay "Ocultar contraseña".
- **Por campo.** En un formulario con un solo campo de contraseña, "Mostrar contraseña"; en los de varios, el nombre de su campo.
- **Como texto `sr-only` dentro del botón, sin `aria-label`** (ni `aria-labelledby`): `getByLabelText` busca en `<label>`, `aria-labelledby` y `aria-label`, no en el contenido de un botón, así que buscar un campo por su etiqueta nunca devuelve el botón. El nombre accesible del botón sale de su contenido: el icono es `aria-hidden` y el `span` aporta el texto.
- **`sr-only` existe con la escala anulada.** En Tailwind 4.3.3 es una utilidad estática (`node_modules/tailwindcss/dist/lib.mjs`: `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border-width: 0`), con valores literales: no depende de ninguna clave de tema, así que las anulaciones de `tokens.css` (`--color-*`, `--text-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--blur-*`…) no la afectan. 01b-1 ya la usa (`max-sm:sr-only` en la barra superior). V-10 de 01b-2 comprueba que aparece en el CSS de `dist/`.
- **`aria-controls` se conserva:** el botón cambia el `type` del campo, que es justo la relación que expresa `aria-controls`; con nombres por campo ya no hace falta para desambiguar, pero sigue siendo correcto y no estorba.

| # | Formulario (pantallas) | Campo (`id`) | Etiqueta del campo | Nombre del botón | Constante | Origen |
|---|---|---|---|---|---|---|
| 1 | `formulario-login.tsx` (`/login`) | `contrasena` | "Contraseña" | **"Mostrar contraseña"** | `mostrar` | humano (un solo campo) |
| 2 | `formulario-registro.tsx` (`/registro`) | `contrasena` | "Contraseña" | **"Mostrar contraseña"** | `mostrar` | humano (un solo campo) |
| 3 | `formulario-nueva-contrasena.tsx` (`/restablecer` y `/establecer-contrasena`) | `contrasenaNueva` | "Contraseña nueva" | **"Mostrar contraseña nueva"** | `mostrarNueva` | humano (ejemplo literal) |
| 4 | `formulario-nueva-contrasena.tsx` (`/restablecer` y `/establecer-contrasena`) | `confirmacion` | "Confirma la contraseña nueva" | **"Mostrar confirmación de contraseña"** | `mostrarConfirmacion` | humano (ejemplo literal); **confirmar en P-06** |
| 5 | `formulario-cambiar-contrasena.tsx` (`/cambiar-contrasena`) | `contrasenaActual` | "Contraseña temporal" | **"Mostrar contraseña temporal"** | `mostrarTemporal` | **propuesta; confirmar en P-06** |
| 6 | `formulario-cambiar-contrasena.tsx` (`/cambiar-contrasena`) | `contrasenaNueva` | "Contraseña nueva" | **"Mostrar contraseña nueva"** | `mostrarNueva` | humano (ejemplo literal) |
| 7 | `formulario-cambiar-contrasena.tsx` (`/cambiar-contrasena`) | `confirmacion` | "Confirma la contraseña nueva" | **"Mostrar confirmación de contraseña"** | `mostrarConfirmacion` | humano (ejemplo literal); **confirmar en P-06** |

Son 7 botones en el código; en pantalla, 9, porque el formulario de la fila 3 y 4 sirve a dos pantallas. En ninguna pantalla hay dos botones con el mismo nombre.

Contrato (lo ataca el tester):
- **CC-1 · No envía el formulario:** `type="button"`. Un clic, Enter o Espacio sobre el botón no disparan `submit`.
- **CC-2 · Nombre y estado:** nombre accesible fijo, el de la tabla, en los dos estados; `aria-pressed="false"` con el campo en `type="password"`, y `aria-pressed="true"` con el campo en `type="text"`. Sin atributo `aria-label` ni `aria-labelledby`. `aria-controls` apunta al `id` del campo. El icono (`Eye` u `EyeOff`) es `aria-hidden`; solo cambia el dibujo.
- **CC-3 · No mueve el cursor del campo:**
  - con el ratón o el dedo, `onMouseDown` cancela la acción por defecto: el foco se queda en el campo (en pantallas táctiles, el `mousedown` emulado del toque; si en un teléfono el teclado virtual se cerrara al tocar el ojo, la salida es `onPointerDown`: R-17 y H-16);
  - antes de cambiar el `type`, `alternar` guarda `selectionStart`, `selectionEnd` y si el campo tenía el foco; un `useLayoutEffect` con `[visible]` restaura la selección con `setSelectionRange` solo si el campo sigue teniendo el foco (Chromium la manda al final al cambiar el `type`);
  - con el teclado (Tab hasta el botón, Espacio), el foco se queda en el botón, como en cualquier botón.
- **CC-4 · No cambia el `autocomplete`:** el atributo `autoComplete` que recibe (`current-password` o `new-password`) sigue igual en los dos estados, igual que `name`, `id`, `required`, `aria-invalid` y `aria-describedby`.
- **CC-5 · Sin corrector:** `spellcheck="false"`, `autocapitalize="none"` y `autocorrect="off"` siempre. Con la contraseña a la vista el campo es de texto, y el corrector ortográfico mejorado de algunos navegadores envía el texto de los campos a un servicio externo. No cambia el `autocomplete`.
- **CC-6 · Al enviar** (P-04 A): un `useEffect` registra en `campoRef.current?.form` un escuchador de `submit` en fase de captura que hace `flushSync(() => setVisible(false))`, y lo retira al desmontar. El envío sigue su curso (no llama a `preventDefault`). **Sigue siendo coherente con el nombre fijo:** al enviar, el botón conserva su nombre y pasa a `aria-pressed="false"`, que es justo el estado "oculta".
- **CC-7 · Independientes:** cada campo tiene su botón y su estado.
- **Objetivo y foco:** 44 × 44 px (`size="icon"` = `--control-height`), dentro del campo a la derecha; el campo reserva `pr-12`. Foco con la regla global de §6. Icono en `--foreground` sobre `--surface` (16.4).
- Los hooks de estado y referencia van dentro del componente (estado local de presentación, como `useState` en los formularios actuales); no hace falta `hooks.ts`, que no se toca.

**Textos** (`features/auth/data.ts`, E-12):
```ts
// Botón para mostrar la contraseña (P-05 B, humano, 2026-09-27): nombre fijo por campo, con aria-pressed.
export const TEXTOS_CAMPO_CONTRASENA = {
  mostrar: "Mostrar contraseña",
  mostrarNueva: "Mostrar contraseña nueva",
  mostrarConfirmacion: "Mostrar confirmación de contraseña",
  mostrarTemporal: "Mostrar contraseña temporal",
} as const
```

**Dónde:** en cada uno de los 7 campos, `<Input … type="password" …/>` pasa a `<CampoContrasena … nombreDelBoton={TEXTOS_CAMPO_CONTRASENA.<constante>} />` con las mismas propiedades, sin `type` (la constante, en la tabla). El `Label` sigue apuntando al campo con `htmlFor`: `getByLabelText("Contraseña")` sigue devolviendo el `input`.

**Inventario de selectores, rehecho con los nombres por campo (sobre `e39500a`).** Pregunta: con el botón y su texto `sr-only` en el DOM ("Mostrar contraseña", "Mostrar contraseña nueva", "Mostrar confirmación de contraseña", "Mostrar contraseña temporal"), ¿alguna consulta que busca un campo, o que cuenta o recorre controles, puede encontrarlo? Revisé todas las pruebas de `frontend/src`, normales y `*.ataque`. Rutas relativas a `frontend/src`.

*A. Por etiqueta (`getByLabelText`, `queryByLabelText`, `findByLabelText`) sobre campos de contraseña.* Todas con **cadena exacta**. El botón no tiene `aria-label`, `aria-labelledby` ni `<label>`, y `getByLabelText` no mira el contenido de un botón: **a salvo todas.**
- `features/auth/login-view.test.tsx:50`, `:71` ("Contraseña").
- `features/auth/registro-view.test.tsx:46`, `:66` ("Contraseña").
- `features/auth/restablecer-view.test.tsx:64`, `:88`, `:119` ("Contraseña nueva"); `:67`, `:91`, `:122` ("Confirma la contraseña nueva").
- `features/auth/establecer-contrasena-view.test.tsx:45`, `:48`.
- `features/auth/cambiar-contrasena-view.test.tsx:53` ("Contraseña temporal"), `:54`, `:55`.
- `features/auth/enlace-r1.ataque.test.tsx:70`, `:71`, `:124`, `:255`, `:256`, `:274`, `:286`, `:287`, `:292`, `:313`, `:326`, `:339`.
- `features/auth/enlace-r2.ataque.test.tsx:78`, `:79`, `:154`.
- `app/router.ataque.test.tsx:61`, `:238` ("Contraseña").
- `app/sesion-r2.ataque.test.tsx:69`, `:179` ("Contraseña").
- `app/cuentas-r1.ataque.test.tsx:71`, `:72`, `:73`, `:176`, `:366`, `:369`, `:372`.
- `app/cuentas-r2.ataque.test.tsx:81`, `:82`, `:83`.
- `app/en-espera-r1.ataque.test.tsx:81` (auxiliar `escribir`), llamado con cadenas exactas en `:137`, `:150` ("Contraseña"), `:170`, `:182`, `:195` ("Contraseña nueva"), `:171`, `:183`, `:196` ("Confirma la contraseña nueva") y `:194` ("Contraseña temporal").
- Las demás consultas por etiqueta ("Correo", "Nombre completo", "Correo exacto de la cuenta", "Correo correcto"; en `features/admin/*`, `features/auth/*`, `app/*`) también son exactas y no se parecen a ningún nombre de botón.

*B. Por texto (`getByText`, `queryByText`, `findByText`, `getAllByText`) con "contraseña", "confirm" o expresión regular.* **A salvo todas.**
- Cadenas exactas que no coinciden con ningún nombre de botón: `app/cuentas-r1.ataque.test.tsx:182` ("Correo o contraseña incorrectos."); `features/auth/cambiar-contrasena-view.test.tsx:100`, `features/auth/restablecer-view.test.tsx:128` y `features/auth/enlace-r1.ataque.test.tsx:275` ("Las contraseñas no coinciden."); `features/auth/registro-view.test.tsx:65` ("La contraseña debe tener al menos 10 caracteres"); `features/admin/cuentas-r1.ataque.test.tsx:223` y `:260` (en `/admin`, donde no hay botones de contraseña).
- Expresiones regulares: `features/auth/login-view.test.tsx:80` (`/Acude a administración/`), `app/router.ataque.test.tsx:145` y `:182` (`/Hola,/`, `/Hola, Ana/`), `app/sesion-r2.ataque.test.tsx:156` (`/Hola, Ana/`), `features/admin/cuentas-r2.ataque.test.tsx:274` (`/Correo actualizado/`). Ninguna contiene "contraseña", "confirm", "mostrar" ni un comodín que case con "Mostrar …".
- `app/errores-r1.ataque.test.tsx:126` (`getAllByText(mensaje)`, con el texto exacto de cada error de campo): ningún mensaje es igual a un nombre de botón.

*C. Botones sin nombre, con expresión regular o con conteos.* **A salvo todas.**
- No hay ningún `getByRole("button")` sin nombre ni con `name: /…/`. Todos los localizadores de botón usan cadena exacta ("Guardar contraseña", "Iniciar sesión", "Crear cuenta", "Activar mi cuenta", "Guardar y continuar", "Cerrar sesión", "Restablecer contraseña"…): ninguno es igual a un nombre de la tabla.
- `app/contexto-r1.ataque.test.tsx:72` a `:74` (`queryAllByRole("button" | "textbox" | "link")`) y `:98`: solo se afirman sobre `/admin`, que no tiene campos de contraseña; en `/login`, `/registro`, `/restablecer`, `/establecer-contrasena` y `/cambiar-contrasena` esa prueba solo cuenta `[data-material]` y `[data-densidad]`, que el botón no tiene.
- `components/layout/contenedor-rol.test.tsx:54` (conteo de "Cerrar sesión", en el marco de rol): no aplica.
- `app/en-espera-r1.ataque.test.tsx:89` (`getByRole("button", { name: nombre })` con el nombre exacto del botón de envío): no aplica.

*D. `textbox`.* Solo `app/contexto-r1.ataque.test.tsx:73`, en `/admin`. Ninguna prueba existente muestra la contraseña (el campo solo pasa a `type="text"` si alguien pulsa el ojo). **A salvo.**

*E. Descripción accesible (`toHaveAccessibleDescription`).* `features/auth/enlace-r1.ataque.test.tsx:277` (confirmación), `:294` (contraseña nueva), `:437` (correo); `app/errores-r1.ataque.test.tsx:125`; `features/admin/cuentas-r1.ataque.test.tsx:493`. Todas leen la descripción del campo por su `aria-describedby`, que no incluye el botón. **A salvo.**

*F. Recorridos y conteos dentro de un formulario (`within`, `querySelector`, `closest`, orden de Tab).* **A salvo todas.**
- `app/errores-r1.ataque.test.tsx:114` (`form.querySelectorAll('input[aria-invalid="true"]')`): el botón no es un `input` ni lleva `aria-invalid`; los conteos de `:73` a `:103` no cambian.
- `app/en-espera-r1.ataque.test.tsx:102` (`control.closest("form")`) y `:104`-`:105` (`submit` y `requestSubmit`): con el campo oculto, CC-6 no cambia nada.
- `within(ficha)` (`features/admin/cuentas-r2.ataque.test.tsx:304`-`:305`, `cuentas-r3:460`-`:461`, `cuentas-r4:464`-`:465`, `cuentas-r1:413`-`:415`), `controlesEnfocables` (`cuentas-r3:121`, `cuentas-r4:125`) y los descriptores del foco con `textContent || aria-label` (`foco-r1:105`, `cuentas-r3:153`, `cuentas-r4:175`, `cuentas-r2:317`): todos en `/admin`, sin campos de contraseña.
- `querySelector("svg…")` en `components/ui/button.test.tsx:14`, `components/error-de-campo.test.tsx:11`, `app/errores-r1.ataque.test.tsx:129` y `features/admin/cuentas-r1.ataque.test.tsx:385`-`:386`: sobre otros elementos.
- Ninguna prueba recorre con Tab una pantalla de cuenta.

*G. Texto de toda la página.* `features/auth/enlace-r1.ataque.test.tsx:389`-`:390` (`/recuperar`, sin campo de contraseña) y `features/admin/cuentas-r3.ataque.test.tsx:343` (`/admin`). Los `toHaveTextContent` de todo `src/` se aplican a `alert` o `status`, que no contienen el botón. **A salvo.**

**Resultado: ningún selector encuentra el botón al buscar un campo, ni normal ni de ataque. 01b-2 no lleva ronda 0.** Condición de parada: si al aplicar `CampoContrasena` alguna prueba existente se pone en rojo, el programador se detiene y lo reporta (paso 17); sería señal de que este inventario falló y haría falta una ronda 0.

### D-8 · Contraste

Colores nuevos: ninguno. Pares nuevos de uso (todos ya verificados en `DESIGN.md` §3):
- `--brand` sobre vidrio ("Campus Digital" en la barra superior): 5.0 (igual que `--success`).
- `--link` sobre vidrio fuerte (activo de la barra): 8.8; sobre `--accent-soft` (activo en `/admin`): 9.1.
- `--foreground` sobre vidrio fuerte (títulos de anuncios, etiqueta de la barra): 12.7; `--muted-foreground` sobre vidrio fuerte (texto de anuncios, `Cargando`): 7.3.
- `--muted-foreground` y `--link` sobre vidrio (pie): 6.0 y 7.2.
- `--accent-foreground` sobre `--accent` (avatar): 9.2. `--brand-foreground` sobre `--brand` (monograma, texto de 22 px): 7.9.
- `--foreground` sobre `--surface` (icono del ojo, 01b-2): 16.4 (umbral 3).
- **Borde de los campos `--field-border` sobre vidrio con el orbe azul detrás: 3.81 (umbral 3).** Es el par de borde con menos margen y depende del velo (sin velo, 2.90). Se mide en C-07.
- `--warning` solo aparece sobre `--surface` ("Cuenta inactiva" en `/admin`): 7.1. Ninguna pantalla de 01b pone `--warning` sobre vidrio.

`tokens.test.ts` agrega `--brand` sobre vidrio, vidrio fuerte y tarjeta interna (≥ 4.5), y `--link` sobre `--accent-soft` (≥ 4.5). Si alguno no llega, **detente** (no cambies valores).

### D-9 · Ronda 0 del tester (01b-1): la guarda V-07

`styles/clases-r1.ataque.test.ts`, prueba "V-07: vidrio solo en Card, vidrio fuerte solo en las variantes del botón, sin vidrio azul", exige **igualdad exacta**: `vidrio` solo en `card.tsx` y `vidrio-fuerte` solo en `button-variants.ts`. 01b-1 pone `vidrio` en la barra de navegación, la barra superior y el pie, y `vidrio-fuerte` en la barra de navegación, el panel de anuncios y `Cargando`: la prueba se pondría en rojo por un cambio de diseño previsto, no por un defecto.

**Cambio de la ronda 0** (verde antes y después del programador): la igualdad exacta pasa a "solo archivos de una lista permitida, y el archivo original sigue ahí". En la ronda 1, el tester la devuelve a igualdad exacta con la lista final, conservando las dos aserciones de "el archivo original sigue ahí" (`card.tsx` y `button-variants.ts`). Texto exacto que sustituye a esa prueba completa (de `it("V-07: …` a su `})`):
```ts
  it("V-07: vidrio y vidrio fuerte solo donde lo permite el plan, sin vidrio azul", () => {
    // DESIGN-01b-1, ronda 0 (plan-01b.md, §D-9): lista permitida mientras el programador trabaja.
    // En la ronda 1 vuelve a igualdad exacta con la lista final.
    const VIDRIO_PERMITIDO = [
      "/src/components/layout/barra-navegacion.tsx",
      "/src/components/layout/barra-superior.tsx",
      "/src/components/layout/pie-de-pagina.tsx",
      "/src/components/ui/card.tsx",
    ]
    const VIDRIO_FUERTE_PERMITIDO = [
      "/src/components/cargando.tsx",
      "/src/components/layout/barra-navegacion.tsx",
      "/src/components/ui/button-variants.ts",
      "/src/features/auth/components/panel-anuncios.tsx",
    ]
    const vidrio = rutasDe(coincidencias(/"[^"\n]*(?<![\w-])vidrio(?![\w-])[^"\n]*"/))
    expect(vidrio).toContain("/src/components/ui/card.tsx")
    expect(vidrio.filter((ruta) => !VIDRIO_PERMITIDO.includes(ruta))).toEqual([])
    const vidrioFuerte = rutasDe(coincidencias(/\bvidrio-fuerte\b/))
    expect(vidrioFuerte).toContain("/src/components/ui/button-variants.ts")
    expect(vidrioFuerte.filter((ruta) => !VIDRIO_FUERTE_PERMITIDO.includes(ruta))).toEqual([])
    expect(coincidencias(/\bvidrio-azul\b/)).toEqual([])
    expect(rutasDe(coincidencias(/data-material|data-densidad/))).toEqual([
      "/src/components/layout/contenedor-rol.tsx",
    ])
  })
```
Las expresiones de búsqueda, la de `vidrio-azul` y la de `data-material` no cambian. Ninguna otra línea del archivo cambia.

---

## Cambios por capa

### shared/, backend/ (core, adapters, handlers, workers, prisma)
Sin cambios. Sin migración.

### infra/ y .env.example
Sin cambios. Ninguna variable de entorno nueva (S-08).

### frontend/ — DESIGN-01b-1

**Nuevos**
- `src/app/fondo-de-la-app.tsx` y `fondo-de-la-app.test.tsx` (§D-2).
- `src/components/layout/fondo-animado.tsx` y `fondo-animado.test.tsx` (§D-2).
- `src/components/layout/marco-publico.tsx` (§D-4).
- `src/components/layout/barra-navegacion.tsx`, `barra-superior.tsx`, `monograma.tsx` (§D-3).
- `src/components/layout/pie-de-pagina.tsx` y `pie-de-pagina.test.tsx` (§D-5).
- `src/components/layout/data.ts`: `NOMBRE_PRODUCTO`, `TEXTOS_MARCO`, `ESPACIADO_POR_ROL`, `CONTEXTO_POR_ROL`, `DESTINOS_POR_ROL`, `RUTAS_CON_ORBES_EN_MOVIMIENTO`, `NOMBRE_DEL_COLEGIO`, `ENLACES_DEL_COLEGIO`.
- `src/components/layout/lib.ts` y `lib.test.ts`: `orbesEnMovimiento`, `esUrlPublicable`, `enlacesVisibles`, `textoDeDerechos`.
- `src/components/avatar-usuario.tsx` (§D-3).
- `src/app/marco.test.tsx` (pie y marco en cada ruta; "Pruebas requeridas").

**Modificados**
- `src/main.tsx`: importa `FondoDeLaApp` de `./app/fondo-de-la-app` y lo pinta dentro de `<Providers>`, antes de `<RouterProvider router={router} />`, con `router={router}` (E-5).
- `src/styles/tokens.css`: tokens de los orbes en el primer `:root`; `@utility sin-sombra-de-vidrio`; bloque 7 (§D-2). `tokens.test.ts`: lo de "Pruebas requeridas".
- `src/components/layout/types.ts`: agrega `Destino` (`{ etiqueta: string; ruta: string; icono: LucideIcon }`), `ContextoDeRol`, `EnlaceDelColegio` y `EnlaceVisible`. La reexportación de `Rol` no cambia (E-3).
- `src/components/layout/contenedor-rol.tsx` (§D-3) y `contenedor-rol.test.tsx`.
- `src/components/layout/layout-publico.tsx`: `<MarcoPublico><Outlet /></MarcoPublico>`.
- `src/components/cargando.tsx` (§D-6).
- `src/lib/format.ts` y `format.test.ts`: solo agregan `inicialesDe` y sus pruebas (E-2).
- `src/features/auth/components/panel-anuncios.tsx`, `tarjeta-de-cuenta.tsx` (§D-6).
- `src/features/auth/login-view.tsx`, `registro-view.tsx`, `bienvenida-view.tsx`, `cambiar-contrasena-view.tsx` (§D-6).
- `src/features/auth/acceso-restringido-view.tsx` (§D-6, con la excepción de alcance exacto E-6).
- `src/features/admin/cuentas-view.tsx` (§D-6, solo la cabecera).

### frontend/ — DESIGN-01b-2
- **Nuevos:** `src/features/auth/components/campo-contrasena.tsx` y `campo-contrasena.test.tsx`; `src/features/auth/contrasena-visible.test.tsx` (los 5 formularios).
- **Modificados:** `formulario-login.tsx`, `formulario-registro.tsx`, `formulario-nueva-contrasena.tsx`, `formulario-cambiar-contrasena.tsx` (solo el campo, su `nombreDelBoton` y las importaciones); `features/auth/data.ts` (solo la constante, E-12).

### docs/DESIGN.md (E-1 en 01b-1; E-13 en 01b-2)
A mano, sin formateador. Todo lo nuevo, marcado **propuesta** con su origen ("DESIGN-01b, propuesta"); las marcas existentes no se tocan ni se borran. Después, `npm run test` desde `frontend/` (`tokens-r1.ataque` lee las tablas de §3 a §5: no cambies su formato).

**01b-1:**
- **Cabecera, "Estado de aplicación":** DESIGN-01b-1 (fecha): fondo con orbes, movimiento, marco, composición, pie y recorte de la sombra. Pendiente: botón de contraseña (01b-2) y la comprobación visual completa.
- **§3, "Materiales":** viñeta "Implementación (DESIGN-01b, propuesta)": tokens `--orb-*-size` y `--orb-*-cycle`; estilos del fondo por atributos (`data-fondo`, `data-orbe`, `data-velo`, `data-movimiento`) en `tokens.css`; sin `--color-background-veil`.
- **§7.1:** posiciones y trayectorias (propuesta, S-05); cómo se decide el movimiento (`orbesEnMovimiento`, rutas exactas; S-03); pausa en las pantallas quietas y `animation: none` con movimiento reducido (S-04); el fondo se monta una sola vez, fuera del router. En la tabla de alcance, columna nueva "Rutas hoy": `/login`, `/estudiante`, `/maestro` (en movimiento); `/admin` (quietos, opaco); `/registro`, `/recuperar`, `/restablecer`, `/establecer-contrasena`, `/cambiar-contrasena`, `/acceso-restringido`, `/diagnostico` (quietos, vidrio).
- **§7.2:** sustituye la viñeta "Contenedor con desplazamiento propio (cierre de DESIGN-01a…)" por: "**Contenedor con desplazamiento propio (DESIGN-01b, propuesta; sustituye al alivio parcial de 01a):** las superficies de vidrio dentro de un contenedor con `overflow` propio no llevan sombra (utilidad `sin-sombra-de-vidrio` en el contenedor, que redefine `--shadow-glass`; se quedan el borde y el brillo del filo). La sombra la da el panel que lo contiene, que no está dentro de ningún recorte. Así la sombra nunca se corta en seco." Y una viñeta nueva: "**Lo fijo nunca dentro del vidrio (DESIGN-01b):** un `backdrop-filter` convierte a su elemento en bloque contenedor de lo fijo (`position: fixed`) que tenga dentro. El fondo con orbes se monta fuera del router, y la barra inferior cuelga de un contenedor sin vidrio."
- **Patrones nuevos en §7.2:** "Panel de anuncios del login" (panel de vidrio, filas de vidrio fuerte sin sombra, lista enfocable con el nombre del título, compacto arriba en móvil) y "Pantallas de cuenta" (panel de vidrio centrado con el monograma encima del título).
- **§7.4:** lo implementado: una sola `nav`; barra inferior flotante a 16 px de los bordes, con elementos de 72 × 56 px; en la barra superior, por debajo de 640 px, nombre y rol solo para lectores de pantalla, avatar oculto y "Cerrar sesión" solo con icono (S-12); destinos de hoy; avatar decorativo con `inicialesDe`. Todo propuesta, salvo lo ya aprobado, que conserva su marca.
- **§5, "Espaciado":** 20 px entre barra superior, contenido y pie para estudiante y maestro; 16 px en el administrador (propuesta; el maestro pasa de 24 a 20 px, §D-3).
- **§7.10, "Carga":** `Cargando` sobre vidrio fuerte en píldora (propuesta).
- **§7.12 nuevo, "Pie de página" (DESIGN-01b, propuesta):** contenido (texto del © con el año calculado), `components/layout/data.ts` como único lugar de las URL, URL publicables (S-07, sin espacios alrededor), marcador en desarrollo con subrayado discontinuo, nada en producción, nunca `href="#"`, vidrio (opaco en pantallas densas), sin `nav`. Origen del texto y del comportamiento: decisión del humano (2026-09-27).

**01b-2:**
- **§7.3:** viñeta "**Campo de contraseña (DESIGN-01b; nombre y estado: decisión del humano, 2026-09-27; aspecto: propuesta):**" botón de ojo dentro del campo, a la derecha, 44 px, `ghost`; icono `Eye`/`EyeOff` en `--foreground` (16.4 sobre `--surface`); **nombre fijo por campo** ("Mostrar contraseña" si el formulario tiene un solo campo; si tiene varios, el nombre de su campo), como texto `sr-only` dentro del botón y nunca como `aria-label`; el estado, con `aria-pressed`; vuelve a ocultarse al enviar el formulario; no mueve el cursor del campo; no cambia el `autocomplete`; sin corrector ortográfico. Los nombres de la tabla de §D-7 marcados en P-06 quedan como propuesta hasta que el humano los confirme.

### Lo que aplica el orquestador (propuesta de texto literal; lo autoriza el humano)
**`CLAUDE.md`, en el cierre de 01b** (después de la comprobación completa):
- **"Ubicaciones compartidas"**, sustituir la viñeta de `components/layout/` por:
  > - `components/layout/` — marco por rol (`ContenedorRol`, con `BarraNavegacion` y `BarraSuperior`), `MarcoPublico` y `LayoutPublico` (pantallas sin rol), `FondoAnimado`, `PieDePagina` y `Monograma`. Sus textos, los destinos por rol y los enlaces del colegio viven en `components/layout/data.ts`: **las URL del pie (`ENLACES_DEL_COLEGIO`) se editan solo ahí**. El tipo `Rol` de `components/layout/types.ts` se reexporta de `shared/`
- **"Ubicaciones compartidas"**, en la viñeta de `components/`: pasar `AvatarUsuario` a la lista de piezas que ya existen (`avatar-usuario.tsx`).
- **"Ubicaciones compartidas"**, viñeta de `lib/format.ts`: "— fechas (UTC → zona local), porcentajes, tamaños de archivo e iniciales de un nombre (`inicialesDe`)".
- **"Ubicaciones compartidas"**, viñeta de `app/`: "— rutas, layouts, guardas por rol y `FondoDeLaApp` (el fondo con orbes, montado una sola vez en `main.tsx`, fuera del router)".
- **"Tokens"**, viñeta nueva:
  > - Un elemento fijo (`position: fixed`) nunca va dentro de una superficie de vidrio: `backdrop-filter` convierte a esa superficie en su bloque contenedor y lo fijo se pega a ella, no a la ventana. El fondo con orbes vive fuera del router y la barra inferior cuelga de un contenedor sin vidrio.
- **"Formularios"**, viñeta nueva:
  > - Todo campo de contraseña usa `CampoContrasena` (`features/auth/components/campo-contrasena.tsx`), con su botón para mostrarla u ocultarla; nunca un `Input` con `type="password"` suelto. El nombre del botón es fijo, por campo, va como texto `sr-only` dentro del botón (nunca `aria-label`) y el estado va en `aria-pressed`.

**`AGENTS.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md`:** sin cambios. **`README.md`:** el conteo de pruebas del frontend, con los números de la revisión del manager del cierre. **`docs/ESTADO.md`:** según "Cierre".

---

## Acceso a datos
Sin consultas nuevas ni llamadas nuevas a la API. `BarraSuperior` recibe el nombre por propiedades desde `RequireRol` (el `GET /me` ya cacheado). Sin paginación, transacciones ni riesgo de N+1.

## Autorización
- Sin endpoints nuevos; la seguridad sigue en el middleware del backend.
- Las guardas del frontend, `router.tsx` y la redirección de `AccesoRestringidoView` no cambian (condición de detención; V-08 y V-14).
- `data-material` y `data-densidad` siguen dependiendo del rol que `RequireRol` ya validó; el fondo, el marco y el pie son solo presentación.
- **Estado de pago:** ninguna pantalla tocada lo muestra ni lo recibe. El avatar y la barra superior solo usan `nombre` y la etiqueta del rol.
- **Acceso restringido (RN-03):** cambian la composición y el icono, no la lógica: el orden de las ramas y la redirección de quien no está restringido quedan idénticos (§D-1, E-6, V-14). Sigue fuera de `RequireRol`, sin barra de navegación ni destinos.
- **Contraseñas (01b-2, sensible):** el botón no toca el envío, la validación ni la caché; solo el `type` del campo y el foco. CC-5 y CC-6 reducen lo que el navegador hace con una contraseña a la vista.

---

## Pruebas requeridas

### Del programador — 01b-1
- **`components/layout/lib.test.ts`:**
  - `orbesEnMovimiento`: `true` en `/login`, `/estudiante`, `/maestro`, `/login/` y `/LOGIN`; `false` en `/`, `/registro`, `/recuperar`, `/restablecer`, `/establecer-contrasena`, `/cambiar-contrasena`, `/acceso-restringido`, `/diagnostico`, `/admin`, `/estudiante/clases` y `/loginx`.
  - `esUrlPublicable`: `true` con `https://colegio.mx`, `mailto:contacto@colegio.mx` y `tel:+525555555555`; `false` con `null`, `""`, `"#"`, `"/aviso"`, `"http://colegio.mx"`, `"javascript:alert(1)"`, `"java\nscript:alert(1)"`, `"colegio.mx"`, **`" https://colegio.mx "`, `"https://colegio.mx "`, `" https://colegio.mx"` y `"\thttps://colegio.mx"`** (M-03).
  - `enlacesVisibles`: con la configuración real (4 sin URL), 4 marcadores en desarrollo y 0 en producción; con una mezcla, orden conservado, solo los publicables en producción; una URL con espacios alrededor sale como marcador en desarrollo y se omite en producción.
  - `textoDeDerechos`: `new Date(2026, 11, 31, 23, 30)` da "© 2026 Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos"; `new Date(2027, 0, 1, 0, 30)`, "© 2027 …".
- **`lib/format.test.ts`:** `inicialesDe` con los 4 casos de §D-3.
- **`components/layout/fondo-animado.test.tsx`:** raíz con `aria-hidden="true"`; `data-movimiento` "si" y "no" según la propiedad; tres `[data-orbe]` (azul, verde, suave) y un `[data-velo]`; sin texto y sin ningún elemento enfocable.
- **`app/fondo-de-la-app.test.tsx`:** con `createMemoryRouter` de rutas mínimas (`/login`, `/registro`, `/estudiante`, `/admin`), `data-movimiento` sigue a `router.navigate(…)` dentro de `act`: "si" → "no" → "si" → "no".
- **`components/layout/pie-de-pagina.test.tsx`:**
  - con `vi.useFakeTimers()` y `vi.setSystemTime` en 2026 y en 2027, el texto del año cambia (año calculado, no escrito);
  - en desarrollo: 4 marcadores `[data-marcador]` con los 4 textos, **0 enlaces** (`queryAllByRole("link")`) y ningún marcador enfocable;
  - con `vi.stubEnv("PROD", true)` (y `vi.unstubAllEnvs()` al terminar): 0 marcadores y sin lista "Enlaces del colegio";
  - en los dos modos, ningún `a[href^="#"]` ni `a[href^="javascript:"]`;
  - un solo `contentinfo`.
- **`components/layout/contenedor-rol.test.tsx`** (se adapta; ninguna aserción existente se quita):
  - una sola `navigation` "Navegación principal" y un solo botón "Cerrar sesión";
  - en `/estudiante`, el enlace "Inicio" apunta a `/estudiante` y tiene `aria-current="page"`; con `rol="admin"`, el enlace es "Cuentas" hacia `/admin`;
  - el nombre y la etiqueta del rol aparecen una vez cada uno como texto;
  - un `banner` (la barra superior) y un `contentinfo` (el pie), los dos dentro de la raíz con `data-rol`;
  - **ningún ancestro de la `navigation`, hasta `document.body`, tiene una clase que empiece por `vidrio`** (§D-1; es una aserción sobre la estructura, no un localizador);
  - se conservan las pruebas de 01a (contexto por rol, "Cerrar sesión" en espera con el foco).
- **`app/marco.test.tsx`** (con `rutas` y `fetch` simulado, como `contexto-r1`): en `/login`, `/registro`, `/recuperar`, `/restablecer` (sin token), `/establecer-contrasena` (sin token), `/diagnostico`, `/cambiar-contrasena` (403 `CAMBIO_DE_CONTRASENA_REQUERIDO`), `/acceso-restringido` (restringido), `/estudiante`, `/maestro` y `/admin`: **exactamente un `contentinfo`** con "© <año actual> Colegio Mexicano…". Además, en `/login`: un solo `heading` "CMEP Campus Digital"; la lista de anuncios es enfocable (`tabindex="0"`) y su nombre accesible es "Avisos del colegio"; un `h3` por anuncio.
- **`styles/tokens.test.ts`** (se extiende):
  - los seis tokens de orbes en `:root` con sus valores;
  - cada `@keyframes orbe-*` solo declara `transform`; cada `translate` tiene módulo ≤ 60 px y cada `scale` está en [0.92, 1.08]; el 0 % es `translate(0, 0) scale(1)`;
  - `@media (prefers-reduced-motion: reduce)` pone `animation: none` en `[data-orbe]`; `[data-fondo][data-movimiento="no"] [data-orbe]` pone `animation-play-state: paused`;
  - `will-change` aparece exactamente una vez en el archivo, en `[data-orbe]`;
  - `[data-fondo]` tiene `position: fixed`, `pointer-events: none` y `z-index: -1`; `[data-velo]` usa `var(--background-veil)`;
  - `@utility sin-sombra-de-vidrio` redefine `--shadow-glass: 0 0 transparent`;
  - contraste de §D-8 (`--brand` sobre los tres vidrios, `--link` sobre `--accent-soft`).

### Del programador — 01b-2
- **`features/auth/components/campo-contrasena.test.tsx`:** CC-1 a CC-7, con un `nombreDelBoton` de prueba:
  - dentro de un `form` con `onSubmit` espía: clic en el botón, y `keyDown` Enter y Espacio sobre él, dan 0 envíos;
  - el nombre accesible del botón es el `nombreDelBoton` recibido **en los dos estados** (fijo); `aria-pressed` pasa de `"false"` a `"true"` y el campo de `type="password"` a `type="text"`; `aria-controls` es el `id` del campo;
  - el botón **no** tiene `aria-label` ni `aria-labelledby`, y contiene un elemento con el texto del nombre (el `span` `sr-only`); el icono es `aria-hidden`;
  - `queryByLabelText(nombreDelBoton)` devuelve `null`: el botón no se encuentra por etiqueta;
  - `fireEvent.mouseDown(boton)` devuelve `false` (acción por defecto cancelada);
  - con el foco en el campo y la selección en `(2, 4)`, tras el clic el foco sigue en el campo y `selectionStart`/`selectionEnd` siguen en `(2, 4)`;
  - `autocomplete`, `name`, `required`, `aria-invalid` y `aria-describedby` iguales en los dos estados; `spellcheck="false"`;
  - con la contraseña a la vista, `fireEvent.submit(form)` la oculta, el botón vuelve a `aria-pressed="false"` y su nombre no cambia (P-04 A);
  - dos campos en el mismo formulario cambian por separado.
- **`features/auth/contrasena-visible.test.tsx`:** en cada uno de los 5 formularios (login, registro, restablecer con token, establecer con token, cambiar):
  - cada campo de contraseña tiene exactamente un botón con `aria-controls` igual a su `id` (7 en total) y con **el nombre exacto de la tabla de §D-7** (`getByRole("button", { name })`, cadena exacta), sin `aria-label`;
  - en ninguna pantalla hay dos botones con el mismo nombre;
  - `getByLabelText` con cada etiqueta ("Contraseña", "Contraseña nueva", "Confirma la contraseña nueva", "Contraseña temporal") devuelve el `input`, no el botón.

### Pruebas existentes afectadas
| Prueba | Tipo | Qué le pasa | Responsable |
|---|---|---|---|
| `styles/clases-r1.ataque.test.ts`, V-07 | ataque | Se pondría en rojo por el diseño previsto (§D-9) | **Tester, ronda 0 de 01b-1** |
| `styles/tokens-r1.ataque.test.ts:185` y `:188` | ataque | Solo la descripción quedó vieja ("sin orbes en 01a"; "borde de 2 px… outline opaco"). Las aserciones siguen valiendo | Tester, ronda 1 de 01b-1 (solo el texto de la descripción) |
| `components/layout/contenedor-rol.test.tsx` | normal | La estructura cambia | Programador (01b-1) |
| **Las `*.ataque` de `/acceso-restringido`** (M-01): `app/router.ataque.test.tsx:117` (un restringido que entra a `/admin` termina ahí) y `:126` (un maestro no restringido que la abre vuelve a `/maestro`); `app/cuentas-r1.ataque.test.tsx:112` (con cambio pendiente, a `/cambiar-contrasena`), `:128` (restringido sin cambio pendiente, se queda) y `:187` (cambia la contraseña y termina ahí); `app/cuentas-r2.ataque.test.tsx:193` (409 de un restringido); `app/en-espera-r1.ataque.test.tsx` ("Cerrar sesión" en `/acceso-restringido`); `app/contexto-r1.ataque.test.tsx:143`; `services/apiClient.ataque.test.ts:175` | ataque | **Deben seguir en verde sin modificarse** (sus hashes, en V-01). Si alguna se pone en rojo, el programador se detiene: sería un cambio de la redirección | — |
| Las que buscan campos de contraseña (inventario de §D-7) | normal y ataque | Ninguna encuentra el botón: deben seguir en verde sin cambios en 01b-2 | — |
| Todas las demás | — | Deben seguir en verde sin cambios, en particular `contexto-r1` (todo lo de `/admin` dentro del contexto opaco), `en-espera-r1` ("Cerrar sesión" en el marco), `enlace-r1:483` (un solo `heading` del login), `router.test.tsx:87` ("Estudiante" una vez) y las de la ficha (`fichaDe`) | — |

**Sin rojos previstos** en ninguna de las dos entregas del programador: si aparece cualquiera, se detiene y lo reporta.

---

## Verificaciones (sin navegador)
Todas desde `frontend/` salvo que se diga otra cosa. Salidas largas, a un archivo del scratchpad, sin tubería. Las búsquedas excluyen `*.test.*` salvo que se diga otra cosa.

- **V-01 (hashes).** Desde la raíz, `sha256sum -c` sobre la tabla vigente:
  - 01b-1, al empezar la ronda 0: la tabla de 39 de `reporte-tester.md`, "DESIGN-01a — Ronda 1" → 39/39;
  - programador de 01b-1, al empezar y al terminar: la tabla de 39 que publique la ronda 0 de 01b-1 (38 iguales, `clases-r1` nueva);
  - programador de 01b-2: la tabla que publique la última ronda del tester de 01b-1.
- **V-02 a V-07 y V-13:** `npx vitest run src/styles/clases-r1.ataque.test.ts` en verde, y las mismas búsquedas a mano (`plan.md`, V-02 a V-07 y V-13), con la lista permitida de §D-9 para V-07. `enEspera=` sigue en 13.
- **V-08 ("No se toca", lista entera de la subentrega, con sus excepciones).** Desde la raíz. Ninguna base depende de `HEAD`:
  - **01b-1, `frontend/`:** base **`e39500a`**. Por cada ruta de "No se toca", `git diff --quiet e39500a -- <ruta>` con código 0 y `git status --porcelain -- <ruta>` vacío. Los `*.ataque` se comparan con V-01, no con `e39500a`. Excepciones:
    - **E-5 (M-02):** `git diff e39500a -- frontend/src/main.tsx` no quita ninguna línea y solo agrega la importación de `FondoDeLaApp` y la línea del elemento `<FondoDeLaApp router={router} />`;
    - **E-6:** la comprobación de `acceso-restringido-view.tsx` es V-14;
    - **E-2 y E-3:** `git diff e39500a -- frontend/src/lib/format.ts frontend/src/lib/format.test.ts frontend/src/components/layout/types.ts` no quita ninguna línea (solo agrega).
  - **01b-1, fuera de `frontend/`:** base **`<B>`**, el commit en que el humano aprueba este plan (hash anotado por el orquestador en `aprobacion.md`; `git cat-file -e '<B>^{commit}'` con comillas simples, código 0). Mismas rutas que V-08 de `plan.md` más `package.json`, `package-lock.json` y, dentro de esta carpeta, `plan.md`, `plan-01b.md`, `plan-direccion-c.md` y `revision-direccion-c.md`. Excepción E-1: `git diff <B> -- docs/DESIGN.md` solo toca las secciones de 01b-1.
  - **01b-2:** base **`<C>`** (commit de 01b-1, anotado en `aprobacion.md`) para todo; E-12 (`git diff '<C>' -- frontend/src/features/auth/data.ts` solo agrega `TEXTOS_CAMPO_CONTRASENA` y su comentario) y E-13 para `DESIGN.md`.
  - **Fuera de V-08:** `docs/ESTADO.md`, `aprobacion.md`, `comprobacion-humano.md` (orquestador) y los entregables de cada agente. Los revisa el manager.
  - **Parada:** si falta el hash de la base o `git cat-file` falla, **detente**. Si V-08 marca un archivo cambiado con autorización, el agente se detiene y pregunta; el orquestador pide el commit al humano y anota el hash nuevo. Ningún agente hace commit.
- **V-09 (fuentes en `dist/`):** igual que en 01a (6 `.woff2`, entre 0 y 6 `.woff`, todos `latin`; sin Google Fonts).
- **V-10 (CSS de `dist/`, tras `npm run build`):** lo de 01a más: `[data-fondo]`, `[data-orbe=azul]` (o su forma con comillas), `@keyframes orbe-azul`, `orbe-verde` y `orbe-suave`, `prefers-reduced-motion`, `animation-play-state:paused`, `will-change:transform`, `.sin-sombra-de-vidrio`, `--orb-blue-size` y `.sr-only` (y su forma con la variante `max-sm:`). Y en el JavaScript de `dist/`: `href:"#"` → 0. Si falta algo, **detente**.
- **V-11:** `npm run lint` desde la raíz (solo comprueba), `npm run test` y `npm run build` desde `frontend/`: todo en verde en cada entrega.
- **V-14 (condición de detención).** Desde la raíz, con la base de `frontend/` de la subentrega (`e39500a` en 01b-1, `<C>` en 01b-2):
  1. **Guardas y rutas:** `git diff --quiet <base> -- frontend/src/app/router.tsx frontend/src/app/require-rol.tsx frontend/src/app/require-sesion.tsx frontend/src/app/require-cambio-de-contrasena.tsx` con código 0.
  2. **Redirección de acceso restringido (M-01 y M-05):** en `git diff -U0 <base> -- frontend/src/features/auth/acceso-restringido-view.tsx`, ninguna línea quitada ni agregada (las que empiezan por `-` o `+`, sin contar `---` y `+++`) contiene alguno de estos textos fijos: `Navigate`, `accesoRestringido`, `rutaPorRol`, `if (`, `if (isError)`, `if (isPending)`, `return`, `useMe(`, `useCerrarSesion(` ni `./hooks"`. Se buscan así a propósito:
     - `if (` y `return` detectan una rama nueva o quitada aunque no contenga ninguno de los otros textos (M-05). En el cambio legítimo de E-6 no aparecen, porque las líneas `if` y `return (` no se reindentan al envolver: solo cambia lo que va dentro de cada `return`. `if (isError)` e `if (isPending)` ya quedan cubiertos por `if (`; se conservan para que se entienda qué protegen;
     - `./hooks"` detecta un cambio en la línea que importa `useMe` y `useCerrarSesion` (M-05), que `useMe(` y `useCerrarSesion(` no encuentran;
     - `isPending` e `isError` no se buscan a secas: al envolver las ramas en `MarcoPublico` se reindentan líneas como `enEspera={cerrarSesion.isPending}` o `mensaje={mensajeDeErrorAuth(error)}`, que no son parte de la redirección y no deben detener a nadie.
  3. **Las cuatro líneas de §D-1 existen idénticas** en el archivo actual (búsqueda de texto fijo, con su sangría de 2 o 4 espacios como en `e39500a`): `  if (isError) {`, `  if (isPending) {`, `  if (!data.accesoRestringido) {` y `    return <Navigate to={rutaPorRol(data.rol)} replace />`; y aparecen **en ese orden** (números de línea crecientes, por ejemplo con `Select-String -SimpleMatch` o `grep -nF`).
  4. En 01b-2, el archivo no cambia: `git diff --quiet '<C>' -- frontend/src/features/auth/acceso-restringido-view.tsx`.

  Si cualquiera falla, **detente**: no se revierte por cuenta propia, se avisa al humano.
- **V-15 (movimiento):** dentro de `src/`, `@keyframes` solo en `styles/tokens.css` (3); `will-change` solo en `tokens.css` (1); `\banimate-` solo en `animate-spin` y `motion-reduce:animate-none` (los de 01a en `cargando.tsx` y `button.tsx`).
- **V-16 (lo fijo):** `\bfixed\b` en `src/**/*.tsx` solo en `components/layout/barra-navegacion.tsx` y en `components/ui/dialog.tsx` (el velo y el contenido del diálogo, de 01a, sin consumidores); `data-fondo` solo en `fondo-animado.tsx` (y en `tokens.css`).
- **V-17 (01b-2; M-04 y P-05 B):** en `src/**/*.tsx`, sin contar pruebas:
  - `type="password"` → **0**; la cadena `"password"` (con comillas dobles) → solo en `features/auth/components/campo-contrasena.tsx`;
  - `<CampoContrasena` → **7** apariciones, en los 4 formularios, cada una con `nombreDelBoton={TEXTOS_CAMPO_CONTRASENA.` y la constante de la tabla de §D-7;
  - en `campo-contrasena.tsx`: `aria-label` → **0**, `aria-labelledby` → **0**, `sr-only` → 1, `aria-pressed` → 1;
  - las cadenas "Ocultar contraseña" y "Ocultar" → **0** en `src/**/*.tsx` sin contar pruebas, igual que el resto de V-17 (el nombre ya no cambia). Una prueba que afirme que "Ocultar contraseña" nunca aparece puede contenerla (detalle de "DESIGN-01b — plan, ajuste de P-05");
  - `autoComplete=` de esos 7 campos con el mismo valor que en `<C>` (comparar con `git diff '<C>'` de los 4 formularios: ninguna línea con `autoComplete` quitada o agregada con otro valor).

---

## Puntos de ataque para el Tester

### 01b-1
1. **Ronda 0** (§D-9), con los mismos cuidados que la ronda 0 de 01a.
2. **Condición de detención:** V-14 completa por tu cuenta (guardas, rutas y las cuatro líneas de `AccesoRestringidoView`); que ninguna ruta, guarda o redirección cambió de comportamiento (las `*.ataque` de `app/` en verde). **Acceso restringido (M-01):** un usuario **no restringido** (estudiante, maestro y admin) que entra a `/acceso-restringido` termina en su dashboard (`/estudiante`, `/maestro` o `/admin`); la rama de la redirección no pinta `MarcoPublico` (al terminar hay un solo `contentinfo`, el del marco del rol) y no queda ningún `heading` "Acceso restringido". Y el caso contrario: un restringido que entra ahí se queda, con el pie.
3. **Pie en todas las pantallas:** las 11 rutas, también después de navegar entre ellas (login → estudiante tras iniciar sesión, cerrar sesión desde `/admin`, `/cambiar-contrasena` → rol); un solo `contentinfo`; año calculado (con reloj simulado en la víspera de Año Nuevo y el 1 de enero); `ENLACES_DEL_COLEGIO` con `"#"`, `"javascript:…"`, `"java\nscript:…"`, `"http://…"`, `" https://x "` y `"https://x "` (con espacios), vacío o una URL relativa (con `vi.mock` del módulo de datos): nunca un `<a>`, ni con esa `href` ni con su forma sin espacios; en desarrollo, cada uno de esos sale como marcador; en producción (`vi.stubEnv("PROD", true)`), ningún marcador; en desarrollo, ningún marcador enfocable.
4. **Fondo:** `data-movimiento` en cada ruta, también con mayúsculas y barra final; que el fondo no reciba el puntero ni el foco y sea invisible para el árbol de accesibilidad; texto de `tokens.css` (solo `transform` en los `@keyframes`, amplitud, `prefers-reduced-motion`, pausa, un solo `will-change`).
5. **Marco:** una sola `nav`, un solo "Cerrar sesión" (en espera, con el foco; `enEspera` sigue en 13), "Inicio"/"Cuentas" con `aria-current`, nombre y rol una vez; ningún ancestro con vidrio de la `nav` fija; en `/admin`, todo (incluidos barra, pie y enlaces si los hubiera) dentro del contexto opaco y un solo contenedor marcado (`contexto-r1`); estudiante y maestro sin contexto.
6. **Composición:** ningún texto fuera de `Card`, vidrio, vidrio fuerte o sólido (inspección del DOM: cada nodo de texto visible tiene un ancestro con `data-slot="card"`, con una utilidad de vidrio o con un fondo sólido; es una aserción sobre la estructura, los elementos se localizan por rol o texto); `/login` con un solo `heading` "CMEP Campus Digital"; lista de anuncios enfocable y con nombre; acceso restringido con el rojo solo en los 2 iconos.
7. **Invariantes de DOM (R-08 de `plan.md`)** y `fichaDe`, sin localizar por clases de estilo.
8. **Regresión:** las 39 `*.ataque`.
9. **Guardas permanentes:** en la ronda 1, `clases-r1` V-07 vuelve a igualdad exacta con la lista final (la de §D-9 si el programador la cumplió; si no, es un hallazgo, no se amplía la lista), conservando las aserciones de que `card.tsx` y `button-variants.ts` siguen en ella; actualiza las dos descripciones de `tokens-r1` ("Pruebas existentes afectadas") sin tocar sus aserciones; publica la tabla de hashes.

### 01b-2
1. **CC-1 a CC-7** en los 7 campos: activaciones repetidas; Enter desde el campo con la contraseña a la vista sigue enviando **una sola** petición (el `enEspera` del botón de envío no cambia); el botón no dispara `submit` ni con `requestSubmit` en vuelo.
2. **Selectores:** rehaz el inventario de §D-7 con tu propia búsqueda, incluidas las `*.ataque` nuevas de 01b-1; si alguna prueba empieza a encontrar el botón al buscar un campo, es un hallazgo.
3. **Cursor y foco:** selección en medio, al principio y al final; campo vacío; foco fuera del campo (no se le devuelve el foco); `<StrictMode>`.
4. **Envío con la contraseña visible (P-04 A):** con éxito, con error del servidor y con error de validación en cliente; el campo vuelve a `password` y el botón a `aria-pressed="false"`, con el mismo nombre, antes de que la mutación arranque.
5. **Autocompletado:** `autocomplete` igual en los dos estados en los 7 campos; `spellcheck="false"`.
6. **Accesibilidad (P-05 B):** en los 7 botones, el nombre exacto de la tabla de §D-7 **no cambia** tras varias activaciones; solo cambia `aria-pressed`; ningún `aria-label` ni `aria-labelledby`; el nombre sale del texto `sr-only`; `getByLabelText` de cada etiqueta devuelve el campo y `queryByLabelText` del nombre del botón devuelve `null`; ningún par de botones con el mismo nombre en una pantalla; `aria-controls` válido; el botón en el orden de Tab justo después de su campo.
7. **Regresión:** todas las `*.ataque` de `auth` y `app` (login, registro, enlaces, cambio obligatorio, en espera, errores).

---

## Riesgos y desacuerdos
- **R-01 · Rutas y nombre del producto duplicados.** `DESTINOS_POR_ROL` repite las rutas de `RUTA_POR_ROL` y `NOMBRE_PRODUCTO` repite `TEXTOS_LOGIN.titulo`, porque `components/layout` no puede importar de `features/`. Si cambia una ruta de rol, hay que cambiar los dos. Alternativa: pasar los destinos desde `require-rol.tsx`, que la condición de detención permitía solo en el JSX de `ContenedorRol`; la descarto para no tocar ese archivo.
- **R-02 · El fondo no está en `rutas`.** Las pruebas que montan `rutas` no ven el fondo. Lo cubren `fondo-de-la-app.test.tsx` y `fondo-animado.test.tsx`; el montaje real en `main.tsx` solo lo ve el humano (H-11).
- **R-03 · Bloque contenedor de lo fijo** (M-03 de la revisión de 01a). Mitigado con el montaje de §D-1, la prueba de ancestros y H-12.
- **R-04 · Rendimiento.** `backdrop-filter` sobre orbes en movimiento obliga a recalcular el desenfoque en cada cuadro. Movimiento solo en tres rutas, solo `transform`, `will-change` solo en los orbes; el humano lo mide en H-11. Si hay caídas de cuadros, la salida es de diseño (menos amplitud o ciclos más largos) y la decide el humano.
- **R-05 · Posiciones de los orbes en pantallas angostas.** Con diámetros fijos, a 360 px el orbe verde cruza todo el ancho a media altura. El contraste no depende de la posición (se calcula con el peor caso), pero el aspecto sí: H-10 y H-11 a 360 px.
- **R-06 · Accesibilidad del botón de contraseña (resuelto con P-05 B).** El nombre es fijo y el estado va en `aria-pressed`, como pide la guía de ARIA, y cada botón de un mismo formulario tiene su nombre. Queda por confirmar el texto de dos nombres (P-06). Cómo lo anuncia cada lector de pantalla solo se comprueba con uno real: la hoja lo deja a H-16 (Accessibility de DevTools); con NVDA o VoiceOver, si el humano quiere.
- **R-07 · Gestores de contraseñas.** Con P-04 (A) el campo vuelve a `password` al enviar. Cómo reacciona cada gestor (Chrome, Edge, 1Password…) solo se ve en el navegador: H-16.
- **R-08 · La guarda V-07 queda más laxa entre la ronda 0 y la ronda 1 de 01b-1.** La lista permitida sigue impidiendo vidrio en cualquier otro archivo; la ronda 1 la vuelve a igualdad exacta. El manager compara el diff línea por línea en su revisión final.
- **R-09 · El pie no está en los estados de carga de las guardas** (S-09). Duran lo que tarda `GET /me`. Por la misma razón, el `Cargando` de `RequireRol` en `/admin` se pinta fuera de `ContenedorRol`: durante ese instante va en vidrio fuerte, no opaco. No se cambia (tocaría la guarda).
- **R-10 · Área segura de iOS.** Sin `viewport-fit=cover` en `index.html` (no se toca), `env(safe-area-inset-bottom)` vale 0 y Safari mantiene la página fuera de las zonas inseguras. La barra inferior flota a 16 px del borde. Sin un iPhone, queda **no verificada**.
- **R-11 · Orbes pausados en una posición distinta de la captura** al llegar desde el login (S-04). El contraste no cambia (peor caso); si el humano prefiere que siempre vuelvan a la posición de la captura, se cambia `animation-play-state: paused` por `animation: none` en una línea.
- **R-12 · Un solo destino por rol.** Una barra inferior con un solo elemento se ve escasa; es lo que decidió el humano (respuesta 1 de `plan.md`). Se lo recuerda H-12.
- **R-13 · R-01 de `plan.md` sigue abierto** (PRD §7 "barra lateral con lista de clases" contra la barra compacta de §7.4). No afecta a 01b; se resuelve antes de CLASES.
- **R-14 · `import.meta.env.PROD`.** Vale `true` en `vite build` aunque se use otro `--mode`, salvo que alguien fuerce `NODE_ENV`. Cloudflare Pages usa `npm run build`: los marcadores no llegan a producción.
- **R-15 · Los textos de los marcadores viajan en el JavaScript de producción.** "Sitio web", "Facebook"… están como datos en el paquete aunque no se pinten. Cumple lo pedido ("en el build de producción no se muestra"); el humano lo sabe por aquí.
- **R-16 · La lista de anuncios recibe el foco aunque no desplace** (pocos anuncios en escritorio). Es aceptable: su nombre y los `h3` la hacen útil con un lector de pantalla.
- **R-17 · Pantallas táctiles y el botón del ojo.** `onMouseDown` cancela el cambio de foco con el ratón y con el `mousedown` que emula el toque. Si en un teléfono el teclado virtual se cierra al tocar el ojo, la salida es `onPointerDown`; lo mira el humano en H-16 con la emulación táctil.
- **R-18 · Iconos de los gestores de contraseñas.** 1Password, Bitwarden y otros ponen su icono en el extremo derecho del campo, donde va el ojo. Si se enciman, se anota en H-16 y lo decide el humano.

Sin desacuerdos con `ARCHITECTURE-ESSENTIALS.md`.

---

## No se toca

Nadie modifica estas rutas, salvo lo que diga una excepción con su alcance exacto. La lista coincide con los pasos: todo archivo de "Cambios por capa" está fuera de ella o en una excepción.

### DESIGN-01b-1
**Repositorio**
- `backend/`, `shared/`, `infra/`, `.claude/`, `.codex/`.
- `AGENTS.md`, `CLAUDE.md`, `README.md` (los aplica el orquestador en el cierre).
- `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/PRD.md`, `docs/ESTADO.md` (orquestador), `docs/design/**`.
- `docs/trabajo/**` fuera de esta carpeta; dentro de ella, `plan.md`, `plan-01b.md`, `plan-direccion-c.md` y `revision-direccion-c.md`. Cada agente escribe solo su entregable (`resumen-programador.md`, `reporte-tester.md`, `revision.md`); el orquestador, `aprobacion.md` y `comprobacion-humano.md`.
- Raíz: `package.json`, `package-lock.json`, `eslint.config.mjs`, `.prettierignore`, `tsconfig.base.json`, `.gitattributes`, `.gitignore`, `.nvmrc`.

**Frontend**
- `frontend/package.json`, `components.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.env*`.
- `src/main.tsx` (salvo E-5), `src/test/setup.ts`, `src/vite-env.d.ts`, `src/styles/index.css`.
- `src/services/**`.
- `src/app/router.tsx`, `require-rol.tsx`, `require-sesion.tsx`, `require-cambio-de-contrasena.tsx`, `providers.tsx`.
- `src/components/ui/**`, `src/components/mensaje-error.tsx`, `src/components/error-de-campo.tsx`, `src/lib/utils.ts`.
- `src/features/*/hooks.ts`, `types.ts`, `data.ts`, `lib.ts` (y sus `lib.test.ts`).
- `src/features/auth/components/formulario-*.tsx`, `recuperar-view.tsx`, `restablecer-view.tsx`, `establecer-contrasena-view.tsx`.
- `src/features/auth/acceso-restringido-view.tsx` (salvo E-6).
- `src/features/admin/components/**`, `src/features/diagnostico/**`.
- Las pruebas normales existentes, salvo `components/layout/contenedor-rol.test.tsx`, `lib/format.test.ts` y `styles/tokens.test.ts`.
- **Para el programador:** todo `*.ataque.test.*`.
- **Para el tester:** todo el código de producción y las pruebas normales.

**Excepciones (alcance exacto)**
- **E-1 · `docs/DESIGN.md`:** el programador edita solo las secciones de "docs/DESIGN.md", 01b-1, a mano y sin formateador.
- **E-2 · `src/lib/format.ts` y `format.test.ts`:** solo se agrega `inicialesDe` y sus pruebas; nada existente cambia.
- **E-3 · `src/components/layout/types.ts`:** solo se agregan tipos; la reexportación de `Rol` no cambia.
- **E-4 · `*.ataque.test.*` (solo el tester):** ronda 0, exactamente el cambio de §D-9 en `clases-r1.ataque.test.ts`; rondas 1 a 3, lo de "Puntos de ataque", punto 9, y `*.ataque` nuevas. Regla de `tester.md`: sin localizar por clases de estilo.
- **E-5 · `src/main.tsx` (M-02):** solo se agregan dos cosas: la importación de `FondoDeLaApp` y su elemento `<FondoDeLaApp router={router} />` dentro de `<Providers>`, antes de `<RouterProvider … />`. No se quita ni cambia ninguna línea existente (las importaciones de fuentes, el `throw` de arranque, `StrictMode`, `Providers` y `RouterProvider` quedan igual). Lo comprueba V-08.
- **E-6 · `src/features/auth/acceso-restringido-view.tsx` (M-01 y M-05):** solo cambia lo que va dentro del `return (…)` de la rama de error, de la de carga y de la del contenido (envoltorio `MarcoPublico`, clases del `main`, `Ban` → `Lock`, `<Monograma />` en `CardHeader`) y las importaciones que eso requiere (`MarcoPublico`, `Monograma`, `Lock`; se quita `Ban`). No se agrega ni se quita ninguna línea con `if (` ni con `return`. El orden de las ramas, las cuatro líneas de §D-1, la rama del `Navigate` (sin envolver), las llamadas a `useMe` y `useCerrarSesion` y las importaciones de `Navigate`, `rutaPorRol` y `mensajeDeErrorAuth` y la de `./hooks` (`useMe`, `useCerrarSesion`) quedan idénticos. Si hace falta cambiar algo de eso, el agente se detiene y avisa al humano. Lo comprueba V-14.

### DESIGN-01b-2
Todo lo de 01b-1, más todo lo que cambió 01b-1 (base `<C>`), incluidos `main.tsx` y `acceso-restringido-view.tsx` sin excepción, salvo:
- **E-10 · Nuevos:** `src/features/auth/components/campo-contrasena.tsx`, `campo-contrasena.test.tsx` y `src/features/auth/contrasena-visible.test.tsx`.
- **E-11 · Los 4 formularios** (`formulario-login.tsx`, `formulario-registro.tsx`, `formulario-nueva-contrasena.tsx`, `formulario-cambiar-contrasena.tsx`): solo se sustituye cada `<Input … type="password" … />` por `<CampoContrasena … nombreDelBoton={TEXTOS_CAMPO_CONTRASENA.<constante>} />` con las mismas propiedades sin `type` (la constante, en la tabla de §D-7), se agregan sus importaciones (`CampoContrasena` y `TEXTOS_CAMPO_CONTRASENA`) y se quita la de `Input` si deja de usarse.
- **E-12 · `src/features/auth/data.ts`:** solo se agrega `TEXTOS_CAMPO_CONTRASENA`, con su comentario, tal como está en §D-7.
- **E-13 · `docs/DESIGN.md`:** solo la viñeta de §7.3 de 01b-2 y la línea de "Estado de aplicación".
- **E-4** sigue vigente para el tester.

---

## Pasos de implementación

**Reglas para todos los pasos y todos los agentes:**
- **Formateadores:** solo `npx prettier --write <rutas concretas>`, desde `frontend/`, sobre los archivos que tocaste. Nunca `npm run format`, nunca desde la raíz, nunca `--write`, `--fix` o `-i` fuera de `frontend/`. `docs/DESIGN.md` se edita a mano.
- **Sin navegadores ni `npm run dev`.** Git solo de lectura; **ningún agente hace commit**: cuando haga falta, el orquestador se lo pide al humano. No leas ningún `.env`.
- **Procesos:** ningún paso arranca procesos de larga vida. No termines un proceso que no arrancaste.
- **Salidas largas:** a un archivo del scratchpad, sin tubería.
- **Condiciones de parada:** si una se cumple, te detienes y la reportas, aunque la alternativa parezca obvia o inofensiva.

### Antes de empezar (orquestador)
0. El manager revisó este plan ("DESIGN-01b — plan" y sus correcciones: APROBADO) y el humano lo aprobó el 2026-09-27 (por escrito, también para 01b-2). El humano hace commit de los documentos; el orquestador anota **`<B>`** en `aprobacion.md` y comprueba `git cat-file -e '<B>^{commit}'`. Si el humano responde P-06 con otros nombres, el orquestador lo anota en `aprobacion.md` antes del paso 15 y el programador de 01b-2 usa esos textos en E-12 y en sus pruebas.

### DESIGN-01b-1
1. **Tester, ronda 0** (no cuenta en el tope de 3). Todo desde `frontend/` salvo los hashes:
   1. Precondición: `git diff --quiet e39500a -- .` con código 0 y `git status --porcelain -- .` vacío (desde `frontend/`). Si no, **detente**.
   2. V-01 con la tabla de 39 de "DESIGN-01a — Ronda 1" → 39/39. Si no, **detente**.
   3. Copia `src/styles/clases-r1.ataque.test.ts` al scratchpad. Sustituye la prueba V-07 por el texto exacto de §D-9. Formatea solo ese archivo.
   4. `git diff -- src/styles/clases-r1.ataque.test.ts`: solo esa prueba. `git status --porcelain -- .`: solo ese archivo.
   5. `npx vitest run src/styles/clases-r1.ataque.test.ts` en verde; `npm run test` completo en verde (37 archivos y 496 pruebas, como en `e39500a`); `npm run lint` con código 0.
   6. Escribe en `reporte-tester.md` la sección "DESIGN-01b-1 — Ronda 0 (guarda V-07)": salidas, diff y la **tabla de hashes vigente de las 39 `*.ataque`**, base de V-01 para el programador.
2. **Programador, precondiciones** (desde la raíz): `git diff --name-only e39500a -- frontend/` lista solo `frontend/src/styles/clases-r1.ataque.test.ts`; sin archivos sin rastrear en `frontend/`; V-01 39/39 con la tabla de la ronda 0; `<B>` anotado y existente; V-08 y V-14 limpias. Si algo falla, **detente**.
3. **Datos, tipos y funciones puras:** `components/layout/types.ts`, `data.ts`, `lib.ts` y `lib.test.ts`; `inicialesDe` en `lib/format.ts` y su prueba.
4. **Tokens:** bloque 7, tokens de orbes y `sin-sombra-de-vidrio` en `tokens.css`; `tokens.test.ts`. Si un par de contraste no llega, **detente**.
5. **Fondo:** `fondo-animado.tsx` y su prueba; `app/fondo-de-la-app.tsx` y su prueba; `main.tsx` (E-5). Si la prueba de `FondoDeLaApp` no sigue la navegación, **detente** (§D-1).
6. **Pie y marco público:** `pie-de-pagina.tsx` y su prueba, `marco-publico.tsx`, `layout-publico.tsx`.
7. **Marco de los roles:** `monograma.tsx`, `avatar-usuario.tsx`, `barra-navegacion.tsx`, `barra-superior.tsx`, `contenedor-rol.tsx` y su prueba.
8. **Composición:** `cargando.tsx`, `panel-anuncios.tsx`, `tarjeta-de-cuenta.tsx`, las vistas de `features/auth` de §D-6 y `cuentas-view.tsx`. En `acceso-restringido-view.tsx`, solo lo de E-6; al terminar ese archivo, corre V-14 (sus cuatro partes, con los textos fijos de la parte 2) y las `*.ataque` de `/acceso-restringido` ("Pruebas existentes afectadas"). Si algo falla, **detente**.
9. **Prueba de rutas:** `app/marco.test.tsx`.
10. **`docs/DESIGN.md`** (E-1), y `npm run test`.
11. **Verificación y resumen:** V-01 a V-16 (V-17 no aplica). Escribe `resumen-programador.md`, sección "DESIGN-01b-1", con la salida de cada V (V-14 con sus cuatro partes; en la parte 2, el resultado de cada texto fijo), los archivos tocados y lo que no pudiste verificar.
12. **Tester, rondas 1 a 3 de 01b-1** ("DESIGN-01b-1 — Ronda N"): puntos de ataque 01b-1, incluida la vuelta de V-07 a igualdad exacta y la tabla de hashes.
13. **Manager, revisión final de 01b-1** ("DESIGN-01b-1 — final"): el diff de `clases-r1` y `tokens-r1` contra `e39500a`, línea por línea; el diff de `acceso-restringido-view.tsx` y de `main.tsx` contra `e39500a`; V-14; los patrones nuevos en `DESIGN.md`.
14. **Commit de 01b-1:** el orquestador se lo pide al humano (en la rama, sin push) y anota **`<C>`** en `aprobacion.md`.

### DESIGN-01b-2
15. **Programador, precondiciones:** `git diff --quiet '<C>' -- frontend/` con código 0 y sin archivos sin rastrear; V-01 con la última tabla del tester; V-08 con base `<C>`. Si `aprobacion.md` registra otra respuesta a P-06, usa esos nombres. Si algo falla, **detente**.
16. `features/auth/data.ts` (E-12); `campo-contrasena.tsx` y su prueba.
17. Los 4 formularios (E-11), cada campo con su `nombreDelBoton` de la tabla de §D-7. Corre `npm run test`. **Si cualquier prueba existente se pone en rojo, detente y repórtalo** (el inventario de §D-7 dice que ninguna encuentra el botón; un rojo significa que falló y haría falta una ronda 0 del tester, que decide el orquestador con el humano). No toques ninguna prueba existente.
18. `contrasena-visible.test.tsx`; `docs/DESIGN.md` (E-13).
19. **Verificación y resumen:** V-01, V-02 a V-08 (base `<C>`), V-10 (`.sr-only`), V-11, V-14 y V-17. `resumen-programador.md`, sección "DESIGN-01b-2".
20. **Tester, rondas 1 a 3 de 01b-2** ("DESIGN-01b-2 — Ronda N").
21. **Manager, revisión final de 01b-2** ("DESIGN-01b-2 — final").
22. **Carril sensible (P-01 A):** el humano revisa el diff de 01b-2 antes de su commit; el orquestador pide el commit y anota **`<D>`**.

### Después
23. **Comprobación visual completa del humano** con la hoja de abajo. El orquestador la escribe en `comprobacion-humano.md` (sección nueva) y transcribe el resultado. Un "no pasa" se escala al humano; las correcciones vuelven al programador en carril trivial si son de clases o valores ya previstos, o al arquitecto si cambian el diseño.
24. **Cierre** (abajo), revisión del manager ("DESIGN-01b — cierre"), commit del humano y **PR de DESIGN-01**.

---

## Cierre

1. **`docs/DESIGN.md`** (programador, carril trivial, después de la comprobación): lo que el humano apruebe pasa de "propuesta" a "propuesta aprobada (fecha)", también lo de 01a que seguía como propuesta y se vio en la comprobación (vidrio, `destructive` con foco interior si lo vio, `hover`, `ErrorDeCampo`, `--field-border`, 768 px…); lo que rechace se corrige o sigue como propuesta. "Estado de aplicación": DESIGN-01 cerrado, con la fecha. Después, `npm run test`.
2. **`CLAUDE.md`** (orquestador, con autorización del humano): los textos literales de "Lo que aplica el orquestador".
3. **`docs/ESTADO.md`** (orquestador): §1, DESIGN-01 completado con su PR y la suite final; §2 sin DESIGN-01; §3, se retiran la fila "Dirección visual D3" y la del bloque contenedor de lo fijo; se conservan "Llenar enlaces reales del pie (incluido aviso de privacidad) antes de DEPLOY", R-01 de `plan.md` (CLASES) y los pendientes de ADMIN; entran las no verificadas de la comprobación (por ejemplo, área segura de iOS y `/acceso-restringido` sin estudiante restringido).
4. **`README.md`:** conteo de pruebas del frontend con los números de la revisión del manager.

---

## Comprobación completa del humano (contenido de la hoja)

**Dónde:** `comprobacion-humano.md`, sección nueva "## DESIGN-01 · comprobación completa (después de 01b)", con el mismo formato que la de 01a: casillas por ancho, "Notas", **no verificada** con motivo, y la sección de resultado. La escribe el orquestador después de la implementación de 01b-2; aquí se define su contenido. Ningún agente la hace.

**Encabezado de la hoja.**
- Navegador: Chrome o Edge, zoom al 100 %.
- Anchos: cada pantalla a **1280 × 800** y **360 × 800**; H-03 y H-12 además a 768 y 767.
- Qué es nuevo respecto de 01a: fondo con orbes, marco, composición, pie, botón de contraseña y borde de 1 px de los campos. Se repiten **todos** los puntos, también los que ya pasaron en el bloque del login.
- Recordatorio (R-12): la barra tendrá **un solo destino por rol** ("Inicio" o "Cuentas"): es lo decidido, no un defecto.
- Recordatorio (R-15): los textos de los marcadores del pie viajan en el JavaScript de producción aunque no se pinten.

**1. Levantar todo en local** (PowerShell): las cuatro ventanas de la hoja de 01a (infra con `docker compose up -d` y `docker compose ps -a`; API con `npm run dev` y `curl.exe http://127.0.0.1:3000/api/salud`; worker con `npm run dev:worker`; frontend con `npm run dev`), la URL `http://127.0.0.1:5173/login` (con `127.0.0.1`, no `localhost`), el comando para abrir el último correo de `backend\tmp\correos` y cómo apagar. Además, **ventana 5, solo para H-15 (pie en producción):**
```powershell
Set-Location C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\frontend
npm run build
npm run preview
```
URL: `http://127.0.0.1:4173/login`. En esta vista solo se mira el pie. Ctrl+C al terminar.

**2. Cuentas** (sin contraseñas): las mismas A a E de la hoja de 01a, con sus límites (5 intentos por 15 min, 3 recuperaciones por hora, la temporal se ve una sola vez). `/acceso-restringido`: **no verificada** si no hay un estudiante restringido (no se altera la base a mano). "Cuenta inactiva" (C-13): solo si ya existe una cuenta dada de baja; si no, **no verificada**.

**Recorrido sugerido:** el de 01a, más: en cada pantalla, una mirada al fondo y al pie; el botón de contraseña en cada formulario al pasar por él; H-11 al principio, en `/login`; H-15 con la ventana 5 al final.

**3. Comprobaciones**

- **H-01 · Fuentes:** como en 01a (`/diagnostico` y `/login`; solo `.woff2` del propio origen; Atkinson Hyperlegible Next y Bricolage Grotesque; `tabular-nums`; lectura a 16 px y a 360 px).
- **H-02 · Materiales y controles:** en `/login`, `/registro`, `/recuperar` y su confirmación, `/restablecer` sin token y con enlace real, `/establecer-contrasena`, `/cambiar-contrasena`, `/estudiante`, `/maestro`, `/diagnostico`: paneles de vidrio translúcido **con los orbes detrás**, borde blanco y brillo en el filo; botones en píldora; **campos blancos con borde gris de 1 px (`#5A6472`) que pasa a azul al enfocar, con el mismo grosor, y el anillo azul por fuera**; un campo con error conserva el borde rojo al enfocarlo; títulos en Bricolage. Tabla por pantalla y ancho; `/acceso-restringido`, no verificada si aplica.
- **H-03 · Admin opaco y denso:** como en 01a (`backdrop-filter: none`; 36 px a 1280 y 768; 44 px a 767 y 360; texto de campos a 16 px), más: barra lateral, barra superior y pie opacos; "Cuentas" activo sobre azul claro (`--accent-soft`); orbes quietos detrás. (Al recargar `/admin`, el "Cargando" de la guarda puede verse un instante en vidrio: R-09.)
- **H-04 · Foco:** Tab y Shift+Tab en todas las pantallas de H-02 y `/admin`: contorno azul de 2 px separado del control; blanco por dentro en los botones azules y rojos (S-07; el rojo solo si aparece uno); también en "Inicio"/"Cuentas", "Cerrar sesión", la lista de anuncios del login y el botón del ojo. Los marcadores del pie **no** reciben el foco.
- **H-05 · Botón en espera:** como en 01a ("Iniciar sesión", "Crear cuenta", "Sí, restablecer"; cuatro formas de reenviar; una sola petición en Network; foco e indicador). Además: con la contraseña a la vista, Enter desde el campo también manda una sola petición.
- **H-06 · T-14:** como en 01a (directo al campo y con clic previo en el texto).
- **H-07 · Aviso de "Copiar":** como en 01a (éxito con icono verde; error con icono rojo bloqueando el portapapeles; devolver el permiso a "Preguntar").
- **H-08 · Movimiento reducido:** DevTools › Rendering › `prefers-reduced-motion: reduce`: el indicador del botón y el de "Cargando" no giran y conservan su texto; **los orbes quedan quietos en su posición de la captura** en `/login` y `/estudiante`.
- **H-09 · Contraste medido:** tabla de abajo. Método de la hoja de 01a (selector de color de Styles, "Contrast ratio", gotero del fondo en un pixel pegado al texto; en bordes y anillos, dictar los dos hexadecimales al orquestador). **Para los pares sobre vidrio con orbes detrás:** activa primero el movimiento reducido (H-08); en Elements, dentro de `div data-fondo`, selecciona `div data-orbe="azul"`; en Styles › `element.style`, agrega `translate: <x>px <y>px` y ajusta hasta que el orbe azul quede justo detrás del texto que vas a medir; mide; borra la propiedad al terminar.
- **H-10 · Parecido general:** comparar con `docs/design/referencia-direccion-d3.png`: materiales, tipografía, botones, campos, **fondo, posición de los orbes y marco**. Decisiones que se juzgan aquí:
  - enlaces que no se parten a 360 px (así / que puedan partirse);
  - títulos de los anuncios en negrita (así / ajustar);
  - posición de los orbes a 360 px (así / ajustar);
  - **separación entre barra superior, contenido y pie:** 20 px para estudiante y maestro (el maestro tenía 24 px) y 16 px en `/admin` (así / ajustar).
- **H-11 · Fondo y orbes:** (a) en `/login`, `/estudiante` y `/maestro`, los orbes se mueven despacio (espera 10 s); (b) en `/registro`, `/recuperar`, `/restablecer`, `/establecer-contrasena`, `/cambiar-contrasena`, `/diagnostico` y `/admin`, quietos; (c) de `/login` a "Regístrate como estudiante": se detienen donde estaban, sin salto; (d) en una pantalla larga (`/admin` a 360), al desplazar la página el fondo no se mueve con el contenido; (e) ningún desplazamiento horizontal; (f) rendimiento: en `/login`, DevTools › Ctrl+Shift+P › "Show frame rendering stats" durante 10 s: sin caídas evidentes; si las hay, anota la cifra.
- **H-12 · Marco:** en `/estudiante`, `/maestro` y `/admin`:
  - a 1280 y 768: barra lateral de 96 px con el monograma "cm" y "Inicio" (o "Cuentas") activo en vidrio fuerte y texto azul; en Elements, el enlace activo tiene `aria-current="page"`; barra superior de 64 px con "CMEP" en tinta y "Campus Digital" en verde, nombre, rol, avatar con iniciales y "Cerrar sesión";
  - a 767 y 360: barra inferior fija a la ventana, **no pegada a un panel** (desplaza la página: la barra no se mueve), sin tapar el contenido ni el pie (desplaza hasta el final: el pie queda por encima de la barra); barra superior con el nombre del producto y "Cerrar sesión" solo con icono; sin desplazamiento horizontal;
  - en `/admin`, todo opaco (H-03).
- **H-13 · Composición:** en cada pantalla, ningún texto directamente sobre el fondo con orbes; pantallas de cuenta con el panel centrado y el monograma encima del título; bienvenida en un panel; cabecera de `/admin` en un panel opaco; "Cargando" en una píldora (se ve con la red lenta al recargar `/estudiante`); `/acceso-restringido` con el candado (no verificada si aplica); `/diagnostico`.
- **H-14 · Recorte de la sombra (login y registro):** a 1280 y a 360, sin rectángulo grisáceo entre los anuncios ni debajo; desplaza la lista (a 360 se desplaza sola; a 1280, reduce la altura con el modo de dispositivo a 1280 × 600): las filas no dejan un filo recto gris al entrar y salir; la sombra del panel se ve completa. Con Tab, la lista recibe el foco y se desplaza con las flechas.
- **H-15 · Pie:**
  - en desarrollo, en todas las pantallas de H-02, `/admin` y (si aplica) `/acceso-restringido`: "© 2026 Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos" y los 4 marcadores ("Sitio web", "Facebook", "Contacto", "Aviso de privacidad") con subrayado discontinuo, que no se pueden pulsar ni enfocar; en `/admin`, opaco; a 360, se acomoda sin desplazamiento horizontal;
  - en producción (ventana 5, `http://127.0.0.1:4173/login`): solo el "© 2026 …", **ningún marcador**;
  - en Elements (los dos casos): ningún `href="#"`.
- **H-16 · Botón para mostrar la contraseña** (en `/login`, `/registro`, `/restablecer` con enlace real, `/establecer-contrasena` y `/cambiar-contrasena`, en cada campo de contraseña):
  - escribe "abcdef", lleva el cursor entre la "c" y la "d" con las flechas, pulsa el ojo con el ratón y sigue escribiendo "X": queda "abcXdef" y el foco nunca salió del campo;
  - **a 360 px con la emulación táctil de DevTools** (modo de dispositivo con un teléfono): toca el ojo; el foco sigue en el campo (R-17);
  - el texto se ve y el icono cambia a ojo tachado; en DevTools › Accessibility, **el nombre del botón no cambia** y pasa de "no presionado" a "presionado"; vuelve a pulsarlo: mismo nombre, no presionado;
  - **nombres esperados** (DevTools › Accessibility › Name): en `/login` y `/registro`, "Mostrar contraseña"; en `/restablecer` y `/establecer-contrasena`, "Mostrar contraseña nueva" y "Mostrar confirmación de contraseña"; en `/cambiar-contrasena`, "Mostrar contraseña temporal", "Mostrar contraseña nueva" y "Mostrar confirmación de contraseña" (P-06: si decidiste otros textos, los que anote `aprobacion.md`);
  - el nombre no se ve en pantalla (es texto solo para lectores) y el botón no tiene `aria-label` (Elements);
  - pulsar el ojo **no** envía el formulario (Network sin petición);
  - con Tab se llega al ojo justo después de su campo; Espacio lo activa;
  - en Elements, el `autocomplete` del campo es el mismo en los dos estados;
  - con la contraseña a la vista, envía el formulario (por ejemplo, un login con una contraseña equivocada): el campo vuelve a ocultarse y el botón a "no presionado" (P-04 A);
  - con la cuenta C, inicia sesión con la contraseña a la vista: anota si Chrome o Edge ofrecen guardar la contraseña como de costumbre;
  - si usas un gestor de contraseñas con icono dentro del campo (1Password, Bitwarden…), anota si su icono se encima con el ojo (R-18);
  - opcional, con NVDA o el Narrador de Windows: el botón se anuncia como "Mostrar contraseña nueva, botón de alternancia, no presionado" o algo equivalente (R-06).
- **H-17 · Borde de los campos sobre los orbes:** con el orbe azul detrás del panel del login (método de H-09), el borde gris de 1 px se distingue del vidrio (C-07); al enfocar, el borde azul y el anillo se leen como un solo indicador, no como una línea doble molesta.

**4. Tabla de contraste** (medida a 1280, salvo C-16; "Orbe" = con el orbe azul detrás, método de H-09; "Calculado" = valor de `DESIGN.md` §3 o del cálculo del plan):

| Id | Pantalla | Elemento | Texto o trazo | Sobre | Orbe | Umbral | Calculado |
|---|---|---|---|---|---|---|---|
| C-01 | `/login` | "¿No te llega el correo? Acude a administración." | `--muted-foreground` `#3D4654` | Vidrio | sí | 4.5 | 6.0 |
| C-02 | `/login` | "¿Olvidaste tu contraseña?" | `--link` `#1B3480` | Vidrio | sí | 4.5 | 7.2 |
| C-03 | `/login` | Etiqueta "Correo" | `--foreground` `#16202E` | Vidrio | sí | 4.5 | 10.4 |
| C-04 | `/login` | Error de campo (enviar vacío) | `--destructive` `#A3341F` | `--danger-soft` `#F7E4DE` | no | 4.5 | 5.5 |
| C-05 | `/login` | Título de `MensajeError` (`nadie@pruebas.local`) | `--destructive` | `--surface` `#FFFFFF` | no | 4.5 | 6.8 |
| C-06 | `/login` | Texto de "Iniciar sesión" | `#FFFFFF` | `--primary` `#22409A` | no | 4.5 | 9.2 |
| C-07 | `/login` | **Borde del campo "Correo"** (1 px, sin foco) | `--field-border` `#5A6472` | Vidrio (pixel junto al borde) | **sí** | 3 | **3.8 (el de menos margen)** |
| C-08 | `/login` | Anillo de foco de "Correo" | `--ring` `#22409A` | Vidrio | sí | 3 | 5.8 |
| C-09 | `/cambiar-contrasena` | Texto de "Cerrar sesión" | `--foreground` | Vidrio fuerte | sí | 4.5 | 12.7 |
| C-10 | `/registro` | Ayuda "Mínimo 10 caracteres" | `--muted-foreground` | Vidrio | sí | 4.5 | 6.0 |
| C-11 | `/admin` | "Invitación creada…" | `--success` `#1D5B4B` | `--surface` | no | 4.5 | 7.9 |
| C-12 | `/admin` | Aviso "Contraseña copiada" | `--foreground` | `--surface` | no | 4.5 | 16.4 |
| C-13 | `/admin` | "Cuenta inactiva" (`--warning`; solo si existe una cuenta dada de baja) | `--warning` `#7A4F09` | `--surface` | no | 4.5 | 7.1 |
| C-14 | `/estudiante` | "Campus Digital" en la barra superior | `--brand` `#1D5B4B` | Vidrio | sí | 4.5 | 5.0 |
| C-15 | `/estudiante` (1280) | "Inicio" activo en la barra lateral | `--link` | Vidrio fuerte | sí | 4.5 | 8.8 |
| C-16 | `/estudiante` (360) | "Inicio" activo en la barra inferior | `--link` | Vidrio fuerte | sí | 4.5 | 8.8 |
| C-17 | `/admin` | "Cuentas" activo | `--link` | `--accent-soft` `#E1E7F7` | no | 4.5 | 9.1 |
| C-18 | `/estudiante` | "Tu dashboard estará disponible pronto." | `--muted-foreground` | Vidrio | sí | 4.5 | 6.0 |
| C-19 | `/login` | Título de un anuncio | `--foreground` | Vidrio fuerte | sí | 4.5 | 12.7 |
| C-20 | `/login` | Texto de un anuncio | `--muted-foreground` | Vidrio fuerte | sí | 4.5 | 7.3 |
| C-21 | `/login` | "© 2026 Colegio…" en el pie | `--muted-foreground` | Vidrio | sí | 4.5 | 6.0 |
| C-22 | `/login` | Marcador "Aviso de privacidad" (desarrollo) | `--link` | Vidrio | sí | 4.5 | 7.2 |
| C-23 | `/login` tras restablecer | "Tu contraseña se actualizó. Inicia sesión con la nueva." | `--success` | Vidrio | sí | 4.5 | 5.0 |
| C-24 | `/estudiante` | Iniciales del avatar | `#FFFFFF` | `--accent` | no | 4.5 | 9.2 |
| C-25 | `/login` | Icono del ojo (no es texto) | `--foreground` | `--surface` (dentro del campo) | no | 3 | 16.4 |
| C-26 | `/login` | Anillo de foco del ojo (no es texto) | `--ring` | Vidrio junto al campo | sí | 3 | 5.8 |

Registro: una fila por par, con la razón medida, los hexadecimales del texto y del fondo, y "pasa" o "no pasa". Un "no pasa" se escala al humano antes del PR.

**5. Resultado** (lo llena el orquestador): fecha; navegador y versión; veredicto (pasa todo / pasa con correcciones / no pasa); correcciones pedidas; valores de `DESIGN.md` que el humano aprueba (pasan a "propuesta aprobada (fecha)"); no verificadas y motivo.
