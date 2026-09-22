# Resumen del Programador — DOCS-01: pendientes de documentación de INFRA-01, BACK-01, BACK-02 y FRONT-01

Fecha: 2026-09-22 · Carril: trivial ampliado (programador → manager en modo final), autorizado por el humano · Sin commit.

Alcance real tocado: `docs/ARCHITECTURE.md` y `docs/ARCHITECTURE-ESSENTIALS.md`. `docs/PRD.md` sin cambios. Ningún otro archivo del repositorio cambió. Cada afirmación nueva se contrastó con el estado real del repositorio (`infra/docker-compose.yml`, `infra/.env.example`, `backend/.env.example`, `frontend/.env.example`, `backend/prisma/schema.prisma`, `backend/prisma.config.ts`, `backend/src/adapters/db/cliente.ts`, `backend/src/config/env.ts`, `backend/package.json`, `backend/vitest.config.ts`, `backend/test/setup.ts`, `frontend/vitest.config.ts`, `frontend/vite.config.ts`, `frontend/components.json`, `frontend/src/styles/`, `package.json` raíz y el árbol de archivos), no con lo que decía un plan.

## 1. Lista de pendientes y veredicto

Origen entre paréntesis. Veredictos: **aplicado** / **descartado** / **pospuesto** / **orquestador** (cambio de `AGENTS.md` o `CLAUDE.md`, fuera de mi alcance).

