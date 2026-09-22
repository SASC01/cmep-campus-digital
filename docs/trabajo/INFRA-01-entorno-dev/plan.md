# Plan — INFRA-01: entorno de desarrollo local en `infra/`
Estado: LISTO
Carril: sensible
Requisitos: ninguno del PRD (encargo de infraestructura, sin `RF-xx`). Reglas aplicables: `AGENTS.md` reglas 9 (secretos), 10 (infraestructura solo en `infra/`) y 11 (sin AWS ni proveedores no aprobados); `ARCHITECTURE-ESSENTIALS.md` secciones Stack, Archivos, Clases en vivo y Operación.
Enmiendas: Enmienda 1 (2026-09-21), aprobada por escrito por el humano. Ver la sección "Enmienda 1".

## Flujo autorizado para este encargo
El humano autorizó, **solo para INFRA-01**, un flujo abreviado:

1. `arquitecto` entrega este `plan.md`.
2. **El humano aprueba el plan de forma explícita y por escrito** (carril sensible: toca `infra/`).
3. `programador` implementa exactamente este plan.
4. `manager` (modo final) revisa el resultado y emite `revision.md`.
5. **El humano revisa el diff** y decide el commit. Ningún agente hace commit ni push.

No participa el `tester`: todavía no existe comportamiento de aplicación que atacar. Tampoco hay revisión del Manager en modo plan; la sustituye la aprobación escrita del humano. Esta excepción no modifica `AGENTS.md` ni aplica a otros encargos.

**Qué autoriza la aprobación de este plan** (y nada más): crear los archivos listados en "Archivos", modificar `README.md`, y ejecutar en la máquina local: `docker version`, `docker compose version`, `docker pull`, `docker manifest inspect`, `docker run --rm <imagen> --version`, `docker compose config | up -d | ps | logs | exec | stop | down` (sin `-v`), `docker volume ls`, `git status`, `git check-ignore`, `git ls-files`, y copiar `infra/.env.example` a `infra/.env`. **No autoriza** `docker compose down -v`, `docker volume rm`, borrar archivos, `git add`, `git commit` ni `git push`.

## Enmienda 1 — 2026-09-21
Estado del plan: sigue `LISTO`. Carril: sigue `sensible`.

**Motivo.** El programador se detuvo en el paso 2, como ordena el plan: los repositorios `minio/minio` y `minio/mc` de Docker Hub ya no se pueden descargar de forma anónima. `docker manifest inspect` responde `denied: requested access to the resource is denied` para la etiqueta propuesta, para la alternativa e incluso para `latest`. No es un problema de red ni de etiqueta mal escrita: en la misma sesión se resolvieron `postgres` y `livekit/livekit-server`. Evidencia completa en `resumen-programador.md`.

**Decisión del humano.** Aprobada por escrito y por el carril sensible; el texto literal está en `aprobacion.md`, sección "Enmienda 1 — aprobada el 2026-09-21". Opción 1: usar `quay.io` para las dos imágenes de MinIO, con las mismas etiquetas. Según el humano, `quay.io` es solo un registro de descarga para una herramienta de desarrollo local; no es un proveedor del proyecto y no entra en la regla 11 de `AGENTS.md`. Se mantiene la decisión de ESSENTIALS de MinIO en `dev`.

**Hechos verificados antes de esta enmienda.**
- El orquestador comprobó con `docker manifest inspect` (solo lectura, sin descargar) que existen, con variante `amd64`: `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`, `quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z`, `quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z` y `quay.io/minio/mc:RELEASE.2025-04-16T18-13-26Z`.
- El programador verificó `postgres:17.11-trixie` (parche más reciente de la serie 17, base `trixie`) y `livekit/livekit-server:v1.9.1`.
- **Sigue sin verificarse:** que las imágenes de `quay.io` arranquen y que la de `minio` traiga `mc` para el healthcheck. Lo cubren V-03 y V-05, con la alternativa de healthcheck ya prevista en "Servicio `minio`" y en el paso 10.

**Lo que cambia (lista exacta).**
1. Encabezado: se agrega la línea "Enmiendas" y esta sección.
2. "Imágenes y verificación de etiquetas": `minio` pasa a `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` (alternativa `quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z`) y `minio-init` pasa a `quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z` (alternativa `quay.io/minio/mc:RELEASE.2025-04-16T18-13-26Z`). Mismas etiquetas, otro registro. La tabla gana una columna de estado, que anota las dos etiquetas ya verificadas, y un párrafo sobre registros.
3. "Referencia normativa de `infra/docker-compose.yml`": las líneas `image:` de `minio` y `minio-init` llevan el prefijo `quay.io/`; la de `postgres` muestra la etiqueta ya verificada `postgres:17.11-trixie` en lugar de la línea base `17.6`.
4. V-11: el resultado esperado incluye el registro de cada imagen.
5. "Puntos de revisión para el Manager": un punto nuevo sobre registros.
6. R-01: actualizado con lo observado.
7. "Pasos de implementación": nota de reanudación y texto del paso 2.

**Lo que no cambia.** Servicios, comandos, puertos, volúmenes, healthchecks y sus alternativas, variables y valores de `infra/.env.example`, contenido de `01-extensiones.sql` y de `livekit.dev.yaml`, la sección planeada del README, el alcance, la lista de archivos, V-01 a V-10 y V-12, y el flujo autorizado. La lista de comandos autorizados tampoco cambia: `docker pull` y `docker manifest inspect` valen también para las dos imágenes de `quay.io`, y `docker login` sigue sin estar autorizado con ningún registro.

**Cómo continúa el encargo.** El programador retoma desde el paso 2 (ver "Pasos de implementación"); al terminar, `manager` en modo final; después el humano revisa el diff. Sin commit.

**Pendiente de documentación.** El riesgo de distribución de MinIO y el hecho de que el almacén de desarrollo es reemplazable por cualquier otro compatible con S3 quedaron anotados para el encargo DOCS-01 en `aprobacion.md` (sección "Pendientes para DOCS-01", punto 4). INFRA-01 no toca `docs/ARCHITECTURE*.md`.

## Preguntas bloqueantes
Ninguna. Las decisiones abiertas tienen un valor por defecto razonable y reversible (ver "Preguntas no bloqueantes"). El plan se puede aprobar tal cual; si el humano responde distinto a algún valor por defecto, el cambio es local y está indicado en cada pregunta.

