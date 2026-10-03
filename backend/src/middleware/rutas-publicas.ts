// Única lista de rutas que no pasan por protegido(), en cualquier URL (DEC-08; M-15, CHORE-02).
// Cualquier otra ruta que se registre sin authenticate como primer preHandler hace fallar el
// arranque (guarda-de-rutas.ts). refrescar y logout se autentican con la cookie campus_refresco, credencial
// exclusiva de esas dos rutas (Path=/api/auth). recuperar no revela nada (encola siempre); restablecer
// y establecer-contrasena se autentican con el token del enlace de un solo uso (AUTH-02). invitacion
// (AUTH-03a) se autentica con el token de un enlace de invitación vivo y solo devuelve el nombre.
// registro-maestro (AUTH-03b) se autentica con el token de un enlace de registro vivo que genera el
// admin. cambiar-contrasena SÍ pasa por protegido(), con permitirCambioPendiente y permitirRestringido
// (C-01): no es pública. Si el encargo de CORS registra OPTIONS, se amplía aquí.
export const RUTAS_PUBLICAS: ReadonlySet<string> = new Set([
  "GET /api/salud",
  "POST /api/auth/registro",
  "POST /api/auth/login",
  "POST /api/auth/refrescar",
  "POST /api/auth/logout",
  "POST /api/auth/recuperar",
  "POST /api/auth/restablecer",
  "POST /api/auth/establecer-contrasena",
  "POST /api/auth/invitacion",
  "POST /api/auth/registro-maestro",
])
