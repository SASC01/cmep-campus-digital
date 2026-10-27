# Resumen del programador — CHORE-03 · 03c, ronda 2 (corrección de T-05, 2026-10-27)

> Transcripción del orquestador: el programador entregó este resumen como texto en su respuesta final; se copia tal cual, sin cambiar contenido.

Plan: `docs/trabajo/CHORE-03-errores-api/plan.md` (Enmienda 5, LISTO; DH-9 = (a))
Pasos completados: 5 de 5 de la ronda 2 de 03c (pasos 8 a 12). El paso 7 (cierre) le toca al orquestador.

T-05 quedó corregido. Las 11 rojas del tester están en verde sin tocarlas, la suite completa pasa y no hubo ninguna PARADA.

**Archivos modificados**
- Producción, exactamente tres líneas añadidas en cada uno y ninguna borrada (el comentario de dos líneas de §D-4 y `if (<m>.isError) <m>.reset()`, justo después de la guarda `isPending`). La línea nueva queda en:
  - `frontend/src/features/admin/components/formulario-invitar-maestro.tsx` (`invitar`, :25)
  - `formulario-invitacion-masiva.tsx` (`invitar`, :34)
  - `formulario-generar-enlace.tsx` (`generar`, :45)
  - `formulario-corregir-correo.tsx` (`corregir`, :31)
  - `frontend/src/features/auth/components/formulario-login.tsx` (`inicioSesion`, :28)
  - `formulario-registro.tsx` (`alta`, :28)
  - `formulario-registro-maestro.tsx` (`alta`, :32)
  - `formulario-recuperar.tsx` (`recuperar`, :28)
  - `formulario-nueva-contrasena.tsx` (`nuevaContrasena`, :69)
  - `formulario-cambiar-contrasena.tsx` (`cambiar`, :28)
- Pruebas, solo mis archivos:
  - `frontend/src/features/admin/formularios-ch3.test.tsx`: imports nuevos; el tipo de `respuestas` y de `ejecutar` acepta `Promise<Response>` para retener una petición; describe nuevo de la Enmienda 5.
  - `frontend/src/features/auth/formularios-ch3.test.tsx`: imports de `Route`, `Routes`, `useLocation` y de `./data`; el mismo tipo de `respuestas`; describe nuevo con `montarConRutas` y `Destino`.
  - `frontend/src/lib/errores-de-api-estatico.test.ts`: CH3-C13.
- No toqué ningún `hooks.ts`, ni `buscador-de-cuenta.tsx`, `ficha-de-cuenta.tsx`, `tabla-enlaces.tsx` o cualquier `*.ataque`.

`git diff --stat 9272501e` de los diez: 10 × `3 +++`, `10 files changed, 30 insertions(+)`. `git diff --numstat` da `3 0` en cada uno. Muestra (`formulario-invitar-maestro.tsx`):
```
@@ -20,6 +20,9 @@ export function FormularioInvitarMaestro() {
   const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
     evento.preventDefault()
     if (invitar.isPending) return
+    // T-05 de CHORE-03: el error del servidor del envío anterior se quita antes de validar,
+    // para que la persona lea un solo mensaje: el de este envío.
+    if (invitar.isError) invitar.reset()
```

**Verificación** (desde `frontend/`, una suite a la vez; antes comprobé que no hubiera ningún `vitest` en marcha)
- **Paso 10:**
  - `npx vitest run src/features/admin/errores-ch3-r1.ataque.test.tsx` → `Tests  344 passed (344)`
  - `npx vitest run src/features/auth/errores-ch3-r1.ataque.test.tsx` → `Tests  377 passed (377)`
- **lint:** `npm run lint` → exit 0; antes `All matched files use Prettier code style!`; última línea `> tsc -b` (sin errores).
- **test:** `npm run test` → exit 0; `Test Files  234 passed (234)` · `Tests  5161 passed (5161)` · `Duration  371.76s`. `Test timed out` = 0, `Hook timed out` = 0 (`grep -c` sobre la salida).
- **build:** `npm run build` → exit 0; última línea `✓ built in 2.25s` (solo el aviso de siempre del tamaño de los bloques).
- **prisma validate:** n/a.