## Preguntas no bloqueantes (con valor por defecto)
| # | Pregunta | Valor por defecto del plan | Si el humano elige lo contrario |
|---|---|---|---|
| P-01 | ¿Dónde vive el `.env.example`: en `infra/` o en la raíz? | **`infra/.env.example`** (se copia a `infra/.env`). Compose lo carga solo, sin banderas, y los comandos de `AGENTS.md` (`docker compose up -d` desde `/infra`) siguen valiendo tal cual | Mover el archivo a la raíz y agregar `--env-file ..\.env` a **todos** los comandos de Compose del README y de `AGENTS.md` |
| P-02 | `ARCHITECTURE.md` §11 dice "En `dev`, MinIO con los mismos buckets" (son tres, incluye `campus-respaldos`); el encargo pide dos. ¿Se crea también `campus-respaldos` en local? | **No.** Se sigue el encargo literal: `campus-privado` y `campus-publico`. Los respaldos son un asunto de `prod` | Agregar una línea `mc mb --ignore-existing campus/campus-respaldos` en `minio-init` |
| P-03 | Los documentos solo fijan `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` y `LIVEKIT_URL`. ¿Se confirman los nombres propuestos `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` y `DATABASE_URL`, y que `STORAGE_ENDPOINT` sea una URL completa (`http://127.0.0.1:9000`)? | **Sí.** `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` son los nombres estándar del SDK de LiveKit; `DATABASE_URL` es la convención de Prisma; la URL completa es el formato común a MinIO y a R2 | Renombrar en `infra/.env.example`. Ninguna de las tres la consume Compose, así que el `docker-compose.yml` no cambia |
| P-04 | En `dev`, ¿la aplicación usa las credenciales raíz de MinIO como `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`? | **Sí.** Una sola fuente de verdad y cero pasos extra. El mínimo privilegio de ESSENTIALS se refiere a los tokens de R2 en `prod` | Agregar a `minio-init` la creación de un usuario de aplicación con política limitada a los dos buckets, y dos variables nuevas para las credenciales raíz |
| P-05 | `ARCHITECTURE.md` §4 lista `api` y `worker` dentro del Compose de desarrollo y usa el mismo nombre de archivo (`infra/docker-compose.yml`) para `prod` y `dev`. ¿Se corrige el documento ahora? | **No en este encargo.** Este archivo es solo de desarrollo y solo con los tres servicios pedidos (coincide con `AGENTS.md`). Cuando exista el backend se decide si `api`/`worker` entran al Compose; para `prod` se propone `infra/docker-compose.prod.yml` | Abrir un encargo de documentación para alinear `ARCHITECTURE.md` §4 |

## Contradicciones entre documentos (reportadas, no bloquean)
- **C-01.** `ARCHITECTURE.md` §4: "Desarrollo: `api` · `worker` · `postgres` · `minio` · `livekit`". `AGENTS.md` (Comandos): `docker compose up -d` levanta "PostgreSQL, MinIO y LiveKit en modo dev" y el backend corre con `npm run dev`. El encargo del humano coincide con `AGENTS.md`. Se sigue el encargo (ver P-05).
- **C-02.** `ARCHITECTURE.md` §11: en `dev` "los mismos buckets" (tres). El encargo pide dos. Se sigue el encargo (ver P-02).
- **C-03.** `ARCHITECTURE.md` §4 nombra `infra/docker-compose.yml` para producción y desarrollo a la vez sin decir cómo se separan. Este encargo lo ocupa para desarrollo (ver P-05).

No hay contradicción en LiveKit: ESSENTIALS fija `livekit-server --dev` en local, y `ARCHITECTURE.md` §4 (Entornos) aclara que solo las **grabaciones** se prueban contra un proyecto de LiveKit Cloud de desarrollo.

## Suposiciones
- **S-01.** La máquina tiene Docker Desktop para Windows con backend WSL 2 y Compose v2 (`docker compose`, no `docker-compose`). El programador lo comprueba en el paso 1; si no es así, se detiene.
- **S-02.** El backend correrá en el anfitrión con `npm run dev` (`AGENTS.md`), así que las URLs del `.env` apuntan a `127.0.0.1` y no a nombres de servicio de Compose.
- **S-03.** PostgreSQL usa la codificación y la configuración regional por defecto de la imagen oficial (UTF8, `en_US.utf8`, zona UTC). Los documentos no piden otra cosa.
- **S-04.** En local no hay Egress, Redis ni webhooks de LiveKit: las grabaciones se prueban contra LiveKit Cloud (`ARCHITECTURE.md` §4).
- **S-05.** Solo los navegadores de la misma máquina necesitan llegar a LiveKit (todo queda en 127.0.0.1, como pide el encargo).
- **S-06.** No pude verificar etiquetas de imagen desde mi entorno (sin red ni Docker). Las etiquetas de este plan son propuestas; el programador las verifica con el procedimiento de la sección "Imágenes".

## Alcance
**Entra**
- `infra/docker-compose.yml` de desarrollo con `postgres`, `minio`, `minio-init` (efímero) y `livekit`.
- Extensiones `pg_trgm` y `unaccent` habilitadas al inicializar la base.
- Buckets `campus-privado` y `campus-publico` creados de forma idempotente.
- `infra/.env.example` con valores solo de desarrollo.
- Sección nueva en `README.md` para Windows con PowerShell 5.1.

**No entra**
- Servicios `api`, `worker` y `caddy`; Compose de `prod`; Caddyfile; scripts de respaldo; CI.
- Bucket `campus-respaldos`; Egress; restricción de CORS en MinIO; usuario de aplicación de mínimo privilegio en MinIO.
- Variables de auth, correo, CORS o frontend: los documentos no fijan sus nombres y este encargo no las necesita. Cada encargo futuro agrega las suyas al mismo `.env.example`.
- Scripts `.ps1` o `.sh` de ayuda (no se pidieron).
- Cambios en `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE*.md` y `.gitignore`.
- Borrar `infra/.gitkeep` (borrar archivos requiere confirmación; queda como limpieza opcional para el humano).
- Configuración de Testcontainers.

