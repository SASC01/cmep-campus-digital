# Revisión del Manager — AUTH-01: autenticación básica — plan

Veredicto: APROBADO
Verificación propia: lint — · test — · build — (modo plan: no hay código del encargo). Verifiqué por mi cuenta: (1) `npx prisma migrate diff --help` con el CLI instalado (7.10.0): `--to-schema-datamodel` y `--from-url` **ya no existen**; el par válido es `--from-config-datasource --to-schema`; (2) el SQL que Prisma 7.10.0 genera para `DateTime @updatedAt` sin `@default` (esquema mínimo en el scratchpad, `migrate diff --from-empty --to-schema --script`): `"actualizado_en" TIMESTAMPTZ(3) NOT NULL` **sin `DEFAULT`**; (3) lectura completa del código sobre el que se construye (`app.ts`, `config/`, `handlers/errores.ts`, `adapters/db/*`, `core/*`, `test/*`, `shared/src/*`, `frontend/src/{app,services,features/auth,components}`), del PRD (RF-01..05, RN-01..06), de ESSENTIALS y de `ARCHITECTURE.md` §6, §7, §14, §16, §17, §20.

Fecha: 2026-09-22. Carril **sensible**: correcto y confirmado. Primer encargo con el flujo completo.

**Condición de la aprobación:** las correcciones M-01, M-02 y M-03 se fijan por escrito en `aprobacion.md` antes de programar (son de una línea cada una y no cambian el diseño); las decisiones P-01..P-05 y las de "Para el humano" también quedan ahí. Sin eso el programador tendría que improvisar justo en las verificaciones que protegen la migración.

## Resumen en tres líneas

- El plan cubre RF-01, RF-02, RF-04c (cerrar sesión), RF-05 y la base de RN-06, respeta RN-01/02/03 en el modelo y en `GET /me`, y deja en AUTH-02 exactamente lo que el humano excluyó (RF-03, RF-04, RF-04a, RF-04b, RF-04d salvo la puerta `withPasswordGate`, `tokens_cuenta`, correo). Las reglas 1, 2, 3, 4, 9, 10, 11 y 13 están atendidas con decisiones explícitas y pruebas que las ejercitan. Es un plan sólido y ejecutable.
- Ningún problema de diseño bloquea. Sí hay **tres errores de hecho** que romperían V-07 y V-08 (las dos verificaciones que protegen el índice parcial hecho a mano) y una constante de seguridad que el plan nunca fija (la vigencia de 15 min del token de acceso). Se corrigen en `aprobacion.md`.
- Hay alcance de más que conviene recortar (marcador `/cambiar-contrasena`, cambio en `vite.config.ts`, `INSERT` manual de V-08, `estadoPago` dentro de `/me`) y una decisión de proceso que solo el humano puede tomar: las pruebas de integración escriben por primera vez en `campus_dev`, y DOCS-01 había propuesto que Testcontainers llegara "con el primer encargo con repositorios reales", que es este.

## Problemas que bloquean

Ninguno.

## Problemas que no bloquean

### M-01 — V-07 usa banderas que Prisma 7.10.0 ya eliminó (requerido en `aprobacion.md`)
Dónde: plan, V-07 y DEC-01 (`npx prisma migrate diff --from-config-datasource --to-schema-datamodel prisma/schema.prisma`; alternativa `--from-url "$DATABASE_URL"`).
Por qué importa: V-07 es la única prueba de que el índice único parcial de un solo admin no será tratado como deriva y borrado por la siguiente migración (R-02). Con el CLI instalado, `--to-schema-datamodel` responde "was removed. Please use `--[from/to]-schema`" y `--from-url` tampoco existe; el plan marcó `[verificar]` solo la primera bandera. Tal cual, la verificación falla y el programador improvisa en el punto más delicado de la migración.
Qué se espera: V-07 con `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` desde `backend/` y resultado esperado "No difference detected" con código de salida 0 (2 significaría que Prisma sí ve el índice y querría borrarlo: parada y reporte, como ya dice DEC-01). Anotar que el momento real en que esto mordería es el `migrate dev` del **siguiente** encargo con migración, así que la salida literal de V-07 debe ir en el resumen del programador. Mi valoración del riesgo: baja (la documentación de Prisma usa precisamente un índice parcial como ejemplo de "función no soportada" que se añade a mano con `--create-only`), pero la comprobación tiene que ejecutarse de verdad.

### M-02 — `actualizado_en` no tiene valor por defecto en la base: la `INSERT` manual de V-08 falla antes de llegar al índice (requerido en `aprobacion.md`)
Dónde: plan, "Contenido exacto" del esquema (`actualizadoEn DateTime @updatedAt`) y V-08 (`INSERT INTO usuarios (email, hash_contrasena, nombre, nombre_busqueda, rol) VALUES …`).
Por qué importa: Prisma solo rellena `@updatedAt` desde el cliente; en SQL la columna queda `NOT NULL` sin `DEFAULT` (verificado). La `INSERT` de V-08 omite `actualizado_en` y fallaría con "null value in column actualizado_en", no con la violación del índice parcial que V-08 quiere demostrar. El plan sí cuidó este detalle para `id` ("`gen_random_uuid()` para que también sirva desde SQL") y se le escapó aquí. Además, cualquier SQL de operación futuro tropezaría igual.
Qué se espera: `actualizadoEn DateTime @default(now()) @updatedAt @map("actualizado_en") @db.Timestamptz(3)` (el patrón habitual, simétrico con `creado_en`). Y, si se acepta M-04/M-05, retirar V-08 por completo: la prueba `admin-unico.integracion.test.ts` demuestra lo mismo por la vía de Prisma sin escrituras manuales en `campus_dev`.

### M-03 — La vigencia del token de acceso (15 min) no está fijada en ningún lugar del plan (requerido en `aprobacion.md`)
Dónde: plan, DEC-03 (`firmarTokenAcceso({ usuarioId, ahora? })`), S-05 (lista los claims `iat`, `exp`, `iss`, `aud` sin valor de `exp`), "Contenido exacto" y "Pruebas requeridas".
Por qué importa: ESSENTIALS manda "JWT de 15 min". El plan fija la sesión de refresco (`DURACION_SESION_MS`, +30 días, con prueba) pero nunca la del token de acceso: ni constante, ni lugar, ni prueba del límite. El programador la tomaría de ESSENTIALS, pero un parámetro de seguridad no se deja a la memoria de quien programa, y la prueba "token vencido" de `me.integracion` no demuestra cuánto dura uno recién firmado.
Qué se espera: constante explícita (por ejemplo `DURACION_TOKEN_ACCESO_S = 15 * 60` en `config/auth.ts` o junto a `DURACION_SESION_MS` en `core/auth/sesiones.ts`), usada por `firmarTokenAcceso`, y una prueba que verifique que un token firmado con `ahora = T` vale en `T + 14 min` y no en `T + 16 min` (con `ahora` inyectado, como ya prevé el plan).

### M-04 — Alcance de más: cuatro piezas que nadie pidió y que agrandan un diff sensible
Dónde: P-05 (`/cambiar-contrasena` como marcador), tabla "Archivos" (`frontend/vite.config.ts`), V-08 (`INSERT` por `psql`), P-02 (`estadoPago` dentro de `GET /me`).
Por qué importa: el humano pidió "pantalla mínima post-login con nombre y rol" y "`SIN_CONEXION` ante `ECONNREFUSED` del proxy". (a) El marcador `/cambiar-contrasena` es una pantalla que dice "llega en el siguiente encargo": ninguna acción de AUTH-01 puede activar `debe_cambiar_contrasena`, y FRONT-01 (DEC-06) fijó el criterio de no dejar esqueletos que solo existen para existir. (b) El cambio de `vite.config.ts` es redundante: la regla nueva de `apiClient` ("5xx sin JSON ⇒ `SIN_CONEXION`") ya cubre el 500 vacío que Vite devuelve hoy, así que el `configure` del proxy solo añade un `[verificar]` más. (c) La `INSERT` manual de V-08 es una escritura directa en `campus_dev` que la prueba de integración hace mejor (M-05). (d) `estadoPago` en `/me` mete el dato más sensible del proyecto en el endpoint más llamado (cada render de guarda) y cambia dos contratos documentados (`GET /me/estado-pago` en ESSENTIALS "Autorización" y §7); ver mi recomendación en P-02.
Qué se espera: distinguir en `aprobacion.md` lo mínimo de lo añadido. Mi recomendación: quitar (a), (b) y (c); (d) según P-02. Sí considero justificados, aunque no se pidieran por nombre, `services/tokenAcceso.ts` (rompe el ciclo `apiClient ⇄ authService`), `services/navegacion.ts` (hace comprobable la redirección), `navigator.locks` (sin gracia en P-04 es la única defensa real contra el cierre de sesión con dos pestañas; son pocas líneas y degrada a single-flight donde no exista), `handlers/validacion.ts` y las rutas nuevas de `redact` en el logger. El registro con sesión (P-01) es decisión de producto, no alcance de más.

