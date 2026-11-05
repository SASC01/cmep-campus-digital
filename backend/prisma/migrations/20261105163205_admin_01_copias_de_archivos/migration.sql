-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "copia_de" UUID;

-- CreateIndex
CREATE INDEX "archivos_copia_de_idx" ON "archivos"("copia_de");

-- CreateIndex
CREATE INDEX "archivos_clase_id_estado_idx" ON "archivos"("clase_id", "estado");

-- CreateIndex
CREATE INDEX "movimientos_inscripcion_clase_id_secuencia_idx" ON "movimientos_inscripcion"("clase_id", "secuencia" DESC);

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_copia_de_fkey" FOREIGN KEY ("copia_de") REFERENCES "archivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A mano (Prisma no expresa CHECK ni lo compara al buscar deriva; R-02 de ADMIN-01): solo un
-- archivo confirmado puede ser una copia en curso (§D-5, M-02).
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_copia_solo_confirmado"
  CHECK ("copia_de" IS NULL OR "estado" = 'confirmado');
