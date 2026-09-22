# Revisión del Manager — FRONT-01: esqueleto del frontend (`@campus/frontend`) — final

Veredicto: **APROBADO**
Verificación propia (desde la raíz, 2026-09-22): lint **ok** (3 workspaces: ESLint sin errores ni avisos, "All matched files use Prettier code style!" ×3, `tsc -b` limpio) · test **ok** (backend 6 archivos / 24 pruebas, frontend 6 archivos / 13 pruebas; código 0) · build **ok** (shared, backend, frontend; `frontend/dist/index.html` con `id="root"` ×1, `index-B3wrTV_g.css` 24.64 kB, `index-wwKQPmE9.js` 505.44 kB / 155.08 kB gzip) · prueba de humo **ok** (detalle en "Verificación propia").

Flujo abreviado autorizado por el humano (sin Tester ni revisión de plan): ninguna de las dos ausencias es hallazgo. Carril normal con aprobación escrita; `AGENTS.md` sin modificar, como estaba previsto (el bloque "Frontend" lo aplica el orquestador después de esta revisión).

## Problemas que bloquean

Ninguno.

- El diff coincide con el plan: 5 rastreados modificados (`package.json`, `package-lock.json`, `eslint.config.mjs`, `README.md` solo con la sección nueva al final, `frontend/package.json`) y 48 archivos nuevos en `frontend/`; ningún archivo versionado borrado. `git diff --quiet` sobre las rutas protegidas (`backend`, `shared`, `infra`, `tsconfig.base.json`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.gitattributes`, `AGENTS.md`, `CLAUDE.md`, `.claude`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`) → `0`, y sin archivos nuevos en ellas.
- Se hizo lo planeado, solo lo planeado y todo lo planeado: los 16 pasos, la tabla de archivos completa, `frontend/package.json` y `eslint.config.mjs` con el contenido exacto del plan, README con el texto literal. Las cinco desviaciones (D-01..D-05) están previstas por el propio plan como alternativa o remedio; las arbitro abajo, todas aceptadas.
- Sin rastro de los artefactos de `shadcn add`: `frontend/@` no existe, `"cn"` ausente de `frontend/package.json` y de `package-lock.json`, `npm ls cn` vacío, sin `frontend/package-lock.json`.
- Reglas que no se rompen: 9 (`frontend/.env.example` sin valores, con nota de que ninguna `VITE_*` puede llevar secreto; `frontend/.env` ignorado por `.gitignore:4` y no leído), 11 (ningún proveedor no aprobado en `frontend/package.json` ni en la raíz; en el lock solo `aws-ssl-profiles`, transitiva de `mysql2` vía `prisma`, ya reportada en BACK-02: es una librería de perfiles TLS, no un servicio, no bloquea), 13 (token solo en una variable de módulo; el único `localStorage|sessionStorage` en `src/` es el comentario de `authService.ts:2`; en el bundle aparece `e.sessionStorage.getItem(Tt)` que es código de react-router, no nuestro).
- Estilo `CLAUDE.md`: retornos tempranos en todo, orden error → cargando → datos en `DiagnosticoView`, tipos solo en `types.ts` (en los `.tsx` de `features/` únicamente `PanelAnunciosProps`), datos en `data.ts`, funciones puras en `lib.ts`, hooks en `hooks.ts`, un solo `fetch(` (`services/apiClient.ts:56`), sin `any`, sin `else`, sin ternarios anidados, sin `console`. La regla 9 la hace cumplir ESLint: comprobado por `--stdin` (sin crear archivos) que `@/features/…`, `../otro-modulo` desde el primer nivel y `../../otro-modulo` desde `components/` fallan con el mensaje de la regla, y que `../data` desde `components/` pasa.
- Lista de diseño: 0 colores fuera de `tokens.css` (`#hex`, `oklch(`, `rgb(`, `hsl(`, `bg-white`, `text-white`, `text-black`, `bg-black`, `zinc-`, `slate-` con `\b`, `gray-`, `neutral-`, `dark:`); sin `.dark` ni `@custom-variant`; sin degradados, `backdrop-blur`, violet/indigo/purple; `variant="primary"` solo en "Iniciar sesión" y `outline` por defecto en `buttonVariants`; estado con icono + texto en `MensajeError`, `Cargando` y la tarjeta de diagnóstico; densidad por rol en `ContenedorRol` (`gap-8/6/4`, `data-rol`); textos en español de México sin palabras prohibidas ni emojis (comprobado con Node sobre `frontend/` y la sección nueva del README); `label htmlFor` en los dos campos; foco visible por regla global `*:focus-visible` más `focus-visible:ring-2` en `Button` e `Input`; estructura de una columna con gutter de 16 px (`px-4`) y dos columnas desde `lg:`.

## Problemas que no bloquean