| # | Origen | Pendiente | Veredicto | Dónde y qué |
|---|---|---|---|---|
| 1 | INFRA-01 C-01 | §4 "Contenedores" decía que `dev` levanta `api` y `worker` | **Aplicado** | `ARCHITECTURE.md` §4 "Contenedores": "Desarrollo (`infra/docker-compose.yml`, proyecto `campus-dev`): `postgres` · `minio` · `minio-init` (efímero: crea los buckets y termina) · `livekit` (modo dev). La API y el worker no van en contenedor en `dev`: corren en el anfitrión con `npm run dev` y `npm run dev:worker` desde `backend/`; el frontend, con `npm run dev` desde `frontend/`." |
| 2 | INFRA-01 C-02 | §11 "En `dev`, MinIO con los mismos buckets" | **Aplicado** | `ARCHITECTURE.md` §11, última viñeta: "En `dev`, MinIO (`infra/docker-compose.yml`) crea solo `campus-privado` (sin acceso anónimo) y `campus-publico` (lectura anónima); `campus-respaldos` existe solo en `prod`, en R2." También en `ESSENTIALS` "Archivos": "`campus-respaldos` (solo en `prod`; en `dev` MinIO crea únicamente los dos primeros)" |
| 3 | INFRA-01 C-03 | §4 usaba `infra/docker-compose.yml` para `prod` y `dev` | **Aplicado** | `ARCHITECTURE.md` §4 "Contenedores": el encabezado ya no fija un archivo; "Producción (`infra/docker-compose.prod.yml`, pendiente de escribir): `caddy` · `api` · `worker` · `postgres`." No se inventó el contenido del Compose de `prod` |
| 4 | INFRA-01 R-01 / Enmienda 1 | Riesgo: MinIO ya no se distribuye por Docker Hub; imágenes de `quay.io` sin mantenimiento; almacén de `dev` reemplazable | **Aplicado** | `ARCHITECTURE.md` §19 riesgo **10** nuevo ("Distribución de MinIO en desarrollo", con las dos etiquetas exactas, la aclaración de que `quay.io` no es proveedor y la mitigación por `STORAGE_*`); §11 remite a ese riesgo; §20 **D-23** nueva (decisión escrita del humano en INFRA-01). `ESSENTIALS` "Stack › Archivos": "(imágenes desde `quay.io`, sin mantenimiento; reemplazable por cualquier almacén S3 vía `STORAGE_*`)" |
| 5 | BACK-01 C-01 | Testcontainers en §2 y en `ESSENTIALS` "Stack" | **Aplicado** | `ARCHITECTURE.md` §2 fila "Pruebas": "Vitest. Backend: unitarias e integración contra el PostgreSQL de `infra/` (nunca una base compartida ni `prod`); Testcontainers pendiente. Frontend: jsdom + Testing Library · Playwright (hito 3)". `ESSENTIALS` "Stack › Pruebas": misma idea, añade "`DATABASE_URL` de `backend/.env`" y "Frontend: jsdom + Testing Library, sin API ni infra". La intención de Testcontainers se conserva como pendiente. La sección "Pruebas" de `AGENTS.md`: **orquestador** |
| 6 | BACK-01 P-05 | Comentario cruzado de `DATABASE_URL` en `infra/.env.example` | **Pospuesto** (configuración de `infra/`, fuera de este alcance) al próximo encargo que toque `infra/`. Lo que sí cabía aquí, **aplicado** | `ARCHITECTURE.md` §4 "Entornos", lista nueva de `.env` por paquete: "`backend/.env` (lo leen la API y el worker vía `config/env.ts`, y el CLI de Prisma vía `prisma.config.ts`): … `DATABASE_URL`, que debe coincidir con `POSTGRES_*` de `infra/.env`"; y en `infra/.env`: "más una copia de `DATABASE_URL`" (así está hoy en `infra/.env.example`) |
| 7 | BACK-02 C-01 | Lista de librerías de infraestructura desactualizada (Prisma 7) | **Aplicado** | `ARCHITECTURE.md` §5 "Regla de capas" y `ESSENTIALS` "Capas del backend", con la redacción de la regla 1 de `AGENTS.md`: "`@prisma/client`, `@prisma/adapter-pg`, `pg`, el cliente generado por Prisma (`adapters/db/generated/`, no versionado; lo produce `prisma generate`), `pg-boss`, `minio`, `resend`, `argon2`, `jose` o `livekit-server-sdk`". `ESSENTIALS`: viñeta nueva "`config/`: validación de las variables de entorno con zod y opciones del logger. No es `core/` ni `adapters/`." |
| 8 | BACK-02 C-02 + M-03 + V-20 | §18 paso 3 con Prisma 7 (era "§6" por error) | **Aplicado** | `ARCHITECTURE.md` §18, párrafo indentado bajo el paso 3, marcado "Pendiente para el encargo de despliegue, con Prisma 7": qué debe llevar la imagen o el contenedor de migración (`prisma.config.ts`, `schema.prisma`, `migrations/`, CLI `prisma` hoy devDependency), `DATABASE_URL` del entorno, `DATABASE_URL` de relleno para `prisma generate` en build (por `env()` ansiosa), y el lock con `prisma`/`mysql2`/`postgres`/`@prisma/dev`/`@prisma/studio-core` como `peer` que `npm ci --omit=dev` (incluso con `--omit=peer`) no excluye. La numeración 1–5 del procedimiento no cambió |
| 9 | BACK-02 M-01 (decisión del humano) | Alcance de "Sin AWS … ni librerías" en `ESSENTIALS` | **Aplicado** | `ESSENTIALS` "Proveedores", primera viñeta, con la frase literal de la regla 11 de `AGENTS.md`: "La regla aplica a servicios y a librerías que nuestro código importa o ejecuta; las dependencias transitivas de herramientas de desarrollo (por ejemplo, del CLI de Prisma) se reportan, pero no bloquean." |
| 10 | INFRA-01 revisión (opcional) | Nombres de variables confirmados; puerto 5432 en `dev` | **Aplicado** | `ARCHITECTURE.md` §4 "Entornos": la frase "Configuración en variables de entorno…" ahora sigue con una lista de tres viñetas (`infra/.env`, `backend/.env`, `frontend/.env`) con todas las variables que existen hoy en los tres `.env.example`: `POSTGRES_*` (`POSTGRES_PORT` 5433 por defecto en el anfitrión, 5432 dentro del contenedor), `STORAGE_ENDPOINT` como URL completa, `STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY`, `MINIO_API_PORT`/`MINIO_CONSOLE_PORT`, `LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` (`devkey`/`secret`), `NODE_ENV`/`HOST`/`PORT` (3000)/`LOG_LEVEL`/`DATABASE_URL`, `VITE_API_URL` (vacía = mismo origen vía proxy de Vite; `prod` `https://api.<dominio>`; ninguna `VITE_*` lleva secreto). Sin sección nueva. `ARCHITECTURE.md` no mencionaba el 5432 para desarrollo: nada que corregir |
| 11 | BACK-02 C-03 | "Motores de Prisma" en `docs/` | **Descartado** (ya correcto) | `grep -n -i "motor" docs/ARCHITECTURE.md` no encontraba ninguna mención antes de mis cambios. Las únicas menciones ahora son las que agregué en D-24 ("sin motor nativo en la API ni en el worker"), coherentes con Prisma 7 |
| 12 | BACK-01 C-02, C-03; FRONT-01 C-02 | `GET /salud` vs `/api/salud`; `backend/prisma/`; `@livekit/components-react` = "LiveKit React" | **Descartado** (no son contradicciones) | §7 declara el prefijo `/api` en su primera línea y toda la tabla de rutas va sin prefijo, incluido `GET /salud`; §17 y §18 dicen `/salud` en ese mismo sentido y `ESSENTIALS` "Operación" ya dice `GET /api/salud`. `backend/prisma/` coincide con el árbol y con `prisma.config.ts`. "LiveKit React" en `ESSENTIALS` y `@livekit/components-react` en §2 nombran lo mismo. Ninguna frase induce a error; sin cambios |
| 13 | FRONT-01 C-01 (pendiente 9) | `styles/index.css` además de `tokens.css` | **Aplicado** en `ARCHITECTURE.md` · **orquestador** en `CLAUDE.md` | `ARCHITECTURE.md` §5 árbol: "`styles/  index.css (entrada de Tailwind) y tokens.css (tokens de diseño)`" |
| 14a | FRONT-01 pendiente 10 | Piezas compartidas nuevas (`mensaje-error`, `cargando`, `button-variants`) y `Rol` provisional en `components/layout/types.ts` | **Orquestador** (`CLAUDE.md` "Ubicaciones compartidas") | No es documentación de arquitectura; `ARCHITECTURE.md` §5 describe `components/` como "ui/ (shadcn reestilizado) y layout/", que sigue siendo cierto |
| 14b | FRONT-01 pendiente 11 | `features/diagnostico/` temporal | **Orquestador** (`CLAUDE.md`, tabla de módulos) · su traslado o eliminación: **pospuesto** al encargo del módulo `admin` | `ARCHITECTURE.md` no enumera los módulos de `features/` uno a uno; sin cambios ahí |
| 14c | FRONT-01 pendiente 12 (M-01, M-02) | Dirección visual: `--shadow-*`, tema del `Toaster`, paleta provisional, anular la paleta por defecto de Tailwind | **Pospuesto** al encargo de dirección visual | No es un hecho de arquitectura; `CLAUDE.md` ya marca los valores como pendientes |
| 14d | FRONT-01 pendiente 13 (D-02, D-03) | `paths` en `tsconfig.json` y dependencia `cn` que agrega el CLI de shadcn | **Pospuesto** al próximo encargo que ejecute `shadcn add` (lo decide el Arquitecto en ese plan) | Sin lugar en `ARCHITECTURE.md` |
| 14e | FRONT-01 pendiente 14 | Grep de V-07 (`\bslate-` en vez de `slate-`) | **Pospuesto** a los planes futuros del Arquitecto | Es una instrucción de verificación de planes, no documentación |
| 15 | Detectado al recopilar | §5 árbol del repositorio frente a lo que existe | **Aplicado** | `ARCHITECTURE.md` §5: agregados `package.json` raíz (workspaces `shared`, `backend`, `frontend`), `frontend/components.json`, `frontend/src/test/`, `backend/prisma.config.ts`, `backend/test/`, `backend/src/config/`, `backend/src/app.ts`; `adapters/` menciona `db/generated/` no versionado; `infra/` ahora dice lo que existe ("docker-compose de desarrollo, livekit/ y postgres/init/") y marca como pendientes Caddyfile, Compose de `prod` y scripts de respaldo, en lugar de describirlos como existentes. Nada de lo agregado es futuro: todo está en el árbol |
| 16 | Detectado al recopilar | §2 "Stack": versiones o generadores desactualizados | **Descartado** (nada falso) | §2 no fija versiones de Prisma, Node, ESLint, Vite, React, React Router ni Tailwind, ni nombra `prisma-client-js`. Según la instrucción, no se agregaron versiones. Lo único con versión, "PostgreSQL 17", coincide con `postgres:17.11-trixie` |
| 17 | Encargo | `docs/PRD.md` | **Sin cambios** | Ningún pendiente lo exige. Sus menciones a AWS, LiveKit Cloud y Resend (líneas 35, 66, 221, 225, 251–268) son de producto y siguen siendo correctas. `git diff docs/PRD.md` vacío; ningún `RF-xx`/`RN-xx` cambió |
| 18 | **Agregado por mí** | Decisión de Prisma 7 sin registro en §20 | **Aplicado** | `ARCHITECTURE.md` §20 **D-24**: "Prisma 7 con generador `prisma-client`, `@prisma/adapter-pg` y `pg`; cliente generado en `adapters/db/generated/`, no versionado" frente a "Prisma 6 con `prisma-client-js` y motor de consultas nativo". Decidida por el humano tras la revisión de BACK-01 y aplicada en BACK-02. Si el Manager considera que excede el encargo, es una sola fila al final de la tabla y se puede quitar sin renumerar nada |
| 19 | **Agregado por mí** | §1 principio 2 ("API, worker y base de datos corren en Docker Compose: lo mismo en la computadora del desarrollador…"), D-12 ("Idéntico en local, en el Droplet…") y `ESSENTIALS` "Proveedores" ("El núcleo … corre igual en local, en el Droplet o en un servidor propio") frente al hecho de que en `dev` la API y el worker corren en el anfitrión | **No resuelto; registrado para el humano** | Son enunciados de portabilidad (capacidad del núcleo), no descripciones del entorno, y cambiarlos sería tocar principios y decisiones ya numeradas. §4 corregido ya dice cómo corre `dev` hoy. Si el humano quiere alinear el principio 2, basta una frase ("en `dev` la API y el worker corren en el anfitrión contra los servicios del Compose de desarrollo"); no lo hice por no reescribir un principio sin aprobación |
| 20 | **Agregado por mí** | `ESSENTIALS` "Capas del backend": "`infra/`: compose, Caddyfile, respaldos, despliegue" | **Descartado** | Describe el propósito de la carpeta, no su contenido actual; el árbol de §5 (pendiente 15) ya distingue lo que existe de lo pendiente. Editarlo sería estilo |
| 21 | **Agregado por mí** | §18 paso 1 supone que GitHub Actions ejecuta `test`, pero las pruebas de integración del backend hoy exigen un PostgreSQL de `infra/` y `backend/.env` | **Pospuesto** al encargo de CI (o al de Testcontainers, el que llegue primero) | No es una contradicción del documento (no existe CI todavía); es un requisito que ese encargo debe resolver: servicio de PostgreSQL en el flujo o Testcontainers. No lo escribí en `ARCHITECTURE.md` para no describir un CI que no existe |
| 22 | **Agregado por mí** | §4 "Entornos" describe que el canal `registro` "guarda el HTML en `backend/tmp/correos/`", y §14/§8/§10 describen tablas y eventos que aún no existen | **Sin cambios** | Es diseño pendiente de implementar, no un hecho falso ni una contradicción con el repositorio; el encargo pide corregir hechos, no recortar el diseño |

