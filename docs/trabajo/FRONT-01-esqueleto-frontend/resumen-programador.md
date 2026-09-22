# Resumen del Programador — FRONT-01: esqueleto del frontend (`@campus/frontend`)

Fecha: 2026-09-22
Plan: `docs/trabajo/FRONT-01-esqueleto-frontend/plan.md` (estado LISTO, carril normal con aprobación escrita)
Aprobación: `docs/trabajo/FRONT-01-esqueleto-frontend/aprobacion.md` (P-01 a P-05 con sus valores por defecto)

```
Plan: docs/trabajo/FRONT-01-esqueleto-frontend/plan.md
Pasos completados: 16 de 16
Archivos creados / modificados: 49 creados (48 en frontend/ + este resumen), 5 modificados (package.json, package-lock.json, eslint.config.mjs, README.md, frontend/package.json); lista literal al final. Ningún archivo versionado borrado
Verificación: lint ok (3 workspaces) · test 37 pasan, 0 fallan (backend 6 archivos / 24, frontend 6 archivos / 13) · build ok (shared, backend, frontend) · prisma validate n/a (no se tocó el esquema)
Hallazgos atendidos: n/a (primera ronda; sin Tester en este flujo)
Desviaciones del plan: 5 acotadas y previstas por el propio plan (D-01 a D-05) + ajustes menores anotados; detalle abajo
Pendiente o fuera de alcance detectado: ver sección final
```

## 1. Versiones finales (V-02 / V-04)

Comprobación previa con `npm view <paquete> version`, `npm view <paquete>@<v> peerDependencies` y la función `ultima` reproducida en el scratchpad (mismo filtro y orden que en BACK-02). Todas las versiones de la tabla del plan siguen siendo las últimas de su mayor, salvo `@testing-library/dom` (última 10.x = 10.4.2, adoptada y reportada). Últimas de otro mayor, **no** adoptadas por decisión del plan: `react-router` 8.4.0 (P-01), `vitest` 5.0.1 (P-03), `@types/node` 26.6.2 (el plan fija la del backend, `ultima @types/node 24` = 24.13.6).

| Paquete | Dónde | Rango | Instalada | Comando |
|---|---|---|---|---|
| react, react-dom | frontend deps | ^19.3.0 | 19.3.0 | `npm view react version` |
| react-router | frontend deps | ^7.18.4 | 7.18.4 | `npm view react-router versions --json \| node ultima.cjs 7` → 7.18.4 |
| @tanstack/react-query | frontend deps | ^5.103.2 | 5.103.2 | `npm view` |
| @campus/shared | frontend deps | * | 0.0.0 (workspace) | — |
| lucide-react | frontend deps | ^1.47.0 | 1.47.0 | `npm view` |
| sonner | frontend deps | ^2.0.8 | 2.0.8 | `npm view` |
| class-variance-authority | frontend deps | ^0.7.1 | 0.7.1 | `npm view` |
| clsx / tailwind-merge | frontend deps | ^2.1.1 / ^3.7.0 | 2.1.1 / 3.7.0 | `npm view` |
| radix-ui | frontend deps | ^1.6.7 | 1.6.7 | `npm view`; `ultima radix-ui 1` → 1.6.7 |
| tw-animate-css | frontend deps | ^1.4.0 | 1.4.0 | `npm view` |
| vite | frontend devDeps | ^8.3.0 | 8.3.0 | `npm view`; engines `^20.19.0 \|\| >=22.12.0` |
| @vitejs/plugin-react | frontend devDeps | ^6.1.1 | 6.1.1 | peer `vite ^8.0.0`; los otros tres peers son opcionales (`peerDependenciesMeta`) |
| tailwindcss, @tailwindcss/vite | frontend devDeps | ^4.3.3 | 4.3.3 | peer de `@tailwindcss/vite`: `vite ^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8` |
| @types/react, @types/react-dom | frontend devDeps | ^19.3.0 | 19.3.0 | `npm view` |
| @types/node | frontend devDeps | ^24.13.6 | 24.13.6 | `ultima @types/node 24` → 24.13.6 |
| vitest | frontend devDeps | ^4.1.11 | 4.1.11 | peer `vite ^6 \|\| ^7 \|\| ^8`; `jsdom` y `@types/node` opcionales |
| jsdom | frontend devDeps | ^30.1.1 | 30.1.1 | peer `canvas` opcional |
| @testing-library/react | frontend devDeps | ^16.3.3 | 16.3.3 | peers `react ^18 \|\| ^19`, `@testing-library/dom ^10` |
| @testing-library/dom | frontend devDeps | **^10.4.2** (plan: ^10.4.1) | 10.4.2 | `ultima @testing-library/dom 10` → 10.4.2 |
| @testing-library/jest-dom | frontend devDeps | ^7.0.1 | 7.0.1 | peers `vitest >= 0.32`, `@testing-library/dom >=10 <11` |
| eslint-plugin-react-hooks | raíz devDeps | ^7.1.1 | 7.1.1 | peer `eslint` incluye `^10.0.0` |
| eslint-plugin-react-refresh | raíz devDeps | ^0.5.7 | 0.5.7 | peer `eslint ^9 \|\| ^10` |

