# Revisión del Manager — BACK-02: migrar el backend a Prisma 7.10.0 y cerrar pendientes de BACK-01 — final

Veredicto: APROBADO
Verificación propia: lint ok (shared y backend: ESLint, Prettier, `tsc --noEmit`; `prelint` regeneró el cliente) · test 6 archivos, 24 pruebas, 0 fallan (1.15 s, termina solo) · build ok (`dist/adapters/db/generated/client.js` presente) · `prisma validate` ok · `prisma format --check` ok · `migrate status` "1 migration found … Database schema is up to date!"

Fecha: 2026-09-22. Carril sensible. Flujo abreviado autorizado por el humano (sin tester, sin revisión de plan; ninguna de las dos ausencias es hallazgo). Sin commit. `AGENTS.md` sin diff, como corresponde: la línea de la regla 1 la aplica el orquestador después de esta revisión.

## Resumen en tres líneas

- Se hizo lo planeado, solo lo planeado y todo lo planeado: 17 modificados y 2 nuevos, los del plan; ninguna ruta protegida con diff; migración intacta y aplicada; V-14 confirma la importación estática (DEC-05). Todo verificado por mí, no por el resumen.
- Ningún problema de código bloquea. Lo que importa para el humano es de proceso y de proveedores: el programador terminó un proceso que no arrancó él (desviación 2), y el CLI de Prisma 7 arrastra al lock una librería con nombre de AWS (`aws-ssl-profiles`, transitiva de `mysql2`) que además, por cómo quedó marcado el lock, entraría en una imagen de `prod` con `npm ci --omit=dev`.
- Las cuatro desviaciones están declaradas; tres son mínimas y correctas, la segunda no estaba autorizada y motiva una regla de proceso.

## Problemas que bloquean

Ninguno.

## Problemas que no bloquean

### M-01 — El lock contiene `aws-ssl-profiles`, transitiva del CLI de Prisma 7 (regla 11 y ESSENTIALS "Sin AWS. Ni servicios ni librerías")

Dónde: `package-lock.json`, `node_modules/aws-ssl-profiles@1.1.2`. Cadena verificada con `npm explain`: `aws-ssl-profiles ← mysql2@3.15.3 ← prisma@7.10.0 (CLI) ← peerOptional de @prisma/client`.
Por qué importa: la regla dice "ni librerías". Es un paquete de certificados CA para RDS que nadie importa (ni nosotros ni `@prisma/client`, cuya única dependencia es `@prisma/client-runtime-utils`); no es un servicio ni un SDK; llega solo porque el CLI 7 incluye `mysql2` para `prisma dev` y Studio. El programador buscó `aws` en los cuatro `package.json` (correcto según el plan, R-16: "no aparezcan como dependencias directas") y no en el lock completo, por eso no lo vio. No se puede quitar sin abandonar el CLI de Prisma 7, decisión ya tomada por el humano.
Qué se espera: que el humano lo acepte de forma explícita al aprobar el commit (o decida lo contrario, que sería un encargo nuevo). Y que el encargo de despliegue garantice que el árbol del CLI (`prisma`, `mysql2`, `postgres`, `@prisma/dev`, `@prisma/studio-core`, `aws-ssl-profiles`) no entre en la imagen de `prod` (ver M-03). Si se acepta, conviene que DOCS-01 precise en ESSENTIALS que la regla habla de servicios, SDK e importaciones propias, y cómo se tratan las transitivas de herramientas aprobadas.

### M-02 — Desviación 2: el programador terminó un proceso que no arrancó él

Dónde: resumen del programador, "Desviaciones", punto 2 (`taskkill //PID 15056 //T //F` sobre un `npm run dev --workspace backend` creado a las 07:38:33, antes de su primer comando).
Por qué importa: el plan autorizaba "arrancar y detener procesos locales de Node" (los propios) y daba un remedio explícito para el puerto ocupado: cambiar `PORT` solo en `backend/.env` y reportarlo. Terminar un proceso ajeno no estaba en la lista; lo correcto era detenerse y preguntar. Hay atenuantes reales: el remedio del plan no habría funcionado contra un watcher del mismo repositorio (`tsx watch` relee `.env` al reiniciarse con cada edición, así que habría seguido al nuevo puerto), el plan exigía además "puerto 3000 vacío" al terminar, el proceso era un `dev` de este repositorio y no otro programa, el remedio está documentado en README §8, y lo declaró de inmediato con PID, hora y árbol. También conviene notar el riesgo que evitó sin buscarlo: ese watcher estaba ejecutando su código a medio editar contra la base de desarrollo; hoy solo hace `SELECT 1`, pero con modelos y migraciones eso no sería inocuo.
Qué se espera: no hay cambio de código. Aviso al humano (puede que lo tuviera arrancado a propósito; hay que relanzarlo) y una regla de proceso: un agente no termina procesos que no arrancó; ante un puerto ocupado por un proceso ajeno, o ante un remedio del plan que no aplica, se detiene y pregunta. Ver "Para el humano" 1 y 5.