## 2. Detalle de los cambios por documento

### `docs/ARCHITECTURE.md` (+30 líneas netas aprox.; ver `git diff`)
- §2 tabla "Stack", fila "Pruebas" (pendiente 5).
- §4 "Contenedores": encabezado sin archivo fijo; `prod` con `infra/docker-compose.prod.yml` "pendiente de escribir"; `dev` con los cuatro servicios reales y la API, el worker y el frontend en el anfitrión (pendientes 1 y 3).
- §4 "Entornos": la frase de configuración se extiende con tres viñetas, una por `.env` (pendientes 6 y 10).
- §5 árbol del repositorio (pendientes 13 y 15) y "Regla de capas" (pendiente 7).
- §11 última viñeta (pendientes 2 y 4).
- §18 párrafo bajo el paso 3 (pendiente 8).
- §19 riesgo 10 (pendiente 4).
- §20 D-23 (pendiente 4) y D-24 (pendiente 18). La tabla sigue contigua D-01…D-24, sin renumerar ni borrar.

### `docs/ARCHITECTURE-ESSENTIALS.md` (+6 / −5 líneas)
- "Proveedores", primera viñeta (pendiente 9).
- "Stack › Archivos" (pendiente 4) y "Stack › Pruebas" (pendiente 5).
- "Capas del backend": viñeta nueva `config/` y lista de librerías (pendiente 7).
- "Archivos", viñeta de buckets (pendiente 2).

