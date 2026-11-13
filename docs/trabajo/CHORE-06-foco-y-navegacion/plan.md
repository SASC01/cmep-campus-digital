# Plan — CHORE-06 · foco y navegación del marco
Estado: LISTO
Carril: normal
Requisitos: sin RF ni RN nuevos. Cumple `CLAUDE.md` (Componentes, Manejo de errores en el frontend, Ubicaciones compartidas), `DESIGN.md` §6, §7.10 y §7.14, y las filas de `docs/ESTADO.md` §3 con destino "el `chore` de foco y navegación del marco" (inventario en "Alcance").
Rama: `chore/chore-06-foco-y-navegacion`, desde `main` = `47c3339` (base de "No se toca"). Dos subentregas: CHORE-06a (32 archivos) y CHORE-06b (32 archivos), en ese orden (§D-0; Enmienda 1).
Solo frontend. Sin backend, `shared/`, `infra/` ni dependencias nuevas.

**Enmienda 1 (2026-11-12): responde a `revision.md` del plan (CAMBIOS REQUERIDOS, tres hallazgos de inventario). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 1" en su lugar.
- **M-01:** la `key` del contenido de la entrega de un alumno era `alumnoId`, que no es única por la ruta (`tareas/:tareaId/entregas/:alumnoId`: el mismo alumno tiene entrega en cada tarea). Pasa a `${tareaId}:${alumnoId}` (§D-1, Forma C). CH6-A06 suma el camino "mismo alumno, otra tarea", CH6-A30 (c) exige la `key` compuesta y "Mutaciones" suma su fila. Repasé los 16 sitios con el criterio "única por todos los ids de la ruta de los que depende lo que la vista escribe o muestra": solo este fallaba (§D-1, "Criterio de la `key`").
- **M-02:** el inventario del mecanismo M-2 estaba incompleto y decía, sin serlo, que `features/tareas` ya callaba. Inventario nuevo, por grep propio, en "Alcance" (M-2): entran en 06a tres sitios más de `features/clases` (crear y editar clase, y las subidas de anuncio y recurso) y seis de `features/tareas` (crear, editar y borrar tarea; entregar, anular y comentar en el hilo, por `avisarDelErrorDeLaEntrega`; la recarga fallida de la tarea; las subidas de la tarea y de la entrega). La descarga de `components/adjuntos` queda fuera, con destino. DH-04 lo lleva al humano con sus opciones. §D-3, R-03, el punto de ataque 2, CH6-A15 y CH6-A18 (nueva), "Mutaciones", "Se toca" y "No se toca" cambian en consecuencia.
- **M-03:** la lista cerrada y §D-R0 de 06b no tenían las pruebas que cambian de sentido con DH-03 (b). Repetí el grep por "pulsa la sección y cuenta peticiones" y miré el `staleTime` de cada cliente: CL3-2R2-10 cambia de sentido (C-9). PR-C18 (`muro-view.test.tsx:344`) y la de `muro-recuperar-c-r4.ataque.test.tsx:208-223`, que el manager señala, **deberían seguir en verde**: la lista de Avisos no usa el `staleTime` del cliente sino el suyo (`usePublicaciones`, `features/clases/hooks.ts:1023-1027`: 240 s, `TIEMPO_FRESCO_DEL_MURO_MS`), así que recién pedida está fresca aunque el cliente de la prueba no tenga `staleTime`. Las dejo en la lista cerrada y en §D-R0 como **condicionales** (solo si caen, con la reescritura ya redactada). Es un punto en que difiero de la revisión; lo dice R-09.
- **Recuento (DH-06):** 06a pasa de 25 a 32 archivos y 06b de 31 a 32. Las dos son "unos 30" (CHORE-04 cerró con 33). Alternativa en DH-06.
- **Decisiones para el humano:** DH-02 (el matiz del patrón), DH-04 (alcance de M-2), DH-05 (lo que el recorte deja fuera de su decisión del 2026-10-26 y la opción del manager), DH-07 (H-1) y DH-09 nueva (defensa del servidor). Cada una con mi recomendación y la del manager cuando difieren.
- **No bloqueantes:** las filas de `docs/ESTADO.md` se citan por su texto (N-02); §D-6 pide la barra solo si la trae (N-03); en `features/admin/hooks.ts` el cambio es quitar la definición y reexportar (N-04); CH6-A30 dice qué hacer si cae su precondición; el comentario de `conservaLaListaTrasLaPagina` y CH6-B11 ya no prometen que "no se pinta nada" ante un código que redirige; "Hermanos" suma la severidad que confirmó el manager.

**Enmienda 2 (2026-11-12): las nueve decisiones del humano y las dos observaciones de la verificación de la Enmienda 1 (`revision.md`). Sigue LISTO.** Cada cambio lleva la marca "Enmienda 2" donde no es solo quitar una variante.
- **Decisiones:** el humano eligió el 2026-11-12 la opción recomendada en las nueve (DH-01 (a), DH-02 (a), DH-03 (b), DH-04 (a), DH-05 (b), DH-06 (a), DH-07 (a), DH-08 normal, DH-09 (b)). La sección pasa a "Decisiones del humano (2026-11-12)", con una tabla de lo decidido y lo descartado, y el plan queda en firme: salen las variantes por decisión de §D-4, §D-5, CH6-B06, "Puntos de ataque", R-01, "Comprobación humana", A-1, A-2 y A-4. Las dos condicionales de M-03 (PR-C18 y C-10) no son decisiones y se quedan.
- **O-E1-1:** el destino de la descarga de `components/adjuntos` nombra el camino de la prop `alFallarLaDescarga`, que ya existe, desde `publicacion-del-muro.tsx` y `elemento-de-recurso.tsx` (tabla de M-2 y A-4).
- **O-E1-2:** el punto de ataque 5 suma `listaTraeLaClase` con una forma inesperada en la caché.
- **Cierre:** A-4 se alinea con la viñeta "Dos encargos nuevos que salen de CHORE-06" de `docs/ESTADO.md` §2b, que ya anotó el orquestador: no los vuelve a registrar, y cada fila de §3 que cambia de destino dice a cuál de los dos va. La defensa en el servidor no lleva fila en §3.
- **Conteos:** sin cambio. 06a, 32 archivos; 06b, 32 (hasta 34 si caen las dos condicionales).

## Preguntas bloqueantes

Ninguna. Las nueve decisiones que cambiaban la conducta visible o el alcance las tomó el humano el 2026-11-12 (sección siguiente).

## Decisiones del humano (2026-11-12)

(Enmienda 2) El humano eligió en las nueve la opción recomendada. El plan está escrito en firme con ellas; las opciones descartadas quedan solo como registro.

| DH | Tema | Decidido | Descartadas |
|---|---|---|---|
| DH-01 | Que lo abierto no pase de un id a otro | (a) `key` por sitio, única por todos los ids de la ruta (§D-1) | (b) una `key` en el `<Outlet>` de `ClaseLayout` |
| DH-02 | Fallo de una página de «Ver más» | (a) se conserva la lista solo ante el fallo de la página siguiente (§D-5) | (b) conservar también ante una recarga de fondo; (c) «Volver a cargar» en el `MensajeError`; (d) sin cambio |
| DH-03 | Pulsar la sección en la que ya se está | (b) vuelve a pedir si está en error o vieja (§D-4) | (a) solo en error; (c) siempre |
| DH-04 | Avisos mientras `apiClient` redirige | (a) callan `features/clases` y `features/tareas`, en 06a; la descarga de `components/adjuntos` queda fuera, con destino (§D-3) | (a′) `features/tareas` en una 06c; (b) solo `features/clases`; (c) dejarlo |
| DH-05 | Lo que queda fuera | (b) el foco al cambiar de ruta, encargo propio antes de DEPLOY; lo demás, `chore` de accesibilidad del marco después de DEPLOY (A-4) | (a) todo después de DEPLOY; (c) una 06c en este `chore` |
| DH-06 | Subentregas | (a) 06a de 32 y después 06b de 32 (§D-0) | (a′) con una 06c de 4; (b) una sola |
| DH-07 | Comprobación humana | (a) cuatro puntos, unos 8 minutos, al cerrar 06b | (b) sin comprobación |
| DH-08 | Carril | normal | sensible |
| DH-09 | Defensa en el servidor | (b) encargo propio después de DEPLOY (A-4) | (a) antes de DEPLOY; (c) no hacerla |

El razonamiento de cada una, con la postura del manager, está en el historial de este archivo (Enmienda 1) y en `revision.md`. Lo que sigue de esta sección es el detalle que el resto del plan cita.

- **DH-01 · Cómo deja de pasar lo abierto de un id a otro** (O-r1-1, O-E3-1, H-3 y los hermanos de §D-1).
  - **(a) Decidida.** `key` por el id de la ruta en cada vista o bloque que guarda estado local (formularios, confirmaciones, contadores), por debajo del elemento que la vista usa como raíz de foco; 16 sitios (§D-1). Conserva el foco de hoy: las listas de Avisos, Dudas, Actividades y Recursos siguen llevándolo a su `h2` al cambiar de clase (O-14 de 02c), y lo que se monta de nuevo lo deja en el título de la clase (como «Sí, regenerar» en CHORE-04) o en la raíz de la vista.
  - Para que los encargos que vienen (FORO-01) no lo olviden, una regla estática (CH6-A30) exige la `key` en toda vista nueva de la clase.
- **DH-02 · Qué ve la persona cuando falla una página de «Ver más»** (P-1 de CHORE-04, O-E4-1). Hoy, en las listas de `features/clases`, la lista ya cargada se reemplaza por «Algo salió mal. Inténtalo de nuevo.» y desaparece el botón: la frase pide repetir algo que ya no está.
  - **(a) Decidida.** Ante el fallo de la página siguiente (red, `5xx`), la lista se queda como estaba, un solo aviso dice el error y «Ver más» sigue ahí para repetir. El cursor vencido (`400`) y un error que quita el acceso siguen reemplazando la lista con su frase. Es lo que ya hacen Recursos (CLASES-03d), Entregas (ENTREGAS-01e) y Mis calificaciones (CALIFICACIONES-01d). Una recarga de fondo que falla sigue como hoy (T-04 de 02c). Patrón nuevo en `DESIGN.md` §7.10, con marca "propuesta (CHORE-06b)".
  - (Enmienda 1, matiz del manager) Recursos, Entregas y Mis calificaciones conservan la lista **también** cuando falla una recarga de fondo; (a) solo ante la página siguiente. El texto de `DESIGN.md` (A-2) no dice que sea "el mismo" patrón.
- **DH-03 · Qué hace pulsar la sección en la que ya se está** ("una sola política de recarga", N-54).
  - **(b) Decidida.** Vuelve a pedir la lista si está en error **o vieja** (marcada vieja por una acción, o pasados los 30 s del `staleTime`); sana y fresca no pide nada, y nunca cancela ni duplica lo que vuela. Cierra O-03 de CLASES-03c2 (los conteos viejos tras «Subir»/«Bajar») sin pedir de más.
  - Calificaciones (gradebook y Mis calificaciones) conserva su conducta de T-08 (vuelve a la ventana inicial y pide), y las vistas de `features/admin`, `/admin/clases` y "Clases anteriores" conservan la suya (`useVolverAPedirSiFallo` y su par): ya cumplen sus frases con casos probados. Se registran como variantes de la misma política (§D-4).
- **DH-04 · Avisos mientras `apiClient` ya saca a la persona de la página** (Enmienda 1: el inventario completo está en "Alcance", M-2).
  - **(a) Decidida.** Callan, en 06a, todos los sitios de `features/clases` y de `features/tareas` que hoy avisan ante `401` sin refresco, `403 ACCESO_RESTRINGIDO` o `403 CAMBIO_DE_CONTRASENA_REQUERIDO`: los 13 ganchos, «Unirme a la clase», crear y editar clase, las subidas de anuncio y recurso, los cinco avisos de recarga de `features/clases`; y en `features/tareas`, crear, editar y borrar tarea, entregar, anular y comentar en el hilo, la recarga fallida de la tarea y las subidas de la tarea y de la entrega. Como ya callan CLASES-03, ADMIN-01, `features/calificaciones` y, en `features/tareas`, calificar, la descarga y los «Ver más». Queda fuera la descarga de `components/adjuntos` sin `alFallarLaDescarga` (Avisos y Recursos), con destino (M-2).
  - También fuera: O-r1-6 de CHORE-03 (los formularios de `auth` y `admin` pintan su `MensajeError` ese instante). En `auth`, `apiClient` no redirige ante `NO_AUTENTICADO` en `/login` y las demás pantallas sin sesión (`RUTAS_SIN_SESION`), así que callar por código dejaría a la persona sin mensaje; necesita su propio diseño (DH-05).
  - La descarga queda fuera porque callarla en `components/adjuntos` exige importar `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` fuera de los cuatro `lib.ts` de los módulos (lo prohíbe `services/apiClient-ch3-r1.ataque.test.ts:83-88`, N-46 de CHORE-03) o pasarle la prop `alFallarLaDescarga` (que ya existe) desde los componentes de `features/clases`; y solo cae ahí si la sesión se pierde justo en ese clic. Destino en "Alcance" (M-2) y A-4.
- **DH-05 · Lo que queda fuera de CHORE-06, con su destino.** **(b) Decidida.** Lo que es uniformidad interna o pulido de foco sin daño para la persona va a un `chore` de accesibilidad del marco **después de DEPLOY** (con comprobación con lector de pantalla), salvo lo que ya tiene otro destino; el foco al cambiar de ruta va a un **encargo propio antes de DEPLOY** (los dos ya están en `docs/ESTADO.md` §2b, hoja de ruta vigente). Lista completa en "Alcance", "No entra". Lo principal:
  - unificar el seguimiento del foco de la ventana (`useFilaEnFoco`, `useFocoAlCargarMas`, `useFocoDeLaLista` con `document.hasFocus()` frente a `useFocoAlPerderseElControl` con el elemento activo; M-14/O-20 de CLASES-02d y la divergencia de TAREAS-01d);
  - el foco al cambiar de ruta en la SPA (queda en `<body>` al cambiar de sección o abrir una tarea) y los cinco puntos de "Foco tras navegar o reemplazar la vista" de ADMIN-01;
  - la regla única de foco ante un `400` de campo y en la primera carga (O-1/O-2 de CLASES-03e), O-7/O-8 de CLASES-03e, el punto 9 de CALIFICACIONES-02b;
  - O-r1-6 de CHORE-03 y O-r1-1 de CLASES-03e;
  - `useTemasDelRecurso` (CL3-3R3-02) y el componente `AlPulsarLaSeccionActiva` de `features/admin` (ADMIN-01g).
  - **Lo que el recorte deja fuera de lo que el humano fijó el 2026-10-26** (ESTADO 2b, "Dos `chore` después de ADMIN", (b)): "los ganchos de foco unificados" y el foco al cambiar de ruta; y el punto (3) de la fila "Foco tras navegar o reemplazar la vista, de ADMIN-01", asignado a este `chore` por E12-17. El humano lo aceptó con esta decisión.
- **DH-06 · Subentregas.** **(a) Decidida:** 06a (32 archivos: lo destructivo y los avisos de más, con `features/tareas`) y después 06b (32 archivos: recargas, «Ver más» y frases de recuperación). Las dos son "unos 30", como CHORE-04 (33).
- **DH-07 · Comprobación humana en navegador.** **(a) Decidida:** cuatro puntos, unos 8 minutos, al cerrar 06b ("Comprobación humana"): lo que jsdom no ve es el historial real del navegador, el anuncio del lector de pantalla y el corte de red. H-1 se llega manteniendo presionado «Atrás», como H-2 (N-01).
- **DH-08 · Carril normal (decidido).** No toca `middleware/`, `adapters/auth`, sesiones, contraseñas, migraciones, `infra/`, estado de pago ni restricción de acceso. DH-04 cambia qué avisa un gancho cuando `apiClient` redirige, pero no toca `services/apiClient.ts`, el refresco del token ni la redirección.
- **DH-09 · Defensa en el servidor.** **(b) Decidida:** encargo propio después de DEPLOY (ya en `docs/ESTADO.md` §2b). Hoy el servidor acepta una calificación o una edición armada para otra fila si la versión coincide, y casi siempre coincide (empieza en 0 en cada fila); editar clase no lleva versión. CHORE-06a cierra la causa en el cliente y ningún hermano exige un cambio del servidor para cerrar este encargo. La segunda red de seguridad (que el cuerpo traiga el id de la fila, o una versión que no se repita entre filas) cambia el contrato de `shared/` y del backend: otro encargo y otro carril.

## Suposiciones

- **S-01 · "Mismo id, otra clase" es el caso de daño.** Las filas con `key` por un id de una sola clase (publicaciones, comentarios, dudas, recursos, temas) ya se montan de nuevo al cambiar de clase. El daño aparece donde la `key` no es única por el id de la ruta (personas que están en las dos clases: lección 3 de CHORE-04) o donde no hay `key` (formularios y confirmaciones de la vista). §D-1 los revisa todos con ese criterio.
- **S-02 · Se llega con un salto del historial y la clase, tarea, alumno o recurso de destino en caché.** Si el destino no está en caché, `ClaseLayout` (o la vista) pinta «Cargando» y todo se monta de nuevo: ya es seguro. Por eso cada caso de §D-1 se prueba con el destino en caché (`gcTime` de 5 min).
- **S-03 · Volver a la clase de origen con la petición en vuelo** (por ejemplo, el retiro de un maestro) monta los controles de nuevo, sin espera, y pedir la acción otra vez exige volver a confirmar: es una acción nueva y deliberada (S-01 de CHORE-04, decidida por el humano). El servidor responde con su error y su aviso. No se agrega `mutationKey` ni lectura de la caché de mutaciones a esos controles.
- **S-04 · Ninguna respuesta de la clase, tarea, alumno o recurso anterior navega, reinicia un formulario ni mueve el foco en la vista del nuevo.** Su aviso sí sale, uno solo, y renueva lo de su id (sus ganchos conservan las opciones con que se crearon: `mutationObserver.js:61-62` de `@tanstack/query-core` 5.103.2, ya documentado en S-07 de CHORE-04).
- **S-05 · Los textos no cambian.** Los avisos de «Ver más» usan la traducción de consultas del módulo (`mensajeDeConsultaClases`: «Algo salió mal. Inténtalo de nuevo.» o el de red), como Recursos. No hay texto nuevo que aprobar.
- **S-06 · "Pulsar la sección activa" incluye pulsar «Inicio» de la barra estando en el inicio y ir atrás o adelante a otra entrada de la misma ruta.** Las tres cambian `location.key` sin desmontar la vista; las tres llegan por `useAlPulsarLaSeccionActiva`.

