# Reporte del Tester — CHORE-04 · guardas de doble clic

## Ronda 0 — CHORE-04 (2026-11-11)

Ronda 0: no es de ataque y no busca hallazgos. Aplica C-1 de §D-R0 (`plan.md`, 651 líneas, SHA-256 `75e9179fc4c3bae39e1da38a323a254e4c547da8019ba4d2a9130f0f253e3e1c`) y comprueba el estado esperado antes de que el programador empiece.
Veredicto: C-1 APLICADA; estado esperado confirmado (rojo solo en los seis formularios de `features/auth`, por la razón correcta). Sin hallazgos del plan.
Verificación propia: lint `exit 0` (última línea `> tsc -b`, sin errores; Prettier: "All matched files use Prettier code style!") · test del archivo C-1: `Tests  6 failed | 10 passed (16)` (estado esperado).
Equipo conectado a la corriente (BatteryStatus 2, 100 %). La otra copia de trabajo no se usa (dicho por el humano por medio del orquestador): una corrida a la vez.
Nota de transcripción: la herramienta de escritura rechazó el archivo al tester ("Subagents should return findings as text"); el orquestador lo transcribe tal cual (regla de respaldo de `AGENTS.md`).

### V-01 · Base
- `HEAD` = `9b6953caf293eb05319902b84d2ec840528669ba` (la base de "No se toca"). `git status --porcelain` antes de tocar nada: solo los tres archivos sin seguimiento de `docs/trabajo/` (la carpeta del encargo y dos investigaciones); nada en los paquetes.
- `git diff --name-only 9b6953c -- '*.ataque.test.*'` antes de C-1: **vacío**.
- Inventario de todos los `*.ataque.test.*` del repositorio (`git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.' | LC_ALL=C sort`, con `sha256sum` de cada uno): **281 archivos**, los mismos 281 del cierre de ADMIN-01. `git ls-files` solo con los versionados también da 281.
- Lista base: `C:/Users/Carlos/AppData/Local/Temp/claude/cbc20defe2ff00dc/af34580f-db0f-4e17-b8f4-34eb4bf290b3/scratchpad/v01-ch4-base.txt`, 281 líneas, **SHA-256 `f292fb3121e70d8e250eddbc45bd9df02c538d48c4175ffd6291c38be3990651`**.
- En la base, `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` = `74b07393a4519a1067e59cf987f2a93dca1cb037e1a314097af4a6a0aeed692b`.

### C-1 · `frontend/src/lib/estatico-ch3-r2.ataque.test.ts`
El texto de §D-R0 encaja con el código actual: el comentario está en las líneas 60-63 y `CON_REF` en las 64-69, con los cuatro formularios de `admin`.

Cambio aplicado:
- El comentario suma la frase del plan, partida en dos líneas como el resto de los comentarios del archivo (a 100 columnas).
- `CON_REF` suma los seis formularios de `features/auth`.

Nada más del archivo cambia (8 inserciones, 0 borrados).

```diff
@@ -61,11 +61,19 @@ const DIEZ: readonly (readonly [string, string])[] = [
 // isPending (§D-11, Enmienda 9). En 01f, solo el de corregir el correo.
 // ADMIN-01g ronda 0 (C-38, Enmienda 9 y Enmienda 15; filas 8 a 10 de CHORE-04): suman invitar maestro,
 // la invitación masiva y generar enlace.
+// CHORE-04 ronda 0 (C-1, §D-R0; §D-1, filas 12 a 17 de CHORE-04): suman los seis formularios de
+// features/auth; los diez llevan la ref.
 const CON_REF: ReadonlySet<string> = new Set([
   "/src/features/admin/components/formulario-corregir-correo.tsx",
   "/src/features/admin/components/formulario-invitar-maestro.tsx",
   "/src/features/admin/components/formulario-invitacion-masiva.tsx",
   "/src/features/admin/components/formulario-generar-enlace.tsx",
+  "/src/features/auth/components/formulario-login.tsx",
+  "/src/features/auth/components/formulario-registro.tsx",
+  "/src/features/auth/components/formulario-registro-maestro.tsx",
+  "/src/features/auth/components/formulario-recuperar.tsx",
+  "/src/features/auth/components/formulario-nueva-contrasena.tsx",
+  "/src/features/auth/components/formulario-cambiar-contrasena.tsx",
 ])
```