`shadcn` no se instaló (ausente de `node_modules/.bin`); siempre `npx shadcn@4.21.0`. No se instaló `cn` (ver D-02) ni ningún `@radix-ui/*` suelto.

## 2. Puntos [verificar] del plan

| Punto | Resultado |
|---|---|
| Banderas de `shadcn add` | `-y, --yes` · `-o, --overwrite` · `-c, --cwd` · `-a, --all` · `-p, --path` · `-s, --silent` · `--dry-run` · `--diff [path]` · `--view [path]`. Usé `--dry-run -y` y `--dry-run --view -y` para ver el contenido antes de escribir, y `-y` para el `add` real |
| `init --help` (no ejecutado en el repo) | `-t/--template` (next, start, vite, react-router, laravel, astro), `-b/--base` (base, radix, aria), `-p/--preset`, `-d/--defaults` (= `--template=next --preset=base-nova`), `--css-variables`, `--rtl`, `--pointer`, `--reinstall`. No hizo falta el camino alternativo de DEC-03 |
| Claves de `components.json` | El esquema de 4.21.0 (`rawConfigSchema`, `.strict()`) admite exactamente: `$schema?`, `style`, `rsc`, `tsx`, `tailwind{config?, css, baseColor, cssVariables, prefix?}`, `iconLibrary?`, `rtl?`, `menuColor?`, `menuAccent?`, `aliases{components, utils, ui?, lib?, hooks?}`, `registries?`. El del plan es válido tal cual. Con Tailwind v4 detectado, el CLI ignora `style` y descarga `styles/new-york-v4/<item>.json` |
| `add` sin `init` con `components.json` manual | Funciona. No reescribió `src/styles/index.css`, `tokens.css` ni `components.json` (copias previas comparadas con `diff`). Sí tocó `frontend/package.json` (añadió `"cn": "^0.4.0"`) y `package-lock.json` (instaló `cn` en la raíz; npm detectó el workspace: no creó lock ni `node_modules` anidados). Y escribió los archivos en `frontend/@/components/ui/` (carpeta literal `@`) porque solo lee `paths` de `tsconfig.json`, no del `tsconfig.app.json` referenciado. Ver D-02 y D-03 |
| `radix-ui` vs `@radix-ui/*` | Confirmado `radix-ui`: `button.tsx` → `import { Slot } from "radix-ui"`, `dialog.tsx` → `import { Dialog as DialogPrimitive } from "radix-ui"`. Sin `@radix-ui/*`; la excepción acotada no aplica |
| `tw-animate-css` en `dialog.tsx` | Confirmado: 2 líneas con `animate-in`/`fade-in-0` (más `animate-out`, `fade-out-0`, `zoom-in-95`, `zoom-out-95`). Se conserva la dependencia y `@import "tw-animate-css"` en `index.css`. `shadcn/tailwind.css` (nuevo en 4.x) no define esas utilidades ni se usa |
| Origen de `RouterProvider` | `exports` de react-router 7.18.4 tiene `./dom` y `RouterProvider` existe ahí. **Ajustado**: se importa desde `react-router` (la alternativa que DEC-08 preveía) porque en Vitest `react-router/dom` produce doble instancia. Ver D-01 |
| `mergeConfig` en `vitest/config` | Confirmado (`export { ..., mergeConfig }` en `vitest/dist/config.d.ts`) |
| Configs de ESLint | `reactHooks.configs.flat.recommended` existe (junto a `configs["recommended-latest"]` y `configs.flat["recommended-latest"]`); incluye las reglas del compilador de React (`set-state-in-effect`, `refs`, `purity`, ...) en `error` y `exhaustive-deps` en `warn`. `reactRefresh.configs.vite` existe y ya fija `only-export-components` en `error` con `{ allowConstantExport: true, allowCompoundComponents: true }`: no hubo que subirla |
| `composite` en `tsc -b` | No hizo falta: `tsc -b` con `tsconfig.json` (`files: []` + `references`) pasó sin TS6306 |
| `@theme inline` dentro de `tokens.css` importado | Surte efecto: `vite build` genera las utilidades `bg-background`, `text-muted-foreground`, `border-border`, `text-success`, etc. (CSS de 25 kB con ellas) y el login se renderiza con los tokens. No hubo que mover el bloque |
| Tipado de jest-dom sin `globals` | `toBeInTheDocument`/`toHaveAttribute`/`toHaveTextContent` tipan con solo `import "@testing-library/jest-dom/vitest"` en `test/setup.ts`; no se añadió nada a `types` |
| `ImportMetaEnv` en Vite 8 | `vite/types/importMeta.d.ts` sigue declarando `interface ImportMetaEnv` e `interface ImportMeta` globales; la ampliación de `vite-env.d.ts` tipa `import.meta.env.VITE_API_URL` como `string \| undefined` |
| `@campus/shared` con `moduleResolution: Bundler` | Resuelve por `exports` a `shared/dist/index.d.ts`; `tsc -b`, Vitest y `vite build` lo consumen sin configuración extra |
| Formato `es-MX` de `Intl` | **Ajustado**: `timeStyle: "short"` en `es-MX` da `"2:42 p.m."` (12 h) en el ICU 77.1 de Node 24; la prueba del plan exige `"14:42"`, así que `formatearFechaHora` añade `hourCycle: "h23"` (24 h, el formato de los textos del PRD). Ver D-04 |

