-- CreateEnum
CREATE TYPE "estado_entrega" AS ENUM ('asignado', 'entregado', 'calificado');

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "entrega_id" UUID;

-- AlterTable
ALTER TABLE "comentarios" ADD COLUMN     "entrega_id" UUID,
ALTER COLUMN "publicacion_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tareas" ADD COLUMN     "requiere_adjuntos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "entregas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tarea_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "estado" "estado_entrega" NOT NULL DEFAULT 'asignado',
    "fecha_entrega" TIMESTAMPTZ(3),
    "con_retraso" BOOLEAN NOT NULL DEFAULT false,
    "enlaces" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entregas_alumno_id_idx" ON "entregas"("alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_tarea_id_alumno_id_key" ON "entregas"("tarea_id", "alumno_id");

-- CreateIndex
CREATE INDEX "archivos_entrega_id_idx" ON "archivos"("entrega_id");

-- CreateIndex
CREATE INDEX "comentarios_entrega_id_creado_en_id_idx" ON "comentarios"("entrega_id", "creado_en", "id");

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A mano (ENTREGAS-01a, §D-1; Prisma no expresa CHECK y no lo compara al buscar deriva):
-- una entrega tiene fecha de entrega si y solo si no está asignada; asignada, no lleva retraso ni
-- enlaces; sus enlaces son una lista de hasta 5; la versión de una entrega y la de una tarea no son
-- negativas; un comentario tiene exactamente un contexto (muro o hilo privado); y el CHECK de
-- archivos se reemplaza para contar los dos contextos (a lo más uno, y confirmado si y solo si
-- tiene uno).
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_fecha_segun_estado"
  CHECK (("estado" = 'asignado') = ("fecha_entrega" IS NULL));
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_asignada_sin_retraso_ni_enlaces"
  CHECK ("estado" <> 'asignado' OR ("con_retraso" = false AND "enlaces" = '[]'::jsonb));
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_enlaces_es_lista"
  CHECK (jsonb_typeof("enlaces") = 'array' AND jsonb_array_length("enlaces") <= 5);
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_version_no_negativa" CHECK ("version" >= 0);
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_version_no_negativa" CHECK ("version" >= 0);
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_un_solo_contexto"
  CHECK (num_nonnulls("publicacion_id", "entrega_id") = 1);
ALTER TABLE "archivos" DROP CONSTRAINT "archivos_confirmado_si_y_solo_si_contexto";
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_confirmado_si_y_solo_si_contexto"
  CHECK (num_nonnulls("publicacion_id", "entrega_id") <= 1
         AND (("estado" = 'confirmado') = (num_nonnulls("publicacion_id", "entrega_id") = 1)));
