# Revisión del Manager — INFRA-01: entorno de desarrollo local en `infra/` — final
Veredicto: APROBADO
Verificación propia: lint no aplica · test no aplica · build no aplica (todavía no existe ningún paquete). En su lugar, ejecuté por mi cuenta: V-02 verde · V-03 verde · V-07 verde con la salvedad arbitrada abajo · V-09 verde · V-10 verde · diff mecánico del Compose contra la referencia del plan: idéntico.

Fecha: 2026-09-21 · Carril: **sensible** (confirmado: toca `infra/`) · Flujo abreviado autorizado por el humano: sin Tester y sin revisión mía en modo plan. Ninguna de las dos ausencias es hallazgo.

## Lo que importa, en corto
1. **Se hizo lo planeado, solo lo planeado y todo lo planeado.** `infra/docker-compose.yml` es idéntico byte a byte al bloque normativo del plan (extraje el bloque de `plan.md` y lo comparé con `diff`: sin diferencias). Los otros tres archivos y la sección del README coinciden con el plan. El único archivo rastreado que cambió es `README.md`.
2. **El entorno arranca y queda sano.** Lo levanté yo: los tres servicios en `healthy` y `minio-init` en `Exited (0)` a los 5 s. Todos los puertos de Docker escuchan en `127.0.0.1`.
3. **Hay una trampa en esta máquina, no en el repositorio (M-01):** `127.0.0.1:5432`, que es lo que dice el README, aquí lo contesta un PostgreSQL ajeno al proyecto. La base del proyecto vive en el 5433.
4. No hay problemas que bloqueen. Quedan tres decisiones pequeñas que son del humano.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### M-01 — En esta máquina, `127.0.0.1:5432` no es la base del proyecto
Dónde: `README.md`, tabla de direcciones de la sección 2 (`PostgreSQL | 127.0.0.1:5432`); `infra/.env` local (desviación D-01).
Por qué importa: el README presenta el 5432 como un hecho, no como el valor por defecto de `POSTGRES_PORT`. En la máquina del humano ese puerto lo atiende otro PostgreSQL, que además escucha en `0.0.0.0` y `::`. Quien siga el README con un cliente, o copie un `DATABASE_URL` con 5432 cuando exista el backend, se conectará al servidor equivocado **sin ningún error de Docker**: en el mejor caso un fallo de autenticación difícil de entender; en el peor, migraciones contra una base que no es la del proyecto.
Qué se espera: que la tabla diga que el puerto es el valor de `POSTGRES_PORT` (5432 por defecto), y que el humano fije su puerto local definitivo. **No es retrabajo del Programador:** el texto es transcripción fiel del plan aprobado. Es un cambio de una línea; el humano decide si va ahora (carril trivial) o en DOCS-01.

### M-02 — `AGENTS.md` › Comandos ya no basta en un clon nuevo
Dónde: `AGENTS.md` línea 38 (`docker compose up -d`); riesgo R-09 del plan.
Por qué importa: en un clon nuevo ese comando falla hasta copiar `infra/.env.example` a `infra/.env`. El propio `AGENTS.md` dice que mantener esa sección al día es parte de cualquier cambio que la altere. El plan, aprobado por escrito, lo excluyó a propósito y lo dejó al humano; la mitigación existe (el mensaje "Falta ... Copia infra/.env.example a infra/.env" de DEC-05, que el Programador vio en V-01).
Qué se espera: una decisión del humano. Basta una línea de comentario. No lo cambia ningún agente sin que él lo pida.
Nota: **no repetí V-01**, porque exige que no exista `infra/.env` y no puedo borrarlo ni moverlo. Comprobé que el texto del mensaje está en las ocho interpolaciones del Compose.

### M-03 — La descarga anónima desde `quay.io` no está demostrada
Dónde: `resumen-programador.md`, "Etiquetas finales de imagen".
Por qué importa: lo que cuenta para cualquiera que clone el repositorio es la descarga sin sesión. El Programador lo declara con honestidad: no puede afirmar que Docker Desktop no tenga una sesión guardada, porque no revisó el archivo de credenciales (bien hecho). **Mi V-03 tampoco lo prueba:** las cuatro imágenes ya estaban en la caché local y mi `up -d` no contactó a ningún registro.
Qué se espera: que el humano lo compruebe si quiere cerrar la duda (ver "Para el humano"), o que acepte el riesgo. Es bajo: Docker Hub negó `minio/minio` desde esta misma máquina, lo que indica que al menos ahí no hay sesión con privilegios.

