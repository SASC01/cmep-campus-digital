# Estado del proyecto

Tablero vivo de CMEP Campus Digital. Solo hechos verificables; el detalle vive en los archivos a los que remite. Lo lee el orquestador al inicio de cada sesión y lo actualiza al cerrar cada encargo o antes de limpiar o compactar la sesión (`AGENTS.md`, "Reglas del equipo").

Última actualización: 2026-09-27, por el orquestador.

## 1. Encargos completados
Todos fusionados en `main` de `origin` (verificado con `git log origin/main --merges`). El historial de cada uno está en `docs/trabajo/<encargo>/`.

| Encargo | Rama | PR | Carpeta |
|---|---|---|---|
| INFRA-01 · entorno de desarrollo local | `chore/infra-01-entorno-dev` | #1 | `docs/trabajo/INFRA-01-entorno-dev/` |
| BACK-01 · esqueleto del backend | `chore/back-01-esqueleto-backend` | #2 | `docs/trabajo/BACK-01-esqueleto-backend/` |
| BACK-02 · Prisma 7 | `chore/back-02-prisma-7` | #3 | `docs/trabajo/BACK-02-prisma-7/` |
| FRONT-01 · esqueleto del frontend | `chore/front-01-esqueleto-frontend` | #4 | `docs/trabajo/FRONT-01-esqueleto-frontend/` |
| DOCS-01 · pendientes de documentación | `docs/docs-01-pendientes` | #5 | `docs/trabajo/DOCS-01-pendientes/` |
| AUTH-01 · autenticación básica | `feat/auth-01-autenticacion-basica` | #6 | `docs/trabajo/AUTH-01-autenticacion-basica/` |
| CHORE-01 · Testcontainers y `fastify-plugin` 6 | `chore/chore-01-testcontainers` | #7 | `docs/trabajo/CHORE-01-testcontainers/` |
| DOCS-02a · clases en vivo en `dev`, requisitos de DEPLOY, modelos de los agentes | `docs/docs-02a-envivo-y-modelos` | #8 y #9 (este añadió `docs/ESTADO.md` y su regla en `AGENTS.md`) | `docs/trabajo/DOCS-02a-envivo-y-agentes/` |
| AUTH-02a · cuentas y correo, backend | `feat/auth-02a-cuentas-backend` | #10 | `docs/trabajo/AUTH-02-cuentas-y-correo/` |
| AUTH-02b · cuentas y correo, frontend | `feat/auth-02b-cuentas-frontend` | #11 | `docs/trabajo/AUTH-02-cuentas-y-correo/` |
| DOCS-02b · estructura y diseño | `docs/docs-02b-estructura-y-diseno` | #12 | Sin carpeta: las decisiones están abajo, en "DOCS-02b cerrada", y en los documentos que cambiaron |
| DOCS-03 · dirección visual D3 | `docs/docs-03-direccion-d3` | #13 | Sin carpeta: las decisiones están abajo, en "DOCS-03 cerrada", y en los documentos que cambiaron |

Suite al cierre de AUTH-02b: backend 65 archivos / 657 pruebas; frontend 25 / 258, con 254 en verde y 4 fallos esperados (T-14, marcados `it.fails`). Test y build con código 0 en la verificación del manager; `npm run lint` desde la raíz con código 0 el 2026-09-26. Fuente: `docs/trabajo/AUTH-02-cuentas-y-correo/revision.md`, secciones "AUTH-02b — cierre" y "AUTH-02b — verificación de autoComplete". Hashes vigentes de las 32 `*.ataque`: `reporte-tester.md`, ronda 4 de AUTH-02b.

**AUTH-02 (a y b) cerrada** con el PR #11 (RF-03, RF-04, RF-04a, RF-04b y RF-04d; carril sensible). AUTH-02b pasó cuatro rondas del tester. T-14 quedó como riesgo aceptado, y lo que dejó para otros encargos está en la sección 3. Decisiones del humano, rondas y veredictos: `aprobacion.md`, `resumen-programador.md`, `reporte-tester.md` y `revision.md` de `docs/trabajo/AUTH-02-cuentas-y-correo/`.

**Hecho fuera de un encargo (2026-09-26):**
- **Comprobación en navegador real de AUTH-01, hecha por el humano, con resultado correcto:** registro, recarga, cierre de sesión, bloqueo al sexto intento, admin, 360 px y dos pestañas.
- **M-03 de FRONT-01 cerrado:** el humano actualizó Node a `v24.21.0` (npm `11.19.0`), que cumple el `^24.15.0` de `jsdom`. `.nvmrc` (`24`) y `engines` de la raíz (`node >=24 <25`, `npm >=11`) no fijaban 24.11: no cambiaron.

