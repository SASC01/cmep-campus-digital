# Revisión del Manager — CHORE-02 · pruebas y espera en cadena — plan
Veredicto: CAMBIOS REQUERIDOS
Verificación propia (2026-10-02): lint `cd backend; npm run lint` → código 0, última línea `tsc -p tsconfig.json --noEmit` sin errores · test no corrido (revisión de plan; lo pidió el orquestador) · build no corrido (el plan no cambia código todavía). Medición extra: `tsc` con un `tsconfig` provisional en el scratchpad, equivalente al `backend/tsconfig.test.json` de §D-6 (rutas absolutas y `typeRoots` explícitos por estar fuera de `backend/`): **41 errores en 22 archivos** (ver M-01). `git status`: solo los documentos de CLASES-02 y esta carpeta; ningún archivo de código cambió desde `ee21252`.

**Cotejo de la transcripción:** verificado. SHA-256 de `C:/Users/Carlos/.claude/plans/deep-knitting-sun-agent-ae534d5c8824a9089.md` = `69fae493f145fb6d25224c7b34011e6f16260acef92065a7517d06727d061c32` (coincide con `aprobacion.md`); `plan.md` = `04c39b40054132faeb4fc82960b505cf66ad9d078b3cbccd87b369b118be1c72` (coincide). El cuerpo de `plan.md` a partir de la línea 3 (después de la nota y su línea en blanco) es idéntico byte a byte al origen (`cmp` sin diferencias; LF, sin CR).

**En resumen:** el diseño es correcto y bien fundado en el código. `NOWAIT` corta el ciclo de verdad, la traducción del `P2028` respeta las capas y no traga nada, y la guarda nueva no deja fuera ninguna ruta de producción. Lo que impide aprobar es que N-03 no está medido: `tsconfig.test.json` destapa errores de tipos en 15 pruebas normales que no están en ninguna lista autorizada y en 5 `*.ataque`, y el paso 3 le pide al programador corregirlas mientras "No se toca", A-4 y PA-06 se lo prohíben. Es barato de arreglar ahora que los archivos se conocen.

## Problemas que bloquean

### M-01 — N-03 destapa 41 errores de tipos en 22 archivos que el plan no autoriza tocar
Dónde: §D-6 (N-03), paso 3, A-1 (C-4), A-4, "No se toca" (`backend/test/**` y `backend/src/**`), PA-02, PA-06, R-6.
Por qué importa: el paso 3 dice "Errores en pruebas normales: corrígelos (solo tipos)", pero A-4 es una lista cerrada, "No se toca" excluye todo `backend/test/**` y todo `backend/src/**/*.test.ts` fuera de esa lista, y PA-06 detiene al programador si necesita tocar un archivo que no está en "Cambios por capa". Con los errores que hay hoy, el programador se detiene a la fuerza en el paso 3 o se desvía. En el carril sensible, el humano tiene que firmar una autorización que diga qué archivos se tocan, y A-4 no los nombra. R-6 previó el riesgo, pero no lo midió.
Medición (con el mismo `extends`, `include` y `exclude: []` de §D-6):
- **Pruebas normales fuera de A-4 (15):** `alumnos-autorizacion.integracion`, `alumnos.integracion`, `archivos-autorizacion.integracion`, `archivos.integracion`, `bloqueo-usuario.integracion`, `cambiar-contrasena.integracion` (11 errores, todos de `exactOptionalPropertyTypes` en `cookie`), `clases-autorizacion.integracion`, `clases.integracion`, `cola.integracion`, `movimientos-inscripcion.integracion`, `muro-autorizacion.integracion`, `muro.integracion`, `restablecer.integracion`, `worker-consumidor.integracion` y `worker-correo-de-cuenta.integracion` (todas en `backend/test/`).
- **Pruebas normales que ya están en A-4 (2):** `enlaces-registro.integracion` (línea 62) e `invitacion-masiva.integracion` (línea 459).
- **`*.ataque` (5, C-4):** `backend/src/config/logger.ataque.test.ts` (`pino.Logger`), `invitacion-masiva-03c-r1.ataque` (TS7024), `worker-03c-r1.ataque`, `worker-r1.ataque` y `worker-r2.ataque` (los tres por `deadLetter` en las opciones de `asegurarCola`, tipadas como `QueueOptions` de pg-boss).
- Los errores se repiten en unos pocos patrones: el `payload` de `inject` tipado como `unknown`, `Chain` contra `Response` en `inject`, `exactOptionalPropertyTypes`, `possibly null/undefined` y `deadLetter`.
Qué se espera: que el plan decida y lo deje escrito en un solo lugar coherente. Hay dos opciones:
- **(a) Mantener N-03.** A-4 y "No se toca" nombran los 15 archivos normales. C-4 nombra los 5 `*.ataque`, y V-01 y la tabla de hashes de la ronda 0 los cuentan. PR-CH-06b exige `tsc -p tsconfig.test.json` sin errores. El paso 3 dice qué se considera "solo tipos". En particular, si un `possibly null` (por ejemplo, `bloqueo-usuario:277`) se resuelve con una precondición `expect(...)` y `throw`, nunca con `!` sin comentario ni con un `return` temprano. Y aclara que la lista cerrada de E6 de `bloqueo-usuario` no se toca.
- **(b) Sacar N-03 de CHORE-02.** Queda como pendiente en `ESTADO.md` §3 con su medición.

Recomiendo (a): los cambios son mecánicos y el beneficio es real (`lint` deja de ignorar los tipos de 93 archivos de `backend/test/`). Pero es decisión del humano, porque agranda la ronda 0 y el diff de un carril sensible.

## Problemas que no bloquean (se corrigen en la misma enmienda que M-01)

### M-02 — El montaje de PR-CH-03a no funciona como está escrito
Dónde: "Pruebas requeridas", PR-CH-03a, pasos 1 y 3.
Por qué importa: el texto dice que T1 "crea un usuario propio de prueba" y toma `FOR UPDATE` sobre esa fila. Si la fila nace dentro de T1, todavía no está confirmada, y en READ COMMITTED el `SELECT … FOR UPDATE` de T3 no la ve: devuelve 0 filas sin esperar. T3 nunca queda formada y el caso falla en su precondición (o el programador lo "arregla" adivinando). Además, el encabezado dice "sin tocar `usuarios`", y el montaje usa justamente una fila de `usuarios`.
Qué se espera: que la fila retenida exista y esté confirmada antes de abrir T1 (por ejemplo, con `crearUsuarioDePrueba` fuera de la transacción). Que se quite "sin tocar `usuarios`" o se diga qué tabla se usa. Retener una fila propia de `usuarios` está bien: con C-1 solo hace que `NOWAIT` reintente.

### M-03 — PA-07 necesita un control positivo
Dónde: §D-8.
Por qué importa: desde este encargo, el `P2028` solo se ve en líneas `warn`. Si una corrida tuviera `LOG_LEVEL` en `error` o más alto, el conteo de `"code":"P2028"` daría 0 y PA-07 (c) pasaría sin ver nada. Hoy el valor por defecto es `info` (`config/env.ts`), así que funciona, pero no hay nada que lo compruebe.
Qué se espera: que todo reporte de PA-07 compruebe que aparecen los tres `P2028` deterministas de `servicio-ocupado.integracion` (PR-CH-04d, 04e y 04f). Si falta alguno, el conteo no vale y se reporta.

### M-04 — El momento del inventario I-1
Dónde: "Ronda 0 del tester", I-1, y el paso 1.
Por qué importa: I-1 pide una "corrida completa limpia del backend antes de los cambios". Antes de C-1, la cadena tumba 2 de cada 3 corridas: conseguir una limpia puede costar varias, y eso choca con el espíritu de PA-12.
Qué se espera: que I-1 salga de la corrida final de la ronda 0, ya con C-1 y C-3 aplicados y con C-2 como único rojo esperado. Sigue siendo anterior a todo cambio del programador.

### M-05 — PR-CH-01c no ve todas las formas de `LOCK`
Dónde: PR-CH-01c.
Por qué importa: en PostgreSQL, `TABLE` es opcional (`LOCK usuarios IN ACCESS EXCLUSIVE MODE` es válido), y una sentencia partida en dos líneas deja `NOWAIT` en otra línea (falso positivo). Tal como está, la prueba estática no protege contra la forma más corta.
Qué se espera: que el criterio busque la sentencia `LOCK` con o sin `TABLE` (y con `ONLY`) y evalúe la sentencia completa, no la línea. Lo demás (`TRUNCATE`, `ALTER TABLE`, `REINDEX`…) sigue en el punto de ataque 1 del tester.

### M-06 — La primera página de `enlaces-registro` también se puede invadir
Dónde: §D-7, "Paginación…" y PR-CH-08.
Por qué importa: C está en `base + 2000` y B en `base + 1000`. Si entre `base` y la consulta de la primera página pasa más de 1 s (con el equipo cargado), un enlace que cree otro archivo cae entre C y B, y `[C, B]` falla. Es el mismo mecanismo que el plan corrige en la segunda página, con menos probabilidad.
Qué se espera: o la primera página se vuelve igual de robusta (fechas propias con un margen que no dependa de la carga), o el plan acepta el riesgo de forma explícita.

## Detalles menores
- §D-7 (e), hermanos: falta `alumnos-b-r1.ataque:947` (tabla temporal, `timeout: 20000`, no espera a nadie). No cambia la conclusión.
- Con M-15, los comentarios "Fuera de /api: la guarda onRoute no aplica" de `middleware-orden.integracion.test.ts:36` y de `sesiones-y-cadena.ataque.test.ts:87` dejan de ser ciertos. Sus rutas sí pasan, porque llevan `protegido()`. Conviene corregir el primero si entra en A-4; el segundo es `*.ataque` y queda como observación para el tester.
- Otros `AppError` de servidor que traducen un error de proveedor (`CORREO_NO_ENVIADO` 502, `BASE_DE_DATOS_NO_DISPONIBLE` 503) podrían llevar `causa` con la misma regla de log. Está fuera de alcance; si el humano quiere, que quede como pendiente.
- La nueva definición de PA-07 (§D-8) es una regla para los planes que vienen y solo queda como fila de `ESTADO.md`. Si el humano la quiere permanente, su lugar es el archivo del tester (fuera de este encargo).

## Lo que revisé y está bien
1. **Espera en cadena (§D-1).**
   - Mecanismo: lo contrasté con `cuentas-r1.ataque:125-139`, `cuentas-r3.ataque:146-200` (12 logins en `antesDeSoltar`) y `ayudas-concurrencia.ts`.
   - Con `NOWAIT`, L nunca entra en la cola de `usuarios`. Cuando obtiene el bloqueo no espera a nadie: `recuperar` no toca `usuarios` (`cuentas.ts:91`, solo encola) y la carrera de 1.5 s lo suelta. El ciclo R → aplicación → L → R ya no puede formarse.
   - El único `LOCK TABLE` del repositorio es `cuentas-r1:130`. No hay `TRUNCATE`, `ALTER`, `VACUUM`, `REINDEX` ni `CREATE INDEX` sobre tablas compartidas (el de `alumnos-b-r1` es sobre una tabla temporal). PR-B05 solo toma `RowExclusive` y `ShareUpdateExclusive`.
   - La verificación basta: 11 corridas limpias seguidas, `(1/3)^11 ≈ 5.6 × 10⁻⁶`, 124 archivos = 120 + 4 nuevos (hoy hay 120 `*.test.ts` en el backend), nunca dos suites a la vez y PA-12 sin repetir corridas.
