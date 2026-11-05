-- AlterTable
ALTER TABLE "clases" ADD COLUMN     "archivada_en" TIMESTAMPTZ(3);

-- A mano (Prisma no expresa CHECK ni índices parciales y no los compara al buscar deriva; R-02 de
-- ADMIN-01): archivar pone activa = false con archivada_en; restaurar, activa = true sin fecha.
ALTER TABLE "clases" ADD CONSTRAINT "clases_activa_segun_archivada"
  CHECK ("activa" = ("archivada_en" IS NULL));

-- Lista del administrador por estado (§D-2): activas por (creado_en DESC, id DESC), archivadas por
-- (archivada_en DESC, id DESC).
CREATE INDEX "clases_activas_idx" ON "clases" ("creado_en" DESC, "id" DESC) WHERE "archivada_en" IS NULL;
CREATE INDEX "clases_archivadas_idx" ON "clases" ("archivada_en" DESC, "id" DESC) WHERE "archivada_en" IS NOT NULL;
