# Plan — FRONT-01: esqueleto del frontend (`@campus/frontend`)
Estado: LISTO
Carril: normal (ver justificación)
Requisitos: ninguno propio (andamiaje). Sigue la estructura de RF-06 (login con panel de anuncios), RF-04a (nota "¿No te llega el correo? Acude a administración") y RNF-05 (responsive desde 360 px); RF-07 solo como origen futuro de los anuncios. Reglas: `AGENTS.md` 9, 11, 13 y "Reglas del equipo" (formateadores acotados; procesos ajenos); `ARCHITECTURE-ESSENTIALS.md` "Stack", "Autenticación" (token solo en memoria), "Operación" (formato de error, `/api/salud`) e "Interfaz"; `CLAUDE.md` completo (módulos, tokens, componentes, textos, retornos tempranos, errores en el frontend, "Lo que no se hace").
Antecedentes: `docs/trabajo/BACK-02-prisma-7/` (formato de "Qué autoriza", V-xx y flujo abreviado).

## Flujo autorizado para este encargo
1. `arquitecto` entrega este `plan.md`.
2. **El humano aprueba el plan por escrito** (responde P-01 a P-05 o acepta los valores por defecto).
3. `programador` implementa exactamente este plan y entrega `docs/trabajo/FRONT-01-esqueleto-frontend/resumen-programador.md`.
4. `manager` (modo final) emite `revision.md`; ejecuta por su cuenta `lint`, `test`, `build` y la prueba de humo.
5. El humano decide el commit. Ningún agente hace `git add`, `commit` ni `push`.

Sin `tester` (no hay comportamiento de negocio que atacar; el formulario no envía nada). La excepción no modifica `AGENTS.md`.

**Por qué carril normal:** no toca `middleware/`, `adapters/auth`, `infra/`, migraciones, estado de pago ni restricción de acceso; no hay sesión real (`authService` solo guarda un token en memoria que nadie emite todavía). Sí instala dependencias y edita configuración de la raíz (`package.json`, `eslint.config.mjs`), por eso lleva aprobación escrita y lista cerrada de comandos, como BACK-01/02. El primer encargo que implemente `login`/`refrescar`/`logout` en `authService` **será sensible**.

