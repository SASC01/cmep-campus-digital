# Plan — CLASES-02 · clases administradas, maestros por clase, autoría y barra lateral
Estado: LISTO (P-01 y P-02 decididas por el humano el 2026-10-03: (b) y (A); P-03 a P-11 en la opción recomendada. La Enmienda 1, al final, responde M-01 a M-07 de `revision.md`, ya corregidos en el sitio)
Carril: sensible (lo fijó el humano: migración con datos, `middleware/`, autorización)
Requisitos: RF-10, RF-11, RF-19, RF-30, RF-31, RF-33, RF-38, RF-52, RF-59 · RN-02, RN-04, RN-06, RN-07 · PRD §6 y §7

| Campo | Valor |
|---|---|
| Rama | `feat/clases-02`, creada desde `main` = `e4396a0` (fusión del PR #17, CHORE-02) |
| Base de "No se toca" | `<R>` = `e4396a0` fuera de los paquetes; dentro de ellos, `<R>` para 02a y el commit de la subentrega anterior para las demás (`<K2a>`, `<K2b>`, `<K2c>`) |
| Subentregas | **02a** backend: modelo, migración, autorización y gestión de clases y maestros · **02b** backend: muro del admin, autoría, archivos y "Personas" con correo · **02c** frontend: `/admin/clases`, la clase vista por el admin, el maestro sin crear ni editar, autoría en el muro · **02d** frontend: barra lateral con la lista de clases, "Personas" con correo, control segmentado del tipo de publicación |
| Commits | Uno por subentrega, del humano: `<K2a>`, `<K2b>`, `<K2c>`, `<K2d>` |
| Cifras de partida (V-01 y V-07) | backend 132 archivos / 1623 pruebas; frontend 104 / 1396; 115 `*.ataque` (tabla de SHA-256 al final de `docs/trabajo/CHORE-02-pruebas-y-espera-en-cadena/reporte-tester.md`, ronda 6) |
| Fecha | 2026-10-03 |

Convenciones de este plan: decisiones `§D-2x.n`; pruebas requeridas `PR-2A01`, `PR-2B01`…; cambios de comportamiento que contradicen pruebas existentes `C-n` (§D-2R0); autorizaciones del carril sensible `A-n`; paradas `PA-n`; riesgos `R-n`; suposiciones `S-n`.

## Preguntas bloqueantes

Todas las preguntas que necesitan una decisión del humano, bloqueantes o no. Las no bloqueantes llevan la recomendación ya aplicada en el plan.

**Decisión del humano (2026-10-03, Enmienda 1):** P-01 = (b) Moderación, con la línea nueva de RN-07 de "Textos propuestos"; P-02 = (A) barra de 96 px con insignias de iniciales, y H-3 revisa dos clases con iniciales iguales; P-10 = (a) vistas del admin en `features/clases`, con el texto de la tabla de módulos de `CLAUDE.md` de "Textos propuestos"; P-11 = (a) `autor.id` real de la cuenta del admin, sin nombre (S-11 confirmada); P-03 a P-09 sin objeción: opción (a). No quedan preguntas abiertas.

| ID | ¿Bloquea? | Pregunta | Opciones | Recomendación del arquitecto y por qué | Recomendación del manager |
|---|---|---|---|---|---|
| P-01 | **Sí** (02b, y la regla general que reutilizará TAREAS) | RN-07 dice "cada autor borra solo lo suyo" y "un maestro nunca borra ni edita lo que publicó el Administrador". Hoy (CLASES-01) el maestro dueño borra cualquier publicación y cualquier comentario de su clase. ¿Puede un maestro borrar los comentarios de los alumnos de su clase? ¿Y lo que publicó el otro maestro de la misma clase? | **(a) Estricta:** el maestro solo borra lo suyo; pierde la moderación de comentarios.<br>**(b) Moderación:** el maestro borra lo suyo y los comentarios de los alumnos en sus clases; nunca lo del admin ni lo del otro maestro.<br>**(c) Amplia:** el maestro borra todo lo de su clase salvo lo del admin, incluido lo del otro maestro. | **(b).** Conserva la moderación del muro que ya existe (un alumno puede escribir algo indebido y quien está en la clase es el maestro), cumple "nunca lo del admin" y evita que dos maestros de la misma clase se borren entre sí, que es lo que "cada autor borra solo lo suyo" protege entre pares. Con (a) o (c) solo cambian `puedeBorrar` (§D-2B2), sus pruebas y C-8. Con (b), RN-07 necesita una línea (texto en "Textos propuestos"). | **(b) Moderación**, igual que el arquitecto. Conserva la moderación del muro que existe desde CLASES-01 y nunca deja tocar lo del admin ni lo del otro maestro. Con (a), la única persona que puede quitar un comentario indebido de un alumno es el admin, y el muro de cada clase queda sin moderación inmediata. Con (c), dos maestros de la misma clase se borran entre sí, que es lo que "cada autor borra solo lo suyo" protege. Con (b), un maestro también puede borrar el comentario de un alumno **debajo de una publicación del admin**: el comentario es del alumno, no del admin; el humano debe saberlo. (b) exige la línea nueva de RN-07 y de ESSENTIALS (ya propuesta) |
| P-02 | **Sí** (02d) | Forma de la lista de clases en la barra lateral. La barra mide 96 px y sus elementos 72 × 60 px (`DESIGN.md` §7.4): el nombre de una clase no cabe. | **(A) Barra de 96 px:** cada clase es un elemento de 72 × 60 px con una insignia de 28 px con sus iniciales, en el color de su variante de tarjeta (§7.6), y el nombre en una sola línea recortada; el nombre completo es el nombre accesible del enlace y aparece al pasar el cursor (`title`); la lista tiene desplazamiento propio dentro de la barra; en la barra inferior de móvil (64 px) no se muestra.<br>**(B) Barra ancha:** 240 px desde 1024 px, con el nombre completo en dos líneas; cambia la composición aprobada en DESIGN-01 (rejilla del marco y márgenes).<br>**(C) Destino "Clases"** en la barra que abre un popover con la lista. | **(A).** Cumple el PRD sin rehacer el marco aprobado en DESIGN-01 ni su comprobación; las iniciales y el color coinciden con la tarjeta del inicio, y el nombre completo lo tienen el lector de pantalla y el cursor. (C) agrega un clic y un popover dentro de la `nav`. (B) es la más legible, pero es un cambio de diseño mayor que convendría ver en pantalla antes de decidir. | **(A) Barra de 96 px**, igual que el arquitecto. Cumple PRD §7 sin rehacer el marco aprobado en DESIGN-01, y es reversible. Riesgo de (A): nombres parecidos con iniciales iguales ("Derecho Penal I" y "II") y solo 6 a 8 letras visibles; en pantallas táctiles de 768 a 1023 px no hay `title` al pasar el cursor. Que H-3 lo mire con dos clases así. Riesgo de (B): cambia la rejilla y los márgenes aprobados; si el humano la prefiere, conviene verla primero en pantalla. Riesgo de (C): un clic más y un popover dentro de la `nav` |
| P-03 | No (02b) | RF-59 pide que el admin publique y borre en el muro; no dice que comente. ¿Comenta? | (a) No comenta en CLASES-02.<br>(b) Comenta, firmado "Administración". | **(a):** no inventar un requisito. El esquema de comentarios ya lleva la firma (`autor.administracion`), así que habilitarlo después es agregar `admin` a los roles de una ruta y mostrar el formulario. | **(a)** No comenta. RF-59 no lo pide. El esquema ya lleva la firma, así que agregarlo después es barato |
| P-04 | No (02a) | ¿El admin ve y regenera el código de invitación? RF-52 no lo menciona; RN-06 dice que el admin "gestiona" la clase. | (a) Lo ve y lo regenera (las dos rutas de hoy, con `admin` en sus roles).<br>(b) Solo lo ve.<br>(c) No. | **(a):** al crear la clase, el admin es quien puede repartir el código el primer día; son las mismas dos rutas con un rol más, sin código nuevo. | **(a)** Ve y regenera. RN-06: "la gestiona"; son las mismas dos rutas con un rol más. Riesgo aceptable: si el admin regenera, el código que repartió el maestro deja de servir, igual que si lo regenera un comaestro |
| P-05 | No (02a) | Buscador de alumnos del admin en "Alumnos" de una clase: ¿correo enmascarado o completo? RN-04 solo habla del buscador del maestro. | (a) Enmascarado, igual que el maestro: misma ruta y misma respuesta.<br>(b) Completo: respuesta distinta según el rol. | **(a):** una sola forma de respuesta impide que un error de rama le muestre el correo completo a un maestro. El admin ya ve el correo completo en el roster y en `/admin` (buscar cuenta); el buscador completo de personas es RF-57 (ADMIN). | **(a)** Enmascarado. Una sola forma de respuesta en una ruta compartida evita que un error de rama le muestre el correo completo a un maestro. El admin ya ve el completo en el roster y en `/admin` |
| P-06 | No (02a) | Compatibilidad hacia atrás de `clases.maestro_id` (frontend y backend se despliegan por separado) | (a) La columna se conserva `NOT NULL`; el código nuevo la **escribe** (el primer maestro al crear la clase; el maestro que queda cuando se retira al que estaba ahí) y **nunca la lee**. Una migración posterior la retira, junto con los campos de compatibilidad (`maestro` en las respuestas y `DELETE …/mis-comentarios`).<br>(b) Retirarla con una segunda migración al final de 02d.<br>(c) Hacerla anulable y dejar de escribirla. | **(a):** con (c), el backend anterior fallaría con cualquier clase nueva (Prisma espera la relación obligatoria y responde 500); con (b), el backend y el frontend anteriores no convivirían con el esquema nuevo durante un despliegue escalonado. Destino del retiro: antes del primer DEPLOY (no habrá ninguna versión anterior desplegada) o, si DEPLOY ya ocurrió, cuando backend y frontend de CLASES-02 estén en `prod`. | **(a)** Conservar `NOT NULL`, escribir y nunca leer. Es la única opción con la que el backend anterior convive con el esquema nuevo (revertir el código no rompe la base). (b) rompe el despliegue escalonado y (c), el backend anterior con cualquier clase nueva. PA-14, V-04 y el punto 4 del tester vigilan que no aparezca una lectura |
| P-07 | No (02c y 02d) | ¿El admin tiene lista de clases en su barra lateral? | (a) No: un destino "Clases" hacia `/admin/clases`.<br>(b) La lista de todas las clases. | **(a):** el admin alcanza todas las clases; su lista es la tabla institucional de `/admin/clases`. | **(a)** Destino "Clases". El admin alcanza todas las clases; su lista es la tabla de `/admin/clases` (densidad tabular, §8) |
| P-08 | No (02a) | Columna de quién hizo el movimiento en `movimientos_inscripcion` (hoy `maestro_id`), que ahora también guarda al admin | (a) Conservar `maestro_id` en la base y llamar al campo `actorId` en Prisma (`@map("maestro_id")`): sin migración; la FK ya apunta a `usuarios`.<br>(b) Renombrar la columna a `actor_id` (expandir y contraer: dos migraciones). | **(a):** no hay migración ni riesgo, y el nombre en TypeScript ya dice lo correcto. ADMIN, que construye la consulta de esta tabla, puede renombrar la columna junto con sus índices. | **(a)** `actorId @map("maestro_id")`. Sin migración ni riesgo; el nombre correcto en el código. ADMIN puede renombrar la columna cuando construya la consulta y sus índices |
| P-09 | No (02a) | `ARCHITECTURE.md` §14 pide `ON DELETE RESTRICT` en las dos FK de `maestros_de_clase` | (a) `CASCADE` hacia `clases` (como `inscripciones`) y `RESTRICT` hacia `usuarios`.<br>(b) `RESTRICT` en los dos lados. | **(a):** una asignación no existe sin su clase; con `RESTRICT`, la limpieza de las pruebas (`borrarClasesDePrueba`) y cualquier borrado futuro de una clase tendrían que borrar antes las asignaciones. Hacia `usuarios` sigue `RESTRICT` (no hay bajas físicas). Corrige `ARCHITECTURE.md`, no ESSENTIALS. | **(a)** `CASCADE` hacia `clases`, `RESTRICT` hacia `usuarios`. Una asignación no existe sin su clase (igual que `inscripciones`). El historial sí se protege: `movimientos_inscripcion` sigue con `RESTRICT`. Ninguna ruta borra clases (S-09), así que (b) solo cambiaría la ayuda `borrarClasesDePrueba` (es la única que borra clases en las pruebas; lo comprobó el manager). Corrige `ARCHITECTURE.md` §14, no ESSENTIALS |
| P-10 | No (02c; Enmienda 1, decisión que agregó el manager) | Las vistas de clases del admin (`/admin/clases`, crear y la clase vista por el admin) viven en `features/clases` y no en `features/admin`, y por eso cambian las filas `clases` y `admin` de la tabla de módulos de `CLAUDE.md` (A-8) | (a) En `features/clases` (§D-2.0).<br>(b) En `features/admin`, con las claves de TanStack Query de las clases subidas a `services/` para que los dos módulos las invaliden. | **(a):** las claves de las clases tienen un solo dueño y se cumple la regla 9 de `CLAUDE.md` sin que un módulo invalide las de otro; la densidad del admin la da `ContenedorRol`, no el módulo. | Confirmar al aprobar: el motivo es sólido, pero cambia lo que hoy dice `CLAUDE.md` |
| P-11 | No (02b; Enmienda 1, decisión que agregó el manager) | S-11: lo que publica el admin lleva en `autor.id` el id real de su cuenta (no su nombre) | (a) El id real.<br>(b) Otro valor (por ejemplo, un UUID fijo de "Administración"), con un cambio en `autorDelMuroSchema`. | **(a):** el id no abre nada (toda ruta del admin exige su rol) y quitarlo o falsearlo rompería el frontend anterior, que valida `autor.id` como UUID. | Lo deja visible por si el humano prefiere otra cosa |

## Suposiciones

| ID | Suposición | Por qué es razonable |
|---|---|---|
| S-01 | Al retirar a un maestro de una clase, lo que publicó y comentó **se queda**, firmado con su nombre. Él ya no puede verlo ni borrarlo (pierde el acceso); el admin sí puede borrarlo (RN-07). Sus movimientos de inscripción se conservan. El código de invitación no cambia. El alumno ve a los maestros actuales en "Personas" y en el encabezado | Borrar contenido al reasignar sería pérdida de datos que nadie pidió; el código pertenece a la clase, no al maestro |
| S-02 | Un maestro **no** puede quitarse a sí mismo ni a otro: `maestros_de_clase` solo la escribe el admin | ARCHITECTURE §14: "solo escribe el administrador" |
| S-03 | Solo se asignan cuentas con `rol = 'maestro'` y `activo = true`; solo se inscriben cuentas con `rol = 'estudiante'` y `activo = true` (como hoy). El admin nunca queda como maestro ni como alumno de una clase | RN-04 y RN-06; evita que la firma "Administración" se mezcle con una persona |
| S-04 | Crear una clase exige elegir de 1 a 2 maestros en la misma petición | "Una clase nunca queda sin maestro" (RN-06) desde el primer instante |
| S-05 | El orden de los maestros de una clase es el de su asignación: `(creado_en, maestro_id)` ascendente. El primero es el "principal" que llenan los campos de compatibilidad (`maestro` en las respuestas y `clases.maestro_id`) | Determinista y sin columna nueva; dos maestros asignados al crear comparten `creado_en` y desempatan por id |
| S-06 | El buscador de maestros del admin busca por nombre (mínimo 3 letras, 300 ms, la misma normalización de `shared/`), solo maestros activos, hasta 20 resultados con "hay más", y muestra el **correo completo** | El admin ya ve correos completos en `/admin`; RN-04 enmascara solo para el maestro |
| S-07 | La lista de `/admin/clases` pagina de 50 en 50 con "Cargar más clases" (el patrón de `/admin/maestros`), ordenada de la más reciente a la más antigua, sin buscador ni filtros | RF-52 pide la lista institucional, no búsqueda; en la fase experimental hay decenas de clases |
| S-08 | En una clase, el admin ve y usa el mismo roster (con estado de pago y restricción) y el mismo buscador de alumnos que el maestro | RN-02 (el admin ve el estado de todos) y RN-04 |
| S-09 | El admin no borra ni archiva clases (`clases.activa` no se toca) | RF-52 no lo pide |
| S-10 | Las publicaciones del admin encolan `PUBLICACION_CREADA` o `MATERIAL_CREADO` igual que las del maestro, con solo ids. No hay eventos nuevos | Mismo aviso para los alumnos; el consumidor llega con NOTIFICACIONES |
| S-11 | En la firma del admin, `autor.nombre` es el texto fijo "Administración" y `autor.id` es el id real de la cuenta. El id no se usa en el frontend y no abre nada (todas las rutas del admin exigen su rol) | `autorDelMuroSchema` exige `id` como UUID; quitarlo rompería el frontend anterior (compatibilidad) |
| S-12 | Si una petición de escritura de un maestro empezó antes de que el admin lo retirara de la clase, puede terminar (la autorización se lee al entrar, fuera de la transacción). Es la misma ventana que hoy tiene un alumno al que se le restringe el acceso | Releer la pertenencia dentro de cada transacción sería una segunda implementación de la autorización |
| S-13 | Con el frontend anterior y el backend nuevo, "Crear clase" y "Editar clase" del maestro responden `404` (se retiraron a propósito). El backend se despliega antes que el frontend, porque las respuestas ganan campos obligatorios (como `adjuntos` en CLASES-d) | Es el cambio de requisito que decidió el humano; ESTADO §3 ya registra esa regla de despliegue para DEPLOY |
| S-14 | "Personas" del alumno lista a los maestros (1 o 2) y a los alumnos inscritos con cuenta activa (incluidos los restringidos, como hoy), cada uno con su correo completo; nunca estado de pago ni restricción | RF-19 y la regla 3 de `AGENTS.md` |
| S-15 | Mientras el maestro no tenga clases, su inicio no lleva tarjeta interna en el bloque destacado (no hay acción principal) y el vacío de "Mis clases" no tiene botón: dice que la administración asigna las clases | PRD §7 ("El Maestro sin clases no tiene acción") y `DESIGN.md` §7.5 (la tarjeta interna es opcional) |

## Alcance

### Entra, por subentrega

**02a · backend: modelo, migración, autorización y gestión de clases y maestros**
1. Tabla `maestros_de_clase` con migración de datos (una fila por clase existente) y el índice de la lista del admin; `clases.maestro_id` se conserva con escritura doble (P-06 a).
2. Sexto paso de la cadena: el maestro de la clase sale de `maestros_de_clase`; el admin pasa el sexto paso en cualquier clase que exista; solo lo admiten las rutas cuyos `roles` nombran a `"admin"` (en una ruta con sexto paso y sin `roles`, se le niega: cerrado por defecto, Enmienda 1). La guarda de rutas **no cambia**.
3. Rutas del admin: lista institucional, crear clase con sus maestros, editar nombre y descripción, asignar y retirar maestros (tope de 2, mínimo de 1), buscador de maestros.
4. Rutas existentes abiertas al admin: detalle de la clase, código de invitación (P-04 a), roster, buscador de alumnos (enmascarado, P-05 a), alta y baja de alumnos con su movimiento (`actorId`, P-08 a).
5. Se retiran `POST /clases` y `PUT /clases/{claseId}` (el maestro ya no crea ni edita clases).
6. Las respuestas de clase llevan `maestros` (1 o 2) y conservan `maestro` (el principal) por compatibilidad.
7. Carril trivial heredado: el mensaje de tipo de `descripcionClaseSchema` en español.

**02b · backend: muro del admin, autoría, archivos y "Personas"**
1. El admin publica anuncios y materiales con adjuntos en cualquier clase y lee el muro y los comentarios (no comenta, P-03 a).
2. Firma derivada del rol del autor al leer: `autor.administracion` y `autor.nombre` = "Administración"; nada se guarda.
3. Regla general de autoría en `core/autoria.ts` (`puedeBorrar`), aplicada dentro de la transacción del borrado de publicaciones y comentarios, y devuelta por elemento (`puedeBorrar`) para que la interfaz no la duplique. Con P-01 (b).
4. Archivos: el admin solicita subidas y descargas.
5. "Personas": correo completo de maestros y compañeros; `maestros` (1 o 2).
6. Carril trivial heredado: `conTextosNormalizados` pasa a `core/clases/texto.ts` y la sangría de `backend/src/handlers/README.md`.

**02c · frontend: el admin en las clases, el maestro sin crear ni editar, autoría en el muro**
1. `/admin/clases` (tabla opaca y densa), `/admin/clases/nueva` (con selector de 1 o 2 maestros) y la clase vista por el admin en `/admin/clases/:claseId` (Muro, Alumnos, Maestros y Editar clase).
2. Destino "Clases" en la barra del admin (P-07 a).
3. El maestro pierde "Crear clase" y "Editar clase" (rutas, enlaces, textos); su inicio y su vacío de "Mis clases" dicen que la administración asigna las clases.
4. Muro: el botón de borrar sale de `puedeBorrar`; la firma "Administración" con su insignia; el admin publica.
5. Encabezado y tarjetas con uno o dos maestros.
6. Carril trivial heredado: `claseId ?? ""` y `normalizarTextoLargo` en `formulario-clase.tsx`; el texto del `400` del cursor en "Ver más clases"; el `describe` de `muro-view.test.tsx` que dice "Enmienda 8".

**02d · frontend: barra lateral, "Personas" y control segmentado**
1. Lista de clases del usuario en la barra lateral (estudiante y maestro), con P-02 (A).
2. "Personas" del alumno con el correo de maestros y compañeros.
3. El grupo "Tipo de publicación" adopta la regla del control segmentado de `DESIGN.md` §7.3.

### No entra (con destino)

| Qué | Destino |
|---|---|
| Consulta de `movimientos_inscripcion` y sus índices | ADMIN (ya en ESTADO §3) |
| Retiro de `clases.maestro_id`, del campo `maestro` de las respuestas y de `DELETE /clases/{claseId}/mis-comentarios/{comentarioId}` (compatibilidad, P-06) | Antes del primer DEPLOY o, si ya ocurrió, cuando CLASES-02 esté en `prod` (fila nueva de ESTADO §3) |
| Que el admin comente (P-03) | Un encargo posterior, si el humano lo pide |
| Buscador global de personas con correo completo | ADMIN (RF-57) |
| Borrar o archivar clases | Sin encargo (no lo pide el PRD) |
| Editar publicaciones o comentarios | No existe la función; RN-07 la cubrirá cuando exista (TAREAS para las tareas) |
| R-3 de CHORE-02 (`503` de `/auth/refrescar` en `apiClient`) | El próximo encargo que toque `services/apiClient.ts`; CLASES-02 no lo toca |
| M-23 de CLASES-c ("Volver a cargar" en `MensajeError`) | Sigue igual; CLASES-02 no toca `components/mensaje-error.tsx` |
| N-T2 (`Monograma` en `components/layout`) | Sigue igual; CLASES-02 no toca `features/auth` ni el logo |
| `contarVisibles` de `shared/src/auth.ts` | Sigue igual; CLASES-02 no toca `shared/src/auth.ts` |
| La fila M-20 de ESTADO §3 (`AccionEstadoVacio`) | Ya estaba resuelta desde CLASES-a (`estado-vacio.tsx` no lo exporta): el orquestador cierra la fila al cerrar 02a; ningún código cambia |

## Diseño

### §D-2.0 · Cómo alcanza el admin cualquier clase (transversal; decisión de este plan)

**Opciones evaluadas:**

| Opción | Superficie de autorización | Duplicación | Guarda (CHORE-02) | Frontend |
|---|---|---|---|---|
| (1) Excepción en la guarda para `/admin/clases/{claseId}…` sin sexto paso (N-01 de CLASES-a) | El admin entra sin que nadie resuelva la clase; cada handler tendría que comprobar que existe | Rutas duplicadas bajo `/admin` | **Relaja** la regla de `:claseId`: una excepción por prefijo es justo el hueco que CHORE-02 cerró | Vistas duplicadas o un prefijo de API por perspectiva |
| (2) Rutas duplicadas bajo `/admin/clases/{claseId}/…` con un séptimo tipo de pertenencia | Igual de segura | Cada handler del muro, alumnos y archivos, dos veces (14 rutas más) | Pide aceptar una marca nueva en la guarda | Igual que (1) |
| **(3) El sexto paso deja pasar al admin**; `requireRole` decide en qué rutas | Cada apertura es un cambio explícito en los `roles` de una ruta, con su prueba de autorización | Ninguna: un handler por ruta | **Sin cambios**: `guarda-de-rutas.ts` y `rutas-publicas.ts` no se tocan; las rutas `/api/admin/clases/:claseId…` ya pasan la regla de `:claseId` porque llevan el sexto paso, y sus dos primeros segmentos (`api`, `admin`) son literales | Las mismas vistas de `features/clases` con una perspectiva más |

**Decisión: (3).** Motivos: no relaja la guarda (cumple la fila de ESTADO §3 "la excepción de la guarda para el administrador no puede relajar la cobertura de toda ruta ni la regla de los dos primeros segmentos": no hay excepción), no duplica handlers ni vistas, y deja la autorización en un solo lugar.

**Cómo queda el sexto paso:**
- `relacionConClase(perfil, datos)` devuelve `"estudiante"` (inscrito), `"maestro"` (asignado en `maestros_de_clase`), `"admin"` (rol `admin` y la clase existe) o `null`.
- `requireMembership` (`"inscripcion"`) deja pasar cualquier relación no nula **admitida**; `requireOwnership` (`"propiedad"`) deja pasar `"maestro"` y `"admin"` **admitido**.
- Clase inexistente: `null` para todos, también para el admin: `403 SIN_ACCESO_A_LA_CLASE` (misma respuesta de hoy).
- **Cerrado por defecto (Enmienda 1, M-01):** la relación `"admin"` solo está **admitida** en las rutas cuyos `roles` incluyen `"admin"` de forma explícita. `protegido()` lo calcula al construir la cadena (`admiteAdmin = (opciones.roles ?? []).includes("admin")`) y se lo pasa al sexto paso: `requireMembership({ admiteAdmin })` y `requireOwnership({ admiteAdmin })` → `resolverClaseDeLaRuta(request, exigencia, admiteAdmin)` → `evaluarPertenencia(relacion, exigencia, admiteAdmin)` (core). En una ruta con `pertenencia` y **sin** `roles` (que deja pasar a cualquier rol en el paso 5), el admin recibe `403 SIN_ACCESO_A_LA_CLASE` en el sexto, como hoy. Un olvido falla cerrado, no abre nada, y no lanza: no cambia ninguna prueba existente que use `protegido({ pertenencia })` sin roles (la suite de la guarda de CHORE-02 incluida).
- Con roles explícitos, el paso 5 ya deja fuera al admin donde no está; el sexto lo repite por construcción. Las rutas existentes declaran hoy sus roles sin `admin`: ninguna se abre por accidente. La matriz de "Autorización" fija, ruta por ruta, cuáles se abren.
- Los handlers leen la relación con `claseDe(request).relacion` solo para decidir datos (por ejemplo, la firma); nunca para autorizar.

**Frontend:** las vistas de una clase siguen en `features/clases` y ganan la perspectiva `admin` (ruta `/admin/clases/:claseId`); la lista `/admin/clases` y crear clase también viven en `features/clases`. Así las claves de TanStack Query de las clases tienen un solo dueño y ningún módulo invalida las de otro (regla 9 de `CLAUDE.md`). `features/admin` no cambia. La fila `clases` de la tabla de módulos de `CLAUDE.md` suma al Administrador (texto en "Textos propuestos").

### 02a

#### §D-2A1 · Migración `clases_administradas` (una sola, compatible hacia atrás)
SQL esperado (el programador genera con `--create-only` y agrega a mano el bloque de datos al final):

```sql
CREATE TABLE "maestros_de_clase" (
    "clase_id" UUID NOT NULL,
    "maestro_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maestros_de_clase_pkey" PRIMARY KEY ("clase_id","maestro_id")
);
CREATE INDEX "maestros_de_clase_maestro_id_creado_en_clase_id_idx"
    ON "maestros_de_clase"("maestro_id", "creado_en" DESC, "clase_id" DESC);
CREATE INDEX "clases_creado_en_id_idx" ON "clases"("creado_en" DESC, "id" DESC);
ALTER TABLE "maestros_de_clase" ADD CONSTRAINT "maestros_de_clase_clase_id_fkey"
    FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maestros_de_clase" ADD CONSTRAINT "maestros_de_clase_maestro_id_fkey"
    FOREIGN KEY ("maestro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CLASES-02 · datos: una fila por clase existente, con la fecha de la clase, para que
-- GET /clases/impartidas conserve su orden. ON CONFLICT: la sentencia se puede repetir sin efecto.
INSERT INTO "maestros_de_clase" ("clase_id", "maestro_id", "creado_en")
SELECT "id", "maestro_id", "creado_en" FROM "clases"
ON CONFLICT DO NOTHING;
```

- Las cláusulas `ON UPDATE` y los nombres de restricción son los que genere Prisma (los de arriba son los que da hoy para el resto del esquema); cualquier otra diferencia es PA-03.
- **Nada más**: ni `DROP`, ni `ALTER` de columnas existentes, ni cambios en `usuarios`, `inscripciones`, `movimientos_inscripcion`, `publicaciones`, `comentarios` o `archivos`. `clases.maestro_id`, su FK y su índice `(maestro_id, creado_en DESC, id DESC)` se quedan (P-06 a).
- **Prisma:** modelo `MaestroDeClase` (`@@id([claseId, maestroId])`, `@@index([maestroId, creadoEn(sort: Desc), claseId(sort: Desc)])`, relación `clase` con `onDelete: Cascade` y `maestro` con `onDelete: Restrict`, relación nombrada `"AsignacionesDelMaestro"`), `Clase.maestros MaestroDeClase[]`, `Clase @@index([creadoEn(sort: Desc), id(sort: Desc)])`, `Usuario.asignacionesDeClase`.
- **`MovimientoInscripcion` (P-08 a), sin SQL:** el campo `maestroId` pasa a `actorId @map("maestro_id")`, la relación `maestro` a `actor` (relación `"MovimientosDelActor"`) y `Usuario.movimientosComoMaestro` a `movimientosComoActor`. El nombre de la FK en la base no cambia (`movimientos_inscripcion_maestro_id_fkey`); si `migrate diff` propone cualquier sentencia por esto, es PA-04.
- **Escritura doble de `clases.maestro_id`** (P-06 a): al crear, el primer maestro; al retirar al maestro que está en `maestro_id`, el primer maestro que queda (S-05), con `updateMany({ where: { id, maestroId: retirado }, data: { maestroId: restante } })` en la misma transacción. **Ningún código lee** `Clase.maestroId` ni la relación `Clase.maestro` (PA-14). El comentario del modelo lo dice.
- `campus_dev`: el programador aplica la migración con `npx prisma migrate dev` (A-2). La migración de datos se prueba con PR-2A02 contra la base desechable.

#### §D-2A2 · Sexto paso
- `adapters/db/clases.ts` · `buscarDatosDePertenencia(claseId, usuarioId)`: una consulta por PK de la clase con `maestros: { where: { maestroId: usuarioId } }` e `inscripciones: { where: { usuarioId } }` (a lo más una fila cada una, por sus PK). Devuelve `{ esMaestro, inscrito } | null`.
- `core/clases/pertenencia.ts`: `relacionConClase` y `evaluarPertenencia(relacion, exigencia, admiteAdmin)` como en §D-2.0. `DatosDePertenencia` pasa de `{ maestroId, inscrito }` a `{ esMaestro, inscrito }`.
- `middleware/pertenencia.ts`: `resolverClaseDeLaRuta(request, exigencia, admiteAdmin)` pasa el tercer argumento a `core/`; sin otra lógica.
- `middleware/require-membership.ts` y `require-ownership.ts` (Enmienda 1, A-1 ampliada): `requireMembership({ admiteAdmin }: { admiteAdmin: boolean })` y `requireOwnership({ admiteAdmin }: { admiteAdmin: boolean })`, sin valor por defecto; siguen siendo `function` con nombre y se siguen marcando en `index.ts` como hoy.
- `middleware/index.ts`: `pasoDePertenencia(opciones.pertenencia, admiteAdmin)` con `admiteAdmin` calculado de `roles` (§D-2.0). No lanza nada nuevo; el resto de la cadena, idéntico.
- `middleware/README.md`: la fila de `pertenencia` y la "Nota para ADMIN (N-01, R-08)" se reescriben (texto en "Textos propuestos").

#### §D-2A3 · Rutas de gestión del admin (archivo nuevo `handlers/clases/gestion.ts`, plugin `gestionDeClasesHandler`, registrado en `app.ts` con prefijo `/api`, después de `registrarMiddleware` como los demás)

| Método y ruta | Cadena | Cuerpo / consulta | Respuesta | Errores |
|---|---|---|---|---|
| `GET /api/admin/clases` | `protegido({ roles: ["admin"] })` | `paginacionSchema` (`cursor`, `limite`; el frontend pide 50) | `200 listaClasesAdminRespuestaSchema`: `{ clases: [{ id, nombre, maestros: [{ id, nombre }], alumnos, creadoEn }], total, siguienteCursor }` | `400 VALIDACION` (cursor que no es una clase: "cursor: no es válido", T-18) |
| `POST /api/admin/clases` | `protegido({ roles: ["admin"] })` | `crearClaseAdminSchema`: `{ nombre, descripcion?, maestroIds }` (1 o 2 UUID sin repetir); la descripción pasa por `normalizarTextoLargo` antes de validar | `201 claseRespuestaSchema` | `400 VALIDACION`; `404 MAESTRO_NO_ENCONTRADO` si algún id no es un maestro activo (nada se escribe); `500 CODIGO_NO_DISPONIBLE` (dos choques de código seguidos, como hoy) |
| `PUT /api/admin/clases/:claseId` | `protegido({ roles: ["admin"], pertenencia: "propiedad" })` | `editarClaseSchema` (`nombre`, `descripcion?`), normalizada antes de validar | `200 claseRespuestaSchema` | `400`, `403 SIN_ACCESO_A_LA_CLASE` (inexistente) |
| `POST /api/admin/clases/:claseId/maestros` | `protegido({ roles: ["admin"], pertenencia: "propiedad" })` | `asignarMaestroSchema`: `{ maestroId }` | `200 maestrosDeClaseRespuestaSchema`: `{ maestros: [{ id, nombre }] }` (1 o 2, en orden S-05). Idempotente: si ya estaba, la misma lista sin escribir | `404 MAESTRO_NO_ENCONTRADO`; `409 TOPE_DE_MAESTROS` ("La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.") |
| `DELETE /api/admin/clases/:claseId/maestros/:maestroId` | `protegido({ roles: ["admin"], pertenencia: "propiedad" })` | `maestroIdParamSchema` | `200 maestrosDeClaseRespuestaSchema`. Idempotente: si no estaba, la misma lista sin escribir | `409 CLASE_SIN_MAESTRO` ("Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.") |
| `GET /api/admin/maestros/candidatos?q=` | `protegido({ roles: ["admin"] })` | `busquedaCandidatosSchema` (el mismo de alumnos: de 3 a 120 normalizados, `limite` hasta 50, 20 por defecto) | `200 candidatosMaestroRespuestaSchema`: `{ candidatos: [{ id, nombre, email }], hayMas }` | `400 VALIDACION`, `400 BUSQUEDA_MUY_CORTA` |

- "Reasignar" es retirar uno y asignar otro (o al revés), sin ruta propia: con 1 maestro, se asigna el nuevo y se retira el anterior; con 2, se retira uno y se asigna el nuevo. La interfaz lo explica (§D-2C2).
- `/api/admin/maestros/candidatos` no choca con `POST /api/admin/maestros` ni con `POST /api/admin/maestros/lote` (otro método y otra ruta).
- `PUT /api/admin/clases/:claseId` y las dos de maestros llevan `pertenencia: "propiedad"`: la guarda lo exige por `:claseId` y el sexto paso resuelve que la clase existe; `roles: ["admin"]` deja fuera a los maestros.

#### §D-2A4 · Asignar y retirar maestros (concurrencia)
Una transacción por petición (`enTransaccion`), en READ COMMITTED, en `adapters/db/maestros-de-clase.ts` (nuevo):
1. **Bloqueo de la clase sin SQL crudo:** `clase.updateMany({ where: { id: claseId }, data: { actualizadoEn: new Date() } })`. Toma el candado de fila (`FOR NO KEY UPDATE`, porque `actualizado_en` no es columna de llave) y pone en serie las asignaciones y retiros simultáneos de la misma clase. `count = 0` (la clase se borró después del sexto paso): `403 SIN_ACCESO_A_LA_CLASE`. No choca con las FK de `inscripciones`, `publicaciones`, `archivos` ni `maestros_de_clase` (toman `FOR KEY SHARE`). No suma archivos a la lista de SQL etiquetado del caso E6 de `bloqueo-usuario.integracion.test.ts`.
2. Asignar: el maestro se lee por PK con `rol = 'maestro'` y `activo = true` (`null` → `404`); se leen los maestros actuales de la clase (PK, a lo más 2 filas); `decidirAsignacion` (core) → `"ya_asignado"` (sin escribir) o `"asignar"` (`create`) o lanza `409 TOPE_DE_MAESTROS`.
3. Retirar: se leen los actuales; `decidirRetiro` (core) → `"no_asignado"` (sin escribir), lanza `409 CLASE_SIN_MAESTRO` si es el único, o `{ restantes }` → `deleteMany` por PK y la escritura doble de §D-2A1.
4. Se devuelve la lista final (una lectura más, por PK de la clase). Un `P2028` responde `503 SERVICIO_OCUPADO` por `enTransaccion`.
5. Crear clase (`crearClaseAdministrada`): los maestros se validan con una lectura por PK (`id IN (…)`, rol y `activo`); si no son todos, `404` sin escribir. Después, un solo `clase.create` con `maestroId: maestroIds[0]` y `maestros: { create: […] }` (Prisma lo hace atómico), dentro de `conReintentoDeCodigo` como hoy. Entre la lectura y el `create` no hay ruta que cambie el rol o `activo` de un maestro (S-03; riesgo R-06).

#### §D-2A5 · Rutas existentes que cambian en 02a

| Ruta | Antes | Después |
|---|---|---|
| `POST /api/clases` | maestro crea | **Se retira** (`404` de Fastify) |
| `PUT /api/clases/:claseId` | maestro dueño edita | **Se retira**; la edición es `PUT /api/admin/clases/:claseId` |
| `GET /api/clases/:claseId` | estudiante, maestro · inscripcion | estudiante, maestro, **admin** · inscripcion. Respuesta con `maestros` |
| `GET` y `POST /api/clases/:claseId/codigo` | maestro · propiedad | maestro, **admin** · propiedad (P-04 a). `leerCodigo(claseId)` y `regenerarCodigo(claseId)` dejan de filtrar por `maestro_id` (§D-2A6) |
| `GET /api/clases/inscritas` | estudiante | Igual; cada clase lleva `maestros` (1 o 2) y conserva `maestro` |
| `GET /api/clases/impartidas` | maestro, por `clases.maestro_id` | Igual de roles; lee `maestros_de_clase` con el índice `(maestro_id, creado_en DESC, clase_id DESC)`; el cursor (un `claseId`) se comprueba por la PK `(clase_id, maestro_id)` |
| `GET /api/clases/:claseId/alumnos` | maestro · propiedad | maestro, **admin** · propiedad |
| `GET /api/clases/:claseId/alumnos/candidatos` | maestro · propiedad | maestro, **admin** · propiedad (enmascarado para los dos, P-05 a) |
| `POST /api/clases/:claseId/alumnos` | maestro · propiedad; movimiento con `maestroId` | maestro, **admin** · propiedad; movimiento con `actorId` = quien lo hizo |
| `DELETE /api/clases/:claseId/alumnos/:alumnoId` | ídem | ídem |

#### §D-2A6 · Respuestas y defensa extra
- `claseDetalleSchema` gana `maestros: z.array(maestroDeClaseSchema).min(1).max(2)` y conserva `maestro` (= `maestros[0]`), marcado en un comentario como campo de compatibilidad (P-06).
- `claseInscritaSchema` gana `maestros: z.array(z.object({ nombre })).min(1).max(2)` y conserva `maestro`.
- **La defensa extra de M-01 (CLASES-a), filtrar `editarClase`, `leerCodigo` y `regenerarCodigo` por `maestro_id`, se retira (con la autorización A-10):** con 1 o 2 maestros y el admin, repetirla en el adaptador sería una segunda implementación de la autorización. La única es el sexto paso (regla 2 de `AGENTS.md`). R-04.

#### §D-2A7 · Core de 02a
- `core/clases/maestros.ts` (nuevo, puro):
  - `decidirAsignacion(actuales: readonly string[], maestroId: string): "ya_asignado" | "asignar"`; lanza `AppError("TOPE_DE_MAESTROS", …, 409)` si `actuales.length >= MAXIMO_MAESTROS_POR_CLASE` y el maestro no está.
  - `decidirRetiro(actuales: readonly string[], maestroId: string): { tipo: "no_asignado" } | { tipo: "retirar"; restantes: string[] }`; lanza `AppError("CLASE_SIN_MAESTRO", …, 409)` si es el único. `restantes` conserva el orden recibido (S-05).
- `MAXIMO_MAESTROS_POR_CLASE = 2` vive en `shared/src/clases.ts` (lo usan el esquema y `core/`).

### 02b

#### §D-2B1 · Firma "Administración" (derivada al leer; nada se guarda)
- `shared/src/clases.ts`: `FIRMA_ADMINISTRACION = "Administración"`; `autorDelMuroSchema` pasa a `{ id: z.uuid(), nombre: z.string(), administracion: z.boolean() }` (obligatorio, sin `.default`: el backend lo manda siempre, como `adjuntos`).
- `core/autoria.ts` · `firmaDelAutor(autor: { id: string; nombre: string; rol: Rol }): { id: string; nombre: string; administracion: boolean }`: si el rol es `admin`, `nombre` = `FIRMA_ADMINISTRACION` y `administracion: true`; si no, el nombre de la persona y `false`. El rol nunca sale en la respuesta.
- `adapters/db/publicaciones.ts`: `SELECT_AUTOR` agrega `rol`. Los handlers del muro arman cada `autor` con `firmaDelAutor`, también al crear.
- Forma descartada: `autor: { tipo: "administracion" }` sin `nombre` ni `id`. Rompería el frontend anterior (que lee `autor.nombre`); con esta forma, el frontend anterior muestra "Administración" como nombre, que es correcto.

#### §D-2B2 · Regla general de autoría (`core/autoria.ts`, pura; la reutiliza TAREAS)
```ts
export interface ParticipanteDeAutoria { id: string; rol: Rol }
// P-01 (b): el admin borra todo; cada quien, lo suyo; el maestro, además, lo que escribió un
// estudiante (en una clase donde el sexto paso ya lo dejó pasar como maestro de la clase).
export const puedeBorrar = (actor: ParticipanteDeAutoria, autor: ParticipanteDeAutoria): boolean
```
- `actor.rol === "admin"` → `true`. `actor.id === autor.id` → `true`. `actor.rol === "maestro" && autor.rol === "estudiante"` → `true`. Todo lo demás → `false` (un maestro frente al admin o al otro maestro; un estudiante frente a cualquier otro).
- **Dónde se aplica:** dentro de la transacción del borrado, en el adaptador (§D-2B3), y por elemento en las listas (`puedeBorrar` en cada publicación y comentario), con el mismo `actor` = `{ id, rol }` del perfil. La interfaz no decide nada: solo muestra el botón si `puedeBorrar` es `true`.
- Se pasa siempre dentro de una ruta con sexto paso: que el maestro sea maestro **de esa clase** lo garantiza la cadena, no esta función.
- Con P-01 (a), se quita la tercera regla; con (c), la tercera pasa a `actor.rol === "maestro" && autor.rol !== "admin"`.

#### §D-2B3 · Borrado con autoría
- `borrarPublicacion({ claseId, publicacionId, actor })`, en una transacción: lee la publicación por `id` y `claseId` con `autor { id, rol }` (`null` → `"no_encontrada"`); si `!puedeBorrar(actor, autor)`, lanza `AppError("BORRADO_NO_PERMITIDO", "No puedes borrar lo que publicó otra persona.", 403)` sin escribir nada; si no, descarta los archivos y borra (como hoy), y `count = 0` → `"no_encontrada"`. La autoría no cambia nunca, así que leer y borrar en la misma transacción basta, sin candado.
- `borrarComentario({ claseId, publicacionId, comentarioId, actor })`: igual, con el comentario filtrado por `id`, `publicacionId` y la clase de la publicación.
- `borrarMiComentario` no cambia (compatibilidad; el frontend nuevo ya no lo usa).

| Ruta | Antes | Después |
|---|---|---|
| `GET /api/clases/:claseId/publicaciones` | estudiante, maestro · inscripcion | + **admin**. Cada publicación con `autor.administracion` y `puedeBorrar` |
| `POST /api/clases/:claseId/publicaciones` | maestro · propiedad | maestro, **admin** · propiedad. `autor` firmado; `puedeBorrar: true` |
| `DELETE /api/clases/:claseId/publicaciones/:publicacionId` | maestro · propiedad, cualquier publicación | maestro, **admin** · propiedad, con `puedeBorrar`: `204`, `403 BORRADO_NO_PERMITIDO` o `404 PUBLICACION_NO_ENCONTRADA` |
| `GET …/publicaciones/:publicacionId/comentarios` | estudiante, maestro · inscripcion | + **admin**. Cada comentario con `autor.administracion`, `propio` (como hoy) y `puedeBorrar` |
| `POST …/publicaciones/:publicacionId/comentarios` | estudiante, maestro · inscripcion | Igual (P-03 a: el admin no comenta) |
| `DELETE …/publicaciones/:publicacionId/comentarios/:comentarioId` | maestro · propiedad, cualquier comentario | estudiante, maestro, **admin** · inscripcion, con `puedeBorrar`: `204`, `403 BORRADO_NO_PERMITIDO` o `404 COMENTARIO_NO_ENCONTRADO` |
| `DELETE /api/clases/:claseId/mis-comentarios/:comentarioId` | estudiante, maestro · inscripcion, solo lo propio | Igual (compatibilidad, P-06) |
| `POST /api/clases/:claseId/archivos` | maestro · propiedad | maestro, **admin** · propiedad (`subido_por` = el admin; al publicar se confirma con `subidoPor = autorId`, como hoy) |
| `POST /api/clases/:claseId/archivos/:archivoId/descarga` | estudiante, maestro · inscripcion | + **admin** |
| `GET /api/clases/:claseId/personas` | estudiante, maestro · inscripcion; solo id y nombre | Igual de roles; `maestros` (1 o 2) y `alumnos` con `email`; conserva `maestro` (el principal, ahora con `email`) |

#### §D-2B4 · "Personas" con correo
- `shared/src/clases.ts`: `personaConCorreoSchema = { id, nombre, email }`; `personasRespuestaSchema` = `{ maestro: personaConCorreoSchema, maestros: z.array(personaConCorreoSchema).min(1).max(2), alumnos: z.array(personaConCorreoSchema), totalAlumnos, siguienteCursor }`. `personaDeClaseSchema` (sin correo) se queda para `agregarAlumnoRespuestaSchema`.
- `listarPersonas` selecciona `email` de maestros y alumnos; **nunca** `estadoPago` ni `accesoRestringido` (V-04).
- El buscador del maestro sigue enmascarado (`candidatoSchema` no cambia).

#### §D-2B5 · Trivial heredado
- **En 02a:** `conTextosNormalizados(cuerpo: unknown, campos: readonly string[]): unknown` se define en `core/clases/texto.ts` (misma lógica que la de `handlers/clases/muro.ts`), la usa `gestion.ts` para la descripción, y `conDescripcionNormalizada` desaparece de `handlers/clases/clases.ts` (ya no tiene uso al retirarse `POST` y `PUT`). `muro.ts` conserva su copia local en 02a.
- **En 02b:** `muro.ts` importa la de `core/` y borra su copia. Una sola definición al cerrar 02b (V-04).
- La sangría de `backend/src/handlers/README.md` se corrige al documentar `gestion.ts` (02a).

### 02c

#### §D-2C1 · Perspectiva de una clase
- `features/clases/lib.ts` · `perspectivaDeRuta(pathname: string): Perspectiva` (`"estudiante" | "maestro" | "admin"`, por el prefijo `/estudiante`, `/maestro` o `/admin`; el tipo en `types.ts`). Sustituye a `esDueno` (que hoy sale de `startsWith("/maestro")`) en `ClaseLayout`, `EncabezadoClase`, `SeccionesDeClase`, `MuroView`, `PublicacionDelMuro`, `ComentariosDePublicacion` y `AlumnosView`. Lo que decide cada perspectiva vive en `data.ts` como una tabla (`CAPACIDADES_POR_PERSPECTIVA`), no en condiciones sueltas:

| Capacidad | estudiante | maestro | admin |
|---|---|---|---|
| Base de las rutas | `/estudiante/clases/:id` | `/maestro/clases/:id` | `/admin/clases/:id` |
| "Volver" (destino y texto) | `/estudiante`, "Volver a mis clases" | `/maestro`, "Volver a mis clases" | `/admin/clases`, "Volver a la lista de clases" |
| Secciones | Muro, Personas | Muro, Alumnos | Muro, Alumnos, Maestros |
| Código de la clase (ver y regenerar) | no | sí | sí (P-04 a) |
| "Editar clase" | no | **no** (antes sí) | sí |
| Formulario de publicación | no | sí | sí |
| Formulario de comentario | sí | sí | no (P-03 a) |
| Botón de borrar | según `puedeBorrar` de cada elemento (las tres) | | |

- La interfaz solo decide **qué mostrar**; el backend ya decide qué se permite (§D-2.0). Ninguna capacidad sustituye una comprobación del backend.
- `SeccionesDeClase` pasa a N secciones (2 o 3): rejilla de `N` columnas y el indicador mide `1/N` y se traslada `100 %` por posición (`translate-x-full`, `translate-x-[200%]`), sin cambiar las reglas de §7.3. **En contexto opaco** (el admin) el indicador usa `--accent-soft` en vez de `--surface` (`in-data-[material=opaco]:bg-accent-soft`): sobre la superficie opaca, un indicador `--surface` sería invisible. El texto activo sigue en `--link` (9.1 sobre `--accent-soft`, par ya verificado en `DESIGN.md` §3).
- Encabezado: "Maestro: `<nombre>`" con uno, "Maestros: `<nombre>` y `<nombre>`" con dos (`textoDeMaestros(nombres)` en `lib.ts`).

#### §D-2C2 · Pantallas del admin (en `features/clases`, contexto opaco y denso de `ContenedorRol`)
- **`/admin/clases`** (`clases-admin-view.tsx`): `h1` "Clases"; "Crear clase" (`primary`, enlace a `/admin/clases/nueva`; la única acción principal); tabla `Table` (§7.9) con columnas "Clase", "Maestros" (nombres separados por coma), "Alumnos" (cifra a la derecha, `tabular-nums`), "Creada" (fecha corta) y "Acciones" ("Abrir" `outline` `sm`, enlace a `/admin/clases/:id`, con el nombre de la clase como texto `sr-only`, §7.9). "Cargar más clases" (`outline`, `enEspera`) con el criterio de foco de §7.14 (el mecanismo `useFocoAlCargarMas` de `hooks.ts`). Estados: error (`MensajeError` con `mensajeDeErrorDeLista`, incluido el `400` del cursor: "La lista cambió mientras la veías. Vuelve a abrirla para verla completa.") → cargando → vacío ("Aún no hay clases", acción `outline` "Crea la primera clase", PRD §7) → datos.
- **`/admin/clases/nueva`** (`crear-clase-view.tsx`, la de hoy, movida de `/maestro`): `FormularioClase` + `SelectorDeMaestros` (nuevo). El selector es el buscador de §7.17 en modo local: busca maestros (`GET /api/admin/maestros/candidatos`), cada resultado con nombre, **correo completo** y "Elegir" (`outline` `sm`, nombre `sr-only`); los elegidos se muestran en una lista con "Quitar" (`ghost` `sm`, nombre `sr-only`, foco de §7.14); con 2 elegidos, la búsqueda se oculta y una nota dice "Ya elegiste 2 maestros. Quita a uno para elegir a otro."; sin elegidos, al enviar, `ErrorDeCampo` "Elige al menos un maestro". Al crear, aviso "Clase creada" y navegación a `/admin/clases/:id`. `autoComplete="off"` en todos los campos (datos de otra persona, `CLAUDE.md`).
- **`/admin/clases/:claseId`** (`ClaseLayout` en perspectiva admin) con hijos: índice `MuroView`; `alumnos` `AlumnosView` (roster y buscador de hoy, sin cambios visibles); `maestros` `MaestrosDeClaseView` (nuevo); `editar` `EditarClaseView` (la de hoy, movida de `/maestro`).
- **`MaestrosDeClaseView`**: panel "Maestros de la clase" (`h2` con `tabIndex={-1}`) con la lista de los actuales (nombre y "Quitar" en cada uno, confirmación en línea de §7.14: "Dejará de ver la clase. Lo que publicó se queda en el muro.", "Sí, quitar" `destructive` `enEspera`, "Cancelar"); con un solo maestro, "Quitar" no se muestra y una nota dice "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este." (el backend lo niega de todas formas con `409`). Debajo, "Asignar maestro" con el mismo buscador ("Asignar a la clase", insignia `muted` "Ya da esta clase" si ya está); con 2 maestros, el buscador se oculta y una nota dice "La clase ya tiene 2 maestros. Quita a uno para asignar a otro.". Avisos: "Asignaste a `<nombre>`", "Quitaste a `<nombre>` de la clase"; los errores `409` muestran su mensaje del servidor en el aviso. Foco: §7.14 (fila que se borra; control que se vuelve no enfocable).
- El componente del buscador de maestros (`buscador-de-maestros.tsx`) es uno, con dos usos (elegir al crear y asignar en la clase) por props; no se generaliza `BuscadorAlumnos`.
- Dónde vive cada botón con petición en vuelo (Enmienda 1, C-20): "Cargar más clases" en `clases-admin-view.tsx`; "Asignar a la clase" en `buscador-de-maestros.tsx` (una sola expresión `enEspera`); "Sí, quitar" en `lista-maestros-de-clase.tsx`; "Crear clase" y "Guardar cambios" en `formulario-clase.tsx` (la de hoy). `tabla-clases-admin.tsx` y `firma-del-autor.tsx` no llevan `enEspera`.

#### §D-2C3 · El maestro
- Router: se retiran `/maestro/clases/nueva` y `/maestro/clases/:claseId/editar` (caen en el `*` → `/login`, como cualquier ruta desconocida; R-07).
- `InicioMaestroView`: sin tarjeta interna ni "Crear clase"; `siguientePasoSinClases` "La administración te asigna tus clases. Cuando lo haga, aparecerán aquí."; el vacío de "Mis clases" con la frase "La administración te asigna tus clases." y sin botón (`accionVacio` pasa a opcional en `PanelMisClases`). `TEXTOS_INICIO_MAESTRO.insignia` y `.crearClase` desaparecen.
- `EncabezadoClase`: sin "Editar clase" para el maestro; conserva el código.

#### §D-2C4 · Muro
- `PublicacionDelMuro` y `ComentariosDePublicacion`: "Borrar publicación" y "Borrar" salen de `puedeBorrar` (no de `esMaestro`). El borrado de comentarios usa siempre `DELETE …/publicaciones/:pid/comentarios/:cid` (`useBorrarComentario`); `useBorrarMiComentario` se retira del frontend.
- Firma: componente `FirmaDelAutor` (`features/clases/components/firma-del-autor.tsx`). Con `autor.administracion`, la insignia nueva `<Badge variant="institucional" icon={<Landmark aria-hidden="true" />}>Administración</Badge>` en lugar del nombre en negrita; si no, el nombre en negrita como hoy. El texto sale de `data.ts`; el frontend no usa `autor.nombre` para la firma del admin.
- `MuroView`: el formulario de publicación aparece en las perspectivas maestro y admin; vacío para el admin "Aún no hay publicaciones en esta clase.".
- `components/ui/badge.tsx`: variante `institucional` = `bg-accent-soft text-link` (9.1:1, par ya verificado en `DESIGN.md` §3). Es identidad institucional, no un estado: no se usa para nada más.

#### §D-2C5 · Triviales heredados (02c)
- `formulario-clase.tsx`: `useEditarClase` recibe el `claseId` al mutar (`mutate({ claseId, datos })`) y el `claseId ?? ""` desaparece; la descripción pasa por `normalizarTextoLargo` antes de validar con el esquema.
- "Ver más clases" (inicios y `PanelMisClases`): un `400 VALIDACION` del cursor muestra "Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas." (ESTADO §3), con `mensajeDeErrorDeLista`.
- `muro-view.test.tsx`: el `describe` que dice "Enmienda 8" pasa a "Enmienda 9".

### 02d

#### §D-2D1 · Lista de clases en la barra lateral (con P-02 A)
- **Datos:** `services/clasesService.ts` (nuevo) exporta las claves `CLAVE_CLASES_INSCRITAS` y `CLAVE_CLASES_IMPARTIDAS` (se mueven desde `features/clases/data.ts`, que las reexporta para no cambiar a nadie) y `consultaClasesDeLaBarra(rol)`: `GET /api/clases/inscritas?limite=100` (estudiante) o `/api/clases/impartidas?limite=100` (maestro), una sola página, con clave `[...CLAVE_CLASES_INSCRITAS, "barra"]` o `[...CLAVE_CLASES_IMPARTIDAS, "barra"]`. Así toda invalidación que ya hace `features/clases` (unirse, alta, baja) alcanza también la barra por prefijo, sin importar nada de `features/`.
- **Componente:** `components/layout/lista-de-clases.tsx` (`ListaDeClases`) con su hook en `components/layout/hooks.ts` (`useClasesDeLaBarra(rol)`); `BarraNavegacion` recibe `rol` y la monta debajo de los destinos solo para estudiante y maestro (P-07 a), solo desde 768 px (`hidden md:flex`).
- **Forma (A):** separador de 1 px en `--glass-border`, título visible "Mis clases" (`--text-caption` 700) y una `<ul aria-label="Mis clases">` con desplazamiento propio (`min-h-0 flex-1 overflow-y-auto` y `sin-sombra-de-vidrio`), dentro de la misma `nav`. Cada clase, un `NavLink` (sin `end`, así queda activo en cualquier página de la clase, con `aria-current="page"`) de 72 × 60 px, `--radius-row`: una insignia de 28 × 28 px con `inicialesDe(nombre)` (`--text-caption` 700, `aria-hidden`) en el color de su variante (verde `--brand`/`--brand-foreground`, azul `--accent`/`--accent-foreground`, blanca vidrio fuerte con `--foreground`), y el nombre debajo, en `--text-caption`, en una línea recortada (`truncate`), con `title` del nombre completo. El texto del enlace es el nombre completo: el recorte es solo visual. Activo e inactivo como los destinos (§7.4).
- `varianteDeClase` se mueve de `features/clases/lib.ts` a `lib/variante-de-clase.ts` (la usan la tarjeta y la barra: regla 5 de `CLAUDE.md`); `features/clases/lib.ts` la reexporta. El tipo `VarianteDeClase` (hoy en `features/clases/types.ts`) se mueve al mismo archivo, `lib/variante-de-clase.ts` (único lugar de su declaración; `lib/` no importa de `features/`), y `features/clases/types.ts` lo reexporta (Enmienda 1, detalle menor del manager). Las clases de color de la insignia van en `components/layout/data.ts` (`INSIGNIA_POR_VARIANTE`).
- **Estados**, en orden: error → un botón `ghost` "Reintentar" (icono `RotateCw`, con "No pudimos cargar tus clases." como texto `sr-only` antes) que vuelve a pedir la lista, con `enEspera` mientras pide (C-20); cargando → solo un `role="status"` `sr-only` "Cargando tus clases"; vacío → nada (ni título ni lista: el inicio ya tiene su vacío); datos → la lista. Con `siguienteCursor` distinto de `null` (más de 100), un último elemento "Ver todas" hacia el inicio.
- **Móvil:** la barra inferior de 64 px conserva solo los destinos; las clases están en las tarjetas del inicio.

#### §D-2D2 · "Personas" del alumno
`ListaPersonas` agrega el correo bajo el nombre (`--text-small`, `--muted-foreground`, `wrap-anywhere`; texto plano, sin `mailto:`). La sección de maestros lista 1 o 2 ("Maestro" o "Maestros"); el contador de alumnos sigue. Sin estado de pago ni restricción (el esquema no los trae).

#### §D-2D3 · "Tipo de publicación" como control segmentado (`DESIGN.md` §7.3)
- El grupo (`role="group"`, "Tipo de publicación") pasa a ser un contenedor de dos columnas con un indicador `aria-hidden` (`rounded-row`, `transition-transform duration-200 motion-reduce:transition-none`, `translate-x-full` con "Material") que se desliza bajo el botón presionado. Los botones conservan `aria-pressed`, el texto `--link` en el presionado y el `Check` delante del texto (el estado no depende del color ni solo de la posición).
- **Material del grupo dentro del formulario:** el formulario ya es un panel de vidrio (`Card`), así que el grupo va en **vidrio fuerte** (`vidrio-fuerte`, `rounded-card`, `p-1`; "Elemento sobre vidrio", §7.2) y no en otra `Card`; el indicador, en `--surface` (en contexto opaco, `--accent-soft`, como en §D-2C1). `DESIGN.md` §7.3 lo dice (texto en "Textos propuestos").

### §D-2R0 · Cambios de comportamiento que contradicen pruebas existentes (ronda 0 del tester)

| C-n | Sub | Cambio | Dónde buscar (no es lista cerrada: el tester busca y cita el C-n de cada caso) |
|---|---|---|---|
| C-1 | 02a | `POST /api/clases` ya no existe; las clases se crean con `POST /api/admin/clases` (admin, con `maestroIds`). Lo que esos casos protegen (validación de nombre y descripción, código único, Unicode, longitudes, ráfagas) se conserva contra la ruta nueva | `clases-r1`, `clases-r2`, `clases-r3`, `muro-c-r1` (backend) |
| C-2 | 02a | `PUT /api/clases/:claseId` ya no existe; la edición es `PUT /api/admin/clases/:claseId` (admin) | `clases-r1:237-251`, `clases-r3:266` |
| C-3 | 02a | El admin pasa el sexto paso: en las rutas de la matriz de "Autorización" que lo admiten responde `200` en lugar de `403 ROL_NO_PERMITIDO`; en las demás sigue `403` | `clases-r3:243` (el código ahora también sale al admin), `clases-r4:194` (comprobar: si la ruta es `inscritas` o `impartidas`, sigue igual) |
| C-4 | 02a | Las listas cerradas de rutas (`printRoutes`), tablas, modelos, migraciones o índices suman lo de §D-2A1 y §D-2A3 y pierden `POST /api/clases` y `PUT /api/clases/:claseId` | Toda `*.ataque` con listas cerradas; y en pruebas normales (regla de la Enmienda 7 de CLASES-01) |
| C-5 | 02a | Una clase creada directamente en la base sin fila en `maestros_de_clase` ya no tiene maestro: el maestro de `clases.maestro_id` recibe `403`. Las `*.ataque` que crean clases a mano (no con `crearClaseDePrueba`) deben crear también la asignación | `obtenerDb().clase.create(` en las `*.ataque` del backend |
| C-6 | 02a | `DatosDePertenencia` pasa a `{ esMaestro, inscrito }` y `RelacionConClase` suma `"admin"`; `MovimientoInscripcion.maestroId` pasa a `actorId` (solo TypeScript) | `*.ataque` que importen `core/clases/pertenencia` o lean `movimientoInscripcion` con `maestroId` |
| C-7 | 02a | `GET /clases/:claseId` e `inscritas` suman `maestros` (obligatorio en `claseDetalleSchema` y `claseInscritaSchema`); un caso que compare el objeto completo de la respuesta cambia, y **en el frontend** todo doble de `ClaseDetalle` o `ClaseInscrita` necesita `maestros` (si no, el esquema lo rechaza al leer y `tsc -b` falla) | Backend: `clases-r*`, `archivos-d-r*`. Frontend: dobles de clase en `clases-r*`, `inicio-sin-datos-r2`, `muro-*`, `alumnos-b-r*`, `archivos-d-r*`, `app/*.ataque` |
| C-8 | 02b | El maestro ya no borra cualquier publicación: solo las suyas; con P-01 (b), sí los comentarios de alumnos, nunca los del admin ni los del otro maestro | `muro-c-r1`, `muro-c-r2`, `logs-muro-c-r*` |
| C-9 | 02b | El admin entra al muro (leer, publicar, borrar) y a los archivos (subir, descargar) | `archivos-d-r1:878` ("admin no entra a ninguna"), `muro-c-r*` |
| C-10 | 02b | Publicaciones y comentarios suman `autor.administracion` y `puedeBorrar` (obligatorios). Un doble o una comparación de forma exacta cambia | Backend y frontend: dobles de publicación y comentario en las `*.ataque` (como C-21 de CLASES-d) |
| C-11 | 02b | "Personas" devuelve el correo completo de maestros y alumnos, y `maestros` (obligatorios en `personasRespuestaSchema`: en el frontend, los dobles de "Personas" los necesitan desde 02b, aunque la vista los muestre en 02d) | Backend: `alumnos-b-r*` (casos de "personas sin correo"), `logs-*`. Frontend: dobles de personas en `alumnos-b-r*` |
| C-12 | 02c | El maestro ya no tiene "Crear clase", "Editar clase", `/maestro/clases/nueva` ni `/maestro/clases/:id/editar`; su inicio no tiene tarjeta interna y su vacío no tiene botón | `clases-r1` a `clases-r4`, `rutas-clases-r1`, `inicio-sin-datos-r2`, `styles/clases-r1` (frontend) |
| C-13 | 02c | El botón de borrar sale de `puedeBorrar` y no del rol; el borrado de comentarios va siempre a la ruta general | `muro-c-r1` a `muro-c-r3`, `muro-rutas-c-r1`, `archivos-d-r*` (frontend) |
| C-14 | 02c | El admin tiene tres destinos ("Cuentas", "Maestros", "Clases"); `Destino` exige `coincidencia` y "Clases" queda activo en sus subrutas (Enmienda 1, M-04). Un doble o una lista de destinos sin `coincidencia` cambia | `marco-r1`, `components/layout/estatico-r1`, cualquier `*.ataque` que arme un `Destino` |
| C-15 | 02c | `TEXTOS_INICIO_MAESTRO.insignia` y `.crearClase` desaparecen; `accionVacio` es opcional | `vi.mock` con fábrica cerrada de `data.ts` o `hooks.ts` (C-19 de CLASES-01) |
| C-16 | 02d | La `nav` del estudiante y del maestro suma la lista de clases (más enlaces dentro de la `nav` desde 768 px; un `GET` más al montar el marco, que un doble de `fetch` que responde `/me` a cualquier ruta deja en estado de error) | `marco-r1`, `router.ataque`, `contexto-r1`, `sesion-r2`, `cache-03a-r1`, `registro-maestro-03b-r1` y cualquier `*.ataque` que cuente enlaces o peticiones, o que responda lo mismo a cualquier ruta, al montar un marco de rol |
| C-17 | 02d | "Personas" muestra el correo de maestros y compañeros | `alumnos-b-r*` (frontend) |
| C-18 | 02d | El grupo "Tipo de publicación" suma el indicador `aria-hidden` y cambia su material | `muro-c-r*`, `archivos-d-r*` (frontend) |
| C-19 | 02c | (Enmienda 1, M-03) `components/ui/badge.tsx` tiene cinco variantes: suma `institucional` (`bg-accent-soft text-link`), que no es un estado ni pinta rojo | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts:44-45` (lista exacta de cuatro variantes); lo que protege (cada variante con su par de tokens, sin rojo fuera de `danger`) se conserva |
| C-20 | 02c y 02d | (Enmienda 1, M-03) V-06 de `frontend/src/styles/clases-r1.ataque.test.ts` (`:126-212`): el total de `enEspera=` y la tabla `fijos` suman los botones nuevos con petición en vuelo, y la regla de "resto" admite sus archivos. Cifras que fija el plan (el programador las respeta y el tester las escribe en la ronda 0 de 02c): total **39** (36 + 3); `fijos` suma `features/clases/clases-admin-view.tsx`: 1 ("Cargar más clases"), `features/clases/components/lista-maestros-de-clase.tsx`: 1 ("Sí, quitar"), `features/clases/components/buscador-de-maestros.tsx`: 1 ("Asignar a la clase"; "Elegir" no espera nada y no lo lleva), y con 0 `features/clases/components/tabla-clases-admin.tsx` y `firma-del-autor.tsx`; `formulario-clase.tsx` sigue en 1 ("Crear clase" o "Guardar cambios"); el "resto" de `features/clases/components/` sigue en 3. En 02d el total pasa a **40**: "Reintentar" de la barra lleva `enEspera` mientras la consulta vuelve a pedir (TanStack Query conserva el estado de error durante el reintento, así que el botón sigue montado), y `components/layout/lista-de-clases.tsx` se agrega a `fijos` con 1 | `frontend/src/styles/clases-r1.ataque.test.ts` |
| C-21 | 02d | (Enmienda 1, M-03) V-07 de `styles/clases-r1` (`:233-242`): la lista exacta de `vidrio-fuerte` suma `components/layout/lista-de-clases.tsx` (insignia "blanca") y `features/clases/components/formulario-publicacion.tsx` (grupo del tipo); `vidrio`, `vidrio-azul` y `data-material` no cambian | `frontend/src/styles/clases-r1.ataque.test.ts` |
| C-22 | 02c | (Enmienda 1, M-03) La lista exacta de valores arbitrarios de maquetación suma `translate-x-[200%]` (indicador de la tercera sección, §D-2C1); `in-data-[material=opaco]` ya está | `frontend/src/components/layout/estatico-r1.ataque.test.ts:131-147` |

## Cambios por capa

### shared/
`shared/src/clases.ts` (único archivo de `shared/` que cambia):
- **02a:** `MAXIMO_MAESTROS_POR_CLASE = 2`; `maestroIdsSchema` (`z.array(z.uuid("maestroId: debe ser un identificador válido"), { error: "Elige al menos un maestro" })`, `.min(1, "Elige al menos un maestro")`, `.max(2, "Una clase puede tener hasta 2 maestros")`, sin repetidos: "No repitas un maestro"); `crearClaseAdminSchema = crearClaseSchema.extend({ maestroIds: maestroIdsSchema })`; `claseDetalleSchema` y `claseInscritaSchema` con `maestros` (§D-2A6); `claseAdminSchema` y `listaClasesAdminRespuestaSchema`; `asignarMaestroSchema` (`{ maestroId }`); `maestroIdParamSchema`; `maestrosDeClaseRespuestaSchema`; `candidatoMaestroSchema` (`{ id, nombre, email }`) y `candidatosMaestroRespuestaSchema`; `CODIGOS_CLASES` suma `MAESTRO_NO_ENCONTRADO`, `TOPE_DE_MAESTROS` y `CLASE_SIN_MAESTRO`; `descripcionClaseSchema` con `z.string({ error: "La descripción debe ser texto" })` (trivial). Tipos inferidos de cada esquema nuevo. `crearClaseSchema` y `editarClaseSchema` se conservan.
- **02b:** `FIRMA_ADMINISTRACION`; `autorDelMuroSchema` con `administracion`; `publicacionSchema` y `comentarioSchema` con `puedeBorrar: z.boolean()`; `personaConCorreoSchema`; `personasRespuestaSchema` (§D-2B4); `CODIGOS_CLASES.BORRADO_NO_PERMITIDO`.
- **`shared/src/index.ts` (Enmienda 2, A-11):** es la única entrada del paquete (`package.json` exporta solo `"."`) y reexporta `./clases.js` por nombre. **Regla general: cada subentrega agrega a `index.ts`, por nombre, las reexportaciones de lo que agrega a `clases.ts`**, sin tocar las existentes ni agregar archivos. En 02a: `MAXIMO_MAESTROS_POR_CLASE`, `maestroIdsSchema`, `crearClaseAdminSchema`, `asignarMaestroSchema`, `maestroIdParamSchema`, `claseAdminSchema`, `listaClasesAdminRespuestaSchema`, `maestrosDeClaseRespuestaSchema`, `candidatoMaestroSchema`, `candidatosMaestroRespuestaSchema` y sus tipos inferidos. En 02b: `FIRMA_ADMINISTRACION`, `personaConCorreoSchema` y su tipo, y cualquier otro símbolo nuevo de 02b.
- Ningún otro archivo de `shared/` cambia (`auth.ts`, `cuentas.ts`, `enlaces-registro.ts`, `archivos.ts` están en "No se toca").

### backend/core/ (puras, con pruebas unitarias)
| Archivo | Sub | Firma |
|---|---|---|
| `core/clases/pertenencia.ts` | 02a | `type RelacionConClase = "estudiante" \| "maestro" \| "admin"` · `interface DatosDePertenencia { esMaestro: boolean; inscrito: boolean }` · `relacionConClase(perfil: { id: string; rol: string }, datos: DatosDePertenencia \| null): RelacionConClase \| null` · `evaluarPertenencia(relacion, exigencia: "inscripcion" \| "propiedad", admiteAdmin: boolean): AppError \| null` (con `"admin"` y `admiteAdmin: false`, `403 SIN_ACCESO_A_LA_CLASE`) |
| `core/clases/maestros.ts` (nuevo) | 02a | `decidirAsignacion(actuales: readonly string[], maestroId: string): "ya_asignado" \| "asignar"` (lanza `409 TOPE_DE_MAESTROS`) · `decidirRetiro(actuales: readonly string[], maestroId: string): { tipo: "no_asignado" } \| { tipo: "retirar"; restantes: string[] }` (lanza `409 CLASE_SIN_MAESTRO`) |
| `core/clases/texto.ts` | 02a | `conTextosNormalizados(cuerpo: unknown, campos: readonly string[]): unknown` (§D-2B5) |
| `core/autoria.ts` (nuevo) | 02b | `interface ParticipanteDeAutoria { id: string; rol: Rol }` · `puedeBorrar(actor: ParticipanteDeAutoria, autor: ParticipanteDeAutoria): boolean` · `firmaDelAutor(autor: { id: string; nombre: string; rol: Rol }): { id: string; nombre: string; administracion: boolean }` |

### backend/adapters/
Solo `adapters/db/`:
- **02a** `clases.ts`: `ORDEN_DE_MAESTROS` (Enmienda 1): la **única** definición del orden S-05 (`[{ creadoEn: "asc" }, { maestroId: "asc" }]`), exportada y reutilizada por el detalle, `inscritas`, la lista del admin, `maestros-de-clase.ts` y, en 02b, `listarPersonas` de `inscripciones.ts`. Así `inscripciones.ts` no escribe ningún `orderBy … creadoEn` (la regla de `alumnos-b-r1:1106`, que protege que los movimientos se ordenen por `secuencia` y nunca por `creado_en`, sigue intacta y sin reescribirse); `buscarDatosDePertenencia` (§D-2A2); `ClaseDb` con `maestros: { id: string; nombre: string }[]` (orden S-05); `crearClaseAdministrada({ nombre, descripcion, maestroIds }, generarCodigo): Promise<ClaseDb | null>` (`null`: algún maestro no válido); `editarClase({ claseId, nombre, descripcion }): Promise<ClaseDb | null>`; `leerClase(claseId)`; `leerCodigo(claseId)`; `regenerarCodigo(claseId, generarCodigo)`; `listarClasesImpartidas` sobre `maestroDeClase`; `listarClasesInscritas` con `maestros`; `listarClasesAdmin({ cursor, limite })`. Se retira `crearClase` (la de maestro).
- **02a** `maestros-de-clase.ts` (nuevo): `asignarMaestro({ claseId, maestroId }): Promise<{ maestros } | null>` (`null`: no es un maestro activo); `retirarMaestro({ claseId, maestroId }): Promise<{ maestros }>`; `buscarMaestrosCandidatos({ termino, limite }): Promise<{ candidatos: { id; nombre; email }[]; hayMas }>` (mismo escape de comodines y la misma traducción del carácter nulo que `buscarCandidatos`). §D-2A4.
- **02a** `inscripciones.ts`: `agregarAlumnoManual` y `quitarAlumno` reciben `actorId` en lugar de `maestroId` y lo escriben en `actorId`.
- **02a** `index.ts`: exporta lo nuevo y deja de exportar `crearClase`.
- **02b** `publicaciones.ts`: `SELECT_AUTOR` con `rol`; `AutorDb` con `rol`; `borrarPublicacion` y `borrarComentario` con `actor` y `puedeBorrar` dentro de la transacción (§D-2B3); `borrarComentario` pasa a `enTransaccion`.
- **02b** `inscripciones.ts`: `listarPersonas` con `maestros` y correos (§D-2B4).
- Ningún archivo de `adapters/` fuera de `db/` cambia. Ningún `$queryRaw` nuevo.
- **02a y 02b** `backend/src/adapters/README.md` (Enmienda 1, M-06; lo edita el programador): secciones `db/clases.ts`, `db/inscripciones.ts` y la nueva `db/maestros-de-clase.ts` con los textos de "Textos propuestos". Tienen que seguir diciendo con exactitud qué función selecciona qué dato.

### backend/middleware/
- **02a** `middleware/index.ts`: `admiteAdmin` calculado de `roles` y pasado al sexto paso (§D-2.0, Enmienda 1). Nada lanza.
- **02a** `middleware/pertenencia.ts`: el tercer argumento `admiteAdmin` hacia `core/` (la lógica vive en `core/`).
- **02a** `middleware/require-membership.ts` y `require-ownership.ts`: reciben `{ admiteAdmin }` (§D-2A2).
- **02a** `middleware/README.md`: textos de "Textos propuestos".
- **No cambian:** `guarda-de-rutas.ts`, `rutas-publicas.ts`, `authenticate.ts`, `with-profile.ts`, `with-password-gate.ts`, `with-access.ts`, `require-role.ts`, `tipos.ts`.

### backend/handlers/ (ruta, método y cadena exacta en §D-2A3, §D-2A5 y §D-2B3)
- **02a** `handlers/clases/gestion.ts` (nuevo, `gestionDeClasesHandler`): las seis rutas de §D-2A3. Crea el código con el mismo `generarCodigo` de `clases.ts` (se exporta desde ahí o se mueve a una función compartida del handler; sin duplicar).
- **02a** `handlers/clases/clases.ts`: retira `POST /clases` y `PUT /clases/:claseId`; abre al admin el detalle y el código (§D-2A5).
- **02a** `handlers/clases/alumnos.ts`: abre al admin el roster, el buscador, el alta y la baja; `actorId: perfil.id`. Sigue sin leer `.rol`, `relacion`, `esDueno` ni comparar `maestroId` (regla de `alumnos-b-r1:1110-1111`, que no se reescribe), también en 02b.
- **02a** `app.ts`: una línea, `await app.register(gestionDeClasesHandler, { prefix: "/api" })`, junto a las demás de clases.
- **02a** `handlers/README.md`: `gestion.ts` y la sangría pendiente.
- **02b** `handlers/clases/muro.ts`: roles de §D-2B3, `firmaDelAutor` en cada autor, `puedeBorrar` por elemento, `actor` en los borrados, `conTextosNormalizados` de `core/`.
- **02b** `handlers/archivos.ts`: roles de §D-2B3.
- **02b** `handlers/clases/alumnos.ts`: "Personas" con correos.
- Ningún handler lleva `try/catch` nuevo ni verifica rol, propiedad, inscripción o autoría a mano: la autoría se decide en `core/autoria.ts` y se aplica en el adaptador.

### backend/workers/
Sin cambios. No hay eventos nuevos (S-10).

### backend/prisma/
- **02a:** migración `<timestamp>_clases_administradas` de §D-2A1 y el esquema de §D-2A1 (`MaestroDeClase`, `Clase.maestros`, índice de `clases`, renombres de TypeScript en `MovimientoInscripcion` y `Usuario`). El comentario del modelo `Clase` dice que `maestroId` es solo de escritura doble (P-06).
- 02b, 02c y 02d: sin migraciones.

### infra/ y .env.example
Sin cambios. Ninguna variable nueva.

### frontend/
**02c**
- `features/clases/types.ts`: `Perspectiva`; reexporta los tipos nuevos de `shared/` (`ClaseAdmin`, `ListaClasesAdminRespuesta`, `CandidatoMaestro`, `MaestrosDeClaseRespuesta`…).
- `features/clases/data.ts`: `CAPACIDADES_POR_PERSPECTIVA`; textos de "Textos de la interfaz"; claves `CLAVE_CLASES_ADMIN = ["clases", "admin"]`, `claveMaestrosCandidatos(termino)`; `LIMITE_CLASES_ADMIN = 50`; se retiran `TEXTOS_INICIO_MAESTRO.insignia`, `.crearClase` y `TEXTOS_PANEL.accionMaestro`.
- `features/clases/lib.ts`: `perspectivaDeRuta`, `textoDeMaestros`, `mensajeDeErrorClases` con los códigos nuevos (`TOPE_DE_MAESTROS`, `CLASE_SIN_MAESTRO`, `MAESTRO_NO_ENCONTRADO`, `BORRADO_NO_PERMITIDO`, todos con el mensaje del servidor).
- `features/clases/hooks.ts`: `useClasesAdmin` (infinita), `useCrearClase` (`POST /api/admin/clases`; invalida `CLAVE_CLASES_ADMIN`), `useEditarClase` (`PUT /api/admin/clases/:id`, recibe el id al mutar), `useCandidatosMaestro(termino)`, `useAsignarMaestro(claseId)`, `useRetirarMaestro(claseId)` (invalidan el detalle de la clase y `CLAVE_CLASES_ADMIN`); se retira `useBorrarMiComentario`. Sin tipos en este archivo.
- Vistas: `clases-admin-view.tsx` y `maestros-de-clase-view.tsx` (nuevas); `crear-clase-view.tsx`, `editar-clase-view.tsx`, `clase-layout.tsx`, `muro-view.tsx`, `alumnos-view.tsx`, `inicio-maestro-view.tsx` (cambian).
- Componentes: `buscador-de-maestros.tsx`, `tabla-clases-admin.tsx`, `lista-maestros-de-clase.tsx`, `firma-del-autor.tsx` (nuevos); `encabezado-clase.tsx`, `secciones-de-clase.tsx`, `publicacion-del-muro.tsx`, `comentarios-de-publicacion.tsx`, `formulario-clase.tsx`, `panel-mis-clases.tsx`, `tarjeta-clase.tsx` (solo si los metadatos lo piden) (cambian).
- `components/ui/badge.tsx`: variante `institucional`.
- `components/layout/data.ts`: el destino "Clases" del admin (`School`, `/admin/clases`, `coincidencia: "prefijo"`); los demás destinos declaran `coincidencia: "exacta"` (Enmienda 1, M-04).
- `components/layout/types.ts` (Enmienda 1, M-04): `Destino` gana `coincidencia: "exacta" | "prefijo"`, **obligatorio**, sin valor por defecto: cada destino dice si su enlace queda activo solo en su ruta exacta ("Inicio", "Cuentas" en `/admin`, "Maestros") o también en sus subrutas ("Clases": `/admin/clases`, `/admin/clases/nueva` y `/admin/clases/:id/…`).
- `components/layout/barra-navegacion.tsx` (Enmienda 1, M-04): `end={destino.coincidencia === "exacta"}` en lugar del `end` fijo. "Inicio" sigue sin marcarse dentro de una clase (§7.4, CLASES-a).
- `app/router.tsx`: rutas de §D-2C2 y §D-2C3.
- `docs/DESIGN.md`: textos de "Textos propuestos" (02c).

**02d**
- `services/clasesService.ts` (nuevo): claves y `consultaClasesDeLaBarra` (§D-2D1).
- `lib/variante-de-clase.ts` (nuevo): `varianteDeClase` movida; `features/clases/lib.ts` la reexporta.
- `components/layout/lista-de-clases.tsx` y `components/layout/hooks.ts` (nuevos); `barra-navegacion.tsx`, `contenedor-rol.tsx` (pasa `rol`), `data.ts` (`TEXTOS_MARCO.misClases` y demás textos de la lista, `INSIGNIA_POR_VARIANTE`), `types.ts` (si hace falta el tipo de la variante, reexportado de `lib/`).
- `features/clases/data.ts`: las dos claves pasan a reexportarse de `services/clasesService.ts`.
- `features/clases/components/lista-personas.tsx` y `personas-view.tsx`: correos y maestros (§D-2D2).
- `features/clases/components/formulario-publicacion.tsx`: §D-2D3.
- `docs/DESIGN.md`: textos de "Textos propuestos" (02d).

## Acceso a datos

| Consulta | Sub | Tablas | Índice | Paginación | Transacción |
|---|---|---|---|---|---|
| Sexto paso (`buscarDatosDePertenencia`) | 02a | `clases`, `maestros_de_clase`, `inscripciones` | PK de `clases`; PK `(clase_id, maestro_id)`; PK `(clase_id, usuario_id)` | — (a lo más 1 fila por relación) | No |
| Lista del admin | 02a | `clases` + `maestros_de_clase` + `usuarios` (nombre) + conteo de `inscripciones` con cuenta activa | **nuevo** `clases(creado_en DESC, id DESC)`; las relaciones por PK con `IN` (Prisma hace una consulta por relación para toda la página, no una por fila) | Cursor = id de la última clase; el cursor se lee antes por PK (`400` si no existe); 50 por página (máx. 100) | No. `total` es `COUNT(*)` de `clases` (decenas de filas en la fase experimental; R-08) |
| Crear clase | 02a | `usuarios` (validar maestros), `clases`, `maestros_de_clase` | PK de `usuarios` con `IN`; el único de `codigo_invitacion` | — | Un solo `create` anidado (atómico); reintento de código como hoy |
| Editar clase | 02a | `clases` | PK | — | No (un `update`) |
| Asignar o retirar maestro | 02a | `clases` (candado por `updateMany`), `usuarios` (validar), `maestros_de_clase` | PK de cada una | — (máx. 2 filas) | Sí, `enTransaccion` (§D-2A4) |
| Buscador de maestros | 02a | `usuarios` | GIN de trigramas sobre `nombre_busqueda` + filtro `rol`, `activo` (el mismo plan que el buscador de alumnos) | `limite + 1` (20 por defecto, máx. 50) | No |
| `GET /clases/impartidas` | 02a | `maestros_de_clase` + `clases` + conteo de `inscripciones` | `(maestro_id, creado_en DESC, clase_id DESC)`; cursor por PK `(clase_id, maestro_id)` | Cursor, 20 por defecto | No |
| `GET /clases/inscritas` | 02a | `inscripciones` + `clases` + `maestros_de_clase` + `usuarios` | El de hoy `(usuario_id, creado_en DESC, clase_id DESC)`; maestros por PK con `IN` | Cursor | No |
| Detalle de la clase | 02a | `clases` + `maestros_de_clase` + `usuarios` | PK | — | No |
| Alta y baja con movimiento | 02a | Como hoy, con `actorId` | Como hoy | — | Sí, como hoy (el movimiento es el último paso) |
| Muro y comentarios | 02b | Como hoy, más `usuarios.rol` en el `select` del autor (misma relación ya cargada) | Como hoy | Como hoy | No |
| Borrar publicación o comentario | 02b | `publicaciones` o `comentarios` + `usuarios` (rol del autor) + `archivos` | PK, filtrada por la clase | — | Sí (`enTransaccion`, §D-2B3) |
| "Personas" | 02b | Como hoy, más `usuarios.email` y `maestros_de_clase` | Como hoy; maestros por PK | Como hoy (conjunto de claves) | No |
| Barra lateral | 02d | Las de `inscritas` o `impartidas` | Las de arriba | Una página de 100 | No |

Ninguna consulta va dentro de un ciclo. Ningún SQL crudo nuevo.

## Autorización

Toda ruta pasa por la cadena completa de `protegido()`. "Sí" = `2xx` si el resto es válido; "403 rol" = `403 ROL_NO_PERMITIDO`; "403 clase" = `403 SIN_ACCESO_A_LA_CLASE`. Alumno restringido: `403 ACCESO_RESTRINGIDO` en todas (sin `permitirRestringido`); con cambio de contraseña pendiente: `403 CAMBIO_DE_CONTRASENA_REQUERIDO` en todas; sin token: `401`.

| Ruta | Estudiante inscrito | Estudiante no inscrito | Maestro de la clase | Maestro ajeno | Admin | Campos que se omiten |
|---|---|---|---|---|---|---|
| `GET /api/admin/clases` · `POST /api/admin/clases` · `GET /api/admin/maestros/candidatos` | 403 rol | 403 rol | 403 rol | 403 rol | Sí | — (el admin ve todo) |
| `PUT /api/admin/clases/:claseId` · `POST …/maestros` · `DELETE …/maestros/:maestroId` | 403 rol | 403 rol | 403 rol | 403 rol | Sí (clase inexistente: 403 clase) | — |
| `GET /api/clases/:claseId` | Sí | 403 clase | Sí | 403 clase | Sí | Código de invitación (como hoy) |
| `GET`/`POST /api/clases/:claseId/codigo` | 403 rol | 403 rol | Sí | 403 clase | Sí (P-04 a) | — |
| `GET /api/clases/:claseId/personas` | Sí | 403 clase | Sí | 403 clase | 403 rol | `estadoPago`, `accesoRestringido`, origen y fechas (con correo desde 02b) |
| `GET /api/clases/:claseId/alumnos` | 403 rol | 403 rol | Sí | 403 clase | Sí | — (roster completo) |
| `GET …/alumnos/candidatos` | 403 rol | 403 rol | Sí | 403 clase | Sí | Correo completo y estado de pago (enmascarado para los dos) |
| `POST …/alumnos` · `DELETE …/alumnos/:alumnoId` | 403 rol | 403 rol | Sí | 403 clase | Sí | `estadoPago`, `accesoRestringido`, correo (como hoy) |
| `GET …/publicaciones` · `GET …/comentarios` | Sí | 403 clase | Sí | 403 clase | Sí (02b) | El rol del autor; el nombre del admin (va "Administración") |
| `POST …/publicaciones` | 403 rol | 403 rol | Sí | 403 clase | Sí (02b) | ídem |
| `DELETE …/publicaciones/:publicacionId` | 403 rol | 403 rol | Solo las suyas (si no, 403 `BORRADO_NO_PERMITIDO`) | 403 clase | Todas (02b) | — |
| `POST …/comentarios` | Sí | 403 clase | Sí | 403 clase | 403 rol (P-03 a) | — |
| `DELETE …/comentarios/:comentarioId` | Solo los suyos | 403 clase | Los suyos y los de estudiantes (P-01 b); nunca los del admin ni del otro maestro | 403 clase | Todos (02b) | — |
| `DELETE /api/clases/:claseId/mis-comentarios/:comentarioId` | Solo los suyos (como hoy) | 403 clase | Solo los suyos (como hoy) | 403 clase | 403 rol | — |
| `POST /api/clases/:claseId/archivos` | 403 rol | 403 rol | Sí | 403 clase | Sí (02b) | Clave del objeto (como hoy) |
| `POST …/archivos/:archivoId/descarga` | Sí | 403 clase | Sí | 403 clase | Sí (02b) | ídem |
| `GET /api/clases/inscritas` · `POST /api/clases/unirse` | Sí | Sí | 403 rol | 403 rol | 403 rol | — |
| `GET /api/clases/impartidas` | 403 rol | 403 rol | Sí (sus clases, por `maestros_de_clase`) | — | 403 rol | — |
| `POST /api/clases` · `PUT /api/clases/:claseId` | **Ya no existen** (404 para cualquiera autenticado o no) | | | | | |

- **Estado de pago:** nunca a un estudiante (regla 3). Solo salen en el roster (`GET …/alumnos`), para el maestro de la clase y el admin. "Personas" gana el correo, **no** el estado de pago.
- **Correos:** el completo de un alumno sale en el roster (maestro y admin) y en "Personas" (alumnos inscritos y maestros de la clase); el de un maestro, en "Personas" y en el buscador de maestros (solo el admin); el del admin no sale en ninguna respuesta de clases.
- **Firma:** ninguna respuesta lleva el rol ni el nombre real del admin en el muro.

## Pruebas requeridas

Cada viñeta lleva su ID; el resumen del programador indica, junto a cada ID, el archivo y el título exacto del caso (`AGENTS.md`, "Resúmenes verificables del programador"). Las de integración corren contra el PostgreSQL desechable de Testcontainers.

### 02a
**Unitarias de `core/`**
- **PR-2A01** `relacionConClase`: estudiante inscrito → `"estudiante"`; estudiante no inscrito → `null`; maestro asignado → `"maestro"`; maestro no asignado → `null`; admin con clase → `"admin"`; admin sin clase (`datos = null`) → `null`; un rol desconocido → `null`; un maestro con `inscrito: true` (dato imposible) → `null`; un estudiante con `esMaestro: true` → `null`.
- **PR-2A02** `evaluarPertenencia`: con `admiteAdmin: true`, `"propiedad"` deja pasar `"maestro"` y `"admin"` y niega `"estudiante"` y `null`, e `"inscripcion"` deja pasar las tres y niega `null`; con `admiteAdmin: false`, las dos niegan `"admin"` y el resto queda igual; el error es siempre `403 SIN_ACCESO_A_LA_CLASE`.
- **PR-2A03** `decidirAsignacion`: con 0, 1 o 2 actuales; el maestro ya asignado (con 1 y con 2) → `"ya_asignado"`; nuevo con 2 → `409 TOPE_DE_MAESTROS`; nuevo con 1 → `"asignar"`.
- **PR-2A04** `decidirRetiro`: único → `409 CLASE_SIN_MAESTRO`; de dos → `restantes` con el otro, en el orden recibido; no asignado → `"no_asignado"`; lista vacía y maestro cualquiera → `"no_asignado"` (no lanza).
- **PR-2A05** `conTextosNormalizados`: CRLF y CR a LF y recorte en los campos pedidos; campos ausentes, no texto, `null` o un cuerpo que no es objeto se dejan intactos; no muta el objeto recibido.
- **PR-2A06** (Enmienda 1, M-01) Cerrado por defecto, con una app de prueba y rutas propias: `protegido({ pertenencia: "inscripcion" })` y `protegido({ pertenencia: "propiedad" })` **sin** roles → el admin recibe `403 SIN_ACCESO_A_LA_CLASE` sobre una clase que existe, y el estudiante inscrito y el maestro de la clase pasan como hoy; las mismas con `roles: ["admin"]` (o con `admin` entre otros roles) → el admin pasa (`200`); con `roles: ["estudiante", "maestro"]` → el admin `403 ROL_NO_PERMITIDO` en el paso 5. `protegido()` no lanza en ningún caso, y la cadena sigue con seis pasos en orden (el caso existente de orden sigue en verde).

**Integración: migración y modelo**
- **PR-2A07** (Enmienda 1, M-02) Migración de datos, **aislada de las demás clases de la base compartida**: la sentencia del bloque `-- CLASES-02 · datos` se lee tal cual del `migration.sql` de la migración (SQL fijo del repositorio, sin entrada de usuario) y se ejecuta dentro de **una transacción que se revierte al final** (lanzando un error centinela que el caso espera; mismo patrón que PR-B05 sobre una tabla temporal en CHORE-02). Dentro de ella, antes de ejecutarla:
  - `CREATE TEMP TABLE clases (id uuid PRIMARY KEY, maestro_id uuid NOT NULL, creado_en timestamptz(3) NOT NULL) ON COMMIT DROP` y `CREATE TEMP TABLE maestros_de_clase (clase_id uuid, maestro_id uuid, creado_en timestamptz(3) NOT NULL, PRIMARY KEY (clase_id, maestro_id)) ON COMMIT DROP`, **sin FK** (no tocan `usuarios`); `pg_temp` va primero en la ruta de búsqueda, así que la sentencia sin esquema lee y escribe estas tablas y no las de `public`;
  - precondición con aserción: `to_regclass('clases')` y `to_regclass('maestros_de_clase')` resuelven al esquema temporal (si no, el caso falla con un mensaje que lo diga; nunca un `return` temprano);
  - tres clases temporales, una de ellas ya con su fila en `maestros_de_clase`.
  Aserciones: después de ejecutarla, cada clase tiene exactamente una fila igual a `(id, maestro_id, creado_en)` de la clase y la que ya existía no se duplica; ejecutarla una segunda vez no cambia nada ni falla. Al revertir, nada queda (ni en las temporales ni en `public`). La sentencia del archivo no lleva esquema (`"maestros_de_clase"`, `"clases"`), como en §D-2A1.
- **PR-2A08** Después de `migrate deploy`, `maestros_de_clase` tiene la PK, el índice `(maestro_id, creado_en DESC, clase_id DESC)`, la FK a `clases` con `ON DELETE CASCADE` y la FK a `usuarios` con `ON DELETE RESTRICT`; `clases` tiene el índice `(creado_en DESC, id DESC)`; `clases.maestro_id` sigue `NOT NULL` (consultas a `pg_indexes` y `pg_constraint`, con los nombres de restricción del SQL).
- **PR-2A09** (Enmienda 1, M-02) `crearClaseDePrueba` (ayuda) crea la clase y su asignación (o sus dos asignaciones) en **un solo** `clase.create` anidado, sin ventana entre las dos: la asignación tiene la misma `creado_en` que la clase (las dos toman `now()` de la misma transacción) y `clases.maestro_id` es el primer maestro.

**Integración: rutas de gestión**
- **PR-2A10** `POST /api/admin/clases`: con 1 y con 2 maestros → `201`, la clase con `maestros` en orden S-05, `maestro` = el primero, `clases.maestro_id` = el primero, código de 7 caracteres; sin `maestroIds`, `[]`, 3 ids, ids repetidos, un id no UUID → `400` sin escribir; un id que es estudiante, admin, maestro inactivo o inexistente → `404 MAESTRO_NO_ENCONTRADO` sin escribir (ni clase ni asignaciones); nombre y descripción con las mismas reglas que tenía `POST /api/clases` (contenido visible, longitudes, CRLF normalizado antes de validar, descripción no texto → mensaje en español).
- **PR-2A11** `PUT /api/admin/clases/:claseId`: edita nombre y descripción y devuelve el detalle; clase inexistente → `403 SIN_ACCESO_A_LA_CLASE`; `:claseId` no UUID → `400`.
- **PR-2A12** `GET /api/admin/clases`: orden por `creado_en DESC, id DESC`; páginas de 50 sin repetidos ni huecos al recorrer todo; `maestros` (1 o 2) y `alumnos` (solo cuentas activas) por clase; `total`; cursor inexistente o que no es una clase → `400 VALIDACION` "cursor: no es válido"; `limite` 0, negativo, mayor de 100 o no numérico → `400`. (Que ninguna consulta vaya dentro de un ciclo lo comprueba V-04 y lo ataca el tester; no se mide aquí.)
- **PR-2A13** `POST …/maestros`: asigna el segundo → `200` con 2; repetir → `200` igual sin escribir; un tercero → `409 TOPE_DE_MAESTROS` sin escribir; estudiante, admin, inactivo o inexistente → `404`.
- **PR-2A14** `DELETE …/maestros/:maestroId`: de dos, retira uno → `200` con 1; el único → `409 CLASE_SIN_MAESTRO` sin escribir; uno no asignado → `200` igual; retirar al que está en `clases.maestro_id` lo cambia al que queda; retirar al otro no lo cambia.
- **PR-2A15** Concurrencia: (a) tres asignaciones simultáneas de tres maestros nuevos distintos a una clase con 1 → al final exactamente 2, **una `200` y dos `409`** (Enmienda 1, M-05), ninguna `500`; (b) dos retiros simultáneos de los dos maestros de una clase → al final 1, una respuesta `409`, ninguna `500`; (c) en las dos, `clases.maestro_id` termina apuntando a un maestro asignado.
- **PR-2A16** El maestro retirado pierde el acceso en la siguiente petición (`403 SIN_ACCESO_A_LA_CLASE` en el detalle, el muro y el roster) y sus publicaciones siguen en el muro; el maestro asignado gana el acceso en la siguiente petición; `GET /api/clases/impartidas` refleja los dos cambios.
- **PR-2A17** `GET /api/admin/maestros/candidatos`: solo maestros activos (nunca estudiantes ni el admin); correo completo; mínimo y máximo de la búsqueda y comodines escapados (`%`, `_`, `\`) como el buscador de alumnos; carácter nulo → `400`; `hayMas`.

**Integración: rutas existentes**
- **PR-2A18** `GET /api/clases/impartidas` con dos maestros: la clase aparece para los dos; orden por fecha de asignación; cursor de una clase que ya no es del maestro (retirado) → `400`; `total` correcto.
- **PR-2A19** `GET /api/clases/inscritas` y `GET /api/clases/:claseId`: `maestros` con 1 y con 2, en orden; `maestro` = el primero.
- **PR-2A20** Admin en las rutas existentes de 02a (detalle, código, regenerar, roster, candidatos, alta, baja): `200`; el alta y la baja del admin escriben un movimiento con `actorId` = el admin y su `secuencia` en orden; el buscador del admin devuelve el correo enmascarado.
- **PR-2A21** `POST /api/clases` y `PUT /api/clases/:claseId` responden `404` (también con token de maestro y de admin) y no escriben.

**Autorización por endpoint (02a)** — en cada ruta nueva o cambiada, cada fila de la matriz de "Autorización": sin token `401`; rol incorrecto `403 ROL_NO_PERMITIDO`; maestro ajeno `403 SIN_ACCESO_A_LA_CLASE`; estudiante no inscrito `403 SIN_ACCESO_A_LA_CLASE`; alumno restringido `403 ACCESO_RESTRINGIDO`; cambio de contraseña pendiente `403 CAMBIO_DE_CONTRASENA_REQUERIDO`; cuenta inactiva `401`; clase inexistente `403 SIN_ACCESO_A_LA_CLASE` (también para el admin); y que ninguna respuesta a un estudiante lleve `estadoPago` ni `accesoRestringido`.
- **PR-2A22** Rutas de gestión (las seis).
- **PR-2A23** Rutas existentes de 02a con el admin agregado (detalle, código ×2, roster, candidatos, alta, baja) y las que **no** se abren al admin (`personas`, `inscritas`, `impartidas`, `unirse`) siguen en `403 ROL_NO_PERMITIDO` para él.
- **PR-2A24** `printRoutes`: exactamente las rutas de V-06; `RUTAS_PUBLICAS` con las 10 de hoy; la API arranca sin tocar la guarda.

### 02b
**Unitarias de `core/`**
- **PR-2B01** `puedeBorrar` (P-01 b), tabla completa actor × autor con los tres roles: el admin, todo; cada quien, lo suyo; maestro frente a estudiante, `true`; maestro frente a otro maestro y frente al admin, `false`; estudiante frente a cualquier otro, `false`; ids iguales con roles distintos (dato imposible), `true` (manda la identidad).
- **PR-2B02** `firmaDelAutor`: admin → `{ id, nombre: "Administración", administracion: true }`; maestro y estudiante → su nombre y `false`; la salida no tiene la clave `rol`.

**Integración**
- **PR-2B03** Publicación del admin: `POST` (anuncio y material, con y sin adjuntos subidos por el admin) → `201`, `autor` = `{ id, nombre: "Administración", administracion: true }`, `puedeBorrar: true`; encola `PUBLICACION_CREADA` o `MATERIAL_CREADO` con solo ids, en la misma transacción (una transacción revertida no deja trabajo); el estudiante la ve con la misma firma y `puedeBorrar: false`; el maestro de la clase la ve con `puedeBorrar: false`.
- **PR-2B04** `DELETE` de publicaciones: el maestro borra la suya (`204`); la del otro maestro y la del admin → `403 BORRADO_NO_PERMITIDO` sin borrar nada (ni la publicación, ni sus comentarios, ni el estado de sus archivos); el admin borra la de cualquier maestro (`204`, con sus archivos a `descartado`); inexistente o de otra clase → `404`.
- **PR-2B05** `DELETE` de comentarios (ruta general): el estudiante borra el suyo y no el de otro (`403`); el maestro borra el suyo y el de un estudiante, y no el del otro maestro (`403`); el admin borra cualquiera; comentario de otra publicación o de otra clase → `404`. `mis-comentarios` sigue igual.
- **PR-2B06** `puedeBorrar` en las listas (`GET` de publicaciones y de comentarios) coincide, elemento por elemento, con lo que responde el `DELETE` correspondiente, para las tres perspectivas y con autores de los tres roles.
- **PR-2B07** Carrera: borrar la misma publicación dos veces a la vez (admin y maestro dueño) → una `204` y una `404`, ninguna `500`; los archivos quedan `descartado` una sola vez.
- **PR-2B08** "Personas": un alumno ve a los maestros (1 y 2) y a los compañeros con su correo completo; sin `estadoPago` ni `accesoRestringido` en ninguna parte de la respuesta (búsqueda de claves en profundidad), también con compañeros deudores y restringidos.
- **PR-2B09** Archivos del admin: solicita la subida y la descarga (`200`); publica con ellos; un archivo subido por el admin no lo puede confirmar un maestro en su publicación (`400 ARCHIVO_INVALIDO`, como entre dos maestros).

**Autorización por endpoint (02b)** — la misma lista de casos de 02a:
- **PR-2B10** Rutas del muro y de archivos con el admin agregado; `POST …/comentarios` sigue en `403 ROL_NO_PERMITIDO` para el admin; ninguna respuesta del muro lleva el rol del autor ni el nombre real del admin; ninguna respuesta a un estudiante lleva `estadoPago`.

### 02c
- **PR-2C01** `perspectivaDeRuta` y `CAPACIDADES_POR_PERSPECTIVA` (`lib.test.ts`): las tres perspectivas por su prefijo exacto (`/estudiante/…`, `/maestro/…`, `/admin/…`); un prefijo parecido (`/maestros`, `/administrador`, `/admin-x`) o cualquier otra ruta da `"estudiante"`, la perspectiva que menos muestra (el backend decide de todas formas); la tabla de capacidades de §D-2C1, celda por celda.
- **PR-2C02** `textoDeMaestros`: uno y dos nombres; nombres largos sin espacios.
- **PR-2C03** `/admin/clases`: error → cargando → vacío (con la acción "Crea la primera clase") → tabla; "Cargar más clases" con `enEspera` y el foco de §7.14; el `400` del cursor con su texto; "Abrir" lleva el nombre `sr-only`; una sola acción `primary`; el contenedor está en contexto opaco.
- **PR-2C04** Crear clase: sin maestros elegidos → `ErrorDeCampo` "Elige al menos un maestro" y no se pide nada; con uno y con dos; con dos, el buscador se oculta con su nota; "Quitar" y su foco; el cuerpo enviado lleva `maestroIds`; `404 MAESTRO_NO_ENCONTRADO` → aviso con el mensaje; campos con `autoComplete="off"`; la descripción se normaliza antes de validar.
- **PR-2C05** Editar clase (admin): carga los datos, guarda con `PUT /api/admin/clases/:id`; sin `claseId ?? ""` (el id llega al mutar).
- **PR-2C06** Maestros de la clase: con uno (sin "Quitar", con la nota), con dos (sin buscador, con la nota); asignar ("Asignaste a…", insignia "Ya da esta clase"); quitar con confirmación en línea y foco de §7.14; `409` de cada tipo → aviso con el mensaje del servidor.
- **PR-2C07** Perspectiva admin de una clase: "Volver a la lista de clases" hacia `/admin/clases`; secciones Muro, Alumnos y Maestros con el indicador en la activa y ninguno en "Editar clase"; el indicador lleva la variante de contexto opaco (`in-data-[material=opaco]:bg-accent-soft`; el indicador se localiza por su posición dentro de la lista nombrada "Secciones de la clase", nunca por una clase de estilo); código visible; sin formulario de comentario; con formulario de publicación.
- **PR-2C08** Maestro: el inicio no tiene "Crear clase" ni tarjeta interna; el vacío de "Mis clases" no tiene botón y dice que la administración asigna las clases; el encabezado no tiene "Editar clase"; `/maestro/clases/nueva` y `/maestro/clases/:id/editar` no existen.
- **PR-2C09** Muro: "Borrar publicación" y "Borrar" aparecen solo con `puedeBorrar: true`, en las tres perspectivas; la firma del admin muestra la insignia "Administración" con su icono y no el nombre; el borrado de un comentario usa la ruta general.
- **PR-2C10** Encabezado y tarjetas con uno y con dos maestros ("Maestro: …" y "Maestros: … y …").
- **PR-2C11** (Enmienda 1, M-04) Barra del admin con "Cuentas", "Maestros" y "Clases"; "Clases" con `aria-current="page"` en `/admin/clases`, `/admin/clases/nueva`, `/admin/clases/:id` y `/admin/clases/:id/maestros`; "Cuentas" **sin** `aria-current` en esas rutas (coincidencia exacta con `/admin`); "Inicio" del estudiante y del maestro sigue sin marcarse dentro de una clase; todo destino de `DESTINOS_POR_ROL` declara su `coincidencia` (lo exige el tipo).
- **PR-2C12** "Ver más clases" de los inicios: el `400` del cursor muestra "Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas.".

### 02d
- **PR-2D01** `ListaDeClases`: error ("Reintentar" vuelve a pedir) → cargando (`role="status"`) → vacío (nada en la `nav`) → datos; cada enlace con el nombre completo como nombre accesible y `title`, aunque se vea recortado; insignia con iniciales `aria-hidden`; `aria-current="page"` en el muro y en "Personas"/"Alumnos" de esa clase; "Ver todas" con más de 100; el admin no tiene lista.
- **PR-2D02** La lista pide `limite=100` a `inscritas` (estudiante) o a `impartidas` (maestro), y las invalidaciones que ya hace `features/clases` sobre `CLAVE_CLASES_INSCRITAS` y `CLAVE_CLASES_IMPARTIDAS` alcanzan su clave por prefijo (se comprueba que la consulta de la barra queda invalidada; al unirse a una clase, la clase nueva aparece en la barra).
- **PR-2D03** Por debajo de 768 px la lista no está en la barra inferior: la lista nombrada "Mis clases" (localizada por su nombre accesible) lleva `hidden md:flex` en su contenedor. jsdom no aplica medios: lo demás queda para la comprobación humana (H-4).
- **PR-2D04** "Personas": correo de cada maestro y compañero; "Maestro" o "Maestros"; sin estado de pago ni restricción en el DOM.
- **PR-2D05** "Tipo de publicación": `aria-pressed` y `Check` en el elegido; el indicador `aria-hidden` se traslada con "Material" y no tiene transición con `prefers-reduced-motion`; el grupo usa `vidrio-fuerte` (no una `Card`); el botón principal cambia de texto como hoy.
- **PR-2D06** `varianteDeClase` desde `lib/` da el mismo resultado que antes para los ids de las pruebas existentes.

### Pruebas: listas cerradas por subentrega (PA-16)
Archivos que el programador puede **crear** o **cambiar** en cada subentrega. "Cambiar" en un archivo existente de CLASES-01 o anterior significa: agregar casos y reescribir **solo** los casos que contradice un C-n (§D-2R0), citándolo en un comentario. Cualquier otro archivo de pruebas es PA-16.

**Dobles del frontend (02a y 02b):** los esquemas de `shared/` ganan campos obligatorios en 02a (`maestros` en el detalle y en `inscritas`) y en 02b (`autor.administracion`, `puedeBorrar`, y `maestros` y `email` en "Personas"). Además de las listas de abajo, el programador puede cambiar **cualquier prueba normal del frontend** cuyo doble de `ClaseDetalle`, `ClaseInscrita`, `PersonasRespuesta`, `Publicacion` o `Comentario` necesite esos campos, **solo para agregarlos** (sin tocar aserciones), y lo lista en su resumen archivo por archivo. Las `*.ataque` con esos dobles las adapta el tester en la ronda 0 (C-7, C-10, C-11).

| Sub | Crear | Cambiar |
|---|---|---|
| 02a | `backend/src/core/clases/maestros.test.ts`; `backend/src/handlers/validacion.test.ts` (arbitraje del manager, ronda 1 de 02a; T-01); `backend/test/gestion-clases.integracion.test.ts`; `backend/test/gestion-clases-autorizacion.integracion.test.ts`; `backend/test/migracion-maestros-de-clase.integracion.test.ts` | `backend/src/core/clases/texto.test.ts`; `backend/src/core/clases/pertenencia.test.ts`; `backend/src/middleware/index.test.ts`; `backend/test/ayudas-clases.ts`; `backend/test/clases.integracion.test.ts`; `backend/test/clases-autorizacion.integracion.test.ts`; `backend/test/alumnos.integracion.test.ts`; `backend/test/alumnos-autorizacion.integracion.test.ts`; `backend/test/movimientos-inscripcion.integracion.test.ts`; `backend/test/guarda-todas-las-rutas.integracion.test.ts`; `backend/test/middleware-orden.integracion.test.ts` (solo si lista rutas); las pruebas normales con listas cerradas que reporte la ronda 0 (I-2) |
| 02b | `backend/src/core/autoria.test.ts`; `backend/test/muro-admin.integracion.test.ts` | `backend/test/muro.integracion.test.ts`; `backend/test/muro-autorizacion.integracion.test.ts`; `backend/test/archivos.integracion.test.ts`; `backend/test/archivos-autorizacion.integracion.test.ts`; `backend/test/alumnos.integracion.test.ts`; `backend/test/ayudas-muro.ts` u otra ayuda del muro, si existe; las de I-2 |
| 02c | `frontend/src/features/clases/clases-admin-view.test.tsx`; `frontend/src/features/clases/maestros-de-clase-view.test.tsx`; `frontend/src/features/clases/crear-clase-view.test.tsx` | `features/clases/lib.test.ts`; `features/clases/components/formulario-clase.test.tsx`; `features/clases/clase-layout.test.tsx`; `features/clases/muro-view.test.tsx`; `features/clases/publicacion-del-muro.test.tsx`; `features/clases/inicio-maestro-view.test.tsx`; `features/clases/alumnos-view.test.tsx`; `features/clases/adjuntos-de-publicacion.test.tsx` (retira la prop `esMaestro`; Enmienda 1, M-03); `features/clases/inicio-estudiante-view.test.tsx` (PR-2C10; M-03); `components/ui/badge.test.tsx` (variante `institucional`; M-03); `app/router.test.tsx`; `app/marco.test.tsx`; `components/layout/contenedor-rol.test.tsx`; las de I-2 |
| 02d | `frontend/src/components/layout/lista-de-clases.test.tsx`; `frontend/src/lib/variante-de-clase.test.ts` | `features/clases/personas-view.test.tsx`; `features/clases/formulario-publicacion.test.tsx`; `features/clases/lib.test.ts`; `app/marco.test.tsx`; `components/layout/contenedor-rol.test.tsx`; **pruebas que montan el router completo y llegan a un marco de rol** (Enmienda 1, M-03): `app/router.test.tsx`, `features/auth/login-view.test.tsx`, `features/auth/registro-view.test.tsx`, `features/auth/registro-maestro-view.test.tsx` y `features/auth/cambio-de-identidad.test.tsx`, **solo** para que su doble de `fetch` responda la lista de la barra (`/api/clases/inscritas` o `/impartidas` con una lista válida) en lugar de devolver `/me` a cualquier ruta; sin tocar ninguna aserción; las de I-2 |

## Puntos de ataque para el Tester

PA-07 es regla permanente del tester (`.claude/agents/tester.md`). Este plan solo fija:
- **Lista de `P2028` permitidos (PA-07 c):** exactamente los de hoy: los dos de `backend/test/cuentas-r3.ataque.test.ts` (`POST /api/auth/login` sobre `tx.sesion.create` y `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`) y los tres deterministas de `backend/test/servicio-ocupado.integracion.test.ts` (`POST /api/auth/cambiar-contrasena`, `POST /api/auth/refrescar` y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios`), identificados por ruta y llamada. Ningún `P2028` de una ruta de CLASES-02 es permitido.
- **Inventario I-1 (PA-07 b):** la lista cerrada de `"Error no controlado"` sale de la corrida final de la ronda 0 de **cada** subentrega con backend (02a y 02b), por ruta y llamada; en 02c y 02d se usa la de 02b.
- **PA-12 y PA-13** de este plan ("PARADAS") también aplican al tester.
- **Hermanos (`AGENTS.md`):** al reportar un hallazgo, el tester nombra los hermanos que comparten el patrón (por ejemplo: las 6 rutas de gestión; las rutas abiertas al admin; los dos borrados con autoría; las tres perspectivas; los cuatro "Ver más"/"Cargar más"; los dos buscadores), para que el programador diga, uno por uno, si el remedio aplica.

