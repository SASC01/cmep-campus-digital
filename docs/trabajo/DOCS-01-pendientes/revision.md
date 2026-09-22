# Revisión del Manager — DOCS-01: pendientes de documentación de INFRA-01, BACK-01, BACK-02 y FRONT-01 — final

Veredicto: APROBADO
Verificación propia: lint no aplica · test no aplica · build no aplica (solo documentos; no se ejecutaron, por instrucción del encargo)

Fecha: 2026-09-22 · Carril: trivial ampliado (programador → manager), sin arquitecto ni tester, sin `plan.md`; la vara de medir es el encargo del humano reproducido en `resumen.md`.

Historial: primera ronda CAMBIOS REQUERIDOS por un solo hallazgo (M-01); el programador lo corrigió y la segunda verificación (solo ese punto) quedó en verde. Detalle en "Problemas que bloqueaban (corregidos)".

## Qué comprobé (resumen)

- `git status --short --untracked-files=all` → exactamente ` M AGENTS.md`, ` M CLAUDE.md`, ` M docs/ARCHITECTURE-ESSENTIALS.md`, ` M docs/ARCHITECTURE.md`, `?? docs/trabajo/DOCS-01-pendientes/resumen.md` (y esta revisión).
- `git diff --quiet -- backend shared frontend infra README.md package.json package-lock.json .claude .gitignore .prettierignore docs/PRD.md docs/trabajo/INFRA-01-entorno-dev docs/trabajo/BACK-01-esqueleto-backend docs/trabajo/BACK-02-prisma-7 docs/trabajo/FRONT-01-esqueleto-frontend` → código 0. `git diff --stat -- docs/PRD.md` vacío.
- `git ls-files --eol` de los cuatro documentos y `PRD.md` → `i/lf w/lf`; `resumen.md`, `revision.md` y los cuatro documentos con 0 retornos de carro.
- `git diff --stat` normal y con `-w` dan lo mismo (37 inserciones, 18 borrados; `docs/ARCHITECTURE.md` 24/10 antes y después de la corrección de M-01): ningún reformateo, solo líneas de contenido. `docs/` y `/*.md` siguen en `.prettierignore`.
- Numeración: `grep -n "^| D-"` → D-01…D-24 contiguos; `git diff -U0` solo añade `D-23` y `D-24`, ninguna fila D-01..D-22 tocada. Riesgos de §19: 1, 1b, 2–9 intactos y 10 nuevo. Ningún `RF-xx`/`RN-xx` cambió.
- Cada hecho nuevo del diff se contrastó con `infra/docker-compose.yml`, los tres `.env.example`, `schema.prisma`, `prisma.config.ts`, `adapters/db/cliente.ts`, `config/env.ts`, `config/logger.ts`, `test/setup.ts`, ambos `vitest.config.ts`, `vite.config.ts`, `styles/index.css`, `components/**`, `features/diagnostico/hooks.ts`, `app.ts`, `handlers/salud.ts`, `server.ts`, `worker.ts`, `backend/package.json`, `package.json` raíz, `package-lock.json`, `adapters/README.md`, `eslint.config.mjs` y `README.md`. No leí ningún `.env`.

Resultado: todo lo escrito es cierto. La única oración inexacta (M-01, §18) quedó corregida y verificada.

## Problemas que bloquean

Ninguno.

## Problemas que bloqueaban (corregidos)

