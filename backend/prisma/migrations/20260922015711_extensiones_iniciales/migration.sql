-- Extensiones que usa la busqueda de alumnos (unaccent + trigramas).
-- Idempotente: en dev ya las creo infra/postgres/init/01-extensiones.sql;
-- aqui se declaran para la base sombra, Testcontainers y prod (DEC-02 de INFRA-01).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
