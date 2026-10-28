# Resumen del programador — CHORE-03 · 03b (primera entrega, 2026-10-27)

> Transcripción del orquestador: el programador entregó este resumen como texto en su respuesta final; se copia tal cual, sin cambiar contenido.

Plan: `docs/trabajo/CHORE-03-errores-api/plan.md` (Enmiendas 1 a 3; LISTO y aprobado; base de "No se toca" dentro de `frontend/`: `1f11d38e`)

**Resultado:** completé los 9 pasos de 03b. lint, test y build están en verde. C-2 y C-3 del tester pasaron sin tocarlas y V-01 dio 212 de 212.

Pasos completados: 9 de 9.

### Archivos creados y modificados
Todo vive bajo `frontend/src/`.

**Producción modificada (19):**
- `services/apiClient.ts`: solo la exportación de §D-5.
- `features/tareas/data.ts`: sin la constante.
- `features/tareas/lib.ts`: la importa de `@/services/apiClient`.
- `features/calificaciones/data.ts`: sin la constante.
- `features/calificaciones/lib.ts`:
  - importa `import { campoDeErrorDeApi, esErrorDeCursor } from "@/lib/errores-de-api"` y `import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"`;
  - el alias queda escrito exactamente `export const esErrorDeCursorDeCalificaciones = esErrorDeCursor`;
  - `mensajeDeErrorCalificaciones` no cambia.
- `features/clases/data.ts`: `MENSAJES_POR_CODIGO_DE_CLASES` y `TRADUCCION_DE_ERRORES_CLASES`, con `import type` y `satisfies`. Compila (no hay PA-5).
- `features/clases/lib.ts`:
  - `mensajeDeErrorClases` es un envoltorio;
  - `mensajeDeConsultaClases` es nueva;
  - `mensajeDeErrorDeLista` usa `esErrorDeCursor`;
  - `erroresDeCategoriasDeApi` usa `mensajeDeErrorClases` en sus dos caminos;
  - ya no hay `quitarPrefijoDeCampo`, `.message.slice` ni `MENSAJES_ERROR_CLASES`.
- Las vistas de consulta de §D-4 (once archivos, doce llamadas; solo la llamada y su importación): `categorias-view.tsx`, `clase-layout.tsx`, `editar-clase-view.tsx`, `components/buscador-de-maestros.tsx`, `components/buscador-alumnos.tsx`, `trabajo-view.tsx`, `personas-view.tsx` (×2), `components/encabezado-clase.tsx`, `maestros-de-clase-view.tsx`, `components/tabla-alumnos.tsx`.
  - En los dos buscadores, Prettier partió la línea; ahora están en `:132` y `:200`.
- `lib/errores-de-api.ts`: sin `quitarPrefijoDeCampo`.

**Pruebas existentes (solo lo que autoriza A-4):**
- N-L1 en `features/clases/lib.test.ts`: la línea 134 ahora espera "Algo salió mal. Inténtalo de nuevo.".
- N-L2 en `features/calificaciones/estatico-01d.test.ts`: solo la expresión de la importación, línea 137.
- Hacía falta N-L2: con la importación exacta, la expresión anterior ya no coincidía.

**Pruebas nuevas (6) y una extendida:**
- `features/clases/errores-ch3.test.ts`
- `features/calificaciones/errores-ch3.test.ts`
- `features/clases/formularios-ch3.test.tsx`
- `features/clases/consultas-ch3.test.tsx`
- `features/clases/recuperar-ch3.test.tsx`
- `services/apiClient-ch3.test.ts`
- `lib/errores-de-api-estatico.test.ts`, extendida con CH3-B13.

No toqué ningún `hooks.ts`, nada de `components/`, `app/`, `shared/` ni `backend/`, ni ninguna `*.ataque`. `git diff --stat 1f11d38e -- frontend shared backend infra .env.example CLAUDE.md AGENTS.md .claude README.md` da 23 archivos: los 21 míos y C-2 y C-3 del tester. Hay 6 archivos nuevos.

### Verificación
Corrí desde `frontend/` una suite a la vez, después de comprobar con `Get-CimInstance` que no había ningún `vitest` corriendo. Las salidas están en el scratchpad (`lint-03b.txt`, `test-03b.txt` y `build-03b.txt`).

