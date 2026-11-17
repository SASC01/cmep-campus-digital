-- CreateTable
CREATE TABLE "participaciones_foro" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "foro_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "principal_id" UUID,
    "texto" TEXT NOT NULL,
    "con_retraso" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participaciones_foro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participaciones_foro_foro_id_principal_id_creado_en_id_idx" ON "participaciones_foro"("foro_id", "principal_id", "creado_en", "id");

-- CreateIndex
CREATE INDEX "participaciones_foro_principal_id_creado_en_id_idx" ON "participaciones_foro"("principal_id", "creado_en", "id");

-- CreateIndex
CREATE INDEX "participaciones_foro_foro_id_autor_id_creado_en_id_idx" ON "participaciones_foro"("foro_id", "autor_id", "creado_en", "id");

-- AddForeignKey
ALTER TABLE "participaciones_foro" ADD CONSTRAINT "participaciones_foro_foro_id_fkey" FOREIGN KEY ("foro_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participaciones_foro" ADD CONSTRAINT "participaciones_foro_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participaciones_foro" ADD CONSTRAINT "participaciones_foro_principal_id_fkey" FOREIGN KEY ("principal_id") REFERENCES "participaciones_foro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A mano (FORO-01a, §D-1.2; Prisma no expresa CHECK ni índices parciales): el CHECK de título por
-- tipo se reemplaza, con el mismo nombre, por uno que acepta todo lo que aceptaba el anterior y además
-- el foro (con título, como la tarea). Toda fila de antes es anuncio, material o tarea y cumple el
-- nuevo; lo que un backend anterior escribe lo acepta igual que el viejo.
ALTER TABLE "publicaciones" DROP CONSTRAINT "publicaciones_titulo_segun_tipo";
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_titulo_segun_tipo"
  CHECK (("tipo" = 'anuncio' AND "titulo" IS NULL) OR ("tipo" IN ('material', 'tarea', 'foro') AND "titulo" IS NOT NULL));

-- A mano (FORO-01a, §D-1.2): una sola participación principal por alumno y foro. Es la red de
-- seguridad del orden de bloqueo; la tabla nace vacía, así que ningún dato de antes la puede violar.
CREATE UNIQUE INDEX "participaciones_foro_una_principal" ON "participaciones_foro" ("foro_id", "autor_id") WHERE "principal_id" IS NULL;
