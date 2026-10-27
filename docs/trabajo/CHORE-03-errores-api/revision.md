# Revisión del Manager — CHORE-03 · traducción de los errores de la API en el frontend — plan (Modo 1) y parte A
Veredicto: CAMBIOS REQUERIDOS (tres cambios acotados; ninguno toca la forma del contrato)
Verificación propia: lint, test y build no corridos por indicación del orquestador y porque no hay código cambiado: `git diff --stat ad10844 -- backend frontend shared CLAUDE.md AGENTS.md .claude infra` vacío. `git diff --stat ad10844` solo trae los cinco documentos (56 inserciones, 54 borrados: los 55/53 de la parte A más la frase de §2 del orquestador). SHA-256 de los cinco documentos y de `plan.md` (`fe4541ff…`): coinciden con `aprobacion.md`.

Fecha: 2026-10-26. Base: `ad10844`. Revisé el código de `frontend/src` en esa base (los envoltorios, las vistas, las 24 reglas estáticas y las 55 pruebas con `"VALIDACION"`), `backend/src/handlers/validacion.ts` y los demás `AppError("VALIDACION", …)` del servidor.

## Problemas que bloquean

### M-01 — N-L2 no coincide con la importación que produce §D-4 de `features/calificaciones`
Dónde: §D-4 "`features/calificaciones` (03b)" frente a §D-R0, fila N-L2.
Por qué importa: §D-4 convierte `mensajeDeErrorCalificaciones` en un envoltorio de `mensajeDeErrorDeConsulta`, así que `calificaciones/lib.ts` tiene que importar `campoDeErrorDeApi`, `esErrorDeCursor` y `mensajeDeErrorDeConsulta` (con `printWidth: 100`, Prettier lo deja en una línea de 99 caracteres). La expresión nueva de N-L2 (`/import \{ campoDeErrorDeApi, esErrorDeCursor \} from "@\/lib\/errores-de-api"/`) exige que la llave cierre después de `esErrorDeCursor`. CAL-1D09 falla con lo que el plan manda escribir: el programador tiene que elegir entre PA-1 y desviarse. Además, `TRADUCCION_DE_ERRORES_CALIFICACIONES` lleva un `generico` que el mismo plan dice que "no se usa": un valor muerto.
Qué se espera: que la línea N-L2 y la importación que resulta de §D-4 coincidan. Recomiendo no migrar `mensajeDeErrorCalificaciones`: ya cumple S-22 por completo, nunca muestra texto del servidor y su salida no cambia. Bastan el alias del cursor y N-46, sin `TRADUCCION_DE_ERRORES_CALIFICACIONES`, y N-L2 queda como está escrita. La otra salida es mantener el envoltorio y reescribir N-L2 con la importación de tres nombres. En los dos casos, CH3-B06 se ajusta.

### M-02 — Parte A: RN-10 contradice a P-10 (las categorías se copian al duplicar)
Dónde: `docs/PRD.md` §5, RN-10, cuarta viñeta: «Duplicar copia solo el nombre, la descripción, los recursos de aprendizaje y las secciones de la clase. **No** copia…».
Por qué importa: P-10, según la recomendación literal, dice que «las categorías también se copian». Quedó en RF-71 y en ESSENTIALS ("…secciones (los temas, con nombre y orden) y categorías ponderadas"), pero RN-10 sigue diciendo "copia **solo**" sin las categorías. Es una contradicción nueva dentro del PRD (AGENTS.md: "si encuentras una contradicción entre documentos, detente y avisa"). ADMIN-01 la heredaría.
Qué se espera: RN-10 dice lo mismo que RF-71: secciones = temas, se copian las categorías ponderadas, el nombre es editable, y se puede duplicar una archivada, cuya copia nace activa. El orquestador recalcula el SHA-256 de `PRD.md` en `aprobacion.md`, porque ese archivo está en "No se toca" por hash. La frase de D-31 ("temas y, si se decide, categorías") habla de la Materia hipotética y puede quedarse.

### M-03 — S-06 (b): el camino "repetir el control" falta en las consultas que conservan el control
Dónde: Suposiciones, S-06 (b); "Pruebas requeridas", CH3-A17 y CH3-B09.
Por qué importa: el chore suma un disparador nuevo (`400 VALIDACION` fuera de contrato) a "Algo salió mal. Inténtalo de nuevo." en consultas. La regla de `AGENTS.md` del 2026-10-26 pide un caso por camino en toda frase de recuperación, y nombra "repetir el control que falló" como mínimo. En dos consultas el control sigue en pantalla después del aviso: "Ver más" de la lista de entregas (`entregas-view.tsx:111`, toast) y "Ver más comentarios" del hilo (`hilo-privado.tsx:175`, toast; además este no filtra el cursor). Ahí el camino existe, cuesta un caso y no le pertenece al `chore` de foco. Diferir los caminos de navegación de un `MensajeError` que reemplaza la vista (primera carga, y los "Ver más" de `features/clases`, que reemplazan la lista) sí es razonable: es el mismo texto en el mismo lugar que hoy sale con un `5xx`, y esos mecanismos (N-54, N-52) son del `chore` de foco. Aun así, la regla dice que un camino diferido no queda como observación: lo tiene que aceptar el humano.
Qué se espera: (1) dos casos nuevos (o una extensión de CH3-A17): tras el `400 VALIDACION` "limite: …" en cada uno de esos dos "Ver más", el mismo botón manda una petición nueva y, con una respuesta buena, aparecen las filas y no se repite el aviso. (2) S-06 (b) pasa a "Para el humano", explícito: los caminos de navegación de las consultas que reemplazan la vista se difieren al `chore` de foco, con la lista de las consultas afectadas.

## Problemas que no bloquean
- **N-01 — F3 no es la forma literal de la regla.** `AGENTS.md` pide "un prefijo con ruta (`campo.<i>.subcampo:`)". `ENTRADAS_DE_FORMULARIO.ruta` es "`archivoIds.0: …`" (dos niveles). Que F3 use tres niveles (por ejemplo, "`enlaces.0.url: …`" o "`archivoIds.0.id: …`"). La tabla ya los tiene; solo cambia la entrada de formulario.
- **N-02 — Caracteres invisibles literales en el plan.** El bloque `RESTOS_SIN_TEXTO_VISIBLE` de §D-3 trae NBSP, U+3000, U+200B, U+200C, U+200D, U+2060 y U+FEFF como caracteres literales (lo comprobé con `od -c`). En el código conviene escribirlos como escapes (`" "`, `"　"`, `"​"`…): CAL-T-99 solo prohíbe `⠀` y `\u{1D159}`, y un literal invisible no se puede revisar en un diff.
- **N-03 — S-01 atribuye al humano algo que no está en el registro.** El plan justifica S-01 con "el humano pidió que ningún texto visible cambie salvo donde llega un prefijo o un vacío"; esa frase no está en la petición literal de `aprobacion.md`. El alcance dice "en las consultas, un texto fijo del lugar en vez del mensaje del servidor (S-22)", y S-01 lo acota a `VALIDACION`. Recomiendo aceptar S-01: los mensajes de `SERVICIO_OCUPADO`, `TEMA_REPETIDO` y los demás están en español y dicen más que el genérico; el punto (5) de la fila de §3 habla solo del texto de zod. Pero debe ir al humano como una decisión sobre el alcance, no como algo que él ya pidió.
- **N-04 — Hermanos que faltan en las pruebas o en la lista.** (a) La descarga de un adjunto del muro (acción con `mensajeDeErrorClases`, `components/adjuntos/adjuntos-de-publicacion.tsx:58`) no está en CH3-B08; la de tareas sí está en CH3-A16. (b) La solicitud de subida (`avisoDeFalloAlSubir` con un `VALIDACION` de la solicitud) solo tiene la prueba unitaria CH3-A13: falta un caso de interfaz F1/F3/F4 en un formulario por módulo (crear tarea o entregar; publicar en el muro). (c) El envoltorio `avisoDeFalloAlSubir` de `features/clases` no recorre la tabla en CH3-B01. (d) Las dos consultas de `auth` (`acceso-restringido-view.tsx:25` y `establecer-contrasena-view.tsx:44`) quedan en la variante de acción por S-08: que el resumen las liste como hermanas con esa razón. (e) `avisoDeRecargaFallidaAlEditar` (`tareas/lib.ts:246`): textos fijos, no aplica; que lo diga la lista de hermanos.
- **N-05 — Hash de §2b.** "No se toca" verifica `ESTADO.md` §2b por "el SHA-256 del texto de la sección", pero `aprobacion.md` solo tiene el hash del archivo entero (`10d1ca4a…`), que cambiará en cuanto el orquestador actualice §2. El orquestador debe anotar el hash de §2b con el método de extracción (por ejemplo, desde `## 2b.` hasta la línea anterior a `## 3.`).
- **N-06 — Reglas estáticas que el programador puede romper sin darse cuenta** (las sumaría a las notas de §D-4 o a las PARADAS). El texto `mensajeDelAvisoDeCalificar` no puede aparecer en ningún archivo de producción fuera de `tareas/hooks.ts` y `tareas/lib.ts`, ni en comentarios (CAL-T-127 lee el texto crudo), y eso incluye `lib/errores-de-api.ts` y la tabla. `disabled` y `?? []` en comentarios de `tareas/lib.ts` y `tareas/data.ts` también rompen `entregas-01d-r3`, que lee el texto crudo.
- **N-07 — S-05, borde aceptable.** Un `VALIDACION` sin ruta que empezara con "14:30 …" perdería "14:". Hoy no se alcanza: todo `VALIDACION` del servidor lleva ruta (`validarCuerpo`, `validarParametros`, `core/calificaciones`, `core/tareas/categorias`, cursores) o no lleva dos puntos (`adapters/db/errores.ts`). Lo sumaría a "Decisiones tomadas que no son hallazgo" para el tester.
- **N-08 — Notas para el orquestador sobre `ESTADO.md`.** En §2, el párrafo de CALIFICACIONES-01 aún dice "el orden de la sección 2b arranca con CLASES-03"; hoy arranca con CHORE-03. Y "1b." no se lee como un elemento de la lista de Markdown. Las dos son del orquestador.

## Mi grep de §D-R0 (sobre `frontend/src` en `ad10844`)
Busqué en todos los `*.test.ts(x)` `quitarPrefijoDeCampo`, `esErrorDeCursor`, `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`, `errorQueRedirigeElCliente`, `mensajeDelAvisoDeCalificar`, `mensajeDelCampoDeCalificacion`, `erroresDeCalificacionDeApi`, `errorDelCampoDeApi`, `mensajeDeErrorTareas`, `mensajeDeErrorClases`, `mensajeDeErrorCalificaciones`, `mensajeDeErrorAdmin`, `mensajeDeErrorAuth`, `mensajeDeErrorDeLista`, `PREFIJO_DE_RUTA`, `MENSAJES_ERROR_CLASES\b`, `avisoDeFalloAlSubir`, "Revisa este valor", "parámetro", `lib/errores-de-api`, todos los mensajes `VALIDACION` literales (66 distintos) y los dinámicos (plantillas y variables), y las 24 pruebas con `import.meta.glob`.
- **Confirmo C-1 a C-4 y N-L1 a N-L3 como las únicas que rompen**, cada una por el motivo que da el plan: C-1, `errores.map(esErrorDeCursor)` (tipos y ejecución); C-2, el bloque leído en `tareas/data.ts`; la expresión de la reescritura funciona con `: readonly string[] = [` porque `[^=]*` admite los corchetes del tipo. C-3, `deSiempre` de "limite:" y "parámetro:". C-4, la ruta "nombre:". N-L1, la salida de "limite:". N-L2, la importación (ver M-01). N-L3, "email:".
- **No rompen, comprobado:** CAL-T-120 a CAL-T-126 (la expresión nueva es un superconjunto de `PREFIJO_DE_RUTA` en las rutas ASCII; "Calificación de 0 a 10: …" no se recorta; los códigos con mensaje no se recortan). CAL-T-127 (compara contra `mensajeDeErrorTareas` en vivo). `detalle-tarea-view.test.tsx:735` y `editar-tarea-view.test.tsx:936` (el aviso de recarga es un texto fijo de `useAvisoDeRecargaFallida`, no pasa por la traducción). `refactor-01c-r1`: el alias `esErrorDeCursorDeCalificaciones` no coincide con `definicion` por `\b`, y `erroresDeFormularioClases(…"cursor: no es válido"…)` sigue dando "no es válido". `muro-c-r2` (solo exige que no se vea "no es válido"). `app/cuentas-r1` (subcadena "muy larga"). `auth/enlace-r1` (mensaje sin ruta). `reexportaciones-01c` (comparaciones en vivo). CAL-T-99 (la tabla sin U+2800 ni U+1D159; `contarCaracteresVisibles(` no coincide con `contarCaracteresVisibles\s*=`). `tareas-01d-r3` (un `import type` no empieza con `type`).
- **Ninguna `*.ataque` fuera de §D-R0 rompe.** El riesgo que queda es el de R-02 (comparaciones dinámicas) y lo cubre PA-1.

## Revisión del plan, punto por punto
1. **Contrato único (§D-1, §D-2).** Bien. La ruta `^[\p{L}\p{M}\p{N}_.-]+:\s*` se quita una vez sobre el mensaje crudo y solo en `VALIDACION`; `campoDeErrorDeApi` no cambia; el vacío o invisible pasa por `contarCaracteresVisibles` de `shared/` (cubre U+0085 por `\p{Cc}`, los de formato y U+3164); `Object.hasOwn` en los mapas. Revisé el orden nuevo (`VALIDACION` primero, después los códigos fijos, después los del servidor): en `tareas`, `clases`, `admin` (sin "VALIDACION") y `auth`, los conjuntos de códigos son disjuntos, así que solo cambian salidas por las tres causas que el plan declara. Además, en `clases` desaparece un defecto real que el plan no nombra: `MENSAJES_ERROR_CLASES[error.codigo] ?? …` sin `hasOwn` devuelve la función `Object` con el código "constructor". Textos visibles que cambian: solo rutas compuestas o no ASCII, restos invisibles, códigos con mensaje en blanco, la ruta en `admin` y en `auth`, y el `VALIDACION` en consultas (S-01). N-33 y N-36 quedan resueltos: `mensajeDelCampoDeCalificacion` sin el segundo `esApiError`, y un solo recorte en "version: Nota: algo".
2. **Migración por módulo (§D-4).** Bien, salvo M-01. Ningún `hooks.ts` cambia: las cinco llamadas a `avisarDelErrorDeLaEntrega` y las tres a `renovarTrasErrorDeLaEntrega` siguen igual, y se conserva el nombre `mensajeDelAvisoDeCalificar`. La lista de vistas con consultas coincide con mi grep de `MensajeError` y de los toasts de "Ver más" en los cinco módulos.
3. **N-46 sin ciclo.** Bien: `apiClient.ts` sigue importando solo `@campus/shared`, `./navegacion` y `./tokenAcceso`; `lib/errores-de-api.ts` → `apiClient` ya existe y no forma ciclo. CH3-B12 lo fija.
4. **Pruebas `CH3-…`.** La tabla común recorre cada función de traducción de cada módulo (A08 a A13, B01 a B06, C01 y C02), con los huecos de N-04. Las tres clases de `VALIDACION` fuera de contrato están por formulario existente en los cinco módulos (A14, B07, C03, C04), con N-01. Los caminos de recuperación: los de formularios están bien (S-06 a: "repetir el control" en todos, y "otra sección y regreso" en uno por módulo); el de las consultas está en M-03.
5. **Subentregas.** Recomiendo **no fusionar** 03b y 03c. Cada una tiene su reescritura de ronda 0. 03c no es pequeña (siete formularios de `auth` y cinco de `admin`, con cuatro casos cada uno) y no depende de 03b. Juntarlas haría que un hallazgo en `clases` detenga el commit de `admin` y `auth`. Las tres se quedan.
6. **Carril normal: confirmado.** En `apiClient.ts` solo se agrega una exportación (S-12, sin tocar `procesar` ni `perderSesion`); en `auth` solo cambia el texto de un error; no hay `middleware/`, `adapters/auth`, migraciones, `infra/`, estado de pago ni restricción.
7. **"No se toca".** Bien. Los cinco documentos coinciden con sus hashes; falta el hash propio de §2b (N-05). Se toca solo lo que nombra "Cambios por capa" en cada subentrega; las pruebas nuevas pueden crearse.
8. **Pasos y PARADAS.** Pasos pequeños y en orden. PA-1 a PA-7 son pertinentes. Sumaría a las notas las reglas de N-06.
9. **Documentos a actualizar.** Bien, con dos agregados: si se aprueba A-3, también `.claude/agents/arquitecto.md`, línea 27 (la misma regla, en la voz del arquitecto); y la línea 59 si se quiere mencionar la tabla. `DESIGN.md` no cambia (S-02) y `ARCHITECTURE*.md` tampoco.

## Opinión sobre cada suposición
| S | Opinión |
|---|---|
| S-01 | Aceptar, pero llevarla al humano como una decisión sobre el alcance (N-03) |
| S-02 | Aceptar: no nace ningún texto ni patrón; es el mismo texto del `5xx` en el mismo lugar |
| S-03 | Aceptar: es la regla que el humano ya aprobó en calificar (T-05, CAL-T-135) |
| S-04 | Aceptar |
| S-05 | Aceptar; el borde de N-07, a "decisiones tomadas" |
| S-06 | (a) aceptar. (b) aceptar diferir los caminos de navegación solo con el visto bueno del humano, y cubrir "repetir el control" donde el control sigue (M-03) |
| S-07 | Aceptar, con escapes en lugar de literales invisibles (N-02) |
| S-08 | Aceptar; listar las dos consultas de `auth` como hermanas (N-04 d) |
| S-09 | Aceptar |
| S-10 | Aceptar (en `ad10844`, `clases/lib.ts:426` es la rama "categorias:" de `erroresDeCategoriasDeApi`) |
| S-11 | Aceptar; R-06 al humano |
| S-12 | Aceptar |
| S-13 | Aceptar las tres subentregas, sin fusión |

## Autorizaciones
- **A-1:** aprobar. Lo aplica el orquestador al cerrar 03c, con su hash.
- **A-2 (opcional): recomiendo aprobarla.** Texto literal, como viñeta nueva al final de `CLAUDE.md`, "Manejo de errores en el frontend", después de "Subidas, descargas y manejadores asíncronos…":
  > - **Textos del servidor:** ningún mensaje de la API llega a la persona sin pasar por `lib/errores-de-api.ts`. Cada módulo declara su `TraduccionDeErrores` en `data.ts` y traduce las acciones con `mensajeDeErrorDeApi` y las consultas con `mensajeDeErrorDeConsulta` (ante un `VALIDACION`, el texto fijo del lugar); fuera de ese archivo nadie recorta `error.message`. Las pruebas de cada función de traducción recorren `ENTRADAS_FUERA_DE_CONTRATO` (`lib/errores-de-api-fuera-de-contrato.ts`). Excepción: `features/diagnostico`, temporal.
- **A-3 (opcional): recomiendo aprobarla**, porque CLASES-03 trae al menos tres formularios nuevos (duda, respuesta y editar recurso). Texto literal: en `AGENTS.md`, regla "Todo plan con un formulario nuevo inventaría los `VALIDACION` fuera de contrato…", insertar después de «lo escrito se conserva y el botón sale de la espera.» y antes de «Motivo:»:
  > Desde CHORE-03, la función de traducción del módulo es un envoltorio de `lib/errores-de-api.ts` y sus pruebas recorren además `ENTRADAS_FUERA_DE_CONTRATO` de `lib/errores-de-api-fuera-de-contrato.ts`.

  La misma frase va en `.claude/agents/arquitecto.md`, línea 27, después de «…y el botón sale de la espera.».
- **A-4 y A-5:** aprobar, con N-L2 corregida según M-01.

## Parte A — decisiones de DOCS-04 registradas
Comparé con lo literal de la petición del humano y con las recomendaciones del plan de DOCS-04 (P-01 a P-13, DE-03, R-01 y la tabla del manager de la Enmienda 1).

| Decisión | Documento y sección | Estado |
|---|---|---|
| P-12 (CHORE-03 antes de CLASES-03; el `chore` de foco entre ADMIN-01 y FORO-01) | `ESTADO.md` §2b: hoja de ruta, puntos 1, 1b y 5, y viñeta "Dos `chore`"; el PRD remite el orden a §2b | Registrada. Orden DOCS-04 → CHORE-03 → CLASES-03 → CALIFICACIONES-02 → ADMIN-01 → `chore` de foco → FORO-01 → NOTIFICACIONES → DEPLOY → ENVIVO → hito 3, exacto |
| P-01 ("Personas" en los tres roles) | PRD RF-60, §6 y §11 (pregunta 10); ESSENTIALS, Secciones; DESIGN §7.16, Orden | Registrada |
| P-02 ("Foro" llega con FORO-01) | PRD RF-60 y §11 (pregunta 10); ESSENTIALS; DESIGN §7.16; `ESTADO.md` punto 6 | Registrada ("CLASES-03 no la muestra vacía" es la consecuencia directa de la recomendación, no un requisito nuevo) |
| P-03 (los alumnos ven "Recursos del docente") | PRD RF-63 y §11 (supuestos y pregunta 11); ESSENTIALS, Recursos | Registrada |
| P-04 (tareas y materiales salen de "Avisos") | PRD §11 (supuestos y pregunta 11); RF-61 ya era firme | Registrada |
| P-05 (los temas organizan también los recursos) | PRD RF-43 y pregunta 11; ESSENTIALS, Temas; DESIGN §7.16 | Registrada |
| P-06 (los recursos conservan los comentarios) | PRD RF-63 y pregunta 11; ESSENTIALS, Recursos | Registrada |
| P-07 ("Dudas") | PRD RF-64, RN-07 y pregunta 12; ESSENTIALS, Dudas | Registrada |
| P-08 (el maestro consulta sus archivadas en solo lectura) | PRD RF-69, RN-06, RN-10 y pregunta 14; ESSENTIALS, "Autorización" (O-2) y Reglas; ARCHITECTURE §7 (ADMIN-01) y §8; `ESTADO.md` punto 4 | Registrada. Sustituye bien el "deja de verla y no entra" de la recomendación; la clase sigue fuera de las listas |
| P-09 (foro) | PRD RF-67 y pregunta 13; `ESTADO.md` punto 6 | Registrada (detalle: la respuesta de la pregunta 13 omite "un foro vencido sin participación cuenta en el riesgo", que sí está en RF-67) |
| P-10 (duplicar) | PRD RF-71 y pregunta 14; ESSENTIALS, Clases archivadas; `ESTADO.md` punto 4 | **Registrada con una contradicción: RN-10 no se actualizó (M-02)** |
| P-11 (avisos de dudas y foro, en NOTIFICACIONES) | PRD §4.5 y pregunta 15; ESSENTIALS, Asíncrono; ARCHITECTURE §8; `ESTADO.md` punto 7 | Registrada |
| P-13 (nombre y correo, nunca estado de pago ni restricción) | PRD RF-65 y pregunta 17; ESSENTIALS, Exportar; ARCHITECTURE §7, §14 y D-30; `ESTADO.md` punto 3 | Registrada |
| DE-03 (el administrador elige de 1 a 2 maestros) | PRD RF-71 y RN-06; ESSENTIALS | Registrada |
| R-01 (JSON de la API; el navegador arma el .xlsx) | ESSENTIALS: `adapters/`, Archivos, Exportar; ARCHITECTURE §7, §11 punto 8, §14 y D-30; PRD RF-65; `ESTADO.md` punto 3 | Registrada. Ya no queda en ningún documento el "apartamiento" ni el "worker con almacén" como opciones |

- **Pendientes que siguen pendientes:** EXAMENES-01 y EXAMENES-02 (PRD §2, RF-72 a RF-74, RN-11 y pregunta 16; ESSENTIALS; `ESTADO.md` punto 10) y el bloque de grabaciones (RF-63, pregunta 11, ESSENTIALS "Recursos" y DESIGN §7.16). Correcto.
- **Marcas quitadas:** solo las de los puntos decididos. Las "Recomendación" que quedan (`publicaciones.bloque` y `dudas` en ARCHITECTURE §14, y el bloque en ESSENTIALS) son DE-06 y DE-07, que decide CLASES-03, no preguntas cerradas.
- **Inventado:** nada. Las dos frases nuevas, "Dónde encuentra el maestro sus clases archivadas lo decide el plan de ADMIN-01" (RF-69) y "si la matriz va completa o por ventanas lo decide su plan" (ARCHITECTURE §7), remiten decisiones a su plan, no crean requisitos.
- **ENVIVO intacto** (§2b, puntos 8 a 10 sin cambios). **Tablas íntegras:** el número de columnas de cada fila cambiada es igual antes y después (RF-43, RF-60 a RF-71, §14 "Exportación", D-30, la fila de §3 y la fila nueva de §1).

## Detalles menores
- La frase de §2 de `ESTADO.md` y el "1b." de §2b: N-08.
- La respuesta de la pregunta 13 en PRD §11 no menciona el riesgo de un foro vencido (está en RF-67).

## Desacuerdos arbitrados
Ninguno.

## Documentos a actualizar
- Al aprobar el plan: `PRD.md` RN-10 (M-02) y su hash nuevo en `aprobacion.md`; el hash de §2b (N-05).
- Al cerrar 03c: A-1 y, si se aprueban, A-2 y A-3 (esta última también en `.claude/agents/arquitecto.md`); `ESTADO.md` §3, la fila de T-04/T-05 con N-33, N-36, N-38, N-42, R-15 y N-46, y el destino de N-22 y de `formatearFechaDeClase` (R-06).

## Para el humano
1. S-01: en las consultas, ¿texto fijo solo ante `VALIDACION` (recomendado) o también ante los códigos con mensaje del servidor, como `SERVICIO_OCUPADO` (S-22 completo)?
2. S-06 (b): ¿aceptas que los caminos de navegación de las consultas que reemplazan la vista con "Algo salió mal. Inténtalo de nuevo." (primera carga y los "Ver más" de `features/clases`) se prueben en el `chore` de foco y no en CHORE-03? "Repetir el control" sí entra aquí (M-03).
3. A-2 y A-3 (recomiendo aprobar las dos, con los textos de arriba).
4. R-06: destino de N-22 y de `formatearFechaDeClase`.

---

## Revisión de la Enmienda 1 — CHORE-03
Veredicto: **APROBADO CON OBSERVACIONES** (el plan puede ir al humano)
Verificación propia: lint, test y build no corridos (sin código; indicación del orquestador). `git diff --stat ad10844 -- frontend backend shared infra CLAUDE.md AGENTS.md .claude README.md` vacío. SHA-256 propios: `plan.md` `63f6eef5…` (coincide), `PRD.md` `a10c5c23…` (coincide), `ESTADO.md` `77cee0d8…` (coincide), §2b con el método de N-05 `9f28126c…` (coincide; lo saqué con `awk` y con `sed`, mismo valor), `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIALS.md` y `DESIGN.md` sin cambio respecto a la parte A. Copia previa del plan: `fe4541ff…` (coincide).

