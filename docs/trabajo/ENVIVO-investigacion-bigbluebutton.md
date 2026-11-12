# ENVIVO — Investigación: clases en vivo con BigBlueButton

**CMEP Campus Digital · 10 de noviembre de 2026 · Investigación y propuesta, sin implementación.**

**Estado: PROPUESTA, pendiente de la confirmación del cliente.** Este documento no cambia ninguna decisión vigente: `PRD.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIALS.md`, `ESTADO.md`, `CLAUDE.md` y `AGENTS.md` siguen documentando LiveKit hasta que el dueño confirme. La sección 10 lista qué cambia en cada uno y trae el mensaje para arrancar ese cambio.

**Actualización del 2026-11-10:** se agregó Aulas en Vivo (AQPhost) como proveedor candidato, con precios más bajos que la primera referencia y descarga de grabaciones en MP4 [F7]. La propuesta no cambia.

**Actualización del 2026-11-11:** el cliente aprobó BigBlueButton. Se agregó la sección 4.7 con un requisito nuevo: clases vinculadas (una en vivo y una asíncrona de la misma materia) que comparten grabaciones y recursos de aprendizaje, sin borrado automático.

**Actualización del 2026-11-12 (DOCS-05):** la decisión ya está en los documentos vivos (`PRD.md` §4.7, `ARCHITECTURE.md` §12 y D-33, ESSENTIALS "Clases en vivo"). La línea "Estado" de arriba, lo que §4.6 dice de las grabaciones (las cambió la decisión del 2026-11-11: se copian a nuestro almacenamiento, §9) y la frase "Ninguno de estos cambios está hecho" de §10 quedan como historia; lo que falta de §10 está en `docs/ESTADO.md` §3. La investigación de DEPLOY que este documento cita (`DEPLOY-investigacion-vps.md`) todavía no está en git; su actualización va a DEPLOY.

**Propuesta en una línea:** clases en vivo con **BigBlueButton por su API**, contratado con un **proveedor alojado** a nombre del colegio; **Zoom** queda como alternativa y **LiveKit** se descarta.

## 1. Contexto

- **Lo que usa hoy el cliente** (observado el 2026-11-10 con una cuenta de alumno, sin entrar a ninguna sesión): su plataforma actual es Moodle y las clases en vivo son actividades de BigBlueButton (plugin `mod_bigbluebuttonbn`), una por sesión, con grabación en formato "Presentación". Maestros y alumnos ya conocen la herramienta.
- **Restricción del cliente (2026-11-10):** no podemos usar el servidor de video que ya tienen ni contactar a su equipo de ingenieros. Todo lo nuestro se contrata, se configura y se opera de forma independiente.
- **Requisitos que dio el dueño (2026-11-10):** 16 maestros; en un día pesado, 200 alumnos repartidos en distintas aulas; el administrador debe poder crear salas por su cuenta, sin que dependan de un maestro. De conversaciones anteriores: grupos de 40 alumnos o menos, grabación automática, sin Google Workspace for Education.
- **Requisito de fondo:** a mediano o largo plazo la plataforma debe correr en un servidor del colegio (`DEPLOY-investigacion-vps.md`).

## 2. Opciones comparadas

| | BigBlueButton alojado | BigBlueButton en servidor propio | Zoom Pro | LiveKit |
|---|---|---|---|---|
| Qué se paga | Capacidad simultánea | Un servidor dedicado | Una licencia por anfitrión | Uso (minutos y grabación) |
| Quién lo opera | El proveedor | Nosotros | Zoom | LiveKit Cloud o nosotros |
| Aula lista (láminas, pizarra, chat, encuestas, grupos) | Sí | Sí | Sí | **No: hay que construirla** |
| Identidad del asistente | La firma nuestro backend | La firma nuestro backend | El alumno escribe su nombre | La firma nuestro backend |
| Salas del administrador | Sin costo ni licencia | Sin costo ni licencia | Cada sala simultánea ocupa una licencia | Sin costo fijo |
| Mudanza al servidor del colegio | Cambiar URL y secreto | Ya es propio | No aplica: siempre es de Zoom | Posible, con más operación |
| Grabación | Reproductor web; video único según proveedor | Igual | MP4 descargable | Egress a almacenamiento S3 |
| Conexiones malas y celular | Bien; navegador, sin app | Igual | La mejor; app nativa | Buena; sin app propia |
| Esfuerzo de integración | 2 a 3 subentregas | Igual, más la operación | 2 a 3 subentregas | 5 a 6 subentregas |

