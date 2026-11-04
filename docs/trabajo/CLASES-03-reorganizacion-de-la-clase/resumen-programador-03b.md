# Resumen del programador — CLASES-03b

> **Nota de transcripción (orquestador, 2026-10-29).** Las instrucciones de entorno del programador le impiden escribir reportes, así que entregó el resumen como texto y el orquestador lo transcribió tal cual, sin cambiar contenido, según la regla "Transcripción con cotejo" de `AGENTS.md`. Cotejo en `aprobacion.md`.

03b (backend de Dudas) de CLASES-03 está completa: las suites del backend y del frontend quedan en verde, sin «Hook timed out», y C-1, C-2 y C-3 pasan con el código nuevo. No toqué ninguna `*.ataque` ni archivos de "No se toca".

```
Plan: docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md (SHA-256 204515a6…1a85971, 1027 líneas, Enmiendas 1 a 3)
Pasos completados: 6 de 6 de 03b (base <K3a> = a0ae116)
```

## Migración
- **Carpeta:** `backend/prisma/migrations/20261029153231_clases_03_dudas/`.
- **SHA-256 de `migration.sql`:** `91c42c4100318f7108f717a3644f0cf1efe6e39b55c51a20728d736c621e0dff`.
- **Cómo la creé:** `npx prisma migrate dev --create-only --name clases_03_dudas`.
  - Lo generado coincidió línea por línea con la salida de `prisma migrate diff` que propuse (`diff` sin líneas vacías dio `IGUALES`).
  - Al final agregué tal cual, con sus comentarios, los dos bloques a mano: `dudas_resuelta_completa` y el `DROP` y `ADD` de `comentarios_un_solo_contexto` con el mismo nombre y `num_nonnulls(publicacion_id, entrega_id, duda_id) = 1`.
- **Aplicada en `campus_dev` local:** `npx prisma migrate dev` respondió «Your database is now in sync with your schema» y `npx prisma generate` respondió `✔ Generated Prisma Client (7.10.0)`.
- El texto completo es el de mi entrega anterior.

## Archivos
**Nuevos:**
- `shared/src/dudas.ts`
- `backend/src/core/dudas.ts`, `backend/src/core/dudas.test.ts`
- `backend/src/adapters/db/dudas.ts`
- `backend/src/handlers/clases/dudas.ts`
- la carpeta de la migración
- `backend/test/ayudas-dudas.ts`
- `backend/test/migracion-clases-03b.integracion.test.ts`, `backend/test/dudas.integracion.test.ts`, `backend/test/dudas-autorizacion.integracion.test.ts`

**Modificados:**
- `shared/src/index.ts`
- `backend/prisma/schema.prisma`
- `backend/src/adapters/db/index.ts`
- `backend/src/app.ts` (registro de `dudasHandler`)
- `backend/src/adapters/README.md`, `backend/src/handlers/README.md`
- `backend/test/bloqueo-usuario.integracion.test.ts` (E6, de la lista cerrada)

Las `*.ataque` y los `docs/` modificados que muestra el árbol son del tester y del orquestador.

## Diff de E6 (`backend/test/bloqueo-usuario.integracion.test.ts`)
```diff
@@ -686,7 +686,8 @@
   // CLASES-03a (§D-3.7): recursos.ts (el FOR NO KEY UPDATE de la fila del recurso al editarlo).
-  it("E6: solo …, calificaciones.ts y recursos.ts usan SQL etiquetado en adapters/db", async () => {
+  // CLASES-03b (§D-5): dudas.ts (el FOR SHARE de la duda al responderla).
+  it("E6: solo …, calificaciones.ts, recursos.ts y dudas.ts usan SQL etiquetado en adapters/db", async () => {
@@ -709,6 +710,7 @@
       "categorias.ts",
+      "dudas.ts",
       "enlaces-registro.ts",
```
En el bloque de arriba abrevié con «…» el principio del título de E6; esa parte no cambió.

## Protocolo de bloqueos (lecciones de 03a)
- `crearRespuesta` toma la fila de la duda `FOR SHARE` y `borrarDuda` la toma `FOR UPDATE` antes de borrar. Las respuestas caen en cascada.
- Si la respuesta llega primero, el resultado es 201 y luego 204, y la respuesta cae con la duda. Si el borrado llega primero, el resultado es 204 y la respuesta recibe 404 sin insertar. CL3-B07 cubre los dos órdenes con retención de fila y `timeout: 30_000`.
- `marcarDuda` y `borrarRespuesta` tocan una sola fila, sin filas hijas.
- El SQL crudo nuevo está solo en `dudas.ts`. Hay exactamente dos `instantaneaUnica: true` (`listarDudas` y `listarRespuestas`).
- Los ids de la ruta pasan a minúsculas.
- No hay `LOCK TABLE` ni `DO $$`. No agregué comentarios nuevos en `app.ts` ni en `index.ts`.
- No hay `encolar` en el handler de dudas.