## 3. Qué hizo exactamente `shadcn add` (V-06)

1. `npx shadcn@4.21.0 add button input card dialog --dry-run -y` desde `frontend/`: "Files (4) +4 new" en `@\components\ui\{button,input,card,dialog}.tsx`; "Dependencies (2): cn, radix-ui".
2. `npx shadcn@4.21.0 add button input card dialog -y` (real): "Installing dependencies... Created 4 files". `git status --short --untracked-files=all` inmediatamente después: `M frontend/package.json` (línea nueva `"cn": "^0.4.0"`), `M package-lock.json` (nuevo respecto al estado previo a `add`: entrada de `cn`), y nuevos `frontend/@/components/ui/{button,card,dialog,input}.tsx`. Sin cambios en `src/styles/index.css`, `src/styles/tokens.css` ni `components.json` (verificado con `diff` contra copias previas). `frontend/package-lock.json` inexistente; `frontend/node_modules` sin cambios (solo `@vitejs`, que ya había creado el `npm install` de la raíz, ver §7).
3. Remedio aplicado según "Qué autoriza" y V-06: `mv` de los 4 archivos a `frontend/src/components/ui/`, `rmdir` de `frontend/@/components/ui`, `frontend/@/components` y `frontend/@` (artefacto creado por el CLI en este encargo); eliminación de `"cn"` de `frontend/package.json` (queda idéntico al previo, verificado con `diff`); `npm install` desde la raíz (código 0): `node_modules/cn` desaparece y `package-lock.json` no contiene `cn` (`grep` en cero). `npm ls --depth=0` sin `invalid`/`extraneous`/`missing`.
4. Contenido generado (antes de adaptar): los cuatro importan `{ cn } from "cn"` (paquete npm 0.4.0, "drop-in replacement for clsx + tailwind-merge"), `import * as React from "react"`, `Slot`/`Dialog` de `radix-ui`, `XIcon` de `lucide-react`. Traían `dark:*` (7 usos), `text-white` (destructive), `bg-black/50` (overlay), `bg-background` en el contenido del diálogo, `focus-visible:ring-[3px]`, `variant: "default"` con `defaultVariants.variant = "default"`, `export { Button, buttonVariants }` y textos "Close".

## 4. Adaptaciones a los componentes generados (DEC-04)

- `button-variants.ts` nuevo con `cva` extraído; `button.tsx` exporta solo `Button` (importa `buttonVariants` y `type VariantProps`).
- Variantes: `default` → `primary` (`bg-primary text-primary-foreground hover:bg-primary/90`); `outline` = `border border-border bg-surface hover:bg-muted` y es el valor por defecto (`defaultVariants` y el destructuring `variant = "outline"`); `destructive` = `bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20`; `ghost` = `hover:bg-muted`; `link` = `text-accent underline-offset-4 hover:underline`; `secondary` y todos los tamaños (`default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`) conservados.
- `import { cn } from "cn"` → `import { cn } from "@/lib/utils"` en los cuatro; `import * as React` → `import type { ComponentProps } from "react"` (verbatimModuleSyntax).
- Sin `dark:*`, `text-white` ni `bg-black`: overlay `bg-foreground/50`; contenido del diálogo `bg-card text-card-foreground`.
- `focus-visible:ring-[3px]` → `focus-visible:ring-2` en botón e input (coherente con el foco global de `index.css`; V-17 no admite tamaños arbitrarios en `px`).
- Centrado del `DialogContent`: `top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]` → `inset-0 m-auto h-fit` (misma posición centrada; el patrón `slate-` del grep V-07 casa con `translate-`, ver §5 V-07).
- Textos "Close" → "Cerrar" (`sr-only` del botón de cierre y botón opcional del pie).
- Los cuatro archivos se reescribieron con LF (Prettier también los normaliza).

