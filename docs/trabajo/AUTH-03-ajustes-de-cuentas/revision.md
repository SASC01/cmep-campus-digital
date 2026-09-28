# Revisión del Manager — AUTH-03 · ajustes de cuentas — plan
Veredicto: CAMBIOS REQUERIDOS (una enmienda acotada del arquitecto: el inventario de la ronda 0; el resto del plan se sostiene)
Verificación propia: lint, test y build no ejecutados (modo plan; la suite del backend exige PA-01). Solo lectura: `npx prettier --check` sobre `frontend/src/features/auth/components/campo-contrasena.test.tsx` → **falla** (ver P-01). Afirmaciones del plan comprobadas contra el código: `rutas-publicas.ts` (8 rutas), `cambiarContrasenaPropia`, `restablecerConTemporal`, `usarTokenYCambiarContrasena`, protocolo de `adapters/README.md`, `apiClient` (refresco y reintento solo en `/api/auth/cambiar-contrasena`), `schema.prisma` (`tokens_cuenta` solo tiene `@@index([usuarioId])`; `usuarios` tiene `creado_en`), `pg-boss` 12.34.0 `insert(name, jobs, { db })` (`manager.js:1277`) y `insertJobs`, que hereda `retry_limit`, `retry_backoff`, `dead_letter` y la retención de la cola con `COALESCE(..., q.*)` (`plans.js:2071-2079`), y las líneas citadas de cada `*.ataque`.

## Problemas que bloquean

### M-01 — El inventario de la ronda 0 omite `estatico-r1.ataque.test.ts`, que 03a y 03b contradicen
Dónde: plan §D-A4 (C-5), §D-B7 y "Puntos de ataque", Ronda 0, paso 2 (términos de búsqueda).
Por qué importa: el humano pidió un inventario exacto y el plan detiene al programador si falla una `*.ataque` fuera de la lista de rojos esperados (PA-06). `frontend/src/components/layout/estatico-r1.ataque.test.ts` fija hoy, en su bloque "DESIGN-01b-2 r0":
- `:182` exactamente 7 `<CampoContrasena`, "1, 1, 2 y 3" en 4 formularios. Con 03a pasan a ser 6 (el cambio obligatorio queda con 2). Con 03b vuelven a ser 7, pero en 5 formularios (`formulario-registro-maestro.tsx`).
- La `TABLA` (`:153-165`) exige `["contrasenaActual", "mostrarTemporal"]` en `formulario-cambiar-contrasena.tsx`. 03a lo retira, y en 03b falta la fila del formulario nuevo.
- `:212-230` exige que `TEXTOS_CAMPO_CONTRASENA` tenga exactamente 4 textos, con `mostrarTemporal`. §D-A6 lo retira.
- `:247` exige que `<CampoContrasena` o `./campo-contrasena` aparezcan solo en los 4 formularios de la `TABLA`. 03b agrega uno.

En 03a, la búsqueda de `contrasenaActual` del tester probablemente lo encontraría. En 03b no: ninguno de los términos de búsqueda de esa ronda 0 (rutas y destinos del admin) lo toca, así que PA-06 saltaría en el paso 21. El propio plan prevé el conteo (V-04: "6 tras 03a y 7 tras 03b"), pero no la prueba de ataque que lo fija.
Qué se espera: la enmienda agrega estos cuatro casos a C-5 (03a) y un C-n nuevo en §D-B7 (03b), cada uno con lo que protegen, que se conserva: todo campo de contraseña pasa por `CampoContrasena`, con una constante por campo, sin `type` ni `aria-label`. Además, los términos de búsqueda de la ronda 0 suman `CampoContrasena` y `TEXTOS_CAMPO_CONTRASENA`. En la misma enmienda, la fila `cuentas-r2.ataque.test.ts:228` de C-2 debe decir en qué se convierte, como las demás. Sin cookie, pasa a 401 y deja de probar lo que protege ("el cambio no deja viva la sesión ajena rotada"). Para conservarlo, el caso reescrito necesita una sesión propia en la cookie.

## Problemas que no bloquean

### M-02 — B-03 (B): comprobar la sesión antes de gastar el intento y el argon2
Dónde: §D-A1, pasos 3 a 7.
Hoy el orden es reserva → argon2 (`CONTRASENA_REPETIDA`) → cookie. Quien tiene un token de acceso anterior al restablecimiento, sin ninguna sesión viva (justo el atacante contra el que B-03 protege), puede:
- gastar los 5 intentos del usuario legítimo. Como la bandera bloquea todo lo demás, ese usuario queda sin poder hacer nada durante 15 minutos. El bloqueo ya existe hoy con 5 temporales incorrectas, así que no es nuevo, pero B lo puede cerrar;
- forzar un argon2 por petición y saber si su intento coincide con la contraseña vigente (400 frente a 401). La entropía de la temporal lo vuelve impracticable, pero sobra.

Qué se espera: antes de reservar, un filtro sin bloqueo. Si la cookie no corresponde a una sesión viva del mismo usuario, `401 SESION_INVALIDA` sin contar el intento ni calcular argon2. La decisión definitiva sigue bajo el bloqueo (paso 2 de la transacción). Si se adopta, la reescritura de `cuentas-r1:444` debe llevar la cookie del login con la temporal. Puede ir en la misma enmienda de M-01.

### M-03 — Coherencia de B-03 con ESSENTIALS y con la cadena: correcta, con un hueco que el plan debe nombrar
- **Coherente:** el usuario no escribe nada más. La cookie `campus_refresco` (Path `/api/auth`) viaja sola a `/api/auth/cambiar-contrasena` con `credentials: "include"`. La cadena de middleware no cambia, y la comprobación vive en el adaptador bajo `FOR NO KEY UPDATE`, como hoy la del hash verificado.
- **Varias pestañas y rotación concurrente:** si otra pestaña rota la sesión, el cambio responde 401. `apiClient` refresca (con `navigator.locks`) y reintenta con la cookie nueva: 204. Correcto.
- **Sesión anterior al restablecimiento:** `restablecerConTemporal` revoca todas las sesiones bajo el mismo bloqueo. No queda ninguna.
- **Concurrencia con el bloqueo de `usuarios`:** login y refresco toman `FOR SHARE` y chocan con el `FOR NO KEY UPDATE` del cambio. Quedan en serie y la lectura por PK de la sesión ve el estado confirmado. Sin subida de modo.
- **Hueco a documentar en R-01 o en una R nueva:** el token de acceso no está atado a una sesión (solo `sub`). Una pestaña vieja, con un token anterior al restablecimiento, del **mismo navegador** en el que alguien después entró con la temporal, puede completar el cambio. Es el mismo navegador que ya tiene la sesión de la temporal, así que no abre nada nuevo, pero conviene dejarlo escrito.
- **Cambio de código visible:** `"credencial_cambiada"` pasa de `400 CONTRASENA_ACTUAL_INCORRECTA` a `401 SESION_INVALIDA`, y eso dispara el refresco del `apiClient`. Tras un restablecimiento concurrente, el refresco falla y lleva a `/login`, que es lo deseable. La tabla de "Autorización" debería mencionarlo.

