-- CreateIndex
CREATE INDEX "movimientos_inscripcion_secuencia_idx" ON "movimientos_inscripcion"("secuencia" DESC);

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "usuarios_nombre_busqueda_id_idx" ON "usuarios"("nombre_busqueda", "id");

-- CreateIndex
CREATE INDEX "usuarios_rol_nombre_busqueda_id_idx" ON "usuarios"("rol", "nombre_busqueda", "id");