### Costos mensuales para este caso

Precios públicos consultados el 2026-11-10, antes de impuestos. MXN aproximado con el tipo de cambio de `DEPLOY-investigacion-vps.md` (1 USD = 18.6285 MXN, FIX del 2026-11-04); no es la tasa de la tarjeta.

| Opción | Cálculo | USD al mes | MXN aprox. |
|---|---|---|---|
| Zoom Pro, pago mensual | 17 licencias (16 maestros + administrador) × 16.99 [F5] | **288.83** | 5,380.47 |
| Zoom Pro, contrato anual | 17 × 14.16 [F5] | 240.72 | 4,484.25 |
| BigBlueButton alojado, 100 simultáneos | MynaParrot "Ultra-1" [F3] | 89.00 | 1,657.94 |
| BigBlueButton alojado, 200 simultáneos | MynaParrot "Ultra-2", máximo 100 por sesión, 250 GB [F3] | **169.00** | 3,148.22 |
| BigBlueButton alojado, 300 simultáneos | MynaParrot "Ultra-3", máximo 100 por sesión, 400 GB [F3] | **259.00** | 4,824.78 |
| BigBlueButton alojado, 150 usuarios | BiggerBlueButton "Bronze", 10 reuniones simultáneas, 500 GB [F4] | 39.90 | 743.28 |
| BigBlueButton alojado, 150 simultáneos | Aulas en Vivo "BBB Plus", 10 salas a la vez, 100 GB, MP4 [F7] | 29.95 | 557.92 |
| BigBlueButton alojado, 220 simultáneos | Aulas en Vivo "BBB Pro", 20 salas a la vez, 500 GB, MP4 [F7] | **79.95** | 1,489.35 |
| BigBlueButton alojado, 300 simultáneos | Aulas en Vivo "BBB Business", 30 salas a la vez, 1 TB, MP4 [F7] | **119.95** | 2,234.49 |
| BigBlueButton en servidor propio | Servidor dedicado de 8 núcleos y 16 GB (sección 6) | **Sin cotizar** | — |

- Aulas en Vivo anuncia 12 % de descuento por pago anual y un plan gratuito (1 sala, 30 usuarios, 100 MB) [F7].
- Zoom no cambia con la concurrencia, pero sube con la plantilla: cada maestro nuevo es otra licencia.
- BigBlueButton no cambia con la plantilla, pero sube con la concurrencia: el plan se elige por el pico de personas conectadas a la vez.
- Una licencia Pro de Zoom sostiene una reunión a la vez; repartir una licencia entre varias personas no es el uso previsto de una licencia con nombre. **No verificado contra los términos vigentes de Zoom.**

## 3. Propuesta y motivos

**BigBlueButton por API con un proveedor alojado.**

1. **Las salas del administrador son una llamada a la API**, sin maestro asignado ni licencia.
2. **Dieciséis maestros no son dieciséis cuentas ajenas que administrar.** El maestro y el alumno solo existen en nuestra plataforma; cada enlace de entrada lo firma el backend con su nombre y su rol.
3. **Asistencia confiable**, porque el nombre no lo escribe el asistente.
4. **Cero capacitación:** es la herramienta que ya usan.
5. **El código no depende del proveedor.** La API es la misma contra un proveedor alojado, contra un servidor propio y contra un servidor en el colegio; cambiar es cambiar dos variables de entorno. Cumple el principio 1 de `ARCHITECTURE.md` ("todo proveedor debe poder sustituirse cambiando configuración, no código") mejor que Zoom.
6. **LiveKit se descarta** porque obliga a construir el aula (láminas, pizarra, chat, encuestas, grabación con reproductor), que BigBlueButton ya trae.

