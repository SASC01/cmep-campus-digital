# adapters/

Único lugar del backend que importa `@prisma/client`, `pg-boss`, `minio`, `resend`, `argon2`,
`jose` y `livekit-server-sdk` (AGENTS.md, regla 1; ESLint lo vigila con `no-restricted-imports`).

Módulos: `db`, `auth`, `storage`, `notifier`, `queue`, `scheduler`, `live`. Cada uno traduce los
errores de su proveedor a `AppError`; nadie fuera de `adapters/db` conoce los códigos de Prisma.
