# handlers/

Un plugin de Fastify por dominio, delgado: validar la entrada → llamar a `core/` → responder.
Sin verificaciones de permisos a mano (eso es `middleware/`) y sin `try/catch` propios, salvo
para traducir un error de proveedor a `AppError`.

El formato de error `{ "error": { "codigo", "mensaje" } }` lo aplica `errores.ts` para todas
las rutas; ninguna otra ruta formatea errores.

## Plugins (AUTH-02, AUTH-03a, AUTH-03b, AUTH-03c)

- `auth/cuentas.ts` (prefijo `/api/auth`): `recuperar`, `restablecer`, `invitacion` y
  `establecer-contrasena` (públicas; `invitacion` solo devuelve el nombre de la cuenta con el
  token de una invitación viva, y `establecer-contrasena` admite corregir ese nombre) y
  `cambiar-contrasena` (con `protegido({ permitirCambioPendiente: true,
permitirRestringido: true })`; pide solo la contraseña nueva y exige una sesión viva del mismo
  usuario, con un filtro previo sin bloqueo y la decisión definitiva bajo el bloqueo del usuario).
- `auth/registro-maestro.ts` (prefijo `/api/auth`): `registro-maestro` (pública; registro de
  maestro con un enlace de registro vivo del admin; rol, enlaceRegistroId y cualquier otro campo
  extra del cuerpo se descartan; deja la sesión iniciada, como el registro de estudiante).
- `admin.ts` (prefijo `/api/admin`): `maestros`, `maestros/lote` (invitación masiva: analiza la
  lista, respeta el cupo diario `limiteDiarioInvitaciones` y encola un trabajo por maestro insertado
  con un solo `insert` de pg-boss dentro de su transacción), `usuarios/buscar`,
  `usuarios/:id/restablecer-contrasena`, `usuarios/:id/correo`,
  `enlaces-registro` (crear y listar), `enlaces-registro/:id/revocar` (idempotente) y
  `enlaces-registro/:id/registrados`; todas con `protegido({ roles: ["admin"] })`. El token del
  enlace solo viaja en la respuesta de crearlo, con `Cache-Control: no-store`.
- `admin/usuarios.ts` (ADMIN-01e, §D-7 y §D-8; lo registra el plugin de `admin.ts`, mismo prefijo
  `/api/admin`): `GET usuarios` (búsqueda, rol, estado de pago y cursor con su posición
  `cursorNombre`, que decide el adaptador), `GET usuarios/:id`, `PUT usuarios/:id/nombre`,
  `PUT usuarios/:id/activo` (baja y reactivación), `POST alumnos` (alta con contraseña temporal, `201`
  con `Cache-Control: no-store`), `PUT alumnos/estado-pago` (lote), `PUT alumnos/:id/acceso`,
  `GET resumen` y `GET movimientos-inscripcion`; todas con `protegido({ roles: ["admin"] })`. Las
  decisiones (baja, acceso, búsqueda y la fila que ve el admin) son de `core/usuarios/`; el handler no
  compara roles ni estados. Vive aparte de `admin.ts` para que este no nombre el estado de pago.

- `clases/clases.ts` (prefijo `/api`, CLASES-a): `GET /clases/inscritas` y
  `GET /clases/impartidas` (listas propias por rol, paginadas por cursor), `POST /clases/unirse`
  (con código, idempotente), `GET /clases/:claseId` (detalle, también para el admin) y
  `GET/POST /clases/:claseId/codigo` (ver y regenerar el código, con `Cache-Control: no-store`, para
  el maestro de la clase y el admin). Desde CLASES-02a el maestro ya no crea ni edita clases. Las
  tres últimas llevan el sexto paso (`requireMembership` o `requireOwnership`, §D-0) y leen la clase
  de la ruta con `claseDe(request)`, nunca con el `claseId` crudo del parámetro. El código de la
  clase se genera en el handler (`node:crypto.randomBytes` + `codigoDesdeBytes` de `core/`); el
  adaptador reintenta una sola vez si choca con el índice único (S-03). ADMIN-01a suma
  `GET /clases/anteriores` (estudiante y maestro: sus clases archivadas, paginadas por cursor, sin
  estado de pago, restricción, correo ni versión; la página siguiente se pide con `cursor` y
  `cursorArchivadaEn`, que el handler valida con `listaClasesAnterioresConsultaSchema`, pasa al
  adaptador y devuelve en `siguienteCursorArchivadaEn`, Enmienda 5) y unirse con `unirseConCodigo`: el código de una
  clase archivada responde `404 CODIGO_INVALIDO`, como uno inexistente. El detalle trae `archivadaEn`.