## Archivos
| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `infra/docker-compose.yml` | Proyecto `campus-dev` con los cuatro servicios y dos volúmenes con nombre |
| Crear | `infra/postgres/init/01-extensiones.sql` | Dos `CREATE EXTENSION IF NOT EXISTS` |
| Crear | `infra/livekit/livekit.dev.yaml` | Puertos de LiveKit para desarrollo (sin llaves) |
| Crear | `infra/.env.example` | Variables con valores de desarrollo |
| Modificar | `README.md` | Agregar al final la sección "Entorno de desarrollo local (Windows + PowerShell)" |
| Crear, **no versionado** | `infra/.env` | Copia local de `.env.example` para poder verificar. Ya lo ignora `.gitignore` |
| Sin cambios | `.gitignore` | Las reglas `.env`, `.env.*` y `!.env.example` no llevan `/`, así que aplican en cualquier carpeta: `infra/.env` queda ignorado e `infra/.env.example` versionado. Se comprueba en V-09 |
| Sin cambios | `.gitattributes` | Ya contiene `* text=auto eol=lf` |

No se crea ningún archivo `.sh`: es una decisión de diseño (ver DEC-03).

## Diseño

### Flujo de arranque
1. `docker compose up -d` desde `infra/`. Compose carga `infra/.env` para interpolar. Si falta una variable, falla con un mensaje que indica copiar `.env.example`.
2. `postgres`: con el volumen vacío, la imagen ejecuta `initdb` y después los archivos de `/docker-entrypoint-initdb.d` contra la base `POSTGRES_DB`; ahí se crean las dos extensiones. Luego reinicia y escucha por TCP. El healthcheck pasa a `healthy` solo entonces.
3. `minio` arranca y pasa a `healthy`.
4. `minio-init` espera a `minio` en estado `healthy`, crea los buckets, aplica la política del público y termina con código 0.
5. `livekit` arranca en modo dev y pasa a `healthy`.

Estado final esperado en `docker compose ps -a`: `postgres`, `minio` y `livekit` en `running (healthy)`; `minio-init` en `exited (0)`. `minio-init` es un contenedor efímero: no lleva healthcheck y su criterio de éxito es el código de salida 0.

### Imágenes y verificación de etiquetas
Reglas: nunca `latest` ni etiquetas flotantes (`17`, `17-trixie`) en el archivo final. Sin digests en este encargo (no se inventan). El programador reporta la etiqueta final de cada imagen y el comando con que la verificó.

Tabla actualizada por la Enmienda 1: cambia el registro de `minio` y `minio-init`, y se anota el estado de cada verificación al 2026-09-21.

| Servicio | Imagen y etiqueta propuesta | Procedimiento | Estado al 2026-09-21 |
|---|---|---|---|
| `postgres` | `postgres:17.<parche>-trixie`. Línea base original: `postgres:17.6-trixie`. Etiqueta resultante de la verificación: **`postgres:17.11-trixie`** | 1) `docker pull postgres:17-trixie`. 2) `docker run --rm postgres:17-trixie postgres --version` devuelve `17.N`. 3) Fijar `postgres:17.N-trixie` y confirmar con `docker manifest inspect postgres:17.N-trixie`. Si la variante `trixie` no existe para la serie 17, repetir con `bookworm` y anotarlo como desviación | **Verificada por el programador:** `17.11` es el parche más reciente de la serie 17 y la variante `trixie` existe. Al retomar, repetir solo `docker manifest inspect postgres:17.11-trixie`; si falla, aplicar el procedimiento completo |
| `minio` | `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` (Enmienda 1) | `docker manifest inspect <imagen:etiqueta>`. Si falla (la etiqueta no existe o el registro niega el acceso), probar en orden: `quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z`. Si tampoco, detenerse y reportar | **Pendiente.** El orquestador comprobó que el manifiesto existe en `quay.io` con variante `amd64`; el programador repite la verificación y la reporta |
| `minio-init` | `quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z` (Enmienda 1) | Igual. Alternativa en orden: `quay.io/minio/mc:RELEASE.2025-04-16T18-13-26Z`. Si tampoco, detenerse y reportar | **Pendiente**, igual que `minio` |
| `livekit` | `livekit/livekit-server:v1.9.1` | Igual. Alternativa en orden: `v1.9.0`. Si tampoco, detenerse y reportar | **Verificada por el programador.** Al retomar, repetir `docker manifest inspect livekit/livekit-server:v1.9.1` |

Registros (Enmienda 1): `postgres` y `livekit` se descargan de Docker Hub; `minio` y `minio-init`, de `quay.io`, y son las **únicas** imágenes fuera de Docker Hub. La descarga debe funcionar de forma anónima, que es la que tendrá cualquier persona que clone el repositorio: `docker login` no está entre los comandos autorizados y no se usa con ningún registro. Si `quay.io` negara el acceso, el programador se detiene y reporta; no busca otro registro ni otro almacén por su cuenta.

Por qué el sufijo de Debian en PostgreSQL: fija el sistema base de la imagen. Si cambia por debajo de un volumen existente, cambia la versión de las intercalaciones de glibc y PostgreSQL pide reindexar. `trixie` es la base por defecto actual de la imagen oficial. La variante Debian (no Alpine) evita las limitaciones de configuración regional de musl. `prod` deberá usar la misma etiqueta cuando exista su Compose.

Solo en PostgreSQL se busca el parche más reciente: ESSENTIALS fija la versión mayor 17 y los parches son seguros. MinIO y LiveKit son herramientas solo de desarrollo: se usa la etiqueta propuesta si existe.