## 5. Verificaciones V-01 a V-22 (salida real)

| # | Resultado |
|---|---|
| V-01 | `node --version` → `v24.11.1`; `npm --version` → `11.6.2`; `git status --short` → solo `?? docs/trabajo/FRONT-01-esqueleto-frontend/`; `docker compose ps` → `campus-dev-postgres-1`, `campus-dev-minio-1`, `campus-dev-livekit-1` "Up 2 hours (healthy)"; `Get-NetTCPConnection -LocalPort 5173,3000 -State Listen` → "no encontró objetos MSFT_NetTCPConnection" (ambos libres) |
| V-02 | Ver §1. Todas las versiones de la tabla confirmadas; `@testing-library/dom` 10.4.1 → 10.4.2 (misma mayor, adoptada); ningún par insatisfecho; ninguna parada |
| V-03 | `npm install` desde la raíz: código 0, "added 404 packages, and audited 751 packages in 1m", 0 `ERESOLVE`/`UNMET PEER`. **Avisos `EBADENGINE`** (no errores) de transitivas de jsdom: `jsdom@30.1.1`, `@asamuzakjp/css-color@7.0.1`, `@asamuzakjp/dom-selector@9.2.1`, `w3c-xmlserializer@6.0.0` piden `node ^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` y tenemos 24.11.1; las pruebas con jsdom pasan igual (V-10). `git status`: `M frontend/package.json`, `M package-lock.json`, `M package.json`. npm creó además `frontend/node_modules/@vitejs/plugin-react` (anidamiento de workspaces, ver §7) |
| V-04 | `npm ls react react-dom vite vitest zod globals eslint @tanstack/react-query react-router tailwindcss` → una sola versión de cada uno (19.3.0, 19.3.0, 8.3.0, 4.1.11, 4.6.5, 16.5.0, 10.11.0, 5.103.2, 7.18.4, 4.3.3), sin `invalid`. `npm audit` → **4 high**, las mismas de BACK-02 (`deepmerge-ts` vía `prisma → @prisma/config`; `mysql2` vía `prisma`), "fix" propuesto degradar a `prisma@6.19.3`: no aplicado. `ls node_modules/.bin`: `tsc`, `vite`, `vitest` presentes; `shadcn` ausente |
| V-05 | Archivos previos creados; banderas y esquema en §2 |
| V-06 | Ver §3. `head -20 src/components/ui/dialog.tsx` (generado): `import { cn } from "cn"` / `import { XIcon } from "lucide-react"` / `import { Dialog as DialogPrimitive } from "radix-ui"` / `import { Button } from "@/components/ui/button"`; `grep 'from "radix-ui"\|@radix-ui/'` → `button.tsx:4`, `dialog.tsx:4`, ningún `@radix-ui/`; `grep -c "animate-in\|fade-in" dialog.tsx` → 2 |
| V-07 | `grep -rn "bg-white\|text-black\|bg-black\|dark:\|zinc-\|slate-\|gray-\|neutral-" src/` → **0**. Nota: tuvo dos falsos positivos intermedios que corregí: un comentario mío con "dark:" y `slate-` dentro de `translate-x-...` (el patrón del plan casa con cualquier `translate-*` de Tailwind); el diálogo se centra ahora con `inset-0 m-auto h-fit` |
| V-08 | `npm run typecheck` desde `frontend/` → código 0 a la primera (con pruebas incluidas); sin errores de `.d.ts` de terceros |
| V-09 | `npx prettier --write src vite.config.ts vitest.config.ts components.json index.html --ignore-path ../.prettierignore` desde `frontend/` (alcance indicado por el orquestador, más estrecho que el `.` del plan): reformateó `contenedor-rol.tsx`, `auth/data.ts`, `diagnostico-view.test.tsx`, `apiClient.test.ts`; `npx prettier --write eslint.config.mjs` desde la raíz → "unchanged"; `npx prettier --check . --ignore-path ../.prettierignore` en `frontend/` → "All matched files use Prettier code style!"; `npm run lint` desde la raíz → código 0: shared (ESLint + Prettier ok), backend (ESLint + Prettier + `tsc --noEmit` ok), frontend (ESLint sin errores ni avisos + Prettier ok + `tsc -b` ok) |
| V-10 | `npm test` desde la raíz → código 0; `grep -c "Test Files"` → 2; backend `Test Files 6 passed (6)` / `Tests 24 passed (24)` (1.85 s); frontend `Test Files 6 passed (6)` / `Tests 13 passed (13)` (6.60 s). Termina solo |
| V-11 | `npm run build` desde la raíz → código 0 (shared, backend, frontend). `frontend/dist/index.html` (405 B, `id="root"` ×1), `dist/assets/` con un `.css` y un `.js`. `grep -l "localStorage\|sessionStorage" dist/assets/*.js` → 1 archivo: el bundle; contexto con `grep -o`: `e.sessionStorage.getItem(Tt)` / `e.sessionStorage.setItem(Tt, ...)`, código de **react-router** (`chunk-OB3PAWPO.mjs`, restauración de estado de transiciones); no procede de `src/` (V-16). Aviso informativo de Vite: chunk > 500 kB |
| V-12 | `du -sh frontend/dist` → 525K. Build de la raíz: `index-*.js` 505.44 kB (gzip 155.08 kB), `index-*.css` 25.13 kB (gzip 5.49 kB). Tras el último ajuste del diálogo se regeneró con `npx vite build`: `index-wwKQPmE9.js` 505,444 B, `index-B3wrTV_g.css` 24,640 B, `index.html` 405 B (total 525K) |
| V-13 | Puertos libres antes. API: `node --env-file-if-exists=.env dist/server.js` desde `backend/` (log: `"pid":21576`, "Server listening at http://127.0.0.1:3000"); Vite: `npx vite --host 127.0.0.1 --port 5173 --strictPort` (PID Windows 25984, `Get-NetTCPConnection`; `vite.log`: "VITE v8.3.0 ready in 828 ms", "Local: http://127.0.0.1:5173/", 0 errores). `curl.exe -s http://127.0.0.1:5173/login \| grep -c 'id="root"'` → **1**; `curl.exe -s -i http://127.0.0.1:5173/api/salud` → **HTTP/1.1 200 OK** `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-22T16:35:47.184Z"}`; `/api/no-existe` → **404** `{"error":{"codigo":"NO_ENCONTRADO","mensaje":"La ruta no existe."}}`. Detenidos con `taskkill //PID 25984 //T //F` y `taskkill //PID 21576 //T //F` (solo esos dos; identidad confirmada por hora de inicio y línea de comandos con `Get-CimInstance`). Nota: `$!` de Git Bash devuelve PID de MSYS (1034/1035) que `taskkill` no conoce; los PID de Windows salen del log (`"pid"`) y de `Get-NetTCPConnection`. Después: ambos puertos libres, ningún `node` con `vite` o `dist/server` vivo |
| V-14 | Con la API apagada, Vite (PID Windows 18652): `curl.exe -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/api/salud` → **502**; `vite-v14.log`: "[vite] http proxy error: /api/salud" / "Error: connect ECONNREFUSED 127.0.0.1:3000". `taskkill //PID 18652 //T //F` → terminado; 5173 libre. La comprobación visual de `/diagnostico` en error y en datos **no se ejecutó** (sin navegador) |
| V-15 | `Start-Process npm.cmd -ArgumentList 'run','dev' -WorkingDirectory ...\frontend -PassThru -WindowStyle Hidden -RedirectStandardOutput dev.log -RedirectStandardError dev.err` (PID 6316); `curl.exe /login` → **200** a los 2 s; `dev.log`: "> vite --host 127.0.0.1 --port 5173", "VITE v8.3.0 ready in 744 ms", "Local: http://127.0.0.1:5173/"; `dev.err` vacío; `taskkill /PID 6316 /T /F` terminó el árbol (14200, 3040, 15344, 5496, 6316); 5173 libre |
| V-16 | `grep -rn "localStorage\|sessionStorage" frontend/src frontend/index.html` → **1** coincidencia, la excepción prevista: `frontend/src/services/authService.ts:2` (comentario "// localStorage ni sessionStorage. ...") |
| V-17 | Colores fuera de `tokens.css` (`#hex`, `oklch(`, `rgb(`, `hsl(`) → **0**; `font-size\|px\]` en `.tsx` → **0** |
| V-18 | `grep -rn "fetch(" frontend/src --include=*.ts --include=*.tsx \| grep -v .test.` → solo `frontend/src/services/apiClient.ts:56` |
| V-19 | Con `features/diagnostico/prueba.ts` (`import "@/features/auth/lib"`) y `features/auth/prueba.ts` (`import "../diagnostico/hooks"`): `npx eslint --config ../eslint.config.mjs .` → código 1, "✖ 2 problems (2 errors, 0 warnings)", ambos `no-restricted-imports` con el mensaje de la regla 9; tras borrarlos → código 0 |
| V-20 | `git status --short --untracked-files=all` → 5 modificados (`README.md`, `eslint.config.mjs`, `frontend/package.json`, `package-lock.json`, `package.json`) + 48 nuevos en `frontend/` (53 en total, más `docs/trabajo/FRONT-01-esqueleto-frontend/{plan,aprobacion,resumen-programador}.md`); `git check-ignore -v` → `frontend/dist` (`.gitignore:2:dist/`), `frontend/node_modules/.tmp` (`.gitignore:1:node_modules/`), `frontend/.env` (`.gitignore:4:.env`); `git check-ignore frontend/.env.example frontend/components.json; echo $?` → **1** (no ignorados); `git diff --quiet -- backend shared infra tsconfig.base.json .prettierrc.json .prettierignore .gitignore .gitattributes AGENTS.md CLAUDE.md .claude docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md; echo $?` → **0**; sin archivos nuevos en esas rutas |
| V-21 | `git ls-files --eol -- package.json package-lock.json eslint.config.mjs README.md frontend/package.json` → todos `i/lf w/lf attr/text=auto eol=lf`; `git ls-files --eol --others --exclude-standard -- frontend docs/trabajo/FRONT-01-esqueleto-frontend` → 50 archivos, todos `w/lf`, ninguno `w/crlf` |
| V-22 | §2 en `powershell.exe -NoProfile`: `Set-Location frontend; if (-not (Test-Path .env)) { Copy-Item .env.example .env }` → `Test-Path .env` = True; `frontend/.env` ignorado (`.gitignore:4:.env`) y no leído. §3 = V-15 (`npm run dev` vía `Start-Process`). §4 desde `frontend/` en PowerShell: `npm run lint` → exit 0; `npm test` → exit 0 (`6 passed (6)` / `13 passed (13)`); `npm run build` → exit 0 ("✓ built in 1.13s") |

