# Reporte del Tester — CHORE-06 · foco y navegación del marco

Cada ronda del tester agrega su sección al final de este archivo, por partes (`cat >>`), sin reescribirlo.

## Ronda 0 — CHORE-06a (2026-11-12)

No es una ronda de ataque: aplica C-1 y C-2 de §D-R0, fija la base de V-01 y confirma el inventario de la lista cerrada. Plan aprobado: `plan.md`, 694 líneas, SHA-256 `c5fe10fc08a715361ad5181c841fcd760c96506919c1d2eb7fe9998f0dd21297` (comprobado al empezar). Rama `chore/chore-06-foco-y-navegacion`, `HEAD` = `47c3339`. El equipo estaba conectado a la corriente (`BatteryStatus` 2, 100 %); ninguna otra suite en curso (el único `node.exe` vivo era de otra aplicación).

### V-01 · la base

- Inventario de todos los `*.ataque.test.*` del repositorio (sin `node_modules`), antes de tocar nada: **285** archivos, **180** en `frontend/`, **105** en `backend/`, 0 en `shared/` (coincide con el cierre de CHORE-04). `git ls-files -- '*.ataque.test.*' | wc -l` también da 285.
- Lista con el SHA-256 de cada archivo: `C:/Users/Carlos/AppData/Local/Temp/claude/cbc20defe2ff00dc/af34580f-db0f-4e17-b8f4-34eb4bf290b3/scratchpad/v01-ch6-base.txt`, 285 líneas, SHA-256 de la lista `686daf881a272ebdc1c97d576667419c96684f573ea5a5dfd417e3fa8cb506fb`. Comando: `find frontend backend shared -path '*/node_modules' -prune -o -type f -name '*.ataque.test.*' -print | LC_ALL=C sort | xargs sha256sum`.
- Antes del cambio, `git diff --name-only 47c3339 -- '*.ataque.test.*'` salió vacío, y no había `*.ataque` sin seguimiento.
- Después de C-1 y C-2, el mismo inventario (`scratchpad/v01-ch6-tras-r0.txt`, 285 líneas) difiere de la base solo en esas dos líneas, y `git diff --name-only 47c3339 -- '*.ataque.test.*'` da solo esos dos archivos (`git diff --stat`: 2 archivos, 8 inserciones, 3 borrados).

| Archivo | SHA-256 antes (base) | SHA-256 después de la ronda 0 |
|---|---|---|
| `frontend/src/features/clases/guardas-ch4-r1.ataque.test.tsx` | `209093daae27665f6233a6d1480ae8a81cac25ae5936ae45ba26ae421998d1d0` | `b29a7828350003db4b869899b4235689e3d01cb1a29958a11563e8bc048509d2` |
| `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` | `932e76314e0447da1790c3c86ca48545eea834feaf6f706c4d405b7ea62be872` | `236cba622efb2ff3571bae5bde441d0a075bc0851d3ececaee30981607a0d913` |

### C-1 y C-2 (el diff)

Las líneas del plan coincidían con el código (`:385`; `:416-443`, título en `:417`, aserción en `:441`). Nada más de esos archivos cambió. Prettier partió la línea de C-1 en dos sin cambiar la expresión.

```diff
--- a/frontend/src/features/clases/guardas-ch4-r1.ataque.test.tsx
+++ b/frontend/src/features/clases/guardas-ch4-r1.ataque.test.tsx
@@ -382,7 +382,8 @@ interface Control {
-const avisoDeClases = (error: ApiError) => mensajeDeErrorClases(error)
+const avisoDeClases = (error: ApiError) =>
+  REDIRIGEN.includes(error.codigo) ? null : mensajeDeErrorClases(error)
 const REDIRIGEN = ["ACCESO_RESTRINGIDO", "CAMBIO_DE_CONTRASENA_REQUERIDO", "NO_AUTENTICADO"]
--- a/frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx
+++ b/frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx
@@ -414,7 +414,7 @@
-  it("redirige con apiClient, avisa una sola vez y no marca el campo", async () => {
+  it("redirige con apiClient, no avisa y no marca el campo", async () => {
@@ -438,7 +438,11 @@
     await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/acceso-restringido"))
-    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
+    // CHORE-06a (C-2): apiClient ya redirige; el formulario no avisa. Un momento más tras irA.
+    await act(async () => {
+      await new Promise((resolver) => setTimeout(resolver, 50))
+    })
+    expect(aviso.error).not.toHaveBeenCalled()
     expect(navegacion.irA).toHaveBeenCalledTimes(1)
     expect(campo).not.toHaveAttribute("aria-invalid", "true")
```

- C-1: `REDIRIGEN` se declara en la línea siguiente; se lee al llamar, no al declarar (como en `guardas-ch4.test.tsx:388-389`, de la lista cerrada). Afecta a los siete controles que usan `avisoDeClases` en ATQ-CH4-10 (la fila de `403 CAMBIO_DE_CONTRASENA_REQUERIDO`); «Sí, regenerar» ya tenía su propia expresión. ATQ-CH4-11 a 16 no leen `avisoDeError`.
- C-2: el «momento más» usa la misma forma que el resto del archivo (`act` con un `setTimeout` de 50 ms, como en `:205-207`); `:440`, `:442`, `:443` y `:444` no cambian.

### Confirmación del inventario (lista cerrada de 06a, con la Enmienda 1)

`rg` no está instalado en el Git Bash de este equipo: corrí cada búsqueda con su equivalente (la herramienta de búsqueda o `grep -rnE … --include="*.test.*"`), desde `frontend/`, sobre `47c3339` más C-1 y C-2.

| Búsqueda del plan | Resultado |
|---|---|
| 1. `rg "EditarTareaDeLaClase\|EditarRecursoDeLaClase\|EntregaDelAlumno\|MaestrosDeLaClase\|AlumnosDeLaClase" src -g "*.test.*"` | Ninguna coincidencia. Coincide con el plan. |
| 2. `rg "vi.mock\(.*(clases\|tareas\|calificaciones)/hooks" src -g "*.test.*"` | Ninguna coincidencia con esa expresión (los dos `inicio-sin-datos*` doblan los ganchos con otra forma de ruta); ninguna afecta a 06a. |
| 3. `rg -l "ACCESO_RESTRINGIDO\|NO_AUTENTICADO\|CAMBIO_DE_CONTRASENA_REQUERIDO" src/features/clases -g "*.test.*"` | 11 archivos; los `*.ataque` son 6: `alumnos-b-r1` (C-2), `guardas-ch4-r1` (C-1), `clases-admin-01c-r3:516-540` (ADM-T3C05 ya afirma «no hay aviso»), `dudas-03e-r3:661` (cerrar sesión, no cuenta avisos), `recursos-03d-r1:731-791` (CL3-3R1-12 ya afirma «ningún aviso») y **`alumnos-b-r3:48`**, que el plan da como vigilada sin cambio y no lo es (C-11, abajo). |
| 4. (Enmienda 1) La misma búsqueda en `src/features/tareas` | 9 archivos; los `*.ataque` son 5, todos del sentido del plan: `entregas-01d-r1:325` (401 con refresco que sí renueva, sin avisos), `entregas-01d-r2:661-674` (no cuenta avisos), `entregas-01d-r3:572-612` («Ver más comentarios» ya sin aviso; entregar y comentar «como mucho un aviso», que vale con cero) y `:682-692` (estática de `apiClient`), `entregas-01e-r1:379-391` y `entregas-01e-r2:254` y `:472-487` (consultas y descargas que ya callan). |
| 5. (Enmienda 1) `rg "avisoDeFalloAlSubir\|errorRechazado\|alFallar" src -g "*.test.*"` | Solo pruebas de la función pura `avisoDeFalloAlSubir` (que no cambia), de `alFallarLaDescarga` y una ayuda `alFallarLaRecarga` de `clase-archivada-01d2-vista.test.tsx`. Ninguna pide el aviso de una subida o de `alFallar` ante un código que redirige. Coincide con el plan. |
| Ampliación propia: los tres códigos o `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` en todo `*.ataque.test.*` fuera de `features/clases` y `features/tareas`, y `401` suelto en los `*.ataque` de esos dos módulos | 32 archivos fuera (auth, admin, `app/`, `lib/`, `services/`, calificaciones): ninguno afirma un `toast.error` ante un código que redirige en un sitio de §D-3. El `401` suelto no suma archivos a los de las filas 3 y 4. |
| Ampliación propia, mecanismo M-1: todo `*.ataque` que navega (`router.navigate(`, `navegar(router`, `rerender(`) o que pulsa un enlace entre dos ids de la misma ruta | 46 archivos revisados. Los que saltan entre dos ids con estado local en una vista de §D-1 ya están en las vigiladas del plan (ATQ-CH4-12 a 16, `foco-02c-r3/r4/r5`, `heredados-02d-r1`); los demás no dependen de que algo sobreviva (`clase-archivada-01d1-r1` ADM-T1D104, `clase-archivada-01d1-r3` ADM-T3D104 y 105, `indicador-03c1-r1/r2`, `ver-mas-y-orden-ch4-r1` ATQ-CH4-24 y 25), van entre dos entradas del mismo id (`calificaciones/secciones-01d-r4` CAL-T-255 y 256: con `key={claseId}` no se monta nada de nuevo) o cambian de ruta, no de id. La excepción es `tareas/avisos-01c-r2` CAL-T-108 (C-12, abajo). |

**C-11 (nueva, del mismo sentido que C-1 y C-2; mecanismo M-2) · `features/clases/alumnos-b-r3.ataque.test.tsx:251-267`**, «ataque CLASES-b r3: sesión que expira a mitad de quitar» › "el DELETE responde 401 y el refresco falla: apiClient manda al login, avisa y el foco sigue en la fila". Su `:264` es `await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))`: afirma el aviso de `useQuitarAlumno` (`features/clases/hooks.ts:836-839`, `toast.error(mensajeDeErrorClases(error))` sin guarda) ante `401 NO_AUTENTICADO` con el refresco rechazado. Con el remedio de §D-3 (la guarda antes del `toast.error` de quitar alumno, `hooks.ts:838`) ese `waitFor` se agota y el caso cae. El plan la nombra vigilada "sin cambio" por su `:48` (la ayuda `noAutenticado`), pero la aserción está en `:264`. Hoy está en verde (no la corrí: el encargo pide correr solo los dos archivos de C-1 y C-2; la conclusión sale de leer el gancho). Redacción propuesta, como C-2:
- el título de `:252` pasa de "…apiClient manda al login, avisa y el foco sigue en la fila" a "…apiClient manda al login, no avisa y el foco sigue en la fila";
- `:264` pasa a esperar un momento más tras `irA` (`await esperar(50)`, la ayuda del archivo en `:158-161`) y afirmar `expect(aviso.error).not.toHaveBeenCalled()`;
- `:263`, `:265` y `:266` no cambian: sigue protegiendo una sola redirección a `/login` y el foco, que no cae en `<body>` y sigue en un elemento conectado.

Es del inventario de 06a (no de 06b): si el manager la acepta, el tester la aplica antes de que arranque el programador; sin ella, el programador caería en PA-2 al aplicar §D-3. Suma un archivo a 06a (33 en lugar de 32).

**C-12 (condicional; mecanismo M-1, Forma C) · `features/tareas/avisos-01c-r2.ataque.test.tsx:637-652`**, CAL-T-108: "con el fallo de la tarea callado por la entrega del alumno A, pasar al alumno B (la ruta no tiene key) da un solo aviso de la tarea y el panel de B". Su premisa es la que 06a cambia: la Forma C monta de nuevo el contenido de `EntregaDelAlumno` con la `key` `${tareaId}:${alumnoId}` y el plan lleva a ese contenido `useAvisoDeRecargaFallida` (§D-1, Forma C). Al desmontarse el contenido de A con el fallo callado, la limpieza del gancho (`features/tareas/hooks.ts:277-286`, M-07) marca ese fallo como atendido en `ultimoFalloAvisado`, así que en B ese mismo fallo ya no se avisa. El resultado depende de cómo se escriba la Forma C:
- si el contenido vuelve a observar `useTarea` (lo que dice R-07, "observa la consulta dos veces"), la observación nueva pide la tarea (el cliente de la prueba tiene `staleTime` 0), el doble vuelve a responder `500` con otra marca, y en B sale un aviso: el caso **seguiría en verde**;
- si el contenido recibe la consulta del marco por props, no se pide nada y en B no sale ningún aviso: el caso **cae** (`avisos()` da `[]` en lugar de `[AVISO_TAREA]`).

Propuesta: no cambiarla en la ronda 0. Solo si cae en la corrida del programador (PA-2), el manager decide entre (a) mantener la aserción (en B se ve la última versión de la tarea con un fallo sin avisar: la persona no se entera de que la tarea no se pudo actualizar, que es lo que protege CAL-T-108) y que lo resuelva el programador, o (b) aceptar cero avisos como la regla M-07 al salir de la vista, con el título "…pasar al alumno B (el contenido se monta de nuevo por su `key`, CHORE-06a) no repite el aviso del fallo callado y muestra el panel de B" y la aserción `expect(avisos()).toEqual([])`. Recomiendo (a). En los dos casos, "(la ruta no tiene key)" del título deja de ser cierto con 06a.

**Vigiladas que el plan no nombra (no cambian de sentido; las anoto para que el resumen del programador las cuide):** las reglas estáticas que copian líneas literales de los archivos de la Forma C caen si al mover el código cambia su texto o su sangría: `lib/guardas-ch4-r1.ataque.test.ts` ATQ-CH4-32 (el inventario de `mutate` fuera de un manejador a dos espacios: hoy incluye `editar-tarea-view.tsx` "en «const handleGuardar = async (datos: CrearTarea, version: number) => {»", que vive dentro de `contenido()`) y ATQ-CH4-34 (las líneas exactas de los `.refetch(` de `editar-recurso-view.tsx`, `editar-tarea-view.tsx` y `entrega-de-alumno-view.tsx`); `tareas/estatico-01c-r1.ataque.test.ts` CAL-T-95 (sin texto suelto en JSX en `entrega-de-alumno-view.tsx`); `tareas/entregas-01d-r3.ataque.test.tsx:682-713` y `entregas-01e-r1.ataque.test.tsx:720-760` (sin `disabled`, `?? []`, `fetch(` ni importaciones de otro módulo en `hooks.ts`, `formulario-de-entrega.tsx`, `detalle-tarea-view.tsx` y `entrega-de-alumno-view.tsx`).

### Estado esperado tras C-1 y C-2 (sin el cambio de producción)

Comando, desde `frontend/`: `npx vitest run src/features/clases/guardas-ch4-r1.ataque.test.tsx src/features/clases/alumnos-b-r1.ataque.test.tsx` (salida completa en `scratchpad/r0-ch6a-vitest.txt`). Última línea con el resultado: `Tests  8 failed | 34 passed (42)` (`Test Files  2 failed (2)`; duración 21.62 s).

Fallan 8 casos, todos por lo que C-1 y C-2 cambian y por la razón correcta: hoy el gancho o el formulario sí avisan, con el genérico de clases, ante un código con que `apiClient` redirige.

| Archivo | Caso | Mensaje |
|---|---|---|
| `alumnos-b-r1.ataque.test.tsx` | "ataque CLASES-b r1: N-04 con ACCESO_RESTRINGIDO al unirse › redirige con apiClient, no avisa y no marca el campo" | `expected "vi.fn()" to not be called at all, but actually been called 1 times`; la llamada: `"Algo salió mal. Inténtalo de nuevo."` (`:445`, después de `irA("/acceso-restringido")` y 50 ms) |
| `guardas-ch4-r1.ataque.test.tsx` | ATQ-CH4-10 con `403 CAMBIO_DE_CONTRASENA_REQUERIDO` en «Unirme a la clase», «Agregar a la clase», «Asignar a la clase», «Sí, quitar» de un maestro, «Sí, borrar comentario», «Sí, borrar» de una publicación y «Sí, quitar» de un alumno (7) | `«<control>»: expected "vi.fn()" to not be called at all, but actually been called 1 times`; la llamada: `"Algo salió mal. Inténtalo de nuevo."` (`:583`, la rama `esperado === null`) |

Los otros 34 siguen en verde: en `guardas-ch4-r1` (32 casos, 7 en rojo), ATQ-CH4-10 con `503` y `409` en los ocho controles, ATQ-CH4-10 de «Sí, regenerar» con los tres errores, ATQ-CH4-11 a 16 y el resto del archivo; en `alumnos-b-r1` (10 casos, 1 en rojo), los otros nueve. En las siete filas de ATQ-CH4-10 la prueba se detiene en la primera aserción; la parte de la ref (dos clics, una sola petición más y, al final, un solo aviso: el del `500` de la segunda petición) se ejecutará cuando el gancho calle.

