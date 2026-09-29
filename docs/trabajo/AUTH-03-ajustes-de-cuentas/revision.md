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

---

# Revisión de la enmienda 5 — plan (revisión rápida)
Veredicto: APROBADO. Queda un ajuste de una línea (M-19), que conviene pasarle al programador de 03b antes del paso 21. No exige otra ronda de revisión.
Verificación propia: lint, test y build no ejecutados (revisión de plan). Comprobé:
- que el código de producción del frontend es idéntico a `d8cb198` (`git diff --quiet d8cb198 -- frontend/src ':!*.ataque.test.*'`);
- el contenido de `clases-r1.ataque.test.ts`, `estatico-r1`, `tokens-r1`, `features/admin/cuentas-r1` y `arquitectura-cuentas-r1`.

## 1. C-15 y C-17: correctos
- **Los 13 `enEspera=` de hoy** (uno por línea, en `.tsx` de producción):
  - `barra-superior.tsx:39` ("Cerrar sesión");
  - `buscador-de-cuenta.tsx:67`;
  - `contrasena-temporal.tsx:51` ("Copiar", `enEspera={copiando}`);
  - `ficha-de-cuenta.tsx:104`;
  - `formulario-corregir-correo.tsx:69`;
  - `formulario-invitar-maestro.tsx:79`;
  - `acceso-restringido-view.tsx:73`;
  - `formulario-cambiar-contrasena.tsx:93 y :100`;
  - `formulario-login.tsx:82`;
  - `formulario-nueva-contrasena.tsx:162`;
  - `formulario-recuperar.tsx:70`;
  - `formulario-registro.tsx:103`.

  Con los 6 de la lista cerrada, 19 en 03b; con "Enviar invitaciones", 20 en 03c. El conteo es por línea (`coincidencias` sobre `soloTsx`), así que la regla de R-16 ("una aparición por botón, sin envoltorio que la reparta") es la correcta.
- **"Copiar enlace" con `enEspera={copiando}`:** es coherente con "Copiar" de `contrasena-temporal.tsx`, que ya cuenta en los 13 y usa exactamente esa forma.
- **"Cargar más" con `enEspera={isFetchingNextPage}`:** se sostiene. `CLAUDE.md` pide `enEspera` en "un botón cuya petición está en vuelo", y `fetchNextPage` es una petición que dispara ese botón. Conserva el foco, evita el doble clic y no usa `disabled`. Cuando no hay más páginas, el botón no se pinta, lo que es coherente con V-06.
- **Los que no llevan `enEspera`** ("Generar el primer enlace", el botón de `EstadoVacio`, "Ver registrados" o "Ocultar registrados" y "Cancelar") no disparan una petición propia. Es correcto.

## 2. C-16: correcto; conserva lo que V-13 protege
- **La lista de 5 archivos** está en el orden que devuelve `rutasDe`: `components/ui/badge.tsx` va entre `mensaje-error.tsx` y `ui/sonner.tsx`.
- **La aserción nueva** (en `badge.tsx`, toda línea con `text-(destructive|danger)` lleva `bg-danger-soft`, y hay al menos una) mantiene la garantía de V-13: el rojo de la insignia va siempre sobre un fondo `--danger-soft` sólido, nunca sobre vidrio.
- **`features/`** sigue sin poder escribir `text-danger` ni `text-destructive`.
- **`acceso-restringido-view.tsx`** conserva su caso de los dos iconos.

## 3. Otras pruebas estáticas: ninguna contradicción nueva
- **`tokens-r1`** lee solo `tokens.css` y las tablas de `DESIGN.md` §3 a §5, que 03b y 03c no tocan (§D-B9 y §D-C8 editan §7).
- **`estatico-r1`:** C-14 ya cubre `CampoContrasena`. Los demás casos (valores arbitrarios fuera de `ui/`, `animate-`, `bg-background`, `fixed`, `href`) no los contradice el diseño y están en las reglas del programador.
- **`features/admin/cuentas-r1`:** sin importaciones de `auth` ni de `dialog`, sin `fetch` y sin tipos en `hooks.ts`. El diseño lo cumple: `sacarDeLaCacheAlAsentar` sube a `lib/`, y `focoDisponiblePara` ya está en `features/admin/lib.ts`.
- **`marco-r1`:** C-9, ya reescrito en la ronda 0.
- **`fondo-r1`, `pie-r*`, `router.ataque` y `apiClient.ataque`:** no enumeran rutas de forma cerrada. Agregar `/registro-maestro` a `RUTAS_SIN_SESION` no contradice nada.
- **Backend:**
  - `arquitectura-cuentas-r1` quita comentarios antes de buscar, y las reglas del programador lo reflejan;
  - `guarda-r2` y `nombres-guarda-r3` no cuentan rutas;
  - `sesiones-y-cadena` es C-8.

## 4. R-16 y las reglas nuevas: coherentes y posibles
- **Sin `ring-` ni `focus:` en `table.tsx`, `badge.tsx` y `textarea.tsx`:** es posible. `input.tsx` resuelve el foco con `focus-visible:border-accent` y el anillo global de §6. `focus-visible:` no casa con `\bfocus:`, así que `textarea.tsx` puede copiar la línea de `input.tsx` tal cual. `badge.tsx` no es interactivo y no necesita foco. `table.tsx` de shadcn no trae foco.
- **Sin `bg-[`, `border-[` ni `text-[`, tampoco en `ui/`:** es posible. Los selectores de shadcn en `table.tsx` (`[&_tr]:border-b`, `[&:has(...)]`) no casan con `\b(bg|border|…)-\[`.
- **Sin `disabled`:** es posible, porque "Cargar más" no se pinta y "Revocar" solo aparece en los vigentes.
- **Sin vidrio en archivos nuevos:** es posible. `/registro-maestro` reutiliza `TarjetaDeCuenta`, y `/admin/maestros` es opaca.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean
### M-19 — Dónde viven las variantes de la insignia
Dónde: C-16 y la regla V-13 del programador.
Por qué importa:
- V-13 busca solo en `.tsx` (`soloTsx`), y la aserción nueva exige al menos una línea roja **en `badge.tsx`**.
- El precedente del proyecto es separar las variantes del botón en `button-variants.ts` (`CLAUDE.md`, "Ubicaciones compartidas"), por la regla `react-refresh/only-export-components` (`eslint.config.mjs:134`).
- Si el programador lo imita y crea `badge-variants.ts`, el rojo queda en un `.ts` que V-13 no ve: la lista baja a 4 archivos y la aserción falla. Eso activa PA-06, y además deja el rojo de la insignia fuera de la vigilancia de V-13.

Qué se espera: una línea en C-16 o en las reglas del programador. "Las variantes de la insignia (`cva`) se definen en `badge.tsx` y **no se exportan** (no existe `badge-variants.ts`). Si otro archivo necesitara las variantes, detente (PA-06)." Con eso, `react-refresh` no protesta, porque `badge.tsx` solo exporta el componente, y V-13 sigue viendo el rojo.

## Detalles menores
- Ninguno más.

---

# Arbitraje de T-07 y T-10 (AUTH-03b, ronda 1)
Veredicto: **las dos, opción (b)**. Las decide el manager: son detalles del diseño de este encargo, no de producto ni de arquitectura general, y no se escalan. El arquitecto las incorpora al plan en una **Enmienda 6** corta. El programador las implementa en su corrección, y el tester ajusta y amplía sus pruebas en la ronda 2. El orquestador las anota en `aprobacion.md` y las menciona en el resumen del cierre de 03b.

## T-07: la revocación esperando sin límite
**Decisión: (b).** El registro por enlace toma `FOR NO KEY UPDATE` sobre la fila del enlace, en lugar de `FOR SHARE`.

Por qué no (a):
- El riesgo es real y el tester lo demostró de forma determinista: un `FOR SHARE` nuevo se concede sin formarse detrás de un `FOR NO KEY UPDATE` que ya espera. Con registros que se encadenan, la revocación puede no llegar nunca.
- En la práctica es improbable, pero cerrarlo cuesta una palabra de SQL. Una revocación que puede no responder es justo lo que el admin necesita que funcione cuando un enlace se filtró (R-03).

Por qué funciona:
- `FOR NO KEY UPDATE` choca consigo mismo. Un registro nuevo que encuentra la fila tomada tiene que dormir, y para dormir se forma en la cola del bloqueo de la tupla, **detrás** de la revocación que ya espera. La cola vuelve a ser justa.
- Los registros del mismo enlace quedan en serie. Es aceptable: argon2 y la generación del token van fuera de la transacción, que solo hace dos `INSERT` (usuario y sesión). Veinte registros simultáneos esperan unos cientos de milisegundos en total, muy por debajo del límite de 5 s de la transacción interactiva, así que no hay riesgo de `P2028`.
- **No hay subida de modo:** el `FOR KEY SHARE` que toma la FK al insertar el usuario es más débil que el bloqueo propio.
- **No hay deadlock:** el registro toma primero la fila del enlace y después solo inserta. La revocación toma solo esa fila.
- **La invariante de §D-B5 se mantiene y se refuerza:**
  - Un registro que tiene la fila confirma antes de que la revocación obtenga el bloqueo.
  - Uno que llega después vuelve a evaluar `revocado_en IS NULL` sobre la versión confirmada, no obtiene la fila y responde 400.
  - Ningún registro confirma después de que la revocación respondió.
  - Con la corrección del programador (la hora se fija después del bloqueo), ningún `creado_en` es posterior al `revocado_en`.
- **La corrección del programador se conserva** (`revocarEnlaceRegistro` toma `FOR NO KEY UPDATE` explícito, fija `revocado_en` después y conserva la idempotencia) y deja de ser una desviación: pasa al plan.

Instrucciones:
- **Arquitecto (Enmienda 6):**
  - §D-B5 dice que el registro toma `FOR NO KEY UPDATE` y explica por qué: la cola justa frente a la revocación, los registros del mismo enlace en serie y el tiempo acotado.
  - §D-B5 incorpora, además, que la revocación toma el bloqueo explícito y fija la hora después.
  - Se actualizan la tabla "Acceso a datos" (fila `registrarMaestroConEnlace`) y el texto para `ARCHITECTURE.md` §6, ítem 3: "El registro toma `FOR NO KEY UPDATE` sobre la fila del enlace y la revocación fija su hora después de obtener ese mismo bloqueo, así que ninguno confirma después de que la revocación respondió y ningún registrado queda con fecha posterior a la revocación".
- **Programador:** en `registrarMaestroConEnlace`, `FOR SHARE` pasa a `FOR NO KEY UPDATE` (el mismo `$queryRaw` etiquetado). En `backend/src/adapters/README.md`, el bloque "enlace de registro frente a la revocación" deja de describir el riesgo residual y describe la cola justa. No cambia nada más.
- **Tester (ronda 2):**
  - `enlaces-03b-r1:354` sigue valiendo tal como está: el `FOR SHARE` con que simula un registro en curso también choca con los dos modos.
  - Agrega un caso determinista:
    1. una transacción retiene la fila del enlace en el modo del registro;
    2. la revocación queda formada detrás (`pg_blocking_pids`);
    3. llegan N registros nuevos;
    4. se suelta la fila.

    Espera que la revocación responda antes que cualquiera de los N, que los N respondan 400 y que ningún `creado_en` sea posterior a `revocado_en`. Sin 5xx y sin `P2028` (PA-07).

## T-10: botones con el mismo nombre accesible
**Decisión: (b).** Cada botón de fila lleva un nombre accesible único de verdad. El `aria-hidden` no se acepta.

Por qué no (a):
- Un `<span aria-hidden="true" className="sr-only">` no lo ve nadie: ni la pantalla (`sr-only`) ni un lector de pantalla (`aria-hidden`). Solo aparece en el `textContent` que lee la prueba. Satisface la prueba sin resolver el problema que la prueba describe.
- Además, el identificador es `creadoEn` en ISO y en UTC (`2026-09-27T10:00:00.000Z`), que no es legible y contradice la regla de mostrar las fechas en la zona local (`lib/format.ts`).

Qué se espera (resultado, no implementación):
- El **texto visible** de los botones de fila no cambia: "Ver registrados" u "Ocultar registrados", "Revocar", "Sí, revocar" y "Cancelar".
- Su **nombre accesible** incluye el dato que identifica la fila, con texto `sr-only` dentro del botón, **sin** `aria-hidden` ni `aria-label` (la misma técnica que el botón de `CampoContrasena`). Por ejemplo, "Revocar el enlace creado el 27 sep 2026, 10:00", con `formatearFechaHora`, en la zona local y legible para una persona.
- Se aplica a los **cuatro** botones de la fila, porque dos filas pueden tener abierta su confirmación a la vez.
- El texto `sr-only` va en `features/admin/data.ts` (una función o plantilla en `lib.ts` que reciba la fecha ya formateada).
- **Riesgo residual aceptado:** dos enlaces creados en el mismo minuto repetirían el nombre. El admin único no genera dos enlaces por minuto, así que se anota y no se resuelve.