**DOCS-02b cerrada** con el PR #12 (solo documentos). Sin carpeta en `docs/trabajo/`: las decisiones quedan aquí y en los documentos que cambiaron.
  - **Decisiones de estructura:** RF-24, RF-25, RF-43 y RF-44, y el cambio de RF-15, en `docs/PRD.md`. Reglas de entregas tardías, tarea sin adjuntos y temas en ESSENTIALS. Encargos y preguntas abiertas en la sección 2b.
  - **Sistema visual:** el humano eligió la dirección C. La captura `docs/design/referencia-direccion-c.png` entra en este encargo, porque `docs/DESIGN.md` la cita. `DESIGN.md` es la fuente única del sistema visual; colores, radios y medidas salen de la captura.
  - **Decisiones del humano sobre `DESIGN.md`:**
    - `--primary` azul `#22409A` con texto `#FFFFFF`. La tinta `#16202E` queda para el texto y el contorno fuerte de 2 px. El botón tinta de la captura se documenta como el patrón "botón sobre el bloque destacado".
    - Familias: Bricolage Grotesque (500 y 700) para títulos, Atkinson Hyperlegible Next para texto y Atkinson Hyperlegible Mono para códigos de clase. Van autoalojadas con `@fontsource`; los tres paquetes existen en npm (5.3.0, OFL-1.1).
    - `--danger` y `--destructive` en `#A3341F`, elegido sobre `#A33A2B` por dar más contraste.
    - Se aceptan los siete tokens nuevos, el borde tinta en los campos y "Calificaciones" en la barra lateral.
  - **Siguen como propuesta en `DESIGN.md`:** la sombra de las capas flotantes y el velo de los diálogos, `--text-h1`, las tablas del administrador, la barra inferior en móvil, los marcadores de carga y la fila "Sin entregar".
  - **Reemplazada por D3 el 2026-09-27 (ver "DOCS-03 cerrada", abajo):** la dirección C y su botón tinta sobre el bloque destacado dejan de valer. Siguen vigentes las familias, el `#A3341F`, los siete tokens, el borde tinta de los campos y "Calificaciones".
  - **Otros documentos:**
    - `CLAUDE.md`: "Sistema de diseño" queda solo con reglas técnicas y remite a `DESIGN.md`.
    - `AGENTS.md`: `DESIGN.md` se lee en todo encargo que toque `frontend/`. Regla nueva: todo patrón visual nuevo se documenta ahí en el mismo encargo y el manager lo verifica; también está en la lista de diseño de `manager.md`.
    - `programador.md` y la pregunta abierta 1 del PRD apuntan a `DESIGN.md`.
  - `frontend/src/styles/tokens.css` no cambió: lo aplica el encargo de dirección visual (DESIGN-01).

**DOCS-03 cerrada** con el PR #13 (solo documentos; fusión `6868e4d` en `main`, commit `986bfcd`). Sin carpeta en `docs/trabajo/`: las decisiones quedan aquí y en los documentos que cambiaron.
  - **Aprobación del humano (2026-09-27):**
    - `--danger` y `--destructive` en `#A3341F`, con la regla de que el rojo nunca va como texto sobre vidrio al 62 %: solo sobre vidrio fuerte, sobre una superficie sólida o con fondo `--danger-soft`. Está registrada en `DESIGN.md` §3 (tokens y "Contraste verificado") y §10.
    - `--accent-soft-glass` en `#E8ECF8`.
    - Todos los valores marcados como "propuesta". En `DESIGN.md` la marca pasa a "propuesta aprobada (2026-09-27)"; no se borra, para conservar de dónde salió cada valor. §11 registra ese criterio.
    - La restauración de la captura de C.
  - **Decisión del humano (2026-09-27):** dirección D3, "Vidrio líquido con fondo flotante", en lugar de la C. Captura: `docs/design/referencia-direccion-d3.png`. La de C se conserva como antecedente.
  - **Respuestas del humano (2026-09-27):**
    - Rama nueva en lugar de reabrir `docs/docs-02b-estructura-y-diseno`, que ya se fusionó.
    - En la D-28, las alternativas A, B, D y D2 van solo por nombre y C va descrita.
    - "glassmorphism" también sale de `manager.md`.
    - DESIGN-01 queda en pausa y se replanea.
  - **Documentos:**
    - `docs/DESIGN.md`, reescrito para D3.
    - `docs/ARCHITECTURE.md` §20: D-28.
    - `CLAUDE.md`, "Lo que no se hace": regla del vidrio.
    - `.claude/agents/manager.md`: lista de diseño.
    - `docs/PRD.md`: §7 "Evitar", donde también figuraba "glassmorphism", y pregunta abierta 1.
  - **Contraste de D3, calculado contra el peor caso:**
    - El rojo (`#A3341F` o `#A33A2B`) no llega a AA como texto sobre vidrio al 62 %.
    - `--accent-soft` (`#E1E7F7`) no llega a AA sobre vidrio azul.
    - `DESIGN.md` los prohíbe en esas superficies y agrega `--accent-soft-glass` (`#E8ECF8`, medido en la captura).
    - El velo del fondo es obligatorio para que el aviso, el verde y el rojo pasen sobre vidrio.