## Alcance

### Inventario heredado, verificado contra `47c3339`

Rutas relativas a `frontend/src/`. "Fila" es la línea de `docs/ESTADO.md` §3 en el árbol de trabajo del 2026-11-12, solo como referencia: (Enmienda 1, N-02) en `47c3339` van 3 líneas antes y el árbol puede moverse, así que **las filas se identifican por su texto** (la columna "Pendiente"), no por el número; así las ubica el orquestador en A-3 y A-4. Destino: 06a, 06b, **fuera** (DH-05) o **ya resuelta**.

| Fila | Pendiente | Dónde está hoy | Destino |
|---|---|---|---|
| 348 | **O-r1-1 (prioritario):** la confirmación de «Sí, quitar» de un maestro (`FilaMaestro`) o de un alumno (`FilaAlumno`) pasa abierta de la clase A a la B si la persona está en las dos; un clic la retira de B | `features/clases/components/lista-maestros-de-clase.tsx:34` y `:174` (`key={maestro.id}`); `components/tabla-alumnos.tsx:40` y `:228` (`key={alumno.id}`). Las dos vistas no llevan `key`: `maestros-de-clase-view.tsx:119`, `alumnos-view.tsx:27` | 06a (§D-1) |
| 348 | H-3: `useRetirarMaestro` (`hooks.ts:670`) sin `mutationKey`; la respuesta de A corre con las opciones de B, la lista de A no se marca vieja y «Sí, quitar» de B espera por A | `maestros-de-clase-view.tsx:29` (el gancho vive en `MaestrosDeLaClase`, que sobrevive) | 06a: con la `key` de la vista, el observador de A se suelta y su mutación conserva las opciones de A (S-04) |
| 348 | O-E3-1: la confirmación de borrar de `AccionesDeLaTarea` pasa abierta a otra tarea | `features/tareas/detalle-tarea-view.tsx:134`; estado en `components/acciones-de-la-tarea.tsx:42-44` | 06a |
| 348 | O-E3-1: «Nuevo tema» (`creando`) pasa abierto a otra clase | `features/clases/trabajo-view.tsx:82` y `:85` | 06a |
| 347 y 360 | Aviso de más mientras `apiClient` redirige: 12 entradas (13 ganchos) de `features/clases/hooks.ts` y «Unirme a la clase» | `hooks.ts:665` (asignar), `:684` (retirar), `:815` (agregar), `:838` (quitar alumno), `:1059` (crear anuncio), `:1080` (borrar publicación), `:1131` (comentar), `:1152` (borrar comentario), `:1342` y `:1344` (`avisarErrorDelTema`: crear y renombrar tema), `:1414` (borrar tema), `:1474` (ordenar temas), `:2015` (guardar categorías); `components/formulario-unirse-clase.tsx:53-57` | 06a (DH-04) |
| 346 | H-2: siete `refetch()` de "pulsar la sección activa" sin `cancelRefetch: false` | `dudas-view.tsx:57-60`, `muro-view.tsx:66-69`, `recursos-view.tsx:72-75`, `trabajo-view.tsx:115-118`, `components/seccion-de-recursos.tsx:81-84`, `components/respuestas-de-duda.tsx:166-169`, `components/seccion-de-tema.tsx:63-66` | 06b (§D-4) |
| 445 | N-54: "queda el resto del inventario" de las frases que se cumplen pulsando la sección | las siete de arriba ya llaman a `useAlPulsarLaSeccionActiva`; **faltan**: comentarios (`components/comentarios-de-publicacion.tsx`), Personas (`personas-view.tsx`), el roster (`components/tabla-alumnos.tsx`) y los dos inicios (`inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`), que no reaccionan a `location.key` | 06b |
| 384 | O-03 de CLASES-03c2: tras «Subir»/«Bajar» con la recarga por sección fallida, la lista queda vieja y pulsar la sección no la pide | `trabajo-view.tsx:115-118` (solo pide en error) | 06b, con DH-03 (b) |
| 397 | Hermano de T-02 de CLASES-03e: abrir los comentarios o «Ver más comentarios» de una publicación que otra persona borró pinta «Esa publicación ya no existe.» sin renovar la lista | `components/comentarios-de-publicacion.tsx:169-178`; el remedio de Dudas es `useRenovarSiLaDudaYaNoEsta` (`hooks.ts:1789`) | 06b |
| 397 | P-1 y O-E4-1: tras el fallo de una página de «Ver más comentarios» o «Ver más clases» la lista se reemplaza por su `MensajeError` sin control para repetir; el título de `BloqueDestacado` dice "No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo." | `comentarios-de-publicacion.tsx:170`, `components/panel-mis-clases.tsx:31`, `inicio-estudiante-view.tsx:44`, `inicio-maestro-view.tsx` (mismo patrón) | 06b (DH-02) |
| 446 | N-52: la ventana vacía del gradebook no se marca vieja | `features/calificaciones/hooks.ts:78-93` (excluye la ventana a la vista) y `gradebook-view.tsx:86-90` | 06b |
| 361 | ADMIN-01d2: la barra lateral y los inicios siguen trayendo una clase que la sesión acaba de leer archivada | `hooks.ts:427-443` (`useClaseArchivadaEnSuLista` solo quita "Clases anteriores") | 06b |
| 415 | O-r1c-2 de CALIFICACIONES-01c: `EntregaDelAlumno` sin `key` por `alumnoId`. ESTADO dice "hoy no se alcanza"; **sí se alcanza** con un salto del historial entre dos entregas en caché (S-02), de otro alumno en la misma tarea o (Enmienda 1, M-01) del mismo alumno en otra tarea | `features/tareas/entrega-de-alumno-view.tsx:61-158` (`PanelDeCalificacion` con `key={reinicios}`) | 06a (hermano destructivo, §D-1) |
| 416 | La nota "`GradebookView` no la necesita": el salto del historial entre las calificaciones de dos clases conserva las ventanas de la otra | `features/calificaciones/gradebook-view.tsx:53` y `:222` | 06a (hermano, §D-1) |
| 400, 447 | Seguimiento del foco divergente (TAREAS-01d) y copiado en tres ganchos (M-14/O-20 de CLASES-02d) | `features/clases/hooks.ts:865` (`useFilaEnFoco`), `components/foco/hooks.ts:97` (`useFocoAlCargarMas`), `components/layout/hooks.ts:25` (`useFocoDeLaLista`) con `document.hasFocus()`; `components/foco/hooks.ts:23` con el elemento activo | fuera (DH-05) |
| 444 | Foco al cambiar de ruta en la SPA | `features/clases/clase-layout.tsx:52` (la clave solo cambia con la clase) | fuera (DH-05) |
| 362 | Foco tras navegar o reemplazar la vista (ADMIN-01, cinco puntos) | revisiones de ADMIN-01c, 01d1 y 01d2 | fuera (DH-05) |
| 391, 394 | O-1/O-2 y O-7/O-8 de CLASES-03e | `dudas-view.tsx`, `components/elemento-de-duda.tsx`, `components/respuestas-de-duda.tsx` | fuera (DH-05) |
| 392 | O-r1-1 de CLASES-03e: en Dudas, una recarga fallida desmonta un bloque de respuestas con lo escrito | `dudas-view.tsx:111-117` | fuera (DH-02 (a)) |
| 376 | O-r1-6 de CHORE-03: formularios de `auth` y `admin` pintan su `MensajeError` mientras `irA` recarga | 11 componentes | fuera (DH-04, DH-05) |
| 387 | `useTemasDelRecurso`: dos peticiones en lugar de una (CL3-3R3-02) | `hooks.ts:1180` | fuera (carril trivial, como dice la fila) |
| 398 | Hermano de O-16: `useGuardarCategorias` no da mensaje ante un error de fila con el editor desmontado | `hooks.ts:1994-2020` | fuera (carril trivial la próxima vez que se toque el editor; no es de navegación) |
| 526 | Punto 9 de CALIFICACIONES-02b (`dataUpdatedAt` en el mismo milisegundo) | `components/foco/lib.ts:8-15` | fuera (prácticamente inalcanzable; `useQuery` no expone `dataUpdateCount`) |
| 356 | `AlPulsarLaSeccionActiva` de `features/admin` montado solo con router | `features/admin/components/registrados-del-enlace.tsx:40-49` | fuera (sin cambio de conducta; se sube cuando otro módulo lo use) |
| 509 | "Ver más clases" tras un `400` del cursor muestra "no es válido" | **Ya resuelta:** `inicio-estudiante-view.tsx:56` usa `mensajeDeErrorDeLista(…, TEXTOS_PANEL.cambioMientrasLasVeias)` ("Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas.", `data.ts:158`). El orquestador cierra la fila (A-3) | — |

### Hermanos que faltaban (grep del arquitecto, por mecanismo)

**Mecanismo M-1, "estado local de una vista que sobrevive al cambio de un id de la ruta".** Búsqueda: todas las rutas con un id (`app/router.tsx:84-202`: `:claseId`, `:tareaId`, `:alumnoId`, `:recursoId`, `:usuarioId`), cada vista que las pinta (`<ConClaseDeLaRuta>` en 21 sitios de `src/features`) y cada `useState` de los componentes que pintan (`rg "useState[<(]" src/features/{clases,tareas,calificaciones} -g '!*.test.*'`). Criterio de la lección 3 de CHORE-04: la `key` tiene que ser única por el id de la ruta, no solo existir.

| Vista (ruta) | Estado que pasa | Daño | ¿Tiene `key` por el id? |
|---|---|---|---|
| Personas del admin (`maestros-de-clase-view.tsx`) | confirmación de quitar, búsqueda, mutación de retirar | retira a un maestro de la clase equivocada | No (O-r1-1) |
| Personas del maestro y del admin (`alumnos-view.tsx`) | confirmación de quitar, búsqueda | retira a un alumno de la clase equivocada | No (O-r1-1) |
| Detalle de tarea (`detalle-tarea-view.tsx`) | confirmación de borrar (`AccionesDeLaTarea`), archivos y enlaces elegidos de la entrega (`FormularioDeEntrega`), confirmación de anular (`EntregaRealizada`), texto del hilo privado (`HiloPrivado`) | borra otra tarea; entrega en otra tarea lo elegido para la primera | No (O-E3-1 y hermanos) |
| Entrega de un alumno (`entrega-de-alumno-view.tsx`; ruta `tareas/:tareaId/entregas/:alumnoId`) | puntos y versión del panel de calificación, texto del hilo privado del maestro | **califica a otro alumno, o al mismo en otra tarea, con lo escrito para el primero** (la versión empieza en 0 en cada fila, así que lo normal es que coincida y el `PUT` se acepte); manda a otro hilo un mensaje privado | No (O-r1c-2). Enmienda 1 (M-01): la `key` tiene que ser por `tareaId` **y** `alumnoId` |
| Editar tarea (`editar-tarea-view.tsx`) | lo escrito y la versión de apertura | **guarda en la tarea B lo escrito para A** si las versiones coinciden; si no, `409` y se pierde lo escrito | No |
| Editar recurso (`editar-recurso-view.tsx`) | ídem | ídem, en un recurso | No |
| Crear tarea (`crear-tarea-view.tsx`) | lo escrito, con tema y categoría de A | crea en B una tarea escrita para A | No |
| Editar clase (`editar-clase-view.tsx`) | nombre y descripción de A | **escribe en B el nombre de A** | No |
| Avisos (`muro-view.tsx`) | el anuncio que se escribía (`FormularioPublicacion`) | publica en B el anuncio de A | No |
| Dudas (`dudas-view.tsx`) | la duda que se escribía (`FormularioDuda`) | la publica en B | No |
| Recursos (`recursos-view.tsx:181`) | el recurso que se escribía (`FormularioRecurso` en modo crear) | lo publica en B | No |
| Actividades (`trabajo-view.tsx`) | «Nuevo tema» abierto | crea el tema en B | No (O-E3-1) |
| Calificaciones del maestro (`gradebook-view.tsx`) | ventanas y cursores de la otra clase | pide la ventana de A con el cursor de B y muestra "La clase cambió…" | No |
| Mis calificaciones (`mis-calificaciones-view.tsx`) | el filtro elegido en la otra clase | ninguno (el filtro vale en B); se incluye por la regla de CH6-A30 | No |
| Personas del alumno (`personas-view.tsx:190`) | ninguno | ninguno; se incluye por la regla de CH6-A30 | No |
| Categorías (`categorias-view.tsx`) | — | — | **Sí**: `EditorDeCategorias key={claseId}` (`:47`); la vista suma la suya por CH6-A30 |
| Duplicar clase (`duplicar-clase-view.tsx:32`) | — | — | **Sí** |
| Ficha de una cuenta (`features/admin/usuario-view.tsx:107`) | — | — | **Sí**: `FichaDeLaCuenta key={usuarioId}` debajo de la raíz de foco. Es el precedente de la forma "marco y contenido" de §D-1 |
| Mis calificaciones de una clase anterior (`clase-anterior-view.tsx:75`) | — | — | **Sí**: `<Outlet key={claseId} />` |
| Entregas de una tarea (`features/tareas/entregas-view.tsx`) | ninguno (sin `useState`; la lista va en la clave de la consulta) | — | No hace falta |
| Encabezado de la clase (`CodigoDeClase`, `AvisoDeClaseArchivada`) | — | — | Resueltos en CHORE-04 (§D-4 bis y ter) |
| Filas de publicaciones, comentarios, dudas, respuestas, recursos y temas | — | — | **Sí**: `key` por un id de una sola clase |

**Severidad de los hermanos de M-1 (Enmienda 1, confirmada por el manager en el código).** Se llega con un salto del historial de más de una entrada (mantener presionado «Atrás» y elegir), entre dos entradas del mismo patrón de ruta con otro id y el destino en caché; ningún enlace de la app lleva directo de un id al otro, así que la frecuencia es baja aunque el daño sea real.
- **Alta:** calificar a otro alumno, o al mismo en otra tarea (O-r1c-2 y M-01: la versión de cada entrega empieza en 0 y casi siempre coincide); editar una tarea o un recurso en el id equivocado (la versión también empieza en 0: dos tareas sin editar comparten la 0 y el `PUT` sobrescribe la otra); quitar a un maestro o a un alumno de la clase equivocada (O-r1-1, ya prioritario).
- **Media-alta:** editar la clase equivocada (admin): `FormularioClase` no lleva versión y el `PUT` con el nombre de A a B siempre se acepta.
- **Media:** crear una tarea o publicar un anuncio, una duda o un recurso en la clase equivocada (visible para los alumnos de B y reversible; con un tema o una categoría de A, probablemente el servidor lo rechace).
- **Baja:** el gradebook con los cursores de otra clase (solo muestra "La clase cambió…"; no escribe nada). El filtro de Mis calificaciones no es daño: entra solo por la regla CH6-A30.
- **Ninguno exige un cambio del servidor para cerrar este encargo:** la causa es del cliente y la `key` la elimina. La defensa en el servidor, como segunda red, es DH-09.

