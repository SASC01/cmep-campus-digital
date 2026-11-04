# Resumen del programador — CLASES-03a — corrección de la ronda 1

> **Nota de transcripción (orquestador, 2026-10-28).** Las instrucciones de entorno del programador le impiden escribir reportes, así que entregó el resumen como texto y el orquestador lo transcribió tal cual, sin cambiar contenido, según la regla "Transcripción con cotejo" de `AGENTS.md`. Cotejo en `aprobacion.md`.

Me detuve en una PARADA durante la tanda de verificación: en la suite del frontend quedó en rojo una `*.ataque` que no es la permitida. El resto está en verde salvo la roja esperada de `muro-c-r1`; no corrí `npm run build` del frontend.

## La PARADA
- **Prueba:** `frontend/src/lib/errores-ch3-r2.ataque.test.ts` › «en shared/src, todo mensaje que empieza con «palabra:» es un nombre del inventario, y lo que lo sigue no es otro nombre» (`:253`).
- **Qué pide:** todo mensaje de `shared/src` con la forma `«nombre: …»` debe usar un nombre de su lista `INVENTARIO`.
- **Qué lo rompe:** cinco mensajes nuevos de 03a, con el texto exacto que fija el plan:
  - `shared/src/clases.ts:480`: `"tipo: no es válido"` (§D-3.2)
  - `shared/src/recursos.ts:21`: `"bloque: elige un bloque válido"` (§D-3.5)
  - `shared/src/recursos.ts:28`: `"recursoId: debe ser un identificador válido"` (§D-6)
  - `shared/src/tareas.ts:272` y `:280`: `"seccion: no es válida"` (§D-3.3 y §D-3.4)
- **Origen:** el plan no inventarió esta prueba del frontend en §D-R0 para 03a. No toqué la prueba ni los mensajes.
- **Decisión necesaria:**
  - (a) El tester suma `tipo`, `bloque`, `recursoId` y `seccion` a `INVENTARIO`, como se hizo con los nombres anteriores. Esto pide además revisar que `lib/errores-de-api.ts` sepa quitar esos prefijos.
  - (b) Cambiar los textos de los mensajes, que es una enmienda del plan.

## Corrección por hallazgo
**T-01 y T-02 (alta).**
- **Cambio:** `borrarPublicacion` (`backend/src/adapters/db/publicaciones.ts`) bloquea primero la fila de la publicación. Hace un `SELECT tipo, bloque, autor_id … FOR UPDATE` etiquetado y parametrizado, lee el autor por PK y aplica la misma regla de permisos. Solo después descarta los archivos y borra. El manager mantuvo este remedio en su arbitraje.
- **Prueba:** CL3a-r1-01 y CL3a-r1-02, verdes.
- **Hermanos y estados vecinos:**
  - Borrar un anuncio: aplica y se aplicó (misma función).
  - Material contra mover de tema: aplica y se aplicó. Quedan en serie; si el borrado gana, mover responde 404.
  - Material contra comentar: aplica y se aplicó. Quedan en serie; el comentario cae en cascada. Su `*.ataque` de `muro-c-r1` es la roja esperada.
  - Editar quitando un adjunto (T-01), agregándolo (T-02), conservándolo (CL3a-r1-03) o cambiando solo el tema: aplica y se aplicó (misma serie de la fila).
  - Borrado primero, la edición recibe 404 (CL3a-r1-04): aplica y pasa.
  - Edición primero, 200 y 204: aplica y pasa.
  - Borrar un comentario: no aplica (no toca la fila ni los archivos).
  - `borrarTarea`: ya bloqueaba primero; sin cambio.

**T-03 (media), autorizado por el humano.**
- **Cambio en `adapters/db/tareas.ts`:** solo `bloque: true` en el `select` de `listarTrabajoCon`, el campo `bloque: Bloque | null` en `ElementoDeTrabajoDb` (con su `import type`) y `bloque: fila.bloque` en lo que devuelve.
- **Cambio en `handlers/tareas/tareas.ts`:** `puedeMover` es `puedeMoverRecurso(actor, bloqueEfectivo(elemento.bloque, elemento.autor))` para un material y `puedeMoverElemento(relacion)` para una tarea. No hay `.rol` ni roles comparados a mano, y la respuesta no gana claves.
- **Prueba:** CL3a-r1-12, verde.
- **Hermanos y estados vecinos:**
  - `?seccion=actividades`: aplica sin efecto, porque no trae materiales.
  - Estudiante: `false`. Maestro sobre aprendizaje: `false`; sobre docente: `true`. Admin: `true`. Aplica y se aplicó.
  - Material con bloque nulo de autor admin (`false` para el maestro) y de autor maestro (`true`): aplica y se aplicó vía `bloqueEfectivo`.
  - La lista de recursos ya usaba la regla.
  - El muro no tiene `puedeMover`.

