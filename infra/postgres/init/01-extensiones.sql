-- Solo corre cuando el volumen de datos esta vacio (primer arranque).
-- No sustituye a la migracion de Prisma, que debe declarar las mismas extensiones.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
