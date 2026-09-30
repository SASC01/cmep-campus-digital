-- CreateEnum
CREATE TYPE "origen_inscripcion" AS ENUM ('codigo', 'manual');

-- CreateTable
CREATE TABLE "clases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maestro_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "codigo_invitacion" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "clase_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "origen" "origen_inscripcion" NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("clase_id","usuario_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clases_codigo_invitacion_key" ON "clases"("codigo_invitacion");

-- CreateIndex
CREATE INDEX "clases_maestro_id_creado_en_id_idx" ON "clases"("maestro_id", "creado_en" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "inscripciones_usuario_id_creado_en_clase_id_idx" ON "inscripciones"("usuario_id", "creado_en" DESC, "clase_id" DESC);

-- CreateIndex
CREATE INDEX "usuarios_nombre_busqueda_idx" ON "usuarios" USING GIN ("nombre_busqueda" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "clases" ADD CONSTRAINT "clases_maestro_id_fkey" FOREIGN KEY ("maestro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