| Comando | Salida |
|---|---|
| `npm run lint` | exit 0; última línea `> tsc -b` (antes, `All matched files use Prettier code style!`) |
| `npm run test` | `Test Files  219 passed (219)` · `Tests  3901 passed (3901)`; `Test timed out` = 0 |
| `npm run build` | exit 0; `✓ built in 1.87s` (el aviso del bloque > 500 kB viene de antes) |

prisma validate: no aplica.

### Pruebas requeridas
- **CH3-B01** → `clases/errores-ch3.test.ts` › "CH3-B01: mensajeDeErrorClases recorre la tabla, da el genérico ante un código con mensaje del servidor sin texto visible, conserva los textos fijos y quita las rutas dobles; avisoDeFalloAlSubir de clases también recorre la tabla". Cubre las 9 rutas dobles de clases, `claseId: claseId:`, `tema: tema:` en la consulta y `categorias.0.id: categoriaId:` (da `null`); también O-r2-4.
- **CH3-B02** → mismo archivo › "CH3-B02: mensajeDeConsultaClases da el genérico ante toda la tabla y conserva el texto fijo de claseId"
- **CH3-B03** → mismo archivo › "CH3-B03: mensajeDeErrorDeLista da el texto del cursor ante «cursor:» y el genérico ante toda la tabla"
- **CH3-B04** → mismo archivo › "CH3-B04: erroresDeFormularioClases, errorDelCampoCodigo y erroresDelTemaDeApi dan el genérico en su campo sin texto visible y null en las rutas de la tabla"
- **CH3-B05** → mismo archivo › "CH3-B05: erroresDeCategoriasDeApi da el genérico en la fila y en la lista sin texto visible, y null en las rutas de la tabla y en una ruta más larga que la de la fila"
- **CH3-B06** → `calificaciones/errores-ch3.test.ts` › "CH3-B06: el alias del cursor es esErrorDeCursor; mensajeDeErrorCalificaciones sigue dando el respaldo ante la tabla y el texto de sin acceso; data.ts ya no declara la traducción ni los códigos que redirige el cliente"
- **CH3-B07** → `clases/formularios-ch3.test.tsx`, dos `it.each` sobre los 9 formularios:
  - "CH3-B07: $formulario.nombre con $nombre da un solo aviso legible, ningún ErrorDeCampo, conserva lo escrito y el botón sale de la espera" (F1, F3 y F4)
  - "CH3-B07: $formulario.nombre con F2 en $campo.prefijo ($resto) marca el campo con el genérico, sin aviso, conserva lo escrito y el botón sale de la espera"
- **CH3-B08** → mismo archivo:
  - "CH3-B08: $control.nombre con $nombre da exactamente un aviso legible" (9 controles × 4 errores)
  - "CH3-B08: regenerar el código con %s da exactamente un aviso legible (el texto fijo de regenerar)"
  - "CH3-B08: la descarga de un adjunto en $sitio.sitio con $nombre da exactamente un aviso legible y el botón sale de la espera" (muro y material de "Trabajo de clase"; F1, F3, F4 y `archivoId: archivoId:`)
  - "CH3-B08: en $sitio, dos clics seguidos en «Descargar» mandan una sola petición y dan un solo aviso"
- **CH3-B14** → mismo archivo › "CH3-B14: $formulario.nombre con $nombre en la solicitud de subida da un solo aviso con el archivo, ningún ErrorDeCampo, conserva lo escrito y no publica" (anuncio y material × F1, F3 y F4)
- **CH3-B09** → `clases/consultas-ch3.test.tsx`:
  - "CH3-B09: $nombre con «limite: Too big: expected number» muestra el genérico, nunca el texto en inglés" (las 11 consultas, con Personas en primera carga y en recarga, más los 5 "Ver más")
  - "CH3-B09: $nombre con «cursor: x» sigue dando su texto de «cambió mientras…»" (los 5 "Ver más")
