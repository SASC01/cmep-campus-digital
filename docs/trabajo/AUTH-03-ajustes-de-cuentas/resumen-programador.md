# Resumen del Programador

## AUTH-03a

### PARADAs
- PA-01: no se activó. Regla "Campus: bloquear entrada a Docker en redes publicas" = Inbound/Block/Public; red activa `IZZI-F281` (Public), declarada de confianza. Docker Desktop encendido. Comprobada antes de cada corrida del backend.
- PA-02: no se activó. Rama `feat/auth-03-ajustes-de-cuentas`, base `53b3126` existente. `git diff --name-only 53b3126 -- shared backend frontend` antes de tocar nada listaba solo las `*.ataque` de la ronda 0. Fuera de los paquetes solo cambiaban `AGENTS.md` (SHA-256 `BCF186658AC6EC407EAB97062AAACA80EC256CDD28DBFBFC77D18CFBF5C0E5FD`, igual al de `aprobacion.md`), `docs/ESTADO.md` y `docs/trabajo/AUTH-03-ajustes-de-cuentas/`. V-01 coincidía con la tabla de la ronda 0.
- PA-03, PA-04: no aplican (03a no tiene migración).
- PA-05: no aplica (03a no toca `adapters/queue`).
- PA-06: no se activó. Antes de tocar código: backend 9/657 en rojo, frontend 28/875 en rojo, exactamente los de la tabla de `reporte-tester.md`. Al terminar: backend 671/671 en verde, frontend 877/877 en verde (877 = 875 + 2 casos nuevos que agregué en `establecer-contrasena-view.test.tsx` para cubrir el nombre prellenado y el ENLACE_INVALIDO de la invitación misma). Ninguna otra `*.ataque` se puso en rojo.
- PA-07: **corrección (ronda 2, arbitraje del manager):** esta afirmación original (y la de la ronda 1) quedan como **no verificadas**: no busqué los cinco términos con el comando exacto sobre la salida completa, solo dije "no se activó" sin evidencia. Ver la subsección "AUTH-03a — Corrección de la ronda 2" para la verificación correcta, con el comando, el conteo por término y la ruta y la llamada de cada `P2028`.
- PA-08: no aplica (03a no toca correo).
- PA-09: no se activó. No tuve que tocar ningún archivo de "No se toca" ni cambiar una firma de AUTH-01/02 fuera de lo que "Cambios por capa" autoriza.
- PA-10: no se activó. Revisé los logs de las corridas de integración (incluida `logs-cuentas-r1.ataque.test.ts`, ya en verde): ningún token, `#token=`, contraseña ni cookie.
- PA-11: no se activó. Sin contenedores de Testcontainers 120 s después de terminar (comprobado con `docker ps -a --filter label=org.testcontainers=true`, vacío).
- PA-12: no se activó. Corrí la suite del backend dos veces completas (antes y después) y la del frontend dos veces completas, ambas estables.
- PA-13: no se activó. La comprobación de la sesión viva bajo el bloqueo se hizo con un `tx.sesion.findFirst` plano dentro de la transacción existente de `cambiarContrasenaPropia`, sin tocar `bloqueo-usuario.ts` ni `sesiones.ts`.
- PA-14: no aplica (03c).

### Verificaciones
- **V-01 (hashes):** las 47 `*.ataque` tienen exactamente los mismos SHA-256 que la tabla de `reporte-tester.md`, antes y después de implementar (diff vacío).
- **V-02 (paquetes):** `npm run build`, `npm run lint` y `npm run test` desde la raíz, los tres en verde. Backend: 65 archivos / 671 pruebas. Frontend: 52 archivos / 877 pruebas. `shared` compila (sin script de test propio).
- **V-03:** N/A (03a no toca Prisma).
- **V-04 (búsquedas en código de producción):**
  - `contrasenaActual` y `mostrarTemporal` → 0 en `backend/src`, `frontend/src` y `shared/src`, **salvo una excepción que reporto abajo** (`backend/src/config/logger.ts:17`).
  - `type="password"` → 0 (fuera de `campo-contrasena.tsx`, sin tocar).
  - `<CampoContrasena` → 6, en exactamente 4 formularios: `formulario-login.tsx` (1), `formulario-registro.tsx` (1), `formulario-nueva-contrasena.tsx` (2), `formulario-cambiar-contrasena.tsx` (2).
  - `console.` y `estadoPago` → 0 en los archivos nuevos del backend de 03a (no hay ninguno: todo lo de 03a es "Modificar", sin "Crear" en `backend/`; la única mención de `estadoPago` es un comentario en `usuarios.ts` que ya existía).
  - `$queryRawUnsafe` → 1 exacto (`adapters/db/cliente.ts`). `$executeRawUnsafe` → 0.
  - SQL etiquetado (`$queryRaw`/`$executeRaw`) solo en `salud.ts` y `bloqueo-usuario.ts` (03a no agregó ninguno; `enlaces-registro.ts` e `invitaciones.ts` son de 03b/03c).
  - `INTERVALO_MINIMO_ENTRE_CORREOS_MS` no aplica a 03a.
  - `fetch(` solo en `services/apiClient.ts`.
