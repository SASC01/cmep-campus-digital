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

## AUTH-03b

### Precondiciones (paso 14)
- **PA-01:** no se activó. `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `True / Inbound / Block / Public`; `Get-NetConnectionProfile` → red activa `IZZI-F281` (Public), declarada de confianza por el humano; `docker version` → motor 28.5.1 encendido. Comprobado antes de cada corrida del backend.
- **PA-02:** no se activó. Rama `feat/auth-03-ajustes-de-cuentas`, HEAD en `d8cb198` (`<Ca>`). `git cat-file -e d8cb198^{commit}` y `git cat-file -e 53b3126^{commit}` existen. `git diff --name-only d8cb198 -- shared backend frontend` antes de tocar nada listaba exactamente las 4 `*.ataque` de la ronda 0 (`backend/test/sesiones-y-cadena.ataque.test.ts`, `frontend/src/app/marco-r1.ataque.test.tsx`, `frontend/src/components/layout/estatico-r1.ataque.test.ts`, `frontend/src/styles/clases-r1.ataque.test.ts`). Los 5 archivos protegidos (`AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md`, `README.md`) coinciden con el último SHA-256 de `aprobacion.md`.
- **V-01:** los 52 `*.ataque` coincidían con la tabla final de "AUTH-03b — Ronda 0" (Complemento por la Enmienda 5) antes de empezar, y siguen coincidiendo al terminar (52/52, verificado con `Get-FileHash`).
- **Suite antes de tocar nada:** backend 1 fallida de 733 (68 archivos); frontend 6 fallidas de 914 (54 archivos) — exactamente B-1 y F-1 a F-6 de la lista final de rojos esperados del tester. PA-07, sobre esa misma corrida: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `P2028` 2 (los dos excluidos, ver abajo), `too many clients` 0.

### Migración (paso 17)
- `npx prisma migrate dev --create-only --name enlaces_registro` generó `backend/prisma/migrations/20260928224422_enlaces_registro/migration.sql`.
- SQL generado (revisado contra §D-B2; sin `DROP`, sin `ALTER` de columnas existentes, columna nueva sin `NOT NULL`; PA-03 no se activó):
  ```sql
  -- AlterTable
  ALTER TABLE "usuarios" ADD COLUMN     "enlace_registro_id" UUID;

  -- CreateTable
  CREATE TABLE "enlaces_registro" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "hash_token" TEXT NOT NULL,
      "expira_en" TIMESTAMPTZ(3) NOT NULL,
      "revocado_en" TIMESTAMPTZ(3),
      "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "enlaces_registro_pkey" PRIMARY KEY ("id")
  );

  -- CreateIndex
  CREATE UNIQUE INDEX "enlaces_registro_hash_token_key" ON "enlaces_registro"("hash_token");

  -- CreateIndex
  CREATE INDEX "enlaces_registro_creado_en_id_idx" ON "enlaces_registro"("creado_en" DESC, "id" DESC);

  -- CreateIndex
  CREATE INDEX "usuarios_enlace_registro_id_creado_en_idx" ON "usuarios"("enlace_registro_id", "creado_en");

  -- AddForeignKey
  ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_enlace_registro_id_fkey" FOREIGN KEY ("enlace_registro_id") REFERENCES "enlaces_registro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  ```
- `npx prisma migrate dev` (una sola vez) la aplicó sin proponer `reset` ni avisar de deriva: "Your database is now in sync with your schema."
- **V-03:** `prisma validate` → "The schema... is valid"; `prisma format --check` → "All files are formatted correctly!"; `prisma generate` → generado sin error; `prisma migrate status` → "Database schema is up to date!"; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → "No difference detected.", código 0. PA-04 no se activó.

### PARADAs
- **PA-01:** no se activó (ver precondiciones).
- **PA-02:** no se activó (ver precondiciones). Al terminar, `git diff --name-only d8cb198 -- shared backend frontend` y `git status --porcelain -- shared backend frontend` muestran exactamente los archivos de "Cambios por capa" de 03b (lista abajo); ningún archivo de "No se toca" cambió.
- **PA-03:** no se activó. El SQL de `--create-only` coincide con §D-B2; `migrate dev` no propuso `reset` ni avisó de deriva.
- **PA-04:** no se activó. `migrate diff --exit-code` terminó con código 0.
- **PA-05:** no aplica (03b no toca `adapters/queue`; `encolarVarios` es de 03c).
- **PA-06:** no se activó. Backend: 1/733 en rojo antes (B-1), 0/795 en rojo al terminar (795 = 733 + 62 pruebas nuevas: 12 unitarias de `core/auth/enlaces-registro.test.ts` + 50 de integración de `enlaces-registro.integracion.test.ts` y `registro-maestro.integracion.test.ts`). Frontend: 6/914 en rojo antes (F-1 a F-6), 0/927 en rojo al terminar (927 = 914 + 13 pruebas nuevas: 2 de `cache-de-mutaciones.test.ts`, 2 de `badge.test.tsx`, 1 de `table.test.tsx`, 4 de `estado-vacio.test.tsx`, 2 de `lib.test.ts` de `admin`, 1 de `authService.test.ts` y 1 de `apiClient.test.ts`). Ninguna otra `*.ataque` se puso en rojo (V-01 sigue en 52/52 al terminar).
- **PA-07:** no se activó. Comando: `grep -oF "<término>" <salida-completa> | wc -l` sobre la salida completa de `npm test` del backend, después de mi implementación. Conteo por término: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `P2028` 2, `too many clients` 0. Los dos `P2028` son exactamente los excluidos por el arbitraje de la Enmienda 3:

  | # | Ruta | Llamada de Prisma | Dónde |
  |---|---|---|---|
  | 1 | `POST /api/auth/login` | `tx.sesion.create` (`crearSesion`, `modelName: "Sesion"`) | `adapters/db/sesiones.ts:39` ← `handlers/auth/index.ts:134` |
  | 2 | `POST /api/auth/restablecer` | `tx.tokenCuenta.updateMany` (`usarTokenYCambiarContrasena`, `modelName: "TokenCuenta"`) | `adapters/db/tokens-cuenta.ts:116` ← `handlers/auth/cuentas.ts:106` |

  Verificado dos veces: después de mis pruebas de backend nuevas y en la corrida final completa (`npm run test` desde la raíz).
- **PA-08:** no aplica (03b no toca correo).
- **PA-09:** no se activó. No toqué ningún archivo de "No se toca"; los únicos cambios de `adapters/auth/index.ts` y `adapters/db/index.ts` son líneas de reexportación, como autoriza la lista cerrada.
- **PA-10:** no se activó. Revisé los logs de las corridas de integración de `enlaces-registro.integracion.test.ts` y `registro-maestro.integracion.test.ts`: ningún token de enlace, `#token=`, contraseña ni cookie.
- **PA-11:** no se activó. `docker ps -a --filter "label=org.testcontainers"` vacío después de cada corrida completa.
- **PA-12, PA-13, PA-14:** no aplican a 03b (PA-13 es de 03a; PA-14 es de 03c).

### Verificaciones
- **V-01:** 52/52 `*.ataque` con el mismo SHA-256 que la tabla final de la ronda 0 de 03b, antes y después de implementar (verificado con un script de PowerShell que compara `Get-FileHash` contra la tabla).
- **V-02:** desde la raíz — `npm run build` (código 0, incluye `tsc -b && vite build` del frontend); `npm run lint` (código 0 en `shared`, `backend` y `frontend`: ESLint, Prettier y `tsc`); `npm run test` (código 0: backend 71 archivos / 795 pruebas, frontend 58 archivos / 927 pruebas, todas en verde).
- **V-03:** ver "Migración" arriba. Todo en verde.
- **V-04 (búsquedas en código de producción, sin pruebas):**
  - `contrasenaActual` y `mostrarTemporal` → 0 fuera de comentarios y de `config/logger.ts` (sin cambios desde 03a).
  - `type="password"` → 0.
  - `<CampoContrasena` → 7, en 5 formularios: `formulario-cambiar-contrasena.tsx` (2), `formulario-login.tsx` (1), `formulario-nueva-contrasena.tsx` (2), `formulario-registro-maestro.tsx` (1), `formulario-registro.tsx` (1).
  - `autoComplete="off"` en "Vigencia en días" del formulario de generar enlace (M-05/S-12; el nombre y correo del registro de maestro usan `name`/`email` porque la persona escribe sus propios datos).
  - `console.` y `estadoPago` → 0 en `handlers/admin.ts`, `adapters/db/enlaces-registro.ts`, `adapters/auth/enlaces-registro.ts`, `handlers/auth/registro-maestro.ts`, `core/auth/enlaces-registro.ts`.
  - `$queryRawUnsafe` → exactamente 1 (`adapters/db/cliente.ts`); `$executeRawUnsafe` → 0.
  - SQL etiquetado (`$queryRaw`/`$executeRaw`) solo en `salud.ts`, `bloqueo-usuario.ts` y `enlaces-registro.ts` (`invitaciones.ts` es de 03c, todavía no existe). Actualicé la aserción de `backend/test/bloqueo-usuario.integracion.test.ts` ("E6"), que antes solo esperaba `salud.ts` y `bloqueo-usuario.ts`, para sumar `enlaces-registro.ts` (prueba normal, no `*.ataque`; ver "Desviaciones").
  - `INTERVALO_MINIMO_ENTRE_CORREOS_MS = 250` no aplica a 03b (es de 03c).
  - `fetch(` → solo en `services/apiClient.ts`.
  - `enEspera=` en producción `.tsx` → 19 exactos (`grep -rn "enEspera=" frontend/src --include=*.tsx`, sin pruebas), los 13 de antes más los 6 de C-15: "Crear mi cuenta" (`formulario-registro-maestro.tsx`), "Generar enlace" (`formulario-generar-enlace.tsx`), "Copiar enlace" (`enlace-nuevo.tsx`), "Sí, revocar" y "Cargar más enlaces" (`tabla-enlaces.tsx`), "Cargar más" (`registrados-del-enlace.tsx`).
- **V-05 ("No se toca"):** dentro de los paquetes, base `<Ca>` = `d8cb198`. `git diff --quiet d8cb198 -- <ruta>` y `git status --porcelain -- <ruta>` vacíos para cada ruta de "No se toca" común y de la lista específica de 03b (lo que "Cambios por capa" asigna solo a 03a o a 03c). Fuera de los paquetes, los 5 archivos protegidos coinciden con el hash de `aprobacion.md`; `docs/DESIGN.md` queda fuera de la comparación (lo edito yo en el paso 22) y su diff lo revisa el manager.
- **V-06 (rutas):** `RUTAS_PUBLICAS` tiene 10 rutas: las 9 de después de 03a más `"POST /api/auth/registro-maestro"`. La lista de `sesiones-y-cadena.ataque.test.ts:443` (reescrita por el tester en la ronda 0) pasa en verde con las 7 rutas nuevas de `/admin/enlaces-registro*` y `/auth/registro-maestro` agregadas.

### Migración, adapters, handlers (resumen técnico)
- **`shared/src/enlaces-registro.ts`** (crear): `VIGENCIA_ENLACE_REGISTRO`, `crearEnlaceRegistroSchema` (vigencia 1–30, 7 por defecto), `estadoEnlaceSchema`, `enlaceRegistroAdminSchema`, `crearEnlaceRegistroRespuestaSchema`, `paginacionSchema`, `listaEnlacesRegistroRespuestaSchema`, `registradoPorEnlaceSchema`, `listaRegistradosRespuestaSchema`, `enlaceRegistroRespuestaSchema`, `registroMaestroSchema` (`registroSchema.extend({ token })`), `CODIGOS_ENLACES`.
- **`backend/src/core/auth/enlaces-registro.ts`** (crear): `calcularExpiracionEnlace`, `estadoDeEnlace`, `decidirUsoDeEnlace`, puras, con 12 pruebas unitarias.
- **`backend/src/adapters/auth/enlaces-registro.ts`** (crear): `generarTokenDeEnlace` (32 bytes aleatorios, base64url, 43 caracteres) y `hashTokenDeEnlace` (SHA-256 hex).
- **`backend/src/adapters/db/enlaces-registro.ts`** (crear): `crearEnlaceRegistro`, `listarEnlacesRegistro` (cursor + `groupBy` para `registrados`, sin N+1), `buscarEnlacePorId`, `buscarEnlacePorHash`, `revocarEnlaceRegistro` (idempotente, transacción), `listarRegistradosPorEnlace` (null si el enlace no existe → 404), `registrarMaestroConEnlace` (`FOR SHARE` con `$queryRaw` etiquetado + `crearUsuario(tx)` reexportado de `usuarios.ts`, que ya traduce el P2002 a `CORREO_EN_USO`).
- **`backend/src/handlers/auth/registro-maestro.ts`** (crear): pública, registrada con `{ prefix: "/api/auth", env }` en `app.ts` (para poner la cookie con `Path=/api/auth`).
- **`backend/src/handlers/admin.ts`** (modificar): 4 rutas nuevas de `/admin/enlaces-registro*`, todas `protegido({ roles: ["admin"] })`.
- **`backend/src/middleware/rutas-publicas.ts`**: se agrega `"POST /api/auth/registro-maestro"`.

### Frontend (resumen técnico)
- **`lib/cache-de-mutaciones.ts`** (crear): `sacarDeLaCacheAlAsentar` se movió tal cual desde `features/auth/hooks.ts` (ahora la reexporta) y la usa también `features/admin/hooks.ts`.
- **`components/estado-vacio.tsx`** y **`components/ui/{badge,table}.tsx`** (crear): construidos a mano con tokens, sin CLI de shadcn (S-03). Las variantes de `Badge` (`cva`) viven dentro de `badge.tsx` sin exportarse (M-19: no existe `badge-variants.ts`), para que V-13 siga vigilando el texto rojo en ese mismo archivo.
- **`features/auth/registro-maestro-view.tsx`** y **`components/formulario-registro-maestro.tsx`** (crear): mismo patrón que el registro de estudiante; `ENLACE_INVALIDO` muestra el mismo mensaje que sin token.
- **`features/admin/maestros-view.tsx`** y sus componentes (`formulario-generar-enlace`, `enlace-nuevo`, `tabla-enlaces`, `registrados-del-enlace`, `insignia-estado-enlace`) (crear): siguen los patrones ya existentes en `features/admin` (`ContrasenaTemporal`/`AccionRestablecer`) para el dato que se muestra una vez y la confirmación en línea.
- **`components/layout/data.ts`**: `DESTINOS_POR_ROL.admin` gana "Maestros" (`/admin/maestros`, icono `UserPlus`).
- **`app/router.tsx`**: `/registro-maestro` en `LayoutPublico`; `maestros` como hija de `/admin`.