### Servicio `postgres`
| Aspecto | Valor |
|---|---|
| Puerto | `127.0.0.1:${POSTGRES_PORT}:5432` |
| Volumen | `postgres-data` (nombre real `campus-dev-postgres-data`) en `/var/lib/postgresql/data` |
| Montaje | `./postgres/init` en `/docker-entrypoint-initdb.d`, solo lectura. Se monta la **carpeta**, no el archivo: si un archivo montado no existe, Docker crea una carpeta en su lugar y el error resultante confunde |
| Variables | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` |
| Healthcheck | `pg_isready -h 127.0.0.1 -U $${POSTGRES_USER} -d $${POSTGRES_DB}` · intervalo 5 s · tiempo límite 3 s · 12 reintentos · periodo inicial 20 s |

El `-h 127.0.0.1` es deliberado: durante la inicialización la imagen levanta un servidor temporal que solo escucha por socket Unix. Sin `-h`, `pg_isready` daría `healthy` antes de que corran los scripts de inicio. El `$$` hace que la variable se resuelva dentro del contenedor y no al interpolar Compose.

### Servicio `minio`
| Aspecto | Valor |
|---|---|
| Comando | `server /data --console-address ":9001"` |
| Puertos | `127.0.0.1:${MINIO_API_PORT}:9000` (API S3) · `127.0.0.1:${MINIO_CONSOLE_PORT}:9001` (consola web) |
| Volumen | `minio-data` (nombre real `campus-dev-minio-data`) en `/data` |
| Variables | `MINIO_ROOT_USER` ← `STORAGE_ACCESS_KEY` · `MINIO_ROOT_PASSWORD` ← `STORAGE_SECRET_KEY` (usuario de 3 caracteres o más; contraseña de 8 o más) |
| Healthcheck | `["CMD", "mc", "ready", "local"]` · intervalo 5 s · tiempo límite 3 s · 12 reintentos · periodo inicial 10 s. Es el healthcheck que documenta MinIO; la imagen incluye `mc`. Si la etiqueta fijada no lo trae, usar `["CMD", "curl", "-f", "http://127.0.0.1:9000/minio/health/live"]` y anotarlo como desviación |

### Servicio `minio-init` (efímero)
| Aspecto | Valor |
|---|---|
| Depende de | `minio` con `condition: service_healthy` |
| Variables | Las mismas `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |
| Puertos, volumen, healthcheck | Ninguno |
| Reinicio | `restart: "no"` |
| Comando | Shell en línea dentro del YAML (ver referencia). `set -eu`; `mc alias set`; `mc mb --ignore-existing` para cada bucket; `mc anonymous set download` en el público |

Idempotencia: Compose vuelve a ejecutar este contenedor en cada `up -d`. `mc mb --ignore-existing` y `mc anonymous set` dan el mismo resultado las veces que corran. Un servicio futuro que necesite los buckets usará `depends_on: minio-init: condition: service_completed_successfully`.

Políticas:
- `campus-privado`: **sin política anónima.** Un bucket recién creado es privado; el acceso será solo por URL prefirmada (`ARCHITECTURE.md` §11 y §16). No se fija de forma explícita para no depender de una palabra clave (`none` / `private`) que varía entre versiones de `mc`; se comprueba con una petición anónima que debe dar 403 (V-05).
- `campus-publico`: **lectura anónima** (`download`). La arquitectura sí lo pide: §11 "Lectura pública en `archivos.<dominio>`" y §16 "Buckets privados salvo `campus-publico`".

### Servicio `livekit`
| Aspecto | Valor |
|---|---|
| Comando | `--config /etc/livekit.yaml --dev --bind 0.0.0.0 --node-ip 127.0.0.1` |
| Puertos | `127.0.0.1:7880:7880` (HTTP y WebSocket de señalización) · `127.0.0.1:7881:7881` (WebRTC sobre TCP) · `127.0.0.1:7882:7882/udp` (WebRTC sobre UDP, un solo puerto multiplexado) |
| Volumen | Ninguno: en modo dev no guarda estado. El requisito de volúmenes con nombre aplica a `postgres` y `minio` |
| Montaje | `./livekit/livekit.dev.yaml` en `/etc/livekit.yaml`, solo lectura |
| Variables | Ninguna |
| Healthcheck | `["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:7880/"]` · intervalo 5 s · tiempo límite 3 s · 12 reintentos · periodo inicial 10 s. La imagen es Alpine e incluye `wget` de BusyBox. Si la etiqueta fijada no lo trae, detenerse y reportar |

- `--dev` activa las llaves de desarrollo fijas y públicas `devkey` / `secret`. Por eso el archivo de configuración **no lleva llaves** y el contenedor no recibe variables.
- `--bind 0.0.0.0` es necesario dentro del contenedor: en modo dev LiveKit escucha solo en su propio loopback y la publicación de puertos no llegaría. La exposición real la limita el `127.0.0.1:` del mapeo.
- `--node-ip 127.0.0.1` hace que LiveKit anuncie candidatos ICE en `127.0.0.1` y no en la IP interna del contenedor, que el navegador de Windows no alcanza.
- Rango UDP reducido al mínimo: un solo puerto (`rtc.udp_port: 7882`) en lugar del rango 50000–60000. `rtc.tcp_port: 7881` queda como respaldo si el UDP falla en Docker Desktop.
- **Los puertos de LiveKit no son configurables por `.env`:** LiveKit anuncia a los clientes el número de puerto de su configuración; si el puerto del anfitrión fuera distinto, la conexión de medios fallaría.

### Decisiones de diseño
- **DEC-01. Extensiones por script en `docker-entrypoint-initdb.d`.** Es el mecanismo estándar de la imagen y cumple "habilitadas al iniciar". **Limitación:** solo corre con el volumen vacío. Si el volumen ya existe, no se vuelve a ejecutar; el README indica cómo crear las extensiones a mano con el mismo SQL idempotente, sin borrar datos.
- **DEC-02. El script no sustituye a la migración.** No se instalan las extensiones en `template1` a propósito: la base sombra de `prisma migrate dev`, Testcontainers y `prod` no pasan por este script. La primera migración de Prisma deberá declarar `CREATE EXTENSION IF NOT EXISTS pg_trgm` y `unaccent`; si lo olvida, fallará en `dev` y no en `prod`. Ambos caminos son idempotentes y no chocan. Queda anotado para el encargo que cree la primera migración.
- **DEC-03. Ningún archivo `.sh`.** Un script de shell con finales de línea CRLF montado en un contenedor Linux falla (`bad interpreter`). `.gitattributes` normaliza a LF al confirmar, pero el archivo de la carpeta de trabajo en Windows puede seguir en CRLF. El shell de `minio-init` va en línea dentro del YAML (YAML normaliza los saltos de línea), y los archivos montados son `.sql` y `.yaml`, que toleran CRLF.
- **DEC-04. `infra/.env.example`** (P-01). Compose carga `.env` de la carpeta del proyecto sin banderas: los comandos quedan idénticos a los de `AGENTS.md`, sin `--env-file` en cada llamada. El `.gitignore` actual ya lo cubre.
- **DEC-05. Variables obligatorias con `${VAR:?mensaje}`**, sin valores por defecto dentro del Compose. Si falta `infra/.env`, el error es inmediato y explica qué hacer; no arranca nada con contraseñas vacías ni con valores ocultos duplicados en dos archivos.
- **DEC-06. Puertos del anfitrión configurables solo en `postgres` y `minio`.** En Windows es habitual tener ocupados 5432 o 9000. Editar un archivo versionado por un problema local es mala práctica; una variable lo resuelve.
- **DEC-07. `127.0.0.1` en todas las URLs, nunca `localhost`.** Los puertos se publican solo en IPv4; en Windows `localhost` puede resolver primero a `::1` y fallar o tardar.
- **DEC-08. Nombre de proyecto fijo `name: campus-dev` y volúmenes con `name:` explícito.** Los nombres de contenedores y volúmenes no dependen del nombre de la carpeta.
- **DEC-09. Sin política de reinicio** en los servicios. El entorno solo corre cuando alguien lo levanta; no ocupa puertos al abrir Docker Desktop.