- **CH3-B10** → `clases/recuperar-ch3.test.tsx`:
  - "CH3-B10: $nombre tras F2: el mismo botón manda una petición nueva y, si responde bien, el ErrorDeCampo desaparece" (los formularios de B07; las categorías, en la fila y en la lista)
  - "CH3-B10: con el genérico bajo el nombre del tema en «Trabajo de clase», ir al muro y volver antes de 30 s quita el error y «Crear tema» manda un POST nuevo" (con `rutas` y `Providers`)
- **CH3-B11** → `services/apiClient-ch3.test.ts` › "CH3-B11: la lista son exactamente los tres códigos; tareas y calificaciones dicen true solo ante ellos; solo apiClient.ts la declara"
- **CH3-B12** → mismo archivo › "CH3-B12: apiClient.ts solo importa de @campus/shared, ./navegacion y ./tokenAcceso"
- **CH3-B13** → `lib/errores-de-api-estatico.test.ts` › "CH3-B13: features/clases y features/calificaciones tampoco manipulan error.message, ni tienen la expresión de ruta; quitarPrefijoDeCampo ya no existe en el código de producción de src/"

### Conteos
Con `npx vitest list <archivo> | grep -c ">"`:

| Archivo | Casos |
|---|---|
| `clases/errores-ch3` | 5 |
| `calificaciones/errores-ch3` | 1 |
| `clases/formularios-ch3` | 103 (B07: 27 + 20; B08: 36 + 4 + 8 + 2; B14: 6) |
| `clases/consultas-ch3` | 21 |
| `clases/recuperar-ch3` | 11 |
| `services/apiClient-ch3` | 2 |
| `lib/errores-de-api-estatico` | 3 (antes 2) |

- `npx vitest list | grep -c ">"` da 3901 en total. La diferencia con 3757 es +144 (143 nuevas + 1 estática). Hay 219 archivos, +6.
- Durante la ronda 0, el tester contó 3742 con 15 casos sin recoger por C-3, que no cargaba.

**V-01:** usé el comando de `reporte-tester.md` contra "Tabla de SHA-256 de las 212 `*.ataque` al cierre de la ronda 0 de CHORE-03 03b". Base 212, actual 212, `diff` vacío: **IGUALES**.

### Reglas estáticas, una por una
1. `mensajeDelAvisoDeCalificar`: `grep -rln` en producción da solo `features/tareas/hooks.ts` y `features/tareas/lib.ts`.
2. `disabled`, `?? []`, `fetch(` y `console.` en `tareas/lib.ts`, `data.ts` y `hooks.ts`: `grep -nE` sin resultados.
3. Invisibles y copias de la regla de visibles: un script de Python en el scratchpad (`reglas.py`) revisó 196 archivos de producción buscando U+2800 y U+1D159 (literales y como escape), `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =` y `\r\n|\r`. Resultado: `[]`.
4. `esErrorDeCursor` se define una sola vez, en `lib/errores-de-api.ts:37`, según `grep -rnE "(const|function) esErrorDeCursor\b"`. En `features/calificaciones` no aparece `esErrorDeCursor(`; el alias es una asignación.
5. `features/calificaciones` tiene 11 archivos de producción (`ls | grep -v .test. | wc -l`) y ninguno contiene `.message`.
6. Ningún tipo nuevo fuera de `types.ts`: el `git diff` no agrega `interface` ni `type`. `TraduccionDeErrores` llega con `import type` y solo se usa con `satisfies`.
7. Ningún invisible literal en las 7 pruebas nuevas o extendidas: el mismo script da `[]`, y CH3-A24 está en verde.

La suite completa, que contiene CAL-1D09, CAL-T-182, CAL-T-127, `refactor-01c-r1` y `lib/errores-ch3-r1:299`, está en verde.

### Matriz §D-6 de `features/clases`
Cómo leer la matriz:
- **Entradas:** F1, F3 y F4 dan un aviso con su resto o con el genérico. F2 da un `ErrorDeCampo` con el genérico, sin aviso. Un código con mensaje del servidor sin texto visible da un aviso con el genérico. `5xx`, sin conexión y los códigos con texto fijo siguen como estaban.
- **Renovación:** igual que antes (`renovarTrasError` y `CODIGOS_QUE_RENUEVAN_*` sin cambio).
- **Foco:** donde ya iba. Ningún componente cambió su foco.