### Ronda 0 (cada subentrega; no cuenta en el tope de 3)
1. **Precondiciones:** el árbol limpio dentro de los paquetes contra la base de la subentrega (`<R>` en 02a, `<K2a>` en 02b, `<K2b>` en 02c, `<K2c>` en 02d); V-01 contra la última tabla de hashes (en 02a, la de la ronda 6 de CHORE-02: 115 `*.ataque`); PA-01 antes de cualquier prueba del backend.
2. **Reescritura:** solo los casos que contradice un C-n de la subentrega (§D-2R0), conservando lo que protegen. Busca como mínimo, además de la columna "Dónde buscar":
   - `"/api/clases"` con `POST`, `` `/api/clases/${…}` `` con `PUT`, `crearClase(`, `obtenerDb().clase.create(`, `maestroId` en `movimientoInscripcion`, `relacionConClase`, `DatosDePertenencia` (02a);
   - `ROL_NO_PERMITIDO` junto a `admin` en las rutas de clases, muro y archivos (02a y 02b);
   - `printRoutes`, listas de tablas, modelos, migraciones e índices (02a);
   - dobles de publicación y comentario con forma completa, y casos de "personas sin correo" (02b, 02d);
   - `Crear clase`, `clases/nueva`, `Editar clase`, `/editar`, `esMaestro`, `mis-comentarios`, `DESTINOS_POR_ROL` y conteos de enlaces dentro de la `nav` (02c, 02d);
   - `vi.mock("./hooks"` y `vi.mock("../hooks"` (y de `data.ts`) con fábrica cerrada en las `*.ataque` que montan los inicios, `PanelMisClases`, el muro o el marco (02c, 02d);
   - en **pruebas normales**, las listas cerradas de archivos, tablas, rutas o SQL (regla de la Enmienda 7 de CLASES-01): el tester las reporta como **I-2** para que el programador las cambie con la autorización de la lista de PA-16 ("las de I-2").

   **Casos fuera del inventario:** si encuentras un caso contradicho que el plan no lista, lo reescribes igual y citas el C-n. Si ningún C-n lo contradice, es un hallazgo: no lo reescribes y lo reportas.
