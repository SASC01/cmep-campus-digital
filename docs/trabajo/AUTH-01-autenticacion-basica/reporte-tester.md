> Registrado por el orquestador el 2026-09-23: el entorno impidió al `tester` crear este archivo ("Subagents should return findings as text, not write report files"). El texto de abajo es su entrega de la ronda 1, transcrita sin cambios.

# Reporte del Tester — AUTH-01: autenticación básica — Ronda 1
Veredicto: ROTO
Verificación propia: lint ok (`npm run lint` desde la raíz, código 0, con mis archivos incluidos) · test con fallos esperados (`npm test` desde la raíz, código 1). Solo fallan las 15 pruebas de ataque que demuestran los hallazgos; las 162 del Programador pasan.

Fecha: 2026-09-23. Leí `plan.md` (con la Enmienda 1), `aprobacion.md`, `resumen-programador.md` y el código nuevo de:
- `shared/`
- `backend/src/{core/auth,config,adapters/auth,adapters/db,middleware,handlers,scripts}` y `app.ts`
- `frontend/src/{services,app,features/auth,components/layout}`

## Verificación propia (detalle)
| Qué | Resultado |
|---|---|
| Línea base antes de escribir pruebas (`npm run lint` y `npm test` desde la raíz) | lint 0 · test 0. Backend 19 archivos / 126 pruebas, frontend 8 / 36; coincide con el resumen del Programador |
| `npm run lint` desde la raíz, con mis 8 archivos `*.ataque.test.ts(x)` | código 0 (ESLint, Prettier `--check` y `tsc` en los tres workspaces) |
| `tsc --noEmit` de `backend/src` + `backend/test` | código 0 (tsconfig temporal en el scratchpad, fuera del repositorio) |
| `npm test` desde la raíz (corrida final) | Backend 25 archivos / 213 pruebas: 201 pasan, 12 fallan. Frontend 10 archivos / 63: 60 pasan, 3 fallan. Todas las que fallan son mías y son los hallazgos |
| Estabilidad | Backend completo 3 veces: los mismos 12 fallos cada vez. Frontend: los mismos 3 fallos en 3 corridas |
| Residuos en `campus_dev` | `SELECT count(*) FROM usuarios WHERE email LIKE '%@pruebas.local'` → 0. `usuarios` = 1 fila: el admin real, sin tocar |
| Filas ajenas | No modifiqué ni borré ninguna. Solo leí el id y el correo del admin real: para una ruta de prueba de solo lectura y para intentar registrar su correo, que respondió 409. Sus sesiones figuran revocadas a las 15:25:51 UTC, antes de que yo empezara (≈15:36 UTC); fue el `reset:admin` de V-22 del Programador |
| Procesos | La API real corrió con `node --import tsx src/server.ts` como hijo de Vitest: sin shell, un PID, puerto libre aleatorio. La propia prueba la detuvo. No usé 3000 ni 5173. Al final no queda ningún `node.exe` mío (los vivos, 3884 y 12228, son de las 09:36 y ajenos). Un `python` que yo lancé con un comando mal formado (PID 597, 09:52) se colgó; lo terminé yo mismo |
| No ejecutado | `reset:admin`; ninguna migración, `db push` ni `docker compose down` |

Conteo: **8 archivos, 114 casos, 15 fallan**. Backend: 6 archivos, 87 casos, 12 fallan (`backend/test/auth-login.ataque.test.ts`, `backend/test/auth-registro.ataque.test.ts`, `backend/test/sesiones-y-cadena.ataque.test.ts`, `backend/test/api-real.ataque.test.ts`, `backend/test/admin-unico.ataque.test.ts`, `backend/src/config/env.ataque.test.ts`). Frontend: 2 archivos, 27 casos, 3 fallan (`frontend/src/services/apiClient.ataque.test.ts`, `frontend/src/app/router.ataque.test.tsx`).

## Hallazgos

### T-01 — El límite de 5 intentos de login se salta con peticiones concurrentes
Severidad: alta

Prueba: `backend/test/auth-login.ataque.test.ts`, casos "20 intentos concurrentes con contraseña incorrecta: a lo sumo 5 llegan a verificarse (el resto 429)" y "una ráfaga concurrente de 19 contraseñas incorrectas más la correcta no debe dejar entrar".

Esperado / Obtenido:
- **20 intentos simultáneos** (misma IP, mismo correo, contraseña incorrecta): se esperaban 5 × `401` y 15 × `429`. Se obtuvieron **20 × `401` y 0 × `429`**: las 20 contraseñas se verificaron con argon2.
- **19 incorrectas más la correcta** en la misma ráfaga: se esperaba `429` para la vigésima. Se obtuvo **`200` con sesión y cookie**. Además, ese acierto ejecuta `intentos.delete(llave)` y borra los fallos de la misma ráfaga.
- **Causa**, en `backend/src/handlers/auth/index.ts`:
  - `estaBloqueado(fallosVigentes(llave, ahora), ahora)` se evalúa en la línea 127.
  - Después vienen `await buscarCredencialesPorEmail` (138) y `await verificarContrasena` (141).
  - El fallo solo se anota al final, con `anotarFallo` (144).
  - Así, todas las peticiones en vuelo pasan la comprobación antes de que se anote el primer fallo.
- **Efecto:** un atacante con una sola IP prueba tantas contraseñas por ventana como peticiones pueda tener abiertas a la vez, no 5.
- En secuencia, el límite sí funciona (ver "Atacado sin hallazgos").

Requisito o regla violada: ESSENTIALS "Autenticación" ("Login: 5 intentos / 15 min por IP + correo"), DEC-06, P-03 y los "Puntos de ataque" del plan (fuerza bruta).

### T-02 — Entrar con otra cuenta sin cerrar la anterior lleva al dashboard y al nombre de la cuenta anterior
Severidad: media

Prueba: `frontend/src/app/router.ataque.test.tsx`, caso "entrar como otra cuenta sin cerrar sesión lleva al dashboard de la cuenta nueva, no de la anterior".

Esperado / Obtenido:
- **Escenario:** Ana (estudiante) tiene la sesión abierta y su `/me` en caché. Se vuelve a `/login` (con Atrás o escribiendo la URL) y entra Luis (maestro).
- Se esperaba `/maestro` con "Luis Pérez". Se obtuvo **`/estudiante` con el nombre de Ana**, mientras el token en memoria ya es el de Luis.
- **Causa**, en `frontend/src/features/auth/hooks.ts`:
  - `useLogin` y `useRegistro` llaman a `queryClient.fetchQuery(consultaMe)` (líneas 46 y 61).
  - `consultaMe` tiene `staleTime: 60_000` (línea 34), así que durante 60 s devuelve el `/me` en caché de la cuenta anterior sin consultar al servidor.
- **Efecto:** si la cuenta anterior era de admin, la nueva ve el contenedor de admin con el nombre y el correo del admin. El backend sigue negando las acciones. Es un escenario realista en computadoras compartidas del colegio.

Requisito o regla violada: RF-05 ("cada rol llega directamente a su dashboard"), DEC-13/DEC-14 ("Tras entrar, /me decide el destino").

### T-03 — Un nombre con carácter nulo en el registro produce 500 en vez de 400
Severidad: media

Prueba: `backend/test/auth-registro.ataque.test.ts`, caso "un nombre con un carácter nulo se rechaza con 400, no con un 500".

