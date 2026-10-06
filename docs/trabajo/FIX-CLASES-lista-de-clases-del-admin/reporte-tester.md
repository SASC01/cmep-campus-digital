# Reporte del Tester — FIX-CLASES

## FIX-CLASES — Ronda 0

# Reporte del Tester — FIX-CLASES · lecturas con relaciones anidadas en una sola instantánea y aislamiento de una prueba de ataque — Ronda 0
Veredicto: **PARADA (PA-12, PA-07 b y PA-05)**. La reescritura C-1 está hecha y pasa `lint`, pero la corrida completa del backend cayó por tiempos límite. No la repetí. La ronda 0 queda abierta hasta que decidan el orquestador y el humano.
Verificación propia: lint del backend en verde (código 0) · test del backend en rojo (código 1): `Test Files  17 failed | 130 passed (147)` · `Tests  4 failed | 1520 passed | 222 skipped (1746)`.

### Precondiciones
- **Rama:** `fix/clases`. HEAD = `ad070b9d6545afe125d52fd5f1839699015ba8a2` = `<R>`.
- **PA-02 (árbol limpio dentro de los paquetes):** antes de C-1, `git diff --name-only ad070b9 -- shared backend frontend` y `git status --porcelain -- shared backend frontend` no devolvieron nada. Fuera de los paquetes solo aparece `?? docs/trabajo/FIX-CLASES-lista-de-clases-del-admin/`, que es del orquestador y está permitido. Después de C-1, el único cambio es `backend/test/admin-muro-02b-r1.ataque.test.ts`.
- **V-01:** saqué el SHA-256 de las 141 `*.ataque` (`git ls-files -co --exclude-standard`, 67 del backend y 74 del frontend) y lo comparé con la tabla de la ronda 3 de CLASES-02d (`docs/trabajo/CLASES-02-clases-administradas/reporte-tester.md`, líneas 3900 y siguientes). Las 141 son iguales, sin faltantes ni sobrantes. Usé `sha256sum` sobre los bytes del archivo, el mismo valor que da `Get-FileHash`.
- **PA-01:** comprobado con `Get-NetFirewallRule` y `Get-NetConnectionProfile` antes de cualquier prueba del backend.
  - La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada, es Inbound/Block y está en el perfil Public.
  - La red activa es `uacam5 2` (Public, Wi-Fi). El humano la declaró de confianza solo para hoy, 2026-10-06.
- **Docker Desktop:** encendido, con el motor 28.5.1. Los contenedores de desarrollo del humano (`campus-dev-postgres-1`, `campus-dev-minio-1` y `campus-dev-livekit-1`) estaban encendidos durante toda la corrida. No los toqué.
- **PA-08:** corrí una sola suite. Antes de la corrida de pruebas no había ningún contenedor de Testcontainers. Los tres `node.exe` que ya estaban activos (unos 40 MB cada uno) no son míos y no los toqué.

### C-1 (única reescritura)
Archivo: `backend/test/admin-muro-02b-r1.ataque.test.ts`, caso «comentar en su publicación y en la de un maestro, mis-comentarios, y los métodos que no existen: ningún 2xx y nada se escribe; leer los comentarios (GET y HEAD) sí» del bloque «ataque CLASES-02b r1: el admin no comenta (P-03 a)». Solo cambia esa aserción (A-2).

```diff
@@ -388,7 +388,23 @@ describe("ataque CLASES-02b r1: el admin no comenta (P-03 a)", () => {
     )
     if (resultado(mis) !== "403 ROL_NO_PERMITIDO") fallas.push(`mis-comentarios: ${resultado(mis)}`)
     expect(fallas).toEqual([])
-    expect(await obtenerDb().comentario.count({ where: { autorId: admin.id } })).toBe(0)
+    // C-1 (FIX-CLASES, ronda 0): el admin es la cuenta única de la corrida y otros archivos
+    // (muro-admin.integracion) siembran comentarios suyos en paralelo; contar en toda la base daba
+    // rojos intermitentes. Todos los intentos de este caso van a `clase.id` y a estas dos
+    // publicaciones, así que acotar el conteo a ellas no pierde ningún intento.
+    expect(
+      await obtenerDb().comentario.count({
+        where: {
+          autorId: admin.id,
+          publicacion: { claseId: clase.id },
+        },
+      }),
+    ).toBe(0)
+    expect(
+      await obtenerDb().comentario.count({
+        where: { autorId: admin.id, publicacionId: { in: [delMaestro, delAdmin] } },
+      }),
+    ).toBe(0)
     expect(await obtenerDb().comentario.count({ where: { id: deAlumna } })).toBe(1)
```

- **Lo que sigue protegiendo:** todos los intentos del admin apuntan a `clase.id` y a `delMaestro` o `delAdmin`. Son `POST` con el id de la clase en minúsculas y en mayúsculas (la base guarda el UUID en minúsculas), `POST` con barra final, `PUT`, `PATCH` y `DELETE …/mis-comentarios`. Acotar el conteo a esa clase, y además a esas dos publicaciones (el refuerzo que permite el plan), no pierde ningún intento. Siguen `expect(fallas).toEqual([])` y el conteo del comentario de la alumna (= 1).
- **La relación usada existe en el esquema:** `Comentario.publicacion` → `Publicacion` (`schema.prisma:268`).
- **Formato:** desde `backend/`, `npx prettier --write test/admin-muro-02b-r1.ataque.test.ts`, que respondió "(unchanged)".
- **Quién siembra comentarios del admin en paralelo** (`muro-admin.integracion.test.ts` en `ad070b9`): las líneas 394, 400 y 407 (con la ayuda `nuevo` de la 376), la 668 y también la **512**, que el plan no cita. En la 512, el ciclo `for (const [nombre, autorId] of Object.entries(autores))` crea un comentario por autor, y uno de ellos es `admin: adminId`. La 283 es de un alumno, como ya corrigió el plan. La 512 no cambia el remedio: C-1 la cubre igual.
- **Rojos esperados de la ronda 0:** ninguno.
- **C-1 no se ejecutó en la corrida completa.** El `beforeAll` de `admin-muro-02b-r1` cayó por el tiempo límite de 10 s (ver la corrida), así que sus 10 casos quedaron como skipped. Con la corrida caída es PARADA, y no corrí el archivo por separado. Sí compila: `tsc -p tsconfig.test.json` dentro de `npm run lint`, con código 0.

### Búsqueda de hermanas
- **Qué busqué:** en `backend/test/**` y en las `*.test.ts` de `backend/src/**` (las `*.ataque` y las pruebas normales), las llamadas `.count(`, `.findMany(`, `.findFirst(`, `.aggregate(` y `.groupBy(`, junto con `count(*)` en SQL etiquetado.
  - Primero las filtré por un `where` con el id del admin (`autorId`, `actorId`, `subidoPor`, `usuarioId`, `maestroId` o `alumnoId` igual a `admin.id`, `adminId`, `idAdmin` o `idDelAdmin`).
  - Luego, por las que no tienen `where` (`.count()` o `.findMany()`).
  - Por último, por los conteos sobre tablas que otros archivos llenan, como `tokens_cuenta`, `movimientos_inscripcion`, `pgboss.job` y `pg_stat_activity`.
- **Resultado:** ninguna hermana intermitente nueva. Ni en una `*.ataque` (no reescribí nada más) ni en una prueba normal: **I-2 = ninguna**.
  - **Con el id del admin y ya acotadas, no se tocan:**
    - `admin-muro-02b-r1:333` y `:336`.
    - `gestion-02a-r1:317` y `:371`.
    - Los `subidoPor: admin` de `admin-muro-02b-r1:506`, `archivos-d-r1:1029` y `muro-admin:289/618`, que son datos de siembra, no conteos.
  - **Sin `where`:**
    - `cuentas-r1:790`, `usuario.count() > 0`: es estable.
    - `gestion-02a-r1:793-799` y `gestion-clases.integracion:353-367`: son O-3 y no se tocan.
  - **Globales sobre tablas compartidas, pero robustas por diseño:**
    - `movimientos-inscripcion.integracion:61`, `aggregate _max secuencia`: solo exige que la secuencia nueva sea mayor que el máximo anterior, y la secuencia es monótona.
    - `invitacion-masiva.integracion:71` (`contarUsadasEnVentana`): "las existentes no consumen cupo" no consume cupo pase lo que pase con el conteo. Las demás pruebas de cupo ya se reescribieron en AUTH-03c (T-05) para leer "usadas" dentro de la transacción.
    - `invitacion-masiva-03c-r1:89` (`usadasEnVentana`): el caso solo exige "todo o nada" por lote, con 200 o 409.
    - `invitacion-masiva-03c-r2:109`: está diseñada para la cascada.
  - **`usuario.count({ rol: "admin" })` = 1:** estable por el índice único parcial, como ya revisó el plan.