### M-05 — Las pruebas de integración escriben por primera vez en `campus_dev`; `admin-unico` depende del estado de la base y puede dejar un administrador de prueba
Dónde: plan, "Pruebas requeridas" (precondición y `admin-unico.integracion.test.ts`), R-08, "No entra: Testcontainers".
Por qué importa: hasta hoy las pruebas de integración solo hacían `SELECT 1`. Ahora insertan usuarios y sesiones en la base de desarrollo del humano. El aislamiento por correos únicos y `afterAll` es razonable, pero `admin-unico` tiene dos ramas según exista o no un admin real, y en la rama "no existe" crea un **administrador real** en `campus_dev`; si la corrida se interrumpe entre el `insert` y el `delete`, `seed:admin` del humano fallará con "Ya existe una cuenta de administrador" hasta que alguien borre la fila a mano. Una prueba cuyo camino depende de la base no es determinista. Además, DOCS-01 (resumen, punto 1) dejó escrito que Testcontainers llegaría "con el primer encargo con repositorios reales": es este, y el plan lo excluye sin decirlo.
Qué se espera: (1) `admin-unico` dentro de una transacción de Prisma que **siempre** se revierte (insertar el primer admin si no hay, intentar el segundo, esperar el `AppError 409 ADMIN_YA_EXISTE` traducido por `adapters/db/errores.ts`, y lanzar para revertir): sin residuos, sin ramas, y funciona haya o no admin real. (2) Ninguna prueba ni verificación deja filas al terminar salvo interrupción; las que queden se distinguen por `@pruebas.local`. (3) Decisión explícita del humano sobre Testcontainers: mi recomendación es **no** meterlo en este encargo (ya es grande y sensible) y abrir un `chore/` inmediatamente después, dejando constancia en `aprobacion.md` de que se aparta de lo que DOCS-01 propuso.

### M-06 — `rotarSesion`: el plan no fija el orden de las dos escrituras ni la reversión cuando se pierde la carrera
Dónde: DEC-04 y firma `rotarSesion({ sesionId, nueva }) → { id } | null` ("transacción; `null` si la condicional no actualizó nada").
Por qué importa: si el programador inserta la sesión nueva y después ejecuta el `updateMany` condicional, un `count === 0` deja insertada una sesión viva cuyo token nadie recibió, salvo que lance para revertir. En la práctica el perdedor dispara `revocarTodasLasSesiones`, que también la revoca, pero la corrección no debe depender de ese efecto colateral. El plan tampoco dice con claridad qué recibe el ganador cuando el perdedor revoca todo: su token nuevo muere en el siguiente refresco (401 `SESION_INVALIDA`, motivo "revocada"). Es coherente con "siempre, sin gracia" (P-04) y con el punto de ataque "nunca dos tokens vivos", pero conviene escribirlo.
Qué se espera: orden fijo en la transacción: primero `updateMany where id AND revocada_en IS NULL set revocada_en, reemplazada_por = <uuid pregenerado>`; si `count === 0`, devolver `null` sin haber insertado nada; si `count === 1`, insertar la sesión nueva con ese mismo `id`. Y una frase en DEC-04 que describa el destino del ganador tras una carrera perdida por el otro.

### M-07 — El conteo de fallos para correos inexistentes o inactivos queda ambiguo, y de él depende que el 429 no revele si la cuenta existe
Dónde: "Flujo de las peticiones", paso 2: "si no existe o inactivo: `verificarContrasena(hashDeRelleno, contrasena)` y `401`; si existe: … fallo → `registrarFallo` + `401`".
Por qué importa: leído literal, `registrarFallo` solo se ejecuta en la rama del usuario existente. Entonces seis intentos contra un correo inexistente nunca darían 429 y seis contra uno existente sí: un oráculo de existencia, justo lo que DEC-06 y el punto de ataque "bloqueo de un correo inexistente responde 429 igual" quieren evitar.
Qué se espera: hacer explícito que **todo** `CREDENCIALES_INVALIDAS` cuenta, en las tres ramas (inexistente, inactivo, contraseña incorrecta), y que la prueba de `auth-login.integracion` incluya el caso "sexto intento contra un correo inexistente → 429".

### M-08 — Frontend: doble llamada a `/refrescar` y recarga completa al visitar una ruta protegida sin sesión; dos huecos de especificación
Dónde: DEC-12 (2) y DEC-13.
Por qué importa: al entrar a `/estudiante` sin cookie, `useMe` ejecuta `restaurarSesion()` (primer `/refrescar`, falla), luego `api("/api/me")` sin token recibe 401 y `api()` vuelve a llamar a `refrescarSesion()` (segundo `/refrescar`), falla y hace `irA("/login")` con `window.location.assign`: recarga completa para algo que `RequireSesion` iba a resolver con un `<Navigate>` suave. Funciona, pero es torpe y hace ruidosas las pruebas del router. Huecos: (a) el plan no dice dónde cuelga `/acceso-restringido` en el árbol de rutas: debe ir bajo `RequireSesion` y **fuera** de `RequireRol` (que redirige a los restringidos precisamente ahí); (b) `api()` exige `schema` y `logout` responde 204 con cuerpo `undefined`: hay que decir con qué esquema se valida (`z.undefined()`/`z.void()` en `shared/`) o permitir `api` sin esquema para 204.
Qué se espera: `api()` solo intenta el refresco ante 401 si había un token (vencido); `useMe` lanza `NO_AUTENTICADO` sin llamar a `/me` cuando `restaurarSesion()` falla y no hay token, y deja la navegación al router; `irA` queda para la pérdida de sesión en mitad del uso. Precisar (a) y (b) en el plan o en `aprobacion.md`.

### M-09 — Falta una guarda estructural que impida registrar una ruta de negocio sin `protegido()`
Dónde: DEC-08/DEC-09 y punto de ataque "ruta registrada sin `protegido` que use `perfilDe` → 500".
Por qué importa: `perfilDe` solo protege a los handlers que lo llaman; una ruta olvidada sin `protegido()` y sin `perfilDe` quedaría pública sin que ninguna prueba lo note. Este es el encargo que instala la cadena; es el momento más barato para que la regla 2 de `AGENTS.md` se haga cumplir por construcción para todos los encargos siguientes.
Qué se espera: un `onRoute` en `app.ts` (o en `middleware/index.ts`, registrado por `registrarDecoraciones`) que falle al arrancar si una ruta bajo `/api` cuyo prefijo no esté en la lista pública (`/api/auth/*`, `/api/salud`, en el futuro `/api/publico/*` y `/api/webhooks/*`) no lleva `authenticate` como primer `preHandler`, más una prueba que registre una ruta sin `protegido()` y espere el fallo. Unas quince líneas. Si el humano prefiere no ampliar el alcance, que quede anotado como pendiente prioritario del siguiente encargo de backend.

### M-10 — Contradicción no declarada (C-07): `nombre_busqueda` normalizado en `core/` frente a "`unaccent` + trigramas" de ESSENTIALS
Dónde: DEC-02 frente a ESSENTIALS "Reglas de datos" y §14 "Reglas de acceso a datos".
Por qué importa: la decisión es buena (`unaccent()` no es `IMMUTABLE`, y una función pura en `core/` se prueba sin base), pero cambia el cómo documentado: la búsqueda futura aplicará `normalizarParaBusqueda` al término en lugar de `unaccent()` en SQL, y mezclar ambas normalizaciones daría resultados distintos para caracteres que NFD no descompone (`ø`, `ß`, `ł`). El plan lista C-01..C-06 y omite esta.
Qué se espera: añadirla como C-07 y a la lista de documentos (ESSENTIALS y §14: "trigramas sobre `nombre_busqueda`, normalizado en `core/` con la misma función que se aplica al término"), para que el encargo del buscador (RF-38) no vuelva a `unaccent()` por leer la regla vieja.

### M-11 — Nada impide arrancar en `production` con el `JWT_SECRET` de `.env.example`
Dónde: tabla "Archivos", `backend/.env.example` (`JWT_SECRET=dev_jwt_secret_de_desarrollo_no_valido_para_prod_0123456789`) y `config/env.ts` (`min(32)`).
Por qué importa: el valor de ejemplo cumple `min(32)`; un despliegue que copie el ejemplo firmaría tokens con un secreto público del repositorio. Regla 9 y ESSENTIALS "Operación".
Qué se espera: `validarEnv` rechaza, cuando `NODE_ENV === "production"`, un `JWT_SECRET` igual al literal del ejemplo (mensaje sin el valor), con su prueba. Tres líneas; si se pospone, anotarlo para el encargo de despliegue.

## Detalles menores

- **JWT "solo `sub`" y S-05:** `iss`/`aud` son claims registrados sin datos de usuario; acepto la lectura de que ESSENTIALS prohíbe rol y banderas, no metadatos estándar. Que quede en la propuesta de docs para que nadie lo lea como desviación.
- **Sesión deslizante:** `calcularExpiracionSesion(ahora)` en cada rotación convierte los 30 días en una ventana que se renueva con el uso (quien refresca al menos una vez al mes nunca vuelve a iniciar sesión). Es habitual y aceptable para el piloto, pero el plan debe decirlo con esa palabra y el humano confirmarlo.
- **Crecimiento de `sesiones`:** cada refresco inserta una fila (15 min de vida del token ⇒ decenas por usuario y día). El plan no lo menciona. Pendiente para `LIMPIEZA_DIARIA`: purgar filas con `expira_en` pasado (revocadas o no; una reemplazada debe conservarse hasta su `expira_en` original para seguir detectando la reutilización), lo que pedirá un índice sobre `expira_en` en su momento. No cambia nada hoy.
- **`exactOptionalPropertyTypes`:** `meRespuestaSchema` con `.optional()` obliga a que `construirRespuestaMe` omita la clave con spread condicional y no asigne `undefined`; el plan ya lo describe ("no es `null`: no existe"), lo anoto para que la prueba `"estadoPago" in respuesta === false` sea la que fije el contrato.
- **`--exit-code` en `migrate diff`** (M-01) y `migrate status` deben añadirse a la lista "Autorizados de solo lectura" tal cual se van a ejecutar.
- **S-10 (`reset:admin` no activa `debe_cambiar_contrasena`):** correcto porque la contraseña la elige el humano; que la propuesta de texto de `AGENTS.md` lo diga.
- **`ADMIN_PASSWORD=cambia-esta-contrasena-dev` en `.env.example`:** en local crea un admin con contraseña conocida; aceptable en `dev`, y el comentario del ejemplo ya advierte que en `prod` se define en el servidor y se retira. Bien.
- **Conteo de `sesiones.test.ts`:** la tabla dice 6 casos y enumera 7. Cosmético; el programador reporta los exactos.
- **`middleware/README.md`:** el plan lo actualiza; que incluya la lista de rutas públicas (la misma de M-09 si se acepta) para que exista un solo lugar donde se declara la excepción.
- **`/login` con sesión ya iniciada:** no se redirige al dashboard. No lo pide ningún RF; lo dejo anotado como mejora, no como hueco.
- **V-14:** el tarro de cookies contiene un token de refresco real; el plan ya ordena borrarlo. Bien. `taskkill` solo sobre PIDs propios: bien, y coherente con la regla de procesos ajenos.
- **`api()` y `Retry-After`:** el frontend no lee la cabecera (muestra el texto fijo de 15 min). Suficiente para el piloto.
- **`clockTolerance: 0`** en `jose`: correcto para un solo servidor; si algún día hay dos réplicas con relojes distintos, se revisa. El plan ya lo documenta.