- SHA-256 anterior: `74b07393a4519a1067e59cf987f2a93dca1cb037e1a314097af4a6a0aeed692b`.
- SHA-256 nuevo: **`151dbd75f845cb2315fc2774e061404b9275e5dc4fde37801fabb4e88377fa0c`**.
- Tras C-1, `git diff --name-only 9b6953c -- '*.ataque.test.*'` da solo `frontend/src/lib/estatico-ch3-r2.ataque.test.ts`. El inventario sigue en 281, y el `diff` contra la lista base cambia solo esa línea (la 273).

### Estado esperado tras C-1
Comando, desde `frontend/`: `npx vitest run src/lib/estatico-ch3-r2.ataque.test.ts`
Última línea de resultados: `Tests  6 failed | 10 passed (16)` (`Test Files  1 failed (1)`).

En rojo hay 6 casos, todos del `it.each` de `DIEZ` y solo de los seis formularios de `features/auth`:
- `formulario-login.tsx: la línea de T-05 es la sentencia que sigue a la guarda isPending, dentro del manejador del submit y antes de leer el formulario`
- `formulario-registro.tsx: …` (mismo título)
- `formulario-registro-maestro.tsx: …`
- `formulario-recuperar.tsx: …`
- `formulario-nueva-contrasena.tsx: …`
- `formulario-cambiar-contrasena.tsx: …`

Los seis fallan en `estatico-ch3-r2.ataque.test.ts:157:21`, que es la primera aserción del caso, `expect(texto).toMatch(guardaYLinea)`, con `AssertionError: expected 'import { … } from "@campus/…' to match /evento\.preventDefault\(\)\s*\n\s*if …/`. La expresión esperada, por ejemplo la de login, es:

`/evento\.preventDefault\(\)\s*\n\s*if \(\w+Ref\.current\) return\s*\n\s*if \(inicioSesion\.isPending\) return\s*\n\s*if \(inicioSesion\.isError\) inicioSesion\.reset\(\)\s*\n/`

Las de los demás son la misma con `alta` (registro y registro de maestro), `recuperar`, `nuevaContrasena` y `cambiar`. La razón es la correcta: falta la línea `if (<nombre>Ref.current) return` entre `evento.preventDefault()` y la guarda `isPending`, que el programador pone en el paso 3.

Siguen en verde los otros 10 casos, nombrados en la corrida `--reporter=verbose` de la comprobación siguiente:
- la precondición;
- los dos de invisibles;
- "la tabla común solo la importan pruebas";
- "quitarPrefijoDeCampo y PREFIJO_DE_RUTA…";
- los cuatro formularios de `admin` (`formulario-invitar-maestro`, `-invitacion-masiva`, `-generar-enlace`, `-corregir-correo`);
- "fuera de los diez y de los cuatro de 01f…".

El rojo no aparece en ningún otro archivo (solo se corrió este).

### Comprobación de C-1 en verde (mutación temporal, sin rastro)
- Respaldo de `frontend/src/features/auth/components/formulario-recuperar.tsx` en el scratchpad (SHA-256 `fc5a4dd30674fda21c52d05cbf9b3d52c450b2c5c9e20e485c16cbb3805766e6`; blob `63ba3ecf…`, igual que en `9b6953c`).
- Mutación con el patrón de §D-1:
  - `useRef` en la importación;
  - `const enviandoRef = useRef(false)`;
  - `if (enviandoRef.current) return` justo después de `evento.preventDefault()` y antes de `if (recuperar.isPending) return`;
  - `enviandoRef.current = true` antes de `mutate`;
  - `onSettled: () => { enviandoRef.current = false }` en el `mutate`.