- **Observación, no es hermana de C-1 ni I-2:**
  - **Qué encontré:** dos sondeos de "operación formada" cuentan procesos en `pg_stat_activity` por el texto de la consulta, sin acotarlos a la retenedora ni al proceso del archivo.
    - `muro.integracion.test.ts:590` busca `FOR SHARE` sobre `publicaciones` con `wait_event_type = 'Lock'`.
    - `muro-c-r1.ataque.test.ts:388` busca `DELETE` sobre `publicaciones`.
  - **Riesgo:** no es un conteo de filas del admin. Lo peor que pueden dar es un falso "ya formada", que debilita la prueba, no un rojo. No lo he visto fallar.
  - **Contexto:** la regla de AGENTS ("Bloqueos en las pruebas") habla de filas (`formadasDetrasDe`), y CHORE-02 revisó estos archivos por los `timeout`.
  - **Destino:** lo dejo al manager. No lo toqué.

### I-1 (PA-07 b), confirmado en esta corrida
Atribución: por la última "incoming request" con el mismo `pid` y `requestId`, junto con el mensaje del error.

| # | Ruta | Llamada | Origen |
|---|---|---|---|
| 1-5 | `POST /api/auth/login` | "fallo simulado de la base en la búsqueda" (pid 11592, `req-m` a `req-q`, 19:25:51Z) | `intentos-r2.ataque` |
| 6 | `POST /api/auth/login` | "fallo simulado de la base al crear la sesión" (pid 11592, `req-x`, 19:25:54Z) | `intentos-r2.ataque` |
| 7 | `POST /api/clases/:claseId/archivos` | `ZodError` `subida.url` "La URL del almacén debe ser http o https" (pid 6548) | `archivos-d-r2.ataque` › T-39 |
| 8 | `POST /api/clases/:claseId/archivos/:archivoId/descarga` | `ZodError` `url` (pid 6548) | `archivos-d-r2` › T-39 |
| 9 | `GET /api/clases/:claseId/publicaciones` | `ZodError` `publicaciones.0.adjuntos.0.vistaPrevia.url` (pid 6548) | `archivos-d-r2` › T-39 |
| 10 | `GET /api/prueba/error-comun` | `Error: boom` (pid 32512) | `salud.integracion` |

Las 10 de I-1 aparecen, con las mismas rutas y llamadas que en CLASES-02. **Además salieron 5 fuera de I-1** (ver PA-07). Esas 5 no entran al inventario: son efecto de la corrida caída.

### I-2
**Ninguna.**

### Lint del backend
- **Comando:** `cd backend; npm run lint > <scratchpad>/lint-r0.txt 2>&1`, con **código 0**. Corrió antes de la suite.
- **Resultado:** ESLint pasa y Prettier responde "All matched files use Prettier code style!".
- **Última línea literal:** `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`. Los dos `tsc` no imprimen nada y el proceso salió con 0.

### Corrida completa del backend: PA-12
**Comando:** `cd backend; npm test > <scratchpad>/test-r0.txt 2>&1`. Fue una sola corrida, de 19:24:15Z a 19:29:25Z (Vitest: "Start at 13:24:26" en hora local, es decir 19:24:26Z), con **código 1**.

**Pie de Vitest (literal):**
```
 Test Files  17 failed | 130 passed (147)
      Tests  4 failed | 1520 passed | 222 skipped (1746)
   Start at  13:24:26
   Duration  297.81s (transform 107.84s, setup 8.83s, import 446.64s, tests 2570.74s, environment 46ms)
```
- **Última línea del archivo:** `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`.
- **Tiempos límite:** 17 líneas con `timed out` en la salida. Son 14 de `beforeAll` y 3 de casos (cada caso aparece en el mensaje y en su resumen).
- **`maxWait`:** ninguno ("Unable to start a transaction": 0).

**Suites caídas en `beforeAll` por "Hook timed out in 10000ms" (14).** Todas caen en la primera línea del hook, `construirApp(...)` seguido de `app.ready()`, y todos sus casos quedaron como skipped:

| Archivo | Casos skipped | Duración del archivo | Hora aproximada (UTC) |
|---|---|---|---|
| `test/servicio-ocupado-ch-r1.ataque.test.ts` | 8 | 10956 ms | ~19:25:00 (primeras líneas) |
| `test/autoria-02b-r1.ataque.test.ts` | 14 | 10961 ms | ~19:25:00 |
| `test/muro-admin.integracion.test.ts` | 10 | 11524 ms | 19:25:14 |
| `test/alumnos-b-r1.ataque.test.ts` | 24 | 11336 ms | 19:25:54 |
| `test/gestion-02a-r1.ataque.test.ts` | 13 | 10437 ms | 19:26:08 |
| `test/archivos-d-r1.ataque.test.ts` | 19 | 10851 ms | 19:26:08 |
| `test/alumnos.integracion.test.ts` | 29 | 10458 ms | 19:26:42 |
| `test/gestion-clases.integracion.test.ts` | 21 | 12884 ms | 19:26:44 |
| `test/archivos.integracion.test.ts` | 21 | 11008 ms | 19:26:57 |
| `test/muro.integracion.test.ts` | 25 | 10668 ms | 19:26:59 |
| `test/enlaces-ch-r2.ataque.test.ts` | 3 | 11397 ms | 19:27:22 |
| `test/admin-muro-02b-r1.ataque.test.ts` (C-1) | 10 | 11081 ms | 19:27:28 |
| `test/invitacion-masiva.integracion.test.ts` | 16 | 11370 ms | 19:28:36 |
| `test/admin-restablecimiento.integracion.test.ts` | 9 | 10276 ms | 19:28:55 |

Vitest cuenta 15 "Failed Suites": estas 14 más el `afterAll` de `clases-autorizacion`. Los 17 archivos fallidos del pie son estas 14 suites más `clases-autorizacion`, `gestion-clases-autorizacion` e `intentos-r2`, que tienen casos rojos.

**Casos rojos (4):**
1. `test/clases-autorizacion.integracion.test.ts` › «PR-A15h: en cada caso negado, lo que controla el preparador de la ruta queda como estaba»: "Test timed out in 15000ms" (15094 ms, hacia las 19:27:04Z). Arrastra al `afterAll` del archivo: `borrarUsuariosDePrueba` (`ayudas-auth.ts:95`) falla por violar la llave foránea `clases_maestro_id_fkey`, porque una clase creada por el caso cortado quedó sin borrar.
2. `test/gestion-clases-autorizacion.integracion.test.ts` › «PR-2A22: cuenta inactiva, 401; con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO; alumno restringido, 403 ACCESO_RESTRINGIDO»: tiempo límite, 15104 ms (hacia las 19:27:09Z).
3. `test/gestion-clases-autorizacion.integracion.test.ts` › «PR-2A22: el estudiante inscrito y el no inscrito, el maestro de la clase y el maestro ajeno reciben 403 ROL_NO_PERMITIDO, y nada cambia»: tiempo límite, 15022 ms.
4. `test/intentos-r2.ataque.test.ts` › «la poda de cada 500 escrituras no borra las reservas vigentes de otra llave»: `expected 505 to be 510` (`intentos-r2.ataque.test.ts:174`), en 74615 ms (hacia las 19:27:11Z).
   - De los 510 `POST /api/auth/login` simultáneos, 5 respondieron `500` "Connection terminated unexpectedly" (pid 11592, `req-1h` a `req-1l`, de 19:27:04.617Z a 19:27:04.881Z). Esos 5 son los "Error no controlado" fuera de I-1.
   - Las respuestas de ese caso tardaron hasta 70.4 s.
   - En el mismo proceso, pg-boss registró a las 19:26:49Z "Connection terminated due to connection timeout" (`Manager.getQueues` y `Bam.#onPoll`).
   - **También es PA-05:** falla una `*.ataque` que no es un rojo esperado.

**Otro `500` sin "Error no controlado":** 1, `POST /api/auth/login` (pid 20588, `req-1`, 19:28:55.256Z, 2662 ms). Es el inicio de sesión del admin dentro del `beforeAll` de `admin-restablecimiento.integracion`, y terminó en el mismo instante en que ese hook se cortó. Es efecto del corte, no un defecto nuevo.