**Mecanismo M-2, "aviso de un error con que `apiClient` ya redirige"** (Enmienda 1, M-02: inventario rehecho). Búsqueda: `rg "toast\.error\(|errorQueRedirigeElCliente\(|avisoDeFalloAlSubir\(" src -g '!*.test.*'` en todo `src/` salvo `features/auth` (O-r1-6, fuera) y `features/diagnostico`, y por cada aviso de error de una mutación, una subida, una descarga o una recarga, si consulta antes `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (por `errorQueRedirigeElCliente` de su módulo). **La versión anterior del plan decía que `features/tareas` ya callaba: era falso** (solo callan calificar, `hooks.ts:533`, la descarga de las vistas de la tarea, `:310`, y los «Ver más» de `entregas-view.tsx:110` y `hilo-privado.tsx:177`). `features/calificaciones` (`exportar-a-excel.tsx:57`, `mis-calificaciones-view.tsx:129`) y `features/admin` sí callan.

| Módulo | Sitio (aviso que no calla) | Qué avisa | Destino |
|---|---|---|---|
| `features/clases` | `hooks.ts`: los 13 ganchos de la fila 347 (líneas en el inventario de arriba) | mutaciones | 06a |
| `features/clases` | `components/formulario-unirse-clase.tsx:55` | unirse | 06a |
| `features/clases` | `useAvisoDeRecargaFallida` (`hooks.ts:1271`) en sus cinco llamadores: `categorias-view.tsx:36`, `recursos-view.tsx:63`, `trabajo-view.tsx:106`, `editar-recurso-view.tsx:88`, `components/seccion-de-recursos.tsx:64` | recargas | 06a |
| `features/clases` | `components/formulario-clase.tsx:81` (`alFallar` de crear y editar clase; su hermano `formulario-duplicar-clase.tsx:68` ya calla) | mutación | 06a (nuevo) |
| `features/clases` | `components/formulario-publicacion.tsx:126` y `components/formulario-recurso.tsx:213` (la subida: un `401` o `403` de la solicitud de subida, por `avisoDeFalloAlSubir`) | subidas | 06a (nuevo) |
| `features/tareas` | `hooks.ts:190` (`useCrearTarea`), `:214` (`useEditarTarea`), `:246` (`useBorrarTarea`) | mutaciones | 06a (nuevo; DH-04) |
| `features/tareas` | `hooks.ts:359-374` (`avisarDelErrorDeLaEntrega`), que llaman `useEntregar` (`:398`), `useAnularEntrega` (`:419`) y `useComentarEnHilo` (`:463`); `useCalificarEntrega` (`:545`) ya calla antes, en `:533` | mutaciones | 06a (nuevo; DH-04) |
| `features/tareas` | `hooks.ts:288-301` (`useAvisoDeRecargaFallida` de tareas), con sus llamadores en el detalle (`detalle-tarea-view.tsx:53`), la edición (`editar-tarea-view.tsx:69`), las entregas (`entregas-view.tsx:59`) y la entrega de un alumno (`entrega-de-alumno-view.tsx:98`) | recargas | 06a (nuevo; DH-04): se corrige dentro del gancho, sin tocar los llamadores |
| `features/tareas` | `components/formulario-tarea.tsx:226` y `components/formulario-de-entrega.tsx:135` (las subidas) | subidas | 06a (nuevo; DH-04) |
| `components/adjuntos` | `adjuntos-de-publicacion.tsx:77` (la descarga sin `alFallarLaDescarga`: la de Avisos y Recursos) | descarga | **fuera** (DH-04): callarla exige importar `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` fuera de los cuatro `lib.ts` de módulo (lo fija `services/apiClient-ch3-r1.ataque.test.ts:83-88`, N-46 de CHORE-03) o una prop nueva por dos componentes de `features/clases`. Destino: ESTADO §3, el `chore` de accesibilidad del marco o el próximo encargo que toque `components/adjuntos` (ENVIVO, por las grabaciones), lo que llegue antes. (Enmienda 2, O-E1-1) El camino previsto es la prop `alFallarLaDescarga`, que ya existe: pasarla desde `publicacion-del-muro.tsx` y `elemento-de-recurso.tsx` (A-4) |
| — | No son de este mecanismo: `features/tareas/components/acciones-de-la-tarea.tsx:88` (solo `409 TAREA_CON_ENTREGAS`), `components/formulario-tarea.tsx:244` (solo errores de campo, con el formulario desmontado), `entrega-de-alumno-view.tsx:131` y `:137` (ya calla en `:130`; `:137` es el `catch` de un `refetch`, que no lanza), `codigo-de-clase.tsx:44` y `:52` (copiar al portapapeles, sin API) | — | — |

**Mecanismo M-3, "pulsar la sección activa" (y sus variantes).** Búsqueda: `rg "useAlPulsarLaSeccionActiva\(" src -g '!*.test.*'` da 16 llamadas en cuatro formas:
1. siete de `features/clases` con `if (!q.isError) return; void q.refetch()` (H-2);
2. `features/admin` (`useVolverAPedirSiFallo`, `hooks.ts:234`: en error y sin petición en vuelo, `resetQueries`) en cinco vistas;
3. `/admin/clases` y "Clases anteriores" (`useRecuperarListaDeClasesAdmin`, `hooks.ts:450`, y `useRecuperarListaDeClasesAnteriores`, `hooks.ts:402`: en error, `resetQueries`, **sin mirar si ya se está pidiendo**: el hermano de T-07 de ADMIN-01g, que `useVolverAPedirSiFallo` ya corrigió);
4. Calificaciones (`gradebook-view.tsx:86`, `mis-calificaciones-view.tsx:109`: siempre, sin cancelar).

Al desmontarse, solo `features/admin` (`useMarcarViejaSiQuedoEnError`, `hooks.ts:219`) y las dos listas de (3) (`removeQueries`) atienden la consulta en error. En `features/clases`, una lista con datos y en error **no** se vuelve a pedir al volver antes de 30 s (no está vieja): la frase "Inténtalo de nuevo" no se cumple por ese camino. Es parte de 06b (§D-4).

**Mecanismo M-4, "falla la página siguiente".** Búsqueda: `rg "fetchNextPage\(" src -g '!*.test.*'` da 20 llamadas. Conservan la lista y avisan: Recursos (`seccion-de-recursos.tsx:61-69`), Entregas (`features/tareas/entregas-view.tsx:99-118`), el hilo privado (`features/tareas/components/hilo-privado.tsx:171`) y Mis calificaciones (`mis-calificaciones-view.tsx:113-147`). Reemplazan la lista por su `MensajeError`: en `features/clases`, Avisos, comentarios, Dudas, respuestas, los temas de Actividades (`seccion-de-tema.tsx:88`), Personas, el roster y los dos inicios (9 listas); en `features/admin` y `/admin/clases`, sus cinco tablas, "Clases anteriores" y las dos listas de clases del admin (con su recuperación probada en ADMIN-01, ADM-1F17 y ADM-1D204). 06b cambia solo las 9 de `features/clases` (DH-02).

### Entra

**CHORE-06a · lo que pasa de un id a otro y los avisos de más (32 archivos; Enmienda 1).**
- M-1 en los 16 sitios de la tabla con "No" y daño o regla (§D-1), con la regla estática CH6-A30.
- M-2: todo lo de la tabla de M-2 con destino 06a (§D-3; DH-04): en `features/clases`, los 13 ganchos, «Unirme a la clase», los cinco llamadores de `useAvisoDeRecargaFallida`, crear y editar clase y las dos subidas; en `features/tareas`, sus tres mutaciones de la tarea, `avisarDelErrorDeLaEntrega`, su `useAvisoDeRecargaFallida` y sus dos subidas.

**CHORE-06b · recargas, «Ver más» y frases de recuperación (32 archivos; Enmienda 1).**
- M-3: un solo gancho de "pulsar la sección activa" con la política de DH-03, y la consulta en error marcada vieja al salir, en las 12 listas de `features/clases` (§D-4); el hermano de T-07 en las dos de (3).
- M-4: el fallo de la página siguiente en las 9 listas de `features/clases` (§D-5; DH-02).
- El hermano de T-02 de CLASES-03e en los comentarios (§D-5).
- N-52 en el gradebook y la fila 361 (barra lateral e inicios con una clase archivada) (§D-6).

### No entra

- Lo de la columna "fuera" del inventario (DH-05), con su destino.
- `features/admin`, `/admin/clases`, "Clases anteriores", `features/tareas` y `features/calificaciones` en M-3 y M-4: ya cumplen sus frases con casos probados (variantes registradas en §D-4), salvo el hermano de T-07 en (3), N-52 y la `key` de §D-1.
- `components/foco/`, `components/clase/`, `components/layout/`, `services/`, `app/` y `clase-layout.tsx`: no cambian.
- Textos de la interfaz: ninguno nuevo (S-05).
- (Enmienda 1) M-2 en la descarga de `components/adjuntos/adjuntos-de-publicacion.tsx:77`, con destino (tabla de M-2; DH-04).

## Diseño

### §D-0 · Dos subentregas (conteo y orden)

Rutas relativas a `frontend/src/`.

| Grupo | CHORE-06a | CHORE-06b |
|---|---|---|
| Producción `features/clases` | 16: `maestros-de-clase-view.tsx`, `alumnos-view.tsx`, `personas-view.tsx`, `editar-clase-view.tsx`, `categorias-view.tsx`, `muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `editar-recurso-view.tsx`, `components/seccion-de-recursos.tsx`, `components/formulario-unirse-clase.tsx`, `hooks.ts`; (Enmienda 1, M-02) `components/formulario-clase.tsx`, `components/formulario-publicacion.tsx`, `components/formulario-recurso.tsx` | 14: `muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `personas-view.tsx`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `components/seccion-de-recursos.tsx`, `components/seccion-de-tema.tsx`, `components/respuestas-de-duda.tsx`, `components/comentarios-de-publicacion.tsx`, `components/tabla-alumnos.tsx`, `hooks.ts`, `lib.ts` |
| Producción `features/tareas` | 7: `crear-tarea-view.tsx`, `detalle-tarea-view.tsx`, `editar-tarea-view.tsx`, `entrega-de-alumno-view.tsx`; (Enmienda 1, M-02) `hooks.ts`, `components/formulario-tarea.tsx`, `components/formulario-de-entrega.tsx` | 0 |
| Producción `features/calificaciones` | 2: `gradebook-view.tsx`, `mis-calificaciones-view.tsx` | 2: `gradebook-view.tsx`, `hooks.ts` |
| Producción compartida | 0 | 3: `components/seccion/hooks.ts`, `components/seccion/types.ts` (nuevo), `features/admin/hooks.ts` (Enmienda 1, N-04: se quita la definición de `useMarcarViejaSiQuedoEnError` y de `marcarViejaSiQuedoEnError`, y se reexporta el gancho movido; §D-4) |
| Pruebas nuevas | 4: `app/estado-por-id-ch6.test.tsx`, `features/clases/avisos-al-redirigir-ch6.test.tsx`, `lib/estado-por-id-estatico-ch6.test.ts`; (Enmienda 1) `features/tareas/avisos-al-redirigir-ch6.test.tsx` | 4: `components/seccion/recargas-ch6.test.tsx`, `features/clases/recargas-ch6.test.tsx`, `features/clases/ver-mas-ch6.test.tsx`, `features/calificaciones/gradebook-ch6.test.tsx` |
| Pruebas normales de la lista cerrada | 1: `features/clases/guardas-ch4.test.tsx` | 2: `features/clases/ver-mas-y-orden-ch4.test.tsx`, `features/clases/personas-view.test.tsx` |
| `*.ataque` (C-n del tester, §D-R0) | 2 | 7 (Enmienda 1: suma C-9) |
| **Total** | **32** | **32** |

(Enmienda 1) Las pruebas condicionales de la lista cerrada y de §D-R0 de 06b (PR-C18 y la de `muro-recuperar-c-r4.ataque`) no se cuentan: se espera que sigan en verde; si caen, suman hasta dos archivos a 06b (34), que sigue sin partirse: son reescrituras de una aserción ya redactadas aquí.

- **Por qué dos.** Juntas pasan de 50 (regla de unos 30, decisión del humano del 2026-11-04). El corte va por mecanismo: 06a es M-1 y M-2 (lo destructivo y los avisos), 06b es M-3 y M-4 (recargas y «Ver más»). Las dos comparten ocho archivos de producción (`muro-view.tsx`, `dudas-view.tsx`, `recursos-view.tsx`, `trabajo-view.tsx`, `personas-view.tsx`, `components/seccion-de-recursos.tsx`, `hooks.ts` de `features/clases` y `gradebook-view.tsx`), que 06b vuelve a tocar en otras líneas.
- **Por qué 06a primero.** Es lo destructivo (O-r1-1 prioritario, calificar o editar en el id equivocado) y no depende de 06b. 06b parte del commit de 06a: sus pruebas de caminos montan las vistas ya con la `key`.
- `CLAUDE.md`, `docs/DESIGN.md` y `docs/ESTADO.md` los cambia el orquestador al cierre de cada subentrega (A-1 a A-4), fuera del conteo.

### §D-1 · M-1: lo abierto es del id de la ruta (06a)

**El estado.** `ConClaseDeLaRuta` lee `:claseId` y `ClaseLayout` pinta `<Outlet />` sin `key` (`clase-layout.tsx:90`); las vistas de tarea, entrega y recurso leen su id con `useParams`. Con un salto del historial a la misma ruta con otro id, y el destino en caché (S-02), la instancia sobrevive y su estado local también.

**Resultado que se fija** (CH6-A01 a CH6-A16):
- ninguna confirmación, formulario ni bloque abierto para un id aparece en otro; lo escrito para un id no se ve ni se envía en otro;
- ningún control del id nuevo espera por una petición del anterior;
- la respuesta del anterior renueva lo suyo y da su único aviso; no navega, no reinicia ni enfoca nada en el nuevo (S-04);
- el foco nunca cae en `<body>`: si el control que lo tenía se desmonta, va al título de la clase (cambio de clase) o a la raíz de la vista (cambio de tarea, alumno o recurso); en las listas de Avisos, Dudas, Actividades y Recursos, a su `h2` como hoy (O-14 de 02c);
- volver al id anterior con su petición en vuelo no reabre nada (S-03, CH4-40 (c)).

**Forma A · `key` en la vista** (vistas sin memoria de foco propia que importe al cambiar de clase). En el render prop de `ConClaseDeLaRuta`, el componente interno lleva `key={claseId}`, como ya hace `duplicar-clase-view.tsx:32`:
- `features/clases/maestros-de-clase-view.tsx:119` (`MaestrosDeLaClase`): cierra O-r1-1 de maestros y H-3 (el observador de `useRetirarMaestro` de A se suelta al desmontarse; la mutación de A conserva sus opciones e invalida el detalle de A, así que A ya no queda vieja);
- `features/clases/alumnos-view.tsx:27` (`AlumnosDeLaClase`): cierra O-r1-1 de alumnos (la fila y su `useQuitarAlumno` se montan de nuevo) y la búsqueda de A;
- `features/clases/personas-view.tsx:190` (`PersonasDeLaClase`), `features/clases/editar-clase-view.tsx:57` (`EditarClaseDeLaRuta`), `features/clases/categorias-view.tsx:71` (`CategoriasDeLaClase`; la `key` de `EditorDeCategorias` en `:47` se queda), `features/calificaciones/gradebook-view.tsx:222` (`GradebookDeLaClase`), `features/calificaciones/mis-calificaciones-view.tsx:254` (`MisCalificacionesDeLaClase`);
- `features/tareas/crear-tarea-view.tsx:60` (`CrearTareaDeLaClase`), y en su `handleGuardar` (`:29-33`), después del `await`: `if (!montado.current || !sigueVigente(generacion)) return` antes de `navigate`, con `const montado = useMontado()` (`components/clase/hooks.ts`). Sin esa línea, un guardado de A que llega estando en B navegaría al detalle de la tarea de A.
- **Foco.** El control que tenía el foco estaba dentro de la raíz de `ClaseLayout`; la clave de `useFocoAlTituloDeLaClase` (`clase-layout.tsx:52`, `${claseId}:${soloLectura}`) cambia con la clase, así que `useFocoAlPerderseElControl` lleva el foco a la raíz y de ahí al título (`features/clases/hooks.ts:289-305`). Es el mismo camino de CH4-40 (b′). Si el foco estaba fuera de lo que se desmonta (las secciones, la barra), no se mueve.

**Forma B · `key` en el formulario** (las cuatro listas con `clasePrevia`, que conservan su foco O-14):
- `features/clases/muro-view.tsx:164`: `<FormularioPublicacion key={claseId} claseId={claseId} />`;
- `features/clases/dudas-view.tsx:166`: `<FormularioDuda key={claseId} claseId={claseId} />`;
- `features/clases/recursos-view.tsx:181`: `<FormularioRecurso key={claseId} modo="crear" … />`;
- `features/clases/trabajo-view.tsx`: «Nuevo tema» es un estado, no un componente. Forma exacta (la de `CodigoDeClase`, CHORE-04 §D-4 ter; ajustar el estado durante el render, no en un efecto):

```tsx
const [creandoEn, setCreandoEn] = useState<string | null>(null)
// CHORE-06a (§D-1): «Nuevo tema» es de su clase; al pasar a otra o a solo lectura, se cierra.
if (creandoEn !== null && (creandoEn !== claseId || soloLectura)) setCreandoEn(null)
const creando = creandoEn === claseId
// «Nuevo tema»: onClick={() => setCreandoEn(claseId)}
// cerrarFormulario: focoAlCerrarRef.current = true; setCreandoEn(null)
```
  La línea `if (soloLectura && creando) setCreando(false)` (`:85`) queda absorbida en la de arriba. `focoAlCerrarRef` no se toma al cambiar de clase, así que el efecto de `:121-125` no lleva el foco a «Nuevo tema» de B.
- **Foco.** El campo del formulario no es una fila (`useFilaEnFoco` de esas vistas solo recuerda filas), así que el efecto de `clasePrevia` no actúa y lo recoge `useFocoAlTituloDeLaClase`: el título de la clase. Una fila con el foco sigue yendo al `h2`, como hoy.

**Forma C · marco y contenido** (vistas cuyo id no es el de la clase y que guardan contadores; precedente: `features/admin/usuario-view.tsx:98-107`). La función de hoy se queda como marco: conserva `raizRef`, el `<div ref={raizRef} tabIndex={-1}>` y `useFocoAlPerderseElControl` con la misma clave (lee la misma consulta, que está en caché). Todo lo demás pasa a una función nueva del mismo archivo, que el marco pinta con `key` por el id. Así la clave del foco cambia con el id, el foco va a la raíz como en T-09 ("otra tarea"), y los contadores, la espera de la lectura fresca, `useMontado`, la generación de solo lectura y los manejadores asíncronos son del id.
- `features/tareas/editar-tarea-view.tsx`: marco `EditarTareaDeLaClase` (`:36`; `useTarea`, `raizRef`, `useFocoAlPerderseElControl` de `:82`, el `div` de `:146`); contenido `EdicionDeLaTarea` con `key={tareaId}` (`reinicios`, `esperaLaLecturaFresca`, `useAvisoDeRecargaFallida`, `useEditarTarea`, `contenido()`, `handleGuardar` y `recargarTrasConflicto`). `handleGuardar` suma `useMontado` igual que crear tarea: después del `await`, `if (!montado.current || !sigueVigente(generacion)) return`.
- `features/clases/editar-recurso-view.tsx`: marco `EditarRecursoDeLaClase` (`:52`; `raizRef`, `useFocoAlPerderseElControl` de `:95`, el `div` de `:152`); contenido `EdicionDelRecurso` con `key={recursoId}`. Ya usa `useMontado` en `alGuardar` y `recargarTrasConflicto` (`:120`, `:130`): pasa con ellos al contenido.
- `features/tareas/entrega-de-alumno-view.tsx`: marco `EntregaDelAlumno` (`:61`; `useTarea`, `useEntregaDeAlumno`, `raizRef`, `useFocoAlPerderseElControl` de `:106-109` con la misma clave compuesta); contenido `EntregaDeUnAlumno` con `` key={`${tareaId}:${alumnoId}`} `` (Enmienda 1, M-01: la ruta es `tareas/:tareaId/entregas/:alumnoId` y el mismo alumno tiene entrega en cada tarea; con `key={alumnoId}` el contenido sobrevivía al salto de P1 en T1 a P1 en T2) (`reinicios`, `montadoRef`, la generación, `useAvisoDeRecargaFallida`, `recargarTrasConflicto`, `calificacion()` y `contenido()`). Cierra O-r1c-2: el panel de la otra entrega nace con su versión y sus valores, sin `enfocarAlMontar` heredado, y un `onCalificada` o un `onConflicto` de la anterior que llega después cae en el contenido anterior, ya desmontado.
- `features/tareas/detalle-tarea-view.tsx`: no guarda contadores. Basta la `key` en el bloque que pinta los datos: `<div key={tarea.id} className="grid gap-5 lg:grid-cols-3">` (`:82`). Se montan de nuevo `TuTrabajo`, `HiloPrivado`, `PanelDeEntregas` y `AccionesDeLaTarea`. `AccionesDeLaTarea` navega en el `onSuccess` del `mutate` (`components/acciones-de-la-tarea.tsx:82`), que no corre con el componente desmontado.

**Criterio de la `key` (Enmienda 1, M-01; lección 3 de CHORE-04).** La `key` es única por **todos** los ids de la ruta de los que depende lo que esa vista escribe o muestra, no solo por el último. Revisión de los 16 sitios:
- Forma A y Forma B: dependen solo de `:claseId` (lo que escriben o muestran es de la clase); `key={claseId}` o `creandoEn` por clase. Bien.
- `crear-tarea-view.tsx`: solo `:claseId`. Bien.
- `detalle-tarea-view.tsx` (`key={tarea.id}`), `editar-tarea-view.tsx` (`key={tareaId}`), `editar-recurso-view.tsx` (`key={recursoId}`): ids globales (UUID de una sola fila, que implica su clase). Bien.
- `entrega-de-alumno-view.tsx`: depende de `:tareaId` y `:alumnoId`, y `alumnoId` se repite entre tareas. Era el único mal: `` key={`${tareaId}:${alumnoId}`} ``.
- Fuera de los 16: `usuario-view.tsx:107` (`key={usuarioId}`, id global) y `clase-anterior-view.tsx:75` (`key={claseId}`): bien.

**Lo que no se toca y por qué.** `clase-layout.tsx` (sin `key` en el `<Outlet />`, DH-01 a), `components/clase/con-clase-de-la-ruta.tsx`, `components/foco/` y los ganchos de mutación (ninguno gana `mutationKey`: S-03). `CodigoDeClase` y `AvisoDeClaseArchivada` ya están por clase (CHORE-04).

**Hermanos del mecanismo que no cambian** (se fijan con casos de regresión, CH6-A17): las filas con `key` por un id de una sola clase; `EditorDeCategorias` y `DuplicarClaseDeLaRuta` (ya con `key`); la ficha de una cuenta (`usuario-view.tsx:107`); "Mis calificaciones" de una clase anterior (`clase-anterior-view.tsx:75`); `EntregasView` (sin estado local).

**Estados vecinos de M-1 que recorre el resumen y atacan las pruebas:** destino sin caché (todo se monta de nuevo, ya seguro); destino en caché; atrás y adelante varias veces (A → B → A → B); petición de A en vuelo al saltar (mutación de A con sus opciones, ningún control de B en espera); la respuesta de A llega estando en B (éxito, `409`, `5xx`, `400 VALIDACION` de un campo pintado, códigos que redirigen); volver a A con su petición en vuelo; la vista desmontada (ir fuera de la clase) con la petición en vuelo; el foco en el control que se desmonta, en otro control de la vista y fuera de la vista; la clase que pasa a archivada en medio (la generación de solo lectura no cambia); `StrictMode` (el doble montaje no reabre nada).

### §D-2 · `VALIDACION` fuera de contrato y M-1

Ningún formulario cambia su conducta ante un `400`: la traducción, los campos que pinta y la limpieza del error del servidor no se tocan. Lo que cambia es que el formulario de un id deja de existir al pasar a otro. Por la regla de O-16 (§D-11 de CHORE-03), un error de campo que llega con el formulario desmontado se avisa una vez, con texto legible. CH6-A14 lo fija en los formularios de la Forma B y C: el `400 VALIDACION` de A (un campo pintado, uno que el formulario no pinta, uno vacío y uno con ruta `campo.0.sub:`) que llega estando en B da un solo aviso legible y ningún `ErrorDeCampo` en el formulario de B, y lo escrito en B no se toca.

### §D-3 · M-2: quien recibe un error con que `apiClient` redirige no avisa (06a, DH-04)

`CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (`services/apiClient.ts:21-25`) dice "Quien los recibe no avisa". En `features/clases`:
- **Los 13 ganchos** de la fila 347/360: en su `onError`, `if (errorQueRedirigeElCliente(error)) return` justo antes del `toast.error(`. La línea `marcarViejoElDetalleAnteClaseArchivada(…)` que va antes no cambia. En `avisarErrorDelTema` (`hooks.ts:1335-1345`), la guarda va al inicio de la función, después de `delCampo`, y vale para los dos `toast.error`; `renovarTrasError` sigue corriendo (un código que redirige no está en `CODIGOS_QUE_RENUEVAN_LOS_TEMAS`, así que no renueva nada de más).
- **«Unirme a la clase»** (`components/formulario-unirse-clase.tsx:48-59`, `onError` del `mutate`): su primera línea pasa a ser `if (errorQueRedirigeElCliente(error)) return`, antes de calcular `errorDeCampo`; el resto no cambia. Así no hay `if` anidado y el campo no se marca, como hoy (un código que redirige no es de campo).
- **`useAvisoDeRecargaFallida`** no cambia de firma: sus cinco llamadores suman `&& !errorQueRedirigeElCliente(<consulta>.error)` a su segundo argumento (`categorias-view.tsx:35`, `recursos-view.tsx:65`, `trabajo-view.tsx:108`, `editar-recurso-view.tsx:90`, `components/seccion-de-recursos.tsx:66`).
- **(Enmienda 1, M-02) Los sitios nuevos de `features/clases`:**
  - `components/formulario-clase.tsx:75-82` (`alFallar`): su primera línea pasa a ser `if (errorQueRedirigeElCliente(error)) return`, como `formulario-duplicar-clase.tsx:68`. Los errores de campo no cambian.
  - `components/formulario-publicacion.tsx:126` y `components/formulario-recurso.tsx:213` (el `catch` de la subida): antes del `toast.error(avisoDeFalloAlSubir(…))`, `if (errorQueRedirigeElCliente(error)) return`. Lo que el `catch` hace después (soltar la espera en el `finally`, conservar lo escrito y los elegidos) no cambia. `avisoDeFalloAlSubir` no cambia.
