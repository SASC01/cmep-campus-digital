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
- **T-20 con otros alfabetos**, mismo resultado en el backend y en el frontend: japonés "山田太", árabe "محمد", devanagari "क्षमा", tailandés "สมชาย", "İnc" (encuentra "İnci") → 200 y encuentran al alumno; "山田", "مح", "İİ", "ﬁﬁ" → `VALIDACION`; "क्ष" (la virama se quita), "　a　" → `BUSQUEDA_MUY_CORTA`; "ﬁﬁﬁ", "a b", "a　 b", "a​b", "각", "가나" → 200.
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