**Diagnóstico (contexto, no remedio):**
- **Comparación con la corrida final de la ronda 0 de CLASES-02a** (la última del reporte de CLASES-02 con los tiempos desglosados):

  | Métrica | CLASES-02a | Esta corrida |
  |---|---|---|
  | Duración | 142.43 s | 297.81 s |
  | Transform | 11.36 s | 107.84 s (casi 10 veces más) |
  | Import | 170.07 s | 446.64 s |

- **Lectura:** la transformación de los archivos es trabajo local de CPU y disco. Las 14 caídas ocurren en `construirApp` y `app.ready()`, repartidas a lo largo de toda la corrida. Eso apunta a que la máquina estaba cargada mientras corría la suite, no a un defecto de un dominio.
- **Lo que no se explica por eso:** fuera de `intentos-r2`, ninguna respuesta HTTP tardó más de 9 s. Las más lentas son los 5 `503` deliberados (9.0 s como máximo) y las ráfagas de `registro-maestro` (6.4 s).
- **Al terminar,** la carga de CPU era del 26 % y había 15.9 GB libres de 33.2 GB. No sé qué cargó la máquina durante la corrida. Los contenedores `campus-dev-*` del humano seguían encendidos.
- **No repetí la corrida** (PA-12).

**Defecto de FIX-CLASES (`GET /api/admin/clases`):** **no apareció.** En toda la salida hay 0 `too_small`, 0 `TypeError` y ningún `500` de esa ruta. Pero sus dos víctimas conocidas, `gestion-clases.integracion` y `gestion-02a-r1.ataque`, no corrieron ningún caso porque su `beforeAll` cayó. Esta corrida no sirve como evidencia de que el defecto ocurra ni de que no ocurra.

### PA-07
Conté sobre `<scratchpad>/test-r0.txt` (la salida completa, con `grep -o … | wc -l`):

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | **15**: los 10 de I-1 más **5 fuera de I-1** |
| `"code":"P2028"` | 5, exactamente los permitidos |

- **Los 5 fuera de I-1:** `POST /api/auth/login` › `PrismaPgAdapter.queryRaw` con "Connection terminated unexpectedly" (pid 11592; `req-1j`, `req-1l`, `req-1i`, `req-1k` y `req-1h`; de 19:27:04.617Z a 19:27:04.881Z). Salen del caso de la poda de `intentos-r2.ataque` y **activan PA-07 (b)**.
- **`P2028`:** los 5 son de `timeout` (5000 ms), nivel 40, `SERVICIO_OCUPADO` y `503`:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()` (`adapters/db/usuarios.ts:293`), pid 8876 `req-1`, 19:25:27Z: `servicio-ocupado.integracion`.
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()` (`sesiones.ts:72`), pid 8876 `req-3`, 19:25:36Z: `servicio-ocupado.integracion`.
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`, pid 8876 `req-5`, 19:25:44Z: `servicio-ocupado.integracion`.
  - `POST /api/auth/login` › `tx.sesion.create()` (`sesiones.ts:39`), pid 31892 `req-1m`, 19:26:04Z: `cuentas-r3.ataque`.
  - `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()` (`tokens-cuenta.ts:116`), pid 31892 `req-20`, 19:26:13Z: `cuentas-r3.ataque`.
- **Control positivo:** presente. Aparecen los 3 de `servicio-ocupado` con su ruta, y también los 2 de `cuentas-r3`. Ningún `P2028` de las cuatro lecturas de FIX-CLASES.
- **Otro `503`:** `GET /api/salud` (pid 27928) es el `503` deliberado de `salud-sin-base.integracion`.
- **PA-07: NO limpia.** Se activa (b): hay 5 "Error no controlado" fuera de I-1. Además, la corrida cayó por tiempos límite (PA-12).

### Paradas activadas
- **PA-12:** la corrida completa cayó por tiempos límite (14 `beforeAll` y 3 casos) y hubo un rojo en `intentos-r2`.
- **PA-07 (b):** 5 "Error no controlado" fuera de I-1.
- **PA-05:** fallan `*.ataque`: `intentos-r2` con un caso rojo, y 7 más por su `beforeAll` (`servicio-ocupado-ch-r1`, `autoria-02b-r1`, `alumnos-b-r1`, `gestion-02a-r1`, `archivos-d-r1`, `enlaces-ch-r2` y `admin-muro-02b-r1`).
- **Lo que no hice:** no repetí la corrida ni corrí archivos sueltos. Lo deciden el orquestador y el humano: repetir la corrida completa con la máquina descargada, y correr aparte `admin-muro-02b-r1` para ver C-1 en verde.

### Archivos
- **En el repositorio:** `backend/test/admin-muro-02b-r1.ataque.test.ts` (C-1) y este reporte.
- **En el scratchpad** (`C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/f85979e7-8d5d-4c51-94dd-4ace9a7f84ff/scratchpad/`):
  - `test-r0.txt` (la corrida completa) y `test-r0-inicio.txt` (horas y código).
  - `lint-r0.txt`.
  - `base.txt` y `actual.txt` (V-01).
  - `tabla-fx-r0.md`.
  - `atribuir.cjs`, `codigos.cjs`, `horas.cjs`, `lentas.cjs` y `lentas2.cjs` (las atribuciones).

### Tabla de SHA-256 de las 141 `*.ataque` después de la ronda 0 de FIX-CLASES (base de V-01 del programador; cambia 1, marcada)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` | cambia (C-1) |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `09E0FDB71E8862F37D681D2A9CB74434227FFEA81E71EF34B87C4AC8BDAB4E47` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `90AF141297CD9309D7E6316833B2BD222347BD25292AF890A55F98126093522C` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `5A856883D032B3ECB2F766BAD450C28D79FD761788C01C1DED16B0EB6F95371D` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

### Segunda corrida (autorizada por el orquestador)
El orquestador la autorizó con estas palabras: "la corrida fue inválida por carga del entorno; repite la corrida completa una sola vez, con el equipo descargado, y termina la ronda 0" (registrado en `aprobacion.md`). Es la única repetición: no hay una tercera.

**Resultado: PARADA otra vez (PA-12 y PA-05).** La corrida es válida y no hubo tiempos límite, pero cayó **un rojo intermitente** en una `*.ataque` ya existente (AUTH-01), ajena a FIX-CLASES. PA-07 está limpia. C-1 quedó en verde.

#### Medición de carga previa
- **Primer par de lecturas** (`(Get-CimInstance Win32_Processor).LoadPercentage`, con 10 s entre una y otra): **22 % y 26 %**. La segunda no baja de 25 %, así que esperé.
- **Segundo par**, 30 s después (13:38:41 hora local): **40 % y 33 %**. En la lista de procesos con más CPU acumulada aparecen ChatGPT (3 procesos, hasta 445 MB), Docker Desktop y `com.docker.backend`, y VS Code (`Code`, 3 procesos).
- **Tercer par**, a las 13:39:27 hora local (19:39:27Z), dentro de los 2 minutos: **20 % y 23 %**. Las dos lecturas quedan por debajo de 25 %, así que seguí.
- **Procesos `node`:** 3, de 40 MB cada uno, con 0.2 a 1.0 s de CPU acumulada. Son ajenos y ninguno pasa de 200 MB.
- **Docker:** motor 28.5.1. Los únicos contenedores eran `campus-dev-minio-1`, `campus-dev-postgres-1` y `campus-dev-livekit-1`.
- **PA-01:** la regla del firewall sigue Enabled, Inbound, Block y en el perfil Public, y la red sigue siendo `uacam5 2`.

#### C-1 aislado
- **Comando:** `cd backend; npx vitest run test/admin-muro-02b-r1.ataque.test.ts > <scratchpad>/c1-aislado.txt 2>&1`, de 19:39:39Z a 19:40:01Z, con **código 0**.
- **Últimas líneas:**
  ```
   Test Files  1 passed (1)
        Tests  10 passed (10)
     Start at  13:39:42
     Duration  17.65s (transform 1.12s, setup 86ms, import 2.34s, tests 3.48s, environment 0ms)
  ```
- **El caso de C-1** («comentar en su publicación y en la de un maestro, mis-comentarios…») queda en verde, junto con los otros 9 del archivo.