```diff
-import { useState, type FormEvent } from "react"
+import { useRef, useState, type FormEvent } from "react"
@@
   const [errores, setErrores] = useState<ErroresFormulario>({})
+  const enviandoRef = useRef(false)
@@
     evento.preventDefault()
+    if (enviandoRef.current) return
     if (recuperar.isPending) return
@@
     setErrores({})
-    recuperar.mutate(resultado.data)
+    enviandoRef.current = true
+    recuperar.mutate(resultado.data, {
+      onSettled: () => {
+        enviandoRef.current = false
+      },
+    })
```

- `npx vitest run src/lib/estatico-ch3-r2.ataque.test.ts --reporter=verbose` da `Tests  5 failed | 11 passed (16)`. `formulario-recuperar.tsx` pasa a ✓ y quedan en rojo solo los otros cinco de `auth`. Las líneas de comentario de T-05 que siguen a la guarda `isPending` no estorban, porque `sinComentarios` las deja vacías y `\s*\n\s*` las cubre.
- Restauración desde el respaldo:
  - SHA-256 `fc5a4dd3…` y `cmp` idénticos;
  - `git hash-object` = `63ba3ecf…`;
  - `git status --porcelain` muestra solo ` M frontend/src/lib/estatico-ch3-r2.ataque.test.ts` y los tres sin seguimiento de `docs/trabajo/`. El formulario no aparece.

### Lint
`npm run lint`, desde `frontend/`: exit 0. Corre eslint, `prettier --check` ("All matched files use Prettier code style!") y `tsc -b`, que es la última línea (`> tsc -b`), sin errores. Prettier no reformateó el archivo cambiado.

### Comandos y su última línea
| Comando | Última línea |
|---|---|
| `git diff --name-only 9b6953c -- '*.ataque.test.*'` (antes de C-1) | vacío |
| `npx vitest run src/lib/estatico-ch3-r2.ataque.test.ts` (C-1, sin ref) | `Tests  6 failed | 10 passed (16)` |
| `npx vitest run src/lib/estatico-ch3-r2.ataque.test.ts --reporter=verbose` (mutación temporal) | `Tests  5 failed | 11 passed (16)` |
| `npm run lint` | `> tsc -b` (exit 0) |
| `git diff --name-only 9b6953c -- '*.ataque.test.*'` (después de C-1) | `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` |

No se corrieron la suite de módulos ni la completa (fuera de la ronda 0). No se tocó otro archivo de producción ni otra prueba. Sin commit y sin navegadores.

## Ronda 1 — CHORE-04 (2026-11-11)

Veredicto: **RESISTE.** Ningún ataque del tester dejó una prueba en rojo contra el código del programador. Lo que sigue son mediciones, datos para el arbitraje del manager y del humano, y observaciones de la familia H-3/O-E3-1, que ya tiene destino.

Verificación propia (desde `frontend/`, una corrida a la vez; equipo con corriente, BatteryStatus 2, 100 %; la otra copia de trabajo no se usa):
- lint `exit 0`: última línea `> tsc -b`, antes "All matched files use Prettier code style!";
- suite de los cinco módulos del plan: `Test Files  204 passed (204)` · `Tests  4523 passed (4523)` (Duration 343.38s), es decir, los 4380 de la verificación del manager más mis 143.

Base leída:
- `plan.md` 667 líneas (`6f4eb385…`);
- `resumen-programador.md` 322 (`3676b607…`);
- `revision.md` 637 (`5c28ca3a…`).

Cotejo de la transcripción de la ronda 0: `reporte-tester.md` (128 líneas, `863e594d…`) es mi texto tal cual.

### Hallazgos
Ninguno.