- **Clase archivada (ADMIN-01a, §D-1):** cada ruta con `:claseId` declara en `protegido()` su
  `enClaseArchivada`. `"lectura-del-alumno"`: `GET /clases/:claseId` y
  `GET /clases/:claseId/mis-calificaciones`. `"lectura"`: las lecturas de personas, roster,
  publicaciones y comentarios, recursos, dudas y respuestas, temas, categorías, una tarea, trabajo,
  entrega y entregas, los dos hilos privados, el gradebook, la exportación y las tres descargas.
  `"gestion"`: archivar y restaurar; desde ADMIN-01b, también el conteo de borrado, el borrado
  definitivo y duplicar. Todas las demás (escrituras, `GET …/codigo`,
  `GET …/alumnos/candidatos`, `PUT /admin/clases/:claseId` y asignar o quitar maestros) quedan
  cerradas: `409 CLASE_ARCHIVADA`.
- `clases/gestion.ts` (prefijo `/api`, CLASES-02a): las seis rutas de gestión del administrador, todas
  con `protegido({ roles: ["admin"] })`: `GET` y `POST /admin/clases` (lista institucional paginada y
  crear una clase con sus uno o dos maestros), `PUT /admin/clases/:claseId` (editar nombre y
  descripción), `POST /admin/clases/:claseId/maestros` y
  `DELETE /admin/clases/:claseId/maestros/:maestroId` (asignar y retirar, con tope de 2 y mínimo de 1)
  y `GET /admin/maestros/candidatos?q=` (buscador de maestros con correo completo). Las tres con
  `:claseId` llevan `requireOwnership`. ADMIN-01a suma `POST /admin/clases/:claseId/archivar` y
  `POST /admin/clases/:claseId/restaurar` (`propiedad`, `enClaseArchivada: "gestion"`; responden
  `{ clase }` con `archivadaEn`) y `?estado=activas|archivadas` en la lista (sin `estado`, todas; con `archivadas`, la página
  siguiente lleva `cursorArchivadaEn` y la respuesta `siguienteCursorArchivadaEn`, Enmienda 5). El código de la clase usa el mismo `generarCodigo` de
  `clases/clases.ts`. ADMIN-01b (§D-4, §D-5) suma, con `propiedad` y `enClaseArchivada: "gestion"`:
  `GET /admin/clases/:claseId/conteo-de-borrado` (`{ alumnos, actividades, entregas, calificaciones,
archivos }`; de una activa, `409 CLASE_NO_ARCHIVADA`), `DELETE /admin/clases/:claseId?confirmar=borrar`
  (`204`; sin `confirmar`, `409 CONFIRMACION_REQUERIDA`; otro valor, `400`; con copias en curso,
  `409 CLASE_CON_COPIAS_EN_CURSO`) y `POST /admin/clases/:claseId/duplicar` (`{ nombre, maestroIds }`,
  `201 { clase }`; también desde una archivada; maestros inválidos, `404 MAESTRO_NO_ENCONTRADO`). El
  handler arma las funciones de cola que el adaptador llama dentro de su transacción: cancela los
  recordatorios de las tareas con `cancelarVarios` y encola `BORRAR_OBJETOS` (lotes de 1000 claves,
  diferidos 10 min, N-09) o `COPIAR_OBJETOS` (lotes de 100 archivos). Ningún handler mira el estado de
  la clase ni compara roles. `archivos.ts`: la descarga de la clase responde `409 ARCHIVO_EN_COPIA`
  si el archivo es una copia en curso (`copia_de` no nulo); las descargas de entregas no cambian.
- `clases/alumnos.ts` (prefijo `/api`, CLASES-b): `GET /clases/:claseId/personas` (compañeros y
  maestros, uno o dos; `requireMembership`, id, nombre y correo completo, nunca estado de pago ni
  restricción; no se abre al admin), `GET` y `POST /clases/:claseId/alumnos` (roster del maestro de la
  clase y del admin, con correo completo y estado de pago, y alta manual, que responde `{ alumno: { id, nombre }, yaEstaba }`),
  `GET /clases/:claseId/alumnos/candidatos` (buscador; el handler enmascara el correo con
  `enmascararCorreo` y nunca responde el completo) y `DELETE /clases/:claseId/alumnos/:alumnoId`
  (baja, `204` también si no estaba inscrito). Salvo `personas`, todas llevan `requireOwnership`.
  `GET …/alumnos` es la única ruta que devuelve datos de pago (RN-02). Ninguna ruta lee
  `movimientos_inscripcion`.