### `docs/PRD.md`
Sin cambios.

## 3. Cambios que aplica el orquestador (`AGENTS.md` y `CLAUDE.md`)
No los hice yo; corresponden al orquestador según las reglas del encargo. Los dejo listados para que los complete con lo que aplique:

1. `AGENTS.md` "Pruebas": la frase "Las de integración (handlers y repositorios) corren contra un PostgreSQL real y desechable con Testcontainers" debe reflejar que hoy corren con Vitest contra el PostgreSQL de `infra/` (`DATABASE_URL` de `backend/.env`, cargada por `backend/test/setup.ts`), nunca contra una base compartida ni contra `prod`, y que Testcontainers queda pendiente para un encargo posterior (propuesto: el primero con repositorios reales). Redacción de referencia: la que quedó en `ESSENTIALS` "Stack › Pruebas".
2. `AGENTS.md` "Comandos": el bloque está marcado como `bash`, pero las dos líneas de copia de `.env.example` (`if (-not (Test-Path .env)) { Copy-Item .env.example .env }`) son de PowerShell, la terminal del proyecto. Falta una nota o un cambio de etiqueta del bloque.
3. `CLAUDE.md` "Ubicaciones compartidas": `styles/index.css` (entrada de Tailwind) además de `tokens.css`; `components/mensaje-error.tsx` y `components/cargando.tsx` como piezas compartidas; `components/ui/button-variants.ts` junto a `button.tsx`; `components/layout/types.ts` (`Rol`) como provisional hasta que `shared/` exponga los roles.
4. `CLAUDE.md` estructura del backend (`backend/src/`): agregar `config/` (validación de env con zod y opciones del logger; no es `core/` ni `adapters/`), y alinear la línea de `adapters/` con la lista de librerías de la regla 1 de `AGENTS.md` si se considera necesario.
5. `CLAUDE.md` tabla de módulos: `diagnostico` como módulo temporal (se mueve a `admin` o se elimina cuando exista ese módulo).

