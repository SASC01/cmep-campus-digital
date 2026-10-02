-- CreateEnum
CREATE TYPE "tipo_movimiento_inscripcion" AS ENUM ('alta', 'baja');

-- CreateTable
CREATE TABLE "movimientos_inscripcion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "secuencia" BIGSERIAL NOT NULL,
    "clase_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "maestro_id" UUID NOT NULL,
    "tipo" "tipo_movimiento_inscripcion" NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inscripcion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "movimientos_inscripcion" ADD CONSTRAINT "movimientos_inscripcion_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inscripcion" ADD CONSTRAINT "movimientos_inscripcion_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inscripcion" ADD CONSTRAINT "movimientos_inscripcion_maestro_id_fkey" FOREIGN KEY ("maestro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