## Desacuerdos arbitrados

No aplica en modo plan. Anoto para el modo final: si el Tester sostiene que la carrera perdida en `rotarSesion` debería ser un 401 simple en vez de revocar todo, la respuesta está en P-04 (decisión del humano), no en el código.

## Documentos a actualizar

Las aplica el orquestador si el humano lo autoriza; ninguna la toca el programador.

- **`AGENTS.md` "Comandos":** las dos líneas de `seed:admin`/`reset:admin` con `ADMIN_*` (C-05, texto del plan; añadir "no activa el cambio obligatorio de contraseña" a `reset:admin`).
- **`CLAUDE.md` "Ubicaciones compartidas":** `services/tokenAcceso.ts` y `services/navegacion.ts` (si se aprueban), `components/layout/types.ts` reexporta `Rol` desde `shared/` (quitar "provisional"); fila `auth` de la tabla de módulos: "bienvenida post-login".
- **`ARCHITECTURE-ESSENTIALS.md`:** "Autenticación": cookie con `Path=/api/auth` (C-04) y nota de que "solo `sub`" excluye rol y banderas, no `iss`/`aud`; "Reglas de datos": búsqueda con trigramas sobre `nombre_busqueda` normalizado en `core/` (C-07, M-10); si P-02 = sí, "Autorización": `GET /me` incluye el estado de pago propio del estudiante.
- **`ARCHITECTURE.md`:** §6 salida de `withProfile` (C-02; con o sin `estadoPago` según P-02) y sesión deslizante; §7 `POST /auth/registro` responde con sesión si P-01 = sí; §14 `sesiones.reemplazada_por` sin FK (S-11) y purga futura de `sesiones`; §16 límite de `login` propio, `@fastify/rate-limit` para el límite global (C-01).
- **`README.md`:** lo hace el programador dentro del encargo (plan, tabla "Archivos"). El procedimiento de `seed:admin`/`reset:admin` es el primer contenido real para el futuro `docs/OPERACION.md` (§17).
- **Pendientes que este plan deja bien identificados** y que conviene copiar a `aprobacion.md`: AUTH-02 (recuperación, invitación, restablecimiento, cambio de contraseña, `tokens_cuenta`, pantalla real de cambio); `admin` (baja y restricción revocan sesiones); `pagos` (`GET /me/estado-pago`, `EstadoPagoBadge`); despliegue (`trustProxy`, CORS con credenciales, `@fastify/helmet`, límite global y de `/auth/*`, `Secure` real, `seed:admin` desde `dist/`, M-11 si se pospone); buscador (índice GIN en el esquema, C-06/C-07); `chore/` Testcontainers (M-05); `LIMPIEZA_DIARIA` (purga de `sesiones`); M-09 si no entra ahora.

## Para el humano

Decisiones que solo tú puedes tomar. Cada una con mi recomendación.

1. **P-01 — ¿`POST /auth/registro` inicia sesión?** Recomiendo **sí** (valor por defecto del plan): cumple "activa de inmediato" y el criterio de éxito de registrarse y entregar en menos de 5 minutos; no añade riesgo (quien se registra acaba de elegir su contraseña). Exige que `registro` reciba el mismo cuidado que `login` en cookie y sesión, que el plan ya prevé.
2. **P-02 — ¿`estadoPago` dentro de `GET /me`?** Recomiendo **no** (contrario al valor por defecto). Motivos: el estado de pago es el dato cuya filtración es el criterio de éxito número uno del piloto ("cero incidentes"), y `/me` es el endpoint que más se llama; ESSENTIALS y §7 ya reservan `GET /me/estado-pago` para eso (con la fecha del último cambio, que `/me` no incluiría); en AUTH-01 nadie puede quedar restringido, así que la pantalla de restringido sin estado de pago no perjudica a nadie hasta que exista `pagos`. `motivoRestriccion` sí se queda en `/me` (RN-03 lo pide y no es dato de pago). Con "no", `withProfile` no lee `estado_pago`, `core/auth/me.ts` se simplifica y C-02 desaparece.
3. **P-03 — Límite de intentos propio o `@fastify/rate-limit`.** Recomiendo **propio**, como el plan: la llave necesita el correo normalizado, contar aciertos bloquearía a usuarios legítimos, y evita una segunda copia de `fastify-plugin`. El plugin llega con el límite global en despliegue. Acepta de forma explícita que el almacén vive en memoria y se pierde al reiniciar (R-04): con una sola instancia no reduce la seguridad; cuando haya réplicas, pasa a PostgreSQL.
4. **P-04 — Reutilización de refresco: siempre revocar todo o gracia de 10 s.** Recomiendo **siempre, sin gracia** (ESSENTIALS literal), con `navigator.locks` + single-flight como mitigación. La gracia protegería contra un cierre de sesión molesto a costa de dejar vivo, durante 10 s, un token robado que compite con el legítimo. Si el piloto muestra cierres de sesión al abrir varias pestañas, se reabre con datos.
5. **P-05 — Pantallas para los dos 403.** Recomiendo **solo `/acceso-restringido` mínima** (texto de RN-03, motivo si lo hay, "Cerrar sesión"; estado de pago según P-02) y **sin** el marcador `/cambiar-contrasena`: AUTH-02 trae la pantalla real junto con `POST /auth/cambiar-contrasena`; mientras tanto `apiClient` no trata `CAMBIO_DE_CONTRASENA_REQUERIDO` (queda como comentario de punto de extensión, como hizo FRONT-01) y un usuario con la bandera, que hoy nadie puede crear, vería el mensaje genérico del servidor.
6. **Testcontainers (M-05):** decide si se aparta de lo propuesto en DOCS-01 ("con el primer encargo con repositorios reales"). Recomiendo aplazarlo a un `chore/` inmediato y exigir en este encargo pruebas sin residuos (`admin-unico` con reversión). Ten presente que, hasta entonces, `npm test` del backend inserta y borra filas en tu `campus_dev`.
7. **Guarda estructural de rutas (M-09):** ¿entra ahora o queda como pendiente prioritario? Recomiendo ahora.
8. **Antes de abrir a alumnos, no antes de este encargo:** sin el límite global de `/auth/*` (despliegue), `registro` y `login` cuestan un argon2id de 19 MiB cada uno y son un vector de saturación barato contra un Droplet pequeño. El plan lo delega correctamente; solo pido que el encargo de despliegue esté hecho antes de la apertura.
9. **Aceptaciones explícitas que conviene dejar por escrito:** sesión deslizante de 30 días; `iss`/`aud` en el JWT; `ip` y `agente` guardados por sesión (§14 ya los lista); `reset:admin` sin cambio obligatorio (S-10); parámetros argon2id iguales en pruebas y `prod` (S-06, con la duración de la suite reportada en V-11).
10. **Tamaño del diff:** unos sesenta archivos en tres paquetes, en carril sensible con revisión humana del diff. El orden de pasos del plan (shared → core → migración → adapters → middleware → handlers → pruebas → scripts → frontend) permite revisarlo por capas; te sugiero pedir al programador que el resumen enlace cada paso con sus archivos para que la revisión no sea lineal.

## Lista de modo plan, punto por punto