2. **`P2028` → `503` (§D-4).**
   - `enTransaccion` es el único `$transaction` de `backend/src`, con 19 llamadas en 7 archivos.
   - Ningún `catch` de producción convierte un `AppError` en otra cosa: el único, en `clases.ts:55`, no envuelve transacciones. Los `workers/` no atrapan errores, así que pg-boss reintenta.
   - El código de Prisma queda en `adapters/db/errores.ts`, y `core/` y `handlers/` no lo conocen. Lo que no es `P2028` se relanza como el mismo objeto.
   - En `refrescar`, el `503` sale antes de `responderConSesion` y no llama a `rechazar()`, así que no hay cookie nueva ni se limpia la existente. En `cambiar-contrasena`, el contador de intentos se limpia antes de la transacción (`cuentas.ts:194`).
   - PR-CH-04d demuestra "nunca `500` y nada escrito" dato por dato: hash, bandera, sesiones y token.
   - **Código y mensaje:** de acuerdo con `503 SERVICIO_OCUPADO` y el texto propuesto. Es transitorio, no hay conflicto con el estado del recurso, es coherente con los otros dos `503` y no abre un oráculo: aparece en el mismo punto que hoy el `500`, y `recuperar` no abre transacción.
   - Los dos casos `P2028` de `cuentas-r3.ataque:708-797` aceptan cualquier error con el formato de la API, así que el cambio no los rompe.
3. **Guarda (§D-5 y S-5).**
   - Todas las rutas de producción están bajo `/api/{salud,auth,me,clases,admin}/…`, con los dos primeros segmentos literales.
   - Repasé las rutas de prueba registradas con la guarda. Solo `salud.integracion:20-23` y `guarda-r2.ataque:148` quedan fuera, como dice el plan. `middleware-orden:37,40` y `sesiones-y-cadena:88-92` llevan `protegido()` y siguen pasando.
   - S-5 está bien fundada: el 404 de Fastify 5.12.5 se registra con `router.all` en un enrutador aparte (`four-oh-four.js:156-157`), sin `onRoute`, y `manejoDeErrores` se registra antes que la guarda (`app.ts:61` contra `app.ts:65`). PA-04 cubre lo imprevisto.
4. **Lo demás.** Las anclas de T-1 a T-6 existen en el árbol actual, incluidos los documentos que se cambiaron hoy para CLASES-02. Los textos no contradicen ESSENTIALS ni `AGENTS.md`. El carril sensible es correcto. No hay migración, ni dependencias, ni cambios en `infra/`.
5. **PA-07 (§D-8).** Es coherente con las reglas del tester. No desactiva ninguna prueba; al contrario, quita la excepción por corrida caída. Solo le falta el control positivo de M-03.

## Desacuerdos arbitrados
Ninguno: todavía no hay programador ni tester en este encargo.

## Documentos a actualizar
- Los textos T-1 a T-6 del plan, como están, al cerrar el encargo.
- Si M-01 queda en (b), una fila nueva de N-03 en `ESTADO.md` §3, con la medición de este documento.

## Para el humano (con la opinión del manager)
- **A-1 (ronda 0 del tester sobre `*.ataque`): de acuerdo.** C-1 y C-3 son necesarios, y C-2 endurece la propiedad. C-4 tiene que nombrar los cinco archivos de M-01, para que la autorización sea concreta.
- **A-2 (`guarda-de-rutas.ts`): de acuerdo.**
- **A-3 (`cliente.ts`, `errores.ts` de `adapters/db`, `core/errores.ts` y `handlers/errores.ts`): de acuerdo.**
- **A-4 (pruebas normales): de acuerdo con ampliarla.** Con M-01 en (a), suma los 15 archivos de la medición (y, si se quiere, el comentario de `middleware-orden.integracion.test.ts`). Como está hoy, no alcanza.
- **A-5 (`package.json`, solo `typecheck`, y `tsconfig.test.json`): de acuerdo.**
- **P-01 (`lock_timeout`): de acuerdo con (a), no acotar ahora.** Acotarlo cambia el tiempo de todas las consultas y de las pruebas de retención. El riesgo en producción (R-8) queda registrado para DEPLOY, con datos de contención del log.
- **P-02 (`testTimeout` del frontend): de acuerdo con (a).** Mantiene CHORE-02 solo en el backend.
- **P-03 ("Opcionales" de CHORE-01): de acuerdo con (a).** La regla de ESLint toca cuatro bloques de `eslint.config.mjs` y no resuelve nada de lo que hoy falla.
- **Decisión que solo tú puedes tomar:** M-01 (a) o (b). Mi recomendación es (a).

**Siguiente paso:** el arquitecto enmienda el plan (M-01 y, de paso, M-02 a M-06). El manager vuelve a revisar solo las secciones que cambien.

## Revisión de la Enmienda 1
Veredicto: CAMBIOS REQUERIDOS (un hallazgo nuevo, M-07; los seis anteriores quedan resueltos)
Verificación propia (2026-10-02): `diff` del cuerpo de `plan.md` contra el origen transcrito (`69fae493…`). Todo cambio está marcado como Enmienda 1 y no hay ediciones fuera de las secciones que dice la tabla. No corrí lint, test ni build, porque no cambió código desde la verificación anterior. Lecturas de código: `enlaces-03b-r1.ataque:593-614`, `adapters/db/enlaces-registro.ts:38-45` y `cambiar-contrasena.integracion:37-46`.

### Respuesta a M-01 a M-06
- **M-01: resuelto con (a), pendiente de que el humano confirme.**
  - Los 22 archivos de la medición están cubiertos, cada uno con su alcance. Los 15 de A-4 "solo tipos" coinciden uno por uno con los que medí. `enlaces-registro` e `invitacion-masiva` caen en la sublista de cambios. Los 5 `*.ataque` están en A-1 y en C-4. "No se toca" agrega `config/logger.ataque.test.ts` solo para el tester.
  - La regla "solo tipos" del paso 3 no permite cambiar comportamiento: prohíbe tocar aserciones, valores esperados, entradas y el orden, y prohíbe borrar o saltar casos, `!` sin comentario, `as any`, `@ts-ignore` y `return` temprano.
  - Las precondiciones `expect` + `throw` solo endurecen el caso: donde TypeScript avisa de un `null` al desreferenciar, ese `null` ya lanzaba `TypeError` en ejecución, así que el resultado de la prueba no cambia.
  - El objeto opcional sin la propiedad equivale a lo que ya hace el ayudante de `cambiar-contrasena.integracion:46` (`cookie === undefined ? {}`).
  - PR-CH-06b exige `tsc` sin errores, y la alternativa (b) queda en una línea. Bien.
- **M-02: resuelto.** La fila se crea y se confirma antes de abrir T1, y §D-3 deja escrita la condición.
- **M-03: resuelto.** Lleva el control positivo con los tres `P2028` de `servicio-ocupado`, y el paso 15 lo reporta. La aclaración de que PR-CH-04c no deja línea de log es correcta.
- **M-04: resuelto.**
- **M-05: resuelto.** La expresión `\bLOCK\s+(?:TABLE\s+)?(?:ONLY\s+)?["\w.]` no cuenta `pg_advisory_xact_lock` ni `lock_timeout` (`\b` no corta dentro de `_lock`), y los casos de control cubren las formas que señalé.
- **M-06: el remedio crea M-07.** El método del ancla funciona, porque el cursor es el `id` del enlace (`enlaces-registro.ts:45`), pero la ventana de 1980 choca con un `*.ataque`.
- **Detalles menores:** atendidos como se indica en la tabla de la Enmienda 1.

### M-07 — La ventana de 1980 rompe `enlaces-03b-r1.ataque` cuando los dos archivos corren a la vez (bloquea)
Dónde: §D-7 ("Paginación…"), PR-CH-08 y el paso 13.
Por qué importa:
- `enlaces-03b-r1.ataque.test.ts:593-614` ("enlaces con el mismo creado_en: recorrer la lista de 2 en 2…") arranca en su ancla de 1990 + 1 ms y recorre la lista global **hasta el final**: hasta 20 vueltas, y exige que `siguienteCursor` sea `null`. Después exige `expect(vistos).toEqual([...empatados].sort().reverse())`, es decir, que debajo de 1990 haya **exactamente** sus 6 enlaces.
- Los cuatro enlaces de 1980 que propone la enmienda quedan debajo de 1990 y viven hasta el `afterAll` de `enlaces-registro.integracion.test.ts` (líneas 29-32). Si los dos archivos se cruzan en paralelo, el `*.ataque` ve 4 filas de más y falla.
- Es una prueba que el programador no puede tocar (PA-05), y la intermitencia sería nueva, causada por este encargo.
- La afirmación de §D-7 de que las filas del pasado "no afectan a ninguna otra prueba que lea la primera página" es cierta, pero hay una prueba que lee la **última**.

Qué se espera: una ventana que no se cruce con ninguna prueba que recorra la lista hasta el final, y que siga siendo determinista con otros archivos en paralelo. Por ejemplo, una ventana propia por encima de 1990 y por debajo de "ahora", con la segunda página comprobada como "su primer elemento es A, y B y C no aparecen", en lugar de "exactamente `[A]`", porque debajo quedarían las filas de 1990. La forma la decide el arquitecto. El criterio es que ninguna de las dos pruebas dependa de lo que crea la otra. Hermanos que hay que revisar con la misma pregunta:
- todo lector de `/api/admin/enlaces-registro` (hoy, `enlaces-03b-r1`, `enlaces-registro.integracion` y `logs-03b-r1.ataque`);
- toda prueba que use fechas fijas en `enlaces_registro`.

### Decisiones que quedan para el humano
- **M-01 (a) o (b).** Recomiendo (a), como antes.
- **A-1 a A-5 y P-01 a P-03:** mi opinión no cambia respecto de la primera revisión. A-1 y A-4 ya nombran todos los archivos, así que no tengo objeciones a ninguna.
- **Opcional, al cerrar:** si PA-07 pasa a `.claude/agents/tester.md`.

**Siguiente paso:** el arquitecto corrige solo M-07 (§D-7, PR-CH-08 y el paso 13), y yo reviso solo eso.

## Revisión de la Enmienda 2
Veredicto del plan completo (Enmienda 1 y Enmienda 2 incluidas): **APROBADO**
Verificación propia (2026-10-02): leí la Enmienda 2 y los sitios donde cambió el texto (§D-7, PR-CH-08, el paso 13 y "Cambios por capa", línea 305). Contrasté el código de `adapters/db/enlaces-registro.ts:37-50`, `enlaces-03b-r1.ataque:476-490` y `:593-614`. No corrí lint, test ni build, porque no cambió código.

### M-07: resuelto
- **Sentido del recorrido.** `listarEnlacesRegistro` ordena por `creadoEn desc, id desc`, y el cursor de Prisma, con `skip: 1`, sigue hacia las filas de **después** en ese orden, o sea, las más viejas. El caso `enlaces-03b-r1:593-614` empieza en su ancla `1990-01-01T00:00:00.001Z` y **baja** hacia 1990 y fechas anteriores, hasta `siguienteCursor` nulo. Nunca sube hacia "ahora". Las filas de 2000 están por encima del ancla y no entran en su recorrido, y su `toEqual` exacto sobre los 6 empatados sigue sin depender de este encargo.
- **Determinismo del caso propio.**
  - Desde el cursor de D (2000 + 3 s), la primera página solo puede contener filas entre D y A, que son las del caso. Las de "ahora" quedan por encima del cursor y las de 1990 por debajo de A, así que `[C, B]` es exacto.
  - En la segunda página, el primer elemento es A, porque ninguna otra prueba fija un `creado_en` de enlace en 2000. El `"2000-01-01…"` de `enlaces-03b-r1:484` es un `revocadoEn` del cuerpo que el servidor ignora, y ese caso lo comprueba. Exigir solo "primero A, y sin B, C ni D" es correcto, porque debajo pueden estar las filas de 1990.
- **Hermanos.** La tabla de evidencia coincide con lo que leí: no hay otro lector que recorra la lista global hasta el final, y no hay otra fecha fija de `creado_en` en enlaces. Las lecturas que piden los primeros 100 o los primeros 5 ven las filas de "ahora", nunca las de 2000. El pendiente de `ESTADO.md` (ventanas de 1990 y 2000, destino ADMIN) es adecuado.
- **Coherencia.** La fila M-06 de la Enmienda 1 queda como registro histórico, con la sustitución dicha de forma explícita. No encontré ninguna otra mención de 1980 fuera de ese registro y del texto de M-07.