**Zoom queda como alternativa** si la prueba piloto (sección 8) sale mal o si el colegio prefiere pagar más por no depender de un proveedor chico.

## 4. Diseño de la integración (entrada para el arquitecto)

Nada de esta sección está decidido: es el punto de partida del plan de ENVIVO.

### 4.1 Capas

- **`core/`:** un puerto propio, por ejemplo `ProveedorDeAula`, con tres operaciones: crear o reabrir la sala de una sesión, emitir el enlace de entrada de una persona con su rol, y resolver una grabación lista. `core/` no conoce a BigBlueButton.
- **`adapters/live/`:** la implementación de BigBlueButton (firma de llamadas, XML de respuesta, verificación del aviso de grabación). Sustituye al adaptador de LiveKit previsto. Un adaptador de Zoom sería otra implementación del mismo puerto.
- **`handlers/envivo/`:** las rutas, con la cadena `protegido` de siempre.
- **`workers/`:** el trabajo `GRABACION_LISTA` y el aviso `CLASE_POR_COMENZAR`, que ya existen en el diseño.

### 4.2 Llamadas a la API [F2]

Toda llamada lleva `checksum`: el hash del nombre de la llamada, la cadena de consulta y el secreto compartido. Usar SHA-256 o superior (el valor por omisión del servidor es SHA-1). El secreto vive solo en el backend.

| Momento | Llamada | Parámetros relevantes |
|---|---|---|
| Iniciar o abrir una sesión | `create` (idempotente) | `meetingID` nuestro y no adivinable, `name`, `record`, `autoStartRecording`, `allowStartStopRecording`, `meetingEndedURL`, `meta_bbb-recording-ready-url`, `logoutURL`, `maxParticipants`, bloqueo de cámara y micrófono de los asistentes para el modo webinar |
| Entrar | `join` | `fullName`, `userID` (nuestro id), `role` = `MODERATOR` o `VIEWER`; el backend responde el enlace firmado y el navegador navega a él |
| Saber si sigue abierta | `isMeetingRunning`, `getMeetingInfo` | — |
| Terminar | `end` | — |
| Listar o administrar grabaciones | `getRecordings`, `publishRecordings`, `deleteRecordings` | `getRecordings` pagina con `offset` y `limit` |

Los nombres exactos de los parámetros de bloqueo y los formatos de grabación se verifican contra la versión que dé el proveedor elegido.

### 4.3 Avisos que nos manda el servidor [F2]

- **Sesión terminada:** `meetingEndedURL`. Es un GET con `meetingID`. `meta_endCallbackUrl` está obsoleto porque los `meta_*` pueden quedar a la vista de los asistentes. La URL lleva un token no adivinable y va por HTTPS.
- **Grabación lista:** `meta_bbb-recording-ready-url`. Es un POST con el campo `signed_parameters`: un JWT firmado con HS256 y el secreto compartido, con `meeting_id` y `record_id`. Respuestas: 2XX recibido; 401 firma inválida; 410 grabación borrada; cualquier otra se reintenta.
- Esta ruta es pública y sin JWT nuestro, como `POST /webhooks/livekit` en el diseño actual: verifica la firma, responde rápido y encola el trabajo.

### 4.4 Seguridad

- `BBB_URL` y `BBB_SECRET` solo en el `.env` del backend; nunca en el frontend, en logs ni en el repositorio.
- El enlace de entrada se emite por persona y por petición, después de `authenticate`, `withAccess` y la pertenencia a la clase. Un alumno restringido no recibe enlace (hoy: "sin tokens de LiveKit").
- El enlace firmado es de un solo propósito pero se puede reenviar: quien lo tenga entra con ese nombre. Mitigación a evaluar en el plan: emitirlo justo al pulsar "Entrar" y no mostrarlo.
- Una clase archivada no abre sesiones (regla de ADMIN-01).

### 4.5 Modelo de datos (borrador)

