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

**CMEP Campus Digital** es una plataforma web para la gestión de clases de una sola institución educativa (CMEP). El administrador crea las clases y les asigna de uno a dos maestros. Un maestro publica materiales y tareas, califica con rúbricas e imparte clases en vivo. Un estudiante se une a sus clases, entrega tareas, consulta calificaciones, asiste a clases en vivo y ve sus grabaciones. Un administrador único gestiona usuarios, clases, el estado de pago de cada alumno y la restricción de acceso.

Desde el cambio de alcance del 2026-10-26 (DOCS-04), cada clase se organiza en siete secciones: Avisos, Actividades de aprendizaje, Foro, Recursos, Dudas, Personas y Calificaciones (RF-60). El maestro y la administración publican avisos, recursos y actividades (tareas y foros); los alumnos preguntan en "Dudas"; el administrador archiva, restaura, duplica y borra clases.

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
- Comentarios públicos de la clase dentro de una tarea (solo existen comentarios en el muro y comentarios privados alumno–maestro). Desde DOCS-04, la participación pública vive en dos lugares que no son una tarea: el foro, que es otra actividad (RF-66 a RF-68), y "Dudas", que es de la clase (RF-64). La tarea sigue sin comentarios públicos.
- Exámenes o cuestionarios en línea con autocalificación, en la fase 1. EXAMENES-01 y EXAMENES-02 los reconsideran en el hito 3, **pendientes por confirmar** con el cliente (RF-72 a RF-74; DOCS-04).

## 3. Usuarios

| Rol | Quién es | Cómo obtiene su cuenta | Tarea principal |
|---|---|---|---|
| **Estudiante** | Alumno de la institución | Registro público con correo y contraseña. Acceso inmediato, sin verificación por código | Entregar tareas |
| **Maestro** | Docente de la institución | Lo da de alta el Administrador, por invitación individual o masiva, o se registra con un enlace de registro que genera el Administrador (AUTH-03). No existe registro público abierto de maestros | Calificar |
| **Administrador** | Personal administrativo | Cuenta **única**, predefinida. Sin registro ni recuperación pública | Gestionar clases, usuarios, pagos y acceso |

Todos los roles deben iniciar sesión antes de ver cualquier contenido.

## 4. Requisitos funcionales

Prioridad: **M** = imprescindible, **S** = importante, **C** = deseable.

Vocabulario (DOCS-04): **actividad** es lo que se asigna y se califica en una clase: tarea, foro y, por confirmar, examen. Dónde se lee "actividad" aunque el texto diga "tarea", en RN-08. "Grupo" y "clase" son la misma cosa.

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
| RF-10 | Dashboard con próximas entregas de todas sus clases y tarjetas de "Mis clases". Cada tarjeta muestra la siguiente fecha límite. La barra lateral lista sus clases, con las primeras visibles y desplazamiento para el resto (CLASES-02) | M |
| RF-11 | Unirse a una clase con código de invitación. Además, el Administrador o un maestro de la clase pueden inscribirlo (RN-04) | M |
| RF-12 | Ver el muro de una clase (anuncios, materiales, tareas) y comentar publicaciones. Desde CLASES-03 el muro se llama "Avisos" y solo lleva anuncios, que se siguen comentando; las tareas pasan a "Actividades de aprendizaje" y los materiales a "Recursos" (RF-60 a RF-63; DOCS-04) | M |
| RF-13 | Ver el detalle de una tarea: instrucciones, adjuntos, fecha límite, puntos, rúbrica en solo lectura | M |
| RF-14 | Entregar una tarea con **archivos y/o enlaces**; anular la entrega y volver a entregar mientras no esté calificada | M |
| RF-15 | Las entregas después de la fecha límite se aceptan y se marcan "con retraso", salvo que el maestro no acepte entregas tardías en esa tarea (RF-44): entonces la entrega se cierra en la fecha límite (TAREAS/ENTREGAS) | M |
| RF-16 | Hilo de comentarios privados con el maestro dentro de cada tarea. El Administrador lo lee y no escribe (ENTREGAS-01). En esta fase, los comentarios privados no se borran ni se editan (ENTREGAS-01) | M |
| RF-17 | "Mis calificaciones" por clase: porcentaje general, lista de tareas con estado/calificación y filtro por estado (todo, asignado, entregado, calificado, sin entregar). En la sección "Calificaciones" de la clase. Solo las calificaciones propias, con el desglose del cálculo de RF-18; sin el promedio de la clase ni datos de otros alumnos (CALIFICACIONES-01) | M |
| RF-18 | Modal "Cálculo de calificación": desglose por categorías ponderadas | S |
| RF-19 | Ver maestros y compañeros de la clase (solo lectura, maestros separados de alumnos, con contador), con el correo completo de cada uno (CLASES-02) | S |
| RF-20 | Calendario con tareas pendientes y clases en vivo próximas | M |
| RF-21 | Ver su propio estado de pago: "Deudor" o "Al corriente" | M |
| RF-22 | Unirse a una clase en vivo: ver video y pantalla compartida del maestro, participar en el chat | M |
| RF-23 | Ver las grabaciones de clases pasadas de sus clases | M |
| RF-24 | Entregar con "Marcar como completada", sin archivos ni enlaces, una tarea que no requiere adjuntos. El maestro lo indica al crear o editar la tarea ("Cómo se entrega"); el alumno puede adjuntar de todos modos (ENTREGAS-01) | S |
| RF-25 | Las imágenes adjuntas a publicaciones del muro (anuncios y materiales) se muestran en vista previa dentro de la publicación. Los comentarios del muro siguen siendo solo texto (CLASES). Desde CLASES-03, en "Avisos" y en "Recursos" (DOCS-04) | S |