### Decisiones que quedan para el humano
- **Aprobación por escrito** del plan (carril sensible), con las autorizaciones A-1 a A-5. Con las enmiendas, A-1 (C-4) y A-4 nombran todos los archivos; no tengo objeciones a ninguna.
- **M-01:** confirmar (a), que deja N-03 dentro del encargo con 17 pruebas normales y 5 `*.ataque` corregidas solo en tipos, o elegir (b), que lo saca a `ESTADO.md` §3. Recomiendo (a).
- **P-01, P-02 y P-03:** recomiendo la opción (a) de las tres.
- **Opcional, al cerrar:** si la definición de PA-07 de §D-8 pasa a `.claude/agents/tester.md`.

## Verificación del resumen — CHORE-02 — implementación
Veredicto del resumen: **ACEPTADO**. Las cifras deterministas coinciden con mi corrida. Las que dependen de la corrida difieren por la intermitencia, que es precisamente lo que queda abierto, no un error del resumen. Mi corrida agrega evidencia nueva (M-08), que va a la ronda del tester.
Precondición PA-01: red `IZZI-F281-5G` con perfil Public y la regla "Campus: bloquear entrada a Docker en redes publicas" habilitada en Public. Una sola suite a la vez; no corrí el frontend.

| Cifra | Resumen del programador | Mi corrida (2026-10-02) |
|---|---|---|
| `cd backend; npm run lint` | código 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0; la misma última línea |
| `cd backend; npm run build` | código 0, `> tsc -p tsconfig.json` | código 0, igual |
| `npx tsc -p tsconfig.test.json` | 0 errores | 0 errores, sin salida |
| Archivos y casos | 124 / 1369 (`vitest list`) | 124 archivos / 1369 casos en el total de la corrida (`Test Files … (124)`, `Tests … (1369)`) |
| `npm test` | `Test Files 1 failed \| 123 passed (124)` · `Tests 1 failed \| 1368 passed (1369)` · 165.90 s | `Test Files 2 failed \| 122 passed (124)` · `Tests 2 failed \| 1367 passed (1369)` · 166.59 s |
| Rojos | `ritmo-03c-r1` › "si ya pasaron más de 250 ms…" (`expected 30 to be less than 30`) | `ritmo-03c-r1` › "cinco trabajos seguidos…" (`[261,265,270,315]: expected 315 to be less than 310`) y `enlaces-03b-r2.ataque` › "40 registros simultáneos con el mismo enlace: 40 × 201, 40 cuentas y ningún 5xx" (`{ '201': 35, '503': 5 }`, códigos `SERVICIO_OCUPADO`) |
| PA-07, cuatro primeros términos | 0 · 0 · 0 · 0 | 0 · 0 · 0 · 0 |
| PA-07, `"Error no controlado"` | 10 (= I-1) | 10 |
| PA-07, `"code":"P2028"` | 5, todos permitidos | **10**: los 5 permitidos (`tx.sesion.findFirst`, `tx.sesion.updateMany`, `prisma.$queryRawUnsafe`, `tx.sesion.create`, `tx.tokenCuenta.updateMany`) y **5 de `maxWait`** ("Unable to start a transaction in the given time") en `POST /api/auth/registro-maestro`, que son los 5 `503` de `enlaces-03b-r2` (comprobado por `requestId`) |
| Control positivo de §D-8 | presente | presente (los tres de `servicio-ocupado`, 04d, 04e y 04f) |
| V-01 | sin diferencias | sin diferencias: las 107 `*.ataque` rastreadas, una por una, contra la tabla de la ronda 0 de `reporte-tester.md` (ningún `*.ataque` sin rastrear) |
| PR-CH-02 (duraciones) | PR-B05 6.7 s; C-1 12.4 s | no medidas (el reportero por defecto no las da) |

**Mapa PR-CH-xx → caso.** Los 30 títulos exactos del resumen existen en los archivos citados (búsqueda literal con `grep -F`). PR-CH-01b, PR-CH-02 y PR-CH-03b quedan declarados como verificaciones incompletas, que es lo correcto.

**Archivos contra A-2 a A-5 y "Cambios por capa".**
- `git status` y `git diff --stat ee21252` dan 40 archivos modificados y 5 nuevos. Fuera de `docs/`, todos están en "Cambios por capa" o en A-1. Los 10 `*.ataque` modificados son exactamente los de A-1.
- `backend/src/middleware/rutas-publicas.ts` solo cambia las tres líneas del comentario de cabecera; el conjunto no cambia. Lo autorizan A-2 y "Cambios por capa" ("solo el comentario de la línea 1"; ocupa tres líneas, pero sigue siendo comentario).
- `backend/package.json` cambia solo el script `typecheck` (A-5). `backend/tsconfig.test.json` es idéntico al de §D-6.
- **Producción:** `enTransaccion`, `traducirErrorDeTransaccion`, `AppError` con `causa`, el `warn` de `handlers/errores.ts` y la guarda (el motivo del comodín va después de `declara …`; se eliminó `puedeAtenderApi`) coinciden con el plan.

**Regla "solo tipos" en las 15 + 2.** Leí el diff de las 17. Solo hay:
- `InjectOptions["payload"]`, con el `payload` omitido cuando es `undefined`, lo que equivale a pasarlo `undefined` en `inject`;
- `cookie?: string | undefined`;
- `LightMyRequestResponse` en lugar de `ReturnType<typeof app.inject>`;
- un tipo `PoliticaConFallidos` anotado, con comentario;
- `Parameters<typeof original>`;
- dos precondiciones `expect` + `throw` (`bloqueo-usuario:277` y `cola`), donde antes un `null` habría lanzado `TypeError`.

Ninguna aserción, entrada, valor ni orden cambia. Tampoco hay `!`, `as` ni `@ts-ignore`. En `middleware-orden.integracion` solo cambia el comentario. `invitacion-masiva` (sin espacios en blanco): (e), (f) y PR-CH-07b como dice el plan.

### Arbitraje PA-12: orden (a), el tester abre su ronda 1 ya
- **Por qué:** en dos corridas completas salieron tres rojos intermitentes distintos, en dos archivos, sin repetirse. Si el programador hace ahora las cinco corridas del paso 15 (opción b), lo más probable es que PA-12 lo detenga otra vez en la primera, sin información nueva. Los dos archivos son `*.ataque`: el programador no puede tocarlos, y su remedio es del tester o una decisión de diseño. Las cinco corridas del programador y las tres mías van **después** de atenderlos.
- **`ritmo-03c-r1`: es un defecto del caso, no carga que haya que aceptar ni un defecto de producción.**
  - El archivo no hace E/S: simula `procesarCorreoDeCuenta` y la cola. Lo que mide son los retrasos del bucle de eventos y de `setTimeout` con 124 archivos en paralelo.
  - `expected 30 to be less than 30` (416 ms en total = primer intento + 320 ms de espera + el segundo) y `315 < 310` son el mismo síntoma: tolerancias de 30 ms y de 60 ms con reloj real.
  - Un defecto real de producción se vería como una espera de unos 250 ms, no de 30 o de 65. El caso puede seguir distinguiendo eso con tolerancias más anchas.
  - Para tocarlo, el tester necesita una autorización nueva del humano: el archivo no está en A-1 y está en "No se toca" (`backend/src/**`).
- **`enlaces-03b-r2`:** lo trato como M-08, abajo.

### M-08 — `POST /api/auth/registro-maestro` con 40 registros simultáneos del mismo enlace responde `503` a 5 (`maxWait` de Prisma) en una corrida limpia
Dónde: `enlaces-03b-r2.ataque.test.ts:218-257`, `adapters/db/cliente.ts` (`enTransaccion`, `maxWait` por defecto de 2 s) y el pool de `pg` (10 conexiones por defecto).
Por qué importa:
- Es un `5xx` en un flujo de usuario que aparece en una corrida limpia, sin ninguna otra suite corriendo.
- Los 40 registros van en serie sobre la fila del enlace (Enmienda 6 de AUTH-03b), y cada uno ocupa una conexión mientras espera. Los que no obtienen conexión en 2 s reciben `P2028` (`maxWait`).
- Antes de CHORE-02 habría sido un `500`. El riesgo ya existía: CHORE-02 no lo crea, solo lo vuelve `503`, como diseñó §D-4 (punto de ataque 5: "el `maxWait` también debe dar `503`").
- Ese `*.ataque` exige "ningún 5xx", así que el diseño de §D-4 y la propiedad de AUTH-03b chocan bajo carga.
- PA-07 (c) se activa en mi corrida: 5 `P2028` fuera de los permitidos.

Qué se espera: que el tester lo confirme y lo cuantifique en su ronda 1 (frecuencia y duración de la serie). Después, que el arquitecto proponga, y el humano decida, una de dos:
- **(i)** que 40 registros simultáneos del mismo enlace terminen todos en `201`, por ejemplo con una espera de conexión adecuada para esa transacción o con otra forma de serializar que no ocupe el pool;
- **(ii)** aceptar `503 SERVICIO_OCUPADO` bajo esa concurrencia y cambiar la expectativa del `*.ataque`, con autorización.

Hasta que se decida, es un hallazgo abierto de AUTH dentro del alcance de CHORE-02 ("los demás `P2028`"), con la prioridad que el humano da a un `5xx` en corrida limpia.

### Arbitraje de la desviación de PR-CH-01c: se acepta
`(?!on\s+relation\b)` es estrecho y correcto:
- **No puede ocultar un bloqueo real:** `ON` es palabra reservada de PostgreSQL, así que `LOCK on relation …` nunca es una sentencia válida. Una tabla llamada `"on"`, entre comillas, sigue contando, porque la comilla rompe la exclusión.
- **No toca la prueba intocable:** sin la exclusión, `cuentas-r1.ataque:147` daría un falso positivo, y ese archivo no se puede cambiar.
- **Tiene su control:** el caso de control lo cubre.
- **Alternativa descartada:** cambiar C-1 obligaría a reabrir un `*.ataque`, que es peor.

### R-1: aceptable, va como observación para el tester
El caso de C-1 tardó 12.4 s, con un presupuesto de 30 s y un límite del caso de 45 s. Pasa de los 10 s que R-1 pide reportar, así que, como dice el plan, el tester registra la duración en cada corrida de su ronda y se revisa el presupuesto si alguna vez pasa de unos 20 s. No bloquea: el caso no agotó su presupuesto y no formó cola, porque ninguna corrida cayó por tiempos límite.

### Qué sigue
1. **Orquestador:** pide al humano la autorización para que el tester modifique `backend/src/workers/ritmo-03c-r1.ataque.test.ts`, solo sus tolerancias (A-6 / C-5).
2. **Tester, ronda 1:** `ritmo-03c-r1` (con A-6), la confirmación de M-08 y su ataque normal, con al menos 3 corridas.
3. **Arquitecto y humano:** el remedio de M-08.
4. **Programador:** las cinco corridas del paso 15 y el paso 16.
5. **Manager:** mis tres corridas.

## Revisión de la Enmienda 3
Veredicto: **APROBADO**. No encontré hallazgos que bloqueen. Queda una decisión del humano en M-08 (§E3-2).
Verificación propia (2026-10-02): leí la Enmienda 3 y las secciones que dice cambiar (línea de enmiendas, §D-8, "Pruebas requeridas" puntos 10 y 11, pasos 13a, 13b y 15, y "Pendientes"). Lo contrasté con Fastify 5.12.5 instalado (`fastify.js:270-290`, `:440`, `:720-783`; `lib/plugin-override.js:28-75`; `lib/four-oh-four.js:42-75`) y con el repositorio (llamadas a `registrarMiddleware`, `setErrorHandler` y `setNotFoundHandler`). No corrí la suite porque no cambió código.