- `sesiones_en_vivo`: `clase_id` **opcional** (nulo en una sala del administrador), quién la creó, título, inicio y fin programados, `meeting_id`, estado.
- `grabaciones`: sesión, `record_id`, URL de reproducción, duración, publicada o no. **Ver 4.7:** con clases vinculadas, la grabación es un archivo que varias clases muestran por referencia.
- Invitados de una sala del administrador: por definir (pregunta 4 de la sección 9).

### 4.6 Lo que cambia frente al diseño con LiveKit

- El aula ya no se pinta dentro de nuestra interfaz con componentes de React: el navegador abre el cliente de BigBlueButton (pestaña nueva o marco embebido, a decidir). Desaparece `@livekit/components-react` del frontend.
- El chat y la pizarra son de BigBlueButton; no hay canales de datos nuestros.
- **Las grabaciones se quedan en el servidor de BigBlueButton**, no en nuestro almacenamiento, salvo que se decida copiarlas (pregunta 2 de la sección 9).
- En `dev` no hace falta un servidor local de video: se desarrolla contra un plan gratuito con API o contra un doble del puerto en pruebas. Sale el servicio `livekit` de `infra/docker-compose.yml`.

### 4.7 Clases vinculadas: grabaciones y recursos compartidos (requisito del 2026-11-11)

**Contexto del cliente.** A veces hay dos clases de la misma materia: una con clases en vivo y otra asíncrona. La asíncrona usa los videos y los materiales de la primera, por lo menos durante un año. Cuando el grupo en vivo se actualiza, el asíncrono también. El riesgo a evitar: que borrar o limpiar algo en una clase deje sin contenido a la otra.

**Decisiones del dueño (2026-11-11):**

1. **Vínculo de un sentido.** La clase asíncrona recibe lo de la clase en vivo. Cada una tiene su propio maestro, sus tareas y sus calificaciones.
2. **Grabaciones:** aparecen en la clase vinculada en cuanto están listas, sin revisión previa.
3. **Recursos de aprendizaje** (los que publica la administración): también se comparten. Los recursos del docente no.
4. **Un video es un solo archivo.** Cada clase lo muestra por referencia, no por copia.
5. **Nada se borra automáticamente.** No hay vencimiento ni plazo de retención. El maestro no quita grabaciones; **solo el administrador las borra**, cuando lo decida.
6. **La antigüedad cuenta desde la fecha de grabación** y es solo un dato para el administrador (por ejemplo, filtrar las de más de un año).

**Consecuencias para el diseño (entrada para el arquitecto):**

- La grabación deja de pertenecer a una clase. Borrador: `grabaciones` (el archivo, la sesión de origen, fecha de grabación, duración, tamaño) y `grabaciones_de_clase` (qué clases la muestran). El vínculo entre clases, en una relación propia (clase que recibe, clase de origen).
- Al procesar `GRABACION_LISTA`, la referencia se crea para la clase de origen y para sus vinculadas en la misma transacción.
- **Borrar una grabación** (solo administrador): diálogo con las clases que la muestran; la quita de todas y borra el archivo.
- **Borrar una clase definitivamente:** quita sus referencias; el archivo de una grabación se borra solo si ninguna otra clase la muestra. El conteo del diálogo de ADMIN-01 debe distinguir las que se borran de las que se conservan.
- **Archivar la clase de origen:** las vinculadas conservan todo lo recibido.
- **Recursos compartidos:** es la parte delicada. Hoy una publicación pertenece a una sola clase y "Duplicar clase" copia sus archivos (`copia_de`). Un recurso se edita y tiene comentarios, que deberían ser de cada clase. A decidir: una publicación visible en varias clases, o copias que se mantienen sincronizadas al editar.
- **Espacio en disco:** sin borrado automático solo crece. Con la estimación de `DEPLOY-investigacion-vps.md` (0.4788 GB por hora de grabación ligera), hay que dimensionar el volumen para acumular, no para rotar.
- **Vista de uso para el administrador:** total ocupado, grabaciones por clase y por antigüedad, y aviso al acercarse al límite. Sin ella, el administrador no tiene con qué decidir qué borrar.
- Es una versión ligera del concepto "Materia" (D-31, sin implementar): no hace falta la materia completa, basta la relación entre dos clases.