### Cotejo mecánico (`git diff --no-index` contra la copia previa: 15 hunks)
| # | Hunk (línea nueva) | Contenido | Marca |
|---|---|---|---|
| 1 | @@56 | Parte A filas 47 (RN-10) y 48 (1b); notas N-08 y N-05; sección "Decisiones para el humano"; S-01, S-06 (b1/b2), S-07, S-08 | Todas marcadas |
| 2 | @@97 | Alcance punto 3 (calificaciones acotado) y "No entra" | Marcadas |
| 3 | @@196 | §D-3: `RUTAS_FUERA_DE_CONTRATO` + `archivoIds.0.id`; `RESTOS_SIN_TEXTO_VISIBLE` en escapes | Marcadas (la línea de restos, por el comentario N-02 de abajo). Comprobé con `od -c` que cada escape es el mismo carácter que el literal de antes (NBSP, U+3000, U+200B, U+200C, U+200D, U+2060, U+FEFF, U+0085 y la mezcla) |
| 4 | @@225 | Comentario de `ENTRADAS_DE_FORMULARIO.ruta` | Marcada |
| 5 | @@247 | Vistas de `tareas`: el cursor del hilo | Marcada |
| 6 | @@266 | `features/calificaciones`: M-01, importaciones exactas, `data.ts` | Marcadas |
| 7 | @@319 | N-L2 (nota) y la línea de CAL-T-99 en "Revisadas que no rompen" | N-L2 marcada; la de CAL-T-99 sin marca (cambia el `⠀` literal por "U+2800 (ni literal ni como escape)": neutra, consecuencia de N-02) |
| 8 | @@352 | Cambios por capa 03b | Marcada |
| 9 | @@370 | Convenciones; CH3-A02 | Convenciones marcada; A02 sin marca (solo escapes, nombrada en la sección final) |
| 10 | @@394 | CH3-A15 (escapes, sin marca, nombrada en la sección final); CH3-A21 y A22 | A21 y A22 marcadas |
| 11 | @@408 | CH3-A23, A24, B01, B06, B08, B14 | Marcadas |
| 12 | @@458 | Puntos de ataque (escape sin marca; decisiones marcadas) | Marcadas salvo el escape |
| 13 | @@482 | PA-8, reglas estáticas, No se toca, Documentos a actualizar, Autorizaciones | Marcadas |
| 14 | @@532 | Pasos 03a 8 y 9, 03b 3 y 8 | Marcadas |
| 15 | @@554 | Paso 6 de 03c y la sección final "Enmienda 1" | Marcadas |

Los cuatro cambios sin marca son la transcripción de escapes de N-02, con los mismos caracteres. El plan ya no tiene ningún carácter invisible literal (`grep -cP` de los once: 0). §D-1, §D-2 y la tabla de subentregas no tienen hunks. El alcance solo se reduce (calificaciones sin migración) y gana pruebas (A21 a A24, B14); el contrato no cambia.

### M-01 — resuelto
- Decisión: no se migra `mensajeDeErrorCalificaciones` y no nace `TRADUCCION_DE_ERRORES_CALIFICACIONES`. Es la que recomendé.
- Leí `estatico-01d.test.ts:136-138`: hoy exige `/import \{ campoDeErrorDeApi \} from "@\/lib\/errores-de-api"/` sobre `sinComentarios(lib.ts)`. La N-L2 la cambia por `/import \{ campoDeErrorDeApi, esErrorDeCursor \} from "@\/lib\/errores-de-api"/`, y §D-4 manda escribir exactamente `import { campoDeErrorDeApi, esErrorDeCursor } from "@/lib/errores-de-api"`. Coinciden carácter por carácter. Prettier (`printWidth: 100`) no la parte y el proyecto no ordena importaciones (no hay `sort` ni `import/order` en ESLint). El alias `= esErrorDeCursor` no coincide con `\besErrorDeCursor\(`, y `esErrorDeSinAcceso` sigue usando `campoDeErrorDeApi`.
- El alias es compatible: la firma actual es `(error, campos: readonly string[])` y la nueva `(error, campos = ["cursor"])`, y las vistas siempre pasan `campos`.
- La lista de 03b, el paso 3 de 03b, Cambios por capa, CH3-B06 (que además comprueba que `data.ts` no exporte ninguna de las dos constantes) y PA-8 dicen lo mismo. Ninguna prueba fija las importaciones de `apiClient` ni de `./data` en `calificaciones` (grep: solo `lib.test.ts` importa `ApiError`).

### M-02 — resuelto
- RN-10, cuarta viñeta: «… las secciones de la clase (los temas, con nombre y orden) y sus categorías ponderadas (son estructura, no datos de alumnos) … El Administrador elige de uno a dos maestros al duplicar; el nombre es el mismo, editable; y se puede duplicar una clase archivada, cuya copia nace activa (RF-71; P-10 y DE-03…)».
- Cada elemento tiene su fuente en `docs/trabajo/DOCS-04-nuevos-requisitos/plan.md:148` (recomendación de P-10: «"Secciones" = temas (nombre y orden). Las categorías también se copian (son estructura, no datos de alumnos)… El admin elige de uno a dos maestros al duplicar (DE-03). Mismo nombre, editable en el formulario. Sí, también una archivada (la copia nace activa)») y en la petición literal («DE-03 sí… P-09 a P-11 según lo literal»). No se inventó nada. RN-10 y RF-71 dicen ya lo mismo.
- D-31 (`ARCHITECTURE.md:596`, «temas y, si se decide, categorías», de la Materia hipotética) no se tocó. Correcto.
- El orden de magnitud cuadra: `git diff --numstat` pasa de 56/54 a 57/55. El +1/+1 es la línea de RN-10; la línea "1b" ya estaba agregada desde la parte A.

### M-03 — resuelto, con la observación O-1
- **(b1).** CH3-A21 (entregas) y CH3-A22 (hilo, en las dos vistas) prueban "repetir el control" de verdad. La primera página llega bien; la siguiente falla, también en el reintento (`retry: 1`); sale un solo toast genérico; el botón sigue en pantalla, sin `aria-busy` ni `aria-disabled`, y las filas o los comentarios ya cargados se quedan; el segundo clic manda una petición nueva con el mismo cursor; con una respuesta buena aparecen las filas y no hay un segundo toast. Lo contrasté con el código: en `entregas-view.tsx:99-114`, con `filas` definidas, un `VALIDACION` "limite:" no entra en `PREFIJOS_QUE_REEMPLAZAN_LA_VISTA`, así que `listaReemplazada` es falso y `hasNextPage` sigue verdadero; en `hilo-privado.tsx:163-185` pasa lo mismo, con `comentarios` definidos. El cursor del hilo que pasa al genérico es un cambio visible declarado. No rompe ninguna promesa alcanzable: los comentarios privados no se borran (el handler solo tiene `GET` y `POST`), así que un cursor del hilo solo deja de valer si alguien lo manipula o si se borra la tarea, y en ese caso el `404` reemplaza la vista antes.
- **(b2).** El aplazamiento queda explícito como DH-2, con la lista de consultas: las seis de `tareas`, las once de `clases` más los cinco "Ver más" de `mensajeDeErrorDeLista`, y las dos de `admin`. Si el humano no lo acepta, la salida está escrita: un caso por camino.

### Decisiones para el humano (DH-1 a DH-4) — recogen mi opinión con fidelidad
- DH-1: «Aceptar S-01 (solo `VALIDACION`), llevándolo al humano como decisión sobre el alcance». Es lo que dije en N-03.
- DH-2: «Aceptar diferirlos solo con el visto bueno del humano». Es lo que dije en M-03.
- DH-3: aprobar las dos.
- DH-4: «Lo deja al humano». Es lo que dije sobre R-06.
- **A-3:** mi texto literal, también en `.claude/agents/arquitecto.md:27`. Comprobé que la línea 27 es la regla de los formularios nuevos y que trae los dos anclajes («…y el botón sale de la espera.» y «Si el módulo ya tiene una función…»).
- **A-2:** mi texto literal más un ajuste marcado: «Excepciones: `features/diagnostico`, temporal, y `features/calificaciones`, cuyas consultas nunca muestran texto del servidor…». **El ajuste es correcto y lo recomiendo en lugar de mi versión.** Con M-01, `features/calificaciones` no declara `TraduccionDeErrores` ni usa `mensajeDeErrorDeConsulta`, y solo tiene consultas: calificar vive en `tareas`. Con mi texto, "Cada módulo declara…" sería falso desde el primer día. Lo demás de la viñeta se sigue cumpliendo en `calificaciones`: no lee `.message` (CAL-1D09) y CH3-B06 recorre la tabla.

### N-01 a N-08
| N | Cómo quedó |
|---|---|
| N-01 | `ENTRADAS_DE_FORMULARIO.ruta` = `archivoIds.0.id: …` (tres niveles), sumada a `RUTAS_FUERA_DE_CONTRATO`. El arquitecto aclara bien que en las convenciones es F4 (yo la llamé F3 por error). Resuelto |
| N-02 | Escapes en §D-3, Convenciones, A02, A15, B08 y Puntos de ataque. CH3-A24 lo comprueba en la tabla, en el contrato y en las pruebas `*-ch3`. Las reglas de CAL-T-99 (`estatico-01c-r1.ataque.test.ts:140-145`, que prohíbe también `⠀` y `\u{2800}` como escapes) quedan reflejadas en PARADAS. Resuelto |
| N-03 | Quitó la frase atribuida al humano y la mandó a DH-1. Resuelto |
| N-04 | (a) la descarga del muro está en CH3-B08; (b) CH3-A23 cubre crear tarea y entregar, y CH3-B14, publicar en el muro; (c) CH3-B01 cubre `avisoDeFalloAlSubir` de `clases`; (d) S-08 y el paso 6 de 03c; (e) el paso 9 de 03a. Resuelto |
| N-05 | El método está en las "Notas para el orquestador" y en "No se toca". El hash de §2b está en `aprobacion.md` (`9f28126c…`) y lo reproduje. Resuelto |
| N-06 | Lista "Reglas estáticas que se rompen sin darse cuenta" junto a las PARADAS, que el resumen verifica una por una con su comando. Cotejé las expresiones de CAL-T-99. Resuelto |
| N-07 | Está en "Decisiones tomadas que no son hallazgo". Resuelto |
| N-08 | En `ESTADO.md` §2b, «     - **1b. CHORE-03 …**» quedó con cinco espacios, la sangría del contenido de «  1. »: se lee como sub-viñeta del punto 1, y los puntos 2 a 10 conservan su número. La lista se lee bien. La frase de §2 ya la corrigió el orquestador. Resuelto |

**Punto 7 (nada más cambió).** `git diff ad10844` de `ESTADO.md` solo trae la línea de actualización, la fila de §1 (DOCS-04), el párrafo de §2 (CHORE-03 y CALIFICACIONES-01, del orquestador), §2b y la fila de §3. `PRD.md` solo suma RN-10 a la parte A. Los otros tres documentos tienen el mismo hash que en la parte A.

### Observaciones (no bloquean; no piden otra enmienda)
- **O-1 — Los dos buscadores de `clases` conservan su control, y S-06 (b1) dice lo contrario.** En `buscador-de-maestros.tsx:199` y `buscador-alumnos.tsx:131`, el `MensajeError` reemplaza solo los resultados. El campo de búsqueda sigue en pantalla. Los caminos "volver a escribir el mismo término" y "escribir otro término" (el "otro filtro" de la regla) no están ni en b1 ni en la lista de navegación de b2. Esos dos buscadores sí están en la lista de consultas de b2 ("las once de §D-4"), así que basta con que **el orquestador sume estos dos caminos a la pregunta DH-2** (está en la lista de abajo). Si el humano acepta, se difieren con los demás; si no, la enmienda de DH-2 suma un caso por buscador.
- **O-2 — Hay dos "A-4" en "Autorizaciones".** La "A-4 (Enmienda 1)" es una nota, no una autorización. En la lista para el humano, A-4 es la del programador (N-L1 a N-L3).
- **O-3 — "Un aviso por intento".** CH3-A21 y CH3-A22 prueban un fallo seguido de un acierto, pero no dos fallos seguidos (exactamente un toast más). Queda para el ataque del tester. Es el estado vecino "fallos seguidos" del mecanismo, y el programador lo nombra en sus hermanos.
- **O-4 — Riesgo de producto, ya aceptado antes.** Ante un `VALIDACION` fuera de contrato, que es determinista, "Inténtalo de nuevo" no se cumple al repetir: la petición es la misma. Las pruebas usan un doble que responde bien al segundo intento. Es el mismo criterio que el humano ya aprobó en `calificaciones` (S-22, CAL-T-135). Hoy esos lugares muestran el texto de zod en inglés o una ruta, que es peor. Va como riesgo, no como hallazgo.

### Lista cerrada para el humano
**Decisiones (arquitecto y manager coinciden en las cuatro):**
1. **DH-1 (S-01):** en las consultas de `tareas`, `clases` y `admin`, ¿el texto fijo del lugar va solo ante un `400 VALIDACION`? Recomendación de los dos: **sí, solo ante `VALIDACION`**. Los mensajes de `SERVICIO_OCUPADO`, `TEMA_REPETIDO` y los demás están en español y dicen más que el genérico.
2. **DH-2 (S-06 b2):** ¿se pasan al `chore` de foco y navegación los caminos de navegación de las consultas cuyo error reemplaza la vista o la lista? Son pulsar la sección activa, ir a otra sección y regresar antes del `staleTime`, y atrás y adelante; la lista de consultas está en S-06 (b2). **Más (O-1):** en los dos buscadores de `clases`, volver a escribir el mismo término o escribir otro. Recomendación de los dos: **sí**. Es el mismo texto, en el mismo lugar, que hoy sale con un `5xx`. "Repetir el control" de los dos "Ver más" con toast sí entra en CHORE-03 (CH3-A21 y CH3-A22). Si se responde que no, el plan se enmienda con un caso por camino.
3. **DH-3 (A-2 y A-3):** recomendación de los dos: **aprobar ambas**. A-2 con el ajuste del arquitecto (excepciones: `diagnostico` y `calificaciones`); A-3 en `AGENTS.md` y en `.claude/agents/arquitecto.md:27`. Los textos literales están en "Documentos a actualizar" del plan.
4. **DH-4 (R-06):** destino de N-22 y de `formatearFechaDeClase`. Propuesta del arquitecto: N-22 por el carril trivial la próxima vez que se toque ese archivo, y `formatearFechaDeClase` en el próximo encargo que toque `lib/format.ts`. Yo no tengo objeción.

**Suposiciones (vetables; recomiendo aceptarlas todas):**
- **S-01:** igual que DH-1.
- **S-02:** el texto fijo es el genérico del módulo; `DESIGN.md` no cambia.
- **S-03:** si el campo se pinta y el mensaje viene vacío, `ErrorDeCampo` con el genérico; si no, un solo aviso.
- **S-04:** "sin caracteres visibles" es `contarCaracteresVisibles === 0`, de `shared/`.
- **S-05:** la ruta (`^[\p{L}\p{M}\p{N}_.-]+:\s*`) se quita una vez, solo en `VALIDACION`.
- **S-06:** (a) "repetir el control" en cada formulario; (b1) los dos "Ver más"; (b2) la parte de DH-2.
- **S-07:** la tabla vive en `lib/errores-de-api-fuera-de-contrato.ts`, en escapes.
- **S-08:** `auth` sin variante de consulta.
- **S-09:** `diagnostico` no entra.
- **S-10:** `clases/lib.ts:426` es el error de categorías.
- **S-11:** N-22 y `formatearFechaDeClase` no entran.
- Además, S-12 (`apiClient` solo gana la exportación) y S-13 (tres subentregas, sin fusión).

**Autorizaciones:**
- **A-1:** el texto de "Ubicaciones compartidas" de `CLAUDE.md` al cerrar 03c.
- **A-2 y A-3:** las de DH-3.
- **A-4:** el programador cambia solo N-L1 (03b), N-L2 (03b) y N-L3 (03c).
- **A-5:** el tester reescribe en la ronda 0 las `*.ataque` C-1 (03a), C-2 y C-3 (03b) y C-4 (03c), sin cambiar lo que protegen.

Recomiendo aprobar las cinco.

**Riesgos principales:**
- **R-01, volumen de pruebas de interfaz:** unos 25 formularios con cuatro casos cada uno, más controles y consultas.
- **R-02, una prueba existente con comparación dinámica que el inventario no vio:** la cubre PA-1. Mi grep confirmó que solo rompen C-1 a C-4 y N-L1 a N-L3.
- **Reglas estáticas que leen el texto crudo, también los comentarios** (CAL-T-127, CAL-T-99, CAL-1D09, `entregas-01d-r3`): las cubren las PARADAS de N-06.
- **O-4:** "Inténtalo de nuevo" ante un `VALIDACION` determinista.
- **Cambios de texto visibles declarados:** rutas compuestas o no ASCII, restos invisibles, la ruta en `admin` y `auth`, el `VALIDACION` en consultas y el cursor del hilo, que pasa al genérico.

## Verificación del resumen — 03a — primera entrega
Fecha: 2026-10-26. Resumen: `resumen-programador-03a.md`. Base `ad10844`; plan `63f6eef5…` (Enmienda 1, aprobado). Antes de correr comprobé con `Get-CimInstance Win32_Process` que no hubiera ningún `vitest` en marcha (solo mi propia consulta). Una suite a la vez, desde `frontend/`. Salidas en el scratchpad de la sesión (`ch3-03a-lint.txt`, `ch3-03a-test.txt`, `ch3-03a-build.txt`, `ch3-03a-list.txt`).

**Veredicto: RESUMEN ACEPTADO (el tester puede atacar).** Ninguna cifra discrepa, no falta ninguna viñeta, el contrato coincide con §D-1 a §D-4 y "No se toca" está limpio. Las observaciones de abajo (O-01 a O-08) son para el tester o para el cierre; ninguna bloquea.

### Cifras: resumen contra corrida propia
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` | salida 0; `> tsc -b` (antes `All matched files use Prettier code style!`) | salida 0; `> tsc -b`, antes `All matched files use Prettier code style!` | Sí |
| `npm run test` | `Test Files  204 passed (204)` · `Tests  3426 passed (3426)` · 124.74s; `Test timed out` = 0 | `Test Files  204 passed (204)` · `Tests  3426 passed (3426)` · 127.17s; `grep -c "Test timed out"` = 0; ningún `FAIL` ni `×` | Sí |
| `npm run build` | salida 0; `✓ built in 1.38s`; aviso de chunk > 500 kB | salida 0; `✓ built in 739ms`; mismo aviso (`index-pPGfFlH2.js` 840.26 kB) | Sí. El aviso es previo: viene de FRONT-01 (revisión de CALIFICACIONES-01, línea 2588) |
| Ronda 0 → 03a | 197 → 204 archivos; 3318 → 3426 casos | ronda 0 del tester: 197 / 3318; ahora 204 / 3426 | Sí (+7, +108) |
| `npx vitest list` de los 7 archivos | 108 | 108 líneas `CH3-` (más 3 del aviso de `configLoader` de Vite) | Sí |
| Por archivo | 7 · 2 · 5 · 1 · 66 · 20 · 7 | `errores-de-api` 7 · `errores-de-api-estatico` 2 · `tareas/errores-ch3` 5 · `adjuntos/errores-ch3` 1 · `formularios-ch3` 66 · `consultas-ch3` 20 · `recuperar-ch3` 7 | Sí |
| Por id | A01–A13: 1 c/u; A14 39; A15 5; A16 16; A17 15; A18 6; A19 1; A20 1; A21 1; A22 4; A23 6; A24 1 | lo mismo (`grep -c "CH3-Axx:"`) | Sí |

### V-01
`git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum` contra la "Tabla de SHA-256 de las 204 `*.ataque` al cierre de la ronda 0 de CHORE-03 03a" (`reporte-tester.md`, línea 76; minúsculas y ordenado por ruta): base 204, actual 204, `diff` vacío. **204 de 204.** La C-1 (`refactor-01c-r1.ataque.test.tsx`) tiene `85a7926a0f6831a8375f544cf38fe5585a8e2dcbf73d9726e9a3cfaab7f76511`, el de `aprobacion.md`. Ninguna `*.ataque` modificada por el programador, saltada ni borrada.

### "No se toca"
- `git diff --stat ad10844 -- frontend shared backend infra CLAUDE.md AGENTS.md .claude README.md .env.example`: **11 archivos** = los 10 modificados de "Cambios por capa › 03a" (`lib/errores-de-api.ts`, `tareas/data.ts`, `tareas/lib.ts`, `components/adjuntos/lib.ts` y las seis vistas) más la C-1 del tester. Nuevos (`git ls-files -o`): 8, la tabla común y las 7 pruebas. Nada en `shared/`, `backend/`, `infra/`, `.claude/`, `CLAUDE.md`, `AGENTS.md`, `README.md` ni `.env.example`. Ningún `hooks.ts`, ninguna prueba existente fuera de C-1, nada de `calificaciones`, `clases`, `admin`, `auth`, `app/` ni `services/`. Precisión de redacción: "11 archivos de 'Cambios por capa' más C-1" (encargo del orquestador) sumaría 12. Son 10 más C-1, y la lista del resumen nombra justo esos 10 (O-08).
- Hashes: `docs/PRD.md` `a10c5c23…0104` ✓; `docs/ARCHITECTURE.md` `75c3c75d…6274` ✓; `docs/ARCHITECTURE-ESSENTIALS.md` `7c05fd61…3dd3` ✓; `docs/DESIGN.md` `8d977dc4…e7e` ✓ (S-02: sin textos nuevos); `docs/ESTADO.md` completo `77cee0d8…f5b0` ✓; §2b (método N-05: desde `## 2b.` hasta antes de `## 3.`) `9f28126c…51ef` ✓. `plan.md` `63f6eef5…2aedf2` ✓.

### Pruebas requeridas, una por una
Todas existen con el título que da el resumen (los de `it.each` con su plantilla). Leí cada caso.