### 4.3 Maestro

| ID | Requisito | Prioridad |
|---|---|---|
| RF-30 | Dashboard con sus clases y las entregas pendientes de calificar. La barra lateral lista sus clases, con las primeras visibles y desplazamiento para el resto (CLASES-02) | M |
| RF-31 | Ver y regenerar el código de invitación de las clases que imparte. El maestro no crea clases ni edita su nombre o descripción: lo hace el Administrador (RF-52, RN-06). Cambio del 2026-10-02; antes el maestro creaba y editaba sus clases (CLASES-02) | M |
| RF-32 | Definir las **categorías ponderadas** de la clase (p. ej. Examen 40 %, Prácticas 40 %, Problemas 20 %). Los pesos deben sumar 100 % | M |
| RF-33 | Publicar anuncios y materiales propios en el muro, con adjuntos, y borrar los propios. Nunca borra ni edita lo que publicó el Administrador (RN-07). Desde CLASES-03, los anuncios van a "Avisos" y los materiales son sus "Recursos del docente", que además edita (RF-61, RF-63; DOCS-04) | M |
| RF-34 | Crear y editar tareas: título, instrucciones, adjuntos, fecha límite, puntos, categoría y **rúbrica propia** (criterios con puntaje máximo) | M |
| RF-35 | Ver por tarea quiénes entregaron y quiénes no | M |
| RF-36 | Calificar una entrega: abrirla, puntuar por criterio de la rúbrica (o asignar calificación directa si no hay rúbrica), dejar comentario privado y publicar la calificación. Publicar es devolver: el alumno ve la calificación en cuanto se guarda; el comentario va a los comentarios privados de la entrega. Se puede recalificar (CALIFICACIONES-01) | M |
| RF-37 | Gradebook: tabla alumnos × tareas, promedio general de la clase y **alumnos en riesgo** destacados | M |
| RF-38 | Buscar alumnos por nombre completo, agregarlos manualmente a las clases que imparte y darlos de baja. Solo alumnos ya registrados | M |
| RF-39 | Roster de la clase con el estado de pago de cada alumno y etiqueta si su acceso está restringido | M |
| RF-40 | Programar una clase en vivo (fecha y hora) o iniciarla en el momento | M |
| RF-41 | Impartir clase en vivo: video, compartir pantalla, chat, iniciar y detener grabación | M |
| RF-42 | Calendario con sus fechas límite y sus clases en vivo | S |
| RF-43 | Organizar el trabajo de clase (tareas y materiales) en **temas** o unidades con nombre y orden: crear, renombrar y reordenar temas, y mover elementos entre temas. Los temas son independientes de las categorías ponderadas de RF-32 (CLASES o TAREAS). Desde CLASES-03 organizan las actividades de aprendizaje y también los recursos; en "Recursos de aprendizaje" solo el Administrador mueve de tema (DOCS-04; P-05, decisión del humano, 2026-10-26) | M |
| RF-44 | Al crear o editar una tarea, elegir si acepta entregas después de la fecha límite. Por defecto sí, marcadas "con retraso"; si no las acepta, la entrega se cierra en la fecha límite. Con la entrega cerrada, el alumno ya no entrega ni anula; mover la fecha límite o aceptar entregas tardías la reabre (ENTREGAS-01) | M |

### 4.4 Administrador

| ID | Requisito | Prioridad |
|---|---|---|
| RF-50 | Dashboard institucional con KPIs: alumnos, maestros, clases activas | M |
| RF-51 | Alta y baja de maestros y alumnos | M |
| RF-52 | Gestión de clases (`/admin/clases`): lista institucional de todas las clases; crear clases y editar su nombre y descripción; asignar de uno a dos maestros a cada clase, y agregarlos, quitarlos o reasignarlos en cualquier momento; buscar e inscribir alumnos manualmente en **cualquier** clase y darlos de baja; entrar al muro de cualquier clase (CLASES-02). Desde DOCS-04, además: archivar y restaurar, borrar definitivamente una clase archivada y duplicar una clase (RF-69 a RF-71, ADMIN-01); el muro pasa a ser "Avisos" (CLASES-03) | M |
| RF-53 | Analytics institucional: progreso y participación a nivel escuela | S |
| RF-54 | Gestión de estado de pago: tabla con buscador, filtro por estado, cambio desde la fila y **selección múltiple** para cambiar varios a la vez | M |
| RF-55 | Restringir y restablecer el acceso de un alumno, con motivo opcional y confirmación previa. Disponible desde Gestión de usuarios y como columna en la tabla de estado de pago | M |
| RF-56 | Configuración general: permisos, anuncios del login e **interruptores de avisos por correo** (uno por tipo de evento) | S |
| RF-57 | Buscador de Gestión de usuarios: por nombre (cualquier parte, sin importar acentos ni mayúsculas) y por correo parcial, en todos los roles, con filtro por rol (ADMIN) | M |
| RF-58 | El Administrador puede editar el nombre de cualquier usuario (ADMIN) | M |
| RF-59 | Publicar anuncios y materiales en el muro de cualquier clase, firmados como "Administración" con un distintivo visible y sin nombre de persona; borrar cualquier publicación o comentario de cualquier clase (RN-07; CLASES-02). Desde CLASES-03, los anuncios van a "Avisos" y los materiales son los "Recursos de aprendizaje" de la clase (RF-61, RF-63; DOCS-04) | M |

