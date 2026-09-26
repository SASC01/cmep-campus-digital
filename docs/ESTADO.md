# Estado del proyecto

Tablero vivo de CMEP Campus Digital. Solo hechos verificables; el detalle vive en los archivos a los que remite. Lo lee el orquestador al inicio de cada sesión y lo actualiza al cerrar cada encargo o antes de limpiar o compactar la sesión (`AGENTS.md`, "Reglas del equipo").

Última actualización: 2026-09-26, por el orquestador.

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

Suite al cierre de AUTH-02a: backend 65 archivos / 657 pruebas (319 adversarias en 21 archivos) y frontend 11 / 69, en verde, más lint y build. Fuente: `docs/trabajo/AUTH-02-cuentas-y-correo/revision.md`, sección "AUTH-02a — final". Hashes vigentes de las 24 `*.ataque`: `reporte-tester.md`, ronda 3 de AUTH-02a.

**Hecho fuera de un encargo (2026-09-26):**
- **Comprobación en navegador real de AUTH-01, hecha por el humano, con resultado correcto:** registro, recarga, cierre de sesión, bloqueo al sexto intento, admin, 360 px y dos pestañas.
- **M-03 de FRONT-01 cerrado:** el humano actualizó Node a `v24.21.0` (npm `11.19.0`), que cumple el `^24.15.0` de `jsdom`. `.nvmrc` (`24`) y `engines` de la raíz (`node >=24 <25`, `npm >=11`) no fijaban 24.11: no cambiaron.