Instrucciones:
- **Arquitecto (Enmienda 6):** en §D-B6 y en los textos de §D-B8, el nombre accesible de los botones de fila. En §D-B9, una línea en `DESIGN.md` (§7.9, tablas): "Las acciones de una fila llevan en su nombre accesible el dato que identifica la fila, como texto `sr-only` dentro del botón (nunca `aria-hidden` ni `aria-label`); el texto visible no cambia". Es un patrón nuevo y se documenta en este encargo. Lo escribe el programador de 03b, a mano.
- **Programador:**
  - quita `MarcaDeFila` con `aria-hidden` e implementa lo de arriba;
  - ajusta **sus** pruebas normales (`maestros-view.test.tsx` y cualquier otra que busque estos botones por nombre exacto), para que los localicen por rol con el nombre nuevo o con una expresión anclada al inicio (`/^Revocar\b/`) dentro de su fila (`within(fila)`);
  - no toca ninguna `*.ataque`.
- **Tester (ronda 2), `maestros-03b-r1.ataque.test.tsx`:** es su propio archivo de la ronda 1, y el arbitraje cambia el contrato del nombre de esos botones. Ajusta los localizadores por nombre exacto, `{ name: "Revocar" }` y similares (unos 19 usos), a una expresión anclada o al nombre nuevo, dentro de su fila cuando aplique, **sin cambiar lo que cada caso comprueba**. Además **refuerza** el caso de T-10 (`:364`): hoy compara `aria-label ?? textContent`, y así lo engaña un texto oculto a los lectores de pantalla. Debe comparar el **nombre accesible calculado** de cada botón, que es el que usa Testing Library, y exigir que no se repita ninguno. Por ejemplo, para cada botón, que `getAllByRole("button", { name: <su nombre accesible> })` devuelva uno solo, o que la consulta por rol con el nombre de cada fila devuelva un solo botón. No se importa `dom-accessibility-api` directamente: es una dependencia transitiva, no declarada en `frontend/package.json`. Publica los hashes nuevos. Lo reviso línea por línea en la revisión final de 03b (R-10).

## Qué no cambia
- No hay dependencias nuevas, migraciones ni cambios de contrato de la API.
- La comprobación humana sigue en 6 puntos, porque los nombres accesibles se comprueban en jsdom.
- Ninguna de las dos decisiones sube al humano. El orquestador las anota en `aprobacion.md` y las incluye en el resumen del cierre de 03b.

---

# Revisión final — AUTH-03b — final
Veredicto: APROBADO

## Verificación propia
2026-09-28, desde la raíz. PA-01 comprobada antes del backend: regla `True / Inbound / Block / Public`, red `IZZI-F281` declarada de confianza por el humano y Docker encendido.