### Referencia normativa de `infra/docker-compose.yml`
El programador transcribe esta estructura. Solo puede cambiar las etiquetas de imagen según "Imágenes" y los healthchecks alternativos ya indicados. Sin clave `version:` (obsoleta en Compose v2).

Actualizada por la Enmienda 1: las líneas `image:` de `minio` y `minio-init` llevan el prefijo `quay.io/`, y la de `postgres` muestra la etiqueta ya verificada `postgres:17.11-trixie`.

```yaml
name: campus-dev

services:
  postgres:
    image: postgres:17.11-trixie
    environment:
      POSTGRES_USER: ${POSTGRES_USER:?Falta POSTGRES_USER. Copia infra/.env.example a infra/.env}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Falta POSTGRES_PASSWORD. Copia infra/.env.example a infra/.env}
      POSTGRES_DB: ${POSTGRES_DB:?Falta POSTGRES_DB. Copia infra/.env.example a infra/.env}
    ports:
      - "127.0.0.1:${POSTGRES_PORT:?Falta POSTGRES_PORT. Copia infra/.env.example a infra/.env}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 12
      start_period: 20s

  minio:
    image: quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z
    command: ["server", "/data", "--console-address", ":9001"]
    environment:
      MINIO_ROOT_USER: ${STORAGE_ACCESS_KEY:?Falta STORAGE_ACCESS_KEY. Copia infra/.env.example a infra/.env}
      MINIO_ROOT_PASSWORD: ${STORAGE_SECRET_KEY:?Falta STORAGE_SECRET_KEY. Copia infra/.env.example a infra/.env}
    ports:
      - "127.0.0.1:${MINIO_API_PORT:?Falta MINIO_API_PORT. Copia infra/.env.example a infra/.env}:9000"
      - "127.0.0.1:${MINIO_CONSOLE_PORT:?Falta MINIO_CONSOLE_PORT. Copia infra/.env.example a infra/.env}:9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 3s
      retries: 12
      start_period: 10s

  minio-init:
    image: quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z
    depends_on:
      minio:
        condition: service_healthy
    environment:
      MINIO_ROOT_USER: ${STORAGE_ACCESS_KEY:?Falta STORAGE_ACCESS_KEY. Copia infra/.env.example a infra/.env}
      MINIO_ROOT_PASSWORD: ${STORAGE_SECRET_KEY:?Falta STORAGE_SECRET_KEY. Copia infra/.env.example a infra/.env}
    restart: "no"
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        set -eu
        mc alias set campus http://minio:9000 "$$MINIO_ROOT_USER" "$$MINIO_ROOT_PASSWORD"
        mc mb --ignore-existing campus/campus-privado
        mc mb --ignore-existing campus/campus-publico
        mc anonymous set download campus/campus-publico

  livekit:
    image: livekit/livekit-server:v1.9.1
    command: ["--config", "/etc/livekit.yaml", "--dev", "--bind", "0.0.0.0", "--node-ip", "127.0.0.1"]
    ports:
      - "127.0.0.1:7880:7880"
      - "127.0.0.1:7881:7881"
      - "127.0.0.1:7882:7882/udp"
    volumes:
      - ./livekit/livekit.dev.yaml:/etc/livekit.yaml:ro
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:7880/"]
      interval: 5s
      timeout: 3s
      retries: 12
      start_period: 10s

volumes:
  postgres-data:
    name: campus-dev-postgres-data
  minio-data:
    name: campus-dev-minio-data
```

### Contenido de `infra/postgres/init/01-extensiones.sql`
```sql
-- Solo corre cuando el volumen de datos esta vacio (primer arranque).
-- No sustituye a la migracion de Prisma, que debe declarar las mismas extensiones.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### Contenido de `infra/livekit/livekit.dev.yaml`
```yaml
# LiveKit solo para desarrollo local. En prod se usa LiveKit Cloud.
# Sin llaves: el modo --dev usa devkey / secret.
port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: false
```

### Contenido de `infra/.env.example`
| Variable | Valor de desarrollo | La consume | Origen del nombre |
|---|---|---|---|
| `POSTGRES_USER` | `campus` | Compose | Nombre propio de la imagen oficial |
| `POSTGRES_PASSWORD` | `dev_postgres_no_usar_en_prod` | Compose | Imagen oficial |
| `POSTGRES_DB` | `campus_dev` | Compose | Imagen oficial |
| `POSTGRES_PORT` | `5432` | Compose | Propuesto |
| `DATABASE_URL` | `postgresql://campus:dev_postgres_no_usar_en_prod@127.0.0.1:5432/campus_dev?schema=public` | Backend futuro (Prisma) | Convención de Prisma. **A confirmar (P-03)** |
| `STORAGE_ENDPOINT` | `http://127.0.0.1:9000` | Backend futuro | Definido en ESSENTIALS. Formato de URL completa **a confirmar (P-03)** |
| `STORAGE_ACCESS_KEY` | `campusdev` | Compose (usuario raíz de MinIO) y backend futuro | Definido en ESSENTIALS |
| `STORAGE_SECRET_KEY` | `dev_minio_no_usar_en_prod` | Compose (contraseña raíz de MinIO) y backend futuro | Definido en ESSENTIALS |
| `MINIO_API_PORT` | `9000` | Compose | Propuesto |
| `MINIO_CONSOLE_PORT` | `9001` | Compose | Propuesto |
| `LIVEKIT_URL` | `ws://127.0.0.1:7880` | Backend y frontend futuros | Definido en `ARCHITECTURE.md` §12 |
| `LIVEKIT_API_KEY` | `devkey` | Backend futuro | Estándar del SDK de LiveKit. **A confirmar (P-03)** |
| `LIVEKIT_API_SECRET` | `secret` | Backend futuro | Estándar del SDK de LiveKit. **A confirmar (P-03)** |

