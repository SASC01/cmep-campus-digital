# Estado del proyecto

Tablero vivo de CMEP Campus Digital. Solo hechos verificables; el detalle vive en los archivos a los que remite. Lo lee el orquestador al inicio de cada sesión y lo actualiza al cerrar cada encargo o antes de limpiar o compactar la sesión (`AGENTS.md`, "Reglas del equipo").

Última actualización: 2026-10-01, por el orquestador.

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
| DESIGN-01 · sistema de diseño D3 (vidrio líquido con fondo flotante) | `feat/design-01-sistema-de-diseno` | #14 (merge `58123dd`) | `docs/trabajo/DESIGN-01-sistema-de-diseno/` |
| AUTH-03 · ajustes de cuentas (03a, 03b y 03c) | `feat/auth-03-ajustes-de-cuentas` | #15 (merge `1eb9080`) | `docs/trabajo/AUTH-03-ajustes-de-cuentas/` |

Suite al cierre de AUTH-03 (2026-09-29, corrida del orquestador y del manager): backend 82 archivos / 933 pruebas, 447 adversarias en 32 archivos; frontend 65 / 1007, 612 adversarias en 32 archivos. Lint, test y build con código 0, también `npm run test` desde la raíz. La tabla SHA-256 vigente de las 64 `*.ataque` está en `docs/trabajo/AUTH-03-ajustes-de-cuentas/reporte-tester.md`, "AUTH-03c — Ronda 2".

**AUTH-03 cerrada** el 2026-09-29 con el PR #15 (fusión `1eb9080` en `main`), en carril sensible, con RF-04b, RF-04d, RF-04e, RF-04f y MF-05 de AUTH-02b.
  - **Qué entró:**
    - **03a:** el cambio obligatorio pide solo la contraseña nueva y exige una sesión viva del mismo usuario; el maestro ve y corrige su nombre al activar la invitación; las contraseñas del login y del registro salen de la caché de mutaciones.
    - **03b:** enlaces de registro de maestros. Tabla `enlaces_registro`, `/admin/maestros` y `/registro-maestro`.
    - **03c:** invitación masiva, con cupo diario, índice `(tipo, creado_en)`, encolado en lote y ritmo del worker.
  - **Commits del humano:** `d8cb198` (03a), `32afeef` (03b) y `3399c79` (03c y cierre).
  - **Plan:** seis enmiendas. Todas las decisiones y los arbitrajes están en `aprobacion.md` y `revision.md`.
  - **Tester:**
    - 03a: RESISTE en la ronda 3 (T-01 y T-02).
    - 03b: RESISTE en la ronda 3 (T-03 a T-12).
    - 03c: RESISTE en la ronda 2 (T-13 a T-15).
  - **Manager:** APROBADO en cada subentrega.
  - **Comprobación del humano:** H-1 a H-6 "bien", el 2026-09-29, incluida una segunda pestaña en H-1 (`comprobacion-humano.md`). H-6 cierra N-02 de AUTH-02b.
  - **Carril trivial antes del commit de 03c:** el mensaje del cupo usa el singular con 1 ("1 invitación más").
  - **Reglas nuevas que dejó el encargo** (`AGENTS.md`):
    - "Commits y cierre de subentregas": sin commit de aprobación, un commit por subentrega, sin pedir hashes y revisión del diff opcional;
    - "Resúmenes verificables del programador", también en `programador.md` y `manager.md`.
  - **Documentos actualizados al cerrar cada subentrega:** `ARCHITECTURE.md` (§6, §7, §8, §9, §14 y §18), ESSENTIALS, `CLAUDE.md`, `DESIGN.md` (§7.1, §7.3, §7.4, §7.8 a §7.10 y §7.13 a §7.15) y `README.md`. Los hashes están en `aprobacion.md`.

Suite al cierre de DESIGN-01 (2026-09-28, corrida del orquestador y del manager): frontend 52 archivos / 875 pruebas en verde, de ellas 540 adversarias en 26 archivos; lint, test y build con código 0. Hashes vigentes de las 47 `*.ataque` del frontend: `docs/trabajo/DESIGN-01-sistema-de-diseno/reporte-tester.md`, "DESIGN-01b — cierre: tiempo límite (M-01)". El backend no cambió desde AUTH-02b.

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

**DESIGN-01 cerrada** con el PR #14 (fusión `58123dd` en `main`, 2026-09-28), el sistema de diseño D3 ("Vidrio líquido con fondo flotante"):
  - **Rama:** `feat/design-01-sistema-de-diseno`, fusionada; el último commit de la rama es `bf7db13` (cierre de DESIGN-01).
  - **Historial completo:** `docs/trabajo/DESIGN-01-sistema-de-diseno/`, en particular `aprobacion.md`, que registra cada decisión del humano con fecha. Allí están también los planes (`plan.md` para 01a y `plan-01b.md`), las revisiones, los reportes del tester, el resumen del programador y la comprobación del humano. Los planes y la revisión de la dirección C se conservan como antecedente.
  - **Subentregas y commits del humano:**

    | Commit | Qué entra |
    |---|---|
    | `5a32230` | Plan de 01a aprobado |
    | `041e862` | Ronda 0 de 01a |
    | `e39500a` | 01a: tokens, vidrio con respaldo sólido, fuentes `@fontsource`, componentes base, `enEspera` en 13 botones, T-14 y el cierre de 01a (borde de campos de 1 px, `--field-border`) |
    | `0fc961b` | Plan de 01b aprobado |
    | `8feab74` | Ronda 0 de 01b-1 |
    | `73e29c5` | 01b-1: fondo con orbes, marco, composición, pie con marcadores y recorte de la sombra |
    | `d2e5ff7` | 01b-2: botón para mostrar la contraseña, en carril sensible; y el cierre de 01b: O-7, `Seleccion` en `types.ts`, `CLAUDE.md` y `README.md` |
    | `bf7db13` | Cierre de DESIGN-01: marcas de `DESIGN.md` aprobadas, revisión rápida del humano y regla de comprobación breve en `AGENTS.md` |

  - **Veredictos:**
    - Tester: 01a RESISTE en la ronda 1; 01b-1 en la ronda 3; 01b-2 en la ronda 2.
    - Manager: APROBADO en cada subentrega y en cada cierre.
  - **Comprobación del humano:** revisión rápida de 7 puntos, todos "bien" (2026-09-28). Lo demás queda cubierto por pruebas automáticas y el contraste por `tokens.test.ts`.
  - **Suite final del frontend:** 52 archivos y 875 pruebas en verde; 540 adversarias en 26 archivos; lint y build con código 0.
  - **Reglas nuevas que dejó el encargo:**
    - `AGENTS.md`, "Trabajo visual": V-08 contra el commit de aprobación, commit por subentrega, ajustes visuales por el carril trivial, una sola ronda del tester para validaciones de configuración, y comprobación humana de máximo 10 minutos y 7 puntos.
    - `.claude/agents/tester.md`: sin selectores de clase.
    - `CLAUDE.md`: `enEspera`, escalas anuladas, vidrio, lo fijo fuera del vidrio, `ErrorDeCampo`, `CampoContrasena` y ubicaciones nuevas.