### Qué autoriza la aprobación de este plan (y nada más)
- **Crear** todo lo que lista la tabla "Archivos" dentro de `frontend/` (incluido lo que genera el CLI de shadcn en `frontend/src/components/ui/` y `frontend/components.json`) y `docs/trabajo/FRONT-01-esqueleto-frontend/resumen-programador.md`. **Modificar** solo `frontend/package.json`, `package.json` (raíz), `package-lock.json`, `eslint.config.mjs` y `README.md` (sección nueva). **No borrar** ningún archivo versionado. Sí borrar artefactos temporales propios: logs en el scratchpad de la sesión, y `frontend/package-lock.json` o `frontend/node_modules/` **solo si los creó el CLI de shadcn durante este encargo** (V-06), seguido de `npm install` desde la raíz.
- **Instalar** solo las dependencias de la tabla "Dependencias" (rangos `^` con la versión exacta indicada), con `npm install` desde la raíz (repetible si cambia un `package.json`). Excepción acotada: si el código que genera `shadcn add` importa `@radix-ui/react-dialog` o `@radix-ui/react-slot` en lugar de `radix-ui`, se declaran esos dos (última 1.x estable, con `npm view`) y se reporta. Prohibido: `--legacy-peer-deps`, `--force`, `npm audit fix`, `npm update`, `npm dedupe`, `npm install -g`, `npm create vite`, paquetes fuera de la tabla, `livekit-client`, `@livekit/components-react`, `@fullcalendar/*`, `react-router-dom`, `axios`, `tailwindcss-animate`, `autoprefixer`, `postcss`, `vite-tsconfig-paths`.
- **Ejecutar**: los scripts `npm run <script>` del repositorio; `npm view`, `npm ls`, `npm explain`, `npm audit` (solo lectura); `npx shadcn@4.21.0 --help`, `npx shadcn@4.21.0 add --help`, `npx shadcn@4.21.0 init --help`, `npx shadcn@4.21.0 add button input card dialog` (con las banderas que confirme `--help`, desde `frontend/`, una vez o repetida con `--overwrite` si hay que regenerar); `npx tsc -b`, `npx vite build`, `npx vite --host 127.0.0.1 --port 5173`, `npx vitest run`, `npx eslint`, `npx prettier --check`; Prettier con `--write` **solo** acotado desde `frontend/` (`npx prettier --write . --ignore-path ../.prettierignore`) y desde la raíz solo por ruta explícita (`npx prettier --write eslint.config.mjs README.md package.json`); arrancar y detener **solo los procesos propios** (`node`, `npx vite`) por PID (`taskkill //PID <pid> //T //F` desde Git Bash o `Stop-Process -Id <pid>` en PowerShell); `curl.exe` contra `127.0.0.1`; desde `backend/`: `npm run build` y `node --env-file-if-exists=.env dist/server.js` para la prueba de humo; en `infra/`: `docker compose ps`, `docker compose up -d`; git de solo lectura (`status`, `diff`, `check-ignore`, `ls-files`, `log`); diagnóstico de solo lectura (`Get-NetTCPConnection`, `Get-Process`, `node --version`, `npm --version`, `grep`, `ls`, `cat`, `head`, `wc`).
- **Si el puerto 5173 o el 3000 están ocupados por un proceso ajeno: detenerse y preguntar** (regla de `AGENTS.md`). No cambiar puertos por cuenta propia ni terminar procesos que no arrancó el programador.
- **No autoriza:** `npx shadcn@4.21.0 init` dentro del repositorio (ver DEC-03 para la variante fuera del repositorio); `npx shadcn` sin versión fijada; editar `tsconfig.base.json`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.gitattributes`, `shared/**`, `backend/**`, `infra/**`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`; `git add`, `commit`, `push`, `restore`, `stash`; `docker compose down`; `npm run format` o `prettier --write .` desde la raíz; leer o imprimir `backend/.env` o `infra/.env`; usar `localStorage`/`sessionStorage`; declarar a mano tipos que existen en `shared/`.

## Preguntas bloqueantes
Ninguna. Estado `LISTO`.

## Preguntas no bloqueantes (con valor por defecto)
| # | Pregunta | Valor por defecto | Si el humano elige lo contrario |
|---|---|---|---|
| P-01 | React Router **7** (`^7.18.4`, última 7.x) o **8** (`8.4.0`, publicada 2026-06-17, cambios desconocidos)? | **7.** API conocida (`createBrowserRouter`, `RouterProvider`, `createMemoryRouter`, `Navigate`, `Link`, `Outlet` desde `react-router`), peer `react >=18`, documentación estable. Subir a 8 es un `chore` aparte cuando se conozcan los cambios | Instalar `^8.4.0`; el programador **lee `node_modules/react-router/CHANGELOG.md` antes de escribir `router.tsx`**, adapta importaciones y reporta cada diferencia con este plan |
| P-02 | ¿Dónde vive la vista de diagnóstico de `/api/salud`? | **`features/diagnostico/`** (`types.ts`, `hooks.ts`, `diagnostico-view.tsx`). Es la única ubicación que cumple las reglas 4 y 8 de `CLAUDE.md` (el hook de TanStack Query va en un `hooks.ts` de módulo; `app/` solo tiene rutas, layouts y guardas). No es un dominio del PRD: cuando exista `admin`, la vista se mueve allí o se elimina; se anota | Ponerla en `app/diagnostico.tsx` (viola la regla 4: el hook viviría fuera de un `hooks.ts`) o descartarla y probar la conexión solo con `curl` |
| P-03 | Versión de Vitest para el monorepo | **`^4.1.11`**, la del backend: una sola copia en `node_modules`, compatible con `vite ^8` según su `peerDependencies`. Subir backend y frontend a 5.x es un `chore` aparte | Instalar `^5.0.1` en ambos paquetes **en este encargo** (tocaría `backend/package.json`, hoy fuera del alcance) |
| P-04 | ¿Se introduce ya la variable opcional `VITE_API_URL` (vacía = mismo origen, que en dev resuelve el proxy)? En `prod` el frontend vive en `campus.<dominio>` y la API en `api.<dominio>` (ESSENTIALS "Stack"), así que hará falta | **Sí**, como prefijo opcional en `apiClient` y `frontend/.env.example` con `VITE_API_URL=` vacío y comentario. No cambia nada en dev | Sin variable: `apiClient` usa rutas relativas y el encargo de despliegue la añade |
| P-05 | Enlaces del login y acción del botón: (a) "¿Olvidaste tu contraseña?" → `/recuperar`, "Regístrate como estudiante" → `/registro` (rutas futuras de la tabla de módulos; hoy caen en la ruta comodín que redirige a `/login`); (b) al enviar, `toast.message("El inicio de sesión aún no está disponible.")` | **(a) y (b).** Los `href` reales evitan cambiar la vista después; el toast demuestra que `sonner` está montado y le dice al humano que el formulario no envía | (a') `href="#"` con `aria-disabled`; (b') solo `preventDefault`, sin aviso |

## Contradicciones entre documentos (reportadas, no bloquean)
- **C-01.** `CLAUDE.md` ("Frontend") lista `styles/tokens.css` como único archivo de `styles/`; Tailwind 4 necesita un CSS de entrada con `@import "tailwindcss"`. Este plan añade `styles/index.css` (entrada) que importa `tokens.css` (tokens). No contradice el espíritu (los tokens siguen en `tokens.css`); se anota para DOCS-01 por si se quiere reflejar.
- **C-02.** `ARCHITECTURE.md` §2 escribe `@livekit/components-react` y ESSENTIALS "LiveKit React"; mismo paquete, sin efecto aquí (no se instala).
- Sin versiones ni rutas del frontend fijadas en ESSENTIALS/ARCHITECTURE que choquen con este plan.

## Suposiciones
- **S-01.** Node `v24.11.1`, npm `11.6.2`, `main` limpio, infra levantado, `backend/.env` presente (no se lee). El programador confirma en V-01.
- **S-02.** Los datos del orquestador (versiones y pares verificados el 2026-09-22) son correctos. Lo demás lleva **[verificar]** y se confirma contra el paquete instalado o `--help` antes de escribir el archivo que dependa de ello.
- **S-03.** El programador trabaja en Git Bash sin terminal interactiva; los comandos del README se escriben para PowerShell 5.1. Los procesos se arrancan en segundo plano con redirección a un log en el scratchpad y se detienen por PID.
- **S-04.** "Formato compacto" del panel en móvil (RF-06) = lista vertical de tarjetas reducidas (título y una línea de texto), con altura máxima y desplazamiento propio, arriba del formulario. El PRD no lo detalla; se ajusta con la dirección visual.
- **S-05.** Los valores de los tokens son provisionales y neutros (grises con un acento azul apagado para enlaces/foco y tres semánticos). No es una propuesta visual; el comentario obligatorio lo dice.
- **S-06.** `npx shadcn@4.21.0 add` funciona con un `components.json` escrito a mano (sin `init`) y no reescribe el CSS **[verificar]**. Si no, DEC-03 da el camino alternativo.
- **S-07.** `@testing-library/react@16.3.3` funciona con React 19.3 y jsdom 30 (peers declarados `^18||^19`).
- **S-08.** Ninguna prueba ni componente necesita `zod` importado directamente: se usan los esquemas de `@campus/shared` y su `.parse`. Por eso `zod` no se declara en `frontend/package.json` (los `.d.ts` de `shared/dist` lo resuelven desde el `node_modules` de la raíz). Si el programador necesitara importar `zod` directamente, se detiene y reporta (sería añadirlo como dependencia con `^4.6.5`).

## Alcance
**Entra:** `frontend/` completo como SPA con Vite 8 + React 19 + TypeScript estricto; React Router 7 (P-01); TanStack Query 5; Tailwind 4 (`@tailwindcss/vite`, CSS-first); shadcn CLI 4.21.0 con solo `Button`, `Input`, `Card`, `Dialog`, adaptados a nuestros tokens; `lucide-react`; `sonner`; estructura exacta de `CLAUDE.md`; módulo `features/auth/` con la vista de login (sin envío); módulo mínimo `features/diagnostico/` (P-02); `services/apiClient.ts` con `ApiError` y `services/authService.ts`/`liveService.ts` como esqueletos; `styles/tokens.css` con los nombres de `CLAUDE.md`; proxy `/api` → `127.0.0.1:3000`; `@campus/shared` importable; ESLint (bloque nuevo en la raíz con `react-hooks` y `react-refresh`), Prettier, Vitest + Testing Library con 6 archivos / 13 pruebas; scripts `dev`, `build`, `lint`, `test`, `preview`, `typecheck`, `format`; README "Frontend en local"; propuesta de texto para `AGENTS.md`.

**No entra:** autenticación real (login, refresco, logout, `/me`), cualquier otra vista o módulo, `EstadoPagoBadge`/`EstadoEntregaBadge`/`AvatarUsuario`/`EstadoVacio`, FullCalendar, LiveKit, despliegue en Cloudflare Pages, favicon y tipografías definitivas, modo oscuro, i18n, `backend/`, `shared/`, `infra/`, migraciones, cambios en `tsconfig.base.json`, `.prettierignore`, `.gitignore`, `.gitattributes`, subir `globals` (queda `^16.5.0`, trae `globals.browser`), subir Vitest a 5.

## Diseño

### Decisiones
- **DEC-01. Vite 8 + `@vitejs/plugin-react` 6 + `@tailwindcss/vite` 4; sin PostCSS ni `tailwind.config.js`.** Tailwind 4 es CSS-first: `@import "tailwindcss"` y `@theme inline` en CSS. Alias `@/` → `src/` (lo exige `components.json`), declarado en `vite.config.ts`, `tsconfig.app.json` (`paths`) y heredado por Vitest vía `mergeConfig`.
- **DEC-02. Tokens propios, shadcn los lee.** `tokens.css` define en `:root` los 13 nombres de `CLAUDE.md` más los derivados mínimos que shadcn usa y `CLAUDE.md` no nombra (`--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--secondary`, `--secondary-foreground`, `--accent-foreground`, `--destructive-foreground`, `--input`, `--ring`, `--radius`, `--font-sans`, `--font-heading`, `--font-mono`), todos derivados por `var()` de los nuestros. Un bloque `@theme inline` expone `--color-*`, `--radius-*` y `--font-*` para que `bg-background`, `bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-primary`, `bg-destructive`, `bg-accent`, `bg-success`, `bg-warning`, `bg-danger`, `font-heading` existan como utilidades. Sin `.dark`, sin `@custom-variant dark`. Ningún `oklch(`/`#hex` fuera de `tokens.css` (V-17).
- **DEC-03. `components.json` a mano + `shadcn add`; `init` prohibido dentro del repositorio.** `init` reescribe el CSS con su paleta, crea `lib/utils.ts` e instala dependencias por su cuenta; escribir `components.json` a mano evita las tres cosas. Orden: (1) dependencias en `package.json` e `npm install` desde la raíz (así `add` no tiene nada que instalar); (2) `npx shadcn@4.21.0 add button input card dialog` desde `frontend/` con las banderas que confirme `add --help` (esperadas `--yes`/`-y`, `--overwrite`/`-o` **[verificar]**); (3) revisar `git status`: si `add` tocó `frontend/package.json`, `src/styles/index.css` o creó `frontend/package-lock.json`/`frontend/node_modules`, reportar y aplicar la regla de "Qué autoriza". Si `add` rechaza el `components.json` manual, camino alternativo autorizado: en el **scratchpad de la sesión**, crear una carpeta con `package.json` mínimo (`"type":"module"`, `react`, `react-dom`, `tailwindcss` como deps declaradas, sin instalar), `vite.config.ts`, `tsconfig.json` con `paths` y `src/styles/index.css` con `@import "tailwindcss"`, ejecutar allí `npx shadcn@4.21.0 init -d` (o la bandera no interactiva que muestre `init --help`), copiar al resumen el `components.json` y el CSS que genere, ajustar el nuestro y borrar la carpeta. Nunca `init` en `frontend/`.
- **DEC-04. Los componentes generados son código nuestro.** Se adaptan a `verbatimModuleSyntax` (`import type`), `exactOptionalPropertyTypes` y `noUncheckedIndexedAccess` sin `any` ni relajar el `tsconfig`; `buttonVariants` se mueve a `components/ui/button-variants.ts` para que `button.tsx` exporte solo `Button` (regla `react-refresh/only-export-components`); la variante `default` del botón pasa a llamarse `primary` y el `variant` por defecto es `outline` (`CLAUDE.md`). Se conservan `secondary`, `ghost`, `link`, `destructive` y los tamaños. Cualquier clase de color por defecto de shadcn que no pase por un token (`bg-white`, `text-black`, `bg-zinc-*`, `dark:*`) se sustituye por la utilidad del token o se elimina (V-17).
- **DEC-05. `apiClient` valida con el esquema que le pasa el hook y lanza `ApiError`.** `api(ruta, { schema })` hace `fetch` con `credentials: "include"`, `Authorization: Bearer <token>` si `authService` tiene token, y traduce: respuesta no-2xx con cuerpo `{ error }` válido según `errorApiSchema` → `ApiError(codigo, mensaje, estado)`; no-2xx sin cuerpo válido → `ApiError("RESPUESTA_INVALIDA", "La respuesta del servidor no tiene el formato esperado.", estado)`; 2xx cuyo cuerpo no pasa `schema.parse` → `ApiError("RESPUESTA_INVALIDA", …, estado)`; fallo de red (`fetch` rechaza) → `ApiError("SIN_CONEXION", "No pudimos conectar con el servidor.", 0)`. Así ningún `ZodError` ni `TypeError` sale de `services/`; los hooks reciben datos tipados (`SaludRespuesta`) sin `as`. El esquema se pasa desde el hook (es quien conoce el contrato); `apiClient` no importa `zod`, solo el tipo estructural `{ parse: (dato: unknown) => T }`. Los tres casos especiales de `CLAUDE.md` (`403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, `401` con refresco silencioso) quedan como un comentario de punto de extensión en `apiClient` (por qué van ahí y no en cada vista), sin código.
- **DEC-06. `authService` sin funciones que siempre rechazan.** Expone `obtenerToken`, `establecerToken`, `limpiarToken`, `haySesion` (token en una variable de módulo; nunca `localStorage`/`sessionStorage`). `login`/`refrescar`/`logout` **no existen todavía**: un esqueleto que devuelve `Promise.reject(...)` sería código muerto que invita a llamarlo y, llamado fuera de un hook de TanStack Query, violaría "no lanzar fuera de TanStack Query". En su lugar, un comentario de cabecera fija el contrato futuro (`POST /api/auth/login` → token de acceso en memoria; `POST /api/auth/refrescar` con la cookie `HttpOnly` → token nuevo; `POST /api/auth/logout` → limpia el token) y recuerda que ese encargo será carril sensible.
- **DEC-07. `liveService` sin LiveKit.** Módulo con comentario de contrato (`conectarASala({ url, token })`, `desconectar()`, dependencia futura `livekit-client`/`@livekit/components-react`, token siempre emitido por la API tras la cadena de middleware) y `export {}`; no se instala nada de LiveKit.
- **DEC-08. Enrutador de datos de React Router 7.** `app/router.tsx` exporta `rutas` (arreglo `RouteObject[]`) y `router = createBrowserRouter(rutas)`; las pruebas usan `createMemoryRouter(rutas, { initialEntries })` con las **mismas** rutas. Rutas: `/` → `Navigate` a `/login`; `LayoutPublico` con hijas `/login` (`LoginView`) y `/diagnostico` (`DiagnosticoView`); `RequireSesion` con hijas `/estudiante`, `/maestro`, `/admin`, cada una `RequireRol rol=…` → `ContenedorRol rol=…` (sin hijas: hoy inalcanzables porque no hay sesión); `*` → `Navigate` a `/login`. `RouterProvider` se importa de `react-router/dom` **[verificar en `node_modules/react-router/package.json` `exports`; si no existe, desde `react-router`]**.
- **DEC-09. Guardas como esqueleto honesto.** `RequireSesion`: `if (!haySesion()) return <Navigate to="/login" replace />; return <Outlet />`. `RequireRol({ rol })`: hoy `return <Outlet />` con comentario: el rol se leerá de `GET /me` (nunca del token) en el encargo de auth; hasta entonces `RequireSesion` ya redirige. La seguridad real está en el backend; estas guardas solo evitan pantallas vacías.
- **DEC-10. Densidad por rol en el layout.** `ContenedorRol` recibe `rol: "estudiante" | "maestro" | "admin"` (tipo de interfaz en `components/layout/types.ts`; cuando `shared/` exponga el enum de roles se reexporta desde allí) y aplica un `data-rol` y una clase de espaciado por rol (`gap-8` estudiante, `gap-6` maestro, `gap-4` admin) para que la densidad de `CLAUDE.md` tenga un punto único. Contenido: `<nav aria-label="Navegación principal">` vacío con el nombre corto "Campus Digital" y `<main><Outlet /></main>`.
- **DEC-11. Vitest 4 con `mergeConfig` sobre `vite.config.ts`**, `environment: "jsdom"`, `globals: false`, `setupFiles: ["./src/test/setup.ts"]` (importa `@testing-library/jest-dom/vitest` y hace `afterEach(cleanup)` porque sin `globals` Testing Library no limpia sola **[verificar]**), `include: ["src/**/*.test.{ts,tsx}"]`, `css: false`.
- **DEC-12. Un solo `tsc -b` con dos proyectos.** `tsconfig.json` (raíz del paquete, `files: []`, `references`), `tsconfig.app.json` (código de `src/`, pruebas incluidas) y `tsconfig.node.json` (`vite.config.ts`, `vitest.config.ts`), ambos extienden `../tsconfig.base.json` y sobrescriben solo lo que Vite exige. `build` = `tsc -b && vite build`; `lint` termina con `npm run typecheck` (= `tsc -b`), igual que el backend.
- **DEC-13. Bloques nuevos de ESLint en la raíz** para `frontend/**/*.{ts,tsx}` con `globals.browser`, `eslint-plugin-react-hooks` y `eslint-plugin-react-refresh`, y una versión simple de la regla 9 de `CLAUDE.md` con `no-restricted-imports`: dentro de `frontend/src/features/**` se prohíbe `@/features/*`; en archivos de primer nivel de un módulo (`features/*/*.tsx?`) se prohíbe cualquier importación que empiece por `..` (lo compartido siempre entra por `@/`); en `features/*/components/**` se prohíbe `../..`. Con esto, el único `..` legal es el de `components/` hacia su propio módulo.