No apareció ningún rojo por otra razón: no hay hallazgo del plan.

### Comandos y su última línea

| Comando (desde `frontend/`) | Última línea |
|---|---|
| `npx vitest run src/features/clases/guardas-ch4-r1.ataque.test.tsx src/features/clases/alumnos-b-r1.ataque.test.tsx` | `Duration  21.62s (transform 2.48s, setup 1.94s, import 4.48s, tests 18.87s, environment 6.85s)`; resultado `Tests  8 failed | 34 passed (42)` (rojo esperado) |
| `npx prettier --check src/features/clases/guardas-ch4-r1.ataque.test.tsx src/features/clases/alumnos-b-r1.ataque.test.tsx` | `All matched files use Prettier code style!` (sin `--write`: no hizo falta formatear) |
| `npm run lint` | `> tsc -b` (salida 0: ESLint sin errores, `All matched files use Prettier code style!` y `tsc -b` sin errores; salida en `scratchpad/r0-ch6a-lint.txt`) |

### Para el orquestador y el manager

- C-1 y C-2 aplicadas como las redacta §D-R0. El programador arranca con ellas (paso 1 de "Pasos de implementación").
- **C-11 hace falta antes de que arranque el programador** (sin ella cae en PA-2 al aplicar §D-3 en `useQuitarAlumno`): la arbitra el manager y, si la acepta, la aplica el tester con la redacción de arriba.
- C-12 es condicional: solo si CAL-T-108 cae en la corrida del programador; la decisión entre (a) y (b) es del manager.

### C-11 (ronda 0 de 06a, tras el arbitraje del manager)

El manager aprobó C-11 con la redacción de arriba (`revision.md`, "Arbitraje de la ronda 0 — CHORE-06a (2026-11-12)"). C-12 no se toca todavía. C-13 es de la ronda 0 de 06b. `esperar` ya existía en el archivo (`:158-161`, `act` con un `setTimeout`), así que no hizo falta otra ayuda ni ninguna importación.

`frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx`: SHA-256 antes `371518e4309f14201a92d29f9436a97a19801b506d45114964fbcfe3f5cd4183` (el mismo de la base de V-01); después `d938aa806dfb27a6f566ab6dcd8c3f1c358c83383df56e7606f65a9b3ecf60cc`. Solo cambian el título de `:252` y `:264`; `:263`, `:265` y `:266` (ahora `:263`, `:267` y `:268`) no cambian.

```diff
@@ -249,7 +249,7 @@ describe("ataque CLASES-b r3: el foco del roster no se mueve de más", { timeout
-  it("el DELETE responde 401 y el refresco falla: apiClient manda al login, avisa y el foco sigue en la fila", async () => {
+  it("el DELETE responde 401 y el refresco falla: apiClient manda al login, no avisa y el foco sigue en la fila", async () => {
@@ -261,7 +261,9 @@ describe("ataque CLASES-b r3: sesión que expira a mitad de quitar", { timeout:
     await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"))
-    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
+    // CHORE-06a (C-11): apiClient ya redirige; quitar no avisa. Un momento más tras irA.
+    await esperar(50)
+    expect(aviso.error).not.toHaveBeenCalled()
     expect(focoEn(), "el foco quedó en <body>").not.toBe(document.body)
     expect(focoEn()?.isConnected).toBe(true)
```

**Corrida** (desde `frontend/`): `npx vitest run src/features/clases/alumnos-b-r3.ataque.test.tsx` (salida en `scratchpad/r0-ch6a-c11-vitest.txt`). Resultado `Tests  1 failed` y `9 passed (10)`; última línea `Duration  6.21s (transform 451ms, setup 301ms, import 1.28s, tests 3.12s, environment 1.33s)`. El caso en rojo es el de C-11, "ataque CLASES-b r3: sesión que expira a mitad de quitar › el DELETE responde 401 y el refresco falla: apiClient manda al login, no avisa y el foco sigue en la fila", con `expected "vi.fn()" to not be called at all, but actually been called 1 times` en `:266`; la llamada es `"Algo salió mal. Inténtalo de nuevo."`. Es la razón correcta: hoy `useQuitarAlumno` (`features/clases/hooks.ts:838`) avisa ante `401 NO_AUTENTICADO` sin refresco. Los otros nueve casos del archivo siguen en verde.

**Lint** (desde `frontend/`): `npm run lint`, salida 0; última línea `> tsc -b` (ESLint sin errores, Prettier `All matched files use Prettier code style!`, `tsc -b` sin errores; salida en `scratchpad/r0-ch6a-c11-lint.txt`).

**V-01 tras C-1, C-2 y C-11:** 285 `*.ataque.test.*` (180 en `frontend/` y 105 en `backend/`). Lista nueva: `C:/Users/Carlos/AppData/Local/Temp/claude/cbc20defe2ff00dc/af34580f-db0f-4e17-b8f4-34eb4bf290b3/scratchpad/v01-ch6a-r0.txt`, 285 líneas, SHA-256 `c72bd806ad5cf7485ad02f4ade6cc5c2ff37f32daa3970d35dba1a4084d7e139`. Contra la base (`v01-ch6-base.txt`, `686daf88…`) cambian tres archivos, y `git diff --name-only 47c3339 -- '*.ataque.test.*'` da esos mismos tres:

| Archivo (`frontend/src/features/clases/`) | SHA-256 en `v01-ch6a-r0.txt` |
|---|---|
| `alumnos-b-r1.ataque.test.tsx` (C-2) | `236cba622efb2ff3571bae5bde441d0a075bc0851d3ececaee30981607a0d913` |
| `alumnos-b-r3.ataque.test.tsx` (C-11) | `d938aa806dfb27a6f566ab6dcd8c3f1c358c83383df56e7606f65a9b3ecf60cc` |
| `guardas-ch4-r1.ataque.test.tsx` (C-1) | `b29a7828350003db4b869899b4235689e3d01cb1a29958a11563e8bc048509d2` |

Con C-11, 06a cuenta 33 archivos (los 32 de §D-0 y este).

## Ronda 1 — CHORE-06a (2026-11-12)

Veredicto: **ROTO** (un hallazgo, media).
Verificación propia (desde `frontend/`): lint `> tsc -b`, salida 0 · suite de 06a `Tests  1 failed | 5347 passed (5348)` (el rojo es ATQ-CH6-01, T-01).

Leí `resumen-programador.md` (361 líneas, `ae4325a5…`), `revision.md` (593 líneas, `f590de1d…`: "Arbitraje de PA-1" y "Verificación del resumen del programador — CHORE-06a", con sus siete puntos), el plan (`c5fe10fc…`, sin cambios: "Puntos de ataque", §D-1, §D-3 y §D-7) y el código de los 25 archivos de producción de 06a, más `entregas-view.tsx`, `services/apiClient.ts`, `components/clase/hooks.ts` y los *render props* de `ConClaseDeLaRuta` de todo `src/`. El equipo estaba con corriente (`BatteryStatus` 2). La otra copia de trabajo no se usa: una suite a la vez.

Archivo nuevo: `frontend/src/app/estado-por-id-ch6a-r1.ataque.test.tsx` (45 casos, ids `ATQ-CH6-01` a `ATQ-CH6-15`). El arnés (dobles, `montar`, `navegar`, `retenida`) es el de `app/estado-por-id-ch6.test.tsx`, con el router real (`rutas`), las `defaultOptions` de `app/providers.tsx`, el salto del historial con `router.navigate(-1)`/`(1)` y un doble de `irA` que se cuenta. Sin selectores de estilo; toda precondición que falta hace fallar el caso con su mensaje.

## Hallazgos

### T-01 — En las entregas de una tarea, «Ver más alumnos» de T2 no responde mientras la página siguiente de T1 sigue en vuelo
Severidad: media
Prueba: `frontend/src/app/estado-por-id-ch6a-r1.ataque.test.tsx` › «ATQ-CH6-01: con «Ver más alumnos» de T1 en vuelo, en las entregas de T2 el botón no está en espera y un clic pide la página siguiente de T2».
Reproducción: como maestro, abrir las entregas de T2 (más de 20 alumnos) y después las de T1; pulsar «Ver más alumnos» en T1 y, antes de que responda, volver con el historial a las entregas de T2 (en caché). En T2 el botón se ve disponible (sin `aria-busy`, porque `enEspera` lee `lista.isFetching`, que ya es la consulta de T2), pero un clic no pide nada: `handleVerMas` (`features/tareas/entregas-view.tsx:99-101`) vuelve por `pidiendoMasRef.current`, que sigue en `true` desde el clic de T1 y solo se suelta en el `finally` de la página de T1. Hasta que T1 responde (o falla), el botón de T2 es un clic muerto, sin espera visible ni aviso.
Esperado / Obtenido: un clic en «Ver más alumnos» de T2 pide la página siguiente de T2 (una petición con cursor a `…/tareas/T2/entregas`) / cero peticiones (`expected +0 to be 1`).
Requisito o regla violada: §D-1, "Resultado que se fija": "ningún control del id nuevo espera por una petición del anterior" (aquí espera sin decirlo); `CLAUDE.md`, Componentes: un control que no dispara su acción debe estar en `enEspera` (en vuelo) o `disabled` (no disponible), nunca aparentar estar disponible. Es el mecanismo M-1 en un hermano que el inventario del plan no vio (buscó `useState`; `EntregasDeLaTarea` guarda refs y no lleva `key`).
Lo que **no** se confirmó de la lectura del programador (punto 1 del manager):
- "El aviso de un fallo de T1 sale en T2": **falso**. ATQ-CH6-02 (503 de la página de T1 estando en T2) pasa: ningún aviso, la lista de T2 y su botón siguen. El `fetchNextPage` de T1 resuelve con el resultado del observador, que ya es la consulta de T2, así que `resultado.isError` es falso y `handleVerMas` no avisa. Efecto lateral (observación, no hallazgo): ese fallo de T1 no se avisa nunca; si la persona vuelve a T1, ve sus 20 alumnos y «Ver más alumnos», sin mensaje.
- "El foco puede ir al `h2` de T2": **no ocurre** en lo atacado. ATQ-CH6-03 pasa: con el foco en «Ver más alumnos» de T2 cuando llega la página de T1, el foco no se mueve y la lista de T2 no cambia. El efecto de `:80-97` consume `idsAntesDeVerMasRef` en el primer render con las filas de T2, pero solo mueve el foco si se perdió, y el botón es el mismo nodo (la vista no lleva `key`).
- Remedio, por el mecanismo (no lo aplico): la Forma C de §D-1 para `EntregasDeLaTarea` (marco con `raizRef` y su `useFocoAlPerderseElControl`; contenido con `key={tareaId}`). Es un hermano no inventariado: va a arbitraje (punto 1 del manager), no a corrección directa.

## Atacado sin hallazgos

Todos en `frontend/src/app/estado-por-id-ch6a-r1.ataque.test.tsx`, en verde.

- **Punto 1 (EntregasView), lo que no se confirmó:** ATQ-CH6-02 y ATQ-CH6-03 (arriba, en T-01).
- **Punto 2, el salto con la escritura de A en vuelo y una respuesta de error** (ATQ-CH6-04, `it.each` de 6 escrituras por 5 respuestas = 30 casos). Escrituras: crear una tarea (A → B), editar una tarea (T1 → T2), editar un recurso (R1 → R2), calificar (P1 → P2), publicar un anuncio (A → B) y quitar a un alumno (A → B). Respuestas de A, que llegan estando en B: `403 ACCESO_RESTRINGIDO`, `401` con el refresco rechazado, `503`, un error de red y `403 SIN_ACCESO_A_LA_CLASE` (un código que **no** redirige: R-03). En los 30: con un código que redirige, cero `toast.error` e `irA` una vez con su destino (`/acceso-restringido` o `/login`); con los otros tres, un solo `toast.error` con texto y ningún `irA`; en B la ruta no cambia, el campo escrito en B es el mismo nodo, conserva lo escrito y tiene el foco, nada queda en `aria-busy` y no sale ningún aviso de éxito.
- **Punto 3, la regla de PA-1:**
  - ATQ-CH6-05: crear una tarea, salir a Dudas y volver a «Nueva tarea» de la misma clase antes de la respuesta: un solo aviso de éxito, la ruta no cambia y nada espera.
  - ATQ-CH6-06: lo mismo al editar una tarea.
  - ATQ-CH6-07 (2 casos): dos «Publicar tarea» seguidos (A, salto a B, B) que responden en los dos órdenes: dos avisos de éxito y solo B navega, al detalle de su tarea.
  - ATQ-CH6-08: el `POST` de A en vuelo, salto a B, la clase A pasa a archivada y se vuelve a A: un aviso de éxito y la ruta no cambia.
- **Punto 4, la Forma C:**
  - con `StrictMode`: ATQ-CH6-09 (edición de tarea: lo escrito en T1 no pasa a T2, el foco va a la raíz y guardar T2 montada sí navega al detalle de T2, así que `useMontado` sobrevive al doble montaje), ATQ-CH6-10 (edición de recurso: guardar R2 vuelve a Recursos) y ATQ-CH6-11 (la entrega de un alumno: los puntos de P1 no pasan a P2, el foco va a la raíz y calificar P2 manda solo su `PUT`);
  - con la clase que pasa a archivada en medio: ATQ-CH6-12 (el `PUT` de T1 en vuelo, salto a T2, se archiva: un aviso, no navega; al restaurarse, T2 nace con su título y no se lleva el foco, que se queda en el título de la clase) y ATQ-CH6-13 (lo mismo con la calificación de P1 y el panel de P2, que nace vacío).
- **Punto 5, R-03 al revés** (ATQ-CH6-14): un `401` sin token enviado no refresca y la guarda calla por el código. Solo se llega ahí con la sesión ya perdida: el primer «Sí, quitar» con `401` y el refresco rechazado limpia el token y llama a `irA("/login")` una vez; el segundo, ya sin token, no refresca, no avisa y no vuelve a redirigir. En `apiClient.ts` el token solo se limpia en `pedirRefresco` fallido (seguido de `perderSesion`, que redirige), en `perderSesion` y en `logout` (que navega a `/login`), así que en una vista de la clase no queda mudo un `401` sin que la redirección ya haya salido. Un código que no redirige (`403 SIN_ACCESO_A_LA_CLASE`) sigue avisando en las seis escrituras (ATQ-CH6-04).
- **Punto 6, `useAvisoDeRecargaFallida` de tareas sin la consulta en caché** (`features/tareas/hooks.ts:296-310`): por lectura, no se alcanza. Sus cinco llamadores (detalle, edición, entregas, entrega de un alumno y, por la Forma C, el contenido de la entrega) le pasan como `fallo` el resultado de `useTarea(claseId, tareaId)` con los mismos ids, así que mientras `activo` es verdadero la consulta está observada y en caché; ningún código de `src/` hace `removeQueries` ni `resetQueries` de `claveTarea` (los de `features/clases/hooks.ts:408-1903` son de otras claves); y en la única vista sin `key` (`EntregasDeLaTarea`), al cambiar de tarea `activo` lee la consulta nueva, que también está observada. Sin prueba: no hay camino que la ejecute.
- **Punto 7, *render props* de varias líneas** (ATQ-CH6-15): de Personas de A (dos maestros) a la de B (uno) por el historial, en B se lee solo su maestro, sin nada de A ni botones de quitar. `MaestrosDeLaClaseEnLectura` no guarda estado local: solo lee `useClase(claseId)`, y `ListaMaestrosDeClase` va con `confirmar={false}` y `puedeQuitar={false}`. Revisé todos los *render props* de `ConClaseDeLaRuta` de `src/` (22): los de varias líneas son `personas-view.tsx` (admin y maestro: componen vistas que ya llevan `key` o no guardan estado), `editar-recurso-view.tsx`, `detalle-tarea-view.tsx`, `editar-tarea-view.tsx` y `entrega-de-alumno-view.tsx` (con su `key` en el contenido o en el bloque de datos) y `entregas-view.tsx` (T-01). Los de una línea sin `key` (`clase-layout`, `clase-anterior-view`, `muro-view`, `dudas-view`, `recursos-view`, `trabajo-view`) son los que el plan deja sin `key` a propósito: `clase-layout` (DH-01 a), `clase-anterior-view` (lleva `<Outlet key={claseId} />` dentro) y las cuatro listas de la Forma B, que llevan la `key` en su formulario (o `creandoEn`).
- **La `key` única por todos los ids de la ruta** (lección 3 de CHORE-04): las rutas con dos ids son `tareas/:tareaId/editar`, `tareas/:tareaId/entregas`, `tareas/:tareaId/entregas/:alumnoId` y `recursos/:recursoId/editar`, bajo `:claseId` (`app/router.tsx:84-202`). La entrega de un alumno lleva la compuesta; la tarea y el recurso son UUID de una sola fila. Solo `entregas` va sin `key` (T-01).
- **Estado que sobrevive al salto en refs y cachés locales:** busqué `useRef` y guardas de «Ver más» en las vistas sin `key` de la clase y de la tarea (`muro-view`, `dudas-view`, `recursos-view`, `trabajo-view`, `seccion-de-recursos`, `seccion-de-tema`, `tabla-alumnos`, `gradebook-view`, `mis-calificaciones-view`, `hilo-privado`). Fuera de `EntregasDeLaTarea`, las guardas con ref (`pidiendoRef`, `pidiendoMasDeRef`, `pidiendoMasRef` del hilo, `quitandoRef`, `borrandoRef`) viven en componentes que ya se montan de nuevo por su `key` (la de la vista, la del bloque de la tarea, la de la fila); las demás refs son de foco y están hechas para el cambio de clase (`clasePrevia`, O-14). La caché de módulo `ultimoFalloAvisado` va por consulta, no por instancia.