### M-04 — `pg_advisory_xact_lock` devuelve `void`
Dónde: §D-C3, paso 4.1 y V-04.
Con `$queryRaw`, Prisma puede fallar al deserializar una columna `void`. Hay que prever `$executeRaw` etiquetado, o `SELECT pg_advisory_xact_lock(...)::text`, para que el programador no se detenga ni improvise. V-04 debe aceptar la forma elegida, porque hoy solo cuenta `$queryRaw`.

### M-05 — Estados vacíos sin `EstadoVacio`
Dónde: §D-B6 ("Aún no has generado enlaces de registro.", "Nadie se ha registrado con este enlace.").
`DESIGN.md` §7.10 define el vacío como `EstadoVacio`, con título, frase y llamada a la acción, y `CLAUDE.md` lo ubica en `components/`. Aún no existe. El plan pone textos sueltos sin acción. Qué se espera: construir `EstadoVacio` en 03b (su primer uso) o dejar escrito en `DESIGN.md` que la subtabla de registrados es una excepción. El vacío de la lista de enlaces debe llevar a "Generar enlace".

### M-06 — Ritmo del worker: la espera va después del envío, dentro del trabajo
Dónde: §D-C5.
Esperar 600 ms después de `"enviado"` alarga la ventana en la que una caída del worker, ya enviado el correo y con el trabajo aún activo, provoca un reenvío al reintentar. Es un riesgo bajo y ya existe hoy. Qué se espera: medir el tiempo desde el último envío y esperar **antes** de enviar lo que falte, o aceptar el riesgo y anotarlo en R-06.

### M-07 — El nombre provisional debe pasar `nombreSchema`
Dónde: §D-C1, `nombreProvisionalDe`.
Si la parte local, o el correo completo recortado, no pasa `nombreSchema`, el maestro recibe un error en un campo que no tocó al activar su cuenta. Qué se espera: garantizar que el resultado pase `nombreSchema` (con un respaldo si no), con su prueba unitaria.

### M-08 — Comprobación humana: cabe, pero justa
Tiene 7 puntos, sin medición de contraste. Cumple la regla. Aun así:
- H-4 (enlace revocado → no válido) lo cubren las pruebas de integración y de jsdom. Conviene fundirlo en H-3 (revocar y reabrir en la misma ventana privada).
- H-7 cubre cuatro pantallas y "Chrome o Edge". Conviene acotarlo a un solo navegador para no pasar de 10 minutos.
- H-1 es el único punto que prueba en real la cookie de B-03 (proxy de Vite, Path y SameSite). No se quita.

## Detalles menores
- Texto para §6, "Maestros": los ítems 1, 2 y 3 quedan partidos por el párrafo "En las dos…". Debe quedar como lista y, después, la nota.
- "Cambios por capa", frontend: la fila `contrasena-visible.test.tsx` de 03b dice "Crear; el segundo, Modificar". Debe decir solo "Modificar".
- R-06: con 80 invitaciones, una recuperación puede esperar unos 50 s en la cola. Es aceptable (su enlace dura 30 min). Basta con la nota que ya trae.
- `esperar?` con valor por defecto en `DependenciasCorreoDeCuenta`: es una inyección explícita, no un valor por defecto silencioso. Aceptable.
- Las respuestas de "Invitaciones enviadas" son en rigor **encoladas**. El texto del PRD dice "enviaron" y la nota del resultado ("recibirá un correo") lo aclara. Aceptable.

## Lo que se verificó y está bien
- **Alcance:** cubre los cinco puntos de `ESTADO.md` §2b: 1 → 03a §D-A1; 2 → 03b; 3 → 03c; 4 → 03a §D-A2; 5 → 03a §D-A3. Nada de RF-57 ni RF-58 ("No entra"). No agrega funciones que nadie pidió. `POST /auth/invitacion` y el conteo de registrados son necesarios para RF-04b y RF-04f.
- **Carril:** las tres subentregas en **sensible**, confirmado. 03a toca contraseñas, sesiones y `middleware/rutas-publicas.ts`. 03b, una migración, `adapters/auth`, `rutas-publicas.ts` y la creación de sesiones. 03c, una migración, la cola y el correo.
- **Commits:** `<A>` al aprobarse el plan y `<B>`, `<C>` y `<D>` al cerrar cada subentrega, con la revisión humana del diff. Ninguno en la ronda 0 ni en las correcciones. Coincide con lo pedido y con "Trabajo visual".
- **Ronda 0 y la regla de las `*.ataque`:** solo el tester las reescribe. El programador nunca las toca (reglas de los pasos y "No se toca"). El tester publica los rojos esperados y los hashes. El manager compara línea por línea en cada revisión final (R-10). El inventario del backend es exacto: `cuentas-r1:382, :400, :444`, `cuentas-r2:228`, `cuentas-r3:313, :452, :501`, `logs-cuentas-r1:198-211, :269-270` y `sesiones-y-cadena:430`. `logs-cuentas-r1` ya manda la cookie, así que su "cambiar" sigue en 204 con B. En el frontend solo falta lo de M-01.
- **Migraciones:** `enlaces_registro` agrega una tabla nueva y una columna nula sin `DEFAULT`. `tokens_cuenta_tipo_creado_en` solo agrega un índice. Las dos son compatibles hacia atrás, y el código anterior las ignora, así que se puede revertir el código sin tocar la base. PA-03 y PA-04 cubren la desviación del SQL.
- **Consultas:**
  - cada consulta nueva tiene su índice: el cupo usa `(tipo, creado_en)` nuevo; las listas, `(creado_en DESC, id DESC)` y `(enlace_registro_id, creado_en)`; los registrados salen de un solo `groupBy`;
  - las listas se paginan con un máximo de 100, y la masiva acota la entrada a 100 líneas;
  - no hay N+1;
  - el lote es una sola transacción con el bloqueo consultivo, `createMany` con `skipDuplicates`, sin atrapar `P2002` (N-04 de AUTH-02) y un solo `insert` de pg-boss con la conexión de la transacción.
