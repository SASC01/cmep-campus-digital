# PRD — CMEP Campus Digital

> Documento de requisitos de producto. Describe **qué** se construye, **para quién** y **qué debe cumplir**.
> Todo lo relativo a tecnología, stack y modelo de datos vive en `ARCHITECTURE.md`.

| Campo | Valor |
|---|---|
| Estado | Alcance cerrado, previo a desarrollo |
| Nombre del producto | **CMEP Campus Digital** (forma corta en la interfaz: "Campus Digital") |
| Fase | **Fase 1 — experimental.** Correo activo para cuentas (recuperar contraseña, alta de maestros); avisos por correo disponibles pero apagados por defecto |
| Escala objetivo | ~2,000 usuarios registrados; diseñado para el peor caso de 2,000 simultáneos |
| Idioma de la interfaz | Español (México) |

---

## 1. Resumen

**CMEP Campus Digital** es una plataforma web para la gestión de clases de una sola institución educativa (CMEP). Un maestro crea clases, publica materiales y tareas, califica con rúbricas e imparte clases en vivo. Un estudiante se une a sus clases, entrega tareas, consulta calificaciones, asiste a clases en vivo y ve sus grabaciones. Un administrador único gestiona usuarios, clases, el estado de pago de cada alumno y la restricción de acceso.

Toda la funcionalidad es nativa: **no hay integraciones con Google** (ni Calendar, ni Drive, ni inicio de sesión con Google).

## 2. Objetivos y no-objetivos

### Objetivos
1. Que cada rol llegue rápido a su tarea principal:
   - **Estudiante:** entregar una tarea.
   - **Maestro:** calificar entregas.
   - **Administrador:** gestionar usuarios, estado de pago y acceso.
2. Concentrar en un solo lugar clases, tareas, calificaciones, clases en vivo y grabaciones.
3. Dar a la institución un control manual y simple sobre el estado de pago y el acceso de los alumnos.
4. Soportar a toda la institución (~2,000 usuarios) sin degradación perceptible.

### No-objetivos (fuera de alcance)
- Pasarela de pago, cobros, montos o verificación bancaria de cualquier tipo.
- Uso de AWS o de cualquier servicio propietario de nube administrada.
- Multi-institución (multi-tenant). Es una sola institución.
- Integraciones externas (Google, Microsoft, LMS de terceros).
- Aplicación móvil nativa (la web es responsive).
- Página de aterrizaje (landing) pública. El punto de entrada es el login.
- Verificación de correo por código al registrarse.
- Preferencias de correo por usuario (en esta fase los avisos por correo se activan a nivel institución).
- Invitar por correo a personas sin cuenta.
- Comentarios públicos de la clase dentro de una tarea (solo existen comentarios en el muro y comentarios privados alumno–maestro).
- Exámenes o cuestionarios en línea con autocalificación.

## 3. Usuarios

| Rol | Quién es | Cómo obtiene su cuenta | Tarea principal |
|---|---|---|---|
| **Estudiante** | Alumno de la institución | Registro público con correo y contraseña. Acceso inmediato, sin verificación por código | Entregar tareas |
| **Maestro** | Docente de la institución | Lo da de alta el Administrador, por invitación individual o masiva, o se registra con un enlace de registro que genera el Administrador (AUTH-03). No existe registro público abierto de maestros | Calificar |
| **Administrador** | Personal administrativo | Cuenta **única**, predefinida. Sin registro ni recuperación pública | Gestionar usuarios, pagos y acceso |

Todos los roles deben iniciar sesión antes de ver cualquier contenido.

## 4. Requisitos funcionales

Prioridad: **M** = imprescindible, **S** = importante, **C** = deseable.

