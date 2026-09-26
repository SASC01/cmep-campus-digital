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

Suite al cierre de CHORE-01: 399 pruebas en verde en tres corridas completas (backend 31 archivos / 330, frontend 11 / 69). Fuente: `docs/trabajo/CHORE-01-testcontainers/revision.md`, sección "cierre".

## 2. Encargos en curso
- **AUTH-02 · cuentas y correo** (RF-03, RF-04, RF-04a, RF-04b, RF-04d; carril sensible). **Aprobado por escrito el 2026-09-24** (`docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`), partido en dos:
  - **AUTH-02a (backend, pasos 1–15): terminada y APROBADA por el manager final el 2026-09-25. Pendiente de la revisión humana del diff; sin commit.** Rama `feat/auth-02a-cuentas-backend`, con todo sin confirmar en el árbol de trabajo.
    - Decisiones del humano sobre MF-01..MF-04, tomadas el 2026-09-26 y aplicadas (`aprobacion.md`, "Decisiones del humano sobre el cierre de AUTH-02a"):
      - MF-01: sin correos reales ni identificadores de `campus_dev` en `docs/`.
      - MF-02: corregido por el carril trivial, solo en `README.md`. §3 ya no invierte la frase sobre los entornos. §7 trae los conteos reales: backend 65 archivos / 657 pruebas, 319 de ellas adversarias en 21 archivos, unos 32 s.
      - MF-03: cambio ratificado y regla nueva en `AGENTS.md`.
      - MF-04: destinos confirmados, y textos añadidos a §8 y §18.
      - Además, una línea nueva en `CLAUDE.md`: responder siempre en español de México.
    - Suite al cierre: backend 65 archivos / 657 pruebas y frontend 11 / 69, en verde, más lint y build (manager final y tres corridas del tester). Hashes vigentes de las 24 `*.ataque`: `reporte-tester.md`, ronda 3.
    - Textos de documentos aplicados: `AGENTS.md` "Comandos"; ESSENTIALS "Autenticación", "Autorización" y "Reglas de datos" (con dos precisiones de redacción del manager final); `ARCHITECTURE.md` §6, §7, §8, §9, §14, §18 y D-27.
    - Historial de la parte:
    - Hecho: Enmienda 1 (manager: APROBADO; E-02 decidido por el humano) y programador ronda 1 (backend 54 archivos / 509 pruebas, FE-01 en rojo según lo autorizado; `resumen-programador.md`).
    - Tester ronda 1: **ROTO**, con T-01..T-06 (4 medios, 2 bajos). FE-01 actualizada y tareas de CHORE-01 cerradas. Backend 61 archivos / 601 pruebas, 7 en rojo. Reporte transcrito por el orquestador en `reporte-tester.md`.
    - Programador ronda 2: T-01..T-06 corregidos. Backend 61 archivos / 603 pruebas y frontend 69/69, en verde en tres corridas. V-17 repetido a pedido del orquestador. Desviación declarada: DEC-08 bloquea antes la fila del usuario.
    - Tester ronda 2: **ROTO**, con T-07 (media), T-08 (alta) y T-09 (media): condiciones de carrera entre la revocación de sesiones o el cambio de contraseña y `refrescar` o `login` de AUTH-01. T-02..T-06 resueltos; T-01 parcialmente. Backend 63 archivos / 616 pruebas, 4 en rojo.
    - Enmienda 2 (protocolo único de bloqueo sobre `usuarios` y comprobación del hash vigente en el login): **aprobada por el humano el 2026-09-25**, opción (a). Autoriza tocar `adapters/db/sesiones.ts` y el bloque de `POST /login` de `handlers/auth/index.ts` (AUTH-01) y el cambio de `reset:admin` en `usuarios.ts` (`aprobacion.md`).
    - Enmienda 2 incorporada al plan. Verificación del manager: **APROBADO**. E2-03 (correcciones de correo cruzadas) aceptado por el humano como riesgo residual para ADMIN.
    - Programador ronda 3: Enmienda 2 implementada. Backend 64 archivos / 635 pruebas y frontend 69/69, en verde en tres corridas. V-17 repetido. El diff de `handlers/auth/index.ts` se limita al bloque de `POST /login`.
    - Tester ronda 3: **RESISTE**, sin hallazgos. Backend 65 archivos / 657 pruebas y frontend 69/69, en verde en tres corridas; 24 `*.ataque` con hashes en `reporte-tester.md`.
    - Manager final: **APROBADO**, sin problemas que bloqueen; MF-01..MF-04 no bloquean.
  - **AUTH-02b (frontend, pasos 16–21 y la sección de frontend del README):** después del commit de AUTH-02a. Mismo plan; tester y manager final propios; la fila `admin` de `CLAUDE.md` se aplica al cerrarla.

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
| M-03 de FRONT-01: `jsdom` pide Node `^24.15.0` y el equipo tiene `v24.11.1` (subir Node o aceptar el aviso) | **Sin decidir** | `docs/trabajo/FRONT-01-esqueleto-frontend/revision.md` |
| Comprobación en navegador real (360 px, foco, dos pestañas refrescando, cambio de cuenta) | Humano | `docs/trabajo/AUTH-01-autenticacion-basica/revision.md`, sección "cierre". No consta en los documentos que se haya hecho |