## 2. Encargos en curso
- **AUTH-02 · cuentas y correo** (RF-03, RF-04, RF-04a, RF-04b, RF-04d; carril sensible). Aprobado por escrito el 2026-09-24, partido en dos (`docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`).
  - **AUTH-02a (backend): completada**, fusionada en el PR #10. Historial completo (3 rondas, Enmiendas 1 y 2, cierre MF-01..MF-04) en `aprobacion.md`, `resumen-programador.md`, `reporte-tester.md` y `revision.md`.
  - **AUTH-02b (frontend: pasos 16–21 y la sección "Frontend en local" §3 del README): en curso** en la rama `feat/auth-02b-cuentas-frontend`, creada el 2026-09-26 desde `main` (`b55897a`). Flujo: programador → tester (máximo 3 rondas) → manager final → revisión humana del diff. Sin commit. Al cerrarla se aplica la fila `admin` de `CLAUDE.md`.
    - Programador ronda 1: pasos 16–21 y README "Frontend en local" §3. Frontend 17 archivos / 106 pruebas y backend 65 / 657, en verde en tres corridas; lint y build en verde. Cuatro desviaciones menores declaradas en `resumen-programador.md`. Alcance verificado por el orquestador: nada en `backend/`, `shared/` ni `eslint.config.mjs`.
    - Tester ronda 1: **ROTO**, con T-01..T-08 (3 medios, 5 bajos): token y contraseñas en la caché de mutaciones, `409` que atrapa en `/cambiar-contrasena`, doble envío del restablecimiento, detalles de la ficha y de accesibilidad, y un tipo fuera de `types.ts`. Frontend 20 archivos / 201 pruebas, 12 en rojo; 27 `*.ataque` con hashes en `reporte-tester.md`.
    - Programador ronda 2: T-01..T-08 corregidos. Frontend 20 / 201 y backend 65 / 657, en verde en tres corridas; 27 hashes intactos. Dos desviaciones declaradas: limpieza explícita de la caché de mutaciones y `autoFocus` en "Copiar". Hubo un fallo de escritura en su resumen, que el propio programador corrigió; el orquestador verificó que el archivo solo añade líneas respecto de `main` y que no quedan rastros.
    - Tester ronda 2: **ROTO**. T-01..T-08 resueltos. Hallazgos nuevos, todos por el manejo del foco de la corrección de T-07: T-09 (media, el foco en "Sí, restablecer" permite restablecer sin confirmar con Enter), T-10 y T-11 (bajas). Observaciones sin severidad para el manager. Frontend 23 / 226, 3 en rojo; 30 `*.ataque` con hashes en `reporte-tester.md`.
    - Programador ronda 3: T-09..T-11 corregidos con un rediseño del foco. Frontend 23 / 226 y backend 65 / 657, en verde en tres corridas; 30 hashes intactos. El cambio sin declarar de la ronda 2 en `formulario-cambiar-contrasena.tsx` queda para que lo revisen el tester y el manager.
    - Tester ronda 3: **ROTO**, con T-12 (baja: en Chrome, "Sí, restablecer" se deshabilita con el foco puesto, el foco cae en `<body>` y "Copiar" no lo recibe) y T-13 (baja: solo en desarrollo, `<StrictMode>` le quita el foco al buscador). T-09..T-11 resueltos. `formulario-cambiar-contrasena.tsx` sin nada indebido. Frontend 24 / 244, 3 en rojo; 31 `*.ataque` con hashes en `reporte-tester.md`. **Rondas agotadas.**
    - Incidencia de proceso: el tester lanzó Chrome sin interfaz para reproducir T-12 y trató de usar Edge, que se enganchó a la sesión abierta del humano y quizá abrió una pestaña local. No quedó ningún proceso vivo.
    - Manager final: **ESCALAR AL HUMANO** (`revision.md`, "AUTH-02b — final").
      - Verificación propia: lint y build en verde; backend 657/657; frontend 241/244, con las 3 en rojo de T-12 y T-13; 31 hashes OK; alcance correcto.
      - MF-01 (bloquea): la suite no está en verde.
      - MF-02..MF-05 no bloquean: tarjetas hechas a mano y `erroresPorCampo` duplicado; documentos desfasados (README §3 del frontend y §7 y §8 del backend, línea de `navegacion.ts` en `CLAUDE.md`); navegadores lanzados sin autorización (regla propuesta); observaciones del tester pendientes de destino.
    - **Decisiones del humano (2026-09-26)**, en `aprobacion.md`, "Decisiones del humano sobre la escalada de AUTH-02b":
      1. Opción (A): una ronda 4 única, acotada a `ficha-de-cuenta.tsx` y `contrasena-temporal.tsx`, sin navegadores y sin ronda 5. Si vuelve a fallar, opción (B): el tester marca las pruebas como `it.fails` y T-12 y T-13 van a ADMIN.
      2. Documentos desfasados por el carril trivial. `CLAUDE.md` ya actualizado por el orquestador: línea de `navegacion.ts` y fila `admin`. `README.md` (frontend §3, backend §7 y §8) queda para después de la ronda 4 del tester.
      3. El recorrido en navegador real lo hace el humano al final.
      4. Regla de navegadores aplicada en `AGENTS.md` y en los cuatro `.claude/agents/*.md`.
      5. Destinos anotados en la sección 3.
    - Programador ronda 4: T-12 y T-13 corregidos; solo cambió `ficha-de-cuenta.tsx`. Frontend 24 / 244 y backend 65 / 657, en verde en tres corridas; 31 hashes intactos.
    - Tester ronda 4: T-12 y T-13 resueltos, sin necesidad de la opción B. Aparece **T-14 (baja)**: la corrección de T-12 vuelve a romper T-11 en navegador real (foco robado al admin que se fue a otro campo), con 4 pruebas en rojo en `cuentas-r4.ataque.test.tsx`.
    - **Decisión del humano sobre T-14:** aceptarlo como riesgo. Sus 4 pruebas pasan a `it.fails` y el hallazgo va al encargo del sistema de diseño. No hay ronda 5.
    - `README.md` corregido por el carril trivial (MF-03): frontend §3 y backend §7 y §8.
    - Opción B aplicada a T-14: 4 `it.fails` en `cuentas-r4.ataque.test.tsx`, con las aserciones intactas. Tres corridas completas con código 0: backend 65 / 657 y frontend 25 / 257, con 253 en verde y 4 fallos esperados. 32 `*.ataque` con hashes en `reporte-tester.md`, ronda 4.
    - Manager, verificación de cierre: **APROBADO** (`revision.md`, "AUTH-02b — cierre"). En su propia corrida: lint, build y test con código 0; los 32 hashes coinciden; las aserciones de T-14 están intactas (sin las marcas, el archivo reproduce el hash original); el alcance es correcto. N-01 y N-02 aplicados por el orquestador. Quedan dos detalles menores de código sin tocar: un comentario desfasado y una comparación inofensiva con `document.body` en `ficha-de-cuenta.tsx`.
    - **Estado: terminada. Pendiente de la revisión humana del diff, del recorrido en navegador real (lo hace el humano) y del commit.** Sin commit.
    - **Defecto encontrado por el humano en el recorrido (2026-09-26):** un maestro invitado quedó guardado y saludado con el nombre del humano, porque el navegador autocompletó el campo "Nombre completo" (`autoComplete="name"`). Clasificado como medio. La cuenta de prueba en `campus_dev` se queda como está.
      - Corrección decidida por el humano, antes del commit: `autoComplete="off"` en los dos campos del formulario de invitación, con una prueba, por el carril trivial. El manager verifica sin ronda del tester.
      - Regla nueva en `CLAUDE.md`, "Formularios". Detalle en `aprobacion.md`, "Nombre ajeno en la invitación de un maestro".
      - Programador (carril trivial): dos líneas cambiadas en `formulario-invitar-maestro.tsx` y una prueba nueva en `cuentas-view.test.tsx`. Corrida completa: backend 657/657; frontend 25 archivos, 254 en verde y 4 fallos esperados. 32 hashes intactos.
      - Manager: **APROBADO** (`revision.md`, "AUTH-02b — verificación de autoComplete"). Ningún otro formulario incumple la regla nueva.
      - Suite en la verificación del manager: test y build con código 0. Backend 65 / 657; frontend 25 / 258, con 254 en verde y 4 fallos esperados de T-14. 32 hashes OK. El orquestador actualizó la cifra del frontend en `README.md` §7.
      - **Lint en rojo solo en el equipo del humano (N-01):** Prettier revisa dos HTML de `backend/tmp/correos/` que escribió el worker durante el recorrido en navegador. Git los ignora, pero `.prettierignore` no excluye `backend/tmp/`. Sin esos archivos, el lint pasa. **Decisión del humano:** añadir `backend/tmp` a `.prettierignore` por el carril trivial y no borrar los HTML. Aplicado: una línea en `.prettierignore`, y los dos HTML siguen en su lugar. `npm run lint` desde la raíz, corrido por el orquestador el 2026-09-26, da **código 0** en `shared`, `backend` y `frontend`.
    - **AUTH-02b lista para la revisión humana del diff, el recorrido en navegador (incluida la comprobación de N-02) y el commit.** Sin commit.
      - Pendiente del humano (N-02): confirmar en su navegador que Chrome o Edge ya no rellenan el formulario de invitación. Algunos navegadores ignoran `autoComplete="off"`.

