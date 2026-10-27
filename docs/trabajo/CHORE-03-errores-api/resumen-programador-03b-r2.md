# Resumen del programador — CHORE-03 · 03b, ronda 2 (corrección de T-03 y T-04, 2026-10-27)

> Transcripción del orquestador: el programador entregó este resumen como texto en su respuesta final; se copia tal cual, sin cambiar contenido.

Plan: docs/trabajo/CHORE-03-errores-api/plan.md (Enmienda 4, LISTO, DH-8 = (a))
Pasos completados: 6 de 6 (pasos 10 a 15 de 03b, ronda 2)

**Archivos creados o modificados en esta ronda** (todos en `frontend/src/features/clases/`):
- `data.ts`: agregué `CAMPOS_PINTADOS_DE_LA_CLASE` y `CAMPOS_PINTADOS_DE_LA_PUBLICACION` con `as const` y `satisfies Readonly<Record<TipoPublicacion, readonly string[]>>`, y `TipoPublicacion` en la importación de `./types`. `satisfies` compila, así que no aplica PA-11.
- `lib.ts`: agregué `erroresDeLaClaseDeApi(error, modo)` y `erroresDeLaPublicacionDeApi(error, tipo)` sobre `erroresDeFormularioClases`, que no cambia, con sus importaciones.
- `components/formulario-clase.tsx`: solo la importación (`:16`) y `:69`, que ahora es `erroresDeLaClaseDeApi(error, modo)`.
- `components/formulario-publicacion.tsx`: solo la importación y `:148`, que ahora es `erroresDeLaPublicacionDeApi(error, datos.tipo)`.
- `hooks.ts`: solo `useCrearPublicacion` (diff literal abajo).
- `errores-ch3.test.ts`, `formularios-ch3.test.tsx` y `recuperar-ch3.test.tsx` (mis propios archivos de 03b): CH3-B15, CH3-B16 y CH3-B17.

No toqué ninguna `*.ataque` ni ninguna prueba existente.

`git diff 1f11d38e -- frontend/src/features/clases/hooks.ts` (literal):
```
@@ -83,6 +83,7 @@ import {
   erroresDeCategoriasDeApi,
   erroresDelTemaDeApi,
   erroresDeFormularioClases,
+  erroresDeLaPublicacionDeApi,
   focoPerdido,
   mensajeDeErrorClases,
   terminoDeBusquedaValido,
@@ -610,11 +611,11 @@ export const useCrearPublicacion = (claseId: string) => {
       if (datos.tipo === "material") void invalidarTemasYTrabajo(queryClient, claseId)
       toast.success(TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado)
     },
-    onError: (error) => {
+    onError: (error, datos) => {
       // TAREAS-01e (§D-11): si el tema elegido ya no existe, la lista del campo "Tema" se vuelve a
       // pedir (el campo deja de ofrecerlo y el material se publica sin él).
       void renovarTrasError(queryClient, claseId, error)
-      if (erroresDeFormularioClases(error, ["titulo", "texto"])) return
+      if (erroresDeLaPublicacionDeApi(error, datos.tipo)) return
       toast.error(mensajeDeErrorClases(error))
     },
   })
```
Es una importación y dos líneas. En los otros dos formularios, `git diff --stat` da 4 líneas (2+, 2−) en cada uno.

**Verificación** (todo en `frontend/`; comprobé que no hubiera ningún `vitest` corriendo antes, conteo 0, y corrí una suite a la vez):
- **lint:** `npm run lint`. Última línea: `> tsc -b`, sin errores.
- **test:** `npm run test`. Últimas líneas: `Test Files  224 passed (224)` · `Tests  4141 passed (4141)`. `grep -c "Test timed out"` sobre la salida dio 0.
- **build:** `npm run build`. Última línea: `✓ built in 1.26s`.
- prisma validate: n/a.
- Prettier: `npx prettier --write` acotado a los 8 archivos tocados.