### M-03 — `package-lock.json` marca el CLI `prisma` y sus transitivas como `peer`, no `dev`: `npm ci --omit=dev` las instalaría en `prod`

Dónde: `package-lock.json` → `node_modules/prisma` (`peer: true`, sin `dev`), `mysql2`, `postgres`, `@prisma/dev`, `@prisma/studio-core`, `@prisma/config`, `deepmerge-ts` (sin `dev`). Verificado leyendo el lock y con `npm ls prisma --omit=dev` (muestra `@prisma/client → prisma@7.10.0`). Causa: `@prisma/client@7.10.0` declara `prisma "*"` como par opcional, y npm no marca `dev` lo alcanzable desde una dependencia de producción.
Por qué importa: para este encargo, nada (no hay Dockerfile; la API y el worker no cargan nada de eso). Para el encargo de despliegue, sí: la imagen llevaría el CLI, `mysql2` (con dos avisos altos) y `aws-ssl-profiles`. Dato adicional medido por mí: `npm ls prisma mysql2 --omit=dev --omit=peer` **sigue** mostrando ambos, así que `--omit=peer` no parece bastar; hay que medirlo con un `npm ci` real en un directorio limpio.
Qué se espera: anotarlo para el encargo de despliegue (pendiente 8 de `aprobacion.md`, ampliado): imagen multietapa que instale solo las dependencias de producción sin el CLI, o que pode después de instalar, y etapa o contenedor aparte para `migrate deploy` con el CLI, `prisma.config.ts`, `prisma/` y `DATABASE_URL` del entorno. No bloquea aquí.

### M-04 (ampliado) — `npm audit`: 4 altas transitivas, todas bajo el CLI; sin corrección razonable

Dónde: `deepmerge-ts <8.0.0` vía `prisma → @prisma/config`; `mysql2 <=3.23.0` (GHSA-3f6p-5ww8-9rcr, GHSA-rgwj-5xj2-c3m3) vía `prisma`. Reproducido por mí (solo lectura): "4 high severity vulnerabilities", fix propuesto `prisma@6.19.3` (retroceso de mayor).
Por qué importa: ninguna llega al código en ejecución (`@prisma/client` no depende de ellas; nadie importa `mysql2`; el proyecto no usa MySQL). Sí estarían en el sistema de archivos de una imagen construida con `--omit=dev` (M-03).
Qué se espera: aceptar y anotar, como en BACK-01; sin `npm audit fix`. Revisar cuando Prisma publique una 7.x/8.x con `mysql2 > 3.23.0` y `deepmerge-ts >= 8`.

## Detalles menores