| Id | ¿Cubierta? | ¿Prueba lo que pide la viñeta? |
|---|---|---|
| A01 | Sí | Sí: 19 rutas × 3 separadores, una sola vez ("x: Nota: algo"), `parámetro:`, sin ruta, el que empieza con espacio y "Calificación de 0 a 10: …" intactos |
| A02 | Sí | Sí: los 15 restos, `\u{2800}`, `\u{1D159}`, `\u{3164}` y mezclas (solo en la prueba, S-07); "Revisa" y "..." quedan |
| A03 | Sí | Sí. "constructor", "toString" y "__proto__" como campo: con mensaje da `"x"` y sin mensaje el genérico, que es lo que fija §D-1 paso 3. La viñeta dice "dan el genérico" en los dos casos; la prueba lee bien el contrato y demuestra el `Object.hasOwn` (sin él, `textosPorCampo["constructor"]` devolvería una función). Incluye el caso de `admin` con "VALIDACION" en la lista del servidor |
| A04 | Sí | Sí: toda la tabla con y sin respaldo; ids, fijos, del servidor con texto y con cada resto |
| A05 | Sí | Sí: los mismos 11 errores de `refactor-01c-r1` (líneas 165-177, cotejados uno por uno); `["cursor","cursorTareas"]`; "cursor.0:", "Cursor:" y `SIN_ACCESO_A_LA_CLASE` dan `false` |
| A06 | Sí | Sí |
| A07 | Sí | Sí ("nombre:" + cada resto → genérico; rutas y campo no pintable → `null`) |
| A08 | Sí | Sí (comprueba que son 14 códigos; cada resto da el genérico, "Mensaje." da "Mensaje."; ids con y sin mensaje) |
| A09 | Sí | Sí |
| A10 | Sí | Sí ("enlaces:", "enlaces.0:", "enlaces.4:", "texto:"; "enlaces.0.url: x" → `null`) |
| A11 | Sí | Sí ("titulo:", "rubrica.0.criterio:", "rubrica.2: x" → `null`, `FECHA_LIMITE_INVALIDA` en `fechaLimite`) |
| A12 | Sí | Sí, con la lectura del programador, que **acepto**: con dos criterios enviados, `erroresDeCalificacionDeApi` con "calificacion:" da `null` por diseño (T-02: con rúbrica no se pinta; `lib.ts:646`, que este chore no tocó) y la persona recibe el aviso con `mensajeDelCampoDeCalificacion`, que sí da el genérico (probado en el mismo caso). Sin criterios da `{ calificacion: genérico }`. La viñeta pedía "genérico" con dos criterios; cumplirla al pie de la letra contradiría T-02 |
| A13 | Sí | Sí, con `mensajeDeErrorTareas` y con una traducción de prueba; con "El archivo pesa más de 25 MB." no cambia |
| A14 | Sí | Sí: dos `it.each` sobre los 7 formularios (F1, F3 y F4: 21; F2 en 9 campos × `"   "` y `"\u{200B}"`: 18). Se comprueban (a) a (d), que el foco siga en el botón ante un aviso y que, con F2, vaya al mismo elemento que con un error de campo con mensaje. El conteo de `ErrorDeCampo` por id (`-error`, `-error-servidor`, `-vacia`) cubre todos los `ErrorDeCampo` de `features/tareas`: lo comprobé con grep. Ver O-01 |
| A15 | Sí | Sí (las 5 entradas de la viñeta) |
| A16 | Sí | Sí: anular, borrar sin y con confirmar; F1, F3, F4 y `ENTREGA_CERRADA` con "   ". La lectura de la descarga es **aceptable**: la viñeta dice "en sus hooks (`renderHook`)" y nombra el callback de `useAvisoDeRecargaFallida(...)` devuelto como `alFallarLaDescarga`. Llamarlo directo con el `ApiError` es lo que pide. Ver O-03 |
| A17 | Sí | Sí: las 6 primeras cargas con "limite: …", las 6 con "claseId: x" (la ampliación a las 6 está bien) y los 3 "Ver más" (un aviso). Ver O-02 |
| A18 | Sí | Sí: 6 formularios. Tras F2 ("   ") el mismo botón manda una petición nueva, el `ErrorDeCampo` desaparece y sale el aviso de éxito de siempre (comentar no tiene: el campo se vacía) |
| A19 | Sí | **Aceptable.** Usa `rutas` de `@/app/router` en `createMemoryRouter` y el `Providers` real (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`, comprobado en `app/providers.tsx:14`). Pulsa el enlace real "Trabajo de clase" de "Secciones de la clase", avanza el reloj 10 s y regresa con `router.navigate(-1)`. El error vive en el estado de la mutación del formulario, así que cualquier regreso que vuelva a montar el detalle lo quita. Atrás y un enlace hacen lo mismo con este mecanismo, y la viñeta no fija cómo se vuelve. Ver O-04 |
| A20 | Sí | Sí: las 6 manipulaciones en `tareas` y `adjuntos` (más de 30 archivos); la expresión de ruta solo en el contrato; la tabla sin `import` y sin quien la importe. Ver O-05 |
| A21 | Sí | Sí: con `Providers` (`retry: 1`) se piden 2 páginas y sale 1 aviso; el botón sigue fuera de la espera y la primera página sigue; al repetir, 3.ª petición con el mismo cursor, filas nuevas y ningún segundo aviso |
| A22 | Sí | Sí: hilo del alumno y del maestro, con "limite:" y con "cursor:" (4); sin "el cursor no es válido" |
| A23 | Sí | Sí: crear y entregar con F1, F3 y F4; un solo `errorRechazado(nombre, resto o genérico)`, el archivo sigue elegido, el botón sale de la espera y no sale la petición de crear ni la de entregar |
| A24 | Sí | Sí: la tabla, el contrato, `errores-de-api.test.ts` y los 5 `*-ch3`. **La razón de que no se lea a sí mismo es correcta:** Vite 8.3.0 quita del `import.meta.glob` el archivo que importa (`node_modules/vite/dist/node/chunks/node.js:27251`, `.filter((file) => file !== id)`). Con un script de `node` comprobé los 12 archivos tocados o nuevos, `errores-de-api-estatico.test.ts` incluido: ningún invisible literal. Ver O-06 |

**`\u{0085}` con llaves:** es el mismo valor que el `\u0085` de §D-3, y la forma con llaves es la que pide N-02. Correcto.

**Indicación del humano (`it.each` por módulo, una sola función de montaje):** se cumple. Los casos de interfaz salen de `it.each` sobre la tabla y los formularios, sin casos escritos a mano por formulario y entrada. `formularios-ch3` monta las vistas solo con `montar`. Los hooks de A16 usan el envoltorio `conCliente` de `renderHook`, que no monta vistas. `consultas-ch3` tiene un solo `montar(ruta, Envoltura)`. `recuperar-ch3` tiene `montar` y, en A19, el `createMemoryRouter(rutas)` que el plan exige para ese camino.

### Contrato contra el código (§D-1 a §D-4)
- `lib/errores-de-api.ts`: `TraduccionDeErrores`, `quitarRutaDelMensaje` (`/^[\p{L}\p{M}\p{N}_.-]+:\s*/u`, un solo `replace` sin `g`), `textoVisibleOGenerico` (con `contarCaracteresVisibles` importada de `@campus/shared`, sin copiar la regla), `esErrorDeCursor(error, campos = CAMPOS_DE_CURSOR)` con `["cursor"]`, y `mensajeDeErrorDeApi` y `mensajeDeErrorDeConsulta` en el orden exacto de §D-1 (pasos 1 a 6, retornos tempranos, `Object.hasOwn` en los dos mapas). El paso 2 solo aplica a `VALIDACION` porque `campoDeErrorDeApi` devuelve `null` en los demás casos. **S-05:** la ruta se quita una vez y solo en `VALIDACION`; un código con mensaje del servidor nunca se recorta. **S-01:** en una consulta, un `VALIDACION` da el respaldo, y los códigos fijos y los del servidor con texto dan su texto. `quitarPrefijoDeCampo` y `campoDeErrorDeApi` (`/^([a-zA-Z_]+):\s*/`) siguen sin cambios.
- `lib/errores-de-api-fuera-de-contrato.ts`: §D-3 completo, con las 19 rutas de la Enmienda 1 (incluida `archivoIds.0.id`), los 15 restos y `ENTRADAS_DE_FORMULARIO.ruta = "archivoIds.0.id: …"`. No tiene U+2800, U+1D159 ni invisibles literales (todo va como escape), no importa nada y ningún archivo de producción lo importa.
- `tareas/data.ts`: `TRADUCCION_DE_ERRORES_TAREAS` usa `satisfies TraduccionDeErrores` con `import type` y declara los tres `textosPorCampo` de §D-4. No trae ningún texto nuevo.
- `tareas/lib.ts`: `mensajeDeErrorTareas` y `mensajeDeConsultaTareas` son envoltorios. `errorDelCampoDeApi` usa `test` y luego `mensajeDeErrorTareas`, y sus expresiones (`/^enlaces(\.\d+)?:\s*/`, `/^texto:\s*/`) no llevan `g`. `mensajeDelCampoDeCalificacion` queda sin la doble comprobación (N-33). `mensajeDelAvisoDeCalificar` es `(e) => mensajeDeErrorTareas(e)` y conserva su nombre (N-36, CAL-T-127). `erroresDeCalificacionDeApi` usa `mensajeDeErrorTareas`. Se borraron `PREFIJO_DE_RUTA` y la importación de `quitarPrefijoDeCampo`. Equivalencias revisadas: `PREFIJO_DE_FILA` y `PREFIJO_DE_CALIFICACION` cortan en los primeros dos puntos, igual que la ruta del contrato, así que el recorte no cambia en una ruta pintable.
- `components/adjuntos/lib.ts`: el motivo de `ARCHIVO_INVALIDO` pasa a `textoVisibleOGenerico(error.message, mensajeDeError(error))`, como pide §D-4. La firma no cambia.
- Vistas: las 10 llamadas de consulta de §D-4 están en las líneas que dice el resumen (detalle:72, editar:71, entregas:111/159/163, entrega-de-alumno:170/174, hilo:175/183, tu-trabajo:54). Las de acción no cambian (`AdjuntosDePublicacion` en detalle:108, entrega-de-alumno:208 y entrega-realizada:88; acciones-de-la-tarea:73; las subidas en formulario-tarea:224 y formulario-de-entrega:135; los `toast.error` de `hooks.ts`).
- Estilo (`CLAUDE.md`): retornos tempranos, sin `if`/`else` anidados ni ternarios anidados en JSX, sin `any`, `eslint-disable`, `@ts-`, `.skip` ni `.only` en lo nuevo. No hay tipos fuera de `types.ts` en los módulos (`TraduccionDeErrores`, `ClaseFueraDeContrato` y `EntradaFueraDeContrato` viven en `lib/`). Sin textos nuevos (S-02). En las pruebas, el reloj está fijo (solo `Date`) y ningún caso termina con un `return` temprano: las precondiciones lanzan.

### Matriz de avisos (§D-6) y hermanos
- **Matriz:** la contrasté con el código y se sostiene. Los avisos siguen en los hooks (`hooks.ts` intacto: 3 `renovarTrasErrorDeLaEntrega(` y 5 `avisarDelErrorDeLaEntrega` siguen, como confirman CAL-1C13 y CAL-T-127 en verde). F2 da un `ErrorDeCampo` genérico, sin aviso y con el foco donde iba (A14). F1, F3 y F4 dan un toast con el foco en el botón (A14). Calificar avisa con `mensajeDelCampoDeCalificacion` o `mensajeDelAvisoDeCalificar` (`hooks.ts:502-508`), que dan lo mismo que `mensajeDeErrorTareas`. Las consultas que reemplazan la vista dan `MensajeError` con el genérico. Los dos "Ver más" dan un solo toast (el reintento cae dentro de la misma llamada), el botón sigue y salen callados ante lo que reemplaza la vista o redirige y con la vista desmontada (`montadoRef`). El cursor de la lista de entregas sigue con su texto en la lista (`entregas-view.tsx:108`, `:122`); el del hilo pasa al genérico, como declara §D-4. "Dos fallos seguidos" no tiene caso propio y queda para el tester (O-3 de la revisión de la Enmienda 1).
- **Hermanos:** coinciden con el código uno por uno: `mensajeDeErrorTareas`, `mensajeDeConsultaTareas`, `erroresDeLaTareaDeApi` (hereda), `errorDelCampoDeApi`, `errorDeEnlacesDeApi`, `errorDeTextoDeApi`, los tres de calificar, `avisoDeFalloAlSubir`, las 7 acciones y las 10 consultas. `avisoDeRecargaFallidaAlEditar` (hoy en `tareas/lib.ts:239`; el plan decía :246) y el aviso de recarga de `useAvisoDeRecargaFallida` (`hooks.ts:273`, `toast.error(texto)`) son textos fijos: "no aplica" con razón. Lo que queda para 03b y 03c (`clases`, `admin`, `auth`) se nombra con su línea. Un hermano de la misma familia que el resumen no nombra: O-07.

### Las 7 "Reglas estáticas que se rompen sin darse cuenta", con grep propio
1. `mensajeDelAvisoDeCalificar` en producción: solo `tareas/hooks.ts` y `tareas/lib.ts` ✓.
2. `disabled`, `?? []`, `fetch(` y `console.` en `tareas/lib.ts`, `data.ts` y `hooks.ts`: ninguno ✓. Las palabras de §D-0.9 las cubren `entregas-01d-r3`, `entregas-01e-r1` y CAL-1C13, en verde en mi corrida.
3. CAL-T-99 en producción: `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =`, `\u{2800}` o `⠀`, `\u{1D159}` y `\r\n|\r` no aparecen ✓. Un script de `node` sobre todo `src/` de producción no encuentra U+2800 ni U+1D159 literales ✓. `contarCaracteresVisibles` solo se importa (`lib/errores-de-api.ts:1`) ✓.
4. `esErrorDeCursor` se define una sola vez (`lib/errores-de-api.ts:40`) y nadie lo llama desde `features/calificaciones` ✓.
5. `features/calificaciones`: `git diff --stat ad10844` vacío; 11 archivos de producción; ninguno lee `.message` ✓.
6. `TraduccionDeErrores` solo en `tareas/data.ts:5` (`import type`) y `:191` (`satisfies`); ningún `interface` ni `type` nuevo en `data.ts`, `lib.ts` ni `adjuntos/lib.ts` ✓.
7. Ningún invisible literal en la tabla, el contrato ni las pruebas nuevas (script de `node` sobre 12 archivos) ✓.

### Observaciones (no bloquean)
- **O-01 (tester).** En A14, F2 siempre llega en el segundo envío, después de un error con mensaje en el mismo campo (así se mide a dónde va el foco). En el primer envío, F2 solo se prueba en A18, y solo con `"   "`. No hay un primer envío con `"\u{200B}"` ni la comparación del foco en el primer envío.
- **O-02 (tester).** A17 no hace fallar la consulta de la tarea dentro de la lista de entregas (`entregas-view.tsx:159`) ni dentro de la entrega de un alumno (`entrega-de-alumno-view.tsx:170`), y la primera carga del hilo solo se prueba del lado del alumno. Son líneas que cambiaron con la misma llamada que sí se prueba en otras vistas; la viñeta no las nombra aparte.
- **O-03 (tester).** La descarga se prueba llamando al callback, no por el camino real (`AdjuntosDePublicacion` → `pedirUrl` → `alFallarLaDescarga`) con las entradas de la tabla. Las pruebas de ENTREGAS-01e cubren ese cableado.
- **O-04 (tester).** En A19, el regreso es con "atrás". El camino de regresar con un enlace (por ejemplo, la tarea "Ensayo final" en "Trabajo de clase") no tiene caso. Por el mecanismo debería dar lo mismo, pero vale un ataque.
- **O-05 (tester o 03b).** `EXPRESION_DE_RUTA` de A20 solo reconoce expresiones de la forma `/^[…]+:\s*/`. Una copia escrita de otra forma (`/^[\w.]+:/`, sin `\s*`, o con grupo) no la detectaría. Cuando la regla se extienda en 03b y 03c, conviene reforzarla.
- **O-06 (cierre).** CH3-A24 no puede revisar su propio archivo (Vite lo excluye). Lo cubrí con mi script. Si en 03b la regla pasa a otro archivo, puede incluir `errores-de-api-estatico.test.ts`.
- **O-07 (tester).** Un hermano que el resumen no nombra: `TEXTOS_CALIFICAR.avisoRecargaFallida` en `entrega-de-alumno-view.tsx:123` y `:128`, el aviso de la recarga tras un conflicto al calificar. Es un texto fijo que no lee el mensaje del servidor, así que el remedio no aplica (mismo caso que `avisoDeRecargaFallidaAlEditar`). No devuelve el resumen: está fuera de la lista del paso 9 y no es una corrección.
- **O-08 (redacción).** Son 10 archivos de "Cambios por capa" más C-1, igual a 11 en `git diff --stat`. El resumen dice bien la cifra; la frase del encargo daría 12. Además, el resumen dice que los cambios temporales que comprobaron que las pruebas detectan el defecto (57 de 71 y 6 de 20) se revirtieron. No lo pude reproducir sin editar código, así que queda como declaración del programador. El estado final que verifiqué es el del diff de arriba.

## Revisión de la Enmienda 2 — CHORE-03
Fecha: 2026-10-26. Modo 1 (plan). Plan revisado: `plan.md` SHA-256 `a348b2def56361bd8da689514918237339c555fb5814999ae62b266ef4db4f3e` (714 líneas), contra la copia previa `copias-plan/plan-chore03-antes-enmienda2-63f6eef5.md` (SHA-256 `63f6eef558e3bd3998d351046e6461d93ca9963c4c4f878452192912322aedf2`). Los dos hashes los calculé yo y coinciden con `aprobacion.md`.

Veredicto: **APROBADO CON OBSERVACIONES**. La ronda 2 de 03a (pasos 10 a 14) puede arrancar en cuanto el humano responda DH-6. M-04 y M-05 no bloquean 03a, pero se resuelven antes de lanzar 03b: el arquitecto corrige M-04 con una enmienda breve y el humano decide DH-7 (M-05) junto con DH-5 y DH-6.

Verificación propia: no corrí `lint`, `test` ni `build`, porque es una revisión de plan y el código no cambió con la enmienda. Lo comprobé con `git status`: es la misma lista que en la ronda 1, y `git diff --stat ad10844` sobre `adjuntos-de-publicacion.tsx`, `shared/` y `backend/` sale vacío. Las cifras de la ronda 1 son las del tester: `Tests  9 failed | 3509 passed (3518)`. Probé el remedio de T-01 con un script de `node` en el scratchpad (`remedio-t01.mjs`). Usé las dos expresiones literales del plan sobre 28 entradas: todas las de S-05, CH3-A01, CAL-T-121 y la tabla dan lo que dice el plan.

### Cotejo mecánico
`git diff --no-index -U0 <copia> plan.md`: **26 hunks**. Todos llevan la marca "Enmienda 2" o están dentro de la sección nueva. Solo dos líneas se reemplazan sin conservar el texto anterior, y las dos están declaradas: el estado (`LISTO` → `BLOQUEADO`) y el cuerpo de `quitarRutaDelMensaje` en §D-1. El resto son inserciones. Lo comprobé con `--word-diff`: los únicos fragmentos "borrados" son cinco signos de cierre que se vuelven a escribir detrás del texto añadido (`vez,`, `N-36)`, `blanco)`, `(03a);`, `` `VALIDACION`),``).

| # | Líneas (antes → después) | Sección | Contenido |
|---|---|---|---|
| 1 | -2 → +2,2 | Encabezado | Estado BLOQUEADO solo por DH-6 |
| 2 | +71-75 | Preguntas bloqueantes | DH-6; DH-5 no bloquea |
| 3 | +92 | Suposiciones, S-05 | La regla del nombre repetido |
| 4 | -98 → +105 | Alcance, punto 1 | Inserción "(Enmienda 2: …)" |
| 5 | -138 → +145-154 | §D-1, código | `CAMPO_QUE_REPITE_EL_ESQUEMA` y la forma nueva de `quitarRutaDelMensaje` |
| 6 | +188-207 | §D-1 | Inventario "Rutas dobles del servidor" |
| 7 | -179 → +215-217 | §D-2 | Nota en "Debe ser 0: 10" y dos filas nuevas |
| 8 | +262-269 | §D-3 | `CON_CAMPO_REPETIDO` |
| 9 | -240 → +286 | §D-4, fila de `mensajeDeErrorTareas` | Texto añadido al final |
| 10 | +300-307 | §D-4 | La guarda de `VistaDeFicha` y sus hermanos |
| 11 | +355-356 | §D-6 | "En vuelo a la vez" nombra la ref |
| 12 | +388-394 | §D-R0 | Inventario de la Enmienda 2 y lista cerrada vacía |
| 13 | +414 | Cambios por capa, frontend 03a | Ronda 2 |
| 14 | -377 → +441 | Pruebas requeridas, CH3-A01 | Texto añadido al final |
| 15 | -386 → +450 | CH3-A08 | Texto añadido al final |
| 16 | +477-478 | 03a | CH3-A25 y CH3-A26 |
| 17 | -416 → +482 | CH3-B01 (03b) | Texto añadido al final |
| 18 | -427 → +493 | CH3-B08 (03b) | Texto añadido al final |
| 19 | +533-534 | Puntos de ataque | T-01 y T-02 |
| 20 | +543-544 | Riesgos | R-07 y R-08 |
| 21 | +556-557 | PARADAS | PA-9 y PA-10 |
| 22 | -499 → +571 | No se toca | Excepción de DH-6 (inserción) |
| 23 | -505 → +577 | Documentos a actualizar | Texto de `quitarRutaDelMensaje` (inserción) |
| 24 | +596-597 | Autorizaciones | A-6 y la nota de A-1 |
| 25 | +612-618 | Pasos de implementación | 03a, pasos 10 a 14 |
| 26 | +662-714 | Sección nueva | "## Enmienda 2 (ronda 1 del tester en 03a)" |

Nada de la Enmienda 1 ni del contrato aprobado cambia fuera de lo que la enmienda declara en "Cambios por sección". S-01 a S-04, S-06 a S-13, el orden de §D-1 y las subentregas quedan intactos.

### Inventario propio de rutas dobles
Busqué en `shared/src` (literales, plantillas como `idDeRuta` y `error:`/`message:` de `refine` y `union`), en `backend/src/handlers/validacion.ts`, en todo `backend/src` (los `AppError("VALIDACION"` y los `z.*("campo: …")` locales) y en los mensajes por defecto de zod 4 (`locales/en`: todos empiezan con mayúscula).

| Subentrega | Del arquitecto | Mío | Diferencia |
|---|---|---|---|
| 03a | `archivoId` (`archivoIdParamSchema`, `idDeRuta` ×2) y `confirmar` (`borrarTareaQuerySchema`); `tareaId`, `alumnoId` y `claseId` con su texto fijo | Igual. Además, el calificar de `handlers/calificaciones.ts:60` (`alumnoDeEntregaParamSchema`) da `tareaId`/`alumnoId` dobles, que también caen en su texto fijo (CH3-A08 ya incluye `mensajeDelAvisoDeCalificar`) | Ninguna |
| 03b | `publicacionId`, `comentarioId`, `maestroId`, `temaId`, `alumnoId`, `archivoId` (muro), `claseId`; `temaIds.<i>: temaId:`, `maestroIds.<i>: maestroId:`, `categorias.<i>.id: categoriaId:`; `tema: tema:` (consulta) | Igual, línea por línea (`clases.ts:160/173/177/183/377/387/424/493/497/501`, `tareas.ts:60/71/76/83/117/223/233/269`) | Ninguna |
| 03c | Ninguna | **`id: id: debe ser un identificador válido`**, del esquema local `parametrosIdSchema` de `backend/src/handlers/admin.ts:60`. Lo usan cuatro rutas de `:id`: restablecer la contraseña de una cuenta (`:112`), corregir su correo (`:137`), revocar un enlace (`:179`) y los registrados de un enlace (`:196`, consulta) | **Falta una fila (M-04)** |

Los mensajes de un solo prefijo tampoco cambian con la regla (lo comprobé): `cuerpo: debe ser un objeto JSON`, `claseId: …` de `middleware/pertenencia.ts:32`, los cinco `cursor: no es válido`, `${campo}: no es válido` de `adapters/db/calificaciones.ts:82`, `calificacion: Escribe…` y `puntajes.<i>.puntos: Escribe…` de `core/calificaciones/calificar.ts`, los `categorias: …` de `core/tareas/categorias.ts` y `Los datos enviados tienen caracteres no permitidos.` de `adapters/db/errores.ts:54`. En todos, lo que sigue a la ruta empieza con mayúscula, o la primera palabra no va pegada a dos puntos. En `shared/src/entregas.ts:28`, `"http:"` y `"https:"` son comparaciones de protocolo, no mensajes.

### T-01, remedio (c): de acuerdo
- **Se cumple la regla.** Se quita la ruta una vez y, solo si había ruta, un nombre en camelCase ASCII que la siga, una vez. Son como máximo dos prefijos. `RUTA_DEL_MENSAJE` queda literal (lo leen `lib/errores-ch3-r1.ataque` y CH3-A20) y `campoDeErrorDeApi` no cambia. Con el script se cumplen todas las salidas del plan: "x: Nota: algo" → "Nota: algo", "Debe ser 0: 10", "14:30 no es válido", "Valor: 10", 'Unrecognized key: "nota"', "a: b: c: d" → "c: d", "Calificación de 0 a 10: …" intacto, y "campoFueraDeContrato: campoFueraDeContrato:\u{200B}" → "\u{200B}" → genérico (`\s` no casa con U+200B, así que el genérico lo da `textoVisibleOGenerico`).
- **El riesgo no se alcanza hoy.** El riesgo es un texto para la persona que, tras la ruta, empiece con "palabra:" en minúscula. En todo lo que emite `VALIDACION` (lista de arriba) no aparece, salvo los nombres de campo. El caso extremo, "x: http://…" → "//…", tampoco se alcanza desde el servidor. R-08 lo deja bien amarrado: CH3-A25 contrasta las filas con los esquemas reales y PA-10 detiene al programador si una no coincide.
- **Interacción con S-05.** "Calificación de 0 a 10: …" no se recorta (empieza con espacio antes de los dos puntos), "x: Nota: algo" da "Nota: algo" (mayúscula) y "Debe ser 0: 10" sin ruta queda intacto. "Valor: 10" sin ruta da "10", pero eso ya era así con S-05 aprobado (un solo prefijo) y ninguna prueba lo fija sin ruta: CAL-T-121 lo usa con "puntajes.1.criterioId:" delante.
- **Las pruebas rojas quedan satisfechas.** Los seis casos de T-01 (`lib/errores-ch3-r1:215`, `tareas/errores-ch3-r1:177`, `tareas/formularios-ch3-r1:837` ×3 y `:939`) exigen que la salida no empiece con `/^[\p{L}(\p{M})\p{N}_.-]+:/u`. Con (c) dan "debe ser un identificador válido" y "no es válido" (`archivoId` y `confirmar` no están en `textosPorCampo` de `tareas`).
- **Ninguna prueba existente fija "una sola vez" contra el remedio.** Grep propio sobre todos los `*.test.ts(x)` de `frontend/src` (literales y plantillas con "ruta: minúscula: "): solo aparecen los casos de T-01. Revisé a mano CAL-T-119 a CAL-T-122 (`aviso-calificar-01c-r3.ataque.test.tsx:260-325`), CH3-A03, A04, A06, A07, A08 a A12, y en `lib/errores-ch3-r1` el recorrido "ninguna salida … empieza con la ruta que traía" (`:119-142`). Las tres entradas nuevas de `CON_CAMPO_REPETIDO` pasan todos esos recorridos. El de `:138-140` falla hoy con ellas y pasa con el remedio, así que la tabla nueva también amarra la regla. La rotación por tercios de `formularios-ch3-r1:605-617` sigue cubriendo cada entrada al menos dos veces (los índices mod 3 de los siete formularios son 0,1,2,0,1,2,0). Ninguna prueba fija el tamaño exacto de la tabla. **Lista cerrada vacía: de acuerdo.**
- **CH3-A25 se puede hacer.** Los 23 esquemas que nombra se exportan por nombre en `shared/src/index.ts` (comprobado uno por uno). PA-10 cubre el caso en que zod 4 dé otra primera incidencia (unión discriminada, `superRefine`).

### T-02, remedio (a) con DH-6: de acuerdo
- **La forma de §D-4 es correcta.** `descargar` nunca lanza (tiene `catch` propio), así que `try { await onDescargar() } finally { ref = false }` no deja rechazos sin manejar. Si lanzaran `alFallarLaDescarga` o `mensajeDeError`, sería igual que hoy con `void descargar(...)`. La ref es por ficha (`key={adjunto.id}`), así que dos adjuntos distintos siguen siendo independientes. Con la guarda solo hay una llamada en vuelo, y `isPending` deja de salir de la espera antes de tiempo (la segunda mitad de T-02).
- **Las tres pruebas rojas quedan satisfechas** (`formularios-ch3-r1:851-871`). Los dos `fireEvent.click` seguidos dan una sola petición, y al soltarla hay un solo aviso `MENSAJE_DE_PRUEBA`.
- **Se conserva lo que exigen las estáticas del archivo.** `styles/clases-r1.ataque:213` pide un `enEspera=`, y sigue uno. `entregas-01e-r2.ataque:531-560` pide la firma `alFallarLaDescarga?: (error: unknown) => void`, los cuatro ganchos de `hooks.ts`, y que no haya `disabled`, `?? []`, `fetch(` ni importaciones de `features/`. `entregas-01d-r1.ataque:870` y `refactor-01c-r1.ataque:392-453` piden que no haya `?? []`, `disabled`, `console.`, `fetch(` ni `target=_blank`, y que `AdjuntosDePublicacion` esté definido en sus dos lugares. `useRef` y un manejador `async` no chocan con ninguna. Las pruebas que descargan varias veces (`refactor-01c-r1:322-334`, `adjuntos-de-publicacion.test.tsx`, `archivos-d-r*`) esperan el aviso antes del clic siguiente. El `finally` se ejecuta en microtareas justo después del aviso, antes de que `waitFor` resuelva, así que no deberían romper. Si alguna rompe, es PA-1, no un ajuste de tiempos.
- **Hermanos en lo que 03a toca: confirmados.** En `features/tareas/` y `components/adjuntos/`, todo `enEspera=` de una mutación tiene su ref: `borrandoRef`, `anulandoRef`, `entregandoRef`, `guardandoRef`, `enviandoRef` ×2 y `pidiendoMasRef` ×2. `lista-de-adjuntos-elegidos.tsx` no lanza mutaciones. «Descargar» es el único que no la tiene.
- **Es razonable que entre en 03a.** Las tres rojas son correctas según `CLAUDE.md` › Componentes (M-01 de TAREAS-01e), y nadie puede tocarlas ni saltarlas. Diferir el remedio deja 03a sin cerrar, o pide que el tester retire sus pruebas, que es peor. El cambio es pequeño (una ref en un componente) y lo cubre la suite completa.

### Problemas que no bloquean 03a (se resuelven antes de lanzar 03b)

#### M-04 — Falta en el inventario la ruta doble `id: id:` del administrador (03c)
Dónde: §D-1, "Rutas dobles del servidor" (la fila de 03c y la frase "`features/admin` y `features/auth` (03c) no llaman a ninguna de esas rutas"); §D-R0; la razón de S-05 ("todo mensaje … que empieza con «palabra:» es un nombre de campo"); R-08 ("convención de `shared/`").
Por qué importa: el inventario se presenta como completo, y DH-5 se decide sobre él. `backend/src/handlers/admin.ts:60` define `parametrosIdSchema = z.object({ id: z.uuid("id: debe ser un identificador válido") })`, fuera de `shared/`, y la API responde "id: id: debe ser un identificador válido" en restablecer la contraseña, corregir el correo, revocar un enlace y los registrados de un enlace. La regla (c) sí lo cubre ("id" casa con `^[a-z][A-Za-z0-9]*:`), así que el remedio no cambia. Lo que falta es la fila, su caso en 03c y la mención en R-08: CH3-A25 no puede importar un esquema del backend y no lo vería.
Qué se espera: la fila de 03c en el inventario (esquema local de `handlers/admin.ts`, las cuatro rutas, la salida "debe ser un identificador válido" en las acciones de `admin` y el respaldo en la consulta de registrados), un caso en las pruebas de 03c (CH3-C01 o la que corresponda) con ese mensaje literal en `mensajeDeErrorAdmin` y en su variante de consulta, y R-08 que diga que la convención también aparece en un esquema local del backend.

#### M-05 — "Sin ref" en 03b y 03c: el plan crea una clase de hallazgos sin decidir qué pasa con ellos
Dónde: §D-6 (Enmienda 2: "desde la ronda 2 de 03a, cada fila … dice «sin ref» como hallazgo"); §D-4 ("Fuera de 03a no se audita"); Puntos de ataque.
Por qué importa: es el mismo dilema de T-02, multiplicado. Por grep (componentes con `.mutate(`/`.mutateAsync(` y sin `if (…Ref.current)`), en lo que recorren 03b y 03c hay **18 componentes** cuya guarda es `isPending` o ninguna. Esa es la forma que `CLAUDE.md` › Componentes declaró insuficiente ("`enEspera` llega un render tarde"). En `features/clases`: `formulario-comentario`, `formulario-clase`, `codigo-de-clase` (regenerar), `formulario-unirse-clase`, `buscador-alumnos` y `buscador-de-maestros`. En `features/admin`: `formulario-corregir-correo`, `formulario-generar-enlace`, `formulario-invitacion-masiva`, `formulario-invitar-maestro` y `buscador-de-cuenta`. En `features/auth`: `formulario-login`, `formulario-registro`, `formulario-registro-maestro`, `formulario-recuperar`, `formulario-nueva-contrasena`, `formulario-cambiar-contrasena` y `acceso-restringido-view`. Todos están en "No se toca" de 03b y 03c. La matriz los marcará "sin ref" y el tester puede escribir pruebas rojas de doble clic. Con las rojas intocables, cada subentrega quedaría sin cerrar hasta otra enmienda y otra autorización.
Qué se espera: que el plan decida ahora, con el humano (DH-7), una de dos opciones. (a) El remedio de la ref entra en el chore para los controles que el arquitecto inventaríe por subentrega: sale de "No se toca", con casos `CH3-B`/`CH3-C` y la lista cerrada de pruebas que cambian. (b) Queda fuera: en "Puntos de ataque" de 03b y 03c va como "decisión tomada que no es hallazgo", con su destino (un encargo propio o el `chore` de foco y navegación), y el tester la anota como observación sin prueba roja. En los dos casos, §D-6 dice qué hace el programador con un "sin ref".

### Detalles menores
- **A-1 y "Documentos a actualizar" (hunk 23).** El texto literal para `CLAUDE.md` queda con una instrucción dentro de la cita ("…; Enmienda 2: el texto pasa a "(la ruta, una vez, …)"…"). Quien lo aplique al cerrar 03c podría pegarlo tal cual. Conviene que el arquitecto deje la viñeta final completa, con el texto nuevo ya sustituido, en la enmienda de M-04.
- **"Preguntas bloqueantes"** sigue empezando con "Ninguna." (línea 69), y justo debajo está DH-6. Basta con marcar esa línea como de la Enmienda 1.
- **R-07.** El resto de una ruta doble queda en minúscula y no dice qué hacer ("debe ser un identificador válido", "no es válido"). Es aceptable porque solo se llega con una URL o un cuerpo manipulados, y el humano lo acepta con DH-5.

### Reglas de `AGENTS.md` para planes
- Ids con prefijo: CH3-A25 y CH3-A26 ✓. `it.each` por módulo (indicación del humano del 2026-10-26): CH3-A25 recorre el inventario y CH3-A26 recorre las fichas y las formas de avisar ✓.
- Frases de recuperación: no cambia ningún texto. "Inténtalo de nuevo" de la descarga tiene su camino "repetir el control" en CH3-A26 (b) ✓.
- `VALIDACION` fuera de contrato: la tabla común gana `CON_CAMPO_REPETIDO` (ruta doble con mensaje, con ruta de tres niveles y sin texto visible), así que todas las pruebas de las tres subentregas que la recorren pasan también por la ruta doble ✓. CH3-A26 usa solo F4 en la descarga. Basta, porque F1, F3 y F4 por el camino real ya los cubre O-03 del tester (en verde) y CH3-B08.
- Lista cerrada de pruebas por grep: la hizo el arquitecto y la repetí. Sale vacía y coincide ✓.
- Carril: sigue normal. `adjuntos-de-publicacion.tsx` no es sensible. Cruza de dominio (el muro de `features/clases` hereda la guarda en 03a), y eso queda cubierto por la autorización de DH-6.

### Opinión sobre DH-5 y DH-6
- **DH-5: sí.** (c) es la única opción que cubre las tres subentregas con una sola regla, sin textos nuevos ni otra enmienda en 03b. La regla queda amarrada a los esquemas reales (CH3-A25 y PA-10). Con M-04, también al esquema local del administrador. Al aprobar DH-5, el humano acepta además dos cosas: que el texto visible de esos casos sea un fragmento en minúscula (R-07), y que cambie el texto de A-1 para `CLAUDE.md` (la descripción de `quitarRutaDelMensaje`). Conviene decírselo de forma explícita. La causa (que `shared/` y `handlers/admin.ts` no repitan el campo en su mensaje) queda para un encargo que toque el backend (R-08). Lo recomiendo, sin urgencia.
- **DH-6: sí.** Es el remedio mínimo de un defecto real de `CLAUDE.md`, en un solo componente. Sin él, 03a no cierra en verde. El humano debe saber que el cambio también toca el muro de `features/clases` desde 03a (el envoltorio reexporta el componente). Lo cubren la suite completa en la ronda 2 y CH3-B08 en 03b.
- **Falta una decisión: DH-7 (de M-05).** Qué pasa con la falta de guarda con ref en los 18 controles de 03b y 03c que el chore no toca: entra en el chore (a) o queda fuera con destino y sin pruebas rojas (b). Mi recomendación es (b). El chore es de traducción de errores, y meter 18 componentes de tres módulos lo convierte en otro encargo. Si el humano elige (b), el destino natural es un `chore` propio, en carril normal, con su inventario y una regla estática que lo fije en todo `src/`.

### Lista cerrada para el humano
1. **DH-6 (bloquea la ronda 2 de 03a):** ¿autorizas sacar `frontend/src/components/adjuntos/adjuntos-de-publicacion.tsx` de "No se toca" en 03a, solo para la guarda con ref de «Descargar» (`VistaDeFicha`) y su prueba CH3-A26? El muro de `features/clases` también recibe la guarda. Recomendación del arquitecto y mía: sí.
2. **DH-5 (no bloquea; sin veto se aplica):** ¿aceptas que el contrato quite, además de la ruta, el nombre de campo en camelCase que el esquema repite detrás (máximo dos prefijos)? Eso incluye que esos casos muestren "debe ser un identificador válido" o "no es válido" en minúscula, y que cambie el texto de A-1 para `CLAUDE.md`. Recomendación: sí.
3. **DH-7 (nueva; se decide antes de lanzar 03b):** la guarda con ref en los 18 controles de 03b y 03c que solo usan `isPending`: (a) entra en CHORE-03, con inventario y salida de "No se toca"; o (b) queda fuera, como decisión que no es hallazgo, con destino en un `chore` propio y sin pruebas rojas del tester. Recomendación: (b).

Lo que no necesita al humano: M-04 (la fila `id: id:` del administrador, su caso en 03c y R-08) y los dos detalles de redacción los corrige el arquitecto en una enmienda breve antes de 03b. Esa enmienda la reviso con el mismo cotejo.

## Revisión de la Enmienda 3 — CHORE-03
Fecha: 2026-10-26. Modo 1 (plan). Plan revisado: `plan.md`, SHA-256 `ee08bf2a186e41abdd764f04c340576d954f8eb5e4dedfa769eb23ea127aad14` (791 líneas), contra la copia previa `copias-plan/plan-chore03-antes-enmienda3-a348b2de.md` (SHA-256 `a348b2def56361bd8da689514918237339c555fb5814999ae62b266ef4db4f3e`). Reproduje los dos hashes con `sha256sum`.

Veredicto: **APROBADO CON OBSERVACIONES**. M-04 y M-05 quedan resueltos y no cambia nada de 03a. 03b puede arrancar cuando cierre 03a. Solo queda una observación para el humano, S-14, que puede vetar. Nada bloquea.

Verificación propia: no corrí `lint`, `test` ni `build`. Es una revisión de plan, y el programador corre en paralelo la ronda 2 de 03a: nunca dos suites a la vez. Lo que el plan afirma sobre el código lo comprobé con grep y lectura.

### Cotejo mecánico
`git diff --no-index -U0 <copia> plan.md` da **18 hunks**. Las líneas 2 y 3 del hunk 1 son del orquestador: el estado pasa de `BLOQUEADO` a `LISTO` y se añade la nota de DH-6, con el hash intermedio `a9014e2f…` declarado en `aprobacion.md`. Todo lo demás lleva "Enmienda 3" o está en la sección nueva, y coincide con la lista "Cambios por sección (Enmienda 3)" del arquitecto: no falta ningún hunk declarado ni sobra uno sin declarar.

| # | Líneas (antes → después) | Sección | Contenido |
|---|---|---|---|
| 1 | -2,2 → +2,3 | Encabezado | Líneas 2 y 3: orquestador. Línea 4: nota de la Enmienda 3 |
| 2 | -69 → +70-72 | Preguntas bloqueantes | "No queda ninguna abierta"; "Ninguna" queda como historial |
| 3 | -74 → +77 | Preguntas bloqueantes | DH-5 y DH-7 respondidas (añadido al final) |
| 4 | -92 → +95 | Suposiciones, S-05 | Frase de M-04 al final; la regla no cambia |
| 5 | +105 | Suposiciones | S-14, nueva |
| 6 | +209 | §D-1, "Rutas dobles del servidor" | Fila `id: id:` (03c) |
| 7 | -206 → +211 | §D-1, mismo inventario | Frase de 03c, tachada y corregida |
| 8 | +362-363 | §D-6 | Qué hace el programador con un "sin ref" (M-05) |
| 9 | +402-403 | §D-R0 | Inventario de CH3-C08 y lista cerrada vacía |
| 10 | +532-534 | Pruebas requeridas › 03c | CH3-C08 |
| 11 | +547-578 | Puntos de ataque | Viñetas de M-04 y M-05, y la "Lista para CHORE-04" (23 filas) |
| 12 | -544 → +588 | Riesgos, R-08 | Frase de M-04 al final |
| 13 | -577 → +621-623 | Documentos a actualizar, A-1 | Texto final literal; la redacción anterior queda como historial |
| 14 | -587 → +633 | Documentos a actualizar, ESTADO | Registro de CHORE-04 (añadido al final) |
| 15 | -596,2 → +642,2 | Autorizaciones | A-6 autorizada y nota de A-1 (añadido al final) |
| 16 | -629 → +675 | Pasos, 03b paso 9 | Matriz con "sin ref; CHORE-04" (añadido al final) |
| 17 | -637,2 → +683,2 | Pasos, 03c pasos 5 y 6 | CH3-C08 y hermanos de M-04 (añadido al final) |
| 18 | +761-791 | Sección nueva | "## Enmienda 3 …" |

**03a no cambia.** No hay ningún hunk en estas partes del plan:
- §D-1 fuera del inventario, §D-2, §D-3 ni §D-4;
- "Cambios por capa", "Pruebas requeridas › 03a" (líneas 448-488), "PARADAS" ni "No se toca";
- los pasos 0 a 14 de 03a.

El único hunk que toca algo de 03a es el 4, en S-05, y solo añade una frase que dice que la regla no cambia.

### M-04: resuelto
- **La fila de §D-1 es correcta.** `backend/src/handlers/admin.ts:60` define `parametrosIdSchema = z.object({ id: z.uuid("id: debe ser un identificador válido") })`, y `validarParametros` lo usa en `:116`, `:138`, `:183` y `:200`. Esas llamadas corresponden a las cuatro rutas de la fila (`:112`/`:113`, `:137`, `:179` y `:196`), y el frontend las llama desde `features/admin/hooks.ts` (`:69`, `:84`, `:116` y `:139`).
- **Mi grep confirma que es el único esquema local así.** Busqué en todo `backend/src/` (sin pruebas ni `generated/`) las cadenas que empiezan con `"`, `'` o `` ` `` seguidas de `[a-z][A-Za-z0-9]*: `. Además de `parametrosIdSchema`, solo salen prefijos únicos que se lanzan con `AppError` directo, no a través de una ruta de zod:
  - los cinco `cursor: no es válido` de `adapters/db`;
  - los `categorias: …` de `core/tareas/categorias.ts`;
  - `calificacion: …` de `core/calificaciones/calificar.ts:135`;
  - `cuerpo: …` de `handlers/validacion.ts:9`;
  - `claseId: …` de `middleware/pertenencia.ts:32`.

  **`parametrosIdSchema` es el único esquema local que repite su campo en el mensaje.** Coincide con el arquitecto.
- **CH3-C08 cubre lo necesario.** En lo unitario, prueba `mensajeDeErrorAdmin` y `mensajeDeConsultaAdmin` con la tabla de restos. En la interfaz, un `it.each` recorre las cuatro rutas y comprueba un solo `MensajeError`, ningún toast, el botón fuera de la espera y el correo conservado. Es coherente con CH3-C04 y CH3-C05. La aserción "no contiene `id:`" no da falsos rojos: ningún texto visible de `features/admin` contiene esa subcadena (lo comprobé con grep).
- **§D-R0:** la lista cerrada vacía coincide con mi grep. El único `VALIDACION` en las pruebas de `features/admin` es `cuentas-r1.ataque:474-475` ("nombre: …", C-4).
- **R-08** reconoce que ninguna prueba contrasta este literal con el backend y pide incluir el esquema en el encargo que quite la causa. Basta.

### M-05 con DH-7 = (b): resuelto
- **Programador y tester saben qué hacer.**
  - Programador (§D-6): declara el control "sin ref; fuera del chore, CHORE-04", lo nombra como hermano con ese destino y no lo corrige. Si encuentra uno que no está en la lista, lo marca "nuevo, para la lista de CHORE-04".
  - Tester ("Puntos de ataque"): lo anota como observación, sin prueba roja. Sí es hallazgo que un control con ref la pierda, o que la descarga del muro mande dos peticiones.

  Es coherente con DH-7, y los pasos 9 de 03b y 6 de 03c lo llevan a la matriz.
- **La matización de los cuatro archivos es coherente.** Las líneas de consulta que nombra la lista son `mensajeDeErrorClases(…)` dentro de un `MensajeError`, y §D-4 las migra: `buscador-alumnos.tsx:131`, `buscador-de-maestros.tsx:199`, `maestros-de-clase-view.tsx:42` y `tabla-alumnos.tsx:185`.
  - "Cambios por capa" › 03b las limita a "solo la llamada y su importación", y "No se toca" cubre todo lo demás. Agregar la ref sería salir de esa línea.
  - La cita a PA-3 es razonable: si el programador creyera que tiene que agregarla, sería una parada. Con §D-6 no tiene nada que resolver, porque lo declara y sigue.
  - El tester tampoco escribe una prueba roja que obligue a tocar el archivo.

### S-14: mi grep da 23, igual que el arquitecto
Busqué todo `.mutate(` y `.mutateAsync(` de `frontend/src/` fuera de `*.test.ts(x)`: hay **46 llamadas**. Aparte hay dos indirectas: `descarga.mutateAsync`, que se pasa a `descargar` en `components/adjuntos/adjuntos-de-publicacion.tsx:101` y `:129` (DH-6, en 03a). No hay `mutate` desestructurados ni otros `useMutation` fuera de los `hooks.ts` de los módulos y de `components/adjuntos/hooks.ts`. En cada llamada revisé si su manejador, o el que la envuelve, tiene un `if (…Ref.current) return`:
- **Con guarda (21 llamadas):**
  - `admin`: `ficha-de-cuenta:58` y `tabla-enlaces:75` (`enviandoRef`).
  - `clases`: `editor-de-categorias:137` (`guardandoRef`), `formulario-publicacion:129,139` (`publicandoRef`), `formulario-tema:78,81` (`enviandoRef`), `mover-elemento:45` (`moviendoRef`), `seccion-de-tema:194` (`borrandoRef`) y `trabajo-view:154` (`ordenandoRef`).
  - `tareas`: `acciones-de-la-tarea:70` (`borrandoRef`), `entrega-realizada:69` (`anulandoRef`), `formulario-de-entrega:122,131` (`entregandoRef`), `formulario-tarea:212` (`guardandoRef`), `hilo-privado:51` (`enviandoRef`, en `handleSubmit:64`) y `panel-de-calificacion:103` (`enviandoRef`, `:124`).
  - `crear-tarea-view:21` y `editar-tarea-view:86` se llaman desde `onGuardar`, dentro del `guardandoRef` de `formulario-tarea` (`:205-221`).
- **Sin guarda (25 llamadas en 23 filas):** exactamente las 23 filas de la "Lista para CHORE-04", con las mismas líneas. Las filas 2 y 17 tienen dos llamadas cada una.

La lista es **completa y correcta**: no sobra ni falta nada. En la revisión de la Enmienda 2 conté 18 por dos errores míos: tomé por guardas las refs de foco (`confirmandoAnteriorRef`, `filaDelBuscadorRef`, `filaEnFocoRef`) de `comentarios-de-publicacion`, `publicacion-del-muro`, `tabla-alumnos` y `maestros-de-clase-view`, y no busqué en `src/app/`. Las cinco que suma el arquitecto son de la misma clase. Por eso S-14 (DH-7 aplica a toda la clase) es la lectura correcta.

### `docs/ESTADO.md` §2b
Reproduje los dos hashes:
- del archivo: `29f1eeea11516659190ed56715f90635fd4285d70fbadb5a431ccee568d79d07`;
- de §2b, con el `awk` indicado: `6ecbc3660ab08eb02cea98b5723292b17cf0a6ec4086e5c84e5993d50d1c96bb`.

Comparé las dos listas con un `diff` de los pares `archivo:línea`: las 23 filas de ESTADO coinciden con las del plan, en el mismo orden. La entrada recoge DH-7, S-14, el trato en 03b y 03c, y la recomendación de carril. El humano pidió el registro en DH-7, y `aprobacion.md` anota el hash nuevo de §2b, como pide `AGENTS.md` cuando cambia con autorización un archivo de "No se toca".

### Detalles menores (no bloquean ni piden otra enmienda)
- **A-1:** el texto final para `CLAUDE.md` es completo y literal, ya con DH-5 ("la ruta, una vez, y el nombre de campo en camelCase que el esquema repite detrás; solo en `VALIDACION`"), y la cita ya no lleva instrucciones dentro. La redacción anterior queda marcada "no se aplica". ✓
- **Preguntas bloqueantes:** abre con "no queda ninguna abierta", y "Ninguna" queda como historial del plan original y de la Enmienda 1. ✓
- **§2b de ESTADO frente a "No se toca".** Hay dos desfases, y ninguno pide enmendar el plan:
  - "No se toca" sigue diciendo que §2b se verifica "tal como quedó tras la parte A", pero desde ahora el hash de referencia de §2b es `6ecbc366…` (`aprobacion.md`, línea 113).
  - "Documentos a actualizar" pone el registro de CHORE-04 en la viñeta de §3, y el orquestador lo escribió en §2b ("Encargos decididos, por empezar"), que es el lugar correcto para un encargo pendiente.

  Basta con usar el hash nuevo al verificar "No se toca" cuando cierren 03b y 03c.
- **§D-6, frase de la Enmienda 2** ("o dice «sin ref» como hallazgo"): queda solo para 03a, porque el párrafo de la Enmienda 3 la sustituye en 03b y 03c. No lleva la marca "solo 03a", pero el orden de los párrafos se lee bien.
- **S-14, última frase** ("si el humano quiere tratar distinto a los cuatro nuevos, se enmienda solo esa lista"): se queda corta. Corregir en 03b los cuatro de `features/clases` también cambiaría "Cambios por capa", "No se toca", las pruebas requeridas y "Puntos de ataque". Solo importa si el humano veta S-14.

### Lista cerrada para el humano
1. **S-14 (vetable; sin veto, se aplica).** DH-7 se decidió para 18 controles, pero en la misma situación hay 23. Los cinco nuevos:
   - quitar un maestro (`clases/maestros-de-clase-view.tsx:67`);
   - borrar un comentario (`clases/components/comentarios-de-publicacion.tsx:74`);
   - borrar una publicación del muro (`clases/components/publicacion-del-muro.tsx:118`);
   - quitar un alumno (`clases/components/tabla-alumnos.tsx:59`);
   - cerrar sesión desde el marco (`app/require-rol.tsx:46`).

   ¿Quedan también fuera de CHORE-03, con destino CHORE-04 y sin pruebas rojas del tester? Mi opinión: **sí**. Son de la misma clase que los 18 y su riesgo es del mismo orden: dos borrados, dos bajas y un cierre de sesión, todos ya protegidos por `isPending`. Corregirlos en 03b ampliaría el alcance del chore a cuatro archivos que hoy solo cambian en una línea. Si el humano los quiere dentro, hace falta una enmienda de 03b, no solo de la lista.

Nada más necesita al humano. El orquestador puede lanzar 03b con este plan cuando cierre 03a.

## Verificación del resumen — 03a — ronda 2
Resumen: `resumen-programador-03a-r2.md` (corrección de T-01 y T-02). Plan `plan.md` `ee08bf2a…` (Enmiendas 2 y 3; el resumen cita `a9014e2f…`, el estado anterior a la Enmienda 3, que no cambió nada de 03a: ver O-09). Corridas propias desde `frontend/`, una suite a la vez, tras comprobar con `Get-CimInstance` que no había ningún `node` con `vitest` (solo un proceso ajeno de otra herramienta, que no toqué). Salidas en el scratchpad de la sesión: `m-r2-lint.txt`, `m-r2-test.txt`, `m-r2-build.txt` y `m-r2-ataques.txt`.

**Veredicto: RESUMEN ACEPTADO (el tester puede atacar la ronda 2).** Sin `M-xx`.

### Cifras: resumen contra corrida propia
| Qué | Resumen | Corrida propia |
|---|---|---|
| `npm run lint` | exit 0; `All matched files use Prettier code style!` y luego `> tsc -b` | exit 0; las mismas dos líneas |
| `npm run test` | `Test Files  209 passed (209)` · `Tests  3550 passed (3550)` | `Test Files  209 passed (209)` · `Tests  3550 passed (3550)` (04:49:13Z a 04:52:38Z) |
| `Test timed out` | 0 | 0 |
| `npm run build` | exit 0, `✓ built in 1.44s`, aviso del chunk > 500 kB | exit 0, `✓ built in 1.62s`, el mismo aviso |
| `npx vitest list src/lib/errores-de-api.test.ts`, contando " > " | 31 | 31 |
| ídem `src/features/tareas/errores-ch3.test.ts` | 5 | 5 |
| ídem `src/components/adjuntos/descarga-ch3.test.tsx` | 8 | 8 |
| Delta | +1 archivo, +32 casos (24 + 8) | 208 → 209 y 3518 → 3550: coincide |

Además corrí solo las 4 `*.ataque` de la ronda 1 con `--reporter=verbose`: `Test Files  4 passed (4)` · `Tests  92 passed (92)`. Las 6 de T-01 y las 3 de T-02 aparecen con `✓` y su título exacto.

### V-01
El comando de V-01 contra las filas de "Tabla de SHA-256 de las 208 `*.ataque` al cierre de la ronda 1 de CHORE-03 03a" de `reporte-tester.md`, en minúsculas: base 208, actual 208, `diff` vacío, `IGUALES`. **208 de 208.** Las 4 del tester de la ronda 1 siguen intactas: `lib/errores-ch3-r1` `72b19b6a…`, `features/tareas/errores-ch3-r1` `4e6950f0…`, `features/tareas/formularios-ch3-r1` `e6624376…` y `components/adjuntos/errores-ch3-r1` `11c6d9c5…`. Ningún `.skip`, `.only`, `.todo` ni `.fails` en las 4 `*.ataque` de la ronda 1 ni en las 3 pruebas del programador de esta ronda.

### "No se toca"
- `git diff --stat ad10844 -- frontend shared backend infra CLAUDE.md AGENTS.md .claude README.md .env.example package.json package-lock.json`: **12 archivos**. Son los 11 de la ronda 1 (incluida la reescritura C-1 de `refactor-01c-r1.ataque`, autorizada en A-5) más `components/adjuntos/adjuntos-de-publicacion.tsx`, que DH-6 autoriza. Nada en `shared/`, `backend/`, `app/`, `services/`, ningún `hooks.ts`, ni `clases`, `calificaciones`, `admin` o `auth`.
- Archivos nuevos sin seguimiento en `frontend/`: **13**, que son la tabla, las 7 pruebas de la ronda 1, las 4 `*.ataque` del tester y `descarga-ch3.test.tsx`.
- Hashes: `PRD.md` `a10c5c23…`, `ARCHITECTURE.md` `75c3c75d…`, `ARCHITECTURE-ESSENTIALS.md` `7c05fd61…`, `DESIGN.md` `8d977dc4…` y `ESTADO.md` §2b `6ecbc366…` (con `awk`). Los cinco iguales.

### T-01: corregido como dice el plan
- `lib/errores-de-api.ts:64` `RUTA_DEL_MENSAJE` conserva el literal `/^[\p{L}\p{M}\p{N}_.-]+:\s*/u`; solo cambió su comentario, como pide el paso 10.
- `:69` `CAMPO_QUE_REPITE_EL_ESQUEMA = /^[a-z][A-Za-z0-9]*:\s*/` y `:72-76` `quitarRutaDelMensaje` coinciden carácter por carácter con el bloque de §D-1. Tienen la guarda `sinRuta === mensaje` (sin ruta no se quita el nombre) y quitan como máximo dos prefijos.
- `mensajeDeErrorDeApi` y `mensajeDeErrorDeConsulta` no cambian. Los códigos con mensaje del servidor siguen sin recortarse.
- `lib/errores-de-api-fuera-de-contrato.ts:92-108` `CON_CAMPO_REPETIDO` tiene las 3 entradas de §D-3 con las clases que ya existían. Va sumada después de `DOS_PUNTOS_DENTRO`, en `:124`. `ClaseFueraDeContrato` no cambia, y el invisible va como escape `\u{200B}` (mi script de categorías Unicode da 0 literales en los 6 archivos de la ronda).
- Las 6 rojas de T-01 pasan sin cambio (V-01).
- Nada se relajó. CH3-A01 conserva todas sus aserciones de la ronda 1 y suma las de la Enmienda 2.

### T-02: corregido como dice el plan, y solo eso
`git diff ad10844 -- frontend/src/components/adjuntos/adjuntos-de-publicacion.tsx` trae 4 hunks, todos de §D-4:
1. `useRef` en el import;
2. `onDescargar: () => Promise<void>`, más `descargandoRef` y `alPulsar`: `if (descargandoRef.current) return`, la asignación, y `try { await onDescargar() } finally { … = false }`;
3. el `<Button>` partido por Prettier, con `enEspera={pidiendo}` y `onClick={() => void alPulsar()}`;
4. las dos fichas pasan `descargar(...)` sin `void`.

`descargar`, `AdjuntosDePublicacionProps` (con `alFallarLaDescarga?: (error: unknown) => void` en `:143`), `hooks.ts` y los textos no cambian. `grep -c "enEspera="` da 1. No hay `disabled`, `?? []`, `fetch(`, `console.`, `@/features` ni `_blank`. Las 3 rojas de T-02 pasan sin cambio.

### Pruebas requeridas
- **CH3-A01 ampliada** (`lib/errores-de-api.test.ts:65`, título nuevo, el que el plan permite). Lleva el triple ciclo ruta × separador antes × separador después y todos los literales del plan: `archivoId`, `confirmar`, `temaIds.0`, `a: b: c: d` → `c: d`, `x: a.b: c`, `x: 14:30 y`, `x: Valor: 10` y `x: "nota": y`. Suma uno de más que es correcto: `" archivoId: archivoId: x"`, intacto.
- **CH3-A08 ampliada** (`features/tareas/errores-ch3.test.ts:40`, mismo título). Con `archivoId` y `confirmar` dobles da el resto, y lo comprueba también con `mensajeDelAvisoDeCalificar`. Los tres ids dobles dan su texto fijo en `mensajeDeErrorTareas`, `mensajeDeConsultaTareas` y `mensajeDelAvisoDeCalificar`, como pide el plan.
- **CH3-A25** (`lib/errores-de-api.test.ts:476`, `it.each` de **24 filas**): los 23 esquemas del plan, importados por nombre de `@campus/shared`. Cada fila:
  - comprueba `path` y `message` reales con `toEqual` y, si el esquema acepta el valor o no da incidencia, falla con el nombre del esquema (PA-10);
  - arma el mensaje como `validarCuerpo`/`validarParametros` y comprueba las 4 salidas, de acción y de consulta, sin `textosPorCampo` y con él;
  - comprueba que ninguna empiece con una ruta ni quede sin texto visible.

  La fila `id: id:` de admin no está, como pide la nota de la Enmienda 3.
- **CH3-A26** (`components/adjuntos/descarga-ch3.test.tsx`, 8 casos: `CASOS` = 2 fichas × 2 formas, en dos `it.each`). Cubre:
  - (a) dos `fireEvent.click`: una petición a la URL esperada de cada ficha; al soltarla con F4, un aviso (`toast.error` o `alFallarLaDescarga`, según la forma) y el botón sin `aria-busy`/`aria-disabled`;
  - (b) "repetir el control": otra petición, `assign` una vez con la URL y ningún aviso de más;
  - (c) dos clics con éxito: `assign` una vez y una sola petición.
- **Desviaciones declaradas: aceptables las dos.**
  - `publicacionYComentarioParamSchema` en dos filas: el inventario de §D-1 lo nombra en las filas de `publicacionId` y de `comentarioId`, así que una sola fila dejaba una ruta sin probar.
  - (a) y (b) en un mismo caso: (b) se define como "después de asentarse (a)", y el título nombra "repetir el control". Todo lo que el plan pide de (a), (b) y (c) está afirmado.

### Hermanos y estados vecinos
**T-01.** Lo que dice el resumen coincide con el código:
- El remedio vive en el contrato, así que lo heredan todas las funciones de `tareas` que pasan por `mensajeDeErrorTareas`. `avisoDeFalloAlSubir` no lo necesita (es por código).
- Mi grep de los `VALIDACION` del backend (`handlers/validacion.ts`, `middleware/pertenencia.ts`, `adapters/db/*`, `core/calificaciones/calificar.ts` y `core/tareas/categorias.ts`) y de los mensajes "palabra:" de `shared/src` no da ningún texto para la persona que, tras la ruta, empiece con "minúscula:". La regla nueva no recorta texto legítimo.
- Repetí con `node` los bordes de S-05 y dan lo que dice el resumen. "14:30 no es válido" sin ruta → "30 no es válido" (N-07) **sigue sin alcanzarse**: toda fuente de `VALIDACION` del backend antepone una ruta o un campo (`${campo}: …`, `cursor:`, `cuerpo:`, `claseId:`, `calificacion:` y `categorias:`), y el único sin prefijo empieza con mayúscula ("Los datos enviados…", `adapters/db/errores.ts:54`). La regla nueva no lo empeora: el segundo paso no casa con "30".
- `id: id:` → "debe ser un identificador válido", conforme a CH3-C08 de 03c.

**T-02.**
- Mi grep de `Ref.current) return`, `enEspera=` y `.mutate(Async)?(` en `features/tareas` y `components/adjuntos` da los mismos 9 controles con ref de la lista del resumen, con sus líneas. `crear-tarea-view` y `editar-tarea-view` lanzan su mutación desde el `FormularioTarea`, que lleva `guardandoRef`. «Descargar» era el único sin ref y ya la tiene.
- Estados (primer clic, dos clics, clic en espera, fallo y repetir, éxito): cubiertos por CH3-A26 y las rojas del tester. "Dos fallos seguidos" y "vista desmontada" no tienen caso propio, y el razonamiento del resumen coincide con el código: el `finally` libera la ref y la ref muere con la ficha (O-10).

**Matriz de descargas.**
- Hay cuatro sitios: `detalle-tarea-view.tsx:105-109`, `entrega-realizada.tsx:85-90`, `entrega-de-alumno-view.tsx:205-210` y el muro (`features/clases/components/adjuntos-de-publicacion.tsx:15`, sin `alFallarLaDescarga`). Los cuatro pasan por `VistaDeFicha`, así que heredan la guarda sin tocar `clases`.
- `useUrlDeDescarga` y `location.assign` no aparecen en ningún otro componente.

**Las 9 reglas estáticas, con grep propio**, todas como dice el resumen:
1. `mensajeDelAvisoDeCalificar` solo en `tareas/hooks.ts` y `tareas/lib.ts`.
2. Nada de `disabled`, `?? []`, `fetch(` ni `console.` en `tareas/lib.ts`, `data.ts` ni `hooks.ts`.
3. CAL-T-99: grep vacío fuera de las pruebas.
4. `esErrorDeCursor` se define una sola vez (`lib/errores-de-api.ts:40`).
5. `calificaciones`: diff vacío, 11 archivos de producción.
6. `TraduccionDeErrores` solo en `tareas/data.ts` (`import type` y `satisfies`).
7. 0 invisibles literales.
8. `enEspera=` = 1.
9. `entregas-01e-r2`: la firma sigue en `:143` y no aparece ninguna palabra prohibida.

### Observaciones (no bloquean)
- **O-09 (cierre):** el resumen cita el plan `a9014e2f…` (Enmienda 2 con el estado LISTO), no `ee08bf2a…` (Enmienda 3). En la revisión de la Enmienda 3 comprobé que no cambió nada de 03a, así que no hay diferencia de contenido. Que `aprobacion.md` registre `ee08bf2a…` como el plan vigente al cerrar 03a.
- **O-10 (tester):**
  - "Dos fallos seguidos" y "vista desmontada" de la descarga no tienen caso propio. Son buenos blancos para la ronda 2: dos fallos con `alFallarLaDescarga`, y desmontar la ficha con la petición en vuelo y volver a montarla.
  - En CH3-A26, `waitFor(() => expect(enVuelo).toHaveLength(1))` pasa en cuanto sale la primera petición. Una segunda tardía la detectan solo las aserciones posteriores sobre `pedidas`. El programador dice que las 8 fallan con la guarda anulada; no lo reproduje porque no modifico código. El tester puede confirmarlo con su propia mutación.
- **O-11 (cierre, sin acción):** `onClick={() => void alPulsar()}`, con `try/finally` sin `catch`, deja sin manejar un rechazo si `alFallarLaDescarga` o `toast.error` lanzaran. Es el mismo comportamiento que el `void descargar(...)` de la base, así que no es regresión, y `descargar` captura todo lo de la petición.

## Revisión final — 03a — CHORE-03
Plan vigente `plan.md` `ee08bf2a186e41abdd764f04c340576d954f8eb5e4dedfa769eb23ea127aad14` (Enmiendas 2 y 3). Rama `chore/chore-03-errores-api`, base `ad10844`. Corridas propias desde `frontend/`, una suite a la vez, después de comprobar con `Get-CimInstance` que no había ningún `vitest` en marcha. Salidas en el scratchpad de la sesión: `lint-final.txt`, `test-final.txt` y `build-final.txt`.

**Veredicto: APROBADO CON OBSERVACIONES.** Sin `M-xx`: no hay nada que bloquee 03a. Las observaciones tienen destino en 03b, en el cierre de 03a o en ninguna parte (ver el arbitraje).

Verificación propia: lint `> tsc -b` (exit 0) · test `Test Files  213 passed (213)` · `Tests  3757 passed (3757)` · `Test timed out` 0 · build `✓ built in 744ms` (exit 0).

### Cifras: corrida propia contra la del tester (ronda 2)
| Qué | Tester, ronda 2 | Corrida propia |
|---|---|---|
| `npm run lint` | exit 0; `All matched files use Prettier code style!` y luego `> tsc -b` | exit 0; las mismas dos líneas |
| `npm run test` | `Test Files  213 passed (213)` · `Tests  3757 passed (3757)` | `Test Files  213 passed (213)` · `Tests  3757 passed (3757)` · `Duration  137.03s` |
| `Test timed out` | 0 | 0 |
| `npm run build` | — (no lo corre) | exit 0, `✓ built in 744ms`; el aviso del chunk > 500 kB viene de FRONT-01 |

Cadena de cifras de 03a: 197/3318 (ronda 0) → 204/3426 (primera entrega, +7 archivos y +108 casos) → 208/3518 (ronda 1 del tester, +4 y +92) → 209/3550 (ronda 2 del programador, +1 y +32) → 213/3757 (ronda 2 del tester, +4 y +207). Todo cuadra.

### V-01
Comparé el SHA-256 de cada `*.ataque.test.ts(x)` del repositorio (versionadas y nuevas) con las filas de "Tabla de SHA-256 de las 212 `*.ataque` al cierre de la ronda 2 de CHORE-03 03a" de `reporte-tester.md`, en minúsculas: base 212, actual 212, `diff` vacío. **212 de 212.**
- La C-1 (`features/clases/refactor-01c-r1.ataque.test.tsx`) sigue en `85a7926a…`, el hash de la ronda 0, y su diff contra `ad10844` es solo el hunk de A-5.
- Ninguna `*.ataque` la modificó, saltó ni borró el programador.
- En los 17 archivos nuevos no hay `.skip`, `.only`, `.todo`, `.fails`, `xit` ni `xdescribe`.

### "No se toca" contra `ad10844`
- `git diff --stat ad10844 -- frontend`: **12 archivos**, que son exactamente los permitidos:
  - los 10 de "Cambios por capa › 03a" que ya existían: `lib/errores-de-api.ts`, `tareas/data.ts`, `tareas/lib.ts`, las seis vistas de consultas y `components/adjuntos/lib.ts`;
  - `components/adjuntos/adjuntos-de-publicacion.tsx`, autorizado en DH-6;
  - la C-1 del tester.
- El undécimo archivo de "Cambios por capa", la tabla común, es nuevo.
- **17 archivos nuevos:**
  - la tabla común;
  - 8 pruebas del programador: `errores-de-api.test.ts`, `errores-de-api-estatico.test.ts`, `tareas/errores-ch3`, `formularios-ch3`, `consultas-ch3`, `recuperar-ch3`, `adjuntos/errores-ch3` y `adjuntos/descarga-ch3`;
  - 8 `*.ataque` del tester. Las que viven en `features/clases/` y `features/tareas/` son pruebas, y las pruebas están permitidas.
- Fuera de lo permitido no cambió nada: ningún `hooks.ts`, nada en `shared/`, `backend/`, `infra/`, `app/` ni `services/`, y nada de producción en `clases`, `calificaciones`, `admin` ni `auth`.
- `package.json`, `package-lock.json` y `.env.example` sin cambios: no hay dependencias nuevas.
- Hashes reproducidos:
  - `PRD.md` `a10c5c23…`
  - `ARCHITECTURE.md` `75c3c75d…`
  - `ARCHITECTURE-ESSENTIALS.md` `7c05fd61…`
  - `DESIGN.md` `8d977dc4…`
  - `ESTADO.md` `29f1eeea…`, con su §2b (extraída con `awk`) en `6ecbc366…`
  - `plan.md` `ee08bf2a…`
  - `reporte-tester.md` `b2f5e610…`

  Todos iguales a los de `aprobacion.md`.
- `git diff --stat ad10844 -- CLAUDE.md AGENTS.md .claude README.md`: vacío.

### Revisión final del código de 03a contra el plan
**Se hizo lo planeado, solo lo planeado y todo lo planeado.**
- **§D-1 con DH-5** (`lib/errores-de-api.ts`):
  - `TraduccionDeErrores`, `RUTA_DEL_MENSAJE`, `CAMPO_QUE_REPITE_EL_ESQUEMA`, `quitarRutaDelMensaje`, `textoVisibleOGenerico`, `esErrorDeCursor(error, campos = ["cursor"])`, `mensajeDeErrorDeApi` y `mensajeDeErrorDeConsulta` coinciden con las firmas y con la tabla de pasos 1 a 6.
  - `VALIDACION` va antes de los mapas.
  - Hay `Object.hasOwn` en los dos mapas.
  - `campoDeErrorDeApi` no cambia, y por eso el paso 2 solo aplica a un `VALIDACION`.
  - `quitarPrefijoDeCampo` se conserva, como pide 03a.
- **§D-3** (la tabla común):
  - Coincide con el plan, más `CON_CAMPO_REPETIDO` después de `DOS_PUNTOS_DENTRO`.
  - Los invisibles van como escapes.
  - Ningún archivo de producción la importa, y ella no importa nada.
- **§D-4, `tareas`:**
  - `TRADUCCION_DE_ERRORES_TAREAS` está en `data.ts`, con `import type` y `satisfies`, y sus `textosPorCampo` son los tres ids.
  - `mensajeDeErrorTareas` es un envoltorio, y `mensajeDeConsultaTareas` es nueva.
  - `errorDelCampoDeApi`, `mensajeDelCampoDeCalificacion` (N-33), `mensajeDelAvisoDeCalificar` (N-36; conserva su nombre por CAL-T-127) y `erroresDeCalificacionDeApi` pasan por el contrato.
  - `PREFIJO_DE_RUTA` ya no existe.
  - Las diez llamadas de consulta están en las líneas de §D-4 (detalle, editar, entregas ×3, entrega de un alumno ×2, hilo ×2 y "Tu trabajo"), y las de acción no se tocaron.
- **§D-4, `adjuntos`:**
  - `avisoDeFalloAlSubir` usa `textoVisibleOGenerico(error.message, mensajeDeError(error))` y conserva su firma.
- **La guarda de `VistaDeFicha`:**
  - Es la forma exacta de §D-4: `descargandoRef`, `alPulsar` con `try/finally`, `onDescargar: () => Promise<void>`, las fichas sin `void` y un solo `enEspera=`.
  - `descargar`, `AdjuntosDePublicacionProps`, `hooks.ts` y los textos no cambian.
- **`CLAUDE.md`:**
  - Hay retornos tempranos y no hay `else`; los ternarios son de un nivel, en asignaciones.
  - No hay `any`.
  - El único tipo nuevo de producción vive en `lib/`, y `data.ts` solo lo usa con `satisfies`.
  - Nada usa `?? []`. El `?? null` que sigue a un `Object.hasOwn` solo satisface `noUncheckedIndexedAccess`: no oculta datos.
  - Ningún error se lanza fuera de los hooks de TanStack Query.
  - Se conservan `enEspera` y las refs: «Descargar» ganó la suya y ningún control perdió la que tenía.
  - No hay textos nuevos de interfaz y no hay emojis en los 29 archivos tocados (lo comprobé con un script).
- **Las 7+2 reglas estáticas:** las verifiqué con grep en la verificación de la ronda 2. Desde entonces el código de producción no cambió (hash de `adjuntos-de-publicacion.tsx` `06699e36…`, igual al que anotó el tester), y la suite completa, que las incluye, está en verde.
- **Cobertura:**
  - CH3-A01 a CH3-A26 tienen cada uno su archivo y su título. Los busqué por id y están en los 8 archivos del programador; los leí uno por uno en las dos verificaciones.
  - La indicación del humano se cumple: las pruebas de interfaz recorren la tabla con `it.each` por módulo (`formularios-ch3.test.tsx`: 6 `it.each`; `recuperar-ch3.test.tsx`: `it.each(FORMULARIOS)`; `descarga-ch3.test.tsx`: `it.each(CASOS)`), sin un caso escrito a mano por cada formulario y entrada.

### Definición de terminado (`AGENTS.md`), punto por punto
- [x] Cumple lo pedido: el alcance de 03a del plan aprobado (es un chore y no tiene `RF`).
- [x] Capas y middleware: no aplica, porque solo cambia el frontend; nada de seguridad pasa a la interfaz.
- [x] `lint`, `build` y `test` en verde, con mi propia corrida.
- [x] Pruebas de autorización: no aplica, no hay endpoint nuevo.
- [x] Migración: no aplica.
- [x] `infra/` y `.env.example`: no aplica.
- [x] Documentos: A-1 a A-3 y `ESTADO.md` §3 se aplican al cerrar 03c, como dice el plan. `DESIGN.md` no cambia (S-02). Mientras tanto, la viñeta de `lib/errores-de-api.ts` en `CLAUDE.md` queda incompleta pero no es falsa, así que estoy de acuerdo con aplicar los documentos en 03c.

Reglas que no se rompen: ninguna aplica más allá del frontend.
- No hay `fetch` nuevo.
- No cambia nada del token, de la redirección de `apiClient`, del estado de pago ni de la restricción.
- No hay proveedores ni secretos.

### Lista de diseño (03a toca `frontend/`)
- No hay ningún patrón visual nuevo ni texto nuevo (S-02). El único cambio de marcado es el `<Button>` de «Descargar», partido en líneas por Prettier, con la misma variante, el mismo tamaño, el mismo `enEspera` y el mismo texto. `DESIGN.md` no necesita cambios, y su hash es el de la parte A.
- No hay valores sueltos, el componente es de `components/ui/` y no hay vidrio.
- El estado no cambia de forma de comunicarse: los avisos y los `ErrorDeCampo` son los de siempre, con texto.
- Los textos que la persona ve ahora son el genérico existente ("Algo salió mal. Inténtalo de nuevo.") o el resto del servidor sin la ruta. El resto de una ruta doble empieza en minúscula (R-07), algo que el humano aceptó en DH-5.
- Navegador, 360 px y la descarga real no están verificados, porque no abro navegadores. No hace falta una comprobación humana: no cambia nada visible. Se registra como "no verificada por decisión del proceso, cubierta por pruebas automáticas".

### Hallazgos del tester
- **T-01** (rutas dobles): corregido según la Enmienda 2 (DH-5). Las 6 pruebas rojas pasan sin que nadie las tocara, y la ronda 2 no encontró un tercer prefijo ni un recorte de texto legítimo.
- **T-02** (doble clic en «Descargar»): corregido según la Enmienda 2 (DH-6). Las 3 rojas pasan sin tocarlas.
  - La mutación del tester lo confirma: con la guarda anulada fallan 27 pruebas, y con la guarda que nunca se libera, 14.
  - El tester la hizo sin tocar el disco: el hash de `adjuntos-de-publicacion.tsx` es el mismo antes y después.
- No hubo desacuerdos entre programador y tester que arbitrar.

### Arbitraje de las observaciones abiertas
| Obs. | Qué | Decisión y destino |
|---|---|---|
| O-01 | F2 en el primer envío con `\u{200B}` y foco | **Cerrada.** La cubrió la ronda 1 del tester (17 campos pintados, primer envío) |
| O-02 | Consulta de la tarea en la lista de entregas y en la entrega de un alumno | **Cerrada.** Ronda 1 (incluidas las recargas) |
| O-03 | La descarga por el camino real | **Cerrada.** Ronda 1 (9 casos) y ronda 2 (cinco sitios) |
| O-04 | A19 con regreso por enlace | **Cerrada.** Ronda 1 (enlace «Ensayo final», `PUSH`) |
| O-05 | La expresión de A20 no ve copias escritas de otra forma | Cerrada en 03a: la ronda 1 la reforzó en `tareas` y `adjuntos`. **Destino 03b y 03c:** cuando la regla estática se extienda a `clases`, `calificaciones`, `admin`, `auth` y todo `src/`, el tester extiende su O-05 al alcance nuevo (punto de ataque, sin enmienda) |
| O-06 | CH3-A24 no revisa su propio archivo | **Cerrada.** La `*.ataque` de `tareas` de la ronda 1 revisa `errores-de-api-estatico.test.ts` |
| O-07 | `TEXTOS_CALIFICAR.avisoRecargaFallida` como hermano | **Nada.** Es texto fijo y el remedio no aplica; el tester lo confirmó |
| O-08 | Los cambios temporales del programador para probar las pruebas | **Nada.** Para T-02, la mutación del tester lo comprobó de forma independiente |
| O-09 | Plan vigente `ee08bf2a…` | **Cierre de 03a:** el orquestador lo registra en `aprobacion.md` |
| O-10 | Dos fallos seguidos, vista desmontada y la sensibilidad de CH3-A26 | **Cerrada.** Ronda 2: casos propios y mutación de confirmación |
| O-11 | Rechazo sin manejar si `toast.error` o `alFallarLaDescarga` lanzan | **Nada.** Pasaba igual en `ad10844`, no es regresión y `descargar` captura todo lo de la petición |
| O-r2-1 | La guarda es por ficha montada | **Nada.** Ver el detalle abajo |
| O-r2-2 | Con la vista desmontada se avisa y se navega como en la base | **Nada.** El plan lo acepta ("como hoy") y es la regla de los ganchos ("los avisos corren aunque la vista ya no esté montada"). El "sin aviso" del encargo del orquestador no está en el plan, y manda el plan |
| O-r2-3 | Quinto sitio: el material de "Trabajo de clase" (`elemento-de-trabajo.tsx:55`) | **Basta anotarlo, sin enmienda.** Ver el detalle abajo |
| O-r2-4 | El muro todavía enseña la ruta con F4 y con `archivoId: archivoId:` | **03b**, por diseño: CH3-B01 y CH3-B08, migración de `mensajeDeErrorClases` |
| O-1 (Enmienda 1) | Los buscadores de `clases` | Al `chore` de foco y navegación (DH-2 lo incluye) |
| O-2 (Enmienda 1) | Dos "A-4" | **Nada.** Ya se aclaró al humano |
| O-3 (Enmienda 1) | Dos fallos seguidos en "Ver más" | **Cerrada.** Ronda 1: un aviso por fallo, el botón sigue disponible y el tercer intento carga sin aviso de más |
| O-4 (Enmienda 1) | "Inténtalo de nuevo" ante un `VALIDACION` determinista | **Nada.** Es un riesgo aceptado (el mismo criterio que S-22 y CAL-T-135) |
| S-14 | 23 controles para CHORE-04, no 18 | El humano no la vetó, así que **se aplica.** Las 23 filas ya están en `ESTADO.md` §2b y en "Lista para CHORE-04"; en 03a no hay nada que hacer |

**Detalle de O-r2-1 (la guarda es por ficha montada): nada.** No es un defecto.
- Toda guarda con ref del repositorio vive en su instancia: `guardandoRef`, `entregandoRef`, `enviandoRef` y las demás mueren con su componente, y CHORE-04 replicará esa misma forma.
- Para llegar al caso hacen falta dos acciones distintas de la persona (ocultar y volver a abrir el material, o salir de la vista y volver), no un doble clic.
- La petición extra es una sola, de lectura (la URL prefirmada), no cambia datos, y cada fallo da un solo aviso legible.
- El tester dejó fijado ese comportamiento en `clases/descarga-ch3-r2.ataque.test.tsx` (`expect(despuesDeReabrir).toBe(2)`). Si algún día CHORE-04 eligiera una guarda por adjunto en lugar de por ficha, su inventario §D-R0 tendría que nombrar ese caso. Para que no haya que redescubrirlo, el orquestador puede sumar una línea a la fila de CHORE-04 cuando §2b deje de estar en "No se toca", al cerrar 03c, nunca antes.

**Detalle de O-r2-3 (el material de "Trabajo de clase"): basta anotarlo.**
- El material usa el mismo envoltorio de `clases` que el muro, así que hereda la guarda sin cambios, y la ronda 2 del tester ya lo cubre (`clases/descarga-ch3-r2.ataque.test.tsx`, segundo sitio).
- Lo que falta es solo inventario: en 03b, el programador lo nombra en la matriz de descargas y en los hermanos de CH3-B08, como hermano del muro con el mismo `mensajeDeErrorClases`. El orquestador lo dice en la instrucción del programador de 03b.
- La `*.ataque` del tester usa F1 para el aviso, que `mensajeDeErrorClases` traduce igual antes y después de 03b, así que la migración de 03b no la rompe y no hace falta una C-5.

### Rondas y hermanos (para `ESTADO.md` §6)
03a tuvo **una ronda extra del tester** (ronda 1 ROTO → ronda 2 RESISTE). **Ninguna cuenta como "hermanos o estados vecinos no aplicados"**, el patrón que haría pasar al programador a `opus`:
- **T-01 es un defecto del supuesto del plan.** S-05 decía "una sola vez", el humano lo aprobó así y el programador lo implementó carácter por carácter. La ronda 1 fue el primer ataque a la primera implementación, no a una corrección, así que no existía un remedio que extender a ningún hermano. Lo resolvió una enmienda del plan (Enmienda 2, DH-5), no el programador.
- **T-02 es un defecto previo a `ad10844`** en un archivo que estaba en "No se toca". El programador no podía tocarlo sin incurrir en PA-3, y necesitó la autorización del humano (DH-6).
- **La corrección sí cuenta a favor.** El resumen de la ronda 2 trajo los hermanos de T-01 (cada fila del inventario de §D-1), los de T-02 (los 9 controles con su ref) y los estados vecinos de la guarda. El tester no encontró ningún vecino sin cubrir: RESISTE a la primera.
- Rondas extra por hermanos en 03a: **0**. El programador sigue en `sonnet`. Además, CHORE-03 es carril normal, y la regla de `opus` aplica al carril sensible.

Texto sugerido para §6: "CHORE-03 03a: 1 ronda extra del tester (r1 ROTO por T-01, supuesto S-05 del plan, resuelto en la Enmienda 2/DH-5; y T-02, defecto previo en un archivo de "No se toca", resuelto con DH-6), 0 por hermanos o estados vecinos; r2 RESISTE."

### Lo que el orquestador aplica al cierre de 03a
1. **`aprobacion.md`:** registrar que el plan vigente es `ee08bf2a…` (O-09), junto con el SHA-256 de este `revision.md` y el veredicto.
2. **El commit de 03a lleva también la parte A.** Es el primer commit de la rama. En el árbol de trabajo siguen modificados `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/DESIGN.md` y `docs/ESTADO.md` (parte A, Enmiendas 1 y 3). Si no entran en este commit, quedan sueltos durante 03b. El bloque para el humano incluye:
   - los 12 archivos modificados de `frontend/`;
   - los 17 nuevos de `frontend/src/`;
   - toda la carpeta `docs/trabajo/CHORE-03-errores-api/`;
   - esos cinco documentos.

   Nada más: `git status` no muestra otra cosa.
3. **`ESTADO.md`:** el orquestador puede actualizar §6 y el avance de 03a, pero **sin cambiar §2b**. 03b la verifica por su hash, `6ecbc366…`. Si §2b tuviera que cambiar, se anota el hash nuevo en `aprobacion.md` antes de lanzar 03b.
4. **Después del commit:** leer el hash con `git log` y anotarlo. Ese commit es la base de "No se toca" dentro de `frontend/` para 03b.
5. **En la instrucción del programador de 03b:** O-r2-3 (el material, en la matriz y en los hermanos de CH3-B08) y O-r2-4 (lo que corrigen CH3-B01 y CH3-B08). En la del tester de 03b: O-05, la regla extendida.
6. A-1, A-2, A-3 y `ESTADO.md` §3 se aplican al cerrar 03c, como dice el plan. No falta nada más.

### Resumen para el humano (máximo 15 líneas)
1. **Qué cambió (03a de CHORE-03):** los errores de la API ahora se traducen en un solo lugar, `lib/errores-de-api.ts`.
2. Ese contrato quita la ruta técnica del campo, y también el nombre que el servidor repite detrás ("archivoId: archivoId: …").
3. Cuando el servidor manda un texto vacío o invisible, la persona ve el genérico del módulo.
4. En las consultas, un `VALIDACION` muestra el texto fijo del lugar, nunca el texto de zod en inglés.
5. `features/tareas` (crear, editar, entregar, hilo, calificar, borrar y sus consultas) y `components/adjuntos` ya usan el contrato. «Descargar» tiene ahora guarda contra el doble clic, en los cinco sitios que lo usan.
6. Hay una tabla común de entradas fuera de contrato que las pruebas de cada módulo recorren con `it.each`.
7. **Cómo se probó:** con 8 archivos de pruebas del programador (CH3-A01 a A26) y 8 de ataque del tester.
8. El tester hizo tres rondas: la ronda 1 encontró T-01 (rutas dobles, un supuesto del plan) y T-02 (doble clic, un defecto previo), y la ronda 2 cerró en RESISTE.
9. **Corrida del manager:** lint en verde; test con 213 archivos y 3757 pruebas en verde, sin tiempos agotados; build en verde. Las 212 pruebas de ataque están intactas.
10. Nada fuera de lo autorizado: sin backend, sin `shared/`, sin `hooks.ts` y sin dependencias nuevas; los cinco documentos coinciden con sus hashes.
11. No cambia nada visual ni de textos; `DESIGN.md` queda igual. No hace falta comprobación en navegador.
12. Hubo una ronda extra, pero ninguna por "hermanos": el programador sigue en `sonnet`.
13. **Pendiente:** en 03b se migran `clases`, `calificaciones` y N-46, y el muro deja de enseñar la ruta (O-r2-4); en 03c, `admin`, `auth` y los documentos A-1 a A-3.
14. CHORE-04 (guardas de doble clic, 23 controles) queda registrado y sin fecha.
15. El commit de 03a incluye también los cinco documentos de la parte A (DOCS-04).

## Verificación del resumen — 03b — primera entrega
Resumen: `resumen-programador-03b.md` (primera entrega de 03b). Plan `plan.md` `ee08bf2a…` (Enmiendas 1 a 3), reproducido. Corrí todo desde `frontend/`, una suite a la vez. Antes comprobé con `Get-CimInstance` que no hubiera ningún `node` con `vitest`: solo había un proceso ajeno de otra herramienta, que no toqué. Las salidas están en el scratchpad de la sesión: `mgr-lint-03b.txt`, `mgr-test-03b.txt`, `mgr-build-03b.txt`, `mgr-base-03b.txt` y `mgr-actual-03b.txt`.

**Veredicto: RESUMEN ACEPTADO (el tester puede atacar la ronda 1 de 03b).** No hay `M-xx`. Todas las cifras coinciden, V-01 da 212 de 212, "No se toca" está limpio y cada viñeta de 03b tiene su caso.

### Cifras: resumen contra corrida propia
| Qué | Resumen | Corrida propia |
|---|---|---|
| `npm run lint` | exit 0; `All matched files use Prettier code style!` y luego `> tsc -b` | exit 0; las mismas dos líneas |
| `npm run test` | `Test Files  219 passed (219)` · `Tests  3901 passed (3901)` | `Test Files  219 passed (219)` · `Tests  3901 passed (3901)`; arranque 09:14:57, `Duration  188.60s` |
| `Test timed out` | 0 | 0 |
| `npm run build` | exit 0; `✓ built in 1.87s`, con el aviso del bloque de más de 500 kB | exit 0; `✓ built in 1.90s`, con el mismo aviso |
| `npx vitest list <archivo>`, contando " > " | 5 · 1 · 103 · 21 · 11 · 2 · 3 | `clases/errores-ch3` 5 · `calificaciones/errores-ch3` 1 · `clases/formularios-ch3` 103 · `clases/consultas-ch3` 21 · `clases/recuperar-ch3` 11 · `services/apiClient-ch3` 2 · `lib/errores-de-api-estatico` 3 |
| Delta contra el cierre de 03a | +6 archivos y +144 casos (143 nuevos y 1 estático) | 213 → 219 y 3757 → 3901: coincide |
| Ids en `vitest list` | — | B01 a B06: 1 cada uno · B07: 47 (27 + 20) · B08: 50 (36 + 4 + 8 + 2) · B09: 21 · B10: 11 · B11 a B13: 1 cada uno · B14: 6. Coinciden con el desglose del resumen |

### V-01
Usé el comando de V-01 de `reporte-tester.md`, con la base sacada de "Tabla de SHA-256 de las 212 `*.ataque` al cierre de la ronda 0 de CHORE-03 03b" y pasada a minúsculas.
- Base 212, actual 212, `diff` vacío: `IGUALES`. **212 de 212.**
- C-2 `entregas-01d-r3` da `08a5e1a5…` y C-3 `muro-c-r3` da `a79b6afc…`: los dos son los de la ronda 0.
- No hay `.skip`, `.only`, `.todo`, `.fails`, `xit` ni `xdescribe` en las 6 pruebas nuevas ni en la estática extendida.
- Ninguna prueba nueva termina con un `return` temprano. El único `return` es el de `unSoloMensaje`, que corre después de sus aserciones.

### "No se toca"
- `git diff --stat 1f11d38e -- frontend shared backend infra .env.example CLAUDE.md AGENTS.md .claude README.md` da **23 archivos**:
  - los 19 de producción de "Cambios por capa › 03b";
  - N-L1 (`clases/lib.test.ts`) y N-L2 (`calificaciones/estatico-01d.test.ts`);
  - C-2 y C-3 del tester;
  - `lib/errores-de-api-estatico.test.ts`, que es CH3-B13 y el plan autoriza.

  Hay 6 archivos nuevos, que son las 6 pruebas. Nada en `shared/`, `backend/`, `infra/`, `.env.example`, `CLAUDE.md`, `AGENTS.md`, `.claude/` ni `README.md`.
- Los once archivos de vistas con consulta son exactamente los de §D-4 › "Vistas de `clases` cuyo error es de una consulta", incluidos `clase-layout.tsx`, `encabezado-clase.tsx`, `personas-view.tsx` y `trabajo-view.tsx`. Cada uno cambia solo la llamada y su importación. En los dos buscadores, Prettier partió la línea, y la llamada quedó en `:132` y `:200`.
- No cambia ningún `hooks.ts`, nada de `components/` (`adjuntos/` incluido), `app/`, `gradebook-view.tsx`, `mis-calificaciones-view.tsx` ni sus componentes, `admin`, `auth` ni `diagnostico`.
- `services/apiClient.ts` tiene un solo hunk, con la constante y el comentario de §D-5 carácter por carácter después de `esApiError`. `procesar` y `perderSesion` no cambian, y las comparaciones literales siguen intactas (S-12).
- N-L1 cambia solo `:134`: "debe ser un número" pasa a "Algo salió mal. Inténtalo de nuevo.", y el título no cambia. N-L2 cambia solo la expresión de `:137`, que coincide exactamente con §D-R0.
- Los documentos coinciden por hash: `PRD.md` `a10c5c23…`, `ARCHITECTURE.md` `75c3c75d…`, `ARCHITECTURE-ESSENTIALS.md` `7c05fd61…`, `DESIGN.md` `8d977dc4…` y §2b de `ESTADO.md` `6ecbc366…` (con `awk`). Los cinco son iguales.

### Contrato y migración (§D-4 y §D-5)
- **`clases/data.ts`:**
  - `MENSAJES_POR_CODIGO_DE_CLASES` tiene el mismo contenido que tenía `MENSAJES_ERROR_CLASES`: los cinco códigos y `...MENSAJES_POR_CODIGO_DE_ARCHIVO`. CH3-B01 lo fija contra los nueve textos de antes.
  - `TRADUCCION_DE_ERRORES_CLASES` va con `import type` y `satisfies`. Su `textosPorCampo` es solo `claseId`.
- **`clases/lib.ts`:**
  - `mensajeDeErrorClases` y `mensajeDeConsultaClases` son envoltorios de una línea.
  - `mensajeDeErrorDeLista` usa `esErrorDeCursor(error) ? texto : mensajeDeConsultaClases(error)`.
  - `erroresDeCategoriasDeApi` usa `mensajeDeErrorClases(error)` en la fila y en "categorias:". Con "categorias.0.peso.x: y" da `null`, porque `PREFIJO_DE_FILA_DE_CATEGORIA` exige ":" detrás de `nombre|peso`.
  - `avisoDeFalloAlSubir` no cambia.
  - No quedan `quitarPrefijoDeCampo`, `.message.slice` ni `MENSAJES_ERROR_CLASES`.
- **Orden del contrato frente al de antes:** antes iban los códigos con mensaje del servidor, luego `VALIDACION` y luego el mapa; el contrato pone primero `VALIDACION`, luego el mapa y luego los códigos del servidor. Los conjuntos de `clases` son disjuntos (12 códigos del servidor contra los 9 del mapa), así que la salida no cambia, salvo lo que el plan declara: un resto sin texto visible da el genérico y las rutas compuestas quedan sin ruta.
- **`calificaciones/lib.ts`:**
  - Las dos importaciones son exactamente las de §D-4 y de PA-8.
  - El alias está escrito como `export const esErrorDeCursorDeCalificaciones = esErrorDeCursor` (`lib/errores-ch3-r1.ataque.test.ts:299` lo descuenta y está en verde).
  - `mensajeDeErrorCalificaciones` no cambia (M-01).
  - `calificaciones/data.ts` solo pierde la constante y su comentario.
- **`lib/errores-de-api.ts`:** solo se borra `quitarPrefijoDeCampo`.
- **`tareas/data.ts` y `tareas/lib.ts`:** cambian solo por N-46.
- **S-01:** las once consultas dan el genérico ante un `VALIDACION`. `claseId` da su texto fijo, y los códigos con mensaje del servidor dan su mensaje (CH3-B02 y CH3-B09).

### Pruebas requeridas, una por una
| Id | Caso | ¿Prueba lo que pide la viñeta? |
|---|---|---|
| B01 | `clases/errores-ch3.test.ts` › "CH3-B01: mensajeDeErrorClases recorre la tabla…" | Sí. Recorre la tabla en `mensajeDeErrorClases` y en `avisoDeFalloAlSubir`. Prueba los 12 códigos del servidor con cada resto y con "Mensaje."; "claseId:" con y sin mensaje; los 9 textos fijos de antes; `ARCHIVO_INVALIDO` con cada resto; las 9 rutas dobles de la Enmienda 2, `claseId: claseId:`, `tema: tema:` en la consulta y `categorias.0.id: categoriaId:` (null) |
| B02 | mismo archivo › "CH3-B02: …" | Sí |
| B03 | › "CH3-B03: …" | Sí |
| B04 | › "CH3-B04: …" | Sí. Prueba los tres campos de `erroresDeFormularioClases`, `codigo` y `nombre` del tema con cada resto, y la tabla da null |
| B05 | › "CH3-B05: …" | Sí, en la fila, en la lista y con la ruta más larga |
| B06 | `calificaciones/errores-ch3.test.ts` › "CH3-B06: …" | Sí. Usa `toBe(esErrorDeCursor)`, los tres respaldos, `claseId` con cada resto, `SIN_ACCESO_A_LA_CLASE`, `SERVICIO_OCUPADO` con texto y con cada resto, y `Object.keys` con `import * as` |
| B07 | `clases/formularios-ch3.test.tsx`, dos `it.each` sobre 9 formularios (27 + 20) | Sí. Comprueba de (a) a (d) en los nueve: F2 en `nombre`, `codigo`, `texto` (anuncio, material y comentario), `nombre` del tema, `categorias.0.nombre` (`aria-invalid` y descripción accesible) y `categorias` |
| B08 | mismo archivo: controles (36), regenerar (4), descarga (8) y doble clic (2) | Sí. Cubre los 10 controles de la viñeta; la descarga en el muro y en el material (O-r2-3) con F1, F3, F4 y `archivoId: archivoId:`, que da "debe ser un identificador válido" (O-r2-4); y el doble clic en los dos sitios, con una petición y un aviso |
| B14 | mismo archivo, `it.each` anuncio y material × F1, F3 y F4 (6) | Sí. Hay un aviso con `errorRechazado`, el archivo sigue en "elegidos", el botón sale de la espera y no se publica |
| B09 | `clases/consultas-ch3.test.tsx` (16 + 5) | Sí. Cubre las 11 consultas (Personas en primera carga y en "Ver más alumnos") y los 5 "Ver más" con `limite:`; los 5 con "cursor: x" dan su texto y no el genérico |
| B10 | `clases/recuperar-ch3.test.tsx` (10 + 1) | Sí. Repite el control en los 9 formularios (en las categorías, en la fila y en la lista) y vuelve a la sección con `rutas` y `Providers` (`staleTime` real) |
| B11 | `services/apiClient-ch3.test.ts` › "CH3-B11: …" | Sí. Revisa los tres códigos, los dos `errorQueRedirigeElCliente` y que solo `apiClient.ts` declare la constante en producción |
| B12 | mismo archivo › "CH3-B12: …" | Sí, y además comprueba que no haya `import(` dinámico |
| B13 | `lib/errores-de-api-estatico.test.ts` › "CH3-B13: …" | Sí, con la lectura 1 (abajo). Exige más de 10 archivos por módulo, para que no pase en vacío |

`it.each` por módulo (indicación del humano): B07, B08, B10 y B14 usan un `it.each` y una sola función de montaje por archivo. **Cumple.**

**Las tres lecturas que el programador pidió revisar. Las acepto las tres:**
1. **CH3-B13 sobre el código de producción de `src/`.** "Ningún archivo de `src/`" leído al pie de la letra es imposible de cumplir: `lib/errores-ch3-r1.ataque.test.ts:261` y la propia CH3-B13 nombran el símbolo para prohibirlo. Lo que protege la viñeta es que el código ya no exista, y eso se cumple. No hace falta enmienda.
2. **Regenerar el código montando `CodigoDeClase`.** `useRegenerarCodigo` no avisa: el aviso fijo vive en el `onError` del componente (`codigo-de-clase.tsx:65-66`). Con `renderHook` no habría ningún aviso que contar, así que montar el componente es la única forma de probar la viñeta.
3. **CH3-B10 reabre el formulario de tema al volver.** Su estado es local y se desmonta al salir de la sección, así que al volver no hay error que mostrar. La promesa del texto ("guardar manda una petición nueva") se prueba bien reabriéndolo. La vuelta se hace por el historial (`router.navigate(-1)`). Es un camino válido de "regresar", pero no el único (ver O-14).

### Matriz §D-6 y hermanos, contra el código
- **Controles sin ref.** Revisé todo `.mutate(` y `.mutateAsync(` de producción en `features/clases`. Los que no tienen ref son exactamente las filas 1 a 6 y 19 a 22 de "Lista para CHORE-04":
  - `formulario-comentario.tsx:40`;
  - `formulario-clase.tsx:97` y `:112`;
  - `codigo-de-clase.tsx:58`;
  - `formulario-unirse-clase.tsx:36`;
  - `buscador-alumnos.tsx:44`;
  - `buscador-de-maestros.tsx:100`;
  - `maestros-de-clase-view.tsx:67`;
  - `comentarios-de-publicacion.tsx:74`;
  - `publicacion-del-muro.tsx:118`;
  - `tabla-alumnos.tsx:59`.

  El programador no les agregó la ref: el diff de los cuatro archivos que sí se tocan es solo la consulta. No hay ningún control sin ref fuera de la lista.
- **Controles con ref.** Las refs que nombra la matriz existen en el código:
  - `publicandoRef` (`formulario-publicacion.tsx:97` y `:115`);
  - `enviandoRef` (`formulario-tema.tsx:56` y `:62`);
  - `guardandoRef` (`editor-de-categorias.tsx`, cuatro guardas);
  - `moviendoRef` (`mover-elemento.tsx:40`);
  - `ordenandoRef` (`trabajo-view.tsx:143`);
  - `borrandoRef` (`seccion-de-tema.tsx:192` y `:218`);
  - `descargandoRef` (`components/adjuntos/adjuntos-de-publicacion.tsx:29`).
- **Dónde avisa cada control.** Crear y editar clase y unirse avisan desde el callback del componente (`formulario-clase.tsx:68-74`, `formulario-unirse-clase.tsx:45-52`). Regenerar avisa con un texto fijo en el callback. Los demás avisan desde el hook (`hooks.ts`, los `toast.error(mensajeDeErrorClases(…))`). Con la vista desmontada, los callbacks de `mutate` no se disparan, y eso coincide con "sin aviso, como antes".
- **Los cinco sitios de la ficha** comparten `descargandoRef` de `VistaDeFicha`. Los del muro y del material pasan `mensajeDeErrorClases`: `clases/components/adjuntos-de-publicacion.tsx:18`, que también usa `elemento-de-trabajo.tsx:55`.
- **Consultas que no aplican:** la recarga con `useAvisoDeRecargaFallida`, `clases-admin-view.tsx` y copiar el código usan textos fijos. Ninguna otra vista de `clases` muestra el error de una consulta con `mensajeDeErrorClases`: lo comprobé con un grep de las tres funciones.
- **Rutas dobles:** las 9, más `claseId: claseId:` y `tema: tema:`, están cubiertas por CH3-B01 y CH3-B08, como dice el inventario de §D-1.
- **Foco:** ningún componente cambió, así que el foco va donde ya iba. **La matriz coincide con el código.**

### Punto 6: el cambio visible en "Personas" y el roster
Ahora, un `400 VALIDACION` "cursor: no es válido" en "Ver más alumnos" de "Personas" (`personas-view.tsx:52`) y del roster (`tabla-alumnos.tsx:185`) muestra el genérico. Antes mostraba el fragmento "no es válido".

**Lo prevé el plan. No es una desviación del programador y no hace falta enmienda ni decisión del humano.** Tres partes del plan llevan a ese resultado:
- §D-4 nombra esas dos líneas, una por una, entre las que pasan a `mensajeDeConsultaClases`.
- S-01, confirmada por el humano en DH-1, dice que un `VALIDACION` en una consulta da el respaldo, salvo los ids de `textosPorCampo`.
- §D-1 dice que el cursor no es un paso del contrato: cada vista lo reconoce "como hoy". Estas dos vistas no lo reconocían; lo dejaban pasar a `mensajeDeErrorClases` y salía el fragmento.

Lo único que falta es que el plan lo declare, como la Enmienda 1 (M-03) hizo con el hilo de `tareas`. La columna "Cambio visible" de §D-4 para `clases` no lo nombra. Es el mismo hueco de declaración que M-03, y la salida mejora: un fragmento sin sujeto se cambia por un texto que ya existe, sin texto nuevo (S-02). Un texto de "cambió mientras la veías" para esas dos listas sería texto nuevo y queda fuera del chore. La frase "Inténtalo de nuevo" ya salía ahí ante un `5xx`. Que la `MensajeError` reemplace la lista sin botón es S-06 b2, que se difiere al chore de foco (DH-2). Destino: O-12 y O-13.

### Reglas estáticas (grep propio)
1. `mensajeDelAvisoDeCalificar` en producción: solo en `features/tareas/hooks.ts` y `lib.ts`.
2. `disabled`, `?? []`, `fetch(` y `console.` en `tareas/lib.ts`, `data.ts` y `hooks.ts`: ninguno.
3. Un script propio de Python revisó 196 archivos de producción en busca de U+2800 y U+1D159 (literales y como escape), `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =` y `\r\n|\r`. No encontró nada.
4. `esErrorDeCursor` se define una sola vez, en `lib/errores-de-api.ts:37`.
5. `features/calificaciones` tiene 11 archivos de producción, ninguno con `.message` y ninguno con `esErrorDeCursor(`. CAL-1D09 y CAL-T-182 están en verde.
6. El diff no agrega ningún `interface` ni `type` en producción. `TraduccionDeErrores` se importa solo con `import type` y se usa solo con `satisfies`.
7. Ningún carácter invisible literal (los 11 de CH3-A24) en las 7 pruebas nuevas o extendidas, en el contrato ni en la tabla: lo comprobó el mismo script.

`lib/errores-ch3-r1.ataque.test.ts:299` está en verde con el alias tal como está escrito.

### Observaciones (no bloquean)
- **O-12 (cierre, orquestador).** Hay que anotar el cambio visible del punto 6 como **declarado**, igual que M-03: en `aprobacion.md`, en el resumen de 03b para el humano y en "Documentos a actualizar" si corresponde. No necesita enmienda.
- **O-13 (tester).** Ninguna prueba fija el punto 6. CH3-B09 solo prueba la primera carga del roster: no prueba su "Ver más alumnos" ni con `limite:` ni con el cursor. Conviene atacar "Ver más alumnos" en "Personas" y en el roster con "cursor: no es válido" y con `limite:`. Se espera el genérico, sin "cursor:" y sin el fragmento suelto.
- **O-14 (tester).** CH3-B10 vuelve a "Trabajo de clase" por el historial (`navigate(-1)`). El camino de pulsar «Trabajo de clase» en la barra de secciones, y el de atrás y adelante, no tienen caso. El resultado debería ser el mismo, porque el estado del formulario es local, pero la regla de `AGENTS.md` pide un caso por camino.
- **O-15 (tester).** `erroresDeCampo()` de `formularios-ch3` y `recuperar-ch3` reconoce un `ErrorDeCampo` porque su `id` termina en `-error`. El `ErrorDeCampo` de `selector-de-maestros.tsx:74` usa `useId()`, así que el detector no lo ve. Si en "crear clase" o "editar clase" salieran a la vez un aviso y un error bajo los maestros, nadie lo notaría. Vale la pena atacar `maestroIds:` con cada resto y `maestroIds.0: maestroId: …` en esos dos formularios. B07 no los prueba porque el plan fija F2 en `nombre`.
- **O-05 (sigue, tester).** CH3-B13 extiende a `clases` y `calificaciones` solo la regla de CH3-A20: las manipulaciones y la expresión `/^[…]+:\s*/`. Las copias escritas de otra forma (`\w`, `[^:]`, `split(":")`, `new RegExp(`) solo las vigila la `*.ataque` del tester, y solo en el alcance de 03a. Le toca al tester extenderla, como acordamos al cerrar 03a.

### Detalles menores
- Los títulos de los casos F2 de CH3-B07 interpolan el resto, así que en `vitest list` uno lleva un U+200B en tiempo de ejecución. La fuente usa el escape, así que CH3-A24 no se viola. No hace falta hacer nada.
- `TEXTOS_FIJOS_DE_SIEMPRE.ARCHIVO_INVALIDO ?? ""` en CH3-B01 es un `??` sobre un `Record` de prueba que sí tiene la clave. No oculta datos de la API.
- El comentario de T-11 en `tareas/data.ts:350-353` ya estaba separado de su constante en `1f11d38e`. Al quitar la de N-46 quedó pegado al de `CODIGOS_QUE_REEMPLAZAN_LA_VISTA`. No es regresión, pero conviene ordenarlo si alguien vuelve a tocar ese archivo.

## Revisión de la Enmienda 4 — CHORE-03
Veredicto: **APROBADO CON OBSERVACIONES** (sin `M-xx`). El plan queda BLOQUEADO solo por DH-8, que es del humano.
Verificación propia: revisión de plan; código sin cambios desde la ronda 1 (`git diff --stat 1f11d38e` vacío en `formulario-clase.tsx`, `formulario-publicacion.tsx`, `selector-de-maestros.tsx` y `hooks.ts` de `clases`). No corrí `lint`, `test` ni `build` (no hay código nuevo); todo lo de abajo sale de lectura y de grep.

### Cotejo mecánico
- `plan.md`: SHA-256 `c5557678729a62a010212ff183bb84835e9d7b095f6e3ca8d1a9c6167e6515fa`, 936 líneas. La copia previa es `ee08bf2a186e41abdd764f04c340576d954f8eb5e4dedfa769eb23ea127aad14`. Las dos coinciden con `aprobacion.md`.
- `git diff --no-index --numstat` da 148 inserciones y 3 borrados, en 17 hunks:

| # | Hunk | Sección | Tipo |
|---|---|---|---|
| 1 | `-2 +2,2` | Encabezado | `Estado: LISTO` pasa a `BLOQUEADO`, más la línea "Enmienda 4" |
| 2 | `-69,0 +71,7` | Preguntas bloqueantes | DH-8 (inserción) |
| 3 | `-222,0 +231,2` | §D-2, tabla | Dos filas nuevas (inserción) |
| 4 | `-230,0 +241,2` | §D-2 | Párrafo "Campo pintado se decide por el modo" (inserción) |
| 5 | `-322,0 +335,36` | §D-4 `clases` | Tres filas y la forma exacta, con la variante (b) (inserción) |
| 6 | `-363,0 +412,2` | §D-6 | Matriz partida por modo (inserción) |
| 7 | `-403,0 +454,9` | §D-R0 | Inventario y lista cerrada vacía (inserción) |
| 8 | `-430,0 +490` | Cambios por capa (03b) | Inserción |
| 9 | `-517,0 +578,14` | Pruebas requeridas (03b) | CH3-B15 a B17 (inserción) |
| 10 | `-549,0 +624,4` | Puntos de ataque | Inserción |
| 11 | `-588,0 +667` | Riesgos | R-09 (inserción) |
| 12 | `-593 +672` | PARADAS | PA-2: el texto previo queda íntegro y se le añade la excepción |
| 13 | `-601,0 +681` | PARADAS | PA-11 (inserción) |
| 14 | `-615 +695` | No se toca | El texto previo queda íntegro y se le añade la excepción de DH-8 |
| 15 | `-642,0 +723` | Autorizaciones | A-7 (inserción) |
| 16 | `-676,0 +758,8` | Pasos | 03b, pasos 10 a 15, entre el paso 9 y "**03c**" (inserción) |
| 17 | `-791,0 +881,56` | Final | Sección "Enmienda 4" (inserción) |

- Todos los hunks llevan la marca "Enmienda 4" o están en su sección final. Los tres borrados son líneas modificadas: el estado del encabezado, y PA-2 y "No se toca", que conservan su texto anterior palabra por palabra.
- **No cambia nada de 03a ni de los pasos 0 a 9 de 03b.** El hunk 16 se inserta después del paso 9 y antes de "**03c**". Las CH3-A y CH3-B01 a B14 no se tocan.
- La lista "Cambios por sección" de la Enmienda 4 coincide con los 17 hunks.

### El remedio, contra el código
**T-03 (editar clase con `maestroIds:`).**
- `alFallar` (`formulario-clase.tsx:68-75`) es el único que decide: `useCrearClase` y `useEditarClase` (`hooks.ts:156-184`) no tienen `onError`, y `app/providers.tsx` no tiene `MutationCache` ni `onError` global.
- Con `erroresDeLaClaseDeApi(error, "editar")` la lista queda en `["nombre", "descripcion"]`:
  - `maestroIds: Revisa este valor.` da `null`, y `toast.error(mensajeDeErrorClases(error))` muestra "Revisa este valor.". `quitarRutaDelMensaje` quita la ruta y, una vez, el campo repetido.
  - `maestroIds:\u{200B}` da el genérico (`textoVisibleOGenerico`).
- Resultado: **exactamente un aviso y ningún `ErrorDeCampo`**. `setErrores` no se llama y el `{}` de `:111` sigue vigente. Las dos rojas de T-03 piden justo eso (`donde: "cualquiera"`, total 1, texto esperado).
- En "crear", la lista es la de siempre, así que la salida no cambia. `maestros-02c-r1.ataque:279-292` es de crear.
- **"El modo de lo enviado" en la clase:** es la prop `modo` que captura el cierre de los callbacks de `mutate`. No puede cambiar entre el envío y la falla, porque crear y editar son rutas y componentes distintos (`CrearClaseView` y `EditarClaseView`). Coincide con lo enviado.

**T-04 (anuncio con `titulo:`).**
- `datos` (`formulario-publicacion.tsx:121`) es `CrearPublicacion`, una unión discriminada por `tipo` (`shared/src/clases.ts:409`). Las `variables` del gancho son `{ ...datos, archivoIds }` y conservan `tipo`.
- `TipoPublicacion` es exactamente `z.enum(["anuncio", "material"])` (`shared/src/clases.ts:391`), así que el `satisfies` de §D-4 compila (PA-11 no salta). Ya hay precedente de `as const satisfies` en `admin/data.ts:67` y `auth/data.ts:102`.
- **Con (a):** el gancho calcula `erroresDeLaPublicacionDeApi(error, "anuncio")`, que da `null`, y avisa una vez. El `catch` del formulario da `null` y no guarda nada. Con la vista desmontada, el `onError` de `useMutation` corre igual (T-30) y el `catch` no avisa: un solo aviso.
- **Con (b):** el gancho calla, porque `["titulo", "texto"]` no da `null`. El `catch` da `null` con "anuncio" y no `null` con "material", así que avisa una vez. La promesa de `mutateAsync` se resuelve aunque la vista se desmonte: un solo aviso.
- **CH3-B16 (e):** `handleSubmit` limpia los errores (`setErrores({})`, `:182`) y en un anuncio ya no se guarda `titulo`, así que al pulsar «Material» no aparece ningún error viejo, con las dos opciones.
- **Material:** su lista es `["titulo", "texto"]`, la misma de antes, y la salida no cambia. `temaId:` sigue dando un aviso en los dos tipos.
- Las dos rojas de T-04 pasan con (a) y con (b) sin tocarlas.

**CH3-B15 (2), la tabla común:** ninguna entrada de `ENTRADAS_FUERA_DE_CONTRATO` nombra `nombre`, `descripcion`, `maestroIds`, `titulo` ni `texto` (`x:`, `campoFueraDeContrato:`, `archivoIds.0`, `limite`… y dos sin ruta que `PREFIJO_DE_CAMPO` no reconoce). La afirmación "da `null` en los cuatro modos" es correcta.

**Lista cerrada vacía: correcta.** La comprobé con grep propio sobre las pruebas:
- `useCrearPublicacion`, `useCrearClase` y `useEditarClase` solo aparecen en un comentario (`clases-r2.ataque:206`).
- `maestroIds:` fuera de las del tester solo aparece en cuerpos de petición y en el caso de crear de `maestros-02c-r1`.
- No hay `"titulo:` en ninguna prueba de `clases` fuera de `formularios-ch3-r1`. `formulario-publicacion.test.tsx:281` es `texto:`.
- `clases-r4.ataque:139-178` prueba crear y editar con `nombre`, `descripcion` y campos ajenos (`maestroId:`, sin `s`), y no cambia.
- CH3-B04, PR-1C02, `refactor-01c-r1` y `errores-ch3-r1.ataque` llaman a `erroresDeFormularioClases` con su propia lista, y la función no cambia.
- Las reglas estáticas que leen `features/clases` no chocan con la forma de §D-4. Revisé `ver-mas-01e-r3` (la expresión de tipos no ve `keyof typeof` ni `satisfies`), `entregas-01d-r1`, `estatico-r1`, `estatico-02c-r1`, `tareas-01d-r1`, `styles/clases-r1` y la O-05 de `errores-ch3-r1`.

**Hermanos: repetí la búsqueda del arquitecto** (`erroresDeFormularioClases\(|erroresDe\w*DeApi\(|errorDe\w*DeApi\(|errorDelCampo\w*\(|erroresDeFormularioDeApi\(|CAMPOS_` en producción) y saqué las mismas 11 filas más la de `admin`/`auth`. Ningún hermano nuevo:
- **`formulario-tarea.tsx`:** pinta sus ocho campos sin condición de modo (`:287-459`, más `EditorDeRubrica` en `:508`).
- **`formulario-de-entrega.tsx:200-206`:** pinta siempre `CampoDeEnlaces`.
- **`panel-de-calificacion.tsx:112`:** el panel decide con `rubrica` y el gancho con `criteriosEnviados` (`tareas/hooks.ts:499-501`). Ya está resuelto (T-02 de CALIFICACIONES-01c) y es el precedente directo de la opción (a).
- **`auth` y `admin`:** `CAMPOS_FORMULARIO_AUTH` y `CAMPOS_FORMULARIO_ADMIN` solo filtran las incidencias locales (`auth/lib.ts:59`, `admin/lib.ts:57`).
- **Literales de lista en producción:** solo hay tres, las de T-03 y T-04 (`formulario-clase.tsx:69`, `formulario-publicacion.tsx:148`, `hooks.ts:617`). Con (a) desaparecen las tres, y CH3-B15 (4) impide que vuelvan.

**Pruebas (reglas de `AGENTS.md`):**
- **Ids y `it.each`:** los ids llevan `CH3-` y hay un `it.each` por módulo (B15 sobre funciones, B16 sobre formularios).
- **`VALIDACION` fuera de contrato:** la clase nueva ("campo que el formulario pinta en otro modo") queda en §D-2 con sus dos filas, con mensaje y sin texto visible. La ruta doble y la ruta con índice (`maestroIds.0: maestroId:`) quedan en B15 y en "Puntos de ataque".
- **CH3-B17:**
  - "Repetir el control" en editar clase y en el anuncio.
  - "Otra sección y regreso antes del `staleTime`" en editar clase, saliendo por «Cancelar». El anuncio queda cubierto por CH3-B10 y O-14 (uno por módulo, S-06 ya aprobado).
  - **Acepto que "pulsar la sección activa" no aplica:** el texto es un toast que no queda en la vista y no nombra ninguna sección. El tester comprobó en O-r1-2 que pulsar la sección activa conserva el formulario y su estado.

### DH-8: (a), (b) y si hay una (c)
**Coincido con (a).**
- **Riesgo de (a):** toca un `hooks.ts` protegido por PA-2. El riesgo real es bajo:
  - Son una importación y dos líneas del `onError` de `useCrearPublicacion`. `renovarTrasError`, `onSuccess` y el comentario de T-30 no cambian.
  - Ninguna regla estática cuenta llamadas en `clases/hooks.ts`. El motivo de PA-2 fueron los conteos de `tareas/hooks.ts`, que (a) no toca.
  - Leer las `variables` en el `onError` del gancho ya es el patrón de `useCalificar` (`onError: (error, { cuerpo })`).
  - PA-11 frena cualquier otra línea.
- **Riesgo de (b):** la decisión queda en dos sitios, con un acoplamiento implícito:
  - El formulario usa `erroresDeLaPublicacionDeApi(error, "material")` como sustituto de la lista literal del gancho, y esa lista sigue en `hooks.ts`.
  - Si cambia `CAMPOS_PINTADOS_DE_LA_PUBLICACION.material` y no la literal, vuelve T-04 (silencio) o aparece un doble aviso. CLASES-03 va a rehacer justo este formulario ("Avisos" y "Recursos", R-09).
  - Además, CH3-B15 (4) tendría que exentar la literal en `hooks.ts`.
- **¿Hay una (c)? No veo una mejor.** Consideré dos y las descarto:
  - **(c1) El gancho recibe la lista o un decisor desde el formulario.** Igual toca `hooks.ts`, ahora con un cambio de firma. Una lista fijada al crear el gancho refleja el `tipo` actual del formulario, no el enviado. Si es una función de las `variables`, es (a) con un rodeo.
  - **(c2) El gancho deja de decidir y el formulario avisa siempre.** Toca más de `hooks.ts`, contradice la convención de T-30 (los avisos viven en el gancho) y cambia el camino de todos los errores de publicar, no solo de este.
- **Coherencia con otros ganchos de `clases`: basta con `useCrearPublicacion`.**
  - `useCrearClase` y `useEditarClase` no tienen `onError`; decide solo el formulario.
  - `useCrearTema` y `useRenombrarTema` (`:800`, `:824`) llaman a la misma `erroresDelTemaDeApi` que el formulario, y los dos modos pintan `nombre`.
  - `useComentar` (`:681`) tiene un solo modo.
  - El gancho de categorías (`:936`, llaves `[]`) decide igual que el editor: el tester lo comprobó en 25 entradas.
  - Tocar cualquiera de ellos sería alcance nuevo.

### Observaciones (no bloquean)
- **O-16 (arbitraje por adelantado, para el tester de la ronda 2).** Un estado vecino de CH3-B16 (f) queda sin declarar: un error de un campo **pintado** con la vista desmontada no da ningún mensaje. Pasa con material `titulo:` y `texto:`, anuncio `texto:`, comentario `texto:` y tema `nombre:`.
  - El gancho calla porque "lo muestra el formulario", y el formulario ya no existe.
  - Es así desde CLASES (T-30), no cambia con (a) ni con (b) y está fuera de CHORE-03.
  - Si el tester lo reporta, lo arbitro como "decisión tomada que no es hallazgo". Igual que con crear y editar clase desmontadas, que el plan ya declara.
  - El orquestador puede pasarlo así en el encargo del tester, para no gastar una ronda en un vecino ya conocido. Si el humano quiere cambiarlo, el sitio es CHORE-04 o el `chore` de foco y navegación.
- **O-17.** El punto 4 del inventario de §D-R0 no nombra dos reglas estáticas que leen todo `features/clases`: `clases/estatico-02c-r1.ataque` y `tareas/tareas-01d-r1.ataque`. Las revisé y la forma de §D-4 no choca con ninguna. No hace falta enmienda.

### Detalles menores
- §D-4 dice "Las líneas son las de `1f11d38e`, que estos archivos conservan". Eso vale para los dos formularios y `hooks.ts`. `data.ts` y `lib.ts` cambiaron en los pasos 4 de 03b, y sus líneas citadas (`data.ts:9`, `:252-259`; `lib.ts:156-159`) son las del árbol actual. Coinciden.
- CH3-B17 deja como respaldo "si no lo hay, con «atrás»". El enlace sí existe (`editar: "Editar clase"` en el encabezado de la clase del administrador), así que el programador debe usarlo.
- CH3-B15 (4) incluye "su definición" entre las apariciones de `erroresDeFormularioClases(` en `lib.ts`, pero la definición es `erroresDeFormularioClases = (` y no coincide con el patrón. Es indiferente si la regla se escribe por archivo, como se lee.

### Lista cerrada para el humano
- **DH-8 (bloquea la ronda 2 de 03b).** Pregunta exacta, la del plan:
  > Para corregir T-03 ("Editar clase" con un `400 VALIDACION` de `maestroIds` no muestra nada) y T-04 ("Publicar un anuncio" con un `400 VALIDACION` de `titulo` no muestra nada), ¿autorizas que en 03b salgan de "No se toca" estos archivos, solo en las líneas de §D-4 (Enmienda 4)?
  > - **(a) Recomendada por el arquitecto y por el manager:** `features/clases/components/formulario-clase.tsx`, `features/clases/components/formulario-publicacion.tsx` y `features/clases/hooks.ts` (solo `useCrearPublicacion`: una importación y dos líneas).
  > - **(b)** Solo los dos formularios, con la decisión partida entre el gancho y el formulario.
  >
  > Sin ninguna, las cuatro pruebas rojas siguen y 03b no puede cerrar.
- Nada más que decidir. O-16 es informativa: solo si el humano quiere cambiar ese comportamiento, que viene de CLASES.

## Verificación del resumen — 03b — ronda 2
Resumen: `resumen-programador-03b-r2.md` (corrección de T-03 y T-04). Plan `plan.md` `eab43ac5…` (Enmiendas 1 a 4, DH-8 = (a)). Corrí todo desde `frontend/`, una suite a la vez. Antes comprobé con `Get-CimInstance` que no hubiera ningún `node` con `vitest`: solo había un proceso ajeno de otra herramienta, que no toqué. Las salidas están en el scratchpad de la sesión: `lint-r2.txt`, `test-r2.txt`, `build-r2.txt`, `list-r2.txt`, `ataque-r1-03b-r2.txt`, `v01-base-03b-r2.txt` y `v01-actual-03b-r2.txt`.

**Veredicto: RESUMEN ACEPTADO (el tester puede atacar la ronda 2).** No hay `M-xx`. Todas las cifras coinciden, V-01 da 217 de 217, "No se toca" está limpio con DH-8 (a) y cada viñeta de CH3-B15 a CH3-B17 tiene su caso.

### Cotejo del plan tras DH-8
- `plan.md`: SHA-256 `eab43ac5e37597a5b26e39e802a4c5331a230d629cd1fa8067c3058aa2a2dc13`. La copia previa `copias-plan/plan-chore03-enmienda4-c5557678.md` da `c5557678…`, igual que `aprobacion.md`.
- `git diff --no-index -U0` de la copia contra el plan da un solo hunk, `@@ -2,2 +2,2 @@`: `Estado: BLOQUEADO` pasa a `Estado: LISTO`, y la nota de la Enmienda 4 dice ahora que DH-8 quedó respondida con (a). **Solo cambian las líneas 2 y 3.**

### Cifras: resumen contra corrida propia
| Qué | Resumen | Corrida propia |
|---|---|---|
| `npm run lint` | `> tsc -b`, sin errores | exit 0; `All matched files use Prettier code style!` y luego `> tsc -b` |
| `npm run test` | `Test Files  224 passed (224)` · `Tests  4141 passed (4141)` | `Test Files  224 passed (224)` · `Tests  4141 passed (4141)`; arranque 10:37:07, `Duration  147.99s` |
| `Test timed out` | 0 | 0 |
| `npm run build` | `✓ built in 1.26s` | exit 0; `✓ built in 747ms`, con el aviso del bloque de más de 500 kB de siempre |
| `npx vitest list` de los cuatro archivos, contando " > " | 21 · 117 · 14 · 88 | `clases/errores-ch3` 21 · `clases/formularios-ch3` 117 · `clases/recuperar-ch3` 14 · `clases/formularios-ch3-r1.ataque` 88 (240 en total) |
| Ids en esa lista | B15 16 · B16 14 · B17 3 (33) | B15 16 · B16 14 · B17 3 (33) |
| Delta contra la ronda 1 del tester | +33 | 4108 → 4141 casos y 224 → 224 archivos: coincide. Por archivo: 5 → 21 (+16), 103 → 117 (+14), 11 → 14 (+3) |
| Las 5 `*.ataque` de la ronda 1, aparte | 88 de 88 en `formularios-ch3-r1` | `Test Files  5 passed (5)` · `Tests  207 passed (207)`, `Test timed out` 0 |

Las cuatro de T-03 y T-04 están en verde con su título exacto en la salida `--reporter=verbose`: "editar clase con «maestroIds: Revisa este valor.» …", "editar clase con «maestroIds:·» …", "publicar un anuncio con «titulo: Revisa este valor.» …" y "publicar un anuncio con «titulo:·» …".

### V-01
Usé el comando de V-01 de `reporte-tester.md`, con la base sacada de "Tabla de SHA-256 de las 217 `*.ataque` al cierre de la ronda 1 de CHORE-03 03b" y pasada a minúsculas.
- Base 217, actual 217, `diff` vacío: `IGUALES`. **217 de 217.**
- `git diff --stat 1f11d38e -- '*.ataque.test.*'` solo trae C-2 (`entregas-01d-r3`) y C-3 (`muro-c-r3`), las reescrituras del tester de la ronda 0, cuyos hash son los de la tabla.
- No hay `.skip`, `.only`, `.todo`, `.fails`, `xit` ni `xdescribe` en los tres archivos del programador ni en las cinco `-ch3-r1.ataque`.

### "No se toca"
- `git diff --stat 1f11d38e -- frontend shared backend infra package.json package-lock.json eslint.config.mjs` da **26 archivos**: los 23 de la ronda 1 (los 19 de producción de 03b, N-L1, N-L2, C-2, C-3 y `lib/errores-de-api-estatico.test.ts` de CH3-B13; ver mi verificación de la primera entrega) más `components/formulario-clase.tsx`, `components/formulario-publicacion.tsx` y `features/clases/hooks.ts`, que DH-8 (a) autoriza.
- Hay **11 archivos sin seguimiento**: las 6 pruebas del programador y las 5 `-ch3-r1.ataque` del tester. Ninguno es de producción. `CLAUDE.md`, `AGENTS.md`, `.claude/`, `README.md` y los `.env.example` no cambian. Fuera de `docs/`, `git status` muestra 37 entradas: 26 + 11.
- **El diff de `hooks.ts` contra `1f11d38e` es una importación y dos líneas de `useCrearPublicacion`** (`5 +++--`), literal:

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

  Coincide carácter por carácter con el que transcribe el resumen. `renovarTrasError`, el comentario y `onSuccess` no cambian. `erroresDeFormularioClases` sigue importado porque lo usa `useComentar` (`:682`).
- **Los dos formularios cambian solo la importación y una llamada** (`2 +-` cada uno):
  - `formulario-clase.tsx`: `:16` importa `erroresDeLaClaseDeApi` en lugar de `erroresDeFormularioClases`, y `:69` es `erroresDeLaClaseDeApi(error, modo)`. El comentario de `:64-67`, el `if (mutacion.isPending) return` (sin ref, fila 2 de CHORE-04) y el `enEspera=` no cambian.
  - `formulario-publicacion.tsx`: la importación de `../lib` (`:26`) y `:148`, `erroresDeLaPublicacionDeApi(error, datos.tipo)`, con el `datos` del parámetro de `handlePublicar` (`:121`), no el estado `tipo`.
- Nada de `components/`, `app/` ni `services/` cambia más allá de §D-5 (un solo hunk en `apiClient.ts`, igual que en la primera entrega). `tareas` solo cambia por N-46, `calificaciones` solo por el alias y N-46, y `admin`, `auth` y `diagnostico` no cambian.
- Documentos por hash: `PRD.md` `a10c5c23…`, `ARCHITECTURE.md` `75c3c75d…`, `ARCHITECTURE-ESSENTIALS.md` `7c05fd61…`, `DESIGN.md` `8d977dc4…` y §2b de `ESTADO.md` (con `awk`, de `## 2b.` hasta antes de `## 3.`) `6ecbc366…`. **Los cinco son iguales.**

### El remedio, contra §D-4 (Enmienda 4)
- **`clases/data.ts:261-271`:** las dos constantes están después de `TRADUCCION_DE_ERRORES_CLASES`, con un comentario de dos líneas que dice el porqué. `CAMPOS_PINTADOS_DE_LA_CLASE` es `as const` y `CAMPOS_PINTADOS_DE_LA_PUBLICACION` es `as const satisfies Readonly<Record<TipoPublicacion, readonly string[]>>`, con los valores exactos de §D-4. `TipoPublicacion` entra en la `import type` de `./types` (`:9`). No se declara ningún tipo nuevo.
- **`clases/lib.ts:164-175`:** `erroresDeLaClaseDeApi(error, modo: keyof typeof CAMPOS_PINTADOS_DE_LA_CLASE)` y `erroresDeLaPublicacionDeApi(error, tipo: TipoPublicacion)` están después de `erroresDeFormularioClases`, cada una con su comentario de una línea. Las dos constantes se suman a la importación de `./data` y `TipoPublicacion` a la `import type` de `./types`. **`erroresDeFormularioClases` (`:159-162`) no cambia:** el diff contra `1f11d38e` no la toca.
- **El modo sale de lo enviado:**
  - En la clase es la prop `modo`, que capturan los callbacks de `mutate`.
  - En la publicación es `datos.tipo` en el formulario y en el gancho. Las `variables` de `crear.mutateAsync` son `{ ...datos, archivoIds }` y conservan el `tipo`.
  - Cambiar de tipo con la petición en vuelo no es posible: `elegirTipo` y `handleSubmit` salen con `publicandoRef.current || crear.isPending` (`formulario-publicacion.tsx:161` y `:167`).
- **Crear clase y material deciden lo mismo que antes:** sus listas son las literales de `1f11d38e` (CH3-B15 (3)), y `maestros-02c-r1.ataque` sigue en verde en la suite completa.
- **CH3-B15 (4) tiene la variante de DH-8 (a).** Con mi propio grep, `erroresDeFormularioClases(` solo aparece en producción en:
  - `lib.ts`, 4 veces: las dos funciones nuevas, `errorDelCampoCodigo` y `erroresDelTemaDeApi`;
  - `formulario-comentario.tsx:46`;
  - `hooks.ts:682`, una sola vez (`useComentar`, `["texto"]`).

  `["nombre", "descripcion", "maestroIds"]` y `["titulo", "texto"]` solo están escritos en `data.ts` (`:264` y `:270`). La prueba lo comprueba por archivo, que es como hay que leer la regla (detalle menor de mi revisión de la Enmienda 4).

### Pruebas requeridas, una por una (contra `npx vitest list` y leídas)
- **CH3-B15 (1)**, `errores-ch3.test.ts`: `it.each` de las 10 filas exactas del plan (crear × 3 sí; editar × `nombre` y `descripcion` sí, `maestroIds` no; anuncio × `texto` sí, `titulo` no; material × 2 sí). Por fila prueba:
  - el mensaje y la ruta doble, que dan `{ [campo]: MENSAJE_DE_PRUEBA }` si lo pinta, o `null` con `mensajeDeErrorClases` igual a `MENSAJE_DE_PRUEBA` si no;
  - cada resto de `RESTOS_SIN_TEXTO_VISIBLE`, que da `{ [campo]: GENERICO }`, o `null` con el genérico.

  Es lo que pide el plan.
- **CH3-B15 (2)**: `it.each` de los 4 modos sobre `ENTRADAS_FUERA_DE_CONTRATO`, con la guarda de que la tabla no esté vacía.
- **CH3-B15 (3)**: `toEqual` de las dos listas.
- **CH3-B15 (4)**: estática con `import.meta.glob` `?raw` sobre la producción de `features/clases`, con la variante (a) descrita arriba.
- **CH3-B16**, `formularios-ch3.test.tsx`: `it.each` de 12 casos (6 filas × «con mensaje» y `\u{200B}`), uno por módulo.
  - Si no lo pinta: `avisos()` es exactamente `[esperado]`, `erroresDeCampo()` está vacío, `queryAllByText(esperado)` da 0 y no hay ningún `aria-invalid="true"`. Las dos últimas cierran el hueco de O-15, porque el `ErrorDeCampo` del selector de maestros no lleva `id` con `-error`.
  - Si lo pinta: ningún aviso, un solo texto, y la descripción accesible del control lo contiene (en crear clase, el grupo «Maestros de la clase»).
  - En los dos casos: sin ruta ni `\u{200B}`, lo escrito se conserva y el botón sale de la espera (`conservadoYSinEspera`).
- **CH3-B16 (e)**: tras el aviso, «Material» deja el título sin `aria-invalid`, sin descripción y sin el texto, con un solo aviso.
- **CH3-B16 (f)**: retiene la publicación, desmonta con `cleanup()`, suelta `titulo: …` y verifica exactamente un aviso, `MENSAJE_DE_PRUEBA`, que da el gancho con (a).
- **CH3-B17**, `recuperar-ch3.test.tsx`:
  - **Repetir el control**: `it.each` de 2 casos. Prueba el aviso genérico, una sola petición, la segunda petición con lo conservado en el cuerpo, el éxito de cada uno (en editar, navega a `/admin/clases/:claseId`; en el anuncio, vacía el campo) y que `avisos()` sigue siendo `[GENERICO]`.
  - **Otra sección y regreso**: con `rutas` y `Providers` y sesión de admin. Sale por «Cancelar» y vuelve por el enlace «Editar clase» (`TEXTOS_CLASE.editar`) a los 10 s del reloj fijo, menos que los 30 s del `staleTime` de `providers.tsx`. El formulario se monta con «Álgebra I», sin error ni genérico, y «Guardar cambios» manda el segundo `PUT` y da el éxito. **Cumple el camino del plan:** §D-4 pide el enlace de la vista de la clase y deja «atrás» solo como respaldo si no lo hubiera. Yo mismo señalé que el enlace existe.
  - **Pulsar la sección activa**: acepto que no aplica, con el razonamiento del plan que ya aprobé (el texto es un toast que no queda en la vista, no nombra ninguna sección, y O-r1-2 del tester comprobó que el formulario conserva su estado).
  - **El anuncio por otra sección**: sin caso, como dice el plan (CH3-B10 y O-14).

### Hermanos, campos por modo y estados del mecanismo, contra el código
- **Los doce hermanos coinciden con el código y con mi búsqueda de la Enmienda 4.**
  - 1 y 2 aplican y se aplicaron.
  - 3 (comentario, `["texto"]` en `formulario-comentario.tsx:46` y `hooks.ts:682`), 4 (tema: `erroresDelTemaDeApi`, `lib.ts:334`, `["nombre"]` en los dos modos, fijado además por CH3-B16), 5 (unirse, `["codigo"]`, `lib.ts:185`), 6 (categorías) y 7 (controles sin campos) no aplican y no cambiaron.
  - 8 a 11 (`tareas`) no aplican y no se tocaron (03a cerrada).
  - 12 (`admin` y `auth`) queda como punto de ataque de 03c.
  - Ningún "no aplica" va sin razón.
- **Tabla de campos por modo:** coincide con las listas de `data.ts` y con el contrato.
  - `maestroIds.0: maestroId:` da `null` en los dos modos de la clase, porque `PREFIJO_DE_CAMPO` (`lib/errores-de-api.ts:23`, `[a-zA-Z_]+`) no reconoce `maestroIds.0` como campo. Va a un aviso desde `alFallar`.
  - La tabla fuera de contrato da `null` en los cuatro modos (CH3-B15 (2)).
- **«Material» tras un `titulo:` en un anuncio:** el `catch` ya no guarda `titulo` porque `erroresDeLaPublicacionDeApi(error, "anuncio")` da `null`, y `handleSubmit` limpia con `setErrores({})` antes de cada envío. Lo cubre CH3-B16 (e).
- **Vista desmontada:**
  - En el anuncio, un solo aviso, del gancho (CH3-B16 (f)).
  - En crear y editar clase no hay aviso, igual que en `1f11d38e`: O-16 se respetó y no hay ningún "arreglo" (los callbacks de `mutate` no cambian).
- **Dos fallos seguidos sin caso propio: lo acepto.** El mecanismo no guarda estado entre envíos:
  - los dos formularios hacen `setErrores({})` antes de enviar (`formulario-clase.tsx`, en las dos ramas, antes de `mutate`; `formulario-publicacion.tsx`, antes de `handlePublicar`);
  - el gancho decide con las `variables` de cada mutación.

  Un segundo fallo pasa por el mismo camino que el primero, que CH3-B16 ya cubre, y CH3-B17 cubre el paso de un fallo a un éxito. Se lo dejo al tester como O-18.
- **Matriz §D-6 por modo:** coincide con el código.
  - **Crear y editar clase:** `alFallar` es el único que avisa, porque `useCrearClase` y `useEditarClase` no tienen `onError`. Nada se renueva, el foco no se mueve, sigue sin ref (CHORE-04, fila 2) y no hay aviso con la vista desmontada.
  - **Anuncio y material:** avisa el gancho, `renovarTrasError` no cambia, la ref es `publicandoRef` y hay un solo aviso con la vista desmontada.
  - Las salidas por modo son las de la tabla.
- **Reglas estáticas (grep propio):**
  1. `mensajeDelAvisoDeCalificar` solo está en `tareas/hooks.ts` y `tareas/lib.ts`.
  2. `disabled`, `?? []`, `fetch(` y `console.` en `tareas/{lib,data,hooks}.ts`: 0.
  3. Script propio de Python sobre los 196 archivos de producción de `frontend/src` (los mismos 196 de la primera entrega: no hay archivos de producción nuevos). Sin U+2800 ni U+1D159 (literales o como escape), `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =` ni `\r\n|\r` escrito.
  4. `esErrorDeCursor =` solo está en `lib/errores-de-api.ts:37`. `esErrorDeCursor(` no aparece en `features/calificaciones`.
  5. `features/calificaciones` tiene 11 archivos de producción, y ninguno lee `.message`.
  6. No hay `interface` ni `type` declarados en `clases/{data,lib,hooks}.ts`. Los únicos aciertos son especificadores `type X` dentro de importaciones de `hooks.ts`, que ya estaban.
  7. El mismo script no encontró ningún invisible literal en producción ni en las pruebas `-ch3` del programador ni en `errores-de-api-estatico.test.ts`.
  8. Punto 4 de §D-R0 de la Enmienda 4:
     - `disabled`, `?? []`, `fetch(`, `console.`, `new RegExp(` y `.split(":")` en `clases/{data,lib,hooks}.ts`, `formulario-publicacion.tsx` y `formulario-clase.tsx`: 0.
     - `enEspera=`: 1 en cada formulario.
     - Ninguna línea `+` del diff de `features/clases` contiene `.message`.
     - Las estáticas de `clases` (`ver-mas-01e-r3`, `entregas-01d-r1`, `estatico-r1`, `estatico-02c-r1`, `tareas-01d-r1`, `styles/clases-r1`, `errores-ch3-r1`) están en verde en la suite completa.
     - Hay 4 archivos `-ch3-r1.ataque` en `clases`, `calificaciones` y `services`, como exige `errores-ch3-r1:494`.

### Observaciones (no bloquean)
- **O-18 (tester, dos fallos seguidos).** No tiene caso propio, y lo acepto por la razón de arriba. Si el tester lo ataca, propongo estas secuencias:
  - en el anuncio: `titulo:` → `texto:` → `titulo:`;
  - en editar clase: `maestroIds:` → `nombre:` → `maestroIds:`.

  Por cada envío espero un solo mensaje, y que el `ErrorDeCampo` del envío anterior desaparezca cuando el siguiente es un aviso. Si falla, es un hallazgo de la ronda 2.
- **O-19 (tester o cierre, caminos de CH3-B17).**
  - **«Atrás» del historial:** después de «Cancelar», regresar a «Editar clase» con «atrás» (y volver con «adelante») es un camino que la interfaz permite y que no tiene caso. El plan eligió el enlace y lo acepté. El resultado debería ser el mismo, porque el formulario se vuelve a montar con estado local. El tester puede atacarlo.
  - **«Repetir el control»:** se monta con un router mínimo y un `QueryClient` propio, no con `rutas` y `Providers`. Para una mutación no hay diferencia, porque `providers.tsx` no configura `mutations` y su `retry` por defecto (0) equivale al `retry: false` de la prueba. Además, el segundo caso de B17 sí repite «Guardar cambios» con `rutas` y `Providers`. Lo anoto porque la regla de `AGENTS.md` pide el router real en cada camino.
- **O-16 (sigue).** Se respetó sin cambio. Si el tester lo reporta, lo arbitro como decisión tomada.

### Detalles menores
- El resumen cita las guardas de `elegirTipo` y `handleSubmit` en `formulario-publicacion.tsx:160` y `:166`. En el árbol están en `:161` y `:167`. Es una referencia de línea, no una cifra de conteo ni de corrida: no devuelve el resumen.
- Los títulos de `it.each` con `$objeto.campo` salen entre comillas simples, y vitest recorta el nombre largo de CH3-B17 ("sin te…"). El programador lo declaró. Los títulos completos están en `npx vitest list`.
- `build` tardó 747 ms en mi corrida y 1.26 s en la del programador. Es una diferencia de tiempo, no de resultado.

## Revisión final — 03b — CHORE-03
Plan vigente: `plan.md` `eab43ac5e37597a5b26e39e802a4c5331a230d629cd1fa8067c3058aa2a2dc13` (Enmiendas 1 a 4, DH-8 = (a)). Rama `chore/chore-03-errores-api`. Base dentro de `frontend/`: `1f11d38e`. Base fuera de los paquetes: `ad10844`.

Corrí todo desde `frontend/`, una suite a la vez. Antes comprobé con `Get-CimInstance` que no hubiera ningún `vitest` en marcha: solo estaba el proceso ajeno de `.cache\codex-runtimes`, que no toqué. Las salidas están en el scratchpad de la sesión: `lint-03b-final.txt`, `test-03b-final.txt`, `build-03b-final.txt`, `list-03b-final.txt`, `v01-base-final.txt` y `v01-actual-final.txt`.

**Veredicto: APROBADO CON OBSERVACIONES.** No hay `M-xx`, así que nada bloquea 03b. Cada observación tiene destino: 03c, CHORE-04, CLASES-03, el cierre o ninguno.

Verificación propia:
- **lint:** exit 0; `All matched files use Prettier code style!` y luego `> tsc -b`.
- **test:** `Test Files  225 passed (225)` · `Tests  4182 passed (4182)`. Arrancó a las 11:19:01 y duró `Duration  211.92s`. `Test timed out`: 0.
- **build:** exit 0; `✓ built in 2.77s`, con el aviso de siempre del bloque de más de 500 kB.

### Cifras: corrida propia contra la del tester (ronda 2)
| Qué | Tester, ronda 2 de 03b | Corrida propia |
|---|---|---|
| `npm run lint` | exit 0, `> tsc -b` | exit 0, `> tsc -b` |
| `npm run test` | `Test Files  225 passed (225)` · `Tests  4182 passed (4182)` | Las mismas dos líneas |
| `Test timed out` | 0 | 0 |
| `npm run build` | — (no lo corre) | exit 0, `✓ built in 2.77s` |
| `npx vitest list`, contando " > " | `formularios-ch3-r2` 41 | Del programador: `clases/errores-ch3` 21 · `calificaciones/errores-ch3` 1 · `clases/formularios-ch3` 117 · `clases/consultas-ch3` 21 · `clases/recuperar-ch3` 14 · `services/apiClient-ch3` 2 · `lib/errores-de-api-estatico` 3. Del tester: `clases/errores-ch3-r1` 91 · `clases/formularios-ch3-r1` 88 · `clases/recuperar-ch3-r1` 3 · `calificaciones/cursor-ch3-r1` 7 · `services/apiClient-ch3-r1` 18 · `clases/formularios-ch3-r2` 41 |
| Ids en esa lista | — | B01 a B06: 1 cada uno · B07 47 · B08 50 · B09 21 · B10 11 · B11 a B13: 1 cada uno · B14 6 · B15 16 · B16 14 · B17 3 |

Cadena de cifras de 03b, del cierre de 03a a hoy. Todo cuadra:

| Momento | Archivos | Casos | Diferencia |
|---|---|---|---|
| Cierre de 03a | 213 | 3757 | — |
| Primera entrega del programador | 219 | 3901 | +6 archivos y +144 casos |
| Ronda 1 del tester | 224 | 4108 | +5 y +207 |
| Ronda 2 del programador | 224 | 4141 | +0 y +33 |
| Ronda 2 del tester | 225 | 4182 | +1 y +41 |

### V-01
Usé el comando de V-01 de `reporte-tester.md`, con la base sacada de "Tabla de SHA-256 de las 218 `*.ataque` al cierre de la ronda 2 de CHORE-03 03b" y pasada a minúsculas.
- Base 218, actual 218 (versionadas y sin seguimiento), `diff` vacío: `IGUALES`. **218 de 218.**
- Contra `1f11d38e`, solo cambian dos `*.ataque`: C-2 (`entregas-01d-r3`) y C-3 (`muro-c-r3`), las reescrituras A-5 de la ronda 0. Sus hashes son los de la tabla.
- No hay `.skip`, `.only`, `.todo`, `.fails`, `xit` ni `xdescribe` en las 12 pruebas nuevas ni en las tres normales que cambiaron (N-L1, N-L2 y la estática de CH3-B13).

### "No se toca" contra `1f11d38e` (dentro de `frontend/`) y `ad10844` (fuera)
- `git diff --stat 1f11d38e -- frontend shared backend infra package.json package-lock.json eslint.config.mjs .env.example CLAUDE.md AGENTS.md .claude README.md` da **26 archivos, con 159 inserciones y 112 borrados**, todos en `frontend/src`:
  - **Producción, los 19 de "Cambios por capa › 03b":**
    - `lib/errores-de-api.ts`: solo se borra `quitarPrefijoDeCampo`.
    - `services/apiClient.ts`: un hunk, la constante y el comentario de §D-5 carácter por carácter.
    - `tareas/data.ts` y `tareas/lib.ts`: N-46.
    - `calificaciones/data.ts` y `lib.ts`: N-46, el alias y las importaciones exactas de M-01.
    - `clases/data.ts` y `lib.ts`.
    - Las once vistas de consulta de §D-4, cada una con solo la llamada y su importación.
  - **Los tres de DH-8 (a):**
    - `formulario-clase.tsx`: la importación y `:69`.
    - `formulario-publicacion.tsx`: la importación y `:148`.
    - `clases/hooks.ts`: una importación y las dos líneas de `useCrearPublicacion`, y nada más.
  - **N-L1** (`clases/lib.test.ts:134`) y **N-L2** (`calificaciones/estatico-01d.test.ts:137`), cada una solo en su línea.
  - **C-2 y C-3**, las del tester.
  - **`lib/errores-de-api-estatico.test.ts`**, por CH3-B13.
- **Hay 12 archivos nuevos y todos son pruebas:** las 6 del programador (`clases/errores-ch3`, `clases/formularios-ch3`, `clases/consultas-ch3`, `clases/recuperar-ch3`, `calificaciones/errores-ch3` y `services/apiClient-ch3`) y las 6 `*.ataque` del tester (5 de la ronda 1 y 1 de la ronda 2). Ninguno es de producción. Afuera de `docs/`, `git status` da 26 + 12 = 38 entradas.
- **Lo que no cambió:**
  - En `frontend/src`: `components/`, `app/`, `admin`, `auth`, `diagnostico`, `calificaciones/gradebook-view.tsx`, `mis-calificaciones-view.tsx` ni sus componentes; de `hooks.ts`, ninguno salvo las tres líneas de DH-8 (a).
  - Desde `ad10844`: `shared/`, `backend/`, `infra/`, `.env.example`, `CLAUDE.md`, `AGENTS.md`, `.claude/` ni `README.md`.
- **Documentos, por hash:** `PRD.md` `a10c5c23…`, `ARCHITECTURE.md` `75c3c75d…`, `ARCHITECTURE-ESSENTIALS.md` `7c05fd61…`, `DESIGN.md` `8d977dc4…` y §2b de `ESTADO.md` `6ecbc366…` (con `awk`, de `## 2b.` hasta antes de `## 3.`). **Los cinco coinciden.**

### Revisión final del código de 03b contra el plan y `CLAUDE.md`
- **§D-4 `clases`:**
  - `MENSAJES_POR_CODIGO_DE_CLASES` pasa a `data.ts` con el mismo contenido.
  - `TRADUCCION_DE_ERRORES_CLASES` se tipa con `satisfies` e `import type`; `textosPorCampo` solo tiene `claseId`.
  - `mensajeDeErrorClases` y `mensajeDeConsultaClases` son envoltorios de una línea.
  - `mensajeDeErrorDeLista` usa `esErrorDeCursor(error)`: el valor por defecto `["cursor"]` equivale a la comparación de antes.
  - `erroresDeCategoriasDeApi` pasa por el contrato en sus dos caminos.
  - `erroresDeFormularioClases` no cambia.
- **§D-4 `clases`, Enmienda 4:**
  - Las dos constantes están en `data.ts`, con la forma exacta (`as const` y `as const satisfies Readonly<Record<TipoPublicacion, readonly string[]>>`).
  - Las dos funciones están en `lib.ts`.
  - El modo sale de lo enviado: la prop `modo` en la clase y `datos.tipo` en el formulario y en el gancho.
  - Las listas literales solo quedan en `data.ts`, y CH3-B15 (4) lo fija.
- **§D-4 `calificaciones` (M-01):**
  - `export const esErrorDeCursorDeCalificaciones = esErrorDeCursor`, sin llamar a `esErrorDeCursor(` (CAL-1D09).
  - Las dos importaciones son exactamente las de §D-4.
  - `mensajeDeErrorCalificaciones` no cambia y no nace `TRADUCCION_DE_ERRORES_CALIFICACIONES`.
  - Siguen siendo 11 archivos de producción.
- **§D-5 (N-46), sin ciclo:**
  - `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` se declara una sola vez en producción, en `services/apiClient.ts:21`.
  - La importan `tareas/lib.ts:15` y `calificaciones/lib.ts:4`.
  - `apiClient.ts` sigue importando solo `@campus/shared`, `./navegacion` y `./tokenAcceso` (CH3-B12).
  - `procesar` y `perderSesion` no cambian (S-12).
- **`quitarPrefijoDeCampo` borrado:** no aparece en ningún archivo de producción de `src/`. `MENSAJES_ERROR_CLASES` solo sobrevive en el comentario histórico de `clases/data.ts:239`.
- **Estilo:**
  - Retornos tempranos sin `if/else` anidados.
  - Ningún `any`, ni en producción ni en las pruebas del programador.
  - Ningún `interface` ni `type` nuevo: `modo: keyof typeof …` es una expresión de tipo en la firma, no un tipo declarado, y `TipoPublicacion` ya existía en `clases/types.ts`.
  - Ningún texto de interfaz nuevo: las constantes nuevas son nombres de campo (S-02).
  - Ningún `?? []`. El `fila[1] ?? ""` de `erroresDeCategoriasDeApi` ya estaba.
  - Los comentarios explican el porqué.
- **Reglas estáticas:** las comprobé en las verificaciones de la primera entrega y de la ronda 2, y siguen en verde en la suite completa (CH3-B13, CH3-B15 (4), CAL-1D09, CAL-T-182, `errores-ch3-r1` con O-05, `entregas-01d-r3` C-2, y `ver-mas-01e-r3`, `estatico-02c-r1` y `styles/clases-r1`). Desde la ronda 2 no cambió ningún archivo de producción: el diff es el mismo que verificó el tester (`26 files changed, 159 insertions(+), 112 deletions(-)`).
- **Cobertura de las pruebas requeridas:** CH3-B01 a CH3-B17 tienen todas su caso, con el id en el título (cifras arriba). `it.each` por módulo, como indicó el humano:
  - B07, B08, B10, B14, B15 y B16 usan `it.each` sobre sus filas, con una función de montaje por archivo.
  - B17 tiene un `it.each` para repetir el control y un caso con `rutas` y `Providers`.
  - Las `*.ataque` del tester van por bloque.
- **Hallazgos del tester:** T-03 y T-04 están corregidos con el remedio de la Enmienda 4. Las cuatro rojas pasan sin tocarlas. La mutación de confirmación del tester las vuelve a poner en rojo con cada uno de los tres mutantes. No hay desacuerdos entre el programador y el tester que arbitrar.

### Definición de terminado (`AGENTS.md`)
| Punto | Resultado |
|---|---|
| Cumple el requisito | Sí: la fila de T-04 y T-05 de CALIFICACIONES-01c en §3, en su parte de `clases` y `calificaciones`, más N-46 y R-15 en los "Ver más" de `clases` |
| Capas y middleware | No aplica: solo cambia el frontend, y ninguna seguridad queda solo en la interfaz |
| `lint`, `test` y `build` | En verde, con mi corrida |
| Pruebas de autorización | No aplica: no hay endpoint nuevo |
| Migración | No aplica |
| `infra/` y `.env.example` | No aplica |
| Documentos | "Documentos a actualizar" se aplica al cerrar 03c (A-1 a A-3). En 03b no cambia ninguna decisión, tabla ni comando |

### Lista de diseño (03b toca `frontend/`)
- No hay ningún texto ni patrón visual nuevo (S-02). `DESIGN.md` no cambia, y su hash coincide.
- Ningún componente visual cambió: ni clases, ni tokens, ni `components/ui/`. Las vistas solo cambian la función que elige el mensaje que ya mostraba `MensajeError`.
- El estado no se comunica solo con color: los mensajes son los textos de siempre, en `MensajeError`, `ErrorDeCampo` o un aviso.
- El foco no se movió (§D-6), y los estados de error, carga y vacío siguen en su orden.
- **Sin verificar:** 360 px y el navegador. Ningún agente abre un navegador, y no hay nada visual nuevo que mirar.

### Arbitraje de las observaciones abiertas
| Observación | Arbitraje | Destino |
|---|---|---|
| **O-12**: un `400 cursor:` en «Ver más alumnos» de "Personas" y del roster ahora muestra el genérico | Es un cambio visible **declarado** que prevén §D-4, S-01 y DH-1. La salida mejora: deja el fragmento "no es válido" y da un texto que ya existía | El resumen para el humano (abajo) y `aprobacion.md`. Al cerrar 03c, la fila de §3 de `ESTADO.md` lo menciona |
| **O-13**: ataque a «Ver más alumnos» en las dos vistas | **Cerrada.** El tester la atacó en la ronda 1: 14 casos, con 7 mensajes en cada vista. Resiste | Ninguno |
| **O-14**: los caminos de regreso de CH3-B10 | **Cerrada.** El tester probó en la ronda 1 la sección activa, la barra y atrás/adelante. Resiste | Ninguno |
| **O-15**: `maestroIds:` con el `ErrorDeCampo` que usa `useId()` | **Cerrada.** En crear clase resiste. En editar clase destapó T-03, que la ronda 2 corrigió. CH3-B16 ya localiza el error por el grupo y su descripción accesible | Ninguno |
| **O-16** y **O-r2-1**: con la vista desmontada, el `VALIDACION` de un campo que el formulario **sí** pinta no da ningún mensaje | **Decisión tomada, no es hallazgo.** Viene de CLASES (T-30): el gancho calla porque "lo muestra el formulario", y el formulario ya no está. 03b no lo cambia ni con (a) ni con (b). Abarca, por su nombre: material con `titulo:` y con `texto:`, **anuncio con `texto:`** (O-r2-1), comentario con `texto:` y tema con `nombre:`; en crear y editar clase, todo error con la vista desmontada (callbacks de `mutate`), como declara el plan. Es real: una publicación que no salió y que nadie avisa. Arreglarlo es cambiar ganchos y la convención de T-30, fuera del alcance del chore | **CLASES-03**: su plan rehace el formulario de publicación y su gancho («Avisos» y «Recursos», R-09) y decide ahí si el gancho avisa cuando el formulario ya no está montado, también en comentario y tema. El orquestador lo registra en §3 de `ESTADO.md` con ese destino. Si el humano prefiere otro, el `chore` de foco y navegación es la alternativa. No es CHORE-04, porque no tiene que ver con el doble clic |
| **O-17**: dos reglas estáticas que §D-R0 no nombra | **Cerrada.** No chocan: las dos están en verde en la suite completa | Ninguno |
| **O-18**: dos fallos seguidos | **Cerrada.** El tester la cubrió en la ronda 2 con 32 secuencias, incluidas las dos que propuse. Hay exactamente un mensaje por envío | Ninguno |
| **O-19**: atrás y adelante tras «Cancelar», y repetir el control con el router real | **Cerrada** en la ronda 2, con 5 casos usando `rutas` y `Providers` | Ninguno |
| **O-r1-1**: los 10 controles sin ref de 03b son exactamente las filas 1 a 6 y 19 a 22 de la lista de CHORE-04 | Confirmada. No hay filas nuevas para la lista: los dos resúmenes de 03b no traen ninguna "nuevo, para la lista de CHORE-04" | CHORE-04, sin cambios en su lista |
| **O-r1-2**: pulsar la sección activa conserva el formulario | Lo que dice S-06 | Ninguno |
| **O-r1-3**: `import.meta.glob` no incluye al archivo que lo llama, así que una regla de "todo `src/`" nunca se revisa a sí misma | Correcta, y el tester ya la resolvió en su archivo | **03c, CH3-C07:** el archivo de la regla estática de todo `src/` se revisa desde otro archivo, o lleva los invisibles solo como escapes con una revisión cruzada. Nota para el programador y el tester de 03c |
| **O-r1-4**: el remedio caía fuera de "Cambios por capa" | Resuelta con la Enmienda 4 y DH-8 (a) | Ninguno |
| **O-r2-2**: en un material, el `titulo:` del último envío reaparece al pasar a «Anuncio» y volver a «Material» sin enviar | No es hallazgo. Ya pasaba en `1f11d38e`, es el error del último envío sobre el mismo valor (que la persona ya vio), el siguiente envío lo limpia, y nunca da dos mensajes ni ninguno por envío | **CLASES-03**, como nota del plan, junto con O-16 (es el mismo formulario). Nada en CHORE-03 |
| **O-r2-3**: los títulos de `it.each` con `$objeto.campo` salen recortados | Es de forma. No cambia ninguna cifra, y los ids están completos en `vitest list` | **03c**: para el programador, títulos con `%s` sobre tuplas o un nombre corto y único por fila. No se corrige en 03b |
| **O-05**: copias de la expresión de ruta | El tester la extendió en la ronda 1 a `clases` y `calificaciones` (`errores-ch3-r1.ataque`), y resiste | **03c**: el tester la extiende a `admin` y `auth`, y CH3-C07 a todo `src/` (con O-r1-3) |

### Rondas y hermanos (para `ESTADO.md` §6)
- **03b tuvo 1 ronda extra del tester:** la ronda 1 dio ROTO y la ronda 2 RESISTE a la primera. **De esa ronda, 0 fueron por hermanos o estados vecinos que el programador no aplicara.**
- **T-03 y T-04 son un patrón que el plan no había inventariado.** Su clase de `VALIDACION` fuera de contrato, "un campo que el formulario acepta en otro modo y no pinta en este", no estaba en §D-2: F1 usaba `campoFueraDeContrato`.
- **Los dos defectos ya estaban antes.** Viven en `formulario-clase.tsx`, `formulario-publicacion.tsx` y `clases/hooks.ts`, que no cambiaron entre `1f11d38e` y la ronda 1 y estaban en "No se toca" (PA-2 y PA-3).
- **El programador no podía extender ningún remedio a esos archivos sin una PARADA.** Ningún remedio suyo de 03b tocaba ese mecanismo. Lo resolvió la Enmienda 4 con DH-8 (a).
- **Las dos cosas se distinguen.** En la ronda 2, con el remedio en sus manos, el programador cubrió todos los estados vecinos (crear, editar, anuncio, material, cambio de tipo, vista desmontada, dos fallos seguidos, volver antes del `staleTime`), y el tester no encontró ninguno abierto.
- **Acumulado del encargo:** 03a, 1 ronda extra (0 por hermanos); 03b, 1 ronda extra (0 por hermanos). En total, **2 rondas extra y 0 por hermanos o estados vecinos**, sin ningún resumen devuelto (4 de 4 aceptados).
- **No se activa la regla de `AGENTS.md`.** El programador sigue con `opus` y esfuerzo `medium` (frontmatter, desde TAREAS-01d).
- **Lección para los planes (propuesta, sin bloquear):** las dos rondas extra del encargo vinieron de supuestos o de inventarios del plan, no del programador. La regla de `AGENTS.md` sobre los `VALIDACION` fuera de contrato podría nombrar "un campo que el formulario pinta solo en otro modo" junto a "un campo que el formulario no pinta". Se puede proponer al humano al cerrar 03c, junto con A-3.

### Lo que el orquestador aplica al cierre de 03b
1. **En `aprobacion.md`:**
   - El veredicto de esta revisión.
   - **Plan vigente al cierre de 03b: `plan.md` SHA-256 `eab43ac5e37597a5b26e39e802a4c5331a230d629cd1fa8067c3058aa2a2dc13`** (Enmiendas 1 a 4, DH-8 = (a)). Lo verifiqué al empezar esta revisión: el archivo da ese hash.
   - O-12 como cambio visible declarado.
2. **En `docs/ESTADO.md`, sin tocar §2b** (§2b se verifica después con su hash, `6ecbc366…`):
   - §2: el avance de 03b.
   - §6: la medición de arriba.
   - §3: la fila de O-16 y O-r2-1 con destino CLASES-03, y O-r2-2 como nota de ese mismo plan.
   - La lista de CHORE-04 no cambia (O-r1-1).
3. **Bloque de commit de 03b para el humano:** `git status` y `git add` con estas rutas:
   - **Modificados (26):**
     - `frontend/src/features/calificaciones/{data.ts,estatico-01d.test.ts,lib.ts}`
     - `frontend/src/features/clases/{categorias-view.tsx,clase-layout.tsx,data.ts,editar-clase-view.tsx,hooks.ts,lib.test.ts,lib.ts,maestros-de-clase-view.tsx,muro-c-r3.ataque.test.tsx,personas-view.tsx,trabajo-view.tsx}`
     - `frontend/src/features/clases/components/{buscador-alumnos.tsx,buscador-de-maestros.tsx,encabezado-clase.tsx,formulario-clase.tsx,formulario-publicacion.tsx,tabla-alumnos.tsx}`
     - `frontend/src/features/tareas/{data.ts,entregas-01d-r3.ataque.test.tsx,lib.ts}`
     - `frontend/src/lib/{errores-de-api.ts,errores-de-api-estatico.test.ts}`
     - `frontend/src/services/apiClient.ts`
   - **Nuevos (12):**
     - `frontend/src/features/calificaciones/{cursor-ch3-r1.ataque.test.ts,errores-ch3.test.ts}`
     - `frontend/src/features/clases/{consultas-ch3.test.tsx,errores-ch3.test.ts,errores-ch3-r1.ataque.test.ts,formularios-ch3.test.tsx,formularios-ch3-r1.ataque.test.tsx,formularios-ch3-r2.ataque.test.tsx,recuperar-ch3.test.tsx,recuperar-ch3-r1.ataque.test.tsx}`
     - `frontend/src/services/{apiClient-ch3.test.ts,apiClient-ch3-r1.ataque.test.ts}`
   - **Documentos:** `docs/trabajo/CHORE-03-errores-api/` (`aprobacion.md`, `plan.md`, `reporte-tester.md`, `revision.md`, `resumen-programador-03b.md` y `resumen-programador-03b-r2.md`) y `docs/ESTADO.md`.

   Mensaje sugerido: "feat(frontend): CHORE-03 03b, features/clases y features/calificaciones sobre el contrato de errores de la API, CODIGOS_QUE_REDIRIGE_EL_CLIENTE en services/apiClient (N-46), campos pintados por modo en los formularios de clase y publicacion (T-03 y T-04)".

   Después del commit, el orquestador lee el hash con `git log`. Ese hash es la base de "No se toca" en `frontend/` para 03c.
4. **Notas para la instrucción de 03c:**
   - **Ronda 0:** el tester reescribe C-4 (A-5). La base de V-01 es la tabla de las 218 de la ronda 2 de 03b.
   - **Para el tester, el patrón de T-03 y T-04 como punto de ataque en `admin` y `auth`:** cualquier formulario con modos, o cuya lista de campos válidos incluya uno que no pinta en algún estado (por ejemplo, invitar o editar, o crear o restablecer). Se atacan con `VALIDACION` de cada campo aceptado en cada modo, y cada envío debe dar exactamente un mensaje.
   - **Para el tester, O-05:** extender la regla de copias de la expresión de ruta a `admin` y `auth`.
   - **Para CH3-C07, O-r1-3:** la regla de todo `src/` no se revisa a sí misma, así que su archivo se revisa desde otro.
   - **Para el programador, O-r2-3:** títulos de `it.each` completos y distintos (`%s` con tuplas).
   - **Sin cambios:** O-16 sigue siendo decisión tomada y la lista de CHORE-04 sigue como está (sin pruebas rojas de doble clic, DH-7 = b).

### Resumen para el humano (máximo 15 líneas)
1. **03b de CHORE-03: APROBADO CON OBSERVACIONES, sin nada que bloquee.**
2. `features/clases` traduce ya los errores de la API con el contrato único de `lib/errores-de-api.ts`: acciones con `mensajeDeErrorClases` y las once consultas con `mensajeDeConsultaClases`. Un `400` fuera de contrato ya no muestra texto en inglés ni rutas internas.
3. `features/calificaciones` usa el reconocimiento de cursor común. Sus mensajes no cambian.
4. N-46: la lista de errores que redirigen vive una sola vez, en `services/apiClient.ts`. Se borró `quitarPrefijoDeCampo`.
5. T-03 y T-04, con tu DH-8 (a): "Editar clase" con un error de maestros y "Publicar un anuncio" con un error de título ya muestran un aviso; antes no mostraban nada. Los campos que pinta cada modo están en `clases/data.ts`.
6. **Cambio visible declarado:** en "Personas" y en el roster, un cursor vencido en «Ver más alumnos» muestra "Algo salió mal. Inténtalo de nuevo." en vez de "no es válido".
7. **Cómo se probó:** lint, test y build en verde en mi corrida (225 archivos, 4182 pruebas, 0 que se agotaran); 177 casos nuevos del programador (CH3-B01 a CH3-B17: 176 en sus seis archivos y 1 en la estática) y 248 de ataque del tester. V-01: 218 de 218.
8. **Rondas:** 1 extra (T-03 y T-04, defectos previos en archivos protegidos que el plan no había inventariado) y 0 por hermanos. En todo el encargo, 2 extra y 0 por hermanos.
9. "No se toca" está limpio: 26 archivos modificados, 12 pruebas nuevas, y los documentos coinciden por hash.
10. **Queda pendiente, con destino CLASES-03:** si cierras la vista con un envío en vuelo y el servidor responde un error de un campo visible, no hay aviso. Viene de CLASES y no es de este chore.
11. **Pendiente para 03c:** `admin` y `auth`, la regla estática de todo `src/` y, al cierre, los textos de `CLAUDE.md` (A-1 a A-3).
12. No se verificó en navegador: no hay nada visual nuevo.