**Acciones:**

| Control | Dónde avisa | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|
| Crear y editar clase (`formulario-clase.tsx:97/:112`) | El callback `alFallar` del componente; el hook no avisa | Sin ref; fuera del chore, CHORE-04 (fila 2) | Sin aviso, como antes (callback de `mutate`) |
| Unirse (`formulario-unirse-clase.tsx:36`) | Callback del componente | Sin ref; CHORE-04 (fila 4) | Sin aviso, como antes |
| Publicar anuncio o material (`formulario-publicacion.tsx`) | `useCrearPublicacion.onError`; el componente solo marca el campo | Ref `publicandoRef` | El hook avisa igual |
| Solicitud de subida | `toast.error(avisoDeFalloAlSubir(...))` en el `catch` del manejador | `publicandoRef` | El manejador asíncrono termina y avisa, como antes |
| Comentar (`formulario-comentario.tsx:40`) | Hook | Sin ref; CHORE-04 (fila 1) | El hook avisa |
| Crear y renombrar tema (`formulario-tema.tsx`) | Hook, solo si `erroresDelTemaDeApi` da null | `enviandoRef` | El hook avisa |
| Categorías (`editor-de-categorias.tsx:137`) | Hook, solo si `erroresDeCategoriasDeApi` da null | `guardandoRef` | El hook avisa |
| Borrar publicación (`publicacion-del-muro.tsx:118`) | Hook | Sin ref; CHORE-04 (fila 21) | El hook avisa |
| Borrar comentario (`comentarios-de-publicacion.tsx:74`) | Hook | Sin ref; CHORE-04 (fila 20) | El hook avisa |
| Regenerar código (`codigo-de-clase.tsx:58`) | Texto fijo `avisoErrorRegenerar` en el callback | Sin ref; CHORE-04 (fila 3) | Sin aviso, como antes |
| Agregar maestro (`buscador-de-maestros.tsx:100`) | Hook | Sin ref; CHORE-04 (fila 6) | El hook avisa |
| Quitar maestro (`maestros-de-clase-view.tsx:67`) | Hook | Sin ref; CHORE-04 (fila 19) | El hook avisa |
| Alta de alumno (`buscador-alumnos.tsx:44`) | Hook | Sin ref; CHORE-04 (fila 5) | El hook avisa |
| Baja de alumno (`tabla-alumnos.tsx:59`) | Hook | Sin ref; CHORE-04 (fila 22) | El hook avisa |
| Mover (`mover-elemento.tsx:45`) | Hook | `moviendoRef` | El hook avisa |
| Reordenar (`trabajo-view.tsx:154`) | Hook | `ordenandoRef` | El hook avisa |
| Borrar tema (`seccion-de-tema.tsx:194`) | Hook | `borrandoRef` | El hook avisa |
| Descarga en el muro y en un material de "Trabajo de clase" (`elemento-de-trabajo.tsx:55`, O-r2-3) | `descargar` de `components/adjuntos` con `mensajeDeErrorClases` | `descargandoRef` de `VistaDeFicha` (DH-6); dos clics dan una petición y un aviso | Un aviso, como antes (O-r2-2) |

**Consultas:** su error reemplaza la vista o la lista con `MensajeError`. Un `VALIDACION` da el genérico; `claseId` da "No tienes acceso a esta clase."; los códigos con mensaje del servidor dan su mensaje (S-01). No hay aviso, salvo las recargas de categorías y de "Trabajo de clase", que conservan la vista y avisan con su texto fijo de siempre.

| Consulta | Dónde |
|---|---|
| Categorías | `:37` |
| La clase en el marco | `clase-layout.tsx:35`, con el foco por `useFocoAlPasarAError` |
| Editar clase | `:18` |
| Buscador de maestros | `:200` |
| Buscador de alumnos | `:132` |
| Temas de "Trabajo de clase" | `:169` |
| Personas, primera carga y recarga | `:39` y `:52` |
| El código | `encabezado-clase.tsx:53` |
| Maestros de la clase | `:42` |
| Roster | `:185` |
| Los cinco "Ver más" de `mensajeDeErrorDeLista` | Muro `:117`, comentarios `:153`, inicio del estudiante `:46`, inicio del maestro `:41`, sección de un tema `:79` |

