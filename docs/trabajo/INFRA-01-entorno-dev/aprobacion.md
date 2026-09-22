# Aprobación del humano — INFRA-01

Fecha: 2026-09-21
Aprobó: Carlos Salazar
Carril: sensible
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Texto de la aprobación
> Apruebo por escrito el plan INFRA-01 tal como está en plan.md, por el carril sensible.

## Respuestas a las preguntas no bloqueantes
| # | Respuesta |
|---|---|
| P-01 | Valor por defecto: `infra/.env.example` |
| P-02 | Valor por defecto: no se crea `campus-respaldos` en local |
| P-03 | Valor por defecto: se confirman `DATABASE_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` y `STORAGE_ENDPOINT` como URL completa |
| P-04 | Valor por defecto: en `dev` la aplicación usa las credenciales raíz de MinIO |
| P-05 | No ahora |

## Contradicciones entre documentos
En C-01, C-02 y C-03 el humano confirmó que la resolución del plan (seguir el encargo) es la correcta. Al terminar INFRA-01 se abrirá un encargo aparte, **DOCS-01**, para corregir `ARCHITECTURE.md` según C-01, C-02 y C-03. INFRA-01 no toca ese documento.

## Flujo
Flujo abreviado autorizado solo para este encargo: `programador` (empieza por verificar las etiquetas de imagen) → `manager` en modo final → el humano revisa el diff. Sin tester. Sin commit: ningún agente ejecuta `git add`, `git commit` ni `git push`.

## Enmienda 1 — aprobada el 2026-09-21
Motivo: el programador se detuvo en el paso 2 porque los repositorios `minio/minio` y `minio/mc` de Docker Hub ya no se pueden descargar de forma anónima (`denied: requested access to the resource is denied`, incluso para `latest`). Detalle en `resumen-programador.md`. El orquestador comprobó con `docker manifest inspect` (solo lectura, sin descargar) que las cuatro etiquetas del plan existen en `quay.io/minio/minio` y `quay.io/minio/mc`, con variante `amd64`.

Texto de la aprobación:
> Apruebo por escrito la opción 1: usar quay.io para las dos imágenes de MinIO, con las mismas etiquetas. quay.io es solo un registro de descarga para una herramienta de desarrollo local; no es un proveedor del proyecto y no entra en la regla 11.

Alcance de la enmienda: solo cambia el registro de las dos imágenes de MinIO.
- `minio`: `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` (alternativa: `quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z`).
- `minio-init`: `quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z` (alternativa: `quay.io/minio/mc:RELEASE.2025-04-16T18-13-26Z`).

El resto del plan queda igual. El arquitecto la registra en `plan.md` como "Enmienda 1"; el programador retoma desde el paso 2; al terminar, `manager` en modo final; después el humano revisa el diff. Sin commit.

## Decisiones del humano tras la revisión final — 2026-09-21
El humano revisó el veredicto del Manager (`revision.md`, APROBADO) y decidió, por el **carril trivial** (solo `programador`, sin commit):

1. **M-01.** El puerto `5433` pasa a ser el valor por defecto del proyecto para PostgreSQL en el anfitrión: se cambia en `infra/.env.example` (`POSTGRES_PORT` y `DATABASE_URL`) y en el README, y la tabla de direcciones del README lo presenta como el valor de `POSTGRES_PORT`, no como un hecho fijo. Sustituye al `5432` que figura en `plan.md`. El puerto interno del contenedor sigue siendo `5432` y `infra/docker-compose.yml` no cambia.
2. **M-02.** Se agrega a la sección "Comandos" de `AGENTS.md` la línea de copiar `.env.example` a `.env` antes del primer `docker compose up`.
3. Confirmado borrar `infra/.gitkeep`.
4. Se agrega `.codex/` al `.gitignore`.

M-03 y las desviaciones D-01 y D-02 quedan aceptadas como están.

Nota de ejecución: el `programador` aplicó los cambios 1, 3 y 4 (ver "Ronda 3" en `resumen-programador.md`). No aplicó el 2 porque `AGENTS.md` es el archivo de instrucciones de los agentes y solo tenía la autorización transmitida por el orquestador. Como el humano pidió ese cambio directamente al orquestador, la línea de `AGENTS.md` la aplicó el orquestador, con el texto exacto que propuso el programador.

## Pendientes para DOCS-01 (encargo aparte, después de INFRA-01)
1. Corregir `ARCHITECTURE.md` §4 según C-01: el Compose de desarrollo solo lleva PostgreSQL, MinIO y LiveKit; `api` y `worker` corren en el anfitrión.
2. Corregir `ARCHITECTURE.md` §11 según C-02: en `dev` solo se crean `campus-privado` y `campus-publico`.
3. Corregir `ARCHITECTURE.md` §4 según C-03: separar el archivo de Compose de `dev` del de `prod`.
4. Documentar en `ARCHITECTURE.md` el riesgo de que MinIO comunitario ya no se distribuye por Docker Hub, y que el almacén de desarrollo es reemplazable por cualquier otro compatible con S3.
