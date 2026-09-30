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