Esperado / Obtenido:
- `POST /api/auth/registro` con `nombre: "Ana\u0000López"` (JSON válido). Se esperaba `400 VALIDACION`; se obtuvo **`500 ERROR_INTERNO`**.
- **Qué pasa:**
  - `nombreSchema` acepta el valor.
  - PostgreSQL lo rechaza con `22021 invalid byte sequence for encoding "UTF8": 0x00`.
  - El error llega sin traducir al envoltorio, que lo registra como "Error no controlado" con traza.
- **Efecto:** cualquiera puede provocar 500 y entradas de log de nivel `error` a voluntad.
- Comprobé que ese log de error **no** contiene la contraseña, el hash ni el correo.

Requisito o regla violada: DEC-05 (entrada inválida → `400 VALIDACION`), CLAUDE.md "Manejo de errores en el backend" (los errores del proveedor se traducen a `AppError`).

### T-04 — Se aceptan nombres formados solo por caracteres invisibles o de control
Severidad: baja

Prueba: `backend/test/auth-registro.ataque.test.ts`, caso "un nombre formado solo por caracteres invisibles o de control se rechaza".

Esperado / Obtenido:
- `nombre` = tres espacios de ancho cero (U+200B). Se esperaba `400`; se obtuvo **`201`**: la cuenta se crea con un nombre invisible.
- **Causa:** `String.prototype.trim` no quita U+200B, y `nombreSchema` (en `shared/src/auth.ts`) solo aplica `trim` + `min(2)`.
- El mismo camino deja pasar U+202E, que invierte el sentido del texto y sirve para suplantar nombres en listas que verán los maestros, y también caracteres de control.
- La prueba se detiene en el primer caso.

Requisito o regla violada: RF-02 ("nombre completo") y S-03 (nombre de 2 a 120 caracteres "tras trim"; se cumple la letra, no el propósito).

### T-05 — El verificador del JWT no exige `exp` ni limita la vigencia a 15 minutos
Severidad: baja

Prueba: `backend/test/sesiones-y-cadena.ataque.test.ts`, casos "rechaza un JWT sin exp aunque la firma sea correcta…" y "rechaza un JWT con una vigencia mayor a 15 minutos (exp a un año)".

Esperado / Obtenido:
- Un JWT HS256 firmado con el `JWT_SECRET` correcto, con `iss`, `aud` y `sub` válidos, obtiene **`200`** en `GET /api/me` en dos casos: **sin `exp`**, o con `exp` a un año. Se esperaba `401`.
- **Causa:** `verificarTokenAcceso` (`backend/src/adapters/auth/tokens.ts`, línea 42) llama a `jwtVerify` sin exigir `exp` ni una antigüedad máxima.
- Explotarlo requiere el secreto, o un error futuro al firmar. Es defensa en profundidad: hoy el servidor siempre firma con `exp = iat + 900`.

Requisito o regla violada: ESSENTIALS "Autenticación" ("Token de acceso: JWT de 15 min"), S-05 / M-03.

### T-06 — La guarda de rutas (M-09) solo mira el primer preHandler y la URL literal
Severidad: baja

Prueba: `backend/test/sesiones-y-cadena.ataque.test.ts`, casos "una ruta /api con authenticate pero sin el resto de la cadena debe impedir el arranque" y "una ruta paramétrica que atrapa /api/* sin protegido() debe impedir el arranque".

Esperado / Obtenido (app de Fastify con `registrarMiddleware`, como en la prueba del Programador):
- **Cadena incompleta:** `GET /api/prueba/parcial` con `{ preHandler: [authenticate] }`, sin `withProfile`, `withPasswordGate`, `withAccess` ni `requireRole`.
  - Se esperaba que el arranque fallara.
  - La app **arranca**, y el JWT de un usuario **inactivo y restringido** recibe **`200`** del handler.
- **Ruta paramétrica:** `GET /:seccion/secreto` sin `protegido()`.
  - La URL no empieza por `/api`, así que la guarda la ignora (`guarda-de-rutas.ts`, línea 18).
  - Aun así atiende `GET /api/secreto`: **arranca y responde `200` sin token**.

Ninguna ruta actual está afectada. El primer caso cumple la letra de DEC-16, pero no lo que promete el comentario de la guarda ("hace cumplir la regla 2 de AGENTS.md por construcción").

Requisito o regla violada: AGENTS.md regla 2 ("Todo endpoint pasa por la cadena de middleware en su orden"), M-09.

### T-07 — Tras cerrar sesión la app vuelve a llamar a `/refrescar`; si el logout no llegó al servidor, la sesión se reabre sola
Severidad: baja

Prueba: `frontend/src/app/router.ataque.test.tsx`, casos "tras un logout exitoso la app no vuelve a intentar restaurar la sesión (/refrescar)" y "si el logout falla por red, igual se sale y el token queda limpio".

Esperado / Obtenido:
- **Logout correcto (`204`):** se esperaba 1 llamada a `/api/auth/refrescar` en toda la prueba (la restauración inicial). Se obtuvieron **2**.
  - Justo después de salir, una guarda aún montada vuelve a ejecutar `consultaMe`, y `restaurarSesion` (ya sin memoizar) pide `/refrescar`.
  - D-05 (navegar antes de `queryClient.clear()`) no lo evita.
  - Esa llamada recibe `401` y no pasa nada más.
- **Logout con fallo de red** (la cookie sigue viva en el servidor): se esperaba `haySesion() === false` en `/login`. Se obtuvo **`true`**.
  - Ese `/refrescar` automático responde `200` y vuelve a dejar un token en memoria mientras la pantalla muestra el login.
  - Con la red caída la cookie sigue viva de todos modos (el plan lo acepta), así que la exposición extra es pequeña. El defecto es que "salir" reabre la sesión sin que nadie la pida.

Requisito o regla violada: DEC-15 (`logout` → `limpiarToken()` → `clear()` → `/login`), M-08 (sin llamadas de más a `/refrescar`).

### T-08 — La guarda de `JWT_SECRET` en production se evade con variantes triviales
Severidad: baja

Prueba: `backend/src/config/env.ataque.test.ts`, casos "rechaza el literal de .env.example con espacios alrededor…" y "rechaza un secreto formado solo por espacios en blanco".

Esperado / Obtenido:
- Con `NODE_ENV=production`, `validarEnv` devuelve **`ok: true`** para:
  - el literal de `.env.example` con un espacio delante o detrás, o con un salto de línea final;
  - un secreto de 32 espacios o de 40 tabuladores.
- Se esperaba el rechazo.
- **Causa:** la comparación de `config/env.ts` (líneas 47–51) es exacta, y la longitud mínima no descuenta los espacios.
- **Efecto:** un valor copiado del ejemplo con un espacio al final, algo común en `.env` y en variables de Docker, arranca con el secreto público.

Requisito o regla violada: M-11 / DEC-17, AGENTS.md regla 9.

### T-09 — Los logs de la API no llevan `userId`
Severidad: baja

Prueba: `backend/test/api-real.ataque.test.ts`, caso "el log de una petición autenticada lleva el userId (ESSENTIALS > Operación: requestId y userId)".

Esperado / Obtenido:
- API real con `LOG_LEVEL=trace` y un `GET /api/me` autenticado.
- Se esperaba el id del usuario en las líneas de log de esa petición. **No aparece en ninguna línea**; `requestId` sí aparece.
- AUTH-01 es el encargo que introduce la identidad, pero el plan no lo menciona. Si el Manager decide que corresponde a otro encargo, basta con anotarlo.