### 4.1 Acceso y cuentas

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Inicio de sesión con correo y contraseña para los tres roles | M |
| RF-02 | Registro público solo para estudiantes: nombre completo, correo, contraseña. La cuenta queda activa de inmediato | M |
| RF-03 | Los correos salen a nombre del dominio del colegio, con la identidad del producto. El correo del usuario no se verifica al registrarse | M |
| RF-04 | Recuperación de contraseña por autoservicio: enlace de un solo uso enviado por correo, con vigencia de 30 minutos | M |
| RF-04a | Respaldo: el Administrador puede restablecer la contraseña de un usuario (contraseña temporal mostrada una sola vez) y corregir su correo. El login indica "¿No te llega el correo? Acude a administración" | M |
| RF-04b | El maestro dado de alta por el Administrador recibe por correo un enlace de un solo uso para establecer su contraseña. Al establecerla ve su nombre y puede corregirlo antes de guardar (AUTH-03) | M |
| RF-04e | Invitación masiva de maestros: el Administrador pega una lista de correos, con un nombre opcional por línea. La pantalla reporta cuántas invitaciones se enviaron, qué correos ya tenían cuenta y cuáles son inválidos, y respeta los límites diarios de envío del servicio de correo (AUTH-03) | S |
| RF-04f | Registro de maestros por enlace: el Administrador genera un enlace de registro con vigencia configurable (7 días por defecto), puede revocarlo y ve quiénes se registraron con cada enlace. El enlace se guarda solo como hash (AUTH-03) | M |
| RF-04d | Quien entra con contraseña temporal debe cambiarla antes de poder hacer cualquier otra cosa. El cambio obligatorio pide solo la contraseña nueva y su confirmación, no la temporal (AUTH-03). Un futuro cambio voluntario de contraseña desde el perfil sí pedirá la contraseña actual | M |
| RF-04c | Cerrar sesión; dar de baja o restringir a un usuario cierra sus sesiones activas | M |
| RF-05 | Tras iniciar sesión, cada rol llega directamente a su dashboard | M |
| RF-06 | La pantalla de login muestra a la **izquierda un panel desplazable de anuncios** (imágenes, título, texto) y a la derecha el formulario. En móvil el panel pasa arriba, en formato compacto | M |
| RF-07 | Los anuncios del login los gestiona el Administrador (crear, ordenar, activar/desactivar, eliminar) | M |

### 4.2 Estudiante

| ID | Requisito | Prioridad |
|---|---|---|
| RF-10 | Dashboard con próximas entregas de todas sus clases y tarjetas de "Mis clases". Cada tarjeta muestra la siguiente fecha límite | M |
| RF-11 | Unirse a una clase con código de invitación | M |
| RF-12 | Ver el muro de una clase (anuncios, materiales, tareas) y comentar publicaciones | M |
| RF-13 | Ver el detalle de una tarea: instrucciones, adjuntos, fecha límite, puntos, rúbrica en solo lectura | M |
| RF-14 | Entregar una tarea con **archivos y/o enlaces**; anular la entrega y volver a entregar mientras no esté calificada | M |
| RF-15 | Las entregas después de la fecha límite se aceptan y se marcan "con retraso" | M |
| RF-16 | Hilo de comentarios privados con el maestro dentro de cada tarea | M |
| RF-17 | "Mis calificaciones" por clase: porcentaje general, lista de tareas con estado/calificación y filtro por estado (todo, asignado, entregado, calificado, sin entregar) | M |
| RF-18 | Modal "Cálculo de calificación": desglose por categorías ponderadas | S |
| RF-19 | Ver profesor y compañeros de la clase (solo lectura, profesores separados de alumnos, con contador) | S |
| RF-20 | Calendario con tareas pendientes y clases en vivo próximas | M |
| RF-21 | Ver su propio estado de pago: "Deudor" o "Al corriente" | M |
| RF-22 | Unirse a una clase en vivo: ver video y pantalla compartida del maestro, participar en el chat | M |
| RF-23 | Ver las grabaciones de clases pasadas de sus clases | M |

### 4.3 Maestro

| ID | Requisito | Prioridad |
|---|---|---|
| RF-30 | Dashboard con sus clases y las entregas pendientes de calificar | M |
| RF-31 | Crear y editar clases; generar y regenerar el código de invitación | M |
| RF-32 | Definir las **categorías ponderadas** de la clase (p. ej. Examen 40 %, Prácticas 40 %, Problemas 20 %). Los pesos deben sumar 100 % | M |
| RF-33 | Publicar anuncios y materiales en el muro, con adjuntos | M |
| RF-34 | Crear y editar tareas: título, instrucciones, adjuntos, fecha límite, puntos, categoría y **rúbrica propia** (criterios con puntaje máximo) | M |
| RF-35 | Ver por tarea quiénes entregaron y quiénes no | M |
| RF-36 | Calificar una entrega: abrirla, puntuar por criterio de la rúbrica (o asignar calificación directa si no hay rúbrica), dejar comentario privado y publicar la calificación | M |
| RF-37 | Gradebook: tabla alumnos × tareas, promedio general de la clase y **alumnos en riesgo** destacados | M |
| RF-38 | Buscar alumnos por nombre completo y agregarlos manualmente a **sus** clases. Solo alumnos ya registrados | M |
| RF-39 | Roster de la clase con el estado de pago de cada alumno y etiqueta si su acceso está restringido | M |
| RF-40 | Programar una clase en vivo (fecha y hora) o iniciarla en el momento | M |
| RF-41 | Impartir clase en vivo: video, compartir pantalla, chat, iniciar y detener grabación | M |
| RF-42 | Calendario con sus fechas límite y sus clases en vivo | S |