### §E3-1 · T-01: el mecanismo funciona como dice el arquitecto
- **Reemplazo en la raíz.** `setNotFoundHandler` y `setErrorHandler` son propiedades propias del objeto literal de la instancia raíz (`fastify.js:281-282`), escribibles y configurables. `Object.defineProperty` las reemplaza sin problema, y después quedan no escribibles y no configurables.
- **Herencia en contextos encapsulados.** `override` crea cada hijo con `Object.create(old)` (`plugin-override.js:38`). No reasigna ninguno de los dos métodos en el hijo: solo `ready`, los símbolos internos, `getSchema` y `getSchemas`. Todo hijo, y todo nieto, hereda la función que lanza.
- **`fastify-plugin`.** Comparte la instancia del padre (`plugin-override.js:32-35` regresa `old`), así que también la ve.
- **Asignar `hijo.setNotFoundHandler = …`.** Sobre una propiedad heredada no escribible, en un módulo ES (modo estricto), lanza `TypeError`. En código no estricto la asignación se ignora en silencio y el método sigue siendo el que lanza: en ninguno de los dos casos surte efecto.
- **`decorate("setNotFoundHandler", …)`.** Falla, porque la propiedad ya existe en la cadena de prototipos.
- **Redefinir la propiedad en el hijo con `Object.defineProperty`.** Sí es posible, porque la propiedad heredada no impide definir una propia. Pero ningún plugin alcanza la función original por la API pública: es un cierre de `fastify.js`, y la de otra instancia escribiría en el enrutador de 404 de esa otra instancia. La vía por los símbolos privados queda como riesgo aceptado en "Pendientes", y está bien que el tester la ataque en su ronda siguiente.
- **No rompe el 404 global ni el envoltorio de errores.**
  - Fastify solo llama a `setNotFoundHandler` por dentro al construir la instancia (`fastify.js:440`).
  - `arrange404` de un hijo con prefijo no lo llama (`four-oh-four.js:44-49`).
  - `manejoDeErrores` se registra con `await` antes de `registrarMiddleware` (`app.ts:61` y `:65`).
  - En las pruebas, todas las llamadas a `registrarMiddleware` (cerca de 30, en 11 archivos) son sobre instancias `Fastify()` nuevas. Ninguna registra `manejoDeErrores` después ni llama a esos métodos después de la guarda. Lo comprobé por programa.
  - El único `setNotFoundHandler` fuera de `handlers/errores.ts` está en `guarda-ch-r1.ataque`, que es el ataque que esto corrige.
  - PR-CH-09d comprueba el `404 NO_ENCONTRADO` y el `401` con `construirApp`.
- **Detalle menor.** Si algún día se llamara `registrarMiddleware` dos veces sobre la misma instancia, la segunda lanzaría `TypeError: Cannot redefine property` en lugar del mensaje de la guarda. Hoy no pasa en ningún sitio, y llamarla dos veces ya es un error, así que no pido cambio.
- **O-2.** Filtrar segmentos vacíos no afecta ninguna ruta de producción ni de prueba que hoy arranque. En las rutas sin `protegido()` gana la regla 1, y C-2 y PR-CH-05a no cambian. **O-1 y O-3:** estoy de acuerdo con su destino.

### §E3-2 · M-08: mi opinión sobre (i) frente a (ii)
**Recomiendo (i)**, con una precisión sobre su costo.
- **Qué cambia y qué no.** `maxWait` es el tiempo que una transacción espera para **obtener** una conexión; mientras espera, no retiene ninguna. Las conexiones ocupadas son las de las transacciones que ya están formadas en la fila del enlace: como mucho 10, cada una acotada por su `timeout` de 5 s y por la serie de delante. Eso es igual en (i) y en (ii). Subir `maxWait` a 10 s **no hace que ninguna conexión se retenga más tiempo**. Lo que cambia es cuánto tiempo siguen formados los que esperan conexión.
- **El efecto sobre el resto de la API.** La cola de espera de `pg-pool` es FIFO. Con (i), durante la ráfaga, una petición de otra ruta que llega después queda detrás de los registros que esperan:
  - si es una transacción, con su `maxWait` de 2 s, puede recibir `503 SERVICIO_OCUPADO`;
  - si es una consulta sin transacción, espera sin límite.

  Con (ii), los registros que pasan de 2 s salen con `503` y la cola se acorta antes. A cambio, esos maestros reintentan y vuelven a cargarla. No verifiqué si Prisma, al vencer el `maxWait`, saca a la transacción de la cola de `pg-pool` o si esta sigue esperando hasta que le toca y libera la conexión de inmediato. Si pasa lo segundo, la ventaja de (ii) para el resto de la API es menor de lo que parece.
- **El tamaño del costo.** La ráfaga dura lo mismo en los dos casos: unos 40 × 14 ms (≈ 0.6 s) sin carga, unos segundos con carga y nunca más de 10 s por registro. En (i), el costo cae una vez sobre el resto de la API (latencia o un `503` controlado, nunca un `500`). En (ii), cae sobre los maestros que se registran, que verían un error en su primer contacto con la plataforma.
- **¿Es aceptable en el piloto?** Sí. Es una sola institución, la ráfaga es rara (una junta con un mismo enlace) y corta, el peor caso del resto es un `503` controlado o unos segundos de espera, y los datos quedan correctos con cualquiera de las dos. (i) además deja intacta la propiedad del `*.ataque` ("ningún 5xx") sin reabrirlo, y conserva la cola justa de la Enmienda 6.
- **Lo que pido a cambio de (i), sin que bloquee:**
  - que la ronda siguiente del tester mida, durante la ráfaga de 40, una petición de otra ruta, por ejemplo un login o `GET /api/me`: debe responder `2xx` o `503 SERVICIO_OCUPADO` con el cuerpo exacto, nunca `500`, y conviene reportar su latencia;
  - que el pendiente de DEPLOY (tamaño del pool, `connectionTimeoutMillis` y límite de concurrencia) se quede como está.
- **Las pruebas y la regla transitoria.** PR-CH-10a a 10c son adecuadas. Llamar al adaptador y no a la ruta en 10b está bien justificado: las consultas previas del handler esperan sin límite y por HTTP no distinguirían el `maxWait`. La regla transitoria de PA-07 (c) es coherente, y se cierra con (i) o se vuelve permanente y acotada con (ii).

### Decisiones que quedan para el humano
- **M-08:** (i) con la autorización A-8 (i) para `backend/src/adapters/db/enlaces-registro.ts`, que recomiendo, o (ii) con la autorización A-8 (ii) para el caso de los 40 en `enlaces-03b-r2.ataque.test.ts`.
- Los textos T-6 bis (y T-5 bis si es (i)) se aplican al cerrar, junto con T-1 a T-6.
- La decisión opcional de PA-07 en `.claude/agents/tester.md` sigue pendiente.

## Verificación del resumen — CHORE-02 — corrección de la ronda 1
Veredicto del resumen: **ACEPTADO**. Todas las cifras coinciden con las mías y no hay hallazgos nuevos que bloqueen.
Precondición PA-01: el perfil de la red es Public y la regla del firewall está habilitada. Hice tres corridas completas seguidas del backend, una tras otra, sin el frontend y sin ninguna otra suite en marcha.

| Cifra | Resumen del programador | Mi verificación (2026-10-02) |
|---|---|---|
| `cd backend; npm run lint` | código 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0; la misma última línea |
| `cd backend; npm run build` | código 0 | código 0 |
| `npx tsc -p tsconfig.test.json` | sin errores | sin salida, código 0 |
| Archivos y casos | 129 / 1434 (`vitest list`; 1414 + 20) | 129 / 1434 en las tres corridas; 1434 − 1414 = 20 |
| Corridas | 6 seguidas, todas `129 passed (129)` · `1434 passed (1434)`, de 86.46 a 95.33 s | 3 seguidas, todas `Test Files 129 passed (129)` · `Tests 1434 passed (1434)`: 86.70 s, 86.88 s y 90.85 s |
| PA-07 (cuatro primeros términos / "Error no controlado" / `P2028`) | 0 / 10 / 5 en las seis | 0 / 10 / 5 en las tres |
| Control positivo y sitios de los `P2028` | los tres de `servicio-ocupado` y los dos de `cuentas-r3`, todos de `timeout` | igual en las tres: `tx.sesion.findFirst` (04d), `tx.sesion.updateMany` (04e), `prisma.$queryRawUnsafe` (04f), `tx.sesion.create` y `tx.tokenCuenta.updateMany` (`cuentas-r3`) |
| `P2028` de `maxWait` en `registro-maestro` | 0 en las seis | 0 en las tres ("Unable to start a transaction": 0) |
| Caso de los 40 (PR-CH-10c) | verde, de 1.8 a 2.2 s | verde: 2032, 1744 y 2763 ms |
| Caso de C-1 | de 4.7 a 8.0 s, y 12.2 s una vez | 9712, 4663 y 7995 ms |
| PR-B05 | de 3.1 a 5.0 s | 3691, 2974 y 2588 ms |
| A3 (PR-CH-03b) | verde | verde en las tres (de 492 a 622 ms) |
| V-01 | sin diferencias contra la tabla de la ronda 1 (112) | sin diferencias: 112 `*.ataque` (rastreadas y no rastreadas) contra la tabla de la línea 493 de `reporte-tester.md` |

**Mapa PR-CH-xx → caso.**
- Los 18 títulos nuevos del resumen existen tal cual y pasan en mi tercera corrida: 27 casos con esos patrones, todos en `passed` según el JSON de Vitest.
- **PR-CH-09a y PR-CH-10c no faltan:** los cubren pruebas que ya existían, como pedía la Enmienda 3.
  - **PR-CH-09a:** los dos casos de `guarda-ch-r1.ataque` ("…setNotFoundHandler propio: o no arranca, o sin token responde 401") pasan en verde y el archivo está igual (V-01).
  - **PR-CH-10c:** es la verificación del caso de los 40 de `enlaces-03b-r2.ataque`, sin cambios, en verde y sin ningún `P2028` de `maxWait` en las 9 corridas sobre este código.

**Archivos y diff contra §E3-1 y §E3-2.**
- Los únicos archivos nuevos o tocados en esta entrega son `middleware/guarda-de-rutas.ts` (A-2), `adapters/db/cliente.ts` (A-3), `adapters/db/enlaces-registro.ts` (A-8 (i)) y los tres archivos de prueba de "Cambios por capa". `ritmo-03c-r1.ataque` lo cambió el tester con A-6, y los 5 `*.ataque` nuevos son de la ronda 1.
- **`guarda-de-rutas.ts`:**
  - `bloquearManejadoresPropios` coincide con §E3-1: `defineProperty` no escribible y no configurable, con el mensaje exacto. Se llama al final de `registrarGuardaDeRutas`, después del `addHook("onRoute")`.
  - O-2 queda como `.split("/").filter((segmento) => segmento !== "").slice(0, 2)`.
- **`cliente.ts`:** el tercer parámetro `{ maxWait?: number } = {}` solo se pasa si llega. El `.catch(traducirErrorDeTransaccion)` se aplica en los dos caminos, y el `enTransaccion` anidado no lo usa.
- **`enlaces-registro.ts`:** sin tomar en cuenta los espacios, el diff es la constante `ESPERA_DE_CONEXION_DEL_ENLACE_MS = 10_000`, con su comentario, más el tercer argumento en las dos llamadas (`revocarEnlaceRegistro:107` y `registrarMaestroConEnlace:191`). No hay SQL nuevo.

**Hermanos de T-01: lo que dice el resumen basta para este encargo.**
- La regla de ESLint de M-14 existe y prohíbe `addHook` en `handlers/**` (`eslint.config.mjs:132-160`, tres formas del selector). En `backend/src` solo hay dos `addHook`: `onClose` en `app.ts` y `onRoute` en la guarda.
- `setSchemaErrorFormatter` no afecta: los handlers validan con zod (`validarCuerpo`), no con esquemas de Fastify.
- `setReplySerializer` y un `onSend` (este último ya prohibido por M-14) solo pueden dar otra forma al cuerpo de una respuesta que la cadena ya decidió. No ejecutan el handler ni cambian el estado HTTP, y el serializador es síncrono, así que no puede ir a buscar datos protegidos.
- No los bloqueo aquí. Quedan como punto de ataque para la ronda 2 del tester, y como posible regla de ESLint para `setReplySerializer` en `handlers/**` cuando se toque `eslint.config.mjs`, que hoy está en "No se toca".