### Medición pedida por el humano (punto 1): ¿cada prueba de doble envío de los formularios de acceso falla al quitar la guarda?
Método:
- en cada formulario se quitó solo la línea `    if (enviandoRef.current) return` del `handleSubmit` (`scratchpad/ch4r1/mutar.sh`);
- se corrieron mis casos y CH4-10 (a), CH4-10 (b) y CH4-13 de `features/auth/guardas-ch4.test.tsx`, sin modificarlos;
- se restauró desde un respaldo en el scratchpad (nunca con `git checkout` ni `git restore`), con `sha256sum` y `cmp` idénticos;
- se volvió a correr con la guarda.

**Con el componente real no existe una forma de envío que llegue antes de `isPending` en los formularios con contraseña.**
- El *listener* de `submit` en captura de `CampoContrasena` corre `flushSync` en cada envío, y toda vía al `handleSubmit` pasa por un evento `submit` en el formulario: el clic en el botón de envío, `requestSubmit` y el Enter.
- Lo medí con una sonda temporal (`src/features/auth/sonda-temporal-r1.ataque.test.tsx`, creada y borrada por mí; no queda en el árbol): mis ATQ-CH4-01 y ATQ-CH4-03 **sin el doble**, con las seis guardas quitadas a la vez. Resultado: `4 failed | 24 passed`. Las 4 que caen son las de recuperar, que no tiene el campo; las 24 de los formularios con contraseña siguen verdes ("dos clics", "dos submit" y "clic y submit" en el mismo render, y "tras un 500").
- Por eso mis casos usan **el doble de `CampoContrasena` sin su `flushSync`** (un `<input>`); el caso comprueba que el doble está montado. Recuperar va con su componente real, porque no tiene el campo.

| Formulario | Caso (mío) | Sin la guarda | Con la guarda | CH4-10 (a), CH4-10 (b), CH4-13 del programador sin la guarda |
|---|---|---|---|---|
| login | ATQ-CH4-01 (3 formas) y ATQ-CH4-03 | **4 rojos** | 4 verdes | 3 **verdes** |
| registro de estudiante | ídem | **4 rojos** | 4 verdes | 3 **verdes** |
| registro de maestro | ídem | **4 rojos** | 4 verdes | 3 **verdes** |
| recuperar (componente real) | ídem | **4 rojos** | 4 verdes | 3 **rojos** |
| nueva contraseña (restablecer y establecer, un mismo archivo) | ídem, ×2 modos | **8 rojos** | 8 verdes | 6 **verdes** |
| cambio obligatorio | ídem | **4 rojos** | 4 verdes | 3 **verdes** |

Las salidas están en `scratchpad/ch4r1/mut-<form>.sin.txt` y `.con.txt`. Sin la guarda de login (comprobación previa), caen además los 8 ATQ-CH4-04 de login, y los ATQ-CH4-04 de los demás formularios, que repiten dos envíos en el mismo render tras cada error.

Qué hacer con los 18 casos del programador que siguen verdes sin la guarda (CH4-10 (a), CH4-10 (b) y CH4-13 de los seis archivos con contraseña) lo arbitra el manager: reescribirlos o declarar que ahí la guarda es redundante con `isPending` por el `flushSync`. Yo solo mido.

**Hermanos (punto 5 del humano), una mutación medida por mecanismo, contra los casos del programador:**