### M-01 — La paleta provisional es exactamente el aspecto genérico que `CLAUDE.md` prohíbe
Dónde: `frontend/src/styles/tokens.css` (`:root`).
Por qué importa: grises neutros con `--primary: oklch(0.3 0 0)` (botón casi negro) es "la escala de grises neutra con botones negros" que la dirección visual descarta. Está previsto y comentado (S-05 del plan, aprobado por el humano), así que no bloquea; pero no puede llegar a ninguna demostración ni al piloto en este estado.
Qué se espera: que el encargo de dirección visual sustituya los valores antes de mostrar la interfaz a nadie fuera del equipo, y que mientras tanto nadie tome estos valores como referencia.

### M-02 — Sombras y un radio fuera de tokens en los componentes de `components/ui/`
Dónde: `input.tsx` (`shadow-xs`), `card.tsx` (`shadow-sm`), `dialog.tsx` (`shadow-lg`, `rounded-xs` en el botón de cierre); `Toaster` de sonner con su aspecto por defecto (`providers.tsx`).
Por qué importa: `CLAUDE.md` pide que sombras y radios pasen por token; `tokens.css` define `--radius-*` pero ningún `--shadow-*`, y `rounded-xs` usa el valor por defecto de Tailwind. Son clases base que el plan mandó conservar del código generado, y los valores son provisionales, por eso no bloquea.
Qué se espera: que el encargo de dirección visual defina `--shadow-*` (y `--radius-xs` si se conserva) en `@theme` de `tokens.css` o elimine esas clases, y estilice el `Toaster` con tokens (`toastOptions`/variables de sonner). Añadirlo a la nota 5 de DOCS-01 del plan (junto con anular la paleta por defecto de Tailwind, R-11).

### M-03 — Aviso `EBADENGINE` de jsdom (decisión del humano)
Dónde: `npm install`; `jsdom@30.1.1` y tres transitivas piden Node `^22.22.2 || ^24.15.0 || >=26.0.0`; la máquina tiene `v24.11.1`; `.nvmrc` = `24`; `engines` de la raíz `>=24 <25`.
Por qué importa: es un aviso, no un error; jsdom es dependencia de desarrollo (solo pruebas), nunca llega al bundle ni al Droplet; las 13 pruebas pasan. Con `engine-strict` activado fallaría la instalación.
Qué se espera: mi recomendación es **aceptar y actualizar Node en local (y en el CI cuando exista) al último 24.x (≥ 24.15)**, que ya cabe en `.nvmrc` y en `engines` sin tocar el repositorio. No fijar jsdom hacia abajo: sería salirse de la política de "última versión de la mayor" para evitar un aviso. Decide el humano.

## Detalles menores

- `frontend/src/services/apiClient.test.ts:77`: `const [url, init] = llamada ?? []` es el único `?? []` del paquete. Está en una prueba, justo después de `expect(llamada).toBeDefined()`, así que no oculta datos; por coherencia con el resto del archivo (`if (!esApiError(error)) return`) podría ser `if (!llamada) return`. Corregir cuando se toque el archivo.
- `DiagnosticoView` lleva sus textos ("Diagnóstico de conexión", "API: …") en el JSX; la regla 2 de `CLAUDE.md` los quiere en `data.ts`. El plan no previó `data.ts` en `diagnostico` y la vista es temporal (P-02); si sobrevive al módulo `admin`, darle `data.ts`.
- `login-view.test.tsx` y `router.test.tsx` importan `rutas` de `@/app/router`, que a su vez importa todas las vistas: una prueba de módulo depende de toda la tabla de rutas. Es lo que el plan pidió; para vistas futuras basta un `createMemoryRouter` con la vista sola.
- README, §4: "`test` corre Vitest con jsdom (no necesita la API ni infra)" es cierto desde `frontend/`; desde la raíz `npm test` incluye el backend, que sí necesita infra y `backend/.env`. Una aclaración de media línea cuando se toque el README.
- `frontend/node_modules/` existe con `@vitejs/plugin-react` (anidado por npm workspaces, una sola versión 6.1.1 según `npm explain`) y las cachés `.tmp`, `.vite`, `.vite-temp`; todo ignorado. No es artefacto de shadcn; el punto "inexistente" del plan se lee como "sin lock ni instalación propia", que se cumple.
- Bundle único de 505 kB (aviso de Vite): línea base; dividir por rutas con `lazy` cuando haya más módulos.
- El patrón `slate-` de V-07 casa con `translate-*`; para el futuro usar `\bslate-`. Nota para el plan, no hallazgo.

## Desacuerdos arbitrados

Sin Tester en este flujo; arbitro las desviaciones del Programador respecto al plan.