En los cinco "Ver más", "cursor:" sigue dando su texto.

- En vuelo a la vez, para todas las consultas: no aplica (son consultas, no mutaciones); los "Ver más" usan `fetchNextPage({ cancelRefetch: false })` con `enEspera`.
- Con la vista desmontada: TanStack Query cancela la consulta y no hay aviso.

### Hermanos
**Formularios y controles de §D-4:** todos pasan por `mensajeDeErrorClases` (envoltorio) o por las funciones de campo, que no cambiaron de código, y todos están cubiertos por B07, B08, B10 y B14 (lista en la matriz).
- En las filas 1 a 6 y 19 a 22 de la lista para CHORE-04 no agregué la ref.
- No encontré ningún control sin ref fuera de esa lista.

**Consultas:** las once de §D-4 aplican y están aplicadas; los cinco "Ver más" aplican por `mensajeDeErrorDeLista`. No aplica a:
- `clases-admin-view.tsx`: textos fijos, con su `esErrorDeCursor`.
- `useAvisoDeRecargaFallida`: textos fijos.
- `codigo-de-clase.tsx`, copiar: textos fijos.

**Rutas dobles de `clases` (inventario de §D-1), todas aplicadas por el contrato:**
- `archivoId` (descargas): "debe ser un identificador válido" (B01 y B08).
- `claseId`: su texto fijo.
- `alumnoId`, `temaId`, `temaIds.<i>`, `publicacionId`, `comentarioId`, `maestroId`, `maestroIds.<i>` y `categorias.<i>.id`: "debe ser un identificador válido" (B01). `maestroIds.0` en el formulario de clase da un solo aviso (`campoDeErrorDeApi` no lee rutas con punto); `categorias.0.id` no se pinta en la fila (null) y el hook avisa.
- `tema: tema:` en la consulta: el genérico.

**`calificaciones`:** `mensajeDeErrorCalificaciones` no se migra (M-01): ya da solo el texto de "sin acceso" o el respaldo, y su salida no cambiaría. Sus consultas no cambian; solo el alias y N-46.

**Los cinco sitios de la ficha de descarga** (los cinco comparten `descargandoRef`):
- detalle de la tarea, "Tu trabajo" y la entrega de un alumno (`tareas`, sin cambio en 03b);
- el muro y el material de "Trabajo de clase" (`clases`), que ahora traducen F4 y `archivoId: archivoId:` sin la ruta (O-r2-4 cerrada).

### Hallazgos
No hay hallazgos que atender: es la primera entrega de 03b.

### Desviaciones del plan
Ninguna de alcance. Hay tres lecturas mías que conviene que alguien revise:
1. **CH3-B13** comprueba que `quitarPrefijoDeCampo` no aparezca en el código de producción de `src/`, no en todo `src/`. El motivo: la `*.ataque` del tester (`lib/errores-ch3-r1.ataque.test.ts:261`) nombra el símbolo para prohibirlo, y la propia prueba lo necesita.
2. **Regenerar el código** (CH3-B08) se prueba montando `CodigoDeClase`, no con `renderHook`: el hook no avisa, y el aviso fijo vive en el callback del componente.
3. **Ir y volver de sección** (CH3-B10): al volver, el formulario de tema ya se cerró (estado local desmontado), así que la prueba lo reabre con "Nuevo tema" antes de guardar.

### Pendiente o fuera de alcance
- **Cambios visibles nuevos de 03b, consecuencia de S-01:** en "Personas" (recarga con "Ver más alumnos") y en el roster, que usan `mensajeDeConsultaClases` y no reconocen el cursor, un `400` "cursor: …" muestra ahora el genérico. Antes mostraba "no es válido". Es el mismo caso que el hilo de 03a.
- **Comentario de T-11 en `features/tareas/data.ts`:** ya estaba pegado al de `CODIGOS_QUE_REEMPLAZAN_LA_VISTA`. Al quitar la constante quedó igual y no lo toqué.
- **Sin verificar:** nada en navegador, por regla.
