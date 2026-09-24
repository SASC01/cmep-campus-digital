# Plan — AUTH-01: autenticación básica (registro, login, refresco, logout, `GET /me`, cadena de middleware)
Estado: LISTO
Carril: sensible (`middleware/`, `adapters/auth`, sesiones y contraseñas, primera migración con tablas, `estado_pago` y `acceso_restringido` en `usuarios`)
Enmiendas: Enmienda 1 (2026-09-23) — decisiones del humano tras la revisión del Manager
Requisitos: RF-01, RF-02, RF-04c (solo "cerrar sesión"; la baja y la restricción que cierran sesiones llegan con `admin`), RF-05, RN-06 (base: el rol y la identidad que `requireMembership`/`requireOwnership` usarán; aquí solo esqueleto). RN-01/RN-02/RN-03 se respetan en el modelo y en `GET /me` sin implementar su gestión. Reglas: `AGENTS.md` 1, 2, 3, 4, 9, 10, 11, 13; `ARCHITECTURE-ESSENTIALS.md` "Autenticación", "Autorización", "Reglas de datos"; `ARCHITECTURE.md` §6, §7, §14 (`usuarios`, `sesiones`), §16, §17, §20 (D-02, D-15).
Antecedentes: `docs/trabajo/BACK-02-prisma-7/plan.md` (formato "Qué autoriza", V-xx), `docs/trabajo/FRONT-01-esqueleto-frontend/` (`apiClient`, `authService`, guardas de esqueleto), `docs/trabajo/AUTH-01-autenticacion-basica/revision.md` (Manager, modo plan) y `aprobacion.md` (texto literal del humano, P-01..P-05, M-01..M-11).

## Flujo (el completo de `AGENTS.md`)
arquitecto → `manager` (modo plan, hecho: APROBADO con M-01..M-11) → **aprobación explícita y por escrito del humano** (hecha, `aprobacion.md`, con Enmienda 1) → `programador` → `tester` (máx. 3 rondas) → `manager` (modo final) → **revisión humana del diff** antes del commit. Ningún agente hace `git add`, `commit`, `push`, deploy ni `migrate reset`.

### Qué autoriza la aprobación de este plan (y nada más)
- **Crear/modificar** solo lo listado en "Archivos". **Borrar** únicamente `backend/scripts/pendiente.mjs` (sustituido por `backend/src/scripts/*.ts`) y los temporales propios en `backend/tmp/` y el scratchpad.
- **Instalar** solo la tabla "Dependencias", con un único `npm install` desde la raíz (repetible si cambia un `package.json`). Prohibido `--legacy-peer-deps`, `--force`, `npm audit fix`, `npm update`, `npm dedupe`, `-g`, y cualquier paquete fuera de la tabla (en particular `@fastify/rate-limit`, `@fastify/helmet`, `@fastify/cors`, `fastify-type-provider-zod`, `@node-rs/argon2`, `bcrypt`, `jsonwebtoken`, `dotenv`, `testcontainers`).
- **Migración:** exactamente **una** creación con `npx prisma migrate dev --create-only --name usuarios_y_sesiones` (desde `backend/`), revisión y edición del SQL generado según DEC-01, y **una** aplicación con `npx prisma migrate dev`. Si la aplicación falla, se corrige el SQL de esa misma carpeta (aún no aplicada en ninguna otra base) y se repite `migrate dev`; nunca se crea una segunda carpeta para tapar la primera. Autorizados de solo lectura, tal cual se ejecutan: `npx prisma validate`, `npx prisma format --check`, `npx prisma generate`, `npx prisma migrate status`, `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`. **Prohibido:** `migrate reset`, `migrate resolve`, `db push`, `db pull`, `db execute`, `migrate deploy`, editar la migración `20260922015711_extensiones_iniciales`, cualquier `INSERT`/`UPDATE` por `psql` (solo `SELECT`; única excepción: el `DELETE` de las filas `@pruebas.local` que el propio programador creó en V-14).
- **Ejecutar:** scripts `npm run …` del repositorio; `npm view/ls/explain/audit` (lectura); `npx tsc`, `npx vitest`, `npx eslint`, `npx prettier --check`; Prettier `--write` **solo** acotado al paquete (`npx prettier --write src test prisma.config.ts` desde `backend/`, `npx prettier --write src` desde `shared/` y `frontend/`, y desde la raíz solo por ruta explícita: `eslint.config.mjs`, `README.md`); nunca `npm run format` ni `--write .` desde la raíz; `npm run seed:admin` y `npm run reset:admin` **solo en local y solo para V-12/V-13**, con `ADMIN_*` que el programador define en `backend/.env` (sin leer ni imprimir el archivo; si el humano ya tiene `ADMIN_*` allí, el programador **no las modifica** y usa las que existan, sin mostrarlas); procesos **propios** por PID (`taskkill //PID <pid> //T //F`); `curl.exe` contra `127.0.0.1` con tarro de cookies en `backend/tmp/`; `docker compose ps/up -d` y `psql … -c "SELECT …"` en `infra/`; git de solo lectura.
- **Si el puerto 3000 o 5173 está ocupado por un proceso ajeno: detenerse y preguntar.** Ningún agente termina procesos que no arrancó.
- **No autoriza:** tocar `infra/**`, `tsconfig.base.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `frontend/vite.config.ts`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.gitattributes`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`; leer o imprimir `backend/.env`, `infra/.env`; `localStorage`/`sessionStorage`; declarar a mano tipos que existan en `shared/`; SQL con concatenación; `console.log` de contraseñas, tokens, hashes o cookies.

## Enmienda 1 — 2026-09-23
**Motivo:** el Manager (modo plan) aprobó el plan con once hallazgos no bloqueantes (M-01..M-11) y el humano aprobó por escrito con decisiones sobre cada uno y sobre P-01..P-05 (`aprobacion.md`). Esta enmienda incorpora esas decisiones **dentro** de las secciones del plan para que exista una sola versión; donde una sección conserva un número (V-08, C-02) se marca "retirada" en lugar de renumerar, para que las referencias de `revision.md` y `aprobacion.md` sigan siendo válidas.

**Qué cambia (aplicado en las secciones indicadas):**
1. **M-01** — V-07 usa `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` (banderas válidas en Prisma 7.10.0); el comando entra en "Qué autoriza" (DEC-01, V-07).
2. **M-02** — `actualizadoEn DateTime @default(now()) @updatedAt` en `Usuario` y en `Sesion` ("Contenido exacto").
3. **M-03** — `DURACION_TOKEN_ACCESO_S = 15 * 60` como constante en `core/auth/sesiones.ts`, usada por `firmarTokenAcceso`; prueba unitaria del límite (`test/tokens-acceso.test.ts`) y de integración (token vencido → `401 NO_AUTENTICADO` en `me.integracion`) (DEC-03, "Pruebas requeridas").
4. **P-01 = sí** (registro inicia sesión; sin cambios respecto al valor por defecto).
5. **P-02 = recomendación del Manager** — `GET /me` **sin** `estadoPago`; `withProfile` **no lee** `estado_pago` (`withAccess` solo necesita `acceso_restringido`); `core/auth/me.ts` no lo conoce; `motivoRestriccion` se conserva; `meRespuestaSchema` sin `estadoPago`; `estadoPagoSchema` sale de `shared/` (llega con `pagos` junto con `GET /me/estado-pago`); C-02 retirada; la pantalla `/acceso-restringido` muestra texto de RN-03 y motivo, sin estado de pago hasta `pagos` (tabla de endpoints, DEC-09, "Autorización", `features/auth`).
6. **P-03 = sí** — límite de intentos propio; el humano acepta por escrito el almacén en memoria del proceso, de una sola instancia, que se reinicia con el proceso (DEC-06, R-04).
7. **P-04 = sí** — reutilización ⇒ revocar todas, siempre, sin gracia (DEC-04; la variante con gracia desaparece del plan).
8. **P-05 = recomendación del Manager** — solo `/acceso-restringido`; **se elimina** el marcador `/cambiar-contrasena` de rutas, vistas, textos, pruebas y tabla de archivos; en `apiClient`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO` queda solo como comentario de punto de extensión para AUTH-02 (DEC-12, DEC-13, "Archivos").
9. **M-04** — fuera los tres alcances de más: el marcador `/cambiar-contrasena` (punto 8), el cambio en `frontend/vite.config.ts` (la regla de `SIN_CONEXION` vive solo en `apiClient`; `vite.config.ts` pasa a "No se toca") y el `INSERT` por `psql` de V-08 (retirada; la cubre `admin-unico.integracion.test.ts`).
10. **M-05** — sin Testcontainers en AUTH-01; `admin-unico` corre dentro de una transacción interactiva de Prisma que **siempre** se revierte (mecanismo en "Pruebas requeridas"); se abre un `chore/` de Testcontainers justo después (nota final).
11. **M-06** — `rotarSesion` con orden fijo: primero `updateMany … WHERE id = ? AND revocada_en IS NULL` (revoca y marca `reemplazada_por` con un uuid pregenerado); **solo si afectó 1 fila** se inserta la sesión nueva con ese uuid, en la misma transacción; si afectó 0, no se inserta nada, se devuelve `null` y el handler aplica la decisión de `core` (reutilización: revocar todas, `401 SESION_INVALIDA`). Destino del ganador y del perdedor documentado (DEC-04).
12. **M-07** — todo `CREDENCIALES_INVALIDAS` cuenta para el límite, en las tres ramas (correo inexistente, usuario inactivo, contraseña incorrecta), con la misma llave IP + correo normalizado; prueba "sexto intento contra un correo inexistente → 429" (DEC-06, flujo de `login`, pruebas).
13. **M-08** — una sola llamada a `/refrescar` al restaurar la sesión: `restaurarSesion()` y `api()` comparten la misma promesa *single-flight*; `api()` solo intenta el refresco ante `401` **si había token**; `useMe` lanza `NO_AUTENTICADO` sin llamar a `/me` cuando la restauración falla y no hay token, y la navegación la hace `RequireSesion` con `<Navigate>` (sin `window.location`); `irA` queda solo para la pérdida de sesión en mitad del uso; `/acceso-restringido` cuelga bajo `RequireSesion` y fuera de `RequireRol`; `logout` (`204`) se valida con `sinContenidoSchema = z.undefined()` de `shared/` (DEC-12, DEC-13, DEC-15, router).
14. **M-09** — guarda `onRoute` (`middleware/guarda-de-rutas.ts`, registrada por `registrarMiddleware(app)` antes de los handlers) que hace fallar el arranque si una ruta bajo `/api` fuera de la lista pública no lleva `authenticate` como primer `preHandler`; con prueba (DEC-16, `middleware-orden.integracion`).
15. **M-11** — `config/env.ts` rechaza arrancar en `NODE_ENV=production` si `JWT_SECRET` es el literal de `.env.example` o mide menos de 32; con pruebas unitarias (DEC-17, `env.test.ts`).
16. **M-10 / C-07** — contradicción declarada y anotada para DOCS-02 (no se toca `docs/` aquí).
17. **Aceptado por escrito** (S-12 a S-14): sesión deslizante de 30 días, `iss`/`aud` en el JWT, límite de tasa en `/auth/*` a cargo del encargo de despliegue antes de abrir a alumnos, almacén de intentos en memoria (punto 6), `ip` y `agente` por sesión, `reset:admin` sin cambio obligatorio (S-10), argon2id igual en pruebas y `prod` (S-06).

**Qué no cambia:** dependencias (`argon2`, `jose`, `@fastify/cookie`), migración `usuarios_y_sesiones` y su índice parcial, `nombre_busqueda` en `core/`, argon2id 19 MiB/2/1, JWT HS256 con `iss`/`aud`, cookie `campus_refresco` con sus atributos, validación con `safeParse`, `protegido()` y el orden de la cadena, scripts en `src/scripts/`, `services/tokenAcceso.ts`, `services/navegacion.ts`, `navigator.locks`, `handlers/validacion.ts`, `redact` del logger, variables nuevas, aislamiento de pruebas por correos únicos e ids, pasos de implementación (con los ajustes de la lista) y las reglas de proceso de "Qué autoriza".