**Comprobación de que las pruebas nuevas detectan el defecto.** Quité la línea en `formulario-corregir-correo.tsx` y en `formulario-cambiar-contrasena.tsx` (copia previa en el scratchpad). Con `-t`:
- CH3-C09 de corregir: `3 failed`.
- CH3-C10 del cambio obligatorio: `6 failed`.

Después restauré la copia y `git diff --stat` volvió a `3 +++` en los dos.

**Pruebas requeridas**
- T-05, las 11 rojas del tester, ahora en verde:
  - `features/admin/errores-ch3-r1.ataque.test.tsx` › "ataque CHORE-03 03c r1 · el MensajeError de un envío anterior y el error local del siguiente" › "%s: tras un VALIDACION del servidor, un envío que la validación local rechaza deja un solo mensaje (el ErrorDeCampo nuevo), no también el MensajeError viejo". Son 4: `invitar maestro`, `generar enlace`, `corregir el correo` e `invitación masiva`. El control `buscar una cuenta` sigue en verde.
  - `features/auth/errores-ch3-r1.ataque.test.tsx` › mismo describe › "%s: tras un VALIDACION del servidor, un envío que la validación local rechaza deja un solo mensaje (el error local), no también el MensajeError viejo". Son 7: `iniciar sesión`, `registro de estudiante`, `registro de maestro por enlace`, `recuperar contraseña`, `restablecer contraseña`, `establecer contraseña (invitación)` y `cambio obligatorio de contraseña`.
- **CH3-C09** (`admin/formularios-ch3.test.tsx`):
  - "CH3-C09: precondición, cada formulario de T-05 tiene su rechazo local, su éxito y su éxito visible".
  - "CH3-C09: %s, rechazo del servidor %s y después rechazo local (%s): solo el ErrorDeCampo, sin petición; repetir el control corregido manda una petición nueva (F1 otra vez y luego la respuesta buena)", con 24 tuplas:
    - invitar maestro: correo sin arroba y nombre solo de espacios.
    - invitación masiva: lista solo de espacios y más de 100 líneas; además de F1, F3 y el código fijo, `CUPO_DIARIO_INSUFICIENTE` con texto.
    - generar enlace: vigencia 0 y vigencia 31.
    - corregir el correo: correo sin arroba.
    - En todas: F1, F3 y `CORREO_EN_USO` con texto fijo.
    - Control: buscar una cuenta con F1.
  - Comprueba (a) a (e), y además que lo escrito se conserva y que el botón queda sin `aria-busy` ni `aria-disabled`.
- **CH3-C10** (`auth/formularios-ch3.test.tsx`):
  - "CH3-C10: precondición, los siete formularios tienen su rechazo local y su destino".
  - "CH3-C10: %s, rechazo del servidor %s y después rechazo local (%s): solo el error local, sin petición; repetir el control corregido manda una petición nueva (F1 otra vez y luego el destino de siempre)", con 33 tuplas: las 11 de rechazo local del plan × F1, F3 y `DEMASIADOS_INTENTOS` con texto fijo.
  - El destino se comprueba con rutas reales de `MemoryRouter`: la ruta del rol, `/login` con su `aviso` o la confirmación fija de recuperar.
- **CH3-C11:**
  - `admin/formularios-ch3.test.tsx`: "CH3-C11: %s, rechazo local y después F1 del servidor: solo el MensajeError, sin ErrorDeCampo y con una petición; repetir el control con la respuesta buena quita la alerta" (4 casos).
  - `auth/formularios-ch3.test.tsx`: "CH3-C11: %s, rechazo local y después F1 del servidor: solo el MensajeError, sin ErrorDeCampo y con una petición; repetir el control con la respuesta buena lleva al destino de siempre" (7 casos).
