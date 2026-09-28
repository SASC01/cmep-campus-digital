# handlers/

Un plugin de Fastify por dominio, delgado: validar la entrada → llamar a `core/` → responder.
Sin verificaciones de permisos a mano (eso es `middleware/`) y sin `try/catch` propios, salvo
para traducir un error de proveedor a `AppError`.

El formato de error `{ "error": { "codigo", "mensaje" } }` lo aplica `errores.ts` para todas
las rutas; ninguna otra ruta formatea errores.

## Plugins (AUTH-02, AUTH-03a)

- `auth/cuentas.ts` (prefijo `/api/auth`): `recuperar`, `restablecer`, `invitacion` y
  `establecer-contrasena` (públicas; `invitacion` solo devuelve el nombre de la cuenta con el
  token de una invitación viva, y `establecer-contrasena` admite corregir ese nombre) y
  `cambiar-contrasena` (con `protegido({ permitirCambioPendiente: true,
permitirRestringido: true })`; pide solo la contraseña nueva y exige una sesión viva del mismo
  usuario, con un filtro previo sin bloqueo y la decisión definitiva bajo el bloqueo del usuario).
- `admin.ts` (prefijo `/api/admin`): `maestros`, `usuarios/buscar`,
  `usuarios/:id/restablecer-contrasena`, `usuarios/:id/correo`; las cuatro con
  `protegido({ roles: ["admin"] })`.

Ningún handler llama a `adapters/notifier` (bloque de ESLint en la raíz): quien necesita avisar por
correo encola el evento y solo el worker usa `adapters/notifier`. Los repositorios compuestos que
encolan dentro de su transacción reciben un callback `alGuardar(sql: EjecutorSql)`; el handler solo
pasa `sql` a `encolar(...)`, nunca invoca `sql.executeSql` directamente (regla 4; también vigilado
por ESLint, `no-restricted-syntax`).