- `inicializarDb` ignora en silencio una segunda llamada con otra `connectionString` (devuelve sin avisar). Es exactamente lo que fijó DEC-04 y hoy solo hay un llamador; cuando haya más de uno (pruebas con bases distintas) convendrá que lance si la cadena difiere. No es desviación.
- ESLint: en `core/` el bloque propio sustituye las opciones de `no-restricted-imports` (ESLint reemplaza, no mezcla), así que el patrón `clienteGenerado` no aplica ahí; lo cubre `/adapters`, como dijo el plan. Comprobado con `--print-config` en `core/salud.ts`, `handlers/salud.ts`, `prisma.config.ts` (regla presente con la lista de 9 paquetes y el patrón) y `adapters/db/cliente.ts` (ausente).
- `prisma.config.ts` queda fuera de `include` de `tsconfig` (R-05): sus errores de tipo solo los vería ESLint sin información de tipos o el CLI al cargarlo. Aceptado por el plan; lo anoto para que nadie lo lea como olvido.
- `prisma format --check` imprime un recuadro "Update available 7.10.0 -> 8.0.0-rc.15": el notificador del CLI apunta a una RC. Cosmético.
- `.prettierignore` usa `backend/src/adapters/db/generated` (sin barra final) y `.gitignore` con barra: ambos funcionan (lint en verde con Prettier desde `backend/`; `git check-ignore` lo confirma).
- `backend/tmp/worker.err` (21 sep, de BACK-01) sigue ahí, ignorado; el programador borró solo los suyos, bien.
- Reproduje la comprobación de versiones de P-04 contra el registro con la misma lógica del programador (`[.][0-9]+`): `prisma`, `@prisma/client`, `@prisma/adapter-pg` → 7.10.0; `pg` → 8.23.0; `eslint` → 10.11.0; `@eslint/js` → 10.0.1; `dist-tags` de `prisma`: `latest 8.0.0-rc.15`, `prev 7.10.0`. Sin parada de P-04. La reescritura del one-liner (desviación 1) es equivalente.

## Diff contra el plan

| Verificación | Resultado |
|---|---|
| Rastreados modificados | Exactamente los 17 de la tabla "Archivos": `.gitignore` (+1), `.prettierignore` (+1), `README.md` (5 frases de "Backend en local": §2, §3, §4, §8 ×2), `backend/.env.example` (solo el comentario; 5 variables; `DATABASE_URL` idéntica a `infra/.env.example`), `backend/package.json` (4 deps + `prelint`), `schema.prisma` (generador `prisma-client` con las 4 opciones y `output`; datasource sin `url`; sin modelos ni `previewFeatures`), `adapters/db/{cliente,salud,index}.ts`, `adapters/README.md`, `app.ts`, `server.ts`, `test/setup.ts`, `test/salud-sin-base.integracion.test.ts`, `eslint.config.mjs`, `package.json` raíz (2 líneas), `package-lock.json` (2301 líneas) |
| Nuevos | `backend/prisma.config.ts` y `backend/test/db-cliente.test.ts`, contenido literal del plan; más `plan.md`, `aprobacion.md`, `resumen-programador.md` |
| Rutas protegidas | `git diff --quiet` → 0 sobre `backend/prisma/migrations`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `infra/`, `tsconfig.base.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `shared/`, `frontend/`, `.gitattributes`, `backend/src/{worker.ts,config,core,handlers}` |
| Alcance de más | Ninguno: sin modelos, sin migraciones nuevas, sin `middleware/`, sin reglas de ESLint desactivadas (el diff solo agrega dos nombres, un patrón y una línea de `ignores`), sin dependencias fuera de la tabla |
| Contenido vs plan | `cliente.ts`, `salud.ts`, `index.ts`, `app.ts`, `server.ts`, `setup.ts`, el doble del test, `eslint.config.mjs`, `prisma.config.ts`, `db-cliente.test.ts`, `schema.prisma`, `adapters/README.md`, `.env.example` y las frases del README coinciden con el "Contenido exacto de los archivos"; los únicos cambios de forma son los cortes de línea de Prettier previstos por el plan |
| Ignorados | `backend/src/adapters/db/generated` (`.gitignore:9`), `backend/.env` (`:4`), `backend/dist` (`:2`), `backend/tmp` (`:8`); `prisma.config.ts` y `.env.example` no ignorados |
| LF | 17/17 rastreados `i/lf w/lf` (incluido `package-lock.json`); los 5 no rastreados `w/lf` |

## Puntos de revisión para el Manager (del plan)

| Punto | Resultado (ejecutado por mí) |
|---|---|
| `npm ls prisma @prisma/client @prisma/adapter-pg pg eslint @eslint/js` | Código 0; `7.10.0` ×3; `pg@8.23.0` una copia (`deduped` bajo `@prisma/adapter-pg` y `pg-pool`); `eslint@10.11.0` una real; `@eslint/js@10.0.1`; sin `invalid` ni `UNMET PEER`. `npx prisma -v`: `prisma 7.10.0`, `@prisma/client 7.10.0`, `Query Compiler: enabled`, Schema Engine en `@prisma/engines/schema-engine-windows.exe` |
| Migración intacta | Una carpeta `20260922015711_extensiones_iniciales` + `migration_lock.toml` (`provider = "postgresql"`); `git diff --quiet -- backend/prisma/migrations` → 0; `migrate status` "1 migration found … up to date!"; `_prisma_migrations` una fila `t`/`t`; `pg_extension`: `pg_trgm`, `plpgsql`, `unaccent`; 0 bases `prisma_migrate_shadow*` |
| `schema.prisma` | Como se pidió; `validate` y `format --check` ok |
| `prisma.config.ts` | Versionado, sin `dotenv`, `loadEnvFile` en `try/catch` que solo ignora `ENOENT`, sin valores de conexión; `tsconfig*` sin diff |
| `generated/` | No rastreado, fuera de ESLint (`ignores`) y Prettier (lint verde); `dist/adapters/db/generated/client.js` existe tras `build` |
| Capas | `grep` → solo `adapters/db/cliente.ts:1` (importación), `:6` (comentario) y `adapters/README.md:3` (texto). `--print-config` confirma la regla fuera de `adapters/` |
| `app.ts` / API en vivo | Sin `requestIdLogLabel` de nivel superior. API desde `dist/` (PID 20264, mío, detenido): `GET /api/salud` 200 `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-22T14:42:06.290Z"}`; `GET /api/no-existe` 404 `NO_ENCONTRADO`; petición con `Authorization: Bearer secreto` y `Cookie: a=b` → 200. Log: `FSTDEP024` 0, `"reqId"` 0, `"requestId":"req-` 6, `secreto|a=b` 0. Worker desde `dist/`: `"evento":"worker_listo"`. Puerto libre después |
| Arranque sin `DATABASE_URL` (importación estática) | `env -u DATABASE_URL node dist/server.js` → "Configuración inválida. Revisa backend/.env … - DATABASE_URL: obligatoria", código 1, sin valores. DEC-05 decidida correctamente |
| `test/setup.ts` | `{ cause: error }` presente; `npm test` sin `FSTDEP024` ni `DeprecationWarning` (0 y 0), `"requestId":"req-` 13 veces, `"reqId"` 0 |
| Dependencias prohibidas | Ninguna directa en los cuatro `package.json` (`dotenv`, `@types/pg`, `better-sqlite3`, `postgres`, `mysql2`, `pino-pretty`); nada de AWS directo. Transitiva `aws-ssl-profiles`: M-01 |
| `.env` / `.env.example` | `backend/.env` ignorado y no leído; `.env.example` 5 variables, `DATABASE_URL` idéntica a `infra/.env.example`, solo cambió el comentario |
| V-20 | Reportada; confirmé en `@prisma/config/dist/index.js:515-521` que `env()` lanza `PrismaConfigEnvError` al evaluarse, así que `prisma generate` en el Dockerfile necesitará una `DATABASE_URL` de relleno o un config sin `env()` ansioso |
| `npm audit` | 4 altas, reproducido; M-04 |

