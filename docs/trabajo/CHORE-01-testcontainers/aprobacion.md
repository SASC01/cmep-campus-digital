# Aprobación del humano — CHORE-01

Fecha: 2026-09-24
Aprobó: Carlos Salazar
Carril: normal, con aprobación escrita
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Texto de la aprobación
> Apruebo por escrito el plan CHORE-01 por el carril normal.
> - P-01: no. P-02: sí, las 4 pruebas unitarias de la guarda; el cierre pasa a 399. P-03: solo @testcontainers/postgresql.
> - Autorizo D-25 y los textos opcionales de §5 y §20, además de los de AGENTS.md, ESSENTIALS y §2. Los aplicas tú.
> - Regla nueva para el tester, que aplicas tú en tester.md y en AGENTS.md ("Pruebas"): "Toda prueba debe ejecutar al menos una aserción. Nunca termines una prueba con un return temprano cuando falte una condición previa: si falta, la prueba falla con un mensaje que lo explique." Las tres pruebas existentes que tienen ese patrón no se tocan en este encargo; las revisa el tester en su próxima ronda.
> Continúa: programador -> manager en modo final. Detente para que yo revise el diff. Sin commit.

## Respuestas a las preguntas no bloqueantes
| # | Respuesta |
|---|---|
| P-01 | **No:** no hay salida explícita hacia infra (`PRUEBAS_CONTRA_INFRA`). La variante descrita en el plan no se implementa |
| P-02 | **Sí:** se agregan las 4 pruebas unitarias de la guarda (`backend/test/entorno-de-pruebas.test.ts`). **El criterio de cierre pasa a 399 pruebas** (backend 330, frontend 69) en tres corridas completas |
| P-03 | Solo `@testcontainers/postgresql ^12.1.0` como devDependency del backend; `testcontainers` no se declara directo |

## Documentos que aplica el orquestador (autorizados)
- `AGENTS.md` "Comandos" (comentario de `npm run test`) y "Pruebas" (tercera viñeta): textos literales del plan.
- `docs/ARCHITECTURE-ESSENTIALS.md` "Stack › Pruebas", `docs/ARCHITECTURE.md` §2 (fila "Pruebas"), §5 (línea de `test/`) y §20 (nueva decisión **D-25**): textos literales del plan.
- **Regla nueva del tester** en `.claude/agents/tester.md` ("Reglas de combate") y `AGENTS.md` ("Pruebas"), con el texto literal del humano. Se aplica ahora; las tres pruebas existentes con `if (!admin) return` (`sesiones-y-cadena.ataque:268-277`, `auth-registro.ataque:163-176`, `api-real.ataque:301-314`) **no se tocan en este encargo**: las revisa el tester en su próxima ronda.

## Flujo
`programador` → `manager` en modo final → el humano revisa el diff. Sin tester, salvo la excepción del plan (ajuste de un `*.ataque.test.ts` que no funcione con el contenedor, sin debilitar aserciones, previa consulta al humano si se activa PA-12). Sin commit. Reglas vigentes: formateadores acotados; procesos por PID propio; ningún proceso ajeno terminado; paradas (PA-01..PA-19) obligatorias.

## Pendientes para encargos siguientes
- **Próxima ronda del tester:** convertir los `if (!admin) return` en aserciones de precondición; retirar la transacción revertida de `admin-unico.ataque` si ya no hace falta.
- **CI / DEPLOY:** `prisma generate` necesita una `DATABASE_URL` de relleno; el CI necesita Docker para Testcontainers.
- **Opcional:** separar las unitarias del backend en un proyecto de Vitest sin `globalSetup`; regla de ESLint contra `@testcontainers/*` en `backend/src/**`.

## Parada PA-06 durante la implementación — 2026-09-24
El programador se detuvo en PA-06 (paso 3, V-05) porque `npm ls --all` muestra `aws-ssl-profiles@1.1.2`. Evidencia: llega por `prisma@7.10.0 → mysql2@3.15.3`; ya estaba antes de este encargo (`git diff package-lock.json` no contiene `aws`); `firebase`, `supabase` y `vercel` no aparecen. `npm audit` (solo lectura, ejecutado por el orquestador) muestra las mismas 4 altas conocidas de M-04 de BACK-02 (`@prisma/config`, `deepmerge-ts`, `mysql2`, `prisma`); Testcontainers no añade ninguna.

**Resolución del orquestador:** continuar desde el paso 4, con base en una decisión escrita previa del humano: en BACK-02 aceptó `aws-ssl-profiles` como dependencia transitiva del CLI de Prisma (M-01) y precisó la regla 11 de `AGENTS.md` ("las dependencias transitivas de herramientas de desarrollo se reportan, pero no bloquean"). PA-06 se interpreta, para el resto del encargo, como: **aparece en el árbol un paquete de AWS, Firebase, Supabase o Vercel que no estaba en el `package-lock.json` anterior a CHORE-01**. Cualquier paquete así sigue siendo parada. Si el humano discrepa de esta resolución, se revierte `backend/package.json` y `package-lock.json` y se replantea.

