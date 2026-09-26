# CMEP Campus Digital

Plataforma educativa web del CMEP. Fase experimental.

- Producto: `docs/PRD.md`
- Arquitectura: `docs/ARCHITECTURE.md` (resumen en `docs/ARCHITECTURE-ESSENTIALS.md`)
- Reglas de trabajo para agentes: `AGENTS.md` y `CLAUDE.md`

## Entorno de desarrollo local (Windows + PowerShell)

Levanta en tu máquina PostgreSQL, MinIO y LiveKit en modo de desarrollo, publicados solo en `127.0.0.1`. Los comandos están escritos para Windows PowerShell 5.1 y se ejecutan desde la raíz del repositorio.

### 1. Requisitos

Docker Desktop con backend WSL 2, abierto y en ejecución. Compruébalo así:

```powershell
docker version
docker compose version
```

Los dos comandos deben responder sin error, y Compose debe ser la versión 2.

### 2. Levantar

```powershell
Set-Location infra
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d
docker compose ps -a
```

Resultado esperado: `postgres`, `minio` y `livekit` en `running (healthy)`, y `minio-init` en `exited (0)`. Eso último es lo correcto: `minio-init` solo crea los buckets `campus-privado` y `campus-publico` y termina.

| Servicio | Dirección con los valores por defecto | De dónde sale el puerto |
|---|---|---|
| PostgreSQL | `127.0.0.1:5433` | Valor de `POSTGRES_PORT` en `infra/.env` (5433 por defecto) |
| API de MinIO (S3) | `http://127.0.0.1:9000` | Valor de `MINIO_API_PORT` en `infra/.env` (9000 por defecto) |
| Consola de MinIO | `http://127.0.0.1:9001` (usuario y contraseña: los valores de `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY` en `infra/.env`) | Valor de `MINIO_CONSOLE_PORT` en `infra/.env` (9001 por defecto) |
| LiveKit | `ws://127.0.0.1:7880` | Fijo: no se cambia |

Los puertos de PostgreSQL y de MinIO no son fijos: si cambias la variable en `infra/.env`, la dirección cambia con ella. PostgreSQL usa el 5433 y no el 5432 para no chocar con un PostgreSQL instalado directamente en Windows, que ocupa el 5432.

Usa siempre `127.0.0.1`, no `localhost`: los puertos se publican solo en IPv4 y en Windows `localhost` puede resolver primero a `::1` y fallar o tardar.

### 3. Revisar

Desde la carpeta `infra`:

```powershell
docker compose ps -a
docker compose logs --tail 50 postgres
docker compose logs minio-init
docker compose logs -f livekit
docker compose exec postgres psql -U campus -d campus_dev -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:9000/minio/health/live
curl.exe -s http://127.0.0.1:7880/
```

- `logs -f` sigue los logs en vivo; sal con Ctrl+C.
- La consulta debe listar `pg_trgm` y `unaccent`.
- MinIO responde `200`.
- LiveKit responde `OK`.
- Los buckets se ven en la consola de MinIO.

### 4. Apagar

```powershell
docker compose stop
docker compose down
```

`stop` detiene los contenedores y los conserva. `down` elimina los contenedores y la red. **En ambos casos los datos se conservan** en los volúmenes `campus-dev-postgres-data` y `campus-dev-minio-data`.

### 5. Borrar los datos locales (requiere confirmación)

> **Advertencia:** `docker compose down -v` **borra la base de datos y los archivos locales sin forma de recuperarlos.** Según `AGENTS.md`, ningún agente lo ejecuta sin la confirmación explícita de una persona, y nunca contra algo que no sea el entorno local.

Solo hace falta en dos casos: cambiar las credenciales de PostgreSQL (se graban al crear el volumen) o repetir la inicialización desde cero.

Si lo único que falta son las extensiones, no borres nada. Créalas a mano con el mismo SQL, que se puede repetir sin riesgo:

```powershell
docker compose exec postgres psql -U campus -d campus_dev -c "CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;"
```

### 6. Problemas frecuentes en Windows

- **Puerto ocupado** (`port is already allocated` o un error de `access permissions`). Otro programa usa el puerto, o Windows lo tiene reservado. Diagnostica con:

  ```powershell
  Get-NetTCPConnection -LocalPort 5433 -State Listen
  netsh interface ipv4 show excludedportrange protocol=tcp
  ```

  Cambia `POSTGRES_PORT`, `MINIO_API_PORT` o `MINIO_CONSOLE_PORT` en `infra/.env` y ajusta `DATABASE_URL` o `STORAGE_ENDPOINT` para que coincidan. Los puertos de LiveKit (7880, 7881 y 7882/udp) no se cambian.