**Pruebas requeridas** (archivos en `frontend/src/features/clases/`):
- **CH3-B15 (1)**, en `errores-ch3.test.ts`, `it.each` de 10 filas: "CH3-B15 (1): %s en %s con «%s:» (lo pinta: %s) da el error del campo o null y el aviso legible, con mensaje, ruta doble y cada resto sin texto visible". Las filas son:
  - crear × nombre, descripcion, maestroIds;
  - editar × nombre, descripcion, maestroIds (no lo pinta);
  - anuncio × texto, titulo (no lo pinta);
  - material × titulo, texto.
- **CH3-B15 (2)**, en `errores-ch3.test.ts`, `it.each` de 4 modos: "CH3-B15 (2): toda la tabla fuera de contrato da null en el modo %s".
- **CH3-B15 (3)**, en `errores-ch3.test.ts`: "CH3-B15 (3): las listas de campos pintados por modo son exactamente las de hoy".
- **CH3-B15 (4)**, en `errores-ch3.test.ts`: "CH3-B15 (4): erroresDeFormularioClases( solo se llama en lib.ts, formulario-comentario.tsx y una vez en hooks.ts; las listas de campos de la clase y del material solo se escriben en data.ts". Es la variante de DH-8 (a).
- **CH3-B16, caso general y su contrario**, en `formularios-ch3.test.tsx`, `it.each` de 12 casos (6 filas × «con mensaje» y «sin texto visible» `\u{200B}`): "CH3-B16: $formulario.nombre con «$campo:» $variante ($pinta) da exactamente un mensaje legible, conserva lo escrito y el botón sale de la espera". Cubre crear clase × maestroIds (ErrorDeCampo en el grupo «Maestros de la clase», comprobado por su descripción accesible), editar clase × maestroIds (aviso), anuncio × titulo (aviso), material × titulo (ErrorDeCampo), y crear tema y renombrar tema × nombre (ErrorDeCampo).
- **CH3-B16 (e)**, en `formularios-ch3.test.tsx`: "CH3-B16 (e): en el anuncio, tras el aviso de «titulo:», pulsar «Material» no muestra ningún error bajo el título".
- **CH3-B16 (f)**, en `formularios-ch3.test.tsx`: "CH3-B16 (f): en el anuncio, con el formulario desmontado mientras la petición está en vuelo, «titulo:» da exactamente un aviso (lo da el gancho)".
- **CH3-B17, repetir el control**, en `recuperar-ch3.test.tsx`, `it.each` de 2 casos (editar clase con `maestroIds:\u{200B}`, anuncio con `titulo:\u{200B}`): "CH3-B17: $nombre da el aviso genérico; el mismo botón manda una petición nueva con lo conservado y, si responde bien, no hay un segundo aviso de error".
  - Comprueba que el cuerpo del segundo envío contiene lo escrito.
  - Editar clase da su aviso de éxito y navega a `/admin/clases/:claseId`.
  - El anuncio da su aviso de éxito y el campo queda vacío.
- **CH3-B17, otra sección y regreso antes del `staleTime`**, en `recuperar-ch3.test.tsx`: "CH3-B17: tras el aviso genérico de «maestroIds:» en «Editar clase», salir por «Cancelar» a la clase y volver por «Editar clase» antes de 30 s monta el formulario sin error y «Guardar cambios» manda un PUT nuevo".
  - Usa `rutas` y `Providers`, con sesión de admin.
  - Volví por el enlace «Editar clase» del encabezado de la clase (`TEXTOS_CLASE.editar`), no por «atrás».
  - El regreso es a los 10 s del reloj fijo.
- **CH3-B17, pulsar la sección activa:** no aplica, como dice el plan. No escribí caso.
- **CH3-B17, el anuncio por otra sección:** sin caso nuevo, como dice el plan (es el camino de CH3-B10 y O-14).

**Conteos:**
- Comando: `npx vitest list src/features/clases/errores-ch3.test.ts src/features/clases/formularios-ch3.test.tsx src/features/clases/recuperar-ch3.test.tsx src/features/clases/formularios-ch3-r1.ataque.test.tsx`.
  - Casos por archivo: `errores-ch3.test.ts` 21, `formularios-ch3.test.tsx` 117, `recuperar-ch3.test.tsx` 14, `formularios-ch3-r1.ataque.test.tsx` 88.
  - Casos por id en esa lista: CH3-B15 16, CH3-B16 14, CH3-B17 3, en total 33 nuevos.