| Mecanismo | Mutación | Caso | Sin la guarda | Con la guarda |
|---|---|---|---|---|
| «Cerrar sesión» del marco (`app/require-rol.tsx`) | quitar `if (cerrandoRef.current) return` | CH4-15 'marco de /estudiante', '/maestro' y '/admin' | **3 rojos** | 3 verdes |
| «Cerrar sesión» de acceso restringido | ídem | CH4-15 '/acceso-restringido' | **1 rojo** | 1 verde |
| «Cerrar sesión» del cambio obligatorio | ídem | CH4-15 '/cambiar-contrasena' | **1 rojo** | 1 verde |
| Botón de §D-1 en clases (`tabla-alumnos.tsx`) | quitar `if (quitandoRef.current) return` | CH4-20 «Sí, quitar» de un alumno, y mis 3 ATQ-CH4-10 | **4 rojos** | 4 verdes |
| Formulario de clases sin `CampoContrasena` (`formulario-unirse-clase.tsx`) | quitar `if (enviandoRef.current) return` | CH4-20 (dos clics y dos submit), y mis 3 ATQ-CH4-10 | **5 rojos** | 5 verdes |
| §D-4 bis, «Restaurar» | dejar solo `if (restauracion.sigueEnVuelo()) return` | CH4-28 (a) y mis 3 ATQ-CH4-11 | 4 **verdes** | 4 verdes |
| §D-4 ter, «Sí, regenerar» | dejar solo `if (regeneracion.sigueEnVuelo()) return` | CH4-20 «Sí, regenerar» y CH4-40 (a) | 2 **verdes** | 2 verdes |
| §D-4 bis, «Subir»/«Bajar» (`trabajo-view.tsx`) | quitar `if (ordenandoRef.current === claseId) return` | CH4-38 | 1 **verde** | 1 verde |

- Fuera de los cinco formularios con `CampoContrasena`, los casos del programador sí vigilan la guarda de §D-1: los botones, «Cerrar sesión» y los formularios sin el campo caen sin ella.
- En los tres controles de §D-4 bis y §D-4 ter, la ref es redundante con `sigueEnVuelo()`: `queryClient.isMutating` lee la caché de forma síncrona, y `mutate`/`mutateAsync` dejan la mutación `pending` antes del primer `await`. Por eso ningún caso de "mismo render" puede distinguir la ref; tampoco encontré un estado en que la ref frene y `sigueEnVuelo()` no.
- Este dato es para el arbitraje del manager con la regla del humano. No es un defecto de conducta.
- Las ocho restauraciones quedaron idénticas a su respaldo (`cmp`). Al terminar, `git diff --stat 9b6953c -- frontend` sigue en `29 files changed, 351 insertions(+), 72 deletions(-)`, y `git status --porcelain` muestra los 33 archivos del encargo en `frontend/` más mis 4 `*.ataque`.

### Atacado sin hallazgos
- **Punto 1, la ref de `auth` sin el `flushSync`** (`features/auth/guardas-ch4-r1.ataque.test.tsx`, 91 casos):
  - ATQ-CH4-01: "dos clics", "dos submit" y "clic y submit" en el mismo render, con `defaultPrevented` en el segundo submit. Siete configuraciones de formulario × tres formas.
  - ATQ-CH4-02: un envío, un render y otro envío en vuelo.
  - ATQ-CH4-03: tras un `500`, dos submit en el mismo render. `reset()` corre una sola vez y con la mutación asentada: el mensaje viejo se va, el botón sigue en espera y, tras el siguiente `500`, sale con un solo `MensajeError`; un clic más manda la tercera.
  - ATQ-CH4-04: la ref se suelta y sigue guardando tras cada clase de error que el programador no tenía en caso propio, en los siete: `503 SERVICIO_OCUPADO`, `503` sin cuerpo, `429`, `401` sin refresco, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, `409` y `400 VALIDACION` de un campo. En cada uno hay un solo mensaje (`MensajeError` o `ErrorDeCampo`), y luego dos submit en el mismo render dan una sola petición más.
  - `sacarDeLaCacheAlAsentar` no impide soltar la ref: en `@tanstack/query-core` 5.103.2, `cache.remove` no suelta a los observadores, y el `onSettled` del `mutate` corre.
- **Punto 6, la matriz sin caso propio en `clases`** (`features/clases/guardas-ch4-r1.ataque.test.tsx`):
  - ATQ-CH4-10: los ocho controles × `503 SERVICIO_OCUPADO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO` y `409`. El aviso de hoy (ninguno en «Sí, regenerar» ante `CAMBIO_DE_CONTRASENA_REQUERIDO`; uno en los demás, con su texto), el control sale de la espera y después dos clics en el mismo render mandan una sola petición más.
  - ATQ-CH4-11: lo mismo en «Restaurar» del aviso de clase archivada (ningún aviso ante el código que redirige).