| # | Punto | Resultado |
|---|---|---|
| 1 | Cobertura RF-01, RF-02, RF-04c, RF-05, RN-06 y RN que toca; alcance de más | Cubre todo; RN-01/02/03 respetadas en modelo y `/me`; lo excluido va a AUTH-02 con precisión. Alcance de más en M-04 |
| 2 | Preguntas bloqueantes y suposiciones | P-01..P-05 son de verdad no bloqueantes (cada una tiene un valor por defecto que no rompe el diseño). Ninguna suposición debía ser pregunta; sí conviene la aceptación explícita del punto 9 de "Para el humano" |
| 3 | Consultas, índices, paginación, transacciones, carrera de rotación | Todas las consultas van por `email` único, `hash_token` único, PK o `(usuario_id)`/`(rol)`; no hay listas, ciclos ni SQL crudo; registro, rotación y `actualizarContrasenaYRevocarSesiones` en transacción. Carrera: correcta en concepto, sin orden fijado (M-06) |
| 4 | Migración | Solo `CREATE`, compatible hacia atrás y reversible; enums y columnas coinciden con §14; índice parcial con gate V-07 (M-01) y `actualizado_en` sin default (M-02); `nombre_busqueda` coherente si se documenta (M-10) |
| 5 | Endpoints, cadena, códigos, campos omitidos | Tabla completa y correcta; excepción pública justificada; `withAccess` exactamente `GET /me`; `withPasswordGate` deja un callejón razonable para AUTH-01 (nadie puede activar la bandera); `protegido()` con orden por construcción y prueba de orden; falta guarda para rutas sin `protegido()` (M-09) |
| 6 | Seguridad (regla 13 y ESSENTIALS) | argon2id, JWT en memoria, refresco hash + rotación + revocación, 5/15 min por IP+correo, mismo mensaje y tiempo (hash de relleno), cookie con atributos exactos y `Path=/api/auth`, `redact` y grep de logs, `hash_*` nunca en respuestas, `Secure` por entorno, `JWT_SECRET ≥ 32`, scripts mudos. Huecos: vigencia del token no fijada (M-03), conteo de fallos ambiguo (M-07), secreto de ejemplo en `prod` (M-11) |
| 7 | Frontend (`CLAUDE.md`) | Módulos, tipos desde `shared/`, hooks, un solo `fetch`, sin `localStorage`, retornos tempranos, una acción principal, textos es-MX, estado con icono y texto, single-flight y reintento único, `SIN_CONEXION` sin ocultar 5xx con JSON. Mejorables: doble refresco y recarga dura, ubicación de `/acceso-restringido`, esquema del 204 (M-08) |
| 8 | Carril y "Qué autoriza" | Sensible, correcto. Lista cerrada suficiente: una `--create-only`, una aplicación, `reset` prohibido, `npm install` solo la tabla, PIDs propios, formateadores acotados, `seed:admin` local sin leer `.env`. Añadir `migrate diff --exit-code`; retirar la escritura de V-08 si se acepta M-02/M-05 |
| 9 | Pasos y V-xx | Orden de `CLAUDE.md` respetado; pasos pequeños; V-xx y puntos de ataque concretos y ejecutables (`curl.exe -c/-b`, 429, reutilización, orden, fugas). V-07 y V-08 rotos tal cual (M-01, M-02) |
| 10 | Propuestas de documentos | Corrigen hechos, no son alcance de más; faltan C-07 y la sesión deslizante |
| 11 | Contradicciones C-01..C-06 | Reales, bien resueltas y bien encaminadas (encargo, AUTH-02 o DOCS). C-03 es más una aclaración que una contradicción. Falta C-07 (M-10) |

---

# Revisión del Manager — AUTH-01 — final
Veredicto: ESCALAR AL HUMANO
Verificación propia: lint ok (`npm run lint` desde la raíz, código 0: ESLint, Prettier y `tsc` en los tres workspaces) · test: backend 30 archivos / 326 pruebas, **325 pasan y 1 falla (T-13) en 3 de 4 corridas; en la primera corrida fallaron 2** (T-13 y `logs-r2`, intermitente); frontend 11 archivos / 69, todas pasan; `FSTDEP` 0 · build ok (`npm run build` desde la raíz, código 0; el aviso de chunk > 500 kB viene de FRONT-01) · Prisma: `validate` ok, `format --check` ok, `migrate status` "Database schema is up to date!", `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` "No difference detected" con **código 0**

Fecha: 2026-09-23. Carril sensible. Rondas del Tester: 3 de 3, agotadas. Sin commit.

## Por qué escalar y no aprobar

- **Rondas agotadas.** `AGENTS.md`: "Máximo 3 rondas; a la tercera se escala".
- **La suite no está en verde**, así que no se cumple la definición de terminado. Queda una prueba en rojo constante (T-13) y una intermitente que nadie reportó (M-13). Ninguna se puede cerrar sin una decisión:
  - el Programador no puede tocar pruebas `*.ataque.test.ts` ni abrir una cuarta ronda por su cuenta;
  - T-13 se corrige o se acepta como limitación;
  - D-01 lo decide el humano.
- **Lo que queda es poco y acotado.** El diseño, la implementación y la seguridad están para aprobarse (detalle abajo). Propongo un cierre corto en "Para el humano", punto 1. Si se cumple, lo apruebo sin otra revisión de fondo.

## Resumen en tres líneas

- **Se hizo lo planeado, solo lo planeado y todo lo planeado**, con la Enmienda 1 aplicada completa:
  - M-01 a M-11 implementados; P-02 sin `estadoPago` en ninguna respuesta; P-05 sin marcador `/cambiar-contrasena`; `vite.config.ts` sin cambios.
  - Las 18 desviaciones menores y las 7 de las rondas 2 y 3 están declaradas. Todas se aceptan (tabla abajo).
  - Rutas protegidas sin diff (`git diff --quiet` → 0). La migración está aplicada y Prisma no ve deriva en el índice parcial.
- **Lo que verifiqué yo mismo:**
  - Seguridad: reglas 1, 2, 3, 4, 9, 10 y 13 con grep y lectura del código.
  - Los 14 archivos de ataque con los hashes publicados.
  - La base: 0 filas `@pruebas.local`, 1 admin y 0 sesiones vivas.
  - Una prueba de humo desde `dist/` por PID propio.
  - El arranque en `production` con el secreto de ejemplo, que termina con código 1.
- **Para cerrar faltan tres cosas:**
  - T-13, que se corrige con una línea;
  - el arnés intermitente de `logs-r2`, que solo puede corregir el Tester;
  - D-01, que decide el humano.

## Problemas que bloquean (bloquean el cierre, no el diseño)

### M-12 — T-13 deja la suite en rojo con una prueba válida
Dónde: `shared/src/auth.ts` (`CARACTER_QUE_SE_VE_VACIO`, `/[\p{Default_Ignorable_Code_Point}\u2800]/u`); prueba en `backend/test/nombres-guarda-r3.ataque.test.ts:90-92`.
Por qué importa:
- La definición de terminado exige `test` en verde.
- `AGENTS.md` prohíbe dar por terminado con pruebas en rojo o desactivarlas.
- La prueba es correcta: aplica a U+1D159 (cabeza de nota nula, `\p{So}` con glifo vacío) el mismo criterio que el humano ya aceptó en T-11 para U+2800.

Qué se espera (mi recomendación):
- Que U+1D159 no cuente como carácter visible, igual que U+2800, sin prohibirlo. Es añadir `\u{1D159}` a la clase existente: el flag `u` ya está y `Array.from` separa bien los caracteres astrales.
- Que el comentario diga que la lista cubre los caracteres invisibles conocidos y que la cola larga, que depende de la fuente, queda como limitación aceptada: el admin corrige nombres.

Es más barato y más limpio que la alternativa. Si el humano prefiere aceptar la limitación, necesita dejar la decisión por escrito y que el **Tester** (nunca el Programador) retire ese caso. La suite no puede llegar al commit en rojo.

### M-13 — `logs-r2.ataque` falla de forma intermitente, y ningún agente lo reportó
Dónde:
- `backend/test/logs-r2.ataque.test.ts:141`: `hijo.kill()` justo después del último `fetch`. El caso que falla es "login y refrescar (sin JWT) no llevan userId" (línea 184, `expected 0 to be greater than 0`).
- `backend/test/api-real.ataque.test.ts:169` usa el mismo patrón.

Evidencia:
- Falló en 1 de mis 4 corridas completas del backend, y en 0 de 3 corridas del archivo solo.
- No apareció en las 3 corridas del Programador ni en las 2 del Tester.

Causa:
- El destino por defecto de pino es SonicBoom asíncrono (`node_modules/pino/lib/tools.js:366`), que solo vacía el búfer en una salida normal.
- En Windows, `hijo.kill()` termina el proceso a la fuerza, así que las últimas líneas pueden no llegar al padre.
- **No es un defecto de producción:** `server.ts` cierra la app ante `SIGTERM`, y pino vacía su búfer al salir.
- En `api-real`, un log truncado puede hacer pasar en falso las aserciones de ausencia ("ninguna contraseña en el log").

Qué se espera: que el Tester ajuste los dos arneses sin debilitar las aserciones. Dos formas: esperar a que el log contenga la línea "request completed" de la última petición antes de detener la API, o detenerla con una parada ordenada y esperar al cierre. Solo el Tester toca esos archivos.

## Problemas que no bloquean

### M-14 — `middleware/README.md` no documenta el límite de la guarda ni su dependencia del orden de los plugins
Dónde: `backend/src/middleware/README.md`, sección "Guarda `onRoute`".
Por qué importa:
- La guarda solo ve las opciones de la ruta **en el momento en que corre su `onRoute`**. Hay dos casos que no ve:
  - Los hooks de plugin añadidos con `addHook` (`onRequest`, `preParsing`, `preValidation` e incluso `preHandler`) corren antes de la cadena. El Tester lo confirmó y lo aceptó como limitación.
  - Los hooks que un plugin añade a cada ruta desde su propio `onRoute` (según el Tester, `@fastify/rate-limit`) dependen del orden de registro frente a `registrarMiddleware`: o la API no arranca, o la guarda no los ve.
- Quien escriba el encargo de despliegue o de CORS necesita saberlo antes de registrar esos plugins.

Qué se espera:
- Un párrafo en el README con el límite (hooks de plugin fuera del alcance de la guarda, cubiertos por la regla de revisión: ningún plugin de dominio responde desde hooks propios) y con la nota de orden para plugins transversales.
- A futuro, y barato: una regla ESLint `no-restricted-syntax` que prohíba `addHook` dentro de `backend/src/handlers/**`. Así el hueco se cerraría de forma estática.