## Preguntas bloqueantes
Ninguna.

## Preguntas no bloqueantes — resueltas por el humano (Enmienda 1)
| # | Pregunta | Decisión |
|---|---|---|
| P-01 | ¿`POST /auth/registro` deja al alumno con sesión iniciada? | **Sí**: `201 { tokenAcceso }` + cookie, igual que `login` |
| P-02 | ¿`GET /me` incluye `estadoPago` propio? | **No.** `/me` no expone estado de pago; el propio saldrá por `GET /me/estado-pago` en `pagos`. `motivoRestriccion` sí se conserva (solo cuando `accesoRestringido`) |
| P-03 | Límite de intentos propio o `@fastify/rate-limit` | **Propio** (solo fallos, reinicio al acertar, llave IP + correo normalizado). Almacén en memoria de una sola instancia **aceptado por escrito** |
| P-04 | Reutilización de refresco: ¿gracia? | **Sin gracia**: siempre se revocan todas las sesiones |
| P-05 | Pantallas para los 403 | **Solo `/acceso-restringido`** mínima. Sin marcador `/cambiar-contrasena`; `apiClient` deja ese 403 como comentario |

## Contradicciones y desalineaciones entre documentos (reportadas; no bloquean)
- **C-01.** `ARCHITECTURE.md` §7 y §16 nombran `@fastify/rate-limit` como pieza del límite de peticiones; ESSENTIALS solo fija la regla (5 / 15 min por IP + correo). Este plan cumple la regla con código propio para `login` (P-03) y deja el plugin para el límite global y el de `/auth/*` (despliegue, aceptado por escrito).
- **C-02.** *Retirada por la Enmienda 1 (P-02 = no):* `withProfile` produce exactamente lo que §6 describe (sin `estadoPago`).
- **C-03.** RF-04c dice que restringir "cierra sus sesiones activas" y RN-03 que el alumno restringido "puede iniciar sesión". Compatibles: al restringir (encargo `admin`) se revocan las sesiones; el alumno vuelve a entrar y solo ve la pantalla de restringido. Aquí `withAccess` ya bloquea de inmediato aunque el JWT siga vigente (D-15).
- **C-04.** `Path=/api/auth` solo aparece en `ARCHITECTURE.md` §6; ESSENTIALS lo omite. Este plan lo aplica (DEC-07). Para docs: añadirlo en ESSENTIALS.
- **C-05.** `AGENTS.md` "Comandos" describe `seed:admin`/`reset:admin` sin las variables `ADMIN_*`. Texto propuesto al final.
- **C-06.** `ARCHITECTURE.md` §14 lista un índice GIN trigrama sobre `nombre_busqueda`. Llega con el buscador (RF-38), declarado en el esquema (`@@index([nombreBusqueda(ops: raw("gin_trgm_ops"))], type: Gin)`). La columna se crea y se llena desde hoy.
- **C-07 (M-10, aceptada por el humano para DOCS-02).** ESSENTIALS "Reglas de datos" y §14 dicen "`unaccent` + trigramas sobre `nombre_busqueda`"; este plan normaliza `nombre_busqueda` en `core/` al escribir (DEC-02) y el buscador futuro aplicará **la misma función** al término. El índice trigrama se construye sobre la columna ya normalizada; `unaccent` queda solo como apoyo (por ejemplo, para datos migrados). No se toca `docs/` en este encargo.

## Suposiciones
- **S-01.** Node `v24.11.1`, npm `11.6.2`, `main` limpio, infra levantado, `backend/.env` presente. Los datos de npm del orquestador (2026-09-22) y las comprobaciones del Manager (banderas de `migrate diff`, SQL de `@updatedAt`) son correctos; lo demás lleva **[verificar]** y el programador lo confirma contra el paquete instalado antes de escribir el archivo que dependa de ello.
- **S-02.** Política de contraseña: mínimo 10 y **máximo 128** caracteres. Cualquier carácter Unicode. Sin reglas de composición.
- **S-03.** Correo: `z.email()` de zod 4, longitud ≤ 254, normalizado con `trim` + minúsculas completas antes de comparar y guardar (§14: "`email` único (en minúsculas)"). Nombre: 2–120 caracteres tras `trim` y colapsar espacios.
- **S-04.** Valores de `estado_pago` en la base: `al_corriente` (por defecto, RN-01) y `deudor`. Ninguna respuesta de AUTH-01 los expone.
- **S-05.** El JWT lleva `sub` (uuid), `iat`, `exp` (= `iat` + `DURACION_TOKEN_ACCESO_S`, 15 min), `iss = "campus-digital"`, `aud = "campus-api"`. "Solo `sub`" de ESSENTIALS excluye rol y banderas, no metadatos estándar (aceptado por escrito). `clockTolerance: 0`.
- **S-06.** Parámetros argon2id **iguales en todos los entornos**: `memoryCost 19456` KiB, `timeCost 2`, `parallelism 1` (~50–150 ms por hash **[verificar tiempo en V-11]**). Aceptado por escrito; la duración de la suite se reporta.
- **S-07.** Hash del token de refresco: SHA-256 hex. Hash de contraseñas: argon2id.
- **S-08.** `request.ip` en `dev` y pruebas es la conexión directa. `trustProxy` es del encargo de despliegue.
- **S-09.** Vitest aísla cada archivo en su proceso: el almacén de intentos y el estado de `adapters/auth` no se comparten entre archivos.
- **S-10.** `reset:admin` fija la contraseña elegida por el humano en `ADMIN_PASSWORD`: **no** activa `debe_cambiar_contrasena`. Sí revoca las sesiones del admin.
- **S-11.** `sesiones.reemplazada_por` es un uuid sin FK; `sesiones.usuario_id` sí es FK con `ON DELETE CASCADE`.
- **S-12 (aceptado por escrito).** **Sesión deslizante de 30 días:** cada rotación crea una sesión nueva con `expira_en = ahora + 30 d`; quien refresca al menos una vez al mes no vuelve a iniciar sesión.
- **S-13 (aceptado por escrito).** El almacén de intentos vive en memoria del proceso, una sola instancia; se reinicia con el proceso. Cuando haya réplicas pasa a PostgreSQL.
- **S-14 (aceptado por escrito).** El límite de tasa de `/auth/*` (además del global) lo trae el encargo de despliegue **antes de abrir la plataforma a alumnos**; hasta entonces `registro` y `login` cuestan un argon2id por petición.
- **S-15.** Un JWT emitido sigue siendo válido hasta su `exp` (máx. 15 min) aunque su sesión se revoque (logout, reutilización, `reset:admin`): es la naturaleza del token de acceso sin estado que fija ESSENTIALS. `withProfile` sí corta de inmediato a inactivos y restringidos.

## Alcance
**Entra:** esquemas zod de auth en `shared/`; `core/auth/*` con pruebas; migración `usuarios_y_sesiones`; `adapters/auth`; `adapters/db/{usuarios,sesiones,errores}`; `middleware/` completo con `protegido()` y guarda `onRoute`; `handlers/auth` y `handlers/usuarios` (`GET /me`); `@fastify/cookie`; `JWT_SECRET` (con rechazo del valor de ejemplo en `production`) y `ADMIN_*` en `config/env.ts` y `.env.example`; `src/scripts/{seed-admin,reset-admin}.ts`; frontend: `features/auth` real (login, registro, bienvenida, acceso restringido), `apiClient` con refresco *single-flight*, 401/403 `ACCESO_RESTRINGIDO` y `SIN_CONEXION`, `authService` real, `services/tokenAcceso.ts`, `services/navegacion.ts`, guardas con `GET /me`, `ContenedorRol` con nombre, rol y "Cerrar sesión", `Rol` desde `shared/`; pruebas; README; propuestas para `AGENTS.md`/`CLAUDE.md`/docs.

**No entra (AUTH-02 u otros):** recuperación por correo, invitación de maestros, restablecimiento por admin, `POST /auth/cambiar-contrasena` y su pantalla, `tokens_cuenta`, Resend/`notifier`, `GET /me/estado-pago` y cualquier exposición del estado de pago, gestión de estado de pago y restricción (solo columnas), baja de usuarios, `requireMembership`/`requireOwnership` reales, `@fastify/rate-limit` (global y `/auth/*`), `@fastify/helmet`, CORS de `prod`, `trustProxy`, Testcontainers (`chore/` inmediato), índice GIN, panel de anuncios real, dashboards por rol, pg-boss, `infra/`, `frontend/vite.config.ts`.

## Diseño

### Decisiones
- **DEC-01. Migración `usuarios_y_sesiones` (Prisma 7, `--create-only` + SQL manual).** El esquema declara todo lo que Prisma expresa. El índice único parcial de un solo admin se añade a mano al final del SQL generado:
  ```sql
  -- Un solo administrador (ESSENTIALS "Tablas"). Prisma no expresa índices parciales; este
  -- índice vive solo en la migración. Prisma ignora los índices parciales al comparar el esquema
  -- con la base, así que no genera deriva (V-07 lo comprueba).
  CREATE UNIQUE INDEX "usuarios_un_solo_admin_idx" ON "usuarios" ("rol") WHERE "rol" = 'admin';
  ```
  Comprobación de deriva (M-01): tras aplicar, `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` debe imprimir "No difference detected" con código **0**; código **2** significa que Prisma sí ve el índice y querría borrarlo: **parada y reporte** (alternativas no autorizadas aquí). El momento en que esto mordería es el `migrate dev` del siguiente encargo con migración, así que la salida literal de V-07 va en el resumen del programador. Compatibilidad hacia atrás: solo `CREATE`; reversión del código sin tocar la base es segura. Reversión de la base (documentada, sin archivo): `DROP TABLE sesiones; DROP TABLE usuarios; DROP TYPE estado_pago; DROP TYPE rol_usuario;`. UUID con `gen_random_uuid()`; `actualizado_en` con `DEFAULT now()` (M-02) para que cualquier SQL de operación futuro no tropiece.
