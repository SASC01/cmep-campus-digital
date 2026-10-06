-- CreateTable
CREATE TABLE "maestros_de_clase" (
    "clase_id" UUID NOT NULL,
    "maestro_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maestros_de_clase_pkey" PRIMARY KEY ("clase_id","maestro_id")
);

-- CreateIndex
CREATE INDEX "maestros_de_clase_maestro_id_creado_en_clase_id_idx" ON "maestros_de_clase"("maestro_id", "creado_en" DESC, "clase_id" DESC);

-- CreateIndex
CREATE INDEX "clases_creado_en_id_idx" ON "clases"("creado_en" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "maestros_de_clase" ADD CONSTRAINT "maestros_de_clase_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestros_de_clase" ADD CONSTRAINT "maestros_de_clase_maestro_id_fkey" FOREIGN KEY ("maestro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CLASES-02 · datos: una fila por clase existente, con la fecha de la clase, para que
-- GET /clases/impartidas conserve su orden. ON CONFLICT: la sentencia se puede repetir sin efecto.
INSERT INTO "maestros_de_clase" ("clase_id", "maestro_id", "creado_en")
SELECT "id", "maestro_id", "creado_en" FROM "clases"
ON CONFLICT DO NOTHING;