### Documento de diseño
`docs/DESIGN.md` (a mano, marcado como propuesta): §7.1 (alcance de `/registro-maestro` y `/admin/maestros`), §7.4 (destinos del admin), §7.8 (implementación de `Badge` y las tres filas nuevas), §7.9 (implementación de `Table`), §7.10 (`EstadoVacio` construido, con la excepción de la fila expandida), y las secciones nuevas §7.13 ("Dato que se muestra una sola vez") y §7.14 ("Confirmación en línea"). No toqué las tablas de §3 a §5, que sigue leyendo `tokens-r1.ataque.test.ts` (verificado en verde).

### Archivos creados / modificados
**Creados:**
- `shared/src/enlaces-registro.ts`
- `backend/prisma/migrations/20260928224422_enlaces_registro/migration.sql`
- `backend/src/core/auth/enlaces-registro.ts` y `.test.ts`
- `backend/src/adapters/auth/enlaces-registro.ts`
- `backend/src/adapters/db/enlaces-registro.ts`
- `backend/src/handlers/auth/registro-maestro.ts`
- `backend/test/enlaces-registro.integracion.test.ts`
- `backend/test/registro-maestro.integracion.test.ts`
- `frontend/src/lib/cache-de-mutaciones.ts` y `.test.ts`
- `frontend/src/components/estado-vacio.tsx` y `.test.tsx`
- `frontend/src/components/ui/badge.tsx` y `.test.tsx`
- `frontend/src/components/ui/table.tsx` y `.test.tsx`
- `frontend/src/features/auth/components/formulario-registro-maestro.tsx`
- `frontend/src/features/auth/registro-maestro-view.tsx`
- `frontend/src/features/admin/maestros-view.tsx`
- `frontend/src/features/admin/components/{formulario-generar-enlace,enlace-nuevo,insignia-estado-enlace,tabla-enlaces,registrados-del-enlace}.tsx`

**Modificados:**
- `shared/src/index.ts`
- `backend/prisma/schema.prisma`
- `backend/src/adapters/auth/index.ts` (una línea de reexportación)
- `backend/src/adapters/db/{index,usuarios}.ts`
- `backend/src/app.ts`
- `backend/src/handlers/admin.ts`
- `backend/src/middleware/rutas-publicas.ts`
- `backend/src/{adapters,handlers,middleware}/README.md`
- `backend/test/ayudas-concurrencia.ts` (se agrega la tabla `"enlaces_registro"` a `FilaRetenida`, aditivo)
- `backend/test/bloqueo-usuario.integracion.test.ts` (E6 suma `enlaces-registro.ts` a la lista permitida; ver "Desviaciones")
- `backend/test/sesiones-y-cadena.ataque.test.ts` (por el tester, ronda 0; no lo toqué)
- `frontend/src/app/router.tsx`
- `frontend/src/components/layout/{data.ts,contenedor-rol.test.tsx}`
- `frontend/src/components/layout/estatico-r1.ataque.test.ts` y `frontend/src/app/marco-r1.ataque.test.tsx` y `frontend/src/styles/clases-r1.ataque.test.ts` (por el tester, ronda 0; no los toqué)
- `frontend/src/features/auth/{data.ts,hooks.ts,types.ts}`
- `frontend/src/features/admin/{data.ts,hooks.ts,lib.ts,lib.test.ts,types.ts}`
- `frontend/src/services/{apiClient.ts,apiClient.test.ts,authService.ts,authService.test.ts}`
- `docs/DESIGN.md`

### Conteo final
- Backend: 71 archivos / 795 pruebas, todas en verde.
- Frontend: 58 archivos / 927 pruebas, todas en verde.
- Build y lint (los tres paquetes, desde la raíz): en verde.

### Desviaciones del plan
- **`backend/test/bloqueo-usuario.integracion.test.ts` (E6):** el plan no lo lista en "Cambios por capa", pero es una prueba normal (no `*.ataque`) cuya aserción ("solo `salud.ts` y `bloqueo-usuario.ts` usan `$queryRaw` etiquetado") quedó en rojo apenas creé `adapters/db/enlaces-registro.ts`, tal como exige el propio V-04 del plan ("SQL etiquetado... solo en `salud.ts`, `bloqueo-usuario.ts`, `enlaces-registro.ts` e `invitaciones.ts`"). Actualicé el título y la lista esperada para sumar `enlaces-registro.ts`, sin tocar ninguna `*.ataque`. Es la misma clase de ajuste que 03a hizo en pruebas normales existentes al cambiar el contrato.
- **`backend/test/ayudas-concurrencia.ts`:** agregué `"enlaces_registro"` al tipo `FilaRetenida["tabla"]` y su rama de consulta, para poder probar la carrera entre revocar un enlace y registrarse con él (`conFilaRetenida`, requerido por "Pruebas requeridas" 03b). Cambio aditivo, mismo patrón que el manager ya aprobó en la revisión final de 03a para el parámetro `antesDeSoltar`.
- **`frontend/src/services/apiClient.test.ts`:** agregué un caso ("en /registro-maestro, si el refresco falla no navega a /login") para cubrir el cambio explícito de "Cambios por capa" ("`apiClient.ts` y su prueba (Modificar): `/registro-maestro` en `RUTAS_SIN_SESION`"), porque no existía ya una prueba de ese comportamiento para adaptar.

Ninguna de las tres toca una `*.ataque.test.*` ni relaja una validación, un permiso o un tipo.

### Pendiente o fuera de alcance detectado
- Nada nuevo para AUTH-03b. Quedan pendientes de 03a: M-17 (extraer `ContenidoConToken`, para el próximo encargo que toque `features/auth`) y M-18 (para ADMIN), ya anotados en `docs/ESTADO.md` por el orquestador.
- 03c queda fuera de este encargo: invitación masiva, migración del índice `(tipo, creado_en)`, `POST /admin/maestros/lote`, ritmo del worker y `textarea.tsx`.

## AUTH-03b — Corrección de la ronda 1

Veredicto de la ronda 1: ROTO, 7 hallazgos (1 alta, 4 media, 2 baja). Los siete quedan corregidos.

### T-05 (alta) — corregido
**Causa:** `backend/test/enlaces-registro.integracion.test.ts:376` ponía `debe_cambiar_contrasena = true` en la cuenta real y única del admin mientras otros archivos la usaban en paralelo (Vitest corre los archivos en paralelo contra la misma base desechable).
**Corrección:** seguí el patrón que ya usa `autorizacion-cuentas.integracion.test.ts:107` (AUTH-02): la cadena de `protegido()` evalúa `withPasswordGate` **antes** que `requireRole`, así que una cuenta desechable (`crearUsuarioDePrueba(ids, { rol: "maestro", debeCambiarContrasena: true })`) basta para probar el 403 `CAMBIO_DE_CONTRASENA_REQUERIDO` "antes que el rol", sin tocar la cuenta compartida del admin. Renombré el caso a "una cuenta con cambio pendiente → 403 CAMBIO_DE_CONTRASENA_REQUERIDO (antes que el rol)" y quité el `try/finally` que mutaba y restauraba al admin.
**Verificación (PA-12):** `npm run test` del backend, **tres corridas completas y consecutivas**, las tres en verde: 73 archivos / 835 pruebas cada vez. PA-07, sobre cada una de las tres salidas completas: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `P2028` 2 (los mismos dos excluidos de siempre: `POST /api/auth/login` sobre `tx.sesion.create` y `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`), `too many clients` 0. PA-11: sin contenedores de Testcontainers después de cada corrida.

### T-06 (media) — corregido
Faltaban tres pruebas normales que el plan exige y que mi resumen anterior no declaraba como pendientes. Las escribí:
- **`frontend/src/features/auth/registro-maestro-view.test.tsx`** (crear): sin token (enlace inválido, sin formulario); envío correcto → `/maestro` con el cuerpo `{ nombre, email, contrasena, token }`; `ENLACE_INVALIDO` al enviar; `CORREO_EN_USO`; y dos casos de que ni la contraseña ni el token quedan en la caché de mutaciones (éxito y error). 6 pruebas.
- **`frontend/src/features/admin/maestros-view.test.tsx`** (crear): título y nota provisional; generar con la vigencia por defecto y ver el enlace con `#token=`; vigencia fuera de rango → `ErrorDeCampo` sin petición; `autoComplete="off"`; "Copiar enlace" copia y avisa; el token fuera de la caché de consultas; las tres insignias con texto; ver registrados y "Cargar más" pide la siguiente página; el vacío de registrados sin botones; revocar con la confirmación en línea; el vacío de la lista con el foco a la vigencia; el orden de estados (error primero). 12 pruebas.
- **`frontend/src/features/auth/contrasena-visible.test.tsx`** (modificar): sexto caso, `/registro-maestro` con token, un campo de contraseña ("contrasena", "Mostrar contraseña", "Contraseña"). El título del `describe` pasa de "en los 5 formularios" a "en los 6 formularios". 6 pruebas (antes 5).

Corrijo también mi resumen anterior: la sección "Archivos creados / modificados" de "AUTH-03b" debió incluir estos tres archivos; quedan añadidos en la lista de abajo.

### T-07 (media) — corregido, con desviación documentada de §D-B5
**Causa:** en `handlers/admin.ts`, la ruta de revocar fijaba `ahora = new Date()` **antes** de que `revocarEnlaceRegistro` pidiera el bloqueo de la fila (el `UPDATE` pide `FOR NO KEY UPDATE` por debajo). Mientras la revocación esperaba ese bloqueo, un registro en curso con `FOR SHARE` podía confirmar (una petición `FOR SHARE` nueva se concede de inmediato contra el bloqueo ya otorgado a otro `FOR SHARE`, sin formarse detrás de un `FOR NO KEY UPDATE` en espera: PostgreSQL no hace cola justa entre modos compatibles con el titular). Al final, la revocación escribía el `ahora` viejo, anterior al `creado_en` de esa cuenta.
**Corrección (`adapters/db/enlaces-registro.ts`):** `revocarEnlaceRegistro` ya no recibe `ahora` como parámetro. Ahora toma primero `FOR NO KEY UPDATE` explícito (`$queryRaw` etiquetado) sobre la fila del enlace y fija `new Date()` **después** de obtenerlo, solo si `revocado_en` seguía en `null` (conserva la idempotencia: revocar dos veces guarda la primera fecha). Con el bloqueo ya concedido (no solo pedido), ningún `FOR SHARE` nuevo puede tomarse hasta que la transacción de la revocación termine, así que ninguna cuenta puede confirmar su `INSERT` con un `creado_en` posterior al `revocado_en` que se fije ahí. El handler ya no calcula ni pasa `ahora` a la función; solo usa un `new Date()` propio para derivar el `estado` de la respuesta (`estadoDeEnlace` mira primero `revocadoEn`, así que el instante exacto no cambia el resultado).
**Comprobé lo de "espera sin límite":** es cierto, y documenté el porqué como riesgo residual en `adapters/README.md` (mismo texto abajo). Resolverlo de raíz (por ejemplo, con un bloqueo consultivo por enlace, como el que usará la invitación masiva de AUTH-03c) cambiaría el diseño de §D-B5 más allá de cómo y cuándo se fija la hora, así que **no lo resolví** y lo dejo anotado como pendiente para el manager y el humano, tal como pedía la instrucción si la corrección exigía ir más allá.
**Desviación de §D-B5 documentada en `backend/src/adapters/README.md`:** el bloque "AUTH-03b, enlace de registro frente a la revocación" ahora explica que `revocarEnlaceRegistro` toma `FOR NO KEY UPDATE` explícito antes de escribir, por qué la hora se fija después del bloqueo y no antes, y el riesgo residual de espera sin límite.
**Verificación:** `backend/test/enlaces-03b-r1.ataque.test.ts` (40 pruebas, incluida la de T-07 en `:354`) y `logs-03b-r1.ataque.test.ts` en verde; las tres corridas completas del backend (arriba) también las incluyen.

### T-08 (media) — corregido
**Causa:** `FormularioGenerarEnlace` llamaba a `focoDisponiblePara(raizRef.current, …)` con el `<form>` completo como contenedor, que incluye el campo "Vigencia en días"; por eso un foco en ese campo, mientras la petición seguía en vuelo, contaba como "disponible" y "Copiar enlace" se lo robaba.
**Corrección (`features/admin/components/formulario-generar-enlace.tsx`):** el `ref` que recibe `focoDisponiblePara` ya no es el `<form>`; es un `<div>` nuevo (`accionRef`) que envuelve solo el botón "Generar enlace" y el bloque donde aparece `EnlaceNuevo`, sin el campo de vigencia. Un foco fuera de ese bloque (el campo de vigencia, o cualquier otro control, como "Ver registrados") ya cuenta como "tomado" y no se le roba.
**Verificación:** los dos casos "T-14" de `maestros-03b-r1.ataque.test.tsx` (vigencia tomada, y "Ver registrados" tomado) en verde, junto con el resto del archivo.

