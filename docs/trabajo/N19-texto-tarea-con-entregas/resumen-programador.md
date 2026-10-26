# Resumen del programador — N-19 · texto de `409 TAREA_CON_ENTREGAS`

Carril trivial, sin plan (decisión del humano, 2026-10-26). Rama `fix/n19-texto-tarea-con-entregas` desde `main` = `2d6ec8e`. Solo texto: sin cambio de comportamiento ni de firma.

## Diff resumido
- `backend/src/core/tareas/tareas.ts`, `mensajeTareaConEntregas(entregas, rolDelActor)`: misma firma y estructura (singular/plural, rama del admin). `cuantas` pasa a `cuantos` = `"1 alumno con entrega o calificación"` / `` `${N} alumnos con entrega o calificación` ``; en la rama del admin, `cuales` = `"su entrega, su calificación"` / `"sus entregas, sus calificaciones"`. Los cuatro textos resultantes son los literales de `aprobacion.md`. Comentario nuevo de una línea: `// N-19 de CALIFICACIONES-01 (2026-10-26): con P-03 (c′) una calificada sin entrega cuenta, así que el texto cuenta alumnos con entrega o calificación.`

## Pruebas normales cambiadas (lista cerrada del reporte del tester; solo esas líneas)
- `backend/src/core/tareas/tareas.test.ts`
  - :105, :108, :111, :113 (`mensajeEsperado`), usado por «PR-1B27: la matriz entregas (0, 1, 2, 30) × rol (admin, maestro, estudiante) × confirmación: con 0 nunca lanza; con al menos una, solo el admin con confirmación pasa»
  - :160, :163, :166, :169, :172, :175 (`toBe`) en «PR-1B27: los mensajes exactos de §D-3.8 en singular (1) y en plural (2 y 30), para el admin y para el maestro»
- `backend/test/tareas-borrar-con-entregas.integracion.test.ts` :229, :231, :233, :235 (`MENSAJE_MAESTRO_1`, `mensajeMaestro`, `MENSAJE_ADMIN_1`, `mensajeAdmin`), usados por «PR-1B22 (a): el maestro autor con 2 entregas recibe 409 TAREA_CON_ENTREGAS con el mensaje en plural y nada cambia», «PR-1B22 (b): el maestro con 1 entrega recibe el mensaje en singular y nada cambia», «PR-1B22 (c): el admin sin parámetro, con 1 y con 3 entregas, recibe 409 con su mensaje en singular y en plural, y nada cambia», «PR-1B22 (e): …» y «PR-1B22 (g): cuentan una entrega calificada (puesta a mano), la de un alumno dado de baja y la de uno desactivado»
- `backend/test/entregas-concurrencia.integracion.test.ts` :321, en «PR-1B22 bis (a): una entrega en curso retiene la tarea y el borrado del maestro sin parámetro espera y, al confirmar la entrega, responde 409 con un conteo que la incluye; nada se borra»
- `frontend/src/features/tareas/entregas-01e.test.tsx` :35, :37 (`MENSAJE_MAESTRO`, `MENSAJE_ADMIN`, doble del `409`), usados por PR-1E06 y PR-1E08 (b, c y d), (e), (f) y (g)

`git diff -U0` de esos cuatro archivos: exactamente 17 hunks, uno por línea de la lista. Ninguna `*.ataque` tocada; ninguna otra prueba cayó (sin PA-02).

## Grep final
`grep -rn "Esta tarea tiene\|1 entrega\b\|entregas\. Si la borras" backend/src backend/test frontend/src shared/src docs --exclude-dir=trabajo`:
- Solo formas nuevas en `tareas.ts` (:60, :62), `tareas.test.ts`, las dos integraciones, `entregas-01e.test.tsx` y las tres `*.ataque` reescritas por el tester.
- Único resto con "1 entrega": el **título** `tareas-borrar-con-entregas.integracion.test.ts:261` («PR-1B22 (b): el maestro con 1 entrega…»), que describe el escenario y no fija el texto; el tester ya lo registró fuera de alcance (reporte, :33). No lo cambié (PA-03).
- `shared/src` y `docs/` (fuera de `docs/trabajo/`): sin coincidencias.

## Verificación (de uno en uno)
| Comando | Última línea |
|---|---|
| `cd backend && npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (salida 0, sin errores; Prettier: `All matched files use Prettier code style!`) |
| `cd backend && npm run test` | `Tests  2617 passed (2617)` (`Test Files  216 passed (216)`) |
| `cd backend && npm run build` | `> tsc -p tsconfig.json` (salida 0, sin errores) |
| `cd frontend && npm run lint` | `> tsc -b` (salida 0, sin errores) |
| `cd frontend && npm run test` | `Tests  3318 passed (3318)` (`Test Files  197 passed (197)`) |

Inventarios del log del backend (`grep -c`): `"Error no controlado"` 10, `P2028` 5, `40P01` 0. Los 3 rojos de la ronda 0 pasaron a verde sin tocar sus archivos.

## Conteos
- Backend: `npx vitest list | wc -l` → 2617; `npx vitest list --filesOnly | wc -l` → 216.
- Frontend: `npx vitest list | grep -c " > "` → 3318 (`wc -l` da 3320 porque un título contiene un salto de línea); `npx vitest list --filesOnly | wc -l` → 197.

## V-01
`git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, normalizado, contra la tabla de `reporte-tester.md`: 204 archivos, `diff` vacío (iguales, las tres reescritas incluidas).

## No se toca
`git diff --stat 2d6ec8e`: `tareas.ts`, `tareas.test.ts`, `entregas-concurrencia.integracion.test.ts`, `tareas-borrar-con-entregas.integracion.test.ts`, `entregas-01e.test.tsx` (míos); `calificaciones-01a-r2.ataque.test.ts`, `entregas-01b-r1.ataque.test.ts`, `entregas-01e-r1.ataque.test.tsx` (del tester); `docs/ESTADO.md` (del orquestador, ya modificado antes de mi entrada). Más este resumen en `docs/trabajo/N19-…/`. Nada más.

Sin formateadores con `--write`, sin procesos ajenos, sin navegadores, sin commit, sin `.env`.