### 4.4 Administrador

| ID | Requisito | Prioridad |
|---|---|---|
| RF-50 | Dashboard institucional con KPIs: alumnos, maestros, clases activas | M |
| RF-51 | Alta y baja de maestros y alumnos | M |
| RF-52 | Vista institucional de todas las clases; buscar y agregar alumnos manualmente a **cualquier** clase | M |
| RF-53 | Analytics institucional: progreso y participación a nivel escuela | S |
| RF-54 | Gestión de estado de pago: tabla con buscador, filtro por estado, cambio desde la fila y **selección múltiple** para cambiar varios a la vez | M |
| RF-55 | Restringir y restablecer el acceso de un alumno, con motivo opcional y confirmación previa. Disponible desde Gestión de usuarios y como columna en la tabla de estado de pago | M |
| RF-56 | Configuración general: permisos, anuncios del login e **interruptores de avisos por correo** (uno por tipo de evento) | S |
| RF-57 | Buscador de Gestión de usuarios: por nombre (cualquier parte, sin importar acentos ni mayúsculas) y por correo parcial, en todos los roles, con filtro por rol (ADMIN) | M |
| RF-58 | El Administrador puede editar el nombre de cualquier usuario (ADMIN) | M |

### 4.5 Notificaciones

Panel de notificaciones (ícono con contador de no leídas) presente para Estudiante y Maestro. Cada notificación se puede marcar como leída y enlaza directo al contenido.

| Evento | Destinatario | En la plataforma | Por correo |
|---|---|---|---|
| Nueva publicación o anuncio | Alumnos de la clase | Siempre | Si está activado |
| Nuevo material | Alumnos de la clase | Siempre | Si está activado |
| Nueva tarea | Alumnos de la clase | Siempre | Si está activado |
| Calificación publicada | Alumno | Siempre | Si está activado |
| Faltan 24 h para la fecha límite | Alumnos que **no** han entregado | Siempre | Si está activado |
| Clase en vivo por comenzar (15 min antes, o al instante si no fue programada) | Alumnos de la clase | Siempre | Si está activado |
| El maestro respondió un comentario privado | Alumno | Siempre | No |
| Un alumno entregó una tarea | Maestro | Siempre | No |
| Nuevo comentario privado de un alumno | Maestro | Siempre | No |
| Nuevo comentario en una publicación suya | Maestro | Siempre | No |
| Recuperación de contraseña | Quien la solicita | No | **Siempre** |
| Invitación para establecer contraseña | Maestro nuevo | No | **Siempre** |

**Los avisos por correo arrancan apagados.** El Administrador enciende cada tipo por separado desde Configuración (RF-56); se sugiere empezar por "clase por comenzar" y "faltan 24 h". Los correos de cuenta están siempre activos. Como con el correo apagado un aviso solo se ve si el usuario entra, el dashboard del estudiante muestra siempre arriba las próximas entregas y las clases en vivo del día.

Las notificaciones se conservan 90 días.

## 5. Reglas de negocio

### RN-01 Estado de pago
- Dos valores: **"Deudor"** y **"Al corriente"**. Todo alumno nuevo nace "Al corriente".
- Es un dato **informativo y manual**: solo el Administrador lo cambia, cuando la institución le confirma quién debe. No hay verificación bancaria ni automática.
- Se registra la fecha del último cambio.
- Por sí solo **no bloquea nada**.

### RN-02 Visibilidad del estado de pago
Solo pueden verlo:
- el propio alumno (únicamente el suyo),
- el Maestro (de los alumnos de sus clases),
- el Administrador (de todos).

Ningún alumno puede ver el estado de otro. **La restricción se aplica en el backend**; ocultarlo en la interfaz no es suficiente.

### RN-03 Restricción de acceso
- Función **independiente** del estado de pago: ser "Deudor" no restringe automáticamente, y se puede restringir por otros motivos.
- Solo el Administrador la activa o desactiva. Aplica a estudiantes.
- El alumno restringido **puede iniciar sesión**, pero solo ve una pantalla: "Tu acceso está restringido. Acude a administración", el motivo (si lo hay) y su estado de pago. Todo lo demás queda bloqueado, incluidas clases en vivo y grabaciones.
- El efecto es inmediato. Es reversible y no borra datos.
- El bloqueo se aplica en el backend.