## 2. Encargos en curso
**CLASES-01 · clases, personas y muro.** Rama `feat/clases`, que arrancó en `<R>` = `3399c79` (mismo contenido que `origin/main`, `1eb9080`). Carpeta: `docs/trabajo/CLASES-01-clases-y-muro/`.
  - **Plan:** aprobado por escrito por el humano el 2026-09-29, en carril sensible. Son cuatro subentregas, cada una con un commit: CLASES-a (pertenencia y propiedad de la clase, clases, código e inicios), CLASES-b (compañeros, roster, buscador y alta manual), CLASES-c (muro) y CLASES-d (archivos y vista previa).
  - **Revisiones del plan:** la del manager (`revision.md`) aprobó el plan después de la enmienda 1. La enmienda 2, con las decisiones del humano, O-01 y O-02, recibió CAMBIOS REQUERIDOS solo para CLASES-b (M-03). La enmienda 3, que la corrige, quedó APROBADA. La enmienda 4 registra el cierre de a (regla nueva de la guarda de `:claseId`, separadores del código en lista cerrada, U+2028/U+2029, `normalizarTextoLargo` antes de validar, O-01 extendida a `inscritas`/`impartidas`).
  - **CLASES-a cerrada el 2026-09-29 y confirmada con el commit del humano `<Ca>` = `855069b` (2026-09-30, 103 archivos).** Autorización real por clase (`requireMembership`/`requireOwnership` y la guarda de `:claseId`), migración `20260929232924_clases_e_inscripciones` aplicada en `campus_dev`, crear/editar clase, código de invitación, unirse, inicios de estudiante y maestro (`BienvenidaView` borrada), `features/clases`, `services/sesionService.ts`, ESLint contra `addHook` en `handlers/`, M-20 y `--text-display-compacto`.
    - **Tester:** ronda 0 (7 `*.ataque` adaptadas), ronda 1 ROTO (11), ronda 2 ROTO (6), ronda 3 ROTO (2: T-18 y T-19) → escalada; el humano autorizó una **cuarta ronda cerrada** y aprobó la regla de T-18. Ronda 4: **RESISTE**, sin hallazgos nuevos. Ningún hallazgo fue de seguridad. 79 `*.ataque` al cierre (tabla en `reporte-tester.md`, "CLASES-a — Ronda 4, regresión final"; base de V-01 para b). El tester no pudo escribir su reporte en ninguna ronda: el orquestador lo transcribió tras verificar hashes y conteos (§4).
    - **Manager:** 8 verificaciones del resumen (3 devueltas), revisión final ESCALAR AL HUMANO (M-06, contraste sobre vidrio azul, nuevo) y cierre APROBADO tras la ronda 4.
    - **Suite al cierre de a** (corrida del orquestador, 2026-09-29): backend 97 archivos / 1059 pruebas, frontend 78 / 1106; lint y build con código 0 desde la raíz. La primera corrida completa del backend cayó por la espera en cadena de `LOCK TABLE usuarios` (solo tiempos límite, §3); la segunda salió limpia con PA-07 en orden.
    - **Documentos aplicados al cierre (textos (a) del plan):** `ARCHITECTURE.md` §6 (fila 6 y regla de la guarda), §7 (filas `usuarios` y `clases`) y §14 (`usuarios`, `clases`, `inscripciones`); ESSENTIALS ("Autorización" y "Reglas de negocio"); `CLAUDE.md` (filas `auth` y `clases`, `formatearFechaLarga`, `sesionService`); `PRD.md` §7. Hashes en `aprobacion.md`.
  - **CLASES-b cerrada el 2026-10-01 y confirmada con el commit del humano `<Cb>` = `e9df1f0` (2026-10-01, 59 archivos).** Compañeros (`GET …/personas`, sin datos sensibles), roster del dueño con estado de pago y restricción (`GET …/alumnos`), buscador con correo enmascarado en el backend (`GET …/alumnos/candidatos`), alta manual y baja con registro en `movimientos_inscripcion` (migración `20260930235837_movimientos_inscripcion`, orden por `secuencia`), paginación por claves, `EstadoPagoBadge` y `AccesoRestringidoBadge`, normalización del término de búsqueda definida una sola vez en `shared/`, y los patrones de foco de `DESIGN.md` §7.14 (fila que se borra; control que desaparece por su propia acción) con el mecanismo generalizado en `hooks.ts`. También lo heredado de a (N-04 y textos fijos).
    - **Tester:** ronda 0 (2 `*.ataque` adaptadas), ronda 1 ROTO (2), ronda 2 ROTO (3), ronda 3 ROTO (2) → escalada; el humano autorizó una **cuarta ronda**; su regresión dio ROTO (2, en el hook nuevo) → segunda escalada; el humano autorizó una **quinta ronda mínima**; regresión final **RESISTE**. Ningún hallazgo fue de seguridad: autorización (48 combinaciones), fugas de estado de pago y correo, enmascarado, movimientos bajo concurrencia y paginación resistieron desde la ronda 1; todos los hallazgos fueron de bordes (longitud del término) y de foco con teclado. 87 `*.ataque` al cierre (tabla en `reporte-tester.md`, "CLASES-b — Ronda 5, regresión final"; base de V-01 para c). Dos adaptaciones por decisión posterior: C-16 (a) y C-17 (b).
    - **Manager:** 7 verificaciones del resumen (1 devuelta: PR-B05 intermitente), revisión final ESCALAR y cierre APROBADO tras las rondas 4 y 5.
    - **Suite al cierre de b** (corrida del orquestador, 2026-10-01): backend 104 archivos / 1144 pruebas, frontend 86 / 1201; lint y build con código 0 desde la raíz. La primera corrida completa del backend cayó por la espera en cadena de `LOCK TABLE usuarios` (solo tiempos límite y dos rebotes conocidos, §3); la segunda salió limpia con PA-07 en orden.
    - **Documentos aplicados al cierre (textos (b) del plan):** `ARCHITECTURE.md` §7 (fila `clases` con las rutas de b), §14 (diagrama y fila `movimientos_inscripcion`) y "Reglas de acceso a datos" (búsqueda con la normalización única); ESSENTIALS ("Tablas", "Reglas de datos" y "Reglas de negocio": alta manual); `CLAUDE.md` (`components/` con los dos badges); `PRD.md` RN-04. Hashes en `aprobacion.md`. La Enmienda 5 del plan registra el cierre de b y autoriza en c `panel-mis-clases.tsx` y el criterio de foco para sus "Ver más".
  - **CLASES-c cerrada el 2026-10-01 (noche), pendiente del commit `<Cc>` del humano.** Muro de la clase: publicaciones (anuncio y material) y comentarios con paginación por cursor validado, borrado por el maestro y "mis comentarios" por el autor, los tres avisos encolados en la misma transacción (`PUBLICACION_CREADA`, `MATERIAL_CREADO`, `COMENTARIO_CREADO`, con `AVISO_FALLIDO`, sin consumidor hasta NOTIFICACIONES), migración `20261002003225_publicaciones_y_comentarios` con su `CHECK`, la regla única de contenido visible en `shared/src/clases.ts` (también en `nombreClaseSchema`), `normalizarTextoLargo` en `shared/` aplicada en servidor y formularios, los triviales heredados de b (avisos en los callbacks de los hooks, `focoPerdido` en `lib.ts`, `ConClaseDeLaRuta` en cinco vistas), el foco de los tres "Ver más" y los textos de cursor inválido. Base dentro de los paquetes `<Cb>` = `e9df1f0`. Decisión del humano (2026-10-01): los cuatro triviales heredados de b entraron en c, no en un commit aparte. Detalle en `aprobacion.md`, "CLASES-c (desde el 2026-10-01)":
    - **Enmienda 6** (regla única de contenido visible en `shared/src/clases.ts`: visible = L, N, P o S no ignorable por defecto, ni U+2800 ni U+1D159, la misma definición de `nombreSchema`; mínimo 2 visibles en el nombre de la clase y 1 en título, anuncio y comentario; `Cf` admitidos pero no cuentan; C-18; los triviales de b como §D-C5 bis) APROBADA por el manager tras dos correcciones mecánicas (M-21, M-22 → C-19). **Enmienda 7** (PA-16: el caso E6 de `bloqueo-usuario.integracion.test.ts` suma `publicaciones.ts`; la ronda 0 de d busca listas cerradas también en pruebas normales) APROBADA. El arquitecto no puede escribir `plan.md` (solo `Write`, 243 KB): entregó ediciones con ancla y el orquestador las transcribió con cotejo mecánico (§4).
    - **Ronda 0 del tester:** 3 `*.ataque` adaptadas (C-2, C-12, C-19), C-18 confirmado; tabla de 87 hashes, base de V-01 para c.
    - **Programador:** pasos 28 a 34 completos; migración `20261002003225_publicaciones_y_comentarios` aplicada en `campus_dev` con el `CHECK`; PA-16 cerrada con la Enmienda 7. **Manager: resumen ACEPTADO a la primera** (backend 107 archivos / 1182 pruebas, frontend 90 / 1230; lint y build en 0; 57 IDs con caso; PA-07 arbitrada: las repeticiones de los dos `P2028` aceptados en corridas que caen por CHORE-02 no cuentan). No bloquean: N-C4 (una línea de un caso existente cambió de literal a escape), N-C5 (avisos de crear en callbacks de `mutate`), N-C6 (cursor sin validar en publicaciones y comentarios).
    - **Tester:** ronda 1 ROTO (5: T-29 cursor borrado, T-30 avisos perdidos al crear, T-31 máximo sobre el texto crudo, T-32 unidad de los máximos, T-33 mensajes en inglés; ninguno de seguridad), con arbitrajes del manager y **Enmienda 8** (T-32 corrigió el plan, no el esquema; C-20 del tester); ronda 2 ROTO (1: T-34, texto técnico tras el `400` del cursor); ronda 3 ROTO (1: T-35, "Vuelve a abrirlo" no recuperaba el muro) → escalada; el humano autorizó una **cuarta ronda mínima** (pulsar "Muro" con el muro en error vuelve a pedir la lista; solo `muro-view.tsx` y su prueba); regresión final **RESISTE**. 97 `*.ataque` al cierre (tabla en `reporte-tester.md`, "CLASES-c — Ronda 4, regresión final"; base de V-01 para d). El tester se interrumpió una vez por el límite de uso de la API y se retomó con su contexto.
    - **Manager:** 5 verificaciones del resumen, ninguna devuelta; revisión final ESCALAR AL HUMANO (M-23 = T-35) y cierre APROBADO tras la cuarta ronda. **Enmienda 9** (cierre) registrada. El humano autorizó además una viñeta nueva de `ARCHITECTURE.md` §14 sobre la paginación por cursor.
    - **Suite al cierre de c** (corrida del orquestador, 2026-10-01, noche): backend 111 archivos / 1226 pruebas, frontend 96 / 1293; lint, build y `npm run test` desde la raíz con código 0 a la primera; PA-07 solo los dos `P2028` aceptados.
    - **Documentos aplicados al cierre (textos (c) de la Enmienda 9):** `ARCHITECTURE.md` §7 (fila `clases` con las 7 rutas del muro; párrafo de contenido visible y normalización), §8 (las tres colas y la frase para NOTIFICACIONES) y §14 (filas `publicaciones` y `comentarios`; viñeta de paginación por cursor). ESSENTIALS, `CLAUDE.md`, `PRD.md` y `README.md` sin cambios en c; `DESIGN.md` §7.3, §7.14 y §7.18 por el programador (propuesta). Hashes en `aprobacion.md`.
    - **Siguiente:** CLASES-d (paso 37, ronda 0 del tester) después del commit `<Cc>`, con base `<Cc>` dentro de los paquetes y V-01 desde las 97 del cierre de c; la ronda 0 de d busca listas cerradas también en pruebas normales (Enmienda 7).
  - **Decisiones del humano:** todas las recomendadas, salvo P-05 (f) y (g). En (f), el buscador muestra el correo enmascarado. En (g), las altas manuales y las bajas se registran en `movimientos_inscripcion`. Texto literal y hashes en `aprobacion.md`.
  - **Comprobación humana:** una sola, al final de CLASES-d.