- Total de la suite: 4141, contra 4108 en la ronda 1 del tester; la diferencia es esos 33.
- V-01 (comando de V-01 de `reporte-tester.md` contra la tabla "Tabla de SHA-256 de las 217 `*.ataque` al cierre de la ronda 1 de CHORE-03 03b"): base 217, actual 217, `IGUALES`.

**Hallazgos atendidos:**
- **T-03: corregido.** Pasan las dos de editar clase de `formularios-ch3-r1.ataque.test.tsx`, con estos títulos exactos:
  - "editar clase con «maestroIds: Revisa este valor.» da exactamente un mensaje legible (cualquiera), sin ruta; lo escrito se conserva y el botón sale de la espera"
  - "editar clase con «maestroIds:·» da exactamente un mensaje legible (cualquiera), sin ruta; lo escrito se conserva y el botón sale de la espera"
- **T-04: corregido.** Pasan las dos del anuncio:
  - "publicar un anuncio con «titulo: Revisa este valor.» da exactamente un mensaje legible (cualquiera), sin ruta; lo escrito se conserva y el botón sale de la espera"
  - "publicar un anuncio con «titulo:·» da exactamente un mensaje legible (cualquiera), sin ruta; lo escrito se conserva y el botón sale de la espera"
- El archivo completo del tester da 88 de 88 (`npx vitest run src/features/clases/formularios-ch3-r1.ataque.test.tsx` → `Tests  88 passed (88)`).

**Hermanos** (los doce del inventario de la Enmienda 4):
1. **Crear y editar clase:** el remedio aplica y lo apliqué. El modo es la prop `modo`, que no cambia durante la vida del formulario.
2. **Anuncio y material:** el remedio aplica y lo apliqué en el formulario y en el gancho, los dos con `datos.tipo` (lo enviado). Cambiar de tipo con la petición en vuelo no es posible: `elegirTipo` y `handleSubmit` salen si `publicandoRef.current || crear.isPending` (`formulario-publicacion.tsx:160` y `:166`).
3. **Comentario:** no aplica, `texto` siempre se pinta. Sin cambio.
4. **Tema, crear y renombrar:** no aplica, los dos modos pintan `nombre`. Lo fija CH3-B16.
5. **Unirse:** no aplica, sin cambio.
6. **Categorías:** no aplica, sin cambio.
7. **Controles sin campos:** no aplica.
8. a 11. **`tareas`** (crear y editar tarea, entregar, calificar, hilo): no aplica, 03a está cerrada. Calificar ya depende del modo.
12. **`admin` y `auth`:** punto de ataque de 03c, sin cambio aquí.

**Campos por modo y qué muestran:**

| Modo | Campo | Con texto visible | Sin texto visible |
|---|---|---|---|
| Crear clase | nombre, descripcion, maestroIds | ErrorDeCampo | ErrorDeCampo con el genérico |
| Editar clase | nombre, descripcion | ErrorDeCampo | ErrorDeCampo con el genérico |
| Editar clase | maestroIds | Un aviso | Un aviso con el genérico |
| Anuncio | texto | ErrorDeCampo | ErrorDeCampo con el genérico |
| Anuncio | titulo | Un aviso | Un aviso con el genérico |
| Material | titulo, texto | ErrorDeCampo | ErrorDeCampo con el genérico |
| Cualquiera | `maestroIds.0: maestroId:` y la tabla fuera de contrato | Un aviso | Un aviso con el genérico |

**Estados del mecanismo:**
- **Primer envío:** CH3-B16 y las 4 del tester.
- **Repetir:** CH3-B17. Una petición nueva y ningún segundo aviso.
- **Pulsar «Material» después del aviso de `titulo:` en un anuncio:** sin error viejo, porque ya no se guarda (CH3-B16 (e)).
- **Vista desmontada:** en el anuncio avisa una vez el gancho (CH3-B16 (f)). En crear y editar clase no hay aviso, como en `1f11d38e` (O-16, decisión tomada; no lo cambié).
- **Dos fallos seguidos:** cada envío decide con su propio `datos.tipo` o `modo`; el error de campo anterior se reemplaza o queda en `null`. No escribí caso aparte.
- **Volver antes del `staleTime`:** CH3-B17.
- **Crear clase y material:** salida idéntica a la de antes, porque sus listas son las de siempre (CH3-B15 (3)). La prueba de crear de `maestros-02c-r1.ataque` sigue en verde.