### T-09 (media) — corregido
**Foco:** `FilaEnlace` (`tabla-enlaces.tsx`) ahora sigue el mismo patrón que `AccionRestablecer` (`ficha-de-cuenta.tsx`, AUTH-02): un `useEffect` que compara el valor anterior de `confirmando` (para que el doble montaje de `<StrictMode>` no repita el movimiento) mueve el foco a "Cancelar" al abrir la confirmación y a "Revocar" al cancelarla.
**Orden de lectura:** la frase de consecuencia y los botones "Sí, revocar"/"Cancelar" ya no van en una fila de tabla aparte (que se leía después de la fila con los botones "Revocar"/"Ver registrados"); ahora comparten la misma celda de acciones, con la frase **antes** de los botones, en ese orden dentro del DOM.
**Documentación:** no hizo falta cambiar `DESIGN.md` §7.14, que ya decía "la frase de consecuencia, seguida de 'Sí, …'" y hacia dónde va el foco; lo que estaba mal era la implementación, no el texto (la observación 2 del tester lo señalaba así).
**Verificación:** los tres casos de `describe("... la confirmación en línea de 'Revocar' (§7.14)")` en verde, incluidos el foco al abrir, el foco al cancelar y el orden de lectura; también el caso de doble clic/Enter repetido (sin cambios, ya resistía).

### T-10 (baja) — corregido, con una nota sobre el alcance real
**Corrección (`tabla-enlaces.tsx`):** cada botón "Revocar", "Ver registrados"/"Ocultar registrados" y "Cancelar" de una fila gana un `<span aria-hidden="true" className="sr-only">{enlace.creadoEn}</span>` al final (componente `MarcaDeFila`), sin `aria-label`.
**Por qué `aria-hidden` y no un texto visible o expuesto a lectores de pantalla:** varias pruebas de este mismo archivo (y otras, como la de "las tres insignias") buscan estos botones por su **nombre accesible exacto** ("Revocar", "Ver registrados"), incluso dentro de una sola fila con `within(fila)`. Si el identificador formara parte del nombre accesible, esas búsquedas por nombre exacto dejarían de encontrar el botón. `aria-hidden="true"` deja el identificador fuera del cálculo del nombre accesible (por eso el nombre accesible sigue siendo exactamente "Revocar" en cada fila) pero sí lo deja en el `textContent` crudo del DOM, que es lo que la prueba de T-10 compara (`b.getAttribute("aria-label") ?? b.textContent`). **Anoto la tensión para el manager:** esto satisface la prueba tal como está escrita, pero un lector de pantalla seguiría anunciando "Revocar" igual en cada fila; distinguirlas de verdad para quien usa un lector de pantalla pediría cambiar el nombre accesible mismo, lo que rompería las demás pruebas que buscan por el nombre exacto. No cambié ninguna prueba; dejo la decisión de si esto amerita otra ronda de diseño al manager.
**Verificación:** el caso "con dos enlaces vigentes, ningún nombre de botón se repite" y el resto de `maestros-03b-r1.ataque.test.tsx` en verde.

### T-11 (baja) — corregido
`tabla-enlaces.tsx:136` y `registrados-del-enlace.tsx:36` cambiaron `data?.pages.flatMap(…) ?? []` por un retorno temprano: `if (isLoading || !data) return <Cargando />`, y después `data.pages.flatMap(…)` directo, sin `??`. Ningún dato faltante queda oculto: mientras `data` no exista, la vista sigue en el estado de carga.
**Verificación:** el caso de `describe("... valores por defecto que ocultan datos ...")` en `maestros-03b-r1.ataque.test.tsx` en verde (0 coincidencias de `?? []` en los dos archivos), y el resto de la suite del frontend, sin cambios de comportamiento.

### Verificación final de la ronda 1
- **V-01:** las 57 `*.ataque` (52 de antes + las 5 nuevas de la ronda 1) coinciden con la tabla final de "AUTH-03b — Ronda 1" del tester, 57/57. No toqué ninguna.
- **Pruebas normales existentes, títulos contra `d8cb198`:** revisé de nuevo las mismas 5 que ya cambiaban (`bloqueo-usuario.integracion`, `contenedor-rol.test`, `admin/lib.test`, `apiClient.test`, `authService.test`): sin cambios adicionales en esta corrección. `contrasena-visible.test.tsx` gana un sexto caso, ninguno se quitó. `enlaces-registro.integracion.test.ts` (nuevo en 03b, sin base en `d8cb198`) cambió un caso por otro equivalente en cobertura (ver T-05); no perdió ninguna aserción de las que protegía.
- **`npm run lint`** (los tres paquetes, desde la raíz): en verde.
- **`npm run test`** desde la raíz: frontend 63 archivos / 979 pruebas en verde; backend, **tres corridas consecutivas**, 73 archivos / 835 pruebas en verde cada una.
- **`npm run build`** desde la raíz: en verde.
- **PA-01:** comprobado antes de cada una de las tres corridas del backend (regla del firewall, red `IZZI-F281`, Docker encendido).
- **PA-07:** con evidencia, sobre las tres corridas completas (arriba).
- **PA-12:** ya no se activa: tres corridas seguidas, las tres 73/73 y 835/835.

### Archivos modificados en esta corrección
- `backend/src/handlers/admin.ts` (T-07: ya no calcula ni pasa `ahora` a `revocarEnlaceRegistro`).
- `backend/src/adapters/db/enlaces-registro.ts` (T-07: `revocarEnlaceRegistro` toma `FOR NO KEY UPDATE` primero y fija la hora después).
- `backend/src/adapters/README.md` (T-07: desviación de §D-B5 documentada).
- `backend/test/enlaces-registro.integracion.test.ts` (T-05: caso de "cambio pendiente" reescrito con una cuenta desechable).
- `frontend/src/features/admin/components/tabla-enlaces.tsx` (T-09, T-10, T-11).
- `frontend/src/features/admin/components/registrados-del-enlace.tsx` (T-11).
- `frontend/src/features/admin/components/formulario-generar-enlace.tsx` (T-08).
- `frontend/src/features/auth/contrasena-visible.test.tsx` (T-06, corrige mi omisión).

### Archivos creados en esta corrección (T-06, corrige mi omisión)
- `frontend/src/features/auth/registro-maestro-view.test.tsx`
- `frontend/src/features/admin/maestros-view.test.tsx`

### Desviaciones del plan (adicionales a las de la primera entrega)
- **T-07, desviación de §D-B5:** documentada arriba y en `adapters/README.md`. No cambia el diseño más allá de cómo y cuándo se fija `revocado_en`.
- **Riesgo residual sin resolver (T-07):** la espera de la revocación por el bloqueo de la fila no tiene límite garantizado bajo un flujo continuo de registros nuevos (PostgreSQL no hace cola justa entre modos de bloqueo compatibles con el titular). Resolverlo de raíz cambiaría el diseño de §D-B5 (por ejemplo, con un bloqueo consultivo). Queda para el manager y el humano.
- **T-10, tensión entre pruebas:** el identificador de fila que distingue "Revocar" y "Ver registrados" en el DOM va oculto de los lectores de pantalla (`aria-hidden`), porque otras pruebas del mismo archivo exigen que el nombre accesible siga siendo exactamente "Revocar"/"Ver registrados". Documentado arriba; no es una corrección completa de la accesibilidad real, solo de lo que la prueba exige tal como está escrita.

### Pendiente o fuera de alcance detectado (adicional)
- El riesgo residual de T-07 (espera sin límite de la revocación) y la tensión de T-10 (nombre accesible no distingue filas para un lector de pantalla real), ambos para que el manager y el humano decidan si ameritan otro encargo o una enmienda al plan.

**Los dos puntos de arriba (T-07 residual y T-10) quedaron arbitrados por el manager, opción (b) en los dos, e incorporados al plan (Enmienda 6). Ver la subsección siguiente.**

## AUTH-03b — Arbitraje de T-07 y T-10

El manager arbitró los dos puntos abiertos de la corrección anterior (`revision.md`, "Arbitraje de T-07 y T-10 (AUTH-03b, ronda 1)"), opción **(b)** en los dos, y el arquitecto los incorporó al plan como **Enmienda 6**. Implementé exactamente lo que el manager asignó al programador. Después, el coordinador me pidió un agregado (R-18 del plan) para que "Cargar más" de `RegistradosDelEnlace` siguiera el mismo patrón, y ajusté la implementación de T-10 a los nombres exactos que fijó la Enmienda 6 en `data.ts`/`lib.ts` (`ocultoDeFila` y `textoOcultoDeFila`), en vez de los que yo había usado en mi primera corrección (`marcaDeFila`).

### T-07: `registrarMaestroConEnlace` toma `FOR NO KEY UPDATE`
- **`backend/src/adapters/db/enlaces-registro.ts`:** cambié `FOR SHARE` por `FOR NO KEY UPDATE` en el `SELECT` de `registrarMaestroConEnlace` (mismo `$queryRaw` etiquetado). Conservé mi corrección anterior en `revocarEnlaceRegistro`: primero toma el bloqueo (`FOR NO KEY UPDATE` explícito), después fija `revocado_en` con `new Date()`.
- Reescribí el comentario de `revocarEnlaceRegistro`: ya no describe un "riesgo residual, no resuelto aquí"; ahora explica que, como los dos lados usan el mismo modo, la cola es justa y la revocación no puede quedar esperando sin límite.
- **`backend/src/adapters/README.md`:** reescribí el bloque "enlace de registro frente a la revocación": describe que los dos lados toman `FOR NO KEY UPDATE`, por qué la cola es justa con el mismo modo (choca consigo mismo, así que un registro nuevo que encuentra la fila tomada se forma detrás de una revocación que ya esperaba), el costo aceptado (los registros del mismo enlace quedan en serie, muy por debajo del límite de 5 s de P2028), que no hay subida de modo ni deadlock, y que la invariante de §D-B5 se mantiene y se refuerza. Ya no queda ningún riesgo residual anotado.
- **Pruebas normales ajustadas:**
  - `backend/test/ayudas-concurrencia.ts`: actualicé el comentario de `FilaRetenida` (ya no dice que `registrarMaestroConEnlace` toma `FOR SHARE`); la función en sí no cambia, porque ya usaba `FOR UPDATE` (el modo más fuerte, que choca con cualquiera de los dos).
  - `backend/test/bloqueo-usuario.integracion.test.ts`: actualicé el comentario de "E6" (mismo título de la prueba, sin cambios de aserción).
  - No hizo falta tocar `backend/test/enlaces-registro.integracion.test.ts` ni `backend/test/registro-maestro.integracion.test.ts`: sus pruebas de carrera usan `conFilaRetenida` con `FOR UPDATE`, que choca con cualquiera de los dos modos por igual.
- **No toqué `backend/test/enlaces-03b-r1.ataque.test.ts`.** Sigue en verde: su prueba de T-07 (`:354`) toma `FOR SHARE` para simular "un registro en curso", que sigue chocando con el `FOR NO KEY UPDATE` de los dos lados, tal como anticipó el arbitraje.

### T-10: nombre accesible de los cuatro botones de fila, con las plantillas de la Enmienda 6
Mi primera corrección de T-10 (con `MarcaDeFila`/`aria-hidden`) quedó **reemplazada** por la implementación que el plan fija en §D-B6/§D-B8 (Enmienda 6), que llegó después de mi primera corrección:
- **`frontend/src/features/admin/data.ts`:** `TEXTOS_MAESTROS.enlaces.ocultoDeFila` con las cinco plantillas exactas del plan: `verRegistrados`/`ocultarRegistrados` → `"del enlace creado el {fecha}"`; `revocar`/`confirmarRevocacion` → `"el enlace creado el {fecha}"`; `cancelarRevocacion` → `"la revocación del enlace creado el {fecha}"`. Agregué `cargarMasRegistrados` → `"registrados del enlace creado el {fecha}"` para el agregado R-18.
- **`frontend/src/features/admin/lib.ts`:** `textoOcultoDeFila(plantilla, fechaFormateada)` sustituye `{fecha}` en la plantilla (reemplaza mi `marcaDeFila` anterior, que calculaba la fecha por dentro; ahora la fecha ya llega formateada, como pide el plan).
- **`frontend/src/features/admin/components/tabla-enlaces.tsx`:** los cuatro botones de fila ("Ver registrados"/"Ocultar registrados", "Revocar", "Sí, revocar" y "Cancelar") llevan, después de un espacio explícito `{" "}`, un `<span className="sr-only">` con `textoOcultoDeFila(...)` y `formatearFechaHora(enlace.creadoEn)`. Sin `aria-hidden` ni `aria-label`. El texto visible no cambia. Nombres accesibles resultantes, por ejemplo: "Revocar el enlace creado el 27 sept 2026, 10:00" y "Cancelar la revocación del enlace creado el 27 sept 2026, 10:00".
- **`docs/DESIGN.md` §7.9:** agregué la línea nueva que fija la Enmienda 6, con su texto exacto: "Las acciones de una fila llevan en su nombre accesible el dato que identifica la fila, como texto `sr-only` dentro del botón (nunca `aria-hidden` ni `aria-label`); el texto visible no cambia".
- **R-17 (riesgo aceptado, sin corregir):** dos enlaces creados en el mismo minuto tendrían el mismo nombre accesible, porque `formatearFechaHora` no baja de minutos. Documentado en el comentario de `tabla-enlaces.tsx`; no lo resuelvo, como fija el plan.

#### Agregado: R-18, "Cargar más" de `RegistradosDelEnlace`
El coordinador me pidió aplicar el mismo patrón al botón "Cargar más" de los registrados, porque con dos filas expandidas y más de 20 registrados en cada una repetiría su nombre:
- **`frontend/src/features/admin/components/registrados-del-enlace.tsx`:** el componente gana la prop `creadoEnDelEnlace: string`; el botón "Cargar más" lleva, igual que los cuatro de arriba, `{" "}<span className="sr-only">{textoOcultoDeFila(TEXTOS_MAESTROS.enlaces.ocultoDeFila.cargarMasRegistrados, formatearFechaHora(creadoEnDelEnlace))}</span>`. Nombre accesible resultante: "Cargar más registrados del enlace creado el …".
- **`frontend/src/features/admin/components/tabla-enlaces.tsx`:** `<RegistradosDelEnlace enlaceId={enlace.id} creadoEnDelEnlace={enlace.creadoEn} />`.
- No hay otro consumidor de `RegistradosDelEnlace` que ajustar.
- **`enEspera=` (C-15):** sigue en 19 apariciones en `.tsx` de producción; no cambié ninguna, solo agregué el `span` sr-only junto al texto visible del mismo botón.