## 4. Decisiones de esta sesión sin documento propio
Las decisiones del humano de esta sesión están registradas en el `aprobacion.md` o `resumen.md` de cada encargo (tabla de la sección 1) y, las que son reglas, en `AGENTS.md`. Estas dos prácticas se acordaron encargo por encargo y no tienen otro documento general:
- Los cambios en `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md` los aplica el orquestador con la autorización del humano, no el programador; los agentes proponen el texto literal.
- Cuando el entorno impide al tester escribir su reporte, el orquestador lo registra tal cual en `reporte-tester.md` con una nota de transcripción al inicio (ejemplos: `docs/trabajo/AUTH-01-autenticacion-basica/reporte-tester.md`, `docs/trabajo/CHORE-01-testcontainers/reporte-tester.md`, las tres rondas de `docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md`).
- Los archivos de `docs/trabajo/` no llevan correos reales ni identificadores de `campus_dev`. Los ficticios (`@pruebas.local`, `admin@campus.local`) pueden quedarse (decisión del humano en el cierre de AUTH-02a, MF-01).

## 5. Entorno de desarrollo del humano
Verificado el 2026-09-24:
- Docker Desktop 4.48.0 (motor 28.5.1), encendido. Node `v24.11.1`.
- Infra (`infra/docker-compose.yml`, proyecto `campus-dev`): `postgres`, `minio` y `livekit` sanos, todos publicados solo en `127.0.0.1`. PostgreSQL en `127.0.0.1:5433`, base `campus_dev`, con el admin de desarrollo y una cuenta creada por el humano; ninguna prueba ni agente las toca.
- Sin contenedores de Testcontainers vivos.
- Regla del firewall de Windows "Campus: bloquear entrada a Docker en redes publicas": existe, habilitada, Inbound, Block, perfil Público, sobre `com.docker.backend.exe`. `daemon.json` sin la opción `"ip"` (no aplica en Docker Desktop 4.48).
- Red actual: `IZZI-F281`, categoría **Pública**. El humano declara que es la red de su casa y de confianza.
- **La suite del backend no se corre en una red pública o no confiable sin esa regla aplicada** (`AGENTS.md`, "Pruebas", riesgo residual de Testcontainers; pasos en `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`).
- Git local: `main` al día con `origin/main` (`12dbe5e`, fusión del PR #9). Rama actual: `feat/auth-02a-cuentas-backend`, creada desde ese `main`, con AUTH-02a sin confirmar.
- `campus_dev` tiene la migración `tokens_cuenta` aplicada y el esquema `pgboss`, que crearon la API y el worker en V-17. La huella de las cuentas del humano quedó idéntica en las tres corridas de V-17.

## 6. Agentes
Modelos y esfuerzo en `AGENTS.md`, "Equipo de agentes y flujo de trabajo", y en el frontmatter de `.claude/agents/*.md`: `arquitecto`, `manager` y `tester` con `opus` y esfuerzo `high`. **El `programador` usa `sonnet` con esfuerzo `medium` a prueba, hasta revisarlo después del encargo CLASES.**