**Abierto para el plan:**

1. Al vincular, ¿la clase asíncrona recibe también las grabaciones y recursos que ya existían, o solo los nuevos?
2. ¿Una clase puede recibir de más de una clase de origen?
3. ¿Quién crea el vínculo y cuándo: el administrador al crear o duplicar la clase, o después?
4. La forma de compartir los recursos (referencia o copia sincronizada) y de quién son sus comentarios.

## 5. Capacidad y elección del plan

- La documentación oficial indica que un servidor con los requisitos mínimos soporta unos **200 usuarios simultáneos** y recomienda no pasar de 200 en una sola sesión [F6]. Los proveedores consultados limitan cada sesión a 100 o 150 personas [F3] [F4]; nuestros grupos son de 40 o menos.
- **Dato que falta:** "200 alumnos en un día pesado" no dice cuántos coinciden a la misma hora. El plan se elige con el pico simultáneo, sumando hasta 16 maestros y el administrador:

| Pico de personas conectadas a la vez | Aulas en Vivo [F7] | MynaParrot [F3] |
|---|---|---|
| Hasta 100 | BBB Starter, 9.95 USD (5 salas a la vez) | 100 simultáneos, 89 USD |
| Hasta 150 | BBB Plus, 29.95 USD (10 salas a la vez) | 200 simultáneos, 169 USD |
| Hasta 220 | BBB Pro, 79.95 USD (20 salas a la vez) | 300 simultáneos, 259 USD |
| Hasta 300 | BBB Business, 119.95 USD (30 salas a la vez) | 300 simultáneos, 259 USD |

- Con 200 alumnos, 16 maestros y el administrador a la vez son 217 personas: "BBB Pro" queda justo (217 de 220) y "BBB Business" da holgura.
- En Aulas en Vivo también limita el número de salas a la vez: con 16 maestros más las salas del administrador se pueden rozar las 20 de "BBB Pro".

- El plan se puede subir o bajar entre periodos; el código no cambia.

## 6. Servidor propio (para la etapa del colegio)

Requisitos mínimos oficiales de BigBlueButton 4.0 para producción [F1]:

- Ubuntu 24.04 de 64 bits, con Docker.
- 8 núcleos con buen rendimiento por hilo (se recomiendan instancias de CPU dedicada) y 16 GB de RAM.
- 500 GB libres si se graba; 50 GB si no.
- 250 Mbit/s simétricos o más.
- Puertos TCP 80 y 443 libres, TCP y UDP 3478, y UDP 16384 a 32768.
- **Un servidor dedicado a BigBlueButton**: no convive con otro servidor web, así que no comparte máquina con la API ni con el frontend.
- Un nombre de dominio con certificado TLS válido; sin él, el navegador bloquea cámara y micrófono.

Implicaciones: es una segunda máquina además de la de la plataforma, con el ancho de banda de subida como requisito más exigente para un servidor dentro del colegio. El precio de esa máquina no está cotizado; corresponde agregarlo a `DEPLOY-investigacion-vps.md`.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| No se ha probado a ningún proveedor; solo se leyeron sus páginas de precios | Prueba piloto de la sección 8 antes de contratar un plan de pago |
| Ubicación de los servidores del proveedor y latencia desde México sin verificar | Preguntarlo antes del piloto; medir en el piloto |
| Aulas en Vivo no enlaza términos de servicio ni política de privacidad, y no declara país ni ubicación de servidores (sus teléfonos llevan el prefijo +51) [F7] | Pedirlos por escrito antes de contratar; son necesarios para el aviso de privacidad del colegio |
| Proveedor chico: puede subir precios o cerrar | El código no depende de él; la salida es otro proveedor o servidor propio con las mismas dos variables |
| La grabación no es un archivo de video por omisión [F6] | Decidir en el plan si basta el reproductor web o se exige el formato de video |
| Enlaces de reproducción de grabaciones que se pueden compartir fuera de la plataforma | Evaluar en el plan: grabaciones protegidas del proveedor, o copiar el video a nuestro almacenamiento y servirlo con URL prefirmada |
| Alumnos desde el celular con datos móviles: sin app nativa | Medir en el piloto con al menos dos teléfonos |
| Datos personales (voz, imagen, nombre) en un tercero | El aviso de privacidad del colegio debe nombrar al proveedor y la retención de grabaciones |