Requisito o regla violada: ESSENTIALS "Operación" ("Logs JSON con `requestId` y `userId`").

### T-10 — `alterarFirma` (ayuda de pruebas del Programador) no siempre altera la firma: "firma alterada → 401" falla al azar
Severidad: baja

Prueba: `backend/test/sesiones-y-cadena.ataque.test.ts`, caso "alterarFirma (ayuda del programador) siempre invalida el token…".

Esperado / Obtenido:
- **Por qué pasa:** la firma HS256 son 32 bytes, es decir 43 caracteres base64url, y el último carácter solo aporta 4 bits útiles. Cuando la firma termina en `A` (1 de cada 16 tokens), `alterarFirma` (`backend/test/ayudas-auth.ts:228`) la cambia por `B`, que decodifica a los mismos bytes.
- El token "alterado" sigue siendo válido: se obtuvo **`200`**, se esperaba `401`.
- **Consecuencia:** en `me.integracion.test.ts`, el caso "con la firma alterada responde 401" falla al azar en ~6 % de las corridas, según el segundo en que se firma.
- No es un defecto de producción; el verificador es correcto. Es una prueba verde que no siempre prueba lo que dice.

Requisito o regla violada: AGENTS.md "Pruebas" y "Ningún agente declara verde algo que no ejecutó".

## Atacado sin hallazgos

**Login y límite de intentos** (`auth-login.ataque`)
- En secuencia, 5 fallos con variantes del correo comparten la llave: MAYÚSCULAS, espacios, tabulador y salto de línea, dominio en mayúsculas. El sexto intento, aun con la contraseña correcta, recibe `429` con `Retry-After: 900`.
- Frontera de la ventana con `Date` simulado: a los 14:59 sigue en `429`; a los 15:01 entra con `200`.
- Los fallos contra un usuario inactivo cuentan (M-07).
- El `429` es byte a byte igual para un correo existente y para uno inexistente.
- Correo inexistente, usuario inactivo y contraseña incorrecta responden igual: mismo estado, cuerpo idéntico, sin `Set-Cookie` ni `Retry-After`.
- Tiempos (9 muestras intercaladas, medianas), todos dentro de la tolerancia de 20 ms: contraseña incorrecta 46.4 ms; correo inexistente 43.2 ms; usuario inactivo 56.9 ms.
- Contraseña de 129 caracteres: misma respuesta exista o no la cuenta, y sin eco.
- Contraseña corta: `CREDENCIALES_INVALIDAS`, no `VALIDACION`.
- Una contraseña de 10 espacios es válida; con 9 espacios no entra.
- Un alumno restringido puede iniciar sesión (RN-03) y `/me` lo refleja.
- Campos extra en el cuerpo (`rol`, `sub`, `usuarioId`, `id`) no cambian la identidad del token.

**Registro** (`auth-registro.ataque`)
- Asignación masiva: en todos estos casos la cuenta nace estudiante, al corriente, activa y sin banderas: `rol` admin o maestro; `estadoPago` y `accesoRestringido`, en camelCase y en snake_case; `activo: false`; `debeCambiarContrasena`; un `hashContrasena` o un `id` propios; `?rol=admin` en la query.
- `__proto__` y `constructor.prototype` → `400`, sin crear la cuenta ni contaminar `Object.prototype`.
- Tres registros concurrentes con el mismo correo → exactamente `201, 409, 409` y una sola fila.
- Duplicados con mayúsculas, espacios o tabuladores → `409 CORREO_EN_USO`, sin fugas ni cookie. El correo del admin real en mayúsculas → `409`.
- Entradas que responden `400` sin 500: cuerpo vacío, `null`, arreglo, cadena o número; tipos incorrectos; `nombre: null` o solo espacios.
- Contraseña de 129 → `400` sin eco; de 128 → `201`. Los errores de validación no repiten la contraseña, el correo ni otros valores.
- Nombre de 121 caracteres → `400`. HTML o SQL en el nombre se guarda tal cual.
- Homógrafos (K de Kelvin, i turca) → `400` o `409`.
- Cuerpo de más de 1 MB → `413 SOLICITUD_INVALIDA`.
- En la base, la contraseña queda como `$argon2id$…` sin el texto plano, y `hash_token` es el SHA-256 de la cookie, nunca la cookie.
- El `201` es exactamente `{ tokenAcceso }`, y el JWT solo lleva `sub, iat, exp, iss, aud`, con `exp − iat = 900`.