- **CH3-C12 (1)**, en `admin`: "CH3-C12: %s, tras un envío aceptado, un rechazo local deja el texto de éxito «%s» y el ErrorDeCampo, sin role=alert", con invitar maestro y corregir el correo.
- **CH3-C12 (2):** "CH3-C12: %s, dos envíos válidos que el servidor rechaza (F1 y después %s) dan un solo MensajeError, el del segundo, y dos peticiones" (4 casos en `admin` y 7 en `auth`). En la masiva, el segundo rechazo es `CUPO_DIARIO_INSUFICIENTE`.
- **CH3-C12 (3):** "CH3-C12: %s, un envío con la petición en vuelo (submit del formulario) no manda otra petición y, al soltarla con F1, queda un solo MensajeError" (4 casos en `admin` y 7 en `auth`). Por N-25, el segundo envío es `fireEvent.submit` sobre el `<form>`, con la primera petición retenida y el botón ya en `aria-busy="true"`.
- **CH3-C13** (`lib/errores-de-api-estatico.test.ts`): "CH3-C13: en los diez formularios de T-05, `if (<m>.isError) <m>.reset()` aparece una vez, con su mutación, después de la guarda isPending y antes del primer safeParse; ninguno gana una ref; en admin y auth solo esos diez y buscador-de-cuenta reinician una mutación". Cómo cuenta:
  - Quita los comentarios antes de buscar.
  - Por D-2, cuenta `<m>.reset()` solo para los nombres que salen de un `const X = use…(`, así que `formulario.reset()` no cuenta.
  - Comprueba que `buscar.reset()` sigue sin condición.
- **Frases de recuperación:** "repetir el control" está en C09, C10 y C11. Ir y volver, el historial y pulsar la sección activa no cambian; los siguen cubriendo `admin/rutas-ch3-r1` y `auth/rutas-ch3-r1`, que pasan.

**Conteos** (`npx vitest list <archivo>`, sin títulos repetidos con `sort | uniq -d`)
- `admin/formularios-ch3.test.tsx`: 77 (eran 38; +39: C09 25, C11 4, C12 10).
- `auth/formularios-ch3.test.tsx`: 90 (eran 35; +55: C10 34, C11 7, C12 14).
- `lib/errores-de-api-estatico.test.ts`: 5 (eran 4; +1, C13).
- Total nuevo: 95. Cuadra con la corrida: 5066 + 95 = 5161.

**V-01:** `sha256sum` de las `*.ataque` (`git ls-files -co --exclude-standard`) contra la tabla "de las 223 `*.ataque` al cierre de la ronda 1 de CHORE-03 03c" de `reporte-tester.md`. Base 223, actual 223, los 223 hash idénticos. El único `diff` fue un artefacto de mi comando: `tr` pasó a minúsculas `apiClient` en las rutas de la tabla, pero los hash coinciden.

**Reglas estáticas, una por una**
- `mensajeDelAvisoDeCalificar` aparece solo en `tareas/hooks.ts` y `tareas/lib.ts` (`grep -lE` en producción).
- `disabled`, `?? []`, `fetch(` y `console.` no aparecen en `tareas/{lib,data,hooks}.ts` (`grep -nE`: nada).
- U+2800 y U+1D159 (literales o escapados), `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =` y `\r\n|\r`: nada en producción (`grep -lE` más un script de Python para los literales).
- `esErrorDeCursor` se define solo en `lib/errores-de-api.ts:37`, y `calificaciones` no escribe `esErrorDeCursor(`.
- `calificaciones` sigue con 11 archivos de producción y ninguno lee `.message`.
- Ningún tipo nuevo fuera de `types.ts` en `data.ts` ni `lib.ts` de `admin` y `auth` (`grep` de `type|interface`: nada).
- Invisibles: CH3-A24 recorre mis archivos `-ch3` y pasa.
- El punto 4 de la Enmienda 4 y las reglas que leen `admin` y `auth` las corrí aparte: `npx vitest run` sobre `admin/cuentas-r1`, `admin/maestros-03b-r1`, `app/cuentas-r1`, `auth/enlace-r1`, `styles/clases-r1`, `clases/ver-mas-01e-r3`, `tareas/estatico-01c-r1`, `clases/errores-ch3-r1`, `lib/errores-ch3-r1`, `clases/refactor-01c-r1`, `calificaciones/estatico-01d`, `tareas/aviso-calificar-01c-r3`, `components/layout/estatico-r1` y `lib/estatico-ch3-r1` → `Test Files  14 passed (14)` · `Tests  377 passed (377)`.
- Las tres líneas no traen `enEspera=`, `disabled`, `.message` ni importaciones.