- **`FOR SHARE` frente a la revocación (§D-B5):** el razonamiento es correcto. En READ COMMITTED, el `FOR SHARE` que llega después de la revocación vuelve a evaluar `revocado_en IS NULL` sobre la versión confirmada y no devuelve fila. El `FOR KEY SHARE` de la FK no alcanza, por eso el explícito es necesario.
- **Cadena de middleware:** está completa en las 5 rutas del admin, con la matriz de autorización completa (sin token, estudiante, maestro, restringido, admin con bandera y admin). Las 2 rutas públicas nuevas se autentican con su token, y los códigos son uniformes. `estadoPago` no sale en ninguna respuesta, y las pruebas lo verifican.
- **Diseño:**
  - un solo `primary` por vista (en 03c, "Generar enlace" pasa a `outline`);
  - confirmación en línea, sin diálogo;
  - insignias con texto e icono;
  - `autoComplete="off"` en los formularios del admin y `name`/`email` en los propios;
  - tablas opacas con desplazamiento propio;
  - `textarea` a 16 px;
  - patrones nuevos documentados en `DESIGN.md` en la misma subentrega, marcados como propuesta.
- **Textos para documentos:** son coherentes con ESSENTIALS y con el diseño. §6 "Respaldo" y ESSENTIALS "Respaldo por el admin" dicen lo mismo que §D-A1 con B. ESSENTIALS "Asíncrono" no contradice "con prioridad en la cola". La única salvedad es la de forma de §6 (detalles).
- **B-01:** el diseño no depende del número. El límite es una variable de entorno con validación de 1 a 10,000, y el valor por defecto se fija con la respuesta del humano. El ritmo (600 ms) sí supone 2 peticiones por segundo sin confirmar (S-04), y el humano lo verifica antes de DEPLOY. Aceptable.

## Desacuerdos arbitrados
Ninguno en esta etapa.

## Documentos a actualizar
Los que lista el plan ("Textos literales propuestos"), más:
- `docs/DESIGN.md` §7.10, si se construye `EstadoVacio` (M-05);
- las cifras de pruebas del `README.md` raíz (§7, que actualizó AUTH-02b). Está en "No se toca", así que las ajusta el orquestador al cerrar 03c, con la autorización del humano.

## Para el humano

| ID | Recomendación del manager |
|---|---|
| **B-01** | **De acuerdo con (A)**, con el número que confirmes en tu cuenta de Resend (límite diario **y** de ritmo) antes de la aprobación. El diseño no depende del número: es una variable. Un rechazo atómico no deja nada a medias ni inventa una cuarta categoría. Fija el valor por defecto con al menos un 20 % de margen, porque las recuperaciones no descuentan del cupo (R-05). |
| **B-02** | **De acuerdo con (A).** No toca el esquema de `usuarios` ni ningún contrato, y RF-04b ya da la forma de corregirlo. Condición: el nombre provisional siempre pasa `nombreSchema` (M-07). |
| **B-03** | **De acuerdo con (B).** Es coherente con ESSENTIALS: el usuario no escribe nada más, la cookie viaja sola y la comprobación va bajo el bloqueo del usuario. Recupera la garantía que hoy da la temporal. Recomiendo además el filtro previo de M-02, para que quien no tenga sesión no gaste los 5 intentos del usuario legítimo. |
| **N-01** | **De acuerdo con (A).** Es el patrón ya aprobado de la temporal: un enlace que no se puede volver a leer no se filtra desde la pantalla del admin. |
| **N-02** | **De acuerdo con (A)**, de 1 a 30 días. Acota el daño de un enlace filtrado (R-03). |
| **N-03** | **De acuerdo con (A).** Es el mismo camino, ya probado, del registro de estudiante. |
| **N-04** | **De acuerdo con (A).** El PRD no pide un máximo. La vigencia, la revocación y la lista de registrados lo acotan. |
| **N-05** | **De acuerdo con (A).** No toca `/admin`, donde viven las `*.ataque` de foco y de la ficha (T-11 a T-14). |
| **N-06** | **De acuerdo con (A).** Acepta lo que sale de copiar dos columnas de una hoja de cálculo. 100 líneas es el máximo de ESSENTIALS. |
| **P-01** (nueva, **antes de `<A>`**) | Hay un cambio sin confirmar, ajeno al encargo: un espacio al final de la línea 18 de `frontend/src/features/auth/components/campo-contrasena.test.tsx`. Hace fallar el Prettier del `lint` (lo comprobé) y activaría PA-02 en la ronda 0. **Recomiendo descartarlo** (`git restore` de ese archivo) antes del commit de aprobación, para que no entre en `<A>`. |
| **P-02** (nueva; hoy es S-13) | "Cargar más" como forma de paginar las tablas del admin. `DESIGN.md` §7.9 dice "paginación" sin fijar la forma, y esta decisión se heredará en ADMIN. **Recomiendo aprobarla solo para `/admin/maestros`**, anotando que ADMIN decide la forma para la tabla de usuarios, que tendrá cientos de filas. |

---

# Revisión de la enmienda 1 — plan
Veredicto: APROBADO (sin problemas que bloqueen; cuatro hallazgos menores que el programador o el arquitecto pueden absorber sin otra ronda de revisión)
Verificación propia: lint, test y build no ejecutados (modo plan). Revisé la sección "Enmienda 1" y cada parte que cambió contra el código: `estatico-r1.ataque.test.ts` (números de línea, `rutasCon` ordenado y `Object.keys(TABLA)`), `apiClient.ts` (refresco y reintento), `eslint.config.mjs` y `arquitectura-cuentas-r1` (SQL crudo).

## Cómo quedaron M-01 a M-08
- **M-01, resuelto.**
  - **C-5b (03a) es exacto contra el archivo.** `:182` pasa a 6 con `1, 1, 2 y 2`. La `TABLA` (`:153-166`) pierde la fila de la temporal, y `:195` se adapta sin cambiar su texto. `:212` pasa a 3 textos, y `:229` y `:231` no cambian. `:247` no cambia en 03a.
  - **C-14 (03b) es exacto.** La clave nueva va antes de `formulario-registro.tsx`, que es el orden correcto: `rutasCon` ordena, y `-` (0x2D) va antes de `.` (0x2E), así que `:247` sigue comparando igual.
  - **Lo que protege se conserva** en los dos: `CampoContrasena` en cada campo, una constante por campo y en su orden, sin `type` ni `aria-label`, y los nombres solo en `data.ts`.
  - **Búsqueda de la ronda 0:** suma `CampoContrasena`, `TEXTOS_CAMPO_CONTRASENA` y `mostrarTemporal`, en las tres rondas 0.
  - **`cuentas-r2:228`:** ahora dice en qué se convierte (una sesión propia P en la cookie, 204 y exactamente 1 sesión viva) y conserva DEC-09.