- **(Enmienda 1, M-02) `features/tareas`** (DH-04 (a); `errorQueRedirigeElCliente` de `features/tareas/lib.ts:234`):
  - `hooks.ts:186-191` (`useCrearTarea`), `:209-215` (`useEditarTarea`) y `:242-247` (`useBorrarTarea`): `if (errorQueRedirigeElCliente(error)) return` justo antes del `toast.error(`. Lo que va antes (`marcarViejoElDetalleAnteClaseArchivada`, `pedirDeNuevoLasOpciones`, `pedirDeNuevoLaTarea`) no cambia.
  - `avisarDelErrorDeLaEntrega` (`hooks.ts:359-374`): su primera línea pasa a ser `if (errorQueRedirigeElCliente(error)) return`. Cubre entregar, anular y comentar en el hilo; `useCalificarEntrega` ya volvía antes (`:533`), sin cambio. `renovarTrasErrorDeLaEntrega` sigue corriendo en los tres (con un código que redirige no renueva nada).
  - `useAvisoDeRecargaFallida` de tareas (`hooks.ts:288-301`): sin cambiar de firma, la línea `if (esClaseArchivada(consulta.state.error)) return` (`:298`) pasa a `if (esClaseArchivada(consulta.state.error) || errorQueRedirigeElCliente(consulta.state.error)) return`, después de marcar el fallo como avisado, así que no se repite al volver. Sus cuatro llamadores no cambian.
  - `components/formulario-tarea.tsx:224-227` y `components/formulario-de-entrega.tsx:135` (el `catch` de la subida): como en `features/clases`. La rama de `:243-245` de `formulario-tarea.tsx` (error de campo con el formulario desmontado) no es de este mecanismo y no cambia.
- **Fuera** (DH-04): la descarga de `components/adjuntos/adjuntos-de-publicacion.tsx:77` sin `alFallarLaDescarga`.
- **Riesgo declarado (R-03):** `errorQueRedirigeElCliente` mira el código, no si `apiClient` redirigió. `apiClient` no redirige un `401` cuando no envió token ni cuando la ruta actual es de las de sin sesión; en las vistas de una clase, con sesión y fuera de esas rutas, siempre redirige (`perderSesion`, `apiClient.ts:174-178`). (Enmienda 1) Es la regla que ya siguen los ganchos de CLASES-03 y ADMIN-01, `features/calificaciones` y, en `features/tareas`, calificar, la descarga y los «Ver más».

### §D-4 · M-3: una sola política para volver a pedir una lista (06b, DH-03)

**La política (PR).**
- **PR-1 · Pulsar la sección en la que ya se está** (otra `location.key` en la misma ruta, con la vista montada: el control segmentado, «Inicio» de la barra en el inicio, y atrás o adelante a otra entrada de la misma ruta; S-06). Cada consulta de la vista: si está pidiendo algo (`isFetching`), nada; si está en error o vieja (`isError || isStale`), `refetch({ cancelRefetch: false })`; si está sana y fresca, nada. En una consulta por páginas, `refetch` vuelve a pedir desde la primera página y calcula los cursores siguientes con las páginas nuevas (`infiniteQueryBehavior` de 5.103.2), así que un cursor vencido no se repite.
- **PR-2 · Salir de la vista o de la clave** (desmontarse o cambiar de clave): una consulta que quedó en error se marca vieja sin pedirla (`invalidateQueries({ queryKey, exact: true, refetchType: "none" })`). Al volver antes de los 30 s del `staleTime`, se pide. Una consulta sana no se toca.
- **PR-3 · Nunca se cancela ni se duplica una petición en vuelo** por PR-1 o PR-2.

**Dónde vive.** `components/seccion/hooks.ts`:
- `useAlPulsarLaSeccionActiva` no cambia (es la base).
- **Nuevo** `useRecargarAlPulsarLaSeccion(...consultas: readonly ConsultaQueSeRecarga[])`, sobre `useAlPulsarLaSeccionActiva`, aplica PR-1 a cada consulta. `ConsultaQueSeRecarga` es `Pick<UseQueryResult, "isError" | "isStale" | "isFetching" | "refetch">` (las de `useInfiniteQuery` también cumplen) y se declara en `components/seccion/types.ts` (archivo nuevo; regla 1 de `CLAUDE.md`: los tipos no van en archivos de ganchos).
- **Movido** `useMarcarViejaSiQuedoEnError(queryKey)` desde `features/admin/hooks.ts:214-230`, sin cambio de cuerpo, con `marcarViejaSiQuedoEnError`. En `features/admin/hooks.ts` el cambio son dos cosas (Enmienda 1, N-04): se quitan las definiciones de `marcarViejaSiQuedoEnError` y `useMarcarViejaSiQuedoEnError` (`:210-230`) y se reexporta el gancho con su nombre (una línea, como `features/calificaciones/hooks.ts:95` con `useAlPulsarLaSeccionActiva`), así que ningún importador de `features/admin` cambia. Si al quitarlas queda sin uso alguna importación de ese archivo, se quita también; nada más del archivo cambia.

**Sitios (las 12 listas de `features/clases`).** En cada uno, la llamada de hoy a `useAlPulsarLaSeccionActiva` (si la hay) se reemplaza por `useRecargarAlPulsarLaSeccion(<consulta>)` y se suma `useMarcarViejaSiQuedoEnError(<clave>)`:

| Vista | Consulta y clave | Hoy |
|---|---|---|
| `muro-view.tsx` | `publicaciones`, `clavePublicaciones(claseId)` | `:66-69` |
| `dudas-view.tsx` | `dudas`, `claveDudas(claseId)` | `:57-60` |
| `recursos-view.tsx` | `temas`, `claveTemasDeLaSeccion(claseId, <la sección que pide la vista>)` | `:72-75` |
| `trabajo-view.tsx` | `temas`, `claveTemasDeLaSeccion(claseId, "actividades")` | `:115-118` |
| `components/seccion-de-recursos.tsx` | `recursos`, `claveRecursos(claseId, bloque, seccion.clave)` | `:81-84` |
| `components/seccion-de-tema.tsx` | `trabajo`, `claveTrabajo(claseId, <su tema>)` (`services/trabajoService.ts`) | `:63-66` |
| `components/respuestas-de-duda.tsx` | `respuestas`, `claveRespuestas(claseId, dudaId)`; solo con `pedir` (como hoy) | `:166-169` |
| `components/comentarios-de-publicacion.tsx` | `comentarios`, `claveComentarios(claseId, publicacionId)` | sin gancho |
| `personas-view.tsx` (`PersonasDeLaClase`) | `personas`, `clavePersonas(claseId)` | sin gancho |
| `components/tabla-alumnos.tsx` | `alumnos`, `claveAlumnos(claseId)` | sin gancho |
| `inicio-estudiante-view.tsx` | `clases`, `CLAVE_CLASES_INSCRITAS` | sin gancho |
| `inicio-maestro-view.tsx` | `clases`, `CLAVE_CLASES_IMPARTIDAS` | sin gancho |

Las claves salen de `features/clases/data.ts` o de `services/`; el programador usa la misma función que usa el gancho de la consulta, nunca una clave escrita a mano (M-29 de ADMIN-01). Si alguna clave no está exportada, la exporta desde donde vive (sin moverla).

**El hermano de T-07 en (3).** `useRecuperarListaDeClasesAdmin` (`hooks.ts:461-465`) y `useRecuperarListaDeClasesAnteriores` (`:412-416`) suman, después de leer el estado, `if (estado?.fetchStatus === "fetching") return` antes de `resetQueries`, como `useVolverAPedirSiFallo` (`features/admin/hooks.ts:246`). Conservan su `removeQueries` al desmontarse (equivale a PR-2).

**Variantes registradas, sin cambio** (cumplen sus frases con casos probados): `features/admin` (`useVolverAPedirSiFallo`, en error y sin petición en vuelo, `resetQueries`: vuelve a la primera página sin las demás), `/admin/clases` y "Clases anteriores" (lo mismo, con `removeQueries` al salir), y Calificaciones (T-08: al pulsar vuelve a la ventana inicial y pide siempre, sin cancelar). Se escriben así en `CLAUDE.md` (A-1).


### §D-5 · M-4: falla la página siguiente (06b, DH-02)

**Función nueva** en `features/clases/lib.ts`:

```ts
// CHORE-06b (§D-5): con filas a la vista, el fallo de la página siguiente (red o 5xx) no quita lo cargado:
// la lista se queda y «Ver más» sigue para repetir. El cursor vencido, un error que quita el acceso y uno
// con que apiClient redirige no se conservan como fallo de página (el primero dice su frase, el segundo
// reemplaza la vista y el tercero no avisa: la página se va).
export const conservaLaListaTrasLaPagina = (consulta: {
  isFetchNextPageError: boolean
  error: unknown
}): boolean =>
  consulta.isFetchNextPageError &&
  !esErrorDeCursor(consulta.error) &&
  !errorQuitaLaVista(consulta.error) &&
  !errorQueRedirigeElCliente(consulta.error)
```

El tipo del parámetro va en línea porque es la firma de una función pura de `lib.ts` (como `focoPerdido`); si la regla estática de tipos de `features/clases` lo rechaza, va a `types.ts` como `FalloDeLaPagina` y el programador lo dice en el resumen.

**En cada una de las 9 listas** (Avisos, comentarios, Dudas, respuestas, temas de Actividades, Personas, roster y los dos inicios):
1. `const conserva = conservaLaListaTrasLaPagina(<consulta>)` (con `isFetchNextPageError` solo hay filas: TanStack Query lo pone en una consulta por páginas que ya tenía datos).
2. El orden de la vista no cambia: **error primero**, con la condición `<consulta>.isError && !conserva`; después cargando, vacío y datos. Con `conserva`, la rama de datos pinta la lista y «Ver más» (cotejado con la lección 2 de CHORE-04: la viñeta pide un botón que esta vez sigue pintado, porque la rama de error ya no lo quita).
3. Un aviso por fallo con `useAvisoDeRecargaFallida(<consulta>.errorUpdateCount, conserva, mensajeDeConsultaClases(<consulta>.error))`, como Recursos (`seccion-de-recursos.tsx:64-69`). No avisa al montar con un fallo ya ocurrido, ni con la vista desmontada, ni ante un código que redirige (`conserva` es falso).
4. Los dos inicios pasan `conserva` a su panel: `isError={clases.isError && !conserva}`, `errorMensaje` solo en ese caso, y a `BloqueDestacado` `esError={clases.isError && !conserva}` (el título no dice "No pudimos cargar tus clases" con la lista a la vista; O-E4-1). `PanelMisClases` y `BloqueDestacado` no cambian.
5. Personas (`personas-view.tsx:47-63`) ya pinta su encabezado en todos los estados (T-27); `cargada` pasa a `primera !== undefined && ultima !== undefined && (!personas.isError || conserva)`.
6. `respuestas-de-duda.tsx`: las condiciones de `:251` y `:255` que miran `respuestas.isError` miran `respuestas.isError && !conserva`; la de `:181` (el foco a la vecina) no cambia.

**Seccion-de-recursos** ya conserva la lista; solo cambia su gancho de PR-1 (§D-4) y, en 06a, el aviso ante un código que redirige (§D-3).

**Foco.** Con la lista conservada, «Ver más» no se desmonta: el foco se queda en el botón (hoy va al encabezado de la lista). `useFocoAlCargarMas` no cambia: solo mueve el foco si el botón se desmontó. `useFocoAlPasarAError` (Avisos, Dudas) sigue igual para los errores que reemplazan la lista.

**El hermano de T-02 de CLASES-03e (comentarios).** Nuevo gancho en `features/clases/hooks.ts`, junto a `useRenovarSiLaDudaYaNoEsta` (`:1789-1802`) y con la misma forma: `useRenovarSiLaPublicacionYaNoEsta(claseId, errorUpdateCount, error)`, que ante `PUBLICACION_NO_ENCONTRADA` (una vez por fallo) invalida la lista de Avisos (`clavePublicaciones(claseId)`, `exact`) y las de Recursos (`clavePrefijoDeRecursos(claseId)`), como `invalidarComentarios` (`:1099-1110`). Lo llama `ComentariosDePublicacion`. `PUBLICACION_NO_ENCONTRADA` no se conserva como fallo de página: el bloque dice «Esa publicación ya no existe.» hasta que la lista renovada quita la fila (y con ella el bloque). El foco sigue la regla de la fila que sale (vecina o `h2`).


### §D-6 · N-52 y la clase archivada en la barra (06b)

