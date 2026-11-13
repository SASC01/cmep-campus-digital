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