**Hallazgos atendidos:** T-05 corregido.

**Hermanos y estados vecinos**
- Los 11 formularios, con su mutación y la línea nueva (ver la lista de archivos arriba). Restablecer y establecer comparten `formulario-nueva-contrasena.tsx:69`: una sola línea, antes de los dos caminos de rechazo (esquema y confirmación) y antes del nombre de establecer. En el cambio obligatorio (`:28`) también va antes de los dos caminos. Remedio aplicado en los 11.
- `BuscadorDeCuenta` (`buscador-de-cuenta.tsx:34`): ya estaba resuelto con `buscar.reset()` sin condición. No lo toqué; es el control de C09 y C13.
- «Sí, restablecer» (`ficha-de-cuenta.tsx:97` y `:123`) y «Sí, revocar» (`tabla-enlaces.tsx:135`): no validan en local, así que no hay secuencia. No aplica.
- Fuera de `admin` y `auth`:
  - `clases`: un solo estado `errores`, que la validación local reemplaza. No aplica.
  - `tareas`: `formulario-tarea` y `panel-de-calificacion` usan un solo estado `errores`. `hilo-privado.tsx:68` y `campo-de-enlaces.tsx:64` (D-3) ya limpian el error del servidor antes de validar. En `formulario-de-entrega`, quitar los enlaces ya borra su error (`:107`). No aplica.
  - `calificaciones` no tiene formularios.
- Estados del mecanismo:
  - **Servidor → local:** un solo `ErrorDeCampo` (C09, C10 y las 11 rojas). Aplica.
  - **Local → servidor:** un solo `MensajeError` (C11). Sin cambio: `mutate` ya lo dejaba así.
  - **Dos errores del servidor seguidos:** un `MensajeError`, el del segundo (C12 (2)). Sin cambio.
  - **Dos rechazos locales seguidos:** `isError` ya está en `false`, así que `reset` no corre y la validación reemplaza `errores`. Sin cambio y sin caso nuevo.
  - **Éxito y luego rechazo local:** se conservan el texto de éxito y el `ErrorDeCampo` (C12 (1)). La condición `isError` lo protege.
  - **Petición en vuelo:** la guarda `isPending` sale antes de `reset` (C12 (3) y C13).
  - **Vista desmontada (O-16):** sin aviso, como antes; el error vive en el observador del componente.
  - **Repetir el control:** C09, C10 y C11 (con F1 otra vez y luego la respuesta buena).

**Matriz §D-6 de los diez formularios** (lo que cambia respecto de la ronda 1)
- Disparador «envío rechazado en local tras un error del servidor»:
  - Se renueva: la mutación vuelve a reposo con `reset()` y desaparece el `MensajeError`.
  - Se anuncia: solo el `ErrorDeCampo`, sin toast.
  - Foco: no se mueve.
  - En vuelo a la vez: la guarda `isPending` sale antes; sin ref, sigue en la lista de CHORE-04 (filas 7 a 10 y 12 a 17).
  - Vista desmontada: no aplica, porque el manejador corre con el componente montado.
- Las demás filas (`VALIDACION`, `409`/`404` con texto fijo, `5xx` o sin conexión, redirecciones de `apiClient`) quedan igual que en la matriz de la ronda 1: un solo `MensajeError`, nada se renueva y el foco no se mueve.

**Desviaciones del plan:** ninguna en producción. En mis pruebas elegí estos datos:
- Códigos fijos: `CORREO_EN_USO` (409) en `admin` y `DEMASIADOS_INTENTOS` (429) en `auth`.
- `CUPO_DIARIO_INSUFICIENTE` con estado 429 (`apiClient` no lo trata de forma especial).
- En C12 (1) de invitar maestro, antes del rechazo local vuelvo a llenar el formulario, porque el éxito lo vacía (`formulario.reset()`).

