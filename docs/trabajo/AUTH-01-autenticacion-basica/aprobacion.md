# Aprobación del humano — AUTH-01

Fecha: 2026-09-23
Aprobó: Carlos Salazar
Carril: sensible
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Texto de la aprobación
> Apruebo por escrito el plan AUTH-01 por el carril sensible, con Enmienda 1 que el arquitecto registra antes de programar:
> - M-01, M-02 y M-03: aplicar las tres correcciones del manager.
> - P-01: sí. P-02: recomendación del manager, GET /me sin estadoPago; el propio sale por GET /me/estado-pago en el módulo pagos. P-03: sí, y acepto por escrito el límite de intentos en memoria, de una sola instancia. P-04: sí. P-05: recomendación del manager, solo /acceso-restringido.
> - M-04: quitar los tres alcances de más. M-05: sin Testcontainers en este encargo; la prueba del admin único en transacción siempre revertida; se abre un chore de Testcontainers justo después. M-07: los fallos con correos inexistentes o inactivos sí cuentan para el 429. M-09: incluir la guarda onRoute. M-11: incluir la comprobación de JWT_SECRET en production. M-06, M-08 y M-10: aceptados como los describe el manager.
> - C-07 para docs: nombre_busqueda se normaliza en core al escribir, y el índice trigrama se aplica sobre esa columna ya normalizada; unaccent queda solo como apoyo. Anótalo para un DOCS-02.
> - Acepto por escrito: sesión deslizante de 30 días, iss/aud en el JWT, y que el encargo de despliegue traiga límite de tasa en /auth/* antes de abrir a alumnos.
> Continúa: enmienda -> programador -> tester (máximo 3 rondas) -> manager en modo final. Detente para que yo revise el diff. Sin commit.

## Respuestas a las preguntas no bloqueantes
| # | Respuesta |
|---|---|
| P-01 | **Sí:** `POST /auth/registro` deja la sesión iniciada (`201 { tokenAcceso }` + cookie) |
| P-02 | **Recomendación del manager:** `GET /me` **sin** `estadoPago`; el estado de pago propio sale por `GET /me/estado-pago` en el módulo `pagos` (otro encargo). `motivoRestriccion` sí se conserva en `/me` |
| P-03 | **Sí:** límite de intentos propio (solo fallos, reinicio al acertar, llave IP + correo normalizado). El humano acepta por escrito el almacén en memoria, de una sola instancia, que se reinicia con el proceso |
| P-04 | **Sí:** reutilización de refresco ⇒ revocar todas las sesiones, siempre, sin ventana de gracia |
| P-05 | **Recomendación del manager:** solo `/acceso-restringido` mínima; sin marcador `/cambiar-contrasena` (llega con AUTH-02 y su endpoint; `apiClient` deja ese 403 como comentario de punto de extensión) |

## Hallazgos del manager (modo plan) y decisión del humano
| # | Decisión |
|---|---|
| M-01 | Aplicar: V-07 usa `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` (banderas válidas en Prisma 7.10.0) |
| M-02 | Aplicar: `actualizadoEn DateTime @updatedAt @default(now())` en los modelos |
| M-03 | Aplicar: fijar la vigencia del token de acceso en 15 minutos como constante y probar el límite |
| M-04 | Quitar los tres alcances de más: el marcador `/cambiar-contrasena`, el cambio en `vite.config.ts` (redundante con la regla nueva de `apiClient`) y el `INSERT` por `psql` de V-08 |
| M-05 | Sin Testcontainers en este encargo. La prueba del admin único va en una transacción siempre revertida. Se abre un `chore` de Testcontainers justo después de AUTH-01 |
| M-06 | Aceptado como lo describe el manager: orden fijo entre `updateMany` condicional e `insert` en `rotarSesion` y destino documentado del perdedor de la carrera |
| M-07 | Los fallos de login con correos inexistentes o inactivos **sí cuentan** para el 429 |
| M-08 | Aceptado como lo describe el manager: evitar la doble llamada a `/refrescar` y la recarga completa al entrar sin sesión; `/acceso-restringido` bajo `RequireSesion` y fuera de `RequireRol`; esquema del 204 de `logout` |
| M-09 | Incluir la guarda `onRoute` que falla al arrancar si una ruta bajo `/api` fuera de la lista pública no lleva `authenticate` primero |
| M-10 | Aceptado: contradicción C-07 para docs (ver abajo) |
| M-11 | Incluir la comprobación en `config/env.ts` que impide arrancar en `production` con el `JWT_SECRET` de `.env.example` |

## Aceptado por escrito
- Sesión deslizante de 30 días (cada refresco emite una sesión nueva con vigencia completa).
- `iss`/`aud` en el JWT de acceso.
- El encargo de despliegue debe traer límite de tasa en `/auth/*` antes de abrir la plataforma a alumnos.
- Almacén en memoria del límite de intentos, de una sola instancia (P-03).

## Flujo
Flujo completo de `AGENTS.md`: `arquitecto` registra la **Enmienda 1** en `plan.md` → `programador` → `tester` (máximo 3 rondas) → `manager` en modo final → el humano revisa el diff. Sin commit: ningún agente ejecuta `git add`, `git commit` ni `git push`. Reglas vigentes: formateadores solo acotados al paquete; ningún agente termina procesos que no arrancó.

## Pendientes para encargos posteriores
- **DOCS-02 (C-07):** `nombre_busqueda` se normaliza en `core/` al escribir; el índice trigrama se aplica sobre esa columna ya normalizada; `unaccent` queda solo como apoyo. Alinear `ARCHITECTURE-ESSENTIALS.md` y `ARCHITECTURE.md` §14.
- **chore de Testcontainers:** justo después de AUTH-01 (M-05).
- **Despliegue:** límite de tasa en `/auth/*` antes de abrir a alumnos.
- **AUTH-02:** recuperación de contraseña, invitación de maestros, restablecimiento por admin, cambio de contraseña (`POST /auth/cambiar-contrasena` y la pantalla `/cambiar-contrasena`), correo/Resend, `tokens_cuenta`.
- **`pagos`:** `GET /me/estado-pago` (P-02).

## Decisiones del humano tras la revisión final (ESCALAR AL HUMANO) — 2026-09-24
Texto del humano:
> 1. Autorizo la mini-ronda de cierre fuera del máximo de 3 rondas: el programador corrige T-13, M-14 y M-17; el tester corrige logs-r2 y api-real (M-13), asegurando que las comprobaciones de "sin secretos en el log" lean el log completo antes de afirmar nada; el manager repite lint, build, tres corridas de test y los hashes, y aprueba si todo sale verde. Si algo vuelve a fallar, te detienes y me consultas: no hay ronda 5.
> 2. D-01: opción (a). Acepto las dos copias de fastify-plugin. El chore siguiente, CHORE-01, junta Testcontainers y subir el backend a fastify-plugin ^6.
> 3. Acepto la ampliación de DEC-16 y su límite con addHook, documentado en el README de middleware/ (M-14).
> 4. Autorizo tus tres cambios en AGENTS.md y CLAUDE.md.
> 5. Agrega también esta regla, en AGENTS.md ("Reglas del equipo") y en programador.md ("Prohibido"): "Cuando el plan dice detenerse ante una condición, te detienes aunque la alternativa parezca obvia o inofensiva. Resolverlo por tu cuenta es una desviación, aunque salga bien."
> 6. Los pendientes de despliegue (trustProxy, NODE_ENV=production obligatorio, límite de tasa en /auth/*, tope de memoria del almacén de intentos) quedan anotados como requisitos del encargo DEPLOY. El resto, a DOCS-02.
> Al terminar, detente para que yo revise el diff. Sin commit.

### Mini-ronda de cierre (ronda 4, única, autorizada fuera del máximo)
- `tester`: corrige los arneses de `backend/test/logs-r2.ataque.test.ts` y `backend/test/api-real.ataque.test.ts` (M-13). Las comprobaciones de "sin secretos en el log" deben leer el log completo antes de afirmar nada.
- `programador`: corrige T-13 (U+1D159 en `nombreSchema`, con comentario de la limitación aceptada), M-14 (`backend/src/middleware/README.md`: límite de la guarda con `addHook` y dependencia del orden de los plugins) y M-17 (conteos del `README.md` §7 con los números finales).
- `manager`: repite lint, build, tres corridas de test y los hashes de las pruebas del tester; aprueba si todo sale en verde.
- **Si algo vuelve a fallar, el orquestador se detiene y consulta al humano. No hay ronda 5.**

### Arbitrajes confirmados por el humano
- **D-01:** opción (a). Se aceptan las dos copias de `fastify-plugin` (5.1.0 del backend y 6.0.0 dentro de `@fastify/cookie`).
- **Ampliación de DEC-16 (T-06, T-12):** aceptada, con el límite de `addHook` documentado en `backend/src/middleware/README.md` (M-14).

### Cambios aplicados por el orquestador (autorizados)
- `AGENTS.md` "Comandos": `seed:admin` y `reset:admin` describen `ADMIN_*`; `reset:admin` pasa del bloque de infra al del backend.
- `AGENTS.md` "Reglas del equipo": regla de procesos de larga vida en Windows (sin `Start-Process` ni arranques con tubería; salida a archivo y PID guardado) y la regla nueva de detenerse cuando el plan lo dice.
- `.claude/agents/programador.md` "Prohibido": la regla nueva de detenerse cuando el plan lo dice.
- `CLAUDE.md`: `services/tokenAcceso.ts` y `services/navegacion.ts` en "Ubicaciones compartidas"; el tipo `Rol` ya no es provisional (se reexporta de `shared/`); fila `auth` con la bienvenida post-login provisional.

### Encargos siguientes
- **CHORE-01:** Testcontainers en las pruebas de integración + subir el backend a `fastify-plugin ^6` (D-01).
- **DEPLOY (requisitos antes de abrir a alumnos):** `trustProxy`; `NODE_ENV=production` obligatorio; límite de tasa en `/auth/*` (y global, registrado con `hook: "preHandler"` para no chocar con la guarda de rutas); tope de memoria del almacén de intentos. Además, de la revisión: CORS con credenciales y `OPTIONS *` en `rutas-publicas.ts`, orden de los plugins transversales frente a `registrarMiddleware`, `@fastify/helmet`, `seed:admin` desde `dist/`, imagen con `prisma.config.ts` y CLI (pendiente 8 de DOCS-01).
- **DOCS-02:** C-07 (`nombre_busqueda` normalizado en `core/`, trigramas sobre esa columna, `unaccent` solo como apoyo); ESSENTIALS "Autenticación" (`Path=/api/auth`, "solo `sub`" excluye rol y banderas pero no `iss`/`aud`, sesión deslizante de 30 días); §6 (`protegido()`, guarda `onRoute` con la ampliación de DEC-16 y su límite, `userId` en logs); §7 (`POST /auth/registro` responde con sesión); §14 (`reemplazada_por` sin FK, `actualizado_en` con `DEFAULT now()`, purga de `sesiones`, P2002 y P2039/22021 con el driver adapter); §16 (límite de `login` propio, `@fastify/rate-limit` para el global y `/auth/*` con la nota de orden frente a la guarda).
- Otros: AUTH-02; `pagos` (`GET /me/estado-pago`); `admin` (baja y restricción revocan sesiones); `clases` (`requireMembership`/`requireOwnership` reales; vaciar toda la caché al cambiar de identidad); `LIMPIEZA_DIARIA` (purga de `sesiones`); guarda sobre todas las rutas (M-15) y ESLint contra `addHook` en `handlers/` (M-14).

### Cierre — 2026-09-24
Verificación de cierre del Manager: **APROBADO** (`revision.md`, sección "cierre"): lint y build en verde; tres corridas de `npm test` con 395/395 (backend 30 archivos / 326, frontend 11 / 69; 224 del Tester); hashes de los 14 archivos del Tester coincidentes.

Después de esa verificación, el orquestador aclaró la redacción de su propia regla de Windows en `AGENTS.md` (M-18 del Manager): el problema es la tubería, no `Start-Process`, que con `-RedirectStandardOutput` y `-PassThru` es la forma correcta. Queda a revisión del humano en el diff.