- `clases/muro.ts` (prefijo `/api`, CLASES-c): `GET` y `POST /clases/:claseId/publicaciones` (el muro,
  paginado por cursor, y publicar un anuncio o un material; publican los maestros de la clase y el
  admin, que sale firmado «Administración»), `DELETE …/publicaciones/:publicacionId` (borra con sus
  comentarios, con la regla de autoría de `core/autoria.ts`), `GET` y `POST
…/publicaciones/:publicacionId/comentarios` (comentan el alumno inscrito y el maestro; el admin los
  lee, no comenta), `DELETE …/publicaciones/:publicacionId/comentarios/:comentarioId` (estudiante,
  maestro o admin, con la regla de autoría: `403 BORRADO_NO_PERMITIDO` si no puede) y
  `DELETE …/mis-comentarios/:comentarioId` (el autor). Cada publicación y comentario lleva
  `autor.administracion` y `puedeBorrar`. Los textos pasan por `conTextosNormalizados`
  (`core/clases/texto.ts`) antes de validarse (§D-C4). Cada alta encola su aviso en la misma transacción que el dato
  (`PUBLICACION_CREADA`, `MATERIAL_CREADO` o `COMENTARIO_CREADO`, con el id del dato como id del
  trabajo); sin consumidor hasta NOTIFICACIONES. Ninguna respuesta lleva `estadoPago` ni correos.

Ningún handler llama a `adapters/notifier` (bloque de ESLint en la raíz): quien necesita avisar por
correo encola el evento y solo el worker usa `adapters/notifier`. Los repositorios compuestos que
encolan dentro de su transacción reciben un callback `alGuardar(sql: EjecutorSql)`; el handler solo
pasa `sql` a `encolar(...)`, nunca invoca `sql.executeSql` directamente (regla 4; también vigilado
por ESLint, `no-restricted-syntax`).

- `archivos.ts` (prefijo `/api`, CLASES-d): `POST /clases/:claseId/archivos` (el maestro de la clase
  o el admin declara nombre, tipo y tamaño; responde `201` con la fila `pendiente` y una URL prefirmada de
  subida, con `Cache-Control: no-store`) y `POST /clases/:claseId/archivos/:archivoId/descarga` (el
  alumno inscrito, el maestro de la clase y el admin; responde `200 { url, expiraEn }` con disposición
  `attachment`, o `404` si el archivo es de otra clase o aún no está confirmado). Ambos reciben el
  `Almacen` al registrarse (`null` si faltan las variables `STORAGE_*`: `503 ALMACEN_NO_CONFIGURADO`).
  El archivo nunca pasa por la API. `clases/muro.ts` recibe el mismo `almacen`: `POST …/publicaciones`
  acepta `archivoIds` (hasta 5, sin repetidos; siempre presentes en el cuerpo del frontend) y
  confirma los archivos con la publicación; y el muro y la respuesta `201` llevan `adjuntos`
  (siempre, también `[]`), con `vistaPrevia` solo para PNG, JPEG, WebP y GIF. Ninguna respuesta
  lleva la clave del objeto.

- `tareas/temas.ts` (prefijo `/api`, TAREAS-01a, `temasHandler`): `GET` y `POST /clases/:claseId/temas`
  (listar con `elementos` y `sinTema`, y crear), `PUT` y `DELETE …/temas/:temaId` (renombrar y borrar;
  sus elementos pasan a «Sin tema»), `PUT …/temas/orden` (el orden completo; el segmento literal gana
  a `:temaId`) y `PUT …/publicaciones/:publicacionId/tema` (mover un material o una tarea de tema;
  mover no es editar, P-02 b). Los ven los tres roles solo en el `GET`; el resto es de los maestros de
  la clase y el admin (`propiedad`).
- `tareas/categorias.ts` (prefijo `/api`, TAREAS-01a, `categoriasHandler`): `GET` y `PUT
/clases/:claseId/categorias` (maestros de la clase y admin; el `PUT` guarda la lista completa, con
  pesos que suman 100). Ningún handler de `tareas/` verifica rol ni pertenencia a mano ni crea avisos.