**T-04 (baja).**
- **Cambio:** el `refine` de repetidos de `archivoIdsSchema` (`shared/src/clases.ts`) compara en minúsculas. El manager aceptó este alcance.
- **Prueba:** CL3a-r1-15, verde.
- **Hermanos, uno por uno:**
  - `editarRecursoSchema`: aplica y se aplicó.
  - `crearPublicacionSchema`, anuncio y material: aplica y se aplicó. Antes, un repetido con otra capitalización daba `400 ARCHIVO_INVALIDO`; ahora da `400 VALIDACION`.
  - `crearTareaSchema` y `editarTareaSchema`: aplica y se aplicó. Tenían el mismo defecto de T-04 con un adjunto ya existente.
  - `entregarSchema`: su `refine` propio en minúsculas queda redundante. **Lo dejo:** la API responde igual porque solo usa la primera incidencia, y quitarlo es tocar `entregas.ts` sin necesidad.
  - `maestroIdsSchema` y `ordenTemasSchema`: ya comparan en minúsculas; no aplica.
  - Los adaptadores de 03a no tienen chequeos propios de repetidos.

## Verificación (una suite tras otra; salidas en el scratchpad, `v-*.txt`)
| Comando | Dónde | Última línea |
|---|---|---|
| `npm run build` | `shared/` | `> tsc -p tsconfig.json` (exit 0) |
| `npm run lint` | `shared/` | `All matched files use Prettier code style!` (exit 0) |
| `npm run lint` | `backend/` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0) |
| `npx prisma validate` | `backend/` | `The schema at prisma\schema.prisma is valid 🚀` |
| `npx vitest list` | `backend/` | 2713 casos en 223 archivos (`grep -cE "^(test\|src)/"` y archivos únicos) |
| `npm run test` | `backend/` | `Test Files  1 failed \| 222 passed (223)` · `Tests  1 failed \| 2712 passed (2713)` · `Duration 145.73s` |
| `npm run build` | `backend/` | `> tsc -p tsconfig.json` (exit 0) |
| `npm run lint` | `frontend/` | `> tsc -b` (exit 0) |
| `npx vitest list` | `frontend/` | 5310 casos (`grep -cE "^src/"`) |
| `npm run test` | `frontend/` | `Test Files  1 failed \| 236 passed (237)` · `Tests  1 failed \| 5309 passed (5310)` · `Duration 182.13s` |
| `npm run build` | `frontend/` | no corrido (PARADA) |

- **Backend:** la única roja es la permitida, `muro-c-r1.ataque` › «el FOR SHARE del comentario va primero…». CL3a-r1-12 está verde.
- **Hook timed out:** 0 en el backend y 0 en el frontend.
- **Errores en el log del backend:** 0 `40P01`, 0 «deadlock detected», 0 `P2003`. Los 5 `P2028` (en sesiones y tokens) y los 10 «Error no controlado» (fallos simulados de `intentos-r2.ataque` y de `salud`) son de pruebas que los provocan a propósito; no los toca 03a.
- **Conteo de archivos del frontend:** mi conteo de archivos únicos en `npx vitest list` da 197 y la corrida reporta 237 (el número de casos sí coincide, 5310). No pude explicar esa diferencia; tómala como cifra no verificada.

## Archivos cambiados en esta corrección
`backend/src/adapters/db/publicaciones.ts`, `backend/src/adapters/db/tareas.ts`, `backend/src/handlers/tareas/tareas.ts` y `shared/src/clases.ts`. Ninguna `*.ataque` tocada.

No escribí `resumen-programador-03a-r1.md` porque mis instrucciones de entorno me impiden escribir archivos de reporte; este texto es el resumen para transcribir. Falta la decisión sobre la PARADA para cerrar con el build del frontend.

## Adenda (2026-10-28, transcrita por el orquestador)
Adenda para `resumen-programador-03a-r1.md`: el build del frontend pasa y el conteo corregido da 237 archivos y 5310 casos.

- **Build del frontend:** `npm run build` desde `frontend/` terminó con exit 0. Última línea: `✓ built in 1.33s`. Antes salió el aviso de Vite sobre el tamaño de los chunks; es solo un aviso, no un error.
- **Conteo del frontend:** lo saqué de la salida de `npx vitest list` que ya tenía, ahora con `grep -a`:
  - `grep -acE "^src/" v-fe-list.txt` → **5310 casos**.
  - `grep -aE "^src/" v-fe-list.txt | sed -E 's/ > .*//' | sort -u | wc -l` → **237 archivos**.
  - Las dos cifras coinciden con la corrida (`Test Files ... (237)` · `Tests ... (5310)`). Sustituyen el 197 que reporté antes como no verificado: sin `-a`, `grep` trataba la salida como binaria.
- **Rojas esperadas hasta la ronda 2**, según el arbitraje:
  - En el backend, `muro-c-r1.ataque` › «el FOR SHARE del comentario va primero…».
  - En el frontend, `errores-ch3-r2.ataque` › «en shared/src, todo mensaje que empieza con «palabra:»…».

No toqué esa prueba ni los mensajes de `shared/`.