#### Corrida completa
- **Comando:** `cd backend; npm test > <scratchpad>/test-r0b.txt 2>&1`, de 19:40:21Z a 19:42:26Z, con **código 1**.
- **Pie de Vitest (literal):**
  ```
   Test Files  1 failed | 146 passed (147)
        Tests  1 failed | 1745 passed (1746)
     Start at  13:40:30
     Duration  114.82s (transform 15.86s, setup 6.09s, import 209.38s, tests 820.63s, environment 74ms)
  ```
- **Última línea del archivo:** `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`.
- **Tiempos:** duración de 114.82 s, con transform de 15.86 s e import de 209.38 s. Es comparable con CLASES-02a (142.43 s, 11.36 s y 170.07 s) y está lejos de la primera corrida (297.81 s, 107.84 s y 446.64 s).
- **Tiempos límite:** 0 líneas con `timed out` y 0 con "Unable to start a transaction". Ningún `beforeAll` cayó y no hay ningún caso skipped.

#### Rojos (1, no esperado)
- **Caso:** `backend/test/nombres-tokens-r2.ataque.test.ts` › «ataque (ronda 2): tokens legítimos tras endurecer la verificación (T-05)» › «frontera de vigencia: iat hace 899 s → 200; iat hace 900 s → 401».
- **Error:** `AssertionError: expected 401 to be 200` en `nombres-tokens-r2.ataque.test.ts:143` (`expect((await me(await hace(899))).statusCode).toBe(200)`). El caso duró 129 ms y el archivo 6382 ms (pid 17576, hacia las 19:41:59Z).
- **Causa (leída en el código, no es un defecto de FIX-CLASES):**
  - `firmarTokenAcceso` (`adapters/auth/tokens.ts:21`) trunca al segundo: `emitidoEn = Math.floor(ahora.getTime() / 1000)` y `exp = emitidoEn + 900`.
  - jose compara contra `now = Math.floor(Date.now() / 1000)` y rechaza si `exp <= now` (`node_modules/jose/dist/webapi/lib/jwt_claims_set.js:84`).
  - La prueba firma con `ahora = Date.now() − 899 000 ms` y luego pide `GET /api/me`. Si entre la firma y la verificación se cruza un segundo entero, `now` sube uno y queda `exp = now`, así que la respuesta es 401.
  - La probabilidad por corrida es más o menos el tiempo entre la firma y la verificación dividido entre 1000 ms (unas decenas de ms, es decir, un pequeño porcentaje).
  - Es una intermitencia de la prueba con un margen de un solo segundo, no de la regla de los 15 minutos. Un token de verdad vive entre 899 y 900 s según en qué fracción de segundo se emita, y eso ya era así en AUTH-01.
  - Ningún archivo de `<R>` cambió en `adapters/auth` ni en esa prueba (V-01: su hash es el de la tabla).
- **Reproducción paso a paso:** firmar un token con `ahora = Date.now() − 899 000` en un instante cuya fracción de segundo sea mayor que 1000 menos el tiempo de la petición (por ejemplo, ...,950 ms) y pedir `/api/me` de inmediato. Responde 401.
- **No lo toqué.** No es un conteo sin acotar ni una hermana de C-1, y la lista cerrada (PA-16) solo me deja cambiar la aserción de C-1. Esto es **PA-12** (rojo intermitente; no repito) y **PA-05** (falla una `*.ataque`). El remedio posible lo deciden el orquestador y el humano (por ejemplo, un C-2 que use 898 s o que alinee la firma al inicio de un segundo).

#### PA-07
Conté sobre `<scratchpad>/test-r0b.txt` (la salida completa, con `grep -o … | wc -l`):

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, exactamente los permitidos |

- **"Error no controlado" (I-1):**
  - 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" (pid 25568, `req-m` a `req-q`, 19:40:49Z).
  - 1 con "fallo simulado de la base al crear la sesión" (pid 25568, `req-x`, 19:40:49.888Z), de `intentos-r2`.
  - 3 `ZodError` "La URL del almacén debe ser http o https", de `archivos-d-r2` T-39 (pid 17000, 19:42:10Z a 19:42:11Z):
    - `POST /api/clases/:claseId/archivos` (`subida.url`);
    - `POST …/archivos/:archivoId/descarga` (`url`);
    - `GET /api/clases/:claseId/publicaciones` (`publicaciones.0.adjuntos.0.vistaPrevia.url`).
  - `GET /api/prueba/error-comun` "boom" (pid 26540, 19:42:18Z), de `salud.integracion`.
  - Ninguno fuera de I-1: 0 `Connection terminated`.
- **`P2028`** (todos de `timeout`, nivel 40, `SERVICIO_OCUPADO` y `503`):
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, pid 25392 `req-1`, 19:41:27.989Z: `servicio-ocupado.integracion`.
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`, pid 25392 `req-3`, 19:41:34.132Z: `servicio-ocupado.integracion`.
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`, pid 25392 `req-5`, 19:41:40.269Z: `servicio-ocupado.integracion`.
  - `POST /api/auth/login` › `tx.sesion.create()`, pid 19244 `req-1m`, 19:41:27.414Z: `cuentas-r3.ataque`.
  - `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`, pid 19244 `req-20`, 19:41:34.327Z: `cuentas-r3.ataque`.
- **Control positivo:** presente. Aparecen los 3 de `servicio-ocupado` con su ruta, y también los 2 de `cuentas-r3`.
- **Otros `503`, todos deliberados, sin `P2028` ni "Error no controlado":**
  - 6 de archivos sin almacén configurado (pids 31620 y 32048: `POST …/archivos`, `POST …/descarga` y `POST …/publicaciones`), de las pruebas que esperan `503` en `archivos.integracion` y `archivos-d-r1`.
  - `GET /api/salud`, de `salud-sin-base.integracion`.
- **Defecto de FIX-CLASES (`GET /api/admin/clases`):** **no apareció.** Hubo 0 `too_small` y 0 `TypeError`, y ningún `500` de esa ruta. Esta vez sí corrieron sus víctimas conocidas, `gestion-clases.integracion` y `gestion-02a-r1.ataque`, en verde. Su ausencia no prueba nada: es una carrera que depende de la intercalación.
- **PA-07: limpia.**

#### Tabla de hashes
Volví a sacar el SHA-256 de las 141 `*.ataque` después de la segunda corrida y coincide línea por línea con la tabla de esta ronda 0 (la de arriba). Solo cambia `backend/test/admin-muro-02b-r1.ataque.test.ts` (`294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0`). **La tabla sigue valiendo como base de V-01 del programador.**

#### Estado de la ronda 0
- **Hecho:**
  - C-1, aplicada y en verde, aislada y en la corrida completa.
  - Hermanas: ninguna nueva.
  - I-1 confirmado: 10.
  - I-2: ninguna.
  - Lint en verde.
  - PA-07 limpia en la segunda corrida.
  - Tabla de hashes.
- **Abierto:** el rojo intermitente de `nombres-tokens-r2.ataque` › «frontera de vigencia…» (PA-12 y PA-05). No es un rojo esperado de la ronda 0 ni cae en el alcance de FIX-CLASES. El orquestador dijo que no habría tercera corrida, así que el siguiente paso lo decide el humano.
- **Archivos nuevos en el scratchpad:** `c1-aislado.txt`, `test-r0b.txt`, `test-r0b-inicio.txt`, `actual-b.txt` y `tabla-b.txt`.


## FIX-CLASES — Ronda 1

# Reporte del Tester — FIX-CLASES · lecturas con relaciones anidadas en una sola instantánea — Ronda 1
Veredicto: **ROTO**. Dos hallazgos de severidad media, los dos fuera de las cuatro lecturas que se corrigieron, en dos lecturas que el inventario §D-3 declaró "no aplica". Las cuatro lecturas de FIX-CLASES y `editarClase` resisten todas las fronteras que ataqué.
Verificación propia: lint del backend en verde (código 0) · test del backend: `Test Files  1 failed | 148 passed (149)` · `Tests  2 failed | 1777 passed (1779)`. Los 2 rojos son los de T-01 y T-02.

### Precondiciones
- **Rama:** `fix/clases`.
- **PA-01:** la red activa es `IZZI-F281-5G` (Public), de confianza permanente. La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public).
- **Docker:** motor 28.5.1. Solo estaban los tres contenedores de `infra/`.
- **PA-08:** una sola suite a la vez.
- **V-01:** las 141 `*.ataque` coinciden con la tabla de la ronda 0. Solo `admin-muro-02b-r1` difiere de `main`, por C-1.
- **Pruebas previas, antes de atacar:** `cd backend; npx vitest run test/admin-muro-02b-r1.ataque.test.ts test/lecturas-consistentes.integracion.test.ts`, con código 0: `Test Files  2 passed (2)` · `Tests  19 passed (19)`. C-1 da 10 de 10 y PR-FX-01 a PR-FX-05 dan 9 de 9.