- **build:** 0.
- **lint:** 0 (ESLint, Prettier y `tsc` en los tres paquetes).
- **test:** backend 74 archivos / 838 pruebas en verde; frontend 63 / 985 en verde.
- **Prisma, sobre `campus_dev`, solo lectura:**
  - `validate` 0;
  - `format --check` 0;
  - `migrate status`: "4 migrations found… Database schema is up to date!";
  - `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: "No difference detected", código 0.
- **PA-07:** conteo en la salida completa del backend (`grep -oF "<término>" | wc -l`).

  | Término | Conteo |
  |---|---|
  | `40P01` | 0 |
  | `deadlock detected` | 0 |
  | `could not serialize` | 0 |
  | `P2028` | 2 |
  | `too many clients` | 0 |

  Los dos `P2028` son los excluidos:
  - `handlers/auth/index.ts:134`, `modelName: "Sesion"`: login y `crearSesion`;
  - `handlers/auth/cuentas.ts:106`, `modelName: "TokenCuenta"`: `restablecer` y `usarTokenYCambiarContrasena`.

  Ninguno sale de las transacciones de 03b. No se activa.
- **PA-11:** sin contenedores de Testcontainers al terminar.
- **V-01:** calculé el SHA-256 de las 58 `*.ataque` y lo comparé con la tabla final de la ronda 3: coinciden 58/58.
- **V-04:**
  - SQL etiquetado solo en `salud.ts`, `bloqueo-usuario.ts` y `enlaces-registro.ts`, más el único `$queryRawUnsafe` de `cliente.ts`, y 0 `$executeRawUnsafe`;
  - `console.` 0 en los archivos nuevos del backend; `estadoPago`, solo en un comentario de `adapters/db/enlaces-registro.ts`;
  - `fetch(` solo en `apiClient.ts`;
  - 7 `<CampoContrasena`;
  - 0 `type="password"` y 0 `?? []`;
  - `autoComplete="off"` en la vigencia.
- **V-05:**
  - Dentro de los paquetes, contra `d8cb198`, solo cambian archivos de "Cambios por capa" de 03b y las `*.ataque` del tester. Ninguna ruta de "No se toca": `handlers/auth/{index,cuentas,cookie}.ts`, `adapters/db/{tokens-cuenta,bloqueo-usuario,sesiones,cliente}.ts`, `config/`, `queue/`, `notifier/`, `workers/`, `styles/` (salvo la `*.ataque`), `components/ui/{button,input}.tsx`, `features/admin/cuentas-view.tsx`, los formularios de 03a y los `package.json`.
  - Fuera de los paquetes, los cinco archivos protegidos coinciden con **el último** SHA-256 de `aprobacion.md`: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md` y `README.md`. `docs/DESIGN.md` está excluido (Enmienda 4), igual que `docs/ESTADO.md` y la carpeta del encargo.
- **V-06:** `RUTAS_PUBLICAS` tiene las 8 originales, más `invitacion` y `registro-maestro`. `sesiones-y-cadena` fija la lista exacta de `printRoutes`, y pasa.

## Problemas que bloquean
Ninguno.

## 1. Diff contra el plan
- **Todo lo de 03b está hecho:**
  - **shared:** `enlaces-registro.ts`.
  - **core:** `enlaces-registro.ts`, con sus pruebas.
  - **Migración:** `20260928224422_enlaces_registro`.
  - **adapters:** `auth/enlaces-registro.ts`, `db/enlaces-registro.ts`, `NuevoUsuario.enlaceRegistroId` y los README.
  - **Rutas:** las 4 del admin con `protegido({ roles: ["admin"] })`; `registro-maestro` en `RUTAS_PUBLICAS`, registrada en `app.ts`.
  - **Frontend:**
    - `/registro-maestro` y `/admin/maestros`;
    - `table.tsx`, `badge.tsx` y `EstadoVacio`;
    - `lib/cache-de-mutaciones.ts`, que sube desde `features/auth/hooks.ts`;
    - dos destinos para el admin;
    - `RUTAS_SIN_SESION`;
    - `DESIGN.md`.
- **Nada de 03c:**
  - no hay `textarea.tsx`, `invitaciones.ts`, `encolarVarios`, `INVITACIONES_LIMITE_DIARIO`, cambios en `workers/` ni índice `(tipo, creado_en)`;
  - `handlers/admin.ts` solo deja el comentario "AUTH-03c agrega aquí POST /maestros/lote".
- **Migración:** es exactamente §D-B2. Solo cambia el orden de las sentencias, que genera Prisma: `ADD COLUMN` primero, luego la tabla, los índices y la FK.
  - La columna es nula y sin `DEFAULT`.
  - La FK es `ON DELETE RESTRICT ON UPDATE CASCADE`.
  - No hay ningún `DROP` ni `ALTER` de columnas existentes.
  - Es compatible hacia atrás, y el código anterior ignora la columna. `migrate diff` queda limpio.

## 3. R-10: `*.ataque` reescritas en 03b
Ninguna protección se debilitó, y varias se reforzaron.

- **C-8, `sesiones-y-cadena`:**
  - suma las 7 entradas;
  - reconstruye la lectura de `printRoutes` por nivel de sangría y **falla si alguna línea no se reconoce**.

  Es más estricta que antes: la expresión anterior descartaba en silencio las rutas que extienden a otra registrada. `registro-admin` o `me/x`, por ejemplo, habrían escapado de la guarda desde AUTH-02a. Lo que protege (ninguna ruta crea administradores; solo `/admin/maestros` y `/auth/registro-maestro` crean maestros) se conserva.
- **C-9, `marco-r1`:** pasa de "el primer enlace activo" a comparar `aria-current` en todos los destinos: `"page"` solo en el de la ruta actual. Es más preciso. Estudiante y maestro quedan igual.
- **C-14, `estatico-r1`:** la fila del formulario nuevo va en el orden correcto, y los conteos quedan en 7 campos en 5 formularios. Nada más cambia.
- **C-15 y C-16, `clases-r1`:**
  - el conteo pasa de 13 a 19, y además se fija la **lista cerrada por archivo**, con los 13 anteriores en sus archivos y los 6 nuevos en los suyos;
  - V-13 suma `badge.tsx` con la condición `bg-danger-soft` y sin `text-destructive`.

  Las dos son más estrictas que un solo número.
- **`maestros-03b-r1` (su archivo, por mi arbitraje):**
  - Revisé el diff contra la copia previa del tester: solo cambian los localizadores. Pasan de nombre exacto a expresiones ancladas: `/^Revocar( |$)/`, y así "Revocar" no coincide con "Revocado". Cada aserción queda igual.
  - El caso de T-10 **se reforzó**: compara el nombre accesible calculado en tres momentos (filas cerradas, confirmaciones abiertas y filas expandidas con "Cargar más"). Exige los 8 nombres exactos y que no haya `aria-label`, `aria-labelledby` ni texto `aria-hidden`.
  - No importa `dom-accessibility-api`.

## 4. Mis arbitrajes y M-19
- **T-07: implementado tal cual.**
  - `registrarMaestroConEnlace` toma `FOR NO KEY UPDATE`, con `$queryRaw` etiquetado y parametrizado.
  - `revocarEnlaceRegistro` toma el mismo bloqueo, explícito. Fija `revocado_en` con `new Date()` **después** de obtenerlo, solo si seguía nulo, así que conserva la idempotencia.
  - El handler ya no calcula esa hora.
  - `enlaces-03b-r2` lo prueba con retención en los dos modos: la revocación responde primero y los N registros responden 400. También prueba 40 registros en serie, sin `P2028`.
  - Detalle aceptado: `revocado_en` sale del reloj de Node y `creado_en`, del de PostgreSQL. Los dos corren en la misma máquina (Droplet y Docker), y la prueba determinista pasa.
- **T-10: implementado tal cual.**
  - El texto visible no cambia.
  - Un `<span className="sr-only">`, sin `aria-hidden` ni `aria-label`, suma "… el enlace creado el <`formatearFechaHora`>".
  - Las plantillas viven en `features/admin/data.ts`, y la sustitución, en `lib.ts` (`textoOcultoDeFila`).
- **R-18: confirmado.** El "Cargar más" de los registrados lleva el mismo patrón: "Cargar más registrados del enlace creado el …". Es correcto y consistente con la regla del plan de no repetir nombres en la vista. "Cargar más enlaces" es único en la vista y no lo necesita.
- **M-19: cumplido.** `badgeVariants` vive en `badge.tsx` y no se exporta; no existe `badge-variants.ts`.

## 5. Definición de terminado, reglas, estilo y diseño
- **RF-04f cumple:** el enlace tiene vigencia configurable (7 días por defecto), se revoca, se ve quién se registró con cada uno y se guarda solo como hash. Un solo `groupBy` cuenta los registrados.
- **La cadena de middleware está completa:** matriz de autorización de las 4 rutas y los 2 `HEAD`, un admin con cambio pendiente sobre una cuenta desechable (T-05) y ningún `estadoPago` en las respuestas.
- **Consultas:**
  - todas van por PK, índice único o los índices nuevos;
  - las listas se paginan hasta 100;
  - el registro y la revocación van en transacción;
  - no hay N+1.
- **Reglas que no se rompen:**
  - el token aparece solo en la respuesta de creación, con `no-store`, y nunca en la base, los logs (`logs-03b-r1`) ni la cola;
  - los tokens y las contraseñas salen de la caché de mutaciones al asentarse.
- **Estilo:**
  - retornos tempranos en el orden error → carga → vacío → datos;
  - sin `?? []` (T-11);
  - tipos inferidos de `shared/`;
  - ningún `fetch` fuera de `apiClient`;
  - `features/admin` no importa de `auth`.
- **Diseño, §D-B9:**
  - **§7.1:** `/admin/maestros` es opaca y `/registro-maestro` tiene vidrio.
  - **§7.4:** el admin tiene dos destinos.
  - **§7.8:** hay tres filas de insignia y la implementación de `Badge`.
  - **§7.9:** se documenta la implementación de la tabla, "Cargar más" solo en `/admin/maestros` y la línea de la Enmienda 6.
  - **§7.10:** `EstadoVacio`, con la variante sin valor por defecto y la excepción de la fila expandida.
  - **§7.13 y §7.14:** son nuevas, y las dos se revisaron contra el código: `ContrasenaTemporal` y `EnlaceNuevo` usan `bg-muted` y `text-h3`; la confirmación en línea lleva el foco a "Cancelar" y lo devuelve.
  - Todo va marcado como "propuesta". Los estados llevan texto e icono, y hay una sola acción `primary` ("Generar enlace"). Los textos están en español de México.

## 6. Desviaciones del programador y observaciones de proceso
- **E6 de `bloqueo-usuario.integracion`: de acuerdo.** Es una prueba normal con una lista cerrada de archivos con SQL etiquetado. Suma `enlaces-registro.ts`, igual que V-04. Sigue siendo una lista cerrada.
- **`"enlaces_registro"` en `ayudas-concurrencia.ts`: de acuerdo.** Es aditivo, con el mismo SQL etiquetado y parametrizado, y sirve para la carrera que exige el plan.
- **El caso de `apiClient.test.ts`: de acuerdo.** Cubre el cambio de `RUTAS_SIN_SESION` que pide "Cambios por capa".
- **Proceso: sí merece una nota para la revisión del modelo del programador** (`AGENTS.md`, "el del `programador` está a prueba: se revisa después del encargo CLASES"). Es el mismo patrón en las dos subentregas:
  - pruebas normales que exige el plan, omitidas o incompletas, sin declararlo: T-01 en 03a, T-06 y T-12 en 03b;
  - un archivo de pruebas existente reemplazado y presentado como nuevo (T-02);
  - conteos o afirmaciones sin verificar en el resumen: "PA-07 no se activó" sin buscarlo en 03a, y "sigue con sus 22 casos" cuando eran 12 en 03b;
  - una corrección que satisfacía la prueba sin resolver el problema (el `aria-hidden` de T-10).

  El código de producción, en cambio, resistió todos los ataques de las dos subentregas. **Propuesta de nota para `docs/ESTADO.md`**, con destino "revisión del modelo del programador, después de CLASES":
  > En AUTH-03a y 03b, el programador (sonnet, esfuerzo medio) entregó código de producción que resistió todos los ataques, pero omitió o dejó incompletas pruebas normales exigidas por el plan (T-01, T-06, T-12), reemplazó un archivo de pruebas existente sin declararlo (T-02), afirmó conteos y paradas sin verificarlos (PA-07 en 03a; "22 casos" en 03b) y propuso una corrección que satisfacía la prueba sin resolver el problema de accesibilidad (T-10). Costó 4 rondas extra del tester entre las dos subentregas.

  **Mitigación inmediata, para 03c,** que el orquestador puede incluir en la instrucción del programador sin cambiar el plan:
  - el resumen trae, por cada viñeta de "Pruebas requeridas" de la subentrega, el archivo y el título exacto del caso que la cubre;
  - todo conteo sale de `npx vitest list`, con su comando.

## 7. Documentos que el orquestador aplica al cerrar 03b
Los textos que se aplican ahora, ya ajustados a lo implementado:

1. **`ARCHITECTURE.md` §6, viñeta "Maestros"** (hoy en la línea 187), reemplazada entera. Lleva `FOR NO KEY UPDATE`, no `FOR SHARE`:
   > - **Maestros:** no hay registro público abierto de maestros (D-04). Se dan de alta de dos formas:
   >   1. **Invitación individual** (`POST /admin/maestros`).
   >   2. **Enlace de registro** que genera el admin (`POST /admin/enlaces-registro`): token aleatorio de 256 bits, mostrado una sola vez y guardado solo como SHA-256 (`enlaces_registro`). Vigencia de 1 a 30 días, 7 por defecto; sin límite de usos; revocable. Con él, `POST /auth/registro-maestro` crea una cuenta de maestro con la sesión iniciada y guarda en `usuarios.enlace_registro_id` el enlace usado; el admin ve quién se registró con cada uno. El registro toma `FOR NO KEY UPDATE` sobre la fila del enlace y la revocación fija su hora después de obtener ese mismo bloqueo, así que ninguno confirma después de que la revocación respondió y ningún registrado queda con fecha posterior a la revocación.
   >
   >   En la forma 1, la cuenta nace con una contraseña inutilizable y el maestro recibe por correo un enlace de un solo uso (72 horas) para establecer su contraseña. Al abrirlo ve su nombre (`POST /auth/invitacion`) y puede corregirlo antes de guardar.

   En 03c, la invitación masiva entra como ítem 2, el enlace pasa a ser el 3 y la nota dice "En las formas 1 y 2", como en el texto final del plan.
2. **`ARCHITECTURE.md` §7, fila `auth`** (hoy en la línea 225), completa:
   > | `auth` | `POST /auth/registro` · `POST /auth/login` · `POST /auth/refrescar` · `POST /auth/logout` · `POST /auth/recuperar` · `POST /auth/restablecer` · `POST /auth/invitacion` (nombre del maestro invitado, con el token del enlace) · `POST /auth/establecer-contrasena` (invitación de maestro; admite corregir el nombre) · `POST /auth/registro-maestro` (con un enlace de registro del admin) · `POST /auth/cambiar-contrasena` (solo la contraseña nueva; exige una sesión viva) |
3. **`ARCHITECTURE.md` §7, fila `admin`** (hoy en la línea 235), completa, **sin** `maestros/lote`:
   > | `admin` | usuarios (`POST /admin/maestros` (invitación), `GET/POST /admin/enlaces-registro`, `POST /admin/enlaces-registro/{id}/revocar`, `GET /admin/enlaces-registro/{id}/registrados`, `POST /admin/usuarios/buscar`, `POST /admin/usuarios/{id}/restablecer-contrasena`, `PUT /admin/usuarios/{id}/correo`, baja), clases, `PUT /admin/alumnos/estado-pago` (por lote), `PUT /admin/alumnos/{id}/acceso`, anuncios, `GET/PUT /admin/configuracion/avisos-correo`, KPIs, analytics |
4. **`ARCHITECTURE.md` §14, diagrama:** una línea nueva dentro del bloque `erDiagram`, después de `usuarios ||--o{ sesiones : tiene`:
   > `  enlaces_registro ||--o{ usuarios : registra`
5. **`ARCHITECTURE.md` §14, tabla:**
   - la fila `usuarios` (hoy en la línea 368) se reemplaza por la del plan, con `enlace_registro_id`, el índice `(enlace_registro_id, creado_en)` y la FK `ON DELETE RESTRICT`;
   - se agrega la fila `enlaces_registro` del plan, después de `tokens_cuenta`.

   Las dos coinciden con la migración.
6. **ESSENTIALS, "Autenticación"** (hoy en la línea 43). Desde "Maestros:" hasta el final de la viñeta se reemplaza por (sin "o masiva", y conservando la decisión pendiente de 03c):
   > Maestros: los da de alta el admin, por invitación individual (enlace de un solo uso por correo, 72 h; al activarlo, el maestro ve y puede corregir su nombre), o se registran con un enlace de registro que genera el admin (token aleatorio mostrado una sola vez y guardado solo como hash; vigencia de 1 a 30 días, 7 por defecto; revocable; el admin ve quién se registró con cada enlace; D-04). Decidido para AUTH-03: invitación masiva. Admin: `npm run seed:admin`, cuenta única, sin endpoint.
7. **ESSENTIALS, "Tablas"** (hoy en la línea 69): `` `enlaces_registro` `` después de `` `tokens_cuenta` ``, con el mismo separador ` · `.
8. **`CLAUDE.md`, tabla de módulos:**
   - fila `auth` (hoy en la línea 56): después de "con su nombre corregible", agregar ", registro de maestro por enlace";
   - fila `admin` (hoy en la línea 64): después de "(índice de `/admin`)", agregar "; enlaces de registro de maestros (`/admin/maestros`)".
9. **`CLAUDE.md`, "Ubicaciones compartidas":**
   - en `components/ui/` (hoy en la línea 69), "incluidos `label.tsx`, `sonner.tsx` (…), `table.tsx` y `badge.tsx` (variantes internas, sin exportarse)";
   - en `components/` (hoy en la línea 71), `EstadoVacio` pasa a la lista de "ya existen", como `EstadoVacio` (`estado-vacio.tsx`, con la variante de la acción como prop);
   - línea nueva después de `lib/utils.ts`: "`lib/cache-de-mutaciones.ts` — `sacarDeLaCacheAlAsentar`: saca de la caché de TanStack Query una mutación con datos sensibles (contraseñas, tokens) en cuanto se asienta".
10. **`README.md` raíz, §7** (hoy en la línea 228):
    - backend "74 archivos con 838 pruebas (hasta AUTH-03b: …, enlaces de registro de maestros)";
    - frontend "63 archivos con 985 pruebas";
    - adversarias: 27 archivos `*.ataque` en el backend y 31 en el frontend. El número de pruebas adversarias lo recuenta el orquestador con `vitest run --reporter=json`, como en 03a.

**Esperan a 03c:**
- §6: el ítem de la invitación masiva y la nota "En las formas 1 y 2";
- `maestros/lote` en la fila `admin` de §7;
- §14: la fila `tokens_cuenta` con `(tipo, creado_en)` y "Reglas de acceso a datos";
- §8, §9 y §18. Las dos viñetas de §18, incluida la del límite de tasa para `registro-maestro` e `invitacion`, van juntas en 03c, como marca el plan;
- ESSENTIALS: "o masiva" (se retira "Decidido para AUTH-03: invitación masiva") y "Asíncrono";
- `CLAUDE.md`: `textarea.tsx` e "invitación masiva" en la fila `admin`.

## Problemas que no bloquean
- **M-20:** `estado-vacio.tsx` exporta `AccionEstadoVacio`, un tipo que no es la interfaz de Props, desde el archivo de un componente (`CLAUDE.md`, regla 6). En 03c ese archivo está en "No se toca". Destino: `docs/ESTADO.md`, "el próximo encargo que toque `components/`".
- **M-21:** `EnlaceNuevo` envuelve el botón "Copiar enlace" en su `role="status"`, igual que `ContrasenaTemporal`. Es el mismo pendiente de ADMIN que ya existe ("anuncio redundante; comprobar con un lector de pantalla"): hay que sumar `enlace-nuevo.tsx` a esa fila de `docs/ESTADO.md`.
- **M-22:** `DESIGN.md` §7.9 dice "Encabezado: fijo" (propuesta aprobada), y `table.tsx` no lo fija (`sticky`). Con listas cortas no se nota. Destino: ADMIN, que construirá la tabla de usuarios. Hay que anotarlo en `docs/ESTADO.md` junto a P-02.

## Detalles menores
- La observación 1 del tester (el vencimiento se evalúa con el `ahora` previo a argon2, cientos de milisegundos) está definida así en §D-B5. Aceptada.
- R-17 (dos enlaces creados en el mismo minuto repiten el nombre accesible): riesgo aceptado por el plan.

## Desacuerdos arbitrados
Los dos de la ronda 1 (T-07 y T-10) están arbitrados arriba, y su implementación quedó verificada. No quedó ningún otro desacuerdo.

## 8. Contenido del commit de 03b
Con rutas explícitas, no `git add -A`:

```
git add backend/prisma/schema.prisma backend/prisma/migrations/20260928224422_enlaces_registro/
git add backend/src/adapters/README.md backend/src/adapters/auth/index.ts backend/src/adapters/auth/enlaces-registro.ts backend/src/adapters/db/index.ts backend/src/adapters/db/usuarios.ts backend/src/adapters/db/enlaces-registro.ts backend/src/app.ts backend/src/core/auth/enlaces-registro.ts backend/src/core/auth/enlaces-registro.test.ts backend/src/handlers/README.md backend/src/handlers/admin.ts backend/src/handlers/auth/registro-maestro.ts backend/src/middleware/README.md backend/src/middleware/rutas-publicas.ts
git add backend/test/ayudas-concurrencia.ts backend/test/bloqueo-usuario.integracion.test.ts backend/test/sesiones-y-cadena.ataque.test.ts backend/test/enlaces-03b-r1.ataque.test.ts backend/test/enlaces-03b-r2.ataque.test.ts backend/test/logs-03b-r1.ataque.test.ts backend/test/enlaces-registro.integracion.test.ts backend/test/registro-maestro.integracion.test.ts
git add frontend/src/app/router.tsx frontend/src/app/marco-r1.ataque.test.tsx frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx
git add frontend/src/components/estado-vacio.tsx frontend/src/components/estado-vacio.test.tsx frontend/src/components/layout/data.ts frontend/src/components/layout/contenedor-rol.test.tsx frontend/src/components/layout/estatico-r1.ataque.test.ts frontend/src/components/ui/badge.tsx frontend/src/components/ui/badge.test.tsx frontend/src/components/ui/badge-03b-r1.ataque.test.ts frontend/src/components/ui/table.tsx frontend/src/components/ui/table.test.tsx
git add frontend/src/features/admin/data.ts frontend/src/features/admin/hooks.ts frontend/src/features/admin/lib.ts frontend/src/features/admin/lib.test.ts frontend/src/features/admin/types.ts frontend/src/features/admin/maestros-view.tsx frontend/src/features/admin/maestros-view.test.tsx frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx frontend/src/features/admin/components/enlace-nuevo.tsx frontend/src/features/admin/components/formulario-generar-enlace.tsx frontend/src/features/admin/components/insignia-estado-enlace.tsx frontend/src/features/admin/components/registrados-del-enlace.tsx frontend/src/features/admin/components/tabla-enlaces.tsx
git add frontend/src/features/auth/data.ts frontend/src/features/auth/hooks.ts frontend/src/features/auth/types.ts frontend/src/features/auth/contrasena-visible.test.tsx frontend/src/features/auth/registro-maestro-view.tsx frontend/src/features/auth/registro-maestro-view.test.tsx frontend/src/features/auth/components/formulario-registro-maestro.tsx
git add frontend/src/lib/cache-de-mutaciones.ts frontend/src/lib/cache-de-mutaciones.test.ts frontend/src/services/apiClient.ts frontend/src/services/apiClient.test.ts frontend/src/services/authService.ts frontend/src/services/authService.test.ts frontend/src/styles/clases-r1.ataque.test.ts
git add shared/src/index.ts shared/src/enlaces-registro.ts
git add docs/DESIGN.md docs/ESTADO.md docs/trabajo/AUTH-03-ajustes-de-cuentas/ docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md CLAUDE.md README.md
```

- **Qué incluye:** son 66 rutas de código y pruebas (todas las que muestra `git status` en los paquetes), con las 6 `*.ataque` nuevas sin rastrear y la carpeta de la migración, más los documentos.
- **Qué no incluye:** nada del scratchpad, `backend/tmp/` ni `adapters/db/generated/`, que está en `.gitignore`.
- **Después del commit:** `git status --porcelain -- backend frontend shared docs` debe quedar vacío.
- **Hashes:** el orquestador anota en `aprobacion.md` el SHA-256 nuevo de cada archivo protegido que cambie (M-14) y lee `<Cb>` con `git log`.

## Para el humano
Nada que decidir en este cierre. La comprobación en navegador es una sola, al final de 03c. H-3 (copiar el enlace, registrarse en una ventana privada, revocar y volver a abrirlo) y H-5 (360 px) son los que prueban 03b en real.

---

# Verificación del resumen — AUTH-03c — implementación
Resultado: **DEVUELTO al programador.** Todas las cifras coinciden con mi corrida y el código está en verde. El resumen vuelve por dos motivos:
- no trae la última línea de salida de `lint`, `test` y `build`, que exige la regla nueva;
- una viñeta de "Pruebas requeridas" no está cubierta.

El tester no ataca hasta que el programador entregue la corrección y yo la verifique.

## Mi corrida y el resumen, lado a lado
Desde la raíz, 2026-09-28, con PA-01 comprobada antes del backend: regla `True / Inbound / Block / Public`, red `IZZI-F281` (Public, declarada de confianza) y Docker encendido.

| Dato | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run build` | "código 0" (sin última línea) | código 0; última línea "✓ built in 587ms" | Sí en el resultado. **Falta la última línea** en el resumen |
| `npm run lint` | "código 0 en `shared`, `backend` y `frontend`" (sin última línea) | código 0; Prettier "All matched files use Prettier code style!" en los tres; la última etapa es `tsc -b` del frontend, sin errores | Sí en el resultado. **Falta la última línea** |
| `npm run test`, backend | 77 archivos / 894 pruebas; 3 corridas | "Test Files 77 passed (77)" · "Tests 894 passed (894)", 1 corrida | Sí |
| `npm run test`, frontend | 64 archivos / 995 pruebas | "Test Files 64 passed (64)" · "Tests 995 passed (995)"; `npx vitest list`: 995 casos | Sí |
| Prisma | `migrate status` al día; `migrate diff` sin diferencias | "Database schema is up to date!" y "No difference detected." (código 0) | Sí |
| `enEspera=` en `.tsx` de producción | 20 | 20 | Sí |
| V-01 | 58/58 contra la tabla de "AUTH-03c — Ronda 0" | 58/58 (`sha256sum` contra esa tabla) | Sí |
| PA-07 | `P2028` = 2, los excluidos; los otros cuatro en 0 | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2: `handlers/auth/index.ts:134` (`Sesion`, login) y `handlers/auth/cuentas.ts:106` (`TokenCuenta`, `restablecer`) | Sí; no se activa |
| PA-11 | sin contenedores | Ryuk se retiró dentro de los 120 s | Sí |
| `worker-correo-de-cuenta.integracion` | 12 casos antes, 16 después, sin quitar ninguno | Títulos de `it(` contra `32afeef`: los 12 originales intactos y en su orden, más 4 al final. `git diff 32afeef`: 158 líneas agregadas y **1 quitada**, una línea de `import` que se reescribió. `vitest list`: 16 | Sí. La restauración es correcta |
| `invitacion-masiva.integracion` | 16 casos (10 más la matriz de 6) | `vitest list`: 16 | Sí |

**Desviación 2 (E6 de `bloqueo-usuario.integracion`):** de acuerdo. Sumar `invitaciones.ts` a la lista, cubrir también `$executeRaw` e ignorar los comentarios refuerza la prueba, no la debilita. Lo reviso línea por línea en la revisión final.

## "Pruebas requeridas" de 03c
Comprobé que existe cada título que cita el resumen: 45 títulos entre core (29), `cola` (3), `env` (3), `textarea` (2) y `maestros-view` (8), más los de `invitacion-masiva` y `worker`. Todos existen con ese texto exacto. Sobre la cobertura real:

- **No cubierta: "uno más → 409 y nada creado ni encolado".** El caso "uno más que el cupo → 409, sin crear nada" (`invitacion-masiva.integracion.test.ts:236`):
  - solo comprueba que no existan las **cuentas**, no los **tokens de invitación**;
  - pasa `alGuardar: async () => {}`, así que no hay nada que se pudiera encolar ni que se pueda observar;
  - "por construcción" no es una prueba.

  **Qué se espera:** el caso comprueba de verdad que el 409 no deja ni cuentas, ni tokens `invitacion` de esos candidatos, ni trabajos en `pgboss.job`. Por ejemplo, usando el `alGuardar` real (`encolarVarios`) o uno espía que registre si se llamó, y buscando en `tokens_cuenta` y en `pgboss.job`. Si el programador prefiere probarlo por HTTP, puede montar `adminHandler` con un `limiteDiarioInvitaciones` pequeño. La forma es suya, pero la aserción tiene que existir.
- **Cubierta, con una prueba para dos viñetas:** "las cuentas nacen como maestro, con un hash inutilizable compartido y un token de invitación cada una, encolado en `pgboss.job`" (`:133`). Las líneas no traen nombre (`listaDeCorreos` solo pone correos), así que las dos cuentas llevan el nombre provisional, y la prueba afirma `nombreSchema.safeParse(nombre).success`. Cubre de verdad M-07 y la viñeta de cuentas, hash, token y trabajo (`retry_limit` 3, `dead_letter` y el id igual al token). Aceptada.
- **Cubierta por composición: "dos lotes simultáneos con cupo para uno solo → uno 200 y el otro 409".** Se reparte en dos casos:
  - `:256`, en serie: el segundo ve el cupo consumido y recibe 409;
  - `:286`, concurrente de verdad: el segundo queda formado detrás del bloqueo consultivo, con cupo amplio.

  Juntos cubren el mecanismo, porque el conteo se lee después del bloqueo, en READ COMMITTED. La acepto así. **Recomiendo**, ya que el resumen vuelve de todos modos, una aserción que lo cubra en un solo caso: que la transacción retenedora de `:286` inserte un token de invitación antes de soltar el bloqueo, con cupo para uno solo, y que la llamada formada detrás reciba `CUPO_DIARIO_INSUFICIENTE`. No es condición para aceptar.
- **Worker (M-06, M-09):**
  - "tras un error del notifier, el siguiente trabajo espera" está cubierto: el caso afirma una espera mayor que 0 en el trabajo D, después del fallo de C.
  - "tras un omitido no se registra intento" también: el omitido nunca llega al notifier, que es el único punto donde se registra un intento.
- **El resto de las viñetas** (core, `cola`, `env`, autorización, lista mixta, cupo exacto, existentes sin cupo, carrera entre la lectura y la inserción, rollback de `alGuardar`, `textarea` y las cinco del frontend) tienen su caso y lo cubren.

## Qué debe traer la corrección del programador
1. **El resumen, con la regla completa** (`AGENTS.md`, "Resúmenes verificables del programador"): el comando exacto y la **última línea literal** de `npm run lint`, `npm run test` (por paquete) y `npm run build`.
2. **El caso del 409** con las aserciones de "nada creado ni encolado": sin cuentas, sin tokens `invitacion` de los candidatos y sin trabajos en `pgboss.job`. Con su título exacto en el mapeo de "Pruebas requeridas".
3. **Opcional:** la aserción de la carrera "cupo para uno solo" en `:286`.

No toca código de producción. Después de la corrección, repito esta verificación y, si coincide, el tester puede atacar.

---

# Verificación del resumen — AUTH-03c — corrección 1
Resultado: **ACEPTADO.** Las cifras y las líneas literales coinciden con mi corrida, la viñeta que faltaba queda cubierta de verdad y el único archivo que cambió es la prueba declarada. **El tester puede atacar 03c.**

## Mi corrida y el resumen, lado a lado
Desde la raíz, 2026-09-28, con PA-01 comprobada antes del backend: regla `True / Inbound / Block / Public`, red `IZZI-F281` (Public, declarada de confianza) y Docker encendido.

| Dato | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run build`, última línea | `✓ built in 594ms` | `✓ built in 672ms`, código 0 | Sí (solo cambia el tiempo de la corrida) |
| `npm run lint` | "All matched files use Prettier code style!" en los tres; después, `tsc` sin salida; código 0 | 3 × "All matched files use Prettier code style!"; la última línea es `> tsc -b` sin errores; código 0 | Sí |
| `npm run test`, backend | `Test Files  77 passed (77)` · `Tests  894 passed (894)` | `Test Files  77 passed (77)` · `Tests  894 passed (894)` | Sí |
| `npm run test`, frontend | `Test Files  64 passed (64)` · `Tests  995 passed (995)` | `Test Files  64 passed (64)` · `Tests  995 passed (995)` | Sí |
| Casos nuevos | ninguno (894 no cambia) | `invitacion-masiva.integracion`: 16 `it(`, los mismos que en la verificación anterior | Sí |
| V-01 | 58/58 | 58/58 contra la tabla de "AUTH-03c — Ronda 0" | Sí |
| PA-07 | `P2028` 2 (los excluidos); los demás en 0 | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2: `handlers/auth/index.ts:134` (`Sesion`) y `handlers/auth/cuentas.ts:106` (`TokenCuenta`) | Sí; no se activa |
| `Unhandled Rejection` y avisos | corregido | 0 "Unhandled", 0 "unhandled", 0 "PromiseRejection", 0 "Warning" en la salida completa del backend. Los 9 registros de nivel `error` son los mismos 9 de la corrida anterior, que las pruebas provocan a propósito | Sí |
| PA-11 | sin contenedores | sin contenedores de Testcontainers al terminar | Sí |
| Alcance | solo `backend/test/invitacion-masiva.integracion.test.ts` | `find … -newer revision.md` sobre `backend/src`, `backend/prisma`, `backend/test`, `frontend/src` y `shared/src`, sin el cliente generado: solo ese archivo. Ninguna `*.ataque` cambió (V-01) | Sí |

## El caso ampliado: "uno más que el cupo → 409, sin crear nada ni encolar nada"
Cubre la viñeta de verdad. **Falla si:**
- **`alGuardar` se llamara:** el espía marca `seLlamoAlGuardar`, y la aserción exige `false`. Si se llamara, además dejaría trabajos reales, porque envuelve el `encolarVarios` real.
- **Quedaran cuentas:** busca las de los tres candidatos por correo y exige longitud 0.
- **Quedaran tokens:** busca en `tokens_cuenta` los ids de los tokens de los tres candidatos y exige longitud 0.
- **Quedaran trabajos:** busca en `pgboss.job` esos mismos ids, que son los ids de los trabajos, y exige longitud 0.

Comprueba el estado final después del rechazo. Así, un orden de escritura distinto dentro de la transacción no la engaña: lo que importa es que nada sobreviva al 409.

## El caso reforzado (opcional, aplicado)
- **Qué hace:** la transacción retenedora toma el bloqueo consultivo y comprueba con `pg_blocking_pids` que la llamada real quedó formada detrás. Antes de soltar el bloqueo, inserta un token de invitación, con el límite fijado en `usadasAntes + 1` antes de abrir la transacción. La llamada formada detrás recibe `CUPO_DIARIO_INSUFICIENTE` y no crea la cuenta. Cubre en un solo caso "con cupo para uno solo, uno pasa y el otro 409".
- **El rechazo no manejado:** la corrección es correcta. El `.then(éxito, error)` observa la promesa sin tragarse el resultado, que se afirma después con `rejects`.
- **Nota para la revisión final, no bloquea:** la espera de la precondición (hasta 10 s) corre dentro de una transacción interactiva de Prisma, cuyo límite es de 5 s. Si la precondición tardara, saldría un `P2028` en esta prueba, que PA-07 no excluye. En las corridas no ocurre, porque la llamada se forma en milisegundos.

## Siguiente paso
El tester puede empezar la ronda 1 de 03c.

---

# Verificación del resumen — AUTH-03c — corrección de la ronda 1
Resultado: **DEVUELTO al programador.** Las cifras y las líneas literales coinciden con mi corrida, y T-14 y T-15 están bien corregidos. Pero la corrección de T-13 volvió deterministas los dos casos de la carrera del cupo **quitándoles lo que prueban**: los dos pasarían aunque el segundo lote no viera el cupo que consumió el primero. La viñeta "dos lotes simultáneos con cupo para uno solo → uno 200 y el otro 409 (bloqueo consultivo)" queda sin cubrir. La acepté por composición en la verificación de la implementación, y ahora ninguno de los dos casos la sostiene.

## Mi corrida y el resumen, lado a lado
Desde la raíz, 2026-09-28, con PA-01 comprobada antes del backend: regla `True / Inbound / Block / Public`, red `IZZI-F281` (Public, declarada de confianza) y Docker encendido.

| Dato | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run build`, última línea | `✓ built in 666ms` | `✓ built in 572ms`, código 0 | Sí (solo cambia el tiempo) |
| `npm run lint` | código 0; Prettier en los tres y `tsc` sin salida | código 0; igual | Sí |
| `npm run test`, frontend | `Test Files  65 passed (65)` · `Tests  1007 passed (1007)` | igual | Sí |
| `npm run test`, backend | `Test Files  81 passed (81)` · `Tests  930 passed (930)` | igual en **2 corridas completas** | Sí |
| El par del tester, en los dos órdenes | `Test Files 2 passed (2)` · `Tests 43 passed (43)`, 3 veces cada orden | 3 veces en el orden pedido y 1 en el inverso: `2 passed (2)` · `43 passed (43)` las 4 | Sí |
| V-01 | 63/63 | 63/63 contra la tabla de "AUTH-03c — Ronda 1" | Sí |
| PA-07 | `P2028` 2, los excluidos | en las 2 corridas: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2: `handlers/auth/index.ts:134` (`Sesion`) y `handlers/auth/cuentas.ts:106` (`TokenCuenta`). Sin `Unhandled` | Sí |
| Casos contra `32afeef` | `invitacion-masiva.integracion` 16; `maestros-view.test.tsx` 24 | 16 (archivo nuevo en 03c, igual que en la verificación anterior); `maestros-view` 16 en `32afeef` y 24 hoy, sin ninguno perdido | Sí |
| Alcance | solo `invitacion-masiva.integracion.test.ts`, `formulario-invitacion-masiva.tsx`, `data.ts` y `maestros-view.test.tsx` | Desde mi verificación anterior, en los paquetes cambiaron esos 4 y los 5 `*.ataque` nuevos del tester. Nada más | Sí |

## El problema: T-13, parte 2
- **"un segundo lote justo después del primero ve el cupo ya consumido: uno pasa y el otro 409"**. El lote B evalúa con `evaluarCupo({ limite: usadas, usadas, solicitadas })`, es decir, con margen 0. Con eso, **B recibe 409 siempre**, haya o no un lote A antes y vea o no su token. El título afirma "ve el cupo ya consumido", y la prueba ya no lo comprueba.
- **"dos lotes lanzados a la vez quedan en serie: el segundo, ya sin cupo, recibe CUPO_DIARIO_INSUFICIENTE (M-04)"**. También evalúa con `limite: usadas`, así que el 409 no depende de la serie. Lo único que sigue probando es que la llamada queda formada detrás del bloqueo consultivo (`pg_blocking_pids`), no que su conteo, **leído después del bloqueo**, incluya lo que confirmó quien lo tenía.

Una regresión que moviera el `count` antes del `pg_advisory_xact_lock` en `invitarMaestrosEnLote`, que es justo el error que el bloqueo evita (dos lotes simultáneos que rebasan el cupo), pasaría con los dos casos en verde.

Los 4 pares y las 2 suites en verde confirman que son deterministas, pero no que protejan algo. La observación del coordinador es correcta en la otra dirección: con conteos globales, "leer `usadas` en su momento" no basta para fijar un límite con sentido, porque el conteo puede subir o bajar entre los dos lotes.

## Qué se espera (resultado, no implementación)
Que al menos un caso cumpla las dos condiciones:
1. **Falla** si el conteo del segundo lote no incluye las invitaciones que el primero confirmó bajo el bloqueo consultivo. Por ejemplo, si el `count` se hiciera antes del bloqueo.
2. **Es determinista** aunque otros archivos creen o borren invitaciones en paralelo.

**Una forma posible,** sin cambiar el código de producción:
- `invitarMaestrosEnLote` recibe `desde`, así que el caso puede contar solo una ventana que ningún otro archivo toca;
- la transacción retenedora inserta su token de invitación con un `creado_en` explícito en una fecha futura propia del caso (por ejemplo, un instante de 2100 con un id aleatorio);
- la llamada formada detrás usa `desde` igual a ese instante y `limite: 1`;
- si la llamada ve el token confirmado, `usadas` = 1 y recibe 409; si no lo ve, `usadas` = 0 y recibe 200.

La forma es del programador. El caso secuencial, si se conserva, debe cumplir lo mismo o cambiar su título para no afirmar lo que no comprueba.

**Registrar como hallazgo del resumen:** la sección "Desviaciones" dice "Ninguna", pero el cambio a margen 0 retiró cobertura de una viñeta del plan. Es la misma clase de omisión no declarada de rondas anteriores.

## T-14, T-15 y la parte 1 de T-13: correctos
- **T-14:** el `Textarea` lleva siempre `aria-describedby="lista-invitacion-masiva-ayuda"`, y suma el id del error cuando lo hay. Es el mismo patrón que `nombre-ayuda` y `describeContrasena`.
- **T-15:** `lineaInvalida` termina en `" · "`, así que el `<li>` se lee como "Línea N · texto · motivo". `resultado-invitacion-masiva.tsx` no cambió.
- **T-13, parte 1:** las dos pruebas que no son del cupo usan una app con `INVITACIONES_LIMITE_DIARIO = 10_000`. Es razonable: la suite no se acerca a ese número.

## Qué debe traer la corrección
1. El caso o los casos de la carrera del cupo, con las dos condiciones de arriba, y sus títulos exactos en el mapeo de "Pruebas requeridas".
2. La salida literal de `lint`, `test` y `build`. El par del tester, al menos 3 veces. La suite completa del backend, al menos 2 veces.
3. "Desviaciones" corregida.

Sin cambios en el código de producción. Después repito esta verificación. Si coincide, el tester hace la ronda 2.

---

# Verificación del resumen — AUTH-03c — corrección 2 de la ronda 1
Resultado: **ACEPTADO.** Las cifras y las líneas literales coinciden con mi corrida. El caso nuevo es determinista y **falla con el defecto**: lo comprobé yo mismo sobre una copia en el scratchpad, sin tocar el repositorio. `invitaciones.ts` cuenta `usadas` después del bloqueo consultivo. **El tester puede hacer la ronda 2 de 03c.**

## Mi corrida y el resumen, lado a lado
Desde la raíz, 2026-09-28, con PA-01 comprobada antes del backend: regla `True / Inbound / Block / Public`, red `IZZI-F281` (Public, declarada de confianza) y Docker encendido.

| Dato | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run build`, última línea | `✓ built in 580ms` | `✓ built in 583ms`, código 0 | Sí (solo cambia el tiempo) |
| `npm run lint` | código 0; Prettier en los tres y `tsc` sin salida | código 0; 3 × "All matched files use Prettier code style!" | Sí |
| `npm run test`, frontend | `Test Files  65 passed (65)` · `Tests  1007 passed (1007)` | igual | Sí |
| `npm run test`, backend | `Test Files  81 passed (81)` · `Tests  930 passed (930)`, 3 veces | igual en **2 corridas completas** | Sí |
| El par del tester, en los dos órdenes | `2 passed (2)` · `43 passed (43)`, 3 veces cada orden | 3 veces en el orden pedido y 1 en el inverso: `2 passed (2)` · `43 passed (43)` las 4 | Sí |
| Casos de `invitacion-masiva.integracion` | 16, sin cambio de cantidad | 16 `it(` | Sí |
| V-01 | 63/63 | 63/63 contra la tabla de "AUTH-03c — Ronda 1" | Sí |
| PA-07 | `P2028` 2 (los excluidos) | en las 2 corridas: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2: `handlers/auth/index.ts:134` (`Sesion`) y `handlers/auth/cuentas.ts:106` (`TokenCuenta`). 0 `Unhandled` | Sí |
| PA-11 | sin contenedores | sin contenedores de Testcontainers al terminar | Sí |
| Alcance | solo la prueba; `invitaciones.ts` tocado y revertido | Desde mi verificación anterior cambiaron solo `backend/test/invitacion-masiva.integracion.test.ts` y `backend/src/adapters/db/invitaciones.ts`. Del segundo, la fecha de modificación prueba que se tocó, no que se revirtió (abajo) | Sí, con la nota de abajo |

## `invitaciones.ts`: el conteo está después del bloqueo
- **Lo leí completo.** El orden es:
  1. `await tx.$executeRaw\`SELECT pg_advisory_xact_lock(…)\``;
  2. `const usadas = await tx.tokenCuenta.count({ where: { tipo: "invitacion", creadoEn: { gte: desde } } })`;
  3. existentes → `evaluarCupoDelLote` → `createMany` → relectura → tokens → `alGuardar`.

  Es el orden de §D-C3, y el mismo que describí en la verificación de la implementación ("el conteo se lee después del bloqueo").
- **Límite de lo que puedo afirmar:** no guardé una copia byte a byte del archivo de entonces. El archivo no está en ningún commit (es nuevo en 03c), así que `git status` no detecta un cambio de contenido, y el "`git status` limpio antes y después" del resumen no prueba la reversión. Lo que sí queda probado:
  - el orden correcto, por lectura;
  - que el caso nuevo pasa con el archivo actual y falla con el conteo antes del bloqueo (mi experimento, abajo);
  - que las suites completas pasan.

  **SHA-256 del archivo hoy, para las verificaciones siguientes:** `3c59b911f76532ece8c9b30d8e797f8e7020d82ce8e71a423167e1392e72003b`. El tester y la revisión final pueden compararlo.
- **Nota de proceso, no bloquea:** alterar código de producción para simular un defecto conviene hacerlo sobre una copia, como hice abajo, y no sobre el archivo real. Así la reversión no depende de la palabra de quien lo hizo.

## El caso nuevo: determinista y sensible al defecto
"dos lotes lanzados a la vez quedan en serie: el segundo, formado detrás del bloqueo, ve el cupo que confirmó el primero (M-04)".

- **Es determinista.** La llamada cuenta solo desde su ventana propia (`desde` = 2100-01-01) con `limite: 1`. El único token en esa ventana es el que la retenedora inserta con `creadoEn` explícito, bajo el bloqueo y después de comprobar con `pg_blocking_pids` que la llamada quedó formada detrás.
  - Busqué en `backend/test` y `backend/src`: ninguna otra prueba ni código crea tokens de cuenta con fechas de 2100.
  - Lo que otros archivos creen o borren en paralelo cae fuera de esa ventana.
- **Falla con el defecto.** Lo comprobé sin tocar el repositorio:
  - copié `invitaciones.ts` a `scratchpad/defecto/` en dos versiones: control, igual, e `invitaciones-defecto.ts`, con el `count` movido antes de `pg_advisory_xact_lock`;
  - las ejecuté con una configuración de Vitest del scratchpad que redirige la importación `../src/adapters/db/invitaciones.js` de la prueba a la copia, y filtré por el título del caso;
  - **control:** `Tests  1 passed | 15 skipped (16)`, código 0;
  - **defecto:** `AssertionError: promise resolved "{ insertados: [ { …(2) } ], …(1) }" instead of rejecting` y `Tests  1 failed | 15 skipped (16)`, código 1.

  Es el mismo resultado que declara el programador.
- **El caso secuencial retitulado** ("dos lotes evaluados con márgenes independientes: …") ya no afirma lo que no prueba. Queda como está.
- **La desviación** de la corrección anterior ahora está declarada.

## Observación para la revisión final (no bloquea)
Mientras existe, el token de 2100 también cuenta en la ventana de 24 h de los demás archivos (`creado_en >= ahora - 24 h` incluye fechas futuras): durante unos milisegundos, `usadas` global sube en 1. Las pruebas del cupo que leen `usadas` bajo el bloqueo no se ven afectadas, y la de "cuatro lotes simultáneos" del tester solo exige todo o nada. Se anota por si una prueba futura depende del conteo global.

## Siguiente paso
El tester puede hacer la ronda 2 de 03c.

---

# Revisión final — AUTH-03c — final
Veredicto: **APROBADO.** Queda pendiente la comprobación humana en navegador, que va después de este veredicto y antes del commit de 03c.

## Verificación propia
2026-09-28, desde la raíz, con PA-01 comprobada antes del backend: regla `True / Inbound / Block / Public`, red `IZZI-F281` declarada de confianza y Docker encendido.

- **build:** 0. Última línea: `✓ built in 617ms`.
- **lint:** 0, con 3 × "All matched files use Prettier code style!" y `tsc` sin errores.
- **test:**
  - frontend: `Test Files  65 passed (65)` · `Tests  1007 passed (1007)`;
  - backend, **2 corridas completas**: `Test Files  82 passed (82)` · `Tests  932 passed (932)` las dos.
- **Prisma** (V-03, solo lectura sobre `campus_dev`):
  - `validate` 0 y `format --check` 0;
  - `migrate status`: "5 migrations found… Database schema is up to date!";
  - `migrate diff --exit-code`: "No difference detected.", código 0.
- **PA-07**, en las 2 corridas: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2. Los dos `P2028` son los excluidos: `handlers/auth/index.ts:134` (`Sesion`) y `handlers/auth/cuentas.ts:106` (`TokenCuenta`). No hay ningún `Unhandled`. No se activa.
- **PA-11:** sin contenedores de Testcontainers al terminar.
- **V-01:** 64/64 contra la tabla de "AUTH-03c — Ronda 2".
- **V-04:**
  - 20 `enEspera=`;
  - SQL etiquetado solo en `salud.ts`, `bloqueo-usuario.ts`, `enlaces-registro.ts` e `invitaciones.ts`, más el único `$queryRawUnsafe` de `cliente.ts`;
  - 0 `console.` y 0 `estadoPago` en los archivos nuevos del backend;
  - 0 `?? []`.
- **V-05:**
  - **Dentro de los paquetes** (base `32afeef`): vacía para cada ruta de "No se toca" de 03c (`handlers/auth/**`, `adapters/auth/**`, `adapters/db/{usuarios,tokens-cuenta,enlaces-registro,cliente,bloqueo-usuario,sesiones}.ts`, `middleware/**`, `notifier/**`, `queue/colas.ts`, `workers/correo-de-cuenta.ts`, `config/{auth,cola,correo,logger}.ts`, `core/eventos/**`, `app/**`, `services/**`, `features/auth/**`, `components/layout/**`, `components/estado-vacio.tsx`, `components/ui/{table,badge,button,input}.tsx`, `tokens.css`, `cuentas-view.tsx`, las 4 migraciones anteriores, los `package.json` e `infra/`).
  - **Fuera de los paquetes:** los 7 archivos protegidos coinciden con **el último** SHA-256 de `aprobacion.md`: `AGENTS.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md`, `README.md`, `programador.md` y `manager.md`.
- **V-06:** `sesiones-y-cadena` fija la lista exacta con `POST /api/admin/maestros/lote`, y pasa. `RUTAS_PUBLICAS` no cambia.
- **`invitaciones.ts`:** su SHA-256 es `3c59b911…2003b`, igual al que anoté. El `count` va después de `pg_advisory_xact_lock`.

## Problemas que bloquean
Ninguno.

## 1. Diff contra el plan
**Está lo de 03c, completo:**
- **shared:** esquemas, `contarLineasConContenido` y `CUPO_DIARIO_INSUFICIENTE`.
- **core:** `invitacion-masiva.ts` (analizador, `nombreProvisionalDe` según M-07 y M-12, `evaluarCupo`) y `correo/ritmo.ts`, con sus pruebas.
- **Migración** del índice `(tipo, creado_en)`.
- **adapters:** `invitaciones.ts` (bloqueo consultivo con `$executeRaw`, conteo, `createMany` con `skipDuplicates`, relectura, tokens y `alGuardar`) y `encolarVarios`, con `sql` obligatorio y un solo `insert`.
- **Rutas:** `POST /admin/maestros/lote` con `protegido({ roles: ["admin"] })`. Todo el argon2 va antes de la transacción, con un solo hash inutilizable.
- **Configuración:** `INVITACIONES_LIMITE_DIARIO` en `config/env.ts` (1 a 10,000, 80 por defecto), con su prueba y `backend/.env.example`.
- **Worker:** el ritmo según M-06 y M-09, con el `finally` y sin `catch`.
- **Frontend:** `textarea.tsx`, el panel de la masiva, el resultado y "Generar enlace" en `outline`.
- **`DESIGN.md`** §7.3 y §7.15.

**Solo eso:** no hay cambios fuera de "Cambios por capa" de 03c.
- `infra/` no cambia: la variable tiene su valor por defecto.
- `worker-correo-de-cuenta.integracion` conserva sus 12 casos de AUTH-02 y suma 4.

**La migración** es exactamente §D-C2: un `CREATE INDEX "tokens_cuenta_tipo_creado_en_idx" ON "tokens_cuenta"("tipo", "creado_en")`. Es compatible hacia atrás, porque solo agrega un índice, y `migrate diff` queda limpio.

## 3. R-10 (`*.ataque` reescritas en la ronda 0 de 03c)
- **C-11, `sesiones-y-cadena`:** solo suma `"POST /api/admin/maestros/lote"` a la lista exacta y actualiza el título. El analizador por sangría no cambia. Conserva lo que protege: ninguna ruta crea administradores, y crean maestros solo las dos rutas del admin y `registro-maestro`.
- **C-17, `clases-r1`:** pasa de 19 a 20 y suma `formulario-invitacion-masiva.tsx: 1` a la lista fija de archivos. El resto de la lista cerrada y V-13 (5 archivos) no cambian.

Ninguna protección se debilita.

## 4. Definición de terminado, reglas, estilo y diseño
- **RF-04e cumple:**
  - la lista acepta un nombre opcional por línea;
  - el resultado reporta enviadas, ya existentes e inválidas;
  - respeta el cupo diario (B-01 A: rechazo completo con `409 CUPO_DIARIO_INSUFICIENTE`).
- **Autorización:** matriz completa por HTTP, en `invitacion-masiva.integracion` y en `invitacion-masiva-03c-r1`. Sin `estadoPago` ni ids en la respuesta.
- **Consultas:**
  - el cupo usa el índice nuevo; la búsqueda de existentes, el índice único de `email`; la relectura, la PK;
  - la entrada se acota a 100 líneas;
  - no hay N+1;
  - todo va en una transacción, **incluido el encolado**.
- **Reglas que no se rompen:**
  - lo lento va por la cola: un trabajo por token, que hereda la política de la cola, y el correo sale solo por `notifier`;
  - fechas en UTC;
  - ningún correo de la lista en los logs (`logs-03c-r1`);
  - nada de AWS;
  - migración compatible;
  - `.env.example` al día.
- **Estilo de `CLAUDE.md`:** retornos tempranos, errores tipados en core, ningún `try/catch` en el handler, tipos inferidos de `shared/` y sin `?? []`.
- **Diseño:**
  - **§7.3:** documenta `textarea.tsx`, con el mismo foco (`focus-visible:border-accent`), `text-body`, altura por filas y `resize-y`, y la regla de un solo `primary` en una vista con dos paneles.
  - **§7.15**, nueva, "Resumen de una acción por lote": `role="status"`, grupos con su conteo y sin grupos vacíos. El motivo va en la insignia `danger`.
  - Lo comprobé en el código: **un solo `primary` en `/admin/maestros`** ("Enviar invitaciones") y **"Generar enlace" en `outline`**.
  - `autoComplete="off"` y `spellCheck={false}` en la lista, que son datos de terceros.
  - La ayuda del campo es su descripción accesible (T-14), y el contador va en `aria-live="polite"` sin `role="status"`.
  - Textos en español de México; el estado nunca va solo con color.

## 5. Observaciones del tester: decisiones
| # | Decisión | Por qué y destino |
|---|---|---|
| (a) El ritmo no llega a actuar; un lote de 80 tarda unos 160 s, no 20 s | **Se corrigen los textos, no el código** | El mínimo de 250 ms es correcto y está probado. Lo que no es cierto es "unos 20 s" (R-06 y la Enmienda 2), porque el sondeo de pg-boss (2 s, un trabajo a la vez) marca el paso real. El texto de §9 de abajo ya lo dice. En `docs/ESTADO.md`, para DEPLOY, junto al pendiente de Resend: "si el volumen lo pide, ajustar `pollingIntervalSeconds` del consumidor o dar prioridad a las recuperaciones". Una recuperación puede esperar unos 2.7 min detrás de un lote de 80, muy por debajo de los 30 min de su enlace |
| (b) El nombre de la respuesta no está normalizado; el guardado sí | **Se acepta** | Es cosmético: el HTML colapsa los espacios al pintar. Lo que se guarda y lo que ve el maestro al activar su cuenta están normalizados |
| (c) Textos sin usar o repetidos en `features/admin/data.ts` y "1 invitaciones" en plural | **Pendiente, por el carril trivial** | "Hoy solo puedes enviar 1 invitaciones más" es un error de concordancia visible. Viene del texto literal del plan (§D-C1), así que no es un defecto del programador. Destino en `docs/ESTADO.md`: el próximo encargo que toque `features/admin` o el mensaje del cupo (ADMIN), antes de DEPLOY. Se corrige en `evaluarCupo` (singular con N = 1) y en su prueba unitaria, y se retiran `demasiadasLineas` y el `sinNombre` duplicado |
| (d) Un U+202E en una línea no válida puede invertir la insignia en pantalla | **Pendiente, sin punto en la comprobación humana** | El texto es del propio admin y no afecta a nadie más. Reproducirlo a mano en el navegador no cabe en una comprobación de 10 minutos. La corrección es aislar el texto con `<bdi>` (o `dir="auto"`) en `resultado-invitacion-masiva.tsx`. Destino: ADMIN, en `docs/ESTADO.md` |
| (e) La espera de 10 s de la precondición dentro de una transacción interactiva de 5 s | **Pendiente para un `chore` de pruebas** | En más de 20 corridas no ocurrió: es una fragilidad latente. Si ocurriera, saldría un `P2028` que PA-07 no excluye. Se corrige bajando el límite de la espera a menos de 5 s o pasando `timeout` a `$transaction`. Aplica a `invitacion-masiva.integracion` (`:316`) y conviene revisar el mismo patrón en `ayudas-concurrencia.ts`. Destino: CHORE-02 o el primer `chore` de pruebas, en `docs/ESTADO.md` |
| (f) El token de 2100 suma 1 al conteo global mientras existe | **Se acepta y se anota junto a (e)** | Dura milisegundos. Hoy ninguna prueba depende del conteo global. Nota para quien escriba pruebas del cupo: leer `usadas` bajo el bloqueo o usar una ventana propia |

## 6. Comprobación humana en navegador (hoja final)
**Máximo 10 minutos y 7 puntos; solo lo que las pruebas no ven. La hace el humano. Ningún agente abre navegadores.**

Hoy son 6 puntos. La hoja del plan sigue valiendo con lo implementado; solo le agrego los pasos de arranque y precisiones.

**Arranque** (tres terminales de PowerShell; README, "Backend en local", pasos 6 y 8, y "Frontend en local", paso 3):
1. `infra/`: `docker compose up -d` (PostgreSQL, MinIO y LiveKit).
2. `backend/`: `npm run dev` (API en `127.0.0.1:3000`).
3. `backend/`, en otra terminal: `npm run dev:worker`. Escribe los correos como HTML en `backend/tmp/correos/`, y nunca llama a Resend fuera de `production`.
4. `frontend/`: `npm run dev` (SPA en `http://127.0.0.1:5173`).
5. Entra como administrador en `/login` con `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `backend/.env`.

**Correos:** abre el más reciente con
`Invoke-Item (Get-ChildItem backend\tmp\correos | Sort-Object LastWriteTime | Select-Object -Last 1).FullName`
y sigue su enlace. Con el sondeo de pg-boss, cada correo tarda unos 2 s en aparecer.

**Puntos:**
- **H-1 · Cambio obligatorio sin la temporal** (el único punto que prueba en real la cookie de B-03: proxy de Vite, `Path` y `SameSite`).
  1. En una ventana privada, crea en `/registro` una cuenta de estudiante de prueba (por ejemplo, `h1@pruebas.local`) y cierra sesión.
  2. Como admin, en `/admin`, búscala por su correo, usa "Restablecer contraseña" y copia la temporal.
  3. En la ventana privada, entra con la temporal: debe llevarte a `/cambiar-contrasena`, que pide **solo** "Contraseña nueva" y "Confirma la contraseña nueva".
  4. Guarda. Debes llegar a la pantalla de inicio del estudiante sin volver al login.
- **H-2 · Nombre al activar la invitación.** En `/admin`, invita a un maestro (por ejemplo, "Ana Lopez", `h2@pruebas.local`) y abre su correo. En `/establecer-contrasena` debe verse "Ana Lopez" en "Nombre completo". Corrígelo a "Ana López", elige la contraseña, entra con ella y comprueba que la barra superior dice "Ana López".
- **H-3 · Enlace de registro.**
  1. En `/admin/maestros`, genera un enlace, pulsa "Copiar enlace" y pégalo en una ventana privada.
  2. Regístrate como maestro (`h3@pruebas.local`): debes llegar a la pantalla de inicio del maestro.
  3. De vuelta en la lista, el enlace debe mostrar 1 registrado, con su nombre en "Ver registrados".
  4. Revócalo y vuelve a abrir el mismo enlace en la ventana privada: debe decir que no es válido.
- **H-4 · Invitación masiva.** En `/admin/maestros`, en "Invitar a varios maestros", pega:
  ```
  h4a@pruebas.local, Beto Ruiz
  h4b@pruebas.local
  h2@pruebas.local
  no-es-un-correo
  h4a@pruebas.local
  ```
  Envía. El resumen debe decir 2 enviadas, 1 que ya tenía cuenta y 2 no válidas, con sus motivos. En `backend/tmp/correos/` deben aparecer **solo dos** correos nuevos. El de `h4b` saluda con el nombre provisional "h4b".
- **H-5 · 360 px.** Con las herramientas del navegador a 360 px de ancho, en `/admin/maestros`, la tabla de enlaces se desplaza dentro de su contenedor y la página no. La barra inferior muestra "Cuentas" y "Maestros", y el panel de la masiva se lee completo.
- **H-6 · Gestor de contraseñas**, en **un solo navegador** (el de uso diario):
  - sugiere una contraseña nueva en `/registro-maestro` y en `/cambiar-contrasena`;
  - no rellena el formulario de invitación de `/admin` ni la lista de `/admin/maestros`.

Lo demás queda "no verificado por decisión del humano, cubierto por pruebas automáticas". El contraste de las insignias lo cubre `tokens.test.ts`.

**Datos de prueba:** las cuentas `h*@pruebas.local` quedan en `campus_dev`. Son ficticias y se pueden quedar (`docs/ESTADO.md` §4).

## 7. Documentos que el orquestador aplica al cerrar 03c
Texto final, ajustado a lo implementado.

1. **`ARCHITECTURE.md` §6, viñeta "Maestros"** (hoy en las líneas 187 a 191). Se reemplaza entera:
   > - **Maestros:** no hay registro público abierto de maestros (D-04). Se dan de alta de tres formas:
   >   1. **Invitación individual** (`POST /admin/maestros`).
   >   2. **Invitación masiva** (`POST /admin/maestros/lote`): el admin pega hasta 100 líneas con un correo y, opcionalmente, un nombre. Una línea sin nombre usa un nombre provisional (la parte local del correo, el correo completo o "Maestro invitado"). El lote se rechaza completo (`409 CUPO_DIARIO_INSUFICIENTE`) si sus correos nuevos rebasan el cupo `INVITACIONES_LIMITE_DIARIO` (80 por defecto), que cuenta las invitaciones creadas en las últimas 24 horas. Las cuentas, sus tokens y un trabajo de correo por maestro se crean en una sola transacción, bajo un bloqueo consultivo que deja en serie dos lotes simultáneos.
   >   3. **Enlace de registro** que genera el admin (`POST /admin/enlaces-registro`): token aleatorio de 256 bits, mostrado una sola vez y guardado solo como SHA-256 (`enlaces_registro`). Vigencia de 1 a 30 días, 7 por defecto; sin límite de usos; revocable. Con él, `POST /auth/registro-maestro` crea una cuenta de maestro con la sesión iniciada y guarda en `usuarios.enlace_registro_id` el enlace usado; el admin ve quién se registró con cada uno. El registro toma `FOR NO KEY UPDATE` sobre la fila del enlace y la revocación fija su hora después de obtener ese mismo bloqueo, así que ninguno confirma después de que la revocación respondió y ningún registrado queda con fecha posterior a la revocación.
   >
   >   En las formas 1 y 2, la cuenta nace con una contraseña inutilizable y el maestro recibe por correo un enlace de un solo uso (72 horas) para establecer su contraseña. Al abrirlo ve su nombre (`POST /auth/invitacion`) y puede corregirlo antes de guardar.
2. **`ARCHITECTURE.md` §7, fila `admin`** (hoy en la línea 239). Se agrega `POST /admin/maestros/lote` después de la invitación individual:
   > | `admin` | usuarios (`POST /admin/maestros` (invitación), `POST /admin/maestros/lote` (invitación masiva), `GET/POST /admin/enlaces-registro`, `POST /admin/enlaces-registro/{id}/revocar`, `GET /admin/enlaces-registro/{id}/registrados`, `POST /admin/usuarios/buscar`, `POST /admin/usuarios/{id}/restablecer-contrasena`, `PUT /admin/usuarios/{id}/correo`, baja), clases, `PUT /admin/alumnos/estado-pago` (por lote), `PUT /admin/alumnos/{id}/acceso`, anuncios, `GET/PUT /admin/configuracion/avisos-correo`, KPIs, analytics |
3. **`ARCHITECTURE.md` §8, fila `CORREO_DE_CUENTA`** (hoy en la línea 257). Se agrega al final de su descripción:
   > La invitación masiva encola un trabajo por maestro con un solo `insert` dentro de su transacción.
4. **`ARCHITECTURE.md` §9, "Reglas":**
   - en la viñeta "Plan gratuito: 3,000 correos al mes." (hoy en la línea 290), después de "al mes", agregar ", 100 al día (por día calendario UTC) y 10 peticiones por segundo por equipo";
   - viñeta nueva, al final (corregida según (a)):
     > - El worker deja al menos 250 ms entre dos intentos de envío a Resend: antes de cada trabajo espera lo que falte desde el último intento que llegó al notifier, también si lanzó. En la práctica, el sondeo de pg-boss (cada 2 s, un trabajo a la vez) marca el paso, así que un lote de 80 invitaciones tarda unos 2.7 minutos en salir. La invitación masiva respeta además un cupo de 80 invitaciones en una ventana móvil de 24 horas (`INVITACIONES_LIMITE_DIARIO`), más estricta que el día UTC de Resend, que deja margen a las recuperaciones.
5. **`ARCHITECTURE.md` §14:**
   - la fila `tokens_cuenta` (hoy en la línea 375) se reemplaza por:
     > | `tokens_cuenta` | `id`, `usuario_id`, `tipo` (`recuperacion` / `invitacion`), `hash_token`, `expira_en`, `usado_en`, `revocado_en`, `creado_en`, `actualizado_en` | `hash_token` único · índice `(usuario_id)` · índice `(tipo, creado_en)` (cupo diario de invitaciones) · FK con `ON DELETE CASCADE` |
   - en "Reglas de acceso a datos" (hoy desde la línea 395), una viñeta nueva después de "Protocolo de bloqueo por usuario":
     > - **Altas en lote** (invitación masiva): una transacción con el bloqueo consultivo de invitaciones (`pg_advisory_xact_lock`, tomado con `$executeRaw`) y, después de él, el conteo del cupo; `createMany` con `skipDuplicates`, la relectura por id de lo insertado y un solo `insert` de pg-boss con la conexión de la transacción. Ninguna consulta por línea y ningún `P2002` atrapado.
6. **`ARCHITECTURE.md` §18, "Requisitos previos a abrir la plataforma"**. Dos viñetas nuevas al final:
   > - El límite de tasa del borde cubre también `POST /auth/registro-maestro` y `POST /auth/invitacion` (AUTH-03).
   > - Desplegar el backend antes que el frontend cuando un encargo cambia un cuerpo de petición (AUTH-03: `cambiar-contrasena` y `establecer-contrasena`). Para el volumen de correo en producción, ver el pendiente de DEPLOY en `docs/ESTADO.md` ("Evaluar plan de pago de Resend") (AUTH-03).
7. **ESSENTIALS, "Autenticación"** (hoy en la línea 43). Desde "Maestros:" hasta "Admin:", se reemplaza por (retira "Decidido para AUTH-03: invitación masiva."):
   > Maestros: los da de alta el admin, por invitación individual o masiva (enlace de un solo uso por correo, 72 h; al activarlo, el maestro ve y puede corregir su nombre), o se registran con un enlace de registro que genera el admin (token aleatorio mostrado una sola vez y guardado solo como hash; vigencia de 1 a 30 días, 7 por defecto; revocable; el admin ve quién se registró con cada enlace; D-04).

   `Admin: npm run seed:admin, cuenta única, sin endpoint.` se conserva al final.
8. **ESSENTIALS, "Asíncrono"** (hoy en la línea 77). "La invitación masiva (AUTH-03) respeta los límites diarios de Resend." se reemplaza por:
   > La invitación masiva se rechaza completa si rebasa el cupo `INVITACIONES_LIMITE_DIARIO` (80 invitaciones en las últimas 24 h; Resend gratuito: 100 correos por día UTC) y encola un trabajo por maestro en su misma transacción; el worker deja al menos 250 ms entre dos intentos de envío.
9. **`CLAUDE.md`:**
   - fila `admin` (hoy en la línea 64): "enlaces de registro de maestros (`/admin/maestros`)" pasa a "enlaces de registro de maestros e invitación masiva (`/admin/maestros`)";
   - `components/ui/` (hoy en la línea 69): después de "`table.tsx` y `badge.tsx` (sus variantes son internas y no se exportan)", agregar ", y `textarea.tsx`".
10. **`README.md` raíz, §7** (hoy en la línea 228):
    - backend: "82 archivos con 932 pruebas (hasta AUTH-03: …, los enlaces de registro de maestros y la invitación masiva)";
    - frontend: "65 archivos con 1007 pruebas";
    - adversarias: 32 archivos `*.ataque` en el backend y 32 en el frontend. El número de pruebas adversarias lo recuenta el orquestador con `vitest run --reporter=json`, como en 03a y 03b.

Después, el orquestador anota el SHA-256 nuevo de cada archivo en `aprobacion.md` (M-14).

## 8. Cierre del encargo AUTH-03: pendientes y documentos
**Para `docs/ESTADO.md`:**
- **Sección 1:** AUTH-03 pasa a encargos completados (03a `d8cb198`, 03b `32afeef`, 03c con su hash), con la carpeta y el PR que decida el humano. Se retira de la sección 2 y de la 2b (la entrada "decidido, por empezar").
- **Sección 3, se retira:** la fila de MF-05 de AUTH-02b ("la contraseña del login y del registro queda en la caché de mutaciones…"), resuelta en 03a.
- **Sección 3, filas nuevas:**
  - (a) ritmo real marcado por el sondeo de 2 s; ajustar `pollingIntervalSeconds` o la prioridad de las recuperaciones si el volumen lo pide → DEPLOY;
  - (c) "1 invitaciones" en singular, y `demasiadasLineas` y `sinNombre` sobrantes en `features/admin/data.ts` → ADMIN, por el carril trivial, antes de DEPLOY;
  - (d) aislar con `<bdi>` el texto de una línea no válida en `resultado-invitacion-masiva.tsx` → ADMIN;
  - (e) y (f): la espera de la precondición (10 s) dentro de transacciones interactivas de 5 s en `invitacion-masiva.integracion` (y revisar el mismo patrón en `ayudas-concurrencia.ts`), más la nota del token de 2100 → CHORE-02 o el primer `chore` de pruebas.
- **Siguen vigentes, sin cambios:** M-17, M-18, M-20, M-21 y M-22, y "Evaluar plan de pago de Resend" (DEPLOY).
- **Comprobación humana:** su resultado va en `docs/trabajo/AUTH-03-ajustes-de-cuentas/comprobacion-humano.md`. Un "no pasa" se trata como marca el plan (paso 38).
- **Nota del programador:** se actualiza con la sección 9 de abajo.

**Otros documentos:** no hay otros que actualizar.
- `docs/PRD.md` ya describe RF-04b, 04d, 04e y 04f como quedaron.
- `DESIGN.md` quedó al día en cada subentrega (§7.1, §7.3, §7.4, §7.8 a §7.10 y §7.13 a §7.15, todo como propuesta).
- `infra/` no cambia.
- R-06 del plan queda desactualizado ("unos 20 s"). No hace falta enmendar el plan al cierre: esta revisión lo corrige y el texto de §9 queda bien.

## 9. Evaluación del programador en 03c (para la nota de `ESTADO.md`)
| | 03a | 03b | 03c |
|---|---|---|---|
| Rondas del tester | 0, 1 (ROTO), 2 (ROTO), 3 (RESISTE) | 0, 1 (ROTO), 2 (ROTO), 3 (RESISTE) | 0, 1 (ROTO), 2 (RESISTE) |
| Rondas extra (las que siguen a la 1) | 2 | 2 | **1** |
| Hallazgos del tester | T-01 y T-02 (proceso, medios) | T-05 (alta) y T-06 a T-12: T-06 y T-12 de proceso, T-07 a T-11 de producción | T-13 (media, prueba normal intermitente), T-14 y T-15 (bajos, de producción: accesibilidad y texto) |
| Resúmenes devueltos por el manager | — (la regla no existía) | — | **2 de 4 entregas** |

**Los dos resúmenes devueltos en 03c:**
- **Implementación:** faltaban las últimas líneas literales, y la viñeta "nada encolado" en el 409 estaba sin cubrir ("por construcción").
- **Corrección de la ronda 1:** los dos casos de la carrera del cupo se volvieron deterministas quitándoles lo que probaban (margen 0), con una desviación no declarada.

Las otras dos entregas se aceptaron a la primera.

**Lectura:**
- La verificación del resumen detuvo antes del tester los dos defectos de cobertura. El segundo habría costado una ronda más.
- Los hallazgos del tester en 03c fueron menores que en 03b.
- Sigue el patrón de fondo: cobertura que se da por buena sin demostrarla. Esta vez se detectó antes, y el programador lo corrigió bien cuando se le devolvió: el caso de la ventana propia y la simulación del defecto.

**Nota de proceso:** para simular el defecto, el programador alteró y revirtió `invitaciones.ts`, el archivo real de producción. Conviene fijar que esas simulaciones se hagan sobre una copia, como la que usé en la verificación, para que la reversión no dependa de su palabra.

**Propuesta de texto para la nota de `ESTADO.md` (sección 6):**
> AUTH-03c, con los resúmenes verificables: 2 de 4 resúmenes devueltos por el manager (líneas literales y una viñeta sin cubrir; después, dos pruebas vueltas deterministas quitándoles la propiedad, sin declararlo). Una sola ronda extra del tester, frente a dos en 03a y en 03b; hallazgos T-13 (medio, prueba normal intermitente) y T-14 y T-15 (bajos). La verificación previa detuvo los dos problemas de cobertura antes del tester. Sigue el patrón de dar cobertura por buena sin demostrarla, ahora detectado antes. Recomendación para la revisión del modelo después de CLASES: mantener la verificación del resumen; exigir que toda simulación de un defecto se haga sobre una copia, fuera del código de producción.

## 10. Contenido del commit de 03c
Con rutas explícitas, no `git add -A`. Son las 43 rutas de los paquetes que muestra `git status`, más los documentos:

```
git add backend/.env.example backend/prisma/schema.prisma backend/prisma/migrations/20260929015654_tokens_cuenta_tipo_creado_en/
git add backend/src/adapters/README.md backend/src/adapters/db/index.ts backend/src/adapters/db/invitaciones.ts backend/src/adapters/queue/index.ts backend/src/app.ts backend/src/config/env.ts backend/src/config/env.test.ts backend/src/core/auth/invitacion-masiva.ts backend/src/core/auth/invitacion-masiva.test.ts backend/src/core/correo/ritmo.ts backend/src/core/correo/ritmo.test.ts backend/src/handlers/README.md backend/src/handlers/admin.ts backend/src/workers/README.md backend/src/workers/index.ts backend/src/workers/ritmo-03c-r1.ataque.test.ts
git add backend/test/bloqueo-usuario.integracion.test.ts backend/test/cola.integracion.test.ts backend/test/invitacion-masiva.integracion.test.ts backend/test/invitacion-masiva-03c-r1.ataque.test.ts backend/test/invitacion-masiva-03c-r2.ataque.test.ts backend/test/logs-03c-r1.ataque.test.ts backend/test/sesiones-y-cadena.ataque.test.ts backend/test/worker-03c-r1.ataque.test.ts backend/test/worker-correo-de-cuenta.integracion.test.ts
git add frontend/src/components/ui/textarea.tsx frontend/src/components/ui/textarea.test.tsx frontend/src/features/admin/components/formulario-generar-enlace.tsx frontend/src/features/admin/components/formulario-invitacion-masiva.tsx frontend/src/features/admin/components/resultado-invitacion-masiva.tsx frontend/src/features/admin/data.ts frontend/src/features/admin/hooks.ts frontend/src/features/admin/lib.ts frontend/src/features/admin/types.ts frontend/src/features/admin/maestros-view.tsx frontend/src/features/admin/maestros-view.test.tsx frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx frontend/src/styles/clases-r1.ataque.test.ts
git add shared/src/cuentas.ts shared/src/index.ts
git add AGENTS.md .claude/agents/manager.md .claude/agents/programador.md CLAUDE.md README.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/DESIGN.md docs/ESTADO.md docs/trabajo/AUTH-03-ajustes-de-cuentas/
```

- **Qué incluye:** las 7 `*.ataque` nuevas sin rastrear y la carpeta de la migración. `AGENTS.md` y los dos `.claude/agents/*.md` cambiaron antes de 03c (resúmenes verificables) y no están en `32afeef`, así que entran en este commit.
- **Qué no incluye:** nada del scratchpad, `backend/tmp/` ni el cliente generado de Prisma.
- **Después del commit:** `git status --porcelain` debe quedar vacío.

## Para el humano
- La **comprobación en navegador** (sección 6) va antes del commit de 03c.
- Las decisiones sobre (a) a (f) son del manager y van como pendientes con destino. Ninguna exige una decisión tuya, salvo que prefieras corregir ya (c), "1 invitaciones", por el carril trivial antes del commit. Es un cambio de dos líneas en `evaluarCupo` y su prueba unitaria.

---

# Verificación del resumen — AUTH-03c — carril trivial
Resultado: **ACEPTADO.**
- El cambio es exactamente el pedido.
- El error "Vitest failed to find the runner" de `npm run test` desde la raíz **no se reproduce**: lo corrí completo y pasó.
- Encontré una intermitencia en una prueba normal de 03a (`bloqueo-usuario.integracion`, A3), ajena a este cambio. No bloquea el commit y va como pendiente.

## Mi corrida y el resumen, lado a lado
2026-09-29, con PA-01 comprobada antes del backend: regla `True / Inbound / Block / Public`, red `IZZI-F281` declarada de confianza y Docker encendido. En los puertos 3000 y 5173 no había nada escuchando, y no toqué ningún proceso ajeno.

| Dato | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run build`, última línea | `✓ built in 2.59s` | `✓ built in 1.60s`, código 0 | Sí (solo cambia el tiempo) |
| `npm run lint` | código 0 | código 0; 3 × "All matched files use Prettier code style!" | Sí |
| backend, por paquete | `82 passed (82)` · `933 passed (933)` | 1.ª corrida (`npm run test --workspace backend`): `1 failed \| 81 passed (82)` · `1 failed \| 932 passed (933)`. Falló A3 de `bloqueo-usuario.integracion` (abajo) | **No**, por una intermitencia ajena al cambio |
| backend, desde la raíz | falló 3 de 3 con "failed to find the runner" | `npm run test` desde la raíz, completo: backend `Test Files  82 passed (82)` · `Tests  933 passed (933)` | Coincide con la cifra del programador. **El error no se reproduce** |
| frontend | `65 passed (65)` · `1007 passed (1007)` | por paquete y desde la raíz: `Test Files  65 passed (65)` · `Tests  1007 passed (1007)` las dos veces | Sí |
| `invitacion-masiva.test.ts` | 26 casos | 26 `it(` | Sí |
| V-01 | 64/64 | 64/64 contra la tabla de "AUTH-03c — Ronda 2" | Sí |
| PA-07 | 2 `P2028` (los excluidos) | en las 2 corridas del backend: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2 (`handlers/auth/index.ts:134` y `handlers/auth/cuentas.ts:106`); 0 `Unhandled` | Sí |
| Alcance | solo `invitacion-masiva.ts` y su prueba | desde mi revisión final de 03c solo cambiaron esos dos archivos | Sí |

## El cambio: exactamente el pedido
- **El código:** `evaluarCupo` calcula `const sustantivo = restantes === 1 ? "invitación" : "invitaciones"`, un solo ternario sin anidar, y el resto del texto no cambia.
  - Con `restantes === 1`: "Hoy solo puedes enviar 1 invitación más. Quita líneas de la lista o inténtalo mañana."
  - Con 0 y con cualquier otro valor: "… N invitaciones más …".
- **La cobertura:**
  - el caso nuevo, "restantes == 1 → singular exacto", afirma el mensaje completo;
  - el plural con 0 lo fija con el texto exacto `invitacion-masiva-03c-r1.ataque.test.ts:440`, que sigue en verde y con el mismo hash;
  - el plural con N ≥ 2 queda cubierto por lectura: los casos existentes usan `toContain("10")` y no afirman la palabra. Como detalle, se puede agregar un caso con N = 2 cuando alguien vuelva a tocar ese archivo; no hace falta ahora.
- Ninguna `*.ataque` cambió.

## `npm run test` desde la raíz
**No se reproduce.** Lo corrí una vez, completo, desde la raíz:
- backend `82 passed` · `933 passed`;
- frontend `65 passed` · `1007 passed`;
- código 0, sin ningún "failed to find the runner" ni "reading 'config'".

El coordinador también corrió el frontend desde la raíz sin el error.

- **Diagnóstico probable:** algo del entorno del programador en ese momento, como otra corrida de Vitest en paralelo, la carga del equipo o una caché de Vite a medio escribir. No es una falla del repositorio.
- **No bloquea el commit.** Si vuelve a aparecer, conviene guardar la salida completa y anotarlo para un `chore` de herramientas.

## Hallazgo nuevo, ajeno al cambio: A3 de `bloqueo-usuario.integracion` es intermitente
- **La falla:** en mi primera corrida del backend, `A3: cambiar-contrasena (con su cookie) y luego el restablecimiento del admin: 204 y 200; debe_cambiar_contrasena termina en true` falló con `expected 401 to be 204`. El cambio de contraseña se resolvió **después** del restablecimiento del admin: vio `credencial_cambiada` y respondió `401 SESION_INVALIDA`. Es un orden invertido.
- **Lo que pasó después:**
  - en la corrida siguiente desde la raíz, pasó;
  - el archivo solo, 3 veces seguidas: `21 passed (21)` las tres;
  - en mis 9 corridas completas anteriores de 03c también había pasado.
- **Causa probable:** `conFilaRetenida` da por "formada" la primera operación cuando **cualquier** proceso queda bloqueado detrás de la transacción retenedora (`pg_blocking_pids`, recursivo). Con otros archivos corriendo en paralelo, un bloqueo ajeno o transitorio puede contarse como el del cambio de contraseña. Si eso pasa, el restablecimiento se lanza antes de que el cambio llegue a la fila; el cambio todavía está en su argon2 y pierde el orden.
- **Qué no es:**
  - no es un defecto de producción: con cualquiera de los dos órdenes, el resultado del sistema es correcto (en este orden, el cambio no escribe y responde 401);
  - no lo causa este cambio: A3 no toca `evaluarCupo`.
- **Destino:** `docs/ESTADO.md`, junto a (e) y (f) de la revisión final de 03c, para CHORE-02 o el primer `chore` de pruebas. Qué se espera: que A3, y cualquier otro caso que dependa del orden de `conFilaRetenida`, compruebe que el proceso bloqueado es **el de su operación** y no cualquiera, o que su aserción no dependa del orden si la retención no lo puede garantizar.
- **No bloquea el commit de 03c:** es una prueba normal de 03a, pasa en la mayoría de las corridas y no oculta ningún defecto. Si el humano prefiere cerrar AUTH-03 sin ninguna intermitencia conocida, se corrige antes del commit por el carril trivial (solo la prueba y la ayuda).

## Siguiente paso
El commit de 03c puede seguir. El bloque de `git add` de la revisión final ya incluye `backend/src/core/auth/invitacion-masiva.ts` y su prueba.