### 4.5 Notificaciones

Panel de notificaciones (ícono con contador de no leídas) presente para Estudiante y Maestro. Cada notificación se puede marcar como leída y enlaza directo al contenido.

| Evento | Destinatario | En la plataforma | Por correo |
|---|---|---|---|
| Nueva publicación o anuncio (desde CLASES-03, nuevo aviso) | Alumnos de la clase | Siempre | Si está activado |
| Nuevo material (desde CLASES-03, nuevo recurso) | Alumnos de la clase | Siempre | Si está activado |
| Nueva tarea (desde FORO-01, nueva actividad: tarea o foro) | Alumnos de la clase | Siempre | Si está activado |
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

**Avisos de "Dudas" y del foro (DOCS-04): los decide el plan de NOTIFICACIONES con el humano** (P-11, decisión del humano, 2026-10-26). Esta tabla no los incluye. Candidatos: duda nueva a los maestros de la clase, respuesta al autor de la duda y participación en un foro a los maestros. El "Faltan 24 h" de un foro va a los alumnos sin participación principal (RN-08).

### 4.6 Organización de la clase, actividades y exámenes (DOCS-04)

Cambio de alcance decidido con el cliente el 2026-10-26, antes de ADMIN. Las preguntas P-01 a P-13 de `docs/trabajo/DOCS-04-nuevos-requisitos/plan.md` las cerró el humano el 2026-10-26 (también DE-03 y R-01), y cada decisión está en su requisito. Lo que sigue marcado **pendiente por confirmar** (los exámenes y el bloque de grabaciones de "Recursos") no se planea hasta que el humano lo cierre. El orden de los encargos vive en `docs/ESTADO.md` (sección 2b).

**Secciones de la clase (CLASES-03)**

| ID | Requisito | Prioridad |
|---|---|---|
| RF-60 | Cada clase tiene siete secciones, en este orden: **Avisos · Actividades de aprendizaje · Foro · Recursos · Dudas · Personas · Calificaciones**, para el estudiante, el maestro y el Administrador. "Avisos" reemplaza a "Muro" y "Actividades de aprendizaje" a "Trabajo de clase". "Personas" está en los tres roles y reúne también el roster del maestro ("Alumnos") y los "Alumnos" y "Maestros" del Administrador, para que los tres tengan siete secciones: el estudiante ve lo de hoy; el maestro, el roster (con estado de pago y alta manual) y los maestros; el Administrador, además, la asignación de maestros (P-01). "Foro" llega con FORO-01, en su posición fija (tercera); CLASES-03 no la muestra vacía (P-02). Decisiones del humano, 2026-10-26 | M |
| RF-61 | **Avisos:** solo los anuncios de la administración y de los maestros de la clase, del más reciente al más antiguo. Los comentarios en los avisos se conservan, con las reglas de hoy (RF-12, RN-07). Las tareas y los materiales ya no aparecen aquí | M |
| RF-62 | **Actividades de aprendizaje:** las tareas con sus entregas, agrupadas por tema como hoy "Trabajo de clase"; después, los foros (FORO-01) y, por confirmar, los exámenes (hito 3) | M |
| RF-63 | **Recursos**, en dos bloques. **"Recursos de aprendizaje":** los sube la administración; el maestro no los mueve, no los borra ni los edita. **"Recursos del docente":** cada maestro de la clase sube los suyos; los maestros de la clase los ven y cada quien edita y borra lo propio, con la regla de autoría vigente (RN-07). Los materiales que ya existen se reparten por el rol de su autor: los del Administrador, a "Recursos de aprendizaje"; los de un maestro, a "Recursos del docente". Adjuntos y vista previa como hoy los materiales (RF-25). Los alumnos ven los dos bloques, porque los materiales que hoy ven pasan a "Recursos del docente" (P-03), y los recursos conservan los comentarios que hoy tienen los materiales (P-06); decisiones del humano, 2026-10-26. Un bloque de grabaciones se definirá cuando se planee ENVIVO (**pendiente por confirmar**) | M |
| RF-64 | **Dudas:** un hilo abierto de la clase. Cualquier inscrito pregunta y responde, y todos los de la clase lo ven. Los maestros de la clase y el Administrador pueden marcar una duda como "resuelta" y borrar. No se califica. Es distinto del hilo privado de cada tarea (RF-16), que se conserva. Preguntan y responden los alumnos inscritos y los maestros de la clase; el Administrador lee, marca "resuelta" y borra, sin escribir (como en el muro y el hilo privado); cada autor borra lo suyo (RN-07); sin edición; solo texto, sin adjuntos; "resuelta" se puede quitar (P-07, decisión del humano, 2026-10-26) | M |