**Pendiente o fuera de alcance:**
- Doble clic en el mismo render de los 11 formularios: CHORE-04, como observación.
- O-r1-5 → ADMIN-01; O-r1-6 → `chore` de foco y navegación; O-22 → CHORE-04. Los registra el orquestador.
- A-8 (la variante del manager) la aplica el orquestador al cerrar.
- No abrí navegadores ni hice commits.
- Salidas de las corridas en el scratchpad (`lint.txt`, `test.txt`, `build.txt`, `r2-admin-ataque.txt`, `r2-auth-ataque.txt`, `estaticas.txt`, `v01-base.txt`, `v01-actual.txt`).

---

# Adenda (M-06): bloque «Hermanos y estados vecinos» completado (2026-10-27)

> Transcripción del orquestador: el programador entregó esta adenda como texto; se copia tal cual. Sin cambios de código ni de pruebas; sin corrida nueva. `git diff --numstat 9272501e -- frontend` cotejado por el orquestador: los diez formularios siguen en `3 0`.

**`git diff --numstat 9272501e -- frontend`:** sigue igual que en mi entrega.
- Los diez formularios dan `3 0` cada uno.
- Lo demás son los archivos de la ronda 1 de 03c, sin cambios desde entonces: `registrados-del-enlace.tsx` y `tabla-enlaces.tsx` `2 2`, `admin/data.ts` `16 4`, `admin/lib.ts` `11 16`, `auth/data.ts` `13 1`, `auth/lib.ts` `7 11`, `auth/lib.test.ts` `2 2`, `cuentas-r1.ataque` `3 1`, las tres `*-ch3-r*.ataque` de `clases`/`tareas` `1 1`, y `errores-de-api-estatico.test.ts` `86 1`, que incluye C13.
- `git status --short frontend` da las mismas 31 líneas: 22 `M` y 9 `??`.

## Hermanos y estados vecinos

**Hermanos (controles)**
- **Los 11 formularios:** el remedio aplica a todos y está aplicado. Mutación y línea de `if (<m>.isError) <m>.reset()`:

| Formulario | Mutación | Línea |
|---|---|---|
| Invitar maestro | `invitar` | `formulario-invitar-maestro.tsx:25` |
| Invitación masiva | `invitar` | `formulario-invitacion-masiva.tsx:34` |
| Generar enlace | `generar` | `formulario-generar-enlace.tsx:45` |
| Corregir el correo | `corregir` | `formulario-corregir-correo.tsx:31` |
| Iniciar sesión | `inicioSesion` | `formulario-login.tsx:28` |
| Registro de estudiante | `alta` | `formulario-registro.tsx:28` |
| Registro de maestro por enlace | `alta` | `formulario-registro-maestro.tsx:32` |
| Recuperar contraseña | `recuperar` | `formulario-recuperar.tsx:28` |
| Restablecer y establecer | `nuevaContrasena` | `formulario-nueva-contrasena.tsx:69` |
| Cambio obligatorio | `cambiar` | `formulario-cambiar-contrasena.tsx:28` |

  - Restablecer y establecer comparten una sola línea, antes de sus dos caminos de rechazo (esquema y confirmación) y antes del nombre de establecer.
  - En el cambio obligatorio, la línea también va antes de sus dos caminos.
- **`BuscadorDeCuenta`** (`buscador-de-cuenta.tsx:34`): ya estaba resuelto con `buscar.reset()` sin condición. No lo toqué; es el control de CH3-C09 y de CH3-C13.
- **«Sí, restablecer»** (`ficha-de-cuenta.tsx:97` y `:123`) y **«Sí, revocar»** (`tabla-enlaces.tsx:135`): no validan en local, así que no hay secuencia. No aplica.
- **Fuera de `admin` y `auth`:**
  - `clases`: un solo estado `errores`, que la validación local reemplaza. No aplica.
  - `tareas`: `formulario-tarea` y `panel-de-calificacion` usan un solo `errores`.
    - `hilo-privado.tsx:68` y `campo-de-enlaces.tsx:64` (D-3) ya limpian el error del servidor antes de validar.
    - En `formulario-de-entrega`, quitar los enlaces ya borra su error (`:107`). No aplica.
  - `calificaciones` no tiene formularios.