## Definición de terminado (`AGENTS.md`)

| Punto | Estado |
|---|---|
| Cumple el `RF-xx`/`RN-xx` | No aplica (andamiaje). Cumple el plan aprobado y P-01 a P-04 por defecto |
| Respeta capas y pasa por middleware | Capas: sí (grep, ESLint efectivo, `core/` sin infraestructura). Middleware: no aplica; `GET /api/salud` sigue siendo la única ruta, pública por diseño |
| `lint`, `build`, `test` en verde | Sí, ejecutados por mí desde la raíz: lint 0, build 0, test 6/6 archivos, 24/24 pruebas |
| Pruebas de autorización si hay endpoint nuevo | No aplica: sin endpoint nuevo |
| Migración incluida y compatible hacia atrás | No cambió el esquema de la base; la única migración está intacta y aplicada; `schema.prisma` solo cambia generador y datasource. Reversible: volver el código atrás no toca la base |
| `infra/` y `.env.example` actualizados | `infra/` sin cambios (correcto); `backend/.env.example` con el comentario nuevo; sin variables nuevas |
| Documentos actualizados | `README.md` y `adapters/README.md` sí. `AGENTS.md` regla 1: pendiente del orquestador (autorizado). ESSENTIALS y `ARCHITECTURE.md` §18: DOCS-01 (ya anotado) |

## Reglas que no se rompen