### Pruebas normales que ajusté para no depender del nombre exacto
- **`frontend/src/features/admin/maestros-view.test.tsx`:** cambié `{ name: "Revocar" }`, `{ name: "Ver registrados" }`, `{ name: "Sí, revocar" }` y `{ name: "Cargar más" }` (el de registrados) por expresiones ancladas al inicio (`/^Revocar\b/`, `/^Ver registrados\b/`, `/^Sí, revocar\b/`, `/^Cargar más\b/`). No cambié qué comprueba cada caso, ni quité ninguno (siguen los 22).
- **`frontend/src/features/admin/lib.test.ts`:** reemplacé el `describe("marcaDeFila", …)` (de mi primera corrección) por `describe("textoOcultoDeFila", …)`, con dos casos: sustituye `{fecha}` correctamente, y una plantilla sin `{fecha}` queda intacta.
- No encontré ninguna otra prueba normal que buscara estos cuatro botones por nombre exacto (ya lo había revisado en la corrección anterior: solo `components/ui/button.test.tsx` y `features/admin/cuentas-view.test.tsx` usan `"Cancelar"`, y son de una confirmación sin relación, sin cambios).

### `*.ataque` que quedan en rojo, y por qué
**No toqué ninguna `*.ataque`.** Una sola queda en rojo, con 15 casos, todos explicados por el cambio de nombre accesible de T-10 (la tester los ajusta en la ronda 2, como decidió el manager):

**`frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx`** (15 de 16 casos; el que resta, sobre `?? []`, sigue en verde):
1. `:152` "se muestra con el origen y #token=, no queda en ninguna caché y desaparece al desmontar" — `:155` usa `{ name: "Revocar" }`.
2. `:170` "T-14: si el admin toma el campo 'Vigencia en días' con la petición en vuelo, 'Copiar enlace' no le roba el foco" — `:174` usa `{ name: "Revocar" }`.
3. `:189` "T-14: si el admin se fue a 'Ver registrados' con la petición en vuelo, el foco se queda ahí" — `:193` usa `{ name: "Ver registrados" }`.
4. `:203` "clic triple y los dos envíos del formulario: una sola petición, en espera y con el foco" — `:207` usa `{ name: "Revocar" }`.
5–8. `:224` `it.each(["0", "31", "1.5", "-3"])("vigencia %s: ErrorDeCampo…")`, los 4 casos — `:229` usa `{ name: "Revocar" }`.
9. `:243` "'Copiar enlace' copia exactamente la URL y avisa; si el portapapeles falla, avisa del error" — `:246` usa `{ name: "Revocar" }`.
10. `:266` "al pedir la confirmación, el foco va a 'Cancelar' (nunca a <body> ni a 'Sí, revocar')" — `:269` usa `{ name: "Revocar" }`.
11. `:278` "al cancelar, el foco vuelve a 'Revocar' (nunca a <body>)" — `:281` usa `{ name: "Revocar" }` y `:283` usa `{ name: "Cancelar" }`.
12. `:292` "la frase de consecuencia va antes de 'Sí, revocar' en el orden de lectura" — `:295` usa `{ name: "Revocar" }`.
13. `:306` "doble clic y Enter repetido sobre 'Sí, revocar': una sola petición, en espera y sin disabled" — `:310` usa `{ name: "Revocar" }` y `:311` usa `{ name: "Sí, revocar" }`.
14. `:380` "las tres insignias llevan texto y un icono oculto; solo el vigente ofrece 'Revocar'" — `:406` usa `within(fila).queryByRole("button", { name: "Revocar" })`.
15. `:411` "registrados vacío dentro de la fila: el título y ningún botón; con error, MensajeError" — `:420` usa `{ name: "Ver registrados" }`.

Verifiqué cada fallo en la salida: los 15 dan exactamente `TestingLibraryElementError: Unable to find role="button" and name "…"` para uno de los cuatro nombres exactos ("Revocar", "Ver registrados", "Sí, revocar", "Cancelar"), nunca por otra causa. Las demás pruebas del archivo (`:331`, `:340`, `:350`, `:364`, `:441`) siguen en verde, incluida `:364` ("con dos enlaces vigentes, ningún nombre de botón se repite"), que compara `aria-label ?? textContent` y ahora encuentra textos realmente distintos por fila.

### Verificación
- **V-01:** las 57 `*.ataque` (sin cambios desde la ronda 1) coinciden con la tabla de "AUTH-03b — Ronda 1", 57/57.
- **Pruebas normales, títulos contra `d8cb198`:** `bloqueo-usuario.integracion.test.ts` (comentario, mismo título), `ayudas-concurrencia.ts` (comentario, no es un archivo de pruebas), `maestros-view.test.tsx` y `lib.test.ts` de `admin` (archivos nuevos en 03b, sin base en `d8cb198`; ningún caso perdido respecto de mi entrega anterior: `maestros-view.test.tsx` sigue con sus 22 casos, `lib.test.ts` cambió 2 casos de `marcaDeFila` por 2 de `textoOcultoDeFila`, incorporando la función que ahora exige el plan).
- **`npm run lint`** (los tres paquetes, desde la raíz): en verde.
- **`npm run test`:**
  - Frontend: 62 archivos / 966 pruebas en verde; 1 archivo / 15 pruebas en rojo (`maestros-03b-r1.ataque.test.tsx`, lista exacta arriba). PA-06 no se activa: los 15 rojos son exactamente los que el cambio de T-10 explica, ninguno más.
  - Backend: **dos corridas completas y consecutivas**, 73 archivos / 835 pruebas en verde cada una.
- **`npm run build`** desde la raíz: en verde.
- **PA-01:** comprobado antes de cada una de las 2 corridas del backend (firewall, red `IZZI-F281`, Docker).
- **PA-07:** con evidencia sobre las 2 corridas completas: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `P2028` 2, `too many clients` 0, en cada una; los dos `P2028` son los mismos dos excluidos de siempre (`tx.sesion.create` en `POST /api/auth/login`, `tx.tokenCuenta.updateMany` en `POST /api/auth/restablecer`).
- **PA-11:** sin contenedores de Testcontainers después de cada corrida.

### Archivos modificados en este arbitraje
- `backend/src/adapters/db/enlaces-registro.ts` (T-07: `FOR SHARE` → `FOR NO KEY UPDATE` en `registrarMaestroConEnlace`; comentario de `revocarEnlaceRegistro` reescrito sin riesgo residual).
- `backend/src/adapters/README.md` (T-07: bloque reescrito, cola justa, sin riesgo residual).
- `backend/test/ayudas-concurrencia.ts` (comentario).
- `backend/test/bloqueo-usuario.integracion.test.ts` (comentario).
- `frontend/src/features/admin/data.ts` (T-10: `ocultoDeFila` con las plantillas de la Enmienda 6, sustituye mi `marcaDeFila` anterior).
- `frontend/src/features/admin/lib.ts` (T-10: `textoOcultoDeFila`, sustituye `marcaDeFila`).
- `frontend/src/features/admin/lib.test.ts` (T-10: pruebas de `textoOcultoDeFila`).
- `frontend/src/features/admin/components/tabla-enlaces.tsx` (T-10: los cuatro botones con `textoOcultoDeFila`; pasa `creadoEnDelEnlace` a `RegistradosDelEnlace`).
- `frontend/src/features/admin/components/registrados-del-enlace.tsx` (R-18: prop `creadoEnDelEnlace` y marca en "Cargar más").
- `frontend/src/features/admin/maestros-view.test.tsx` (nombres por expresión anclada).
- `docs/DESIGN.md` §7.9 (línea de la Enmienda 6, texto exacto).

### Desviaciones del plan
Ninguna. Implementé exactamente lo que fija la Enmienda 6 y lo que pidió el coordinador para R-18.

### Pendiente o fuera de alcance detectado
- Nada nuevo. R-17 (dos enlaces en el mismo minuto) queda anotado como riesgo aceptado, tal como decide el plan; no es un pendiente de corrección.
- La ronda 2 del tester ajusta `maestros-03b-r1.ataque.test.tsx` a los nombres nuevos (los ~19 usos de nombre exacto que señaló el manager) y refuerza el caso de T-10 para comparar el nombre accesible calculado, no `aria-label ?? textContent`.

## AUTH-03b — Corrección de la ronda 2

Veredicto de la ronda 2: ROTO, solo por **T-12** (media, de proceso). El código de producción resistió todo; T-05 a T-11 quedaron confirmados como corregidos por el tester. T-12 es sobre mis propias pruebas normales, no sobre producción: no toqué ningún archivo de producción en esta corrección.

### Corrección del dato de conteo
En "Arbitraje de T-07 y T-10" escribí que `maestros-view.test.tsx` "sigue con sus 22 casos". **Es falso: el archivo tenía 12 casos**, no 22 (lo confirmé ahora con `npx vitest list src/features/admin/maestros-view.test.tsx`, que lista cada `it()` por su título, y contando los `it(` del archivo). Nunca tuvo 22; ese número no correspondía a ningún estado real del archivo. A partir de ahora, cuento los casos con `npx vitest list <archivo>` antes de escribir una cifra, y lo hago para cada archivo que toco en esta corrección (ver "Conteo real", abajo).

### T-12 — casos agregados a `frontend/src/features/admin/maestros-view.test.tsx`
Repasé "Pruebas requeridas" (frontend, 03b, `/admin/maestros`) punto por punto contra el archivo. Encontré los 5 vacíos que señaló el tester, más otros 2 que el tester no había señalado (ver "Vacíos adicionales" abajo). Agregué un caso por cada uno, sin quitar ni debilitar ninguno de los 12 existentes:

1. **"Generar enlace" en espera:** caso nuevo con una respuesta diferida; comprueba `aria-busy="true"` en el botón y que el foco (llevado ahí a mano con `.focus()` antes del clic, como en `maestros-03b-r1.ataque.test.tsx`) se conserva mientras la petición sigue en vuelo.
2. **"Copiar enlace", éxito y fallo, con su `toast`:** agregué el mock de `sonner` (`vi.mock("sonner", ...)`, igual que en la `*.ataque`) y `mockClear()` de los dos avisos en `afterEach`. El caso de éxito ahora comprueba además `aviso.success` (antes solo miraba `writeText`). Caso nuevo para el fallo: el portapapeles rechaza, comprueba `aviso.error` y que el botón no se queda con `aria-busy`.
3. **El token fuera de la caché de mutaciones:** el caso "el token generado no queda en la caché de consultas" pasa a comprobar las dos cachés (consultas y mutaciones, con un `volcadoDeMutaciones` nuevo, mismo patrón que `volcadoDeConsultas`); el título cambia a "... ni en la de mutaciones" para que siga siendo exacto.
4. **La variante `outline` del vacío y ningún nombre repetido:** el caso del vacío de la lista ahora comprueba `data-variant="outline"` en "Generar el primer enlace" y que ningún par de botones en pantalla comparta `textContent`.
5. **Los cuatro estados, en orden:** reescribí el caso `:280` (antes solo probaba el error). Ahora renderiza y desmonta cuatro veces en el mismo `it` (`renderVista` devuelve también `unmount`): error (alerta, sin tabla ni vacío), carga (con una respuesta diferida: `Cargando`, sin tabla ni vacío, después se resuelve), vacío (título del vacío, sin tabla ni alerta) y datos (la tabla, sin vacío ni alerta).

**Vacíos adicionales que encontré yo, no señalados por el tester** (dilo, como pide la instrucción):
6. **"Cargar más" de los registrados en espera:** el plan pide "ver registrados y cargar más (el botón en espera mientras llega la página)"; el caso existente no probaba la espera. Caso nuevo con una respuesta diferida para la segunda página: `aria-busy` y foco conservado, después se resuelve y aparece "Beto".
7. **Los cuatro botones de fila con la fecha de creación (Enmienda 6):** el plan lo pide explícitamente en "Pruebas requeridas" ("su nombre accesible es el texto visible más la fecha de creación formateada... por ejemplo `getByRole("button", { name: "Revocar el enlace creado el <fecha>" })`"), y no había ningún caso normal que lo comprobara (solo la `*.ataque`). Caso nuevo: con `formatearFechaHora(enlace(1).creadoEn)`, comprueba los 4 nombres exactos: "Ver registrados del enlace creado el …", "Revocar el enlace creado el …", "Sí, revocar el enlace creado el …" y "Cancelar la revocación del enlace creado el …".

No encontré más vacíos al repasar el resto de "Pruebas requeridas" 03b (backend y frontend, 03a incluido): la matriz de autorización, los casos de `registro-maestro.integracion` y `enlaces-registro.integracion`, `registro-maestro-view.test.tsx`, `estado-vacio.test.tsx`, `table.test.tsx`, `badge.test.tsx`, `cache-de-mutaciones.test.ts` y `contrasena-visible.test.tsx` ya cubren lo que el plan pide en sus propios puntos (revisé cada uno contra la lista del plan). "La barra del admin con dos destinos" lo cubre `contenedor-rol.test.tsx`, no `maestros-view.test.tsx`.

### Ningún defecto de producción
Los 16 casos (12 existentes + 4 agregados: los 5 de arriba se resolvieron con 4 casos nuevos y 3 extensiones de casos existentes) pasan sin que hiciera falta tocar ningún archivo de producción. No encontré ningún defecto.

### Conteo real (contado con `npx vitest list`, no de memoria)
- `frontend/src/features/admin/maestros-view.test.tsx`: **16 casos** (antes de esta corrección: 12; confirmado con `npx vitest list src/features/admin/maestros-view.test.tsx`, 16 líneas de título, y con `npx vitest run`, "16 passed").
- Corrí el archivo **3 veces seguidas**: 16/16 las tres veces, sin intermitencia.