**Matriz de avisos y recargas (§D-6), partida por modo:**
- **Crear clase:**
  - Error de un campo pintado: ErrorDeCampo, sin aviso.
  - Campo no pintado, tabla, `5xx` o red: un aviso desde `alFallar`.
  - Nada se renueva. El foco no se mueve.
  - En vuelo a la vez: sin ref; fuera del chore, CHORE-04 (fila 2). No agregué la ref.
  - Con la vista desmontada: sin aviso (callback de `mutate`), como antes.
- **Editar clase:** igual que crear. La diferencia es que `maestroIds:` da un aviso desde `alFallar` y ningún ErrorDeCampo.
- **Anuncio:**
  - `titulo:` da un aviso desde `useCrearPublicacion.onError`, sin ErrorDeCampo.
  - `texto:` da un ErrorDeCampo, sin aviso.
  - Resto: un aviso desde el gancho.
  - `renovarTrasError` se llama igual que antes. El foco no se mueve.
  - En vuelo a la vez: ref `publicandoRef` (`formulario-publicacion.tsx`).
  - Con la vista desmontada: un solo aviso, del gancho (CH3-B16 (f)).
- **Material:** igual que antes. `titulo:` y `texto:` dan ErrorDeCampo; el resto, un aviso del gancho. Misma ref y misma vista desmontada que el anuncio.

**Reglas estáticas, una por una** (con grep sobre producción de `frontend/src`, `LC_ALL=C.UTF-8`):
1. `mensajeDelAvisoDeCalificar`: solo en `features/tareas/hooks.ts` y `features/tareas/lib.ts`.
2. `disabled`, `?? []`, `fetch(` y `console.` en `tareas/{lib,data,hooks}.ts`: 0 aciertos.
3. U+2800, U+1D159 (literal o como escape), `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =` y la expresión `\r\n|\r` escrita: 0 aciertos.
4. `esErrorDeCursor` se define una sola vez (`lib/errores-de-api.ts:37`), y `esErrorDeCursor(` no aparece en `features/calificaciones`.
5. `features/calificaciones` tiene 11 archivos de producción y ninguno lee `.message`.
6. Tipos fuera de `types.ts` en `clases/{data,lib,hooks}.ts`: 0.
7. Invisibles literales en los 8 archivos tocados, `lib/errores-de-api.ts` y la tabla: 0. Las pruebas usan escapes `\u{200B}`.
8. Punto 4 de §D-R0 de la Enmienda 4:
   - `disabled`, `?? []`, `fetch(`, `console.`, `new RegExp(` y `.split(":")` en `clases/{data,lib,hooks}.ts`, `formulario-publicacion.tsx` y `formulario-clase.tsx`: 0.
   - `enEspera=`: 1 en cada formulario.
   - Ningún `.message` nuevo en el diff de `clases`.
   - Las reglas estáticas de clases (`ver-mas-01e-r3`, `entregas-01d-r1`, `estatico-r1`, `styles/clases-r1`, `errores-ch3-r1`) pasan en la suite completa.
   - No hay ningún archivo nuevo `-ch3-r1.ataque`.

Desviaciones del plan: ninguna.

**Pendiente o fuera de alcance:**
- O-16 (vista desmontada en crear y editar clase): sin cambio, como pidió el orquestador.
- `formulario-clase.tsx` sigue sin ref (fila 2 de CHORE-04).
- Detalle cosmético: en los títulos de `it.each` con `$formulario.nombre`, vitest pone comillas simples alrededor de los valores, y en CH3-B17 recorta el nombre largo ("sin te…"). Los títulos completos están en `npx vitest list`.
- No abrí navegador, no hice commit y no instalé nada.