## 2b. Encargos decididos, por empezar
- **Requisitos de producto nuevos (decisión del humano, 2026-09-26).** Registrados en `docs/PRD.md` y en ESSENTIALS, "Reglas de negocio que tocan código". Sin código ni encargo abierto.

  | Requisito | Prioridad | Encargo |
  |---|---|---|
  | RF-43 · Temas: el maestro organiza tareas y materiales en temas con nombre y orden; los crea, renombra y reordena, y mueve elementos entre ellos. Independientes de las categorías ponderadas | M | TAREAS (decisión del humano, P-03 de CLASES-01; las respuestas a sus preguntas abiertas quedaron en `docs/trabajo/CLASES-01-clases-y-muro/plan.md`, P-03) |
  | RF-44 y RF-15 · Entregas tardías: al crear o editar la tarea, el maestro elige si las acepta (por defecto sí, "con retraso"); si no, la entrega se cierra en la fecha límite | M | TAREAS/ENTREGAS |
  | RF-24 · Tarea sin adjuntos: el alumno la entrega con "Marcar como completada" | S | ENTREGAS |
  | RF-25 · Vista previa de las imágenes adjuntas a publicaciones del muro (anuncios y materiales). Los comentarios siguen siendo solo texto (decisión del humano: no admiten adjuntos) | S | CLASES (CLASES-d de CLASES-01) |

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
| `paths` y `cn` de shadcn (D-02 y D-03 de DOCS-01) | El primer encargo que ejecute `shadcn add` | `docs/trabajo/DOCS-01-pendientes/resumen.md` y `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md`, "Cierre de 01a" |
| Área segura de iOS en la barra inferior (`viewport-fit=cover` y `env(safe-area-inset-bottom)`): no verificada en DESIGN-01, porque `index.html` no se tocó | El primer encargo que toque `index.html`, o DEPLOY antes de abrir a alumnos | `docs/trabajo/DESIGN-01-sistema-de-diseno/plan-01b.md`, "Riesgos" |
| M-02 del cierre de DESIGN-01b: varias pruebas de ataque que montan el router tardan de 2 a 2.6 s en la suite completa del frontend, cerca del límite de 5 s. Decidir un `testTimeout` del frontend en `vitest.config.ts` (con autorización del humano) o repartir las pruebas pesadas | Un `chore` | `docs/trabajo/DESIGN-01-sistema-de-diseno/revision.md`, "DESIGN-01b — cierre" |
| `tw-animate-css` instalado y sin uso (R-09 de DESIGN-01) | Un `chore` | `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md`, R-09 |
| Radio de las casillas y `--text-display` en móvil (R-10 de DESIGN-01) | El primer encargo que los use | ídem, R-10 |
| Foco blanco por dentro sobre superficies de color, más allá de los botones rellenos (S-07 de DESIGN-01) | El encargo que construya el bloque destacado o las tarjetas de clase | ídem, S-07 |
| Umbral de "fecha límite próxima" para la fila de entrega (`DESIGN.md` §7.7); el PRD no lo define | TAREAS | `docs/DESIGN.md` §7.7 |
| Contradicción entre PRD §7, "barra lateral con lista de clases", y la barra lateral compacta de `DESIGN.md` §7.4, donde esa lista no cabe (R-01 del plan de DESIGN-01) | CLASES | `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md`, R-01 |
| La contraseña temporal del restablecimiento por el admin no caduca (S-05 de AUTH-02): decidir si caduca | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| E2-03 de AUTH-02: dos correcciones de correo cruzadas y simultáneas del admin pueden provocar un deadlock y un `500` en `corregirCorreo` (datos correctos). Riesgo residual aceptado | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| MF-04 de AUTH-02a: la baja cumple el protocolo PB-8; los cambios masivos sobre `usuarios` van en lotes cortos (P2028) | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| MF-04 de AUTH-02a: una sola instancia del worker (tope de recuperaciones fuera del bloqueo) | DEPLOY (también en `docs/ARCHITECTURE.md` §18) | ídem |
| M-18 de AUTH-03a: `usarTokenYCambiarContrasena` no vuelve a leer `activo` bajo el bloqueo. Si la cuenta se desactiva entre `decidirUsoDeToken` y la transacción de `establecer-contrasena`, no se detectaría. Es anterior a AUTH-03 y hoy no hay ninguna ruta de baja | ADMIN, junto a PB-8 | `docs/trabajo/AUTH-03-ajustes-de-cuentas/revision.md`, "Revisión final — AUTH-03a" |
| M-20 de AUTH-03b: `components/estado-vacio.tsx` exporta `AccionEstadoVacio`, un tipo que no es la interfaz de Props, desde el archivo de un componente (regla 6 de `CLAUDE.md`) | El próximo encargo que toque `components/` después de AUTH-03 | `docs/trabajo/AUTH-03-ajustes-de-cuentas/revision.md`, "Revisión final — AUTH-03b" |
| M-21 de AUTH-03b: `EnlaceNuevo` (`features/admin/components/enlace-nuevo.tsx`) envuelve el botón "Copiar enlace" en su `role="status"`, igual que la contraseña temporal. Es el mismo caso que la fila de MF-05 sobre el `role="status"` (anuncio redundante), que ahora cubre los dos archivos | ADMIN | ídem |
| M-22 de AUTH-03b: `DESIGN.md` §7.9 dice "Encabezado: fijo", pero `components/ui/table.tsx` no lo fija. Con listas cortas no se nota | ADMIN, al construir la tabla de usuarios (junto a la forma de paginar, P-02 de AUTH-03) | ídem |
| M-17 de AUTH-03a: extraer `ContenidoConToken` de `establecer-contrasena-view.tsx` a `components/` (estilo de `CLAUDE.md`) | El próximo encargo que toque `features/auth` después de AUTH-03 | ídem |
| Observación (a) de AUTH-03c. El ritmo de 250 ms entre correos no llega a actuar, porque el sondeo de pg-boss (cada 2 s, un trabajo a la vez) marca el paso: un lote de 80 invitaciones tarda unos 2.7 min. `ARCHITECTURE.md` §9 ya lo dice. Si el volumen lo pide, ajustar `pollingIntervalSeconds` o dar prioridad a las recuperaciones | DEPLOY | `docs/trabajo/AUTH-03-ajustes-de-cuentas/revision.md`, "Revisión final — AUTH-03c" |
| Observación (c) de AUTH-03c: `features/admin/data.ts` tiene textos sin usar o repetidos. El singular del cupo ya se corrigió antes del commit de 03c | ADMIN, por el carril trivial, antes de DEPLOY | ídem |
| Observación (d) de AUTH-03c: un U+202E en una línea no válida de la invitación masiva puede invertir en pantalla la insignia del motivo. Hay que aislar el texto con `<bdi>` en `resultado-invitacion-masiva.tsx` | ADMIN | ídem |
| Observaciones (e) y (f) de AUTH-03c. (e) En el caso reforzado "dos lotes lanzados a la vez…", la espera de la precondición (hasta 10 s) corre dentro de una transacción de Prisma de 5 s y podría dar un `P2028` que PA-07 no excluye. (f) El token del año 2100 de ese caso suma 1 al conteo global mientras existe. Hoy no afecta a ninguna prueba | CHORE-02 o el primer `chore` de pruebas | ídem |
| Prueba A3 de `backend/test/bloqueo-usuario.integracion.test.ts`, intermitente: falló una vez (`expected 401 to be 204`) en una corrida por paquete y pasó en las demás. La causa probable es que `conFilaRetenida` da por formada la primera operación cuando cualquier proceso queda bloqueado detrás de la retención; con archivos en paralelo, eso puede invertir el orden. No es un defecto de producción: en ese orden el sistema responde 401 sin escribir. Decisión del humano (2026-09-29): no se corrige en AUTH-03 | CHORE-02 o el primer `chore` de pruebas | `docs/trabajo/AUTH-03-ajustes-de-cuentas/revision.md`, "Verificación del resumen — AUTH-03c — carril trivial" |
| Dos pruebas previas a CLASES fallan con el equipo cargado (detectado por el manager en la verificación del resumen de CLASES-a, 2026-09-29, con una aplicación pesada abierta): la paginación de `backend/test/enlaces-registro.integracion.test.ts` (AUTH-03b), que recorre una lista global mientras otros archivos la llenan en paralelo, y `backend/src/workers/ritmo-03c-r1.ataque.test.ts` (AUTH-03c), que mide milisegundos con reloj real. Con el equipo libre pasan (corrida 3: 987/987). No las causa CLASES-a. **Causa raíz encontrada por el manager (verificación de la corrección de la ronda 1 de CLASES-a):** una espera en cadena preexistente entre `backend/test/cuentas-r1.ataque.test.ts:130` (`LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE`) y las retenciones deliberadas de una fila de `usuarios` en `cuentas-r3.ataque` y `bloqueo-usuario.integracion`; PostgreSQL no lo detecta como interbloqueo porque una parte de la espera está en la aplicación, y solo lo deshacen los tiempos límite de 15 s, que tumban en cascada de 10 a 12 archivos. Con 92 archivos cambió el orden de arranque y aparece en 2 de cada 3 corridas completas. Mitigación propuesta: `lock_timeout`/`NOWAIT` en ese `LOCK TABLE`, o un grupo secuencial para esos archivos. El manager sugiere adelantarlo antes de CLASES-b | CHORE-02 o el primer `chore` de pruebas, junto a A3 | `docs/trabajo/CLASES-01-clases-y-muro/revision.md`, "Verificación del resumen — CLASES-a — implementación" |
| Un tercer `P2028` fuera de la exclusión de PA-07, en `POST /api/auth/cambiar-contrasena` (`cambiarContrasenaPropia`, `adapters/db/usuarios.ts:293`): en una corrida de la suite caída por la espera en cadena de `LOCK TABLE usuarios`, la transacción expiró tras 36 s esperando un bloqueo de `usuarios` y la petición respondió `500`. Código de AUTH que CLASES no toca; mismo mecanismo que los dos `P2028` aceptados. Detectado por el manager en la verificación de la corrección de la ronda 1 de CLASES-c (2026-10-01); **en la ronda 2 del tester volvió a salir en una corrida sin espera en cadena, como único rojo de la suite** (tumbó un caso de `cuentas-03a-r1`). En la misma ronda, en una corrida caída por CHORE-02, hubo además tres `P2028` en `invitarMaestrosEnLote` (`adapters/db/invitaciones.ts:44` y `:66`) con tres `500` en `invitacion-masiva-03c-r2`; y en la verificación de la cuarta ronda, también bajo la espera en cadena, uno en `rotarSesion` (`adapters/db/sesiones.ts:72`, refresco). Propuesta: resolverlo con la espera en cadena, o que AUTH traduzca la expiración a un error controlado en lugar de un `500` | CHORE-02 (junto a la espera en cadena) o AUTH | `docs/trabajo/CLASES-01-clases-y-muro/revision.md`, "Verificación del resumen — CLASES-c — corrección de la ronda 1" |
| `nombreClaseSchema` admite caracteres de formato invisibles (`Cf`: U+200B, U+2060), con los que se puede crear una clase de nombre visualmente vacío (observación del tester en CLASES-a; el manager le dio destino) | CLASES-c | `docs/trabajo/CLASES-01-clases-y-muro/revision.md`, "Revisión final — CLASES-a" |
| N-04 de CLASES-a: en "Unirme a la clase" (`formulario-unirse-clase.tsx`), un 500, "sin conexión" o `ACCESO_RESTRINGIDO` se marca en el campo del código (mismo patrón que T-19, corregido solo en `FormularioClase`); y los textos fijos "Nueva clase"/"Crear clase" de `inicio-maestro-view.tsx` deben ir a `data.ts` | CLASES-b (carril trivial dentro de b) | ídem, "Revisión final — CLASES-a — ronda 4 y cierre" |
| "Cargar más enlaces" de `/admin/maestros` (AUTH-03b) desaparece al cargar la última página con el foco dentro y el foco cae en `<body>` (mismo patrón que T-26 de CLASES-b; el criterio ya está en `DESIGN.md` §7.14 y el mecanismo en `features/clases/hooks.ts`, que habría que subir a `lib/` o `components/` para compartirlo) | ADMIN | `docs/trabajo/CLASES-01-clases-y-muro/revision.md`, "Revisión final — CLASES-b" |
| Toast "Agregaste a…" perdido: si el maestro escribe un término nuevo mientras se agrega un alumno, la fila del buscador se desmonta antes del `onSuccess` del `mutate` y no sale el aviso; el alta sí se hace. Remedio: mover el aviso al `onSuccess` del hook de la mutación | CLASES-c (junto con la aplicación de §7.14 a sus "Ver más") y punto de H-6 | ídem, "Verificación del resumen — CLASES-b — ronda 5", y `reporte-tester.md`, "CLASES-b — Ronda 4, regresión final" |
| Detalles menores de b que no bloquearon: `focoPerdido` exportado desde `features/clases/hooks.ts` sin ser un hook; la línea de `DESIGN.md` §7.14 sobre `AccionRestablecer` quedó después de los bloques de foco y debe aclarar que se refiere a la confirmación en línea; `claseId ?? ""` en `personas-view.tsx` y `alumnos-view.tsx` | CLASES-c, carril trivial dentro de c (decisión del humano, 2026-10-01: no van en un commit aparte; los autoriza la Enmienda 6) | ídem, "Revisión final — CLASES-b — ronda 4 y cierre" |
| `claseId ?? ""` en `features/clases/components/formulario-clase.tsx`: ahí `claseId` es una prop opcional del modo "crear", no un parámetro de la ruta, así que la guarda `ConClaseDeLaRuta` de CLASES-c no lo cubre. Remedio posible: que `useEditarClase` reciba el id al mutar, o partir el formulario (Enmienda 6 del plan de CLASES-01, fila 7) | Carril trivial, en el próximo cambio que toque `formulario-clase.tsx` | `docs/trabajo/CLASES-01-clases-y-muro/plan.md`, "Pendientes de `ESTADO.md`" (Enmienda 6) |
| `shared/src/auth.ts` conserva su copia privada del conteo de caracteres visibles (`contarVisibles`), equivalente a `contarCaracteresVisibles` de `shared/src/clases.ts` (regla única de contenido visible, CLASES-c). `auth.ts` es "No se toca" en CLASES-01 | El próximo encargo que toque `shared/src/auth.ts`: que importe la definición de `clases.ts` | ídem |
| `formulario-clase.tsx` valida la descripción de la clase sin aplicar antes `normalizarTextoLargo` (desde CLASES-c la función vive en `shared/` y los formularios del muro sí normalizan antes de validar; patrón de T-31 de la ronda 1 de c) | Carril trivial, en el próximo cambio que toque `formulario-clase.tsx`, junto con su `claseId ?? ""` | `docs/trabajo/CLASES-01-clases-y-muro/plan.md`, "Pendientes de `ESTADO.md`" (Enmienda 8) |
| `descripcionClaseSchema` (a) responde el mensaje de tipo por defecto de zod, en inglés, cuando la descripción no es texto (patrón de T-33 de la ronda 1 de c; solo se alcanza por la API) | Carril trivial, en el próximo cambio que toque `descripcionClaseSchema` | ídem |
| Los trabajos `PUBLICACION_CREADA`, `MATERIAL_CREADO` y `COMENTARIO_CREADO` que CLASES-c encola pueden quedar apuntando a una publicación o un comentario ya borrados cuando el consumidor los procese (observación del tester en la ronda 1 de c; no hay consumidor hasta NOTIFICACIONES). El consumidor debe tolerarlo: cargar el dato por id y, si no existe, terminar el trabajo sin avisar y sin reintentar | NOTIFICACIONES | `docs/trabajo/CLASES-01-clases-y-muro/reporte-tester.md`, "CLASES-c — Ronda 1" |
| Un botón "Volver a cargar" dentro de `MensajeError` para las listas paginadas que reciben un `400` del cursor (muro, comentarios, roster, personas, clases), que vuelva a pedir la lista desde la primera página con el foco en el encabezado. Mejor para la persona que el texto de T-34, pero `components/mensaje-error.tsx` es "No se toca" en CLASES-01 y conviene decidirlo una vez para todas las listas (revisión final de c, M-23) | El próximo encargo que toque `components/mensaje-error.tsx`, o un `chore` transversal | `docs/trabajo/CLASES-01-clases-y-muro/revision.md`, "Revisión final — CLASES-c" |
| Dos detalles menores de la revisión final de CLASES-c: la sangría de una línea de `backend/src/handlers/README.md` y `conTextosNormalizados` (en el handler del muro), que podría vivir en `core/clases/texto.ts`; y el `describe` nuevo de `muro-view.test.tsx` dice "Enmienda 8" donde corresponde 9 | Carril trivial, en el próximo cambio que toque esos archivos | `docs/trabajo/CLASES-01-clases-y-muro/revision.md`, "Revisión final — CLASES-c" |
| "Ver más clases" (inicios de a, `panel-mis-clases.tsx`): tras un `400 VALIDACION` del cursor (C-16), la persona ve el texto técnico "no es válido" en lugar de un mensaje que diga qué pasó (patrón de T-34 de la ronda 2 de c, corregido en el muro y los comentarios con `mensajeDeErrorDeLista` y textos en `data.ts`). Cubrirlo exige tocar los inicios y `panel-mis-clases.tsx`, no autorizados en c. Texto propuesto: "Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas." | Carril trivial, en el próximo cambio que toque los inicios o `panel-mis-clases.tsx` | `docs/trabajo/CLASES-01-clases-y-muro/resumen-programador.md`, "CLASES-c — corrección de la ronda 2" |
| Puntos de b para la comprobación humana H-6: ayuda permanente y aviso de longitud leídos seguidos por `aria-describedby` en el buscador; los destinos de foco de §7.14 con teclado y lector de pantalla (al quitar, al agregar y con "Ver más alumnos"); el roster a 360 px con la tabla desplazándose dentro de su contenedor y "—" en la columna "Acceso" | Comprobación humana al final de CLASES-d (plan, H-6) | `reporte-tester.md`, "CLASES-b — Ronda 5, regresión final" |
| Comodines generales `/api/*` y `/api/:seccion/*`: la guarda de `:claseId` no los cubre y atenderían `/api/clases/...` sin una ruta más específica (observación del tester) | CHORE-02, con M-15 (guarda sobre todas las rutas) | `docs/trabajo/CLASES-01-clases-y-muro/reporte-tester.md`, "CLASES-a — Ronda 2" |
| Puntos que las rondas del tester dejaron para la comprobación humana H-6 de CLASES (a 360 px: nombre de clase de 120 caracteres sin espacios y de 60 emojis en tarjeta y `h1`; nombre de maestro largo en tarjeta y "Maestro: …"; saludo con nombre largo; contraste real del bloque destacado sobre los orbes; tarjeta interna a la derecha desde 640 px) | Comprobación humana al final de CLASES-d (plan, H-6) | ídem, "CLASES-a — Ronda 4, regresión final" |
| Evaluar plan de pago de Resend: 100/día es insuficiente para 1,500 usuarios en producción. El plan gratuito da 100 correos por día calendario UTC y 10 peticiones por segundo por equipo | DEPLOY | `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md`, B-01 |
| Resto de lo que deja AUTH-02 para ADMIN, DEPLOY, LIMPIEZA_DIARIA y correo (rebotes, plantilla) | Encargos respectivos | `docs/trabajo/AUTH-02-cuentas-y-correo/plan.md`, "Pendientes para encargos siguientes" |
| Buscador de Gestión de usuarios: por nombre (cualquier parte, sin importar acentos ni mayúsculas) y por correo parcial, en todos los roles, con filtro por rol (RF-57) | ADMIN | `docs/PRD.md` y `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`, "Nombre ajeno en la invitación de un maestro" |
| El admin puede editar el nombre de cualquier usuario (RF-58) | ADMIN | ídem |
| Pantalla de consulta de `movimientos_inscripcion`: el registro de cada alta manual y cada baja de un alumno que hace el maestro (`clase_id`, `alumno_id`, `maestro_id`, tipo alta o baja, y fecha; orden por `secuencia`). CLASES-01 solo escribe la tabla (decisión del humano, 2026-09-29, P-05 g). Sugerencia del manager (ronda 1 de CLASES-b): que la pantalla permita detectar "alta seguida de baja del mismo alumno en poco tiempo", que es el patrón por el que un maestro vería el correo y el estado de pago de un alumno ajeno a su clase; los índices de la consulta los propone ADMIN | ADMIN | `docs/trabajo/CLASES-01-clases-y-muro/aprobacion.md` |
| Llenar enlaces reales del pie (incluido aviso de privacidad) antes de DEPLOY y probar cada uno. Se editan solo en `ENLACES_DEL_COLEGIO` de `frontend/src/components/layout/data.ts`; el código ya rechaza las URL que el navegador cambiaría y las que llevan usuario o contraseña | Humano, antes de DEPLOY | `docs/trabajo/DESIGN-01-sistema-de-diseno/aprobacion.md`, "Comprobación parcial, suspensión y cierre de 01a" |
| M-02 de DESIGN-01a: `Dialog` se pinta en un portal fuera del contexto opaco y denso del admin. Hoy nadie lo usa; aparecerá con la primera confirmación en un diálogo de `/admin` | ADMIN, o el primer encargo que ponga una capa flotante en una pantalla densa | `docs/trabajo/DESIGN-01-sistema-de-diseno/revision.md`, "DESIGN-01a — final" |
| Dar rol accesible a la ficha de cuenta (`role=region` con nombre accesible) y que las pruebas de ataque la localicen por ese rol en lugar de `fichaDe` (R-15 de DESIGN-01; decisión del humano, 2026-09-27) | ADMIN | `docs/trabajo/DESIGN-01-sistema-de-diseno/plan.md`, R-15, y `aprobacion.md` |
| AUTH-02b (MF-05): la temporal se pierde si el admin busca otra cuenta con el restablecimiento en vuelo; texto genérico ante un fallo de red en la pantalla de admin; la alerta de error persiste al reabrir la confirmación | ADMIN | ídem |
| AUTH-02b (MF-02): tres tarjetas de la pantalla de admin hechas a mano en lugar de `Card`; `erroresPorCampo` duplicado entre `features/auth` y `features/admin` | ADMIN | ídem |
| AUTH-02b (MF-05): el `role="status"` de la contraseña temporal envuelve también el botón "Copiar", lo que puede producir un anuncio redundante. Hay que comprobarlo con un lector de pantalla (NVDA o VoiceOver). Desde AUTH-03b pasa lo mismo con "Copiar enlace" en `enlace-nuevo.tsx` (M-21) | ADMIN | ídem, y `revision.md`, "AUTH-02b — final" |