3. **Reporte:** en `reporte-tester.md`, "CLASES-02x — Ronda 0": el diff, la lista exacta de rojos esperados, I-1, I-2 y la tabla de hashes de todas las `*.ataque` (base de V-01 del programador). Formatea solo los archivos que tocaste, desde su paquete.

### 02a
1. **El admin y el sexto paso:** el admin en cada ruta de la matriz (las que se abren y las que no); una clase inexistente, con `:claseId` en mayúsculas, con espacios, con sufijos y en dos formatos; que ninguna ruta existente se haya abierto al admin por accidente (comparar la matriz con el código, ruta por ruta); `protegido()` con `pertenencia` y roles vacíos, ausentes, `undefined` explícito, un arreglo congelado, un arreglo mutado después de construir la cadena, o un rol `"admin"` con otra capitalización: el admin nunca debe pasar el sexto paso si `"admin"` no estaba en `roles` al construirla.
2. **La guarda sin excepción:** que no se haya agregado ninguna (diff vacío de `guarda-de-rutas.ts` y `rutas-publicas.ts`); que una ruta nueva bajo `/api/admin/clases/:claseId…` sin sexto paso no arranque; que un parámetro o un comodín en los **dos primeros** segmentos (`/api/:x/…`, `/:x/…`, `/api/*`) siga rechazándose. Una ruta con un parámetro en el tercer segmento, como `/api/admin/:x/…` (igual que `PUT /api/admin/usuarios/:id/correo`), **sí arranca** (regla de CHORE-02) y sigue pasando por `protegido()` completo con `roles: ["admin"]` (corrección de texto O-03).
3. **Tope y mínimo:** asignaciones y retiros simultáneos (2 a 10 en paralelo) con todas las combinaciones; asignar y retirar al mismo maestro a la vez; retirar a los dos de una clase en paralelo; asignar el mismo maestro dos veces en paralelo (PK); una clase con 0 maestros no debe poder existir por ningún camino de la API (crear con `maestroIds` manipulados, retirar en carrera).
4. **Escritura doble:** que `clases.maestro_id` siempre apunte a un maestro asignado después de cualquier secuencia de asignar y retirar; que ningún código lea `maestro_id` (si el tester cambia la columna a mano en la base desechable a un maestro no asignado, nada debe cambiar en las respuestas ni en el acceso).
5. **Datos de la migración:** clases con maestros inactivos, con muchos alumnos; la sentencia repetida; el orden de `impartidas` antes y después.
6. **Validación de crear:** `maestroIds` con ids de estudiantes, del admin, de inactivos, repetidos en mayúsculas y minúsculas, con 0, 3 o 100 elementos, como texto, como objeto; nombre y descripción con todo lo que ya se atacaba contra `POST /api/clases` (C-1).
7. **Buscador de maestros:** inyección y comodines, Unicode, límites, que no salgan estudiantes ni el admin, que el correo completo no salga en los logs.
8. **Movimientos:** alta y baja del admin con `actorId`; orden por `secuencia` mezclando admin y maestro en paralelo.
9. **Lista del admin:** paginación con cursor manipulado, de otra tabla (un id de usuario o de publicación), borrado; conteo de alumnos solo activos.