### RN-04 Alta manual de alumnos
- Búsqueda por nombre completo, tolerante a mayúsculas y acentos, por cualquier parte del nombre.
- Solo aparecen alumnos con cuenta registrada.
- Maestro: solo en sus clases. Administrador: en cualquier clase.

### RN-05 Calificaciones
- La calificación de una tarea con rúbrica es la suma de los puntos por criterio, escalada a los puntos de la tarea.
- La calificación general de la clase se calcula por categorías ponderadas. Las categorías sin tareas calificadas no cuentan y su peso se redistribuye proporcionalmente.
- Las tareas sin calificar no afectan el promedio.
- "Alumno en riesgo": promedio general menor a 70 % **o** 3 o más tareas vencidas sin entregar. (Umbrales iniciales, ajustables en configuración.)

### RN-06 Propiedad
- Un maestro solo puede ver y modificar sus propias clases y lo que cuelga de ellas.
- Un alumno solo accede a las clases en las que está inscrito.

## 6. Vistas

**Compartidas (3):** Login con panel de anuncios · Registro de estudiante · Panel de notificaciones.
Estado especial: pantalla de acceso restringido.

**Estudiante (10):** Dashboard · Clase (muro) · Detalle de tarea · Mis calificaciones · Modal de cálculo de calificación · Compañeros y profesor · Calendario · Estado de pago · Clase en vivo · Grabaciones.

**Maestro (10):** Dashboard · Clase (muro con publicar) · Crear/editar clase · Crear tarea o material · Calificar entrega · Gradebook · Buscador y alta manual · Alumnos de la clase · Clase en vivo (anfitrión) · Calendario.

**Administrador (6):** Dashboard institucional · Gestión de usuarios · Gestión de clases · Analytics · Gestión de estado de pago · Configuración general.

Total: 26 vistas de rol + 3 compartidas.

## 7. Experiencia y marca

- **Personalidad:** calmada, confiable y cercana, con un toque técnico y moderno. Seriedad educativa sin frialdad corporativa.
- **Referencias de estilo:** Notion (editorial, cálido, tipografía fuerte), Arc Browser (personalidad propia), Linear (orden y jerarquía).
- **Google Classroom es referencia solo de arquitectura de información**, nunca de estilo: prohibido imitar sus colores, logo, tipografía o iconografía.
- **Evitar:** estética genérica de IA/startup/SaaS, degradados morado-azul, glassmorphism, dashboards flotantes, manchas brillantes, rejillas genéricas de características, texto corporativo vago y palabras como "potencia", "desbloquea", "optimiza", "sin fricciones".
- **Densidad por rol:** Administrador denso y tabular; Estudiante ligero y orientado a tareas; Maestro intermedio.
- **Patrones a conservar:** barra lateral con lista de clases; bloque de próximas entregas sobre las tarjetas; detalle de tarea a dos columnas (contenido y rúbrica a la izquierda, "tu trabajo" y comentarios privados a la derecha); roster con profesores separados de alumnos.
- **CTAs en estados vacíos:** "Crea tu primera clase" (Maestro) y "Únete con tu código de clase" (Estudiante).
- Biblioteca de componentes consistente (botones, tarjetas, barra de navegación, tablas) en todas las vistas, construida sobre shadcn/ui **reestilizado** con tokens propios; nunca con su aspecto por defecto.
- Solo modo claro durante el piloto.
- Responsive, rápido y con texto humano y específico.