## Verificación (una suite tras otra)
| Comando | Dónde | Última línea |
|---|---|---|
| `npm run build` | `shared/` | exit 0, `> tsc -p tsconfig.json` |
| `npm run lint` | `shared/` | `All matched files use Prettier code style!` |
| `npm run lint` | `backend/` | exit 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| `npx prisma validate` | `backend/` | `The schema at prisma\schema.prisma is valid 🚀` |
| `npm run test` | `backend/` | `Test Files  228 passed (228)` · `Tests  2760 passed (2760)` · `Duration  143.22s` |
| `npm run build` | `backend/` | exit 0, `> tsc -p tsconfig.json` |
| `npm run lint` | `frontend/` | exit 0, `> tsc -b` |
| `npm run test` | `frontend/` | `Test Files  237 passed (237)` · `Tests  5310 passed (5310)` · `Duration  173.70s` |
| `npm run build` | `frontend/` | exit 0, `✓ built in 1.42s` |

- En el log del backend hubo 0 `40P01`, 0 «deadlock detected» y 0 `P2003`.
- **Conteos del backend** (`npx vitest list`): `grep -acE "^(test|src)/"` → 2760 casos; `grep -aE "^(test|src)/" | sed 's/ > .*//' | sort -u | wc -l` → 228 archivos. Son +4 archivos y +39 casos frente a 2721/224. Por archivo:
  - `src/core/dudas.test.ts`: 1
  - `test/migracion-clases-03b.integracion.test.ts`: 6
  - `test/dudas.integracion.test.ts`: 24
  - `test/dudas-autorizacion.integracion.test.ts`: 8
- **Conteos del frontend:** los mismos comandos con `^src/` → 5310 casos y 237 archivos.

## Pruebas requeridas › 03b
- **CL3-B01** (`test/migracion-clases-03b.integracion.test.ts`):
  - «CL3-B01: los comentarios de antes (del muro y del hilo privado) siguen igual y sin duda»
  - «CL3-B01: en el esquema migrado existen, validados, dudas_resuelta_completa y comentarios_un_solo_contexto (uno solo con ese nombre)»
  - «CL3-B01: comentarios_un_solo_contexto rechaza cero o dos contextos entre los tres y acepta cada uno solo»
  - «CL3-B01: dudas_resuelta_completa rechaza la fecha sin quien la marcó y al revés»
  - «CL3-B01: borrar la duda borra sus respuestas (cascada); borrar la clase borra sus dudas; el autor y quien la marcó no se pueden borrar (restrict)»
  - «CL3-B01: existen los índices dudas(clase_id, creado_en DESC, id DESC) y comentarios(duda_id, creado_en, id)»
- **CL3-B02** (`src/core/dudas.test.ts`): «CL3-B02: el maestro de la clase y el admin marcan; el estudiante nunca»
- **CL3-B03, autorización** (`test/dudas-autorizacion.integracion.test.ts`, vale para las siete rutas y cubre también la autorización de B04 a B08):
  - «CL3-B03 a CL3-B08: se prueban las siete rutas de 03b»
  - «… cada ruta, sin sesión, responde 401 NO_AUTENTICADO»
  - «… con cambio de contraseña pendiente, responde 403 CAMBIO_DE_CONTRASENA_REQUERIDO»
  - «… con un alumno restringido inscrito, responde 403 ACCESO_RESTRINGIDO»
  - «… en una clase ajena o inexistente, responde 403 SIN_ACCESO_A_LA_CLASE con el mismo cuerpo»
  - «… en cada negación, las dudas y sus respuestas quedan como estaban»
  - «… cada ruta responde su éxito a cada rol que admite, sin estado de pago, correo, rol ni quién marcó la duda»
- **CL3-B03, contenido** (`test/dudas.integracion.test.ts`):
  - «CL3-B03: de la más reciente a la más antigua, con el conteo de respuestas, resuelta y resueltaEn»
  - «CL3-B03: pagina con el cursor de una duda de la clase»
  - «CL3-B03: propia, puedeBorrar y puedeMarcar para la alumna autora, otra alumna, un maestro, otro maestro y el admin»
  - «CL3-B03: un cursor de otra clase, borrado o inexistente responde 400 «cursor: no es válido», igual»