### Criterio de las 11 corridas seguidas (PR-CH-01b): **todavía no se cumple; faltan las del tester**
- Sobre el código actual llevo **9 corridas completas seguidas, todas limpias**: las 6 del programador y mis 3.
- Ninguna cayó por tiempos límite, PA-07 salió limpia en todas con su control positivo y no apareció ningún `P2028` de `maxWait`.
- Las 3 corridas de la ronda 1 del tester no cuentan: fueron sobre el código anterior a 13a y 13b, y con T-01 en rojo.
- **Falta:** la ronda 2 del tester con al menos 3 corridas completas seguidas y limpias sobre este mismo código. Con eso serían 12.
- Si la ronda 2 obliga a cambiar código de producción, la cuenta se reinicia sobre el código nuevo: las 5 del programador y las 3 mías se repiten en esa verificación.
- La señal ya es fuerte: si la cadena siguiera ahí al ritmo de antes (2 de cada 3 corridas), la probabilidad de 9 corridas limpias seguidas sería de `(1/3)^9 ≈ 5 × 10⁻⁵`. Pero el plan pide 11.

### R-1
El caso de C-1 tardó de 4.7 a 12.2 s en las 9 corridas. Está siempre dentro de su presupuesto de 30 s y por debajo de los 20 s a partir de los cuales se revisaría. Nada que hacer.

### Qué sigue
1. **Tester, ronda 2:**
   - regresión completa con al menos 3 corridas seguidas, con V-01 contra la tabla de 112;
   - el ataque de §E3-1, incluidos `setReplySerializer` y la redefinición de la propiedad en un hijo;
   - M-08 (i), con el punto que pedí en la revisión de la Enmienda 3: una petición de otra ruta durante la ráfaga de 40 responde `2xx` o `503 SERVICIO_OCUPADO`, nunca `500`, con su latencia.
2. **Si la ronda 2 sale con un veredicto distinto de ROTO:** revisión final del manager.
3. **Orquestador, al cerrar:** aplica T-1 a T-6, T-5 bis y T-6 bis, actualiza `ESTADO.md` y prepara el bloque de commit.

## Arbitraje — ronda 2
Fecha: 2026-10-02. No corrí la suite. Leí `reporte-tester.md` ("CHORE-02 — Ronda 2"), `middleware/guarda-de-rutas.ts`, el caso PR-B05 de `alumnos.integracion.test.ts:626-662`, `eslint.config.mjs:132-160` y los usos de `onSend`, `preSerialization` y `errorHandler` en `backend/src`: **no hay ninguno en producción**.

**Corrijo una premisa mía.** En la verificación de la corrección de la ronda 1 escribí que `onSend` y `setReplySerializer` "no cambian el estado HTTP". T-03 demuestra que un `onSend` sí convierte el `401` en `200`. Lo retiro: los hooks y opciones posteriores a la cadena **sí** pueden rehacer su respuesta, y entran en la misma regla que §E3-1.

| Hallazgo | Naturaleza | Quién y dónde | Autorización | ¿Enmienda 4? |
|---|---|---|---|---|
| **T-02** (`errorHandler`, `onSend` y `preSerialization` como opciones de ruta) | **Defecto a corregir en CHORE-02.** Es el hermano por ruta de `setErrorHandler`, que §E3-1 bloqueó por la misma razón: rehacer la respuesta de la cadena | Programador, `backend/src/middleware/guarda-de-rutas.ts` | A-2 vigente | **Sí, corta.** `middleware/README.md` dice hoy que esos hooks "sí se permiten" (decisión de T-12): cambiarlo es una decisión de diseño. La Enmienda fija la lista cerrada de opciones de ruta rechazadas (`errorHandler`, `onSend`, `preSerialization`; el arquitecto revisa si hay más que puedan alterar la respuesta, y `onResponse`, `onTimeout` y `onRequestAbort` no pueden), el motivo y el texto T-6 ter |
| **T-03** (`addHook("onSend")` en un plugin fuera de `handlers/**`) | **Defecto a corregir en CHORE-02**, con el mismo remedio estructural de §E3-1, no como límite documentado (ver abajo) | Programador, `guarda-de-rutas.ts` | A-2 vigente (no hace falta tocar `eslint.config.mjs`) | **Sí**, en la misma Enmienda que T-02 |
| **T-04** (C-1 agota sus 30 s, 540 intentos) | **Defecto de calibración de la prueba (R-1 se materializó).** La cadena **no** volvió: el caso falló solo, sin arrastrar a nadie. Pero CHORE-02 sumó retenciones de filas de `usuarios` de más de 5 s (`servicio-ocupado` 04c a 04f, `servicio-ocupado-ch-r1`), y con PR-B05, `cuentas-r3` y `cuentas-03a-r1` pueden quedar seguidas sin hueco | Tester, `backend/test/cuentas-r1.ataque.test.ts` (solo el presupuesto y el tiempo límite del caso). Además, el programador reduce retenciones: PR-CH-04c no necesita `usuarios` (puede insertar en otra tabla propia), y T-05 retira la de PR-B05 | **Nueva A-9:** el tester modifica C-1 fuera de la ronda 0. Lo de 04c lo cubre "Cambios por capa" (archivo nuevo del programador) | **Sí, una línea:** el presupuesto de §D-1 es un criterio del plan. Propongo 60 s de presupuesto y 75 s de tiempo límite del caso, más las dos retenciones menos. Solo subir el presupuesto sin reducir retenciones deja el problema a merced de la próxima prueba que retenga `usuarios` |
| **T-05** (PR-B05 elige `usuarios_rol_idx`) | **Defecto de la prueba.** No verifiqué la causa. La hipótesis del tester (un auto-`ANALYZE` concurrente) es débil: el `ANALYZE` de PR-B05 toma `ShareUpdateExclusiveLock` y lo retiene hasta el final de su transacción, así que el autovacuum no puede analizar `usuarios` entre ese `ANALYZE` y su `EXPLAIN`. La causa de fondo es otra: la prueba exige una **elección de costo** del planificador sobre una tabla compartida que 131 archivos llenan en paralelo, con un umbral medido (de 16,000 a 20,000 filas) que depende de la muestra de `ANALYZE`. M-07 ya costó dos rondas tratando de volverla determinista así | Programador (PR-B05 es suya, de CLASES-b), `backend/test/alumnos.integracion.test.ts` | **Nueva A-10:** cambiar el comportamiento de PR-B05 (hoy el archivo está en A-4 "solo tipos") | **Sí.** Cambia lo que demuestra una prueba requerida de otro encargo. Recomiendo la forma determinista que ya usa `alumnos-b-r1.ataque:947`: una tabla temporal con la **misma** definición de índice que la migración (`gin_trgm_ops`), `ANALYZE` de esa tabla y `EXPLAIN` de la consulta con la forma de Prisma; más una comprobación estática de que la migración define `usuarios_nombre_busqueda_idx` con esa clase de operadores. Así PR-B05 deja de insertar 40,000 filas en `usuarios` y de retenerla de 3 a 5 s, lo que también alivia T-04 |

### T-03: por qué no lo dejo como límite documentado
- **Ampliar M-14 de ESLint fuera de `handlers/**`** necesitaría abrir `eslint.config.mjs` (está en "No se toca", así que haría falta una autorización nueva). Además solo cubre el código del repositorio, no el comportamiento en ejecución, así que el caso rojo de T-03 seguiría rojo.
- **Aceptarlo como límite** obligaría al tester a reescribir un `*.ataque` que hoy demuestra un `200` sin token con la API arrancada. Prefiero cerrarlo.
- **El remedio que propongo:** que `registrarGuardaDeRutas` cubra también `addHook`, con el mismo mecanismo de §E3-1.
  - Después de registrar su propio `onRoute`, la guarda reemplaza `addHook` en la raíz con `defineProperty`. El reemplazo hereda a todos los contextos y llama al original con su `this` para los demás nombres.
  - Rechaza solo los hooks que pueden responder o rehacer la respuesta: `onRequest`, `preParsing`, `preValidation`, `preHandler`, `preSerialization`, `onSend` y `onError`. El arquitecto confirma la lista.
  - Sigue permitiendo `onClose` (`app.ts:81`), `onReady`, `onListen`, `onRoute`, `onRegister` y `onResponse`.
  - Los plugins transversales que necesiten esos hooks (CORS, `rate-limit`, compresión) se registran **antes** de `registrarMiddleware`, igual que `manejoDeErrores`. Es la misma regla que ya quedó en "Pendientes" para `setErrorHandler`, y sus hooks llegan heredados a todas las rutas.
  - Esto también cierra, en ejecución, el "Límite: hooks de plugin" de `middleware/README.md`.
  - El arquitecto tiene que verificar contra Fastify 5.12.5 que nada interno llame a `instance.addHook` con esos nombres después de la guarda, y que `avvio` no lo necesite.
  - **Si no se puede hacer así**, la alternativa es aceptar T-03 como límite, con dos autorizaciones nuevas: A-11 para ampliar M-14 a `backend/src/**` (sin `app.ts` ni `middleware/**`) y A-12 para que el tester convierta su caso en la documentación del límite.

### El criterio de las 11 corridas
- **Para la espera en cadena (PR-CH-01b) la evidencia es buena.** En 12 corridas sobre este código o el inmediato anterior, ninguna cayó en cascada por tiempos límite. T-04 falló **solo**, con su mensaje, y nada más se cayó por su culpa. Eso es justo lo que §D-1 prometía ("falla un solo caso con un mensaje claro, no diez archivos en cascada").
- **Pero una corrida con un rojo no cuenta como limpia.** El plan dice "sin `failed` ni `timed out`" y la definición de terminado exige `test` en verde. Contarla sería abrir la excepción que §D-8 quitó a propósito.
- **Cuenta:** las 9 corridas limpias se quedan en 9 y se cierran ahí. Con la Enmienda 4 cambia código de producción (la guarda), así que la cuenta vuelve a empezar sobre el código final: 5 del programador, 3 mías y al menos 3 del tester en su ronda 3.

### Orden que recomiendo
1. **Arquitecto, Enmienda 4:**
   - T-02 y T-03 en la guarda (opciones de ruta y `addHook`), con PR-CH-11, el mensaje y T-6 ter;
   - T-04: presupuesto de C-1 en 60 s y 75 s, y 04c fuera de `usuarios`;
   - T-05: PR-B05 sobre una tabla temporal y la comprobación estática de la migración.
2. **Manager:** reviso solo la Enmienda 4.
3. **Humano:** aprueba la Enmienda 4 y las autorizaciones nuevas A-9 (tester, `cuentas-r1.ataque`) y A-10 (programador, PR-B05 en `alumnos.integracion.test.ts`). A-11 y A-12, solo si T-03 se acepta como límite.
4. **Tester:** aplica A-9 (solo el presupuesto de C-1).
5. **Programador:** aplica la Enmienda 4, hace las 5 corridas y entrega su resumen. Después vienen mis 3 corridas.
6. **Tester, ronda 3, la última:** si sale ROTO, se escala al humano. Por eso conviene que la Enmienda 4 sea **exhaustiva con los hermanos de T-02 y T-03**: toda opción de ruta y todo hook que pueda alterar la respuesta, en una sola lista cerrada.

## Revisión de la Enmienda 4
Veredicto: **APROBADA**. Solo dejo un hallazgo menor de texto (M-09), que no bloquea. No corrí la suite.

**Qué revisé:**
- **La Enmienda 4 completa** (`plan.md:859-972`) y las secciones que dice cambiar: puntos 12 a 14 de "Pruebas requeridas", T-6 ter, "Pendientes" y los pasos 13c a 13e.
- **Fastify 5.12.5 instalado:** `lib/route.js:204-250`, `:280-330`, `:380-457` y `lib/head-route.js`. Además, búsquedas en `backend/src` y `backend/test`.