- **DEC-02. `nombre_busqueda` se calcula en `core/`** (`normalizarParaBusqueda`: NFD → quitar `\p{M}` → minúsculas → espacios colapsados → `trim`), no con `unaccent()`. La búsqueda futura aplicará la misma función al término (C-07). Prueba: "José Ángel  Núñez" → "jose angel nunez".
- **DEC-03. `adapters/auth`** (único importador de `argon2` y `jose`): `inicializarAuth({ jwtSecret, argon2 })` (idempotente; genera un **hash de relleno** con el que `login` verifica cuando el usuario no existe o está inactivo, para igualar tiempos), `hashContrasena`, `verificarContrasena`, `firmarTokenAcceso({ usuarioId, ahora })` (`exp = ahora + DURACION_TOKEN_ACCESO_S`, constante de `core/auth/sesiones.ts`; M-03), `verificarTokenAcceso(token, { ahora })` (`algorithms: ["HS256"]`, `issuer`, `audience`, `currentDate: ahora`, `sub` uuid; cualquier fallo → `AppError 401 NO_AUTENTICADO`), `generarTokenRefresco()` (32 bytes de `node:crypto`, base64url), `hashTokenRefresco(token)` (SHA-256 hex). Parámetros desde `config/auth.ts`; `adapters/` no lee `process.env`.
- **DEC-04. Política de refresco pura en `core/auth/sesiones.ts`:** `DURACION_TOKEN_ACCESO_S = 15 * 60`, `DURACION_SESION_MS = 30 * 24 * 3_600_000`, `calcularExpiracionSesion(ahora)`, `decidirRefresco({ sesion: { expiraEn, revocadaEn, reemplazadaPor }, ahora })` → `{ tipo: "rotar" }` si `reemplazadaPor === null && revocadaEn === null && expiraEn > ahora`; `{ tipo: "reutilizacion" }` si `reemplazadaPor !== null` (aunque además esté vencida); `{ tipo: "rechazar", motivo: "revocada" | "vencida" }` en el resto (revocada por logout sin reemplazo → rechazar: es el propio usuario). **Sin gracia** (P-04). **`rotarSesion` (M-06), en una transacción y en este orden:** (1) `nuevoId = randomUUID()`; (2) `updateMany({ where: { id: sesionId, revocadaEn: null }, data: { revocadaEn: ahora, reemplazadaPor: nuevoId } })`; (3) si `count === 0` → devolver `null` **sin insertar nada**; (4) si `count === 1` → `create({ id: nuevoId, usuarioId, hashToken, expiraEn, ip, agente })` y devolver `{ id: nuevoId }`. En el handler, `null` se trata como reutilización (otra petición ganó la carrera con el mismo token o el token ya estaba rotado): `revocarTodasLasSesiones(usuarioId)` + `401 SESION_INVALIDA`. **Destino del ganador:** recibe su token nuevo y su cookie; si después un perdedor revoca todo, la sesión nueva del ganador queda revocada y su siguiente refresco responde `401 SESION_INVALIDA` (motivo "revocada"); su JWT sigue valiendo hasta `exp` (S-15). Coherente con "nunca dos tokens vivos" y con P-04.
- **DEC-05. Validación de cuerpos con `safeParse` manual** (`handlers/validacion.ts`: `validarCuerpo(schema, body)` → dato tipado o `AppError("VALIDACION", "<campo>: <mensaje de zod>", 400)` con la primera incidencia, **sin** el valor recibido). Sin `fastify-type-provider-zod`.
- **DEC-06. Límite de intentos propio** (P-03, S-13). `core/auth/intentos.ts`: `POLITICA_INTENTOS = { maximo: 5, ventanaMs: 15 * 60_000 }`, `llaveDeIntento(ip, correoNormalizado)`, `estaBloqueado(fallos: number[], ahora, politica)`, `registrarFallo(fallos, ahora, politica)` (poda los fuera de ventana, devuelve arreglo nuevo), `podarLlaves(mapa, ahora, politica)`. El `Map<string, number[]>` vive en el ámbito del plugin `handlers/auth`. Cada verificación poda la llave; cada 500 escrituras se podan todas las llaves vacías. **Cuentan todos los `CREDENCIALES_INVALIDAS`, en las tres ramas: correo inexistente, usuario inactivo y contraseña incorrecta (M-07)**, siempre con la llave IP + correo normalizado; un acierto borra la llave. Respuesta `429 DEMASIADOS_INTENTOS` "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." con `Retry-After: 900`, comprobada **antes** de consultar la base; el 429 no revela si el correo existe.
- **DEC-07. Cookie de refresco** con `@fastify/cookie` (sin `secret`). Nombre `campus_refresco`; `httpOnly: true`, `sameSite: "strict"`, `path: "/api/auth"`, `secure: env.NODE_ENV === "production"`, `maxAge: 30 * 24 * 3600`. **Por qué `Path=/api/auth`:** el navegador solo la envía a `/api/auth/*`; ni `GET /me` ni ninguna ruta de negocio la reciben. **CSRF:** `SameSite=Strict` impide que otro sitio dispare `POST /api/auth/refrescar` con la cookie; aun así la respuesta no le llegaría por CORS de origen exacto, y `logout` solo revoca. `Secure` apagado fuera de `production` (`dev` va por `http://127.0.0.1`). Limpieza con los mismos atributos y `maxAge: 0`. Helper `opcionesCookieRefresco(env)` en `handlers/auth/cookie.ts`.
- **DEC-08. Middleware con orden fijo por construcción.** Cada paso es una `function` con nombre (`authenticate`, `withProfile`, `withPasswordGate`, `withAccess`, `requireRole`, `requireMembership`, `requireOwnership`). `protegido(opciones)` en `middleware/index.ts` devuelve `{ preHandler: [...] }` **siempre en ese orden**; ningún handler compone la cadena a mano. `opciones = { roles?: readonly Rol[]; permitirRestringido?: boolean; permitirCambioPendiente?: boolean; pertenencia?: "inscripcion" | "propiedad" }`. Las decisiones son funciones puras de `core/auth/autorizacion.ts` (`evaluarPasswordGate`, `evaluarAcceso`, `evaluarRol` → `AppError | null`); el middleware solo lee `request.perfil` y lanza. `requireMembership()`/`requireOwnership()` lanzan `AppError("NO_IMPLEMENTADO", "La verificación de inscripción/propiedad llega con el módulo de clases.", 501)`; ningún endpoint de AUTH-01 los usa. **Rutas públicas (excepción documentada, una sola lista en `middleware/rutas-publicas.ts`):** `GET /api/salud`, `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/refrescar`, `POST /api/auth/logout`. `refrescar`/`logout` se autentican con la cookie, credencial exclusiva de esas dos rutas.
- **DEC-09. `withProfile` lee de la base en cada petición** (`buscarPerfilPorId(id)` con `select` explícito: `id, nombre, email, rol, activo, accesoRestringido, motivoRestriccion, debeCambiarContrasena`; **ni `hashContrasena` ni `estadoPago`** (P-02)). Inexistente o `activo = false` → `401 NO_AUTENTICADO`. `request.perfil: PerfilAutenticado`. Tipado en `middleware/tipos.ts` con `declare module "fastify" { interface FastifyRequest { usuarioId: string | null; perfil: PerfilAutenticado | null } }` y `app.decorateRequest("usuarioId", null)`/`("perfil", null)`; los handlers usan `perfilDe(request)` (lanza `AppError 500 PERFIL_AUSENTE` si falta). Sin `any`.
- **DEC-10. Repositorios en `adapters/db`** (`usuarios.ts`, `sesiones.ts`, `errores.ts`), con `select` explícito y por columnas indexadas. Todas las funciones aceptan un último parámetro opcional `ejecutor: Ejecutor = obtenerDb()` (tipo `Ejecutor = PrismaClient | Prisma.TransactionClient` **[verificar nombre exportado por el cliente generado]**, definido en `adapters/db/cliente.ts`) para poder correr dentro de una transacción ajena (lo usan `rotarSesion`, `actualizarContrasenaYRevocarSesiones` y la prueba `admin-unico`). `errores.ts`: `traducirErrorPrisma(error, { alDuplicar })` reconoce `code === "P2002"` (**[verificar]** clase `PrismaClientKnownRequestError` exportada desde `@prisma/client/runtime/client` o `generated/internal/prismaNamespace.js`) y devuelve el `AppError` que indique `alDuplicar(target)`; cualquier otro error se relanza. `crearUsuario` mapea `target` con `email` → `409 CORREO_EN_USO` y cualquier otro (el índice parcial **[verificar nombre en `meta.target`]**) → `409 ADMIN_YA_EXISTE`. Nadie fuera de `adapters/db` ve códigos `P2xxx`.
- **DEC-11. Scripts en `backend/src/scripts/`** (`seed-admin.ts`, `reset-admin.ts`): `"seed:admin": "tsx --env-file-if-exists=.env src/scripts/seed-admin.ts"`, `"reset:admin": "tsx --env-file-if-exists=.env src/scripts/reset-admin.ts"`. Leen `cargarEnv()` + `cargarEnvAdmin()` (`ADMIN_EMAIL` correo válido, `ADMIN_PASSWORD` 10–128, `ADMIN_NOMBRE` 2–120; mensajes sin valores). `seed-admin`: `existeAdmin()` → si existe, `console.error("Ya existe una cuenta de administrador. Usa npm run reset:admin para cambiar su contraseña.")` y código 1; si no, `crearUsuario({ rol: "admin", … })` y `console.log("Administrador creado: <email>")`. `reset-admin`: sin admin → código 1; con admin → `actualizarContrasenaYRevocarSesiones` (transacción) y `console.log("Contraseña del administrador actualizada y sesiones cerradas: <email>")`. **Jamás** imprimen contraseña ni hash; `cerrarConexion()` en `finally`. `eslint.config.mjs`: el bloque `"no-console": "off"` pasa de `backend/scripts/**` a `backend/src/scripts/**`.
- **DEC-12. Frontend: refresco silencioso en `apiClient`, token en `services/tokenAcceso.ts`.** Para evitar el ciclo `apiClient ⇄ authService`, el token en memoria vive en `services/tokenAcceso.ts` (`obtenerToken`, `establecerToken`, `limpiarToken`, `haySesion`); `authService.ts` los reexporta y añade `login`, `registro`, `refrescar`, `logout`, `restaurarSesion`. `apiClient` (único `fetch`): (1) `refrescarSesion()` = `fetch(POST /api/auth/refrescar, credentials: "include")` **single-flight** (una promesa compartida mientras esté en vuelo) y, si `navigator.locks` existe, dentro de `navigator.locks.request("campus-refresco", …)` **[verificar tipos en `lib.dom`; en jsdom no existe y se usa solo la promesa]**; éxito → `establecerToken` y `true`; fallo → `limpiarToken()` y `false`. `restaurarSesion()` (en `authService`) llama a **esa misma** `refrescarSesion()` una sola vez por carga y memoiza el resultado (M-08: una única petición a `/refrescar` al restaurar). (2) `api()` ante `401` en una ruta que no sea `/api/auth/*` **y solo si había token** (vencido): si `refrescarSesion()` devuelve `true`, reintenta una vez con el token nuevo; si no, `limpiarToken()`, lanza `ApiError("NO_AUTENTICADO", "Tu sesión terminó. Vuelve a iniciar sesión.", 401)` e `irA("/login")` salvo que ya esté en `/login` o `/registro` (pérdida de sesión en mitad del uso). Sin token, un `401` se lanza tal cual, sin refresco ni navegación: la guarda decide. (3) `403 ACCESO_RESTRINGIDO` → `irA("/acceso-restringido")` si no está ya ahí (el error se lanza igual). `403 CAMBIO_DE_CONTRASENA_REQUERIDO` queda **solo como comentario** de punto de extensión (AUTH-02). (4) `SIN_CONEXION` también cuando la respuesta **no es JSON** y el estado es `500`, `502`, `503` o `504` (la API siempre responde JSON, incluso en 500; un 5xx sin JSON viene del proxy de Vite —hoy `500` vacío— o de Caddy con la API caída). Un 5xx **con** JSON del proyecto conserva su código. `services/navegacion.ts` expone `irA(ruta)` (`window.location.assign`), sustituible en pruebas.
- **DEC-13. Guardas con `GET /me`.** `consultaMe` en `features/auth/hooks.ts` (`queryKey: ["me"]`, `retry: false`, `staleTime: 60_000`, `queryFn`: `if (!haySesion()) { const restaurada = await restaurarSesion(); if (!restaurada) throw new ApiError("NO_AUTENTICADO", …, 401) } return api("/api/me", { schema: meRespuestaSchema })`) — así, sin cookie, hay **una** llamada a `/refrescar`, ninguna a `/me` y ninguna recarga. `RequireSesion`: `isError` → `<Navigate to="/login" replace />`; `isPending` → `<Cargando />`; datos → `<Outlet />`. `RequireRol({ rol })`: lee `useMe` (caché); `accesoRestringido` → `<Navigate to="/acceso-restringido" replace />`; rol distinto → `<Navigate to={rutaPorRol(data.rol)} replace />`; igual → `<ContenedorRol rol nombre={data.nombre} etiquetaRol onCerrarSesion cerrando />` con `<Outlet />` dentro. **Árbol de rutas:** `/` → `/login`; `LayoutPublico` { `/login`, `/registro`, `/diagnostico` }; `RequireSesion` { `/acceso-restringido` (**fuera** de `RequireRol`), `/estudiante`, `/maestro`, `/admin` (cada una `RequireRol` con índice `BienvenidaView`) }; `*` → `/login`. `app/` puede importar `features/auth/hooks`; `components/layout/` no importa nada de `features/`.
- **DEC-14. Login y registro.** `useLogin`: `login(credenciales)` → `establecerToken` → `queryClient.fetchQuery(consultaMe)` → `navigate(rutaTrasLogin(me))` (`accesoRestringido` → `/acceso-restringido`; si no, `rutaPorRol`). `useRegistro`: `registro(datos)` → mismo camino (P-01). Errores por `codigo` en `data.ts` (`MENSAJES_ERROR_AUTH`): `CREDENCIALES_INVALIDAS` → "Correo o contraseña incorrectos.", `DEMASIADOS_INTENTOS` → "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.", `CORREO_EN_USO` → "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.", `VALIDACION` → mensaje del servidor, `SIN_CONEXION` → "No pudimos conectar con el servidor. Revisa tu conexión.", otro → "No pudimos completar la operación. Inténtalo de nuevo." Error con `MensajeError`; botón deshabilitado mientras `isPending`; validación en cliente con los esquemas de `shared/`.
- **DEC-15. Logout** (`useCerrarSesion`): `logout()` (`POST /api/auth/logout` validado con `sinContenidoSchema`; un fallo de red no impide salir) → `limpiarToken()` → `queryClient.clear()` → `navigate("/login")`. En el backend, `204` idempotente + `clearCookie`.
- **DEC-16. Guarda estructural de rutas (M-09).** `middleware/guarda-de-rutas.ts` exporta `registrarGuardaDeRutas(app)`: `app.addHook("onRoute", (ruta) => …)` que, para cada ruta cuya `url` empiece por `/api`, comprueba: si `"<METODO> <url>"` está en `RUTAS_PUBLICAS` → pasa (`HEAD` se trata como su `GET` porque Fastify lo genera automáticamente **[verificar `exposeHeadRoutes`]**); si no, el primer elemento de `preHandler` (normalizado a arreglo) debe ser la función `authenticate` (comparación por identidad o por `name`); si no lo es, `throw new Error("La ruta <METODO> <url> no pasa por protegido() (AGENTS.md, regla 2)")`, lo que aborta el arranque. Se registra en `registrarMiddleware(app)` (que también hace `decorateRequest`) **antes** de `register` de cualquier handler, en `app.ts`. **[verificar]** que un `onRoute` del ámbito raíz observa las rutas de plugins hijos con prefijo y que el error se propaga al `app.register`/`app.ready()`; la prueba lo demuestra.
- **DEC-17. `JWT_SECRET` de ejemplo prohibido en `production` (M-11).** `config/env.ts` define `export const JWT_SECRET_DE_EJEMPLO = "dev_jwt_secret_de_desarrollo_no_valido_para_prod_0123456789"` (el mismo literal que `.env.example`) y `envSchema.superRefine`: si `NODE_ENV === "production"` y (`JWT_SECRET === JWT_SECRET_DE_EJEMPLO` o `JWT_SECRET.length < 32`) → incidencia `JWT_SECRET: en production debe ser un secreto propio de al menos 32 caracteres, distinto del de .env.example` (sin el valor). En `development`/`test` el valor de ejemplo se acepta (mínimo 32 sigue aplicando en todos los entornos).

