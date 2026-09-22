# adapters/

Único lugar del backend que importa `@prisma/client`, `@prisma/adapter-pg`, `pg`, el cliente
generado por Prisma (`db/generated/`, no versionado; lo crea `prisma generate`), `pg-boss`, `minio`,
`resend`, `argon2`, `jose` y `livekit-server-sdk` (AGENTS.md, regla 1; ESLint lo vigila con
`no-restricted-imports`).

Módulos: `db`, `auth`, `storage`, `notifier`, `queue`, `scheduler`, `live`. Cada uno traduce los
errores de su proveedor a `AppError`; nadie fuera de `adapters/db` conoce los códigos de Prisma.