### 02b
1. **Autoría:** la tabla completa actor × autor contra la API, en publicaciones y comentarios, incluido el maestro de **otra** clase (debe ser `403 SIN_ACCESO_A_LA_CLASE`, no `BORRADO_NO_PERMITIDO`) y el maestro retirado; `puedeBorrar` de la lista contra el resultado real del `DELETE`.
2. **Firma:** que ninguna respuesta (lista, crear, comentarios, errores) lleve el nombre real, el correo o el rol del admin; que un maestro llamado "Administración" no reciba la insignia (`administracion: false`).
3. **Admin en el muro y los archivos:** publicar con archivos de otro (de un maestro), de otra clase, vencidos; subir y descargar en clases distintas.
4. **"Personas":** fuga de estado de pago o de restricción en cualquier forma (claves anidadas, `maestro` de compatibilidad); correos de alumnos de otra clase; un alumno retirado que pide "Personas".
5. **Carreras de borrado:** admin y maestro borrando a la vez; borrar una publicación mientras se comenta.
6. **Encolado:** publicaciones del admin revertidas no dejan trabajo; ids en los datos del trabajo, sin nombres.

### 02c
1. **Rutas de otro rol:** el maestro navegando a `/admin/clases…`, el admin a `/maestro/clases/:id`, el estudiante a `/admin/…`; las rutas retiradas del maestro.
2. **Perspectiva:** prefijos parecidos; capacidades que aparezcan en la perspectiva equivocada (formulario de comentario para el admin, "Editar clase" para el maestro).
3. **Formularios del admin:** doble envío; maestro elegido que desaparece de los resultados; tope de 2; errores `409` y `404` con su mensaje; `autoComplete`.
4. **Muro:** `puedeBorrar` falso con el rol que antes borraba; la insignia "Administración" sin color como único indicador; 360 px.
5. **Foco:** quitar al último elegido o al penúltimo maestro; "Cargar más clases" al cargar la última página.