Al terminar: `Get-NetTCPConnection` vacío en 5173 y 3000; ningún `node` propio vivo; infra igual que al inicio (3 servicios healthy, no se ejecutó `docker compose down`); `backend/.env` e `infra/.env` no leídos; temporales del scratchpad borrados (queda `prisma-versions.json`, de BACK-02, que no es mío); `frontend/.env` creado por V-22 §2 (ignorado). Sin commit.

## 6. Conteos de pruebas

| Paquete | Archivos | Pruebas |
|---|---|---|
| shared | — (sin script `test`, `--if-present` lo salta) | — |
| backend | 6 | 24 |
| frontend | 6 | 13 |
| **Total (`npm test` desde la raíz)** | **12** | **37** |

Frontend por archivo: `lib/format.test.ts` 1 · `features/auth/lib.test.ts` 2 · `features/auth/login-view.test.tsx` 3 · `app/router.test.tsx` 2 · `features/diagnostico/diagnostico-view.test.tsx` 2 · `services/apiClient.test.ts` 3.

## 7. Desviaciones del plan (todas previstas por el plan como alternativa o remedio; ninguna cambia el alcance)

- **D-01. `RouterProvider` desde `react-router`, no desde `react-router/dom`** (`main.tsx`, `router.test.tsx`, `login-view.test.tsx`). `react-router/dom` existe, pero en Vitest las 5 pruebas de rutas y login fallaban con "`<Navigate>` may be used only in the context of a `<Router>`". Causa comprobada: Vitest resuelve `react-router` y `react-router/dom` a sus builds CommonJS (`index.js`, `dom-export.js`, condición `default` bajo `node`), y `dom-export.js` hace `require('react-router')`, que Node 24 resuelve por la condición `module-sync` al `index.mjs` ESM; así `RouterProvider` (contexto del chunk ESM) y `Navigate`/`Link` (chunk CJS `chunk-GR4NQCSD.js`) usan contextos distintos (`UNSAFE_LocationContext` no idéntico, verificado con una prueba temporal borrada). `server.deps.inline: ["react-router"]` en un config temporal no lo resolvió. Importar `RouterProvider` desde `react-router` (la alternativa que DEC-08 contempla) deja una sola entrada y una sola instancia en cualquier cargador; en el navegador ambas entradas comparten chunk, así que el comportamiento de la app no cambia (la variante `/dom` solo añade `flushSync` para transiciones de vista, que no se usan). Con esto las 13 pruebas pasan. Queda anotado para el encargo que quiera `react-router/dom`: haría falta forzar condiciones ESM en Vitest.
- **D-02. Paquete `cn` rechazado.** shadcn 4.21.0 genera `import { cn } from "cn"` y el CLI añadió `cn@^0.4.0` a `frontend/package.json` e instaló el paquete. `cn` no está en la tabla de dependencias y el plan fija `clsx` + `tailwind-merge` con `lib/utils.ts`; revertí `frontend/package.json` a mano, `npm install` desde la raíz (lock sin `cn`) y las importaciones apuntan a `@/lib/utils` (regla V-06: "reportar y revertir a mano lo no autorizado").
- **D-03. Carpeta `frontend/@/` creada por el CLI.** El CLI no resuelve el alias `@/` porque `paths` vive en `tsconfig.app.json` (DEC-12) y él solo lee `tsconfig.json`; escribió los 4 archivos en `frontend/@/components/ui/`. Los moví a `frontend/src/components/ui/` (contenido idéntico) y borré la carpeta `@` (artefacto del CLI durante este encargo, borrado autorizado). Para futuros `add` conviene decidir si `tsconfig.json` debe declarar `paths` o si se repite el movimiento a mano.
- **D-04. `hourCycle: "h23"` en `formatearFechaHora`.** El `Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" })` literal del plan produce `"22 sep 2026, 2:42 p.m."`; la prueba del plan exige `"14:42"`. Añadí `hourCycle: "h23"` (`"22 sep 2026, 14:42"`), coherente con los textos del PRD en 24 h.
- **D-05. Alcance de Prettier más estrecho que el del plan**, por instrucción del orquestador: desde `frontend/` solo `src`, `vite.config.ts`, `vitest.config.ts`, `components.json`, `index.html` con `--ignore-path ../.prettierignore`; desde la raíz solo `eslint.config.mjs`. Ni `npm run format`, ni `prettier --write .`, ni `eslint --fix`. `prettier --check .` en `frontend/` confirma que todo el paquete (incluidos `package.json` y `tsconfig*.json`, escritos a mano) cumple el estilo.