### Lo que confirmé en Fastify y en el repositorio
- **El `onSend` del `HEAD` automático es estable por identidad.**
  - `parseHeadOnSendHandlers(null)` devuelve siempre la misma función del módulo (`headRouteOnSendHandler`): dos llamadas dan `===`. Lo comprobé ejecutándolo.
  - `createRequire(import.meta.url)("fastify/lib/head-route.js")` desde `backend/` resuelve al mismo `node_modules/fastify` que `import Fastify`, y `fastify` 5.12.5 no tiene campo `exports`, así que la importación interna funciona.
  - La ruta `HEAD` automática se registra con `{ ...headOpts, onSend: parseHeadOnSendHandlers(headOpts.onSend) }` (`route.js:454-455`). Como un `GET` protegido no puede declarar `onSend`, su `HEAD` recibe exactamente esa función y la guarda la reconoce.
  - **Lo que queda fuera es lo que debe:** un `HEAD` explícito con `onSend` propio se rechaza, y `exposeHeadRoute: false` simplemente no crea la ruta.
  - Si Fastify cambia ese archivo, la sonda hace fallar el arranque con su mensaje (PA-13).
- **La copia congelada sirve.** `route()` hace una copia superficial de las opciones (`route.js:207`), corre `onRoute` sobre esa copia y en `preReady` lee `opts[hook]` (`:390-396`) con `concat`, sin mutarlo. Reemplazar los arreglos de hooks por una copia congelada en `onRoute` deja sin efecto cualquier mutación posterior del arreglo de `protegido()`. El objeto de opciones del autor no llega a Fastify, porque se copia.
- **`schema` y las demás opciones de ruta prohibidas:** ninguna ruta de producción las usa. En `backend/src` no hay `schema:`, `validatorCompiler`, `serializerCompiler`, `schemaErrorFormatter`, `childLoggerFactory`, `logSerializers` ni `exposeHeadRoute`; la palabra `schema` solo aparece como parámetro zod en `handlers/validacion.ts`. En las pruebas, las únicas opciones prohibidas son las de los casos de ataque de `guarda-ch-r2` (T-02) y las 5 filas de `nombres-guarda-r3` que adapta A-13.
- **Bloquear `addHook` y los métodos no rompe nada que exista.**
  - Ni Fastify (`lib/`), ni `avvio`, ni `fastify-plugin` llaman a `addHook`. `@fastify/cookie` lo llama dentro de su plugin, que `app.ts:63` registra con `await` **antes** de `registrarMiddleware` (`:65`). El `onClose` de `app.ts:81` está en la lista permitida.
  - En `backend/test` y `src/**/*.test.ts`, las únicas llamadas a `addHook` o a los métodos que se bloquean sobre una app ya guardada son los dos casos de `guarda-ch-r2` que adapta A-14. Las de `guarda-clase-r1` y `guarda-clase-r2` son plantillas de texto para ESLint, no llamadas.
  - No hay `setReplySerializer`, `addContentTypeParser`, `setGenReqId` ni `addConstraintStrategy` en ningún archivo.
  - `@fastify/rate-limit`, `@fastify/cors` y `@fastify/helmet` no están instalados: hoy no se puede romper nada de ellos. La regla nueva (registrarlos antes de `registrarMiddleware`) queda como pendiente de DEPLOY y CORS.
- **PR-CH-12g se cumple hoy.** En `backend/src` solo `app.ts` importa la fábrica (`import Fastify`), y `handlers/errores.ts` importa `errorCodes`. El resto importa solo tipos.

### Sobre las cinco preguntas
1. **Plugins transversales:** el bloqueo no rompe a `@fastify/cookie` y no afecta a ninguna prueba fuera de A-13 y A-14. Para `rate-limit`, `cors` y `helmet` impone una regla de orden, ya escrita en "Pendientes" con destino DEPLOY y CORS. Ver M-09 sobre la redacción.
2. **`HEAD` automático:** el reconocimiento por identidad es estable y no deja fuera ninguna ruta, como expliqué arriba.
3. **`schema`:** prohibirlo no bloquea nada de lo que existe. Bloquearlo es correcto y no es sobreconstrucción. La validación de Fastify corre antes de `preHandler`, así que una petición sin token recibiría `400` antes que `401`: la cadena dejaría de ser lo primero. Y `schema.response` daría forma al cuerpo del `401`.
4. **A-13 y A-14 son adaptaciones legítimas.** No desactivan nada. La propiedad que probaban ("sin token, la ruta no entrega nada y el handler no corre") se mantiene y se endurece, porque "no arranca" es más fuerte que "responde 401".
   - En A-13 las 4 filas permitidas (`onResponse` ×2, `onTimeout`, `onRequestAbort`) siguen exigiendo `401`.
   - En A-14 los casos pasan al mismo `ACEPTABLE` que el resto del archivo.
   - **Para el humano:** A-13 revierte una decisión que se aceptó en AUTH-01 (ampliación de DEC-16, T-12: "los hooks posteriores sí se permiten"). Lo correcto es revertirla, porque T-02 demostró que esos hooks rehacen el `401`, pero debe constar que se revierte.
5. **¿Es lo mínimo?** Sí, para este encargo. Cada bloqueo responde a una forma real, por la API pública de Fastify, de responder o rehacer la respuesta sin la cadena, o de correr con la petición antes que ella. Hoy ninguno tiene uso en producción. Es una tabla cerrada en un solo archivo, y su costo es la matriz de pruebas sin base de datos. Como la ronda 3 es la última, cerrar la familia completa es mejor que dejar hermanos abiertos. No recorto nada.

### M-09 — T-6 ter promete más de lo que la guarda hace con los plugins transversales (no bloquea)
Dónde: T-6 ter (`plan.md`, alrededor de la línea 640): "sus hooks quedan en la raíz y la guarda revisa sus efectos sobre cada ruta". La viñeta de `@fastify/cors` de "Orden de los plugins transversales" sigue pidiendo "añadir `OPTIONS *` a `rutas-publicas.ts`".
Por qué importa:
- Un plugin registrado **antes** de `registrarMiddleware` agrega hooks de instancia (`onRequest` de CORS, `onSend` de compresión). Esos hooks corren en todas las rutas, incluso antes de la cadena, y la guarda no los ve. Es aceptado por diseño: es código de terceros revisado al instalarlo. La guarda solo revisa lo que esos plugins cambien en las **opciones** de cada ruta por un `onRoute` propio.
- Las rutas que un plugin registra en su propio cuerpo, como el `OPTIONS *` de CORS, se registran antes del `onRoute` de la guarda, así que la guarda no las revisa. Entonces la instrucción de `rutas-publicas.ts` deja de hacer falta, o hay que verificarla.

Qué se espera: que el orquestador, al aplicar T-6 ter (o el arquitecto con una línea), diga lo que pasa de verdad:
- los hooks de instancia de un plugin registrado antes de la guarda corren en todas las rutas y quedan a la revisión al instalarlo;
- la guarda revisa las opciones de ruta que ese plugin modifique;
- el encargo de CORS verifica qué pasa con `OPTIONS *`.

### Opinión para el humano sobre las autorizaciones
| Autorización | Opinión |
|---|---|
| **A-9** (tester: presupuesto de C-1 a 60 s y límite del caso a 75 s) | **De acuerdo.** El caso falló solo, como prometía §D-1. Con PR-CH-04c y PR-B05 fuera de `usuarios`, el margen crece por los dos lados. El umbral de reporte de 40 s es razonable |
| **A-10** (programador: PR-B05 sobre tabla temporal más catálogo) | **De acuerdo.** Sigue demostrando que esa forma de consulta puede resolverse con el índice de trigramas, que es lo que pedía R-20 de CLASES-b, y deja de depender de la estadística de una tabla compartida. Lo que se pierde, ver el plan elegido sobre la tabla real, nunca fue determinista en la suite: M-07 y T-05 lo prueban. Además, PR-B05 deja de retener `usuarios` |
| **A-13** (tester: 5 filas de `nombres-guarda-r3`) | **De acuerdo**, sabiendo que revierte la decisión aceptada en AUTH-01 sobre los hooks posteriores |
| **A-14** (tester: 2 casos de `guarda-ch-r2`) | **De acuerdo.** Son casos de la ronda 2, escritos para poner a prueba una premisa mía que resultó falsa |

**Siguiente paso:**
1. El humano aprueba la Enmienda 4 y las autorizaciones A-9, A-10, A-13 y A-14.
2. El tester hace el paso 13c.
3. El programador hace los pasos 13d y 13e, sus 5 corridas y su resumen.
4. El manager verifica el resumen con sus 3 corridas.
5. Ronda 3 del tester, la última.

## Verificación del resumen — CHORE-02 — corrección de la ronda 2
Fecha: 2026-10-03. Veredicto del resumen: **ACEPTADO**. Todas las cifras coinciden con las mías y no hay hallazgos nuevos que bloqueen.
Precondición PA-01: el perfil de la red es Public y la regla del firewall está habilitada. Hice tres corridas completas seguidas del backend, una tras otra, sin el frontend ni otra suite en marcha.

| Cifra | Resumen del programador | Mi verificación |
|---|---|---|
| `cd backend; npm run lint` | código 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0; la misma última línea |
| `cd backend; npm run build` | código 0 | código 0 |
| `npx tsc -p tsconfig.test.json` | sin errores | sin salida, código 0 |
| Archivos y casos | 131 / 1547 | 131 / 1547 en las tres corridas |
| Corridas | 6 seguidas, todas `131 passed (131)` · `1547 passed (1547)`, de 90 a 99 s | 3 seguidas, todas `Test Files 131 passed (131)` · `Tests 1547 passed (1547)`: 92.24, 100.57 y 98.88 s |
| PA-07 | 0 en los cuatro términos / 10 / 5 de `timeout`; 0 de `maxWait` | igual en las tres: 0 en los cuatro términos / 10 / 5 (`tx.sesion.findFirst`, `tx.sesion.updateMany`, `prisma.$queryRawUnsafe`, `tx.sesion.create`, `tx.tokenCuenta.updateMany`); control positivo presente; "Unable to start a transaction": 0 |
| PR-CH-13c (caso de C-1) | máximo 17.8 s | 344 ms, 12327 ms y 143 ms (siempre por debajo de 40 s) |
| PR-B05 | de 0.4 a 1.6 s | 789, 1092 y 917 ms |
| Caso de los 40 | de 1.3 a 2.6 s | 1916, 2245 y 2330 ms; el caso del tester "durante 40 registros simultáneos…", de 2.1 a 2.9 s, en verde |
| V-01 | sin diferencias contra la tabla del paso 13c | sin diferencias: 114 `*.ataque` (rastreadas y no rastreadas) contra la tabla de la línea 1006 de `reporte-tester.md` |

**Mapa PR-CH-xx → caso.** Busqué en el JSON de mi tercera corrida los títulos y los grupos del resumen. Todos existen y pasan:
- **PR-CH-11:** 11a, 18 casos y el `HEAD` explícito; 11b, 14 casos; 11c, uno; 11d, tres; 11e, uno.
- **PR-CH-12:** 12a, 32 casos (8 hooks × 4 contextos); 12b, 9; 12c, 10; 12d, 2; 12e, 2; 12g, 3 más el caso de la regla.
- **11f y 12f quedan cubiertos por las `*.ataque` sin cambiarlas:** los 3 casos "…propio: o no arranca, o sin token responde el 401 del envoltorio" de `guarda-ch-r2`, los 5 casos de A-13 en `nombres-guarda-r3` ("una ruta protegida con %s como %s no arranca"; 11 casos con los 6 que ya había) y los 2 casos de A-14 (`setReplySerializer` y `addHook('onSend')`). Todos pasan y los archivos coinciden con la tabla del paso 13c.