### Flujo de las peticiones
1. **`POST /api/auth/registro`** `{ nombre, email, contrasena }` → `validarCuerpo(registroSchema)` → `core.prepararRegistro` (normaliza correo, nombre, `nombreBusqueda`) → `hashContrasena` → `crearUsuarioConSesion` (transacción: `usuarios` con `rol = estudiante`, `estado_pago = al_corriente`, `activo = true` + `sesiones` con hash del refresco, `expira_en`, `ip`, `agente` truncado a 256) → `firmarTokenAcceso` → `201 { tokenAcceso }` + `Set-Cookie`. Duplicado → `409 CORREO_EN_USO`. Campos extra (`rol`, `estadoPago`, `accesoRestringido`, `activo`, `debeCambiarContrasena`) se descartan: zod `object` los ignora y la firma del repositorio no los acepta.
2. **`POST /api/auth/login`** `{ email, contrasena }` → validar → normalizar correo → `llave = llaveDeIntento(ip, correo)` → `estaBloqueado` → `429` si aplica → `buscarCredencialesPorEmail(email)` (`select id, hashContrasena, activo`) → **rama A** (no existe) o **rama B** (inactivo): `verificarContrasena(hashDeRelleno, contrasena)`, `registrarFallo(llave)`, `401 CREDENCIALES_INVALIDAS`; **rama C** (existe y activo): `verificarContrasena(hash, contrasena)`; fallo → `registrarFallo(llave)` + `401` (mismo `codigo` y `mensaje` "Correo o contraseña incorrectos."); éxito → borrar llave, `crearSesion`, `firmarTokenAcceso` → `200 { tokenAcceso }` + cookie. Las tres ramas registran el fallo con la misma llave (M-07).
3. **`POST /api/auth/refrescar`** sin cuerpo → cookie ausente → `401 SESION_INVALIDA` + `clearCookie` → `hashTokenRefresco(cookie)` → `buscarSesionPorHash(hash)` (incluye `usuario.activo`) → no existe → `401`; `decidirRefresco` → `reutilizacion` → `revocarTodasLasSesiones(usuarioId)` + `401` + `clearCookie`; `rechazar` → `401` + `clearCookie`; `rotar` pero usuario inactivo → `revocarSesion` + `401`; `rotar` → `rotarSesion` (DEC-04); `null` → tratar como reutilización; `{ id }` → `200 { tokenAcceso }` + cookie nueva. Un solo `codigo` (`SESION_INVALIDA`) para todos los rechazos.
4. **`POST /api/auth/logout`** → cookie presente → `revocarSesionPorHash(hash)` → `204` + `clearCookie`; sin cookie → `204` + `clearCookie`.
5. **`GET /api/me`** → `protegido({ permitirRestringido: true })` → `construirRespuestaMe(perfil)` → `200 { id, nombre, email, rol, debeCambiarContrasena, accesoRestringido, motivoRestriccion? }` (`motivoRestriccion` solo cuando `accesoRestringido`, por spread condicional; nunca `estadoPago`). Con `debeCambiarContrasena` → `403 CAMBIO_DE_CONTRASENA_REQUERIDO`.
6. **Sin eventos ni cola:** nada de AUTH-01 genera aviso ni correo.

### Tabla por endpoint
| Ruta | Cadena | Entrada (`shared/`) | Salida (`shared/`) | Errores | Campos que nunca salen |
|---|---|---|---|---|---|
| `POST /api/auth/registro` | pública (lista de DEC-08) | `registroSchema` | `201 tokenAccesoRespuestaSchema` + cookie | `400 VALIDACION`, `409 CORREO_EN_USO` | `hashContrasena`, `hashToken`, ids de sesión, `estadoPago` |
| `POST /api/auth/login` | pública + límite de intentos (DEC-06) | `loginSchema` | `200 tokenAccesoRespuestaSchema` + cookie | `400 VALIDACION`, `401 CREDENCIALES_INVALIDAS` (mismo mensaje en inexistente/incorrecta/inactivo), `429 DEMASIADOS_INTENTOS` | ídem; ni `activo`, ni `rol` |
| `POST /api/auth/refrescar` | pública; credencial = cookie | — (cookie `campus_refresco`) | `200 tokenAccesoRespuestaSchema` + cookie nueva | `401 SESION_INVALIDA` (ausente, desconocida, vencida, revocada, reutilizada, carrera perdida, usuario inactivo) | ídem |
| `POST /api/auth/logout` | pública; credencial = cookie | — | `204` (`sinContenidoSchema`) + `clearCookie` | ninguno (idempotente) | — |
| `GET /api/me` | `authenticate → withProfile → withPasswordGate → withAccess(permitirRestringido) → requireRole()` (sin roles) → handler | `Authorization: Bearer` | `200 meRespuestaSchema` | `401 NO_AUTENTICADO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO` | `hashContrasena`, `activo`, **`estadoPago`**, `fechaEstadoPago`, `fechaRestriccion`; `motivoRestriccion` omitido si no está restringido |
| `GET /api/salud` | pública (sin cambios) | — | — | — | — |

Cualquier otra ruta bajo `/api` que se registre sin `authenticate` primero hace fallar el arranque (DEC-16). Códigos y mensajes en `shared/src/auth.ts` (`CODIGOS_AUTH`).

## Dependencias
| Paquete | Dónde | Rango (versión exacta a confirmar con `npm view`) | Para qué |
|---|---|---|---|
| `argon2` | backend, deps | `^0.45.1` | argon2id (nativo con binarios precompilados). Si `npm install` fallara al compilar en Windows: **detenerse y reportar**; camino de retorno a decidir por el humano: `@node-rs/argon2 ^2.2.1` |
| `jose` | backend, deps | `^6.2.12` | JWT HS256 (`SignJWT`, `jwtVerify` con `currentDate`) |
| `@fastify/cookie` | backend, deps | `^11.1.2` | Cookie de refresco. **[verificar]** par `fastify-plugin ^5` (una sola copia); si exigiera `^6`, reportar antes de instalar |

Sin cambios: `fastify ^5.12.5`, `fastify-plugin ^5.1.0`, Prisma 7.10.0, `zod ^4.6.5`, `vitest ^4.1.11`, frontend completo. Comprobación previa (V-02): `ultima argon2 0`, `ultima jose 6`, `ultima @fastify/cookie 11` (función de BACK-02); `npm view @fastify/cookie@<v> dependencies peerDependencies`; `npm view argon2@<v> engines optionalDependencies`; mayor dentro del mismo mayor → usar y reportar; cambio de mayor → detenerse.