### 02d
1. **Barra lateral:** 0, 1, 15 y 101 clases; nombres de 120 caracteres sin espacios y de emojis; foco con teclado dentro de la lista con desplazamiento; `aria-current` en las subpáginas; el admin sin lista; el refresco tras unirse, alta y baja; que la barra no pida la lista dos veces al navegar.
2. **"Personas":** correos largos a 360 px; sin datos de pago en el DOM.
3. **Control segmentado:** cambio rápido de tipo durante una publicación en vuelo; `prefers-reduced-motion`; contexto opaco del admin.

## Riesgos y desacuerdos

| ID | Riesgo o desacuerdo | Mitigación |
|---|---|---|
| R-01 | **Superficie del admin:** con la opción (3) de §D-2.0, una ruta futura que liste `admin` en sus roles por error le da acceso a cualquier clase | Cada apertura queda en la matriz de "Autorización" con su prueba; el admin solo pasa el sexto paso donde `roles` lo nombra (cerrado por defecto, Enmienda 1); la regla queda escrita en ESSENTIALS y en `middleware/README.md` |
| R-02 | **ARCHITECTURE §14 pide `RESTRICT` hacia `clases`** en `maestros_de_clase`; este plan propone `CASCADE` (P-09) | Decide el humano; es `ARCHITECTURE.md`, no ESSENTIALS. Con (b), la ayuda de pruebas borra las asignaciones antes que las clases |
| R-03 | **ESSENTIALS no cambia de decisión**, pero su viñeta de `requireMembership`/`requireOwnership` y la de "Autoría" se completan (textos propuestos). Ninguna decisión de ESSENTIALS se contradice | El orquestador aplica los textos con autorización del humano al cerrar 02a y 02b |
| R-04 | Se retira la defensa extra de M-01 (filtro por `maestro_id` en `editarClase`, `leerCodigo` y `regenerarCodigo`) | Necesita la autorización explícita **A-10** (Enmienda 1, M-07). La autorización vive solo en el sexto paso; PR-2A22 y PR-2A23 lo cubren; el tester lo ataca (02a, punto 1) |
| R-05 | **Despliegue escalonado:** campos nuevos obligatorios (`maestros`, `administracion`, `puedeBorrar`) exigen backend antes que frontend; el frontend anterior pierde "Crear clase" y "Editar clase" del maestro | S-13; la regla ya está en ESTADO §3 para DEPLOY |
| R-06 | Crear clase valida a los maestros fuera de la transacción del `create` anidado; un cambio de rol o de `activo` en medio no se detectaría | No existe ninguna ruta que cambie el rol o `activo` (S-03); cuando ADMIN agregue la baja de usuarios, su plan revisa este punto (fila de ESTADO §3) |
| R-07 | Las rutas retiradas del maestro caen en el `*` del router y mandan a `/login` (con sesión, `/login` redirige al inicio del rol) | Es el comportamiento de cualquier ruta desconocida hoy; no se agrega una pantalla de "ya no existe" |
| R-08 | `COUNT(*)` de `clases` sin filtro en la lista del admin | Decenas de filas en la fase experimental; si crece, el índice nuevo permite un conteo por índice. Se anota, no bloquea |
| R-09 | **Pruebas nuevas que escriben filas con FK a `usuarios`** (asignaciones, publicaciones del admin) pueden quedar detrás de los `LOCK TABLE usuarios` de las pruebas de bloqueo que corren en paralelo (CHORE-02) | Las pruebas nuevas no retienen bloqueos; un `P2028` en ellas es PA-07 y se reporta, no se repite la corrida (PA-12) |
| R-10 | Lección de CHORE-02: las reglas estáticas de texto generaron rondas en cadena | Este plan **no** agrega reglas estáticas en pruebas: las búsquedas de V-04 son verificación del manager, con su límite declarado (texto, no analizador) |
| R-11 | La lista de la barra y el inicio piden la misma información con claves distintas (dos peticiones al entrar al inicio) | Es una petición pequeña (`limite=100`) y cacheada; compartir la consulta infinita del inicio acoplaría el marco a `features/clases` |
| R-12 | Con P-02 (A), los nombres largos se recortan en la barra | Iniciales y color de la variante, `title` y nombre accesible completo; la comprobación humana H-3 lo mira |
| R-13 | El orden de los maestros (S-05) no es el que el admin eligió al crear (dos asignaciones en la misma transacción desempatan por id) | Solo afecta qué maestro va en el campo de compatibilidad y el orden de la lista; si el humano lo quiere por orden de elección, se agrega una columna en el retiro de compatibilidad |

