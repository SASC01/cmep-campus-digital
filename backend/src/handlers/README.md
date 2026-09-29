# handlers/

Un plugin de Fastify por dominio, delgado: validar la entrada → llamar a `core/` → responder.
Sin verificaciones de permisos a mano (eso es `middleware/`) y sin `try/catch` propios, salvo
para traducir un error de proveedor a `AppError`.

El formato de error `{ "error": { "codigo", "mensaje" } }` lo aplica `errores.ts` para todas
las rutas; ninguna otra ruta formatea errores.

## Plugins (AUTH-02, AUTH-03a, AUTH-03b)

- `auth/cuentas.ts` (prefijo `/api/auth`): `recuperar`, `restablecer`, `invitacion` y
  `establecer-contrasena` (públicas; `invitacion` solo devuelve el nombre de la cuenta con el
  token de una invitación viva, y `establecer-contrasena` admite corregir ese nombre) y
  `cambiar-contrasena` (con `protegido({ permitirCambioPendiente: true,
permitirRestringido: true })`; pide solo la contraseña nueva y exige una sesión viva del mismo
  usuario, con un filtro previo sin bloqueo y la decisión definitiva bajo el bloqueo del usuario).
- `auth/registro-maestro.ts` (prefijo `/api/auth`): `registro-maestro` (pública; registro de
  maestro con un enlace de registro vivo del admin; rol, enlaceRegistroId y cualquier otro campo
  extra del cuerpo se descartan; deja la sesión iniciada, como el registro de estudiante).
- `admin.ts` (prefijo `/api/admin`): `maestros`, `usuarios/buscar`,
  `usuarios/:id/restablecer-contrasena`, `usuarios/:id/correo`,
  `enlaces-registro` (crear y listar), `enlaces-registro/:id/revocar` (idempotente) y
  `enlaces-registro/:id/registrados`; todas con `protegido({ roles: ["admin"] })`. El token del
  enlace solo viaja en la respuesta de crearlo, con `Cache-Control: no-store`.

Ningún handler llama a `adapters/notifier` (bloque de ESLint en la raíz): quien necesita avisar por
correo encola el evento y solo el worker usa `adapters/notifier`. Los repositorios compuestos que
encolan dentro de su transacción reciben un callback `alGuardar(sql: EjecutorSql)`; el handler solo
pasa `sql` a `encolar(...)`, nunca invoca `sql.executeSql` directamente (regla 4; también vigilado
por ESLint, `no-restricted-syntax`).
