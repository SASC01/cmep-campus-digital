# Aprobación del humano — AUTH-02

Fecha: 2026-09-24
Aprobó: Carlos Salazar
Carril: sensible
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Texto de la aprobación
> Estoy en la red de mi casa, que es de confianza; la regla del firewall sigue aplicada.
>
> Apruebo por escrito el plan AUTH-02 por el carril sensible, con estas decisiones que el arquitecto registra como Enmienda 1:
>
> - P-01: se parte. AUTH-02a = pasos 1-15 (backend completo, README y FE-01). AUTH-02b = pasos 16-22 (frontend). Mismo plan; tester y manager final en cada parte. 02a no se despliega sola.
> - M-01: opción (a), enmienda con la redacción del manager para PA-06, sin la contingencia de JSON.stringify y citando fromPrisma. Después el manager solo verifica que la enmienda cubra estas decisiones, sin revisión completa.
> - N-01: la búsqueda de executeSql en V-13 y también la regla de ESLint no-restricted-syntax fuera de adapters/. Se permite exactamente un $queryRawUnsafe, dentro de ejecutorSqlDe.
> - N-02: retención corta (~1 día) en las dos colas, y §18 debe decir que el límite de tasa de DEPLOY cubre /auth/recuperar.
> - N-03: opción (a), declarada: depends_on con healthcheck y notas en §18 y en el README.
> - N-04: el arquitecto fija una de las dos. Condición: nunca atrapar P2002 dentro de la transacción. Si no necesita saber si insertó, prefiero createMany con skipDuplicates.
> - N-05: rechazar el remitente de ejemplo en production en este encargo, con prueba. Lo de archivos de entorno separados para API y worker, a §18.
> - N-06: los tres puntos con la propuesta del manager.
> - P-02: token derivado. P-03: los dos límites más la retención corta. P-04: con búsqueda, y respaldo POST /admin/maestros y PUT /admin/usuarios/{id}/correo. P-05: solo el cambio obligatorio.
> - C-01: apruebo la solución del plan (cambiar-contrasena con permitirRestringido) y el texto nuevo para ESSENTIALS.
> - FE-01: autorizo por escrito entregar con esa única prueba en rojo, solo en AUTH-02a y solo hasta la ronda 1 del tester, que la actualiza sin cambiar lo que protege y publica el hash nuevo. Después, suite completa en verde.
> - C-02 a C-06: autorizo que apliques los textos de documentos.
> - La contraseña temporal sin caducidad queda anotada como pendiente del encargo ADMIN, en ESTADO.md.
>
> Autorizo también lo que el plan lista: instalar pg-boss 12.34.0 y resend 6.29.0, la migración tokens_cuenta, tocar rutas-publicas.ts, el esquema pgboss en campus_dev y la prueba de humo v17 en campus_dev.
>
> Empieza por AUTH-02a en la rama feat/auth-02a-cuentas-backend: enmienda, verificación del manager, programador, tester (máximo 3 rondas), manager final. Al terminar, actualiza ESTADO.md y detente para que yo revise el diff. Sin commit.

## Partición (P-01)
| Parte | Pasos del plan | Contenido | Rama |
|---|---|---|---|
| **AUTH-02a** | 1 a 15, más las secciones de backend del README (paso 22) y FE-01 | Migración, cola, notifier, worker, 8 endpoints, pruebas, `backend/.env.example` | `feat/auth-02a-cuentas-backend` |
| **AUTH-02b** | 16 a 22 | Pantallas de cuenta, `apiClient`, guardas, pantalla provisional de admin, sección de frontend del README | Por crear |

Mismo plan aprobado, sin otra ronda del arquitecto salvo la Enmienda 1. Cada parte con su tester (máximo 3 rondas) y su manager final. **AUTH-02a no se despliega sola:** una cuenta con cambio obligatorio no tendría pantalla hasta AUTH-02b.

## Respuestas a las preguntas no bloqueantes
| # | Respuesta |
|---|---|
| P-01 | **Se parte** (tabla de arriba) |
| P-02 | **Token derivado:** HMAC-SHA256 con clave HKDF de `JWT_SECRET`; la cola solo lleva el id; la base guarda solo el SHA-256 |
| P-03 | **Los dos límites** (API: 3 por hora por IP + correo, en memoria; worker: tope durable de 3 por hora por cuenta) **más la retención corta** de N-02 |
| P-04 | **Con búsqueda** (`POST /admin/usuarios/buscar`); el humano respalda también `POST /admin/maestros` y `PUT /admin/usuarios/{id}/correo` |
| P-05 | **Solo el cambio obligatorio** (`409 CAMBIO_NO_REQUERIDO` sin la bandera) |

## Hallazgos del manager (modo plan) y decisión del humano
| # | Decisión |
|---|---|
| M-01 | **Opción (a):** enmienda con la redacción del manager para DEC-07, PA-06, PA-07, R-01 y V-05; sin la contingencia de `JSON.stringify`; citando `fromPrisma` de pg-boss y la defensa del protocolo extendido. Después, el manager **solo verifica** que la enmienda cubra estas decisiones, sin revisión completa |
| N-01 | Búsqueda de `executeSql` en V-13 **y** regla de ESLint `no-restricted-syntax` fuera de `adapters/`. Se permite exactamente **un** `$queryRawUnsafe` en `backend/src`, dentro de `ejecutorSqlDe` |
| N-02 | Retención corta (≈ 1 día) en `CORREO_DE_CUENTA` y en su cola de fallidos; §18 dice que el límite de tasa de DEPLOY cubre `/auth/recuperar` |
| N-03 | **Opción (a), declarada:** la API no arranca sin base; `depends_on` con `healthcheck` (para DEPLOY) y notas en §18 y en el README |
| N-04 | El arquitecto fija una de las dos. **Condición: nunca atrapar `P2002` dentro de la transacción.** Si no necesita saber si insertó, preferencia por `createMany({ skipDuplicates: true })` |
| N-05 | Rechazar en `production` el remitente de ejemplo **en este encargo**, con prueba. Archivos de entorno separados para la API y el worker: a §18 |
| N-06 | Los tres puntos con la propuesta del manager (ayuda de prueba sobre `pgboss.job`; `iniciarCola` después de crear `app` y antes de los handlers; `validarUrlDePruebas` en `test/preparar-cola.ts`) |
| C-01 | **Aprobada** la solución del plan (`cambiar-contrasena` con `permitirRestringido: true`) y el texto nuevo para ESSENTIALS "Autorización" |
| FE-01 | **Excepción autorizada por escrito:** el programador entrega con esa única prueba en rojo, **solo en AUTH-02a y solo hasta la ronda 1 del tester**, que la actualiza sin cambiar lo que protege y publica el hash nuevo. Después, suite completa en verde |

## Autorizado por escrito
- Instalar `pg-boss` 12.34.0 y `resend` 6.29.0.
- La migración `tokens_cuenta`.
- Tocar `backend/src/middleware/rutas-publicas.ts`.
- Que pg-boss cree el esquema `pgboss` en `campus_dev`.
- La prueba de humo V-17 en `campus_dev`.
- Que el orquestador aplique los textos de documentos (C-01 a C-06 y los de §18 de N-02, N-03 y N-05).

## Red y firewall
El humano declara que la red actual es la de su casa y que es de confianza. Verificado por el orquestador el 2026-09-24: red `IZZI-F281`, categoría `Public`; regla "Campus: bloquear entrada a Docker en redes publicas" `True` / `Inbound` / `Block` / `Public`. PA-01 no se activa.

## Flujo
`arquitecto` registra la **Enmienda 1** en `plan.md` → `manager` verifica solo que la enmienda cubra estas decisiones → `programador` (AUTH-02a) → `tester` (máximo 3 rondas) → `manager` en modo final → el orquestador aplica los textos de documentos autorizados y actualiza `docs/ESTADO.md` → el humano revisa el diff. Sin commit: ningún agente ejecuta `git add`, `git commit` ni `git push`. Reglas vigentes: formateadores solo acotados al paquete; ningún agente termina procesos que no arrancó; cuando el plan dice detenerse, se detiene.

## Verificación de la Enmienda 1 — 2026-09-24
El manager verificó la Enmienda 1 (`revision.md`, sección "verificación de la Enmienda 1"): **APROBADO**, sin problemas que bloqueen.
- **E-01:** PA-03 admitía una versión menor más nueva de `pg-boss` o `resend`, pero el humano autorizó exactamente 12.34.0 y 6.29.0. El orquestador lo aplica al invocar al programador: cualquier versión instalada distinta de esas dos detiene como PA-03. No hace falta otra ronda del arquitecto.
- **E-02, decidido por el humano:** la condición de N-04 ("nunca atrapar `P2002` dentro de la transacción") significa **no atraparlo para continuar**. Traducir el `P2002` a `AppError` dentro de la transacción y volver a lanzarlo está permitido, porque Prisma revierte, como hace `crearUsuario` desde AUTH-01. Aplica a `crearMaestroInvitado` y `corregirCorreo`. No hace falta otra ronda del arquitecto.

## Enmienda 2 — decisiones del humano (2026-09-25)
Contexto: la ronda 2 del tester dio **ROTO** con T-07 (media), T-08 (alta) y T-09 (media), condiciones de carrera entre la revocación de sesiones o el cambio de contraseña de AUTH-02a y `refrescar`/`login` de AUTH-01 (`reporte-tester.md`, ronda 2). El arquitecto propuso la Enmienda 2 (`plan.md`, E2-1 a E2-11): un protocolo único de bloqueo sobre la fila de `usuarios` y la comprobación del hash vigente al crear la sesión del login. El humano respondió a las preguntas con la herramienta de preguntas del orquestador:

| # | Pregunta | Decisión del humano |
|---|---|---|
| Q-E2-1 | Opción de E2-9 | **(a)**: corregir T-07, T-08 y T-09 en la ronda 3 del programador, la última. Antes, el manager verifica la Enmienda 2 de forma acotada, como la 1. Si el tester vuelve a dar ROTO, se escala al humano |
| Q-E2-2 | Archivos de AUTH-01 | **Autorizados los dos:** `backend/src/adapters/db/sesiones.ts` (`crearSesion`, `rotarSesion`, `revocarTodasLasSesiones`) y **solo el bloque de `POST /login`** de `backend/src/handlers/auth/index.ts`. V-22 deja de exigir que `handlers/auth/index.ts` no cambie |
| Q-E2-3 | `reset:admin` | **Entra:** el cambio en `actualizarContrasenaYRevocarSesiones` (`adapters/db/usuarios.ts`) con 2 pruebas; `scripts/` no cambia |
| Q-E2-4 | Login cuya contraseña cambió entre la verificación y la sesión | **Aceptado:** responde `401 CREDENCIALES_INVALIDAS` y no suma un fallo al límite de intentos (se conserva `intentos-r2.ataque`) |
| Q-E2-5 | Textos de E2-10 para ESSENTIALS "Reglas de datos" y §14 | **Aprobados**; el orquestador los aplica al cerrar AUTH-02a |

### Verificación de la Enmienda 2 — 2026-09-25
El manager verificó la Enmienda 2 (`revision.md`, sección "verificación de la Enmienda 2"): **APROBADO**, sin nada que bloquee la ronda 3.
- **E2-01:** si PA-18 se activa, el programador distingue un cierre de transacción por tiempo de Prisma (`P2028`) de un deadlock real (`40P01`). El orquestador se lo indica al invocarlo.
- **E2-02:** V-13 y la prueba E6 cuentan solo el código propio, sin `adapters/db/generated/` ni los README. El orquestador se lo indica al invocarlo.
- **E2-03, decidido por el humano:** el deadlock anterior a la Enmienda 2 entre dos correcciones de correo cruzadas y simultáneas del admin (una responde `500` y los datos quedan correctos) se **acepta como riesgo residual** y queda pendiente para ADMIN. El orquestador avisa al tester antes de la ronda 3 para que no lo cuente como ROTO.

## Cierre de AUTH-02a — 2026-09-25
- **Recorrido:**
  - Programador: 3 rondas.
  - Tester: ronda 1 ROTO (T-01..T-06), ronda 2 ROTO (T-07..T-09), ronda 3 **RESISTE**.
  - Manager final: **APROBADO** (`revision.md`, "AUTH-02a — final").
- **Suite al cierre:** backend 65 archivos / 657 pruebas y frontend 11 / 69, en verde, más lint y build. La tabla vigente de hashes de las 24 `*.ataque` es la de la ronda 3 del tester (`reporte-tester.md`) y vale para AUTH-02b.
- **Textos de documentos aplicados por el orquestador** (autorizados por C-01..C-06, N-02, N-03, N-05 y Q-E2-5):
  - `AGENTS.md`, "Comandos" (`dev:worker`).
  - ESSENTIALS, "Autenticación", "Autorización" y "Reglas de datos".
  - `ARCHITECTURE.md`, §6, §7, §8, §9, §14 (fila `tokens_cuenta` y dos reglas), §18 (siete viñetas) y D-27.

  En ESSENTIALS "Reglas de datos" se aplicaron **las dos precisiones de redacción del manager final**, que no cambian ninguna decisión:
  - "…que pasa por Prisma es el de pg-boss al encolar dentro de una transacción" en lugar de "…ejecutado dentro de la transacción de Prisma";
  - "revocan sesiones en bloque" en lugar de "revocan sesiones".

  El humano las revisa en el diff.
- **Pendiente de decisión del humano** (revisión final del manager, "Para el humano"):
  - **MF-01:** quitar de `resumen-programador.md` (línea 68, ronda 1) el correo de la cuenta de desarrollo del humano y los prefijos de los UUID de `campus_dev` antes del commit.
  - **MF-02:** corregir `README.md` §3 (línea 145, frase invertida sobre los entornos) y §7 (línea 228, conteos de la ronda 1) antes del commit.
  - **MF-03:** ratificar el cambio en `backend/src/handlers/errores.ts` (`erroresDeEnrutamiento` y `frameworkErrors`, corrección de T-05). El plan marcaba ese archivo como "No se toca". **El origen fue el orquestador:** la instrucción de la ronda 2 al programador decía "Resuélvelo en `app.ts` o en `handlers/errores.ts`" sin comprobar esa lista.
  - **MF-04:** confirmar el destino de tres pendientes (ver abajo) y si se añaden a §8 y §18 los textos que propone el manager (`sourceId` de la cola de fallidos; una sola instancia del worker).

## Decisiones del humano sobre el cierre de AUTH-02a — 2026-09-26
> Decisiones sobre el cierre de AUTH-02a:
>
> - MF-01: elimina de resumen-programador.md mi correo y los fragmentos de UUID. Además busca en toda la carpeta docs/trabajo/ correos reales o identificadores de campus_dev y elimínalos; los de @pruebas.local y admin@campus.local pueden quedarse.
> - MF-02: corrígelo por el carril trivial.
> - MF-03: ratifico el cambio en handlers/errores.ts. Agrega a AGENTS.md ("Reglas del equipo"): "Antes de instruir a un agente sobre qué archivo modificar, el orquestador comprueba que no esté en la lista 'No se toca' del plan; si lo está, pide autorización al humano."
> - MF-04: confirmo los tres destinos (dos para ADMIN y uno para DEPLOY) y autorizo los dos textos del manager para §8 y §18.
> - Acepto tus dos cambios de redacción en ESSENTIALS.
> - Agrega a CLAUDE.md, al inicio: "Responde siempre al humano en español de México, incluidos resúmenes, preguntas y reportes."
>
> Actualiza ESTADO.md y detente. Sin commit.

**Aplicado por el orquestador:**
- **MF-01:**
  - Retirados de `resumen-programador.md` (V-17, ronda 1) el correo de desarrollo del humano y los fragmentos de UUID de `campus_dev`. También se retiraron de `revision.md` (descripción de MF-01), que los repetía.
  - Búsqueda en todo `docs/` de correos y de UUID o sus fragmentos: no queda ninguno real. Solo quedan direcciones ficticias `.local` (`@pruebas.local`, `admin@campus.local`, `notificaciones@campus.local`, `admin@contenedor-de-pruebas.local`, `nadie@v08.local`).
- **MF-02:** corregido por el programador en el carril trivial, solo en `README.md`.
  - §3: la frase dice ahora que en `development` y en `test` no hace falta tocar las variables, y que fuera de `NODE_ENV=production` el worker nunca llama a Resend. Contrastado con `config/correo.ts`.
  - §7: backend 65 archivos / 657 pruebas, 319 adversarias en 21 archivos, unos 32 s.
  - Los números salen de corridas propias en verde, con la precondición del firewall comprobada. Fueron dos en lugar de una, porque la primera no daba el desglose de las adversarias. El programador lo declaró.
  - No quedaron contenedores ni temporales propios.
- **MF-03:** cambio en `handlers/errores.ts` ratificado. Regla añadida a `AGENTS.md`, "Reglas del equipo", con el texto literal del humano.
- **MF-04:**
  - Destinos confirmados: dos pendientes para ADMIN y uno para DEPLOY.
  - Textos añadidos a `ARCHITECTURE.md`: §8, el `sourceId` de la cola de fallidos; §18, una sola instancia del worker.
- **ESSENTIALS:** el humano acepta las dos precisiones de redacción de "Reglas de datos".
- **`CLAUDE.md`:** la línea sobre responder en español de México, al inicio, tras el título.

## Pendientes para encargos posteriores
- **AUTH-02b:** pasos 16 a 22 del plan (frontend) y la fila `admin` de `CLAUDE.md`.
- **ADMIN:** la contraseña temporal no caduca (S-05): una temporal sin usar sigue sirviendo indefinidamente. Decidir si caduca. Además, lo que el plan ya anota para ADMIN.
- **ADMIN (E2-03):** dos correcciones de correo cruzadas y simultáneas del admin pueden producir un deadlock y un `500` en `corregirCorreo` (los datos quedan correctos). Riesgo residual aceptado por el humano el 2026-09-25.
- **DEPLOY:** los puntos de §18 que deja este encargo.
- **Propuestos por el manager final (MF-04), destinos confirmados por el humano el 2026-09-26:**
  - ADMIN: la baja o desactivación de una cuenta cumple PB-8: bloquea, pone `activo = false` y revoca sesiones y enlaces bajo el bloqueo. Hoy `refrescar` y `restablecer` leen `activo` antes del bloqueo.
  - ADMIN: los cambios masivos sobre `usuarios` van en lotes cortos. Una transacción que retenga filas más de 5 s provoca `500` por `P2028` en los logins y refrescos de esos usuarios.
  - DEPLOY: una sola instancia del worker. El tope durable de recuperaciones por cuenta se lee fuera del bloqueo y supone un solo consumidor con `batchSize: 1`.
