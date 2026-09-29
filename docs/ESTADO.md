# Estado del proyecto

Tablero vivo de CMEP Campus Digital. Solo hechos verificables; el detalle vive en los archivos a los que remite. Lo lee el orquestador al inicio de cada sesión y lo actualiza al cerrar cada encargo o antes de limpiar o compactar la sesión (`AGENTS.md`, "Reglas del equipo").

Última actualización: 2026-09-29, por el orquestador.

## 1. Encargos completados
Todos fusionados en `main` de `origin` (verificado con `git log origin/main --merges`), salvo AUTH-03, que está cerrada y espera el commit de 03c, el push, el PR y la fusión, todo a cargo del humano. El historial de cada uno está en `docs/trabajo/<encargo>/`.

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
| AUTH-03 · ajustes de cuentas (03a, 03b y 03c) | `feat/auth-03-ajustes-de-cuentas` | Pendiente: sin push ni PR todavía | `docs/trabajo/AUTH-03-ajustes-de-cuentas/` |

Suite al cierre de AUTH-03 (2026-09-29, corrida del orquestador y del manager): backend 82 archivos / 933 pruebas, 447 adversarias en 32 archivos; frontend 65 / 1007, 612 adversarias en 32 archivos. Lint, test y build con código 0, también `npm run test` desde la raíz. La tabla SHA-256 vigente de las 64 `*.ataque` está en `docs/trabajo/AUTH-03-ajustes-de-cuentas/reporte-tester.md`, "AUTH-03c — Ronda 2".

**AUTH-03 cerrada** el 2026-09-29, en carril sensible, con RF-04b, RF-04d, RF-04e, RF-04f y MF-05 de AUTH-02b.
  - **Qué entró:**
    - **03a:** el cambio obligatorio pide solo la contraseña nueva y exige una sesión viva del mismo usuario; el maestro ve y corrige su nombre al activar la invitación; las contraseñas del login y del registro salen de la caché de mutaciones.
    - **03b:** enlaces de registro de maestros. Tabla `enlaces_registro`, `/admin/maestros` y `/registro-maestro`.
    - **03c:** invitación masiva, con cupo diario, índice `(tipo, creado_en)`, encolado en lote y ritmo del worker.
  - **Commits del humano:** `d8cb198` (03a), `32afeef` (03b) y el de 03c, que está pendiente.
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
Ninguno. AUTH-03 está cerrada (sección 1) y solo falta que el humano haga el commit de 03c, el push, el PR y la fusión. Lo siguiente, según el orden que fijó el humano, es CLASES.

## 2b. Encargos decididos, por empezar
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
| Evaluar plan de pago de Resend: 100/día es insuficiente para 1,500 usuarios en producción. El plan gratuito da 100 correos por día calendario UTC y 10 peticiones por segundo por equipo | DEPLOY | `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md`, B-01 |
| Resto de lo que deja AUTH-02 para ADMIN, DEPLOY, LIMPIEZA_DIARIA y correo (rebotes, plantilla) | Encargos respectivos | `docs/trabajo/AUTH-02-cuentas-y-correo/plan.md`, "Pendientes para encargos siguientes" |
| Buscador de Gestión de usuarios: por nombre (cualquier parte, sin importar acentos ni mayúsculas) y por correo parcial, en todos los roles, con filtro por rol (RF-57) | ADMIN | `docs/PRD.md` y `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`, "Nombre ajeno en la invitación de un maestro" |
| El admin puede editar el nombre de cualquier usuario (RF-58) | ADMIN | ídem |
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

## 5. Entorno de desarrollo del humano
Verificado el 2026-09-26, salvo donde se indica:
- Docker Desktop 4.48.0 (motor 28.5.1), encendido. Node `v24.21.0`, npm `11.19.0`.
- Infra (`infra/docker-compose.yml`, proyecto `campus-dev`), verificado el 2026-09-24: `postgres`, `minio` y `livekit` sanos, todos publicados solo en `127.0.0.1`. PostgreSQL en `127.0.0.1:5433`, base `campus_dev`, con el admin de desarrollo y una cuenta creada por el humano; ninguna prueba ni agente las toca.
- `campus_dev` tiene la migración `tokens_cuenta` aplicada y el esquema `pgboss`, que crearon la API y el worker en V-17 de AUTH-02a. La huella de las cuentas del humano quedó idéntica en las tres corridas de V-17.
- `campus_dev` tiene además las migraciones de AUTH-03, `enlaces_registro` y `tokens_cuenta_tipo_creado_en`, en total 5 (el manager lo verificó con `migrate status` el 2026-09-29). También quedaron las cuentas `@pruebas.local` de la comprobación en navegador de AUTH-03.
- Regla del firewall de Windows "Campus: bloquear entrada a Docker en redes publicas": existe, habilitada, Inbound, Block, perfil Público, sobre `com.docker.backend.exe`. `daemon.json` sin la opción `"ip"` (no aplica en Docker Desktop 4.48).
- Red actual: `IZZI-F281`, categoría **Pública**. El humano declara que es la red de su casa y de confianza.
- **La suite del backend no se corre en una red pública o no confiable sin esa regla aplicada** (`AGENTS.md`, "Pruebas", riesgo residual de Testcontainers; pasos en `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`).
- Git local (2026-09-29): la rama actual es `feat/auth-03-ajustes-de-cuentas`. Tiene `53b3126`, `d8cb198` (03a) y `32afeef` (03b), y en el árbol de trabajo está 03c, lista para su commit. Todavía no se hizo push. `main` sigue en `58123dd`.

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
