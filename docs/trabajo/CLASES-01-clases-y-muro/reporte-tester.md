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
Esperado: `codigoInvitacionSchema` rechaza `"ABC﻿DEFG"`, `"ABCDEß"`, `"ABCDEFſ"` y `"ABCDEﬀ"`.
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
