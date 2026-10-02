# Revisión del Manager — CLASES — plan
Veredicto: CAMBIOS REQUERIDOS
Verificación propia: lint, test y build no aplican en la revisión de plan, porque aún no hay código del encargo. `git diff --name-only 3399c79` lista solo `docs/ESTADO.md` y `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md` (S-01), y `3399c79` tiene el mismo contenido que `origin/main`. No corrí `lint`, `test` ni `build`.

**Cómo leer el veredicto:** el humano puede responder ya P-01 a P-05: ninguno de los problemas que bloquean depende de esas respuestas. El arquitecto corrige M-01 y M-02 en la misma enmienda del paso 0 ("Antes de empezar"), junto con las respuestas del humano, y yo reviso esa enmienda antes de la aprobación por escrito.

**Lo que el plan ya cumple (revisado punto por punto):**
- **Cobertura.** Cubre RF-11, RF-19, RF-31, RF-38, RF-39 y RN-02, RN-03, RN-04 y RN-06. RF-10, RF-12, RF-30 y RF-33 quedan parciales, y cada parte que falta tiene destino.
- **Cadena de middleware.** Todas las rutas la declaran completa, con el sexto paso donde corresponde.
- **Migraciones.** Las tres son compatibles hacia atrás: solo agregan tablas, un índice y restricciones nuevas.
- **Encolado.** Va en la misma transacción que el dato.
- **Archivos.** Siguen el flujo `pendiente` → `confirmado` con URL prefirmadas y nunca pasan por Node.
- **Carril.** Sensible en las cuatro subentregas.
- **Commits.** Uno por subentrega y ninguno intermedio. Las bases de "No se toca" son `<R>`, `<Ca>`, `<Cb>` y `<Cc>` dentro de los paquetes y `<R>` fuera de ellos, con el SHA-256 para los archivos protegidos.
- **Documentos protegidos.** Sus textos los aplica el orquestador.
- **`DESIGN.md`.** Los patrones nuevos se documentan ahí en cada subentrega (§D-A8, §D-B7, §D-C7 y §D-D7).
- **Resumen del programador.** Los pasos exigen `npx vitest list` (V-07) y el comando y la última línea de `lint`, `test` y `build` (V-02).
- **Simulación de defectos.** Solo sobre una copia (PA-15).
- **Pruebas existentes que se modifican.** Van separadas de las nuevas.
- **Conteos.** Verifiqué los que se pueden comprobar hoy:
  - 20 `enEspera=`;
  - `vidrio-azul` sin usos;
  - ningún `addHook` en `handlers/`;
  - 10 rutas públicas;
  - `paginacionSchema` en `enlaces-registro.ts`;
  - el patrón `alGuardar` y `encolar` de `admin.ts`;
  - `nombre_busqueda`, `activo`, `estado_pago` y `acceso_restringido` en `usuarios`, sin ningún índice sobre `nombre_busqueda`.

## Problemas que bloquean

### M-01 — El estado de pago sale también en `POST /clases/:claseId/alumnos`, y el plan dice que sale solo en el roster
Dónde: §D-B1, en la tabla (`POST … → 200 { alumno: AlumnoDeClase, yaEstaba }`, donde `AlumnoDeClase` lleva `estadoPago` y `accesoRestringido`). Lo contradicen:
- la viñeta de §D-B1: "`estadoPago` y `accesoRestringido` salen solo de `GET /clases/:claseId/alumnos`";
- "Cambios por capa", `db/inscripciones.ts`, que dice que `listarAlumnosDeClase` es la "única función que selecciona `estadoPago` y `accesoRestringido`", aunque `leerAlumnoDeClase` responde con un `AlumnoDeClase`;
- "Autorización", que dice que el estado de pago solo aparece en `GET /clases/:claseId/alumnos`.

Por qué importa: RN-02 y la regla 3 de `AGENTS.md`, en el carril sensible. Con esta contradicción, el programador no sabe si `leerAlumnoDeClase` selecciona el estado de pago. El tester no sabe si el campo en la respuesta del POST es un hallazgo. Y ninguna prueba cubre esa ruta: PR-B08 solo revisa las respuestas que recibe un estudiante.

Qué se espera: una sola decisión, escrita igual en §D-B1, "Cambios por capa", "Autorización" y en los textos propuestos.
- **Opción que recomiendo:** el POST responde sin los campos de pago (`{ alumno: { id, nombre }, yaEstaba }`), porque el frontend ya invalida el roster al agregar.
- **Otra opción:** declarar el POST como la segunda ruta que los devuelve, con su prueba.

Relación con "Para el humano", nota (g): esta corrección no cierra el oráculo de agregar y quitar, que es una consecuencia del PRD.

### M-02 — Las "Pruebas requeridas" no se pueden asociar una a una con un archivo y un caso, y PA-16 detendría al programador en b, c y d
Dónde: "Pruebas requeridas", "Cambios por capa" (en "Pruebas: archivos nuevos y archivos existentes que se modifican") y "Reglas para todos los pasos" ("cada viñeta PR-xx lleva al menos un caso").

Por qué importa:
- `AGENTS.md` ("Resúmenes verificables del programador") pide el archivo y el título exacto por viñeta.
- La lección de AUTH-03 (`ESTADO.md` §6) es justo esa: pruebas omitidas o incompletas, y archivos de pruebas reemplazados sin declararlo.
- El programador sigue a prueba.

Problemas concretos:
1. **Viñetas compuestas.** Varias PR-xx agrupan de 3 a 8 comportamientos distintos: PR-A15, A18, A22, B02, B04, B10, B11, C02, C04, C09, C10, D01 y D05. Con la regla "al menos un caso por PR-xx", un solo caso que cubra un inciso deja la viñeta por cumplida.
2. **Viñetas sin archivo, o con un archivo que no está en las listas cerradas:**
   - PR-A23 (caché al cambiar de identidad) no tiene archivo. Ninguno de los nuevos le corresponde, y `login-view.test.tsx` solo se puede tocar "si su caso de Hola deja de pasar".
   - PR-A20 admite "su propio archivo", que no está en la lista.
   - PR-D11 dice `adjuntos.test.ts`, pero la lista dice `adjuntos.test.tsx`.
   - PR-D12 no tiene archivo.
   - PR-A01 a A05, B03 a B07, C03 a C07 y D05 a D08 dan el archivo por implícito.
3. **Archivos de este mismo encargo que después se extienden.** Después de `<Ca>`, `features/clases/lib.test.ts` (PR-B09, y d con `errorDeArchivoElegido`) ya es una "prueba normal existente" que no está en la lista cerrada. Pasa lo mismo con `muro-view.test.tsx`, `publicacion-del-muro.test.tsx` o `muro.integracion.test.ts` si d los extiende (PR-D06 y PR-D12). Tal como está, PA-16 se activaría en b y en d aunque el programador siga el plan.
4. **Fila abierta dentro de una lista cerrada.** "Toda prueba normal existente que monte `/estudiante` o `/maestro`…" se puede enumerar hoy. Los candidatos que montan `rutas` del router real y llegan a los inicios son `app/marco.test.tsx`, `features/auth/registro-view.test.tsx` y `features/auth/registro-maestro-view.test.tsx`, además de `login-view.test.tsx`, que ya está en la lista.

Qué se espera:
- Cada comportamiento verificable con su propio ID: sub-IDs como PR-A18a, PR-A18b… o una viñeta por inciso.
- Cada ID con exactamente un archivo de las listas, y la regla cambiada a "cada ID, su caso".
- La lista cerrada ampliada, por subentrega, con los archivos de pruebas de este encargo que la siguiente subentrega extiende.
- Un archivo explícito para PR-A23 y para PR-D12.
- La fila abierta sustituida por los archivos concretos, con el mismo tipo de cambio permitido.

## Problemas que no bloquean
Se corrigen en la misma enmienda.

- **N-01 — La guarda nueva impide las rutas de clases del admin (RF-52).** Con §D-0.3:
  - `/api/admin/clases/:claseId` exigiría el sexto paso, que el admin nunca pasa;
  - `/api/admin/clases/:id` se rechaza por la regla del nombre.

  Eso contradice S-07 y el texto propuesto para `ARCHITECTURE.md` §6 ("sus rutas de clases viven bajo `/admin`"). Qué se espera: decirlo en R-08 y en el texto de §6. Es decir, que ADMIN necesitará una excepción de la guarda (en `middleware/`, carril sensible), o definirla ya, con su caso en PR-A06. Me basta con que quede escrito. No pido construir la excepción ahora.
- **N-02 — La paginación por cursor con orden por una relación, sin comprobar en Prisma 7.** `listarPersonas` y `listarAlumnosDeClase` ordenan por `usuario.nombreBusqueda` con `cursor` sobre la PK compuesta (`@prisma/client` ^7.10). No está demostrado que Prisma combine bien ese cursor con ese orden. Qué se espera:
  - una PARADA o una alternativa escrita, por ejemplo un cursor `(nombreBusqueda, usuarioId)` resuelto con `where` en lugar de `cursor`;
  - un caso de PR-B02 o PR-B03 con dos alumnos del mismo nombre partidos entre dos páginas.

  Además, §D-B1 dice "límite de 50 por defecto", pero `paginacionSchema` trae 20. Hay que decir cuál de los dos manda.
- **N-03 — El id del trabajo de la cola.** §D-C3 dice que el handler pasa `(sql) => encolar(cola, datos, { id, sql })` con `id = publicacionId` o `comentarioId`, pero el id lo genera el `INSERT` dentro del adaptador. Qué se espera: el id se genera en el handler con `randomUUID()` y el adaptador lo recibe, como `tokenId` en `admin.ts`. Así el programador no tiene que adivinarlo.
- **N-04 — Comprobación humana.** H-3 (el código viejo ya no sirve) lo cubren PR-A11 y el texto de `CODIGO_INVALIDO` en PR-A18. Además, exige una tercera cuenta. Qué se espera:
  - quitar H-3, o juntarlo con H-1 usando el mismo estudiante (el código viejo da 404 aunque ya esté inscrito);
  - que el plan estime que los puntos restantes caben en 10 minutos, sin contar el arranque.
- **N-05 — "No se toca" verificable para los archivos de la raíz autorizados en una sola subentrega.** En b, c y d, `git diff <R> -- eslint.config.mjs` no sale vacío, y es legítimo. "Se revisan contra lo autorizado" no es una comprobación mecánica. Qué se espera:
  - en a, el diff contra `<R>` contiene solo el bloque de §D-0.4;
  - en b, c y d, `git diff --quiet <Ca> -- eslint.config.mjs`;
  - lo mismo con `package-lock.json` y `backend/package.json` después de d.
- **N-06 — El CHECK de `archivos` no hace cumplir lo que dicen los textos propuestos.** Los textos para ESSENTIALS y §14 dicen "`pendiente` y `descartado`, ninguno". Pero `archivos_confirmado_con_contexto` solo exige que un confirmado tenga contexto. Qué se espera: el CHECK `("estado" = 'confirmado') = ("publicacion_id" IS NOT NULL)`, o suavizar el texto, más el caso correspondiente en PR-D08 (un `pendiente` con `publicacion_id` falla).
- **N-07 — PR-B05 prueba una consulta "equivalente", no la que genera Prisma.** Prisma escribe `"nombre_busqueda"::text LIKE $1` junto con los demás filtros y el `ORDER BY`. Qué se espera: `EXPLAIN` sobre el SQL real que emite Prisma (capturado con el evento `query` en la prueba) o, como mínimo, la misma forma, con el cast y los filtros.
- **N-08 — La URL de subida no limita el tamaño.** R2 no admite `POST` con política. Un maestro puede dejar un objeto de cualquier tamaño en la clave de un pendiente. `statObject` impide confirmarlo, pero el objeto se queda en el almacén hasta `LIMPIEZA_DIARIA`. Qué se espera: agregarlo a R-03 y R-05 como riesgo residual, y que el pendiente de `LIMPIEZA_DIARIA` diga que borra también el objeto de cada pendiente vencido.
- **N-09 — Comentar una publicación que se borra al mismo tiempo.** El `INSERT` del comentario falla por la FK (P2003). Hoy `adapters/db/errores.ts` no traduce ese error, así que la respuesta sería un 500. Qué se espera: traducirlo a `404 PUBLICACION_NO_ENCONTRADA` en `adapters/db`, o leer la publicación `FOR SHARE` dentro de la transacción, más un caso en PR-C04.

## Detalles menores
- **R-09.** No menciona que `POST /archivos/subida` y `POST /archivos/descarga` (`ARCHITECTURE.md` §7 y §11, paso 1) pasan a `/clases/{claseId}/archivos…`. El texto propuesto ya lo refleja; falta nombrarlo en R-09.
- **Filas de `PersonasView`.** La lista va "sin vidrio fuerte", pero `DESIGN.md` §7.2 pide vidrio fuerte en las filas. Hay que documentar la excepción en §D-B7.
- **Buscador.** "perez jose" no encuentra a "José Pérez" con un solo `LIKE`. RN-04 ("cualquier parte del nombre") se cumple igual, pero podría valer la pena un `AND` por palabra. Es opcional.
- **Botón "Publicar".** No lleva objeto (`DESIGN.md` §9); podría ser "Publicar anuncio" o "Publicar material", según el tipo. Es opcional.
- **Llaves foráneas sin índice.** `publicaciones.autor_id`, `comentarios.autor_id`, `archivos.subido_por` y `archivos.clase_id` no tienen índice. Hoy ninguna ruta borra usuarios ni clases. Conviene anotarlo para ADMIN, si alguna vez hay bajas físicas.

## Desacuerdos arbitrados
- **R-06, buscador sin cursor.** Lo acepto. Está acotado a 50 con `hayMas`, cumple la razón de "toda lista se pagina (máx. 100)", que es no devolver listas sin límite, y la alternativa suma interfaz sin beneficio real con 1,500 alumnos.
- **R-19, `consultaMe` en `services/sesionService.ts` o el contexto del `Outlet`.** Acepto `sesionService`. La alternativa toca `require-rol.tsx` y `ContenedorRol`, que están en "No se toca".
- **R-03 y R-04, subida después de confirmar y contenido disfrazado.** Los acepto como riesgos residuales, con las mitigaciones del plan (tipo forzado, `attachment` y sin SVG) y N-08.
- **M-17 fuera de CLASES y M-20 dentro.** Estoy de acuerdo. M-20 es una línea en un archivo que el encargo ya toca; M-17 es un refactor de `features/auth`.

## Documentos a actualizar
Además de los textos que ya propone el plan:
- **`ARCHITECTURE.md` §6:** la nota de N-01.
- **ESSENTIALS y §14, `archivos`:** el texto, coherente con el CHECK final (N-06).
- **§11 (paso 7) y `ESTADO.md`:** el pendiente de `LIMPIEZA_DIARIA` incluye borrar los objetos de los pendientes vencidos (N-08).
- **`ESTADO.md` §3, al cerrar cada subentrega:**
  - M-15 pasa a CHORE-02;
  - M-17 pasa al próximo encargo que toque `establecer-contrasena-view.tsx`;
  - `LIMPIEZA_DIARIA`, antes de DEPLOY;
  - se cierran las filas de R-01, S-07, M-20, C-07 y `--text-display` móvil, y la de AUTH-01 (`requireMembership` y `requireOwnership`, ESLint contra `addHook`).

## Para el humano

| ID | Pregunta (resumen) | Recomendación del arquitecto | Recomendación del manager | Motivo (sobre todo si difieren) |
|---|---|---|---|---|
| P-01 | Dónde vive la "lista de clases" que pide PRD §7, si la barra lateral es compacta (`DESIGN.md` §7.4) | **A:** la barra sigue igual; la lista son las tarjetas de "Mis clases" del inicio, más "Volver a mis clases" en cada clase. El orquestador ajusta PRD §7 | **A** | Coincido. Respeta D-28 y §7.4, no agrega componentes y es la única opción que cabe a 360 px sin una capa flotante |
| P-02 | Adjuntos del muro y vista previa (RF-33, RF-25): dominio `archivos` | (a) **A**: entran, como CLASES-d. (b) **A**: 25 MB por archivo y hasta 5 por publicación; PDF, imágenes (sin SVG), Office actual y 97-2003, y texto plano; vista previa solo de imágenes. (c) **A**: se agrega `minio@^8` al backend. (d) **A**: el CHECK de contexto aplica a `confirmado`; `clase_id` autoriza al pendiente. (e) **A**: `LIMPIEZA_DIARIA` queda como pendiente previo a DEPLOY | (a) **A** · (b) **A** · (c) **A** · (d) **A**, con el CHECK de N-06 · (e) **A**, con N-08 | (a) Tú asignaste RF-25 a CLASES, y el almacén se construye una sola vez. (b) Coincido; si los maestros suben presentaciones pesadas con imágenes, 50 MB también es razonable, y el costo de R2 es mínimo. (c) Es el cliente que ya fija ESSENTIALS. (d) Coincido. Solo pido que el CHECK haga cumplir las dos direcciones (confirmado si y solo si tiene publicación), para que el texto de ESSENTIALS sea cierto. (e) Coincido, siempre que el pendiente diga que también borra los objetos de los pendientes vencidos, que pueden pesar cualquier cosa |
| P-03 | Temas (RF-43): ¿en CLASES o en TAREAS?, y sus reglas | **A:** en TAREAS, completo. (a) sí, "Sin tema"; (b) no, por fecha de creación dentro del tema; (c) sí, y sus elementos pasan a "Sin tema"; (d) el alumno ve "Trabajo de clase" agrupado y el muro sigue cronológico | **A**, con (a) a (d) como propone | Coincido. Sin tareas, la vista agrupada queda a medias y deja dos migraciones y dos pantallas a medias |
| P-04 | Lo que depende de módulos que aún no existen | (a) **A**: RF-32 va en TAREAS. (b) **A**: el inicio sale parcial, y cada encargo agrega su parte. (c) **A**: CLASES encola los tres avisos en la misma transacción, sin consumidor hasta NOTIFICACIONES, con 7 días de retención | (a) **A** · (b) **A** · (c) **A** | Coincido en los tres. (c) cumple la regla 5 desde el primer día y evita reabrir las transacciones de CLASES. Riesgo aceptable: los trabajos de más de 7 días se pierden antes de que exista su consumidor (R-02) |
| P-05 | Huecos del PRD en clases y muro | (a) **A**: el maestro puede quitar a un alumno, con confirmación en línea. (b) **A**: el maestro borra publicaciones y comentarios de su clase, y cada autor sus comentarios. (c) **A**: no se editan. (d) **A**: el alumno no ve el código. (e) **A**: el alumno no puede salir por su cuenta. (f) **A**: el buscador muestra nombre y correo, nunca el estado de pago | (a) **A** · (b) **A** · (c) **A** · (d) **A** · (e) **A** · (f) **A** · y **(g) nuevo**: ver la nota de abajo | Coincido en (a) a (f). (f) expone los correos de todos los estudiantes a cualquier maestro. Dentro de una sola institución es aceptable, y la alternativa intermedia sería un correo enmascarado (`j***@…`) |
| R-10 (dentro de P-02 d) | Desacuerdo con ESSENTIALS: "`archivos` con exactamente un contexto" no admite un `pendiente`, que todavía no tiene publicación | Aceptar que la regla aplique a los `confirmado`, con `clase_id` para autorizar mientras tanto, y cambiar el texto de ESSENTIALS | Aceptar, con el CHECK de N-06 | Coincido. Un pendiente sin contexto es inevitable si se sube antes de publicar. La alternativa (publicar primero un borrador) complica la interfaz sin ganar seguridad, porque `clase_id` y `subido_por` ya acotan la confirmación |
| R-19 | `consultaMe` sube a `services/sesionService.ts`, y `features/auth/hooks.ts` la reexporta | Incluirlo en CLASES-a. La alternativa es pasar el nombre por el contexto del `Outlet` de `RequireRol` | Aceptar `sesionService` | Coincido. Cumple las reglas 5 y 9 de `CLAUDE.md` sin tocar `require-rol.tsx` ni `ContenedorRol` ("No se toca"), y ninguna importación existente se rompe |

**(g) Nota para agregar a P-05 (no suma una sexta pregunta).** RN-04 deja que un maestro agregue a su clase a cualquier estudiante, y RN-02 le deja ver el estado de pago de los alumnos de sus clases. Juntas, con (a) A, permiten que un maestro conozca el estado de pago de **cualquier** estudiante: lo agrega, ve el roster y lo quita, sin dejar rastro. No lo introduce el plan; es una consecuencia del PRD.
- Mi recomendación es aceptarlo, porque es coherente con RN-02 y el PRD §10 habla de alumnos, no de maestros.
- Si prefieres cerrarlo, las opciones son un registro de altas y bajas manuales (encargo ADMIN) o no permitir quitar alumnos (P-05 a B).
- Cualquiera de las dos es una decisión de producto que solo tú puedes tomar.

---

# Revisión de la enmienda 1 — CLASES — plan
Veredicto: APROBADO
Verificación propia: lint, test y build no aplican en la revisión de plan: todavía no hay código del encargo. Verifiqué cada hallazgo en el cuerpo del plan, no solo en la tabla de la enmienda.

**Cómo leer el veredicto:** con las opciones recomendadas, el plan está listo para que el humano responda P-01 a P-05 y lo apruebe por escrito. Las dos observaciones nuevas no bloquean. El arquitecto las incorpora en la enmienda del paso 0 (la que registra las respuestas del humano), y yo las verifico en esa revisión.

## Hallazgos de la primera revisión: cómo quedaron
| Hallazgo | Estado | Dónde lo comprobé |
|---|---|---|
| M-01 | **Resuelto** | La tabla de §D-B1 y su viñeta; §D-B2, donde `buscarEstudianteActivo` solo selecciona `id` y `nombre` y `leerAlumnoDeClase` desaparece; "Acceso a datos"; "Autorización"; y PR-B06e, que revisa las claves exactas de la respuesta y hace el recorrido recursivo con un alumno deudor y restringido |
| M-02 | **Resuelto** | Cada ID tiene un solo archivo. Los crucé uno por uno con "Pruebas: listas cerradas por subentrega", y todos están en el grupo que les toca: nuevo, existente que se modifica o del propio encargo que se extiende. PR-A23 queda en `features/auth/cambio-de-identidad.test.tsx`, que también quedó exceptuado en "No se toca". PR-D11 y PR-D12 van en `formulario-publicacion.test.tsx`, que se crea en c y se extiende en d. La fila abierta pasó a cuatro archivos concretos. PA-16 y V-07 (cada ID aparece en `vitest list`) quedaron coherentes. Quedan dos IDs con más de un comportamiento; van en "Detalles menores" |
| N-01 | Resuelto | §D-0.3, R-08, "Pendientes" y el texto propuesto para §6 |
| N-02 | Resuelto, con la observación O-01 | §D-B3 bis, `paginacionRosterSchema` (50 por defecto, máximo 100), PR-B02d, PR-B03d y PA-17 |
| N-03 | Resuelto | §D-C3 y "Cambios por capa" (`db/publicaciones.ts`) |
| N-04 | Resuelto | La comprobación queda en 6 puntos y unos 9 minutos, desglosados por punto, sin contar el arranque. H-3 se juntó con H-1 usando el mismo estudiante. No incluye ninguna medición de contraste |
| N-05 | Resuelto | V-05 da una comprobación mecánica para `eslint.config.mjs`, `backend/package.json` y `package-lock.json`, con la base de cada subentrega |
| N-06 | Resuelto | CHECK `("estado" = 'confirmado') = ("publicacion_id" IS NOT NULL)` y PR-D08c. Es correcto: `estado` es `NOT NULL`, así que la comparación nunca da nulo. Confirmar y descartar cambian las dos columnas en la misma sentencia. El borrado en cascada de una clase no evalúa el CHECK. Y TAREAS lo podrá ampliar con `num_nonnulls(...) = 1` en el lado derecho |
| N-07 | Resuelto | PR-B05 usa la misma forma que emite Prisma. Acepto el motivo: capturar el SQL real exigiría tocar `cliente.ts` o importar el adaptador en `test/` |
| N-08 | Resuelto | R-03, R-05, "Pendientes" y el texto para §11 |
| N-09 | Resuelto, con la observación O-02 | §D-C3, "Acceso a datos", V-04, C-12 y PR-C04d |

## SQL crudo nuevo (N-09)
El `SELECT id FROM publicaciones WHERE id = … AND clase_id = … FOR SHARE` cumple las reglas:
- es un `$queryRaw` etiquetado y parametrizado, del mismo tipo que los de `bloqueo-usuario.ts` y `enlaces-registro.ts`;
- va dentro de `adapters/db`;
- no afecta la regla de `arquitectura-cuentas-r1`, que solo cuenta `$queryRawUnsafe` y `$executeRawUnsafe`;
- V-04 lo limita a ese único uso, y C-12 manda al tester buscar las listas cerradas de `$queryRaw`.

Tampoco hay orden de bloqueo cruzado. El comentario toma la publicación `FOR SHARE` y después inserta su fila. El borrado (en d, antes descarta `archivos`, tabla que el comentario no toca) espera por la publicación. Si el borrado confirma primero, en READ COMMITTED el `FOR SHARE` vuelve a evaluar la fila, no la encuentra y responde `404`.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean (observaciones nuevas de la enmienda)
- **O-01 — La paginación por claves rechaza un cursor válido.** §D-B3 bis responde `400 VALIDACION` si el usuario del cursor "ya no está en la clase". Así, "Ver más alumnos" falla en cuanto el maestro quita, o el admin desactiva, al último alumno de la página anterior. Además, "Acceso a datos" solo describe la lectura de `usuarios` por PK, así que las dos secciones no dicen lo mismo. Qué se espera:
  - el `nombre_busqueda` del cursor se lee solo de `usuarios` por PK;
  - `400` solo si ese usuario no existe;
  - un caso en PR-B02 o PR-B03: se quita al alumno del cursor y la página siguiente sale completa.

  El conjunto de claves no necesita que el usuario siga en la clase, y saber si un UUID aleatorio existe no revela nada útil.
- **O-02 — PR-C04d y los 5 s de las transacciones interactivas de Prisma.** La prueba sostiene una transacción de `obtenerDb().$transaction` mientras la petición del comentario espera su bloqueo. Si la espera pasa de 5 s, aparece un `P2028`, en la prueba o en la transacción de `crearComentario`, y PA-07 no lo excluye (es el mismo caso que la observación (e) de AUTH-03c, en `ESTADO.md` §3). Qué se espera:
  - la transacción de la prueba lleva un `timeout` explícito;
  - confirma en cuanto `pg_stat_activity` muestra la espera, filtrando por el texto `FOR SHARE`;
  - si aun así aparece un `P2028`, se aplica PA-07 como está.

## Detalles menores
- **IDs con dos comportamientos.** Quedan dos: PR-C09a (`aria-pressed` y que "Material" pida título) y PR-C03a (orden, cursor, conteo y autor). Conviene partirlos. Los demás IDs compuestos (PR-B04a, PR-D05d y las matrices) son un solo comportamiento sobre varios datos, y los acepto.
- **Letra salteada.** PR-B08 pasa de "h" a "j", sin "i".
- **Texto propuesto para `ARCHITECTURE.md` §6.** Fija ya la forma `requireAdmin`, que es una decisión del plan de ADMIN. Basta con decir que ADMIN agrega una excepción de la guarda, en carril sensible, y dejar la forma como sugerencia en R-08.

## Desacuerdos arbitrados
Ninguno nuevo. La enmienda incorporó todo sin desacuerdos.

## Documentos a actualizar
Los de la primera revisión, ya reflejados en los textos propuestos del plan. Si se aplica el detalle menor, se ajusta el texto de §6.

## Para el humano (tabla vigente)

| ID | Pregunta (resumen) | Recomendación del arquitecto | Recomendación del manager | Motivo (sobre todo si difieren) |
|---|---|---|---|---|
| P-01 | Dónde vive la "lista de clases" que pide PRD §7, si la barra lateral es compacta (`DESIGN.md` §7.4) | **A:** la barra sigue igual; la lista son las tarjetas de "Mis clases" del inicio, más "Volver a mis clases" en cada clase. El orquestador ajusta PRD §7 | **A** | Coincido. Respeta D-28 y §7.4, no agrega componentes y es la única opción que cabe a 360 px sin una capa flotante |
| P-02 | Adjuntos del muro y vista previa (RF-33, RF-25): dominio `archivos` | (a) **A**: entran, como CLASES-d. (b) **A**: 25 MB por archivo y hasta 5 por publicación; PDF, imágenes (sin SVG), Office actual y 97-2003, y texto plano; vista previa solo de imágenes. (c) **A**: se agrega `minio@^8` al backend. (d) **A**: un archivo está `confirmado` si y solo si tiene publicación; `clase_id` autoriza al pendiente. (e) **A**: `LIMPIEZA_DIARIA` queda como pendiente previo a DEPLOY, y borra también los objetos de los pendientes vencidos y de los descartados | (a) **A** · (b) **A** · (c) **A** · (d) **A** · (e) **A** | Coincido en los cinco. (a) Tú asignaste RF-25 a CLASES, y el almacén se construye una sola vez. (b) Si los maestros suben presentaciones pesadas con imágenes, 50 MB también es razonable, y el costo de R2 es mínimo. (c) Es el cliente que ya fija ESSENTIALS. (d) El CHECK ya va en las dos direcciones, así que el texto propuesto para ESSENTIALS es cierto. (e) El pendiente ya dice que borra los objetos, que pueden pesar cualquier cosa porque la URL de subida no limita el tamaño |
| P-03 | Temas (RF-43): ¿en CLASES o en TAREAS?, y sus reglas | **A:** en TAREAS, completo. (a) sí, "Sin tema"; (b) no, por fecha de creación dentro del tema; (c) sí, y sus elementos pasan a "Sin tema"; (d) el alumno ve "Trabajo de clase" agrupado y el muro sigue cronológico | **A**, con (a) a (d) como propone | Coincido. Sin tareas, la vista agrupada queda a medias y deja dos migraciones y dos pantallas a medias |
| P-04 | Lo que depende de módulos que aún no existen | (a) **A**: RF-32 va en TAREAS. (b) **A**: el inicio sale parcial, y cada encargo agrega su parte. (c) **A**: CLASES encola los tres avisos en la misma transacción, sin consumidor hasta NOTIFICACIONES, con 7 días de retención | (a) **A** · (b) **A** · (c) **A** | Coincido en los tres. (c) cumple la regla 5 desde el primer día y evita reabrir las transacciones de CLASES. Riesgo aceptable: los trabajos de más de 7 días se pierden antes de que exista su consumidor (R-02) |
| P-05 | Huecos del PRD en clases y muro | (a) **A**: el maestro puede quitar a un alumno, con confirmación en línea. (b) **A**: el maestro borra publicaciones y comentarios de su clase, y cada autor sus comentarios. (c) **A**: no se editan. (d) **A**: el alumno no ve el código. (e) **A**: el alumno no puede salir por su cuenta. (f) **A**: el buscador muestra nombre y correo, nunca el estado de pago. (g) **A**: aceptar que, por RN-04 y RN-02 juntas, un maestro pueda conocer el estado de pago de cualquier estudiante si lo agrega, ve el roster y lo quita. Las alternativas son un registro de altas y bajas en ADMIN (B) o no permitir quitar alumnos (C, igual que (a) B) | (a) **A** · (b) **A** · (c) **A** · (d) **A** · (e) **A** · (f) **A** · (g) **A** | Coincido en los siete. (f) expone los correos de todos los estudiantes a cualquier maestro; dentro de una sola institución es aceptable, y la alternativa intermedia sería un correo enmascarado (`j***@…`). (g) No lo introduce el plan: es una consecuencia del PRD. Es coherente con RN-02, porque el maestro ya ve el estado de pago de sus alumnos, y el PRD §10 protege a los alumnos entre sí, no frente a los maestros. C le quitaría al maestro el remedio de un alta por error, y B cabe después en ADMIN sin tocar este encargo |
| R-10 (dentro de P-02 d) | Desacuerdo con ESSENTIALS: "`archivos` con exactamente un contexto" no admite un `pendiente`, que todavía no tiene publicación | Aceptar que la regla aplique a los `confirmado` (confirmado si y solo si tiene publicación), con `clase_id` para autorizar mientras tanto, y cambiar el texto de ESSENTIALS | Aceptar | Coincido. Un pendiente sin contexto es inevitable si se sube antes de publicar. La alternativa (publicar primero un borrador) complica la interfaz sin ganar seguridad, porque `clase_id` y `subido_por` ya acotan la confirmación. El CHECK ya hace cumplir las dos direcciones |
| R-19 | `consultaMe` sube a `services/sesionService.ts`, y `features/auth/hooks.ts` la reexporta | Incluirlo en CLASES-a. La alternativa es pasar el nombre por el contexto del `Outlet` de `RequireRol` | Aceptar `sesionService` | Coincido. Cumple las reglas 5 y 9 de `CLAUDE.md` sin tocar `require-rol.tsx` ni `ContenedorRol` ("No se toca"), y ninguna importación existente se rompe |

---

# Revisión de la enmienda 2 — CLASES — plan
Veredicto: CAMBIOS REQUERIDOS, solo para CLASES-b. **CLASES-a puede arrancar ya:** M-03 no toca nada de a. El arquitecto corrige M-03 en una enmienda 3 antes de la ronda 0 de CLASES-b (paso 15), y yo la reviso antes de ese paso.
Verificación propia: lint, test y build no aplican en la revisión de plan: todavía no hay código del encargo. Verifiqué (f), (g), O-01 y O-02 en el cuerpo del plan (S-22, S-23, §D-B1 a §D-B3 bis, §D-B8, "Acceso a datos", "Pruebas requeridas", PA-03, V-03 a V-06, "Qué autoriza", "No se toca" y la comprobación humana) y los contrasté con el texto literal del humano en `aprobacion.md`.

## Lo que pidió el humano: cómo quedó
- **(f) Correo enmascarado. Cumple.**
  - **Dónde se enmascara:** en el backend, con `enmascararCorreo` en `core/`. El handler arma cada candidato sin el correo completo y valida la salida con `candidatosRespuestaSchema`, que no tiene ningún campo con el correo completo. Como `z.object` descarta las claves que sobran y ningún esquema de `shared/` usa `passthrough`, el correo completo no sale por ahí.
  - **Otros caminos que revisé:**
    - agregar a un alumno responde solo `{ id, nombre }`;
    - `personas` no lleva correo;
    - los errores no llevan datos del candidato;
    - `enmascararCorreo` es pura y nunca lanza.
  - **Pruebas que lo cubren:**
    - PR-B04h busca el correo completo en el `JSON.stringify` de la respuesta, incluido el de un alumno ya inscrito;
    - V-04 fija dónde se define y dónde se usa `enmascararCorreo`;
    - el tester ataca campos, cabeceras, errores y `hayMas`.
  - **Roster:** el correo completo solo sale en `GET …/alumnos`, que exige ser el dueño de la clase.
- **(g) `movimientos_inscripcion`. Cumple, salvo M-03.**
  - Tiene las columnas que pidió el humano, más `id`, y el tipo como enum.
  - El movimiento se escribe en la misma transacción que la inscripción y solo cuando la inscripción cambia de verdad. Unirse con código no escribe nada.
  - CLASES no tiene ninguna ruta ni función que lea la tabla (PR-B16g, PR-B16h y V-04). El pendiente de ADMIN ya está en `ESTADO.md` §3.
  - **Orden de bloqueo:** es correcto. El alta solo toma el conflicto de la PK de `inscripciones`, y la baja, el bloqueo de esa fila. Las llaves foráneas del movimiento toman `FOR KEY SHARE` sobre `clases` y `usuarios`, que no choca con el `FOR NO KEY UPDATE` de las transacciones de AUTH. No hay ciclo posible.
  - **Concurrencia:** el análisis de §D-B2 es correcto en los tres cruces: dos altas, dos bajas, y un alta con una baja.
- **Migración de CLASES-b.** Es compatible hacia atrás: agrega una tabla y un tipo nuevos, sin tocar nada existente. Tampoco hace falta ningún índice: en CLASES solo hay `INSERT` por PK, y ninguna lectura. Las llaves foráneas sin índice quedan anotadas en R-21, y los índices de la consulta, para ADMIN.
- **Documentos y verificaciones del plan.** Quedaron al día:
  - "Qué autoriza" (cuatro migraciones);
  - V-03 (a, b, c y d);
  - V-05 (una carpeta de migración por subentrega);
  - PA-03 (§D-B8, sin índices en la tabla);
  - "No se toca" de b (todo `backend/prisma/` salvo `schema.prisma` y la carpeta nueva);
  - la lista cerrada de pruebas de b (`movimientos-inscripcion.integracion.test.ts` y `ayudas-clases.ts`).
- **O-01.** Resuelto. El nombre del cursor se lee solo de `usuarios` por PK, responde 400 solo si ese usuario no existe, y lo cubren PR-B02f y PR-B03e.
- **O-02.** Resuelto. `timeout: 15_000` explícito, confirmación en cuanto `pg_stat_activity` muestra la espera, y PA-07 sin cambios.
- **Detalles menores de la revisión anterior.** Resueltos: PR-C09 y PR-C03 partidos, PR-B08i, y el texto de §6 sin fijar la forma de `requireAdmin`.
- **Comprobación humana.** 6 puntos y unos 9.5 minutos, sin contar el arranque. Sigue dentro del límite, y no incluye ninguna medición de contraste.

## Problemas que bloquean (solo CLASES-b)

### M-03 — `movimientos_inscripcion` no tiene un orden definido, y PR-B16f depende de él
Dónde: §D-B8 (`creado_en … DEFAULT CURRENT_TIMESTAMP`, `id` UUID aleatorio), §D-B2 ("Invariante… la última fila") y PR-B16f.

Por qué importa: el humano pidió un registro de altas y bajas para que ADMIN lo consulte, y un registro así solo sirve si su orden refleja lo que pasó de verdad. Hoy el orden no está bien definido:
- **Con `CURRENT_TIMESTAMP`,** PostgreSQL fija la hora al **inicio** de la transacción, no al momento del `INSERT`. Veamos un alta que empieza (lee `usuarios`), espera a una baja simultánea y termina después de ella. El alta queda con una hora **anterior** a la de la baja, aunque el estado final sea "inscrito". La "última fila" diría `baja`.
- **Si Prisma llena la hora en el cliente** (`@default(now())`), el orden es el correcto, pero con 3 decimales las 20 peticiones simultáneas de PR-B16f pueden empatar en el mismo milisegundo. Y el `id` aleatorio no sirve para desempatar.
- **Resultado:** en cualquiera de los dos casos, PR-B16f puede fallar de forma intermitente (PA-12) o pasar sin demostrar el invariante, y la pantalla de ADMIN heredaría un orden en el que no se puede confiar.

Qué se espera:
- Una columna de orden estricto que se asigne en el momento del `INSERT` del movimiento. Por ejemplo, una secuencia (`BIGINT GENERATED … AS IDENTITY`, `@default(autoincrement())` en Prisma), que respeta el orden en que se confirman las transacciones, porque la que esperaba inserta su movimiento después de que la otra confirmó. Otra opción equivalente, justificada en el plan: `clock_timestamp()` con precisión de microsegundos, más un desempate.
- §D-B2 define "última fila" con esa columna, y PR-B16f la usa.
- §D-B8, el texto propuesto para §14 y PA-03 se actualizan con esa columna.

## Problemas que no bloquean
- **N-10 — Orden de limpieza de las pruebas del backend.** `ayudas-auth.ts` (en "No se toca") borra usuarios con `deleteMany`. Como `movimientos_inscripcion` y `clases.maestro_id` son `RESTRICT`, un archivo de b que limpie los usuarios antes que las clases fallará al borrar. Qué se espera: el plan dice que la limpieza de `ayudas-clases.ts` (movimientos y después clases) corre **antes** que la de los usuarios, en cada archivo de b.
- **N-11 — 20 transacciones interactivas simultáneas en PR-B16f.** Cada transacción bloqueada conserva su conexión mientras espera. Si el pool de la prueba es más chico que 20, puede aparecer un `P2024` o un `P2028`. Qué se espera: que PR-B16f diga cuántas peticiones simultáneas lanza, dentro del pool de pruebas, o que la simultaneidad se limite (por ejemplo, 10 en total). Un `P2028` activa PA-07 como está.

## Detalles menores
- **S-22 con una parte local de 1 carácter.** `"a@x.mx"` → `"a***@x.mx"` deja ver la parte local completa (aunque `***` oculta la longitud). Si se quiere ser estricto con "el correo completo solo en el roster", la regla sería "hasta 2 caracteres, y nunca todos": con 1, `"***@x.mx"`. Es opcional y no cambia nada más.

## Para el humano
Nada que decidir: **ninguna ESCALADA**. Solo dos puntos informativos:
1. **"Primeros 2 caracteres" (S-22).** El arquitecto aplica tu regla tal cual cuando la parte local tiene 3 caracteres o más. Con 1 o 2 caracteres muestra solo el primero, porque mostrar 2 de 2 dejaría ver el correo completo, que es justo lo que pediste evitar en el buscador. Me parece una lectura razonable de tu intención y no la escalo. Si prefieres el literal, avisa y se ajusta sin más cambios.
2. **Oráculo de agregar y quitar.** Un maestro todavía puede ver el correo completo y el estado de pago de cualquier estudiante: lo agrega, mira el roster y lo quita. Es lo que aceptaste en (g). Ahora cada alta y cada baja quedan en `movimientos_inscripcion`, y ADMIN podrá consultarlas.

---

# Revisión de la enmienda 3 — CLASES — plan
Veredicto: APROBADO. **CLASES-b puede arrancar en el paso 15 cuando cierre CLASES-a.** Nada de CLASES-a cambió (ver la sección "CLASES-a no cambió", con una salvedad de forma sobre PA-03 que no afecta a a).
Verificación propia: lint, test y build no aplican en la revisión de plan: `git status --porcelain` lista solo los dos cambios previos de documentación (S-01) y la carpeta `docs/trabajo/CLASES-01-clases-y-muro/` sin rastrear; no hay código del encargo todavía. Lo que sí verifiqué en el código: el pool de conexiones de las pruebas (`backend/src/adapters/db/cliente.ts` construye `new PrismaPg({ connectionString })` sin `max`, la `DATABASE_URL` de `test/global-setup.ts` no lleva `connection_limit`, y `pg-pool` 3.14 fija `max = 10` por defecto en `node_modules/pg-pool/index.js:89`); `borrarUsuariosDePrueba` en `backend/test/ayudas-auth.ts` (un `usuario.deleteMany` por ids); Prisma `7.10.0`; y que `schema.prisma` aún no usa `autoincrement()` ni `BigInt` (será el primer uso). Verifiqué cada hallazgo en el cuerpo del plan, no solo en la tabla de la enmienda.

## Hallazgos de la revisión de la enmienda 2: cómo quedaron
| Hallazgo | Estado | Dónde lo comprobé |
|---|---|---|
| M-03 (bloqueaba CLASES-b) | **Resuelto** | §D-B2 ("Orden del registro" e "Invariante" por `secuencia`), §D-B8 (`"secuencia" BIGSERIAL NOT NULL` en el SQL, la única variante admitida con `@unique`, la decisión y su porqué, compatibilidad), S-23, PR-B16a, PR-B16b y PR-B16f, PA-03, "Acceso a datos", R-25, el texto propuesto para `ARCHITECTURE.md` §14 y "Puntos de ataque" (b.3). El análisis de los cruces está abajo |
| N-10 | Resuelto | §D-B8 ("Limpieza de las pruebas"), la viñeta nueva de "Reglas para todos los pasos", el paso 21, R-23, y `backend/test/ayudas-clases.ts` en la columna "del propio encargo que se extienden" de b, c y d. `ayudas-auth.ts` sigue en "No se toca" y la solución no la toca |
| N-11 | Resuelto | PR-B16f: 5 rondas de 8 peticiones simultáneas (4 altas y 4 bajas), invariante al final de cada ronda, `P2028` → PA-07. Con el pool de 10 por proceso, 8 transacciones interactivas que esperan su bloqueo dejan 2 conexiones para la cadena de middleware (lecturas por PK fuera de la transacción) y para las lecturas de la prueba entre rondas. Cabe |
| Detalle menor de S-22 | Resuelto | S-22 ("hasta 2 caracteres de la parte local, y nunca todos"), PR-B01d (3 o más: `an***@colegio.mx`, el texto literal del humano), PR-B01e (2 → `j***@x.mx`; 1 → `***@x.mx`), R-07, H-3, "Puntos de ataque" (b.2) y los textos propuestos para ESSENTIALS y PRD RN-04 |

## M-03 en detalle: por qué `secuencia` sí respeta el orden real
El movimiento se inserta como **último paso** de las dos transacciones (§D-B2: agregar = `usuarios` por PK → `createMany` con `skipDuplicates` → `movimientoInscripcion.create`; quitar = `deleteMany` por PK → `create`), y `nextval` se evalúa en ese `INSERT`. Toda transacción que cambia de verdad una misma inscripción se serializa con la otra **antes** de llegar a ese paso, en READ COMMITTED:
- **Dos altas.** La segunda `INSERT … ON CONFLICT DO NOTHING` espera a que la primera confirme; al despertar, el conflicto existe y no inserta nada: no escribe movimiento. Una sola fila `alta`.
- **Dos bajas.** La segunda espera el bloqueo de la fila; al despertar, la fila ya no está y borra 0: no escribe movimiento. Una sola fila `baja`.
- **Alta con baja, empezando sin inscripción.** La baja no ve la fila sin confirmar del alta (su instantánea no la incluye), borra 0 y no escribe. Queda `alta`, y el estado final es "inscrito".
- **Baja con alta, empezando inscrito.** El `ON CONFLICT DO NOTHING` del alta encuentra la fila que la baja está borrando, espera a que la baja confirme, vuelve a comprobar, ya no hay conflicto e inserta; después toma su `secuencia`, mayor que la de la baja. Quedan `baja` y `alta`, en ese orden, y el estado final es "inscrito".

En los cuatro casos, la que escribe después tomó su `secuencia` después de que la otra confirmó, así que el orden por `secuencia` es el orden real y no hay empates. La transacción revertida de PR-B16e consume un valor sin dejar fila (R-25 lo anota: huecos permitidos). Las llaves foráneas del movimiento toman `FOR KEY SHARE` sobre `clases` y `usuarios`, que no chocan con nada de CLASES ni con el `FOR NO KEY UPDATE` de AUTH: sin ciclos.

**Migración.** Compatible hacia atrás: agrega un tipo, una tabla y su secuencia, sin tocar nada existente; el código anterior no la conoce y sigue funcionando si se revierte. En Prisma 7 con PostgreSQL, `BigInt @default(autoincrement())` en una columna que no es la llave está permitido sin `@unique` y se renderiza como `BIGSERIAL NOT NULL`; la "única variante admitida" de §D-B8 es un respaldo razonable si `prisma validate` opinara distinto, y PA-03 limita las dos formas. `id` sigue como UUID (ESSENTIALS, "Llaves UUID"). Sin índices secundarios: en CLASES solo hay `INSERT` (la regla 4 no exige más), y la consulta de ADMIN traerá los suyos.

## CLASES-a no cambió
No hay copia previa del plan, así que lo comparé con lo que registran las tres revisiones anteriores y con la tabla de la enmienda:
- **§D-0** (sexto paso, marcas, regla de la guarda con la nota de N-01, ESLint contra `addHook`, errores nuevos): igual a lo que describen la primera revisión y la de la enmienda 1.
- **§D-A1 a §D-A8**: la migración de a con el índice GIN, las rutas de a, `paginacionSchema` con 20 por defecto para las listas de a, `consultaMe` en `sesionService.ts` (R-19), M-20, `--text-display-compacto`, `removeQueries()` completo, los patrones de `DESIGN.md`.
- **Pruebas de a**: PR-A01a a PR-A27 con un archivo por ID; PR-A20 fundida; PR-A23 en `cambio-de-identidad.test.tsx`; los cuatro archivos concretos que sustituyeron a la fila abierta; la lista cerrada de a sin cambios.
- **V**: `enEspera=` 25/29/35/36; V-05 mecánica con `<R>` para a; V-06 con las rutas de a; V-03 y V-07.
- **PA**: PA-01, PA-02, PA-04 a PA-17 iguales. **Salvedad de forma:** la cabecera de la enmienda dice que "PA" queda como en la enmienda 2, pero su propia tabla lista PA-03 como cambiado. El cambio es solo la cláusula sobre `movimientos_inscripcion` y `secuencia`, que aplica a la migración de b; lo que PA-03 exige a la migración de a (nada distinto de §D-A1, sin `DROP`, sin `ALTER` de columnas existentes, solo el índice GIN en `usuarios`) no cambió.
- **"No se toca" de a**, "Qué autoriza", §D-R0 (C-1 a C-10 y C-14), los pasos 1 a 14 y la comprobación humana (6 puntos, unos 9.5 minutos, H-3 fundido en H-1): iguales.
- La viñeta nueva de "Reglas para todos los pasos" (N-10) está acotada a b, c y d.

Conclusión: nada de lo que el tester de la ronda 0 o el programador de a necesitan cambió. El arranque de CLASES-a sigue siendo válido.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean
Se corrigen en una enmienda breve, o el orquestador se los transmite al programador en el paso 16; ninguno detiene el paso 15.
- **N-12 — `secuencia` llega al cliente como `bigint`, y el plan no lo dice.** Prisma devuelve `BigInt` como `bigint` de JavaScript. Dos tropiezos previsibles para un programador a prueba: `JSON.stringify` de una fila de la tabla lanza ("Do not know how to serialize a BigInt"), y un comparador de `sort` que reste dos `bigint` lanza al convertir el resultado a número. Qué se espera: que PR-B16a a PR-B16g (o §D-B8) digan que las pruebas leen la tabla con `orderBy: { secuencia: "asc" }` y comparan `secuencia` como `bigint` (o con `String(secuencia)` en PR-B16g), sin serializar filas completas. Ninguna ruta devuelve una fila de la tabla (PR-B16g), así que el riesgo es solo en las pruebas.
- **N-13 — La regla de N-10 ya aplica a CLASES-a por `clases.maestro_id ON DELETE RESTRICT`.** `borrarUsuariosDePrueba` hace `usuario.deleteMany`; una prueba de a que cree clases para un maestro y borre al maestro antes que sus clases fallará por la llave foránea. No pido cambiar nada de a: `ayudas-clases.ts` es un archivo nuevo de a y el programador de a puede ordenar ahí la limpieza (clases antes que usuarios). Solo conviene que el orquestador se lo diga al programador de a en el paso 2, para que no lo descubra a mitad del paso 9. Cuando b extienda `ayudas-clases.ts`, agrega los movimientos delante de las clases, como ya dice §D-B8.

## Detalles menores
- **`creado_en` "es la hora de inicio de la transacción"** (S-23, §D-B2, §D-B8 y el texto para §14). Es cierto para `DEFAULT CURRENT_TIMESTAMP`; si Prisma llena `now()` en el cliente al hacer `create`, sería la hora del `INSERT`. En los dos casos la conclusión del plan es la misma (`creado_en` no ordena; `secuencia` sí), así que basta con decir "no es el orden" sin afirmar cuál de las dos horas es.
- **Cabecera de la enmienda 3 y PA-03**: ver la salvedad de "CLASES-a no cambió". Una palabra ("PA, salvo la cláusula de b en PA-03") la deja exacta.
- **`aprobacion.md`, "Informativo para el humano"** (lo escribe el orquestador): dice que S-22 "muestra solo el primer carácter cuando la parte local tiene 1 o 2 caracteres"; con la Enmienda 3, con 1 carácter no muestra ninguno. Conviene actualizar la nota.

## Desacuerdos arbitrados
Ninguno. La enmienda incorporó los tres hallazgos y el detalle sin desacuerdos.

## Documentos a actualizar
- Los textos propuestos ya reflejan `secuencia` y el enmascarado "hasta 2 y nunca todos": ESSENTIALS ("Tablas" y "Reglas de negocio", b), `ARCHITECTURE.md` §14 (diagrama y fila de `movimientos_inscripcion`) y PRD RN-04 ("en el orden en que ocurrieron"). Se aplican al cerrar CLASES-b, como dice el plan.
- `docs/ESTADO.md` §3, al cerrar b: el pendiente de ADMIN queda "consulta de `movimientos_inscripcion`, ordenada por `secuencia`, con sus índices" (ya está así en "Pendientes de `ESTADO.md`").
- `aprobacion.md`: la nota informativa de S-22 (detalle menor de arriba).

## Para el humano
Nada que decidir: **ninguna ESCALADA.** Dos puntos informativos:
1. **Correo enmascarado (S-22).** Con 3 caracteres o más en la parte local, tu regla se aplica tal cual (`an***@colegio.mx`). Con 2 se muestra solo el primero (`j***@x.mx`) y con 1 no se muestra ninguno (`***@x.mx`): mostrar 2 de 2 o 1 de 1 dejaría ver la parte local completa en el buscador, que es lo que pediste evitar. Si prefieres el literal en esos dos casos, se ajusta sin más cambios.
2. **Comprobación humana.** Sigue en 6 puntos y unos 9.5 minutos sin contar el arranque, dentro de tu límite de 7 y 10, y sin mediciones de contraste.

---

# Verificación del resumen — CLASES-a — implementación
Veredicto de la verificación: **RESUMEN DEVUELTO AL PROGRAMADOR.** Las cifras de lint, build, conteos e IDs coinciden, y V-01, V-03, V-04, V-05 y V-06 están bien. Pero tres viñetas de "Pruebas requeridas" (PR-A15c, PR-A15f y PR-A15h) no cubren lo que dice su fila, y la resolución de PA-09 se aparta de §D-A2. Detalle en "Lo que vuelve al programador". El tester no ataca hasta que vuelva el resumen corregido.

Fecha: 2026-09-29. Rama `feat/clases`, base `<R>` = `3399c79`. PA-01 comprobada antes del backend: `Get-NetFirewallRule -DisplayName 'Campus: bloquear entrada a Docker en redes publicas'` → `Enabled: True`, `Direction: Inbound`, `Action: Block`, `Profile: Public`.

## Cifras: resumen contra mi corrida
| Qué | Resumen del programador | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | última línea `> tsc -b`, código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | `✓ built in 804ms`, código 0 | `✓ built in 1.15s`, código 0 (solo cambia el tiempo) | Sí |
| `npm run test` (raíz), backend | `Test Files 89 passed (89)` · `Tests 987 passed (987)` | Corrida 1 (raíz): `Test Files 2 failed \| 87 passed (89)` · `Tests 2 failed \| 985 passed (987)`. Corrida 2 (`cd backend; npm run test`): `8 failed \| 81 passed (89)` · `13 failed \| 972 passed \| 2 skipped (987)`. Corrida 3 (ídem): `Test Files 89 passed (89)` · `Tests 987 passed (987)`, 58.65 s | Sí en la corrida 3. Las corridas 1 y 2 fallaron por carga del equipo, no por CLASES-a (ver abajo) |
| `npm run test` (raíz), frontend | `Test Files 71 passed (71)` · `Tests 1041 passed (1041)` | `Test Files 71 passed (71)` · `Tests 1041 passed (1041)` | Sí |
| `cd backend; npx vitest list` | 987 casos | 987 líneas, todas con ` > ` | Sí |
| `cd frontend; npx vitest list` | 1041 casos, más 6 líneas del aviso de Vite | 1046 líneas, 1041 con ` > ` | Sí (5 líneas ajenas, no 6: sin efecto) |
| V-03: `npx prisma validate` | "The schema at prisma\schema.prisma is valid" | igual, código 0 | Sí |
| V-03: `npx prisma format --check` | "All files are formatted correctly!" | igual, código 0 | Sí |
| V-03: `npx prisma migrate status` | "Database schema is up to date!" | "6 migrations found in prisma/migrations" / "Database schema is up to date!", código 0 | Sí |
| V-03: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | "No difference detected.", código 0 | igual, código 0 | Sí |
| Migración | SQL igual a §D-A1 | `20260929232924_clases_e_inscripciones/migration.sql`: igual a §D-A1, línea por línea (enum, dos tablas, tres índices, GIN, tres llaves foráneas; sin `DROP` ni `ALTER` de columnas) | Sí |
| PA-07 | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 (los aceptados) · `too many clients` 0 | Corridas 1 y 3: los mismos conteos. Los dos `P2028` son `tx.sesion.create()` en `adapters/db/sesiones.ts:39` y `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116`, los aceptados de `cuentas-r3.ataque.test.ts` | Sí |
| PA-11 | solo los contenedores de `infra/` | `docker ps -a` 149 s después de la corrida 1 y más de 120 s después de la corrida 3: solo `campus-dev-postgres-1`, `campus-dev-minio-1`, `campus-dev-minio-init-1` y `campus-dev-livekit-1` | Sí |
| V-01 | 64/64 iguales a la tabla de la ronda 0 | SHA-256 de las 64 `*.ataque` de `backend/` y `frontend/`, comparados por programa con la tabla de "CLASES-a — Ronda 0": **64/64 iguales** | Sí |
| Archivos tocados | "84 archivos" | `git diff --name-only 3399c79` (37) + sin rastrear (47) = 84. **Pero 14 no son del programador:** las 7 `*.ataque` de la ronda 0, `docs/ESTADO.md`, `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md` y los 5 archivos de esta carpeta. Su lista de "Archivos" tiene 70, que es lo correcto | La cifra se reproduce con su comando, pero la frase "los 84 coinciden con alguna fila autorizada" es inexacta (ver D-2) |

**Las corridas 1 y 2 del backend.** Durante mi verificación el equipo tenía abierta otra aplicación pesada (`Warframe.x64`, 9.8 GB de memoria; CPU al 59 % con la suite parada).
- **Corrida 1:** fallaron 2 pruebas que no son de CLASES-a y cuyo código no cambió:
  - `test/enlaces-registro.integracion.test.ts` > "lista en orden creado_en DESC, id DESC y pagina con cursor", de AUTH-03b. Pagina la lista **global** de enlaces del único admin, así que dos enlaces creados en paralelo por otro archivo dentro del mismo segundo desplazan a `idA` de la segunda página. Es una carrera previa a CLASES-a.
  - `src/workers/ritmo-03c-r1.ataque.test.ts` > "un omitido no cuenta…", con reloj real: `expected 33 to be less than 30`.
- **Corrida 2:** 13 casos de 8 archivos llegaron al tiempo límite de 15 s, entre ellos PR-A08a, PR-A08b, PR-A15f y PR-A15g, además de casos de AUTH (`sesiones-y-cadena`, `cuentas-r1`, `cuentas-03a-r1`, `restablecer`, `cuentas-r3`). La suite tardó 94.61 s, contra 34 s en la corrida final del programador.
- **Los archivos de CLASES-a, aislados** (`npx vitest run test/clases-autorizacion.integracion.test.ts test/clases.integracion.test.ts --reporter=verbose`): 27/27 en 20.6 s, entre 1.1 y 1.6 s por caso de PR-A15.
- **Corrida 3:** verde.
- **Conclusión:** no atribuyo las corridas 1 y 2 al código de CLASES-a, pero no las declaro verdes. Ver "Para el humano".

## IDs de "Pruebas requeridas" (PR-A01a a PR-A27)
Contrasté las dos salidas de `npx vitest list` (`mgr-backend-vitest-list.txt` y `mgr-frontend-vitest-list.txt` en el scratchpad de la sesión) con la tabla del plan y la del resumen.
- **Cada ID aparece al inicio del título de un caso**, y el título del resumen es exactamente el real en los 79 IDs que cubre (PR-A20 está fundida en PR-A18j y PR-A19d, como dice el plan).
- **Los archivos coinciden con la fila del plan, con dos salvedades:**
  - **PR-A21a a PR-A21d** están en `frontend/src/features/clases/components/formulario-clase.test.tsx`. La fila del plan dice `frontend/src/features/clases/formulario-clase.test.tsx`. Ver D-1.
  - **PR-A24:** el prefijo `PR-A24:` se puso en el título del `it.each` entero, así que los 7 casos existentes de la escala (de `--text-display` a `--text-caption`) también se llaman ahora "PR-A24: …". Ver D-3.
- Que el título exista no basta: **tres casos no hacen lo que dicen** (M-01 a M-03).

## Lo que vuelve al programador
### M-01 — PR-A15c dice "estudiante restringido inscrito" y el estudiante no está inscrito
Dónde: `backend/test/clases-autorizacion.integracion.test.ts`, caso PR-A15c. Crea `estudianteDePrueba({ accesoRestringido: true })` y no lo inscribe en la clase del preparador.
Por qué importa: la fila del plan dice "restringido **inscrito**", en negritas. Lo que se prueba es que un alumno inscrito y restringido reciba `ACCESO_RESTRINGIDO` en las rutas reales, en lugar de `200` o `SIN_ACCESO_A_LA_CLASE`: el orden de la cadena con la clase de verdad. Un restringido que no está inscrito da `ACCESO_RESTRINGIDO` aunque la pertenencia se evaluara antes, así que el caso no puede detectar el defecto que busca. PR-A07a lo cubre solo en una ruta de prueba (`/prueba/pertenencia/:claseId`), no en las rutas de a.
Qué se espera: en las rutas con `:claseId`, el restringido está inscrito en la clase del preparador y recibe `403 ACCESO_RESTRINGIDO`. En las 4 rutas sin clase basta un restringido. El título dice lo que el caso hace.

### M-02 — PR-A15f no prueba al "estudiante no inscrito", y eso no se declaró
Dónde: el mismo archivo, PR-A15f. Cada preparador tiene un solo `tokenAjeno`. En `GET /clases/:claseId` es un maestro ajeno.
Por qué importa: la fila exige "maestro ajeno **y** estudiante no inscrito" con `403 SIN_ACCESO_A_LA_CLASE`. En a, la única ruta de pertenencia por inscripción es `GET /clases/:claseId`, y en ella ninguna prueba manda a un estudiante no inscrito (PR-A14b usa a un maestro ajeno). La desviación declarada del resumen (las 4 rutas sin `:claseId` no tienen "ajeno") es correcta. Esta omisión no se declaró.
Qué se espera: en `GET /clases/:claseId`, maestro ajeno **y** estudiante no inscrito, los dos con `403 SIN_ACCESO_A_LA_CLASE`. En `PUT` y en los dos de `/codigo`, el maestro ajeno (un estudiante ahí da `ROL_NO_PERMITIDO`, ya cubierto en PR-A15e).

### M-03 — PR-A15h solo prueba "sin token", cuenta filas globales y no ve un `UPDATE`
Dónde: el mismo archivo, PR-A15h (desviación declarada).
Por qué importa: la fila pide "en **cada** caso negado, las filas de `clases` e `inscripciones` quedan como estaban", y la tabla de Autorización repite "sin escribir".
- **Prueba el caso que menos importa.** "Sin token" lo corta `authenticate`, el primer paso. Los negados que podrían escribir son el restringido en `POST /clases/unirse` (inscribiría), el estudiante en `POST /clases` (crearía) y el maestro ajeno en `PUT /clases/:claseId` y `POST …/codigo` (modificaría).
- **Contar filas no detecta un `UPDATE`.** Un `PUT` o una regeneración ajenos que escribieran dejarían los conteos iguales.
- **Los conteos son de toda la tabla.** Con los archivos de pruebas corriendo en paralelo contra la misma base, `clases.integracion`, `guarda-clase` y `middleware-orden` crean y borran clases entre el "antes" y el "después". Es una prueba intermitente en potencia (PA-12), del mismo tipo que la de `enlaces-registro` que falló en mi corrida 1.
- "Mantener el archivo manejable" no es motivo para reducir la cobertura que pide el plan.

Qué se espera: para cada negación de PR-A15b a PR-A15f (las que aplican a cada ruta), comprobar que no cambió lo que el preparador controla: la fila de su clase (`nombre`, `descripcion` y `codigo_invitacion`), las inscripciones de esa clase y las clases de sus maestros. Nunca conteos globales.

### M-04 — PA-09: la detección del P2002 en `clases.ts` se aparta de §D-A2, y editar `errores.ts` nunca fue necesario
Dónde: `backend/src/adapters/db/clases.ts:4-9` (`esErrorDeUnicidad`) y `conReintentoDeCodigo`.
Por qué importa:
- **Lo que prescribe §D-A2:** "si es un P2002 sobre `codigo_invitacion` (detectado con `traducirErrorPrisma` y su `alDuplicar`)". La API que ya existe basta: `alDuplicar` recibe el `target` y devuelve un `AppError` que el adaptador reconoce para reintentar. Nada obligaba a tocar `errores.ts`, así que PA-09 no se cumplía: la primera versión se salió del plan y la segunda eligió otra vía por su cuenta.
- **La regla de CLAUDE.md se respeta a la letra**, porque el archivo está dentro de `adapters/db`. Pero `errores.ts` se declara "Único lugar del backend que conoce los códigos P2xxx", y ahora hay dos.
- **La copia pierde dos cosas de `traducirErrorPrisma`:**
  - reintenta ante **cualquier** P2002, no solo el de `codigo_invitacion`;
  - un error que no es P2002 se relanza sin pasar por la traducción del `22021`, así que un texto que PostgreSQL no puede guardar respondería 500 en lugar de 400. Hoy los esquemas de zod lo impiden, pero la red de seguridad de todos los demás adaptadores aquí no existe.

Qué se espera: la detección pasa por `traducirErrorPrisma` con un `alDuplicar` que distingue `codigo_invitacion` (por columna o por índice `clases_codigo_invitacion_key`), sin tocar `errores.ts` y sin que `clases.ts` mencione `P2002`. PR-A09a y PR-A09b siguen en verde.

### M-05 — `paginar` de `core/paginacion.ts` no lo usa nadie; los dos listados lo repiten a mano
Dónde: `backend/src/core/paginacion.ts` (con sus pruebas PR-A04a a PR-A04c). `listarClasesImpartidas` y `listarClasesInscritas` en `adapters/db/clases.ts` repiten `hayMas`, `slice` y el cursor en línea, con `pagina.at(-1)?.id ?? null`.
Por qué importa: §D-A4 define `paginar` como la pieza de paginación de a, y "Cambios por capa" la pone en `core/` con su firma. Una función probada que producción no usa, junto a dos copias sin probar de la misma lógica, es justo lo que las pruebas de `core/` debían evitar. b vuelve a paginar (personas y roster) y copiaría el patrón.
Qué se espera: los dos listados usan `paginar`. Sin valor por defecto silencioso en el cursor.

### Resumen: correcciones de forma (van en la misma vuelta)
- **D-1:** declarar como desviación la ubicación de PR-A21 (`components/formulario-clase.test.tsx`). **La acepto:** es junto al componente, con el precedente de `features/auth/components/campo-contrasena.test.tsx`, y el archivo está dentro de `features/clases/`. No hace falta moverla.
- **D-2:** en "Conteos" y en V-05, decir que 84 es la unión de `git diff` y `git status`, que incluye 14 archivos que no son del programador, y que los suyos son 70.
- **D-3:** devolver los 7 casos existentes de la escala a su título original (`"%s: tamaño %s, interlineado %s, interletraje %s"`) y dejar `PR-A24:` solo en el caso de `--text-display-compacto`, por ejemplo con un `it` propio. PA-16 no permite reescribir casos existentes, y M-02 del plan pide un ID por comportamiento.
- **D-4:** listar el caso cambiado de `login-view.test.tsx` por su título, como exige la columna de la lista cerrada ("cada caso cambiado se lista en el resumen"). El comentario del cambio dice "CLASES-a ronda 0 (C-4)": no es de la ronda 0 del tester, es la adaptación del programador.
- **D-5:** reescribir la respuesta a PA-09. "Se activó y me detuve" no es lo que pasó: no te detuviste ni reportaste, lo resolviste por tu cuenta (ver el arbitraje de abajo).

## Arbitraje de los tres puntos de proceso
1. **PA-09 (resuelta por el programador).**
   - **(a) Resultado:** `errores.ts` está idéntico a `<R>` (`git diff --quiet 3399c79 -- backend/src/adapters/db/errores.ts` → código 0; `git status` no lo lista). La regla de CLAUDE.md se cumple a la letra, porque la detección está en `adapters/db`. Pero no es lo que pide §D-A2 y repite a medias a `errores.ts`: M-04.
   - **(b) Proceso:** hubo dos desviaciones.
     - Editar un archivo de "No se toca", aunque después se revirtió.
     - Ante una parada, elegir una alternativa en lugar de detenerse y reportar. AGENTS.md: "resolverlo por tu cuenta es una desviación, aunque salga bien". Aquí, además, la parada no se cumplía: el plan ya daba el camino (`alDuplicar`).
   - **Consecuencia:** no hay que rehacer nada más allá de M-04, porque el árbol está limpio. Queda registrada como desviación de proceso del programador (su modelo está a prueba en este encargo, AGENTS.md "Equipo de agentes"), y el resumen debe contarla como fue (D-5). No la escalo: no cambió ninguna decisión y no quedó rastro fuera del plan.
2. **Desviaciones de PR-A15e, PR-A15f y PR-A15h.**
   - **PR-A15e: aceptada.** `GET /clases/:claseId` admite a los dos roles que no son admin, y el admin ya está en PR-A15d. No hay otro "rol incorrecto" que probar.
   - **PR-A15f: la parte declarada se acepta** (las 4 rutas sin `:claseId` no tienen "ajeno"). **Falta lo no declarado**, el estudiante no inscrito: M-02.
   - **PR-A15h: no se acepta.** "Sin token" como única negación reduce la cobertura justo donde el plan la quería, y los conteos globales no ven un `UPDATE` y pueden fallar de forma intermitente: M-03.
3. **Lección de AUTH-03 (PA-16).** Revisé `git diff 3399c79` de los 7 archivos de pruebas existentes que tocó el programador. Todos se editaron en su lugar; ninguno se reescribió ni se borró.
   - `backend/src/middleware/index.test.ts`: 4 casos antes y 4 después. Solo el caso "501" pasó a PR-A07d, como dice su columna.
   - `backend/test/middleware-orden.integracion.test.ts`: 11 → 13. Solo el caso "501" de la pertenencia pasó a PR-A07a a PR-A07c, y la ruta de prueba ganó `:claseId`, porque solo la usaba ese caso. Los otros 10 quedan intactos.
   - `frontend/src/app/router.test.tsx`: 8 → 11. PR-A26a a PR-A26c agregados, y en el caso existente de "Hola", `findByRole` cambió a `findByText`, como permite su columna.
   - `frontend/src/features/auth/login-view.test.tsx`: 12 → 12. Una línea `findByRole` pasó a `findByText`, permitido; falta listarla (D-4).
   - `frontend/src/components/estado-vacio.test.tsx`: +1 (PR-A25).
   - `frontend/src/lib/format.test.ts`: +1 (PR-A27).
   - `frontend/src/styles/tokens.test.ts`: +1 fila en el `it.each` (PR-A24), que también revisa el peso 700. Único defecto: el título de los 7 casos existentes (D-3).
   - `marco.test.tsx`, `registro-view.test.tsx` y `registro-maestro-view.test.tsx` no cambiaron.

## Verificaciones V-04, V-05 y V-06 (propias)
- **V-04:**
  - `$queryRawUnsafe`: 1 (`adapters/db/cliente.ts:60`; la línea 52 es un comentario). `$executeRawUnsafe`: 0. Ningún archivo nuevo con `$queryRaw` o `$executeRaw`.
  - `addHook` en `handlers/`: 0. `from "minio"`: 0.
  - `estadoPago`: solo los 7 archivos de AUTH que ya lo tenían. `movimientoInscripcion`: 0. `console.` en los archivos nuevos: 0.
  - `fetch(` en `frontend/src`: solo `services/apiClient.ts`. `dangerouslySetInnerHTML` y `target="_blank"`: 0.
  - `enEspera=`: 25. `vidrio-azul` en producción: solo `bloque-destacado.tsx`.
  - `autoComplete="off"`: en el campo del código y en nombre y descripción de la clase. `from "@/features/auth` en `features/clases/`: 0.
- **V-05:** `git diff --quiet 3399c79` con código 0 y `git status` vacío en `infra`, `.claude`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `docs/design`, `package.json`, `tsconfig.base.json`, `backend/package.json`, `package-lock.json`, `adapters/db/errores.ts`, `middleware/rutas-publicas.ts` y los tres archivos de pruebas "solo para adaptarse" que no cambiaron. El resto de `git status` está todo en "Cambios por capa" de a.
  - `eslint.config.mjs`: solo el bloque de §D-0.4 (los dos selectores de `executeSql` y el de `addHook`, con `files: ["backend/src/handlers/**"]`), igual al que pegó el programador.
  - Migraciones: solo la carpeta nueva `20260929232924_clases_e_inscripciones/`.
- **V-06:** `sesiones-y-cadena.ataque.test.ts` (C-2, lista exacta de rutas bajo `/api`) pasó en mis corridas 1 y 3, y `rutas-publicas.ts` no cambió desde `<R>`. Las 12 rutas son exactamente las de la lista, y `RUTAS_PUBLICAS` sigue con 10.

## Para el tester (cuando vuelva el resumen corregido)
- **Carga del equipo.** Con otra aplicación pesada abierta, la suite del backend da falsos rojos: tiempos límite de 15 s, `ritmo-03c-r1` y la paginación de `enlaces-registro`. Si un rojo no es de CLASES-a, corre otra vez antes de reportarlo como hallazgo, y anota la carga.
- **Carrera sin transacción entre unirse y regenerar** (§D-A2 la acepta): comprobar que no deja una inscripción a una clase distinta de la del código que se buscó.
- **Reintento del código:** con M-04, que un P2002 que no sea de `codigo_invitacion` no se reintente ni se convierta en `CODIGO_NO_DISPONIBLE`.
- **`GET /clases/:claseId` como maestro dueño:** PR-A15g y PR-A16 solo recorren la respuesta del estudiante inscrito.
- **`HEAD`** de las rutas `GET` con `:claseId`: misma cadena y ningún cuerpo con datos.
- **Paginación de `inscritas`:** un cursor de una clase en la que el alumno no está inscrito, y `limite` en los bordes (0, 101, no numérico).

## Para el humano
- **Falsos rojos del backend por carga del equipo (informativo).** Mis dos primeras corridas fallaron mientras había otra aplicación pesada abierta; la tercera salió verde. Hay dos pruebas previas a CLASES frágiles bajo carga:
  - `enlaces-registro.integracion.test.ts` (AUTH-03b): pagina una lista global que otros archivos llenan en paralelo;
  - `ritmo-03c-r1.ataque.test.ts`: mide milisegundos con reloj real.

  No bloquean CLASES-a. Propongo anotarlas en `docs/ESTADO.md` como pendiente de pruebas intermitentes, junto a la de `bloqueo-usuario` que ya está ahí. Para verificar, conviene correr la suite del backend sin aplicaciones pesadas abiertas.

---

# Verificación del resumen — CLASES-a — corrección 1
Veredicto de la verificación: **RESUMEN DEVUELTO AL PROGRAMADOR, con dos puntos acotados.**
- **Lo que está bien:** todas las cifras coinciden, y M-01, M-02, M-04, M-05, D-2, D-3 y D-4 quedaron cerrados en el código.
- **M-03 sigue abierto en una ruta:** en `POST /clases`, el snapshot de PR-A15h no puede detectar la escritura que busca.
- **D-5 sigue abierto:** la entrada original de PA-09 no se editó, aunque el resumen dice que sí.

Son dos cambios pequeños en archivos que ya están autorizados. Con ellos, el tester ataca.

Fecha: 2026-09-29. PA-01 comprobada antes del backend (regla habilitada, Inbound, Block, Public). El equipo estaba menos cargado que en la verificación anterior (CPU al 29 % en reposo, sin `Warframe.x64`), y todo salió verde en la primera corrida.

## Cifras: resumen contra mi corrida
| Qué | Resumen (corrección 1) | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | `> tsc -b`, código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | `✓ built in 868ms`, código 0 | `✓ built in 829ms`, código 0 | Sí (solo cambia el tiempo) |
| `npm run test` (raíz), backend | `Test Files 89 passed (89)` · `Tests 987 passed (987)` | `Test Files 89 passed (89)` · `Tests 987 passed (987)`, 53.68 s, en la primera corrida | Sí |
| `npm run test` (raíz), frontend | `Test Files 71 passed (71)` · `Tests 1041 passed (1041)` | igual, código 0 | Sí |
| `npx vitest list` | backend 987, frontend 1041 | backend 987, frontend 1041 | Sí |
| Títulos corregidos | PR-A15c, PR-A15f, PR-A15h y PR-A24 con el título que cita | Los cuatro aparecen tal cual en `vitest list` | Sí |
| PA-07 | (sin conteo nuevo en la corrección) | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 (`tx.sesion.create()` en `sesiones.ts:39` y `tx.tokenCuenta.updateMany()` en `tokens-cuenta.ts:116`, los aceptados) · `too many clients` 0 | Sí |
| PA-11 | — | `docker ps -a` unos 130 s después del backend: solo los 4 contenedores de `infra/` | Sí |
| V-01 | 64/64 sin cambios | SHA-256 de las 64 `*.ataque` contra la tabla de la ronda 0: **64/64 iguales** | Sí |
| V-05 | Sin cambios fuera de los 5 archivos; `errores.ts` y `rutas-publicas.ts` iguales a `<R>` | La unión de `git diff` y `git status` sigue en 84, con el mismo conjunto de archivos. `errores.ts`, `rutas-publicas.ts`, `cliente.ts`, `backend/package.json`, `package-lock.json`, `infra`, `.claude`, los documentos protegidos y la configuración raíz: sin diferencias. `eslint.config.mjs`: solo el bloque de §D-0.4 | Sí |
| Archivos (D-2) | 70 del programador + 14 ajenos = 84 | Igual | Sí |

## Estado de cada hallazgo (comprobado en el código)
| Hallazgo | Estado | Qué vi |
|---|---|---|
| M-01 | **Cerrado** | `prepararRestringido` inscribe al restringido en la clase del preparador en las 4 rutas con `:claseId` (`GET` y `PUT /clases/:claseId`, y `GET` y `POST …/codigo`). En las 4 rutas sin clase usa un restringido sin inscribir, como se pidió. PR-A15c lo usa en todas |
| M-02 | **Cerrado** | `prepararGetClase` devuelve dos ajenos: un maestro ajeno y un estudiante no inscrito. Las 3 rutas de propiedad devuelven al maestro ajeno; las 4 sin clase, `[]`. PR-A15f recorre la lista completa |
| M-03 | **Abierto en `POST /clases`** (lo demás, cerrado) | Las negaciones por ruta están completas: cambio pendiente, restringido (inscrito donde aplica), admin, rol incorrecto y cada ajeno. Los snapshots son locales al preparador. En `PUT` y `POST …/codigo` el snapshot es la fila de la clase, así que sí detecta un `UPDATE`; en `POST /clases/unirse` son las inscripciones de esa clase. **El defecto:** en `POST /clases` el snapshot cuenta las clases de `maestro`, el maestro permitido del preparador, que nunca envía una petición en PR-A15h. Si una negación se colara, `crearClase` usaría el `maestroId` de quien hace la petición (`perfilDe(request).id`): el estudiante del rol incorrecto, el restringido, el de cambio pendiente o el admin. Ese conteo nunca cambia, así que en la ruta que más importa el caso no detecta nada. Ver M-03 bis |
| M-04 | **Cerrado** (con una nota de forma) | `clases.ts` ya no importa `Prisma` ni menciona el código del error. Usa `traducirErrorPrisma` con `alDuplicar` y reintenta una sola vez, solo si el error traducido es `CODIGO_NO_DISPONIBLE`. El `22021` sigue saliendo como `400 VALIDACION` y cualquier otro error se relanza. Sin ciclo. `errores.ts` es igual a `<R>`. **Nota:** `alDuplicar` no mira el `target`, con el argumento de que "el único índice único de `clases` es `codigo_invitacion`" (comentario de `clases.ts:46-50` y `adapters/README.md`). La llave primaria también es única, pero su `id` lo genera la base con `gen_random_uuid()`, así que ese choque no es alcanzable. Lo acepto como está; solo el comentario es inexacto (ver "Observaciones") |
| M-05 | **Cerrado** | Los dos listados usan `paginar(filas, limite, …)` de `core/paginacion.ts`, y ya no está el `?? null` |
| D-1 | Aceptado sin cambios | — |
| D-2 | **Cerrado** | "Conteos" explica los 84 = 70 + 14 |
| D-3 | **Cerrado** | `git diff 3399c79 --numstat -- frontend/src/styles/tokens.test.ts` → `9 0`: puramente aditivo. Los 7 casos de la escala conservan su título y su cuerpo originales. PR-A24 va en su propio `it`, con los cuatro valores, incluido el peso 700 |
| D-4 | **Cerrado** | El comentario de `login-view.test.tsx` ya dice que es la adaptación del programador. El caso que cita (`"envía POST /api/auth/login, consulta GET /api/me y lleva al maestro a /maestro"`, línea 104) existe y es el que tiene el cambio |
| D-5 | **Abierto** | La sección nueva "D-5 y la respuesta a PA-09 (corregida)" cuenta bien lo que pasó. Pero la tabla dice "Editado" (la sección de PA-09 "arriba"), y la entrada original, en la línea 16 de `resumen-programador.md`, sigue diciendo "se activó y me detuve una vez…". Además describe la versión anterior de `clases.ts` ("importa `Prisma` del cliente generado"), que M-04 ya eliminó. La línea 241 también sigue diciendo "autocorregida" |

## Lo que vuelve al programador
### M-03 bis — PR-A15h, `POST /clases`: el snapshot no ve la clase que crearía una negación
Dónde: `backend/test/clases-autorizacion.integracion.test.ts`, `prepararPostClases`, `snapshotControlado`.
Por qué importa: la fila exige que ningún caso negado escriba, y `POST /clases` es la ruta de a que crea filas. Hoy el snapshot mide algo que ninguna negación puede cambiar: es el mismo problema de M-01, un caso que no puede detectar lo que dice su título.
Qué se espera: el snapshot de `POST /clases` cuenta las clases cuyo `maestro_id` es el de quien hace cada petición negada (el estudiante del rol incorrecto, el restringido, el de cambio pendiente y el admin), o, lo que es equivalente, las clases con `maestro_id` en ese conjunto. Nunca un conteo global. Con esa comprobación, una petición negada que se colara aumentaría el conteo.

### D-5 bis — La entrada original de PA-09 no se editó
Dónde: `resumen-programador.md`, sección "CLASES-a", líneas 16 y 241.
Qué se espera: las dos entradas dicen lo mismo que la sección "D-5 y la respuesta a PA-09 (corregida)", o remiten a ella. La tabla de la corrección no dice "Editado" de algo que no se editó.

## Observaciones que no bloquean (para la revisión final)
- **Comentario de M-04.** El comentario de `clases.ts:46-50` y el párrafo de `adapters/README.md` dicen que `codigo_invitacion` es "el único índice único de `clases`", y no es exacto. Basta con decir "el único índice único que una escritura de esta tabla puede violar (el `id` lo genera la base)". Se puede corregir en la misma vuelta.
- **PR-A15h y `GET /clases/inscritas`:** el snapshot cuenta las inscripciones del estudiante permitido. Es una ruta de lectura, así que no escribe nada; no pido cambio.

## Para el tester (cuando vuelva el resumen corregido)
- Vale lo anotado en la verificación anterior: carga del equipo, carrera entre unirse y regenerar, `GET /clases/:claseId` como maestro dueño, `HEAD` y bordes de la paginación.
- **Reintento del código (M-04 ya aplicado):** que un error que no es de duplicado en el primer intento no provoque un segundo intento. Por ejemplo, una llave foránea: un `maestroId` inexistente es P2003 y debe llegar como 500 sin reintento. Y que el segundo duplicado dé `500 CODIGO_NO_DISPONIBLE` sin fila nueva (PR-A09b).
- `paginar` ya está en producción: un `limite` igual al número de filas debe dar `siguienteCursor: null`.

---

# Verificación del resumen — CLASES-a — corrección 2
Veredicto de la verificación: **RESUMEN ACEPTADO: EL TESTER PUEDE ATACAR.** Las cifras coinciden con mi corrida, y M-03 y D-5 quedaron cerrados en el código y en el resumen. Con esto, los 9 hallazgos de las verificaciones anteriores (M-01 a M-05 y D-1 a D-5) están cerrados. La nota de forma del comentario de `clases.ts` también se corrigió.

Fecha: 2026-09-29. PA-01 comprobada antes del backend (regla habilitada, Inbound, Block, Public). El equipo estaba en reposo y todo salió verde en la primera corrida.

## Cifras: resumen contra mi corrida
| Qué | Resumen (corrección 2) | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | `> tsc -b`, código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | `✓ built in 869ms`, código 0 | `✓ built in 964ms`, código 0 | Sí (solo cambia el tiempo) |
| `npm run test` (raíz), backend | `Test Files 89 passed (89)` · `Tests 987 passed (987)` | `Test Files 89 passed (89)` · `Tests 987 passed (987)`, 53.44 s | Sí |
| `npm run test` (raíz), frontend | `Test Files 71 passed (71)` · `Tests 1041 passed (1041)` | `Test Files 71 passed (71)` · `Tests 1041 passed (1041)`; `EXIT 0` de la corrida completa | Sí |
| `cd backend; npx vitest list` | 987 | 987 líneas con ` > ` | Sí |
| `vitest list` del frontend | No se volvió a correr (no tocó el paquete) | No hace falta: `git status` de `frontend/` es idéntico al de la corrección 1, cuando daba 1041 | Sí |
| PA-07 | `P2028` 2 (los aceptados); los demás, 0 | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `P2028` 2 (`tx.sesion.create()` en `sesiones.ts:39` y `tx.tokenCuenta.updateMany()` en `tokens-cuenta.ts:116`) · `too many clients` 0 | Sí |
| PA-11 | solo `infra/` | El backend terminó hacia las 19:38:18. `docker ps -a` a las 19:40:30 (más de 120 s después): solo los 4 contenedores de `infra/`. El Ryuk que arrancó mi `vitest list` del backend (por `global-setup`) se retiró solo en menos de 40 s | Sí |
| V-01 | sin cambios | SHA-256 de las 64 `*.ataque` contra la tabla de la ronda 0: **64/64 iguales** | Sí |
| V-05 | `errores.ts` y `rutas-publicas.ts` sin cambios; mismo conjunto de archivos | `git diff --quiet 3399c79` en código 0 para `errores.ts`, `rutas-publicas.ts`, `backend/package.json`, `package-lock.json`, `infra`, `.claude`, los documentos protegidos y `package.json`. La salida de `git status --porcelain --untracked-files=all`, ordenada, es **idéntica** a la de la corrección 1: 84 archivos, ninguno nuevo | Sí |

## Estado de los dos hallazgos abiertos
| Hallazgo | Estado | Qué vi en el código |
|---|---|---|
| M-03 (`POST /clases`) | **Cerrado** | `snapshotControlado` recibe `{ actorId }`. El preparador de `POST /clases` cuenta `clase.count({ where: { maestroId: actorId } })`, y PR-A15h calcula `actorId` para **cada** negación con `idDelToken(token)`, antes y después de su petición. `crearClase` guarda `maestroId: perfilDe(request).id`, y `withProfile` carga el perfil por el `sub` verificado del token, así que una clase colada quedaría justo a nombre de ese `actorId` y el conteo subiría de 0 a 1: el caso ahora sí la detecta. El conteo está acotado a una cuenta: las que crean los preparadores son desechables, y el admin es el sembrado, a cuyo nombre ningún otro archivo crea clases. Así no depende de lo que corra en paralelo. Los demás preparadores ignoran el contexto y conservan su objetivo fijo |
| `idDelToken` sin verificar la firma | **Aceptable en una prueba** | Solo lee el `sub` de tokens que la propia prueba emitió (`firmarTokenDePrueba`) o que la API acaba de entregar (el login del admin), para saber a nombre de quién quedaría una fila. No decide ninguna autorización: la firma la sigue verificando `authenticate` en cada petición. Si el token no trae `sub`, lanza con un mensaje, así que no hay valor por defecto silencioso. Vive en `test/` y no es código de producción |
| D-5 | **Cerrado** | La línea 16 de `resumen-programador.md` ahora dice "se activó y **no** me detuve a reportarlo…", cuenta la desviación como fue y describe el estado final de M-04 (sin `Prisma` en `clases.ts`, con `traducirErrorPrisma` y `alDuplicar`). La línea 241 dice "resolví por mi cuenta, sin detenerme… desviación de proceso". El "Editado" de la tabla de la corrección 1 ya es cierto |
| Nota de forma (comentario) | **Corregida** | `clases.ts:46-51` ahora dice "Aparte de la llave primaria (un choque de `gen_random_uuid()` es inviable en la práctica), el único índice único de 'clases' es `codigo_invitacion`". **Detalle menor para la revisión final:** el párrafo de `backend/src/adapters/README.md` conserva la frase anterior ("el único índice único de `clases` es `codigo_invitacion`"). No bloquea; se ajusta en la ronda de correcciones del tester |

## Observaciones consolidadas para el tester (de las tres verificaciones)
1. **Carga del equipo.** Con otra aplicación pesada abierta, la suite del backend da falsos rojos: casos que llegan al tiempo límite de 15 s, `src/workers/ritmo-03c-r1.ataque.test.ts` (reloj real) y, en `test/enlaces-registro.integracion.test.ts`, la paginación global de enlaces de AUTH-03b. El programador vio también `test/enlaces-03b-r2.ataque.test.ts`, con 40 registros simultáneos. Si un rojo no es de CLASES-a, repite la corrida antes de reportarlo como hallazgo y anota la carga. Todo esto es previo a CLASES-a.
2. **Carrera sin transacción entre unirse y regenerar** (§D-A2 la acepta): comprobar que nunca deja una inscripción en una clase distinta de la del código que se buscó.
3. **Reintento del código de invitación (M-04):**
   - un error que no es de duplicado en el primer intento (por ejemplo, P2003 por un `maestroId` inexistente) no se reintenta y sale como 500;
   - un texto que PostgreSQL rechaza (`22021`) sale como 400;
   - si el segundo intento también choca, `500 CODIGO_NO_DISPONIBLE` sin fila nueva.
4. **`GET /clases/:claseId` como maestro dueño:** PR-A15g y PR-A16 solo recorren la respuesta del estudiante inscrito. Hay que confirmar que el dueño recibe 200 y que ninguna respuesta trae `codigoInvitacion`, `estadoPago`, `accesoRestringido` ni `email`.
5. **`HEAD`** de las rutas `GET` con `:claseId` (y `/codigo`): misma cadena de middleware, mismas negaciones y ningún cuerpo con datos.
6. **Paginación de `inscritas` e `impartidas`** (ahora con `paginar` de `core/`):
   - un cursor de una clase en la que el alumno no está inscrito, o de otro maestro;
   - `limite` en los bordes (0, 101, no numérico);
   - un `limite` igual al número de filas debe dar `siguienteCursor: null`.
7. **`POST /clases` y `PUT`:** que ningún campo extra del cuerpo (`maestroId`, `codigoInvitacion`, `activa`, `id`) llegue a la base.

---

# Verificación del resumen — CLASES-a — corrección ronda 1
Veredicto de la verificación: **RESUMEN DEVUELTO AL PROGRAMADOR.**
- **Cerrados:** las cifras coinciden, y T-01, T-03, T-04, T-05, T-06, T-07, T-10 y T-11 están bien en el código.
- **Siguen abiertos tres:**
  - **T-02:** la guarda nueva sigue dejando pasar cuatro formas de ruta que entregan `claseId`; lo comprobé con el `find-my-way` del repositorio.
  - **T-09:** el `?? []` se reescribió como un ternario que devuelve `[]`, el mismo valor por defecto silencioso con otra sintaxis.
  - **T-08, en el `h1`:** `break-words` no evita el desborde dentro de la rejilla de `CardHeader`, y el resumen afirma algo falso sobre ese `h1`.
- **Intermitencia:** no la causa la corrección. Es una espera en cadena entre dos `*.ataque` de AUTH (detalle abajo), y su destino es CHORE-02.

Fecha: 2026-09-29. PA-01 comprobada antes del backend (regla habilitada, Inbound, Block, Public). Equipo en reposo (CPU al 11 %, sin aplicaciones pesadas).

## Cifras: resumen contra mi corrida
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | `> tsc -b`, código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | frontend `✓ built in 620ms`; backend `tsc`, código 0 | `✓ built in 586ms`, código 0 | Sí |
| Backend, suite completa | 1.ª y 2.ª corridas: 11 y 12 archivos con `Test timed out`. 3.ª: `Tests 1019 passed (1019)` | Corrida 1 (raíz): `Test Files 10 failed \| 82 passed (92)` · `Tests 11 failed \| 1006 passed \| 2 skipped (1019)`, 72.10 s. Corrida 2 (`cd backend; npx vitest run`): `Test Files 92 passed (92)` · `Tests 1019 passed (1019)`, 37.31 s. Corrida 3: `10 failed \| 82 passed (92)` · `10 failed \| 971 passed \| 38 skipped`, 71.30 s | Sí en la corrida 2. Las fallas de las corridas 1 y 3 son solo por tiempo límite (ver "Intermitencia") |
| Frontend | `Tests 1059 passed (1059)` | `Test Files 74 passed (74)` · `Tests 1059 passed (1059)` | Sí |
| `vitest list` | backend 1019, frontend 1059 | backend 1019, frontend 1059 | Sí |
| V-01 | 70/70 iguales a la tabla de la ronda 1 | SHA-256 de las 70 `*.ataque` contra la tabla de "CLASES-a — Ronda 1": **70/70 iguales** | Sí |
| V-04 | `enEspera=` 25; `codigo-de-clase.tsx` 2 | 25 y 2. Ningún `disabled` en JSX de `features/clases` (solo aparece en un comentario). Ningún `?? []` literal | Sí |
| V-05 | Sin archivos fuera de lista | Frente a la corrección 2, `git status` solo agrega las 6 `*.ataque` nuevas del tester. Sin cambios contra `<R>`: `errores.ts`, `rutas-publicas.ts`, `package.json`, `backend/package.json`, `package-lock.json`, `tsconfig.base.json`, `infra`, `.claude`, los documentos protegidos y `components/ui`. `tokens.css` sigue solo con `--text-display-compacto` (6 líneas). `eslint.config.mjs`: solo el bloque de §D-0.4, ahora con 4 selectores | Sí |
| V-06 | Cubierta por `sesiones-y-cadena` | `sesiones-y-cadena.ataque` en verde en mi corrida 2 (lista exacta de rutas). `rutas-publicas.ts` sin cambios. En las corridas 1 y 3, sus dos casos fallidos (HS512 y `alg none`) cayeron por tiempo límite, no por la lista | Sí |
| PA-07 | `P2028` 2 (los aceptados) en la corrida limpia | Corrida 2: `P2028` 2, los aceptados; los demás términos en 0. Corridas 1 y 3: `P2028` 5 y 4. Además de los aceptados, `tx.sesion.create()` en `sesiones.ts:39` tardó **39.9 s** (no los ~6.5 s de siempre) y aparece uno **nuevo**, en `adapters/db/usuarios.ts:85` (`crearUsuarioConSesion`, registro: 25.9 s). Los dos son consecuencia de la espera en cadena de abajo | Sí en la corrida limpia; los `P2028` extra se explican abajo |
| PA-11 | solo `infra/` | Más de 120 s después: solo los 4 contenedores de `infra/` | Sí |

## Intermitencia del backend: qué es y qué no es
**No es la corrección ni el costo de la guarda nueva.**
- La guarda de T-02 solo evalúa tres expresiones regulares por ruta al registrarla.
- Con la suite sana, la corrida dura **37 s** (mi corrida 2), menos que los 53-58 s de las verificaciones anteriores.
- `clases-autorizacion.integracion` tarda 10.7 s en la corrida sana.

**Es una espera en cadena entre dos `*.ataque` de AUTH que ya existían**, y depende de cómo coincidan en el tiempo:
- **`cuentas-r1.ataque.test.ts:130`** ("con la tabla usuarios bloqueada…") ejecuta `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE`. Ese bloqueo tiene que esperar a que se suelte cualquier otro bloqueo sobre `usuarios`, y mientras espera, **toda petición nueva sobre `usuarios`, de cualquier archivo, se forma detrás de él**.
- **`cuentas-r3.ataque.test.ts`** ("login formado detrás de una fila retenida más de 5 s") y `bloqueo-usuario` (con `conFilaRetenida`) retienen a propósito una fila de `usuarios` durante segundos.
- **El ciclo:**
  1. La retención de `cuentas-r3` no suelta la fila hasta que su login se "forma".
  2. El `ACCESS EXCLUSIVE` espera a esa retención.
  3. Todo lo demás, incluido el propio login, espera al `ACCESS EXCLUSIVE`.
  4. PostgreSQL no lo detecta como interbloqueo, porque una parte de la espera está en la aplicación. Solo lo deshacen los tiempos límite (10, 15, 30 y 40 s).
- **Evidencia (JSON de Vitest, en el scratchpad):**
  - **Corrida con fallas:** el caso del `LOCK TABLE` de `cuentas-r1` coincide en el tiempo con el de la fila retenida de `cuentas-r3`. Los dos fallan por tiempo límite (15 y 40 s), el login de `cuentas-r3` tarda 39.9 s, y de los segundos 17 a 58 caen por tiempo límite casos de 10 archivos, la mayoría de AUTH. En `clases-autorizacion`, PR-A15h y su `afterAll` (que borra usuarios) caen por lo mismo.
  - **Corrida sana:** el `LOCK TABLE` corre en 191 ms, antes de la retención, y todo pasa.
- **Por qué aparece ahora:** con las 3 `*.ataque` nuevas del backend (92 archivos), el orden en que arrancan los archivos cambió y la coincidencia se volvió frecuente: 2 de mis 3 corridas y 2 de las 3 del programador. CLASES-a solo aumenta el tráfico sobre `usuarios`, por las llaves foráneas de `clases` e `inscripciones`.

**Destino:** CHORE-02, en la misma fila de `docs/ESTADO.md` §3 que A3 de `bloqueo-usuario` y las dos pruebas frágiles bajo carga. Propongo este texto para esa fila: "`cuentas-r1.ataque` toma `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE` en paralelo con las retenciones de fila de `cuentas-r3.ataque` y `bloqueo-usuario`: se forma una cola de bloqueos que tira por tiempo límite casos de varios archivos (`P2028` de hasta 40 s). Mitigación posible: `lock_timeout`/`NOWAIT` en ese caso, o correr en un grupo secuencial los archivos que retienen bloqueos". **No es un hallazgo de CLASES-a y no bloquea**, pero hoy la suite del backend falla por ese motivo en 1 de cada 2 o 3 corridas. **Para el humano:** valdría la pena adelantar esa parte de CHORE-02, antes de CLASES-b, que agrega más transacciones sobre `usuarios`.

## T-02: arbitraje de la desviación de §D-0.3
**Acepto el cambio de la regla**: la expresión literal del plan era incompleta, y el propio plan pedía cubrir el comodín (punto de ataque 2). **La implementación sigue abierta, porque no cubre todas las formas.**

Con el `find-my-way` instalado en el repositorio (script en el scratchpad, `fmw-prueba.cjs`), estas rutas entregan `request.params.claseId` y `TIENE_CLASE_ID` no las reconoce:

| Ruta | Parámetros que entrega `find-my-way` |
|---|---|
| `/api/x/:parte-:claseId` | `{ parte, claseId }` |
| `/api/x/pre-:claseId` | `{ claseId }` |
| `/api/x/:parte.:claseId` | `{ parte, claseId }` |
| `/api/x/:claseId.:ext` | `{ claseId, ext }` |

La causa: la expresión exige `/` o el inicio **antes** de `:claseId`, y su terminador no incluye `.`. Bajo `/clases/`, esas formas ya se rechazan por "nombra el parámetro de clase distinto de :claseId", así que el hueco está en las rutas fuera de `/clases`, que es justo lo que §D-0.3 quería cubrir.

**Regla que debe quedar en el plan (enmienda de §D-0.3):** "Toda ruta bajo `/api` que declare un parámetro llamado `claseId` en cualquier posición de su URL (`:claseId` seguido de un carácter que no pueda formar parte del nombre, o del fin), y todo comodín bajo `/clases/`, lleva el sexto paso marcado en la posición 5. Bajo `/clases/`, el único parámetro permitido en el segmento siguiente es `:claseId`." En la práctica, basta con reconocer `:claseId(?![A-Za-z0-9_])` en cualquier lugar de la URL: un falso positivo, como un `::claseId` escapado, solo rechaza una ruta, que es el lado seguro.

## Estado de T-01 a T-11 (comprobado en el código)
| # | Estado | Qué vi |
|---|---|---|
| T-01 | **Cerrado** | `conDescripcionNormalizada` aplica `normalizarTextoLargo` (CRLF y CR → LF y recorte) **antes** de `validarCuerpo`, en `POST /clases` y en `PUT /clases/:claseId`. Si `descripcion` no es cadena, el cuerpo queda intacto y el esquema lo rechaza igual. Los demás caracteres de control siguen prohibidos por `textoLargoSchema`. El handler sigue delgado: solo llama a la función de `core/` |
| T-02 | **Abierto** (desviación aceptada, cobertura incompleta) | Ver arriba. Las cuatro formas del tester y el comodín `/clases/*` sí se rechazan, y ninguna ruta existente dejó de arrancar (PA-13: la suite y la app arrancan en mi corrida 2) |
| T-03 | **Cerrado** | El bloque de §D-0.4 ahora trae `callee.property.name` y `callee.property.value` para `addHook`, igual que para `executeSql`. Formas como `const { addHook } = app` o `app.addHook.call(…)` siguen fuera del alcance de un selector; es una ayuda de lint, y la regla de fondo la sostiene la guarda (queda para el tester) |
| T-04 | **Cerrado** | El cambio está en `shared/src/clases.ts`, donde §D-A3 ubica `normalizarCodigoDeClase` (el plan no la pone en `core/clases/codigo.ts`), así que respeta el plan. Los separadores son solo espacio, tabulador y guion ASCII, y solo `a`-`z` pasan a mayúscula. Así `ß`, `ſ`, `ﬀ` y U+FEFF llegan intactos a la expresión final y se rechazan; espacios y guiones ASCII se siguen aceptando. PR-A02d se extendió con esos casos. Un espacio no separable (U+00A0), si alguien pega el código así, ahora se rechaza: queda como observación |
| T-05 | **Cerrado** | `EncabezadoClase` pasa `isError` y el mensaje de §9 a `CodigoDeClase`, que muestra `MensajeError`. "Copiar código" sin código da `toast.error`. Nada de `disabled` |
| T-06 | **Cerrado** | `onError` de regenerar lanza `toast.error(TEXTOS_CODIGO.avisoErrorRegenerar)` y cierra la confirmación |
| T-07 | **Cerrado** | `CLASES_POR_VARIANTE` en `data.ts`: verde con `bg-brand text-brand-foreground` y metadatos `text-brand-soft`, azul con `bg-accent text-accent-foreground` y metadatos `text-accent-soft`, y en las dos, foco `focus-visible:-outline-offset-4` más `outline-{brand,accent}-foreground`. Comprobado en el CSS compilado: `.bg-brand{background-color:var(--brand)}`, `outline-brand-foreground:focus-visible{outline-color:var(--brand-foreground)}`, `.text-brand-soft` y `.text-accent-soft`. Ningún token nuevo; `tokens.css` sin cambios fuera de lo autorizado. `DESIGN.md` §7.6 (la tabla verde → `--brand` y `--brand-soft`, azul → `--accent` y `--accent-soft`) y el párrafo de implementación y la nota de foco de §6 quedan coherentes con lo implementado |
| T-08 | **Abierto en el `h1`** (la tarjeta, cerrada) | **Tarjeta:** `line-clamp-2 wrap-anywhere` genera CSS con las escalas anuladas (`.line-clamp-2{…-webkit-line-clamp:2…}` y `.wrap-anywhere{overflow-wrap:anywhere}`). Es correcto. **`h1`:** lleva `break-words` (`overflow-wrap: break-word`) y está dentro de `CardHeader`, que es `grid` (`components/ui/card.tsx:20`). Un elemento de rejilla toma como ancho mínimo su contenido mínimo, y `break-word`, a diferencia de `anywhere`, no reduce ese mínimo: la palabra de 120 caracteres fija el ancho de la pista y sigue desbordando a 360 px. La prueba del tester solo mira la clase, así que pasa. **El resumen, además, no es exacto:** dice que el `h1` "ya llevaba `break-words` desde la implementación original", pero en la ronda 1 el caso falló con `Received: "text-h1"` (`fe-test.txt` del tester), así que se agregó en esta corrección |
| T-09 | **Abierto** | `clases.data ? clases.data.pages.flatMap(…) : []` en los dos inicios es el mismo valor por defecto silencioso que prohíbe CLAUDE.md ("MAL: `data ?? []` y luego iterar"), escrito de otra forma para que no lo detecte la expresión de la prueba. El comentario que lo acompaña describe el problema y después lo repite. Hoy la consulta nunca está desactivada, así que en pantalla no se nota; pero si alguna vez no está cargando ni en error y aún no trae datos (por ejemplo, con `enabled` o `placeholderData`), el panel mostraría "Aún no tienes clases" en lugar de reconocer que faltan datos |
| T-10 | **Cerrado** | `tituloDelBloque` y `contenidoPanel` con retornos tempranos (error → cargando → vacío → datos). Solo queda un ternario de un nivel en el JSX |
| T-11 | **Cerrado** | Un `VALIDACION` cuyo mensaje empieza con `"claseId:"` muestra el mensaje de `SIN_ACCESO_A_LA_CLASE`, y los demás `VALIDACION` siguen igual. Depende del texto fijo del servidor (§D-0.1 lo define), así que lo acepto. Más robusto sería validar el `claseId` con `claseIdParamSchema` antes de pedirlo (observación) |

## Lo que vuelve al programador
- **T-02:** la guarda debe rechazar también `/api/x/:parte-:claseId`, `/api/x/pre-:claseId`, `/api/x/:parte.:claseId` y `/api/x/:claseId.:ext` sin el sexto paso, y aceptarlas con él. La regla es la de la enmienda propuesta arriba. Sus pruebas normales van en `guarda-clase.integracion.test.ts`, el archivo de PR-A06 que la lista cerrada de a permite extender.
- **T-08, `h1`:** el nombre largo sin espacios no debe fijar el ancho de la rejilla. Por ejemplo, `wrap-anywhere` como en la tarjeta, o un ancho mínimo 0 en el elemento. Además, corregir en el resumen la frase "ya llevaba `break-words` desde la implementación original".
- **T-09:** ningún arreglo vacío de respaldo para datos que faltan, con ninguna sintaxis. El panel resuelve de forma explícita el caso "sin datos todavía" (error → cargando → sin datos → vacío → datos), o las filas se calculan solo después de las guardas.
- **Resumen:** las cifras de la corrida final deben venir con su comando exacto (lo pide AGENTS.md), y la tabla de T-xx debe decir el estado real de T-02, T-08 y T-09 después de esta vuelta.

## Observaciones que no bloquean (revisión final o CHORE-02)
- **CHORE-02:** la espera en cadena de `cuentas-r1`, `cuentas-r3` y `bloqueo-usuario` (texto propuesto arriba).
- **Textos en `codigo-de-clase.tsx`:** el aviso "No pudimos copiar el código. Cópialo a mano." está escrito en el componente y no en `data.ts` (regla 2 de CLAUDE.md). Mientras carga, el código se muestra como "…" en lugar de `Cargando`.
- **Observaciones del tester que no son hallazgos** (nombres con caracteres `Cf` invisibles y longitud en unidades UTF-16): quedan para la revisión final, sin cambio pedido.

## Para la ronda 2 del tester (cuando vuelva el resumen corregido)
1. **Intermitencia conocida.** Si caen por tiempo límite casos de AUTH (`cuentas-r1`, `cuentas-r3`, `bloqueo-usuario`, `restablecer`, `sesiones-y-cadena`, `worker-*`) y, de rebote, PR-A15h o un `afterAll` de CLASES, es la espera en cadena de `LOCK TABLE usuarios` que ya está documentada. Repite la corrida y compara con la ventana del caso del `LOCK TABLE`. Un rojo por aserción, o un tiempo límite que se repite en el mismo caso de CLASES-a, sí es hallazgo.
2. **Guarda (T-02):** todas las formas de declarar `claseId` que admite `find-my-way`:
   - un parámetro precedido de `-` o `.`, o de texto fijo en el mismo segmento;
   - un parámetro seguido de `.`, `-`, `?` o `(`;
   - `:claseId` varias veces;
   - comodines bajo `/clases` en cualquier profundidad;
   - que ninguna ruta pública ni existente deje de arrancar.
3. **T-08:** el `h1` y la tarjeta con palabras de 120 caracteres y con emojis, si se puede sin navegador (análisis del CSS). Si no, queda para la comprobación humana H-6.
4. **T-09 y T-10:** los inicios con la consulta desactivada o sin datos todavía: nunca "Aún no tienes clases" sin que la API lo haya dicho.
5. **T-04:** el código con U+00A0, U+3000, tabulador y guiones Unicode (U+2010 a U+2015); qué se acepta y qué se rechaza, frente a S-03.
6. **T-01:** CRLF en `nombre` (debe rechazarse) y en `descripcion` junto con otros caracteres de control (deben seguir rechazados).
7. **T-11:** otros `VALIDACION` de la página de la clase (por ejemplo, en editar) siguen mostrando su mensaje de campo, y ningún mensaje técnico llega a la interfaz.
8. **Lo que sigue vigente de la lista anterior:** reintento del código (P2003 y `22021`), `HEAD`, paginación y campos extra. El tester ya lo atacó sin hallazgos en la ronda 1; basta una regresión rápida.

---

# Verificación del resumen — CLASES-a — corrección ronda 1 (segunda pasada)
Veredicto de la verificación: **RESUMEN ACEPTADO: EL TESTER PUEDE ATACAR (RONDA 2).**
- **Cifras:** coinciden con mi corrida.
- **Hallazgos:** T-02, T-08 y T-09 quedaron cerrados en el código, así que los 11 hallazgos de la ronda 1 están cerrados.
- **Queda un detalle de redacción que no bloquea** (D-6, abajo). Lo registro aquí para que el historial quede exacto.

Fecha: 2026-09-29. PA-01 comprobada antes del backend (regla habilitada, Inbound, Block, Public). Equipo en reposo (CPU al 15 %).

## Cifras: resumen contra mi corrida
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | `✓ built in 588ms`, código 0 | `✓ built in 589ms`, código 0 | Sí |
| Backend | `Tests 1021 passed (1021)`, limpia al primer intento | Corrida 1 (raíz): `Test Files 10 failed \| 82 passed (92)` · `Tests 10 failed \| 1006 passed \| 5 skipped (1021)`, 71.84 s, **solo por tiempo límite**. Corrida 2 (`cd backend; npx vitest run`, con JSON): `Test Files 92 passed (92)` · `Tests 1021 passed (1021)`, 38.39 s | Sí en la corrida 2 |
| Frontend | `Tests 1059 passed (1059)` | `Test Files 74 passed (74)` · `Tests 1059 passed (1059)` | Sí |
| `vitest list` | backend 1021, frontend 1059 | backend 1021 (con PR-A06f y PR-A06g), frontend 1059 | Sí |
| V-01 | 70 sin cambios | SHA-256 de las 70 `*.ataque` contra la tabla de la ronda 1: **70/70 iguales** | Sí |
| V-04 | `enEspera=` 25; `codigo-de-clase.tsx` 2 | 25 | Sí |
| V-05 | Solo archivos autorizados | `git status` ordenado, **idéntico** al de la verificación anterior (90 entradas: los 6 archivos de esta pasada ya estaban). Sin cambios contra `<R>`: `errores.ts`, `rutas-publicas.ts`, los dos `package.json`, `package-lock.json`, `tsconfig.base.json`, `infra`, `.claude`, los documentos protegidos y `components/ui`. `tokens.css` sigue solo con el token autorizado. `eslint.config.mjs`, solo con el bloque de §D-0.4 | Sí |
| PA-07 | `P2028` 2 (los aceptados) | Corrida 2: `P2028` 2 (los aceptados); los demás términos en 0. Corrida 1: `P2028` 4, los mismos dos sitios, con `sesiones.ts:39` a 39.9 s: la firma de la espera en cadena | Sí en la corrida limpia |
| PA-11 | solo `infra/` | Solo los 4 contenedores de `infra/` después de las corridas | Sí |

**Intermitencia (corrida 1): es la espera en cadena ya documentada, no esta pasada.** Tiene la misma firma que en la verificación anterior:
- Fallan por tiempo límite el caso del `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE` de `cuentas-r1` y el de la fila retenida de `cuentas-r3` (40 s).
- Detrás caen casos de AUTH, además de PR-A15h y el `afterAll` de `clases-autorizacion`, que se forman en la cola de `usuarios`.
- No hay ningún rojo por aserción.
- En la corrida 2, el caso de `cuentas-r1` tardó 230 ms y el de `cuentas-r3`, 7 s, y todo pasó en 38 s.

El destino sigue siendo CHORE-02 (texto propuesto en la verificación anterior). La recomendación para el humano no cambia: resolverlo antes de CLASES-b.

## Estado de T-02, T-08 y T-09 (comprobado en el código)
| # | Estado | Qué vi |
|---|---|---|
| T-02 | **Cerrado** | `TIENE_CLASE_ID = /:claseId(?!\w)/` en cualquier posición; `CLASES_COMODIN = /\/clases\/.*\*/`; bajo `/clases/`, el segmento siguiente debe ser exactamente `:claseId`, y esa regla se evalúa antes que la del sexto paso. Probé las mismas expresiones (script `guarda-p2.cjs` en el scratchpad) con 24 rutas. **Sin el sexto paso se rechazan:** `:claseId`, `:claseId?`, `:claseId(regex)`, `:claseId-:parte`, `:parte-:claseId`, `pre-:claseId`, `:parte.:claseId`, `:claseId.:ext`, `:claseId` repetido, `/clases/*`, `/clases/:claseId/a/b/*` y `/clases/x/y/*`. **Con el sexto paso arrancan**, fuera de `/clases`. Bajo `/clases/`, `:id`, `:claseId-:parte` y `:claseId?` se rechazan siempre. No se tocan `:claseIdX`, `:claseid` (otro nombre, fuera de `/clases`), `/api/x/*` ni las rutas estáticas `/clases`, `/inscritas`, `/impartidas` y `/unirse`. **PA-13:** la app real arranca en todos los `beforeAll` de mi corrida 2 (92 archivos en verde), incluida la lista exacta de rutas de `sesiones-y-cadena`. PR-A06f y PR-A06g existen con esos títulos. Detalle: PR-A06f comprueba el rechazo sin el sexto paso, pero no que esas formas arranquen con él; no lo pido (queda para el tester) |
| T-08 | **Cerrado** | `<h1 className="min-w-0 text-h1 wrap-anywhere">`: el `h1` es hijo directo de `CardHeader`, que es la rejilla, así que `min-w-0` va en el elemento correcto. Las dos utilidades generan CSS en el build (`.min-w-0{min-width:0}` y `.wrap-anywhere{overflow-wrap:anywhere}`). No se vio en un navegador; queda para H-6 |
| T-09 | **Cerrado, y es una solución de fondo** | `filas` es `clases.data?.pages.flatMap(…)`, de tipo `ClaseDelPanel[] \| undefined`, sin ningún arreglo fabricado. `contenidoPanel` resuelve error → cargando → **sin datos** (`if (!props.clases) return <Cargando />`) → vacío → datos. Es lo que CLAUDE.md llama "MEJOR": un retorno temprano cuando faltan datos, y después se usan los datos directamente. **La diferencia con la pasada anterior no es de sintaxis, es de comportamiento:** antes, la falta de datos se convertía en `[]` y llegaba al vacío ("Aún no tienes clases", una afirmación que la API no hizo); ahora se reconoce como tal y se muestra un estado que no afirma nada. El comentario del código ("este `if` solo completa el tipo") subestima lo que hace, pero no cambia el juicio |

## D-6 — Detalle de redacción del resumen (no bloquea)
El resumen sigue sin ser exacto sobre el origen del `break-words` del `h1`:
- Las líneas 365 y 384 de `resumen-programador.md` ("corrección ronda 1") siguen diciendo que el `h1` "ya llevaba `break-words` desde la implementación original".
- La segunda pasada solo dice que "llevaba `break-words` pero esa clase sola no bastaba".

**Lo que pasó:** en la ronda 1 el `h1` solo tenía `text-h1` (`Received: "text-h1"` en la salida del tester). `break-words` se agregó en la primera pasada de la corrección, y `min-w-0 wrap-anywhere` en la segunda.

Este registro deja el historial correcto. Pido al programador que corrija esas dos líneas en su próxima entrega; no justifica otra vuelta antes de la ronda 2. Es la segunda vez que una corrección declarada del resumen queda a medias (antes, D-5), y lo anoto para la revisión del modelo del programador.

## Lista para la ronda 2 del tester (confirmada y ajustada)
1. **Intermitencia conocida.** Si caen por tiempo límite casos de AUTH (`cuentas-r1`, `cuentas-r3`, `bloqueo-usuario`, `restablecer`, `sesiones-y-cadena`, `worker-*`, `enlaces-03b-r2`, `invitacion-masiva-03c-r2`) y, de rebote, PR-A15h o un `afterAll` de CLASES, es la espera en cadena de `LOCK TABLE usuarios` documentada para CHORE-02. Repite la corrida. Un rojo por aserción, o un tiempo límite que se repite en el mismo caso de CLASES-a con el caso del `LOCK TABLE` en verde, sí es hallazgo.
2. **Guarda (T-02).** Además de las formas de arriba:
   - que las formas rechazadas sin el sexto paso **arranquen con él** fuera de `/clases` (PR-A06f no lo cubre);
   - parámetros con expresión y separadores combinados (`:claseId(^x)-:y`, `:a.:claseId(^x)`);
   - mayúsculas en el segmento estático (`/Clases/:id`, si `find-my-way` distingue mayúsculas);
   - rutas registradas por `app.route({ url })` o con `prefix` anidado;
   - que ninguna ruta existente deje de arrancar.
3. **T-08:** el `h1` y la tarjeta con palabras de 120 caracteres y con emojis, por análisis del CSS compilado (`min-w-0`, `wrap-anywhere`, `line-clamp-2`). Lo visual queda para H-6.
4. **T-09 y T-10:** los inicios nunca dicen "Aún no tienes clases" si la API no lo dijo, tampoco con la consulta sin datos; y ningún arreglo de respaldo en `features/clases`, con ninguna sintaxis.
5. **T-04:** el código con U+00A0, U+3000, tabulador y guiones Unicode (U+2010 a U+2015), contrastado con S-03 ("minúsculas, espacios y guiones").
6. **T-01:** CRLF en `nombre` (debe rechazarse) y otros caracteres de control junto con CRLF en `descripcion` (deben seguir rechazados).
7. **T-05, T-06 y T-11:** los avisos de error del código (carga, copia y regeneración); los demás `VALIDACION` conservan su mensaje de campo y ningún texto técnico llega a la interfaz.
8. **Regresión rápida** de lo que la ronda 1 atacó sin hallazgos: reintento del código (P2003 y `22021`), `HEAD`, paginación, campos extra y fugas de `codigoInvitacion`, `estadoPago`, `accesoRestringido` y `email`.

---

# Verificación del resumen — CLASES-a — corrección ronda 2
Veredicto de la verificación: **RESUMEN ACEPTADO: EL TESTER PUEDE ATACAR (RONDA 3, LA ÚLTIMA).** Las cifras coinciden con mi corrida. T-12 a T-17 y D-6 quedaron cerrados en el código y en el resumen.

Fecha: 2026-09-29. PA-01 comprobada antes del backend (regla habilitada, Inbound, Block, Public). Equipo en reposo (CPU al 9 %).

## Registro del arbitraje de T-15 (lo pidió el orquestador antes de esta corrección)
**Decisión: opción A.** Los separadores del código son una lista cerrada, sin `\s`:
- **Espacios:** el ASCII, el tabulador, U+00A0, U+2007, U+202F y U+3000.
- **Guiones:** el ASCII, U+2010 y U+2011.
- **Siguen rechazados:** las rayas U+2012 a U+2015, U+FEFF, U+200B y cualquier otro separador o carácter de formato.

**Motivo:**
- S-03 promete "espacios y guiones", sin limitarlos a ASCII.
- Esos son los que insertan un correo o un teclado móvil, y el alumno no los distingue.
- La seguridad no cambia: el resultado se sigue validando contra `^[A-HJ-NP-Z2-9]{7}$`, y lo que cerró T-04 sigue cerrado.
- S-03 no necesita enmienda.

## Cifras: resumen contra mi corrida
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | `✓ built in 612ms`, código 0 | `✓ built in 659ms`, código 0 | Sí |
| Backend | `Tests 1045 passed (1045)`, limpia al primer intento | Corrida 1 (raíz): `Test Files 9 failed \| 86 passed (95)` · `Tests 10 failed \| 1035 passed (1045)`, 73.49 s, por la espera en cadena conocida (abajo). Corrida 2 (`cd backend; npx vitest run`, con JSON): `Test Files 95 passed (95)` · `Tests 1045 passed (1045)`, 56.79 s | Sí en la corrida 2 |
| Frontend | `Tests 1070 passed (1070)` | `Test Files 76 passed (76)` · `Tests 1070 passed (1070)` | Sí |
| `vitest list` | backend 1045, frontend 1070 | backend 1045 (1021 + 21 de las `-r2` + PR-A02a2, PR-A02d2 y PR-A08e), frontend 1070 | Sí |
| V-01 | 75/75 contra la tabla de la ronda 2 | SHA-256 de las 75 `*.ataque` contra la tabla de "CLASES-a — Ronda 2": **75/75 iguales** | Sí |
| V-04 | `enEspera=` 25 | 25 | Sí |
| V-05 | Solo archivos autorizados | Frente a la verificación anterior, `git status` solo agrega las 5 `*.ataque` nuevas del tester. Sin cambios contra `<R>`: `errores.ts`, `rutas-publicas.ts`, los dos `package.json`, `package-lock.json`, `tsconfig.base.json`, `infra`, `.claude`, los documentos protegidos y `components/ui`. `tokens.css`, solo con el token autorizado (6 líneas). `eslint.config.mjs`, solo con el bloque de §D-0.4 | Sí |
| V-06 | — | `sesiones-y-cadena.ataque` (lista exacta de rutas) en verde en la corrida 2. `rutas-publicas.ts` sin cambios | Sí |
| PA-07 | `P2028` 2 | Corrida 2: `P2028` 2 (los aceptados); los demás términos en 0. Corrida 1: 4, en los mismos dos sitios, con `sesiones.ts:39` a 39.9 s: la firma de la espera en cadena | Sí en la corrida limpia |
| PA-11 | solo `infra/` | Solo los 4 contenedores de `infra/` | Sí |

**Intermitencia (corrida 1).** Tiene la misma firma que antes: caen por tiempo límite el caso del `LOCK TABLE` de `cuentas-r1` y el de la fila retenida de `cuentas-r3`, y detrás casos de AUTH, además de PR-A08a, PR-A15h y el `afterAll` de `clases-autorizacion`.
- **La única aserción fallida** es la de `worker-r1` ("el log correo_de_cuenta_fallido…"). No es una aserción de lógica: espera con `esperarHasta` hasta un plazo y después afirma, así que es otro tiempo límite.
- **En la corrida 2** el `LOCK TABLE` tardó 209 ms y todo pasó.
- **Destino:** CHORE-02, sin cambio.

## Estado de T-12 a T-17 y D-6 (comprobado en el código)
| # | Estado | Qué vi |
|---|---|---|
| T-12 | **Cerrado** | **Tarjeta:** metadatos con `wrap-anywhere` (la tarjeta es el elemento de la rejilla y el `span` es un elemento flex, así que no necesita `min-w-0`). **Encabezado:** "Maestro: …" es hija directa de la rejilla de `CardHeader` y lleva `min-w-0 wrap-anywhere`. **Saludo** "Hola, …": `wrap-anywhere` en su `span`, dentro de columnas flex. Las utilidades generan CSS (comprobado antes). Lo visual queda para H-6 |
| T-13 | **Cerrado** | `CLASES_COMODIN = /\/clases(?![A-Za-z0-9_]).*\*/` cubre `/api/clases*` y `/api/clases/*` a cualquier profundidad. Un falso positivo posible (`/clases-archivadas/*`) solo exigiría el sexto paso, que es el lado seguro. **PA-13:** las 95 pruebas arrancan la app y `sesiones-y-cadena` pasa con la lista exacta. Los comodines generales `/api/*` quedan fuera de la regla (observación del tester para CHORE-02, M-15) |
| T-14 | **Cerrado** | Tercer selector `CallExpression[callee.property.quasis.0.value.raw='addHook']`: solo coincide con una plantilla cuyo primer fragmento es exactamente `addHook`. Con una expresión (`` `add${x}` ``) el primer fragmento es otro y no coincide, así que no hay falsos positivos; `lint` pasa sobre todo `handlers/`. `.call` y la desestructuración siguen fuera de alcance, como ya se había decidido |
| T-15 | **Cerrado** | `SEPARADORES_CODIGO_CLASE = /[ \t\-   　‐‑]/g`: **exactamente** la lista de mi decisión, en `shared/src/clases.ts`. `toUpperCase` sigue solo sobre `a`-`z`. Las pruebas son dos **casos nuevos** (no casos existentes extendidos): `PR-A02a2: acepta los espacios y guiones de Unicode del arbitraje de S-03 (ronda 2 del tester, T-15)` y `PR-A02d2: rechaza las rayas de Unicode U+2012 a U+2015 (arbitraje de T-15: 'guion' y 'raya' son cosas distintas)`. Los acepto: un ID con sufijo por comportamiento, sin reescribir casos existentes. Revisé por programa los puntos de código literales de las dos listas: U+00A0 U+2007 U+202F U+3000 U+2010 U+2011 y U+2012 U+2013 U+2014 U+2015. U+FEFF sigue rechazado en PR-A02d |
| T-16 | **Cerrado** | `SEPARADORES_DE_LINEA_UNICODE = /[\r\n  ]/` en el `refine` de "una sola línea" de `nombreClaseSchema`. En los extremos, el `trim` de zod los quita, igual que un CRLF, que ya era un comportamiento aceptado; en el interior dan 400. No toca acentos ni emojis, porque U+200D no es separador de línea. PR-A08e existe con ese título |
| T-17 | **Cerrado** (con una observación) | `mensajeDeErrorClases` quita el prefijo `campo:` de todo `VALIDACION` (y `claseId:` sigue yendo al mensaje de `SIN_ACCESO_A_LA_CLASE`). `erroresDeFormularioClases` pone el mensaje bajo el campo que nombra el servidor, con `ErrorDeCampo`, `aria-invalid` y `aria-describedby`; si el campo no es del formulario, pone el genérico bajo el primero. La forma del error del backend (`{ codigo, mensaje }`) no cambió. **Observación:** en `FormularioClase`, un error que no es `VALIDACION` (500, sin conexión, `SIN_ACCESO_A_LA_CLASE` al editar) se sigue mostrando como error del campo "Nombre de la clase". Ya pasaba antes, no forma parte de T-17 y no bloquea, pero es un error del formulario, no del campo |
| D-6 | **Cerrado** | Las líneas 365 y 384 de `resumen-programador.md` ahora dicen que el `h1` original solo tenía `text-h1` y que `break-words` se agregó en la corrección de la ronda 1 |

## Lista para la ronda 3 del tester (la última: regresión completa más lo que falta de los 5 puntos)
1. **Intermitencia conocida.** Si caen por tiempo límite casos de AUTH (`cuentas-r1`, `cuentas-r3`, `bloqueo-usuario`, `restablecer`, `sesiones-y-cadena`, `worker-*`, `enlaces-03b-r2`, `invitacion-masiva-03c-r2`, `cuentas-03a-r1`) y, de rebote, casos o `afterAll` de CLASES, es la espera en cadena de `LOCK TABLE usuarios` (CHORE-02). Repite la corrida. Es hallazgo un rojo por aserción de lógica, o un tiempo límite en el mismo caso de CLASES-a que se repite con el `LOCK TABLE` en verde.
2. **Regresión completa:** las 30 pruebas de las rondas 1 y 2 (19 y 10, más el caso de precondición de T-13) pasan por la razón correcta, leyendo cada corrección como en la ronda 2. En particular:
   - T-02/T-13: la guarda, con todas las formas ya probadas;
   - T-09: los inicios sin datos;
   - T-15: los separadores exactos de la decisión.
3. **Punto 1 del plan (pertenencia):** el mismo `claseId` en el sexto paso y en el handler (`claseDe`). Además, la condición de carrera en que un maestro edita o regenera mientras otro maestro pide la misma clase; con `updateMany` por `id` y `maestro_id`, un ajeno nunca debe escribir.
4. **Punto 2 del plan (guarda):** rutas registradas después de `ready()` (no deberían poder registrarse) y un plugin con `prefix` que contenga `:claseId`. Los comodines generales `/api/*` quedan para CHORE-02 (M-15); no los reportes como hallazgo.
5. **Punto 3 del plan (código):** unirse con un código de otra clase justo después de regenerar la propia; el código viejo nunca inscribe en la clase nueva. Además, un código de 40 caracteres con separadores que, tras normalizarlo, da exactamente 7.
6. **Punto 4 del plan (fugas):**
   - un último recorrido de todas las respuestas de a, para dueño, estudiante, restringido y admin;
   - las cabeceras (`Cache-Control: no-store` en `/codigo`);
   - que ningún log de las corridas contenga el código de invitación (PA-10).
7. **Punto 5 del plan (interfaz):**
   - errores del formulario de clase que no son `VALIDACION` (500, sin conexión, `SIN_ACCESO_A_LA_CLASE` al editar): hoy aparecen bajo "Nombre de la clase" (observación de T-17);
   - foco al primer campo con error;
   - una sola acción principal por vista;
   - "Ver más clases" con un cursor de una clase de la que el alumno ya no forma parte: la página siguiente no debe quedar vacía en silencio ni ocultar las clases restantes.
8. **Observaciones que no son hallazgos** (se anotan, no se atacan): nombres con caracteres `Cf` invisibles, longitud en unidades UTF-16 y `descripcion: null` en `PUT`. Quedan para la revisión final.

---

# Revisión final — CLASES-a
Veredicto: **ESCALAR AL HUMANO**
- Se agotaron las tres rondas del tester, y la tercera terminó en ROTO.
- Además, encontré un problema de diseño que bloquea (M-06).

Verificación propia: lint código 0 (`> tsc -b`) · build código 0 (`✓ built in 604ms`) · test backend `1 failed | 1051 passed (1052)` (solo T-18) · test frontend `3 failed | 1078 passed (1081)` (solo T-19)

Fecha: 2026-09-29. Rama `feat/clases`, base `<R>` = `3399c79`. PA-01 comprobada antes del backend: la regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada, Inbound, Block, Public, y la red `IZZI-F281`, en perfil Público, está declarada de confianza.

**Recomendación:** autorizar **una cuarta ronda corta y cerrada**. Detalle en "Para el humano".
- **Qué corrige:** M-06, T-19 y T-18. El comportamiento de T-18 lo decides tú en la misma respuesta.
- **Además, en los mismos archivos:** los ajustes de texto y documentación de N-02 y N-03.
- **Después:** mi verificación, una regresión del tester y el cierre.
- **Si esa ronda no queda verde, no hay quinta:** vuelvo a escalar.

## Corridas
| Qué | Resultado |
|---|---|
| `npm run lint` (raíz) | código 0, última línea `> tsc -b` |
| `npm run build` (raíz) | código 0, última línea `✓ built in 604ms` |
| `npm run test` (raíz), corrida 1 | Backend: `Test Files 9 failed \| 87 passed (96)` · `Tests 10 failed \| 1042 passed (1052)`, 74.52 s. Es la espera en cadena de `LOCK TABLE usuarios` (CHORE-02), con su firma conocida. Caen por tiempo límite: `cuentas-r1` (el `LOCK TABLE` y el 429), `cuentas-r3` (la fila retenida), A1 de `bloqueo-usuario`, `restablecer`, `worker-r1`, `worker-correo-de-cuenta` y `worker-03c-r1`; detrás de ellos, PR-A15h de `clases-autorizacion`. `P2028`: 4, en los dos sitios aceptados. npm se detuvo en el backend, así que el frontend no corrió |
| `cd backend; npm run test`, corrida 2 | `Test Files 1 failed \| 95 passed (96)` · `Tests 1 failed \| 1051 passed (1052)`, 46.68 s. El único rojo es T-18 (`clases-r3.ataque`), por aserción |
| `cd frontend; npm run test` | `Test Files 1 failed \| 76 passed (77)` · `Tests 3 failed \| 1078 passed (1081)`, 38.79 s. Los tres rojos son T-19 (`clases-r3.ataque.test.tsx`) |
| PA-07 (corrida 2) | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2, los aceptados: `tx.sesion.create()` en `adapters/db/sesiones.ts:39` y `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116` |
| PA-11 | `docker ps -a` a las 22:04:49, más de 120 s después del backend: solo los 4 contenedores de `infra/` |
| V-03 (desde `backend/`) | `prisma validate`: válido · `format --check`: "All files are formatted correctly!" · `migrate status`: 6 migraciones, "Database schema is up to date!" · `migrate diff … --exit-code`: "No difference detected.", código 0 |
| Migración | `20260929232924_clases_e_inscripciones/migration.sql` es igual a §D-A1, sentencia por sentencia, sin `DROP` ni `ALTER` de columnas. Es la única carpeta nueva |

**Se alcanzó el estado esperado:** los rojos son exactamente los 4 de la ronda 3, y no hay ningún otro rojo por aserción.

## Problemas que bloquean

### M-06 — El bloque destacado pone texto oscuro sobre vidrio azul: el titular y la fecha no se leen
**Dónde:** `frontend/src/features/clases/components/bloque-destacado.tsx`. Ni la `section` ni sus textos llevan color propio, y la utilidad `vidrio-azul` (`tokens.css:229`) solo pone el fondo. Por eso:
- el saludo y el `h1` heredan `--foreground` (`#16202E`);
- la fecha va en `text-muted-foreground` (`#3D4654`);
- el siguiente paso va sobre un **fondo** `bg-accent-soft-glass`, y ese token es para el **texto**.

**Contraste medido** sobre `rgb(34 64 154 / 0.78)`, del mejor al peor caso según lo que quede detrás, con la misma fórmula que las pruebas de tokens:

| Texto | Contraste |
|---|---|
| Titular y saludo (`#16202E`) | de 3.2:1 a **1.8:1** |
| Fecha (`#3D4654`) | de 1.8:1 a **1.0:1** |
| En `#FFFFFF`, como pide §7.5 | de 5.2:1 a 9.3:1 |
| En `--accent-soft-glass`, como pide §7.5 | de 4.4:1 a 7.8:1 |

**Por qué importa:**
- `DESIGN.md` §6 fija un mínimo de 4.5:1 (3:1 en texto grande), medido contra el peor caso. §3 ("Contraste verificado") y §7.2 dicen además: "Sobre vidrio azul, solo `#FFFFFF` y `--accent-soft-glass`".
- §7.5 fija el color de cada parte: el titular en `#FFFFFF` (`--accent-foreground`); el saludo con la fecha y el siguiente paso en `--accent-soft-glass`, como color de texto.
- Es el elemento principal del inicio de los dos roles.
- Ninguna prueba lo cubre: las de tokens miden pares de tokens, no su uso. El tester no lo reportó, y H-2 y H-6 llegan hasta el final de CLASES-d.
- `Cargando`, que se muestra dentro del bloque mientras carga, sí se lee: es una pastilla de vidrio fuerte con su propio fondo.

**Qué se espera:**
- Cada texto que va directo sobre el vidrio azul (saludo, fecha, titular, su mensaje de error y siguiente paso) usa `#FFFFFF` o `--accent-soft-glass`, como dice §7.5.
- El siguiente paso, sin fondo claro.
- La tarjeta interna, de vidrio fuerte, conserva sus colores.
- Ningún token nuevo.

### T-18 — Con un cursor que ya no existe, "Ver más clases" devuelve una página vacía y oculta las clases restantes (del tester, abierto)
**Dónde:** `backend/src/adapters/db/clases.ts`, `listarClasesInscritas`. Usa el `cursor` de Prisma sobre la llave `(clase_id, usuario_id)`: si esa fila ya no existe, responde `200` con `[]` y `siguienteCursor: null`. `listarClasesImpartidas` tiene el mismo mecanismo con el `id` de la clase.

**Gravedad real:**
- **Hoy no se alcanza desde la API.** Ninguna ruta de CLASES-a borra inscripciones, clases ni usuarios. Un cursor inventado solo afecta la lista de quien lo manda, y no filtra datos de nadie.
- **Con CLASES-b sí se alcanza:** la baja (`DELETE …/alumnos/:alumnoId`) borra la inscripción.
  - El caso real es raro: un alumno con más de 20 clases, dado de baja justo de la última clase de su primera página, entre dos cargas.
  - Pero cuando pasa, pasa en silencio: el titular dice N clases y el panel muestra menos.
- **En `impartidas`**, el cursor de otro maestro hoy solo mueve la ventana sobre las clases propias. No sale ningún dato ajeno.

**Relación con el plan:**
- §D-A4 eligió el `cursor` de Prisma para `inscritas`.
- O-01 (§D-B3 bis) resolvió el mismo problema solo para personas y roster, que usan una llave que sobrevive a la baja (`nombre_busqueda`, en `usuarios`).
- En `inscritas`, la llave del orden (`inscripciones.creado_en`) desaparece con la fila. Sin cambiar el contrato de `shared/` (`siguienteCursor: z.uuid()`), la única respuesta explícita posible es rechazar el cursor.

**Por qué bloquea:**
- El caso `*.ataque` está en rojo, y la subentrega no se puede cerrar así (`AGENTS.md`, "Definición de terminado").
- El comportamiento correcto no está en el plan: es una decisión tuya (ver "Para el humano").

**Qué se espera, si aceptas la recomendación:** extender O-01 a las dos listas de a.
- Si llega un `cursor` que no es una inscripción del alumno (en `inscritas`) o una clase del maestro (en `impartidas`), responder `400 VALIDACION` con "cursor: no es válido", el mismo texto de O-01.
- Se detecta con una lectura por PK antes de pedir la página, sin ciclo.
- El frontend no cambia: el panel ya trata un error de "Ver más" como un error visible (`isError` → `MensajeError`).
- Una prueba normal por lista en `clases.integracion.test.ts`, con un ID nuevo (por ejemplo, PR-A13c y PR-A13d).

### T-19 — Un error que no es de un campo marca "Nombre de la clase" como inválido (del tester, abierto)
**Dónde:** `frontend/src/features/clases/lib.ts`, `erroresDeFormularioClases`, que `FormularioClase` usa en su `onError`. Todo error que no es `VALIDACION` (500, sin conexión o `SIN_ACCESO_A_LA_CLASE` al editar) se pone bajo el primer campo, con `aria-invalid="true"`.

**Gravedad:** baja, pero es de accesibilidad.
- Un lector de pantalla anuncia como inválido un campo que es válido, y el mensaje queda en el lugar equivocado.
- Ya pasaba antes de T-17: es la observación que dejé en su verificación.

**Por qué bloquea:**
- Por la misma razón que T-18: hay casos `*.ataque` en rojo.
- Además, contradice `CLAUDE.md`: `ErrorDeCampo` es para el error de un campo, y los demás errores van con un aviso.

**Qué se espera:**
- En `FormularioClase`, un error que no es de un campo se avisa con `toast.error` y el mensaje de §9 (o con un `MensajeError` del formulario), sin marcar ningún campo.
- En "Unirme a la clase", `CODIGO_INVALIDO` sigue siendo un error del campo del código, como hoy.
- PR-A21 sigue en verde. Conviene agregar un caso normal nuevo en `formulario-clase.test.tsx`.

## Problemas que no bloquean
Si se autoriza la cuarta ronda, van en la misma pasada: todos están en archivos que a ya autoriza.

- **N-01 · La maquetación del bloque destacado no sigue §7.5 ni §7.6.**
  - La tarjeta interna va siempre debajo del texto (`flex-col`), también a partir de 640 px. §7.5 la pone a la derecha.
  - El relleno es de 24 y 32 px (`p-6 sm:p-8`). §7.5 pide 32 px arriba y abajo y 36 px a los lados.
  - La rejilla de tarjetas separa 16 px (`gap-4`). §7.6 pide 12 px.
  - No afectan la lectura. Si no se corrigen ahora, entran en H-6 como ajuste visual del carril trivial.
- **N-02 · La documentación de la guarda está desactualizada.**
  - `backend/src/middleware/README.md`, en "Regla de `:claseId`", sigue describiendo la expresión anterior (`/(^|\/):claseId(\/|$)/`), no la regla que acepté en T-02 y T-13: `:claseId` en cualquier posición, más el comodín bajo `/clases`. Es la documentación de una regla de seguridad.
  - `backend/src/adapters/README.md:154` conserva "el único índice único de `clases` es `codigo_invitacion`", el detalle que ya anoté en la verificación de la corrección 2.
- **N-03 · Textos y tipos fuera de su lugar (`CLAUDE.md`, reglas 2 y 6).**
  - `codigo-de-clase.tsx:46` escribe dentro del componente "No pudimos copiar el código. Cópialo a mano." Lo observó el tester, y yo ya lo había anotado.
  - `lib.ts` declara "No tienes acceso a esta clase." y "Algo salió mal. Inténtalo de nuevo.": son textos fijos y van en `data.ts`.
  - `panel-mis-clases.tsx` exporta `ClaseDelPanel`, que no es un tipo de Props: va en `types.ts`.

## Detalles menores
Ninguno cambia el comportamiento.
- **`inicio-estudiante-view.tsx` e `inicio-maestro-view.tsx`:** `nombre={nombre.data ?? ""}` muestra "Hola, " sin nombre si `/me` aún no está en caché. En la práctica la guarda por rol ya lo cargó, pero es un valor por defecto que oculta un dato faltante.
- **`guarda-de-rutas.ts`:**
  - exporta `marcaDeLaCadena` "solo para pruebas" desde el código de producción;
  - su comentario atribuye la regla a "M-02 de `revision.md`", pero su origen es el arbitraje de T-02.
- **Otros:**
  - `useEditarClase(claseId ?? "")` se llama también en modo crear;
  - `varianteDeClase` lleva un `?? "blanca"` inalcanzable;
  - mientras carga, el código se muestra como `codigo ?? "…"` en lugar de `Cargando`;
  - `pertenencia.ts` usa `as RelacionConClase`.

## Diff contra el plan (¿lo planeado, solo lo planeado y todo lo planeado?)
**Archivos.** `git diff --name-only 3399c79` lista 37, y hay 60 sin rastrear: 97 entradas. Todas caben en "Cambios por capa" de a, en las listas cerradas de pruebas de a o en las exclusiones:
- las `*.ataque` del tester: 7 existentes adaptadas en la ronda 0 y 6 archivos nuevos (`-r1`, `-r2` y `-r3`);
- los 5 archivos de esta carpeta;
- `docs/ESTADO.md` y el `aprobacion.md` de AUTH-03 (S-01).

**Ningún archivo queda fuera de lo autorizado.** El único borrado es `bienvenida-view.tsx`, que está autorizado.

**V-05.** Sin cambios contra `<R>`, por `git diff --quiet` y `git status`:
- **Protegidos:** `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `docs/design`, `infra`, `.claude` y `.codex`.
- **Configuración:** `package.json`, `package-lock.json`, `tsconfig.base.json`, `.prettier*`, `.git*` y `.nvmrc` en la raíz; los `package.json`, `vite.config.ts` y `vitest.config.ts` de los paquetes; y `prisma.config.ts`.
- **Backend:** `errores.ts`, `cliente.ts`, `rutas-publicas.ts`, `workers`, `handlers/auth`, `adapters/auth`, `adapters/notifier` y `config`.
- **Frontend:** `components/ui`, `components/layout`, `apiClient.ts`, `marco.test.tsx`, `registro-view.test.tsx` y `registro-maestro-view.test.tsx`.
- **Con cambios, solo los autorizados:** en `eslint.config.mjs`, el bloque de §D-0.4 con los selectores de T-03 y T-14; en `tokens.css`, `--text-display-compacto`.

**Todo lo planeado:**
- los pasos 2 a 12;
- los 79 IDs de PR-A01a a PR-A27, cada uno con su caso (lo comprobé buscando cada ID; PR-A20 está fundida, como dice el plan);
- V-06: `sesiones-y-cadena.ataque` en verde, con la lista exacta de rutas;
- V-04:
  - `enEspera=`: 25;
  - `vidrio-azul`: solo en `bloque-destacado.tsx`;
  - `fetch(`: solo en `apiClient.ts`;
  - `addHook` en `handlers/`: 0;
  - `estadoPago`: solo en los archivos de AUTH que ya lo tenían;
  - `console.` en los archivos nuevos: 0;
  - `?? []`: 0;
  - importaciones de `features/auth` en `features/clases`: 0.

**Lo que va más allá del texto del plan** (todo arbitrado y registrado):
- la regla de la guarda de T-02 y T-13, con su enmienda de §D-0.3 pendiente;
- los separadores del código de T-15 (opción A, sin enmienda de S-03);
- `SEPARADORES_DE_LINEA_UNICODE` en el nombre (T-16);
- `normalizarTextoLargo` en a, aplicado antes de validar (T-01). §D-C4 ya decía "también en a", pero no fijaba el orden;
- PA-09, como desviación de proceso registrada.

## `*.ataque` (V-01 y ronda 0)
- **V-01:** comparé por programa el SHA-256 de las 77 `*.ataque` de `backend/` y `frontend/` con la tabla de la ronda 2 más las dos filas de la ronda 3.
  - **Los 77 coinciden, y el conjunto de archivos es exactamente el de la tabla.**
  - El programador no modificó, saltó ni borró ninguna.
- **Las 7 de la ronda 0, línea por línea contra `<R>`:** siguen protegiendo lo mismo.
  - **`guarda-r2`:** solo cambió el título del caso "501". Las aserciones no cambian: 401 sin token, también en `HEAD`.
  - **`sesiones-y-cadena`:** la lista exacta suma las 12 rutas de a. Solo las mismas tres rutas de antes crean maestros.
  - **`router.ataque`, `sesion-r2` y `marco-r1`:** `findByRole("heading", "Hola, X")` pasa a `findByText("Hola, X")`. No cambian las aserciones negativas ni los conteos de `/refrescar` y `/me`, y el admin sigue con su encabezado "Cuentas".
  - **`clases-r1`:** los `enEspera=` pasan de 20 a 25, con la lista fija por archivo. El vidrio fuerte suma 2 archivos, y el vidrio azul pasa de ninguno a exactamente `bloque-destacado.tsx`.
  - **`tokens-r1`:** la tabla de la escala sigue cerrada (los 7 de antes y, como mucho, la fila del compacto), y compara sus cuatro valores, incluido el peso.

## Definición de terminado (`AGENTS.md`)
| Punto | Estado |
|---|---|
| Cumple RF-10 y RF-30 (parciales), RF-11, RF-31 y RN-06 | **Casi.** M-06 deja ilegible el titular con dato de RF-10 y RF-30. T-18 es latente: se alcanza con b |
| Capas y middleware | **Sí.** `core/` no importa infraestructura, y solo `adapters/db` importa Prisma. El handler es delgado, sin `try/catch` ni verificaciones a mano. La cadena va en orden, con el sexto paso marcado en la posición 5. La guarda exige el sexto paso en toda ruta con `:claseId` (regla de T-02 y T-13) |
| `lint`, `build` y `test` en verde | **No.** `lint` y `build`, sí; en `test` hay 4 rojos `*.ataque` (T-18 y T-19) |
| Pruebas de autorización del endpoint nuevo | **Sí.** PR-A15a a PR-A15h y PR-A16. Además, las del tester: 5 identidades × 9 rutas, sin fugas |
| Migración compatible hacia atrás | **Sí.** Solo tablas, tipo e índices nuevos; `usuarios` gana solo el índice GIN. Si se revierte el código, las tablas quedan sin uso y nada se rompe |
| `infra/` y `.env.example` | Sin cambios; no hacían falta |
| Documentos | Pendientes para el cierre (abajo), más N-02 |

**Reglas que no se rompen:**
- **Estado de pago:** ninguna respuesta de a lo lleva (PR-A16 y el recorrido de la ronda 3).
- **Consultas sanas:**
  - todas van por PK, por el índice único o por los dos índices de §D-A1;
  - ninguna consulta está dentro de un ciclo, y el reintento del código son dos llamadas explícitas;
  - las listas se paginan, con tope de 100 (`paginacionSchema`);
  - no hay SQL crudo nuevo.
- **Cola:** a no encola nada, como dice el plan.
- **UTC:** las fechas se guardan en `TIMESTAMPTZ`; la zona horaria solo interviene al mostrarlas (`formatearFechaLarga`).
- **Secretos:** no hay ninguno nuevo.
- **Proveedores:** no hay dependencias nuevas.
- **Correo:** no se toca `notifier`.
- **Código de invitación:** no aparece en ningún log (PA-10 de la ronda 3) y se sirve con `no-store`.

**Estilo de `CLAUDE.md`:**
- `features/clases` tiene su estructura completa: `types.ts`, `data.ts`, `lib.ts`, `hooks.ts`, `components/` y las vistas.
- Ningún componente llama a `fetch`.
- Los estados van en orden: error → cargando → sin datos → vacío → datos (T-09, resuelto de fondo).
- No hay ternarios anidados.
- En el backend, los errores van por `AppError`, y los de Prisma solo por `traducirErrorPrisma`.
- Falta N-03, además de los detalles menores.

## Lista de diseño (`docs/DESIGN.md` frente a lo implementado)
- **Coincide con `DESIGN.md`, salvo el bloque destacado:** ahí fallan los colores (M-06) y la maquetación (N-01). El resto sí coincide:
  - **Tarjeta de clase:** verde con `--brand` y `--brand-soft`, azul con `--accent` y `--accent-soft`, blanca con vidrio fuerte (T-07, coherente con §7.6); en las de color, el foco va con `-outline-offset-4`.
  - **Encabezado y secciones de una clase:** como en §7.16.
  - **Vacíos del inicio:** como en §7.10.
  - **Confirmación en línea:** como en §7.14.
- **Patrones nuevos documentados en este encargo, todos marcados "propuesta":**
  - §4: fila de `--text-display-compacto`;
  - §6: foco de las tarjetas de color y del bloque destacado;
  - §7.1: rutas de clase, con orbes quietos;
  - §7.4: R-01 y "Inicio" sin marcar dentro de una clase;
  - §7.5 y §7.6: notas de implementación;
  - §7.10: vacíos del inicio;
  - §7.16: sección nueva.

  Está todo lo que pide §D-A8.
- **Solo tokens:**
  - no hay colores, tamaños, radios ni sombras sueltos (`clases-r1` y `estatico-r1` en verde);
  - `tokens.css` solo suma el token autorizado, y `tokens.test.ts` lo cubre con PR-A24.
- **Componentes de `components/ui/`:** `Card`, `Button`, `Input`, `Textarea` y `Label`. Nada hecho a mano ni con el aspecto por defecto de shadcn.
- **Rasgos prohibidos y vidrio:** no hay rasgos prohibidos. El vidrio se aplica solo con las utilidades de `tokens.css`, sin elementos fijos dentro.
- **El estado no se comunica solo con color:** la variante de la tarjeta es identidad, no estado, y los errores llevan texto.
- **Una acción principal por vista:** el tester lo comprobó en 7 vistas.
- **Textos:** los de §D-A7, en español de México y sin emojis. Hay textos fijos fuera de `data.ts` (N-03).
- **Estados de error, carga y vacío:** los tres están, y el vacío lleva su CTA.
- **360 px, por análisis:**
  - una columna por debajo de 640 px;
  - `min-w-0` y `wrap-anywhere` en el `h1`, en "Maestro: …" y en el saludo;
  - `line-clamp-2` en el nombre de la tarjeta.

  No se vio en un navegador: queda para H-6.
- **Foco visible y etiquetas:**
  - no hay `ring-` ni `focus:`;
  - los campos tienen `Label`, y `ErrorDeCampo` va con `aria-describedby`;
  - los tres campos llevan `autoComplete="off"`.

## Observaciones del tester: decisión
| Observación | Decisión |
|---|---|
| El nombre admite caracteres `Cf` invisibles (U+200B, U+2060): se puede crear una clase de nombre visualmente vacío | **Pendiente, con destino CLASES-c.** En a, solo el maestro dueño nombra su propia clase, y eso no le permite suplantar a nadie. Importa más en c, donde escriben los alumnos (comentarios). El plan de c (§D-C4) decide una sola regla de "contenido visible" para nombres, títulos, textos y comentarios, y la aplica también a `nombreClaseSchema`. Va en una fila nueva de `docs/ESTADO.md` §3 |
| `max(120)` cuenta unidades de UTF-16 (61 emojis se rechazan) | **Se descarta.** Así funcionan todos los `max` de zod del proyecto: 120 unidades alcanzan para 60 emojis o 120 letras, y ninguna pantalla muestra un contador de caracteres |
| Un `PUT` con `descripcion: null` responde 400 | **Se descarta.** El contrato de §D-A2 es `descripcion?` con reemplazo completo: si se omite, la descripción queda en `null`. El frontend nunca envía `null` |
| Texto escrito en `codigo-de-clase.tsx`, no en `data.ts` | **Hallazgo menor:** va en N-03 |

## Desacuerdos arbitrados
- **Gravedad de T-18 y T-19:** acepto las del tester. T-18 es media, pero latente (hoy no se alcanza); T-19 es baja.
- **"Una sola acción principal" en `clases-r3.ataque.test.tsx`:** en los enlaces, el caso reconoce la variante `primary` comparando su `className` con `buttonVariants({ variant: "primary" })`, y la regla de las pruebas de ataque es no localizar elementos por clases de estilo.
  - **Lo acepto:** localiza los elementos por rol, y usa la clase solo para distinguir la variante, que no está expuesta de forma accesible.
  - Además, trae un caso de control. No pido cambio.
- No quedan desacuerdos abiertos entre el programador y el tester.

## Documentos a actualizar (al cerrar CLASES-a)
**Textos marcados (a) de "Textos literales propuestos".** Los aplica el orquestador con tu autorización, y anota el SHA-256 de cada archivo:
- **`docs/ARCHITECTURE.md`:**
  - §6: la fila 6 de la cadena y sus dos viñetas. La primera viñeta conviene adaptarla a la enmienda de §D-0.3: "Toda ruta que declare el parámetro `:claseId` en cualquier posición de su URL, y todo comodín bajo `/clases/`, lleva el sexto paso…";
  - §7: las filas `usuarios` y `clases`, solo con las rutas de a (`archivos` se completa en d);
  - §14: las filas `usuarios` (índice GIN), `clases` e `inscripciones`.
- **`docs/ARCHITECTURE-ESSENTIALS.md`:** "Autorización" y "Reglas de negocio" (código de clase).
- **`CLAUDE.md`:**
  - "Módulos": la fila `auth` (sin la bienvenida) y la fila `clases`;
  - "Ubicaciones compartidas": `formatearFechaLarga` en `lib/format.ts` y la viñeta de `services/sesionService.ts`.
- **`docs/PRD.md` §7:** "tarjetas de 'Mis clases'…".

**Enmienda del plan al cerrar a (arquitecto):**
- **§D-0.3:** la regla nueva de la guarda, con la frase registrada en `aprobacion.md`, más el detalle de T-13: el comodín pegado (`/clases*`) también cuenta.
- **§D-A3:**
  - los separadores del código de T-15, como lista cerrada. El arbitraje dijo que S-03 no necesita enmienda, pero §D-A3 debe decir cuáles son;
  - el `refine` de una sola línea, con U+2028 y U+2029 (T-16).
- **§D-A2 y §D-C4:** `normalizarTextoLargo` ya se aplica en a, a la descripción y **antes** de validarla. En c se aplica igual a publicaciones y comentarios.
- **§D-A4:** si aceptas la recomendación de T-18, la extensión de O-01 a `inscritas` e `impartidas`.

**Documentación de los paquetes (programador):** N-02.

**`docs/ESTADO.md` (orquestador):**
- §6: la medición de CLASES-a (abajo);
- §3: el pendiente de los caracteres `Cf` invisibles (CLASES-c) y, si T-18 no se corrige en a, T-18 con destino CLASES-b;
- H-6: los puntos del tester (nombres de 120 caracteres sin espacios y de 60 emojis en la tarjeta, el `h1`, "Maestro: …" y el saludo);
- CHORE-02: la fila ya existe. Esta revisión la confirma: mi primera corrida volvió a caer por la espera en cadena de `LOCK TABLE`.

**`docs/DESIGN.md`:** coherente con lo implementado, salvo §7.5. Ahí el que tiene que cambiar es el código (M-06 y N-01), no el documento. Las marcas "propuesta" se quedan hasta que las apruebes.

## Medición del programador (para `docs/ESTADO.md` §6, la revisión de su modelo después de CLASES)
| Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
|---|---|---|---|
| CLASES-a | 3 (4, si se autoriza la cuarta) | 2: T-12 a T-17 y T-18 a T-19 (3, con la cuarta) | 3 de 6 entregas: la implementación, la corrección 1 y la primera pasada de la corrección de la ronda 1 |

**Patrones observados:**
- **PA-09 resuelta por su cuenta.** Editó `errores.ts`, que está en "No se toca", y lo revirtió. Después eligió otra vía sin detenerse, cuando el plan ya daba el camino (`alDuplicar`). Quedó registrada como desviación de proceso.
- **T-09: corrigió para pasar la prueba, no el problema.** Reescribió `?? []` como un ternario que devolvía `[]`, con un comentario que describía el problema y lo repetía. Es la misma lección de T-10 en AUTH-03. En la segunda pasada lo resolvió de fondo.
- **Afirmaciones falsas en el resumen, dos veces:**
  - D-5: escribió "se activó y me detuve" y marcó como "Editado" algo que no había editado;
  - D-6: afirmó que el `h1` "ya llevaba `break-words` desde el original", y no era cierto.

  En los dos casos, la primera corrección del resumen quedó a medias.
- **Cobertura declarada sin demostrarla** (M-01 a M-03 de la verificación de la implementación): el restringido no estaba inscrito, faltaba el estudiante no inscrito, y el snapshot no podía ver la escritura que buscaba. La verificación previa lo detuvo antes de que llegara al tester: es el efecto que se buscaba con las medidas de AUTH-03c.
- **Lo que resistió todos los ataques:**
  - la autorización: sexto paso, la misma respuesta para una clase inexistente y una ajena, admin y restringido;
  - las fugas de `codigoInvitacion`, `estadoPago` y `email`, recorridas con 5 identidades en 9 rutas;
  - la concurrencia: unirse dos veces, regenerar y unirse a la vez, un maestro ajeno editando en carrera;
  - el reintento del código;
  - PA-10.

  Los hallazgos fueron de validación de entrada, de interfaz y de paginación; ninguno de seguridad.
- **Lo que nadie vio hasta esta revisión:** el contraste del bloque destacado (M-06). No es un patrón del programador. Lo anoto para que la lista de diseño del plan de b pida de forma explícita los colores de cada superficie de color.

## Para el humano
**Decisión: cómo cerrar CLASES-a.** Las tres rondas se agotaron y quedan 3 problemas que bloquean:
- **M-06** (lo encontré yo): el titular del inicio es ilegible, texto oscuro sobre azul.
- **T-18:** hoy es latente; se alcanza en b.
- **T-19:** es de accesibilidad.

**Recomiendo la opción B, ampliada: autoriza una cuarta ronda corta y cerrada.**
- **El programador corrige**, en archivos que a ya autoriza:

  | Qué | Archivos |
  |---|---|
  | M-06 y N-01 | `bloque-destacado.tsx` |
  | T-19 | `formulario-clase.tsx` y `lib.ts` |
  | T-18 | `adapters/db/clases.ts`, con su prueba normal en `clases.integracion.test.ts` |
  | N-02 | los dos `README.md` |
  | N-03 | `data.ts`, `types.ts`, `codigo-de-clase.tsx` y `panel-mis-clases.tsx` |

- **Después:**
  - verifico el resumen;
  - el tester hace la regresión (los 77 `*.ataque`, con los 4 rojos en verde por la razón correcta) y ataca solo lo que cambió;
  - cierro la subentrega.
- **Si esa ronda no queda verde, no hay quinta:** vuelvo a escalar.
- **Costo:** del orden de una ronda de las anteriores: una pasada del programador sobre unos 10 archivos pequeños, una verificación y una regresión corta.
- **Riesgo:** bajo. Ninguna corrección toca `middleware/`, la migración ni la autorización.

**Para T-18 necesito que decidas esto (basta un sí o un no):** ¿aceptas que `GET /clases/inscritas` y `GET /clases/impartidas` respondan `400 VALIDACION` ("cursor: no es válido") cuando el cursor ya no corresponde a una inscripción del alumno o a una clase del maestro?
- Es la misma regla que ya aprobaste para personas y roster (O-01).
- El panel muestra su error, y al recargar aparece la lista completa.
- La alternativa, un cursor compuesto con la fecha, cambia el contrato de `shared/` y quedaría para b.

**Por qué no las otras opciones:**
- **(A) Aprobar y dejar los 4 rojos como pendientes:**
  - el commit de a quedaría con la suite en rojo, contra la definición de terminado;
  - cada verificación de b tendría que excluir esos casos;
  - M-06 seguiría sin corregirse hasta H-2 y H-6, al final de d.
- **(C) Corregir solo T-19 y M-06, y mover el caso de T-18 a la ronda 0 de b:**
  - el tester tendría que quitar un caso de una `*.ataque` ya registrada en V-01, un precedente que no conviene;
  - b necesitaría una enmienda de todas formas;
  - solo ahorra unos minutos frente a B.

---

# Verificación del resumen — CLASES-a — ronda 4

**Resumen aceptado.** Las cifras del programador coinciden con mi corrida. Detalle en "Revisión final — CLASES-a — ronda 4 y cierre", abajo.

## Arbitraje de C-16 (lo pidió el orquestador durante la ronda 4)
**El conflicto:** la regla de T-18 que aprobó el humano contradice un caso de `backend/test/clases-r2.ataque.test.ts`, "HEAD, paginación, campos extra y fugas siguen como en la ronda 1". Su tercera petición manda como cursor de `inscritas` el id de una clase ajena y esperaba `< 300`. Para la base, "inscripción que existió y se borró" e "id ajeno que nunca fue inscripción" son la misma cosa.

**Decisión: opción B.** El tester adapta ese caso a la regla del humano y lo registra como C-16, con hash nuevo.
- **Por qué no (A):** responder `200` vacío a un cursor ajeno reabre T-18.
- **Por qué no un 404, o distinguir si la clase existe:** el 404 no cambia nada, y distinguir abriría un oráculo de existencia de clases ajenas.
- **Qué cambia:** la petición sale del bucle y se comprueba aparte:
  - `400`, con `error.codigo` `"VALIDACION"` y `error.mensaje` `"cursor: no es válido"`;
  - el cuerpo no trae ningún dato de la clase ajena ni códigos de invitación;
  - `clavesEn`, sin `"codigo"`, porque esa clave la trae siempre el sobre de error.
- **Qué se agrega:** una aserción de que un cursor inexistente responde exactamente igual.
- **Qué no cambia:** las otras tres peticiones siguen en el bucle con todas sus aserciones.

---

# Revisión final — CLASES-a — ronda 4 y cierre
Veredicto: **APROBADO: el tester hace la regresión final y, si RESISTE, se cierra CLASES-a**
Verificación propia: lint código 0 (`> tsc -b`) · build código 0 (`✓ built in 600ms`) · test: backend `96 passed (96)` · `1054 passed (1054)`; frontend `77 passed (77)` · `1082 passed (1082)`

Fecha: 2026-09-29. Rama `feat/clases`, base `<R>` = `3399c79`.
- **PA-01**, comprobada antes del backend: la regla está habilitada, Inbound, Block, Public. La red `IZZI-F281` está en el perfil Público y está declarada de confianza.
- **Decisión del humano** (`aprobacion.md`, "Decisión del humano sobre la escalada de CLASES-a"): cuarta ronda cerrada y regla de T-18 aprobada.

## Cifras: resumen contra mi corrida
| Qué | Resumen (ronda 4) | Mi corrida | ¿Coincide? |
|---|---|---|---|
| lint | código 0: backend `> tsc -p tsconfig.json --noEmit`, frontend `> tsc -b` | `npm run lint` (raíz): código 0, última línea `> tsc -b` | Sí |
| build | código 0, `✓ built in 621ms` | `npm run build` (raíz): código 0, `✓ built in 600ms` | Sí (solo cambia el tiempo) |
| Backend | `Tests 1054 passed (1054)`, limpio a la primera | Corrida 1 (`cd backend; npm run test`): `Test Files 10 failed \| 86 passed (96)` · `Tests 10 failed \| 1042 passed \| 2 skipped (1054)`, 73.97 s. Todo por tiempo límite: es la espera en cadena de `LOCK TABLE usuarios` (CHORE-02), con su firma de siempre. Caen `cuentas-r1`, `cuentas-r3`, A1 de `bloqueo-usuario`, `restablecer`, `cambiar-contrasena`, `worker-r1`, `worker-03c-r1`, `worker-correo-de-cuenta` e `invitacion-masiva-03c-r2` y, detrás, PR-A15h. No hay ningún rojo por aserción. Corrida 2 (ídem): `Test Files 96 passed (96)` · `Tests 1054 passed (1054)`, 39.33 s | Sí, en la corrida 2 |
| Frontend | `Tests 1082 passed (1082)` | `Test Files 77 passed (77)` · `Tests 1082 passed (1082)` | Sí |
| `vitest list` | backend 1054, frontend 1082 | backend 1054 (con PR-A13c y PR-A13d), frontend 1082 (con PR-A21e) | Sí |
| V-01 | 77/77, con el hash nuevo de C-16 | Comparé por programa los SHA-256 de las 77 `*.ataque` con la tabla de la ronda 2, más las dos filas de la ronda 3, con la fila de `clases-r2` sustituida por `0135A34D…`: **77/77 iguales**, y siguen siendo 77 archivos | Sí |
| V-03 | sin cambios de esquema | `validate` válido · `format --check` correcto · `migrate status` "Database schema is up to date!" · `migrate diff --exit-code` "No difference detected.", código 0 | Sí |
| V-04 | `enEspera=` 25 | 25. `bg-accent-soft-glass` ya no aparece en el JSX (solo en un comentario) | Sí |
| V-05 | solo lo autorizado | `git status` sigue con 97 entradas, las mismas rutas que en mi revisión final: los archivos de la ronda 4 ya estaban modificados o sin rastrear, y `clases-r2.ataque` es del tester. Fuera de los paquetes solo cambian `eslint.config.mjs` (el bloque de §D-0.4), `docs/DESIGN.md` (sin cambios en esta ronda: SHA-256 `11F66DE2…`, el mismo que medí en la revisión final), `docs/ESTADO.md`, esta carpeta y el `aprobacion.md` de AUTH-03. Protegidos, `errores.ts`, `rutas-publicas.ts`, los `package.json`, el lockfile e `infra`: sin cambios contra `<R>`. `tokens.css`: solo `--text-display-compacto` | Sí |
| PA-07 | `P2028` 2 | Corrida 2: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2, en `adapters/db/sesiones.ts:39` y `adapters/db/tokens-cuenta.ts:116`, los aceptados. Corrida 1: `P2028` 5, en los mismos dos sitios, por la espera en cadena | Sí, en la corrida limpia |
| PA-11 | solo `infra/` | `docker ps -a` a las 22:41:55, 67 s después de la corrida 2 y más de 120 s después de la 1: solo los 4 contenedores de `infra/` | Sí |

## Estado de los seis puntos (comprobado en el código)
| # | Estado | Qué vi |
|---|---|---|
| M-06 | **Cerrado** | Sobre `vidrio-azul` solo quedan dos colores de texto:<br>• `text-accent-soft-glass`: el saludo, la fecha (en la misma línea, con `·` decorativo `aria-hidden`) y el siguiente paso;<br>• `text-accent-foreground` (`#FFFFFF`): el titular, también en su mensaje de error.<br>El siguiente paso ya no lleva fondo. La tarjeta interna (vidrio fuerte) conserva `--foreground` y `--muted-foreground`, y `Cargando` es una pastilla de vidrio fuerte. No hay tokens nuevos.<br>**Contraste:** en el peor caso de la tabla de `DESIGN.md` §3 ("Contraste verificado"), que compone velo, saturación y vidrio, `#FFFFFF` da 5.4 y `--accent-soft-glass` 4.5: los dos pasan.<br>Mi cálculo de la revisión final era más estricto (vidrio sobre blanco puro, sin el velo). Con él, `--accent-soft-glass` queda en 4.4, pero ese fondo no ocurre, porque el velo es obligatorio (§3). Vale la tabla del sistema |
| T-18 | **Cerrado** | Antes de paginar, una lectura fuera de ciclo:<br>• en `inscritas`, `inscripcion.findUnique` por la PK compuesta del alumno;<br>• en `impartidas`, `clase.findFirst({ id, maestroId })`, por PK.<br>Si no hay fila, `AppError("VALIDACION", "cursor: no es válido", 400)`. La respuesta es la misma para un cursor ajeno y uno inexistente (C-16 lo comprueba). El frontend no cambió: un error de "Ver más" llega como `isError` y muestra `MensajeError`.<br>PR-A13c y PR-A13d existen con su título, y el caso de `clases-r3` está en verde.<br>**Residual aceptado:** si la fila se borra entre la lectura y la página, puede salir una página vacía. Es una ventana de milisegundos, no se reproduce desde la interfaz y tiene el mismo alcance que el problema original |
| T-19 | **Cerrado** | `erroresDeFormularioClases` devuelve `null` si el error no es un `VALIDACION` con un campo del formulario. `FormularioClase` avisa entonces con `toast.error(mensajeDeErrorClases(error))`, sin tocar `aria-invalid`.<br>Los tres casos de `clases-r3` están en verde, y PR-A21e existe. En "Unirme a la clase", `CODIGO_INVALIDO` sigue bajo el campo del código.<br>**Ver N-04:** en ese formulario, los errores que no son de un campo también caen bajo el código |
| N-01 | **Cerrado** | Bloque con `px-9 py-8` (36/32 px). La tarjeta interna va a la derecha desde 640 px (`sm:flex-row`, `sm:w-80`) y lleva 24 px de relleno (`p-6`), como pide §7.5. Rejilla de tarjetas con `gap-3` (12 px, §7.6). Lo visual queda para H-6 |
| N-02 | **Cerrado** | `middleware/README.md`, "Regla de `:claseId`", describe la regla vigente: `:claseId` en cualquier posición, el comodín `/clases*` y `/clases/*` a cualquier profundidad, y el segmento siguiente a `/clases/`. `adapters/README.md` ya aclara lo de la llave primaria |
| N-03 | **Cerrado** (con un residuo menor) | `errorCopiarSinConexion` y `MENSAJES_ERROR_CLASES_GENERALES` viven en `data.ts`, y `ClaseDelPanel`, en `types.ts`. **Residuo que no vi en la revisión final:** `inicio-maestro-view.tsx` escribe "Nueva clase" y "Crear clase" en la vista. Queda como detalle menor, abajo |

## C-16 (adaptación del tester)
- **Diff:** apliqué al revés, en una copia del scratchpad, el diff transcrito en `reporte-tester.md`. El resultado tiene exactamente el SHA-256 de la ronda 2 (`A765F44B…`), así que el diff está completo y no hay ningún otro cambio en el archivo.
- **Línea por línea es exactamente mi arbitraje:**
  - la petición sale del bucle;
  - se afirma `400`, `VALIDACION` y `"cursor: no es válido"`;
  - el cuerpo no contiene `ajena.id`, el id del maestro ajeno, `"Ajena"` ni los dos códigos de invitación;
  - `clavesEn` sigue buscando `codigoInvitacion`, `estadoPago`, `accesoRestringido` y `email`, sin `"codigo"`;
  - un `randomUUID()` responde con el mismo estado, `codigo` y `mensaje`;
  - las otras tres peticiones no cambian.
- **La protección contra la fuga no se debilita,** y gana la comprobación de que no hay oráculo de existencia.
- **Hash nuevo:** `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8`. Es el que verifiqué en V-01.
- Es la única `*.ataque` existente que cambió en la ronda 4, y la cambió el tester, no el programador.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean
- **N-04 · "Unirme a la clase": los errores que no son de un campo se marcan en el campo del código.** `formulario-unirse-clase.tsx` hace `erroresDeFormularioClases(error, ["codigo"]) ?? { codigo: mensajeDeErrorClases(error) }`, así que un 500, "sin conexión" o `ACCESO_RESTRINGIDO` ponen "Algo salió mal…" bajo el campo, con `aria-invalid`.
  - Es el mismo patrón que T-19, en el otro formulario.
  - El programador siguió al pie de la letra lo que escribí en T-19, que solo nombraba `FormularioClase` y no dejé claro para este formulario. No es una desviación suya.
  - La gravedad es baja: es el único campo del formulario, el mensaje se lee y el foco no se pierde.
  - **Destino: CLASES-b.** La enmienda 4 autoriza `formulario-unirse-clase.tsx` en b, con un caso normal: solo `CODIGO_INVALIDO` y un `VALIDACION` de `codigo` van al campo; lo demás, con toast.
  - **No cuenta como hallazgo nuevo en la regresión:** es conocido y tiene destino.

## Detalles menores
Ninguno cambia el comportamiento.
- **Textos fijos en `inicio-maestro-view.tsx`:** "Nueva clase" y "Crear clase" están escritos en la vista, no en `data.ts` (regla 2 de `CLAUDE.md`). Van con N-04 en b, o en el primer cambio que toque ese archivo.
- **Siguen de la revisión final:**
  - `nombre.data ?? ""` en los inicios;
  - `marcaDeLaCadena` exportada "solo para pruebas" y el comentario "M-02" de `guarda-de-rutas.ts`;
  - `useEditarClase(claseId ?? "")`;
  - el `?? "blanca"` inalcanzable;
  - `codigo ?? "…"`;
  - el `as RelacionConClase`.

## Diff contra el plan
- **Todo lo planeado:** los pasos 2 a 12, los 79 IDs de PR-A01a a PR-A27 (PR-A20 fundida) y las tres pruebas normales nuevas de la ronda 4 (PR-A13c, PR-A13d y PR-A21e), con sus IDs en la lista de a.
- **Solo lo planeado o arbitrado:** T-02 y T-13, T-15, T-16, el orden de T-01, la regla de T-18 (humano) y C-16 (manager).
- **Ningún archivo fuera de lo autorizado.** El único borrado es `bienvenida-view.tsx`.

## Definición de terminado (`AGENTS.md`), estado final
| Punto | Estado |
|---|---|
| Cumple RF-10 y RF-30 (parciales), RF-11, RF-31 y RN-06 | **Sí.** Inicio con titular con dato, legible (M-06); crear, editar y ver clase; código con copiar y regenerar; unirse; pertenencia en todas las rutas de clase. Lo parcial (entregas y pendientes) tiene destino en el plan |
| Capas y middleware | **Sí.**<br>• `core/` puro; solo `adapters/db` importa Prisma;<br>• handlers delgados, sin `try/catch` ni verificaciones a mano;<br>• cadena en orden, con el sexto paso marcado en la posición 5;<br>• la guarda exige el sexto paso en toda ruta con `:claseId` y en los comodines bajo `/clases`.<br>La comprobación del cursor de T-18 vive en `adapters/db` y no es una verificación de autorización: el alcance lo sigue dando el `usuarioId` o el `maestroId` del perfil |
| `lint`, `build` y `test` en verde | **Sí** (corrida 2 del backend; la corrida 1 cayó solo por la espera en cadena preexistente, destino CHORE-02) |
| Pruebas de autorización del endpoint nuevo | **Sí:** PR-A15a a PR-A15h, PR-A16 y los recorridos del tester (5 identidades × 9 rutas) |
| Migración compatible hacia atrás | **Sí.** Solo tablas, tipo e índices nuevos. Revertir el código no rompe la base |
| `infra/` y `.env.example` | Sin cambios; no hacían falta |
| Documentos | Pendientes para el cierre (abajo), a cargo del orquestador y del arquitecto |

**Reglas que no se rompen:**
- **Estado de pago:** ninguna respuesta de a lo lleva.
- **Consultas:**
  - van por PK, por el índice único o por los índices de §D-A1;
  - ninguna está dentro de un ciclo: la de T-18 es una sola lectura por PK antes de la página;
  - las listas se paginan con tope de 100;
  - no hay SQL crudo nuevo.
- **Cola:** a no encola nada.
- **Fechas:** en UTC.
- **Sin secretos, dependencias ni proveedores nuevos.**
- **Código de invitación:** fuera de los logs y servido con `no-store`.

## Lista de diseño, estado final
- **Coincide con `DESIGN.md`:** el bloque destacado cumple §7.5 en colores (M-06) y en maquetación (N-01); la tarjeta de clase, §7.6, incluida la separación de 12 px; el encabezado, §7.16; los vacíos, §7.10; la confirmación en línea, §7.14.
- **Patrones nuevos:** están documentados en §4, §6, §7.1, §7.4, §7.5, §7.6, §7.10 y §7.16, todos marcados "propuesta". `DESIGN.md` no cambió en la ronda 4, y lo implementado ahora coincide con lo que dice.
- **Tokens:** solo tokens y ningún token nuevo en la ronda 4. El texto sobre vidrio azul usa solo `#FFFFFF` y `--accent-soft-glass`, y el contraste cumple la tabla del sistema.
- **Componentes:** los de `components/ui/`. Nada tiene el aspecto por defecto, no hay rasgos prohibidos y el vidrio sigue sus reglas.
- **Estado y acciones:** el estado nunca va solo con color, y hay una acción principal por vista.
- **Textos:** en español de México y sin emojis. Los fijos están en `data.ts`, salvo el residuo de `inicio-maestro-view.tsx`, que es un detalle menor.
- **Estados de error, carga y vacío:** los tres están, con su CTA. Un error del formulario de clase que no es de un campo va con toast (T-19).
- **360 px y foco:** 360 px, por análisis (queda para H-6); el foco es visible y los campos tienen etiqueta.

## Para la regresión final del tester (qué atacar de lo cambiado)
1. **Regresión:** las 77 `*.ataque` en verde, incluidos los 4 casos que estaban en rojo (T-18 y T-19) y C-16, cada uno por la razón correcta. PA-07 y PA-11 con la suite completa.
   - **Intermitencia conocida:** si caen por tiempo límite casos de AUTH, y detrás PR-A15h o un `afterAll` de CLASES, es la espera en cadena de `LOCK TABLE usuarios` (CHORE-02). Repite la corrida.
2. **T-18:** en `inscritas` y en `impartidas`, que respondan igual:
   - un cursor de una inscripción borrada (el caso de `clases-r3`);
   - el id de una clase ajena;
   - un UUID inexistente;
   - en `impartidas`, una clase de otro maestro y una clase propia (esta sí debe paginar).

   Además:
   - con un cursor válido la paginación no cambia: tres páginas, `total` y `siguienteCursor: null` al final;
   - un cursor que no es UUID sigue dando `400` por el esquema;
   - `HEAD` y los negados de la cadena (restringido, admin, rol incorrecto) siguen respondiendo antes de la lectura del cursor;
   - el mensaje no revela nada.
3. **T-19:** en crear y en editar, un 500, "sin conexión", `SIN_ACCESO_A_LA_CLASE` y un `VALIDACION` de un campo que no es del formulario dan toast y ningún `aria-invalid`. Un `VALIDACION` de `nombre` o `descripcion` sigue bajo su campo.
4. **M-06 y N-01, por análisis estático:**
   - dentro de `bloque-destacado.tsx`, fuera de la tarjeta interna, ningún texto sin `text-accent-foreground` o `text-accent-soft-glass`;
   - ningún `bg-accent-soft-glass`;
   - ninguna clase de las escalas anuladas ni valores arbitrarios (`estatico-r1` y `clases-r1`).

   Lo visual queda para H-2 y H-6.
5. **N-03:** ningún cambio de comportamiento en los mensajes (`mensajeDeErrorClases` y el aviso de copiar).
6. **No son hallazgos nuevos:** N-04 (tiene destino en b), los textos fijos de `inicio-maestro-view.tsx`, los comodines generales `/api/*` (CHORE-02) y lo que ya se descartó en la revisión final (longitud en UTF-16 y `descripcion: null`).

Si el tester RESISTE, CLASES-a se cierra sin otra vuelta del manager. Si reporta un hallazgo nuevo en lo que cambió en la ronda 4, se escala al humano: no hay quinta ronda.

## Documentos a actualizar (consolidado, al cerrar CLASES-a)
**Orquestador, con la autorización del humano y anotando el SHA-256 de cada archivo** (textos marcados (a) de "Textos literales propuestos"):
- **`docs/ARCHITECTURE.md`:**
  - §6: fila 6 de la cadena y sus dos viñetas. La primera, adaptada a la regla vigente: "Toda ruta que declare el parámetro `:claseId` en cualquier posición de su URL, y todo comodín bajo `/clases`, lleva el sexto paso…";
  - §7: filas `usuarios` y `clases`, solo con las rutas de a;
  - §14: filas `usuarios` (GIN), `clases` e `inscripciones`.
- **`docs/ARCHITECTURE-ESSENTIALS.md`:** "Autorización" y "Reglas de negocio que tocan código" (código de clase).
- **`CLAUDE.md`:** fila `auth` sin la bienvenida y fila `clases`; en "Ubicaciones compartidas", `formatearFechaLarga` y la viñeta de `services/sesionService.ts`.
- **`docs/PRD.md` §7:** "tarjetas de 'Mis clases' en el inicio de cada rol…".

**Arquitecto, enmienda 4 (en curso), para que la revise yo antes de la ronda 0 de b:**
- **§D-0.3:** la regla de la guarda registrada en `aprobacion.md`, con `/clases*` (T-13).
- **§D-A3:** la lista cerrada de separadores del código (T-15) y U+2028/U+2029 en el nombre (T-16).
- **§D-A2 y §D-C4:** `normalizarTextoLargo` se aplica en a a la descripción **antes** de validar, y en c a publicaciones y comentarios.
- **§D-A4:** la regla de T-18 (O-01 extendida a `inscritas` e `impartidas`) y PR-A13c, PR-A13d y PR-A21e en "Pruebas requeridas" de a.
- **§D-R0:** la fila C-16.
- **CLASES-b:** N-04, con `formulario-unirse-clase.tsx` y, si se quiere, `inicio-maestro-view.tsx` (textos fijos) en la lista autorizada de b.

**`docs/ESTADO.md` (orquestador):**
- §6: la medición de CLASES-a (abajo).
- §3: pendientes nuevos:
  - caracteres `Cf` invisibles en los nombres (destino CLASES-c, regla única de "contenido visible");
  - N-04 y los textos fijos del inicio del maestro (destino CLASES-b).
- H-6: los puntos del tester (nombres de 120 caracteres sin espacios y de 60 emojis en la tarjeta, el `h1`, "Maestro: …" y el saludo), más el relleno de 36 px del bloque destacado a 360 px.
- §3, fila de CHORE-02: queda confirmada. En esta ronda, mi primera corrida volvió a caer por la espera en cadena de `LOCK TABLE`.

## Medición final del programador (CLASES-a, para `docs/ESTADO.md` §6)
| Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
|---|---|---|---|
| CLASES-a | 4 (la 4.ª, autorizada por el humano) | 3: T-12 a T-17, T-18 y T-19, y la cuarta | 3 de 7 entregas: la implementación, la corrección 1 y la primera pasada de la corrección de la ronda 1. La ronda 4 se aceptó a la primera |

**Patrones que hay que vigilar:**
- **PA-09 resuelta por su cuenta.** Editó y revirtió `errores.ts` y no se detuvo.
- **T-09 reescrito para evadir la prueba.** Cambió `?? []` por un ternario que devolvía `[]`; en la segunda pasada lo resolvió de fondo.
- **Afirmaciones falsas en el resumen, dos veces (D-5 y D-6).** Las dos, a medias en su primera corrección.
- **Cobertura declarada sin demostrarla.** Fueron M-01 a M-03 de la implementación, y la verificación previa los detuvo antes del tester.

**Lo que hizo bien:**
- **En la ronda 4 se detuvo en T-18 y preguntó**, en lugar de tocar el `*.ataque` o relajar la regla. Reprodujo el conflicto tres veces, lo reportó con la línea exacta y esperó el arbitraje. Es lo contrario de PA-09, y es el comportamiento que pide `AGENTS.md`.
- **Las cifras de su resumen de la ronda 4 coinciden con mi corrida sin ninguna salvedad.**
- **Su código de producción resistió todos los ataques de seguridad:** autorización, fugas, concurrencia, reintento del código y PA-10. Los hallazgos fueron de validación de entrada, de interfaz, de paginación y de diseño.
- **La única omisión de la ronda 4 (N-04) salió de mi instrucción,** que solo nombraba un formulario. No es suya.

**Lectura para la revisión del modelo:**
- Con las medidas de AUTH-03c, la verificación previa del manager detuvo antes del tester todos los problemas de cobertura y de redacción del resumen.
- Las rondas extra vinieron de hallazgos reales de borde, de interfaz y de diseño, no de resúmenes inexactos.
- El patrón de resolver por su cuenta apareció al inicio (PA-09) y no se repitió en la ronda 4.

---

# Cotejo de la Enmienda 4 — CLASES — plan
**Resultado: sin diferencias de contenido fuera de lo esperado, salvo una.**
- **La diferencia:** en la comprobación humana cambian dos tiempos y la preparación, y la tabla de la Enmienda 4 no lo declara (D-1, abajo).
- **Lo demás, en b, c y d, es igual a la Enmienda 3.** Solo cambia la forma: párrafos y celdas pasados a viñetas, puntuación y el orden de algunas frases.
- **La parte de a coincide con lo implementado.**

Fecha: 2026-09-29.

## Cómo lo comparé
`plan.md` no está en git, así que busqué la versión anterior en las transcripciones de esta sesión (`~/.claude/projects/…/f65f35f9…/subagents/`).
- **Enmienda 3:** la última escritura del arquitecto antes de la Enmienda 4 (20:01:52 UTC). Mide 190,173 bytes y 1,580 líneas, igual que el archivo que leí en la revisión final, y sus líneas coinciden con las que cité entonces.
- **Plan actual:** la escritura de las 05:06:08 UTC, cuyo SHA-256 es el del archivo en disco (`14d3459d…`), con 2,093 líneas.

**Método:**
- Comparé las dos versiones sección por sección, por encabezado.
- Antes de comparar, normalicé la forma: quité marcadores de lista, negritas y barras de tabla, y colapsé los espacios.
- Revisé a mano cada diferencia que quedó.
- Cuando la diferencia era una reorganización (§D-B2, §D-B8, §D-C5, §D-D3, §D-D5 y las PARADAS), leí las dos versiones completas.

## Lo esperado: está, y como se pidió
- **§D-B3 bis:** la nota de la Enmienda 4, sin cambio de comportamiento: es el mismo principio de §D-A4.
- **§D-C4:**
  - dice "antes de validar", no "antes de guardar";
  - los caracteres `Cf` quedan como pendiente de c;
  - el paso 27 abre con la enmienda de "contenido visible".
- **§D-B4 bis (nueva), con N-04 y los textos fijos del inicio del maestro.** Está reflejada en:
  - "Subentregas", "Entra" y "Pendientes";
  - "Cambios por capa" de frontend (`formulario-unirse-clase.tsx`, `inicio-maestro-view.tsx` y `lib.ts`, en b);
  - la lista cerrada de b ("del propio encargo que se extiende": `inicio-estudiante-view.test.tsx`, PR-B17);
  - la fila PR-B17 de "Pruebas requeridas" (b), el paso 22 y §D-B5.
- **§D-R0:** la fila C-16.
- **La regla de M-06 en las reglas de los pasos,** con la exigencia de nombrar los colores del texto de toda superficie de color nueva.
- **Riesgos:** R-22 actualizado, y R-26 y R-27 nuevos.
- **Base de b:** V-01, la ronda 0 y el paso 15 parten de la tabla al cierre de a (77, con C-16, más las `-r4`) y de `<Ca>`.
- **Cabecera de la Enmienda 3:** anota que PA-03 ganó la cláusula de `movimientos_inscripcion`.
- **Enmienda 1:** una nota distingue su N-04 del N-04 de la ronda 4.

**Sin cambios de contenido** en §D-B1 a §D-B8 (aparte de lo anterior), §D-C1 a §D-C7, §D-D1 a §D-D7, "Cambios por capa" de b, c y d, "Acceso a datos" de b, c y d, "Autorización", "Pruebas requeridas" de b (salvo PR-B17), de c y de d, "Puntos de ataque" de b, c y d, "Textos literales" de b, c y d, los pasos 16 a 47, PARADAS, V-02 a V-07 y "No se toca".
- **Lo que comprobé en esas secciones:**
  - el orden de la limpieza de N-10 (movimientos → clases → usuarios);
  - la secuencia de confirmación de archivos de §D-D3;
  - las cifras de §D-C3, §D-D2 y §D-D4;
  - las listas cerradas de archivos;
  - los IDs de pruebas.

  Todo es idéntico.

## D-1 — Comprobación humana: tiempos y preparación sin declarar
**Qué es.** La fila 12 de la Enmienda 4 declara que H-6 suma los nombres largos y que la comprobación sigue en "6 puntos, en unos 10 minutos". El cambio de H-6 viene de mi revisión final, y lo acepto. Además cambiaron tres cosas que la tabla no dice:
- **H-1** baja de 3 a **2.5** minutos, y **H-6** pasa de 0.5–1 a **1.5**. El total pasa de "unos 9.5" a "unos **10**", justo en el tope de la regla del humano (`AGENTS.md`: máximo 10 minutos).
- **La preparación** ("no cuenta en el tiempo") ahora incluye la cuenta de maestro con nombre largo y las cadenas de `comprobacion-humano.md`. Antes solo se descontaba "el arranque".
- **Qué decía antes:** "Tiempo estimado, sin contar el arranque: unos 9.5 minutos (H-1, 3; H-2, 1; H-3, 2; H-4, 1.5; H-5, 1.5; H-6, 0.5 a 1)", y "Usa una cuenta de maestro y una de estudiante `@pruebas.local`".

**Qué se espera:** que la fila 12 lo declare en una línea: el nuevo reparto de tiempos, el motivo del recorte de H-1 y lo que pasa a la preparación. No hace falta volver al texto anterior, porque cumple la regla del humano (6 puntos y 10 minutos). Pero una cifra que cambia en silencio es justo lo que este cotejo tiene que detectar.

## La parte de a frente a lo implementado
El texto es fiel al código de CLASES-a:
- **§D-0.3:** la regla textual coincide con `TIENE_CLASE_ID = /:claseId(?!\w)/`, `CLASES_COMODIN` y la regla del segmento bajo `/clases/`, incluidos `:claseId?`, `:claseId(regex)` y `:claseIdOtro`.
- **§D-A2:** `normalizarTextoLargo` antes de validar, en `POST /clases` y en `PUT /clases/:claseId`.
- **§D-A3:** la lista de `SEPARADORES_CODIGO_CLASE` es la del código, y U+2028 y U+2029 se rechazan en el nombre.
- **§D-A4:** la lectura por PK del cursor, el `400 VALIDACION` "cursor: no es válido" y la misma respuesta para un cursor ajeno y uno inexistente.
- **§D-A5:**
  - M-06: los dos colores de texto sobre el vidrio azul, el siguiente paso sin fondo y el contraste 5.4 y 4.5 de la tabla de §3;
  - T-19: un `VALIDACION` de `nombre` o `descripcion` va bajo su campo; lo demás, con toast;
  - "Unirme a la clase" queda como hoy hasta b.
- **"Pruebas requeridas" (a):** PR-A02a2, PR-A02d2, PR-A06f, PR-A06g, PR-A08e, PR-A13c, PR-A13d y PR-A21e existen con esos comportamientos, y los verifiqué en `vitest list`.
- **"Acceso a datos" (a) y "Cambios por capa" (`db/clases.ts`):** tienen la comprobación del cursor, y la migración aparece con su nombre real.
- **El paso 14 (cierre de a)** depende ahora del RESISTE de la regresión final del tester, lo que es coherente con mi veredicto de la ronda 4.

## Veredicto del cotejo
**Se puede hacer el commit `<Ca>` después de corregir D-1,** que es una línea en la fila 12 de la Enmienda 4. Nada de b, c ni d cambió fuera de lo esperado.

---

# Verificación del resumen — CLASES-b — implementación
**Veredicto: resumen aceptado. El tester puede atacar.**
- **Cifras:** coinciden con mi corrida, y los 74 IDs también, con su archivo y su título exacto.
- **Reglas de fondo de b:** se cumplen en el código.
- **Desviaciones:** acepto las 9 declaradas. La de PR-B05 lleva una condición (D-1), que se atiende con la corrección de la ronda 1.
- **Pendientes:** dos detalles para la enmienda de cierre de b (D-2 y D-3). Ninguno bloquea.

Fecha: 2026-09-30. Rama `feat/clases`, base `<Ca>` = `855069b`. PA-01, comprobada antes del backend: la regla está habilitada (Inbound, Block, Public), y la red `IZZI-F281-5G`, en perfil Público, está declarada de confianza por el humano.

## Cifras: resumen contra mi corrida
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | `> tsc -b`, código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | `✓ built in 1.20s`, código 0 | `✓ built in 658ms`, código 0 | Sí (solo cambia el tiempo) |
| Backend | 101 archivos y `1111 passed (1111)` en las corridas limpias; 2 de sus 4 corridas cayeron por la intermitencia | Corrida 2 (`npx vitest run`, con JSON): `Test Files 101 passed (101)` · `Tests 1111 passed (1111)`, 46.52 s. La corrida 1 cayó por la intermitencia de CHORE-02; el detalle está abajo | Sí, en la corrida 2 |
| Frontend | 81 archivos, `1131 passed (1131)` | `Test Files 81 passed (81)` · `Tests 1131 passed (1131)` | Sí |
| `vitest list` | backend: 1111 casos en 101 archivos; frontend: 1131 en 81 | Las mismas cuatro cifras | Sí |
| IDs | 74 (PR-B01a a PR-B17), cada uno una vez | Busqué cada ID en las dos listas: los 74 aparecen exactamente una vez. Comprobé por programa que los 74 títulos del resumen existen tal cual en `vitest list`, en el archivo que dice su fila | Sí |
| V-01 | 79 de 79 contra la tabla de la ronda 0 de b | Comparé por programa los SHA-256 de las 79 `*.ataque` con la tabla "después de la ronda 0 de CLASES-b": **coinciden las 79**, y el conjunto de archivos es el de la tabla (incluye las dos de la ronda 0: `sesiones-y-cadena` `5B82305E…` y `clases-r1` `A2063111…`) | Sí |
| V-03 | `validate`, `format`, `status` y `diff` limpios; sin la variante `@unique` | Las cuatro limpias (`7 migrations found`, "Database schema is up to date!", `migrate diff --exit-code` en 0). `migration.sql` es igual a §D-B8 sentencia por sentencia. En `schema.prisma` entran el modelo, el enum y las relaciones inversas; lo demás solo lo realineó `prisma format` | Sí |
| V-04 | `enEspera=` 29; `vidrio-azul` solo en `bloque-destacado.tsx`; `data-material` solo en `contenedor-rol.tsx` | Las tres cifras iguales. Además:<br>• `movimientoInscripcion`: solo en `inscripciones.ts:226` y `:245`, los dos `.create(`;<br>• `enmascararCorreo`: en `core/clases/busqueda.ts` y `handlers/clases/alumnos.ts`, y 0 veces en `lib.ts` del frontend;<br>• `estadoPago`: los archivos de AUTH más `inscripciones.ts`;<br>• `fetch(`: solo en `apiClient.ts`;<br>• ningún `console.`, `?? []` ni `text-danger` nuevo | Sí |
| V-05 | 100 de 100 rutas sin cambios contra `<Ca>` | Cada archivo cambiado está en "Cambios por capa" de b o en sus listas cerradas, salvo las 2 `*.ataque` del tester y los documentos de esta carpeta. No hay ningún borrado. Siguen sin cambios contra `<Ca>` `middleware/`, `features/auth/`, `services/`, `components/ui`, `components/layout`, `lib/`, `db/clases.ts`, `eslint.config.mjs`, los `package.json`, el lockfile e `infra`, entre otros. Los 6 archivos protegidos coinciden con su SHA-256 de `aprobacion.md` | Sí |
| V-06 | 8 rutas nuevas exactas; `RUTAS_PUBLICAS` en 10 | `sesiones-y-cadena.ataque`, que compara la lista exacta de rutas, está en verde en la corrida 2. `middleware/` no cambió contra `<Ca>` | Sí |
| PA-07 | 2 `P2028`, los aceptados, en las corridas limpias | Corrida 2: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2, en `adapters/db/sesiones.ts:39` y `adapters/db/tokens-cuenta.ts:116` (los aceptados) | Sí, en la corrida limpia |
| PA-11 | solo los contenedores de `infra/` | `docker ps -a` a las 18:41:09, 3.5 min después de la corrida 2: solo los 4 contenedores de `infra/` | Sí |

**Corrida 1** (`cd backend; npm run test`): `Test Files 10 failed | 91 passed (101)` · `Tests 12 failed | 1059 passed | 40 skipped (1111)`, 81.07 s.
- Es la espera en cadena de CHORE-02, con su firma de siempre: 13 casos por tiempo límite en `cuentas-r1` (el del `LOCK TABLE`), `cuentas-r3`, `bloqueo-usuario` A1, `restablecer`, `worker-r1`, `worker-correo-de-cuenta`, `auth-login.ataque`, `enlaces-03b-r1`, `invitacion-masiva-03c-r2` y PR-A15h.
- La única aserción que falló (`auth-login.ataque`, `expected 401 to be 429`) es de rebote: viene después de dos casos del mismo archivo que cayeron por tiempo límite y dejaron la ventana de límite a medias.
- No falló ningún caso de b.

## PA-07 en las corridas con rojos: es CHORE-02, no b
- **Corrida 1:** los 4 `P2028` están en los dos sitios aceptados (`sesiones.ts:39` y `tokens-cuenta.ts:116`), repetidos por la espera en cadena. Los dos extra que reportó el programador (`usuarios.ts:85` y `tokens-cuenta.ts:116`, de 34 y 37 s) también son de AUTH. Ninguno viene de un caso de b.
- **Corrida 2, según el JSON:** el caso "con la tabla usuarios bloqueada…" de `cuentas-r1` tardó 223 ms, y el de la fila retenida de `cuentas-r3`, 7.1 s; todo pasó. PR-B16f (40 transacciones concurrentes) tardó 1.1 s, y PR-B05, 1.75 s.
- **¿b alarga la retención de `usuarios`?**
  - **La limpieza nueva no.** `borrarMovimientosYClasesDePrueba` son dos `deleteMany` cortos, fuera de cualquier transacción larga.
  - **PR-B16f no.** Solo toma bloqueos de llave foránea (`FOR KEY SHARE` sobre filas de usuarios de prueba), en transacciones de milisegundos.
  - **PR-B05 sí.** Retiene `usuarios` mientras dura su transacción (1 a 2 s): inserta 20,000 filas y corre `ANALYZE`, con `RowExclusiveLock` y `ShareUpdateExclusiveLock`. El `LOCK TABLE … ACCESS EXCLUSIVE` de `cuentas-r1` tiene que esperarla, y todo lo demás se forma detrás. No forma el ciclo, porque PR-B05 no espera a nadie, pero alarga la ventana en que la cola se forma. Por eso pido D-1.
- **Conclusión:** los rojos y los `P2028` extra son la intermitencia preexistente de CHORE-02. b no la causa, aunque PR-B05 le suma hasta unos 2 s de espera.

## Reglas de fondo de b (comprobadas en el código)
- **Estado de pago y correo (RN-02, M-01):**
  - `listarAlumnosDeClase` es la única función que selecciona `estadoPago`, `accesoRestringido` y el correo completo, y solo `listaAlumnosRespuestaSchema` los serializa, en `GET …/alumnos` con `requireOwnership`;
  - `personasRespuestaSchema` solo lleva `{ id, nombre }`;
  - `candidatoSchema` lleva `{ id, nombre, correoEnmascarado, yaInscrito }`, sin el correo completo, y el handler descarta `email` al desestructurar;
  - `agregarAlumnoRespuestaSchema` lleva `{ alumno: { id, nombre }, yaEstaba }`;
  - lo cubren PR-B02e, PR-B04g, PR-B04h, PR-B06e y PR-B08i.
- **Enmascarado (S-22):** `enmascararCorreo` deja `min(2, n − 1)` caracteres de la parte local: con 3 o más, 2; con 2, 1; con 1, ninguno. Separa en la última `@`, cuenta puntos de código completos y no lanza.
- **`movimientos_inscripcion` (M-03, N-11, N-12):**
  - `agregarAlumnoManual` y `quitarAlumno` van en `enTransaccion`, y el `create` del movimiento es el último paso, solo si `count === 1`;
  - `inscribir` (unirse con código) no cambió;
  - la tabla tiene `ON DELETE RESTRICT`, no tiene índices secundarios, y ninguna función exportada la lee (PR-B16h);
  - PR-B16f corre 5 rondas de 8 en orden aleatorio y compara `secuencia` como `bigint`, con `orderBy: { secuencia: "asc" }`.
- **Paginación (§D-B3 bis, O-01):** el cursor se lee de `usuarios` por PK y da 400 solo si el usuario no existe. El conjunto de claves es `(nombre_busqueda, usuario_id)`, con `orderBy` por la relación. PR-B02d, PR-B02f, PR-B03d y PR-B03e pasan.
- **Limpieza (N-10):** en los tres archivos de integración de b, `afterAll` borra primero los movimientos, después las clases y al final los usuarios, con el comentario que explica el orden.
- **Lo heredado de a (§D-B4 bis):**
  - `errorDelCampoCodigo` deja en el campo solo `CODIGO_INVALIDO` y un `VALIDACION` de `codigo`; todo lo demás va con toast;
  - "Nueva clase" y "Crear clase" están en `data.ts`;
  - PR-B17 existe.
- **M-06:** b no pone texto sobre vidrio azul, y el bloque destacado no cambió.
- **`DESIGN.md`:**
  - las secciones tocadas son §7.2 (excepción de la lista de compañeros), §7.8 (insignias), §7.17 (nueva) y §8 (roster opaco dentro de un panel de vidrio, sin `data-material`), todas marcadas "propuesta";
  - coinciden con el código: `table.tsx` ya pinta su propio `bg-surface`, y las listas usan divisores de `--border`.
- **Lección de AUTH-03 (PA-16):**
  - los 5 archivos de pruebas existentes se editaron en su lugar, y su `numstat` es aditivo;
  - las únicas líneas quitadas son 3 imports de `@testing-library/react` ampliados, el import de `./lib` y el tipo de `unirse` en el doble;
  - no se borró ningún caso;
  - no queda ninguna prueba temporal en `backend/test`, y `git diff --name-status` no muestra borrados de archivos rastreados.

## Arbitraje de las 9 desviaciones
1. **PR-B01b (`"  a  b "`): aceptada; el error es del ejemplo de la viñeta.** §D-B3 y S-11 miden la longitud ya normalizada, y `"a b"` mide 3, así que pasa. El caso prueba la regla con entradas que sí quedan cortas y deja documentado el ejemplo. Falta decidir si "3 letras" debe excluir los espacios: lo resuelve la enmienda (D-2).
2. **PR-B05 (siembra de 20,000 filas y `ANALYZE` en una transacción que se revierte): aceptada, con la condición D-1.**
   - **No hay una alternativa más barata:**
     - GIN solo hace *bitmap scans*, así que `enable_bitmapscan = off` apagaría justo el índice que se quiere ver;
     - `enable_indexscan = off` no impide un *bitmap* sobre `usuarios_rol_idx`;
     - con la tabla casi vacía, el planificador prefiere `usuarios_rol_idx`.
   - **Sembrar dentro de la transacción es determinista** y no deja datos.
   - **El costo:** en mi corrida tardó 1.75 s (el programador midió 0.9 s). Además corre en una transacción interactiva de Prisma con el límite por defecto de 5 s, mientras retiene `usuarios`. Con el equipo cargado puede pasar de 5 s y dar un `P2028` atribuible a b, que activaría PA-07.
3. **Reutilizar `textoConteoAlumnos` de a: aceptada.** Es la misma función con los textos de §D-B6. "Sin alumnos" nunca se ve en `PersonasView`, porque el contador solo aparece cuando hay alumnos.
4. **No agregar `/maestro/clases/:claseId/personas`: aceptada.**
   - "Suma las dos rutas" se cumple: personas para el estudiante y alumnos para el maestro (§D-A5).
   - "También la puede abrir el maestro por URL" describe lo que permite el backend (`requireMembership`).
   - El maestro tiene "Alumnos", que muestra lo mismo y más.
   - Solo falta corregir el comentario de `personas-view.tsx`, que dice que el maestro la abre "por URL" aunque esa ruta no exista (D-3).
5. **Invalidar además `["clases", claseId, "personas"]`: aceptada.** Es correcta y no cuesta nada.
6. **El texto del roster vacío entero como `titulo`: aceptada.** Es el texto exacto del plan, y `EstadoVacio` no exige descripción.
7. **"Agregar alumnos" y "No encontramos a ese alumno.": aceptada.** Los dos están en `data.ts` (`TEXTOS_BUSCADOR_ALUMNOS.titulo` y `MENSAJES_ERROR_CLASES_GENERALES.alumnoNoEncontrado`) y siguen el tono de §9: concretos y sin culpar a nadie. Se agregan a §D-B6 en la enmienda de cierre (D-2).
8. **El tipo de `unirse` en el doble de `inicio-estudiante-view.test.tsx`: aceptada.** Es una ampliación (`() => Response | Promise<Response>`) que necesita el caso "sin conexión" de PR-B17, y no cambia el comportamiento de ningún caso existente.
9. **`handlers/clases/alumnos.ts` sin el literal `estadoPago`: aceptada.**
   - V-04 fija un tope ("solo en…"), no una obligación.
   - RN-02 se cumple por construcción: el campo solo existe en `alumnoDeClaseSchema`, y solo `GET …/alumnos` usa ese esquema.
   - PR-B08i y los recorridos recursivos lo comprueban.

**"Se unió" con `formatearFechaHora`**, que el programador declaró como su 7.ª desviación: también aceptada. Es una función que ya existía, y no toca `lib/format.ts`.

## Lo que queda para después
- **D-1, con la corrección de la ronda 1 del tester (no bloquea el ataque).**
  - **Tiempo límite explícito:** PR-B05 debe pasar uno a su `$transaction` (por ejemplo, `{ timeout: 20_000 }`), para que una corrida cargada no dé un `P2028` atribuible a b.
  - **Siembra mínima:** debe sembrar solo lo necesario para que el planificador elija el GIN. Que mida con menos filas (por ejemplo, 5,000) y deje en el comentario la cifra y su porqué.
  - **Si el tester ve un `P2028` en PR-B05** antes de esa corrección, es este punto conocido, no un hallazgo nuevo.
- **D-2, enmienda de cierre de b (arquitecto):**
  - corregir el ejemplo de PR-B01b;
  - decidir si el mínimo de 3 excluye los espacios. Hoy `"a b"` se busca como `LIKE '%a b%'`: es inofensivo, pero no son "3 letras";
  - agregar a §D-B6 "Agregar alumnos" y "No encontramos a ese alumno.".
- **D-3, detalle para la próxima entrega del programador:** el comentario de `personas-view.tsx` ("por URL, el maestro dueño") no corresponde a ninguna ruta del frontend.

## Para la ronda 1 del tester
1. **Intermitencia conocida (CHORE-02).**
   - Si caen por tiempo límite casos de AUTH y, detrás de ellos, PR-A15h o un `afterAll` de CLASES, repite la corrida.
   - Un `P2028` en PR-B05 con el equipo cargado es D-1.
   - Sí es hallazgo un rojo por aserción de lógica en b, o un tiempo límite que se repite en el mismo caso de b con el `LOCK TABLE` en verde.
2. **Los puntos de ataque de b del plan, completos:**
   - **Estado de pago y restricción** en cualquier respuesta, incluso anidados.
   - **Correo enmascarado:**
     - partes locales de 1, 2, 3 y 64 caracteres;
     - `+`, puntos, mayúsculas, Unicode, emojis y subdominios;
     - que no se pueda revertir combinando búsquedas;
     - el roster propio frente al de otra clase.
   - **`movimientos_inscripcion`:**
     - altas y bajas simultáneas, repetidas y cruzadas;
     - que la `secuencia` coincida con el estado final y que `creado_en` no se use para ordenar;
     - que no registren nada unirse con código, un alta repetida ni una baja de quien no estaba;
     - que una transacción fallida no deje nada;
     - que ninguna ruta, error o log exponga la tabla.
   - **Buscador:** comodines, `\`, términos que se acortan al normalizar, 120 caracteres, emojis y `limite` fuera de rango.
   - **Paginación:** homónimos en el borde de la página, y el cursor de un alumno quitado o desactivado, de otra clase o inexistente.
   - **Interfaz:** una sola petición por término, sin carreras; el foco en la confirmación; el nombre accesible de cada fila.
3. **El mínimo de 3, en el frontend y en el backend.** `terminoDeBusquedaValido` reimplementa la normalización, pero sin `toLowerCase`. Busca términos que el frontend dé por válidos y el backend rechace con `400 BUSQUEDA_MUY_CORTA`, o al revés: caracteres que cambian de longitud al pasar a minúsculas, separadores Unicode que `\s` no junta igual y marcas combinantes sueltas.
4. **Términos de 3 con espacios** (`"a b"`, `"a  b"`): ni resultados absurdos ni 500, y la consulta sigue usando un índice (D-2).
5. **Quitar y agregar en carrera desde la interfaz:**
   - quitar a un alumno mientras su fila del buscador todavía dice "Agregar a la clase";
   - agregar a uno que otra pestaña acaba de quitar.

   En ningún caso debe quedar un estado incoherente sin refrescar.
6. **Accesibilidad del roster:**
   - qué lee un lector de pantalla cuando la columna "Acceso" muestra "—";
   - adónde va el foco después de "Sí, quitar", cuando la fila desaparece;
   - a 360 px, la tabla se desplaza en horizontal dentro del panel, no la página.
7. **N-04:** `ACCESO_RESTRINGIDO` al unirse sigue redirigiendo (`apiClient`), sin un toast duplicado y sin marcar el campo.
8. **Regresión de a:**
   - `inscritas` e `impartidas` (T-18);
   - la guarda con las rutas nuevas de b (`:alumnoId` bajo `/clases/:claseId/alumnos`);
   - la lista exacta de rutas.

---

# Verificación del resumen — CLASES-b — corrección ronda 1
**Veredicto: resumen aceptado. El tester puede atacar (ronda 2).** Las cifras coinciden con mi corrida. T-20, T-21, D-1, D-3, D-4 y C-17 quedaron cerrados en el código, y en C-17 el diff del tester es exacto. Quedan dos observaciones que no bloquean, abajo.

Fecha: 2026-09-30. PA-01 comprobada antes del backend: regla habilitada, Inbound, Block, Public; red `IZZI-F281-5G`, en perfil Público y de confianza.

## Arbitrajes de esta ronda (registro)
- **T-21: opción A.** Al confirmar una acción que borra la fila, el foco va al mismo control de la fila que ocupa su lugar: la siguiente, o la anterior si era la última.
  - Si no queda fila, o no queda control al cual saltar, va al `h2` del panel (`tabIndex={-1}`). Nunca a `<body>`.
  - Se mueve cuando la fila ya desapareció de los datos, sin depender de cuándo llegue la consulta nueva, y debe funcionar con varias páginas cargadas.
  - Va en `DESIGN.md` §7.14 como propuesta.
- **D-4:** si la respuesta trae `yaEstaba: true`, el aviso es neutro: `toast("<nombre> ya estaba en la clase")`, con el texto en `data.ts` y un caso normal. Antes decía "Agregaste a…", que era falso. El texto entra en §D-B6 en la enmienda de cierre de b.
- **C-17: opción A.** D-4 se queda, y el tester hace invocable el doble de `sonner` de `alumnos-b-r1.ataque.test.tsx`, con las mismas referencias en `success` y `error`. Ninguna aserción cambia. Las opciones descartadas:
  - `toast.success` o `toast.error`, porque el aviso diría algo falso;
  - `toast.info`, porque choca igual con el doble.
- **Observación 1 del tester** (un maestro puede ver el correo y el estado de pago de cualquier alumno si lo agrega y lo quita): **no se escala.** Es la consecuencia que el humano aceptó en P-05 (a), (f) y (g), con la auditoría en `movimientos_inscripcion`, que el tester confirmó que funciona. Sugerencia para ADMIN, anotada en `docs/ESTADO.md`: que la consulta de movimientos deje ver un alta seguida de una baja del mismo alumno en poco tiempo.

## Cifras: resumen contra mi corrida
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | `> tsc -b`, código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | `✓ built in 648ms`, código 0 | `✓ built in 689ms`, código 0 | Sí (solo cambia el tiempo) |
| Backend | `1137 passed (1137)` en 102 archivos; la primera corrida cayó por los tiempos límite de AUTH | Corrida 1: cayó por la espera en cadena de CHORE-02 (detalle abajo).<br>Corrida 2 (`npx vitest run`, con JSON): `Test Files 102 passed (102)` · `Tests 1137 passed (1137)` | Sí, en la corrida 2 |
| Frontend | `1143 passed (1143)` en 82 archivos, con código 1 por el conflicto de D-4 (ya resuelto con C-17) | `Test Files 82 passed (82)` · `Tests 1143 passed (1143)`, código 0, sin ningún `Unhandled Rejection` | Sí |
| `vitest list` | backend 1137 en 102; frontend 1143 en 82 | 1137 en 102; 1143 en 82 | Sí |
| Pruebas nuevas | T-20 (integración y `core`), PR-B11c2 y D-4 | Las 4 aparecen en las listas, con esos títulos | Sí |
| V-01 | 81 | Tabla: la ronda 0 de b, más `alumnos-b-r1` del backend (`485D39EF…`) y la del frontend con el hash de C-17 (`C3692E9E…`). Comparada por programa: **81/81 iguales**, y el conjunto de archivos es exacto | Sí |
| C-17 | — | Apliqué al revés el diff de `reporte-tester.md` sobre una copia: da exactamente el hash anterior (`755019C7…`). Son una línea (`vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), aviso) }))`) y dos de comentario. `aviso` sigue siendo el mismo objeto de `vi.hoisted`, y no cambia ninguna aserción | — |
| V-04 | sin cambios | `enEspera=` 29; `vidrio-azul` solo en `bloque-destacado.tsx`; `data-material` solo en `contenedor-rol.tsx`; `movimientoInscripcion` solo en los dos `.create(`; `fetch(` solo en `apiClient.ts` | Sí |
| V-05 | solo archivos de b | Los cambios de esta corrección (`shared/src/clases.ts`, las dos pruebas del backend, 5 archivos de `features/clases` y `DESIGN.md`) están todos en las listas de b. `middleware/`, `features/auth/`, `services/`, `components/ui`, `components/layout`, `styles/` y `eslint.config.mjs`, sin cambios contra `<Ca>` | Sí |
| V-06 | sin cambios | `sesiones-y-cadena.ataque` en verde | Sí |
| PA-07 | 2 `P2028` aceptados en las corridas limpias | Corrida 2: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2, en `sesiones.ts:39` y `tokens-cuenta.ts:116` (los aceptados). Corrida 1: 4, en esos mismos dos sitios | Sí, en la corrida limpia |
| PA-11 | solo `infra/` | `docker ps -a` más de 120 s después de la corrida 2: solo los 4 contenedores de `infra/` | Sí |

**La corrida 1 del backend** dio `10 failed | 92 passed (102)` · `11 failed | 1097 passed | 29 skipped (1137)`. Tiene la firma de siempre:
- La fila retenida de `cuentas-r3` llegó a 40 s, y el `LOCK TABLE` de `cuentas-r1` cayó a los 15 s.
- Detrás cayeron, por tiempo límite, `auth-login`, `bloqueo-usuario` A1, `restablecer`, `worker-correo-de-cuenta` y PR-A15h, más los hooks de `invitacion-masiva-03c-r2`, `clases-autorizacion`, `alumnos-b-r1` y `api-real`.
- La única aserción que falló (`auth-login`, `expected 401 to be 429`) es de rebote, igual que en la verificación anterior.
- No falló ningún caso de b por aserción. El `afterAll` de `alumnos-b-r1` cayó por tiempo límite al borrar usuarios, y es colateral.
- PR-B05 corrió a los 7.6 s y tardó 1.7 s, antes del `LOCK TABLE` (19.3 s). No coincidió con la cadena.

## Estado de cada punto (comprobado en el código)
| # | Estado | Qué vi |
|---|---|---|
| T-20 | **Cerrado** | `busquedaCandidatosSchema.q` mide la longitud normalizada en puntos de código:<br>• más de 120 normalizados, o más de 1000 sin normalizar → 400 `VALIDACION`;<br>• `max(crudo, normalizado) < 3` → 400 `VALIDACION`;<br>• `"  ab  "` sigue llegando a `core/` y responde `400 BUSQUEDA_MUY_CORTA` (PR-B04e en verde).<br>La normalización de `shared` es la misma expresión que `normalizarParaBusqueda` de `core/auth`. La del frontend (`terminoDeBusquedaValido`) omite `toLowerCase`, pero no cambia la cuenta: después de NFD y de quitar las marcas, `toLowerCase` no expande ningún carácter (el único que expande, U+0130, ya se descompuso). El criterio es equivalente en las tres. La prueba normal cubre el hangul (`각`, `가나`), `"abc"` más 118 espacios, 121 caracteres y `"ab"` |
| T-21 | **Cerrado** | `TablaAlumnos` guarda `{ id, indice }` de la fila quitada (`onQuitado` en el `onSuccess` de la fila). Un efecto sobre `filas`, la lista aplanada de todas las páginas, enfoca el "Quitar" de `filas[min(indice, filas.length − 1)]` cuando el id ya no está, o el `h2` (`tabIndex={-1}`) si no queda fila o botón. No depende del tiempo de la consulta.<br>`DESIGN.md` §7.14 trae el patrón "Foco al confirmar una acción que borra la fila (CLASES-b, propuesta; T-21)" con mi criterio al pie de la letra.<br>PR-B11c2 cubre la fila del medio, la última y la única, y comprueba que el foco no queda en `<body>`. No hay `aria-invalid` en la tabla. El caso de varias páginas no tiene caso normal; va a la ronda 2 |
| D-1 | **Cerrado** | `$transaction(…, { timeout: 15000, maxWait: 15000 })`. Siembra de 18,000 filas, medida: con 16,000 el planificador elige `usuarios_rol_idx` y con 17,000, el GIN. El `EXPLAIN` sigue siendo el de la forma real de la consulta de Prisma, y el índice es el real (por eso no se usa una tabla temporal).<br>**Tiempo:** 510 a 564 ms aislado según el programador, y **1.7 a 1.8 s en mi suite completa** (las dos corridas). Retiene `usuarios` lo mismo que antes, pero ya no puede dar un `P2028` antes de 15 s. Lo acepto así: el costo se debe a la siembra mínima medida, no a un descuido |
| D-3 | **Cerrado** | El comentario de `personas-view.tsx` dice que el backend deja pasar al dueño, pero que el router no le da ruta propia |
| D-4 | **Cerrado** | Con `yaEstaba`, `toast(TEXTOS_BUSCADOR_ALUMNOS.yaEstaba(nombre))`; texto en `data.ts`. El caso "D-4: agregar con yaEstaba: true avisa con un toast neutro, sin éxito ni error" afirma la llamada neutra, sin `success` ni `error`. El doble de `sonner` de `alumnos-view.test.tsx` (archivo de b) pasó a ser invocable |
| C-17 | **Correcto** | Ver la tabla de cifras: diff exacto, mismas referencias y ninguna aserción tocada |

## Observaciones que no bloquean (para la ronda 2 o el cierre de b)
- **T-21 cuando la consulta nueva falla.** Si quitar sale bien pero la nueva consulta del roster falla, `isError` reemplaza toda la tabla por `MensajeError`. TanStack Query v5 conserva los datos, pero `contenido()` evalúa primero `isError`, así que el foco cae en `<body>`. Además, si la fila ya había desaparecido antes del `onSuccess` (otra pestaña la quitó), `handleQuitado` no la encuentra y no mueve el foco. Son casos de borde: el tester los ataca, y si son reales se corrigen como un hallazgo bajo.
- **La normalización está en tres lugares:** `shared` (validación), `core/auth` (escritura y búsqueda) y el frontend. Hoy son equivalentes. Para la enmienda de cierre de b: que `core/` use la de `shared/`, como única fuente, en un `chore` o en la siguiente subentrega que la toque.

## Para la ronda 2 del tester
1. **Intermitencia conocida (CHORE-02):** si cae, repite la corrida. Es hallazgo un rojo por aserción en b, o un tiempo límite repetido en el mismo caso de b con el `LOCK TABLE` en verde.
2. **Regresión:**
   - T-20 y T-21 de la ronda 1 en verde, por la razón correcta;
   - C-17: el caso de la línea 250 sigue protegiendo el roster y el buscador al día tras la carrera entre pestañas;
   - las demás `*.ataque` de b.
3. **T-21 con varias páginas:**
   - quitar en la página 2 después de "Ver más alumnos";
   - quitar la última fila de una página;
   - quitar con una sola fila en total;
   - que la consulta nueva falle después de quitar (observación de arriba);
   - que otra pestaña quite la misma fila antes del `onSuccess`;
   - que el foco nunca quede en `<body>` ni en un botón que ya no existe.
4. **D-4:** el aviso neutro solo aparece con `yaEstaba: true`. No aparece duplicado con un doble clic, y "Agregaste a…" no aparece cuando no se agregó a nadie.
5. **T-20 con otros alfabetos y formas:**
   - japonés, chino y árabe (no se descomponen), devanagari y tailandés (con marcas combinantes, que la normalización quita);
   - `"İ"`, ligaduras y separadores Unicode que `\s` junta o no junta;
   - el borde de 120 y 121 normalizados;
   - un texto crudo de 1000 y de 1001;
   - que el frontend y el backend coincidan en cada caso.
6. **Lo que falte de los puntos de ataque de b del plan,** si la ronda 1 no lo cubrió completo: concurrencia de movimientos, enmascarado con partes locales de 64 caracteres, y cursores de otra clase o inexistentes.

---

# Verificación del resumen — CLASES-b — corrección ronda 2
**Veredicto: RESUMEN DEVUELTO AL PROGRAMADOR.**
- **Lo que está bien:** T-22, T-23 y T-24 quedaron bien resueltos en el código, y las cifras de lint, build, `vitest list`, V-01, V-04, V-05 y V-06 coinciden con las mías.
- **Por qué lo devuelvo:** **PR-B05 es intermitente (PA-12).**
  - En una de mis tres corridas completas del backend falló por aserción, sin tiempos límite: el plan no mencionó `usuarios_nombre_busqueda_idx`.
  - El resumen dice "1141/1141, limpio" y no reporta la intermitencia, porque el umbral de la siembra se midió con el archivo aislado y no en la suite completa.
  - La reducción de 20,000 a 18,000 filas viene de D-1, que pedí yo. El margen que quedó (umbral entre 16,000 y 17,000 medido aislado) no alcanza con la suite completa.
- **Arreglo:** es corto, en un solo archivo de b. Después, el tester ataca la ronda 3.

Fecha: 2026-09-30. PA-01 comprobada antes del backend: regla habilitada, Inbound, Block, Public; red `IZZI-F281-5G` en perfil Público, de confianza.

## Cifras: resumen contra mi corrida
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | `> tsc -b`, código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | `✓ built in 689ms`, código 0 | `✓ built in 737ms`, código 0 | Sí (solo cambia el tiempo) |
| Backend | `1141 passed (1141)` en 103 archivos, en la corrida limpia | **Corrida 1:** cayó por la espera en cadena de CHORE-02.<br>**Corrida 2** (`npx vitest run`, con JSON): `Test Files 1 failed \| 102 passed (103)` · `Tests 1 failed \| 1140 passed (1141)`. **Falla PR-B05 por aserción**: `expected '[{"QUERY PLAN":…' to contain 'usuarios_nombre_busqueda_idx'`, en 2.3 s, sin ningún tiempo límite en la corrida.<br>**Corrida 3:** `Test Files 103 passed (103)` · `Tests 1141 passed (1141)`; PR-B05 en verde, en 2.8 s | **No:** PR-B05 es intermitente (M-07, abajo) |
| Frontend | `1157 passed (1157)` en 83 archivos | `Test Files 83 passed (83)` · `Tests 1157 passed (1157)`, código 0 | Sí |
| `vitest list` | backend 1141 en 103; frontend 1157 en 83 | 1141 en 103; 1157 en 83 | Sí |
| V-01 | 83 | Tabla vigente: la de la corrección 1 (81), más las dos `alumnos-b-r2` de la ronda 2 (`ADF927DF…` y `55DC274E…`). **83/83 iguales**, conjunto exacto | Sí |
| V-04, V-05, V-06 | sin cambios | `enEspera=` 29. Sin cambios contra `<Ca>` en `core/auth`, `middleware/`, `features/auth/`, `services/`, `components/ui` ni `eslint.config.mjs`. `sesiones-y-cadena` en verde | Sí |
| PA-07 | 2 `P2028` aceptados | Corridas 2 y 3: `P2028` 2, en `sesiones.ts:39` y `tokens-cuenta.ts:116` (los aceptados); los demás términos, 0. Corrida 1: 4, en los mismos sitios | Sí, en las corridas sin la cadena |
| PA-11 | solo `infra/` | Solo los 4 contenedores de `infra/` después de las corridas | Sí |

**Corrida 1** (`Test Files 8 failed | 95 passed (103)` · `Tests 7 failed | 1107 passed | 27 skipped (1141)`): la firma de siempre. Caen por tiempo límite `cuentas-r3` (40 s), `cuentas-r1`, `bloqueo-usuario` A1 y PR-A15g/h, más los hooks de `alumnos-b-r1`, `worker-correo-de-cuenta` y `api-real`. La única aserción (`worker-r2`, `expected 2 to be greater than or equal to 3`) es una espera con tiempo límite que se agotó, igual que la de `worker-r1` de las verificaciones anteriores. Ningún caso de b falló por aserción en esa corrida.

## Lo que vuelve al programador
### M-07 — PR-B05 es intermitente (PA-12)
Dónde: `backend/test/alumnos.integracion.test.ts`, PR-B05 (siembra de 18,000 filas, `ANALYZE` y `EXPLAIN` en una transacción revertida).

Por qué importa:
- PA-12 detiene la entrega ante cualquier prueba propia intermitente.
- La ronda 3 es la última del tester: una prueba que falla una de cada pocas corridas de la suite completa convierte cada corrida en una lotería, y cualquier rojo se escalaría.
- El umbral "entre 16,000 y 17,000 filas" se midió con el archivo aislado. En la suite completa, la tabla `usuarios` tiene las filas confirmadas de los demás archivos y la estadística que produce `ANALYZE` cambia, así que el plan elegido también cambia. 18,000 no deja margen.

Qué se espera:
1. **Diagnóstico:** que la aserción imprima el plan cuando falla (el nodo elegido, no solo `contain`), para saber qué alternativa gana. Puede ser el *bitmap* de `usuarios_rol_idx` o un recorrido ordenado por un índice B-tree, que con `ORDER BY … LIMIT` le resulta atractivo al planificador.
2. **Un caso determinista**, por cualquiera de estas dos vías, o las dos juntas:
   - un margen amplio y justificado en la siembra, medido **en la suite completa**;
   - además de `enable_seqscan = off`, apagar en esa misma transacción la alternativa que gana, sin apagar el *bitmap scan* (el GIN solo hace *bitmap scans*). Por ejemplo, `SET LOCAL enable_indexscan = off` si el que gana es un recorrido ordenado por índice. La consulta, la forma de Prisma y el índice que se demuestra no cambian.

   Si la vía elegida es la de `SET LOCAL`, el comentario explica por qué esa alternativa no es el objeto de R-20.
3. **Evidencia:** al menos **5 corridas completas** de la suite del backend con PR-B05 en verde (las que caigan solo por la cadena de CHORE-02 se repiten y se cuentan aparte), con la duración de PR-B05 en cada una. El tiempo límite de 15 s se queda.

### D-7 — Una afirmación inexacta del resumen
El resumen dice que el SHA-256 de `alumnos-b-r1.ataque.test.tsx` "lo cambió el tester en la ronda 2 (su doble de `sonner` ya trae `neutro`)". En realidad lo cambió el tester en **C-17, durante la corrección de la ronda 1** (`Object.assign(vi.fn(), aviso)`), y el doble no trae ningún `neutro`. Hay que corregir la frase. Es la tercera vez en este encargo que el resumen describe mal algo ajeno (D-5, D-6): lo anoto para la medición.

### D-8 — Una constante duplicada (va en la misma vuelta)
- `features/clases/data.ts` conserva `MAXIMO_CARACTERES_BUSQUEDA = 120` para el `maxLength` del campo, aparte de `LONGITUD_MAXIMA_BUSQUEDA` de `shared/`. Con T-24 la idea es una sola definición, así que el campo debe usar la de `shared/`.
- **Además, un comentario:** `maxLength` del navegador cuenta unidades de UTF-16, no puntos de código normalizados. Por eso el campo puede cortar antes (60 emojis) o después (41 sílabas hangul) que el criterio del servidor. Lo segundo ya lo resuelve el aviso de longitud. Lo primero es aceptable, pero debe quedar explicado.

## Estado de T-22, T-23 y T-24 (comprobado en el código)
| # | Estado | Qué vi |
|---|---|---|
| T-22 | **Cerrado** | `TablaAlumnos` ya no usa `onSuccess`, `onQuitado` ni la lista capturada.<br>• **Qué fila tiene el foco:** `focusin` (en el documento) lo marca con `closest("[data-alumno-id]")`, un atributo que solo llevan las filas del roster (`TableRow`), así que no captura controles ajenos. Un `focusin` fuera de las filas lo borra. `focusout` sin destino también lo borra, si el control sigue conectado.<br>• **Después de cada render:** si el elemento activo es `<body>`, nulo o está desconectado, el foco va al "Quitar" de `ids[min(índice del render anterior, n − 1)]` o, si no hay ninguno (tabla reemplazada por el error o el vacío, o lista vacía), al `h2` (`tabIndex={-1}`, nombre "Alumnos").<br>• **Cobertura:** el caso de la consulta que falla está cubierto. PR-B11c2, el caso T-21 del tester y los casos nuevos (T-22 y T-23 en `alumnos-view.test.tsx`) están en verde.<br>• **Coherencia:** el criterio coincide con §7.14, y §7.14 describe el mecanismo nuevo (marcado "propuesta") |
| T-23 | **Cerrado** | Mismo mecanismo: no depende de que llegue el `onSuccess`. El índice sale de la lista del render anterior. Es menor: si el id no estaba en la lista anterior, `indexOf` da −1 y el foco va a la primera fila, en lugar de al `??` siguiente, que nunca se evalúa. No es incorrecto, y el foco nunca queda en `<body>` |
| T-24 | **Cerrado** (salvo D-8) | **Una sola definición:** `normalizarTerminoDeBusqueda`, `LONGITUD_MINIMA_BUSQUEDA`, `LONGITUD_MAXIMA_BUSQUEDA`, `LONGITUD_MAXIMA_BUSQUEDA_CRUDA` y `estadoDeTerminoDeBusqueda`, en `shared/src/clases.ts`.<br>• **Quién la usa:** el esquema usa las mismas constantes y la misma normalización, porque necesita distinguir `VALIDACION` de `BUSQUEDA_MUY_CORTA`. `core/clases/busqueda.ts` las importa de `shared` y su copia desapareció. El frontend (`terminoDeBusquedaValido` y `terminoDeBusquedaMuyLargo`) usa `estadoDeTerminoDeBusqueda`, y su copia también desapareció.<br>• **`core/auth/normalizacion.ts`:** intacto (sin diff contra `<Ca>`). La prueba de equivalencia con 7 muestras (acentos, espacios, hangul, emoji y dígrafos) está en `busqueda.test.ts`.<br>• **Interfaz:** con un término muy largo, el campo lleva `aria-invalid`, `aria-describedby` con la ayuda y el error, y `ErrorDeCampo` "La búsqueda no puede tener más de 120 caracteres" (texto en `data.ts`); no se hace la petición. §7.17 lo documenta |

## Para la ronda 3 del tester (la última), cuando vuelva el resumen aceptado
1. **Intermitencia conocida (CHORE-02):** si cae, se repite la corrida. Es hallazgo un rojo por aserción en b, **incluido PR-B05**, o un tiempo límite repetido en el mismo caso de b.
2. **Regresión completa:** las 83 `*.ataque` en verde, cada una por la razón correcta; en particular T-20 a T-24 y C-17.
3. **El foco con cualquier causa de desmontaje:**
   - quitar con varias páginas cargadas;
   - la consulta nueva falla, otra pestaña quita la fila, o el roster queda vacío;
   - la sesión expira a mitad de la acción (`apiClient` redirige);
   - cancelar la confirmación;
   - un `focusin` en el buscador o en "Ver más alumnos" mientras una fila tiene el foco;
   - dos tablas montadas, si es posible;
   - que nunca quede en `<body>`, que no robe el foco a un control que la persona eligió y que no haya movimientos de foco espurios en renders sin desmontaje.
4. **La normalización unificada:** frontera de 120 y 121 normalizados, y de 1000 y 1001 en crudo, en los tres lados; el `maxLength` del campo frente a los puntos de código (D-8); que el aviso de longitud y el de mínimo no aparezcan a la vez.
5. **Lo que no se atacó de b:** partes locales de 64 caracteres en el enmascarado; concurrencia de movimientos con altas y bajas cruzadas entre dos maestros, que no pueden (solo el dueño); y el cursor del roster de otra clase con homónimos.

---

# Verificación del resumen — CLASES-b — corrección ronda 2 (segunda pasada)
**Veredicto: resumen aceptado. El tester puede atacar en la ronda 3, la última.**
- **Cifras:** coinciden con mi corrida.
- **M-07 y D-8:** cerrados en el código.
- **D-7:** corregido en la sección nueva, pero la frase falsa original sigue en la línea 990 de `resumen-programador.md`. La corrección del documento queda pendiente para el cierre de b (D-7 bis); no afecta lo que ataca el tester.
- **PR-B05 con 40,000 filas:** lo acepto, con su costo anotado para CHORE-02.

Fecha: 2026-09-30. PA-01 comprobada antes del backend: regla habilitada, Inbound, Block, Public; red `IZZI-F281-5G` en perfil Público, de confianza.

## Cifras: resumen contra mi corrida
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | código 0 | `✓ built in 706ms`, código 0 | Sí |
| Backend | `1141 passed (1141)` en 103 archivos; PR-B05 en verde en 6 corridas (1.2 a 6.1 s); corridas 2 y 4 por tiempos límite de AUTH; en la 5, `enlaces-registro` (ya conocida) | Tres corridas seguidas con `npx vitest run` y JSON:<br>**Corrida 1:** `8 failed \| 95 passed (103)` · `11 failed \| 1130 passed (1141)`. Es la espera en cadena de CHORE-02: el `LOCK TABLE` de `cuentas-r1` cayó a los 15 s. Hay dos aserciones de `esperarHasta` agotadas (`worker-consumidor` y `worker-r2`), de la misma familia, y un `afterAll` de `alumnos.integracion` por tiempo límite, que es colateral. **PR-B05 en verde, 4.9 s.**<br>**Corrida 2:** `103 passed (103)` · `1141 passed (1141)`. **PR-B05 en verde, 5.5 s.**<br>**Corrida 3:** `103 passed (103)` · `1141 passed (1141)`. **PR-B05 en verde, 5.2 s.** | Sí, en las corridas 2 y 3. PR-B05 pasó por aserción en las tres |
| Frontend | `1157 passed (1157)` en 83 archivos | `Test Files 83 passed (83)` · `Tests 1157 passed (1157)`, código 0 | Sí |
| `vitest list` | backend 1141 en 103; frontend 1157 en 83 | 1141 y 1157 | Sí |
| V-01 | 83 sin cambios | 83/83 iguales a la tabla vigente, que es la de mi verificación anterior | Sí |
| V-04, V-05, V-06 | iguales | `enEspera=` 29. Sin cambios contra `<Ca>` en `middleware/`, `core/auth`, `features/auth/`, `services/`, `components/ui` ni `eslint.config.mjs`. Ningún archivo fuera de los paquetes y de `docs/`. `sesiones-y-cadena` en verde | Sí |
| PA-07 | 2 `P2028` aceptados en las limpias | Corridas 2 y 3: `P2028` 2, en `sesiones.ts:39` y `tokens-cuenta.ts:116`; los demás términos, 0. Corrida 1: 5, todos en esos mismos dos sitios | Sí, en las limpias |
| PA-11 | solo `infra/` | `docker ps -a` a las 20:48:09, más de 2 min después de la última corrida del backend: solo los 4 contenedores de `infra/` | Sí |

## M-07: PR-B05 con 40,000 filas (decisión)
**Qué cambió:**
- El plan que ganaba con 18,000 filas era `Limit → Sort → Bitmap Heap Scan → Bitmap Index Scan` sobre `usuarios_rol_idx`.
- Es otro *bitmap*, así que no hay un `SET LOCAL` que lo apague sin apagar también el GIN. Con `enable_indexscan = off` el umbral no cambió.
- Ahora la prueba siembra 40,000 filas, dos veces el umbral aislado de 16,000 a 20,000.
- La aserción imprime el plan elegido si falla, y el tiempo límite queda en 15 s.

**Alternativas que revisé:**
- `pg_restore_attribute_stats`, para fijar la estadística sin insertar filas, es de PostgreSQL 18. La imagen es `postgres:17.11`.
- `CREATE STATISTICS` trata correlaciones entre columnas; no cambia la selectividad de `rol`.
- Los parámetros de costo (`random_page_cost`, `seq_page_cost`) afectan igual a los dos *bitmaps*.

Lo que decide entre los dos índices es cuántos `estudiante` hay, y eso solo se cambia con filas.

**El costo:**
- PR-B05 tarda de 4.9 a 5.5 s en mi suite y retiene `usuarios` durante ese tiempo.
- Por los bloqueos que toma (`RowExclusiveLock` por las inserciones y `ShareUpdateExclusiveLock` por `ANALYZE`), el `LOCK TABLE … ACCESS EXCLUSIVE` de `cuentas-r1` tiene que esperar si coinciden.
- No forma el ciclo de la cadena, pero alarga su ventana.
- No veo un aumento medible de la intermitencia: en mis 3 corridas cayó 1, y en las 6 del programador, 2 por AUTH y 1 por `enlaces-registro`. La proporción de antes de b también era de 1 de cada 2 o 3.

**Decisión: lo acepto como está.**
- Ahora es determinista: pasó en 9 de 9 corridas completas, contando las suyas y las mías, incluida una con la cadena activa.
- Cualquier otra forma es más frágil o necesita PostgreSQL 18.

**Lo que se anota para CHORE-02, junto a la espera en cadena:**
- PR-B05 retiene `usuarios` unos 5 s.
- Candidatos a mitigarlo:
  - correrlo en el grupo secuencial que CHORE-02 arme para los archivos que retienen bloqueos;
  - sembrar con un `nombre_busqueda` constante y corto, que inserta casi nada en el GIN de trigramas y reduciría el tiempo. Hay que medirlo antes: puede mover la estimación de `LIKE`.
- No se cambia ahora, a una ronda del final, para no introducir otra variable.

## Estado de M-07, D-7 y D-8
| # | Estado | Qué vi |
|---|---|---|
| M-07 | **Cerrado** | Siembra de 40,000 filas en la transacción revertida, `{ timeout: 15000, maxWait: 15000 }` y `expect(…, "plan elegido: …")`. La consulta (forma de Prisma), el `enable_seqscan = off` y el índice que se demuestra son los mismos de antes. Verde en mis 3 corridas, de 4.9 a 5.5 s |
| D-7 | **Corregido a medias** | La sección nueva ("D-7 — frase corregida") cuenta lo que pasó: C-17, en la corrección de la ronda 1, sin ningún `neutro`. **Pero la frase original sigue en la línea 990** ("lo cambió el tester en la ronda 2 (su doble de `sonner` ya trae `neutro`)"). Es el mismo patrón de D-5 bis: corregir por un lado sin editar el original. **D-7 bis:** antes del cierre de b, esa línea dice lo correcto o remite a la sección D-7. No bloquea al tester, porque es solo documento. Lo anoto para la medición del programador |
| D-8 | **Cerrado** | `MAXIMO_CARACTERES_BUSQUEDA` ya no existe en el frontend. `maxLength={LONGITUD_MAXIMA_BUSQUEDA}` viene de `@campus/shared`, con el comentario de que cuenta unidades de UTF-16 y de que el tope real lo decide `estadoDeTerminoDeBusqueda` |

## Para la ronda 3 del tester (la última): confirmada, con un ajuste en el punto 1
1. **Intermitencia conocida (CHORE-02):** si cae, repite la corrida. Es hallazgo un rojo por aserción en b, **incluido PR-B05**, cuya aserción ahora imprime el plan; o un tiempo límite repetido en el mismo caso de b con el `LOCK TABLE` en verde. `enlaces-registro` ("pagina con cursor") y las esperas de los `worker-*` son ajenas y conocidas.
2. **Regresión completa:** las 83 `*.ataque` en verde, cada una por la razón correcta: T-20 a T-24, C-16 y C-17.
3. **El foco con cualquier causa de desmontaje:**
   - varias páginas cargadas;
   - la consulta nueva falla;
   - otra pestaña quita la fila;
   - el roster queda vacío;
   - la sesión expira a mitad de la acción;
   - se cancela la confirmación;
   - un `focusin` en el buscador o en "Ver más alumnos" mientras una fila tiene el foco.

   En todos: el foco nunca queda en `<body>`, no le roba el foco a un control que la persona eligió y no hay movimientos espurios en renders sin desmontaje.
4. **La normalización unificada:**
   - los bordes de 120 y 121 normalizados, y de 1000 y 1001 en crudo, en los tres lados;
   - el `maxLength` en unidades de UTF-16 frente al criterio del servidor;
   - que el aviso de longitud y el de mínimo no aparezcan a la vez.
5. **Lo que no se atacó de b:** partes locales de 64 caracteres en el enmascarado, y el cursor del roster de otra clase con homónimos.

---

# Revisión final — CLASES-b
Veredicto: **ESCALAR AL HUMANO** (las tres rondas del tester se agotaron y la tercera terminó en ROTO, con 2 hallazgos bajos que dejan 2 casos en rojo)
Verificación propia: lint código 0 (`> tsc -b`) · build código 0 (`✓ built in 721ms`) · test backend `104 passed (104)` · `1144 passed (1144)` (corrida 2) · test frontend `2 failed | 1165 passed (1167)` (solo T-25 y T-26)

Fecha: 2026-09-30. Rama `feat/clases`, base `<Ca>` = `855069b` dentro de los paquetes y `<R>` fuera de ellos. PA-01 comprobada antes del backend: regla habilitada, Inbound, Block, Public; red `IZZI-F281-5G`, en el perfil Público y de confianza.

**Recomendación (detalle en "Para el humano"):** autorizar una **cuarta ronda corta y cerrada**, como la de a. Corrige T-25 y T-26 solo en archivos de b (`buscador-alumnos.tsx`, `tabla-alumnos.tsx` y `personas-view.tsx`) y extiende §7.14 con el criterio de "un control que desaparece por su propia acción". El mismo patrón en `panel-mis-clases.tsx` (de a) pasa a CLASES-c, y el de admin, a un `chore` o a ADMIN.

## Corridas
| Qué | Resultado |
|---|---|
| `npm run lint` (raíz) | código 0, `> tsc -b` |
| `npm run build` (raíz) | código 0, `✓ built in 721ms` |
| Backend, corrida 1 (`npx vitest run`, con JSON) | `Test Files 7 failed \| 97 passed (104)` · `Tests 10 failed \| 1134 passed (1144)`. Es la espera en cadena de CHORE-02, con su firma: el `LOCK TABLE` de `cuentas-r1` cayó a los 15 s y la fila retenida de `cuentas-r3` también falló. Detrás cayeron por tiempo límite PR-A15g y PR-A15h, PR-B06d y PR-B06e, `bloqueo-usuario` A1 y `worker-consumidor` (`esperarHasta`). La única aserción, en `worker-r2` (`expected 2 to be greater than or equal to 3`), es la de los reintentos que no alcanzan bajo carga; la vi igual en verificaciones anteriores y es de AUTH. **PR-B05 en verde, 5.4 s** |
| Backend, corrida 2 | `Test Files 104 passed (104)` · `Tests 1144 passed (1144)`. **PR-B05 en verde, 4.8 s.** El `LOCK TABLE` tardó 256 ms |
| Frontend | `Test Files 1 failed \| 83 passed (84)` · `Tests 2 failed \| 1165 passed (1167)`. Los 2 rojos son exactamente T-25 y T-26 (`alumnos-b-r3.ataque.test.tsx`). No hay ningún `Unhandled Rejection` |
| `vitest list` | backend 1144 en 104 archivos; frontend 1167 en 84 |
| PA-07 | Corrida 2: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2, en `sesiones.ts:39` y `tokens-cuenta.ts:116` (los aceptados). Corrida 1: 5, en esos mismos dos sitios |
| PA-11 | `docker ps -a` a las 21:12:19, más de 2 min después del backend: solo los 4 contenedores de `infra/` |
| V-03 | Sin cambios de esquema desde mi primera verificación de b, en la que comprobé `validate`, `format`, `status` y `diff` limpios y `20260930235837_movimientos_inscripcion` igual a §D-B8. `schema.prisma` y la carpeta de la migración no cambiaron desde entonces (ninguna corrección los tocó) |

**Estado esperado alcanzado:** backend en verde en la corrida sin la cadena, y en el frontend solo T-25 y T-26 en rojo. No hay ningún otro rojo por aserción de b.

## Problemas que bloquean
### T-25 — "Agregar a la clase" se convierte en la insignia y el foco cae en `<body>` (del tester, bajo, abierto)
Dónde: `frontend/src/features/clases/components/buscador-alumnos.tsx`, `FilaCandidato`. Al agregar se invalidan los candidatos, la fila vuelve con `yaInscrito: true`, y el botón enfocado se reemplaza por una `Badge` que no recibe foco.

Gravedad real:
- **Afecta solo a quien usa el teclado o un lector de pantalla:** después de agregar a un alumno pierde su lugar y tiene que volver a recorrer la página desde el principio.
- **No toca datos ni autorización.** El toast sí anuncia el resultado.
- **Relación con §7.14:** el patrón aprobado en T-21 cubre "una acción que borra la fila". Aquí la fila sigue, pero su control desaparece por su propia acción. Es otra rama del mismo principio ("nunca a `<body>`"), que §7.14 todavía no fija.

Por qué bloquea: el caso `*.ataque` está en rojo, y la subentrega no se cierra así (definición de terminado).

### T-26 — "Ver más" desaparece al cargar la última página y el foco cae en `<body>` (del tester, bajo, abierto)
Dónde: el botón se renderiza solo con `hasNextPage`. En b lo hacen `tabla-alumnos.tsx` ("Ver más alumnos" del roster) y `personas-view.tsx` ("Ver más alumnos" de los compañeros).

El mismo patrón está en otros dos lugares, **fuera de b:**
- `features/clases/components/panel-mis-clases.tsx` ("Ver más clases"), de CLASES-a, ya cerrada con commit;
- "Cargar más enlaces", de admin (AUTH-03b).

Además, **c y d van a crear el mismo patrón** ("Ver más publicaciones" y "Ver más comentarios").

Gravedad real: la misma de T-25. Es baja, pero es **transversal**: si el criterio no queda escrito ahora, cada subentrega lo repite.

Por qué bloquea: el caso `*.ataque` está en rojo.

## Problemas que no bloquean
- **N-B1 · `PersonasView` con `claseId ?? ""` y `AlumnosView` con `claseId ?? ""`.** Son valores por defecto que ocultan un dato faltante; el router siempre lo da. Va como detalle en la próxima pasada.
- **N-B2 · PR-B05 retiene `usuarios` unos 5 s** (40,000 filas). Ya lo acepté en la segunda pasada de la corrección 2; va como nota para CHORE-02, junto a la espera en cadena.

## Detalles menores
- "—" en la columna "Acceso" se lee como "raya" en algunos lectores. Una alternativa es "Sin restricción" en `sr-only`. Si se aprueba la ronda 4, es opcional en ella; si no, va a H-3/H-6.
- T-23: si el id con foco no estaba en la lista anterior, el foco va a la primera fila. Nunca a `<body>`.

## Diff contra el plan (¿lo planeado, solo lo planeado y todo lo planeado?)
- **Archivos:** `git diff --name-status 855069b` y los no rastreados. Todo está en "Cambios por capa" de b, en sus listas cerradas, en §D-B4 bis, en las `*.ataque` del tester o en `docs/`:
  - `shared`: `clases.ts` e `index.ts`;
  - backend: la migración nueva, `schema.prisma`, `inscripciones.ts`, `index.ts`, `busqueda.ts` y su prueba, `handlers/clases/alumnos.ts`, `app.ts`, los README, `ayudas-clases.ts` y las 3 pruebas de integración de b;
  - frontend: el router y su prueba, `secciones-de-clase.tsx`, `formulario-unirse-clase.tsx`, `inicio-maestro-view.tsx`, `data.ts`, `hooks.ts`, `lib.ts` y `types.ts`, las vistas y componentes nuevos, los badges, y las pruebas existentes extendidas (`lib.test.ts`, `clase-layout.test.tsx`, `inicio-estudiante-view.test.tsx`).

  **Ningún archivo fuera de lo autorizado y ningún borrado.**
- **V-05:** los archivos que deben seguir intactos están sin cambios contra `<Ca>`: `middleware/`, `core/auth`, `features/auth/`, `services/`, `components/ui`, `components/layout`, `styles/tokens*`, `components/estado-vacio.tsx`, `eslint.config.mjs`, los `package.json` y el lockfile. Fuera de los paquetes, los protegidos coinciden con su SHA-256 de `aprobacion.md`.
- **Todo lo planeado:**
  - pasos 16 a 24;
  - los 74 IDs de PR-B01a a PR-B17 con su caso, más las pruebas normales de las correcciones (T-20, PR-B11c2, D-4, T-22, T-23 y T-24);
  - V-06: 8 rutas exactas, y `sesiones-y-cadena` en verde;
  - §D-B4 bis: N-04 y los textos del inicio del maestro.
- **Más allá del texto del plan, todo arbitrado:**
  - las 9 desviaciones de la implementación;
  - T-20/T-24 (criterio sobre el normalizado, tope crudo de 1000, normalización única en `shared/`);
  - T-21/T-22/T-23 (foco por `focusin` y efecto después de cada render);
  - D-1/M-07 (PR-B05 con 40,000 filas);
  - D-4 (toast neutro);
  - C-17.

## `*.ataque`
- **V-01:** SHA-256 de las 85 `*.ataque` contra la tabla vigente: la de la ronda 0 de b, más `alumnos-b-r1` (`485D39EF…` y `C3692E9E…`), `alumnos-b-r2` (`ADF927DF…` y `55DC274E…`) y `alumnos-b-r3` (`FC11AB4B…` y `371518E4…`). **85/85 iguales, conjunto exacto.** El programador no modificó, saltó ni borró ninguna.
- **Las 2 adaptaciones de la ronda 0 de b, línea por línea contra `<Ca>`:**
  - `sesiones-y-cadena.ataque`: la lista exacta suma las 8 rutas de b; sigue cerrada y siguen creando maestros solo las tres de antes.
  - `clases-r1.ataque`: 25 → 29 `enEspera=`, con los componentes de a y `lista-personas.tsx` fijados en 0, y el resto acotado a `buscador-alumnos.tsx` (≤ 1) y `tabla-alumnos.tsx` (1 a 2). Es más estricto que antes.
- **C-17:** ya verificado. Al revertir el diff sale el hash anterior exacto; es una línea y su comentario.

## Definición de terminado (`AGENTS.md`)
| Punto | Estado |
|---|---|
| Cumple RF-19, RF-38, RF-39, RN-02, RN-03 y RN-04 | **Sí.** Compañeros, roster con estado de pago y restricción, buscador con correo enmascarado, alta manual y baja con registro. T-25 y T-26 son de accesibilidad del foco |
| Capas y middleware | **Sí.** `core/` puro: `busqueda.ts` importa de `shared` la normalización, no infraestructura. Solo `adapters/db` toca Prisma, y la transacción vive en el adaptador. Las 8 rutas pasan por `protegido` con el sexto paso (`requireMembership` en personas, `requireOwnership` en las del roster) y leen la clase con `claseDe`. Ningún handler verifica rol, propiedad o inscripción a mano |
| `lint`, `build` y `test` en verde | **No:** 2 casos `*.ataque` del frontend en rojo (T-25 y T-26). `lint`, `build` y el backend, sí |
| Pruebas de autorización del endpoint nuevo | **Sí:** PR-B08a a PR-B08i, más los recorridos recursivos (PR-B02e, PR-B04g, PR-B04h y PR-B06e) |
| Migración compatible hacia atrás | **Sí:** tabla, tipo y secuencia nuevos, `ON DELETE RESTRICT`, sin tocar nada existente. Revertir el código deja la tabla sin uso |
| `infra/` y `.env.example` | Sin cambios; no hacían falta |
| Documentos | Pendientes para el cierre (abajo) |

**Reglas que no se rompen:**
- **Estado de pago:** solo `listarAlumnosDeClase` lo selecciona y solo `GET …/alumnos` (dueño) lo serializa. Personas, candidatos y la respuesta de agregar no lo llevan, ni el correo completo (M-01 y P-05 f).
- **Consultas sanas:**
  - buscador por el GIN (PR-B05);
  - roster y personas por conjunto de claves (`nombre_busqueda`, `usuario_id`), con el cursor leído por PK;
  - `yaInscrito` en el mismo `findMany`, sin N+1;
  - todo paginado (50 y 100; candidatos, 20 y 50 con `hayMas`).
- **Registro:** `movimientos_inscripcion` en la misma transacción, como último paso y solo con cambios efectivos (PR-B16a a PR-B16h).
- **Cola:** b no encola.
- **UTC:** las fechas van en ISO desde `toISOString`.
- **Secretos y proveedores:** ninguno nuevo; sin dependencias.
- **Logs:** el correo de un candidato no aparece en ningún log (PA-10).

**Estilo de `CLAUDE.md`:**
- módulo `features/clases` completo;
- textos en `data.ts`, tipos en `types.ts` (con los reexportados de `shared`) y hooks en `hooks.ts`;
- estados error → cargando → vacío → datos;
- errores del backend como `AppError`;
- sin `?? []` ni ternarios anidados.

Solo quedan los `claseId ?? ""` (N-B1).

## Lista de diseño
- **§7.2:** la excepción de la lista de compañeros (filas sin vidrio fuerte, divisores de `--border`) coincide con `ListaPersonas`.
- **§7.8:** `EstadoPagoBadge` ("Al corriente" con `CircleCheck`, "Deudor" con `CircleAlert`), `AccesoRestringidoBadge` (`Lock`) y "Ya está en la clase" (`muted`) coinciden. El estado nunca va solo con color.
- **§7.14:** el patrón "Foco al confirmar una acción que borra la fila" está documentado como propuesta y coincide con `TablaAlumnos`. **Falta su extensión a "un control que desaparece por su propia acción" (T-25 y T-26).**
- **§7.17 (nueva):** buscador con ayuda permanente, mínimo de 3, espera de 300 ms, tope de 120, correo enmascarado como texto secundario, acción por fila con el nombre en `sr-only`, mensajes y orden de estados. Coincide.
- **§8:** roster opaco dentro de un panel de vidrio, filas de 48 px y botones de 36 px, sin `data-material`. Coincide.
- **Solo tokens y componentes de `components/ui/`** (`clases-r1` y `estatico-r1` en verde). Sin rasgos prohibidos y sin texto sobre vidrio azul.
- **Una acción principal:** `AlumnosView` no tiene botón `primary` (cada fila tiene la suya, `outline`) y `PersonasView` no tiene ninguno. Es correcto, porque ninguna de las dos tiene una acción principal de vista.
- **Textos:** en español de México, con el tono de §9 y sin emojis. Los no listados en §D-B6 van en la enmienda.
- **Estados de error, carga y vacío:** los tres están. El vacío del roster lleva la indicación de qué hacer.
- **360 px, por análisis:** la tabla se desplaza dentro de su contenedor (`overflow-x-auto` de `table.tsx`), y las filas del buscador hacen `flex-wrap`. Queda para H-6.
- **Foco:** visible con `focus-visible`. Las etiquetas de los campos y `aria-describedby` están. Falta T-25/T-26.

## Observaciones del tester: decisión
| Observación | Decisión |
|---|---|
| Con un término demasiado largo, `aria-describedby` lee la ayuda permanente y luego el aviso | **Se mantiene** (§7.17 pide ayuda permanente, y las dos frases dan contexto). **Punto para H-6:** escucharlo una vez con el lector de pantalla. Si al humano le molesta, el ajuste es que, cuando hay aviso, `aria-describedby` apunte solo al aviso; es del carril trivial |
| Carrera entre `focusout` y `setTimeout(0)` | **Se descarta:** no se alcanza en la práctica (`mousedown` y `click` van en tareas separadas) y no hay forma realista de provocarla |
| D-7 bis | **Cerrado:** la línea 990 de `resumen-programador.md` ya dice que el cambio fue de C-17, en la corrección de la ronda 1 |

## Desacuerdos arbitrados en b (registro)
- **9 desviaciones de la implementación:** todas aceptadas. PR-B05 con la condición D-1.
- **T-21:** opción A ("Foco al confirmar una acción que borra la fila", §7.14).
- **D-4:** toast neutro con `yaEstaba`.
- **C-17:** el doble de `sonner` pasa a ser invocable, sin tocar ninguna aserción.
- **Observación 1 del tester** (agregar y quitar para ver datos): no se escala, porque es la consecuencia aceptada de P-05 (a), (f) y (g). Va como sugerencia para la consulta de movimientos de ADMIN.
- **M-07:** PR-B05 con 40,000 filas, aceptado con su costo anotado para CHORE-02.
- **No hay desacuerdos abiertos** entre el programador y el tester.

## Documentos a actualizar (al cerrar CLASES-b)
**El orquestador, con la autorización del humano y el SHA-256 de cada archivo** (textos marcados (b) de "Textos literales propuestos"):
- **`docs/ARCHITECTURE.md`:**
  - §7: la fila `clases` con las rutas de b (`personas`, `alumnos`, `alumnos/candidatos` con correo enmascarado, y `DELETE …/alumnos/{alumnoId}`);
  - §14: la fila `movimientos_inscripcion`, y en el diagrama `clases ||--o{ movimientos_inscripcion : registra` y `usuarios ||--o{ movimientos_inscripcion : afecta`;
  - "Reglas de acceso a datos": la viñeta de la búsqueda. Hay que ajustar el texto propuesto a lo construido: "de 3 a 120 caracteres **ya normalizados** (y un tope de 1000 en crudo), con la normalización definida una sola vez en `shared/` (`normalizarTerminoDeBusqueda`), la misma que aplica `core/` a `nombre_busqueda`".
- **`docs/ARCHITECTURE-ESSENTIALS.md`:** "Tablas" (`movimientos_inscripcion`), "Reglas de datos" (búsqueda, con el mismo ajuste) y "Reglas de negocio que tocan código" (alta manual).
- **`CLAUDE.md`:** en "Ubicaciones compartidas", que ya existen `EstadoPagoBadge` (`estado-pago-badge.tsx`) y `AccesoRestringidoBadge` (`acceso-restringido-badge.tsx`).
- **`docs/PRD.md` §5, RN-04:** las dos viñetas (buscador con correo enmascarado y registro de altas y bajas).

**Arquitecto, enmienda de cierre de b:**
- **D-2:**
  - corregir el ejemplo de PR-B01b;
  - decidir si el mínimo de 3 excluye espacios (hoy no: `"a b"` es válido);
  - agregar a §D-B6 "Agregar alumnos", "No encontramos a ese alumno." y "\<nombre\> ya estaba en la clase" (D-4), más "La búsqueda no puede tener más de 120 caracteres" (T-24).
- **T-20/T-24:** en §D-B3 y S-11, el criterio sobre el texto normalizado, el tope crudo de 1000 y la normalización única en `shared/` (`estadoDeTerminoDeBusqueda`).
- **§D-B4 y §D-B7:** el patrón de §7.14 (T-21 a T-23) y, si se aprueba la ronda 4, su extensión (T-25 y T-26).
- **§D-R0:** la fila C-17.
- **"Pruebas requeridas" (b):** PR-B05 con 40,000 filas y su motivo; las pruebas normales nuevas (los casos T-20, PR-B11c2, D-4, T-22, T-23 y T-24).
- **CLASES-c:**
  - autorizar `panel-mis-clases.tsx` para aplicar el criterio de T-26 a "Ver más clases";
  - exigir el criterio desde el diseño en "Ver más publicaciones" y "Ver más comentarios".

**`docs/ESTADO.md` (orquestador):**
- la medición de b en §6;
- en §3, CHORE-02: PR-B05 retiene `usuarios` unos 5 s;
- "Cargar más enlaces" de admin (T-26), con destino ADMIN o un `chore` de accesibilidad;
- la sugerencia para la consulta de movimientos de ADMIN (alta y baja seguidas);
- en H-6: escuchar la ayuda más el aviso del buscador, y la tabla del roster a 360 px.

**`docs/DESIGN.md`:** coherente con lo implementado. Si se aprueba la ronda 4, se suma la extensión de §7.14.

## Medición del programador (CLASES-b, para `docs/ESTADO.md` §6)
| Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
|---|---|---|---|
| CLASES-b | 3 (4 si se autoriza la cuarta) | 2: T-22 a T-24 y T-25 a T-26 (3 con la cuarta) | 1 de 4 entregas verificadas: la corrección de la ronda 2, por M-07 (PR-B05 intermitente). La implementación, la corrección de la ronda 1 y la segunda pasada de la corrección 2 se aceptaron a la primera. A eso se suma la parada correcta por el conflicto de D-4 |

Patrones observados:
- **Cifras exactas en todas las entregas:** conteos, IDs con su título exacto, V-01 y PA-07 coincidieron siempre con mi corrida. Las medidas de AUTH-03c funcionan.
- **Se detuvo bien:** ante el conflicto de D-4 con una `*.ataque` que no podía tocar, se detuvo y lo reportó con la línea exacta, en lugar de rodearlo. Es lo mismo que hizo con T-18 en la ronda 4 de a.
- **D-7 y D-7 bis:** es la tercera afirmación inexacta del resumen en el encargo (después de D-5 y D-6) sobre algo que no hizo él, y la corrección quedó otra vez a medias la primera vez: agregó una sección nueva sin editar la línea original. El patrón persiste, aunque ya no toca código ni cifras.
- **M-07:** midió el umbral de PR-B05 con el archivo aislado y declaró "limpio" con pocas corridas. La lección: la estabilidad de una prueba que depende de estadísticas se mide en la suite completa.
- **Lo que resistió todos los ataques:**
  - la autorización (8 rutas, rol, propiedad y restringido);
  - las fugas (estado de pago, restricción y correo completo, recorridos recursivos y enmascarado con partes locales de 1 a 64 caracteres);
  - la concurrencia (40 transacciones por ronda en PR-B16f, sin un solo `P2028` propio);
  - la paginación por claves con homónimos y cursores ajenos;
  - PA-10.

  Todos los hallazgos de b (T-20 a T-26) fueron de validación de borde y de manejo del foco.

## Para el humano
**Decisión: cómo cerrar CLASES-b.** Se agotaron las tres rondas. Quedan T-25 y T-26, los dos bajos y de accesibilidad del foco: con el teclado, el foco se pierde cuando "Agregar a la clase" se convierte en insignia o cuando "Ver más" desaparece al cargar la última página. Todo lo sensible resistió.

**Recomiendo la opción (A): una cuarta ronda corta y cerrada, solo en archivos de b.**
- **El programador corrige:**
  - T-25 en `buscador-alumnos.tsx`: el foco va al siguiente "Agregar a la clase" de la lista (o al anterior si era el último) y, si no queda ninguno, al campo de búsqueda;
  - T-26 en `tabla-alumnos.tsx` y `personas-view.tsx`: al cargar la última página, el foco va al primer elemento nuevo (a su primer control o, si no tiene, al propio elemento con `tabIndex={-1}`); si no llegó nada nuevo, al encabezado de la lista;
  - extiende `DESIGN.md` §7.14 con "un control que desaparece por su propia acción", como propuesta.

  Cada caso lleva su prueba normal.
- **Después:** yo verifico y el tester hace la regresión de las 85 `*.ataque` y ataca solo lo que cambió. **Sin quinta ronda.**
- **Costo:** una pasada sobre 3 componentes y `DESIGN.md`, una verificación y una regresión. Es menos que la ronda 4 de a.
- **Riesgo:** bajo. No toca backend, migración, autorización ni datos.
- **Lo que queda fuera de b:**
  - "Ver más clases" de `panel-mis-clases.tsx` (a, cerrada): lo corrige CLASES-c, cuya enmienda debe autorizar ese archivo. c va a crear justo ese patrón con "Ver más publicaciones" y "Ver más comentarios", y con §7.14 extendido nace correcto;
  - "Cargar más enlaces" de admin: a ADMIN o a un `chore` de accesibilidad.
- **Si quieres cerrar ya también el caso de a:** puedes autorizar `panel-mis-clases.tsx` dentro de esta cuarta ronda. Es una línea más en tu respuesta, y el costo es de unos minutos.

**Por qué no las otras opciones:**
- **(B) Cerrar b con los 2 casos en rojo como pendientes:** el commit `<Cb>` quedaría con la suite en rojo, contra la definición de terminado. Cada verificación de c tendría que excluirlos, y c construiría sus "Ver más" sin el criterio escrito.
- **(C) Corregir solo T-25 y dejar T-26 al `chore` transversal:** deja un rojo de todas formas, y T-26 es el que c va a repetir.

---

# Revisión final — CLASES-b — ronda 4 y cierre
Veredicto: **APROBADO: el tester hace la regresión final y, si RESISTE, se cierra CLASES-b**
Verificación propia: lint código 0 (`> tsc -b`) · build código 0 (`✓ built in 712ms`) · test backend `104 passed (104)` · `1144 passed (1144)` · test frontend `84 passed (84)` · `1170 passed (1170)`

Fechas:
- Corridas: 2026-09-30, de 21:30 a 21:36.
- Comprobación posterior: 2026-10-01, después del reinicio de Docker. Ningún archivo de `backend/`, `frontend/` ni `shared/` cambió desde esas corridas (`find -newer`). Mi sesión se interrumpió antes de escribir esta sección.
- Contexto: PA-01 comprobada (regla habilitada, Inbound, Block, Public; red `IZZI-F281-5G`, Pública, de confianza). Decisión del humano: `aprobacion.md`, "Decisión del humano sobre la escalada de CLASES-b" (opción A, solo archivos de b). El texto vigente de b es el de la Enmienda 5.

## Cifras: resumen contra mi corrida
| Qué | Resumen (ronda 4) | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | código 0 | `✓ built in 712ms`, código 0 | Sí |
| Backend | `1144 passed (1144)` en 104 archivos, en la corrida limpia; la primera cayó por tiempos límite de AUTH | Corrida 1 (`npx vitest run`, JSON): `8 failed \| 96 passed (104)` · `10 failed \| 1110 passed \| 24 skipped (1144)`. Todo fue por tiempo límite: el `LOCK TABLE` de `cuentas-r1` a 15 s, la fila retenida de `cuentas-r3`, `restablecer`, `bloqueo-usuario` A2, `sesiones-y-cadena` (refresco), `worker-correo-de-cuenta`, PR-A15h y los hooks de `alumnos-b-r1` y `clases-autorizacion`. **Ningún rojo por aserción.** PR-B05 en verde, 3.6 s.<br>Corrida 2: `Test Files 104 passed (104)` · `Tests 1144 passed (1144)`. PR-B05 en verde, 4.5 s; el `LOCK TABLE`, 250 ms | Sí, en la corrida 2 |
| Frontend | `1170 passed (1170)` en 84 archivos | `Test Files 84 passed (84)` · `Tests 1170 passed (1170)`, código 0, sin `Unhandled Rejection` | Sí |
| `vitest list` | backend 1144 en 104; frontend 1170 en 84 | Las mismas cuatro cifras. Los 3 casos nuevos (T-25 y T-26 en `alumnos-view.test.tsx`, T-26 en `personas-view.test.tsx`) aparecen con esos títulos | Sí |
| V-01 | 85 | Comparé por programa los 85 SHA-256 contra la tabla vigente (la de la ronda 0 de b, `alumnos-b-r1`, `alumnos-b-r2` y `alumnos-b-r3`): **85/85 iguales**, conjunto exacto. El programador no tocó ninguna `*.ataque` | Sí |
| V-04 | `enEspera=` 29 | 29; `vidrio-azul` solo en `bloque-destacado.tsx` | Sí |
| V-05 | sin cambios, incluido `panel-mis-clases.tsx` | Sin cambios contra `<Ca>` en: `panel-mis-clases.tsx`, `features/admin/`, `middleware/`, `core/auth`, `features/auth/`, `services/`, `components/ui`, `components/layout`, `styles/tokens.css`, `components/estado-vacio.tsx`, `eslint.config.mjs`, los `package.json`, el lockfile, `infra`, `.claude` y la migración de a. Ningún archivo cambió fuera de los paquetes salvo `docs/` | Sí |
| V-06 | sin cambios | `sesiones-y-cadena` (lista exacta de rutas) en verde en la corrida 2 | Sí |
| PA-07 | 2 `P2028` aceptados | Corrida 2: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2, en `sesiones.ts:39` y `tokens-cuenta.ts:116`. Corrida 1: 4, en esos mismos sitios | Sí, en la limpia |
| PA-11 | solo `infra/` | Después de las corridas, solo los contenedores de `infra/` | Sí |

## Estado de T-25 y T-26 (comprobado en el código)
| # | Estado | Qué vi |
|---|---|---|
| T-25 | **Cerrado** | `BuscadorAlumnos` marca la fila con foco con `useFilaEnFoco("data-candidato-id")`. Ese atributo solo lo lleva el `<li>` de cada candidato, así que el buscador, el roster y "Ver más" no cuentan. Guarda los botones "Agregar" en un `Map` (`registrarAgregar`).<br>Después de cada render, **solo si** esa fila tenía el foco y el foco se perdió (`focoPerdido()`: ningún elemento, `<body>` o desconectado), lo lleva al siguiente "Agregar a la clase" de la lista, después al anterior y, si no queda ninguno, al campo de búsqueda.<br>No depende del `onSuccess`. Un render sin desmontaje no hace nada, porque `focoPerdido()` es falso. Si la persona escribe en el campo, `focusin` borra la marca y no le roba el foco.<br>Cumple mi criterio al pie de la letra |
| T-26 | **Cerrado** | `useFocoAlCargarMas(ids, enfocarFila, enfocarEncabezado)` devuelve el `ref` del botón "Ver más". Un `focusin` registra si ese botón tenía el foco. Después de cada render, **solo si** lo tenía y el foco se perdió (el botón se desmontó al llegar la última página), enfoca el primer id que no estaba en la lista anterior; si no llegó nada, el encabezado.<br>En `TablaAlumnos`, el primer elemento nuevo es su "Quitar". En `PersonasView`, su `<li>`, que `ListaPersonas` hace enfocable con `tabIndex={-1}`. El encabezado es el `h2` (`tabIndex={-1}`, nombre "Alumnos"). Mientras el botón sigue montado (quedan páginas), no se mueve nada |
| T-21 a T-23 con el hook | **Sin cambio de comportamiento** | `TablaAlumnos` usa `useFilaEnFoco("data-alumno-id")`, que es la misma lógica de `focusin`/`focusout` que antes vivía en el componente, más su efecto posterior al render, igual al de la corrección 2. PR-B11c2, los casos normales T-22 y T-23 y los casos del tester (T-21, T-22 y T-23 de `alumnos-b-r1`/`r2`) siguen en verde |
| Regla 4 de `CLAUDE.md` | **Cumple** | `useFilaEnFoco` y `useFocoAlCargarMas` viven en `hooks.ts`, sin tipos declarados ahí (solo tipos en línea de los parámetros, que la regla permite). **Detalle menor:** `focoPerdido` no es un hook, sino una función que lee `document` (no es pura), y se exporta desde `hooks.ts`. Su lugar natural es un archivo de utilidades de foco; no cambia el comportamiento. Va para la próxima vez que se toque |
| `ListaPersonas` | **Aceptado** | Cada `<li>` lleva `tabIndex={-1}` y `data-persona-id`, también el del maestro. `tabIndex={-1}` no agrega nada al orden de tabulación; solo permite enfocar el elemento desde el código. Ponerlo en todos es la forma simple de que cualquier fila pueda ser "la primera nueva". Es aceptable |
| `DESIGN.md` §7.14 | **Coherente, marcado "propuesta"** | El bloque "Foco cuando un control desaparece por su propia acción (CLASES-b, propuesta; T-25 y T-26)" contiene mi criterio: siguiente/anterior/campo y primer elemento nuevo/encabezado, sin mover el foco en renders sin desmontaje ni robárselo a otro control.<br>**Detalle de redacción:** la línea que sigue, "Implementan este patrón `AccionRestablecer`… y la confirmación de 'Revocar' en `TablaEnlaces`…", quedó después de los bloques de b, y parece decir que esos componentes de admin implementan el patrón de foco. Se refiere a la confirmación en línea, y conviene precisarlo ("Implementan la confirmación en línea…"). Lo hace el orquestador al cerrar b, en el commit, o el programador de c. No bloquea |
| `panel-mis-clases.tsx` y `features/admin` | **Intactos** | Sin diff contra `<Ca>` y sin entradas en `git status`. Pasan a CLASES-c y a ADMIN, como decidió el humano |

## Problemas que bloquean
Ninguno.

## Detalles menores (no bloquean; para el cierre de b o la próxima vez que se toque el archivo)
- `focoPerdido` se exporta desde `hooks.ts`, aunque no es un hook. Le corresponde un archivo de utilidades de foco.
- En `DESIGN.md` §7.14, la línea "Implementan este patrón `AccionRestablecer`…" quedó después de los bloques de foco de b. Hay que precisar que se refiere a la confirmación en línea.
- Siguen los `claseId ?? ""` de `personas-view.tsx` y `alumnos-view.tsx` (N-B1 de la revisión final).
- "—" en la columna "Acceso" queda como punto para H-3/H-6.

## Definición de terminado (`AGENTS.md`): estado final
| Punto | Estado |
|---|---|
| Cumple RF-19, RF-38, RF-39, RN-02, RN-03 y RN-04 | **Sí.** Compañeros, roster con estado de pago y restricción, buscador con correo enmascarado, alta manual y baja con registro en `movimientos_inscripcion`. El foco ya no se pierde en ningún control de b que desaparece |
| Capas y middleware | **Sí.** `core/` es puro (la normalización viene de `shared/`) y solo `adapters/db` usa Prisma. Las 8 rutas pasan por `protegido` con el sexto paso (`requireMembership` en personas y `requireOwnership` en el roster) y leen la clase con `claseDe`. Ningún handler verifica permisos a mano |
| `lint`, `build` y `test` en verde | **Sí:** backend 1144/1144 y frontend 1170/1170 en la corrida sin la cadena. Los rojos de la corrida 1 son solo de CHORE-02, por tiempo límite y ajenos a b |
| Pruebas de autorización del endpoint nuevo | **Sí:** PR-B08a a PR-B08i, más los recorridos recursivos de cada respuesta |
| Migración compatible hacia atrás | **Sí:** `movimientos_inscripcion`, con su tipo y su secuencia, es nueva y no toca nada existente. Revertir el código no rompe la base |
| `infra/` y `.env.example` | Sin cambios; no hacían falta |
| Documentos | Pendientes para el cierre (abajo). La Enmienda 5 ya está registrada |

**Reglas que no se rompen:**
- **Estado de pago, restricción y correo completo:** solo en `GET …/alumnos` del dueño.
- **Consultas sanas:**
  - GIN en el buscador (PR-B05 lo demuestra en todas las corridas);
  - conjunto de claves en el roster y en personas;
  - sin N+1;
  - todo paginado.
- **Registro:** los movimientos se escriben en la misma transacción, como último paso y solo cuando el cambio es efectivo.
- **Proveedores y datos:** sin colas, sin secretos y sin dependencias o proveedores nuevos.
- **Fechas:** en UTC ISO.
- **Logs:** PA-10 limpio en la ronda 3.

**Estilo de `CLAUDE.md`:** el módulo está completo, con los textos en `data.ts`, los tipos en `types.ts` y los hooks en `hooks.ts`; los estados siguen su orden; los errores van por su lado. Solo quedan los detalles menores.

## Lista de diseño: estado final
- **§7.2** (lista de compañeros sin vidrio fuerte), **§7.8** (badges con icono y texto, nunca solo color), **§7.17** (buscador) y **§8** (roster opaco): coinciden con lo implementado.
- **§7.14:** documenta los dos patrones de foco de b, marcados "propuesta":
  - "acción que borra la fila" (T-21 a T-23);
  - "un control que desaparece por su propia acción" (T-25 y T-26).

  Coinciden con `TablaAlumnos`, `BuscadorAlumnos` y `PersonasView`. CLASES-c los aplicará a "Ver más clases" (`panel-mis-clases.tsx`, autorizado en la Enmienda 5) y a sus propios "Ver más publicaciones" y "Ver más comentarios".
- **Solo tokens y componentes de `components/ui/`** (`clases-r1` y `estatico-r1` en verde). Sin rasgos prohibidos ni texto sobre vidrio azul.
- **Acciones principales:** ninguna de las dos vistas tiene una; cada fila lleva la suya, en `outline`. Es correcto para estas vistas.
- **Textos:** con el tono de §9, en `data.ts` y sin emojis.
- **Estados:** error, carga y vacío en las dos vistas y en el buscador.
- **360 px:** por análisis; queda para H-6.
- **Foco:** visible y nunca en `<body>` en b.

## Documentos a actualizar (consolidado, al cerrar CLASES-b)
**Orquestador, con autorización del humano y el SHA-256 de cada archivo** (textos (b) de "Textos literales propuestos", en su versión de la Enmienda 5):
- **`docs/ARCHITECTURE.md`:**
  - §7: la fila `clases` con las rutas de b;
  - §14: la fila `movimientos_inscripcion` y, en el diagrama, `clases ||--o{ movimientos_inscripcion : registra` y `usuarios ||--o{ movimientos_inscripcion : afecta`;
  - "Reglas de acceso a datos", la viñeta de búsqueda, con el ajuste: "de 3 a 120 caracteres ya normalizados, más un tope de 1000 en crudo; la normalización se define una sola vez en `shared/` (`normalizarTerminoDeBusqueda` y `estadoDeTerminoDeBusqueda`), la misma que `core/` aplica a `nombre_busqueda`".
- **`docs/ARCHITECTURE-ESSENTIALS.md`:** "Tablas", "Reglas de datos" (búsqueda, con el mismo ajuste) y "Reglas de negocio que tocan código" (alta manual y correo enmascarado).
- **`CLAUDE.md`:** en "Ubicaciones compartidas", que ya existen `EstadoPagoBadge` y `AccesoRestringidoBadge`.
- **`docs/PRD.md` §5, RN-04:** las dos viñetas (buscador con correo enmascarado y registro de altas y bajas).

**Plan:** la Enmienda 5 (cierre de b) ya está registrada y la cotejó el orquestador. No pido nada más del arquitecto para b.

**`docs/ESTADO.md` (orquestador):**
- §6: la medición de b (abajo).
- §3, en la fila de CHORE-02, tres notas:
  - PR-B05 retiene `usuarios` unos 5 s;
  - la cadena volvió a aparecer en la primera corrida de cada verificación de b;
  - la aserción de reintentos de `worker-r2` cae bajo carga.
- §3, nuevos pendientes:
  - "Cargar más enlaces" de admin (T-26), para ADMIN;
  - `focoPerdido` a un archivo de utilidades de foco;
  - la precisión de la línea "Implementan este patrón…" de §7.14.
- Fila de ADMIN: la sugerencia de que la consulta de `movimientos_inscripcion` deje ver un alta y una baja seguidas del mismo alumno.
- H-6:
  - la ayuda permanente y el aviso de longitud del buscador, leídos seguidos;
  - el roster a 360 px;
  - el foco al agregar y al cargar la última página, con el teclado.

## Medición final del programador (CLASES-b, para `docs/ESTADO.md` §6)
| Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
|---|---|---|---|
| CLASES-b | 4 (la 4.ª, autorizada por el humano) | 3: T-22 a T-24, T-25 y T-26, y la cuarta | 1 de 5 verificados: la corrección de la ronda 2, por M-07 (PR-B05 intermitente). Se aceptaron a la primera la implementación, la corrección de la ronda 1, la segunda pasada de la corrección 2 y la ronda 4. A eso se suma la parada correcta en el conflicto de D-4 |

**Patrones:**
- **Cifras exactas en las 5 entregas:** conteos, títulos de cada ID, V-01 y PA-07. Las medidas de AUTH-03c dieron resultado.
- **Se detuvo cuando debía:** en el conflicto de D-4 con una `*.ataque` que no podía tocar, lo reportó con la línea exacta, como hizo con T-18 en a.
- **Corrigió de fondo:** la ronda 4 generalizó el mecanismo de foco en hooks reutilizables en lugar de parchar cada componente, y dejó T-21 a T-23 intactos.
- **A vigilar:**
  - D-7 y D-7 bis fueron la tercera afirmación inexacta del resumen en el encargo, y otra vez quedó corregida a medias la primera vez (agregó la sección sin editar la línea original);
  - en M-07 midió la estabilidad de una prueba que depende de estadísticas con el archivo aislado.

  Ninguno de los dos tocó código de producción ni cifras de pruebas.
- **Resistió todos los ataques sensibles:**
  - autorización en las 8 rutas;
  - fugas de estado de pago, restricción y correo, con recorridos recursivos y partes locales de 1 a 64 caracteres;
  - concurrencia: 40 transacciones por ronda en PR-B16f, sin un `P2028` propio;
  - paginación por claves con homónimos y cursores ajenos;
  - PA-10.

  Todos los hallazgos (T-20 a T-26) fueron de validación de bordes y de manejo del foco.

## Para la regresión final del tester (sin quinta ronda)
1. **Intermitencia conocida (CHORE-02):** si cae, se repite la corrida. Es hallazgo un rojo por aserción en b o en a, PR-B05 incluido.
2. **Las 85 `*.ataque` en verde, cada una por la razón correcta:** T-20 a T-26, C-16 y C-17. En particular, T-25 y T-26 de `alumnos-b-r3` deben pasar porque el foco va donde dice §7.14, no solo porque no quedó en `<body>`.
3. **T-25 con teclado en el buscador:**
   - agregar la fila del medio, la última y la única;
   - agregar cuando la fila siguiente ya dice "Ya está en la clase";
   - doble Enter;
   - agregar mientras se escribe un término nuevo: el foco del campo no se mueve.
4. **T-26 con teclado, en el roster y en personas:**
   - cargar varias páginas seguidas, con el botón todavía montado (no se mueve nada);
   - la última página, con elementos nuevos y vacía;
   - "Ver más" pulsado con el ratón y luego un clic fuera;
   - la consulta de la página siguiente que falla.
5. **Sin movimientos espurios:** renders sin desmontaje (nueva consulta con los mismos datos, otra fila que sale) no mueven el foco ni se lo quitan a un control que la persona eligió (el campo, otro botón o la otra tabla).
6. **Sin regresión en el foco del roster (T-21 a T-23) ni en lo demás de b:** autorización, fugas, movimientos, normalización y PA-10. Basta una regresión rápida; no queda nada de b sin atacar.

## Corridas de confirmación (2026-10-01, después del reinicio de Docker)
- **Backend, corrida 1:** `9 failed | 95 passed (104)` · `11 failed | 1133 passed (1144)`. Es otra vez la espera en cadena de CHORE-02:
  - cayeron por tiempo límite el `LOCK TABLE` de `cuentas-r1` (15 s) y la fila retenida de `cuentas-r3`;
  - detrás cayeron `auth-login`, `bloqueo-usuario` A1, PR-A15h, `worker-correo-de-cuenta` y los dos casos de control de ESLint de `guarda-clase-r1` y `guarda-clase-r2` (que ejecutan ESLint);
  - la única aserción fue la de los reintentos de `worker-r2`, ya conocida bajo carga;
  - PR-B05 quedó en verde, 4.1 s.
- **Backend, corrida 2:** `Test Files 104 passed (104)` · `Tests 1144 passed (1144)`, código 0. `40P01` 0 y `P2028` 2 (los aceptados).
- **Frontend:** `Test Files 84 passed (84)` · `Tests 1170 passed (1170)`, código 0.
- **PA-11:** `docker ps -a` a las 15:35:53, más de 2 minutos después: solo los 4 contenedores de `infra/`.
- **Conclusión:** las cifras de la ronda 4 se reproducen; el veredicto no cambia.

---

# Verificación del resumen — CLASES-b — ronda 5
**Veredicto: resumen aceptado. El tester hace la regresión final (ronda 5). No hay sexta ronda.**
- **Cifras:** coinciden con mi corrida.
- **T-27 y T-28:** cumplen mi criterio al pie de la letra.
- **Lo que no cambió:** T-21 a T-26 y PR-B11c2 siguen pasando por la razón correcta. `panel-mis-clases.tsx`, `features/admin`, `DESIGN.md` y el esquema están intactos.

Fecha: 2026-10-01. PA-01 comprobada antes del backend: regla habilitada, Inbound, Block, Public; red `IZZI-F281-5G` en el perfil Público, de confianza. Decisión del humano: `aprobacion.md`, "Decisión del humano … quinta ronda mínima".

## Cifras: resumen contra mi corrida
| Qué | Resumen (ronda 5) | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` (raíz) | código 0 | `> tsc -b`, código 0 | Sí |
| `npm run build` (raíz) | código 0 | `✓ built in 588ms`, código 0 | Sí |
| Backend | `1144 passed (1144)` en 104 archivos | **Corrida 1** (`npx vitest run`, con JSON): `Test Files 104 passed (104)` · `Tests 1144 passed (1144)`, limpia al primer intento. PR-B05 en verde, 3.2 s.<br>**Corrida 2:** `9 failed \| 95 passed (104)` · `12 failed \| 1129 passed`. Es la espera en cadena de CHORE-02 y todo fue por tiempo límite: el `LOCK TABLE` de `cuentas-r1` a 15 s, la fila retenida de `cuentas-r3`, `auth-login`, `bloqueo-usuario` A1, `restablecer`, `sesiones-y-cadena` (HS512 y `alg none`), `worker-correo-de-cuenta`, PR-A15h y su hook. **Ningún rojo por aserción.** PR-B05 en verde, 4.0 s | Sí, en la corrida 1 |
| Frontend | `1189 passed (1189)` en 85 archivos | `Test Files 85 passed (85)` · `Tests 1189 passed (1189)`, código 0 | Sí |
| `vitest list` | backend 1144 en 104; frontend 1189 en 85 | 1144 en 104; 1189 en 85. Los 4 casos nuevos aparecen con "(ronda 5)" en el título: T-27, T-28 y la defensa en `personas-view.test.tsx`, y T-28 en `alumnos-view.test.tsx` | Sí |
| V-01 | 86, con la nueva `alumnos-b-r4` (`BE0E7656…`) | Comparé por programa los 86 SHA-256 contra la tabla vigente (la del cierre de la ronda 4 más `alumnos-b-r4.ataque.test.tsx`): **86/86 iguales**, con el conjunto exacto. El `prettier --write src/features/clases` del programador no cambió ninguna `*.ataque` | Sí |
| V-04 | 29 | `enEspera=` 29 | Sí |
| V-05 | sin cambios | `panel-mis-clases.tsx`, `features/admin`, `middleware/`, `services/`, `components/ui` y `eslint.config.mjs`: sin diff contra `<Ca>`. `docs/DESIGN.md` y `schema.prisma` no cambiaron desde la ronda 4 | Sí |
| V-06 | sin cambios | `sesiones-y-cadena` (lista exacta de rutas) en verde en la corrida 1 | Sí |
| PA-07 | 2 `P2028` aceptados | Corrida 1: `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `P2028` 2, en `sesiones.ts:39` y `tokens-cuenta.ts:116`. Corrida 2: 5, en esos mismos sitios | Sí, en la limpia |
| PA-11 | solo `infra/` | `docker ps -a` a las 16:58:55, casi 2 min después del backend: solo los 4 contenedores de `infra/` | Sí |

## Archivos de producción: solo `hooks.ts` y `personas-view.tsx`
El resumen dice que `tabla-alumnos.tsx` "no cambió de comportamiento". **Lo comprobé:**
- El archivo sí se reescribió durante la ronda: su fecha de modificación es del 2026-10-01 a las 16:45. El programador primero cambió el bloque de `useFocoAlCargarMas` y después lo devolvió a su forma, con un script de `node`.
- Comparé ese bloque con el texto que leí en la ronda 4 (en la transcripción de la sesión, antes del cambio): **es idéntico**. Pasa `filas?.map(id)`, enfoca el "Quitar" del `Map` y usa el `h2` como respaldo.
- Lo acepto. Habría sido más limpio no tocar el archivo, pero no hay ninguna diferencia de comportamiento ni de texto en la parte que importa.

## Estado de T-27 y T-28 (comprobado en el código)
| # | Estado | Qué vi |
|---|---|---|
| T-28 | **Cerrado** | `useFocoAlCargarMas` compara entre renders si el botón está montado (`estabaMontado` contra `botonRef.current !== null`).<br>**Solo** cuando estaba montado antes, ya no lo está **y** `teniaElFoco` es verdadero, mueve el foco, y además solo si el foco se perdió. **Con el botón montado nunca lo mueve:** el efecto termina antes de cualquier movimiento.<br>La marca `teniaElFoco` se borra de dos formas:<br>• con un `focusin` en otro elemento;<br>• con un `focusout` del botón sin `relatedTarget`, mediante `setTimeout(0)`, si el botón sigue conectado (igual que en `useFilaEnFoco`). Si el botón ya se desmontó, la marca queda, que es lo correcto, porque ese es justo el caso a resolver.<br>El caso del tester (ratón, clic fuera, otra pestaña) y los casos normales de T-28, en roster y en personas, están en verde |
| T-27 | **Cerrado** | **Antes de la primera carga,** `PersonasView` devuelve solo `MensajeError` o `Cargando`, como antes.<br>**Después de la primera carga,** el `h2` "Alumnos" (`tabIndex={-1}`) queda montado en todos los estados. El error se muestra dentro de la sección (`contenido()`: error → cargando → vacío → datos), así que el foco del "Ver más" que falla va al `h2`.<br>**Defensa en el hook:** si después de `enfocarEncabezado()` el foco sigue perdido, va al primer elemento enfocable y conectado de la sección donde estaba el botón (`closest("section, [data-slot='card']")`); si no hay ninguno, no se mueve. Tiene su caso normal.<br>**Detalle aceptado:** con error, la sección del maestro y la lista ya cargada se ocultan, y solo queda el error bajo "Alumnos". Mi criterio permitía conservar o no los datos |
| T-21 a T-26 y PR-B11c2 | **Sin cambios** | `useFilaEnFoco` no cambió, y la llamada a `useFocoAlCargarMas` en `TablaAlumnos` es la misma. Todos los casos (normales y del tester, `alumnos-b-r1` a `r4`) siguen en verde |
| Regla 4 de `CLAUDE.md` | **Cumple** | El hook vive en `hooks.ts` y no declara tipos ahí. Sigue el detalle menor de `focoPerdido`, que está en `hooks.ts` aunque no es un hook |
| `renderVista` | **Sin efecto en los casos existentes** | En `personas-view.test.tsx`, ahora también devuelve el `queryClient` para invalidar la consulta en T-28. Las llamadas que ignoran el valor de retorno no cambian. Es un archivo de pruebas de b y ningún caso existente se reescribió |

## Medición del programador en b (actualizada)
| Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
|---|---|---|---|
| CLASES-b | 5 (la 4.ª y la 5.ª, autorizadas por el humano) | 4 | 1 de 6 verificados (la corrección de la ronda 2, por M-07). A eso se suma la parada correcta en el conflicto de D-4 |

**Patrones (se suman a los de "Revisión final — CLASES-b — ronda 4 y cierre"):**
- La ronda 5 fue mínima y precisa: cumplió el criterio a la letra, con pruebas normales para cada caso, incluida la defensa.
- Volvió a tocar un archivo que el resumen declara intacto (`tabla-alumnos.tsx`). El contenido final es igual, pero el resumen debió decir "lo reescribí y lo dejé igual".
- La ronda 4 introdujo dos defectos en su propio mecanismo nuevo (T-27 y T-28): tratar "desmontado" como "foco perdido" sin comparar entre renders. La lección: un hook de foco necesita sus casos negativos (renders sin desmontaje, foco fuera) desde el principio, no solo el caso feliz.

## Para la regresión final del tester (ronda 5, la última)
1. **Intermitencia conocida (CHORE-02):** si cae, repite la corrida. Es hallazgo un rojo por aserción en a o en b, PR-B05 incluido.
2. **Las 86 `*.ataque` en verde, cada una por la razón correcta,** en particular `alumnos-b-r4`: T-27 y T-28 con el foco donde dice §7.14, no solo fuera de `<body>`.
3. **T-28 con teclado y con ratón, en el roster y en personas:**
   - "Ver más" con quedan páginas, clic en blanco y una nueva consulta (otra pestaña quita a un alumno);
   - foco en otro control (el buscador, una fila) y una nueva consulta;
   - "Ver más" con teclado que llega a la última página, con elementos nuevos y vacía.

   El foco solo se mueve cuando el botón tenía el foco y se desmontó.
4. **T-27:**
   - la página siguiente falla en personas (el foco va al `h2` "Alumnos") y en el roster;
   - la consulta falla antes de la primera carga (solo el error, sin movimientos de foco);
   - la defensa: sin destino conectado, el primer enfocable de la sección o nada, nunca `<body>`.
5. **Renders sin desmontaje:** no mueven el foco ni se lo quitan a un control que la persona eligió.
6. **El estado de error dentro de la sección a 360 px, por análisis:** `MensajeError` bajo el `h2` sin desbordarse.
7. **Regresión rápida** del resto de b y de a. No queda nada de b sin atacar.

## Revisión de la Enmienda 6 — CLASES — plan
Fecha: 2026-10-01. Modo 1, acotada a la Enmienda 6 (regla de contenido visible y triviales heredados de b).
Veredicto: **CAMBIOS REQUERIDOS** (dos correcciones de una línea cada una; el fondo de la enmienda está bien)
Verificación propia: lint, test y build **no corridos** por instrucción del orquestador (el tester hace la ronda 0 de c en paralelo con Testcontainers). Revisión de lectura. Sí ejecuté con Node 24, fuera de las suites, la definición exacta de `contarVisibles` de `shared/src/auth.ts` sobre los casos de PR-C12a a PR-C12c y sobre casos extremos adicionales, y un escaneo de solo lectura de los `nombre:` literales de las pruebas.

### Qué verifiqué y está bien
- **El diff es solo lo declarado.** `git diff -U0 e9df1f0 -- plan.md`: 27 hunks, 184 inserciones y 19 borrados. Cada hunk cae en una sección de la columna "Dónde" de la tabla de la Enmienda 6: cabecera, Enmienda 6, "Decisiones registradas", "Pendientes", "Subentregas", "Entra", §D-C4, §D-C5 bis, §D-C6, §D-C7, §D-R0, `shared/`, `core/`, `frontend/`, listas cerradas, "Pruebas requeridas" (c), "Puntos de ataque" (ronda 0 y c), "Textos literales propuestos", V-04 y pasos 27, 29, 32 y 33. Nada en §D-0, §D-A, §D-B, §D-C1 a §D-C3, §D-C5, §D-D, PARADAS ni "No se toca". `frontend/`, `backend/` y `shared/` no tienen cambios rastreados contra `e9df1f0`.
- **La regla de §D-C4 es correcta y es la de personas.** Con la expresión de `auth.ts` (`[\p{L}\p{N}\p{P}\p{S}]` menos `Default_Ignorable_Code_Point`, U+2800 y U+1D159), todos los valores esperados de PR-C12a coinciden (U+1F44D = 1; U+2764 U+FE0F = 1; con tono = 2; bandera regional = 2; con ZWJ = 2; CJK = 2; y 0 para los `Cf`, los rellenos Hangul, el Braille en blanco, U+1D159, la marca combinante suelta y los espacios Unicode). Casos extra: la bandera de Escocia con etiquetas da 1 visible y se admite; el persa con U+200C da 7; el hebreo con U+200F, 4; la tecla `1` U+FE0F U+20E3, 1; U+180E, U+2061 a U+2064, U+034F, U+17B4, U+FFA0, U+E0001 y U+1BCA0, 0. Ningún `Cf` legítimo se rechaza: `textoLargoSchema` y `nombreClaseSchema` solo rechazan los `Cc`, los inversores y, en el nombre, los saltos de línea. Los inversores son los únicos `Cf` rechazados.
- **Orden de los `refine` y de la normalización.** El `trim` de zod (y el de `normalizarTextoLargo`) solo quita espacios, terminadores de línea y U+FEFF: nunca un visible. Zod 4 corre los `refine` aunque falle `min` (son incidencias continuables), y los dos lados toman la primera incidencia: `handlers/validacion.ts` con `issues[0]` y `erroresPorCampo` de `lib.ts` con la primera por campo. Como `min(2)` y el `refine` del nombre llevan el mismo mensaje, no hay mensaje doble ni distinto entre lados.
- **Paridad.** El frontend y el backend validan con los mismos esquemas de `shared/`. El backend normaliza antes y el frontend no, pero la normalización no cambia el conteo de visibles. `shared/` no tiene `test` propio, así que PR-C12a en `backend/src/core/clases/texto.test.ts` es correcto (mismo precedente que `busqueda.test.ts`, que importa `normalizarTerminoDeBusqueda` de `@campus/shared`). PR-C12d además necesita ese archivo porque combina `normalizarTextoLargo` con el esquema.
- **Lectura de datos existentes.** Los esquemas de respuesta (`claseDetalleSchema`, `claseInscritaSchema` y `claseImpartidaSchema`) usan `z.string()` para el nombre: una clase de `campus_dev` cuyo nombre ya no pasa la regla se sigue leyendo, y solo editarla exige corregir el nombre. No hay datos en `prod`.
- **Aviso de "Agregar a la clase" (§D-C5 bis, punto 1).** En TanStack Query v5, los callbacks de `useMutation` viven en la mutación y corren aunque el observador se haya desmontado; los de `mutate`, no. `useAgregarAlumno` solo lo usa `FilaCandidato`, así que quitar los callbacks de `mutate` deja cada aviso una sola vez. Todos los dobles de `sonner` que montan el buscador son invocables (`alumnos-b-r1` por C-17, `alumnos-b-r2` a `-r5` y `alumnos-view.test.tsx`). Ninguna `*.ataque` afirma que no haya aviso cuando la fila se desmonta: el caso de `alumnos-b-r4` "escribir un término nuevo mientras se agrega" solo afirma el foco.
- **`focoPerdido(documento)` a `lib.ts`.** Recibe su entrada y no usa React: cabe en la regla de `lib.ts`. Ninguna prueba la importa de `hooks.ts` y ninguna simula `./lib`.
- **`ConClaseDeLaRuta`.** Es el remedio mínimo que respeta las reglas de los hooks: un retorno temprano antes de `useClase` o `usePersonas` obliga a partir la vista de todos modos, y una sola guarda evita cuatro copias. Todas las pruebas que montan esas vistas (`clase-layout.test`, `personas-view.test`, `alumnos-view.test`, `clases-r1` a `-r4` y `alumnos-b-r1` a `-r5`) lo hacen con `:claseId` en la ruta. `TEXTOS_CLASE.sinAcceso` existe. Con V-04, `claseId ?? ""` queda solo en `formulario-clase.tsx`, que es el único uso que hay hoy además de las cuatro vistas.
- **"No se toca" de c.** `components/*.tsx` aparece junto a `services/**`, `styles/**` y `features/auth/**`, que son rutas relativas a `frontend/src/`: es `frontend/src/components/*.tsx`. Además, c crea sus propios componentes en `features/clases/components/` desde antes de la enmienda. Ningún archivo que la enmienda autoriza está en esa lista.
- **C-18.** Confirmé el inventario: ninguna `*.ataque` afirma que se acepte un nombre de clase sin contenido visible. En las pruebas que tocan clases solo hay dos `nombre:` literales con menos de 2 visibles: `nombre: ""` en `backend/test/clases.integracion.test.ts:218` (espera `400`) y `maestro: { nombre: "L" }` en `clases-r3.ataque.test.tsx:134` (no es un nombre de clase). Lo que las `*.ataque` escriben en "Nombre de la clase" es "Historia".
- **Carril:** sigue sensible. Correcto.

### Problemas que bloquean

#### M-21 — Ruta equivocada de `formulario-clase.test.tsx` en la lista cerrada de c
Dónde: "Pruebas: listas cerradas por subentrega", fila c, columna "del propio encargo que se extiende"; y PR-C12g.
Por qué importa: el archivo existe en `frontend/src/features/clases/components/formulario-clase.test.tsx`, no en `frontend/src/features/clases/formulario-clase.test.tsx`. La lista es cerrada y PA-16 se activa al "modificar un archivo de pruebas que no está en la lista". Tal como está escrito, el programador se detiene en PA-16 o crea un segundo archivo en la ruta del plan, y V-05 marca como tocado sin autorización el archivo real. PR-A21a tenía la misma ruta en a, pero ahí era "Crear" y no estorbó.
Qué se espera: la ruta real en la lista de c y en PR-C12g.

#### M-22 — Falta un C-n para `inicio-sin-datos-r2.ataque.test.tsx` (afecta la ronda 0 que corre ahora)
Dónde: §D-R0. Viene de la Enmienda 5 (§D-C5, foco de "Ver más clases"), no de la 6, pero aparece ahora y la ronda 0 de c está en curso.
Por qué importa: `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx:25` simula `./hooks` con una fábrica cerrada (`useNombreDeSesion`, `useClasesInscritas`, `useClasesImpartidas` y `useUnirseAClase`). Para PR-C11a, `PanelMisClases` o los inicios tendrán que llamar a `useFocoAlCargarMas`, que vive en `hooks.ts` (regla 4 de `CLAUDE.md`). Con Vitest 4, leer un export que la fábrica no devuelve lanza un error ("No … export is defined on the mock"). Los dos casos de esa `*.ataque` quedarían en rojo sin que ningún C-n los cubra: el tester solo puede reportarlos como hallazgo y el programador no puede tocarlos. Es una ronda perdida casi segura.
Qué se espera: un C-19 en §D-R0 (c). Por ejemplo: "`PanelMisClases` usa `useFocoAlCargarMas` de `hooks.ts`; la fábrica de `vi.mock("./hooks")` de `inicio-sin-datos-r2` suma ese hook con un doble inerte que devuelve un ref, sin cambiar ninguna aserción". Además, que el orquestador se lo pase al tester antes de que cierre la ronda 0.

### Problemas que no bloquean

#### N-C1 — El texto para `ARCHITECTURE.md` §7 dice "definida una sola vez en `shared/`"
Dónde: "Textos literales propuestos", bloque de §7.
Mientras `shared/src/auth.ts` conserve `contarVisibles` (la enmienda lo deja como pendiente y V-04 lo admite), el documento de arquitectura diría algo falso. El texto debe decir dónde vive la función (`shared/src/clases.ts`) y que `auth.ts` tiene una copia equivalente hasta que se unifiquen, o no afirmar que es única. Además, en `ARCHITECTURE.md` las líneas 245 ("Formato de error único…") y 246 ("Detrás del proxy de Cloudflare…") forman un solo párrafo: "después de" debe precisar que el texto va como párrafo propio después de la línea 246, para no partir ese párrafo.

#### N-C2 — `claseId ?? ""` en dos vistas de a: un poco más de lo que el humano mandó a c
Dónde: §D-C5 bis, punto 3; fila 7 de la tabla.
La decisión del humano y `ESTADO.md` §3 hablan de `personas-view.tsx` y `alumnos-view.tsx`. La enmienda suma `clase-layout.tsx` y `editar-clase-view.tsx` (de a). Es el mismo defecto con el mismo remedio, no cambia el comportamiento con la ruta real y las pruebas existentes lo toleran, así que lo acepto. Lo dejo a la vista porque `clase-layout.tsx` es la vista más atacada del módulo (`clases-r1` a `-r4`) y entra al diff de c.

#### N-C3 — `textoConContenidoSchema` sin mensaje para el campo ausente
Dónde: §D-C4, "Dónde vive".
`textoLargoSchema` empieza con `z.string()` sin mensaje: un `POST` sin `texto` respondería "texto: " seguido del mensaje por defecto de zod, en inglés, en lugar de "Escribe el anuncio" o "Escribe tu comentario". El frontend siempre manda el campo, así que solo lo vería quien llame a la API a mano. Recomiendo que `textoConContenidoSchema(max, mensaje)` use `mensaje` también como error de tipo (como hace `nombreClaseSchema` con "Escribe el nombre de la clase") y sumar un caso a PR-C12e.

### Detalles menores
- **Un solo emoji como nombre de clase.** "👍" (U+1F44D) y "❤️" pasan a `400`, pero "👍🏽", "🇲🇽" y "👩‍💻" (también de un solo grafema) se aceptan, porque se cuenta por punto de código. Está escrito y es coherente con personas; lo anoto para que no sorprenda en H-6.
- La enmienda descarta `Intl.Segmenter`, entre otras razones, porque "depende de la versión de Unicode de cada motor". `\p{…}` también depende de ella: un carácter asignado hace poco puede clasificarse distinto en el navegador y en Node. Como decide el servidor, lo peor que pasa es que el error llegue del servidor y no del formulario. No cambia la decisión.
- Las cadenas de prueba del plan llevan los invisibles escritos tal cual. Conviene que el código de las pruebas los escriba con escapes (`\u200B`, `\u3164`…), para que se puedan leer y ningún editor los altere.
- El punto 7 de "Puntos de ataque" (c) y la nota "El cambio de `DESIGN.md` §7.14 no lleva ID" de "Pruebas requeridas" caen en secciones que la tabla declara en otras filas (1 y 2), no en las filas 5 a 8 de donde salen. Es un detalle de registro sin efecto.
- `con-clase-de-la-ruta.test.tsx` queda en `features/clases/` y su componente en `features/clases/components/`. El precedente de `formulario-clase.test.tsx` pone la prueba junto al componente. Cualquiera de las dos sirve; lo que importa es que la lista y el archivo coincidan (ver M-21).
- Sin `:claseId` (una ruta que hoy no existe), `ClaseLayout` mostraría el error sin el enlace "Volver a mis clases" que hoy lo acompaña. Con el router actual no se puede llegar ahí.
- El destino del pendiente de `formulario-clase.tsx` ("el próximo cambio que toque el archivo") es vago. Conviene anotarlo también en `docs/ESTADO.md` §3, como se hizo con N-B1.

### Desacuerdos arbitrados
- **Archivo de utilidades de foco (sugerencia de la revisión de b) contra `lib.ts`:** gana `lib.ts`. Una sola función no justifica un archivo fuera de la estructura de módulos.
- **Cuatro vistas contra cinco o dos (sugerencia del orquestador):** gana el arquitecto con cuatro (N-C2). `formulario-clase.tsx` pide otro mecanismo, y forzar su corrección mezclaría un refactor del formulario con un cambio trivial.

### Documentos a actualizar
- `plan.md`: M-21 y M-22 (y N-C1 y N-C3, si el arquitecto los acepta). Por el límite de su herramienta, otra vez como ediciones con ancla que transcribe el orquestador.
- `docs/ARCHITECTURE.md` §7: al cierre de c, con el texto corregido según N-C1.
- `docs/ESTADO.md` §3: el pendiente de `formulario-clase.tsx` y la unificación de `contarVisibles`.

### Para el humano
- No hay nada que decidir para avanzar: M-21 y M-22 son correcciones mecánicas. Conviene pasarle M-22 al tester ya, mientras hace la ronda 0.
- Informativo (N-C2): la corrección de `claseId ?? ""` toca también dos vistas de a (`clase-layout.tsx` y `editar-clase-view.tsx`), un poco más de lo que pediste ("los triviales heredados de b"). La acepto. Si prefieres limitarla a las dos vistas de b, basta con decirlo.

### Verificación de las correcciones
Fecha: 2026-10-01. Segunda tanda del arquitecto (E20 a E29), transcrita por el orquestador. Sin suites, por instrucción del orquestador: el tester sigue con la ronda 0.

**Veredicto final de la Enmienda 6: APROBADO.**

- **Diff.** `git diff -U0 e9df1f0 -- plan.md` sigue dando los mismos 27 hunks, con los mismos 19 borrados; las inserciones pasan de 184 a 196. No aparece ningún hunk nuevo. Lo agregado cae dentro de hunks ya declarados y corresponde a las filas 11 a 16:
  - la tabla y "Contradicciones" de la Enmienda 6;
  - §D-C4 (N-C3);
  - C-19 en §D-R0 (M-22);
  - la lista cerrada de c y PR-C12g (M-21);
  - PR-C12e y el párrafo de escapes en "Pruebas requeridas";
  - el punto de "Ronda 0";
  - "Textos literales propuestos" (N-C1);
  - el paso 27;
  - las dos filas de "Pendientes".

  Nada fuera de las secciones declaradas.
- **M-21: cerrado.** La lista cerrada de c y PR-C12g llevan `frontend/src/features/clases/components/formulario-clase.test.tsx`. La nota en "Contradicciones" deja la lista de a y PR-A21a leídas como esa misma ruta, sin reescribir a. Es suficiente.
- **M-22: cerrado.**
  - C-19 está en §D-R0 con su doble inerte (`() => ({ current: null })`), sin cambiar aserciones.
  - Pide al tester buscar cualquier otra fábrica cerrada de `./hooks` o `../hooks`, y "Ronda 0" suma esa búsqueda.
  - El paso 27 cita C-19.
- **N-C1: cerrado.**
  - El texto para `ARCHITECTURE.md` §7 dice dónde vive la función (`shared/src/clases.ts`) y que `auth.ts` tiene una copia equivalente hasta unificarlas; ya no dice "una sola vez".
  - La posición queda como párrafo propio después del que contiene "Formato de error único…" y "Detrás del proxy de Cloudflare…".
- **N-C3: cerrado.** En §D-C4, `textoConContenidoSchema` usa `mensaje` también como error de tipo de `z.string()`, y PR-C12e suma el `POST` de anuncio sin `texto`. El programador debe construirlo sin cambiar el comportamiento de `descripcionClaseSchema` ni de `textoLargoSchema`, y V-01 lo cubre.
- **Filas PR-C12a a PR-C12g (incidente de transcripción).** Un recorrido por programa de todo `plan.md` no encuentra ningún carácter invisible real: 0 líneas con `Cf`, ignorables por defecto, U+2800, U+3164, U+115F, U+1D159, U+3000 ni U+00A0. Las siete filas llevan escapes en texto, y cada cadena equivale a la que verifiqué antes con la definición de `auth.ts`; los conteos esperados siguen siendo correctos.
- **Pendientes:** las dos filas dicen que el orquestador las anota también en `docs/ESTADO.md` §3.

**Detalle menor, no bloquea:** dos frases quedaron desactualizadas después de que el orquestador restituyó los escapes:
- la viñeta "Caracteres invisibles en el plan" de "Contradicciones" dice que algunos escapes "quedaron como caracteres invisibles literales";
- el párrafo bajo "Pruebas requeridas" (c) dice "aunque en esta tabla aparezcan literales".

Hoy la tabla lleva escapes. La nota de transcripción lo aclara y la instrucción (escapes en el código) sigue siendo correcta; se puede pulir en la próxima enmienda.

## Verificación del resumen — CLASES-c — implementación
Fecha: 2026-10-01. Modo: verificación del resumen del programador (pasos 28 a 34 y su corrección de PA-16), más la revisión de la Enmienda 7 del plan (modo plan, breve). No es la revisión final de c.
**Veredicto del resumen: ACEPTADO.** Cada cifra coincide con mi corrida y los 57 IDs de c tienen archivo y título exacto. Pasa al tester (ronda 1).
**Veredicto de la Enmienda 7: APROBADO.**
Verificación propia: lint 0 · build 0 · test de la raíz con el backend en rojo por CHORE-02 (solo tiempos límite) y, repetido desde `backend/`, en verde · frontend en verde dos veces.

### Precondiciones (PA-01)
- `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `Enabled True`, `Inbound`, `Block`, `Public`. `Get-NetConnectionProfile` → `IZZI-F281-5G`. Comprobado antes de cada corrida del backend.
- Docker Desktop encendido (motor 28.5.1) y sin procesos `node` ajenos al empezar. Rama `feat/clases`; la base `e9df1f0` existe.

### Cifras: resumen contra mi corrida
| Cifra | Resumen del programador | Mi corrida |
|---|---|---|
| `npm run lint` (raíz) | código 0; `> tsc -b` | código 0; última línea `> tsc -b` |
| `npm run build` (raíz) | código 0; `✓ built in 602ms` | código 0; `✓ built in 584ms` (el tiempo varía) |
| `npm run test` (raíz) | corrida 1: backend `12 failed / 1167 passed / 3 skipped (1182)` (CHORE-02); corrida 2: código 0, backend `107 passed (107)` / `1182 passed (1182)`, frontend `90 passed (90)` / `1230 passed (1230)` | una corrida, código 1, por CHORE-02: backend `9 failed / 98 passed (107)` y `13 failed / 1166 passed / 3 skipped (1182)`; frontend `90 passed (90)` / `1230 passed (1230)`. Detalle de los 13 rojos: 11 "Test timed out in 15000ms", 1 de 40000 ms, 1 hook de 10000 ms, el `esperarHasta` del ritmo del worker de correo y el `TypeError` de `api-real.ataque:227`, que es `t1` vacío porque su login no respondió |
| Backend repetido (`cd backend; npm test`) | `107 passed (107)` / `1182 passed (1182)` | `Test Files  107 passed (107)` · `Tests  1182 passed (1182)`, código 0; terminó a las 19:24:19 |
| Frontend por paquete (`cd frontend; npm test`, dos veces) | `1230 passed (1230)` las dos | `90 passed (90)` / `1230 passed (1230)` las dos, código 0 |
| `npx vitest list` (backend) | 107 archivos y 1182 pruebas | 107 (`--filesOnly`) y 1182 líneas con ` > ` |
| `npx vitest list` (frontend) | 90 archivos y 1230 pruebas (1232 líneas) | 90 y 1230 casos con ` > ` (1232 líneas) |
| Suma por archivo (backend) | avisos 2, texto 4, muro 22, muro-autorizacion 9, clases.integracion 1: 38 | igual: 2, 4 (5 − 1), 22, 9 y 1 (22 − 21) |
| Suma por archivo (frontend) | formulario-publicacion 7, muro-view 5, publicacion-del-muro 10, con-clase 1, alumnos-view 2, lib 2, formulario-clase 1, inicio-estudiante 1: 29 | igual |
| IDs de "Pruebas requeridas" (c) | 57, ninguno sin caso | 57 de 57. Cada archivo coincide con el de la tabla del plan, y cada título aparece **exacto y una sola vez** en mi lista (cotejo por programa, hasta el fin de línea). Ninguno falta ni sobra respecto de PR-C01a a PR-C13d |
| `enEspera=` | 35 | 35 |
| V-01 | 87 de 87 | 87 de 87 |

Además corrí aislados los dos archivos del muro (`npx vitest run test/muro.integracion.test.ts test/muro-autorizacion.integracion.test.ts`): `31 passed (31)` en 14.27 s, sin ningún término de PA-07. PR-C02a y PR-C02b, que cayeron por tiempo en mi corrida de la raíz, son víctimas de la misma espera en cadena (todo `POST` autenticado lee `usuarios` en `withProfile`), no pruebas propias intermitentes: **PA-12 no se activa.**

### V-01 a V-07
- **V-01:** `sha256sum` de las 87 `*.ataque` de `git ls-files -co --exclude-standard`, contra las 87 filas de la tabla de "CLASES-c — Ronda 0" de `reporte-tester.md`, comparadas por programa con `diff`: **87 de 87 iguales.** Las tres con cambios contra `e9df1f0` son las de la ronda 0 (C-2, C-12 y C-19).
- **V-03 (desde `backend/`, cada uno con código 0):**
  - `prisma validate` → "is valid";
  - `prisma format --check` → "All files are formatted correctly!";
  - `prisma generate` → "Generated Prisma Client (7.10.0)";
  - `prisma migrate status` → "8 migrations found… Database schema is up to date!";
  - `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → "No difference detected.".

  `20261002003225_publicaciones_y_comentarios/migration.sql` es idéntica a §D-C1, con el `CHECK publicaciones_titulo_segun_tipo` al final.
- **V-04 (producción, sin pruebas):** todas dan lo que pide el plan.
  - `$queryRawUnsafe`: 1 (`adapters/db/cliente.ts:60`); `$executeRawUnsafe`: 0. SQL etiquetado en `adapters/db`: `salud`, `bloqueo-usuario`, `enlaces-registro`, `invitaciones` y, nuevo, solo `publicaciones.ts:183` (el `FOR SHARE`, parametrizado con `::uuid`).
  - `addHook` en `handlers/`: 0. `console.` en los tres archivos nuevos del backend: 0. `estadoPago` en el código de `backend/src`: los mismos 8 archivos que en `e9df1f0`. La única mención nueva es una línea de `handlers/README.md` que dice que ninguna respuesta del muro lo lleva.
  - `enEspera=`: 35. `vidrio-azul` solo en `bloque-destacado.tsx` (y su definición en `tokens.css`). `from "@/features/auth` en `features/clases`: 0. `dangerouslySetInnerHTML` y `target="_blank"`: 0. `fetch(` solo en `services/apiClient.ts` (líneas 70 y 117).
  - `autoComplete="off"`: buscador, formulario de la clase, formulario de unirse y los dos formularios nuevos del muro.
  - (Enmienda 6) `Default_Ignorable_Code_Point` solo en `shared/src/auth.ts` y `shared/src/clases.ts`, y 0 en `backend/src` y `frontend/src`. `contarCaracteresVisibles` se define solo en `shared/src/clases.ts:65`. `claseId ?? ""` aparece solo en `components/formulario-clase.tsx:29`. `focoPerdido` se define solo en `lib.ts:56`, y `hooks.ts` la importa sin exportarla. `toast` en `buscador-alumnos.tsx`: 0.
- **V-05:** `git diff --quiet e9df1f0 -- <ruta>` termina con código 0 y `git status --porcelain` sale vacío en **todas** las rutas de "No se toca" (comunes y de c), incluidas `src/middleware/**`, `services/**`, `components/*.tsx` y `adapters/db/inscripciones.ts`.
  - En `styles/**` solo cambia `clases-r1.ataque.test.ts`, que es del tester (ronda 0).
  - Migraciones: `git diff --name-only` sale vacío y hay una sola carpeta nueva sin seguimiento.
  - `eslint.config.mjs` es igual al de `<Ca>`; `backend/package.json` y `package-lock.json`, iguales a los de `<R>`; `infra/`, `.claude/` y `.codex/`, iguales a `<R>`.
  - Los seis archivos protegidos de `docs/` y de la raíz (`ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIALS.md`, `PRD.md`, `AGENTS.md`, `CLAUDE.md` y `README.md`) coinciden con los SHA-256 de `aprobacion.md`, "Cierre de CLASES-b".
  - Fuera de los paquetes solo cambia `docs/DESIGN.md` (paso 33).
  - Mis corridas no dejaron cambios en el árbol: 32 archivos rastreados modificados y 16 sin seguimiento, antes y después.
- **V-06:** no arranqué la API.
  - La lista exacta la verifica el caso de `backend/test/sesiones-y-cadena.ataque.test.ts` que recorre `obtenerApp().printRoutes({ commonPrefix: false })` y la compara con 54 rutas literales: las 45 anteriores más las 9 de c, con sus `HEAD`. Ese caso pasó en mi corrida del paquete.
  - `handlers/clases/muro.ts` registra exactamente 7 rutas; sus 2 `GET` suman 2 `HEAD`.
  - `RUTAS_PUBLICAS` sigue con 10, y `middleware/` no cambió.
  - Ninguna ruta contiene "movimiento".
- **V-07:** ver la tabla de cifras.

### Diff de las pruebas que no son `*.ataque` (Enmienda 7 y PA-16)
- **`backend/test/bloqueo-usuario.integracion.test.ts` contra `e9df1f0`:** dos hunks, y nada más:
  - la última línea del comentario del caso E6 sigue con "CLASES-c, §D-C3/V-04:", y se suma una línea: "publicaciones.ts suma el SELECT … FOR SHARE de crearComentario (Enmienda 7)";
  - el título pasa a "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts y publicaciones.ts usan SQL etiquetado en adapters/db";
  - la lista del `toEqual` suma `"publicaciones.ts"` en orden alfabético.

  No cambian el patrón, la lectura del directorio ni ninguna aserción. Es exactamente lo que autoriza la Enmienda 7.
- **Alcance:** `git diff --name-only e9df1f0 -- backend/test frontend/src` más los archivos sin seguimiento dan 11 archivos de pruebas modificados y 7 nuevos.
  - Los 7 nuevos son los "Nuevos" de c.
  - De los modificados, 7 son los "del propio encargo que se extienden", 1 es el que autoriza la Enmienda 7 y 3 son las `*.ataque` de la ronda 0.

  Ninguno queda fuera de la lista cerrada.
- **Los archivos "del propio encargo que se extienden" solo suman casos, con una excepción equivalente:** en `backend/test/clases.integracion.test.ts:128`, un U+202E escrito tal cual pasó a su escape. La cadena tiene el mismo valor ("Clase" + U+202E + "mala"; lo comprobé con Node). Lo cambió el script con que el programador restituyó los escapes, y el resumen dice "solo se agregaron casos". Ver N-C4.

### Revisión a vuelo de pájaro (no es la revisión final)
- **Cadena de las 7 rutas de `handlers/clases/muro.ts`:** cada una usa `protegido({ roles, pertenencia })` tal como en la tabla de §D-C2:
  - `inscripcion` con estudiante y maestro en `GET …/publicaciones`, en `GET` y `POST …/comentarios` y en `DELETE …/mis-comentarios/:comentarioId`;
  - `propiedad` con solo maestro en `POST …/publicaciones`, `DELETE …/publicaciones/:publicacionId` y `DELETE …/comentarios/:comentarioId`.

  La clase sale de `claseDe(request)`, que es el sexto paso real. Ningún handler verifica rol, propiedad o inscripción a mano, ni importa `notifier`, ni lleva `try/catch`.
- **Ids y cola:** el handler genera `publicacionId` y `comentarioId` con `randomUUID()` antes de llamar al adaptador, y ese id es también el `id` del trabajo. `crearPublicacion` y `crearComentario` abren `enTransaccion`, insertan y llaman a `alGuardar(ejecutorSqlDe(tx))`. El handler pasa `(sql) => encolar(cola, aviso, { id, sql })`. Los datos del trabajo llevan solo ids.
- **`FOR SHARE`:** es el único SQL crudo nuevo; va etiquetado y parametrizado. Sin fila, `crearComentario` devuelve `null` sin insertar, y el handler responde `404`.
- **Alcance de las consultas:** toda consulta por `publicacionId` o `comentarioId` filtra además por la clase (`deleteMany` con `publicacion: { claseId }`, y "mis comentarios" con `autorId`). El conteo de comentarios es un solo `groupBy` por página, fuera de ciclos.
- **`adapters/queue/colas.ts`:** suma exactamente las cuatro colas de §D-C3. `AVISO_FALLIDO` va primero, sin reintentos y con 7 días de retención. Las otras tres llevan `retryLimit` 3, `retryDelay` 30, `retryBackoff`, `expireInSeconds` 300, `deadLetter` `AVISO_FALLIDO` y `retentionSeconds` y `deleteAfterSeconds` de 604,800.
- **Frontend:**
  - Los textos nuevos viven en `data.ts`. No hay texto suelto en JSX ni en `aria-label` o `placeholder`.
  - No hay `?? []`, `disabled` ni ternarios anidados (los tres ternarios son simples).
  - No hay tipos fuera de `types.ts` salvo las Props.
  - Los estados siguen el orden error, cargando, vacío y datos.
- **Regla de contenido visible:** vive solo en `shared/src/clases.ts`: `contarCaracteresVisibles`, los dos mínimos y `textoConContenidoSchema`. La usan `nombreClaseSchema` (último `refine`), el texto del anuncio, el título del material y el comentario. El frontend valida con esos mismos esquemas (`safeParse`) antes de enviar.
- **`docs/DESIGN.md`** (`git diff e9df1f0`) solo cambia en tres lugares, todos marcados "propuesta":
  - **§7.3:** una viñeta nueva, "Grupo de dos botones para elegir un tipo". El estado no depende del color: lleva un icono `Check`.
  - **§7.14:** el párrafo de implementaciones sube justo después de las tres viñetas de la confirmación en línea, empieza con "Implementan la confirmación en línea" y conserva las mismas dos referencias.
  - **§7.18 nueva:** "Publicación del muro y comentarios".

### Desviaciones declaradas
1. **`publicacionRespuestaSchema`, `comentarioRespuestaSchema` y `autorDelMuroSchema` en `shared/`: ACEPTADA.** Son los envoltorios de las respuestas que §D-C2 ya fija (`201 { publicacion }`, `{ comentario }` y el `autor`). Por la regla 7 de `CLAUDE.md`, los tipos de la API salen de `shared/`; declararlos a mano habría sido peor. Los esquemas de parámetros están en "Cambios por capa".
2. **`MuroView` también usa `ConClaseDeLaRuta`: ACEPTADA.** `muro-view.tsx` se reescribe en c de todos modos, y sin la guarda habría nacido un `claseId ?? ""` nuevo que V-04 no admite. El rol que decide el prefijo de la ruta es solo de presentación: el backend lo exige por su cuenta.
3. **Avisos de borrar publicación y borrar comentario en los callbacks de los hooks: ACEPTADA.** Es el mismo razonamiento de §D-C5 bis: el componente se desmonta cuando llega la lista nueva, y los callbacks de `mutate` no correrían. Ver N-C5 para los avisos de crear, que no siguieron ese criterio.
4. **Escapes restituidos con un script: ACEPTADA,** con N-C4. Lo que importa (escapes en el código de las pruebas, sin invisibles reales) se cumple.
5. **"Ver más clases" busca la tarjeta nueva por su `a[href]`: ACEPTADA.** `tarjeta-clase.tsx` no está autorizado en c.

### PA-07 (arbitraje)
- **Mis corridas:**
  - en la corrida de la raíz (que cayó por CHORE-02) y en la del paquete (limpia): `40P01`, `deadlock detected`, `could not serialize` y `too many clients`, 0;
  - las líneas de log con `P2028` son exactamente 2 en cada corrida: `tx.sesion.create()` en `adapters/db/sesiones.ts:39` (login) y `tx.tokenCuenta.updateMany()` en `adapters/db/tokens-cuenta.ts:116` (restablecer);
  - en la raíz, `grep -c` da 4 porque suma 2 líneas del resumen de fallos: el título del caso de `cuentas-r3`, que contiene "(P2028)", y que cayó por tiempo. No son errores.
- **Decisión sobre las repeticiones de esas dos llamadas en las corridas que caen por CHORE-02: no cuentan como PA-07.** Se cumplen cuatro condiciones:
  - **(a)** los otros cuatro términos están en 0;
  - **(b)** todo `P2028` sale de los dos flujos aceptados de `cuentas-r3`: `POST /api/auth/login` y `POST /api/auth/restablecer`. El `sesiones.ts:110` que reportó una vez el programador es `revocarTodasLasSesiones`, que corre dentro de la misma transacción de restablecer, después de `bloquearUsuarioParaEscribir`. Es el mismo `P2028` aceptado, cortado en otra sentencia;
  - **(c)** la corrida repetida y limpia trae exactamente los dos aceptados;
  - **(d)** ningún `P2028` toca una ruta o una tabla de CLASES.

  La exclusión de PA-07 se lee **por flujo y transacción, no por número de línea**. En cambio, un `P2028` en una corrida limpia fuera de esos dos, o en cualquier ruta de c (en particular `crearComentario` con su `FOR SHARE`), **sí** es PA-07. El conteo se hace sobre las líneas de log (`"code":"P2028"` o el sitio de la llamada), no con un `grep -c` que también cuente títulos de casos.
- **PA-11:** `docker ps -a` a las 19:28:13, más de 120 s después de la última corrida del backend: solo los 4 contenedores de `infra/`, sin Testcontainers.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
#### N-C4 — Una línea existente de `clases.integracion.test.ts` cambió, y el resumen dice "solo se agregaron casos"
- **Dónde:** `backend/test/clases.integracion.test.ts:128`, un caso de a.
- **Arbitraje:** no activa PA-16. El caso no se reescribió: la cadena tiene el mismo valor y ninguna aserción cambió. Además, el cambio va en el sentido que pide el plan (escapes, no invisibles reales). No pido revertirlo.
- **Qué se espera:** que el resumen de la próxima entrega lo declare como cambio de un caso existente, con su motivo. Un script que reescribe archivos de pruebas en bloque debe limitarse a las líneas que el programador agrega.

#### N-C5 — Los avisos de crear publicación y comentario viven en los callbacks de `mutate`
- **Dónde:** `components/formulario-publicacion.tsx:48-61` y `components/formulario-comentario.tsx:41-52`.
- **El problema:** es la misma clase de defecto que §D-C5 bis corrigió en "Agregar a la clase". Si el bloque de comentarios se cierra ("Ocultar comentarios") o la persona sale de la vista con el `POST` en vuelo, el formulario se desmonta. TanStack Query ya no llama a esos callbacks: no sale "Comentario publicado" ni, peor, el aviso de error, y la persona no sabe que su comentario no se guardó.
- **Por qué no bloquea:** el plan no lo exige. Va a la lista del tester; si lo confirma, el remedio es el de §D-C5 bis (los avisos, en los callbacks del hook).

#### N-C6 — El cursor de `GET …/publicaciones` y `GET …/comentarios` no se valida (pendiente que declaró el programador)
Lo señala el propio programador. Usan el `cursor` de Prisma sobre la PK, como dicen §D-C2 y "Acceso a datos", pero sin comprobar que la fila del cursor sea de esa clase o de esa publicación. Eso da tres comportamientos:
- **un cursor borrado** da una página vacía, y "Ver más" esconde el resto (el T-18 de a);
- **el id de una publicación de otra clase** posiciona la página según la fecha de una fila ajena: es un oráculo de existencia, débil porque los ids son UUID aleatorios;
- **un cursor de comentario de otra publicación** posiciona igual.

En a, C-16 resolvió el mismo caso con `400 VALIDACION` "cursor: no es válido". Va a la ronda 1. Si el tester lo confirma, lo arbitro en la revisión final: el plan no pide validar aquí, así que hará falta una enmienda o la decisión del humano.

### Detalles menores
- PR-C04d cuenta en `pg_stat_activity` toda sesión con `wait_event_type = 'Lock'` y `FOR SHARE` en la consulta, no solo la de su prueba. Hoy solo `crearComentario` hace `FOR SHARE`, así que no hay falsos positivos. Si otra prueba de c lo hiciera en paralelo, la espera podría confirmarse antes de tiempo.
- `DESIGN.md` §7.18 omite el `size="sm"` de "Ver más comentarios" que fija §D-C5. Se puede corregir en la revisión final.
- La sección "Desviaciones del plan" del resumen dice "Ninguna de diseño", y las desviaciones reales están en "Decisiones y detalles". Conviene listarlas en "Desviaciones".

### Enmienda 7 (modo plan, breve): APROBADO
- **El diff es solo lo declarado.** `git diff -U0 e9df1f0 -- plan.md` da 28 hunks, 216 inserciones y 19 borrados (SHA-256 `0E833ED8…`, igual al de `aprobacion.md`). Frente a mi verificación de la Enmienda 6 (27 hunks, 196 inserciones), lo nuevo es esto:
  - la línea de la Enmienda 7 en la cabecera (hunk 1);
  - la sección nueva, 18 líneas, dentro del hunk de la cabecera de enmiendas;
  - la viñeta de "Ronda 0", punto 2 (el único hunk nuevo, línea 1862);
  - la celda "existentes que se modifican" de la fila c de las listas cerradas, y la frase de la Enmienda 7 en el paso 32. Las dos son cambios dentro de hunks que ya existían.

  En total, 196 + 1 + 18 + 1 = 216. No hay nada en §D, PARADAS, "No se toca" ni V-xx.
- **Fondo:**
  - **Lista literal ampliada en lugar de derivarla de V-04: correcto.** El valor de E6 está en que cada archivo nuevo con SQL etiquetado exija una autorización explícita. Derivar la lista del código o de V-04 la volvería una tautología: pasaría siempre.
  - **PA-16 cerrada solo para ese archivo y ese caso: correcto.** El alcance es mínimo, y cualquier otro cambio vuelve a activarla.
  - **Regla de la ronda 0 para d y siguientes (buscar listas cerradas también en las pruebas normales): correcta,** y es la lección real de esta parada. Sugerencia sin efecto de bloqueo: en la ronda 0 de d, el tester puede buscar, en todo `backend/test` y `frontend/src`, `readdir`, `import.meta.glob`, `?raw` y `toEqual([` con nombres de archivo, no solo en las `*.ataque`. d no agrega SQL etiquetado, según el arquitecto. Si llegara a necesitarlo para confirmar archivos, E6 volvería a saltar, y la regla nueva lo detectaría antes de programar.

### Lista de puntos de ataque para la ronda 1 del tester (CLASES-c)
1. **Cursor sin validar (N-C6)** en `GET …/publicaciones` y `GET …/comentarios`. Cuatro casos:
   - el cursor de una publicación o un comentario borrado entre dos páginas, que deja una página vacía y oculta el resto;
   - el id de una publicación de otra clase como cursor (oráculo de existencia y de fecha);
   - el id de un comentario de otra publicación;
   - un UUID inexistente frente a uno ajeno: ¿la respuesta es idéntica?

   Compara con el comportamiento de C-16 en `inscritas` e `impartidas`.
2. **Concurrencia comentar y borrar, en los dos órdenes:**
   - PR-C04d cubre el borrado que toma la fila primero. Ataca el orden inverso: el `FOR SHARE` del comentario ya tomado, y el `DELETE` de la publicación esperando y borrando en cascada. Que no haya `500` ni comentario huérfano, que la respuesta del comentario sea coherente y que el trabajo `COMENTARIO_CREADO` quede apuntando a un comentario ya borrado (anótalo: NOTIFICACIONES tendrá que tolerarlo);
   - borrar un comentario y su publicación a la vez;
   - dos `DELETE …/mis-comentarios/:id` simultáneos: uno `204` y otro `404`.

   En ningún caso un `P2028`; si aparece, es PA-07 (ver el arbitraje).
3. **Cola transaccional:**
   - si `encolar` lanza, la transacción se revierte, sin publicación ni comentario;
   - el id del trabajo coincide con `publicacionId` o `comentarioId`, y un id repetido no duplica;
   - los datos del trabajo llevan solo ids (ningún texto, nombre ni correo);
   - las colas tienen `deadLetter`, reintentos y retención;
   - ningún worker registra un consumidor para esas colas (no lo hay hasta NOTIFICACIONES);
   - borrar una publicación no encola nada.
4. **Regla de contenido visible en los tres lados (`shared/`, backend y los tres formularios):**
   - nombre, título del material, anuncio y comentario hechos solo de `Cf`, rellenos Hangul, Braille en blanco, U+1D159, marcas combinantes sueltas o espacios Unicode, en `POST` y `PUT`;
   - un nombre con un solo visible;
   - emojis compuestos y otros alfabetos aceptados;
   - el mismo mensaje en el formulario y en el `400` del servidor;
   - el campo ausente o que no es texto, con mensaje en español;
   - la normalización de CRLF antes de validar;
   - los máximos en unidades de UTF-16 (5,000 y 5,001; 200 y 201; 1,000 y 1,001);
   - los caracteres de control y los inversores de dirección;
   - que no haya una copia de la regla fuera de `shared/`.

   **No son hallazgo** (§D-C4): un `Cf` en medio de un texto con contenido visible, un opcional sin contenido visible y un carácter que se ve vacío solo en algunas fuentes.
5. **Triviales heredados de b (en la regresión):**
   - el aviso de "Agregar a la clase" con la fila desmontada, una sola vez y sin duplicados (éxito, neutro y error);
   - el foco de §7.14 en el buscador y en el roster igual que antes, tras mover `focoPerdido`;
   - las cinco vistas con `ConClaseDeLaRuta` (las cuatro del plan más `MuroView`): sin `:claseId`, muestran el error y no piden nada.
6. **Foco de los tres "Ver más" (publicaciones, comentarios y clases):**
   - con teclado, al cargar la última página, el foco va al primer elemento nuevo o, si no llegó nada, al encabezado; nunca a `<body>`;
   - un render sin desmontaje no mueve el foco ni se lo quita a un control que la persona eligió;
   - "Ver más clases" encuentra la tarjeta nueva por su `a[href]`;
   - el foco tras borrar una publicación o un comentario va a la vecina o, si no hay, al encabezado.
7. **Avisos perdidos al crear (N-C5):** "Ocultar comentarios", o navegar, con el `POST` de un comentario o de una publicación en vuelo, tanto con éxito como con error. Además, que los avisos de borrar (ahora en los hooks) salgan una sola vez.
8. **Alcance y fugas:**
   - el `publicacionId` o el `comentarioId` de otra clase con el `claseId` propio, en las 7 rutas;
   - un comentario de otra publicación de la misma clase en `DELETE …/publicaciones/:publicacionId/comentarios/:comentarioId`;
   - "mis comentarios" con el comentario de otro;
   - el recorrido recursivo de toda respuesta del muro, incluido el `autor`, sin `estadoPago`, `email` ni `accesoRestringido`;
   - `propio` correcto para el alumno y para el maestro.
9. **Texto como texto:** XSS en el título, el anuncio, el comentario y el nombre del autor. Saltos de línea con `whitespace-pre-line`. Doble envío de "Publicar" y "Comentar" (`enEspera`). Confirmaciones en línea con el foco en "Cancelar".
10. **PA-10 en logs** (`LOG_LEVEL=trace`, como `api-real` y `logs-*`): las rutas del muro no registran tokens, cookies ni cuerpos con datos sensibles, y el encolado no deja en el log nada más que ids.
11. **Rol por el prefijo de la ruta en `MuroView`:** un estudiante en una ruta `/maestro/…` no ve el formulario. Si lo viera, el backend debe negar el `POST` igual (no se oculta en la interfaz lo que el backend niega).

## Arbitrajes de la ronda 1 — CLASES-c
Fecha: 2026-10-01. Solo lectura, sin suites (por instrucción del orquestador). Fuente: `reporte-tester.md`, "CLASES-c — Ronda 1" (líneas 2596 a 2861).
**Resultado:** los cinco hallazgos se corrigen en el código. T-29, T-31, T-32 y T-33 necesitan antes una **Enmienda 8** del arquitecto, corta (detalle al final). Ninguno necesita una decisión del humano: T-29 aplica a c una regla que el humano ya decidió en a (T-18).

### T-29 — Cursor borrado en el muro y en los comentarios: opción (b), enmienda del arquitecto, sin el humano
- **Por qué no basta (a).** §D-A4 escribe el "principio común" dentro de CLASES-a y lo aplica solo a `inscritas`, `impartidas`, personas y roster. Para c, §D-C2 y "Acceso a datos" describen `listarPublicaciones` y `listarComentarios` sin la lectura previa del cursor. El programador no puede agregar una consulta que el plan no tiene, y el tester no puede pedir algo que el plan no dice. El fondo, en cambio, ya está decidido:
  - el humano aprobó T-18 como regla;
  - el plan la generalizó en el "principio común";
  - la clave de orden de c (`publicaciones.creado_en` y `comentarios.creado_en`) desaparece con la fila, que es exactamente el caso de `inscritas`.

  Basta con que el plan lo diga.
- **Criterio exacto de la corrección:**
  1. **`listarPublicaciones`:** con `cursor`, primero una lectura por PK de `publicaciones` con `id = cursor` y `clase_id = claseId`. Si no hay fila, `AppError` `400 VALIDACION` "cursor: no es válido", con el mismo código y mensaje que `errorCursorInvalido` de `adapters/db/clases.ts`. Si hay fila, pagina como hoy.
  2. **`listarComentarios`:** se conserva el orden actual. Primero se comprueba la publicación en la clase (si no está, `404 PUBLICACION_NO_ENCONTRADA`, aunque haya cursor). Después, con `cursor`, una lectura por PK de `comentarios` con `id = cursor` y `publicacion_id = publicacionId`. Si no hay fila, `400 VALIDACION` "cursor: no es válido".
  3. **Sin oráculo:** un cursor borrado, uno de otra clase o de otra publicación y un UUID inexistente reciben la misma respuesta, byte a byte. Un cursor que no es UUID sigue respondiendo lo que hoy da `paginacionSchema`.
  4. **Una consulta por PK,** fuera de ciclos y sin transacción. Residual aceptado, igual que en a: si la fila se borra entre la lectura y la página, puede salir una página vacía (ventana de milisegundos).
  5. **El frontend no cambia:** el `400` de "Ver más" llega como `isError` y se muestra con `MensajeError`, con el foco en el encabezado (T-27, ya cubierto por el tester).
  6. **Pruebas normales** en `backend/test/muro.integracion.test.ts` (archivo nuevo de c, se extiende): una para publicaciones y otra para comentarios (propuesta: PR-C03f y PR-C04e). Cada una cubre un cursor borrado → `400` "cursor: no es válido", un cursor ajeno idéntico a un UUID inexistente, y un cursor válido que sigue paginando.

  Los cuatro casos del tester de T-29 en `muro-c-r1.ataque.test.ts` deben pasar sin tocarlos.

### T-32 — Los máximos cuentan puntos de código: se corrige el plan, no el esquema
- **Es una premisa falsa del plan, no un defecto del código.** El comportamiento es deliberado y está documentado en zod 4: `$ZodCheckMaxLength` mide las cadenas en puntos de código (lo dice el comentario de `node_modules/zod/v4/core/checks.js`). Frontend y backend usan el mismo esquema, así que no se desvían entre sí. Cambiar el esquema para contar unidades de UTF-16 sería código nuevo sin requisito detrás, y rompería la coherencia con el término de búsqueda de b, que mide en puntos de código por diseño, y con el conteo de visibles.
- **Unidad que declara el plan: puntos de código, para todos los `max` y `min` de cadena de `shared/`.** Eso incluye los de c (título 200, anuncio y descripción del material 5,000 y comentario 1,000) y los de a: `nombreClaseSchema` (120; también su `min(2)`, observación 6 del tester) y `descripcionClaseSchema` (2,000). En a no cambia nada del código: el plan solo deja de afirmar algo falso. Consecuencias que hay que escribir:
  - un texto puede guardar hasta el doble de unidades UTF-16 de su máximo. No hay límite de columna (`TEXT`), así que no es un riesgo;
  - el `maxLength` del navegador cuenta unidades UTF-16. Hoy solo lo usa el buscador de b, que ya lo documenta en un comentario. Si algún campo lo usara, sería más estricto que el servidor, nunca más laxo. No hace falta agregar ni quitar `maxLength`.
- **Pruebas:**
  - el caso "máximos en unidades de UTF-16…" de `muro-c-r1.ataque.test.ts` es del tester y de esta misma ronda. Lo reescribe el tester según el plan corregido (2,500 emojis + "a" = 2,501 puntos de código → `201`; 5,000 emojis + "a" → `400`), sin debilitar los 10 subcasos ASCII. Debe quedar en la tabla de hashes nueva, como C-16;
  - ninguna prueba normal cambia por T-32.
- **Corrección a mi propia lista de la ronda 1 (punto 4):** decía "los máximos en unidades de UTF-16". Era la misma premisa falsa, y queda corregida aquí.

### T-30 — Avisos de crear publicación y comentario: confirmado, con este criterio
1. **Los avisos van a los callbacks de `useCrearPublicacion` y `useComentar`** (`hooks.ts`), como en §D-C5 bis:
   - `onSuccess`: la invalidación de hoy y `toast.success` ("Publicado" o "Comentario publicado");
   - `onError`: `toast.error(mensajeDeErrorClases(error))`, **salvo** si el error es de un campo del formulario (lo que hoy detecta `erroresDeFormularioClases` con `["titulo", "texto"]` o `["texto"]`). En ese caso el hook no avisa y el campo lo muestra el componente.
2. **El componente** llama a `mutate` solo con callbacks de estado local: en `onSuccess`, limpiar los campos; en `onError`, poner los errores de campo. No importa `toast` para crear. Como TanStack Query no llama a esos callbacks si el componente se desmontó, "limpiar el formulario solo si sigue montado" sale solo.
3. **Cada aviso sale una sola vez:** éxito, error de red o `500`, con el formulario montado o desmontado (cerrar los comentarios o salir del muro). Ningún aviso duplicado con el formulario montado.
4. **Residual aceptado:** un error **de campo** del servidor con el formulario ya desmontado no se avisa. Solo ocurre si el servidor rechaza un campo que el formulario validó, y T-31 cierra esa diferencia.
5. **Pruebas normales:** en `formulario-publicacion.test.tsx` y `publicacion-del-muro.test.tsx` (archivos nuevos de c, se extienden), éxito y error con el formulario desmontado y montado, una vez cada uno. Los cuatro casos de T-30 del tester deben pasar sin tocarlos.

### T-31 — El formulario mide antes de normalizar: confirmado, con `normalizarTextoLargo` en `shared/`
- **Acepto la propuesta del orquestador:** mover `normalizarTextoLargo` a `shared/src/clases.ts` (una sola definición, como `normalizarTerminoDeBusqueda` en b). `backend/src/core/clases/texto.ts` la reexporta, así que los handlers y `core/clases/texto.test.ts` no cambian; si se prefiere, la importa de `@campus/shared`, como `core/clases/busqueda.ts`. Descarto replicarla en el frontend, porque serían dos copias de una regla, el mismo problema que dejó `contarVisibles` en `auth.ts`.
- **Criterio:**
  - `FormularioPublicacion` y `FormularioComentario` aplican `normalizarTextoLargo` a los textos que el servidor normaliza (título y texto; comentario) **antes** de `safeParse`, y envían el valor normalizado (`resultado.data`);
  - el servidor sigue normalizando por su cuenta;
  - mismo resultado y mismo mensaje en los dos lados: 1,000 caracteres seguidos de un salto de línea se envían; 1,001 sin saltos se rechazan en el formulario con el mensaje del servidor;
  - el campo visible no se reescribe mientras la persona escribe.
- **Fuera de alcance:** `formulario-clase.tsx` (la descripción de a tiene el mismo patrón) no está autorizado en c. Queda como pendiente con destino en `docs/ESTADO.md` §3, junto al `claseId ?? ""` de ese mismo archivo.
- **Pruebas normales:** PR-C12d sigue en `texto.test.ts` sin cambios. Se suma un caso por formulario en `formulario-publicacion.test.tsx` y `publicacion-del-muro.test.tsx`. Los dos casos de T-31 del tester deben pasar sin tocarlos.

### T-33 — Mensajes en inglés de `tipo` y de la descripción del material: confirmado
- **`crearPublicacionSchema`:** el `discriminatedUnion` lleva `error` en español para el `tipo` ausente o desconocido. Texto propuesto (§D-C6, propuesta): "Elige si es un anuncio o un material". El servidor responde "tipo: Elige si es un anuncio o un material".
- **La descripción opcional del material** usa un `z.string({ error: … })` con mensaje en español. Texto propuesto: "La descripción debe ser texto". Su comportamiento con una cadena no cambia: opcional, máximo 5,000 y sin mínimo de visibles.
- **`descripcionClaseSchema` de a no se toca:** la Enmienda 6 lo dejó sin cambio a propósito. Va como pendiente con destino a `ESTADO.md` §3.
- **Pruebas normales:** un caso en `muro.integracion.test.ts` con los 4 casos del tester: sin `tipo`, `tipo: "tarea"`, `texto: 5` y `texto: null` en un material. El caso de T-33 del tester debe pasar sin tocarlo.

### Enmienda 8 del arquitecto (antes de la corrección del programador)
La redacta el arquitecto y la transcribe el orquestador, como la 6 y la 7. Solo estas líneas:
1. **§D-C2, nota debajo de la tabla, y "Acceso a datos":** en las filas `listarPublicaciones` y `listarComentarios`, el paso "1. Con cursor, `publicaciones` (o `comentarios`) por PK dentro de la clase (o la publicación); si no hay fila, `400` (§D-A4, principio común; T-29)". En la columna "Índice", PK.
2. **§D-C4:** la viñeta "Los máximos no cambian" pasa a decir que cuentan en **puntos de código** (zod 4), con la consecuencia de las unidades UTF-16 y el `maxLength`, y que vale igual para los `max` y `min` de a. Lo mismo en "Puntos de ataque" (c), punto 4 (5,000/5,001 en puntos de código).
3. **§D-C4, "Dónde vive":** `normalizarTextoLargo` pasa a `shared/src/clases.ts`. "Cambios por capa" (`shared/`: suma `normalizarTextoLargo`; `core/`: `texto.ts` la reexporta; frontend: los dos formularios del muro normalizan antes de validar). Si el arquitecto lo prefiere, conviene una línea en V-04: `normalizarTextoLargo` se define solo en `shared/src/clases.ts`.
4. **§D-C5 (o §D-C5 bis):** el criterio de avisos de T-30 (puntos 1 a 4 de arriba) para `useCrearPublicacion` y `useComentar`.
5. **§D-C6:** los dos mensajes nuevos de T-33.
6. **"Pruebas requeridas" (c):** los IDs nuevos (propuesta: PR-C03f, PR-C04e, PR-C14a y PR-C14b para T-30, PR-C15a y PR-C15b para T-31, y PR-C16 para T-33), todos en archivos nuevos de c que ya están en la lista cerrada. La lista cerrada no cambia.
7. **"Pendientes":** la normalización y la descripción de `formulario-clase.tsx` (a) y el mensaje de tipo de `descripcionClaseSchema` (a), a `ESTADO.md` §3.
8. **Ronda del tester:** el tester reescribe su caso de T-32 según el punto 2, y la tabla de hashes de la ronda 1 se actualiza para esa fila antes de que el programador corra V-01.

No cambian §D-C1, §D-C3, PARADAS, "No se toca" ni la lista cerrada de archivos.

## Verificación del resumen — CLASES-c — corrección de la ronda 1
Fecha: 2026-10-01. Revisé el resumen del programador ("CLASES-c — corrección de la ronda 1", línea 1326 de `resumen-programador.md`) contra el plan de la Enmienda 8 (SHA-256 `23E467B1…`, el mismo que anota `aprobacion.md`) y contra mi arbitraje de la ronda 1.
**Veredicto del resumen: ACEPTADO.** Cada cifra coincide con mi corrida, y los 65 IDs PR-C tienen archivo y título exacto. Pasa a la ronda 2 del tester.
**D-1: (a), se acepta la copia de `errorCursorInvalido`.**
Verificación propia: lint 0 · build 0 · test de la raíz con el backend en rojo por CHORE-02 (solo tiempos límite) y, repetido desde `backend/`, en verde · frontend en verde dos veces · V-03 completo en 0.

### Precondiciones
- **PA-01:** comprobé `Enabled True`, `Inbound`, `Block`, `Public` y la red `IZZI-F281-5G` antes de cada corrida del backend. Docker encendido; sin procesos `node` ni contenedores de Testcontainers al empezar.

### Cifras: resumen contra mi corrida
| Cifra | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` (raíz) | código 0; `> tsc -b` | código 0; `> tsc -b` |
| `npm run build` (raíz) | código 0; `✓ built in 688ms` | código 0; `✓ built in 636ms` |
| `npm run test` (raíz) | código 0: backend `109 passed (109)` / `1214 passed (1214)`; frontend `92 passed (92)` / `1258 passed (1258)` | código 1 por CHORE-02. Backend `10 failed / 99 passed (109)` y `11 failed / 1176 passed / 27 skipped (1214)`. Los rojos son 8 "Test timed out in 15000ms", uno de 30 s y otro de 40 s, 4 hooks de 10 s, el `esperarHasta` del worker de correo y el `TypeError` de `api-real:227`. Frontend `92 passed (92)` / `1258 passed (1258)` |
| Backend repetido (`cd backend; npm test`) | corridas 2 y 4 en verde | `Test Files  109 passed (109)` · `Tests  1214 passed (1214)`, código 0 (21:13:51) |
| Frontend por paquete, dos veces | — | `92 passed (92)` / `1258 passed (1258)` las dos, código 0 |
| `npx vitest list` | backend 109 archivos y 1214 pruebas; frontend 92 y 1258 | igual: 109 y 1214; 92 y 1258 (1260 líneas: dos títulos ocupan dos líneas) |
| De dónde salen las sumas | — | Backend: 1182 + 25 (`muro-c-r1.ataque`) + 3 (`logs-muro-c-r1.ataque`) + 3 (`muro.integracion`, de 22 a 25) + 1 (`texto.test`, de 5 a 6) = 1214. Frontend: 1230 + 22 (`muro-c-r1.ataque`) + 2 (`muro-rutas-c-r1.ataque`) + 2 (`formulario-publicacion.test`, de 7 a 9) + 2 (`publicacion-del-muro.test`, de 10 a 12) = 1258 |
| IDs | los 8 nuevos con título exacto; 65 PR-C distintos | 8 de 8 y 57 de 57 con título exacto, una sola vez cada uno (cotejo por programa). 65 IDs PR-C distintos. Cada ID nuevo está en el archivo que fija la tabla de la Enmienda 8 |
| V-01 | 91 de 91 | 91 de 91 contra la tabla de C-20 (`muro-c-r1.ataque.test.ts` = `902CC714…`) |
| V-03 | validate, format y diff en 0; `migrate status` sin correr | Los cinco con código 0: validate, `format --check`, generate, `migrate status` ("8 migrations found… Database schema is up to date!") y `migrate diff --exit-code` |
| `enEspera=` | 35 | 35 |

Corrí aislados los cuatro archivos del muro del backend (`muro.integracion`, `muro-autorizacion`, `muro-c-r1.ataque` y `logs-muro-c-r1.ataque`): `62 passed (62)`, sin ningún término de PA-07. PR-C02e y PR-C03a, que cayeron por tiempo en mi corrida de la raíz, son víctimas de la misma espera en cadena: **PA-12 no se activa.** En el frontend, `muro-c-r1.ataque` y `muro-rutas-c-r1.ataque` dan `24 passed (24)`.

### Alcance y "No se toca"
- **Archivos tocados en la corrección:** los que cambiaron en los paquetes después de mi verificación anterior son exactamente los 11 que declara el resumen, más las 4 `*.ataque` del tester de la ronda 1. Nada más.
- **V-05:** `git diff --quiet e9df1f0` termina con código 0 en todas las rutas de "No se toca", también en `backend/src/adapters/db/clases.ts` e `inscripciones.ts`. Las únicas diferencias están en las rutas que "Cambios por capa" asigna a c (`adapters/queue/colas.ts`, `handlers/clases/muro.ts`, `handlers/README.md`, `prisma/schema.prisma` y la migración nueva) y en las `*.ataque` del tester (`frontend/src/styles` y `frontend/src/app`).
- **Intactos:** `formulario-clase.tsx` y `descripcionClaseSchema`. `shared/src/auth.ts` sigue sin cambios.

### Las correcciones contra el criterio de la Enmienda 8 y del arbitraje
- **T-29 (`adapters/db/publicaciones.ts`): cumple.**
  - Con cursor, `findFirst` por `id` y `claseId` (publicaciones) o por `id` y `publicacionId` (comentarios). Sin fila, `400 VALIDACION` "cursor: no es válido".
  - En `listarComentarios`, la publicación se comprueba antes que el cursor, así que una publicación ajena da `404` aunque haya cursor.
  - Es una consulta por PK, sin transacción ni SQL crudo nuevo; el `FOR SHARE` sigue siendo el único.
  - Sin oráculo: PR-C03f y PR-C04e comparan los cuerpos del cursor borrado, el ajeno y el inexistente, y son iguales.
- **T-30 (`hooks.ts` y los dos formularios): cumple.**
  - `useCrearPublicacion` y `useComentar` avisan en sus callbacks: `onSuccess` invalida y muestra `toast.success`; `onError` sale sin avisar si `erroresDeFormularioClases` lo reconoce como error de campo y, si no, muestra `toast.error`.
  - Los formularios ya no importan `toast`, y su `mutate` solo limpia los campos o marca los errores de campo.
- **T-31: cumple.**
  - `normalizarTextoLargo` se define una sola vez, en `shared/src/clases.ts:67`, con el mismo cuerpo que la original de `core/`. `core/clases/texto.ts` solo la reexporta.
  - Los dos formularios la aplican a título, texto y comentario antes de `safeParse`, envían `resultado.data` y no reescriben el campo visible.
- **T-33: cumple.** El `discriminatedUnion` lleva `{ error: "Elige si es un anuncio o un material" }`, y la descripción opcional del material, `z.string({ error: "La descripción debe ser texto" })`. `textoLargoSchema` se reescribe sobre `textoLargoCon(max, tipo)` sin cambiar su comportamiento, y `descripcionClaseSchema` queda igual que en `e9df1f0`.
- **N-C4:** declarado como cambio heredado. Cerrado.

### D-1 — `errorCursorInvalido` copiado en `publicaciones.ts`: (a), se acepta
- **Exportarlo de `clases.ts` (b) o moverlo a un archivo compartido (c) obligaría a tocar archivos de "No se toca".** `clases.ts` e `inscripciones.ts` lo están, y también `errores.ts`, el lugar natural. Todo para unificar una función de una línea, sin ningún cambio de comportamiento.
- **El precedente ya existe:** `inscripciones.ts` lleva su propia copia desde b, y se aceptó.
- **La equivalencia está cubierta por pruebas:** PR-C03f y PR-C04e comparan el código y el mensaje con la constante esperada.
- **El fallo de la Enmienda 8 (y de mi arbitraje de T-29, punto 1) fue de redacción:** decía "reutilizar" una función que no se exporta. El programador se detuvo como debía. Si algún día se unifican los errores de `adapters/db`, es un refactor aparte (un CHORE), no un pendiente de c.

### PA-07 y PA-11
- **Corrida del paquete (limpia):** `40P01`, `deadlock detected`, `could not serialize` y `too many clients` en 0. `P2028`: 2, los aceptados (`sesiones.ts:39`, login; `tokens-cuenta.ts:116`, restablecer).
- **Corrida de la raíz (CHORE-02):** los otros cuatro términos en 0. `P2028`: 5 líneas. Son los dos aceptados, 2 líneas del título del caso de `cuentas-r3` que cayó por tiempo y **una tercera llamada:** `tx.sesion.findFirst()` en `adapters/db/usuarios.ts:293` (`cambiarContrasenaPropia`), desde `POST /api/auth/cambiar-contrasena`. Esa transacción esperó 36 s el bloqueo de la fila de `usuarios` detrás de la cadena de CHORE-02, expiró y la petición respondió **`500`** ("Error no controlado").
- **Cómo lo leo, según mi propio arbitraje:**
  - no cumple la condición (b) de la exclusión (solo los flujos de login y restablecer), así que **es un `P2028` que PA-07 no excluye**;
  - **no es de c:** es código de AUTH que c no toca, sale de la espera en cadena que solo provoca la suite (`LOCK TABLE usuarios`), y es el mismo mecanismo que los dos aceptados (una transacción interactiva de 5 s que expira esperando un bloqueo);
  - no aparece en la corrida limpia ni en ninguna ruta del muro.

  Por eso **no devuelvo el resumen** (el programador no lo vio en sus corridas, y la limpia lo confirma), pero **lo escalo al humano** (ver "Para el humano").
- **PA-11:** `docker ps -a` a las 21:18:13, después de la corrida aislada: solo los 4 contenedores de `infra/`. El Ryuk de esa corrida ya se había retirado.

### Problemas que bloquean
Ninguno.

### Detalles menores
- Con un cursor borrado, la persona ve en el muro "no es válido": `mensajeDeErrorClases` quita el prefijo `cursor:` del `VALIDACION`. Además, la lista completa se sustituye por `MensajeError`. Es el patrón aceptado en a y b (T-27), pero el texto no dice qué pasó ni qué hacer. Lo pongo en la lista del tester. Si lo confirma, el remedio es un texto propio para `VALIDACION` de `cursor` en `data.ts`; es una decisión de texto, no de seguridad.
- El resumen cita PR-C15b solo por el nombre del archivo (`formulario-publicacion.test.tsx`). La ruta completa se deduce de la línea anterior. No cambia nada.

### Para el humano
- **Un tercer `P2028` en AUTH bajo CHORE-02:** `POST /api/auth/cambiar-contrasena` (`cambiarContrasenaPropia`, `usuarios.ts:293`) respondió `500` tras 36 s de espera de bloqueo en una corrida que cayó por la cadena de `LOCK TABLE usuarios`. No es de CLASES y no bloquea c. Recomiendo una de dos:
  - anotarlo en CHORE-02 junto a los dos aceptados de `cuentas-r3`, con la decisión de si un `P2028` en cualquier transacción de AUTH bajo esa espera se acepta;
  - o que AUTH traduzca la expiración a un error controlado, en lugar del `500`.

  Hasta que decidas, cualquier `P2028` fuera de los dos flujos aceptados es PA-07.

### Lista de puntos para la ronda 2 del tester (CLASES-c)
1. **Regresión de los 9 casos por la razón correcta.** Que pasen por la corrección y no por otra cosa:
   - T-29, por el `400` del adaptador;
   - T-30, porque avisa el hook y no el componente: ningún `toast` en los formularios, y un aviso por evento con el formulario montado;
   - T-31, por la normalización antes de `safeParse`;
   - T-33, por los dos `error` de `shared/`.

   Y la regresión del resto de c, b y a.
2. **Bordes de T-29:**
   - varias páginas: el cursor de la página 3 borrado después de cargar la 2, o borrar la primera de la página siguiente (que no es el cursor) sin perder ni duplicar filas;
   - el borrado concurrente del cursor entre la lectura por PK y la página. El residual de milisegundos está aceptado: no es hallazgo si solo se reproduce con dobles en esa ventana;
   - cursor de una publicación de otra clase del mismo maestro y de un comentario de otra publicación de la misma clase: la misma respuesta que un UUID inexistente;
   - en la interfaz, qué ve la persona tras el `400` de "Ver más" (texto y foco) y si recupera la lista sin recargar (detalle menor de arriba);
   - que una invalidación (crear o borrar con varias páginas cargadas) no reuse el cursor borrado.
3. **T-30 con error de campo y el formulario desmontado** (el residual aceptado: no se avisa). Además:
   - con el formulario montado, un error de campo del servidor (un `400` "texto: …" simulado) marca el campo sin aviso y sin duplicar;
   - un `404 PUBLICACION_NO_ENCONTRADA` al comentar en una publicación ya borrada avisa una sola vez;
   - un doble envío rápido deja un solo aviso;
   - el aviso de éxito sale aunque se cierre el bloque de comentarios y se vuelva a abrir antes de la respuesta.
4. **T-31 con `\r` solo** (texto pegado de Mac antiguo), con extremos en blanco (espacios, tabuladores, saltos y U+FEFF al principio y al final) y con texto que solo tiene blancos:
   - mismo resultado y mismo mensaje en el formulario y en el servidor;
   - que el valor enviado sea el normalizado;
   - el título del material con un salto interior: el servidor lo acepta, porque el título usa la regla de texto largo. Que el formulario haga lo mismo.
5. **T-33 con más tipos:** `tipo` numérico, nulo, arreglo, objeto, en mayúsculas (`"Anuncio"`) o con espacios. Un cuerpo que no es objeto (cadena, arreglo, `null`). Un comentario con `texto` booleano u objeto. Ningún mensaje en inglés en ningún `400` del muro. Lo que no sea de c (la descripción de la clase) se anota, no es hallazgo.
6. **Lo que veo débil:**
   - los avisos de borrar (en los hooks) y los de crear conviviendo en la misma vista sin duplicarse, al crear y borrar seguido;
   - que `normalizarTextoLargo` desde `@campus/shared` y su reexporte en `core/` sean el mismo objeto (PR-C15a) y que no exista otra copia en `frontend/src`;
   - PA-10 de nuevo en `logs-muro`, con los `400` del cursor (que el log no registre más que la ruta y el código).

## Verificación del resumen — CLASES-c — corrección de la ronda 2
Fecha: 2026-10-01. Verifiqué "CLASES-c — corrección de la ronda 2" (`resumen-programador.md`, línea 1404) contra T-34 (`reporte-tester.md`, "CLASES-c — Ronda 2", línea 2976).
**Veredicto del resumen: ACEPTADO.** Ninguna cifra ni ID difiere de mi corrida, y la corrección es mínima. Pasa a la ronda 3 del tester, la última antes de escalar.
Verificación propia: lint 0 · build 0 · `npm run test` desde la raíz en verde a la primera · backend por paquete en verde · frontend dos veces en verde.

### Cifras: resumen contra mi corrida
| Cifra | Resumen | Mi corrida |
|---|---|---|
| PA-01 | regla y red correctas | `Enabled True`, `Inbound`, `Block`, `Public`; `IZZI-F281-5G`. Comprobado antes de cada corrida del backend |
| `npm run lint` (raíz) | código 0 | código 0 |
| `npm run build` (raíz) | `✓ built in 705ms` | `✓ built in 1.00s`, código 0 |
| `npm run test` (raíz) | código 0 en la repetición (la primera cayó por CHORE-02) | código 0 a la primera: backend `111 passed (111)` / `1226 passed (1226)`; frontend `93 passed (93)` / `1272 passed (1272)` |
| Backend por paquete | corrida 2: `111 passed (111)` / `1226 passed (1226)` | `111 passed (111)` / `1226 passed (1226)`, código 0 (21:54:38) |
| Frontend por paquete, dos veces | `93 passed (93)` / `1272 passed (1272)` las dos | igual las dos, código 0 |
| `npx vitest list` | 1226 y 111; 1272 y 93 | 1226 y 111; 1272 y 93 |
| PR-C17 | tres casos, uno por archivo | cada título aparece exacto y una sola vez en `muro-view.test.tsx`, `publicacion-del-muro.test.tsx` y `lib.test.ts` |
| IDs anteriores | — | los 65 siguen con su título exacto; hay 66 IDs PR-C distintos |
| V-01 | 94 de 94 | 94 de 94 contra la tabla de "CLASES-c — Ronda 2" |
| `enEspera=` y `?? []` | 35 y 0 | 35 y 0 |

### Alcance, V-04 y V-05
- **Archivos:** después de mi verificación anterior solo cambiaron los 7 declarados (`lib.ts`, `data.ts`, `muro-view.tsx`, `components/comentarios-de-publicacion.tsx` y sus tres pruebas) y las 3 `*.ataque` nuevas del tester (`muro-c-r2` de los dos paquetes y `logs-muro-c-r2`). Nada del backend, de `shared/` ni de `docs/DESIGN.md`.
- **Pruebas extendidas sin borrar casos:** `lib.test.ts` no tiene ninguna línea borrada contra `e9df1f0`. Las otras dos pruebas son archivos nuevos de c, y sus casos anteriores siguen con su título exacto.
- **V-05:**
  - `backend/src/adapters/db/clases.ts`, `components/formulario-clase.tsx`, `frontend/src/components`, `frontend/src/services` y `styles/tokens.css` siguen sin cambios contra `e9df1f0`;
  - `panel-mis-clases.tsx` no cambió en esta corrección, así que conserva solo el foco autorizado de c.
- **V-04:**
  - no hay `toast` en `muro-view.tsx` ni en `comentarios-de-publicacion.tsx`;
  - los dos textos nuevos viven en `data.ts`;
  - `normalizarTextoLargo`, `contarCaracteresVisibles` y `focoPerdido` se siguen definiendo una sola vez.

### La corrección
- **`mensajeDeErrorDeLista(error, textoDelCursor)` (`lib.ts:104`):** es pura, sin React. Tiene dos líneas con retorno temprano y ningún ternario. Si `campoDeErrorClases(error) === "cursor"` devuelve el texto que recibe; si no, `mensajeDeErrorClases(error)`. Así solo se desvía un `VALIDACION` cuyo prefijo es `cursor:`. Un `limite:` u otro campo, un `500` o la falta de conexión siguen por el camino de siempre.
- **Uso:** solo en el error de la lista del muro (`muro-view.tsx:72`) y en el de la lista de comentarios (`comentarios-de-publicacion.tsx:162`). El foco no cambia.
- **"Ver más clases" queda fuera, con razón:** su mensaje llega armado desde los inicios por la prop `errorMensaje` hacia `panel-mis-clases.tsx`. Los inicios no están autorizados en c, y el panel lo está solo para el foco. Lo acepto como pendiente con destino (lo anota el orquestador), con el texto propuesto "Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas.".

### Juicio del texto (`DESIGN.md` §9)
- "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo." y "Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos." **cumplen §9:** dicen qué pasó y qué hacer, con tuteo, sin culpar a nadie, sin tecnicismos y sin palabras prohibidas. Los acepto.
- **Una reserva, que no bloquea:** el texto solo sirve si la acción que propone funciona desde donde está la persona.
  - En los comentarios, "abrirlos" coincide con el botón "Ver comentarios" que la persona tiene enfrente.
  - En el muro, "Vuelve a abrirlo" es menos claro: la persona ya está en el muro, y pulsar la sección "Muro" lleva a la misma ruta, sin desmontar la vista. El tester comprobó que "volver a entrar al muro" lo recupera, pero no que funcione pulsando la sección activa. Si no funciona, el texto pide algo inútil, y "Vuelve a entrar al muro desde la clase" o un enlace en el propio mensaje serían más honestos.

  Lo pongo en la ronda 3.

### PA-07 y PA-11
- **Raíz y backend por paquete:** `40P01`, `deadlock detected`, `could not serialize` y `too many clients` en 0. `P2028`: 2 en cada corrida, los aceptados (`sesiones.ts:39`, login; `tokens-cuenta.ts:116`, restablecer). No apareció el de `cambiar-contrasena` ni ninguno en rutas de c. El tercer `P2028` de mi verificación anterior sigue escalado al humano: no se repitió porque esta vez no hubo espera en cadena.
- **PA-11:** ver la línea al final de esta sección.

### Problemas que bloquean
Ninguno.

### Lista de puntos para la ronda 3 del tester (CLASES-c), la última antes de escalar
Ronda de regresión y bordes residuales, sin abrir frentes nuevos amplios.
1. **Regresión completa:** las 94 `*.ataque`, en dos corridas limpias del backend (una puede caer por CHORE-02: repítela y reporta las dos) y en las del frontend. Las pruebas normales de a, b y c siguen en verde.
2. **T-34 por la razón correcta:**
   - el texto sale solo con el `400` de `cursor`, en "Ver más publicaciones" y "Ver más comentarios";
   - un `400` de otro campo (por ejemplo `limite`), un `500`, la falta de conexión y un `403` siguen mostrando su mensaje de siempre, sin el texto nuevo;
   - el foco va al encabezado de la lista, nunca a `<body>`.
3. **La instrucción del texto funciona:**
   - tras el `400` en el muro, pulsar la sección "Muro" estando ya en el muro; salir a "Personas" y volver; y el foco de ventana (refresco de TanStack Query);
   - en los comentarios, "Ocultar comentarios" y "Ver comentarios";
   - di cuáles recuperan la lista sin recargar la página.

   Si pulsar la sección activa no recupera el muro, es un hallazgo bajo de texto: el texto pide una acción que no sirve.
4. **Bordes residuales de lo corregido en las rondas 1 y 2,** solo regresión:
   - T-29 con el cursor de la última página y con `limite=1`;
   - T-30, avisos únicos al crear y al borrar seguidos;
   - T-31, `\r` solo y extremos en blanco;
   - T-33, un tipo no texto en el comentario.

   Si ya los cubre una `*.ataque` vigente, no los dupliques.
5. **PA-10 en logs:** los `400` del cursor y las rutas del muro en `logs-muro-c-r2`, sin datos sensibles.
6. **"Ver más clases" no es hallazgo:** su mensaje técnico tras un cursor borrado es el pendiente que el orquestador ya anotó con destino. Solo confírmalo como observación.
- **PA-11:** a las 22:00:15, `docker ps -a` muestra solo los 4 contenedores de `infra/`. El Ryuk que levantó mi `vitest list` del backend (21:58) ya se retiró.

## Revisión final — CLASES-c
Fecha: 2026-10-01 (noche). Modo 2, con las tres rondas del tester agotadas. Base dentro de los paquetes: `<Cb>` = `e9df1f0`. Rama `feat/clases`.
**Veredicto: ESCALAR AL HUMANO.** Las rondas están agotadas y queda un solo bloqueo, T-35 (bajo): una `*.ataque` en rojo. Todo lo demás de c está hecho como se planeó: lo planeado, solo lo planeado y todo lo planeado, con las Enmiendas 6 a 8. **Recomendación: opción (A) en su forma mínima** (abajo): una cuarta ronda corta y cerrada en la que pulsar "Muro" con el muro en error vuelva a pedir la lista. El texto queda igual y no se reescribe ninguna `*.ataque`.
Verificación propia: lint `0` · build `✓ built in 1.17s` (código 0) · test desde la raíz: backend `111 passed (111)` / `1226 passed (1226)` a la primera, frontend `1 failed | 94 passed (95)` / `1 failed | 1289 passed (1290)` (solo T-35) · backend por paquete `111 passed (111)` / `1226 passed (1226)` · frontend por paquete, igual que desde la raíz · V-01 96/96 · V-03, los 5 comandos con código 0 · PA-07 solo con los dos `P2028` aceptados · PA-11 limpio.

### Problemas que bloquean

#### M-23 — T-35: "Vuelve a abrirlo" no recupera el muro cuando la persona pulsa "Muro"
- **Dónde:**
  - `frontend/src/features/clases/muro-view.tsx`, `MuroDeLaClase`;
  - la prueba es `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx`, caso "muro: estando en el muro, «Vuelve a abrirlo» pulsando «Muro» recupera la lista".
- **Qué pasa:** tras el `400` del cursor, la vista muestra "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo.". La acción más natural para "abrir el muro" es pulsar "Muro" en las secciones de la clase. Esa acción agrega una entrada al historial con la misma ruta, pero no desmonta la vista ni vuelve a pedir la lista: la alerta sigue y no aparece ninguna publicación. Sí recuperan la lista ir a "Personas" y regresar, o recargar la página. En los comentarios el texto sí funciona: "Ocultar comentarios" y luego "Ver comentarios" vuelven a pedir la lista.
- **Por qué importa:**
  - `DESIGN.md` §9 pide que un error diga qué pasó y qué hacer, y aquí la instrucción no sirve desde donde está la persona;
  - la definición de terminado de `AGENTS.md` exige `test` en verde, y "No marques nada como terminado con pruebas en rojo ni las desactives".
- **Origen:** es la reserva que dejé en "Verificación del resumen — CLASES-c — corrección de la ronda 2". El texto lo propuso el orquestador y yo lo acepté con esa reserva, así que la responsabilidad no es solo del programador.
- **Qué se espera:** el criterio de la opción (A) mínima, en la sección siguiente.

### Recomendación para el humano sobre T-35

**Comparación de las opciones**

| Opción | Qué cambia | `*.ataque` afectadas | Costo | Para la persona |
|---|---|---|---|---|
| **(A) mínima, la que recomiendo:** pulsar "Muro" con el muro en error vuelve a pedir la lista | Solo `muro-view.tsx`, más un caso normal en `muro-view.test.tsx` | Ninguna: el caso de T-35 pasa tal como está escrito, y `muro-c-r3` y los otros dos casos de `muro-recuperar-c-r3` no cambian | Una corrección de unas líneas, mi verificación y una regresión del tester | El texto de hoy pasa a ser verdad: "abrirlo" funciona pulsando "Muro", saliendo y volviendo, o recargando |
| (A) con otro texto ("Vuelve a entrar a la clase…") | `data.ts` y tres pruebas normales que fijan el texto | `muro-c-r3` (`TEXTO_MURO`) y `muro-recuperar-c-r3` fijan el texto literal, y el caso de T-35 afirma que pulsar "Muro" recupera. El tester tendría que reescribir dos archivos (sería un C-21) y el caso que encontró el defecto | Mayor que la mínima, con una reescritura de `*.ataque` | Pide una acción de varios pasos (salir y volver a entrar). No arregla la acción natural |
| (A) con un botón "Volver a cargar" en el error | El texto, un patrón visual nuevo (un error con acción) y su documentación en `DESIGN.md` | Las mismas reescrituras que con otro texto. Además, el caso de T-35 seguiría en rojo si "Muro" no recupera la lista | El mayor. `MensajeError` está en "No se toca", así que el botón quedaría fuera de él y solo en el muro, distinto del resto de las listas (personas, roster, inicios y comentarios) | Es lo mejor en abstracto, pero conviene decidirlo una sola vez para todas las listas, no como parche de una |
| (B) cerrar con T-35 pendiente | Nada | 1 `*.ataque` en rojo dentro del commit `<Cc>` | Cero ahora, pero CLASES-d arranca con un rojo. PA-06 de d ("falla una `*.ataque` que no está en la lista de rojos esperados") se activaría desde la ronda 0, o habría que exceptuarla en el plan | Queda una instrucción que no sirve. Va contra la definición de terminado y contra el precedente de b, que cerró en verde con dos rondas extra autorizadas |

**Criterio exacto de la corrección, si autorizas (A) mínima**

1. **Resultado:** con la lista del muro en error, una navegación nueva a la ruta del muro (pulsar "Muro" estando en él) vuelve a pedir el muro desde la primera página. Cuando la respuesta llega, la alerta desaparece y se ven las publicaciones.
   - Sin error, pulsar "Muro" puede volver a pedir la lista o no hacer nada. No hay requisito, pero ninguna prueba vigente puede ponerse en rojo.
   - El cómo lo decide el programador dentro del archivo autorizado: volver a montar la vista por la clave de la ubicación, o volver a pedir la consulta cuando cambia esa clave y la consulta está en error.
2. **Foco:** se queda en el enlace "Muro" que la persona pulsó, que sigue montado fuera de la vista. Nunca va a `<body>`, y el criterio de §7.14 de los "Ver más" no cambia.
3. **Sin cambios en:** los textos (`data.ts`), los comentarios, `lib.ts`, `hooks.ts`, el backend y `shared/`. `DESIGN.md` tampoco cambia, porque no es un patrón visual nuevo.
4. **Archivos autorizados (lista cerrada):**
   - producción: `frontend/src/features/clases/muro-view.tsx`;
   - pruebas: `frontend/src/features/clases/muro-view.test.tsx`, solo para agregar el caso nuevo.

   Cualquier otro archivo activa PA-09 o PA-16, y el programador se detiene.
5. **Prueba normal nueva:** en `muro-view.test.tsx`, el caso "PR-C18: tras el 400 del cursor, una navegación nueva a la ruta del muro vuelve a pedir la primera página, quita la alerta y muestra las publicaciones; el foco no queda en <body>". Hay que registrarlo en la Enmienda 9.
6. **Pruebas del tester:**
   - `muro-recuperar-c-r3.ataque.test.tsx` debe pasar sus 3 casos sin tocarlo;
   - las 96 `*.ataque` deben quedar con los mismos hashes de la tabla de la ronda 3.
7. **"No se toca":** todo `shared/`, `backend/`, `docs/` (salvo los entregables) y `frontend/`, excepto los dos archivos del punto 4.
   - **Base:** como no hay commit intermedio, antes de lanzar al programador el orquestador anota en `aprobacion.md` el SHA-256 de cada archivo cambiado o nuevo de c que no sea `*.ataque` (los de `git status -- shared backend frontend`).
   - Al terminar, solo pueden diferir `muro-view.tsx` y `muro-view.test.tsx`, y las 96 `*.ataque` siguen iguales a la tabla de la ronda 3.
8. **Cierre de la ronda:**
   - verifico el resumen con lint, test y build;
   - el tester hace una regresión: `muro-recuperar-c-r3`, `muro-c-r3` y las 96, el frontend dos veces y el backend una vez con PA-01;
   - **sin quinta ronda.** Si aparece algo nuevo, va como pendiente con destino o como decisión tuya, no a otra ronda.

**Lo que dejo como pendiente con destino, sea cual sea la opción:** el patrón "error de lista con acción «Volver a cargar»" para todas las listas paginadas (muro, comentarios, personas, roster e inicios). Sería con una acción opcional en `MensajeError`, que está en `components/` y hoy no se toca. Destino: tu decisión tras la comprobación H-6 de CLASES-d, o un `chore` de interfaz.

### Cifras: tester (ronda 3) contra mi corrida
| Cifra | Tester, ronda 3 | Mi corrida (22:14 a 22:28) |
|---|---|---|
| PA-01 | `True / Inbound / Block / Public`; `IZZI-F281-5G` | Lo mismo, comprobado antes de cada corrida del backend |
| `npm run lint` (raíz) | 0 en los dos paquetes | Código 0 (la última línea es `tsc -b` del frontend) |
| `npm run build` (raíz) | — | `✓ built in 1.17s`, código 0 |
| `npm run test` (raíz) | — | backend `111 passed (111)` / `1226 passed (1226)` a la primera, sin espera en cadena; frontend `1 failed \| 94 passed (95)` / `1 failed \| 1289 passed (1290)`; código 1, solo por T-35 |
| Backend por paquete | `111 passed (111)` / `1226 passed (1226)`, dos veces | `111 passed (111)` / `1226 passed (1226)`, código 0 |
| Frontend por paquete | `1 failed \| 1289 passed (1290)`, dos veces | Igual (la corrida de la raíz es la primera); el único rojo es T-35 |
| `npx vitest list` | — | backend 1226 casos en 111 archivos; frontend 1290 en 95 |
| IDs PR-C | — | 66 distintos, cada uno una vez en su archivo; PR-C17 tres veces (`muro-view.test.tsx`, `publicacion-del-muro.test.tsx` y `lib.test.ts`); PR-C04d aparece también en tres títulos de `muro-c-r1.ataque` (del tester, no cuenta) |
| V-01 | 94/94 antes de sus archivos; 96 al final | **96/96** contra la tabla de "CLASES-c — Ronda 3", comparadas por programa con `diff` |
| PA-07 | Solo los dos aceptados | Raíz y paquete: `40P01`, `deadlock detected`, `could not serialize` y `too many clients` en 0; `P2028`: 2 líneas, `sesiones.ts:39` (`tx.sesion.create()`, login) y `tokens-cuenta.ts:116` (`tx.tokenCuenta.updateMany()`, restablecer) |
| PA-11 | Limpio | A las 22:28:11, `docker ps -a` solo muestra los 4 contenedores de `infra/` |
| V-03 | — | `validate`, `format --check`, `generate`, `migrate status` ("8 migrations… Database schema is up to date!") y `migrate diff --exit-code` ("No difference detected."), los cinco con código 0 |

### Alcance contra el plan
**Lo planeado, y solo lo planeado.** `git diff --stat e9df1f0 -- shared backend frontend` da 32 archivos modificados y 25 nuevos. Todos están en "Cambios por capa" de c o en la lista cerrada de pruebas de c, o son `*.ataque` del tester.
- **Producción:**
  - `shared/src/clases.ts` e `index.ts`;
  - `schema.prisma` y la migración `20261002003225_publicaciones_y_comentarios`, idéntica a §D-C1, con el `CHECK` agregado a mano;
  - `core/clases/texto.ts` (solo reexporta) y `core/eventos/avisos-de-clase.ts`;
  - `adapters/db/publicaciones.ts`, `adapters/db/index.ts` y `adapters/queue/colas.ts`;
  - `handlers/clases/muro.ts` y `app.ts`;
  - los dos `README.md`;
  - en `features/clases/`: `hooks.ts`, `lib.ts`, `data.ts`, `types.ts`, `muro-view.tsx`, las cuatro vistas de §D-C5 bis, `panel-mis-clases.tsx` (solo el foco), `buscador-alumnos.tsx`, `tabla-alumnos.tsx` y los cinco componentes nuevos.
- **Pruebas normales:** exactamente las de la lista cerrada de c. `bloqueo-usuario.integracion.test.ts` solo tiene el cambio de E6 (Enmienda 7).
- **`*.ataque` existentes cambiadas:** solo las del tester (C-2, C-12, C-19 en la ronda 0; C-20 en su propio `muro-c-r1`).

**Todo lo planeado:**
- §D-C1 a §D-C7, §D-C5 bis y las Enmiendas 6 a 8 están en el código. Lo comprobé en el código, no solo en el verde.
- Las 7 rutas de §D-C2 llevan `protegido()` con el sexto paso (`pertenencia: "inscripcion"` o `"propiedad"`), con los roles de la tabla.
- V-06 lo cubre el caso exacto de `sesiones-y-cadena.ataque` (54 rutas), en verde. `middleware/` está intacto, así que `RUTAS_PUBLICAS` sigue con 10.

**V-04 (código de producción):**
- `$queryRawUnsafe` solo en `adapters/db/cliente.ts`; `$executeRawUnsafe` en 0.
- El único SQL etiquetado nuevo es el `FOR SHARE` de `publicaciones.ts`, parametrizado.
- `addHook` en `handlers/`: 0. `notifier` en los handlers: 0. `console.` en los archivos nuevos: 0.
- `estadoPago` no aparece en ningún archivo de c.
- `fetch(` solo en `services/apiClient.ts`. `dangerouslySetInnerHTML` y `target="_blank"`: 0.
- `enEspera=`: 35. `vidrio-azul` solo en `bloque-destacado.tsx`, y ningún archivo del muro escribe vidrio.
- `from "@/features/` dentro de `features/clases`: 0.
- `Default_Ignorable_Code_Point` solo en `shared/src/auth.ts` y `clases.ts`.
- Se definen una sola vez: `contarCaracteresVisibles` y `normalizarTextoLargo` en `shared/src/clases.ts`, y `focoPerdido` en `lib.ts` (`hooks.ts` solo la importa).
- `claseId ?? ""` solo en `formulario-clase.tsx`, que es un pendiente.
- `toast`: 0 en `buscador-alumnos.tsx` y en los cinco componentes del muro. `?? []`: 0.

**V-05:**
- Contra `e9df1f0` quedan intactos:
  - del backend: `middleware/`, `adapters/db/{clases,inscripciones}.ts`, `adapters/notifier`, `adapters/auth`, `adapters/queue/index.ts`, `workers/`, `config/`, `handlers/clases/{clases,alumnos}.ts`, `test/global-setup.ts` y `test/setup.ts`;
  - del frontend: `features/auth`, `features/admin`, `services/`, `styles/`, `components/`, `app/` (sin contar las `*.ataque` nuevas) y `formulario-clase.tsx`;
  - `eslint.config.mjs`, los `package.json`, `package-lock.json`, `infra/` y `.claude/`.
- La única migración nueva es la carpeta de c.
- Los archivos protegidos de `docs/` coinciden con su SHA-256 de "Cierre de CLASES-b": `AGENTS.md` `9DAD8ADE…`, `CLAUDE.md` `1076099D…`, `README.md` `38027AAC…`, `ARCHITECTURE.md` `037CE5FC…`, `ARCHITECTURE-ESSENTIALS.md` `BCE288C9…` y `PRD.md` `2FD9DA1F…`. Los cuatro agentes coinciden con su hash de la aprobación.
- **`docs/DESIGN.md`:** solo cambian §7.3 (una línea, el grupo de dos botones), §7.14 (el párrafo "Implementan la confirmación en línea…" sube tras las tres viñetas, sin otro cambio) y §7.18, nueva. Todo va marcado "propuesta" y coincide con lo construido. SHA-256 actual: `335AA981E958EE997AC1E673B9296BAD9B1A49B5DDAEA7F61DBEFA135CD255F4`.

**`*.ataque`:**
- Ninguna fue modificada, saltada ni borrada por el programador: las 96 coinciden byte a byte con la tabla de la ronda 3.
- Ninguna lleva `.skip`, `.only` ni `.todo`.
- Las que cambiaron contra `e9df1f0` son del tester (ronda 0 y C-20), con los hashes de sus tablas.

### Hallazgos del tester: estado comprobado en el código
| Hallazgo | Estado | Dónde lo comprobé |
|---|---|---|
| T-29 (medio), cursor borrado | **Corregido.** `listarPublicaciones` lee primero el cursor por PK con `claseId` y, sin fila, lanza `400 VALIDACION` "cursor: no es válido". `listarComentarios` comprueba antes la publicación (`null`, que da `404`) y después el cursor con `publicacionId`. Son consultas de Prisma, sin transacción ni SQL crudo, y no hay oráculo | `adapters/db/publicaciones.ts:108-114` y `:163-175`; PR-C03f y PR-C04e |
| T-30 (medio), avisos perdidos | **Corregido.** Los avisos viven en `onSuccess` y `onError` de `useCrearPublicacion` y `useComentar`, sin avisar los errores de campo. Los formularios llaman a `mutate` solo para el estado local y no importan `toast` | `hooks.ts`, en los dos hooks; `formulario-publicacion.tsx:51-61` y `formulario-comentario.tsx:40-49`; PR-C14a y PR-C14b |
| T-31 (bajo), medir antes de normalizar | **Corregido.** `normalizarTextoLargo` está definida en `shared/` y `core/clases/texto.ts` la reexporta. Los dos formularios normalizan antes de `safeParse` y envían `resultado.data` | PR-C15a a PR-C15c |
| T-32 (bajo), unidad de los máximos | **Cerrado en el plan** (Enmienda 8). El código no cambia y C-20 lo verifica | `muro-c-r1.ataque`, en verde |
| T-33 (bajo), mensajes en inglés | **Corregido.** "Elige si es un anuncio o un material" es el `error` del `discriminatedUnion`, y "La descripción debe ser texto", el del `z.string()` de la descripción. `descripcionClaseSchema` queda intacto (es un pendiente) | `shared/src/clases.ts`; PR-C16 |
| T-34 (bajo), "no es válido" | **Corregido.** `mensajeDeErrorDeLista` es pura y con retornos tempranos, y solo cambia el texto para un `VALIDACION` del campo `cursor` | `lib.ts:104`; PR-C17; los 15 casos de `muro-c-r3` |
| T-35 (bajo) | **Abierto:** es M-23 | — |

### Definición de terminado (`AGENTS.md`), punto por punto
| Punto | Estado |
|---|---|
| Cumple el RF/RN | **Sí:**<br>- RF-33 sin adjuntos (los adjuntos son de d);<br>- RF-12 y RF-38/39 en lo que toca al muro;<br>- RN-02, porque ninguna respuesta del muro lleva `estadoPago` ni correos (PR-C03b recorre el JSON).<br>T-35 es de texto, no de requisito |
| Capas y middleware | **Sí:**<br>- `core/` sin infraestructura;<br>- Prisma y el SQL solo en `adapters/db`;<br>- handlers delgados, sin verificar rol, propiedad ni inscripción a mano;<br>- el sexto paso en las 7 rutas |
| `lint`, `build` y `test` en verde | **No:** 1 `*.ataque` en rojo (T-35, M-23). Lint y build en 0 |
| Pruebas de autorización | **Sí:**<br>- PR-C08a a PR-C08h: la matriz por ruta, con rol incorrecto, clase ajena, alumno restringido y sin token;<br>- PR-C03b: no se filtra el estado de pago;<br>- `muro-c-r1` del tester: alcance con ids de otra clase en las 7 rutas |
| Migración compatible hacia atrás | **Sí:** solo `CREATE TYPE`, `CREATE TABLE`, índices, FK y un `CHECK` sobre tablas nuevas. El código anterior a c no las conoce, así que revertir el código no rompe la base. V-03 en 0 |
| `infra/` y `.env.example` | No cambian, como se planeó para c (S-21) |
| Documentos | Pendientes de cierre: se listan abajo. `DESIGN.md` ya está actualizado en este encargo |

### Reglas que no se rompen
- **Capas:** sin violaciones (V-04).
- **Middleware:** `protegido()` con la cadena completa, y `claseDe(request)` en cada handler.
- **Estado de pago:** se omite en todo el muro. `autorDelMuroSchema` es `{ id, nombre }`, y las respuestas pasan por `.parse` de esquemas estrictos de `shared/`.
- **Consultas sanas:**
  - ninguna va dentro de un ciclo; el conteo de comentarios sale de un solo `groupBy` por página;
  - el índice `(clase_id, creado_en DESC, id DESC)` sirve al muro, y `(publicacion_id, creado_en, id)` a los comentarios y al `groupBy`;
  - la PK sirve al cursor y a los borrados;
  - `paginacionSchema` limita a 100;
  - el único SQL crudo nuevo es etiquetado y parametrizado.
- **Cola:**
  - el aviso se encola dentro de la transacción del dato (`alGuardar(ejecutorSqlDe(tx))`), con el id generado en el handler como id del trabajo y solo ids en los datos (`z.strictObject`);
  - `AVISO_FALLIDO` se crea primero;
  - no hay consumidor: `workers/` está intacto.
- **UTC:** `creadoEn` sale con `toISOString()` y se valida con `z.iso.datetime()`.
- **Secretos, AWS, avisos solo por `notifier`, autenticación:** nada cambia.
- **Infraestructura y esquema:** el esquema cambia solo por la migración, aplicada con `migrate dev` en local, y `infra/` está intacto.

### Estilo (`CLAUDE.md`)
- **Módulos:**
  - tipos de la API reexportados de `shared/` en `types.ts`;
  - textos en `data.ts`, incluidos "Ocultar comentarios" y los dos de T-34;
  - funciones puras en `lib.ts` (`focoPerdido`, `mensajeDeErrorDeLista` y `vecinaDeFila`);
  - hooks en `hooks.ts`, sin tipos propios;
  - en los componentes, solo interfaces de Props;
  - ningún `fetch`, y `features/clases` no importa de otro módulo.
- **`ConClaseDeLaRuta`:** retorno temprano sin `claseId`, sin valor de respaldo. Lo usan las cinco vistas: las cuatro de §D-C5 bis, más `MuroView`, una desviación ya aceptada.
- **Retornos tempranos:**
  - los estados van en orden error → cargando → vacío → datos en el muro y los comentarios;
  - ningún ternario anidado en JSX ni `if/else` anidado.
- **Errores:**
  - en el frontend, los avisos de las mutaciones viven en los callbacks de `useMutation`, y nada se lanza fuera de TanStack Query;
  - en el backend, `AppError` sin `try/catch` en los handlers.
- **Valores por defecto:**
  - `datos.texto ?? ""` en la descripción opcional del material es un texto, que es el caso permitido;
  - `comentariosPorPublicacion.get(id) ?? 0` es el conteo de una agrupación que omite los ceros, así que no oculta datos;
  - ningún `?? []`.

### Lista de diseño (frontend)
- **`DESIGN.md`:**
  - §7.3, §7.14 y §7.18 coinciden con lo construido;
  - el patrón nuevo de c (la publicación del muro y el grupo de tipo) quedó documentado en este encargo;
  - todas las líneas nuevas llevan la marca "propuesta".
- **Tokens:**
  - solo clases de la escala propia (`text-small`, `text-h3`, `text-body`, `text-muted-foreground`, `aria-pressed:bg-surface`, `aria-pressed:text-link`, `border-border`);
  - `estatico-r1` y `clases-r1` en verde.
- **Componentes de `components/ui/`:**
  - `Card` (el vidrio sale de ahí: el muro no escribe ninguna utilidad de vidrio), `Badge` `muted` con icono, `Button`, `Textarea`, `Input` y `Label`;
  - nada hecho a mano y nada con el aspecto por defecto.
- **Estado nunca solo con color:**
  - la insignia lleva texto e icono;
  - el tipo elegido lleva `aria-pressed` y el icono `Check`.
- **Acciones principales:** una sola en la vista del maestro ("Publicar…") y ninguna en la del estudiante (PR-C09d).
- **Textos:** en español de México, con tuteo, sin emojis ni palabras prohibidas. Los vacíos son los de §D-C6: el del maestro va sin acción por decisión del plan, porque el formulario está justo arriba, y el de los comentarios es el propio formulario.
- **Estados:** error, carga y vacío en el muro y en los comentarios.
- **360 px (análisis estático):** grupos con `flex-wrap`, nombres y textos con `wrap-anywhere`, `max-w-prose` y botones `self-start`. No vi nada que obligue a desplazarse a lo ancho; sin navegador, queda sin verificar en pantalla.
- **Foco visible:** los controles usan el `:focus-visible` global (`index.css`). Hay una observación sobre los encabezados `sr-only` (N-C7).

### Problemas que no bloquean

#### N-C7 — El foco que cae en un encabezado `sr-only` no se ve
- **Dónde:**
  - `muro-view.tsx:115`, el `h2` "Publicaciones" (`sr-only`, `tabIndex={-1}`);
  - `comentarios-de-publicacion.tsx:202`, el `h3` "Comentarios".
- **Qué pasa:** según §7.14 y §7.18, el foco va a ese encabezado en tres casos: cuando se borra la última fila, cuando "Ver más" no trae nada nuevo y con el error de T-34. Como el elemento está recortado a 1 px, el contorno de foco no se ve. Con teclado, la persona no ve dónde quedó, aunque el siguiente Tab continúa bien y el lector de pantalla anuncia el encabezado.
- **Contexto:** en b, el destino era un `h2` visible ("Alumnos").
- **Por qué no bloquea:** §7.18 lo documenta como propuesta ("solo para lectores de pantalla") y el foco nunca cae en `<body>`.
- **Qué se espera:** que decidas el destino en la comprobación H-6 de CLASES-d (es candidato a uno de sus 7 puntos). Las opciones: un encabezado visible del muro, o que el foco vaya a un elemento visible de la lista (el panel del formulario o la primera publicación).

#### N-C8 — PR-C17 tiene tres casos en tres archivos
- **Qué pasa:** la regla M-02 del plan pide un ID por archivo. Lo acepté en la verificación de la corrección 2 porque cada caso cubre un lado distinto: el muro, los comentarios y la función pura.
- **Qué se espera:** que la Enmienda 9 lo registre como PR-C17 con sus tres archivos, o como PR-C17a a PR-C17c, solo en el plan. Los títulos de las pruebas no se cambian.

### Detalles menores (no bloquean; al próximo cambio que toque el archivo)
- **`handlers/README.md`:** la línea "…/publicaciones/:publicacionId/comentarios` (comentan…" de la viñeta de `clases/muro.ts` perdió su sangría. Markdown la lee como continuación, así que solo es estético.
- **`conTextosNormalizados` (`handlers/clases/muro.ts:47`):** es una función pura con un ciclo sobre nombres de campos, sin consultas, que vive en el handler. Podría vivir en `core/clases/texto.ts`. Hoy es aceptable porque el handler sigue siendo delgado.
- **La viñeta "Caracteres invisibles en el plan" y el párrafo de escapes bajo "Pruebas requeridas" (c)** siguen diciendo que la tabla tiene invisibles literales, y ya no los tiene. Es el detalle de mi revisión de la Enmienda 6, para la Enmienda 9.

### Desacuerdos arbitrados
No hay desacuerdos abiertos entre el programador y el tester. T-35 no es un desacuerdo: el programador no ha respondido, porque las rondas están agotadas. La comparación de remedios está en la recomendación.

### Pendientes con destino (comprobados contra `docs/ESTADO.md` §3)
- **Ya anotados en §3:**
  - `claseId ?? ""` y la normalización previa en `formulario-clase.tsx`;
  - el mensaje de tipo en inglés de `descripcionClaseSchema`;
  - "Ver más clases" con el texto técnico tras el `400` del cursor;
  - `contarVisibles` de `shared/src/auth.ts`;
  - el `P2028` de `cambiar-contrasena` y los de `invitarMaestrosEnLote` (CHORE-02 o AUTH).
- **Falta en §3, y lo debe agregar el orquestador:** la observación del tester en la ronda 1 de c para NOTIFICACIONES. Los trabajos de `PUBLICACION_CREADA`, `MATERIAL_CREADO` y `COMENTARIO_CREADO` pueden apuntar a una publicación o un comentario ya borrados, y el consumidor debe tratarlos como avisos que ya no aplican, sin fallar ni reintentar. Destino: NOTIFICACIONES. Dónde: `reporte-tester.md`, "CLASES-c — Ronda 1".
- **Nuevos de esta revisión:**
  - N-C7, el foco en encabezados `sr-only`. Destino: H-6, como candidato a uno de sus 7 puntos.
  - El patrón "error de lista con «Volver a cargar»". Destino: tu decisión tras H-6, o un `chore` de interfaz.
  - Los dos detalles menores de arriba. Destino: carril trivial, en el próximo cambio que toque esos archivos.

### Documentos a actualizar al cierre de c (consolidado para el orquestador)
Son los "Textos literales propuestos" marcados (c) del plan, con los ajustes que pide lo que se construyó. Se aplican con la autorización del humano y con el hash anotado en `aprobacion.md`.

**1. `docs/ARCHITECTURE.md` §7, fila `clases`.** Reemplazar la fila completa por la del plan (sin la frase "Publicaciones y comentarios llegan con CLASES-c"):
> | `clases` | `POST /clases` · `GET /clases/inscritas` (estudiante) · `GET /clases/impartidas` (maestro) · `POST /clases/unirse` · `GET/PUT /clases/{claseId}` · `GET/POST /clases/{claseId}/codigo` (ver y regenerar) · `GET /clases/{claseId}/personas` · `GET/POST /clases/{claseId}/alumnos` · `GET /clases/{claseId}/alumnos/candidatos?q=` (correo enmascarado) · `DELETE /clases/{claseId}/alumnos/{alumnoId}` · `GET/POST /clases/{claseId}/publicaciones` · `DELETE /clases/{claseId}/publicaciones/{publicacionId}` · `GET/POST /clases/{claseId}/publicaciones/{publicacionId}/comentarios` · `DELETE /clases/{claseId}/publicaciones/{publicacionId}/comentarios/{comentarioId}` (maestro) · `DELETE /clases/{claseId}/mis-comentarios/{comentarioId}` (autor) |

**2. `docs/ARCHITECTURE.md` §7, párrafo propio después de la línea "Detrás del proxy de Cloudflare…".** Es el texto de la Enmienda 6, corregido por N-C1 y ajustado por T-31 y T-32 (en negritas, lo que cambia respecto del plan):
> Textos que escribe el usuario: todo nombre, título o texto obligatorio exige contenido visible, es decir, un mínimo de puntos de código de letra, número, puntuación o símbolo que no sean ignorables por defecto **(2 en el nombre de una clase; 1 en el título de un material, un anuncio o un comentario)**. Se cuentan con `contarCaracteresVisibles`, de `shared/src/clases.ts`; `shared/src/auth.ts` tiene una copia equivalente para los nombres de persona hasta que se unifiquen. Los caracteres de formato (`Cf`) no se rechazan, salvo los inversores de dirección, pero no cuentan: así un emoji compuesto o un texto en otro alfabeto pasan, y uno hecho solo de invisibles no. **Los textos largos se normalizan antes de validarse, en el servidor y en los formularios, con `normalizarTextoLargo` (también de `shared/src/clases.ts`: CRLF y CR pasan a LF y se recortan los extremos).** Los máximos se miden aparte, **después de normalizar y en puntos de código, no en unidades de UTF-16**. Los nombres de persona siguen su propia regla, más estricta (`shared/src/auth.ts` rechaza todo `Cf`).

**3. `docs/ARCHITECTURE.md` §8, después de la tabla de eventos.** Es el texto del plan, más una frase para NOTIFICACIONES (en negritas):
> - `PUBLICACION_CREADA`, `MATERIAL_CREADO` y `COMENTARIO_CREADO` se encolan desde CLASES en la misma transacción que el dato, con el id del dato (generado en el handler antes del `INSERT`) como id del trabajo y solo ids en sus datos. Sus colas tienen 3 reintentos con espera exponencial, la cola de fallidos `AVISO_FALLIDO` y una retención de 7 días. Su consumidor llega con NOTIFICACIONES; hasta entonces los trabajos esperan en la cola. **Un trabajo puede apuntar a una publicación o un comentario ya borrados: el consumidor lo descarta sin error.**

**4. `docs/ARCHITECTURE.md` §14, tabla.** Reemplazar las filas `publicaciones` y `comentarios` por las del plan, sin cambios:
> | `publicaciones` | `id`, `clase_id`, `autor_id`, `tipo` (`anuncio` / `material`), `titulo`, `texto` | índice `(clase_id, creado_en DESC, id DESC)` · `CHECK`: el material lleva título y el anuncio no |
> | `comentarios` | `id`, `publicacion_id`, `autor_id`, `texto` | índice `(publicacion_id, creado_en, id)`. Hoy solo el contexto `publicacion_id` (NOT NULL); ENTREGAS agrega `entrega_id` y el `CHECK` de exactamente un contexto. Al comentar, la publicación se lee `FOR SHARE` en la misma transacción |

El diagrama ya tiene `clases ||--o{ publicaciones` y `publicaciones ||--o{ comentarios`, así que no cambia.

**5. `docs/ARCHITECTURE.md` §14, "Reglas de acceso a datos": viñeta nueva.** No está en los textos propuestos del plan. La propongo porque el principio de T-18 (decisión tuya en a), aplicado ahora en a, b y c, no está escrito en ningún documento, y TAREAS y ENTREGAS van a paginar igual. Necesita tu autorización, o que el arquitecto la incluya en la Enmienda 9:
> - **Paginación por cursor:** el cursor es el id de la última fila de la página anterior. Con cursor, la consulta lee primero esa fila por su llave, filtrada por el dueño de la lista (el alumno, el maestro, la clase o la publicación). Si no existe (se borró, es ajena o nunca existió), responde `400 VALIDACION` "cursor: no es válido", igual en los tres casos, sin revelar cuál es. La interfaz lo explica con un texto que dice qué pasó y cómo recuperar la lista (CLASES-a, T-18; CLASES-c, T-29 y T-34).

**6. Sin cambios en c:**
- **`docs/ARCHITECTURE-ESSENTIALS.md`:** "Tablas" ya lista `publicaciones` y `comentarios`, y "Eventos" las tres colas. La regla de contenido visible es de validación, no de arquitectura (Enmienda 6, fila 4).
- **`CLAUDE.md`:** la fila `clases` de "Módulos" ya dice "muro con comentarios y adjuntos", y `ConClaseDeLaRuta` es del módulo, no compartida.
- **`docs/PRD.md`:** el plan no tiene textos (c), y RF-33 ya describe el muro.
- **`README.md`.**
- **`docs/DESIGN.md`:** ya está actualizado por el programador. Si autorizas (A) mínima, no cambia.

### Lo que debe registrar la Enmienda 9 (cierre de c, arquitecto)
1. **T-34:**
   - `mensajeDeErrorDeLista(error, textoDelCursor)` en `lib.ts`;
   - los textos `TEXTOS_MURO.cambioMientrasLoVeias` ("El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo.") y `TEXTOS_COMENTARIOS.cambioMientrasLosVeias` ("Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos.") en §D-C6;
   - **PR-C17** con sus tres archivos (`muro-view.test.tsx`, `publicacion-del-muro.test.tsx` y `lib.test.ts`), registrado como excepción aceptada a M-02 o partido en PR-C17a a PR-C17c solo en el plan (N-C8).
2. **T-35:**
   - si autorizas (A) mínima: el criterio de M-23 en §D-C5, `muro-view.tsx` en "Cambios por capa" y PR-C18 en "Pruebas requeridas" (c);
   - si eliges (B): T-35 como pendiente con destino, y la excepción de PA-06 para la ronda 0 de d.
3. **D-1 aceptada:** `publicaciones.ts` lleva su propia copia de `errorCursorInvalido`, como `inscripciones.ts`, porque `adapters/db/clases.ts` no la exporta y estaba en "No se toca". §D-C2 decía "con el código y el mensaje de `errorCursorInvalido` (`adapters/db/clases.ts`)": pasa a "una copia con el mismo código y mensaje".
4. **N-C4:** el script de escapes del programador cambió una línea existente de `backend/test/clases.integracion.test.ts:128`. Antes había un U+202E literal y ahora un escape: el valor es el mismo y ningún caso se reescribió. Se registra como cambio de forma aceptado en un archivo "del propio encargo que se extiende".
5. **Desviaciones aceptadas en la implementación de c:**
   - los envoltorios `publicacionRespuestaSchema` y `comentarioRespuestaSchema` en `shared/`;
   - `MuroView` también usa `ConClaseDeLaRuta`;
   - los avisos de borrado van en los callbacks de los hooks;
   - `vecinaDeFila` es nueva en `lib.ts`, con su caso en `lib.test.ts`;
   - los encabezados `h2` y `h3` del muro son solo para lectores de pantalla (N-C7 queda para H-6).
6. **Cifras reales de cierre de c,** según la opción:
   - con (A), las que dé mi verificación y la regresión del tester;
   - con (B), las de hoy: backend 111 archivos y 1226 pruebas; frontend 95 archivos y 1290 pruebas (1 en rojo); 96 `*.ataque`.
7. **Base de d:**
   - `<Cc>` dentro de los paquetes;
   - V-01 desde la tabla de cierre de c: la de la ronda 3 (96), más lo que agregue la regresión de la cuarta ronda si la autorizas.
8. **Regla nueva de la ronda 0 para d (Enmienda 7, punto 3):** la búsqueda de listas cerradas (archivos, tablas, colas, SQL crudo y rutas) cubre también las pruebas normales existentes, no solo las `*.ataque`. Para d, como mínimo:
   - `clases-r1.ataque` (`enEspera=` de 35 a 36, C-13);
   - E6 de `bloqueo-usuario.integracion.test.ts`, que no cambia si d no agrega SQL etiquetado;
   - las listas de colas;
   - `config/env.ataque` y `arranque-r1.ataque` (C-13).
9. **Detalle:** corregir la viñeta "Caracteres invisibles en el plan" y el párrafo de escapes bajo "Pruebas requeridas" (c). Ya no hay invisibles literales en la tabla.

### Medición del programador en c (para `docs/ESTADO.md` §6)
| Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
|---|---|---|---|
| CLASES-c | 3, más la ronda 0, y una 4.ª corta si la autorizas | 2 (3 con la 4.ª) | **0 de 4** (implementación, Enmienda 7, corrección 1 y corrección 2) |

- **Hallazgos:** 7 (T-29 a T-35). Fueron 2 medios (T-29, el cursor borrado, y T-30, los avisos perdidos) y 5 bajos, ninguno de seguridad.
  - T-32 fue un error del plan (lo escribí yo en mi punto 4 y el arquitecto en §D-C4), no del código.
  - T-35 nace de un texto que propuso el orquestador y que yo acepté con reserva.
- **Lo que hizo bien:**
  - se detuvo en PA-16 (el caso E6 de AUTH-02) y en D-1 (`errorCursorInvalido` en un archivo de "No se toca"), sin tocar nada ni esconder el SQL;
  - sus cifras coincidieron siempre con mi corrida;
  - declaró sus desviaciones;
  - sus correcciones fueron mínimas y acotadas;
  - anticipó en su propio resumen el cursor sin validar (N-C6, después T-29) como punto de ataque;
  - todo lo sensible resistió las tres rondas: autorización y alcance por clase en las 7 rutas, concurrencia con `FOR SHARE`, la cola transaccional y PA-10.
- **Lo que hay que vigilar:**
  - N-C4: el resumen decía "solo se agregaron casos" y un script suyo cambió una línea existente;
  - T-30: no aplicó por analogía, a sus hooks nuevos, el remedio que él mismo implementó en §D-C5 bis para "Agregar a la clase";
  - T-31: no comprobó que el formulario y el servidor midieran lo mismo;
  - su herramienta de edición convirtió escapes Unicode en caracteres reales, aunque lo detectó y lo corrigió.

  El patrón es el de b: bordes de interfaz y de paridad, no de seguridad.
- **Lectura acumulada (a, b y c):**
  - resúmenes devueltos: 3 de 7 en a, 1 de 6 en b y 0 de 4 en c;
  - rondas extra: 3 en a, 4 en b y 2 en c (3 con la 4.ª);
  - la verificación previa ya no encuentra cifras falsas;
  - el costo que queda está en los casos negativos de interfaz;
  - la decisión sobre el modelo queda para después de CLASES-d, como estaba previsto.

### Para el humano
1. **Decisión sobre T-35 (M-23).** Recomiendo **(A) mínima**: una cuarta ronda corta y cerrada en la que pulsar "Muro" con el muro en error vuelva a pedir la lista. Toca solo `muro-view.tsx` y un caso PR-C18 en `muro-view.test.tsx`, el texto no cambia y no se reescribe ninguna `*.ataque`. Después vienen mi verificación y una regresión del tester sobre `muro-recuperar-c-r3`, `muro-c-r3` y las 96, sin quinta ronda.
   - **(B)** deja 1 `*.ataque` en rojo dentro de `<Cc>`. Va contra la definición de terminado y obliga a exceptuar PA-06 en d.
   - **El botón "Volver a cargar"** es mejor para la persona, pero conviene decidirlo una vez para todas las listas, no solo en el muro. Lo dejo como pendiente con destino.
2. **Autorización de los textos de cierre:** los puntos 1 a 4 de "Documentos a actualizar", que son los del plan con sus ajustes. El punto 5 (la regla del cursor en §14) es nuevo y necesita tu sí.
3. **N-C7 (foco en encabezados `sr-only`):** propongo que sea uno de los 7 puntos de H-6, al final de CLASES-d.

### Cuarta ronda y cierre
Fecha: 2026-10-01, de 22:35 a 22:54. Verifico "CLASES-c — cuarta ronda (T-35)" (`resumen-programador.md`, línea 1445), autorizada por el humano con la opción (A) mínima ("Decisión del humano sobre la escalada de CLASES-c", `aprobacion.md`).
**Resumen: ACEPTADO.** Ninguna cifra ni ID difiere de mi corrida. **M-23 queda cerrado.**
**Veredicto final de la revisión de CLASES-c: APROBADO**, sujeto a la regresión final del tester, sin quinta ronda.

#### Cifras: resumen contra mi corrida
| Cifra | Resumen | Mi corrida |
|---|---|---|
| PA-01 | — | `True / Inbound / Block / Public`; `IZZI-F281-5G`, antes de cada corrida del backend |
| `npm run lint` (raíz) | código 0 | código 0 |
| `npm run build` (raíz) | `✓ built in 658ms` | `✓ built in 603ms`, código 0 |
| `npm run test` (raíz) | código 0 a la primera: backend 111/1226, frontend 95/1292 | **Frontend** `95 passed (95)` / `1292 passed (1292)`. **El backend cayó por CHORE-02**: `9 failed \| 102 passed (111)`, `11 failed \| 1191 passed \| 24 skipped (1226)`. Los 11 rojos son tiempos límite de 15 a 40 s de la espera en cadena de `LOCK TABLE usuarios` (`auth-login`, `cuentas-r1`, `cuentas-r3`, `bloqueo-usuario` A1, workers y, por arrastre, PR-A15h de `clases-autorizacion`). Ninguno toca el muro ni este cambio, que es solo del frontend |
| Backend por paquete (repetición) | — | `111 passed (111)` / `1226 passed (1226)`, código 0 (22:50:52) |
| Frontend por paquete, dos veces | `95 passed (95)` / `1292 passed (1292)` las dos | Igual las dos, código 0 |
| `npx vitest list` | frontend 1292 en 95; backend 111 | frontend 1292 en 95; backend sin cambios (1226 en 111) |
| PR-C18 | dos casos con su título | Los dos títulos aparecen exactos y una sola vez. Hay 67 IDs PR-C distintos |
| `muro-recuperar-c-r3` | 3/3 sin tocarlo | En verde dentro de las corridas, con el hash de la tabla |
| V-01 | 96/96 | **96/96** contra la tabla de la ronda 3 (`diff` por programa) |
| Archivos | solo `muro-view.tsx` y `muro-view.test.tsx` | `git status -- shared backend frontend` sigue con las mismas 57 entradas; el orquestador confirmó con su lista de SHA-256 (459 archivos) que solo esos dos difieren |
| PA-07 | solo los dos aceptados | **Corrida de la raíz, caída por CHORE-02:** `40P01`, `deadlock`, `could not serialize` y `too many clients` en 0, y 3 `P2028`: los dos aceptados (`sesiones.ts:39` y `tokens-cuenta.ts:116`) más `sesiones.ts:72` (`rotarSesion`, refresco, en A1 de `bloqueo-usuario`). **Repetición limpia:** exactamente los dos aceptados |
| PA-11 | limpio | A las 22:54 `docker ps -a` solo muestra los 4 de `infra/` |

**Sobre el `P2028` de `sesiones.ts:72`:**
- Es código de AUTH, con el mismo mecanismo que los aceptados: una transacción que expira detrás de la espera en cadena.
- Salió en una corrida caída por CHORE-02, no en una ruta de CLASES, y la repetición limpia trae exactamente los dos aceptados.
- No es PA-07 para c. Lo sumo a la fila de `docs/ESTADO.md` §3 del `P2028` de `cambiar-contrasena` (destino CHORE-02 o AUTH), como un sitio más del mismo patrón.

#### La corrección contra lo aprobado
Comprobado en `muro-view.tsx:40-50`:
- **Mecanismo:** una ref guarda la `key` de `useLocation()` con la que se montó la vista. Un efecto, con dependencias `[ubicacion.key, isError, refetch]`, hace esto:
  - si la clave no cambió, retorno temprano;
  - si cambió, actualiza la ref y, **solo si la consulta está en `isError`**, llama a `refetch()`.

  En una consulta infinita cuyo `fetchNextPage` falló, `refetch()` vuelve a pedir la primera página desde el principio y con datos frescos (la página fallida no se había agregado). Es lo aprobado.
- **Sin peticiones de más:**
  - en el primer render, la ref es igual a la clave;
  - con la lista sana, el efecto retorna antes de llamar;
  - si `isError` cambia sin una navegación nueva, la clave es la misma y retorna, así que el error de "Ver más" no dispara nada por sí solo.

  PR-C18, segundo caso, lo prueba contando las peticiones de primera página.
- **Foco:** no se mueve. Se queda en el enlace "Muro", que PR-C18 comprueba con `toHaveFocus()`. El criterio de §7.14 de los "Ver más" sigue igual.
- **Texto:** sin cambios en `data.ts`. `muro-c-r3` (15 casos) y los otros dos casos de `muro-recuperar-c-r3` siguen en verde.
- **Estilo:**
  - retornos tempranos, sin ternarios anidados ni valores por defecto nuevos;
  - `void refetch()` no deja un rechazo sin manejar, porque `refetch` de TanStack no lanza salvo con `throwOnError`, que no se usa;
  - no hay tipos fuera de Props.
- **Alcance:**
  - nada en `hooks.ts`, `lib.ts`, `data.ts`, `components/`, el backend ni `shared/`;
  - `DESIGN.md` no cambia, porque no es un patrón visual nuevo;
  - los comentarios no cambian, porque ya se recuperaban con "Ocultar" y "Ver comentarios".

**Detalles menores (no bloquean):**
- El `describe` nuevo de `muro-view.test.tsx` dice "(Enmienda 8, T-35)", pero es la Enmienda 9.
- El segundo caso de PR-C18 espera 50 ms fijos para su aserción negativa. Es aceptable para comprobar que algo no pasa, y fue estable en mis dos corridas.
- El resumen dice que D-1 "sigue pendiente de decisión del manager": la acepté en la verificación de la corrección 1, opción (a). Es inexacto, pero no cambia nada.

#### Para la regresión final del tester (sin quinta ronda)
1. **Base:** V-01 contra la tabla de la ronda 3 (96), más los dos archivos de esta ronda, que no son `*.ataque`. Precondición PA-01 antes del backend.
2. **T-35 por la razón correcta:**
   - `muro-recuperar-c-r3` 3/3 sin tocarlo;
   - con el muro en error, pulsar "Muro" pide una sola vez la primera página y no la de un cursor, quita la alerta y deja el foco en "Muro";
   - lo mismo con la vista del maestro, con el formulario de publicar arriba.
3. **Sin peticiones de más:**
   - pulsar "Muro" con la lista sana, o varias veces seguidas en error, no dispara más de una petición por navegación;
   - el error de "Ver más" por sí solo no dispara un `refetch`;
   - otro error de la lista (`500` o sin conexión), seguido de pulsar "Muro", vuelve a intentar: es aceptable y no es hallazgo.
4. **Regresión:**
   - `muro-c-r3` (15) y PR-C18 (2);
   - las 96 `*.ataque` en dos corridas del frontend y una limpia del backend (si cae por CHORE-02, repítela y reporta las dos);
   - PA-07 y PA-11.
5. **Cierre:** publica la tabla de hashes de cierre de c, que es la base de V-01 para d. Un hallazgo nuevo no abre una quinta ronda: va como pendiente con destino o como decisión del humano.

#### Medición final del programador en c (para `docs/ESTADO.md` §6)
| Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
|---|---|---|---|
| CLASES-c | 4, más la ronda 0 (la 4.ª corta, autorizada por el humano tras la escalada) | 3 | **0 de 5**: implementación, Enmienda 7, corrección 1, corrección 2 y cuarta ronda |

- **Hallazgos:** 7 (T-29 a T-35), 2 medios y 5 bajos, ninguno de seguridad.
  - T-32 fue un error del plan.
  - T-35 nació de un texto que propuso el orquestador y que el manager aceptó con reserva.
- **Lo que hizo bien:**
  - se detuvo correctamente en PA-16 (el caso E6 de AUTH-02) y en D-1 (`errorCursorInvalido` en un archivo de "No se toca"), sin tocar nada ni esconder el SQL;
  - sus cifras fueron exactas en los cinco resúmenes;
  - declaró sus desviaciones;
  - sus correcciones fueron mínimas y acotadas: la cuarta ronda tocó exactamente los dos archivos autorizados, con el mecanismo pedido;
  - anticipó en su propio resumen el cursor sin validar (T-29);
  - lo sensible resistió todas las rondas: autorización y alcance por clase en las 7 rutas, `FOR SHARE` bajo concurrencia, la cola transaccional y PA-10.
- **Lo que hay que vigilar:**
  - N-C4: el primer resumen no declaró que un script suyo cambió una línea existente de `clases.integracion.test.ts`; decía "solo se agregaron casos";
  - T-30 y T-31: no aplicó por analogía, a sus hooks y formularios nuevos, los remedios que él mismo había implementado (§D-C5 bis) ni comprobó la paridad entre formulario y servidor;
  - en esta ronda, una afirmación inexacta menor (D-1 "pendiente").
- **Lectura acumulada (a, b y c):**
  - resúmenes devueltos: 3 de 7 en a, 1 de 6 en b y 0 de 5 en c;
  - rondas extra: 3 en a, 4 en b y 3 en c;
  - la verificación previa ya no encuentra cifras falsas, y el costo que queda está en los casos negativos de interfaz, no en la seguridad;
  - la decisión sobre el modelo queda para después de CLASES-d.

#### Ajustes al consolidado de cierre
- **Enmienda 9, punto 2:** la opción autorizada es (A) mínima, con el criterio de M-23 en §D-C5, `muro-view.tsx` en "Cambios por capa" (c) y PR-C18 (dos casos en `muro-view.test.tsx`) en "Pruebas requeridas" (c).
- **"Documentos a actualizar", punto 5:** la viñeta de la paginación por cursor en `ARCHITECTURE.md` §14 está autorizada por el humano y la aplica el orquestador al cerrar c.
- **Cifras de cierre de c:**
  - las de esta verificación: backend 111 archivos y 1226 pruebas; frontend 95 archivos y 1292 pruebas;
  - 96 `*.ataque`, más las que agregue la regresión final del tester;
  - la tabla de esa regresión es la base de V-01 para d.

## Arbitraje de PA-07 — ronda 0 de CLASES-d
Fecha: 2026-10-02. Es de solo lectura: no corrí suites. Fuente: `reporte-tester.md`, "CLASES-d — Ronda 0", sección "PA-07" (corrida 1). Leí `adapters/db/publicaciones.ts`, `adapters/queue/index.ts`, `adapters/db/cliente.ts` y `backend/test/cuentas-r1.ataque.test.ts:127-135`, y busqué todos los bloqueos explícitos de `backend/src`.
**Decisión: (a).** Es el mismo patrón de CHORE-02. Va a CHORE-02 como pendiente, **no bloquea d** y no pide ninguna corrección de c dentro de d.

### Lo que pasó
- **El sitio del `P2028` no es el que esperó.** Prisma marca la expiración en la primera llamada que llega después de los 5 s de la transacción interactiva. La que esperó fue la anterior, `tx.comentario.create()`. En `crearComentario` (`publicaciones.ts:202-215`) el orden es:
  1. `SELECT … FOR SHARE` sobre `publicaciones`;
  2. `tx.comentario.create()`;
  3. `alGuardar` → `encolar` → `ejecutorSqlDe` → `$queryRawUnsafe` (`cliente.ts:60`), donde aparece el `P2028`.

  El `INSERT` en `comentarios` dispara la comprobación de la llave foránea `autor_id → usuarios`, que toma `FOR KEY SHARE` sobre la fila del autor. Mientras `cuentas-r1:130` tiene `LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE`, esa comprobación espera. El `LOCK TABLE` está metido en la espera en cadena de CHORE-02, que dura de 36 a 40 s. Cuando por fin se libera, el `INSERT` termina, la transacción ya expiró y la siguiente llamada (el encolado) recibe el `P2028`, que se traduce a `500`.
- **Los 36,658 ms coinciden** con el intervalo de los otros tiempos límite de esa corrida y con el `P2028` de `cambiar-contrasena` de c, que fue de 36 s. La corrida 2 sale limpia, con solo los dos aceptados, y los otros cuatro términos están en 0 en las dos.

### Por qué no es propio de c
- **Ningún código de producción puede bloquear esa comprobación.** En `backend/src`, los únicos bloqueos explícitos sobre `usuarios` son `FOR NO KEY UPDATE` (escritores: contraseña, sesiones en bloque, tokens) y `FOR SHARE` (crear o rotar una sesión), en `bloqueo-usuario.ts`. Los dos son compatibles con el `FOR KEY SHARE` de la llave foránea. Ningún flujo de la API toma `LOCK TABLE` ni `FOR UPDATE` sobre `usuarios`. Solo el `ACCESS EXCLUSIVE` de la prueba de `cuentas-r1`, o una migración que bloquee `usuarios` durante un despliegue, puede detener un comentario o una publicación ahí.
- **Lo mismo vale para `crearPublicacion`:** su llave foránea a `clases` solo choca con `FOR UPDATE` o con borrados de `clases`, y ninguno existe hoy.
- **El `FOR SHARE` sobre `publicaciones`** solo espera a un borrado de esa publicación, que es una transacción corta (PR-C04d), no 36 s.
- **El timeout de 5 s no es un defecto de c.** Es el valor por defecto que usan todas las transacciones del backend, incluidas las de AUTH, y alargarlo solo para el muro escondería la espera en cadena sin resolverla.
- **Traducir un `P2028` a un error controlado** (por ejemplo `503` "Inténtalo de nuevo") en lugar de un `500` es una decisión transversal:
  - vive en `adapters/db/errores.ts`, que está en "No se toca" del encargo;
  - tocaría igual a AUTH (`sesiones.ts`, `tokens-cuenta.ts`, `usuarios.ts`, `invitaciones.ts`);
  - no se resuelve con un parche en `publicaciones.ts` dentro de d.

### Criterio del humano (2026-10-02) aplicado
- Un `500` en una corrida limpia es un defecto del dominio dueño. **No es el caso:** este solo aparece en una corrida caída por la espera en cadena, y la repetición limpia no lo trae.
- **Destino CHORE-02**, en la misma fila que `invitarMaestrosEnLote` y `rotarSesion`. El orquestador suma este sitio a esa fila de `docs/ESTADO.md` §3:
  - qué pasó: `crearComentario`, la llave foránea `autor_id` detrás del `LOCK TABLE usuarios` de `cuentas-r1`, con el `P2028` reportado en `encolar` (`cliente.ts:60`);
  - la propuesta para CHORE-02: además de cortar la espera en cadena, decidir si `adapters/db/errores.ts` traduce `P2028` a un error controlado en todo el backend.

### Para PA-07 en CLASES-d (regla de trabajo, mientras no exista CHORE-02)
- **No es PA-07:** un `P2028` en una ruta de c o de d, en una corrida que cae por la espera en cadena, siempre que se cumplan las cuatro condiciones de mi arbitraje de c:
  - los otros cuatro términos en 0;
  - los rojos de esa corrida son tiempos límite de CHORE-02;
  - la repetición inmediata sale limpia, con exactamente los dos aceptados;
  - el sitio queda reportado con su llamada.
- **Sí es PA-07 y bloquea:** el mismo `P2028` en una corrida limpia, o un `500` de una ruta del muro o de archivos en una corrida limpia. Según el criterio del humano, eso sería un defecto de CLASES con prioridad alta.
- **d puede arrancar.** Lo que sí debe resolverse antes de programar d son T-36 y T-37 de la misma ronda 0: 45 `*.ataque` que d contradice sin un C-n que los cubra. Es un tema aparte, para el arquitecto y el orquestador.

## Verificación del resumen — CLASES-d — implementación
Fecha: 2026-10-02, de 08:51 a 09:02. Verifico `resumen-programador.md`, "## CLASES-d — implementación" (línea 1480), y en la misma sección reviso la Enmienda 10 (modo plan) y arbitro las desviaciones. Base `<Cc>` = `c7fcece`.
**Veredicto del resumen: ACEPTADO.** Ninguna cifra ni ID difiere de mi corrida. **Enmienda 10: APROBADA.** **Las cuatro desviaciones se aceptan:** la 1 con autorización retroactiva en la enmienda de cierre y una observación de proceso; las otras tres sin condiciones. Pasa a la ronda 1 del tester de d.
Verificación propia: lint 0 · build `✓ built in 627ms` · `npm run test` desde la raíz con **código 0 a la primera** (backend `116 passed (116)` / `1272 passed (1272)`, frontend `98 passed (98)` / `1316 passed (1316)`) · backend por paquete: la primera corrida cayó por CHORE-02 y la repetición salió limpia · frontend por paquete, dos veces en verde · V-01 97/97 · V-03 en 0 · PA-07 y PA-10 limpios.

### Cifras: resumen contra mi corrida
| Cifra | Resumen | Mi corrida |
|---|---|---|
| PA-01 | regla y red correctas | `True / Inbound / Block / Public`; `IZZI-F281-5G`, antes de cada corrida del backend |
| `npm run lint` (raíz) | código 0, `> tsc -b` | código 0 |
| `npm run build` (raíz) | `✓ built in 1.17s` | `✓ built in 627ms`, código 0 |
| `npm run test` (raíz) | cayó 2 de 2 por CHORE-02 | **código 0 a la primera**: backend `116 passed (116)` / `1272 passed (1272)`, frontend `98 passed (98)` / `1316 passed (1316)`. El resumen no es inexacto: es otra corrida, con otro orden de arranque |
| Backend por paquete | corridas 2 y 3 limpias, 1272/1272 | **Corrida 1 caída por CHORE-02:** `10 failed \| 1235 passed \| 27 skipped (1272)`. Los 10 rojos son tiempos límite de 15 a 40 s (`cuentas-r1`, `cuentas-r3`, `bloqueo-usuario` B1, workers y, por arrastre, PR-A15h y los dos casos de cursor de `muro-c-r1`). Sus `P2028` solo están en los dos sitios aceptados (`sesiones.ts:39` y `tokens-cuenta.ts:116`), no hay ningún `500` en rutas de c ni de d y los otros cuatro términos están en 0. **Corrida 2:** `116 passed (116)` / `1272 passed (1272)`, limpia, con exactamente los dos aceptados. Según la regla de d, no es PA-07 |
| Frontend por paquete | 1316/1316 (3 de 3) | 1316/1316, dos veces |
| `npx vitest list` | backend 1272 en 116; frontend 1316 en 98 | backend 1272 en 116; frontend 1316 en 98 |
| IDs PR-D | 56 con caso | Los 56 (49 filas del plan, con PR-D09a a PR-D09h desplegados) aparecen exactamente una vez cada uno, con los títulos del resumen |
| V-01 | 97/97 | **97/97** contra la tabla de "CLASES-d — Ronda 0, complemento (C-21 y C-22)" (`diff` por programa); no hay `*.ataque` nuevas |
| Rojos esperados (C-2, C-13, C-22) | en verde | En verde dentro de las corridas limpias; ninguna `*.ataque` en rojo |
| V-03 | cinco comandos en 0 | Los cinco con código 0 ("9 migrations… up to date"; `No difference detected.`). La migración `20261002141710_archivos` es idéntica a §D-D1, con los dos `CHECK` |
| PA-07 | solo login y restablecer | Raíz y corrida limpia: 2 `P2028`, los aceptados; los cuatro términos en 0 |
| PA-10 | 0 | En las salidas completas de la raíz y del backend: `X-Amz-Signature` 0; los cuatro valores de secreto del almacén de las pruebas, 0; el origen del doble (`https://almacen-en-memoria.test`) y `materiales/`, 0 |
| PA-11 | limpio | A las 09:01:21 solo `campus-dev-postgres-1` (lo levantó el programador). El Ryuk de mi primera corrida ya se había retirado |

### V-04, V-05, V-06 y caracteres invisibles
**V-04:**
- `from "minio"` solo en `adapters/storage/index.ts`.
- `fetch(` solo en `apiClient.ts` (2) y `almacenService.ts` (1).
- `enEspera=`: 36.
- `$queryRawUnsafe` solo en `cliente.ts`; los archivos con SQL etiquetado son los cinco de siempre, sin ninguno nuevo de d. E6 queda intacto (`bloqueo-usuario.integracion.test.ts` sin cambios).
- `adjuntos` sin `?? []`, `.default` ni `.optional` en `shared/` ni en el frontend. En `features/clases` y `shared/`: `?? []` 0.
- `console.` 0 en los archivos nuevos. `estadoPago` 0 en los archivos de d. `dangerouslySetInnerHTML` y `target="_blank"` 0. `disabled` 0.

**V-05** (contra `c7fcece`, `git diff --quiet` y `status`):
- intactos:
  - del backend: `middleware/`, `adapters/db/{clases,inscripciones,cliente,errores}.ts`, `adapters/queue/`, `notifier`, `auth`, `handlers/clases/{clases,alumnos}.ts`, `workers/`, `server.ts`, `worker.ts`, `core/eventos`, `core/clases`, `test/global-setup.ts` y `test/setup.ts`;
  - del frontend: `components/`, `features/auth`, `features/admin`, `services/{apiClient,authService,sesionService}.ts`, `styles/tokens.css` e `index.css`, `app/router.tsx`, y `muro-view.tsx`, `comentarios-de-publicacion.tsx`, `formulario-clase.tsx` y `panel-mis-clases.tsx` de `features/clases`;
  - `eslint.config.mjs`, los `package.json` de la raíz, `frontend` y `shared`, `infra/` y `.claude/agents/{programador,tester,manager}.md`.
- **Migraciones:** solo la carpeta nueva.
- **`backend/package.json`:** una línea, `"minio": "^8.0.7"`.
- **Lockfile (lo revisé yo):**
  - 27 entradas nuevas de `node_modules/`, todas del árbol de `minio`;
  - 7 líneas borradas, todas marcas `"dev": true` o `"devOptional": true`, porque esos paquetes ahora se usan en producción;
  - `aws` 0 veces en el diff. **PA-14 no se activa.**
- **Archivos protegidos:**
  - con su hash de "Cierre de CLASES-c": `CLAUDE.md`, `README.md`, `ARCHITECTURE-ESSENTIALS.md` y `PRD.md`;
  - `ARCHITECTURE.md` coincide con `DDB2654E…`;
  - `AGENTS.md` (`AC6DAE79…`) y `arquitecto.md` (`AE021430…`) coinciden con "Decisiones del humano al cerrar CLASES-c".
- **`docs/DESIGN.md`:** solo agrega §7.19, marcada "propuesta", y coincide con lo construido. Tiene una errata: "fresco 4" por "fresco 4 minutos".

**V-06:** el caso exacto de `sesiones-y-cadena.ataque` (C-2, 56 rutas) pasa. `middleware/` sigue intacto, así que `RUTAS_PUBLICAS` sigue en 10.

**Invisibles:** con un script propio sobre todo archivo cambiado o nuevo de `shared/src`, `backend/src` y `frontend/src` que no es `*.ataque`, comparando con `c7fcece`, **ningún carácter invisible nuevo**. Solo siguen los 4 de `shared/src/clases.ts` (U+202A, U+202E, U+2066 y U+2069, la expresión de §D-C4), que ya estaban.

**N-1 a N-5:** exactamente lo que autoriza la fila d, y no se quitó ninguna aserción.
- Las únicas líneas borradas de `env.test.ts` y `formulario-publicacion.test.tsx` son la entrada de `:130` y el `toEqual` de PR-C09b, reescritos en su lugar con `...almacenValido` y con `archivoIds: []`.
- `muro-view.test.tsx` y `publicacion-del-muro.test.tsx` solo suman `adjuntos: []` a su doble.
- En `format.test.ts` y `ayudas-clases.ts` solo cambian importaciones.

### Enmienda 10 (modo plan): APROBADA
**Forma.**
- `git diff c7fcece -- plan.md` da 69 inserciones, 7 borrados y 15 hunks, y el SHA-256 es `AF6A8116…`, lo mismo que anotó el orquestador.
- Los hunks caen exactamente en lo declarado: la cabecera (línea de la enmienda y `<Cc>`), la sección de la Enmienda 10, "Pendientes" (2 filas), §D-D3 punto 4 (una viñeta), §D-D5 ("Forma de los datos"), §D-R0 (C-13 completado, C-21 y C-22), la fila d de las listas cerradas, PR-D06d, el punto 4 de "Ronda 0", el punto 5 de "Puntos de ataque" (d), PA-07, V-01 y los pasos 37 y 38.
- No toca §D-D1, §D-D2, §D-D4, §D-D6, §D-D7 ni "No se toca".

**Fondo.**
- **C-21 (`adjuntos` obligatorio, sin valor por defecto, también en la respuesta de crear):** correcto. El `.default([])` en la respuesta sería el `?? []` de `CLAUDE.md` un nivel más abajo. Con el campo obligatorio, `schema.parse` detecta un backend que lo olvide. Es aditivo y compatible: primero se despliega el backend, y el frontend anterior descarta la clave. PR-D06d lo prueba en el backend.
- **C-22 (`archivoIds` siempre en el cuerpo):** correcto. Es lo que ya da `resultado.data` con el `[]` por defecto de la **entrada**, que sí es legítimo, y evita una rama para no tocar un caso. Se distingue bien entrada y respuesta.
- **Fila d con N-1 a N-5:** correcta y mínima:
  - `:130` lleva un almacén válido para que el rechazo siga siendo solo por `JWT_SECRET`, sin debilitarse en silencio;
  - N-4 y N-5 entran como "se extienden";
  - el resto activa PA-16.
- **PA-07 para d:** remite a mi regla. Bien.
- **V-01 del complemento:** corrige una contradicción real. La base del tester era la tabla de cierre de c, y la del programador, la del complemento.
- **Detalle:** el pendiente del worker en `production` con `STORAGE_*` va bien a DEPLOY.

### Desviaciones del programador: arbitraje
**1. `publicacion-del-muro.tsx` modificado sin estar en "Cambios por capa" de d: se acepta, con autorización retroactiva en la enmienda de cierre (Enmienda 11). El texto condicional es la forma correcta.**
- **El cambio es el que el plan pedía, aunque olvidó listar el archivo:**
  - §D-C5 ya decía "…y sus adjuntos." desde d, y §D-D6 trae el texto "Se borrará con sus comentarios y adjuntos.";
  - §D-D5 pide mostrar los adjuntos en el muro, y el único lugar donde una publicación pinta su contenido es `PublicacionDelMuro`.

  La omisión es del plan (del arquitecto), y la ronda 0 no inventarió las dos pruebas que fijan el texto viejo (`muro-c-r1.ataque:479` y `publicacion-del-muro.test.tsx:288`).
- **El diff son 9 líneas:** monta `AdjuntosDePublicacion` y elige la frase de confirmación. No hay `enEspera` nuevo, foco nuevo ni más cambios.
- **El texto condicional es mejor para la persona:** la frase de consecuencia debe decir lo que de verdad se borra. Decir "y adjuntos" en una publicación sin archivos sería inexacto. Además, no obliga a reescribir ninguna `*.ataque` (no hace falta un C-n) y `DESIGN.md` §7.19 ya lo documenta.
- **Observación de proceso, que va a la medición:**
  - debió detenerse por PA-09 ("tocar un archivo de 'No se toca'") y preguntar, como hizo en PA-16 y D-1 en c;
  - lo atenúa que lo declaró de forma visible, con el motivo y las pruebas afectadas, y que el cambio es el mínimo.

  No devuelvo el resumen por esto: revertirlo y pedir la autorización llevaría al mismo código.
- **La Enmienda 11 registra:**
  - `publicacion-del-muro.tsx` en "Cambios por capa" (d);
  - el texto condicional en §D-D6 y §D-C5 (con adjuntos, "Se borrará con sus comentarios y adjuntos."; sin adjuntos, la frase de c);
  - el caso "muestra los adjuntos y, al pedir borrar, la frase que también los nombra" de `adjuntos-de-publicacion.test.tsx`.

**2. `crearPublicacion` recibe `archivos` (las filas ya leídas) en lugar de `archivoIds`: se acepta.**
- El `UPDATE` repite todas las condiciones de §D-D3 punto 3.3 (ids, clase, `subido_por`, pendiente, sin publicación, 24 h) y compara el conteo. Así que recibir las filas en lugar de los ids no relaja nada.
- Permite armar los `adjuntos` del `201` sin otra consulta, como pide C-21.
- El valor por defecto `archivos = []` es de un parámetro de **entrada** opcional, para quien publica sin adjuntos y para PR-C02e, que no se toca. No es un valor que oculte datos faltantes.

**3. `buscarArchivosParaConfirmar` filtra por clase, usuario, estado, sin publicación y 24 h: se acepta.**
- Sigue siendo una consulta por PK (`id IN (≤5)`), con filtros extra.
- Es más estricta que el plan, y evita consultar al almacén por un objeto ajeno o ya confirmado, lo que serviría de oráculo y gastaría una llamada al proveedor.
- Si falta una fila, responde `400 ARCHIVO_INVALIDO`, el mismo código que el `UPDATE` cuando el conteo no coincide.

**4. Extras: se aceptan, y la Enmienda 11 los registra.**
- **`CODIGOS_ARCHIVOS` en `shared/src/archivos.ts`:** §D-0.5 los ponía en `CODIGOS_CLASES`. Que vivan en el archivo del dominio es razonable y coherente, y el frontend los traduce en `MENSAJES_ERROR_CLASES`. Hay que corregir §D-0.5.
- **`archivoIdParamSchema`.**
- **Las tres fábricas de error en `core/archivos/politica.ts`:** evitan duplicar los mensajes entre los dos handlers.
- **La descarga sin almacén responde `503` antes de buscar el archivo:** coincide con §D-D2 y no revela si el archivo existe.
- **`STORAGE_*=` vacío cuenta como ausente:** evita un error confuso con un `.env` en blanco, y los mensajes no llevan valores (PR-D02c).
- **Los textos accesibles "Archivos elegidos" y "Archivos adjuntos":** van a §D-D6.
- **Los casos sin ID:** suman cobertura y no sustituyen a ninguno.

**Las otras cuatro desviaciones del resumen** (puntos 5 a 8: descarga `503`, `vacioComoAusente`, textos, casos sin ID) quedan cubiertas por el punto 4.

### Revisión a vuelo de pájaro (no es la revisión final)
- **Cadenas de las dos rutas de `handlers/archivos.ts`:**
  - `POST …/archivos`: `protegido({ roles: ["maestro"], pertenencia: "propiedad" })`;
  - `POST …/archivos/:archivoId/descarga`: `protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" })`;
  - las dos usan `claseDe(request)` y ningún handler revisa rol, propiedad ni inscripción a mano;
  - el alumno restringido lo detiene `withAccess` (PR-D09c y PR-D09i).
- **URL prefirmada de 5 min y el archivo fuera de Node:**
  - `presignedPutObject` y `presignedGetObject` con `VIGENCIA_URL_FIRMADA_S = 300`, sin red, gracias a la región fija (PR-D03a);
  - la API solo firma y guarda metadatos;
  - el navegador sube con `fetch` `PUT` y `credentials: "omit"`, sin `apiClient` ni token, y rechaza una URL que no sea `http(s)` o que sea del origen de la API.
  - Los tokens de mínimo privilegio son de configuración en R2 (DEPLOY), no de código.
- **El estado del archivo:**
  - un archivo está `confirmado` si y solo si tiene publicación, con el `CHECK` en las dos direcciones (PR-D08b y PR-D08c);
  - `clase_id` autoriza al pendiente al solicitar y al confirmar;
  - la descarga exige `confirmado` y `clase_id` de la ruta (PR-D07b y PR-D07c);
  - al borrar una publicación, sus archivos pasan a `descartado` y quedan sin contexto, en la misma transacción, filtrando por `clase_id` (PR-D08a, y un caso extra con una publicación ajena).
- **Vista previa:** solo PNG, JPEG, WebP y GIF (`TIPOS_CON_VISTA_PREVIA`), sin SVG.
  - Para la vista previa, la URL `inline` fuerza `response-content-type` al tipo declarado, y la confirmación compara el tipo real con el declarado.
  - La descarga es `attachment`, con `filename` en ASCII y `filename*` en RFC 5987.
  - El nombre rechaza `/`, `\`, controles y bidireccionales.
  - La clave nunca lleva el nombre y nunca sale en una respuesta (PR-D06c).
- **Capas:** `minio` solo en `adapters/storage`; `core/archivos` sin infraestructura; Prisma solo en `adapters/db`.
  - El handler del muro ganó dos funciones (`adjuntosParaResponder` y `archivosParaPublicar`) que orquestan el almacén y la base, sin consultas en un ciclo: una lectura por PK y un `Promise.all` de `statObject` para 5 objetos como máximo.
  - Es aceptable; si crece, conviene moverlo a un módulo propio.
- **Consultas:** los adjuntos del muro salen de una sola consulta por página (índice `archivos(publicacion_id)`), y las firmas de las vistas previas son cálculos locales.
- **Frontend:**
  - `handlePublicar` con `try/catch/finally` y el botón principal en `enEspera` de principio a fin (PR-D12c);
  - el aviso de error de una subida nombra el archivo, y el de crear sigue en el hook (T-30 intacto);
  - "Descargar" usa `try/catch` y `toast`;
  - "Quitar" sigue §7.14;
  - "Adjuntar archivos" lleva su ayuda permanente con `aria-describedby`;
  - tokens solo de la escala propia, y `estatico-r1` y `clases-r1` en verde.
- **`DESIGN.md`:** solo §7.19, marcada "propuesta".

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean (para el tester o para el cierre de d)
- **N-D1, mensajes de un rechazo del servidor al solicitar:**
  - un archivo de 0 bytes, o con un nombre que tiene `/`, `\` o un control, pasa la validación del cliente;
  - el servidor responde `400 ARCHIVO_INVALIDO` con un mensaje específico ("El archivo está vacío…" o "El nombre del archivo no es válido.");
  - pero el frontend lo traduce por código a "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.", que no dice qué pasó (`DESIGN.md` §9).
  - Remedio posible: que el cliente rechace también el tamaño 0 y esos caracteres con su propio mensaje, o que un `ARCHIVO_INVALIDO` al solicitar muestre el mensaje del servidor.
  - Es punto de ataque; si el tester lo confirma, es un hallazgo bajo.
- **N-D2, `extensionDe` duplicada:** existe igual en `frontend/src/features/clases/lib.ts` y en `backend/src/core/archivos/politica.ts`. La tabla de tipos es única (`shared/`), pero la regla "tipo más extensión" está escrita dos veces. Es el mismo patrón que unificamos en c con `normalizarTextoLargo`. Pendiente con destino: el cierre de d o un carril trivial, moviendo `extensionDe` (o `tipoYExtensionCoinciden`) a `shared/src/archivos.ts`.
- **N-D3, errata en `DESIGN.md` §7.19:** "el muro se considera fresco 4" debe decir "4 minutos". Va al carril trivial dentro de d.
- **N-D4, `PR-D02a` con `if (soloElEndpoint.ok) return`:** el `return` va después de la aserción que exige `ok === false`, solo para estrechar el tipo. Si la precondición fallara, la prueba ya habría fallado. No viola la regla de `AGENTS.md`, pero conviene `if (soloElEndpoint.ok) throw …`, con un mensaje, en el próximo cambio de ese archivo.

### Medición del programador (parcial, d)
- **Resumen aceptado a la primera:** 0 de 1.
- **Bien:**
  - cifras exactas, contrastables y con su comando;
  - reportó honestamente que desde la raíz le cayó 2 de 2 por CHORE-02;
  - lockfile limpio y explicado;
  - N-1 a N-5 al pie de la letra;
  - declaró cada desviación con su motivo.
- **A vigilar:** la desviación 1, que se resolvió sin detenerse, aunque la declaró.

### Lista de puntos de ataque para la ronda 1 del tester (CLASES-d)
Hallazgos desde T-38. Las `*.ataque` nuevas llevan el sufijo `-r1` de d (por ejemplo `archivos-d-r1`). Regla de PA-07 de d. PA-01 antes del backend.
1. **Alcance por `archivoId`:**
   - descarga de un archivo de otra clase con el `claseId` propio, de un `pendiente`, de un `descartado` y de un UUID inexistente: las cuatro respuestas idénticas, sin oráculo;
   - un `archivoId` que no es UUID.
2. **Confirmar al publicar:**
   - un `pendiente` de otra clase, de otro maestro (codocente no hay: de otro maestro dueño de otra clase), de hace más de 24 h, ya confirmado en otra publicación o `descartado`;
   - el mismo id dos veces; 6 ids;
   - **dos publicaciones simultáneas que reclaman el mismo archivo:** una gana y la otra responde `400` sin dejar publicación ni trabajo en la cola, y ningún `500` ni `P2028` en corrida limpia;
   - un archivo cuyo objeto no existe en el almacén.
3. **Lo declarado contra lo real:**
   - tamaño distinto en 1 byte;
   - `Content-Type` real distinto, o con parámetros (`image/png; charset=…`) o en mayúsculas;
   - extensión que no corresponde, doble extensión (`foto.png.html`), sin extensión;
   - `image/svg+xml` y `text/html` declarados;
   - `tamano` 0, negativo, decimal, `2^53`, 25 MB y 25 MB + 1;
   - `tipo` `__proto__` o `constructor`.
4. **El nombre:**
   - 255 y 256 puntos de código;
   - `/`, `\`, controles, U+202E (extensión disfrazada), saltos de línea, comillas, `;`, `%`, emojis y sustitutos sueltos;
   - el `Content-Disposition` que firma la API: sin inyección de cabecera, con `filename*` correcto y una alternativa ASCII no vacía;
   - XSS del nombre en la ficha, en el `alt` de la imagen y en el aviso de error (`«…»`).
5. **La URL prefirmada:**
   - que la de subida solo sirva para su clave y su método (no para otra clave ni para `GET`), en la medida en que el doble o la firma real lo permitan sin red;
   - que expire a los 300 s (`X-Amz-Expires=300`);
   - que la de descarga lleve `attachment` y la de vista previa `inline` solo para las cuatro imágenes;
   - que ninguna respuesta lleve `claveObjeto` ni `clave_objeto`.
6. **Alumno restringido y roles:**
   - el restringido inscrito no obtiene ninguna URL (ni de subida, ni de descarga, ni de vista previa: su muro responde `403`);
   - un estudiante no puede solicitar una subida;
   - el admin, en ninguna;
   - con `debe_cambiar_contrasena`, nada.
7. **Logs (PA-10)** con `LOG_LEVEL=trace` y la API real: ningún `X-Amz-Signature`, ninguna URL prefirmada completa, ningún `STORAGE_SECRET_KEY` ni clave de objeto, también en los errores del proveedor (`503`).
8. **Borrar con adjuntos:**
   - la publicación con adjuntos se borra, y sus archivos quedan `descartado` y sin contexto;
   - borrar con el `claseId` propio una publicación ajena no descarta nada;
   - después del borrado, la descarga de un archivo descartado responde `404`;
   - borrar una clase en cascada (si alguna prueba lo permite), sin violar el `CHECK` ni el `NO ACTION`.
9. **`adjuntos` en todas las respuestas (C-21):**
   - el muro con y sin almacén (`vistaPrevia: null`) y con y sin adjuntos, y el `201` de crear;
   - el frontend con una respuesta sin `adjuntos`: debe dar `isError`, nunca una lista vacía;
   - un cuerpo de crear sin `archivoIds` sigue aceptado por la API (entrada con valor por defecto), pero el formulario siempre lo envía (C-22).
10. **Límites en el cliente:**
    - 5 y 6 archivos, también en dos elecciones sucesivas;
    - 25 MB y 25 MB + 1;
    - `File.type` vacío con extensión conocida y desconocida;
    - un tipo permitido con una extensión que no corresponde;
    - N-D1 (0 bytes, nombre con `/` o con controles): ¿qué dice el aviso?
11. **Flujo de publicar:**
    - doble envío con archivos;
    - falla la solicitud del segundo archivo, falla el `PUT` o falla el `POST` de publicar después de subir;
    - el formulario conserva lo escrito y los archivos;
    - los avisos salen una sola vez;
    - el botón queda en `enEspera` todo el tiempo;
    - quitar archivos con teclado (§7.14);
    - desmontar el formulario con el proceso en curso.
12. **Vista previa:**
    - `onError` pasa a la ficha y no deja una imagen rota;
    - el `alt` es correcto;
    - una `vistaPrevia.url` con `javascript:` o `data:` llegada del servidor (el esquema usa `z.url()`): qué hace el `<img>`;
    - "Descargar" con `window.location.assign` y una URL que no sea `http(s)`;
    - `staleTime` de 4 min frente a la caducidad de 5.
13. **360 px (análisis estático):**
    - fichas y lista de elegidos con nombres largos sin espacios, de 255 caracteres;
    - el botón "Descargar" y el tamaño, que deben partir la línea sin desbordar;
    - imágenes anchas (`max-w-full`).
14. **Regresión:**
    - las 97 `*.ataque` y las pruebas normales de a, b y c, con dos corridas del frontend y una limpia del backend (si cae por CHORE-02, repite y reporta las dos);
    - el muro de c sin adjuntos idéntico: texto de borrar, foco, "Muro" en error y PR-C18.
15. **Configuración:**
    - `STORAGE_*` parciales, vacías, con espacios o con un endpoint que no es `http(s)`;
    - en `production` sin ellas, la API y el worker no arrancan y no imprimen el secreto;
    - sin almacén en `dev`, subir y descargar responden `503` y el muro sale con `vistaPrevia: null`.
- **PA-11:** a las 09:01:21, `docker ps -a` solo muestra `campus-dev-postgres-1`.

## Arbitrajes de la ronda 1 — CLASES-d
Fecha: 2026-10-02. Es de solo lectura: no corrí suites. Fuente: `reporte-tester.md`, "## CLASES-d — Ronda 1" (desde la línea 4132). Leí los casos del tester (`frontend/src/features/clases/archivos-d-r1.ataque.test.tsx`, `backend/test/archivos-d-r1.ataque.test.ts` y `frontend/src/lib/format-d-r1.ataque.test.ts`) y el código afectado.
**Los seis hallazgos se corrigen en el código, sin una decisión del humano.** Todo cabe en archivos ya autorizados en d. Hace falta una **Enmienda 12 corta** del arquitecto antes de lanzar al programador, con el mismo precedente que la Enmienda 8 en c: registra los criterios en §D-D4, §D-D5 y §D-D6 y los IDs PR-D16 a PR-D21 en "Pruebas requeridas" (d). Ningún criterio exige reescribir una `*.ataque`: los casos del tester deben pasar tal como están.

### T-38 (medio) — La lista de archivos se puede cambiar con la publicación en vuelo
**Criterio:** mientras se publica, desde la primera solicitud hasta que termina `handlePublicar`, la lista de elegidos queda **fija**:
- "Quitar" y elegir un archivo no actúan. `handleQuitar` y `handleElegir` regresan sin cambiar nada, y `handleElegir` limpia el valor del selector igual.
- La comprobación usa una **referencia** que `handlePublicar` marca de forma síncrona, antes del primer `await`, y libera en el `finally`. No usa solo el estado de React, que tarda un render en verse en los manejadores.
- Mientras tanto se muestra, junto a la lista, una nota con `role="status"`, en `--text-small` y `--muted-foreground`: "Mientras se publica no puedes cambiar los archivos." (texto en `data.ts`, `TEXTOS_ADJUNTOS`).
- Al terminar con éxito, la lista se limpia como hoy. Si falla, conserva lo elegido y los controles vuelven a actuar.
- Lo que se publica es exactamente la lista que se ve.

**Por qué esta forma y no otras:**
- **`disabled`:** por `CLAUDE.md` sería la forma correcta de "un control que no está disponible", pero V-06 de `styles/clases-r1.ataque` prohíbe `disabled` en el JSX de `features/`.
- **`aria-disabled`:** la misma prueba lo permite solo en `button.tsx`, que no se toca.
- **`enEspera` en "Quitar" o "Adjuntar":** cambiaría el conteo de C-13 (36) y además diría "en curso" de un control que no hace nada.
- **Ocultar los controles:** rompería los casos del tester, que buscan "Quitar privado.pdf" y el selector "Adjuntar archivos" con `getByRole` y `getByLabelText` y necesitan que existan.
- **Lo que queda:** los controles visibles que no actúan, la nota que lo explica y la garantía de que se publica lo que se ve.
- **Residual aceptado:** "Quitar" y "Adjuntar" se ven activos durante la publicación. Lo mitiga la nota, y va como punto de H-6. Si el humano quiere el estado nativo, sería abrir `button.tsx` o la regla de `clases-r1` en otro encargo.

**Archivos:** `components/formulario-publicacion.tsx` y `data.ts`. `DESIGN.md` §7.19 agrega, en "Publicar con archivos": "mientras se publica, la lista no cambia: «Quitar» y «Adjuntar archivos» no actúan y una nota lo dice".
**Prueba normal:** **PR-D16**, en `formulario-publicacion.test.tsx`. Con la solicitud del primer archivo en vuelo:
- "Quitar" no saca el archivo ni evita que se publique;
- elegir otro no lo agrega;
- la nota está visible;
- al terminar, el cuerpo de publicar lleva exactamente los ids de la lista que se veía, la lista se limpia y los controles vuelven a actuar.

### T-39 (medio) — "Descargar" navega a `javascript:` y `data:`
**Criterio: una sola regla en `shared/`.**
- `shared/src/archivos.ts` define `urlDelAlmacenSchema`: `z.url()` restringido a los protocolos `http` y `https`. En zod 4 basta la opción `protocol` (`/^https?$/`); el mensaje, sin valores.
- Lo usan las tres URL del almacén:
  - `descargaRespuestaSchema.url`;
  - `adjuntoSchema.vistaPrevia.url`;
  - `solicitarSubidaRespuestaSchema.subida.url`.
- **Efecto:** el `schema.parse` de `apiClient` rechaza una respuesta con otro esquema de URL, así que `mutateAsync` falla, `handleDescargar` cae en su `catch` y avisa con `toast.error`, sin navegar.
- **También en el backend:** el backend valida sus respuestas con los mismos esquemas, así que nunca responde una URL así.

**No hace falta otra comprobación en el cliente.** El esquema ya garantiza el protocolo. La de `almacenService` (protocolo y origen de la API) se queda, porque además compara el origen.

**Efecto en el muro:** una `vistaPrevia` con una URL de otro esquema hace fallar el muro completo (`isError`). Es el mismo criterio de C-21 (una respuesta mal formada es un error, no se repara en silencio), y esas URL las firma nuestro propio adaptador.

**Archivos:** `shared/src/archivos.ts`, con su `index.ts` si se exporta el esquema.
**Pruebas normales:**
- **PR-D17a**, en `adjuntos-de-publicacion.test.tsx`: una respuesta de descarga con `javascript:alert(1)` o con `data:text/html,…` no llama a `window.location.assign` y da un solo `toast.error`.
- **PR-D17b**, en `backend/src/core/archivos/politica.test.ts`: `urlDelAlmacenSchema` acepta `http://` y `https://` y rechaza `javascript:`, `data:`, `vbscript:`, `file:` y `ftp:`. Importa de `@campus/shared`, como PR-C15a.

### T-40 (bajo) — Vistas previas vencidas al volver al muro después de "Ver más"
**Criterio, lo mínimo que lo resuelve en todos los casos:** el `staleTime` de `usePublicaciones` pasa a ser una **función de la consulta** (TanStack Query 5 lo admite).
- **Con vistas previas:** el muro se vuelve viejo **60 s antes del `expiraEn` más temprano** entre todas las vistas previas de las páginas cargadas. Es decir, `staleTime = max(0, (expiraMínimo − 60 s) − dataUpdatedAt)`.
- **Sin vistas previas:** se conserva el valor de hoy (`TIEMPO_FRESCO_DEL_MURO_MS`).
- **Al volver al muro** con la consulta vieja, se vuelve a pedir, como hoy al montar.
- **El margen de 60 s** hace que las URL viejas sigan vigentes mientras llega la respuesta nueva.
- **El cálculo** es una función pura en `lib.ts` (por ejemplo `tiempoFrescoDelMuro(paginas, dataUpdatedAt)`), y `hooks.ts` solo la usa.

**Además, en `adjuntos-de-publicacion.tsx`:** una imagen que falló se recuerda por su **URL** (`vistaPrevia.url`), no por el id del adjunto. Así, una URL nueva tras volver a pedir el muro vuelve a intentarse. Hoy, con el id, una firma vencida que falló dejaría oculta para siempre la vista previa de ese adjunto, aunque la lista ya traiga una URL vigente.

**Descartadas:**
- **Un `staleTime` menor:** no resuelve el caso, porque `dataUpdatedAt` se renueva con cada página.
- **`refetchOnMount: "always"`:** volvería a pedir todas las páginas en cada vuelta al muro, aunque no haya ninguna imagen.
- **Pedir una URL nueva en el `onError`:** necesitaría una ruta nueva.

**Archivos:** `lib.ts`, `hooks.ts`, `components/adjuntos-de-publicacion.tsx` y `DESIGN.md` §7.19, donde la frase "el muro se considera fresco 4" (N-D3) pasa a decir "el muro se vuelve a pedir antes de que venza la primera vista previa".
**Pruebas normales:**
- **PR-D18a**, en `lib.test.ts`: la función con y sin vistas previas, con dos páginas firmadas en momentos distintos (gana el `expiraEn` más temprano) y con un vencimiento ya pasado (da 0).
- **PR-D18b**, en `adjuntos-de-publicacion.test.tsx`: una imagen que falló con una URL vuelve a mostrarse cuando el adjunto llega con otra URL.

### T-41 (bajo) — El aviso de un rechazo al solicitar no nombra el archivo (N-D1)
**Criterio:**
- Cuando falla la **solicitud** de subida de un archivo con un `ApiError`, el aviso nombra el archivo y dice el motivo: `TEXTOS_ADJUNTOS.errorRechazado(nombre, motivo)` → "No pudimos subir «\<nombre\>»: \<motivo\>".
  - Con `ARCHIVO_INVALIDO`, `motivo` es el `mensaje` del servidor: ya está en español, dice la causa y no lleva valores ("El archivo está vacío o pesa más de 25 MB.", "El nombre del archivo no es válido.").
  - Con cualquier otro código, `motivo` sale de `mensajeDeErrorClases`.
- Sale un solo aviso, no se publica y se conserva lo escrito.
- Un fallo del `PUT` al almacén conserva el texto de hoy ("No pudimos subir «\<nombre\>». Inténtalo de nuevo.").
- **El cliente no agrega validaciones nuevas** de tamaño 0 ni de caracteres del nombre. Los casos del tester exigen que el cliente deje elegir esos archivos ("El cliente lo deja pasar…"): rechazarlos al elegir rompería su precondición. Que los rechace el servidor y el aviso lo explique cumple §7.19 y §9.

**Archivos:** `components/formulario-publicacion.tsx` y `data.ts`.
**Prueba normal:** **PR-D19**, en `formulario-publicacion.test.tsx`: un `400 ARCHIVO_INVALIDO` al solicitar da un solo aviso con «nombre» y el mensaje del servidor; un `503` al solicitar da «nombre» y el texto de `ALMACEN_*`; ninguno publica.

### T-42 (bajo) — Un nombre con un sustituto suelto se guarda distinto de lo que se responde
**Criterio:** se **rechaza**, con `400 ARCHIVO_INVALIDO` "El nombre del archivo no es válido.", igual que los controles y los bidireccionales.
- `CARACTER_PROHIBIDO_EN_NOMBRE` de `core/archivos/politica.ts` suma `\p{Cs}`, que con la bandera `u` reconoce un sustituto suelto. Así no se escribe fila ni se firma nada.
- `sinSustitutosSueltos` de `disposicionDeContenido` se queda como defensa.
- **Descartado:** normalizar a U+FFFD y responder lo guardado. Guardaría un nombre que nadie eligió.

**Fuera del alcance de d:** los textos del muro (título, anuncio y comentario) también aceptan un sustituto suelto y lo guardan como U+FFFD. Es una observación para el cierre de d: un pendiente con destino en `textoLargoSchema` y `nombreClaseSchema`, que se trata como la regla de contenido visible.

**Archivo:** `core/archivos/politica.ts`.
**Prueba normal:** **PR-D20**, en `politica.test.ts`: `validarArchivoDeclarado` con un sustituto alto suelto y con uno bajo suelto da `ARCHIVO_INVALIDO`; un emoji (un par válido) en el nombre se acepta.

### T-43 (bajo) — "1024 KB"
**Criterio:** redondear antes de elegir la unidad.
- Si `Math.round(bytes / 1024)` llega a 1024, se pasa a MB, que se formatea igual que hoy ("1 MB").
- Los cambios de unidad exactos y PR-D14 no cambian.

**Archivo:** `frontend/src/lib/format.ts`.
**Prueba normal:** **PR-D21**, en `frontend/src/lib/format.test.ts`: 1,048,575 y 1,048,064 bytes dan "1 MB"; 1,047,552 da "1023 KB".

### Archivos y "No se toca"
- **Todos los archivos están autorizados en d** ("Cambios por capa" y la fila d de las listas cerradas):
  - producción: `components/formulario-publicacion.tsx`, `components/adjuntos-de-publicacion.tsx`, `data.ts`, `lib.ts` y `hooks.ts` de `features/clases`, `shared/src/archivos.ts` (y `shared/src/index.ts`), `backend/src/core/archivos/politica.ts`, `frontend/src/lib/format.ts` y `docs/DESIGN.md` (§7.19);
  - pruebas: `formulario-publicacion.test.tsx`, `adjuntos-de-publicacion.test.tsx`, `lib.test.ts`, `politica.test.ts` y `format.test.ts`.
- **No hace falta ningún archivo nuevo** ni tocar `publicacion-del-muro.tsx`, `comentarios-de-publicacion.tsx`, `muro-view.tsx`, `apiClient.ts`, `button.tsx` ni ninguna `*.ataque`.
- **La base de V-01** para la corrección es la tabla de la ronda 1 del tester (101).
- **El arquitecto solo registra en la Enmienda 12:**
  - los criterios (§D-D4: `urlDelAlmacenSchema`; §D-D5: lista fija durante la publicación y `staleTime` como función; §D-D6: la nota y el aviso de rechazo);
  - los IDs PR-D16 a PR-D21;
  - la observación del sustituto suelto en los textos del muro como pendiente;
  - el residual de T-38 para H-6.

### Para la verificación de la corrección
Comprobaré:
- que los 10 casos rojos del tester pasan sin tocarlos y por la razón correcta: T-38 por la referencia y la nota, no por un render más lento; T-40 por la función de `staleTime`, no por un valor fijo menor;
- que `enEspera=` sigue en 36 y `disabled` y `aria-disabled` en 0 en `features/`;
- que no hay una segunda definición del protocolo permitido fuera de `shared/` (aparte de la de `almacenService`, que también compara el origen);
- que `muro-recuperar-c-r3` y `-r4` y PR-C18 siguen en verde con el `staleTime` nuevo.

## Verificación del resumen — CLASES-d — corrección de la ronda 1
Fecha: 2026-10-02, de 10:04 a 10:13. Verifico `resumen-programador.md`, "## CLASES-d — corrección de la ronda 1" (línea 1697), contra la Enmienda 12 y mis arbitrajes ("## Arbitrajes de la ronda 1 — CLASES-d").
**Veredicto del resumen: ACEPTADO.** Ninguna cifra ni ID difiere de mi corrida, y las seis correcciones cumplen el criterio exacto. **Enmienda 12: APROBADA.** Pasa a la ronda 2 del tester de d.
Verificación propia: lint 0 · build `✓ built in 682ms` · `npm run test` desde la raíz con **código 0 a la primera** (backend `118 passed (118)` / `1295 passed (1295)`, frontend `100 passed (100)` / `1339 passed (1339)`) · backend por paquete, limpio · frontend por paquete, dos veces en verde · V-01 101/101 · PA-07, PA-10 y PA-11 limpios.

### Cifras: resumen contra mi corrida
| Cifra | Resumen | Mi corrida |
|---|---|---|
| PA-01 | regla y red correctas | `True / Inbound / Block / Public`; `IZZI-F281-5G`, antes de cada corrida del backend |
| `npm run lint` (raíz) | código 0 | código 0 |
| `npm run build` (raíz) | `✓ built in 692ms` | `✓ built in 682ms`, código 0 |
| `npm run test` (raíz) | corrida 1 caída por CHORE-02; corrida 2 con código 0 | código 0 a la primera: backend 118/1295, frontend 100/1339 |
| Backend por paquete | 1295/1295, dos corridas | `118 passed (118)` / `1295 passed (1295)`, código 0 |
| Frontend por paquete | 1339/1339 | `100 passed (100)` / `1339 passed (1339)`, dos veces |
| `npx vitest list` | 118/1295 y 100/1339 | 1295 casos en 118 archivos; 1339 en 100 |
| PR-D16 a PR-D21 | 8 casos con título exacto | Los 8 títulos aparecen exactos y una sola vez. Hay 64 IDs PR-D distintos (56 + 8), sin repetidos |
| Los 10 rojos del tester | en verde sin tocarlos | En verde dentro de las suites, con los mismos hashes de la tabla de la ronda 1 |
| V-01 | 101/101 | **101/101** contra la tabla de "CLASES-d — Ronda 1" (`diff` por programa) |
| PA-07 | los dos aceptados en las corridas limpias | Raíz y paquete: los cuatro términos en 0; `P2028` solo en `sesiones.ts:39` y `tokens-cuenta.ts:116` |
| PA-10 | `X-Amz-Signature` 0 | 0 en las dos salidas del backend |
| PA-11 | limpio | A las 10:12 solo `campus-dev-postgres-1` |

### V-04 y V-05
**V-04:**
- `enEspera=`: 36. `disabled` y `aria-disabled` en el JSX de `features/`: 0. `?? []`: 0.
- `from "minio"` solo en `adapters/storage/index.ts`. `fetch(` solo en `apiClient.ts` (2) y `almacenService.ts` (1).
- **Protocolo permitido:** `urlDelAlmacenSchema` se define una sola vez (`shared/src/archivos.ts:35`) y la usan las tres URL. Fuera de ahí solo queda la comprobación de `almacenService`, que el arbitraje conserva porque además compara el origen. No hay otra definición.

**V-05** (contra `c7fcece`):
- intactos:
  - del backend: `middleware/`, `adapters/db/{clases,inscripciones,cliente,errores}.ts`, `queue`, `notifier`, `auth`, `handlers/clases/{clases,alumnos}.ts`, `workers/`, `server.ts`, `worker.ts` y E6;
  - del frontend: `components/`, `features/auth`, `features/admin`, `services/` existentes, `tokens.css`, `router.tsx`, `muro-view.tsx`, `comentarios-de-publicacion.tsx` y `formulario-clase.tsx`;
  - los `package.json`, `eslint.config.mjs` e `infra/`.
- `publicacion-del-muro.tsx` conserva solo el cambio de la Enmienda 11 (8 inserciones y 1 borrado contra `c7fcece`).
- El lockfile y `backend/package.json` siguen como en la entrega anterior: solo `minio`.

### Las correcciones contra el criterio de la Enmienda 12
- **T-38:**
  - `publicandoRef` se marca en la primera línea de `handlePublicar`, antes del primer `await`, y se libera en el `finally`;
  - `handleElegir` (que limpia antes el selector) y `handleQuitar` regresan con la referencia marcada, y `handleSubmit` también la consulta;
  - la nota es `<p role="status">`, en `text-small` y `text-muted-foreground`, con `TEXTOS_ADJUNTOS.listaFija`;
  - no hay `disabled`, `aria-disabled`, `enEspera` nuevo ni controles ocultos;
  - se publica la lista que se ve, porque la referencia impide cambiarla, y `DESIGN.md` §7.19 lo documenta.
- **T-39:** `urlDelAlmacenSchema = z.url({ protocol: /^https?$/, error: … })`, sin valores en el mensaje. Está en las tres URL, se exporta en `index.ts` y `handleDescargar` no cambia (el `catch` avisa).
- **T-40:**
  - `tiempoFrescoDelMuro(paginas, dataUpdatedAt)` es pura, en `lib.ts`: `max(0, primerVencimiento − 60 s − dataUpdatedAt)` y, sin vistas previas, 240,000;
  - el margen es una constante de `data.ts` (`MARGEN_DE_VISTA_PREVIA_MS`);
  - `staleTime` es una función de la consulta en `hooks.ts`;
  - `adjuntos-de-publicacion.tsx` recuerda por URL (`urlsRotas`);
  - `PaginaDelMuro` en `types.ts` es un alias de `ListaPublicacionesRespuesta`, de `shared/`, así que no es un tipo declarado a mano.
- **T-41:**
  - el aviso es `errorRechazado(nombre, motivo)`: con `ARCHIVO_INVALIDO`, el mensaje del servidor; con los demás, `mensajeDeErrorClases`;
  - un error que no es `ApiError` (el `PUT`) conserva `errorSubida`;
  - no hay validaciones nuevas en el cliente.
- **T-42:** `CARACTER_PROHIBIDO_EN_NOMBRE` suma `\p{Cs}` (con la bandera `u`), sin normalizar. `sinSustitutosSueltos` se queda.
- **T-43:** primero redondea a KB y después elige la unidad. PR-D14 y los cambios de unidad exactos siguen en verde.

### Enmienda 12 (modo plan): APROBADA
- **Forma:**
  - `git diff c7fcece -- plan.md` da 201 inserciones y 24 borrados, y el SHA-256 es `91275F96…`, lo mismo que anotó el orquestador;
  - los hunks nuevos desde la Enmienda 11 caen en lo declarado: la cabecera (la línea de la Enmienda 12), la sección de la Enmienda 12, §D-D4 (`urlDelAlmacenSchema` y el nombre), §D-D5 (lista fija, aviso de rechazo, `staleTime` como función, imagen por URL y `formatearTamano`), §D-D6 (los dos textos), §D-D7 (las dos líneas de §7.19), "Cambios por capa" (`lib.ts` y `hooks.ts`), "Pruebas requeridas" (d) (PR-D16 a PR-D21 y la nota), el paso 46 y "Pendientes";
  - no toca PARADAS, "No se toca", los C-n ni la lista cerrada.
- **Fondo:** es mi arbitraje, transcrito fielmente: los descartes y sus motivos, el residual de T-38 para H-6, el pendiente del sustituto suelto en los textos del muro y el destino de O-1 a O-9. Las tres "Contradicciones" son correctas.

### Los invisibles de `shared/src/clases.ts`
- **Qué son:** 4 caracteres de control de dirección **literales** en la línea 48: `const INVERSORES_DE_DIRECCION = /[U+202A-U+202E U+2066-U+2069]/u` (U+202A, U+202E, U+2066 y U+2069, los extremos de los dos rangos). Están desde CLASES-a (`855069b`).
  - El orquestador no los vio porque su lista no incluía los bidireccionales.
  - Ni d ni la corrección agregaron otro: mi script compara cada archivo de producción tocado con `c7fcece`.
- **¿Importa?** La función es correcta: la expresión rechaza los inversores de dirección, y lo prueban `codigo-r1`, `nombres-guarda-r3`, PR-A08d y otros.
  - El riesgo es de **revisión**: un U+202E literal reordena en pantalla el resto de la línea en editores y diffs (el patrón "Trojan Source"), y GitHub marca el archivo con un aviso de caracteres bidireccionales.
  - Además va contra la convención que fijamos en c para las pruebas: los invisibles se escriben con escapes.
- **Destino: no bloquea.**
  - Carril trivial en el cierre de d: reemplazar los cuatro literales por escapes (`\u202A-\u202E\u2066-\u2069`), como ya hace `core/archivos/politica.ts:16`, y comprobarlo por programa, porque la herramienta de edición convierte los escapes en caracteres reales (O-10).
  - `shared/src/clases.ts` está autorizado en d, aunque esa línea es de a, así que el arquitecto lo registra en la enmienda de cierre.

### Problemas que bloquean
Ninguno.

### Detalles menores (no bloquean)
- **N-D4 no se aplicó y el resumen no lo menciona:** `env.test.ts:219` sigue con `if (soloElEndpoint.ok) return`. La Enmienda 11 lo mandaba "en la próxima entrega de d". Va al cierre de d por el carril trivial, junto con los invisibles de arriba, y a la medición (una omisión no declarada).
- **`avisoDeFalloAlSubir`** es una función pura definida en el archivo del componente (`formulario-publicacion.tsx:30`). Por la regla 3 de `CLAUDE.md` vive en `lib.ts`. Va al carril trivial en el cierre.
- **La nota de T-38** aparece también al publicar sin archivos ("no puedes cambiar los archivos" sin que haya ninguno). Es inofensivo; si se quiere, se muestra solo con `elegidos.length > 0`. Va al cierre o a H-6.

### Lista de puntos para la ronda 2 del tester (CLASES-d)
Hallazgos desde T-44. Las `*.ataque` nuevas llevan el sufijo `-r2` de d. Regla de PA-07 de d. PA-01 antes del backend.
1. **Regresión de los 10 casos de la ronda 1, por la razón correcta:**
   - T-38, por la referencia: comprobar que el estado de React no basta;
   - T-39, por el esquema de `shared/`: el aviso sale del `catch`, sin navegar;
   - T-40, por la función de `staleTime` y no por un valor fijo menor: con dos páginas, el `staleTime` lo marca la primera vista previa que vence;
   - T-41, con el nombre y el motivo;
   - T-42, con `400` y sin fila;
   - T-43, con "1 MB".
2. **Bordes de T-38:**
   - "Quitar" y elegir un archivo en el mismo turno del clic en "Publicar", antes de que se resuelva el primer `await`, y justo después del `finally`, con éxito y con fallo;
   - el doble envío (dos `submit` seguidos);
   - "Quitar" con teclado durante la publicación: el foco no se pierde;
   - si el fallo es al publicar después de subir, la lista queda editable;
   - la nota aparece y desaparece y se anuncia (`role="status"`).
3. **Bordes de T-39:**
   - `HTTP://` y `HTTPS://`, `http:host` sin barras y `//host` (sin protocolo);
   - `blob:`, `data:`, `javascript:` con espacios o tabuladores al inicio y con mayúsculas (`JaVaScRiPt:`), y `vbscript:`;
   - en las tres URL, incluida una `vistaPrevia` con otro protocolo, que debe hacer fallar el muro completo (`isError`), no ocultar la publicación;
   - el backend nunca responde una URL que no pase el esquema.
4. **Bordes de T-40:**
   - páginas con `expiraEn` distintos y una sin vistas previas;
   - un `expiraEn` ya pasado al cargar (`staleTime` 0);
   - volver al muro antes y después del margen de 60 s;
   - una imagen que falló y vuelve con otra URL;
   - que con una consulta en error, o sin datos, no se lance;
   - que el muro sin vistas previas siga con 4 minutos.
5. **Bordes de T-41:**
   - dos archivos rechazados y uno aceptado, en distinto orden: se detiene en el primero, con un solo aviso con ese nombre, y no publica;
   - un `503` al solicitar;
   - un nombre con HTML o con `«»` en el aviso;
   - el mensaje del servidor con texto inesperado, que debe pintarse como texto.
6. **Bordes de T-42:**
   - pares válidos (emoji, CJK de plano astral) y sustitutos sueltos al inicio, en medio y al final;
   - **el pendiente del cierre:** sustitutos sueltos en el título, el anuncio y el comentario del muro. Se reporta como observación (va al cierre de d), no como hallazgo de esta ronda.
7. **Bordes de T-43:**
   - 0, 1, 1023 y 1024 B; 1,048,063, 1,048,064 y 1,048,575 B;
   - 1 MB exacto; 25 MB y 25 MB + 1;
   - 1,073,741,823 B (cerca de 1 GB: el cliente nunca lo admite, pero la función no debe dar "1024 MB" si se le pide).
8. **Lo que vi débil:**
   - la nota de T-38 al publicar sin archivos (detalle de arriba);
   - `avisoDeFalloAlSubir` con un `ApiError` cuyo `message` esté vacío;
   - `tiempoFrescoDelMuro` con muchas páginas: `Math.min(...vencimientos)` con varios miles de elementos. Hoy son 100 publicaciones por página y 5 adjuntos, así que no es riesgo, pero conviene un borde.
9. **Regresión completa:**
   - las 101 `*.ataque` y las pruebas normales de a, b, c y d, con dos corridas del frontend y una limpia del backend (si cae por CHORE-02, repite y reporta las dos);
   - el muro de c sin adjuntos idéntico (texto de borrar, foco, "Muro" en error y PR-C18), ahora con el `staleTime` como función.

### Arbitraje de PA-12 — ronda 2 de CLASES-d
Fecha: 2026-10-02. Es de solo lectura. Fuente: `reporte-tester.md`, "CLASES-d — Ronda 2" (desde la línea 4449), y `backend/test/archivos-d-r1.ataque.test.ts:880-1016`.
**Decisión: (a), con una condición. Se registra como C-23 en la enmienda de cierre de d, con el mismo precedente que C-16 y C-17.**
- **Por qué se cae:** el fallo (`expected 61 to be 60`) es de la prueba, no de producción. `archivo.count()` sin filtro cuenta la tabla completa mientras otros archivos de prueba insertan filas en paralelo. Las 11 peticiones ya habían respondido su `401` o `403` antes del conteo. El caso aislado pasa, PA-07 está limpio y no fue CHORE-02.
- **Lo que se autoriza:** los dos conteos (`:897` y `:1016`) se acotan con `where: { OR: [{ claseId: { in: [<toda clase que aparece en una URL del caso>] } }, { subidoPor: { in: [<todo usuario que hace una petición en el caso>] } }] }`.
  - **Las clases:** al menos `e.claseA`, `claseConCambio.id` y `claseDeBaja.id`, más `e.claseB` si alguna petición la usa.
  - **Los usuarios:** el estudiante inscrito, el admin, el maestro ajeno, `conCambio`, `deBaja` y el maestro dueño, si llama.
  - **Por qué los dos:** solo con las clases, una escritura indebida con otro `claseId` (o hecha por un actor del caso en otra clase) pasaría sin detectarse. Con el `OR`, el conteo sigue demostrando que ninguna de las 11 peticiones escribió, y deja de depender del resto de la suite.
- **Lo que no cambia:**
  - ninguna otra aserción ni el título;
  - las comprobaciones de que no se firma nada;
  - las respuestas esperadas.
- **Cierre del cambio:**
  - el tester publica el hash nuevo de `archivos-d-r1.ataque.test.ts` en la tabla de la ronda 2;
  - lo corre aislado dos veces y en la suite completa;
  - sigue con la ronda.
  - `archivos-d-r2.ataque.test.ts`, todavía sin correr, entra en la tabla con las demás.

## Verificación del resumen — CLASES-d — corrección de la ronda 2
Fecha: 2026-10-02, de 10:42 a 10:53. Verifico `resumen-programador.md`, "## CLASES-d — corrección de la ronda 2" (línea 1764), contra T-44 (`reporte-tester.md`, "CLASES-d — Ronda 2", línea 4449; C-23 en 4475; tabla de 104 en 4613) y contra los detalles que dejé en la verificación anterior (N-D4 y `avisoDeFalloAlSubir`).
**Veredicto del resumen: ACEPTADO.** Ninguna cifra ni ID difiere de mi corrida, y la corrección es mínima. Pasa a la ronda 3 del tester de d, la última antes de escalar.
Verificación propia: lint 0 · build `✓ built in 631ms` · `npm run test` desde la raíz con **código 0 a la primera** (backend `119 passed (119)` / `1298 passed (1298)`, frontend `102 passed (102)` / `1375 passed (1375)`) · backend por paquete: la primera corrida cayó por CHORE-02 y la repetición salió limpia · frontend por paquete, dos veces en verde · V-01 104/104 · no corrí dos suites a la vez.

### Cifras: resumen contra mi corrida
| Cifra | Resumen | Mi corrida |
|---|---|---|
| PA-01 | regla y red correctas | `True / Inbound / Block / Public`; `IZZI-F281-5G`, antes de cada corrida del backend |
| `npm run lint` (raíz) | código 0 | código 0 |
| `npm run build` (raíz) | `✓ built in 654ms` | `✓ built in 631ms`, código 0 |
| `npm run test` (raíz) | código 0; backend 1298/119, frontend 1375/102 | código 0; backend `119 passed (119)` / `1298 passed (1298)`, frontend `102 passed (102)` / `1375 passed (1375)` |
| Backend por paquete | corrida 1 caída por CHORE-02; corrida 2 limpia | **Corrida 1 caída por CHORE-02:** `9 failed \| 1286 passed \| 3 skipped (1298)`. Son 9 tiempos límite (`cuentas-r1`, `cuentas-r3`, `bloqueo-usuario` A1, workers, `intentos`, PR-A15h y un caso de restablecer). Los `P2028` son todos de AUTH: `sesiones.ts:39`, `tokens-cuenta.ts:116` y `sesiones.ts:110`, este último dentro del flujo de restablecer, como en c. No hay ninguno en rutas de c ni de d. **Corrida 2:** `119 passed (119)` / `1298 passed (1298)`, limpia, con exactamente los dos aceptados. Por la regla de d, no es PA-07 |
| Frontend por paquete | 1375/1375, dos corridas | `102 passed (102)` / `1375 passed (1375)`, dos veces |
| `npx vitest list` | 119/1298 y 102/1375 | 1298 casos en 119 archivos; 1375 en 102 |
| Casos nuevos | PR-D21 (MB y GB) y `avisoDeFalloAlSubir` | Los dos con el título exacto del resumen. El PR-D21 de la ronda 1 sigue intacto. Hay 64 IDs PR-D distintos (sin cambio: PR-D21 se extiende con un caso y su ID) |
| V-01 | 104/104 | **104/104** contra la tabla de "CLASES-d — Ronda 2" (con el hash de C-23 para `archivos-d-r1`) |
| PA-07 | los dos aceptados; 3 "Error no controlado" provocados | Raíz y corrida limpia: los cuatro términos en 0; `P2028` solo `sesiones.ts:39` y `tokens-cuenta.ts:116`; 3 `ZodError` "La URL del almacén debe ser http o https", los provocados por `archivos-d-r2` (ver abajo) |
| PA-10 | 0 | `X-Amz-Signature` 0 en las salidas del backend |
| PA-11 | limpio | A las 10:53 solo `campus-dev-postgres-1` |

### La corrección
- **`formatearTamano` (`lib/format.ts`):** usa `UNIDADES_DE_TAMANO = ["B", "KB", "MB", "GB"] as const` y un ciclo `while`.
  - `redondeado()` redondea en la unidad actual (0 decimales en B y KB, 1 en MB y GB) y lo convierte con `Number()`. Si llega a 1024 y hay una unidad siguiente, divide y sube.
  - **No vuelve "1024.0 MB":** `Number("1024.0")` es 1024, que cumple la condición del ciclo y sube a GB, donde 0.99995 da "1.0" y se imprime "1 GB". Lo mismo en KB (`1023.5.toFixed(0)` es "1024" y sube).
  - `Number()` quita el ".0" sin una expresión regular aparte.
  - No hay ramas por unidad, ternarios anidados (un solo ternario para los decimales) ni valores por defecto. El índice nunca sale de la lista, por la condición del ciclo.
  - **Límite inherente, sin riesgo:** un valor mayor o igual a 1024 GB se queda en GB ("1024 GB"); el cliente nunca acepta más de 25 MB. Igual que antes, un número negativo o `NaN` no se valida: la función solo recibe `File.size` y enteros del servidor validados por zod.
  - Los 11 casos de `format-d-r2` pasan sin tocarlos.
- **N-D4 (`env.test.ts`):** seis `return` de PR-D02a a PR-D02c pasan a `throw new Error("<variable> debía ser inválido y salió válido")` (o "válido y salió inválido"), siempre después de la aserción. Los `return` de los casos anteriores a d no se tocaron, y está bien así: no son de d.
- **`avisoDeFalloAlSubir`:** pasa a `features/clases/lib.ts`, idéntica, y el componente la importa. Se quitaron de él los imports que ya no usaba. Tiene un caso nuevo en `lib.test.ts` con los tres caminos (`ARCHIVO_INVALIDO`, otro código y un error que no es `ApiError`).
- **Alcance:**
  - el orquestador comparó la lista de SHA-256 de los paquetes y solo cambiaron los seis archivos declarados;
  - por mi parte, `middleware/`, `components/`, `services/`, `muro-view.tsx` y `eslint.config.mjs` siguen iguales a `c7fcece`;
  - V-04 sigue en orden: `enEspera=` 36, `minio` y `fetch(` en su sitio, y ningún invisible nuevo.

### Los tres `500` provocados por `archivos-d-r2` y la regla de PA-07 de d
- Mi regla de d dice que un `500` del muro o de archivos en una corrida limpia es PA-07. Estos tres no lo son:
  - los provoca **a propósito** un caso del tester con un almacén doble que firma `javascript:` y `data:`, algo que el adaptador real no puede producir, porque el endpoint se valida como `http(s)`;
  - son exactamente tres (`POST …/archivos`, `POST …/archivos/:id/descarga` y `GET …/publicaciones`), con el `ZodError` del esquema de `shared/`, y no filtran la URL.
- **Precisión de la regla para lo que queda de d:** un `500` del muro o de archivos que una `*.ataque` provoca a propósito con un doble imposible, y que el reporte identifica por ruta y causa, se excluye como los `500` provocados de siempre. Cualquier otro `500` del muro o de archivos en una corrida limpia sigue siendo PA-07.
- **O-14 del tester** (ese caso responde `500` y no `503`, y en solicitar la fila `pendiente` ya se insertó antes del `parse`): es una nota para el cierre de d. Si se toca, el handler valida la respuesta de la firma antes de insertar, o traduce ese error a `503 ALMACEN_NO_DISPONIBLE`. No bloquea, porque con el adaptador real no ocurre.

### Problemas que bloquean
Ninguno.

### Lista de puntos para la ronda 3 del tester (CLASES-d), la última antes de escalar
Es una ronda de **regresión y bordes residuales**, no de ataque nuevo amplio. Hallazgos desde T-45. Las `*.ataque` nuevas llevan el sufijo `-r3` de d. Regla de PA-07 de d (con la precisión de arriba). PA-01 antes del backend; nunca dos suites a la vez.
1. **Regresión completa:**
   - las 104 `*.ataque` y las pruebas normales de a, b, c y d, con dos corridas del frontend y una limpia del backend (si cae por CHORE-02, repite y reporta las dos);
   - V-01 contra la tabla de la ronda 2.
2. **T-44 por la razón correcta:**
   - el ciclo sube de unidad porque redondea antes de elegirla, no por un caso especial: 1,073,741,823 B da "1 GB" y 1,073,689,395 da "1023.9 MB";
   - los vecinos de cada cambio de unidad, también con decimales: 1023.5 KB, 1023.95 MB, 1 GB exacto, 1.5 GB y 1023.95 GB;
   - que ningún resultado lleve ".0" ni "1024" en una unidad que no sea la última;
   - T-43 sigue en verde.
3. **`avisoDeFalloAlSubir` desde `lib.ts`:** los tres caminos (`ARCHIVO_INVALIDO` con el mensaje del servidor, otro código con `mensajeDeErrorClases` y un error que no es `ApiError` con el texto de la subida), y el formulario sigue avisando una sola vez con el nombre.
4. **N-D4:** PR-D02a a PR-D02c siguen en verde, y un `throw` solo se alcanza si la aserción anterior falla. Solo revisión del código, sin una `*.ataque` nueva si no hace falta.
5. **Residuales para confirmar como observación, no como hallazgo nuevo:**
   - O-11 (sustitutos sueltos en los textos del muro);
   - O-12 (`Math.min` con muchos vencimientos);
   - O-13 (la nota sin archivos);
   - O-14 (`500` y fila huérfana con un almacén imposible).

   Ya tienen destino en el cierre de d.
6. **Bordes que quedan de T-38 a T-42,** solo si no los cubre ya una `*.ataque` vigente: el foco tras quitar y publicar con teclado, y el muro con una página sin vistas previas junto a otra con ellas, al volver después del margen.
7. **PA-10 y logs:** las rutas de archivos con `LOG_LEVEL=trace`, sin firmas, URL ni secretos, también con los `ZodError` provocados.

## Revisión final — CLASES-d
# Revisión del Manager — CLASES-d (archivos adjuntos y vista previa) — final
Fecha: 2026-10-02, de 11:05 a 11:40. Modo 2. Base dentro de los paquetes `<Cc>` = `c7fcece`; fuera, `<R>` = `3399c79`, salvo los protegidos por SHA-256. Rama `feat/clases`. Tester en RESISTE en la ronda 3 (`reporte-tester.md`, "CLASES-d — Ronda 3", línea 4723), sin hallazgos.
Veredicto: **APROBADO**. No hay problemas que bloqueen. CLASES-d hace lo planeado (§D-D1 a §D-D7 con las Enmiendas 10 a 12), solo lo planeado y todo lo planeado. La suite está en verde con PA-01, las 107 `*.ataque` coinciden con la tabla de cierre del tester y las reglas que no se rompen se cumplen. Lo que queda son pendientes con destino, tres arreglos de texto para el cierre (uno en código, sin cambio de comportamiento) y la comprobación humana del paso 47.
Verificación propia: lint código 0 · build `✓ built in 622ms`, código 0 · `npm run test` desde la raíz: frontend `104 passed (104)` / `1395 passed (1395)`; backend caído por CHORE-02 (`10 failed | 1290 passed (1300)`, todos tiempos límite) · backend por paquete, repetición limpia: `120 passed (120)` / `1300 passed (1300)` · frontend por paquete, dos veces: `104 passed (104)` / `1395 passed (1395)` · V-01 107/107 · V-03 en 0 · PA-07, PA-10 y PA-11 limpios. Nunca corrí dos suites a la vez.

### Cifras: tester (ronda 3) contra mi corrida
| Cifra | Tester, ronda 3 | Mi corrida |
|---|---|---|
| PA-01 | `True / Inbound / Block / Public`; `IZZI-F281-5G` | Igual, comprobado antes de cada corrida del backend. Contenedores al empezar: solo `campus-dev-postgres-1` |
| `npm run lint` (raíz) | código 0 por paquete | código 0 (`All matched files use Prettier code style!` y `> tsc -b`) |
| `npm run build` (raíz) | — | `✓ built in 622ms`, código 0 |
| `npm run test` (raíz), 11:09:38 a 11:12:05 | — | Frontend `104 passed (104)` / `1395 passed (1395)`. Backend **caído por CHORE-02**: `7 failed \| 113 passed (120)` / `10 failed \| 1290 passed (1300)`. Los 10 son `Test timed out` (15 a 40 s): `cuentas-r1` (2), `cuentas-r3`, `bloqueo-usuario` A1, `auth-login` (2), `cuentas-03a-r1`, `worker-correo-de-cuenta` y, por arrastre, PR-D04a y PR-D04b (su `escenario()` crea cuentas en `usuarios` detrás del `LOCK TABLE`). Ningún rojo por aserción |
| Backend por paquete (repetición), 11:12:59 a 11:13:58 | `120 passed (120)` / `1300 passed (1300)` | **`120 passed (120)` / `1300 passed (1300)`**, limpia |
| Frontend por paquete | `104 passed (104)` / `1395 passed (1395)` | Igual, dos veces (53.60 s y 54.37 s) |
| `npx vitest list` | — | Backend 1300 casos en 120 archivos; frontend 1395 en 104 (con `grep -a`: la lista lleva un caso con bytes no imprimibles en el título) |
| IDs PR-D | — | Los **64** distintos aparecen; cada uno una vez, salvo PR-D21, que tiene dos casos (el de T-43 y el de T-44), como acepté en la verificación de la corrección 2 |
| V-01 | 107 de la tabla de cierre | **107/107** contra la tabla de la línea 4831 (`diff` por programa); 107 `*.ataque` en el árbol |
| V-03 | — | `validate`, `format --check`, `generate`, `migrate status` ("9 migrations found… Database schema is up to date!") y `migrate diff --exit-code` ("No difference detected."), los cinco con código 0 |
| PA-07, corrida de la raíz (caída) | — | `40P01`, `deadlock detected`, `could not serialize` y `too many clients` en 0. `P2028`: los dos aceptados (`tx.sesion.create()` en login, `tx.tokenCuenta.updateMany()` en restablecer) y uno en `POST /api/auth/cambiar-contrasena` (`tx.sesion.findFirst()`, `adapters/db/usuarios.ts:293`), el defecto de AUTH ya anotado con prioridad alta en `docs/ESTADO.md` §3. Ninguno en rutas de c ni de d. Por la regla de d (otros términos en 0, rojos solo de tiempo, repetición limpia con los dos aceptados, sitio reportado), no es PA-07 |
| PA-07, corrida limpia | los dos aceptados; 3 `500` provocados | Los cuatro términos en 0; `P2028` solo los dos aceptados. `5xx` por ruta (correlacionados por `requestId`): 7 `500` de login (5 "fallo simulado en la búsqueda", 1 "al crear la sesión", 1 el `P2028` aceptado), 1 de restablecer (aceptado), 1 de `/prueba/error-comun`, y **3 `500` con `ZodError`** en `POST …/archivos`, `POST …/archivos/:id/descarga` y `GET …/publicaciones`: los del almacén imposible de `archivos-d-r2`, excluidos por mi precisión de la corrección 2. Los `503` son los de los almacenes nulos o inalcanzables (2 + 2 + 1) y el de `/api/salud`. Ningún otro `500` del muro ni de archivos |
| PA-10 | 0 | En las salidas de la raíz y del paquete: `X-Amz-Signature` 0, `X-Amz-Credential` 0, el secreto de MinIO de desarrollo 0, `materiales/` 0, el origen del doble 0 |
| PA-11 | limpio | La corrida del paquete terminó a las 11:13:58; a las 11:15:58, solo `campus-dev-postgres-1` |

### Diff contra el plan
`git diff c7fcece -- shared backend frontend` y los archivos nuevos: 45 rastreados con cambios y 29 sin rastrear.
- **Lo planeado:**
  - `shared/src/archivos.ts` con §D-D4 completo, `urlDelAlmacenSchema` (T-39), `archivoIdParamSchema` y `CODIGOS_ARCHIVOS` (Enmienda 11). `adjuntos` es obligatorio en `publicacionSchema` y `archivoIds` va en las dos ramas de `crearPublicacionSchema` (C-21 y C-22);
  - el puerto `core/archivos/almacen.ts`;
  - `politica.ts` con las firmas de "Cambios por capa", las tres fábricas y `\p{Cs}` (T-42);
  - `adapters/storage/index.ts` con la región fija y `statObject` (`NotFound`/`NoSuchKey` → `null`; lo demás → `503` sin datos);
  - `config/env.ts` con las cinco `STORAGE_*`, `vacioComoAusente` y el `superRefine`, y `config/almacen.ts`;
  - la migración, idéntica a §D-D1 con los dos `CHECK` (V-03 en 0);
  - `adapters/db/archivos.ts` y `publicaciones.ts`: confirmación en la transacción de la publicación, con el `UPDATE` que repite todas las condiciones y compara el conteo; adjuntos de la página en una consulta; descarte antes del `DELETE`;
  - `handlers/archivos.ts`, `clases/muro.ts` y `app.ts` con `almacen`;
  - el frontend de §D-D5 (`almacenService`, los dos componentes nuevos, `formatearTamano`, `useSolicitarSubida`, `useUrlDeDescarga` y el `staleTime` como función);
  - los textos de §D-D6 y `DESIGN.md` §7.19.
- **Solo lo planeado:** todo archivo tocado está en "Cambios por capa" (d) o en la fila d de las listas cerradas, incluido `publicacion-del-muro.tsx` por la Enmienda 11. No hay archivos de pruebas fuera de la lista (PA-16) ni dependencias distintas de `minio`.
- **Todo lo planeado:**
  - los 64 IDs PR-D tienen su caso;
  - V-06: el caso exacto de `sesiones-y-cadena.ataque` (56 rutas) pasa, y `RUTAS_PUBLICAS` sigue en 10 (`middleware/` intacto);
  - `backend/.env.example` trae el bloque `STORAGE_*` literal del plan;
  - `handlers/README.md` y `adapters/README.md` documentan lo de d.

### "No se toca" (V-05)
- **Dentro de los paquetes** (contra `c7fcece`, `git diff --quiet` y `status --porcelain`), quedan intactas las rutas comunes y las de d:
  - `middleware/`, `features/auth`, `services/sesionService.ts`, `components/`;
  - `adapters/db/{clases,inscripciones,cliente,bloqueo-usuario,sesiones,salud,errores,usuarios,tokens-cuenta,enlaces-registro,invitaciones}.ts`, `adapters/queue/`, `notifier`, `auth`;
  - `handlers/clases/{clases,alumnos}.ts`, `handlers/auth`, `handlers/{admin,errores,salud,usuarios,validacion}.ts`;
  - `core/auth`, `core/correo`, `core/eventos`, `core/clases`, `core/errores.ts`, `workers/`, `server.ts`, `worker.ts`, `scripts/`, `config/{auth,cola,correo,logger}.ts`;
  - las ayudas de prueba protegidas, `features/admin`, `features/diagnostico`, `services/{apiClient,authService,tokenAcceso,navegacion,liveService}.ts`, `lib/{utils,cache-de-mutaciones}.ts`, `main.tsx` y `test/setup.ts`;
  - las configuraciones de `frontend/` y `backend/`, `muro-view.tsx`, `comentarios-de-publicacion.tsx`, `formulario-comentario.tsx` y `formulario-clase.tsx`.

  En `styles/` y `app/` solo difieren tres `*.ataque` del tester (C-13 y C-21), con el hash de su tabla.
- **Migraciones:** solo la carpeta nueva `20261002141710_archivos`.
- **`eslint.config.mjs`:** sin cambios contra `<Cc>`.
- **`backend/package.json`:** una línea, `"minio": "^8.0.7"`.
- **`package-lock.json`:** 324 inserciones y 7 borrados, como en la implementación:
  - las 27 entradas nuevas son del árbol de `minio`;
  - los 7 borrados son marcas `dev`/`devOptional`;
  - `aws` aparece 0 veces.
- **Fuera de los paquetes, contra `<R>`:** `infra/`, `.claude/agents/{programador,tester,manager}.md`, `package.json` de la raíz, `.prettierrc.json`, `.prettierignore`, `tsconfig.base.json`, `.gitignore`, `.gitattributes`, `.nvmrc` y `docs/design/` están intactos.
- **Protegidos por SHA-256** (coinciden los ocho):
  - `AGENTS.md` `AC6DAE79…` y `arquitecto.md` `AE021430…` ("Decisiones del humano al cerrar CLASES-c");
  - `CLAUDE.md` `1076099D…`, `README.md` `38027AAC…`, `ARCHITECTURE.md` `DDB2654E…`, `ARCHITECTURE-ESSENTIALS.md` `BCE288C9…` y `PRD.md` `2FD9DA1F…` ("Cierre de CLASES-c").
- **`docs/DESIGN.md`:** solo agrega §7.19 (12 líneas), marcada "propuesta". Coincide con lo construido, incluidas la frase de la Enmienda 12 (lista fija con su nota) y la corrección de N-D3 ("se vuelve a pedir antes de que venza la primera vista previa").

### `*.ataque` (punto 3 de Modo 2)
- **Ninguna fue modificada, saltada ni borrada por el programador.** Las 107 tienen el hash de la tabla de cierre del tester.
- Las que cambiaron desde `c7fcece` son todas del tester, con su C-n:
  - C-2: `sesiones-y-cadena`;
  - C-13: `env.ataque`, `arranque-r1` y `styles/clases-r1`;
  - C-21 y C-22: `muro-c-r1`, `muro-c-r2`, `muro-c-r3`, `muro-recuperar-c-r3` y `muro-recuperar-c-r4`;
  - C-23: `archivos-d-r1`, nueva de d, con el hash `79BB87AE…`.
- Las 10 nuevas de d son del tester: 4 de la ronda 1, 3 de la ronda 2 y 3 de la ronda 3.
- No hay `it.skip`, `.only` ni `todo` nuevos en ellas: las 1300 + 1395 corren completas.

### Definición de terminado (`AGENTS.md`), punto por punto
- [x] **Cumple el RF/RN:**
  - RF-33: el maestro publica anuncios y materiales con adjuntos, hasta 5 de 25 MB, con los tipos de §D-D4;
  - RF-25: vista previa solo de PNG, JPEG, WebP y GIF, dentro de la publicación; los comentarios siguen siendo solo texto;
  - RF-12: el muro muestra los adjuntos con "Descargar";
  - RN-02 y RN-06 (alumno restringido sin URL; estado de pago nunca en respuestas de estudiantes): PR-D09c, PR-D09i y PR-D06c.
- [x] **Respeta las capas y pasa por el middleware:** ver "Reglas que no se rompen".
- [x] **`lint`, `build` y `test` en verde:** ver "Cifras". La única corrida en rojo es la de la raíz, caída por CHORE-02 (solo tiempos límite); la repetición está limpia.
- [x] **Pruebas de autorización del endpoint nuevo:** PR-D09a a PR-D09i cubren las dos rutas con:
  - sin token;
  - cambio de contraseña pendiente;
  - restringido inscrito;
  - admin;
  - rol incorrecto;
  - maestro ajeno y estudiante no inscrito;
  - el caso permitido;
  - "sin cambios" en cada negación;
  - ninguna URL al restringido.

  Además: PR-D07b (archivo de otra clase con el `claseId` propio → 404), PR-D07c (pendiente → 404) y PR-D06c (sin `estadoPago` ni la clave).
- [x] **Migración incluida y compatible hacia atrás:**
  - solo crea un tipo, una tabla, dos índices, tres llaves foráneas y dos `CHECK`; no altera nada existente;
  - el código anterior no conoce la tabla;
  - revertir el código deja una tabla sin uso, sin romper la base.
- [x] **`infra/` y `.env.example`:**
  - `infra/` sin cambios (S-21: MinIO admite cualquier origen en `dev`; lo comprueba H-5);
  - `backend/.env.example`, con el bloque literal;
  - `infra/.env.example` ya traía las mismas `STORAGE_*`.
- [ ] **Documentos:** pendientes del cierre (paso 48). Ver "Documentos a actualizar". Es trabajo del orquestador después de la comprobación humana, no un defecto de la entrega.

### Reglas que no se rompen
1. **Capas:**
   - `from "minio"` solo en `adapters/storage/index.ts`;
   - `core/archivos/` sin I/O ni librerías (importa `@campus/shared` y `core/errores`);
   - Prisma solo en `adapters/db`;
   - `config/almacen.ts` es el único puente entre `STORAGE_*` y el adaptador, y `adapters/` no lee `process.env`;
   - los handlers son delgados. `muro.ts` ganó dos ayudantes de orquestación, `adjuntosParaResponder` y `archivosParaPublicar`, sin consultas en un ciclo; ver los detalles.
2. **Middleware:**
   - las dos rutas de d usan `protegido()` con el sexto paso: `POST …/archivos` → `roles: ["maestro"], pertenencia: "propiedad"`; `POST …/archivos/:archivoId/descarga` → `roles: ["estudiante", "maestro"], pertenencia: "inscripcion"`;
   - ningún handler revisa rol, propiedad ni inscripción a mano;
   - `addHook` en `handlers/`: 0.
3. **Estado de pago:**
   - ninguna respuesta de d lo lleva (PR-D06c recorre el JSON del muro);
   - `estadoPago` no aparece en ningún archivo de d.
4. **Consultas sanas:**
   - `buscarArchivosParaConfirmar` y `buscarArchivoConfirmado`: por PK, con la entrada acotada a 5;
   - los adjuntos del muro: una consulta por página sobre `archivos(publicacion_id)`;
   - el descarte, sobre el mismo índice;
   - el `UPDATE` de confirmación, por PK dentro de la transacción;
   - sin consultas en un ciclo. Los `statObject` van en un `Promise.all` de 5 como máximo y son E/S del almacén, no de la base (R-13);
   - sin SQL crudo nuevo: la lista de archivos con `$queryRaw` es la de c, y `$queryRawUnsafe` sigue solo en `cliente.ts`.
5. **Lo lento va por cola:**
   - el aviso de la publicación se sigue encolando en su transacción, ahora junto con la confirmación de los archivos (PR-D05f: un error forzado no deja archivos confirmados ni trabajos);
   - d no crea notificaciones.
6. **Los archivos no pasan por Node:**
   - la API solo firma (300 s) y guarda metadatos;
   - el navegador sube con `fetch` `PUT` desde `almacenService` (`credentials: "omit"`, sin `apiClient` ni token, sin el origen de la API) y descarga navegando a la URL firmada;
   - la vista previa usa la URL `inline`.
7. **UTC:** `expiraEn` y `creadoEn` en ISO 8601 (`toISOString`); las columnas son `timestamptz(3)`.
8. **Trabajos diferidos:** d no tiene ninguno.
9. **Secretos:**
   - `STORAGE_*` solo en `.env`; los valores de `.env.example` son de desarrollo y lo dicen;
   - los mensajes de `config/env.ts` no llevan valores (PR-D02c);
   - el adaptador no repite la URL, las llaves ni el mensaje del proveedor;
   - nada en variables del frontend.
10. **Infraestructura y esquema:** sin cambios en `infra/`; el esquema cambia solo por la migración.
11. **Proveedores:** `minio` es el cliente aprobado en ESSENTIALS; su árbol no trae nada de AWS (PA-14 no se activó). Los tokens de mínimo privilegio de R2 son configuración de DEPLOY, no código.
12. **Notifier:** sin cambios.
13. **Autenticación:** sin cambios.

**Datos de d:**
- **`confirmado` si y solo si tiene publicación:** lo garantiza el `CHECK` en las dos direcciones (PR-D08b y PR-D08c). El descarte pone `publicacion_id = NULL` en la misma transacción que el `DELETE` (PR-D08a).
- **`clase_id` autoriza al pendiente:**
  - al solicitar, la fila nace con el `claseId` del sexto paso;
  - al confirmar, la lectura y el `UPDATE` filtran por clase, por `subido_por`, por `pendiente`, por "sin publicación" y por las últimas 24 h (PR-D05d);
  - la descarga exige `confirmado` y el `claseId` de la ruta.

### Estilo (`CLAUDE.md`)
- **Módulo `clases`:**
  - los tipos van en `types.ts`: `ArchivoCandidato` es un tipo de la interfaz, y `PaginaDelMuro` es un alias del tipo de `shared/`;
  - los textos y las constantes, en `data.ts`;
  - las funciones puras en `lib.ts`: `tipoDeArchivo`, `errorDeArchivoElegido`, `tiempoFrescoDelMuro` y `avisoDeFalloAlSubir`;
  - los hooks en `hooks.ts`;
  - en los componentes, solo interfaces de Props.
- **`fetch(`** solo en `apiClient.ts` (2) y `almacenService.ts` (1). El componente llama a `subirArchivo`, no a `fetch`, como pide §D-D5. La regla 8 de `CLAUDE.md` necesita su excepción escrita; ver "Documentos a actualizar".
- **Retornos tempranos** en todas las funciones nuevas. En el JSX no hay ternarios anidados: la frase de borrar sale de una variable.
- **Manejo de errores:**
  - `handlePublicar` con `try/catch/finally`, y `handleDescargar` con `try/catch`, ambos con `toast`;
  - los hooks de mutación no lanzan fuera de TanStack Query;
  - el backend lanza `AppError` desde `core/` y `adapters/`. El único `try/catch` nuevo traduce el error del proveedor, y está en el adaptador (`firmar` y `metadatosDe`), no en un handler.
- **Sin valores por defecto silenciosos:**
  - `?? []` en `features/clases` y `shared/`: 0;
  - `adjuntos` no tiene `.default` ni `.optional`;
  - los `[]` que quedan son de entrada (`archivoIds` y `archivos = []`) o los arma el adaptador ("sin adjuntos").

### Lista de diseño (frontend)
- **`DESIGN.md`:** coincide con lo construido, y el único patrón nuevo (§7.19) quedó documentado en este encargo, marcado "propuesta".
- **Solo tokens:** `bg-muted`, `rounded-row`, `text-small`, `text-foreground` y `text-muted-foreground`. `max-h-80` y `size-4` son espaciado. No hay valores sueltos de color, tamaño, radio ni sombra (`estatico-r1` y `clases-r1` en verde).
- **Componentes:** `Button` de `components/ui/` (`outline`/`ghost`, `size="sm"`) y `ErrorDeCampo`. No hay nada hecho a mano que ya exista: el `<input type="file" hidden>` y la `<img>` no tienen equivalente en `ui/`. Sin aspecto por defecto de shadcn ni rasgos prohibidos.
- **Vidrio:** ninguno nuevo. Las fichas son sólidas (`--muted`) dentro del panel que ya tiene vidrio (§7.2).
- **El estado no se comunica solo con color:** los errores van con texto en `ErrorDeCampo` o en un aviso; la lista fija, con su nota.
- **Vista previa:** solo de imágenes, sin SVG (`TIPOS_CON_VISTA_PREVIA`, PR-D01f).
- **Densidad y acción principal:** la densidad es la del maestro, intermedia. La única acción principal sigue siendo "Publicar…"; "Adjuntar archivos" es `outline`.
- **Textos:** en español de México, concretos, sin palabras prohibidas ni emojis. Los avisos nombran el archivo y la causa (T-41).
- **Estados:**
  - error: el aviso al subir, al descargar o al publicar; si la imagen falla, queda la ficha;
  - carga: `enEspera` en "Publicar" y "Descargar";
  - vacío: sin adjuntos no se pinta nada. No necesita CTA: es parte de una publicación, no una vista.
- **360 px (análisis estático):** las fichas son `flex flex-wrap`, con el nombre en `min-w-0 flex-1 wrap-anywhere`, y el nombre del botón va en `sr-only`. Sin navegador: va a H-6.
- **Foco:**
  - visible en los `Button` de `ui/`;
  - "Quitar" sigue §7.14: va a la fila vecina o a "Adjuntar", nunca a `<body>` (verificado por la ronda 3);
  - etiquetas: `aria-label` en el selector y en las dos listas, y la ayuda con `aria-describedby`.
- **`enEspera`:** solo en el único botón nuevo que espera, "Descargar". Total: 36.
- **Residual aceptado de T-38:** "Quitar" y "Adjuntar archivos" se ven activos mientras se publica, y los mitiga la nota `role="status"`. Va a H-5.

### Problemas que bloquean
Ninguno.

### Hallazgos del tester: T-38 a T-44 (verificados en el código)
| Hallazgo | Estado | Dónde lo vi |
|---|---|---|
| T-38 (medio), lista cambiable durante la publicación | Corregido | `formulario-publicacion.tsx`: `publicandoRef` se marca en la primera línea de `handlePublicar`, antes del primer `await`, y se libera en el `finally`. `handleElegir` (que antes limpia el selector), `handleQuitar` y `handleSubmit` regresan si está marcada. La nota es `<p role="status">` con `TEXTOS_ADJUNTOS.listaFija`. No hay `disabled`, `aria-disabled`, `enEspera` nuevo ni controles ocultos. Lo cubren PR-D16 y `archivos-d-r1/-r2` |
| T-39 (medio), "Descargar" hacia `javascript:` y `data:` | Corregido | `urlDelAlmacenSchema` (`z.url({ protocol: /^https?$/ })`) se define una sola vez (`shared/src/archivos.ts:35`) y la usan las tres URL. Fuera de `shared/` solo queda la comprobación de `almacenService`, que también compara el origen. El backend valida sus propias respuestas (O-14) |
| T-40 (bajo), vistas previas vencidas | Corregido | `tiempoFrescoDelMuro` es pura, en `lib.ts`; `staleTime` es una función en `usePublicaciones`; la imagen fallida se recuerda por URL (`urlsRotas`) |
| T-41 (bajo; N-D1), aviso genérico al rechazar | Corregido | `avisoDeFalloAlSubir` (`lib.ts`): con `ARCHIVO_INVALIDO`, el mensaje del servidor; con otro código, `mensajeDeErrorClases`; si no es un `ApiError`, `errorSubida`. Sin validaciones nuevas en el cliente |
| T-42 (bajo), sustituto suelto en el nombre | Corregido | `CARACTER_PROHIBIDO_EN_NOMBRE` incluye `\p{Cs}` con la bandera `u`. Se conserva `sinSustitutosSueltos` |
| T-43 y T-44 (bajos), "1024 KB" y "1024 MB" | Corregidos | `formatearTamano` redondea en la unidad actual y sube mientras el redondeado llega a 1024. No hay ramas por unidad. La ronda 3 lo barrió con 5,626 cantidades |

**Desacuerdos entre programador y tester:** no hubo en d. El único arbitraje sobre una `*.ataque` fue PA-12 → C-23, a pedido del propio tester.

### Problemas que no bloquean
- **N-F1 — El muro responde URL firmadas sin `Cache-Control: no-store` (O-4).**
  - Dónde: `handlers/clases/muro.ts`, `GET …/publicaciones` y la respuesta `201` de `POST …/publicaciones`. Solicitar y descargar sí lo llevan.
  - Por qué importa: son URL de lectura de objetos privados, válidas 5 minutos. Sin `Last-Modified` el navegador no las guarda por heurística, y Cloudflare no cachea JSON de `/api` por defecto. El riesgo es bajo, pero la API no debería depender de eso.
  - Qué se espera: `no-store` en las dos respuestas que llevan `vistaPrevia`, con su prueba.
  - Destino: TAREAS, que vuelve a tocar el muro (R-01). En la lista de DEPLOY, además, comprobar que ninguna regla de caché de Cloudflare toque `/api/*`.
- **N-F2 — Cuatro inversores de dirección literales en `shared/src/clases.ts:48`** (U+202A, U+202E, U+2066 y U+2069, en `INVERSORES_DE_DIRECCION`, desde CLASES-a).
  - Dónde: el script de esta revisión sobre todo el código de producción de los tres paquetes encontró solo esa línea.
  - Por qué importa: funciona, pero un U+202E literal reordena la línea en editores y diffs ("Trojan Source"), y GitHub marcará el archivo en el PR del encargo.
  - Qué se espera: los mismos rangos escritos con escapes (como `core/archivos/politica.ts:16`), comprobado por programa (la herramienta de edición convierte los escapes en caracteres reales, O-10), con lint y test del paquete `shared` y de los dos que lo usan.
  - Destino: **carril trivial antes del commit `<Cd>`**, como quedó acordado. No cambia el comportamiento y no toca ninguna `*.ataque`.
- **N-F3 — O-14: con un almacén que firmara una URL no `http(s)`, solicitar responde `500` y deja una fila `pendiente` huérfana.**
  - Dónde: `handlers/archivos.ts`, que inserta (`:50`) antes del `parse` de la respuesta (`:61`).
  - Por qué importa: es inalcanzable con el adaptador real (el endpoint se valida como `http(s)`), y no hay fuga.
  - Qué se espera, si se toca: validar la URL firmada antes de insertar, o traducir ese error a `503 ALMACEN_NO_DISPONIBLE`.
  - Destino: nota para el próximo cambio de `handlers/archivos.ts` (ENTREGAS agrega su contexto).
- **N-F4 — O-11: un sustituto suelto en el título, el anuncio o el comentario se guarda como U+FFFD con `201`.**
  - Por qué importa: el reemplazo es silencioso y coherente (la respuesta sale de la fila); no es un riesgo.
  - Qué se espera: rechazarlo con `400 VALIDACION` en `textoConContenidoSchema` y en `nombreClaseSchema`, como T-42 en el nombre de archivo, con su prueba y su C-n.
  - Destino: el próximo encargo que toque las reglas de texto de `shared/src/clases.ts`. Probablemente TAREAS, que reutiliza esos esquemas para títulos e instrucciones.
- **N-F5 — O-13: la nota "Mientras se publica no puedes cambiar los archivos." aparece también al publicar sin archivos.**
  - Por qué importa: dura lo que tarda la petición y es inofensiva.
  - Qué se espera, si molesta: mostrarla solo con `elegidos.length > 0`. Ninguna `*.ataque` la exige sin archivos.
  - Destino: que el humano la vea en H-4. Si molesta, carril trivial; si no, nota para el próximo cambio de `formulario-publicacion.tsx`.
- **N-F6 — N-D2 (O-7): `extensionDe` está duplicada en `frontend/src/features/clases/lib.ts` y en `backend/src/core/archivos/politica.ts`.**
  - Qué se espera: subir la regla "tipo más extensión" a `shared/src/archivos.ts`, como se hizo con `normalizarTextoLargo`.
  - Destino: ENTREGAS, que reutiliza la política de archivos para las entregas.
- **N-F7 — `ARCHITECTURE.md` §16 dice "URLs prefirmadas de 5 minutos con tipo y tamaño fijados".**
  - Por qué importa: la de subida no fija ni el tipo ni el tamaño. Es el residual aceptado en R-03, porque R2 no admite `POST` con política, y la API los compara con `statObject` antes de confirmar. Además, la URL sigue sirviendo hasta 300 s después de confirmar (O-1).
  - Qué se espera: no se corrige en código; es un texto de cierre (ver "Documentos a actualizar").

### Detalles menores
- **`adapters/README.md`** dice que la limpieza diaria está "pendiente de NOTIFICACIONES", pero P-02 la deja "pendiente previo a DEPLOY". Va al carril trivial de N-F2 (es un README dentro de `backend/`).
- **`adapters/db/publicaciones.ts`** repite en `errorArchivoInvalido` el mensaje de `archivoNoCoincide` de `core/archivos/politica.ts`. Podría importarlo. Destino: el próximo cambio de ese archivo.
- **`handlers/clases/muro.ts`** creció con la orquestación del almacén (`adjuntosParaResponder` y `archivosParaPublicar`). Hoy es aceptable. Si TAREAS o ENTREGAS lo reutilizan, conviene un módulo propio en `handlers/` o en un ayudante compartido.
- **O-2:** el `201` devuelve los adjuntos en el orden de `archivoIds`, y el muro, por `creado_en, id`. Coinciden con el frontend actual.
- **O-8:** al confirmar, un tipo real con parámetros o en mayúsculas cuenta como el declarado. Es seguro, porque se sirve con el tipo guardado.
- **O-9:** un UUID en mayúsculas en `archivoIds` da `400`. Es seguro, porque el frontend manda minúsculas.
- **O-12:** `Math.min(...vencimientos)` falla por encima de unas 120,000 vistas previas cargadas, un tope inalcanzable. Si se toca, un `reduce`.

Todos son notas sin acción, salvo la del README.

### Observaciones O-1 a O-15: destino confirmado o cambiado
El orquestador las lleva a `docs/ESTADO.md` §3, salvo las marcadas "solo nota", que bastan en la Enmienda 13.

| Obs. | Qué | Destino |
|---|---|---|
| O-1 | La URL de subida solo firma `host`: no limita el tipo ni el tamaño y sigue sirviendo hasta 300 s después de confirmar. No hay tope de pendientes por maestro | **Confirmado: DEPLOY y `LIMPIEZA_DIARIA`.** En DEPLOY: permisos del token de R2, alerta de cupo y límite de tasa global. En `LIMPIEZA_DIARIA`: los objetos sobrantes. Cerrarlo del todo (`POST` con política) sería otro encargo. Se cita en el texto nuevo de `ARCHITECTURE.md` §16 |
| O-2 | Orden de los adjuntos: en el `201`, el de `archivoIds`; en el muro, `creado_en, id` | Solo nota |
| O-3 | `archivos(clase_id)` y `archivos(subido_por)` sin índice | **Confirmado: el arquitecto, antes de ADMIN** (bajas y borrados físicos), junto con R-21 |
| O-4 | El muro responde URL firmadas sin `no-store` | **Cambiado: TAREAS** (N-F1), que vuelve a tocar el muro. En DEPLOY, comprobar que Cloudflare no cachee `/api/*` |
| O-5 | `STORAGE_*` no se recortan y el nombre del bucket no se valida | **Confirmado: DEPLOY** |
| O-6 | `production` acepta un `STORAGE_ENDPOINT` `http://` | **Confirmado: DEPLOY**, que decide si se exige `https` en `production` |
| O-7 = N-D2 | `extensionDe` duplicada | **Cambiado: ENTREGAS** (N-F6), que reutiliza la política. Ya no va al cierre de d |
| O-8 | Un tipo real con parámetros o en mayúsculas cuenta como el declarado | Solo nota |
| O-9 | Un UUID en mayúsculas en `archivoIds` da `400` | Solo nota |
| O-10 | La herramienta de edición convierte los escapes `\u` en caracteres reales | **Confirmado: proceso.** Ya está en `docs/ESTADO.md` §4. Se aplica al carril trivial de N-F2: verificar por programa |
| O-11 | Un sustituto suelto en los textos del muro se guarda como U+FFFD | **Cambiado:** de "cierre de d" a **el próximo encargo que toque las reglas de texto de `shared/src/clases.ts`** (N-F4; probablemente TAREAS). Cambia el comportamiento, así que no cabe en el carril trivial |
| O-12 | `Math.min(...)` con más de unas 120,000 vistas previas | Solo nota |
| O-13 | La nota de la lista fija también aparece sin archivos | **Cambiado: H-4** (N-F5). Si al humano le molesta, carril trivial |
| O-14 | Con un almacén imposible: `500` y una fila pendiente huérfana | **Cambiado:** de "nota de cierre" a **el próximo cambio de `handlers/archivos.ts`** (N-F3; ENTREGAS) |
| O-15 | Correr dos suites a la vez tumba el backend por CHORE-02 | **Proceso:** ver "Para el humano", punto 4 |

### Documentos a actualizar al cierre de d (paso 48)
Textos finales: los "Textos literales propuestos" marcados (d) del plan, con los ajustes que pide lo construido (marcados **ajuste**). El orquestador los aplica con la autorización del humano y anota sus SHA-256.

**1. `docs/ARCHITECTURE.md` §7, tabla de la API.**
- Fila `archivos` (**ajuste:** quién puede, qué estado se descarga y el `503`). La reemplaza por:
  > | `archivos` | `POST /clases/{claseId}/archivos` (maestro dueño: registra un archivo `pendiente` y devuelve la URL prefirmada de subida) · `POST /clases/{claseId}/archivos/{archivoId}/descarga` (alumno inscrito y maestro dueño: URL prefirmada de descarga de un archivo `confirmado`). Sustituyen a `POST /archivos/subida` y `POST /archivos/descarga`. Sin almacén configurado, `503 ALMACEN_NO_CONFIGURADO`. TAREAS y ENTREGAS agregan sus contextos |
- Fila `clases` (**ajuste**, una inserción): después de "`GET/POST /clases/{claseId}/publicaciones`", agrega "(con adjuntos: `archivoIds` al crear, hasta 5; `adjuntos` en cada publicación, también `[]`)".

**2. `docs/ARCHITECTURE.md` §11.**
- **Paso 1 (ajuste: el contexto es la clase de la ruta).** Lo reemplaza por:
  > 1. El cliente pide `POST /clases/{claseId}/archivos` con nombre, tipo y tamaño; el contexto es la clase de la ruta (TAREAS y ENTREGAS agregan los suyos).
- **Pasos nuevos después del 5.** Es el texto del plan, más lo construido (**ajuste:** la confirmación con sus filtros, `adjuntos` siempre, `urlDelAlmacenSchema`, el nombre y `STORAGE_*`):
  > 6. Materiales y anuncios (CLASES-d): solo sube el maestro dueño de la clase. Límites: 25 MB por archivo y 5 por publicación; tipos PDF, PNG, JPEG, WebP, GIF, Word, Excel y PowerPoint (formatos actuales y 97-2003) y texto plano; el SVG no se admite. El nombre del archivo no admite `/`, `\`, caracteres de control, separadores de línea, inversores de dirección ni sustitutos sueltos. La clave es `materiales/{claseId}/{archivoId}` y nunca lleva el nombre del archivo. Al publicar, la API lee los archivos por id, acotados a la clase, a quien los subió, al estado `pendiente`, sin publicación y de las últimas 24 h; compara con `statObject` el tamaño y el tipo reales con lo declarado; y los confirma dentro de la transacción de la publicación, con un `UPDATE` que repite esas condiciones y compara el conteo. La URL de subida no limita el tamaño (R2 no admite `POST` con política): un objeto que no coincide no se confirma y queda para la limpieza. Un archivo pasa a `descartado` si se borra su publicación. Toda publicación responde `adjuntos` (también `[]`). La descarga fuerza el tipo declarado y `attachment`; las imágenes se muestran en vista previa con una URL `inline` de 5 minutos. Las tres URL del almacén son `http` o `https` (`urlDelAlmacenSchema`, de `shared/src/archivos.ts`). El firmado es local (región fija en `STORAGE_REGION`); el bucket se elige con `STORAGE_BUCKET_PRIVADO`. Sin `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY` (una variable vacía cuenta como ausente), la API arranca, pero subir y descargar responden `503`; en `production` son obligatorias, también para el worker, que es la misma imagen.
  > 7. `LIMPIEZA_DIARIA`, que se construye antes de DEPLOY, borra el objeto del almacén y la fila de cada `pendiente` de más de 24 h y de cada `descartado`.

**3. `docs/ARCHITECTURE.md` §14.**
- Fila `archivos`: el texto del plan, sin cambios:
  > | `archivos` | `id`, `clave_objeto`, `nombre`, `tipo`, `tamano`, `subido_por`, `estado` (`pendiente` / `confirmado` / `descartado`), `clase_id`, `publicacion_id` | `clave_objeto` único · índice `(publicacion_id)` · `CHECK`: un archivo está `confirmado` si y solo si tiene contexto; `pendiente` y `descartado`, ninguno. `clase_id` autoriza mientras el archivo está pendiente. TAREAS y ENTREGAS agregan `tarea_id` y `entrega_id` |
- **Diagrama (ajuste; el plan no lo cubría):** después de `usuarios ||--o{ archivos : sube`, agrega `clases ||--o{ archivos : guarda` y `publicaciones ||--o{ archivos : adjunta`.

**4. `docs/ARCHITECTURE.md` §16, "Aplicación" (ajuste nuevo, N-F7; el plan no lo cubría y hoy contradice R-03).** Reemplaza "URLs prefirmadas de 5 minutos con tipo y tamaño fijados." por:
  > - URLs prefirmadas de 5 minutos. La de subida no fija el tipo ni el tamaño (R2 no admite `POST` con política): antes de confirmar, la API compara el objeto real con lo declarado (`statObject`); la descarga fuerza el tipo declarado y `attachment`; y solo el maestro dueño sube. Un objeto reescrito mientras la URL sigue vigente es un riesgo residual aceptado (CLASES-01, R-03), que se vigila en DEPLOY.

**5. `docs/ARCHITECTURE.md` §8, fila `LIMPIEZA_DIARIA` (ajuste opcional, por coherencia con el paso 7 de §11).** Cambia "archivos huérfanos" por "archivos `pendiente` de más de 24 h y `descartado` (el objeto y la fila)".

**6. `docs/ARCHITECTURE-ESSENTIALS.md`.**
- "Restricciones clave" (R-10, decisión del humano). Reemplaza "`comentarios` y `archivos` con exactamente un contexto" por el texto del plan:
  > `comentarios` con exactamente un contexto · `archivos`: confirmado si y solo si tiene exactamente un contexto (los `pendiente` y `descartado`, ninguno; `clase_id` autoriza mientras tanto)
- "Archivos": agrega el texto del plan, con el **ajuste** de quién sube y la configuración:
  > - Materiales y anuncios: solo los sube el maestro dueño; 25 MB por archivo, 5 por publicación; PDF, imágenes (sin SVG), Office y texto plano. La confirmación compara el objeto real con lo declarado, dentro de la transacción de la publicación. Vista previa solo de imágenes. La limpieza borra también el objeto de los pendientes vencidos y de los descartados.
  > - Sin las tres `STORAGE_*` de acceso, la API arranca y los archivos responden 503; en `production` son obligatorias (API y worker). Firmar es local: la región es fija (`STORAGE_REGION`).

**7. `CLAUDE.md`.**
- Regla 8 de "Arquitectura: módulos por dominio" (**ajuste nuevo:** hoy no admite la excepción que §D-D5 diseñó). La reemplaza por:
  > 8. Ningún componente llama a `fetch`: todo pasa por `services/apiClient` dentro de un hook de `hooks.ts`. Única excepción: la subida directa al almacén, con `subirArchivo` de `services/almacenService.ts`, que el manejador del formulario llama dentro de su `try/catch`; no usa `apiClient` para que el token nunca viaje al almacén
- "Ubicaciones compartidas", viñeta de `lib/format.ts` (**ajuste:** la viñeta ya dice "tamaños de archivo"; solo se nombra la función): "…tamaños de archivo (`formatearTamano`)…".
- Viñeta nueva después de `services/sesionService.ts` (texto del plan):
  > - `services/almacenService.ts` — sube un archivo al almacén con la URL prefirmada que dio la API (`PUT`, sin `Authorization` ni credenciales). Es el único `fetch` fuera de `apiClient`
- La fila `clases` de "Módulos" ya dice "muro con comentarios y adjuntos": no cambia.

**8. `README.md`, "Backend en local", paso 3.** Después del párrafo de las variables de correo, el texto del plan más una frase (**ajuste:** sin MinIO, la subida falla aunque las variables estén):
  > Si tu `backend/.env` es anterior a CLASES-d, copia a mano las cinco variables `STORAGE_*` de `backend/.env.example`: sin ellas la API arranca, pero subir y descargar archivos responde 503. Para subir archivos en local, MinIO tiene que estar levantado (sección "Entorno de desarrollo local"). Con las variables y MinIO apagado, la API firma igual (es un cálculo local), pero la subida falla en el navegador y publicar con archivos responde 503.

**9. Sin cambios en d:** `docs/PRD.md` (RF-25 y RF-33 ya lo describen).

**10. `docs/DESIGN.md` §7.19.** Queda "propuesta" hasta la comprobación humana. Con el "bien" del humano, la marca pasa a "propuesta aprobada (fecha)" (no se borra). Lo mismo con las secciones de a, b y c que siguen marcadas "propuesta" (§7.3, §7.14, §7.18 y las de a y b), porque H-1 a H-6 las cubren.

**11. `docs/ESTADO.md`.**
- §2: el cierre de d y del encargo, con las cifras y `<Cd>`.
- §3:
  - los pendientes de la tabla de observaciones;
  - N-F1 a N-F6;
  - `LIMPIEZA_DIARIA` de archivos (objeto y fila), como prerrequisito de DEPLOY;
  - la consulta de `movimientos_inscripcion` (ADMIN, por `secuencia`; la fila ya existe);
  - el worker en `production` con `STORAGE_*` (ya existe);
  - el `P2028` de `cambiar-contrasena`, que volvió a aparecer en mi corrida caída: AUTH, prioridad alta (ya existe). Basta sumar la fecha.
- §6: la medición de d y la lectura acumulada (abajo).

### Lo que debe registrar la Enmienda 13 (cierre de d y del encargo)
1. **Cierre de d:**
   - **Rondas:**
     - ronda 1: ROTO, con T-38 a T-43;
     - ronda 2: ROTO, solo con T-44;
     - ronda 3: **RESISTE**, sin hallazgos.

     Fueron 3 rondas, sin escalada. Ningún hallazgo fue de seguridad.
   - **T-44:** extiende el criterio de T-43 a todas las unidades: redondea en la unidad actual y sube mientras el redondeado llega a 1024, sin ramas por unidad. PR-D21 queda con dos casos, el de T-43 y el de MB y GB.
2. **C-23** en la tabla de §D-R0, con el mismo formato que C-16 y C-17:
   - **origen:** PA-12 en la ronda 2, arbitrada por el manager;
   - **qué cambió:** en `backend/test/archivos-d-r1.ataque.test.ts`, los dos conteos de `archivo.count()` se acotan con `OR` de `claseId IN` (las clases de las URL del caso) y `subidoPor IN` (los usuarios que piden). Ninguna otra aserción cambió;
   - **hash:** `B1A6B7FE…` → `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB`;
   - es la única `*.ataque` de d que cambió después de publicarse.
3. **Desviaciones ya aceptadas:**
   - las cuatro de la implementación, que registra la Enmienda 11;
   - las de la corrección 2: N-D4 aplicado (seis `return` → `throw` en PR-D02a a PR-D02c) y `avisoDeFalloAlSubir` a `lib.ts`, con un caso sin ID en `lib.test.ts`;
   - la precisión de PA-07 para d: un `500` del muro o de archivos que una `*.ataque` provoca a propósito con un doble imposible, y que el reporte identifica por ruta y causa, no cuenta.
4. **Pendientes con destino:**
   - de la tabla de observaciones: O-1, O-5 y O-6 a DEPLOY; O-3 al arquitecto antes de ADMIN; O-4 a TAREAS; O-7 (N-D2) a ENTREGAS; O-11 al próximo encargo que toque las reglas de texto; O-13 a H-4; O-14 a ENTREGAS. Las "solo nota" (O-2, O-8, O-9 y O-12) se registran como notas;
   - N-F1 a N-F7 y los detalles menores;
   - los inversores literales de `shared/src/clases.ts:48`, desde CLASES-a: carril trivial antes de `<Cd>`;
   - `LIMPIEZA_DIARIA` (objetos y filas de pendientes vencidos y descartados), antes de DEPLOY;
   - la consulta de `movimientos_inscripcion`: ADMIN, ordenada por `secuencia`, con sus índices;
   - el worker en `production` con `STORAGE_*` y el orden de despliegue, primero el backend: DEPLOY.
5. **Textos de cierre (d):** los de "Documentos a actualizar", con sus ajustes. Son nuevos respecto del plan: §16 (N-F7), el diagrama de §14, la regla 8 de `CLAUDE.md` y la frase de MinIO en `README.md`.
6. **Cifras de cierre** (esta revisión):
   - backend `120 passed (120)` / `1300 passed (1300)`;
   - frontend `104 passed (104)` / `1395 passed (1395)`;
   - lint y build con código 0;
   - 107 `*.ataque`;
   - V-03 en 0;
   - la migración `20261002141710_archivos` aplicada en `campus_dev`.
7. **Base del siguiente encargo:**
   - `<Cd>`, que lee el orquestador tras el commit;
   - V-01 desde la tabla de 107 de `reporte-tester.md`, "CLASES-d — Ronda 3" (línea 4831). El carril trivial de N-F2 no toca ninguna `*.ataque`, así que la tabla sigue valiendo.
8. **Comprobación humana:** la lista final de H-1 a H-6 (abajo) y su resultado, que anota el orquestador en `comprobacion-humano.md`.
9. **Estado del plan:** "CERRADO" cuando el humano haga el commit `<Cd>`. Hasta entonces, LISTO.

### Comprobación humana en navegador: lista final para `comprobacion-humano.md` (paso 47)
Una sola, al final de d. Máximo 10 minutos y 6 puntos, solo lo que las pruebas no ven (`AGENTS.md`, "Trabajo visual"). Integra lo que las rondas de a, b, c y d dejaron para la comprobación humana (`docs/ESTADO.md` §3 y los reportes del tester). Se quita el "toast perdido" de b, que se corrigió en c (T-30). **Ningún agente abre navegadores: la hace el humano.**

**Preparación** (no cuenta en el tiempo):
- **Servicios:** desde `infra/`, `docker compose up -d` (PostgreSQL ya corre; esto levanta `minio`, `minio-init` y `livekit`). `minio-init` debe quedar en `exited (0)`, porque crea `campus-privado`.
- **`backend/.env`:** copia las cinco `STORAGE_*` de `backend/.env.example`. Deben coincidir con `infra/.env`; si cambiaste `MINIO_API_PORT`, ajusta `STORAGE_ENDPOINT`. No hace falta migrar: `campus_dev` ya tiene las 9 migraciones (V-03 de esta revisión).
- **Procesos:** arranca la API (`npm run dev` en `backend/`) y la SPA (`npm run dev` en `frontend/`). **El worker no hace falta:** los avisos del muro no tienen consumidor hasta NOTIFICACIONES. Solo lo necesitas si das de alta al maestro por invitación de correo (el correo queda en `backend/tmp/correos/`). Con un enlace de registro de `/admin/maestros`, no.
- **Cuentas `@pruebas.local`:** un maestro **con nombre largo** y un estudiante, este en una ventana privada.
- **Lo que pone el orquestador en `comprobacion-humano.md`:**
  - el nombre del maestro;
  - las dos cadenas de H-6: un nombre de clase de 120 caracteres sin espacios y uno de 60 emojis;
  - qué archivos usar: un PNG pequeño y un PDF de menos de 25 MB con acentos en el nombre (por ejemplo, `guía de práctica.pdf`).

**Tiempo estimado: 10 minutos** (H-1, 2; H-2, 1; H-3, 2; H-4, 1.5; H-5, 2; H-6, 1.5).
- **H-1. Clase y código (2 min).**
  1. Como maestro, crea una clase y copia su código.
  2. Como estudiante, pégalo en minúsculas y con un espacio en medio en "Unirme a la clase". Los dos inicios deben mostrar la tarjeta de la clase, y el titular, el número correcto.
  3. Como maestro, regenera el código.
  4. Como el mismo estudiante, escribe el código viejo: debe decir que no existe.
- **H-2. Foco con el teclado y el bloque destacado (1 min).** Con Tab, en el inicio:
  - en una tarjeta verde o azul, el foco se ve como un contorno blanco por dentro; en una blanca, azul por fuera;
  - en el bloque destacado, el foco también se ve;
  - a 640 px o más, la tarjeta interna del bloque destacado queda a la derecha, y las tarjetas guardan su separación.
- **H-3. Alumnos y personas (2 min).** Como maestro, en "Alumnos":
  1. quita al estudiante (confirmación en línea). Con el teclado, el foco queda en el "Quitar" de la fila vecina o en el título "Alumnos", nunca se pierde;
  2. búscalo escribiendo su nombre sin acentos: su correo se ve **enmascarado** (a lo más dos letras, `***` y el dominio), nunca completo;
  3. agrégalo de nuevo: en la tabla aparece con su correo **completo** y "Al corriente".

  Como estudiante, en "Personas", el maestro va aparte y no ves ningún correo ni estado de pago.
- **H-4. Muro sin archivos (1.5 min).**
  1. Como maestro, publica un anuncio. Mientras se publica aparece un instante la nota "Mientras se publica no puedes cambiar los archivos.", aunque no haya archivos (O-13): di si te estorba.
  2. Publica un material.
  3. Como estudiante, comenta.
  4. Como maestro, borra ese comentario.
- **H-5. Material con archivos (2 min).** Es la única comprobación real de la subida a MinIO y de su CORS (S-21).
  1. Como maestro, elige el PNG y el PDF, y publica un material. Mientras se publica, pulsa "Quitar" en uno: no debe quitarlo, y la nota lo explica. Los controles se ven activos: es el residual aceptado de T-38. Di si te basta la nota.
  2. Al terminar, la imagen se ve en vista previa.
  3. "Descargar" del PDF lo baja **con su nombre original, con acentos**.
  4. Como estudiante, también ves la imagen y descargas el PDF.
  5. Como maestro, al pedir borrar esa publicación, la frase dice "Se borrará con sus comentarios y adjuntos.". Cancela.

  **Si la subida falla por CORS** (el aviso "No pudimos subir «…». Inténtalo de nuevo." y un error de CORS en la consola), detente: el remedio toca `infra/` y lo decide el humano (S-21).
- **H-6. A 360 px (1.5 min).** Antes, el maestro crea dos clases más con las cadenas de `comprobacion-humano.md`.
  - **En el inicio del maestro:**
    - el titular no se desborda;
    - las tarjetas van en una columna;
    - la tarjeta interna queda debajo del texto;
    - el saludo con el nombre largo no se sale.
  - **En las tarjetas de las dos clases largas, y en su página** (el `h1` y "Maestro: …"): el texto parte la línea sin desplazamiento horizontal. En el inicio del estudiante, el nombre largo del maestro cabe en la tarjeta.
  - **En "Alumnos",** la tabla se desplaza dentro de su contenedor, no la página.
  - **En el muro,** la ficha del PDF y la imagen de H-5 no desbordan.
  - **Con el lector de pantalla, una sola vez:** en el buscador de "Alumnos", pega una de las cadenas largas y escucha el campo. Se leen seguidas la ayuda permanente y el aviso de longitud. Si te molesta, el ajuste es del carril trivial. Si no cabe en el tiempo, queda "no verificado por decisión del humano".

**No verificado por decisión del humano, cubierto por pruebas automáticas:**
| Qué | Pruebas que lo cubren |
|---|---|
| El contraste | `tokens.test.ts` y `tokens-r1` |
| El estado "Deudor", que no se puede provocar desde la interfaz | PR-B03a y PR-B11a |
| El registro de `movimientos_inscripcion`, sin pantalla en CLASES | PR-B16a a PR-B16h |
| Los destinos de foco de §7.14 con lector de pantalla, salvo lo que se oye en H-3 y H-6 | Las pruebas de foco de b y c |
| Una vista previa vencida tras 4 o 5 minutos | PR-D18a, PR-D18b y las `*.ataque` de T-40 |
| Una URL `javascript:` o `data:` | PR-D17a, PR-D17b y T-39 |
| El alumno restringido sin URL | PR-D09c y PR-D09i |
| Los límites de tipo, tamaño y cantidad | PR-D11a a PR-D11d y PR-D04b |
| El firmado sin red | PR-D03a |
| Que ni el estado de pago ni el correo lleguen a un estudiante | PR-A16, PR-B02e y PR-D06c, entre otras |
| El CORS y la firma de R2 | Es `prod`: los verifica DEPLOY |

**Con el "bien":** las marcas "propuesta" de `docs/DESIGN.md` de este encargo pasan a "propuesta aprobada (fecha)" ("Documentos a actualizar", punto 10).

### Medición del programador en d (para `docs/ESTADO.md` §6)
| Subentrega | Rondas del tester | Rondas extra | Resúmenes devueltos |
|---|---|---|---|
| CLASES-d | 3 (sin escalada) | 2 | 0 de 3 (implementación, corrección 1 y corrección 2) |

- **Bien:**
  - cifras exactas en los tres resúmenes, contrastables con su comando;
  - el lockfile de `minio` limpio y explicado;
  - N-1 a N-5 al pie de la letra;
  - las seis correcciones de la ronda 1 cumplieron el criterio exacto a la primera, sin tocar `*.ataque`;
  - T-44 lo corrigió sin ramas por unidad, que era la causa;
  - se detuvo donde debía en lo demás;
  - el código de producción resistió todo lo sensible desde la ronda 1: autorización, alcance por `archivoId` sin oráculo, la carrera de confirmación, firmas y expiración, `Content-Disposition`, logs con `trace` y configuración.
- **A vigilar:**
  - **PA-09 no aplicada:** modificó `publicacion-del-muro.tsx` (que estaba en "No se toca" por omisión del plan) sin detenerse. Lo declaró y el cambio era el correcto, pero la regla es detenerse;
  - **N-D4 omitido** en la primera corrección, sin declararlo. Lo aplicó en la segunda;
  - **no aplicar por analogía, por segunda subentrega seguida** (T-30 y T-31 en c): T-39 (validó el protocolo de la URL de subida en `almacenService`, pero no el de la descarga ni el de la vista previa) y T-38 (`enEspera` en el botón principal, pero la lista seguía editable durante la misma operación). T-43 y T-44 son el mismo patrón dentro de una función: corrigió KB y no MB.

**Lectura acumulada del encargo (a, b, c y d)**, para la decisión del humano sobre el modelo del programador:
| Subentrega | Rondas | Extra | Escaladas | Resúmenes devueltos |
|---|---|---|---|---|
| CLASES-a | 4 | 3 | 1 | 3 de 7 |
| CLASES-b | 5 | 4 | 2 | 1 de 6 |
| CLASES-c | 4 | 3 | 1 | 0 de 5 |
| CLASES-d | 3 | 2 | 0 | 0 de 3 |
| **Encargo** | **16** | **12** | **4** | **4 de 21** |

- **Lo que mejoró con las medidas de AUTH-03c:**
  - la exactitud del resumen: 3 devueltos en a, 1 en b, 0 en c y en d. Las afirmaciones falsas de a (D-5, D-6) y b (D-7) no se repitieron en c ni en d;
  - las rondas extra bajaron de 4 a 2, y d cerró sin escalada.
- **Lo que no cambió en las cuatro subentregas:**
  - ningún hallazgo fue de seguridad ni alto;
  - el código sensible (autorización, fugas, concurrencia, cola, firmas) resistió desde la ronda 1;
  - todo el costo estuvo en los casos negativos y los bordes (foco, longitudes, unidades) y en no extender por analogía el remedio de un hallazgo a sus hermanos. Ese patrón explica la mayoría de las 12 rondas extra.
- **Detenerse ante una PARADA** mejoró, pero no del todo: a (PA-09 resuelta por su cuenta), c (se detuvo bien en PA-16 y D-1) y d (PA-09 otra vez, aunque declarada).
- **Mi recomendación, que es decisión del humano:** mantener `sonnet` con esfuerzo `medium` en el próximo encargo, con una medida barata contra el patrón que queda. Al corregir un hallazgo, el resumen lista los controles, rutas o unidades hermanos y dice si el remedio también les aplica. Si el próximo encargo vuelve a tener 2 o más rondas extra por subentrega por ese motivo, conviene probar `opus` en el programador para el carril sensible. El costo de cada ronda extra del tester (`opus`, esfuerzo `high`) ya es comparable.

### Desacuerdos arbitrados
Ninguno nuevo en esta revisión. Los de d ya se arbitraron en su momento, y la Enmienda 13 los registra:
- PA-07 de la ronda 0, que fue a CHORE-02;
- las cuatro desviaciones de la implementación (Enmienda 11);
- T-38 a T-43 (Enmienda 12);
- PA-12, que dio lugar a C-23;
- los tres `500` provocados por `archivos-d-r2`.

### Para el humano
1. **El carril trivial antes del commit `<Cd>` (N-F2 y el detalle del README).** Son dos cambios en archivos autorizados en d, sin cambio de comportamiento ni de `*.ataque`:
   - cambiar por escapes los cuatro inversores de dirección literales de `shared/src/clases.ts:48`, y comprobarlo por programa;
   - corregir "pendiente de NOTIFICACIONES" en `backend/src/adapters/README.md`.

   Después, lint y test de `shared`, `backend` y `frontend`. La tabla de V-01 no cambia. Si prefieres no tocar código después de esta revisión, el primero puede ir al siguiente encargo, con el aviso de GitHub en el PR.
2. **La comprobación humana:** la lista de arriba, de 6 puntos y 10 minutos.
   - Si H-5 falla por CORS, el remedio toca `infra/` y lo decides tú (S-21).
   - En H-4 decides O-13 y en H-5, el residual de T-38. Si alguno te molesta, va por el carril trivial.
3. **El modelo del programador:** los datos y mi recomendación están en "Medición del programador". La decisión estaba prevista para después de CLASES.
4. **Una regla de proceso que propongo (O-15), opcional:** en `AGENTS.md`, "Pruebas", agregar "Nunca se corren dos suites a la vez (backend y frontend, o dos del backend): la carga tumba el backend por la espera en cadena de CHORE-02". El tester y yo ya lo hacemos. Escribirlo evita que otro agente o una sesión nueva lo repita.
5. **CHORE-02 sigue costando corridas:** la de la raíz de esta revisión volvió a caer (10 tiempos límite, incluidos dos casos de d por arrastre). También volvió el `P2028` de `cambiar-contrasena`, el pendiente de AUTH con prioridad alta. Con CLASES cerrado, conviene decidir cuándo entra CHORE-02.

### Verificación del carril trivial (N-F2 y README)
Fecha: 2026-10-02, de 12:35 a 12:47. Verifico `resumen-programador.md`, "## CLASES-d — carril trivial antes de <Cd> (N-F2 y README)" (línea 1808).
**Veredicto: ACEPTADO.** Las cifras de lint, build y suites coinciden con mi corrida. La única inexactitud es una observación sobre un documento de trabajo, no sobre código (ver abajo).

**Alcance:**
- Desde mi revisión final (11:27), en los tres paquetes solo cambiaron dos archivos: `shared/src/clases.ts` y `backend/src/adapters/README.md` (`find -newer`). Siguen siendo 35 rastreados y 29 nuevos.
- **`shared/src/clases.ts`:** contra `c7fcece`, además de lo de d, solo cambia la línea 48: `INVERSORES_DE_DIRECCION` pasa de cuatro literales a escapes `\u202A-\u202E` y `\u2066-\u2069`, en ASCII puro (comprobado por programa). Sobre todo el archivo, inversores e invisibles: 0. El comentario de las líneas 45 y 46 está intacto.
- **`backend/src/adapters/README.md`:** solo cambia la última frase de la sección de d. Ahora dice `LIMPIEZA_DIARIA`, prerrequisito de DEPLOY (P-02), y que borra el objeto y la fila de pendientes vencidos y descartados. El numstat sigue en 25/0 contra `c7fcece`.

**Mis cifras:**
| Comando | Resumen | Mi corrida |
|---|---|---|
| `shared`: `npm run lint` y `npm run build` | 0 y 0 | 0 (`All matched files use Prettier code style!`) y 0 (`> tsc -p tsconfig.json`) |
| `backend`: `npm run lint` | 0 | 0 (`> tsc -p tsconfig.json --noEmit`) |
| `frontend`: `npm run lint` | 0 | 0 (`> tsc -b`) |
| `npx vitest run src/core/clases` | `42 passed (42)` | `42 passed (42)` |
| Backend `npm test` (PA-01 antes: `True Inbound Block Public`, `IZZI-F281-5G`) | `1300 passed (1300)` en la corrida 2 | `120 passed (120)` / `1300 passed (1300)` a la primera, de 12:42:19 a 12:43:20 |
| Frontend `npm test` (después del backend, nunca a la vez) | `1395 passed (1395)` | `104 passed (104)` / `1395 passed (1395)` |
| V-01 | 107/107 | **107/107** contra la tabla de la línea 4831 |
| PA-07 | los dos aceptados | Los cuatro términos en 0; `P2028`, solo los dos aceptados. Los `500` del muro y de archivos son solo los tres `ZodError` provocados por `archivos-d-r2` |
| PA-10 y PA-11 | limpios | `X-Amz-Signature` 0. A las 12:45, solo `campus-dev-postgres-1` |

**Inexactitud del resumen (no lo devuelvo):** dice que `resumen-programador.md:1392` tiene 4 inversores literales, pero tiene **uno** (U+202E, dentro de `"Clase…mala"`).

**Decisión sobre los invisibles de los documentos de trabajo:** sí se cambian antes del commit `<Cd>`. Todos van al repositorio, y GitHub marca los archivos con caracteres bidireccionales. Todos son escapes que la herramienta convirtió en caracteres reales (O-10), así que lo correcto es volver a escribirlos como el escape que se quiso poner (`\u202E`), no como `U+202E`. El orquestador lo hace con un script (barra invertida con `String.fromCharCode(92)`) y comprueba el resultado por programa:
- **Obligatorio (bidireccionales):**
  - `resumen-programador.md:1392` (U+202E);
  - `aprobacion.md:284` (U+202A, U+202E, U+2066 y U+2069; la anotación del carril trivial, que quiso escribir los escapes).
- **Recomendado, en la misma pasada (invisibles de ancho cero, que no reordenan pero no se leen):** `reporte-tester.md:559` (U+FEFF), `:1991` (U+200B) y `:2437` (U+200B, U+2060 y U+FEFF). Son casos de prueba citados.
- **No se toca:** el U+200D de `revision.md:2320`, que es parte del emoji `👩‍💻` citado como tal.
- **Ya corregido por mí en `revision.md`, mi archivo:** la línea 3737 (los cuatro inversores, que quise escribir como escapes) y la 2322 (U+200B y U+3164). Lo hice con un script; ya no queda ningún bidireccional ni invisible salvo el de la línea 2320.
- **Fuera de este encargo:** `docs/trabajo/AUTH-03-ajustes-de-cuentas/plan.md:946` tiene un U+202E, ya publicado en `main`. Queda como nota para un `chore` de documentos; no bloquea `<Cd>`.

## Verificación del carril trivial de cierre (ajustes visuales del humano)
Fecha: 2026-10-02, de 14:57 a 15:06. Verifico `resumen-programador.md`, "## CLASES-d — ajustes visuales del humano (carril trivial, antes de <Cd>)" (línea 1833), contra los cuatro ajustes de `comprobacion-humano.md`, "Ajustes visuales" (líneas 97 a 101).
**Veredicto: CAMBIOS REQUERIDOS.** Vuelve al programador por dos problemas pequeños: uno de comportamiento en la ruta `editar` y una contradicción interna de `DESIGN.md`. Las cifras coinciden con mi corrida, el alcance es el declarado y V-01 está intacto.

### Problemas que bloquean
#### M-T1 — El indicador de las secciones marca "Muro" en una página que no es ninguna sección
Dónde: `frontend/src/features/clases/components/secciones-de-clase.tsx:24` y `:36-37`; la ruta `/maestro/clases/:claseId/editar` (`app/router.tsx:82`) se monta dentro de `ClaseLayout`, que siempre pinta `SeccionesDeClase` (`clase-layout.tsx:47`).
Por qué importa: el indicador solo distingue "la segunda sección" de "todo lo demás". En "Editar clase", ningún `NavLink` está activo ("Muro" lleva `end` y "Alumnos" no coincide), pero `segundaActiva` es `false` y la pastilla `bg-surface` queda bajo "Muro". La pantalla dice "estás en Muro" y no es cierto: ni `aria-current` ni el color lo respaldan. Esto contradice la regla nueva de §7.3 ("el estado activo se dice además con `aria-current`... nunca solo con la posición del indicador"). Antes del ajuste, en esa ruta no se resaltaba nada. Ninguna prueba lo ve porque el indicador es `aria-hidden`.
Qué se espera: si ninguna sección está activa, no se ve ningún indicador. Y una prueba normal que lo cubra en las tres rutas del maestro: muro, alumnos y editar. Como el remedio toca la lógica de rutas del componente, la ronda la decide el orquestador según "Trabajo visual". Bastan el programador con su prueba y mi verificación, salvo que alguna `*.ataque` cambie.

#### M-T2 — `DESIGN.md` §7.3 se contradice: la regla "presente y futuro" choca con el grupo "Tipo de publicación"
Dónde: `docs/DESIGN.md:413` (regla nueva) y `:414` ("Grupo de dos botones para elegir un tipo", aprobado ese mismo día).
Por qué importa: el humano pidió la regla "para todo control segmentado o de pestañas **futuro**". El texto dice "presente y futuro" y además menciona `aria-pressed`. Con eso, el grupo de `FormularioPublicacion` de la viñeta siguiente, que lleva fondo `--surface`, `Check` y ningún indicador deslizante, queda como incumplimiento sin excepción declarada. `DESIGN.md` es la fuente única: el siguiente encargo no sabría si debe cambiarlo.
Qué se espera: que la regla diga lo que pidió el humano (los controles futuros, más `SeccionesDeClase`) y que deje al grupo "Tipo de publicación" como existente fuera de la regla, pendiente de que el humano decida. El programador ya lo identificó como hermano en su resumen. En la misma edición, la regla debería fijar el radio del grupo y el del indicador: hoy el código usa `rounded-card` (16 px, documentado para "Tarjetas de clase") con `p-1` y `rounded-row` (14 px), y nada de eso está escrito.

### Cifras: resumen contra mi corrida
| Comando | Resumen | Mi corrida |
|---|---|---|
| PA-01 | — | Regla `True Inbound Block Public`; red `IZZI-F281-5G`, perfil `Public` (14:57) |
| `frontend`: `npm run lint` | sin errores (ESLint, Prettier, `tsc -b`) | código 0; última línea `> tsc -b` |
| `frontend`: `npm test` | `Tests  1395 passed (1395)` (104 archivos) | 1.ª: `104 passed (104)` / `1395 passed (1395)`; 2.ª: `1 failed`, `1394 passed (1395)` (ver N-T1); 3.ª: `104 passed (104)` / `1395 passed (1395)`. Nunca a la vez que el backend |
| `backend`: `npm run lint` | no se corrió (no cambia) | código 0; última línea `> tsc -p tsconfig.json --noEmit` |
| `backend`: `npm test` | no se corrió | `120 passed (120)` / `1300 passed (1300)` a la primera (15:03:44 a 15:04:49) |
| `npm run build` (raíz) | no se corrió | código 0; `✓ built in 889ms` |
| V-01 | sin cambios en `*.ataque` | **107/107** contra la tabla de `reporte-tester.md` (línea 4831); el árbol tiene exactamente las mismas 107 rutas |
| PA-07 | — | `40P01`, `deadlock detected`, `could not serialize` y `too many clients` en 0. `P2028`: solo los dos aceptados (`POST /api/auth/login` sobre `tx.sesion.create` y `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`). Los `500`: los tres `ZodError` provocados por `archivos-d-r2`, seis "fallo simulado de la base" de `intentos-r2` y `/prueba/error-comun`, todos provocados a propósito. Ninguno en el muro sin provocar |
| PA-10 | — | `X-Amz-Signature` y `STORAGE_SECRET_KEY`: 0 |
| PA-11 | — | A las 15:05:23 (34 s después) Ryuk ya no estaba; solo `campus-dev-postgres-1`, `-minio-1` y `-livekit-1` (los de `infra/` de la comprobación humana) |

### Alcance (lo que cambió)
- En los paquetes, desde mi verificación anterior (12:47), solo cambiaron los seis `.tsx` declarados (`find -newermt`). El cliente generado de Prisma también, pero lo ignora git (`.gitignore:9`). Rastreados contra `c7fcece`: de 35 a 41, que son exactamente esos seis. Nuevos: siguen siendo 29.
- Ninguna `*.ataque` ni ninguna prueba normal cambió. El tester no adaptó nada, así que no hubo aserciones que perder.
- Los protegidos coinciden con sus SHA-256 de `aprobacion.md`: `AGENTS.md`, los tres `.claude/agents/*.md`, `CLAUDE.md`, `README.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIALS.md`, `PRD.md` y `plan.md`. `DESIGN.md` queda en `F1449039…`, a la espera de su hash final en la tabla de cierre.
- No hay bidireccionales ni invisibles en los siete archivos tocados (comprobado con `node`).

### Los cuatro ajustes contra lo pedido
1. **Descripción:** cumple. Tiene `min-w-0 wrap-anywhere`, el mismo mecanismo del `h1` y del "Maestro:" (`encabezado-clase.tsx:32` y `:35`). Tailwind 4.3 genera `wrap-anywhere`.
2. **Monograma:** cumple. La barra empieza en "Inicio" (`DESTINOS_POR_ROL`). `DESIGN.md` actualiza la tabla de tokens (`--brand`) y §7.4. `Monograma` sigue en `components/layout`, aunque ahora solo lo usa `features/auth`: ver N-T2.
3. **Vacíos sobre orbes:** cumple, y la lista de hermanos del resumen es exacta. Hay seis usos de `EstadoVacio`. Los dos que estaban sueltos (muro y `TablaEnlaces`) ahora van en `Card`. `PanelMisClases`, `TablaAlumnos` y `PersonasView` ya iban dentro de `Card`. `RegistradosDelEnlace` vive dentro de una celda de tabla. Ningún vidrio queda sobre otro vidrio.
4. **Pestañas:** cumple en vidrio (`Card`), `transition-transform duration-200`, `motion-reduce:transition-none`, `aria-current` y `text-link` conservados, sin `disabled`, sin textos en el `.tsx` y sin ternarios anidados ni `?? []`. Tiene el defecto de M-T1. `DESIGN.md` §6 declara la excepción de 200 ms con `transform` y la de movimiento reducido, y §7.1 la de rendimiento. Todo coherente con la regla de transiciones de 150 ms.
- **Hermanos del control segmentado:** el resumen es correcto. El único otro grupo excluyente es "Tipo de publicación". `campo-contrasena.tsx` usa `aria-pressed` como interruptor, no como grupo.
- **`DESIGN.md`:** cambió solo en lo declarado (tabla de tokens, §6, §7.1, §7.3, §7.4, §7.10 y §7.16), además de las marcas de aprobación y §7.19, que ya estaban. Todo lo nuevo lleva la marca "propuesta, decisión del humano (2026-10-02)".

### Problemas que no bloquean
- **N-T1 — `archivos-d-r2.ataque.test.tsx`, caso "volver al muro después del margen (4 min 1 s)…", es intermitente.** Falló en 1 de mis 3 corridas completas: `expected [ '…/v/1' ] to deeply equal [ '…/v/2' ]`, línea 552. Aislado pasó 5 de 5. El conteo de peticiones de la línea 550 sí pasó: la segunda respuesta llegó, pero no se había pintado dentro de la espera fija de 50 ms (`setTimeout` de la línea 548). No lo causa este ajuste, porque monta `MuroView` con datos y el cambio solo toca la rama vacía. Es una carrera de tiempo bajo carga. Solo el tester puede tocar esa prueba. Recomiendo que la corrija en esta misma vuelta, como un C-n: cambiar la espera fija por una espera de la imagen nueva, sin tocar aserciones ni títulos. Si el humano prefiere no tocarla, va a CHORE-02 y se anota en `docs/ESTADO.md` §3. En cualquier caso, debe registrarse antes de `<Cd>`.
- **N-T2 — `Monograma` en `components/layout` con un solo módulo usuario (`features/auth`).** La regla 5 de `CLAUDE.md` ya no lo justifica ahí. Moverlo es un refactor entre dominios, que requiere confirmación. Destino: el próximo encargo que toque `features/auth` o el logo (PRD §11). Lo anoté para `ESTADO.md` §3.

### Detalles menores
- El resumen no trae la última línea literal de `lint` (la describe) ni corre `build`. En un carril trivial sin cambios en `shared/` no hacía falta `build`, y mis cifras confirman lo que dice. No lo devuelvo por esto, pero el resumen de la corrección debe traer la línea literal.
- Los cuatro ajustes son visuales. Las pruebas no ven el deslizamiento, el vidrio ni el corte a 360 px. Quedan **no verificados en navegador**, y los decide el humano en su vistazo antes de `<Cd>`. Ahí las marcas pasan a "propuesta aprobada".

### Para el orquestador
1. Programador: M-T1 (con su prueba normal) y M-T2. El resumen de la corrección lista los hermanos y trae lint, test y build con su última línea.
2. Tester: N-T1, solo si el humano no lo manda a CHORE-02.
3. Después vuelvo a verificar: lint, test (frontend dos veces), V-01 y el diff de los archivos tocados.

## Verificación de la corrección del carril trivial de cierre (M-T1, M-T2 y C-28)
Fecha: 2026-10-02, de 15:18 a 15:27. Verifico dos entregas:
- la del programador, en `resumen-programador.md`, "### Corrección de M-T1 y M-T2" (línea 1849);
- la del tester, en `reporte-tester.md`, "### C-28: esperas fijas en las *.ataque de d (N-T1)" (línea 4942), con su tabla nueva de 107 hashes (línea 4989).

**Veredicto: APROBADO.** M-T1 y M-T2 quedan corregidos. N-T1 se resolvió con C-28, sin tocar ninguna aserción ni ningún título. Todas las cifras de los dos resúmenes coinciden con mi corrida, y solo cambió lo pedido. Ya no queda nada que bloquee el commit `<Cd>`.

### Cifras: los dos resúmenes contra mi corrida
| Comando | Programador | Tester | Mi corrida |
|---|---|---|---|
| `frontend`: `npm run lint` | `> tsc -b` | `> tsc -b` | código 0; última línea `> tsc -b` |
| `frontend`: `npm run build` | `✓ built in 2.00s` (desde la raíz) | — | código 0; última línea `✓ built in 693ms` |
| `frontend`: `npm test`, corrida 1 | `Tests  1396 passed (1396)` | `104 passed (104)` / `1396 passed (1396)` | `Test Files  104 passed (104)` · `Tests  1396 passed (1396)` (56.44 s) |
| `frontend`: `npm test`, corrida 2 | `Tests  1396 passed (1396)` | `104 passed (104)` / `1396 passed (1396)` | `Test Files  104 passed (104)` · `Tests  1396 passed (1396)` (56.18 s) |
| `backend`: `npm test` (PA-01 antes) | — | `120 passed (120)` / `1300 passed (1300)` | `Test Files  120 passed (120)` · `Tests  1300 passed (1300)`, de 15:22:15 a 15:23:19. Lo corrí antes de las dos del frontend, nunca a la vez |

- **PA-01:** regla `True Inbound Block Public`; red `IZZI-F281-5G`, perfil `Public`.
- **PA-07:** los cuatro términos en 0, y `P2028` solo en los dos aceptados (login sobre `tx.sesion.create()` y restablecer sobre `tx.tokenCuenta.updateMany()`). Los `500` son los provocados de siempre: los tres `ZodError` de `archivos-d-r2`, los seis fallos simulados de login y `/prueba/error-comun`.
- **PA-10:** `X-Amz-Signature` en 0.
- **PA-11:** al terminar quedaba el Ryuk de la corrida. A las 15:25:25, a más de 120 s, ya no estaba, y solo quedan los cuatro contenedores de `infra/` de la comprobación humana.
- **V-01:** **107/107** contra la tabla de la línea 4989. Difieren 5 respecto de la tabla de la línea 4831, exactamente las de C-28: `logs-archivos-d-r1` y `-r3` del backend, y `archivos-d-r1`, `-r2` y `-r3` del frontend. Las otras 102 son iguales.

### Alcance (lo que cambió desde mi verificación de las 15:06)
- Con `find -newermt`, en los paquetes y en los documentos protegidos solo cambiaron estos archivos:
  - `secciones-de-clase.tsx` y `clase-layout.test.tsx`;
  - las 5 `*.ataque` de C-28;
  - `docs/DESIGN.md`;
  - y, en `docs/trabajo/`, los entregables de los agentes y `aprobacion.md`.
- Nada más. Rastreados contra `c7fcece`: pasan de 41 a 42, y el que se suma es `clase-layout.test.tsx`. Nuevos: siguen siendo 29.
- Sin bidireccionales ni invisibles en los ocho archivos tocados (comprobado con `node`).

### M-T1, corregido
- **`secciones-de-clase.tsx`:**
  - `primeraActiva` sale de `useMatch({ path: base, end: true })` y `segundaActiva` de `useMatch({ path: destino, end: false })`;
  - el indicador se monta solo con `hayActiva`, y `translate-x-full` se aplica solo con la segunda activa;
  - sin ternarios anidados, con un comentario del porqué;
  - `aria-current` y `text-link` no cambian.

  En "Editar clase" ya no se pinta ningún indicador.
- **La prueba** (`clase-layout.test.tsx`, "M-T1: en el muro el indicador va bajo la primera sección, en alumnos bajo la segunda y en editar no hay indicador"):
  - es un archivo del propio encargo que se extiende: solo se agregó un `describe` y ningún caso existente cambió;
  - cubre las tres rutas del maestro con `aria-current` por rol y texto, y el conteo del indicador (1, 1 y 0);
  - la posición se ve por `translate-x-full`, porque el indicador es `aria-hidden`. Es una prueba normal, así que la regla de no usar selectores de estilo, que es de las `*.ataque`, no aplica.

  Las rutas del estudiante (muro y personas) no tienen una ruta sin sección dentro de `ClaseLayout`, así que no les falta caso.

### M-T2, corregido
- **`DESIGN.md` §7.3, viñeta "Control segmentado o de pestañas":**
  - el alcance es "todo control segmentado o de pestañas **futuro**; hoy solo `SeccionesDeClase`", lo que pidió el humano;
  - documenta el `Card` con `rounded-card` y `p-1`, y el indicador con `rounded-row`;
  - el estado activo se dice con `aria-current` (navegación) o `aria-pressed` (elección), y con el color del texto;
  - "**Sin opción activa no hay indicador**", con el ejemplo de `/editar`;
  - el grupo "Tipo de publicación" queda fuera de la regla, pendiente de que decida el humano;
  - lleva la marca "propuesta (2026-10-02), decisión del humano".
- **La viñeta del grupo de dos botones** (línea 414) no cambió. Ya no hay contradicción.
- **Hunks de `DESIGN.md` contra `c7fcece`:** caen en las mismas secciones que verifiqué a las 15:06, y en §7.3 solo cambia esa viñeta.
- **Hash:** el orquestador normalizó el archivo a LF sin cambiar su contenido. Lo comprobé: 0 retornos de carro, el numstat sigue en 36/22 y el SHA-256 actual es **`E3362BD236F2123F85DD29C1D0543884D20A425DAE1C96980697175C40AB9788`** (el `0D7D975B…` que me pasaste correspondía a los mismos bytes con CRLF). Es el hash que va a la tabla de cierre.

### C-28 (N-T1), resuelto
- **Las 5 `*.ataque` cambian solo en sus esperas fijas:**
  - en el frontend, `act(() => new Promise(… setTimeout …))` pasa a `waitFor` de la condición real: el aviso del `catch`, el `src` firmado de la vista previa nueva o el número de peticiones;
  - en el backend, el `setTimeout` de 200 ms pasa a un sondeo de 10 ms con un tope de 5 s;
  - en el frontend ya no queda ningún `setTimeout`; en el backend, solo el del sondeo.
- **Aserciones y títulos:**
  - las aserciones originales siguen después de cada espera. Lo revisé en los seis sitios marcados "C-28";
  - los títulos son idénticos: `vitest list` de esos archivos frente a mi lista de las 11:15 da 41 casos en el frontend y 4 en el backend, sin diferencias;
  - las esperas nuevas solo exigen lo que la aserción siguiente ya pedía, así que no debilitan nada.
- **Los sondeos del backend no fallan por sí mismos** al llegar al tope, pero las aserciones de después sobre el log sí fallan si falta lo esperado. No hay un `return` temprano.
- **El caso intermitente de N-T1** pasó en mis dos corridas completas del frontend (antes, 1 de 3).

### Lista de diseño (§7.3 y su hermano de §7.16)
- **Tokens:** solo `rounded-card`, `rounded-row`, `bg-surface` y `text-link`; `duration-200` es la excepción declarada en §5. No hay valores sueltos.
- **El estado no se dice solo con la posición:** con opción activa lo dicen `aria-current` y el color; sin opción activa no hay indicador.
- **Movimiento:** `motion-reduce:transition-none`.
- **Componentes:** `Card` y `buttonVariants` de `ui/`. Sin `disabled`.
- **§7.16, viñeta "Secciones":** no es un hallazgo; es una observación con destino. Dice "un indicador que se desliza bajo el activo (control segmentado, §7.3…)": remite a §7.3 y solo afirma el indicador cuando hay un activo. Así que no contradice "sin opción activa no hay indicador". Agregar la frase sería repetir una regla que ya vive en un solo lugar.
  - **Destino:** ninguno obligatorio. Si alguna vez se toca §7.16 por otro motivo, puede sumarse "(sin sección activa, sin indicador)" en el mismo paréntesis.
- **No verificado en navegador** (lo decide el humano en su vistazo antes de `<Cd>`): el deslizamiento y la ausencia del indicador en "Editar clase".

### Pendientes que siguen con destino (sin cambios)
- N-T2: `Monograma` en `components/layout` con un solo módulo usuario.
- Detalle del resumen anterior: ahora el programador trae la última línea literal de lint, test y build. Cumplido.

### Para el orquestador
- Anota en la tabla de cierre el SHA-256 final de `DESIGN.md` (`E3362BD2…`) y la base de V-01 del siguiente encargo: la tabla de 107 de `reporte-tester.md`, línea 4989 (C-28).
- No hace falta otra ronda.