- **M-02, bien incorporado.** `estaVivaParaCambio` es pura (core) y va antes de reservar el intento y de calcular argon2. La decisión definitiva sigue bajo el bloqueo (paso 8 y paso (2) de la transacción), y el plan explica por qué el filtro no la sustituye.
  - La reescritura de `cuentas-r1:444` lleva la cookie.
  - Hay pruebas nuevas: 6 o 10 peticiones sin sesión no llevan a 429, y la rotación ocurre entre el filtro y el bloqueo.
  - Los casos `cuentas-r3:313, :452 y :501` siguen dando los resultados que dice C-2. En `:452` y `:501` el filtro pasa (la sesión todavía está viva al leerla), y el bloqueo decide.
- **M-03, bien incorporado, sin bucle.**
  - `apiClient` refresca **una sola vez** por petición y reintenta **una sola vez** (`procesar(await enviar(...))`, sin volver a evaluar `debeRefrescar`).
  - Si el refresco falla, `perderSesion` lleva a `/login`, que no está en `RUTAS_SIN_SESION` de `/cambiar-contrasena`, así que no hay rebote.
  - Si el refresco funciona, el reintento vuelve a leer el hash vigente:
    - tras un cambio concurrente del mismo usuario, responde `409 CAMBIO_NO_REQUERIDO`, que la vista ya trata como éxito;
    - tras un restablecimiento, una recuperación o `reset:admin`, las sesiones quedaron revocadas, así que el refresco falla y lleva a `/login`.

    No hay ningún camino en el que el refresco funcione y el reintento vuelva a dar `credencial_cambiada` para siempre.
  - R-15 documenta bien la pestaña vieja.
- **M-04, bien incorporado.** `$executeRaw` etiquetado, con la alternativa `::text` autorizada sin parada. PA-14 comprueba que el bloqueo exista de verdad (los dos lotes quedan en serie), no solo que la sentencia corra. V-04 acepta las dos formas y `$executeRawUnsafe` sigue en 0. Ni ESLint ni `arquitectura-cuentas-r1` restringen `$executeRaw` dentro de `adapters/`.
- **M-05, bien incorporado.** `EstadoVacio` se construye en 03b. El vacío de la lista lleva una acción, con un nombre distinto de "Generar enlace". La excepción sin acción queda escrita en `DESIGN.md` §7.10 y acotada a una fila expandida. `CLAUDE.md` pasa `EstadoVacio` a existente. Queda un detalle en M-10.
- **M-06, bien incorporado.** La espera va antes de procesar el trabajo y solo por lo que falte. El trabajo termina en cuanto el correo sale. Queda un hueco en M-09.
- **M-07, bien incorporado.** La cadena es parte local → correo completo → "Maestro invitado", con prueba de que el resultado pasa `nombreSchema.safeParse`. R-04 menciona el respaldo.
- **M-08, bien incorporado.** La hoja tiene 6 puntos. H-1 conserva la cookie real de B-03, H-3 absorbe la revocación y H-6 usa un solo navegador. Cabe en 10 minutos y no mide contraste.

## Pregunta 4: la columna del manager en la tabla del plan
**Coincide** con mi tabla de "Para el humano" en B-01 a B-03, N-01 a N-06, P-01 y P-02. En P-01, el arquitecto pasó mi justificación a la columna de la pregunta y dejó la recomendación ("descartarlo antes de `<A>`"). El sentido es el mismo.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### M-09 — Ritmo del worker tras un error del proveedor
Dónde: §D-C5, paso 3, y "Pruebas requeridas" 03c ("tras un omitido o un error no se registra envío").
Por qué importa: si `procesarCorreoDeCuenta` lanza después de llamar a Resend (por ejemplo, un 429 de ritmo o un 5xx), `ultimoEnvioMs` no se actualiza. El trabajo **siguiente** de la cola sale sin espera. Durante una invitación masiva, un 429 de Resend haría que el worker insistiera más rápido justo cuando el proveedor pide ir más lento. El reintento del trabajo que falló sí espera, pero los demás no.
Qué se espera: que cualquier intento que llegó al notifier (enviado, rechazado **o lanzado**) cuente para el ritmo. Por ejemplo, actualizar `ultimoEnvioMs` en un `finally` cuando el resultado no fue `"omitido"`, sin tragarse el error. La prueba cambia a "tras un error del notifier, el siguiente trabajo espera". Lo puede decidir el programador de 03c; no requiere otra revisión.

## Detalles menores
- **M-10:** `EstadoVacio` no debe fijar la acción en `outline` dentro del componente. `DESIGN.md` §7.10 dice que va en `primary` cuando es la única acción de la vista, como en los vacíos futuros del estudiante y del maestro. Debe ser una prop (o `outline` por defecto con la variante como opción). En `/admin/maestros` se usa `outline`.
- **M-11:** "No se toca" lista `revision.md` dentro de la carpeta del encargo, pero es mi entregable: añado las revisiones finales de 03a, 03b y 03c. Conviene decir "`revision.md`, salvo el manager", como ya dice de `aprobacion.md` para el orquestador.
- **M-12:**
  - En §D-C5, `reloj()` devuelve un `Date` (así está hoy en `DependenciasCorreoDeCuenta`): `esperaAntesDelSiguiente` recibe `reloj().getTime()`.
  - En §D-C1, `nombreProvisionalDe` debe devolver el valor **ya analizado** por `nombreSchema` (recortado), no el texto de entrada.
- **M-13:** `estatico-r1.ataque.test.ts` también fija:
  - que no haya valores arbitrarios nuevos de maquetación fuera de `components/ui/` (`:131`);
  - que `animate-` solo aparezca en `cargando.tsx` y `button.tsx` (`:114`);
  - que no haya `bg-background` (`:96`) ni `fixed` fuera de la barra y del diálogo (`:102`).

  Ninguno contradice el plan, pero un componente nuevo de 03b o 03c que use, por ejemplo, un `min-w-[…]` en `features/admin/` haría saltar PA-06. Conviene recordarlo en las reglas del programador de 03b y 03c.
- **Ronda 0, agregados del tester:** la regla nueva ("si encuentras un caso contradicho que no está en el inventario, lo reescribes igual") es razonable, y R-10 la cubre en mi revisión final. Pido que cada agregado cite el C-n que lo contradice. Si no hay ninguno, no es una contradicción sino un hallazgo, y no se reescribe.

## Desacuerdos arbitrados
Ninguno. El arquitecto incorporó todo sin desacuerdos.

## Para el humano
La tabla de recomendaciones **no cambia** (la de arriba, "Para el humano", vale tal cual, y el plan ya la copia en su tabla de preguntas). P-01 sigue pendiente en tu árbol antes de `<A>`.

---