- **V-05 ("No se toca"):** dentro de los paquetes, `git diff --name-only 53b3126 -- shared backend frontend` (sin las `*.ataque`) lista exactamente los archivos de "Cambios por capa" 03a (ver abajo); ninguno de "No se toca". Fuera de los paquetes, solo `AGENTS.md` (hash igual al anotado), `docs/ESTADO.md`, `docs/trabajo/AUTH-03-ajustes-de-cuentas/` y `docs/DESIGN.md` (editado a mano en el paso 9, autorizado explícitamente por el plan para el programador de 03a, aunque no aparece en la lista de excepciones de V-05; lo reporto como discrepancia de redacción, no como una desviación mía).
- **V-06 (rutas):** `backend/test/sesiones-y-cadena.ataque.test.ts` (35/35 en verde) confirma la lista exacta de `printRoutes` con `POST /api/auth/invitacion` agregada, y `RUTAS_PUBLICAS` con las 8 de hoy más esa.

### Archivos creados / modificados
**shared/**
- `src/cuentas.ts` (Modificar): `cambiarContrasenaSchema` sin `contrasenaActual`; `establecerContrasenaSchema`, `datosDeInvitacionSchema`, `datosDeInvitacionRespuestaSchema` y sus tipos; comentario en `CONTRASENA_ACTUAL_INCORRECTA`.
- `src/index.ts` (Modificar): reexporta lo nuevo.

**backend/**
- `src/core/auth/cambio-de-contrasena.ts` (Modificar) y `.test.ts`: `evaluarContrasenaRepetida`, `estaVivaParaCambio`, `ResultadoCambioPropio`, `errorDelCambioPropio`; se quitó `evaluarContrasenaNueva`.
- `src/core/auth/normalizacion.ts` (Modificar) y `.test.ts`: `prepararNombre`, usada por dentro de `prepararRegistro` sin cambiar su resultado.
- `src/adapters/db/usuarios.ts` (Modificar): `cambiarContrasenaPropia` con la firma y el protocolo nuevos (`sesionId`, `ResultadoCambioPropio`).
- `src/adapters/db/tokens-cuenta.ts` (Modificar): `usarTokenYCambiarContrasena` acepta `nombre?`; `buscarInvitacionPorHash` nueva.
- `src/adapters/db/index.ts` (Modificar): reexporta lo nuevo.
- `src/handlers/auth/cuentas.ts` (Modificar): `/cambiar-contrasena` con el filtro previo y el bloqueo (§D-A1); `/invitacion` nueva; `/establecer-contrasena` con `nombre` opcional.
- `src/middleware/rutas-publicas.ts` (Modificar): agrega `"POST /api/auth/invitacion"`.
- `src/handlers/README.md`, `src/middleware/README.md` (Modificar).
- `test/cambiar-contrasena.integracion.test.ts` (Modificar, prueba normal): reescrita para el nuevo contrato (sin `contrasenaActual`, con cookie).
- `test/bloqueo-usuario.integracion.test.ts` (Modificar, prueba normal): A3, C2, D1 (renombrado a la carrera donde gana el admin) y E4 adaptados al nuevo protocolo; agregué E4b (`sin_sesion`).

**frontend/**
- `src/features/auth/types.ts`, `data.ts`, `hooks.ts` (Modificar): §D-A3 (login/registro fuera de la caché), `useDatosDeInvitacion`, `useNuevaContrasena` con `EstablecerContrasena`, textos y tipos de §D-A6.
- `src/features/auth/components/formulario-cambiar-contrasena.tsx` (Modificar): sin el campo de la temporal.
- `src/features/auth/components/formulario-nueva-contrasena.tsx` (Modificar): prop `nombreInicial?`, campo "Nombre completo".
- `src/features/auth/establecer-contrasena-view.tsx` (Modificar): estados de §D-A2 (error ENLACE_INVALIDO → error genérico → cargando → formulario).
- `src/features/auth/cambiar-contrasena-view.test.tsx`, `contrasena-visible.test.tsx`, `establecer-contrasena-view.test.tsx` (Modificar, pruebas normales).

**docs/**
- `docs/DESIGN.md` §7.3 (a mano, paso 9): nota de "Mostrar contraseña temporal (retirado en AUTH-03a…)".

### Conteo final de pruebas
- Backend: 65 archivos / 671 pruebas, todas en verde.
- Frontend: 52 archivos / 877 pruebas, todas en verde.
- Build (`shared`, `backend`, `frontend`): en verde.
- Lint (`shared`, `backend`, `frontend`): en verde (formateé con Prettier, acotado a los archivos tocados, desde cada paquete).
- `prisma validate`: N/A (sin cambios de esquema en 03a).

### Desviaciones del plan
1. **`backend/src/config/logger.ts` sigue con `"req.body.contrasenaActual"` en su lista de redacción.** Ese archivo está en "No se toca" para 03a (`src/config/{auth,cola,correo,logger}.ts`), así que no lo toqué. Pero V-04 pide "`contrasenaActual` → 0 en backend/src... tras 03a", y esa línea lo contradice literalmente. No lo considero un error: `logger.ts` redacta cualquier cuerpo de petición antes de registrarlo, y un cliente viejo (o un atacante) todavía puede mandar `contrasenaActual` en el cuerpo de `/cambiar-contrasena` (zod la descarta en la validación, pero Fastify ya guardó el cuerpo crudo en `request.body` antes de esa validación); sin la redacción, ese valor quedaría en el log. Quitarla sería una regresión de seguridad (regla 13 de `AGENTS.md`) y además significa tocar un archivo prohibido. Dejo la decisión al Manager.
2. **`establecer-contrasena-view.test.tsx` quedó con 5 casos en vez de 3** (agregué "muestra el nombre… prellenado" y "con ENLACE_INVALIDO en la invitación misma"), porque el flujo nuevo tiene dos estados de error distintos (el de la invitación al montar y el de establecer-contrasena al enviar) y el original solo cubría el segundo.
3. **`bloqueo-usuario.integracion.test.ts`, caso D1** cambié su enunciado de "el admin genera la temporal B y luego cambiar-contrasena con la temporal anterior A" a "el admin restablece y luego cambiar-contrasena con la sesión anterior", porque el concepto de "temporal anterior" ya no existe (el cuerpo no lleva `contrasenaActual`). El nuevo enunciado cubre la misma carrera (T-09) con el resultado que corresponde en el modelo nuevo (`credencial_cambiada` → 401 `SESION_INVALIDA`) y de paso cubre la fila de "Pruebas requeridas" 03a "casos de cambio con la cookie vigente, que retienen al usuario: el restablecimiento del admin gana → 401".
4. **Retirada en la corrección de la ronda 1.** Escribí la prueba normal de la carrera "entre el filtro previo y el bloqueo" en `bloqueo-usuario.integracion.test.ts` (caso A5), reteniendo la fila de `usuarios` (no la de `sesiones`), como demostró el tester en `cuentas-03a-r1.ataque.test.ts`. Ver la subsección "AUTH-03a — Corrección de la ronda 1".
5. **`docs/DESIGN.md`** no aparece en la lista de excepciones de V-05 ("Fuera de los paquetes"), pero el paso 9 del plan instruye explícitamente "`docs/DESIGN.md` §7.3 (la nota de la temporal), a mano" para el programador de 03a. Lo edité como pide el paso 9; reporto la discrepancia de redacción entre V-05 y el paso 9 para que el Manager la revise, no la resolví por mi cuenta más allá de seguir la instrucción explícita del paso.

### Hallazgos atendidos
N/A (esta es la primera implementación de 03a, no una corrección de hallazgos).

### Pendiente o fuera de alcance detectado
- Nada de 03b ni 03c se tocó.

## AUTH-03a — Corrección de la ronda 1

Veredicto del tester: ROTO, un solo hallazgo (T-01, severidad media): faltaban las pruebas normales de "Pruebas requeridas" del plan.

### T-01, punto por punto

- **`invitacion.integracion` (backend/test/invitacion.integracion.test.ts, modificado — corrección de la nomenclatura en la ronda 2, ver "AUTH-03a — Corrección de la ronda 2": el archivo ya existía desde `53b3126` con 9 casos de AUTH-02; aquí agregué 13 casos de 03a sin quitar los originales):**
  - `POST /auth/invitacion` responde `{ nombre }` exacto con `Cache-Control: no-store` — **corregido**.
  - Los tokens inválidos (inexistente, tipo distinto, usado, revocado, vencido, cuenta inactiva) dan el mismo 400 — **corregido**.
  - No escribe nada ni consume el enlace: el mismo token sirve después para establecer — **corregido**.
  - Es pública: un `Authorization` no cambia la respuesta — **corregido** (también en `autorizacion-cuentas.integracion`, ver abajo).
  - `establecer-contrasena` con nombre actualiza `nombre` y `nombre_busqueda`; sin nombre, no cambia; con un nombre inválido, 400 `VALIDACION` y el token sigue vivo (después, sin nombre, 204) — **corregido**.
  - `restablecer` con `nombre` no cambia el nombre — **corregido**.
- **`autorizacion-cuentas.integracion` (backend/test/autorizacion-cuentas.integracion.test.ts, modificado):** agregué el `describe` "POST /api/auth/invitacion es pública" con el caso de un `Authorization` ajeno (de otro rol) que no cambia la respuesta ni consume el enlace — **corregido**.
- **`bloqueo-usuario.integracion` (backend/test/bloqueo-usuario.integracion.test.ts, modificado):** agregué el caso A5, "entre el filtro previo y el bloqueo, la sesión se revoca: 401 SESION_INVALIDA sin escribir", reteniendo la fila de `usuarios` (no la de `sesiones`) con la técnica exacta que demostró el tester en `cuentas-03a-r1.ataque.test.ts` (sin copiar ni tocar ese archivo): la transacción retenedora revoca la sesión por SQL antes de soltar la fila, así que ocurre exactamente entre el filtro previo (ya pasado) y el bloqueo (`bloquearUsuarioParaEscribir`, donde `cambiar-contrasena` queda formado). Extendí `test/ayudas-concurrencia.ts` con un parámetro opcional `antesDeSoltar` (compatible hacia atrás, sin cambiar ninguna llamada existente) para poder escribir SQL justo antes de liberar la retención — **corregido**. Corrí este caso 4 veces seguidas (una dentro de la suite completa y 3 aparte, filtrando por su nombre): las 4, en verde. Se retira la desviación 4 del resumen original.
- **Frontend, caché de login y registro (§D-A3):** agregué en `login-view.test.tsx` y `registro-view.test.tsx` los casos "tras un [login/registro] con éxito, la contraseña no queda en la caché de mutaciones" y "...fallido..." — **corregido**.
- **`/establecer-contrasena` (frontend, `establecer-contrasena-view.test.tsx`, ampliado):** agregué "el envío lleva el nombre corregido" (verifica el cuerpo exacto de la petición), "un nombre inválido no envía nada y marca el campo con `ErrorDeCampo`", "con otro error en la invitación (500), muestra `MensajeError` sin formulario", "ni la clave, ni meta, ni data de la consulta de la invitación contienen el token" y "al desmontar la pantalla, la consulta de la invitación desaparece (gcTime 0)" — **corregido**.
- **`/cambiar-contrasena` (frontend, `cambiar-contrasena-view.test.tsx`, ampliado):** agregué "con SESION_INVALIDA muestra su mensaje propio" — **corregido**.

Ningún defecto de código: las 70 pruebas de ataque de la ronda 1 ya habían confirmado que el comportamiento es correcto; lo que faltaba eran las pruebas normales.

### Verificaciones (tras la corrección)
- **V-01 (hashes):** las 51 `*.ataque` (las 47 de la ronda 0 más las 4 que agregó el tester en la ronda 1) tienen el mismo SHA-256 que la tabla de la ronda 1 de `reporte-tester.md`; comparé por separado el hash y el nombre de archivo de las 51 filas contra el árbol actual: coinciden exactamente. No toqué ninguna `*.ataque`.
- **V-02:** `npm run build`, `npm run lint` y `npm run test` desde la raíz, los tres en verde. Backend: 67 archivos / 720 pruebas (confirmado corriendo la suite completa dos veces; `invitacion.integracion.test.ts` por sí solo tiene 13 casos, todos en verde, y el caso A5 de `bloqueo-usuario.integracion.test.ts` lo corrí 4 veces aparte). Frontend: 54 archivos / 914 pruebas (904 de la ronda 1 más 10 nuevas: 2 en login, 2 en registro, 1 en cambiar-contrasena y 5 en establecer-contrasena).
- **V-04:** sin cambios respecto al resumen original; los archivos nuevos/modificados de esta corrección son todos pruebas (`*.integracion.test.ts` y `*.test.tsx`), no código de producción, así que no alteran ningún conteo de V-04.
- **V-05 ("No se toca"):** los únicos archivos modificados en esta corrección son `backend/test/invitacion.integracion.test.ts` (**modificado, no nuevo**: ya existía en `53b3126`), `backend/test/autorizacion-cuentas.integracion.test.ts`, `backend/test/bloqueo-usuario.integracion.test.ts`, `backend/test/ayudas-concurrencia.ts`, `frontend/src/features/auth/login-view.test.tsx`, `frontend/src/features/auth/registro-view.test.tsx`, `frontend/src/features/auth/establecer-contrasena-view.test.tsx` y `frontend/src/features/auth/cambiar-contrasena-view.test.tsx`. Todas son pruebas normales explícitamente permitidas por T-01 y por "Pruebas requeridas" del plan; ninguna está en "No se toca". `test/ayudas-concurrencia.ts` no está en la lista de "No se toca" (solo `test/global-setup.ts`, `test/setup.ts` y `test/entorno-de-pruebas.ts` lo están) y el cambio es aditivo (un parámetro opcional). **Corrección (ronda 2, T-02):** ver la subsección "AUTH-03a — Corrección de la ronda 2": presenté por error este archivo como "nuevo" en tres lugares y su contenido se había reemplazado entero, perdiendo los 9 casos de AUTH-02 que ya tenía. Ya está corregido.
- **V-06:** sin cambios; no toqué rutas ni `RUTAS_PUBLICAS`.

### PARADAs (corrección)
- PA-01: no se activó, comprobado antes de cada corrida.
- PA-02: no se activó (mismos archivos permitidos, nada de "No se toca").
- PA-06: no se activó (ninguna `*.ataque` falló; las 70 de la ronda 1 sigue en verde).
- PA-12: no se activó. Corrí el caso A5 de la carrera 4 veces (1 en la suite completa + 3 sueltas), siempre en verde.
- PA-07: no lo verifiqué con el comando exacto en esta corrección; queda como no verificada (igual que en la implementación original), corregido en la subsección "AUTH-03a — Corrección de la ronda 2".
- Los demás PA no aplican a este trabajo (solo pruebas normales, sin migraciones ni cola).

### Archivos creados / modificados (corrección de la ronda 1)
- `backend/test/invitacion.integracion.test.ts` (**modificado**, no nuevo: ya existía desde `53b3126`. Corrección: ver "AUTH-03a — Corrección de la ronda 2", T-02).
- `backend/test/autorizacion-cuentas.integracion.test.ts` (modificado): caso de `POST /auth/invitacion` pública.
- `backend/test/bloqueo-usuario.integracion.test.ts` (modificado): caso A5.
- `backend/test/ayudas-concurrencia.ts` (modificado): `antesDeSoltar` opcional en `conFilaRetenida`.
- `frontend/src/features/auth/login-view.test.tsx`, `registro-view.test.tsx`, `establecer-contrasena-view.test.tsx`, `cambiar-contrasena-view.test.tsx` (modificados).

### Conteo final (corrección de la ronda 1)
- Backend: 67 archivos / 720 pruebas, todas en verde.
- Frontend: 54 archivos / 914 pruebas, todas en verde.
- Build y lint (los tres paquetes): en verde.

### Desviaciones del plan (corrección)
Ninguna nueva. Se retira la desviación 4 original (ver arriba).

### Pendiente o fuera de alcance detectado (corrección)
Ninguno nuevo.

## AUTH-03a — Corrección de la ronda 2

Veredicto del tester: ROTO, un solo hallazgo (T-02, severidad media): en la corrección de T-01 reemplacé entero `backend/test/invitacion.integracion.test.ts`, que ya existía en `53b3126` con 9 casos de AUTH-02 (invitación individual, correo → establecer → login como maestro, correo duplicado, tokens cruzados o vencidos, doble uso, rollback de `crearMaestroInvitado`), y en el resumen lo presenté como "nuevo" en tres lugares.

### T-02, punto por punto

1. **Restauré los 9 casos originales** con `git show 53b3126:backend/test/invitacion.integracion.test.ts` y los reinserté tal cual en un `describe("POST /api/admin/maestros")` al inicio del archivo, antes de mis `describe` de 03a. **Adaptaciones**, ninguna de fondo:
   - moví la importación de `crearTokenDePrueba` (antes con un `await import()` dinámico dentro del caso "un token de recuperación no vale en establecer-contrasena", porque mi archivo ya la necesitaba arriba para los casos de 03a) al `import` estático de `./ayudas-cuentas.js`, junto con `pedirComoAdmin` y `tokenDelEnlace` (que en mi reemplazo había importado, por error, desde `ayudas-auth.js`, donde no existen: causaba `TypeError: pedirComoAdmin is not a function`, que corregí antes de dar por buena la restauración);
   - agregué un segundo registro de limpieza (`ids`, borrado por id) junto al original (`correos`, borrado por correo), porque mis casos de 03a usan `crearUsuarioDePrueba`/`borrarUsuariosDePrueba` (por id) y los originales usan `correoDePrueba`/`borrarUsuariosDePruebaPorCorreo` (por correo); el `afterAll` ahora corre los dos.
   - Nada del contenido, las aserciones ni los títulos de los 9 casos originales cambió — **corregido**.
2. **Verifiqué con `git diff 53b3126 -- backend/test/invitacion.integracion.test.ts`** que los 9 casos siguen ahí: comparé los títulos de `it(` extraídos de `git show 53b3126:...` contra los del archivo actual y coinciden exactamente, en el mismo orden, más los 13 de 03a al final (22 en total, sin duplicados) — **corregido**.
3. **Verifiqué con `git diff 53b3126 --stat -- backend/test frontend/src shared/src`** que ningún otro archivo de pruebas existente se reemplazó entero. Los dos archivos con más líneas cambiadas después de `invitacion.integracion.test.ts` son `bloqueo-usuario.integracion.test.ts` (142 líneas) y `cambiar-contrasena.integracion.test.ts` (106 líneas); en los dos comparé los títulos de `it(` de `53b3126` contra los actuales: cada caso original sigue presente, adaptado al contrato nuevo de `cambiar-contrasena` (sin `contrasenaActual`, con cookie), con el mismo alcance y sin ninguno perdido (más los casos que agregué, A5 y E4b). Ninguno es un reemplazo, son adaptaciones ya declaradas en su momento (desviación 3 del resumen original, para `D1`) — **verificado, sin hallazgo nuevo**.
4. **Corregí el resumen:** las tres menciones de `invitacion.integracion.test.ts` como archivo "nuevo" ahora dicen "modificado", con la aclaración de que ya existía en `53b3126`. Ver los cambios en las secciones de arriba (T-01 punto por punto, V-05 y "Archivos creados / modificados") — **corregido**.

### PA-07 (arbitraje del manager, evidencia con el comando exacto)

- **Comando:** `grep -cE "40P01|deadlock detected|could not serialize|P2028|too many clients"` (por separado, uno por término) sobre la salida completa de `npm test` del backend (guardada en el scratchpad: `backend-r2.txt`, y repetida en la corrida final desde la raíz: `test-r2-final.txt`).
- **Conteo por término** (ambas corridas, idéntico):
  - `40P01`: 0
  - `deadlock detected`: 0
  - `could not serialize`: 0
  - `P2028`: 2
  - `too many clients`: 0
- **Los dos `P2028`, con su ruta y su llamada de Prisma:**
  - `backend/src/handlers/auth/index.ts:134:20` → `POST /api/auth/login`, sobre `tx.sesion.create` (dentro de `crearSesion`, `adapters/db/sesiones.ts:39`).
  - `backend/src/handlers/auth/cuentas.ts:106:23` → `POST /api/auth/restablecer`, sobre `tx.tokenCuenta.updateMany` (dentro de `usarTokenYCambiarContrasena`, `adapters/db/tokens-cuenta.ts:116`).
- **Conclusión:** coinciden exactamente con la única exclusión del arbitraje del manager (`revision.md`, "Arbitraje de PA-07"). No hay ningún otro `P2028`, ni en otra ruta ni en otra llamada, ni más de uno de cada tipo, ni ninguna aparición de los otros cuatro términos. **PA-07 no se activa**, con evidencia (a diferencia de las rondas 0 y 1, que quedan como no verificadas en este punto, según indicó el tester).
- **Corrección de mis afirmaciones anteriores:** en la implementación original y en la corrección de la ronda 1 escribí "PA-07: no se activó" sin haber corrido ese comando. Ambas quedan como **no verificadas**, no como "falsas": los dos `P2028` ya existían desde antes de 03a (los provoca a propósito `cuentas-r3.ataque.test.ts`, según confirmó el tester y el manager), así que no habría cambiado el veredicto, pero no debí escribir "no se activó" sin la búsqueda.

### Verificaciones (tras la corrección de la ronda 2)

- **V-01:** las 52 `*.ataque` (las 51 de la ronda 1 más la que agregó el tester en la ronda 2, `invitacion-flujo-03a-r2.ataque.test.ts`) tienen el mismo SHA-256 que la tabla de la ronda 2 de `reporte-tester.md`; comparé por separado la columna de hashes (sin depender del formato de la fila) contra el árbol actual: coinciden exactamente, 52/52. No toqué ninguna `*.ataque`.
- **V-02:** `npm run build`, `npm run lint` y `npm run test` desde la raíz, los tres en verde. Backend: 68 archivos / 733 pruebas. Frontend: 54 archivos / 914 pruebas (sin cambios frente a la ronda 1: no toqué nada del frontend en esta corrección).
- **V-05:** el único archivo de producción o de pruebas que toqué en esta corrección es `backend/test/invitacion.integracion.test.ts`. No toqué ninguna otra prueba normal ni código de producción.

### PARADAs (corrección de la ronda 2)

- PA-01: no se activó, comprobado antes de cada corrida del backend (regla de firewall Inbound/Block/Public, red `IZZI-F281` de confianza, Docker encendido).
- PA-02: no se activó. Mismos archivos permitidos; el único tocado en esta corrección (`invitacion.integracion.test.ts`) ya estaba autorizado por T-01 y sigue siéndolo por T-02 (es una prueba normal que el plan nombra).
- PA-06: no se activó. Ninguna `*.ataque` falló; las 52 (51 de la ronda 1 + la nueva de la ronda 2) siguen en verde.
- **PA-07: verificado con evidencia (ver arriba). No se activa.**
- PA-11: no se activó. Sin contenedores de Testcontainers después de terminar.
- Los demás PA no aplican a este trabajo (una sola prueba normal restaurada, sin migraciones ni cola).

### Archivos creados / modificados (corrección de la ronda 2)

- `backend/test/invitacion.integracion.test.ts` (modificado): se restauraron los 9 casos originales de AUTH-02 al inicio del archivo, con las tres adaptaciones mínimas descritas arriba (imports movidos a `ayudas-cuentas.js`, registro de limpieza `ids` agregado junto a `correos`); se conservan los 13 casos de 03a que agregué por T-01, sin duplicar ninguno. 22 casos en total.

### Conteo final (corrección de la ronda 2)

- Backend: 68 archivos / 733 pruebas, todas en verde.
- Frontend: 54 archivos / 914 pruebas, todas en verde (sin cambios).
- Build y lint (los tres paquetes): en verde.

### Desviaciones del plan (corrección de la ronda 2)

Ninguna nueva.

### Pendiente o fuera de alcance detectado (corrección de la ronda 2)

Ninguno nuevo.