**JWT, cadena de middleware y banderas** (`sesiones-y-cadena.ataque`)
- Reciben `401`: HS512 firmado con el secreto real; `alg` `none`, `None`, `NONE` y `nOnE`; firma reutilizada con el `sub` de otro usuario; `sub` vacío, con SQL, numérico, con espacios o nulo; token en la query, en una cookie, con `Basic`, sin esquema o con `Bearer ` vacío; token vigente de un usuario borrado.
- Vencimiento exacto: firmado hace 14:50 → `200`; hace 15:01 → `401`.
- Un `rol: "admin"` dentro de la carga se ignora: `403`.
- Con el mismo JWT, los cambios en la base de `rol`, `activo`, `acceso_restringido` y `debe_cambiar_contrasena` surten efecto en la petición siguiente y son reversibles.
- `debeCambiarContrasena` → `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, también en `/me`.
- La rama positiva de `requireRole(["admin"])` funciona con un JWT del admin real (solo lectura, sin sesiones).
- Un restringido solo pasa por `GET /api/me`. `HEAD /api/me` sin token → `401`.
- El `/me` de un alumno deudor no trae `estadoPago` y tiene exactamente 6 campos.

**Refresco y logout** (`sesiones-y-cadena.ataque`)
- Reutilizar un token rotado revoca las sesiones de todos los dispositivos del usuario.
- 10 refrescos concurrentes con el mismo token: a lo sumo un `200`; 0 sesiones vivas al final y ninguna huérfana; el token del ganador ya no refresca (M-06).
- Logout con el token viejo no afecta a la sesión nueva.
- Logout repetido, con cookie basura, sin cookie o con 4000 caracteres → `204` sin cuerpo.
- Una sesión vencida hace 1 ms → `401`; una a 1 minuto de vencer → `200`.
- Restringido y con cambio pendiente pueden refrescar.
- `Set-Cookie` exacto en login y refresco: `campus_refresco=<43>; Max-Age=2592000; Path=/api/auth; HttpOnly; SameSite=Strict`.
- `GET /api/auth/refrescar` → `404`, y la cookie no autentica en `/api/me`.

**Superficie de rutas** (`printRoutes`)
- Bajo `/api` solo existen `GET|HEAD /api/salud`, `GET|HEAD /api/me` y `POST /api/auth/{registro,login,refrescar,logout}`. Ninguna ruta crea admins ni maestros.

**Admin único** (`admin-unico.ataque`)
- Promover un estudiante a admin con `UPDATE` choca con `usuarios_un_solo_admin_idx`. Se hizo en una transacción siempre revertida, sin residuos.

**Procesos reales** (`api-real.ataque`)
- Log de la API real con `LOG_LEVEL=trace` y un recorrido completo (registro, `/me`, refresco y reutilización; login incorrecto y correcto; el 500 de T-03; JSON malformado con contraseña, contraseña corta, logout y token falso): no aparece ninguna de las 4 contraseñas, los 3 JWT, las 3 cookies ni sus SHA-256; ni `$argon2`, `eyJhbGci`, `"contrasena"`, `hash_contrasena` ni `hash_token`.
- `NODE_ENV=production` con el secreto de ejemplo → código 1, sin mostrar el valor y sin llegar a escuchar.
- `seed:admin` con el admin ya creado → código 1, sin `ADMIN_PASSWORD` en la salida.
- `seed:admin` con una contraseña corta → código 1, sin el valor.

**Configuración** (`env.ataque`)
- Frontera de 31/32 caracteres en production. Ningún mensaje repite el valor. Los errores de `ADMIN_*` no hacen eco del valor.

**Frontend**
- `apiClient`: 5 peticiones concurrentes con `401` → 1 solo `/refrescar` y un reintento cada una; si el reintento vuelve a dar `401`, no hay segundo refresco; `/refrescar` con HTML o sin red → token limpio; en `/registro`, una pérdida de sesión no navega; un `401` de login con token en memoria no dispara el refresco; `403 ACCESO_RESTRINGIDO` estando ya en `/acceso-restringido` no vuelve a navegar; `ROL_NO_PERMITIDO` ni navega ni borra el token; 500, 502, 503 y 504 sin JSON → `SIN_CONEXION`; un 503 con el JSON del proyecto conserva su código; un fallo de red → `SIN_CONEXION` con estado 0.
- Login, registro, refresco y logout nunca escriben en `localStorage` ni en `sessionStorage`, y no cambian `document.cookie`.
- Guardas por rol: cada rol que entra al dashboard de otro vuelve al suyo; un restringido en `/admin` termina en `/acceso-restringido`; un no restringido en `/acceso-restringido` vuelve a su dashboard; un `/me` sin `rol` ni `accesoRestringido` termina en `/login`, sin valores por defecto; una recarga con cookie válida hace exactamente 1 `/refrescar` y 1 `/me`.
- Tras logout, volver a `/estudiante` termina en `/login` sin datos en caché.
- Doble clic en "Crear cuenta" → 1 sola petición. Un sondeo aparte, no versionado, mostró que dos clics síncronos en "Iniciar sesión" también hacen 1.

**Revisión estática**
- Librerías de infraestructura solo en `adapters/`. Único SQL crudo: `` $queryRaw`SELECT 1` ``; ningún `Unsafe`. Sin consultas dentro de ciclos. Sin verificaciones de rol en `handlers/`. `console.*` solo en `config/env.ts` y `scripts`, sin secretos.
- Ni `aws-*` ni `nodemailer`. Única coincidencia: `aws-ssl-profiles`, transitiva de `mysql2` que viene con la CLI de Prisma; ya estaba en `main` antes de AUTH-01 y se reporta sin bloquear (regla 11).

## No atacado y por qué
- **`npm run reset:admin`:** no lo ejecuté. Revocaría las sesiones y el hash del admin real, que no creé. El caso "sin admin → código 1" exigiría borrar ese admin.
- **`navigator.locks` entre pestañas, 360 px, foco y contraste:** no hay navegador en este entorno, y jsdom no trae `navigator.locks`.
- **`trustProxy` y límite por IP detrás de Cloudflare y Caddy:** es del encargo de despliegue. Nota para ese encargo: sin `trustProxy`, en `prod` la llave sería la IP de Caddy más el correo, y cualquiera podría bloquear el login de cualquier cuenta con 5 fallos.
- **`NODE_ENV` por omisión** (observación sin prueba): vale `development`. Si el despliegue no fija `production`, no se activan ni la guarda de DEC-17 ni el atributo `Secure` de la cookie.
- **Fuera de alcance de AUTH-01:** AUTH-02 (recuperación, invitación, contraseña temporal, cambio de contraseña, `tokens_cuenta` y Resend); `pagos` (`GET /me/estado-pago`); clases (`requireMembership` y `requireOwnership` son esqueletos que responden 501, y el Programador ya los probó); calificaciones, archivos, LiveKit y la cola.
- **Testcontainers:** decisión M-05. Uso `campus_dev` con correos únicos `@pruebas.local`, que borro al terminar.

---

# Reporte del Tester — AUTH-01 — Ronda 2
Veredicto: ROTO (T-01 a T-10 resueltos; 2 hallazgos nuevos, ambos de severidad baja)
Verificación propia: lint ok (`npm run lint` desde la raíz, código 0) · test con fallos esperados (`npm test` desde la raíz, código 1). Solo fallan las 5 pruebas nuevas que demuestran T-11 y T-12. Pasan las 114 de ataque de la ronda 1 y las 170 del Programador.

Fecha: 2026-09-23. Leí la sección "Ronda 2 — hallazgos del Tester" de `resumen-programador.md` y el código que cambió: `shared/src/auth.ts`, `core/auth/intentos.ts`, `handlers/auth/index.ts`, `adapters/db/errores.ts`, `adapters/auth/tokens.ts`, `config/env.ts`, `middleware/{authenticate,guarda-de-rutas,index}.ts`, `test/ayudas-auth.ts`, `features/auth/hooks.ts` y `services/authService.ts`.

## Verificación propia
| Qué | Resultado |
|---|---|
| Integridad de mis 8 archivos de la ronda 1 | **Intactos.** Última modificación entre 09:56:06 y 10:19:51, antes de la primera edición del Programador (10:30:52, `shared/src/auth.ts`); `find -newer` no los lista entre lo cambiado. Casos por archivo iguales a los de la ronda 1 (13 · 29 · 33 · 6 · 1 · 5 · 12 · 15 = 114), con las aserciones de los 15 casos que fallaban presentes sin cambios. SHA-256 (16 primeros caracteres) al inicio y al final de esta ronda: `auth-login` b28792465e598a7f · `auth-registro` 7fbb3d4178842758 · `sesiones-y-cadena` 7b979360c3773e31 · `api-real` 1cd21770bdb4aad9 · `admin-unico` dfa214f4ec49a266 · `env` 4fce3cedf662ba3a · `apiClient` 10c730348d18ff8d · `router` e58293532633dc5c. Límite: no guardé una copia al cierre de la ronda 1; la evidencia es fecha + revisión del contenido, no un diff byte a byte |
| Manipulación propia (declarada) | Para leer las medianas de tiempo cambié 3 veces una línea de `auth-login.ataque.test.ts` y la restauré desde una copia. El hash sigue igual (b28792465e598a7f); solo cambió la fecha del archivo (≈10:47) |
| Línea base antes de atacar | `npm run lint` 0 · `npm test` 0: backend 25 archivos / 220, frontend 10 / 64. Coincide con el Programador |
| Repeticiones | `auth-login` + `sesiones-y-cadena` + `auth-registro` (ataque), 5 corridas: 75/75 en cada una. Archivos de ataque del frontend, 3 corridas: 32/32. `npm test` de la raíz 2 veces, con los mismos 5 fallos |
| Tiempo de login (mediana, 3 corridas) | incorrecta / inexistente / inactivo: 30.3 / 32.7 / 31.0 · 34.1 / 34.8 / 35.1 · 26.8 / 27.2 / 27.4 ms |
| `npm test` final (raíz, 2 corridas) | backend 29 archivos / 281: 276 pasan, 5 fallan (T-11 ×4, T-12 ×1) · frontend 11 / 69: 69 pasan |
| `tsc --noEmit` de `backend/src` + `backend/test` | código 0 (tsconfig temporal fuera del repositorio) |
| Residuos y datos | 0 filas `@pruebas.local`; `usuarios` = 1 fila (el admin real, sin tocar). No escribí filas ajenas |
| Procesos | La API real la arrancan y detienen mis pruebas `api-real` y `logs-r2` (un PID, sin shell, puerto aleatorio). Al final solo quedan los `node.exe` ajenos 3884 y 12228; 3000 y 5173, libres |

## Estado de T-01 a T-10
| # | Estado | Evidencia |
|---|---|---|
| T-01 | **Resuelto** | `auth-login.ataque`: 20 concurrentes → 5 × 401 + 15 × 429; ráfaga de 19 incorrectas + la correcta → la vigésima 429. En verde en 5 corridas. Se suman los casos nuevos de `intentos-r2.ataque`, todos en verde |
| T-02 | **Resuelto** | `router.ataque` "entrar como otra cuenta…" en verde. `sesion-r2.ataque`: registrarse con la sesión de Ana abierta lleva a la cuenta nueva; si el `/me` nuevo falla, Ana no reaparece |
| T-03 | **Resuelto** | `auth-registro.ataque`: nombre con `\u0000` → `400 VALIDACION` |
| T-04 | **Resuelto para los casos reportados; se evade con otros caracteres** | U+200B, U+202E y controles → 400. Pero los caracteres de relleno Hangul y Braille siguen dando nombres invisibles: T-11 |
| T-05 | **Resuelto** | Sin `exp` o con vigencia de un año → 401. Tokens legítimos (50 firmas y 10 logins reales) → 200. `iat` hace 899 s → 200; hace 900 s → 401. `iat` futuro (2 s, 1 h) → 401. Claims con tipos raros → 401 |
| T-06 | **Resuelto** (amplía DEC-16; lo arbitra el Manager) | Los dos casos de la ronda 1 → no arrancan. Detalle de lo que acepta y rechaza, en `guarda-r2.ataque`. Hueco nuevo: T-12 |
| T-07 | **Resuelto** | Los 2 casos de `router.ataque` en verde. `sesion-r2.ataque`: salir y volver a entrar en la misma pestaña funciona con un solo `/refrescar`, y después sigue funcionando el refresco por token vencido |
| T-08 | **Resuelto** | Los 2 casos de `env.ataque` en verde |
| T-09 | **Resuelto** | Detalle en `api-real.ataque` y `logs-r2.ataque` (en "Atacado sin hallazgos") |
| T-10 | **Resuelto** | `sesiones-y-cadena.ataque`: una firma terminada en "A" pasa por `alterarFirma` y da 401 |

## Hallazgos nuevos

### T-11 — Nombres invisibles con caracteres de relleno (T-04 se evade)
Severidad: baja
Prueba: `backend/test/nombres-tokens-r2.ataque.test.ts`, 4 casos "rechaza un nombre hecho solo de … (sigue siendo invisible, T-04)"
Esperado / Obtenido: `POST /api/auth/registro` con `nombre` hecho solo de estos caracteres. Se esperaba `400 VALIDACION`; se obtuvo **`201`** en los cuatro casos:
- `"ㅤㅤㅤ"` (U+3164, relleno Hangul)
- `"ﾠﾠ"` (U+FFA0, relleno Hangul de ancho medio)
- `"ᅟᅠᅟ"` (U+115F y U+1160, rellenos choseong y jungseong)
- `"⠀⠀⠀"` (U+2800, patrón Braille en blanco)

Causa: se ven vacíos, pero Unicode los clasifica como letras (`\p{Lo}`) o como símbolo (`\p{So}`). Por eso `CARACTER_VISIBLE` (`/[\p{L}\p{N}\p{P}\p{S}]/gu`, en `shared/src/auth.ts`) los cuenta como visibles y `\p{Cc}\p{Cf}` no los detecta. Son los trucos habituales para "nombres invisibles". El formulario valida con el mismo esquema, así que tampoco los frena el cliente.
Requisito o regla violada: RF-02 ("nombre completo"), S-03, propósito de T-04.

### T-12 — La guarda de rutas solo inspecciona `preHandler`: un hook de ruta anterior puede responder sin pasar por la cadena
Severidad: baja
Prueba: `backend/test/guarda-r2.ataque.test.ts`, caso "un hook de ruta que responde antes de la cadena (onRequest) no debe poder saltarse protegido()"
Esperado / Obtenido: la ruta `GET /api/con-hook` se registra con `{ ...protegido(), onRequest: async (_req, reply) => reply.send({ datos: "privados" }) }`. Se esperaba que la app no arrancara; **arranca, y sin token responde `200` con los datos**. Fastify ejecuta los hooks de ruta `onRequest`, `preParsing` y `preValidation` antes que `preHandler`, y `registrarGuardaDeRutas` solo mira `ruta.preHandler`. Ninguna ruta actual está afectada. Es defensa en profundidad, en la misma línea que T-06; que el Manager lo arbitre junto con la ampliación de DEC-16.
Requisito o regla violada: AGENTS.md regla 2 ("Todo endpoint pasa por la cadena de middleware en su orden").

## Atacado sin hallazgos (ronda 2)

**`reservarIntento`** (`backend/test/intentos-r2.ataque.test.ts`)
- Con 3 fallos previos, una ráfaga de 10 verifica exactamente 2 contraseñas más; las otras 8 dan 429.
- Un 429 durante el bloqueo no alarga la ventana: a los 10 y 14 min sigue en 429; a los 15:01 del primer fallo entra con 200.
- Error de la base a mitad del login (doble parcial de `adapters/db` con `vi.mock`): responde 500 `ERROR_INTERNO` sin detalles, cuenta como intento y la llave se libera al vencer la ventana. No queda colgada.
- Si falla la creación de la sesión tras una contraseña correcta, la llave ya se borró y el siguiente intento entra.
- Un acierto dentro de una ráfaga: nunca más de 5 contraseñas verificadas, y el acierto borra la llave (DEC-06).
- La poda cada 500 escrituras, forzada con 510 llaves distintas, no borra las reservas vigentes de otra llave.

**Guarda ampliada** (`backend/test/guarda-r2.ataque.test.ts`)
- Arrancan: `protegido()` con cada opción (roles, `permitirRestringido`, `permitirCambioPendiente`, cada pertenencia y todas a la vez) en GET, POST, PUT, PATCH y DELETE; y las 5 rutas públicas de la lista sin `protegido()`.
- Una ruta con pertenencia responde 401 sin token, también por `HEAD`.
- No arrancan (con el mensaje propio de la guarda): 
  - `HEAD` o `ALL` explícitos sin `protegido()`;
  - `GET /api/auth/login` (pública solo como POST);
  - la cadena reordenada o con solo 4 pasos;
  - regex en el primer segmento (`/:seccion(^api$)`, `/:id(^\d+)`);
  - comodines `*` y `/ap*`;
  - `/ap:resto`;
  - el prefijo partido `/ap` + `i/z`;
  - un prefijo paramétrico.
- Con prefijos `//api` o `/API` la ruta no atiende `/api/*` (404): no hay bypass efectivo (ver "Observaciones").