**Archivos contra A-2, A-10 y "Cambios por capa".**
- `git diff --stat ee21252` sobre los dos archivos rastreados de la entrega da exactamente 2 archivos, 268 inserciones y 41 borrados: `guarda-de-rutas.ts` y `alumnos.integracion.test.ts`. La cifra es acumulada desde la base para esos dos archivos y coincide con el resumen.
- **PR-B05 (A-10):** el diff de `alumnos.integracion.test.ts` se limita a eso. Comprueba el catálogo (`pg_indexes`, los dos índices con su definición) y hace el `EXPLAIN` sobre `pr_b05_usuarios` (temporal, `ON COMMIT DROP`, los mismos dos índices, 20,000 estudiantes y `ANALYZE` de esa tabla). Ya no hay `INSERT` ni `ANALYZE` sobre `usuarios`. Las demás líneas son los cambios de tipos de la entrega anterior.
- **`servicio-ocupado.integracion.test.ts` no está rastreado**, así que no tengo una base contra la cual comparar el archivo completo. Verifiqué lo que sí se puede:
  - PR-CH-04c inserta un enlace con `hashToken` aleatorio en `enlaces_registro` dentro de `enTransaccion`, espera 5.3 s, comprueba `AppError` 503 y que la fila no existe, y la borra en el `finally`;
  - los títulos de los casos del archivo son los mismos que en mis corridas anteriores.
  
  No hay indicio de otros cambios.

**Diff de `guarda-de-rutas.ts` contra §E4-1 y §E4-2, uno por uno.**
- **Sonda:** `createRequire(import.meta.url)("fastify/lib/head-route.js").parseHeadOnSendHandlers(null)`, y si no devuelve una función, lanza "No se encontró el onSend interno de las rutas HEAD de Fastify".
- **Opciones de ruta:**
  - las tres listas son exactamente las de §E4-1 (`errorHandler`, `onSend`, `preSerialization`, `onError` / `schema`, `validatorCompiler`, `serializerCompiler`, `schemaErrorFormatter` / `childLoggerFactory`, `logSerializers`), con los motivos exactos;
  - el orden es el del plan: la cadena, `:claseId`, los hooks anteriores, las opciones prohibidas y al final los dos primeros segmentos;
  - el `onSend` de `HEAD` se descarta por identidad.
- **Hooks de `addHook`:** los 8 de la tabla, con su motivo, y el mensaje exacto ("La instancia agrega el hook … después de registrarMiddleware: …; un plugin que lo necesite se registra antes (AGENTS.md, regla 2)"). Para los demás nombres llama al original con `apply(this, argumentos)`.
- **Métodos bloqueados:** los 9 de la tabla, con sus tres motivos y el mensaje exacto. `setNotFoundHandler` y `setErrorHandler` siguen con su mensaje de §E3-1.
- **`onRegister`:** rechaza `logSerializers` con el mensaje del plan. Se registra con el `addHook` original antes del bloqueo, igual que el `onRoute`.
- **`construirApp` real** arranca: PR-CH-12d y las nueve corridas completas, en las que `@fastify/cookie` y `auth-refresco` siguen en verde.
- **PA-13 no se activó:** cada bloqueo impide el arranque, la app real arranca, nada fuera de A-13 y A-14 se rompió y la sonda devuelve una función.

### Arbitraje de la desviación (copia congelada solo de los arreglos): **se acepta**
La pregunta es si un autor puede reasignar una propiedad de las opciones de la ruta después de que la guarda las revisó y antes de `preReady`. **No puede:**
- **El autor no tiene referencia al objeto que Fastify lee.** `route()` copia las opciones (`opts = { ...options }`, `lib/route.js:207`), y los atajos (`get`, `post`…) construyen un objeto propio. Ese `opts` solo llega a los `onRoute`. Reasignar una propiedad del objeto del autor no toca la ruta. Lo único compartido son las referencias anidadas: los arreglos (que ahora se congelan) y las funciones (inmutables por identidad).
- **Los únicos `onRoute` que reciben `opts` son de confianza.** Los que corren después de la guarda están bloqueados (§E4-2). Los que corren antes son de plugins registrados en `app.ts` antes de `registrarMiddleware` (hoy, `manejoDeErrores` y `@fastify/cookie`, que no tienen `onRoute`). Uno de esos podría guardar `opts` en un cierre y reasignarlo más tarde, con funciones o con arreglos por igual. Es el mismo riesgo aceptado de "lo que se registra antes de la guarda es código revisado", y la desviación no lo amplía.
- **La razón técnica es correcta.** Convertir una función suelta en arreglo cambia la validación de Fastify (`route.js:303-322`: con un arreglo revisa la aridad de un `onRequestAbort` asíncrono) y rompía un caso que ya pasaba.
- **Detalle menor:** el comentario de cabecera de §E4-1 en el plan dice "asigna `ruta[hook] = Object.freeze([...])` para cada hook presente". Conviene que el texto final de `middleware/README.md` (T-6 ter) diga "las listas de hooks declaradas como arreglo", para que coincida con el código. Se corrige en el texto, al aplicarlo.

### H-10: queda como límite documentado
Escribir directo en el servidor HTTP de Node o en el socket de una petición, y los símbolos privados de Fastify, están fuera de la API de Fastify. Ninguna guarda en ejecución los cierra sin envolver Node. En `backend/src` no hay hoy ningún uso de `.server.`, `raw.socket`, `reply.raw`, `request.raw` ni de símbolos de Fastify (lo busqué). Están bien como límite aceptado en T-6 ter y en "Pendientes", a la revisión de código. M-09 sigue pendiente, como texto, para cuando el orquestador aplique T-6 ter.

### Criterio de las 11 corridas
- Sobre el código final llevo **9 corridas completas seguidas y limpias**: las 6 del programador (paso 14 y las 5 del paso 15) y mis 3.
- En todas, PA-07 salió limpia con su control positivo, ninguna tuvo un `P2028` de `maxWait` y C-1 nunca pasó de 17.8 s.
- **Falta:** que el tester haga al menos 3 corridas completas seguidas y limpias en la ronda 3, sobre este mismo código. Con eso serían 12 y el criterio se cumple.
- Si la ronda 3 obligara a cambiar código de producción, sería la tercera ronda y se escala al humano, como dice el flujo.

### Qué sigue
1. **Tester, ronda 3, la última:**
   - V-01 contra la tabla del paso 13c;
   - al menos 3 corridas completas seguidas;
   - el ataque de §E4-1 y §E4-2 (otras formas, por la API de Fastify, de responder o rehacer la respuesta sin la cadena; la copia congelada, incluida la de funciones sueltas; el préstamo de métodos dentro de `backend/src`);
   - la duración de C-1 y PR-B05.
2. **Si la ronda 3 no sale ROTO:** revisión final del manager.
3. **Orquestador, al cerrar:** aplica T-1 a T-6, T-5 bis, T-6 bis y T-6 ter (con M-09 y la precisión de los arreglos), actualiza `ESTADO.md` y prepara el bloque de commit.

## Revisión final — CHORE-02
Fecha: 2026-10-03.
Veredicto: **APROBADO CON OBSERVACIONES**. Ningún problema bloquea. Queda una observación (M-10) que el orquestador debe resolver al aplicar los textos de cierre.

**Verificación propia:**
- **Precondición PA-01:** el perfil de la red es Public y la regla del firewall está habilitada.
- **`cd backend; npm run lint`:** código 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **`cd backend; npm run build`:** código 0.
- **`cd backend; npx tsc -p tsconfig.test.json`:** sin salida, código 0.
- **Una corrida completa del backend:** `Test Files 132 passed (132)` · `Tests 1623 passed (1623)` · `Duration 90.51s`, sin `failed` ni `timed out`.
  - PA-07: 0 en los cuatro términos, 10 "Error no controlado" (= I-1) y 5 `P2028` de `timeout` (`tx.sesion.findFirst`, `tx.sesion.updateMany`, `prisma.$queryRawUnsafe`, `tx.sesion.create`, `tx.tokenCuenta.updateMany`), con el control positivo presente. Ningún "Unable to start a transaction".
  - Duraciones: C-1, 87 ms; PR-B05, 823 ms; A3, 498 ms; caso de los 40, 2684 ms; ráfaga del tester, 2195 ms; los dos casos de control de ESLint de A-15, 4994 y 4575 ms.
- **Frontend:** no lo corrí. Ningún archivo de `frontend/` cambió en el encargo (verificado con `git diff --stat ee21252 -- frontend`, vacío). La última corrida del programador dio `104 passed (104)` · `1396 passed (1396)`, y el lint del frontend y el lint y build de la raíz dieron código 0.

### Lo planeado, solo lo planeado y todo lo planeado
- **Todo lo planeado** (plan con las Enmiendas 1 a 4) está hecho: los puntos 1 a 9 del alcance, PA-07 redefinido, T-01 a T-08 y M-08 (i). Lo verifiqué en las revisiones anteriores y, en esta, sobre el árbol final.
- **El criterio de las 11 corridas** se cumple sobre el código de producción final: 6 del programador, 3 del manager y 3 del tester en la ronda 3, más las limpias de las rondas 4 y 6 y la mía de hoy. La ronda 5 no cuenta como limpia (T-08).
- **V-01 a V-07:** el plan solo define V-01 (las tablas de SHA-256 de las `*.ataque`); no hay V-02 a V-07. **V-01 final:** las 115 `*.ataque`, rastreadas y no rastreadas (59 del backend y 56 del frontend), coinciden una por una con la "Tabla de SHA-256 de las 115 `*.ataque` al cierre de la ronda 6" de `reporte-tester.md`.
- **Solo lo planeado.** `git status` y `git diff --stat ee21252` dan 49 archivos rastreados modificados (884 inserciones y 330 borrados) y 13 sin rastrear fuera de `docs/trabajo/`. Uno por uno:
  - **Producción:** `adapters/db/cliente.ts`, `adapters/db/errores.ts`, `core/errores.ts` y `handlers/errores.ts` (A-3); `middleware/guarda-de-rutas.ts` y el comentario de `middleware/rutas-publicas.ts` (A-2); `adapters/db/enlaces-registro.ts` (A-8 (i)); `backend/package.json`, solo `typecheck`, y `backend/tsconfig.test.json` (A-5).
  - **Pruebas normales:** las de A-4 en sus tres sublistas; `alumnos.integracion` además con A-10 (PR-B05); `core/errores.test.ts`. Nuevas: `adapters/db/errores.test.ts`, `servicio-ocupado`, `guarda-todas-las-rutas` y `higiene-de-pruebas` (`.integracion`).
  - **`*.ataque` modificadas:** C-1 a C-4 (10 archivos, A-1); `ritmo-03c-r1` (A-6); `cuentas-r1` (A-9); `nombres-guarda-r3` (A-13); `guarda-clase-r1` y `guarda-clase-r2` (A-15, solo `60_000` y su comentario: lo leí en el diff). `guarda-ch-r2` (A-14) es un archivo del propio encargo.
  - **`*.ataque` nuevas del tester:** `guarda-ch-r1`, `-r2` y `-r3`; `enlaces-ch-r2`, `entorno-ch-r1`, `formada-ch-r1`, `nowait-ch-r1` y `servicio-ocupado-ch-r1`.
  - **"No se toca":** `git diff --stat ee21252` sobre `frontend`, `shared`, `infra`, `backend/prisma`, `backend/.env.example`, `eslint.config.mjs`, `tsconfig.base.json`, `.prettierignore`, `package.json` y `package-lock.json` de la raíz, `backend/vitest.config.ts`, `test/global-setup.ts`, `test/setup.ts`, `test/preparar-cola.ts`, `backend/tsconfig.json`, `CLAUDE.md`, `.claude/`, `AGENTS.md`, `README.md` y `docs/DESIGN.md` está **vacío**. Los dos `README.md` de `backend/src` tampoco cambiaron (T-5 y T-6 sin aplicar).
  - Los cambios de `docs/ESTADO.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md` y `docs/ARCHITECTURE-ESSENTIALS.md` son de CLASES-02 y quedan fuera de la verificación.