**Exportar, foro y gestión de clases (CALIFICACIONES-02, FORO-01, ADMIN-01)**

| ID | Requisito | Prioridad |
|---|---|---|
| RF-65 | **Exportar a Excel (CALIFICACIONES-02):** un maestro de la clase o el Administrador descarga las calificaciones de una clase en un archivo .xlsx: alumnos × actividades, con la categoría de cada actividad y el promedio de cada alumno. El archivo identifica al alumno por su nombre y su correo, y nunca lleva el estado de pago ni la restricción de acceso, porque un archivo descargado sale del control de la plataforma y puede reenviarse (P-13). La API entrega los datos en JSON y el navegador arma el .xlsx: ningún archivo pasa por el servidor, sin cola ni almacén (R-01). Decisiones del humano, 2026-10-26. Su contenido sale del mismo cálculo que el gradebook (RF-37, RN-05) | M |
| RF-66 | **Crear un foro (FORO-01):** un maestro de la clase o el Administrador plantea un foro (texto, con adjuntos opcionales), con fecha límite, puntos, rúbrica opcional y si acepta participaciones tardías, igual que una tarea (RF-34, RF-44); también categoría y tema. Se ve en "Actividades de aprendizaje" y en "Foro" | M |
| RF-67 | **Participar en un foro (FORO-01):** cada alumno publica una participación principal y réplicas libres a las de otros. La "entrega" es participar: el alumno entregó cuando publicó su participación principal (RN-08). En FORO-01 el alumno no edita ni borra lo suyo (como el hilo privado); ve las participaciones de los demás antes de publicar la suya; las réplicas siguen la misma regla de cierre que la principal; los maestros replican y el Administrador lee; solo texto; sin hilo privado (la devolución va con la calificación). Un foro vencido sin participación principal cuenta como "sin entregar" en el riesgo (P-09, decisión del humano, 2026-10-26) | M |
| RF-68 | **Calificar un foro (FORO-01):** un maestro de la clase califica a cada alumno con puntos (por criterio si el foro tiene rúbrica), con las reglas de RF-36 y RN-05. La calificación pondera en la categoría del foro, como cualquier actividad | M |
| RF-69 | **Archivar y restaurar una clase (ADMIN-01):** el Administrador archiva una clase. Una clase archivada desaparece de las listas de maestros y alumnos (inicio y barra lateral). El alumno conserva la lectura de sus calificaciones de esa clase en "Clases anteriores". El Administrador la ve en una lista de archivadas, la lee completa sin escribir y puede restaurarla. La clase archivada es de solo lectura para todos; el maestro también consulta sus clases archivadas en solo lectura, incluidas sus calificaciones (por ejemplo, para aclaraciones); el código de invitación no sirve mientras esté archivada y sus recordatorios no avisan (P-08, decisión del humano, 2026-10-26). Dónde encuentra el maestro sus clases archivadas lo decide el plan de ADMIN-01 | M |
| RF-70 | **Borrar definitivamente una clase archivada (ADMIN-01):** solo el Administrador y solo una clase archivada, con una confirmación que dice el conteo de lo que se pierde: alumnos, actividades, entregas, calificaciones y archivos. No se puede deshacer | M |
| RF-71 | **Duplicar una clase (ADMIN-01):** crea una clase nueva con el mismo nombre, la misma descripción, los recursos de aprendizaje (del Administrador) y las secciones de la original. **No** copia maestros, alumnos, avisos, actividades, recursos del docente ni calificaciones. Las "secciones" son los temas (nombre y orden); también se copian las categorías ponderadas (son estructura, no datos de alumnos); el Administrador elige de uno a dos maestros al duplicar, porque una clase nunca queda sin maestro (RN-06; DE-03); el nombre es el mismo, editable en el formulario; y se puede duplicar una clase archivada (la copia nace activa). P-10 y DE-03, decisiones del humano, 2026-10-26 | M |

**Exámenes (hito 3): pendientes por confirmar con el cliente, sin planear**