### M-15 — La guarda solo cubre las rutas que pueden atender `/api/*`
Dónde: `backend/src/middleware/guarda-de-rutas.ts`, `puedeAtenderApi`.
Por qué importa: una ruta registrada fuera de `/api` (`/API/x`, `//api/x`, `/interno`) queda pública sin que la guarda lo note, y en `prod` la API atiende todo `api.<dominio>`. Hoy no hay ninguna en el código de producción; solo las pruebas registran `/prueba/*`. Esto cumple la letra de DEC-16 ("bajo `/api`").
Qué se espera: en un encargo posterior, invertir el criterio. La guarda aplicaría a toda ruta salvo la lista pública, y las rutas de prueba pasarían a `/api/prueba/*` con `protegido()`. No es para esta ronda.

### M-16 — Incidencia de proceso: D-01 (instaló pese a una parada del plan)
Dónde: plan, tabla "Dependencias" ("**[verificar]** par `fastify-plugin ^5`… si exigiera `^6`, reportar antes de instalar"); resumen, V-02.
Por qué importa: V-02 ya mostraba `fastify-plugin ^6.0.0` y el Programador instaló de todos modos. Lo reportó de inmediato y sin rodeos. Es la segunda incidencia de proceso del proyecto; la primera fue terminar un proceso ajeno en BACK-02. El efecto real es nulo (ver D-01 abajo), pero la parada existía justo para que el humano decidiera antes.
Qué se espera: sin cambio de código. Para los próximos planes, que el Arquitecto escriba las condiciones de parada como una lista "PARADAS" dentro de "Qué autoriza", y que el resumen del Programador responda cada una con "no se activó" o "se activó y me detuve".

### M-17 — README §7 con conteos que ya cambiaron
Dónde: `README.md`, "Backend en local" §7: "29 archivos con 282 pruebas… 148 adversarias". Hoy son 30 archivos / 326 pruebas / 192 adversarias; el frontend sigue en 11 / 69.
Qué se espera: quitar las cifras exactas (cambian en cada encargo) o actualizarlas en la mini-ronda de cierre.

## Desacuerdos arbitrados

- **T-06 y T-12: se acepta la ampliación de DEC-16 (R2-D1, R3-D1).**
  - Por qué: exigir los cinco pasos de `protegido()` por identidad y en orden, vigilar las rutas con primer segmento paramétrico o comodín, y rechazar hooks de ruta anteriores a `preHandler` son un superconjunto estricto de DEC-16. Cumplen mejor la regla 2 y DEC-08 ("ningún handler compone la cadena a mano").
  - No cambia ninguna ruta válida: las 6 de AUTH-01 arrancan. Falla al arrancar, no en una petición, y está probado a favor y en contra: `guarda-r2` 24 casos, `nombres-guarda-r3` y `middleware-orden`.
  - Costo aceptado: el encargo de CORS tendrá que añadir `OPTIONS *` a `rutas-publicas.ts` (R-14 ya lo preveía), y los plugins transversales tendrán que respetar el orden de M-14.
- **Límite de `addHook` en plugins: aceptado como limitación**, con dos condiciones: que conste en `middleware/README.md` (M-14) y que quede la regla de revisión. No es un hueco explotable sin que un desarrollador escriba a propósito un hook que responda.
- **T-13: corregir** (M-12), no aceptar. La prueba es correcta, la corrección es de una línea, y dejarla en rojo o retirarla sería peor.
- **D-01 (dos copias de `fastify-plugin`): recomiendo (a), aceptar las dos copias, y abrir un `chore` para alinear el backend con `fastify-plugin ^6`.**
  - Comprobé que el código principal de las dos copias es **idéntico**: `diff` entre `fastify-plugin@5.1.0/plugin.js` y `6.0.0/index.js` → sin diferencias. El cambio de mayor es de empaquetado.
  - El único uso directo del backend es `fp` en `handlers/errores.ts`.
  - Según el plan (P-03), `@fastify/rate-limit ^11.2`, que llegará con despliegue, ya depende de `^6`; `helmet` y `cors` probablemente también (a verificar en ese encargo).
  - Fijar `@fastify/cookie@11.0.2`, la opción (b), deduplica hoy, pero va contra esa dirección y habría que deshacerlo en despliegue.
  - (b) es aceptable si el humano quiere una sola copia antes del commit, a costa de otro `npm install` y otra corrida completa.
- **Desviaciones del Programador:** se aceptan todas.

| # | Decisión | Nota |
|---|---|---|
| D-02 `adapters/auth/estado.ts` | Aceptada | Evita un ciclo dentro de `adapters/auth`; no añade capacidades |
| D-03 `enTransaccion` | Aceptada | Hace posible el `ejecutor` de DEC-10 |
| D-04 P2002 del driver adapter | Aceptada | Corrige un defecto real (duplicado → `ADMIN_YA_EXISTE`); va a DOCS-02 |
| D-05 navegar antes de `clear()` | Aceptada | T-07 lo validó |
| D-06 `/acceso-restringido` redirige al no restringido | Aceptada | El Tester lo atacó sin hallazgo |
| D-07 piezas auxiliares | Aceptada | Respetan la estructura de módulos (tipos en `types.ts`, constantes en `data.ts`, puras en `lib.ts`) |
| D-08 `login-view.tsx` sin cambios | Aceptada | — |
| D-09 pruebas propias ajustadas | Aceptada | Son del Programador (R-11) |
| D-10 guarda solo por identidad | Aceptada | La supera R2-D1 |
| D-11, D-12, D-13 | Aceptadas | V-22 parcial, declarado |
| D-14 `DELETE … @pruebas.local` en el README | Aceptada | Es un comando destructivo en la documentación, acotado a filas de prueba y precedido del `SELECT`; que el humano lo lea |
| D-15, D-16 | Aceptadas | Coherencia e idempotencia |
| D-17 `Start-Process` con tubería | Aceptada | Solo terminó procesos propios; motiva una regla (ver "Documentos") |
| D-18 carpeta vacía | Aceptada | Derivada del borrado autorizado |
| R2-D2 `reservarIntento` | Aceptada | Puro, en `core/`, probado; corrige T-01 |
| R2-D3 mensajes nuevos | Aceptada | es-MX, concretos |
| R2-D4 `removeQueries(["me"])` | Aceptada | Ver la nota de caché en "Documentos" |
| R2-D5 restauración cerrada tras `logout` | Aceptada | El Tester la evaluó aceptable |
| R3-D2 ignorables no prohibidos, solo no contados | Aceptada | — |

- **Observaciones del Tester sin prueba en rojo:**
  - *Fail-closed* ante errores de la base: correcto, es lo más seguro y la llave se libera al vencer la ventana.
  - Un acierto borra las reservas en vuelo: es la regla de DEC-06.
  - La memoria del almacén de intentos no tiene tope: va a despliegue.
  - `marcarPasoDeLaCadena` exportada: la necesita `index.ts`, `middleware/index.ts` no la reexporta, y eludir la guarda así solo se hace a propósito. Aceptado.
  - La "manipulación propia" del Tester en `auth-login.ataque` (cambió una línea y la restauró) está declarada y el hash no cambió. Sin objeción.

## Integridad de las pruebas del Tester

Los 14 archivos `*.ataque.test.ts(x)` coinciden con los SHA-256 publicados en `reporte-tester.md`:
- los 8 de la ronda 1;
- los 5 de la ronda 2, publicados en la ronda 3;
- `nombres-guarda-r3` `97b8d6f6c6b26b9b`.

Ningún `.skip`, `.todo`, `.fails`, `.only`, `skipIf`/`runIf`, `xit` ni `xdescribe`. El Programador no los modificó.

## Definición de terminado (`AGENTS.md`)

- [x] **RF-01:** login de los tres roles. El admin real entra (V-13, V-20) y el Tester usó su JWT para la rama positiva de `requireRole`.
- [x] **RF-02:** registro público solo de estudiantes, activo de inmediato y con sesión (P-01). Probado contra asignación masiva.
- [x] **RF-04c**, parte de "cerrar sesión": logout idempotente con la cookie limpia. La baja y la restricción que revocan sesiones llegan con `admin`; `revocarTodasLasSesiones` ya existe.
- [x] **RF-05:** `rutaTrasLogin` lleva a cada rol a su dashboard (bienvenida provisional) y al restringido a su pantalla.
- [x] **RN-06:** base; `requireMembership`/`requireOwnership` responden 501.
- [x] **RN-01/02/03:** en el modelo y en `/me`.
- [x] Capas y middleware (sección siguiente).
- [ ] **`lint`, `build` y `test` en verde:** lint y build sí; test no (M-12, M-13).
- [x] Pruebas de autorización por endpoint:
  - rol incorrecto (`middleware-orden`);
  - restringido (`me.integracion`, `middleware-orden`);
  - `debeCambiarContrasena` (403);
  - sin fuga de `estadoPago` ni hashes (`me.integracion`, `sesiones-y-cadena.ataque`).
  - "Clase ajena" no aplica todavía.
- [x] Migración compatible hacia atrás: solo `CREATE`, sin deriva, `actualizado_en` con `DEFAULT`.
- [x] `infra/` sin cambios; `backend/.env.example` con `JWT_SECRET` y `ADMIN_*`, valores ficticios y comentarios.
- [ ] **Documentos:** README hecho (conteos, M-17); `AGENTS.md`, `CLAUDE.md` y DOCS-02 pendientes del orquestador (abajo).

## Reglas que no se rompen (verificado)

