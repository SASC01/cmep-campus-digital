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

- `clases/clases.ts` (prefijo `/api`, CLASES-a): `GET /clases/inscritas` y
  `GET /clases/impartidas` (listas propias por rol, paginadas por cursor), `POST /clases/unirse`
  (con código, idempotente), `GET /clases/:claseId` (detalle, también para el admin) y
  `GET/POST /clases/:claseId/codigo` (ver y regenerar el código, con `Cache-Control: no-store`, para
  el maestro de la clase y el admin). Desde CLASES-02a el maestro ya no crea ni edita clases. Las
  tres últimas llevan el sexto paso (`requireMembership` o `requireOwnership`, §D-0) y leen la clase
  de la ruta con `claseDe(request)`, nunca con el `claseId` crudo del parámetro. El código de la
  clase se genera en el handler (`node:crypto.randomBytes` + `codigoDesdeBytes` de `core/`); el
  adaptador reintenta una sola vez si choca con el índice único (S-03).
- `clases/gestion.ts` (prefijo `/api`, CLASES-02a): las seis rutas de gestión del administrador, todas
  con `protegido({ roles: ["admin"] })`: `GET` y `POST /admin/clases` (lista institucional paginada y
  crear una clase con sus uno o dos maestros), `PUT /admin/clases/:claseId` (editar nombre y
  descripción), `POST /admin/clases/:claseId/maestros` y
  `DELETE /admin/clases/:claseId/maestros/:maestroId` (asignar y retirar, con tope de 2 y mínimo de 1)
  y `GET /admin/maestros/candidatos?q=` (buscador de maestros con correo completo). Las tres con
  `:claseId` llevan `requireOwnership`. El código de la clase usa el mismo `generarCodigo` de
  `clases/clases.ts`.
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