### Hallazgos

#### T-01 — `listarPublicaciones`: si la publicación del cursor se borra entre su lectura y la página, devuelve una página vacía con publicaciones detrás
Severidad: media.
Prueba: `backend/test/lecturas-fx-r1.ataque.test.ts`, caso «listarPublicaciones: con la publicación del cursor borrada después de leerla, devuelve 400 o las publicaciones que siguen, nunca una página vacía con publicaciones detrás».
- **Esperado:** `400 VALIDACION` ("cursor: no es válido"), o las publicaciones que siguen al cursor (`[P3, P4]`).
- **Obtenido:** `publicaciones: []` (`expected [] to deeply equal [ …(2) ]`, línea 1031). Las dos publicaciones siguen en la base, detrás del cursor.
- **Reproducción determinista:**
  - **Preparación:** una clase con 4 publicaciones (P1 a P4, de la más reciente a la más antigua) y `cursor = P2`.
  - **Gancho:** un doble del ejecutor deja pasar `publicacion.findFirst` (la comprobación del cursor) y, antes de la página, borra P2 por otra conexión. Es lo que hace su autor con `DELETE /api/clases/:claseId/publicaciones/:publicacionId`.
  - **Resultado:** `findMany` con el `cursor` de Prisma sobre una fila que ya no existe devuelve `[]`.
  - **Control:** sin el gancho, la misma llamada devuelve `[P3, P4]` (precondición del caso).
- **En la ruta:** `GET /api/clases/:claseId/publicaciones?cursor=<P2>` responde `200` con `{ publicaciones: [], siguienteCursor: null }`. "Ver más" se detiene y oculta en silencio el resto del muro.
- **Estable:** 2 corridas aisladas y la corrida completa, el mismo rojo.
- **Requisito o regla violada:** la regla T-18 de CLASES (aprobada por el humano, extensión de O-01; comentario en `adapters/db/clases.ts`). El cursor se comprueba por PK antes de paginar para que una fila que dejó de existir dé `400` y no una página vacía. `adapters/db/publicaciones.ts:59-61` (T-29) dice lo mismo para el muro: "Un cursor borrado, ajeno o inexistente responde igual". Aquí la comprobación (línea 165) y la página (línea 171) son dos sentencias con instantáneas distintas, así que la comprobación no protege la página.
- **Origen:** la regla es anterior a FIX-CLASES; FIX-CLASES no lo introdujo. Es el estado vecino "entre el cursor y la página" que el plan nombra en "Rondas de ataque", punto 1, y que §D-3, fila 10, no consideró: esa fila solo evaluó el borrado de la clase, que ahí sí es inocuo.

#### T-02 — `listarComentarios`: si el comentario del cursor se borra entre su lectura y la página, devuelve una página vacía con comentarios detrás
Severidad: media.
Prueba: `backend/test/lecturas-fx-r1.ataque.test.ts`, caso «listarComentarios: con el comentario del cursor borrado después de leerlo, devuelve 400 o los comentarios que siguen, nunca una página vacía con comentarios detrás».
- **Esperado:** `400 VALIDACION`, o `[K3, K4]`.
- **Obtenido:** `comentarios: []` (`expected [] to deeply equal [ …(2) ]`, línea 1079).
- **Reproducción:** igual que T-01. Hay 4 comentarios (K1 a K4, del más antiguo al más reciente) y `cursor = K2`. El gancho borra K2 después de `comentario.findFirst` (`publicaciones.ts:267`) y antes de `comentario.findMany` (`:273`).
- **En la ruta:** `GET /api/clases/:claseId/publicaciones/:publicacionId/comentarios?cursor=<K2>` responde `200` con `comentarios: []`. El borrado normal es `DELETE …/comentarios/:comentarioId`, que hacen el autor, el maestro como moderador o el admin.
- **Estable:** las mismas 3 corridas que T-01.
- **Requisito o regla violada:** la misma regla T-18 y T-29. Es hermano de T-01: mismo archivo, mismo mecanismo.

### Hermanos y estados vecinos (AGENTS, "Hermanos de un hallazgo")
**Del mecanismo de T-01 y T-02** (una comprobación del cursor y una página en sentencias separadas, con el `cursor` de Prisma). Lo busqué con `grep "cursor: {"` en `adapters/db`:
- **Protegidos, en verde:** `listarClasesAdmin` (`clases.ts:404`), `listarClasesInscritas` (`:340`) y `listarClasesImpartidas` (`:280`). Desde FIX-CLASES, la comprobación y la página comparten instantánea. Los tres casos del punto 1 «la clase del cursor se borra entre su lectura y la página» lo demuestran, y el control en READ COMMITTED confirma que el gancho sí rompe sin la instantánea.
- **Rotos:** `listarPublicaciones` (`publicaciones.ts:176`, T-01) y `listarComentarios` (`publicaciones.ts:278`, T-02).
- **Mismo patrón, sin disparador en producción:** `listarEnlacesRegistro` y la lista de registrados por enlace (`enlaces-registro.ts:52` y `:156`). Los enlaces no se borran, solo se revocan, así que hoy nadie puede borrar la fila del cursor. No los ataqué.
- **Inmunes por diseño:** `listarPersonas` y `listarAlumnosDeClase` (`inscripciones.ts`, `condicionesDePagina`) paginan por un conjunto de claves leído de `usuarios`, sin el `cursor` de Prisma. Una baja del alumno del cursor no vacía la página, y los usuarios no se borran (S-03). Lo leí en el código; no lo ataqué.

**Estados vecinos de las cuatro lecturas de FIX-CLASES** (plan, punto 1):

| Frontera | `listarClasesAdmin` | `listarClasesInscritas` | `listarClasesImpartidas` | `leerClase` / `editarClase` |
|---|---|---|---|---|
| Antes del padre | No atacada: la clase ausente es el caso normal (403 o sin fila), ya cubierto por las pruebas de CLASES | Igual | Igual | `editarClase`: `updateMany` en 0 → `null` → 403 |
| Entre el cursor y la página | Resiste (gancho) | Resiste (gancho) | Resiste (gancho) | No aplica |
| Entre el padre y el hijo | Resiste (PR-FX-02; reasignación de [A] a [B] y de [A, B] a [B, C] con la tabla retenida) | Resiste (PR-FX-03a y 03b; con dos maestros, los dos en orden) | Resiste (PR-FX-04) | Resiste (PR-FX-05). `editarClase` borrada entre la actualización y la relectura → `null`, sin lanzar |
| Entre la página y el conteo de alumnos (`_count`) | Resiste (`inscripciones` retenida: 200, 2 alumnos y su maestro) | No aplica | No atacada por separado: va dentro de la misma lectura de `findMany` | No aplica |
| Entre el hijo y el nieto (`usuarios`) | No atacada: los usuarios no se borran (S-03) | Igual | No aplica | Igual |
| Entre la página y el total | No atacada: el total es `count(*)` global y otros archivos crean y borran clases en paralelo, así que no hay valor determinista | Resiste (gancho): total = página | Resiste (gancho): total = página | No aplica |

### Atacado sin hallazgos
Todo está en `backend/test/lecturas-fx-r1.ataque.test.ts`, 24 casos (`npx vitest list test/lecturas-fx-r1.ataque.test.ts`: 24 líneas). Por punto del plan:
1. **Otras intercalaciones:**
   - Los 3 casos «la clase del cursor se borra entre su lectura y la página».
   - Los 2 casos «la clase se borra entre la página y el total».
   - Los 4 casos «otras fronteras con tabla retenida, por HTTP»: el conteo de alumnos; las reasignaciones [A] → [B] (sale exactamente [A], el de la instantánea) y [A, B] → [B, C] (sale [A, B]; nunca 0 ni 3); y dos maestros con la clase borrada.
   - Los 2 controles «sin la instantánea, el gancho reproduce el defecto». En READ COMMITTED, la página queda vacía y el total da 1 con 2 clases en la página. Demuestran que los verdes de arriba dependen de la instantánea.