- **N-52** (`features/calificaciones`). Nuevo gancho en `hooks.ts`, junto a `useMarcarViejoElGradebook`: `useMarcarViejasLasVentanas(claseId)` devuelve una función que marca viejas todas las ventanas de la clase (`invalidateQueries({ queryKey: clavePrefijoDeCalificaciones(claseId), refetchType: "none" })`), incluida la que está a la vista. `gradebook-view.tsx` la llama (a) al pulsar la sección, en el manejador de `:86-90`, antes de `recargarLaPrimeraVentana()`; y (b) al desmontarse, si la vista mostraba la frase de la clase cambiada (`ocurrenciaDelCursor !== null`; un efecto de limpieza que lee una ref, como `useMarcarViejaSiQuedoEnError`). Así "Alumnos siguientes" vuelve a pedir la ventana vacía en lugar de servirla de la caché. `useMarcarViejoElGradebook` no cambia: con la vista quieta sigue sin marcar la ventana a la vista (CAL-T-201). CAL-T-248 cambia de sentido (C-6 de §D-R0).
- **Fila "ADMIN-01d2: la barra lateral y las listas del inicio siguen trayendo una clase…"** (`features/clases/hooks.ts:427-443`). En `useClaseArchivadaEnSuLista`, con `archivada` verdadero, antes de la lógica de "Clases anteriores" (que no cambia): (Enmienda 1, N-03) solo si alguna consulta en caché bajo `CLAVE_CLASES_INSCRITAS` o `CLAVE_CLASES_IMPARTIDAS` (los inicios por páginas y la barra, que cuelga de esas claves, `services/clasesService.ts:27-54`) trae esa clase, se invalidan las dos claves (sin `exact`). Si ninguna la trae (el maestro que abre una clase desde "Clases archivadas", la sesión del admin), no se pide nada. Para saberlo, una función pura nueva en `features/clases/lib.ts`, `listaTraeLaClase(dato: unknown, claseId: string): boolean`, que reconoce sin `as` las dos formas de esas consultas (páginas con `clases` y la página única de la barra) y devuelve falso ante cualquier otra; el gancho la aplica a `queryClient.getQueriesData` de cada clave. El efecto corre una vez por clase (`[queryClient, claseId, archivada]`). (`lib.ts` ya está en 06b; el conteo no cambia.)

### §D-7 · Avisos, recargas y la matriz del resumen

El primer resumen de cada subentrega trae la matriz (`AGENTS.md`, "Matriz de avisos y recargas"):
- **06a:** por cada sitio de §D-1 y cada clase de respuesta del id anterior (éxito, `409`, `5xx`, red, `400 VALIDACION`, `401` sin refresco, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`) que llega estando en el id nuevo, con la vista desmontada y al volver: qué se renueva, qué se anuncia (un solo aviso), a dónde va el foco y si algo navega o se reinicia. Por cada gancho de §D-3: qué avisa ante cada código.
- **06b:** por cada lista de §D-4 y §D-5 y cada disparador (pulsar la sección con la consulta sana fresca, sana vieja, en error, en error y pidiendo; salir y volver antes y después de 30 s; «Ver más» con `5xx`, red, `400` del cursor, `403 SIN_ACCESO_A_LA_CLASE`, `401` sin refresco, `404` de la publicación o de la duda; dos fallos seguidos; página en vuelo con una recarga de fondo): qué se pide (cuántas peticiones y con qué cursor), qué se anuncia, qué se ve y a dónde va el foco, en los estados "en vuelo a la vez" y "con la vista desmontada".

El manager la contrasta con el código antes de que el tester ataque.

## Cambios por capa

### shared/
Sin cambios.

### backend/core/
Sin cambios.

### backend/adapters/
Sin cambios.

### backend/handlers/
Sin cambios. No hay endpoint nuevo.

### backend/workers/
Sin cambios.

### backend/prisma/
Sin migración.

### infra/ y .env.example
Sin cambios.

### frontend/
- **06a:** §D-1 (Formas A, B y C), §D-3 (con los sitios de M-02 de la Enmienda 1) y la regla estática CH6-A30. Archivos en §D-0.
- **06b:** §D-4 (`components/seccion/hooks.ts` y `types.ts`, la reexportación de `features/admin/hooks.ts` y las 12 listas), §D-5 (`conservaLaListaTrasLaPagina` en `features/clases/lib.ts`, las 9 listas y `useRenovarSiLaPublicacionYaNoEsta`) y §D-6 (`useMarcarViejasLasVentanas` y `useClaseArchivadaEnSuLista`). Archivos en §D-0.
- Sin componentes de `components/ui/`, sin tokens, sin textos nuevos.

## Acceso a datos

No hay consultas nuevas en el servidor. En el cliente:
- §D-1 no agrega peticiones: el marco y el contenido de la Forma C observan la misma consulta (misma clave, una petición).
- PR-1 agrega, como máximo, una petición por pulsación y por consulta de la vista, solo si está en error o vieja, y nunca con otra en vuelo. Una consulta por páginas vuelve a pedir tantas páginas como tenía cargadas, desde la primera (como el `refetch` de hoy en las siete vistas de H-2).
- PR-2 no pide nada al salir; pide al volver, solo si la consulta quedó en error.
- §D-6 marca viejas las ventanas del gradebook sin pedirlas y pide la barra lateral una vez por clase archivada leída.

## Autorización

No cambia. Las `key`, los avisos y las recargas son de interfaz: la cadena de middleware sigue decidiendo quién quita, borra, califica o edita, y en qué clase.

## Se toca y no se toca

Base: `47c3339` para 06a; el commit de 06a para 06b (`AGENTS.md`, "Commits y cierre de subentregas").

**06a · Se toca (programador).** Rutas relativas a `frontend/src/`.
- Producción (25; Enmienda 1): los de la columna 06a de §D-0. En los seis de M-02 (`formulario-clase.tsx`, `formulario-publicacion.tsx`, `formulario-recurso.tsx`, `features/tareas/hooks.ts`, `formulario-tarea.tsx`, `formulario-de-entrega.tsx`), solo las líneas de §D-3.
- Pruebas nuevas (4): `app/estado-por-id-ch6.test.tsx`, `features/clases/avisos-al-redirigir-ch6.test.tsx`, `features/tareas/avisos-al-redirigir-ch6.test.tsx`, `lib/estado-por-id-estatico-ch6.test.ts`.
- Lista cerrada (1): `features/clases/guardas-ch4.test.tsx`, solo en lo que dice la lista.
- `docs/trabajo/CHORE-06-foco-y-navegacion/` (su resumen).

**06a · Se toca (tester, ronda 0).** C-1 y C-2 de §D-R0.

**06b · Se toca (programador).**
- Producción (19): los de la columna 06b de §D-0.
- Pruebas nuevas (4): `components/seccion/recargas-ch6.test.tsx`, `features/clases/recargas-ch6.test.tsx`, `features/clases/ver-mas-ch6.test.tsx`, `features/calificaciones/gradebook-ch6.test.tsx`.
- Lista cerrada (2, más una condicional): `features/clases/ver-mas-y-orden-ch4.test.tsx` y `features/clases/personas-view.test.tsx`; y `features/clases/muro-view.test.tsx` solo si cae (Enmienda 1, M-03); solo en lo que dice la lista.
- `docs/trabajo/CHORE-06-foco-y-navegacion/`.

**06b · Se toca (tester, ronda 0).** C-3 a C-9 de §D-R0, y C-10 solo si su condición se cumple.

**No se toca (las dos).** Todo lo demás; en particular:
- `features/clases/clase-layout.tsx`, `components/clase/` (`con-clase-de-la-ruta.tsx`, `hooks.ts`, `lib.ts`, `contexto-de-solo-lectura.ts`), `components/foco/`, `components/layout/`, `components/ui/`, `components/adjuntos/` (incluida la descarga de `adjuntos-de-publicacion.tsx`, fuera por DH-04), `components/mensaje-error.tsx`;
- `services/` (en especial `apiClient.ts` y `navegacion.ts`), `app/` de producción (`router.tsx`, `providers.tsx`), `lib/` de producción (`errores-de-api.ts`, `unir-paginas.ts`);
- en `features/clases/hooks.ts`: en 06a, todo salvo las líneas de §D-3; en 06b, todo salvo `useRenovarSiLaPublicacionYaNoEsta` (nuevo), las dos guardas de `fetchStatus` y `useClaseArchivadaEnSuLista` (§D-4 a §D-6). Ningún gancho de mutación gana `mutationKey`;
- `features/clases/components/` fuera de los de §D-0 (en especial `lista-maestros-de-clase.tsx`, `panel-mis-clases.tsx`, `bloque-destacado.tsx`, `codigo-de-clase.tsx`, `aviso-de-clase-archivada.tsx`, `elemento-de-*.tsx`, y los `formulario-*.tsx` que no son `formulario-unirse-clase.tsx`, `formulario-clase.tsx`, `formulario-publicacion.tsx` ni `formulario-recurso.tsx`; Enmienda 1);
- `features/tareas/` fuera de los siete de 06a (Enmienda 1): `lib.ts`, `data.ts`, `types.ts`, `entregas-view.tsx` y `components/` salvo `formulario-tarea.tsx` y `formulario-de-entrega.tsx`; en `hooks.ts`, todo salvo las líneas de §D-3; `features/calificaciones/` fuera de los de §D-0; `features/admin/` salvo, en 06b, quitar las dos definiciones y la reexportación de §D-4; `features/auth/`, `features/diagnostico/`;
- todo `*.ataque.test.*` salvo los C-n de §D-R0; toda prueba normal fuera de la lista cerrada;
- `package.json`, `package-lock.json`, `shared/`, `backend/`, `infra/`;
- `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE*.md`, `docs/ESTADO.md` (los cambia el orquestador al cierre, A-1 a A-4).

## Lista cerrada de pruebas normales que el programador puede cambiar

Grep del arquitecto en `47c3339`, por los criterios de `AGENTS.md` (firmas que cambian, dobles de tipos que cambian, textos que cambian) más los de ADMIN-01 (tamaños exactos, filtros de peticiones y conteos al montar) y la conducta que cambia de sentido.

**06a.**
1. **Firmas.** Ninguna función exportada cambia de firma. `useAvisoDeRecargaFallida` conserva la suya (§D-3). Las funciones nuevas de la Forma C (`EdicionDeLaTarea`, `EdicionDelRecurso`, `EntregaDeUnAlumno`) no se exportan. `rg "EditarTareaDeLaClase|EditarRecursoDeLaClase|EntregaDelAlumno|MaestrosDeLaClase|AlumnosDeLaClase" src -g "*.test.*"` no da ninguna importación (las pruebas montan las vistas exportadas por la ruta).
2. **Dobles.** `rg "vi.mock\(.*(clases|tareas|calificaciones)/hooks" src -g "*.test.*"` solo da `features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` e `inicio-sin-datos-r2.ataque.test.tsx`, que no pintan ninguna vista de §D-1 ni ganchos de §D-3: sin cambio.
3. **Conducta que cambia de sentido** (avisos ante un código que redirige; `rg "ACCESO_RESTRINGIDO|NO_AUTENTICADO|CAMBIO_DE_CONTRASENA_REQUERIDO" src/features/clases -g "*.test.*"`):
   - **`features/clases/guardas-ch4.test.tsx`**: `:388`, `const avisoDeClases = (error: ApiError) => mensajeDeErrorClases(error)` pasa a `const avisoDeClases = (error: ApiError) => (REDIRIGEN.includes(error.codigo) ? null : mensajeDeErrorClases(error))` (`REDIRIGEN` ya está en `:389`; se lee al llamar, no al declarar). En el título de CH4-25 (`:733`), "el aviso de hoy (ninguno en «Sí, regenerar», uno en los demás)" pasa a "ningún aviso (apiClient redirige; CHORE-06a)". Nada más cambia: CH4-21 y CH4-24 usan `avisoDeError` con un `500` y siguen igual.
   - Sin cambio (ya afirman "ningún aviso" o no tocan los ganchos de §D-3): `formularios-03c2.test.tsx:413`, `clase-archivada-01d1-vista.test.tsx:1929`, `clases-admin-01c.test.tsx`, `recursos-03d.test.tsx`, `dudas-03e*.test.tsx`.
   - (Enmienda 1, M-02) **`features/tareas`**: `rg "ACCESO_RESTRINGIDO|NO_AUTENTICADO|CAMBIO_DE_CONTRASENA_REQUERIDO" src/features/tareas -g "*.test.*"`. Ninguna prueba normal afirma hoy un aviso ante un código que redirige en los sitios de §D-3: `calificar-01c.test.tsx:840` (CAL-1C06, "no hay aviso ni recarga") ya afirma el silencio; `entregas-01e.test.tsx:883` y `entregas-01d.test.tsx:1059` son de la descarga y de «Ver más comentarios», que ya callan. Sin cambio.
   - (Enmienda 1, M-02) **Las subidas y crear o editar clase**: `rg "avisoDeFalloAlSubir|errorRechazado|alFallar" src -g "*.test.*"` no da ninguna prueba que pida el aviso de la subida o de `alFallar` ante uno de los tres códigos. Sin cambio.
4. **Textos.** Ninguno.

**06b.**
1. **Firmas.** `useAlPulsarLaSeccionActiva` no cambia. `useMarcarViejaSiQuedoEnError` se mueve sin cambiar de firma y `features/admin/hooks.ts` lo reexporta: `rg "useMarcarViejaSiQuedoEnError" src -g "*.test.*"` da solo importaciones desde `features/admin/hooks` o la vista: sin cambio.
2. **Dobles.** Ningún doble de `UseQueryResult` de las 12 listas: las pruebas montan con `fetch` doblado. Los dos `inicio-sin-datos*.ataque` doblan `useClasesInscritas` sin `isFetchNextPageError` ni `isStale`: con `hasNextPage: false` y sin error, `conservaLaListaTrasLaPagina` recibe `undefined` en `isFetchNextPageError` (falso) y nada cambia; están en §D-R0 como vigiladas (PA-2 si fallan).
3. **Conducta que cambia de sentido** (el fallo de la página siguiente; `rg "página siguiente|Ver más.*(falla|500|red)" src -g "*.test.*"`):
   - **`features/clases/ver-mas-y-orden-ch4.test.tsx`**, CH4-30 (c) y CH4-31 (c) (Enmienda 4 de CHORE-04, "afirman la conducta de hoy"): pasan a afirmar §D-5: salen las dos peticiones de la página (`retry: 1`) y ninguna más; la lista se queda con sus filas; un solo aviso con `mensajeDeConsultaClases(error)`; «Ver más comentarios» o «Ver más clases» sigue a la vista y fuera de espera; en los inicios, sin `MensajeError` del panel y sin el error en el título del bloque destacado. El título de cada caso cambia en ese sentido.
   - **`features/clases/personas-view.test.tsx:263`** (T-27, ronda 5): "si la consulta de la página siguiente falla, el foco queda en el encabezado «Alumnos»" pasa a "…la lista se queda, un solo aviso y el foco se queda en «Ver más alumnos»"; la aserción del foco cambia de encabezado a botón.
   - (Enmienda 1, M-03) **Pulsar la sección y contar peticiones con DH-03 (b).** Grep: `rg -l "location\.key|estando ahí|estando en (ella|él)|sección activa" src -g "*.test.*"` y, en cada archivo que pulsa una sección de `features/clases` y cuenta peticiones, el `staleTime` de su cliente. Con el de `providers.tsx` (30 s) y sin adelantar el reloj más de 30 s, una lista sana sigue fresca y nada cambia. La lista de Avisos usa su propio `staleTime` (`usePublicaciones`, `features/clases/hooks.ts:1023-1027`: 240 s, o menos si una vista previa firmada vence antes), que no depende del cliente.
     - **Condicional · `features/clases/muro-view.test.tsx:344`** (PR-C18, "con el muro sano, pulsar «Muro» no vuelve a pedir nada"; cliente de `:301` sin `staleTime`). Debería seguir en verde por el `staleTime` propio de Avisos (sus publicaciones no traen adjuntos). **Solo si cae**, el programador la cambia así: el cliente de `renderConEnlaceMuro` (`:301`) suma `staleTime: 30_000` a `queries`, y el título y la aserción no cambian. Conserva la intención ("sana y fresca no pide") y lo declara en el resumen con la salida de la falla.
     - Vigiladas en lo normal (siguen en verde; PA-1 si caen): `app/clase-03c1.test.tsx:493` (CL3-C12) y `:526` (CL3-C13), `recursos-caminos-03d.test.tsx:517` (CL3-D23) y `:713` (CL3-D27), `dudas-caminos-03e.test.tsx:333` (CL3-E09) y `:411` (CL3-E10), `dudas-03e.test.tsx:1575` (M-01 (b): las respuestas no se piden porque su bloque no está en `pedir`), `guardas-ch4.test.tsx:631` (CH4-22, cuenta la mutación) y `ver-mas-y-orden-ch4.test.tsx:771` (cuenta los `PUT`), todas con `Providers` o 30 s.
4. **Textos.** Ninguno.

Cualquier otra prueba normal que falle es PA-1.

## §D-R0 · Pruebas `*.ataque` que el cambio obliga a tocar (C-n del tester, ronda 0)

**06a.**
- **C-1 · `features/clases/guardas-ch4-r1.ataque.test.tsx:385`.** `avisoDeClases` igual que en la lista cerrada: `REDIRIGEN.includes(error.codigo) ? null : mensajeDeErrorClases(error)`. ATQ-CH4-10 (`:571-600`) ya admite `esperado === null` para su fila de `403 CAMBIO_DE_CONTRASENA_REQUERIDO`. Sigue protegiendo lo mismo: la ref libre y una sola petición después del error.
- **C-2 · `features/clases/alumnos-b-r1.ataque.test.tsx:416-443`** ("N-04 con ACCESO_RESTRINGIDO al unirse"): el título de `:417`, "redirige con apiClient, avisa una sola vez y no marca el campo", pasa a "redirige con apiClient, no avisa y no marca el campo"; `:441` (`toHaveBeenCalledTimes(1)` de `aviso.error`) pasa a afirmar, después de esperar a `irA` y un momento más, que `aviso.error` no se llamó. `:440`, `:442` y `:443` no cambian: sigue protegiendo una sola redirección a `/acceso-restringido` y el campo sin marcar.
- **Vigiladas, sin cambio** (siguen en verde con el plan; si alguna falla, PA-2): `guardas-ch4-r1.ataque.test.tsx` ATQ-CH4-15 y ATQ-CH4-16 (`:820-890`: abren la confirmación de B si no llegó abierta, así que valen con la `key`); `clases-r1.ataque`, `clases-r2.ataque` y `clase-archivada-01d1-r*.ataque` («Sí, regenerar» no cambia); `foco-02c-r3/r4/r5.ataque`, `heredados-02d-r1.ataque`, `ventana-02c-r2.ataque` (O-14: las filas siguen yendo al `h2`); `calificar-01c-r*.ataque` y `entregas-01e-r1.ataque` (el panel y el hilo con la Forma C); `calificaciones/secciones-01d-r3.ataque` (CAL-T-231); `clases-admin-02c-r1.ataque`; `alumnos-b-r3.ataque:48`; `recursos-03d-r1.ataque` (sus `401` ya no avisaban). (Enmienda 1, M-02) En `features/tareas`: `entregas-01d-r3.ataque.test.tsx:586-612` (entregar y comentar con la sesión perdida: "como mucho un aviso", así que vale con cero), `entregas-01d-r2.ataque.test.tsx:661-674` (no cuenta avisos), `entregas-01d-r1.ataque.test.tsx:325`, `entregas-01e-r1.ataque.test.tsx:379` y `entregas-01e-r2.ataque.test.tsx:254` y `:478` (refresco rechazado en consultas que ya callan). Y `services/apiClient-ch3-r1.ataque.test.ts:83-88`: la lista de importadores de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` no cambia (por eso la descarga de `components/adjuntos` queda fuera).

**06b.**
- **C-3 · `features/clases/ver-mas-y-orden-ch4-r1.ataque.test.tsx`**, ATQ-CH4-20 (`:421-440`) y ATQ-CH4-22 (`:499-526`): como CH4-30 (c) y CH4-31 (c) de la lista cerrada. ATQ-CH4-21 y ATQ-CH4-23 (la recarga gana) no cambian.
- **C-4 · `features/clases/alumnos-b-r4.ataque.test.tsx:345` y `:355`** ("si la consulta de la página siguiente falla, el foco va al encabezado" en el roster y en Personas): el foco se queda en «Ver más alumnos», con la lista y un solo aviso.
- **C-5 · `features/clases/foco-02c-r3.ataque.test.tsx:376`** («Ver más avisos» que falla: "con el foco en el botón, va al encabezado; si la persona se fue al campo del anuncio, se queda ahí"): con el foco en el botón, se queda en el botón; la segunda mitad no cambia.
- **C-6 · `features/clases/foco-pestana-02d-r3.ataque.test.tsx:257`** (Personas: la página siguiente falla con la pestaña oculta): el foco se queda en «Ver más alumnos».
- **C-7 · `features/clases/muro-c-r1.ataque.test.tsx:803` y `:815`** (la página siguiente del muro y la de comentarios fallan: el foco no cae en `<body>`): siguen pidiendo "no cae en `<body>`"; el tester decide si basta (el foco se queda en el botón) o los reescribe para afirmarlo.
- **C-8 · `features/calificaciones/gradebook-01d-r3.ataque.test.tsx:723`** (CAL-T-248, "evidencia N-52", verde a propósito): cambia de sentido, como dice la fila 446: tras pulsar la sección o salir y volver con la frase a la vista, «Alumnos siguientes» pide la ventana y no la sirve de la caché.
- **C-9 (Enmienda 1, M-03) · `features/clases/ordenar-03c2-r2.ataque.test.tsx:463-477`** (CL3-2R2-10: "tras escribir el orden sobre una recarga fallida, pulsar «Actividades de aprendizaje» estando ahí no pide nada y ninguna frase de la vista promete esa acción"; cliente de `:131-132` con la configuración de `providers.tsx`). Es O-03 y cambia de sentido por DH-03 (b): la lista quedó marcada vieja. El título pasa a "…pulsar «Actividades de aprendizaje» estando ahí pide la lista de temas de la sección una vez y ninguna frase de la vista promete esa acción"; `:474` (`expect(servidor.getsDeSeccion()).toBe(antes)`) pasa a esperar `antes + 1` (con `waitFor`) y después de `reposar(200)` sigue en `antes + 1` (una sola petición); `:475` y `:476` no cambian (sin frases de recuperación; el orden escrito se ve). Conserva la intención del ataque (lo vigila una sola petición y ninguna promesa en la vista); la conducta que fija es la de CH6-B08.
- **C-10 (Enmienda 1, M-03; condicional) · `app/muro-recuperar-c-r4.ataque.test.tsx:208-229`** ("…con el muro ya sano, «Avisos» no pide nada…"; cliente de `:156` sin `staleTime`). Debería seguir en verde por el `staleTime` propio de Avisos (240 s). **Solo si cae** en la corrida del programador con PR-1 aplicado: el programador se detiene (PA-2) y el tester aplica esta reescritura, ya redactada aquí, sin otra enmienda: el cliente de `:156` suma `staleTime: 30_000`; la aserción de `:223` ("«Avisos» con la lista sana", 2) no cambia. Conserva la intención: con la lista sana y fresca, pulsar no pide.
- **Vigiladas, sin cambio:** `app/personas-03c1-r2.ataque.test.tsx:357` (CL3-R2-11: la página y la recarga fallan las dos; la recarga reemplaza, un solo error, foco al encabezado); `recursos-03d-r1.ataque` CL3-3R1-09 a 11 y `recursos-caminos-03d.test.tsx` (Recursos ya conservaba); `dudas-caminos-03e.test.tsx`, `recuperar-ch3*.test.tsx`, `consultas-ch3.test.tsx` (frases del cursor y caminos con `refetch`, que sigue siendo `refetch`); `gradebook-01d-r2.ataque.test.tsx:286` (CAL-T-201); `clases-admin-01c*.test.tsx` y `clase-archivada-01d2-vista.test.tsx:967` (ADM-1D204 (d)); `ver-mas-01e-r3.ataque.test.tsx:194` (una recarga en segundo plano que falla sigue quitando el botón: DH-02 (a) no cambia las recargas); `inicio-sin-datos*.ataque`; `components/seccion/hooks.test.tsx`. (Enmienda 1, M-03) Con DH-03 (b), y por el criterio de la lista cerrada (`Providers` o 30 s, o el `staleTime` propio de Avisos): `app/muro-recuperar-c-r3.ataque.test.tsx:211-222` (pulsar «Avisos» con el muro en error recupera la lista), `app/personas-03c1-r1.ataque.test.tsx:570` (CL3-R1-21), `ordenar-03c2-r1.ataque.test.tsx:448`, `recuperar-ch3-r1.ataque.test.tsx:199` (cuenta los `POST`) y `ordenar-03c2-r2.ataque.test.tsx` CL3-2R2-11 (`:481`).

El tester confirma en la ronda 0, con los `rg` de la lista cerrada (incluidos los de la Enmienda 1), que no hay otra `*.ataque` del mismo sentido; si la hay, la anota como C-n y avisa al manager (no es PARADA del programador).

## Pruebas requeridas

Todas en el frontend, sin API ni infra. Prefijo `CH6-` (`CH6-A` en 06a, `CH6-B` en 06b). Reglas para todas:
- **Router y caché reales.** Los casos de navegación (saltos del historial, pulsar la sección, otra sección y regreso, «Inicio» de la barra) montan `rutas` de `app/router` con `createMemoryRouter` y un `QueryClient` con las `defaultOptions` de `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`). La red se dobla con `fetch`; se cuentan las peticiones por método y ruta, y las respuestas se retienen con una promesa diferida (el arnés de `guardas-ch4-r1.ataque.test.tsx`, `montar`/`navegar`/`retenida`, es el modelo). "Salto del historial" es `router.navigate(-1)` o `(1)` entre dos entradas de la misma ruta con otro id, con el destino ya en caché (S-02). `irA` de `services/navegacion` se dobla.
- **Foco.** Se afirma con `document.activeElement`, nunca solo "no es `<body>`" cuando el plan dice a dónde va.
- **Rojo primero.** Las pruebas de comportamiento de cada grupo se escriben y se corren antes del cambio de producción de su grupo; el resumen dice cuántas fallaron y cuáles, con el comando y su salida.
- **Mutación que lo comprueba** (regla del humano, 2026-11-11). Después de implementar, por cada remedio de la tabla "Mutaciones" de abajo, el programador lo quita (cambio real en el archivo), corre el caso que dice vigilarlo, comprueba que falla, y lo restaura (comprobando con `git diff` que el archivo quedó igual). Si el caso pasa sin el remedio, no lo vigila: lo reescribe hasta que caiga, o declara la redundancia con su mecanismo en el resumen y se detiene (PA-7). Nunca sobre una copia: el archivo real, restaurado.
- Sin selectores de clase; por rol, nombre accesible, `aria-busy` y texto. Toda prueba con al menos una aserción; una precondición que falta hace fallar la prueba con un mensaje.

