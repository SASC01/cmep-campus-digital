# middleware/

Cadena fija, siempre en este orden:
`authenticate` → `withProfile` → `withPasswordGate` → `withAccess` → `requireRole` →
`requireMembership` / `requireOwnership` → handler.

Ninguna verificación de rol, propiedad o inscripción se escribe dentro de un handler. Cualquier
cambio en esta carpeta es carril sensible. Vacía hasta el encargo de autenticación.