## 2. Encargos en curso
- **DESIGN-01 · sistema de diseño**, **replaneado sobre D3 el 2026-09-27**. Rama `feat/design-01-sistema-de-diseno`, al mismo commit que `main` (`6868e4d`) y sin commits propios. Carpeta `docs/trabajo/DESIGN-01-sistema-de-diseno/`, sin rastrear.
  - **Antecedente de la dirección C:** `plan-direccion-c.md` y `revision-direccion-c.md` (antes `plan.md` y `revision.md`; los renombró el orquestador para que el plan nuevo no los sobrescribiera).
  - **Respuestas del humano (2026-09-27)** a las preguntas del plan de C: solo destinos de la barra que ya existen; sin tabla y admin opaco; ronda 0 del tester; división en DESIGN-01a (tokens, materiales de vidrio con respaldo sólido, fuentes, componentes base; carril sensible) y DESIGN-01b (`FondoAnimado` con orbes solo en login e inicio, `prefers-reduced-motion`; carril normal); `@fontsource` solo `latin`; controles del admin de 36 px en escritorio y 44 px en pantallas angostas; se autoriza tocar `frontend/vitest.config.ts` para M-01; acepta el cambio en los 6 `*.ataque` previstos. Reglas de D3 para el plan: orbes solo con `transform`, pantallas densas opacas, rojo nunca como texto sobre vidrio al 62 %, contraste AA medido en navegador (lo mide el humano; ningún agente abre navegador).
  - **`plan.md` nuevo: LISTO.** Contiene el plan de 01a completo y el de 01b en resumen; el detallado de 01b irá en `plan-01b.md` después de fusionar 01a.
  - **Respuestas del humano a P-07 a P-09 (2026-09-27):**
    - **P-07 (A):** 01a lleva la migración de clases, `enEspera` en los 13 botones y T-14; 01b, el marco, la composición y los orbes, en carril normal. 01b no toca las redirecciones de `require-rol.tsx`; si hace falta, se detiene y avisa. El plan extiende la condición a `require-sesion.tsx`, `require-cambio-de-contrasena.tsx` y las guardas de `router.tsx`.
    - **P-08 (B):** en la ronda 0, el tester cambia los selectores `div.rounded-lg` de 3 `*.ataque` por el auxiliar `fichaDe`, que no usa clases. Los rojos previstos del programador siguen siendo 6.
    - **P-09 (A).**
    - Aceptó el foco blanco por dentro en los botones rellenos, que confirma en H-04, y los 16 px en los campos del admin.
    - La precondición de la ronda 0 pasa a "`frontend/` sin cambios desde `6868e4d`".
  - **Cambios del orquestador autorizados por el humano:**
    - `.claude/agents/tester.md`: regla "Las pruebas de ataque no localizan elementos por clases de estilo".
    - `docs/DESIGN.md` §8: 16 px en los campos de texto, por el zoom de Safari en iOS.
  - **Revisión del manager (`revision.md`):**
    - APROBADO en la primera pasada, con la línea base en `6868e4d`: lint, test y build con código 0; 258 pruebas, 254 en verde y 4 fallos esperados (T-14); hashes de las 32 `*.ataque` sin cambios.
    - En los ajustes pidió corregir M-04 (V-08 con dos bases: `6868e4d` para `frontend/` y el commit de aprobación `<A>` para lo demás), M-05 (ningún agente hace commit) y M-06 (comillas en `git cat-file`). Los tres están corregidos; el orquestador verificó el texto de M-05 y M-06.
  - **Plan de DESIGN-01a APROBADO por escrito por el humano (2026-09-27),** registrado en `aprobacion.md`. Además:
    - acepta la condición ampliada de 01b;
    - acepta `fichaDe` como solución temporal (R-15; el pendiente va a ADMIN, sección 3);
    - juzga en H-10 `whitespace-nowrap` y el peso de los títulos de los anuncios.
  - **Commit de aprobación `<A>` = `5a32230`** (del humano, 2026-09-27), anotado en `aprobacion.md`. Es la base de V-08 fuera de `frontend/`.
  - **Ronda 0 del tester: COMPLETADA (2026-09-27),** sin condiciones de parada. Reporte en `reporte-tester.md`, transcrito por el orquestador porque el entorno impidió al tester escribirlo.
    - Las 4 pruebas de T-14 fallan en su aserción final del foco, no en la preparación.
    - `fichaDe` sustituye a `closest("div.rounded-lg")` en r2, r3 y r4, y devuelve el mismo elemento.
    - Tabla nueva de 32 hashes: base de V-01 para el programador.
    - Suite del frontend: 258 pruebas, 254 en verde y 4 fallos esperados. Lint con código 0. El orquestador lo confirmó con su propia corrida.
  - **Commit de la ronda 0:** `041e862`, del humano.
  - **Programador: pasos 1 a 14 completados (2026-09-27).** Resumen en `resumen-programador.md`, sección "DESIGN-01a". El orquestador lo confirmó con su propia corrida desde `frontend/`:
    - lint y build, código 0;
    - test, `6 failed | 402 passed | 3 expected fail (411)`, exactamente los 6 rojos previstos;
    - V-01, 32/32.
  - **Parada de V-08 en `package-lock.json`:** el `npm install` autorizado quitó `"peer": true` de entradas ajenas, sin cambiar versiones. El humano lo aceptó (registrado en `aprobacion.md`). El orquestador le había mostrado una lista de 18 entradas, que estaba mal; la correcta tiene 19 (T-01 de la ronda 1). **Falta que el humano confirme la lista de 19 antes del commit.**
  - **Tester, ronda 1: RESISTE (2026-09-27).**
    - Solo un hallazgo, T-01 (baja): era un error del orquestador en la lista del lockfile.
    - Retiró las 4 `it.fails` y adaptó la preparación a F-1. Reforzó N-01 y agregó 7 `*.ataque` nuevas, con 83 pruebas.
    - Suite del frontend: 37 archivos y 494 pruebas en verde; 266 adversarias, en 18 archivos. Lint y build con código 0.
    - La tabla de hashes de las 39 `*.ataque` está en `reporte-tester.md`, "DESIGN-01a — Ronda 1".
  - **Manager, revisión final: APROBADO**, sin bloqueantes (`revision.md`, "DESIGN-01a — final").
    - Confirmó las 19 bajas de `"peer": true` y V-08 limpia con las dos bases.
    - Revisó línea por línea r1 a r4 contra `6868e4d`: ninguna aserción se debilitó.
    - Hallazgos que no bloquean:
      - M-01: la prueba "escenario 4 de T-14" de `cuentas-view.test.tsx` no pulsa "Cancelar" ni hace el clic fuera que dice su nombre. Recomienda corregirla en el cierre.
      - M-02: `Dialog` en un portal fuera del contexto opaco del admin; va a la sección 3.
      - M-03 y detalles de `DESIGN.md` §6 y §7.3: se ajustan en el cierre.
  - **Decisiones del humano (2026-09-27, en `aprobacion.md`):**
    - M-01 se corrige en el cierre.
    - El orquestador ya aplicó en `CLAUDE.md` los textos literales del cierre; el humano los revisa en el diff.
    - La lista de 19 la confirma después de revisar el diff.
  - **Hoja de la comprobación lista:** `comprobacion-humano.md`, con los comandos para levantar todo en local, las cuentas, H-01 a H-10 en casillas y la tabla C-01 a C-12.
  - **Comprobación visual: parcial y suspendida (2026-09-27).**
    - En el bloque del login pasaron H-01, H-02 y H-04, salvo el borde de los campos. Se confirmó S-07 y se queda el anillo de foco de los enlaces.
    - El humano suspendió el resto: sin orbes, el vidrio no se aprecia.
    - **Habrá una sola comprobación completa (H-01 a H-10, con H-05 y H-06, y la tabla C-01 a C-12) después de 01b. El PR no se abre hasta que esa comprobación pase.**
    - Detalle en `comprobacion-humano.md` y `aprobacion.md`.
  - **Cierre de 01a: APROBADO por el manager (2026-09-27)** (`revision.md`, "DESIGN-01a — cierre" y "DESIGN-01a — cierre, correcciones"). No hizo falta otra ronda del tester: el cierre solo cambia la presentación.
    - **Marcas de `DESIGN.md`:** solo se aprobó lo del login. Fuentes, foco blanco por dentro en `primary` y anillo de los enlaces; `destructive` sigue como propuesta.
    - **M-01:** la prueba del escenario 4 de T-14 ya hace lo que dice su nombre.
    - **Borde de los campos:**
      - token base `--field-border` `#5A6472` (valor: propuesta; criterio: decisión del humano), con `--input: var(--field-border)`;
      - 1 px, y `--accent` al enfocar con `focus-visible`;
      - 3.81 contra el vidrio en el peor caso con orbes, verificado en `tokens.test.ts`;
      - el `outline` opaco del admin sigue con 2 px de tinta.
    - **Rectángulo grisáceo:** la sombra `--shadow-glass` se recorta en el contenedor con scroll de los anuncios. `p-2 -m-2` es un alivio parcial, sin verificar en pantalla; la solución de fondo va en 01b.
    - **Documentos:** `CLAUDE.md` con los textos del cierre, `README.md` (frontend: 37 archivos y 496 pruebas; 266 adversarias en 18 archivos) y la sección 3 de este archivo.
    - **Suite del frontend:** 37 archivos y 496 pruebas en verde; lint y build con código 0; V-01 39/39.
    - **Cerradas:** MF-05 (pérdida de foco en botones en espera) y T-14.
  - **Después del commit:** replanear DESIGN-01b en modo plan, sin tocar código hasta que el humano apruebe. Se agregan al alcance:
    - el botón para mostrar u ocultar la contraseña en los 5 formularios que la piden;
    - el pie de página, con "© <año> Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos" y los enlaces del colegio leídos de un solo archivo de configuración. Hoy son marcadores: se ven en desarrollo y no se muestran en producción.
    - Si 01b queda demasiado grande, el arquitecto propone cómo dividirlo.
    - Como el PR de 01a no se abre antes, 01b no puede salir de `main` con 01a ya fusionada; el arquitecto define la rama.
  - **Commit de 01a: `e39500a`** (del humano, 2026-09-27; 65 archivos, en la rama, sin push).
    - Antes del commit, el humano confirmó la lista de 19 del lockfile.
    - H-01 a 360 px quedó marcada a su pedido.
    - **El PR no se abre** hasta que pase la comprobación visual completa después de 01b.
  - **DESIGN-01b: `plan-01b.md` en LISTO, APROBADO por el manager (2026-09-27)** (`revision.md`, "DESIGN-01b — plan" y "DESIGN-01b — plan, correcciones"; M-01 a M-05 atendidos).
    - División propuesta en la misma rama:
      - 01b-1 (normal): fondo con orbes, marco, composición, pie y recorte de la sombra, con ronda 0 del tester para la guarda V-07;
      - 01b-2 (sensible, según P-01): el botón para mostrar u ocultar la contraseña, en 7 campos.
    - Una sola comprobación completa al final (H-01 a H-17, C-01 a C-26) antes del PR.
    - **APROBADO por escrito por el humano (2026-09-27),** registrado en `aprobacion.md`:
      - P-01 (A): 01b-1 en carril normal y 01b-2 en sensible.
      - P-02 (A): dos subentregas en la misma rama, con un commit del humano cada una.
      - P-03 (A): el mismo pie en `/admin`, opaco.
      - P-04 (A): la contraseña visible se oculta al enviar.
      - P-05 (B) con dos ajustes: nombre fijo con `aria-pressed`, el nombre de su campo cuando el formulario tiene varios, y el nombre como texto `sr-only`, sin `aria-label`.
      - Las propuestas visuales las juzga el humano en la comprobación final.
    - **Ajuste de P-05 aplicado en `plan-01b.md` y APROBADO por el manager** (`revision.md`, "DESIGN-01b — plan, ajuste de P-05").
      - Con los nombres por campo, el inventario de selectores sale limpio en todas las pruebas, así que **01b-2 no lleva ronda 0**.
      - P-06, respondida por el humano, fija los 7 nombres de botón: "Mostrar contraseña", "Mostrar contraseña nueva", "Mostrar confirmación de contraseña" y "Mostrar contraseña temporal".
    - **Commit de los documentos de 01b: `<B>` = `0fc961b`** (del humano, 2026-09-27), anotado en `aprobacion.md`. `frontend/` es idéntico a `e39500a`.
    - **Ronda 0 de 01b-1: COMPLETADA en el segundo intento (2026-09-27).**
      - El primero se detuvo porque el texto de §D-9 no tipaba con `noUncheckedIndexedAccess`.
      - El humano decidió corregirlo y repetir. El arquitecto corrigió solo el tipado; el orquestador lo verificó y restauró una línea de V-17 que el arquitecto había revertido sin querer.
      - `clases-r1.ataque` V-07 queda con la lista permitida, hash `dd520b04…`. La tabla de 39 hashes está en `reporte-tester.md`, "DESIGN-01b-1 — Ronda 0, segundo intento".
      - Corrida del orquestador: 37 archivos y 496 pruebas en verde, lint con código 0.
    - **Falta, antes del programador de 01b-1:** un commit del humano con la corrección de `plan-01b.md`, la ronda 0 y los documentos. El orquestador anota su hash como base de V-08 fuera de `frontend/`.
    - **Después:** programador de 01b-1 → tester (rondas 1 a 3) → manager → commit del humano (`<C>`) → 01b-2 → comprobación completa → cierre → PR.

