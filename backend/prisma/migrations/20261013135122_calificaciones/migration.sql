-- AlterTable
ALTER TABLE "entregas" ADD COLUMN     "calificacion" DECIMAL(7,2),
ADD COLUMN     "fecha_calificacion" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "puntajes_rubrica" (
    "entrega_id" UUID NOT NULL,
    "criterio_id" UUID NOT NULL,
    "puntos" DECIMAL(7,2) NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puntajes_rubrica_pkey" PRIMARY KEY ("entrega_id","criterio_id")
);

-- CreateIndex
CREATE INDEX "puntajes_rubrica_criterio_id_idx" ON "puntajes_rubrica"("criterio_id");

-- AddForeignKey
ALTER TABLE "puntajes_rubrica" ADD CONSTRAINT "puntajes_rubrica_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- A mano (CALIFICACIONES-01a, Enmienda 1, M-01): Prisma genera esta FK sin DEFERRABLE y no expresa la
-- diferibilidad; se reemplazó su sentencia por esta, con el mismo nombre. Diferida, la comprobación
-- NO ACTION corre al confirmar la transacción, cuando la cascada de borrar una tarea o una clase ya se
-- llevó los puntajes (no depende del orden de los disparadores de las FK).
ALTER TABLE "puntajes_rubrica" ADD CONSTRAINT "puntajes_rubrica_criterio_id_fkey"
  FOREIGN KEY ("criterio_id") REFERENCES "criterios_rubrica"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- A mano (CALIFICACIONES-01a, §D-1; Prisma no expresa CHECK y no lo compara al buscar deriva):
-- una entrega tiene calificación si y solo si está calificada, y fecha de calificación si y solo si
-- tiene calificación; la calificación y cada puntaje van de 0 a 1000.
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_calificacion_segun_estado"
  CHECK ((("estado" = 'calificado') = ("calificacion" IS NOT NULL))
     AND (("calificacion" IS NULL) = ("fecha_calificacion" IS NULL)));
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_calificacion_en_rango"
  CHECK ("calificacion" IS NULL OR "calificacion" BETWEEN 0 AND 1000);
ALTER TABLE "puntajes_rubrica" ADD CONSTRAINT "puntajes_rubrica_puntos_en_rango"
  CHECK ("puntos" BETWEEN 0 AND 1000);

-- P-03 (c′): calificar a quien no entregó deja la fila en calificado sin fecha de entrega. El nombre
-- se conserva: las pruebas que lo nombran (asignada con fecha, entregada sin fecha) siguen valiendo.
-- Sin fecha de entrega no hay retraso ni enlaces (también en una calificada sin entrega).
ALTER TABLE "entregas" DROP CONSTRAINT "entregas_fecha_segun_estado";
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_fecha_segun_estado"
  CHECK (("estado" = 'asignado'   AND "fecha_entrega" IS NULL)
      OR ("estado" = 'entregado'  AND "fecha_entrega" IS NOT NULL)
      OR  "estado" = 'calificado');
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_sin_fecha_sin_retraso_ni_enlaces"
  CHECK ("fecha_entrega" IS NOT NULL OR ("con_retraso" = false AND "enlaces" = '[]'::jsonb));