- **Las `*.ataque`:** el programador no modificó, saltó ni borró ninguna. Todo cambio a una `*.ataque` existente lo hizo el tester con su autorización (A-1, A-6, A-9, A-13, A-14 y A-15), y V-01 lo confirma ronda tras ronda.

### Definición de terminado (`AGENTS.md`)
- [x] **Cumple lo pedido:** los pendientes de `ESTADO.md` §3 con destino CHORE-02. No tiene `RF` propio.
- [x] **Capas y middleware:**
  - el código de Prisma solo está en `adapters/db`;
  - `core/` sigue puro;
  - el envoltorio único registra la causa;
  - la cadena de middleware se refuerza: guarda sobre toda ruta, opciones de ruta, `addHook`, métodos de la instancia y manejadores de 404 y de errores.
- [x] **`lint`, `build` y `test` en verde** en el backend (mi corrida). El frontend no cambió y quedó en verde en la última corrida del programador.
- [x] **Pruebas de autorización:** no hay endpoint nuevo, y la guarda está cubierta por PR-CH-05, 09, 11 y 12 y por las rondas del tester.
- [x] **Migración:** no hay.
- [x] **`infra/` y `.env.example`:** sin cambios, porque no hay variables nuevas.
- [ ] **Documentos:** T-1 a T-6, T-5 bis, T-6 bis y T-6 ter están listos pero **sin aplicar**. Los aplica el orquestador al cerrar, con autorización del humano (ver M-10).

### Reglas que no se rompen
Sin violaciones:
- **Capas (regla 1):** ningún archivo nuevo de `src/` importa infraestructura fuera de `adapters`. La importación interna `fastify/lib/head-route.js` está acotada a la guarda y la vigila PR-CH-12g.
- **Autorización (regla 2):** reforzada.
- **Estado de pago (regla 3):** sin cambios.
- **Consultas (regla 4):** ninguna consulta de producción nueva. Las de las pruebas son sobre vistas del sistema, parametrizadas.
- **Cola (regla 5):** sin cambios, y el `503` no deja nada encolado.
- **Archivos, UTC y trabajos diferidos (reglas 6 a 8):** sin cambios.
- **Secretos (regla 9):** la línea `warn` lleva solo el error de Prisma, sin datos del cuerpo (PA-10 y los `logs-*.ataque`).
- **Proveedores (regla 11):** sin dependencias nuevas.
- **Avisos y autenticación (reglas 12 y 13):** sin cambios. Además, el `500` de `cambiar-contrasena` deja de existir.

### M-10 — Los textos de cierre están incompletos: faltan tres precisiones acordadas (no bloquea)
Dónde: los textos propuestos del plan, sobre todo T-6 ter (`plan.md`, alrededor de las líneas 591-648).
Por qué importa: durante las rondas se acordaron precisiones que **no** están en esos textos, y el orquestador debe aplicarlos tal cual, con su SHA-256:
1. **M-09** (revisión de la Enmienda 4). T-6 ter dice que la guarda "revisa sus efectos sobre cada ruta" en los plugins registrados antes que ella. Hay que decir lo que pasa de verdad:
   - sus hooks de instancia corren en todas las rutas y la guarda no los ve (quedan a la revisión al instalarlos);
   - la guarda solo revisa las opciones de ruta que ese plugin modifique;
   - el `OPTIONS *` de CORS, registrado antes del `onRoute` de la guarda, no pasa por ella. La viñeta "añadir `OPTIONS *` a `rutas-publicas.ts`" de "Orden de los plugins transversales" deja de hacer falta, o la verifica el encargo de CORS.
2. **La copia congelada** (desviación aceptada en la corrección de la ronda 2): T-6 ter dice "reemplaza las listas de hooks de la ruta por una copia congelada". Debe decir "las listas de hooks **declaradas como arreglo**". Una función suelta no se toca porque es inmutable.
3. **Los límites de la regla estática PR-CH-12g, O-12 y O-13** (decisiones del humano en las rondas 4 y 5). Hay que agregarlos al párrafo "Límite (riesgo aceptado)" de T-6 ter, junto a H-10:
   - el especificador del módulo armado en ejecución (concatenación, plantilla con expresión, variable);
   - una línea que empieza con `//` dentro de una plantilla de texto.

   Las dos son formas que una regla de texto no cubre y quedan a la revisión de código.

Qué se espera: que el orquestador, con el arquitecto si hace falta, deje esos tres puntos en T-6 ter antes de aplicarlo, y registre el SHA-256 del texto resultante en `aprobacion.md`. Los anclajes de T-1 a T-6 siguen existiendo en el árbol actual, incluidos los documentos que se cambiaron para CLASES-02: los comprobé hoy.

### Pendientes para `docs/ESTADO.md`
**Se cierran** (filas de §3 con destino CHORE-02):
- N-01 y N-03 de CHORE-01;
- (e) y (f) de AUTH-03c;
- A3 de `bloqueo-usuario`;
- "Dos pruebas previas a CLASES fallan con el equipo cargado": la paginación de enlaces se corrigió, `ritmo-03c-r1` quedó con A-6 y las esperas de `worker-*` no fallaron;
- el `500` de `cambiar-contrasena` (prioridad alta);
- los demás `P2028`;
- los comodines `/api/*` con M-15.

Además, se retira "guarda sobre todas las rutas" de la fila "`pagos`, `admin`, `clases`, …".

**Filas nuevas, con su destino:**

| Pendiente | Destino |
|---|---|
| Un `503` de `/auth/refrescar` cierra la sesión en el frontend; con `SERVICIO_OCUPADO` convendría conservarla y reintentar (R-3) | El próximo encargo que toque `services/apiClient.ts` |
| Acotar la espera de bloqueo con `lock_timeout` (P-01), con los datos del log `warn` "Error controlado del servidor" | DEPLOY |
| El pool de conexiones durante una ráfaga (riesgo (b) de M-08 y O-10: un login de otra cuenta llegó a 1588 ms durante la ráfaga de 40, cerca del `maxWait` de 2 s): tamaño del pool, `connectionTimeoutMillis` y límite de concurrencia | DEPLOY |
| Plugins transversales (`@fastify/cors`, `@fastify/rate-limit`, compresión): se registran antes de `registrarMiddleware`; al registrarlos, comprobar el `HEAD` automático y el `OPTIONS *` de CORS (M-09) | DEPLOY y el encargo de CORS |
| PA-07 con la definición de §D-8 (con su control positivo) en todo plan con backend; decidir si pasa a `.claude/agents/tester.md` | Todo encargo con backend; decisión del humano |
| La excepción de la guarda para el admin no puede relajar la cobertura de toda ruta ni la regla de los dos primeros segmentos, opciones de ruta, `addHook` y métodos bloqueados (§D-5, Enmiendas 3 y 4) | CLASES-02 |
| Límite aceptado de la guarda: escritura directa en el servidor HTTP de Node o en el socket, y símbolos privados de Fastify (H-10, §E4-4) | Sin encargo (documentado en `middleware/README.md`) |
| Límites de la regla estática PR-CH-12g: especificador armado en ejecución (O-12) y línea `//` dentro de una plantilla (O-13) | Documentado (T-6 ter); el primer `chore` de pruebas, junto a O-1, si se quiere cerrar con el analizador de TypeScript |
| O-1: la regla PR-CH-01c no ve un comentario SQL entre `LOCK` y `TABLE` ni un `NOWAIT` dentro de un comentario, y da un falso positivo con la tabla entre comillas dentro de una plantilla | El primer `chore` de pruebas |
| Ventanas de fecha propias de las pruebas que paginan la lista global de enlaces: 1990 (`enlaces-03b-r1`) y 2000 (`enlaces-registro.integracion`). Está en la Enmienda 2 (`plan.md:774`), **no** en la sección "Pendientes" del plan: el orquestador debe tomarla de ahí | ADMIN (todo encargo que agregue pruebas de `enlaces_registro`) |
| T-08: los casos "control" de ESLint de `guarda-clase-r1` y `guarda-clase-r2` pagan la carga en frío de ESLint (hasta 46.7 s con el equipo muy cargado; ahora con 60 s). Si vuelven a acercarse al límite, calentar ESLint en un `beforeAll` | El primer `chore` de pruebas, solo si reaparece |
| El comentario "Fuera de /api: la guarda onRoute no aplica" de `sesiones-y-cadena.ataque.test.ts:87` dejó de ser cierto con M-15 | La próxima ronda 0 que toque ese archivo |
| `causa` en otros `AppError` de proveedor (`CORREO_NO_ENVIADO`, `BASE_DE_DATOS_NO_DISPONIBLE`) para registrarlos con la misma regla | Sin encargo (opcional) |

**Siguen con su destino:** M-02 de DESIGN-01b y las "Opcionales" de CHORE-01. O-8 (`register` con opciones como función) es inofensivo y no necesita fila.

**Cifras para `ESTADO.md` §1:**
- backend: 132 archivos / 1623 pruebas;
- frontend: 104 / 1396;
- `*.ataque`: 115 (59 del backend y 56 del frontend), con su tabla al final de la ronda 6 de `reporte-tester.md` como base de V-01 del siguiente encargo.

### Medición para la nota de "Agentes" de `ESTADO.md`
- **Rondas del tester:** la ronda 0 y las rondas 1 a 3 del flujo, más **3 rondas extra cerradas** que autorizó el humano (4, 5 y 6). Cada ronda terminó así:
  - ronda 1, ROTO por T-01;
  - ronda 2, ROTO por T-02 a T-05;
  - ronda 3, ROTO por T-06;
  - ronda 4, ROTO por T-07;
  - ronda 5, ROTO por T-08;
  - ronda 6, RESISTE.
- **Resúmenes del programador devueltos:** 0. El manager aceptó a la primera los tres que verificó (implementación, corrección de la ronda 1 y corrección de la ronda 2). Las correcciones de T-06 y T-07 las verificó el tester en sus rondas cerradas, por decisión del humano.
- **Rondas extra por remedios que no se extendieron a sus hermanos** (umbral de `AGENTS.md`: 2 o más hacen pasar al programador a `opus` en el carril sensible):
  - **Ronda 4 (T-07), atribuible al programador:** la ruta al archivo del paquete, las extensiones `.mts`/`.cts` e `import type from` son hermanos de las vías de T-06 en la misma regla.
  - **Ronda 2 (T-02, la opción de ruta `errorHandler` como hermano de `setErrorHandler`), no atribuible al programador:** fue un hermano que no vieron ni el diseño de la Enmienda 3 (arquitecto) ni el manager, que además dio por buena una premisa falsa sobre `onSend`. El programador sí había listado `addHook`, `setReplySerializer` y `onSend` como hermanos no aplicados.
  - **Rondas 3 (T-06) y 5 (T-08):** T-06 está en una regla nueva del plan y T-08 es carga en un archivo ajeno.
  - **Cuenta atribuible al programador:** 1, así que **no se alcanza el umbral**. Si el humano también cuenta la ronda 2, serían 2 y el programador pasaría a `opus` en el carril sensible. Es su decisión.
- **Lección para los planes:** dos de las rondas extra salieron de reglas estáticas basadas en texto (PR-CH-01c y PR-CH-12g), donde cada ronda encontró otra forma de escribir lo mismo. En el próximo encargo con una regla de ese tipo, conviene pedir desde el plan el analizador de TypeScript, o dejar escrito de entrada qué queda como límite.

### Para el humano
- **Autorizar** que el orquestador aplique T-1 a T-6, T-5 bis, T-6 bis y T-6 ter, con las tres precisiones de M-10. T-4 toca `AGENTS.md` (la línea de `lint`, la nota de "Nunca se corren dos suites a la vez" y la regla nueva de bloqueos en las pruebas).
- **Decidir** si la definición de PA-07 pasa a `.claude/agents/tester.md`.
- **Decidir** si la ronda 2 cuenta para el umbral de los hermanos (ver la medición).
- Después, el bloque de commit de la subentrega única.
