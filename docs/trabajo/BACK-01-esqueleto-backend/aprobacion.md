# Aprobación del humano — BACK-01

Fecha: 2026-09-21
Aprobó: Carlos Salazar
Carril: sensible
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Texto de la aprobación
> Apruebo por escrito el plan BACK-01 por el carril sensible, con una enmienda:
> P-01: Prisma 7, no 6. Que el arquitecto registre "Enmienda 1" en plan.md con los cambios que implica (prisma.config.ts, @prisma/adapter-pg, pg, generador). Condición: el programador verifica primero con npm view que la 7 es la línea estable y que esos paquetes existen como se describen; si no, vuelve a 6 y me avisa. P-02 a P-05: valores por defecto.
> Autorizo que apliques tú los tres cambios de AGENTS.md con el texto literal del plan. C-01 queda para DOCS-01.

## Respuestas a las preguntas no bloqueantes
| # | Respuesta |
|---|---|
| P-01 | **Prisma 7** (enmienda al valor por defecto). Condición: el programador verifica con `npm view` que 7 es la línea estable (`dist-tags.latest`) y que `prisma`, `@prisma/client`, `@prisma/adapter-pg` y `pg` existen como los describe la Enmienda 1. Si no se cumple, vuelve a Prisma 6 tal como estaba en el plan original y el orquestador avisa al humano |
| P-02 | Valor por defecto: `@campus/shared`, `@campus/backend`, `@campus/frontend` |
| P-03 | Valor por defecto: `worker.ts` mínimo sin pg-boss |
| P-04 | Valor por defecto: se ajusta ahora solo el comentario de `npm run test` en `AGENTS.md`; el párrafo de "Pruebas" va a DOCS-01 |
| P-05 | Valor por defecto: `DATABASE_URL` duplicada en ambos `.env.example` con comentario cruzado |

## Cambios a AGENTS.md
El humano autorizó que los tres cambios propuestos en la sección "AGENTS.md" del plan los aplique el **orquestador**, no el programador (precedente de INFRA-01). Se aplican al final de la implementación, para que reflejen lo que quedó en el código.

## Contradicciones entre documentos
C-01 (Testcontainers frente al PostgreSQL de infra en BACK-01) queda para DOCS-01. C-02 y C-03 no requieren acción.

## Flujo
Flujo abreviado autorizado solo para este encargo: `arquitecto` registra la Enmienda 1 → `programador` implementa (empieza por verificar versiones con `npm view`) → `manager` en modo final → el humano revisa el diff. Sin tester. Sin commit: ningún agente ejecuta `git add`, `git commit` ni `git push`.

## Pendientes para DOCS-01 (se suman a los de INFRA-01)
5. Alinear `AGENTS.md` (sección "Pruebas"), `ARCHITECTURE-ESSENTIALS.md` y `ARCHITECTURE.md` §2 con la decisión de que la prueba de integración de BACK-01 usa el PostgreSQL de infra; Testcontainers llega en un encargo posterior (C-01 de BACK-01).
6. Agregar a `infra/.env.example` el comentario cruzado de que `DATABASE_URL` debe coincidir con `backend/.env.example` (P-05 de BACK-01).

## Resultado de la condición de la Enmienda 1 — 2026-09-22
La verificación con `npm view` **falló** y el programador aplicó el camino de retorno previsto: se implementó **Prisma 6.19.3** (DEC-01 original), no Prisma 7. Salida reproducida por el Manager: `prisma dist-tags` → `latest: 8.0.0-rc.15, prev: 7.10.0`; `@prisma/client latest` → `7.10.0`; `@prisma/adapter-pg` sin `peerDependencies` (`pg` viene como dependencia normal). Fallan las comprobaciones 1, 2 ("misma versión") y 4a de la enmienda. El orquestador avisó al humano en el reporte final. Si el humano decide reabrir Prisma 7 (7.10.0 es la última estable), hace falta una Enmienda 2 con la comprobación 1 reformulada.

