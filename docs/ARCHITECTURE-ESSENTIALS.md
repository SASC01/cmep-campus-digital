# ARCHITECTURE-ESSENTIALS

> Solo decisiones y reglas. Detalle y justificación en `ARCHITECTURE.md`; producto en `PRD.md`.
> Si algo aquí contradice a otro documento, **manda este** y se avisa al humano.

## Qué es
**CMEP Campus Digital.** Plataforma educativa web, una sola institución, 3 roles (`estudiante`, `maestro`, `admin`). **Fase experimental**, ~1,500 usuarios previstos; la arquitectura se diseña para 2,000 simultáneos. Sin integraciones con Google.

## Proveedores
- **Sin AWS.** Ni servicios ni librerías. La regla aplica a servicios y a librerías que nuestro código importa o ejecuta; las dependencias transitivas de herramientas de desarrollo (por ejemplo, del CLI de Prisma) se reportan, pero no bloquean.
- Aprobados: **DigitalOcean** (Droplet), **Cloudflare** (DNS, Pages, R2), **LiveKit Cloud**, **Resend** (correo). Nada más sin aprobación explícita del humano.
- Todo proveedor debe poder cambiarse por configuración. El núcleo (API, worker, PostgreSQL) corre igual en local, en el Droplet o en un servidor propio.
- **Correo solo con Resend, por API HTTPS, y solo desde `adapters/notifier`.** Nada de SMTP ni de otras librerías de correo. Fuera de `prod` jamás sale un correo real.

## Stack
- **Frontend:** React + Vite + TypeScript · Tailwind (tokens propios) · shadcn/ui reestilizado · lucide-react · sonner · React Router · TanStack Query · FullCalendar · LiveKit React → **Cloudflare Pages** (`campus.<dominio>`)
- **Backend:** Node.js LTS + Fastify + TypeScript · zod · monolito modular → **Droplet** con Docker Compose (`api.<dominio>`, tras el proxy de Cloudflare y Caddy)
- **Datos:** PostgreSQL 17 (`pg_trgm`, `unaccent`) · Prisma
- **Auth:** propia — argon2id + JWT (`jose`) + token de refresco rotativo en cookie `HttpOnly`
- **Cola y trabajos diferidos:** pg-boss
- **Archivos:** protocolo S3 con cliente `minio` → **R2** en `prod`, **MinIO** en `dev` (imágenes desde `quay.io`, sin mantenimiento; reemplazable por cualquier almacén S3 vía `STORAGE_*`)
- **Video:** LiveKit Cloud + Egress hacia R2 · `livekit-server --dev` en local
- **Operación:** pino · monitoreo de DigitalOcean · `pg_dump` cifrado hacia R2 · GitHub Actions construye y publica las imágenes
- **Pruebas:** Vitest. Backend: unitarias de `core/` y `config/`, e integración contra un PostgreSQL desechable por corrida con Testcontainers (imagen de `infra/`, `prisma migrate deploy` al iniciar); nunca `campus_dev`, una base compartida ni `prod`. Frontend: jsdom + Testing Library, sin API ni infra

## Capas del backend
```
handlers → middleware → core → (interfaces) ← adapters → librerías de infraestructura
```
- `core/`: lógica pura. Sin I/O ni librerías de infraestructura.
- `config/`: validación de las variables de entorno con zod y opciones del logger. No es `core/` ni `adapters/`.
- `adapters/`: **único** lugar que importa `@prisma/client`, `@prisma/adapter-pg`, `pg`, el cliente generado por Prisma (`adapters/db/generated/`, no versionado), `pg-boss`, `minio`, `resend`, `argon2`, `jose` o `livekit-server-sdk`. Módulos: `db`, `auth`, `storage`, `notifier`, `queue`, `scheduler`, `live`.
- `handlers/`: delgados. Un plugin de Fastify por dominio: `auth`, `usuarios`, `clases`, `tareas`, `calificaciones`, `archivos`, `notificaciones`, `calendario`, `envivo`, `publico`, `admin`.
- `workers/`: consumidores de la cola. `api` y `worker` son la misma imagen con distinto arranque.
- `shared/`: tipos y esquemas zod comunes. `infra/`: compose, Caddyfile, respaldos, despliegue.