### Aplicado por el orquestador — 2026-09-22
Los cinco puntos anteriores quedaron aplicados por el orquestador (no por el programador), con autorización del humano en el encargo DOCS-01:

1. **`AGENTS.md` "Pruebas" — APLICADO.** La viñeta de pruebas dice ahora que las de integración corren con Vitest contra el PostgreSQL del entorno de `infra/` (`127.0.0.1:5433`, base `campus_dev`, con la `DATABASE_URL` de `backend/.env`), nunca contra una base compartida ni contra `prod`, y que Testcontainers (una base desechable por corrida) queda pendiente para un encargo posterior.
2. **`AGENTS.md` "Comandos", nota del bloque `bash`/PowerShell — APLICADO.** Nueva línea de cita bajo la existente: el bloque está marcado como `bash` solo para resaltar la sintaxis; las líneas que copian `.env.example` usan la forma con guarda de Windows PowerShell 5.1, la terminal del proyecto; en Git Bash el equivalente es `cp -n .env.example .env`. No se cambió la etiqueta del bloque para no alterar el resaltado de los comandos `npm`/`docker`, que sí son comunes a ambas terminales.
3. **`CLAUDE.md` "Ubicaciones compartidas" — APLICADO.** `styles/index.css` (entrada de Tailwind, importa `tokens.css`) añadido antes de `styles/tokens.css`; la viñeta de `components/` menciona `MensajeError` (`mensaje-error.tsx`), `Cargando` (`cargando.tsx`) y `components/ui/button-variants.ts`; la de `components/layout/` nombra `ContenedorRol` y `LayoutPublico` y marca el tipo `Rol` de `components/layout/types.ts` como provisional hasta que `shared/` exponga el enum de roles.
4. **`CLAUDE.md` estructura del backend — APLICADO.** Línea nueva `config/` (validación de las variables de entorno con zod y opciones del logger; el único código de `src/` que lee `process.env`; no es `core/` ni `adapters/`). La línea de `adapters/` no se tocó: describe módulos, no librerías, y la lista de librerías vive en la regla 1 de `AGENTS.md`.
5. **`CLAUDE.md` tabla de módulos — APLICADO.** Fila `diagnostico`: vista temporal de `/api/salud` (prueba de conexión con la API); se mueve a `admin` o se elimina cuando exista ese módulo; sin sesión.