### CHORE-06a · lo abierto es del id (`app/estado-por-id-ch6.test.tsx`)

Clases A ("Historia") y B ("Geografía") con la misma persona en las dos donde haga falta; tareas T1 y T2 de A; alumnos P1 y P2 con entrega en T1; recursos R1 y R2.
- **CH6-A01 · Quitar a un maestro (admin, Personas; O-r1-1, prioritario).** Con la confirmación de «Quitar <maestro>» abierta en A y el foco en «Cancelar» (en otro caso, en «Sí, quitar»): salto a B. En B no hay «Sí, quitar <maestro>» ni la frase de consecuencia; «Quitar <maestro>» está a la vista; el foco es el título (`h1`) de B. Volver a A: la confirmación está cerrada y ningún «Cancelar» tiene el foco.
- **CH6-A02 · Lo mismo con un alumno** (maestro y admin, el roster): la confirmación de «Quitar <alumno>» no pasa a B; el foco va al título de B; al volver a A está cerrada.
- **CH6-A03 · Quitar con la petición en vuelo (H-3).** Maestro y alumno, por separado: con el `DELETE` de A retenido, salto a B: nada de B está en espera; abrir «Quitar» y «Sí, quitar» en B manda el `DELETE` de B. Soltar el de A: un solo aviso de A ("… ya no da esta clase" o el del alumno), y la lista de A queda vieja o renovada (`claveClaseDetalle(A)` o `claveAlumnos(A)`); la de B no cambia por la respuesta de A. Volver a A **antes de 30 s**: A no muestra a la persona quitada (se pidió de nuevo).
- **CH6-A04 · Borrar una tarea (O-E3-1).** Con la confirmación de «Borrar tarea» de T1 abierta (y, como admin, con el `409 TAREA_CON_ENTREGAS` a la vista), salto a T2: no hay confirmación ni el mensaje del `409`; el foco es la raíz de la vista (el `div` con `tabIndex={-1}`); al volver a T1, cerrada.
- **CH6-A05 · Tu trabajo y el hilo del alumno.** En T1, archivos y enlaces elegidos sin entregar, y texto en "Comentarios privados"; salto a T2: nada de eso está; «Entregar» en T2 manda el `POST` de T2 sin los archivos ni los enlaces de T1. Con la confirmación de anular abierta en T1, salto a T2: no está.
- **CH6-A06 · Calificar a un alumno (O-r1c-2).** Maestro; panel de P1 con puntos escritos (sin enviar) y texto en el hilo; salto a la entrega de P2 (en caché, **con la misma `version` que P1**): el panel muestra lo de P2 (sin los puntos de P1), el hilo está vacío; «Calificar y devolver» manda el `PUT` de P2 con la versión y los puntos de P2. Con el `PUT` de P1 retenido al saltar: en P2 nada espera; al soltarlo (éxito, y en otro caso `409 ENTREGA_MODIFICADA`), un solo aviso, el panel de P2 no se reinicia ni toma el foco, y no sale ninguna recarga de la entrega de P2. Foco tras el salto: la raíz de la vista. **(Enmienda 1, M-01) Camino "mismo alumno, otra tarea":** lo mismo saltando de la entrega de P1 en T1 a la de P1 en T2 (las dos en caché, **con la misma `version`**): el panel muestra lo de P1 en T2 (su rúbrica o su calificación directa, sin los puntos escritos en T1), el hilo está vacío, «Calificar y devolver» manda el `PUT` de la entrega de P1 en T2 con su versión y sus puntos, y el texto escrito en el hilo de T1 no se envía al de T2; con el `PUT` de T1 retenido al saltar, al soltarlo, un aviso y nada se reinicia ni toma el foco en T2.
- **CH6-A07 · Editar una tarea.** Lo escrito en T1 (título cambiado) no está en T2; «Guardar» en T2 manda el `PUT` de T2 con su versión y su contenido. Con el `PUT` de T1 retenido al saltar a la edición de T2, al soltar (éxito): un aviso, **la ruta sigue en la edición de T2** (no navega al detalle de T1) y lo escrito en T2 se conserva. Con un `409 TAREA_MODIFICADA` de T1 estando en T2: un aviso, ninguna recarga ni reinicio en T2.
- **CH6-A08 · Editar un recurso.** Lo mismo que CH6-A07 con R1 y R2 (`409 RECURSO_MODIFICADO`).
- **CH6-A09 · Crear una tarea.** Lo escrito en "Nueva tarea" de A (título, tema y categoría de A) no está en la de B. Con el `POST` de A retenido al saltar, al soltar: un aviso, la ruta sigue en "Nueva tarea" de B.
- **CH6-A10 · Editar una clase (admin).** El nombre escrito para A no está en el formulario de B, que muestra el de B; «Guardar» en B manda el `PUT` de B con el nombre de B. Con el `PUT` de A retenido al saltar, al soltar: no navega y el formulario de B no cambia.
- **CH6-A11 · Formularios de las cuatro listas.** Avisos (anuncio con texto y un archivo elegido), Dudas, Recursos (crear) y «Nuevo tema» (Actividades): lo escrito en A no está en B (y «Nuevo tema» está cerrado en B); si el foco estaba en el campo, va al título de B. Con la publicación de A retenida al saltar, al soltar: un aviso y solo se renueva la lista de A. **Regresión O-14:** con el foco en una fila de la lista de A (un «Borrar publicación», una duda, un tema), el salto lo lleva al `h2` de la lista, como hoy.
- **CH6-A12 · Calificaciones.** Gradebook: tras avanzar a «Alumnos siguientes» en A, salto a B: se pide la primera ventana de B (sin `cursor` de A) y no aparece "La clase cambió…". Mis calificaciones: con el filtro "Entregadas" en A, en B el filtro es "Todas".
- **CH6-A13 · Estados vecinos.** (a) A → B → A → B con una confirmación abierta y una petición en vuelo: nada abierto ni en espera en ninguna; un aviso por respuesta. (b) Destino sin caché: «Cargando» y todo nace cerrado (regresión). (c) Con la petición en vuelo, ir fuera de la clase (el inicio) y soltar: un aviso, sin excepciones. (d) Con `StrictMode`: el doble montaje no reabre nada ni mueve el foco.
- **CH6-A14 · `VALIDACION` de A estando en B (§D-2).** En los formularios de las Formas B y C (anuncio, duda, recurso, tema, tarea, edición de tarea, edición de recurso, panel de calificación): el envío de A retenido, salto a B con algo escrito en el formulario de B, y A responde `400 VALIDACION` con (1) un campo que el formulario pinta, (2) uno que no pinta, (3) un mensaje vacío o de solo espacios y (4) un prefijo con ruta (`campo.0.sub:`): un solo aviso legible, ningún `ErrorDeCampo` en el formulario de B y lo escrito en B intacto. Los casos de "un campo que el formulario pinta solo en otro modo" y de "rechazo del servidor seguido de un rechazo local" no cambian en este encargo: el resumen nombra el caso existente de cada formulario que los cubre.
- **CH6-A17 · Hermanos que no cambian (regresión).** `EditorDeCategorias` (lo escrito en A no pasa a B), `DuplicarClaseDeLaRuta`, la ficha de una cuenta (salto entre dos cuentas) y "Mis calificaciones" de una clase anterior: el resumen nombra el caso existente de cada uno o lo escribe aquí.

### CHORE-06a · avisos con la página que se va (`features/clases/avisos-al-redirigir-ch6.test.tsx`)

- **CH6-A15 · Los 13 ganchos.** `it.each` sobre asignar y retirar maestro, agregar y quitar alumno, crear anuncio, borrar publicación, comentar, borrar comentario, crear tema, renombrar tema, borrar tema, ordenar temas y guardar categorías, por cada uno de `401` sin refresco (refresco rechazado), `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`: `toast.error` no se llama; `irA` sí (con su destino). Control en la misma tabla: un `500` da un solo aviso con `mensajeDeErrorClases`. Con el componente real donde lo hay (no con `renderHook` suelto), para que el `mutate` sea el de la vista. (Enmienda 1, M-02) La tabla suma crear y editar clase (`FormularioClase`, admin) y la subida de un archivo al publicar un anuncio y al crear un recurso (la solicitud de subida responde con el código): en las cuatro, ningún aviso; lo escrito y lo elegido se conservan; el botón sale de la espera.
- **CH6-A16 · «Unirme a la clase» y los avisos de recarga.** «Unirme a la clase» con los tres códigos: ningún aviso, el campo sin marcar, `irA` una vez. Las cinco vistas de §D-3 (categorías, Recursos, Actividades, editar recurso, un tema de Recursos) con una recarga que responde `401` sin refresco: ningún "No pudimos actualizar…"; con `503`: uno (regresión).

### CHORE-06a · avisos con la página que se va en `features/tareas` (`features/tareas/avisos-al-redirigir-ch6.test.tsx`; Enmienda 1, M-02)