- `clases/muro.ts`: `POST …/publicaciones` acepta `temaId` (uuid o `null`) en un material; ausente o
  `null` es «Sin tema» (`datos.temaId ?? null`) y un anuncio nunca lleva tema.
- `tareas/tareas.ts` (prefijo `/api`, TAREAS-01b, `tareasHandler`, recibe `{ almacen }`): `POST
/clases/:claseId/tareas` (crea una tarea con rúbrica, adjuntos, categoría, tema y entregas tardías;
  maestros de la clase y admin, que firma «Administración»), `GET`, `PUT` y `DELETE
…/tareas/:tareaId` (el `GET` lo ven los tres roles; la autoría de editar y borrar la decide
  `core/autoria.ts` dentro de la transacción del adaptador: `403 EDICION_NO_PERMITIDA` o
  `403 BORRADO_NO_PERMITIDO`, `puedeEditar` y `puedeBorrar` salen en la respuesta) y `GET
/clases/:claseId/trabajo?tema=<uuid | sin-tema>&cursor=&limite=` («Trabajo de clase», paginado por
  cursor; `puedeMover` lo decide `core/tareas/temas.ts` con la relación del sexto paso). El handler
  encola `TAREA_CREADA` y `RECORDATORIO_24H` (diferido) y cancela el recordatorio al editar la fecha o
  borrar, siempre con el `sql` de la transacción del dato; los trabajos no tienen consumidor hasta
  NOTIFICACIONES. `handlers/adjuntos.ts` guarda `adjuntosParaResponder` y `archivosParaPublicar`,
  compartidos con `clases/muro.ts` (movidos sin cambios). Ninguna respuesta lleva `trabajo_id`, el rol
  del autor, correos ni `estadoPago`.
- `clases/muro.ts`: cada publicación lleva `tarea` (`{ fechaLimite, puntos }` o `null`); el `DELETE`
  del muro y los comentarios responden `404` ante una tarea (S-08).
- `tareas/entregas.ts` (prefijo `/api`, ENTREGAS-01b, `entregasHandler`, recibe `{ almacen }`): dos
  familias bajo `/clases/:claseId/tareas/:tareaId/`, para que ningún handler compare ids ni roles a
  mano. **`…/entrega`** (singular) es la del alumno que llama (`perfilDe(request).id`, sin
  `:alumnoId`), con `protegido({ roles: ["estudiante"], pertenencia: "inscripcion" })`: `GET` (su
  entrega, o `asignado` sin fila; no la crea), `POST` (entregar archivos y enlaces, o «Marcar como
  completada» si la tarea no requiere adjuntos), `POST …/anular` (sin cuerpo; un cuerpo con campos es
  `400`), `POST …/archivos` (pide la subida con clave `entregas/{tareaId}/{alumnoId}/{archivoId}`,
  solo mientras puede entregar: S-10) y `POST …/archivos/:archivoId/descarga`. **`…/entregas`** y
  **`…/entregas/:alumnoId`** son de los maestros de la clase y el admin (P-01 a: el admin lee), con
  `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`: `GET …/entregas` (la lista
  de RF-35, con la paginación y el cursor del roster, `total` y `entregadas`), `GET
…/entregas/:alumnoId` (con `version`) y `POST …/entregas/:alumnoId/archivos/:archivoId/descarga`.
  Que `:alumnoId` sea un alumno inscrito con cuenta activa es un filtro de datos del adaptador
  (`404 ALUMNO_NO_ENCONTRADO`). Las reglas de entregar, anular, el cierre y el retraso son de
  `core/entregas/entregas.ts`; la subida usa `exigirEntregaAbierta`. El handler encola
  `ENTREGA_REALIZADA` dentro de `alGuardar` (un id nuevo por entrega, datos `{ entregaId, tareaId,
claseId, version }`); anular no encola ni cancela nada (S-09). Las respuestas se arman con esquemas
  estrictos de `shared/src/entregas.ts`: nunca llevan correo, estado de pago, restricción ni la clave
  del objeto; el alumno no recibe `version`. Los archivos de una entrega solo se descargan por estas
  rutas: desde ENTREGAS-01b, `POST /clases/:claseId/archivos/:archivoId/descarga` (`archivos.ts`)
  solo sirve archivos de publicaciones, y `handlers/adjuntos.ts` confirma por prefijo
  (`archivosParaConfirmar`; `archivosParaPublicar` pasa el de materiales).