## 2b. Encargos decididos, por empezar
- **AUTH-03 · ajustes de cuentas.** Va **después del encargo de dirección visual y antes de CLASES** (decisión del humano, 2026-09-26). Por ahora solo está registrado en los documentos: `docs/PRD.md` (RF-04b, RF-04d, RF-04e, RF-04f), `docs/ARCHITECTURE.md` D-04 y ESSENTIALS "Autenticación" y "Asíncrono". Contenido:
  1. El cambio obligatorio de contraseña ya no pide la temporal, solo la nueva y su confirmación. Un futuro cambio voluntario desde el perfil sí pedirá la actual.
  2. Registro de maestros por enlace: el admin lo genera con vigencia configurable (7 días por defecto), puede revocarlo y ve quién se registró con cada uno. El enlace se guarda solo como hash.
  3. Invitación masiva: el admin pega una lista de correos con nombre opcional por línea. La pantalla reporta enviadas, ya existentes e inválidas, y respeta los límites diarios de Resend.
  4. Al establecer su contraseña por invitación, el maestro ve su nombre y puede corregirlo antes de guardar.
  5. La contraseña del login y del registro en la caché de mutaciones del frontend (antes asignada a CHORE-02).
  - Prioridades fijadas por el humano el 2026-09-26: RF-04b, RF-04d y RF-04f en M; RF-04e en S. Para ADMIN, RF-57 y RF-58 en M.
  - Al planearlo, el arquitecto propone los textos para `ARCHITECTURE.md` §6, §7 y §14, que el humano dejó para ese plan.
