-- AlterTable
ALTER TABLE "comentarios" ADD COLUMN     "duda_id" UUID;

-- CreateTable
CREATE TABLE "dudas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clase_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "resuelta_en" TIMESTAMPTZ(3),
    "resuelta_por" UUID,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dudas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dudas_clase_id_creado_en_id_idx" ON "dudas"("clase_id", "creado_en" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "comentarios_duda_id_creado_en_id_idx" ON "comentarios"("duda_id", "creado_en", "id");

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_duda_id_fkey" FOREIGN KEY ("duda_id") REFERENCES "dudas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dudas" ADD CONSTRAINT "dudas_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dudas" ADD CONSTRAINT "dudas_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dudas" ADD CONSTRAINT "dudas_resuelta_por_fkey" FOREIGN KEY ("resuelta_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A mano (CLASES-03b, §D-4.2; Prisma no expresa CHECK y no lo compara al buscar deriva): una duda
-- resuelta lleva la fecha y quién la marcó, las dos o ninguna. La tabla nace vacía, así que ningún
-- dato de antes lo puede violar.
ALTER TABLE "dudas" ADD CONSTRAINT "dudas_resuelta_completa"
  CHECK (("resuelta_en" IS NULL) = ("resuelta_por" IS NULL));

-- A mano (CLASES-03b, §D-4.5): un comentario tiene exactamente un contexto entre los tres (una
-- publicación del muro, una entrega o, ahora, una duda). Se reemplaza con el mismo nombre para que
-- las pruebas que lo nombran sigan valiendo. Toda fila de antes tiene duda_id nulo y un solo contexto
-- entre los dos de antes, así que cumple el nuevo; y lo que un backend anterior escribe (sin duda_id)
-- lo acepta igual que el viejo.
ALTER TABLE "comentarios" DROP CONSTRAINT "comentarios_un_solo_contexto";
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_un_solo_contexto"
  CHECK (num_nonnulls("publicacion_id", "entrega_id", "duda_id") = 1);