# Revisión de la enmienda 2 — plan (revisión rápida)
Veredicto: APROBADO. El plan en estado LISTO lo pueden ejecutar el tester y el programador de 03a sin adivinar nada.
Verificación propia: lint, test y build no ejecutados (modo plan). Comprobado:
- que `sha256sum AGENTS.md` coincide con el SHA-256 de `aprobacion.md` (`BCF18665…C0E5FD`);
- que `git log` da `53b3126` como punta de la rama;
- que `git status` no muestra cambios en `frontend/`, así que P-01 quedó resuelta;
- que la interfaz `Notifier` (`core/correo/notifier.ts`) solo tiene `correoDeCuenta`, así que el envoltorio de §D-C5 la cubre completa;
- con búsquedas en el plan, que no quedan restos de `<A>`, `<B>`, `<C>`, `<D>`, 600 ms, 50 s ni `cuentaParaElRitmo`.

## 1. M-09 a M-13 y los agregados de la ronda 0: incorporados
- **M-09, correcto.**
  - El `finally` del envoltorio marca la hora en los tres casos: enviado, rechazado y lanzado.
  - No hay `catch`, así que el error sigue su camino por `procesarCorreoDeCuenta` y el manejador, y pg-boss reintenta.
  - Un omitido nunca llega al notifier, así que no cuenta, y por eso sobra `cuentaParaElRitmo`, que se quitó.
  - `workers/correo-de-cuenta.ts` no cambia.
  - La espera se acota entre 0 y el intervalo, así que un reloj que retrocede no produce esperas negativas ni largas.
  - C-13 prevé el efecto sobre `worker-r1` (su notifier siempre lanza): esperas de hasta 250 ms, muy por debajo de sus 25 s.
- **M-10:** `variante` va dentro de `accion`, sin valor por defecto, y es `outline` en `/admin/maestros`.
- **M-11:** `revision.md` es de "salvo el manager".
- **M-12:** `reloj().getTime()` en §D-C5, y `data` del `safeParse` en §D-C1.
- **M-13:** la regla está en "Pasos de implementación".
- **Agregados:** cada caso fuera del inventario cita su C-n, y sin C-n es un hallazgo y no se reescribe. La lista de rojos de la ronda 0 incluye el C-n.

## 2. Ritmo de 250 ms y R-05: correctos
- 250 ms son 4 peticiones por segundo, frente al límite de 10 de Resend. Un lote de 80 tarda unos 20 s. S-04, §D-C5, R-06 y los textos de §9 y de ESSENTIALS lo dicen igual.
- El argumento de R-05 es válido **para la hora de creación**. Todo día UTC es una ventana de 24 h, y la última invitación creada en ese día la vio entera, así que nunca hay más de 80 creadas en un mismo día UTC. La salvedad va en M-15.

## 3. Cambio de proceso: aplicado en todo el plan
- `<R>` = `53b3126`, y las bases `<Ca>` y `<Cb>` dentro de los paquetes, aparecen de forma coherente en:
  - "Subentregas";
  - las precondiciones de la ronda 0;
  - los pasos 1, 2, 13, 14 y 27;
  - PA-02;
  - V-05.
- PA-02 exige que la base exista (`git cat-file -e`) y que los archivos protegidos coincidan con su SHA-256.
- V-05 compara `AGENTS.md`, y los documentos que aplique el orquestador, contra el hash de `aprobacion.md`, no contra `<R>`.
- Tres commits en total y ninguno intermedio.
- La revisión humana del diff no es obligatoria: la cabecera y los "Puntos de commit" lo dicen.
- Los textos de cada subentrega se aplican al cerrarla, antes de su commit (pasos 12, 25 y 39).
- La comprobación humana es una sola, al final de 03c.
- Todo coincide con `AGENTS.md`, "Commits y cierre de subentregas".

## 4. Contradicciones internas
Ninguna que bloquee.

## Problemas que bloquean
Ninguno.

## Detalles menores (no bloquean, no exigen otra ronda)
- **M-14:** V-05 dice "con el hash que él anotó". Un mismo documento (por ejemplo, `docs/ARCHITECTURE.md`) cambia en el cierre de 03a y otra vez en el de 03b. Conviene que `aprobacion.md` deje claro que vale **el último hash anotado para cada archivo**, para que el programador de 03c no compare contra el de 03a.
- **M-15:** R-05 cuenta creaciones, no envíos. Una invitación creada a las 23:59 UTC puede salir a las 00:00 del día siguiente, y un reintento de pg-boss la puede atrasar unos minutos más. Así, los envíos de un día UTC pueden rebasar por poco a los 80. El margen de 20 lo cubre. Basta con que R-05 lo diga en una frase; no cambia el diseño.
- **M-16:** hoy `AGENTS.md`, `docs/ESTADO.md` y `docs/trabajo/AUTH-03-ajustes-de-cuentas/` no están confirmados. Como no hay commit de aprobación, el bloque de comandos del cierre de 03a (paso 12) debe incluirlos en el `git add` de `<Ca>`. Si no, quedarían pendientes a lo largo de las tres subentregas. No rompe V-05, porque `AGENTS.md` se verifica por hash y los otros dos están excluidos, pero el historial quedaría incompleto.

## Para el humano
Nada nuevo. La tabla de recomendaciones no cambia.

---

# Arbitraje de PA-07 (AUTH-03a, ronda 2)
Veredicto: **exclusión acotada, decidida por el manager.** No lo escalo: no cambia ninguna decisión de producto ni de arquitectura, ni debilita nada que PA-07 proteja. El orquestador lo anota en `aprobacion.md` y lo menciona en el resumen del cierre de 03a.

## Hechos comprobados
- El bloque de AUTH-02 `describe("ataque: transacciones que Prisma cierra por tiempo (P2028) a mitad de una espera de bloqueo")` (`backend/test/cuentas-r3.ataque.test.ts:685`) retiene la fila del usuario más de 5 s a propósito. Así provoca un `P2028` en el login (`tx.sesion.create`, dentro de `crearSesion`) y otro en `restablecer` (`tx.tokenCuenta.updateMany`, dentro de `usarTokenYCambiarContrasena`).
- Las aserciones de ese bloque exigen que el sistema responda con el formato de la API, que no deje la sesión ni el token a medias y que el pool siga sano.
- El manager de AUTH-02 aceptó esos `P2028` como no hallazgo (`docs/trabajo/AUTH-02-cuentas-y-correo/revision.md:475`), con el pendiente MF-04 para ADMIN.
- Los dos ya aparecen en la corrida de la base, antes de cualquier cambio de 03a.

