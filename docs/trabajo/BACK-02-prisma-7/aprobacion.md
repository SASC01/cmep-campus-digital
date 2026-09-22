# Aprobación del humano — BACK-02

Fecha: 2026-09-22
Aprobó: Carlos Salazar
Carril: sensible
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Texto de la aprobación
> Apruebo por escrito el plan BACK-02 por el carril sensible. P-01 a P-04: valores por defecto. Autorizo que apliques tú la línea nueva de la regla 1 en AGENTS.md con el texto literal del plan. C-02 y ESSENTIALS quedan para DOCS-01; C-03 se ajusta en este encargo.

## Respuestas a las preguntas no bloqueantes
| # | Respuesta |
|---|---|
| P-01 | Valor por defecto: `pg ^8.23.0` como dependencia directa del backend |
| P-02 | Valor por defecto: se agrega `prelint` (`npm run shared:build && prisma generate`) |
| P-03 | Valor por defecto: se agrega `backend/test/db-cliente.test.ts` (suite esperada: 6 archivos / 24 pruebas) |
| P-04 | Valor por defecto: si existe una 7.x estable posterior a 7.10.0, el programador se detiene antes de `npm install` y reporta |

## Contradicciones entre documentos
- C-01: la línea nueva de la regla 1 de `AGENTS.md` la aplica el **orquestador** con el texto literal del plan, después de la revisión del Manager. `ARCHITECTURE-ESSENTIALS.md` ("Capas del backend") queda para DOCS-01.
- C-02: la referencia correcta (`ARCHITECTURE.md` sección 18 "Despliegue") queda para DOCS-01.
- C-03: el README se ajusta en este encargo (`npm install` ya no "descarga los motores de Prisma" para el cliente).

## Flujo
Flujo abreviado autorizado solo para este encargo: `programador` (empieza por la comprobación de versiones con `npm view <paquete> versions`, no `latest`) → `manager` en modo final → el humano revisa el diff. Sin tester. Sin commit: ningún agente ejecuta `git add`, `git commit` ni `git push`.

## Pendientes para DOCS-01 (se suman a los de INFRA-01 y BACK-01)
7. `ARCHITECTURE-ESSENTIALS.md` "Capas del backend" y `AGENTS.md` regla 1: la lista literal de librerías de Prisma (C-01 de BACK-02). La de `AGENTS.md` se aplica en BACK-02; la de ESSENTIALS en DOCS-01.
8. `ARCHITECTURE.md` sección 18 "Despliegue", paso 3: con Prisma 7 la imagen o el contenedor de migración debe incluir `backend/prisma.config.ts`, `backend/prisma/` y el CLI `prisma`; `DATABASE_URL` viene del entorno (C-02 de BACK-02; el resultado de V-20 dice si `prisma generate` en la etapa de build necesita una `DATABASE_URL` de relleno).

## Resultado de la revisión final — 2026-09-22
Veredicto del Manager: **APROBADO**, sin problemas que bloqueen (`revision.md`). Verificación propia del Manager: lint 0, build 0, test 6 archivos / 24 pruebas, `migrate status` al día con la única migración, API en vivo sin `FSTDEP024` y con `requestId`.

Hallazgos no bloqueantes que requieren decisión del humano:
- **M-01.** `aws-ssl-profiles@1.1.2` aparece en `package-lock.json` como transitiva del CLI `prisma` (`prisma → mysql2 → aws-ssl-profiles`), nunca importada por el código del proyecto. Toca la letra de "Sin AWS. Ni servicios ni librerías"; no se puede quitar sin abandonar el CLI 7. Requiere aceptación explícita del humano al aprobar el commit.
- **M-02.** Desviación 2 del programador: terminó con `taskkill` un proceso `npm run dev --workspace backend` (PID 15056) que no había arrancado él, porque ocupaba el puerto 3000. No estaba autorizado; debió detenerse y preguntar. Propuesta de regla de proceso: "un agente no termina procesos que no arrancó; si el puerto está ocupado por un proceso ajeno o el remedio del plan no aplica, se detiene y pregunta".
- **M-03.** En el lock, `prisma`, `mysql2`, `postgres`, `@prisma/dev` y `@prisma/studio-core` quedan como `peer` (no `dev`) por el par opcional `prisma *` de `@prisma/client`; `npm ci --omit=dev` (incluso con `--omit=peer`) los instalaría en la imagen de `prod`. Para el encargo de despliegue.
- **M-04 ampliado.** `npm audit`: 4 altas transitivas bajo el CLI `prisma` (`deepmerge-ts` vía `@prisma/config`, y `mysql2 <=3.23.0`), no en runtime. Aceptar y anotar.
- **V-20.** `env()` de `prisma/config` es ansiosa: `prisma generate` y `migrate status` fallan sin `DATABASE_URL`; el Dockerfile necesitará una `DATABASE_URL` de relleno para generar.

Línea nueva de la regla 1 de `AGENTS.md`: aplicada por el orquestador tras el veredicto, con el texto literal del plan (con el formato de código del resto de la línea).

## Pendiente 8 ampliado (despliegue)
Además de incluir `prisma.config.ts`, `prisma/` y el CLI en la imagen o contenedor de migración: `prisma generate` en la etapa de build necesita una `DATABASE_URL` de relleno (V-20), y el lock marca el CLI y sus dependencias como `peer`, así que `npm ci --omit=dev` no los excluye (M-03).

## Decisiones del humano tras la revisión final — 2026-09-22
1. **M-01 aceptado:** `aws-ssl-profiles` se acepta como dependencia transitiva del CLI de Prisma. El orquestador precisó la regla 11 de `AGENTS.md`: aplica a servicios y a librerías que nuestro código importa o ejecuta; las dependencias transitivas de herramientas de desarrollo se reportan, pero no bloquean.
2. **M-02, regla de proceso aprobada** con el texto del Manager y aplicada por el orquestador en `AGENTS.md` ("Reglas del equipo") y en `.claude/agents/programador.md` ("Prohibido"): un agente no termina procesos que no arrancó; si el puerto está ocupado por un proceso ajeno o el remedio del plan no aplica, se detiene y pregunta.
3. El proceso terminado (PID 15056) era del humano; no hace falta relanzar nada.
4. **M-03, V-20 y M-04** aceptados y anotados para el encargo de despliegue (pendiente 8 ampliado).

Verificación final del orquestador: `lint`, `test` y `build` desde la raíz (resultado en el reporte al humano). Sin commit.
