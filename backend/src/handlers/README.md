# handlers/

Un plugin de Fastify por dominio, delgado: validar la entrada → llamar a `core/` → responder.
Sin verificaciones de permisos a mano (eso es `middleware/`) y sin `try/catch` propios, salvo
para traducir un error de proveedor a `AppError`.

El formato de error `{ "error": { "codigo", "mensaje" } }` lo aplica `errores.ts` para todas
las rutas; ninguna otra ruta formatea errores.