- **D-01 — `RouterProvider` desde `react-router` en vez de `react-router/dom`: aceptada.** Comprobé en `node_modules/react-router/package.json` que `exports["."]` y `exports["./dom"]` tienen bajo `node` la condición `module-sync` → `.mjs` y `default` → `.js`, y que `dom-export.js` (CJS) hace `require('react-router')`: la doble instancia bajo Vitest es real, no un ajuste de conveniencia. En ESM, `dom-export.mjs` toma `RouterProvider` del mismo chunk que la entrada principal y solo lo envuelve en `RouterProvider2` añadiendo `flushSync: ReactDOM.flushSync` (líneas 55-56). Efecto en el navegador: se pierde únicamente el `flushSync` para navegaciones con `flushSync: true` / transiciones de vista, que no se usan. DEC-08 preveía esta alternativa. Nota para el encargo de auth: si alguna navegación llegara a necesitar `flushSync`, `main.tsx` (que Vitest nunca carga) puede importar de `react-router/dom` sin tocar las pruebas.
- **D-02 / D-03 — `cn` rechazado y `frontend/@/` movido a `src/`: aceptadas y verificadas** (sin rastro; ver arriba). Para el siguiente `shadcn add`, el Arquitecto decide si `frontend/tsconfig.json` declara `compilerOptions.paths` (inocuo con `files: []`) o si se repite el movimiento a mano; y hay que contar con que el CLI volverá a añadir `cn`.
- **D-04 — `hourCycle: "h23"` en `formatearFechaHora`: aceptada.** Es la única forma de cumplir la prueba que el propio plan fijó ("14:42") con el ICU de Node 24, y coincide con el formato de 24 h de los textos del PRD.
- **D-05 — Prettier acotado por rutas: aceptada.** Más estrecho que el plan y en línea con la regla de formateadores; `prettier --check .` desde `frontend/` pasa dentro de `lint`.
- **Ajustes menores: aceptados.** `isPending` en lugar de `isLoading` es lo correcto en TanStack Query v5 para que `data` quede estrecho a `SaludRespuesta` tras las guardas (el orden error → cargando → datos se mantiene); `void rol` es preferible a tocar la configuración global de ESLint fuera del plan; el `aria-label` del `<form>` es necesario para que exponga `role="form"`; los textos de diagnóstico en JSX quedan como detalle menor.

## Documentos a actualizar

- **`AGENTS.md`, bloque "Frontend (desde /frontend)" de "Comandos": el texto literal del plan sigue siendo correcto tras la implementación** (scripts `dev`, `build`, `lint`, `test` existen con ese nombre; puerto 5173; proxy `/api` → `127.0.0.1:3000`; `.env.example` opcional con solo `VITE_API_URL`). Lo aplica el orquestador; no lo apliqué.
- **DOCS-01 (nuevo respecto al pendiente 9 ya anotado en `aprobacion.md`):** en `CLAUDE.md` "Ubicaciones compartidas", mencionar `components/mensaje-error.tsx` y `components/cargando.tsx` como piezas compartidas y `components/ui/button-variants.ts` junto a `button.tsx`; anotar `features/diagnostico/` como temporal (P-02) y `components/layout/types.ts` (`Rol`) como provisional hasta que `shared/` exponga los roles; sumar a la nota 5 (dirección visual) los tokens de sombra y el `Toaster` (M-02); anotar para el siguiente `shadcn add` la decisión sobre `paths` en `tsconfig.json` y el paquete `cn` (D-02/D-03), y corregir el grep de V-07 (`\bslate-`).
- `docs/trabajo/FRONT-01-esqueleto-frontend/` queda como historial: `plan.md`, `aprobacion.md`, `resumen-programador.md` y esta revisión.

## Para el humano

1. **Commit** en la rama `chore/front-01-esqueleto-frontend` tras revisar el diff: 5 rastreados modificados (`package-lock.json`: 7823 inserciones / 437 borrados) y 48 archivos nuevos en `frontend/`, más los tres documentos de `docs/trabajo/FRONT-01-esqueleto-frontend/` y esta revisión. `frontend/.env` existe en local (lo creó el programador al ejecutar el README) y está ignorado; puede quedarse.
2. **Decisión sobre `EBADENGINE`** (M-03): aceptar y subir Node a 24.15+ cuando convenga (mi recomendación), o fijar jsdom.
3. **Comprobación visual que nadie pudo hacer** (sin navegador en las sesiones): `/login` a 360 px sin desbordamiento horizontal (lista de anuncios compacta con desplazamiento propio arriba del formulario, tarjeta de acceso debajo) y a escritorio en dos columnas; anillo de foco visible al tabular por los campos, el botón y los tres enlaces; `toast` "El inicio de sesión aún no está disponible." al enviar; `/diagnostico` con la API apagada (tarjeta de error con `RESPUESTA_INVALIDA` o `SIN_CONEXION`) y encendida (tres líneas con icono de verificación y la hora en 24 h); el `Dialog` no lo usa ninguna vista, así que solo podrá verse cuando una lo monte.
4. **Aspecto provisional** (M-01): la interfaz hoy luce como el genérico prohibido, a propósito y comentado; no mostrarla como "la dirección visual". El encargo de dirección visual sustituye `tokens.css`, define sombras y familias tipográficas, estiliza el `Toaster` y anula la paleta por defecto de Tailwind.
5. **Autorizar al orquestador** a aplicar el bloque de `AGENTS.md` con el texto literal del plan.