- **CH6-A18 · `features/tareas`.** Con el router real y la configuración de `providers.tsx`, por cada uno de `401` sin refresco, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`: crear, editar y borrar una tarea; entregar, anular y comentar en el hilo privado (alumno) y comentar en el hilo de un alumno (maestro); la subida de un archivo al crear una tarea y al entregar; y la recarga de la tarea con datos en caché en el detalle, la edición, las entregas y la entrega de un alumno. En todos, ningún `toast.error` e `irA` con su destino; en las mutaciones, lo escrito se conserva y el botón sale de la espera. Control en la misma tabla: un `500` (y un `503` en la recarga) da un solo aviso, el de hoy. Regresión: calificar sigue sin avisar (CAL-1C06) y un `404 TAREA_NO_ENCONTRADA` al entregar y comentar a la vez sigue dando un solo aviso (el de `entregas-01d-r3.ataque.test.tsx:307`).

### CHORE-06a · la regla (`lib/estado-por-id-estatico-ch6.test.ts`)

- **CH6-A30.** Lee con `import.meta.glob("/src/features/**/*.tsx", { query: "?raw", import: "default", eager: true })` el código de producción (sin `.test.`), sin comentarios. (a) Todo render prop de una línea de `ConClaseDeLaRuta` que cumpla `/\{\((claseId)\) => <(\w+)([^>]*)\/>\}/` lleva `key={claseId}` entre sus atributos, salvo la lista cerrada y exacta `clase-layout.tsx#ClaseDeLaRuta`, `clase-anterior-view.tsx#ClaseAnteriorDeLaRuta`, `muro-view.tsx#MuroDeLaClase`, `dudas-view.tsx#DudasDeLaClase`, `recursos-view.tsx#RecursosDeLaClase` y `trabajo-view.tsx#TrabajoDeLaClase`. (b) En esas cuatro listas: `muro-view.tsx` tiene `<FormularioPublicacion key={claseId}`, `dudas-view.tsx` `<FormularioDuda key={claseId}`, `recursos-view.tsx` `<FormularioRecurso key={claseId}` y `trabajo-view.tsx` `creandoEn !== claseId`. (c) `detalle-tarea-view.tsx` tiene `key={tarea.id}`; `editar-tarea-view.tsx` `key={tareaId}`; `editar-recurso-view.tsx` `key={recursoId}`; `entrega-de-alumno-view.tsx` `` key={`${tareaId}:${alumnoId}`} `` (Enmienda 1, M-01: la `key` compuesta; `key={alumnoId}` solo debe hacer fallar el caso). Precondiciones: al menos 15 render props de una línea (hoy son exactamente 15); cada archivo de la lista cerrada existe. (Enmienda 1) Si la precondición de las 15 cae, el mensaje dice que una vista pasó a un render prop de varias líneas, que la regla no ve, y que hay que revisarla a mano o bajar la cifra con la lista nueva en el resumen; no es una falla de la regla. Un caso de control aplica (a) a un texto de ejemplo y falla sin la `key`. El mensaje de falla lista `ruta#Componente`. El programador puede endurecer una expresión, nunca aflojarla (lo dice en el resumen).

### CHORE-06b · la política (`components/seccion/recargas-ch6.test.tsx`)

- **CH6-B01 · `useRecargarAlPulsarLaSeccion`**, con `createMemoryRouter` y el `QueryClient` de `providers.tsx`. Una pulsación es otra `location.key` en la misma ruta. Estados: (a) sana y fresca: 0 peticiones; (b) sana y marcada vieja (`invalidateQueries` con `refetchType: "none"`): 1; (c) sana con más de 30 s (`vi.setSystemTime`): 1; (d) en error sin datos: 1; (e) en error con datos (página siguiente fallida): 1, desde la primera página; (f) en error y pidiendo (la petición retenida): 0, y la petición en vuelo no se cancela (su respuesta se aplica); (g) dos pulsaciones en el mismo `act` con la consulta en error: 1; (h) el primer render no cuenta; (i) dos consultas en la misma llamada: cada una según su estado.
- **CH6-B02 · `useMarcarViejaSiQuedoEnError` movido.** En error al desmontarse: queda `isInvalidated` y no se pide; sana: no se toca; al cambiar de clave en error: la anterior queda vieja. Además, las pruebas de `features/admin` que lo usan siguen en verde (regresión, sin cambio).

### CHORE-06b · frases de recuperación por camino (`features/clases/recargas-ch6.test.tsx`)

Por cada lista de la tabla de §D-4 y cada frase que pinta (el texto de la consulta ante un `500` o la red, "…Vuelve a abrir…" ante el `400` del cursor, el texto fijo del lugar en Personas y el roster), un caso por camino. En cada uno, la acción vuelve a pedir lo que la frase promete (desde la primera página), la frase desaparece y no se sirve de la caché lo que se sabe viejo:
- **CH6-B03 · Pulsar la sección estando en ella** (otra `location.key`): Avisos, comentarios abiertos (pulsando «Avisos» o «Recursos»), Dudas, respuestas abiertas (pulsando «Dudas»), Actividades (los temas y un tema), Recursos (los temas y un tema), Personas, el roster, y los dos inicios pulsando «Inicio» de la barra.
- **CH6-B04 · Ir a otra sección y volver antes de 30 s**, con la consulta en error **con datos** (una recarga o una página que falló) y sin datos: en las 12.
- **CH6-B05 · Atrás y adelante del historial** a otra entrada de la misma ruta (pulsar dos veces la sección, fallar, ir atrás): en Avisos, Dudas y un inicio.
- **CH6-B06 · Repetir el control:** «Ver más» (CH6-B10); cerrar y abrir los comentarios y las respuestas ("Vuelve a abrirlos", "Vuelve a abrirlas").
- **CH6-B07 · H-2:** con la lista en error y la nueva petición retenida, dos pulsaciones seguidas (en el mismo `act` y en renders distintos) mandan una sola petición, en las siete vistas de la fila 346.
- **CH6-B08 · O-03:** tras «Subir» con la recarga por sección fallida (la respuesta del orden escrita y la lista marcada vieja), pulsar «Actividades de aprendizaje» estando ahí pide la lista de temas una vez y los conteos se renuevan.
- **CH6-B09 · Hermano de T-07** (`/admin/clases` y "Clases anteriores"): con la lista en error y una recarga en vuelo, pulsar la sección no manda otra; al responder, la lista aparece.
- Los caminos que ya tienen caso (Recursos, Dudas y el cursor de las listas, en `recursos-caminos-03d.test.tsx`, `dudas-caminos-03e.test.tsx`, `recuperar-ch3.test.tsx` y `consultas-ch3.test.tsx`) no se repiten: el resumen nombra, por lista y camino, el caso que lo cubre, y esas pruebas siguen en verde con PR-1.

### CHORE-06b · «Ver más» que falla (`features/clases/ver-mas-ch6.test.tsx`)

Por cada una de las 9 listas de §D-5 (Avisos, comentarios, Dudas, respuestas, un tema de Actividades, Personas, el roster, inicio del estudiante e inicio del maestro):
- **CH6-B10 · `5xx` y red.** Salen las dos peticiones de la página (`retry: 1`) y ninguna más; la lista se queda con sus filas; un solo aviso con `mensajeDeConsultaClases(error)`; «Ver más» a la vista y fuera de espera, con el foco en él si lo tenía; en los inicios, sin el `MensajeError` del panel y sin el error en el título del bloque destacado. Un clic en «Ver más» pide la página con el mismo cursor; si responde bien, aparecen las filas nuevas sin otro aviso (camino "repetir el control" de la frase del aviso). Pulsar la sección y volver de otra sección también la recuperan (CH6-B03 y B04).
- **CH6-B11 · Lo que sigue reemplazando.** `400` del cursor: la frase "…Vuelve a abrir…" reemplaza la lista, sin aviso; `403 SIN_ACCESO_A_LA_CLASE`: el error de la clase, como hoy; `401` sin refresco: ningún aviso e `irA` a `/login` (Enmienda 1: la prueba no afirma qué se ve el instante que dura la recarga de `irA`; el error puede reemplazar la lista ese instante, como O-r1-6).
- **CH6-B12 · Estados vecinos.** (a) Dos fallos seguidos de la página: dos avisos, uno por fallo, y la lista sigue. (b) La página en vuelo y una recarga de fondo que gana (ATQ-CH4-21): ningún aviso, «Ver más» pide con el cursor renovado. (c) La página en vuelo y la vista desmontada (otra sección) antes de que falle: ningún aviso; al volver, la lista se pide (PR-2). (d) Montar la vista con el fallo ya ocurrido (volver antes de que se pida otra vez): ningún aviso repetido. (e) Dos clics en «Ver más» en el mismo `act` tras el fallo: una sola petición.
- **CH6-B13 · Comentarios de una publicación borrada (hermano de T-02).** Abrir los comentarios y, en otro caso, «Ver más comentarios» con `404 PUBLICACION_NO_ENCONTRADA`: un solo mensaje en el bloque («Esa publicación ya no existe.»), sin aviso; la lista de Avisos se pide **una** vez y la fila sale; el foco, si estaba en el bloque, va al «Borrar publicación» de la vecina o al `h2`. Lo mismo con un recurso (la lista de Recursos se renueva). Dos fallos seguidos: una renovación por fallo.

### CHORE-06b · gradebook y barra (`features/calificaciones/gradebook-ch6.test.tsx`; la barra en `features/clases/recargas-ch6.test.tsx`)

- **CH6-B14 · N-52.** El escenario de CAL-T-248 (dos cambios de la clase en menos de 30 s con el mismo límite de ventana): (a) pulsando «Calificaciones» y (b) saliendo y volviendo antes de 30 s con la frase a la vista: «Alumnos siguientes» pide la ventana (no la sirve de la caché) y, si ya no está vacía, el texto desaparece. (c) Regresión de CAL-T-201: con la vista quieta y la caché fresca, regresar y volver a avanzar a la ventana vacía no pide nada.
- **CH6-B15 · Clase archivada en la barra (fila 361).** Alumno y maestro con A en la barra: abrir A y que llegue archivada (el alumno pasa a "Clases anteriores"): la barra y la lista del inicio se piden una vez y ya no la traen. Admin: ninguna petición de `CLAVE_CLASES_INSCRITAS` ni `CLAVE_CLASES_IMPARTIDAS`. (Enmienda 1, N-03) Maestro que abre una clase archivada desde "Clases archivadas", con la barra en caché sin esa clase: ninguna petición de la barra ni del inicio, también al abrirla dos veces seguidas.

### Mutaciones que deben hacer caer su caso

| Subentrega | Se quita | Debe caer |
|---|---|---|
| 06a | `key={claseId}` de `maestros-de-clase-view.tsx` | CH6-A01, CH6-A03 (maestro) |
| 06a | `key={claseId}` de `alumnos-view.tsx` | CH6-A02, CH6-A03 (alumno) |
| 06a | `key={tarea.id}` de `detalle-tarea-view.tsx` | CH6-A04, CH6-A05 |
| 06a | la `key` compuesta del contenido de `entrega-de-alumno-view.tsx` (entera) | CH6-A06 |
| 06a | (Enmienda 1, M-01) la parte de `tareaId` de esa `key` (queda `key={alumnoId}`) | CH6-A06, camino "mismo alumno, otra tarea", y CH6-A30 (c) |
| 06a | `key={tareaId}` del contenido y, aparte, la guarda de `useMontado` de `editar-tarea-view.tsx` | CH6-A07 (lo escrito) y CH6-A07 (no navega), cada uno |
| 06a | la guarda de `useMontado` de `crear-tarea-view.tsx` | CH6-A09 (no navega) |
| 06a | la línea de `creandoEn !== claseId` de `trabajo-view.tsx` | CH6-A11 («Nuevo tema») |
| 06a | `key={claseId}` de `FormularioPublicacion` | CH6-A11 (Avisos) y CH6-A30 |
| 06a | la guarda de `errorQueRedirigeElCliente` de un gancho (uno por grupo: maestros, alumnos, publicaciones, temas, categorías) | su fila de CH6-A15 |
| 06a | (Enmienda 1, M-02) la guarda de `formulario-clase.tsx` y, aparte, la de la subida de `formulario-publicacion.tsx` | sus filas de CH6-A15 |
| 06a | (Enmienda 1, M-02) en `features/tareas/hooks.ts`, la guarda de `useEditarTarea`, la de `avisarDelErrorDeLaEntrega` y la de `useAvisoDeRecargaFallida` (cada una); y la de la subida de `formulario-de-entrega.tsx` | sus filas de CH6-A18 |
| 06b | `isStale` de la condición de PR-1 | CH6-B01 (b) y (c), CH6-B08 |
| 06b | la comprobación de `isFetching` de PR-1 | CH6-B01 (f), CH6-B07 |
| 06b | `useMarcarViejaSiQuedoEnError` de una lista (Avisos) | CH6-B04 (Avisos, con datos) |
| 06b | `&& !conserva` de la condición de error de una lista (comentarios, y un inicio) | CH6-B10 de esa lista |
| 06b | `useRenovarSiLaPublicacionYaNoEsta` | CH6-B13 |
| 06b | las dos llamadas de `useMarcarViejasLasVentanas` (cada una) | CH6-B14 (a) y (b) |
| 06b | la guarda de `fetchStatus` de `useRecuperarListaDeClasesAdmin` | CH6-B09 |
| 06b | (Enmienda 1, N-03) la comprobación con `listaTraeLaClase` (invalidar siempre) | CH6-B15, caso del maestro desde "Clases archivadas" |

Si un caso pasa sin su remedio: PA-7.

### Regresión

- 06a: `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` y `npm run lint` en cada ronda.
- 06b: `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` y `npm run lint` en cada ronda.
- La suite completa del frontend y `npm run build`, una vez por subentrega, en la verificación del manager al cerrarla. Sin backend: no se toca `shared/`.

## Puntos de ataque para el Tester

Por mecanismo, no por control (lección 2 de ADMIN-01).

1. **M-1, lo abierto de un id en otro.** Cualquier ruta con un id (`:claseId`, `:tareaId`, `:alumnoId`, `:recursoId`, `:usuarioId`) y cualquier estado local que la vista pinte: confirmaciones, formularios, bloques desplegados, filtros, ventanas, contadores de reinicio, la espera de la lectura fresca. Saltos del historial con el destino en caché (y sin él), A → B → A → B, la misma persona o el mismo tema en las dos clases (la `key` debe ser única por el id de la ruta: lección 3 de CHORE-04). Que nada abierto pase, que nada escrito se envíe al otro id, que ninguna respuesta del anterior navegue, reinicie o enfoque en el nuevo, y que el foco vaya al título, a la raíz o al `h2`, nunca a `<body>`. Una vista nueva bajo la clase sin `key` que la regla CH6-A30 no vea es observación con propuesta para endurecerla.
2. **M-2, avisos con la página que se va.** (Enmienda 1) Cada aviso de error de una mutación, una subida, una descarga o una recarga en todo `src/` salvo `features/auth` (ganchos, componentes y manejadores de `features/clases`, `features/tareas`, `features/calificaciones`, `features/admin` y `components/`) ante los tres códigos; con la vista montada y desmontada. La descarga de `components/adjuntos` sin `alFallarLaDescarga` es una decisión tomada (DH-04): observación, no hallazgo. Y lo contrario: un código que **no** redirige (un `401` sin token enviado) no debe quedar mudo donde antes avisaba (R-03).
3. **M-3, pulsar la sección y volver.** Cada lista de §D-4 en sus estados: sana fresca, sana vieja, en error con y sin datos, pidiendo, recién montada con un fallo ya ocurrido; pulsar dos veces; pulsar con una página siguiente en vuelo; volver antes y después de 30 s; atrás y adelante. Que ninguna petición se cancele ni se duplique y que cada frase desaparezca por cada camino.
4. **M-4, la página siguiente.** Cada lista de §D-5 con `5xx`, red, `400` del cursor, `403`, `401`, `404` de la publicación o de la duda; dos fallos seguidos; página y recarga a la vez; foco en «Ver más»; la vista desmontada. Que haya un solo mensaje por fallo y nunca uno de más mientras la página se va.
5. **N-52 y la barra.** Las ventanas del gradebook tras pulsar o salir con la frase a la vista; la barra y los inicios tras leer una clase archivada, en los tres roles. (Enmienda 2, O-E1-2) `listaTraeLaClase` con una forma inesperada en la caché bajo `CLAVE_CLASES_INSCRITAS` o `CLAVE_CLASES_IMPARTIDAS` (datos sin `pages` ni `clases`, `pages` vacío, una página sin `clases`, filas sin `id`, `null`, `undefined`, una consulta en error sin datos): que no lance, que devuelva falso y que el gancho no invalide por ella, y que una forma válida junto a una inesperada siga encontrando la clase.

**Decisiones tomadas que no son hallazgo** (se anotan como observación, sin prueba roja):
- Volver al id anterior con su petición en vuelo deja los controles sin espera; pedir la acción otra vez exige volver a confirmar y el servidor responde con su error (S-03).
- Lo que el plan deja fuera (DH-05): el foco al cambiar de sección o abrir una tarea, el seguimiento del foco de la ventana, O-1/O-2 y O-7/O-8 de CLASES-03e, O-r1-6 de CHORE-03, O-r1-1 de CLASES-03e.
- Las variantes registradas de la política (`features/admin`, `/admin/clases`, "Clases anteriores", Calificaciones; §D-4).
- Una recarga de fondo que falla sigue reemplazando la lista (T-04 de 02c; DH-02 (a)).

## Riesgos y desacuerdos