**Estados vecinos del mecanismo**
1. **Primer envío rechazado en local**, sin error previo.
   - `isError` es `false`, así que no hay `reset`: sin cambio.
   - Caso: CH3-C11 («%s, rechazo local y después F1 del servidor…»), en su primer paso. También las pruebas previas de §D-R0 punto 2 (`login-view.test`, `registro-view.test`, `establecer-contrasena-view.test` y las demás), que siguen en verde.
2. **Servidor y después local.**
   - `reset()` deja solo el `ErrorDeCampo`, sin petición nueva. El remedio aplica.
   - Casos: CH3-C09 (24), CH3-C10 (33) y las 11 rojas de T-05 del tester, ahora en verde.
3. **Servidor y después un envío válido.**
   - `reset()` y `mutate` corren en el mismo manejador. El resultado es igual que antes: una petición y el resultado nuevo.
   - Caso: CH3-C09 y CH3-C10, en el paso «repetir el control corregido» (F1 otra vez y luego la respuesta buena).
4. **Local y después servidor.**
   - Solo el `MensajeError` y una petición: sin cambio.
   - Caso: CH3-C11 (4 de `admin` y 7 de `auth`).
5. **Dos errores del servidor seguidos.**
   - Un solo `MensajeError`, el del segundo, y dos peticiones: sin cambio.
   - Caso: CH3-C12 («dos envíos válidos que el servidor rechaza…»), 4 + 7.
6. **Dos rechazos locales seguidos.**
   - Tras el primero, `isError` ya es `false`: `reset` no corre y la validación reemplaza `errores`.
   - Sin caso propio. Basta porque es el mismo camino que el estado 1 (sin `reset`), y CH3-C09 y CH3-C10 ya fijan que tras el rechazo local hay un solo `aria-invalid`.
7. **Éxito y después rechazo local.**
   - El texto de éxito sigue junto al `ErrorDeCampo` y no hay `role="alert"`. La condición `isError` lo protege.
   - Caso: CH3-C12 («tras un envío aceptado, un rechazo local deja el texto de éxito…»), en invitar maestro y en corregir el correo.
8. **Envío con la petición en vuelo.**
   - El manejador sale por la guarda `isPending`, antes de `reset()`.
   - Casos: CH3-C12 («un envío con la petición en vuelo (submit del formulario)…», con `fireEvent.submit` por N-25), 4 + 7, y el orden fijado de forma estática por CH3-C13.
   - Sigue sin ref; es de CHORE-04 (filas 7 a 10 y 12 a 17).
9. **`ENLACE_INVALIDO`** (registro de maestro por enlace; restablecer y establecer).
   - El render devuelve el reemplazo antes del `<form>`:
     - `formulario-registro-maestro.tsx:50-52` devuelve `<MensajeError mensaje={TEXTOS_REGISTRO_MAESTRO.enlaceInvalido} />`.
     - `formulario-nueva-contrasena.tsx:96-98` devuelve `<EnlaceInvalido tipo={tipo} />`.
   - Ya no hay formulario ni manejador, así que no puede haber un rechazo local después. `reset()` nunca corre y el `MensajeError` del enlace queda solo.
   - El remedio no aplica, ni hace falta.
   - Caso: `features/auth/errores-ch3-r1.ataque.test.tsx`, describe «ataque CHORE-03 03c r1 · ENLACE_INVALIDO reemplaza el formulario con su texto fijo», con el título «%s con ENLACE_INVALIDO y el mensaje %s: un solo MensajeError con el texto fijo, sin formulario» (15 casos, en verde).