### Flujo de la petición de diagnóstico
`DiagnosticoView` → `useSalud()` (`features/diagnostico/hooks.ts`, `useQuery({ queryKey: ["salud"], queryFn: () => api("/api/salud", { schema: saludRespuestaSchema }), retry: false })`) → `api` (`services/apiClient.ts`) → `fetch("/api/salud")` → proxy de Vite → `127.0.0.1:3000/api/salud` → `200 { estado, baseDeDatos, marcaDeTiempo }` o `503 { error: { codigo: "BASE_DE_DATOS_NO_DISPONIBLE", mensaje } }` → `ApiError` → `isError` en la vista (orden error → cargando → datos). Con la API apagada, el proxy responde `500`/`502` sin cuerpo JSON → `ApiError("RESPUESTA_INVALIDA", …)`; la vista lo muestra con código y mensaje. Sin datos escritos, sin eventos, sin sesión.

## Dependencias
| Paquete | Dónde | Rango | Para qué |
|---|---|---|---|
| `react`, `react-dom` | frontend, deps | `^19.3.0` | UI |
| `react-router` | frontend, deps | `^7.18.4` (P-01) | Rutas (`createBrowserRouter`, `Navigate`, `Link`, `Outlet`) |
| `@tanstack/react-query` | frontend, deps | `^5.103.2` | Estado del servidor |
| `@campus/shared` | frontend, deps | `*` | Esquemas zod y tipos (`saludRespuestaSchema`, `errorApiSchema`, `SaludRespuesta`, `ErrorApi`) desde `shared/dist` |
| `lucide-react` | frontend, deps | `^1.47.0` | Iconos (`CircleAlert`, `LoaderCircle`, `CircleCheck`) |
| `sonner` | frontend, deps | `^2.0.8` | Avisos (`Toaster`, `toast`) |
| `class-variance-authority` | frontend, deps | `^0.7.1` | Variantes de `Button` |
| `clsx`, `tailwind-merge` | frontend, deps | `^2.1.1`, `^3.7.0` | `cn` en `lib/utils.ts` |
| `radix-ui` | frontend, deps | `^1.6.7` | `Dialog` y `Slot` de shadcn 4 **[verificar que el código generado importa `radix-ui`; alternativa acotada en "Qué autoriza"]** |
| `tw-animate-css` | frontend, deps | `^1.4.0` | Animaciones de `Dialog` (`animate-in`, `fade-in-0`…) que shadcn 4 espera **[verificar en el `dialog.tsx` generado; si no usa esas clases, no se instala]** |
| `vite` | frontend, devDeps | `^8.3.0` | Empaquetador y servidor de desarrollo |
| `@vitejs/plugin-react` | frontend, devDeps | `^6.1.1` | JSX automático y Fast Refresh |
| `tailwindcss`, `@tailwindcss/vite` | frontend, devDeps | `^4.3.3` ambos | CSS |
| `@types/react`, `@types/react-dom` | frontend, devDeps | `^19.3.0` | Tipos |
| `@types/node` | frontend, devDeps | `^24.13.6` (misma que backend) | `tsconfig.node.json` (`node:url` en `vite.config.ts`) |
| `vitest` | frontend, devDeps | `^4.1.11` (P-03) | Pruebas |
| `jsdom` | frontend, devDeps | `^30.1.1` | Entorno DOM |
| `@testing-library/react` | frontend, devDeps | `^16.3.3` | Render en pruebas |
| `@testing-library/dom` | frontend, devDeps | `^10.4.1` **[verificar última 10.x con `npm view @testing-library/dom versions`]** | Par obligatorio de `@testing-library/react` |
| `@testing-library/jest-dom` | frontend, devDeps | `^7.0.1` | Matchers (`toBeInTheDocument`) |
| `eslint-plugin-react-hooks` | **raíz**, devDeps | `^7.1.1` | Reglas de hooks |
| `eslint-plugin-react-refresh` | **raíz**, devDeps | `^0.5.7` | Regla `only-export-components` |

Sin cambios: `typescript ^5.9.3`, `eslint ^10.11.0`, `typescript-eslint ^8.70.1`, `prettier ^3.9.8`, `globals ^16.5.0`, `zod ^4.6.5` (en `shared` y `backend`). **No se instala:** `@testing-library/user-event` (bastan `fireEvent`; se añade cuando una prueba lo necesite), `shadcn` como dependencia (solo `npx shadcn@4.21.0`), nada de LiveKit ni FullCalendar, nada de AWS ni proveedores no aprobados.

### Comprobación previa a la instalación (V-02)
Con `npm view <paquete> version` y `npm view <paquete> peerDependencies`: `vite` 8.3.0 (engines ok con Node 24), `@vitejs/plugin-react` 6.1.1 (peer `vite ^8`), `react`/`react-dom`/`@types/*` 19.3.0, `react-router` 7.18.4 como última 7.x (con la función `ultima` de BACK-02: `ultima react-router 7`), `@tanstack/react-query` 5.103.2, `tailwindcss`/`@tailwindcss/vite` 4.3.3, `vitest@4.1.11` peer `vite ^6||^7||^8`, `@testing-library/react@16.3.3` peers (`@testing-library/dom ^10`), `eslint-plugin-react-hooks@7.1.1` y `eslint-plugin-react-refresh@0.5.7` peer `eslint` que admita `^10`. Si alguna versión estable es **mayor** que la de la tabla dentro del mismo mayor, usarla y reportar; si cambió el mayor o un par no se satisface, detenerse y reportar. `shadcn@4.21.0` se fija en el `npx` y no se instala.