| Regla | Resultado |
|---|---|
| 1. Capas | `argon2`, `jose`, Prisma, `pg` y el cliente generado solo en `adapters/`; `obtenerDb` solo en `adapters/db` (en `src/`); ESLint lo vigila |
| 2. Middleware | Cadena en orden por construcción; la guarda impide arrancar sin ella; ninguna verificación de rol ni de perfil en `handlers/` |
| 3. Estado de pago | Ninguna respuesta lo contiene; `withProfile` no lo lee; aparece solo en comentarios y en aserciones de ausencia |
| 4. Consultas | Todas por `email` único, `hash_token` único, PK, `(usuario_id)` o `(rol)`; sin listas, sin ciclos con consultas, sin SQL crudo nuevo; registro, rotación y `reset:admin` en transacción; la rotación sigue el orden de M-06 |
| 5, 6, 8, 12 | No aplican: sin eventos, archivos, trabajos diferidos ni avisos |
| 7. UTC | `timestamptz(3)` e ISO en la API |
| 9. Secretos | `.env.example` ficticio. `production` rechaza el secreto de ejemplo y sus variantes con espacios (lo comprobé: código 1, mensaje sin el valor). `.env` no leído ni versionado |
| 10. Esquema | Solo la migración `20260923143021_usuarios_y_sesiones`; la inicial, intacta |
| 11. Proveedores | Solo `argon2`, `jose` y `@fastify/cookie` más sus transitivas (10 paquetes en el lock); ninguna de AWS ni de otro proveedor |
| 13. Autenticación | argon2id m=19456/t=2/p=1. Refresco solo como SHA-256. Rotación, y reutilización ⇒ revocar todas. Mismo código, mensaje y costo (hash de relleno) en las tres ramas del login. 429 antes de la base. JWT de 15 min con `exp`/`iat` exigidos. Token solo en memoria (`tokenAcceso.ts`). Cookie `HttpOnly; SameSite=Strict; Path=/api/auth`, `Secure` en `production`. `redact` ampliado. Ni contraseñas ni tokens en el log (humo: 0 coincidencias) |

**Prueba de humo** (API desde `dist/`, PID propio 6672, detenida con su árbol; puerto 3000 libre al terminar). Solo usé rutas que no escriben en la base, para no dejar filas:
- `/api/salud` → 200.
- `GET /api/me` y `HEAD /api/me` sin token → 401 `NO_AUTENTICADO`.
- `refrescar` sin cookie y con cookie basura → 401 `SESION_INVALIDA`, con `Set-Cookie: campus_refresco=; Max-Age=0; Path=/api/auth; Expires=…1970…; HttpOnly; SameSite=Strict`.
- `logout` sin cookie → 204 con la misma limpieza.
- Registro con contraseña de 9 caracteres → 400 `VALIDACION`, sin eco del valor.
- 6 logins contra un correo inexistente → 5 × 401 y 429 con `retry-after: 900`.
- Log: 31 líneas, 0 coincidencias de contraseñas, JWT, cookies o `argon2`.
- `NODE_ENV=production` con el `.env` local → código 1 y el mensaje de DEC-17.

Las rutas con escritura (registro, rotación y reutilización con sus atributos de cookie) las cubren las pruebas de integración y de ataque que ejecuté y la V-14 del Programador.

## Estilo (`CLAUDE.md`) y lista de diseño

- **Backend:**
  - Retornos tempranos en todo el código nuevo.
  - `AppError` tipado desde `core/` y `adapters/`. Los handlers no tienen `try/catch`; el único del código de la API está en `adapters/db/usuarios.crearUsuario`, que traduce Prisma, como pide `CLAUDE.md`. Los scripts CLI tienen el suyo.
  - Sin `any`.
  - Los `?? []` del backend (`intentos.get(llave)`, `opciones.roles`) no ocultan datos: una llave ausente significa "sin fallos".
- **Frontend:**
  - Tipos solo en `types.ts` o inferidos de `shared/`, con `Rol` desde `shared/`. Hooks en `hooks.ts`. Constantes en `data.ts`. Puras en `lib.ts`.
  - `fetch(` solo en `apiClient.ts`. `localStorage`/`sessionStorage` solo en un comentario.
  - Sin `?? []` ni ternarios anidados.
  - Sin valores por defecto para `rol` ni `accesoRestringido`: las guardas y las vistas siguen el orden error → cargando → datos.
  - `throw` solo dentro de TanStack Query; `logout` nunca rechaza.
- **Diseño:**
  - Solo tokens (grep sin colores, radios, sombras ni valores sueltos; `text-danger` y `text-destructive` vienen de `tokens.css`).
  - `Button`, `Input` y `Card` de `ui/`.
  - Una acción principal por vista: "Iniciar sesión" y "Crear cuenta"; "Cerrar sesión" va en `outline`.
  - El estado nunca solo con color: `MensajeError` con icono y texto; el restringido con los iconos `Ban`/`CircleAlert` más texto.
  - `label htmlFor`, `aria-invalid` y `aria-describedby`; foco visible global (`*:focus-visible` en `index.css`).
  - `flex-wrap` en el encabezado para 360 px.
  - Textos es-MX, tuteo, sin palabras prohibidas ni emojis.
  - Sin degradados, glassmorphism ni `dark:`.
  - **Lo visual (360 px real, contraste, foco en el navegador) queda para el humano.**

## Detalles menores

- Dos JWT firmados en el mismo segundo para el mismo `sub` son idénticos, porque no hay `jti`. Está aceptado: la cookie sí cambia.
- `describirError` de los scripts desestructura `error as {…}`. Si algún día se lanzara `null`, fallaría dentro del `catch` y el proceso terminaría con traza. Improbable, ya que Prisma siempre lanza `Error`, y la traza no contendría la contraseña.
- `login-view.tsx` y `registro-view.tsx` repiten la misma clase de rejilla. Cuando haya una tercera pantalla pública, conviene extraer un contenedor en `components/layout/`.
- "Tu dashboard estará disponible pronto." es un anglicismo aceptable: el PRD llama así a la vista.
- El enlace "¿Olvidaste tu contraseña?" lleva a `/recuperar`, que todavía no existe (cae en `*` → `/login`). Viene de FRONT-01 y lo resuelve AUTH-02.
- `nombreSchema` ahora rechaza U+200C y U+200D, que aparecen en emojis compuestos y en algunos nombres persas. Para el colegio es irrelevante, pero es una consecuencia de producto (ver "Para el humano").
- No verificado por nadie, y declarado:
  - `reset:admin` sin admin → código 1;
  - `navigator.locks` con dos pestañas reales;
  - que `migrate dev` aplique en transacción (R-10);
  - `seed:admin` desde `dist/`.

## Documentos a actualizar

**Los aplica ahora el orquestador, con la autorización del humano:**
- `AGENTS.md` "Comandos": las dos líneas propuestas por el plan (C-05) para `seed:admin` y `reset:admin`, con `ADMIN_*`; `reset:admin` no activa el cambio obligatorio y nunca imprime la contraseña. Además, `npm run reset:admin` aparece hoy dentro del bloque "Servicios locales (desde /infra)": va en el bloque del backend.
- `CLAUDE.md` "Ubicaciones compartidas":
  - `services/tokenAcceso.ts` (token en memoria; `authService` lo reexporta);
  - `services/navegacion.ts` (`irA` y `rutaActual`, único punto de redirección fuera del router);
  - quitar "provisional" del tipo `Rol` de `components/layout/types.ts`, que ya reexporta `shared/`.

  En la tabla de módulos, fila `auth`: "bienvenida post-login (provisional hasta los dashboards)".
- **Regla de proceso nueva:** en Windows, no combinar `Start-Process` (ni ningún arranque de proceso de larga vida) con una tubería; redirigir a archivo y guardar el PID (D-17). Propongo ponerla en `AGENTS.md` "Reglas del equipo", junto a la de procesos ajenos.

**En la mini-ronda de cierre** (Programador, junto al código que describen): `middleware/README.md` (M-14); README §7 (M-17); el comentario de `shared/src/auth.ts` (M-12).

**DOCS-02:**
- ESSENTIALS "Autenticación":
  - `Path=/api/auth` (C-04);
  - "solo `sub`" excluye rol y banderas, no `iss`/`aud`;
  - sesión deslizante de 30 días.
- ESSENTIALS "Reglas de datos" y §14:
  - C-07 (`nombre_busqueda` normalizado en `core/`, trigramas sobre esa columna, `unaccent` solo como apoyo);
  - `sesiones.reemplazada_por` sin FK;
  - `actualizado_en` con `DEFAULT now()`;
  - purga futura de `sesiones`.
- §6 "Cadena de middleware":
  - `protegido()` y la guarda `onRoute`, con la ampliación de DEC-16 y su límite (M-14);
  - `userId` en los logs desde `authenticate` (T-09).
- §7: `POST /auth/registro` responde con sesión (P-01).
- §14 "Reglas de acceso a datos" o `adapters/README.md`: con el driver adapter de Prisma 7, el P2002 trae el índice en `meta.driverAdapterError.cause.constraint` y no en `meta.target`, y un texto con nulo llega como P2039 con `originalCode 22021`.
- §16: límite de `login` propio; `@fastify/rate-limit` para el límite global y el de `/auth/*` (C-01), con la nota de orden frente a la guarda.

**Encargos siguientes:**
- **Despliegue, antes de abrir a alumnos:**
  - `trustProxy`: sin él, la llave de intentos es la IP de Caddy más el correo, y cualquiera puede bloquear 15 minutos el login de cualquier cuenta con 5 fallos.
  - `NODE_ENV=production` obligatorio en el compose: por omisión vale `development` y se apagan `Secure` y la guarda de DEC-17.
  - Límite de tasa global y en `/auth/*` (S-14) y tope de memoria del almacén de intentos.
  - CORS con credenciales y `OPTIONS *` en `rutas-publicas.ts`.
  - Orden de los plugins transversales frente a `registrarMiddleware`.
  - `@fastify/helmet`.
  - `seed:admin` desde `dist/`.
