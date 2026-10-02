-- CreateEnum
CREATE TYPE "estado_archivo" AS ENUM ('pendiente', 'confirmado', 'descartado');

-- CreateTable
CREATE TABLE "archivos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clave_objeto" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "subido_por" UUID NOT NULL,
    "estado" "estado_archivo" NOT NULL DEFAULT 'pendiente',
    "clase_id" UUID NOT NULL,
    "publicacion_id" UUID,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "archivos_clave_objeto_key" ON "archivos"("clave_objeto");

-- CreateIndex
CREATE INDEX "archivos_publicacion_id_idx" ON "archivos"("publicacion_id");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicaciones"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- A mano (Prisma no expresa CHECK y no lo compara al buscar deriva, §D-D1): el tamaño es positivo,
-- y un archivo está confirmado si y solo si tiene publicación (un pendiente o descartado no la tiene).
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_tamano_positivo" CHECK ("tamano" > 0);
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_confirmado_si_y_solo_si_contexto"
  CHECK (("estado" = 'confirmado') = ("publicacion_id" IS NOT NULL));