10. **`CAMBIO_NO_REQUERIDO` con la recarga de `/me` fallida** (`auth/hooks.ts:185-206`).
    - Paso a paso:
      - El `onError` (`:199-205`) espera a `avanzarTrasCambio()` (`:185-189`). Mientras tanto, la mutación sigue en `pending`, porque TanStack Query v5 espera los `onError` antes de pasar a `error`.
      - Si la persona envía en esa ventana, el manejador sale por `if (cambiar.isPending) return` (`formulario-cambiar-contrasena.tsx:25`), sin `reset`.
      - Si la recarga falla, el `.catch(() => undefined)` la traga. La mutación queda en `isError` con el texto fijo de `CAMBIO_NO_REQUERIDO` en el `MensajeError` (`:57`).
      - En el siguiente rechazo local, `if (cambiar.isError) cambiar.reset()` (`:28`) lo quita y queda solo el `ErrorDeCampo`. El remedio aplica.
    - Coincide con el plan: «el `MensajeError` queda y el siguiente rechazo local lo quita».
    - Sin caso propio de la secuencia completa. Basta por tres razones:
      - El estado de partida (el `MensajeError` de `CAMBIO_NO_REQUERIDO` cuando `/me` falla) lo fija `app/cuentas-r1.ataque.test.tsx:407`, «el 409 CAMBIO_NO_REQUERIDO no se presenta como un error genérico que invita a reintentar». Ahí `/me` responde 403 y la recarga falla.
      - El paso siguiente no depende del código del error: el manejador solo lee `isPending` e `isError`. Lo cubren los 6 casos de CH3-C10 del cambio obligatorio (F1, F3 y `DEMASIADOS_INTENTOS` × contraseña corta y confirmación distinta). Comprobé que caen al quitar la línea.
      - La ventana en vuelo la cubre CH3-C12 «un envío con la petición en vuelo…» del cambio obligatorio.
11. **Un código que `apiClient` redirige** (O-r1-6, decisión tomada, destino el `chore` de foco y navegación).
    - Qué hace `apiClient`:
      - Llama a `irA` en `services/apiClient.ts:160` (`ACCESO_RESTRINGIDO`), `:162` (`CAMBIO_DE_CONTRASENA_REQUERIDO`) y `:176` (`NO_AUTENTICADO` tras el refresco fallido, a `/login`).
      - Después lanza el `ApiError`. La mutación queda en `isError` y el formulario pinta su `MensajeError` (el texto fijo en `auth`, el genérico en `admin`) el instante que dura la recarga de `irA`.
    - Qué pasa con `reset()`: solo corre al principio de un envío siguiente. No interviene en la redirección, ni la adelanta ni la evita, y la persona ya salió de la vista.
    - El remedio no aplica y no cambia nada de esto.
    - Casos (en verde), en `features/auth/errores-ch3-r1.ataque.test.tsx`:
      - :533 «el cambio obligatorio con 403 ACCESO_RESTRINGIDO redirige a /acceso-restringido»
      - :542 «iniciar sesión con /me en 403 CAMBIO_DE_CONTRASENA_REQUERIDO redirige a /cambiar-contrasena y da su texto fijo»
      - :554 «el cambio obligatorio con un 401 y el refresco rechazado manda a /login»
    - Y en `features/admin/errores-ch3-r1.ataque.test.tsx`, la tabla de `:521`: `ACCESO_RESTRINGIDO` y `CAMBIO_DE_CONTRASENA_REQUERIDO` en los siete controles (14 casos), más el `401` de `:545`.
12. **Vista desmontada (O-16).**
    - No aplica a la secuencia, porque el rechazo local es síncrono y corre con el componente montado.
    - Desmontada, no hay aviso, como antes: el error vive en el observador del componente.
    - Sin caso nuevo; es la fila de la matriz de la primera entrega.
13. **Pulsar la sección activa.**
    - Es el mismo componente: el error sigue hasta el siguiente envío (S-06), y repetirlo lo quita.
    - Sin cambio. Caso: `features/admin/rutas-ch3-r1.ataque.test.tsx` (20 casos, en verde).
14. **Ir a otra sección y volver, y atrás y adelante del historial.**
    - El componente se monta de nuevo, sin error.
    - Sin cambio. Casos: `features/admin/rutas-ch3-r1.ataque.test.tsx` (20) y `features/auth/rutas-ch3-r1.ataque.test.tsx` (10), en verde.
15. **Repetir el control.**
    - El envío corregido vuelve a pedir y quita el texto.
    - Casos: CH3-C09, CH3-C10 y CH3-C11.