- **`chore` Testcontainers** justo después, ya acordado.
- **`chore` `fastify-plugin ^6`** en el backend (D-01), si se elige (a).
- **AUTH-02.**
- **`pagos`:** `GET /me/estado-pago`, `estadoPagoSchema`, `EstadoPagoBadge`.
- **`admin`:** baja y restricción revocan sesiones.
- **`clases`:**
  - `requireMembership`/`requireOwnership` reales;
  - al cambiar de identidad, vaciar toda la caché de TanStack Query (no solo `["me"]`) en cuanto existan consultas por usuario (observación del Tester).
- **`LIMPIEZA_DIARIA`:** purga de `sesiones`.
- **Guarda sobre todas las rutas** (M-15), y **ESLint contra `addHook` en `handlers/`** (M-14).

## Para el humano

1. **Cierre propuesto** (necesita tu autorización, porque las rondas se agotaron):
   - (a) Una mini-ronda del **Programador**, solo con tres cambios: la línea de T-13 y su comentario (M-12), el párrafo de `middleware/README.md` (M-14) y los conteos del README (M-17).
   - (b) El **Tester** corrige el arnés de `logs-r2` y `api-real` (M-13), sin debilitar las aserciones y sin nueva ronda de ataque.
   - (c) Yo repito `lint`, `build` y `test` (3 corridas completas) y los hashes. Si todo sale en verde, apruebo sin otra revisión de fondo.

   Alternativa para T-13: aceptarlo por escrito como limitación, y que el Tester retire ese caso.
2. **D-01:** recomiendo (a), aceptar las dos copias de `fastify-plugin` (código idéntico, funciona y está probado), más un `chore` que suba el backend a `^6` cuando llegue despliegue. (b), fijar `@fastify/cookie@11.0.2`, también es válida si quieres una sola copia ya.
3. **DEC-16 ampliada:** la acepté (arbitraje arriba). Te lo informo porque endurece una decisión que aprobaste y condiciona el orden de los plugins de despliegue.
4. **Testcontainers:** el `chore` acordado va inmediatamente después. Hasta entonces, `npm test` escribe y borra filas `@pruebas.local` en tu `campus_dev` (hoy queda en 0).
5. **Commit:** rama `feat/auth-01-autenticacion-basica`, tras tu revisión del diff (carril sensible). Son 105 entradas: 30 archivos modificados, 1 borrado y 74 nuevos, 5 de ellos en `docs/trabajo/`. Orden de revisión sugerido, por capas:
   1. `shared/src/auth.ts`, `index.ts`.
   2. `backend/prisma/schema.prisma` y `migrations/20260923143021_usuarios_y_sesiones/migration.sql`.
   3. `backend/src/core/auth/*` (con sus pruebas).
   4. `backend/src/config/{env,auth,logger}.ts` y `backend/.env.example`.
   5. `backend/src/adapters/auth/*` y `adapters/db/{cliente,errores,usuarios,sesiones,index}.ts`.
   6. `backend/src/middleware/*`, con **`guarda-de-rutas.ts`** e `index.ts`, y su README.
   7. `backend/src/handlers/{validacion,usuarios}.ts`, **`handlers/auth/index.ts`** (reserva de intentos, refresco y rotación), `cookie.ts` y `app.ts`.
   8. `backend/src/scripts/*`, `backend/package.json`, `package-lock.json` (10 paquetes) y `eslint.config.mjs`.
   9. `backend/test/ayudas-auth.ts` y las pruebas `*.integracion`.
   10. Frontend: **`services/apiClient.ts`**, `authService.ts`, `tokenAcceso.ts` y `navegacion.ts` → `app/*` → `components/layout/*` → `features/auth/*`.
   11. Las `*.ataque.test.*`: basta con leer los títulos.
   12. `README.md` y `docs/trabajo/AUTH-01-autenticacion-basica/`.

   Donde más vale la pena detenerse: `guarda-de-rutas.ts`, `handlers/auth/index.ts`, `adapters/db/sesiones.ts` (`rotarSesion`), `adapters/auth/tokens.ts`, `config/env.ts` (`superRefine`) y `services/apiClient.ts`.
6. **Admin real en `campus_dev`:** existe `admin@campus.local`, creado por `seed:admin` con los valores de desarrollo que el Programador añadió a tu `backend/.env`. Su contraseña es, por tanto, la del ejemplo público del repositorio. En local es inofensivo y sirve para recorrer el flujo. Si quieres otra, cambia `ADMIN_PASSWORD` en tu `.env` y ejecuta `npm run reset:admin`. Tiene 0 sesiones vivas.
7. **Lo que solo tú puedes comprobar**, en un navegador:
   - login y registro a 360 px, foco y contraste;
   - dos pestañas refrescando a la vez (`navigator.locks`, R-03);
   - entrar con otra cuenta sin cerrar la anterior.
8. **Antes de abrir a alumnos:** el encargo de despliegue con `trustProxy`, `NODE_ENV=production` obligatorio, el límite de tasa en `/auth/*` (aceptado por escrito) y un tope para el almacén de intentos. Después, AUTH-02 (recuperación, invitación, restablecimiento y cambio de contraseña) y `pagos` (`GET /me/estado-pago`).
9. **Consecuencia de producto de T-04/T-11:** los nombres con U+200C/U+200D (algunos persas y los emojis compuestos) se rechazan con "El nombre tiene caracteres no permitidos". Lo considero aceptable para el colegio; confírmalo si te importa.

---

# Revisión del Manager — AUTH-01 — cierre
Veredicto: APROBADO
Verificación propia: lint ok (`npm run lint` desde la raíz, código 0 en los tres workspaces) · build ok (`npm run build` desde la raíz, código 0) · test: **tres corridas completas de `npm test` desde la raíz, las tres con código 0 y 395 de 395** (backend 30 archivos / 326 pruebas; frontend 11 archivos / 69), sin intermitencias y con `FSTDEP` en 0 en las tres · hashes: **14 de 14** coinciden con "Cierre (M-13)" · Prisma: `migrate status` "Database schema is up to date!" y `migrate diff --exit-code` "No difference detected" con código 0

Fecha: 2026-09-24. Carril sensible. Es la mini-ronda de cierre que el humano autorizó fuera del máximo (`aprobacion.md`, "Decisiones del humano tras la revisión final"). Sin commit.

## Lo que el humano pidió y lo que verifiqué

