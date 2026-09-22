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
