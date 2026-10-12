-- AlterTable
ALTER TABLE "publicaciones" ADD COLUMN     "tema_id" UUID;

-- CreateTable
CREATE TABLE "temas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clase_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clase_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" UUID NOT NULL,
    "clase_id" UUID NOT NULL,
    "categoria_id" UUID,
    "fecha_limite" TIMESTAMPTZ(3) NOT NULL,
    "puntos" INTEGER NOT NULL,
    "acepta_tardias" BOOLEAN NOT NULL DEFAULT true,
    "trabajo_id" UUID,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterios_rubrica" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tarea_id" UUID NOT NULL,
    "criterio" TEXT NOT NULL,
    "puntos_max" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "criterios_rubrica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "temas_clase_id_orden_id_idx" ON "temas"("clase_id", "orden", "id");

-- CreateIndex
CREATE INDEX "categorias_clase_id_creado_en_id_idx" ON "categorias"("clase_id", "creado_en", "id");

-- CreateIndex
CREATE INDEX "tareas_clase_id_fecha_limite_idx" ON "tareas"("clase_id", "fecha_limite");

-- CreateIndex
CREATE INDEX "tareas_categoria_id_idx" ON "tareas"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "criterios_rubrica_tarea_id_orden_key" ON "criterios_rubrica"("tarea_id", "orden");

-- CreateIndex
CREATE INDEX "publicaciones_clase_id_tema_id_creado_en_id_idx" ON "publicaciones"("clase_id", "tema_id", "creado_en" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "publicaciones_tema_id_idx" ON "publicaciones"("tema_id");

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_tema_id_fkey" FOREIGN KEY ("tema_id") REFERENCES "temas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temas" ADD CONSTRAINT "temas_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_id_fkey" FOREIGN KEY ("id") REFERENCES "publicaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterios_rubrica" ADD CONSTRAINT "criterios_rubrica_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A mano (Prisma no expresa CHECK y no lo compara al buscar deriva, §D-1 de TAREAS-01):
-- el orden de un tema no es negativo; el peso de una categoría va de 1 a 100 (que la suma de la
-- clase sea 100 lo valida core/); los puntos de una tarea van de 1 a 1000; los puntos máximos de un
-- criterio de rúbrica van de 1 a 1000 y su orden no es negativo.
ALTER TABLE "temas" ADD CONSTRAINT "temas_orden_no_negativo" CHECK ("orden" >= 0);
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_peso_entre_1_y_100" CHECK ("peso" BETWEEN 1 AND 100);
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_puntos_entre_1_y_1000" CHECK ("puntos" BETWEEN 1 AND 1000);
ALTER TABLE "criterios_rubrica" ADD CONSTRAINT "criterios_rubrica_puntos_max_entre_1_y_1000" CHECK ("puntos_max" BETWEEN 1 AND 1000);
ALTER TABLE "criterios_rubrica" ADD CONSTRAINT "criterios_rubrica_orden_no_negativo" CHECK ("orden" >= 0);

-- A mano: el CHECK de título por tipo se reemplaza por uno que acepta todo lo que aceptaba el
-- anterior y además la tarea (con título, como el material); y un anuncio no lleva tema.
ALTER TABLE "publicaciones" DROP CONSTRAINT "publicaciones_titulo_segun_tipo";
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_titulo_segun_tipo"
  CHECK (("tipo" = 'anuncio' AND "titulo" IS NULL) OR ("tipo" IN ('material', 'tarea') AND "titulo" IS NOT NULL));
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_anuncio_sin_tema"
  CHECK ("tipo" <> 'anuncio' OR "tema_id" IS NULL);