## Observaciones (sin prueba roja)
- **O-01 (punto 1):** el fallo de la página siguiente de T1 que llega estando en T2 no se avisa nunca (ATQ-CH6-02). Es lo que hacen las listas con `key` cuando su vista ya no está; lo anoto porque la lectura del resumen decía lo contrario.
- **O-02 (S-03, decisión tomada):** con «Publicar tarea» en vuelo, salir y volver a «Nueva tarea» de la misma clase deja el botón sin espera; un segundo envío crearía otra tarea. Es la conducta que S-03 declara (pedir otra vez exige una acción nueva; el servidor no lo impide en el caso de crear).
- **O-03 (DH-04):** la descarga de `components/adjuntos` sin `alFallarLaDescarga` sigue avisando ante un código que redirige. Decisión tomada, con destino; no la ataqué.
- **O-04:** la mutación MT6 (la `key` de la entrega reducida a `key={alumnoId}`) no hace caer ninguno de mis casos, porque mis saltos entre entregas son de otro alumno en la misma tarea. La vigilan CH6-A06 "mismo alumno, otra tarea" y CH6-A30 (c) del programador (MGR2 del manager).

## Mis mutaciones (regla del humano, `AGENTS.md` › Pruebas)

Cada mutación es un cambio real en el archivo de producción, con `scratchpad/r1/mut.sh`. El guion:
1. copia el archivo a `scratchpad/r1/bak/`;
2. aplica la mutación con `sed` y comprueba que el archivo cambió (el `diff` queda en `scratchpad/r1/mut/<id>.diff`);
3. corre `npx vitest run src/app/estado-por-id-ch6a-r1.ataque.test.tsx -t "<patrón>"` (salida en `scratchpad/r1/mut/<id>.txt`);
4. restaura copiando la copia, nunca con `git`, y lo confirma con `cmp`.

Antes de empezar guardé el SHA-256 de los 29 archivos de `features/` tocados por 06a (`scratchpad/r1/prod-antes.sha`); al terminar, `sha256sum -c` dio 29 de 29 `OK`.

| Id | Se quita | Cae (de los seleccionados) |
|---|---|---|
| MT1 | `if (errorQueRedirigeElCliente(error)) return` de `useCrearTarea` (`features/tareas/hooks.ts:190`) | ATQ-CH6-04 «crear una tarea» con `403 ACCESO_RESTRINGIDO` y con `401` (`Tests  2 failed \| 3 passed`; los tres que avisan siguen verdes) |
| MT2 | `key={claseId}` de `CrearTareaDeLaClase` | los 5 de ATQ-CH6-04 «crear una tarea» y los 2 de ATQ-CH6-07 (`7 failed \| 1 passed`; ATQ-CH6-08 sigue verde: lo cubre la guarda de montaje) |
| MT3 | `!montado.current \|\|` de `handleGuardar` en crear tarea | ATQ-CH6-05, los 2 de ATQ-CH6-07 y ATQ-CH6-08 (`4 failed`) |
| MT4 | `!montado.current \|\|` de `handleGuardar` en editar tarea | ATQ-CH6-06 y ATQ-CH6-12 (`2 failed \| 1 passed`; ATQ-CH6-09 no vigila esa guarda: prueba que, montada, sí navega) |
| MT5 | `key={tareaId}` de `EdicionDeLaTarea` | los 5 de ATQ-CH6-04 «editar una tarea», ATQ-CH6-09 y ATQ-CH6-12 (`7 failed`) |
| MT6 | la parte de `tareaId` de la `key` de `EntregaDeUnAlumno` (queda `key={alumnoId}`) | ninguno (`7 passed`): mis saltos entre entregas son de otro alumno en la misma tarea. Lo vigilan CH6-A06 y CH6-A30 (c) (O-04) |
| MT7 | la `key` entera de `EntregaDeUnAlumno` | los 5 de ATQ-CH6-04 «calificar» y ATQ-CH6-11 (`6 failed \| 1 passed`; ATQ-CH6-13 sigue verde: al archivar no hay panel) |
| MT8 | la guarda de `useQuitarAlumno` (`features/clases/hooks.ts:841`) | ATQ-CH6-04 «quitar a un alumno» con `403` y con `401`, y ATQ-CH6-14 (`3 failed \| 3 passed`) |

T-01 no tiene mutación: es un remedio que falta, no uno que se quite.

## Archivos nuevos

| Archivo | SHA-256 | Casos |
|---|---|---|
| `frontend/src/app/estado-por-id-ch6a-r1.ataque.test.tsx` (1224 líneas) | `2d40aeea8e5477e309609e5096c41d3e61fe21c7c8ee1ad3f7c29a611c12e203` | 45 (los cuenta la corrida del archivo: `45 tests`): ATQ-CH6-01 a 03 (3), ATQ-CH6-04 (30), ATQ-CH6-05 y 06 (2), ATQ-CH6-07 (2), ATQ-CH6-08 a 15 (8). 44 en verde y 1 en rojo (ATQ-CH6-01, T-01) |

No toqué código de producción, pruebas normales ni otras `*.ataque`.

## Comandos (desde `frontend/`, uno a la vez)

| Comando | Última línea |
|---|---|
| `npx vitest run src/app/estado-por-id-ch6a-r1.ataque.test.tsx` (primera corrida) | `Tests  2 failed \| 43 passed (45)`: ATQ-CH6-01 (T-01) y ATQ-CH6-14, que caía por mi arnés (buscaba «Quitar» con la confirmación todavía abierta tras el error). La corregí para seguir desde donde quede la fila y la repetí con `-t "ATQ-CH6-14"`: `Tests  1 passed \| 44 skipped (45)` |
| `npm run lint` | `> tsc -b` (salida 0; ESLint y Prettier sin errores) |
| `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Duration  278.25s (transform 48.43s, setup 146.89s, import 346.39s, tests 1758.84s, environment 701.21s)`; resultado `Tests  1 failed \| 5347 passed (5348)` y `Test Files  1 failed \| 239 passed (240)`. El único rojo es ATQ-CH6-01 (T-01). Los 5303 de la corrida del manager siguen en verde, más mis 44 |

PA-07 no aplica: no hay corrida del backend.

## V-01

286 `*.ataque.test.*` (181 en `frontend/` y 105 en `backend/`). Lista: `C:/Users/Carlos/AppData/Local/Temp/claude/cbc20defe2ff00dc/af34580f-db0f-4e17-b8f4-34eb4bf290b3/scratchpad/v01-ch6a-r1.txt`, 286 líneas, SHA-256 `057c58060b0c4a4e38f75d5873f6febe60dd690ca8284cd1538a219576d48aa2`. Contra `v01-ch6a-r0.txt` (`c72bd806…`) solo se suma `frontend/src/app/estado-por-id-ch6a-r1.ataque.test.tsx` (`2d40aeea…`); las 285 de antes no cambian.

## No atacado y por qué
- Lo de 06b (la política de "pulsar la sección activa" y el «Ver más» que falla): todavía no está hecho.
- La descarga de `components/adjuntos`, los formularios de `auth` y `admin` (O-r1-6), la defensa del servidor (DH-09) y el foco al cambiar de ruta (DH-05): decisiones tomadas.
- La comprobación en un navegador real (historial del navegador, lector de pantalla): no verificada; la decide el humano al cerrar 06b (DH-07).

## Ronda 2 — CHORE-06a (2026-11-12)

Veredicto: **ROTO**: dos hallazgos, T-02 (baja) y T-03 (media). T-01 queda corregido.
Verificación propia (desde `frontend/`): lint `> tsc -b`, salida 0 · suite de 06a `Tests  5 failed | 5360 passed (5365)` (los 5 rojos son mis casos de T-02 y T-03).

Leí `resumen-programador.md` (455 líneas, `3d61d4be…`), "## CHORE-06a — Corrección ronda 1 (T-01)"; `revision.md` (738 líneas, `d9437ab2…`), "## Verificación de la corrección de la ronda 1", con sus seis puntos y el arbitraje de «Sin tema»; el diff de `entregas-view.tsx` (`05b23673…`); y el código de `recursos-view.tsx`, `trabajo-view.tsx`, `seccion-de-recursos.tsx`, `seccion-de-tema.tsx`, `useAvisoDeRecargaFallida` de clases (`features/clases/hooks.ts:1279-1296`) y `useFocoAlCargarMas` (`components/foco/hooks.ts`). El equipo estaba con corriente (`BatteryStatus` 2); una suite a la vez.

Archivo nuevo: `frontend/src/app/estado-por-id-ch6a-r2.ataque.test.tsx` (16 casos, `ATQ-CH6-16` a `ATQ-CH6-24`), con el arnés de la ronda 1 (router real, `defaultOptions` de `app/providers.tsx`, salto con `router.navigate(-1)`/`(1)`, el doble de `irA` contado). Sin selectores de estilo: las filas se ubican por su texto y por los atributos de datos de la vista (`data-recurso-id`, `data-elemento-id`, `data-entrega-de-alumno`).

## Hallazgos

### T-02 — «Sin tema» de Recursos y de Actividades: al cambiar de clase con el historial, el foco va a una fila de la otra clase, no al `h2` de la lista
Severidad: baja (decidida en el arbitraje de «Sin tema» de `revision.md`).
Pruebas (las tres en rojo con «Sin tema» y en verde con «un tema», que es el control):
- «ATQ-CH6-16 (Recursos, Sin tema): con el foco en «Borrar recurso» de una fila de A, saltar a B lleva el foco al h2 «Recursos del docente», no a una fila de B». Obtenido: el foco queda en «Borrar recurso» de una fila de B (`el foco quedó en «RecursoLuis Pérez · 1 oct 2026, 09:30Fil…»`, un `<button>`).
- «ATQ-CH6-17 (Actividades, Sin tema): con el foco en una fila de A, saltar a B lleva el foco al h2 «Actividades de aprendizaje», no a una fila de B». Obtenido: el foco queda en el `<li>` de una fila de B.
- «ATQ-CH6-18 (Recursos, Sin tema): con «Ver más de …» de A en vuelo y el foco en él, saltar a B (sin página siguiente) lleva el foco al h2 «Recursos del docente», no a una fila de B». Obtenido: el foco queda en el `<li>` de una fila de B (lo mueve `useFocoAlCargarMas` de la sección, que sobrevivió con la memoria del botón de A).
Reproducción: como maestro, abrir Recursos (o Actividades) de B y después de A, las dos con recursos (o actividades) sin tema. En A, enfocar un control de una fila de «Sin tema» (o «Ver más de Sin tema» con su página en vuelo) y volver a B con el historial. La sección «Sin tema» lleva `key={seccion.clave}` = `CLAVE_SIN_TEMA` (`recursos-view.tsx:138`, `trabajo-view.tsx:246`), la misma en las dos clases: sobrevive con su `idsPrevios` (o con la memoria de `useFocoAlCargarMas`), y su efecto, que corre antes que el `clasePrevia` del bloque o de la vista, lleva el foco a la vecina en B. Con un tema propio de cada clase, la sección se monta de nuevo y el foco va al `h2` (el control de los tres casos pasa).
Esperado / Obtenido: el `h2` de la lista («Recursos del docente» o «Actividades de aprendizaje») / un control o una fila de B.
Requisito o regla violada: §D-1, "en las listas de Avisos, Dudas, Actividades y Recursos, a su `h2` como hoy (O-14)"; mecanismo M-1 (una `key` que no es única por el id de la ruta). El foco nunca cae en `<body>` y no hay escritura ni petición en la clase equivocada. El remedio ya lo decidió el arbitraje (la `key` de la sección con la clase); no lo aplico.

### T-03 — Recursos y Actividades: tras una recarga fallida en una clase, al cambiar a otra clase sana sale el aviso «No pudimos actualizar…» de la primera
Severidad: media
Prueba: `frontend/src/app/estado-por-id-ch6a-r2.ataque.test.tsx` › «ATQ-CH6-19 ($nombre): la recarga de los temas de B falla y avisa una vez; al saltar a A (sana, en caché) y volver a B no sale ningún otro aviso de recarga», con `Recursos` y con `Actividades` (los dos en rojo).
Reproducción: como maestro, abrir Recursos (o Actividades) de A y de B. En B, una recarga de los temas falla (`503`, la de fondo de cualquier invalidación): sale «No pudimos actualizar Recursos. Mostramos la última versión que tenemos.» (o el de Actividades), una vez, que es lo correcto. Saltar a A con el historial: A está sana y en caché, y aun así sale otra vez el mismo aviso. Mi caso se detiene ahí; por el código, al volver a B saldría otra vez (el contador vuelve a cambiar).
Por qué: `useAvisoDeRecargaFallida` de clases (`features/clases/hooks.ts:1279-1296`) recuerda en `fallosVistos` (una ref) el `errorUpdateCount` de la consulta que observa y avisa cuando cambia y `hayDatos` es verdadero. `BloqueDeRecursos` (`key={bloque}`, `recursos-view.tsx:189`) y `TrabajoDeLaClase` (sin `key`, `trabajo-view.tsx:307`) sobreviven al cambio de clase con esa ref; al pasar de la consulta de B (1 fallo) a la de A (0 fallos), el contador "cambia" y, como A tiene datos y no tiene error, `hayDatos` es verdadero: avisa. En Recursos el aviso lleva el id `ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS`, así que si el de B sigue a la vista solo lo reemplaza; si ya se cerró, sale uno nuevo. En Actividades no lleva id: siempre sale uno nuevo.
Esperado / Obtenido: en A, ningún aviso de recarga (`toast.error` sigue con 1 llamada) / 2 llamadas, la segunda en A.
Requisito o regla violada: §D-1 (lo de una clase no aparece en otra; mecanismo M-1: estado que sobrevive al cambio de `:claseId`, aquí una ref de aviso, no de foco); CLASES-03d, R8 (§D-10): "una recarga fallida … avisa una vez por fallo; volver a montar la vista con el fallo ya ocurrido no lo repite". Es el punto 2 del manager: `BloqueDeRecursos` no guarda solo memoria de foco.
Hermanos (los que llaman a `useAvisoDeRecargaFallida` de clases y sobreviven al cambio de clase): `BloqueDeRecursos`, `TrabajoDeLaClase` y la sección «Sin tema» de Recursos (`seccion-de-recursos.tsx:65`, con su `key` constante; el remedio de T-02 la cubre). Ya llevan `key` por clase desde 06a y no tienen el defecto: `categorias-view.tsx` y `editar-recurso-view.tsx`. Es anterior a 06a (antes, todas sobrevivían); el plan no la inventarió porque la vista no se toca para conservar O-14. No sugiero el remedio: lo arbitra el manager.

## Atacado sin hallazgos

Todos en `frontend/src/app/estado-por-id-ch6a-r2.ataque.test.tsx`, en verde.
- **Punto 1, los controles de T-02:** ATQ-CH6-16, 17 y 18 con «un tema» (la sección se monta de nuevo por su `key` de tema): el foco va al `h2` de la lista.
- **Punto 3, las entregas tras el remedio:**
  - ATQ-CH6-20: tras el salto, con el foco en «Ver más alumnos» de T2, su última página lleva el foco al «Ver entrega» de la primera fila nueva (Alumno 21), afirmado con `document.activeElement`; la página de T1 que llega después no lo mueve y no hay avisos.
  - ATQ-CH6-21: T1 → T2 → T1 con la página de T1 en vuelo: al volver, «Ver más alumnos» de T1 está en `aria-busy`, un clic no pide otra y la página llega una sola vez.
  - ATQ-CH6-22: dos clics en el mismo render en «Ver más alumnos» de T2 tras el salto piden su página una vez.