## Archivos
| Acción | Ruta | Contenido mínimo |
|---|---|---|
| Modificar | `package.json` (raíz) | devDeps `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| Modificar | `package-lock.json` | Lo regenera `npm install` |
| Modificar | `eslint.config.mjs` | Importaciones de los dos plugins; tres bloques nuevos (ver "Contenido exacto") |
| Modificar | `frontend/package.json` | Ver "Contenido exacto" |
| Modificar | `README.md` | Sección nueva "Frontend en local (Windows + PowerShell)" al final |
| Crear | `frontend/index.html` | `<!doctype html><html lang="es-MX">`, `<meta charset>`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<title>CMEP Campus Digital</title>`, `<div id="root"></div>`, `<script type="module" src="/src/main.tsx">` |
| Crear | `frontend/vite.config.ts`, `frontend/vitest.config.ts` | Ver "Contenido exacto" |
| Crear | `frontend/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Ver "Contenido exacto" |
| Crear | `frontend/components.json` | Ver DEC-03 y "Contenido exacto" |
| Crear | `frontend/.env.example` | `# Prefijo de la API. Vacío = mismo origen (en desarrollo lo resuelve el proxy de Vite hacia 127.0.0.1:3000).` + `VITE_API_URL=` (P-04) |
| Crear | `frontend/src/main.tsx` | `createRoot(document.getElementById("root")!)`… sin `!`: `const raiz = document.getElementById("root"); if (!raiz) throw new Error("No existe #root en index.html")` (único `throw` fuera de hooks: arranque, no interfaz) → `<StrictMode><Providers><RouterProvider router={router} /></Providers></StrictMode>`; importa `./styles/index.css` |
| Crear | `frontend/src/vite-env.d.ts` | `/// <reference types="vite/client" />` + `interface ImportMetaEnv { readonly VITE_API_URL?: string }` + `interface ImportMeta { readonly env: ImportMetaEnv }` **[verificar que Vite 8 sigue aceptando esta ampliación]** |
| Crear | `frontend/src/app/router.tsx` | `rutas: RouteObject[]` y `router` (DEC-08) |
| Crear | `frontend/src/app/providers.tsx` | `Providers({ children })`: `QueryClientProvider` con `new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } } })` creado con `useState(() => …)`, y `<Toaster position="top-right" richColors={false} />` de sonner |
| Crear | `frontend/src/app/require-sesion.tsx`, `frontend/src/app/require-rol.tsx` | Guardas (DEC-09); `RequireRolProps { rol: Rol }` |
| Crear | `frontend/src/components/layout/types.ts` | `export type Rol = "estudiante" \| "maestro" \| "admin"` (interfaz; se reexportará de `shared/` cuando exista) |
| Crear | `frontend/src/components/layout/layout-publico.tsx` | `<div className="min-h-svh bg-background text-foreground"><Outlet /></div>` |
| Crear | `frontend/src/components/layout/contenedor-rol.tsx` | `ContenedorRol({ rol })` (DEC-10) |
| Crear | `frontend/src/components/mensaje-error.tsx` | `MensajeError({ titulo?, mensaje })`: `<div role="alert">` con icono `CircleAlert`, texto; colores por token (`text-destructive`, `border-destructive`) **y** texto explícito ("Error") — el estado nunca solo con color |
| Crear | `frontend/src/components/cargando.tsx` | `Cargando({ texto = "Cargando…" })`: `<p role="status" aria-live="polite">` con `LoaderCircle` (`animate-spin`) y el texto |
| Crear (CLI) y adaptar | `frontend/src/components/ui/button.tsx`, `button-variants.ts`, `input.tsx`, `card.tsx`, `dialog.tsx` | DEC-04 |
| Crear | `frontend/src/lib/utils.ts` | `export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))` (`import { clsx, type ClassValue } from "clsx"`) |
| Crear | `frontend/src/lib/format.ts` | `formatearFechaHora(iso: string, zona?: string): string` con `Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", ...(zona ? { timeZone: zona } : {}) })`; `new Date(iso)` inválida → devuelve `iso` tal cual (sin lanzar) |
| Crear | `frontend/src/lib/format.test.ts` | 1 caso: `formatearFechaHora("2026-09-22T14:42:06.290Z", "UTC")` contiene `"2026"` y `"14:42"` |
| Crear | `frontend/src/services/apiClient.ts` | `ApiError`, `api`, `esApiError` (DEC-05) |
| Crear | `frontend/src/services/apiClient.test.ts` | 3 casos con `vi.stubGlobal("fetch", vi.fn(...))`: (1) `{ error }` 503 → `ApiError` con `codigo` y `estado` 503; (2) 200 con cuerpo que no pasa el esquema → `RESPUESTA_INVALIDA`; (3) con `establecerToken("abc")` la petición lleva `Authorization: Bearer abc` y `credentials: "include"`; `afterEach(limpiarToken)` |
| Crear | `frontend/src/services/authService.ts` | DEC-06 |
| Crear | `frontend/src/services/liveService.ts` | DEC-07 |
| Crear | `frontend/src/styles/index.css`, `frontend/src/styles/tokens.css` | Ver "Contenido exacto" |
| Crear | `frontend/src/test/setup.ts` | `import "@testing-library/jest-dom/vitest"; import { cleanup } from "@testing-library/react"; import { afterEach } from "vitest"; afterEach(() => cleanup())` |
| Crear | `frontend/src/features/auth/types.ts` | `export interface Anuncio { anuncioId: string; titulo: string; texto: string; orden: number }` con comentario: tipo de interfaz provisional; cuando exista el endpoint público de anuncios (RF-07) se sustituye por el tipo inferido del esquema zod de `shared/` |
| Crear | `frontend/src/features/auth/data.ts` | `ANUNCIOS_DE_EJEMPLO: Anuncio[]` (3 anuncios, texto concreto, sin imágenes) y `TEXTOS_LOGIN` (título, subtítulo, etiquetas, botón, enlaces, nota de administración, aviso del toast). Ver "Textos" |
| Crear | `frontend/src/features/auth/lib.ts` | `ordenarAnuncios(anuncios: readonly Anuncio[]): Anuncio[]` (copia ordenada por `orden` ascendente, estable) |
| Crear | `frontend/src/features/auth/lib.test.ts` | 2 casos: ordena por `orden`; no muta el arreglo original |
| Crear | `frontend/src/features/auth/hooks.ts` | `useAnunciosLogin(): { anuncios: Anuncio[] }` con `useMemo(() => ordenarAnuncios(ANUNCIOS_DE_EJEMPLO), [])`; comentario: pasará a `useQuery` sobre el endpoint público de anuncios |
| Crear | `frontend/src/features/auth/components/panel-anuncios.tsx` | `PanelAnuncios({ anuncios })`: `<aside aria-label="Anuncios">`; escritorio: columna desplazable (`lg:overflow-y-auto`) de `Card` con `CardHeader`/`CardTitle`/`CardContent`; móvil: compacto (S-04) |
| Crear | `frontend/src/features/auth/components/formulario-login.tsx` | `FormularioLogin()`: `<form noValidate onSubmit>`; `label htmlFor="correo"` + `Input id="correo" type="email" autoComplete="email" required`; `label htmlFor="contrasena"` + `Input id="contrasena" type="password" autoComplete="current-password" required`; `Button type="submit" variant="primary"` "Iniciar sesión"; `Link to="/recuperar"` "¿Olvidaste tu contraseña?"; nota "¿No te llega el correo? Acude a administración."; `Link to="/registro"` "Regístrate como estudiante". `onSubmit`: `preventDefault()` + `toast.message(TEXTOS_LOGIN.avisoPendiente)` (P-05). Sin estado de formulario ni validación (no hay envío) |
| Crear | `frontend/src/features/auth/login-view.tsx` | `LoginView()`: `<main>` con rejilla `grid min-h-svh grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]`, gutter `px-4` (16 px) en móvil, `lg:px-12`; izquierda `PanelAnuncios`, derecha `Card` con `h1` ("CMEP Campus Digital", `font-heading tracking-tight`) y `FormularioLogin` |
| Crear | `frontend/src/features/auth/login-view.test.tsx` | 3 casos con `createMemoryRouter(rutas, { initialEntries: ["/login"] })` dentro de `QueryClientProvider`: (1) título "CMEP Campus Digital" y `h1` presentes; (2) botón accesible `{ name: "Iniciar sesión" }`, campos por etiqueta "Correo" y "Contraseña", enlaces "¿Olvidaste tu contraseña?" y "Regístrate como estudiante", texto "Acude a administración"; (3) `fireEvent.submit(form)` → `router.state.location.pathname` sigue siendo `/login` y el `h1` sigue en pantalla |
| Crear | `frontend/src/app/router.test.tsx` | 2 casos: `createMemoryRouter(rutas, { initialEntries: ["/"] })` termina en `/login`; `["/maestro"]` termina en `/login` (guarda sin sesión) |
| Crear | `frontend/src/features/diagnostico/types.ts` | `export type { SaludRespuesta } from "@campus/shared"` |
| Crear | `frontend/src/features/diagnostico/hooks.ts` | `useSalud()` (ver "Flujo") |
| Crear | `frontend/src/features/diagnostico/diagnostico-view.tsx` | `DiagnosticoView()`: `isError` → `MensajeError` con `error.codigo` y `error.mensaje` (si no es `ApiError`, mensaje genérico); `isLoading` → `Cargando`; datos → `Card` con "API: ok", "Base de datos: ok" (icono `CircleCheck` + texto) y "Última respuesta: {formatearFechaHora(marcaDeTiempo)}" |
| Crear | `frontend/src/features/diagnostico/diagnostico-view.test.tsx` | 2 casos con `fetch` simulado y `QueryClient` con `retry: false`: (1) 200 con cuerpo válido → aparece "Base de datos" y "ok"; (2) 503 `{ error: { codigo: "BASE_DE_DATOS_NO_DISPONIBLE", mensaje } }` → `role="alert"` con el código |
| Crear | `docs/trabajo/FRONT-01-esqueleto-frontend/resumen-programador.md` | Entregable del programador |
| **No se toca** | `backend/**`, `shared/**`, `infra/**`, `tsconfig.base.json`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.gitattributes`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md` | — |
| **Propuesto, lo aplica el orquestador** | `AGENTS.md` bloque "Frontend" de "Comandos" | Ver "Propuesta para AGENTS.md" |

`.gitignore` y `.prettierignore` no cambian: `dist`, `node_modules`, `*.tsbuildinfo`, `.env.*` (menos `.env.example`) y `coverage` ya cubren todo lo que genera Vite/Vitest; `node_modules/.vite` y `node_modules/.tmp` caen en `node_modules`. `components.json` se formatea con Prettier (JSON de 2 espacios; no se ignora).

### Textos (español de México, tuteo, sin emojis)
- `TEXTOS_LOGIN`: `titulo: "CMEP Campus Digital"`, `subtitulo: "Entra con el correo y la contraseña de tu cuenta."`, `correo: "Correo"`, `contrasena: "Contraseña"`, `entrar: "Iniciar sesión"`, `olvide: "¿Olvidaste tu contraseña?"`, `notaAdministracion: "¿No te llega el correo? Acude a administración."`, `registro: "Regístrate como estudiante"`, `avisoPendiente: "El inicio de sesión aún no está disponible."`, `tituloAnuncios: "Avisos del colegio"`.
- Anuncios de ejemplo (`orden` 1–3): "Inscripciones al taller de robótica" / "Regístrate con tu maestro titular antes del viernes 3 de octubre. Cupo: 20 alumnos por turno."; "Entrega de boletas del primer parcial" / "Las boletas se entregan en la dirección del lunes 6 al miércoles 8 de octubre, de 8:00 a 14:00."; "Suspensión de clases" / "El viernes 10 de octubre no hay clases por consejo técnico. Las tareas con fecha límite ese día se mueven al lunes."
- Diagnóstico: título "Diagnóstico de conexión", "API: ok", "Base de datos: ok", "Última respuesta: …", error: "No se pudo consultar /api/salud" + `codigo` + `mensaje`.

### Contenido exacto de los archivos que fijan decisiones

**`frontend/package.json`:**
```json
{
  "name": "@campus/frontend",
  "version": "0.0.0",
  "private": true,
  "description": "SPA de CMEP Campus Digital (React + Vite)",
  "type": "module",
  "scripts": {
    "shared:build": "npm --prefix ../shared run build",
    "predev": "npm run shared:build",
    "dev": "vite --host 127.0.0.1 --port 5173",
    "prebuild": "npm run shared:build",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1 --port 4173",
    "typecheck": "tsc -b",
    "prelint": "npm run shared:build",
    "lint": "eslint --config ../eslint.config.mjs . && prettier --check . --ignore-path ../.prettierignore && npm run typecheck",
    "format": "prettier --write . --ignore-path ../.prettierignore",
    "pretest": "npm run shared:build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": { "...": "tabla Dependencias" },
  "devDependencies": { "...": "tabla Dependencias" }
}
```