## Detalles menores
- `README.md` termina otra vez sin salto de línea final: se corrigió el que faltaba en el original y se reintrodujo al final de la sección nueva. El próximo que agregue algo verá de nuevo una "eliminación" fantasma.
- El README dice que los comandos "se ejecutan desde la raíz del repositorio"; la sección 2 entra a `infra` y solo la 3 lo recuerda. Las secciones 4 y 5 suponen que sigues ahí.
- `mc mb --ignore-existing` imprime "Bucket created successfully" aunque el bucket ya exista. Lo reproduje: en mi arranque el log lo dice y los buckets conservan su fecha original `19:49:55`. No es una recreación; puede confundir a quien lea el log. Sin acción.
- Comentarios sin acentos en `infra/.env.example` y en el `.sql`. El SQL es literal del plan, y ASCII puro en archivos de configuración es defendible en Windows. Sin acción.

## Desacuerdos arbitrados

### D-01 — `POSTGRES_PORT=5433` solo en el `infra/.env` local: **aceptada**
El remedio es exactamente el que el plan documenta para este error (DEC-06, R-08 y la sección 6 del README). El archivo es local, no versionado y lo crea este mismo encargo; el cambio es reversible sin perder datos; está declarado con la salida real del error. Que el número sea 5433 es irrelevante para el repositorio: `infra/.env.example` conserva 5432 (lo comprobé) y el Compose no cambió.

Sobre la consecuencia: el arranque con 5432 **no está verificado en esta máquina, ni por él ni por mí, y no se puede verificar** mientras el otro PostgreSQL ocupe el puerto. Lo acepto por equivalencia: el archivo versionado es idéntico a la referencia y la única diferencia es un número interpolado; el mecanismo de mapeo quedó ejercitado. Riesgo residual para el repositorio: nulo. Para esta máquina: el de M-01.

Nota de proceso, sin retrabajo: en carril sensible la secuencia ideal era diagnosticar, detenerse y preguntar el puerto. No causó daño y no lo convierto en hallazgo.

### D-02 — Comandos fuera de la lista autorizada: **no debió detenerse; aceptada con un límite**
- Los de solo lectura (`netsh ... show excludedportrange`, `Get-NetTCPConnection`, `Get-Process`, `grep -c`, `od`, `wc`, `tr`, `find`) están justificados. Los dos primeros los documenta el propio plan (README sección 6 y V-07). `Get-Process` es lo que le permitió atribuir la escucha del 5432 con evidencia en lugar de suponer.
- `sed -i` sobre `infra/.env` es **la única escritura fuera de la lista**, y la lista era cerrada ("y nada más"). La acepto porque el destino es el archivo no versionado que este encargo crea, porque la edición es el remedio que el plan documenta, y porque hacerlo sin imprimir el archivo respetó la instrucción que más pesa. **No sienta precedente:** sobre un archivo versionado, o sobre cualquier cosa fuera de `infra/.env`, lo correcto es detenerse.
- Para el Arquitecto, en planes futuros: una lista cerrada de comandos debe incluir una cláusula de diagnóstico de solo lectura y decir qué hacer ante un puerto ocupado. Así el Programador no tiene que elegir entre detenerse por una nimiedad y salirse de la lista.

### Salvedad de V-07 — **el criterio se cumple**
El propósito de V-07 es que ningún puerto publicado por este entorno quede abierto a la red. Su texto literal ("ninguna dirección local es `0.0.0.0` ni `::`") se escribió suponiendo que el 5432 sería de Docker. Lo reproduje:
- Mapeos de Compose: `127.0.0.1:5433`, `127.0.0.1:9000-9001`, `127.0.0.1:7880-7881` y `127.0.0.1:7882/udp`. Ningún mapeo usa el 5432 del anfitrión.
- Escuchas: 5433, 7880, 7881, 9000, 9001 y UDP 7882 en `127.0.0.1`, todas del mismo proceso (PID 12688). Las de `0.0.0.0:5432` y `[::]:5432` son de otro proceso (PID 8180).

Límite de mi evidencia: **no identifiqué por nombre el PID 8180**; me apoyo en que es un proceso distinto del que posee todos los puertos de Docker y en que ningún mapeo usa el 5432. Con eso basta para el criterio. Hizo bien el Programador en no declararlo verde sin más y dejarlo a juicio.