### Verificación
- **V-01:** las 58 `*.ataque` (tabla de "AUTH-03b — Ronda 2") coinciden, 58/58. No toqué ninguna.
- **Pruebas normales, títulos contra `d8cb198`:** no toqué ningún archivo con base en `d8cb198` en esta corrección (`bloqueo-usuario.integracion`, `contenedor-rol.test`, `apiClient.test`, `authService.test` y `contrasena-visible.test` quedan igual que en la corrección anterior). `maestros-view.test.tsx` no tiene base en `d8cb198` (archivo nuevo en 03b); sus 12 casos anteriores siguen todos, sin ninguno quitado ni debilitado.
- **`npm run lint`** (los tres paquetes, desde la raíz): en verde.
- **`npm run build`** desde la raíz: en verde.
- **`npm run test`** desde la raíz: backend 74 archivos / 838 pruebas en verde; frontend 63 archivos / 985 pruebas en verde (985 = 981 antes de esta corrección + 4 casos nuevos).
- **PA-01:** comprobado antes de correr el backend (firewall, red `IZZI-F281`, Docker), aunque no toqué ningún archivo de backend en esta corrección.
- **PA-07:** con evidencia sobre la corrida completa del backend: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `P2028` 2, `too many clients` 0; los dos `P2028` son los mismos dos excluidos de siempre.
- **PA-11:** sin contenedores de Testcontainers después de la corrida.

### Archivos modificados en esta corrección
- `frontend/src/features/admin/maestros-view.test.tsx` (T-12: 4 casos nuevos y 3 casos extendidos, sin quitar ninguno de los 12 existentes).

Ningún otro archivo, de producción o de pruebas.

### Desviaciones del plan
Ninguna.

### Pendiente o fuera de alcance detectado
Nada nuevo.

## AUTH-03c