## Decisión
1. **El tester hizo bien en detenerse.** PA-07 no tenía excepciones, y una parada se cumple aunque la alternativa parezca obvia.
2. **PA-07 existe para detectar bloqueos o cierres por tiempo que el encargo introduzca**, no para volver a descubrir los que una prueba de ataque ya aceptada provoca a propósito. Excluir exactamente esos dos no debilita nada: el bloque que los provoca sigue corriendo y sus aserciones deciden si el sistema los maneja bien.
3. **La exclusión es cerrada.** Vale solo para esos dos, identificados por la ruta y la llamada de Prisma, no por números de línea. 03a modifica `handlers/auth/cuentas.ts` y `adapters/db/tokens-cuenta.ts`, así que las líneas se van a mover.
   - **Siguen activando la parada:** cualquier otro `P2028`; uno de esos dos en otra ruta o en otra llamada de Prisma; más de uno de cada tipo; y cualquier `40P01`, `deadlock detected`, `could not serialize` o `too many clients`, que no tienen excepción.
   - **Si falta uno de los dos (0 o 1):** no activa PA-07, pero se reporta, porque indica que el bloque de `cuentas-r3` ya no ejercita ese camino, y el manager lo revisa en la revisión final.
4. **Vale igual para 03b y 03c.** Los `P2028` de las transacciones nuevas de esas subentregas (`registrarMaestroConEnlace`, `revocarEnlaceRegistro`, `invitarMaestrosEnLote` y el bloqueo consultivo) nunca están excluidos.
5. **Cómo se reporta PA-07 a partir de ahora.** Escribir "no se activó" sin haberlo buscado no vale: es declarar verde algo que no se ejecutó (`AGENTS.md`, "Reglas del equipo"). El tester y el programador pegan en su reporte:
   - el comando de búsqueda sobre la salida completa de la suite del backend;
   - el conteo por término;
   - para cada `P2028`, la ruta y la llamada de Prisma.

   La ronda 1 de 03a se da por no verificada en este punto. Lo cubre la corrida de la ronda 2 con este formato.

## Texto exacto para el plan (lo incorpora el arquitecto en PA-07)
> | PA-07 | En la salida completa de la suite del backend aparece `40P01`, `deadlock detected`, `could not serialize`, `P2028` o `too many clients`. **Única exclusión** (arbitraje del manager, AUTH-03a, ronda 2): los dos `P2028` que provoca a propósito el bloque de AUTH-02 `describe("ataque: transacciones que Prisma cierra por tiempo (P2028) a mitad de una espera de bloqueo")` de `backend/test/cuentas-r3.ataque.test.ts`, aceptados en `docs/trabajo/AUTH-02-cuentas-y-correo/revision.md` (pendiente MF-04 de ADMIN). Son exactamente uno en `POST /api/auth/login` sobre `tx.sesion.create` (`crearSesion`) y uno en `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany` (`usarTokenYCambiarContrasena`), y se identifican por la ruta y la llamada, no por el número de línea. Cualquier otro `P2028` (otra ruta, otra llamada o más de uno de cada tipo) y cualquier aparición de los otros cuatro términos activa la parada. Si falta uno de los dos excluidos, no se activa la parada, pero se reporta. La exclusión vale para 03a, 03b y 03c. Todo reporte que responda a PA-07 incluye el comando de búsqueda, el conteo por término y, para cada `P2028`, su ruta y su llamada; escribir "no se activó" sin esa evidencia no vale |

---

# Revisión final — AUTH-03a — final
Veredicto: APROBADO
Verificación propia (2026-09-28, desde la raíz, con PA-01 comprobada: regla `True / Inbound / Block / Public`, red `IZZI-F281` declarada de confianza, Docker encendido):
- **build:** 0.
- **lint:** 0 (ESLint, Prettier y `tsc` en los tres paquetes).
- **test:**
  - backend 68 archivos / 733 pruebas en verde;
  - frontend 54 / 914 en verde;
  - `shared` no tiene script de pruebas (como siempre).
- **PA-07:** el formato del arbitraje, sobre la salida completa del backend (`grep -oF "<término>" | wc -l`):

  | Término | Conteo |
  |---|---|
  | `40P01` | 0 |
  | `deadlock detected` | 0 |
  | `could not serialize` | 0 |
  | `too many clients` | 0 |
  | `P2028` | 2 |

  Los dos `P2028` son los excluidos. `handlers/auth/index.ts:134` (dentro de `POST /login`, `crearSesion`, `modelName: "Sesion"`) y `handlers/auth/cuentas.ts:106` (dentro de `POST /restablecer`, `usarTokenYCambiarContrasena`, `modelName: "TokenCuenta"`). No se activa.
- **PA-11:** sin contenedores de Testcontainers al terminar.
- **V-01, propio:** calculé el SHA-256 de las 52 `*.ataque` y lo comparé con la tabla final del tester (ronda 3): coinciden 52/52. El programador no tocó ninguna.
- **V-04, propio:**
  - `contrasenaActual` y `mostrarTemporal` solo aparecen en dos comentarios y en `config/logger.ts` (desviación 1);
  - 0 `type="password"`;
  - un solo `$queryRawUnsafe` y ningún `$executeRawUnsafe`;
  - `fetch(` solo en `apiClient.ts`.
- **`AGENTS.md`:** su SHA-256 coincide con el de `aprobacion.md`.

## Problemas que bloquean
Ninguno.

## 1. Diff contra el plan
- **Lo planeado, completo:**
  - `cambiar-contrasena` hace el filtro previo antes de reservar el intento y de calcular argon2. Toma la decisión bajo el bloqueo (`findFirst` por PK dentro de la transacción del protocolo). Responde `SESION_INVALIDA` en los tres casos y conserva solo la sesión de quien cambia.
  - `POST /auth/invitacion` es pública, devuelve solo `{ nombre }` con `no-store` y usa el mismo `ENLACE_INVALIDO`.
  - `establecer-contrasena` acepta `nombre` opcional, validado antes de tocar el token y escrito en el mismo `UPDATE` bajo el bloqueo.
  - El login y el registro salen de la caché de mutaciones.
  - El frontend quita el campo de la temporal y agrega "Nombre completo" con los estados de §D-A2.
  - `rutas-publicas.ts` (una línea), los README y `DESIGN.md` §7.3.
- **Solo lo planeado:** no entró nada de 03b ni de 03c. No hay migración, `schema.prisma`, `app.ts`, `admin.ts`, `router.tsx`, `services/`, `components/layout/data.ts`, `features/admin/` ni `lib/cache-de-mutaciones.ts`: `sacarDeLaCacheAlAsentar` sigue en `features/auth/hooks.ts`, como corresponde a 03a.
- **Separar `restablecer` de `establecer-contrasena`** (antes compartían `manejarRestablecimiento`) es necesario, porque solo la segunda acepta `nombre`. No es un refactor ajeno.

