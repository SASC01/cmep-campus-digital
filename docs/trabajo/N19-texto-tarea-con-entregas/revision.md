# Revisión del Manager — N-19 · texto de `409 TAREA_CON_ENTREGAS` — verificación del resumen y cierre del carril trivial
Veredicto: **APROBADO CON OBSERVACIONES**
Verificación propia: lint backend 0 · test backend `Tests  2617 passed (2617)` en 216 · build backend 0 · lint frontend 0 · test frontend `Tests  3318 passed (3318)` en 197 · build frontend 0

## Verificación del resumen — N-19 — implementación del programador

Precondiciones: Docker Desktop `28.5.1`; red `IZZI-F281-5G` en perfil **Público**, con la regla "Campus: bloquear entrada a Docker en redes publicas" (Inbound, Block, Public, habilitada) sobre `com.docker.backend.exe` (`Get-NetFirewallApplicationFilter`). Una suite a la vez: backend lint → test → build, luego frontend lint → test → build.

### Comandos y última línea
| Comando | Código | Última línea (mía) |
|---|---|---|
| `cd backend && npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (antes: `All matched files use Prettier code style!`) |
| `cd backend && npm run test` | 0 | `Test Files  216 passed (216)` · `Tests  2617 passed (2617)` · `Duration  135.53s` |
| `cd backend && npm run build` | 0 | `> tsc -p tsconfig.json` |
| `cd frontend && npm run lint` | 0 | `> tsc -b` |
| `cd frontend && npm run test` | 0 | `Test Files  197 passed (197)` · `Tests  3318 passed (3318)` · `Duration  142.57s` |
| `cd frontend && npm run build` | 0 | `✓ built in 1.34s` (aviso de tamaño de chunk de siempre; no lo pedía el encargo, lo corrí por completitud) |

### Cifras: resumen contra mi corrida
| Cifra | Resumen del programador | Mi corrida | ¿Coincide? |
|---|---|---|---|
| Backend pruebas / archivos | 2617 / 216 | 2617 / 216 | Sí |
| Frontend pruebas / archivos | 3318 / 197 | 3318 / 197 | Sí |
| Inventario `"Error no controlado"` | 10 | 10 | Sí |
| Inventario `P2028` | 5 | 5 | Sí |
| Inventario `40P01` | 0 | 0 | Sí |
| `Test timed out` (backend / frontend) | 0 / 0 (reporte del tester) | 0 / 0 | Sí |
| `deadlock detected` / `too many clients` | 0 / 0 (reporte del tester) | 0 / 0 | Sí |
| Hunks `-U0` en las cuatro pruebas normales | 17 | 17 (10 + 4 + 1 + 2, `--numstat` 10/10, 4/4, 1/1, 2/2) | Sí |
| V-01: `*.ataque` | 204, `diff` vacío contra la tabla | 204, `diff` vacío (`IGUALES`) | Sí |
| SHA-256 de `resumen-programador.md` en `aprobacion.md` | `9961f7ab…994d` | `9961f7ab…994d` | Sí |

Los 3 rojos de la ronda 0 (`entregas-01b-r1.ataque` ×2, `calificaciones-01a-r2.ataque` CAL-T-29) pasan en verde sin que nadie más tocara sus archivos. Las viñetas de "pruebas requeridas" en este carril son la lista cerrada del tester; cada línea de la lista tiene su hunk y su caso existe (los títulos citados en el resumen están en los archivos).

### Cotejo del diff (`git diff 2d6ec8e -- backend frontend shared`)
Nueve archivos en total contando `docs/ESTADO.md` (del orquestador); en los paquetes, exactamente los ocho previstos:
- `backend/src/core/tareas/tareas.ts`: solo `mensajeTareaConEntregas`. Misma firma `(entregas: number, rolDelActor: Rol): string`, la misma rama del admin y la misma de singular y plural; `cuantas` → `cuantos` y `cuales` con el texto nuevo; un comentario de N-19. `exigirBorradoConEntregasPermitido` y todo lo demás quedan intactos. Sin cambio de comportamiento: el `409`, su código y quién puede confirmar no cambian.
- Las cuatro pruebas normales de la lista cerrada (`tareas.test.ts` 10 líneas, `tareas-borrar-con-entregas.integracion.test.ts` 4, `entregas-concurrencia.integracion.test.ts` 1, `entregas-01e.test.tsx` 2): solo los literales, nada de estructura ni de títulos.
- Las tres `*.ataque` del tester: el literal o el `toContain` más una línea de comentario cada una (`entregas-01b-r1` 2 + 2, `calificaciones-01a-r2` 1 + 1, `entregas-01e-r1` 2 + 1). Son las únicas tres que difieren de la tabla de cierre de la ronda 4 de 01d en `CALIFICACIONES-01…/reporte-tester.md` (comparé las 204 de esa tabla con las actuales: solo esos tres hashes cambian) y las únicas `*.ataque` en `git diff --name-only`. El programador no tocó ninguna.
- `shared/`: sin cambios. Frontend de producción: sin cambios (el mensaje viene del servidor y la vista lo muestra tal cual).

### Los textos
Los cuatro resultados de `mensajeTareaConEntregas` son literales de `aprobacion.md` (`grep -F` de cada uno: una coincidencia en `aprobacion.md` y presentes en código y pruebas). Con `DESIGN.md` §9 están bien: tuteo, frases concretas, el dato antes que el adjetivo ("1 alumno con entrega o calificación"), el error dice qué pasó y qué hacer ("pídelo a administración"; "no se puede deshacer"), sin tecnicismos, sin palabras prohibidas y sin emojis. La regla de "el estado nunca solo con color" no aplica.

**¿"N alumnos con entrega o calificación" es la mejor forma?** Es correcta, y lo verifiqué contra el esquema: `entregas` tiene `@@unique([tareaId, alumnoId])`, así que el conteo de filas en `entregado` o `calificado` es un conteo de alumnos, también de los dados de baja o desactivados (siguen siendo alumnos de la tarea). La calificación vive en la propia fila (`entregas.calificacion`) y el desglose en `puntajes_rubrica` con `onDelete: Cascade`, así que "también se borrarán sus entregas, sus calificaciones" describe lo que pasa de verdad. Una alternativa algo más natural sería "1 alumno ya entregó o tiene calificación" / "N alumnos ya entregaron o tienen calificación", pero no la considero mejor como para pedir otra ronda (ver O-02).

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean
### O-01 — La redacción final no es la que dice la decisión del humano en `ESTADO.md` §3
Dónde: `docs/ESTADO.md:278` ("'entregas o calificaciones' y, para el admin, nombrar las calificaciones que se borran") contra `aprobacion.md` ("cuenta alumnos": "N alumnos con entrega o calificación").
Por qué importa: el texto original lo fijó el humano en S-06 de ENTREGAS-01, y la frase entre paréntesis de §3 puede leerse como la redacción que él pidió. El orquestador la ajustó a contar alumnos dentro de la autorización. Así queda más exacto: con "N entregas o calificaciones", una entrega calificada parece contar dos veces.
Qué se espera: que el humano lo sepa al recibir el bloque de commit. No pido cambio.

### O-02 — Singular del admin cuando el alumno entregó pero aún no tiene calificación
Dónde: `backend/src/core/tareas/tareas.ts:57-58`.
Por qué importa: con 1 alumno `entregado` sin calificar, el admin lee "se borrarán su entrega, su calificación…" y esa calificación no existe. No es incorrecto, porque el texto no puede saber qué tiene cada fila, y en plural pasa lo mismo. Distinguirlo exigiría pasar otro conteo y cambiar la firma, lo que queda fuera de un carril trivial.
Qué se espera: nada en N-19. Solo si el humano lo pide.

## Detalles menores
- El comentario nuevo de `tareas.ts:51` es una sola línea de unas 150 columnas, mientras que los comentarios vecinos cortan a unas 100. Prettier no corta comentarios y `lint` pasa.
- `docs/ESTADO.md` §2 dice "Como dos `*.ataque` fijan el texto viejo" y fueron tres (se sumó `entregas-01e-r1.ataque.test.tsx`, el doble del servidor). Queda corregido en el texto de cierre de abajo.
- Queda "1 entrega" en el **título** de `tareas-borrar-con-entregas.integracion.test.ts:261`. Describe el escenario y no fija el texto, así que se queda.

## Grep propio
`grep -rnE "Esta tarea tiene|1 entrega\b|entregas\. Si la borras" backend/src backend/test frontend/src shared/src`, quitando las líneas con "alumno(s) con entrega o calificación": quedan las dos plantillas de `tareas.ts:60,62` (forma nueva, con `${cuantos}`) y el título `tareas-borrar-con-entregas.integracion.test.ts:261`. En `docs/` fuera de `docs/trabajo/` (con "la entrega y los comentarios" incluido) no hay ninguna coincidencia (`grep` sale con 1). No queda ninguna forma vieja.

## Transcripción del reporte del tester
- SHA-256 de `reporte-tester.md` = `6427e6611440ec2aef5013f1dd6e5e338654ae1c6fe584faf402d8f38f75a1ba`, igual al de `aprobacion.md`.
- La tabla trae 204 filas. Su `diff` contra mi `sha256sum` de las 204 `*.ataque` actuales (`git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, en minúsculas y sin `*`) sale vacío: las 204 coinciden, las tres "Reescrita (N-19)" incluidas.
- El resto del reporte coincide con lo que el código muestra: las líneas reescritas, la lista cerrada, los rojos esperados (ahora en verde) y los inventarios (10 / 5 / 0, iguales a mi corrida). No tengo el mensaje original del tester para cotejar la prosa palabra por palabra. Lo que puedo cotejar mecánicamente (la tabla, las líneas y las cifras) coincide.

