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

- `clases/clases.ts` (prefijo `/api`, CLASES-a): `POST /clases` (crear), `GET /clases/inscritas` y
  `GET /clases/impartidas` (listas propias por rol, paginadas por cursor), `POST /clases/unirse`
  (con código, idempotente), `GET/PUT /clases/:claseId` (detalle y editar) y
  `GET/POST /clases/:claseId/codigo` (ver y regenerar el código, con `Cache-Control: no-store`). Las
  cinco últimas llevan el sexto paso (`requireMembership` o `requireOwnership`, §D-0) y leen la clase
  de la ruta con `claseDe(request)`, nunca con el `claseId` crudo del parámetro. El código de la
  clase se genera en el handler (`node:crypto.randomBytes` + `codigoDesdeBytes` de `core/`); el
  adaptador reintenta una sola vez si choca con el índice único (S-03).
- `clases/alumnos.ts` (prefijo `/api`, CLASES-b): `GET /clases/:claseId/personas` (compañeros;
  `requireMembership`, solo id y nombre), `GET` y `POST /clases/:claseId/alumnos` (roster del dueño, con
  correo completo y estado de pago, y alta manual, que responde `{ alumno: { id, nombre }, yaEstaba }`),
  `GET /clases/:claseId/alumnos/candidatos` (buscador; el handler enmascara el correo con
  `enmascararCorreo` y nunca responde el completo) y `DELETE /clases/:claseId/alumnos/:alumnoId`
  (baja, `204` también si no estaba inscrito). Salvo `personas`, todas llevan `requireOwnership`.
  `GET …/alumnos` es la única ruta que devuelve datos de pago (RN-02). Ninguna ruta lee
  `movimientos_inscripcion`.

Ningún handler llama a `adapters/notifier` (bloque de ESLint en la raíz): quien necesita avisar por
correo encola el evento y solo el worker usa `adapters/notifier`. Los repositorios compuestos que
encolan dentro de su transacción reciben un callback `alGuardar(sql: EjecutorSql)`; el handler solo
pasa `sql` a `encolar(...)`, nunca invoca `sql.executeSql` directamente (regla 4; también vigilado
por ESLint, `no-restricted-syntax`).