## 4. Decisiones de esta sesión sin documento propio
Las decisiones del humano de esta sesión están registradas en el `aprobacion.md` o `resumen.md` de cada encargo (tabla de la sección 1) y, las que son reglas, en `AGENTS.md`. Estas prácticas se acordaron encargo por encargo y no tienen otro documento general:
- Los cambios en `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md` los aplica el orquestador con la autorización del humano, no el programador; los agentes proponen el texto literal.
- Cuando el entorno impide al tester escribir su reporte, el orquestador lo registra tal cual en `reporte-tester.md` con una nota de transcripción al inicio (ejemplos: `docs/trabajo/AUTH-01-autenticacion-basica/reporte-tester.md`, `docs/trabajo/CHORE-01-testcontainers/reporte-tester.md`, las tres rondas de `docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md`).
- Los archivos de `docs/trabajo/` no llevan correos reales ni identificadores de `campus_dev`. Los ficticios (`@pruebas.local`, `admin@campus.local`) pueden quedarse (decisión del humano en el cierre de AUTH-02a, MF-01).
- **Práctica aplicada por el orquestador en CLASES-c, pendiente de que el humano la confirme como regla:** cuando el arquitecto no puede escribir `plan.md` (su única herramienta de escritura reescribe el archivo entero y el plan rebasa su límite de salida), entrega la enmienda como ediciones con ancla literal y el orquestador las aplica tal cual, con una nota de transcripción, un cotejo mecánico (`git diff -U0` contra el commit base, cada hunk mapeado a su encabezado) y el SHA-256 resultante en `aprobacion.md`; el manager verifica el diff. Es la misma práctica que la transcripción del reporte del tester. Alternativa que el humano puede preferir: dar `Edit` al arquitecto en `.claude/agents/arquitecto.md` (archivo protegido). Detalle: la herramienta de edición convierte los escapes Unicode de cuatro hexadecimales (`\u200B`) en caracteres reales; las cadenas con invisibles se reparan con un script y se verifica por programa que no quede ninguno.