**`nombreSchema` con nombres legítimos** (`backend/test/nombres-tokens-r2.ataque.test.ts`)
- Se aceptan los 16 probados:
  - José Ángel Núñez; María-José O'Connor; Ana María de la Luz Güémez; Ñoño Ibáñez;
  - Zoë Björk Guðmundsdóttir; Nguyễn Văn An; O’Brien D’Angelo (apóstrofo tipográfico); Mª Guadalupe; Juan Pablo II;
  - 山田 太郎; 王伟; 김민준; محمد علي; अनुष्का शर्मा;
  - acentos descompuestos (NFD), como los envía macOS;
  - espacio duro (U+00A0).
- Por HTTP, un nombre en NFD se guarda y `nombre_busqueda` queda "jose angel".
- **Emojis:** RF-02 pide "nombre completo" y no dice nada de emojis, así que no los exijo ni los reporto. Comportamiento observado: los simples se aceptan (😀, banderas, tonos de piel); los compuestos con U+200D se rechazan como "caracteres no permitidos".

**Tokens** (`backend/test/nombres-tokens-r2.ataque.test.ts`)
- Un token recién firmado nunca se rechaza: 100 verificaciones en segundos distintos y 10 tokens emitidos por logins reales, todos 200.
- Frontera de vigencia exacta: 899 s → 200; 900 s → 401.
- Se rechazan un `iat` futuro (2 s o 1 h) y `exp`/`iat` como texto, nulos o con `exp < iat`.
- Desfase de reloj: con una sola instancia, firma y verificación usan el mismo reloj; con `clockTolerance: 0`, un token con `iat` un segundo en el futuro se rechaza. El cliente se recupera solo con el refresco.