- **Punto 4, cambio de clase con la petición en vuelo:**
  - ATQ-CH4-12: «Sí, regenerar» A → B → A → B con el `POST` de A retenido. En cada paso la confirmación de la otra clase está cerrada; el `POST` de B sale (una sola vez con dos clics); A responde estando en B y B conserva su código y su espera propia. Ninguna caché lleva el código de la otra clase. Al final, nada espera y A regenera de nuevo.
  - ATQ-CH4-13: la confirmación de B abierta mientras A vuela. Al ir a A se cierra y no reaparece al volver; al responder A, la de B (reabierta) sigue abierta y sin espera, y su clic manda el `POST` de B.
  - ATQ-CH4-14: «Restaurar» entre dos clases archivadas, A → B → A con las dos en vuelo. A espera por la caché y dos clics no mandan otra; B responde primero y A sigue esperando lo suyo; al final, nada espera, una petición por clase y ningún aviso de error.
  - ATQ-CH4-24: el `PUT` de A responde `409 ORDEN_DESACTUALIZADO` o `500` estando en B. Un solo aviso con su frase; B conserva su lista, no espera y dos clics de B mandan un solo `PUT` de B. De vuelta en A, nada espera y su «Subir» parte de la lista de A (la renovada con el `409`).
  - ATQ-CH4-25: A → B → A → B con los `PUT` de A y de B en vuelo. En cada clase espera solo el control de origen, ningún clic manda otro `PUT`, y las respuestas en orden inverso no dejan nada en espera ni escriben la lista de la otra clase.
  - ATQ-CH4-26: `409` con la vista en otra sección de A y regreso: nada espera, un solo aviso, y dos clics mandan un solo `PUT`, calculado con la lista renovada.
- **Punto 3, el fallo de una página de «Ver más»** (`features/clases/ver-mas-y-orden-ch4-r1.ataque.test.tsx`, 14 casos):
  - ATQ-CH4-20 (comentarios) y ATQ-CH4-22 (los dos inicios), con red y con un `400 VALIDACION` de cursor, disparados con dos clics en el mismo render: salen exactamente las 2 peticiones de la página (`retry: 1`) y ninguna más tras 1,5 s; hay un solo `alert` con el texto de `mensajeDeErrorDeLista` (la frase de "cambiaron mientras los veías" con el cursor); «Ver más» ya no está y nada queda en espera.
  - ATQ-CH4-21 y ATQ-CH4-23: una recarga de fondo llega con la página en vuelo y la página falla después. La recarga gana: ningún `MensajeError`, «Ver más» sale de la espera y su clic pide la página con el cursor de la lista renovada.
  - Medido aparte, con una sonda temporal sobre mi propio archivo, restaurada con `cmp`: tras el fallo de la página con el foco en «Ver más», el foco va al encabezado del bloque (`h3` «Comentarios» en los comentarios; `h2` «Mis clases» en el inicio), nunca a `<body>`.
- **Punto 2, la regla estática** (`lib/guardas-ch4-r1.ataque.test.ts`, 6 casos): ninguna forma oculta existe hoy sin guarda en `src/`. Fijé el inventario:
  - ATQ-CH4-30: ninguna mutación desestructurada ni renombrada.
  - ATQ-CH4-31: mutación pasada como valor solo en las dos líneas de `adjuntos-de-publicacion.tsx`, con `descargandoRef` comprobada antes de tomarse.
  - ATQ-CH4-32: toda llamada vive en un manejador a dos espacios. La lista cerrada tiene dos excepciones, las dos guardadas: la ayuda anidada `reemplazarFilas` dentro de `handleSubmit` del editor de categorías, y `handleGuardar` de `editar-tarea-view.tsx`, la excepción de §D-5.
  - ATQ-CH4-33: ninguna guarda negada sobre una ref que se toma.
  - ATQ-CH4-34: todo `.refetch(` sin `{ cancelRefetch: false }` está en la lista cerrada (los 7 de S-04, las 4 recargas tras un conflicto y el `cancelRefetch: true` del orden por sección); `refetch` no se pasa como valor, y su única desestructuración (`mis-calificaciones-view.tsx`) llama con `cancelRefetch: false`.