2. **`editarClase`:** con el gancho, devuelve `null` sin lanzar. Por HTTP, `PUT /api/admin/clases/:claseId` y `GET /api/clases/:claseId` (admin) con la clase borrada mientras el sexto paso espera responden `403 SIN_ACCESO_A_LA_CLASE`, nunca 500.
3. **Aislamiento:**
   - Usé las 10 conexiones del pool en REPEATABLE READ, tanto con las cuatro lecturas reales como con 10 transacciones simultáneas con la opción. Después, 10 transacciones simultáneas sin opciones dan `read committed` en las 10 conexiones. El adaptador fija el nivel con `SET TRANSACTION`, que solo dura esa transacción (`@prisma/adapter-pg`, `startTransaction`).
   - **Estático:**
     - Fuera de `adapters/db` nadie nombra `enTransaccion`, `instantaneaUnica`, `isolationLevel` ni `RepeatableRead`.
     - `adapters/db/index.ts` no reexporta `enTransaccion`.
     - Los niveles de aislamiento solo aparecen en `cliente.ts`.
     - `instantaneaUnica: true` aparece exactamente 4 veces, todas en `clases.ts`.
     - Único import de `cliente.ts` fuera de `db`: `import type { EjecutorSql }` en `adapters/queue/index.ts`, que no da acceso a la opción.
4. **Pool lleno:**
   - Con las 10 conexiones ocupadas, las cuatro lecturas rechazan con `AppError` `SERVICIO_OCUPADO` 503, con causa `P2028`, en menos de 4.5 s. Después de cada una, el pool conserva sus 10 conexiones y la lectura vuelve a responder.
   - `GET /api/admin/clases` lanzada con el pool lleno espera en `withProfile` y, al liberar el pool, responde 200 (nunca 500).
   - **Precisión:** por HTTP no se llega al `503` de la lectura, porque el middleware espera sin límite antes de llegar a ella. El `503` de la lectura se comprueba en el adaptador.
5. **Las "no aplica" de §D-3, con la clase borrada en medio:**
   - `listarPersonas` (`maestros_de_clase` retenida) resuelve.
   - `buscarDatosDePertenencia` resuelve y no concede nada.
   - `listarPublicaciones` (`comentarios` retenida) resuelve.
   - `listarComentarios` (gancho tras leer la publicación) resuelve.
   - **Ningún `500`:** el inventario acierta en el borrado de la clase. Falla en el borrado de la fila del cursor (T-01 y T-02).
6. **Escrituras dentro de la instantánea:** el cuerpo de las cuatro funciones lleva `instantaneaUnica: true` y no contiene `create`, `update`, `upsert`, `delete`, `$executeRaw`, `$queryRawUnsafe` ni `FOR UPDATE`, `FOR SHARE` o `FOR NO KEY UPDATE`.
7. **Logs:** ver PA-07. Mi archivo registra en nivel `error` y no escribió ninguna línea de log en sus corridas aisladas.

**Método.** No importé nada de otra prueba.
- **Tabla retenida:** reescribí el de §D-4 (`LOCK TABLE … NOWAIT`, con la tabla literal en una rama por tabla, reintento ante `55P03` con 20 a 50 ms de espera y 60 s de presupuesto, `timeout: 15_000` y `maxWait: 5_000`). La operación se da por formada solo cuando un proceso con la marca `application_name` del archivo espera esa tabla detrás del pid de la retenedora. La promesa de la lectura nunca se devuelve desde la transacción.
- **Gancho:** un doble del ejecutor (un Proxy sobre el cliente de Prisma, que también envuelve la transacción interactiva). Después de una llamada concreta del adaptador, borra por otra conexión antes de la sentencia siguiente. Así se separan fronteras que una tabla retenida no puede separar, como dos sentencias sobre la misma tabla.

### No atacado y por qué
- **Bajas físicas de usuarios** entre el hijo y el nieto: no existen (S-03).
- **Total de `listarClasesAdmin`:** no hay valor determinista con otros archivos en paralelo (O-3).
- **`listarEnlacesRegistro`:** los enlaces no se borran.
- **El `503` por HTTP con el pool lleno:** el middleware espera antes, como se explica en el punto 4.
- **Más de 5 s detrás de una tabla retenida** (el `timeout` de la transacción de lectura): retener `clases` o `maestros_de_clase` más de 5 s haría caer las transacciones de otros archivos ("Bloqueos en las pruebas"). Lo descarté.
- **Frontend:** FIX-CLASES no lo toca.

### Corrida completa del backend
- **Lint:** `cd backend; npm run lint > <scratchpad>/lint-r1.txt 2>&1`, con código 0. Prettier responde "All matched files use Prettier code style!". Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **Carga previa:** 40 % y 20 % en dos lecturas separadas 10 s.
- **Test:** `cd backend; npm test > <scratchpad>/test-r1.txt 2>&1`, de 20:46:07Z a 20:47:31Z, con código 1.
  ```
   Test Files  1 failed | 148 passed (149)
        Tests  2 failed | 1777 passed (1779)
     Start at  14:46:11
     Duration  79.25s (transform 9.72s, setup 4.19s, import 141.83s, tests 598.83s, environment 34ms)
  ```
  - Última línea: `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`.
  - **Rojos:** solo los de T-01 (143 ms) y T-02 (151 ms). `nombres-tokens-r2` › «frontera de vigencia…» pasó.
  - **Tiempos límite:** 0 `timed out`, 0 `Unable to start a transaction` y 0 `Connection terminated`.
  - **Conteos:** 149 archivos y 1779 casos, contra 148 y 1755 de la corrida del manager: +1 archivo y +24 casos, los de `lecturas-fx-r1`.

### PA-07
Conté sobre la salida completa:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, exactamente los permitidos |

- **"Error no controlado" (I-1):**
  - 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "…al crear la sesión" (pid 3008, 20:46:38Z), de `intentos-r2`.
  - 3 `ZodError` de URL del almacén (`POST …/archivos`, `POST …/descarga` y `GET …/publicaciones`; pid 3816, 20:47:21Z), de `archivos-d-r2` T-39.
  - "boom" de `GET /api/prueba/error-comun` (pid 23124).
- **`P2028`** (de `timeout`, nivel 40, `503`):
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()` (pid 21896, `req-1`), de `servicio-ocupado.integracion`.
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()` (pid 21896, `req-3`), de `servicio-ocupado.integracion`.
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `$queryRawUnsafe()` (pid 21896, `req-5`), de `servicio-ocupado.integracion`.
  - `POST /api/auth/login` › `tx.sesion.create()` (pid 30944, `req-1m`), de `cuentas-r3`.
  - `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()` (pid 30944, `req-20`), de `cuentas-r3`.
  - Control positivo presente. Ningún `P2028` de las cuatro lecturas. Los que provoqué yo son de adaptador, no pasan por el logger.
- **`too_small` 0 y `TypeError` 0.** Ningún `500` de `GET /api/admin/clases`, `/api/clases/inscritas`, `/api/clases/impartidas`, `GET /api/clases/:claseId` ni `PUT /api/admin/clases/:claseId`.
- **Los demás `5xx` son conocidos:** los de I-1; los `503` deliberados de archivos sin almacén (2 de `POST …/archivos`, 2 de `…/descarga` y 1 de `POST …/publicaciones`); y `GET /api/salud` de `salud-sin-base`.
- **PA-07: limpia.**

### Archivos
- **En el repositorio:** `backend/test/lecturas-fx-r1.ataque.test.ts` (nuevo, 24 casos) y este reporte. No toqué producción ni las pruebas del programador.
- **En el scratchpad:** `fx-r1-a.txt` a `fx-r1-d.txt` (corridas aisladas), `lint-r1.txt`, `test-r1.txt`, `test-r1-inicio.txt`, `list-fx-r1.txt`, `r1-previas.txt` y `tabla-fx-r1.md`.

### Tabla de SHA-256 de las 142 `*.ataque` al cierre de la ronda 1 de FIX-CLASES (base de V-01 de la siguiente ronda; 1 nueva, ninguna existente cambia)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `A2200527FFD03D3033EEA53400F6974822E211C0AA96ED230FFDFEFE405FE55D` | `backend/test/lecturas-fx-r1.ataque.test.ts` | nueva (FIX-CLASES r1) |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `09E0FDB71E8862F37D681D2A9CB74434227FFEA81E71EF34B87C4AC8BDAB4E47` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `90AF141297CD9309D7E6316833B2BD222347BD25292AF890A55F98126093522C` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `5A856883D032B3ECB2F766BAD450C28D79FD761788C01C1DED16B0EB6F95371D` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