| Pedido | Resultado |
|---|---|
| `lint` y `build` | Código 0 los dos. El único aviso es el de chunk > 500 kB, que viene de FRONT-01 |
| Tres corridas de `test` | 1.ª backend 30/326 en 12.0 s, frontend 11/69 en 7.3 s. 2.ª 30/326 en 11.9 s, 11/69 en 7.2 s. 3.ª 30/326 en 12.3 s, 11/69 en 8.5 s. **395/395 en las tres**. `logs-r2` y `api-real`, las intermitentes de M-13, pasaron las tres veces |
| Pruebas adversarias | `vitest list` las cuenta sin ejecutarlas: 192 en el backend y 32 en el frontend, 224 en total. Coincide con el Tester y con el README |
| Hashes de las pruebas del Tester | Los 14 SHA-256 **completos** coinciden con la tabla "Cierre (M-13)" de `reporte-tester.md`. Cambiaron solo `api-real` (`d9553a09…`) y `logs-r2` (`5af3909e…`), como se declaró. Ningún `.skip`, `.todo`, `.only`, `.fails`, `skipIf`/`runIf`, `xit` ni `xdescribe` |
| Estado | Rutas protegidas sin diff (`git diff --quiet` → 0: `infra/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, tsconfigs, `vitest.config.ts`, `frontend/vite.config.ts`, `.prettier*`, `.gitignore`, `.gitattributes` y la migración inicial). 0 filas `@pruebas.local` tras las tres corridas; `usuarios` = 1 (el admin) y 0 sesiones vivas. Puertos 3000 y 5173 libres. Solo siguen los `node.exe` ajenos 6760 y 15016, que no toqué |

## La mini-ronda contra lo autorizado

Después de mi revisión final cambiaron **exactamente 11 archivos**, todos autorizados:
- los 3 del Programador;
- los 2 del Tester;
- los 3 del orquestador;
- `aprobacion.md`, `reporte-tester.md` y `resumen-programador.md`.

Lo comprobé comparando la fecha de modificación de todo lo modificado o nuevo del árbol con la de `revision.md`.

- **T-13 / M-12** (`shared/src/auth.ts`):
  - la clase es `[\p{Default_Ignorable_Code_Point}` + escape de U+2800 + escape de U+1D159 `]` con el flag `u`. Revisé los bytes: son **secuencias de escape en texto**, no caracteres literales;
  - el comentario declara la limitación aceptada;
  - en `shared/src`, `backend/src`, `backend/test` y `frontend/src` no hay ningún carácter invisible literal en código de producción. El único está en datos de prueba del Tester (ver "Detalles menores").
- **M-14** (`backend/src/middleware/README.md`): tres subsecciones, "Ampliación de DEC-16", "Límite: hooks de plugin" y "Orden de los plugins transversales". Es lo que pedí y lo que el humano aceptó.
- **M-17** (`README.md` §7): "30 archivos con 326 pruebas … 192 de ellas" en el backend y "11 archivos con 69 pruebas (32 adversarias)" en el frontend. Coincide con mis corridas.
- **M-13** (arneses del Tester):
  - una petición centinela;
  - la espera de hasta 20 s a que el log tenga el "request completed" del centinela y de cada petición anterior;
  - una evaluación de completitud sobre el log final, ya con la API cerrada;
  - `exigirLogCompleto()` como precondición de cada caso que lee el log: los 5 de `logs-r2` y los 2 de `api-real`.

  Las aserciones de `logs-r2` son idénticas, línea por línea, a las que leí en la revisión final. En `api-real`, `conUserId` se calcula ahora sobre el log final, que es más estricto. Si el log queda incompleto, la prueba **falla** con "Log de la API incompleto…", en lugar de dar por buena una ausencia. **No se debilitó nada**, y se cumple la condición del humano de leer el log completo antes de afirmar nada.
- **Orquestador:**
  - `AGENTS.md` "Comandos": `seed:admin` y `reset:admin` con `ADMIN_*`, y `reset:admin` movido al bloque del backend.
  - `AGENTS.md` "Reglas del equipo": la regla de procesos de larga vida en Windows y la regla literal del humano sobre detenerse.
  - `.claude/agents/programador.md` "Prohibido": la misma regla, literal. Es el único cambio en `.claude/`.
  - `CLAUDE.md`: la fila `auth` con la bienvenida provisional, `Rol` ya reexportado de `shared/` y las entradas de `services/tokenAcceso.ts` y `services/navegacion.ts`.

  Son exactamente los cambios autorizados (puntos 4 y 5 del humano).

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### M-18 — La regla nueva de Windows en `AGENTS.md` se puede leer como "prohibido `Start-Process`"
Dónde: `AGENTS.md`, "Reglas del equipo": "…nunca con `Start-Process` ni otro arranque combinado con una tubería…". En `aprobacion.md` quedó resumida como "sin `Start-Process` ni arranques con tubería".
Por qué importa: el problema de D-17 era **la tubería**, no `Start-Process`. De hecho, `Start-Process … -RedirectStandardOutput <archivo> -PassThru` es la forma limpia de arrancar un proceso con su salida en un archivo y su PID guardado; así lo hice yo en la prueba de humo de la revisión final. Un agente que lea la regla al pie de la letra podría evitar justo el método correcto.
Qué se espera: una redacción sin ambigüedad, por ejemplo: "…se arranca redirigiendo su salida a un archivo y guardando su PID; nunca combinado con una tubería (`|`), ni con `Start-Process` ni con otro arranque, porque el hijo hereda la tubería y el comando no termina". Lo decide el humano; no bloquea el commit.

### M-19 — La receta para `@fastify/rate-limit` del README de middleware está sin verificar
Dónde: `backend/src/middleware/README.md`, "Orden de los plugins transversales"; `aprobacion.md`, requisitos de DEPLOY.
Por qué importa:
- Registrarlo con `hook: "preHandler"` es una hipótesis razonable, pero ningún agente la probó: el plugin no está instalado.
- En las rutas protegidas, un límite colocado después de la cadena llega cuando `withProfile` ya leyó la base, así que una inundación costaría una consulta por petición.
Qué se espera: que DEPLOY lo verifique al instalarlo:
- que la API arranque;
- que las rutas protegidas respondan 401 sin token;
- en qué posición del arreglo queda el hook;
- que se elija, midiendo, entre límite antes o después de la cadena.
El README ya pide la primera comprobación.

## Detalles menores

- **`resumen-programador.md:459`: U+2800 literal accidental.** Es un **detalle menor que no hace falta corregir antes del commit**. Solo afecta a un documento de historial: se lee como un espacio dentro de las comillas invertidas y no toca el código. Si se quiere limpiar, que el orquestador lo sustituya por el texto `U+2800` y deje constancia en el archivo.
- **`reporte-tester.md` líneas 299–302 y 440:** caracteres invisibles literales (rellenos Hangul y Braille en blanco) usados como muestra, cada uno junto a su código U+. Son deliberados. Se quedan.
- **`backend/test/auth-registro.ataque.test.ts:253`:** datos de prueba con U+200B y U+202E literales. U+202E es un carácter bidireccional, así que **GitHub mostrará el aviso "hidden or bidirectional Unicode text"** en ese archivo al revisar el PR. Es esperado e inofensivo: son los datos del ataque T-04, y el hash está fijado desde la ronda 1. En adelante, el Tester debería escribir esos datos con secuencias de escape.
- La regla de "detenerse" en `AGENTS.md` está en segunda persona y el resto de "Reglas del equipo" es impersonal. Es el texto literal del humano; se queda así.
- `backend/src/middleware/README.md` conserva un salto de línea a media frase ("Fastify ejecuta `onRoute` al / registrar la ruta"), de la ronda 2. Es cosmético.

## Definición de terminado (`AGENTS.md`)

- [x] RF-01, RF-02, RF-04c ("cerrar sesión"), RF-05 y la base de RN-06; RN-01/02/03 en el modelo y en `/me`. Sin cambios desde la revisión final.
- [x] Capas y middleware. Cadena por construcción y guarda ampliada, aceptada por el humano, con su límite documentado.
- [x] **`lint`, `build` y `test` en verde**, tres corridas de `test`.
- [x] Pruebas de autorización por endpoint.
- [x] Migración compatible hacia atrás y sin deriva.
- [x] `infra/` sin cambios; `backend/.env.example` al día.
- [x] Documentos:
  - README, `AGENTS.md`, `CLAUDE.md`, `programador.md` y el README de `middleware/` aplicados;
  - `ARCHITECTURE*.md` quedan para DOCS-02, como decidió el humano.

## Documentos a actualizar

Nada nuevo en este encargo, salvo M-18 si el humano lo acepta. Lo pendiente ya está asignado en `aprobacion.md`: CHORE-01 (Testcontainers y `fastify-plugin ^6`), DEPLOY (con M-19 añadido), DOCS-02, AUTH-02, `pagos`, `admin`, `clases`, `LIMPIEZA_DIARIA`, y la guarda sobre todas las rutas con ESLint contra `addHook` en `handlers/`.

## Para el humano

1. **Revisión del diff** (carril sensible) y commit en la rama `feat/auth-01-autenticacion-basica`. Son 108 entradas: 33 modificados (los 30 del encargo más `AGENTS.md`, `CLAUDE.md` y `.claude/agents/programador.md`), 1 borrado y 74 nuevos, 5 de ellos en `docs/trabajo/`. Te sugiero **dos commits** en la rama, para no mezclar reglas de trabajo con funcionalidad (`AGENTS.md`, "Forma de trabajar"):
   - `docs(agentes): …` con `AGENTS.md`, `CLAUDE.md` y `.claude/agents/programador.md`;
   - `feat(auth): …` con todo lo demás.
2. **Orden de revisión por capas:**
   1. `shared/src/auth.ts` e `index.ts`.
   2. `backend/prisma/schema.prisma` y `migrations/20260923143021_usuarios_y_sesiones/migration.sql`.
   3. `backend/src/core/auth/*`, con sus pruebas.
   4. `backend/src/config/{env,auth,logger}.ts` y `backend/.env.example`.
   5. `backend/src/adapters/auth/*` y `backend/src/adapters/db/{cliente,errores,usuarios,sesiones,index}.ts`.
   6. `backend/src/middleware/*`: **`guarda-de-rutas.ts`**, `index.ts`, los pasos de la cadena y el README.
   7. `backend/src/handlers/{validacion,usuarios}.ts`, **`handlers/auth/index.ts`** (reserva de intentos, refresco y rotación), `handlers/auth/cookie.ts` y `app.ts`.
   8. `backend/src/scripts/*`, `backend/package.json`, `package-lock.json` (10 paquetes; D-01 aceptada) y `eslint.config.mjs`.
   9. `backend/test/ayudas-auth.ts`, `tokens-acceso.test.ts` y las `*.integracion.test.ts`.
   10. Frontend: **`services/apiClient.ts`**, `authService.ts`, `tokenAcceso.ts` y `navegacion.ts` → `app/{router,require-sesion,require-rol}.tsx` → `components/layout/{types.ts,contenedor-rol.tsx}` → `features/auth/*`.
   11. Las 14 `*.ataque.test.*`: basta con los títulos y los arneses de `api-real` y `logs-r2`.
   12. `README.md`, luego `AGENTS.md`, `CLAUDE.md` y `.claude/agents/programador.md`, y al final `docs/trabajo/AUTH-01-autenticacion-basica/`.

   Donde más vale detenerse: `guarda-de-rutas.ts`, `handlers/auth/index.ts`, `adapters/db/sesiones.ts` (`rotarSesion`), `adapters/auth/tokens.ts`, `config/env.ts` (`superRefine`) y `services/apiClient.ts`.
3. **Aviso de GitHub** en `auth-registro.ataque.test.ts` por texto bidireccional: esperado (ver "Detalles menores").
4. **M-18:** decide si aclaras la redacción de la regla de Windows antes del commit de `docs(agentes)`.
5. **Pendiente de navegador**, que ningún agente pudo hacer:
   - login y registro a 360 px;
   - foco y contraste;
   - dos pestañas refrescando a la vez (`navigator.locks`);
   - entrar con otra cuenta sin cerrar la anterior.
6. **El admin de `campus_dev`** (`admin@campus.local`) tiene la contraseña del ejemplo público. Es inofensivo en local; se cambia con `npm run reset:admin`.
7. **Lo siguiente:** CHORE-01, y DEPLOY antes de abrir a alumnos (`trustProxy`, `NODE_ENV=production` obligatorio, límite de tasa en `/auth/*`, tope del almacén de intentos y la verificación de M-19).