## Autenticación
- Contraseñas con argon2id, mínimo 10 caracteres. Nunca en logs.
- Token de acceso: JWT de 15 min, solo `sub`, en memoria del navegador. **Nunca en `localStorage`.**
- Token de refresco: aleatorio, cookie `HttpOnly; Secure; SameSite=Strict`, guardado **solo como hash**, 30 días, rotación en cada uso, reutilización ⇒ se revocan todas las sesiones.
- Login: 5 intentos / 15 min por IP + correo. Mismo mensaje para usuario inexistente y contraseña incorrecta.
- El correo es el identificador de acceso y **no se verifica**: puede estar mal escrito.
- Registro público: solo estudiantes. Maestros: los crea el admin y reciben por correo un enlace de un solo uso (72 h) para establecer su contraseña. Decidido para AUTH-03: invitación masiva, y registro de maestros con un enlace que genera el admin (vigencia configurable, 7 días por defecto; revocable; guardado solo como hash; D-04). Admin: `npm run seed:admin`, cuenta única, sin endpoint.
- **Recuperación por correo:** enlace de un solo uso, 30 min, guardado solo como hash (`tokens_cuenta`); misma respuesta y mismo tiempo exista o no el correo; 3 solicitudes por hora; al usarlo se revocan las sesiones. La API encola siempre y el worker resuelve la cuenta (no hay recuperación para el admin); límite de 3 por hora por IP + correo en la API y por cuenta en el worker. El token del enlace se deriva de su id con una clave del servidor y viaja en el fragmento de la URL.
- **Respaldo por el admin:** contraseña temporal aleatoria mostrada **una sola vez**, guardada solo como hash, activa `debe_cambiar_contrasena` y revoca sesiones. Decidido para AUTH-03: ese cambio obligatorio pide solo la contraseña nueva y su confirmación, no la temporal; un futuro cambio voluntario desde el perfil sí pedirá la actual. El admin puede corregir un correo. La del admin: `npm run reset:admin`.

## Autorización (orden fijo, siempre en backend)
1. `authenticate` → 2. `withProfile` → 3. `withPasswordGate` → 4. `withAccess` → 5. `requireRole` → 6. `requireMembership` / `requireOwnership` → 7. handler

- Rol, restricción y banderas se leen de la base en **cada** petición; no van en el token.
- `debe_cambiar_contrasena`: solo pasa `POST /auth/cambiar-contrasena`.
- Alumno restringido: solo `GET /me` y `GET /me/estado-pago` (y `POST /auth/cambiar-contrasena` si tiene un cambio pendiente). Sin tokens de LiveKit, archivos ni grabaciones.
- Estado de pago ajeno: solo admin, o maestro dueño de una clase del alumno. Para estudiantes el campo **se omite**.

## Reglas de datos
- Prisma **solo** en `adapters/db`.
- **Sin N+1:** ninguna consulta dentro de un ciclo.
- Toda consulta filtra por columna indexada; toda lista se pagina (máx. 100).
- SQL crudo solo parametrizado. El único SQL con texto no literal que pasa por Prisma es el de pg-boss al encolar dentro de una transacción (`ejecutorSqlDe` en `adapters/db`, único `$queryRawUnsafe`): todos sus datos viajan como parámetros y el texto solo interpola el esquema, la tabla y el nombre de la cola (constantes del código).
- Escrituras compuestas en **transacción**, incluido el encolado del evento.
- Transacciones que crean, rotan o revocan sesiones en bloque, cambian la contraseña o escriben enlaces de un usuario existente: primero su fila de `usuarios` (`FOR SHARE` para crear o rotar su sesión; `FOR NO KEY UPDATE` para lo demás), en READ COMMITTED. Protocolo en `backend/src/adapters/README.md`.
- Promedios, gradebook, alumnos en riesgo y KPIs: **consultas agregadas**, no contadores guardados.
- Todo cambio de esquema es una migración de Prisma, **compatible hacia atrás** (frontend y backend se despliegan por separado).
- Fechas `timestamptz` en UTC; ISO 8601 en la API.
- Tablas y columnas en `snake_case` español; `camelCase` en TypeScript vía `@map`. Llaves UUID.
- Búsqueda de alumnos: `unaccent` + trigramas sobre `nombre_busqueda`. Frontend: mínimo 3 caracteres, espera de 300 ms.

### Tablas
`usuarios` · `sesiones` · `tokens_cuenta` · `clases` · `categorias` · `inscripciones` · `publicaciones` · `tareas` · `criterios_rubrica` · `entregas` · `puntajes_rubrica` · `archivos` · `comentarios` · `notificaciones` · `clases_en_vivo` · `anuncios_login` · `configuracion` — más el esquema `pgboss`, que no se toca.

Restricciones clave: `email` único · un solo `rol = 'admin'` (índice único parcial) · `entregas (tarea_id, alumno_id)` único · `notificaciones (usuario_id, evento_id)` único · `comentarios` y `archivos` con exactamente un contexto.