- **Punto 4** (ATQ-CH6-23, 4 casos): la página de T1 responde `404 TAREA_NO_ENCONTRADA`, `409 CLASE_ARCHIVADA`, `403 ACCESO_RESTRINGIDO` o `401` con el refresco rechazado estando en T2: en T2 la lista sigue, no aparece ningún `role="alert"`, el foco se queda en «Ver más alumnos» de T2, la ruta no cambia y no sale ningún `toast.error`; `irA` sale una vez (con `/acceso-restringido` o `/login`) solo con los dos que redirigen, y ninguna con los otros dos. No ataqué la vista de T1 al volver (lo de la página que falla es de §D-5, 06b).
- **Punto 5, R-07** (ATQ-CH6-24): una petición de la tarea y una de la primera página de la lista al montar T1, al saltar a T2 sin caché, ninguna al volver a T1 en caché, una de cada una al volver a T1 con su caché marcada vieja (marco y contenido montan sus observadores a la vez) y una de cada una al recargarla.
- **Punto 6, regresión:** los 45 casos de `app/estado-por-id-ch6a-r1.ataque.test.tsx` (sin cambios, `2d40aeea…`) están en verde dentro de la suite (ver "Comandos").

## Observaciones (sin prueba roja)
- **O-05:** la guarda `pidiendoMasRef` de «Ver más alumnos» es redundante para el doble clic: sin ella (MT10), ATQ-CH6-22 sigue en verde, porque `fetchNextPage({ cancelRefetch: false })` une el segundo clic a la página en vuelo y sale una sola petición. Mi caso no dice vigilar la ref; lo anoto por la regla de las mutaciones.
- **O-06:** con el error de la página de T1 llegado estando en T2, al volver a T1 su consulta queda en error con sus datos (O-01 de la ronda 1); qué muestra entonces es de §D-5 (06b).

## Mis mutaciones

Con `scratchpad/r2/mut.sh`, el mismo guion de la ronda 1: copia en `scratchpad/r2/bak/`, `sed` y comprobación de que cambió (`diff` en `scratchpad/r2/mut/<id>.diff`), la corrida con `-t` (salida en `scratchpad/r2/mut/<id>.txt`) y la restauración por copia, nunca con `git`, confirmada con `cmp`. Después, `entregas-view.tsx` sigue en `05b23673…` y `sha256sum -c` de los 29 archivos de `features/` de 06a (`scratchpad/r1/prod-antes.sha`) da 29 de 29 `OK`.

| Id | Se quita | Cae (de `-t "ATQ-CH6-2[0-4]"`) |
|---|---|---|
| MT9 | `key={tareaId}` de `<ListaDeEntregasDeLaTarea …/>` (`entregas-view.tsx:214`) | ATQ-CH6-20 y ATQ-CH6-22 (`Tests  2 failed \| 6 passed \| 8 skipped (16)`) |
| MT10 | `pidiendoMasRef.current \|\|` de la guarda de `handleVerMas` (`entregas-view.tsx:99`) | ninguno (`8 passed`): `fetchNextPage({ cancelRefetch: false })` cubre el doble clic (O-05) |

T-02 y T-03 no tienen mutación: el remedio falta. Sus casos tienen el control que pasa (T-02: «un tema»; T-03: el primer aviso en B, que sí sale).

## Archivos nuevos

| Archivo | SHA-256 | Casos |
|---|---|---|
| `frontend/src/app/estado-por-id-ch6a-r2.ataque.test.tsx` (971 líneas) | `a7919e2dac1b46850a21d84ffc61e40d99fcfa5c14fd7d168b5bf5d3ab4aa92e` | 16 (la corrida del archivo: `16 tests`): ATQ-CH6-16, 17, 18 y 19 (2 cada uno), ATQ-CH6-20, 21 y 22 (1 cada uno), ATQ-CH6-23 (4) y ATQ-CH6-24 (1). En rojo, 5: ATQ-CH6-16, 17 y 18 con «Sin tema» (T-02) y los 2 de ATQ-CH6-19 (T-03). En verde, 11 |

No toqué código de producción, pruebas normales ni otras `*.ataque`; el archivo de la ronda 1 sigue en `2d40aeea…`.

## Comandos (desde `frontend/`, uno a la vez)

| Comando | Última línea |
|---|---|
| `npx vitest run src/app/estado-por-id-ch6a-r2.ataque.test.tsx` | `Tests  5 failed \| 11 passed (16)` |
| `npm run lint` | `> tsc -b` (salida 0; ESLint y Prettier sin errores) |
| `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Duration  281.09s (transform 48.65s, setup 147.48s, import 350.22s, tests 1779.67s, environment 704.78s)`; resultado `Tests  5 failed \| 5360 passed (5365)` y `Test Files  1 failed \| 240 passed (241)`. Los 5 rojos son los míos de T-02 y T-03; los 5349 de la corrida del manager (con mis 45 de la ronda 1 y CH6-A19) siguen en verde |

## V-01

287 `*.ataque.test.*` (182 en `frontend/` y 105 en `backend/`). Lista: `C:/Users/Carlos/AppData/Local/Temp/claude/cbc20defe2ff00dc/af34580f-db0f-4e17-b8f4-34eb4bf290b3/scratchpad/v01-ch6a-r2.txt`, 287 líneas, SHA-256 `75cff1a661d1b12d45fef692aa6f36e3ccfea294a138980afe7e4d4810ec3c44`. Contra `v01-ch6a-r1.txt` (`057c5806…`) solo se suma `frontend/src/app/estado-por-id-ch6a-r2.ataque.test.tsx` (`a7919e2d…`); las 286 de antes no cambian.

## No atacado y por qué
- Lo de 06b (la política de "pulsar la sección activa" y el «Ver más» que falla, incluida la vista de T1 al volver con su página en error): todavía no está hecho.
- La descarga de `components/adjuntos`, los formularios de `auth` y `admin`, la defensa del servidor y el foco al cambiar de ruta: decisiones tomadas.
- La comprobación en un navegador real: no verificada; la decide el humano al cerrar 06b (DH-07).

## Ronda 3 — CHORE-06a (2026-11-12)

Veredicto: **RESISTE**. Sin hallazgos nuevos; T-02 y T-03 quedan corregidos (mis ATQ-CH6-16 a 19 están en verde).
Verificación propia (desde `frontend/`): lint `> tsc -b`, salida 0 · suite de 06a `Tests  5389 passed (5389)`.

Leí `resumen-programador.md` (584 líneas, `7aa430db…`), "## CHORE-06a — Corrección ronda 2 (T-02, T-03 y H-R2)"; `revision.md` (987 líneas, `6953d383…`), "## Arbitraje de la ronda 2" y "## Verificación de la corrección de la ronda 2", con sus seis puntos finales; y el código: `useAvisoDeRecargaFallida` de clases con `clave` (`features/clases/hooks.ts:1279-1305`), las `key` de la sección (`recursos-view.tsx:139`, `trabajo-view.tsx:247`), las guardas de H-R2 (`muro-view.tsx:60`, `dudas-view.tsx:52`), `useFocoAlCargarMas`, `useDetalleViejoAnteClaseArchivada` y `exportar-a-excel.tsx`. El equipo estaba con corriente (`BatteryStatus` 2); una suite a la vez.

Archivo nuevo: `frontend/src/app/estado-por-id-ch6a-r3.ataque.test.tsx` (17 casos, `ATQ-CH6-25` a `ATQ-CH6-35`, todos en verde), con el arnés de las rondas 1 y 2 (router real, `defaultOptions` de `app/providers.tsx`, salto con `router.navigate(-1)`/`(1)`, el doble de `irA` contado). Sin selectores de estilo.

## Hallazgos

Ninguno.

## Atacado sin hallazgos

- **Punto 1, el gancho con clave** (los dos en Recursos y en Actividades):
  - ATQ-CH6-25: A → B → A → B con un fallo en A y otro en B: un aviso por fallo, en la clase donde ocurre, y ninguno al saltar.
  - ATQ-CH6-26: un fallo de B ocurrido con B fuera de la vista (su consulta queda con `errorUpdateCount` > 0) no se avisa al llegar, como en una vista con `key`; un fallo que llega después del salto avisa una vez.
  - ATQ-CH6-27: con `StrictMode`, el fallo de B avisa una vez y el salto a A no repite nada.
  - ATQ-CH6-28: editar recurso, R1 → R2 (clave `recursoId`): el fallo de R1 avisa una vez, el salto a R2 no lo repite y un fallo de R2 avisa una vez.
  - "Dos fallos seguidos" no lleva caso propio: la clave no interviene (lo arbitró el manager) y ATQ-CH6-25 ya pasa por dos fallos en la misma vista.
- **Punto 2, «Sin tema» montada de nuevo:**
  - ATQ-CH6-29 (2 casos): «Ver más de Sin tema» de A en vuelo con el foco en él, salto a B y la página de A llega con éxito o con `503`: el foco va al `h2` «Actividades de aprendizaje» y se queda, nada de A aparece en B y ningún aviso.
  - ATQ-CH6-30: en Recursos de B, la lista de temas del bloque y la de «Sin tema» fallan a la vez: cada `toast.error` lleva `{ id: ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS }` (uno a la vista) y ninguno sale al saltar a A.
  - Mover a «Sin tema» y desde ella dentro de la misma clase, sin caso: por construcción, la `key` nueva es la de antes con un prefijo constante en la clase (`` `${claseId}:${seccion.clave}` ``), así que dentro de una clase monta y desmonta exactamente lo mismo que antes de la ronda 2; las pruebas de mover de CLASES-03c2 y 03d siguen en verde en la suite.
- **Punto 3, Avisos y Dudas con «Ver más»:**
  - ATQ-CH6-31 (2): con el foco en «Ver más» de A y B también con página siguiente, el salto deja el foco en «Ver más» de B.
  - ATQ-CH6-32 (2): con la página de A en vuelo, el salto a B (sin más) lleva el foco al `h2` («Avisos», «Dudas») y, al llegar la página de A, no se mueve ni aparece nada de A ni sale ningún aviso.
  - ATQ-CH6-33 (2): en la misma clase, la última página lleva el foco a la primera fila nueva (`data-publicacion-id`, `data-duda-id`), sin cambio de conducta.
- **Punto 4** (ATQ-CH6-34): publicar en A, saltar a B y la escritura de A responde `409 CLASE_ARCHIVADA` (con A archivada en el servidor): B no pasa a solo lectura (sin «Clase archivada el …»), su campo es el mismo nodo con lo escrito y el foco, como mucho un aviso y como mucho una lectura de más del detalle de B; al volver a A, A sí se lee archivada (su gancho marcó viejo el detalle de A). Queda como observación (O-07): la lectura de más existe y no tiene efecto visible.
- **Punto 5, `useAlPulsarLaSeccionActiva`:** por lectura, los manejadores de las vistas que sobreviven al cambio de clase (`muro-view`, `dudas-view`, `BloqueDeRecursos`, `trabajo-view`) leen la consulta del render actual, que ya es la de B; no usan nada de A. Observación para 06b (O-08), sin prueba.
- **Punto 6, regresión:** los 45 casos de la ronda 1 y los 16 de la ronda 2 están en verde en la suite (ver "Comandos"); sus archivos no cambiaron (`2d40aeea…`, `a7919e2d…`).
- **Por cuenta propia:**
  - ATQ-CH6-35: con «Exportar a Excel» de A en vuelo, el salto a B aborta la exportación de A (`GradebookDeLaClase` se monta de nuevo por su `key`): al responder A no sale ningún aviso, «Exportar a Excel» de B no está en espera y un clic pide la exportación de B. Sin la `key` (MT14), el botón de B queda en espera por la de A.
  - Lo destructivo con los remedios nuevos en su sitio (quitar, calificar, editar y publicar en el id equivocado): CH6-A01 a A14 del programador y mis 30 casos de ATQ-CH6-04 (ronda 1) siguen en verde en la suite; ninguna corrección de las rondas 1 y 2 lo reabrió.
  - Estado que pase de un id a otro: repetí la búsqueda en todo lo que toca 06a (vistas, subcomponentes, ganchos, memoria de módulo, contextos y caché) contra el inventario del programador y del manager. Las vistas que siguen sin `key` por clase (`ClaseDeLaRuta`, `MuroDeLaClase`, `DudasDeLaClase`, `RecursosDeLaClase` con `BloqueDeRecursos`, `TrabajoDeLaClase`) guardan memoria de foco hecha para el cambio de clase y, desde la ronda 2, el contador del aviso con su clave; las guardas de doble clic por ref viven bajo una `key` por id; la memoria de módulo va por consulta o es de la sesión; el único contexto (`ContextoDeSoloLectura`) lo provee la clase actual; las lecturas de la caché llevan el id. La exportación (arriba) era el único estado en vuelo de una vista con `key` nueva que no estaba en ninguno de los dos inventarios: resiste. No encontré otro.

## Observaciones (sin prueba roja)
- **O-07 (punto 4):** un `409 CLASE_ARCHIVADA` de una escritura de A que llega estando en B hace que `useDetalleViejoAnteClaseArchivada` (`clase-layout.tsx`, "No se toca") marque viejo el detalle de B: como mucho una lectura de más de B, sin efecto visible (ATQ-CH6-34). Conducta anterior a 06a.
- **O-08 (punto 5, para 06b):** `useAlPulsarLaSeccionActiva` en las vistas que sobreviven al cambio de clase usa la consulta del render actual (la de B); nada de A.
- **O-09:** en ATQ-CH6-28 (editar recurso), quitar el bloque de la clave del gancho (MT11) no hace caer el caso: el contenido de la edición ya se monta de nuevo por `key={recursoId}`, así que ahí la clave es una segunda red. Donde la clave es la única defensa (Recursos y Actividades), MT11 hace caer los cinco casos.

## Mis mutaciones

Con `scratchpad/r3/mut.sh` (el guion de las rondas anteriores, contra mi archivo de la ronda 3): copia en `scratchpad/r3/bak/`, `sed` y comprobación de que cambió (`diff` en `scratchpad/r3/mut/<id>.diff`), la corrida con `-t` (salida en `scratchpad/r3/mut/<id>.txt`) y la restauración por copia, nunca con `git`, confirmada con `cmp`. Antes guardé el SHA-256 de los 30 archivos de `features/` que cambian contra `47c3339` sin contar las `*.ataque` (`scratchpad/r3/prod-antes.sha`); al terminar, `sha256sum -c` dio 30 de 30 `OK`.

| Id | Se quita | Cae |
|---|---|---|
| MT11 | el bloque `if (clavePrevia.current !== clave) {…}` de `useAvisoDeRecargaFallida` (`features/clases/hooks.ts:1291-1295`, acotado a esas líneas) | los 2 de ATQ-CH6-25, los 2 de ATQ-CH6-26 y ATQ-CH6-27 (`Tests  5 failed \| 1 passed \| 11 skipped (17)`); ATQ-CH6-28 sigue verde (O-09) |
| MT12 | la `key` de la sección vuelve a `seccion.clave` en `trabajo-view.tsx:247` | los 2 de ATQ-CH6-29 (`2 failed`) |
| MT13 | `if (clasePrevia.current !== claseId) return false` de `enfocarPublicacion` (`muro-view.tsx:60`) | ATQ-CH6-32 (Avisos) (`1 failed \| 5 passed`); Dudas y los de 31 y 33 siguen verdes |
| MT14 | `key={claseId}` de `GradebookDeLaClase` (`gradebook-view.tsx:223`) | ATQ-CH6-35: «Exportar a Excel» de B queda en `aria-busy` por la exportación de A (`1 failed`) |
| MT15 | `if (clasePrevia.current !== claseId) return false` de `enfocarDuda` (`dudas-view.tsx:52`) | ATQ-CH6-32 (Dudas) (`1 failed \| 5 passed`) |

## Archivos nuevos