- **R-01 · Tamaño (Enmienda 1).** 06a y 06b tienen 32 archivos cada una (06b, hasta 34 si caen las dos condicionales): "unos 30", como CHORE-04 (33); el humano decidió no partir más (DH-06 (a)).
- **R-02 · La regla CH6-A30 solo ve la forma de una línea.** Una vista nueva con un render prop de varias líneas no la dispara. Lo mitiga la viñeta de `CLAUDE.md` (A-1) y el ataque del punto 1.
- **R-03 · `errorQueRedirigeElCliente` mira el código, no si hubo redirección** (§D-3). En las vistas de una clase la sesión existe y la ruta no es de las de sin sesión, así que `apiClient` siempre redirige ante esos códigos. (Enmienda 1) Es la regla que ya siguen CLASES-03, ADMIN-01, `features/calificaciones` y, en `features/tareas`, calificar, la descarga y los «Ver más»; esta enmienda la extiende al resto de `features/tareas` (DH-04).
- **R-04 · Cambio visible declarado (06a).** Al cambiar de clase con un salto del historial, el foco que estaba en un formulario, en Personas o en Calificaciones va al título de la clase (antes se quedaba en el control de la otra clase). Al cambiar de tarea, alumno o recurso, a la raíz de la vista.
- **R-05 · Cambio visible declarado (06b).** Pulsar la sección con la lista vieja la vuelve a pedir (DH-03 b). Tras el fallo de «Ver más», la lista se queda con un aviso (DH-02 a): el foco se queda en «Ver más» en lugar de ir al encabezado.
- **R-06 · Dos implementaciones de una política.** `features/admin` y las listas de clases del admin usan `resetQueries` (vuelven a la primera página sin las demás); `features/clases`, `refetch` (vuelve a pedir desde la primera tantas páginas como había). Las dos cumplen "desde la primera página, sin cancelar ni duplicar". Unificar la implementación cambiaría conductas probadas en ADMIN-01 sin beneficio para la persona; queda registrado en `CLAUDE.md` (A-1).
- **R-07 · La Forma C observa la consulta dos veces** (marco y contenido). Misma clave, una sola petición; si una prueba que cuenta llamadas al montar cambiara de cifra, es PA-1, no se ajusta a mano.
- **R-08 · DH-05 deja el foco al cambiar de ruta en `<body>`** hasta el encargo que lo tome. Es lo que pasa hoy.
- **R-09 (Enmienda 1) · Un punto en que difiero de la revisión del plan.** M-03 da por hecho que PR-C18 (`muro-view.test.tsx:344`) y la de `muro-recuperar-c-r4.ataque.test.tsx:208-223` cambian de sentido porque sus clientes no tienen `staleTime`. Pero la lista de Avisos no usa el `staleTime` del cliente: `usePublicaciones` fija el suyo (`features/clases/hooks.ts:1023-1027`, 240 s o hasta que venza una vista previa firmada), así que, recién pedida y sin adjuntos, está fresca y PR-1 no pide. Las dejo como condicionales, con su reescritura ya redactada (lista cerrada y C-10). (Enmienda 2) El manager me dio la razón en la verificación de la Enmienda 1; siguen condicionales.
- **R-10 (Enmienda 1) · La descarga de `components/adjuntos` sigue avisando** ante un código que redirige mientras no llegue su destino (DH-04): un aviso que dura lo que la recarga de `irA`, solo si la sesión se pierde justo en ese clic.
- **Desacuerdos con `ARCHITECTURE-ESSENTIALS.md`:** ninguno.

## Comprobación humana

Decidida (DH-07 (a)): al cerrar 06b. Máximo 4 puntos, unos 8 minutos; solo lo que jsdom no ve (el historial real del navegador, la red cortada de verdad y el lector de pantalla). Lo hace el humano en su navegador; ningún agente abre uno.

- **H-1 · Quitar en otra clase (O-r1-1).** Como admin: abrir Personas de la clase B; después Personas de la clase A, con un maestro que también dé B. Pulsar «Quitar» de ese maestro y, con la confirmación abierta, mantener presionado «Atrás» del navegador y elegir la entrada de Personas de B (Enmienda 1, N-01: un solo «Atrás» lleva al muro de A, porque la barra entra a la clase por el muro). En B no hay confirmación y el foco (con su contorno) está en el nombre de la clase.
- **H-2 · Calificar a otro alumno.** Como maestro: abrir la entrega de un alumno, volver a "Entregas", abrir la de otro y escribir puntos sin enviar; mantener presionado «Atrás» y elegir la entrega del primero. El panel muestra lo del primero, sin los puntos escritos.
- **H-3 · «Ver más» sin red.** En Avisos con más de 20 anuncios, cortar la red (herramientas del navegador, "Sin conexión") y pulsar «Ver más avisos»: la lista se queda, sale un aviso y el botón sigue. Volver la red y pulsarlo: llegan los siguientes.
- **H-4 · Lector de pantalla (opcional, si hay NVDA).** En H-1 y H-3: al llegar a B se lee el nombre de la clase; el aviso del fallo se lee una vez.

## Paradas (el programador se detiene y reporta)

- **PA-1.** Una prueba normal fuera de la lista cerrada falla por el cambio.
- **PA-2.** Una `*.ataque` fuera de los C-n de su subentrega falla, o los C-n no están aplicados por el tester al empezar.
- **PA-3.** CH6-A30 falla en un archivo que no está en "Se toca", o exigiría aflojar una expresión.
- **PA-4.** Hace falta tocar un archivo de "No se toca" (por ejemplo `clase-layout.tsx`, `components/foco/`, `components/clase/`, `services/apiClient.ts`, `panel-mis-clases.tsx`, `bloque-destacado.tsx`), dar `mutationKey` a un gancho, o cambiar la firma de `useAvisoDeRecargaFallida`.
- **PA-5.** Con el remedio, el foco cae en `<body>` en un caso de §D-1 o §D-5. No se arregla tocando los ganchos de foco.
- **PA-6.** Un archivo gana o pierde un `enEspera=` (V-06 de `styles/clases-r1.ataque.test.ts`).
- **PA-7.** Un caso pasa sin su remedio (tabla "Mutaciones") y no se logra reescribir para que caiga.
- **PA-8 (06b).** `refetch({ cancelRefetch: false })` sobre una consulta por páginas en error repite el cursor vencido en lugar de calcularlo desde la primera página, o deja la frase a la vista después de responder bien.

## Pasos de implementación

**Antes de todo**, el programador pide al orquestador la respuesta del humano sobre si la otra copia de trabajo corre una suite (`AGENTS.md`, "Trabajo en paralelo"); sin ella, se detiene.

**CHORE-06a**
1. **Ronda 0 del tester:** C-1 y C-2 de §D-R0, y la confirmación del inventario con los `rg` de la lista cerrada. El programador arranca con C-1 y C-2 aplicados (si no, PA-2).
2. **Rojo primero:** escribir `app/estado-por-id-ch6.test.tsx` (CH6-A01 a A14 y A17), `features/clases/avisos-al-redirigir-ch6.test.tsx` (CH6-A15 y A16) y (Enmienda 1) `features/tareas/avisos-al-redirigir-ch6.test.tsx` (CH6-A18); correrlas con `npx vitest run src/app/estado-por-id-ch6.test.tsx src/features/clases/avisos-al-redirigir-ch6.test.tsx src/features/tareas/avisos-al-redirigir-ch6.test.tsx`; anotar cuáles fallan (se esperan rojas A01 a A12, A15, A16 y A18 salvo sus controles; verdes A13 (b) y A17).
3. **Forma A** (§D-1): las ocho `key` y la guarda de `useMontado` de crear tarea.
4. **Forma B:** los tres formularios con `key` y `creandoEn` de `trabajo-view.tsx`.
5. **Forma C:** `editar-tarea-view.tsx`, `editar-recurso-view.tsx` y `entrega-de-alumno-view.tsx` (marco y contenido), y la `key` de `detalle-tarea-view.tsx`.
6. **M-2** (§D-3): `hooks.ts`, `formulario-unirse-clase.tsx` y los cinco llamadores de `useAvisoDeRecargaFallida`; (Enmienda 1) `formulario-clase.tsx`, `formulario-publicacion.tsx` y `formulario-recurso.tsx`; y en `features/tareas`, `hooks.ts`, `formulario-tarea.tsx` y `formulario-de-entrega.tsx`, solo en las líneas de §D-3.
7. **Lista cerrada:** `features/clases/guardas-ch4.test.tsx`, exactamente como dice la lista.
8. **Regla estática:** `lib/estado-por-id-estatico-ch6.test.ts` (CH6-A30).
9. **Mutaciones** de la tabla (06a), una por una, restaurando y comprobando con `git diff`.
10. **Verificación de la ronda:** `npm run lint` (desde `frontend/`) y la suite de "Regresión" de 06a. Formateadores solo sobre `frontend/`.
11. **Resumen verificable:** cada CH6 con su archivo y título exacto; los casos existentes que cubren CH6-A14 (los dos vecinos que no cambian) y CH6-A17; las cifras con su comando (`npx vitest list`, contadas con `grep -a`); la última línea de `lint` y de la suite; la tabla de mutaciones con el caso que cayó; los hermanos por mecanismo de §D-1 y §D-3, uno por uno, con si el remedio aplica y se aplicó, y los estados vecinos de §D-1 recorridos; la matriz de §D-7; (Enmienda 1) la revisión de cada `key` de §D-1 con el criterio "única por todos los ids de la ruta"; el conteo final de archivos contra los 32 de §D-0.

**CHORE-06b** (después del commit de 06a)
12. **Ronda 0 del tester:** C-3 a C-9 (Enmienda 1) y la confirmación del inventario. C-10 solo si su condición se cumple (PA-2 del programador).
13. **Rojo primero:** escribir `components/seccion/recargas-ch6.test.tsx` (B01, B02), `features/clases/recargas-ch6.test.tsx` (B03 a B09 y B15), `features/clases/ver-mas-ch6.test.tsx` (B10 a B13) y `features/calificaciones/gradebook-ch6.test.tsx` (B14); correrlas y anotar cuáles fallan.
14. **La política** (§D-4): `components/seccion/types.ts` y `hooks.ts` (el gancho nuevo y el movido), la reexportación en `features/admin/hooks.ts`; las 12 listas; las dos guardas de `fetchStatus`.
15. **«Ver más»** (§D-5): `conservaLaListaTrasLaPagina` en `lib.ts`; las 9 listas; `useRenovarSiLaPublicacionYaNoEsta` y su llamada en `comentarios-de-publicacion.tsx`.
16. **§D-6:** `useMarcarViejasLasVentanas` y sus dos llamadas en `gradebook-view.tsx`; `useClaseArchivadaEnSuLista`.
17. **Lista cerrada:** `ver-mas-y-orden-ch4.test.tsx` (CH4-30 (c) y CH4-31 (c)) y `personas-view.test.tsx:263`; (Enmienda 1) `muro-view.test.tsx:344` solo si cae, con la reescritura de la lista.
18. **Mutaciones** de la tabla (06b).
19. **Verificación de la ronda:** `npm run lint` y la suite de "Regresión" de 06b.
20. **Resumen verificable**, como el paso 11, con la matriz de 06b y, por cada frase de recuperación, el caso de cada camino (nuevo o existente); el conteo contra los 32 de §D-0 (Enmienda 1), y si cayó alguna condicional.

## Al cierre (los aplica el orquestador, con la autorización del humano para los archivos fuera de `docs/trabajo/`)

- **A-1 · `CLAUDE.md`** (al cerrar 06b, con lo de 06a):
  - En "Ubicaciones compartidas", la viñeta de `components/seccion/` pasa a: "`components/seccion/` — `useAlPulsarLaSeccionActiva` (`hooks.ts`): llama a su función cuando se pulsa la sección en la que ya se está (otra `location.key` en la misma ruta). Sobre él, la política única de recarga (CHORE-06): `useRecargarAlPulsarLaSeccion` vuelve a pedir cada consulta que está en error o vieja, sin cancelar ni duplicar lo que vuela, y `useMarcarViejaSiQuedoEnError` (movido desde `features/admin`, que lo reexporta) marca vieja al salir una consulta que quedó en error, así que volver antes del `staleTime` la pide. Los usan las listas de `features/clases`; `features/admin`, `/admin/clases`, "Clases anteriores" y `features/calificaciones` tienen su variante (vuelven a la primera página con `resetQueries`, o a la ventana inicial)."
  - En "Componentes", una viñeta nueva después de la de la guarda: "Lo abierto es del id de la ruta (CHORE-06a): una vista bajo una ruta con id (`:claseId`, `:tareaId`, `:alumnoId`, `:recursoId`, `:usuarioId`) que guarda estado local (un formulario, una confirmación, un filtro, un contador de reinicios) lo monta de nuevo cuando el id cambia: `key` por ese id en el componente que pinta `ConClaseDeLaRuta`, o, si la vista tiene su raíz de foco, en el contenido debajo de ella (como `FichaDeLaCuenta`). La `key` es única por **todos** los ids de la ruta de los que depende lo que la vista escribe o muestra (la entrega de un alumno, por `tareaId` y `alumnoId` juntos), no por el id de una fila que puede estar en dos clases ni por el último id de la ruta. `lib/estado-por-id-estatico-ch6.test.ts` lo verifica en los render props de `ConClaseDeLaRuta`." (Enmienda 1, M-01)
  - En "Manejo de errores en el frontend", al final de "Textos del servidor": "Quien recibe un error de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`, en cualquier parte del frontend (una mutación, una subida, una descarga o una recarga), no avisa: `apiClient` ya saca a la persona de la página (CHORE-06a). Excepciones registradas: los formularios de `features/auth`, donde `apiClient` no redirige en las pantallas sin sesión, y la descarga de `components/adjuntos` sin `alFallarLaDescarga` (ESTADO §3)." (Enmienda 1, M-02.)
- **A-2 · `docs/DESIGN.md`:**
  - §7.10, después de la viñeta **Error**: "**Error de la página siguiente (CHORE-06b, propuesta):** si «Ver más» falla por la red o el servidor y la lista ya tiene filas, la lista se queda como estaba, un solo aviso dice el error («Algo salió mal. Inténtalo de nuevo.» o el de la red) y «Ver más» sigue a la vista para repetir; el foco se queda en el botón. El cursor vencido (la lista cambió) y un error que quita el acceso reemplazan la lista con su frase, como antes; una recarga de fondo que falla también la reemplaza. Lo implementan, desde CHORE-06b, Avisos, comentarios, Actividades, Dudas, respuestas, Personas, el roster y los inicios. Recursos, Entregas y Mis calificaciones van más allá: conservan la lista también cuando falla una recarga de fondo." (Enmienda 1, matiz del manager en DH-02.)
  - §7.14, al final: "**Lo abierto es de su clase (CHORE-06a, propuesta):** una confirmación, un formulario o un bloque abierto pertenece a la clase, tarea, alumno o recurso en que se abrió. Si la persona salta a otro con el historial, no aparece abierto en el nuevo ni reaparece al volver, y nada de lo escrito se envía al otro. Si el control que tenía el foco desaparece por eso, el foco va al título de la clase (al cambiar de clase) o a la raíz de la vista (al cambiar de tarea, alumno o recurso); en las listas de Avisos, Dudas, Actividades y Recursos, una fila con el foco lo lleva al encabezado de la lista, como antes."
- **(Enmienda 1, N-02) Cómo se ubican las filas.** El orquestador localiza cada fila de `docs/ESTADO.md` §3 por el texto con que empieza, no por el número (los números de abajo son del árbol de trabajo del 2026-11-12 y en `47c3339` van 3 líneas antes). Entre paréntesis, el inicio de cada fila.
- **A-3 · `docs/ESTADO.md` §3:** marcar hechas, con "Hecho en CHORE-06a" o "06b", las filas 346 ("CHORE-04, H-2 (S-04 de su plan)…"), 347 ("CHORE-04 (M-01 de la revisión de su plan), el aviso de más…"; con la Enmienda 1, también `features/tareas` y lo nuevo de `features/clases`), 348 ("**CHORE-04, H-3 (S-07 de su plan)…"), 360 ("ADMIN-01d1 (decisión 2 de su implementación): 12 entradas…"), 361 ("ADMIN-01d2: la barra lateral y las listas del inicio…"), 384 ("O-03 de la ronda 2 de CLASES-03c2…"), 397 ("Hermano de T-02 de CLASES-03e en Avisos y Recursos…"), 415 ("O-r1c-2 de CALIFICACIONES-01c…") y 446 ("N-52 de CALIFICACIONES-01d…"); en la 445 ("\"Vuelve a abrir Trabajo de clase para verlo completo.\"…", N-54), "el resto del inventario, hecho en CHORE-06b"; en la 416 ("`key={claseId}` de CALIFICACIONES-01d…"), que `GradebookView` lleva su `key` desde CHORE-06a; la 509 ("\"Ver más clases\" (inicios de a, `panel-mis-clases.tsx`)…") se cierra como ya resuelta (verificado en `47c3339`: `inicio-estudiante-view.tsx:56`).
- **A-4 · `docs/ESTADO.md` §3, filas que cambian de destino o se suman** (Enmienda 2: con las decisiones del 2026-11-12). Los dos encargos nuevos ya están en la sección 2b, en la viñeta "Dos encargos nuevos que salen de CHORE-06", que anotó el orquestador: (1) **el encargo del foco al cambiar de ruta**, antes de DEPLOY, con su lugar por definir, y el **`chore` de accesibilidad del marco**, después de DEPLOY; (2) **el encargo de la defensa en el servidor**, después de DEPLOY. A-4 no los vuelve a registrar en 2b; solo cambia el destino de las filas de §3 para que remitan a ellos:
  - **Al encargo del foco al cambiar de ruta (antes de DEPLOY; 2b, punto 1):** "Foco al cambiar de ruta en la SPA…" (444) y el punto (3) de "Foco tras navegar o reemplazar la vista, de ADMIN-01…" (362).
  - **Al `chore` de accesibilidad del marco (después de DEPLOY; 2b, punto 1):** los puntos (1), (2), (4) y (5) de la 362; las filas 391 ("O-1 y O-2 de CLASES-03e (manager)…"), 394 ("O-7 y O-8 de CLASES-03e…"), 400 ("Mecanismo de foco de `features/tareas`…"), 447 ("M-14 y O-20 de CLASES-02d…"), 526 ("Punto 9 de CALIFICACIONES-02b…"), 376 ("O-r1-6 de CHORE-03 03c…") y 392 ("O-r1-1 de CLASES-03e (tester)…").
  - **Sin cambio de destino:** 387, 398 y 356.
  - **Fila nueva (M-02, DH-04):** "CHORE-06a: la descarga de `components/adjuntos/adjuntos-de-publicacion.tsx:77` sin `alFallarLaDescarga` (Avisos y Recursos) avisa ante un código con que `apiClient` redirige. No se callaba sin importar `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` fuera de los `lib.ts` de módulo (N-46). El camino previsto (O-E1-1 del manager) es la prop `alFallarLaDescarga`, que ya existe en `AdjuntosDePublicacion`: pasarla desde `features/clases/components/publicacion-del-muro.tsx` y `elemento-de-recurso.tsx` con un manejador que calle ante esos códigos y avise lo demás con `mensajeDeErrorClases`" → destino: el próximo encargo que toque `components/adjuntos` (ENVIVO) o el `chore` de accesibilidad del marco, lo que llegue antes.
  - **La defensa en el servidor (DH-09):** sin fila en §3; ya la lleva la sección 2b (punto 2).

