# Estado del proyecto

Tablero vivo de CMEP Campus Digital. Solo hechos verificables; el detalle vive en los archivos a los que remite. Lo lee el orquestador al inicio de cada sesión y lo actualiza al cerrar cada encargo o antes de limpiar o compactar la sesión (`AGENTS.md`, "Reglas del equipo").

Última actualización: 2026-09-24, por el orquestador.

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
| DOCS-02a · clases en vivo en `dev`, requisitos de DEPLOY, modelos de los agentes | `docs/docs-02a-envivo-y-modelos` | #8 | `docs/trabajo/DOCS-02a-envivo-y-agentes/` |

Suite al cierre de CHORE-01: 399 pruebas en verde en tres corridas completas (backend 31 archivos / 330, frontend 11 / 69). Fuente: `docs/trabajo/CHORE-01-testcontainers/revision.md`, sección "cierre".

## 2. Encargos en curso
- **AUTH-02 · cuentas y correo** (RF-03, RF-04, RF-04a, RF-04b, RF-04d; carril sensible). Entregados `plan.md` (estado `LISTO`) y `revision.md` del manager en modo plan (veredicto **CAMBIOS REQUERIDOS** por M-01, de redacción). **Pendiente de la aprobación del humano; nada implementado.** Ambos archivos están sin rastrear en git. Las decisiones que esperan al humano están en la sección "Para el humano" de `docs/trabajo/AUTH-02-cuentas-y-correo/revision.md`: enmienda con M-01 y N-01..N-06, P-01 (partir en AUTH-02a backend y AUTH-02b frontend), P-02..P-05, C-01 (cambio de contraseña para restringidos), FE-01 (entregar con la prueba de rutas del tester en rojo hasta que la actualice) y N-03 (la API dejaría de arrancar sin base de datos).

## 3. Pendientes y su destino
| Pendiente | Destino | Dónde está anotado |
|---|---|---|
| N-01 de CHORE-01: la guarda de la base de pruebas acepta `?host=` en la URL | CHORE-02 | `docs/trabajo/CHORE-01-testcontainers/aprobacion.md` y `revision.md` |
| N-03 de CHORE-01: un `tsconfig` para `backend/test/` dentro de `npm run lint` | CHORE-02 | ídem |
| Convertir los `if (!admin) return` de `sesiones-y-cadena.ataque`, `auth-registro.ataque` y `api-real.ataque` en aserciones de precondición | Próxima ronda del tester | `docs/trabajo/CHORE-01-testcontainers/aprobacion.md` |
| Retirar la transacción revertida de `admin-unico.ataque` si ya no hace falta | Próxima ronda del tester | ídem |
| C-07 (`nombre_busqueda` normalizado en `core/`, trigramas sobre esa columna) y el resto de textos para `ARCHITECTURE*.md` | DOCS-02 | `docs/trabajo/AUTH-01-autenticacion-basica/aprobacion.md`, "Pendientes para encargos posteriores" y "Encargos siguientes" |
| Requisitos previos a abrir la plataforma a alumnos | DEPLOY | `docs/ARCHITECTURE.md` §18, "Requisitos previos a abrir la plataforma" |
| `pagos`, `admin`, `clases`, `LIMPIEZA_DIARIA`, guarda sobre todas las rutas, ESLint contra `addHook` en `handlers/` | Encargos de cada módulo | `docs/trabajo/AUTH-01-autenticacion-basica/aprobacion.md`, "Encargos siguientes" |
| Opcionales: unitarias del backend sin `globalSetup`; ESLint contra `@testcontainers/*` en `backend/src/**` | Sin encargo asignado | `docs/trabajo/CHORE-01-testcontainers/aprobacion.md` |
| Dirección visual (tokens definitivos, sombras, `Toaster`), `paths` de shadcn, grep de V-07 | Encargo de dirección visual y planes futuros | `docs/trabajo/DOCS-01-pendientes/resumen.md` |
| M-03 de FRONT-01: `jsdom` pide Node `^24.15.0` y el equipo tiene `v24.11.1` (subir Node o aceptar el aviso) | **Sin decidir** | `docs/trabajo/FRONT-01-esqueleto-frontend/revision.md` |
| Comprobación en navegador real (360 px, foco, dos pestañas refrescando, cambio de cuenta) | Humano | `docs/trabajo/AUTH-01-autenticacion-basica/revision.md`, sección "cierre". No consta en los documentos que se haya hecho |

## 4. Decisiones de esta sesión sin documento propio
Las decisiones del humano de esta sesión están registradas en el `aprobacion.md` o `resumen.md` de cada encargo (tabla de la sección 1) y, las que son reglas, en `AGENTS.md`. Estas dos prácticas se acordaron encargo por encargo y no tienen otro documento general:
- Los cambios en `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md` y `docs/ARCHITECTURE*.md` los aplica el orquestador con la autorización del humano, no el programador; los agentes proponen el texto literal.
- Cuando el entorno impide al tester escribir su reporte, el orquestador lo registra tal cual en `reporte-tester.md` con una nota de transcripción al inicio (ejemplos: `docs/trabajo/AUTH-01-autenticacion-basica/reporte-tester.md`, `docs/trabajo/CHORE-01-testcontainers/reporte-tester.md`).

## 5. Entorno de desarrollo del humano
Verificado el 2026-09-24:
- Docker Desktop 4.48.0 (motor 28.5.1), encendido. Node `v24.11.1`.
- Infra (`infra/docker-compose.yml`, proyecto `campus-dev`): `postgres`, `minio` y `livekit` sanos, todos publicados solo en `127.0.0.1`. PostgreSQL en `127.0.0.1:5433`, base `campus_dev`, con el admin de desarrollo y una cuenta creada por el humano; ninguna prueba ni agente las toca.
- Sin contenedores de Testcontainers vivos.
- Regla del firewall de Windows "Campus: bloquear entrada a Docker en redes publicas": existe, habilitada, Inbound, Block, perfil Público, sobre `com.docker.backend.exe`. `daemon.json` sin la opción `"ip"` (no aplica en Docker Desktop 4.48).
- Red actual: `IZZI-F281`, categoría **Pública**.
- **La suite del backend no se corre en una red pública o no confiable sin esa regla aplicada** (`AGENTS.md`, "Pruebas", riesgo residual de Testcontainers; pasos en `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`).
- Git local: rama actual `docs/docs-02a-envivo-y-modelos` (ya fusionada); `main` local va 2 commits atrás de `origin/main`. Antes del próximo encargo con código hay que actualizar `main` y crear la rama del encargo.

## 6. Agentes
Modelos y esfuerzo en `AGENTS.md`, "Equipo de agentes y flujo de trabajo", y en el frontmatter de `.claude/agents/*.md`: `arquitecto`, `manager` y `tester` con `opus` y esfuerzo `high`. **El `programador` usa `sonnet` con esfuerzo `medium` a prueba, hasta revisarlo después del encargo CLASES.**