**Sesión en el frontend** (`frontend/src/app/sesion-r2.ataque.test.tsx`)
- Salir como Ana y entrar como Luis en la misma pestaña: dashboard y nombre de Luis, con un solo `/refrescar` en todo el recorrido.
- Tras salir y volver a entrar, un 401 por token vencido se recupera con `/refrescar` (la restauración cerrada no bloquea el refresco).
- Salir, fallar el login y abrir `/estudiante`: termina en `/login` sin pedir `/refrescar` ni mostrar datos de Ana.

**Logs** (`backend/test/logs-r2.ataque.test.ts`, API real con `LOG_LEVEL=trace`)
- "request completed" de un `GET /api/me` válido lleva el `userId` correcto.
- "Error no controlado" de un 500 dentro de una ruta autenticada también lo lleva. El 500 se provocó con un usuario propio cuyo uuid es válido para PostgreSQL pero no RFC para `z.uuid()`; con `gen_random_uuid()` no ocurre en producción.
- Ninguna línea lleva `userId` en un token falso, ni en `login` ni en `refrescar`.
- Los JWT no aparecen en el log.

## Observaciones (sin prueba en rojo; para el Manager o encargos siguientes)
- **Fail-closed:** un error del servidor a mitad del login cuenta como intento, así que 5 errores de base seguidos bloquean esa llave 15 minutos. Es defendible; conviene que el Manager lo confirme.
- **Acierto con reservas en vuelo:** un acierto borra también las reservas en vuelo de la misma llave (DEC-06). Solo beneficia a quien ya tiene la contraseña. Detrás de un NAT compartido (misma IP del colegio), el acierto de la víctima reinicia el contador del atacante sobre esa cuenta, igual que en la ronda 1.
- **Memoria del almacén de intentos:** no tiene tope. Guarda una llave por (IP, correo) durante 15 min, y la reserva ocurre antes de argon2, así que crece al ritmo de llegada de peticiones. La poda cada 500 escrituras solo quita llaves vencidas. Sin límite de tasa en `/auth/*` (S-14, encargo de despliegue) no hay techo.
- **Prefijos mal escritos:** con `//api` o `/API` la guarda no ve la ruta. Esa ruta no atiende `/api/*`, pero queda expuesta sin autenticación en su URL literal.
- **Exportación de `marcarPasoDeLaCadena`:** `guarda-de-rutas.ts` la exporta, y con ella cualquier función puede marcarse como paso de la cadena. Eludir la guarda así solo puede hacerse a propósito.
- **CORS futuro:** `@fastify/cors` registra `OPTIONS *`. Con la guarda nueva, `*` cuenta como ruta que atiende `/api`, así que el encargo de CORS tendrá que añadir esa ruta a `rutas-publicas.ts` (R-14).
- **`nombreSchema` más estricto:** ahora rechaza tabuladores y saltos de línea internos (antes se colapsaban) y también U+200C/U+200D, que aparecen en emojis compuestos y en algunos nombres (por ejemplo, persas). El usuario recibe un mensaje claro.
- **Caché tras T-02:** la corrección solo elimina la consulta `["me"]`. Cuando existan consultas por usuario (clases, calificaciones), cambiar de cuenta sin cerrar sesión podría mostrar datos en caché de la cuenta anterior; convendría vaciar toda la caché al cambiar de identidad.
- **Restauración tras T-07:** después de salir, la restauración queda cerrada hasta recargar. Si otra pestaña vuelve a iniciar sesión, esta la ignora y manda a `/login`. Aceptable.

## No atacado y por qué (ronda 2)
- **Pendientes de la ronda 1:** `reset:admin`, navegador real (`navigator.locks`, 360 px), `trustProxy` y `NODE_ENV` por omisión; siguen igual.
- **D-01** (dos copias de `fastify-plugin`): la decide el humano; no es un ataque.
- **Fuera de alcance de AUTH-01:** lo mismo que en la ronda 1.

## Conteo de pruebas de ataque
**13 archivos, 180 casos, 5 fallan.**
- Ronda 1: 8 archivos, 114 casos, 0 fallan.
- Ronda 2: 5 archivos nuevos, 66 casos, 5 fallan:
  - `backend/test/intentos-r2.ataque.test.ts` 6
  - `backend/test/guarda-r2.ataque.test.ts` 24 (1 falla)
  - `backend/test/nombres-tokens-r2.ataque.test.ts` 26 (4 fallan)
  - `backend/test/logs-r2.ataque.test.ts` 5
  - `frontend/src/app/sesion-r2.ataque.test.tsx` 5

---

# Reporte del Tester — AUTH-01 — Ronda 3
Veredicto: ROTO. Queda **un solo** hallazgo abierto, T-13, de severidad **baja** y sin impacto de seguridad: un residuo de T-11 que produce un nombre invisible con un símbolo musical. Todo lo demás resiste.
Verificación propia: lint ok (`npm run lint` desde la raíz, código 0) · test con un fallo esperado (`npm test` desde la raíz, 2 corridas, código 1). Solo falla el caso de T-13. Pasan las 180 de ataque de las rondas 1 y 2 y todas las del Programador.

Fecha: 2026-09-23. Leí "Ronda 3 — hallazgos del Tester" de `resumen-programador.md`, `shared/src/auth.ts` (`nombreSchema` / `contarVisibles`), `backend/src/middleware/guarda-de-rutas.ts` y `backend/src/middleware/README.md`.