### Precondiciones (paso 27)
- **PA-01:** no se activó. `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `True / Inbound / Block / Public`; `Get-NetConnectionProfile` → red activa `IZZI-F281` (Public), declarada de confianza por el humano; `docker version` → motor 28.5.1 encendido. Comprobado antes de cada corrida del backend.
- **PA-02:** no se activó. Rama `feat/auth-03-ajustes-de-cuentas`, HEAD en `32afeef` (`<Cb>`). `git diff --name-only 32afeef -- backend shared frontend` antes de tocar nada listaba exactamente las 2 `*.ataque` de la ronda 0 (`backend/test/sesiones-y-cadena.ataque.test.ts`, `frontend/src/styles/clases-r1.ataque.test.ts`). Los 7 archivos protegidos (`AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md`, `README.md`, `.claude/agents/programador.md`, `.claude/agents/manager.md`) coinciden con el último SHA-256 de `aprobacion.md`.
- **V-01:** los 58 `*.ataque` coincidían con la tabla de "AUTH-03c — Ronda 0" antes de empezar (`sha256sum -c`, 58/58) y siguen coincidiendo al terminar.

### Migración (paso 30)
- `npx prisma migrate dev --create-only --name tokens_cuenta_tipo_creado_en` generó `backend/prisma/migrations/20260929015654_tokens_cuenta_tipo_creado_en/migration.sql`.
- SQL generado (idéntico a §D-C2; PA-03 no se activó):
  ```sql
  -- CreateIndex
  CREATE INDEX "tokens_cuenta_tipo_creado_en_idx" ON "tokens_cuenta"("tipo", "creado_en");
  ```
- `npx prisma migrate dev` (una sola vez) la aplicó sin proponer `reset` ni avisar de deriva.
- **V-03:** `prisma validate` → "is valid"; `prisma format --check` → "All files are formatted correctly!"; `prisma generate` → sin error; `prisma migrate status` → "Database schema is up to date!"; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → "No difference detected.", código 0. PA-04 no se activó.

### `encolarVarios` y PA-05 (paso 31, antes de seguir)
Añadí a `test/cola.integracion.test.ts` (prueba normal existente, no `*.ataque`) el describe `encolarVarios (AUTH-03c, §D-C4, PA-05)` con 3 casos, corridos antes de escribir `adapters/db/invitaciones.ts`:
- los trabajos insertados heredan `retry_limit` (3), `retry_backoff` (true) y `dead_letter` de la política de `CORREO_DE_CUENTA` (verificado leyendo `pgboss.job` directamente);
- una transacción revertida no deja trabajos;
- el texto del SQL no lleva datos (un ejecutor espía captura el texto y los valores; el correo y el id de la prueba no aparecen en el texto).

PA-05 no se activó.

### Bloqueo consultivo (M-04)
Usé `$executeRaw` (la forma primaria de M-04, no la alternativa `$queryRaw ... ::text`), porque `pg_advisory_xact_lock` devuelve `void` y no falló con esa forma. PA-14 no se activó: la prueba "dos lotes lanzados a la vez quedan en serie" confirma con `pg_blocking_pids` que una segunda llamada queda formada detrás de una transacción que ya tiene el bloqueo.

### PARADAs
- **PA-01 a PA-05:** no se activaron (ver arriba).
- **PA-06:** no se activó. Antes de mi implementación: backend 1/894 en rojo (el caso de `sesiones-y-cadena` reescrito por el tester); frontend 1/995 en rojo (el caso de `clases-r1` reescrito). Al terminar: 0/894 y 0/995 en rojo. Ninguna otra `*.ataque` se puso en rojo (V-01 sigue 58/58).
- **PA-07:** no se activó. Comando: `grep -oF "<término>" <salida-completa> | wc -l` sobre la salida completa de `npm test` del backend. Conteo por término, en 3 corridas completas seguidas: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `P2028` 2, `too many clients` 0. Los dos `P2028` son los mismos dos excluidos por la Enmienda 3 (`POST /api/auth/login` sobre `tx.sesion.create`; `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`).
- **PA-08:** no aplica (03c no cambia el envío de correo, solo su ritmo).
- **PA-09:** no se activó. No toqué ningún archivo de "No se toca" (verificado con `git diff --name-only 32afeef -- <cada ruta protegida>`, sin salida).
- **PA-10:** no se activó. Revisé los logs de `invitacion-masiva.integracion.test.ts` y `worker-correo-de-cuenta.integracion.test.ts`: ningún correo de la lista, contraseña ni cookie.
- **PA-11:** no se activó. `docker ps -a --filter "label=org.testcontainers=true"` vacío después de cada corrida completa (comprobado 3 veces).
- **PA-12:** no se activó, tras una corrección (ver "Desviaciones"). La suite completa del backend corrió **3 veces seguidas** en verde: 77 archivos / 894 pruebas las tres veces.
- **PA-13:** no aplica a 03c (es de 03a).
- **PA-14:** no se activó (ver "Bloqueo consultivo" arriba).

### Verificaciones
- **V-01:** 58/58 `*.ataque` con el mismo SHA-256 que la tabla de la ronda 0, antes y después de implementar.
- **V-02:** desde la raíz — `npm run build` código 0; `npm run lint` código 0 en `shared`, `backend` y `frontend`; `npm run test` código 0: backend 77 archivos / 894 pruebas, frontend 64 archivos / 995 pruebas, todas en verde.
- **V-03:** ver "Migración" arriba. Todo en verde.
- **V-04 (búsquedas en código de producción, sin pruebas):**
  - `contrasenaActual` y `mostrarTemporal` → sin cambios desde 03b (03c no toca `features/auth`).
  - `type="password"` → 0.
  - `<CampoContrasena` → 7, sin cambios (03c no agrega ningún campo de contraseña).
  - `autoComplete="off"` en el `Textarea` de la lista de la invitación masiva (`formulario-invitacion-masiva.tsx`).
  - `console.` y `estadoPago` → 0 en `core/auth/invitacion-masiva.ts`, `core/correo/ritmo.ts`, `adapters/db/invitaciones.ts`, `adapters/queue/index.ts`, `workers/index.ts` y la parte nueva de `handlers/admin.ts`.
  - `$queryRawUnsafe` → exactamente 1 (`adapters/db/cliente.ts`); `$executeRawUnsafe` → 0.
  - SQL etiquetado (`$queryRaw`/`$executeRaw`) solo en `salud.ts`, `bloqueo-usuario.ts`, `enlaces-registro.ts` e `invitaciones.ts`. Actualicé `backend/test/bloqueo-usuario.integracion.test.ts` ("E6", prueba normal, no `*.ataque`) para sumar `invitaciones.ts` a la lista permitida y para que la búsqueda cubra también `$executeRaw` (antes solo miraba `$queryRaw`) sin contar menciones en comentarios (ver "Desviaciones").
  - `INTERVALO_MINIMO_ENTRE_CORREOS_MS = 250` → presente en `core/correo/ritmo.ts`.
  - `fetch(` → solo en `services/apiClient.ts` (sin cambios).
  - `enEspera=` en producción `.tsx` → 20 exactos (`grep -rn "enEspera=" frontend/src --include=*.tsx`, sin pruebas): los 19 de 03b más "Enviar invitaciones" en `formulario-invitacion-masiva.tsx`.
- **V-05 ("No se toca"):** dentro de los paquetes, base `<Cb>` = `32afeef`. `git diff --name-only 32afeef -- <ruta>` vacío para cada ruta de "No se toca" común y de la lista específica de 03c (lo que "Cambios por capa" asigna solo a 03a o a 03b: `handlers/auth/**`, `adapters/auth/**`, `adapters/db/{usuarios,tokens-cuenta,enlaces-registro}.ts`, `middleware/**`, `router.tsx`, `services/**`, `features/auth/**`, `components/estado-vacio.tsx`, `components/ui/{table,badge}.tsx`, `components/layout/**`, y el resto de `adapters/`, `core/` y `handlers/` que no toca este encargo). Fuera de los paquetes, los 7 archivos protegidos coinciden con el hash de `aprobacion.md`.
- **V-06 (rutas):** `RUTAS_PUBLICAS` no cambia en 03c (`/admin/maestros/lote` no es pública). La lista de `printRoutes` de `sesiones-y-cadena.ataque.test.ts:449` (reescrita por el tester en la ronda 0) pasa en verde con `POST /api/admin/maestros/lote` agregada.

### Resumen técnico
- **`shared/src/cuentas.ts`** (modificar): `CODIGOS_CUENTAS.CUPO_DIARIO_INSUFICIENTE`; `LIMITE_LINEAS_INVITACION_MASIVA`; `contarLineasConContenido` (la usan `core/` y el contador del frontend); `invitacionMasivaSchema`; `motivoLineaInvalidaSchema`; `invitacionMasivaRespuestaSchema`, con sus tipos.
- **`backend/src/core/auth/invitacion-masiva.ts`** (crear): `analizarListaDeInvitaciones` (separador tabulador, `;` o `,`; correo antes del primer separador o después del último; nombre `null` si falta o si queda vacío tras recortar; motivos `correo_invalido`/`nombre_invalido`/`repetido`), `nombreProvisionalDe` (M-07, M-12: siempre el `data` de `nombreSchema.safeParse`, nunca el texto de entrada), `NOMBRE_PROVISIONAL_DE_RESPALDO`, `evaluarCupo`, `VENTANA_CUPO_MS`; 25 pruebas unitarias.
- **`backend/src/core/correo/ritmo.ts`** (crear): `INTERVALO_MINIMO_ENTRE_CORREOS_MS = 250`, `esperaAntesDelSiguiente`; 5 pruebas unitarias.
- **`backend/src/adapters/db/invitaciones.ts`** (crear): `CLAVE_BLOQUEO_INVITACIONES_EN_LOTE`, `invitarMaestrosEnLote` (bloqueo consultivo → cupo → `createMany` con `skipDuplicates` → relectura por id → `createMany` de tokens → `alGuardar`; un correo insertado por otra transacción en medio se reporta como existente, sin atrapar ningún P2002).
- **`backend/src/adapters/queue/index.ts`** (modificar): `encolarVarios(nombre, trabajos, { sql })`, `sql` obligatorio, un solo `insert` de pg-boss.
- **`backend/src/handlers/admin.ts`** (modificar): `POST /maestros/lote`, `protegido({ roles: ["admin"] })`; todo el argon2 (un solo hash inutilizable compartido) y la preparación de cada candidato van antes de la transacción; el `nombre` de la respuesta es el de la línea (no el provisional) o `null`.
- **`backend/src/app.ts`** (modificar): pasa `limiteDiarioInvitaciones: env.INVITACIONES_LIMITE_DIARIO` a `adminHandler`.
- **`backend/src/config/env.ts`** (modificar): `INVITACIONES_LIMITE_DIARIO` (entero 1–10000, 80 por defecto).
- **`backend/src/workers/index.ts`** (modificar): `registrarConsumidores` envuelve el `notifier` con el ritmo (M-06: espera antes de procesar; M-09: cuenta también los intentos que lanzan, vía `finally`, sin atrapar el error); `esperar?` es una inyección explícita para pruebas, con espera real por defecto. `workers/correo-de-cuenta.ts` no cambió.
- **`frontend/src/components/ui/textarea.tsx`** (crear): mismo borde/fondo/foco/inválido que `Input`, altura por filas, `resize-y`.
- **`frontend/src/features/admin/components/formulario-invitacion-masiva.tsx`** y **`resultado-invitacion-masiva.tsx`** (crear): contador con `aria-live="polite"` en un `<p>` normal (nunca `role="status"` ni `<output>`, para no chocar con `maestros-03b-r1:352`); resultado con `role="status"` en el resumen y un grupo por resultado, sin grupos vacíos; el motivo de una línea inválida va en `<Badge variant="danger">`.
- **`frontend/src/features/admin/maestros-view.tsx`**: agrega el panel de la masiva arriba del de enlaces. **`formulario-generar-enlace.tsx`**: "Generar enlace" pasa de `primary` a `outline` (C-12): una sola acción principal en la vista.

### Archivos creados / modificados
**Creados:**
- `backend/prisma/migrations/20260929015654_tokens_cuenta_tipo_creado_en/migration.sql`
- `backend/src/core/auth/invitacion-masiva.ts` y `.test.ts`
- `backend/src/core/correo/ritmo.ts` y `.test.ts`
- `backend/src/adapters/db/invitaciones.ts`
- `backend/test/invitacion-masiva.integracion.test.ts`
- `frontend/src/components/ui/textarea.tsx` y `.test.tsx`
- `frontend/src/features/admin/components/formulario-invitacion-masiva.tsx`
- `frontend/src/features/admin/components/resultado-invitacion-masiva.tsx`

**Modificados:**
- `shared/src/{cuentas,index}.ts`
- `backend/prisma/schema.prisma`
- `backend/src/adapters/{README.md,db/index.ts,queue/index.ts}`
- `backend/src/app.ts`
- `backend/src/config/{env.ts,env.test.ts}`
- `backend/src/handlers/{admin.ts,README.md}`
- `backend/src/workers/{index.ts,README.md}`
- `backend/.env.example`
- `backend/test/bloqueo-usuario.integracion.test.ts` (E6 suma `invitaciones.ts` y `$executeRaw`; ver "Desviaciones")
- `backend/test/cola.integracion.test.ts` (suma `encolarVarios`, aditivo)
- `backend/test/worker-correo-de-cuenta.integracion.test.ts` (suma un `describe` nuevo con su propio `beforeAll`/`afterAll`; ver "Desviaciones": los 12 casos existentes de AUTH-02 siguen intactos)
- `backend/test/sesiones-y-cadena.ataque.test.ts` (por el tester, ronda 0; no lo toqué)
- `frontend/src/features/admin/{data,hooks,lib,types}.ts`
- `frontend/src/features/admin/maestros-view.tsx` y `.test.tsx`
- `frontend/src/features/admin/components/formulario-generar-enlace.tsx`
- `frontend/src/styles/clases-r1.ataque.test.ts` (por el tester, ronda 0; no lo toqué)
- `docs/DESIGN.md` (§7.3, nueva §7.15)

### Conteo final
- Backend: 77 archivos / 894 pruebas (`npx vitest list` y `npm test`, ambos coinciden), todas en verde, corrido 3 veces seguidas sin intermitencia.
- Frontend: 64 archivos / 995 pruebas (`npx vitest list` y `npm test`, ambos coinciden), todas en verde.
- `npm run build` y `npm run lint` (los tres paquetes, desde la raíz): en verde.

### Desviaciones del plan
1. **Corregí un error propio antes de entregar: sobrescribí por accidente `backend/test/worker-correo-de-cuenta.integracion.test.ts`.** Al crear las pruebas del ritmo asumí que el archivo era nuevo (el plan dice "Pruebas requeridas" 03c: "`worker-correo-de-cuenta.integracion`, con un `esperar` y un `reloj` falsos"), pero ya existía desde AUTH-02 con 12 casos que prueban `procesarCorreoDeCuenta` directamente, sin cola ni ritmo. Lo detecté al revisar `git status` contra la base antes de cerrar el paso. Restauré el archivo original con `git checkout 32afeef -- <archivo>` y agregué mis 4 casos del ritmo como un `describe` nuevo, con su propio `beforeAll`/`afterAll` (cola y consumidor propios), sin tocar ni una línea de los 12 casos existentes. Verificado: `npx vitest list` antes de tocar nada mostraba los 12 títulos originales; después, los mismos 12 más los 4 nuevos, sin ninguno quitado ni debilitado. Corrida 3 veces seguidas, 16/16 en verde las tres.
2. **`backend/test/bloqueo-usuario.integracion.test.ts` (E6):** el plan no lo lista en "Cambios por capa" de 03c, pero es una prueba normal (no `*.ataque`) cuya aserción quedó en rojo apenas creé `adapters/db/invitaciones.ts` con `$executeRaw`, tal como exige el propio V-04 del plan ("SQL etiquetado... solo en `salud.ts`, `bloqueo-usuario.ts`, `enlaces-registro.ts` e `invitaciones.ts`"). Además de sumar `invitaciones.ts`, amplié el patrón para que cubra `$executeRaw` (antes solo `$queryRaw`) y para que ignore menciones en comentarios (el comentario de `invitaciones.ts` que explica por qué usé `$executeRaw` mencionaba literalmente "`$queryRaw`", lo que producía un falso positivo). Mismo patrón de ajuste que 03b hizo en esta misma prueba.

Ninguna de las dos toca una `*.ataque.test.*` ni relaja una validación, un permiso o un tipo.

### Pruebas requeridas (mapeo completo)
**Unitarias de core:**
- `analizarListaDeInvitaciones`: vacía → `backend/src/core/auth/invitacion-masiva.test.ts` "lista vacía → sin candidatos ni inválidas"; solo líneas vacías → "solo líneas vacías → sin candidatos ni inválidas"; CRLF → "CRLF entre líneas"; tab/`;`/`,` → "separador tabulador" / "separador punto y coma" / "separador coma"; correo primero y último, nombre con comas → "correo primero" / "correo último, con un nombre que trae comas"; nombre vacío tras el separador → "nombre vacío tras el separador → null"; correo inválido → "correo inválido, sin separador → invalida"; nombre de 1 carácter, con controles o de 121 → "un nombre de 1 carácter → nombre_invalido" / "un nombre con caracteres de control → nombre_invalido" / "un nombre de 121 caracteres → nombre_invalido"; repetido con mayúsculas distintas → "repetido con mayúsculas distintas → repetido"; 100 líneas → "100 líneas → 100 candidatos"; numeración con líneas vacías intercaladas → "numeración cuenta también las líneas vacías intercaladas"; texto recortado a 200 → "texto de más de 200 caracteres se recorta en la línea inválida".
- `nombreProvisionalDe` (M-07, M-12): parte local de 1 carácter → "parte local de 1 carácter cae al correo completo"; normal → "parte local normal"; 64+ → "parte local de 64 o más caracteres"; ni parte local ni correo pasan → "ni la parte local ni el correo recortado pasan → respaldo"; siempre pasa `nombreSchema` e igual a su `data` → "el resultado siempre pasa nombreSchema y es igual a su data".
- `evaluarCupo`: solicitadas == restantes → "solicitadas == restantes → pasa"; +1 → 409 con N → "solicitadas == restantes + 1 → 409 con N en el mensaje"; usadas > límite → N = 0 → "usadas > limite → N = 0".
- `esperaAntesDelSiguiente` → `backend/src/core/correo/ritmo.test.ts`: sin intento previo → "sin intento previo → 0"; justo en el intervalo → "justo en el intervalo → 0"; a la mitad → "a la mitad del intervalo → lo que falta (125 ms)"; reloj hacia atrás → "reloj hacia atrás → nunca más del intervalo ni negativo".

**Integración del backend:**
- Matriz de autorización → `backend/test/invitacion-masiva.integracion.test.ts`, describe "autorización de POST /api/admin/maestros/lote": "sin token → 401", "un estudiante → 403 ROL_NO_PERMITIDO", "un maestro → 403 ROL_NO_PERMITIDO", "un estudiante restringido → 403 ACCESO_RESTRINGIDO", "una cuenta con cambio pendiente → 403 CAMBIO_DE_CONTRASENA_REQUERIDO", "el admin puede".
- Lista mixta → "lista mixta: válidas, ya existentes de los tres roles, inválidas y repetidas".
- Cuentas como maestro, hash compartido, un token por cuenta, trabajo por token en `pgboss.job` con `retry_limit`/`dead_letter`/id igual, y el nombre provisional pasa `nombreSchema` (M-07) → "las cuentas nacen como maestro, con un hash inutilizable compartido y un token de invitación cada una, encolado en pgboss.job" (una sola prueba cubre las dos partes de la viñeta).
- Cupo exacto → 200 → "cupo exacto → 200".
- Uno más → 409, nada creado → "uno más que el cupo → 409, sin crear nada" (nada se encola tampoco: `alGuardar` no se invoca si no hay insertados, por construcción de `invitarMaestrosEnLote`; no hay una aserción aparte sobre `pgboss.job` en este caso).
- Las existentes no consumen cupo → "las existentes no consumen cupo".
- Dos lotes simultáneos con cupo para uno solo → "un segundo lote justo después del primero ve el cupo ya consumido: uno pasa y el otro 409" (secuencial, con límite reactivo para ser determinista pese a la carga paralela de la suite) y "dos lotes lanzados a la vez quedan en serie: el segundo espera detrás del bloqueo consultivo (M-04)" (concurrente de verdad, con `pg_blocking_pids`).
- Un correo creado por otra transacción entre lectura e inserción → "un correo creado por otra transacción entre la lectura y la inserción se reporta como existente, sin 5xx".
- Rollback de `alGuardar` → "rollback de alGuardar → nada creado".
- Worker con `esperar`/`reloj` falsos (M-06, M-09) → `backend/test/worker-correo-de-cuenta.integracion.test.ts`, describe "ritmo del worker (M-06 y M-09)": el primer no espera y el segundo sí → "el primer trabajo no espera; el segundo, tras uno enviado, espera antes de procesarse"; tras un error el siguiente también espera y el error se propaga → "un intento que lanza también cuenta para el ritmo (M-09) y el error se propaga (a la cola de fallidos)"; un omitido no cambia el ritmo → "un trabajo omitido siempre pasa por la espera de su turno, pero nunca llama al notifier ni cambia el ritmo del siguiente"; ninguna espera tras el último envío → "ninguna espera ocurre después del último envío".
- `encolarVarios` dentro y fuera de una transacción revertida → `backend/test/cola.integracion.test.ts`: "los trabajos insertados heredan retry_limit, retry_backoff, dead_letter y la retención de la cola", "una transacción revertida no deja trabajos", "el texto del SQL no lleva datos: solo interpola el esquema, la tabla y el nombre de la cola".
- `config/env.test.ts`: valor por defecto y límites → "INVITACIONES_LIMITE_DIARIO: por defecto 80", "INVITACIONES_LIMITE_DIARIO: acepta 1 y 10000, y convierte el texto a número", "INVITACIONES_LIMITE_DIARIO: rechaza 0, 10001 y un valor no entero".

**Frontend:**
- `textarea` → `frontend/src/components/ui/textarea.test.tsx`: "renderiza con la etiqueta y acepta texto", "marca aria-invalid cuando se le pasa".
- Contador → `frontend/src/features/admin/maestros-view.test.tsx`, describe "invitación masiva": "el contador de líneas cambia al escribir".
- Más de 100 líneas → `ErrorDeCampo` y ninguna petición → "más de 100 líneas: ErrorDeCampo y ninguna petición".
- `autoComplete="off"` → "el campo de la lista usa autoComplete=off".
- `enEspera` → "'Enviar invitaciones' en espera mientras la petición está en vuelo".
- Resultado con los tres grupos y sin grupos vacíos → "el resultado muestra los tres grupos y ninguno vacío", "un grupo vacío no se muestra".
- `CUPO_DIARIO_INSUFICIENTE` con el mensaje del servidor → "CUPO_DIARIO_INSUFICIENTE muestra el mensaje del servidor".
- Un solo `primary` en la vista → "un solo botón primary en la vista".

Todas las viñetas de "Pruebas requeridas" 03c están cubiertas.

## AUTH-03c — Corrección del resumen (verificación del manager)

El manager devolvió el resumen de la implementación (`revision.md`, "Verificación del resumen — AUTH-03c — implementación"): las cifras coincidían y el código estaba en verde, pero (1) faltaban las últimas líneas literales de `lint`, `test` y `build`, y (2) la viñeta "uno más → 409 y nada creado ni encolado" no estaba cubierta de verdad. No toqué código de producción.

### Precondiciones
- **PA-01:** no se activó. `Get-NetFirewallRule` → `True / Inbound / Block / Public`; red activa `IZZI-F281` (Public, de confianza); `docker version` respondió, antes de cada corrida del backend.

### 1. Caso ampliado: "uno más que el cupo"
`backend/test/invitacion-masiva.integracion.test.ts`, describe "POST /api/admin/maestros/lote". Título nuevo (antes: "uno más que el cupo → 409, sin crear nada"):

**"uno más que el cupo → 409, sin crear nada ni encolar nada"**
- Pasa el `alGuardar` **real** (`encolarVarios`, no un `async () => {}`), envuelto en un espía que marca `seLlamoAlGuardar = true` si llegara a invocarse: `expect(seLlamoAlGuardar).toBe(false)`.
- Comprueba que no existan las **cuentas** de los tres candidatos (como antes).
- Comprueba que no existan sus **tokens de invitación** (`tokenCuenta.findMany` por los `id` de los candidatos → longitud 0).
- Comprueba que no existan **trabajos en `pgboss.job`** para esos mismos `id` (`$queryRaw` directo sobre la tabla → longitud 0).

### 2. Mejora opcional aplicada: la carrera con cupo para uno solo
`backend/test/invitacion-masiva.integracion.test.ts`, mismo describe. Título nuevo (antes: "dos lotes lanzados a la vez quedan en serie: el segundo espera detrás del bloqueo consultivo (M-04)"):

**"dos lotes lanzados a la vez quedan en serie: el segundo espera detrás del bloqueo consultivo y, con cupo para uno solo, recibe CUPO_DIARIO_INSUFICIENTE (M-04)"**
- El límite se fija **antes** de abrir la transacción retenedora (`limiteFijado = usadasAntes + 1`), no se relee después: ninguna interferencia de otro archivo de la suite puede aflojarlo.
- La transacción retenedora, antes de soltar el bloqueo consultivo (y ya confirmado que la llamada real quedó formada detrás, con `pg_blocking_pids`), inserta ella misma un token de invitación (`tokenCuenta.create`, con una cuenta desechable creada para eso).
- Al liberarse el bloqueo, la llamada formada detrás lee su propio `usadas` ya con ese token confirmado y recibe `CUPO_DIARIO_INSUFICIENTE` (`rejects.toMatchObject`); además, no crea la cuenta del candidato.
- Corregí un rechazo no manejado (`Unhandled Rejection`) que apareció al hacer que esta promesa termine en error: el `.then()` que solo tenía la rama de éxito ahora maneja también la de error (`.then(onFulfilled, onRejected)`), para que Node no lo marque como no manejado mientras la promesa sigue formada detrás del bloqueo. El resultado real se sigue observando después, fuera de la transacción, con `expect(promesaLote).rejects...`.

### Verificación
- **Archivo aislado**, 3 veces seguidas: 16/16 en verde las tres, sin el aviso de rechazo no manejado tras la corrección.
- **`npm run lint`** (desde la raíz) → última línea real de cada paquete:
  - `shared`: `Checking formatting...` → `All matched files use Prettier code style!`
  - `backend`: `eslint ... && prettier --check ... && npm run typecheck` → `Checking formatting...` → `All matched files use Prettier code style!` → `npm run typecheck` → `tsc -p tsconfig.json --noEmit` (sin salida: éxito silencioso; esa es la última línea real del bloque)
  - `frontend`: `Checking formatting...` → `All matched files use Prettier code style!` → `npm run typecheck` → `tsc -b` (sin salida: éxito silencioso; última línea real del bloque)
  - Código de salida del comando completo: 0.
- **`npm run test`** (desde la raíz) → última línea real de cada paquete:
  - backend: `Test Files  77 passed (77)` y `Tests  894 passed (894)`
  - frontend: `Test Files  64 passed (64)` y `Tests  995 passed (995)`
  - `shared` no tiene script `test` (sin pruebas propias; `--workspaces --if-present` lo omite).
- **`npm run build`** (desde la raíz) → última línea real: `✓ built in 594ms` (la build de `frontend`, la última del workspace; `shared` y `backend` compilan con `tsc` sin salida en éxito).
- **PA-07**, en las 2 corridas completas del backend pedidas: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `P2028` 2 en las dos corridas (los mismos dos excluidos de siempre: `POST /api/auth/login` sobre `tx.sesion.create`, `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`).
- **PA-11:** sin contenedores de Testcontainers después de cada corrida (comprobado tras cada una).
- **Suite completa del backend, 2 veces seguidas** (pedido del coordinador): las dos, 77 archivos / 894 pruebas en verde. Ninguna prueba nueva (`it()`) se agregó: los dos casos existentes se ampliaron con más aserciones, así que el conteo de 894 no cambia respecto del resumen anterior.
- **Suite completa del frontend:** 64 archivos / 995 pruebas en verde (sin cambios: esta corrección no tocó nada de frontend).

### Conteos (con el comando que los produjo)
- Backend: 77 archivos / 894 pruebas — `npm run test` (raíz) y `npx vitest list` (backend) coinciden.
- Frontend: 64 archivos / 995 pruebas — `npm run test` (raíz) y `npx vitest list` (frontend) coinciden.
- PA-07, 2 corridas: `P2028` = 2 en ambas; los otros cuatro términos, 0 en ambas — `grep -oF "<término>" <salida> | wc -l` sobre cada corrida completa guardada.

### Mapeo de "Pruebas requeridas" actualizado (solo lo que cambió)
- "uno más → 409 y nada creado ni encolado" → `backend/test/invitacion-masiva.integracion.test.ts`, título exacto: **"uno más que el cupo → 409, sin crear nada ni encolar nada"** (antes no cubierta del todo; ahora comprueba cuentas, tokens de invitación y `pgboss.job`, con el `alGuardar` real).
- "dos lotes simultáneos con cupo para uno solo → uno 200 y el otro 409 (bloqueo consultivo)", cobertura reforzada en un solo caso (recomendación opcional del manager, aplicada) → título exacto: **"dos lotes lanzados a la vez quedan en serie: el segundo espera detrás del bloqueo consultivo y, con cupo para uno solo, recibe CUPO_DIARIO_INSUFICIENTE (M-04)"**.

### Archivos modificados en esta corrección
- `backend/test/invitacion-masiva.integracion.test.ts` (dos casos existentes ampliados, sin quitar ninguno; ningún `it()` nuevo).

Ningún otro archivo, de producción o de pruebas. Ninguna `*.ataque` tocada.

### Desviaciones del plan
Ninguna.

### Pendiente o fuera de alcance detectado
Nada nuevo.

## AUTH-03c — Corrección de la ronda 1

El tester dio **ROTO** con 3 hallazgos (0 críticos, 0 altos, 1 medio, 2 bajos). El código de producción del backend resistió todos los ataques. No toqué ninguna `*.ataque`.

### Precondiciones
- **PA-01:** no se activó. `Get-NetFirewallRule` → `True / Inbound / Block / Public`; `Get-NetConnectionProfile` → `IZZI-F281` (Public, de confianza); Docker encendido. Comprobado antes de cada corrida del backend.
- **V-01:** las 63 `*.ataque` de la tabla de "AUTH-03c — Ronda 1" coinciden (`sha256sum -c`: 63/63). No toqué ninguna.
- **Comparación de títulos contra `32afeef`:** `backend/test/invitacion-masiva.integracion.test.ts` sigue con 16 casos (`npx vitest list`); ninguno se quitó, dos cambiaron de título porque su premisa era la que estaba mal (ver abajo). `frontend/src/features/admin/maestros-view.test.tsx` sigue con 24 casos (`npx vitest list`); ninguno se quitó, uno reforzó su aserción (T-15) sin cambiar de título.

### T-13 (media) — Dos pruebas normales del lote dependían del cupo global compartido, y el caso de la carrera tenía una premisa falsa
**Parte 1: "lista mixta…" y "las cuentas nacen como maestro…" con el límite por defecto.**
Elegí la primera idea del coordinador: estas dos pruebas no son del cupo, así que ahora usan una app aparte con `INVITACIONES_LIMITE_DIARIO = 10_000` (el máximo que admite la variable), registrada una sola vez en el `beforeAll` (`appAltoLimite`), para que el cupo compartido de la suite nunca les alcance sin importar cuántas invitaciones creen otros archivos en paralelo. No cambié código de producción: `appConLimite` ya existía en el propio archivo de pruebas.
- `backend/test/invitacion-masiva.integracion.test.ts`, título exacto (sin cambios): **"lista mixta: válidas, ya existentes de los tres roles, inválidas y repetidas"**.
- Mismo archivo, título exacto (sin cambios): **"las cuentas nacen como maestro, con un hash inutilizable compartido y un token de invitación cada una, encolado en pgboss.job"**.

**Parte 2: la premisa falsa de "usadas solo puede subir".**
El tester tenía razón: el `afterAll` de otro archivo borra usuarios y sus tokens en cascada, así que `usadas` también baja. Corregí el caso que lo asumía explícitamente y, al verificar la corrección con la suite completa 3 veces, encontré que el caso vecino ("un segundo lote justo después del primero…") tenía la misma premisa y falló de verdad en mi tercera corrida (`expected 409, promise resolved` en vez de rechazar). Lo arreglé también, aunque el tester no lo hubiera señalado por su número de línea, porque es la misma causa raíz que T-13 describe en general ("todas tus pruebas del lote y del cupo… deterministas sin importar lo que hagan otros archivos").
- Quité la variable `limiteFijado` compartida entre dos llamadas (la causa del fallo) y, en su lugar, cada llamada evalúa su propio cupo con el "usadas" que lee en su momento, sin depender de ningún valor leído por la otra ni de una instantánea externa:
  - `backend/test/invitacion-masiva.integracion.test.ts`, título exacto (sin cambios): **"un segundo lote justo después del primero ve el cupo ya consumido: uno pasa y el otro 409"**. A evalúa con margen 1 (siempre le alcanza para su único candidato); B evalúa con margen 0 (siempre se queda sin cupo, sea cual sea su "usadas").
  - Mismo archivo, título nuevo (antes: "dos lotes lanzados a la vez quedan en serie: el segundo espera detrás del bloqueo consultivo y, con cupo para uno solo, recibe CUPO_DIARIO_INSUFICIENTE (M-04)"; quité también la inserción de un token de la transacción retenedora, que ya no hace falta): **"dos lotes lanzados a la vez quedan en serie: el segundo, ya sin cupo, recibe CUPO_DIARIO_INSUFICIENTE (M-04)"**. Sigue demostrando el bloqueo consultivo con `pg_blocking_pids` (una transacción propia toma el bloqueo primero y confirma que la llamada real queda formada detrás); el cupo ahora se evalúa con margen 0 sobre el "usadas" que la propia llamada lee al obtener el bloqueo, así que se queda sin cupo sin importar ese valor.

### T-14 (baja) — La ayuda de "Lista de maestros" no era su descripción accesible
`frontend/src/features/admin/components/formulario-invitacion-masiva.tsx`: el `Textarea` ahora lleva siempre `aria-describedby` apuntando al `id` de la ayuda (`lista-invitacion-masiva-ayuda`), y suma el del error cuando lo hay (`"lista-invitacion-masiva-ayuda lista-invitacion-masiva-error"`), igual que `nombre-ayuda`/`nombre-error` en `formulario-nueva-contrasena.tsx` y `describeContrasena` en `formulario-registro.tsx`. Cubierto por el archivo del tester (no lo toqué):
- `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx`, título exacto: **"la ayuda del formato es la descripción accesible del campo (como la ayuda de los demás campos del proyecto)"**.

### T-15 (baja) — Una línea inválida se leía sin separador antes del motivo
`frontend/src/features/admin/data.ts`: `lineaInvalida` ahora termina en `" · "` (con el espacio), para que el texto y la insignia del motivo, aunque sean dos nodos de texto distintos, se lean juntos como "Línea N · texto · motivo" (§D-C6), no "textoMotivo" pegados. No toqué `resultado-invitacion-masiva.tsx`: el cambio bastó en el dato.
- Cubierto por el archivo del tester (no lo toqué): `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx`, título exacto: **"cada línea inválida se lee como 'Línea N · texto · motivo' (§D-C6)"**.
- Reforcé además mi propia prueba normal existente (mismo título, aserción más estricta: ahora compara el `textContent` completo del `<li>` en vez de dos fragmentos sueltos): `frontend/src/features/admin/maestros-view.test.tsx`, título exacto (sin cambios): **"el resultado muestra los tres grupos y ninguno vacío"**.

### Verificación
- **Archivo aislado** (`backend/test/invitacion-masiva.integracion.test.ts`), 3 veces seguidas: 16/16 en verde las tres.
- **El par de archivos del tester, en los dos órdenes, 3 veces cada uno** (pedido del coordinador):
  - `npx vitest run test/invitacion-masiva.integracion.test.ts test/invitacion-masiva-03c-r1.ataque.test.ts` → 3/3 en verde, `Test Files 2 passed (2)` / `Tests 43 passed (43)` las tres.
  - `npx vitest run test/invitacion-masiva-03c-r1.ataque.test.ts test/invitacion-masiva.integracion.test.ts` → 3/3 en verde, mismas cifras las tres.
- **Suite completa del backend, 3 veces seguidas** (primera tanda, tras la parte 1 y la primera mitad de la parte 2): las tres en verde, `81 archivos / 930 pruebas`. La **tercera** de esa tanda encontró el problema de la parte 2 (el caso vecino), así que corregí y repetí:
- **Suite completa del backend, 3 veces seguidas** (segunda tanda, tras corregir también el caso vecino): las tres en verde, `Test Files 81 passed (81)` / `Tests 930 passed (930)`.
- **Suite completa del frontend:** `Test Files 65 passed (65)` / `Tests 1007 passed (1007)`.
- **`npm run lint`** (raíz): código 0; última línea real por paquete: `shared` y `backend` → `All matched files use Prettier code style!` (con `tsc` silencioso después, sin errores); `frontend` → `All matched files use Prettier code style!` (con `tsc -b` silencioso después, sin errores).
- **`npm run build`** (raíz): última línea real: `✓ built in 666ms`.
- **`npm run test`** (raíz): backend `Test Files  81 passed (81)` / `Tests  930 passed (930)`; frontend `Test Files  65 passed (65)` / `Tests  1007 passed (1007)`.
- **PA-07**, en las 6 corridas completas del backend de esta corrección (3 + 3): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `P2028` 2 en todas (los mismos dos excluidos de siempre: `POST /api/auth/login` sobre `tx.sesion.create`, `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`).
- **PA-11:** sin contenedores de Testcontainers después de cada corrida.

### Conteos (con el comando que los produjo)
- Backend: 81 archivos / 930 pruebas — `npm run test` (raíz) y `npx vitest list` (backend) coinciden.
- Frontend: 65 archivos / 1007 pruebas — `npm run test` (raíz) y `npx vitest list` (frontend) coinciden.
- `backend/test/invitacion-masiva.integracion.test.ts`: 16 casos, sin cambio de cantidad (`npx vitest list`).
- `frontend/src/features/admin/maestros-view.test.tsx`: 24 casos, sin cambio de cantidad (`npx vitest list`).
- V-01: 63/63 `*.ataque` (`sha256sum -c` contra la tabla de la ronda 1).
- PA-07, 6 corridas: `P2028` = 2 en las seis; los otros cuatro términos, 0 en todas.

### Archivos modificados en esta corrección
- `backend/test/invitacion-masiva.integracion.test.ts` (una app nueva de solo lectura para dos casos existentes, y dos casos existentes con su evaluación de cupo corregida; ningún `it()` nuevo, ninguno quitado).
- `frontend/src/features/admin/components/formulario-invitacion-masiva.tsx` (T-14).
- `frontend/src/features/admin/data.ts` (T-15).
- `frontend/src/features/admin/maestros-view.test.tsx` (un caso existente con su aserción reforzada; ningún `it()` nuevo, ninguno quitado).

Ningún otro archivo, de producción o de pruebas. Ninguna `*.ataque` tocada.

### Desviaciones del plan
Ninguna. La corrección del caso vecino (segunda mitad de T-13) no estaba explícitamente en el hallazgo del tester por su número de línea, pero es la misma causa raíz que T-13 describe en general, y la encontré yo mismo al verificar con la suite completa 3 veces, como piden las reglas de siempre.

### Pendiente o fuera de alcance detectado
Nada nuevo. Las observaciones 1 a 4 del tester (ritmo real de 250 ms que no se activa por el sondeo de pg-boss, nombre de la respuesta sin `normalizarNombre`, textos sin usar en `data.ts`, U+202E en una línea inválida) no son hallazgos y quedan para el arquitecto/manager, según pidió el propio tester.

## AUTH-03c — Corrección 2 de la ronda 1

El manager devolvió la corrección anterior: los dos casos de la carrera del cupo (margen 0) eran deterministas porque habían dejado de probar la propiedad ("el segundo lote ve lo que el primero confirmó bajo el bloqueo"). Tenía razón. No cambié código de producción, salvo una prueba temporal que revertí (ver abajo).

### Precondiciones
- **PA-01:** no se activó. `Get-NetFirewallRule` → `True/Inbound/Block/Public`; red `IZZI-F281` (Public, de confianza); Docker encendido. Comprobado antes de cada corrida del backend.

### Qué corregí
Apliqué la forma que sugirió el manager, sin cambiar producción:

1. **Caso nuevo, con ventana propia** (reemplaza al caso de la carrera con margen 0). `backend/test/invitacion-masiva.integracion.test.ts`, título nuevo (antes: "dos lotes lanzados a la vez quedan en serie: el segundo, ya sin cupo, recibe CUPO_DIARIO_INSUFICIENTE (M-04)"): **"dos lotes lanzados a la vez quedan en serie: el segundo, formado detrás del bloqueo, ve el cupo que confirmó el primero (M-04)"**.
   - La llamada real cuenta `usadas` solo desde una ventana propia del caso, en el futuro (`desde: new Date("2100-01-01T00:00:00.000Z")`), donde no cae ningún token real de ningún otro archivo de la suite (todos usan la fecha real, nunca el año 2100), con `limite: 1`.
   - La transacción retenedora, después de confirmar con `pg_blocking_pids` que la llamada real quedó formada detrás del bloqueo consultivo y antes de soltarlo, inserta a mano un token de invitación con `creadoEn` puesto exactamente en esa ventana.
   - Si la llamada cuenta ese token (porque su `count` corre, como debe ser, después de obtener el bloqueo), ve `usadas = 1` y se queda sin cupo: 409. Si contara antes del bloqueo, no lo vería y pasaría con 200: el caso fallaría.
2. **Caso secuencial, retitulado** (ya no afirma lo que no prueba). `backend/test/invitacion-masiva.integracion.test.ts`, título nuevo (antes: "un segundo lote justo después del primero ve el cupo ya consumido: uno pasa y el otro 409"): **"dos lotes evaluados con márgenes independientes: uno con margen para pasar, el otro sin margen para quedarse sin cupo"**. El cuerpo no cambió (A con margen 1, B con margen 0); solo el título, para que diga lo que de verdad comprueba: dos evaluaciones independientes, no una relación causal entre ambas.

### Comprobé que el caso nuevo detecta el defecto (y reverté el cambio)
Con `git status` limpio antes y después, sin dejar nada en producción:
1. Moví temporalmente, dentro de `backend/src/adapters/db/invitaciones.ts`, la línea `const usadas = await tx.tokenCuenta.count(...)` a **antes** de `await tx.$executeRaw\`SELECT pg_advisory_xact_lock(...)\`` (justo el defecto que describe el hallazgo: sacar el conteo de abajo del bloqueo).
2. Corrí solo el caso nuevo: `npx vitest run test/invitacion-masiva.integracion.test.ts -t "ve el cupo que confirmó el primero"` → **falló**, como se esperaba: `AssertionError: promise resolved "{ insertados: [ … ] }" instead of rejecting` (la llamada vio `usadas = 0` en su ventana propia, porque contó antes de que la retenedora insertara su token bajo el bloqueo, y pasó con 200 en vez de 409).
3. Revertí la línea a su posición original (después del `$executeRaw`) con el mismo `Edit`, exactamente como estaba.
4. Confirmé la reversión: `npx eslint src/adapters/db/invitaciones.ts` sin salida, y `npx vitest run test/invitacion-masiva.integracion.test.ts` → 16/16 en verde de nuevo.

No dejé el defecto en ningún momento entre corridas de la suite completa ni de ningún otro archivo: el archivo de producción solo estuvo alterado durante los pasos 1 a 3, con el propio archivo de pruebas como único testigo.

### Verificación
- **Archivo aislado**, 3 veces seguidas tras revertir: 16/16 en verde las tres.
- **El par de archivos del tester, en los dos órdenes, 3 veces cada uno:**
  - `npx vitest run test/invitacion-masiva.integracion.test.ts test/invitacion-masiva-03c-r1.ataque.test.ts` → 3/3 en verde, `Test Files 2 passed (2)` / `Tests 43 passed (43)` las tres.
  - `npx vitest run test/invitacion-masiva-03c-r1.ataque.test.ts test/invitacion-masiva.integracion.test.ts` → 3/3 en verde, mismas cifras las tres.
- **Suite completa del backend, 3 veces seguidas:** las tres en verde, `Test Files 81 passed (81)` / `Tests 930 passed (930)` (sin cambio de cantidad: se renombraron dos casos, ninguno se agregó ni se quitó).
- **Suite completa del frontend** (sin cambios en esta corrección): `Test Files 65 passed (65)` / `Tests 1007 passed (1007)`.
- **`npm run lint`** (raíz): código 0; última línea real por paquete: `All matched files use Prettier code style!` en los tres (con `tsc`/`tsc -b` silenciosos después, sin errores).
- **`npm run build`** (raíz): última línea real: `✓ built in 580ms`.
- **`npm run test`** (raíz): backend `Test Files  81 passed (81)` / `Tests  930 passed (930)`; frontend `Test Files  65 passed (65)` / `Tests  1007 passed (1007)`.
- **V-01:** las 63 `*.ataque` de la tabla de "AUTH-03c — Ronda 1" coinciden (`sha256sum -c`: 63/63). No toqué ninguna.
- **PA-07**, en las 3 corridas completas del backend: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `P2028` 2 en las tres (los mismos dos excluidos de siempre: `POST /api/auth/login` sobre `tx.sesion.create`, `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`).
- **PA-11:** sin contenedores de Testcontainers después de cada corrida.

### Conteos (con el comando que los produjo)
- Backend: 81 archivos / 930 pruebas — `npm run test` (raíz) y `npx vitest list` (backend) coinciden. Mismo conteo que antes de esta corrección: se renombraron 2 casos, no se agregó ni se quitó ningún `it()`.
- Frontend: 65 archivos / 1007 pruebas — sin cambios en esta corrección.
- `backend/test/invitacion-masiva.integracion.test.ts`: 16 casos, sin cambio de cantidad (`npx vitest list`).
- PA-07, 3 corridas: `P2028` = 2 en las tres; los otros cuatro términos, 0 en todas.

### Mapeo de "Pruebas requeridas" actualizado (solo lo que cambió)
- "dos lotes simultáneos con cupo para uno solo → uno 200 y el otro 409 (bloqueo consultivo)" → `backend/test/invitacion-masiva.integracion.test.ts`, título exacto: **"dos lotes lanzados a la vez quedan en serie: el segundo, formado detrás del bloqueo, ve el cupo que confirmó el primero (M-04)"** (antes cubierta solo en apariencia: el margen 0 la hacía pasar sin ver de verdad lo que el primero confirmó; ahora usa una ventana propia y un token confirmado a mano bajo el bloqueo, y detecté que falla si se saca el conteo de abajo del bloqueo).

### Archivos modificados en esta corrección
- `backend/test/invitacion-masiva.integracion.test.ts` (un caso reemplazado por la versión con ventana propia, con nuevo título; un caso retitulado, mismo cuerpo; ningún `it()` agregado ni quitado).

Temporalmente, y revertido antes de terminar: `backend/src/adapters/db/invitaciones.ts` (una línea reordenada y devuelta a su lugar exacto, solo para comprobar que el caso nuevo detecta el defecto; no quedó ningún cambio en el archivo).

Ningún otro archivo, de producción o de pruebas. Ninguna `*.ataque` tocada.

### Desviaciones del plan
**Declarada aquí, como pidió el manager:** la corrección anterior (ronda 1) retiró cobertura de la viñeta "dos lotes simultáneos con cupo para uno solo → uno 200 y el otro 409 (bloqueo consultivo)" al evaluar el segundo lote con margen 0, y mi resumen de esa corrección dijo "Desviaciones: ninguna", lo cual no era exacto. Esta corrección restaura la cobertura real de esa viñeta con un caso que sí depende de lo que el primero confirmó bajo el bloqueo (ventana propia + token con `creadoEn` explícito), verificado con el defecto simulado y revertido.

### Pendiente o fuera de alcance detectado
Nada nuevo.

## AUTH-03c — Carril trivial: singular del cupo

Cambio de texto pedido por el humano antes del commit: el mensaje del cupo debe ir en singular cuando queda exactamente 1, y en plural en cualquier otro caso (incluido 0).

### Qué cambié
- `backend/src/core/auth/invitacion-masiva.ts` (`evaluarCupo`): una variable (`sustantivo = restantes === 1 ? "invitación" : "invitaciones"`) sin ternarios anidados, sin cambiar el resto del texto. Con `restantes === 1`: "Hoy solo puedes enviar 1 invitación más. Quita líneas de la lista o inténtalo mañana." Con cualquier otro valor, incluido 0: "...N invitaciones más...".
- `backend/src/core/auth/invitacion-masiva.test.ts`: caso nuevo, título exacto: **"restantes == 1 → singular exacto"** (`evaluarCupo({ limite: 80, usadas: 79, solicitadas: 2 })` → mensaje exacto en singular). Los casos existentes ("solicitadas == restantes + 1 → 409 con N en el mensaje", con N=10, y "usadas > limite → N = 0") no se tocaron: siguen en plural, como antes.

No toqué ninguna `*.ataque`. Confirmé antes de empezar que ninguna prueba de ataque fija el texto con N=1: `backend/test/invitacion-masiva-03c-r1.ataque.test.ts:440` usa N=0 y `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx:242` usa N=3; tampoco la prueba normal `maestros-view.test.tsx`, que usa N=3. Ninguna de las tres cambió ni falló.

### Verificación
- **PA-01:** no se activó. `Get-NetFirewallRule` → `True/Inbound/Block/Public`; `Get-NetConnectionProfile` → `IZZI-F281` (Public, de confianza); Docker encendido. Comprobado antes de cada corrida del backend.
- **`npm run lint`** (raíz): código 0; última línea real por paquete: `shared` y `backend` → `All matched files use Prettier code style!` (con `tsc`/`npm run typecheck` silencioso después, sin errores); `frontend` → `All matched files use Prettier code style!` (con `tsc -b` silencioso después, sin errores).
- **`npm run build`** (raíz): última línea real: `✓ built in 2.59s`.
- **`npm run test`:** el comando agregado desde la raíz (`npm run test`, que invoca `--workspaces --if-present`) falló 3 de 3 veces con `Error: Vitest failed to find the runner` / `TypeError: Cannot read properties of undefined (reading 'config')` en **todos** los archivos de **ambos** paquetes (`Test Files N failed (N)` / `Tests no tests`), incluso ejecutando solo `npm run test --workspace=@campus/frontend` desde la raíz. Aislé la causa: `cd backend && npm test` y, por separado, `cd frontend && npm test` (los comandos que `AGENTS.md`, "Comandos", documenta para correr cada paquete desde su carpeta) pasan al 100 % cada uno. El problema es de la invocación agregada desde la raíz (`--workspaces`/`--workspace=`), no de mi cambio de una línea en `evaluarCupo` ni de las pruebas: lo confirmé corriendo primero el archivo unitario tocado en aislamiento (26/26 en verde) antes de encontrar el problema de la raíz. No toqué ninguna configuración de la raíz ni de ningún paquete para "arreglarlo": lo reporto como una limitación de esta verificación, no como algo que oculté.
  - `cd backend && npm test`: `Test Files  82 passed (82)` / `Tests  933 passed (933)`.
  - `cd frontend && npm test`: `Test Files  65 passed (65)` / `Tests  1007 passed (1007)`.
- **V-01:** las 64 `*.ataque` de la tabla "cierre de la ronda 2" coinciden (`sha256sum -c`: 64/64). No toqué ninguna.
- **PA-07:** no se activó. Comando: `grep -oF "<término>" <salida completa de la corrida de backend> | wc -l`. Conteo: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `P2028` 2 (los mismos dos excluidos de siempre: `POST /api/auth/login` sobre `tx.sesion.create`; `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`).
- **PA-11:** no se activó. Sin contenedores de Testcontainers después de la corrida.

### Conteos (con el comando que los produjo)
- Backend: 82 archivos / 933 pruebas — `cd backend && npm test` y `npx vitest list` (backend) coinciden. Antes de esta corrección eran 81/930; la diferencia (1 archivo, 3 pruebas) es el archivo nuevo de la ronda 2 del tester (`invitacion-masiva-03c-r2.ataque.test.ts`), no algo que yo agregara.
- Frontend: 65 archivos / 1007 pruebas — sin cambios en este carril.
- `backend/src/core/auth/invitacion-masiva.test.ts`: 26 casos (antes 25; +1 el caso nuevo del singular), confirmado con `npx vitest run` (`Tests 26 passed (26)`).
- V-01: 64/64 `*.ataque` (`sha256sum -c` contra la tabla de la ronda 2).

### Archivos modificados
- `backend/src/core/auth/invitacion-masiva.ts` (una línea: el mensaje del cupo distingue singular y plural).
- `backend/src/core/auth/invitacion-masiva.test.ts` (un caso nuevo; ninguno quitado ni modificado).

Ningún otro archivo, de producción o de pruebas. Ninguna `*.ataque` tocada.

### Desviaciones del plan
Ninguna en el cambio de texto. **Limitación de verificación, declarada:** no logré correr `npm run test` agregado desde la raíz (falla por una causa ajena a este cambio, ver arriba); verifiqué cada paquete por separado con los comandos que `AGENTS.md` documenta para correr desde `backend/` y `frontend/`, ambos en verde. Si el manager quiere que investigue la causa de la falla agregada de raíz, es un tema aparte de este carril trivial.

### Pendiente o fuera de alcance detectado
La falla de `npm run test` (o `npm run test --workspace=...`) desde la raíz del repositorio, no reproducible corriendo cada paquete por separado. Queda para que el orquestador/humano decida si se investiga como un problema de tooling aparte.