| ID | Requisito | Prioridad |
|---|---|---|
| RF-72 | **Banco de preguntas (EXAMENES-01):** cada maestro tiene un banco de preguntas, reutilizable en todas sus clases, con preguntas abiertas y de opción múltiple; las crea, edita y borra | Por confirmar |
| RF-73 | **Examen (EXAMENES-01):** un examen elige preguntas al azar del banco. El maestro decide si el alumno ve su resultado; por defecto, no. Por confirmar: tiempo límite, número de intentos, quién califica las preguntas abiertas, cuántas preguntas tiene cada examen y si pondera en una categoría como las demás actividades (recomendación: sí) | Por confirmar |
| RF-74 | **Medidas de disuasión y registro (EXAMENES-02):** cámara encendida obligatoria para iniciar el examen, con detección de que se apaga; detección y registro de cada cambio de pestaña o de ventana, con un aviso al alumno; bloqueo de copiar, pegar y clic derecho en la página; registro de eventos por alumno y examen, visible para el maestro. **Límites, explícitos:** una página web no puede impedir capturas de pantalla ni que el alumno use otro dispositivo, y los bloqueos de copiar, pegar y clic derecho se pueden saltar; son disuasión, no control. **No se graba video:** la cámara solo se usa en el navegador para saber que está encendida, y la imagen no se envía ni se guarda. Por confirmar: el aviso de privacidad y el consentimiento antes de encender la cámara (recomendación: obligatorios; el texto lo da el colegio) | Por confirmar |

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
- Maestro: solo en las clases que imparte. Administrador: en cualquier clase. Los dos también dan de baja. El código de invitación se conserva como otra vía de inscripción (RF-11).
- En el buscador del Maestro, cada alumno aparece con su nombre y su correo enmascarado (hasta los 2 primeros caracteres antes de la `@`, nunca todos, `***` y el dominio). El correo completo solo se ve en la lista de alumnos de su clase, una vez inscrito. El buscador nunca muestra el estado de pago.
- Cada alta manual y cada baja de un alumno quedan registradas, en el orden en que ocurrieron (clase, alumno, quién lo hizo, sea maestro o Administrador, tipo y fecha). El Administrador las consulta (ADMIN).

### RN-05 Calificaciones
- La calificación de una tarea con rúbrica es la suma de los puntos por criterio, escalada a los puntos de la tarea.
- La calificación general de la clase se calcula por categorías ponderadas. Las categorías sin tareas calificadas no cuentan y su peso se redistribuye proporcionalmente.
- Las tareas sin calificar no afectan el promedio.
- Una clase sin categorías califica por puntos. Con categorías, toda tarea nueva o editada lleva una; una tarea sin categoría no cuenta en la calificación general hasta asignarle una (TAREAS-01).
- Dentro de una categoría, por puntos. Una tarea con entregas calificadas no cambia sus puntos ni su rúbrica. Se puede calificar a quien no entregó solo con la entrega cerrada: la fecha límite vencida en una tarea que no acepta entregas con retraso (CALIFICACIONES-01).
- "Alumno en riesgo": promedio general menor a 70 % **o** 3 o más tareas vencidas sin entregar. (Umbrales iniciales, ajustables en configuración; constantes hasta que exista la configuración, RF-56. Una tarea calificada sin entrega no cuenta como vencida sin entregar; CALIFICACIONES-01.)
- Desde FORO-01, el foro es una actividad calificable más: su calificación cuenta en su categoría como la de una tarea, y un foro vencido sin participación principal cuenta entre las actividades vencidas sin entregar (RN-08; DOCS-04).

### RN-06 Propiedad
- Las clases las crea el Administrador, que les asigna de **uno a dos maestros** y puede agregarlos, quitarlos o reasignarlos en cualquier momento. Una clase nunca queda sin maestro.
- Un maestro solo puede ver y modificar las clases que imparte y lo que cuelga de ellas. No crea clases ni edita su nombre o descripción.
- Un alumno solo accede a las clases en las que está inscrito.
- El Administrador alcanza cualquier clase: la gestiona, inscribe alumnos y entra a su muro.
- Decisión del 2026-10-02 (CLASES-02); antes cada clase tenía un solo maestro, que la creaba.
- Una clase archivada sale de las listas de sus maestros y alumnos (inicio y barra lateral). El Administrador la ve en la lista de clases archivadas y la restaura, y el alumno conserva la lectura de sus calificaciones de esa clase en "Clases anteriores" (RF-69, RN-10). La clase archivada es de solo lectura para todos, y el maestro también consulta sus clases archivadas en solo lectura, incluidas sus calificaciones (P-08 de DOCS-04, decisión del humano, 2026-10-26). Duplicar una clase no copia sus maestros: como una clase nunca queda sin maestro, el Administrador elige de uno a dos al duplicar (DE-03 de DOCS-04, decisión del humano, 2026-10-26; ADMIN-01).

### RN-07 Autoría
Regla general para todo lo que se publica en una clase: publicaciones y comentarios del muro hoy, y tareas en TAREAS.
- Cada autor borra solo lo suyo. El maestro también borra los comentarios de los alumnos en las clases que imparte; nunca lo que publicó otro maestro de la clase (CLASES-02).
- Borrar una publicación borra también su hilo de comentarios, de quien sea (CLASES-02).
- Un maestro **nunca** borra ni edita lo que publicó el Administrador.
- En las tareas, un maestro de la clase edita y borra también las de un maestro que ya no da la clase (TAREAS-01).
- Un maestro no borra una tarea que ya tiene entregas (entregadas o calificadas): el sistema le dice cuántas tiene y que lo pida a administración. El Administrador sí la borra, con una confirmación explícita; ese borrado se lleva las entregas, sus archivos y los comentarios privados, y no se puede deshacer (ENTREGAS-01).
- El Administrador puede borrar cualquier publicación o comentario de cualquier clase.
- Lo que publica el Administrador se firma "Administración", con un distintivo visible y sin nombre de persona.
- Desde CLASES-03 (DOCS-04): en "Recursos del docente", cada maestro edita y borra lo suyo, nunca lo del otro maestro; el Administrador borra cualquiera. En "Recursos de aprendizaje", solo el Administrador sube, edita, borra y mueve de tema; el maestro no hace nada de eso. En "Dudas", los maestros de la clase y el Administrador marcan "resuelta" y borran las dudas y respuestas de los alumnos; entre maestros rige la regla general (un maestro no borra lo del otro), y cada alumno borra lo suyo (P-07, decisión del humano, 2026-10-26). En un foro, el planteamiento sigue la regla de las tareas (FORO-01).
- La regla se aplica en el backend.