Verificación del orquestador: `git diff AGENTS.md CLAUDE.md` muestra solo esas líneas; ambos archivos en LF sin retornos de carro.

## 4. Verificación

Ejecutado desde la raíz del repositorio, en Git Bash, tras los cambios y antes de crear esta carpeta:

- `git status --short` → solo ` M docs/ARCHITECTURE-ESSENTIALS.md` y ` M docs/ARCHITECTURE.md` (más esta carpeta nueva, `docs/trabajo/DOCS-01-pendientes/`, tras escribir este archivo).
- `git diff --stat` → `docs/ARCHITECTURE-ESSENTIALS.md | 11 ++++++-----` · `docs/ARCHITECTURE.md | 34 ++++++++++++++++++++++++----------` · 2 archivos, 30 inserciones, 15 borrados.
- `git diff --quiet -- backend shared frontend infra AGENTS.md CLAUDE.md .claude README.md package.json; echo $?` → `0`.
- `git ls-files --eol docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md` → los tres `i/lf w/lf attr/text=auto eol=lf`. `grep -c $'\r'` sobre los dos documentos tocados → `0` y `0`.
- Numeración de §20: `grep -o "^| D-[0-9]*" docs/ARCHITECTURE.md` → D-01 … D-22 originales, más D-23 y D-24 al final; contigua y sin huecos. Riesgos de §19: 1, 1b, 2–9 intactos, 10 nuevo.
- `git diff docs/PRD.md` → vacío; ningún `RF-xx`/`RN-xx` cambió de número.
- `grep -n "Testcontainers" docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md` → 2 líneas (§2 fila "Pruebas" y `ESSENTIALS` "Stack › Pruebas"), ambas con "Testcontainers pendiente".
- ``grep -c "api\` · \`worker\` · \`postgres\` · \`minio\`" docs/ARCHITECTURE.md`` → `0`.
- `grep -c "los mismos buckets" docs/ARCHITECTURE.md` → `0`.
- `grep -n "5432" docs/ARCHITECTURE*.md` → una sola línea, la de §4 que explica que 5432 es el puerto interno del contenedor y 5433 el publicado.
- **No se ejecutaron `lint`, `test`, `build` ni `prisma validate`:** no se tocó código, esquema ni configuración; `docs/` está en `.prettierignore` y no se pasó ningún formateador. No se leyó ni imprimió ningún `.env` (solo los `.env.example`).

## 5. Desviaciones y notas para el Manager
- **D-24 (pendiente 18)** es la única adición que no venía en la lista del orquestador ni derivaba directamente de un pendiente numerado. La justifico porque §5 y §18 ahora citan piezas de Prisma 7 (`@prisma/adapter-pg`, `prisma.config.ts`, cliente generado) cuyo porqué no constaba en el registro de decisiones, y porque el humano tomó esa decisión por escrito (BACK-01, "Decisiones del humano tras la revisión final", punto 1). Es una fila al final; quitarla no renumera nada.
- **Pendiente 19** (principio 2, D-12 y la frase de portabilidad de `ESSENTIALS`) queda sin resolver a propósito: es una decisión de redacción sobre principios, no un hecho del repositorio.
- No hay cambios de estilo: cada edición corrige un hecho, resuelve una contradicción o registra una decisión ya tomada. La voz, el formato de tablas y la puntuación con `·` de cada documento se conservaron.

## 6. Corrección tras la revisión del Manager

Veredicto del Manager: CAMBIOS REQUERIDOS, un solo hallazgo bloqueante (`revision.md`, M-01). Se corrigió únicamente eso.

### M-01 → corregido
Dónde: `docs/ARCHITECTURE.md` §18, párrafo indentado bajo el paso 3, última oración.

Oración anterior (retirada): "Y `package-lock.json` marca `prisma` y sus dependencias (`mysql2`, `postgres`, `@prisma/dev`, `@prisma/studio-core`) como `peer`, así que `npm ci --omit=dev` (incluso con `--omit=peer`) no las excluye: la imagen de `prod` debe construirse sin ese árbol."

Oración nueva: "Y `package-lock.json` no marca el CLI como `dev`: `node_modules/prisma` figura como `peer` (además de `devOptional`) por el par opcional `prisma *` que declara `@prisma/client`, y sus dependencias (`mysql2`, `postgres`, `@prisma/dev`, `@prisma/studio-core`) solo como `devOptional`; el encargo de despliegue debe comprobar con un `npm ci` real qué instala `--omit=dev` en la imagen y cómo aislar el CLI (imagen de build o contenedor de migración aparte)."

Qué cambió y por qué: (a) solo `node_modules/prisma` lleva `"peer": true` en el lock; las otras cuatro llevan únicamente `"devOptional": true`, así que la oración anterior atribuía la marca `peer` a paquetes que no la tienen; (b) "incluso con `--omit=peer`" solo se había medido con `npm ls` en BACK-02 (M-03), no con un `npm ci` real: ahora se enuncia como comprobación pendiente del encargo de despliegue; (c) se retiró "la imagen de `prod` debe construirse sin ese árbol", que contradecía el inicio del mismo párrafo (el CLI puede ir en la imagen o en un contenedor de migración aparte).

Verificación propia en `package-lock.json` (solo lectura), `grep -n -A6 '"node_modules/prisma"\|"node_modules/mysql2"\|"node_modules/postgres"\|"node_modules/@prisma/dev"\|"node_modules/@prisma/studio-core"' package-lock.json`:

```
1658:    "node_modules/@prisma/dev": {
1659-      "version": "0.24.17",
1662-      "devOptional": true,
1848:    "node_modules/@prisma/studio-core": {
1849-      "version": "0.33.0",
1852-      "devOptional": true,
10818:    "node_modules/mysql2": {
10819-      "version": "3.15.3",
10822-      "devOptional": true,
11219:    "node_modules/postgres": {
11220-      "version": "3.4.7",
11223-      "devOptional": true,
11313:    "node_modules/prisma": {
11314-      "version": "7.10.0",
11317-      "devOptional": true,
11318-      "hasInstallScript": true,
```

La marca `peer` de `prisma` queda fuera del alcance de `-A6`; entrada completa: línea 11317 `"devOptional": true` y línea 11320 `"peer": true`; ninguna de las otras cuatro entradas contiene `"peer": true` ni `"dev": true` (recorrido de cada entrada completa con `awk`). Origen del par: `node_modules/@prisma/client` (líneas 1620–1627) declara `"peerDependencies": { "prisma": "*" }` con `"peerDependenciesMeta": { "prisma": { "optional": true } }`.

Verificación tras la corrección: `git status --short` → ` M AGENTS.md`, ` M CLAUDE.md` (cambios del orquestador, no míos), ` M docs/ARCHITECTURE-ESSENTIALS.md`, ` M docs/ARCHITECTURE.md`, `?? docs/trabajo/DOCS-01-pendientes/` (`resumen.md` y `revision.md`); nada nuevo. `git diff --stat docs/ARCHITECTURE.md` y `git ls-files --eol` en la sección de verificación del reporte al orquestador. Sin formateadores, sin git de escritura, ningún otro archivo tocado.