Las contraseñas solo usan letras, dígitos y guion bajo para que `DATABASE_URL` no necesite codificación.

Comentarios obligatorios dentro del archivo:
1. Encabezado: es para desarrollo local; se copia a `infra/.env`; los valores **no son secretos y no deben usarse en `prod`**.
2. Usar `127.0.0.1` y no `localhost`.
3. `DATABASE_URL` debe coincidir con `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` y `POSTGRES_DB`; `STORAGE_ENDPOINT` debe coincidir con `MINIO_API_PORT`.
4. Las credenciales de PostgreSQL se graban al crear el volumen: cambiarlas después no tiene efecto sobre un volumen existente.
5. `devkey` / `secret` las fija el modo `--dev` de LiveKit: cambiarlas aquí no cambia el servidor. Para probar grabaciones se sustituyen, solo en el `.env` local, por las llaves de un proyecto de LiveKit Cloud de desarrollo.
6. Los puertos de LiveKit (7880, 7881 y 7882/udp) son fijos.

Ninguna variable lleva prefijo ni nombre de AWS.

## Cambios por capa
### shared/
No aplica.
### backend/core/
No aplica.
### backend/adapters/
No aplica.
### backend/handlers/
No aplica.
### backend/workers/
No aplica.
### backend/prisma/
No aplica. Nota para el encargo de la primera migración: declarar ambas extensiones con `IF NOT EXISTS` (DEC-02).
### infra/ y .env.example
Todo el encargo; ver "Archivos" y "Diseño".
### frontend/features/<modulo>/
No aplica.

### README.md — sección nueva al final
Título: `## Entorno de desarrollo local (Windows + PowerShell)`. Textos en español de México, tuteo, sin emojis. Comandos para Windows PowerShell 5.1: **sin `&&`**, y `curl.exe` en lugar de `curl` (en 5.1 `curl` es un alias de `Invoke-WebRequest`).

1. **Requisitos.** Docker Desktop con backend WSL 2, abierto y en ejecución. Comprobación: `docker version` y `docker compose version`.
2. **Levantar.**
   ```powershell
   Set-Location infra
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   docker compose up -d
   docker compose ps -a
   ```
   Resultado esperado: `postgres`, `minio` y `livekit` en `running (healthy)`; `minio-init` en `exited (0)`, que es lo correcto porque solo crea los buckets y termina. Tabla de direcciones: PostgreSQL `127.0.0.1:5432`, API de MinIO `http://127.0.0.1:9000`, consola de MinIO `http://127.0.0.1:9001` (usuario y contraseña: `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY`), LiveKit `ws://127.0.0.1:7880`. Aviso: usa `127.0.0.1`, no `localhost`.
3. **Revisar.**
   ```powershell
   docker compose ps -a
   docker compose logs --tail 50 postgres
   docker compose logs minio-init
   docker compose logs -f livekit
   docker compose exec postgres psql -U campus -d campus_dev -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
   curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:9000/minio/health/live
   curl.exe -s http://127.0.0.1:7880/
   ```
   Explicar: `-f` sigue los logs y se sale con Ctrl+C; la consulta debe listar `pg_trgm` y `unaccent`; MinIO responde `200`; LiveKit responde `OK`; los buckets se ven en la consola de MinIO.
4. **Apagar.**
   ```powershell
   docker compose stop
   docker compose down
   ```
   Explicar: `stop` detiene y conserva los contenedores; `down` elimina contenedores y red. **En ambos casos los datos se conservan** en los volúmenes `campus-dev-postgres-data` y `campus-dev-minio-data`.
5. **Borrar los datos locales (requiere confirmación).** Advertencia destacada: `docker compose down -v` **borra la base de datos y los archivos locales sin forma de recuperarlos**. Según `AGENTS.md`, ningún agente lo ejecuta sin confirmación explícita del humano, y nunca contra algo que no sea el entorno local. Casos en que hace falta: cambiar las credenciales de PostgreSQL o repetir la inicialización desde cero. Alternativa sin borrar nada cuando solo faltan las extensiones:
   ```powershell
   docker compose exec postgres psql -U campus -d campus_dev -c "CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;"
   ```
6. **Problemas frecuentes en Windows.**
   - Puerto ocupado (`port is already allocated` o `access permissions`): diagnosticar con `Get-NetTCPConnection -LocalPort 5432 -State Listen` y `netsh interface ipv4 show excludedportrange protocol=tcp`; cambiar `POSTGRES_PORT`, `MINIO_API_PORT` o `MINIO_CONSOLE_PORT` en `infra/.env` y ajustar `DATABASE_URL` o `STORAGE_ENDPOINT`. Los puertos de LiveKit no se cambian.
   - Error de variable faltante: no existe `infra/.env`; repetir el paso de copia.
   - Docker Desktop cerrado: `error during connect`; abrirlo y esperar.
   - Las extensiones no aparecen: el volumen ya existía; usar la alternativa del punto 5.

## Acceso a datos
No aplica: no hay consultas de aplicación. La única sentencia SQL es el script de extensiones.

## Autorización
No aplica: no hay endpoints. El control equivalente en este encargo es de red: **todos los puertos publicados se ligan a `127.0.0.1`**, ninguno a `0.0.0.0` ni a `[::]`. `minio-init` no publica puertos.

## Pruebas requeridas
No hay pruebas unitarias ni de autorización (no hay `core/` ni endpoints). Las sustituyen estas verificaciones, que el programador **ejecuta y reporta una por una** con su resultado real. Las que no pueda ejecutar las reporta como no verificadas.

Nota de ejecución: los comandos están escritos para PowerShell. Como el agente no tiene terminal interactiva, a `docker compose exec` se le agrega `-T`. Si se ejecuta desde Git Bash, anteponer `MSYS_NO_PATHCONV=1` a los comandos con rutas de contenedor, porque Git Bash las reescribe.