## 8. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Soportar 2,000 usuarios simultáneos sin errores ni degradación perceptible (excepto clases en vivo, ver RNF-06) |
| RNF-02 | Las acciones del usuario responden en menos de 1 s en condiciones normales; publicar una tarea no espera al envío de notificaciones |
| RNF-03 | Toda autorización (rol, propiedad, inscripción, estado de pago, restricción) se valida en el backend |
| RNF-04 | Los archivos de los usuarios son privados; solo se accede con enlaces temporales |
| RNF-05 | Responsive desde 360 px de ancho; navegadores modernos (Chrome, Edge, Firefox, Safari) |
| RNF-06 | Clases en vivo: la capacidad depende del plan contratado con LiveKit Cloud. Hay cupos configurables y, al alcanzarlos, el sistema informa "sala llena" o "sin cupo de grabación" en lugar de fallar |
| RNF-07 | Fechas y horas se muestran en la zona horaria del usuario |
| RNF-08 | Accesibilidad básica: contraste AA, navegación por teclado, etiquetas en formularios |
| RNF-09 | Ningún evento de notificación se pierde en silencio: los fallos quedan registrados y generan alerta |
| RNF-10 | **Independencia tecnológica:** sin AWS. Proveedores aprobados: DigitalOcean (servidor), Cloudflare (DNS, frontend y archivos), LiveKit Cloud (video) y Resend (correo). Todos deben poder sustituirse cambiando configuración, y el núcleo debe poder mudarse a un servidor del colegio restaurando un respaldo |
| RNF-11 | Respaldo diario y cifrado de la base de datos fuera del servidor, con restauración probada antes de abrir a alumnos y después cada trimestre |
| RNF-13 | **Costo acorde a la fase experimental:** un servidor pequeño de costo fijo y pago por uso en archivos y video. El servidor se redimensiona cuando el uso real lo pida, sin cambiar la arquitectura |
| RNF-12 | Las contraseñas se almacenan únicamente como hash robusto; límite de intentos de inicio de sesión |

## 9. Hitos

| Hito | Contenido |
|---|---|
| **1. Fundación y núcleo educativo** | Login con panel de anuncios, registro, roles y autorización, clases, código de invitación, alta manual de alumnos, muro, materiales, tareas con rúbrica, entregas, calificación, categorías ponderadas, mis calificaciones, estado de pago, restricción de acceso, gestión de usuarios |
| **2. Clases en vivo** | Programar e iniciar clase, sala con video/pantalla/chat, grabación, lista de grabaciones, aviso de clase por comenzar |
| **3. Integraciones y analytics** | Notificaciones, recordatorio de 24 h, aviso de clase por comenzar, calendarios, gradebook con alumnos en riesgo, dashboard y analytics del administrador, configuración general |

Pendiente: actualizar el backlog de Jira con alta manual de alumnos, notificaciones in-app, cuenta única de administrador, restricción de acceso, rúbricas del maestro y panel de anuncios del login; y **retirar** la verificación por código.

## 10. Criterios de éxito del piloto

- Un estudiante nuevo se registra, se une a una clase y entrega su primera tarea en menos de 5 minutos.
- Un maestro califica una entrega con rúbrica en menos de 2 minutos.
- El administrador actualiza el estado de pago de 50 alumnos en menos de 5 minutos.
- Cero incidentes de un alumno viendo el estado de pago de otro.
- Una clase en vivo de 30 personas se imparte y se graba completa sin cortes atribuibles a la plataforma.

## 11. Supuestos y preguntas abiertas

**Requisitos previos a cargo del colegio**
- Un **dominio** registrado a nombre del colegio, con su propio correo y tarjeta. Sin dominio no hay HTTPS, ni sesión entre frontend y API, ni correo. En su DNS se agregan los registros SPF, DKIM y DMARC que pide el servicio de correo. No hace falta que el colegio tenga buzones institucionales.
- Una **tarjeta** para las cuentas de DigitalOcean y Cloudflare, abiertas a nombre del colegio.
- Una **persona responsable** de la cuenta de Administrador.

**Supuestos tomados**
- Los maestros los da de alta el Administrador (al no haber verificación de correo, un registro público de maestros sería un riesgo).
- La restricción de acceso aplica solo a estudiantes.
- Si restringen a un alumno que ya está dentro de una clase en vivo, permanece hasta que la sesión termine.
- Umbrales de "alumno en riesgo" de RN-05.

**Preguntas abiertas**
1. Identidad visual de CMEP Campus Digital: logo, colores institucionales y dirección creativa (define los tokens del sistema de diseño en `CLAUDE.md`).
2. ¿Se necesitará restringir también a maestros?
3. ¿Habrá más de un profesor por clase (co-docencia)?
4. Tamaño máximo de archivo por entrega (propuesta inicial: 100 MB; para video, usar enlace).
5. Quién opera el servidor después de la entrega: respaldos, actualizaciones y a quién le llegan las alertas.
6. Quién en administración tendrá la cuenta de Administrador.
7. Cuántas clases en vivo simultáneas y cuántas grabaciones se esperan: determina cuándo hará falta un plan de pago de LiveKit Cloud.
8. Qué avisos por correo quiere encender el colegio, y cuándo.
9. Política de retención de grabaciones (se paga por GB almacenado).
