# Aprobación del humano — FRONT-01

Fecha: 2026-09-22
Aprobó: Carlos Salazar
Carril: normal (con aprobación escrita y lista cerrada de comandos, como los encargos anteriores)
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Texto de la aprobación
> Apruebo por escrito el plan FRONT-01 por el carril normal. P-01 a P-05: valores por defecto. Autorizo que apliques tú el bloque de AGENTS.md tras la revisión del manager. C-01 queda para DOCS-01.

## Respuestas a las preguntas no bloqueantes
| # | Respuesta |
|---|---|
| P-01 | Valor por defecto: React Router **7** (`^7.18.4`) |
| P-02 | Valor por defecto: la vista de diagnóstico vive en `features/diagnostico/` |
| P-03 | Valor por defecto: Vitest `^4.1.11`, la misma versión mayor que el backend |
| P-04 | Valor por defecto: se introduce `VITE_API_URL` opcional (vacía = mismo origen) y `frontend/.env.example` |
| P-05 | Valor por defecto: enlaces del login a `/recuperar` y `/registro` (hoy caen en la ruta comodín → `/login`) y `toast.message("El inicio de sesión aún no está disponible.")` al enviar |

## Contradicciones entre documentos
- C-01 (`styles/index.css` como entrada además de `styles/tokens.css`) queda para DOCS-01.
- C-02 (nombre del paquete de LiveKit React en `ARCHITECTURE.md`) sin efecto en este encargo.

## Cambios a AGENTS.md
El humano autorizó que el bloque "Frontend (desde /frontend)" de "Comandos" lo aplique el **orquestador** con el texto literal del plan, después de la revisión del Manager.

## Flujo
Flujo abreviado autorizado solo para este encargo: `programador` → `manager` en modo final → el humano revisa el diff. Sin tester. Sin commit: ningún agente ejecuta `git add`, `git commit` ni `git push`. Reglas vigentes de `AGENTS.md`: formateadores solo acotados al paquete; ningún agente termina procesos que no arrancó (si 5173 o 3000 están ocupados por un proceso ajeno, se detiene y pregunta).

## Pendientes para DOCS-01 (se suman a los de INFRA-01, BACK-01 y BACK-02)
9. `CLAUDE.md` ("Ubicaciones compartidas"): `styles/` tiene `index.css` (entrada de Tailwind) además de `tokens.css` (C-01 de FRONT-01).

## Resultado de la revisión final — 2026-09-22
Veredicto del Manager: **APROBADO**, sin problemas que bloqueen (`revision.md`). Verificación propia del Manager: lint 0 en los tres paquetes, build 0 (`frontend/dist/index.html`), test backend 6 archivos / 24 pruebas y frontend 6 / 13, prueba de humo por PID propio (`/login` HTML, `/api/salud` 200 vía proxy, `/api/no-existe` 404).

Hallazgos no bloqueantes:
- **M-01.** La paleta provisional de `tokens.css` es un gris neutro con botón casi negro (previsto en el plan como valores de relleno); no debe mostrarse fuera del equipo hasta elegir la dirección visual.
- **M-02.** `shadow-*`/`rounded-xs` en `input`/`card`/`dialog` y el `Toaster` de sonner usan valores por defecto de Tailwind/sonner; `tokens.css` no define `--shadow-*`. Para el encargo de dirección visual.
- **M-03.** `EBADENGINE`: `jsdom@30.1.1` pide Node `^24.15.0` y la máquina tiene 24.11.1; devDependency, las pruebas pasan. Recomendación del Manager: aceptar y subir Node a 24.15+ en local (cabe en `.nvmrc`=24 y `engines >=24 <25`), no fijar `jsdom` hacia abajo. Decisión del humano.
- Detalles menores agrupados en `revision.md`.

Desviaciones del programador D-01 a D-05 aceptadas por el Manager (D-01 `RouterProvider` desde `react-router` por doble instancia de react-router bajo Vitest, verificada; D-02/D-03 sin rastro de `cn` ni de `frontend/@/`; D-04 `hourCycle: "h23"`; D-05 Prettier acotado).

Bloque "Frontend (desde /frontend)" de `AGENTS.md`: aplicado por el orquestador tras el veredicto, con el texto literal del plan.

## Pendientes nuevos para DOCS-01 y encargos posteriores (del Manager)
10. Piezas compartidas creadas en FRONT-01 (`mensaje-error`, `cargando`, `button-variants`) y `Rol` provisional en `components/layout/types.ts`: reflejarlas en `CLAUDE.md` cuando `shared/` exponga el enum de roles.
11. `features/diagnostico/` es temporal: se mueve a `admin` o se elimina cuando exista ese módulo.
12. Dirección visual: definir `--shadow-*` y el tema del `Toaster`; sustituir la paleta provisional (M-01, M-02).
13. Próximo `shadcn add`: decidir `paths` en `tsconfig.json` para que el CLI no cree `frontend/@/`, y quitar la dependencia `cn` que agrega.
14. Ajustar el grep de V-07 (`\bslate-`) en los planes futuros.