## 3. R-10: las `*.ataque` reescritas en la ronda 0, línea por línea
Revisé el diff de cada una contra `53b3126`. Ninguna protección se debilitó más allá de los C-n aprobados, y varias se reforzaron.

- **Backend, C-1, C-2 y C-4:**
  - `cuentas-r1:385` ahora exige además la bandera intacta y que la contraseña nueva no entre.
  - `cuentas-r1:412` usa una sesión real con cookie y mantiene RN-03.
  - `cuentas-r1:462` exige el código `CONTRASENA_REPETIDA` en cada intento y el 429 en el 6.º.
  - `cuentas-r2:219` cambia `vivas: 0` por `vivas: [propia.id]`, que es más preciso.
  - `cuentas-r3:316, :465 y :520` agregan el código, la bandera y que la contraseña no entre.
  - `sesiones-y-cadena` agrega una sola ruta a la lista exacta.
- **Frontend, C-5, C-5b y C-6:** las reescrituras solo quitan el campo de la temporal, pasan las comprobaciones de selección y foco al campo siguiente (sin cambiar lo que miden) o agregan el stub de `/api/auth/invitacion`.
- **Agregados:** cada uno cita su C-n (`errores-r1` C-5, `contrasena-r2` C-5, `contrasena-r1` y `en-espera-r1` C-1 y C-5, `marco-r1` y `contexto-r1` C-6, `enlace-r2:207` C-6). Todos están justificados.

Observaciones del tester en la ronda 0:
- **`CONTRASENA_ACTUAL_INCORRECTA` conservado en `app/cuentas-r1:339`: de acuerdo.** §D-A6 y `shared/` conservan la traducción para un despliegue escalonado. "Dejan de mostrarse" (C-5) se refiere al servidor.
- **El título del `describe` de `estatico-r1` ("los campos"): de acuerdo.** Evita que el título quede falso en 03b, y no cambia ninguna aserción.
- **Las aserciones de la temporal retiradas** (`app/cuentas-r1:215`, `app/cuentas-r2:161`, `contrasena-r1:560 y :587`): **de acuerdo.** En `/cambiar-contrasena` ya no se escribe la temporal. La aserción sobre la nueva se conserva en todas. La temporal fuera de la caché del login la cubre `cache-03a-r1` ("Login con la temporal"), que pasa.
- **`logs-cuentas-r1`: de acuerdo.** `incorrecta` sigue viajando, como `contrasenaActual`, así que la revisión del log sigue siendo significativa. La precondición exige `CONTRASENA_REPETIDA`, lo que prueba que el paso recorrió la comparación.

## 4. Desviaciones que decide el manager
- **Desviación 1 (`config/logger.ts` conserva `req.body.contrasenaActual`): justificada; el código se queda como está.**
  - Fastify guarda el cuerpo crudo antes de que zod descarte el campo. Un cliente viejo o un atacante puede seguir mandándolo, y la regla 13 exige que ninguna contraseña llegue a un log.
  - `logs-03a-r1` comprueba que el valor no aparece.
  - Además, `logger.ts` está en "No se toca".
  - El "0" de V-04 se refiere al contrato y al código que usa el campo, no a la lista de censura. Documento a actualizar: la redacción de V-04 en `plan.md` (abajo).
- **Desviación 5 (`docs/DESIGN.md` §7.3): no es una desviación.** `DESIGN.md` no está en la lista de "No se toca", y V-05 solo verifica las rutas de esa lista. El paso 9 lo instruye de forma expresa, y el cambio es exactamente la nota de §D-B9 (el nombre retirado se conserva con su marca de origen). Para evitar la misma duda en 03b y 03c, V-05 puede decir que `docs/DESIGN.md` lo editan los programadores en los pasos 9, 22 y 35.
- **Desviaciones 2 y 3:** de acuerdo con lo explicado. Son adaptaciones de pruebas normales al contrato nuevo, sin perder casos, y el tester lo verificó por título en la ronda 3.

## 5. `backend/test/ayudas-concurrencia.ts`
El cambio es aditivo y correcto:
- un tercer parámetro opcional `antesDeSoltar`;
- un tipo nuevo;
- un ejecutor `tx.$executeRaw` etiquetado, así que es SQL parametrizado, en un archivo de pruebas y fuera de `backend/src`.

Las llamadas existentes no lo pasan y conservan su comportamiento. El archivo no está en "No se toca". No afecta ninguna regla.

## 6. Definición de terminado, reglas y estilo
- **RF y RN:**
  - RF-04d se cumple: el cambio pide solo la nueva y la confirmación, con la garantía de B-03.
  - RF-04b también: el maestro ve su nombre y puede corregirlo antes de guardar.
  - MF-05 queda cerrado.
  - RN-03 se conserva: el restringido con bandera cambia su contraseña.
- **Capas y middleware:**
  - `core/` es puro (`estaVivaParaCambio`, `evaluarContrasenaRepetida`, `errorDelCambioPropio`, `prepararNombre`);
  - Prisma solo está en `adapters/db`;
  - el handler es delgado, sin `try/catch` y sin comprobaciones de rol a mano;
  - `cambiar-contrasena` conserva su cadena;
  - `invitacion` está en `RUTAS_PUBLICAS` y se autentica con su token.
- **lint, build y test:** en verde en mi corrida.
- **Pruebas de autorización del endpoint nuevo:** `autorizacion-cuentas.integracion` y `cuentas-03a-r1`.
- **Migración, `infra/` y `.env.example`:** 03a no toca ninguno.
- **Reglas que no se rompen:**
  - no aparece ningún `estadoPago`;
  - las consultas nuevas van por PK o índice único, sin N+1;
  - la escritura compuesta va en transacción con el protocolo;
  - fechas en UTC;
  - ningún secreto en logs (`logs-03a-r1`);
  - argon2 fuera de la transacción;
  - nada de cola ni de correo en 03a.
- **Estilo de `CLAUDE.md`:** retornos tempranos en el handler, en core y en la vista, en el orden error → carga → datos. Los tipos se reexportan de `shared/` y ninguno está en línea. Nada de `?? []`.
- **Lista de diseño:** 03a no crea ningún patrón visual. El campo "Nombre completo" usa `Label`, `Input`, `ErrorDeCampo` y los tokens `text-small` y `text-muted-foreground`. Lleva `autoComplete="name"`, porque la persona escribe sus propios datos (S-12). Hay una sola acción principal por vista. Los textos están en español de México y sin emojis. El foco y las etiquetas son los de siempre. Los 360 px y la cookie real quedan para H-1 y H-5 de la comprobación humana, al final de 03c.