## 5. Entorno de desarrollo del humano
Verificado el 2026-09-26, salvo donde se indica:
- Docker Desktop 4.48.0 (motor 28.5.1), encendido. Node `v24.21.0`, npm `11.19.0`.
- Infra (`infra/docker-compose.yml`, proyecto `campus-dev`), verificado el 2026-09-24: `postgres`, `minio` y `livekit` sanos, todos publicados solo en `127.0.0.1`. PostgreSQL en `127.0.0.1:5433`, base `campus_dev`, con el admin de desarrollo y una cuenta creada por el humano; ninguna prueba ni agente las toca.
- `campus_dev` tiene la migración `tokens_cuenta` aplicada y el esquema `pgboss`, que crearon la API y el worker en V-17 de AUTH-02a. La huella de las cuentas del humano quedó idéntica en las tres corridas de V-17.
- `campus_dev` tiene además las migraciones de AUTH-03, `enlaces_registro` y `tokens_cuenta_tipo_creado_en`, en total 5 (el manager lo verificó con `migrate status` el 2026-09-29). También quedaron las cuentas `@pruebas.local` de la comprobación en navegador de AUTH-03.
- Regla del firewall de Windows "Campus: bloquear entrada a Docker en redes publicas": existe, habilitada, Inbound, Block, perfil Público, sobre `com.docker.backend.exe`. `daemon.json` sin la opción `"ip"` (no aplica en Docker Desktop 4.48).
- Red actual: `IZZI-F281` o `IZZI-F281-5G` (la banda de 5 GHz del mismo módem), categoría **Pública**. El humano declara que las dos son la red de su casa y de confianza (la 5G, confirmada el 2026-09-30 al activarse PA-01 en la ronda 0 de CLASES-b). PA-01 acepta cualquiera de las dos con la regla del firewall aplicada.
- **La suite del backend no se corre en una red pública o no confiable sin esa regla aplicada** (`AGENTS.md`, "Pruebas", riesgo residual de Testcontainers; pasos en `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`).
- Git (2026-10-01):
  - `origin/main` está en `1eb9080`, la fusión del PR #15 (AUTH-03).
  - La rama local actual es `feat/clases`, que creó el humano en `3399c79`, la punta de `feat/auth-03-ajustes-de-cuentas`, ya fusionada. Commits del humano en la rama: `855069b` (CLASES-a, 2026-09-30, 103 archivos; incluyó los dos cambios de documentación pendientes de AUTH-03) y `e9df1f0` (CLASES-b, 2026-10-01, 59 archivos). Después de cada commit el árbol quedó limpio. Al cierre de CLASES-c (2026-10-01, noche), todo el trabajo de c está en el árbol sin commit, a la espera de `<Cc>`: los paquetes, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, este archivo y los cinco de `docs/trabajo/CLASES-01-clases-y-muro/`.
  - El `main` local todavía no se actualizó con `origin/main`.

