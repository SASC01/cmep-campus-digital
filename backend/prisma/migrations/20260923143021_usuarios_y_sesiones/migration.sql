-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('estudiante', 'maestro', 'admin');

-- CreateEnum
CREATE TYPE "estado_pago" AS ENUM ('al_corriente', 'deudor');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "hash_contrasena" TEXT NOT NULL,
    "debe_cambiar_contrasena" BOOLEAN NOT NULL DEFAULT false,
    "nombre" TEXT NOT NULL,
    "nombre_busqueda" TEXT NOT NULL,
    "rol" "rol_usuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "estado_pago" "estado_pago" NOT NULL DEFAULT 'al_corriente',
    "fecha_estado_pago" TIMESTAMPTZ(3),
    "acceso_restringido" BOOLEAN NOT NULL DEFAULT false,
    "motivo_restriccion" TEXT,
    "fecha_restriccion" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "hash_token" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ(3) NOT NULL,
    "revocada_en" TIMESTAMPTZ(3),
    "reemplazada_por" UUID,
    "ip" TEXT,
    "agente" TEXT,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_rol_idx" ON "usuarios"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_hash_token_key" ON "sesiones"("hash_token");

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones"("usuario_id");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Un solo administrador (ESSENTIALS "Tablas"). Prisma no expresa índices parciales; este
-- índice vive solo en la migración. Prisma ignora los índices parciales al comparar el esquema
-- con la base, así que no genera deriva (V-07 lo comprueba).
CREATE UNIQUE INDEX "usuarios_un_solo_admin_idx" ON "usuarios" ("rol") WHERE "rol" = 'admin';