## Problemas que no bloquean
- **M-17:** `establecer-contrasena-view.tsx` define un subcomponente, `ContenidoConToken`, dentro de la vista. `CLAUDE.md` los ubica en `components/`. No viola ninguna regla escrita (su interfaz de Props sí está permitida), pero conviene extraerlo cuando alguien vuelva a tocar ese archivo. En 03b y 03c está en "No se toca", así que queda como pendiente de estilo para el próximo encargo que toque `features/auth`.
- **M-18:** el tester dejó anotado que `usarTokenYCambiarContrasena` no vuelve a leer `activo` bajo el bloqueo. Una desactivación entre `decidirUsoDeToken` y la transacción de `establecer` no se detectaría. Es anterior a 03a, y hoy no hay ninguna ruta de baja. Debe quedar en `docs/ESTADO.md` como pendiente de ADMIN, junto a PB-8.

## Detalles menores
- Los resúmenes de las rondas 0 y 1 decían "PA-07 no se activó" sin evidencia. El programador y el tester lo corrigieron en la ronda 2, y mi corrida lo confirma. No queda nada abierto.

## Desacuerdos arbitrados
Ninguno entre el programador y el tester. T-01 y T-02 se corrigieron, y la ronda 3 lo verificó.

## 7. Documentos que el orquestador aplica al cerrar 03a
Los siete bloques siguientes son ciertos con lo implementado. En la parte de §6, "Maestros", marcada 03a, **no** se aplica la frase "Se dan de alta de tres formas": en 03a solo existe una. El texto exacto para 03a es:

> - **Maestros:** no hay registro público abierto de maestros (D-04). Los da de alta el Administrador con una invitación individual (`POST /admin/maestros`): la cuenta nace con una contraseña inutilizable y el maestro recibe por correo un enlace de un solo uso (72 horas) para establecer su contraseña. Al abrirlo ve su nombre (`POST /auth/invitacion`) y puede corregirlo antes de guardar.

(En 03b se convierte en la lista con los ítems 1 y 3, y en 03c queda el texto final del plan.)

**Se aplican al cerrar 03a:**
1. `ARCHITECTURE.md` §6, viñeta "Maestros": el texto de arriba.
2. `ARCHITECTURE.md` §6, "Recuperación de contraseña" (hoy en la línea 195): "conserva la sesión actual y revoca las demás" pasa a decir "conserva la sesión con la que se hizo el cambio y revoca las demás".
3. `ARCHITECTURE.md` §6, "Respaldo, por el Administrador": la segunda viñeta (hoy en la línea 199), con el texto del plan. Coincide con lo implementado: filtro previo sin bloqueo, 401 sin gastar intentos y decisión bajo el bloqueo.
4. `ARCHITECTURE.md` §7, fila `auth`: el texto del plan **sin** `POST /auth/registro-maestro`, que llega en 03b.
5. ESSENTIALS, "Autenticación", "Respaldo por el admin": la frase del plan (03a).
6. `CLAUDE.md`, tabla de módulos, fila `auth`: "con su nombre corregible" después de "establecer contraseña (invitación de maestro)".
7. `README.md` raíz, §7 (hoy en la línea 228):
   - backend: 68 archivos / 733 pruebas;
   - frontend: 54 archivos / 914 pruebas;
   - los conteos de adversarias se recuentan con `npx vitest list` al cerrar. Hoy hay 24 archivos `*.ataque` en el backend y 28 en el frontend.

**Esperan a 03b:**
- §6, ítem 3;
- §7, fila `admin` (sin `maestros/lote`) y `registro-maestro` en la fila `auth`;
- §14, diagrama y filas `usuarios` y `enlaces_registro`;
- ESSENTIALS, "Autenticación", Maestros (sin "o masiva") y "Tablas";
- `CLAUDE.md`, fila `admin`, "registro de maestro por enlace" en la fila `auth` y "Ubicaciones compartidas" (`table`, `badge`, `EstadoVacio`, `lib/cache-de-mutaciones.ts`).

**Esperan a 03c:**
- §6, ítem 2 y la nota "En las formas 1 y 2";
- `maestros/lote` en §7;
- §14, fila `tokens_cuenta` y "Reglas de acceso a datos";
- §8, §9 y §18;
- ESSENTIALS, "o masiva" y "Asíncrono";
- `CLAUDE.md`, `textarea.tsx` e "invitación masiva" en la fila `admin`.

## Documentos a actualizar
- Los siete bloques de la sección 7. El orquestador los aplica con la autorización del humano, antes del commit, y anota su SHA-256 en `aprobacion.md`.
- **`plan.md` (el arquitecto, en la próxima enmienda o al cerrar):**
  - la redacción de V-04, así: "`contrasenaActual` y `mostrarTemporal` → 0 fuera de comentarios y de la lista de censura de `config/logger.ts`, que se conserva (regla 13)";
  - en V-05, que `docs/DESIGN.md` lo editan los programadores en los pasos 9, 22 y 35.
- **`docs/ESTADO.md`:**
  - el cierre de 03a;
  - M-17 (extraer `ContenidoConToken`), con destino "el próximo encargo que toque `features/auth`";
  - M-18, para ADMIN.

## 8. M-14 y M-16 para el cierre
- **M-14: confirmado.** En V-05, un archivo protegido que cambió el orquestador se compara con **el último** SHA-256 anotado para ese archivo en `aprobacion.md`. Hoy es `AGENTS.md`; después del cierre de 03a se suman `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md` y `README.md`, cada uno con el hash posterior a aplicar sus textos.
- **M-16: confirmado, y lo amplío.** El `git add` del commit de 03a incluye:
  - `AGENTS.md`, `docs/ESTADO.md` y toda la carpeta `docs/trabajo/AUTH-03-ajustes-de-cuentas/`;
  - `docs/DESIGN.md` y los documentos que aplique el orquestador (`docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md` y `README.md`);
  - todos los cambios de `shared/`, `backend/` y `frontend/` de la lista de `git status`, **incluidos los cinco `*.ataque` nuevos sin rastrear**: `backend/test/cuentas-03a-r1.ataque.test.ts`, `backend/test/invitacion-flujo-03a-r2.ataque.test.ts`, `backend/test/logs-03a-r1.ataque.test.ts`, `frontend/src/app/cache-03a-r1.ataque.test.tsx` y `frontend/src/features/auth/invitacion-r1.ataque.test.tsx`.

  Nada del scratchpad, ni `backend/tmp/`, ni el cliente generado de Prisma, que está en `.gitignore`. Conviene `git add` con rutas explícitas, no `git add -A`, y un `git status` después del commit que no deje nada pendiente en esas rutas.

## Para el humano
Nada que decidir en este cierre. Queda la comprobación en navegador, una sola al final de 03c. H-1 es el único punto que prueba en real la cookie de B-03.
