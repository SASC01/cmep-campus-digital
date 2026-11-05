# Aprobación — FORO-01 · actividad tipo foro

Registro del orquestador: decisiones literales del humano, hashes y commits (`AGENTS.md`, "Commits y cierre de subentregas").

## Arranque (2026-11-04)

Rama `feat/foro-01` creada por el orquestador desde `main` = `e94ee59` (fusión del PR #31, CHORE-05), en la segunda copia de trabajo (`Proyecto_PlataformaEducativa-B`). Base de "No se toca" fuera de los paquetes y de la primera subentrega: `e94ee59`. En la copia principal corre ADMIN-01 (`feat/admin-01`, desde `8d98fba`) en paralelo (`AGENTS.md`, "Trabajo en paralelo").

Instrucción literal del humano:

> PR #31 del chore de proceso fusionado. Crea la rama feat/foro-01 desde main y arranca FORO-01 en modo plan, carril normal (si hay migración, sensible). Contexto: en la copia principal corre ADMIN-01 en paralelo, que toca features/admin, features/clases (solo lectura de clase archivada) y el middleware; el plan de FORO-01 minimiza el cruce con esos archivos y deja para después de fusionar ADMIN-01 cualquier cambio en ellos. La regla de participación tardía del Foro sigue pendiente con el cliente: el plan la deja como decisión con valor por omisión (sin penalización; el maestro ve fecha y hora de cada participación) y una sola función donde cambiarla. Tráeme el plan completo con las decisiones para mí antes de lanzar la ronda 0.

## Plan del arquitecto (2026-11-04)

`plan.md` LISTO, sin preguntas bloqueantes, con DH-01 a DH-13; carril sensible (dos migraciones en 01a; política de clase archivada de las rutas nuevas en 01b). Cinco subentregas: 01a (`shared` y backend, ~30 archivos) antes de fusionar ADMIN-01; 01b a 01e después. SHA-256 del plan entregado: `e5723d33bfe0c3b7387fe44d5eed4af5ac3856e892f112ae5f5c1a325778b4ea` (145 979 bytes); copia en el scratchpad de la sesión (`plan-foro-01-v0.md`) para el `git diff --no-index` de una enmienda. Enviado al manager en modo plan.

## Revisión del plan por el manager (2026-11-04)

**CAMBIOS REQUERIDOS** (`revision.md`, SHA-256 `cc022ffe6982b9e958a01b7aa0850d70944632d135a319f26d2e3766d42039ce`): M-01 (la regla tardía tiene copias en `exigirEntregaCalificable` y en el frontend), M-02 (fijar que ningún commit de FORO-01 entra a `main` antes que ADMIN-01), M-03 (índices de `participaciones_foro`), M-04 (01c son ~44 archivos, no ~30). Dos decisiones nuevas para el humano: M-02 y el commit de fusión de 01b (aceptarlo intermedio o `--no-commit`). Devuelto al arquitecto para la Enmienda 1, con N-03, N-04, DH-02, DH-05 y DH-13. **Corrección del orquestador:** la frase "una subentrega final, separada" que cita DH-13 la escribió el orquestador en el encargo al arquitecto; no es literal del humano (lo literal está arriba, en "Arranque").

## Enmienda 1 (2026-11-04)

El arquitecto aplicó la Enmienda 1 con `Edit` (tabla E1-1 a E1-26; E1-5 a E1-8 sin uso): M-01 a M-04, N-01 a N-10, DH-02 reescrita (a/b/c/d), DH-13 anterior absorbida en DH-10, DH-13 nueva (orden de fusión, M-02) y DH-14 nueva (fusión de `main` en 01b con `--no-commit`). Subentregas: 01a ~32, 01b ~12, 01c ~28, 01d ~29, 01e ~26. SHA-256 resultante `fdfe0e3b6ba57623d7ffa5894cb9c35f002ba182bf4d03e44da94890a8bd51e8` (182 466 bytes); `git diff --no-index --stat` contra la copia `plan-foro-01-v0.md` (`e5723d33…`): 255 inserciones, 79 borrados. Copia de esta versión en el scratchpad (`plan-foro-01-e1.md`). Enviada al manager para su verificación.

**Verificación de la Enmienda 1 por el manager: CAMBIOS REQUERIDOS** solo por M-05 (la parte (i) de FORO-1A06 prohíbe la palabra `aceptaTardias` y choca con la interfaz y el armado del objeto del propio plan). M-01 a M-04 resueltos; `git diff --no-index` completo con los dos SHA-256 coincidentes. Notas N-11 (tres condiciones más para DH-14), N-12, N-13 y N-14. Sin discrepancias con las recomendaciones de las DH; matices para el humano en DH-02 (c) y DH-12. Devuelto al arquitecto para la Enmienda 2.

## Enmienda 2 (2026-11-04)

E2-1 a E2-5 (M-05, N-11, N-12, N-14, N-13); ninguna DH cambió de opciones ni de recomendación. SHA-256 resultante `f112642bdd6f1b7f7b120edf0bf77bbdc09859dc6af89ba4a1359b70c8724331` (188 064 bytes); `git diff --no-index --stat` contra `plan-foro-01-e1.md` (`fdfe0e3b…`): 51 inserciones, 9 borrados. Copia en el scratchpad (`plan-foro-01-e2.md`). Enviada al manager para su verificación.

**Verificación de la Enmienda 2 por el manager: APROBADO** (`revision.md`, "Verificación de la Enmienda 2 — FORO-01"; SHA-256 de `revision.md` `7790928888607c007aa75db10a445942696ab8d4e9bc2ab1a85b5e1b9ee8c538`). M-05 resuelto; cada hunk mapeado a E2-1 a E2-5. Dos detalles que no bloquean: la fila de DH-14 rompe la tabla de las DH (viñetas con saltos de línea en la celda) y la segunda comprobación de 01b (`git diff HEAD --stat`) no exceptúa `docs/trabajo/FORO-01-…` ni `docs/ESTADO.md`. Coincide con todas las recomendaciones de las DH. **Plan presentado al humano el 2026-11-04 (SHA-256 `f112642b…`), pendiente de su aprobación escrita (carril sensible) y de sus respuestas a DH-01 a DH-14.**

## Aprobación del humano (2026-11-05)

Texto literal del humano:

> APRUEBO EL PLAN DE FORO-01 SEGUN LAS RECOMENDACIONES

Aprobación escrita del carril sensible sobre `plan.md` con SHA-256 `f112642bdd6f1b7f7b120edf0bf77bbdc09859dc6af89ba4a1359b70c8724331` (188 064 bytes; Enmiendas 1 y 2). Las DH quedan con la recomendación: DH-01 (a), DH-02 (a), DH-03 (a), DH-04 (a), DH-05 (a, revisión en DEPLOY), DH-06 (a), DH-07 (a), DH-08 (a), DH-09 (a), DH-10 (a), DH-11 (a), DH-12 (textos de §D-9 aprobados), DH-13 (a: ningún commit de FORO-01 entra a `main` antes que ADMIN-01) y DH-14 (a: `git merge --no-commit --no-ff main` al arrancar 01b, con las condiciones de E2-2). Ninguna opción distinta de la recomendada: no hace falta enmienda antes de la ronda 0 de 01a.

Los dos detalles que no bloquean de la verificación de la Enmienda 2 (la fila de DH-14 con viñetas dentro de la celda y la excepción de `docs/trabajo/FORO-01-…` y `docs/ESTADO.md` en la segunda comprobación de 01b, que `AGENTS.md` ya deja fuera de "No se toca") solo afectan a 01b. Quedan para la Enmienda de arranque de 01b, sin tocar ahora el plan aprobado.

## Antes de la ronda 0 de 01a (2026-11-05)

Respuestas literales del humano a las preguntas del orquestador:
- ¿La copia principal (ADMIN-01) está corriendo una suite? → "No, puede correr".
- ¿Docker encendido y red de confianza con la regla del firewall? → "esta en aucam5 que para la sesion de hoy es una red de confianza". El orquestador lo lee como la red `uacam5 2` (ESTADO §5; no confiable salvo declaración por sesión), declarada de confianza **solo para la sesión del 2026-11-05**, con el riesgo residual de Ryuk aceptado por el humano si su categoría es Privada (la regla del firewall cubre solo el perfil Público). Docker no lo confirmó: lo verifica el tester con `docker info` y, si no responde, se detiene.
- ¿El `backend/.env` de la copia B apunta a una base distinta de la de ADMIN-01? → "Sí, base propia".

El orquestador lanzó la ronda 0 de 01a con esas respuestas.

## Aprobación corregida por el humano (2026-11-05)

Texto literal del humano (sustituye a la aprobación anterior en DH-05 y DH-14):

> docker encendido y
>
> Apruebo el plan de FORO-01 con DH-01 a DH-14 según la recomendación, salvo dos:
>
> DH-05: el admin puede borrar cualquier participación o réplica (con sus réplicas en cascada), con la regla general de core/autoria; nadie edita y el alumno no borra lo suyo. Si la participación borrada ya tenía calificación, la calificación se conserva. Entra en 01a como una ruta más.
>
> DH-14: la fusión de main en 01b va en un commit de fusión aparte, hecho por mí, no con --no-commit. Puede quedar en rojo hasta cerrar 01b.
>
> Que el arquitecto haga la enmienda corta con esto y los dos detalles del manager, y el manager la verifique. Las dos migraciones de 01a son PARADA: me pides confirmación con el SQL antes de cada prisma migrate dev. Luego lanza la ronda 0 de 01a.

Lo que hizo el orquestador:
- **Detuvo la ronda 0 de 01a en curso** (lanzada sobre el plan `f112642b…`, sin la ruta nueva de DH-05). El tester había aplicado C-1 y C-2 en `backend/test/sesiones-y-cadena.ataque.test.ts` (+34 −1) y `backend/test/lecturas-fx-r1.ataque.test.ts` (+6 −1) y no llegó a escribir `reporte-tester.md`. Esos cambios quedan en el árbol: el tester de la nueva ronda 0 los revisa contra `e94ee59` y ajusta C-1 a la Enmienda 3.
- Docker Desktop encendido, según el humano.
- **DH-14 (b):** el commit de fusión de `main` en 01b lo hace el humano y puede quedar en rojo hasta cerrar 01b. Es una excepción autorizada a "un commit por subentrega, nada intermedio" (`AGENTS.md`), solo para esa fusión.
- **Migraciones de 01a:** PARADA del programador antes de cada `prisma migrate dev`; el orquestador presenta el SQL al humano y espera su confirmación.
- Copia del plan previa a la Enmienda 3: `plan-foro-01-e2.md` en el scratchpad (SHA-256 `f112642b…`).

## Enmienda 3 y respuestas del humano (2026-11-05)

El arquitecto aplicó la Enmienda 3 (E3-1 a E3-7): DH-05 con la decisión del humano (ruta 17 `DELETE …/foros/:foroId/participaciones/:participacionId`, `puedeBorrarParticipacion` en `core/autoria.ts`, §D-11), DH-14 (b), los dos detalles del manager y la PARADA con SQL antes de cada `prisma migrate dev`. Con la ruta nueva, 01a pasaba de unos 30 archivos: se parte en **01a1** (~32, lo ya aprobado) y **01a2** (~14, el borrado, sobre el commit de 01a1), las dos antes de fusionar ADMIN-01 y sin entrar a `main`; 01d sube a ~30. Estado: BLOQUEADO solo para 01a2 por PB-1 y PB-2. SHA-256 resultante `6d2409dc47f34c6c75b69a6752ba98b76a5693b4b0005e52b540a8eeaecbd9fd` (215 104 bytes); `git diff --no-index --stat` contra `plan-foro-01-e2.md`: 250 inserciones, 50 borrados. Copia: `plan-foro-01-e3.md`.

Respuestas del humano (opciones elegidas en el cuestionario del orquestador):
- **PB-1:** "(a) Solo el admin (Recomendado)": solo el admin borra participaciones y réplicas; nadie más, ni el maestro sus propias réplicas.
- **PB-2:** "(a) Vuelve a sin participar (Recomendado)": al borrar la principal sin calificación, la entrega vuelve a `asignado`; con el foro abierto el alumno puede volver a publicar; cerrado, cuenta como vencida sin entregar y el maestro puede calificarla.
- **Partición y suposiciones:** "Acepto todo (Recomendado)": 01a1 y 01a2; S-E3-1 (en una clase archivada nadie borra, tampoco el admin) y S-E3-2 (borrar no avisa ni deja registro de quién borró) se quedan.

## Enmienda 4 (2026-11-05)

E4-1 (PB-1 y PB-2 resueltas con (a); S-E3-1 y S-E3-2 aceptadas; 01a2 en LISTO) y E4-2 (fila de DEPLOY de "Documentos al cierre"). Estado del plan: LISTO. SHA-256 resultante `f7e0d50084f5263aa545d077220099b03c095e44ae67a71c71bc89cd8dfa311f` (216 653 bytes); contra `plan-foro-01-e3.md`: 21 inserciones, 8 borrados; contra la versión aprobada `plan-foro-01-e2.md`: 263 inserciones, 50 borrados. Copia: `plan-foro-01-e4.md`. Enviadas las Enmiendas 3 y 4 al manager para su verificación contra la versión aprobada.

**Verificación de las Enmiendas 3 y 4 por el manager: CAMBIOS REQUERIDOS solo en 01a2** (`revision.md`, SHA-256 `19aface54af5ecffe1bade36fc921b92491175a8b1c532f40947b4f0ea4ea5c0`): M-06 (dos borrados a la vez de la misma principal sin calificar dan `500` por el `ERROR_INTERNO` de `efectoDeBorrarPrincipal` en `asignado`, no `404`), N-15 (revisión de los siete archivos de cruce con `git show --remerge-diff` en la fusión de 01b) y N-16 (frases previas a PB-1). **01a1 idéntica a lo aprobado: su ronda 0 puede arrancar.**

Respuestas del humano (cuestionario del orquestador, 2026-11-05):
- ¿ADMIN-01 corre una suite? → "No, puede correr".
- DH-14 (b), quién resuelve los conflictos de la fusión → "Los agentes (Recomendado)": programador (producción y pruebas normales) y tester (`*.ataque`) con las reglas del plan; el manager revisa los siete archivos de cruce; el humano hace el commit de fusión.
- DH-05, alumno calificado cuya principal se borra → "Sí, de acuerdo (Recomendado)": conserva la calificación, no vuelve a publicar su principal y puede seguir replicando.

Con esas respuestas, el orquestador lanzó la ronda 0 de 01a1 (tester) y, en paralelo, la Enmienda 5 (arquitecto), que no toca 01a1.

## Enmienda 5 (2026-11-05)

E5-1 (M-06: relectura de la participación tras bloquear la entrega; `204`/`404`; FORO-1A61 y FORO-1A67), E5-2 (N-15: `git show --remerge-diff` sobre los siete archivos de cruce en la fusión de 01b), E5-3 (N-16), E5-4 (DH-05, alumno calificado; FORO-1A65) y E5-5 (DH-14, conflictos por los agentes). Nada de 01a1 cambió, según el arquitecto. SHA-256 resultante `1b7daae3a6da9db255a675c32eeb21d5d9e791d17e315a76fc404b93fa26f44e` (224 247 bytes); contra `plan-foro-01-e4.md`: 61 inserciones, 24 borrados. Copia: `plan-foro-01-e5.md`. Enviada al manager para su verificación.

**Verificación de la Enmienda 5 por el manager: APROBADO** (`revision.md`, "Verificación de la Enmienda 5 — FORO-01", SHA-256 `d1b6a624…`). 01a1 sin cambios (la ronda 0 en curso sigue válida); M-06, N-15 y N-16 resueltos con sus estados vecinos; las dos decisiones del humano tal cual; 22 hunks mapeados a E5-1 a E5-5. Detalle que no bloquea, para la Enmienda de arranque de 01b: el encabezado del punto 6 de §D-R0 01b aún cita "la alternativa del punto 3", que ya es historial. **Plan vigente para 01a1 y 01a2: SHA-256 `1b7daae3a6da9db255a675c32eeb21d5d9e791d17e315a76fc404b93fa26f44e`.**

## Ronda 0 de 01a1 (2026-11-05): PARADA

El arnés rechazó la escritura de `reporte-tester.md` por el tester; el orquestador lo transcribió tal cual con nota y cotejo mecánico (las 94 filas del backend contra el árbol y contra `tabla-r0.md`, los dos hashes de lista y `git diff --numstat`): SHA-256 del reporte con la sección de cotejo `92d6866ec4970dd6d08f958b9cfa5c5c7eafd273fb2775c486672d2656b85187`. Dos motivos de PARADA:
- **P-01a1-1 (diseño):** `frontend/src/lib/errores-ch3-r2.ataque.test.ts` (T-01 de CHORE-03) exige que todo literal `"<nombre>: …"` de `shared/src` tenga su nombre en el conjunto cerrado `INVENTARIO`; el plan escribe `conForos`, `foroId` y `participacionId` (y en 01b `conTipo`), que no están. Va al arquitecto (enmienda: un C-n que los sume, como C-26 de CLASES-03b, o cambiar los mensajes).
- **P-01a1-2 (corridas):** la copia de ADMIN-01 sí estaba corriendo suites durante la ronda (`npm run test` de 08:06 a 08:39 y otra `vitest run` desde las 08:40:57), contra la respuesta "No, puede correr". El tester no corrió `vitest` ni `lint`. Hace falta una confirmación nueva del humano antes de correr.
- C-1 y C-2 heredados de la ronda detenida, sin cambios: ya estaban como pide §D-R0 01a1 (C-1 con 143 entradas, sin la ruta 17; C-2 con `foros.ts:5`). V-01: 249 `*.ataque` (94 backend, 155 frontend), solo esas dos cambiadas; ninguna saltada.

## Enmienda 6 (2026-11-05)

Atiende P-01a1-1 con la opción (a): C-6 en 01a1 (suma `conForos`, `foroId` y `participacionId` al `INVENTARIO` de `errores-ch3-r2.ataque`, con la comprobación de legibilidad), C-7 en 01b (`conTipo`), lista cerrada de literales `"<nombre>: …"` por subentrega en §D-3.2 (E6-2) y vigiladas (E6-3). Hermanos según el arquitecto: en 01a1 los tres nombres (más `alumnoId` y `tema`, ya inventariados); en 01a2, ninguno; en 01b, `conTipo`; ningún mensaje de cuerpo con prefijo. SHA-256 resultante `6398b144362db926c80ea2efdd844dcd66bafa4712330b7c665317ee4d9467d2` (231 174 bytes); contra `plan-foro-01-e5.md`: 45 inserciones, 1 borrado. Copia: `plan-foro-01-e6.md`. Enviada al manager para su verificación.

**Verificación de la Enmienda 6 por el manager: APROBADO** (`revision.md`, "Verificación de la Enmienda 6 — FORO-01", SHA-256 `116791ac…`). Opción (a) sana; hermanos completos con grep propio; de 01a1 solo cambian C-6 y la nota de vigiladas; cada hunk mapeado a E6-n. Dos detalles para la Enmienda de arranque de 01b (no bloquean): sumar `calificaciones-lecturas-estatico.test.ts:90-108` (CAL-1B08, `z.strictObject(`) a las vigiladas de 01b, y nombrar `errores-ch3-r2.ataque` en el punto 4 de §D-R0 01b (C-7). **Plan vigente: SHA-256 `6398b144362db926c80ea2efdd844dcd66bafa4712330b7c665317ee4d9467d2`.**

Nota del orquestador: la hoja de ruta de `ESTADO.md` §2b ponía CHORE-04 y el `chore` de foco y navegación antes de FORO-01. El humano arranca FORO-01 ahora, en paralelo con ADMIN-01; el orden de los dos `chore` queda para que lo decida el humano.