## Verificación propia
| Qué | Resultado |
|---|---|
| Integridad de mis 13 archivos | **Intactos.** Los 8 de la ronda 1 conservan exactamente los SHA-256 que publiqué: `auth-login` b28792465e598a7f · `auth-registro` 7fbb3d4178842758 · `sesiones-y-cadena` 7b979360c3773e31 · `api-real` 1cd21770bdb4aad9 · `admin-unico` dfa214f4ec49a266 · `env` 4fce3cedf662ba3a · `apiClient` 10c730348d18ff8d · `router` e58293532633dc5c. De los 5 de la ronda 2 no había publicado hashes. Su fecha de modificación (10:49–10:54) es anterior a la primera edición del Programador en esta ronda (11:00:53), y su contenido conserva los casos y aserciones que entregué. Sus hashes, iguales al inicio y al final de esta ronda: `intentos-r2` a8b79d5ad98270be · `guarda-r2` ea078f41cc98c947 · `nombres-tokens-r2` 00a6eb6f7ccd7d87 · `logs-r2` ca78ab2aec774d2e · `sesion-r2` 06f35be8ae68f0ab. Archivo nuevo de esta ronda: `nombres-guarda-r3` 97b8d6f6c6b26b9b |
| Línea base antes de atacar | `npm run lint` 0 · `npm test` 0: backend 29 archivos / 282, frontend 11 / 69. Coincide con el Programador (351) |
| Repeticiones | `auth-login` + `intentos-r2` + `sesiones-y-cadena` (concurrencia, ventana y tiempo de login), 5 corridas: 52/52 en cada una |
| `npm test` final (raíz, 2 corridas) | backend 30 archivos / 326: 325 pasan, 1 falla (T-13) · frontend 11 / 69: todas pasan. Iguales en las dos corridas |
| `tsc --noEmit` de `backend/src` + `backend/test` | código 0 |
| Residuos y procesos | 0 filas `@pruebas.local`; `usuarios` = 1 (el admin real, sin tocar). Solo quedan los `node.exe` ajenos 3884 y 12228; 3000 y 5173, libres. Esta ronda no arrancó procesos de larga vida: mis archivos `api-real` y `logs-r2` arrancan y detienen la API real por su PID |

## Estado de T-01 a T-12
| # | Estado | Evidencia |
|---|---|---|
| T-01 a T-10 | **Resueltos, sin regresión** | Sus casos de las rondas 1 y 2 pasan en las 2 corridas de `npm test`, y los de concurrencia y tiempo en 5 corridas más |
| T-11 | **Resuelto para los caracteres reportados; queda un residuo (T-13)** | En verde los 4 casos de `nombres-tokens-r2` (U+3164, U+FFA0, U+115F/U+1160 y U+2800 → 400). `nombres-guarda-r3` añade: rellenos separados por espacios, espacio ideográfico, espacio duro o marcas combinantes; selectores de variante; CGJ; vocales inherentes jemer; una sola letra más un relleno; y mezclas con invisibles ya prohibidos (U+200B, U+202E). Todos se rechazan. Los 30 nombres legítimos de las rondas 2 y 3 se aceptan |
| T-12 | **Resuelto** | El caso de `guarda-r2` pasa (la ruta con `onRequest` que responde no arranca). En `nombres-guarda-r3`: `onRequest`, `preParsing` y `preValidation`, como función o como arreglo, o los tres a la vez, impiden el arranque con el mensaje `declara …, que se ejecuta antes de protegido() (AGENTS.md, regla 2)`. `onSend`, `onResponse` y `preSerialization` (función y arreglo), `onError`, `onTimeout` y `onRequestAbort` arrancan, y sin token siguen dando 401. Las rutas públicas con un hook propio siguen exentas, y la app real arranca con sus 6 rutas |

## Hallazgos nuevos

### T-13 — Un nombre hecho de U+1D159 (cabeza de nota nula) se acepta y se ve vacío (residuo de T-11)
Severidad: baja. Es solo de presentación: no expone datos ni salta la autorización, y el admin puede corregir el nombre.
Prueba: `backend/test/nombres-guarda-r3.ataque.test.ts`, caso "rechaza cabeza de nota nula U+1D159 (se ve vacía)"
Esperado / Obtenido: `nombreSchema.safeParse("\u{1D159}\u{1D159}\u{1D159}")` debería fallar; hoy devuelve **`success: true`**. `registroSchema` usa este mismo esquema, así que el registro respondería 201.
- U+1D159 MUSICAL SYMBOL NULL NOTEHEAD es un símbolo (`\p{So}`) cuyo glifo es vacío a propósito, igual que U+2800.
- No es `Default_Ignorable_Code_Point`, así que `CARACTER_QUE_SE_VE_VACIO` no lo cubre.
- Aparece en las mismas listas de "caracteres invisibles" que los rellenos Hangul y el Braille en blanco de T-11.
- Contradice lo que el Programador dejó como verificado ("No encontré otro caso que Unicode clasifique como letra o símbolo y no sea ignorable por defecto aparte del U+2800").
- Cómo se ve depende de la fuente: vacío donde existe el glifo (fuentes musicales o de símbolos) y un cuadro de "carácter no disponible" donde no existe.
Requisito o regla violada: RF-02 ("nombre completo"), en el mismo alcance que T-04 y T-11.
Nota para el humano: es el único hallazgo abierto de AUTH-01. Aceptarlo como limitación conocida de la validación de nombres es razonable. No lo califico como bloqueante.

## Evaluación del límite declarado por el Programador (hooks añadidos con `addHook` en un plugin)
- **El hueco existe.** Un sondeo en Fastify (no versionado) confirmó el orden de ejecución: `onRequest` del plugin > `onRequest` de la ruta > `preHandler` del plugin > `preHandler` de la ruta (aquí va la cadena de `protegido()`) > handler. Por eso un `addHook("onRequest", …)` en un plugin, o también un `addHook("preHandler", …)`, que responda corre **antes** que la cadena, y `onRoute` no lo ve.
- **Hoy no afecta a ninguna ruta de AUTH-01.** El único hook de plugin es el `onRequest` de `@fastify/cookie`, que solo interpreta cookies. `authHandler` y `usuariosHandler` no usan `addHook`.
- **Detectarlo en la guarda obligaría a leer el estado interno de Fastify.** Chocaría con usos legítimos: cookies, y los hooks que añadirán el límite de tasa y CORS en despliegue.
- **Veredicto: limitación aceptable, no la reporto como hallazgo.** Explotarla requiere que un desarrollador escriba a propósito un hook de plugin que responda, algo que la revisión de código cubre (regla 2).
- **Pendiente de documentación:** hoy el límite solo está en `resumen-programador.md`. `backend/src/middleware/README.md` describe los hooks de ruta, pero no menciona que los de plugin quedan fuera del alcance de la guarda. Conviene anotarlo ahí.

## Atacado sin hallazgos (ronda 3)
- **`nombreSchema`**
  - Nombres legítimos nuevos aceptados (14): Łukasz Żółć; Søren Ødegård; İlker Işık; Ōta Tarō; Ngũgĩ wa Thiong'o; Jean-Luc Picard; J. R. Martínez; griego, cirílico, hebreo, tailandés y georgiano; "Luis 2"; "Li Na".
  - Siguen aceptados los 16 de la ronda 2.
  - Se rechazan: rellenos combinados con espacios o con otros invisibles, y una letra real más un relleno ("aㅤ"), porque solo hay 1 carácter visible.
- **Guarda:** detalle en la fila de T-12. Además, `guarda-r2` sigue en verde: opciones de `protegido()`, rutas públicas, `HEAD`/`ALL`, regex, comodines, prefijos partidos o paramétricos, y cadenas reordenadas o incompletas.
- **Regresión de T-01 a T-10:** todas las pruebas de ataque de las rondas 1 y 2 están en verde.