- **Error de variable faltante** ("Falta ... Copia infra/.env.example a infra/.env"). No existe `infra/.env`. Repite el paso de copia de la sección 2.
- **`error during connect`.** Docker Desktop está cerrado. Ábrelo y espera a que termine de iniciar.
- **Las extensiones no aparecen.** El volumen ya existía, y el script de inicio solo corre con el volumen vacío. Usa la alternativa de la sección 5.

## Backend en local (Windows + PowerShell)

Arranca la API (Fastify) y el worker en tu máquina contra el PostgreSQL del entorno de desarrollo. Los comandos están escritos para Windows PowerShell 5.1; cada paso indica desde qué carpeta se ejecuta.

### 1. Requisitos

Node 24 LTS y npm 11, y el entorno de infra levantado (sección anterior). Para correr las pruebas (paso 7) basta con Docker Desktop encendido; no necesitan el entorno de infra. Compruébalo así:

```powershell
node --version
npm --version
```

Deben responder `v24.x` y `11.x`. Si usas nvm, `.nvmrc` en la raíz fija la versión `24`.

### 2. Instalar dependencias

Desde la raíz del repositorio, una sola vez tras clonar y cada vez que cambie un `package.json`:

```powershell
npm install
```

Instala los tres workspaces (`shared`, `backend` y `frontend`) en un solo `node_modules`. Necesita red: además de los paquetes, descarga el motor de esquema que usa el CLI de Prisma para las migraciones.

### 3. Configurar el backend

Desde la raíz:

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`backend/.env` no se versiona. Su `DATABASE_URL` **debe coincidir** con la de `infra/.env` (mismo usuario, contraseña, base y puerto `POSTGRES_PORT`, 5433 por defecto); si cambias una, cambia la otra. El CLI de Prisma lo lee a través de `backend/prisma.config.ts`, sin banderas: ese archivo le indica la URL de conexión y dónde están el esquema y las migraciones.

Además de `DATABASE_URL`, la API exige `JWT_SECRET` (el secreto con el que firma los tokens de acceso, mínimo 32 caracteres). El valor de `backend/.env.example` sirve en `development` y `test`; con `NODE_ENV=production` la API se niega a arrancar si `JWT_SECRET` es ese mismo valor o mide menos de 32 caracteres. Para generar uno propio:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`ADMIN_EMAIL`, `ADMIN_PASSWORD` (entre 10 y 128 caracteres) y `ADMIN_NOMBRE` solo los usan `npm run seed:admin` y `npm run reset:admin` (paso 5). La copia con guarda de arriba no toca un `backend/.env` que ya existía: si el tuyo es anterior a la autenticación, añade a mano esas cuatro variables tomándolas de `backend/.env.example`.

Las variables de correo (`RESEND_API_KEY`, `CORREO_REMITENTE`, `CORREO_RESPONDER_A`, `URL_PUBLICA_FRONTEND`) solo las lee el worker (paso 8); la API no las necesita. En `development` y en `test` no hace falta tocarlas: tienen valores por defecto y, **aunque pongas una llave real en `RESEND_API_KEY`, el worker nunca llama a Resend fuera de `NODE_ENV=production`**: escribe cada correo como HTML en `backend/tmp/correos/`. En `production`, el remitente de ejemplo de `.env.example` (dominio `campus.local`) se rechaza: hace falta un dominio propio verificado en Resend.

### 4. Migraciones y cliente de Prisma

Desde `backend`, solo la primera vez (y cada vez que llegue una migración nueva):

```powershell
npx prisma migrate dev
npx prisma generate
```

`migrate dev` aplica las migraciones de `backend/prisma/migrations` a `campus_dev` y lleva el registro en la tabla `_prisma_migrations` (propia de Prisma, no del negocio). Para validar las migraciones crea una base sombra temporal en el mismo PostgreSQL y la borra al terminar; no necesita configuración extra. Si no hay nada pendiente responde `Already in sync`.

Hoy hay tres migraciones: `extensiones_iniciales` (`pg_trgm` y `unaccent`), `usuarios_y_sesiones`, que crea las tablas `usuarios` y `sesiones` y el índice que permite un solo administrador, y `tokens_cuenta`, que crea la tabla de enlaces de un solo uso (recuperación e invitación) usados por AUTH-02.

`generate` escribe el cliente de Prisma en `backend/src/adapters/db/generated/` (ignorado por git; no se edita a mano). Los scripts `dev`, `dev:worker`, `build`, `lint` y `test` lo regeneran solos, así que solo hace falta a mano después de un `npm install` limpio.

Además de las tablas de `public`, la API y el worker crean al arrancar el esquema `pgboss` en `campus_dev` (cola de pg-boss, AUTH-02): lo gestiona pg-boss, no Prisma; no se toca a mano ni se incluye en una migración.

### 5. Cuenta de administrador

Desde `backend`, una sola vez por base de datos:

```powershell
npm run seed:admin
```

Crea la única cuenta de administrador con `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NOMBRE` de `backend/.env` y responde `Administrador creado: <correo>`. Si ya existe un administrador, no cambia nada y termina con código 1: `Ya existe una cuenta de administrador. Usa npm run reset:admin para cambiar su contraseña.`

Para cambiar la contraseña del administrador, pon la nueva en `ADMIN_PASSWORD` y, desde `backend`:

```powershell
npm run reset:admin
```

Fija esa contraseña, cierra todas las sesiones del administrador y responde `Contraseña del administrador actualizada y sesiones cerradas: <correo>`. No obliga a cambiarla al entrar, porque la eligió quien ejecuta el comando. Ninguno de los dos comandos imprime la contraseña. En `prod` las variables `ADMIN_*` se definen en el `.env` del servidor solo para ejecutar el comando y se retiran después.

### 6. Arrancar la API

Desde `backend`:

```powershell
npm run dev
```

La API escucha en `http://127.0.0.1:3000` (variables `HOST` y `PORT` de `backend/.env`) y se recarga al guardar. Además de `/api/salud` expone la autenticación (`/api/auth/registro`, `/api/auth/login`, `/api/auth/refrescar`, `/api/auth/logout`), la recuperación y el cambio de contraseña (`/api/auth/recuperar`, `/api/auth/restablecer`, `/api/auth/establecer-contrasena`, `/api/auth/cambiar-contrasena`), `GET /api/me` y las rutas de administración de cuentas (`/api/admin/maestros`, `/api/admin/usuarios/buscar`, `/api/admin/usuarios/{id}/restablecer-contrasena`, `PUT /api/admin/usuarios/{id}/correo`).

**La API necesita la base para arrancar** (pg-boss se conecta al iniciar): si PostgreSQL no responde, la API no arranca y termina con un código distinto de 0. Levanta siempre `infra/` (sección anterior) antes de `npm run dev`. En el servidor, Compose la levantará después de que PostgreSQL esté sano (`depends_on` con `healthcheck`; pendiente de DEPLOY).

En otra terminal:

```powershell
curl.exe http://127.0.0.1:3000/api/salud
curl.exe -i http://127.0.0.1:3000/api/no-existe
```

Respuestas esperadas:

- `/api/salud`: `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-21T20:15:30.123Z"}` (la fecha es la del momento, en UTC). Si PostgreSQL no responde, devuelve `503` con `{"error":{"codigo":"BASE_DE_DATOS_NO_DISPONIBLE","mensaje":"La base de datos no responde."}}`.
- `/api/no-existe`: `HTTP/1.1 404 Not Found` con `{"error":{"codigo":"NO_ENCONTRADO","mensaje":"La ruta no existe."}}`. Todos los errores de la API usan ese formato.

Detén la API con Ctrl+C.

### 7. Pruebas

Desde la raíz (corre las de todos los workspaces) o desde `backend`:

```powershell
npm test
```

Precondiciones: Docker Desktop encendido y `backend/.env` presente (paso 3). Las pruebas del backend **no usan tu `campus_dev`** ni el PostgreSQL de infra: al empezar, levantan con Testcontainers un PostgreSQL desechable con la misma imagen que `infra/docker-compose.yml`, le aplican las migraciones con `prisma migrate deploy`, crean su único administrador con `seed:admin`, instalan el esquema `pgboss` y sus dos colas de correo (`test/preparar-cola.ts`) y lo destruyen todo al terminar. `backend/.env` solo hace falta porque `prisma generate`, que corre antes de las pruebas, lo lee; su `DATABASE_URL` no se usa para probar, y `JWT_SECRET` y `ADMIN_*` de las pruebas se generan en cada corrida. No hay forma de dirigir las pruebas a `campus_dev`: una guarda detiene la suite si la base no es la desechable (también en `test/preparar-cola.ts`).

La primera corrida descarga de Docker Hub la imagen `testcontainers/ryuk` (necesita red). Ryuk borra el contenedor de pruebas aunque la corrida se interrumpa; tarda hasta un minuto en hacerlo. Para comprobar que no quedó ninguno:

```powershell
docker ps -a --filter "label=org.testcontainers=true"
```

Debe responder solo la línea de encabezados.

Mientras dura la corrida, Ryuk publica su puerto en todas las interfaces. No corras la suite en una red pública o no confiable sin la mitigación del firewall: regla en `AGENTS.md` ("Pruebas") y pasos en `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`.

El backend tiene 65 archivos con 657 pruebas (desde AUTH-02: cuentas, correo, cola y worker): unitarias de `core/`, `config/` y `middleware/`, y de la guarda de la base de pruebas; de integración que levantan la API en memoria contra la base desechable, incluidas las de la cola transaccional y el worker de correo; y adversarias (`*.ataque.test.ts`, 319 de ellas en 21 archivos), algunas de las cuales arrancan la API real con `tsx` en un puerto libre al azar y la detienen al terminar. El frontend tiene 25 archivos con 258 pruebas: 183 adversarias, en 11 archivos. La suite del backend tarda unos 32 segundos: unos 7 para levantar y preparar la base (también instala el esquema `pgboss` y sus dos colas), y el resto porque las contraseñas se procesan con argon2id con los mismos parámetros que en `prod`. Toda corrida del backend levanta la base, aunque filtres solo pruebas unitarias.

Mensajes si falta algo:

- `No se pudo levantar PostgreSQL de pruebas con Testcontainers. Enciende Docker Desktop y vuelve a correr las pruebas.`: Docker Desktop está apagado o no responde.
- `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL` antes de empezar: falta `backend/.env` (paso 3).
- `Falta la base de pruebas: ...`: corriste las pruebas sin la configuración de Vitest del backend (por ejemplo, con otra `--config`). Usa `npm test` o `npx vitest` desde `backend`.
- `Guarda de la base de pruebas: ...`: algo intentó dirigir las pruebas a una base que no es la desechable, y no se ejecutó ninguna prueba. Repórtalo.

### 8. Arrancar el worker

Desde `backend`:

```powershell
npm run dev:worker
```

Registra `"evento":"worker_listo"` con el canal de correo activo (`registro` fuera de `production`) y se queda esperando trabajos. Consume la cola `CORREO_DE_CUENTA` (recuperación e invitación) y su cola de fallidos: 3 reintentos con espera exponencial desde 30 s y, si se agotan, la cola de fallidos, que solo registra el evento `correo_de_cuenta_fallido`. Las dos colas retienen sus trabajos 1 día.

En desarrollo, cada correo enviado queda como un archivo HTML en `backend/tmp/correos/` (el worker **nunca** llama a Resend fuera de `NODE_ENV=production`, aunque pongas una llave real): ábrelo con `Invoke-Item (Get-ChildItem backend\tmp\correos | Sort-Object LastWriteTime | Select-Object -Last 1).FullName` y sigue el enlace. El enlace apunta a `URL_PUBLICA_FRONTEND` (por defecto, la SPA de Vite); la pantalla que lo recibe es `/restablecer` o `/establecer-contrasena`, según el flujo.

Detenlo con Ctrl+C.

### 9. Problemas frecuentes

- **Puerto 3000 ocupado** (`EADDRINUSE`). Diagnostica con `Get-NetTCPConnection -LocalPort 3000 -State Listen` y cambia `PORT` en `backend/.env` (no en `.env.example`).
- **`ECONNREFUSED 127.0.0.1:5433` o `P1001`.** El entorno de infra está apagado, o `DATABASE_URL` apunta a otro puerto que `POSTGRES_PORT` en `infra/.env`. Levántalo con `docker compose up -d` desde `infra`.
- **`P1000` (autenticación).** El usuario o la contraseña de `DATABASE_URL` no coinciden con `POSTGRES_USER` y `POSTGRES_PASSWORD` de `infra/.env`. Recuerda que las credenciales de PostgreSQL se graban al crear el volumen.
- **`Configuración inválida. Revisa backend/.env ...`.** Falta `backend/.env` o una variable no cumple su regla; el mensaje lista la variable y el motivo (nunca su valor). Compara con `backend/.env.example`.
- **`JWT_SECRET: obligatoria`.** Tu `backend/.env` es anterior a la autenticación: copia la línea `JWT_SECRET` de `backend/.env.example` (paso 3).
- **`JWT_SECRET: en production debe ser un secreto propio de al menos 32 caracteres, distinto del de .env.example`.** Arrancaste con `NODE_ENV=production` y el secreto de ejemplo. Genera uno propio con el comando del paso 3.
- **`ADMIN_EMAIL: obligatoria` (o `ADMIN_PASSWORD`, `ADMIN_NOMBRE`) al ejecutar `seed:admin` o `reset:admin`.** Faltan las variables `ADMIN_*` en `backend/.env`: cópialas de `backend/.env.example` (paso 3).
- **`Ya existe una cuenta de administrador. Usa npm run reset:admin para cambiar su contraseña.`** Solo puede haber un administrador. Si lo que necesitas es entrar con otra contraseña, usa `npm run reset:admin` (paso 5).
- **`npm install` intenta compilar `argon2`** (mensajes de `node-gyp`, o `No native build was found` al arrancar). `argon2` trae binarios precompilados para Windows x64 y Linux x64; si tu plataforma o tu versión de Node no está cubierta, intenta compilarlo. No uses `--force` ni `--legacy-peer-deps`: repórtalo, porque cambiar de librería de contraseñas requiere aprobación.
- **`Cannot find module '.../adapters/db/generated/client.js'` (`ERR_MODULE_NOT_FOUND`) o errores de `tsc` en `adapters/db/cliente.ts` sobre `./generated/client.js`.** Falta generar el cliente: ejecuta `npx prisma generate` desde `backend`.
- **Un comando `npx prisma ...` se queja de que falta `DATABASE_URL`** (`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`). No existe `backend/.env` (repite el paso 3): `prisma.config.ts` lo carga si existe.
- **`npm run dev` deja procesos vivos al cerrar la terminal.** `tsx watch` arranca un proceso hijo; si el puerto sigue ocupado, localiza el PID con `Get-NetTCPConnection -LocalPort 3000 -State Listen` y termínalo con `taskkill /PID <pid> /T /F`.
- **`RESEND_API_KEY: obligatoria en production`.** Arrancaste el worker con `NODE_ENV=production` sin `RESEND_API_KEY`. Solo hace falta en `production`; fuera de ahí el canal es `registro`.
- **`URL_PUBLICA_FRONTEND: en production debe empezar con https://`.** En `production`, la URL pública del frontend no puede ser `http://`.
- **`CORREO_REMITENTE: en production debe usar un dominio propio verificado en Resend, distinto del de .env.example`.** El remitente sigue siendo el de `backend/.env.example` (dominio `campus.local`): pon uno con un dominio propio, verificado en Resend.
- **"No me llega el correo en desarrollo".** ¿Está corriendo `npm run dev:worker` (paso 8)? La API solo encola; el worker es quien envía. Revisa `backend/tmp/correos/`: ahí queda cada correo como HTML.
- **La API no arranca y el error menciona la base o pg-boss.** ¿Está en marcha `postgres` de `infra/`? Desde AUTH-02, la API necesita la base para arrancar (paso 6).
- **El login queda bloqueado por intentos (`DEMASIADOS_INTENTOS`) justo cuando quieres entrar con una contraseña temporal.** El límite de 5 intentos en 15 minutos es del login, no de la contraseña: espera la ventana o usa otra IP de prueba.
- **Rotaste `JWT_SECRET`.** Los enlaces de recuperación e invitación pendientes quedan invalidados (se derivan de ese secreto); pide uno nuevo.

## Frontend en local (Windows + PowerShell)

Arranca la SPA (Vite) contra la API local. Los comandos están escritos para Windows PowerShell 5.1; cada paso indica desde qué carpeta se ejecuta.

### 1. Requisitos

Node 24 LTS y npm 11 (sección "Backend en local", paso 1), dependencias instaladas con `npm install` desde la raíz (paso 2 de esa sección) y, para que el login, el registro y la vista de diagnóstico respondan, la API corriendo en `http://127.0.0.1:3000` (paso 6 de esa sección).

### 2. Configurar (opcional)

Desde la raíz:

```powershell
Set-Location frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`frontend/.env` no se versiona y hoy solo tiene `VITE_API_URL`, vacía por defecto: el frontend habla con `/api` en su mismo origen y, en desarrollo, Vite reenvía `/api` a `http://127.0.0.1:3000`. No hace falta crear el archivo para trabajar en local.

### 3. Arrancar

Desde `frontend`:

```powershell
npm run dev
```

Abre `http://127.0.0.1:5173/login` y `http://127.0.0.1:5173/registro`, que hablan con la API a través del proxy de Vite, y `http://127.0.0.1:5173/diagnostico` (consulta `GET /api/salud` y muestra el estado de la API y de la base de datos). Usa `127.0.0.1`, no `localhost`. El servidor recompila al guardar; detenlo con Ctrl+C.

Para recorrer el flujo completo:

- **Administrador:** crea la cuenta con `npm run seed:admin` (sección "Backend en local", paso 5) y entra en `/login` con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Llegas a `/admin`, con la pantalla provisional de cuentas (invitar maestro, buscar una cuenta, restablecer su contraseña, corregir su correo).
- **Estudiante:** crea una cuenta en `/registro`. Quedas con la sesión iniciada en `/estudiante`.

Por ahora el estudiante y el maestro ven una bienvenida con su nombre y el botón "Cerrar sesión"; los dashboards llegan con sus módulos. Si recargas la página, la sesión se restaura sola con la cookie de refresco (el token de acceso vive solo en memoria).

Los correos de cuenta (recuperación e invitación) no salen de verdad fuera de `prod`: el worker los escribe como HTML en `backend/tmp/correos/` (sección "Backend en local", paso 8). Con la API y el worker corriendo (ese mismo paso), recorre estos tres flujos:

- **Recuperación de contraseña:** en `/login`, entra a "¿Olvidaste tu contraseña?" y pide el enlace con el correo de una cuenta existente. Abre el HTML más reciente de `backend/tmp/correos/` (sección "Backend en local", paso 8) y sigue el enlace `http://127.0.0.1:5173/restablecer#token=...`: elige una contraseña nueva y vuelves a `/login` con el aviso de que se actualizó.
- **Invitación de un maestro:** entra como administrador a `/admin` y usa "Invitar a un maestro". Abre el HTML nuevo de `backend/tmp/correos/` de la misma forma y sigue el enlace `http://127.0.0.1:5173/establecer-contrasena#token=...`: elige su contraseña y vuelves a `/login` con el aviso de que la cuenta quedó lista.
- **Restablecimiento por el admin:** en `/admin`, busca una cuenta por su correo exacto y usa "Restablecer contraseña" (con su confirmación en línea). Copia la contraseña temporal que se muestra una sola vez, entra con ella en `/login` y, en `/cambiar-contrasena`, elige una contraseña propia.

### 4. Comprobar, probar y compilar

Desde `frontend` (o desde la raíz para los tres workspaces):

```powershell
npm run lint
npm test
npm run build
```

`lint` corre ESLint, Prettier y `tsc -b`; `test` corre Vitest con jsdom (no necesita la API ni infra); `build` deja la SPA en `frontend/dist/`. Los scripts `dev`, `build`, `lint` y `test` compilan antes `shared/` (`shared/dist`), como en el backend.

### 5. Problemas frecuentes

- **Puerto 5173 ocupado** (`Port 5173 is already in use`). Vite no salta a otro puerto a propósito. Diagnostica con `Get-NetTCPConnection -LocalPort 5173 -State Listen` y cierra el proceso que lo usa si es tuyo.
- **El login dice "No pudimos conectar con el servidor. Revisa tu conexión." o la vista de diagnóstico muestra un error** (`SIN_CONEXION`, `RESPUESTA_INVALIDA` o un 5xx). La API no está corriendo en `127.0.0.1:3000` (con la API apagada, el proxy de Vite responde `502` sin cuerpo): arráncala con `npm run dev` desde `backend` (sección anterior, paso 6). Si muestra `BASE_DE_DATOS_NO_DISPONIBLE`, la API responde pero PostgreSQL no: revisa infra.
- **`Cannot find module '@campus/shared'` o tipos que faltan de `@campus/shared`.** No existe `shared/dist`: ejecuta `npm run build` desde `shared` (los scripts del frontend lo hacen solos; a mano solo tras un `npm install` limpio).
- **`tsc -b` falla en `node_modules/.tmp`.** Borra `frontend/node_modules/.tmp` (solo contiene información incremental de TypeScript) y repite.