| # | Verificación | Resultado esperado |
|---|---|---|
| V-01 | **Antes** de crear `infra/.env`: `docker compose config --quiet` desde `infra/` | Falla con código distinto de 0 y el mensaje "Falta ... Copia infra/.env.example a infra/.env" |
| V-02 | Con `infra/.env` creado: `docker compose config --quiet` (con `--quiet` para no imprimir valores) | Código 0, sin advertencias |
| V-03 | `docker compose up -d` y luego `docker compose ps -a` (esperar hasta 60 s) | `postgres`, `minio`, `livekit` en `healthy`; `minio-init` en `exited (0)` |
| V-04 | `docker compose exec -T postgres psql -U campus -d campus_dev -c "SELECT extname FROM pg_extension ORDER BY extname;"` y `-c "SELECT version(), unaccent(chr(233)) AS sin_acento, similarity('campus','campos') > 0 AS trigramas;"` | Aparecen `pg_trgm` y `unaccent`; versión 17.x; `sin_acento = e`; `trigramas = t` |
| V-05 | Buckets: `docker compose exec -T minio sh -c 'mc alias set campus http://127.0.0.1:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD; mc ls campus'` (comillas simples para que PowerShell no expanda `$`). Acceso anónimo: `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:9000/campus-privado/` y lo mismo con `campus-publico` | Se listan los dos buckets y ninguno más; privado responde `403`; público responde `200` |
| V-06 | `curl.exe -s http://127.0.0.1:7880/` y `docker compose logs livekit` | Responde `OK`; el log muestra modo de desarrollo y los puertos 7880, 7881 y 7882. Copiar al reporte las líneas relevantes |
| V-07 | `docker compose ps --format "table {{.Service}}\t{{.Ports}}"`, `Get-NetTCPConnection -State Listen -LocalPort 5432,9000,9001,7880,7881 \| Select-Object LocalAddress,LocalPort` y `Get-NetUDPEndpoint -LocalPort 7882 \| Select-Object LocalAddress,LocalPort` | Todos los mapeos empiezan con `127.0.0.1:`. Ninguna dirección local es `0.0.0.0` ni `::` |
| V-08 | Persistencia e idempotencia: `docker compose down` (sin `-v`), `docker compose up -d`, repetir V-03, V-04 y V-05; `docker compose logs minio-init`; `docker volume ls --filter name=campus-dev` | Todo sano otra vez; `minio-init` termina en 0 sin errores aunque los buckets ya existan; existen exactamente los dos volúmenes con nombre |
| V-09 | `git check-ignore -v infra/.env`, `git check-ignore infra/.env.example`, `git status --short` | El primero muestra la regla que lo ignora; el segundo no imprime nada; `infra/.env` no aparece en el estado |
| V-10 | `git ls-files --eol --others --exclude-standard infra` | Los archivos nuevos muestran `w/lf` |
| V-11 | `Select-String -Path infra\docker-compose.yml -Pattern "image:"` | Cuatro imágenes con versión explícita; ninguna `latest` ni flotante. Por la Enmienda 1: `minio` y `minio-init` empiezan con `quay.io/minio/`; `postgres` y `livekit` no llevan prefijo de registro (Docker Hub) |
| V-12 | Revisión manual de `infra/.env.example` | Solo las 13 variables de este plan, con los valores de este plan; ningún valor real |

Si hiciera falta repetir la inicialización desde cero, el programador **no ejecuta `docker compose down -v`**: se detiene y pide confirmación.

Al terminar, el programador deja el entorno apagado con `docker compose down` (sin `-v`) y conserva `infra/.env`, que no se versiona.

## Puntos de ataque para el Tester
No aplica: el flujo autorizado no incluye Tester. En su lugar, **puntos de revisión para el Manager (modo final)**. No hay `lint`, `test` ni `build` que ejecutar porque aún no existen paquetes; el Manager repite por su cuenta V-02, V-03, V-07 y V-09.
- Algún puerto publicado sin el prefijo `127.0.0.1:`.
- Alguna imagen con etiqueta flotante, o etiquetas finales que el programador no reportó como verificadas.
- (Enmienda 1) Alguna imagen de un registro distinto de Docker Hub que no sea una de las dos de MinIO autorizadas en `quay.io` (`quay.io/minio/minio` y `quay.io/minio/mc`), o alguna de esas dos todavía sin el prefijo `quay.io/`. El uso de `quay.io` para esas dos imágenes **no** es un hallazgo de la regla 11 de `AGENTS.md`: lo aprobó el humano por escrito (`aprobacion.md`, Enmienda 1).
- Algún valor del `.env.example` que parezca real, o un `infra/.env` rastreado por git.
- Algún archivo `.sh`, o archivos nuevos con CRLF.
- Alcance de más: servicios `api`, `worker`, `caddy`, Redis o Egress; bucket `campus-respaldos` sin que el humano respondiera P-02; variables no listadas aquí; scripts de ayuda; cambios en `AGENTS.md`, `.gitignore` o `docs/`.
- README: algún `&&`, `curl` sin `.exe`, `localhost` en lugar de `127.0.0.1`, o que falte la advertencia sobre `docker compose down -v` y su confirmación obligatoria.
- Política anónima presente en `campus-privado`.
- Cualquier nombre de variable, librería o servicio de AWS.