**`frontend/tsconfig.json`:** `{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }`.

**`frontend/tsconfig.app.json`:**
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "noEmit": true,
    "useDefineForClassFields": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```
Hereda `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `isolatedModules`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `target: ES2022`. `types` sustituye (no mezcla) a `["node"]` del base: el código del navegador no ve tipos de Node. `sourceMap` del base es inocuo con `noEmit`. Las pruebas (`*.test.tsx`) y `test/setup.ts` están dentro de `src`, así que `tsc -b` las comprueba; los matchers de jest-dom se tipan porque el setup importa `@testing-library/jest-dom/vitest` **[verificar; si `toBeInTheDocument` no tipa, añadir `"types": ["vite/client", "@testing-library/jest-dom/vitest"]`]**.

**`frontend/tsconfig.node.json`:**
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"],
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```
**[verificar]** que `tsc -b` acepta proyectos referenciados sin `composite` cuando la raíz tiene `files: []` (patrón de la plantilla oficial de Vite). Si `tsc -b` emitiera TS6306, añadir `"composite": true` a los dos proyectos y reportar.

**`frontend/vite.config.ts`:**
```ts
import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// El proxy solo existe en desarrollo: en prod la API vive en api.<dominio> (VITE_API_URL).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: false } },
  },
  build: { outDir: "dist" },
})
```
`strictPort: true` para que un 5173 ocupado falle en lugar de saltar al 5174 (regla de procesos ajenos: detenerse y preguntar). `changeOrigin: false` conserva `Host: 127.0.0.1:5173`; la API no lo valida hoy y así la cookie de refresco futura (`Path=/api/auth`) se verá del mismo origen en desarrollo.

**`frontend/vitest.config.ts`:**
```ts
import { defineConfig, mergeConfig } from "vitest/config"

import viteConfig from "./vite.config"

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: false,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
    },
  }),
)
```
**[verificar]** que `mergeConfig` se exporta de `vitest/config` en 4.1.11; si no, `import { mergeConfig } from "vite"`.

**`frontend/components.json`** (esperado; el programador lo confirma con `add --help` y, si hace falta, DEC-03):
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/styles/index.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
}
```
`baseColor` es obligatorio para el CLI pero irrelevante: sus variables no se usan (DEC-02). Si shadcn 4 exige otra clave (`style` con otro nombre, `registries`) **[verificar]**, se añade lo mínimo y se reporta.

**`frontend/src/styles/index.css`:**
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "./tokens.css";

@layer base {
  * { @apply border-border; }
  html { @apply bg-background text-foreground; font-family: var(--font-sans); font-size: 16px; line-height: 1.5; }
  h1, h2, h3 { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.01em; }
  code, kbd { font-family: var(--font-mono); }
  *:focus-visible { @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background; }
}
```
(`@import "tw-animate-css"` solo si DEC-04 confirma que `dialog.tsx` usa sus clases.) **[verificar]** que `@theme inline` dentro de `tokens.css` importado surte efecto (Tailwind 4 procesa `@import` por su cuenta); si no, mover el bloque `@theme inline` a `index.css` justo debajo de los imports y dejar los `:root` en `tokens.css`.

**`frontend/src/styles/tokens.css`:**
```css
/*
  Tokens de diseño de CMEP Campus Digital. Solo modo claro.
  Los NOMBRES son definitivos (CLAUDE.md). Los VALORES son provisionales y neutros:
  se sustituyen al elegir la dirección visual. No copiar estos valores a ningún componente.
*/
:root {
  --background: oklch(0.985 0 0);
  --surface: oklch(1 0 0);
  --foreground: oklch(0.2 0 0);
  --muted: oklch(0.955 0 0);
  --muted-foreground: oklch(0.45 0 0);
  --border: oklch(0.89 0 0);
  --primary: oklch(0.3 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --accent: oklch(0.5 0.1 250);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.55 0.2 27);
  --destructive-foreground: oklch(0.985 0 0);
  --success: oklch(0.55 0.15 150);
  --warning: oklch(0.7 0.15 75);
  --danger: oklch(0.55 0.2 27);

  /* Derivados que shadcn espera; siempre apuntan a un token propio. */
  --card: var(--surface);
  --card-foreground: var(--foreground);
  --popover: var(--surface);
  --popover-foreground: var(--foreground);
  --secondary: var(--muted);
  --secondary-foreground: var(--foreground);
  --input: var(--border);
  --ring: var(--accent);
  --radius: 0.5rem;

  /* Familias provisionales (sistema). Las definitivas llegan con la dirección visual. */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-heading: var(--font-sans);
  --font-mono: ui-monospace, "Cascadia Mono", Consolas, monospace;
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-mono);
}
```
Tailwind 4 añade por defecto su paleta (`bg-zinc-500`, `bg-white`…) además de la nuestra. No se desactiva en este encargo (`--color-*: initial` rompería `bg-white`/`text-black` que el código generado pudiera traer antes de adaptarlo); la disciplina la impone V-17 (grep) y la revisión del Manager. Anular la paleta por defecto queda como mejora anotada.

**`frontend/src/components/ui/button-variants.ts`** (extraído del `button.tsx` generado; el resto del archivo generado se conserva):
```ts
import { cva } from "class-variance-authority"

// Variante por defecto "outline" y acción principal "primary" (CLAUDE.md > Componentes).
export const buttonVariants = cva("<clases base generadas por shadcn, sin colores por defecto>", {
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border border-border bg-surface hover:bg-muted",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      ghost: "hover:bg-muted",
      link: "text-accent underline-offset-4 hover:underline",
    },
    size: { "<las generadas>": "" },
  },
  defaultVariants: { variant: "outline", size: "default" },
})
```
`button.tsx` importa `buttonVariants` y `type VariantProps`, exporta solo `Button`. En `input.tsx`, `card.tsx`, `dialog.tsx`: sustituir `bg-white`, `text-black`, `bg-black/…` (overlay) y cualquier `dark:` por tokens (`bg-card`, `text-card-foreground`, `bg-foreground/50` para el overlay del diálogo, `border-input`, `ring-ring`). El `Dialog` queda disponible para las confirmaciones destructivas del PRD; ninguna vista lo usa aún.

**`frontend/src/services/apiClient.ts`:**
```ts
import { errorApiSchema } from "@campus/shared"

import { obtenerToken } from "./authService"

export class ApiError extends Error {
  readonly codigo: string
  readonly estado: number
  constructor(codigo: string, mensaje: string, estado: number) {
    super(mensaje)
    this.name = "ApiError"
    this.codigo = codigo
    this.estado = estado
  }
}

export const esApiError = (error: unknown): error is ApiError => error instanceof ApiError

interface Esquema<T> { parse: (dato: unknown) => T }

export interface OpcionesApi<T> {
  schema: Esquema<T>
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  signal?: AbortSignal
}

// Vacío = mismo origen (proxy de Vite en desarrollo). En prod apunta a api.<dominio>.
const baseUrl = import.meta.env.VITE_API_URL ?? ""

const leerJson = async (respuesta: Response): Promise<unknown> => {
  try { return await respuesta.json() } catch { return undefined }
}

// Punto de extensión (CLAUDE.md > Casos especiales): aquí, y no en cada vista, se tratarán
// 401 → refresco silencioso con authService.refrescar y reintento único;
// 403 ACCESO_RESTRINGIDO → pantalla de acceso restringido;
// 403 CAMBIO_DE_CONTRASENA_REQUERIDO → pantalla de cambio de contraseña.
// Llegan con el encargo de autenticación (carril sensible).
export const api = async <T>(ruta: string, opciones: OpcionesApi<T>): Promise<T> => {
  const headers = new Headers({ Accept: "application/json" })
  const token = obtenerToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (opciones.body !== undefined) headers.set("Content-Type", "application/json")

  let respuesta: Response
  try {
    respuesta = await fetch(`${baseUrl}${ruta}`, {
      method: opciones.method ?? "GET",
      headers,
      credentials: "include",
      ...(opciones.body !== undefined ? { body: JSON.stringify(opciones.body) } : {}),
      ...(opciones.signal ? { signal: opciones.signal } : {}),
    })
  } catch {
    throw new ApiError("SIN_CONEXION", "No pudimos conectar con el servidor.", 0)
  }

  const cuerpo = respuesta.status === 204 ? undefined : await leerJson(respuesta)

  if (!respuesta.ok) {
    const error = errorApiSchema.safeParse(cuerpo)
    if (error.success) throw new ApiError(error.data.error.codigo, error.data.error.mensaje, respuesta.status)
    throw new ApiError("RESPUESTA_INVALIDA", "La respuesta del servidor no tiene el formato esperado.", respuesta.status)
  }

  try {
    return opciones.schema.parse(cuerpo)
  } catch {
    throw new ApiError("RESPUESTA_INVALIDA", "La respuesta del servidor no tiene el formato esperado.", respuesta.status)
  }
}
```
Los `...( ? {} : {})` existen por `exactOptionalPropertyTypes`: no se pasa `body: undefined` ni `signal: undefined`. Los `throw` son legítimos: `services/` solo se consume desde hooks de TanStack Query. Único `fetch` del frontend (V-18).

**`frontend/src/services/authService.ts`:**
```ts
// Token de acceso SOLO en memoria (ESSENTIALS > Autenticación; AGENTS.md regla 13). Nunca en
// localStorage ni sessionStorage. Se pierde al recargar: el refresco silencioso (cookie HttpOnly,
// POST /api/auth/refrescar) lo repone. login / refrescar / logout llegan con el encargo de
// autenticación (carril sensible); no se dejan esqueletos que rechacen para que nadie los llame.
let tokenDeAcceso: string | undefined

export const obtenerToken = (): string | undefined => tokenDeAcceso
export const establecerToken = (token: string): void => { tokenDeAcceso = token }
export const limpiarToken = (): void => { tokenDeAcceso = undefined }
export const haySesion = (): boolean => tokenDeAcceso !== undefined
```

**`frontend/src/app/router.tsx`:**
```ts
import { createBrowserRouter, Navigate, type RouteObject } from "react-router"

import { RequireRol } from "./require-rol"
import { RequireSesion } from "./require-sesion"
import { ContenedorRol } from "@/components/layout/contenedor-rol"
import { LayoutPublico } from "@/components/layout/layout-publico"
import { LoginView } from "@/features/auth/login-view"
import { DiagnosticoView } from "@/features/diagnostico/diagnostico-view"