## 8. Prueba piloto antes de contratar

Una clase real o simulada, en el horario de más carga, con: un maestro con cámara y pantalla compartida, al menos 30 asistentes (pueden ser pestañas y teléfonos), dos de ellos con datos móviles, grabación automática y reproducción de la grabación al terminar. Pasa si no hay cortes de audio atribuibles al servicio, la grabación queda completa y aparece en menos de una hora, y la entrada desde el celular funciona sin instalar nada. Coincide con el criterio del PRD: "una clase en vivo de 30 personas se imparte y se graba completa sin cortes atribuibles a la plataforma".

Para el desarrollo no hace falta pagar: hay planes gratuitos con API (por ejemplo, 50 usuarios y una reunión simultánea [F4], o una sala y 30 usuarios [F7]), suficientes hasta la subentrega de grabaciones.

## 9. Preguntas abiertas

**Para el colegio:**

1. ¿Cuántas personas hay conectadas a la vez en su hora más cargada?
2. ¿Aprueban el gasto mensual de la sección 5 y contratar la cuenta a nombre del colegio, con un correo institucional y contraseña propia?
3. ~~¿Cuánto tiempo se conservan las grabaciones?~~ **Respondido (2026-11-11):** sin plazo; se conservan hasta que el administrador las borre (4.7).
4. ¿Para qué son las salas del administrador y quién entra a ellas: usuarios de la plataforma elegidos uno por uno, toda una clase, o personas externas con un enlace?
5. ¿El aviso de privacidad ya cubre grabaciones de voz e imagen con un proveedor externo?

**Para el proveedor candidato (Aulas en Vivo), antes de contar con él:**

1. ¿Entregan la URL y el secreto compartido de la API para integrar una plataforma propia, no solo Moodle, Chamilo o WordPress? Su página dice "Accesos API para conectar con tu servicio" [F7], sin más detalle.
2. ¿Dónde están sus servidores y qué versión de BigBlueButton ofrecen?
3. ¿Cuál es el máximo de personas por sala, y "usuarios simultáneos" es el total entre todas las salas?
4. ¿Funciona el aviso automático de grabación lista (`meta_bbb-recording-ready-url`) y la descarga en MP4 por API, o solo desde su panel?
5. Términos de servicio, política de privacidad y política de retención de grabaciones.

Antes de cotizar, confirmar con el cliente que su restricción de trabajar de forma independiente no excluye a este proveedor.

**Para el plan de ENVIVO (las decide el dueño con el arquitecto):**

1. El aula se abre en pestaña nueva o embebida en nuestra interfaz.
2. ~~Las grabaciones se quedan con el proveedor o se copian a nuestro almacenamiento.~~ **Decidido por el dueño (2026-11-11):** se copian a nuestro almacenamiento y se ligan a su clase, si el proveedor entrega el video por API; ver también 4.7.
3. La grabación es siempre automática o el maestro puede iniciarla y detenerla (RF-41 dice que la controla; el cliente pidió automática).
4. Los alumnos entran en modo webinar (sin cámara ni micrófono) o el maestro puede darles la palabra.
5. Cupo por sala y qué ve el alumno cuando la sala está llena (RNF-06).

## 10. Qué se actualiza cuando el cliente confirme

Ninguno de estos cambios está hecho. Es un encargo de documentos (carril normal, sin código) anterior a ENVIVO.