### C-2 (Enmienda 1)
Encargo del orquestador después de la Enmienda 1 aprobada (§D-5, V-04 con seis usos, PA-22; A-2 autorizada por el humano en `aprobacion.md`). `listarPublicaciones` y `listarComentarios` corren ahora con `instantaneaUnica`, y mi caso de la ronda 1 fijaba el inventario en cuatro usos. Es la única reescritura: nada más del archivo cambia.

- **Caso:** `backend/test/lecturas-fx-r1.ataque.test.ts` › «la opción solo se puede activar dentro de adapters/db: … y la opción solo se pide en las seis lecturas (cuatro de clases y dos del muro)».
- **Lo que sigue protegiendo:** nadie fuera de `adapters/db` nombra `enTransaccion`, `instantaneaUnica`, `isolationLevel` ni `RepeatableRead`; `index.ts` no reexporta `enTransaccion`; los niveles de aislamiento solo viven en `cliente.ts`. Solo cambia la expectativa de los usos (`clases.ts` 4 y `publicaciones.ts` 2) y el título. La lista ahora se ordena antes de comparar, para no depender del orden de `readdirSync`.
- **Formato:** `npx prettier --write test/lecturas-fx-r1.ataque.test.ts` desde `backend/` respondió "(unchanged)". `npx eslint --config ../eslint.config.mjs test/lecturas-fx-r1.ataque.test.ts`: código 0.

```diff
@@ -755,7 +755,7 @@
     expect(rc.niveles).toEqual(Array.from({ length: CONEXIONES_DEL_POOL }, () => "read committed"))
   }, 60_000)
 
-  it("la opción solo se puede activar dentro de adapters/db: ningún archivo fuera de adapters/db nombra enTransaccion, instantaneaUnica o isolationLevel, index.ts no reexporta enTransaccion, isolationLevel solo vive en cliente.ts y la opción solo se pide en las cuatro lecturas", () => {
+  it("la opción solo se puede activar dentro de adapters/db: ningún archivo fuera de adapters/db nombra enTransaccion, instantaneaUnica o isolationLevel, index.ts no reexporta enTransaccion, isolationLevel solo vive en cliente.ts y la opción solo se pide en las seis lecturas (cuatro de clases y dos del muro)", () => {
     const raiz = join(import.meta.dirname, "..", "src")
     const archivos = readdirSync(raiz, { recursive: true, encoding: "utf8" })
       .map((ruta) => ruta.split(sep).join("/"))
@@ -784,7 +784,9 @@
           .length
         return n === 0 ? [] : [`${ruta}:${String(n)}`]
       })
-    expect(usos).toEqual(["adapters/db/clases.ts:4"])
+    // C-2, Enmienda 1 de FIX-CLASES (§D-5, V-04): además de las cuatro lecturas de clases.ts,
+    // listarPublicaciones y listarComentarios de publicaciones.ts corren en la instantánea única.
+    expect([...usos].sort()).toEqual(["adapters/db/clases.ts:4", "adapters/db/publicaciones.ts:2"])
   })
 })
 
```

- **Corrida aislada:** `cd backend; npx vitest run test/lecturas-fx-r1.ataque.test.ts`, con código 0:
  ```
   Test Files  1 passed (1)
        Tests  24 passed (24)
     Start at  15:14:29
     Duration  20.71s (transform 640ms, setup 30ms, import 1.26s, tests 13.49s, environment 0ms)
  ```
  T-01 y T-02 ya pasan con el remedio de la Enmienda 1. No corrí la suite completa, por instrucción del orquestador: la corren el programador en E-7 y después el manager.
- **SHA-256 del archivo:** antes `A2200527FFD03D3033EEA53400F6974822E211C0AA96ED230FFDFEFE405FE55D`, ahora **`CDCF742A5C2CADFEF43D8FBEA9D993D19594D7EFC203F5972489DBB76A8BC638`**.

#### Tabla de SHA-256 de las 142 `*.ataque` después de C-2 (base de V-01 del programador para retomar; solo cambia `lecturas-fx-r1`)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `CDCF742A5C2CADFEF43D8FBEA9D993D19594D7EFC203F5972489DBB76A8BC638` | `backend/test/lecturas-fx-r1.ataque.test.ts` | nueva en r1; cambia por C-2 |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `09E0FDB71E8862F37D681D2A9CB74434227FFEA81E71EF34B87C4AC8BDAB4E47` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `90AF141297CD9309D7E6316833B2BD222347BD25292AF890A55F98126093522C` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `5A856883D032B3ECB2F766BAD450C28D79FD761788C01C1DED16B0EB6F95371D` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |


## FIX-CLASES — Ronda 2

# Reporte del Tester — FIX-CLASES · Enmienda 1 (muro e hilo en una sola instantánea) — Ronda 2
Veredicto: **RESISTE**. Sin hallazgos.
Verificación propia: lint del backend en verde (código 0) · test del backend en verde (código 0): `Test Files  150 passed (150)` · `Tests  1802 passed (1802)`.

### Precondiciones
- **Rama:** `fix/clases`.
- **PA-01:** la red es `IZZI-F281-5G` y la regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public).
- **Docker:** encendido.
- **PA-08:** una sola suite a la vez.
- **Carga antes de la corrida completa:** 29 % y 27 %.
- **V-01:** las 142 `*.ataque` coinciden con la tabla de "C-2 (Enmienda 1)". Ninguna cambió en esta ronda; solo se agrega `lecturas-fx-r2`.
- **Lo que leí:** el diff de `publicaciones.ts` (las dos funciones envueltas en `enTransaccion(…, { instantaneaUnica: true })`, con las mismas sentencias en el mismo orden), `resumen-programador.md` ("Corrección de la ronda 1"), la verificación del manager y el punto 8 de "Rondas de ataque".

### Regresión
- **Comando:** `cd backend; npx vitest run test/lecturas-fx-r1.ataque.test.ts test/admin-muro-02b-r1.ataque.test.ts test/lecturas-consistentes.integracion.test.ts test/lecturas-fx-r2.ataque.test.ts`, con código 0: `Test Files  4 passed (4)` · `Tests  66 passed (66)`.
- **Desglose:** 24 de `lecturas-fx-r1` (con C-2, incluidos T-01 y T-02), 10 de C-1, 13 de `lecturas-consistentes` y 19 nuevos.

### Hallazgos
Ninguno.

### Hermanos y estados vecinos
**Fronteras de sentencia de las dos envolturas nuevas.** Cada celda dice qué se borra y cómo:

| Frontera | `listarPublicaciones` | `listarComentarios` |
|---|---|---|
| Antes de la primera sentencia (cursor inexistente) | 400 VALIDACION (HTTP) | 400 VALIDACION (HTTP) |
| Publicación → cursor | No aplica | La publicación entera, con su `DELETE` real: el cursor sigue valiendo y salen los siguientes |
| Cursor → página | La fila del cursor, con `DELETE` real del autor y del admin. La clase entera | La fila del cursor por los cuatro caminos (autora, maestro moderador, admin y `mis-comentarios`). Una fila de la página. La clase entera |
| Página → conteo | La clase entera (programador: PR-FX-06b, la publicación) | No aplica |
| Conteo → adjuntos | La publicación, con `DELETE` real del admin: sale con sus 2 comentarios y su adjunto. La clase entera | No aplica |

En todas las celdas, el resultado sale de la instantánea, sin lanzar y sin página vacía.

**Cursores manipulados por HTTP:**
- `400 VALIDACION`:
  - en publicaciones: cursor inexistente, de otra clase, o el id de un comentario;
  - en comentarios: cursor inexistente, de otra publicación de la misma clase, o el id de una publicación.
- Cursor en mayúsculas: `200` con las filas que siguen, en las dos rutas.

**Mismo mecanismo en todo el inventario con cursor:**
- **Las tres listas de `clases.ts`:** siguen en verde (r1).
- **`enlaces-registro.ts`, O-4, confirmado con pruebas:**
  - En `backend/src` solo se borran `inscripcion`, `maestroDeClase`, `publicacion` y `comentario` (`deleteMany`), sin `DELETE FROM` ni `TRUNCATE` crudos. Nada borra `enlaces_registro` ni `usuarios`, así que no hay disparador.
  - Con el gancho y la única operación que existe sobre un enlace (revocarlo por la ruta real o con `revocado_en`), `listarRegistradosPorEnlace` con cursor trae los registrados que siguen y `listarEnlacesRegistro` conserva el conteo. Nada lanza ni vacía la página.
  - **Lo que no pude refutar:** O-4 tiene razón; sin borrados no hay forma de vaciar la página.