- **1 Capas:** solo `adapters/db/cliente.ts` importa `@prisma/adapter-pg` y el cliente generado; `core/` no cambió y sigue sin infraestructura; `config/env.ts` es la única lectura de `process.env` (`adapters/` recibe la cadena ya validada).
- **9 Secretos:** `.env.example` con los valores de desarrollo ya versionados; `backend/.env` ignorado; ningún agente lo leyó ni imprimió (yo tampoco); `prisma.config.ts` sin valores.
- **10 Esquema solo por migraciones:** sin `db push`, sin `migrate dev`; misma migración, mismo checksum ("up to date"), misma fila en `_prisma_migrations`.
- **11 Proveedores:** ninguna dependencia directa nueva fuera de la tabla; la transitiva `aws-ssl-profiles` queda registrada en M-01 para decisión del humano.
- **13 Nada sensible en logs:** cabeceras `Authorization` y `Cookie` ausentes del log; mensajes de configuración sin valores; `verificarConexion` registra solo nombre y código del error; `migrate status` imprime host, puerto y base, no credenciales.

Las reglas 2 a 8 y 12 no aplican todavía.

## Estilo (`CLAUDE.md`)

Sin `any` en los archivos tocados; retornos tempranos en `inicializarDb`, `obtenerDb`, `cerrarConexion`, `prisma.config.ts`; error tipado `AppError` con `codigo` y `estado` desde `core/`; `obtenerDb()` fuera del `try` en `salud.ts` (500 por programación frente a 503 por caída, como fijó DEC-04); `catch` que relanza el mismo `error` (`preserve-caught-error` satisfecha); ningún valor por defecto silencioso; comentarios que explican el porqué (por qué la importación es estática, por qué el `try`, por qué `logController`); dominio en español y técnica en inglés (`inicializarDb`, `obtenerDb`, `connectionString`, `adapter`). Sin cambios en `frontend/`: la lista de diseño no aplica.

## Desacuerdos arbitrados

1. **DEC-05 (importación estática).** V-14 pasó (reproducido por mí): la estática se queda. Correcto según el plan.
2. **Desviación 2 (proceso ajeno).** No autorizada; debió detenerse y preguntar. No bloquea: sin efecto en el código, declarada con detalle, recuperable relanzando `npm run dev`, y el remedio del plan tampoco habría servido contra un watcher del mismo repositorio. La lección va a una regla de proceso (M-02, "Para el humano" 1 y 5).
3. **Desviación 1 (regex de `ultima`).** Misma lógica y mismo resultado; lo reproduje. Correcta.
4. **Desviación 3 (`--ignore-path ../.prettierignore`).** Necesaria: Prettier solo descubre `.prettierignore` en el cwd, y desde `backend/` habría reformateado `generated/`. Alcance idéntico al del plan. Correcta.
5. **Desviación 4 (V-21 §7 no repetido).** Aceptable; el worker se ejecutó en V-15 y lo volví a arrancar yo desde `dist/`.
6. **M-04 ampliado.** Aceptado: cadenas verificadas, nada en ejecución; queda ligado a M-03 para la imagen de `prod`.
7. **Hallazgo del lock (`peer`).** Verificado y ampliado (ni `--omit=peer` lo quita según `npm ls`); clasificado para el encargo de despliegue, no bloquea aquí.

## Documentos a actualizar

**`AGENTS.md` regla 1 (lo aplica el orquestador, autorizado por el humano):** el texto literal del plan sigue siendo correcto tras la implementación: `Solo adapters/ importa @prisma/client, @prisma/adapter-pg, pg, el cliente generado por Prisma (adapters/db/generated/), pg-boss, minio, resend, argon2, jose o livekit-server-sdk.` Coincide con la lista de ESLint (9 paquetes + patrón), con `adapters/README.md` y con la ruta de `.gitignore`. Mantener `@prisma/client` en la lista es correcto: el cliente generado lo importa por dentro. Ningún comando de "Comandos" cambia.

**Ya anotado para DOCS-01** (pendientes 7 y 8 de `aprobacion.md`): ESSENTIALS "Capas del backend"; `ARCHITECTURE.md` §18 paso 3 (imagen con `prisma.config.ts`, `prisma/`, CLI, `DATABASE_URL` del entorno).

**Nuevo, derivado de esta implementación:**