### M-01 — §18 afirmaba como hecho algo que el lock no decía y que BACK-02 dejó "por medir" — CORREGIDO
Dónde: `docs/ARCHITECTURE.md` §18, párrafo indentado bajo el paso 3, última oración.
Qué decía: que el lock marcaba `prisma` **y** `mysql2`, `postgres`, `@prisma/dev`, `@prisma/studio-core` como `peer`, que `npm ci --omit=dev` "incluso con `--omit=peer`" no las excluía (solo medido con `npm ls` en BACK-02), y que "la imagen de `prod` debe construirse sin ese árbol", en tensión con el inicio del párrafo ("en la imagen o en un contenedor de migración aparte").
Oración nueva, verificada literalmente con `grep -c` (1 coincidencia): "Y `package-lock.json` no marca el CLI como `dev`: `node_modules/prisma` figura como `peer` (además de `devOptional`) por el par opcional `prisma *` que declara `@prisma/client`, y sus dependencias (`mysql2`, `postgres`, `@prisma/dev`, `@prisma/studio-core`) solo como `devOptional`; el encargo de despliegue debe comprobar con un `npm ci` real qué instala `--omit=dev` en la imagen y cómo aislar el CLI (imagen de build o contenedor de migración aparte)."
Comprobaciones de la segunda ronda:
1. `grep -c "sin ese árbol"` → 0; ``grep -c 'incluso con `--omit=peer`'`` → 0; la oración nueva aparece exactamente una vez.
2. `package-lock.json`: `node_modules/prisma` → `"devOptional": true, "peer": true`; `mysql2`, `postgres`, `@prisma/dev`, `@prisma/studio-core` → solo `"devOptional": true`; `node_modules/@prisma/client` → `peerDependencies.prisma: "*"` con `peerDependenciesMeta.prisma.optional: true`. Coincide palabra por palabra con lo escrito.
3. Ya no contradice el inicio del párrafo: "aislar el CLI (imagen de build o contenedor de migración aparte)" es compatible con "en la imagen o en un contenedor de migración aparte"; no se afirma nada sobre `--omit=peer` ni sobre el resultado de `npm ci`, que queda encargado al despliegue.
4. `git status --short --untracked-files=all` sin cambios respecto a la primera ronda; `git diff --stat docs/ARCHITECTURE.md` sigue en 24 inserciones / 10 borrados (la corrección sustituyó una oración dentro de la misma línea añadida).
5. `docs/ARCHITECTURE.md` `i/lf w/lf`, 0 CR; `resumen.md` 0 CR. `resumen.md` §6 "Corrección tras la revisión del Manager" documenta la oración retirada, la nueva y la salida del grep del lock.

## Problemas que no bloquean

### M-02 — §4 fija un nombre de archivo para el Compose de `prod` que nadie decidió
Dónde: `docs/ARCHITECTURE.md` §4 "Contenedores": "Producción (`infra/docker-compose.prod.yml`, pendiente de escribir)".
Por qué importa: el pendiente C-03 pedía separar los archivos de `dev` y `prod`, no bautizar el de `prod`. El nombre es razonable y el "pendiente de escribir" evita que se lea como existente, pero es una decisión de infraestructura tomada por el programador. No se inventó contenido del Compose de `prod`: correcto.
Qué se espera: que el humano confirme el nombre o lo cambie; si prefiere no fijarlo, basta "archivo de Compose de `prod`, pendiente".

### M-03 — §4 "Entornos" enumera todas las variables de los tres `.env.example`: cierto hoy, propenso a desactualizarse
Dónde: `docs/ARCHITECTURE.md` §4, las tres viñetas nuevas (pendientes 6 y 10).
Por qué importa: la revisión de INFRA-01 lo marcó como opcional. Todo lo escrito coincide con los `.env.example` (nombres, 5433 en el anfitrión y 5432 en el contenedor, `STORAGE_ENDPOINT` como URL completa, `devkey`/`secret`, `PORT` 3000, `VITE_API_URL` vacía y el proxy hacia `127.0.0.1:3000`). Pero a partir de ahora cada variable nueva obliga a editar `ARCHITECTURE.md`, y la fuente de verdad ya son los `.env.example`. Dos matices de precisión: la API y el worker cargan `backend/.env` con `--env-file-if-exists` de Node/tsx y `config/env.ts` valida `process.env` (el texto dice "lo leen ... vía `config/env.ts`"); y Docker Compose lee `infra/.env` pero no consume `DATABASE_URL`, `STORAGE_ENDPOINT` ni `LIVEKIT_*`, que están ahí de referencia.
Qué se espera: decisión del humano: conservar la lista como está, o reducirla a los hechos estructurales (un `.env` por paquete, quién lo lee, `DATABASE_URL` debe coincidir entre `infra/` y `backend/`, `POSTGRES_PORT` publicado ≠ 5432 interno, ninguna `VITE_*` con secreto) remitiendo a los `.env.example` para el detalle. Si se conserva, corregir los dos matices.

