// Tipos, constantes y guarda de la base de pruebas (CHORE-01). Lo usan test/global-setup.ts (proceso
// principal de Vitest) y test/setup.ts (cada proceso de prueba).
export const NOMBRE_BASE_DE_PRUEBAS = "campus_pruebas"
export const USUARIO_BASE_DE_PRUEBAS = "campus_pruebas"

// El único administrador de la base desechable. El correo NO termina en @pruebas.local: ninguna
// ayuda de limpieza (borrarUsuariosDePruebaPorCorreo) puede borrarlo.
export const ADMIN_DE_PRUEBAS = {
  email: "admin@contenedor-de-pruebas.local",
  nombre: "Admin de la base de pruebas",
} as const

export interface EntornoDePruebas {
  databaseUrl: string
  jwtSecret: string
  adminEmail: string
  adminPassword: string
  adminNombre: string
}

declare module "vitest" {
  export interface ProvidedContext {
    entornoDePruebas: EntornoDePruebas
  }
}

const HOSTS_LOCALES = new Set(["127.0.0.1", "localhost", "[::1]"])

// Pura. null si la URL apunta a la base desechable; si no, el motivo, sin la URL ni la contraseña.
export const validarUrlDePruebas = (url: string): string | null => {
  if (!URL.canParse(url)) return "la URL de la base no es válida"
  const destino = new URL(url)
  if (destino.protocol !== "postgresql:" && destino.protocol !== "postgres:") {
    return "la URL no es de PostgreSQL"
  }
  if (!HOSTS_LOCALES.has(destino.hostname)) return `el host "${destino.hostname}" no es local`
  if (destino.pathname !== `/${NOMBRE_BASE_DE_PRUEBAS}`) {
    return `la base es "${destino.pathname.slice(1)}" y las pruebas solo aceptan "${NOMBRE_BASE_DE_PRUEBAS}"`
  }
  return null
}

export const variablesDeEntorno = (entorno: EntornoDePruebas): Record<string, string> => ({
  DATABASE_URL: entorno.databaseUrl,
  JWT_SECRET: entorno.jwtSecret,
  ADMIN_EMAIL: entorno.adminEmail,
  ADMIN_PASSWORD: entorno.adminPassword,
  ADMIN_NOMBRE: entorno.adminNombre,
})
