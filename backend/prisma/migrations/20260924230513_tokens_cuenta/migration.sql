-- CreateEnum
CREATE TYPE "tipo_token_cuenta" AS ENUM ('recuperacion', 'invitacion');

-- CreateTable
CREATE TABLE "tokens_cuenta" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" "tipo_token_cuenta" NOT NULL,
    "hash_token" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ(3) NOT NULL,
    "usado_en" TIMESTAMPTZ(3),
    "revocado_en" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_cuenta_hash_token_key" ON "tokens_cuenta"("hash_token");

-- CreateIndex
CREATE INDEX "tokens_cuenta_usuario_id_idx" ON "tokens_cuenta"("usuario_id");

-- AddForeignKey
ALTER TABLE "tokens_cuenta" ADD CONSTRAINT "tokens_cuenta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