### M-04 — `AGENTS.md` "Pruebas" incrusta valores por defecto (`127.0.0.1:5433`, `campus_dev`) en una regla de proceso
Dónde: `AGENTS.md` › Pruebas, viñeta de integración (cambio del orquestador).
Por qué importa: son los valores de `infra/.env.example`, configurables por `POSTGRES_PORT` y `POSTGRES_DB`. Una regla que cita valores concretos deriva en cuanto alguien los cambie en su `.env`. La frase es correcta hoy y coherente con ESSENTIALS y §2.
Qué se espera: opcional: dejar "el PostgreSQL del entorno de `infra/`, con la `DATABASE_URL` de `backend/.env`" y quitar el puerto y el nombre de base.

## Detalles menores

- **`/salud` en §17 y §18** frente a `GET /api/salud` en ESSENTIALS y en el README (pendiente 12, descartado por el programador). El descarte es defendible porque §7 declara el prefijo `/api` para toda la tabla, pero §17 (monitoreo) y §18 (verificación) están lejos de §7 y son instrucciones operativas; dos tokens (`/api/salud`) evitarían una sonda mal configurada. No bloquea.
- **FRONT-01, pendiente 12 (M-02 de esa revisión):** pedía sumar a la nota de "Pendiente" de dirección visual de `CLAUDE.md` los tokens `--shadow-*` y el tema del `Toaster`. Quedó pospuesto al encargo de dirección visual y solo consta en `docs/trabajo/`. Es un recordatorio, no un hecho; aceptable, pero la nota de `CLAUDE.md` seguirá diciendo solo "colores, fuentes, radios".
- **§5 árbol:** `frontend/src/test/` y `backend/test/` se describen como "configuración de Vitest"; los `vitest.config.ts` viven en la raíz de cada paquete y en `test/` está el `setup.ts` (y, en backend, las pruebas de integración). Precisión menor.
- **Contradicción preexistente, fuera del encargo:** la fila `dev` de §4 dice "Todo local y sin cuentas externas" y, en la misma celda, "Las grabaciones se prueban contra un proyecto de LiveKit Cloud de desarrollo". Nadie la tocó; la anoto para el próximo DOCS.
- **ESSENTIALS "Proveedores":** "Ni servicios ni librerías. La regla aplica a servicios y a librerías que..." repite la idea, pero es la frase literal de la regla 11 de `AGENTS.md`, que era lo pedido. Sin cambio.
- **ESSENTIALS "Capas del backend":** `config/` quedó entre `core/` y `adapters/` en una lista que sigue el diagrama de capas; no es una capa del flujo `handlers → middleware → core → adapters`. Legible; sin cambio.

## Cobertura del encargo

Cruce de la tabla de `resumen.md` con las secciones "Pendientes para DOCS-01" de las cuatro `aprobacion.md` (1–14) y los "Documentos a actualizar" de las cuatro `revision.md`:

| Pendiente | Estado | Comentario |
|---|---|---|
| 1 C-01 INFRA-01 (§4 servicios de `dev`) | Aplicado y verificado | Coincide con `docker-compose.yml`: `postgres`, `minio`, `minio-init`, `livekit`; API y worker en el anfitrión |
| 2 C-02 INFRA-01 (§11 buckets) | Aplicado y verificado | `minio-init` crea `campus-privado` y `campus-publico` (`mc anonymous set download` solo en el público) |
| 3 C-03 INFRA-01 (Compose `dev` ≠ `prod`) | Aplicado | Ver M-02 sobre el nombre |
| 4 Riesgo MinIO y reemplazo por S3 | Aplicado y verificado | §19 riesgo 10 con las dos etiquetas exactas del Compose; §11; ESSENTIALS "Stack › Archivos"; D-23 respaldada por la Enmienda 1 de INFRA-01 |
| 5 Testcontainers → PostgreSQL de `infra/` | Aplicado y verificado | §2, ESSENTIALS "Stack › Pruebas" y `AGENTS.md` "Pruebas" dicen lo mismo; `test/setup.ts` carga `backend/.env`; `salud.integracion.test.ts` exige el PostgreSQL de infra |
| 6 Comentario cruzado en `infra/.env.example` | Pospuesto, correcto | Es `infra/`, fuera del alcance; `backend/.env.example` ya tiene el cruce, `infra/.env.example` no menciona `backend/.env` |
| 7 Librerías de infraestructura con el cliente generado | Aplicado y verificado | `AGENTS.md` regla 1, ESSENTIALS y §5 dicen lo mismo; coincide con `adapters/README.md`, `cliente.ts` y `.gitignore` |
| 8 §18 paso 3 (no §6) con Prisma 7 | Aplicado y verificado | Correcto en sección y en piezas (`prisma.config.ts`, `schema.prisma`, `migrations/`, CLI devDependency, `env()` ansiosa); la oración del lock corregida en la segunda ronda (M-01) |
| 9 `styles/index.css` | Aplicado y verificado | `CLAUDE.md` y §5 coinciden; `index.css` importa `tailwindcss` y `./tokens.css` |
| 10 Piezas compartidas y `Rol` provisional | Aplicado y verificado | `MensajeError`, `Cargando`, `ContenedorRol`, `LayoutPublico`, `buttonVariants` existen con esos nombres; `types.ts` dice "provisional" |
| 11 `features/diagnostico/` temporal | Aplicado y verificado | `hooks.ts` consulta `/api/salud`; la fila de `CLAUDE.md` lo marca temporal |
| 12 Dirección visual | Pospuesto, correcto | Ver detalle menor |
| 13 `paths`/`cn` del próximo `shadcn add` | Pospuesto, correcto | Decisión de plan, no de documento |
| 14 Grep de V-07 | Pospuesto, correcto | Instrucción de verificación, no documento |
| BACK-02 M-01 → ESSENTIALS "Proveedores" | Aplicado y verificado | Frase literal de la regla 11 |
| INFRA-01 revisión, opcional (nombres de variables) | Aplicado | Ver M-03 |
| BACK-02 M-02 (regla de procesos ajenos) | Ya estaba en `AGENTS.md` | Sin cambio en este encargo |

Los seis puntos que el humano pidió "al menos": C-01, C-02 y C-03 de INFRA-01 (sí); riesgo de MinIO y reemplazo por cualquier S3 (sí); Testcontainers sustituido por el PostgreSQL de infra (sí, en los tres documentos); lista de librerías con el cliente generado (sí, en los tres); referencia de `migrate deploy` en §18 y no §6 (sí); nota del bloque bash/PowerShell en `AGENTS.md` (sí, coherente con el README, que usa PowerShell 5.1 y la forma con guarda). **Los seis están.**

## Adiciones del programador no pedidas

- **D-24 (Prisma 7).** Registra una decisión real del humano (BACK-01, "Decisiones del humano", punto 1) que §5 y §18 ya presuponen y que no constaba en §20. Cierta en cada término (`prisma-client`, `output` en `adapters/db/generated/`, `@prisma/adapter-pg` + `pg`, sin motor nativo en la API ni el worker; 7.10.0 última estable de la línea según BACK-01). Al final de la tabla, sin renumerar. La acepto; el humano puede quitarla sin efecto colateral.
- **D-23 (MinIO desde `quay.io`).** Reproduce la Enmienda 1 de INFRA-01 con fidelidad ("solo un registro de descarga; no es proveedor del proyecto"). Misma observación.
- **Árbol de §5 (pendiente 15).** La línea de `infra/` era falsa (Caddyfile y respaldos no existen) y `config/` era necesaria porque la regla de capas ya la cita: esas dos correcciones sí eran obligadas. `package.json` raíz, `components.json`, `test/`, `prisma.config.ts` y `app.ts` son verdaderos y ayudan a orientarse, pero exceden "mínimo". Los acepto porque describen el repositorio real y no reescriben nada; no es estilo.
- **Variables de §4 (pendiente 10).** Ver M-03.

## Desacuerdos arbitrados

