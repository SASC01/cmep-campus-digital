# Reporte del Tester — CLASES-01 · clases, personas y muro

> **Nota de transcripción (orquestador, 2026-09-29).** La sección "CLASES-a — Ronda 0" la escribió el tester y la entregó en su respuesta final, porque la herramienta de escritura de su sesión rechazó crear este archivo ("los subagentes no escriben archivos de reporte"). Es el caso previsto en `docs/ESTADO.md` §4: el orquestador la registra tal cual, sin cambios de contenido. Antes de transcribirla, el orquestador verificó: `git status --porcelain -- shared backend frontend` lista exactamente los 7 archivos `*.ataque` del reporte y ningún otro; hay 64 `*.ataque` en los dos paquetes; los SHA-256 de los 7 archivos tocados coinciden con la tabla; y las últimas líneas de `frontend-test.txt` y `backend-test.txt` del scratchpad son `Tests 2 failed | 1005 passed (1007)` y `Tests 1 failed | 932 passed (933)`.

## CLASES-a — Ronda 0
Veredicto: no aplica (ronda 0: adaptación de las `*.ataque` existentes a C-1 a C-10 y C-14 de §D-R0; no cuenta en el tope de 3).
Verificación propia: lint frontend OK · lint backend OK · test frontend 2 rojos esperados / 1005 verdes · test backend 1 rojo esperado / 932 verdes.

Base `<R>` = `3399c79`. Rama `feat/clases`. Fecha: 2026-09-29.

### Precondiciones
- **Árbol limpio dentro de los paquetes:** `git diff --name-only 3399c79 -- shared backend frontend` y `git status --porcelain -- shared backend frontend` vacíos antes de empezar. Fuera de los paquetes, solo `docs/ESTADO.md`, `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md` y `docs/trabajo/CLASES-01-clases-y-muro/`. El intento anterior interrumpido no dejó nada.
- **V-01:** SHA-256 de las 64 `*.ataque` iguales a la tabla de "AUTH-03c — Ronda 2" de `docs/trabajo/AUTH-03-ajustes-de-cuentas/reporte-tester.md` (64/64, comparación por programa).
- **PA-01:** `Get-NetFirewallRule -DisplayName 'Campus: bloquear entrada a Docker en redes publicas'` → `Enabled: True`, `Direction: Inbound`, `Action: Block`, `Profile: Public`. `Get-NetConnectionProfile` → `IZZI-F281`, `NetworkCategory: Public`, declarada de confianza por el humano. Backend permitido.
- **PA-02:** no se activó.

### Inventario: casos contradichos y qué se hizo con cada C-n
| C-n | Archivos y casos | Acción |
|---|---|---|
| C-1 | `backend/test/guarda-r2.ataque.test.ts:99` (antes `:94`), "una ruta con pertenencia responde 501 y sin token 401" | Solo el título y un comentario: sus aserciones ya pedían 401 sin token (GET y HEAD), no 501, y §D-0.3 dice que una ruta con pertenencia y sin `:claseId` sigue arrancando. Queda **en verde** hoy y después. Con token responderá `500 CLASE_AUSENTE`: lo cubre PR-A06d |
| C-2 | `backend/test/sesiones-y-cadena.ataque.test.ts:457` (antes `:449`), "bajo /api solo existen las rutas de …" | Se agregan las 12 rutas de CLASES-a de V-06 (`POST /api/clases`; `GET` y `HEAD` de `/inscritas` y `/impartidas`; `POST /unirse`; `GET`, `HEAD` y `PUT` de `/:claseId`; `GET`, `HEAD` y `POST` de `/:claseId/codigo`), en el orden exacto de `sort()` (verificado con Node). La protección se reformula sin debilitarse: ninguna ruta crea admins; solo las tres de hoy crean maestros. **Rojo esperado** hasta que existan las rutas |
| C-3 | Ninguno. Busqué `claseId`, `/clases/:` y `:clase` en todas las `*.ataque` de los dos paquetes: sin coincidencias. `guarda-r2` registra `/x`, `/clase`, `/reordenada`, `/incompleta`, `/con-hook`; `nombres-guarda-r3`, `/con-hook`, `/tres`, `/posterior`. Ninguna lleva `:claseId` ni `/clases/:` | — |
| C-4 | `frontend/src/app/sesion-r2.ataque.test.tsx:109, 180, 190, 205, 214` (antes `:103, 174, 184, 199, 208`); `frontend/src/app/router.ataque.test.tsx:97, 160` (antes `:91, 154`); `frontend/src/app/marco-r1.ataque.test.tsx:146, 152, 158` (tabla del `it.each`, antes `:136-137`), `:239` y `:287` (antes `:217` y `:264`) | `findByRole("heading", { name: "Hola, X" })` → `findByText("Hola, X")`. En `marco-r1` la tabla pasa de `titulo` a una función `identidad`: `findByText` para estudiante y maestro y `findByRole("heading", { name: "Cuentas" })` para el admin, que conserva su encabezado. Negativas (`queryByText(/Hola,/)`, `queryByText("Ana López")`) y conteos de `/refrescar` y `/me` intactos. **En verde hoy** (el `h1` actual de `BienvenidaView` tiene como único nodo de texto "Hola, X") y después, si el `<span>` dice exactamente "Hola, \<nombre\>" como manda §D-A5 |
| C-5 | Ninguno. Ninguna `*.ataque` cuenta **todas** las llamadas a `fetch` al llegar a `/estudiante` o `/maestro`, y ningún doble lanza ante una ruta desconocida en un caso que aterrice en un inicio. Análisis por doble más abajo | — |
| C-6 | Ninguno. `cache-03a-r1` y `sesion-r2` solo afirman ausencias en la caché, no que otra consulta sobreviva a un login. Ninguna prueba estática lista los archivos de `services/` de forma cerrada | — |
| C-7 | `frontend/src/styles/clases-r1.ataque.test.ts:90` (antes `:82`), "V-06: … 25 enEspera" | De 20 a 25: la lista fija suma `formulario-unirse-clase.tsx` 1, `formulario-clase.tsx` 1, `panel-mis-clases.tsx` 1 y `codigo-de-clase.tsx` 2 (en `features/clases/components/`). **Rojo esperado** hasta que existan los archivos |
| C-8 | `frontend/src/styles/clases-r1.ataque.test.ts:154` (antes `:134`), "V-07: vidrio, vidrio fuerte y vidrio azul …" | `vidrio-fuerte` suma `bloque-destacado.tsx` y `tarjeta-clase.tsx`; `vidrio-azul` pasa de "ninguna línea" a "exactamente `bloque-destacado.tsx`" (`rutasDe`, igualdad exacta). `vidrio` sin variante y `data-material`/`data-densidad` no cambian. **Rojo esperado** |
| C-9 | `frontend/src/styles/tokens-r1.ataque.test.ts:118` (antes `:112`), "escala tipográfica de §4" | La tabla de §4 de `DESIGN.md` deja de contarse como "7 filas" y pasa a conjunto cerrado: los 7 tokens de hoy en su orden, más a lo sumo una fila `--text-display-compacto` (§D-A8 dice "nota de implementación": puede ser fila o texto), y ningún otro. Si la fila existe, sus cuatro valores se comparan con `tokens.css`, incluido el peso 700. **En verde hoy**, y no depende de cómo redacte la nota el programador |
| C-10 | Ninguno. `BienvenidaView`, `bienvenida-view`, `TEXTOS_SESION`, `saludo`, `proximamente`: sin coincidencias en `*.ataque` | — |
| C-14 | Ninguno (`addHook` no aparece en ninguna lista cerrada de `*.ataque`) | — |

### Casos fuera del inventario del arquitecto
Ninguno contradicho por un C-n que el plan no listara. Revisados de más y **no tocados**:
- `frontend/src/app/marco-r1.ataque.test.tsx:355` (`getAllByText(nombre, { exact: true })` = 1): el `<span>` "Hola, Ana López" no coincide con "Ana López" exacto (el comparador usa los nodos de texto directos), así que solo cuenta la barra superior. Si el programador partiera el nombre en su propio elemento, fallaría: protección legítima, no contradicción (§D-A5: "un `<span>` que dice exactamente `Hola, <nombre>`").
- `frontend/src/app/marco-r1.ataque.test.tsx:513-540` (`textosSueltos()` en `/estudiante` y `/maestro`): todo texto debe colgar de una `Card` o de `vidrio`/`vidrio-fuerte`/`vidrio-azul` o un fondo sólido de token. §D-A5 pone todo dentro de `BloqueDestacado` (vidrio azul) o `Card`: no contradicho; un texto directo sobre los orbes lo pondría en rojo, y eso protege.
- `frontend/src/app/fondo-r1.ataque.test.tsx:131-133` (`/estudiante/clases` y `/maestro/admin` **no** se mueven): coincide con §D-A8 §7.1 y `components/layout/**` está en "No se toca".
- `frontend/src/app/cuentas-r1.ataque.test.tsx:207-208` (restringido con cambio pendiente: ninguna petición fuera de `/api/auth/` y `/api/me`): termina en `/acceso-restringido` sin montar un inicio; con CLASES-a la aserción se vuelve más fuerte.
- `backend/test/arquitectura-cuentas-r1.ataque.test.ts`: sus listas cerradas no incluyen nada de CLASES-a; `middleware/pertenencia.ts` usará `adapters/db`, no el cliente.
- `frontend/src/components/layout/estatico-r1.ataque.test.ts`: reglas vigentes para CLASES-a por decisión del plan ("Frontend, reglas estáticas vigentes").
- `backend/test/worker-r1`, `worker-r2`, `worker-03c-r1` (colas): C-12, de CLASES-c. `backend/src/config/env.ataque.test.ts` y `backend/test/arranque-r1.ataque.test.ts`: C-13, de CLASES-d.

### Casos que aterrizan en un inicio y no se tocan (análisis de C-5 por doble de `fetch`)
Con CLASES-a, `/estudiante` y `/maestro` piden `GET /api/clases/inscritas` o `/impartidas`. Ningún doble lanza ante una ruta desconocida en esos casos:
| Archivo y casos | Respuesta del doble a `/api/clases/*` | Efecto esperado |
|---|---|---|
| `app/sesion-r2` (5 casos), `app/router.ataque` (`:90`, `:153`, `:175`, `:202`, `:217`), `app/cuentas-r1` (`:215`, `:248`, `:381`), `app/cuentas-r2` (`:161`, `:210`), `app/contrasena-r1:587`, `app/contrasena-r2:301` | `200` con el cuerpo de `/me` | `apiClient` lo rechaza como `RESPUESTA_INVALIDA` al validar el esquema; la consulta de clases queda en error y el inicio muestra "No pudimos cargar tus clases". Sin `/refrescar` ni `/me` extra: los conteos exactos de `router.ataque:148` y `sesion-r2:88` no cambian. En `cuentas-r2:210` el doble devuelve por segunda vez una `Response` ya consumida: `leerJson` la vuelve `undefined` y el esquema la rechaza igual, sin lanzar |
| `app/marco-r1` (todos los que llegan a `/estudiante` o `/maestro`), `app/en-espera-r1:255`, `app/contexto-r1:152-157`, `app/fondo-r1` (`:149-175`, `:206`, `:231`), `app/registro-maestro-03b-r1:249-280` | `500 ERROR_INTERNO` | `SIN_CONEXION`; el inicio muestra su error. Nada de lo que afirman (pies, `nav`, `data-material`, fondo, `aria-busy` de "Cerrar sesión", ausencia de peticiones a `/api/admin/`) depende de esa consulta |
| `app/cache-03a-r1` (`:163`, `:197`, `:218`), `app/registro-maestro-03b-r1:134` | `401 NO_AUTENTICADO` (y `/refrescar` → `401`) | `apiClient` intenta el refresco, falla, limpia el token y lanza `NO_AUTENTICADO`; `irA("/login")` (doble) solo en `cache-03a-r1:218` (`rutaActual()` = `/cambiar-contrasena`), y ese caso no afirma nada sobre `irA`. El `/me` en caché (`staleTime` 60 s) no se vuelve a pedir, la guarda no navega y `pathname` sigue en el inicio. Las aserciones (ruta alcanzada, cuerpo del envío, contraseña y token fuera de la caché, `localStorage` vacío) no dependen de la consulta de clases |

Si alguno se pusiera en rojo con el código real, la adaptación sería la de C-4/C-5 ("se agrega esa respuesta al doble"), no un hallazgo ni un PA-06.

### Casos en rojo esperados hasta que el programador termine
| # | Archivo y línea | Título | C-n |
|---|---|---|---|
| R-1 | `backend/test/sesiones-y-cadena.ataque.test.ts:457` | "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c y CLASES-a: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros" | C-2 |
| R-2 | `frontend/src/styles/clases-r1.ataque.test.ts:90` | "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 25 enEspera" | C-7 |
| R-3 | `frontend/src/styles/clases-r1.ataque.test.ts:154` | "V-07: vidrio, vidrio fuerte y vidrio azul solo en la lista final del plan (igualdad exacta)" | C-8 |

Reescritos que **no** quedan en rojo (pasan hoy y deben seguir pasando): `guarda-r2:99` (C-1), los 10 casos de C-4 en `sesion-r2`, `router.ataque` y `marco-r1`, y `tokens-r1:118` (C-9). Cualquier otro rojo en las dos suites es PA-06.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` (antes: "All matched files use Prettier code style!") | código 0 |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` (antes: "All matched files use Prettier code style!") | código 0 |
| `cd frontend; npm test` (salida completa en el scratchpad, `frontend-test.txt`) | `Test Files  1 failed \| 64 passed (65)` · `Tests  2 failed \| 1005 passed (1007)` · `Duration 86.08s` | código 1 por R-2 y R-3, exactamente (`src/styles/clases-r1.ataque.test.ts (11 tests \| 2 failed)`: "expected [ …(20) ] to have a length of 25 but got 20" y "expected [ Array(4) ] to deeply equal [ Array(6) ]") |
| `cd backend; npm test` (con PA-01; `backend-test.txt`) | `Test Files  1 failed \| 81 passed (82)` · `Tests  1 failed \| 932 passed (933)` · `Duration 66.78s` | código 1 por R-1, exactamente (`test/sesiones-y-cadena.ataque.test.ts (35 tests \| 1 failed)`: "expected [ …(25) ] to deeply equal [ …(37) ]") |
| Formato: `cd backend; npx prettier --write test/sesiones-y-cadena.ataque.test.ts test/guarda-r2.ataque.test.ts` y `cd frontend; npx prettier --write src/styles/clases-r1.ataque.test.ts src/styles/tokens-r1.ataque.test.ts src/app/sesion-r2.ataque.test.tsx src/app/router.ataque.test.tsx src/app/marco-r1.ataque.test.tsx` | "(unchanged)" en los 7 | — |

### PARADAS
- PA-01, PA-02: comprobadas, no activadas.
- PA-06: no activada (rojos = exactamente R-1, R-2 y R-3).
- PA-07: conteo por término en la salida completa del backend: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 · `too many clients` 0. Los dos `P2028` son los aceptados: (1) `POST /api/auth/login`, `tx.sesion.create()` en `adapters/db/sesiones.ts:39` desde `handlers/auth/index.ts:134` (timeout 5000 ms, 6470 ms); (2) `POST /api/auth/restablecer`, `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116` desde `handlers/auth/cuentas.ts:106` (5000 ms, 6050 ms). No activada.
- PA-11: `docker ps -a` tras la corrida muestra solo `campus-dev-postgres-1`, `campus-dev-minio-1` y `campus-dev-livekit-1` (los de `infra/`); ningún contenedor de Testcontainers ni Ryuk. No activada.
- PA-12: las dos suites corrieron una vez cada una; sin señales de intermitencia.

### Diff de cada archivo tocado
`git diff 3399c79 -- <los 7 archivos>` (356 líneas):

```diff
diff --git a/backend/test/guarda-r2.ataque.test.ts b/backend/test/guarda-r2.ataque.test.ts
--- a/backend/test/guarda-r2.ataque.test.ts
+++ b/backend/test/guarda-r2.ataque.test.ts
@@ -91,7 +91,12 @@ describe("ataque (ronda 2): la guarda acepta todo lo legítimo", () => {
     ).toBe("arranca")
   })
 
-  it("una ruta con pertenencia responde 501 y sin token 401 (la cadena corre antes)", async () => {
+  // CLASES-a ronda 0 (C-1, §D-0.1 y §D-0.3): requireMembership y requireOwnership dejan de
+  // responder 501; el sexto paso resuelve la clase de la ruta. Una ruta con pertenencia y sin
+  // :claseId sigue arrancando (con token respondería 500 CLASE_AUSENTE: PR-A06d, del programador).
+  // Las aserciones no cambian: siguen protegiendo que sin token la cadena responda 401 antes de
+  // llegar al sexto paso, también en HEAD.
+  it("una ruta con pertenencia y sin :claseId arranca, y sin token responde 401 (la cadena corre antes del sexto paso)", async () => {
     const app = await nuevaApp()
     await app.register(
       async (hijo) => {
diff --git a/backend/test/sesiones-y-cadena.ataque.test.ts b/backend/test/sesiones-y-cadena.ataque.test.ts
--- a/backend/test/sesiones-y-cadena.ataque.test.ts
+++ b/backend/test/sesiones-y-cadena.ataque.test.ts
@@ -446,7 +446,15 @@ describe("ataque: superficie de rutas", () => {
   // crean maestros solo POST /api/admin/maestros y POST /api/admin/maestros/lote (las dos solo para
   // el admin) y POST /api/auth/registro-maestro (con un enlace vivo). Cualquier otra ruta nueva
   // vuelve a poner la prueba en rojo.
-  it("bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b y AUTH-03c: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros", () => {
+  // CLASES-a ronda 0 (C-2, §D-R0; V-06 del plan de CLASES-01): se agregan las 12 rutas de CLASES-a
+  // bajo /api/clases (POST /clases; GET y HEAD de /inscritas y /impartidas; POST /unirse; GET, HEAD
+  // y PUT de /:claseId; GET, HEAD y POST de /:claseId/codigo). Ninguna crea cuentas ni cambia roles:
+  // solo tocan clases e inscripciones del perfil autenticado. La protección se reformula sin
+  // debilitarse: ninguna ruta crea administradores; siguen creando maestros solo las tres de hoy
+  // (POST /api/admin/maestros, POST /api/admin/maestros/lote y POST /api/auth/registro-maestro).
+  // printRoutes anida /inscritas, /impartidas, /unirse y /:claseId bajo /api/clases (que tiene
+  // POST) y /codigo bajo /:claseId; el análisis por sangría los reconstruye.
+  it("bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c y CLASES-a: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros", () => {
     const arbol = obtenerApp().printRoutes({ commonPrefix: false })
     const rutas = new Set<string>()
     const noReconocidas: string[] = []
@@ -475,10 +483,18 @@ describe("ataque: superficie de rutas", () => {
     expect([...rutas].sort()).toEqual([
       "GET /api/admin/enlaces-registro",
       "GET /api/admin/enlaces-registro/:id/registrados",
+      "GET /api/clases/:claseId",
+      "GET /api/clases/:claseId/codigo",
+      "GET /api/clases/impartidas",
+      "GET /api/clases/inscritas",
       "GET /api/me",
       "GET /api/salud",
       "HEAD /api/admin/enlaces-registro",
       "HEAD /api/admin/enlaces-registro/:id/registrados",
+      "HEAD /api/clases/:claseId",
+      "HEAD /api/clases/:claseId/codigo",
+      "HEAD /api/clases/impartidas",
+      "HEAD /api/clases/inscritas",
       "HEAD /api/me",
       "HEAD /api/salud",
       "POST /api/admin/enlaces-registro",
@@ -497,7 +513,11 @@ describe("ataque: superficie de rutas", () => {
       "POST /api/auth/registro",
       "POST /api/auth/registro-maestro",
       "POST /api/auth/restablecer",
+      "POST /api/clases",
+      "POST /api/clases/:claseId/codigo",
+      "POST /api/clases/unirse",
       "PUT /api/admin/usuarios/:id/correo",
+      "PUT /api/clases/:claseId",
     ])
   })
 
diff --git a/frontend/src/app/marco-r1.ataque.test.tsx b/frontend/src/app/marco-r1.ataque.test.tsx
--- a/frontend/src/app/marco-r1.ataque.test.tsx
+++ b/frontend/src/app/marco-r1.ataque.test.tsx
@@ -131,20 +131,41 @@ afterEach(() => {
   vi.unstubAllGlobals()
 })
 
+// CLASES-a ronda 0 (C-4, §D-R0): /estudiante y /maestro dejan de ser BienvenidaView; "Hola,
+// <nombre>" pasa a ser un <span> de texto y el h1 es el titular con dato, así que la identidad del
+// estudiante y del maestro se localiza con findByText("Hola, X"); la del admin sigue siendo el
+// encabezado "Cuentas". Sigue protegiendo que cada rol llegue a su destino con su identidad a la
+// vista, un solo pie y sin ver "Acceso restringido". El doble conMe responde 500 a
+// /api/clases/inscritas e /impartidas: el inicio muestra su error y el saludo no depende de eso.
 describe("ataque (DESIGN-01b-1 r1): /acceso-restringido con alguien NO restringido (M-01, RN-03)", () => {
   it.each([
-    { rol: "estudiante", nombre: "Ana López", destino: "/estudiante", titulo: "Hola, Ana López" },
-    { rol: "maestro", nombre: "Luis Pérez", destino: "/maestro", titulo: "Hola, Luis Pérez" },
-    { rol: "admin", nombre: "Administración", destino: "/admin", titulo: "Cuentas" },
+    {
+      rol: "estudiante",
+      nombre: "Ana López",
+      destino: "/estudiante",
+      identidad: () => screen.findByText("Hola, Ana López"),
+    },
+    {
+      rol: "maestro",
+      nombre: "Luis Pérez",
+      destino: "/maestro",
+      identidad: () => screen.findByText("Hola, Luis Pérez"),
+    },
+    {
+      rol: "admin",
+      nombre: "Administración",
+      destino: "/admin",
+      identidad: () => screen.findByRole("heading", { name: "Cuentas" }),
+    },
   ])(
     "un $rol termina en $destino con un solo pie (el del marco) y nunca ve 'Acceso restringido'",
-    async ({ rol, nombre, destino, titulo }) => {
+    async ({ rol, nombre, destino, identidad }) => {
       stubFetch(conMe(() => respuestaJson(200, meDe({ rol, nombre }))))
       const vigia = vigilar()
       const { router } = await renderEn("/acceso-restringido")
 
       await waitFor(() => expect(router.state.location.pathname).toBe(destino))
-      expect(await screen.findByRole("heading", { name: titulo })).toBeInTheDocument()
+      expect(await identidad()).toBeInTheDocument()
       await esperarUnMomento()
       const registro = vigia.terminar()
 
@@ -214,7 +235,8 @@ describe("ataque (DESIGN-01b-1 r1): un solo pie al navegar entre pantallas", ()
     })
     fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))
     await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
-    await screen.findByRole("heading", { name: "Hola, Ana López" })
+    // CLASES-a ronda 0 (C-4): la identidad es el <span> "Hola, <nombre>", no un encabezado.
+    await screen.findByText("Hola, Ana López")
     await esperarUnMomento()
 
     expect(vigia.terminar().maxPies).toBeLessThanOrEqual(1)
@@ -261,7 +283,8 @@ describe("ataque (DESIGN-01b-1 r1): un solo pie al navegar entre pantallas", ()
     })
     fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))
     await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
-    await screen.findByRole("heading", { name: "Hola, Luis Pérez" })
+    // CLASES-a ronda 0 (C-4): la identidad es el <span> "Hola, <nombre>", no un encabezado.
+    await screen.findByText("Hola, Luis Pérez")
     await esperarUnMomento()
 
     expect(vigia.terminar().maxPies).toBeLessThanOrEqual(1)
diff --git a/frontend/src/app/router.ataque.test.tsx b/frontend/src/app/router.ataque.test.tsx
--- a/frontend/src/app/router.ataque.test.tsx
+++ b/frontend/src/app/router.ataque.test.tsx
@@ -6,6 +6,12 @@ import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite
 // Ataques del Tester (AUTH-01, ronda 1) contra las guardas, el login y el cierre de sesión:
 // identidad obsoleta tras volver a entrar, rutas de otro rol, contrato de /me incompleto, logout
 // y restauración de la sesión.
+// CLASES-a ronda 0 (C-4, §D-R0): /estudiante y /maestro dejan de ser BienvenidaView; "Hola,
+// <nombre>" pasa a ser un <span> de texto, así que findByRole("heading", { name: "Hola, X" }) pasa a
+// findByText("Hola, X"). Sigue protegiendo que se muestre la identidad de la cuenta vigente; las
+// aserciones negativas (queryByText(/Hola,/)) y los conteos de /refrescar y /me no cambian. El
+// doble responde a /api/clases/inscritas con el cuerpo de /me (200): el inicio lo rechaza como
+// respuesta inválida y muestra su error, sin pedir otro /refrescar ni otro /me.
 
 vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))
 
@@ -88,7 +94,7 @@ describe("ataque: identidad tras volver a iniciar sesión", () => {
       return respuestaJson(200, meDe({}))
     })
     const router = await renderEn("/estudiante")
-    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()
+    expect(await screen.findByText("Hola, Ana López")).toBeInTheDocument()
 
     await act(() => router.navigate("/login"))
     llenarLogin("luis@ejemplo.mx", "clave-de-prueba-1234")
@@ -151,7 +157,7 @@ describe("ataque: guardas por rol", () => {
       return respuestaJson(200, meDe({}))
     })
     await renderEn("/estudiante")
-    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()
+    expect(await screen.findByText("Hola, Ana López")).toBeInTheDocument()
     expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
     expect(llamadasA(fetchMock, "/api/me")).toBe(1)
   })
diff --git a/frontend/src/app/sesion-r2.ataque.test.tsx b/frontend/src/app/sesion-r2.ataque.test.tsx
--- a/frontend/src/app/sesion-r2.ataque.test.tsx
+++ b/frontend/src/app/sesion-r2.ataque.test.tsx
@@ -6,6 +6,12 @@ import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite
 // Ataques del Tester (AUTH-01, ronda 2) contra las correcciones de T-02 (/me de la cuenta nueva) y
 // T-07 (restauración cerrada tras logout): salir y volver a entrar en la misma pestaña, registro con
 // otra sesión abierta y /me que falla justo después del login.
+// CLASES-a ronda 0 (C-4, §D-R0): /estudiante y /maestro dejan de ser BienvenidaView. El h1 pasa a
+// ser el titular con dato y "Hola, <nombre>" es un <span> de texto que depende solo de la sesión,
+// así que findByRole("heading", { name: "Hola, X" }) pasa a findByText("Hola, X"). Sigue
+// protegiendo que la pantalla muestre la identidad de la cuenta vigente; las aserciones negativas
+// no cambian. Los dobles de fetch responden a /api/clases/inscritas e /impartidas con el cuerpo de
+// /me (200): el inicio lo rechaza como respuesta inválida y muestra su error, sin tocar la sesión.
 
 vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))
 
@@ -100,7 +106,7 @@ describe("ataque (ronda 2): salir y volver a entrar en la misma pestaña", () =>
     await entrarComo("luis@ejemplo.mx")
 
     await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
-    expect(await screen.findByRole("heading", { name: "Hola, Luis Pérez" })).toBeInTheDocument()
+    expect(await screen.findByText("Hola, Luis Pérez")).toBeInTheDocument()
     expect(screen.queryByText("Ana López")).not.toBeInTheDocument()
     expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
   })
@@ -171,7 +177,7 @@ describe("ataque (ronda 2): identidad al entrar con otra sesión abierta", () =>
       return respuestaJson(200, meDe({}))
     })
     const router = await renderEn("/estudiante")
-    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()
+    expect(await screen.findByText("Hola, Ana López")).toBeInTheDocument()
 
     await act(() => router.navigate("/registro"))
     fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Pedro Nuevo" } })
@@ -181,7 +187,7 @@ describe("ataque (ronda 2): identidad al entrar con otra sesión abierta", () =>
     })
     fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }))
 
-    expect(await screen.findByRole("heading", { name: "Hola, Pedro Nuevo" })).toBeInTheDocument()
+    expect(await screen.findByText("Hola, Pedro Nuevo")).toBeInTheDocument()
     expect(screen.queryByText("Ana López")).not.toBeInTheDocument()
   })
 
@@ -196,7 +202,7 @@ describe("ataque (ronda 2): identidad al entrar con otra sesión abierta", () =>
       return respuestaJson(200, meDe({}))
     })
     const router = await renderEn("/estudiante")
-    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()
+    expect(await screen.findByText("Hola, Ana López")).toBeInTheDocument()
     await act(() => router.navigate("/login"))
     await entrarComo("luis@ejemplo.mx")
     expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar")
@@ -205,6 +211,6 @@ describe("ataque (ronda 2): identidad al entrar con otra sesión abierta", () =>
     await act(() => router.navigate("/estudiante"))
 
     await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
-    expect(await screen.findByRole("heading", { name: "Hola, Luis Pérez" })).toBeInTheDocument()
+    expect(await screen.findByText("Hola, Luis Pérez")).toBeInTheDocument()
   })
 })
diff --git a/frontend/src/styles/clases-r1.ataque.test.ts b/frontend/src/styles/clases-r1.ataque.test.ts
--- a/frontend/src/styles/clases-r1.ataque.test.ts
+++ b/frontend/src/styles/clases-r1.ataque.test.ts
@@ -79,14 +79,22 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
   // enlaces" (2, en features/admin/components/ con al menos 1 en tabla-enlaces.tsx), no cambia. Sigue
   // protegiendo lo mismo que C-15: ningún `disabled` en JSX, aria-busy y aria-disabled solo en
   // Button, y que el número y el lugar de los botones con espera cambien solo con el plan.
-  it("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 20 enEspera", () => {
+  // CLASES-a ronda 0 (C-7, §D-R0; V-04 del plan de CLASES-01): de 20 a 25 enEspera=. Se suman, a la
+  // lista fija de archivos, los cinco botones de §D-A5 en features/clases/components/: "Unirme a la
+  // clase" (formulario-unirse-clase.tsx, 1), "Crear clase" o "Guardar cambios" (formulario-clase.tsx,
+  // 1), "Ver más clases" (panel-mis-clases.tsx, 1) y "Copiar código" y "Sí, regenerar"
+  // (codigo-de-clase.tsx, 2). Ningún otro archivo de CLASES-a lo lleva: el "Crear clase" del inicio
+  // del maestro es un enlace y "Regenerar código" y "Cancelar" no esperan nada. Sigue protegiendo lo
+  // mismo: ningún `disabled` en JSX, aria-busy y aria-disabled solo en Button, y que el número y el
+  // lugar de los botones con espera cambien solo con el plan.
+  it("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 25 enEspera", () => {
     expect(coincidencias(/\sdisabled(=|\s|\/?>|$)/, soloTsx)).toEqual([])
     // Atributos JSX, no la variante `aria-busy:` de las clases (button-variants.ts, §D-5).
     expect(rutasDe(coincidencias(/aria-(busy|disabled)=/, soloTsx))).toEqual([
       "/src/components/ui/button.tsx",
     ])
     const usos = coincidencias(/enEspera=/, soloTsx)
-    expect(usos).toHaveLength(20)
+    expect(usos).toHaveLength(25)
 
     const porArchivo = new Map<string, number>()
     for (const uso of usos) {
@@ -114,6 +122,11 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
       "/src/features/admin/components/registrados-del-enlace.tsx": 1,
       // C-17 (AUTH-03c): "Enviar invitaciones".
       "/src/features/admin/components/formulario-invitacion-masiva.tsx": 1,
+      // C-7 (CLASES-a): los cinco botones de §D-A5.
+      "/src/features/clases/components/formulario-unirse-clase.tsx": 1,
+      "/src/features/clases/components/formulario-clase.tsx": 1,
+      "/src/features/clases/components/panel-mis-clases.tsx": 1,
+      "/src/features/clases/components/codigo-de-clase.tsx": 2,
     }
     for (const [ruta, cuantos] of Object.entries(fijos)) {
       expect(porArchivo.get(ruta) ?? 0, `enEspera= en ${ruta}`).toBe(cuantos)
@@ -131,7 +144,14 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
     )
   })
 
-  it("V-07: vidrio y vidrio fuerte solo en la lista final del plan (igualdad exacta), sin vidrio azul", () => {
+  // CLASES-a ronda 0 (C-8, §D-R0; §D-A5 y V-04 del plan de CLASES-01): el vidrio fuerte suma la
+  // tarjeta interna del bloque destacado (bloque-destacado.tsx) y la tarjeta de clase
+  // (tarjeta-clase.tsx); el vidrio azul, que hasta hoy no existía en el código, pasa a vivir en
+  // exactamente bloque-destacado.tsx. El vidrio sin variante no cambia: PanelMisClases, el
+  // encabezado de la clase y los formularios usan Card. Sigue protegiendo que ningún archivo gane
+  // vidrio fuera de la lista cerrada del plan y que data-material y data-densidad no salgan del
+  // contenedor del rol.
+  it("V-07: vidrio, vidrio fuerte y vidrio azul solo en la lista final del plan (igualdad exacta)", () => {
     // DESIGN-01b-1, ronda 1 (plan-01b.md, §D-9, texto de referencia de la ronda 1): igualdad
     // exacta con la lista final. toEqual acepta el (string | undefined)[] de rutasDe; una ruta
     // undefined haría fallar la igualdad.
@@ -150,8 +170,12 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
       "/src/components/layout/barra-navegacion.tsx",
       "/src/components/ui/button-variants.ts",
       "/src/features/auth/components/panel-anuncios.tsx",
+      "/src/features/clases/components/bloque-destacado.tsx",
+      "/src/features/clases/components/tarjeta-clase.tsx",
+    ])
+    expect(rutasDe(coincidencias(/\bvidrio-azul\b/))).toEqual([
+      "/src/features/clases/components/bloque-destacado.tsx",
     ])
-    expect(coincidencias(/\bvidrio-azul\b/)).toEqual([])
     expect(rutasDe(coincidencias(/data-material|data-densidad/))).toEqual([
       "/src/components/layout/contenedor-rol.tsx",
     ])
diff --git a/frontend/src/styles/tokens-r1.ataque.test.ts b/frontend/src/styles/tokens-r1.ataque.test.ts
--- a/frontend/src/styles/tokens-r1.ataque.test.ts
+++ b/frontend/src/styles/tokens-r1.ataque.test.ts
@@ -109,6 +109,12 @@ describe("ataque (DESIGN-01a r1): tokens.css contra DESIGN.md", () => {
     }
   })
 
+  // CLASES-a ronda 0 (C-9, §D-R0; §D-A5 y §D-A8 del plan de CLASES-01): tokens.css gana
+  // --text-display-compacto (2rem, 1.05, -0.03em, 700) y §4 de DESIGN.md recibe su nota de
+  // implementación, que puede ir como fila de la tabla o como texto aparte. La tabla queda cerrada:
+  // exactamente los 7 tokens de hoy, más esa fila si el programador la agrega, y ningún otro. Si la
+  // fila existe, sus cuatro valores se comparan con tokens.css, incluido el peso 700 (los de peso
+  // único). Sigue protegiendo que cada token de la escala del documento coincida con tokens.css.
   it("escala tipográfica de §4: tamaño, interlineado, interletraje y peso de cada token", () => {
     const seccion = design.slice(design.indexOf("### Escala"), design.indexOf("## 5."))
     const filas = [
@@ -116,7 +122,20 @@ describe("ataque (DESIGN-01a r1): tokens.css contra DESIGN.md", () => {
         /\|\s*`(--text-[\w-]+)`\s*\|\s*(\d+)\s*px\s*\/\s*([\d.]+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/g,
       ),
     ]
-    expect(filas.length).toBe(7)
+    const compacto = "--text-display-compacto"
+    const escalaDeHoy = [
+      "--text-display",
+      "--text-h1",
+      "--text-h2",
+      "--text-h3",
+      "--text-body",
+      "--text-small",
+      "--text-caption",
+    ]
+    const nombres = filas.map(([, token]) => token ?? "")
+    expect(nombres.filter((nombre) => nombre !== compacto)).toEqual(escalaDeHoy)
+    expect(nombres.filter((nombre) => nombre === compacto).length).toBeLessThanOrEqual(1)
+    const conPesoUnico = [...escalaDeHoy.slice(0, 4), compacto]
     for (const [, token, px, interlineado, peso, interletraje] of filas) {
       const nombre = token ?? ""
       expect(valorDe(nombre), `${nombre}`).toBe(`${Number(px) / 16}rem`)
@@ -124,7 +143,7 @@ describe("ataque (DESIGN-01a r1): tokens.css contra DESIGN.md", () => {
       const espaciado = /`(-?[\d.]+em)`/.exec(interletraje ?? "")?.[1] ?? "0"
       expect(valorDe(`${nombre}--letter-spacing`), `${nombre}--letter-spacing`).toBe(espaciado)
       const pesoUnico = /^\s*(\d{3})\s*$/.exec(peso ?? "")?.[1]
-      if (pesoUnico && ["--text-display", "--text-h1", "--text-h2", "--text-h3"].includes(nombre)) {
+      if (pesoUnico && conPesoUnico.includes(nombre)) {
         expect(valorDe(`${nombre}--font-weight`), `${nombre}--font-weight`).toBe(pesoUnico)
       }
     }
```

### Tabla de SHA-256 de todas las `*.ataque` después de los cambios (64; los 7 tocados marcados con "(ronda 0 de CLASES-a)")
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` (ronda 0 de CLASES-a) |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `ADF3928D9CC6994304E99F9BCC6F1BFCC0FD28C87BF8CC7781BA32C9D06E4BD5` | `backend/test/sesiones-y-cadena.ataque.test.ts` (ronda 0 de CLASES-a) |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` (ronda 0 de CLASES-a) |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` (ronda 0 de CLASES-a) |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` (ronda 0 de CLASES-a) |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `8472BAC787392C2027658365F6D58666EE346BD68AB52C6DFAE3D4C2FA1A7585` | `frontend/src/styles/clases-r1.ataque.test.ts` (ronda 0 de CLASES-a) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` (ronda 0 de CLASES-a) |

> **Nota de transcripción (orquestador, 2026-09-29).** La sección "CLASES-a — Ronda 1" la escribió el tester y la entregó en su respuesta final, porque su herramienta volvió a rechazar la escritura de este archivo. Se registra tal cual (`docs/ESTADO.md` §4). Antes de transcribirla, el orquestador verificó: existen los 6 archivos `*-r1.ataque` nuevos y sus SHA-256 coinciden con la tabla; hay 70 `*.ataque` en los dos paquetes; dos archivos de la ronda 0 tomados como muestra conservan su hash; y las salidas `be-test2.txt` y `fe-test.txt` del scratchpad terminan con las duraciones que cita el reporte (55.77 s y 52.80 s).

## CLASES-a — Ronda 1
Veredicto: **ROTO**
Verificación propia: lint backend OK · lint frontend OK · test backend 9 rojos (todos míos, hallazgos) / 1010 verdes · test frontend 10 rojos (todos míos, hallazgos) / 1049 verdes.

Base `<R>` = `3399c79`. Rama `feat/clases`. Fecha: 2026-09-29.

> Nota: el tester no escribió este archivo. Las instrucciones de su sesión prohíben escribir archivos de reporte `.md`, así que entregó la sección en su respuesta final para que el orquestador la transcriba.

### Precondiciones
- **Rama y base:** la rama es `feat/clases` y `git cat-file -e '3399c79^{commit}'` es correcto.
- **Árbol:** `git status --porcelain -- shared backend frontend` lista el trabajo del programador y los 7 `*.ataque` de la ronda 0. Solo agregué los 6 archivos `*-r1.ataque.test.*` de esta ronda. No toqué código de producción, pruebas normales, el plan ni ningún `*.ataque` existente.
- **V-01:** los SHA-256 de las 64 `*.ataque` coinciden con la tabla de "CLASES-a — Ronda 0" (64/64, comparados por programa). Después de mis cambios las 64 siguen iguales; la tabla va al final.
- **PA-01:** `Get-NetFirewallRule -DisplayName 'Campus: bloquear entrada a Docker en redes publicas'` → `Enabled: True`, `Direction: Inbound`, `Action: Block`, `Profile: Public`. `Get-NetConnectionProfile` → `IZZI-F281`, `NetworkCategory: Public`, que el humano declaró de confianza. Backend permitido.

### Hallazgos

#### T-01 — Una descripción con CRLF o CR se rechaza con 400 en lugar de guardarse con LF
Severidad: media
Prueba: `backend/test/clases-r1.ataque.test.ts`, casos "POST /clases con CRLF y CR en la descripción responde 201 y guarda solo LF" y "PUT /clases/:claseId con CRLF en la descripción responde 200 y guarda solo LF".
Esperado: `201` o `200`, con la descripción guardada como `"línea 1\nlínea 2\nlínea 3"` porque pasa por `normalizarTextoLargo` antes de guardarse.
Obtenido: `400 {"codigo":"VALIDACION","mensaje":"descripcion: El texto tiene caracteres no permitidos"}`.
- `textoLargoSchema` trata `\r` como un carácter de control prohibido.
- `normalizarTextoLargo` (`core/clases/texto.ts`) no se usa en ninguna parte de `src/`, solo en su prueba PR-A05: en a es código muerto.

Requisito o regla violada: §D-C4 ("Se aplica antes de guardar publicaciones, comentarios y descripciones (también en a)") y S-02 (descripción de varias líneas).
Nota: el formulario del navegador envía LF, porque FormData ya no normaliza a CRLF; el defecto lo sufre un cliente de la API que mande CRLF. En CLASES-c, el mismo `textoLargoSchema` rechazará también los textos con CRLF de publicaciones y comentarios.

#### T-02 — La guarda §D-0.3 deja arrancar rutas que capturan `claseId` sin el sexto paso
Severidad: media
Prueba: `backend/test/guarda-clase-r1.ataque.test.ts`, cuatro casos:
- "/api/x/:claseId? (parámetro opcional) sin sexto paso no debe arrancar"
- "/api/x/:claseId(^[0-9a-f-]{36}$) (parámetro con expresión) sin sexto paso no debe arrancar"
- "/api/x/:claseId-:parte (dos parámetros en un segmento) sin sexto paso no debe arrancar"
- "/api/clases/* (comodín bajo /clases) sin sexto paso no debe arrancar"

Esperado: la API no arranca, igual que con `/api/x/:claseId`. Ese caso de control sí se rechaza.
Obtenido: las cuatro rutas arrancan con solo los cinco pasos.
- `TIENE_CLASE_ID = /(^|\/):claseId(\/|$)/` exige una `/` o el fin de la URL después del nombre. Por eso `:claseId?`, `:claseId(…)` y `:claseId-:x` no coinciden, aunque find-my-way sí entrega `request.params.claseId` en las tres.
- `NOMBRE_DE_CLASE_DISTINTO` solo revisa `/clases/:`, así que el comodín `/api/clases/*` también pasa.
- Un handler que leyera `request.params` en lugar de `claseDe(request)` quedaría sin verificación de pertenencia. Con `claseDe` respondería `500 CLASE_AUSENTE`.

Requisito o regla violada: AGENTS.md regla 2; §D-0.3 (toda ruta con un segmento `:claseId` debe llevar el sexto paso); punto de ataque 2 del plan ("con un comodín"). La expresión regular es la que dicta el plan, así que el hueco está tanto en el diseño como en la implementación.

#### T-03 — ESLint §D-0.4 no detecta `app["addHook"](...)` en `handlers/`
Severidad: baja
Prueba: `backend/test/guarda-clase-r1.ataque.test.ts`, caso "app[\"addHook\"](...) también debe rechazarse". Corre ESLint desde código con `eslint.config.mjs` sobre un archivo virtual, `backend/src/handlers/ataque-r1-virtual.ts`. El caso de control con `app.addHook(...)` sí se rechaza.
Esperado: el error "Los plugins de handlers/ no añaden hooks…".
Obtenido: ningún error de `no-restricted-syntax`.
- El selector `CallExpression[callee.property.name='addHook']` no cubre la forma con corchetes.
- El mismo bloque sí cubre las dos formas para `executeSql` (`property.name` y `property.value`).
- Un hook así corre antes de `protegido()`, y la guarda `onRoute` no lo ve porque solo revisa los hooks de ruta.

Requisito o regla violada: §D-0.4 (M-14); AGENTS.md regla 2.

#### T-04 — El código de invitación acepta un carácter invisible y letras no ASCII
Severidad: baja
Prueba: `backend/src/core/clases/codigo-r1.ataque.test.ts`, casos "rechaza el carácter invisible U+FEFF (ZERO WIDTH NO-BREAK SPACE) dentro del código" y "rechaza letras no ASCII que toUpperCase convierte en letras del alfabeto (ß, ſ, ﬀ)".
Esperado: `codigoInvitacionSchema` rechaza `"ABC\uFEFFDEFG"`, `"ABCDEß"`, `"ABCDEFſ"` y `"ABCDEﬀ"`.
Obtenido: los acepta y los convierte en `"ABCDEFG"`, `"ABCDESS"`, `"ABCDEFS"` y `"ABCDEFF"`.
- `normalizarCodigoDeClase` usa `\s`, que en JavaScript incluye U+FEFF, U+00A0 y U+3000.
- `toUpperCase()` convierte `ß` en `SS`, `ſ` en `S` y expande las ligaduras.
- Los dígitos de otros sistemas, los caracteres de ancho completo, `K` (U+212A) e `ı` sí se rechazan.

Requisito o regla violada: S-03 ("se aceptan minúsculas, espacios y guiones") y PR-A02d ("rechaza … caracteres invisibles"); la prueba del programador solo usa U+200B. No tiene impacto de seguridad (no amplía el espacio de códigos), pero el código se "encuentra" con caracteres que el alumno no ve o no escribió.

#### T-05 — El código de la clase del dueño no tiene estado de error, y "Copiar código" falla en silencio
Severidad: media
Prueba: `frontend/src/features/clases/clases-r1.ataque.test.tsx`, casos "si GET /codigo falla, la página del dueño muestra un error (no un '…' indefinido)" y "con la consulta del código en error, 'Copiar código' da un aviso en lugar de no hacer nada".
Esperado: si `GET /api/clases/:claseId/codigo` falla, se muestra un `MensajeError` u otro aviso, y "Copiar código" da algún aviso al pulsarlo.
Obtenido:
- `EncabezadoClase` solo pasa `codigo.data` a `CodigoDeClase`.
- Con la consulta en error se muestra "…" para siempre y no aparece ningún `role="alert"`.
- `handleCopiar` sale con `if (!codigo) return`, sin avisar.

Requisito o regla violada: CLAUDE.md ("Componentes: siempre manejan `isError`" y el orden error → cargando → vacío → datos); lista del tester (estados de error, carga y vacío presentes).

#### T-06 — Regenerar el código falla sin ningún aviso
Severidad: media
Prueba: `frontend/src/features/clases/clases-r1.ataque.test.tsx`, caso "un POST /codigo que falla da un aviso de error".
Esperado: un `toast.error` o un mensaje en línea cuando `POST /api/clases/:claseId/codigo` falla.
Obtenido: el manejador es `onError: () => setConfirmando(false)`. La confirmación se cierra, el código viejo sigue en pantalla y nada indica que hubo un error. El maestro puede creer que regeneró el código y seguir repartiendo uno que debía quedar invalidado.
Requisito o regla violada: CLAUDE.md, "Manejo de errores en el frontend" (aviso con toast fuera de los hooks); §D-A5 (el éxito lleva el toast "Código nuevo listo"; el fallo no tiene contraparte).

#### T-07 — No hay tarjeta verde: la variante "verde" usa el azul
Severidad: media
Prueba: `frontend/src/features/clases/clases-r1.ataque.test.tsx`, casos "la variante verde lleva el fondo --brand (verde pino), no el azul" y "las variantes verde y azul no comparten color de fondo".
Esperado: la variante verde usa `bg-brand` (`--brand`, `#1D5B4B`) y es distinta de la azul (`--accent`).
Obtenido:
- `CLASES_POR_VARIANTE.verde` usa `bg-accent` y `azul` usa `bg-primary`; `--accent` y `--primary` valen los dos `#22409a`.
- Dos de las tres variantes se ven iguales (azul) y el verde de la marca no aparece.
- Los metadatos no usan `--brand-soft` ni `--accent-soft`; usan `opacity-90`.
- Lo confirmé en el CSS compilado (`vite build` hacia una carpeta del scratchpad): `.bg-accent` y `.bg-primary` van después de `.vidrio-fuerte`, así que en las dos tarjetas gana el fondo sólido azul.

Requisito o regla violada: `docs/DESIGN.md` §7.6 (Verde → `--brand` con metadatos `--brand-soft`; Azul → `--accent` con metadatos `--accent-soft`) y §6 (foco: "sobre `--brand` (verde): 7.9").

#### T-08 — Un nombre de 120 caracteres sin espacios no se corta (tarjeta y encabezado)
Severidad: media
Prueba: `frontend/src/features/clases/clases-r1.ataque.test.tsx`, casos "un nombre de 120 caracteres sin espacios se corta (a 360 px no desborda) y el título se limita a dos líneas" y "el h1 de la clase con un nombre de 120 caracteres sin espacios se corta".
Esperado:
- El título de `TarjetaClase` lleva una regla de corte (`break-words`, `wrap-anywhere`, `break-all`…) y el límite de dos líneas (`line-clamp-2`).
- El `h1` de `EncabezadoClase` lleva una regla de corte.

Obtenido: el título solo lleva `text-h3 font-bold` y el `h1` solo `text-h1`. En `styles/` no hay `overflow-wrap` ni `word-break` global. Una palabra de 120 caracteres mide unos 1,500 px a `--text-h3`, así que desborda la rejilla y el encabezado a 360 px. Esto sale del análisis del CSS: el desborde no se vio en un navegador (la regla prohíbe abrirlos).
Requisito o regla violada: `docs/DESIGN.md` §7.6 ("Título en `--text-h3`, de dos líneas como máximo") y §2 ("Lectura cómoda … a 360 px de ancho"); punto de ataque 5 del plan.

#### T-09 — `?? []` en los dos inicios
Severidad: baja
Prueba: `frontend/src/features/clases/estatico-r1.ataque.test.ts`, caso "ningún `?? []` en features/clases".
Esperado: ninguna coincidencia.
Obtenido: `(clases.data?.pages ?? []).flatMap(…)` en `inicio-estudiante-view.tsx:14` y en `inicio-maestro-view.tsx:18`. Hoy el panel resuelve la carga y el error antes de usar `filas`, así que no oculta datos en pantalla, pero es justo el patrón "MAL" de CLAUDE.md.
Requisito o regla violada: CLAUDE.md, "Lo que no se hace" ("No uses `?? []` para ocultar datos faltantes") y "Valores por defecto".

#### T-10 — Ternarios anidados en JSX
Severidad: baja
Prueba: `frontend/src/features/clases/estatico-r1.ataque.test.ts`, caso "ningún ternario anidado dentro de JSX en features/clases". Recorre el AST con el compilador de TypeScript.
Esperado: ninguno.
Obtenido:
- `components/bloque-destacado.tsx:45` (error → cargando → titular).
- `components/panel-mis-clases.tsx:52` y `:54` (error → cargando → vacío → datos, tres niveles).

Requisito o regla violada: CLAUDE.md, "Lo que no se hace" ("No anides ternarios en JSX: extrae a retornos tempranos o variables") y "Retornos tempranos (obligatorio)".

#### T-11 — La página de una clase con un `claseId` que no es UUID muestra el nombre técnico del parámetro
Severidad: baja
Prueba: `frontend/src/features/clases/clases-r1.ataque.test.tsx`, caso "una URL con un claseId que no es UUID no muestra el nombre técnico del parámetro".
Esperado: un mensaje con el tono de §9, por ejemplo el de `SIN_ACCESO_A_LA_CLASE` o uno genérico.
Obtenido: `mensajeDeErrorClases` devuelve `error.message` para todo `VALIDACION`, así que `/estudiante/clases/no-es-uuid` muestra "claseId: debe ser un identificador válido".
Requisito o regla violada: `docs/DESIGN.md` §9 (tono de los textos); S-08 (la misma respuesta visible para lo que no existe).

### Atacado sin hallazgos
- **Pertenencia (punto 1):**
  - Un estudiante inscrito en A que pide B recibe `403 SIN_ACCESO_A_LA_CLASE`.
  - El mismo UUID en mayúsculas da la misma respuesta: 200 al miembro y 403 al ajeno.
  - `%20uuid`, `uuid%20`, `uuid%00`, `{uuid}`, el UUID sin guiones, `uuid'--` y el UUID nulo dan 400 o 403, sin el código en el cuerpo.
  - Un maestro ajeno recibe 403 en `PUT`, `GET …/codigo` y `POST …/codigo`, también con el UUID en mayúsculas, y la fila no cambia.
  - El admin con un `claseId` real recibe `403 ROL_NO_PERMITIDO`, también por `HEAD`.
- **Guarda (punto 2):**
  - `/api/clases/:claseid`, `:clase_id` y `:claseId2` no arrancan, ni con pertenencia.
  - No se pueden armar cadenas reordenadas ni con el sexto paso fuera de la posición 5 sin pasar por `protegido()`: la guarda exige las cinco marcas en orden (T-06 de AUTH).
- **Código (punto 3):**
  - 1,000 `POST /clases` seguidos (40 lotes de 25 en paralelo) dan 1,000 códigos distintos, todos de la forma `^[A-HJ-NP-Z2-9]{7}$`.
  - 10,000 códigos de `codigoDesdeBytes`, sin caracteres confusables.
  - Cinco `POST /clases/unirse` simultáneos del mismo alumno dejan una sola fila y un solo `yaEstabas: false`.
  - Unirse y regenerar a la vez (8 carreras): si hay inscripción, siempre es en la clase del código buscado, y un 404 no deja fila.
- **Reintento del código (lista del manager, punto 3):**
  - P2003 (maestro inexistente): el error sale sin traducir (500), el generador se llama una vez y no queda fila.
  - Texto con NUL (22021): `400 VALIDACION`, el generador se llama una vez y no queda fila.
  - `regenerarCodigo` cuando chocan los dos intentos: `500 CODIGO_NO_DISPONIBLE` y el código no cambia.
  - `regenerarCodigo` cuando solo choca el primero: se usa el segundo.
- **Fugas (punto 4 y lista del manager, punto 4):**
  - `GET /clases/:claseId` como dueño responde 200.
  - Ninguna respuesta del dueño (crear, detalle, editar, impartidas) trae `codigoInvitacion`, `estadoPago`, `accesoRestringido`, `email` ni `hashContrasena`, ni el valor del código.
  - Ninguna respuesta a un estudiante trae esas claves, la clave `codigo` ni el valor del código. Cubre unirse dos veces, detalle, inscritas y las negaciones de `/codigo` y `PUT`, con un compañero restringido inscrito en la misma clase.
- **HEAD (lista del manager, punto 5):**
  - `HEAD` de `/api/clases/:claseId`, `/codigo`, `/inscritas` e `/impartidas` da las mismas negaciones que el `GET`: 401 sin token, y 403 para el ajeno, el restringido inscrito, el admin, el estudiante en `/codigo` y el rol incorrecto. El cuerpo siempre va vacío.
  - `HEAD /codigo` como dueño: 200, `Cache-Control: no-store` y sin cuerpo.
- **Paginación (lista del manager, punto 6):**
  - `limite` en `0`, `101`, `-1`, `1.5`, vacío, `abc`, `Infinity`, `1e3` o repetido da `400 VALIDACION`, nunca 500.
  - Un cursor con inyección SQL da 400.
  - Un `limite` igual al número de filas da `siguienteCursor: null`.
  - Un cursor de una clase ajena, en `inscritas` o en `impartidas`, no devuelve ningún id, nombre ni maestro de esa clase.
- **Campos extra (lista del manager, punto 7):**
  - En `POST /clases`, no llegan a la base `maestroId`, `maestro_id`, `codigoInvitacion`, `codigo_invitacion`, `activa`, `id` ni `creadoEn`.
  - En `PUT`, no llegan `maestroId`, `codigoInvitacion`, `activa` ni `id`.
- **Interfaz, doble activación:** con "Sí, regenerar", "Unirme a la clase", "Crear clase" y "Ver más clases" en espera, tres clics más `submit` y `requestSubmit` mandan una sola petición.
- **Interfaz, rutas de otro rol:** en los tres casos no sale ninguna petición con el id de la clase.
  - Un maestro en `/estudiante/clases/:claseId` termina en `/maestro`.
  - Un estudiante en `/maestro/clases/:claseId/editar` termina en `/estudiante`.
  - Un restringido en `/estudiante/clases/:claseId` termina en `/acceso-restringido`.
- **Interfaz, foco en las tarjetas de color:** en el CSS compilado, `focus-visible:-outline-offset-4` y `outline-{accent,primary}-foreground` (blanco) están en la capa `utilities`, y el `:focus-visible` global en `base`. El contorno blanco interior sí se aplica.
- **Interfaz, cambio de cuenta sin cerrar sesión:** el login y el registro pasan por `consultarMeDeLaCuentaNueva`, que ahora hace `removeQueries()`, y cerrar sesión hace `clear()`. Lo revisé en el código; PR-A23a lo prueba.
- **Interfaz, un solo `primary`:** revisé el código de los inicios, `CrearClaseView` y `ClaseLayout` con `EditarClaseView`: hay un solo botón o enlace `primary` por vista.
- **Arquitectura (revisión estática):**
  - En los archivos nuevos del backend no hay `console.`, `$queryRaw`, `$executeRaw` ni `@prisma/client`, ni `estadoPago` o `accesoRestringido` fuera de `adapters/db`.
  - No hay consultas dentro de ciclos, ni `aws-*`, `@aws-sdk` o `nodemailer`.
  - En `frontend/src`, `fetch(` solo aparece en `services/apiClient.ts`, y `features/clases` no importa de otro módulo.
  - No hay `dangerouslySetInnerHTML`, `target="_blank"`, `localStorage` ni `sessionStorage`.
  - La migración `20260929232924_clases_e_inscripciones` es exactamente la de §D-A1.

### No atacado y por qué
- **Desborde real a 360 px y aspecto de las tarjetas:** hace falta un navegador y la regla prohíbe abrirlos. T-07 y T-08 se sostienen por el CSS compilado y las clases; queda para la comprobación humana si el manager la pide.
- **Cambio de identidad por refresco silencioso:** otra pestaña entra con otra cuenta y esta pestaña refresca con la cookie nueva. Es comportamiento de AUTH anterior a CLASES-a (`apiClient` no descarta la caché al refrescar) y este encargo no lo toca.
- **Nombre con caracteres de formato invisibles (U+200B, U+2060):** `nombreClaseSchema` prohíbe los `Cc` y los inversores de dirección, pero no los `Cf`, así que un nombre visualmente vacío es posible. No es hallazgo porque el plan solo pide excluir control e inversores; queda como observación para el manager.
- **Longitud del nombre en unidades de UTF-16:** `max(120)` cuenta unidades de código, así que 61 emojis (122 unidades) se rechazan. Es una observación, no un hallazgo: el plan no fija cómo se cuenta.
- **Personas, alumnos, muro y archivos:** son de CLASES-b, c y d.

### Carga del equipo (lista del manager, punto 1)
En la primera corrida completa del backend falló además `test/enlaces-registro.integracion.test.ts` > "lista en orden creado_en DESC, id DESC y pagina con cursor". Es la paginación global de `enlaces_registro`, anterior a CLASES-a, y mis pruebas no crean enlaces. Corrido solo da `Tests 39 passed (39)`, y en la segunda corrida completa pasó. No es de CLASES-a ni es un hallazgo.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` (antes: "All matched files use Prettier code style!") | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` (antes: "All matched files use Prettier code style!") | código 0 |
| `cd backend; npm test` (1.ª corrida) | `Test Files  4 failed \| 88 passed (92)` · `Tests  10 failed \| 1009 passed (1019)` · `Duration 54.38s` | 9 rojos míos + `enlaces-registro` por carga |
| `cd backend; npm test` (2.ª corrida) | `Test Files  3 failed \| 89 passed (92)` · `Tests  9 failed \| 1010 passed (1019)` · `Duration 55.77s` | exactamente los 9 rojos de T-01 a T-04 |
| `cd frontend; npm test` | `Test Files  2 failed \| 72 passed (74)` · `Tests  10 failed \| 1049 passed (1059)` · `Duration 52.80s` | exactamente los 10 rojos de T-05 a T-11 |
| `cd backend; npx vitest run test/enlaces-registro.integracion.test.ts` | `Tests  39 passed (39)` | verde |
| Formato, solo mis archivos: `cd backend; npx prettier --write test/clases-r1.ataque.test.ts test/guarda-clase-r1.ataque.test.ts src/core/clases/codigo-r1.ataque.test.ts` y `cd frontend; npx prettier --write src/features/clases/clases-r1.ataque.test.tsx src/features/clases/estatico-r1.ataque.test.ts src/app/rutas-clases-r1.ataque.test.tsx` | — | solo los 6 archivos |
| `cd frontend; npx vite build --outDir <scratchpad>/dist-r1 --emptyOutDir` (solo para leer el CSS compilado; fuera del repositorio) | `✓ built in 836ms` | código 0 |

Pruebas nuevas, con cifras tomadas de las corridas:
- **Backend: 32**, de las cuales 9 en rojo (`clases-r1` 19, `guarda-clase-r1` 8, `codigo-r1` 5).
- **Frontend: 18**, de las cuales 10 en rojo (`clases-r1` 12, `estatico-r1` 3, `rutas-clases-r1` 3).

Las salidas completas están en el scratchpad: `be-test.txt`, `be-test2.txt` y `fe-test.txt`.

### PARADAS
- **PA-01 y PA-02:** comprobadas, no se activaron.
- **PA-06:** no se activó. Ningún `*.ataque` anterior falla; los únicos rojos son los 19 de esta ronda.
- **PA-07** (salida completa del backend, en las dos corridas): `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 · `too many clients` 0. Mis pruebas de concurrencia no provocaron ninguno. No se activó. Los dos `P2028` son los aceptados de `cuentas-r3.ataque.test.ts`:
  1. `tx.sesion.create()` en `adapters/db/sesiones.ts:39`, desde `handlers/auth/index.ts:134` (`POST /api/auth/login`): límite de 5000 ms, 6547 ms en la 1.ª corrida y 6598 ms en la 2.ª.
  2. `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116`, desde `handlers/auth/cuentas.ts:106` (`POST /api/auth/restablecer`): 6074 ms y 6032 ms.
- **PA-11:** más de 120 s después de las corridas, `docker ps -a` solo muestra los contenedores de `infra/` (`campus-dev-postgres-1`, `campus-dev-minio-1`, `campus-dev-minio-init-1`, `campus-dev-livekit-1`); no queda Testcontainers ni Ryuk. No se activó.
- **PA-12:** mis 32 pruebas del backend dieron el mismo resultado en tres corridas (aislada y dos completas), y mis 18 del frontend en dos (aislada y completa). No se activó.
- **PA-15:** no se activó. Todo se hizo con dobles, adaptadores o análisis, sin editar ningún archivo de producción.

### Tabla de SHA-256 de todas las `*.ataque` después de los cambios (70: las 64 de la ronda 0, sin cambios, y 6 nuevas marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` (nuevo, ronda 1 de CLASES-a) |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` (nuevo, ronda 1 de CLASES-a) |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` (nuevo, ronda 1 de CLASES-a) |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `ADF3928D9CC6994304E99F9BCC6F1BFCC0FD28C87BF8CC7781BA32C9D06E4BD5` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` (nuevo, ronda 1 de CLASES-a) |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` (nuevo, ronda 1 de CLASES-a) |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` (nuevo, ronda 1 de CLASES-a) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `8472BAC787392C2027658365F6D58666EE346BD68AB52C6DFAE3D4C2FA1A7585` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

> **Nota de transcripción (orquestador, 2026-09-29).** La sección "CLASES-a — Ronda 2" la escribió el tester y la entregó en su respuesta final, por la misma restricción de su herramienta que en las rondas 0 y 1. Se registra tal cual (`docs/ESTADO.md` §4). Antes de transcribirla, el orquestador verificó: existen los 5 archivos `*-r2.ataque` nuevos y sus SHA-256 coinciden con la tabla; hay 75 `*.ataque` en los dos paquetes; dos archivos `-r1` tomados como muestra conservan su hash.

## CLASES-a — Ronda 2
Veredicto: **ROTO**
Verificación propia: lint backend OK · lint frontend OK · test backend (2.ª corrida) 6 rojos, todos míos / 1036 verdes · test frontend 4 rojos, todos míos / 1066 verdes.

Base `<R>` = `3399c79`. Rama `feat/clases`. Fecha: 2026-09-29.

> Nota: el tester no escribió este archivo, por la misma restricción de su sesión que en la ronda 1. Entregó la sección en su respuesta final para que el orquestador la transcriba.

### Precondiciones
- **Rama:** `feat/clases`.
- **V-01:** los SHA-256 de las 70 `*.ataque` coinciden con la tabla de "CLASES-a — Ronda 1" que está transcrita en `reporte-tester.md` (70/70, comparados por programa). Después de esta ronda las 70 siguen iguales.
- **PA-01:** `Get-NetFirewallRule` → `Enabled: True`, `Inbound`, `Block`, `Public`. La red es `IZZI-F281` (Pública), declarada de confianza. Backend permitido.
- **Archivos:** solo agregué los 5 archivos `-r2`. No toqué código de producción, pruebas normales ni ningún `*.ataque` existente.

### Regresión de la ronda 1 (los 19 casos)
`npx vitest run` sobre mis 6 archivos `-r1` da `Tests 32 passed (32)` en el backend y `Tests 18 passed (18)` en el frontend. Leí la corrección de cada uno para confirmar que el verde responde a la razón correcta:
- **T-01** (2 casos): `conDescripcionNormalizada` aplica `normalizarTextoLargo` antes de `validarCuerpo`, en `POST` y en `PUT`. Correcto.
- **T-02** (4 casos): `TIENE_CLASE_ID = /:claseId(?!\w)/` reconoce el parámetro en cualquier posición; `CLASES_COMODIN` cubre el comodín bajo `/clases/`; y bajo `/clases/`, el segmento siguiente tiene que ser exactamente `:claseId`. Correcto, salvo el residuo de T-13.
- **T-03** (1 caso): se agregó el selector `callee.property.value`. Correcto, salvo el residuo de T-14.
- **T-04** (2 casos): los separadores son solo espacio, tabulador y guion ASCII, y solo `a`–`z` pasan a mayúscula. Correcto; ver T-15, que contrasta la corrección con S-03.
- **T-05 y T-06** (3 casos): `CodigoDeClase` muestra `MensajeError` cuando hay error; "Copiar código" sin código avisa con `toast.error`, y el fallo al regenerar también avisa. Correcto.
- **T-07** (2 casos): la variante verde usa `bg-brand` con metadatos `text-brand-soft`, y la azul usa `bg-accent` con `text-accent-soft`. Correcto; en el CSS compilado aparecen `.bg-brand` y `.text-brand-soft`.
- **T-08** (2 casos): la tarjeta lleva `line-clamp-2 wrap-anywhere` y el `h1`, `min-w-0 wrap-anywhere`. Correcto; el CSS compilado genera `.line-clamp-2`, `.min-w-0{min-width:0}` y `.wrap-anywhere{overflow-wrap:anywhere}`. Queda un residuo en otras líneas: T-12.
- **T-09** (1 caso): `filas` queda en `undefined` y el panel resuelve el caso "sin datos" con `Cargando`. Es una corrección de fondo, no solo de sintaxis: lo confirma `inicio-sin-datos-r2`.
- **T-10** (1 caso): `tituloDelBloque` y `contenidoPanel` resuelven los estados con retornos tempranos. Correcto.
- **T-11** (1 caso): un `VALIDACION` que empieza con `claseId:` se muestra con el mensaje de `SIN_ACCESO_A_LA_CLASE`. Correcto; los demás `VALIDACION` se tratan en T-17.

### Hallazgos

#### T-12 — Un nombre de maestro de 120 caracteres sin espacios desborda la tarjeta y el encabezado
Severidad: media
Prueba: `frontend/src/features/clases/clases-r2.ataque.test.tsx`, casos "los metadatos de la tarjeta (nombre del maestro de 120 caracteres sin espacios) se cortan" y "'Maestro: <nombre>' del encabezado con un nombre de 120 caracteres sin espacios se corta".
Esperado:
- El `<span>` de metadatos de `TarjetaClase` lleva una regla de corte.
- La línea "Maestro: …" de `EncabezadoClase` lleva una regla de corte y `min-w-0`.

Obtenido: las dos solo llevan `text-small text-muted-foreground`. El mecanismo es el mismo que el manager aceptó para T-08:
- La tarjeta es un elemento de la rejilla `grid-cols-1 sm:grid-cols-2`. Su ancho mínimo es el contenido mínimo del texto más largo que no se corta, que ahora son los metadatos.
- "Maestro: …" es hija directa de la rejilla de `CardHeader`, igual que el `h1`.
- `nombreSchema` (`shared/src/auth.ts`) admite 120 caracteres sin exigir espacios.

Lo sostiene el análisis del CSS; el desborde no se vio en un navegador y queda para H-6.
Requisito o regla violada: `docs/DESIGN.md` §2 (lectura a 360 px) y §7.6; punto de ataque 5 del plan.

#### T-13 — La guarda deja arrancar `/api/clases*` sin el sexto paso
Severidad: baja
Prueba: `backend/test/guarda-clase-r2.ataque.test.ts`, caso "/api/clases* (comodín pegado a 'clases', sin barra) sin sexto paso no debe arrancar". La precondición la demuestra el caso "/api/clases* atiende de verdad /api/clases/<uuid>/personas (precondición del caso anterior)", que pasa.
Esperado: la API no arranca, igual que con `/api/clases/*`.
Obtenido: la API arranca.
- `CLASES_COMODIN = /\/clases\/.*\*/` exige una `/` después de "clases".
- find-my-way resuelve `/api/clases/<uuid>/personas` con esta ruta cuando no hay otra más específica, y deja la clase en `params["*"]` = `"/<uuid>/personas"`. Es decir, atiende toda la familia `/clases/`.

Con `claseDe` la ruta respondería 500. Un handler que leyera el comodín quedaría sin verificación de pertenencia.
Requisito o regla violada: regla enmendada de §D-0.3 ("todo comodín bajo `/clases/`"); AGENTS.md regla 2.

#### T-14 — ESLint §D-0.4 no detecta ``app[`addHook`](...)``
Severidad: baja
Prueba: `backend/test/guarda-clase-r2.ataque.test.ts`, caso "app[`addHook`](...) (acceso con plantilla) también debe rechazarse". El caso de control pasa: `app.addHook`, `app["addHook"]` y `app?.addHook` sí se rechazan.
Esperado: el error "no añaden hooks".
Obtenido: sin error. La propiedad es un `TemplateLiteral`, así que ninguno de los dos selectores (`property.name` y `property.value`) la reconoce. Es la misma familia que T-03: un acceso con corchetes. `.call` y la desestructuración las dejó el manager fuera de alcance, y no las reporto.
Requisito o regla violada: §D-0.4 (M-14).

#### T-15 — El código de invitación rechaza espacios y guiones de Unicode que S-03 acepta
Severidad: baja
Prueba: `backend/src/core/clases/codigo-r2.ataque.test.ts`, casos "acepta el código con espacio no separable (U+00A0), el que insertan correos y procesadores de texto", "acepta el código con espacio ideográfico (U+3000) y espacio fino no separable (U+202F)" y "acepta los guiones de Unicode U+2010 (guion) y U+2011 (guion no separable)".
Esperado: los acepta y los normaliza a `ABCDEFG`, porque S-03 dice "se aceptan minúsculas, espacios y guiones".
Obtenido: los rechaza con "Escribe los 7 caracteres del código". La corrección de T-04 restringió los separadores a `[ \t-]` ASCII. Así sigue bien rechazado U+FEFF (invisible), pero también se rechazan espacios y guiones visibles que un correo o un teclado móvil insertan al copiar el código.

No exijo las rayas U+2012 a U+2015: en español, "guion" es U+2010 y U+2011, y "raya" es otra cosa. Aceptar un subconjunto explícito de separadores no afecta la seguridad, porque la forma final sigue siendo `^[A-HJ-NP-Z2-9]{7}$`.
**Para el manager:** si prefiere mantener "solo ASCII", el remedio es enmendar S-03, no el código.
Requisito o regla violada: S-03.

#### T-16 — El nombre de la clase acepta separadores de línea Unicode
Severidad: baja
Prueba: `backend/test/clases-r2.ataque.test.ts`, caso "un nombre con separador de línea o de párrafo Unicode (U+2028, U+2029) se rechaza: debe ser de una sola línea".
Esperado: 400.
Obtenido: `201` con `"nombre":"Clase Dos"`. `nombreClaseSchema` solo prohíbe `\r` y `\n`, los `Cc` y los inversores de dirección. U+2028 (clase Zl) y U+2029 (clase Zp) son saltos obligatorios en UAX #14. Que el navegador parta la línea en la tarjeta o en el `h1` no se verificó sin navegador.
Requisito o regla violada: S-02 ("una línea") y §D-A3 (`nombreClaseSchema`, de una sola línea).

#### T-17 — Un `VALIDACION` del servidor en los formularios muestra el nombre interno del campo y cae en el campo equivocado
Severidad: baja
Prueba: `frontend/src/features/clases/clases-r2.ataque.test.tsx`, casos "al editar, un VALIDACION de la descripción se muestra en su campo y sin el nombre técnico del campo" y "al unirse, un VALIDACION del servidor se muestra sin el nombre técnico del campo".
Esperado: el mensaje sin el prefijo `descripcion:` o `codigo:`, y el error de la descripción asociado a "Descripción (opcional)".
Obtenido:
- `mensajeDeErrorClases` devuelve `error.message` tal cual para todo `VALIDACION` que no empiece con `claseId:`.
- `FormularioClase` pone cualquier error bajo el campo `nombre`.

Resultado: aparece "descripcion: No puede tener más de 2000 caracteres" bajo "Nombre de la clase", y "codigo: Escribe los 7 caracteres del código" bajo el código.
Hoy solo se alcanza si la validación del cliente y la del servidor no coinciden, porque las dos usan el mismo esquema. Eso pasa, por ejemplo, con versiones desfasadas: el frontend y el backend se despliegan por separado. De ahí la severidad baja.
Requisito o regla violada: `docs/DESIGN.md` §9 (tono de los textos); el mismo principio de T-11 (ningún texto técnico en la interfaz); CLAUDE.md, formularios (error del campo con `ErrorDeCampo` en su campo).

### Atacado sin hallazgos
- **Guarda (T-02):**
  - Diez formas fuera de `/clases` se rechazan sin el sexto paso y arrancan con `inscripcion` y con `propiedad`: `:claseId`, `:claseId?`, `:claseId(regex)`, `:claseId-:parte`, `:parte-:claseId`, `pre-:claseId`, `:parte.:claseId`, `:claseId.:ext`, `:claseId(^x)-:y` y `:a.:claseId(^x)`. Esto cubre lo que PR-A06f no probaba.
  - `app.route({ url: "/x/:claseId" })` sin el sexto paso se rechaza.
  - Con un `prefix` anidado (`/api`, luego `/clases`, luego `/:id`), la ruta se rechaza aun con pertenencia.
  - Con el `prefix` `/api/x/:claseId` y la ruta `/`, se rechaza sin el sexto paso.
  - Los comodines `/clases/*`, `/clases/x/*` y `/clases/:claseId/a/*` se rechazan.
  - Ninguna ruta existente dejó de arrancar: `construirApp` arranca en todos los `beforeAll`, y `sesiones-y-cadena` pasa con su lista exacta de rutas.
- **Mayúsculas en `/Clases/`:** Fastify distingue mayúsculas por omisión y `app.ts` no cambia `caseSensitive`. Por eso `/api/Clases/:id` es otra URL: no atiende `/api/clases/...` (lo verifiqué con find-my-way; solo con `caseSensitive: false` choca con `/api/clases/:claseId` al registrarla). No lo reporto: es el riesgo aceptado R-08 (regla por nombre).
- **T-01:**
  - Un nombre con CRLF, CR o LF interiores da 400 y no crea fila. En los extremos lo quita el `trim`, que es un comportamiento aceptado.
  - CRLF junto con BEL, NUL, U+202E, NEL o ESC en la descripción da 400 y no crea fila.
  - Una descripción que solo tiene saltos se guarda como `null`.
  - Una descripción numérica, en arreglo, en objeto o booleana da 400.
  - El interior no cambia: tabuladores, espacios dobles y un emoji con U+200D se conservan.
- **T-04:** siguen rechazados U+FEFF, U+200B, `ß`, `ſ`, `ﬀ` y el ancho completo. Siguen aceptados las minúsculas, el espacio, el tabulador y el guion ASCII.
- **T-05 y T-06:** "Copiar código" mientras el código carga da un aviso y no copia nada. Un `/codigo` con 403 muestra "No tienes acceso a esta clase." y no el texto del servidor. Regenerar con éxito después de un error de carga cambia el error por el código nuevo y da el aviso de éxito.
- **T-08:** el título de la tarjeta y el `h1` con 60 emojis conservan la regla de corte (con `min-w-0` en el `h1`). En el CSS compilado (`vite build` hacia el scratchpad) están `.line-clamp-2`, `.min-w-0{min-width:0}` y `.wrap-anywhere{overflow-wrap:anywhere}`. Lo visual queda para H-6.
- **T-09 y T-10:** en los dos inicios, con la consulta sin error, sin carga y sin datos (hooks del módulo doblados), no aparece "Aún no tienes clases", "Aún no estás en ninguna clase" ni un titular con total; sí aparece el saludo. En `features/clases` (sin pruebas) no hay ningún arreglo de respaldo: la búsqueda de `?? [`, `|| [`, `: []`, `= []` y `?? {}` da cero. Los únicos `?? ""` son de texto (`claseId`, el nombre del saludo y la descripción precargada) y CLAUDE.md los permite.
- **Regresión rápida:**
  - P2003 no se reintenta ni se traduce; 22021 da 400 sin reintento.
  - `HEAD /codigo` como dueño: 200 con `no-store` y sin cuerpo. `HEAD` como maestro ajeno: 403 sin cuerpo.
  - `limite` en 0, 101 o `abc` da 400.
  - Los campos extra (`maestroId`, `codigoInvitacion`, `activa`, `id`) no llegan a la base.
  - Ninguna respuesta a un estudiante (detalle, inscritas, inscritas con cursor ajeno, unirse) trae las claves `codigo`, `codigoInvitacion`, `estadoPago`, `accesoRestringido` ni `email`, ni el valor del código ni el id de la clase ajena. El detalle del dueño no trae `codigoInvitacion`, `estadoPago` ni `email`.

### No atacado y por qué
- **Desborde real a 360 px y saltos por U+2028:** hace falta un navegador. T-12 y T-16 se sostienen por análisis del CSS y del esquema; quedan para H-6.
- **"Hola, \<nombre\>" con un nombre de 120 caracteres sin espacios:** está dentro de columnas flex, no de una rejilla, así que el texto se saldría del bloque pero no ensancharía la página. Sin navegador no sé qué hace; lo anoto para H-6 junto con T-12.
- **`.call` y la desestructuración de `addHook`:** el manager las dejó fuera del alcance del lint.
- **`/api/*` y `/api/:seccion/*`:** son comodines generales que también atenderían `/api/clases/...` sin una ruta más específica. Quedan fuera de la regla enmendada ("bajo `/clases/`"); lo dejo como observación para CHORE-02 (M-15, la guarda sobre todas las rutas).
- **`descripcion: null` en `PUT`** (ida y vuelta del `GET`, que devuelve `null`): da 400. Es una observación: el plan define `descripcion?` como texto opcional.

### Intermitencia (lista del manager, punto 1)
**1.ª corrida del backend:** 11 archivos en rojo, todos por tiempo límite salvo mis 6.
- Cayeron `cuentas-r1` (el `LOCK TABLE`, a 15 s), `cuentas-r3` (la fila retenida, a 40 s), `bloqueo-usuario`, `restablecer`, `cuentas-03a-r1` y `worker-correo-de-cuenta`.
- También cayó el hook `worker-03c-r1` (10 s), y de rebote PR-A15h y el `afterAll` de `clases-autorizacion`.
- Hubo `P2028` de 39.9 s y 38.1 s: es la firma de la espera en cadena de CHORE-02.

**2.ª corrida:** limpia, con exactamente mis 6 rojos. En ningún caso de CLASES-a se repitió un tiempo límite.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| Regresión: `cd backend; npx vitest run test/clases-r1.ataque.test.ts test/guarda-clase-r1.ataque.test.ts src/core/clases/codigo-r1.ataque.test.ts` | `Tests  32 passed (32)` | verde |
| Regresión: `cd frontend; npx vitest run src/features/clases/clases-r1.ataque.test.tsx src/features/clases/estatico-r1.ataque.test.ts src/app/rutas-clases-r1.ataque.test.tsx` | `Tests  18 passed (18)` | verde |
| `cd backend; npm test` (1.ª corrida) | `Test Files  11 failed \| 84 passed (95)` · `Tests  16 failed \| 1026 passed (1042)` · `Duration 73.80s` | mis 6 + intermitencia conocida (solo tiempos límite) |
| `cd backend; npm test` (2.ª corrida) | `Test Files  3 failed \| 92 passed (95)` · `Tests  6 failed \| 1036 passed (1042)` · `Duration 37.85s` | exactamente T-13 a T-16 |
| `cd frontend; npm test` | `Test Files  1 failed \| 75 passed (76)` · `Tests  4 failed \| 1066 passed (1070)` · `Duration 36.76s` | exactamente T-12 y T-17 |
| `cd frontend; npx vite build --outDir <scratchpad>/dist-r2 --emptyOutDir` (fuera del repositorio) | `✓ built in 583ms` | código 0 |
| Formato: `cd backend; npx prettier --write test/clases-r2.ataque.test.ts test/guarda-clase-r2.ataque.test.ts src/core/clases/codigo-r2.ataque.test.ts` y `cd frontend; npx prettier --write src/features/clases/clases-r2.ataque.test.tsx src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` | — | solo los 5 archivos |

**Pruebas nuevas:**
- **Backend: 21** según `npx vitest list` (`clases-r2` 8, `guarda-clase-r2` 9, `codigo-r2` 4); 6 en rojo.
- **Frontend: 11** (`clases-r2` 9, `inicio-sin-datos-r2` 2); 4 en rojo.
- `npx vitest list` completo del backend da 1042, que son las 1021 anteriores más estas 21.

### PARADAS
- **PA-01 y PA-02:** comprobadas, no se activaron.
- **PA-06:** no se activó. Ninguna `*.ataque` anterior falla por aserción; los únicos rojos son los 10 de esta ronda.
- **PA-07** (2.ª corrida, la limpia): `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 · `too many clients` 0. Mis pruebas no provocaron ninguno. No se activó. Los dos `P2028` son los aceptados:
  1. `tx.sesion.create()` en `adapters/db/sesiones.ts:39`, desde `handlers/auth/index.ts:134`: 6537 ms.
  2. `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116`, desde `handlers/auth/cuentas.ts:106`: 6057 ms.

  La 1.ª corrida tuvo 3 `P2028`, en los mismos dos sitios (uno repetido), por la espera en cadena documentada: 39.9 s, 38.1 s y 6.1 s.
- **PA-11:** después de las corridas, `docker ps -a` solo muestra los 4 contenedores de `infra/`; no queda Testcontainers ni Ryuk. No se activó.
- **PA-12:** los 6 rojos del backend se repitieron idénticos en la corrida aislada y en las dos completas, y los 4 del frontend en la aislada y la completa. No se activó.
- **PA-15:** no se activó.

### Tabla de SHA-256 de todas las `*.ataque` después de los cambios (75: las 70 de la ronda 1, sin cambios, y 5 nuevas marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` (ronda 1 de CLASES-a) |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` (nuevo, ronda 2 de CLASES-a) |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` (ronda 1 de CLASES-a) |
| `A765F44BC14748A7A6023A21643AAA17504112B83E5399D830427DDE7F32FFAC` | `backend/test/clases-r2.ataque.test.ts` (nuevo, ronda 2 de CLASES-a) |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` (ronda 1 de CLASES-a) |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` (nuevo, ronda 2 de CLASES-a) |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `ADF3928D9CC6994304E99F9BCC6F1BFCC0FD28C87BF8CC7781BA32C9D06E4BD5` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` (ronda 1 de CLASES-a) |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` (ronda 1 de CLASES-a) |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` (nuevo, ronda 2 de CLASES-a) |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` (ronda 1 de CLASES-a) |
| `BAB2B0188BCF02DD260A47519C3BD38712B07FA1F521C23BFA80BF34401DE165` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` (nuevo, ronda 2 de CLASES-a) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `8472BAC787392C2027658365F6D58666EE346BD68AB52C6DFAE3D4C2FA1A7585` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

> **Nota de transcripción (orquestador, 2026-09-29).** La sección "CLASES-a — Ronda 3" la escribió el tester y la entregó en su respuesta final, por la misma restricción de su herramienta que en las rondas anteriores. Se registra tal cual (`docs/ESTADO.md` §4). Antes de transcribirla, el orquestador verificó: existen los 2 archivos `*-r3.ataque` nuevos y sus SHA-256 coinciden con la tabla; hay 77 `*.ataque` en los dos paquetes; dos archivos `-r2` tomados como muestra conservan su hash.

## CLASES-a — Ronda 3
Veredicto: **ROTO** (última ronda: se escala según `AGENTS.md`)
Verificación propia: lint backend OK · lint frontend OK · test backend 1 rojo (mío, T-18) / 1051 verdes · test frontend 3 rojos (míos, T-19) / 1078 verdes.

Base `<R>` = `3399c79`. Rama `feat/clases`. Fecha: 2026-09-29.

> Nota: el tester no escribió este archivo, por la misma restricción de su sesión que en las rondas anteriores. Entregó la sección en su respuesta final para que el orquestador la transcriba.

### Precondiciones
- **Rama:** `feat/clases`.
- **V-01:** los SHA-256 de las 75 `*.ataque` coinciden con la tabla de "CLASES-a — Ronda 2" (75/75, comparados por programa). Después de esta ronda las 75 siguen iguales.
- **PA-01:** `Get-NetFirewallRule` → `Enabled True`, `Inbound`, `Block`, `Public`. La red es `IZZI-F281` (Pública), declarada de confianza. Backend permitido.
- **Archivos:** solo agregué los 2 archivos `-r3`. No toqué código de producción, pruebas normales ni ningún `*.ataque` existente.

### Regresión de las rondas 1 y 2
Corrí mis 11 archivos `-r1` y `-r2`:
- **Backend:** `test/clases-r1`, `guarda-clase-r1`, `codigo-r1`, `clases-r2`, `guarda-clase-r2` y `codigo-r2` dan `Tests 53 passed (53)`.
- **Frontend:** `clases-r1`, `estatico-r1`, `rutas-clases-r1`, `clases-r2` e `inicio-sin-datos-r2` dan `Tests 29 passed (29)`.

Leí cada corrección para confirmar que el verde responde a la razón correcta:
- **T-02 y T-13 (guarda):**
  - `TIENE_CLASE_ID = /:claseId(?!\w)/` reconoce el parámetro en cualquier posición.
  - `CLASES_COMODIN = /\/clases(?![A-Za-z0-9_]).*\*/` cubre tanto `/clases*` como `/clases/*` a cualquier profundidad.
  - Bajo `/clases/`, el segmento siguiente tiene que ser exactamente `:claseId`.
  - Las diez formas de la ronda 2 siguen rechazándose sin el sexto paso y arrancando con él.
- **T-14:** el tercer selector `callee.property.quasis.0.value.raw='addHook'` está en `eslint.config.mjs`.
- **T-15:** leí por programa los puntos de código de `SEPARADORES_CODIGO_CLASE`: espacio, `\t`, `-`, U+00A0, U+2007, U+202F, U+3000, U+2010 y U+2011. Coincide exactamente con la decisión del manager. U+2012 a U+2015, U+FEFF y U+200B quedan fuera y se rechazan. `toUpperCase` sigue solo sobre `a`-`z`.
- **T-16:** `SEPARADORES_DE_LINEA_UNICODE = /[\r\n  ]/` se usa en el `refine` de una sola línea.
- **T-09:** `filas` queda en `undefined` y `contenidoPanel` muestra `Cargando` cuando no hay datos; lo confirma `inicio-sin-datos-r2`.
- **T-12:** hay `wrap-anywhere` en los metadatos de la tarjeta y `min-w-0 wrap-anywhere` en "Maestro: …"; además, el saludo lleva `wrap-anywhere`.
- **T-17:** `mensajeDeErrorClases` quita el prefijo `campo:` de todo `VALIDACION`, y `erroresDeFormularioClases` asocia el error al campo que nombra el servidor.

### Hallazgos

#### T-18 — "Ver más clases" con un cursor que ya no existe devuelve una página vacía y oculta las clases restantes
Severidad: media
Prueba: `backend/test/clases-r3.ataque.test.ts`, caso "si el alumno deja la clase del cursor entre dos páginas, la siguiente no oculta en silencio las clases restantes".
Preparación: el alumno está inscrito en 4 clases.
- `GET /api/clases/inscritas?limite=2` devuelve 2 clases y un cursor.
- Se borra la inscripción de la clase del cursor, lo que simula la baja que llega con CLASES-b.
- `GET /api/clases/inscritas?limite=2&cursor=<esa clase>` pide la página siguiente.

Esperado: las 2 clases restantes, o un error explícito (400 o 409).
Obtenido: `200` con `clases: []` y `siguienteCursor: null` ("la página 2 respondió 200 con 0 clases y ocultó 2").
- `listarClasesInscritas` usa el `cursor` de Prisma sobre la llave compuesta `(clase_id, usuario_id)`. Si esa fila ya no existe, Prisma devuelve una lista vacía.
- En el frontend, "Ver más clases" desaparece: el alumno ve 2 tarjetas mientras el titular dice "Estás en 3 clases", sin ningún aviso.
- En `impartidas` pasaría lo mismo si se borrara una clase; hoy ninguna ruta borra clases.

El caso se alcanza en cuanto exista la baja manual (CLASES-b, `DELETE …/alumnos/:alumnoId`) o una baja de la cuenta.
Requisito o regla violada: punto de ataque 5 de CLASES-b ("un cursor de un alumno quitado o desactivado entre dos páginas"), adelantado por la lista del manager para esta ronda; RF-10 (la lista de clases del alumno); ESSENTIALS, "toda lista se pagina" (paginar no puede perder filas en silencio).

#### T-19 — Un error que no es de un campo queda marcado en "Nombre de la clase"
Severidad: baja
Prueba: `frontend/src/features/clases/clases-r3.ataque.test.tsx`, tres casos: "con 500 ERROR_INTERNO al guardar, el campo \"Nombre de la clase\" no queda marcado como inválido", "con 403 SIN_ACCESO_A_LA_CLASE al guardar, …" y "con sin conexión al guardar, …".
Esperado: el fallo se muestra como error del formulario (aviso o `MensajeError`), y el campo "Nombre de la clase" no queda con `aria-invalid="true"`.
Obtenido: para todo error que no es `VALIDACION`, `erroresDeFormularioClases` devuelve `{ [primero]: mensaje }`, con `primero = "nombre"`. El campo queda con `aria-invalid="true"` y con "Algo salió mal. Inténtalo de nuevo." o "No tienes acceso a esta clase." como si el nombre estuviera mal.
- Es la observación de T-17 que hizo el manager; ya pasaba antes de T-17.
- La clasifico como hallazgo bajo porque le dice a quien usa un lector de pantalla que un campo válido es inválido.
- En "Unirme a la clase", `CODIGO_INVALIDO` sí es un error del campo del código, y ahí está bien.

Requisito o regla violada: CLAUDE.md, Formularios (`ErrorDeCampo` es para el error de un campo) y "Manejo de errores en el frontend" (los demás errores van con un aviso); `docs/DESIGN.md` §9.

### Atacado sin hallazgos
- **Pertenencia (punto 1 del plan):**
  - Con un plugin cuyo `prefix` lleva `:claseId` (`/api/eco/:claseId`) y una ruta con `pertenencia: "inscripcion"` que devuelve `claseDe(request).id`, el miembro recibe 200 con **el mismo** `claseId` de la ruta, aunque la query traiga `?claseId=<otra>`.
  - El miembro de la otra clase recibe 403 `SIN_ACCESO_A_LA_CLASE`: el sexto paso y el handler usan el parámetro de la ruta, nunca el de la query.
  - En 6 carreras simultáneas, un maestro ajeno hizo `PUT` (también con el UUID en mayúsculas) y `POST /codigo` mientras el dueño editaba y regeneraba. El ajeno recibió 403 siempre, y la fila terminó con el nombre y el último código del dueño y con el mismo `maestro_id`.
- **Guarda (punto 2):**
  - No se puede registrar una ruta después de `ready()`: Fastify lo rechaza, así que no hay forma de saltarse la guarda por ahí.
  - La combinación de un `prefix` con `:claseId` y la ruta vacía se rechaza sin el sexto paso (ronda 2) y arranca con él (esta ronda).
  - Los comodines generales `/api/*` quedan para CHORE-02, por indicación del manager.
- **Código (punto 3):**
  - Después de regenerar A, su código viejo da `404 CODIGO_INVALIDO` y no inscribe en ninguna clase; el código de B inscribe en B.
  - Un código de exactamente 40 caracteres, con los 9 separadores de la lista intercalados y relleno de espacios, se normaliza a 7 y se acepta.
  - Con 41 caracteres responde 400 sin inscribir.
- **Fugas (punto 4):** recorrí 9 rutas (`POST /clases`, `inscritas`, `impartidas`, `unirse`, `GET` y `HEAD` del detalle, `PUT`, y `GET` y `HEAD` de `/codigo`) con 5 tokens: dueño, maestro ajeno, estudiante inscrito, restringido inscrito y admin. Resultado:
  - Ninguna respuesta es 5xx.
  - Ningún cuerpo trae `codigoInvitacion`, `estadoPago`, `accesoRestringido`, `email` ni `hashContrasena`.
  - El valor del código solo aparece en el `GET` y el `HEAD` de `/codigo` del dueño, los dos con `Cache-Control: no-store`.
  - Ninguna cabecera trae el código.
- **PA-10 (logs):** en la salida completa del backend, las líneas de log (`"level"`) no contienen ningún texto con forma de código (`[A-HJ-NP-Z2-9]{7}` aislado), ni `body`, `payload` o `codigoInvitacion`. Los logs solo registran método, URL y estado, y el código nunca viaja en la URL.
- **Interfaz (punto 5), una sola acción principal:** hay a lo sumo un botón o enlace `primary` por vista. Lo comprobé en el inicio del estudiante (vacío y con clases), el inicio del maestro (vacío y con clases), `/maestro/clases/nueva`, la clase del maestro y la clase del maestro con "Editar clase". El control es que "Crear clase" del inicio del maestro se reconoce como `primary`.
- **Foco al primer campo con error:** ni el plan ni `DESIGN.md` lo piden, y ningún formulario del proyecto lo hace (el error se asocia con `aria-describedby` y `aria-invalid`). No lo reporto.

### No atacado y por qué
- **Caracteres `Cf` en el nombre, longitud en unidades UTF-16 y `descripcion: null` en `PUT`:** por indicación del manager, solo se anotan (ver abajo).
- **Comodines generales `/api/*` y `/api/:seccion/*`:** quedan para CHORE-02 (M-15).
- **"Ver más" en `impartidas` con una clase borrada:** hoy ninguna ruta borra clases. El mecanismo es el mismo de T-18.

### Observaciones para el manager y para H-6
- **Para el manager (revisión final):**
  - `nombreClaseSchema` admite caracteres `Cf` invisibles (U+200B, U+2060), con los que se puede crear una clase de nombre visualmente vacío.
  - `max(120)` cuenta unidades de UTF-16: 61 emojis se rechazan.
  - Un `PUT` con `descripcion: null` (el valor que devuelve el `GET`) responde 400.
  - `codigo-de-clase.tsx` todavía tiene el texto "No pudimos copiar el código. Cópialo a mano." escrito en el componente, y no en `data.ts`.
- **Para H-6 (navegador), sin verificar:** a 360 px, un nombre de clase de 120 caracteres sin espacios y uno de 60 emojis en la tarjeta (2 líneas) y en el `h1`; un nombre de maestro de 120 caracteres sin espacios en la tarjeta y en "Maestro: …"; y el saludo "Hola, \<nombre largo\>". Las utilidades están en el CSS compilado (`.wrap-anywhere`, `.min-w-0`, `.line-clamp-2`), pero su efecto no se vio.
- **Intermitencia:** esta vez la suite del backend salió limpia al primer intento (`LOCK TABLE` sin espera en cadena). La recomendación de CHORE-02 no cambia.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| Regresión: `cd backend; npx vitest run` (los 6 archivos `-r1` y `-r2`) | `Tests  53 passed (53)` | verde |
| Regresión: `cd frontend; npx vitest run` (los 5 archivos `-r1` y `-r2`) | `Tests  29 passed (29)` | verde |
| `cd backend; npm test` | `Test Files  1 failed \| 95 passed (96)` · `Tests  1 failed \| 1051 passed (1052)` · `Duration 37.97s` | exactamente T-18 |
| `cd frontend; npm test` | `Test Files  1 failed \| 76 passed (77)` · `Tests  3 failed \| 1078 passed (1081)` · `Duration 36.18s` | exactamente T-19 |
| Formato: `cd backend; npx prettier --write test/clases-r3.ataque.test.ts` y `cd frontend; npx prettier --write src/features/clases/clases-r3.ataque.test.tsx` | — | solo los 2 archivos |

Pruebas nuevas, contadas con `npx vitest list`:
- **Backend: 7**, de las cuales 1 en rojo. El total de la suite es 1052 (1045 + 7).
- **Frontend: 11**, de las cuales 3 en rojo. El total es 1081 (1070 + 11).

Cada archivo `-r3` dio el mismo resultado corrido aislado y en la suite completa.

### PARADAS
- **PA-01 y PA-02:** comprobadas, no se activaron.
- **PA-06:** no se activó. Ninguna `*.ataque` anterior falla; los únicos rojos son los 4 de esta ronda.
- **PA-07:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 · `too many clients` 0. No se activó. Los dos `P2028` son los aceptados:
  1. `tx.sesion.create()` en `adapters/db/sesiones.ts:39`, desde `handlers/auth/index.ts:134`: 6387 ms.
  2. `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116`, desde `handlers/auth/cuentas.ts:106`: 6057 ms.
- **PA-10:** no se activó (ver "Atacado sin hallazgos").
- **PA-11:** después de las corridas, `docker ps -a` solo muestra los 4 contenedores de `infra/`. No se activó.
- **PA-12 y PA-15:** no se activaron.

### Tabla de SHA-256 de todas las `*.ataque` después de los cambios (77: las 75 de la ronda 2, sin cambios, y 2 nuevas marcadas)
Idéntica a la tabla de la ronda 2 en las 75 filas existentes; las dos filas nuevas son:

| SHA-256 | Archivo |
|---|---|
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` (nuevo, ronda 3 de CLASES-a) |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` (nuevo, ronda 3 de CLASES-a) |

> Nota del orquestador: el tester entregó la tabla completa de 77 filas; las 75 primeras coinciden fila por fila con la tabla de la ronda 2 transcrita arriba, así que aquí se registran solo las dos filas nuevas. La tabla vigente para V-01 es la de la ronda 2 más estas dos.

> **Nota de transcripción (orquestador, 2026-09-29).** La sección "CLASES-a — Ronda 4, adaptación C-16" la escribió el tester y la entregó en su respuesta final (misma restricción). Antes de transcribirla, el orquestador verificó que el SHA-256 actual de `backend/test/clases-r2.ataque.test.ts` es el que reporta y que siguen siendo 77 `*.ataque`. Contexto: la ronda 3 terminó en ROTO, el manager escaló, y el humano autorizó una cuarta ronda cerrada y aprobó la regla de T-18 (`aprobacion.md`, "Decisión del humano sobre la escalada de CLASES-a"). El conflicto entre esa regla y este caso lo arbitró el manager (opción B) y queda registrado en su verificación de la ronda 4.

## CLASES-a — Ronda 4, adaptación C-16

> Nota: el tester no escribió este archivo, por la misma restricción de su sesión que en las rondas anteriores. Entregó la sección en su respuesta final para que el orquestador la transcriba.

**Motivo.** El humano aprobó la regla para T-18: con un cursor que no es una inscripción del alumno ni una clase del maestro, `GET /clases/inscritas` e `/impartidas` responden `400 VALIDACION` con el mensaje `"cursor: no es válido"`.
- Eso contradice la tercera petición de `respuestasAlumno` del caso "HEAD, paginación, campos extra y fugas siguen como en la ronda 1" (`backend/test/clases-r2.ataque.test.ts`), que esperaba `< 300`.
- La adaptación es exactamente la que fijó el manager. El caso sigue protegiendo que no haya fuga de la clase ajena, y además comprueba que no hay oráculo de existencia.

**Precondiciones:**
- **PA-01:** `Get-NetFirewallRule` → `Enabled True`, `Inbound`, `Block`, `Public`. Backend permitido.
- **Hash antes del cambio:** el SHA-256 del archivo era `A765F44BC14748A7A6023A21643AAA17504112B83E5399D830427DDE7F32FFAC`, igual al de la tabla de la ronda 3.

**Qué cambió:**
1. Comentario nuevo al inicio del caso: "CLASES-a ronda 4 (C-16): adaptación por la regla de T-18 aprobada por el humano; sigue protegiendo que no haya fuga de la clase ajena".
2. `GET /api/clases/inscritas?cursor=${ajena.id}` sale del bucle y se comprueba aparte:
   - estado 400, `error.codigo` `"VALIDACION"` y `error.mensaje` `"cursor: no es válido"`;
   - el cuerpo no contiene `ajena.id`, el id del maestro ajeno, `"Ajena"`, el código de invitación de `ajena` ni el de la clase propia;
   - `clavesEn` no encuentra `codigoInvitacion`, `estadoPago`, `accesoRestringido` ni `email`. Aquí no se busca `"codigo"`, porque la trae siempre el sobre de error y su valor ya queda fijado en `"VALIDACION"`.
3. Aserción nueva sin oráculo de existencia: `GET /api/clases/inscritas?cursor=${randomUUID()}` responde idéntico al cursor ajeno, con el mismo estado, `codigo` y `mensaje`.
4. Sin cambios: las otras tres respuestas del alumno siguen en el bucle con `< 300` y con todas sus aserciones, incluida `"codigo"` en `clavesEn`. El resto del caso y del archivo tampoco cambia.

**Diff completo contra la versión de la ronda 2** (`diff -u`; el formateo no cambió nada):
```diff
@@ -185,6 +185,8 @@
   })
 
   it("HEAD, paginación, campos extra y fugas siguen como en la ronda 1", async () => {
+    // CLASES-a ronda 4 (C-16): adaptación por la regla de T-18 aprobada por el humano; sigue
+    // protegiendo que no haya fuga de la clase ajena.
     const dueno = await maestro()
     const ajeno = await maestro()
     const alumno = await estudiante()
@@ -225,7 +227,6 @@
     const respuestasAlumno = [
       await pedir("GET", `/api/clases/${claseId}`, tokenA),
       await pedir("GET", "/api/clases/inscritas", tokenA),
-      await pedir("GET", `/api/clases/inscritas?cursor=${ajena.id}`, tokenA),
       await pedir("POST", "/api/clases/unirse", tokenA, { codigo: fila?.codigoInvitacion }),
     ]
     for (const r of respuestasAlumno) {
@@ -242,6 +243,35 @@
         ]),
       ).toEqual([])
     }
+
+    // Cursor de una clase ajena (T-18): 400 VALIDACION, sin fuga de la clase ajena.
+    const cursorAjeno = await pedir("GET", `/api/clases/inscritas?cursor=${ajena.id}`, tokenA)
+    expect(cursorAjeno.statusCode).toBe(400)
+    const errorAjeno = errorApiSchema.parse(cursorAjeno.json()).error
+    expect(errorAjeno.codigo).toBe("VALIDACION")
+    expect(errorAjeno.mensaje).toBe("cursor: no es válido")
+    expect(cursorAjeno.body).not.toContain(ajena.id)
+    expect(cursorAjeno.body).not.toContain(ajeno.id)
+    expect(cursorAjeno.body).not.toContain("Ajena")
+    expect(cursorAjeno.body).not.toContain(ajena.codigoInvitacion)
+    expect(cursorAjeno.body).not.toContain(String(fila?.codigoInvitacion))
+    // Sin "codigo": el sobre de error { error: { codigo, mensaje } } la trae siempre, y su valor ya
+    // quedó fijado en "VALIDACION".
+    expect(
+      clavesEn(cursorAjeno.body, ["codigoInvitacion", "estadoPago", "accesoRestringido", "email"]),
+    ).toEqual([])
+
+    // Sin oráculo de existencia: un id que no existe responde idéntico al cursor ajeno.
+    const cursorInexistente = await pedir(
+      "GET",
+      `/api/clases/inscritas?cursor=${randomUUID()}`,
+      tokenA,
+    )
+    expect(cursorInexistente.statusCode).toBe(cursorAjeno.statusCode)
+    const errorInexistente = errorApiSchema.parse(cursorInexistente.json()).error
+    expect(errorInexistente.codigo).toBe(errorAjeno.codigo)
+    expect(errorInexistente.mensaje).toBe(errorAjeno.mensaje)
+
     const detalleDueno = await pedir("GET", `/api/clases/${claseId}`, tokenD)
     expect(detalleDueno.statusCode).toBe(200)
     expect(clavesEn(detalleDueno.body, ["codigoInvitacion", "estadoPago", "email"])).toEqual([])
```
(`randomUUID` y `errorApiSchema` ya estaban importados en el archivo; no cambió ningún import.)

**Comandos y última línea de salida:**
| Comando | Última línea | Resultado |
|---|---|---|
| `cd backend; npx prettier --write test/clases-r2.ataque.test.ts` | `test/clases-r2.ataque.test.ts 87ms (unchanged)` | sin cambios de formato |
| `cd backend; npx vitest run test/clases-r2.ataque.test.ts` | `Test Files  1 passed (1)` · `Tests  7 passed (7)` | verde |

**SHA-256 nuevo de `backend/test/clases-r2.ataque.test.ts`:** `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` (antes: `A765F44BC14748A7A6023A21643AAA17504112B83E5399D830427DDE7F32FFAC`). **La tabla vigente para V-01** es la de la ronda 2, más las dos filas de la ronda 3, con esta fila sustituida.

**Verificación del resto:**
- Recalculé los SHA-256 de las 77 `*.ataque` y los comparé por programa con la tabla de la ronda 3: solo difiere `backend/test/clases-r2.ataque.test.ts`.
- No toqué código de producción, pruebas normales ni ningún otro archivo.

**PARADAS:**
- **PA-01:** comprobada, no se activó.
- **PA-11:** justo después de la corrida quedaba Ryuk retirándose. En la siguiente comprobación con `docker ps -a` solo quedaban los 4 contenedores de `infra/`. No se activó.
- **PA-07:** no aplica. Fue una corrida aislada de un solo archivo; el conteo completo va con la regresión de la ronda 4.

> **Nota de transcripción (orquestador, 2026-09-29).** La sección "CLASES-a — Ronda 4, regresión final" la escribió el tester y la entregó en su respuesta final (misma restricción). Antes de transcribirla, el orquestador verificó: existen los 2 archivos `*-r4.ataque` y sus SHA-256 coinciden con la tabla; hay 79 `*.ataque` en los dos paquetes; `clases-r2` (C-16) y `clases-r3` conservan su hash. **La tabla de esta sección es la tabla de cierre de CLASES-a y la base de V-01 para CLASES-b.**

## CLASES-a — Ronda 4, regresión final
Veredicto: **RESISTE**
Verificación propia: lint backend OK · lint frontend OK · test backend (2.ª corrida) `Tests 1059 passed (1059)` · test frontend `Tests 1106 passed (1106)`.

Base `<R>` = `3399c79`. Rama `feat/clases`. Fecha: 2026-09-29.

> Nota: el tester no escribió este archivo, por la misma restricción de su sesión que en las rondas anteriores. Entregó la sección en su respuesta final para que el orquestador la transcriba.

### Precondiciones
- **Rama:** `feat/clases`.
- **V-01:** los SHA-256 de las 77 `*.ataque` coinciden con la tabla vigente, es decir, la de la ronda 2 más las dos filas de la ronda 3, con `clases-r2` en `0135A34D…` por C-16 (77/77, comparados por programa). Después de esta ronda las 77 siguen iguales.
- **PA-01:** `Get-NetFirewallRule` → `Enabled True`, `Inbound`, `Block`, `Public`. La red `IZZI-F281` está declarada de confianza. Backend permitido.
- **Archivos:** solo agregué los 2 archivos `-r4`. No toqué código de producción, pruebas normales ni ningún `*.ataque` existente.

### Regresión de las 77 `*.ataque`
Las 77 pasan en las suites completas (2.ª corrida del backend y corrida del frontend). Leí la corrección que explica cada caso que antes fallaba:
- **T-18** (`clases-r3`, "si el alumno deja la clase del cursor entre dos páginas…"): antes de paginar, `adapters/db/clases.ts` lee el cursor por PK. En `inscritas` usa `inscripcion.findUnique` sobre `(clase_id, usuario_id)`; en `impartidas`, `clase.findFirst({ id, maestroId })`. Si no hay fila lanza `AppError("VALIDACION", "cursor: no es válido", 400)`. Mi caso admite un error explícito y ya no recibe un 200 vacío. Correcto.
- **T-19** (los tres casos de `clases-r3`): `erroresDeFormularioClases` devuelve `null` si el error no es un `VALIDACION` con un campo del formulario. `FormularioClase` avisa entonces con `toast.error(mensajeDeErrorClases(error))`, sin `aria-invalid`. Correcto.
- **C-16** (`clases-r2`, "HEAD, paginación, campos extra y fugas…"): pasa con la regla de T-18 y con la aserción de que no hay oráculo de existencia. Hash `0135A34D…`.
- **Rondas 1 y 2:** siguen en verde con las mismas correcciones que ya verifiqué. No cambió nada que las toque, salvo que `bloque-destacado.tsx` y `panel-mis-clases.tsx` se maquetaron distinto (N-01). `estatico-r1`, `clases-r1` (styles), `estatico-r1` (clases) e `inicio-sin-datos-r2` siguen en verde.

### Hallazgos
Ninguno.

### Atacado sin hallazgos
- **T-18** (`backend/test/clases-r4.ataque.test.ts`):
  - En `inscritas`, tres cursores dan exactamente el mismo cuerpo, `400 {"codigo":"VALIDACION","mensaje":"cursor: no es válido"}`: una inscripción borrada, una clase ajena (con otro alumno inscrito) y un UUID inexistente. El cuerpo no contiene el cursor, el nombre de la clase ajena ni el id de su maestro.
  - En `impartidas`, también dan el mismo 400: una clase propia borrada, la clase de otro maestro (donde además hay un alumno inscrito) y un UUID inexistente. `HEAD` con un cursor ajeno da 400 sin cuerpo.
  - Con cursores válidos, la paginación no cambia en los dos listados: 5 clases con `limite=2` dan 3 páginas (2, 2 y 1), `total` 5 en todas, `siguienteCursor: null` al final, sin repetidos ni faltantes.
  - Un cursor que no es UUID (`abc`, `1`, inyección SQL) da 400 `VALIDACION` por el esquema.
  - Sin token, el restringido, el admin y el rol incorrecto se niegan antes de leer el cursor, por `GET` y por `HEAD`: 401, `ACCESO_RESTRINGIDO` y `ROL_NO_PERMITIDO`.
- **T-19, en crear y en editar** (`frontend/src/features/clases/clases-r4.ataque.test.tsx`):
  - Estos errores dan exactamente un toast, sin prefijo técnico ni el texto crudo del servidor, y ni "Nombre de la clase" ni "Descripción (opcional)" quedan con `aria-invalid`: un 500, "sin conexión", `SIN_ACCESO_A_LA_CLASE`, un `VALIDACION` de un campo ajeno (`maestroId:`), un `VALIDACION` de `claseId:` y un `VALIDACION` sin campo.
  - Un `VALIDACION` de `nombre` o de `descripcion` sigue bajo su campo, con `aria-invalid` y la descripción accesible sin prefijo, sin toast, y el otro campo queda limpio.
- **M-06:** recorrí los nodos de texto de `BloqueDestacado` fuera de su tarjeta interna y de `Cargando` (`role="status"`) en cuatro estados: con dato, sin clases, con error y cargando.
  - El color efectivo de cada texto es la utilidad `text-<color>` más cercana, con los colores tomados de los `--color-*` de `tokens.css`. En todos los casos es `text-accent-foreground` o `text-accent-soft-glass`.
  - En `bloque-destacado.tsx`, sin comentarios, no aparece `bg-accent-soft-glass`.
- **N-03:** los mensajes siguen igual:
  - `SIN_ACCESO_A_LA_CLASE` → "No tienes acceso a esta clase.";
  - un 500 → "Algo salió mal. Inténtalo de nuevo.";
  - un fallo del portapapeles → "No pudimos copiar el código. Cópialo a mano.".
- **PA-10:** en la salida completa del backend, las líneas de log no contienen ningún texto con forma de código de invitación.

### No son hallazgos (ya decididos por el manager)
N-04 (en "Unirme a la clase", un 500 o "sin conexión" se marca en el campo del código; destino CLASES-b); los textos fijos "Nueva clase" y "Crear clase" de `inicio-maestro-view.tsx`; los comodines `/api/*` (CHORE-02); los caracteres `Cf` invisibles (CLASES-c); la longitud en unidades UTF-16; y `descripcion: null` en `PUT`.

### Observaciones finales para H-6 (navegador; no verificadas aquí)
- **Bloque destacado:**
  - contraste real del texto `--accent-soft-glass` y del blanco sobre el vidrio azul con los orbes detrás (M-06);
  - la tarjeta interna a la derecha desde 640 px y el relleno de 36/32 px (N-01).
- **Nombres largos a 360 px:** un nombre de clase de 120 caracteres sin espacios y uno de 60 emojis, en la tarjeta (2 líneas) y en el `h1`; un nombre de maestro de 120 caracteres sin espacios en la tarjeta y en "Maestro: …"; y el saludo "Hola, \<nombre largo\>".
- **Tarjetas:** la separación de 12 px de la rejilla y los colores verde y azul con el foco blanco interior.

### Intermitencia
La 1.ª corrida del backend dio `Test Files 10 failed | 87 passed (97)` · `Tests 12 failed | 1047 passed (1059)`, 73.23 s. Todo fue por tiempo límite, con la firma de la espera en cadena de `LOCK TABLE usuarios` (CHORE-02):
- el caso del `LOCK TABLE` de `cuentas-r1` (15 s) y el de la fila retenida de `cuentas-r3` (40 s);
- `P2028` de 39.9 s y 23.7 s;
- detrás, AUTH, `worker-*`, `restablecer`, `bloqueo-usuario`, `nombres-tokens-r2`, `sesiones-y-cadena`, y PR-A15h y el hook de `clases-autorizacion`.

No hubo ningún rojo por aserción de lógica. La 2.ª corrida salió limpia.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `cd backend; npx vitest run test/clases-r4.ataque.test.ts` | `Tests  5 passed (5)` | verde |
| `cd frontend; npx vitest run src/features/clases/clases-r4.ataque.test.tsx` | `Tests  24 passed (24)` | verde |
| `cd backend; npm test` (1.ª corrida) | `Test Files  10 failed \| 87 passed (97)` · `Tests  12 failed \| 1047 passed (1059)` · `Duration 73.23s` | solo tiempos límite de la espera en cadena |
| `cd backend; npm test` (2.ª corrida) | `Test Files  97 passed (97)` · `Tests  1059 passed (1059)` · `Duration 38.56s` | verde |
| `cd frontend; npm test` | `Test Files  78 passed (78)` · `Tests  1106 passed (1106)` · `Duration 38.36s` | verde |
| Formato: `cd backend; npx prettier --write test/clases-r4.ataque.test.ts` y `cd frontend; npx prettier --write src/features/clases/clases-r4.ataque.test.tsx` | — | solo los 2 archivos |

Pruebas nuevas: 5 en el backend (1054 + 5 = 1059) y 24 en el frontend (1082 + 24 = 1106).

### PARADAS
- **PA-01 y PA-02:** comprobadas, no se activaron.
- **PA-06:** no se activó. En la corrida limpia no falla ninguna `*.ataque`.
- **PA-07** (2.ª corrida): `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 · `too many clients` 0. No se activó. Los dos `P2028` son los aceptados:
  1. `tx.sesion.create()` en `adapters/db/sesiones.ts:39`, desde `handlers/auth/index.ts:134`: 6467 ms.
  2. `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116`, desde `handlers/auth/cuentas.ts:106`: 6081 ms.

  La 1.ª corrida tuvo 5 `P2028`, en los mismos dos sitios, por la espera en cadena.
- **PA-10:** no se activó.
- **PA-11:** después de las corridas, `docker ps -a` solo muestra los 4 contenedores de `infra/`. No se activó.
- **PA-12:** mis archivos `-r4` dieron el mismo resultado corridos aislados y en la suite completa. No se activó.
- **PA-15:** no se activó.

### Tabla de SHA-256 de todas las `*.ataque` al cierre de CLASES-a (79: las 77 vigentes y 2 nuevas marcadas). Base de V-01 para CLASES-b
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` (ronda 1 de CLASES-a) |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` (ronda 2 de CLASES-a) |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` (ronda 1 de CLASES-a) |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` (ronda 2 de CLASES-a; C-16 en la ronda 4) |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` (ronda 3 de CLASES-a) |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` (nuevo, ronda 4 de CLASES-a) |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` (ronda 1 de CLASES-a) |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` (ronda 2 de CLASES-a) |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` (ronda 0 de CLASES-a) |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `ADF3928D9CC6994304E99F9BCC6F1BFCC0FD28C87BF8CC7781BA32C9D06E4BD5` | `backend/test/sesiones-y-cadena.ataque.test.ts` (ronda 0 de CLASES-a) |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` (ronda 0 de CLASES-a) |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` (ronda 0 de CLASES-a) |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` (ronda 1 de CLASES-a) |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` (ronda 0 de CLASES-a) |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` (ronda 1 de CLASES-a) |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` (ronda 2 de CLASES-a) |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` (ronda 3 de CLASES-a) |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` (nuevo, ronda 4 de CLASES-a) |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` (ronda 1 de CLASES-a) |
| `BAB2B0188BCF02DD260A47519C3BD38712B07FA1F521C23BFA80BF34401DE165` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` (ronda 2 de CLASES-a) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `8472BAC787392C2027658365F6D58666EE346BD68AB52C6DFAE3D4C2FA1A7585` | `frontend/src/styles/clases-r1.ataque.test.ts` (ronda 0 de CLASES-a) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` (ronda 0 de CLASES-a) |

## CLASES-b — Ronda 0
Veredicto: ronda 0, de adaptación (no cuenta en el tope de 3), completa. Los dos rojos esperados están confirmados y no cae ningún otro caso.
Verificación propia: lint del backend con código 0 · lint del frontend con código 0 · test del frontend `Tests  1 failed | 1105 passed (1106)` · test del backend `Tests  1 failed | 1058 passed (1059)`. En los dos paquetes, el único rojo es el esperado.

> **Complemento (2026-09-30):** la primera pasada se detuvo por PA-01 (la red activa era `IZZI-F281-5G`). El humano confirmó por medio del orquestador que `IZZI-F281-5G` es la banda de 5 GHz del módem de su casa y la declaró de confianza; quedó anotada en `docs/ESTADO.md` §5 junto a `IZZI-F281`. **PA-01 quedó cerrada con esa confirmación:** antes de correr el backend volví a comprobar la regla (`True` / `Inbound` / `Block` / `Public`) y la red (`IZZI-F281-5G` / `Public`). Las secciones de abajo ya incluyen la corrida del backend.

Base `<Ca>` = `855069b` dentro de los paquetes. Rama `feat/clases`. Fecha: 2026-09-30.

### Precondiciones
- **Rama:** `feat/clases`; `git log -1` → `855069b`.
- **Árbol:** al empezar, `git status --porcelain` no salió vacío: `M docs/ESTADO.md` y `M docs/trabajo/CLASES-01-clases-y-muro/aprobacion.md`.
  - Son las anotaciones que el orquestador hizo después del commit `<Ca>`: el hash de `<Ca>` en "Commits de las subentregas" y el estado de CLASES-b en `ESTADO.md`. Leí los dos diffs.
  - Las dos rutas quedan fuera de "No se toca" (plan, "Alcance" y V-05; `AGENTS.md`, "Commits y cierre de subentregas"). Por eso no se cumple la PA-02 del plan ("hay cambios fuera de los permitidos contra la base") y seguí.
  - Dentro de los paquetes, el árbol estaba limpio contra `<Ca>`.
  - **Lo anoto porque tu instrucción pedía `git status --porcelain` vacío.**
- **V-01:** comparé por programa los SHA-256 de las 79 `*.ataque` (las de `git ls-files -co --exclude-standard`) con la tabla "al cierre de CLASES-a" de la ronda 4. **Coinciden las 79**, sin faltantes ni sobrantes.
- **PA-01:**
  - `Get-NetFirewallRule -DisplayName 'Campus: bloquear entrada a Docker en redes publicas'` → `Enabled: True`, `Direction: Inbound`, `Action: Block`, `Profile: Public`.
  - **Pero `Get-NetConnectionProfile` da `Name: IZZI-F281-5G`, `NetworkCategory: Public`.** El humano declaró de confianza la red `IZZI-F281`, que es la que registran todas las rondas anteriores.
  - PA-01 también se cumple si "la red activa no es de confianza", y no me consta que `IZZI-F281-5G` lo sea. Probablemente es la banda de 5 GHz del mismo módem, pero eso lo decide el humano.
  - **En la primera pasada no corrí ninguna prueba del backend.**
  - **Cierre:** el humano declaró de confianza `IZZI-F281-5G`. Volví a comprobar la regla y la red, y corrí el backend.

### Archivos tocados: solo dos, los de los C-n
1. `backend/test/sesiones-y-cadena.ataque.test.ts` (C-2).
2. `frontend/src/styles/clases-r1.ataque.test.ts` (C-11).

- No toqué código de producción, pruebas normales ni ninguna otra `*.ataque`, y no creé archivos.
- `git diff --quiet 855069b -- shared backend/src frontend/src/app frontend/src/features frontend/src/components` → código 0.
- Formato: `cd backend; npx prettier --write test/sesiones-y-cadena.ataque.test.ts` y `cd frontend; npx prettier --write src/styles/clases-r1.ataque.test.ts`. Solo esos 2 archivos.

### Qué cambió y qué sigue protegiendo
- **C-2, `sesiones-y-cadena.ataque.test.ts:468`** ("bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a y CLASES-b: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros"):
  - A la lista exacta se suman las 8 rutas de V-06 (b):
    - `DELETE /api/clases/:claseId/alumnos/:alumnoId`;
    - `GET` y `HEAD` de `/api/clases/:claseId/alumnos`, de `/api/clases/:claseId/alumnos/candidatos` y de `/api/clases/:claseId/personas`;
    - `POST /api/clases/:claseId/alumnos`.

    Van en el orden de `sort()`, comprobado por programa.
  - El título suma "CLASES-b", y un comentario nuevo explica por qué ninguna de esas rutas crea cuentas ni cambia roles.
  - **Sigue protegiendo lo mismo:**
    - la igualdad es exacta y el análisis por sangría no cambia (una línea que no se reconoce sigue haciendo fallar la prueba);
    - cualquier ruta de más o de menos pone la prueba en rojo, también una que contenga "movimiento";
    - siguen creando maestros solo las tres rutas de hoy.
- **C-11, `styles/clases-r1.ataque.test.ts:102`** ("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 29 enEspera"):
  - El total de `enEspera=` pasa de 25 a **29**.
  - **Lista fija:**
    - suma `features/clases/personas-view.tsx` con 1: "Ver más alumnos" de los compañeros (§D-B4);
    - suma con **0** cuatro archivos de a (`bloque-destacado.tsx`, `encabezado-clase.tsx`, `secciones-de-clase.tsx` y `tarjeta-clase.tsx`) y uno de b (`lista-personas.tsx`). Así ninguno de ellos puede ganar un botón en espera.
  - **Fuera de la lista fija**, con el mismo patrón que C-15 de AUTH-03b ("o el componente de su fila"):
    - el resto solo puede estar en `features/admin/components/` (2, como antes, con `tabla-enlaces.tsx` ≥ 1) o en `features/clases/components/` (**3**);
    - `buscador-alumnos.tsx` ≤ 1: "Agregar a la clase", aquí o en su fila;
    - `tabla-alumnos.tsx` entre 1 y 2: "Sí, quitar" y "Ver más alumnos". El segundo no es de una fila, así que queda al menos uno en el archivo.
  - Un `enEspera=` en cualquier otro archivo (`alumnos-view.tsx`, un inicio o `features/auth`) sigue haciendo fallar la prueba.
  - **Sigue protegiendo lo mismo:**
    - ningún `disabled` en JSX;
    - `aria-busy` y `aria-disabled` solo en `button.tsx`;
    - el número y el lugar de los botones en espera cambian solo con el plan.

    N-04 (§D-B4 bis) no cambia el `enEspera=` de `formulario-unirse-clase.tsx`, que sigue en 1.
- **C-15:** ninguna `*.ataque` lista de forma cerrada tablas, secuencias, migraciones ni modelos de Prisma. Busqué `migrations`, `_prisma`, `information_schema`, `pg_tables`, `pg_class`, `dmmf`, `ModelName`, `nextval`, `serial`, `secuencia`, `tablas`, `migraci` y `enum`. No hubo nada que reescribir.

### Rojos esperados (2)
| # | Archivo:línea | Título | C-n | Estado en mi corrida |
|---|---|---|---|---|
| 1 | `backend/test/sesiones-y-cadena.ataque.test.ts:468` | "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a y CLASES-b: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros" | C-2 | **Rojo comprobado:** `expected [ …(37) ] to deeply equal [ …(45) ]` (`:494`). Faltan exactamente las 8 rutas de b y no hay ninguna otra diferencia. `noReconocidas` pasó (`:493`) |
| 2 | `frontend/src/styles/clases-r1.ataque.test.ts:102` | "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 29 enEspera" | C-11 | **Rojo comprobado:** `expected [ …(25) ] to have a length of 29 but got 25` (`:109`) |

No cae ningún otro caso en ninguno de los dos paquetes. En el backend no hubo tiempos límite ni hizo falta repetir la corrida.

### Casos fuera del inventario
Ninguno. Revisé lo siguiente, sin encontrar ninguna contradicción con C-2, C-11 o C-15:
- **N-04 y los textos del inicio del maestro (§D-B4 bis):**
  - La única `*.ataque` sobre los errores de "Unirme a la clase" (`features/clases/clases-r2.ataque.test.tsx:231`) usa un `VALIDACION` de `codigo`, que con N-04 sigue yendo al campo.
  - "Crear clase" del inicio del maestro (`clases-r3.ataque.test.tsx:170`) se busca por rol y nombre; pasar el texto a `data.ts` no cambia nada visible.
  - Ninguna prueba estática busca esos literales.
- **`estadoPago` y `accesoRestringido`:**
  - `arquitectura-cuentas-r1` solo cierra la lista de los prefijos de AUTH-02a (`handlers/admin.ts`, `handlers/auth/cuentas.ts`, `adapters/queue/`, etc.). `handlers/clases/alumnos.ts` y `adapters/db/inscripciones.ts` quedan fuera.
  - Las pruebas de fugas de `clases-r1` a `clases-r3` (backend) usan listas explícitas de rutas de a, sin `GET …/alumnos`.
- **Vidrio, `text-danger`/`text-destructive` y `data-material`** (`styles/clases-r1`, V-07 y V-13): §D-B4 y §D-B7 no piden vidrio nuevo fuera de `Card` ni rojo fuera de `Badge`.
  - *Nota para el programador (sin C-n):* V-07 sigue exigiendo que `data-material` y `data-densidad` estén solo en `contenedor-rol.tsx`.
  - §D-B4 no pide marcar el roster con `data-material="opaco"` (dice "Table (opaca)"). Si se agregara, la prueba se pondría en rojo, y sería un cambio fuera del plan.
- **Pruebas estáticas** (`components/layout/estatico-r1`, `features/clases/estatico-r1`, `tokens-r1`, `badge-03b-r1`, `features/admin/cuentas-r1`, `maestros-03b-r1`, `marco-r1` y `fondo-r1`): ninguna cuenta nada que b cambie.
  - `h-12` no es un valor arbitrario.
  - `tokens-r1` solo lee §3 y §4 de `DESIGN.md`, y b edita §7 y §8.
- **Rutas:** `printRoutes` solo aparece en `sesiones-y-cadena`. `guarda-clase-r2` pide `/api/clases/<uuid>/personas`, pero a una instancia de Fastify aislada.
- **Limpieza (N-10):** ninguna `*.ataque` existente crea movimientos, y sus `deleteMany` filtran por sus propios ids. Los `RESTRICT` de `movimientos_inscripcion` no las afectan.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `git status --porcelain` (al empezar) | ` M docs/trabajo/CLASES-01-clases-y-muro/aprobacion.md` (y `M docs/ESTADO.md`) | solo documentos del orquestador, excluidos de "No se toca" |
| V-01: `node v01.cjs` (scratchpad; `sha256` de Node contra la tabla de la ronda 4) | `esperados 79 actuales 79 coinciden 79` | coincide |
| `Get-NetFirewallRule …` | `Profile     : Public` | `True` / `Inbound` / `Block` / `Public` |
| `Get-NetConnectionProfile` | `NetworkCategory : Public` (`Name : IZZI-F281-5G`) | red distinta de la declarada: PA-01 en la primera pasada; el humano la declaró de confianza y se cerró |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `cd frontend; npm test` | `Test Files  1 failed \| 77 passed (78)` · `Tests  1 failed \| 1105 passed (1106)` · `Duration 66.13s` | solo el rojo esperado de C-11 |
| `cd backend; npm test` (una sola corrida, después de cerrar PA-01) | `Test Files  1 failed | 96 passed (97)` · `Tests  1 failed | 1058 passed (1059)` · `Duration  62.58s` | solo el rojo esperado de C-2; sin tiempos límite |
| V-01 después de mis cambios | `esperados 79 actuales 79 coinciden 77` | solo cambian los 2 archivos de C-2 y C-11 |

El número de pruebas no cambia: frontend 78 archivos y 1106 pruebas, igual que al cierre de a. El backend tampoco cambia: 97 archivos y 1059 pruebas, las mismas del cierre de a.

### PARADAS
- **PA-01: se activó en la primera pasada y quedó cerrada.** La red activa era `IZZI-F281-5G`, no la `IZZI-F281` declarada (`Name            : IZZI-F281-5G` / `NetworkCategory : Public`). El humano la declaró de confianza: es la banda de 5 GHz del módem de su casa. Con la regla comprobada de nuevo (`True` / `Inbound` / `Block` / `Public`), corrí el backend.
- **PA-02:** no se activó, con la nota de "Precondiciones" sobre el árbol: son documentos del orquestador, excluidos de "No se toca".
- **PA-06:** no se activó. En cada paquete falla un solo caso y es el esperado.
- **PA-07:** no se activó. Conté con `grep -c` sobre la salida completa de `npm test` del backend: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 · `too many clients` 0. Los dos `P2028` son los aceptados:
  1. `tx.sesion.create()` en `adapters/db/sesiones.ts:39`, desde `handlers/auth/index.ts:134` (`POST /api/auth/login`): 6494 ms, 500.
  2. `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116`, desde `handlers/auth/cuentas.ts:106` (`POST /api/auth/restablecer`): 6111 ms, 500.
- **PA-11:** no se activó. 120 s después de terminar la corrida del backend, `docker ps -a` solo muestra los 4 contenedores de `infra/`: `campus-dev-postgres-1`, `campus-dev-minio-1` y `campus-dev-livekit-1` (healthy) y `campus-dev-minio-init-1` (Exited 0). No queda ningún contenedor de Testcontainers.
- **PA-15 y PA-16:** no se activaron.

### Tabla de SHA-256 de todas las `*.ataque` después de la ronda 0 de CLASES-b (79; cambian 2, marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `5B82305E0D38F1132A5354882B4FDC94E7CFA11349891D91513095A6B20C7C1D` | `backend/test/sesiones-y-cadena.ataque.test.ts` (C-2, ronda 0 de CLASES-b) |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `BAB2B0188BCF02DD260A47519C3BD38712B07FA1F521C23BFA80BF34401DE165` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `A2063111063EB7C13FDB7E4341BD29AB4C3A4889DF237C575469837F2C2775F2` | `frontend/src/styles/clases-r1.ataque.test.ts` (C-11, ronda 0 de CLASES-b) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

### Diff de los dos archivos tocados (`git diff`)
```diff
diff --git a/backend/test/sesiones-y-cadena.ataque.test.ts b/backend/test/sesiones-y-cadena.ataque.test.ts
index e51bf86..4fe101e 100644
--- a/backend/test/sesiones-y-cadena.ataque.test.ts
+++ b/backend/test/sesiones-y-cadena.ataque.test.ts
@@ -454,7 +454,18 @@ describe("ataque: superficie de rutas", () => {
   // (POST /api/admin/maestros, POST /api/admin/maestros/lote y POST /api/auth/registro-maestro).
   // printRoutes anida /inscritas, /impartidas, /unirse y /:claseId bajo /api/clases (que tiene
   // POST) y /codigo bajo /:claseId; el análisis por sangría los reconstruye.
-  it("bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c y CLASES-a: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros", () => {
+  // CLASES-b ronda 0 (C-2, §D-R0; §D-B1 y V-06 del plan de CLASES-01): se agregan las 8 rutas de
+  // CLASES-b bajo /api/clases/:claseId (GET y HEAD de /personas; GET, HEAD y POST de /alumnos; GET y
+  // HEAD de /alumnos/candidatos; DELETE de /alumnos/:alumnoId). Ninguna crea cuentas ni cambia roles:
+  // leen miembros de la clase, buscan estudiantes ya existentes y agregan o quitan inscripciones de
+  // la clase del maestro dueño (POST /alumnos solo inscribe a un estudiante activo que ya existe).
+  // Ninguna ruta expone movimientos_inscripcion (V-06: ninguna contiene "movimiento"). La protección
+  // queda igual: ninguna ruta crea administradores; siguen creando maestros solo las tres de hoy
+  // (POST /api/admin/maestros, POST /api/admin/maestros/lote y POST /api/auth/registro-maestro), y
+  // cualquier otra ruta nueva vuelve a poner la prueba en rojo. printRoutes anida /personas y
+  // /alumnos bajo /:claseId, y /candidatos y /:alumnoId bajo /alumnos; el análisis por sangría los
+  // reconstruye.
+  it("bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a y CLASES-b: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros", () => {
     const arbol = obtenerApp().printRoutes({ commonPrefix: false })
     const rutas = new Set<string>()
     const noReconocidas: string[] = []
@@ -481,10 +492,14 @@ describe("ataque: superficie de rutas", () => {
     }
     expect(noReconocidas, "líneas del árbol de rutas que no se pudieron analizar").toEqual([])
     expect([...rutas].sort()).toEqual([
+      "DELETE /api/clases/:claseId/alumnos/:alumnoId",
       "GET /api/admin/enlaces-registro",
       "GET /api/admin/enlaces-registro/:id/registrados",
       "GET /api/clases/:claseId",
+      "GET /api/clases/:claseId/alumnos",
+      "GET /api/clases/:claseId/alumnos/candidatos",
       "GET /api/clases/:claseId/codigo",
+      "GET /api/clases/:claseId/personas",
       "GET /api/clases/impartidas",
       "GET /api/clases/inscritas",
       "GET /api/me",
@@ -492,7 +507,10 @@ describe("ataque: superficie de rutas", () => {
       "HEAD /api/admin/enlaces-registro",
       "HEAD /api/admin/enlaces-registro/:id/registrados",
       "HEAD /api/clases/:claseId",
+      "HEAD /api/clases/:claseId/alumnos",
+      "HEAD /api/clases/:claseId/alumnos/candidatos",
       "HEAD /api/clases/:claseId/codigo",
+      "HEAD /api/clases/:claseId/personas",
       "HEAD /api/clases/impartidas",
       "HEAD /api/clases/inscritas",
       "HEAD /api/me",
@@ -514,6 +532,7 @@ describe("ataque: superficie de rutas", () => {
       "POST /api/auth/registro-maestro",
       "POST /api/auth/restablecer",
       "POST /api/clases",
+      "POST /api/clases/:claseId/alumnos",
       "POST /api/clases/:claseId/codigo",
       "POST /api/clases/unirse",
       "PUT /api/admin/usuarios/:id/correo",
diff --git a/frontend/src/styles/clases-r1.ataque.test.ts b/frontend/src/styles/clases-r1.ataque.test.ts
index 83009e7..4f888dc 100644
--- a/frontend/src/styles/clases-r1.ataque.test.ts
+++ b/frontend/src/styles/clases-r1.ataque.test.ts
@@ -87,14 +87,26 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
   // del maestro es un enlace y "Regenerar código" y "Cancelar" no esperan nada. Sigue protegiendo lo
   // mismo: ningún `disabled` en JSX, aria-busy y aria-disabled solo en Button, y que el número y el
   // lugar de los botones con espera cambien solo con el plan.
-  it("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 25 enEspera", () => {
+  // CLASES-b ronda 0 (C-11, §D-R0; §D-B4 y V-04 del plan de CLASES-01): de 25 a 29 enEspera=. Se
+  // suman los cuatro botones de §D-B4: "Ver más alumnos" de los compañeros (personas-view.tsx, 1, en
+  // la lista fija), "Agregar a la clase" (buscador-alumnos.tsx o el componente de su fila, 1) y "Sí,
+  // quitar" y "Ver más alumnos" del roster (tabla-alumnos.tsx o el componente de su fila, 2; el
+  // "Ver más alumnos" no es de una fila, así que tabla-alumnos.tsx lleva al menos 1). Como en C-15
+  // de AUTH-03b, los que pueden vivir en un componente de fila quedan fuera de la lista fija: los 3
+  // viven en features/clases/components/, nunca en los componentes de CLASES-a ni en
+  // lista-personas.tsx (en la lista fija con 0), con a lo sumo 1 en buscador-alumnos.tsx y de 1 a 2
+  // en tabla-alumnos.tsx. N-04 (§D-B4 bis) no cambia el botón de formulario-unirse-clase.tsx, y
+  // "Quitar" y "Cancelar" no esperan nada. Sigue protegiendo lo mismo: ningún `disabled` en JSX,
+  // aria-busy y aria-disabled solo en Button, y que el número y el lugar de los botones con espera
+  // cambien solo con el plan.
+  it("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 29 enEspera", () => {
     expect(coincidencias(/\sdisabled(=|\s|\/?>|$)/, soloTsx)).toEqual([])
     // Atributos JSX, no la variante `aria-busy:` de las clases (button-variants.ts, §D-5).
     expect(rutasDe(coincidencias(/aria-(busy|disabled)=/, soloTsx))).toEqual([
       "/src/components/ui/button.tsx",
     ])
     const usos = coincidencias(/enEspera=/, soloTsx)
-    expect(usos).toHaveLength(25)
+    expect(usos).toHaveLength(29)
 
     const porArchivo = new Map<string, number>()
     for (const uso of usos) {
@@ -127,6 +139,16 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
       "/src/features/clases/components/formulario-clase.tsx": 1,
       "/src/features/clases/components/panel-mis-clases.tsx": 1,
       "/src/features/clases/components/codigo-de-clase.tsx": 2,
+      // C-11 (CLASES-b): "Ver más alumnos" de los compañeros.
+      "/src/features/clases/personas-view.tsx": 1,
+      // C-11: los componentes de CLASES-a sin espera, y la lista de compañeros de CLASES-b (su
+      // "Ver más alumnos" va en personas-view.tsx), siguen sin enEspera=. Así el resto de
+      // features/clases/components/ solo puede ser el buscador, el roster o sus filas.
+      "/src/features/clases/components/bloque-destacado.tsx": 0,
+      "/src/features/clases/components/encabezado-clase.tsx": 0,
+      "/src/features/clases/components/secciones-de-clase.tsx": 0,
+      "/src/features/clases/components/tarjeta-clase.tsx": 0,
+      "/src/features/clases/components/lista-personas.tsx": 0,
     }
     for (const [ruta, cuantos] of Object.entries(fijos)) {
       expect(porArchivo.get(ruta) ?? 0, `enEspera= en ${ruta}`).toBe(cuantos)
@@ -134,14 +156,27 @@ describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () =
     // C-15 (4) y (5): "Sí, revocar" y "Cargar más enlaces", en tabla-enlaces.tsx o en el componente
     // de su fila; los dos viven en features/admin/components/ y tabla-enlaces.tsx lleva al menos uno.
     const resto = [...porArchivo].filter(([ruta]) => !(ruta in fijos))
+    const suma = (lista: [string, number][]) =>
+      lista.reduce((total, [, cuantos]) => total + cuantos, 0)
+    const restoAdmin = resto.filter(([ruta]) => ruta.startsWith("/src/features/admin/components/"))
+    const restoClases = resto.filter(([ruta]) =>
+      ruta.startsWith("/src/features/clases/components/"),
+    )
     expect(
-      resto.every(([ruta]) => ruta.startsWith("/src/features/admin/components/")),
+      resto.length,
       `enEspera= fuera de la lista cerrada: ${resto.map(([r]) => r).join(", ")}`,
-    ).toBe(true)
-    expect(resto.reduce((total, [, cuantos]) => total + cuantos, 0)).toBe(2)
+    ).toBe(restoAdmin.length + restoClases.length)
+    expect(suma(restoAdmin)).toBe(2)
     expect(porArchivo.get("/src/features/admin/components/tabla-enlaces.tsx") ?? 0).toBeGreaterThan(
       0,
     )
+    // C-11: "Agregar a la clase", "Sí, quitar" y "Ver más alumnos" del roster.
+    expect(suma(restoClases)).toBe(3)
+    const enBuscador = porArchivo.get("/src/features/clases/components/buscador-alumnos.tsx") ?? 0
+    const enTabla = porArchivo.get("/src/features/clases/components/tabla-alumnos.tsx") ?? 0
+    expect(enBuscador, "enEspera= en buscador-alumnos.tsx").toBeLessThanOrEqual(1)
+    expect(enTabla, "enEspera= en tabla-alumnos.tsx").toBeGreaterThanOrEqual(1)
+    expect(enTabla, "enEspera= en tabla-alumnos.tsx").toBeLessThanOrEqual(2)
   })
 
   // CLASES-a ronda 0 (C-8, §D-R0; §D-A5 y V-04 del plan de CLASES-01): el vidrio fuerte suma la
```

> **Nota de transcripción (orquestador, 2026-09-30).** La sección "CLASES-b — Ronda 1" la escribió el tester y la entregó en su respuesta final, porque su herramienta volvió a rechazar la escritura de este archivo (`docs/ESTADO.md` §4). Antes de transcribirla, el orquestador verificó: existen los 2 archivos `alumnos-b-r1.ataque` y sus SHA-256 coinciden con la tabla; hay 81 `*.ataque` en los dos paquetes; los dos archivos de la ronda 0 de b conservan su hash.

## CLASES-b — Ronda 1
Veredicto: **ROTO**
Verificación propia:
- lint del backend con código 0 (`> tsc -p tsconfig.json --noEmit`) · lint del frontend con código 0 (`> tsc -b`).
- test del frontend: `Test Files  1 failed | 81 passed (82)` · `Tests  1 failed | 1140 passed (1141)`.
- test del backend, corrida limpia: `Test Files  1 failed | 101 passed (102)` · `Tests  1 failed | 1134 passed (1135)`.
- En cada paquete el único rojo es mi caso del hallazgo (T-21 en el frontend, T-20 en el backend).

Base `<Ca>` = `855069b`. Rama `feat/clases`. Fecha: 2026-09-30.

> Nota: el tester no escribió este archivo (restricción de su sesión). Entregó la sección en su respuesta final para que el orquestador la transcriba.

### Precondiciones
- **Rama y árbol:** `feat/clases`, `git log -1` → `855069b`. `git status --porcelain -- shared backend frontend` mostraba, al empezar, el trabajo del programador y las 2 `*.ataque` de la ronda 0 (40 entradas). Al terminar hay 42: las mismas más mis 2 archivos nuevos. No toqué código de producción, pruebas normales ni `*.ataque` existentes.
- **V-01:** comparé por programa (`node v01.cjs`, `sha256` de Node) los hashes contra la tabla "después de la ronda 0 de CLASES-b". Resultado: `esperados 79 actuales 79 coinciden 79`.
- **PA-01:** `Get-NetFirewallRule …` → `Enabled: True`, `Direction: Inbound`, `Action: Block`, `Profile: Public`. `Get-NetConnectionProfile` → `IZZI-F281-5G`, `Public`, declarada de confianza. Backend permitido.

### Hallazgos

#### T-20 — Un término que el frontend da por válido (3 o más caracteres después de normalizar) recibe 400 del backend
Severidad: baja
Prueba: `backend/test/alumnos-b-r1.ataque.test.ts`, "T-20: un término con 3 o más caracteres después de normalizar (S-11) que el frontend da por válido no recibe 400 (hangul: «각», «가나»)". La parte del frontend la muestra `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx`, "coherencia con el backend: el frontend da por válido «각» (3 caracteres después de normalizar) y sí pregunta", que está en verde.

Esperado / Obtenido:
- **Esperado:** `GET …/alumnos/candidatos?q=각` y `?q=가나` responden 200 y encuentran a la alumna "가나 각 …". S-11 pide de 3 a 120 caracteres **después de normalizar**. `normalizarParaBusqueda` (NFD) convierte "각" en 3 jamo y "가나" en 4. `terminoDeBusquedaValido` del frontend los da por válidos y hace la petición.
- **Obtenido:** las dos búsquedas responden `400 VALIDACION` ("q: Escribe al menos 3 letras"), y el buscador muestra ese error aunque el término cumple la regla.
- **Causa:** `busquedaCandidatosSchema` aplica `.min(3)` al texto crudo, antes de NFD. zod 4 cuenta puntos de código (comprobado: `"😀a"` no llega a 3), y una sílaba hangul es 1 en crudo pero 2 o 3 después de NFD.
- **Alcance:** busqué por fuerza bruta en todo Unicode. `toLowerCase` no cambia la longitud normalizada de ningún carácter, así que la diferencia entre frontend y backend que temía el manager no existe por ese lado. Solo los 11,172 bloques hangul se expanden.
- **Del mismo origen, sin prueba en rojo** (§D-B1 fija el esquema en crudo de 3 a 120): `"abc"` seguido de 118 espacios (normalizado: "abc") responde 400 por el máximo. En la interfaz no se alcanza, por `maxLength=120`.

Requisito o regla violada: S-11 (3 a 120 caracteres después de normalizar) y la coherencia de §D-B5 entre `terminoDeBusquedaValido` y `prepararTerminoDeBusqueda` (punto 3 de la lista del manager).

#### T-21 — Después de "Sí, quitar", la fila desaparece y el foco cae en `<body>`
Severidad: media
Prueba: `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx`, "T-21: después de «Sí, quitar», cuando la fila desaparece, el foco no se pierde en <body>".

Esperado / Obtenido:
- **Esperado:** con teclado (Quitar → el foco va a Cancelar → Mayús+Tab a "Sí, quitar" → Enter), cuando el alumno se quita y su fila sale del roster, el foco queda en un elemento conectado y con sentido.
- **Obtenido:** `document.activeElement === document.body`. `FilaAlumno` llama a `setConfirmando(false)` en `onSuccess`, y su efecto enfoca "Quitar" de **la misma fila**. La invalidación de `["clases", claseId, "alumnos"]` vuelve a pedir el roster y desmonta esa fila. El foco se pierde y quien usa teclado o lector de pantalla vuelve al inicio del documento.
- §7.14 solo define el foco al abrir la confirmación y al cancelar. No dice adónde va cuando la acción confirmada borra la fila: que lo decida el manager. La prueba solo exige que no quede en `<body>`.

Requisito o regla violada: §D-B4 ("con el manejo de foco de §7.14"), DESIGN.md §7.14 y WCAG 2.4.3 (orden del foco). Punto 6 de la lista del manager.

### Atacado sin hallazgos
- **Autorización con los 5 tokens** (dueño, maestro ajeno, estudiante inscrito, restringido inscrito, admin), más un estudiante no inscrito y sin token, en las 8 rutas con GET, HEAD, POST y DELETE. Estado y código exactos en las 48 combinaciones: 401 sin token, `ACCESO_RESTRINGIDO`, `ROL_NO_PERMITIDO` y `SIN_ACCESO_A_LA_CLASE`. El no inscrito recibe `ROL_NO_PERMITIDO` en las rutas del dueño, porque `requireRole` va antes que la pertenencia: es correcto. Ninguna negativa escribe inscripción ni movimiento. Un dueño no actúa sobre la clase de otro, tampoco con el `claseId` en mayúsculas. Clase inexistente → 403; malformada → 400; nunca 500.
- **Fugas:** un estudiante ve en personas al compañero restringido y deudor, sin `estadoPago`, `accesoRestringido`, `email`, `correoEnmascarado`, "deudor" ni "@" a ninguna profundidad; lo mismo en sus intentos sobre las demás rutas y en los errores. El dueño ve en el roster `deudor`, `accesoRestringido: true` y el correo completo. El buscador, agregar (también con `yaEstaba: true`), los 400 y las cabeceras no llevan datos de pago ni correos completos. `PersonasView` no pinta datos de pago ni correos aunque la API los mandara de más.
- **Enmascarado por la API:** partes locales de 1, 2, 3 y 64 caracteres, con `+`, puntos, mayúsculas, `ñ`, emojis (sin partir pares sustitutos) y subdominios: los 10 valores esperados de S-22. Nunca aparece la parte local completa. El enmascarado es el mismo con 5 términos distintos, así que combinar búsquedas no revela más. El roster propio trae el correo completo; el de otra clase da 403, también con cursor.
- **Buscador:** comodines `%`, `_` y `\` como literales; `'; --` y `'||'` sin 500. Términos que se acortan al normalizar → `BUSQUEDA_MUY_CORTA`. 120 caracteres pasan y 121 no. NUL, `q` repetido, vacío, ausente o con codificación rota → 400. `limite` 0, -1, 51, 1.5, texto, vacío, `1e400`, `NaN` o repetido → 400; con 1 y 50, `hayMas` correcto. Solo estudiantes activos (también los restringidos); nunca maestros, el admin ni inactivos.
- **"a b" y "a  b"** (punto 4 del manager): 200, y cada resultado contiene "a b". En una tabla temporal con `gin_trgm_ops`, sin tocar `usuarios`, `LIKE '%a b%'` sí usa el índice GIN.
- **Paginación:** 5 homónimos con `limite=2` en roster y personas: todos, sin repetir, en orden (`nombre_busqueda`, `id`). Cursor inexistente → `400 "cursor: no es válido"`; malformado → 400. Cursor de otra clase, en mayúsculas o del admin → 200, sin colar a nadie (O-01). Un alumno quitado entre dos páginas no hace perder a nadie. `limite` del roster y de personas de 1 a 100.
- **`movimientos_inscripcion`:** 4 altas simultáneas → un solo `yaEstaba: false` y un solo alta; 4 bajas simultáneas → una sola baja. El mismo alumno, agregado a la vez a dos clases de dos maestros: cada clase registra su alta con su maestro; las cruzadas dan 403 sin escribir. Unirse con código después de una baja no escribe nada y el roster lo muestra con origen `codigo`; la segunda baja sí se registra. En el código, la tabla solo se usa en `inscripciones.ts`, con dos `create`; ningún `orderBy` por `creadoEn`, ningún SQL crudo, y el handler no verifica rol ni propiedad a mano.
- **Interfaz:** una sola petición por término con 300 ms de espera, incluso tecleando rápido, volviendo al mismo término o bajando de 3. Una respuesta tardía de un término anterior no reemplaza los resultados del actual. Quitar a quien el buscador marca "Ya está en la clase" deja su fila en "Agregar a la clase". Agregar a quien otra pestaña ya agregó deja el roster y el buscador al día. Doble clic con 30 ms entre clics en "Agregar a la clase" y en "Sí, quitar": una sola petición.
- **N-04:** `ACCESO_RESTRINGIDO` al unirse llama a `irA("/acceso-restringido")` una vez, avisa con un solo toast y no marca el campo.
- **Regresión de a:** T-18: `inscritas` con el cursor de una clase de la que lo quitaron, e `impartidas` con una clase ajena → 400. La guarda en `DELETE …/alumnos/:alumnoId` responde 401, 403 `ACCESO_RESTRINGIDO` y 403 `SIN_ACCESO_A_LA_CLASE`. `GET …/alumnos/<uuid>` → 404; `DELETE …/alumnos/candidatos` → 400. La lista exacta de rutas (`sesiones-y-cadena.ataque`) y todas las `*.ataque` de a están en verde en la corrida limpia.
- **360 px** (análisis estático): `Table` envuelve la tabla en `w-full overflow-x-auto`. La columna de `ContenedorRol` es `flex-col min-w-0`; en móvil no hay `grid` y ningún ancestro fija anchos. La tabla se desplaza dentro del panel, no la página.
- **PA-10:** en las 410 líneas de log de las corridas de mi archivo, que incluyen las búsquedas del enmascarado y los 400, no aparece ninguna vez "pruebas.local", el dominio de todos los correos de prueba.

### Observaciones para el manager y el humano (no son hallazgos: no contradicen el plan)
1. **Un maestro puede ver el correo completo y el estado de pago de cualquier alumno:** lo agrega a su clase, lee el roster y lo quita. Es consecuencia de RF-38 con RN-02 ("de los alumnos de sus clases"), y queda auditado en `movimientos_inscripcion` (alta y baja). Lo decide el humano. *(Nota del orquestador: ya lo decidió el humano en P-05 (g), con el registro; el manager confirmó que no hay nada nuevo que escalar.)*
2. **Toast de agregar:** muestra "Agregaste a X" aunque la API diga `yaEstaba: true` (otra pestaña ya lo había agregado). Unirse sí distingue `yaEstabas`. §D-B6 no fija un texto para este caso. *(Nota del orquestador: el manager lo convirtió en D-4 para la corrección de esta ronda.)*
3. **"—" en la columna "Acceso":** según la configuración de puntuación, un lector de pantalla puede callarla o leer "raya". Es el texto que pide el plan.
4. **Tope de 120:** zod lo cuenta en puntos de código y el `maxLength` del campo en unidades UTF-16. La interfaz limita a 60 emojis y la API acepta 120. No rompe nada.
5. **Términos de búsqueda en el log:** fragmentos de nombres de alumnos llegan al log de acceso en `req.url` (`q=`). PA-10 no los lista.
6. **PR-B02d y PR-B02e** cayeron por tiempo límite en 2 de mis 4 corridas completas. Las dos veces también cayó el caso de `LOCK TABLE` de `cuentas-r1` (CHORE-02), así que fueron víctimas de la espera en cadena. En las corridas limpias pasan. No se repiten con el `LOCK TABLE` en verde.

### No atacado y por qué
- Navegador, lector de pantalla real y medición visual a 360 px: no están autorizados. Queda el análisis del CSS y del DOM; si hace falta, lo decide el humano en la comprobación de CLASES-d.
- `EXPLAIN` sobre `usuarios` (PR-B05): no lo repetí, por D-1, para no retener `usuarios`. Lo sustituí por la tabla temporal.
- Log de la API real como proceso aparte: usé el log de la app de pruebas, que tiene el mismo `opcionesDeLogger`.
- Ryuk y Testcontainers: fuera de alcance.

### Intermitencia (punto 1 del manager)
- Corridas completas del backend (`cd backend; npm test`): 1) cayó, `Tests 15 failed | 1119 passed (1134)`, tiempos límite de AUTH, PR-A15h, PR-B02d y PR-B02e, más T-20; 2) limpia, `1 failed | 1133 passed (1134)`, solo T-20; 3) cayó, `14 failed | 1119 passed | 2 skipped (1135)`, mismo patrón y el caso de `LOCK TABLE` en rojo; 4) limpia, `1 failed | 1134 passed (1135)`, solo T-20. Entre la 2 y la 3 agregué el caso del índice de trigramas.
- Ningún rojo por aserción en b fuera de T-20. Mi archivo solo: 3 corridas seguidas con el mismo resultado (`1 failed | 22 passed (23)`, solo T-20), así que PA-12 no se activa.

### PA-07
| Corrida | 40P01 | deadlock detected | could not serialize | P2028 (en el log) | too many clients |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 2 | 0 |
| 2 | 0 | 0 | 0 | 2 | 0 |
| 3 | 0 | 0 | 0 | 3 | 0 |
| 4 | 0 | 0 | 0 | 2 | 0 |
| mi archivo ×3 | 0 | 0 | 0 | 0 | 0 |

- En las cuatro corridas aparecen los 2 aceptados de `cuentas-r3` (`adapters/db/sesiones.ts:39` desde `POST /api/auth/login`; `adapters/db/tokens-cuenta.ts:116` desde `POST /api/auth/restablecer`).
- En la corrida 3 hay uno más: `adapters/db/sesiones.ts:72`, `tx.sesion.updateMany()` (`rotarSesion`), desde `POST /api/auth/refrescar`, 37 s después de iniciar la transacción. Es código de AUTH retenido por el `LOCK TABLE` (CHORE-02), igual que los dos de más que reportó el programador.
- Ninguno viene de b ni de mis pruebas de concurrencia.

### PARADAS
- **PA-01:** comprobada antes del backend. **PA-02:** no se activó (V-01 79/79, rama y árbol correctos). **PA-06:** no se activó (en las corridas limpias no falla ninguna `*.ataque` existente). **PA-07:** no se activó. **PA-10:** no se activó. **PA-11:** no se activó (`docker ps -a` solo con los 4 contenedores de `infra/`). **PA-12 y PA-15:** no se activaron.

### Comandos y última línea de salida
| Comando | Última línea |
|---|---|
| `node v01.cjs` | `esperados 79 actuales 79 coinciden 79` |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` (código 0) |
| `cd frontend; npm run lint` | `> tsc -b` (código 0) |
| `cd frontend; npm test` | `Tests  1 failed \| 1140 passed (1141)` |
| `cd backend; npm test`, corrida 4 | `Tests  1 failed \| 1134 passed (1135)` |
| `cd backend; npx prettier --write test/alumnos-b-r1.ataque.test.ts` y `cd frontend; npx prettier --write src/features/clases/alumnos-b-r1.ataque.test.tsx` | solo esos 2 archivos |

### Tabla de SHA-256 de todas las `*.ataque` (81: las 79 de la ronda 0 de b, sin cambios, y 2 nuevas)
Idéntica a la tabla de la ronda 0 de b en las 79 filas existentes; las dos filas nuevas son:

| SHA-256 | Archivo |
|---|---|
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` (nueva, ronda 1 de CLASES-b) |
| `755019C7308A849BED74793EC3F1CA5E3E3945E464540E5A1649D8DB54317863` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` (nueva, ronda 1 de CLASES-b) |

> Nota del orquestador: el tester entregó la tabla completa de 81 filas; las 79 primeras coinciden fila por fila con la tabla de la ronda 0 de b, así que aquí se registran solo las dos nuevas. La tabla vigente para V-01 es la de la ronda 0 de b más estas dos.

> **Nota de transcripción (orquestador, 2026-09-30).** La sección "CLASES-b — Corrección ronda 1, adaptación C-17" la escribió el tester y la entregó en su respuesta final (misma restricción). El orquestador verificó el SHA-256 nuevo del archivo y que siguen siendo 81 `*.ataque`. Contexto: el manager convirtió la observación 2 de la ronda 1 en D-4 (toast neutro con `yaEstaba: true`); el `toast(...)` invocable chocaba con el doble de `sonner` de esta `*.ataque`, y el manager arbitró la opción (A): D-4 se queda y el tester adapta el doble (`aprobacion.md`, "CLASES-b").

### CLASES-b — Corrección ronda 1, adaptación C-17

**Archivo adaptado:** `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx`.
- El doble de `sonner` ahora es una función que se puede invocar.
- `success` y `error` son las mismas referencias `vi.fn()` de `aviso`, creadas con `vi.hoisted`; `Object.assign` copia esas referencias, no crea otras.
- Lleva el comentario de C-17, en dos líneas.
- No cambió ningún otro import, doble ni caso.
- El caso de la línea 250 ("agregar a quien otra pestaña acaba de quitar (o de agregar)…") conserva todas sus aserciones, sin quitar ni relajar ninguna, y no gana ninguna sobre el texto del aviso.

**Otras `*.ataque` revisadas:** busqué en todas las `*.ataque` del frontend las que simulan `sonner` y mencionan `/alumnos`, `AlumnosView`, `BuscadorAlumnos` o el router: solo aparece esta. `clases-r1` a `clases-r4` también simulan `sonner` con `{ success, error }`, pero ninguna llega a las rutas de alumnos ni a `yaEstaba`. No las toqué.

**Diff contra la versión de la ronda 1:**
```diff
@@ -16,7 +16,9 @@ import { PersonasView } from "./personas-view"
 // "Puntos de ataque" b, §D-B4, §D-B4 bis, DESIGN.md §7.14 y §7.17). Sin selectores de clase.
 
 const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
-vi.mock("sonner", () => ({ toast: aviso }))
+// CLASES-b corrección ronda 1 (C-17): el doble de sonner pasa a ser invocable por D-4 (aviso neutro
+// con yaEstaba); el caso sigue protegiendo lo mismo. success y error son las mismas referencias.
+vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), aviso) }))
 
 const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/estudiante") }))
 vi.mock("@/services/navegacion", () => navegacion)
```

**SHA-256:**

| Archivo | Ronda 1 | Nuevo (C-17) |
|---|---|---|
| `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` | `755019C7308A849BED74793EC3F1CA5E3E3945E464540E5A1649D8DB54317863` | `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` |

**La tabla vigente para V-01** es la de la ronda 0 de b, más `alumnos-b-r1` del backend (`485D39EF…`) y este archivo con su hash nuevo (`C3692E9E…`): 81 en total.

**Verificación:**
- **Formato:** `cd frontend; npx prettier --write src/features/clases/alumnos-b-r1.ataque.test.tsx`, solo ese archivo; `prettier --check` dice "All matched files use Prettier code style!".
- **`cd frontend; npm test`:** código 0. Últimas líneas: `Test Files  82 passed (82)` · `Tests  1143 passed (1143)` · `Duration  40.51s`.
- **Sin `Unhandled Rejection`:** `grep -c "Unhandled"` sobre la salida da 0.
- **`npx vitest list`:** 1143 casos, igual que la corrida.
- **Árbol:** nada más tocado: ni código de producción, ni otras pruebas, ni el backend.

> **Nota de transcripción (orquestador, 2026-09-30).** La sección "CLASES-b — Ronda 2" la escribió el tester y la entregó en su respuesta final (misma restricción, `docs/ESTADO.md` §4). Antes de transcribirla, el orquestador verificó: existen los 2 archivos `alumnos-b-r2.ataque` y sus SHA-256 coinciden con la tabla; hay 83 `*.ataque`; los dos `alumnos-b-r1` conservan su hash (el del frontend, el de C-17).

## CLASES-b — Ronda 2
Veredicto: **ROTO**
Verificación propia:
- **Lint:** backend con código 0 (`> tsc -p tsconfig.json --noEmit`); frontend con código 0 (`> tsc -b`).
- **Test del frontend** (dos corridas iguales): `Test Files  1 failed | 82 passed (83)` · `Tests  3 failed | 1150 passed (1153)`. Ningún `Unhandled Rejection`. Los 3 rojos son T-22, T-23 y T-24.
- **Test del backend, corrida limpia:** `Test Files  103 passed (103)` · `Tests  1140 passed (1140)`, código 0.

Base `<Ca>` = `855069b`. Rama `feat/clases`. Fecha: 2026-09-30.

### Precondiciones
- **V-01:** 81/81, comparado por programa. Son las 79 de la ronda 0 de b, más `alumnos-b-r1` del backend (`485D39EF…`) y la del frontend con el hash de C-17 (`C3692E9E…`).
- **PA-01:** regla `True` / `Inbound` / `Block` / `Public`; red `IZZI-F281-5G`, Public, de confianza. Backend permitido.
- **Árbol:** en `git status --porcelain -- shared backend frontend`, las únicas `*.ataque` son las 2 de la ronda 0, las 2 `-r1` y mis 2 `-r2`. No toqué código de producción, pruebas normales ni `*.ataque` existentes.

### Regresión: por qué pasan T-20, T-21 y C-17
- **T-20 pasa por la razón correcta.** `busquedaCandidatosSchema.q` ya no aplica `.min(3)`/`.max(120)` al texto crudo. Un `superRefine` mide los puntos de código del término normalizado, con la misma expresión que `normalizarParaBusqueda` de `core`: más de 120 normalizados, o más de 1000 en crudo → `VALIDACION`; `max(crudo, normalizado) < 3` → `VALIDACION`. "각" (3 jamo) y "가나" (4) llegan a `core` y encuentran a la alumna. Mi caso de la ronda 1 está en verde, y la tabla de `alumnos-b-r2` (otros alfabetos y bordes) también.
- **T-21 pasa por la razón correcta.** La fila ya no se enfoca a sí misma en `onSuccess`. `TablaAlumnos` guarda `{ id, indice }` de la fila quitada, y un efecto sobre la lista aplanada de todas las páginas mueve el foco al "Quitar" de `filas[min(indice, n−1)]` cuando la fila sale de los datos, o al `h2` (`tabIndex -1`) si no queda fila. Mi caso de la ronda 1 está en verde. Con varias páginas lo confirman mis 4 casos nuevos: la primera fila de la página 2, la última de la página 1 con la página 2 cargada, la última de todas y la única fila.
- **C-17 en verde.** El caso "agregar a quien otra pestaña acaba de quitar (o de agregar)…" conserva sus 3 aserciones (la fila del roster aparece, el buscador pasa a "Ya está en la clase" y hay un solo POST). Con el doble invocable ya no hay `Unhandled Rejection`.
- **Las demás `*.ataque` de a y de b** están en verde en la corrida limpia del backend y en las dos del frontend.

### Hallazgos

#### T-22 — Si la consulta nueva del roster falla después de quitar, el foco cae en `<body>`
Severidad: baja
Prueba: `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx`, "T-22: si la consulta nueva del roster falla después de quitar, el foco no queda en <body> ni en un botón que ya no existe".
- **Esperado:** el DELETE responde 204 y la consulta nueva del roster responde 500. El foco va a un elemento conectado; por el arbitraje de T-21, el `h2` "Alumnos".
- **Obtenido:** `document.activeElement === document.body`.
- **Causa:** `contenido()` evalúa `isError` primero y cambia toda la tabla por `MensajeError`, así que se desmonta "Sí, quitar", que tenía el foco. Los datos viejos siguen en la caché e incluyen la fila quitada, así que el efecto no ve que la fila salió y no mueve el foco.

Requisito o regla violada: DESIGN.md §7.14, "Foco al confirmar una acción que borra la fila": "nunca a `<body>`"; arbitraje de T-21: "si no queda control al cual saltar, va al `h2`". Es la primera observación del manager, comprobada.

#### T-23 — Si la fila sale de los datos antes del `onSuccess`, el foco cae en `<body>`
Severidad: baja
Prueba: `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx`, "T-23: si la fila sale de los datos antes del onSuccess (otra pestaña la quitó y el roster se volvió a pedir), el foco no queda en <body>".
- **Esperado:** el DELETE está en vuelo y el servidor ya no tiene al alumno (otra pestaña, o este mismo DELETE ya aplicado). El roster se vuelve a pedir, por ejemplo al regresar el foco a la ventana, y la fila desaparece antes del 204. El foco no queda en `<body>`.
- **Obtenido:** `document.activeElement === document.body`.
- **Causa:** la fila se desmonta con "Sí, quitar" enfocado. TanStack Query no ejecuta el `onSuccess` pasado a `mutate` de un componente desmontado, así que `onQuitado` no se llama y `quitada.current` queda en `null`. Aunque se llamara, `handleQuitado` busca el índice en la `filas` capturada al hacer clic, y el efecto solo corre cuando `filas` vuelve a cambiar.

Requisito o regla violada: DESIGN.md §7.14 (nunca a `<body>`); arbitraje de T-21: "sin depender de cuándo llegue la consulta nueva". Es la segunda observación del manager, comprobada.

#### T-24 — El frontend pide un término que el backend rechaza por pasar de 120 normalizados
Severidad: baja
Prueba: `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx`, "T-24: un término que cabe en el campo (maxLength 120) pero pasa de 120 normalizados no se pide: el backend lo rechaza (41 sílabas hangul)". El lado del backend está en `backend/test/alumnos-b-r2.ataque.test.ts`, "bordes: … 40 y 41 sílabas hangul (120 y 123 normalizados)", en verde con `41 sílabas hangul: 400 VALIDACION`.
- **Esperado:** el frontend decide igual que el backend (S-11; §D-B5). Con "각" × 41 (41 unidades, cabe en `maxLength=120`, pero son 123 normalizados), no hace la petición.
- **Obtenido:** hace 1 petición a `/candidatos`. El backend responde `400 VALIDACION` ("La búsqueda no puede tener más de 120 caracteres"), y la persona lo ve aunque escribió 41 caracteres.
- **Causa:** `terminoDeBusquedaValido` solo comprueba el mínimo, y el tope del frontend es el `maxLength` del campo, en unidades UTF-16 del texto crudo. El hangul es el único alfabeto práctico que crece al pasar por NFD (busqué por fuerza bruta en todo Unicode). En el mínimo, en cambio, las tres normalizaciones coinciden en todos los casos de mi tabla.

Requisito o regla violada: S-11 (de 3 a 120 caracteres después de normalizar) y la coherencia de §D-B5. El borde es remoto, 41 sílabas coreanas, y por eso es bajo.

### Atacado sin hallazgos
- **T-20 con otros alfabetos**, mismo resultado en el backend y en el frontend: japonés "山田太", árabe "محمد", devanagari "क्षमा", tailandés "สมชาย", "İnc" (encuentra "İnci") → 200 y encuentran al alumno; "山田", "مح", "İİ", "ﬁﬁ" → `VALIDACION`; "क्ष" (la virama se quita), "　a　" → `BUSQUEDA_MUY_CORTA`; "ﬁﬁﬁ", "a b", "a　 b", "a\u200Bb", "각", "가나" → 200.
- **Bordes del backend:** 120 normalizados → 200; 121 → `VALIDACION`; 120 más 500 espacios → 200; 1000 en crudo → 200; 1001 → `VALIDACION`; 40 sílabas hangul → 200; 120 emojis → 200; 121 → `VALIDACION`.
- **T-21 con varias páginas** (52 alumnos, "Ver más alumnos"): quitar la primera fila de la página 2 → foco al "Quitar" de la siguiente; la última de la página 1 → a la primera de la página 2; la última de todas → a la anterior; la única → al `h2` "Alumnos".
- **D-4:** con `yaEstaba: false` solo sale `toast.success("Agregaste a Nadia Ruiz")`, sin aviso neutro; con `yaEstaba: true` y doble clic con el POST en vuelo: un solo POST, un solo `toast("Nadia Ruiz ya estaba en la clase")`, y ningún `success` ni `error`.
- **Movimientos con varios alumnos a la vez:** 9 operaciones simultáneas (2 altas y 1 baja de cada uno de 3 alumnos), en orden aleatorio. Para cada alumno, las filas alternan alta y baja empezando por alta, la última coincide con el estado final, el `maestro_id` es el del dueño y no hay ningún 5xx.
- **De la ronda 1, sin cambios y en verde:** partes locales de 64 caracteres y los demás casos del enmascarado; cursores de otra clase, inexistentes, malformados, en mayúsculas y del admin.
- **PA-10:** en las líneas de log de la corrida limpia del backend que tocan `candidatos` o `alumnos`, "pruebas.local" aparece 0 veces.

### No atacado y por qué
- Navegador y lector de pantalla reales: no están autorizados. El foco se verificó con `document.activeElement` en jsdom.
- La normalización vive en tres lugares (`shared`, `core` y frontend). Hoy son equivalentes salvo el tope de T-24. Unificarlas es una decisión de la enmienda de cierre.

### Observaciones
- Mis casos de varias páginas montan 52 filas. Con la suite completa en paralelo pasaban de 5 s: el primero cayó por tiempo límite en una corrida. Les di `timeout: 30000` y `asyncUtilTimeout: 5000`; después quedaron estables en 2 corridas completas y 1 aislada. Es la carga del equipo, no un defecto del código.
- **CHORE-02 (backend):** corrida 1, `Tests  10 failed | 1127 passed | 3 skipped (1140)`, tiempos límite de AUTH y de PR-A15f y PR-A15g, con el caso del `LOCK TABLE` de `cuentas-r1` en rojo y la fila retenida de `cuentas-r3` a 40 s; corrida 2 limpia, 1140/1140. Ningún rojo por aserción en b y ningún tiempo límite repetido en un caso de b.

### PA-07
| Corrida | 40P01 | deadlock detected | could not serialize | P2028 | too many clients |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 2 | 0 |
| 2 (limpia) | 0 | 0 | 0 | 2 | 0 |

Los dos `P2028` de cada corrida son los aceptados (`sesiones.ts:39` desde `POST /api/auth/login`, 39.9 s en la corrida 1 y 6.5 s en la 2; `tokens-cuenta.ts:116` desde `POST /api/auth/restablecer`, 6.1 s). Mi caso de concurrencia no produjo ninguno.

### PARADAS
- **PA-01:** comprobada. **PA-02:** no se activó (V-01 81/81). **PA-06:** no se activó. **PA-07:** no se activó. **PA-10:** no se activó. **PA-11:** no se activó (`docker ps -a` solo con los 4 contenedores de `infra/`). **PA-12:** no se activó, tras el ajuste de tiempos de los casos de 52 filas. **PA-15:** no se activó.

### Comandos y última línea de salida
| Comando | Última línea |
|---|---|
| `node v01.cjs` (al empezar) | 79 coinciden + las 2 `-r1` con `485D39EF…` y `C3692E9E…` |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` (código 0) |
| `cd frontend; npm run lint` | código 0 (`> tsc -b`) |
| `cd frontend; npm test` (×2) | `Tests  3 failed \| 1150 passed (1153)` |
| `cd backend; npm test` (corrida 2) | `Tests  1140 passed (1140)` (código 0) |
| `npx prettier --write` | solo `test/alumnos-b-r2.ataque.test.ts` (backend) y `src/features/clases/alumnos-b-r2.ataque.test.tsx` (frontend) |

### Tabla de SHA-256 de todas las `*.ataque` (83: las 81 vigentes, sin cambios, y 2 nuevas)
Idéntica a la tabla vigente (ronda 0 de b + `alumnos-b-r1` backend `485D39EF…` + frontend `C3692E9E…`) en las 81 filas existentes; las dos filas nuevas son:

| SHA-256 | Archivo |
|---|---|
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` (nueva, ronda 2 de CLASES-b) |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` (nueva, ronda 2 de CLASES-b) |

> Nota del orquestador: el tester entregó la tabla completa de 83 filas; las 81 primeras coinciden con la tabla vigente, así que aquí se registran solo las dos nuevas. La tabla vigente para V-01 es la de la ronda 0 de b, más `alumnos-b-r1` (backend `485D39EF…`, frontend `C3692E9E…`) y estas dos.

> **Nota de transcripción (orquestador, 2026-09-30).** La sección "CLASES-b — Ronda 3" la escribió el tester y la entregó en su respuesta final (misma restricción, `docs/ESTADO.md` §4). Antes de transcribirla, el orquestador verificó: existen los 2 archivos `alumnos-b-r3.ataque` y sus SHA-256 coinciden con la tabla; hay 85 `*.ataque`; los dos `alumnos-b-r2` conservan su hash.

## CLASES-b — Ronda 3
Veredicto: **ROTO** (tercera ronda: se escala al humano según `AGENTS.md`)
Verificación propia:
- **Lint:** backend con código 0 (`> tsc -p tsconfig.json --noEmit`); frontend con código 0.
- **Test del frontend** (dos corridas iguales): `Test Files  1 failed | 83 passed (84)` · `Tests  2 failed | 1165 passed (1167)`. Ningún `Unhandled Rejection`. Los 2 rojos son T-25 y T-26.
- **Test del backend:** corrida 1 cayó por CHORE-02 (`9 failed | 1135 passed (1144)`); corridas 2 y 3, limpias: `Test Files  104 passed (104)` · `Tests  1144 passed (1144)`, código 0.

Base `<Ca>` = `855069b`. Rama `feat/clases`. Fecha: 2026-09-30.

### Precondiciones
- **V-01:** 83/83, comparado por programa (79 de la ronda 0 de b, más `alumnos-b-r1` backend `485D39EF…` y frontend `C3692E9E…`, y `alumnos-b-r2` backend `ADF927DF…` y frontend `55DC274E…`).
- **PA-01:** regla `True` / `Inbound` / `Block` / `Public`; red `IZZI-F281-5G`, Public, de confianza. Backend permitido.
- **Árbol:** en `git status --porcelain -- shared backend frontend`, las únicas `*.ataque` son las 2 de la ronda 0 y las 6 `alumnos-b-r1/r2/r3`. No toqué código de producción, pruebas normales ni `*.ataque` existentes.

### Regresión: por qué pasan T-20 a T-24, C-16 y C-17
- **T-20 y T-24:** hay una sola normalización y un solo criterio en `shared` (`normalizarTerminoDeBusqueda` y `estadoDeTerminoDeBusqueda`: `"valido"`, `"corto"` o `"largo"`), y los usan el esquema (para responder `VALIDACION`), `core` (`prepararTerminoDeBusqueda`, para `BUSQUEDA_MUY_CORTA`) y el frontend (`terminoDeBusquedaValido` y `terminoDeBusquedaMuyLargo`). Mi caso nuevo compara los tres lados con 22 términos de borde y el resultado es idéntico. "각" y "가나" encuentran, y 41 sílabas hangul ya no se piden: el campo avisa con `ErrorDeCampo`.
- **T-21, T-22 y T-23:** `TablaAlumnos` sabe qué fila tiene el foco por `focusin` y `data-alumno-id`. Después de cada render, si el control con foco se desmontó (`activeElement` en `<body>` o desconectado), el foco va al "Quitar" de la fila que ocupa su lugar o, si no hay, al `h2`. Ya no depende de `onSuccess` ni de una lista capturada. Por eso pasan la consulta que falla y la fila que sale antes del 204.
- **C-16** (`clases-r2`, backend) y **C-17** (`alumnos-b-r1`, frontend: el caso de la carrera entre pestañas conserva sus 3 aserciones): en verde.
- **Las 83 `*.ataque`:** en verde en las corridas limpias.
- **PR-B05:** en verde en las 3 corridas completas, también en la cargada.

### Hallazgos

#### T-25 — "Agregar a la clase" desaparece al agregar y el foco cae en `<body>`
Severidad: baja
Prueba: `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx`, "T-25: con teclado, «Agregar a la clase» se convierte en «Ya está en la clase» y el foco no se pierde en <body>".
- **Esperado:** quien agrega con teclado (foco en el botón, Enter), al terminar la acción conserva un foco con sentido, sin caer en `<body>`. Por ejemplo, la fila del resultado o el campo de búsqueda.
- **Obtenido:** `document.activeElement === document.body`.
- **Causa:** el `onSuccess` invalida `["clases", claseId, "candidatos"]`, la consulta vuelve con `yaInscrito: true`, y `FilaCandidato` reemplaza el botón enfocado por la insignia `muted`, que no se puede enfocar.

Requisito o regla violada: WCAG 2.4.3 (orden del foco), y el principio del arbitraje de T-21 en DESIGN.md §7.14 ("nunca a `<body>`"). Ese texto solo cubre "una acción que borra la fila"; aquí el control desaparece por su propia acción, igual que "Sí, quitar".

#### T-26 — "Ver más alumnos" desaparece al cargar la última página y el foco cae en `<body>`
Severidad: baja
Prueba: `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx`, "T-26: con teclado, «Ver más alumnos» desaparece al cargar la última página y el foco no se pierde en <body>".
- **Esperado:** después de cargar la última página con teclado, el foco no queda en `<body>`. Por ejemplo, la primera fila nueva o el panel.
- **Obtenido:** `document.activeElement === document.body`.
- **Causa:** el botón se renderiza solo con `hasNextPage`, así que se desmonta con el foco dentro.
- **Mismo patrón en otros lugares:** `PersonasView` ("Ver más alumnos"), de b; `panel-mis-clases.tsx` ("Ver más clases"), de a, ya cerrada; "Cargar más enlaces" de admin (AUTH-03b). Que el manager decida si se corrige en b o pasa a un `chore` transversal.

Requisito o regla violada: WCAG 2.4.3; mismo principio de §7.14.

### Atacado sin hallazgos
- **El foco del roster con cualquier causa de desmontaje.** Los casos de las rondas 1 y 2 siguen en verde: varias páginas, la primera fila de la página 2, la última de la página 1 y la última de todas, la única fila, la consulta nueva que falla (T-22) y otra pestaña que quita la fila antes del 204 (T-23). Además: cancelar devuelve el foco a "Quitar" de esa fila y la tabla no lo mueve después; un render con los mismos datos, o con otra fila que sale, no mueve el foco de la fila que lo tiene; con el foco en el buscador o en "Ver más alumnos", que una fila salga no les roba el foco; si la persona dejó la tabla (`blur` a `<body>`), que la fila salga no le regresa el foco a la tabla.
- **Sesión que expira:** si el DELETE responde 401 y el refresco falla, `apiClient` llama a `irA("/login")`, hay un solo toast de error y el foco sigue en la fila, conectado; si el roster nuevo responde 401 después de quitar, el error reemplaza la tabla y el foco va al `h2` "Alumnos".
- **Normalización unificada.** Para 22 términos, el endpoint responde lo que dice `estadoDeTerminoDeBusqueda`, `core` coincide en el mínimo, y `normalizarParaBusqueda` (de `core/auth`) da lo mismo que `normalizarTerminoDeBusqueda`: 120/121 normalizados; 119 más una marca; 120 más 3 marcas sueltas; 121 con espacios dobles; 1000/1001 en crudo, con espacios y con marcas; 40/41 sílabas hangul; 60/120/121 emojis; "İİİ" e "İİ"; "ab", 3 marcas, solo espacios; U+FEFF, U+200B, tabulador y salto de línea.
- **El campo del buscador:** `maxLength="120"` viene de `shared` (D-8); 41 sílabas hangul: un solo aviso "La búsqueda no puede tener más de 120 caracteres", `aria-invalid="true"` y ninguna petición; con 40, el aviso se quita, `aria-invalid="false"` y sale una petición; con "ab" no aparece el aviso de longitud y la ayuda está una sola vez.
- **Enmascarado con partes locales de 64 caracteres:** `a+…`, `.X…`, `…+` y `Ab.…` dan solo los 2 primeros caracteres más `***` y el dominio. Nunca salen los 3 primeros ni el correo completo.
- **Cursor del roster y de personas de otra clase, con homónimos:** con 3 cursores de alumnos de otra clase que se llaman igual que 5 miembros, la página sigue exactamente por (`nombre_busqueda`, `id`), sin colar al ajeno ni repetir (O-01).
- **PA-10:** 0 apariciones de "pruebas.local" en las líneas de log de la corrida limpia.

### No atacado y por qué
- Navegador y lector de pantalla reales: no están autorizados. El foco se verificó con `document.activeElement` en jsdom.
- Dos tablas montadas a la vez: el router no lo permite.
- La carrera entre el `focusout` y el `setTimeout(0)` que borra la fila marcada: en la práctica no se alcanza (`mousedown` y `click` van en tareas separadas, con decenas de milisegundos entre ellas), y no hay forma realista de provocarla.

### Observaciones para el manager y para H-6
- **Ayuda y aviso juntos:** con un término demasiado largo, `aria-describedby` lee la ayuda permanente "Escribe al menos 3 letras." y luego el aviso "La búsqueda no puede tener más de 120 caracteres". Es lo que pide §7.17 (ayuda permanente), pero un lector de pantalla oye las dos frases seguidas. **Para H-6:** escucharlo una vez.
- **D-7 bis:** la línea 990 de `resumen-programador.md`. *(Nota del orquestador: ya corregida por el programador después de esta ronda.)*
- **CHORE-02, corrida 1:** cayeron por tiempo límite PR-A15g y PR-A15h (de a), PR-B07a y PR-B07b (de b), y casos de AUTH y de `worker-*`, con el caso del `LOCK TABLE` de `cuentas-r1` en rojo y la fila retenida de `cuentas-r3` a 40 s. Son víctimas de la espera en cadena. No se repiten en las 2 corridas limpias y ninguno cayó por aserción.
- **PR-B05** (40,000 filas): verde en las 3 corridas.

### PA-07
| Corrida | 40P01 | deadlock detected | could not serialize | P2028 | too many clients |
|---|---|---|---|---|---|
| 1 (CHORE-02) | 0 | 0 | 0 | 3 | 0 |
| 2 | 0 | 0 | 0 | 2 | 0 |
| 3 | 0 | 0 | 0 | 2 | 0 |

En las tres corridas aparecen los 2 aceptados de `cuentas-r3` (`sesiones.ts:39` desde `POST /api/auth/login`; `tokens-cuenta.ts:116` desde `POST /api/auth/restablecer`). En la corrida 1 hay uno más: `adapters/db/sesiones.ts:110`, `tx.sesion.updateMany()`, desde `POST /api/auth/refrescar`, 34.7 s después de iniciar la transacción. Es AUTH retenido por la cadena, no b.

### PARADAS
- **PA-01:** comprobada. **PA-02:** no se activó (V-01 83/83). **PA-06:** no se activó. **PA-07:** no se activó. **PA-10:** no se activó. **PA-11:** no se activó (`docker ps -a` solo con los 4 contenedores de `infra/`). **PA-12:** no se activó. **PA-15:** no se activó.

### Comandos y última línea de salida
| Comando | Última línea |
|---|---|
| `node v01.cjs` (al empezar) | 79 + 4 de b, todos iguales a la tabla vigente |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` (código 0) |
| `cd frontend; npm run lint` | código 0 |
| `cd frontend; npm test` (×2) | `Tests  2 failed \| 1165 passed (1167)` |
| `cd backend; npm test` (corridas 2 y 3) | `Tests  1144 passed (1144)` (código 0) |
| `npx prettier --write` | solo `test/alumnos-b-r3.ataque.test.ts` (backend) y `src/features/clases/alumnos-b-r3.ataque.test.tsx` (frontend) |

### Tabla de SHA-256 de todas las `*.ataque` (85: las 83 vigentes, sin cambios, y 2 nuevas)
Idéntica a la tabla vigente en las 83 filas existentes; las dos filas nuevas son:

| SHA-256 | Archivo |
|---|---|
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` (nueva, ronda 3 de CLASES-b) |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` (nueva, ronda 3 de CLASES-b) |

> Nota del orquestador: el tester entregó la tabla completa de 85 filas; las 83 primeras coinciden con la tabla vigente, así que aquí se registran solo las dos nuevas. La tabla vigente para V-01 es la de la ronda 0 de b, más `alumnos-b-r1` (backend `485D39EF…`, frontend `C3692E9E…`), `alumnos-b-r2` (backend `ADF927DF…`, frontend `55DC274E…`) y estas dos.

> **Nota de transcripción (orquestador, 2026-10-01).** La sección "CLASES-b — Ronda 4, regresión final" la escribió el tester y la entregó en su respuesta final (misma restricción, `docs/ESTADO.md` §4). Antes de transcribirla, el orquestador verificó: existe `alumnos-b-r4.ataque.test.tsx` y su SHA-256 coincide con la tabla; hay 86 `*.ataque`; los dos `alumnos-b-r3` conservan su hash.

## CLASES-b — Ronda 4, regresión final
Veredicto: **ROTO** (dos defectos nuevos en lo que cambió en la ronda 4; por la decisión del humano, "sin quinta ronda", se escala)
Verificación propia:
- **Lint:** backend y frontend con código 0.
- **Test del frontend** (dos corridas iguales): `Test Files  1 failed | 84 passed (85)` · `Tests  3 failed | 1182 passed (1185)`. Ningún `Unhandled Rejection`. Los 3 rojos son T-27 y los dos casos de T-28 (roster y personas).
- **Test del backend:** corrida 1 cayó por la espera en cadena de CHORE-02 (`11 failed | 1133 passed (1144)`); corrida 2, limpia: `Test Files  104 passed (104)` · `Tests  1144 passed (1144)`, código 0.

Base `<Ca>` = `855069b`. Rama `feat/clases`. Fecha: 2026-10-01.

### Precondiciones
- **V-01:** 85/85, comparado por programa (79 de la ronda 0 de b, más `alumnos-b-r1`, `-r2` y `-r3`: backend `485D39EF…`, `ADF927DF…` y `FC11AB4B…`; frontend `C3692E9E…`, `55DC274E…` y `371518E4…`).
- **PA-01:** regla `True` / `Inbound` / `Block` / `Public`; red `IZZI-F281-5G`, Public, de confianza. Contenedores de `infra/` sanos.
- **Árbol:** no toqué código de producción, pruebas normales ni `*.ataque` existentes. Solo creé el archivo `-r4` (no hay `-r4` del backend: en la ronda 4 el backend no cambió).

### Regresión de las 85 (por qué pasan los casos que antes estaban en rojo)
- **T-25, el foco va adonde dice §7.14, no solo fuera de `<body>`.** `BuscadorAlumnos` usa `useFilaEnFoco("data-candidato-id")`. Después de cada render, si la fila tenía el foco y lo perdió, el foco va al siguiente "Agregar a la clase", luego al anterior, y si no queda ninguno al campo. Confirmado en `-r4` con destinos exactos: fila del medio → el siguiente; la última → el anterior; la única → el campo; si la siguiente ya dice "Ya está en la clase", salta a la que sigue; doble Enter con el POST en vuelo → un solo POST, y el foco al siguiente.
- **T-26.** `useFocoAlCargarMas` mueve el foco cuando "Ver más alumnos" tenía el foco y desaparece: en el roster, al "Quitar" de la primera fila nueva; en personas, al `<li tabIndex=-1>` de la primera persona nueva; si no llegó nada, al `h2` "Alumnos". Con más páginas pendientes, el botón sigue montado y el foco no se mueve. Confirmado en `-r4` para el roster y para personas.
- **T-21 a T-23:** el mismo mecanismo, ahora en `useFilaEnFoco`. Los casos de `-r1` a `-r3` están en verde.
- **T-24:** en verde. La normalización y el aviso de longitud no cambiaron en esta ronda.
- **C-16** (`clases-r2`, backend) y **C-17** (`alumnos-b-r1`, frontend): en verde.
- **PR-B05:** en verde en las dos corridas completas.
- Las demás `*.ataque` de a y de b están en verde en la corrida limpia del backend y en las dos del frontend.

### Hallazgos

#### T-27 — Personas: si falla la consulta de la página siguiente, el foco cae en `<body>`
Severidad: baja
Prueba: `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx`, "T-27: personas: si la consulta de la página siguiente falla, el foco no se pierde en <body>".
- **Esperado:** con el foco en "Ver más alumnos" (teclado), si la página siguiente responde 500, el foco no queda en `<body>`. Así lo exige §7.14, y en el roster el mismo caso termina en el `h2`.
- **Obtenido:** `document.activeElement === document.body`.
- **Causa:** `PersonasView` evalúa `personas.isError` antes que todo y devuelve solo `MensajeError`, así que desmonta el botón **y el `h2` "Alumnos"**. `useFocoAlCargarMas` llama a `enfocarEncabezado()` con `encabezadoRef.current === null`, y no hay ningún destino.

Requisito o regla violada: DESIGN.md §7.14, "Foco cuando un control desaparece por su propia acción" ("nunca a `<body>`").

#### T-28 — Con el ratón en "Ver más alumnos" y luego un clic fuera, un render sin desmontaje mueve el foco
Severidad: baja
Prueba: `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx`, "T-28: %s: con ratón en «Ver más alumnos» y después un clic fuera, un render sin desmontaje no mueve el foco". Son 2 casos, `alumnos` y `personas`.
- **El caso, paso a paso:** 1) clic con el ratón en "Ver más alumnos": el botón recibe el foco y quedan más páginas; 2) clic en blanco: el foco pasa a `<body>`; 3) otra pestaña quita a un alumno y la lista se vuelve a pedir: los datos cambian y hay render, pero el botón sigue montado.
- **Esperado:** el foco no se mueve.
- **Obtenido:** roster: el foco salta al "Quitar" de una fila (`Alumno 051`, que entró a la primera página); personas: salta al `<li>` de esa persona.
- **Causa:** `useFocoAlCargarMas` marca `teniaElFoco` con `focusin` y solo lo borra con otro `focusin`; un `focusout` hacia nada no lo borra. Su efecto no comprueba que el botón se haya desmontado (`botonRef.current` sigue conectado): le basta `teniaElFoco && focoPerdido()`. Como hay ids nuevos, enfoca el primero. `useFilaEnFoco` sí cubre este caso con su `focusout` más `setTimeout`.

Requisito o regla violada: DESIGN.md §7.14 ("Mientras el botón siga montado, o si el foco está en otro control, no mueve nada", el texto del propio hook) y la lista del manager para esta ronda: "Renders sin desmontaje: no mueven el foco".

### Atacado sin hallazgos
- **T-25 con teclado:** la fila del medio, la última y la única; la siguiente que ya dice "Ya está en la clase"; doble Enter; escribir un término nuevo mientras se agrega: el foco se queda en el campo y el alta se completa (la fila aparece en el roster); un render sin desmontaje (los candidatos se vuelven a pedir) no mueve el foco de "Agregar".
- **T-26 con teclado, en el roster y en personas:** con más páginas el botón sigue montado y el foco no se mueve; en la última página, el foco va al primer elemento nuevo; si la última página llega vacía, va al `h2` "Alumnos"; en el roster, si la página siguiente falla, va al `h2`.
- **Regresión del foco del roster (T-21 a T-23) y lo demás de b:** las `*.ataque` de `-r1` a `-r3`, en verde.
- **PA-10:** 0 apariciones de "pruebas.local" en las líneas de log de la corrida limpia del backend.

### Observaciones finales para H-6
- **Toast perdido:** si la persona escribe un término nuevo mientras se agrega a un alumno, la fila del buscador se desmonta antes del `onSuccess` y no sale el toast "Agregaste a…". El alta se hace y el roster se actualiza. Es la conducta de TanStack Query con los callbacks de `mutate`; no es hallazgo porque §7.14 trata del foco. **Para H-6:** comprobar si molesta.
- **Ayuda y aviso juntos** (de la ronda 3): con un término demasiado largo, el lector de pantalla oye seguidas la ayuda "Escribe al menos 3 letras." y el aviso de longitud.
- **Ver con teclado y lector de pantalla (H-6):** los destinos de foco de §7.14 (siguiente "Agregar", primera fila nueva, `h2`).
- **D-7 bis:** *(nota del orquestador: ya corregido por el programador antes de esta ronda.)*

### Intermitencia (CHORE-02)
- **Corrida 1:** `11 failed | 1133 passed (1144)`, todos por tiempo límite. Cayeron `cuentas-r1` (`LOCK TABLE`, en rojo), `cuentas-r3` (40 s), B1 y B2, PR-A15f y PR-A15g, y PR-B06a y PR-B06b, más dos casos de nombre de AUTH.
- **Corrida 2:** limpia. Ningún rojo por aserción en a ni en b, ni un tiempo límite repetido en el mismo caso con el `LOCK TABLE` en verde.

### PA-07
| Corrida | 40P01 | deadlock detected | could not serialize | P2028 | too many clients |
|---|---|---|---|---|---|
| 1 (CHORE-02) | 0 | 0 | 0 | 3 | 0 |
| 2 (limpia) | 0 | 0 | 0 | 2 | 0 |

En las dos corridas aparecen los 2 aceptados de `cuentas-r3` (`sesiones.ts:39` desde `POST /api/auth/login`, 39.9 s en la corrida 1 y 6.3 s en la 2; `tokens-cuenta.ts:116` desde `POST /api/auth/restablecer`, 6.1 s y 6.0 s). En la corrida 1 hay uno más: `adapters/db/sesiones.ts:72`, `tx.sesion.updateMany()` (`rotarSesion`), desde `POST /api/auth/refrescar`, 39.9 s. Es AUTH retenido por la cadena, no b.

### PARADAS
- **PA-01:** comprobada. **PA-02:** no se activó (V-01 85/85). **PA-06:** no se activó. **PA-07:** no se activó. **PA-10:** no se activó. **PA-11:** no se activó (`docker ps -a` solo con los 4 contenedores de `infra/`). **PA-12:** no se activó. **PA-15:** no se activó.

### Comandos y última línea de salida
| Comando | Última línea |
|---|---|
| `node v01.cjs` (al empezar) | 85 iguales a la tabla vigente |
| `cd backend; npm run lint` / `cd frontend; npm run lint` | código 0 en los dos |
| `cd frontend; npm test` (×2) | `Tests  3 failed \| 1182 passed (1185)` |
| `cd backend; npm test` (corrida 2) | `Tests  1144 passed (1144)` (código 0) |
| `npx prettier --write` | solo `src/features/clases/alumnos-b-r4.ataque.test.tsx` (desde `frontend/`) |

### Tabla de SHA-256 de todas las `*.ataque` (86: las 85 vigentes, sin cambios, y 1 nueva)
Idéntica a la tabla vigente en las 85 filas existentes; la fila nueva es:

| SHA-256 | Archivo |
|---|---|
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` (nueva, ronda 4 de CLASES-b) |

> Nota del orquestador: el tester entregó la tabla completa de 86 filas; las 85 primeras coinciden con la tabla vigente, así que aquí se registra solo la nueva. La tabla vigente para V-01 es la de la ronda 0 de b, más `alumnos-b-r1` (backend `485D39EF…`, frontend `C3692E9E…`), `alumnos-b-r2` (backend `ADF927DF…`, frontend `55DC274E…`), `alumnos-b-r3` (backend `FC11AB4B…`, frontend `371518E4…`) y esta.

> **Nota de transcripción (orquestador, 2026-10-01).** La sección "CLASES-b — Ronda 5, regresión final" la escribió el tester y la entregó en su respuesta final (misma restricción, `docs/ESTADO.md` §4). Antes de transcribirla, el orquestador verificó: existe `alumnos-b-r5.ataque.test.tsx` y su SHA-256 coincide con la tabla; hay 87 `*.ataque`; `alumnos-b-r4` conserva su hash. **La tabla de esta sección es la tabla de cierre de CLASES-b y la base de V-01 para CLASES-c.**

## CLASES-b — Ronda 5, regresión final
Veredicto: **RESISTE**
Verificación propia:
- **Lint:** backend y frontend con código 0.
- **Test del frontend** (dos corridas iguales): `Test Files  86 passed (86)` · `Tests  1201 passed (1201)`, código 0, ningún `Unhandled Rejection`.
- **Test del backend:** corridas 1 y 3: `Test Files  104 passed (104)` · `Tests  1144 passed (1144)`, código 0; corrida 2 cayó por la espera en cadena de CHORE-02 (`13 failed | 1126 passed | 5 skipped`), todos por tiempo límite.

Base `<Ca>` = `855069b`. Rama `feat/clases`. Fecha: 2026-10-01.

### Precondiciones
- **V-01:** 86/86, comparado por programa (79 de la ronda 0 de b, más las 7 `alumnos-b-r1` a `-r4`: backend `485D39EF…`, `ADF927DF…` y `FC11AB4B…`; frontend `C3692E9E…`, `55DC274E…`, `371518E4…` y `BE0E7656…`).
- **PA-01:** regla `True` / `Inbound` / `Block` / `Public`; red `IZZI-F281-5G`, Public, de confianza.
- **Árbol:** no toqué código de producción, pruebas normales ni `*.ataque` existentes. Solo creé el archivo `-r5` (no hay `-r5` del backend: en la ronda 5 el backend no cambió).

### Regresión de las 86 (por qué pasan T-27 y T-28)
- **T-28.** `useFocoAlCargarMas` compara entre renders si el botón está montado. Solo mueve el foco si el botón estaba montado, ya no lo está, tenía el foco y el foco se perdió. La marca se borra con un `focusin` en otro elemento y con un `focusout` sin destino (`setTimeout(0)`, botón conectado). Por eso el caso de `-r4` (ratón, clic fuera y datos nuevos) deja el foco en `<body>` en el roster y en personas. En `-r5` lo repetí con teclado y con más páginas ya cargadas: el foco no se mueve y el botón sigue montado.
- **T-27.** Después de la primera carga, `PersonasView` mantiene montado el `h2` "Alumnos" (`tabIndex -1`) y muestra el error dentro de la sección. El caso de `-r4` deja el foco fuera de `<body>`, y en `-r5` comprobé que va **exactamente** al `h2` "Alumnos", en personas y en el roster.
- **T-20 a T-26, C-16 y C-17:** en verde, por las mismas razones de las rondas anteriores. `tabla-alumnos.tsx` no cambió de comportamiento.
- **PR-B05:** en verde en las tres corridas.
- Las demás `*.ataque` de a y de b están en verde en las corridas limpias.

### Hallazgos
Ninguno nuevo.

### Atacado sin hallazgos
- **T-28, sin movimientos con el botón montado, en el roster y en personas:** con teclado, "Ver más" con más páginas por cargar, luego un clic en blanco y una consulta nueva con datos distintos: el foco sigue en `<body>` y el botón, montado; con el foco en "Ver más" y el botón montado, una consulta nueva con datos distintos no lo mueve.
- **El foco en otro control mientras llega la última página:** roster: la persona pasa al campo de búsqueda y, cuando "Ver más" desaparece, el foco se queda en el campo; personas: pasa al `<li>` de una persona y ahí se queda.
- **El botón que desaparece sin clic** (otra pestaña quita alumnos y ya no quedan más páginas): el foco va al encabezado, nunca a `<body>`, en el roster y en personas.
- **T-27:** si la página siguiente falla, el foco va exactamente al `h2` "Alumnos", en personas y en el roster.
- **La primera carga que falla:** se ve el error (`role="alert"`), no aparece "Ver más alumnos" y no se mueve el foco, porque no había nada enfocado. En el roster y en personas.
- **La defensa sin destino conectado** (el primer elemento enfocable de la sección): ninguna ruta de la interfaz la alcanza, porque el `h2` siempre está montado después de la primera carga. La cubren las pruebas normales del programador.
- **Regresión de la ronda 4:** las últimas páginas con elementos nuevos y vacías, T-25 en todas sus variantes, los renders sin desmontaje del buscador y del roster.
- **El error dentro de la sección a 360 px (análisis estático):** `MensajeError` es un `flex items-start gap-3` con un icono `shrink-0` y el texto en `flex-col`, sin anchos fijos; lo envuelven la `section` (`flex flex-col gap-2`) y `CardContent` (`flex flex-col gap-6`), dentro de la columna `min-w-0` de `ContenedorRol`; el texto se ajusta y no hay desbordamiento horizontal.
- **PA-10:** 0 apariciones de "pruebas.local" en las líneas de log de la corrida limpia.

### Observaciones finales para H-6 (consolidadas de b)
1. **Ayuda y aviso juntos:** con un término de más de 120 caracteres normalizados (por ejemplo, 41 sílabas hangul), un lector de pantalla lee seguidas la ayuda permanente "Escribe al menos 3 letras." y el aviso "La búsqueda no puede tener más de 120 caracteres". Escucharlo una vez.
2. **Toast perdido:** si la persona escribe un término nuevo mientras se agrega a un alumno, la fila del buscador se desmonta antes del `onSuccess` y no sale "Agregaste a…". El alta sí se hace y el roster se actualiza. Comprobar si molesta. *(Destino: CLASES-c, mover el aviso al `onSuccess` del hook de la mutación.)*
3. **Destinos de foco con teclado y lector de pantalla** (§7.14): al quitar, el "Quitar" de la fila que ocupa su lugar o el `h2`; al agregar, el siguiente "Agregar a la clase", el anterior o el campo; con "Ver más alumnos", la primera fila o persona nueva o el `h2` "Alumnos". Comprobar que el lector anuncia algo útil en cada destino, en particular el `<li tabIndex=-1>` de personas y el `h2`.
4. **Roster a 360 px:** la tabla se desplaza en horizontal dentro de su contenedor (`overflow-x-auto`), no la página. Ver también "—" en la columna "Acceso" con el lector (de la ronda 1).
5. **D-7 bis:** *(nota del orquestador: ya corregido por el programador antes de la ronda 4.)*

### Intermitencia (CHORE-02)
- **Corrida 2:** `13 failed | 1126 passed | 5 skipped (1144)`, todos por tiempo límite: el caso del `LOCK TABLE` de `cuentas-r1` (en rojo) y la fila retenida de `cuentas-r3` (40 s); AUTH, `worker-*` y PR-A15h; y, por primera vez, dos casos de `alumnos-b-r1` ("cada ruta y método…" y "un maestro dueño…"), que crean cuentas en `usuarios` y quedaron detrás de la espera en cadena.
- **Corridas 1 y 3:** limpias. Ningún rojo por aserción en a ni en b.

### PA-07
| Corrida | 40P01 | deadlock detected | could not serialize | P2028 | too many clients |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 2 | 0 |
| 2 (CHORE-02) | 0 | 0 | 0 | 3 | 0 |
| 3 | 0 | 0 | 0 | 2 | 0 |

En las tres corridas aparecen los 2 aceptados de `cuentas-r3` (`sesiones.ts:39` desde `POST /api/auth/login`; `tokens-cuenta.ts:116` desde `POST /api/auth/restablecer`). En la corrida 2 hay uno más: `adapters/db/tokens-cuenta.ts:116`, `tx.tokenCuenta.updateMany()`, desde `POST /api/auth/establecer-contrasena`, 36.6 s. Es AUTH retenido por la cadena, no b.

### PARADAS
- **PA-01:** comprobada. **PA-02:** no se activó (V-01 86/86). **PA-06:** no se activó. **PA-07:** no se activó. **PA-10:** no se activó. **PA-11:** no se activó (`docker ps -a` solo con los 4 contenedores de `infra/`). **PA-12:** no se activó. **PA-15:** no se activó.

### Comandos y última línea de salida
| Comando | Última línea |
|---|---|
| `node v01.cjs` (al empezar) | 86 iguales a la tabla vigente |
| `cd backend; npm run lint` / `cd frontend; npm run lint` | código 0 en los dos |
| `cd frontend; npm test` (×2) | `Tests  1201 passed (1201)` |
| `cd backend; npm test` (corridas 1 y 3) | `Tests  1144 passed (1144)` |
| `npx prettier --write` | solo `src/features/clases/alumnos-b-r5.ataque.test.tsx` (desde `frontend/`) |

### Tabla de SHA-256 de todas las `*.ataque` al cierre de CLASES-b (87: las 86 vigentes, sin cambios, y 1 nueva marcada). Base de V-01 para CLASES-c
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `5B82305E0D38F1132A5354882B4FDC94E7CFA11349891D91513095A6B20C7C1D` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` (nueva, ronda 5 de CLASES-b) |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `BAB2B0188BCF02DD260A47519C3BD38712B07FA1F521C23BFA80BF34401DE165` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `A2063111063EB7C13FDB7E4341BD29AB4C3A4889DF237C575469837F2C2775F2` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-c — Ronda 0
Veredicto: ronda 0, de adaptación (no cuenta en el tope de 3), **completa**. Reescribí 3 casos: C-2, C-12 y C-19. Quedan en rojo exactamente los 2 esperados (C-2 y C-12). El de C-19 queda en verde antes y después, como pidió el orquestador. No cae ningún otro caso en las corridas limpias.
Verificación propia: lint del backend con código 0 · lint del frontend con código 0 · test del frontend `Tests  1 failed | 1200 passed (1201)` · test del backend `Tests  1 failed | 1143 passed (1144)` (corrida 2; la corrida 1 cayó por la espera en cadena de CHORE-02). En los dos paquetes, el único rojo es el esperado.

Base `<Cb>` = `e9df1f0` dentro de los paquetes. Rama `feat/clases`. Fecha: 2026-10-01.

### Precondiciones
- **Rama y base:** `feat/clases`; `git log -1` → `e9df1f0 Clases parte B`; `git cat-file -e 'e9df1f0^{commit}'` → código 0.
- **Árbol:** `git status --porcelain` listaba al empezar `M docs/ESTADO.md`, `M docs/trabajo/CLASES-01-clases-y-muro/aprobacion.md` y `M docs/trabajo/CLASES-01-clases-y-muro/plan.md` (la Enmienda 6 transcrita por el orquestador). Son documentación fuera de "No se toca" (plan, "Alcance" y V-05; `AGENTS.md`, "Commits y cierre de subentregas"); los di por buenos. Durante la ronda apareció además `docs/trabajo/CLASES-01-clases-y-muro/revision.md` (el manager, 66 líneas agregadas): también documentación, fuera de los paquetes.
  - **Dentro de los paquetes:** `git diff --quiet e9df1f0 -- shared backend frontend` → código 0, y `git ls-files -o --exclude-standard -- shared backend frontend` vacío.
- **V-01:** comparé por programa (Git Bash `sha256sum`, en mayúsculas, contra la tabla extraída de "CLASES-b — Ronda 5, regresión final") los SHA-256 de todas las `*.ataque` de `git ls-files -co --exclude-standard`: **87 de 87 iguales**, sin faltantes ni sobrantes (`diff` vacío).
- **PA-01**, antes de cualquier prueba del backend: `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `Enabled True`, `Direction Inbound`, `Action Block`, `Profile Public`; `Get-NetConnectionProfile` → `Name IZZI-F281-5G`, `NetworkCategory Public` (declarada de confianza por el humano, `docs/ESTADO.md` §5). `docker ps -a`: los 4 contenedores de `infra/` (postgres, minio y livekit sanos; minio-init `Exited (0)`).

### Archivos tocados: tres, los de los C-n
1. `backend/test/sesiones-y-cadena.ataque.test.ts` (C-2).
2. `frontend/src/styles/clases-r1.ataque.test.ts` (C-12).
3. `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` (C-19, sumado por el orquestador a mitad de la ronda; hallazgo M-22 del manager).

- No toqué código de producción ni pruebas normales, y no creé archivos de pruebas.
- `git diff --quiet e9df1f0 -- shared backend/src frontend/src/app frontend/src/features frontend/src/components frontend/src/services frontend/src/lib ':(exclude,glob)**/*.ataque.test.*'` → código 0. Sin la exclusión, el comando del encargo da 1 solo porque `features/` contiene la `*.ataque` de C-19; `git diff --name-only e9df1f0 -- shared backend frontend` lista únicamente los tres archivos de arriba.
- Formato, solo esos tres, desde su paquete: `cd backend; npx prettier --write test/sesiones-y-cadena.ataque.test.ts`; `cd frontend; npx prettier --write src/styles/clases-r1.ataque.test.ts`; `cd frontend; npx prettier --write src/features/clases/inicio-sin-datos-r2.ataque.test.tsx`. Los tres: `(unchanged)`.

### Qué cambió y qué sigue protegiendo
- **C-2, `backend/test/sesiones-y-cadena.ataque.test.ts:481`** ("bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a, CLASES-b y CLASES-c: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros"):
  - A la lista exacta (45) se suman las 9 rutas de V-06 (c), con sus `HEAD`, y queda en 54:
    - `GET`, `HEAD` y `POST /api/clases/:claseId/publicaciones`;
    - `DELETE /api/clases/:claseId/publicaciones/:publicacionId`;
    - `GET`, `HEAD` y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios`;
    - `DELETE /api/clases/:claseId/publicaciones/:publicacionId/comentarios/:comentarioId`;
    - `DELETE /api/clases/:claseId/mis-comentarios/:comentarioId`.

    El orden es el de `sort()`, generado por programa a partir de la lista de hoy más las 9 (las 45 de hoy ya estaban en ese orden).
  - El título suma "CLASES-c", y un comentario nuevo explica por qué ninguna de esas rutas crea cuentas ni cambia roles, y por qué ninguna es pública.
  - **Sigue protegiendo lo mismo:** la igualdad es exacta y el análisis por sangría no cambia (una línea no reconocida sigue haciendo fallar la prueba); cualquier ruta de más o de menos pone la prueba en rojo; ninguna ruta crea administradores; siguen creando maestros solo las tres de hoy.
  - **`RUTAS_PUBLICAS`:** ninguna `*.ataque` la enumera; hoy tiene exactamente 10 (`middleware/rutas-publicas.ts`, que en c está en "No se toca" y lo cubre V-05). Una ruta pública nueva sería además una ruta nueva en esta lista exacta. No agregué aserciones.
- **C-12, `frontend/src/styles/clases-r1.ataque.test.ts:115`** ("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 35 enEspera"):
  - El total de `enEspera=` pasa de 29 a **35**.
  - **Lista fija:** suma los seis botones de §D-C5: `components/formulario-publicacion.tsx` 1, `muro-view.tsx` 1, `components/publicacion-del-muro.tsx` 1, `components/comentarios-de-publicacion.tsx` 2 y `components/formulario-comentario.tsx` 1.
  - **Patrón de la ronda 0 de b, sin cambios:** los archivos con 0 fijo siguen (`bloque-destacado`, `encabezado-clase`, `secciones-de-clase`, `tarjeta-clase` y `lista-personas`); el resto de `features/clases/components/` sigue sumando exactamente **3** (buscador, roster o sus filas), con `buscador-alumnos.tsx` ≤ 1 y `tabla-alumnos.tsx` entre 1 y 2; el resto de `features/admin/components/` sigue en 2. Como los archivos del muro están en la lista fija, no cuentan en ese resto. `con-clase-de-la-ruta.tsx` (§D-C5 bis) no está en la lista: un `enEspera=` ahí sería uno de más en el resto y pondría la prueba en rojo.
  - **Sigue protegiendo lo mismo:** ningún `disabled` en JSX; `aria-busy` y `aria-disabled` solo en `button.tsx`; el número y el lugar de los botones en espera cambian solo con el plan.
  - **Colas (parte de C-12): nada que reescribir.** Ninguna `*.ataque` enumera de forma cerrada las colas de pg-boss. `worker-r1`, `worker-r2` y `worker-03c-r1` usan colas propias con sufijo aleatorio (`ATAQUE_R1_…`, `ATAQUE_R2_…`, `ATAQUE_03C_…`) creadas con `asegurarCola`; `iniciarCola` recorre `OPCIONES_DE_COLAS`, así que las cuatro colas nuevas de §D-C3 (`AVISO_FALLIDO` primero) se crean sin contradecir nada. `ritmo-03c-r1` dobla `adapters/queue/index.js` y no toca `colas.ts` (y `workers/**` está en "No se toca"). `OPCIONES_DE_COLAS` y `describirCola` solo aparecen en el código de producción y en `cola.integracion.test.ts` (prueba normal). Las dos lecturas de `pgboss.job` (`cuentas-r1:365`, `invitacion-masiva-03c-r1:115`) filtran por id.
  - **`$queryRaw` (parte de C-12): nada que reescribir.** `arquitectura-cuentas-r1:69` cierra solo `$queryRawUnsafe` (exactamente 1, en `adapters/db/cliente.ts`) y `$executeRawUnsafe` (0): el `FOR SHARE` de `adapters/db/publicaciones.ts` es `$queryRaw` etiquetado y no cuenta. `alumnos-b-r1:1107` prohíbe `$queryRaw` solo en `adapters/db/inscripciones.ts`, que en c está en "No se toca". Las demás apariciones de `$queryRaw` en `*.ataque` son consultas de la propia prueba.
- **C-19, `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx:31`** (la fábrica de `vi.mock("./hooks")` que usan los dos casos "inicio del estudiante/maestro: sin error, sin carga y sin datos, no afirma vacío ni total", `:51`):
  - La fábrica suma `useFocoAlCargarMas: () => ({ current: null })`, un doble inerte con la forma del `botonRef` que devuelve el hook real. Ninguna aserción cambia.
  - **Por qué:** con §D-C5 y PR-C11a, `PanelMisClases` pasará a usar `useFocoAlCargarMas` de `./hooks`; con Vitest, leer un export que la fábrica no devuelve lanza un error, y los dos casos caerían sin ningún C-n.
  - **Sigue protegiendo lo mismo:** los inicios sin error, sin carga y sin datos no afirman vacío ni total.
  - **Búsqueda pedida:** `vi.mock("./hooks"`, `vi.mock("../hooks"`, y cualquier `vi.mock` o `vi.doMock` con "hooks" en las `*.ataque` de `frontend/src/`: solo aparece este archivo. Ninguna otra `*.ataque` dobla los hooks del módulo.
  - Lo había detectado por mi cuenta antes del mensaje del orquestador, como caso fuera del inventario sin C-n; con C-19 queda cubierto.

### C-18: confirmado (ninguna `*.ataque` lo contradice)
Busqué por programa (Node, sobre las 87 `*.ataque` de los dos paquetes; `shared/` no tiene `*.ataque`), línea por línea:
- `U+200B`, `U+2060`, `U+FEFF` y `\bCf\b`;
- los escapes `\u200B`, `\u{200b}`, `0x200b`, `\u2060`, `\u{2060}`, `0x2060`, `\uFEFF`, `\u{feff}` y `0xfeff`, y los literales U+200B, U+2060 y U+FEFF;
- `nombreClaseSchema`, `textoLargoSchema` y `descripcionClaseSchema` (**0 apariciones** de los tres);
- otros `Cf` (U+00AD, U+180E, U+2061 a U+2064, U+200C a U+200F, etiquetas U+E0020 a U+E007F), rellenos Hangul (U+3164, U+115F, U+1160, U+FFA0), Braille en blanco (U+2800) y U+1F44D (**0**).

Todo lo que apareció es de otro dominio, como anticipaba el inventario: el término de búsqueda (`alumnos-b-r2:118-122`, `alumnos-b-r3:112-113`, frontend `alumnos-b-r2:323`); los nombres de persona (`cuentas-03a-r1:687-691`, `auth-registro:256`, `invitacion-r1:243-245`, `nombres-tokens-r2:93-96`); el código de invitación (`codigo-r1:16-17`, `codigo-r2:11-12`); los enlaces del pie (`pie-r2`, `pie-r3`). `backend/test/clases-r2.ataque.test.ts:146-156` acepta una **descripción** con U+200D dentro de un emoji: no lo contradice (la descripción no cambia y U+200D se sigue admitiendo). `frontend/src/features/clases/clases-r2.ataque.test.tsx:89` pinta 60 emojis con datos dobles, sin pasar por el esquema.

Además revisé todos los nombres de clase que una `*.ataque` manda por la API o por el formulario (`POST /api/clases`, `PUT /api/clases/:id` y "Nombre de la clase"): todos tienen al menos 2 caracteres visibles (el más corto es `"x x"` en `backend/test/clases-r1.ataque.test.ts:195`). Los que se crean con `crearClaseDePrueba` o con `crearClase` del adaptador no pasan por el esquema.

### Rojos esperados (2) y caso reescrito en verde (1)
| # | Archivo:línea | Título | C-n | Estado en mi corrida |
|---|---|---|---|---|
| 1 | `backend/test/sesiones-y-cadena.ataque.test.ts:481` | "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a, CLASES-b y CLASES-c: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros" | C-2 | **Rojo comprobado** en las dos corridas: `expected [ …(45) ] to deeply equal [ …(54) ]` (`:507`). Faltan exactamente las 9 rutas de c y no sobra ninguna |
| 2 | `frontend/src/styles/clases-r1.ataque.test.ts:115` | "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 35 enEspera" | C-12 | **Rojo comprobado** en las dos corridas: `expected [ …(29) ] to have a length of 35 but got 29` (`:122`) |
| — | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx:31` (fábrica) y `:51` (los 2 casos) | "inicio del estudiante: …" e "inicio del maestro: sin error, sin carga y sin datos, no afirma vacío ni total" | C-19 | **Verde antes y después** de la reescritura (el panel aún no llama al hook): `npx vitest run src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` → `Tests  2 passed (2)`; en verde en la suite completa |

### Casos fuera del inventario
Ninguno sin C-n. El único que encontré (la fábrica cerrada de `inicio-sin-datos-r2`) quedó cubierto por C-19. Revisé, sin otra contradicción:
- **Pruebas estáticas** (`styles/clases-r1`, `components/layout/estatico-r1`, `features/clases/estatico-r1`, `styles/tokens-r1`, `components/ui/badge-03b-r1`, `features/admin/cuentas-r1`, `maestros-03b-r1`, `clases-r4` y `fondo-r1` del frontend; `arquitectura-cuentas-r1` y `alumnos-b-r1:1099` del backend): ninguna cuenta ni lista nada que c cambie, salvo el `enEspera=` de C-12. `tokens-r1` solo lee §3 y §4 de `DESIGN.md`; c edita §7.
- **Tablas, secuencias, migraciones, modelos y enums:** busqué `information_schema`, `pg_tables`, `pg_class`, `pg_type`, `pg_enum`, `pg_sequences`, `_prisma_migrations`, `migrations`, `dmmf`, `ModelName` y `schema.prisma`: 0 apariciones. Las `FK ON DELETE RESTRICT` de `publicaciones.autor_id` y `comentarios.autor_id` no afectan a las `*.ataque` existentes: ninguna crea publicaciones ni comentarios.
- **Rutas del SPA y el muro provisional:** el router no cambia en c. `clases-r1` y `clases-r2` del frontend montan `<p>muro</p>` en el índice. `clases-r3.ataque.test.tsx` monta `MuroView` en `/maestro/clases/:claseId` y solo afirma "a lo sumo una acción principal": el muro de c trae una sola ("Publicar anuncio") y `ClaseLayout` no tiene ninguna, así que no se contradice.
- **§D-C5 bis:** ninguna `*.ataque` importa `focoPerdido`, `ConClaseDeLaRuta` ni `FilaCandidato`, ni dobla `useAgregarAlumno`. Los dobles de `sonner` que hoy reciben el aviso neutro (C-17) ya son invocables; mover los avisos al hook no cambia cuántas veces salen.

**Notas para el programador (sin C-n; no son hallazgos, son restricciones que ya existen):**
1. `components/layout/estatico-r1.ataque.test.ts` prohíbe la palabra `Ocultar` en cualquier `.tsx` (V-17): "Ocultar comentarios" (§D-C6) tiene que vivir en `features/clases/data.ts`, como manda `CLAUDE.md`, y ningún identificador de un `.tsx` puede contener `Ocultar` con mayúscula.
2. `styles/clases-r1.ataque.test.ts`, V-07: la clase `vidrio` solo puede estar en `card.tsx` y en tres archivos del marco. El "panel de vidrio" de `PublicacionDelMuro` tiene que salir de `Card` (como dice §D-C5), no de un `className="vidrio"`.
3. `styles/clases-r1.ataque.test.ts`, V-13: ningún archivo de `features/` puede ganar `text-danger` o `text-destructive`; los errores de campo de c van con `ErrorDeCampo`.

### Intermitencia (CHORE-02)
- **Corrida 1:** `Test Files  11 failed | 93 passed (104)` · `Tests  11 failed | 1106 passed | 27 skipped (1144)`. Aparte del rojo esperado de C-2, todo cayó por tiempo límite de la espera en cadena: los hooks de `alumnos-b-r1` (`:141`, `:156`), `clases-autorizacion.integracion` (`:289`, y PR-A15h) y `worker-03c-r1` (`:82`); `bloqueo-usuario` A1; dos casos de paginación de `clases-r1`; los dos de `cuentas-r1` (el del `LOCK TABLE` y el del 429); el de `cuentas-r3` (40 s); dos de `restablecer.integracion`; y el ritmo de `worker-correo-de-cuenta` ("esperarHasta agotó el tiempo límite"). `api-real` cayó con `TypeError: Cannot read properties of undefined (reading 'split')` en `:227`: es consecuencia de la misma espera (el archivo tardó 43 s y el token del login no llegó), no una aserción; pasa en la corrida 2. Ningún rojo por aserción fuera de C-2.
- **Corrida 2** (repetida una vez desde `backend/`): limpia salvo el rojo esperado de C-2.

### PA-07
Conteo con `grep -c` sobre la salida completa de `npm test` del backend (comando: `cd backend; npm test > back-test-N.txt 2>&1`, en el scratchpad):

| Corrida | 40P01 | deadlock detected | could not serialize | P2028 | too many clients |
|---|---|---|---|---|---|
| 1 (CHORE-02) | 0 | 0 | 0 | 4 líneas: 2 de log (`"code":"P2028"`) y 2 del título y el extracto del caso de `cuentas-r3` en el resumen de fallos | 0 |
| 2 | 0 | 0 | 0 | 2 (las dos de log) | 0 |

En las dos corridas, los dos `P2028` de log son los aceptados de `cuentas-r3`, del mismo proceso:
1. `tx.sesion.create()` en `adapters/db/sesiones.ts:39`, desde `handlers/auth/index.ts:134` (`POST /api/auth/login`): 39948 ms en la corrida 1 y 6397 ms en la 2.
2. `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116`, desde `handlers/auth/cuentas.ts:106` (`POST /api/auth/restablecer`): 6066 ms en la corrida 1 y 6067 ms en la 2.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (rama, base y árbol de los paquetes en orden; V-01 87/87).
- **PA-06:** no se activó. En las corridas limpias falla un solo caso por paquete y es el esperado; los dos rojos esperados están en rojo.
- **PA-07:** no se activó (solo los dos `P2028` aceptados).
- **PA-11:** no se activó. 120 s después de terminar la corrida 2 (18:19:25 → 18:21:44), `docker ps -a` solo muestra los 4 contenedores de `infra/`; tras la corrida 1 tampoco quedaba ninguno de Testcontainers.
- **PA-15 y PA-16:** no se activaron (no edité producción; solo `*.ataque` existentes de los C-n).

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `git log -1 --oneline` | `e9df1f0 Clases parte B` | base correcta |
| `git diff --quiet e9df1f0 -- shared backend frontend` (al empezar) | (sin salida) | código 0 |
| V-01: `sha256sum` de las `*.ataque` contra la tabla de la ronda 5 de b, con `diff` | `V01-OK` (87 y 87) | coincide |
| `Get-NetFirewallRule …` / `Get-NetConnectionProfile` | `Profile : Public` / `Name : IZZI-F281-5G` | en orden |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` (después de C-19) | `> tsc -b` | código 0 |
| `cd frontend; npm test` (antes de C-19) | `Tests  1 failed \| 1200 passed (1201)` | solo C-12 |
| `cd frontend; npm test` (después de C-19) | `Test Files  1 failed \| 85 passed (86)` · `Tests  1 failed \| 1200 passed (1201)` · `Duration 43.71s` | solo C-12 |
| `cd frontend; npx vitest run src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` | `Tests  2 passed (2)` | C-19 en verde |
| `cd backend; npm test` (corrida 1) | `Tests  11 failed \| 1106 passed \| 27 skipped (1144)` · `Duration 79.29s` | CHORE-02 + C-2 |
| `cd backend; npm test` (corrida 2) | `Test Files  1 failed \| 103 passed (104)` · `Tests  1 failed \| 1143 passed (1144)` · `Duration 45.02s` | solo C-2 |
| `git diff --quiet e9df1f0 -- shared backend/src frontend/src/{app,features,components,services,lib} ':(exclude,glob)**/*.ataque.test.*'` | (sin salida) | código 0 |

El número de pruebas no cambia: frontend 86 archivos y 1201 pruebas; backend 104 archivos y 1144 pruebas, los mismos del cierre de b.

### Tabla de SHA-256 de todas las `*.ataque` después de la ronda 0 de CLASES-c (87; cambian 3, marcadas). Base de V-01 para el programador de c y para la ronda 1
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `0F60A72D6DC2021CC5ABC97FD129AC24EB3E1889304F59FCF9C63D7294840E85` | `backend/test/sesiones-y-cadena.ataque.test.ts` **(cambia, C-2; antes `5B82305E…`)** |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` **(cambia, C-19; antes `BAB2B018…`)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `6D533653FF448718D6E2557B5D8B718C09F3B5A4C88703D584B566B88D04F97B` | `frontend/src/styles/clases-r1.ataque.test.ts` **(cambia, C-12; antes `A2063111…`)** |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-c — Ronda 1
Veredicto: **ROTO**. 5 hallazgos: 0 críticos, 0 altos, 2 medios (T-29 y T-30) y 3 bajos (T-31, T-32 y T-33).
Verificación propia: lint del backend con código 0 · lint del frontend con código 0 · test del backend `Tests  4 failed | 1206 passed (1210)` (corrida 4, limpia; la corrida 3 cayó por CHORE-02) · test del frontend `Tests  6 failed | 1248 passed (1254)`. Los 10 rojos son exactamente los casos nuevos de esta ronda que demuestran T-29 a T-33; ninguna `*.ataque` vigente ni prueba normal cae.

Base `<Cb>` = `e9df1f0`. Rama `feat/clases`. Fecha: 2026-10-01. La sesión se cortó a las 20:20 por el límite de uso y se reanudó a las 20:37. Las suites completas y el lint ya habían corrido sobre la versión final de los 4 archivos nuevos: sus SHA-256 de la tabla final son los mismos que al correr las suites (comprobado por programa al reanudar), así que no las repetí.

### Precondiciones
- **Rama y base:** `feat/clases`; `git log -1 --oneline` → `e9df1f0 Clases parte B`. El árbol tiene la implementación de c sin commit y cambios de documentación, como se esperaba.
- **V-01:** `sha256sum` de todas las `*.ataque` de `git ls-files -co --exclude-standard`, en mayúsculas, contra las 87 filas de la tabla de "CLASES-c — Ronda 0", comparadas con `diff`: **87 de 87 iguales** (`V01-OK`). Repetido al final: las 87 siguen iguales y solo se suman mis 4 archivos.
- **PA-01**, antes de cualquier prueba del backend: `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `Enabled True`, `Inbound`, `Block`, `Public`; `Get-NetConnectionProfile` → `IZZI-F281-5G`, `Public` (de confianza, `ESTADO.md` §5). Docker Desktop encendido; `docker ps -a`: solo los 4 contenedores de `infra/`.
- No toqué código de producción, pruebas normales ni `*.ataque` existentes; no arranqué la API de desarrollo, el worker ni Vite (la API de `logs-muro-c-r1` es un proceso hijo de la propia prueba, igual que en `logs-03c-r1`); no abrí navegadores; no leí `.env`.

### Regresión primero
- **Antes de escribir nada**, las suites completas con las 87 `*.ataque`:
  - backend corrida 1: `Tests  10 failed | 1172 passed (1182)`, todo por la espera en cadena de CHORE-02 (tiempos límite de 15, 22, 30 y 40 s en los casos de siempre: `clases-autorizacion` PR-A15h, `alumnos` PR-B02d y PR-B02e, `bloqueo-usuario` A1, `cuentas-03a-r1`, `cuentas-r1`, `cuentas-r3` y el ritmo del worker); corrida 2: `Test Files  107 passed (107)` · `Tests  1182 passed (1182)`, código 0;
  - frontend: `Test Files  90 passed (90)` · `Tests  1230 passed (1230)`, código 0.
- **C-2, C-12 y C-19 pasan por la razón correcta** (`--reporter=verbose`):
  - C-2 (`backend/test/sesiones-y-cadena.ataque.test.ts`, "bajo /api solo existen las rutas de … CLASES-c …"): en verde; compara por igualdad exacta `printRoutes` con las 54 rutas, así que están las 9 de c y no sobra ninguna;
  - C-12 (`frontend/src/styles/clases-r1.ataque.test.ts`, "V-06: … 35 enEspera"): en verde; mi conteo propio de `enEspera=` en los `.tsx` de producción de `frontend/src` también da 35;
  - C-19 (`inicio-sin-datos-r2`, los dos casos): en verde, y `PanelMisClases` ahora sí llama a `useFocoAlCargarMas` (el doble inerte de la fábrica es el que se usa).

### Hallazgos

#### T-29 — Un cursor borrado entre dos páginas devuelve una página vacía y oculta el resto del muro o de los comentarios
Severidad: media
Prueba: `backend/test/muro-c-r1.ataque.test.ts`, casos "publicaciones: el cursor de una publicación borrada entre dos páginas no oculta en silencio el resto del muro" y "comentarios: el cursor de un comentario borrado entre dos páginas no oculta en silencio el resto".
- **Reproducción:** tres publicaciones; el alumno pide `?limite=1` y recibe la más reciente con `siguienteCursor` igual a su id; el maestro la borra; el alumno pide `?limite=1&cursor=<id borrado>`. Igual con tres comentarios.
- **Esperado:** no ocultar en silencio las 2 que siguen. §D-A4, "Principio común": el cursor se rechaza con `400 VALIDACION` "cursor: no es válido" cuando ya no se puede reconstruir la clave de orden, que es lo que pasa con `publicaciones.creado_en` y `comentarios.creado_en` al borrar la fila. Es el T-18 de a.
- **Obtenido:** `200 {"publicaciones":[],"siguienteCursor":null}` y `200 {"comentarios":[],"siguienteCursor":null}`. En la interfaz, "Ver más publicaciones" (o "Ver más comentarios") desaparece y lo más viejo no se ve hasta recargar.
- **Causa:** `listarPublicaciones` y `listarComentarios` (`adapters/db/publicaciones.ts:107` y `:161`) pasan el cursor a Prisma sin leer antes su fila; Prisma devuelve una lista vacía si la fila del cursor no existe.
- **Subpunto sin defecto:** el id de una publicación de otra clase, o de un comentario de otra publicación, como cursor responde **idéntico** a un UUID inexistente (los dos casos "…responde igual que un UUID inexistente" están en verde): la subconsulta del cursor de Prisma aplica el mismo `where` de la clase o de la publicación. No hay oráculo de existencia ni posición por una fila ajena; solo queda la página vacía de arriba.
- **Requisito o regla:** §D-A4 (principio común y T-18); N-C6 del manager; RF-12. El plan no lo pide expresamente para c: lo arbitra el manager (N-C6).

#### T-30 — Los avisos de crear un comentario o una publicación se pierden si el formulario se desmonta con el POST en vuelo (N-C5 confirmado), también el de error
Severidad: media
Prueba: `frontend/src/features/clases/muro-c-r1.ataque.test.tsx`, casos "comentario con error: si la persona pulsa «Ocultar comentarios» con el POST en vuelo, el aviso sale igual (una vez)", "comentario con éxito: …", "publicación con error: si la persona sale del muro con el POST en vuelo, el aviso sale igual (una vez)" y "publicación con éxito: …".
- **Reproducción:** comentario: abrir "Ver comentarios", escribir, "Comentar" (el botón queda con `aria-busy`), pulsar "Ocultar comentarios" y que el servidor responda. Publicación: escribir el anuncio, "Publicar anuncio" y salir del muro (se desmonta la vista; la caché y la mutación siguen vivas) antes de la respuesta.
- **Esperado:** una vez "Comentario publicado" o "Publicado" con éxito y, con un 500, "Algo salió mal. Inténtalo de nuevo.".
- **Obtenido:** ningún aviso en los cuatro casos. Con error, la persona no se entera de que su comentario o su anuncio no se guardó, y el texto que escribió ya no está.
- **Causa:** `components/formulario-comentario.tsx:41-52` y `components/formulario-publicacion.tsx:48-61` avisan en los callbacks de `mutate`, que TanStack Query no llama si el componente ya se desmontó; `useComentar` y `useCrearPublicacion` (`hooks.ts`) solo invalidan. Es la misma clase de defecto que §D-C5 bis corrigió en "Agregar a la clase", y que el programador ya evitó en los borrados (que avisan una sola vez; ver "Atacado sin hallazgos").
- **Requisito o regla:** `CLAUDE.md`, "Manejo de errores en el frontend" (manejadores asíncronos: toast en caso de error); §D-C5 bis, punto 1 (el criterio); N-C5 del manager.

#### T-31 — El formulario rechaza textos que el servidor acepta: mide el máximo antes de recortar
Severidad: baja
Prueba: `frontend/src/features/clases/muro-c-r1.ataque.test.tsx`, casos "un comentario de 1,000 caracteres seguido de un salto de línea se envía: el servidor lo recorta y lo acepta" y "un anuncio de 5,000 caracteres entre saltos de línea se envía: el servidor lo recorta y lo acepta".
- **Esperado:** el formulario envía lo que el servidor acepta. El servidor aplica `normalizarTextoLargo` (recorta los extremos) **antes** de validar (§D-C4): 1,000 caracteres más un salto final son 1,000. `backend/test/muro-c-r1.ataque.test.ts` ("máximos…", subcaso "anuncio 5000 entre CRLF") confirma `201` para el anuncio equivalente.
- **Obtenido:** `ErrorDeCampo` "No puede tener más de 1000 caracteres" (y "…5000…" en el anuncio), sin ninguna petición: `FormularioComentario` y `FormularioPublicacion` pasan el texto crudo a `safeParse`, sin la normalización del servidor.
- **Requisito o regla:** §D-C4 ("el frontend valida con los mismos esquemas antes de enviar"); punto 4 del manager ("el mismo mensaje en el formulario y en el `400`"). Mismo tipo que T-20 y T-24 de b (bajas).

#### T-32 — Los máximos cuentan puntos de código, no unidades de UTF-16 como dice §D-C4
Severidad: baja
Prueba: `backend/test/muro-c-r1.ataque.test.ts`, caso "máximos en unidades de UTF-16, contados después de normalizar: 5,000/5,001; 200/201; 1,000/1,001 (con emojis de 2 unidades)".
- **Esperado (§D-C4):** "Los máximos no cambian: siguen contando como hoy (`max` de zod, en unidades de UTF-16)". 2,500 emojis U+1F44D más una "a" son 5,001 unidades → `400`; 500 emojis más una "c" son 1,001 → `400`.
- **Obtenido:** `201` en los dos. Los 10 subcasos ASCII del mismo caso (5,000/5,001; 200/201; 1,000/1,001; descripción del material 5,000/5,001; 5,000 entre CRLF) dan lo esperado.
- **Causa:** zod 4.6.5 (`node_modules/zod/v4/core/checks.js:265`, `$ZodCheckMaxLength`) mide las cadenas en puntos de código cuando pasan del máximo en unidades. No es un defecto del código de c: la suposición del plan no se cumple con la versión instalada. Afecta igual a todos los `max` de cadenas (nombre 120 y descripción 2,000 de a). Frontend y backend usan el mismo esquema, así que no se desvían entre sí; un texto puede guardar hasta el doble de unidades del máximo.
- **Requisito o regla:** §D-C4, "Los máximos no cambian"; punto 4 del manager. Lo decide el manager: corregir el texto del plan o el esquema.

#### T-33 — Mensajes de zod en inglés para `tipo` y para la descripción del material
Severidad: baja
Prueba: `backend/test/muro-c-r1.ataque.test.ts`, caso "campos ausentes o que no son texto responden en español (N-C3 y punto 4 del manager), también el tipo y la descripción del material".
- **Esperado:** todo `400 VALIDACION` del muro con mensaje en español (N-C3 lo resolvió para los cuatro textos obligatorios).
- **Obtenido:** 4 de 10 casos en inglés:
  - sin `tipo`, o con `tipo: "tarea"` → "tipo: Invalid discriminator value. Expected 'anuncio' | 'material'";
  - material con `texto: 5` → "texto: Invalid input: expected string, received number"; con `texto: null` → "…received null".

  Los otros 6 (anuncio sin texto o con número, material sin título o con título nulo, comentario sin texto o con un arreglo) responden en español.
- **Alcance:** solo por la API; la interfaz siempre manda `tipo` y una cadena.
- **Requisito o regla:** punto 4 del manager ("el campo ausente o que no es texto, con mensaje en español"); `DESIGN.md` §9. Es el mismo patrón que `descripcionClaseSchema` de a (`z.string()` sin `error`), que no se reportó entonces.

### Atacado sin hallazgos

**Por punto del plan ("Puntos de ataque para el Tester" → CLASES-c):**
1. **Alcance de las consultas** (`backend/test/muro-c-r1.ataque.test.ts`, "con el claseId propio y la publicación o el comentario de OTRA clase del mismo maestro…"): el maestro es dueño de las dos clases y la alumna está inscrita en las dos, así que el sexto paso deja pasar ambos `claseId` y solo el filtro por clase del adaptador separa los datos. Las 7 respuestas son `404` con el código correcto (borrar la publicación, listar y crear comentarios como alumna y como maestro, borrar el comentario con la publicación propia y con la ajena, "mis comentarios" de la otra clase); nada se borra, no se crea ningún comentario ni trabajo, y el muro propio no trae la publicación ajena. Además, un comentario de otra publicación de la misma clase (`404 COMENTARIO_NO_ENCONTRADO`, sigue) y "mis comentarios" con el comentario del maestro, de otro alumno, o del alumno pedido por el maestro (`404` los tres, siguen).
2. **Concurrencia** (tres casos de "concurrencia comentar y borrar (orden inverso a PR-C04d)"):
   - orden inverso: con el adaptador real `crearComentario` y un `alGuardar` que se detiene después del `FOR SHARE` y del `INSERT`, el `DELETE` de la publicación queda esperando (`pg_stat_activity`, `wait_event_type = 'Lock'`); al soltar, el comentario se crea, el borrado responde `204` y el comentario cae en cascada; sin `500` ni huérfano;
   - borrar un comentario y su publicación a la vez (los dos formados detrás de un `FOR UPDATE` de la prueba sobre el comentario, por `pg_blocking_pids`): publicación `204`, comentario `204` o `404`, y no queda nada;
   - dos `DELETE …/mis-comentarios/:id` formados detrás de la misma fila: exactamente `[204, 404]`, el `404` con `COMENTARIO_NO_ENCONTRADO`.
   - Ningún `P2028` ni `40P01` en ninguna corrida (ver PA-07).
3. **Cola** ("cola transaccional (§D-C3, PA-05)"): un `encolar` real que lanza (cola inexistente) revierte la publicación y el comentario; un id repetido en cada una de las tres colas deja un solo trabajo; cada trabajo creado por la API tiene `id` = id del dato, `retry_limit` 3, `retry_backoff`, `dead_letter` `AVISO_FALLIDO`, 604,800 s de retención y datos **exactamente** iguales a los ids (sin el texto ni el correo); el anuncio y el material no cruzan de cola; borrar una publicación, un comentario del maestro y uno propio no deja ningún trabajo que mencione esos ids; solo `core/eventos/avisos-de-clase.ts`, `adapters/queue/colas.ts` y `handlers/clases/muro.ts` nombran las colas (ningún `workers/`, ningún consumidor).
4. **Texto:** XSS (frontend, "HTML en el título, el texto, el comentario y el nombre del autor se muestra como texto…": `<img onerror>`, `<script>`, `<iframe src=javascript:>`, `<svg onload>`, `<b>` y `<a href=javascript:>` quedan como texto, sin nodos `img`, `script`, `iframe`, `svg`, `b` ni `a`); control y bidi en el anuncio, el título, la descripción y el comentario (U+0007, U+0000, U+001B, U+007F, U+0085, U+202A, U+202E, U+2066 y U+2069 → `400` "El texto tiene caracteres no permitidos"; `\t` y `\n` se aceptan); 5,000/5,001 en ASCII correctos; `\r` y CRLF normalizados antes de validar y guardados como LF y recortados. La parte de UTF-16 es T-32.
5. **Interfaz:** doble clic humano (30 ms) en "Publicar anuncio", "Comentar", "Sí, borrar comentario" y "Sí, borrar": una sola petición cada uno y un solo aviso de cada borrado; confirmaciones en línea con el foco en "Cancelar" y de vuelta en "Borrar publicación" o "Borrar" al cancelar; foco de "Ver más publicaciones" y "Ver más comentarios" (ver punto 6 del manager). Que los comentarios se pidan solo al abrirse lo cubre PR-C10c y no lo repetí.
6. **Contenido visible:** 15 cadenas solo de invisibles (U+00AD, U+180E, U+2061 a U+2064, etiquetas U+E0041/U+E0042/U+E007F, U+3164, U+115F/U+1160, U+FFA0, U+2800, U+1D159, marcas U+0301/U+0302, U+034F, U+FE0F/U+E0100, espacios U+3000/U+00A0/U+2003/U+205F, U+200E/U+200F, U+1D173/U+1BCA0) → `400` con el mensaje del campo vacío en el anuncio, el título y el comentario, sin escribir; las mismas duplicadas, y nombres con un solo visible ("a" con U+1D159, U+2800, U+3164, marcas o U+200B; U+1F44D; U+2764 U+FE0F; "#" U+FE0F U+20E3) → `400` "nombre: El nombre debe tener al menos 2 caracteres" en `POST` y `PUT`, sin cambiar la clase; 11 textos válidos (ZWJ, tono de piel, bandera regional y de Escocia, teclas, hebreo con U+200F, árabe, persa con U+200C, devanagari, CJK y hangul) → `201` en el nombre, el título, el anuncio y el comentario; el formulario muestra el mismo mensaje que el servidor para una cadena de invisibles y no llama a la API; ninguna copia de la regla en el código de `backend/src` ni `frontend/src` (`Default_Ignorable_Code_Point`, U+2800, U+1D159, `CARACTER_VISIBLE`, una definición de `contarCaracteresVisibles`).
7. **Heredado de b:** "Agregar a la clase" con la fila desmontada y un 500: el error sale una sola vez (los casos de éxito y neutro con la fila desmontada los cubre PR-C13a, en verde); las cinco vistas con `ConClaseDeLaRuta` (`ClaseLayout`, `EditarClaseView`, `PersonasView`, `AlumnosView` y `MuroView`) sin `:claseId` muestran "No tienes acceso a esta clase." y no llaman a `fetch`; el foco de §7.14 en el buscador y el roster sigue igual tras mover `focoPerdido` (las `*.ataque` de b, de `alumnos-b-r1` a `-r5`, siguen en verde).

**Por punto del manager ("Lista de puntos de ataque para la ronda 1 del tester (CLASES-c)"):**
1. Cursor: T-29. Sin oráculo: el cursor ajeno y el inexistente responden idéntico (dos casos en verde).
2. Concurrencia: sin hallazgos (punto 2 del plan). Anotado para NOTIFICACIONES: en el orden inverso, el trabajo `COMENTARIO_CREADO` queda apuntando a un comentario ya borrado en cascada (el caso lo afirma: 1 trabajo, 0 comentarios).
3. Cola transaccional: sin hallazgos (punto 3 del plan).
4. Regla de contenido visible: la regla resiste (punto 6 del plan). T-31, T-32 y T-33 son los bordes que fallan. No reporto lo que §D-C4 declara residual.
5. Triviales heredados de b: sin hallazgos (punto 7 del plan).
6. Foco de los tres "Ver más": sin hallazgos.
   - "Ver más publicaciones" con más páginas pendientes sigue montado y el foco no se mueve (render sin desmontaje);
   - si la página siguiente del muro o de los comentarios falla, el foco va al encabezado "Publicaciones" o "Comentarios" (nunca a `<body>`);
   - con la última página de comentarios vacía, el foco va al encabezado "Comentarios";
   - el foco tras borrar un comentario de la segunda de dos publicaciones abiertas queda en el "Borrar" del vecino de esa misma publicación, también cuando la lista del muro y la de comentarios llegan en el mismo turno (con una compuerta en las lecturas). Nunca salta a la otra publicación;
   - "Ver más clases" con `a[href]`: lo cubren PR-C11a y C-19, en verde; no agregué caso.
7. Avisos perdidos al crear: **T-30**. Los avisos de borrar (en los hooks) salen una sola vez (caso de doble clic).
8. Alcance y fugas: sin hallazgos. Recorrido recursivo de las 9 respuestas del muro (crear publicación, crear dos comentarios, el muro visto por la alumna deudora, por su compañero y por el maestro, y los comentarios vistos por los tres): ninguna clave `estadoPago`, `accesoRestringido`, `email`, `correo`, `correoEnmascarado`, `rol`, `motivoRestriccion` ni `hashContrasena`, y ni el correo de la alumna ni el del maestro ni "deudor" en el cuerpo. `propio` correcto para la autora, el compañero y el maestro, y `true` en la respuesta del `POST`.
9. Texto como texto: sin hallazgos (punto 4 del plan; el `\n` llega al nodo del texto). Doble envío y confirmaciones: punto 5 del plan.
10. PA-10 en logs: sin hallazgos (`backend/test/logs-muro-c-r1.ataque.test.ts`). La API real con `LOG_LEVEL=trace` recibe las 7 rutas (8 peticiones, incluida una publicación inválida con U+200B y U+202E) con JWT y cookie de una maestra y una alumna. En el log no están los dos JWT, las dos cookies, la contraseña, los dos correos, las palabras `authorization` ni `cookie`, ni los textos del anuncio, del título ni del comentario. El log está completo (centinela con cierre y ninguna petición sin "request completed").
11. Rol por el prefijo de la ruta: sin hallazgos. `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx`: un estudiante en `/maestro/clases/:claseId` termina en `/estudiante` sin ver "Publicar anuncio" ni el grupo "Tipo de publicación" y sin pedir el muro; el caso de control del maestro sí ve el formulario. En el backend, un estudiante inscrito recibe `403 ROL_NO_PERMITIDO` al publicar, al borrar una publicación y al borrar el comentario de otro por la ruta del maestro, sin escribir.

### No atacado y por qué
- **`whitespace-pre-line` y `max-w-prose`:** son clases de estilo; las pruebas de ataque no localizan ni afirman por clases y jsdom no aplica el CSS de Tailwind. Verifiqué que el salto de línea llega al nodo del texto; que se vea es de la comprobación humana (H-x de d).
- **360 px y el aspecto del muro:** exigen un navegador; no se abre ninguno. Quedan para la comprobación humana del final de d.
- **Que los comentarios se pidan solo al abrirse:** lo cubre PR-C10c (en verde); no lo dupliqué.
- **"Ver más clases":** cubierto por PR-C11a y C-19 (en verde); no agregué caso propio.
- **Correos y notificaciones:** c no tiene consumidor ni `notifier` (comprobado de forma estática en el punto 3).

### Observaciones que no son hallazgo
1. **Trabajos que apuntan a datos ya borrados:** en el orden inverso de la concurrencia, y al borrar una publicación con avisos pendientes (`PUBLICACION_CREADA`, `MATERIAL_CREADO` o `COMENTARIO_CREADO` de sus comentarios), los trabajos siguen en la cola sin su fila. NOTIFICACIONES tendrá que tolerar ids que ya no existen.
2. **Un comentario nuevo no se ve si la lista tiene más páginas sin cargar:** el orden es ascendente y la invalidación solo vuelve a pedir las páginas ya cargadas, así que con más de 20 comentarios el propio queda al final, detrás de "Ver más comentarios", aunque el aviso diga "Comentario publicado". Es consecuencia del diseño de §D-C5; no lo pide el plan.
3. **Un fallo de "Ver más publicaciones" sustituye toda la lista por `MensajeError`:** es el mismo patrón aceptado en b (T-27). El foco va al encabezado "Publicaciones".
4. **`backend/test/muro.integracion.test.ts:98`** (prueba normal del programador) no compila si se revisa con tipos (`Type 'unknown' is not assignable to type 'InjectPayload | undefined'`). El `typecheck` del paquete solo incluye `src/` y Vitest no revisa tipos, así que no rompe `lint` ni `test`. Mis dos archivos del backend compilan sin errores con un `tsconfig` temporal del scratchpad que los incluye.
5. **`shared/src/clases.ts:47`** (`INVERSORES_DE_DIRECCION`, de a, sin cambio en c) contiene U+202A, U+202E, U+2066 y U+2069 como caracteres reales dentro de la expresión, no como escapes. No es código de c ni una prueba; lo anoto para quien unifique la regla con `shared/src/auth.ts`.
6. **Zod 4.6.5** también mide los `min` en puntos de código: el `min(2)` de `nombreClaseSchema` ya rechazaba U+1F44D antes del `refine` de visibles. No cambia ningún resultado.

### Intermitencia (CHORE-02)
- **Corrida 1** (solo las 87, antes de mis archivos): `Tests  10 failed | 1172 passed (1182)`, todo por tiempo límite de la espera en cadena (ver "Regresión primero"). Corrida 2: limpia.
- **Corrida 3** (con mis archivos): `Test Files  9 failed | 100 passed (109)` · `Tests  13 failed | 1170 passed | 27 skipped (1210)`. Los 4 rojos de T-29, T-32 y T-33, más caídas por tiempo de la espera en cadena: los dos hooks de `alumnos-b-r1` (`:141`, `:156`, 10 s), el hook y `esperarHasta` del ritmo de `worker-correo-de-cuenta`, `bloqueo-usuario` A1 (30 s), dos de `auth-login.ataque` (429 y contraseña de más de 128, 15 s), dos de paginación de `clases-r1` (15 s), dos de `cuentas-r1` (15 s) y el de 40 s de `cuentas-r3`; `api-real` cae con el `TypeError` de `:227` (su login no respondió a tiempo, igual que en la ronda 0). Ningún rojo por aserción fuera de los míos.
- **Corrida 4** (repetida una vez desde `backend/`): `Test Files  1 failed | 108 passed (109)` · `Tests  4 failed | 1206 passed (1210)`. Solo los 4 rojos de esta ronda.
- **PA-12:** mis archivos corrieron 3 veces aislados en cada paquete (backend 28 casos, frontend 24) más las corridas completas, siempre con los mismos rojos y verdes. No son intermitentes.

### PA-07
Conteo sobre la salida completa de `cd backend; npm test > back-test-N.txt 2>&1` (scratchpad), por término; los `P2028` se cuentan por línea de log (`"code":"P2028"`), con el arbitraje del manager.

| Corrida | 40P01 | deadlock detected | could not serialize | too many clients | P2028 (líneas de log) | Sitio de cada `P2028` |
|---|---|---|---|---|---|---|
| 1 (CHORE-02, sin mis archivos) | 0 | 0 | 0 | 0 | 2 (`grep -c` da 4: suma el título y el extracto del caso de `cuentas-r3` en el resumen de fallos) | `tx.sesion.create()` en `adapters/db/sesiones.ts:39` (login) y `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116` (restablecer) |
| 2 (limpia) | 0 | 0 | 0 | 0 | 2 | los mismos dos |
| 3 (CHORE-02, con mis archivos) | 0 | 0 | 0 | 0 | 2 (`grep -c` da 4 por la misma razón) | los mismos dos |
| 4 (limpia, con mis archivos) | 0 | 0 | 0 | 0 | 2 | los mismos dos |

Ningún `P2028` en una ruta de c (ni en `crearComentario` con su `FOR SHARE`, ni en mis casos de concurrencia). PA-07 no se activa.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (rama, base y V-01 87/87).
- **PA-07:** no se activó (tabla de arriba).
- **PA-10:** no se activó (punto 10 del manager).
- **PA-11:** no se activó. Después de mi última corrida del backend (un `vitest run` de `sesiones-y-cadena` que terminó hacia las 20:01:50), `docker ps -a` a las 20:37:45 solo muestra los 4 contenedores de `infra/`; el `testcontainers-ryuk` que vi a las 20:02:00 ("Up 13 seconds") era de esa misma corrida y ya no está.
- **PA-12:** no se activó.
- **PA-15:** no se activó: todo se demostró con pruebas nuevas, dobles de `fetch` y el adaptador real con un `alGuardar` propio; ningún archivo de producción se editó.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `git log -1 --oneline` | `e9df1f0 Clases parte B` | base correcta |
| V-01: `sha256sum` de las `*.ataque` contra la tabla de la ronda 0 de c, con `diff` | `V01-OK` (87 y 87) | coincide |
| `Get-NetFirewallRule …` / `Get-NetConnectionProfile` | `Profile : Public` / `Name : IZZI-F281-5G` | en orden |
| `cd backend; npm test` (corrida 1, sin mis archivos) | `Tests  10 failed \| 1172 passed (1182)` | CHORE-02 |
| `cd backend; npm test` (corrida 2, sin mis archivos) | `Test Files  107 passed (107)` · `Tests  1182 passed (1182)` | verde |
| `cd frontend; npm test` (sin mis archivos) | `Test Files  90 passed (90)` · `Tests  1230 passed (1230)` | verde |
| `cd backend; npm test` (corrida 3) | `Tests  13 failed \| 1170 passed \| 27 skipped (1210)` · `Duration 81.50s` | CHORE-02 + mis 4 |
| `cd backend; npm test` (corrida 4) | `Test Files  1 failed \| 108 passed (109)` · `Tests  4 failed \| 1206 passed (1210)` · `Duration 49.54s` | solo mis 4 |
| `cd frontend; npm test` | `Test Files  1 failed \| 91 passed (92)` · `Tests  6 failed \| 1248 passed (1254)` · `Duration 49.18s` | solo mis 6 |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `cd backend; npx prettier --check test/muro-c-r1.ataque.test.ts test/logs-muro-c-r1.ataque.test.ts` | `All matched files use Prettier code style!` | formateados |
| `cd frontend; npx prettier --check src/app/muro-rutas-c-r1.ataque.test.tsx src/features/clases/muro-c-r1.ataque.test.tsx` | `All matched files use Prettier code style!` | formateados |
| Búsqueda de invisibles reales (Node, `\p{Cf}\p{Mn}\p{Zs}…\p{Default_Ignorable_Code_Point}`, U+2800, U+1D159, rellenos Hangul) en mis 4 archivos | `SIN-INVISIBLES` | solo escapes (`\u{…}`) |
| `docker ps -a` (20:37:45) | `campus-dev-livekit-1 Up 5 hours (healthy)` | solo los 4 de `infra/` |

### Archivos nuevos (4; 52 casos)
- `backend/test/muro-c-r1.ataque.test.ts` — 25 casos (4 en rojo: T-29 ×2, T-32, T-33).
- `backend/test/logs-muro-c-r1.ataque.test.ts` — 3 casos (en verde).
- `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` — 22 casos (6 en rojo: T-30 ×4, T-31 ×2).
- `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` — 2 casos (en verde).

Formateados solo esos 4, desde su paquete (`cd backend; npx prettier --write test/<archivo>`; `cd frontend; npx prettier --write src/...`).

### Tabla de SHA-256 de todas las `*.ataque` después de la ronda 1 de CLASES-c (91: las 87 vigentes, sin cambios, y 4 nuevas marcadas). Base de V-01 para la corrección del programador
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` **(nueva, ronda 1 de c)** |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `6C84CEB4B5CC3F45B08DB12B0EEFCCB409344122368ACB54B6EABFE3E3B9859F` | `backend/test/muro-c-r1.ataque.test.ts` **(nueva, ronda 1 de c)** |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `0F60A72D6DC2021CC5ABC97FD129AC24EB3E1889304F59FCF9C63D7294840E85` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` **(nueva, ronda 1 de c)** |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `C27C69F185EA99CA593C2DF569B606D64E989420C7DA5C9C6095B1D7B4B619FF` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` **(nueva, ronda 1 de c)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `6D533653FF448718D6E2557B5D8B718C09F3B5A4C88703D584B566B88D04F97B` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

### C-20: caso de T-32 reescrito por el arbitraje del manager
Fuente: `revision.md`, "## Arbitrajes de la ronda 1 — CLASES-c" (T-32 se corrige en el plan, §D-C4 y C-20 de §D-R0: la unidad de todos los `max` y `min` de cadena de `shared/` es el punto de código). T-32 queda cerrado como hallazgo de código; los demás hallazgos no cambian.

- **Archivo:** `backend/test/muro-c-r1.ataque.test.ts`. Solo cambian el caso de T-32 y dos importaciones que usa (`crearComentarioSchema` y `crearPublicacionSchema` de `@campus/shared`, y `normalizarTextoLargo` de `core/clases/texto.js`). Ningún otro caso cambió (comprobado con `diff` contra la copia previa: todos los bloques caen en las importaciones o dentro del caso).
- **Título nuevo:** "C-20: máximos en puntos de código, contados después de normalizar: 5,000/5,001; 200/201; 1,000/1,001 (con emojis de 2 unidades de UTF-16), igual que el esquema de shared/".
- **Qué cambió:**
  - 2,500 emojis + "a" (2,501 puntos de código, 5,001 unidades) pasa de esperar `400` a esperar `201`; 500 emojis + "c" (501 puntos de código) pasa de `400` a `201`;
  - el borde ahora se prueba en puntos de código: 5,000 emojis → `201` y 5,000 emojis + "a" → `400` (anuncio); 5,000 emojis + "d" → `400` (descripción del material); 200 emojis → `201` y 201 emojis → `400` (título); 1,000 emojis → `201` y 1,000 emojis + "c" → `400` (comentario), cada `400` con su mensaje exacto.
- **Qué sigue protegiendo, sin debilitarse:**
  - los bordes ASCII de siempre: anuncio 5,000/5,001, título 200/201, descripción 5,000/5,001 y comentario 1,000/1,001, con el mensaje exacto de cada `400`;
  - **normalizar antes de medir:** 5,000 "a" y 5,000 emojis entre CRLF → `201`; se suma 5,001 "a" entre CRLF → `400`;
  - **los dos lados miden igual (nuevo):** cada uno de los 20 subcasos compara la respuesta de la API con el veredicto de `crearPublicacionSchema` o `crearComentarioSchema` de `shared/` (el mismo que usa el frontend) sobre el texto ya normalizado.
- **Frontend:** `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` no tiene ninguna aserción con la premisa de UTF-16 (sus casos de T-31 usan 1,000 y 5,000 caracteres ASCII), así que no lo toqué.
- **Formato e invisibles:** `cd backend; npx prettier --write test/muro-c-r1.ataque.test.ts`; ESLint con código 0; la búsqueda por programa de invisibles reales da `SIN-INVISIBLES` (solo escapes `\u{…}`). Compila sin errores con el `tsconfig` temporal del scratchpad.
- **Corrida aislada** (PA-01 comprobada antes: `True / Inbound / Block / Public`, `IZZI-F281-5G`): `cd backend; npx vitest run test/muro-c-r1.ataque.test.ts` → `Tests  3 failed | 22 passed (25)` (`Test Files  1 failed (1)`, `Duration 10.26s`). El caso C-20 está en verde (repetido solo, `-t "C-20"`: `Tests  1 passed | 24 skipped (25)`). Los 3 rojos son los esperados: T-29 ×2 y T-33. PA-07 en esa salida: 0 en los cinco términos.
- **Hash:** `6C84CEB4B5CC3F45B08DB12B0EEFCCB409344122368ACB54B6EABFE3E3B9859F` → `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C`.
- **Rojos esperados que quedan para la corrección del programador:** backend 3 (T-29 ×2 y T-33, en `muro-c-r1`); frontend 6 (T-30 ×4 y T-31 ×2, en `features/clases/muro-c-r1`).

#### Tabla de SHA-256 de todas las `*.ataque` después de C-20 (91: las 87 de la ronda 0 de c sin cambios, 3 nuevas de la ronda 1 sin cambios y `muro-c-r1` del backend con hash nuevo). Base de V-01 para la corrección del programador
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` **(nueva, ronda 1 de c)** |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` **(nueva, ronda 1 de c; cambia por C-20, antes `6C84CEB4…`)** |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `0F60A72D6DC2021CC5ABC97FD129AC24EB3E1889304F59FCF9C63D7294840E85` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` **(nueva, ronda 1 de c)** |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `C27C69F185EA99CA593C2DF569B606D64E989420C7DA5C9C6095B1D7B4B619FF` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` **(nueva, ronda 1 de c)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `6D533653FF448718D6E2557B5D8B718C09F3B5A4C88703D584B566B88D04F97B` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-c — Ronda 2
Veredicto: **ROTO**, por un solo hallazgo bajo (T-34): 0 críticos, 0 altos, 0 medios y 1 bajo. Las correcciones de T-29, T-30, T-31 y T-33 resisten sus bordes. Mis 9 casos de la ronda 1 pasan por la razón correcta.
Verificación propia: lint del backend con código 0 · lint del frontend con código 0 · test del backend `Test Files  111 passed (111)` · `Tests  1226 passed (1226)` (corrida 4, limpia, con mis archivos nuevos) · test del frontend `Test Files  1 failed | 92 passed (93)` · `Tests  1 failed | 1268 passed (1269)` (el único rojo es el caso nuevo de T-34).

Base `<Cb>` = `e9df1f0`. Rama `feat/clases`. Fecha: 2026-10-01.

### Precondiciones
- **Rama y base:** `feat/clases`; `git log -1 --oneline` → `e9df1f0 Clases parte B`.
- **V-01:** `sha256sum` de las `*.ataque` de `git ls-files -co --exclude-standard`, contra las 91 filas de la tabla "después de C-20", comparadas con `diff`: **91 de 91 iguales** (`V01-91-OK`). Nadie tocó ninguna.
- **PA-01**, antes de cualquier prueba del backend: regla `True / Inbound / Block / Public`; red `IZZI-F281-5G`, `Public` (de confianza). `docker ps -a`: solo los 4 contenedores de `infra/`.
- No toqué código de producción, pruebas normales ni `*.ataque` existentes; no abrí navegadores ni arranqué procesos fuera de las pruebas.

### Regresión primero
- **Suites completas antes de mis archivos nuevos** (con las 91 `*.ataque`):
  - backend corrida 1: `Tests  11 failed | 1203 passed (1214)`, todo por la espera en cadena de CHORE-02: tiempos límite de 10 a 40 s, más el lote de `invitacion-masiva-03c-r2` con tres `500` (ver PA-07). Corrida 2: `Test Files  109 passed (109)` · `Tests  1214 passed (1214)`, código 0;
  - frontend (con mis archivos nuevos, ver arriba): las 92 restantes en verde, incluidas `muro-c-r1` y `muro-rutas-c-r1`.
- **Mis 9 casos de la ronda 1, por la razón correcta** (leídos contra el código corregido):
  - **T-29 ×2:** pasan porque `listarPublicaciones` y `listarComentarios` leen el cursor por PK (`findFirst` con `claseId` o con `publicacionId`) y lanzan `400 VALIDACION` "cursor: no es válido". El caso nuevo de la ronda 2 lo afirma literal: código y mensaje exactos en las dos listas;
  - **T-33:** pasa por los dos `error` de `shared/`: "tipo: Elige si es un anuncio o un material" en el `discriminatedUnion` y "texto: La descripción debe ser texto" en la descripción del material;
  - **T-30 ×4:** pasan porque avisan `useComentar` y `useCrearPublicacion` (`onSuccess` y `onError` de `useMutation`). Los dos formularios ya no importan `toast` (`grep` en `components/formulario-{comentario,publicacion}.tsx`: 0), y con el formulario montado sale un solo aviso por evento (casos nuevos de doble clic y de convivencia);
  - **T-31 ×2:** pasan porque los dos formularios aplican `normalizarTextoLargo` de `@campus/shared` antes de `safeParse` y envían `resultado.data`. El caso nuevo comprueba que el cuerpo enviado es el texto normalizado.

### Hallazgos

#### T-34 — Tras el `400` del cursor, el muro solo dice "Error · no es válido"
Severidad: baja
Prueba: `frontend/src/features/clases/muro-c-r2.ataque.test.tsx`, caso "tras el 400 del cursor en «Ver más publicaciones», la persona ve un mensaje que dice qué pasó (no el «no es válido» técnico) y el foco no cae en <body>".
- **Reproducción:** 25 publicaciones; se carga la primera página y otra persona borra la publicación que es su cursor (la 20); "Ver más publicaciones" con el teclado.
- **Esperado:** un mensaje que diga qué pasó y qué hacer (`DESIGN.md` §9: "Los errores dicen qué pasó y qué hacer, sin culpar ni usar tecnicismos").
- **Obtenido:** `MensajeError` con el título "Error" y el mensaje "no es válido": `mensajeDeErrorClases` quita el prefijo `cursor:` del `VALIDACION` y deja el resto tal cual. Además, la lista ya cargada se sustituye por la alerta; eso es el patrón aceptado en a y b (T-27) y no lo cuento. El foco sí va al encabezado "Publicaciones" (nunca a `<body>`).
- **Recuperación:** volver a entrar al muro lo recupera sin recargar: la consulta en error se vuelve a pedir desde la primera página (caso en verde "tras el 400 del cursor, volver a entrar al muro lo recupera sin recargar la página").
- **Requisito o regla:** `DESIGN.md` §9; detalle menor del manager en su verificación de la corrección ("si lo confirma, el remedio es un texto propio para `VALIDACION` de `cursor` en `data.ts`; es una decisión de texto, no de seguridad"). Alcanza también a "Ver más comentarios", que usa el mismo `mensajeDeErrorClases`.

### Atacado sin hallazgos (por punto de la lista del manager para la ronda 2)
1. **Regresión por la razón correcta:** ver "Regresión primero". La suite completa limpia del backend (corrida 4) y la del frontend no tienen ningún rojo fuera de T-34: el resto de c, b y a sigue en verde.
2. **Bordes de T-29** (`backend/test/muro-c-r2.ataque.test.ts` y `frontend/src/features/clases/muro-c-r2.ataque.test.tsx`):
   - varias páginas (6 publicaciones, `limite=2`): borrar la primera fila de la página siguiente, que no es el cursor, no pierde ni duplica filas (`[p6, p5]`, `[p3, p2]`, `[p1]`); borrar después el cursor de la página 3 responde `400` "cursor: no es válido";
   - el cursor de una publicación de otra clase del mismo maestro, un id de comentario usado como cursor del muro, un comentario de otra publicación de la misma clase y una publicación usada como cursor de comentarios: estado y cuerpo **idénticos** a un UUID inexistente (`400`);
   - la publicación de otra clase con un cursor válido de esa publicación: `404 PUBLICACION_NO_ENCONTRADA`, el mismo cuerpo que sin cursor (la publicación se comprueba antes);
   - interfaz: con dos páginas cargadas, borrar la publicación que era el cursor de la página 2 no vuelve a pedir ese cursor (TanStack Query recalcula los cursores al refrescar desde la primera página), no muestra error y conserva las filas 21 a 25; tras el `400`, volver a entrar recupera el muro; el foco va al encabezado. El texto es T-34;
   - **no atacado:** el borrado concurrente del cursor entre la lectura por PK y la página. Es el residual de milisegundos aceptado (§D-A4) y solo se reproduciría con dobles en esa ventana.
3. **T-30:**
   - un `400` "texto: Escribe tu comentario" del servidor marca el campo (`aria-invalid` y `ErrorDeCampo`) sin ningún aviso;
   - un `404 PUBLICACION_NO_ENCONTRADA` al comentar avisa una sola vez ("Esa publicación ya no existe.") sin marcar el campo;
   - cerrar y volver a abrir los comentarios con el `POST` en vuelo: "Comentario publicado" una sola vez;
   - doble clic sin espera en "Comentar" y en "Publicar anuncio": una petición y un aviso cada uno;
   - el residual aceptado (error de campo con el formulario desmontado no avisa) no lo cuento.
4. **T-31:** CR solo y extremos en blanco (U+FEFF, U+00A0, U+3000, tabulador, espacio, `\n` y `\r`):
   - el comentario y el material se envían normalizados (`"uno\ndos\n\ntres"`; título `"Unidad 1"`, descripción `"línea 1\nlínea 2"`), y el campo visible no cambia hasta el éxito;
   - solo blancos en el anuncio, el título y el comentario: el mismo mensaje que el servidor y ninguna petición;
   - el servidor guarda lo mismo (`"uno\ndos\n\ntres"`), acepta un título con un salto interior (`"Unidad 1\nRepaso"`), guarda la descripción solo de blancos como `""` y responde "texto: Escribe tu comentario" a los blancos.
5. **T-33:**
   - `tipo` con `1`, `null`, `[]`, `{}`, `"Anuncio"`, `" anuncio"`, `"anuncio "`, `"MATERIAL"` y `""`: "tipo: Elige si es un anuncio o un material";
   - la descripción del material con `true`, `{}`, `["a"]` y `0`: "texto: La descripción debe ser texto"; el título con esos valores, "titulo: Escribe el título del material"; el texto del comentario, "texto: Escribe tu comentario";
   - un cuerpo que no es objeto (`"hola"`, `5`, `null`, `[]`, `["texto"]`, `[{"texto":"hola"}]`) en las dos rutas que crean: `400` sin ningún mensaje de zod en inglés. Los arreglos llegan como objeto por el `{ ...cuerpo }` de `conTextosNormalizados` y responden el mensaje del campo vacío.
6. **Lo débil que vio el manager:**
   - los avisos de crear y de borrar en la misma vista (publicar, borrar una publicación, comentar y borrar un comentario, seguidos): `["Publicado"]`, `["Publicación borrada"]`, `["Comentario publicado"]` y `["Comentario borrado"]`, uno cada uno y en su orden, sin ningún `toast.error`;
   - `normalizarTextoLargo` de `core/clases/texto.ts` es el mismo objeto que el de `@campus/shared` (`toBe`), y `frontend/src` no tiene otra copia (ni `\r\n|\r` ni una definición);
   - PA-10 con los `400` (`backend/test/logs-muro-c-r2.ataque.test.ts`): la API real con `LOG_LEVEL=trace` recibe 10 peticiones del muro, con los `400` del cursor en las dos listas, el tipo inválido, el cuerpo que es arreglo, la descripción que no es texto y el comentario en blanco, más un `201` con CR. En el log no aparecen los JWT, las cookies, la contraseña, los correos, las palabras `authorization` ni `cookie`, ni ningún texto de los cuerpos (válidos o rechazados). El log está completo.

### No atacado y por qué
- **Borrado concurrente del cursor entre la lectura por PK y la página:** residual aceptado de §D-A4 (ver punto 2).
- **El texto en pantalla, 360 px y el foco visible:** exigen un navegador; no se abre ninguno.
- **"Ver más comentarios" tras un `400` del cursor:** no le hice un caso propio. Usa el mismo `mensajeDeErrorClases`, así que T-34 lo alcanza por el mismo mecanismo.

### Observaciones que no son hallazgo
1. **Tras un `404 PUBLICACION_NO_ENCONTRADA` al comentar, el muro no se refresca:** la publicación borrada sigue en pantalla hasta otra invalidación. `onError` de `useComentar` solo avisa. El plan no lo pide.
2. **La descripción del material solo de blancos se guarda como `""`** y no se muestra (`publicacion.texto !== ""`). Es lo esperado de §D-C4 (opcional sin contenido visible), lo anoto porque el formulario no avisa nada.
3. **El `{ ...cuerpo }` de `conTextosNormalizados` convierte un arreglo en un objeto** (`["texto"]` → `{ "0": "texto" }`). El resultado es un `400` en español, así que no es defecto. Solo cambia de dónde sale el mensaje.
4. **`P2028` de AUTH fuera de c** (ver PA-07): `POST /api/auth/cambiar-contrasena` y `POST /api/admin/maestros/lote`.

### PA-07
Conteo sobre la salida completa de `cd backend; npm test > r2-back-N.txt 2>&1` (scratchpad); los `P2028` por línea de log (`"code":"P2028"`) y por sitio de la llamada, con el arbitraje del manager.

| Corrida | Situación | 40P01 | deadlock detected | could not serialize | too many clients | P2028 (líneas de log) y sitio |
|---|---|---|---|---|---|---|
| 1 | sin mis archivos; caída por CHORE-02 (`11 failed`) | 0 | 0 | 0 | 0 | 5: los dos aceptados (`sesiones.ts:39`, login; `tokens-cuenta.ts:116`, restablecer) y **3 de AUTH-03c**: `tx.tokenCuenta.count()` en `adapters/db/invitaciones.ts:44` (dos veces) y `tx.usuario.createMany()` en `invitaciones.ts:66`, los dos dentro de `invitarMaestrosEnLote` (`POST /api/admin/maestros/lote`). Coinciden con el rojo de `invitacion-masiva-03c-r2.ataque.test.ts`, "ráfaga de 8 rondas de 4 lotes simultáneos…": tres `500` en la ráfaga |
| 2 | sin mis archivos; limpia | 0 | 0 | 0 | 0 | 2: los dos aceptados |
| 3 | con mis archivos; un solo rojo, sin la caída en cadena (`Duration 55.95s`) | 0 | 0 | 0 | 0 | 3: los dos aceptados y **el tercero que ya vio el manager:** `tx.sesion.findFirst()` en `adapters/db/usuarios.ts:293` (`cambiarContrasenaPropia`, `POST /api/auth/cambiar-contrasena`). Respondió `500` "Error no controlado" y tumbó `cuentas-03a-r1.ataque.test.ts`, "con la bandera ya apagada, la sesión viva no reabre el cambio: 409 y la contraseña no cambia" (`expected 500 to be 204`, en `:512`) |
| 4 | con mis archivos; limpia (`111 passed`, `1226 passed`) | 0 | 0 | 0 | 0 | 2: los dos aceptados |

- **Ningún `P2028` en una ruta de c** (ni en `crearComentario` con su `FOR SHARE`, ni en las lecturas del cursor). PA-07 no se activa para c.
- **Aparte, para AUTH y CHORE-02 (no son hallazgos de c):**
  - el `P2028` de `cambiarContrasenaPropia` ya no sale solo en corridas caídas por la cadena de CHORE-02. En la corrida 3 fue el **único** rojo de la suite, con una duración normal: el caso tardó 5,807 ms, lo que encaja con una transacción interactiva de 5 s que expira esperando un bloqueo de su propia prueba o de otra en paralelo;
  - también aparecen `P2028` en `invitarMaestrosEnLote` (AUTH-03c) bajo CHORE-02, que convierten en `500` respuestas de un lote.

  Los dos son el mismo mecanismo que los dos aceptados de `cuentas-r3`. Los dejo para la decisión del humano que ya pidió el manager ("Para el humano", su verificación de la corrección de la ronda 1).

### Intermitencia (CHORE-02) y PA-12
- La corrida 1 cayó por la espera en cadena (tiempos límite de 10 a 40 s en `clases-autorizacion`, `worker-03c-r1`, `bloqueo-usuario` A1, `clases-r1` ×2, `cuentas-03a-r1` ×2, `cuentas-r1` ×2, `cuentas-r3` y el ritmo del worker, más la ráfaga de `invitacion-masiva-03c-r2`). La repetí una vez: limpia.
- La corrida 3 tuvo el `500` de AUTH descrito arriba; la repetí una vez: limpia.
- Mis archivos nuevos corrieron aislados y en las dos corridas completas con el mismo resultado: backend 12 de 12 en verde; frontend 10 en verde y el rojo de T-34, siempre igual. PA-12 no se activa.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (rama, base y V-01 91/91).
- **PA-07:** no se activó para c. Los `P2028` de AUTH van aparte (arriba).
- **PA-10:** no se activó.
- **PA-11:** no se activó. Después de mi última corrida del backend (terminó hacia las 21:31:30), `docker ps -a` a las 21:33:51 (más de 120 s después) solo muestra los 4 contenedores de `infra/`; ningún contenedor de Testcontainers.
- **PA-12 y PA-15:** no se activaron. No edité producción; usé dobles de `fetch` y la API real de la prueba de logs.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `git log -1 --oneline` | `e9df1f0 Clases parte B` | base correcta |
| V-01: `sha256sum` de las `*.ataque` contra la tabla "después de C-20", con `diff` | `V01-91-OK` | coincide |
| `Get-NetFirewallRule …` / `Get-NetConnectionProfile` | `True Inbound Block Public` / `IZZI-F281-5G Public` | en orden |
| `cd backend; npm test` (corrida 1, sin mis archivos) | `Test Files  9 failed \| 100 passed (109)` · `Tests  11 failed \| 1203 passed (1214)` | CHORE-02 |
| `cd backend; npm test` (corrida 2, sin mis archivos) | `Test Files  109 passed (109)` · `Tests  1214 passed (1214)` · `Duration 49.90s` | verde |
| `cd backend; npm test` (corrida 3, con mis archivos) | `Test Files  1 failed \| 110 passed (111)` · `Tests  1 failed \| 1225 passed (1226)` · `Duration 55.95s` | `500` de AUTH (`P2028`, `usuarios.ts:293`) |
| `cd backend; npm test` (corrida 4, con mis archivos) | `Test Files  111 passed (111)` · `Tests  1226 passed (1226)` · `Duration 51.15s` | verde |
| `cd frontend; npm test` (con mis archivos) | `Test Files  1 failed \| 92 passed (93)` · `Tests  1 failed \| 1268 passed (1269)` · `Duration 45.42s` | solo T-34 |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `npx vitest run test/muro-c-r2.ataque.test.ts` (backend, aislado) | `Tests  9 passed (9)` | verde |
| `npx vitest run test/logs-muro-c-r2.ataque.test.ts` (backend, aislado) | `Tests  3 passed (3)` | verde |
| `npx vitest run src/features/clases/muro-c-r2.ataque.test.tsx` (frontend, aislado) | `Tests  1 failed \| 10 passed (11)` | solo T-34 |
| Búsqueda de invisibles reales en mis 3 archivos (Node) | `SIN-INVISIBLES` | solo escapes (`\u{…}`) |

Los dos archivos del backend también compilan sin errores con el `tsconfig` temporal del scratchpad que los incluye (el `typecheck` del paquete solo cubre `src/`).

### Archivos nuevos (3; 23 casos)
- `backend/test/muro-c-r2.ataque.test.ts`: 9 casos, en verde.
- `backend/test/logs-muro-c-r2.ataque.test.ts`: 3 casos, en verde.
- `frontend/src/features/clases/muro-c-r2.ataque.test.tsx`: 11 casos (1 en rojo: T-34).

Formateados solo esos 3, desde su paquete (`cd backend; npx prettier --write test/<archivo>`; `cd frontend; npx prettier --write src/features/clases/muro-c-r2.ataque.test.tsx`).

### Tabla de SHA-256 de todas las `*.ataque` después de la ronda 2 de CLASES-c (94: las 91 vigentes, sin cambios, y 3 nuevas marcadas). Base de V-01 para la corrección del programador
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` **(nueva, ronda 2 de c)** |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` **(nueva, ronda 2 de c)** |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `0F60A72D6DC2021CC5ABC97FD129AC24EB3E1889304F59FCF9C63D7294840E85` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `C27C69F185EA99CA593C2DF569B606D64E989420C7DA5C9C6095B1D7B4B619FF` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `7DB1CAAFB2E6FE338C92F32C3A95EE1C2BEE94AEB95FE07973FD0F92A13BB556` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` **(nueva, ronda 2 de c)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `6D533653FF448718D6E2557B5D8B718C09F3B5A4C88703D584B566B88D04F97B` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-c — Ronda 3
Veredicto: **ROTO**, por un solo hallazgo bajo (T-35): 0 críticos, 0 altos, 0 medios y 1 bajo. T-34 se corrigió por la razón correcta, y los bordes de T-29 a T-33 y PA-10 siguen en verde. Lo que queda es que el texto nuevo del muro ("Vuelve a abrirlo") no dice qué acción recupera la lista: la más natural, pulsar "Muro", no hace nada.
Verificación propia: lint del backend con código 0 · lint del frontend con código 0 · test del backend `Test Files  111 passed (111)` · `Tests  1226 passed (1226)` (dos corridas, las dos limpias) · test del frontend `Test Files  1 failed | 94 passed (95)` · `Tests  1 failed | 1289 passed (1290)` (dos corridas iguales; el único rojo es el caso nuevo de T-35).

Base `<Cb>` = `e9df1f0`. Rama `feat/clases`. Fecha: 2026-10-01.

### Precondiciones
- **Rama y base:** `feat/clases`; `git log -1 --oneline` → `e9df1f0 Clases parte B`.
- **V-01:** las 94 `*.ataque` contra la tabla de la ronda 2, comparadas por programa con `diff`: **94 de 94 iguales** (`V01-94-OK`).
- **PA-01**, antes del backend: regla `True / Inbound / Block / Public`; red `IZZI-F281-5G`. `docker ps -a`: solo los 4 contenedores de `infra/`.
- No toqué código de producción, pruebas normales ni `*.ataque` existentes; no abrí navegadores.

### Hallazgos

#### T-35 — "Vuelve a abrirlo" no recupera el muro si la persona pulsa "Muro": solo cambiar de sección y regresar lo hace
Severidad: baja
Prueba: `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx`, caso "muro: estando en el muro, «Vuelve a abrirlo» pulsando «Muro» recupera la lista".
- **Reproducción**, con el router real (`createMemoryRouter(rutas)`): un estudiante en `/estudiante/clases/:claseId`, 25 publicaciones; se borra el cursor de la página 2 y pulsa "Ver más publicaciones" → "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo.". Para "volver a abrirlo" pulsa "Muro" en las secciones de la clase.
- **Esperado:** que la acción que el texto sugiere recupere la lista sin recargar la página (punto 3 de la lista del manager).
- **Obtenido:** la ubicación cambia (nueva entrada del historial con la misma ruta), pero `MuroView` no se desmonta ni la consulta se vuelve a pedir. 500 ms después sigue la alerta y ninguna publicación.
- **Lo que sí recupera** (casos en verde del mismo archivo):
  - "muro: cambiar a «Personas» y regresar a «Muro» recupera la lista": al montar de nuevo, la consulta en error se vuelve a pedir desde la primera página;
  - en los comentarios, "Ocultar comentarios" y "Ver comentarios" otra vez recupera la lista ("comentarios: «Ocultar comentarios» y «Ver comentarios» otra vez recupera la lista"). El texto de los comentarios ("Vuelve a abrirlos") **sí** describe una acción útil, y no lo cuento.
- **Remedio posible:** lo decide el programador con el manager; no lo propongo como diseño. El texto puede nombrar la acción que funciona (salir del muro y volver a entrar), o la vista puede ofrecer una acción que vuelva a pedir la lista.
- **Requisito o regla:** `DESIGN.md` §9 ("Los errores dicen qué pasó y qué hacer"); reserva del manager, punto 3 de su lista para la ronda 3 ("si el texto pide una acción inútil, es hallazgo (bajo) con la acción que sí funciona").

### Atacado sin hallazgos (por punto de la lista del manager para la ronda 3)
1. **Las 94 `*.ataque` y las pruebas normales, dos corridas por paquete:**
   - backend: `111 passed` / `1226 passed` las dos veces, sin caer por CHORE-02;
   - frontend: las 94 vigentes y todas las pruebas normales en verde en las dos corridas; el único rojo es mi caso de T-35.
2. **T-34 por la razón correcta** (`frontend/src/features/clases/muro-c-r3.ataque.test.tsx`, 15 casos en verde). En "Ver más publicaciones" y en "Ver más comentarios", el texto "…cambió mientras lo veías…" sale **solo** con el `400 VALIDACION` "cursor: no es válido", y ya no aparece "no es válido". Los otros seis casos muestran exactamente lo que `mensajeDeErrorClases` da para el mismo error y no el texto nuevo:
   - un `400 VALIDACION` de `limite`;
   - un `400 VALIDACION` de otro campo cuyo mensaje menciona el cursor;
   - un `400` con el prefijo `cursor:` pero código distinto de `VALIDACION`;
   - un `500`;
   - un `403 SIN_ACCESO_A_LA_CLASE`;
   - la falta de conexión (`fetch` rechaza).

   La razón está en el código: `mensajeDeErrorDeLista` solo cambia el texto cuando `campoDeErrorClases(error) === "cursor"`, que exige un `VALIDACION` con ese prefijo.
3. **Qué recupera la lista sin recargar:** cambiar de sección y regresar recupera el muro; "Ocultar comentarios" y "Ver comentarios" recuperan los comentarios. Pulsar "Muro" estando en el muro no recupera nada: es T-35.
4. **Regresión de los bordes de T-29 a T-33:** `backend/test/muro-c-r1.ataque.test.ts` (con C-20), `backend/test/muro-c-r2.ataque.test.ts`, `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` y `muro-c-r2.ataque.test.tsx` en verde en las dos corridas de cada paquete. Incluido el caso de T-34 de la ronda 2, que ahora pasa con el texto nuevo.
5. **PA-10:** `backend/test/logs-muro-c-r2.ataque.test.ts` y `logs-muro-c-r1.ataque.test.ts` en verde en las dos corridas: ningún JWT, cookie, contraseña, correo ni cuerpo en el log de la API real con `LOG_LEVEL=trace`.

### No atacado y por qué
- **El foco y el texto en pantalla de verdad:** exigen un navegador; no se abre ninguno.
- **El refresco al volver a la ventana** (`refetchOnWindowFocus` de TanStack Query) también recuperaría la lista, pero no es una acción que el texto pida y jsdom no la representa con fidelidad. No la cuento como acción útil.

### Observaciones que no son hallazgo
1. **"Ver más clases"** (punto 6 del manager): sin cambio en esta ronda; su pendiente ya está registrado con destino. No lo ataqué.
2. **Con el `400` del cursor, la lista ya cargada se sustituye por la alerta.** Es el patrón aceptado en a y b (T-27); con T-35 resuelto no haría falta más.
3. **Ningún `P2028` de AUTH en esta ronda:** las cuatro corridas del backend traen solo los dos aceptados.

### PA-07
Conteo sobre la salida completa de `cd backend; npm test > r3-back-N.txt 2>&1` (scratchpad); `P2028` por línea de log (`"code":"P2028"`) y por sitio.

| Corrida | Situación | 40P01 | deadlock detected | could not serialize | too many clients | P2028 (líneas de log) y sitio |
|---|---|---|---|---|---|---|
| 1 | limpia (`111 passed`, `1226 passed`, `Duration 90.39s`) | 0 | 0 | 0 | 0 | 2: `tx.sesion.create()` en `sesiones.ts:39` (login) y `tx.tokenCuenta.updateMany()` en `tokens-cuenta.ts:116` (restablecer), los aceptados |
| 2 | limpia (`111 passed`, `1226 passed`, `Duration 88.06s`) | 0 | 0 | 0 | 0 | 2: los mismos |

Ningún `P2028` en una ruta de c ni de AUTH fuera de los dos aceptados. PA-07 no se activa.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (rama, base y V-01 94/94).
- **PA-07:** no se activó.
- **PA-10:** no se activó.
- **PA-11:** no se activó. Mi última corrida del backend terminó a las 22:06:01; `docker ps -a` a las 22:10:58 solo muestra los 4 contenedores de `infra/`.
- **PA-12:** no se activó. Mis dos archivos nuevos dan el mismo resultado aislados y en las dos corridas completas.
- **PA-15:** no se activó. Solo pruebas nuevas, con dobles de `fetch` y el router real.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `git log -1 --oneline` | `e9df1f0 Clases parte B` | base correcta |
| V-01 contra la tabla de la ronda 2, con `diff` | `V01-94-OK` | coincide |
| `Get-NetFirewallRule …` / `Get-NetConnectionProfile` | `True Inbound Block Public` / `IZZI-F281-5G` | en orden |
| `cd backend; npm test` (corrida 1) | `Test Files  111 passed (111)` · `Tests  1226 passed (1226)` | verde |
| `cd backend; npm test` (corrida 2) | `Test Files  111 passed (111)` · `Tests  1226 passed (1226)` | verde |
| `cd frontend; npm test` (corrida 1) | `Test Files  1 failed \| 94 passed (95)` · `Tests  1 failed \| 1289 passed (1290)` · `Duration 116.90s` | solo T-35 |
| `cd frontend; npm test` (corrida 2) | `Test Files  1 failed \| 94 passed (95)` · `Tests  1 failed \| 1289 passed (1290)` · `Duration 104.40s` | solo T-35 |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `npx vitest run src/app/muro-recuperar-c-r3.ataque.test.tsx` (aislado) | `Tests  1 failed \| 2 passed (3)` | solo T-35 |
| `npx vitest run src/features/clases/muro-c-r3.ataque.test.tsx` (aislado) | `Tests  15 passed (15)` | verde |
| `npx prettier --check` de mis 2 archivos (desde `frontend/`) | `All matched files use Prettier code style!` | formateados |
| Búsqueda de invisibles reales en mis 2 archivos (Node) | `SIN-INVISIBLES` | sin invisibles |

### Archivos nuevos (2; 18 casos)
- `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx`: 3 casos (1 en rojo: T-35).
- `frontend/src/features/clases/muro-c-r3.ataque.test.tsx`: 15 casos, en verde.

Formateados solo esos 2, desde `frontend/` (`npx prettier --write src/...`). No hizo falta ningún archivo nuevo en el backend.

### Tabla de SHA-256 de todas las `*.ataque` después de la ronda 3 de CLASES-c (96: las 94 vigentes, sin cambios, y 2 nuevas marcadas). Base de V-01 para la corrección del programador
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `0F60A72D6DC2021CC5ABC97FD129AC24EB3E1889304F59FCF9C63D7294840E85` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `EC149F310ABA10C826D6AF38F093DC018036D3F7F35FA0C08C5604D138C1BC39` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` **(nueva, ronda 3 de c)** |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `C27C69F185EA99CA593C2DF569B606D64E989420C7DA5C9C6095B1D7B4B619FF` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `7DB1CAAFB2E6FE338C92F32C3A95EE1C2BEE94AEB95FE07973FD0F92A13BB556` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `735048B69E92E559366237AFB8122E3D86AC54FE3BF5FBC369A754DFD6722645` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` **(nueva, ronda 3 de c)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `6D533653FF448718D6E2557B5D8B718C09F3B5A4C88703D584B566B88D04F97B` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-c — Ronda 4, regresión final
Veredicto: **RESISTE.** Los hallazgos de T-29 a T-35 pasan por la razón correcta, no hay peticiones de más y no aparece ningún defecto nuevo. No hay observaciones que pidan decisión del humano.
Verificación propia: lint del backend con código 0 (`> tsc -p tsconfig.json --noEmit`) · lint del frontend con código 0 (`> tsc -b`) · test del backend `Test Files  111 passed (111)` · `Tests  1226 passed (1226)` (una corrida, limpia) · test del frontend `Test Files  96 passed (96)` · `Tests  1293 passed (1293)` (dos corridas iguales).

Base `<Cb>` = `e9df1f0`. Rama `feat/clases`. Fecha: 2026-10-01.

### Precondiciones
- **Rama y base:** `feat/clases`; `git log -1 --oneline` → `e9df1f0 Clases parte B`.
- **V-01:** las 96 `*.ataque` contra la tabla de la ronda 3, comparadas por programa con `diff`: **96 de 96 iguales** (`V01-96-OK`).
- **PA-01**, antes del backend: regla `True / Inbound / Block / Public`; red `IZZI-F281-5G`. `docker ps -a`: solo los 4 contenedores de `infra/`.
- No toqué código de producción, pruebas normales ni `*.ataque` existentes.

### T-35 por la razón correcta
- **Mecanismo** (`muro-view.tsx`):
  - `llaveDeLaUbicacion` guarda la `key` de `useLocation()` del montaje;
  - el efecto (dependencias `ubicacion.key`, `isError` y `refetch`) sale sin hacer nada mientras la `key` no cambie;
  - con una `key` nueva, la guarda y solo llama a `refetch()` si la consulta está en `isError`.

  Por eso no hay petición extra en el primer render (la `key` es la del montaje), ni con un error sin navegación nueva (la `key` no cambia), ni con el muro sano (`!isError`). Como la `key` se guarda antes de mirar `isError`, una navegación con la lista sana tampoco deja un `refetch` pendiente para cuando llegue un error después.
- **`frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx`: 3/3, sin tocarlo.** Incluye el caso de T-35 ("muro: estando en el muro, «Vuelve a abrirlo» pulsando «Muro» recupera la lista"), ahora en verde.
- **`frontend/src/features/clases/muro-c-r3.ataque.test.tsx`: 15/15.**
- **PR-C18 en `muro-view.test.tsx`:** los dos casos en verde ("con el muro en error por el 400 del cursor, pulsar «Muro» vuelve a pedir la primera página…" y "con el muro sano, pulsar «Muro» no vuelve a pedir nada").
- **Peticiones de más, con el router real** (`frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx`, nuevo, 1 caso en verde), contando las peticiones de la primera página del muro:
  - primer render, 1;
  - con el `400` y sin navegación nueva (300 ms), sigue en 1;
  - "Muro" con la lista en error, 2, y la lista reaparece sin el texto de error;
  - "Muro" otra vez con la lista sana, sigue en 2;
  - "Ver más publicaciones" vuelve a funcionar (el cursor sale de la página nueva) y trae hasta la publicación 25 sin error.

### Regresión caso por caso (T-29 a T-35)
| Hallazgo | Casos | Resultado y razón |
|---|---|---|
| T-29 | `backend/test/muro-c-r1.ataque.test.ts` (los dos de "cursor borrado…"), `backend/test/muro-c-r2.ataque.test.ts` (regresión literal, varias páginas, cursores ajenos, publicación ajena con cursor) | en verde: lectura del cursor por PK y `400 VALIDACION` "cursor: no es válido", sin oráculo |
| T-30 | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` (los cuatro de N-C5), `muro-c-r2.ataque.test.tsx` (error de campo, `404`, cerrar y reabrir, doble clic, convivencia de avisos) | en verde: los avisos viven en `useComentar` y `useCrearPublicacion` |
| T-31 | `muro-c-r1.ataque.test.tsx` (los dos de "…se envía: el servidor lo recorta…"), `muro-c-r2.ataque.test.tsx` (CR, blancos, material) y `backend/test/muro-c-r2.ataque.test.ts` (servidor y `normalizarTextoLargo` único) | en verde: `normalizarTextoLargo` de `shared/` antes de `safeParse` |
| T-32 (C-20) | `backend/test/muro-c-r1.ataque.test.ts`, "C-20: máximos en puntos de código…" | en verde: puntos de código después de normalizar, igual que el esquema de `shared/` |
| T-33 | `backend/test/muro-c-r1.ataque.test.ts` ("campos ausentes o que no son texto…") y `muro-c-r2.ataque.test.ts` (más tipos y cuerpos que no son objeto) | en verde: los dos `error` de `shared/` |
| T-34 | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` (texto tras el `400`) y `muro-c-r3.ataque.test.tsx` (15: solo con el `400` de `cursor`) | en verde: `mensajeDeErrorDeLista` |
| T-35 | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` (3), `muro-recuperar-c-r4.ataque.test.tsx` (1) y PR-C18 (2) | en verde: `refetch()` solo con navegación nueva y lista en error |

PA-10 (`logs-muro-c-r1` y `logs-muro-c-r2`), concurrencia, cola y alcance de la ronda 1 siguen en verde en la corrida del backend.

### Observaciones con destino
Ninguna observación nueva que pida decisión. Siguen vigentes, ya registradas en rondas anteriores:
- **NOTIFICACIONES:** los trabajos de aviso pueden apuntar a datos ya borrados, y el consumidor debe tolerarlo (ronda 1, observación 1).
- **"Ver más clases":** pendiente registrado con destino; no se atacó.
- **AUTH y CHORE-02:** los `P2028` de `cambiarContrasenaPropia` (`usuarios.ts:293`) e `invitarMaestrosEnLote` (`invitaciones.ts:44` y `:66`) de la ronda 2 están en manos del humano. En esta ronda no aparecieron; tampoco el de `rotarSesion` (`sesiones.ts:72`) que vio el manager.

### PA-07
| Corrida | Situación | 40P01 | deadlock detected | could not serialize | too many clients | P2028 (líneas de log) y sitio |
|---|---|---|---|---|---|---|
| 1 (`cd backend; npm test > r4-back-1.txt 2>&1`) | limpia (`111 passed`, `1226 passed`, `Duration 52.23s`) | 0 | 0 | 0 | 0 | 2: `tx.sesion.create()` en `sesiones.ts:39` (login) y `tx.tokenCuenta.updateMany()` en `tokens-cuenta.ts:116` (restablecer), los aceptados |

La corrida no cayó por CHORE-02, así que no la repetí. Ningún `P2028` en una ruta de c, y ninguno de AUTH fuera de los aceptados (tampoco `sesiones.ts:72`). PA-07 no se activa.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (rama, base y V-01 96/96).
- **PA-07 y PA-10:** no se activaron.
- **PA-11:** no se activó. La corrida del backend terminó a las 22:57:37; `docker ps -a` a las 22:59:57 solo muestra los 4 contenedores de `infra/`.
- **PA-12 y PA-15:** no se activaron. El archivo nuevo da el mismo resultado aislado y en las dos corridas del frontend, y no toqué producción.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `git log -1 --oneline` | `e9df1f0 Clases parte B` | base correcta |
| V-01 contra la tabla de la ronda 3, con `diff` | `V01-96-OK` | coincide |
| `Get-NetFirewallRule …` / `Get-NetConnectionProfile` | `True Inbound Block Public` / `IZZI-F281-5G` | en orden |
| `npx vitest run` de `muro-recuperar-c-r4`, `muro-recuperar-c-r3`, `muro-c-r3` y `muro-view.test` (frontend, `--reporter=verbose`) | `Test Files  4 passed (4)` · `Tests  27 passed (27)` | verde |
| `cd backend; npm test` | `Test Files  111 passed (111)` · `Tests  1226 passed (1226)` · `Duration 52.23s` | verde |
| `cd frontend; npm test` (corrida 1) | `Test Files  96 passed (96)` · `Tests  1293 passed (1293)` · `Duration 51.09s` | verde |
| `cd frontend; npm test` (corrida 2) | `Test Files  96 passed (96)` · `Tests  1293 passed (1293)` · `Duration 51.83s` | verde |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `cd frontend; npx prettier --check src/app/muro-recuperar-c-r4.ataque.test.tsx` | `All matched files use Prettier code style!` | formateado |
| Búsqueda de invisibles reales en el archivo nuevo (Node) | `SIN-INVISIBLES` | sin invisibles |

### Archivo nuevo (1; 1 caso)
- `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx`: 1 caso, en verde. Documenta que T-35 no agrega peticiones. Formateado solo ese archivo, desde `frontend/`.

### Tabla de SHA-256 de todas las `*.ataque` al cierre de CLASES-c (97: las 96 vigentes, sin cambios, y 1 nueva marcada). Base de V-01 para CLASES-d
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `4FCE3CEDF662BA3A188F21A2277DB417747D342C115EFD4746D3CFF58499289B` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `AAE65C95CF34DB814D650AF5F7FA08D09BFF3E6FC6863D4252383058499AA10E` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `0F60A72D6DC2021CC5ABC97FD129AC24EB3E1889304F59FCF9C63D7294840E85` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `EC149F310ABA10C826D6AF38F093DC018036D3F7F35FA0C08C5604D138C1BC39` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `38B89E3F5A2A927BF49E7FBAE5F732B11F92C9456EFC4730044F46A2722F44B2` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` **(nueva, ronda 4 de c)** |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `C27C69F185EA99CA593C2DF569B606D64E989420C7DA5C9C6095B1D7B4B619FF` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `7DB1CAAFB2E6FE338C92F32C3A95EE1C2BEE94AEB95FE07973FD0F92A13BB556` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `735048B69E92E559366237AFB8122E3D86AC54FE3BF5FBC369A754DFD6722645` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `6D533653FF448718D6E2557B5D8B718C09F3B5A4C88703D584B566B88D04F97B` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-d — Ronda 0
Veredicto: ronda 0, de adaptación (no cuenta en el tope de 3), **completa en la reescritura, con dos hallazgos del inventario y una PA-07 en la corrida 1 que decide el orquestador**.
- Reescribí 4 casos: 2 de C-2 y C-13 que quedan en rojo (los esperados) y 2 de C-13 que quedan en verde antes y después (como C-19 en c).
- **T-36 y T-37 (hallazgos, sin reescribir):** d contradice 45 casos `*.ataque` del muro del frontend que ningún C-n cubre. Son `adjuntos` en `publicacionSchema` y `archivoIds` en el cuerpo de crear publicación. Los demostré con una copia de `shared/dist` en el scratchpad, sin tocar producción (PA-15).
- **Enmienda 7:** d desborda 4 pruebas normales con listas o formas cerradas (detalle abajo). Tres de ellas no están autorizadas hoy.
- **PA-07:** la corrida 1 del backend (CHORE-02) trae un `P2028` nuevo, fuera de los dos aceptados y de los de AUTH, en `POST …/comentarios`. La corrida 2 sale limpia.

Verificación propia: lint del backend con código 0 (`> tsc -p tsconfig.json --noEmit`) · lint del frontend con código 0 (`> tsc -b`) · test del frontend `Tests  1 failed | 1292 passed (1293)` · test del backend `Tests  1 failed | 1225 passed (1226)` (corrida 2; la corrida 1 cayó por la espera en cadena de CHORE-02). En los dos paquetes, el único rojo es el esperado.

Base `<Cc>` = `c7fcece` dentro de los paquetes. Rama `feat/clases`. Fecha: 2026-10-02.

### Precondiciones
- **Rama y base:** `feat/clases`; `git log -1 --oneline` → `c7fcece feat(clases): parte c (muro con publicaciones y comentarios, avisos encolados, contenido visible y triviales de b)`; `git cat-file -e 'c7fcece^{commit}'` → código 0.
- **Árbol:** al empezar, `git status --porcelain` listaba `M docs/ESTADO.md` y `M docs/trabajo/CLASES-01-clases-y-muro/aprobacion.md`. Durante la ronda aparecieron, también del orquestador, `M AGENTS.md` y `M .claude/agents/arquitecto.md` (anunciados en el encargo como decisiones del humano de hoy). Todo es documentación fuera de los paquetes, así que no activa PA-02.
  - **Dentro de los paquetes:** `git diff --quiet c7fcece -- shared backend frontend` → código 0, y `git status --porcelain --untracked-files=all -- shared backend frontend` vacío.
- **V-01:** comparé por programa los SHA-256 de todas las `*.ataque` de `git ls-files -co --exclude-standard` (Git Bash `sha256sum`, en mayúsculas) con la tabla de "CLASES-c — Ronda 4, regresión final", extraída del reporte, usando `diff`. Resultado: **97 de 97 iguales**, sin faltantes ni sobrantes (`V01-OK`).
- **PA-01**, antes de cualquier prueba del backend:
  - `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `Enabled True`, `Direction Inbound`, `Action Block`, `Profile Public`;
  - `Get-NetConnectionProfile` → `Name IZZI-F281-5G`, `NetworkCategory Public` (declarada de confianza por el humano);
  - Docker Desktop encendido (`docker version` → servidor 28.5.1). `docker ps -a` estaba vacío: hoy no están levantados los contenedores de `infra/`, y la suite no los necesita (Testcontainers).

### Archivos tocados: cuatro `*.ataque` existentes
1. `backend/test/sesiones-y-cadena.ataque.test.ts` (C-2).
2. `frontend/src/styles/clases-r1.ataque.test.ts` (C-13, `enEspera=`).
3. `backend/src/config/env.ataque.test.ts` (C-13, `STORAGE_*`).
4. `backend/test/arranque-r1.ataque.test.ts` (C-13, `STORAGE_*`; caso fuera del inventario, porque el inventario solo preveía la firma de `construirApp`).

- No toqué código de producción ni pruebas normales, y no creé archivos de pruebas.
- `git diff --quiet c7fcece -- shared backend/src frontend/src/app frontend/src/features frontend/src/components frontend/src/services frontend/src/lib` → código **1**. Se debe solo a las `*.ataque` que toqué: `backend/src/config/env.ataque.test.ts` está bajo `backend/src`. Con `':(exclude,glob)**/*.ataque.test.*'`, el mismo comando da código 0. `git diff --name-only c7fcece -- shared backend frontend` lista únicamente los cuatro archivos de arriba, y no hay nada sin rastrear dentro de los paquetes.
- Formato, solo esos cuatro y desde su paquete:
  - `cd backend; npx prettier --write test/sesiones-y-cadena.ataque.test.ts src/config/env.ataque.test.ts test/arranque-r1.ataque.test.ts`;
  - `cd frontend; npx prettier --write src/styles/clases-r1.ataque.test.ts`.

  Los cuatro: `(unchanged)`.
- **Invisibles:** busqué por programa (Node, `\p{Cf}`, `\p{Zs}` salvo el espacio, `\p{Cc}` salvo el salto y el tabulador) en las líneas agregadas del diff → `SIN-INVISIBLES`.

### Qué cambió y qué sigue protegiendo
- **C-2, `backend/test/sesiones-y-cadena.ataque.test.ts:492`** ("bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a, CLASES-b, CLASES-c y CLASES-d: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros"):
  - La lista exacta pasa de 54 a **56** con las 2 rutas de V-06 (d): `POST /api/clases/:claseId/archivos` y `POST /api/clases/:claseId/archivos/:archivoId/descarga`, ambas `POST` y sin `HEAD`.
  - Las inserté en el orden de `sort()`, calculado por programa: van después de `POST /api/clases/:claseId/alumnos`. Comprobé después, también por programa, que la lista queda ordenada, sin repetidos, sin ninguna ruta con "movimiento" y sin `HEAD` de archivos.
  - El título suma "CLASES-d", y un comentario nuevo explica por qué ninguna de las dos crea cuentas ni cambia roles y por qué ninguna es pública.
  - **Análisis por sangría con las rutas nuevas:** lo simulé con Fastify del repositorio en el scratchpad (`simular-rutas.mjs`). `printRoutes({ commonPrefix: false })` anida `/archivos (POST)` bajo `/:claseId` y `/:archivoId/descarga (POST)` bajo `/archivos`. El analizador de la prueba reconstruye las dos rutas, sin líneas sin reconocer.
  - **Sigue protegiendo lo mismo:** la igualdad es exacta; una línea no reconocida hace fallar la prueba; cualquier ruta de más o de menos la pone en rojo; ninguna ruta crea administradores, y siguen creando maestros solo las tres de hoy.
  - **`RUTAS_PUBLICAS`:** ninguna `*.ataque` la enumera. Hoy tiene exactamente 10 (`middleware/rutas-publicas.ts`, que en d está en "No se toca" por `src/middleware/**`). Una ruta pública nueva sería, además, una ruta nueva en esta lista exacta. No agregué aserciones.
- **C-13 (`enEspera=`), `frontend/src/styles/clases-r1.ataque.test.ts:126`** ("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 36 enEspera"):
  - El total pasa de 35 a **36**.
  - La lista fija suma `/src/features/clases/components/adjuntos-de-publicacion.tsx` con 1 ("Descargar" de la ficha, §D-D5).
  - **Patrón de las rondas 0 anteriores, sin cambios:**
    - los archivos con 0 fijo siguen igual;
    - el resto de `features/clases/components/` sigue sumando exactamente 3 (el buscador, el roster o sus filas), con `buscador-alumnos.tsx` ≤ 1 y `tabla-alumnos.tsx` entre 1 y 2;
    - el resto de `features/admin/components/` sigue en 2.
  - **Por qué no hay "o el componente de su fila" para "Descargar":** "Cambios por capa" no autoriza otro archivo de componente para la ficha.
  - **`lista-de-adjuntos-elegidos.tsx`** ("Quitar" solo cambia estado local) no va en la lista fija: un `enEspera=` ahí sería uno de más en el resto y pondría la prueba en rojo. No le puse un 0 fijo porque el resto ya lo cubre, como con `con-clase-de-la-ruta.tsx` en c.
  - **Sigue protegiendo lo mismo:** ningún `disabled` en JSX; `aria-busy` y `aria-disabled` solo en `button.tsx`; el número y el lugar de los botones en espera cambian solo con el plan.
- **C-13 (`STORAGE_*`), `backend/src/config/env.ataque.test.ts:10-29`** (el ayudante `enProduccion` que usan los cuatro casos de "ataque: JWT_SECRET en production", `:31`, `:36`, `:47` y `:52`):
  - **Contradicción:** el archivo no compara el objeto completo, pero sí lo contradice §D-D2. En `production`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY` serán obligatorias, y el ayudante solo pasaba `DATABASE_URL`, `NODE_ENV` y `JWT_SECRET`.
    - "rechaza 31 caracteres y acepta 32 (frontera exacta)" caería en su mitad "acepta 32".
    - Los tres rechazos seguirían en verde, pero por el almacén y no por `JWT_SECRET`: se debilitarían en silencio.
  - **Qué cambió:** el ayudante suma un almacén válido y fijo (`almacenDeProduccion`: un endpoint `https`, una llave y un secreto ficticios), con un comentario que cita C-13.
  - **Sigue protegiendo lo mismo:** la frontera exacta de 32, el literal de `.env.example` con blancos, el secreto de solo blancos y que ningún mensaje repita el valor recibido.
    - Como "acepta 32" usa el mismo almacén y tiene que dar `ok`, cualquier rechazo del bloque sigue siendo por `JWT_SECRET`.
    - El bloque de `validarEnvAdmin` (`:62`) no cambia.
  - **Estado:** en verde antes y después. Hoy `envSchema` descarta las claves que no conoce.
- **C-13 (`STORAGE_*`), caso fuera del inventario: `backend/test/arranque-r1.ataque.test.ts:79`** ("el worker en production sin RESEND_API_KEY ni remitente propio no arranca y no imprime valores"):
  - **Contradicción:** `src/worker.ts` (en "No se toca") llama a `cargarEnv()` antes que a `cargarEnvCorreo()`. Con §D-D2, el worker en `production` sin `STORAGE_*` saldría con código 1 por el almacén, antes de mirar el correo. La salida ya no nombraría `RESEND_API_KEY` ni `CORREO_REMITENTE`, y el caso caería.
  - **Qué cambió:** el entorno del proceso suma `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY` válidos, con un comentario que cita C-13. Así, la única configuración que falta sigue siendo la del correo.
  - **Una aserción más:** `expect(salida).not.toContain("secreto-del-almacen-del-ataque")`. El título promete "no imprime valores", y ahora el proceso recibe un secreto del almacén (PA-10).
  - **Sigue protegiendo lo mismo:** código 1, nombra las dos variables del correo, no imprime el remitente y no llega a `worker_listo`.
  - **Estado:** en verde antes y después. Hoy el worker ignora `STORAGE_*`.
  - **Los otros dos casos del archivo no se tocan:**
    - la API con la base caída corre en `development`, donde `STORAGE_*` es opcional;
    - `preparar-cola.ts` no usa `config/env.ts`.
  - **La firma de `construirApp`:** `arranque-r1` no la llama, y no hay que adaptarla por eso (ver abajo).

### Lo que busqué y no hubo que reescribir
- **`construirApp(` (C-13):** las 27 llamadas de las `*.ataque` del backend son `construirApp({ env })`, `construirApp({ env: cargarEnv() })` o `construirApp({ env: { ...env, INVITACIONES_LIMITE_DIARIO: limite } })`.
  - Ninguna fija la aridad, la firma exacta ni `Parameters<typeof construirApp>`.
  - Con `almacen?: Almacen | null` opcional (§D-D2), siguen compilando y, sin `STORAGE_*` en el entorno de las pruebas (`backend/.env` no se lee, CHORE-01), construyen la app con `almacen` en `null`.
  - Ninguna `*.ataque` arma un `Env` literal: todas parten de `cargarEnv()` y lo extienden con `...env`, así que las claves nuevas con valor por defecto (`STORAGE_REGION`, `STORAGE_BUCKET_PRIVADO`) no rompen el tipo.
- **`validarEnv`, `cargarEnv` y las variables de entorno:**
  - `correo.ataque` usa `validarEnvCorreo`, que d no toca.
  - `logger.ataque` usa `cargarEnv()` en `test`.
  - Los procesos hijos de `logs-*` y `api-real` (el de logs) arrancan en `development`.
  - **`api-real.ataque.test.ts:286`** ("con el JWT_SECRET de .env.example la API no arranca y no imprime el secreto") corre en `production` sin `STORAGE_*`. No queda contradicho: el caso afirma código 1 y que la salida **contiene** `JWT_SECRET: en production`, y con §D-D2 la salida contendrá además los errores de `STORAGE_*`.
    - Lo comprobé con el zod del repositorio (4.6.5, `zod-cadena.mjs` en el scratchpad): dos `superRefine` encadenados informan las dos incidencias, porque las de `ctx.addIssue` son continuables.
    - Solo caería si la implementación de §D-D2 dejara de informar la de `JWT_SECRET`, lo que sería un defecto (`formatearIncidencias` lista todas).
- **Dependencia `minio` y módulos de `adapters/`:**
  - `arquitectura-cuentas-r1` prohíbe AWS (`aws-`, `@aws-sdk/`, `aws-sdk`) y otras librerías de correo y de cola en los cuatro `package.json`; `minio` no coincide con el patrón.
  - Ninguna `*.ataque` cierra la lista de dependencias de `backend/package.json`, la de módulos de `adapters/` ni prohíbe `from "minio"`.
  - Las únicas restricciones de importación cerradas son `pg-boss` en `adapters/queue/index.ts` y `resend` en `adapters/notifier/resend.ts`.
- **`fetch(` en `frontend/src/` (C-13; `services/almacenService.ts`):** ninguna `*.ataque` afirma que solo `services/apiClient.ts` llame a `fetch`.
  - `features/admin/cuentas-r1.ataque.test.tsx:518` ("ningún fetch fuera de services/apiClient (regla 8)") recorre solo `features/admin/**` (`import.meta.glob("./**/*.{ts,tsx}")`), así que no la contradice.
  - Las demás menciones de `fetch` en `*.ataque` son dobles con `vi.stubGlobal("fetch", …)`.
- **Pruebas estáticas** (`import.meta.glob`, `readdirSync`, `?raw`):
  - `styles/clases-r1` solo cambia por C-13. V-07 (vidrio) y V-13 (`text-danger` y `text-destructive`) no cambian, porque la ficha de §D-D5 es sólida (`bg-muted`) y los errores van con `ErrorDeCampo`.
  - `components/layout/estatico-r1`, `features/clases/estatico-r1` y `styles/tokens-r1` (lee §3 y §4 de `DESIGN.md`; d agrega §7.19).
  - `components/ui/badge-03b-r1`, `features/admin/cuentas-r1`, `features/admin/maestros-03b-r1` y `features/clases/clases-r4`.
  - `backend/test/arquitectura-cuentas-r1`, y los recorridos de `muro-c-r1` (`:615`, nombres de colas, y `:1101`, copia de la regla de contenido visible) y de `muro-c-r2:321` (copia de `normalizarTextoLargo` en el frontend).

  Ninguna cuenta ni lista algo que d cambie, salvo el `enEspera=` de C-13. `target="_blank"` y `dangerouslySetInnerHTML` siguen en 0 (`estatico-r1` prohíbe además `<a … href="…">` literal y `javascript:`).
- **Tablas, migraciones, modelos, enums, colas y SQL** (`information_schema`, `pg_tables`, `pg_class`, `pg_type`, `pg_enum`, `pg_sequences`, `_prisma_migrations`, `prisma/migrations`, `dmmf`, `ModelName`, `schema.prisma`, `OPCIONES_DE_COLAS`, `describirCola`, `$queryRaw` y `$executeRaw`, en `*.ataque` y en pruebas normales):
  - 0 listas cerradas de tablas, migraciones, modelos ni enums.
  - `describirCola` solo en `cola.integracion` y `muro.integracion` (normales, con colas concretas; d no agrega colas).
  - `$queryRaw`: `arquitectura-cuentas-r1:69` cierra solo `$queryRawUnsafe` (1, `adapters/db/cliente.ts`) y `$executeRawUnsafe` (0). `alumnos-b-r1:1107` lo prohíbe solo en `adapters/db/inscripciones.ts` (en "No se toca" de d). Las demás apariciones son consultas de la propia prueba.
  - La tabla `archivos` (§D-D1), con `FK ON DELETE RESTRICT` en `subido_por`, no afecta a las `*.ataque`: ninguna crea archivos, así que sus limpiezas de usuarios no chocan.
- **`staleTime: 240_000` en `usePublicaciones` (§D-D5):** comprobé que no rompe la recuperación del muro tras el `400` del cursor, que protegen `muro-c-r2` ("tras el 400 del cursor, volver a entrar al muro lo recupera…") y `muro-recuperar-c-r3` ("cambiar a «Personas» y regresar a «Muro»…").
  - Simulé el caso con el `@tanstack/query-core` del repositorio (5.103.2, `stale-muro.mjs` en el scratchpad): primera página, `fetchNextPage` con error, se desmonta y se vuelve a montar con el mismo cliente.
  - Con `staleTime` en 0 y en 240,000, el montaje nuevo hace 1 petición y sale del error. Al fallar, la consulta queda con `isInvalidated: true`, y una consulta invalidada se trata como vencida aunque no haya pasado su `staleTime`.
- **C-18, C-19 y C-20:** sin relación con d. Ninguna otra `*.ataque` simula `./hooks` con una fábrica cerrada; d agrega `useSolicitarSubida` y `useUrlDeDescarga`, y `inicio-sin-datos-r2` monta los inicios, no el muro.

**Restricciones que ya existen en las `*.ataque` y que d debe respetar** (no son hallazgos; son notas para el programador):
1. **`components/layout/estatico-r1`:**
   - 0 `javascript:` en líneas de código de `src/`, salvo comentarios que empiecen con `//` o `*`. `almacenService.ts` debe validar con una lista de permitidos (`http:` y `https:`), sin escribir el literal `javascript:`.
   - 0 `<a … href="…">` literal.
   - `animate-` solo en `cargando.tsx` y `button.tsx`: el indicador de "Descargar" sale de `enEspera`.
   - Solo los 7 valores arbitrarios de la lista.
   - 0 `Ocultar` en un `.tsx`.
2. **`features/clases/estatico-r1`:** 0 `?? []` en `features/clases` (por ejemplo, `adjuntos ?? []` o `archivoIds ?? []`) y ningún ternario anidado en JSX.
3. **`styles/clases-r1`:**
   - ningún `disabled` en JSX, tampoco en el `<input type="file">` oculto;
   - `bg-muted` sin `/NN`;
   - sin `text-danger` en `features/`;
   - sin clases de las escalas anuladas.
4. **`muro-c-r2:321`:** ningún archivo de `frontend/src` puede contener la expresión `\r\n|\r` ni definir `normalizarTextoLargo` (atención si el nombre de un archivo elegido se limpia en el frontend).
5. **`muro-c-r1:615`:** las colas de avisos solo se nombran en `adapters/queue/colas.ts`, `core/eventos/avisos-de-clase.ts` y `handlers/clases/muro.ts`.

### Listas cerradas en pruebas normales que d desborda (Enmienda 7)
Las busqué con los mismos patrones que en las `*.ataque` (rutas, variables de entorno, dependencias, módulos de `adapters/`, firma de `construirApp`, `fetch(`, tablas, migraciones, colas y SQL etiquetado). Además busqué las formas cerradas que d cambia: el objeto `Env` completo, el cuerpo exacto de crear publicación y la forma de la publicación. No las reescribo: son del programador. Las listo para que el plan las autorice, o confirme que ya lo están, antes de programar.

| # | Archivo:línea | Título | Qué lista o forma cierra | Qué hace d | ¿Autorizada hoy? |
|---|---|---|---|---|---|
| N-1 | `backend/src/config/env.test.ts:10` (aserción en `:16`) | "acepta el mínimo (DATABASE_URL y JWT_SECRET) y aplica los valores por defecto" | `toEqual` con el objeto `Env` completo (7 claves) | Suma `STORAGE_REGION` (`us-east-1`) y `STORAGE_BUCKET_PRIVADO` (`campus-privado`) por defecto: **rojo** | **No.** El archivo está en la lista de d ("existentes que se modifican"), pero su columna solo nombra PR-D02a a PR-D02c (casos nuevos); cambiar este caso existente no está dicho |
| N-2 | `backend/src/config/env.test.ts:184` | "acepta en production un JWT_SECRET propio de 32 caracteres o más" | `ok: true` en `production` con solo `DATABASE_URL` y `JWT_SECRET` | `production` exige las tres `STORAGE_*`: **rojo** | **No**, por lo mismo que N-1 |
| N-3 | `frontend/src/features/clases/formulario-publicacion.test.tsx` | `:96` "PR-C09b: publicar limpia el formulario, avisa e invalida la lista" (cuerpo en `:107`); `:147` "un material sin descripción se publica con solo el título" (`:158`); `:264` "PR-C15b: un anuncio de 5,000 caracteres más un salto se envía normalizado; uno de 5,001 sin saltos se rechaza en el formulario" (`:270` y `:282`); `:200` "PR-C14a: el aviso de éxito y el de error salen una sola vez, con el formulario montado y desmontado; un error de campo no avisa" | El cuerpo exacto del `POST …/publicaciones` (`toEqual` sin `archivoIds`) y la respuesta doble `publicacionCreada` (`:6`, sin `adjuntos`) | `archivoIds` con `[]` por defecto en `crearPublicacionSchema` y `crear.mutateAsync({ …, archivoIds })` (§D-D4, §D-D5): rojos `:96`, `:147` y `:264`. Si `adjuntos` es obligatorio en `publicacionSchema`, la respuesta doble no pasa `publicacionRespuestaSchema`: rojos `:96`, `:147`, `:200` y `:264` | **No.** Está en la lista de d como "del propio encargo que se extiende": solo se le **agregan** casos (PR-D11a a PR-D12c), y los existentes no se reescriben (PA-16) |
| N-4 | `frontend/src/features/clases/muro-view.test.tsx` | `:91` PR-C09d, `:134` PR-C11b, `:168` "al borrar una publicación con el foco en su «Sí, borrar»…", `:221` PR-C17, `:266` y `:290` PR-C18 | Doble `publicacion()` (`:27`) sin `adjuntos` | Si `adjuntos` es obligatorio, la lista no pasa `listaPublicacionesRespuestaSchema` (`apiClient` hace `schema.parse`): **6 rojos** | **No.** No está en la lista de d (PA-16) |
| N-5 | `frontend/src/features/clases/publicacion-del-muro.test.tsx:23` | El constructor `publicacion(): Publicacion` que usan todos los casos del archivo | Objeto tipado con `Publicacion` (de `types.ts`, inferido de `shared/`) sin `adjuntos` | Si `adjuntos` es obligatorio, `tsc -b` (parte de `npm run lint`) falla en `:23`. Además, si `PublicacionDelMuro` lee `publicacion.adjuntos` sin guarda, los casos caen al pintar. No lo pude correr: el componente de d no existe | **No.** No está en la lista de d (PA-16) |
| — | `backend/test/bloqueo-usuario.integracion.test.ts:680` | "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts y publicaciones.ts usan SQL etiquetado en adapters/db" | Lista cerrada de archivos de `adapters/db` con `$queryRaw` o `$executeRaw` | **No la desborda** si d cumple V-04 y la Enmienda 7 punto 4: d no agrega SQL etiquetado (el `UPDATE … WHERE id IN (…) AND … creado_en > …` de §D-D3 se expresa con `updateMany`; `publicaciones.ts` ya está en la lista). Un `$queryRaw` en `archivos.ts` la pondría en rojo (PA-16) | No aplica |

**Cómo los comprobé (N-3 y N-4):**
- Copié `shared/dist` al scratchpad en tres variantes:
  - `control`, sin cambios;
  - `adjuntos`, con `adjuntos: z.array(z.object({ id, nombre, tipo, tamano, vistaPrevia: { url, expiraEn } | null }))` obligatorio en `publicacionSchema`;
  - `archivoids`, con `archivoIds: z.array(z.uuid()).max(5).default([])` en las dos ramas de `crearPublicacionSchema`.
- Corrí los 9 archivos del muro con un `vitest.config` del scratchpad (`vitest-d.config.mts`), que solo agrega el alias de `@campus/shared` a la copia. No toqué producción (PA-15).
- **Resultados:**
  - `control`: `Tests  84 passed (84)`;
  - `archivoids`: `Tests  4 failed | 80 passed (84)`;
  - `adjuntos`: `Tests  55 failed | 29 passed (84)`.
- Los rojos de las pruebas normales son exactamente los de N-3 y N-4.

**Pruebas normales revisadas que d no desborda:**
- Ninguna cierra la lista de rutas. `movimientos-inscripcion.integracion.test.ts:243` solo exige que ninguna contenga "movimiento".
- Ninguna cierra variables de entorno, salvo `env.test.ts`, ni dependencias, módulos de `adapters/` o `fetch(`.
- Ninguna recorre el código, salvo `styles/tokens.test.ts`, que lee `tokens.css`, y d no toca `styles/**`.
- Ninguna cierra tablas, migraciones ni modelos.
- `cola.integracion.test.ts` y PR-C07 de `muro.integracion.test.ts` describen colas concretas, y d no agrega colas.
- `muro.integracion` y `muro-autorizacion.integracion` no comparan la publicación ni el cuerpo de crear con `toEqual` cerrado.
- `auth-registro.integracion.test.ts:176` arma `construirApp` con `NODE_ENV: "production"` sin pasar por `validarEnv`. Sigue valiendo mientras `construirApp` acepte `almacen` en `null` en `production`; §D-D2 no dice lo contrario.

**Observaciones para la autorización:**
- `env.test.ts:114` y `:130` no se ponen en rojo, pero `:130` ("en production también rechaza el ejemplo con blancos alrededor…") solo afirma `ok: false`. Con §D-D2, pasaría también por la falta del almacén y se debilitaría en silencio (el mismo problema que corregí en `env.ataque`).
- `worker.ts` usa el mismo `cargarEnv()`: con §D-D2, **el worker en `production` también exige `STORAGE_*`**, aunque en d no use el almacén. No lo contradice ningún documento que yo conozca, pero el despliegue de `prod` tendrá que pasarle esas variables también al worker.

### Hallazgos
#### T-36 — `adjuntos` en `publicacionSchema` contradice 45 casos `*.ataque` del muro del frontend, y ningún C-n los cubre
Severidad: media (inventario de §D-R0 incompleto; sin corregirlo, el programador cae en PA-06 al cerrar d)

Prueba: no se puede automatizar sin tocar `shared/` (PA-15). Reproducción (scratchpad):
1. Copia `shared/dist/*.js` a `<scratchpad>/shared-adjuntos/`.
2. En `<scratchpad>/shared-adjuntos/clases.js`, agrega a `publicacionSchema` el campo `adjuntos` de §D-D3, punto 4 (`z.array(z.object({ id, nombre, tipo, tamano, vistaPrevia: z.object({ url, expiraEn }).nullable() }))`, sin valor por defecto, como lo dice §D-D4).
3. Desde `frontend/`: `VARIANTE_D=adjuntos npx vitest run --config <scratchpad>/vitest-d.config.mts` con los 6 archivos de abajo. El control (`VARIANTE_D=control`) da `84 passed`.

Esperado / Obtenido:
- **Esperado (plan, §D-R0 y "Ronda 0", punto 2):** toda `*.ataque` que contradiga un cambio de d aparece en un C-n, para que la ronda 0 la adapte.
- **Obtenido:** sus dobles de publicación (`id`, `tipo`, `titulo`, `texto`, `autor`, `creadoEn` y `comentarios`, sin `adjuntos`) dejan de pasar `listaPublicacionesRespuestaSchema` y `publicacionRespuestaSchema` (`apiClient` hace `schema.parse`). La consulta queda en `isError` y caen 45 casos:
  - `frontend/src/features/clases/muro-c-r1.ataque.test.tsx`: 16 de 22. Siguen en verde los 5 de `ConClaseDeLaRuta` y el de "Agregar a la clase";
  - `frontend/src/features/clases/muro-c-r2.ataque.test.tsx`: 11 de 11;
  - `frontend/src/features/clases/muro-c-r3.ataque.test.tsx`: 14 de 15. Sigue en verde la precondición del cotejo;
  - `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx`: 3 de 3;
  - `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx`: 1 de 1.

  `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` no cae (2 de 2), porque solo usa listas vacías.

Requisito o regla violada: plan, §D-R0 ("El tester reescribe **solo** los casos `*.ataque` que contradicen estos cambios") y C-13, que no incluye `adjuntos`; `AGENTS.md`, "Reglas del equipo" (el programador no toca `*.ataque`).
- No los reescribí: ningún C-n los cubre ("Casos fuera del inventario").
- **Lo que tiene que decidir el plan:** cómo quedan esos dobles. Una opción es un C-n que autorice sumar `adjuntos: []` a los constructores y a los objetos en línea de esos 5 archivos, sin tocar aserciones. La otra es definir `adjuntos` de otra forma en `shared/`. Esto mismo alcanza a N-3, N-4 y N-5.

#### T-37 — `archivoIds` en el cuerpo de crear publicación contradice un caso `*.ataque` que fija el cuerpo exacto
Severidad: media (mismo motivo que T-36)

Prueba: `frontend/src/features/clases/muro-c-r2.ataque.test.tsx:385`, "material con extremos en blanco en el título y la descripción: se envían normalizados" (aserción en `:398`). Reproducción: la de T-36 con la variante `archivoids` (`archivoIds: z.array(z.uuid()).max(5).default([])` en las dos ramas de `crearPublicacionSchema`), con `Tests  4 failed | 80 passed (84)`.

Esperado / Obtenido:
- **Esperado:** el caso aparece en un C-n de d.
- **Obtenido:** el formulario envía `resultado.data` del `safeParse` (T-31), que con el valor por defecto ya trae `archivoIds: []`. §D-D5 lo manda además de forma explícita (`crear.mutateAsync({ …, archivoIds })`). El `toEqual({ tipo, titulo, texto })` cae porque sobra `archivoIds: []`.

Requisito o regla violada: plan, §D-R0 y C-13.
- No lo reescribí. Si el plan lo autoriza, el cambio sería sumar `archivoIds: []` al objeto esperado, que sigue protegiendo la normalización de T-31.
- El mismo cambio desborda N-3 (`formulario-publicacion.test.tsx`: `:107`, `:158`, `:270` y `:282`).

### Rojos esperados (2) y casos reescritos en verde (2)
| # | Archivo:línea | Título | C-n | Estado en mi corrida |
|---|---|---|---|---|
| 1 | `backend/test/sesiones-y-cadena.ataque.test.ts:492` | "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a, CLASES-b, CLASES-c y CLASES-d: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros" | C-2 | **Rojo comprobado** en las dos corridas: `expected [ …(54) ] to deeply equal [ …(56) ]`. En el diff faltan exactamente `POST /api/clases/:claseId/archivos` y `POST /api/clases/:claseId/archivos/:archivoId/descarga`, y no sobra ninguna |
| 2 | `frontend/src/styles/clases-r1.ataque.test.ts:126` | "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 36 enEspera" | C-13 | **Rojo comprobado:** `expected [ …(35) ] to have a length of 36 but got 35` (`:133`) |
| — | `backend/src/config/env.ataque.test.ts:31`, `:36`, `:47` y `:52` (ayudante en `:10-29`) | "rechaza 31 caracteres y acepta 32 (frontera exacta)", "rechaza el literal de .env.example con espacios alrededor (sigue siendo el secreto público)", "rechaza un secreto formado solo por espacios en blanco" y "ningún mensaje de error repite el valor recibido" | C-13 | **En verde antes y después:** hoy `envSchema` descarta las claves `STORAGE_*`; con d, las exige en `production` y el ayudante ya las trae |
| — | `backend/test/arranque-r1.ataque.test.ts:79` | "el worker en production sin RESEND_API_KEY ni remitente propio no arranca y no imprime valores" | C-13 (fuera del inventario) | **En verde antes y después:** hoy el worker ignora `STORAGE_*`; con d, `cargarEnv()` las exige en `production` y el caso ya las trae |

Además, d contradice 45 casos más (T-36 y T-37) que **no** reescribí ni están en esta lista, porque ningún C-n los cubre. Si el plan no los autoriza antes de programar, caerán cuando el programador cambie `shared/` y activarán PA-06.

### Casos fuera del inventario
- **Con C-n (reescrito):** `backend/test/arranque-r1.ataque.test.ts:79`, por C-13 (`STORAGE_*` en `config/env.ts`). El inventario solo preveía `arranque-r1` por la firma de `construirApp`, que ese archivo no usa.
- **Sin C-n (hallazgos, sin reescribir):** T-36 (45 casos en 5 archivos) y T-37 (1 caso, incluido en los 45).

### PA-07
Conté con `grep -c` sobre la salida completa de `npm test` del backend (`cd backend; npm test > r0d-back-test-N.txt 2>&1`, en el scratchpad). El sitio y la llamada de cada `P2028` salen del JSON del log de pino.

| Corrida | Situación | 40P01 | deadlock detected | could not serialize | too many clients | P2028 (líneas) y sitio |
|---|---|---|---|---|---|---|
| 1 | CHORE-02: `Test Files  7 failed \| 104 passed (111)` · `Tests  9 failed \| 1217 passed (1226)` · `Duration 107.30s` | 0 | 0 | 0 | 0 | 5 líneas: 3 de log y 2 del título y el extracto del caso de `cuentas-r3`. Los 3 de log: (1) `tx.sesion.create()` en `adapters/db/sesiones.ts:39` (login), 39933 ms, aceptado; (2) `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116` (restablecer), 6038 ms, aceptado; (3) **nuevo, fuera de los aceptados y de los de AUTH:** `prisma.$queryRawUnsafe()` en `adapters/db/cliente.ts:60` (`executeSql`), llamado desde `encolar` en `adapters/queue/index.ts:61`, a los 36658 ms de abrir la transacción, en `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios`. Respondió `500 ERROR_INTERNO` e hizo caer el caso "emojis compuestos y otros alfabetos se aceptan en el nombre, el título, el anuncio y el comentario" de `muro-c-r1.ataque.test.ts`, con el comentario `"数学"` |
| 2 | limpia salvo C-2: `Test Files  1 failed \| 110 passed (111)` · `Tests  1 failed \| 1225 passed (1226)` · `Duration 48.53s` | 0 | 0 | 0 | 0 | 2, los aceptados: `sesiones.ts:39` (6457 ms) y `tokens-cuenta.ts:116` (6045 ms) |

- **Corrida 1, aparte de C-2 y del `P2028` nuevo:** todo cayó por tiempo límite de la espera en cadena (CHORE-02):
  - 5 `Test timed out in 15000ms`, 1 de 30,000 ms, 1 de 40,000 ms y 1 `Hook timed out in 10000ms`;
  - en `alumnos.integracion` PR-B04b y PR-B04c, `bloqueo-usuario` A1, `clases-autorizacion` PR-A15h (y su hook), los dos de `cuentas-r1` (el del `LOCK TABLE` y el del 429) y el de `cuentas-r3`.
- **Sobre el `P2028` nuevo:**
  - Es código de c, no de d.
  - Su transacción esperó 36 s, el mismo intervalo que el `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE` de `cuentas-r1:130`. Lo más probable es que la comprobación de la `FK` de `comentarios.autor_id` contra `usuarios` quedara detrás de ese bloqueo. Es la misma familia que CHORE-02 y que los `P2028` de AUTH: una transacción interactiva de Prisma (5 s) que espera un bloqueo externo.
  - No lo había visto en ninguna ronda de c, y no está en `ESTADO.md`.
  - **PA-07 se activa con la corrida 1.** Seguí el procedimiento del encargo para CHORE-02: repetí la corrida una vez, y salió limpia. No hice nada más después de verlo. La decisión es del orquestador.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (rama, base y árbol de los paquetes en orden; V-01 97 de 97).
- **PA-06:** no se activó en mi ronda: en las corridas limpias, el único rojo de cada paquete es el esperado, y los dos esperados están en rojo. **Riesgo para el programador:** T-36 y T-37 lo activarán al cambiar `shared/` si el plan no los resuelve antes.
- **PA-07:** **activada en la corrida 1** por el `P2028` nuevo de `encolar` (arriba). La corrida 2 sale limpia.
- **PA-11:** no se activó. La corrida 2 terminó a las 07:44:01, y `docker ps -a` a las 07:46:12 no muestra ningún contenedor. Hoy no están levantados los de `infra/`.
- **PA-14:** no me corresponde (`npm install minio` es del paso 39). No instalé nada.
- **PA-15:** no se activó. Las comprobaciones de T-36, T-37, `staleTime`, `printRoutes` y zod usaron copias en el scratchpad (`shared-*`, `vitest-d.config.mts`, `stale-muro.mjs`, `simular-rutas.mjs` y `zod-cadena.mjs`).
- **PA-16:** no se activó para mí (solo `*.ataque` existentes de los C-n). Para el programador, N-1 a N-5 lo activarían sin autorización del plan.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `git log -1 --oneline` | `c7fcece feat(clases): parte c (muro con publicaciones y comentarios, avisos encolados, contenido visible y triviales de b)` | base correcta |
| `git diff --quiet c7fcece -- shared backend frontend` (al empezar) | (sin salida) | código 0 |
| V-01: `sha256sum` de las `*.ataque` contra la tabla de la ronda 4 de c, con `diff` | `V01-OK` (97 y 97) | coincide |
| `Get-NetFirewallRule …` / `Get-NetConnectionProfile` | `Profile : Public` / `Name : IZZI-F281-5G` | en orden |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `cd frontend; npm test` | `Test Files  1 failed \| 95 passed (96)` · `Tests  1 failed \| 1292 passed (1293)` · `Duration 45.17s` | solo C-13 |
| `cd backend; npm test` (corrida 1) | `Tests  9 failed \| 1217 passed (1226)` · `Duration 107.30s` | CHORE-02, el `P2028` nuevo y C-2 |
| `cd backend; npm test` (corrida 2) | `Test Files  1 failed \| 110 passed (111)` · `Tests  1 failed \| 1225 passed (1226)` · `Duration 48.53s` | solo C-2 |
| Simulación de T-36 y T-37 (`VARIANTE_D=control\|archivoids\|adjuntos npx vitest run --config <scratchpad>/vitest-d.config.mts …`, desde `frontend/`) | `Tests  84 passed (84)` / `Tests  4 failed \| 80 passed (84)` / `Tests  55 failed \| 29 passed (84)` | ver T-36 y T-37 |
| `git diff --quiet c7fcece -- shared backend/src frontend/src/{app,features,components,services,lib}` | (sin salida) | código 1, solo por `backend/src/config/env.ataque.test.ts`; con `':(exclude,glob)**/*.ataque.test.*'`, código 0 |
| `git diff --name-only c7fcece -- shared backend frontend` | `frontend/src/styles/clases-r1.ataque.test.ts` | los 4 archivos de la lista y nada más |
| `npx prettier --write` de los 4 archivos, desde su paquete | `(unchanged)` | formateados |

El número de pruebas no cambia: frontend 96 archivos y 1293 pruebas; backend 111 archivos y 1226 pruebas, los mismos del cierre de c.

### Tabla de SHA-256 de todas las `*.ataque` después de la ronda 0 de CLASES-d (97; cambian 4, marcadas). Base de V-01 para el programador de d y para la ronda 1
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` **(cambia, C-13; antes `4FCE3CED…`)** |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` **(cambia, C-13, fuera del inventario; antes `AAE65C95…`)** |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` **(cambia, C-2; antes `0F60A72D…`)** |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `EC149F310ABA10C826D6AF38F093DC018036D3F7F35FA0C08C5604D138C1BC39` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `38B89E3F5A2A927BF49E7FBAE5F732B11F92C9456EFC4730044F46A2722F44B2` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `C27C69F185EA99CA593C2DF569B606D64E989420C7DA5C9C6095B1D7B4B619FF` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `7DB1CAAFB2E6FE338C92F32C3A95EE1C2BEE94AEB95FE07973FD0F92A13BB556` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `735048B69E92E559366237AFB8122E3D86AC54FE3BF5FBC369A754DFD6722645` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` **(cambia, C-13; antes `6D533653…`)** |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-d — Ronda 0, complemento (C-21 y C-22)
Veredicto: complemento de la ronda 0 (Enmienda 10; no cuenta en el tope de 3), **completo**.
- Adapté C-21 en 5 `*.ataque` del frontend: 5 dobles de publicación (4 constructores y 1 objeto en línea), más 2 interfaces de tipo de los dobles. No cambié ninguna aserción.
- Adapté C-22 en 1 cuerpo esperado.
- Los rojos esperados de d son ahora exactamente 3: C-2, C-13 y C-22.
- La simulación confirma que, con `adjuntos` obligatorio y `archivoIds` por defecto, no cae ninguna `*.ataque` del muro, y solo caen las pruebas normales de N-3 y N-4.
- La corrida del backend sale limpia, sin PA-07.

Verificación propia: lint del frontend con código 0 (`> tsc -b`) · lint del backend con código 0 (`> tsc -p tsconfig.json --noEmit`) · test del frontend `Tests  2 failed | 1291 passed (1293)` (C-13 y C-22) · test del backend `Tests  1 failed | 1225 passed (1226)` (C-2; una corrida, limpia).

Base `<Cc>` = `c7fcece`. Rama `feat/clases`. Fecha: 2026-10-02.

### Precondiciones
- **Rama y base:** `feat/clases`; `git log -1` → `c7fcece`; `git cat-file -e 'c7fcece^{commit}'` → código 0.
- **Árbol de los paquetes:** `git diff --name-only c7fcece -- shared backend frontend` listaba exactamente las 4 `*.ataque` de la ronda 0 de d, y no había nada sin rastrear. Fuera de los paquetes, solo documentación del orquestador, del arquitecto y del manager (`plan.md` con la Enmienda 10, `revision.md`, `aprobacion.md`, `ESTADO.md`, `AGENTS.md` y `.claude/agents/arquitecto.md`).
- **V-01:** las 97 `*.ataque` contra la tabla de "CLASES-d — Ronda 0" (extraída del reporte y comparada con `diff`): **97 de 97 iguales** (`V01-OK`).
- **PA-01**, antes del backend: regla `True Inbound Block Public`; red `IZZI-F281-5G`; Docker encendido.

### Archivos tocados (5, todos `*.ataque` del frontend)
| Archivo | Diff | Qué sigue protegiendo |
|---|---|---|
| `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | +6 líneas. La interfaz `PublicacionFalsa` suma `adjuntos: unknown[]`, sin eso `tsc` rechaza la clave en el constructor. El constructor `publicacion()` (`:65`) suma `adjuntos: []` antes de `...extra`. Comentario que cita C-21. Los objetos que antes parecían en línea (`:393`, el de HTML) pasan por el constructor con `extra`, así que quedan cubiertos. **1 doble** | Los 22 casos, igual: avisos de crear con el formulario desmontado, doble envío, formulario igual que el servidor, texto como texto, foco de §7.14, `ConClaseDeLaRuta`, "Agregar a la clase" y foco de los "Ver más" |
| `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | +10 líneas. **C-21:** la interfaz `PublicacionFalsa` suma `adjuntos: unknown[]` y el constructor `publicacion()` suma `adjuntos: []` (**1 doble**; también cubre la respuesta `201` de crear, `publicacion(899)`). **C-22:** el cuerpo esperado de "material con extremos en blanco en el título y la descripción: se envían normalizados" (caso en `:391`, antes `:385`; aserción en `:407`, antes `:398`) suma `archivoIds: []`, con un comentario que cita C-22 (**1 cuerpo**) | T-29, T-30 y T-31 en la interfaz. En el caso de C-22, la normalización de T-31 del título y la descripción, con el cuerpo completo |
| `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | +3 líneas. El único objeto de publicación en línea (en la respuesta de `conPaginas`; su `comentarios: 2` estaba en `:132` antes del cambio, y `adjuntos: []` queda en `:135`) suma `adjuntos: []`, con un comentario que cita C-21. **1 doble** | Los 15 casos de T-34: el texto nuevo solo con el `400` del campo `cursor` |
| `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | +5 líneas. El constructor `publicacion()` suma `adjuntos: []`, con un comentario que cita C-21. **1 doble** | Los 3 casos de recuperación tras el `400` del cursor |
| `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | +5 líneas. Lo mismo. **1 doble** | El caso de T-35 sin peticiones de más |

- **Totales:** 5 dobles de publicación (4 constructores y 1 en línea), 2 interfaces y 1 cuerpo esperado. Ninguna aserción, ningún título y ningún caso cambió, salvo el cuerpo de C-22.
- **Ningún doble se hizo inválido a propósito:** en los cinco archivos no hay ninguno, así que no quedó ninguno sin tocar.
- **Formato:** `cd frontend; npx prettier --write` de los 5 archivos → los 5 `(unchanged)`.
- **Invisibles:** en las líneas agregadas, `SIN-INVISIBLES` (Node: `\p{Cf}`, `\p{Zs}` salvo el espacio, `\p{Cc}` salvo el salto y el tabulador).
- **Árbol:** `git diff --name-only c7fcece -- shared backend frontend` lista las 4 de la ronda 0 y estas 5, y nada más. `git diff --quiet c7fcece -- shared backend/src frontend/src/{app,features,components,services,lib} ':(exclude,glob)**/*.ataque.test.*'` → código 0.

### Búsqueda propia (C-21 y C-22)
- **Dobles de publicación en las `*.ataque` del frontend.** Busqué `creadoEn`, `comentarios:`, `PublicacionFalsa`, `tipo: "anuncio"`, `tipo: "material"` y `publicacion:`.
  - Solo aparecen en los 5 archivos de arriba. En cada uno, cada aparición de `creadoEn` que no es de un comentario ni de una interfaz es el doble adaptado.
  - `muro-rutas-c-r1.ataque.test.tsx` solo responde `{ publicaciones: [], siguienteCursor: null }`. No hay nada que adaptar, y sigue en verde con la simulación.
  - `features/admin/maestros-03b-r1` y `maestros-03c-r1` tienen `creadoEn`, pero de enlaces e invitaciones, no de publicaciones.
- **Backend.** Ninguna `*.ataque` construye una publicación de respuesta, compara su forma completa ni fija su lista de claves.
  - `muro-c-r1`, `muro-c-r2`, `logs-muro-c-r1` y `logs-muro-c-r2` leen solo `publicacion.id`, `publicaciones[].id` o campos sueltos.
  - Los recorridos de claves (`clavesDe` y `clavesEn`) son negativos: claves prohibidas como `estadoPago`, `email` o `rol`. `adjuntos` no está entre ellas, y C-21 no las contradice.
  - `muro-c-r1:952` compara el `safeParse` de `crearPublicacionSchema` con el estado de la API, y el `[]` por defecto de `archivoIds` no cambia si pasa o no. Sus cuerpos de petición son entradas, no cuerpos esperados.
- **Cuerpos completos de crear publicación en las `*.ataque`.** Busqué `JSON.parse`, `cuerpoDe` y `toEqual({` con `tipo:`. Solo `muro-c-r2:407`. Los demás `JSON.parse` de cuerpos son de comentarios (`muro-c-r1:114`, solo lee `texto`), de alumnos (`alumnos-b-r1`, `-r4` y `-r5`, `alumnoId`) o de cuentas (`cache-03a-r1` y `registro-maestro-03b-r1`). No hay otro rojo de C-22.

### Comprobación con la simulación (PA-15, sin tocar producción)
- Usé la misma `vitest-d.config.mts` del scratchpad, que solo agrega el alias de `@campus/shared` a una copia de `shared/dist`. La copia nueva, `shared-ambos`, lleva juntos `adjuntos` obligatorio en `publicacionSchema` y `archivoIds: z.array(z.uuid()).max(5).default([])` en las dos ramas de `crearPublicacionSchema`.
- Corrí los 9 archivos del muro: las 6 `*.ataque`, con `muro-rutas-c-r1`, y las 3 normales.

| Variante | Resultado | Qué cae |
|---|---|---|
| `control` (`shared/dist` sin cambios) | `Tests  1 failed \| 83 passed (84)` | Solo `muro-c-r2:391` (C-22): hoy el formulario no envía `archivoIds` |
| `ambos` (`adjuntos` y `archivoIds`) | `Tests  10 failed \| 74 passed (84)` | **Ninguna `*.ataque`** (tampoco `muro-c-r2:391`). Solo las normales de N-3 (`formulario-publicacion.test.tsx`: PR-C09b, "un material sin descripción…", PR-C14a y PR-C15b) y de N-4 (`muro-view.test.tsx`: PR-C09d, PR-C11b, "al borrar una publicación…", PR-C17 y los dos PR-C18). Son del programador; no las toqué |

N-5 (`publicacion-del-muro.test.tsx`) no cae en la simulación: monta `PublicacionDelMuro` directo, sin `schema.parse`, y la copia no cambia sus tipos. Su efecto (el `tsc` del doble tipado `Publicacion`) solo se verá con el `shared/` real de d.

### Rojos esperados de d (3)
| # | Archivo:línea | Título | C-n | Estado en mi corrida (código real de `c7fcece`) |
|---|---|---|---|---|
| 1 | `backend/test/sesiones-y-cadena.ataque.test.ts:492` | "bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a, CLASES-b, CLASES-c y CLASES-d: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros" | C-2 | **Rojo:** `expected [ …(54) ] to deeply equal [ …(56) ]` |
| 2 | `frontend/src/styles/clases-r1.ataque.test.ts:126` | "V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 36 enEspera" | C-13 | **Rojo:** `expected [ …(35) ] to have a length of 36 but got 35` |
| 3 | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx:391` (aserción en `:407`) | "material con extremos en blanco en el título y la descripción: se envían normalizados" | C-22 | **Rojo ahora:** el formulario de `c7fcece` no envía la clave, y falta `"archivoIds": []` en el cuerpo recibido |

Las otras dos adaptaciones de C-13 (`env.ataque` y `arranque-r1:79`) y las 5 de C-21 siguen en verde antes y después.

### PA-07 (regla del manager para d)
| Corrida | Situación | 40P01 | deadlock detected | could not serialize | too many clients | P2028 y sitio | `500` en rutas del muro o de archivos |
|---|---|---|---|---|---|---|---|
| 1 (`cd backend; npm test > comp-back-test-1.txt 2>&1`) | limpia salvo C-2: `Test Files  1 failed \| 110 passed (111)` · `Duration 52.46s` | 0 | 0 | 0 | 0 | 2, los aceptados: `tx.sesion.create()` en `sesiones.ts:39` (login, 6483 ms) y `tx.tokenCuenta.updateMany()` en `tokens-cuenta.ts:116` (restablecer, 6067 ms) | 0. Los 9 `500` del log son los provocados a propósito (7 de `POST /api/auth/login`, 1 de `POST /api/auth/restablecer` y 1 de `GET /prueba/error-comun`) |

La corrida no cayó por CHORE-02, así que no la repetí. PA-07 no se activa.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (rama, base, árbol y V-01 97 de 97).
- **PA-06:** no se activó. Los 3 rojos esperados están en rojo y no falla nada más.
- **PA-07:** no se activó.
- **PA-11:** no se activó. La corrida terminó a las 08:06:16, y `docker ps -a` a las 08:08:19 no muestra ningún contenedor (hoy no están levantados los de `infra/`).
- **PA-15:** no se activó (la simulación usa copias en el scratchpad).
- **PA-16:** no se activó (solo `*.ataque` existentes de C-21 y C-22).

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| V-01 contra la tabla de "CLASES-d — Ronda 0", con `diff` | `V01-OK` (97) | coincide |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `cd frontend; npm test` | `Test Files  2 failed \| 94 passed (96)` · `Tests  2 failed \| 1291 passed (1293)` · `Duration 45.48s` | C-13 y C-22 |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd backend; npm test` | `Test Files  1 failed \| 110 passed (111)` · `Tests  1 failed \| 1225 passed (1226)` · `Duration 52.46s` | C-2 |
| Simulación `VARIANTE_D=control` / `ambos` | `Tests  1 failed \| 83 passed (84)` / `Tests  10 failed \| 74 passed (84)` | ver arriba |
| `npx prettier --write` de los 5 archivos, desde `frontend/` | `(unchanged)` | formateados |

El número de pruebas no cambia: frontend 96 archivos y 1293 pruebas; backend 111 archivos y 1226 pruebas.

### Tabla de SHA-256 de todas las `*.ataque` después del complemento (97; 5 cambian en el complemento y 4 ya habían cambiado en la ronda 0 de d, todas marcadas). Base de V-01 del programador de d
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` (cambió en la ronda 0 de d, C-13; sin cambios en el complemento) |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` (cambió en la ronda 0 de d, C-13; sin cambios en el complemento) |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` (cambió en la ronda 0 de d, C-2; sin cambios en el complemento) |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` **(cambia en el complemento, C-21; antes `EC149F31…`)** |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` **(cambia en el complemento, C-21; antes `38B89E3F…`)** |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` **(cambia en el complemento, C-21; antes `C27C69F1…`)** |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` **(cambia en el complemento, C-21 y C-22; antes `7DB1CAAF…`)** |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` **(cambia en el complemento, C-21; antes `735048B6…`)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` (cambió en la ronda 0 de d, C-13; sin cambios en el complemento) |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-d — Ronda 1
# Reporte del Tester — CLASES-d (archivos: subida, descarga, adjuntos y vista previa) — Ronda 1
Veredicto: **ROTO**. 6 hallazgos: 0 críticos, 0 altos, 2 medios y 4 bajos. Ninguno es de autorización, de alcance por `archivoId`, de confirmación, de firma ni de logs: todo eso resistió. Los dos medios son del formulario (la lista de archivos sigue editable con la publicación en vuelo) y de «Descargar» (navega a cualquier URL que devuelva la API, incluida `javascript:`).

Verificación propia (regresión, antes de agregar pruebas): lint del backend con código 0 (`> tsc -p tsconfig.json --noEmit`) · lint del frontend con código 0 (`> tsc -b`) · test del backend `Tests  1272 passed (1272)` (una corrida, limpia) · test del frontend `Tests  1316 passed (1316)` (dos corridas). Las cifras con mis pruebas nuevas están en "Comandos y última línea de salida".

Base `<Cc>` = `c7fcece`. Rama `feat/clases`. Fecha: 2026-10-02.

### Precondiciones
- **Rama y base:** `git branch --show-current` → `feat/clases`; `git log -1 --oneline` → `c7fcece feat(clases): parte c (muro con publicaciones y comentarios, avisos encolados, contenido visible y triviales de b)`. El árbol tiene la implementación de d sin commit y documentación (esperado).
- **V-01:** extraje por programa la tabla de "CLASES-d — Ronda 0, complemento (C-21 y C-22)" (desde la línea 4031) y la comparé con `diff` contra `sha256sum` (en mayúsculas) de todas las `*.ataque` de `git ls-files -co --exclude-standard`: **97 de 97 iguales** (`V01-OK`), sin faltantes ni sobrantes. PA-02 no se activa.
- **PA-01**, antes de cualquier prueba del backend: `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `Enabled True`, `Direction Inbound`, `Action Block`, `Profile Public`; `Get-NetConnectionProfile` → `Name IZZI-F281-5G`, `NetworkCategory Public`; Docker 28.5.1 encendido; `docker ps -a` → solo `campus-dev-postgres-1` de `infra/`. No levanté MinIO ni nada más.

### Regresión primero
- **Backend, corrida 1 (antes de mis pruebas):** `cd backend; npm test` → `Test Files  116 passed (116)` · `Tests  1272 passed (1272)` · `Duration 53.11s`. Limpia (ver PA-07).
- **Frontend, corridas 1 y 2 (antes de mis pruebas):** `cd frontend; npm test` → `Test Files  98 passed (98)` · `Tests  1316 passed (1316)` (`Duration 49.35s` y `47.26s`).
- **C-2, C-13 y C-22 pasan por la razón correcta:**
  - C-2 (`sesiones-y-cadena.ataque.test.ts:492`) es una igualdad exacta de la lista de `printRoutes`: queda en verde solo si existen exactamente `POST /api/clases/:claseId/archivos` y `POST /api/clases/:claseId/archivos/:archivoId/descarga` además de las 54. En el código, `handlers/archivos.ts` registra solo esas dos, con `protegido()`.
  - C-13 (`styles/clases-r1.ataque.test.ts:126`): 36 `enEspera=`, con `adjuntos-de-publicacion.tsx` en 1 («Descargar») y `lista-de-adjuntos-elegidos.tsx` en 0 («Quitar» no espera).
  - C-22 (`muro-c-r2.ataque.test.tsx:391`): el formulario envía `crear.mutateAsync({ ...datos, archivoIds })` siempre, `[]` sin archivos (`formulario-publicacion.tsx`).
- **El muro de c sin adjuntos sigue idéntico:** `publicacion-del-muro.tsx` solo elige la frase de borrar según `adjuntos.length` ("Se borrará con sus comentarios." sin adjuntos) y monta `AdjuntosDePublicacion`, que devuelve `null` con `[]`. Siguen en verde los casos de c que lo fijan: el texto de borrar (`muro-c-r1:479`), el foco de §7.14, "Muro" en error (`muro-recuperar-c-r3` y `-r4`) y PR-C18 (`muro-view.test.tsx`).

### Hallazgos

#### T-38 — «Quitar» y «Adjuntar archivos» siguen activos con la publicación en vuelo: un archivo quitado se publica igual, y uno agregado desaparece sin publicarse
Severidad: **media** (lo que la persona ve en la lista no es lo que se publica; en el primer caso se publica, para todos los alumnos, un archivo que el maestro quitó a propósito)

Prueba: `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx`, casos:
- "«Quitar» un archivo mientras se suben los anteriores: o no se deja quitar, o no se publica";
- "«Adjuntar archivos» con la publicación en vuelo: el archivo nuevo o se publica o se queda en la lista; nunca desaparece en silencio".

Esperado / Obtenido:
- **Quitar.** Se eligen `a.pdf` y `privado.pdf`, se pulsa "Publicar material" y, con la solicitud de `a.pdf` en vuelo, se pulsa "Quitar privado.pdf".
  - Esperado: o el control no actúa (y el archivo sigue en la lista), o el archivo quitado no se sube ni se publica.
  - Obtenido: desaparece de la lista, pero `handlePublicar` recorre la copia de `elegidos` que capturó al empezar: se solicita y se sube `privado.pdf`, y el `POST …/publicaciones` lleva los dos ids (`"archivoIds":["…5d11","…5d12"]`). El aviso dice "Publicado".
- **Adjuntar.** Con la solicitud de `a.pdf` en vuelo, se elige `tardio.pdf`, que entra a la lista. Al terminar, el `POST` solo lleva `a.pdf`, y el `setElegidos([])` del éxito borra `tardio.pdf` de la lista sin publicarlo ni avisar.
- Causa en el código: en `formulario-publicacion.tsx`, `handlePublicar` itera `for (const archivo of elegidos)` (la lista del cierre) y termina con `setElegidos([])`; mientras tanto, "Quitar" (`ListaDeAdjuntosElegidos`, `ghost`, sin `enEspera`) y "Adjuntar archivos" siguen cambiando el estado.

Requisito o regla violada: RF-33 (publicar con adjuntos: se publica lo elegido); `docs/DESIGN.md` §7.19 ("Publicar con archivos": el principal en `enEspera` de principio a fin; "Quitar" cambia la lista que se va a publicar); plan §D-D5 (`handlePublicar` sube cada archivo de la lista y la limpia al terminar).

#### T-39 — «Descargar» navega a cualquier URL que devuelva la API, también `javascript:` y `data:`
Severidad: **media** (defensa en profundidad: hace falta una respuesta maliciosa o alterada de la API, pero un `javascript:` en `location.assign` corre en el origen del campus, donde vive el token de acceso en memoria)

Prueba: `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx`, casos "«Descargar» con una URL javascript:alert(document.domain) del servidor: no navega a ella" y "«Descargar» con una URL data:text/html,<script>alert(1)</script> del servidor: no navega a ella".

Esperado / Obtenido:
- Esperado: como en la subida (`services/almacenService.ts`, PR-D10b), solo se navega a `http:` o `https:`; con otra cosa, el aviso de error y ninguna navegación.
- Obtenido: `descargaRespuestaSchema.url` es `z.url()`, que acepta `javascript:`, `data:`, `vbscript:` y `file:` (lo comprobé con el `shared/dist` del repositorio), y `FichaDeAdjunto.handleDescargar` llama a `window.location.assign(url)` sin revisar el esquema: el doble de `location.assign` recibe `javascript:alert(document.domain)` y `data:text/html,…`.
- Nota: `vistaPrevia.url` también es `z.url()`, pero en un `<img src>` un `javascript:` no se ejecuta en los navegadores actuales; no lo reporto (quité ese caso).

Requisito o regla violada: plan §D-D5 (la lista de permitidos `http(s)` que justifica PR-D10b para la URL de subida) y punto 12 de la lista del manager ("«Descargar» con `window.location.assign` y una URL que no sea `http(s)`"); `AGENTS.md`, regla 6 (las URL son del almacén).

#### T-40 — Al volver al muro después de «Ver más publicaciones», la primera página pinta vistas previas con la firma ya vencida
Severidad: **baja** (la imagen falla, `onError` la quita y queda la ficha: se pierde la vista previa, no el archivo)

Prueba: `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx`, caso "las vistas previas que pinta el muro siguen vigentes al volver a él después de «Ver más publicaciones» (staleTime frente a los 5 minutos)".

Esperado / Obtenido:
- Guion, con `Date.now` controlado: en t0 se pide la primera página (vista previa firmada hasta t0 + 5 min); en t0 + 3 min, "Ver más publicaciones" trae la segunda; la persona sale del muro y vuelve en t0 + 5 min 30 s, con el mismo `QueryClient`.
- Esperado: ninguna `<img>` con una firma vencida; al volver, la consulta se vuelve a pedir. Es el motivo del `staleTime: 240_000` (§D-D5 y DESIGN §7.19: "las vistas previas son URL firmadas de 5 minutos y el muro se considera fresco 4").
- Obtenido: `useInfiniteQuery` mide el `staleTime` desde `dataUpdatedAt`, que se renueva con la última página. A los 5 min 30 s la consulta sigue "fresca" (hasta t0 + 7 min), no se vuelve a pedir y la imagen de la primera página se pinta con la URL firmada en t0, ya vencida: `vistas previas pintadas con su firma ya vencida: expected [ Array(1) ] to deeply equal []`.

Requisito o regla violada: RF-25 (vista previa de las imágenes del muro); plan §D-D5 y `docs/DESIGN.md` §7.19 (el muro se considera fresco 4 minutos para no pintar URL vencidas).

#### T-41 — Si el servidor rechaza un archivo al solicitar la subida (vacío o con un nombre inválido), el aviso no nombra el archivo y dice algo que no pasó (N-D1)
Severidad: **baja**

Prueba: `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx`, casos "si el servidor rechaza al solicitar un archivo vacío, el aviso nombra ese archivo (DESIGN.md §7.19)" y "si el servidor rechaza al solicitar un archivo con un carácter de control, el aviso nombra ese archivo (DESIGN.md §7.19)".

Esperado / Obtenido:
- El cliente deja elegir `vacio.pdf` (0 bytes) y un nombre con U+0001: los dos quedan en "Archivos elegidos". Al publicar, `POST …/archivos` responde `400 ARCHIVO_INVALIDO` con "El archivo está vacío o pesa más de 25 MB." o "El nombre del archivo no es válido.".
- Esperado: un aviso que nombre ese archivo (§7.19) y diga qué pasó (§9).
- Obtenido: `handlePublicar` traduce todo `ApiError` con `mensajeDeErrorClases`, por código: "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.". No nombra el archivo, aunque `archivoEnSubida` lo tiene, y "no coincide" no es lo que pasó. Confirma N-D1 de la revisión del manager.

Requisito o regla violada: `docs/DESIGN.md` §7.19 ("Si falla la subida de un archivo, un aviso nombra ese archivo") y §9 ("Los errores dicen qué pasó y qué hacer").

#### T-42 — Un nombre con un sustituto suelto se acepta, pero se guarda distinto de lo que responde el `201`
Severidad: **baja**

Prueba: `backend/test/archivos-d-r1.ataque.test.ts`, caso "un sustituto suelto: o se rechaza, o lo que responde 201 es lo mismo que se guarda".

Esperado / Obtenido:
- `POST …/archivos` con un `nombre` que lleva un sustituto alto suelto (U+D800) en medio: "tema", U+D800, " uno.pdf".
- Esperado: o `400` (como los controles y los bidireccionales), o se guarda exactamente lo que se responde.
- Obtenido: `201`, con `archivo.nombre` igual al recibido (con el sustituto), pero la fila guarda U+FFFD en su lugar: la codificación a UTF-8 lo reemplaza en silencio. El error de Vitest muestra lo guardado (`tema` + U+FFFD + ` uno.pdf`) contra lo respondido (`tema` + U+D800 + ` uno.pdf`). El muro y la descarga mostrarán un nombre que nadie eligió. `validarArchivoDeclarado` no revisa sustitutos, aunque `disposicionDeContenido` sí los prevé.

Requisito o regla violada: plan §D-D3, punto 1 (la respuesta describe el archivo registrado) y punto 4 de la lista del manager ("sustitutos sueltos").

#### T-43 — `formatearTamano` muestra «1024 KB» para los tamaños entre 1023.5 KB y 1 MB
Severidad: **baja**

Prueba: `frontend/src/lib/format-d-r1.ataque.test.ts`, caso "%i bytes (menos de 1 MB, pero redondea a 1024 KB) no se muestra como «1024 KB»", con 1,048,575 y 1,048,064 bytes.

Esperado / Obtenido: esperado "1 MB" (o, al menos, no "1024 KB"); obtenido "1024 KB". La rama de KB redondea con `Math.round(bytes / 1024)` y no pasa a MB cuando el redondeo llega a 1024.

Requisito o regla violada: plan §D-D5 (`formatearTamano` → "820 KB" o "2.4 MB") y `docs/DESIGN.md` §7.19.

### Resumen de hallazgos
| ID | Severidad | Título corto | Prueba |
|---|---|---|---|
| T-38 | media | «Quitar» y «Adjuntar archivos» activos con la publicación en vuelo | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` (2 casos) |
| T-39 | media | «Descargar» navega a `javascript:` y `data:` | ídem (2 casos) |
| T-40 | baja | Vistas previas vencidas al volver tras «Ver más publicaciones» | ídem (1 caso) |
| T-41 | baja | El aviso de un rechazo al solicitar no nombra el archivo (N-D1) | ídem (2 casos) |
| T-42 | baja | Sustituto suelto: se guarda U+FFFD y se responde otro nombre | `backend/test/archivos-d-r1.ataque.test.ts` (1 caso) |
| T-43 | baja | `formatearTamano` da «1024 KB» | `frontend/src/lib/format-d-r1.ataque.test.ts` (2 casos) |

Rojos de esta ronda: 10 casos (1 del backend y 9 del frontend), todos de estos seis hallazgos; ningún otro caso está en rojo.

### Atacado sin hallazgos

**Por punto del plan ("Puntos de ataque para el Tester", CLASES-d):**
1. **Subida.** La clave siempre es `materiales/{claseId}/{archivoId}`: los campos de más (`claveObjeto: "../../otra"`, `id`, `claseId` de la clase B) se descartan y el id lo genera el servidor. `../a.pdf`, `/` y `\` dan `400`. Tipo y extensión cruzados (`foto.png.html`, `foto`, `foto.png.`, `foto.png ` con espacio, `IMAGE/PNG`, `image/png; charset=utf-8`) dan `400 ARCHIVO_INVALIDO`; `foto.html.png` como PNG se acepta (termina en la extensión correcta). `tamano` 0 y -1 dan `ARCHIVO_INVALIDO`; 1.5, `2^53`, `"10"`, `null` y ausente, `VALIDACION`; 25 MB exactos, `201`; 25 MB + 1, `400`. `tipo` `__proto__`, `constructor`, `toString` y `hasOwnProperty` dan `400` (nunca `500`). Ningún `400` escribe fila ni firma URL. Confirmar ids de otro maestro, de otra clase (también de otra clase **del mismo maestro**), de otro usuario en la misma clase, de 24 h + 1 min, ya confirmados, descartados, inexistentes, repetidos, 6 o sin objeto: `400` con el código correcto, sin publicación, sin trabajo en la cola y con las filas intactas; un id bueno junto a uno ajeno tampoco se confirma (control: el bueno, solo, sí).
2. **Descarga.** Un archivo confirmado de otra clase (con el `claseId` propio), uno pendiente, uno descartado y un UUID inexistente responden **idéntico** (`404 ARCHIVO_NO_ENCONTRADO`, el mismo cuerpo byte a byte), al alumno y al maestro dueño de las dos clases, sin firmar nada. Un `archivoId` que no es UUID (`no-es-uuid`, `1`, un UUID con un carácter de más, `%20`) da `400 VALIDACION`. El restringido, `403 ACCESO_RESTRINGIDO` sin firmar.
3. **URL y cabeceras.** Verifiqué cada firma con una implementación propia de SigV4 (`node:crypto`, la verificación que haría el almacén), sobre las URL que firma el adaptador real de `minio` contra `127.0.0.1:9`, sin red:
   - la de subida es válida para `PUT` y para su ruta; como `GET`, con otra clave o con la clase B en la ruta, la firma no coincide; `X-Amz-Expires=300`; `X-Amz-SignedHeaders=host`; el `expiraEn` anunciado no supera en 1 s la vigencia real;
   - la de descarga es válida, `attachment`, con `response-content-type` del tipo guardado;
   - las vistas previas del muro solo existen para PNG, JPEG, WebP y GIF (no para PDF, TXT, DOCX ni SVG), son `inline`, válidas y de 300 s;
   - `Content-Disposition` con comillas, `;`, `%`, apóstrofos, paréntesis, `*`, emojis, acentos, U+00A0 y una cadena tipo RFC 2047: siempre `attachment; filename="<ASCII seguro no vacío>"; filename*=UTF-8''<codificado>`, sin CR ni LF, y `filename*` decodifica exactamente al nombre; la firma sigue siendo válida con esos valores;
   - el `Authorization` nunca va al almacén: `subirArchivo` usa `fetch` con `credentials: "omit"` y solo `subida.cabeceras` (lo cubren PR-D10a y PR-D10b; lo revisé en el código).
4. **Secretos (PA-10):** ver "PA-10".
5. **Forma de la publicación (C-21 y C-22):** el muro con y sin almacén, con y sin adjuntos, y el `201` de crear llevan siempre `adjuntos` (`[]` si no hay); sin almacén, la imagen sale con `vistaPrevia: null` y `200`. La API acepta el cuerpo sin `archivoIds` (entrada con valor por defecto) y rechaza `null`, texto, objeto, `[1]` y `[""]` con `400 VALIDACION`. En el frontend, una respuesta del muro sin `adjuntos` da `isError` ("alert") y no pinta la publicación; `?? []`, `.default` y `.optional` en `adjuntos`: 0 en `shared/` y en `features/clases` (revisión del código). El formulario siempre envía `archivoIds` (C-22 en verde).

**Por punto de la lista del manager:**
1. Alcance por `archivoId`: sin hallazgos (punto 2 del plan).
2. Confirmar al publicar: sin hallazgos. **Dos publicaciones simultáneas que reclaman el mismo archivo**, retenidas de forma determinista detrás de un `FOR UPDATE` propio sobre la fila (con `pg_blocking_pids` recursivo hasta que las dos esperan): una responde `201` con el archivo y la otra `400 ARCHIVO_INVALIDO`; queda una publicación, un trabajo en la cola y el archivo confirmado con la ganadora. Con `[A, B]` contra `[B, A]` a la vez: igual, sin `40P01` ni `500`. Tres corridas, estables.
3. Lo declarado contra lo real: sin hallazgos. Un byte de más o de menos, un tipo real distinto (`text/html`, `image/svg+xml`) o vacío dan `400` y dejan la fila `pendiente`. El mismo tipo con parámetros (`image/png; charset=binary`) o en mayúsculas se acepta (observación O-8).
4. El nombre: 255 puntos de código con emojis, `201`; 256, `400`. `/`, `\`, `../`, C0 (U+0000, U+0007), U+007F, C1 (U+0085), CRLF, LF, U+2028, U+2029, U+202D, U+202E, U+2066 y U+2069 dan `400` sin escribir. HTML en el nombre se pinta como texto en la ficha, en el `alt` y en «Quitar», sin crear elementos (el aviso de error también es texto: `sonner` recibe una cadena). **Hallazgo:** el sustituto suelto (T-42).
5. La URL prefirmada: sin hallazgos (punto 3 del plan). Las respuestas no llevan `claveObjeto`, `clave_objeto`, `clave`, `subidoPor` ni `estadoPago` como campo (recorrido recursivo del muro, al alumno y al maestro; la descarga solo lleva `url` y `expiraEn`). La ruta de la URL sí contiene la clave del objeto: es inherente a una URL de S3 y solo revela ids que el cliente ya tiene.
6. Restringido y roles: sin hallazgos. Restringido inscrito: muro, descarga y solicitar dan `403 ACCESO_RESTRINGIDO` y no se firma nada. Estudiante no restringido: solicitar y publicar con `archivoIds`, `403 ROL_NO_PERMITIDO`. Admin (el sembrado, con token firmado, sin login): las dos rutas, `403 ROL_NO_PERMITIDO`. Maestro ajeno: `403 SIN_ACCESO_A_LA_CLASE`. Con `debe_cambiar_contrasena`: solicitar, publicar con `archivoIds` y descargar dan `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, y su pendiente sigue pendiente. Dado de baja y sin token: `401 NO_AUTENTICADO`. En ninguno se escribe una fila ni se firma una URL.
7. Logs (PA-10): sin hallazgos (ver "PA-10").
8. Borrar con adjuntos: sin hallazgos. La publicación con adjuntos se borra (`204`), su archivo queda `descartado` y sin publicación, su descarga da `404` y no puede volver a confirmarse (`400`). **Borrar una clase** con archivos confirmados (dos, en dos publicaciones), pendientes y descartados: la cascada borra todo sin violar el `CHECK` ni el `NO ACTION`. La publicación ajena con el `claseId` propio ya la cubre "borrar con el claseId propio una publicación ajena no descarta sus archivos" (prueba normal).
9. `adjuntos` en todas las respuestas: sin hallazgos (punto 5 del plan).
10. Límites en el cliente: sin hallazgos en lo que valida el cliente. 3 más 3 en dos elecciones: quedan 5 y aparece "Puedes adjuntar hasta 5 archivos."; `File.type` vacío con `.exe`, PDF llamado `foto.png`, `LEEME` sin extensión, SVG y 25 MB + 1 se rechazan con su mensaje y la lista no se crea. **Hallazgo:** N-D1 (T-41).
11. Flujo de publicar: doble envío (dos `submit` seguidos y un clic con el botón en espera): cada archivo se solicita una vez y se publica una vez, con los ids en orden. Si falla `publicar` después de subir: un solo aviso (el del hook), conserva el título y los archivos, y el botón queda libre. Desmontar el formulario con la subida en vuelo: termina, publica una vez, avisa una vez y no lanza. El fallo del `PUT` del segundo archivo y el `enEspera` de principio a fin ya los cubren PR-D12b y PR-D12c. **Hallazgo:** T-38.
12. Vista previa: `onError` quita la imagen y deja la ficha con «Descargar»; el `alt` es "Imagen adjunta: <nombre>". Una `vistaPrevia.url` `javascript:` llega al `src` (React no la bloquea en las pruebas), pero en un `<img>` no se ejecuta: no lo reporto. **Hallazgos:** T-39 («Descargar») y T-40 (`staleTime`).
13. 360 px (análisis estático, sin navegador): la ficha y la fila de elegidos son `flex flex-wrap` con el nombre en `min-w-0 flex-1 wrap-anywhere` (Tailwind 4.3.3 genera `overflow-wrap: anywhere`), así que un nombre de 255 caracteres sin espacios parte la línea; el tamaño y el botón son hermanos del mismo contenedor que envuelve; el nombre del botón va en `sr-only` (no ocupa ancho); la imagen es `max-w-full max-h-80 object-contain self-start`. No encontré nada que desborde. Queda para H-5 y H-6.
14. Regresión: ver "Regresión primero". Las 97 `*.ataque` vigentes, sin cambios y en verde; las pruebas normales de a, b y c en verde.
15. Configuración: `STORAGE_*` parciales (solo el secreto; llave y secreto sin endpoint), un endpoint `ftp:` o `javascript:` y `production` sin ellas no validan, y ningún mensaje repite el secreto ni la llave. Vacías o solo con blancos cuentan como ausentes. Con las tres (y `STORAGE_REGION=auto`), `production` valida. Sin almacén, solicitar, descargar y publicar con `archivoIds` dan `503 ALMACEN_NO_CONFIGURADO` sin escribir.

### No atacado y por qué
- **La subida real al almacén, su CORS y la firma aceptada por R2 o MinIO:** el encargo prohíbe levantar MinIO y no hay red hacia R2. Lo sustituí con la verificación SigV4 propia (la misma cuenta que hace el almacén) y queda para H-5 de la comprobación humana.
- **360 px en un navegador:** ningún agente abre navegadores. Solo análisis estático (punto 13); queda para H-6.
- **El worker en `production` sin `STORAGE_*` como proceso:** no lo arranqué. Usa el mismo `cargarEnv()` que la API, y mis casos de `validarEnv` cubren ese camino; `arranque-r1:79` cubre el worker con `STORAGE_*` válidas.
- **La carrera entre borrar una publicación y confirmarle archivos:** no aplica: una publicación borrada no recibe archivos (los `archivoIds` se confirman solo al crearla).
- **`LIMPIEZA_DIARIA`:** no existe todavía.

### Observaciones que no son hallazgo (con destino propuesto)
- **O-1. La URL de subida no limita tamaño ni tipo, y sigue sirviendo después de confirmar.** `presignedPutObject` firma solo `host` (`X-Amz-SignedHeaders=host`): el `PUT` acepta cualquier `Content-Type` y cualquier tamaño, y la confirmación compara después. Pero la URL vive 300 s: tras confirmar, el maestro puede volver a escribir el objeto con otro contenido o más de 25 MB. La vista previa y la descarga fuerzan el tipo guardado (`response-content-type`), así que no veo XSS; el riesgo es de cupo. Tampoco hay tope de solicitudes pendientes por maestro. Destino: DEPLOY (permisos del token de R2 y vigilancia de cupo) y `LIMPIEZA_DIARIA`; si se quiere cerrar, una política `POST` con `content-length-range` sería otro encargo.
- **O-2. Orden de los adjuntos:** el `201` los devuelve en el orden de `archivoIds`; el muro, por `creado_en, id`. Coinciden con el frontend actual (sube y manda en orden), pero no si un cliente manda otro orden. Destino: nota en el cierre de d.
- **O-3. `archivos(clase_id)` y `archivos(subido_por)` sin índice:** borrar una clase en cascada y la comprobación `RESTRICT` al borrar un usuario recorren `archivos` sin índice. Hoy no hay ruta que borre clases ni usuarios. Lo decidió §D-D1. Destino: arquitecto, antes de ADMIN (bajas y borrados).
- **O-4. El muro responde URL prefirmadas sin `Cache-Control: no-store`,** a diferencia de solicitar y descargar. Sin `Last-Modified`, el navegador no lo guarda por heurística. Destino: cierre de d o carril trivial.
- **O-5. `STORAGE_*` no se recortan y el nombre del bucket no se valida.** Una llave con blancos o un bucket con nombre inválido validan y fallan en tiempo de ejecución: con el bucket inválido, toda firma responde `503 ALMACEN_NO_DISPONIBLE` (lo probé en `logs-archivos-d-r1`, sin fugas). Destino: lista de DEPLOY.
- **O-6. `production` acepta un `STORAGE_ENDPOINT` `http://`.** Destino: DEPLOY.
- **O-7. N-D2 confirmada:** `extensionDe` está duplicada en `frontend/src/features/clases/lib.ts` y `backend/src/core/archivos/politica.ts`. Destino: el que fijó el manager.
- **O-8. Al confirmar, un tipo real con parámetros o en mayúsculas cuenta como el declarado** (`coincideConLoDeclarado` normaliza). No es riesgo: se sirve con el tipo guardado.
- **O-9. Un UUID en mayúsculas en `archivoIds`** se rechaza con `400 ARCHIVO_INVALIDO` aunque el archivo sea válido (el mapa por id usa la forma de la base). Es seguro; el frontend manda minúsculas. Destino: nota.
- **O-10. La herramienta de esta sesión convierte las secuencias de escape `\u` de los comandos y de los archivos que escribe en caracteres reales.** Por eso verifiqué por programa (`escapar.cjs`, con los rangos en números) que mis cuatro archivos no tienen invisibles reales: `SIN-INVISIBLES` en los cuatro, después de convertir a escapes 8 que se habían colado (7 en `archivos-d-r1` del backend y 1 en el del frontend). Destino: aviso para el orquestador y los otros agentes.

### PA-07
Comando: `cd backend; npm test > <scratchpad>/back-test-N.txt 2>&1`; conteo con `grep -c` sobre la salida completa; el sitio de cada `P2028`, del JSON de pino; los `500`, por `requestId` del log.

| Corrida | Situación | 40P01 | deadlock detected | could not serialize | too many clients | P2028 y sitio | `500` en muro o archivos |
|---|---|---|---|---|---|---|---|
| 1 (regresión, 09:10:21 a 09:11:18) | limpia: `Test Files  116 passed (116)` · `Tests  1272 passed (1272)` · `Duration 53.11s` | 0 | 0 | 0 | 0 | los 2 aceptados: `tx.sesion.create()` en `adapters/db/sesiones.ts:39` (login) y `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116` (restablecer) | 0. Los 9 `500` son los provocados: 7 de `POST /api/auth/login`, 1 de `POST /api/auth/restablecer` y 1 de `GET /prueba/error-comun` |
| 2 (con mis pruebas, 09:27:02 a 09:28:03) | limpia salvo T-42: `Test Files  1 failed \| 117 passed (118)` · `Tests  1 failed \| 1292 passed (1293)` · `Duration 57.11s` | 0 | 0 | 0 | 0 | los 2 aceptados, mismos sitios | 0; los mismos 9 provocados |
| 3 y 4 (solo mis dos archivos) | `Tests  1 failed \| 20 passed (21)` dos veces (T-42) | 0 | 0 | 0 | 0 | 0 | 0 |

No hubo caída por CHORE-02. PA-07 no se activa.

### PA-10
`backend/test/logs-archivos-d-r1.ataque.test.ts` construye la API real en memoria con `construirApp({ env })` **sin** pasarle almacén, así que `config/almacen.ts` arma el adaptador real de `minio` desde `STORAGE_*` (endpoint `http://127.0.0.1:9`, inalcanzable, como PR-D03a), con `LOG_LEVEL=trace` (comprobado: `app.log.level === "trace"`). Capturé todo lo que se escribe en los descriptores 1 y 2 (`fs.writeSync`, `fs.write`, `process.stdout` y `process.stderr`) durante seis peticiones:
- solicitar (`201`, URL firmada), el muro del alumno con una imagen (`200`, vista previa firmada) y la descarga (`200`, URL firmada);
- publicar con un archivo cuando `statObject` no llega al proveedor (`503 ALMACEN_NO_DISPONIBLE`);
- solicitar y descargar con un bucket de nombre inválido, donde la firma misma falla (`503 ALMACEN_NO_DISPONIBLE`).

En el log, con al menos 6 "request completed": 0 `X-Amz-Signature`, 0 `X-Amz-Credential`, 0 apariciones del secreto y de la llave, 0 `127.0.0.1:9/`, 0 `materiales/`, ninguna de las tres URL firmadas ni sus firmas, ninguna de las tres claves de objeto y 0 del nombre del bucket inválido. PA-10 no se activa.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (rama, base y V-01 97 de 97).
- **PA-06:** no se activó: ninguna `*.ataque` existente falla; los únicos rojos son los 10 casos nuevos de mis hallazgos.
- **PA-07:** no se activó (tabla de arriba).
- **PA-10:** no se activó.
- **PA-11:** no se activó. La corrida 1 terminó a las 09:11:18 y `docker ps -a` a las 09:15:30 solo muestra `campus-dev-postgres-1`; las corridas 2 a 4 terminaron a las 09:28:03 y 09:31:08, y a las 09:33:38 sigue solo `campus-dev-postgres-1`.
- **PA-12:** no se activó. Los casos del backend corrieron tres veces (la suite y dos repeticiones) con el mismo resultado; los del frontend, tres veces en la suite (más las corridas sueltas), con el mismo resultado. Las dos carreras del backend esperan por `pg_blocking_pids` hasta que las dos peticiones están formadas, no por tiempo.
- **PA-15:** no se activó. No toqué producción; el prototipo de la verificación SigV4 (`sigv4.mjs`) y el revisor de invisibles (`escapar.cjs`) viven en el scratchpad.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| `git log -1 --oneline` | `c7fcece feat(clases): parte c (muro con publicaciones y comentarios, avisos encolados, contenido visible y triviales de b)` | base correcta |
| V-01 (`sha256sum` de las `*.ataque` contra la tabla del complemento, con `diff`) | `V01-OK` | 97 de 97 |
| `cd backend; npm run lint` (antes y después) | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd backend; npm test` (corrida 1, regresión) | `Test Files  116 passed (116)` · `Tests  1272 passed (1272)` · `Duration 53.11s` | limpia |
| `cd backend; npm test` (corrida 2, con mis pruebas) | `Test Files  1 failed \| 117 passed (118)` · `Tests  1 failed \| 1292 passed (1293)` · `Duration 57.11s` | solo T-42 |
| `cd backend; npx vitest run test/archivos-d-r1.ataque.test.ts test/logs-archivos-d-r1.ataque.test.ts` (dos veces) | `Tests  1 failed \| 20 passed (21)` | solo T-42 |
| `cd frontend; npm run lint` (antes y después) | `> tsc -b` | código 0 (incluye ESLint y Prettier de mis archivos) |
| `cd frontend; npm test` (corridas 1 y 2, regresión) | `Test Files  98 passed (98)` · `Tests  1316 passed (1316)` | en verde |
| `cd frontend; npm test` (final, con mis pruebas) | `Test Files  2 failed \| 98 passed (100)` · `Tests  9 failed \| 1324 passed (1333)` · `Duration 48.98s` | solo T-38, T-39, T-40, T-41 y T-43 |
| `npx vitest list` de mis archivos | backend 19 + 2; frontend 14 + 3 | 38 casos |
| `npx prettier --write` de mis archivos, desde su paquete | (sin salida) | formateados; `prettier --check` en verde |
| `node escapar.cjs <archivo> --revisar` en los cuatro | `SIN-INVISIBLES` | sin invisibles reales |

### Archivos nuevos (4; 38 casos)
- `backend/test/archivos-d-r1.ataque.test.ts` (19 casos; 1 en rojo: T-42).
- `backend/test/logs-archivos-d-r1.ataque.test.ts` (2 casos, en verde).
- `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` (14 casos; 7 en rojo: T-38, T-39, T-40 y T-41).
- `frontend/src/lib/format-d-r1.ataque.test.ts` (3 casos; 2 en rojo: T-43).

No modifiqué ninguna `*.ataque` existente, ninguna prueba normal ni código de producción.

### Tabla de SHA-256 de todas las `*.ataque` después de la ronda 1 de CLASES-d (101: las 97 vigentes, sin cambios, y 4 nuevas marcadas). Base de V-01 para la corrección del programador
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `B1A6B7FE18F153478ED3F05BF92E5A3270469C8C92B2BBA10D8DAEA8150F5B3F` | `backend/test/archivos-d-r1.ataque.test.ts` **(nueva, ronda 1 de d)** |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `C6B69AF1937CF11A5B8978A686D75FD33EBC32ED803737ED96EF22E2F801887D` | `backend/test/logs-archivos-d-r1.ataque.test.ts` **(nueva, ronda 1 de d)** |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `76B33ABD23DB2599C23DDCFE78B51A4943EB7C9A56774524BE1C6A5B295CBAC4` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` **(nueva, ronda 1 de d)** |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` **(nueva, ronda 1 de d)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

## CLASES-d — Ronda 2
Veredicto: **detenida por PA-12** (una prueba propia es intermitente). No hay veredicto ROTO o RESISTE todavía: espero la decisión del orquestador.

Base `<Cc>` = `c7fcece`. Rama `feat/clases`. Fecha: 2026-10-02.

### Precondiciones
- **Base:** `git log -1 --oneline` → `c7fcece feat(clases): parte c (…)`.
- **V-01:** las 101 `*.ataque` contra la tabla de "CLASES-d — Ronda 1" (`diff` por programa, sin el marcador `*` de `sha256sum`): **101 de 101 iguales** (`V01-OK`).
- **PA-01:** `Enabled True`, `Inbound`, `Block`, `Public`; red `IZZI-F281-5G`; Docker encendido; `docker ps -a` → solo `campus-dev-postgres-1`.

### Regresión (corrida 1 del backend)
- `cd backend; npm run lint` → código 0 (`> tsc -p tsconfig.json --noEmit`).
- `cd backend; npm test` (10:15:40 a 10:16:38) → `Test Files  1 failed | 117 passed (118)` · `Tests  1 failed | 1294 passed (1295)` · `Duration 54.10s`. PA-07: `40P01`, `deadlock detected`, `could not serialize` y `too many clients` en 0; `P2028` solo los dos aceptados (`tx.sesion.create()` y `tx.tokenCuenta.updateMany()`). No cayó por CHORE-02.
- **El rojo es una prueba mía de la ronda 1:** `backend/test/archivos-d-r1.ataque.test.ts`, caso "estudiante inscrito no solicita ni publica; admin no entra a ninguna; maestro ajeno 403; con cambio de contraseña pendiente, 403; dado de baja, 401. Nada se escribe ni se firma" (`:1016`): `expected 61 to be 60`.

### PA-12 — por qué es mía y no de la implementación
- La aserción de `:1016` cuenta **toda** la tabla: `obtenerDb().archivo.count()`. Los archivos de pruebas corren en paralelo, y `archivos.integracion`, `archivos-autorizacion` y `logs-archivos-d-r1` insertan filas de `archivos` al mismo tiempo. Una fila ajena que entra entre las dos lecturas pone el caso en rojo.
- **No es una escritura de la API:** las 11 peticiones del caso respondieron el `401` o el `403` esperado (esas aserciones van antes de `:1016` y pasaron), así que la cadena las detuvo antes del handler.
- **Diagnóstico:** el mismo caso, solo (`npx vitest run test/archivos-d-r1.ataque.test.ts -t "estudiante inscrito no solicita"`), pasa dos de dos (`Tests  1 passed | 18 skipped (19)`). En la ronda 1 pasó en cinco corridas, y el manager lo vio en verde en las suyas.
- **Remedio que propongo (necesita autorización: es una `*.ataque` existente):** acotar el conteo a las clases del caso (`obtenerDb().archivo.count({ where: { claseId: { in: [e.claseA, e.claseB, claseConCambio.id, claseDeBaja.id] } } })`) y publicar el hash nuevo. Ninguna otra aserción cambia. Busqué el mismo patrón en mis otras pruebas: es el único conteo global de `archivos`.

### Estado de la ronda
- Me detuve al ver PA-12, según PARADAS. No corrí el frontend ni ataqué los 9 puntos del manager.
- **Archivo en curso, sin ejecutar todavía:** `backend/test/archivos-d-r2.ataque.test.ts` (T-42 en sus bordes y T-39 del lado del servidor). Lo dejo en el árbol y lo menciono para que nadie lo confunda con una prueba verificada: si alguien corre la suite antes de que siga la ronda, su resultado no está revisado.
- **Precisión del remedio:** el conteo global aparece en dos líneas del mismo caso, `:897` (`filasAntes`) y `:1016` (la aserción); las dos se acotan igual. PA-11: a las 10:18:07, `docker ps -a` solo muestra `campus-dev-postgres-1`.

### C-23: conteo acotado en archivos-d-r1 (PA-12)
Arbitraje del manager (`revision.md`, "### Arbitraje de PA-12 — ronda 2 de CLASES-d"): opción (a), con un `OR` de `claseId IN` y `subidoPor IN`.

- **Diff** (`backend/test/archivos-d-r1.ataque.test.ts`, caso "estudiante inscrito no solicita ni publica; admin no entra a ninguna; maestro ajeno 403; con cambio de contraseña pendiente, 403; dado de baja, 401. Nada se escribe ni se firma"). El archivo no está rastreado, así que el diff es contra mi versión de la ronda 1:
  ```diff
  -    const filasAntes = await obtenerDb().archivo.count()
  +    // C-23 (PA-12 de la ronda 2): el conteo se acota a lo que este caso podría escribir, porque otros
  +    // archivos de pruebas insertan en `archivos` en paralelo. Toda clase que aparece en una URL del
  +    // caso, o todo usuario que hace una petición: una escritura indebida con otro claseId también
  +    // cuenta.
  +    const filasDelCaso = {
  +      OR: [
  +        { claseId: { in: [e.claseA, claseConCambio.id, claseDeBaja.id] } },
  +        { subidoPor: { in: [e.alumno.id, admin, ajeno.id, conCambio.id, deBaja.id] } },
  +      ],
  +    }
  +    const filasAntes = await obtenerDb().archivo.count({ where: filasDelCaso })
  ...
  -    expect(await obtenerDb().archivo.count()).toBe(filasAntes)
  +    expect(await obtenerDb().archivo.count({ where: filasDelCaso })).toBe(filasAntes)
  ```
  Ahora en `:907` y `:1026`.
- **Las clases:** `e.claseA`, `claseConCambio.id` y `claseDeBaja.id` son todas las que aparecen en una URL del caso. `e.claseB` no se usa en este caso: solo la usan otros casos del archivo (`:331`, `:377` y `:630`).
- **Los usuarios:** el alumno, el admin, el maestro ajeno, el maestro con cambio pendiente y el dado de baja hacen peticiones; la petición sin token no tiene usuario.
- No cambió ninguna otra aserción, ningún título ni ninguna comprobación de que no se firma nada. Formato `(unchanged)` y `SIN-INVISIBLES`.
- **Aislado, dos veces:** `npx vitest run test/archivos-d-r1.ataque.test.ts -t "estudiante inscrito no solicita"` → `Tests  1 passed | 18 skipped (19)` las dos veces.
- **En suite:** en verde en las corridas 2 y 3 del backend (abajo).
- **Hash:** antes `B1A6B7FE18F153478ED3F05BF92E5A3270469C8C92B2BBA10D8DAEA8150F5B3F`; ahora `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB`.

### Veredicto de la ronda 2
**ROTO**, por un solo hallazgo bajo, del mismo tipo que T-43 un escalón más arriba. Las seis correcciones (T-38 a T-43) resisten, y pasan por la razón correcta.

Verificación propia: lint del backend con código 0 (`> tsc -p tsconfig.json --noEmit`) · lint del frontend con código 0 (`> tsc -b`) · test del backend `Tests  1298 passed (1298)` (corrida 3, limpia) · test del frontend `Tests  1 failed | 1372 passed (1373)` (dos corridas; el único rojo es T-44).

### Hallazgos

#### T-44 — `formatearTamano` muestra «1024 MB» un byte antes de 1 GB
Severidad: **baja** (el cliente nunca admite archivos de más de 25 MB, pero `lib/format.ts` es compartido y el manager pidió el borde: punto 7)

Prueba: `frontend/src/lib/format-d-r2.ataque.test.ts`, caso "1,073,741,823 bytes (un byte menos que 1 GB) no se muestra como «1024 MB»".

Esperado / Obtenido: esperado algo distinto de "1024 MB" ("1 GB", o el tamaño sin un "1024" en la unidad menor); obtenido "1024 MB". La corrección de T-43 redondea a KB antes de elegir la unidad, pero la rama de MB vuelve a redondear con `toFixed(1)` sin pasar de unidad: 1023.99 MB se escribe "1024.0" y queda "1024 MB".

Requisito o regla violada: plan §D-D5 y Enmienda 12 (`formatearTamano`: redondear antes de elegir la unidad); punto 7 de la lista del manager.

### Regresión caso por caso (los 10 rojos de la ronda 1, por la razón correcta)
| Hallazgo | Caso de la ronda 1 | Estado | Por qué pasa (contra el código corregido) |
|---|---|---|---|
| T-38 | "«Quitar» un archivo mientras se suben los anteriores: …" | verde | `handleQuitar` regresa con `publicandoRef.current` marcada: el archivo no sale de la lista (`seQuitoDeLaLista: false`) y se publican los dos que se ven. Que es la **referencia** y no el estado lo prueba mi caso nuevo "«Quitar» y elegir en el mismo lote que el envío…": en un solo `act`, el envío, «Quitar», la elección y un segundo envío; los manejadores ven el render viejo (sin `enProceso`) y aun así la lista no cambia y se publica una vez |
| T-38 | "«Adjuntar archivos» con la publicación en vuelo: …" | verde | `handleElegir` limpia el selector y regresa: `tardio.pdf` no entra a la lista (`aceptadoEnLaLista: false`, `perdido: false`) |
| T-39 | "«Descargar» con una URL javascript:alert(document.domain) …" y "… data:text/html,… …" | verde | `urlDelAlmacenSchema` rechaza el protocolo, `apiClient` lanza `RESPUESTA_INVALIDA` y el `catch` de `handleDescargar` avisa: mis casos nuevos comprueban que el aviso sale una vez y que `location.assign` no se llama |
| T-40 | "las vistas previas que pinta el muro siguen vigentes …" | verde | El `staleTime` es la función: con la primera página firmada hasta t0 + 5 min y la segunda pedida en t0 + 3 min, da (t0 + 5 min − 60 s) − (t0 + 3 min) = 60 s; a los 5 min 30 s el muro está viejo y se vuelve a pedir. No es un valor fijo menor: mi caso nuevo "antes del margen" no vuelve a pedir a los 3 min 59 s |
| T-41 | "si el servidor rechaza al solicitar un archivo vacío / con un carácter de control …" | verde | `avisoDeFalloAlSubir` da "No pudimos subir «vacio.pdf»: El archivo está vacío o pesa más de 25 MB." (nombre y motivo del servidor) |
| T-42 | "un sustituto suelto: o se rechaza, o lo que responde 201 es lo mismo que se guarda" | verde | `\p{Cs}` rechaza el nombre: `400 ARCHIVO_INVALIDO`, sin fila y sin firma (lo afirma mi caso nuevo; el de la ronda 1 solo exigía la coherencia) |
| T-43 | "%i bytes (menos de 1 MB, pero redondea a 1024 KB) …" (1,048,575 y 1,048,064) | verde | Da "1 MB" (mi caso nuevo lo afirma con el valor exacto) |

Las 97 `*.ataque` de antes de la ronda 1 y los otros 28 casos de mis archivos de la ronda 1 siguen en verde. El muro de c sin adjuntos sigue igual con el `staleTime` como función: sin vistas previas da 240,000, y siguen en verde el texto de borrar (`muro-c-r1:479`), el foco, "Muro" en error (`muro-recuperar-c-r3` y `-r4`) y PR-C18.

### Atacado sin hallazgos (por punto de la lista del manager)
1. **Regresión por la razón correcta:** la tabla de arriba.
2. **Bordes de T-38:**
   - «Quitar» y elegir en el mismo lote que el clic, antes del primer `await`: la lista no cambia;
   - dos `submit` seguidos en el mismo lote: una sola publicación;
   - «Quitar» con el foco en el botón durante la publicación: no sale el archivo y el foco se queda en «Quitar b.pdf»;
   - la nota es `role="status"`, con "Mientras se publica no puedes cambiar los archivos.", y desaparece al terminar;
   - después del `finally`, con fallo del `PUT` del segundo archivo, con fallo de publicar después de subir y con éxito: la lista vuelve a ser editable (se quita y se elige). Con éxito queda vacía.
3. **Bordes de T-39:**
   - «Descargar» con `TAB` + `javascript:`, espacios + `javascript:`, `JaVaScRiPt:`, `vbscript:`, `blob:`, `file:`, `//host` y `data:`: un aviso y ninguna navegación; `HTTPS://` en mayúsculas sí navega (es https). Con `shared/dist`, `http:host` también se rechaza;
   - una URL de subida `javascript:`: no hay `PUT`, el aviso nombra el archivo y no se publica;
   - una `vistaPrevia` `blob:` hace fallar el muro completo (`role="alert"`), sin pintar la publicación;
   - **del lado del servidor**, con un almacén doble que firma `javascript:` y `data:`: solicitar, descargar y el muro responden un error con el formato de la API, sin la URL en el cuerpo ni en el log (son los 3 `500` provocados de PA-07).
4. **Bordes de T-40:**
   - `tiempoFrescoDelMuro`: manda el vencimiento más temprano aunque esté en la segunda página; sin vistas previas, 240,000; sin páginas, 240,000; un vencimiento pasado o a menos del margen, 0; una fecha inválida se ignora;
   - 50,000 vistas previas cargadas no lanzan (observación O-12);
   - volver al muro a los 3 min 59 s no lo vuelve a pedir; a los 4 min 1 s sí, y la imagen que había fallado se pinta con su URL nueva (`urlsRotas` por URL);
   - con la consulta en error, el caso de la ronda 1 "una publicación sin adjuntos en la respuesta es un error…" sigue en verde (la función no se evalúa sin datos).
5. **Bordes de T-41:**
   - [aceptado, rechazado, rechazado]: se detiene en el primer rechazo, con un solo aviso ("No pudimos subir «malo1.pdf»: Motivo de malo1.pdf."), sin solicitar el tercero, sin publicar y con los tres archivos en la lista;
   - un `503 ALMACEN_NO_DISPONIBLE` nombra el archivo, con el texto propio y no el del servidor;
   - un nombre con HTML y `«»` y un motivo con HTML llegan a `toast.error` como cadena, sin crear elementos;
   - un `mensaje` vacío no valida `errorApiSchema` (`min(1)`) y da "No pudimos subir «…»: " seguido del texto genérico, nunca vacío.
6. **Bordes de T-42:** sustitutos sueltos, altos y bajos, al inicio, en medio y al final (y un bajo seguido de un alto): `400 ARCHIVO_INVALIDO`, sin fila y sin firma. Los pares válidos (emoji, CJK del plano astral y una mezcla) se aceptan, y lo respondido y lo guardado coinciden punto de código por punto de código. El pendiente del muro va como observación O-11.
7. **Bordes de T-43:** 0, 1, 1023 y 1024 B; 1,048,063 ("1023 KB"), 1,048,064, 1,048,575 y 1,048,576 ("1 MB"); 25 MB y 25 MB + 1 ("25 MB"). **Hallazgo:** 1,073,741,823 B (T-44).
8. **Lo débil:** la nota sin archivos (O-13); `avisoDeFalloAlSubir` con mensaje vacío (punto 5); `Math.min(...)` con muchos elementos (O-12).
9. **Regresión completa:** ver "Regresión caso por caso" y PA-07.

### No atacado y por qué
- **Navegador real, MinIO y R2:** prohibidos en esta ronda. Quedan para H-5 y H-6.
- **La prueba de mutación de T-38** (copiar el formulario con la guarda solo por estado y ver caer mi caso): no la armé, porque el componente importa rutas relativas de su módulo y una copia en el scratchpad no compila sin tocar la configuración. Lo cubre el caso "mismo lote", que solo puede pasar si la guarda existe antes del render.

### Observaciones que no son hallazgo (con destino propuesto)
- **O-11 (pendiente del cierre de d). Sustitutos sueltos en el título, el anuncio y el comentario del muro.** Lo comprobé con una prueba en el scratchpad (`obs-sustitutos-muro.test.ts`, con la misma base desechable): los tres responden `201`, y lo guardado y lo respondido llevan U+FFFD en lugar del sustituto. Es coherente (la respuesta sale de la fila), pero el reemplazo es silencioso. Destino: el cierre de d, como ya lo dejó la Enmienda 12.
- **O-12. `tiempoFrescoDelMuro` usa `Math.min(...vencimientos)`.** Con el Node del repositorio, `Math.min` con propagación lanza `RangeError` entre 120,000 y 150,000 elementos. 50,000 pasa. Llegar a ese límite exigiría cargar más de mil páginas del muro en una sola sesión. Destino: nota; si se toca, un `reduce`.
- **O-13. La nota de T-38 aparece también al publicar sin archivos.** Confirmo el detalle menor del manager. Destino: el que fijó (cierre o H-6).
- **O-14. Si el almacén firmara una URL que no es http(s), la API responde `500 ERROR_INTERNO`** (el `parse` de `shared/` en el handler), no un `503`. En solicitar, la fila `pendiente` ya se insertó antes del `parse` y queda huérfana hasta `LIMPIEZA_DIARIA`. Con el adaptador real no puede pasar (el endpoint se valida como http o https), y no se filtra la URL. Destino: nota para el cierre de d.
- **O-15. Mi corrida 2 del backend cayó porque corrí el frontend en paralelo** (10 tiempos límite de CHORE-02). La repetí sola y salió limpia. Para mí: nunca dos suites a la vez.

### PA-07
Comando: `cd backend; npm test > <scratchpad>/d-r2/back-test-N.txt 2>&1`; conteo con `grep -c`; los sitios de los `P2028`, del JSON de pino; los `5xx`, por `requestId`.

| Corrida | Situación | 40P01 | deadlock detected | could not serialize | too many clients | P2028 y sitio | `500` del muro o de archivos |
|---|---|---|---|---|---|---|---|
| 1 (10:15:40 a 10:16:38; antes de C-23) | `Tests  1 failed \| 1294 passed (1295)` · `Duration 54.10s`; el rojo fue PA-12 | 0 | 0 | 0 | 0 | los 2 aceptados (`sesiones.ts:39`, `tx.sesion.create()`; `tokens-cuenta.ts:116`, `tx.tokenCuenta.updateMany()`) | 0 |
| 2 (10:21:01 a 10:22:33; con C-23 y mis pruebas) | **caída por CHORE-02**: `Test Files  7 failed \| 112 passed (119)` · `Tests  10 failed \| 1288 passed (1298)` · `Duration 87.77s`; los 10 rojos son tiempos límite de 15, 20, 30 y 40 s (`cuentas-r1`, `cuentas-r3`, `bloqueo-usuario` A1, `clases-r1`, `clases-r2`, PR-D04a y PR-D04b) | 0 | 0 | 0 | 0 | solo los 2 sitios aceptados | 3, los **provocados** por `archivos-d-r2` (almacén que firma `javascript:` y `data:`; `ZodError` en el log) |
| 3 (10:23:16 a 10:24:15; repetición, sola) | **limpia**: `Test Files  119 passed (119)` · `Tests  1298 passed (1298)` · `Duration 55.10s` | 0 | 0 | 0 | 0 | los 2 aceptados | 3, los mismos provocados (`POST …/archivos`, `POST …/archivos/:id/descarga` y `GET …/publicaciones`, los tres de `archivos-d-r2`, con 3 `ZodError`). Ningún otro. Además, los 9 `500` provocados de siempre (login, restablecer y `/prueba/error-comun`) y los `503` provocados de los almacenes nulos o inalcanzables |

PA-07 no se activa: los tres `500` del muro y de archivos los provoca a propósito un caso mío, con un almacén doble que firma URL imposibles con el adaptador real, y son exactamente esos tres. En el log de las corridas: 0 `X-Amz-Signature`, 0 `javascript:alert` y 0 `data:text/html`.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (base y V-01 101 de 101).
- **PA-06:** no se activó; la única `*.ataque` en rojo es la nueva de T-44.
- **PA-07:** no se activó (tabla de arriba).
- **PA-10:** no se activó: 0 `X-Amz-Signature` en las tres corridas, y `logs-archivos-d-r1` en verde.
- **PA-11:** no se activó. La corrida 3 terminó a las 10:24:15; a las 10:26:37, `docker ps -a` solo muestra `campus-dev-postgres-1`. El Ryuk de la prueba de observación (10:27) se retiró solo; ver la última línea de este reporte.
- **PA-12:** se activó al empezar (mi conteo global) y se resolvió con C-23, autorizado. Mis casos nuevos corrieron tres veces (solos y en dos suites del frontend; los del backend, solos y en las corridas 2 y 3) con el mismo resultado.
- **PA-15:** no se activó: la observación O-11 corrió desde el scratchpad, sin tocar producción.

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| V-01 contra la tabla de la ronda 1 | `V01-OK` | 101 de 101 |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd backend; npm test` (corrida 3) | `Test Files  119 passed (119)` · `Tests  1298 passed (1298)` · `Duration 55.10s` | limpia |
| `npx vitest run test/archivos-d-r1.ataque.test.ts -t "estudiante inscrito no solicita"` (dos veces) | `Tests  1 passed \| 18 skipped (19)` | C-23 aislado |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `cd frontend; npm test` (dos veces) | `Test Files  1 failed \| 101 passed (102)` · `Tests  1 failed \| 1372 passed (1373)` (`Duration 51.28s` y `53.60s`) | solo T-44 |
| `npx vitest list` de mis archivos nuevos | backend 3; frontend 23 + 11 | 37 casos |
| `node escapar.cjs <archivo> --revisar` (cuatro archivos tocados) | `SIN-INVISIBLES` | sin invisibles reales; los sustitutos se construyen con `String.fromCharCode` |

### Archivos nuevos (3; 37 casos) y uno modificado (C-23)
- `backend/test/archivos-d-r2.ataque.test.ts` (3 casos, en verde).
- `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` (23 casos, en verde).
- `frontend/src/lib/format-d-r2.ataque.test.ts` (11 casos; 1 en rojo: T-44).
- Modificado por C-23: `backend/test/archivos-d-r1.ataque.test.ts` (solo los dos conteos).

No toqué código de producción, pruebas normales ni otras `*.ataque`.

### Tabla de SHA-256 de todas las `*.ataque` después de la ronda 2 de CLASES-d (104: las 100 vigentes, sin cambios; `archivos-d-r1` con su hash nuevo por C-23; y 3 nuevas, marcadas). Base de V-01 para la corrección del programador
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` **(cambia por C-23; antes `B1A6B7FE…`)** |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` **(nueva, ronda 2 de d)** |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `C6B69AF1937CF11A5B8978A686D75FD33EBC32ED803737ED96EF22E2F801887D` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `76B33ABD23DB2599C23DDCFE78B51A4943EB7C9A56774524BE1C6A5B295CBAC4` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |
| `47797DCD8653009AF74D6EABFEB8919196BAFA124C97708C9C9E23150A07917C` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` **(nueva, ronda 2 de d)** |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` **(nueva, ronda 2 de d)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

- **PA-11, comprobación final:** a las 10:29:39, `docker ps -a` solo muestra `campus-dev-postgres-1` (el Ryuk de la prueba de observación de las 10:27 ya se había retirado).

## CLASES-d — Ronda 3
# Reporte del Tester — CLASES-d (archivos) — Ronda 3 (regresión y bordes residuales)
Veredicto: **RESISTE**. 0 hallazgos. T-44 se corrigió y pasa por la razón correcta; las correcciones de T-38 a T-43 y las 104 `*.ataque` vigentes siguen en verde. O-11 a O-14 se confirman como observaciones con destino. La tabla de SHA-256 del final es la de cierre de d y la base de V-01 del siguiente encargo.

Verificación propia: lint del backend con código 0 (`> tsc -p tsconfig.json --noEmit`) · lint del frontend con código 0 (`> tsc -b`) · test del backend `Tests  1300 passed (1300)` (con mis pruebas; la regresión sin ellas, `Tests  1298 passed (1298)`, también limpia) · test del frontend `Tests  1395 passed (1395)` (con mis pruebas; la regresión sin ellas, `Tests  1375 passed (1375)` dos veces).

Base `<Cc>` = `c7fcece`. Rama `feat/clases`. Fecha: 2026-10-02.

### Precondiciones
- **Base:** `git log -1 --oneline` → `c7fcece feat(clases): parte c (…)`.
- **V-01:** las 104 `*.ataque` contra la tabla de "CLASES-d — Ronda 2" (`diff` por programa): **104 de 104 iguales** (`V01-OK`).
- **PA-01:** `Enabled True`, `Inbound`, `Block`, `Public`; red `IZZI-F281-5G`; Docker encendido; `docker ps -a` → solo `campus-dev-postgres-1`.
- Corrí una sola suite a la vez (O-15 de la ronda 2).

### Regresión
| Corrida | Comando | Última línea | Resultado |
|---|---|---|---|
| Backend 1 (10:55:10 a 10:56:08), sin mis pruebas nuevas | `cd backend; npm test` | `Test Files  119 passed (119)` · `Tests  1298 passed (1298)` · `Duration 54.68s` | limpia |
| Frontend 1 y 2, sin mis pruebas nuevas | `cd frontend; npm test` | `Test Files  102 passed (102)` · `Tests  1375 passed (1375)` (`Duration 52.15s` y `53.39s`) | en verde |
| Backend 2 (11:01:00 a 11:02:00), con mis pruebas | `cd backend; npm test` | `Test Files  120 passed (120)` · `Tests  1300 passed (1300)` · `Duration 56.08s` | limpia |
| Frontend 3, con mis pruebas | `cd frontend; npm test` | `Test Files  104 passed (104)` · `Tests  1395 passed (1395)` · `Duration 53.09s` | en verde |

- Las 104 `*.ataque` en verde, incluidos los 11 rojos de las rondas 1 y 2 (los 10 de la ronda 1 y T-44).
- El muro de c sin adjuntos sigue igual: el texto de borrar, el foco, "Muro" en error y PR-C18 siguen en verde.

### Hallazgos
Ninguno.

### Atacado sin hallazgos (por punto de la lista del manager)
1. **Regresión completa:** la tabla de arriba y V-01.
2. **T-44 por la razón correcta** (`frontend/src/lib/format-d-r3.ataque.test.ts`, 16 casos). El ciclo (`UNIDADES_DE_TAMANO = ["B", "KB", "MB", "GB"]`) redondea en la unidad actual (0 decimales en B y KB, 1 en MB y GB) y sube mientras el redondeado llega a 1024. No hay un caso especial:
   - 0 → "0 B"; 1023 → "1023 B"; 1024 → "1 KB";
   - 1,048,064, 1,048,575 y 1,048,576 → "1 MB";
   - 1,073,689,395 (1023.95 MB) → "1023.9 MB"; 1,073,741,823 y 1,073,741,824 → "1 GB";
   - 1023.96 MB → "1 GB"; 1.5 GB → "1.5 GB";
   - 25 MB → "25 MB", y siguen "820 KB" y "2.4 MB".
   - En el tope, GB es la última unidad: 1023.95 GB da "1024 GB" y 2 TB, "2048 GB", sin ".0". Coincide con el criterio del manager ("ningún «1024» en una unidad que no sea la última").
   - Un barrido de 3,627 cantidades alrededor de cada cambio de unidad (±600 bytes y fracciones 1023.4 a 1023.96 y 1.04 a 1.06), más 1,999 pseudoaleatorias hasta 4 GB: todas con la forma `N U` o `N.D U`, sin ".0", B y KB enteros y menos de 1024 salvo en GB.
   - T-43 (`format-d-r1`) y T-44 (`format-d-r2`) en verde.
3. **`avisoDeFalloAlSubir` desde `lib.ts`** (`archivos-d-r3`, caso "ARCHIVO_INVALIDO lleva el mensaje del servidor; …"):
   - `ARCHIVO_INVALIDO` → "No pudimos subir «vacio.pdf»: El archivo está vacío o pesa más de 25 MB.";
   - `ALMACEN_NO_DISPONIBLE` → el texto propio, no el crudo del servidor;
   - un código desconocido → el genérico;
   - un `Error` o un valor que no es error → "No pudimos subir «…». Inténtalo de nuevo.".

   El formulario sigue avisando una sola vez con el nombre: lo cubren los casos de T-41 de `archivos-d-r1` y `-r2`, en verde.
4. **N-D4, solo por revisión:** en `backend/src/config/env.test.ts`, PR-D02a a PR-D02c ya no tienen `return`. Cada `if (….ok) throw new Error("… debía ser inválido y salió válido")`, o "válido y salió inválido", va justo después de su `expect(….ok).toBe(…)`, así que el `throw` solo se alcanza si esa aserción ya falló. Siguen en verde en las dos corridas del backend.
5. **Residuales, confirmados como observación (no como hallazgo):** ver "Observaciones".
6. **Bordes que quedaban de T-38 a T-42** (`archivos-d-r3`):
   - **Foco con el teclado:** «Quitar a.pdf» lleva el foco a «Quitar b.pdf»; al publicar desde el botón principal, el foco sigue en él al terminar y nunca cae en `<body>`.
   - **Muro con una página sin vistas previas y otra con ellas.** La primera página se pide en t0 sin vistas previas; la segunda, en t0 + 3 min, con una que vence en t0 + 8 min. Al volver a los 6 min 59 s, no se vuelve a pedir; a los 7 min 1 s, se piden de nuevo las dos páginas. En los dos casos, la vista previa pintada vence más de 60 s después del momento de volver.
   - Lo demás de T-38 a T-42 ya lo cubren las `*.ataque` vigentes de las rondas 1 y 2.
7. **PA-10 con `trace`, también con los `ZodError` provocados** (`backend/test/logs-archivos-d-r3.ataque.test.ts`, 2 casos):
   - con `LOG_LEVEL=trace` y un almacén doble que firma `javascript:` y `data:` (con un "X-Amz-Signature" falso dentro), las tres rutas responden `500` y el log registra exactamente 3 `ZodError`;
   - en el log no aparece `javascript:`, `data:text`, `<script>`, `X-Amz-Signature`, ninguna de las dos firmas falsas, `materiales/` ni la clave del objeto;
   - el caso con el adaptador real (`logs-archivos-d-r1`) sigue en verde.

### No atacado y por qué
- **Navegador, MinIO y R2:** prohibidos; quedan para H-5 y H-6.
- **Valores no enteros, negativos, `NaN` o `Infinity` en `formatearTamano`:** el tipo lo permite, pero `File.size` y `tamano` (`z.number().int()`) siempre son enteros no negativos. Por revisión: un valor no entero se redondea en su unidad (sin romper la forma); un negativo daría "-5 B"; `NaN` daría "NaN B" e `Infinity`, "Infinity GB". No son alcanzables; los dejo anotados sin prueba.

### Observaciones que no son hallazgo (confirmadas, con destino)
- **O-11, sustitutos sueltos en los textos del muro:** sin cambios en el código (`shared/src/clases.ts` y `handlers/clases/muro.ts` no cambiaron desde la ronda 2). La comprobación de la ronda 2 sigue valiendo: el título, el anuncio y el comentario responden `201` y se guardan con U+FFFD. Destino: cierre de d.
- **O-12, `Math.min(...vencimientos)`:** sigue igual (`features/clases/lib.ts:235`). Con 50,000 vistas previas cargadas no lanza (`archivos-d-r2`); el límite, entre 120,000 y 150,000, no es alcanzable en la práctica. Destino: nota.
- **O-13, la nota de la lista fija sin archivos:** sigue saliendo con `enProceso` también sin archivos (`formulario-publicacion.tsx:260`). Destino: el que fijó el manager (cierre o H-6).
- **O-14, almacén imposible:** confirmada con `trace`: las tres rutas responden `500`, no `503`. En solicitar, `registrarArchivoPendiente` (`handlers/archivos.ts:50`) va antes del `parse` de la respuesta (`:61`), así que la fila pendiente queda huérfana. No se filtra la URL. Destino: nota de cierre, según el manager.

### PA-07
Comando: `cd backend; npm test > <scratchpad>/d-r3/back-test-N.txt 2>&1`; conteo con `grep -c`; los `5xx`, por `requestId` del log.

| Corrida | Situación | 40P01 | deadlock detected | could not serialize | too many clients | P2028 y sitio | `500` del muro o de archivos |
|---|---|---|---|---|---|---|---|
| 1 (10:55:10 a 10:56:08) | limpia: `Tests  1298 passed (1298)` | 0 | 0 | 0 | 0 | los 2 aceptados: `tx.sesion.create()` (`sesiones.ts:39`) y `tx.tokenCuenta.updateMany()` (`tokens-cuenta.ts:116`) | 3, los provocados por `archivos-d-r2` (almacén imposible; 3 `ZodError` en el log), excluidos por la precisión del manager |
| 2 (11:01:00 a 11:02:00) | limpia: `Tests  1300 passed (1300)` | 0 | 0 | 0 | 0 | los 2 aceptados | los mismos 3 de `archivos-d-r2`. Los 3 de `logs-archivos-d-r3` no salen en la salida porque ese caso captura su propio log, y son del mismo tipo (almacén imposible, `ZodError`) |

- No hay ningún otro `500` del muro ni de archivos. Además, los 9 `500` provocados de siempre (7 de login, 1 de restablecer y 1 de `/prueba/error-comun`) y los `503` provocados de los almacenes nulos o inalcanzables.
- `X-Amz-Signature` en la salida: 0 en las dos corridas.
- PA-07 no se activa.

### PARADAS
- **PA-01:** comprobada antes del backend; no se activó.
- **PA-02:** no se activó (base y V-01 104 de 104).
- **PA-06:** no se activó (ninguna `*.ataque` en rojo).
- **PA-07:** no se activó.
- **PA-10:** no se activó.
- **PA-11:** no se activó. La corrida 2 terminó a las 11:02:00, y a las 11:03:24 `docker ps -a` solo muestra `campus-dev-postgres-1`.
- **PA-12:** no se activó. Mis casos nuevos corrieron solos y en la suite con el mismo resultado; el muro de `archivos-d-r3` controla `Date.now` y no depende del reloj.
- **PA-15:** no se activó (no toqué producción).

### Comandos y última línea de salida
| Comando | Última línea | Resultado |
|---|---|---|
| V-01 contra la tabla de la ronda 2 | `V01-OK` | 104 de 104 |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` | código 0 |
| `cd backend; npm test` (corrida 2) | `Test Files  120 passed (120)` · `Tests  1300 passed (1300)` · `Duration 56.08s` | limpia |
| `cd frontend; npm run lint` | `> tsc -b` | código 0 |
| `cd frontend; npm test` (corrida 3) | `Test Files  104 passed (104)` · `Tests  1395 passed (1395)` · `Duration 53.09s` | en verde |
| `npx vitest list` de mis archivos nuevos | backend 2; frontend 4 + 16 | 22 casos |
| `node escapar.cjs <archivo> --revisar` (tres archivos nuevos) | `SIN-INVISIBLES` | sin invisibles reales |
| `npx prettier --write` de mis archivos, desde su paquete | (sin salida) | formateados |

### Archivos nuevos (3; 22 casos)
- `backend/test/logs-archivos-d-r3.ataque.test.ts` (2 casos).
- `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` (4 casos).
- `frontend/src/lib/format-d-r3.ataque.test.ts` (16 casos).

No modifiqué ninguna `*.ataque` existente, ninguna prueba normal ni código de producción.

### Tabla de SHA-256 de todas las `*.ataque` al cierre de CLASES-d (107: las 104 vigentes, sin cambios, y 3 nuevas marcadas). Base de V-01 para el siguiente encargo
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `C6B69AF1937CF11A5B8978A686D75FD33EBC32ED803737ED96EF22E2F801887D` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |
| `2E7220280A303B7214FFE10D642FBA551DD921A6E8447412F9806433A056B0E6` | `backend/test/logs-archivos-d-r3.ataque.test.ts` **(nueva, ronda 3 de d)** |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `76B33ABD23DB2599C23DDCFE78B51A4943EB7C9A56774524BE1C6A5B295CBAC4` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |
| `47797DCD8653009AF74D6EABFEB8919196BAFA124C97708C9C9E23150A07917C` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |
| `6B32EC25AC9DB1C23BD3C39D07A707C65115834000580ED86334E4B1FED85AEE` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` **(nueva, ronda 3 de d)** |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` **(nueva, ronda 3 de d)** |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

### C-28: esperas fijas en las *.ataque de d (N-T1)
Arbitraje del manager (`revision.md`, "Verificación del carril trivial de cierre (ajustes visuales del humano)", N-T1). Es una adaptación de mis propias pruebas antes de `<Cd>`, con C-23 como precedente.

El caso "volver al muro después del margen (4 min 1 s)…" de `archivos-d-r2` falló en 1 de 3 corridas completas del manager porque la espera fija de 50 ms perdía la carrera bajo carga. Busqué todas las esperas fijas de mis `*.ataque` de d:
- `archivos-d-r1`, `-r2` y `-r3`, del frontend y del backend;
- `format-d-r1`, `-r2` y `-r3`;
- `logs-archivos-d-r1` y `-r3`.

Cambié las seis que podían perder una carrera por una espera de la condición real. **No cambió ninguna aserción ni ningún título.**

| Archivo:línea | Antes | Después |
|---|---|---|
| `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx:412` ("«Descargar» con una URL %s del servidor: no navega a ella") | `await act(() => new Promise((resolver) => setTimeout(resolver, 20)))` | `await waitFor(() => expect(aviso.error).toHaveBeenCalled())`: el aviso del `catch` cuando la URL no pasa el esquema |
| `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx:509` ("las vistas previas que pinta el muro siguen vigentes …") | `await act(() => new Promise((resolver) => setTimeout(resolver, 50)))` | dos `waitFor`: "Imagen 1.png" con `src` `…/vista/1?firma=3` e "Imagen 2.png" con `…/vista/2?firma=4` (la vista previa nueva de las dos páginas vueltas a pedir) |
| `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx:549` ("volver al muro %s: …", el de N-T1) | `await act(() => new Promise((resolver) => setTimeout(resolver, 50)))` | `await waitFor(() => expect(pedidas).toBe(pedidasEsperadas))` y un `waitFor` de la imagen con `src` `…/v/<pedidasEsperadas>` |
| `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx:229` ("primera página sin vistas previas … volver %s") | `await act(() => new Promise((resolver) => setTimeout(resolver, 50)))` | `await waitFor(() => expect(pedidas).toBe(2 + pedidasDeMas))` y un `waitFor` de "Imagen 2.png" con `t=<vencimiento esperado>` en su `src` (el de t0 + 3 min sin nueva petición; el del regreso con ella) |
| `backend/test/logs-archivos-d-r1.ataque.test.ts:212` (`beforeAll`) | `await new Promise((resolver) => setTimeout(resolver, 200))` | sondeo de 10 ms, con un tope de 5 s, hasta que el log tenga 6 "request completed" |
| `backend/test/logs-archivos-d-r3.ataque.test.ts:140` (`beforeAll`) | `await new Promise((resolver) => setTimeout(resolver, 200))` | sondeo de 10 ms, con un tope de 5 s, hasta tener 3 `"type":"ZodError"` y 3 "request completed" |

- `act` quedó sin uso en `archivos-d-r1` y `archivos-d-r3` del frontend, así que salió de su import (línea 2). Cada cambio lleva un comentario que cita C-28.
- **No se tocaron:**
  - el sondeo de 25 ms de `backend/test/archivos-d-r1.ataque.test.ts:291` (`retenerArchivosYLanzar`), que ya es una espera de condición (`pg_blocking_pids` con un tope);
  - los `Date.now` controlados con `vi.spyOn`, que simulan el paso del tiempo;
  - `format-d-r*`, `archivos-d-r2` y `-r3` del backend: no tienen esperas.
- **Formato:** solo esos archivos, desde su paquete. Lint de ESLint en verde.
- **Invisibles:** `SIN-INVISIBLES` en los cinco archivos (`escapar.cjs --revisar`).

**Resultados:**
| Comando | Última línea |
|---|---|
| `cd frontend; npm run lint` | `> tsc -b` (código 0) |
| `npx vitest run` de los tres `archivos-d-r*` del frontend, aislados, tres veces | `Tests  41 passed (41)` las tres |
| `cd frontend; npm test`, corrida 1 | `Test Files  104 passed (104)` · `Tests  1396 passed (1396)` · `Duration 97.34s` |
| `cd frontend; npm test`, corrida 2 | `Test Files  104 passed (104)` · `Tests  1396 passed (1396)` · `Duration 64.49s` |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit` (código 0) |
| `npx vitest run` de `logs-archivos-d-r1` y `-r3`, aislados, tres veces | `Tests  4 passed (4)` las tres |
| `cd backend; npm test`, una corrida, sin el frontend a la vez | `Test Files  120 passed (120)` · `Tests  1300 passed (1300)` · `Duration 57.77s` |

PA-07 en la corrida del backend:
- `40P01`, `deadlock detected`, `could not serialize` y `too many clients` en 0;
- `P2028`, solo los dos aceptados (`tx.sesion.create()` y `tx.tokenCuenta.updateMany()`);
- los `500` son solo los provocados de siempre, más los 3 de `archivos-d-r2` (almacén imposible), ya excluidos por el manager.

El frontend corrió 1396 casos (uno más que en mi ronda 3), porque el carril trivial de cierre agregó una prueba normal; las 107 `*.ataque` no cambian en número.

**PA-11:** al terminar la corrida del backend (15:17:52) aparecen en `docker ps -a`, además del Ryuk de la corrida, `campus-dev-minio-1`, `campus-dev-minio-init-1` y `campus-dev-livekit-1`. Son contenedores de `infra/` que levantó otra persona (lo más probable, para la comprobación humana), no Testcontainers. No los toqué. El Ryuk se revisa abajo.

### Tabla de SHA-256 de las 107 `*.ataque` después de C-28 (nueva base de V-01 para el cierre de d; cambian 5, marcadas)
| SHA-256 | Archivo |
|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |
| `43F1754C8C33F7DE285AB77DBABB0F493422E858529432C9B2BE26FF9423B01B` | `backend/src/config/logger.ataque.test.ts` |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |
| `BD3C7B5FCB945A2D1F5EC328AA480F8E9B96EC447DC714433575ACA6EE63CCCC` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |
| `485D39EF014D4A5437D53177D081BCE59C0EEB476BB2CFE4488F986AE9A2201F` | `backend/test/alumnos-b-r1.ataque.test.ts` |
| `ADF927DFC3321780749CF99945ACAA6D040E6FDD06BED5A6517F681381C9281F` | `backend/test/alumnos-b-r2.ataque.test.ts` |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |
| `F3292910B39E4569433CC7EF8FACC6F8171FB5A6825A611AE3D1B06600DF3994` | `backend/test/clases-r1.ataque.test.ts` |
| `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8` | `backend/test/clases-r2.ataque.test.ts` |
| `A0C04741BEE92E98848DEC3E5224506C759E64BFA1E865AB04387C20B59AB589` | `backend/test/clases-r3.ataque.test.ts` |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |
| `3C069EF866C4A4239BF9584C56B84B5819D4018BAC309454765101ED36FF7237` | `backend/test/cuentas-03a-r1.ataque.test.ts` |
| `CACCBEB855DEAE681942C60C754FE3EE47BB77A07CA460F5A76B9804F0DFD0F5` | `backend/test/cuentas-r1.ataque.test.ts` |
| `33586391E0D987822040432878EA6CAB707C910195C8776789B22B3FA2549369` | `backend/test/cuentas-r2.ataque.test.ts` |
| `924D5DA58A5095D6C9F56CACCC95B2DAA0EFC68D4076C34D85FDA927912BD11B` | `backend/test/cuentas-r3.ataque.test.ts` |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |
| `E4FCE121A6971960FE28750A8AA899BB9A177E1A61110034C634B402A8268AF0` | `backend/test/guarda-clase-r1.ataque.test.ts` |
| `733D508414D4A62ED2FAFB0F4E24A622DCC83242FE811E6F74A21B70E1E76C21` | `backend/test/guarda-clase-r2.ataque.test.ts` |
| `8D9D4556363911629260EAA09A2A2A12AD5F106CE705440E220F513E3BAFDBCA` | `backend/test/guarda-r2.ataque.test.ts` |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |
| `A82F3F1DFF6E74D34CC319DE688BFED12C1D894FCDCC874D2A2E4FB9AC3A2E53` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` **(cambia, C-28; antes `C6B69AF1…`)** |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` **(cambia, C-28; antes `2E722028…`)** |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |
| `902CC714B31855551C28996A7FC1F650771C71B2D064EE993D8E166B51728C2C` | `backend/test/muro-c-r1.ataque.test.ts` |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |
| `97B8D6F6C6B26B9B651EB0B46A48ED27B594A8EF659937EB600FDE793F07E873` | `backend/test/nombres-guarda-r3.ataque.test.ts` |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |
| `A6F219888148B9FF306A20FE411F2D6A32F1BF2907AC1D6F0AB0328FF2C473B8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |
| `03161BD1C5DD8C4E42EADFB93BAD66ECF2E9AB5BDE1F491368B29FD269AA3A20` | `backend/test/worker-03c-r1.ataque.test.ts` |
| `F4EA0BD908D8EC538AA479F9B09BF6FC6F86DF6F93BB7ABAACCD7001DE876395` | `backend/test/worker-r1.ataque.test.ts` |
| `64AA76974C7AE3E89B2F1ED3D7EFC7864D4323310932A9F46F02C798C363A6D2` | `backend/test/worker-r2.ataque.test.ts` |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |
| `ACAF61E8AE80EF5A5AFD0ED745F7C4888729332DF5E05286F1EC01DB3849C494` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |
| `E0992CEE6F52F58AE1C3451D8D10178040BB5E6995431925337C1042C0BC4F5A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |
| `2DA2869ADFEF79B529E5FE05D159558501A8C237E0224254A561FD83AE825362` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` **(cambia, C-28; antes `76B33ABD…`)** |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` **(cambia, C-28; antes `47797DCD…`)** |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` **(cambia, C-28; antes `6B32EC25…`)** |
| `DB90CF07D1E1F588BBA307DF342BA0420609EA64038C49A3119675766288DA05` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |
| `290A33CFB6A910BE74BE26245FD84B1B3E932FF63686BF755A07DBDA15070ED4` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |
| `C0597F198DFF02F342D087AB46400B72E7168A5FAA35D4A12CC8C482B5674E12` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |
| `525D1DA5DE4001991E042300BC9CF62AD1B0B4D31C9D0E20B32896241AC9EAAC` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |

- **PA-11, comprobación final:** a las 15:18:31 el Ryuk de mi corrida ya no aparece; quedan solo los contenedores de `infra/` (`campus-dev-postgres-1`, `campus-dev-minio-1`, `campus-dev-minio-init-1` y `campus-dev-livekit-1`), que no son de Testcontainers ni míos.
