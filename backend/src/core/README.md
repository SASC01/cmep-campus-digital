# core/

Lógica pura. Sin I/O, sin Prisma, sin Fastify, sin pino. Recibe sus dependencias por parámetro
y lanza `AppError` (`errores.ts`) cuando una regla no se cumple.

Toda función de esta carpeta lleva prueba unitaria con dobles en memoria (`*.test.ts` junto al
archivo). ESLint (`no-restricted-imports`) impide importar aquí `adapters/`, `handlers/`,
`middleware/`, `fastify` o `pino`.
