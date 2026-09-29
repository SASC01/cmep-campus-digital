-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "enlace_registro_id" UUID;

-- CreateTable
CREATE TABLE "enlaces_registro" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hash_token" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ(3) NOT NULL,
    "revocado_en" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enlaces_registro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enlaces_registro_hash_token_key" ON "enlaces_registro"("hash_token");

-- CreateIndex
CREATE INDEX "enlaces_registro_creado_en_id_idx" ON "enlaces_registro"("creado_en" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "usuarios_enlace_registro_id_creado_en_idx" ON "usuarios"("enlace_registro_id", "creado_en");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_enlace_registro_id_fkey" FOREIGN KEY ("enlace_registro_id") REFERENCES "enlaces_registro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