- **Requisitos de producto nuevos (decisión del humano, 2026-09-26).** Registrados en `docs/PRD.md` y en ESSENTIALS, "Reglas de negocio que tocan código". Sin código ni encargo abierto.

  | Requisito | Prioridad | Encargo |
  |---|---|---|
  | RF-43 · Temas: el maestro organiza tareas y materiales en temas con nombre y orden; los crea, renombra y reordena, y mueve elementos entre ellos. Independientes de las categorías ponderadas | M | CLASES o TAREAS (se fija al planear) |
  | RF-44 y RF-15 · Entregas tardías: al crear o editar la tarea, el maestro elige si las acepta (por defecto sí, "con retraso"); si no, la entrega se cierra en la fecha límite | M | TAREAS/ENTREGAS |
  | RF-24 · Tarea sin adjuntos: el alumno la entrega con "Marcar como completada" | S | ENTREGAS |
  | RF-25 · Vista previa de las imágenes adjuntas a publicaciones del muro (anuncios y materiales). Los comentarios siguen siendo solo texto (decisión del humano: no admiten adjuntos) | S | CLASES |

  - `ARCHITECTURE.md` no se tocó: sus §7 (API) y §14 (modelo de datos: `tareas`, `publicaciones`, `archivos`) no reflejan aún estos requisitos. Al planear cada encargo, el arquitecto propone los textos.
  - Preguntas abiertas para esos planes: en RF-43, si un elemento puede quedar sin tema, si hay orden dentro de un tema, si un tema se puede borrar y qué ve el alumno. En RF-44, si el alumno puede anular su entrega después de una fecha límite cerrada y si mover la fecha límite reabre la entrega. En RF-24, dónde se indica que la tarea no requiere adjuntos y si el alumno puede adjuntar de todos modos.