Ajustes menores que no considero desviaciones y anoto:
- `DiagnosticoView` usa `isPending` en lugar de `isLoading` para que TypeScript estreche `data` a `SaludRespuesta` tras las guardas de error y carga (con `isLoading`, `data` seguía siendo `T | undefined`); el orden error → cargando → datos se mantiene.
- `RequireRol({ rol })` hace `void rol` con comentario: `@typescript-eslint/no-unused-vars` (recommended) marca el parámetro sin usar y el plan pide conservar la prop en la firma.
- `FormularioLogin` lleva `aria-label="Iniciar sesión"` para que la prueba (3) encuentre el `<form>` por rol accesible (un `form` sin nombre no expone el rol).
- `PanelAnuncios` y `LoginView` usan `CardDescription` y `h1` propio dentro de `CardHeader` (el `CardTitle` de shadcn 4 es un `div`).
- Los textos "Diagnóstico de conexión", "API: ok", etc. van como texto JSX en la vista (el plan no prevé `data.ts` en `diagnostico`).
- `.env.example` incluye una segunda línea de comentario recordando que ninguna `VITE_*` puede contener un secreto (regla 9), como pide "Cambios por capa".
- Uso de `--dry-run`/`--view` de `shadcn add` antes del `add` real (banderas confirmadas por `add --help`).
- `frontend/node_modules/@vitejs/plugin-react` lo creó el `npm install` de la raíz (10:01, antes de shadcn) por el anidamiento normal de npm workspaces; `npm explain` lo muestra como dependencia directa del workspace y `npm ls` da una sola versión (6.1.1). No lo borré porque la regla del plan solo autoriza borrar lo creado por el CLI de shadcn; el Manager lo verá en su comprobación de "`frontend/node_modules` inexistente". Además contiene `.tmp` (tsbuildinfo de `tsc -b`, previsto) y `.vite`/`.vite-temp` (caché del servidor de desarrollo), todo ignorado por `node_modules/`.