## Decisiones del humano tras la revisión final (ESCALAR AL HUMANO) — 2026-09-24
Texto del humano:
> 1. M-01: el programador liga el PostgreSQL de pruebas a 127.0.0.1. Para Ryuk, propónme los pasos exactos para mitigarlo en mi equipo, primero con la opción de Docker Desktop de publicar puertos en 127.0.0.1 y, si no aplica, con el firewall de Windows en el perfil Público. No los ejecutes: los aplico yo. Incluye cómo verificar durante una corrida que ningún puerto de pruebas escucha fuera de 127.0.0.1. Documenta el riesgo residual en AGENTS.md ("Pruebas"), incluida la regla de no correr la suite en redes públicas sin la mitigación aplicada.
> 2. M-02: opción (b). Invoca al tester para hacer robusta la prueba de tiempos sin debilitar su aserción; después el manager repite tres corridas completas. Si vuelve a fallar, te detienes y me consultas.
> 3. PA-06: confirmo tu resolución.
> 4. N-01 y N-03 quedan anotados para CHORE-02.
> Detente para que yo revise el diff. Sin commit.

### Resumen
- **M-01:** el `programador` liga el PostgreSQL de pruebas a `127.0.0.1` (subclase con `beforeContainerCreated()` que fija `HostIp`, según la revisión del Manager). **Ryuk:** mitigación en el equipo del humano, que la aplica él; pasos y verificación en `mitigacion-ryuk.md` (esta carpeta). El orquestador documenta el riesgo residual y la regla de redes públicas en `AGENTS.md` "Pruebas".
- **M-02:** el `tester` (excepción autorizada) hace robusta la prueba de tiempos de `auth-login.ataque` sin debilitar su aserción; luego el `manager` repite tres corridas completas. Si vuelve a fallar: parada y consulta al humano.
- **PA-06:** resolución del orquestador confirmada por el humano.
- **CHORE-02:** N-01 (la guarda acepta `?host=` en la query de la URL; endurecerla) y N-03 (`tsconfig` para `backend/test/` dentro de `npm run lint`).

### Precondición antes de volver a correr la suite (detectada por el orquestador)
El 2026-09-24 la red activa del equipo (`uacam5 2`) está en la categoría **Pública** de Windows, y Docker Desktop tiene dos reglas entrantes **Allow** en el perfil Público (`Docker Desktop Backend`, `com.docker.backend.exe`). Sin la mitigación de Ryuk, correr la suite expondría Ryuk a esa red durante cada corrida. Por la regla que el humano pidió documentar, **ninguna corrida del backend (programador, tester, manager) se ejecuta hasta que el humano confirme la mitigación aplicada o que la red es de confianza**.

### Verificación de las mitigaciones — 2026-09-24
El humano reportó ambas mitigaciones aplicadas. El orquestador comprobó que la opción 1 (`"ip": "127.0.0.1"`) no aplica en Docker Desktop 4.48.0 y que la regla de bloqueo del firewall (opción 2) no existe. Detalle en `mitigacion-ryuk.md`, sección "Resultado de la verificación del orquestador". La suite no se corre hasta que la regla de bloqueo exista.

### Mitigación confirmada — 2026-09-24
Regla de bloqueo del firewall (perfil Público) comprobada por el orquestador: existe y está habilitada. Opción 1 retirada por no aplicar en Docker Desktop 4.48.0. El humano la da por aplicada sin prueba desde otro equipo y autoriza continuar: verificación del PostgreSQL de pruebas en `127.0.0.1` → `tester` (M-02) → `manager` (tres corridas) → texto de `AGENTS.md` con la redacción del orquestador.

## Cierre — 2026-09-24
Verificación de cierre del Manager: **APROBADO** (`revision.md`, sección "cierre"): regla del firewall comprobada antes de correr; lint y build en verde; tres corridas completas de `npm test` con **399/399** (backend 31/330, frontend 11/69), sin intermitencias; huella de `campus_dev` idéntica byte a byte; PostgreSQL de pruebas siempre en `127.0.0.1`; Ryuk en todas las interfaces (riesgo residual cubierto por el firewall); 14 hashes correctos (nuevo el de `auth-login.ataque`); 0 contenedores de Testcontainers al terminar.

Después de esa verificación, el orquestador: corrigió en `mitigacion-ryuk.md` una ruta que había perdido una barra al transcribirse, y aplicó en `AGENTS.md` "Pruebas" la viñeta del riesgo residual de Ryuk, la regla de no correr la suite en redes públicas o no confiables sin la mitigación, la advertencia de que la regla del firewall solo cubre el perfil Público, y la nota de que en el equipo de Carlos está aplicado el bloqueo del firewall (la opción de Docker Engine no aplica en Docker Desktop 4.48).