- **Punto 5** (ATQ-CH4-15 y ATQ-CH4-16): «Sí, quitar» de un maestro y de un alumno que están en A y en B, con el retiro de A retenido y salto a B. Al soltar A no queda nada en espera, y dos clics en el «Sí, quitar» de B mandan una sola petición de B (la ref no quedó tomada). Lo que se ve en B, en la observación O-r1-1.

### Observaciones (no son hallazgo)
- **O-r1-1 · La confirmación de «Sí, quitar» pasa abierta de A a B (punto 5 del manager; familia H-3/O-E3-1, con destino).**
  - Medido con una aserción de diagnóstico que falló, en las dos variantes: maestro (`ListaMaestrosDeClase`, `FilaMaestro` con `key={maestro.id}`) y **alumno** (`FilaAlumno` en `tabla-alumnos.tsx`). Si la misma persona está en las dos clases, la fila sobrevive al salto del historial (`ConClaseDeLaRuta` sin `key`) y su confirmación llega **abierta** a B. Un solo clic en «Sí, quitar <persona>» la retira de B sin que se haya pedido en B.
  - Mientras la petición de A vuela, ese botón de B está en espera (H-3: el observador sin `mutationKey` sigue atado a la mutación de A); al responder A se libera. Nada queda tomado.
  - Reproducción: admin en `/admin/clases/B/personas` → historial a `/admin/clases/A/personas` (los dos maestros en las dos clases) → «Quitar Marta Ruiz» → «Sí, quitar Marta Ruiz» → atrás a B: la fila de Marta Ruiz en B muestra «Sí, quitar Marta Ruiz» y «Cancelar». Con un alumno, igual: maestro en `/maestro/clases/…/personas` y Pedro Paz en las dos clases.
  - La línea de §D-4 ter que dice "las demás confirmaciones en línea … viven en filas con `key` por id, que se montan de nuevo cerradas en la otra clase" no se cumple para las personas que están en las dos clases; sí se cumple para comentarios y publicaciones, cuyo id es de una sola clase.
  - Sugiero sumar el caso del alumno a la fila de H-3/O-E3-1 de ESTADO §3 al aplicar A-2.
- **O-r1-2 · Huecos de la regla estática de §D-5 (punto 2):** una mutación desestructurada, pasada como valor, llamada en un efecto, un `useCallback`, una `function` o un manejador anidado (CH4-01 la atribuye al manejador anterior a dos espacios); una guarda negada (`guardaDe` acepta cualquier `if (… xRef.current …) return`); un `.refetch(` fuera de la línea del `onClick=`, o `refetch` pasado como valor. Ninguna forma existe hoy sin guarda. Mis reglas de ATQ-CH4-30 a ATQ-CH4-34 fijan el inventario.
- **O-r1-3 · La guarda redundante en tres controles:** la ref de «Restaurar», «Sí, regenerar» y «Subir»/«Bajar» repite lo que ya frena `sigueEnVuelo()` (tabla de hermanos). Es un dato para el arbitraje del manager con la regla del humano.
- **O-r1-4 · Caminos de la frase de recuperación tras el fallo de una página y título de `BloqueDestacado` (O-E4-1):** fuera de esta ronda por decisión pendiente del humano. Solo medí que el foco no cae en `<body>`.
- **Decisiones ya tomadas, sin tocar:** S-01, el aviso de más de siete controles mientras `apiClient` redirige, H-3 en los ganchos sin clave, S-04, S-05 y O-E3-1.