| Archivo | SHA-256 | Casos |
|---|---|---|
| `frontend/src/app/estado-por-id-ch6a-r3.ataque.test.tsx` (1012 líneas) | `c5008e288157a514f7af58c05408e472e4afa56a37c53e07593e847b3a4becf5` | 17, todos en verde (la corrida del archivo: `Tests  17 passed (17)`): ATQ-CH6-25, 26, 29, 31, 32 y 33 (2 cada uno), ATQ-CH6-27, 28, 30, 34 y 35 (1 cada uno) |

No toqué código de producción, pruebas normales ni otras `*.ataque`; los archivos de las rondas 1 y 2 siguen en `2d40aeea…` y `a7919e2d…`.

## Comandos (desde `frontend/`, uno a la vez)

| Comando | Última línea |
|---|---|
| `npx vitest run src/app/estado-por-id-ch6a-r3.ataque.test.tsx` | `Tests  17 passed (17)` (`Test Files  1 passed (1)`) |
| `npm run lint` | `> tsc -b` (salida 0; ESLint y Prettier sin errores) |
| `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Duration  272.94s (transform 48.59s, setup 143.52s, import 332.21s, tests 1746.95s, environment 678.28s)`; resultado `Tests  5389 passed (5389)` y `Test Files  242 passed (242)`: los 5372 de la corrida del manager más mis 17 |

## V-01

288 `*.ataque.test.*` (183 en `frontend/` y 105 en `backend/`). Lista: `C:/Users/Carlos/AppData/Local/Temp/claude/cbc20defe2ff00dc/af34580f-db0f-4e17-b8f4-34eb4bf290b3/scratchpad/v01-ch6a-r3.txt`, 288 líneas, SHA-256 `6707b9094f70470ed3b3d85ea73c8bf3d6aec68cf24a3501dbbca0fca88f4404`. Contra `v01-ch6a-r2.txt` (`75cff1a6…`) solo se suma `frontend/src/app/estado-por-id-ch6a-r3.ataque.test.tsx` (`c5008e28…`); las 287 de antes no cambian. Contra la base (`v01-ch6-base.txt`, `686daf88…`): cambian C-1, C-2 y C-11 y se suman mis tres archivos de las rondas 1 a 3.

## No atacado y por qué
- Lo de 06b (la política de "pulsar la sección activa" y el «Ver más» que falla): todavía no está hecho; O-08 queda para su ronda.
- La descarga de `components/adjuntos`, los formularios de `auth` y `admin`, la defensa del servidor, el foco al cambiar de ruta y la regla de PA-1: decisiones tomadas.
- La comprobación en un navegador real: no verificada; la decide el humano al cerrar 06b (DH-07).

---

# CHORE-06b

## Ronda 0 — CHORE-06b (2026-11-12)


Tester, ronda 0 de 06b: aplico a las pruebas `*.ataque` los C-n de §D-R0 del plan vigente (`plan.md`, 1009 líneas, `48f981d7…`, Enmiendas 1, 2, 3 y 3b), antes de que el programador implemente. No ataco nada y no toco código de producción ni pruebas normales. Las líneas que cito "antes" son de `023b450`. Los conteos salen de cada corrida, archivo por archivo, desde `frontend/` y nunca dos a la vez. El equipo estaba conectado a la corriente (`BatteryStatus` 2).

Veredicto de la ronda 0: **12 C-n aplicados (C-3 a C-9, C-13 y C-15 a C-18). C-10 y C-14 no se aplican: son condicionales.** El repaso no encuentra ningún C-n nuevo. Hay una desviación menor que debe arbitrar el manager: en C-17 borré una línea más, la ayuda `encabezadoAlumnos`, que la reescritura dejó sin uso y que hacía fallar el lint. Está en el detalle de C-17.