No hubo Tester. Arbitro los "descartados" del programador:
- **Pendiente 11 ("motores de Prisma" en `docs/`):** correcto descartarlo; C-03 de BACK-02 hablaba del README y se resolvió allí. `ARCHITECTURE.md` no mencionaba motores antes; D-24 es la única mención y es coherente.
- **Pendiente 12 (`/salud`, `backend/prisma/`, "LiveKit React"):** defendible; ver detalle menor sobre §17/§18.
- **Pendiente 16 (versiones en §2):** correcto; §2 no fija versiones y "PostgreSQL 17" coincide con `postgres:17.11-trixie`.
- **Pendiente 20 (ESSENTIALS `infra/`: "compose, Caddyfile, respaldos, despliegue"):** correcto; describe propósito, y §5 ya distingue lo existente de lo pendiente.
- **Pendiente 21 (CI inexistente en §18 paso 1) y 22 (diseño aún no implementado):** correcto; el encargo corrige hechos, no recorta diseño.
- **Pendiente 19 (principio 2 / D-12 / ESSENTIALS "corre igual en local"):** el programador hizo bien en no tocar un principio sin aprobación, pero no comparto que sea solo "enunciado de portabilidad": el principio 2 dice literalmente que API y worker "corren en Docker Compose ... en la computadora del desarrollador", y §4 corregido dice ahora lo contrario en el mismo documento. Es una contradicción interna real. D-12 ("Idéntico en local...") y la frase de ESSENTIALS sí son de capacidad y pueden quedarse. Va a "Para el humano".

## Definición de terminado (`AGENTS.md`)

- [x] Cumple el `RF-xx` / `RN-xx` correspondiente — no aplica (sin funcionalidad); cumple el encargo del humano.
- [x] Respeta las capas y pasa por el middleware — no aplica (sin código).
- [ ] `lint`, `build` y `test` en verde — no aplica; no se ejecutaron por instrucción del encargo (ningún archivo de código, esquema ni configuración cambió: `git diff --quiet` en `backend shared frontend infra` → 0).
- [x] Pruebas de autorización incluidas si hay endpoint nuevo — no aplica.
- [x] Migración de Prisma incluida y compatible hacia atrás — no aplica.
- [x] `infra/` y `.env.example` actualizados — no aplica; nada cambió ahí (pendiente 6 pospuesto a propósito).
- [x] Documentos actualizados — sí, verificados contra el repositorio, incluida la corrección de M-01.

## Documentos a actualizar

- `infra/.env.example`: comentario cruzado hacia `backend/.env.example` (pendiente 6), en el próximo encargo que toque `infra/`.
- Nada más en `docs/PRD.md`, `AGENTS.md` ni `CLAUDE.md` (salvo que el humano acoja M-03 o M-04).

## Para el humano

1. **Commit** en la rama `docs/docs-01-pendientes` tras revisar el diff: `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md` y la carpeta `docs/trabajo/DOCS-01-pendientes/` (`resumen.md` y esta revisión; se versiona). Mensaje sugerido: `docs(arquitectura): cierra pendientes de documentación de INFRA-01, BACK-01, BACK-02 y FRONT-01`.
2. **Pendiente 19 — principio 2 de §1.** Recomiendo autorizar una sola frase en el principio 2, sin renumerar: "API, worker y base de datos corren en Docker Compose en el Droplet y, mañana, en un servidor del colegio; en `dev` la API y el worker corren en el anfitrión contra los servicios del Compose de desarrollo." D-12 y la frase de ESSENTIALS se quedan. Si prefieres que el principio siga describiendo la intención (todo en Compose también en local), entonces el pendiente es de INFRA (añadir `api` y `worker` al Compose de `dev`), no de documentación.
3. **Nombre del Compose de `prod`** (M-02): confirmar `infra/docker-compose.prod.yml` o dejarlo sin nombre.
4. **Lista de variables en §4** (M-03): conservar (y corregir los dos matices) o reducir a lo estructural.
5. **D-23 y D-24:** confirmar que se quedan en §20 o pedir que se quiten (no afectan la numeración).
6. **`AGENTS.md` "Pruebas"** (M-04): opcional, quitar `127.0.0.1:5433` y `campus_dev`.
7. **Pendiente 6** (`infra/.env.example`): asignarlo al próximo encargo que toque `infra/`.
8. Arrastres registrados aquí para DOCS posteriores: `/api/salud` en §17/§18; "sin cuentas externas" frente a LiveKit Cloud de desarrollo en la fila `dev` de §4; nota de dirección visual de `CLAUDE.md` (sombras y `Toaster`).