### Observación sobre V-05 — **correcta, y la evidencia es suficiente**
Tiene razón: reproduje que un bucket inexistente también responde `403`, así que el código HTTP solo no distingue privado de inexistente. Agregué la evidencia directa que faltaba, de solo lectura:
```
Access permission for `campus/campus-privado` is `private`
Access permission for `campus/campus-publico` is `download`
```
Con `mc ls` (existen los dos buckets y ninguno más), `private` y el `403` / `200`, el punto "política anónima en `campus-privado`" queda cerrado. La prueba a nivel de objeto (subir un archivo y pedirlo de forma anónima) corresponde al primer encargo de `archivos`, donde saldrá sola con las URLs prefirmadas.

### La "1 eliminación" del README — **comprobado: es solo el salto de línea final**
`git show HEAD:README.md` termina en el carácter `` ` `` sin `\n`. La línea quitada y la primera agregada son idénticas (59 caracteres, `- Reglas de trabajo para agentes: ...`). No se tocó contenido existente.

## Puntos de revisión que pedía el plan
| Punto | Resultado |
|---|---|
| Puerto publicado sin `127.0.0.1:` | Ninguno. Los seis mapeos lo llevan; comprobado en el archivo y en ejecución |
| Etiqueta flotante o sin verificar | Ninguna. Cuatro etiquetas explícitas, las cuatro reportadas como verificadas con `docker manifest inspect` |
| Imagen fuera de Docker Hub no autorizada | Ninguna. Solo `quay.io/minio/minio` y `quay.io/minio/mc`, ambas con prefijo. Autorizadas por escrito; no es hallazgo de la regla 11 |
| Valor que parezca real en `.env.example` | Ninguno. 13 variables, en el orden y con los valores del plan; las contraseñas se llaman `..._no_usar_en_prod`; `devkey` / `secret` son las llaves públicas del modo `--dev` de LiveKit. Los seis comentarios obligatorios están |
| `infra/.env` rastreado | No. Lo ignora `.gitignore:4`; no aparece en `git status`; `infra/.env.example` no está ignorado. No leí ni imprimí `infra/.env` |
| Archivos `.sh` o CRLF | Ninguno. Los cuatro archivos nuevos en `w/lf`; `README.md` en `i/lf w/lf` |
| Alcance de más | Ninguno. Sin `api`, `worker`, `caddy`, Redis ni Egress; sin `campus-respaldos`; sin variables extra ni scripts. `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `.gitattributes` y `docs/ARCHITECTURE*.md` intactos |
| README: `&&`, `curl` sin `.exe`, `localhost`, advertencia de `down -v` | Cero `&&`; los dos `curl` son `curl.exe`; `localhost` solo aparece en el aviso que el plan exige; la advertencia está destacada y cita la confirmación obligatoria de `AGENTS.md` |
| Política anónima en `campus-privado` | No hay: `private` (ver V-05) |
| Nombres de AWS | Ninguno en `infra/` ni en el README |

## Definición de terminado (`AGENTS.md`)
- Cumple el `RF-xx` / `RN-xx`: **no aplica** (sin RF). Cumple el encargo y el plan aprobado, incluida la Enmienda 1.
- Respeta las capas y pasa por el middleware: **no aplica** (no hay backend). El control equivalente, de red, está verificado en V-07.
- `lint`, `build` y `test` en verde: **no aplica** (no existen paquetes). Lo sustituyen V-01 a V-12; repetí las que me tocan.
- Pruebas de autorización si hay endpoint nuevo: **no aplica**.
- Migración de Prisma compatible hacia atrás: **no aplica**. Queda la nota de DEC-02 para el encargo de la primera migración.
- `infra/` y `.env.example` actualizados: **cumple.**
- Documentos actualizados si cambió una decisión, una tabla o un comando: **cumple en el README; abierto en `AGENTS.md`** (M-02), por exclusión expresa del plan.

## Reglas que no se rompen
- **Regla 9, secretos:** cumple. Ningún valor real en el repositorio; `infra/.env` ignorado.
- **Regla 10, infraestructura solo en `infra/`:** cumple. Nada configurado a mano fuera del repositorio; el único ajuste local es un valor de `.env`, que es justo para lo que existe DEC-06.
- **Regla 11, proveedores:** cumple. Sin AWS. `quay.io` quedó fuera de la regla por decisión escrita del humano.

