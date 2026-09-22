// Marcador de seed:admin y reset:admin (AGENTS.md). Termina con codigo 1 a proposito (DEC-09):
// un "pendiente" que devolviera 0 pasaria por exito en un despliegue encadenado.
const nombre = process.argv[2]

if (!nombre) {
  console.error("Uso: node scripts/pendiente.mjs <nombre-del-comando>")
  process.exit(1)
}

console.error(
  `Pendiente: "${nombre}" se implementa en el encargo de autenticación (todavía no existe la tabla usuarios).`,
)
process.exit(1)