### RN-08 Actividades (DOCS-04)
- Una **actividad** es lo que se asigna y se califica en una clase: la tarea, el foro (FORO-01) y, por confirmar, el examen (hito 3). "Actividades de aprendizaje" es la sección que las reúne (RF-62).
- Donde RN-05 y los RF-10, RF-17, RF-20, RF-30, RF-37 y RF-42 dicen "tarea" en el sentido de lo que se califica, vence o cuenta en el riesgo, la regla vale para toda actividad calificable desde que ese tipo exista. Donde se habla de entregar archivos o enlaces (RF-13, RF-14, RF-24, RF-34, RF-44), es la tarea.
- **Foro:** se crea igual que una tarea (fecha límite, puntos, rúbrica opcional, tardías sí o no, categoría y tema). "La entrega es participar": el alumno entregó cuando publicó su participación principal; si la publica después de la fecha límite en un foro que acepta tardías, es "con retraso", y si no las acepta, la participación se cierra en la fecha límite, con las reglas de RF-15 y RF-44. Se califica por alumno y pondera en su categoría (RF-68, RN-05).

### RN-09 Recursos y dudas (DOCS-04)
- Los recursos son los materiales de la clase, en dos bloques (RF-63): "Recursos de aprendizaje", del Administrador, y "Recursos del docente", de cada maestro. El bloque de un recurso es el de su autor al publicarlo; los materiales anteriores a CLASES-03 se reparten por el rol de su autor.
- "Dudas" es pública dentro de la clase (todos los inscritos, sus maestros y el Administrador la leen) y no se califica. No sustituye al hilo privado de una tarea (RF-16).
- Lo que un alumno restringido no ve (RN-03) incluye recursos, dudas y foros.

### RN-10 Clases archivadas, borradas y duplicadas (DOCS-04; ADMIN-01)
- Solo el Administrador archiva, restaura, borra y duplica clases.
- Archivar no borra nada y es reversible. La clase archivada no aparece en el inicio ni en la barra lateral de sus maestros y alumnos; el alumno ve sus calificaciones de esa clase en "Clases anteriores". Es de solo lectura para todos: el maestro consulta sus clases archivadas sin escribir, el Administrador la lee completa y la restaura, el código de invitación no sirve y sus recordatorios no avisan (RF-69; P-08, decisión del humano, 2026-10-26).
- Solo se borra definitivamente una clase archivada, con una confirmación que dice cuántos alumnos, actividades, entregas, calificaciones y archivos se pierden. El borrado no se puede deshacer.
- Duplicar copia solo el nombre, la descripción, los recursos de aprendizaje, las secciones de la clase (los temas, con nombre y orden) y sus categorías ponderadas (son estructura, no datos de alumnos). **No** copia maestros, alumnos, avisos, actividades, recursos del docente ni calificaciones, sin importar quién los publicó. El Administrador elige de uno a dos maestros al duplicar; el nombre es el mismo, editable; y se puede duplicar una clase archivada, cuya copia nace activa (RF-71; P-10 y DE-03, decisiones del humano, 2026-10-26).
- La regla se aplica en el backend.

### RN-11 Exámenes (DOCS-04; hito 3, pendiente por confirmar)
- Pendiente por confirmar con el cliente; no se planea hasta que el humano lo cierre (RF-72 a RF-74).
- Las medidas de EXAMENES-02 disuaden y registran; no impiden. Una página web no puede impedir capturas de pantalla ni el uso de otro dispositivo, y la plataforma no graba video del alumno.

## 6. Vistas

**Compartidas (3):** Login con panel de anuncios · Registro de estudiante · Panel de notificaciones.
Estado especial: pantalla de acceso restringido.

**Estudiante (10):** Dashboard · Clase (muro) · Detalle de tarea · Mis calificaciones · Modal de cálculo de calificación · Compañeros y maestros · Calendario · Estado de pago · Clase en vivo · Grabaciones.

**Maestro (9):** Dashboard · Clase (muro con publicar) · Crear tarea o material · Calificar entrega · Gradebook · Buscador y alta manual · Alumnos de la clase · Clase en vivo (anfitrión) · Calendario.

**Administrador (6):** Dashboard institucional · Gestión de usuarios · Gestión de clases (lista, crear, maestros, alumnos y muro de cualquier clase) · Analytics · Gestión de estado de pago · Configuración general.

Total: 25 vistas de rol + 3 compartidas ("Crear/editar clase" del Maestro pasó al Administrador el 2026-10-02).

