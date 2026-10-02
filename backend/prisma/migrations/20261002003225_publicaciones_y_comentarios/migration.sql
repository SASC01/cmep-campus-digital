-- CreateEnum
CREATE TYPE "tipo_publicacion" AS ENUM ('anuncio', 'material');

-- CreateTable
CREATE TABLE "publicaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clase_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "tipo" "tipo_publicacion" NOT NULL,
    "titulo" TEXT,
    "texto" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicacion_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publicaciones_clase_id_creado_en_id_idx" ON "publicaciones"("clase_id", "creado_en" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "comentarios_publicacion_id_creado_en_id_idx" ON "comentarios"("publicacion_id", "creado_en", "id");

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A mano (Prisma no expresa CHECK y no lo compara al buscar deriva): el anuncio no lleva título y el
-- material sí (§D-C1).
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_titulo_segun_tipo"
  CHECK (("tipo" = 'anuncio' AND "titulo" IS NULL) OR ("tipo" = 'material' AND "titulo" IS NOT NULL));