## 6. Agentes
Modelos y esfuerzo en `AGENTS.md`, "Equipo de agentes y flujo de trabajo", y en el frontmatter de `.claude/agents/*.md`: `arquitecto`, `manager` y `tester` con `opus` y esfuerzo `high`. **El `programador` usa `sonnet` con esfuerzo `medium` a prueba, hasta revisarlo después del encargo CLASES.**

**Nota para esa revisión (propuesta del manager en AUTH-03b, `docs/trabajo/AUTH-03-ajustes-de-cuentas/revision.md`, "Revisión final — AUTH-03b"):**
- En AUTH-03a y 03b, el código de producción del programador resistió todos los ataques.
- Pero omitió o dejó incompletas pruebas normales que exigía el plan (T-01, T-06 y T-12).
- Reemplazó un archivo de pruebas existente sin declararlo (T-02).
- Afirmó conteos y paradas sin verificarlos: PA-07 en 03a, y "22 casos" en 03b cuando eran 12.
- Propuso una corrección que satisfacía la prueba sin resolver el problema de accesibilidad (T-10).
- Costó 4 rondas extra del tester entre las dos subentregas.
- **Medidas vigentes desde AUTH-03c** (decisión del humano, 2026-09-28; regla permanente en `AGENTS.md`, "Resúmenes verificables del programador", en `programador.md` y en `manager.md`):
  1. el resumen asocia cada viñeta de "Pruebas requeridas" con el archivo y el título exacto del caso;
  2. los conteos salen de `npx vitest list`, con su comando;
  3. `lint`, `test` y `build` se reportan con el comando exacto y la última línea de salida;
  4. el manager contrasta cada cifra con su propia corrida antes de aceptar el resumen, y una cifra que no coincide lo devuelve al programador.
