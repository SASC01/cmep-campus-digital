# Aprobación — CHORE-05 · suites por ronda, tamaño de subentregas y trabajo en paralelo

Carril: trivial (solo documentos de proceso; sin código, sin pruebas). Rama `chore/proceso-suites` desde `main` = `8d98fba`, en la segunda copia de trabajo (`Proyecto_PlataformaEducativa-B`), mientras ADMIN-01 corre en la principal (`feat/admin-01`). Los cambios a archivos protegidos los aplicó el orquestador por instrucción directa del humano (`ESTADO.md` §4).

## Instrucción literal del humano (2026-11-04)

> Estás en una segunda copia de trabajo (git worktree) en la rama chore/proceso-suites desde main. En la copia principal corre ADMIN-01 en paralelo; no toques nada de código, solo documentos de proceso.
>
> Aplica estos dos cambios de proceso en AGENTS.md y en .claude/agents/tester.md, programador.md y manager.md donde corresponda, con texto breve:
>
> 1. Suites en rondas intermedias. En las rondas del programador y del tester se corre solo la suite del módulo tocado (por ejemplo npx vitest run src/features/admin o backend/test/<módulo>), más lint. La suite completa de cada paquete se corre una sola vez por subentrega, en la verificación del manager al cerrar. Si el encargo tocó shared/, la verificación del manager corre las dos completas, una después de otra. Sigue vigente: nunca dos suites a la vez.
>
> 2. Tamaño de subentregas. Una subentrega se parte solo si pasa de unos 30 archivos tocados, no por tema. En los planes, el arquitecto justifica cada corte con el conteo estimado.
>
> Agrega también una nota de "Trabajo en paralelo": puede haber dos copias de trabajo activas en la misma máquina, cada una con su propia base de desarrollo (DATABASE_URL distinta en su backend/.env; las pruebas del backend ya están aisladas por Testcontainers); antes de correr una suite, el agente pregunta al humano si la otra copia está corriendo una; solo una copia levanta servidores de desarrollo a la vez porque comparten puertos; ESTADO.md se concilia al fusionar.
>
> Actualiza los hashes de los archivos protegidos donde haga falta. Dame el bloque de commit y el texto del PR.

## Qué cambió

- **`AGENTS.md`:** "Pruebas" gana "Suites por ronda" y la viñeta de `shared/` se ajusta (en las rondas, `lint`, `build` y la suite de los módulos tocados de cada paquete; al cerrar, el manager corre las dos completas). "Resúmenes verificables", viñeta "Verificación del manager": suite de los módulos tocados; la completa, al cerrar. "Reglas del equipo" gana "Tamaño de subentregas". Subsección nueva "Trabajo en paralelo" en "Equipo de agentes y flujo de trabajo".
- **`.claude/agents/tester.md`:** verificación propia con la suite del módulo; confirmar que la otra copia no corre una suite; PA-07 en las rondas sobre la suite del módulo (conteo, parada por (a) y reporte de cada `Error no controlado` y `P2028`), con el control positivo y el cotejo en la corrida completa del manager; regresión de las `*.ataque` previas del encargo por ruta.
- **`.claude/agents/programador.md`:** suite del módulo tras cada paso; con `shared/`, los dos paquetes por módulo; confirmar la otra copia antes de una suite o de levantar servidores.
- **`.claude/agents/manager.md`:** verificación del resumen con la suite de los módulos; la revisión final (Modo 2) es la única corrida completa por subentrega, con las dos completas en serie si tocó `shared/` y PA-07 completa en la del backend; confirmar la otra copia; en Modo 1, revisar que cada corte de subentregas traiga su conteo.
- **`.claude/agents/arquitecto.md`** (no nombrado en la instrucción; el corte lo justifica el arquitecto): viñeta "Tamaño de subentregas".
- **`CLAUDE.md`** (no nombrado en la instrucción; contradecía la regla nueva): "Tras cada cambio: `lint` y la suite del módulo afectado (la completa del paquete, una vez por subentrega…)".
- **`docs/ESTADO.md`:** entrada de este encargo en la sección 2.

Interpretaciones del orquestador, a confirmar por el humano: (1) un subagente no habla con el humano, así que el orquestador pregunta por la otra copia antes de invocarlo y le pasa la respuesta; sin ella, el subagente se detiene y la pide; (2) PA-07 completa (control positivo, inventario y permitidos) pasa a la corrida completa del manager; (3) "Trabajo en paralelo" agrega que los servicios de `infra/` son los mismos para las dos copias y ninguna los baja sin preguntar.

## SHA-256

| Archivo | Antes (`8d98fba`) | Después |
|---|---|---|
| `AGENTS.md` | `bb98590852939b0d5f80a177db57da29f2dffffd99346b2bcaaac67d9a4dc787` | `5b818b82ee292d759bdf08cf6c152aef40dac941a71d6f8e7ae7e4dea4d93779` |
| `CLAUDE.md` | `f87cd7b027de67554728984ca5bcd6b3ec39369273c5d702bd99e8603afe73e5` | `b5cde043a2c7759b343eb63f41eae1039a77e20fed8db2ba9b19baf7e8830834` |
| `.claude/agents/arquitecto.md` | `c144349aa450cb9272f4dc5b8ec3b9d989b56f3544c0bf06fedc759df2d9d722` | `92bd117addbc33b0454dd1d961550ed819f93f23f97f70a1ea13e7d40753f311` |
| `.claude/agents/manager.md` | `5769b945932975deb1899e27a3f23390a63a1a4912e33f7d3714bce23d35388a` | `41a4fa3e40ba2b1505d8ea59ad7143a7bdce841ac3db0fbc47a2f2fabb422766` |
| `.claude/agents/programador.md` | `30e26ffff2a2b2e250f705cb03f95e7d52f2f6c308fa388eb898eccabbd865b9` | `b1d0965c366f1a778a392e907b4d6b5738ab21fee38aaa428d8cb2d0cee4b567` |
| `.claude/agents/tester.md` | `a0899014fc45d4fb420b23babe6cb3eafb157c2d6621a33c6945154339d238a5` | `f33831f0e9d0d31b66990e20aa6565fb5ca7e92f36ca453777c741b45ebbc9ab` |

Los seis están en el "No se toca" de ADMIN-01 (`docs/trabajo/ADMIN-01-administracion/plan.md`, "Regla para todas las subentregas"). Cuando `main` con este cambio entre a `feat/admin-01`, el orquestador de esa copia anota estos hashes "Después" en el `aprobacion.md` de ADMIN-01 y esos archivos se verifican contra el hash, no contra `8d98fba` (`AGENTS.md`, "Commits y cierre de subentregas"). Hasta entonces, ADMIN-01 sigue con las reglas de su copia.

Verificación: solo documentos; no se corrieron `lint`, `test` ni `build` (no hay código que verificar). `git diff --stat` contra `8d98fba`: 7 archivos, 26 inserciones, 9 borrados, más este archivo.
