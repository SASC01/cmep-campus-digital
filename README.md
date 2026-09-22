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

Node 24 LTS y npm 11, y el entorno de infra levantado (sección anterior). Compruébalo así:

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

Instala los tres workspaces (`shared`, `backend` y `frontend`) en un solo `node_modules`. Necesita red: además de los paquetes, descarga los motores de Prisma.

### 3. Configurar el backend

Desde la raíz:

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`backend/.env` no se versiona. Su `DATABASE_URL` **debe coincidir** con la de `infra/.env` (mismo usuario, contraseña, base y puerto `POSTGRES_PORT`, 5433 por defecto); si cambias una, cambia la otra. El CLI de Prisma lee `backend/.env` por su cuenta, sin banderas.

### 4. Migraciones y cliente de Prisma

Desde `backend`, solo la primera vez (y cada vez que llegue una migración nueva):

```powershell
npx prisma migrate dev
npx prisma generate
```

`migrate dev` aplica las migraciones de `backend/prisma/migrations` a `campus_dev` y lleva el registro en la tabla `_prisma_migrations` (propia de Prisma, no del negocio). Para validar las migraciones crea una base sombra temporal en el mismo PostgreSQL y la borra al terminar; no necesita configuración extra. Si no hay nada pendiente responde `Already in sync`.

`generate` escribe el cliente de Prisma en `node_modules` (no se versiona). Los scripts `dev`, `dev:worker`, `build` y `test` lo regeneran solos, así que solo hace falta a mano después de un `npm install` limpio.

### 5. Arrancar la API

Desde `backend`:

```powershell
npm run dev
```

La API escucha en `http://127.0.0.1:3000` (variables `HOST` y `PORT` de `backend/.env`) y se recarga al guardar. En otra terminal:

```powershell
curl.exe http://127.0.0.1:3000/api/salud
curl.exe -i http://127.0.0.1:3000/api/no-existe
```

Respuestas esperadas:

- `/api/salud`: `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-21T20:15:30.123Z"}` (la fecha es la del momento, en UTC). Si PostgreSQL no responde, devuelve `503` con `{"error":{"codigo":"BASE_DE_DATOS_NO_DISPONIBLE","mensaje":"La base de datos no responde."}}`.
- `/api/no-existe`: `HTTP/1.1 404 Not Found` con `{"error":{"codigo":"NO_ENCONTRADO","mensaje":"La ruta no existe."}}`. Todos los errores de la API usan ese formato.

Detén la API con Ctrl+C.

### 6. Pruebas

Desde la raíz (corre las de todos los workspaces) o desde `backend`:

```powershell
npm test
```

Precondiciones: el entorno de infra levantado y `backend/.env` presente. Incluye pruebas unitarias de `core/` y `config/` y dos de integración que levantan la API en memoria; una de ellas consulta el PostgreSQL de infra. Mensajes si falta algo:

- `Falta backend/.env: copia backend/.env.example a backend/.env`: repite el paso 3.
- `PostgreSQL de infra no responde en DATABASE_URL. Levanta infra: docker compose up -d en infra/`: repite el paso 2 de la sección anterior.

### 7. Arrancar el worker

Desde `backend`:

```powershell
npm run dev:worker
```

Registra `"evento":"worker_listo"` y se queda esperando. Todavía no consume trabajos: la cola llega con el primer trabajo real. Detenlo con Ctrl+C.

### 8. Problemas frecuentes

- **Puerto 3000 ocupado** (`EADDRINUSE`). Diagnostica con `Get-NetTCPConnection -LocalPort 3000 -State Listen` y cambia `PORT` en `backend/.env` (no en `.env.example`).
- **`ECONNREFUSED 127.0.0.1:5433` o `P1001`.** El entorno de infra está apagado, o `DATABASE_URL` apunta a otro puerto que `POSTGRES_PORT` en `infra/.env`. Levántalo con `docker compose up -d` desde `infra`.
- **`P1000` (autenticación).** El usuario o la contraseña de `DATABASE_URL` no coinciden con `POSTGRES_USER` y `POSTGRES_PASSWORD` de `infra/.env`. Recuerda que las credenciales de PostgreSQL se graban al crear el volumen.
- **`Configuración inválida. Revisa backend/.env ...`.** Falta `backend/.env` o una variable no cumple su regla; el mensaje lista la variable y el motivo (nunca su valor). Compara con `backend/.env.example`.
- **`@prisma/client did not initialize yet` o `Cannot find module '.prisma/client'`.** Falta generar el cliente: ejecuta `npx prisma generate` desde `backend`.
- **`npm run dev` deja procesos vivos al cerrar la terminal.** `tsx watch` arranca un proceso hijo; si el puerto sigue ocupado, localiza el PID con `Get-NetTCPConnection -LocalPort 3000 -State Listen` y termínalo con `taskkill /PID <pid> /T /F`.