## 3. Pendientes y su destino
| Pendiente | Destino | Dónde está anotado |
|---|---|---|
| N-01 de CHORE-01: la guarda de la base de pruebas acepta `?host=` en la URL | CHORE-02 | `docs/trabajo/CHORE-01-testcontainers/aprobacion.md` y `revision.md` |
| N-03 de CHORE-01: un `tsconfig` para `backend/test/` dentro de `npm run lint` | CHORE-02 | ídem |
| C-07 (`nombre_busqueda` normalizado en `core/`, trigramas sobre esa columna) y el resto de textos para `ARCHITECTURE*.md` | DOCS-02 | `docs/trabajo/AUTH-01-autenticacion-basica/aprobacion.md`, "Pendientes para encargos posteriores" y "Encargos siguientes" |
| Requisitos previos a abrir la plataforma a alumnos | DEPLOY | `docs/ARCHITECTURE.md` §18, "Requisitos previos a abrir la plataforma" |
| `pagos`, `admin`, `clases`, `LIMPIEZA_DIARIA`, guarda sobre todas las rutas, ESLint contra `addHook` en `handlers/` | Encargos de cada módulo | `docs/trabajo/AUTH-01-autenticacion-basica/aprobacion.md`, "Encargos siguientes" |
| Opcionales: unitarias del backend sin `globalSetup`; ESLint contra `@testcontainers/*` en `backend/src/**` | Sin encargo asignado | `docs/trabajo/CHORE-01-testcontainers/aprobacion.md` |
| Dirección visual D3, lo que queda después de 01a: fondo con orbes y su alcance por pantalla; movimiento de los orbes y su `prefers-reduced-motion`; marco y composición de las pantallas; contraste medido sobre los orbes, incluido el borde de los campos (`#5A6472`, el par de borde con menos margen); recorte de la sombra del vidrio en la lista de anuncios del login (el `p-2 -m-2` de 01a es un alivio parcial). Además: el botón para mostrar u ocultar la contraseña y el pie de página (decisión del humano, 2026-09-27). Y la comprobación visual completa del humano (H-01 a H-10 y C-01 a C-12), de la que depende abrir el PR | DESIGN-01b (por replanear) | `docs/DESIGN.md`, `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md` (resumen de 01b), `revision.md` ("DESIGN-01a — cierre") y `aprobacion.md` |
| `paths` y `cn` de shadcn (D-02 y D-03 de DOCS-01) | El primer encargo que ejecute `shadcn add` | `docs/trabajo/DOCS-01-pendientes/resumen.md` y `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md`, "Cierre de 01a" |
| `tw-animate-css` instalado y sin uso (R-09 de DESIGN-01) | Un `chore` | `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md`, R-09 |
| Radio de las casillas y `--text-display` en móvil (R-10 de DESIGN-01) | El primer encargo que los use | ídem, R-10 |
| Foco blanco por dentro sobre superficies de color, más allá de los botones rellenos (S-07 de DESIGN-01) | El encargo que construya el bloque destacado o las tarjetas de clase | ídem, S-07 |
| Si `plan-01b.md` no se escribe enseguida: un `backdrop-filter` convierte al panel en bloque contenedor de lo fijo, así que `FondoAnimado` y la barra inferior no pueden quedar dentro de una superficie de vidrio | DESIGN-01b | `docs/trabajo/DESIGN-01-sistema-de-diseno/revision.md`, M-03 de la revisión de los ajustes |
| Umbral de "fecha límite próxima" para la fila de entrega (`DESIGN.md` §7.7); el PRD no lo define | TAREAS | `docs/DESIGN.md` §7.7 |
| Contradicción entre PRD §7, "barra lateral con lista de clases", y la barra lateral compacta de `DESIGN.md` §7.4, donde esa lista no cabe (R-01 del plan de DESIGN-01) | CLASES | `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md`, R-01 |
| N-02 de AUTH-02b: confirmar en el navegador del humano que Chrome o Edge ya no rellenan el formulario de invitación (algunos navegadores ignoran `autoComplete="off"`). Sin confirmación registrada | Humano | `docs/trabajo/AUTH-02-cuentas-y-correo/revision.md`, "AUTH-02b — verificación de autoComplete" |
| La contraseña temporal del restablecimiento por el admin no caduca (S-05 de AUTH-02): decidir si caduca | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| E2-03 de AUTH-02: dos correcciones de correo cruzadas y simultáneas del admin pueden provocar un deadlock y un `500` en `corregirCorreo` (datos correctos). Riesgo residual aceptado | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| MF-04 de AUTH-02a: la baja cumple el protocolo PB-8; los cambios masivos sobre `usuarios` van en lotes cortos (P2028) | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| MF-04 de AUTH-02a: una sola instancia del worker (tope de recuperaciones fuera del bloqueo) | DEPLOY (también en `docs/ARCHITECTURE.md` §18) | ídem |
| Resto de lo que deja AUTH-02 para ADMIN, DEPLOY, LIMPIEZA_DIARIA y correo (rebotes, plantilla) | Encargos respectivos | `docs/trabajo/AUTH-02-cuentas-y-correo/plan.md`, "Pendientes para encargos siguientes" |
| AUTH-02b (MF-05): la contraseña del login y del registro queda en la caché de mutaciones de TanStack Query (el token del enlace y las contraseñas de las pantallas de cuenta ya no) | AUTH-03 (antes CHORE-02; lo movió el humano el 2026-09-26) | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`, "Decisiones del humano sobre la escalada de AUTH-02b" y "Nombre ajeno en la invitación de un maestro" |
| Buscador de Gestión de usuarios: por nombre (cualquier parte, sin importar acentos ni mayúsculas) y por correo parcial, en todos los roles, con filtro por rol (RF-57) | ADMIN | `docs/PRD.md` y `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`, "Nombre ajeno en la invitación de un maestro" |
| El admin puede editar el nombre de cualquier usuario (RF-58) | ADMIN | ídem |
| Llenar enlaces reales del pie (incluido aviso de privacidad) antes de DEPLOY | Humano, antes de DEPLOY | `docs/trabajo/DESIGN-01-sistema-de-diseno/aprobacion.md`, "Comprobación parcial, suspensión y cierre de 01a" |
| M-02 de DESIGN-01a: `Dialog` se pinta en un portal fuera del contexto opaco y denso del admin. Hoy nadie lo usa; aparecerá con la primera confirmación en un diálogo de `/admin` | ADMIN, o el primer encargo que ponga una capa flotante en una pantalla densa | `docs/trabajo/DESIGN-01-sistema-de-diseno/revision.md`, "DESIGN-01a — final" |
| Dar rol accesible a la ficha de cuenta (`role=region` con nombre accesible) y que las pruebas de ataque la localicen por ese rol en lugar de `fichaDe` (R-15 de DESIGN-01; decisión del humano, 2026-09-27) | ADMIN | `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md`, R-15, y `aprobacion.md` |
| AUTH-02b (MF-05): la temporal se pierde si el admin busca otra cuenta con el restablecimiento en vuelo; texto genérico ante un fallo de red en la pantalla de admin; la alerta de error persiste al reabrir la confirmación | ADMIN | ídem |
| AUTH-02b (MF-02): tres tarjetas de la pantalla de admin hechas a mano en lugar de `Card`; `erroresPorCampo` duplicado entre `features/auth` y `features/admin` | ADMIN | ídem |
| AUTH-02b (MF-05): el `role="status"` de la contraseña temporal envuelve también el botón "Copiar", lo que puede producir un anuncio redundante. Hay que comprobarlo con un lector de pantalla (NVDA o VoiceOver) | ADMIN | ídem, y `revision.md`, "AUTH-02b — final" |

## 4. Decisiones de esta sesión sin documento propio
Las decisiones del humano de esta sesión están registradas en el `aprobacion.md` o `resumen.md` de cada encargo (tabla de la sección 1) y, las que son reglas, en `AGENTS.md`. Estas prácticas se acordaron encargo por encargo y no tienen otro documento general:
- Los cambios en `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md` los aplica el orquestador con la autorización del humano, no el programador; los agentes proponen el texto literal.
- Cuando el entorno impide al tester escribir su reporte, el orquestador lo registra tal cual en `reporte-tester.md` con una nota de transcripción al inicio (ejemplos: `docs/trabajo/AUTH-01-autenticacion-basica/reporte-tester.md`, `docs/trabajo/CHORE-01-testcontainers/reporte-tester.md`, las tres rondas de `docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md`).
- Los archivos de `docs/trabajo/` no llevan correos reales ni identificadores de `campus_dev`. Los ficticios (`@pruebas.local`, `admin@campus.local`) pueden quedarse (decisión del humano en el cierre de AUTH-02a, MF-01).

## 5. Entorno de desarrollo del humano
Verificado el 2026-09-26, salvo donde se indica:
- Docker Desktop 4.48.0 (motor 28.5.1), encendido. Node `v24.21.0`, npm `11.19.0`.
- Infra (`infra/docker-compose.yml`, proyecto `campus-dev`), verificado el 2026-09-24: `postgres`, `minio` y `livekit` sanos, todos publicados solo en `127.0.0.1`. PostgreSQL en `127.0.0.1:5433`, base `campus_dev`, con el admin de desarrollo y una cuenta creada por el humano; ninguna prueba ni agente las toca.
- `campus_dev` tiene la migración `tokens_cuenta` aplicada y el esquema `pgboss`, que crearon la API y el worker en V-17 de AUTH-02a. La huella de las cuentas del humano quedó idéntica en las tres corridas de V-17.
- Regla del firewall de Windows "Campus: bloquear entrada a Docker en redes publicas": existe, habilitada, Inbound, Block, perfil Público, sobre `com.docker.backend.exe`. `daemon.json` sin la opción `"ip"` (no aplica en Docker Desktop 4.48).
- Red actual: `IZZI-F281`, categoría **Pública**. El humano declara que es la red de su casa y de confianza.
- **La suite del backend no se corre en una red pública o no confiable sin esa regla aplicada** (`AGENTS.md`, "Pruebas", riesgo residual de Testcontainers; pasos en `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`).
- Git local (2026-09-27): `main` al día con `origin/main` (`6868e4d`, fusión del PR #13). Rama actual: `feat/design-01-sistema-de-diseno`, con tres commits del humano sobre `main`: `5a32230` (plan aprobado), `041e862` (ronda 0) y `e39500a` (01a completa con su cierre). Sin push: la rama no existe en `origin`.

## 6. Agentes
Modelos y esfuerzo en `AGENTS.md`, "Equipo de agentes y flujo de trabajo", y en el frontmatter de `.claude/agents/*.md`: `arquitecto`, `manager` y `tester` con `opus` y esfuerzo `high`. **El `programador` usa `sonnet` con esfuerzo `medium` a prueba, hasta revisarlo después del encargo CLASES.**