## 7. Decisiones del humano tras la revisión y su aplicación

Carril trivial (solo programador), sin commit. Aplicado únicamente en `docs/ARCHITECTURE.md`; `revision.md`, ESSENTIALS y PRD sin tocar.

### Decisiones
1. **Pendiente 19 (principio 2 de §1):** sí, una sola frase que acote la portabilidad al despliegue (Droplet y servidor propio); en `dev` la API y el worker corren en el anfitrión. Sin renumerar. → **Aplicado** (cambio A).
2. **M-02 (nombre del Compose de `prod`):** confirma `infra/docker-compose.prod.yml`. → **Confirmado sin cambio** (§4 ya lo decía así, "pendiente de escribir").
3. **M-03 (lista de variables de §4):** reducirla a lo estructural: qué archivos `.env` existen, dónde, quién los lee y para qué sirven; los nombres concretos se consultan en cada `.env.example`. → **Aplicado** (cambio B).
4. **D-23 y D-24:** confirmadas. → **Sin cambio.**

M-02 y D-23/D-24 confirmados sin cambio.

M-04 aplicado por el orquestador en `AGENTS.md` "Pruebas": se quitaron `127.0.0.1:5433` y `campus_dev`; la viñeta dice ahora que las pruebas de integración corren con Vitest contra el PostgreSQL del entorno de `infra/`, con la `DATABASE_URL` de `backend/.env`.

### Cambio A — texto final del principio 2 (§1, línea 11)
"2. **El núcleo es portátil.** API, worker y base de datos corren en Docker Compose: lo mismo en el Droplet y, mañana, en un servidor del colegio. En `dev` la API y el worker corren en el anfitrión con `npm run dev` / `npm run dev:worker`, y solo PostgreSQL, MinIO y LiveKit van en Compose."

Único ajuste a la frase existente: se quitó "en la computadora del desarrollador", que era lo que contradecía a §4. Los principios 1–10 conservan su número.

### Cambio B — texto final del párrafo de §4 "Entornos"
"Configuración en variables de entorno: `.env` fuera del repositorio, `.env.example` versionado. En `dev` hay un `.env` por paquete, cada uno con su `.env.example`, donde se consultan los nombres y los valores de desarrollo:
- `infra/.env`: lo lee Docker Compose; credenciales y puertos de PostgreSQL, MinIO y LiveKit en local.
- `backend/.env`: lo cargan la API y el worker al arrancar y lo valida `config/env.ts`; el CLI de Prisma lo lee vía `prisma.config.ts`. Arranque de la API y conexión a la base. Debe apuntar a la base que levanta `infra/.env`: los dos archivos tienen que coincidir.
- `frontend/.env`: lo lee Vite; dirección de la API. Ninguna variable `VITE_*` puede llevar un secreto: todas terminan en el bundle público."

Se retiraron todas las listas de nombres, puertos y valores (5433/5432, 3000, `devkey`/`secret`, `STORAGE_*`, `LIVEKIT_*`, `VITE_API_URL`, etc.). Se conservaron los dos hechos estructurales que pidió el humano (coincidencia `backend/.env` ↔ `infra/.env`; ninguna `VITE_*` con secreto). De paso queda resuelto el primer matiz de precisión de M-03: la API y el worker cargan el archivo al arrancar (`--env-file-if-exists`) y `config/env.ts` valida `process.env`; el segundo matiz (Compose no consume `DATABASE_URL`, `STORAGE_ENDPOINT` ni `LIVEKIT_*`) desaparece al no enumerar variables.

### Verificación de esta ronda
Resultados en el reporte al orquestador: `git status --short --untracked-files=all` (mismos 4 modificados + `resumen.md` y `revision.md` sin rastrear, nada nuevo), `git diff --stat docs/ARCHITECTURE.md`, `grep -c "^| D-" docs/ARCHITECTURE.md` = 24, principios de §1 numerados 1–10 sin cambios, LF y 0 CR en `docs/ARCHITECTURE.md` y en este archivo. Sin formateadores, sin git de escritura.
