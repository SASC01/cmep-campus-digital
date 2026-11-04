-- CreateEnum
CREATE TYPE "bloque_recurso" AS ENUM ('aprendizaje', 'docente');

-- AlterTable
ALTER TABLE "publicaciones" ADD COLUMN     "bloque" "bloque_recurso",
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- A mano (CLASES-03a, §D-1.3; Prisma no genera datos): reparto de los materiales existentes por el
-- rol de su autor, la misma regla que bloqueEfectivo (core/recursos.ts): lo del admin va a
-- "aprendizaje" y lo demás a "docente". Anuncios y tareas quedan con bloque nulo. Un UPDATE crudo no
-- activa @updatedAt (no hay disparadores en publicaciones), así que actualizado_en no cambia. Va antes
-- de los CHECK para que la tabla ya los cumpla al crearlos.
UPDATE "publicaciones" p
SET "bloque" = CASE WHEN u."rol" = 'admin' THEN 'aprendizaje'::"bloque_recurso"
                    ELSE 'docente'::"bloque_recurso" END
FROM "usuarios" u
WHERE p."autor_id" = u."id" AND p."tipo" = 'material';

-- A mano (CLASES-03a, §D-1.4 y §D-1.5; Prisma no expresa CHECK y no lo compara al buscar deriva):
-- solo un material lleva bloque. Un material con bloque nulo sigue siendo válido (DH-02 a: solo lo
-- produce un backend anterior o una prueba que inserta a mano; los permisos usan bloqueEfectivo y
-- Recursos no lo lista), así que un backend anterior nunca viola este CHECK. La versión de un
-- material (editar un recurso) nunca es negativa.
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_bloque_solo_material"
  CHECK ("bloque" IS NULL OR "tipo" = 'material');
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_version_no_negativa"
  CHECK ("version" >= 0);

-- CreateIndex
CREATE INDEX "publicaciones_clase_id_tipo_tema_id_creado_en_id_idx" ON "publicaciones"("clase_id", "tipo", "tema_id", "creado_en" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "publicaciones_clase_id_bloque_tema_id_creado_en_id_idx" ON "publicaciones"("clase_id", "bloque", "tema_id", "creado_en" DESC, "id" DESC);