- `tareas/tareas.ts` (ENTREGAS-01b): `DELETE …/tareas/:tareaId` admite `?confirmar=entregas`
  (`borrarTareaQuerySchema`, estricto: otro valor, el parámetro repetido o una llave de más son
  `400`) y lo pasa como `confirmarEntregas` sin mirar el rol: la regla (una tarea con entregas solo la
  borra el admin con la confirmación; si no, `409 TAREA_CON_ENTREGAS` con el conteo) es de
  `core/tareas/tareas.ts` y la aplica el adaptador dentro de su transacción. `GET …/trabajo` pasa a
  `listarTrabajo` el alumno que decide `alumnoDeLaRelacion` (`core/entregas/entregas.ts`), y cada
  elemento lleva `entrega` (`{ estado, conRetraso }` o `null`; siempre `null` para maestro y admin).
- `tareas/hilo-privado.ts` (prefijo `/api`, ENTREGAS-01c, `hiloPrivadoHandler`): el hilo privado de una
  entrega, con las mismas dos familias. `GET` y `POST …/tareas/:tareaId/entrega/comentarios` son del
  alumno que llama (`roles: ["estudiante"]`, `inscripcion`; su propio id, sin `:alumnoId`). `GET
…/entregas/:alumnoId/comentarios` es de los maestros de la clase y el admin (`propiedad`) y `POST
…/entregas/:alumnoId/comentarios` solo de los maestros (`roles: ["maestro"]`: el admin lee y no
  escribe, P-01 a). Que `:alumnoId` sea un alumno inscrito con cuenta activa lo filtra el adaptador
  (`404 ALUMNO_NO_ENCONTRADO`). El texto pasa por `conTextosNormalizados` y `crearComentarioSchema`
  (de 1 a 1000 caracteres visibles, como en el muro). El handler encola el aviso de comentario dentro
  de `alGuardar`, con el id del comentario como id del trabajo y datos `{ comentarioId, entregaId,
claseId }`. La firma del autor y `propio` vienen armadas del adaptador; ninguna respuesta lleva rol,
  correo ni estado de pago. Sin borrar ni editar (S-04). Las rutas del muro nunca ven, cuentan ni
  borran un comentario privado: filtran por la publicación.
- `respuestas-de-entrega.ts` (CALIFICACIONES-01a, §D-5): `miEntregaParaResponder`,
  `entregaDeAlumnoParaResponder` y `calificacionParaResponder`, las respuestas de una entrega con su
  calificación (`null` sin calificar; fechas en ISO 8601), compartidas por `tareas/entregas.ts` y
  `calificaciones.ts`. El alumno sigue sin `version`.
- `calificaciones.ts` (prefijo `/api`, CALIFICACIONES-01a, `calificacionesHandler`, recibe `{ almacen }`):
  `PUT /clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion`, con
  `protegido({ roles: ["maestro"], pertenencia: "propiedad" })` (S-01: el admin lee la calificación y no
  califica). El cuerpo (`calificarEntregaSchema`, estricto) lleva la `version` de la entrega y los
  `puntosDeLaTarea` con que se abrió el panel, los puntajes por criterio (con rúbrica) o la calificación
  directa (sin rúbrica) y un comentario de devolución opcional, que pasa por `conTextosNormalizados`.
  Que `:alumnoId` sea un alumno inscrito con cuenta activa lo filtra el adaptador
  (`404 ALUMNO_NO_ENCONTRADO`); las reglas (versión, P-03 (c′), forma, rango y escala) son de
  `core/calificaciones/calificar.ts`. El handler encola `CALIFICACION_PUBLICADA` dentro de `alGuardar`,
  con un id nuevo por publicación y datos `{ entregaId, tareaId, claseId, version }`; el comentario de
  devolución no tiene aviso propio (S-11). Responde `200` con la entrega del alumno, su calificación y la
  versión nueva.
  En 01b suma dos lecturas, sin escrituras ni avisos. `GET /clases/:claseId/gradebook`, con
  `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`: columnas, filas, celdas,
  porcentaje, vencidas y motivos de riesgo de cada alumno de la página y el resumen de toda la clase
  (`gradebookQuerySchema`: `cursor` y `limite` de alumnos, de 1 a 50 y 25 por defecto; `cursorTareas` y
  `limiteTareas`, de 1 a 50 y 20 por defecto). `GET /clases/:claseId/mis-calificaciones`, con
  `protegido({ roles: ["estudiante"], pertenencia: "inscripcion" })`: siempre el alumno de la sesión
  (`perfilDe(request).id`; la ruta no lleva id de alumno), su calificación general y sus tareas con su
  entrega, filtradas por `estado` (`todas`, `asignadas`, `entregadas`, `calificadas` o `sin-entregar`).
  Las dos responden con esquemas estrictos de `shared/` y fechas en ISO 8601; nunca la versión, el
  correo, el estado de pago, la restricción ni el rol.
  CALIFICACIONES-02a suma `GET /clases/:claseId/calificaciones/exportacion`, con la misma cadena que el gradebook: una ventana de hasta 100 alumnos y 100 actividades (`exportacionQuerySchema`, 100 por omisión en las dos) con el nombre de la clase, el correo de cada alumno, sus celdas y su porcentaje, y los totales de alumnos y actividades (`exportacionDeCalificacionesRespuestaSchema`, estricto). Nunca el estado de pago, la restricción, el rol ni la versión (P-13). El navegador recorre las ventanas y arma el .xlsx; el servidor no escribe archivos ni encola nada (R-01).