### No atacado y por qué
- «Unirme a la clase» entre el `onSettled` (ref libre) y el momento en que la navegación del `onSuccess` del `mutate` se pinta. En jsdom no se puede intercalar un evento en esa ventana de forma determinista. La ventana ya existía antes con `isPending` (se apaga al mismo tiempo) y no es nueva de CHORE-04.
- Ningún navegador: no hace falta; todo lo medido lo ve jsdom (S-06).

### Archivos nuevos (`*.ataque`)

| Archivo | Casos (`npx vitest list`, `grep -a -c`) | SHA-256 |
|---|---|---|
| `frontend/src/features/auth/guardas-ch4-r1.ataque.test.tsx` | 91 | `c377f3fc9c0422da78993b86e5ff42e99ba94db0aaeab5c8901788ddc892af74` |
| `frontend/src/features/clases/guardas-ch4-r1.ataque.test.tsx` | 32 | `209093daae27665f6233a6d1480ae8a81cac25ae5936ae45ba26ae421998d1d0` |
| `frontend/src/features/clases/ver-mas-y-orden-ch4-r1.ataque.test.tsx` | 14 | `0578ce719e2de54335bbd6296b050f27f4c145590b74d503acde8850b3a5c6a5` |
| `frontend/src/lib/guardas-ch4-r1.ataque.test.ts` | 6 | `93d910ec7deb4a5b81463709d665df663a94a44c6edbcb408386c2e942f85828` |

Total: 143. Los dos de `clases` reutilizan, copiado tal cual, el andamiaje de las pruebas del programador (el doble del servidor, el montaje con `rutas` y las `defaultOptions` de `app/providers.tsx`). Ninguno localiza por clases de estilo. Formateados solo con `npx prettier --write` sobre esos cuatro archivos.

### Comandos y su última línea
| Comando (desde `frontend/`) | Última línea |
|---|---|
| `npm run lint` | `> tsc -b` (exit 0) |
| `npx vitest run src/features/auth src/features/clases src/lib src/app src/components/layout` | `Tests  4523 passed (4523)` (`Test Files  204 passed (204)`) |
| `npx vitest list` de los 4 archivos nuevos, contado con `grep -a -c` | 91 · 32 · 14 · 6 = 143 |
| Mutaciones (`scratchpad/ch4r1/mutar.sh`) | las tablas de arriba; cada restauración idéntica a su respaldo (`cmp`) |
| Sonda con el `CampoContrasena` real, sin las seis guardas | `Tests  4 failed, 24 passed, 63 skipped (91)`; las 4 son de recuperar |

### V-01
- Hay 285 `*.ataque`: los 281 de la base más mis 4. Lista: `C:/Users/Carlos/AppData/Local/Temp/claude/cbc20defe2ff00dc/af34580f-db0f-4e17-b8f4-34eb4bf290b3/scratchpad/v01-ch4-r1.txt`, SHA-256 `686daf881a272ebdc1c97d576667419c96684f573ea5a5dfd417e3fa8cb506fb`.
- Contra la base (`f292fb31…`), el `diff` muestra solo la línea de C-1 (`74b07393…` → `151dbd75…`) y las 4 líneas nuevas. Ningún `*.ataque` existente cambió en esta ronda.

### Incidencias de proceso
- Un comando mío (un parche con `python -` y una alternativa con Node) dejó un proceso `python.exe` esperando entrada (PID 31584, creado por mí en esa llamada). Lo terminé con `Stop-Process`; la alternativa con Node aplicó el parche a mi archivo de ataque. No toqué ningún otro proceso.
- Sondas temporales: `src/features/auth/sonda-temporal-r1.ataque.test.tsx` (creada y borrada por mí) y un caso de diagnóstico añadido y retirado de mi `ver-mas-y-orden-ch4-r1.ataque.test.tsx`, restaurado desde su respaldo con `cmp`.
- La herramienta de escritura rechazó un archivo intermedio del reporte; la sección se agregó por partes con `cat >>`.