## 8. No verificado

- Comprobación visual de `/login` a 360 px (desbordamiento horizontal), del foco visible y de `/diagnostico` en estado de error y de datos en un navegador: sin navegador en esta sesión. `curl` confirma HTML con `#root` y el proxy en 200/404/502; las pruebas de jsdom cubren el render.
- Comportamiento del `Dialog` en pantalla (no lo usa ninguna vista; solo compila y pasa V-07/V-17).
- Que el aviso `EBADENGINE` de jsdom no tenga efectos más allá de las 13 pruebas que pasan.
- `frontend/.env` con `VITE_API_URL` no vacía (solo se probó vacía = proxy).

## 9. Archivos

Creados (48 en `frontend/` + este resumen):
`frontend/.env.example`, `frontend/components.json`, `frontend/index.html`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/vitest.config.ts`,
`frontend/src/main.tsx`, `frontend/src/vite-env.d.ts`,
`frontend/src/app/providers.tsx`, `frontend/src/app/require-rol.tsx`, `frontend/src/app/require-sesion.tsx`, `frontend/src/app/router.tsx`, `frontend/src/app/router.test.tsx`,
`frontend/src/components/cargando.tsx`, `frontend/src/components/mensaje-error.tsx`, `frontend/src/components/layout/contenedor-rol.tsx`, `frontend/src/components/layout/layout-publico.tsx`, `frontend/src/components/layout/types.ts`,
`frontend/src/components/ui/button-variants.ts`, `frontend/src/components/ui/button.tsx`, `frontend/src/components/ui/card.tsx`, `frontend/src/components/ui/dialog.tsx`, `frontend/src/components/ui/input.tsx`,
`frontend/src/features/auth/types.ts`, `frontend/src/features/auth/data.ts`, `frontend/src/features/auth/lib.ts`, `frontend/src/features/auth/lib.test.ts`, `frontend/src/features/auth/hooks.ts`, `frontend/src/features/auth/components/panel-anuncios.tsx`, `frontend/src/features/auth/components/formulario-login.tsx`, `frontend/src/features/auth/login-view.tsx`, `frontend/src/features/auth/login-view.test.tsx`,
`frontend/src/features/diagnostico/types.ts`, `frontend/src/features/diagnostico/hooks.ts`, `frontend/src/features/diagnostico/diagnostico-view.tsx`, `frontend/src/features/diagnostico/diagnostico-view.test.tsx`,
`frontend/src/lib/utils.ts`, `frontend/src/lib/format.ts`, `frontend/src/lib/format.test.ts`,
`frontend/src/services/apiClient.ts`, `frontend/src/services/apiClient.test.ts`, `frontend/src/services/authService.ts`, `frontend/src/services/liveService.ts`,
`frontend/src/styles/index.css`, `frontend/src/styles/tokens.css`, `frontend/src/test/setup.ts`,
`docs/trabajo/FRONT-01-esqueleto-frontend/resumen-programador.md`.

Modificados (5): `package.json` (dos devDeps), `package-lock.json` (npm), `eslint.config.mjs` (dos imports, `otroModulo`, cuatro bloques), `README.md` (sección "Frontend en local (Windows + PowerShell)" anexada al final, texto literal del plan), `frontend/package.json` (contenido exacto del plan con la tabla de dependencias; `@testing-library/dom` en `^10.4.2`).

Borrados: ninguno versionado. Temporales propios eliminados: `frontend/@/` (del CLI), `frontend/vitest.tmp.config.ts`, `frontend/src/__tmp/`, los dos `prueba.ts` de V-19 y los archivos del scratchpad.

## 10. Texto propuesto para `AGENTS.md`

Sin cambios respecto al plan (lo aplica el orquestador tras la revisión del Manager):

```bash
# Frontend (desde /frontend)
if (-not (Test-Path .env)) { Copy-Item .env.example .env }   # opcional: solo VITE_API_URL, vacía por defecto
npm run dev          # SPA en http://127.0.0.1:5173 con proxy de /api hacia la API local (127.0.0.1:3000)
npm run build        # tsc -b + vite build → frontend/dist
npm run lint         # ESLint + Prettier + tsc -b
npm run test         # Vitest con jsdom; no necesita la API ni infra
```

## 11. Pendiente o fuera de alcance detectado

1. Decidir cómo recuperar `react-router/dom` para `RouterProvider` (D-01): forzar condiciones ESM en Vitest o esperar a que react-router corrija su build CJS; mientras tanto `react-router` basta.
2. `paths` en `tsconfig.json` (o repetir el movimiento a mano) para que futuros `npx shadcn@4.21.0 add` escriban en `src/` (D-03); y contar con que el CLI añadirá `cn` cada vez (D-02).
3. El grep de V-07 debería excluir `translate-` (o usar `\bslate-`) para no confundir utilidades de transformación con la paleta `slate`.
4. `EBADENGINE`: jsdom 30.1.1 y tres transitivas piden Node `^24.15.0`; subir el Node del `.nvmrc`/Droplet cuando toque revisar la versión (hoy 24.11.1).
5. Bundle único de 505 kB (aviso de Vite): dividir por rutas con `React.lazy` cuando existan más módulos (línea base V-12).
6. Anular la paleta por defecto de Tailwind (R-11) y fijar valores definitivos de `tokens.css` con la dirección visual.
7. Notas para DOCS-01 del plan (C-01 `styles/index.css`, `components/mensaje-error.tsx` y `cargando.tsx` como piezas compartidas, `features/diagnostico/` temporal).