## Archivos
| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `shared/src/auth.ts` | `rolSchema`, `Rol`, `correoSchema`, `contrasenaSchema` (10–128), `nombreSchema`, `registroSchema`, `loginSchema`, `tokenAccesoRespuestaSchema`, `meRespuestaSchema` (sin `estadoPago`), `sinContenidoSchema` (`z.undefined()`), `CODIGOS_AUTH`, tipos inferidos |
| Modificar | `shared/src/index.ts` | Reexportar `./auth.js` |
| Crear | `backend/src/core/auth/normalizacion.ts` (+ `.test.ts`) | `normalizarCorreo`, `normalizarNombre`, `normalizarParaBusqueda`, `prepararRegistro` |
| Crear | `backend/src/core/auth/sesiones.ts` (+ `.test.ts`) | `DURACION_TOKEN_ACCESO_S`, `DURACION_SESION_MS`, `calcularExpiracionSesion`, `decidirRefresco` |
| Crear | `backend/src/core/auth/autorizacion.ts` (+ `.test.ts`) | `PerfilAutenticado` (sin `estadoPago`), `evaluarPasswordGate`, `evaluarAcceso`, `evaluarRol` |
| Crear | `backend/src/core/auth/intentos.ts` (+ `.test.ts`) | `POLITICA_INTENTOS`, `llaveDeIntento`, `estaBloqueado`, `registrarFallo`, `podarLlaves` |
| Crear | `backend/src/core/auth/me.ts` (+ `.test.ts`) | `construirRespuestaMe(perfil): MeRespuesta` |
| Crear | `backend/src/config/auth.ts` | `opcionesDeAuth(env)`: `{ jwtSecret, argon2: { memoryCost: 19456, timeCost: 2, parallelism: 1 }, cookieSegura: env.NODE_ENV === "production" }` |
| Modificar | `backend/src/config/env.ts` (+ `env.test.ts`) | `JWT_SECRET` obligatoria `min(32)` + `superRefine` de DEC-17 y `JWT_SECRET_DE_EJEMPLO`; `adminEnvSchema`/`validarEnvAdmin`/`cargarEnvAdmin` aparte |
| Modificar | `backend/src/config/logger.ts` | `redact.paths` añade `req.body.contrasena`, `req.body.password`, `res.body` |
| Modificar | `backend/prisma/schema.prisma` | Enums y modelos (ver "Contenido exacto", con M-02) |
| Crear (CLI + edición) | `backend/prisma/migrations/<timestamp>_usuarios_y_sesiones/migration.sql` | SQL generado + índice parcial (DEC-01) |
| Crear | `backend/src/adapters/auth/{index,contrasenas,tokens,refresco}.ts` | DEC-03 |
| Crear | `backend/src/adapters/db/{usuarios,sesiones,errores}.ts` | DEC-10 |
| Modificar | `backend/src/adapters/db/cliente.ts`, `index.ts` | Tipo `Ejecutor`; reexportaciones nuevas (sin exponer `obtenerDb`) |
| Crear | `backend/src/middleware/{tipos,rutas-publicas,guarda-de-rutas,authenticate,with-profile,with-password-gate,with-access,require-role,require-membership,require-ownership,index}.ts` (+ `index.test.ts`) | DEC-08, DEC-09, DEC-16; `index.ts` exporta `protegido`, `perfilDe`, `registrarMiddleware(app)` |
| Modificar | `backend/src/middleware/README.md` | Uso de `protegido()`, lista de rutas públicas (única, la de `rutas-publicas.ts`), guarda `onRoute` |
| Crear | `backend/src/handlers/validacion.ts` | `validarCuerpo` (DEC-05) |
| Crear | `backend/src/handlers/auth/{index,cookie}.ts` | Plugin `authHandler` (4 rutas), `Map` de intentos, `opcionesCookieRefresco` |
| Crear | `backend/src/handlers/usuarios.ts` | `GET /me` |
| Modificar | `backend/src/app.ts` | `await inicializarAuth(opcionesDeAuth(env))`; `register(cookie)`; `registrarMiddleware(app)` **antes** de los handlers; `register(authHandler, { prefix: "/api/auth" })`, `register(usuariosHandler, { prefix: "/api" })` |
| Crear | `backend/src/scripts/seed-admin.ts`, `reset-admin.ts` | DEC-11 |
| Borrar | `backend/scripts/pendiente.mjs` | Sustituido |
| Modificar | `backend/package.json` | deps de la tabla; scripts `seed:admin`/`reset:admin` |
| Modificar | `backend/.env.example` | `JWT_SECRET=dev_jwt_secret_de_desarrollo_no_valido_para_prod_0123456789` (mismo literal que `JWT_SECRET_DE_EJEMPLO`; el comentario dice que `production` lo rechaza y cómo generar uno: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`), `ADMIN_EMAIL=admin@campus.local`, `ADMIN_PASSWORD=cambia-esta-contrasena-dev`, `ADMIN_NOMBRE=Administración CMEP` con comentario: solo los usan `seed:admin`/`reset:admin`; en `prod` se definen en el `.env` del servidor y se retiran tras usarlos |
| Crear | `backend/test/ayudas-auth.ts`, `backend/test/tokens-acceso.test.ts`, `backend/test/{auth-registro,auth-login,auth-refresco,me,middleware-orden,admin-unico}.integracion.test.ts` | Ver "Pruebas requeridas" |
| Modificar | `eslint.config.mjs` | `"no-console": "off"` para `backend/src/scripts/**` en lugar de `backend/scripts/**` |
| Modificar | `frontend/src/services/apiClient.ts` (+ `.test.ts`) | DEC-12 |
| Crear | `frontend/src/services/tokenAcceso.ts`, `frontend/src/services/navegacion.ts` | Token en memoria; `irA` |
| Modificar | `frontend/src/services/authService.ts` (+ `authService.test.ts` nuevo) | `login`, `registro`, `refrescar`, `logout`, `restaurarSesion`; reexporta el token |
| Modificar | `frontend/src/components/layout/types.ts` | `export type { Rol } from "@campus/shared"` |
| Modificar | `frontend/src/components/layout/contenedor-rol.tsx` | Props `nombre`, `etiquetaRol`, `onCerrarSesion`, `cerrando`; encabezado con nombre, rol como texto y `Button variant="outline"` "Cerrar sesión" (icono `LogOut`) |
| Modificar | `frontend/src/app/{require-sesion,require-rol,router}.tsx` (+ `router.test.tsx`) | DEC-13; rutas nuevas `/registro` y `/acceso-restringido` |
| Modificar | `frontend/src/features/auth/{types,data,lib,hooks}.ts` (+ `lib.test.ts`) | Tipos desde `shared/`; textos y mensajes; `rutaPorRol`, `rutaTrasLogin`, `mensajeDeErrorAuth`, `etiquetaDeRol`; hooks `consultaMe`, `useMe`, `useLogin`, `useRegistro`, `useCerrarSesion` |
| Modificar | `frontend/src/features/auth/components/formulario-login.tsx`, `login-view.tsx` (+ `login-view.test.tsx`) | Envío real, error con `MensajeError`, botón deshabilitado en `isPending`; quitar `avisoPendiente` |
| Crear | `frontend/src/features/auth/components/formulario-registro.tsx`, `registro-view.tsx` (+ `.test.tsx`), `bienvenida-view.tsx`, `acceso-restringido-view.tsx` | RF-02, placeholder post-login, P-05 |
| Modificar | `README.md` | "Backend en local": §3 (`JWT_SECRET`, `ADMIN_*`, rechazo del ejemplo en `production`), §4 (la migración crea `usuarios`/`sesiones`), nuevo §5 "Cuenta de administrador" (renumerar), §7 pruebas (conteos, precondición, y que `npm test` del backend inserta y borra filas `@pruebas.local` en `campus_dev`), §9 problemas (`JWT_SECRET: …`, `Ya existe una cuenta de administrador`, `argon2` sin binario). "Frontend en local" §3: `/login` y `/registro` contra la API; flujo con `seed:admin` |
| **No se toca** | `infra/**`, `tsconfig*.json`, `backend/vitest.config.ts`, `frontend/vite.config.ts`, `.prettier*`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, migración `20260922015711_extensiones_iniciales`, `handlers/salud.ts`, `handlers/errores.ts` | — |

### Contenido exacto de lo que fija decisiones

**`shared/src/auth.ts`** (resumen; el programador completa mensajes en español):
```ts
export const rolSchema = z.enum(["estudiante", "maestro", "admin"])
export const correoSchema = z.string().trim().max(254).pipe(z.email("Escribe un correo válido"))
export const contrasenaSchema = z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(128, "La contraseña no puede tener más de 128 caracteres")
export const nombreSchema = z.string().trim().min(2, "Escribe tu nombre completo").max(120)
export const registroSchema = z.object({ nombre: nombreSchema, email: correoSchema, contrasena: contrasenaSchema })
export const loginSchema = z.object({ email: correoSchema, contrasena: z.string().min(1).max(128) })
export const tokenAccesoRespuestaSchema = z.object({ tokenAcceso: z.string().min(1) })
export const meRespuestaSchema = z.object({
  id: z.uuid(), nombre: z.string(), email: z.string(), rol: rolSchema,
  debeCambiarContrasena: z.boolean(), accesoRestringido: z.boolean(),
  motivoRestriccion: z.string().optional(),
})
export const sinContenidoSchema = z.undefined()
export const CODIGOS_AUTH = { NO_AUTENTICADO, CREDENCIALES_INVALIDAS, DEMASIADOS_INTENTOS, CORREO_EN_USO, SESION_INVALIDA, VALIDACION, CAMBIO_DE_CONTRASENA_REQUERIDO, ACCESO_RESTRINGIDO, ROL_NO_PERMITIDO, NO_IMPLEMENTADO } as const
```
`loginSchema.contrasena` no aplica el mínimo de 10 (una contraseña corta debe fallar como credencial inválida, no como validación). Los correos se normalizan en `core/`, no en zod. `estadoPagoSchema` **no** se crea aquí (P-02): llega con `pagos`.

**`backend/prisma/schema.prisma`** (añadir a lo existente; M-02 aplicada):
```prisma
enum Rol {
  estudiante
  maestro
  admin

  @@map("rol_usuario")
}

enum EstadoPago {
  al_corriente
  deudor

  @@map("estado_pago")
}

model Usuario {
  id                    String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email                 String      @unique
  hashContrasena        String      @map("hash_contrasena")
  debeCambiarContrasena Boolean     @default(false) @map("debe_cambiar_contrasena")
  nombre                String
  nombreBusqueda        String      @map("nombre_busqueda")
  rol                   Rol
  activo                Boolean     @default(true)
  estadoPago            EstadoPago  @default(al_corriente) @map("estado_pago")
  fechaEstadoPago       DateTime?   @map("fecha_estado_pago") @db.Timestamptz(3)
  accesoRestringido     Boolean     @default(false) @map("acceso_restringido")
  motivoRestriccion     String?     @map("motivo_restriccion")
  fechaRestriccion      DateTime?   @map("fecha_restriccion") @db.Timestamptz(3)
  creadoEn              DateTime    @default(now()) @map("creado_en") @db.Timestamptz(3)
  actualizadoEn         DateTime    @default(now()) @updatedAt @map("actualizado_en") @db.Timestamptz(3)
  sesiones              Sesion[]

  @@index([rol])
  @@map("usuarios")
}

model Sesion {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuarioId      String    @map("usuario_id") @db.Uuid
  hashToken      String    @unique @map("hash_token")
  expiraEn       DateTime  @map("expira_en") @db.Timestamptz(3)
  revocadaEn     DateTime? @map("revocada_en") @db.Timestamptz(3)
  reemplazadaPor String?   @map("reemplazada_por") @db.Uuid
  ip             String?
  agente         String?
  creadoEn       DateTime  @default(now()) @map("creado_en") @db.Timestamptz(3)
  actualizadoEn  DateTime  @default(now()) @updatedAt @map("actualizado_en") @db.Timestamptz(3)
  usuario        Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId])
  @@map("sesiones")
}
```
`npx prisma format --check` decide la alineación. **[verificar]** que `generated/enums.js` exporta `Rol`/`EstadoPago` con esos valores (aserción `satisfies Rol` al mapear).

**`backend/src/core/auth/autorizacion.ts`** (firmas):
```ts
export interface PerfilAutenticado {
  id: string; nombre: string; email: string; rol: Rol; activo: boolean
  accesoRestringido: boolean; motivoRestriccion: string | null; debeCambiarContrasena: boolean
}
export const evaluarPasswordGate = (perfil, { permitirCambioPendiente = false }): AppError | null
  // debeCambiarContrasena && !permitirCambioPendiente → AppError("CAMBIO_DE_CONTRASENA_REQUERIDO", "Debes cambiar tu contraseña antes de continuar.", 403)
export const evaluarAcceso = (perfil, { permitirRestringido = false }): AppError | null
  // accesoRestringido && !permitirRestringido → AppError("ACCESO_RESTRINGIDO", "Tu acceso está restringido. Acude a administración.", 403)
export const evaluarRol = (perfil, roles: readonly Rol[]): AppError | null
  // roles.length > 0 && !roles.includes(perfil.rol) → AppError("ROL_NO_PERMITIDO", "No tienes permiso para esta acción.", 403)
```

**`backend/src/middleware/index.ts`** (firma):
```ts
export interface OpcionesProtegido { roles?: readonly Rol[]; permitirRestringido?: boolean; permitirCambioPendiente?: boolean; pertenencia?: "inscripcion" | "propiedad" }
export const protegido = (opciones: OpcionesProtegido = {}): { preHandler: preHandlerAsyncHookHandler[] }
// Orden fijo: authenticate, withProfile, withPasswordGate, withAccess, requireRole, [requireMembership | requireOwnership]
export const perfilDe = (request: FastifyRequest): PerfilAutenticado
export const registrarMiddleware = (app: FastifyInstance): void // decorateRequest + registrarGuardaDeRutas
```
**`backend/src/middleware/rutas-publicas.ts`:** `export const RUTAS_PUBLICAS: ReadonlySet<string> = new Set(["GET /api/salud", "POST /api/auth/registro", "POST /api/auth/login", "POST /api/auth/refrescar", "POST /api/auth/logout"])`.

**`backend/src/adapters/db/usuarios.ts`** (firmas; todas con `ejecutor?: Ejecutor` al final): `crearUsuarioConSesion({ usuario, sesion }) → { usuarioId, sesionId }`; `crearUsuario(usuario) → { id }`; `buscarCredencialesPorEmail(email) → { id, hashContrasena, activo } | null`; `buscarPerfilPorId(id) → PerfilAutenticado | null`; `existeAdmin() → boolean`; `buscarAdmin() → { id, email } | null`; `actualizarContrasenaYRevocarSesiones(id, hashContrasena)`. **`sesiones.ts`:** `crearSesion({ usuarioId, hashToken, expiraEn, ip, agente }) → { id }`; `buscarSesionPorHash(hashToken) → { id, usuarioId, expiraEn, revocadaEn, reemplazadaPor, usuario: { activo } } | null`; `rotarSesion({ sesionId, ahora, nueva }) → { id } | null` (DEC-04, orden fijo); `revocarSesion(id)`; `revocarSesionPorHash(hashToken)`; `revocarTodasLasSesiones(usuarioId) → number`. Ningún `select` incluye `hashContrasena` salvo `buscarCredencialesPorEmail`; ninguno incluye `estadoPago`.

## Cambios por capa
### shared/
`auth.ts` e `index.ts`. `npm run build` en `shared/` tras el cambio (los hooks `pre*` ya lo hacen).
### backend/core/
`core/auth/*` con las firmas anteriores y: `normalizarCorreo`, `normalizarNombre`, `normalizarParaBusqueda`, `prepararRegistro`; `DURACION_TOKEN_ACCESO_S`, `DURACION_SESION_MS`, `calcularExpiracionSesion`, `decidirRefresco`; `llaveDeIntento`, `estaBloqueado`, `registrarFallo`, `podarLlaves`; `construirRespuestaMe`. Todo puro, `ahora` por parámetro.
### backend/adapters/
`auth/` (DEC-03) y `db/` (DEC-10, `Ejecutor`).
### backend/handlers/
`auth/index.ts`, `auth/cookie.ts`, `usuarios.ts`, `validacion.ts`. Sin `try/catch` salvo `traducirErrorPrisma` en `adapters/db`. `app.ts`: cookie → `registrarMiddleware` → handlers.
### backend/workers/
Sin cambios.
### backend/prisma/
Esquema y migración `usuarios_y_sesiones` (DEC-01, M-02). Compatible hacia atrás.
### infra/ y .env.example
`infra/` no cambia. `backend/.env.example`: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`. `frontend/.env.example` sin cambios.
### frontend/features/auth/
`types.ts` reexporta `Rol`, `Registro`, `Login`, `MeRespuesta`, `TokenAccesoRespuesta` desde `@campus/shared` (más `Anuncio`). `data.ts`: `TEXTOS_LOGIN` (sin `avisoPendiente`), `TEXTOS_REGISTRO` (título "Crea tu cuenta de estudiante", campos "Nombre completo", "Correo", "Contraseña", ayuda "Mínimo 10 caracteres", botón "Crear cuenta", enlace "¿Ya tienes cuenta? Inicia sesión"), `TEXTOS_SESION` ("Cerrar sesión", etiquetas de rol "Estudiante"/"Maestro"/"Administrador", "Hola, {nombre}", "Tu dashboard estará disponible pronto."), `TEXTOS_RESTRINGIDO` ("Tu acceso está restringido. Acude a administración.", "Motivo:"; sin estado de pago hasta `pagos`), `MENSAJES_ERROR_AUTH`, `RUTA_POR_ROL`. `lib.ts`: `rutaPorRol`, `rutaTrasLogin`, `mensajeDeErrorAuth(error: unknown): string`, `etiquetaDeRol`. `hooks.ts`: `consultaMe`, `useMe`, `useLogin`, `useRegistro`, `useCerrarSesion`. Vistas: `login-view.tsx`, `registro-view.tsx` (misma rejilla con panel de anuncios; una acción principal, "Crear cuenta"), `bienvenida-view.tsx` (índice de `/estudiante`, `/maestro`, `/admin`), `acceso-restringido-view.tsx` (usa `useMe`: texto de RN-03, motivo si lo hay con icono `CircleAlert`, "Cerrar sesión"). Diseño: tokens, `Input`/`Button`/`Card` de `ui/`, `label htmlFor`, `aria-invalid` + `aria-describedby` en campos con error, 360 px, foco visible, sin emojis ni palabras prohibidas.

## Acceso a datos
| Consulta | Tabla(s) | Índice | Paginación | Transacción |
|---|---|---|---|---|
| `buscarCredencialesPorEmail` | `usuarios` | único `email` | única fila | no |
| `buscarPerfilPorId` (cada petición protegida) | `usuarios` | PK | única fila | no |
| `crearUsuarioConSesion` | `usuarios` + `sesiones` | PK / únicos | — | **sí** |
| `crearSesion` | `sesiones` | — (insert) | — | no |
| `buscarSesionPorHash` (+ `usuario.activo`) | `sesiones` ⋈ `usuarios` | único `hash_token` + PK | única fila | no |
| `rotarSesion` | `sesiones` | PK (`updateMany where id AND revocada_en IS NULL`) → insert condicional | — | **sí** (orden fijo, M-06) |
| `revocarSesionPorHash` | `sesiones` | único `hash_token` | — | no |
| `revocarTodasLasSesiones` | `sesiones` | `(usuario_id)` (`where usuario_id AND revocada_en IS NULL`) | — | dentro de la del llamador cuando aplica |
| `existeAdmin` / `buscarAdmin` | `usuarios` | `(rol)` | `findFirst` | no |
| `actualizarContrasenaYRevocarSesiones` | `usuarios` + `sesiones` | PK + `(usuario_id)` | — | **sí** |
Ningún ciclo con consultas; ningún SQL crudo; ninguna lista. El índice `(rol)` también sostiene el parcial de admin. Crecimiento de `sesiones` (una fila por refresco): purga en `LIMPIEZA_DIARIA` de un encargo posterior (anotado).

## Autorización
- `registro`, `login`, `refrescar`, `logout`: públicas por naturaleza (única lista en `rutas-publicas.ts`); la credencial de `refrescar`/`logout` es la cookie (`Path=/api/auth`).
- `GET /me`: cualquier rol autenticado y activo; permitido con `accesoRestringido` (única ruta de AUTH-01 que lo permite); **negado** con `debeCambiarContrasena` (403).
- Estado de pago: **ninguna respuesta de AUTH-01 lo contiene** (P-02); `withProfile` ni siquiera lo lee. `hashContrasena` y `hashToken` no salen de `adapters/db` salvo `buscarCredencialesPorEmail` → `handlers/auth` → `verificarContrasena`; el JWT no lleva rol ni banderas.
- Registro: `rol` siempre `estudiante`, `activo` `true`, `estadoPago` `al_corriente`, `accesoRestringido` `false`; nada de eso viene del cuerpo. No hay ruta que cree maestros ni admins (admin solo por `seed:admin`, con el índice parcial como garantía última).
- Un usuario `activo = false` con JWT vigente falla en `withProfile` (401) y en `refrescar` (401 + revocación).
- Guarda estructural: toda ruta bajo `/api` fuera de la lista pública debe empezar por `authenticate` o la API no arranca (DEC-16).

## Pruebas requeridas
Precondición de integración: infra levantado y `backend/.env` con `JWT_SECRET`. **Aislamiento en `campus_dev`** (base compartida con el desarrollo; Testcontainers en el `chore/` siguiente): correos `auth-<uuid>@pruebas.local`, ids creados registrados por `ayudas-auth.ts` (`crearUsuarioDePrueba({ rol?, activo?, accesoRestringido?, motivoRestriccion?, debeCambiarContrasena? })` usa `obtenerDb()` **solo en pruebas** para insertar y ajustar banderas; `iniciarSesionDePrueba`, `firmarTokenDePrueba({ usuarioId, ahora })`) y `afterAll` con `deleteMany({ where: { id: { in: ids } } })` (sesiones en cascada). Nunca se toca al admin real ni a usuarios ajenos; ninguna prueba deja filas salvo interrupción, y las que quedaran se distinguen por `@pruebas.local`.

**Mecanismo de `admin-unico` (M-05):** `await expect(obtenerDb().$transaction(async (tx) => { if (!(await existeAdmin(tx))) await crearUsuario(adminDePrueba, tx); await crearUsuario(segundoAdminDePrueba, tx); throw new RollbackDePrueba() })).rejects.toMatchObject({ codigo: "ADMIN_YA_EXISTE", estado: 409 })`. Si el segundo `crearUsuario` falla como debe, el `AppError` traducido por `adapters/db/errores.ts` sale de `$transaction` y Prisma revierte; si no fallara (defecto), `RollbackDePrueba` revierte igual y la aserción falla. Determinista haya o no admin real; sin residuos. **[verificar]** que el `AppError` atraviesa `$transaction` intacto (Prisma relanza el error del callback) y que el `timeout` por defecto (5 s) basta con argon2 fuera de la transacción (los hashes se calculan **antes** de abrirla).

| Archivo | Casos (esperado) |
|---|---|
| `core/auth/normalizacion.test.ts` | 8 |
| `core/auth/sesiones.test.ts` | 8: rotar; reemplazada → reutilización; reemplazada y vencida → reutilización; revocada sin reemplazo → rechazar/revocada; vencida → rechazar/vencida; `expiraEn === ahora` → vencida; `calcularExpiracionSesion` = +30 d; `DURACION_TOKEN_ACCESO_S === 900` |
| `core/auth/autorizacion.test.ts` | 9 |
| `core/auth/intentos.test.ts` | 6 |
| `core/auth/me.test.ts` | 3: nunca `estadoPago` ni `activo` ni `hash*` (`"estadoPago" in respuesta === false`); `motivoRestriccion` solo si restringido (spread condicional, `exactOptionalPropertyTypes`); campos exactos |
| `config/env.test.ts` | 7 existentes ajustadas + 6: falta `JWT_SECRET`; corta; **valor de ejemplo con `NODE_ENV=production` → rechazado sin el valor en el mensaje**; valor de ejemplo con `development` → aceptado; `validarEnvAdmin` ok; `ADMIN_PASSWORD` corta sin valor |
| `middleware/index.test.ts` | 4: orden por defecto (5 nombres); con `pertenencia` añade el sexto; `requireMembership()` lanza 501; `perfilDe` sin perfil lanza 500 |
| `test/tokens-acceso.test.ts` (unitaria, sin base; `inicializarAuth` con un secreto de prueba) | 4: token firmado en `T` vale en `T + 14 min`; **no vale en `T + 16 min`** (`NO_AUTENTICADO`); firma con otro secreto → 401; `alg: none` → 401 |
| `test/auth-registro.integracion.test.ts` | 8: 201 + token verificable + cookie con atributos exactos (`HttpOnly`, `SameSite=Strict`, `Path=/api/auth`, `Max-Age=2592000`, sin `Secure` en `development`); duplicado con mayúsculas/espacios → 409; contraseña de 9 → 400; correo inválido → 400; nombre de 1 → 400; campos extra ignorados → fila `estudiante`/`al_corriente`/`false`; `nombre_busqueda` normalizado; cuerpo sin `hash` ni id de sesión |
| `test/auth-login.integracion.test.ts` | 9: 200 + cookie; inexistente 401 con mismo `codigo`/`mensaje` que incorrecta; inactivo 401 igual; 5 fallos → sexto 429 **aunque la contraseña sea correcta** + `Retry-After`; **sexto intento contra un correo inexistente → 429** (M-07); otro correo desde la misma IP no bloqueado; acierto reinicia el contador; correo con mayúsculas/espacios entra; `Content-Type` no JSON → 400 |
| `test/auth-refresco.integracion.test.ts` | 10: rota (token y cookie nuevos, `reemplazada_por` = id de la nueva); el viejo tras rotar → 401 **y** el nuevo también deja de servir; sin cookie 401 + `clearCookie`; cookie basura 401; vencida 401; usuario inactivo 401 y sesión revocada; logout 204 + cookie limpia; logout sin cookie 204; tras logout, refrescar → 401 **sin** revocar otras sesiones; **dos refrescos concurrentes con el mismo token (`Promise.all`) → exactamente uno 200 o ambos 401, y al final ninguna sesión viva del usuario** (M-06) |
| `test/me.integracion.test.ts` | 10: estudiante 200 con campos exactos y **sin `estadoPago`**; maestro 200; sin token 401; token vencido (`firmarTokenDePrueba` con `ahora = T − 16 min`) 401; firma alterada 401; `alg: none` 401; `sub` inexistente 401; inactivo 401; restringido 200 con `motivoRestriccion`; `debeCambiarContrasena` 403; en ningún cuerpo aparece `hash`, `argon2`, `hashToken` ni `estadoPago` |
| `test/middleware-orden.integracion.test.ts` | 7 con rutas de prueba `GET /prueba/solo-admin` = `protegido({ roles: ["admin"] })` y `GET /prueba/pertenencia` = `protegido({ pertenencia: "inscripcion" })` (fuera de `/api`, así la guarda no aplica): estudiante → 403 `ROL_NO_PERMITIDO`; restringido → 403 `ACCESO_RESTRINGIDO`; restringido + `debeCambiar` → 403 `CAMBIO_DE_CONTRASENA_REQUERIDO`; sin token → 401; `pertenencia` → 501. **Guarda (M-09):** registrar `app.get("/api/prueba/sin-proteger", …)` sin `protegido()` en una app nueva → el arranque falla con el mensaje de DEC-16; registrar `app.get("/api/prueba/protegida", protegido(), …)` → arranca |
| `test/admin-unico.integracion.test.ts` | 2: transacción revertida (mecanismo anterior) → `ADMIN_YA_EXISTE`; `existeAdmin()` fuera de la transacción devuelve el estado previo (nada quedó insertado) |
| Frontend `services/apiClient.test.ts` | 3 existentes + 6: **401 sin token → lanza sin llamar a `/refrescar` ni a `irA`**; 401 con token → refresca → reintenta con el token nuevo (3 llamadas a `fetch`); dos `api()` concurrentes con 401 → **una** llamada a `/refrescar`; refresco falla → `NO_AUTENTICADO`, `limpiarToken`, `irA("/login")`; 502 sin JSON → `SIN_CONEXION`; 500 con JSON `ERROR_INTERNO` → `ERROR_INTERNO`; 403 `ACCESO_RESTRINGIDO` → `irA("/acceso-restringido")` |
| Frontend `services/authService.test.ts` | 2: `restaurarSesion` provoca **una sola** petición a `/refrescar` aunque se llame dos veces; `logout` limpia el token aunque la red falle |
| Frontend `features/auth/lib.test.ts` | 2 existentes + 3: `rutaPorRol` (3 roles), `rutaTrasLogin` restringido, `mensajeDeErrorAuth` por código y para error no `ApiError` |
| Frontend `features/auth/login-view.test.tsx` | 4: envío → `POST /api/auth/login` → `GET /api/me` (maestro) → `/maestro`; `CREDENCIALES_INVALIDAS` → `role="alert"` y sigue en `/login`; 429 → mensaje de espera; botón deshabilitado durante el envío |
| Frontend `features/auth/registro-view.test.tsx` | 3: contraseña corta no envía y muestra ayuda; éxito → `/estudiante`; `CORREO_EN_USO` → alerta |
| Frontend `app/router.test.tsx` | 2 existentes + 3: con `/me` estudiante, `/maestro` termina en `/estudiante`; con `accesoRestringido`, `/estudiante` termina en `/acceso-restringido`; **sin token y `/refrescar` 401, `/estudiante` termina en `/login` con exactamente una llamada a `/refrescar`, ninguna a `/me` y sin `irA`** |

Totales esperados: backend **24 existentes + ~48 unitarias nuevas (incl. `tokens-acceso`) + ~46 de integración nuevas ≈ 118**; frontend **13 existentes + ~19 nuevas ≈ 32**. El programador reporta los exactos. Criterios adicionales de `npm test`: termina solo; sin `FSTDEP*`; duración de la suite del backend reportada (S-06).

## Puntos de ataque para el Tester
- **Fuerza bruta:** sexto intento con contraseña correcta → 429; sexto intento contra correo **inexistente** → 429 (M-07); evadir con mayúsculas o espacios en el correo (misma llave); otra IP en `inject` (`remoteAddress`) → se permite (llave IP+correo; documentado).
- **Refresco:** reutilizar el token rotado (todas revocadas, incluida la nueva); cookie enviada a `GET /me` sin `Authorization` → 401; refrescar tras logout (401 sin revocar las demás); usuario desactivado; dos refrescos concurrentes con el mismo token → nunca dos tokens vivos (M-06); una sesión nueva insertada sin que nadie recibiera su token no debe existir (buscar sesiones vivas huérfanas tras la carrera).
- **JWT:** `alg: none`, otro secreto, `exp` pasado, `iss`/`aud` distintos, `sub` no uuid, token de un usuario luego desactivado o restringido (efecto inmediato), token válido hasta 15 min tras logout (S-15: esperado, documentado).
- **Registro:** `rol`, `estadoPago`, `accesoRestringido`, `activo`, `debeCambiarContrasena` en el cuerpo; correo duplicado con mayúsculas; `nombre` con HTML/SQL (se guarda tal cual); nombre de 121; contraseña de 129 y de 10 espacios (válida); cuerpo de 1 MB (413 `SOLICITUD_INVALIDA`); `Content-Type` incorrecto.
- **Fugas:** `hash`, `argon2`, `hashToken`, `estadoPago` (de nadie, ni propio) en cualquier respuesta; contraseñas/tokens en el log de la API (V-14); `Set-Cookie` sin `HttpOnly`/`SameSite`; `Secure` ausente con `NODE_ENV=production` (V-16).
- **Middleware:** ruta bajo `/api` registrada sin `protegido()` → la API no arranca (M-09); ruta fuera de `/api` con `perfilDe` sin `protegido` → 500 `PERFIL_AUSENTE`; `grep` de `authenticate`/`withProfile` fuera de `middleware/`; `requireMembership` → 501.
- **Config:** `NODE_ENV=production` con el `JWT_SECRET` de `.env.example` → la API no arranca (M-11).
- **Scripts:** `seed:admin` dos veces → código 1; `reset:admin` sin admin → código 1; ningún script imprime `ADMIN_PASSWORD`.
- **Frontend:** doble clic en "Iniciar sesión" (una petición); `/admin` como estudiante; recarga en `/estudiante` con cookie válida (restaura con **una** llamada a `/refrescar`); sin cookie → `/login` sin recarga completa; `localStorage` vacío; 360 px en login y registro; `RESPUESTA_INVALIDA` vs `SIN_CONEXION` con la API apagada.

## Riesgos y desacuerdos
- **R-01. `argon2` nativo en Windows.** Si `npm install` intenta compilar y falla, detenerse y reportar. Nunca `--force`.
- **R-02. Índice parcial y deriva de Prisma** (DEC-01). Si `migrate diff --exit-code` devuelve 2, parada y reporte; el `migrate dev` del siguiente encargo con migración es donde mordería.
- **R-03. Carrera entre pestañas en el refresco** (P-04, sin gracia). Mitigada con `navigator.locks` + single-flight + una sola llamada al restaurar (M-08); si el piloto muestra cierres de sesión con varias pestañas, se reabre con datos.
- **R-04. Almacén de intentos en memoria** (S-13, aceptado por escrito).
- **R-05. Tiempo de argon2 en pruebas** (S-06): si la suite supera 60 s, reportar antes de cambiar parámetros.
- **R-06. `SameSite=Strict` en `prod`:** mismo sitio (`campus.<dominio>` / `api.<dominio>`); CORS con credenciales y `trustProxy` en despliegue.
- **R-07. `Secure` apagado fuera de `production`:** V-16 comprueba el caso `production`.
- **R-08. Pruebas escribiendo en `campus_dev`:** ids rastreados y `afterAll`; `admin-unico` revertida; residuos solo por interrupción y distinguibles por `@pruebas.local`; `chore/` de Testcontainers inmediato.
- **R-09. `request.ip` tras el proxy** (S-08).
- **R-10. Reejecución de `migrate dev`:** Prisma ejecuta la migración en transacción **[verificar]**; corregir y repetir. Nunca `migrate resolve`.
- **R-11. `env.test.ts` cambia** (exige `JWT_SECRET`): pruebas del programador, no del Tester.
- **R-12. Un solo `codigo` 401** para sin token / inválido / inexistente / inactivo: deliberado.
- **R-13. `irA` con recarga completa** solo al perder la sesión en mitad del uso; la entrada sin sesión es una navegación suave (M-08).
- **R-14. Guarda `onRoute` y rutas automáticas** (`HEAD`, `OPTIONS` futuras de CORS): la guarda trata `HEAD` como su `GET`; si el encargo de CORS registra `OPTIONS`, amplía la lista pública en `rutas-publicas.ts`.
- **R-15. Crecimiento de `sesiones`:** una fila por refresco; purga (`expira_en` pasado; las reemplazadas se conservan hasta su `expira_en` original) en `LIMPIEZA_DIARIA`, con índice sobre `expira_en` en su momento.
- **Desacuerdos con ESSENTIALS:** ninguno. P-04 sigue la regla literal; `iss`/`aud`, sesión deslizante y límite de intentos propio quedan aceptados por escrito.

## Verificaciones (el programador las ejecuta y reporta con salida real)
| # | Verificación | Resultado esperado |
|---|---|---|
| V-01 | `node --version`; `npm --version`; `git status --short`; `docker compose ps` en `infra/`; `Get-NetTCPConnection -LocalPort 3000,5173 -State Listen` | `v24.x`, `11.x`; árbol limpio; `postgres` healthy; puertos libres (si no: detenerse y preguntar) |
| V-02 | Comprobación de versiones (sección "Dependencias") | Versiones de la tabla o mayores dentro del mismo mayor; `@fastify/cookie` con `fastify-plugin ^5`; `argon2` con binarios `win32-x64` |
| V-03 | Editar `backend/package.json`; `npm install` desde la raíz; `npm ls argon2 jose @fastify/cookie fastify-plugin`; `node -e "require('argon2')"` desde `backend/` | Código 0; **una** versión de `fastify-plugin`; `argon2` carga sin compilar |
| V-04 | `shared/`: crear `auth.ts`, editar `index.ts`; `npm run build`; `npm run lint` | `dist/auth.js` y `.d.ts`; lint en verde |
| V-05 | `core/auth/*` + pruebas; `npx vitest run src/core` desde `backend/` | Verde (conteos de la tabla) |
| V-06 | Editar `schema.prisma`; `npx prisma validate`; `npx prisma format --check`; `npx prisma migrate dev --create-only --name usuarios_y_sesiones`; `cat` del SQL | Válido; carpeta `<timestamp>_usuarios_y_sesiones` con `CREATE TYPE`, `CREATE TABLE` (ambas con `"actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`), índices y FK; **sin** el índice parcial todavía |
| V-07 | Añadir el bloque de DEC-01 al final del SQL; `npx prisma migrate dev`; `npx prisma migrate status`; `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code; echo "codigo=$?"`; `psql … -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('usuarios','sesiones') ORDER BY 1;"` | Aplicada; "Database schema is up to date!"; **"No difference detected" y `codigo=0`** (salida literal al resumen; `2` ⇒ parada); `usuarios_un_solo_admin_idx … WHERE (rol = 'admin')`, `usuarios_email_key`, `usuarios_rol_idx`, `sesiones_hash_token_key`, `sesiones_usuario_id_idx` |
| V-08 | **Retirada (Enmienda 1, M-04/M-05).** El índice parcial se demuestra con `admin-unico.integracion.test.ts` en V-11 | — |
| V-09 | `npx prisma generate`; `grep -n "Rol\|EstadoPago" src/adapters/db/generated/enums.ts | head`; nombre del tipo de cliente transaccional exportado | Enums con los valores esperados; nombre de `Ejecutor` confirmado |
| V-10 | `adapters/auth`, `adapters/db`, `middleware/`, `handlers/`, `app.ts`, `config/*`, scripts; `npm run typecheck` en `backend/` | Código 0 sin `any` |
| V-11 | Pruebas de integración y `tokens-acceso`; `npm test` desde `backend/` con salida a `tmp/test.log`; `grep -c "FSTDEP" tmp/test.log`; duración total; después `psql -c "SELECT count(*) FROM usuarios WHERE email LIKE '%@pruebas.local';"` | Todo en verde; `0`; duración reportada; **`0` filas residuales** |
| V-12 | `npm run seed:admin` desde `backend/`; repetir | Primera: "Administrador creado: …" código 0; segunda: "Ya existe una cuenta de administrador…" código 1; sin contraseña en la salida |
| V-13 | `npm run reset:admin`; `psql -c "SELECT count(*) FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id WHERE u.rol='admin' AND s.revocada_en IS NULL;"` | Código 0 con mensaje; `0` |
| V-14 | API desde `dist/` (`npm run build`; `node --env-file-if-exists=.env dist/server.js > tmp/api.log 2>&1 &`); registro con `curl.exe -c tmp/cookies.txt`; copia del tarro; refresco con `-b/-c`; **reutilización** con el tarro copiado; `/me` con `Authorization`; 6× login con contraseña mala; 6× login con correo inexistente; logout; `grep -ci "contrasena\|clave-de-prueba\|campus_refresco=" tmp/api.log`; `psql DELETE FROM usuarios WHERE email = 'v14-<uuid>@pruebas.local'` (fila propia; única escritura manual autorizada); detener por PID | `201` con `Set-Cookie: campus_refresco=…; Max-Age=2592000; Path=/api/auth; HttpOnly; SameSite=Strict` (sin `Secure`); refresco `200`; reutilización → `401 SESION_INVALIDA` y el token nuevo también `401`; `/me` `200` sin `estadoPago`; sexto login `429` + `Retry-After: 900` en **ambas** series; logout `204` con `Max-Age=0`; **`0`** coincidencias en el log |
| V-15 | `curl.exe -s -i http://127.0.0.1:3000/api/me` sin token; con cookie y sin `Authorization` | `401 NO_AUTENTICADO` en ambos |
| V-16 | `inject` con `construirApp({ env: { ...env, NODE_ENV: "production", JWT_SECRET: "<48 bytes aleatorios de prueba>" } })` y registro | `Set-Cookie` incluye `Secure`. Además: `NODE_ENV=production` con el `JWT_SECRET` de ejemplo → `validarEnv` falla con el mensaje de DEC-17 (prueba unitaria) |
| V-17 | `grep -rn "argon2\|from \"jose\"" backend/src --include=*.ts | grep -v "adapters/auth"`; `grep -rn "obtenerDb\|generated/" backend/src --include=*.ts | grep -v "adapters/db"`; `grep -rn "perfil.rol\|request.perfil" backend/src/handlers`; `grep -rn "estadoPago" backend/src/handlers backend/src/middleware backend/src/core/auth` | Solo comentarios/README; ninguna verificación de rol en handlers; **cero** `estadoPago` fuera de `adapters/db` y del esquema |
| V-18 | `npm run lint` desde la raíz (Prettier acotado antes) | Verde en los tres workspaces |
| V-19 | Frontend: `npm test`, `npm run build` desde `frontend/`; `grep -rn "localStorage\|sessionStorage" frontend/src | grep -v "authService.ts:\|tokenAcceso.ts:"`; `grep -rn "fetch(" frontend/src --include=*.ts --include=*.tsx | grep -v "\.test\."`; `grep -rn "cambiar-contrasena" frontend/src | grep -v "apiClient.ts:"` | Verde; cero coincidencias (salvo comentarios conocidos); `fetch(` solo en `apiClient.ts`; `cambiar-contrasena` solo en el comentario de `apiClient` |
| V-20 | Humo completo: API + Vite por PID propio; `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:5173/api/salud`; con la API **apagada**, el mismo comando y `curl.exe -s -i http://127.0.0.1:5173/api/salud | head -3` | `200`; con la API apagada un 5xx **sin JSON** (Vite responde hoy `500` vacío; se reporta el estado real): es el camino que la prueba "502 sin JSON → `SIN_CONEXION`" cubre |
| V-21 | `git status --short --untracked-files=all`; `git diff --quiet -- infra tsconfig.base.json backend/tsconfig.json backend/vitest.config.ts frontend/vite.config.ts .prettierrc.json .prettierignore .gitignore .gitattributes AGENTS.md CLAUDE.md .claude docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md backend/prisma/migrations/20260922015711_extensiones_iniciales; echo $?`; `git ls-files --eol` sobre lo nuevo | Solo los archivos de la tabla; `0`; todo `w/lf` |
| V-22 | Comandos del README modificados ejecutados en `powershell.exe -NoProfile` tal cual | Cada uno con su salida |

Al terminar: procesos propios detenidos, infra intacta, `backend/.env` no versionado ni impreso, `backend/tmp/cookies.txt` y su copia borrados, usuario de V-14 borrado, sin commit. La comprobación visual (360 px, foco) queda para el humano o el Manager si no hay navegador.

## Pasos de implementación
1. V-01, V-02. Sin salidas de `npm view` no se edita nada.
2. `shared/src/auth.ts` + `index.ts`; V-04.
3. `backend/package.json` (deps y scripts); V-03.
4. `core/auth/{normalizacion,sesiones,autorizacion,intentos,me}.ts` con sus pruebas; V-05.
5. `config/env.ts` (+ pruebas, incl. DEC-17), `config/auth.ts`, `config/logger.ts`.
6. `schema.prisma` (con M-02); V-06 (`--create-only`); editar el SQL (DEC-01); V-07; V-09.
7. `adapters/db/{cliente (Ejecutor),errores,usuarios,sesiones}.ts`, `index.ts`.
8. `adapters/auth/*`; `test/tokens-acceso.test.ts`.
9. `middleware/*` (incl. `rutas-publicas.ts`, `guarda-de-rutas.ts`) + `middleware/index.test.ts` + README de la carpeta.
10. `handlers/validacion.ts`, `handlers/auth/{cookie,index}.ts`, `handlers/usuarios.ts`; `app.ts` (cookie → `registrarMiddleware` → handlers). V-10.
11. `test/ayudas-auth.ts` y las 6 pruebas de integración (incl. guarda `onRoute` y `admin-unico` revertida); V-11.
12. `src/scripts/{seed-admin,reset-admin}.ts`; borrar `scripts/pendiente.mjs`; `eslint.config.mjs`; V-12, V-13.
13. V-14, V-15, V-16, V-17.
14. `backend/.env.example`; V-18.
15. Frontend: `services/{tokenAcceso,navegacion}.ts`, `apiClient.ts` (+ pruebas), `authService.ts` (+ pruebas).
16. `components/layout/{types,contenedor-rol}.tsx`.
17. `features/auth/{types,data,lib,hooks}.ts` (+ `lib.test.ts`).
18. Vistas y componentes de `features/auth` (login, registro, bienvenida, acceso restringido); `app/{require-sesion,require-rol,router}.tsx`.
19. Pruebas de frontend; V-19; V-20.
20. `README.md`; V-22.
21. V-21. Entregar `docs/trabajo/AUTH-01-autenticacion-basica/resumen-programador.md` con: salidas de V-02; tabla de versiones; cada **[verificar]** con lo encontrado (`PrismaClientKnownRequestError`, `meta.target` del índice parcial, nombre de `Ejecutor`, `AppError` a través de `$transaction`, `onRoute` en plugins hijos y `HEAD`, `navigator.locks`, tiempo de argon2, transacción de la migración); salida literal de V-07; resultado de V-01 a V-22; conteos exactos; desviaciones; lo no verificado; **y la lista de archivos por paso** (el humano revisará el diff por capas).

## Propuestas para `AGENTS.md`, `CLAUDE.md` y docs (las aplica el orquestador; no el programador)
- **`AGENTS.md` "Comandos"**, sustituir las dos líneas: `npm run seed:admin       # crea la cuenta única de administrador con ADMIN_EMAIL, ADMIN_PASSWORD (≥ 10) y ADMIN_NOMBRE de backend/.env; falla si ya existe` y `npm run reset:admin      # (backend) cambia la contraseña del administrador a ADMIN_PASSWORD y cierra sus sesiones; no activa el cambio obligatorio; nunca imprime la contraseña`.
- **`CLAUDE.md` "Ubicaciones compartidas":** `services/tokenAcceso.ts` (token en memoria; `authService` lo reexporta), `services/navegacion.ts` (`irA`, único punto de redirección fuera del router); `components/layout/types.ts` reexporta `Rol` desde `shared/` (quitar "provisional"). Tabla de módulos, fila `auth`: "bienvenida post-login (placeholder de dashboard)".
- **DOCS-02** (no se toca `docs/` aquí): `ARCHITECTURE-ESSENTIALS.md` "Autenticación": `Path=/api/auth` (C-04) y nota de que "solo `sub`" excluye rol y banderas, no `iss`/`aud`; "Reglas de datos": **trigramas sobre `nombre_busqueda` normalizado en `core/` al escribir, con la misma función aplicada al término; `unaccent` solo como apoyo** (C-07); `ARCHITECTURE.md` §6: sesión deslizante de 30 días; §7: `POST /auth/registro` responde con sesión (P-01); §14: `sesiones.reemplazada_por` sin FK (S-11), `actualizado_en` con `DEFAULT now()`, purga futura de `sesiones`, índice trigrama sobre columna normalizada (C-07); §16: límite de `login` propio y `@fastify/rate-limit` para el global y `/auth/*` (C-01).
- **Pendientes para encargos siguientes:** **`chore/` Testcontainers inmediatamente después de AUTH-01 (M-05)**; AUTH-02 (recuperación, invitación, restablecimiento, `POST /auth/cambiar-contrasena` y su pantalla, `tokens_cuenta`, correo); `admin` (baja y restricción revocan sesiones: `revocarTodasLasSesiones` ya existe); `pagos` (`GET /me/estado-pago`, `EstadoPagoBadge`, `estadoPagoSchema` en `shared/`); despliegue (`trustProxy`, CORS con credenciales, `@fastify/helmet`, **límite de tasa global y en `/auth/*` antes de abrir a alumnos**, `Secure` real, `seed:admin` desde `dist/`); buscador (índice GIN en el esquema sobre `nombre_busqueda` normalizado, C-06/C-07); `LIMPIEZA_DIARIA` (purga de `sesiones`, R-15).