- `clases/recursos.ts` (prefijo `/api`, CLASES-03a, `recursosHandler`, recibe `{ almacen }`):
  `GET /clases/:claseId/recursos` (estudiante, maestro y admin, `inscripcion`; `recursosQuerySchema`:
  `bloque` y `tema` obligatorios, `cursor` y `limite`), `GET /clases/:claseId/recursos/:recursoId` y
  `PUT /clases/:claseId/recursos/:recursoId` (maestro y admin, `propiedad`). El `PUT` normaliza `titulo`
  y `texto` (`conTextosNormalizados`) y comprueba en el almacén solo los archivos que no son ya del
  recurso (`archivosParaPublicar`), como el `PUT` de una tarea. `puedeEditar`, `puedeBorrar` y
  `puedeMover` los decide `core/recursos.ts` dentro del adaptador. El autor sale con `firmaDelAutor`;
  ninguna respuesta lleva correo, estado de pago, restricción ni rol, y la versión solo sale en el
  detalle. Editar no encola nada (S-04). Publicar, borrar, mover y comentar un recurso siguen en
  `clases/muro.ts` y `tareas/temas.ts`: el `POST` del muro pasa `bloque: bloqueAlPublicar(perfil)` en un
  material y `null` en un anuncio; `GET …/publicaciones` acepta `?tipo=anuncio` (`avisosQuerySchema`);
  `GET …/trabajo` acepta `?seccion=actividades`, y su `puedeMover` es, para un material,
  `puedeMoverRecurso` con el actor de la petición y `bloqueEfectivo(bloque, autor)` (la misma regla de
  la ruta de mover, T-03) y, para una tarea, `puedeMoverElemento(relacion)`, como antes; `GET …/temas` acepta
  `?seccion=actividades|aprendizaje|docente` (`temasQuerySchema`, misma forma de respuesta), y mover
  pasa `actor: perfilDe(request)`. Sin el parámetro nuevo, cada ruta responde lo de antes.
- `clases/dudas.ts` (prefijo `/api`, CLASES-03b, `dudasHandler`): `GET` y `POST
/clases/:claseId/dudas`, `PUT …/dudas/:dudaId/resuelta`, `DELETE …/dudas/:dudaId`, y `GET`, `POST` y
  `DELETE` de `…/dudas/:dudaId/respuestas[/:respuestaId]`. Leer y borrar: estudiante, maestro y admin
  (`inscripcion`); publicar una duda o una respuesta: estudiante y maestro (`inscripcion`; el admin no
  escribe, P-07); marcar: maestro y admin (`propiedad`; tampoco el autor estudiante). Los textos pasan
  por `conTextosNormalizados` (`crearDudaSchema`, hasta 2000; `crearRespuestaSchema`, hasta 1000), el
  cuerpo de marcar es estricto (`marcarDudaSchema`) y los ids de la ruta pasan a minúsculas. `propia`
  es un dato de la respuesta; `puedeMarcar` sale de `puedeMarcarDuda(relacion)` (`core/dudas.ts`) y
  `puedeBorrar` de `core/autoria.ts` dentro del adaptador. Las respuestas tienen la forma de los
  comentarios. El autor sale con `firmaDelAutor`; ninguna respuesta lleva correo, estado de pago,
  restricción, rol ni quién marcó la duda. Ninguna ruta encola (S-04).