### Textos propuestos para documentos (los aplica el orquestador al cerrar cada subentrega, con autorización del humano)

**Al cerrar 02a**

- `docs/ARCHITECTURE-ESSENTIALS.md`, "Autorización", la viñeta que empieza "`requireMembership`: estudiante inscrito…", queda:
  > - `requireMembership`: estudiante inscrito, cualquier maestro de la clase o el admin; `requireOwnership`: cualquier maestro de la clase (de uno a dos, en `maestros_de_clase`) o el admin; siempre sobre `:claseId`, con la misma respuesta para una clase inexistente y una ajena. El admin pasa el sexto paso en cualquier clase que exista, pero solo en las rutas cuyos `roles` lo nombran de forma explícita: en una ruta sin `roles`, el sexto paso lo niega (cerrado por defecto). La guarda de `:claseId` no tiene excepciones (CLASES-02).
- ESSENTIALS, "Restricciones clave": la parte de `maestros_de_clase` queda "`maestros_de_clase (clase_id, maestro_id)` PK, de uno a dos por clase, validado en `core/` dentro de la transacción, con la fila de la clase bloqueada (CLASES-02)".
- ESSENTIALS, "Reglas de negocio", viñeta "Alta manual", la última oración queda: "Cada alta manual y cada baja efectivas, del maestro o del admin, se registran en `movimientos_inscripcion` en la misma transacción, ordenadas por `secuencia`, con quién lo hizo en `maestro_id` (`actorId` en el código); la consulta es de ADMIN. El buscador del admin en una clase también enmascara."
- `docs/ARCHITECTURE.md` §6, fila 6 de la tabla, la oración que empieza "El administrador alcanza cualquier clase desde CLASES-02…" queda: "El administrador pasa el sexto paso en cualquier clase que exista (relación `admin`), solo en las rutas cuyos `roles` lo nombran de forma explícita; en una ruta con sexto paso y sin `roles`, se le niega (cerrado por defecto; CLASES-02)."
- ARCHITECTURE §6, la viñeta "Las rutas de clases del administrador (`/admin/clases/{claseId}…`…)" queda: "Las rutas de clases del administrador (`/api/admin/clases/:claseId…`) llevan el sexto paso como cualquier otra ruta con `:claseId`: la guarda no tiene excepciones (CLASES-02, que sustituye la excepción prevista en CLASES-a, N-01)."
- ARCHITECTURE §7, fila `clases`: se quitan `POST /clases` y `PUT` de `GET/PUT /clases/{claseId}`, y la nota "**CLASES-02 (decidido el 2026-10-02, rutas exactas en su plan)**…" se sustituye por: "Desde CLASES-02, las rutas del maestro aceptan a cualquier maestro de la clase y, donde la matriz del plan lo dice, al administrador: detalle, código, roster, buscador, alta y baja; el muro y los archivos desde 02b. `GET /clases/impartidas` lee `maestros_de_clase`."
- ARCHITECTURE §7, fila `admin`, la parte "clases (CLASES-02: …; rutas exactas en su plan)" queda: "clases (CLASES-02, plugin `handlers/clases/gestion.ts`: `GET/POST /admin/clases`, `PUT /admin/clases/{claseId}`, `POST /admin/clases/{claseId}/maestros`, `DELETE /admin/clases/{claseId}/maestros/{maestroId}`, `GET /admin/maestros/candidatos?q=`; el admin inscribe, publica y borra con las rutas de `clases`)".
- ARCHITECTURE §14, fila `clases`: "`codigo_invitacion` único (7 caracteres de un alfabeto sin I, O, 0 ni 1) · índice `(creado_en DESC, id DESC)` para la lista del admin (CLASES-02) · `maestro_id` se conserva `NOT NULL` y con su índice solo por compatibilidad: el código lo escribe (el primer maestro al crear; el que queda al retirar al que estaba ahí) y nunca lo lee; se retira en una migración posterior".
- ARCHITECTURE §14, fila `maestros_de_clase`: "PK `(clase_id, maestro_id)` · índice `(maestro_id, creado_en DESC, clase_id DESC)` para `GET /clases/impartidas` · FK a `clases` con `ON DELETE CASCADE` y a `usuarios` con `ON DELETE RESTRICT` (P-09) · de uno a dos maestros por clase: el tope y el mínimo se validan en `core/` dentro de la transacción que cambia la asignación, con la fila de la clase bloqueada (`UPDATE` de `actualizado_en`); solo escribe el administrador · orden de los maestros: `(creado_en, maestro_id)`".
- ARCHITECTURE §14, fila `movimientos_inscripcion`: la frase "la columna que guarda quién lo hizo admite al administrador (el plan decide si `maestro_id` se renombra; sería una migración compatible)" queda "la columna `maestro_id` guarda a quien lo hizo, maestro o administrador (`actorId` en el código; P-08 de CLASES-02)".
- `CLAUDE.md`, tabla de módulos: fila `clases` → Contenido: "Inicio de estudiante y maestro, muro con comentarios y adjuntos, código de invitación, compañeros, roster, buscador y alta manual de alumnos; gestión de clases del administrador (`/admin/clases`: lista, crear y editar clase, maestros de la clase, y alumnos y muro de cualquier clase)"; Roles: "Estudiante, Maestro, Administrador". Fila `admin` → Contenido: se quita "clases, " de "Dashboard institucional, usuarios, clases, analytics…".
- ARCHITECTURE §14, "Reglas de acceso a datos", viñeta de la búsqueda (Enmienda 1, M-06: se aplica al cerrar 02a, cuando nace la ruta): al final se agrega "El buscador de maestros del administrador (`GET /admin/maestros/candidatos`, CLASES-02) usa la misma normalización, el mismo índice y los mismos límites, solo sobre maestros activos, y muestra el correo completo (solo lo ve el administrador)."
- `backend/src/adapters/README.md` (lo edita el programador en 02a; Enmienda 1, M-06):
  - Sección `db/clases.ts`: la oración que empieza "`crearClase` y `regenerarCodigo` reciben un generador…" pasa a "`crearClaseAdministrada` y `regenerarCodigo` reciben un generador…" (el resto del párrafo del reintento, igual); se sustituye "`editarClase` y `regenerarCodigo` filtran por `id` **y** `maestro_id` (defensa extra, M-01)…`requireOwnership` ya lo hubiera negado antes." por "`editarClase`, `leerCodigo` y `regenerarCodigo` filtran solo por `id` desde CLASES-02 (A-10): la única autorización es el sexto paso, que deja pasar a los maestros de la clase y al administrador; repetirla aquí sería una segunda implementación. Si la clase ya no existe, devuelven `null` y el handler responde `403 SIN_ACCESO_A_LA_CLASE`."; y se agrega: "`buscarDatosDePertenencia` lee la clase por PK con `maestros_de_clase` e `inscripciones` filtradas por el usuario (a lo más una fila cada una). `crearClaseAdministrada` valida a los maestros (rol `maestro`, activos) y crea la clase con sus asignaciones en un solo `create` anidado. `clases.maestro_id` solo se **escribe** (el primer maestro al crear; el que queda al retirar al que estaba ahí): ningún código lo lee (P-06 de CLASES-02). `ORDEN_DE_MAESTROS` es la única definición del orden de los maestros de una clase."
  - Sección nueva `db/maestros-de-clase.ts` (CLASES-02, §D-2A4): "`asignarMaestro` y `retirarMaestro` corren en una transacción que primero bloquea la fila de la clase con un `updateMany` de `actualizado_en` (`FOR NO KEY UPDATE`, sin SQL crudo; no choca con los `FOR KEY SHARE` de las FK), después leen los maestros actuales y deciden con `core/clases/maestros.ts` (tope de 2, mínimo de 1). Retirar al maestro que está en `clases.maestro_id` lo reescribe con el que queda, en la misma transacción. `buscarMaestrosCandidatos` busca sobre `nombre_busqueda` con los comodines escapados, solo maestros activos, y selecciona el correo completo, que solo ve el administrador."
  - Sección `db/inscripciones.ts`: "`agregarAlumnoManual` y `quitarAlumno` reciben `actorId` (el maestro o el administrador que hizo el cambio) y lo escriben en `maestro_id` (`actorId` en Prisma)." La invariante de correos se reescribe en 02b (abajo); en 02a se agrega solo: "Desde CLASES-02a, `buscarMaestrosCandidatos` (`db/maestros-de-clase.ts`) también selecciona correos completos, de maestros, para el administrador."