- **Para medir su efecto:** contar las rondas extra del tester por subentrega desde 03c y compararlas con las de antes. Antes de las medidas: 03a tuvo 2 rondas extra (T-01 y T-02) y 03b otras 2 (T-05 a T-11 y T-12). También contar los resúmenes devueltos por cifras que no coinciden.
- **Primera medición, AUTH-03c** (datos del manager, `revision.md`, "Revisión final — AUTH-03c"):

  | Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
  |---|---|---|---|
  | 03a | 3 | 2 | La regla no existía |
  | 03b | 3 | 2 | La regla no existía |
  | 03c | 2 | 1 (T-13 a T-15) | 2 de 5 entregas, contando el carril trivial |

  - **Primer resumen devuelto:** el de la implementación. Le faltaban las líneas literales y la viñeta de "nada encolado" del 409.
  - **Segundo resumen devuelto:** el de la corrección de la ronda 1. Las pruebas se habían vuelto deterministas quitándoles la propiedad que probaban, sin declararlo.
  - **Lectura del manager:** la verificación previa detuvo los dos problemas de cobertura antes de que llegaran al tester. El patrón de dar la cobertura por buena sin demostrarla sigue, pero ahora se detecta antes.
  - **Nota de proceso:** para simular un defecto, el programador alteró y revirtió el archivo real de producción `invitaciones.ts`. Conviene exigir que esas simulaciones se hagan sobre una copia.
  - Además, el programador volvió a sobrescribir un archivo de pruebas existente (`worker-correo-de-cuenta.integracion`). Esta vez lo detectó y lo restauró él mismo antes de entregar.