## Lo que ejecuté y sus límites
Desde `infra/`: `docker version`, `docker compose version`, `docker compose config --quiet` (código 0, sin advertencias), `docker compose up -d` (código 0), `docker compose ps -a`, `docker compose logs minio-init`, las comprobaciones de puertos de V-07 y `docker compose down` **sin `-v`** (código 0). Git de solo lectura: `status`, `diff`, `show HEAD:README.md`, `check-ignore`, `ls-files --eol`.

Fuera de la lista literal que recibí, y lo declaro igual que se lo exijo al Programador: `docker volume ls`; `docker compose exec -T minio` con `mc alias set`, `mc ls` y `mc anonymous get`; tres `curl.exe` anónimos; y utilidades de texto de solo lectura (`awk`, `diff`, `od`, `tail`). Todo de solo lectura, salvo el alias de `mc`, que se escribe dentro del contenedor y desapareció con el `down`. No creé archivos temporales.

Dos errores míos, ya corregidos, para que nadie los herede: mi primer intento de comparar la línea "eliminada" del README usó un patrón que la excluía y su resultado no significaba nada (lo repetí bien); y mi bucle de espera de V-03 corrió los 60 s completos por un patrón mal ordenado, aunque el entorno ya estaba sano en la primera muestra.

**No repetí:** V-01 (ver M-02), V-04, V-06 ni el ciclo completo de V-08. Evidencia indirecta de V-08: tras mi propio `down` y `up`, los buckets conservan la fecha `19:49:55`, `minio-init` terminó en 0 con los buckets ya creados, y los dos volúmenes siguen ahí.

Estado en que dejé la máquina: entorno apagado, sin contenedores ni red; volúmenes `campus-dev-postgres-data` y `campus-dev-minio-data` conservados; `infra/.env` intacto.

## Documentos a actualizar
**Ya anotado en los pendientes de DOCS-01** (`aprobacion.md`): `ARCHITECTURE.md` §4 por C-01 y C-03; §11 por C-02; y el riesgo de distribución de MinIO con el almacén reemplazable.

**Nuevo, no está en esa lista:**
1. `AGENTS.md` › Comandos: el paso de copiar `infra/.env.example` a `infra/.env` (M-02, R-09).
2. `README.md`: la tabla de direcciones debe decir que el puerto de PostgreSQL es el valor de `POSTGRES_PORT` (M-01), y el archivo debe terminar en salto de línea.
3. Opcional: registrar en `ARCHITECTURE.md` los nombres de variables confirmados en P-03 (`DATABASE_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, y `STORAGE_ENDPOINT` como URL completa). Hoy solo constan en `infra/.env.example` y en `aprobacion.md`.

No cambié ninguno.

## Para el humano
1. **Commit.** Carril sensible: revisa el diff antes. Contenido sugerido: los cuatro archivos de `infra/`, `README.md` y la carpeta `docs/trabajo/INFRA-01-entorno-dev/` (se versiona, según `AGENTS.md`). **Deja fuera `.codex/`:** no es de este encargo y ya estaba sin rastrear. Estás en `main`; `AGENTS.md` pide rama, por ejemplo `chore/infra-entorno-dev`, y un mensaje como `chore(infra): agrega el entorno de desarrollo local con Docker Compose`.
2. **El puerto local (M-01, D-01).** Decide si te quedas con el 5433 o si liberas el 5432 deteniendo el otro PostgreSQL. Si te quedas con el 5433, recuérdalo cuando exista el backend. Aparte y fuera del proyecto: ese otro PostgreSQL escucha en todas las interfaces de tu máquina.
3. **`infra/.gitkeep`** ya es redundante. Borrarlo requiere tu confirmación; nadie lo tocó.
4. **`AGENTS.md`** (M-02): ¿agregas la línea de la copia de `.env.example` ahora o en DOCS-01?
5. **Descarga anónima** (M-03), si quieres cerrarla: comprueba que no tengas sesión iniciada en `quay.io` y ejecuta `docker manifest inspect quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`. Cerrar una sesión modifica tus credenciales de Docker: por eso es decisión tuya y no de un agente.
6. **Abrir DOCS-01** con sus cuatro pendientes más los tres nuevos de arriba.
7. **Arrastres para encargos futuros:** la primera migración de Prisma debe declarar `pg_trgm` y `unaccent` con `IF NOT EXISTS` (DEC-02); la ruta de audio y video de LiveKit se valida en el primer encargo de `envivo` (R-02); el CORS de MinIO, cuando exista el origen del frontend (R-05); y `prod` deberá usar la misma etiqueta de PostgreSQL, `17.11-trixie`.