## Verificación propia (detalle)

- `npm run lint`, `npm run build`, `npm test` desde la raíz, en secuencia (comparten el hook `shared:build`); salidas en el scratchpad de la sesión. Conteos arriba. El aviso de Vite por el chunk > 500 kB es informativo.
- **Prueba de humo, por PID propio:** puertos 3000 y 5173 libres antes; API arrancada desde `backend/` con `node --env-file-if-exists=.env dist/server.js` (PID 18196, log `"Server listening at http://127.0.0.1:3000"`); Vite desde `frontend/` con `npx vite --host 127.0.0.1 --port 5173 --strictPort` (npx PID 8216 → vite PID 2856, `VITE v8.3.0 ready`). `curl.exe http://127.0.0.1:5173/login | grep -c 'id="root"'` → **1**; `curl.exe -i http://127.0.0.1:5173/api/salud` → **HTTP/1.1 200 OK** `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-22T21:30:55.214Z"}` a través del proxy; `/api/no-existe` → **404** `{"error":{"codigo":"NO_ENCONTRADO","mensaje":"La ruta no existe."}}`. Identidad confirmada con `Get-Process` (inicio 15:30:48 / 15:30:49, posterior a mi arranque) y `Get-CimInstance Win32_Process` (líneas de comando `dist/server.js` y `npx-cli.js vite --host 127.0.0.1 --port 5173 --strictPort`); detenidos solo esos árboles con `taskkill /PID … /T /F`; después `Get-NetTCPConnection` en 3000 y 5173 vacío y ningún `node` con `vite` o `dist/server.js` vivo. Infra sin tocar (3 servicios `healthy` antes y después). Logs en `backend/tmp/api-manager.log` y `backend/tmp/vite-manager.log` (ruta ignorada).
- **No repetí** V-14 (Vite con la API apagada → 502) ni V-15 (`npm run dev` vía `Start-Process`): las reporta el programador con salida real y la prueba unitaria (2) de `diagnostico-view.test.tsx` cubre el camino de error. No hay navegador: la comprobación visual queda para el humano (punto 3).
- Greps y comprobaciones de estado: `git check-ignore -v` → `frontend/dist` (`.gitignore:2`), `frontend/.env` (`.gitignore:4`), `frontend/node_modules/.tmp` (`.gitignore:1`); `git check-ignore frontend/.env.example frontend/components.json` → `1` (no ignorados); `git ls-files --eol` → los 5 rastreados `i/lf w/lf` y ninguno de los 48 nuevos con `w/crlf`; `npm ls` → una sola versión de `react` 19.3.0, `react-dom` 19.3.0, `vite` 8.3.0, `vitest` 4.1.11, `zod` 4.6.5, `globals` 16.5.0, `eslint` 10.11.0, `@tanstack/react-query` 5.103.2, `react-router` 7.18.4, `tailwindcss` 4.3.3, sin `invalid`/`extraneous`/`missing`; `node_modules/.bin` con `tsc`, `vite`, `vitest` y **sin** `shadcn`.

## Definición de terminado (`AGENTS.md`)

- [x] Cumple el `RF-xx` / `RN-xx` correspondiente — andamiaje sin RF propio; la pantalla sigue la estructura de RF-06 (anuncios a la izquierda, formulario a la derecha, enlace "¿Olvidaste tu contraseña?") y la nota de RF-04a ("¿No te llega el correo? Acude a administración."); RNF-05 (360 px) pendiente de comprobación visual.
- [x] Respeta las capas y pasa por el middleware — sin endpoints ni cambios en backend; `apiClient` es el único punto de red y las guardas son esqueleto declarado.
- [x] `lint`, `build` y `test` en verde — ejecutados por mí.
- [x] Pruebas de autorización incluidas si hay endpoint nuevo — no aplica (sin endpoint nuevo).
- [x] Migración de Prisma incluida y compatible hacia atrás si cambió el esquema — no aplica.
- [x] `infra/` y `.env.example` actualizados si cambió la infraestructura o la configuración — `infra/` sin cambios; `frontend/.env.example` nuevo, sin valores.
- [ ] Documentos actualizados si cambió una decisión, una tabla o un comando — README hecho; el bloque de `AGENTS.md` lo aplica el orquestador tras esta revisión (autorizado); lo demás va a DOCS-01.