## Cambios a AGENTS.md aplicados por el orquestador — 2026-09-22
Aplicados tras el veredicto del Manager (APROBADO): (1) comentario de `npm run test`; (2) bloque de raíz con `npm install` y `npm run lint / test / build`; (3) línea de copia de `.env.example` en el bloque del backend. En (3) el orquestador usó la forma con guarda `if (-not (Test-Path .env)) { Copy-Item .env.example .env }` en lugar del `cp` literal del plan, por coherencia con la línea equivalente del bloque de infra, que el humano pidió expresamente para que nunca sobrescriba un `.env` existente. Se le informó al humano para que lo confirme o lo revierta.

## Decisiones del humano tras la revisión final — 2026-09-22
El humano revisó el veredicto del Manager (`revision.md`, APROBADO) y decidió:

1. **Prisma:** se confirma **6.19.3** en este encargo. El siguiente encargo de backend será **BACK-02: migrar a Prisma 7.10.0, antes de crear cualquier modelo.**
2. **M-01:** autoriza ampliar `.prettierignore` con `docs/`, `.claude/`, `infra/` y `/*.md`.
3. **M-03:** autoriza subir ESLint (`eslint`, `@eslint/js`) a `^10`, manteniendo TypeScript en 5. Si `lint` no queda en verde con ese cambio, se revierte y queda para después.
4. Confirma la forma con guarda (`if (-not (Test-Path .env)) { Copy-Item .env.example .env }`) en `AGENTS.md`.
5. **Regla de proceso nueva** (la aplica el orquestador): en `AGENTS.md`, "Reglas del equipo", y en `.claude/agents/programador.md`, "Prohibido": los formateadores y cualquier comando con `--write`, `--fix` o `-i` se ejecutan solo acotados al paquete del encargo, nunca desde la raíz sobre todo el repositorio.
6. **M-02** (`requestIdLogLabel` deprecado, `FSTDEP024`) queda para BACK-02. **M-03** y **M-04** (3 altas transitivas de `npm audit` en el CLI de Prisma) aceptados y anotados.

Puntos 2 y 3 por **carril trivial** con el `programador`; `AGENTS.md` y el agente los aplica el orquestador. Al terminar se vuelven a correr `lint`, `test` y `build`. Sin commit.

## Pendientes para BACK-02 (migrar a Prisma 7.10.0)
- Reformular la comprobación 1 de la Enmienda 1 de BACK-01: `dist-tags.latest` puede apuntar a una RC; comprobar la última estable de la línea 7 (`npm view prisma@7 version`), no `latest`.
- `prisma.config.ts` con `process.loadEnvFile()` (sin `dotenv`), generador `prisma-client` con `output` en `backend/src/adapters/db/generated/` (ignorado por git), `@prisma/adapter-pg` + `pg`, `inicializarDb({ connectionString })` desde `construirApp({ env })`.
- Retirar la importación diferida de `app.js` en `server.ts` si Prisma 7 ya no carga `.env` al importar el cliente (D4 de BACK-01).
- M-02: sustituir `requestIdLogLabel` por `logController` en `app.ts`.
- `ARCHITECTURE.md` §6: la imagen de Docker deberá incluir `prisma.config.ts` y `prisma/` para `migrate deploy` (anotar cuando toque el encargo de despliegue).

## Resultado de los ajustes por carril trivial — 2026-09-22
- **M-01 aplicado:** `.prettierignore` ampliado con `docs/`, `.claude/`, `infra/` y `/*.md`. `npx prettier --check .` desde la raíz queda en verde y los `README.md` de capa en `backend/src/**` siguen revisados.
- **M-03 revertido, queda para después:** con `eslint@10.11.0` y `@eslint/js@10.0.1` (pares compatibles, `npm install` limpio), `npm run lint` falla en `backend/test/setup.ts:6` por la regla nueva `preserve-caught-error` de `recommended` (un `throw new Error(...)` dentro de `catch` sin `{ cause }`). Según la decisión del humano se revirtió: `package.json` y `package-lock.json` quedaron idénticos al estado previo y ESLint sigue en 9.39.5. Para retomarlo: las dos líneas de `package.json` más `{ cause: error }` en `test/setup.ts`. Candidato a BACK-02.
- Regla de formateadores agregada por el orquestador en `AGENTS.md` ("Reglas del equipo") y `.claude/agents/programador.md` ("Prohibido").
- Verificación final del orquestador desde la raíz: `npm run lint` código 0 (shared y backend), `npm test` 5 archivos / 21 pruebas en verde, `npm run build` código 0.