| Archivo | Qué cambia |
|---|---|
| `docs/PRD.md` | RNF-06 (capacidad según el plan de LiveKit Cloud) y RNF-10 (proveedores aprobados); pregunta abierta 7; RF-41 si la grabación queda automática; un RF nuevo para las salas del administrador |
| `docs/ARCHITECTURE.md` | Principio 1 y tabla de proveedores; fila "Clases en vivo" y `@livekit/components-react` de la pila; diagrama; tabla de costos; servicios de `dev` y entornos; árbol de `infra/`; adaptador `live`; rutas de `envivo` (incluido el webhook); tokens de R2 para Egress; §12 completa; tabla de capacidad; una decisión nueva con esta elección y su motivo |
| `docs/ARCHITECTURE-ESSENTIALS.md` | Proveedores aprobados, pila, "Video", regla del alumno restringido ("sin tokens de LiveKit") y la sección "Clases en vivo" |
| `docs/ESTADO.md` | Punto 9 de la hoja de ruta (hoy: "sigue documentado con LiveKit; Zoom evaluado") y la nota de infraestructura |
| `CLAUDE.md` y `AGENTS.md` | Pila, proveedores aprobados (regla 11 de `AGENTS.md`), `services/liveService.ts`, adaptador `live`, comando de `docker compose` |
| `infra/docker-compose.yml`, `infra/livekit/` | Quitar el servicio `livekit`; va en ENVIVO o en un `chore` propio, no en el encargo de documentos |
| `backend/.env.example` | `BBB_URL` y `BBB_SECRET`, en ENVIVO |
| `docs/trabajo/DEPLOY-investigacion-vps.md` | El servidor dedicado de la sección 6 y su costo; las grabaciones dejan de contar en el volumen de MinIO si se quedan con el proveedor |
| `docs/DESIGN.md` | La pantalla "clase en vivo" pasa a ser la antesala (programar, entrar, lista de grabaciones), no el aula |

**Mensaje para Claude Code al confirmar** (ajustar las respuestas del colegio antes de pegarlo):

```
El cliente confirmó BigBlueButton para las clases en vivo. Lee docs/trabajo/ENVIVO-investigacion-bigbluebutton.md completo: es la investigación y la propuesta aprobada por mí.

Crea la rama docs/envivo-bigbluebutton desde main y arranca un encargo de documentos en modo plan, carril normal: sustituir LiveKit por BigBlueButton por API (proveedor alojado; Zoom como alternativa registrada; LiveKit descartado) en los archivos de la tabla de la sección 10, sin tocar código ni infra. Respuestas del colegio: pico simultáneo <N>; retención de grabaciones <N>; salas del administrador para <quién>. Las cinco preguntas del plan de ENVIVO de la sección 9 quedan abiertas para el plan de ENVIVO, no las cierres aquí.

Tráeme el plan con las decisiones para mí antes de editar.
```

## Fuentes

Consultadas el 2026-11-10.

- [F1] BigBlueButton, "Install BigBlueButton" (versión 4.0): https://docs.bigbluebutton.org/administration/install
- [F2] BigBlueButton, "API Reference" (versión 4.0): https://docs.bigbluebutton.org/development/api/
- [F3] MynaParrot, paquetes y precios de BigBlueButton alojado: https://www.mynaparrot.com/packages
- [F4] BiggerBlueButton, planes: https://biggerbluebutton.com/?lang=en
- [F5] tl;dv, "Zoom Pricing Explained" (artículo del 2026-06-11 que declara precios verificados contra zoom.us/pricing; fuente secundaria): https://tldv.io/blog/zoom-pricing/
- [F6] BigBlueButton, "FAQ": https://docs.bigbluebutton.org/support/faq
- [F7] Aulas en Vivo (AQPhost), planes de BigBlueButton alojado: https://aulasenvivo.com/

**Sin verificar en este documento:** calidad y ubicación de servidores de los proveedores alojados (ninguno se ha probado); si sus planes entregan URL y secreto de la API sin restricciones; formatos de grabación disponibles en cada plan; términos de Zoom sobre el uso compartido de licencias; precio de un servidor dedicado para BigBlueButton propio.