## Observaciones (sin prueba en rojo)
- **`@fastify/rate-limit` (encargo de despliegue):** añade hooks `onRequest` a cada ruta a través de su propio `onRoute`. Con la guarda de T-12:
  - si el plugin se registra antes que `registrarMiddleware`, la API no arrancará con el límite global;
  - si se registra después, la guarda no verá esos hooks.
  - El plugin tiene la opción `hook: "preHandler"`, que coloca su hook detrás de la cadena.
  - Es una nota para ese encargo, del mismo tipo que `OPTIONS *` de CORS.
- **`errorHandler` propio de una ruta:** se ejecuta cuando la cadena lanza su 401 y podría convertirlo en otra respuesta. El handler no llega a correr, así que no expone sus datos. No lo reporto.
- **U+FFFC (carácter de reemplazo de objeto):** se acepta como visible; se ve como un recuadro, no vacío.

## No atacado y por qué (ronda 3)
- **Pendientes de las rondas anteriores:** `reset:admin`, navegador real, `trustProxy` y `NODE_ENV` por omisión. Siguen igual.
- **D-01:** la decide el humano.
- **Otros caracteres cuya apariencia depende de la fuente:** fuera de las listas conocidas de caracteres invisibles, no es verificable sin navegador.

## Conteo de pruebas de ataque
**14 archivos, 224 casos, 1 falla.**
- Ronda 1: 8 archivos, 114 casos, 0 fallan.
- Ronda 2: 5 archivos, 66 casos, 0 fallan.
- Ronda 3: `backend/test/nombres-guarda-r3.ataque.test.ts`, 44 casos, 1 falla (T-13).

---

# Reporte del Tester — AUTH-01 — Cierre (M-13)
Fecha: 2026-09-24. Alcance: solo M-13 ("# Revisión del Manager — AUTH-01 — final" en `revision.md`; punto 1 del humano al final de `aprobacion.md`). No ataqué nada nuevo. No toqué código de producción ni pruebas del Programador.

## Qué cambié
Solo el arnés de dos archivos: `backend/test/api-real.ataque.test.ts` y `backend/test/logs-r2.ataque.test.ts`.
- **Petición centinela:** después de la última petición real, cada archivo envía `GET /api/salud?centinela=<uuid>`.
- **Espera antes de detener la API** (hasta 20 s, sondeo cada 100 ms), hasta que el log tenga:
  - la línea `incoming request` del centinela y su `request completed` (mismo `requestId`);
  - un `request completed` por cada `incoming request` anterior.

  Pino escribe en orden, así que si ya está la última línea del centinela, está todo lo anterior.
- **Comprobación sobre el log final:** tras detener la API y esperar a `close` (pipe vaciado), se vuelve a evaluar la completitud sobre el log definitivo.
- **Precondición en cada caso que lee el log:** `exigirLogCompleto()`, que falla con el mensaje `Log de la API incompleto; no se puede afirmar nada sobre él: <qué falta>` en lugar de dar por buena una ausencia en un log truncado. Va en los 2 casos de `api-real` que leen el log y en los 5 de `logs-r2`.
- **Cálculo de `userId` en `api-real`:** `conUserId` ya no se calcula antes de detener la API, sino sobre el log final. Es la misma comprobación (`log.includes(sub)`), ahora con el log completo.
- **Ninguna aserción se debilitó ni cambió lo que prueba.** El diff contra la copia previa solo añade líneas; la única eliminada es el `conUserId = …` que se movió. Los casos siguen siendo 6 en `api-real` y 5 en `logs-r2`.
- **Pruebas de procesos que terminan solos** (arranque en `production` y `seed:admin`): no cambian. El proceso termina por sí mismo, sin `kill`, y la comprobación positiva de su última línea ("JWT_SECRET: en production", "Ya existe una cuenta de administrador", "ADMIN_PASSWORD") ya va antes de cada aserción de ausencia, junto con `codigo === 1`, que una terminación forzada no daría.

## Método de cierre y por qué
- **Cierre ordenado por señal: descartado, porque en Windows no existe.** Según la documentación de Node, `ChildProcess.kill()` termina el proceso "a la fuerza" en Windows con cualquier señal (SIGTERM, SIGINT, SIGQUIT o SIGKILL). Lo comprobé con un sondeo propio, no versionado, que arrancó la API por tsx dos veces:
  - `kill("SIGTERM")` → `exit {"code":null,"signal":"SIGTERM"}`, sin la línea "Deteniendo la API";
  - `kill("SIGINT")` → igual.

  El `detener` de `server.ts` nunca corre desde la prueba. Para que corriera habría que tocar código de producción, y eso estaba vetado.
- **Método elegido: centinela más completitud comprobada antes de detener.** No depende de la plataforma ni de `server.ts`. Tras la comprobación, la terminación forzada ya no puede perder líneas que la prueba necesite.
- **No hizo falta tocar código de producción**, así que no hubo condición de parada.

## Estabilidad
| Qué | Resultado |
|---|---|
| `api-real` + `logs-r2`, 10 corridas seguidas (`npx vitest run` con los dos archivos) | **10/10 en verde**, 11/11 casos en cada una. Ningún "Log de la API incompleto" |
| Suite completa del backend, 3 corridas (`npm test` en `backend/`) | 3/3 con **325 de 326**. Falla solo `nombres-guarda-r3` "rechaza cabeza de nota nula U+1D159" (T-13), como se esperaba; queda para el Programador |
| `npm run lint` en `backend/` | código 0 (ESLint, Prettier `--check` y `tsc`) |
| `tsc --noEmit` de `backend/src` + `backend/test` | código 0 |
| Residuos y procesos | 0 filas `@pruebas.local`; `usuarios` = 1 (el admin real, sin tocar). No queda ningún proceso mío; los hijos del sondeo terminaron solos (`exit`). Los `node.exe` vivos, 6760 y 15016, se crearon a las 07:42:25 de hoy y no son míos (sustituyen a 3884 y 12228, que ya no existen); no los toqué. 3000 y 5173, libres |

## SHA-256 de mis 14 archivos tras el cambio
Cambiaron solo `api-real` y `logs-r2`; los otros 12 conservan el hash publicado.

| Archivo | SHA-256 | ¿Cambió? |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `b28792465e598a7ffbd223f541e136dd7b7a86cafc6c478865f33656a0334a48` | no |
| `backend/test/auth-registro.ataque.test.ts` | `7fbb3d41788427586b62b026ad91bbf33ce338fb9bd4dbe7acd54be19d4d5710` | no |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `7b979360c3773e316a641a7521795ffe7f99d9e625dc18ab3992868cfb8db249` | no |
| `backend/test/api-real.ataque.test.ts` | `d9553a09f5a52fb27fdddf77c4d28e3d9d3af34797436a7b02bdb7c2eb08cc17` | **sí** (antes `1cd21770bdb4aad9…`) |
| `backend/test/admin-unico.ataque.test.ts` | `dfa214f4ec49a2662b0e6069b45bac162f9bb5f5f1ec5262511919c3b530f6c1` | no |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | no |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | no |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | no |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | no |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | no |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | no |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | **sí** (antes `ca78ab2aec774d2e…`) |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | no |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | no |

Conteo sin cambios: **14 archivos, 224 casos.** Hoy falla 1 (T-13), que el Programador tiene que corregir después de este cierre.