## Asíncrono y notificaciones
- La API guarda y encola **en la misma transacción**, y responde. **Nunca** crea notificaciones en la petición.
- Todo aviso y todo correo sale por `adapters/notifier`: `avisar(destinatarios, aviso)` y `correoDeCuenta(...)`. Nadie más escribe en `notificaciones` ni llama a Resend.
- **Aviso = notificación in-app siempre + correo solo si ese tipo está activado** en `configuracion` (todos apagados por defecto; los enciende el admin).
- **Correos de cuenta** (recuperación, invitación de maestro): siempre activos, solo por correo, con prioridad en la cola. La invitación masiva (AUTH-03) respeta los límites diarios de Resend.
- Un correo por destinatario, con límite de ritmo. Canal `registro` en `dev` y pruebas.
- Idempotencia por `eventId`. 3 reintentos con espera exponencial; después, cola de fallidos vigilada.
- Eventos: `PUBLICACION_CREADA` · `MATERIAL_CREADO` · `TAREA_CREADA` · `ENTREGA_REALIZADA` · `CALIFICACION_PUBLICADA` · `COMENTARIO_CREADO` · `RECORDATORIO_24H` · `CLASE_POR_COMENZAR` · `CORREO_DE_CUENTA` · `ENVIAR_CORREO` · `GRABACION_LISTA` · `LIMPIEZA_DIARIA` · `RESPALDO_DIARIO`
- Frontend: sondeo cada 60 s + al enfocar la pestaña. Sin WebSockets. Contador = `COUNT` sobre índice parcial de no leídas. Retención de 90 días.

## Trabajos diferidos
- Uno por tarea (`fecha_limite − 24 h`) y uno por clase en vivo (`fecha_inicio − 15 min`).
- Guardar `trabajo_id`. **Editar o borrar la fecha ⇒ cancelar y recrear, en la misma transacción.**

## Archivos
- Subida y descarga con URL prefirmada de 5 min. Los archivos **nunca** pasan por Node ni por el Droplet.
- Registro `pendiente` → `confirmado`; los pendientes de más de 24 h se borran.
- Buckets: `campus-privado` (`materiales/` · `entregas/` · `grabaciones/`) · `campus-publico` (`anuncios/`) · `campus-respaldos` (solo en `prod`; en `dev` MinIO crea únicamente los dos primeros).
- Tokens de mínimo privilegio: aplicación, Egress (solo escritura en `grabaciones/`), respaldos.
- Cambiar de almacén = cambiar `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.

## Clases en vivo
- LiveKit Cloud en `prod`; en `dev`, el LiveKit local de `infra/`. El paso a Cloud (encargo DEPLOY) es solo de configuración: URL, llaves, destino de grabaciones y URL pública del webhook. Llaves solo en `.env`. Todo detrás de `adapters/live`.
- Token emitido por la API tras toda la cadena de autorización.
- Alumnos en modo webinar. Chat por canales de datos de LiveKit.
- Cupo configurable según el plan → `SALA_LLENA` / `SIN_CUPO_DE_GRABACION`.
- Webhook `egress_ended` (firma verificada) → `GRABACION_LISTA`.
- Grabaciones: no se prueban de punta a punta en `dev`. Su código se prueba con dobles y el botón de grabar va detrás de un interruptor de configuración, desactivado en `dev` ("Grabación disponible solo en el servidor"). DEPLOY verifica una grabación real que llegue a R2 y aparezca en la lista del alumno (D-26).

## Reglas de negocio que tocan código
- Estado de pago: `Deudor` / `Al corriente`. Por defecto `Al corriente`. Manual, solo admin. Guarda fecha de cambio. **No bloquea nada por sí solo.**
- Restricción de acceso: independiente del estado de pago. Solo admin, solo estudiantes, efecto inmediato, reversible.
- Calificación general: categorías ponderadas; categorías sin tareas calificadas redistribuyen su peso; tareas sin calificar no cuentan.
- Alumno en riesgo: promedio < 70 % o ≥ 3 tareas vencidas sin entregar.
- Entrega tardía: se acepta y se marca `con_retraso`. Entregas admiten archivos y enlaces.

## Operación
- PostgreSQL **nunca** expuesto a internet. Puertos 80/443 del Droplet solo desde los rangos de Cloudflare.
- CORS de origen exacto `https://campus.<dominio>`, con credenciales.
- Secretos solo en `.env` del servidor. `.env.example` versionado, sin valores reales.
- Logs JSON con `requestId` y `userId`, sin contraseñas, tokens ni datos de pago.
- Respaldo diario cifrado fuera del servidor, con restauración probada. `GET /api/salud` para el monitoreo.
- Las imágenes se construyen en GitHub Actions, no en el servidor. Despliegue a `prod` siempre aprobado por un humano.
- Errores de API: `{ "error": { "codigo", "mensaje" } }`.

## Interfaz
- Español (México). Nombre: "CMEP Campus Digital"; forma corta "Campus Digital".
- Login: panel de anuncios a la izquierda, formulario a la derecha. Sin landing. Enlace "¿Olvidaste tu contraseña?" con recuperación por correo, y nota: "¿No te llega el correo? Acude a administración."
- Módulos de `features/`: `types.ts` · `data.ts` · `lib.ts` · `hooks.ts` · `components/` · `<nombre>-view.tsx`. Guía completa en `CLAUDE.md`.
- Solo modo claro. Colores y tamaños únicamente mediante tokens.
- Prohibido imitar la marca de Google Classroom. Prohibida la estética genérica de IA/SaaS.
- Densidad: admin tabular, estudiante ligero, maestro intermedio.