- `backend/src/middleware/README.md`, fila `pertenencia`: "añade `requireMembership` o `requireOwnership` como sexto paso: resuelve la clase de `:claseId` y la relación del perfil con ella (`estudiante`, `maestro` o `admin`) y la deja en `request.clase`. `"inscripcion"` deja pasar las tres; `"propiedad"`, al maestro de la clase y al admin. El admin pasa en cualquier clase que exista, pero solo si `roles` incluye `"admin"` de forma explícita: `protegido()` calcula `admiteAdmin` de `roles` y se lo pasa al sexto paso; en una ruta con `pertenencia` y sin `roles`, el admin recibe `403 SIN_ACCESO_A_LA_CLASE` (cerrado por defecto). Una clase inexistente y una ajena responden lo mismo: `403 SIN_ACCESO_A_LA_CLASE`." La "Nota para ADMIN (N-01, R-08)" se sustituye por: "**CLASES-02:** las rutas `/api/admin/clases/:claseId…` llevan el sexto paso y pasan la regla sin excepción."
- ESTADO §3 (el orquestador): fila nueva "Retiro de compatibilidad de CLASES-02: `clases.maestro_id`, el campo `maestro` de las respuestas de clase y de personas, y `DELETE /clases/{claseId}/mis-comentarios/{comentarioId}`" con destino "Antes del primer DEPLOY o, si ya ocurrió, cuando CLASES-02 esté en `prod`"; fila nueva "R-06 de CLASES-02: al agregar la baja de usuarios o el cambio de rol, revisar la validación de maestros al crear una clase" con destino ADMIN; se cierran la fila de la excepción de la guarda (no hizo falta) y la de M-20.

**Al cerrar 02b**
- ESSENTIALS, "Reglas de negocio", viñeta "Autoría": después de "el admin borra cualquier publicación o comentario de cualquier clase." se agrega "Un maestro borra además los comentarios de los alumnos de sus clases (moderación), nunca lo del otro maestro (P-01 de CLASES-02). La regla vive en `core/autoria.ts` (`puedeBorrar`) y se aplica dentro de la transacción del borrado; las listas devuelven `puedeBorrar` por elemento."
- `docs/PRD.md`, RN-07: después de "Cada autor borra solo lo suyo." se agrega "El maestro también borra los comentarios de los alumnos en las clases que imparte; nunca lo que publicó otro maestro de la clase (CLASES-02)."
- ARCHITECTURE §7, fila `archivos`: sin cambios (ya dice "y, desde CLASES-02, el administrador").
- ARCHITECTURE §14, fila `publicaciones`: se conserva; se agrega "· el autor sale como `{ id, nombre, administracion }`: con `administracion: true`, `nombre` es "Administración"; el rol nunca sale".
- ARCHITECTURE §14, "Reglas de acceso a datos", viñeta de la búsqueda (la parte del buscador de maestros ya se aplicó al cerrar 02a): la oración "el completo solo en el roster de la clase (sus maestros y el administrador) y, desde CLASES-02, en "Personas" del alumno inscrito" queda "el completo solo en el roster de la clase (sus maestros y el administrador) y en "Personas" del alumno inscrito y de los maestros de la clase".
- `backend/src/adapters/README.md` (lo edita el programador en 02b; Enmienda 1, M-06), sección `db/inscripciones.ts`, la oración de la invariante queda: "`listarAlumnosDeClase` es la **única** función que selecciona el estado de pago y la restricción de acceso de un alumno (RN-02), y la única que selecciona el correo completo **junto con** esos datos. `listarPersonas` selecciona id, nombre y correo de los maestros y de los alumnos de la clase (CLASES-02, RF-19), nunca el estado de pago ni la restricción. Fuera de este archivo, también seleccionan correos `buscarMaestrosCandidatos` (`db/maestros-de-clase.ts`, solo maestros, para el admin) y las funciones de cuentas de AUTH." El orden de los maestros sale de `ORDEN_DE_MAESTROS` (`db/clases.ts`).
- `backend/src/adapters/README.md`, sección `db/publicaciones.ts` (02b): agregar "El autor se selecciona con su `rol` solo para dos cosas: `firmaDelAutor` (la firma "Administración") y `puedeBorrar` (`core/autoria.ts`), que se aplica dentro de la transacción de `borrarPublicacion` y `borrarComentario` (leer la autoría y borrar en la misma transacción, sin candado: la autoría no cambia). El rol no sale en ninguna respuesta."

**Al cerrar 02c**
- `CLAUDE.md`, "Ubicaciones compartidas": nada (lo nuevo de 02c vive en `features/clases`).
- `docs/DESIGN.md` lo edita el programador (abajo); el manager lo verifica.

**Al cerrar 02d**
- ESSENTIALS, "Interfaz", la última viñeta queda: "Barra lateral con la lista de clases del usuario (estudiante y maestro): las primeras visibles y desplazamiento para el resto, cada una con una insignia de iniciales en el color de su tarjeta y el nombre recortado; en móvil no se muestra. El admin tiene el destino "Clases" (CLASES-02)." (con P-02 A).
- ESTADO §3 (el orquestador): se cierran la fila de la contradicción entre PRD §7 y `DESIGN.md` §7.4 (R-01 de DESIGN-01) y la del grupo "Tipo de publicación".
- `README.md`: sin cambios en todo el encargo (ningún comando cambia).
- `CLAUDE.md`, "Ubicaciones compartidas": en `components/layout/`, agregar "y la lista de clases de la barra (`ListaDeClases`, con su hook en `components/layout/hooks.ts`)"; en `services/`, agregar "`services/clasesService.ts` — las claves de las listas de clases y la consulta de la barra lateral, compartidas por `components/layout` y `features/clases`"; en `lib/`, agregar "`lib/variante-de-clase.ts` — `varianteDeClase`, la variante de color de una clase (tarjeta y barra)".

**`docs/DESIGN.md` (lo edita el programador en cada subentrega, con la marca "propuesta (CLASES-02x)")**
- **02c** §7.1, tabla de alcance: en "Pantallas de trabajo", quitar `/maestro/clases/nueva`; en "Gradebook y todas las vistas del administrador", agregar `/admin/clases`, `/admin/clases/nueva` y `/admin/clases/*`.
- **02c** §7.3, regla del control segmentado: agregar "En contexto opaco (`data-material="opaco"`), el indicador usa `--accent-soft` en vez de `--surface` (9.1 con `--link`), porque sobre `--surface` no se vería. Con tres opciones, el indicador mide un tercio y se traslada una posición por opción."
- **02c** §7.5, "Implementación (CLASES-a…)": "La tarjeta interna lleva el formulario de unirse (estudiante). El maestro no tiene tarjeta interna desde CLASES-02: no crea clases."
- **02c** §7.6, "Implementación": "Metadatos para el estudiante: el maestro o los dos maestros ("Dra. Márquez y Mtro. Ruiz")."
- **02c** §7.8: fila nueva de la tabla "Administración (firma) · institucional · "Administración" · `Landmark`", con la nota: "La variante `institucional` (`--accent-soft` de fondo y `--link` de texto, 9.1) no es un estado: solo firma lo que publica la administración."
- **02c** §7.9, "Implementación": "Cargar más" pasa a usarse también en `/admin/clases`; columnas de la tabla de clases.
- **02c** §7.10: el vacío del maestro sin acción ("La administración te asigna tus clases."); el del admin en `/admin/clases`, "Aún no hay clases" con "Crea la primera clase" en `outline` (la vista ya tiene "Crear clase" en `primary`).
- **02c** §7.16: las tres perspectivas y sus secciones (Muro y Personas; Muro y Alumnos; Muro, Alumnos y Maestros), quién ve el código (maestro y admin) y "Editar clase" (solo el admin), y "Volver a la lista de clases" para el admin; se reescribe la oración "Quien puede ver el código y editar la clase es el maestro dueño…".
- **02c** §7.17: el buscador de maestros del admin (correo completo, "Elegir" o "Asignar a la clase", "Ya da esta clase", tope de 2 con su nota).
- **02c** §7.18: "Borrar publicación" y "Borrar" aparecen según `puedeBorrar`, que manda el servidor; la firma del admin es la insignia `institucional` "Administración" con `Landmark` en lugar del nombre en negrita.
- **02d** §7.2, "Lista de compañeros": el correo bajo el nombre, en `--text-small` y `--muted-foreground`.
- **02d** §7.3: se retira la oración "Pendiente de decisión del humano: si el grupo "Tipo de publicación"… queda fuera de ella" y la viñeta "Grupo de dos botones para elegir un tipo" queda: "…un `<div role="group">` con nombre accesible ("Tipo de publicación") en vidrio fuerte (va dentro del panel del formulario), con un indicador que se desliza bajo el botón presionado (regla del control segmentado); cada botón con `aria-pressed`, y el presionado con texto `--link` y un `Check` delante del texto…"
- **02c** §7.4 (Enmienda 1, M-04): la línea "Destinos de hoy" suma "Clases" del admin y la regla "Cada destino declara si queda activo solo en su ruta exacta o también en sus subrutas; 'Clases' del admin, en sus subrutas; los demás, solo en la exacta".
- **02d** §7.4: se sustituye la viñeta "CLASES-a, R-01 de DESIGN-01…" por la descripción de §D-2D1 (lista "Mis clases", insignia de iniciales, recorte, `title`, `aria-current` sin `end`, desplazamiento propio con `sin-sombra-de-vidrio`, oculta por debajo de 768 px, sin lista para el admin).

### Textos de la interfaz (propuesta; viven en `data.ts`)
| Dónde | Texto |
|---|---|
| Lista del admin | `h1` "Clases" · "Crear clase" · columnas "Clase", "Maestros", "Alumnos", "Creada", "Acciones" · "Abrir" · "Cargar más clases" · vacío "Aún no hay clases" con "Crea la primera clase" · error "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo." · cursor "La lista cambió mientras la veías. Vuelve a abrirla para verla completa." |
| Crear clase (admin) | Campo "Maestros de la clase" · ayuda "Elige uno o dos maestros." · buscador "Buscar maestro por nombre" · ayuda "Escribe al menos 3 letras." · "Elegir" · "Quitar" · nota "Ya elegiste 2 maestros. Quita a uno para elegir a otro." · error "Elige al menos un maestro" · sin resultados "No encontramos maestros con ese nombre. Solo aparecen maestros con cuenta." · "Hay más resultados: escribe más del nombre." · aviso "Clase creada" |
| Maestros de la clase | `h2` "Maestros de la clase" · "Quitar" · consecuencia "Dejará de ver la clase. Lo que publicó se queda en el muro." · "Sí, quitar" · "Cancelar" · nota "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este." · "Asignar maestro" · "Asignar a la clase" · insignia "Ya da esta clase" · nota "La clase ya tiene 2 maestros. Quita a uno para asignar a otro." · avisos "Asignaste a `<nombre>`" y "Quitaste a `<nombre>` de la clase" |
| Clase (admin) | "Volver a la lista de clases" · sección "Maestros" · muro vacío "Aún no hay publicaciones en esta clase." |
| Encabezado | "Maestro: `<nombre>`" · "Maestros: `<nombre>` y `<nombre>`" |
| Inicio del maestro | `siguientePasoSinClases` "La administración te asigna tus clases. Cuando lo haga, aparecerán aquí." · vacío "Aún no tienes clases" con la frase "La administración te asigna tus clases." |
| Muro | Insignia "Administración" |
| "Ver más clases" | Cursor "Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas." |
| Barra lateral | Título "Mis clases" · "Ver todas" · "Reintentar" (con "No pudimos cargar tus clases." `sr-only`) · "Cargando tus clases" (`sr-only`) · destino del admin "Clases" |
| "Personas" | "Maestro" / "Maestros" |
| Errores del servidor (`shared` y backend) | `TOPE_DE_MAESTROS` "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro." · `CLASE_SIN_MAESTRO` "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este." · `MAESTRO_NO_ENCONTRADO` "No encontramos a ese maestro." · `BORRADO_NO_PERMITIDO` "No puedes borrar lo que publicó otra persona." |

## Pasos de implementación

### Antes de empezar (orquestador)
0. Hecho el 2026-10-03: el humano respondió P-01 a P-11, todas con la recomendación (Enmienda 1). Falta que el manager revise la Enmienda 1 (modo plan). El humano aprueba **por escrito** (carril sensible), con las autorizaciones A-1 a A-10; el orquestador lo registra en `aprobacion.md` con `<R>` = `e4396a0` y el SHA-256 de los archivos protegidos que cambie. Sin commit de aprobación.
1. Ronda 0 del tester de 02a (no cuenta en el tope).

### 02a (base `<R>`)
2. `shared/src/clases.ts`: lo de 02a ("Cambios por capa"), y en `shared/src/index.ts` sus reexportaciones nombradas (A-11, Enmienda 2). `cd shared; npm run build` y `npm run lint`.
3. `core/clases/pertenencia.ts` y `core/clases/maestros.ts` con sus pruebas (PR-2A01 a PR-2A04); `core/clases/texto.ts` con `conTextosNormalizados` (PR-2A05).
4. `prisma/schema.prisma` (§D-2A1); `npx prisma format`, `npx prisma validate`; `npx prisma migrate dev --create-only --name clases_administradas`; revisa el SQL contra §D-2A1 (PA-03), agrega el bloque de datos y aplica con `npx prisma migrate dev` en `campus_dev` (A-2); `npx prisma generate`; V-03.
5. `backend/test/ayudas-clases.ts`: `crearClaseDePrueba` crea la clase y su asignación en un solo `create` anidado (misma `creado_en`; acepta `maestroIds` opcional para dos maestros, conservando `maestroId`) (PR-2A09, Enmienda 1).
6. `adapters/db/clases.ts`, `maestros-de-clase.ts`, `inscripciones.ts` (`actorId`), `index.ts`.
7. `middleware/index.ts` (PR-2A06) y `middleware/pertenencia.ts`; `middleware/README.md`.
8. `handlers/clases/gestion.ts`, `clases.ts`, `alumnos.ts`; `app.ts`; `handlers/README.md`.
9. Pruebas de integración y de autorización de 02a (PR-2A07, PR-2A08, PR-2A10 a PR-2A24) y las normales que cambian (lista de PA-16).
10. Verificación por paquete: `cd backend; npm run lint`, después `cd backend; npm test` (una corrida, PA-01, PA-07, PA-12); después `cd shared; npm run build`; después, desde la raíz, `npm run build` y `npm run lint`; y, por último, `cd frontend; npm run lint` y `cd frontend; npm test` (104 archivos: en 02a el frontend solo cambia en los dobles de sus pruebas, regla de "Dobles del frontend"). Nunca dos suites a la vez (PA-08).
11. Resumen verificable (IDs con su caso, conteos con `npx vitest list`, última línea de cada comando, hermanos si corrige). Manager verifica (V-01 a V-07) → tester ataca → manager final → el orquestador aplica los textos de 02a con autorización del humano → commit del humano `<K2a>`.

### 02b (base `<K2a>`)
12. Ronda 0 del tester de 02b.
13. `shared/src/clases.ts`: lo de 02b, y sus reexportaciones nombradas en `shared/src/index.ts` (A-11); build.
14. `core/autoria.ts` con PR-2B01 y PR-2B02.
15. `adapters/db/publicaciones.ts` e `inscripciones.ts` (§D-2B3, §D-2B4).
16. `handlers/clases/muro.ts`, `handlers/archivos.ts`, `handlers/clases/alumnos.ts` (§D-2B3, §D-2B4, §D-2B5).
17. PR-2B03 a PR-2B10 y las normales de PA-16.
18. Como el paso 10. Los dobles del frontend que necesiten `administracion`, `puedeBorrar`, `maestros` o `email` se completan aquí (regla de "Dobles del frontend"); el código de producción del frontend no cambia en 02b. Cualquier otra prueba del frontend que caiga es PA-16.
19. Como el paso 11, con los textos de 02b → `<K2b>`.

### 02c (base `<K2b>`)
20. Ronda 0 del tester de 02c.
21. `features/clases`: `types.ts`, `data.ts`, `lib.ts` (PR-2C01, PR-2C02), `hooks.ts`.
22. `components/ui/badge.tsx` (variante `institucional`); `components/layout/types.ts`, `barra-navegacion.tsx` y `data.ts` (destino "Clases" y `coincidencia`, Enmienda 1).
23. Componentes y vistas de §D-2C1 a §D-2C5; `app/router.tsx`.
24. PR-2C03 a PR-2C12 y las normales de PA-16.
25. `docs/DESIGN.md`, textos de 02c.
26. `cd frontend; npm run lint`, `npm test`, `npm run build`; desde la raíz, `npm run build` y `npm run lint`. (El backend no cambia en 02c; su suite no se corre salvo que el manager lo pida.)
27. Como el paso 11 → `<K2c>`.

### 02d (base `<K2c>`)
28. Ronda 0 del tester de 02d.
29. `lib/variante-de-clase.ts` (PR-2D06); `services/clasesService.ts`; `features/clases/data.ts` reexporta las claves.
30. `components/layout/hooks.ts`, `lista-de-clases.tsx`, `barra-navegacion.tsx`, `contenedor-rol.tsx`, `data.ts`, `types.ts` (PR-2D01 a PR-2D03).
31. `lista-personas.tsx`, `personas-view.tsx` (PR-2D04); `formulario-publicacion.tsx` (PR-2D05).
32. `docs/DESIGN.md`, textos de 02d.
33. Como el paso 26.
34. Como el paso 11, con los textos de 02d.
35. Comprobación humana (abajo), y commit del humano `<K2d>`.