- Pendiente 8, ampliar con: (a) `prisma generate` en la etapa de build exige `DATABASE_URL` (V-20 confirmada en el código de `@prisma/config`): valor de relleno sin secreto o config sin `env()` ansioso; (b) el lock marca el CLI y sus transitivas como `peer`, `npm ci --omit=dev` las instala y `--omit=peer` no parece bastar: medir con `npm ci` real y diseñar la imagen sin el árbol del CLI (M-03).
- Si el humano acepta M-01: una frase en ESSENTIALS "Proveedores" (DOCS-01) que aclare el alcance de "ni librerías" frente a transitivas de herramientas aprobadas que no se importan.
- Regla de proceso propuesta (M-02) en `AGENTS.md` "Reglas del equipo" y en `.claude/agents/programador.md`: ver "Para el humano" 5.
- `docs/trabajo/BACK-02-prisma-7/plan.md` no se edita (registro histórico); queda constancia aquí de que el remedio "cambiar `PORT` en `backend/.env`" no sirve cuando el ocupante es un watcher del mismo repositorio.

## Para el humano

1. **Proceso ajeno terminado.** El programador terminó con `taskkill` el árbol del PID 15056 (`npm run dev --workspace backend`, `tsx watch`, arrancado a las 07:38:33, antes de su primer comando) porque ocupaba el puerto 3000 y se reiniciaba con cada edición suya. Si lo tenías arrancado a propósito, hay que relanzarlo. Al terminar mi revisión no queda ningún `node.exe` del repositorio vivo y el puerto 3000 está libre.
2. **`aws-ssl-profiles` en el lock (M-01).** Transitiva del CLI de Prisma 7 (`prisma → mysql2 → aws-ssl-profiles`), nunca importada, sin servicio de AWS detrás. La regla dice "ni librerías": necesito tu aceptación explícita al aprobar el commit. La única alternativa es volver a Prisma 6 (encargo nuevo). Recomiendo aceptarla y exigir en el encargo de despliegue que el árbol del CLI no entre en la imagen de `prod`.
3. **`npm audit` (M-04).** 4 altas, todas bajo el CLI; aceptar y anotar; sin `npm audit fix`.
4. **Imagen de `prod` (M-03).** El lock instala el CLI y sus transitivas incluso con `--omit=dev`; va al encargo de despliegue junto con la `DATABASE_URL` de relleno para `prisma generate`.
5. **Regla de proceso (recomendada).** Añadir a `AGENTS.md` "Reglas del equipo" y a `.claude/agents/programador.md`: "Un agente no termina procesos que no arrancó. Si un puerto está ocupado por un proceso ajeno, o el remedio previsto en el plan no aplica, se detiene y pregunta." Segundo incidente de alcance en dos encargos (BACK-01: Prettier desde la raíz; BACK-02: proceso ajeno): la regla escrita es más barata que la tercera vez.
6. **Commit.** Rama `chore/back-02-prisma-7` (o similar) y commit convencional, por ejemplo `chore(backend): migra a Prisma 7.10.0 con adaptador pg y cierra pendientes de BACK-01`. Antes del commit el orquestador aplica la línea de la regla 1 en `AGENTS.md` (autorizado en `aprobacion.md`). Al revisar el diff, atención a: `package-lock.json` (2301 líneas; LF), `backend/.env.example` (sin secretos), `schema.prisma`, `prisma.config.ts` (sin valores) y `eslint.config.mjs` (solo adiciones). Entran también `docs/trabajo/BACK-02-prisma-7/` (se versiona) y `backend/test/db-cliente.test.ts`. No entran (ignorados, verificado): `backend/.env`, `backend/src/adapters/db/generated/`, `dist/`, `backend/tmp/`, `node_modules/`.

## Estado del entorno al terminar

API y worker arrancados por mí desde `dist/` y detenidos (`taskkill //T //F` solo sobre mis PID 20264 y 2452); puerto 3000 libre; ningún `node.exe` del repositorio vivo; infra levantado como estaba (`postgres`, `minio`, `livekit` healthy, sin `docker compose down`); `backend/.env` e `infra/.env` no leídos ni impresos; mis logs en el scratchpad de la sesión y los dos de `backend/tmp/` borrados; `git status` idéntico al inicio (17 modificados, 5 no rastreados; `diff --stat` 1798/632). Sin `git add`, `commit`, `restore`, `npm install`, `prettier --write`, `eslint --fix` ni escritura fuera de este archivo.