## Desacuerdos arbitrados
Ninguno.

## Documentos a actualizar
Solo `docs/ESTADO.md` (lo aplica el orquestador). `ARCHITECTURE-ESSENTIALS.md:116`, `ARCHITECTURE.md:235`, `DESIGN.md:720` y `backend/src/handlers/README.md:137` dicen "con el conteo", que sigue siendo cierto. No hace falta tocarlos.

Texto propuesto, literal:

**§2, reemplazar el párrafo de N-19 (línea 233) por:**
> Ninguno. **N-19** cerró el 2026-10-26 por carril trivial (sección 3): rama `fix/n19-texto-tarea-con-entregas` desde `main` = `2d6ec8e`; pendiente el commit del humano y el PR a `main`. **Instrucción del humano (2026-10-26): NO arrancar ADMIN hasta que el humano mande un plan nuevo para desarrollar antes de ADMIN.**

(El párrafo siguiente, de CALIFICACIONES-01, se conserva tal cual.)

**§3, en la fila de N-19 (línea 278), reemplazar la celda de destino por:**
> **Hecho en N-19 (2026-10-26), carril trivial con autorización del humano para `core/tareas/`:** `mensajeTareaConEntregas` conserva su firma y su comportamiento, y el texto cuenta alumnos ("Esta tarea tiene N alumnos con entrega o calificación…"); para el admin nombra las entregas y las calificaciones que se borran. El tester reescribió en la ronda 0 las tres `*.ataque` que fijaban el texto viejo (`entregas-01b-r1.ataque`, `calificaciones-01a-r2.ataque` y `entregas-01e-r1.ataque.test.tsx`); el programador cambió el código y cuatro pruebas normales de la lista cerrada (17 líneas). Manager: APROBADO CON OBSERVACIONES. Cifras: backend 216 archivos / 2617 pruebas; frontend 197 / 3318; 204 `*.ataque` (tabla de `docs/trabajo/N19-texto-tarea-con-entregas/reporte-tester.md`: base de V-01 del siguiente encargo)

(La tercera celda, la de referencia, puede ganar al final: `; docs/trabajo/N19-texto-tarea-con-entregas/`.)

**Línea 5 ("Última actualización"):**
> Última actualización: 2026-10-26, por el orquestador (N-19 cerrado por carril trivial, APROBADO CON OBSERVACIONES del manager; pendiente el commit del humano y el PR de `fix/n19-texto-tarea-con-entregas`; ADMIN no arranca hasta nuevo plan del humano).

## Para el humano
- O-01: la redacción quedó "N alumnos con entrega o calificación" en lugar de "entregas o calificaciones". La juzgo correcta y más exacta, pero el texto original era tuyo (S-06).
- O-02: con un solo alumno que entregó y no tiene calificación, el admin lee "su entrega, su calificación". Distinguir ese caso pide otro conteo y cambiar la firma. Queda solo si lo pides.