## Riesgos y desacuerdos
- **R-01. Las imágenes comunitarias de MinIO ya no se descargan de Docker Hub y no tienen mantenimiento (actualizado por la Enmienda 1).** El plan original preveía que MinIO había dejado de publicar imágenes nuevas de la edición comunitaria y que el proyecto había quedado en mantenimiento. Lo observado el 2026-09-21 va más allá: los repositorios `minio/minio` y `minio/mc` de Docker Hub niegan la descarga anónima incluso de las etiquetas existentes y de `latest` (evidencia en `resumen-programador.md`). Por decisión escrita del humano (`aprobacion.md`, Enmienda 1) se usan las mismas etiquetas desde `quay.io/minio/minio` y `quay.io/minio/mc`. Siguen siendo imágenes sin mantenimiento: no recibirán parches. No propongo cambiar la decisión de ESSENTIALS (MinIO en `dev`, D-09): el riesgo es bajo porque es solo local, ligado a `127.0.0.1` y con datos ficticios. `quay.io` solo interviene al descargar, sin cuenta ni credenciales; con las imágenes ya en la caché local de Docker, el entorno no vuelve a contactarlo. Si `quay.io` dejara de servir estas imágenes, el almacén de `dev` es reemplazable por cualquier otro compatible con S3, porque la aplicación solo habla el protocolo S3 detrás de `adapters/storage`; esa decisión es del humano, y mientras tanto el programador se detiene y reporta.
- **R-02. La ruta de medios de LiveKit no se puede validar en este encargo.** Sin backend ni frontend no hay cliente que emita un token y se conecte. Aquí solo se comprueba que el servidor está sano y que los puertos están publicados. `--node-ip 127.0.0.1` es la configuración habitual para Docker Desktop, pero la conexión real de audio y video se valida en el primer encargo de `envivo`. Si el UDP no pasa por Docker Desktop (cortafuegos, VPN), ICE debe caer al TCP 7881.
- **R-03. El script de extensiones solo corre con el volumen vacío** (DEC-01), y no cubre la base sombra de Prisma, Testcontainers ni `prod` (DEC-02). Mitigación: la primera migración declara las extensiones.
- **R-04. `mc anonymous set download` también permite listar el bucket de forma anónima**, y R2 no lo permite en `prod`. En `dev` es inocuo; la aplicación no debe depender de listar `campus-publico`. Alternativa si el humano quiere paridad estricta: una política JSON con solo `s3:GetObject`, a costa de un archivo más.
- **R-05. MinIO acepta cualquier origen por CORS por defecto**, mientras que en `prod` el bucket privado solo admitirá `https://campus.<dominio>`. Cuando exista el frontend convendrá fijar `MINIO_API_CORS_ALLOW_ORIGIN` al origen de desarrollo. Fuera de alcance hoy porque ese origen aún no está definido.
- **R-06. Credenciales raíz de MinIO usadas por la aplicación en `dev`** (P-04): puede ocultar errores de permisos que sí aparecerían con el token limitado de R2.
- **R-07. Si `api` entrara algún día al Compose**, `STORAGE_ENDPOINT` tendría que ser alcanzable a la vez desde el contenedor y desde el navegador, porque las URLs prefirmadas se firman con el host. Hoy no aplica (S-02).
- **R-08. Particularidades de Windows y Docker Desktop.**
  - Finales de línea CRLF: mitigado por diseño (DEC-03) y comprobado en V-10.
  - Puertos ocupados o reservados por Hyper-V (rangos excluidos): diagnóstico y solución en el README; puertos configurables en `postgres` y `minio`.
  - `localhost` frente a `127.0.0.1` (DEC-07).
  - PowerShell 5.1: sin `&&`; `curl` es un alias; las comillas dobles expanden `$`, por eso V-05 usa comillas simples.
  - Git Bash reescribe rutas como `/data`: usar PowerShell o `MSYS_NO_PATHCONV=1`.
  - Montar un archivo inexistente crea una carpeta con ese nombre: por eso PostgreSQL monta la carpeta; el archivo de LiveKit está versionado y siempre existe.
  - El cortafuegos de Windows puede pedir permiso para Docker Desktop: al estar todo en `127.0.0.1` no se expone nada a la red.
  - Una variable definida en la sesión de PowerShell tiene prioridad sobre `infra/.env` al interpolar.
- **R-09. `AGENTS.md` no menciona el paso de copiar `.env.example`.** Sus comandos siguen siendo válidos y el mensaje de error de DEC-05 guía a quien lo omita. Agregar una línea de comentario en su sección "Comandos" es decisión del humano; este encargo no toca `AGENTS.md`.
- **Desacuerdos con ESSENTIALS:** ninguno.

## Pasos de implementación
**Reanudación (Enmienda 1).** El paso 1 ya se completó y el paso 2 quedó a medias (resultados en `resumen-programador.md`); no se creó ningún archivo del plan. El programador **retoma desde el paso 2** y sigue en orden hasta el 16.

1. Comprobar requisitos: `docker version` y `docker compose version`. Si Docker no responde o Compose no es v2, detenerse y reportar. *(Completado el 2026-09-21: Docker 28.5.1 y Compose v2.40.0.)*
2. Verificar y fijar las cuatro etiquetas con el procedimiento de "Imágenes". Anotar la etiqueta final y el comando de verificación de cada una. **Al retomar:** verificar con `docker manifest inspect` solo las dos imágenes pendientes, `quay.io/minio/minio` y `quay.io/minio/mc` (la propuesta y, si falla, la alternativa), y repetir el `docker manifest inspect` de las dos ya verificadas, `postgres:17.11-trixie` y `livekit/livekit-server:v1.9.1`. Si la propuesta y la alternativa de una imagen de MinIO fallan en `quay.io`, detenerse y reportar.
3. Crear `infra/postgres/init/01-extensiones.sql` con el contenido indicado, con finales de línea LF.
4. Crear `infra/livekit/livekit.dev.yaml` con el contenido indicado.
5. Crear `infra/.env.example` con las 13 variables, en el orden de la tabla, agrupadas por servicio y con los seis comentarios obligatorios.
6. Crear `infra/docker-compose.yml` según la referencia normativa, con las etiquetas del paso 2.
7. Ejecutar V-01 (todavía sin `infra/.env`).
8. Crear `infra/.env` solo si no existe: `if (-not (Test-Path .env)) { Copy-Item .env.example .env }`. No imprimir su contenido.
9. Ejecutar V-02.
10. Ejecutar `docker compose up -d` y V-03. Si un healthcheck falla porque la imagen no trae `mc` o `wget`, aplicar solo la alternativa prevista en el diseño; si no hay alternativa prevista, detenerse y reportar.
11. Ejecutar V-04, V-05, V-06 y V-07.
12. Ejecutar V-08.
13. Agregar la sección al final de `README.md` según el esquema, sin tocar el contenido existente.
14. Ejecutar V-09, V-10, V-11 y V-12.
15. Apagar con `docker compose down` (sin `-v`).
16. Entregar el resumen con el formato del Programador y agregar: etiquetas finales de imagen, resultado de V-01 a V-12 una por una, desviaciones, y lo que no se pudo verificar.