## 2b. Encargos decididos, por empezar
- **AUTH-03 · ajustes de cuentas.** Va **después del encargo de dirección visual y antes de CLASES** (decisión del humano, 2026-09-26). Por ahora solo está registrado en los documentos: `docs/PRD.md` (RF-04b, RF-04d, RF-04e, RF-04f), `docs/ARCHITECTURE.md` D-04 y ESSENTIALS "Autenticación" y "Asíncrono". Contenido:
  1. El cambio obligatorio de contraseña ya no pide la temporal, solo la nueva y su confirmación. Un futuro cambio voluntario desde el perfil sí pedirá la actual.
  2. Registro de maestros por enlace: el admin lo genera con vigencia configurable (7 días por defecto), puede revocarlo y ve quién se registró con cada uno. El enlace se guarda solo como hash.
  3. Invitación masiva: el admin pega una lista de correos con nombre opcional por línea. La pantalla reporta enviadas, ya existentes e inválidas, y respeta los límites diarios de Resend.
  4. Al establecer su contraseña por invitación, el maestro ve su nombre y puede corregirlo antes de guardar.
  5. La contraseña del login y del registro en la caché de mutaciones del frontend (antes asignada a CHORE-02).
  - Prioridades fijadas por el humano el 2026-09-26: RF-04b, RF-04d y RF-04f en M; RF-04e en S. Para ADMIN, RF-57 y RF-58 en M.
  - Al planearlo, el arquitecto propone los textos para `ARCHITECTURE.md` §6, §7 y §14, que el humano dejó para ese plan.