**Desde DOCS-04 (2026-10-26).** Las listas de arriba quedan como estaban; lo que cambia o se suma:
- **Secciones de la clase, en los tres roles (CLASES-03):** Avisos (antes "Clase (muro)") · Actividades de aprendizaje · Foro · Recursos · Dudas · Personas (antes "Compañeros y maestros" del estudiante, "Alumnos de la clase" del maestro y "Alumnos" y "Maestros" del Administrador; RF-60, P-01) · Calificaciones ("Mis calificaciones" del estudiante; "Gradebook" del maestro, que suma "Exportar a Excel", RF-65).
- **Estudiante:** suma "Detalle de un foro" con su participación (FORO-01) y "Clases anteriores" (ADMIN-01).
- **Maestro:** "Crear tarea o material" pasa a "Crear tarea, foro o recurso"; "Calificar entrega" incluye calificar la participación de un alumno en un foro (FORO-01).
- **Administrador:** "Gestión de clases" suma la lista de clases archivadas (restaurar, borrar definitivamente) y duplicar (ADMIN-01).
- Total previsto: 35 vistas de rol (estudiante 16, maestro 13 y administrador 6, que ve las secciones de la clase dentro de "Gestión de clases"; cada sección cuenta como una vista) + 3 compartidas. Las vistas de examen (hito 3) no se cuentan hasta confirmarlas.

## 7. Experiencia y marca

- **Personalidad:** calmada, confiable y cercana, con un toque técnico y moderno. Seriedad educativa sin frialdad corporativa.
- **Referencias de estilo:** Notion (editorial, cálido, tipografía fuerte), Arc Browser (personalidad propia), Linear (orden y jerarquía).
- **Google Classroom es referencia solo de arquitectura de información**, nunca de estilo: prohibido imitar sus colores, logo, tipografía o iconografía.
- **Evitar:** estética genérica de IA/startup/SaaS, degradados morado-azul, maquetas de dashboards flotantes como ilustración, manchas brillantes decorativas, rejillas genéricas de características, texto corporativo vago y palabras como "potencia", "desbloquea", "optimiza", "sin fricciones". El vidrio translúcido solo se usa con las reglas de legibilidad, movimiento y alcance de `docs/DESIGN.md` (dirección D3).
- **Densidad por rol:** Administrador denso y tabular; Estudiante ligero y orientado a tareas; Maestro intermedio.
- **Patrones a conservar:** tarjetas de "Mis clases" en el inicio de cada rol y la lista de clases del usuario en la barra lateral, con las primeras visibles y desplazamiento para el resto (decisión del 2026-10-02 para CLASES-02; sustituye a P-01 de CLASES-01, que la dejó compacta, y resuelve R-01 de DESIGN-01; `docs/DESIGN.md` §7.4 se actualiza en ese encargo); bloque de próximas entregas sobre las tarjetas; detalle de tarea a dos columnas (contenido y rúbrica a la izquierda, "tu trabajo" y comentarios privados a la derecha); roster con profesores separados de alumnos.
- **CTAs en estados vacíos:** "Crea la primera clase" (Administrador) y "Únete con tu código de clase" (Estudiante). El Maestro sin clases no tiene acción: el estado vacío le dice que el Administrador asigna las clases (CLASES-02).
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
| **1. Fundación y núcleo educativo** | Login con panel de anuncios, registro, roles y autorización, clases, código de invitación, alta manual de alumnos, muro, materiales, tareas con rúbrica, entregas, calificación, categorías ponderadas, mis calificaciones, estado de pago, restricción de acceso, gestión de usuarios. Desde DOCS-04: las siete secciones de la clase (avisos, actividades de aprendizaje, foro, recursos y dudas; RF-60 a RF-64), exportar calificaciones a Excel (RF-65), el foro como actividad (RF-66 a RF-68) y archivar, borrar y duplicar clases (RF-69 a RF-71) |
| **2. Clases en vivo** | Programar e iniciar clase, sala con video/pantalla/chat, grabación, lista de grabaciones, aviso de clase por comenzar |
| **3. Integraciones y analytics** | Notificaciones, recordatorio de 24 h, aviso de clase por comenzar, calendarios, gradebook con alumnos en riesgo, dashboard y analytics del administrador, configuración general. Desde DOCS-04, **pendientes por confirmar con el cliente y sin planear:** exámenes en línea con banco de preguntas (EXAMENES-01; RF-72 y RF-73) y medidas de disuasión y registro (EXAMENES-02; RF-74) |

El orden en que se construyen los encargos no sigue los hitos: vive en `docs/ESTADO.md`, sección 2b (hoja de ruta de DOCS-04, 2026-10-26).

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
- Umbrales de "alumno en riesgo" de RN-05: promedio menor a 70 % o 3 o más tareas vencidas sin entregar, como constantes hasta que exista la configuración (RF-56) (CALIFICACIONES-01).
- DOCS-04: "grupo" y "clase" son lo mismo; "Recursos" es el nombre en la interfaz de lo que hoy es un material; con "Avisos: solo anuncios", las tareas y los materiales dejan de salir en esa sección; los alumnos ven los dos bloques de "Recursos" (estos dos últimos, confirmados por el humano el 2026-10-26: P-04 y P-03, pregunta 11).