### PARADAS
| ID | Te detienes y reportas si… |
|---|---|
| PA-01 | La regla del firewall "Campus: bloquear entrada a Docker en redes publicas" no existe, está deshabilitada o no es Inbound/Block/Public, o la red activa no es de confianza (`Get-NetFirewallRule`, `Get-NetConnectionProfile`). No se corre ninguna prueba del backend |
| PA-02 | La rama no es `feat/clases-02`; hay cambios fuera de los permitidos contra la base de la subentrega; la base no existe (`git cat-file -e '<hash>^{commit}'`); un archivo protegido que cambió el orquestador no coincide con su SHA-256 de `aprobacion.md`; o V-01 no coincide con la última tabla del tester |
| PA-03 | El SQL de `--create-only` contiene algo distinto de §D-2A1: un `DROP`, un `ALTER` de una columna existente, cualquier cambio en `usuarios`, `inscripciones`, `movimientos_inscripcion`, `publicaciones`, `comentarios` o `archivos`, o en `clases` algo distinto del índice nuevo; o `migrate dev` propone `reset` o avisa de deriva |
| PA-04 | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` no termina con código 0 (incluido cualquier cambio de nombre de FK por los renombres de `MovimientoInscripcion`) |
| PA-05 | Falla una `*.ataque` que no está en la lista de rojos esperados de la ronda 0, o al terminar sigue en rojo una de esa lista |
| PA-06 | Necesitas tocar un archivo de "No se toca", agregar una dependencia, cambiar `vitest.config.ts`, `global-setup.ts` o `setup.ts`, o cambiar el `timeout` de una prueba existente para que pase |
| PA-07 | Regla permanente de `.claude/agents/tester.md`, con la lista de `P2028` permitidos y el inventario I-1 de "Puntos de ataque". Aplica también al programador y al manager en sus corridas completas del backend |
| PA-08 | Ibas a correr dos suites a la vez |
| PA-09 | Una prueba nueva tuya da resultados distintos en dos corridas (aislada y completa) |
| PA-10 | Un log contiene una contraseña, un token, una cookie, una URL prefirmada completa, `STORAGE_SECRET_KEY` o el correo completo de un candidato (alumno o maestro) |
| PA-11 | Un proceso de larga vida que no arrancaste ocupa un puerto que necesitas |
| PA-12 | (CHORE-02) Una corrida completa del backend cae por tiempos límite, o sale un rojo intermitente en cualquier archivo: no repites la corrida para "limpiarla"; la reportas completa (archivo, caso, duración, PA-07) |
| PA-13 | (CHORE-02, adaptada) La guarda deja de arrancar una ruta, o la implementación pide tocar `guarda-de-rutas.ts` o `rutas-publicas.ts`, o una ruta con `:claseId` parece necesitar una excepción |
| PA-14 | La implementación necesita **leer** `Clase.maestroId` o la relación `Clase.maestro` (fuera de las dos escrituras de §D-2A1), o retirar la columna |
| PA-15 | Para demostrar un defecto habría que editar un archivo de producción (en lugar de un doble o una copia en el scratchpad) |
| PA-16 | Hay que crear o cambiar un archivo de pruebas que no está en "Pruebas: listas cerradas por subentrega" para la subentrega en curso, o cambiar uno de la lista de otra forma que la permitida |
| PA-17 | (Enmienda 1) Cambiar la firma de `requireMembership`, `requireOwnership` o `resolverClaseDeLaRuta` rompe una prueba existente que los llame directamente, o una ruta existente responde distinto a un estudiante o a un maestro |
| PA-18 | Con la respuesta del humano a P-01 o P-02 distinta de la recomendación y sin la enmienda del arquitecto |

### Verificaciones
- **V-01 (hashes):** `Get-FileHash -Algorithm SHA256` de todas las `*.ataque`, contra la última tabla del tester (en 02a, la de la ronda 0 de 02a, que parte de la de la ronda 6 de CHORE-02).
- **V-02 (paquetes):** el orden del paso 10 (o 26), con el comando exacto y la última línea de salida de cada uno.
- **V-03 (Prisma, 02a):** `npx prisma validate`, `npx prisma format --check`, `npx prisma generate`, `npx prisma migrate status` y `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`. En 02b, 02c y 02d: `git diff --name-only <base> -- backend/prisma` vacío.
- **V-04 (búsquedas en el código de producción, sin pruebas; son texto, no un analizador, y su límite queda declarado):**
  - `$queryRawUnsafe` → exactamente 1 (`adapters/db/cliente.ts`); `$queryRaw` o `$executeRaw` nuevos en `backend/src/` → 0;
  - `addHook` en `backend/src/handlers/` → 0;
  - `maestroId` sobre el modelo `Clase` (lectura): solo en las dos escrituras de §D-2A1 dentro de `adapters/db/` (`clase.create` y el `updateMany` del retiro); la relación `maestro:` en un `select` de `clase` → 0;
  - `estadoPago` en `backend/src/` → los mismos archivos de hoy (`handlers/clases/alumnos.ts` y `adapters/db/inscripciones.ts` solo en el roster, y los de AUTH);
  - `movimientoInscripcion` → solo `adapters/db/inscripciones.ts`, solo en `.create(`, con `actorId`;
  - `puedeBorrar` se define solo en `core/autoria.ts`; en el frontend solo se **lee** del dato (no hay una función propia);
  - `FIRMA_ADMINISTRACION` se define solo en `shared/src/clases.ts`;
  - `conTextosNormalizados` se define solo en `core/clases/texto.ts` al cerrar 02b;
  - `console.` → 0 en los archivos nuevos;
  - `fetch(` en `frontend/src/` → solo `services/apiClient.ts` y `services/almacenService.ts`;
  - `from "@/features/` en `components/`, `lib/` y `services/` → 0; `from "@/features/admin` en `features/clases` → 0;
  - `claseId ?? ""` en `frontend/src/features/clases/` → 0 al cerrar 02c;
  - `autoComplete="off"` en los campos de crear clase, editar clase y los dos buscadores;
  - `dangerouslySetInnerHTML` y `target="_blank"` → 0.
- **V-05 ("No se toca"), mecánica:** por cada ruta de la lista, `git diff --quiet <base> -- <ruta>` con código 0 y `git status --porcelain -- <ruta>` vacío; migraciones: en 02a, `git diff --name-only <R> -- backend/prisma/migrations` lista solo la carpeta nueva; `backend/package.json`, `frontend/package.json` y `package-lock.json` sin cambios en las cuatro; `docs/DESIGN.md` lo revisa el manager (lo edita el programador); excluidos `docs/trabajo/CLASES-02-clases-administradas/` y `docs/ESTADO.md`.
- **V-06 (rutas, 02a):** la lista de `printRoutes` es la de hoy **menos** `POST /api/clases` y `PUT /api/clases/:claseId`, **más** exactamente: `GET`, `HEAD` y `POST /api/admin/clases`; `PUT /api/admin/clases/:claseId`; `POST /api/admin/clases/:claseId/maestros`; `DELETE /api/admin/clases/:claseId/maestros/:maestroId`; `GET` y `HEAD /api/admin/maestros/candidatos`. `RUTAS_PUBLICAS` con las 10 de hoy. En 02b, 02c y 02d la lista no cambia.
- **V-07 (conteos):** `npx vitest list` desde `backend/` y desde `frontend/`, redirigidos a un archivo del scratchpad; cada cifra del resumen sale de ahí o de la corrida, con el comando; cada ID de "Pruebas requeridas" de la subentrega aparece en la lista. El manager lo contrasta con su corrida.

### Autorizaciones que pide el carril sensible (por escrito, al aprobar el plan)
| ID | Qué autoriza |
|---|---|
| A-1 | Cambiar `backend/src/middleware/index.ts`, `middleware/pertenencia.ts`, **`middleware/require-membership.ts`, `middleware/require-ownership.ts`** (ampliada en la Enmienda 1, M-01: reciben `{ admiteAdmin }`) y `middleware/README.md` como dice §D-2A2 (02a). `guarda-de-rutas.ts`, `rutas-publicas.ts` y los demás pasos de la cadena quedan en "No se toca" |
| A-2 | Crear la migración `clases_administradas` de §D-2A1 (con datos) y aplicarla en `campus_dev` con `npx prisma migrate dev` (02a); los renombres de TypeScript de `MovimientoInscripcion` sin SQL |
| A-3 | Que el tester reescriba en la ronda 0 de cada subentrega las `*.ataque` existentes que contradice un C-n (§D-2R0), con el procedimiento de "Ronda 0". Ampliada en la Enmienda 1 (M-03), de forma explícita: C-19 (`badge-03b-r1:44-45`), C-20 (V-06 de `styles/clases-r1`, con las cifras de la fila), C-21 (V-07 de `styles/clases-r1`), C-22 (`components/layout/estatico-r1:131-147`) y C-16 ampliado (dobles de `fetch` de las `*.ataque` que montan un marco de rol). `alumnos-b-r1:1106` y `:1110-1111` **no** se reescriben |
| A-4 | Que el programador cambie las pruebas normales existentes de la lista de PA-16, solo en los casos que contradice un C-n, y las de I-2 que reporte la ronda 0 |
| A-5 | Retirar `POST /api/clases` y `PUT /api/clases/:claseId` y la función `crearClase` del adaptador (02a), y `useBorrarMiComentario` del frontend (02c). No se borra ningún archivo |
| A-6 | Mover `varianteDeClase` a `lib/variante-de-clase.ts` y las dos claves de clases a `services/clasesService.ts`, con reexportes (02d): un movimiento entre `features/clases` y lo compartido |
| A-7 | Que el programador edite `docs/DESIGN.md` con los textos de 02c y 02d, con la marca "propuesta (CLASES-02x)" |
| A-8 | Que el orquestador aplique los textos de ESSENTIALS, `ARCHITECTURE.md`, `CLAUDE.md`, `PRD.md` (RN-07, con P-01 b) y `backend/src/middleware/README.md` al cerrar cada subentrega, con el SHA-256 resultante en `aprobacion.md` |
| A-9 | Una línea nueva en `backend/src/app.ts` (registro de `gestionDeClasesHandler`) |
| A-10 | (Enmienda 1, M-07) Retirar el filtro por `maestro_id` de `editarClase`, `leerCodigo` y `regenerarCodigo` (defensa extra M-01 de CLASES-a): la única autorización de esas operaciones es el sexto paso (§D-2A6, R-04) |
| A-11 | (Enmienda 2) Agregar a `shared/src/index.ts` las reexportaciones nombradas de lo nuevo de `clases.ts` (02a y 02b), sin tocar las existentes ni agregar archivos |
| A-12 | (2026-10-03, autorizada por el humano; corrección general de T-01 de la ronda 1 de 02a) Modificar `backend/src/handlers/validacion.ts` para que `validarCuerpo` rechace arreglos |

### No se toca (base: `<R>` fuera de los paquetes; dentro, la de la subentrega)
- **Backend:** `src/middleware/guarda-de-rutas.ts`, `rutas-publicas.ts`, `authenticate.ts`, `with-profile.ts`, `with-password-gate.ts`, `with-access.ts`, `require-role.ts`, `tipos.ts` (`require-membership.ts` y `require-ownership.ts` salen de esta lista por A-1 ampliada); `src/adapters/auth/**`, `adapters/notifier/**`, `adapters/queue/**`, `adapters/scheduler/**`, `adapters/storage/**`, `adapters/live/**`; `src/adapters/db/cliente.ts`, `errores.ts`, `bloqueo-usuario.ts`, `sesiones.ts`, `tokens-cuenta.ts`, `invitaciones.ts`, `enlaces-registro.ts`, `usuarios.ts`, `salud.ts`, `archivos.ts`; `src/config/**`; `src/workers/**`; `src/core/auth/**`, `core/correo/**`, `core/eventos/**`, `core/archivos/**`, `core/errores.ts`, `core/paginacion.ts`, `core/clases/codigo.ts`, `core/clases/busqueda.ts`; `src/handlers/auth/**`, `handlers/admin.ts`, `handlers/usuarios.ts`, `handlers/salud.ts`, `handlers/errores.ts`, `handlers/validacion.ts` (salvo el cambio de `validarCuerpo` que autoriza A-12); `test/global-setup.ts`, `test/setup.ts`, `vitest.config.ts`, `backend/package.json`, `tsconfig*.json`, `eslint.config.mjs`; `prisma/migrations/**` salvo la carpeta nueva de 02a.
- **Shared:** todo salvo `src/clases.ts` y `src/index.ts`; de este último, solo las reexportaciones nombradas nuevas de `./clases.js` que autoriza A-11 (Enmienda 2); las existentes no se tocan.
- **Frontend:** `src/services/apiClient.ts`, `authService.ts`, `tokenAcceso.ts`, `navegacion.ts`, `sesionService.ts`, `almacenService.ts`, `liveService.ts`; `src/features/auth/**` (salvo los cuatro archivos de prueba que autoriza PA-16 en 02d), `features/admin/**`, `features/diagnostico/**`; `src/components/ui/**` salvo `badge.tsx` y `badge.test.tsx`; `src/components/mensaje-error.tsx`, `estado-vacio.tsx`, `cargando.tsx`, `error-de-campo.tsx`, `avatar-usuario.tsx`, `estado-pago-badge.tsx`, `acceso-restringido-badge.tsx`; `src/components/layout/barra-superior.tsx`, `pie-de-pagina.tsx`, `marco-publico.tsx`, `layout-publico.tsx`, `fondo-animado.tsx`, `monograma.tsx`, `lib.ts`; `src/app/` salvo `router.tsx`; `src/styles/**`; `src/lib/format.ts`, `utils.ts`, `cache-de-mutaciones.ts`; `index.html`, `vite.config.ts`, `vitest.config.ts`, `frontend/package.json`.
- **Fuera de los paquetes:** `infra/**`, `AGENTS.md`, `.claude/**`, `README.md`, `package.json` y `package-lock.json` de la raíz; `docs/` salvo `docs/trabajo/CLASES-02-clases-administradas/`, `docs/ESTADO.md` y lo que autorizan A-7 y A-8.

### Comprobación humana en navegador (una sola, al final de 02d; máximo 10 minutos y 7 puntos; solo lo que las pruebas no ven)
Necesita la API, el worker no, y `campus_dev` con la migración aplicada; el humano entra con su admin de desarrollo y con una cuenta de maestro y una de estudiante. Ningún agente abre el navegador.
- **H-1** El maestro que ya tenía clases antes de la migración las sigue viendo en su inicio (migración de datos sobre datos reales de `campus_dev`).
- **H-2** `/admin/clases`: crear una clase con dos maestros, abrirla y ver la tabla, el encabezado y las secciones Muro, Alumnos y Maestros en material opaco, con el indicador visible.
- **H-3** Barra lateral del estudiante o del maestro con varias clases (y un nombre largo, y dos clases con las mismas iniciales, como "Derecho Penal I" y "Derecho Penal II"): la insignia, el recorte, si se distinguen las dos clases parecidas, el `title` al pasar el cursor y el desplazamiento dentro de la barra.
- **H-4** A 360 px: la barra inferior sin la lista; "Personas" con correos largos sin desbordarse.
- **H-5** Publicar como admin: la insignia "Administración" en el muro del estudiante, y que el maestro no tenga "Borrar publicación" en ella.
- **H-6** "Tipo de publicación": el indicador se desliza al cambiar de tipo (con y sin movimiento reducido del sistema, si el humano quiere).
- **H-7** El maestro no ve "Crear clase" ni "Editar clase" y su inicio se lee bien sin la tarjeta interna.

Todo lo demás queda "no verificado en navegador por decisión del humano, cubierto por pruebas automáticas". El contraste lo cubren las pruebas de tokens (el único par nuevo, `--link` sobre `--accent-soft`, ya está en `DESIGN.md` §3).

## Enmienda 1 (2026-10-03)

Responde la revisión del manager (`revision.md`, CAMBIOS REQUERIDOS, sobre el plan con SHA-256 `081632b1…`). Todo lo de abajo ya está corregido **en el sitio**, en la sección que se nombra; esta enmienda solo lo resume y lo justifica.

**Respuestas del humano (2026-10-03), aplicadas:** P-01 = (b), P-02 = (A), P-10 = (a), P-11 = (a); P-03 a P-09 = (a), sin objeción. Todas coinciden con la recomendación que el plan ya tenía aplicada, así que ninguna sección cambia por ellas: §D-2B2 (`puedeBorrar` con moderación), el texto de RN-07 y ESSENTIALS ("Autoría"), §D-2D1 (forma A), H-3 (dos clases con iniciales iguales), §D-2.0 (vistas en `features/clases`) y los textos de `CLAUDE.md`, y S-11 quedan como están. PA-18 ya no puede activarse. El estado del plan pasa a **LISTO**.

| ID | Respuesta | Dónde quedó |
|---|---|---|
| M-01 | **Aceptado; se adopta la forma preferida del manager: cerrado por defecto, sin lanzar.** `protegido()` calcula `admiteAdmin = (roles ?? []).includes("admin")` y se lo pasa al sexto paso (`requireMembership({ admiteAdmin })`, `requireOwnership({ admiteAdmin })` → `resolverClaseDeLaRuta(…, admiteAdmin)` → `evaluarPertenencia(…, admiteAdmin)` en `core/`). Una ruta con `pertenencia` y sin `roles` deja fuera al admin con `403 SIN_ACCESO_A_LA_CLASE`, como hoy. No cambia ninguna de las 11 pruebas que el manager inventarió (la suite de la guarda de CHORE-02 incluida): ninguna recibe `admin` en `roles` y ninguna llama a los pasos directamente (comprobado: solo `index.ts` los llama). El olvido falla cerrado, que es más fuerte que no arrancar. Se retira el lanzamiento y PA-17 cambia de sentido | §D-2.0 ("Cerrado por defecto"), §D-2A2, "Cambios por capa" (core y middleware), PR-2A02, PR-2A06, Alcance 02a punto 2, R-01, ataque 02a punto 1, PA-17, textos de ESSENTIALS, ARCHITECTURE §6 y `middleware/README.md`, **A-1 ampliada** (`require-membership.ts` y `require-ownership.ts`, que salen de "No se toca") |
| M-02 | **Aceptado.** PR-2A07 ejecuta la sentencia tal cual del `migration.sql`, dentro de una transacción que se revierte, sobre tablas temporales `clases` y `maestros_de_clase` sin FK que sombrean a las de `public` (`pg_temp` va primero en la ruta de búsqueda), con una precondición con aserción de que `to_regclass` resuelve a las temporales; la sentencia de §D-2A1 no lleva esquema. `crearClaseDePrueba` crea la clase y su asignación en un solo `create` anidado | PR-2A07, PR-2A09, paso 5 |
| M-03 | **Aceptado.** C-n nuevos: **C-19** (`badge-03b-r1:44-45`), **C-20** (V-06 de `styles/clases-r1`, con las cifras fijadas por el plan: 39 en 02c y 40 en 02d, y dónde vive cada `enEspera`), **C-21** (V-07 de `styles/clases-r1`: `lista-de-clases.tsx` y `formulario-publicacion.tsx` en `vidrio-fuerte`), **C-22** (`components/layout/estatico-r1:131-147`: `translate-x-[200%]`); C-16 ampliado (dobles de `fetch` que responden `/me` a cualquier ruta, con `sesion-r2`, `cache-03a-r1` y `registro-maestro-03b-r1`); C-18 deja de nombrar `styles/clases-r1` (pasa a C-21). **`alumnos-b-r1:1106`** no necesita C-n: el orden de los maestros se define una sola vez en `adapters/db/clases.ts` (`ORDEN_DE_MAESTROS`, el detalle menor del manager), así que `inscripciones.ts` no escribe ningún `orderBy … creadoEn` y la regla (movimientos por `secuencia`) queda intacta; tampoco se reescribe `:1110-1111` (`alumnos.ts` sigue sin leer `.rol`). PA-16: 02c suma `adjuntos-de-publicacion.test.tsx`, `inicio-estudiante-view.test.tsx` y `components/ui/badge.test.tsx`; 02d suma `app/router.test.tsx` y las cuatro de `features/auth` que montan el router (solo sus dobles de `fetch`), con su excepción en "No se toca". **Búsqueda propia** en `frontend/src/**/*.ataque*` y `frontend/src/styles/` (`import.meta.glob`, `?raw`, `toEqual([`, `toHaveLength(`): además de las del manager, revisé `features/clases/estatico-r1` (reglas de `?? []` y ternarios anidados: no son listas, aplican al código nuevo), `styles/tokens-r1` y `tokens.test` (no cambia ningún token), `app/fondo-r1` (no cambia `RUTAS_CON_ORBES_EN_MOVIMIENTO`: las pantallas nuevas son quietas), `features/admin/cuentas-r1` y `maestros-03b-r1` (`features/admin` no cambia), y en `styles/clases-r1` V-04, V-05, V-13, V-16 y `data-material` (nada nuevo: ningún color suelto, rojo, `fixed` ni `data-material` fuera de `contenedor-rol.tsx`). No encontré otras listas que el plan rompa | §D-2R0, "Dobles del frontend", PA-16, "No se toca", Cambios por capa (adapters y handlers), §D-2C2 (último punto), §D-2D1, **A-3 ampliada** |
| M-04 | **Aceptado.** `Destino` gana `coincidencia: "exacta" \| "prefijo"`, obligatorio y sin valor por defecto; `BarraNavegacion` usa `end={destino.coincidencia === "exacta"}`; "Clases" es `"prefijo"` y los demás `"exacta"` ("Cuentas" sigue sin marcarse en `/admin/clases`). 02c suma `components/layout/types.ts` y `barra-navegacion.tsx` | "Cambios por capa" 02c, paso 22, PR-2C11, C-14, textos de `DESIGN.md` §7.4 (02c) |
| M-05 | **Aceptado.** "una `200` y dos `409`" | PR-2A15 (a) |
| M-06 | **Aceptado.** Textos literales para `backend/src/adapters/README.md` al cerrar 02a (`db/clases.ts`, nueva `db/maestros-de-clase.ts`, `db/inscripciones.ts` con `actorId`) y 02b (la invariante: el estado de pago y la restricción solo en el roster; qué funciones seleccionan correos; `db/publicaciones.ts` y el rol del autor). La viñeta del buscador de maestros de `ARCHITECTURE.md` §14 pasa al cierre de 02a; la de "Personas" queda en 02b | "Cambios por capa" (adapters), "Textos propuestos" 02a y 02b |
| M-07 | **Aceptado.** **A-10** nueva; §D-2A6 y R-04 la citan | Autorizaciones, §D-2A6, R-04 |
| Detalles menores | Orden S-05 en un solo lugar: adoptado (`ORDEN_DE_MAESTROS`). R-13: **no** se adopta el `creado_en` +1 ms (mezclaría el reloj de la app con el `now()` de la base en las asignaciones posteriores); R-13 queda como está. `VarianteDeClase`: se mueve a `lib/variante-de-clase.ts` y `features/clases/types.ts` la reexporta. Iniciales repetidas: H-3 las incluye. PR-2D02: reescrito (la invalidación alcanza la clave; no se afirma un refresco visible por el alta o la baja). Carriles: sin cambio | §D-2D1, H-3, PR-2D02 |
| Tabla de preguntas | La columna "Recomendación del manager" queda copiada de `revision.md` (coincide en las nueve). Se suman **P-10** (vistas del admin en `features/clases`) y **P-11** (`autor.id` real del admin, S-11), que el manager dejó para el humano: no bloquean y llevan la recomendación aplicada | Tabla de preguntas |

**Autorizaciones tras la Enmienda 1:** A-1 (ampliada a `require-membership.ts` y `require-ownership.ts`), A-2 a A-9 sin cambio de fondo, A-3 (ampliada con C-19 a C-22 y C-16), A-10 (nueva).

**Decisión del humano (2026-10-03):** P-01 = (b) Moderación; P-02 = (A) barra de 96 px con insignias; P-10 = vistas del admin en `features/clases`; P-11 = `autor.id` real del admin; P-03 a P-09 = (a), sin objeción. Estado: LISTO.

## Enmienda 2 (2026-10-03)

Responde la parada PA-06 del programador en el paso 2 de 02a: `shared/src/index.ts`, la única entrada del paquete, reexporta `./clases.js` por nombre, y el plan lo dejaba en "No se toca". Sin agregarle los nombres nuevos, nada de lo nuevo de `clases.ts` se puede importar.
- **"Cambios por capa / shared":** `index.ts` suma, por nombre, lo que cada subentrega agrega a `clases.ts` (la lista de 02a y la de 02b quedan escritas ahí). Regla general: cada subentrega exporta por nombre en `index.ts` lo que agrega a `clases.ts`.
- **"No se toca / Shared":** `index.ts` sale de la lista solo en esa medida; las reexportaciones existentes no se tocan.
- **A-11** (nueva): agregar a `shared/src/index.ts` las reexportaciones nombradas de lo nuevo de `clases.ts`, sin tocar las existentes ni agregar archivos.
- **Pasos 2 y 13:** una línea cada uno.
- **Pruebas:** busqué en todas las pruebas del repositorio (`*.ataque` y normales, backend, frontend y `shared/`, que no tiene pruebas) alguna que fije la lista de exportaciones de `@campus/shared` o lea `shared/src/index.ts`: no hay ninguna (todas importan símbolos sueltos). No hace falta C-n ni entrada nueva de PA-16.

Autorizaciones tras la Enmienda 2: A-1 a A-11. Estado: LISTO.

**Corrección de texto (2026-10-03, O-03):** el punto 2 del ataque de 02a decía que `/api/admin/:x/…` debía seguir rechazándose. Manda la regla de CHORE-02: la guarda solo rechaza parámetros o comodines en los dos primeros segmentos, así que una ruta con parámetro en el tercero arranca y pasa por `protegido()` completo (arbitraje del manager, "Arbitraje — ronda 1 de 02a" en `revision.md`). Además, A-12 queda registrada (autorizada por el humano: `validarCuerpo` de `handlers/validacion.ts` rechaza arreglos, corrección general de T-01), y `validacion.ts` sale de "No se toca" en esa medida.

**Excepción de PA-16 (2026-10-03, arbitraje del manager, ronda 1 de 02a; T-01):** `backend/src/handlers/validacion.test.ts` (prueba unitaria nueva de `validarCuerpo`) entra en la columna "Crear" de 02a. Es una excepción de PA-16 aceptada por el manager, no parte de A-12.