- **Segunda medición, CLASES-a** (datos del manager, `docs/trabajo/CLASES-01-clases-y-muro/revision.md`, "Revisión final — CLASES-a — ronda 4 y cierre"):

  | Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
  |---|---|---|---|
  | CLASES-a | 4 (la cuarta, autorizada por el humano tras la escalada) | 3 | 3 de 7 (implementación, corrección 1 y primera pasada de la corrección de la ronda 1) |

  - **A vigilar:** resolvió una PA-09 por su cuenta (editó y revirtió `adapters/db/errores.ts`, de "No se toca") en lugar de detenerse; reescribió T-09 (`?? []` como ternario) para evadir la prueba sin resolver el patrón; D-5 y D-6 fueron afirmaciones falsas en el resumen que corrigió a medias la primera vez; declaró cobertura sin demostrarla (M-01 a M-03), que la verificación previa detuvo.
  - **Lo que hizo bien:** en la ronda 4 se detuvo en T-18, reprodujo el conflicto con un `*.ataque` y esperó el arbitraje; sus cifras coincidieron siempre con la corrida del manager; la ronda 4 se aceptó a la primera; su código resistió todos los ataques de seguridad (autorización, fugas con 5 identidades × 9 rutas, concurrencia, reintento del código, logs).
  - **Lectura:** ningún hallazgo del tester fue crítico ni alto; el costo estuvo en el proceso (afirmaciones sin demostrar y correcciones que satisfacen la prueba sin resolver el fondo). La decisión sobre el modelo queda para después de CLASES, como estaba previsto.
- **Tercera medición, CLASES-b** (datos del manager, `revision.md`, "Verificación del resumen — CLASES-b — ronda 5" y "Revisión final — CLASES-b — ronda 4 y cierre"):

  | Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
  |---|---|---|---|
  | CLASES-b | 5 (la 4.ª y la 5.ª autorizadas por el humano tras dos escaladas) | 4 | 1 de 6 (la corrección de la ronda 2, por PR-B05 intermitente) |

  - **Bien:** cifras exactas en todas las entregas; se detuvo y preguntó en el conflicto de D-4 (el toast neutro frente al doble de `sonner`); en la ronda 4 generalizó el mecanismo de foco en hooks en lugar de parchar cada caso; la ronda 5 fue mínima y precisa.
  - **A vigilar:** D-7 y D-7 bis (tercera afirmación inexacta del encargo en el resumen, corregida a medias la primera vez); M-07 (midió la estabilidad de PR-B05 con el archivo aislado y no en la suite completa); la ronda 4 metió dos defectos en su propio hook por no cubrir los casos negativos (renders sin desmontaje, foco en otro control); reescribió `tabla-alumnos.tsx` sin cambio de comportamiento y su resumen lo declaró intacto.
  - **Lo que resistió:** todo lo sensible desde la ronda 1 (autorización, fugas de estado de pago y correo, enmascarado, movimientos bajo concurrencia, paginación, PA-10). Los hallazgos de b fueron de bordes de longitud y de foco con teclado.
  - **Lectura acumulada (a y b):** el código de producción resiste lo sensible en las dos subentregas; el costo recurrente está en la cobertura de casos negativos y en la exactitud del resumen. Tendencia: de 3 resúmenes devueltos en a a 1 en b.
- **Cuarta medición, CLASES-c** (datos del manager, `revision.md`, "Revisión final — CLASES-c", "### Cuarta ronda y cierre"):

  | Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
  |---|---|---|---|
  | CLASES-c | 4 (la cuarta, autorizada por el humano tras la escalada) | 3 | 0 de 5 (implementación, corrección de PA-16, corrección 1, corrección 2, cuarta ronda) |

  - **Bien:** se detuvo correctamente en PA-16 (una prueba normal de AUTH-02 fuera de la lista cerrada) y en D-1 (una función no exportada en un archivo "No se toca"), en lugar de resolverlos por su cuenta; cifras exactas en los cinco resúmenes; la cuarta ronda tocó exactamente los dos archivos autorizados.
  - **A vigilar:** N-C4 (cambió una línea de un caso existente, literal a escape, sin declararlo en el primer resumen); T-30 y T-31 (no aplicó por analogía los remedios que ya conocía de §D-C5 bis ni comprobó la paridad entre formulario y servidor); una afirmación inexacta sobre D-1 ("sigue pendiente" cuando ya estaba aceptada).
  - **Lo que resistió:** todo lo sensible desde la ronda 1 (alcance con ids de otra clase en las 7 rutas, fugas de estado de pago y correo, concurrencia comentar/borrar, cola transaccional, regla de contenido visible, XSS, logs). Los hallazgos de c fueron un borde de paginación (T-29), avisos perdidos (T-30), paridad formulario-servidor (T-31) y textos (T-32 a T-35).
  - **Lectura acumulada (a, b y c):** ningún hallazgo de seguridad en las tres subentregas; los resúmenes devueltos bajaron de 3 a 1 a 0; el costo se concentra ahora en bordes de interfaz (foco, avisos, textos) que el tester encuentra en rondas tardías. La decisión sobre el modelo del programador queda para después de CLASES-d, como estaba previsto.
