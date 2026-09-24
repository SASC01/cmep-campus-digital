// Única lista de rutas bajo /api que no pasan por protegido() (DEC-08). Cualquier otra ruta bajo
// /api que se registre sin authenticate como primer preHandler hace fallar el arranque
// (guarda-de-rutas.ts). refrescar y logout se autentican con la cookie campus_refresco, credencial
// exclusiva de esas dos rutas (Path=/api/auth). Si el encargo de CORS registra OPTIONS, se amplía aquí.
export const RUTAS_PUBLICAS: ReadonlySet<string> = new Set([
  "GET /api/salud",
  "POST /api/auth/registro",
  "POST /api/auth/login",
  "POST /api/auth/refrescar",
  "POST /api/auth/logout",
])