Respaldo de los 12 archivos antes de tocarlos: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\r0-respaldo\`.

### Por C-n

Para cada uno doy los hunks contra `023b450` (`git diff -U0 023b450`), lo que afirma ahora, el comando y la última línea de la corrida final, y qué cayó y por qué. Todos los rojos se leyeron en la salida y son el rojo esperado: la conducta de 06b todavía no existe. Ningún caso reescrito sale verde hoy.

**C-3 · `src/features/clases/ver-mas-y-orden-ch4-r1.ataque.test.tsx`** (+92 −2; hunks `-18`, `-388,+388,3`, `+392,2`, `+397,17`, `+462,28`, `+576,41`).
- `FALLAS` (`:388-391`) se parte en dos: `FALLAS_QUE_CONSERVAN`, con la fila "red", y `FALLAS`, con la del `400` de cursor. El caso del cursor de ATQ-CH4-20 y ATQ-CH4-22 no cambia en nada, ni en el título que se ve ni en su cuerpo (Enmienda 3: solo cambia la fila "red").
- Ayuda nueva `comprobarFalloQueConservaLaLista`:
  - `aviso.error` se llama una vez, con `mensajeDeConsultaClases(error)` como primer argumento;
  - no hay ningún `role="alert"`;
  - las filas siguen a la vista;
  - «Ver más …» está a la vista y fuera de espera, y nada queda en espera.
- ATQ-CH4-20 (red) en «Ver más comentarios», con su título nuevo:
  - salen las dos peticiones de la página (`retry: 1`) y ninguna más tras 1,5 s;
  - la lista se queda con «Comentario 01» y «Comentario 02»;
  - un solo aviso, ningún `MensajeError`;
  - «Ver más comentarios» sigue a la vista y nada queda en espera.
- ATQ-CH4-22 (red), estudiante y maestro:
  - lo mismo, con las tarjetas «Clase 01» y «Clase 02» buscadas dentro del contenedor de «Ver más clases», porque la barra lateral trae las tres clases;
  - sin `MensajeError` del panel ni el titular `TEXTOS_PANEL.error` en el bloque destacado.
- Se importa `mensajeDeConsultaClases` de `./lib`. ATQ-CH4-21 y ATQ-CH4-23 no cambian.
- Corrida: `npx vitest run src/features/clases/ver-mas-y-orden-ch4-r1.ataque.test.tsx` → `Tests  3 failed | 11 passed (14)`.
- Rojos (los 3 de la fila "red"): `expected "vi.fn()" to be called 1 times, but got 0 times`. Hoy la página fallida reemplaza la lista por el `MensajeError` y no avisa.
- Verdes: la precondición, el cursor en ATQ-CH4-20 y en ATQ-CH4-22 (estudiante y maestro), ATQ-CH4-21, ATQ-CH4-23 y los casos del orden.

**C-4 · `src/features/clases/alumnos-b-r4.ataque.test.tsx`** (+14 −5; hunks `-345`, `-351,2`, `-355`, `-361`).
- Ayuda nueva `unAvisoConLaListaALaVista`: `aviso.error` se llama una vez y `nombreDe(1)` sigue a la vista. Reemplaza las esperas de la lista vacía de `:351` y `:361`.
- `:352`: el foco, en «Ver más alumnos».
- `:363-364` (no `<body>`, conectado) no cambian, como dice la Enmienda 3.
- Títulos: el de `:345` pasa a "…la lista se queda, un solo aviso y el foco se queda en «Ver más alumnos» (CHORE-06b, §D-5)". El de T-27 (`:355`) pasa a "…la lista se queda con un solo aviso y el foco no se pierde en <body> (CHORE-06b, §D-5)".
- En Personas, el foco exacto en el botón lo fija C-17.
- Corrida: `npx vitest run src/features/clases/alumnos-b-r4.ataque.test.tsx` → `Tests  2 failed | 13 passed (15)`.
- Rojos (los dos reescritos): `expected "vi.fn()" to be called 1 times, but got 0 times`. Es la razón esperada.

**C-5 · `src/features/clases/foco-02c-r3.ataque.test.tsx`** (+13 −4; hunks `-376`, `-386`, `-388`, `+397,2`, `-397`).
- Ayuda nueva `unAvisoConElGenerico`: `aviso.error` una vez, con `GENERICO`. Reemplaza `:386` y `:397`.
- `:388`: el foco, en «Ver más avisos».
- `:399` (el campo «Anuncio») no cambia.
- Entre las dos mitades, después de `cleanup()`, se suma `aviso.error.mockClear()`, para contar los avisos de la segunda mitad desde su propio montaje.
- Título: "…con el foco en el botón, se queda en el botón (CHORE-06b, §D-5); si la persona se fue al campo del anuncio, se queda ahí".
- Corrida: `npx vitest run src/features/clases/foco-02c-r3.ataque.test.tsx` → `Tests  1 failed | 15 passed (16)`.
- Rojo: el reescrito, `called 1 times, but got 0 times`. Es la razón esperada.

**C-6 · `src/features/clases/foco-pestana-02d-r3.ataque.test.tsx`** (+7 −3; hunks `+5` (importación), `-257`, `-267`, `-270`).
- Se importa `toast` de `sonner`, que ya estaba doblado en `:18`.
- Al empezar el caso, `vi.mocked(toast.error).mockClear()` (N-03 de la 3b).
- `:267` pasa a `waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1))`.
- `:270`: el foco, en «Ver más alumnos».
- Título: "…la lista se queda con un solo aviso y el foco se queda en «Ver más alumnos», no en <body> (CHORE-06b, §D-5)".
- Corrida: `npx vitest run src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` → `Tests  1 failed | 9 passed (10)`.
- Rojo: el reescrito, `called 1 times, but got 0 times`. Es la razón esperada.

**C-7 · `src/features/clases/muro-c-r1.ataque.test.tsx`** (+8 −6; hunks `-803`, `-809`, `-812`, `-815`, `-822`, `-825`).
- `:809` y `:822` pasan a esperar `aviso.error` una vez.
- `:812` y `:825`: el foco, en «Ver más avisos» y en «Ver más comentarios».
- `:811` y `:824` (no `<body>`) no cambian.
- Los dos títulos suman ": la lista se queda con un solo aviso y el foco sigue en «Ver más …» (CHORE-06b, §D-5)".
- Corrida: `npx vitest run src/features/clases/muro-c-r1.ataque.test.tsx` → `Tests  2 failed | 21 passed (23)`.
- Rojos: los dos reescritos, `called 1 times, but got 0 times`. Es la razón esperada.

**C-8 · `src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx`** (+12 −4; hunks `-722,2`, `-746,2`). Es CAL-T-248 y cambia de sentido (fila 446, §D-6).
- El `describe` pasa de "Evidencia de N-52 (riesgo residual ya decidido; no es hallazgo)" a "N-52 (CHORE-06b, §D-6): la ventana vacía ya no se sirve de la caché".
- El título pasa a "…salir con el texto a la vista y volver: «Alumnos siguientes» pide la ventana una vez (no la sirve de la caché) y, como ya no está vacía, el texto no vuelve".
- El final (`unSoloTexto()` y `desde(i)` en 0) pasa a esto:
  - `desde(i)` tiene una petición, con `cursor === CURSOR_ALUMNOS`;
  - aparece la fila «Carla Gómez» (`findByRole("row", { name: /^Carla Gómez/ })`, como en `gradebook-01d-r2`);
  - después de `reposar()`, sigue una sola petición;
  - no está `CURSOR_TEXTO` y no hay ningún aviso.
- El caso solo tiene el camino "salir y volver" (desmontar y montar con el mismo cliente). El camino "pulsar la sección" no está en este archivo, y no lo agregué: lo pide CH6-B14 (a) en `gradebook-ch6.test.tsx` del programador.
- Corrida: `npx vitest run src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` → `Tests  1 failed | 17 passed (18)`.
- Rojo: `expected [] to have a length of 1 but got +0`. Hoy la ventana vacía se sirve de la caché sin pedirla. Es la razón esperada.
- CAL-T-237 (desmontar con el texto y volver) y CAL-T-238 siguen verdes. Revisé que la limpieza de §D-6 (b) no les cambia el sentido: no piden la ventana con cursor sin pulsar.

**C-9 · `src/features/clases/ordenar-03c2-r2.ataque.test.tsx`** (+6 −2; hunks `-463`, `+476`, `-474`). Es CL3-2R2-10.
- Título: "…pulsar «Actividades de aprendizaje» estando ahí pide la lista de temas de la sección una vez y ninguna frase de la vista promete esa acción".
- Antes del `reposar(200)` de `:473` se espera `getsDeSeccion()` en `antes + 1`, con `waitFor`.
- `:474` pasa a `toBe(antes + 1)`: una sola petición después de reposar.
- `:475` y `:476` no cambian.
- Comprobé por qué hoy no pide. `ponerElOrdenEnLasSeccionesSinElNuevo` (`hooks.ts:1448-1469`) escribe la lista, que pasa a éxito y deja de estar en error, y la marca vieja con `refetchType: "none"`. El manejador de hoy (`trabajo-view.tsx:122-125`) solo pide con `isError`, y PR-1 pedirá con `isStale`.
- Corrida: `npx vitest run src/features/clases/ordenar-03c2-r2.ataque.test.tsx` → `Tests  1 failed | 19 passed (20)`.
- Rojo: `expected 3 to be 4`: no salió la petición. Es la razón esperada.
- CL3-2R2-11 (`:481`, vigilada) sigue verde.

**C-13 · `src/lib/guardas-ch4-r1.ataque.test.ts`** (+0 −8; hunk `-113,8`).
- Se quitan las ocho líneas: el comentario "S-04 (H-2)…" (`:113`) y las siete `void <consulta>.refetch()` (`:114-120`). Nada más cambia, tampoco el título del caso, que todavía nombra "S-04" (el plan no lo cambia).
- Corrida: `npx vitest run src/lib/guardas-ch4-r1.ataque.test.ts` → `Tests  1 failed | 5 passed (6)`.
- ATQ-CH4-34 sale rojo con `expected [ …(12) ] to deeply equal [ …(5) ]`. El diff nombra exactamente las siete líneas que sobran, y son los siete sitios que cambia el programador:
  - `components/respuestas-de-duda.tsx: void respuestas.refetch()`
  - `components/seccion-de-recursos.tsx: void recursos.refetch()`
  - `components/seccion-de-tema.tsx: void trabajo.refetch()`
  - `dudas-view.tsx: void dudas.refetch()`
  - `muro-view.tsx: void publicaciones.refetch()`
  - `recursos-view.tsx: void temas.refetch()`
  - `trabajo-view.tsx: void temas.refetch()`
- Las cinco que quedan coinciden.

**C-15 · `src/features/clases/inicio-sin-datos-r2.ataque.test.tsx`** (+15 −3; hunks `+1` (importación), `+32,7` (comentario), `+45,2`, `-53,3`).
- La fábrica de `./hooks` (`:31-37`) suma `useAvisoDeRecargaFallida: () => undefined` y `useListaConservadaTrasLaPagina: () => false` (Enmienda 3b), con un comentario como el de `:25-30`.
- El render de `:52-56` envuelve `<MemoryRouter>` en `<QueryClientProvider client={new QueryClient()}>`.
- Ninguna aserción cambia.
- Corrida: `npx vitest run src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` → `Tests  2 passed (2)`. Verde hoy, como se esperaba.

**C-16 · `src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx`** (+15 −3; hunks `+1`, `+25,7`, `+36,2`, `-42,3`).
- Lo mismo que C-15, en la fábrica de `:24-28` y el render de `:41-45`.
- Corrida: `npx vitest run src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` → `Tests  1 passed (1)`. Verde hoy, como se esperaba.
- Las dos dependen de N-02: los inicios importan `useRecargarAlPulsarLaSeccion` y `useMarcarViejaSiQuedoEnError` de `@/components/seccion/hooks`, nunca por `./hooks`. Si no, es PA-2.

**C-17 · `src/features/clases/alumnos-b-r5.ataque.test.tsx`** (+9 −4; hunks `-197`, `+315,2`, `-317`, `-324,2`).
- Título, tal cual el plan: "%s: si la página siguiente falla, la lista se queda, un solo aviso y el foco se queda exactamente en «Ver más alumnos» (CHORE-06b, §D-5)".
- `:324` pasa a `await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))`.
- `:325`: el foco, en `getByRole("button", { name: "Ver más alumnos" })`, con `waitFor`.
- Se suman `expect(screen.queryByRole("alert")).toBeNull()` y que `nombreDe(1)` sigue a la vista.
- **Desviación para el manager:**
  - la reescritura deja sin uso la ayuda `const encabezadoAlumnos = () => screen.getByRole("heading", { name: "Alumnos" })` (`:197`), que solo usaba `:325`;
  - con ella, `npm run lint` falla con `197:7 error 'encabezadoAlumnos' is assigned a value but never used @typescript-eslint/no-unused-vars`;
  - la borré, y ninguna otra línea del archivo la usaba;
  - el plan no la nombra. Si el manager prefiere otra salida (por ejemplo, conservarla con una aserción "el foco no está en el encabezado"), la cambio.
- Corrida: `npx vitest run src/features/clases/alumnos-b-r5.ataque.test.tsx` → `Tests  2 failed | 10 passed (12)`.
- Rojos (alumnos y personas): `called 1 times, but got 0 times`. Es la razón esperada.

**C-18 · `src/features/clases/muro-c-r3.ataque.test.tsx`** (+38 −11).
- Cambios:
  - importa `waitFor` y `toast` de `sonner`, que ya estaba doblado en `:18`;
  - `CasoDeError` suma `conserva: boolean`, verdadero solo en "500" y "sin conexión (fetch rechaza)" y falso en las otras cinco filas;
  - dos ayudas nuevas. `comprobarQueSeConserva`: `toast.error` una vez y su primer argumento es `caso.deSiempre`, sin ningún `role="alert"`, y «Ver más …» a la vista. `comprobarQueSeReemplaza`: es el cuerpo de hoy (`findByRole("alert")` con su texto), sin cambio;
  - cada caso hace `vi.mocked(toast.error).mockClear()` al empezar (N-03) y elige la comprobación con `await (caso.conserva ? … : …)`;
  - los títulos no cambian.
- `caso.deSiempre` de esas dos filas es el texto que hoy pinta el `MensajeError` del error real, que sale de `mensajeDeErrorDeLista`, y en un error que no es de cursor eso es `mensajeDeConsultaClases`. Por eso vale también para el aviso de §D-5, que usa `mensajeDeConsultaClases(error)`.
- Corrida: `npx vitest run src/features/clases/muro-c-r3.ataque.test.tsx` → `Tests  4 failed | 11 passed (15)`.
- Rojos: los cuatro casos de "500" y de "sin conexión" en «Ver más avisos» y en «Ver más comentarios», con `called 1 times, but got 0 times`. Es la razón esperada.
- Verdes: los diez de `400` y `403` y la precondición.

**No aplicados:** C-10 (`app/muro-recuperar-c-r4.ataque.test.tsx`) y C-14 (`app/estado-por-id-ch6a-r3.ataque.test.tsx`). Son condicionales y quedan para si caen en la corrida del programador. Los tres `app/estado-por-id-ch6a-r*.ataque.test.tsx` no se tocaron.

**Contraste con el paso 13 del plan.** El paso 13 dice qué sale verde antes del cambio, pero en las pruebas nuevas del programador. Para los C-n, el plan espera verdes C-15 y C-16, que lo están, y rojo C-13 con los siete sitios, que también se cumple. Cada caso reescrito de C-3 a C-9, C-17 y C-18 sale rojo hoy, y ninguno sale verde antes del cambio.

### Repaso de la ronda 0 (C-n nuevos: ninguno)
Corrí los `rg` de la lista cerrada, el de la Enmienda 1 y los dos de la Enmienda 3, desde `frontend/`, y crucé cada archivo con lo que hace.
- `rg "vi.mock\(.*(clases|tareas|calificaciones)/hooks" src -g "*.test.*"`, más `vi.mock("./hooks"` y `vi.mock("@/components/seccion/hooks"`: solo `inicio-sin-datos-r2.ataque.test.tsx:39` e `inicio-sin-datos-02c-r1.ataque.test.tsx:32`, que son C-15 y C-16.
- `rg "<(PublicacionDelMuro|ComentariosDePublicacion|ElementoDeRecurso|TablaAlumnos|PanelMisClases)\b" src -g "*.test.tsx"`:
  - `adjuntos-de-publicacion.test.tsx:213` y `:230`: vigilada por la lista cerrada; no abre los comentarios;
  - `publicacion-del-muro.test.tsx:90`: en la lista cerrada (programador);
  - `tarjeta-01d-r1.ataque.test.tsx:41` y `tarjeta-01d-r2.ataque.test.tsx:38`: ya tienen `QueryClientProvider` y `MemoryRouter`, así que no caen.
  - Lo amplié a `SeccionDeRecursos|SeccionDeTema|ElementosDelTema|RespuestasDeDuda|BloqueDeRecursos|PersonasDeLaClase|DudasDeLaClase|MuroDeLaClase|TrabajoDeLaClase`: sin coincidencias.
- `rg 'findByRole\("alert"\)|GENERICO|errorInterno|error500' src/features/clases src/app -g "*.ataque.test.tsx"`, cruzado con los que piden una página con `cursor`, da 17 archivos. Además de los C-n:
  - `app/contrasena-r1`: es el cursor de texto, no de páginas;
  - `app/personas-03c1-r1`: el `500` es de la primera página (`!has("cursor")`), no de la siguiente;
  - `app/personas-03c1-r2`: CL3-R2-11, vigilada en el plan. La recarga falla y la página queda retenida, así que es un fallo de recarga y sigue reemplazando;
  - `archivos-d-r1`: la página responde 200;
  - `clases-r1`: «Ver más clases» retenida, sin fallo; monta con `MemoryRouter` y `QueryClientProvider`;
  - `clases-admin-02c-r1`: es de `features/admin`, una variante registrada;
  - `dudas-03e-r1` y `dudas-03e-r2`: su cursor fallido es el `400` y sus `500` son de la lista o de una recarga;
  - `formularios-ch3-r1` (O-13): «Ver más alumnos» con un `400 VALIDACION`, que sigue reemplazando;
  - `muro-c-r2`: el `400` del cursor, vigilada.
- Segundo cruce: «Ver más» y `5xx` o red en `src/features/clases`, `src/app` y `src/features/calificaciones`. Da 21 archivos más. Ninguno hace fallar la página siguiente de una de las 9 listas con la red o un `5xx` esperando `MensajeError` o el foco en el encabezado:
  - `alumnos-b-r2` y `alumnos-b-r3`: recargas y `401`;
  - `cargar-mas-02c-r2`: el admin;
  - `clase-archivada-01d2-r*`: «Ver más respuestas» en vuelo o vacía, y recargas con error;
  - `dudas-03e-r3`: el `503` es de borrar;
  - `trabajo-01e-r*` y `ver-mas-01e-r3`: el `:194` es la recarga de fondo, vigilada;
  - `mis-calificaciones-01d-r*` y `secciones-01d-r*`: `features/calificaciones`, que ya conserva;
  - `estado-por-id-ch6a-r*`: vigiladas.
- `rg "página siguiente|Ver más.*(falla|500|red)" src -g "*.test.*"`:
  - en las `*.ataque`, lo único del mismo sentido son los C-n y CL3-R2-11, que ya están vigilados;
  - en las normales, solo `personas-view.test.tsx:263` (lista cerrada) y casos que no cambian: `dudas-03e.test.tsx:1388`, cuyo `503` es del DELETE, `clase-archivada-01d2-vista.test.tsx:967`, vigilada, y los de `features/admin`, `features/tareas` y `features/calificaciones`.
- `rg -l "location\.key|estando ahí|estando en (ella|él)|sección activa" src -g "*.test.*"`: 32 archivos. Fuera de los que el plan ya nombra:
  - `app/rutas-01d-r1`, `heredados-02d-r1` e `indicador-03c1-r2`: solo en comentarios;
  - `indicador-03c1-r1` CL3-R1-08 (`:581`): pulsa «Calificaciones» y no cuenta peticiones;
  - `clases-admin-01c-r1`: el admin, una variante.

  Ninguno cambia de sentido.
- §D-6, la barra con una clase archivada: crucé las `*.ataque` que mencionan `archivad` con las que sirven `inscritas` o `impartidas` (13 archivos). Ninguna cuenta las peticiones de la barra o del inicio, ni el total de peticiones.
- §D-6 (b), las ventanas del gradebook: revisé los conteos de `desde(…)` de `gradebook-01d-r2/r3` y `secciones-01d-r3/r4`. Solo CAL-T-248 (C-8) servía de la caché la ventana con cursor después de salir con el texto. CAL-T-237 y CAL-T-238 no piden la ventana con cursor y CAL-T-201 tiene la vista quieta (vigilada), así que siguen en su sentido.

### V-01
- Comando: `sha256sum -c` contra `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\v01-ch6b-base.txt`, desde la raíz.
- Resultado: `276` OK y `WARNING: 12 computed checksums did NOT match`. Las 12 son exactamente los archivos de C-3 a C-9, C-13 y C-15 a C-18.
- El conjunto de `*.ataque` del repositorio sigue siendo de 288 rutas, sin archivos nuevos ni borrados.
- Lista nueva: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\v01-ch6b-r0.txt`. Tiene 288 líneas, con el mismo orden y formato que la base (`sha256sum -b`). Su SHA-256 es `1b0e6e3755b9ab43f2bd8272d55313d62a4d86b48922a9be0582de7ddcb0503b`.
- `git status` muestra cambiados en `frontend/` solo esos 12 archivos (`git diff --numstat 023b450 -- frontend`: 12 archivos, +229 −55).

### Lint
- Formateé solo los 12 archivos con `npx prettier --write <los 12>`, desde `frontend/`. Prettier ajustó `muro-c-r1` y `muro-c-r3`.
- La primera corrida de `npm run lint` falló por `encabezadoAlumnos` (ver C-17).
- La corrida final, `npm run lint` desde `frontend/`, sale con código 0. Sus últimas líneas son `All matched files use Prettier code style!`, `> @campus/frontend@0.0.0 typecheck` y `> tsc -b`, que termina sin errores.
- Después del formateo y del cambio de C-17 volví a correr los 12 archivos, uno por uno. Las cifras de arriba son de esa corrida final.

### Para el programador y el manager
- PA-2 aplica a toda `*.ataque` fuera de estos 12 archivos. C-10 y C-14 los aplico yo solo si caen.
- C-15 y C-16 caen (PA-2) si los inicios importan los ganchos de la política por `./hooks`.
- En C-3, C-4, C-17 y C-18, el aviso se cuenta con el doble de `sonner` sin opciones. Si el programador le pusiera un `idDelAviso` al aviso de §D-5, `toHaveBeenCalledTimes(1)` seguiría valiendo. En C-3 y C-18 se compara solo el primer argumento, y C-5 usa `toHaveBeenCalledWith(GENERICO)`, que fallaría con un segundo argumento. §D-5 no lleva `idDelAviso` en las 9 listas.

## Ronda 0 bis — CHORE-06b: C-19 y C-20 (2026-11-12)


Tester, ronda 0 bis (R-0 del plan). Plan vigente: `plan.md`, 1156 líneas, SHA-256 `201dc71f…` (comprobado), con las Enmiendas 4 y 4b; para C-19 manda la forma de la 4b (N-02). El árbol tiene los cambios de 06b del programador, sin commit, con la forma vieja de §D-6 (a): marcar siempre al pulsar. Solo toqué los dos archivos de C-19 y C-20. Los corrí uno a la vez desde `frontend/`, antes y después del cambio, con `--reporter=verbose`. El equipo estaba conectado a la corriente (`BatteryStatus` 2). Dejé un respaldo de los dos archivos en `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\r0bis-respaldo\`.

**Resultado: C-19 y C-20 aplicados con el texto exacto del plan.** Las líneas citadas coinciden con el archivo: `:582-627` y `:591` en `gradebook-01d-r3`, `:389-408` en `secciones-01d-r4`. Ningún C-n nuevo.

**C-19 · `src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx`** (CAL-T-244). Cambio contra el respaldo: hunks `+592,3` y `-626 +629`.
- Después de `primera.unmount()` (`:591`) se suman tres líneas:
  - `// CHORE-06b (C-19, §D-6 b): una marca por la ocurrencia y otra al salir con el texto visto (N-52).`
  - `const tras = marcas()`
  - `expect(tras).toBe(2)`
- `:626` pasa de `expect(marcas()).toBe(1)` a `expect(marcas()).toBe(tras)`; ahora está en `:629`, como dice el plan. El título no cambia.
- Antes del cambio salía rojo con `expected 2 to be 1`: la limpieza de §D-6 (b) del árbol ya suma la marca al desmontar.
- **Hoy sale verde.** Es lo que esperaba el orquestador. La marca de (b) existe en el árbol, y ni la espera ni la llegada de la primera ventana suman otra. Con R-2 debe seguir en 2: la frase se vio en ese montaje y no se marcó antes de desmontar.

**C-20 · `src/features/calificaciones/secciones-01d-r4.ataque.test.tsx`** (CAL-T-258). Hunks `-389 +389`, `+404` y `-406 +407`.
- Título: "…el 400 marca una vez; pulsar la sección con el texto a la vista agrega una (N-52, CHORE-06b) y con la tabla sana ninguna".
- Entre `:403` y `:404` se suma `expect(marcasViejas(espia)).toHaveLength(marcas + 1)`.
- `:406` (ahora `:407`) pasa a `toHaveLength(marcas + 1)`.
- `:394`, `:399`, `:400` y `:407` (ahora `:408`) no cambian.
- Antes del cambio salía rojo con `expected [ …(3) ] to have a length of 1 but got 3`.
- **Hoy sale rojo, por la razón esperada:** `expected [ …(3) ] to have a length of 2 but got 3`, en `secciones-01d-r4.ataque.test.tsx:407:33`, que es la aserción final.
  - La aserción nueva de `:404` pasa: la primera pulsación, con el texto a la vista, suma exactamente una marca.
  - Falla la final, porque la segunda pulsación, con la tabla sana, también marca: es la forma vieja de (a) del árbol.
  - Debe pasar a verde con R-2.

**Los dos archivos, antes y después:**
- `npx vitest run src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx`:
  - antes: `Tests  1 failed | 17 passed (18)`; el único rojo era CAL-T-244;
  - después: `Tests  18 passed (18)`.
  - El único caso que cambia de estado es CAL-T-244, de rojo a verde. CAL-T-248 (C-8) ya está verde con el código del árbol.
- `npx vitest run src/features/calificaciones/secciones-01d-r4.ataque.test.tsx`:
  - antes: `Tests  1 failed | 6 passed (7)`, con CAL-T-258 rojo (3 contra 1);
  - después: `Tests  1 failed | 6 passed (7)`, con CAL-T-258 rojo (3 contra 2).
  - Los otros seis casos siguen verdes. La comparación caso por caso solo difiere en el título de CAL-T-258.

**Grep del inventario de las marcas** (§D-6): `rg -l 'marcasViejas|espiarMarcas|marcas\(\)|refetchType|spyOn\([^)]*"invalidateQueries"|isInvalidated' src -g "*.ataque.test.*"` da 8 archivos.
- `gradebook-01d-r3`. Todos los casos que cuentan marcas leen el conteo antes de su `unmount`, o no pulsan ni desmontan: CAL-T-232, 233, 234, 235, 240, 241 y 246. La excepción es CAL-T-242, que cuenta después de desmontar, pero no llegó a ver la frase (la ventana rota sigue en vuelo), así que espera 0 y no cambia. Los casos que desmontan con la frase (CAL-T-237, 243 y 245) no cuentan marcas. Queda solo CAL-T-244, que es C-19.
- `secciones-01d-r4`: solo CAL-T-258, que es C-20.
- Los otros seis no cuentan marcas del gradebook:
  - `app/invalidaciones-03c2-r1` mira el `isInvalidated` de los temas;
  - `app/estado-por-id-ch6a-r1` y `-r2` usan `refetchType` como preparación;
  - `tareas/calificar-01c-r1:858-860` mira la invalidación de calificar, sin la vista;
  - `tareas/entregas-01d-r1` y `-r2` miran el trabajo.
- **C-n nuevos: ninguno.** Coincide con el inventario de la Enmienda 4.

**Lint.**
- `npx prettier --check` sobre los dos archivos: `All matched files use Prettier code style!`. No hizo falta formatear.
- `npm run lint`, desde `frontend/`, sale con código 0. Sus últimas líneas son `All matched files use Prettier code style!`, `> @campus/frontend@0.0.0 typecheck` y `> tsc -b`, que termina sin errores.

**V-01.**
- `sha256sum -c` contra `v01-ch6b-r0.txt` (`1b0e6e37…`, comprobado), desde la raíz: `286` OK y `WARNING: 2 computed checksums did NOT match`. Las dos son `gradebook-01d-r3.ataque.test.tsx` y `secciones-01d-r4.ataque.test.tsx`.
- El conjunto sigue en las mismas 288 rutas.
- Lista nueva: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\v01-ch6b-r0bis.txt`, con 288 líneas en el mismo orden y formato. Su SHA-256 es `40d6c604d6d12f93f0dc30d8eeb55ff696fd2a68c0973d3148c339f7e1f3a3fd`.

## Ronda 1 — CHORE-06b (2026-11-13)


Tester, ronda 1 de ataque de 06b. Plan vigente: `plan.md`, 1156 líneas, `201dc71f…` (Enmiendas 1 a 4b). Leí `resumen-programador.md` desde "## Implementación — CHORE-06b" hasta el final (1101 líneas), `revision.md` desde "## Verificación del resumen del programador — CHORE-06b" (con los puntos de ataque actualizados del manager), las rondas 0 y 0 bis de este reporte y el código de 06b (`git diff 023b450 -- frontend` y los archivos nuevos). Equipo conectado a la corriente (`Win32_Battery.BatteryStatus` 2). Una sola suite a la vez; la otra copia de trabajo ya no se usa (dato del orquestador).

**Al empezar.** `sha256sum -c v01-ch6b-r0bis.txt` desde la raíz: 288 de 288 `OK`. `git diff --quiet 023b450 -- frontend/src/components/foco`: limpio.

Veredicto: **ROTO**. Dos hallazgos de severidad media (T-04 y T-05), de la misma raíz: la marca de `useListaConservadaTrasLaPagina` vive en el estado del componente, es una sola y solo se toma en un render que todavía ve la dirección "hacia adelante" del fallo. Los dos son huecos del plan (la forma literal de §D-5, que el programador aplicó tal cual) con una conducta exigida que no se cumple (M-02 de la Enmienda 3b). Lo demás resiste.
Verificación propia (desde `frontend/`): lint `> tsc -b`, código de salida 0 · suite de "Regresión" de 06b: ver "Comandos" (los únicos rojos son los 13 casos de T-04 y T-05, míos).

### Hallazgos

#### T-04 — La lista conservada se reemplaza por el error si la vista se monta de nuevo con la recuperación ya en vuelo
Severidad: media (caso borde mal resuelto: un `role="alert"` y un texto de error falsos, que el lector de pantalla anuncia, mientras la recarga recupera la lista).

Pruebas (rojas contra el código de hoy), en `frontend/src/features/clases/recargas-ch6b-r1.ataque.test.tsx`:
- «ATQ-CH6-36 (%s): con la lista conservada tras un «Ver más» fallido, pulsar la sección (la recarga queda en vuelo), ir a otra sección y volver antes de que responda: la lista sigue a la vista con «Ver más» en espera y sin role=alert (M-02), sin petición nueva; al responder, sana y sin otro aviso», en 9 filas: Avisos, comentarios, Dudas, respuestas, Personas, el roster, inicio del estudiante, inicio del maestro y comentarios de un recurso. Caen en `:740` (`expect(screen.queryByRole("alert")).toBeNull()`), justo después de comprobar que no salió ninguna petición nueva (`:737`).
- «ATQ-CH6-36 (comentarios, cerrar y abrir)…» y «ATQ-CH6-36 (respuestas, cerrar y abrir)…»: el mismo estado por el camino "cerrar y abrir el bloque" (CH6-B06). Caen en `:802`.
- Control, en verde: «ATQ-CH6-36 (un tema de Actividades, con signal; control)…».

Esperado / obtenido. Esperado (§D-5, Enmienda 3b, M-02: "la lista sigue a la vista durante esa recarga… no aparece ningún `role="alert"` ni texto de error, y el foco no se mueve"; CH6-B10 y punto de ataque 4 bis, "por cada camino"): mientras vuela la recarga que recupera la lista conservada, la lista y «Ver más» en espera. Obtenido: al volver, la lista está reemplazada por el `MensajeError` (título «Error» y el texto del `500` de la página) hasta que llega la respuesta; ninguna petición nueva (la misma recarga sigue en vuelo).

Mecanismo (`features/clases/hooks.ts:1341-1353`):
- `useListaConservadaTrasLaPagina` guarda la marca en un `useState` (`:1349`) y solo la toma en un render en que `conservaLaListaTrasLaPagina` es verdadera, es decir, con `isFetchNextPageError` (`fetchMeta.fetchMore.direction === "forward"`).
- La recuperación que lanza PR-1 (`refetch({ cancelRefetch: false })`) despacha `fetch` sin `meta`: `fetchMeta` pasa a `null` (`query.js:354-357`) y `status` sigue en `"error"` con el mismo `errorUpdateCount`.
- Las 8 consultas sin `signal` siguen en vuelo sin observadores al desmontarse la vista (la librería solo cancela el reintento). Al montarse de nuevo, el estado nace en `null`, ningún render ve ya la dirección y `marca !== actual`: `conserva` es falso y la rama de error (`isError && !conserva`) pinta el `MensajeError`.
- "Por qué funciona en cada camino" de §D-5 supone que "el render que precede a la recarga ve todavía `fetchMeta` hacia adelante". Eso vale cuando la recarga empieza con la vista montada (pulsar, invalidar) o con el montaje (el observador la pide y el resultado optimista todavía trae la dirección). No vale cuando la vista se monta con la recarga ya en vuelo.
- Confirmación (MT16, mutación informativa): con `return ahora || isError` (conservar ante cualquier error), las 11 filas de ATQ-CH6-36 pasan; la aserción que cae es exactamente la decisión de `conserva`.
- El tema de Actividades no cae (el control): `useTrabajo` consume `signal`, salir aborta la recarga y la revierte al estado anterior, que todavía tiene la dirección; el montaje la pide otra vez y el resultado optimista toma la marca.

Requisito o regla violada: §D-5 (Enmienda 3b, M-02) y CH6-B10; `AGENTS.md`, "Toda frase de recuperación…" (el aviso «Algo salió mal. Inténtalo de nuevo.» por los caminos "otra sección y regreso" y "cerrar y abrir" después de pulsar). Clase: **hueco del plan** (la forma literal de §D-5 no cubre el montaje con la recuperación ya en vuelo), con conducta visible incorrecta.

Hermanos y estados vecinos que conviene revisar (mismo mecanismo, sin caso propio): volver de otra sección dos veces seguidas (la recarga del primer regreso sigue en vuelo); la invalidación por comentar seguida de salir y volver; el salto de clase en las listas que se montan de nuevo por su `key` (Personas, el roster, comentarios, respuestas, el tema) con la renovación de la clase de destino ya en vuelo; cualquier invalidación de la clave desde otra vista mientras la lista conservada está desmontada. No afectados: los temas de Recursos y de Actividades y Recursos (un tema), que conservan por otra regla (con datos), y el tema de Actividades (por `signal`).

#### T-05 — Con dos listas conservadas en la misma vista que sobrevive al salto de clase, la marca de una pisa la de la otra
Severidad: media.

Pruebas (rojas): «ATQ-CH6-37 (%s): A y B conservadas tras un «Ver más» fallido; saltos A → B → A con las dos renovaciones en vuelo: al volver a A, su lista sigue a la vista mientras vuela su renovación, sin role=alert (M-02)», en Avisos y Dudas, mismo archivo. Caen en `:864`, después de comprobar que no salió ninguna petición nueva de A (`:863`).

Esperado / obtenido. Esperado (M-02 y punto de ataque 4 bis: "A → B → A → B" y "la recarga que recupera una lista conservada, por cada camino (pulsar, volver, el salto, el regreso…)"): al regresar a A con su renovación en vuelo, la lista de A a la vista, sin `role="alert"`. Obtenido: el `MensajeError` de A mientras vuela su renovación.

Mecanismo: `MuroDeLaClase` y `DudasDeLaClase` sobreviven al cambio de clase, y la marca es una sola (`useState<string | null>`, `hooks.ts:1349`). Secuencia del caso: A conservada y B conservada; salto a A (el render optimista ve la dirección: marca `A:n`; renovación de A retenida); salto a B (marca `B:m`, que pisa la de A; renovación de B retenida); salto a A con su renovación todavía en vuelo (`fetchMeta` en `null`): `marca` es `B:m`, distinta de `A:n`, y `conserva` es falso. La clave de la marca (Regla de la clave, N-05) evita el falso positivo de llevar la marca de una clase a otra, pero con un solo hueco provoca este falso negativo. El plan escribe "su estado guarda `{ clave, errorUpdateCount }`… y solo lo usa si la clave es la misma" (§D-4, Regla de la clave): un solo par. MT16 (conservar ante cualquier error) también deja en verde los dos casos.

Requisito o regla violada: §D-5 (M-02) y DH-10 en la vista que sobrevive al salto. Clase: **hueco del plan**, misma raíz que T-04 (la marca vive en el componente y solo se toma cuando un render ve la dirección). Hermanos: ninguna otra lista que use este gancho sobrevive al salto (los bloques de Recursos y de Actividades conservan por otra regla). Estado vecino: el mismo pisado con saltos entre tres clases.

### Atacado sin hallazgos
Por punto de ataque (los del manager, en su orden, más los del plan). Todos en verde contra el código de hoy, salvo los de T-04 y T-05.
1. **`useListaConservadaTrasLaPagina` en secuencias.**
   - Fallo de página con `500` y recuperación que falla con un `4xx`: «ATQ-CH6-39 (%s, %s)…», 10 casos (`403 SIN_ACCESO_A_LA_CLASE` en las 8 listas de clase, y `404 PUBLICACION_NO_ENCONTRADA` en los comentarios de una publicación y de un recurso): la lista se reemplaza por su error («Esa publicación ya no existe.», un solo mensaje, en el `404`), sin aviso nuevo y sin «Ver más».
   - Una mutación que invalida y falla con el foco en una fila: la cubre ya «CH6-B10 (%s, foco en una fila)» del programador, que leí; no la repetí.
   - El reflejo de N-05 en Dudas: «ATQ-CH6-38 (Dudas)…»: B muestra su `MensajeError` mientras vuela su renovación (la clave de la marca separa A de B).
   - A → B → A → B con las dos conservadas: es T-05.
   - El `400` del cursor después de una lista conservada: «ATQ-CH6-40 (%s)…», 10 casos (las 9 listas y los comentarios de un recurso): la frase del cursor reemplaza la lista, sin aviso nuevo; pulsar la sección pide una vez, sin `cursor`, y la frase desaparece.
2. **CH6-B13 sin vecina:** «ATQ-CH6-41 (Avisos)…» (la única publicación: el foco, que estaba en el campo del comentario, va al `h2` «Avisos») y «ATQ-CH6-41 (un recurso)…» (el único recurso de la sección: el foco va a un encabezado). Nunca a `<body>`.
3. **El gradebook por la dimensión de tareas**, en `frontend/src/features/calificaciones/gradebook-ch6b-r1.ataque.test.tsx`: «ATQ-CH6-46 (f)», «(g)» y «(h)» (la frase en la ventana de tareas, «Tareas más recientes» y después pulsar, salir y volver, o saltar a B y regresar: WT queda `isInvalidated` y «Tareas más antiguas» la pide una vez); «ATQ-CH6-47» (las dos dimensiones a la vez: una sola pulsación deja las dos ventanas `isInvalidated` con una sola marca, y cada una se pide al avanzar); «ATQ-CH6-48» (una segunda ocurrencia después de marcar la primera se marca otra vez y la ventana se pide). El reloj (solo `Date`) avanza un segundo entre respuestas, como el tiempo real entre dos clics (O-10).
4. **`StrictMode`:** «ATQ-CH6-42 (%s)…» en las 9 listas y los comentarios de un recurso (un solo aviso, una sola petición de recuperación, la lista a la vista mientras vuela); «ATQ-CH6-42 (comentarios con 404, StrictMode)…» (una sola renovación de Avisos, un solo mensaje, sin aviso); «ATQ-CH6-49» en el gradebook (marca WT y la ventana se pide una sola vez, sin aviso).
5. **Comentarios dentro de Recursos:** la fila "comentarios de un recurso" de ATQ-CH6-39, ATQ-CH6-40 y ATQ-CH6-42 (lista conservada, «Ver más» con `500` y con el `400` del cursor, pulsar «Recursos»). Salir y volver con la recuperación en vuelo es T-04.
6. **DH-10 con una página en vuelo:** «ATQ-CH6-43 (%s, la página de A falla ya en B)…» (ningún aviso ni mensaje en B; al volver a A, la lista se ve mientras se pide y no se avisa, R8) y «ATQ-CH6-43 (%s, B pidiendo una página al llegar)…» (la página de B falla ya en B: un solo aviso, el de B, la lista se queda y «Ver más» sale de la espera). En Avisos y Dudas.
7. **`listaTraeLaClase` con formas raras:** «ATQ-CH6-44 (%s): no lanza y devuelve falso» (15 formas: `null`, `undefined`, número, cadena, arreglo suelto, `{}`, `pages` sin arreglo, `undefined` o vacío, páginas raras, filas sin `id`, `id` de otro tipo, `clases` no arreglo o `null` en la barra, otra clase); «…(una forma válida junto a inesperadas)…»; «…(el gancho)…» (una consulta con forma inesperada y otra en error sin datos bajo `CLAVE_CLASES_INSCRITAS` no se invalidan al leer A archivada; la barra se pide una vez). El alumno con el inicio en caché y la barra ya respondida: «ATQ-CH6-45» (A archivada → B → A: la barra una sola vez, el inicio `isInvalidated` sin pedirse y, al volver, se pide una vez y ya no trae a A).
8. **Frases de recuperación por camino:** la frase del cursor por "repetir el control" tras una lista conservada (ATQ-CH6-40) y el aviso de «Ver más» por "cerrar y abrir" (T-04). El resto de la tabla del programador lo leí contra sus casos y no encontré otro camino sin caso.
9. **Avisos y recargas (§D-7):** en mis casos cuento avisos (uno por fallo, nunca de la clase anterior) y peticiones (ninguna duplicada ni cancelada; la recarga en vuelo no se repite al volver: `:737`, `:863`).
10. **Regresiones de 06a:** los tres `app/estado-por-id-ch6a-r*.ataque.test.tsx` y las pruebas normales de 06a están en verde en la suite de "Regresión" (abajo).

### Observaciones (sin prueba roja)
- **O-10 · La ocurrencia de la frase del gradebook no lleva la ventana** (por lectura de `gradebook-view.tsx:99-103`). `vacia:<dataUpdatedAt>` y `cursor:<errorUpdatedAt>:<errorUpdateCount>` no dicen de qué ventana son: dos ventanas que respondieran en el mismo milisegundo darían la misma ocurrencia, y la segunda contaría como "ya marcada" (`fraseMarcadaRef`). Con el reloj real no se alcanza: entre dos respuestas hay al menos un clic. Pero las pruebas del gradebook fijan `Date` (CAL-T-191), así que una prueba futura con dos ventanas vacías sin avanzar el reloj podría dar un rojo o un verde engañoso. Por eso ATQ-CH6-46 a 49 avanzan un segundo entre respuestas. No es hallazgo.
- **O-11 · ATQ-CH6-42 (comentarios con 404, StrictMode) y ATQ-CH6-43 (B pidiendo una página al llegar) son regresión, no vigilan una guarda nuestra propia:** la primera la sostiene `fallosVistos` de `useRenovarSiLaPublicacionYaNoEsta` (nace con el contador, como dijo el manager) y la segunda, que el aviso cuenta el `errorUpdateCount` de la consulta a la vista; ninguna de las dos tiene una línea que quitar sin tocar también lo que vigilan las mutaciones del programador (M08, D4). Lo declaro así, sin mutación propia.

### Mis mutaciones
Con `scratchpad/r1b/mut.py`: copia del archivo real en `scratchpad/r1b/bak/`, reemplazo de una sola aparición exacta (si aparece 0 o más de 1 vez, no muta), la corrida con `-t` (salida en `scratchpad/r1b/mut/<id>.txt`) y la restauración desde la copia, comparada byte a byte (`filecmp.cmp(…, shallow=False)`, el equivalente de `cmp`). Nunca `git checkout`, `git restore` ni `git stash`. Solo archivos de "Se toca" de 06b; ninguno de "No se toca". Antes guardé el SHA-256 de los 19 archivos de producción de 06b (`scratchpad/r1b/prod-antes.sha`); al terminar, `sha256sum -c` dio 19 de 19 `OK`, y `git diff --quiet 023b450 -- frontend/src/components/foco` sigue limpio.

| Id | Archivo (bajo `frontend/src/`) | Qué cambié | Cae | cmp |
|---|---|---|---|---|
| MT16 | `features/clases/hooks.ts` | `return ahora \|\| (isError && marca === actual)` → `return ahora \|\| isError` (informativa: conservar ante cualquier error) | ATQ-CH6-38, los 10 de ATQ-CH6-39 y los 10 de ATQ-CH6-40 (`21 failed \| 13 passed`); **pasan** los 11 de ATQ-CH6-36 y los 2 de ATQ-CH6-37: la decisión de `conserva` es exactamente lo que cae en T-04 y T-05 | igual |
| MT17 | ídem | la marca sin la clave (`` `${String(errorUpdateCount)}` ``) | ATQ-CH6-38 (Dudas) | igual |
| MT18 | `features/calificaciones/gradebook-view.tsx` | el efecto que enciende la frase copia también el `null` ("se ve ahora", como G4) | los 6 del gradebook: ATQ-CH6-46 (f), (g) y (h), 47, 48 y 49 | igual |
| MT19 | ídem | la frase se enciende una sola vez por montaje (`fraseMarcadaRef.current !== null` en lugar de compararla con la ocurrencia) | ATQ-CH6-48 | igual |
| MT20 | `features/clases/lib.ts` | `traeLaClaseEnSusFilas` sin la guarda de objeto no nulo | ATQ-CH6-44 (filas sin `id`: lanza) y (una forma válida junto a inesperadas) | igual |
| MT21 | `features/clases/hooks.ts` | el `predicate` de `renovarLasListasSiTraenLaClase` → `() => true` | ATQ-CH6-44 (el gancho) | igual |
| MT22 | `features/clases/muro-view.tsx` | sin el foco al `h2` cuando no hay vecina | ATQ-CH6-41 (Avisos) | igual |
| MT23 | `features/clases/components/seccion-de-recursos.tsx` | sin el foco al encabezado cuando no hay vecina | ATQ-CH6-41 (un recurso) | igual |
| MT24 | `features/clases/muro-view.tsx` | la `clave` del aviso del fallo de la página → `"constante"` | ATQ-CH6-43 (Avisos, la página de A falla ya en B): al volver a A sale el aviso del fallo ocurrido en B | igual |
| MT25 | `features/clases/hooks.ts` | `useListaConservadaTrasLaPagina` devuelve solo `ahora` | los 10 de ATQ-CH6-42 en las listas (StrictMode) | igual |
| MT26 | `features/clases/hooks.ts` | el `predicate` → `() => true` | ATQ-CH6-45 | igual |

Redundancias declaradas: O-11 (dos casos de regresión). ATQ-CH6-36 (control con `signal`) no vigila una guarda: fija el mecanismo por el que el tema de Actividades no cae en T-04.

### Archivos nuevos
| Archivo | Líneas | SHA-256 | Casos (`npx vitest list`, `grep -a -c "> ATQ-CH6-"`) |
|---|---|---|---|
| `frontend/src/features/clases/recargas-ch6b-r1.ataque.test.tsx` | 1283 | `0de8cfbe2fabc5716d96f3885ddfa017c6eff7b1c524e1fcbfadfed51214e5a0` | 70: ATQ-CH6-36 (12), 37 (2), 38 (1), 39 (10), 40 (10), 41 (2), 42 (11), 43 (4), 44 (17) y 45 (1). Rojos: 13 (T-04: 11; T-05: 2) |
| `frontend/src/features/calificaciones/gradebook-ch6b-r1.ataque.test.tsx` | 395 | `8d54e7b8d7801e1517259470106c1dcfb38e9f40edd734506724c430a052c658` | 6: ATQ-CH6-46 (3), 47, 48 y 49. Todos en verde |

Total: 76 casos (`grep -a -c "> ATQ-CH6-"` sobre la lista de los dos archivos). Mismo arnés que las pruebas del programador (router real, `defaultOptions` de `app/providers.tsx`, `fetch` doblado y peticiones retenidas); sin selectores de estilo; toda prueba con aserciones y sin `return` temprano. No toqué código de producción (salvo las mutaciones, restauradas), pruebas normales ni otras `*.ataque`. Prettier solo sobre mis dos archivos.

### Comandos (desde `frontend/`, uno a la vez)
| Comando | Última línea |
|---|---|
| `npx vitest run src/features/clases/recargas-ch6b-r1.ataque.test.tsx` | `Tests  13 failed \| 57 passed (70)` (`Test Files  1 failed (1)`) |
| `npx vitest run src/features/calificaciones/gradebook-ch6b-r1.ataque.test.tsx` | `Tests  6 passed (6)` |
| `npx prettier --write` (mis dos archivos) y `npm run lint` | `> tsc -b`, código de salida 0 (antes, `All matched files use Prettier code style!`) |
| `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` | `Tests  13 failed \| 5464 passed (5477)` (`Test Files  1 failed \| 241 passed (242)`; `Duration  313.85s`). Son los 5401 de la corrida del manager más mis 76. Los 13 rojos son todos de `recargas-ch6b-r1.ataque.test.tsx` (T-04 y T-05); ningún rojo del programador ni de otra prueba |
| `npx vitest list` de mis dos archivos, contado con `grep -a -c "> ATQ-CH6-"` | 76 |

### V-01
- `sha256sum -c v01-ch6b-r0bis.txt`, al empezar: 288 de 288 `OK`. Al terminar, las 288 líneas de la lista anterior aparecen idénticas en la nueva (`comm -23` vacío): ninguna `*.ataque` anterior cambió.
- Lista nueva: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\v01-ch6b-r1.txt`, 290 líneas (185 en `frontend/` y 105 en `backend/`), mismo formato (`sha256sum -b`) y orden (`LC_ALL=C`). Se suman solo mis dos archivos. SHA-256: `8baa92090a98b987bcac165b5ec3eac071494b64ce7d284e53658e5cac2f806b`.

### No atacado y por qué
- Los hermanos de T-04 que nombro ("volver dos veces", la invalidación por comentar y salir, el salto en las listas con `key`): comparten el mecanismo exacto de los 11 casos rojos y no agregarían información; quedan para la corrección.
- La comprobación en un navegador real (historial, lector de pantalla, corte de red): no verificada; la decide el humano al cerrar 06b (DH-07).
- La suite completa del frontend y `npm run build`: van en la revisión final del manager.
- Lo que el plan deja fuera (DH-04, DH-05, R-12, la descarga de `components/adjuntos`): decisiones tomadas.

## Ronda 2 — CHORE-06b (2026-11-14)


Tester, ronda 2 de ataque de 06b. Plan vigente: `plan.md`, 1302 líneas, `73861b13…` (Enmienda 5). Leí la nota de la Enmienda 5, §D-5 "(Enmienda 5, T-04 y T-05) La marca es de la consulta", CH6-B18 (e) y CH6-B19; `revision.md` desde "## Verificación de la Enmienda 5" (con O-01) y "## Verificación de la corrección de la ronda 1"; y el gancho nuevo (`features/clases/hooks.ts:1338-1365`). **Equipo a batería** (`Win32_Battery.BatteryStatus` 1): corrí igual. Una sola suite a la vez.

**Al empezar.** `sha256sum -c v01-ch6b-r1.txt`: 290 de 290 `OK`. `git diff --quiet 023b450 -- frontend/src/components/foco`: limpio. Mis dos archivos de la ronda 1, uno a la vez: `Tests  70 passed (70)` y `Tests  6 passed (6)`; los 13 de T-04 y T-05 están en verde sin tocarlos.

Veredicto: **RESISTE**. Ningún hallazgo nuevo. T-04 y T-05 quedan corregidos.

### Hallazgos
Ninguno.

### Atacado sin hallazgos
Archivo: `frontend/src/features/clases/recargas-ch6b-r2.ataque.test.tsx` (arnés de la ronda 1, con una segunda publicación, una segunda duda y un segundo tema de Actividades, cada uno con sus propias filas). Por punto de ataque:
1. **La marca y la vida de la caché.** `removeQueries` con la vista en otra sección lo cubre CH6-B19 (f) del programador, y `resetQueries` con contador repetido, CH6-B18 (e); vencer el `gcTime` y `clear()` sacan la instancia de la caché por el mismo camino, así que no escribí caso propio (ver "No atacado"). "La misma instancia con otro error después": «ATQ-CH6-53 (%s, otra vez «Ver más»)» (abajo).
2. **Carreras.**
   - «ATQ-CH6-50 (%s, O-01)» (Avisos y Dudas): el fallo de la página y una invalidación de la misma clave en el mismo lote (la invalidación se lanza desde el suscriptor de la caché, en el mismo despacho del `error`). Resultado: solo el `MensajeError` mientras vuela la recarga, **ningún aviso**, el foco (que estaba en «Ver más») va al `h2` y nunca a `<body>`; al responder bien, la lista sin aviso y sin petición de más. Es la conducta aceptada de O-01.
   - «ATQ-CH6-50 (%s, salir en el mismo act en que falla la página)»: el reintento de la página falla en el mismo `act` en que la persona sale; a lo más un aviso, y al volver la lista conservada se ve mientras se pide, sin `role="alert"` ni aviso nuevo.
   - «Ver más» que vuelve a fallar con otra vista de la misma consulta montada: ninguna de las 9 listas tiene dos vistas de la misma consulta montadas a la vez en la app; lo cubre CH6-B18 (e) "dos ganchos a la vez" a nivel del gancho.
3. **Claves cruzadas:** «ATQ-CH6-51 (%s)», en tres variantes: dos publicaciones con los comentarios abiertos, dos dudas con las respuestas abiertas y dos temas de Actividades. El primero conserva su lista tras un «Ver más» con `500`; el segundo pierde la suya por una recarga con `503` y muestra su error; al pulsar la sección con las dos recargas retenidas, el primero se ve con «Ver más» en espera y el segundo sigue con su error; al responder, los dos sanos y un solo aviso. La marca de uno no conserva ni reemplaza al otro.
4. **La clase que pasa a archivada:** «ATQ-CH6-52 (%s)» (Avisos y Dudas): con el foco en «Ver más» de la lista conservada, la recuperación responde `409 CLASE_ARCHIVADA`: la lista se reemplaza, aparece «Clase archivada el …», ningún aviso nuevo y el foco no queda en `<body>`.
5. **Lo que siguió de la ronda 1:**
   - «ATQ-CH6-53 (%s, otra vez «Ver más»)» en las 9 listas y los comentarios de un recurso: conservada y recuperada, un segundo «Ver más» con `500` la conserva con un aviso nuevo; después, el `400` del cursor la reemplaza por su frase sin aviso; pulsar la pide sin `cursor` y la frase desaparece.
   - «ATQ-CH6-53 (%s, StrictMode y montaje nuevo con la recuperación en vuelo)» (Avisos, comentarios, inicio del estudiante): el camino de T-04 con `StrictMode`.
   - «ATQ-CH6-53 (%s, «Inicio» tres veces seguidas)» (los dos inicios): con la recuperación en vuelo, dos pulsaciones más no piden ni reemplazan nada (la navegación a la misma ruta, que es lo que hace el enlace «Inicio» de la barra).
6. **Hermanos del remedio, atacando:**
   - «ATQ-CH6-54 (Recursos (un tema))»: el camino de T-04 en la lista que conserva por otra regla: se ve, sin `role="alert"`.
   - «ATQ-CH6-54 (comentarios, el 404 llega con el bloque cerrado)»: `useRenovarSiLaPublicacionYaNoEsta` (memoria del componente) con el `404` llegado sin el bloque montado: al abrirlo otra vez, la lista de Avisos se renueva una vez y la fila sale, sin aviso.
   - Las refs del gradebook: mis ATQ-CH6-46 a 49 de la ronda 1 siguen en verde.
   - No encontré otro gancho de 06b con memoria del componente o compartida entre claves que se rompa.

### Observaciones (sin prueba roja)
- **O-12 · O-01 confirmada y acotada** (ATQ-CH6-50, O-01): cuando el fallo de la página y una invalidación caen en el mismo lote, la persona ve el `MensajeError` y **ningún** aviso (un solo mensaje, el foco en el `h2`). Es lo aceptado; no hay aviso doble ni foco en `<body>`.
- **O-13 · Casos de regresión sin guarda propia** (con su mecanismo): ATQ-CH6-50 (O-01) y ATQ-CH6-53 (otra vez «Ver más») fijan conducta aceptada que sostienen la librería y guardas que ya vigilan las mutaciones del programador (M06, M07, D4); ATQ-CH6-54 (Recursos (un tema)) fija la regla de `seccion-de-recursos.tsx`, anterior a 06b. MT27 no los hace caer porque el registro de un error de recarga en el efecto no provoca otro render antes de las aserciones.

### Mis mutaciones
Con `scratchpad/r2b/mut.py` (el de la ronda 1): copia, reemplazo de una sola aparición exacta, la corrida con `-t` y restauración desde la copia comparada byte a byte. Nunca `git`. Solo archivos de "Se toca". Antes y después, `sha256sum -c` de los 19 archivos de producción: 19 de 19 `OK`; `components/foco` sigue limpio.

| Id | Archivo (bajo `frontend/src/`) | Qué cambié | Cae | cmp |
|---|---|---|---|---|
| MT27 | `features/clases/hooks.ts` | el efecto registra la marca ante cualquier error (sin `!ahora`) | ATQ-CH6-51 (las 3) y ATQ-CH6-52 (las 2) | igual |
| MT28 | ídem | la marca en una memoria del componente (`useRef(new WeakMap())`, la forma de antes de la Enmienda 5) | ATQ-CH6-53 (StrictMode y montaje nuevo), las 3 | igual |
| MT29 | `components/seccion/hooks.ts` | PR-3: sin `isFetching` y con `refetch()` | ATQ-CH6-53 («Inicio» tres veces seguidas), los 2 | igual |
| MT30 | `features/clases/hooks.ts` | `useRenovarSiLaPublicacionYaNoEsta` sin renovar Avisos | ATQ-CH6-54 (comentarios, el 404 llega con el bloque cerrado) | igual |

Redundancias declaradas: O-13.

### Archivos nuevos
| Archivo | Líneas | SHA-256 | Casos (`npx vitest list`, `grep -a -c "> ATQ-CH6-"`) |
|---|---|---|---|
| `frontend/src/features/clases/recargas-ch6b-r2.ataque.test.tsx` | 1173 | `ff19e86e421a6a305e7041c89cfd3fe69c77fe7390688ff5add84b2ed3e745dd` | 26, todos en verde: ATQ-CH6-50 (4), 51 (3), 52 (2), 53 (15) y 54 (2) |

No toqué producción (salvo las mutaciones, restauradas), pruebas normales ni otras `*.ataque` (tampoco las mías de la ronda 1). Prettier solo sobre mi archivo. Sin selectores de estilo; toda prueba con aserciones y sin `return` temprano.

### Comandos (desde `frontend/`, uno a la vez)
| Comando | Última línea |
|---|---|
| `npx vitest run src/features/clases/recargas-ch6b-r1.ataque.test.tsx` | `Tests  70 passed (70)` |
| `npx vitest run src/features/calificaciones/gradebook-ch6b-r1.ataque.test.tsx` | `Tests  6 passed (6)` |
| `npx vitest run src/features/clases/recargas-ch6b-r2.ataque.test.tsx` | `Tests  26 passed (26)` |
| `npm run lint` | `> tsc -b`, código de salida 0 |
| `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` | `Tests  5517 passed (5517)` (`Test Files  243 passed (243)`; `Duration  336.48s`): los 5491 de la corrida del manager más mis 26 |

### V-01
- Al empezar, `sha256sum -c v01-ch6b-r1.txt`: 290 de 290 `OK`. Al terminar, las 290 líneas anteriores aparecen idénticas en la lista nueva (`comm -23` vacío).
- Lista nueva: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\v01-ch6b-r2.txt`, 291 líneas (186 en `frontend/` y 105 en `backend/`), mismo formato y orden. Se suma solo mi archivo de esta ronda. SHA-256: `b4ec4372768f0e5a6e13e57eda3d3779fc5f543d2858e5e5530acd304c04fe75`.

### No atacado y por qué
- Vencer el `gcTime` y `clear()` al cambiar de sesión: los dos sacan la instancia de la caché, el mismo camino que `removeQueries` (CH6-B19 (f)); esperar 5 minutos reales o bajar el `gcTime` del cliente no agrega conducta nueva, y al cambiar de sesión la vista se desmonta.
- Dos `QueryClient` en la misma página: no se alcanza en la app; lo cubre CH6-B18 (e).
- El salto a una clase archivada con su lista conservada en caché: el detalle de la clase de destino, fresco en caché, no se vuelve a pedir, así que la vista no sabe que se archivó hasta que algo lo marque viejo; es conducta anterior a 06b (`useDetalleViejoAnteClaseArchivada`, "No se toca"). El caso con el `409` en la recuperación sí está (ATQ-CH6-52).
- La comprobación en un navegador real: no verificada; la decide el humano (DH-07). La suite completa y `build`: van en la revisión final del manager.