export const rutas: RouteObject[] = [
  { path: "/", element: <Navigate to="/login" replace /> },
  {
    element: <LayoutPublico />,
    children: [
      { path: "/login", element: <LoginView /> },
      { path: "/diagnostico", element: <DiagnosticoView /> },
    ],
  },
  {
    element: <RequireSesion />,
    children: [
      { path: "/estudiante", element: <RequireRol rol="estudiante" />, children: [{ index: true, element: <ContenedorRol rol="estudiante" /> }] },
      { path: "/maestro", element: <RequireRol rol="maestro" />, children: [{ index: true, element: <ContenedorRol rol="maestro" /> }] },
      { path: "/admin", element: <RequireRol rol="admin" />, children: [{ index: true, element: <ContenedorRol rol="admin" /> }] },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]

export const router = createBrowserRouter(rutas)
```
(Archivo `.tsx`; el bloque de importaciones respeta el orden del resto del repositorio: paquetes, luego relativos/alias.)

**`eslint.config.mjs`** (añadir; nada se quita ni se rebaja):
```js
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
```
```js
// Regla 9 de CLAUDE.md: un módulo de features/ no importa de otro módulo.
const otroModulo = (regex) => ({
  regex,
  message: "Un módulo de features/ no importa de otro módulo; lo compartido sube a components/, lib/ o services/ y entra por @/ (CLAUDE.md, regla 9).",
})
```
```js
  {
    basePath: raiz,
    files: ["frontend/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    basePath: raiz,
    files: ["frontend/src/features/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { paths: soloEnAdapters, patterns: [otroModulo("^@/features/")] }] },
  },
  {
    basePath: raiz,
    files: ["frontend/src/features/*/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { paths: soloEnAdapters, patterns: [otroModulo("^@/features/"), otroModulo("^\\.\\.")] }] },
  },
  {
    basePath: raiz,
    files: ["frontend/src/features/*/components/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { paths: soloEnAdapters, patterns: [otroModulo("^@/features/"), otroModulo("^\\.\\./\\.\\.")] }] },
  },
```
**[verificar]** los nombres exactos: `reactHooks.configs.flat.recommended` (7.x expone `configs.flat.recommended` y `configs["recommended-latest"]`) y `reactRefresh.configs.vite` (0.4+). Si `configs.vite` fija `only-export-components` en `warn`, se sube a `error` con `allowConstantExport: true` en el primer bloque. Los bloques de `features/` **sustituyen** (no mezclan) las opciones de `no-restricted-imports` del bloque global, por eso repiten `paths: soloEnAdapters`. El bloque global `files: ["**/*.{ts,mts,cts,js,mjs,cjs}"]` no incluye `tsx`; el primer bloque nuevo no necesita `no-restricted-imports` porque en el frontend nadie importa infraestructura del backend (los tres bloques de `features/` sí la repiten por coherencia). `no-console: "error"` ya aplica a todo. `ignores` global: `**/dist/**` ya cubre `frontend/dist`; se añade `frontend/node_modules/.tmp/**` solo si ESLint lo alcanzara (no debería: `**/node_modules/**`).

### Documentación: `README.md`, sección nueva al final
```markdown
## Frontend en local (Windows + PowerShell)

Arranca la SPA (Vite) contra la API local. Los comandos están escritos para Windows PowerShell 5.1; cada paso indica desde qué carpeta se ejecuta.

### 1. Requisitos

Node 24 LTS y npm 11 (sección "Backend en local", paso 1), dependencias instaladas con `npm install` desde la raíz (paso 2 de esa sección) y, para que la vista de diagnóstico responda, la API corriendo en `http://127.0.0.1:3000` (paso 5 de esa sección).

### 2. Configurar (opcional)

Desde la raíz:

```powershell
Set-Location frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`frontend/.env` no se versiona y hoy solo tiene `VITE_API_URL`, vacía por defecto: el frontend habla con `/api` en su mismo origen y, en desarrollo, Vite reenvía `/api` a `http://127.0.0.1:3000`. No hace falta crear el archivo para trabajar en local.

### 3. Arrancar

Desde `frontend`:

```powershell
npm run dev
```

Abre `http://127.0.0.1:5173/login` (pantalla de acceso, todavía sin envío) y `http://127.0.0.1:5173/diagnostico` (consulta `GET /api/salud` y muestra el estado de la API y de la base de datos). Usa `127.0.0.1`, no `localhost`. El servidor recompila al guardar; detenlo con Ctrl+C.

### 4. Comprobar, probar y compilar

Desde `frontend` (o desde la raíz para los tres workspaces):

```powershell
npm run lint
npm test
npm run build
```

`lint` corre ESLint, Prettier y `tsc -b`; `test` corre Vitest con jsdom (no necesita la API ni infra); `build` deja la SPA en `frontend/dist/`. Los scripts `dev`, `build`, `lint` y `test` compilan antes `shared/` (`shared/dist`), como en el backend.

### 5. Problemas frecuentes

- **Puerto 5173 ocupado** (`Port 5173 is already in use`). Vite no salta a otro puerto a propósito. Diagnostica con `Get-NetTCPConnection -LocalPort 5173 -State Listen` y cierra el proceso que lo usa si es tuyo.
- **La vista de diagnóstico muestra un error** (`RESPUESTA_INVALIDA`, `SIN_CONEXION` o un 5xx). La API no está corriendo en `127.0.0.1:3000`: arráncala con `npm run dev` desde `backend` (sección anterior, paso 5). Si muestra `BASE_DE_DATOS_NO_DISPONIBLE`, la API responde pero PostgreSQL no: revisa infra.
- **`Cannot find module '@campus/shared'` o tipos que faltan de `@campus/shared`.** No existe `shared/dist`: ejecuta `npm run build` desde `shared` (los scripts del frontend lo hacen solos; a mano solo tras un `npm install` limpio).
- **`tsc -b` falla en `node_modules/.tmp`.** Borra `frontend/node_modules/.tmp` (solo contiene información incremental de TypeScript) y repite.
```

### Propuesta para `AGENTS.md` (la aplica el orquestador; el programador no toca `AGENTS.md`)
Bloque "Frontend (desde /frontend)" de "Comandos", sustituir por:
```bash
# Frontend (desde /frontend)
if (-not (Test-Path .env)) { Copy-Item .env.example .env }   # opcional: solo VITE_API_URL, vacía por defecto
npm run dev          # SPA en http://127.0.0.1:5173 con proxy de /api hacia la API local (127.0.0.1:3000)
npm run build        # tsc -b + vite build → frontend/dist
npm run lint         # ESLint + Prettier + tsc -b
npm run test         # Vitest con jsdom; no necesita la API ni infra
```
Ningún otro comando de `AGENTS.md` cambia.

## Cambios por capa
### shared/
Sin cambios. Se consume `saludRespuestaSchema`, `errorApiSchema`, `SaludRespuesta`, `ErrorApi` desde `@campus/shared` (`shared/dist`, `exports` ya definidos, ESM). Nota: `shared/package.json` no declara `types` fuera de `exports`; con `moduleResolution: Bundler` se respeta `exports`, así que resuelve **[verificar en V-08]**.
### backend/core/, adapters/, handlers/, workers/, prisma/
Sin cambios. `GET /api/salud` se consume tal cual; el formato de error `{ error: { codigo, mensaje } }` de `handlers/errores.ts` es el que traduce `apiClient`.
### infra/ y .env.example
`infra/` no cambia. Nuevo `frontend/.env.example` con `VITE_API_URL=` (P-04). Sin secretos: ninguna variable `VITE_*` puede contener uno (regla 9; se documenta en el comentario del archivo).
### frontend/features/<modulo>/
`auth` (completo según la estructura) y `diagnostico` (mínimo: `types.ts`, `hooks.ts`, `diagnostico-view.tsx`; sin `data.ts`/`lib.ts`/`components/` porque no tiene qué poner en ellos; la estructura fija los nombres, no obliga a archivos vacíos).

## Acceso a datos
Ninguna consulta propia. Una lectura HTTP: `GET /api/salud` (sin parámetros, sin paginación, sin sesión), con `staleTime` 30 s y `retry: false` en el hook de diagnóstico (un 503 no debe reintentarse tres veces mientras el humano mira la pantalla).

## Autorización
No hay endpoints nuevos ni datos de usuario. `/diagnostico` es pública porque `/api/salud` lo es (ESSENTIALS "Operación"); no revela más que la API (`ok`/`503`). Las guardas `RequireSesion`/`RequireRol` son esqueleto: redirigen a `/login` porque no existe sesión; la seguridad real seguirá en la cadena de middleware del backend. Ningún estado de pago, rol ni bandera se lee en el frontend en este encargo.

## Pruebas requeridas
| Archivo | Casos |
|---|---|
| `src/features/auth/lib.test.ts` | 2 (`ordenarAnuncios` ordena; no muta) |
| `src/features/auth/login-view.test.tsx` | 3 (título; controles y enlaces por rol accesible; el envío no navega) |
| `src/app/router.test.tsx` | 2 (`/` → `/login`; `/maestro` sin sesión → `/login`) |
| `src/features/diagnostico/diagnostico-view.test.tsx` | 2 (datos; error 503 con `role="alert"` y código) |
| `src/services/apiClient.test.ts` | 3 (error tipado; cuerpo inválido; `Authorization` + `credentials`) |
| `src/lib/format.test.ts` | 1 |

Frontend: **6 archivos / 13 pruebas**. `npm test` desde la raíz: `shared` no tiene script `test` (`--if-present` lo salta), backend 6 / 24, frontend 6 / 13 → **12 archivos / 37 pruebas** en total (backend requiere infra y `backend/.env`; frontend no). Ninguna prueba llama a la red: `fetch` se sustituye con `vi.stubGlobal` y se restaura en `afterEach` (`vi.unstubAllGlobals()`).

## Puntos de ataque para el Tester
No aplica (flujo sin Tester). **Puntos de revisión para el Manager (modo final)**, además de `lint`, `test`, `build` desde la raíz y la prueba de humo (V-13/V-14) ejecutados por él:
- Diseño (`CLAUDE.md`): ningún color, tamaño, radio o sombra suelto fuera de `tokens.css` (V-17); solo componentes de `components/ui/` para botón, input, tarjeta y diálogo; `Button` con `variant="primary"` únicamente en "Iniciar sesión" y `outline` por defecto; sin `.dark`, sin `dark:`, sin `@custom-variant dark`; sin degradados morado-azul ni glassmorphism (`backdrop-blur`, `bg-gradient-to-*` con violet/indigo/purple → grep); estado nunca solo con color (`MensajeError`, `Cargando` y la tarjeta de diagnóstico llevan texto e icono); densidad por rol en `ContenedorRol`; textos en español de México, tuteo, sin "potencia/desbloquea/optimiza/sin fricciones" (grep) y sin emojis (grep de rangos Unicode de emoji en `src/`); orden error → cargando → (vacío) → datos en `DiagnosticoView`; `login-view` a 360 px sin desbordamiento horizontal (comprobación manual con las herramientas del navegador o `document.documentElement.scrollWidth <= 360` en una prueba de jsdom no es fiable: manual); foco visible (`focus-visible:ring`) en inputs, botón y enlaces; `label htmlFor` en los dos campos (RNF-08).
- Reglas: ningún `localStorage`/`sessionStorage` (V-16); un solo `fetch` (V-18); ningún tipo de API declarado a mano (solo `Anuncio` y `Rol`, ambos de interfaz y comentados); ningún módulo importa de otro (ESLint V-19); ningún componente con `try/catch` que lance; ningún `?? []`; sin `any`; sin ternarios anidados en JSX; sin `else` anidados.
- Dependencias: `npm ls react react-dom vitest vite zod globals eslint` una sola versión de cada uno; ninguna fuera de la tabla; nada de AWS/LiveKit/FullCalendar; `shadcn` no instalado como dependencia; `frontend/package-lock.json` y `frontend/node_modules` inexistentes.
- Alcance de más: otras vistas, `EstadoVacio` y compañía, lógica de login, cambios en `backend/`, `shared/`, `infra/`, `tsconfig.base.json`, `.prettierignore`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE*.md` (todos con `git diff --quiet` a 0).
- `frontend/.env.example` sin valores reales; `frontend/.env` (si el programador lo creó) ignorado y no leído.
- LF en todo lo nuevo (`git ls-files --eol`), incluidos `components.json` y los archivos generados por el CLI.

## Riesgos y desacuerdos
- **R-01. CLI de shadcn (red, interactividad, escritura).** `add` descarga desde el registro de shadcn; puede pedir confirmación (banderas `--yes`/`--overwrite` **[verificar]**), instalar dependencias por su cuenta, tocar `package.json` o crear un lock anidado en `frontend/`. Mitigación: dependencias instaladas antes (DEC-03), versión fijada `@4.21.0`, `git status` inmediato (V-06), regla de "Qué autoriza" para lo que cree. Si `add` no funciona sin `init`, el camino del scratchpad (DEC-03). Si tampoco, el programador se detiene y reporta; **no** copia componentes de memoria sin decirlo.
- **R-02. `exactOptionalPropertyTypes`/`verbatimModuleSyntax` con el código generado y `radix-ui`.** Errores típicos: pasar `className={undefined}`, `import { VariantProps }` sin `type`, props opcionales explícitamente `undefined`. Mitigación: corregir en nuestras copias con `import type`, spreads condicionales o `?? ""` cuando el valor vacío sea válido; nunca `any`, nunca relajar `tsconfig`. Si un error viene de los `.d.ts` de `radix-ui` (no de nuestro código), `skipLibCheck` ya lo cubre; si aun así bloquea, detenerse y reportar.
- **R-03. React Router 7 vs 8** (P-01). Con 7, riesgo bajo; el único [verificar] es el origen de `RouterProvider` (`react-router/dom` o `react-router`).
- **R-04. Dos versiones de `vitest` o `globals`.** Ambas se evitan fijando `^4.1.11` y dejando `globals ^16.5.0`; V-04 (`npm ls`) lo confirma. Si un plugin de ESLint exigiera `globals@17`, se reporta (no se instala una segunda copia sin decisión).
- **R-05. jsdom 30 con React 19.3 / Testing Library 16.** Peers declarados compatibles; si `act` avisa por entorno, añadir `globalThis.IS_REACT_ACT_ENVIRONMENT = true` en `test/setup.ts` (Testing Library ya lo hace) y reportar.
- **R-06. Proxy y `changeOrigin: false`.** La API no valida `Host`; si el encargo de auth necesitara `changeOrigin: true` por la cookie, se cambia entonces. `strictPort` hace visible un puerto ocupado.
- **R-07. Windows.** `taskkill //PID <pid> //T //F` en Git Bash; Vite arrancado con `npx vite` deja un solo proceso `node`; rutas con `\` en salidas; PowerShell 5.1 sin `&&` (el README lo respeta con comandos en líneas separadas).
- **R-08. `npx` sin versión fijada descargaría `latest`.** Siempre `npx shadcn@4.21.0`. `npx vite`, `npx vitest`, `npx tsc`, `npx eslint`, `npx prettier` resuelven el binario instalado en el repositorio (existe en `node_modules/.bin`), así que no descargan.
- **R-09. Formateadores.** Solo `npx prettier --write . --ignore-path ../.prettierignore` desde `frontend/` y, desde la raíz, solo `npx prettier --write eslint.config.mjs README.md package.json`. Nunca `npm run format` en la raíz. Sin `eslint --fix` fuera de `frontend/`.
- **R-10. Hooks `pre*` que construyen `shared`.** `npm run lint` desde la raíz compilará `shared` tres veces (shared no, backend y frontend sí); lento pero seguro (patrón heredado de BACK-02, P-02). Vitest de `frontend` no necesita `prisma generate`.
- **R-11. Paleta por defecto de Tailwind sigue disponible.** Alguien podrá escribir `bg-zinc-100`; lo vigilan V-17 y la revisión, no el compilador. Anular la paleta (`--color-*: initial` en `@theme`) se propone como mejora cuando los componentes generados estén adaptados.
- **R-12. `@theme inline` en un archivo importado.** Si Tailwind no lo procesa, el bloque se mueve a `index.css` (C-01, DEC-02) y se reporta.
- **R-13. `tsc -b` sin `composite`.** Si TS6306, `composite: true` en los dos proyectos (DEC-12) y reportar.
- **R-14. `only-export-components` sobre archivos de shadcn o `router.tsx`.** Cubierto por `button-variants.ts` (DEC-04); `router.tsx` exporta solo no-componentes (permitido). Si otro archivo generado mezcla exportaciones, se separa igual; no se desactiva la regla.
- **R-15. Ocupación de 5173 o 3000 por un proceso ajeno.** Detenerse y preguntar (regla de `AGENTS.md`). Ningún cambio de puerto ni `taskkill` sobre PID ajenos.
- **R-16. Versiones publicadas después del 2026-09-22.** Regla de V-02: parche/menor dentro del mismo mayor se adopta y reporta; cambio de mayor o par insatisfecho → parada.
- **Desacuerdos con ESSENTIALS:** ninguno. Se respeta el stack literal (React + Vite + TS, Tailwind con tokens propios, shadcn reestilizado, lucide, sonner, React Router, TanStack Query), el token solo en memoria, el formato de error y la estructura de módulos.

## Verificaciones (el programador las ejecuta y reporta una por una, con salida real)
| # | Verificación | Resultado esperado |
|---|---|---|
| V-01 | `node --version`; `npm --version`; `git status --short`; en `infra/`: `docker compose ps`; `powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173,3000 -State Listen"` | `v24.x`, `11.x`; árbol limpio; `postgres` healthy; **ningún** proceso escuchando en 5173 ni 3000 (si lo hay: detenerse y preguntar) |
| V-02 | Comprobación de versiones (sección "Comprobación previa") con `npm view … version`, `npm view … peerDependencies`, `ultima react-router 7`, `ultima @testing-library/dom 10` | Versiones de la tabla (o mayores dentro del mismo mayor, reportadas); pares satisfechos; parada si cambia un mayor |
| V-03 | Editar `frontend/package.json` y `package.json` (raíz); `npm install` desde la raíz | Código 0, sin `ERESOLVE`/`UNMET PEER`; solo `package.json`, `frontend/package.json` y `package-lock.json` modificados |
| V-04 | `npm ls react react-dom vite vitest zod globals eslint @tanstack/react-query react-router tailwindcss`; `npm audit` (solo lectura); `ls node_modules/.bin | grep -E "^(vite|vitest|tsc|shadcn)$"` | Una versión de cada uno, sin `invalid`; conteo de `audit` reportado; `vite`, `vitest`, `tsc` presentes; `shadcn` **ausente** |
| V-05 | Crear `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `components.json`, `index.html`, `src/styles/*`, `src/lib/utils.ts`, `src/vite-env.d.ts`; `npx shadcn@4.21.0 add --help` (copiar banderas al resumen) | Banderas confirmadas; archivos previos listos para el CLI |
| V-06 | `npx shadcn@4.21.0 add button input card dialog` desde `frontend/` (banderas de V-05); `git status --short --untracked-files=all`; `ls frontend/node_modules frontend/package-lock.json 2>&1`; `head -20 src/components/ui/dialog.tsx`; `grep -n "from \"radix-ui\"\|@radix-ui/" src/components/ui/*.tsx`; `grep -c "animate-in\|fade-in" src/components/ui/dialog.tsx` | 4 archivos en `src/components/ui/`; `src/styles/index.css`, `frontend/package.json` sin cambios (si cambian: reportar y revertir a mano lo no autorizado); sin lock ni `node_modules` anidados (si existen: borrarlos y `npm install` en la raíz, reportar); origen de Radix y uso de `tw-animate-css` anotados |
| V-07 | Adaptar los 4 componentes (DEC-04) y crear el resto de `src/` (tabla "Archivos"); `grep -rn "bg-white\|text-black\|bg-black\|dark:\|zinc-\|slate-\|gray-\|neutral-" src/` | Cero coincidencias |
| V-08 | `npm run typecheck` desde `frontend/` | Código 0. Si falla en `node_modules/react-router` o `radix-ui` `.d.ts` pese a `skipLibCheck`: detenerse y reportar. Si falla en código propio: corregir sin `any` |
| V-09 | `npx prettier --write . --ignore-path ../.prettierignore` desde `frontend/`; `npx prettier --write eslint.config.mjs README.md package.json` desde la raíz; `npm run lint` desde la raíz | Código 0 en los tres workspaces: ESLint sin errores ni avisos, "All matched files use Prettier code style!", `tsc -b` limpio en frontend |
| V-10 | `npm test` desde la raíz (salida a `<scratchpad>/test.log`); `grep -c "Test Files" <scratchpad>/test.log` | Backend `6 passed (6)` / `24 passed (24)`; frontend `6 passed (6)` / `13 passed (13)`; código 0; termina solo |
| V-11 | `npm run build` desde la raíz; `ls frontend/dist frontend/dist/assets`; `grep -c 'id="root"' frontend/dist/index.html`; `grep -l "localStorage\|sessionStorage" frontend/dist/assets/*.js` | `frontend/dist/index.html` con `#root`, un `.js` y un `.css` en `assets/`; **cero** archivos del bundle propio con `localStorage`/`sessionStorage` (si un archivo lo contiene, `grep -o` con contexto para confirmar que viene de una dependencia y reportarlo; no de `src/`) |
| V-12 | `du -sh frontend/dist`; tamaño del `.js` principal reportado | Informativo (línea base para el futuro) |
| V-13 | Prueba de humo. Desde `backend/`: `npm run build` (si `dist/` no está al día) y `node --env-file-if-exists=.env dist/server.js > <scratchpad>/api.log 2>&1 & echo $!` (anotar PID; también aparece como `"pid"` en el log); desde `frontend/`: `npx vite --host 127.0.0.1 --port 5173 > <scratchpad>/vite.log 2>&1 & echo $!`; `sleep 5`; `curl.exe -s http://127.0.0.1:5173/login | grep -c 'id="root"'`; `curl.exe -s -i http://127.0.0.1:5173/api/salud`; `curl.exe -s -i http://127.0.0.1:5173/api/no-existe`; después `taskkill //PID <pid-vite> //T //F` y `taskkill //PID <pid-api> //T //F` (**solo esos dos PID, arrancados por el programador**); `powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173,3000 -State Listen"` | `1`; `200` con `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"…Z"}` a través del proxy; `404` `NO_ENCONTRADO` a través del proxy; ambos puertos libres al final; `vite.log` sin errores |
| V-14 | Con la API **apagada**: `npx vite --host 127.0.0.1 --port 5173 …` (PID propio); `curl.exe -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/api/salud`; `grep -i "proxy error\|ECONNREFUSED" <scratchpad>/vite.log | head -3`; detener Vite por PID | Un `5xx` (típicamente `500`) y el aviso de proxy en el log: es el camino que la prueba unitaria (2) de `diagnostico-view.test.tsx` cubre como `RESPUESTA_INVALIDA`/error. La comprobación visual de `/diagnostico` en error y en datos queda para el humano o el Manager (reportar como no ejecutada si no hay navegador) |
| V-15 | `npm run dev` con PowerShell, patrón de BACK-02 V-15: `powershell.exe -NoProfile -Command "$p = Start-Process npm.cmd -ArgumentList 'run','dev' -WorkingDirectory '<ruta>\frontend' -PassThru -WindowStyle Hidden -RedirectStandardOutput <scratchpad>\dev.log -RedirectStandardError <scratchpad>\dev.err; Start-Sleep 12; Get-Content <scratchpad>\dev.log -Tail 8; taskkill /PID $p.Id /T /F"`; durante la espera, `curl.exe -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/login` | Log con `Local: http://127.0.0.1:5173/`; `200`; árbol terminado; puerto libre |
| V-16 | `grep -rn "localStorage\|sessionStorage" frontend/src frontend/index.html` | Cero coincidencias (ni en comentarios: el comentario de `authService` dice "localStorage" — **excepción única y esperada**, reportar la línea) |
| V-17 | `grep -rnE "#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(|hsl\(" frontend/src --include=*.tsx --include=*.ts --include=*.css | grep -v "src/styles/tokens.css"`; `grep -rn "font-size\|px\]" frontend/src --include=*.tsx` | Cero colores fuera de `tokens.css`; ningún tamaño arbitrario en componentes (las utilidades de Tailwind de espaciado sí están permitidas) |
| V-18 | `grep -rn "fetch(" frontend/src --include=*.ts --include=*.tsx | grep -v "\.test\."` | Solo `frontend/src/services/apiClient.ts` |
| V-19 | Crear temporalmente `frontend/src/features/diagnostico/prueba.ts` con `import "@/features/auth/lib"` y `frontend/src/features/auth/prueba.ts` con `import "../diagnostico/hooks"`; `npx eslint --config ../eslint.config.mjs .` desde `frontend/`; borrar ambos; repetir ESLint | Falla con el mensaje de la regla 9 en los dos; código 0 tras borrarlos |
| V-20 | `git status --short --untracked-files=all`; `git check-ignore -v frontend/dist frontend/node_modules/.tmp frontend/.env`; `git check-ignore frontend/.env.example frontend/components.json; echo $?`; `git diff --quiet -- backend shared infra tsconfig.base.json .prettierrc.json .prettierignore .gitignore .gitattributes AGENTS.md CLAUDE.md .claude docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md; echo $?` | Exactamente los archivos de la tabla; `dist`, `.tmp`, `.env` ignorados; `.env.example` y `components.json` **no** ignorados (`1`); `0` en las rutas protegidas |
| V-21 | `git ls-files --eol -- package.json package-lock.json eslint.config.mjs README.md frontend/package.json`; `git ls-files --eol --others --exclude-standard -- frontend docs/trabajo/FRONT-01-esqueleto-frontend` | Todo `w/lf` (incluidos `components.json` y los `.tsx` generados por el CLI; si el CLI escribió CRLF, Prettier de V-09 ya lo normalizó por `endOfLine: lf`) |
| V-22 | Comandos del README "Frontend en local" §2 (copia con guarda), §3 y §4 ejecutados en `powershell.exe -NoProfile` tal cual (§3 con el patrón de V-15) | Cada uno con su salida; los no ejecutados declarados |

Al terminar: ningún proceso propio vivo (`Get-NetTCPConnection` vacío en 5173 y 3000); infra como estaba; `backend/.env`, `infra/.env` no leídos; `frontend/.env` (si se creó) ignorado; archivos temporales borrados; sin commit.

## Pasos de implementación
1. V-01. Si Node no es 24.x, el árbol no está limpio o hay un proceso ajeno en 5173/3000: detenerse y preguntar.
2. V-02. Sin las salidas de `npm view` registradas no se edita ningún archivo.
3. Editar `frontend/package.json` (scripts y dependencias de la tabla) y `package.json` de la raíz (dos plugins). V-03, V-04.
4. Crear `frontend/index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `components.json`, `.env.example`, `src/vite-env.d.ts`, `src/styles/index.css`, `src/styles/tokens.css`, `src/lib/utils.ts`. V-05.
5. V-06 (`shadcn add`). Si `add` falla o exige `init`: DEC-03 (scratchpad) o parada con reporte.
6. Adaptar `components/ui/*` (DEC-04: `button-variants.ts`, `primary`/`outline`, tokens, `import type`). V-07.
7. Crear `services/` (`apiClient.ts`, `authService.ts`, `liveService.ts`), `lib/format.ts`, `components/mensaje-error.tsx`, `components/cargando.tsx`, `components/layout/*`.
8. Crear `features/auth/*` y `features/diagnostico/*`; `app/router.tsx`, `app/providers.tsx`, `app/require-sesion.tsx`, `app/require-rol.tsx`; `src/main.tsx`; `src/test/setup.ts`.
9. V-08 (`typecheck`). Corregir código propio; si el bloqueo viene de `.d.ts` de terceros, detenerse y reportar.
10. Editar `eslint.config.mjs` (importaciones, `otroModulo`, cuatro bloques). Crear las 6 pruebas. V-09 (Prettier acotado + `npm run lint` desde la raíz).
11. V-10 (`npm test`), V-11, V-12 (`build`).
12. V-13, V-14, V-15 (humo; solo PID propios).
13. V-16, V-17, V-18, V-19 (reglas por grep y ESLint).
14. Escribir la sección del `README.md`. V-22.
15. V-20, V-21.
16. Entregar `docs/trabajo/FRONT-01-esqueleto-frontend/resumen-programador.md` con: salidas de V-02; tabla de versiones finales (paquete, rango, instalada); banderas reales de `shadcn add` y lista literal de lo que el CLI creó o tocó; cada punto **[verificar]** con lo encontrado (origen de `RouterProvider`, `radix-ui` vs `@radix-ui/*`, `tw-animate-css`, `mergeConfig`, `composite`, `@theme inline` importado, tipos de jest-dom, claves de `components.json`, nombres de las configs de los plugins de ESLint, nivel de `only-export-components`); resultado de V-01 a V-22 uno por uno; desviaciones; conteo de `npm audit`; lo que no se pudo verificar (por ejemplo, la comprobación visual a 360 px); lista literal de archivos creados y modificados; texto final propuesto para `AGENTS.md` si cambió respecto a este plan.

## Notas para DOCS-01 y encargos posteriores (no se aplican aquí)
1. `CLAUDE.md` "Ubicaciones compartidas": añadir `styles/index.css` (entrada de Tailwind) junto a `styles/tokens.css` (C-01), y mencionar `components/mensaje-error.tsx` y `components/cargando.tsx` como piezas compartidas.
2. `features/diagnostico/` se retira o se mueve a `admin` cuando exista el dashboard institucional (P-02).
3. Encargo de autenticación (sensible): `authService.login/refrescar/logout`, los tres casos especiales de `apiClient`, `RequireRol` leyendo `GET /me`, y decidir `changeOrigin` del proxy si la cookie lo requiere.
4. Encargo de despliegue: `VITE_API_URL=https://api.<dominio>` en Cloudflare Pages, `_redirects` para la SPA, CORS con credenciales en la API.
5. Dirección visual: sustituir los valores de `tokens.css`, familias tipográficas (`--font-heading`), favicon en `public/`, y anular la paleta por defecto de Tailwind (R-11).
6. `chore` aparte: Vitest 5 en backend y frontend; React Router 8 cuando se conozcan los cambios; `globals` 17.
7. Regla 9 en ESLint: hoy cubre `@/features/*` y `..` desde el primer nivel; si aparecen subcarpetas nuevas dentro de un módulo (por ejemplo `features/x/hooks/`), ampliar los patrones.