**Preguntas abiertas**
1. Identidad visual de CMEP Campus Digital: logo, colores institucionales y dirección creativa (define los tokens del sistema de diseño en `docs/DESIGN.md`). La dirección creativa ya se eligió: dirección D3, "Vidrio líquido con fondo flotante" (2026-09-27), que reemplazó a la dirección C (2026-09-26). Siguen abiertos el logo y los colores institucionales.
2. ¿Se necesitará restringir también a maestros?
3. ¿Habrá más de un profesor por clase (co-docencia)? **Resuelta el 2026-10-02:** de uno a dos maestros por clase, asignados por el Administrador (RN-06; CLASES-02).
4. Tamaño máximo de archivo por entrega. Resuelta (ENTREGAS-01): 25 MB por archivo, hasta 5 archivos y 5 enlaces por entrega; para video, enlace.
5. Quién opera el servidor después de la entrega: respaldos, actualizaciones y a quién le llegan las alertas.
6. Quién en administración tendrá la cuenta de Administrador.
7. Cuántas clases en vivo simultáneas y cuántas grabaciones se esperan: determina cuándo hará falta un plan de pago de LiveKit Cloud.
8. Qué avisos por correo quiere encender el colegio, y cuándo.
9. Política de retención de grabaciones (se paga por GB almacenado).

**Preguntas abiertas de DOCS-04 (2026-10-26).** Detalle y recomendación en `docs/trabajo/DOCS-04-nuevos-requisitos/plan.md` (P-01 a P-13). El humano cerró el 2026-10-26 las preguntas 10 a 15 y 17 (P-01 a P-13, más DE-03 y R-01); sigue abierta la 16 (exámenes) y, de la 11, el bloque de grabaciones (ENVIVO).

10. ¿"Personas" reúne el roster del maestro y los alumnos y maestros del Administrador, para que los tres roles tengan siete secciones? ¿"Foro" aparece desde CLASES-03 o con FORO-01? (RF-60) **Resuelta el 2026-10-26 (decisión del humano):** "Personas" en los tres roles (P-01); "Foro" llega con FORO-01, en tercera posición, y CLASES-03 no la muestra vacía (P-02).
11. ¿Los alumnos ven "Recursos del docente"? ¿Las tareas y los materiales salen de "Avisos"? ¿Los temas organizan también los recursos? ¿Los recursos conservan los comentarios? ¿Cuándo se define el bloque de grabaciones? (RF-61 a RF-63) **Resuelta el 2026-10-26 (decisión del humano), salvo las grabaciones:** los alumnos ven los dos bloques (P-03); tareas y materiales salen de "Avisos" (P-04); los temas organizan también los recursos y en "Recursos de aprendizaje" solo el Administrador mueve de tema (P-05); los recursos conservan los comentarios (P-06). El bloque de grabaciones se define al planear ENVIVO (**pendiente por confirmar**).
12. "Dudas": ¿escribe el Administrador?, ¿cada autor borra lo suyo?, ¿solo texto y sin edición? (RF-64) **Resuelta el 2026-10-26 (decisión del humano, P-07):** el Administrador lee, marca "resuelta" y borra, sin escribir; cada autor borra lo suyo; solo texto, sin adjuntos ni edición; "resuelta" se puede quitar.
13. Foro: ¿el alumno edita o borra su participación?, ¿ve las de los demás antes de publicar?, ¿las réplicas se cierran con la fecha límite?, ¿replican los maestros?, ¿adjuntos? (RF-67) **Resuelta el 2026-10-26 (decisión del humano, P-09):** no edita ni borra; sí ve las de los demás; las réplicas cierran con la misma regla que la principal; los maestros replican y el Administrador lee; solo texto; sin hilo privado.
14. Clase archivada: ¿solo lectura para todos?, ¿el maestro deja de entrar?, ¿el maestro consulta las calificaciones de sus clases archivadas (por ejemplo, para aclaraciones)?, ¿el código deja de servir? (RF-69). Duplicar: ¿"secciones" son los temas?, ¿se copian las categorías?, ¿el Administrador elige los maestros del duplicado?, ¿se duplica una archivada? (RF-71) **Resuelta el 2026-10-26 (decisión del humano):** solo lectura para todos; el maestro también consulta sus clases archivadas en solo lectura, incluidas sus calificaciones; el código deja de servir y los recordatorios no avisan (P-08). "Secciones" son los temas; se copian las categorías; el Administrador elige de uno a dos maestros al duplicar; se duplica también una archivada, y la copia nace activa (P-10 y DE-03).
15. ¿Avisos (notificaciones) de "Dudas" y del foro? Los decide el plan de NOTIFICACIONES. **Resuelta el 2026-10-26 (decisión del humano, P-11):** los decide el plan de NOTIFICACIONES.
16. Exámenes (hito 3, preguntas del humano): tiempo límite, número de intentos, quién califica las preguntas abiertas y cuántas preguntas por examen; además, si el examen pondera en una categoría y el aviso de privacidad y consentimiento para la cámara (RF-72 a RF-74).
17. Exportar a Excel: ¿qué identifica al alumno en el archivo (nombre, correo)? ¿Se excluyen el estado de pago y la restricción de acceso? (RF-65) **Resuelta el 2026-10-26 (decisión del humano):** nombre y correo, nunca estado de pago ni restricción (P-13); la API entrega JSON y el navegador arma el .xlsx (R-01).