- **CL3-B04**:
  - `test/dudas.integracion.test.ts`: «CL3-B04: la alumna inscrita y el maestro publican (201) con el texto normalizado; la duda queda sin resolver» y «CL3-B04: texto vacío, de invisibles, de 2001, con controles o con inversores responde 400 VALIDACION sin escribir»
  - `test/dudas-autorizacion.integracion.test.ts`: «CL3-B04, CL3-B05 y CL3-B07: el admin no publica dudas ni respuestas y el estudiante (también el autor) no marca: 403 ROL_NO_PERMITIDO», más las negaciones comunes
  - Ningún trabajo en `pgboss.job`: CL3-B10
- **CL3-B05** (`test/dudas.integracion.test.ts`), y el caso de ROL de arriba:
  - «CL3-B05: el maestro y el admin marcan y quitan «Resuelta»; quién la marcó queda en la base y nunca en la respuesta»
  - «CL3-B05: con el reloj fijo, marcar dos veces no cambia resueltaEn»
  - «CL3-B05: una duda de otra clase o inexistente responde 404 DUDA_NO_ENCONTRADA sin escribir»
  - «CL3-B05: un cuerpo sin resuelta, con otro tipo o con una llave de más responde 400 VALIDACION»
- **CL3-B06** (`test/dudas.integracion.test.ts`):
  - «CL3-B06: la alumna autora borra la suya con sus respuestas (cascada); otra vez responde 404 DUDA_NO_ENCONTRADA»
  - «CL3-B06: otra alumna y un maestro sobre la de otro maestro reciben 403 BORRADO_NO_PERMITIDO sin borrar; un maestro borra la de una alumna y el admin cualquiera»
- **CL3-B07** (`test/dudas.integracion.test.ts`), y el caso de ROL de arriba (el admin, 403):
  - «CL3-B07: se listan de la más antigua a la más reciente, con cursor»
  - «CL3-B07: la alumna y el maestro responden (201), también a una duda resuelta (S-06); el texto de 1001 responde 400»
  - «CL3-B07: responder a una duda borrada, de otra clase o inexistente responde 404 DUDA_NO_ENCONTRADA sin insertar»
  - «CL3-B07: responder y borrar la duda a la vez, con la respuesta formada primero: 201 y 204, y la respuesta cae con la duda»
  - «CL3-B07: responder y borrar la duda a la vez, con el borrado formado primero: 204 y 404 DUDA_NO_ENCONTRADA sin insertar»
- **CL3-B08** (`test/dudas.integracion.test.ts`):
  - «CL3-B08: las reglas de autoría de CL3-B06»
  - «CL3-B08: una respuesta de otra duda o de otra clase responde 404 RESPUESTA_NO_ENCONTRADA sin borrar»
- **CL3-B09** (`test/dudas.integracion.test.ts`):
  - «CL3-B09: una respuesta no se lista ni se borra por las rutas del muro ni por «mis comentarios»»
  - «CL3-B09: un comentario del muro y uno del hilo privado no se listan ni se borran por las rutas de respuestas»
  - «CL3-B09: los conteos de comentarios del muro no cuentan respuestas»
- **CL3-B10**:
  - `test/dudas.integracion.test.ts`: «CL3-B10: handlers/clases/dudas.ts no encola nada» y «CL3-B10: usar todas las rutas de dudas no deja trabajos en la cola que mencionen la clase, la duda o la respuesta»
  - El inventario de rutas lo cubre C-1 en `sesiones-y-cadena.ataque`, que queda en verde.

## Desviaciones
1. La relación de `Duda` hacia quien la marcó se llama `marcadaPor` en Prisma, porque `resueltaPor` ya es el nombre de la columna. Las relaciones inversas son `Usuario.dudas` (`"DudasDelAutor"`) y `Usuario.dudasResueltas` (`"DudasResueltasPor"`), como dice el plan.
2. `marcarDuda` recibe `ahora` del handler (`new Date()`) en lugar de usar `now()` de la base. Así la prueba fija el reloj solo sobre `Date` (`vi.useFakeTimers({ toFake: ["Date"] })`). La fecha sigue siendo la del servidor.
3. `borrarDuda` toma la fila de la duda con `SELECT … FOR UPDATE` crudo antes de borrar. El plan pedía «lee el autor»; es la lección T-01/T-02 de 03a y deja en serie el borrado con la respuesta en curso.
4. CL3-B07 y CL3-B03 usan sus propias ayudas dentro del archivo de prueba (retención de la fila de `dudas`). `conFilaRetenida` no admite esa tabla, el mismo caso que en 03a.