## 3. Pendientes y su destino
| Pendiente | Destino | Dónde está anotado |
|---|---|---|
| N-01 de CHORE-01: la guarda de la base de pruebas acepta `?host=` en la URL | CHORE-02 | `docs/trabajo/CHORE-01-testcontainers/aprobacion.md` y `revision.md` |
| N-03 de CHORE-01: un `tsconfig` para `backend/test/` dentro de `npm run lint` | CHORE-02 | ídem |
| C-07 (`nombre_busqueda` normalizado en `core/`, trigramas sobre esa columna) y el resto de textos para `ARCHITECTURE*.md` | DOCS-02 | `docs/trabajo/AUTH-01-autenticacion-basica/aprobacion.md`, "Pendientes para encargos posteriores" y "Encargos siguientes" |
| Requisitos previos a abrir la plataforma a alumnos | DEPLOY | `docs/ARCHITECTURE.md` §18, "Requisitos previos a abrir la plataforma" |
| `pagos`, `admin`, `clases`, `LIMPIEZA_DIARIA`, guarda sobre todas las rutas, ESLint contra `addHook` en `handlers/` | Encargos de cada módulo | `docs/trabajo/AUTH-01-autenticacion-basica/aprobacion.md`, "Encargos siguientes" |
| Opcionales: unitarias del backend sin `globalSetup`; ESLint contra `@testcontainers/*` en `backend/src/**` | Sin encargo asignado | `docs/trabajo/CHORE-01-testcontainers/aprobacion.md` |
| Dirección visual (tokens definitivos, sombras, `Toaster`), `paths` de shadcn, grep de V-07 | Encargo de dirección visual y planes futuros | `docs/trabajo/DOCS-01-pendientes/resumen.md` |
| La contraseña temporal del restablecimiento por el admin no caduca (S-05 de AUTH-02): decidir si caduca | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| E2-03 de AUTH-02: dos correcciones de correo cruzadas y simultáneas del admin pueden provocar un deadlock y un `500` en `corregirCorreo` (datos correctos). Riesgo residual aceptado | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| MF-04 de AUTH-02a: la baja cumple el protocolo PB-8; los cambios masivos sobre `usuarios` van en lotes cortos (P2028) | ADMIN | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` |
| MF-04 de AUTH-02a: una sola instancia del worker (tope de recuperaciones fuera del bloqueo) | DEPLOY (también en `docs/ARCHITECTURE.md` §18) | ídem |
| Resto de lo que deja AUTH-02 para ADMIN, DEPLOY, LIMPIEZA_DIARIA y correo (rebotes, plantilla) | Encargos respectivos | `docs/trabajo/AUTH-02-cuentas-y-correo/plan.md`, "Pendientes para encargos siguientes" |
| AUTH-02b (MF-05): la contraseña del login y del registro queda en la caché de mutaciones de TanStack Query (el token del enlace y las contraseñas de las pantallas de cuenta ya no) | AUTH-03 (antes CHORE-02; lo movió el humano el 2026-09-26) | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`, "Decisiones del humano sobre la escalada de AUTH-02b" y "Nombre ajeno en la invitación de un maestro" |
| Buscador de Gestión de usuarios: por nombre (cualquier parte, sin importar acentos ni mayúsculas) y por correo parcial, en todos los roles, con filtro por rol (RF-57) | ADMIN | `docs/PRD.md` y `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`, "Nombre ajeno en la invitación de un maestro" |
| El admin puede editar el nombre de cualquier usuario (RF-58) | ADMIN | ídem |
| AUTH-02b (MF-05): la temporal se pierde si el admin busca otra cuenta con el restablecimiento en vuelo; texto genérico ante un fallo de red en la pantalla de admin; la alerta de error persiste al reabrir la confirmación | ADMIN | ídem |
| AUTH-02b (MF-02): tres tarjetas de la pantalla de admin hechas a mano en lugar de `Card`; `erroresPorCampo` duplicado entre `features/auth` y `features/admin` | ADMIN | ídem |
| AUTH-02b (MF-05): el `role="status"` de la contraseña temporal envuelve también el botón "Copiar", lo que puede producir un anuncio redundante. Hay que comprobarlo con un lector de pantalla (NVDA o VoiceOver) | ADMIN | ídem, y `revision.md`, "AUTH-02b — final" |
| AUTH-02b (MF-05): los botones que se deshabilitan mientras su petición está en vuelo pierden el foco (el navegador lo manda a `<body>`) | Encargo de dirección visual y sistema de diseño | ídem |
| AUTH-02b (T-14, riesgo aceptado): en la confirmación del restablecimiento, si el admin se va a otro campo después de un clic en una zona no enfocable o del salto de foco de Chrome, "Copiar" o "Cancelar" le roban el foco al llegar la respuesta. Sus 4 pruebas están como `it.fails` en `frontend/src/features/admin/cuentas-r4.ataque.test.tsx`. Para retirarlas: primero se quitan las marcas y se confirma que las 4 fallan en la aserción final del foco, no en la preparación; solo entonces se corrige el código y se comprueba que pasan en verde. Una `it.fails` también "pasa" si falla la preparación | Encargo de dirección visual y sistema de diseño (misma causa que la fila anterior) | `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`, "Resultado de la ronda 4 y decisión del humano sobre T-14" |

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
- Git local: `main` al día con `origin/main` (`b55897a`, fusión del PR #10). Rama actual: `feat/auth-02b-cuentas-frontend`, creada desde ese `main`.

## 6. Agentes
Modelos y esfuerzo en `AGENTS.md`, "Equipo de agentes y flujo de trabajo", y en el frontmatter de `.claude/agents/*.md`: `arquitecto`, `manager` y `tester` con `opus` y esfuerzo `high`. **El `programador` usa `sonnet` con esfuerzo `medium` a prueba, hasta revisarlo después del encargo CLASES.**