- **`inscripciones.ts`, por conjunto de claves:** con el gancho, después de leer la clave del cursor, la baja de ese alumno por `DELETE /api/clases/:claseId/alumnos/:alumnoId` real deja a `listarAlumnosDeClase` y a `listarPersonas` trayendo los que siguen. Son inmunes, como dice el plan.

### Atacado sin hallazgos
Todo está en `backend/test/lecturas-fx-r2.ataque.test.ts`, 19 casos (`npx vitest list test/lecturas-fx-r2.ataque.test.ts`: 19 líneas).
1. **Regresiones:** ver arriba.
2. **Bordes de las envolturas:** los 6 casos de fronteras y los 2 de cursores manipulados.
   - **"Ver más" por HTTP con borrados concurrentes** (2 casos de 10 rondas; 41 filas, y las de índice impar nunca se borran):
     - **Qué corre a la vez en cada ronda:** la página con cursor, el borrado del cursor y el borrado de una fila de la página. En publicaciones borran el autor y el admin; en comentarios, `mis-comentarios` y el moderador.
     - **Qué se exige:** `200` con exactamente la página de antes o la de después, más `siguienteCursor` igual a la última fila; o `400 VALIDACION`. Nunca vacía ni `500`, y los dos `DELETE` dan `204`.
     - **Quién ganó en la corrida completa:**
       - publicaciones: 10 veces "200 antes";
       - comentarios: 6 veces "200 antes" y 4 veces "400".
     - **En las corridas aisladas:** publicaciones, 10 veces "200 antes"; comentarios, 10 veces "400".
     - **Lo que no alcanzó:** la carrera por HTTP no llegó al estado intermedio (borrado después de la comprobación y antes de la página). Ese estado lo cubren de forma determinista los casos del gancho.
3. **Aislamiento, bloqueos y pool:**
   - **Espía del ejecutor** (anota el `transaction_isolation` de cada transacción que abre el adaptador): `crearPublicacion`, `crearComentario`, `borrarComentario` y `borrarPublicacion` dan `read committed`; `listarPublicaciones` y `listarComentarios` dan `repeatable read`.
   - **La lectura no espera al borrado:** con un `DELETE` del comentario y un `UPDATE` de la publicación sin confirmar (filas bloqueadas), las dos lecturas terminan en menos de 2 s y ven las filas todavía vivas. Después se deshace.
   - **El borrado no espera a la lectura:** en todos los casos del gancho, el `DELETE` real responde `204` mientras la transacción REPEATABLE READ de la lectura sigue abierta.
   - **Pool lleno:** las dos lecturas del muro rechazan con `AppError` `SERVICIO_OCUPADO` 503, con causa `P2028`, en menos de 4.5 s. El pool conserva sus 10 conexiones y después responden. Con las cuatro de r1 quedan cubiertas las seis lecturas.
4. **Ejecutor de una transacción de afuera:**
   - **Control documentado:** dentro de una transacción READ COMMITTED de afuera manda la de afuera. Con el cursor borrado después de comprobarlo, la página queda vacía. Es el comportamiento descrito en §D-5 (la protección queda a cargo de quien abrió la transacción), no un hallazgo.
   - **V-04, estático:** en `backend/src`, las dos funciones solo se llaman desde `handlers/clases/muro.ts`, con un único argumento, así que ningún camino de producción les pasa un ejecutor.
5. **Las "no aplica" que quedan:** ver "Hermanos".
6. **Estático de `publicaciones.ts`:** las dos lecturas llevan `instantaneaUnica: true` y no escriben (sin `create`, `update`, `upsert`, `delete`, `$queryRaw` ni `$executeRaw`, y sin `FOR UPDATE`, `FOR SHARE` o `FOR NO KEY UPDATE`, con los comentarios descontados). Las cuatro escrituras no usan la opción.
7. **Logs:** ver PA-07. Mi archivo registra en nivel `error` y no escribió ninguna línea de log; solo imprime la distribución de "Ver más".

### No atacado y por qué
- **El `503` por HTTP de las lecturas del muro con el pool lleno:** el sexto paso, que no va en transacción, espera a una conexión antes de llegar a la lectura (igual que en r1). El `503` se comprobó en el adaptador.
- **Más de 5 s detrás de una tabla retenida:** haría caer las transacciones de otros archivos ("Bloqueos en las pruebas").
- **Frontend:** FIX-CLASES no lo toca.

### Corrida completa del backend
- **Lint:** `cd backend; npm run lint > <scratchpad>/lint-r2.txt 2>&1`, con código 0. Prettier responde "All matched files use Prettier code style!". Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **Test:** `cd backend; npm test > <scratchpad>/test-r2.txt 2>&1`, de 21:41:19Z a 21:42:53Z, con código 0. Última línea:
  ```
   Test Files  150 passed (150)
        Tests  1802 passed (1802)
     Start at  15:41:23
     Duration  89.32s (transform 11.21s, setup 4.29s, import 154.01s, tests 683.31s, environment 42ms)
  ```
  - **Tiempos límite:** 0 `timed out`, 0 `Unable to start a transaction` y 0 `Connection terminated`.
  - **`nombres-tokens-r2`:** «frontera de vigencia…» pasó.
  - **Conteos:** 150 archivos y 1802 casos, contra 149 y 1783 de la corrida del programador: +1 archivo y +19 casos, los de `lecturas-fx-r2`.

### PA-07
Conté sobre la salida completa:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, exactamente los permitidos |

- **"Error no controlado" (I-1):**
  - 5 de "fallo simulado de la base en la búsqueda" y 1 de "…al crear la sesión", en `POST /api/auth/login` (pid 11200, `intentos-r2`).
  - 3 `ZodError` de URL del almacén (pid 12092, `archivos-d-r2` T-39).
  - "boom" (pid 27312, `salud.integracion`).
- **`P2028`** (de `timeout`, nivel 40, `503`):
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()` y `POST …/comentarios` › `$queryRawUnsafe()` (pid 1796, `servicio-ocupado.integracion`). Es el control positivo.
  - `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()` (pid 24432, `cuentas-r3`).
- **`too_small` 0 y `TypeError` 0.** Ningún `500` de las seis lecturas ni de `GET /api/admin/clases`.
- **Los demás `5xx` son conocidos:** los de I-1; los `503` deliberados de archivos sin almacén; y `GET /api/salud` de `salud-sin-base`.
- **PA-07: limpia.**

### Archivos
- **En el repositorio:** `backend/test/lecturas-fx-r2.ataque.test.ts` (nuevo, 19 casos) y este reporte. No toqué producción ni las pruebas del programador.
- **En el scratchpad:** `fx-r2-a.txt` a `fx-r2-d.txt` (corridas aisladas; en a y b, los rojos de mis propios errores de prueba, ya corregidos: un índice fuera de rango y el comentario de la función siguiente dentro del corte de texto), `r2-regresion.txt`, `lint-r2.txt`, `test-r2.txt`, `test-r2-inicio.txt`, `list-fx-r2.txt` y `tabla-fx-r2.md`.

### Tabla de SHA-256 de las 143 `*.ataque` al cierre de la ronda 2 de FIX-CLASES (base de V-01 del cierre; 1 nueva, ninguna existente cambia)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `CDCF742A5C2CADFEF43D8FBEA9D993D19594D7EFC203F5972489DBB76A8BC638` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `E025FA8256691F37343A6C2DCDF19518A52A4362A0616CCEAAAA14914FAAA65D` | `backend/test/lecturas-fx-r2.ataque.test.ts` | nueva (FIX-CLASES r2) |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `5D7D6AD54C1D6DE2BEF7062C271C25DB3CC2003FF81D890679F7D16D7782942D` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `4EADA2BB7746D2F630D5F418626B0AC8F09D47C71A6C3FF305946D6B2161C45D` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `09E0FDB71E8862F37D681D2A9CB74434227FFEA81E71EF34B87C4AC8BDAB4E47` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `90AF141297CD9309D7E6316833B2BD222347BD25292AF890A55F98126093522C` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `5A856883D032B3ECB2F766BAD450C28D79FD761788C01C1DED16B0EB6F95371D` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `063878608A527EB77390024026D5DBA92739F50EF8DCFDDD06C2083B130F808B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |
